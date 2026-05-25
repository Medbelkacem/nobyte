/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Hooks PocketBase
 *
 * Endpoints custom (auth requise, sauf /api/nobty/health) :
 *   POST  /api/nobty/issue-ticket    { service: id }                  → ticket
 *   POST  /api/nobty/advance-queue   { service: id }                  → counter (agent only)
 *   POST  /api/nobty/cancel-ticket   { ticket: id }                   → ticket
 *   POST  /api/nobty/nour-chat       { messages: [...], lang? }       → { reply }
 *   GET   /api/nobty/health                                           → { ok: true }
 *
 * Tous les hooks utilisent l'API "Dao()" de PocketBase JSVM.
 */

// =====================================================================
// Helpers
// =====================================================================
function requireAuth(c) {
  const info = c.requestInfo();
  const user = info.auth;
  if (!user) throw new ApiError(401, "auth required");
  return user;
}

function jsonBody(c) {
  try { return c.requestInfo().body || {}; }
  catch (_) { return {}; }
}

function notify(app, userId, ticketId, title, body) {
  const coll = app.findCollectionByNameOrId("notifications");
  const rec = new Record(coll);
  rec.set("user", userId);
  if (ticketId) rec.set("ticket", ticketId);
  rec.set("title", title);
  rec.set("body", body);
  rec.set("read", false);
  app.save(rec);
}

// =====================================================================
// /api/nobty/health
// =====================================================================
routerAdd("GET", "/api/nobty/health", (c) => {
  return c.json(200, { ok: true, service: "nobty", time: new Date().toISOString() });
});

// =====================================================================
// /api/nobty/issue-ticket
// Émission atomique d'un ticket :
//   - une transaction
//   - incrémente queue_counters.last_number
//   - refuse si l'utilisateur a déjà un ticket actif sur ce service
// =====================================================================
routerAdd("POST", "/api/nobty/issue-ticket", (c) => {
  const user = requireAuth(c);
  const body = jsonBody(c);
  const serviceId = body.service;
  if (!serviceId) throw new ApiError(400, "service is required");

  let created = null;
  $app.runInTransaction((txApp) => {
    // 1) Refuser les doublons
    const dups = txApp.findRecordsByFilter(
      "tickets",
      `user = "${user.id}" && service = "${serviceId}" && (status = "waiting" || status = "called")`,
      "", 1,
    );
    if (dups.length > 0) throw new ApiError(409, "ticket actif déjà existant pour ce service");

    // 2) Trouver / créer le counter
    let counter;
    try {
      counter = txApp.findFirstRecordByFilter("queue_counters", `service = "${serviceId}"`);
    } catch (_) {
      const coll = txApp.findCollectionByNameOrId("queue_counters");
      counter = new Record(coll);
      counter.set("service", serviceId);
      counter.set("last_number", 0);
      counter.set("now_serving", 0);
    }

    // 3) Service (pour avg_duration_min)
    const svc = txApp.findRecordById("services", serviceId);
    const avg = svc.getInt("avg_duration_min") || 8;

    const newNumber = (counter.getInt("last_number") || 0) + 1;
    const nowServing = counter.getInt("now_serving") || 0;
    counter.set("last_number", newNumber);
    txApp.save(counter);

    // 4) Créer le ticket
    const tickColl = txApp.findCollectionByNameOrId("tickets");
    const tk = new Record(tickColl);
    tk.set("user", user.id);
    tk.set("service", serviceId);
    tk.set("number", newNumber);
    tk.set("status", "waiting");
    tk.set("issued_at", new Date().toISOString());
    tk.set("est_wait_min", Math.max(0, newNumber - nowServing) * avg);
    txApp.save(tk);

    created = tk;
  });

  return c.json(200, created);
});

