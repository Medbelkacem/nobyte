#!/usr/bin/env node
/**
 * NOBTY — Sidecar Node de livraison Web Push.
 *
 * Petit serveur HTTP qui encapsule `web-push` (chiffrement payload + VAPID).
 * Les hooks PocketBase appellent ce sidecar via $http.send lors d'un
 * `notifications.onCreate` ; le retour permet à PB de purger les
 * abonnements expirés (statut 404 ou 410 de FCM/APNS).
 *
 * Variables d'env :
 *   PUSH_PORT          port d'écoute              (défaut 4568)
 *   VAPID_PUBLIC_KEY   base64url (générée par web-push generate-vapid-keys)
 *   VAPID_PRIVATE_KEY  base64url
 *   VAPID_SUBJECT      mailto:contact@nobty.app   (défaut "mailto:admin@nobty.local")
 *
 * Endpoints :
 *   POST /send  { subscription, payload }
 *     → { delivered: bool, gone?: bool, status?: number, error?: string }
 *   GET  /vapid-public-key  → { key }
 *   GET  /health
 */
import http from "node:http";
import webpush from "web-push";

const PORT          = Number(process.env.PUSH_PORT || 4568);
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@nobty.local";

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("✖ VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sont requis.");
  console.error("  Générez-les avec :  npx web-push generate-vapid-keys");
  process.exit(2);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true });
    }
    if (req.method === "GET" && req.url === "/vapid-public-key") {
      return send(res, 200, { key: VAPID_PUBLIC });
    }
    if (req.method === "POST" && req.url === "/send") {
      const { subscription, payload } = await readJson(req);
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return send(res, 400, { error: "subscription { endpoint, keys{p256dh,auth} } required" });
      }
      try {
        const result = await webpush.sendNotification(subscription, JSON.stringify(payload || {}));
        return send(res, 200, { delivered: true, status: result.statusCode });
      } catch (err) {
        const status = err?.statusCode || 0;
        // 404/410 = endpoint mort → l'appelant doit supprimer l'abonnement.
        if (status === 404 || status === 410) {
          return send(res, 200, { delivered: false, gone: true, status });
        }
        return send(res, 200, { delivered: false, status, error: String(err?.body || err?.message || err) });
      }
    }
    return send(res, 404, { error: "not found" });
  } catch (err) {
    console.error("push-sender error:", err);
    return send(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`✓ NOBTY Web Push sender listening on http://127.0.0.1:${PORT}`);
  console.log(`  VAPID_SUBJECT=${VAPID_SUBJECT}`);
});
