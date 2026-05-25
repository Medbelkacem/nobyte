/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Collection `otp_codes` pour l'OTP custom 6 chiffres.
 *
 * Le code en clair n'est jamais stocké : on persiste un hash bcrypt
 * (voir hooks otp-request / otp-verify dans main.pb.js).
 *
 * Champs :
 *   - user         relation users (cascadeDelete)
 *   - code_hash    text   bcrypt du code à 6 chiffres
 *   - channel      select sms | email
 *   - destination  text   numéro ou email réellement utilisé (audit)
 *   - attempts     number nombre de tentatives erronées (max 5)
 *   - expires_at   date   10 min après création par défaut
 *   - consumed     bool   true une fois vérifié avec succès
 *
 * Écritures : uniquement via hooks (createRule/updateRule = null).
 * Lectures : aucune côté SDK (listRule/viewRule = null) — seul le serveur
 *            (Dao admin dans les hooks) accède aux codes.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const otp = new Collection({
      name: "otp_codes",
      type: "base",
      listRule:   null, viewRule:   null,
      createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "user",        type: "relation", required: true, maxSelect: 1,
          collectionId: users.id, cascadeDelete: true },
        { name: "code_hash",   type: "text",   required: true, max: 255 },
        { name: "channel",     type: "select", required: true, maxSelect: 1,
          values: ["sms", "email"] },
        { name: "destination", type: "text",   required: true, max: 255 },
        { name: "attempts",    type: "number", required: false, min: 0, max: 10 },
        { name: "expires_at",  type: "date",   required: true },
        { name: "consumed",    type: "bool",   required: false },
      ],
      indexes: [
        "CREATE INDEX `idx_otp_user`       ON `otp_codes` (`user`)",
        "CREATE INDEX `idx_otp_expires_at` ON `otp_codes` (`expires_at`)",
      ],
    });
    app.save(otp);
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId("otp_codes")); } catch (_) { /* ignore */ }
  },
);
