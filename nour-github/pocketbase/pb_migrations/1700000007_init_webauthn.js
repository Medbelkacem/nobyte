/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — WebAuthn / Passkeys (vérification serveur réelle).
 *
 * La vérification cryptographique elle-même est déléguée à un sidecar
 * Node (`scripts/webauthn-verifier.mjs`, port 4567 par défaut) qui
 * utilise @simplewebauthn/server. Les hooks PocketBase orchestrent l'état
 * (défis éphémères, persistance des credentials) et appellent le sidecar
 * via $http.send.
 *
 * Collections :
 *   - passkeys              (un credential WebAuthn par appareil)
 *       user         relation users (cascadeDelete)
 *       credential_id      text  (base64url, unique)
 *       public_key         text  (base64url COSE)
 *       counter            number sign-count anti-replay
 *       transports         text  (CSV : "internal,hybrid,…")
 *       device_name        text  (libellé saisi par l'utilisateur)
 *       last_used_at       date
 *
 *   - webauthn_challenges   (défis valables 5 min, consommés une fois)
 *       challenge          text  (base64url, unique)
 *       user               relation users (nullable pour l'auth sans email)
 *       purpose            select register | authenticate
 *       expires_at         date
 *       consumed           bool
 *
 * Écritures uniquement via hooks (createRule/updateRule = null).
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const passkeys = new Collection({
      name: "passkeys",
      type: "base",
      listRule:   "user = @request.auth.id",
      viewRule:   "user = @request.auth.id",
      createRule: null, updateRule: null,
      deleteRule: "user = @request.auth.id",
      fields: [
        { name: "user",          type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true },
        { name: "credential_id", type: "text",   required: true, max: 512 },
        { name: "public_key",    type: "text",   required: true, max: 2048 },
        { name: "counter",       type: "number", required: true, min: 0 },
        { name: "transports",    type: "text",   required: false, max: 255 },
        { name: "device_name",   type: "text",   required: false, max: 128 },
        { name: "last_used_at",  type: "date",   required: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_pk_credential_id` ON `passkeys` (`credential_id`)",
        "CREATE INDEX `idx_pk_user`               ON `passkeys` (`user`)",
      ],
    });
    app.save(passkeys);

    const challenges = new Collection({
      name: "webauthn_challenges",
      type: "base",
      listRule: null, viewRule: null,
      createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "challenge",   type: "text",   required: true, max: 255 },
        { name: "user",        type: "relation", required: false, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true },
        { name: "purpose",     type: "select", required: true, maxSelect: 1,
          values: ["register", "authenticate"] },
        { name: "expires_at",  type: "date",   required: true },
        { name: "consumed",    type: "bool",   required: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_wc_challenge`  ON `webauthn_challenges` (`challenge`)",
        "CREATE INDEX `idx_wc_expires_at`        ON `webauthn_challenges` (`expires_at`)",
      ],
    });
    app.save(challenges);
  },
  (app) => {
    for (const name of ["webauthn_challenges", "passkeys"]) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* ignore */ }
    }
  },
);