// =====================================================================
// /api/nobty/advance-queue
// L'agent fait avancer now_serving :
//   - le ticket "called" passe à "served"
//   - now_serving++
//   - le nouveau numéro passe à "called" et l'utilisateur est notifié
// =====================================================================
routerAdd("POST", "/api/nobty/advance-queue", (c) => {
  const user = requireAuth(c);
  const body = jsonBody(c);
  const serviceId = body.service;
  if (!serviceId) throw new ApiError(400, "service is required");

  // Vérif. rôle agent et appartenance à l'établissement
  const profile = $app.findRecordById("users", user.id);
  const role = profile.getString("role");
  if (!(role === "agent" || role === "admin")) throw new ApiError(403, "forbidden");

  const svc = $app.findRecordById("services", serviceId);
  const estId = svc.getString("establishment");
  if (role !== "admin" && profile.getString("agent_establishment") !== estId) {
    throw new ApiError(403, "forbidden — wrong establishment");
  }

  let updatedCounter = null;
  $app.runInTransaction((txApp) => {
    let counter;
    try {
      counter = txApp.findFirstRecordByFilter("queue_counters", `service = "${serviceId}"`);
    } catch (_) {
      throw new ApiError(404, "counter not found");
    }
    const lastNumber = counter.getInt("last_number") || 0;
    const nowServing = counter.getInt("now_serving") || 0;
    if (nowServing >= lastNumber) {
      throw new ApiError(409, "queue empty");
    }

    // Termine l'éventuel ticket "called"
    const calledList = txApp.findRecordsByFilter(
      "tickets", `service = "${serviceId}" && status = "called"`, "", 5,
    );
    for (const tk of calledList) {
      tk.set("status", "served");
      tk.set("served_at", new Date().toISOString());
      txApp.save(tk);
    }

    const newServing = nowServing + 1;
    counter.set("now_serving", newServing);
    txApp.save(counter);

    // Marque le nouveau ticket "called" + notification
    const next = txApp.findRecordsByFilter(
      "tickets",
      `service = "${serviceId}" && number = ${newServing} && status = "waiting"`,
      "", 1,
    );
    if (next.length > 0) {
      const tk = next[0];
      tk.set("status", "called");
      tk.set("called_at", new Date().toISOString());
      txApp.save(tk);
      notify(
        txApp, tk.getString("user"), tk.id,
        "C'est votre tour",
        `Présentez-vous au guichet avec le n°${tk.getInt("number")}`,
      );
    }

    updatedCounter = counter;
  });

  return c.json(200, updatedCounter);
});

// =====================================================================
// /api/nobty/cancel-ticket
// =====================================================================
routerAdd("POST", "/api/nobty/cancel-ticket", (c) => {
  const user = requireAuth(c);
  const body = jsonBody(c);
  const ticketId = body.ticket;
  if (!ticketId) throw new ApiError(400, "ticket is required");

  const tk = $app.findRecordById("tickets", ticketId);
  if (tk.getString("user") !== user.id) throw new ApiError(403, "forbidden");
  const status = tk.getString("status");
  if (status !== "waiting" && status !== "called") {
    throw new ApiError(409, "ticket non annulable");
  }
  tk.set("status", "cancelled");
  $app.save(tk);
  return c.json(200, tk);
});

// =====================================================================
// /api/nobty/nour-chat
// Proxy vers Anthropic (ou OpenAI en fallback).
// Le hook injecte un system prompt avec le contexte NOBTY.
// =====================================================================
routerAdd("POST", "/api/nobty/nour-chat", (c) => {
  requireAuth(c);
  const body = jsonBody(c);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lang = body.lang || "fr";

  const anthropicKey = $os.getenv("ANTHROPIC_API_KEY");
  const openaiKey    = $os.getenv("OPENAI_API_KEY");

  const SYSTEM = `Tu es Nour, l'assistant officiel de NOBTY (نُبتي), une PWA citoyenne algérienne qui digitalise la file d'attente dans 18 institutions publiques (Poste, banques BNA/BEA/CPA/BADR/CNEP, hôpital, polyclinique, tribunal, APC, Daïra, Conservation foncière, Sûreté, CNAS, CASNOS, CNR, ANEM, Sonelgaz, ADE, Algérie Télécom, Impôts, CNRC) à travers 69 wilayas. Tu réponds en ${lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'}, ton ton est chaleureux, concis, et tu guides l'utilisateur étape par étape. Pour prendre un ticket : Wilaya → Institution → Établissement → Service → Bouton "Prendre mon ticket". Tu ne donnes jamais de conseils médicaux ni juridiques personnalisés ; pour ces sujets, oriente l'utilisateur vers un professionnel.`;

  if (anthropicKey) {
    const res = $http.send({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      timeout: 30,
    });
    if (res.statusCode >= 400) {
      throw new ApiError(res.statusCode, "Nour upstream error: " + res.raw);
    }
    const parsed = JSON.parse(res.raw);
    const text = (parsed.content || []).map((p) => p.text || "").join("");
    return c.json(200, { reply: text });
  }

  if (openaiKey) {
    const res = $http.send({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + openaiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM }, ...messages],
        max_tokens: 600,
      }),
      timeout: 30,
    });
    if (res.statusCode >= 400) throw new ApiError(res.statusCode, "Nour upstream error: " + res.raw);
    const parsed = JSON.parse(res.raw);
    const text = parsed.choices?.[0]?.message?.content ?? "";
    return c.json(200, { reply: text });
  }

  // Aucun fournisseur configuré → réponse de repli scriptée
  return c.json(200, {
    reply:
      lang === "ar"
        ? "مرحبًا، أنا نور. لاستعمالي يجب إعداد مفتاح ANTHROPIC_API_KEY أو OPENAI_API_KEY في إعدادات PocketBase."
        : lang === "en"
        ? "Hi, I'm Nour. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY in PocketBase settings to enable me."
        : "Bonjour, je suis Nour. Pour m'activer, ajoutez ANTHROPIC_API_KEY ou OPENAI_API_KEY dans les variables d'env de PocketBase.",
  });
});

