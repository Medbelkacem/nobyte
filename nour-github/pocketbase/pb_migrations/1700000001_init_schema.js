/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Initialisation du schéma PocketBase (v0.23+)
 *
 * Collections créées :
 *   - users (système, étendue avec champs métier)
 *   - wilayas, institution_types, establishments, services (référentiels en lecture publique)
 *   - queue_counters, tickets, notifications (accès filtré par utilisateur ou par rôle agent)
 *
 * Convention des règles d'accès :
 *   - listRule / viewRule : "" (vide) = public
 *   - createRule / updateRule / deleteRule : null = interdit hors hooks/admin
 */

migrate(
  (app) => {
    // -------------------------------------------------------------
    // 1) users — étend la collection système (sans agent_establishment
    //    car la collection cible n'existe pas encore).
    // -------------------------------------------------------------
    const users = app.findCollectionByNameOrId("users");
    users.fields.add(new Field({ name: "first_name", type: "text", required: false }));
    users.fields.add(new Field({ name: "last_name",  type: "text", required: false }));
    users.fields.add(new Field({ name: "phone",      type: "text", required: false, max: 20 }));
    users.fields.add(new Field({
      name: "lang", type: "select", required: false,
      maxSelect: 1, values: ["fr", "ar", "en"],
    }));
    users.fields.add(new Field({
      name: "theme", type: "select", required: false,
      maxSelect: 1, values: ["light", "dark", "auto"],
    }));
    users.fields.add(new Field({
      name: "role", type: "select", required: true,
      maxSelect: 1, values: ["citizen", "agent", "admin"],
    }));

    users.listRule   = "id = @request.auth.id";
    users.viewRule   = "id = @request.auth.id";
    users.updateRule = "id = @request.auth.id && role = 'citizen'";
    users.deleteRule = "id = @request.auth.id";
    app.save(users);

    // -------------------------------------------------------------
    // 2) wilayas
    // -------------------------------------------------------------
    const wilayas = new Collection({
      name: "wilayas",
      type: "base",
      listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "code",     type: "text",   required: true, max: 4 },
        { name: "name_fr",  type: "text",   required: true },
        { name: "name_ar",  type: "text",   required: true },
        { name: "lat",      type: "number", required: true },
        { name: "lng",      type: "number", required: true },
        { name: "is_new",   type: "bool",   required: false },
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_wilaya_code` ON `wilayas` (`code`)"],
    });
    app.save(wilayas);

    // -------------------------------------------------------------
    // 3) institution_types
    // -------------------------------------------------------------
    const institutionTypes = new Collection({
      name: "institution_types",
      type: "base",
      listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "key",        type: "text",   required: true },
        { name: "name_fr",    type: "text",   required: true },
        { name: "name_ar",    type: "text",   required: true },
        { name: "name_en",    type: "text",   required: true },
        { name: "family",     type: "select", required: true, maxSelect: 1,
          values: ["finance","sante","justice","admin_civile","social_emploi","reseaux","fiscalite_commerce"] },
        { name: "icon",       type: "text",   required: true },
        { name: "sort_order", type: "number", required: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_instype_key` ON `institution_types` (`key`)",
        "CREATE INDEX `idx_instype_family` ON `institution_types` (`family`)",
      ],
    });
    app.save(institutionTypes);

    // -------------------------------------------------------------
    // 4) establishments
    // -------------------------------------------------------------
    const establishments = new Collection({
      name: "establishments",
      type: "base",
      listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "type",         type: "relation", required: true, maxSelect: 1,
          collectionId: institutionTypes.id, cascadeDelete: false },
        { name: "wilaya",       type: "relation", required: true, maxSelect: 1,
          collectionId: wilayas.id, cascadeDelete: false },
        { name: "name",         type: "text", required: true },
        { name: "address",      type: "text", required: true },
        { name: "lat",          type: "number", required: true },
        { name: "lng",          type: "number", required: true },
        { name: "opening_hours",type: "json",   required: false, maxSize: 4000 },
        { name: "is_active",    type: "bool",   required: false },
      ],
      indexes: [
        "CREATE INDEX `idx_est_wilaya` ON `establishments` (`wilaya`)",
        "CREATE INDEX `idx_est_type`   ON `establishments` (`type`)",
      ],
    });
    app.save(establishments);

    // -------------------------------------------------------------
    // 5) users — ajout du champ agent_establishment maintenant que la
    //    collection cible existe.
    // -------------------------------------------------------------
    const usersAgent = app.findCollectionByNameOrId("users");
    usersAgent.fields.add(new Field({
      name: "agent_establishment", type: "relation", required: false,
      maxSelect: 1, collectionId: establishments.id, cascadeDelete: false,
    }));
    app.save(usersAgent);

    // -------------------------------------------------------------
    // 6) services
    // -------------------------------------------------------------
    const services = new Collection({
      name: "services",
      type: "base",
      listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "establishment", type: "relation", required: true, maxSelect: 1,
          collectionId: establishments.id, cascadeDelete: true },
        { name: "name_fr",          type: "text",   required: true },
        { name: "name_ar",          type: "text",   required: true },
        { name: "name_en",          type: "text",   required: true },
        { name: "avg_duration_min", type: "number", required: true, min: 1, max: 240 },
        { name: "is_active",        type: "bool",   required: false },
      ],
      indexes: ["CREATE INDEX `idx_svc_est` ON `services` (`establishment`)"],
    });
    app.save(services);

    // -------------------------------------------------------------
    // 7) queue_counters
    // -------------------------------------------------------------
    const counters = new Collection({
      name: "queue_counters",
      type: "base",
      // Lecture publique (le citoyen voit le pointeur).
      // Écriture uniquement via hooks (RPC advance_queue).
      listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "service",     type: "relation", required: true, maxSelect: 1,
          collectionId: services.id, cascadeDelete: true },
        // required:false → PB v0.38 traite 0 comme "vide" et refuserait l'insert
        // initial. Le hook issue-ticket initialise toujours à 0 explicitement.
        { name: "last_number", type: "number", required: false, min: 0 },
        { name: "now_serving", type: "number", required: false, min: 0 },
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_counter_service` ON `queue_counters` (`service`)"],
    });
    app.save(counters);

    // -------------------------------------------------------------
    // 8) tickets
    // -------------------------------------------------------------
    const tickets = new Collection({
      name: "tickets",
      type: "base",
      // Lecture : propriétaire OU agent du service (RLS via filtre)
      listRule: "user = @request.auth.id || (@request.auth.role = 'agent' && service.establishment = @request.auth.agent_establishment) || @request.auth.role = 'admin'",
      viewRule: "user = @request.auth.id || (@request.auth.role = 'agent' && service.establishment = @request.auth.agent_establishment) || @request.auth.role = 'admin'",
      // Écritures : seulement via hooks (issue-ticket, cancel-ticket, advance-queue)
      createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "user",         type: "relation", required: true, maxSelect: 1,
          collectionId: app.findCollectionByNameOrId("users").id, cascadeDelete: true },
        { name: "service",      type: "relation", required: true, maxSelect: 1,
          collectionId: services.id, cascadeDelete: true },
        { name: "number",       type: "number", required: true, min: 1 },
        { name: "status",       type: "select", required: true, maxSelect: 1,
          values: ["waiting","called","served","cancelled","missed"] },
        { name: "issued_at",    type: "date",   required: false },
        { name: "called_at",    type: "date",   required: false },
        { name: "served_at",    type: "date",   required: false },
        { name: "est_wait_min", type: "number", required: false, min: 0 },
      ],
      indexes: [
        "CREATE INDEX `idx_tk_user`    ON `tickets` (`user`)",
        "CREATE INDEX `idx_tk_service` ON `tickets` (`service`)",
        "CREATE INDEX `idx_tk_status`  ON `tickets` (`status`)",
        "CREATE UNIQUE INDEX `idx_tk_service_number` ON `tickets` (`service`,`number`)",
      ],
    });
    app.save(tickets);

    // -------------------------------------------------------------
    // 9) notifications
    // -------------------------------------------------------------
    const notifs = new Collection({
      name: "notifications",
      type: "base",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: null, // créées par hooks
      updateRule: "user = @request.auth.id",
      deleteRule: "user = @request.auth.id",
      fields: [
        { name: "user",   type: "relation", required: true, maxSelect: 1,
          collectionId: app.findCollectionByNameOrId("users").id, cascadeDelete: true },
        { name: "ticket", type: "relation", required: false, maxSelect: 1,
          collectionId: tickets.id, cascadeDelete: true },
        { name: "title",  type: "text", required: true },
        { name: "body",   type: "text", required: true },
        { name: "read",   type: "bool", required: false },
      ],
      indexes: ["CREATE INDEX `idx_notif_user` ON `notifications` (`user`)"],
    });
    app.save(notifs);
  },
  (app) => {
    // Down migration : supprime tout ce qui a été créé
    for (const name of [
      "notifications", "tickets", "queue_counters",
      "services", "establishments", "institution_types", "wilayas",
    ]) {
      try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* ignore */ }
    }
    const users = app.findCollectionByNameOrId("users");
    for (const f of ["first_name","last_name","phone","lang","theme","role","agent_establishment"]) {
      const fld = users.fields.getByName(f);
      if (fld) users.fields.removeById(fld.id);
    }
    app.save(users);
  },
);
