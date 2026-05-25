/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Ajoute les champs OSM aux établissements pour permettre l'upsert
 * idempotent depuis Overpass (cf. scripts/import-osm.mjs).
 *
 * Champs :
 *   - osm_id     text   identifiant stable "node/123", "way/456", "relation/789"
 *   - osm_type   text   "node" | "way" | "relation"
 *   - phone      text   téléphone OSM (tag "phone" / "contact:phone")
 *   - website    text   site web OSM (tag "website" / "contact:website")
 *
 * Index unique sur osm_id (nullable autorisé : seuls les enregistrements
 * importés depuis OSM ont une valeur).
 */
migrate(
  (app) => {
    const est = app.findCollectionByNameOrId("establishments");

    if (!est.fields.getByName("osm_id")) {
      est.fields.add(new Field({ name: "osm_id",   type: "text", required: false, max: 64 }));
    }
    if (!est.fields.getByName("osm_type")) {
      est.fields.add(new Field({ name: "osm_type", type: "text", required: false, max: 16 }));
    }
    if (!est.fields.getByName("phone")) {
      est.fields.add(new Field({ name: "phone",    type: "text", required: false, max: 64 }));
    }
    if (!est.fields.getByName("website")) {
      est.fields.add(new Field({ name: "website",  type: "text", required: false, max: 255 }));
    }

    const hasOsmIdx = (est.indexes || []).some((i) => i.includes("idx_est_osm_id"));
    if (!hasOsmIdx) {
      est.indexes = [
        ...(est.indexes || []),
        "CREATE UNIQUE INDEX `idx_est_osm_id` ON `establishments` (`osm_id`) WHERE `osm_id` != ''",
      ];
    }

    app.save(est);
  },
  (app) => {
    const est = app.findCollectionByNameOrId("establishments");
    for (const f of ["osm_id", "osm_type", "phone", "website"]) {
      const fld = est.fields.getByName(f);
      if (fld) est.fields.removeById(fld.id);
    }
    est.indexes = (est.indexes || []).filter((i) => !i.includes("idx_est_osm_id"));
    app.save(est);
  },
);