// =====================================================================
// /api/nobty/otp-request
// Génère un code 6 chiffres, le hash (bcrypt) et l'envoie par SMS
// (Twilio prioritaire, puis Vonage), avec repli email via le mailer PB.
//
// Body : { email?: string, phone?: string }
//   - L'utilisateur doit déjà exister dans `users`.
//   - Si `phone` est fourni et qu'un fournisseur SMS est configuré → SMS.
//   - Sinon → email.
//
// Rate-limit : refuse si un code a été émis pour ce user dans les 60s.
// =====================================================================
routerAdd("POST", "/api/nobty/otp-request", (c) => {
  const body  = jsonBody(c);
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  if (!email && !phone) throw new ApiError(400, "email or phone required");

  // 1) Retrouver l'utilisateur (réponse identique en cas d'absence pour
  //    éviter l'énumération de comptes).
  let user;
  try {
    user = email
      ? $app.findFirstRecordByFilter("users", `email = "${email.replace(/"/g, '\\"')}"`)
      : $app.findFirstRecordByFilter("users", `phone = "${phone.replace(/"/g, '\\"')}"`);
  } catch (_) {
    return c.json(200, { ok: true, expires_in: 600 });
  }

  // 2) Rate-limit : un OTP toutes les 60 secondes.
  const recent = $app.findRecordsByFilter(
    "otp_codes",
    `user = "${user.id}" && created >= "${new Date(Date.now() - 60_000).toISOString().replace("T", " ").slice(0, 19)}"`,
    "-created", 1,
  );
  if (recent.length > 0) throw new ApiError(429, "veuillez patienter avant de redemander un code");

  // 3) Génère un code 6 chiffres + hash bcrypt.
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = $security.hashBcrypt(code);

  // 4) Choix du canal : SMS si phone + provider, sinon email.
  const twilioSid = $os.getenv("TWILIO_ACCOUNT_SID");
  const twilioTok = $os.getenv("TWILIO_AUTH_TOKEN");
  const twilioFrom= $os.getenv("TWILIO_FROM");
  const vonageKey = $os.getenv("VONAGE_API_KEY");
  const vonageSec = $os.getenv("VONAGE_API_SECRET");
  const vonageFrom= $os.getenv("VONAGE_FROM") || "NOBTY";

  const userPhone = phone || user.getString("phone");
  const userEmail = email || user.getString("email");

  let channel     = null;
  let destination = null;

  if (userPhone && twilioSid && twilioTok && twilioFrom) {
    const res = $http.send({
      url: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${twilioSid}:${twilioTok}`),
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body:
        `From=${encodeURIComponent(twilioFrom)}` +
        `&To=${encodeURIComponent(userPhone)}` +
        `&Body=${encodeURIComponent(`NOBTY: votre code est ${code}. Valable 10 min.`)}`,
      timeout: 15,
    });
    if (res.statusCode >= 400) throw new ApiError(502, "SMS provider error: " + res.raw);
    channel = "sms"; destination = userPhone;
  } else if (userPhone && vonageKey && vonageSec) {
    const res = $http.send({
      url: "https://rest.nexmo.com/sms/json",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        `api_key=${encodeURIComponent(vonageKey)}` +
        `&api_secret=${encodeURIComponent(vonageSec)}` +
        `&from=${encodeURIComponent(vonageFrom)}` +
        `&to=${encodeURIComponent(userPhone.replace(/^\+/, ""))}` +
        `&text=${encodeURIComponent(`NOBTY: votre code est ${code}. Valable 10 min.`)}`,
      timeout: 15,
    });
    if (res.statusCode >= 400) throw new ApiError(502, "SMS provider error: " + res.raw);
    const parsed = JSON.parse(res.raw);
    const status = parsed.messages?.[0]?.status;
    if (status && status !== "0") throw new ApiError(502, "SMS rejected: " + (parsed.messages[0]["error-text"] || status));
    channel = "sms"; destination = userPhone;
  } else if (userEmail) {
    const message = new MailerMessage({
      from:    { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
      to:      [{ address: userEmail }],
      subject: "NOBTY — votre code de vérification",
      text:    `Votre code de vérification NOBTY est : ${code}\n\nIl est valable 10 minutes.\nSi vous n'avez pas demandé ce code, ignorez ce message.`,
    });
    $app.newMailClient().send(message);
    channel = "email"; destination = userEmail;
  } else {
    throw new ApiError(400, "aucun canal de contact disponible (ni téléphone, ni email)");
  }

  // 5) Persiste le hash avec expiration 10 min.
  const coll = $app.findCollectionByNameOrId("otp_codes");
  const rec  = new Record(coll);
  rec.set("user",        user.id);
  rec.set("code_hash",   hash);
  rec.set("channel",     channel);
  rec.set("destination", destination);
  rec.set("attempts",    0);
  rec.set("consumed",    false);
  rec.set("expires_at",  new Date(Date.now() + 600_000).toISOString());
  $app.save(rec);

  return c.json(200, { ok: true, channel, expires_in: 600 });
});

