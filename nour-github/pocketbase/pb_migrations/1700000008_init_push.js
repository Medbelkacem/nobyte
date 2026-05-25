/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Abonnements Web Push (PushSubscription du navigateur).
 *
 * La livraison effective est faite par un sidecar Node
 * (`scripts/push-sender.mjs`) basé sur `web-push`. PocketBase stocke
 * les credentials et appelle le sidecar via $http.send lors d'un
 * `notifications.onCreate`.
 *
 * Champs :
 *   - user      relation users (cascadeDelete)
 *   - endpoint  text URL FCM/APNS unique (index unique)
 *   - p256dh    text clé publique ECDH du client
 *   - auth      text secret partagé
 *   - ua        text user-agent (audit)
 *   - last_seen_at date
 *
 * Écritures via hooks uniquement (subscribe/unsubscribe).
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const subs  = new Collection({
      name: "push_subscriptions",
      type: "base",
      listRule:   "user = @request.auth.id",
      viewRule:   "user = @request.auth.id",
      createRule: null, updateRule: null,
      deleteRule: "user = @request.auth.id",
      fields: [
        { name: "user",         type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true },
        { name: "endpoint",     type: "text",   required: true, max: 1024 },
        { name: "p256dh",       type: "text",   required: true, max: 255 },
        { name: "auth",         type: "text",   required: true, max: 255 },
        { name: "ua",           type: "text",   required: false, max: 512 },
        { name: "last_seen_at", type: "date",   required: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_psub_endpoint` ON `push_subscriptions` (`endpoint`)",
        "CREATE INDEX `idx_psub_user`            ON `push_subscriptions` (`user`)",
      ],
    });
    app.save(subs);
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId("push_subscriptions")); } catch (_) { /* ignore */ }
  },
);
