#!/usr/bin/env node
/**
 * NOBTY — Sidecar Node de vérification WebAuthn.
 *
 * Petit serveur HTTP (Node built-in) qui s'appuie sur
 * @simplewebauthn/server pour vérifier les attestations / assertions
 * WebAuthn. PocketBase n'a pas accès aux primitives ECDSA/COSE depuis
 * goja, donc les hooks (`pocketbase/pb_hooks/main.pb.js`) délèguent
 * la vérification cryptographique à ce sidecar via $http.send.
 *
 * Variables d'env :
 *   WEBAUTHN_PORT      port d'écoute       (défaut 4567)
 *   WEBAUTHN_RP_ID     Relying Party ID    (défaut "localhost")
 *   WEBAUTHN_ORIGIN    Origine attendue    (défaut "http://localhost:5173")
 *   WEBAUTHN_RP_NAME   nom affiché à l'utilisateur (défaut "NOBTY")
 *
 * Endpoints :
 *   POST /register/verify  { response, expectedChallenge }
 *     → { verified, credential? }
 *   POST /auth/verify      { response, expectedChallenge, authenticator }
 *     → { verified, newCounter? }
 *   GET  /health           → { ok: true }
 *
 * Les options de création/auth (`generateRegistrationOptions`,
 * `generateAuthenticationOptions`) sont générées **côté PB** : c'est juste
 * un défi aléatoire + paramètres figés ; pas besoin du sidecar.
 */
import http from "node:http";
import { verifyRegistrationResponse, verifyAuthenticationResponse } from "@simplewebauthn/server";

const PORT     = Number(process.env.WEBAUTHN_PORT || 4567);
const RP_ID    = process.env.WEBAUTHN_RP_ID    || "localhost";
const ORIGIN   = process.env.WEBAUTHN_ORIGIN   || "http://localhost:5173";
const RP_NAME  = process.env.WEBAUTHN_RP_NAME  || "NOBTY";

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
      return send(res, 200, { ok: true, rp_id: RP_ID, origin: ORIGIN, rp_name: RP_NAME });
    }

    if (req.method === "POST" && req.url === "/register/verify") {
      const { response, expectedChallenge } = await readJson(req);
      if (!response || !expectedChallenge) {
        return send(res, 400, { error: "response and expectedChallenge required" });
      }
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return send(res, 400, { verified: false });
      }
      const info = verification.registrationInfo;
      // SimpleWebAuthn v10+ renvoie un objet `credential` ; on uniformise.
      const cred = info.credential || {
        id: Buffer.from(info.credentialID).toString("base64url"),
        publicKey: Buffer.from(info.credentialPublicKey).toString("base64url"),
        counter: info.counter,
      };
      return send(res, 200, {
        verified: true,
        credential: {
          credentialId:    typeof cred.id === "string" ? cred.id : Buffer.from(cred.id).toString("base64url"),
          publicKey:       typeof cred.publicKey === "string" ? cred.publicKey : Buffer.from(cred.publicKey).toString("base64url"),
          counter:         cred.counter ?? 0,
          transports:      response.response?.transports || [],
        },
      });
    }

    if (req.method === "POST" && req.url === "/auth/verify") {
      const { response, expectedChallenge, authenticator } = await readJson(req);
      if (!response || !expectedChallenge || !authenticator) {
        return send(res, 400, { error: "response, expectedChallenge and authenticator required" });
      }
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        // SimpleWebAuthn v10+ : `credential`, v8/9 : `authenticator`. On passe les deux.
        credential: {
          id:         authenticator.credentialId,
          publicKey:  Buffer.from(authenticator.publicKey, "base64url"),
          counter:    authenticator.counter ?? 0,
          transports: authenticator.transports || [],
        },
        authenticator: {
          credentialID:        Buffer.from(authenticator.credentialId, "base64url"),
          credentialPublicKey: Buffer.from(authenticator.publicKey, "base64url"),
          counter:             authenticator.counter ?? 0,
          transports:          authenticator.transports || [],
        },
        requireUserVerification: false,
      });
      if (!verification.verified) return send(res, 400, { verified: false });
      const newCounter = verification.authenticationInfo?.newCounter ?? authenticator.counter ?? 0;
      return send(res, 200, { verified: true, newCounter });
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    console.error("webauthn-verifier error:", err);
    return send(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`✓ NOBTY WebAuthn verifier listening on http://127.0.0.1:${PORT}`);
  console.log(`  RP_ID=${RP_ID}  ORIGIN=${ORIGIN}  RP_NAME=${RP_NAME}`);
});