// =====================================================================
// /api/nobty/otp-verify
// Body : { email?: string, phone?: string, code: string }
// Marque l'utilisateur comme `verified` après succès et invalide tous
// les autres OTP en attente pour ce user.
// =====================================================================
routerAdd("POST", "/api/nobty/otp-verify", (c) => {
  const body  = jsonBody(c);
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const code  = String(body.code || "").trim();
  if (!email && !phone) throw new ApiError(400, "email or phone required");
  if (!/^\d{6}$/.test(code)) throw new ApiError(400, "code must be 6 digits");

  let user;
  try {
    user = email
      ? $app.findFirstRecordByFilter("users", `email = "${email.replace(/"/g, '\\"')}"`)
      : $app.findFirstRecordByFilter("users", `phone = "${phone.replace(/"/g, '\\"')}"`);
  } catch (_) { throw new ApiError(404, "code invalide ou expiré"); }

  // Dernier OTP non consommé, non expiré.
  let otp;
  try {
    otp = $app.findFirstRecordByFilter(
      "otp_codes",
      `user = "${user.id}" && consumed = false && expires_at > "${new Date().toISOString().replace("T", " ").slice(0, 19)}"`,
      "-created",
    );
  } catch (_) { throw new ApiError(410, "code invalide ou expiré"); }

  if ((otp.getInt("attempts") || 0) >= 5) {
    throw new ApiError(429, "trop de tentatives — redemandez un code");
  }

  const ok = $security.compareHashAndPassword(otp.getString("code_hash"), code);
  if (!ok) {
    otp.set("attempts", (otp.getInt("attempts") || 0) + 1);
    $app.save(otp);
    throw new ApiError(401, "code incorrect");
  }

  // Succès : consume, invalide les autres, marque user vérifié.
  $app.runInTransaction((txApp) => {
    otp.set("consumed", true);
    txApp.save(otp);

    const others = txApp.findRecordsByFilter(
      "otp_codes",
      `user = "${user.id}" && consumed = false && id != "${otp.id}"`,
      "", 50,
    );
    for (const o of others) { o.set("consumed", true); txApp.save(o); }

    const u = txApp.findRecordById("users", user.id);
    u.set("verified", true);
    txApp.save(u);
  });

  return c.json(200, { ok: true });
});

// =====================================================================
// WebAuthn — orchestration des défis et persistance des passkeys.
//
// La vérification cryptographique est déléguée au sidecar Node
// (scripts/webauthn-verifier.mjs), atteignable via WEBAUTHN_VERIFIER_URL
// (défaut http://127.0.0.1:4567).
// =====================================================================
const WEBAUTHN_VERIFIER_URL = $os.getenv("WEBAUTHN_VERIFIER_URL") || "http://127.0.0.1:4567";
const WEBAUTHN_RP_ID        = $os.getenv("WEBAUTHN_RP_ID")        || "localhost";
const WEBAUTHN_RP_NAME      = $os.getenv("WEBAUTHN_RP_NAME")      || "NOBTY";

function newChallengeB64Url() {
  // 32 octets de hasard → base64url sans padding.
  const raw = $security.randomString(32);
  return Buffer.from(raw, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function persistChallenge(challenge, userId, purpose) {
  const coll = $app.findCollectionByNameOrId("webauthn_challenges");
  const rec  = new Record(coll);
  rec.set("challenge",  challenge);
  if (userId) rec.set("user", userId);
  rec.set("purpose",    purpose);
  rec.set("expires_at", new Date(Date.now() + 300_000).toISOString()); // 5 min
  rec.set("consumed",   false);
  $app.save(rec);
}

function consumeChallenge(challenge, purpose) {
  let rec;
  try {
    rec = $app.findFirstRecordByFilter(
      "webauthn_challenges",
      `challenge = "${challenge}" && purpose = "${purpose}" && consumed = false && expires_at > "${new Date().toISOString().replace("T", " ").slice(0, 19)}"`,
    );
  } catch (_) { throw new ApiError(410, "défi WebAuthn invalide ou expiré"); }
  rec.set("consumed", true);
  $app.save(rec);
  return rec;
}

// ---------- /api/nobty/webauthn/register-begin ------------------------
// Auth requise (l'utilisateur enrôle un appareil sur son compte).
routerAdd("POST", "/api/nobty/webauthn/register-begin", (c) => {
  const auth = requireAuth(c);
  const user = $app.findRecordById("users", auth.id);

  const challenge = newChallengeB64Url();
  persistChallenge(challenge, user.id, "register");

  // Liste les credentials existants pour les exclure (évite les doublons).
  const existing = $app.findRecordsByFilter("passkeys", `user = "${user.id}"`, "", 50);

  return c.json(200, {
    rp: { id: WEBAUTHN_RP_ID, name: WEBAUTHN_RP_NAME },
    user: {
      id:          Buffer.from(user.id, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      name:        user.getString("email") || user.id,
      displayName: [user.getString("first_name"), user.getString("last_name")].filter(Boolean).join(" ") || user.getString("email") || "Utilisateur",
    },
    challenge,
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: { userVerification: "preferred", residentKey: "preferred" },
    excludeCredentials: existing.map((p) => ({
      id:         p.getString("credential_id"),
      type:       "public-key",
      transports: (p.getString("transports") || "").split(",").filter(Boolean),
    })),
  });
});

// ---------- /api/nobty/webauthn/register-finish -----------------------
// Reçoit la réponse WebAuthn brute du navigateur, la fait vérifier
// par le sidecar puis persiste le credential.
routerAdd("POST", "/api/nobty/webauthn/register-finish", (c) => {
  const auth = requireAuth(c);
  const body = jsonBody(c);
  if (!body.response || !body.challenge) throw new ApiError(400, "response and challenge required");

  consumeChallenge(body.challenge, "register");

  const verify = $http.send({
    url: WEBAUTHN_VERIFIER_URL + "/register/verify",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: body.response, expectedChallenge: body.challenge }),
    timeout: 15,
  });
  if (verify.statusCode >= 400) throw new ApiError(400, "WebAuthn verify failed: " + verify.raw);
  const parsed = JSON.parse(verify.raw);
  if (!parsed.verified) throw new ApiError(400, "attestation invalide");

  const coll = $app.findCollectionByNameOrId("passkeys");
  const rec  = new Record(coll);
  rec.set("user",          auth.id);
  rec.set("credential_id", parsed.credential.credentialId);
  rec.set("public_key",    parsed.credential.publicKey);
  rec.set("counter",       parsed.credential.counter || 0);
  rec.set("transports",    (parsed.credential.transports || []).join(","));
  rec.set("device_name",   String(body.device_name || "").slice(0, 128));
  rec.set("last_used_at",  new Date().toISOString());
  $app.save(rec);

  return c.json(200, { ok: true, credential_id: parsed.credential.credentialId });
});

// ---------- /api/nobty/webauthn/auth-begin ----------------------------
// Pas d'auth requise : l'utilisateur peut se connecter sans email
// (résident-key flow). Si `email` est fourni, on restreint la liste
// des credentials autorisés à cet utilisateur.
routerAdd("POST", "/api/nobty/webauthn/auth-begin", (c) => {
  const body  = jsonBody(c);
  const email = (body.email || "").trim().toLowerCase();

  let userId = null;
  let allowCredentials = [];
  if (email) {
    let user;
    try { user = $app.findFirstRecordByFilter("users", `email = "${email.replace(/"/g, '\\"')}"`); }
    catch (_) { /* on retourne quand même un défi pour ne pas énumérer */ }
    if (user) {
      userId = user.id;
      const pks = $app.findRecordsByFilter("passkeys", `user = "${user.id}"`, "", 50);
      allowCredentials = pks.map((p) => ({
        id:         p.getString("credential_id"),
        type:       "public-key",
        transports: (p.getString("transports") || "").split(",").filter(Boolean),
      }));
    }
  }

  const challenge = newChallengeB64Url();
  persistChallenge(challenge, userId, "authenticate");

  return c.json(200, {
    challenge,
    timeout: 60000,
    rpId: WEBAUTHN_RP_ID,
    userVerification: "preferred",
    allowCredentials,
  });
});

// ---------- /api/nobty/webauthn/auth-finish ---------------------------
// Vérifie l'assertion via le sidecar, met à jour le counter (anti-replay)
// et renvoie un token PB d'authentification (auth-with-record-id style).
routerAdd("POST", "/api/nobty/webauthn/auth-finish", (c) => {
  const body = jsonBody(c);
  if (!body.response || !body.challenge) throw new ApiError(400, "response and challenge required");

  consumeChallenge(body.challenge, "authenticate");

  const credentialId = body.response.id || body.response.rawId;
  if (!credentialId) throw new ApiError(400, "missing credential id");

  let pk;
  try { pk = $app.findFirstRecordByFilter("passkeys", `credential_id = "${credentialId.replace(/"/g, '\\"')}"`); }
  catch (_) { throw new ApiError(404, "passkey inconnue"); }

  const verify = $http.send({
    url: WEBAUTHN_VERIFIER_URL + "/auth/verify",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response: body.response,
      expectedChallenge: body.challenge,
      authenticator: {
        credentialId: pk.getString("credential_id"),
        publicKey:    pk.getString("public_key"),
        counter:      pk.getInt("counter"),
        transports:   (pk.getString("transports") || "").split(",").filter(Boolean),
      },
    }),
    timeout: 15,
  });
  if (verify.statusCode >= 400) throw new ApiError(401, "WebAuthn verify failed: " + verify.raw);
  const parsed = JSON.parse(verify.raw);
  if (!parsed.verified) throw new ApiError(401, "assertion invalide");

  // Anti-replay : le compteur doit avoir augmenté.
  if (parsed.newCounter < pk.getInt("counter")) {
    throw new ApiError(401, "compteur WebAuthn régressé — credential potentiellement cloné");
  }
  pk.set("counter",      parsed.newCounter);
  pk.set("last_used_at", new Date().toISOString());
  $app.save(pk);

  // Émet un token JWT PocketBase pour ce user.
  const user = $app.findRecordById("users", pk.getString("user"));
  const token = $tokens.recordAuthToken($app, user);

  return c.json(200, {
    token,
    record: {
      id: user.id, email: user.getString("email"),
      first_name: user.getString("first_name"), last_name: user.getString("last_name"),
      role: user.getString("role"), lang: user.getString("lang"), theme: user.getString("theme"),
      verified: user.getBool("verified"),
    },
  });
});

// =====================================================================
// /api/nobty/admin/stats
//
// Agrégations SQL (GROUP BY) sur les tickets pour le tableau de bord
// admin. Accessible uniquement aux rôles `admin`.
//
// Query params (tous optionnels) :
//   from   ISO date  (défaut : début de la journée courante UTC)
//   to     ISO date  (défaut : maintenant)
//   top    int       (défaut : 10) — top-N pour by_establishment
//
// Réponse :
// {
//   generated_at, scope: { from, to },
//   totals: { tickets, waiting, called, served, cancelled, missed, avg_wait_min },
//   by_wilaya:  [{ wilaya, code, name_fr, ...counts, avg_wait_min }],
//   by_type:    [{ type, key, name_fr, family, ...counts, avg_wait_min }],
//   by_establishment: [{ establishment, name, wilaya_code, type_key, ...counts, avg_wait_min }],
// }
// =====================================================================
routerAdd("GET", "/api/nobty/admin/stats", (c) => {
  const auth = requireAuth(c);
  const profile = $app.findRecordById("users", auth.id);
  if (profile.getString("role") !== "admin") throw new ApiError(403, "admin only");

  const now    = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from   = c.queryParam("from") || todayUtc.toISOString();
  const to     = c.queryParam("to")   || now.toISOString();
  const top    = Math.max(1, Math.min(100, parseInt(c.queryParam("top") || "10", 10)));

  // PocketBase stocke les dates en UTC sous "YYYY-MM-DD HH:MM:SS.sss".
  const sqlFrom = from.replace("T", " ").replace("Z", "").slice(0, 19);
  const sqlTo   = to.replace("T",   " ").replace("Z",   "").slice(0, 19);

  function aggregateBy(groupCol, joins, extraCols) {
    const sql =
      `SELECT ${groupCol} AS group_id, ${extraCols.join(", ")}, ` +
      ` COUNT(*) AS tickets, ` +
      ` SUM(CASE WHEN tickets.status = 'waiting'   THEN 1 ELSE 0 END) AS waiting, ` +
      ` SUM(CASE WHEN tickets.status = 'called'    THEN 1 ELSE 0 END) AS called, ` +
      ` SUM(CASE WHEN tickets.status = 'served'    THEN 1 ELSE 0 END) AS served, ` +
      ` SUM(CASE WHEN tickets.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, ` +
      ` SUM(CASE WHEN tickets.status = 'missed'    THEN 1 ELSE 0 END) AS missed, ` +
      ` AVG(CASE WHEN tickets.status = 'served' AND tickets.served_at IS NOT NULL ` +
      `      THEN (strftime('%s', tickets.served_at) - strftime('%s', tickets.issued_at)) / 60.0 END) AS avg_wait_min ` +
      `FROM tickets ` +
      `JOIN services      ON services.id      = tickets.service ` +
      `JOIN establishments ON establishments.id = services.establishment ` +
      `${joins} ` +
      `WHERE tickets.issued_at >= {:from} AND tickets.issued_at <= {:to} ` +
      `GROUP BY ${groupCol} ` +
      `ORDER BY tickets DESC`;
    const rows = [];
    $app.db().newQuery(sql)
      .bind({ from: sqlFrom, to: sqlTo })
      .all(rows);
    return rows;
  }

  const totalsRows = [];
  $app.db().newQuery(
    "SELECT COUNT(*) AS tickets, " +
    " SUM(CASE WHEN status='waiting'   THEN 1 ELSE 0 END) AS waiting, " +
    " SUM(CASE WHEN status='called'    THEN 1 ELSE 0 END) AS called, " +
    " SUM(CASE WHEN status='served'    THEN 1 ELSE 0 END) AS served, " +
    " SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled, " +
    " SUM(CASE WHEN status='missed'    THEN 1 ELSE 0 END) AS missed, " +
    " AVG(CASE WHEN status='served' AND served_at IS NOT NULL " +
    "    THEN (strftime('%s', served_at) - strftime('%s', issued_at)) / 60.0 END) AS avg_wait_min " +
    "FROM tickets WHERE issued_at >= {:from} AND issued_at <= {:to}"
  ).bind({ from: sqlFrom, to: sqlTo }).all(totalsRows);

  const byWilaya = aggregateBy(
    "establishments.wilaya",
    "JOIN wilayas ON wilayas.id = establishments.wilaya",
    ["wilayas.code AS code", "wilayas.name_fr AS name_fr"],
  );
  const byType = aggregateBy(
    "establishments.type",
    "JOIN institution_types ON institution_types.id = establishments.type",
    ["institution_types.key AS key", "institution_types.name_fr AS name_fr", "institution_types.family AS family"],
  );

  // Top-N établissements : LIMIT direct.
  const topEsts = [];
  $app.db().newQuery(
    "SELECT establishments.id AS group_id, establishments.name AS name, " +
    " wilayas.code AS wilaya_code, institution_types.key AS type_key, " +
    " COUNT(*) AS tickets, " +
    " SUM(CASE WHEN tickets.status='waiting'   THEN 1 ELSE 0 END) AS waiting, " +
    " SUM(CASE WHEN tickets.status='called'    THEN 1 ELSE 0 END) AS called, " +
    " SUM(CASE WHEN tickets.status='served'    THEN 1 ELSE 0 END) AS served, " +
    " SUM(CASE WHEN tickets.status='cancelled' THEN 1 ELSE 0 END) AS cancelled, " +
    " SUM(CASE WHEN tickets.status='missed'    THEN 1 ELSE 0 END) AS missed, " +
    " AVG(CASE WHEN tickets.status='served' AND tickets.served_at IS NOT NULL " +
    "    THEN (strftime('%s', tickets.served_at) - strftime('%s', tickets.issued_at)) / 60.0 END) AS avg_wait_min " +
    "FROM tickets " +
    "JOIN services       ON services.id        = tickets.service " +
    "JOIN establishments ON establishments.id  = services.establishment " +
    "JOIN wilayas        ON wilayas.id         = establishments.wilaya " +
    "JOIN institution_types ON institution_types.id = establishments.type " +
    "WHERE tickets.issued_at >= {:from} AND tickets.issued_at <= {:to} " +
    "GROUP BY establishments.id " +
    "ORDER BY tickets DESC " +
    "LIMIT {:lim}"
  ).bind({ from: sqlFrom, to: sqlTo, lim: top }).all(topEsts);

  return c.json(200, {
    generated_at: new Date().toISOString(),
    scope:  { from, to, top },
    totals: totalsRows[0] || { tickets: 0, waiting: 0, called: 0, served: 0, cancelled: 0, missed: 0, avg_wait_min: null },
    by_wilaya:        byWilaya.map((r) => ({ wilaya: r.group_id, ...r, group_id: undefined })),
    by_type:          byType.map((r)   => ({ type:   r.group_id, ...r, group_id: undefined })),
    by_establishment: topEsts.map((r)  => ({ establishment: r.group_id, ...r, group_id: undefined })),
  });
});

// =====================================================================
// Web Push — abonnements + livraison via sidecar (scripts/push-sender.mjs).
// =====================================================================
const PUSH_SENDER_URL = $os.getenv("PUSH_SENDER_URL") || "http://127.0.0.1:4568";

// ---------- /api/nobty/push/vapid-public-key --------------------------
// Le frontend en a besoin pour appeler pushManager.subscribe().
routerAdd("GET", "/api/nobty/push/vapid-public-key", (c) => {
  const res = $http.send({
    url: PUSH_SENDER_URL + "/vapid-public-key",
    method: "GET",
    timeout: 5,
  });
  if (res.statusCode !== 200) throw new ApiError(503, "push sidecar indisponible");
  return c.json(200, JSON.parse(res.raw));
});

// ---------- /api/nobty/push/subscribe ---------------------------------
// Body : PushSubscription.toJSON() — { endpoint, keys: { p256dh, auth } }
routerAdd("POST", "/api/nobty/push/subscribe", (c) => {
  const auth = requireAuth(c);
  const body = jsonBody(c);
  const sub  = body.subscription || body;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    throw new ApiError(400, "subscription invalide");
  }

  const coll = $app.findCollectionByNameOrId("push_subscriptions");
  let rec;
  try {
    rec = $app.findFirstRecordByFilter(
      "push_subscriptions",
      `endpoint = "${sub.endpoint.replace(/"/g, '\\"')}"`,
    );
  } catch (_) { rec = new Record(coll); }
  rec.set("user",         auth.id);
  rec.set("endpoint",     sub.endpoint);
  rec.set("p256dh",       sub.keys.p256dh);
  rec.set("auth",         sub.keys.auth);
  rec.set("ua",           String(body.ua || c.requestInfo().headers?.["user-agent"] || "").slice(0, 512));
  rec.set("last_seen_at", new Date().toISOString());
  $app.save(rec);

  return c.json(200, { ok: true });
});

// ---------- /api/nobty/push/unsubscribe -------------------------------
routerAdd("POST", "/api/nobty/push/unsubscribe", (c) => {
  const auth = requireAuth(c);
  const body = jsonBody(c);
  if (!body.endpoint) throw new ApiError(400, "endpoint required");
  try {
    const rec = $app.findFirstRecordByFilter(
      "push_subscriptions",
      `endpoint = "${body.endpoint.replace(/"/g, '\\"')}" && user = "${auth.id}"`,
    );
    $app.delete(rec);
  } catch (_) { /* déjà absent */ }
  return c.json(200, { ok: true });
});

// ---------- Auto-push : à la création d'une notification, on relaie ----
// vers tous les endpoints de l'utilisateur, et on purge les "gone".
onRecordAfterCreateSuccess((e) => {
  const notif  = e.record;
  const userId = notif.getString("user");
  if (!userId) { e.next(); return; }

  let subs;
  try { subs = e.app.findRecordsByFilter("push_subscriptions", `user = "${userId}"`, "", 50); }
  catch (_) { e.next(); return; }

  for (const sub of subs) {
    const res = $http.send({
      url: PUSH_SENDER_URL + "/send",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: sub.getString("endpoint"),
          keys: { p256dh: sub.getString("p256dh"), auth: sub.getString("auth") },
        },
        payload: {
          title: notif.getString("title"),
          body:  notif.getString("body"),
          ticket: notif.getString("ticket") || null,
          notification_id: notif.id,
        },
      }),
      timeout: 10,
    });
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(res.raw);
        if (parsed.gone) { e.app.delete(sub); }
      } catch (_) { /* ignore parse */ }
    }
  }
  e.next();
}, "notifications");

// =====================================================================
// Hook automatique : notification quand l'utilisateur est à ≤ 3 places
// Déclenché sur update du counter (le agent appelle advance-queue).
// =====================================================================
onRecordAfterUpdateSuccess((e) => {
  const counter = e.record;
  const serviceId = counter.getString("service");
  const nowServing = counter.getInt("now_serving");

  // On regarde le ticket dont le numéro = now_serving + 3
  const targetNumber = nowServing + 3;
  let nextSoon;
  try {
    nextSoon = e.app.findFirstRecordByFilter(
      "tickets",
      `service = "${serviceId}" && number = ${targetNumber} && status = "waiting"`,
    );
  } catch (_) { return; }
  if (!nextSoon) return;

  // Évite les doublons : on n'envoie qu'une seule notif "approche"
  const alreadyNotified = e.app.findRecordsByFilter(
    "notifications",
    `ticket = "${nextSoon.id}" && title = "Bientôt votre tour"`,
    "", 1,
  );
  if (alreadyNotified.length > 0) return;

  notify(
    e.app, nextSoon.getString("user"), nextSoon.id,
    "Bientôt votre tour",
    `Plus que 3 personnes avant le n°${nextSoon.getInt("number")}. Préparez-vous.`,
  );
  e.next();
}, "queue_counters");
