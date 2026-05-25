#!/usr/bin/env node
/**
 * NOBTY — Import des établissements réels depuis OpenStreetMap via Overpass API.
 *
 * Stratégie :
 *  1) Auth admin PocketBase (env PB_URL + PB_ADMIN_EMAIL + PB_ADMIN_PASSWORD).
 *  2) Charge wilayas + institution_types depuis PB.
 *  3) Pour chaque GROUPE OSM (1 query Overpass couvrant toute l'Algérie), on
 *     récupère tous les éléments (node/way/relation) puis on les bin vers la
 *     wilaya la plus proche par distance Haversine. Cela évite ~1500 requêtes
 *     par cellule (wilaya × type) et reste sous les quotas publics d'Overpass.
 *  4) Upsert dans `establishments` par `osm_id` (idempotent).
 *  5) Pour chaque nouvel établissement créé, on instancie les services
 *     standards (catalogue identique à 1700000004_seed_demo_establishments.js)
 *     + les `queue_counters` correspondants.
 *
 * Usage :
 *   PB_URL=http://127.0.0.1:8090 \
 *   PB_ADMIN_EMAIL=admin@nobty.app \
 *   PB_ADMIN_PASSWORD=*** \
 *   node scripts/import-osm.mjs                # tous les groupes
 *   node scripts/import-osm.mjs poste hopital  # filtre par institution_type.key
 *   node scripts/import-osm.mjs --dry-run      # parse Overpass mais n'écrit rien
 *
 * Source unique de vérité pour le mapping : OSM_GROUPS (cf. ci-dessous).
 */

import PocketBase from "pocketbase";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PB_URL          = process.env.PB_URL          || "http://127.0.0.1:8090";
const PB_ADMIN_EMAIL  = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const OVERPASS_URL    = process.env.OVERPASS_URL    || "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_S = Number(process.env.OVERPASS_TIMEOUT_S || 180);

const DRY_RUN  = process.argv.includes("--dry-run");
const ONLY     = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// ---------------------------------------------------------------------------
// Mapping OSM -> institution_types.key
//
// Chaque entrée définit :
//   - keys     : liste de institution_types.key NOBTY couverts par la query
//   - query    : prédicat Overpass QL (sans la zone "area")
//   - matcher  : (tags) => key | null   choisit le bon type NOBTY pour ce node
//
// On regroupe les banques (BNA/BEA/CPA/BADR/CNEP) dans une seule query
// "amenity=bank" puis on dispatche par opérateur/nom.
// ---------------------------------------------------------------------------

const OSM_GROUPS = [
  {
    name: "poste",
    keys: ["poste"],
    query: 'nwr["amenity"="post_office"](area.algeria);',
    matcher: () => "poste",
  },
  {
    name: "banks",
    keys: ["bna", "bea", "cpa", "badr", "cnep"],
    query: 'nwr["amenity"="bank"](area.algeria);',
    matcher: (t) => {
      const blob = `${t.name || ""} ${t.operator || ""} ${t["operator:fr"] || ""} ${t["name:fr"] || ""} ${t["name:en"] || ""} ${t["name:ar"] || ""}`.toUpperCase();
      if (/\bBADR\b|FELLAHA|FALAHA/.test(blob))                 return "badr";
      if (/\bCNEP\b|CAISSE NATIONALE D[' ]?EPARGNE/.test(blob)) return "cnep";
      if (/\bCPA\b|CR[EÉ]DIT POPULAIRE/.test(blob))             return "cpa";
      if (/\bBEA\b|EXT[EÉ]RIEURE/.test(blob))                   return "bea";
      if (/\bBNA\b|BANQUE NATIONALE/.test(blob))                return "bna";
      return null; // banque hors-périmètre (Société Générale, BNP, etc.)
    },
  },
  {
    name: "hospital",
    keys: ["hopital"],
    query: 'nwr["amenity"="hospital"](area.algeria);',
    matcher: () => "hopital",
  },
  {
    name: "clinic",
    keys: ["epsp"],
    // EPSP / polycliniques publiques : on prend clinic + doctors (Algérie taggue souvent ainsi).
    query: 'nwr["amenity"="clinic"](area.algeria);nwr["healthcare"="clinic"](area.algeria);',
    matcher: () => "epsp",
  },
  {
    name: "courthouse",
    keys: ["tribunal"],
    query: 'nwr["amenity"="courthouse"](area.algeria);',
    matcher: () => "tribunal",
  },
  {
    name: "townhall",
    keys: ["apc"],
    query: 'nwr["amenity"="townhall"](area.algeria);',
    matcher: () => "apc",
  },
  {
    name: "police",
    keys: ["surete"],
    query: 'nwr["amenity"="police"](area.algeria);',
    matcher: () => "surete",
  },
  {
    name: "tax",
    keys: ["impots"],
    query: 'nwr["office"="tax"](area.algeria);nwr["office"="tax_advisor"](area.algeria);',
    matcher: () => "impots",
  },
  {
    name: "government_offices",
    keys: ["daira", "foncier", "cnas", "casnos", "cnr", "anem", "cnrc"],
    // Bureaux administratifs algériens — on filtre ensuite par nom/opérateur.
    query: 'nwr["office"="government"](area.algeria);nwr["amenity"="public_building"](area.algeria);',
    matcher: (t) => {
      const blob = `${t.name || ""} ${t.operator || ""} ${t["name:fr"] || ""} ${t["name:en"] || ""} ${t["name:ar"] || ""}`.toUpperCase();
      if (/CNRC|REGISTRE DU COMMERCE|السجل التجاري/i.test(blob))       return "cnrc";
      if (/\bANEM\b|EMPLOI/i.test(blob))                                return "anem";
      if (/\bCNR\b|RETRAITE|التقاعد/i.test(blob))                       return "cnr";
      if (/CASNOS|غير الأجراء/i.test(blob))                             return "casnos";
      if (/\bCNAS\b|الضمان الاجتماعي/i.test(blob))                      return "cnas";
      if (/CONSERVATION FONCI[EÉ]RE|المحافظة العقارية|CADASTRE/i.test(blob)) return "foncier";
      if (/\bDA[IÏ]RA\b|الدائرة/i.test(blob))                           return "daira";
      return null;
    },
  },
  {
    name: "utilities",
    keys: ["sonelgaz", "ade", "at"],
    query:
      'nwr["office"="energy_supplier"](area.algeria);' +
      'nwr["office"="telecommunication"](area.algeria);' +
      'nwr["office"="water_utility"](area.algeria);' +
      'nwr["amenity"="public_building"]["operator"~"Sonelgaz|SEAAL|ADE|Alg[eé]rie T[eé]l[eé]com",i](area.algeria);',
    matcher: (t) => {
      const blob = `${t.name || ""} ${t.operator || ""} ${t["name:fr"] || ""}`.toUpperCase();
      if (/SONELGAZ|سونلغاز/i.test(blob))                                                 return "sonelgaz";
      if (/SEAAL|\bADE\b|الجزائرية للمياه/i.test(blob))                                   return "ade";
      if (/ALG[EÉ]RIE T[EÉ]L[EÉ]COM|اتصالات الجزائر|MOBILIS(?! TELECOM)|DJEZZY/i.test(blob)) return "at";
      return null;
    },
  },
];

// Catalogue de services identique au seed démo (gardé en sync manuellement).
const SERVICE_CATALOG = {
  poste:    [["Retrait CCP","سحب الحساب البريدي","CCP withdrawal",7],["Versement","الإيداع","Deposit",6],["Paiement de factures","تسديد الفواتير","Bill payment",5],["Mandat","حوالة","Money order",8],["Service chèques","خدمة الشيكات","Cheque service",6],["Change","صرف العملة","Currency exchange",10]],
  bank:     [["Opérations guichet","عمليات الشباك","Counter operations",8],["Dépôt / Retrait","إيداع/سحب","Deposit / Withdrawal",6],["Virement","تحويل","Transfer",9],["Ouverture de compte","فتح حساب","Account opening",20]],
  hopital:  [["Consultation spécialisée","استشارة مختصة","Specialist consultation",15],["Urgences","الاستعجالات","Emergency",20],["Radiologie","الأشعة","Radiology",12],["Analyses","التحاليل","Lab analyses",10],["Prise de rendez-vous","أخذ موعد","Appointment booking",5]],
  epsp:     [["Consultation générale","استشارة عامة","General consultation",10],["Soins de proximité","العلاج القريب","Local care",12],["Vaccination","التلقيح","Vaccination",5],["Imagerie","التصوير","Imaging",12]],
  tribunal: [["Greffe","كتابة الضبط","Court clerk",10],["Casier judiciaire (extrait n°3)","صحيفة السوابق العدلية","Criminal record (no.3)",8],["Actes judiciaires","عقود قضائية","Judicial deeds",12],["Dépôt de dossiers","إيداع الملفات","File submission",9]],
  apc:      [["État civil","الحالة المدنية","Civil status",6],["Certificat de résidence","شهادة الإقامة","Residence certificate",5],["Légalisation","المصادقة","Legalization",4]],
  daira:    [["Passeport biométrique","جواز السفر البيومتري","Biometric passport",15],["Carte d'identité nationale","بطاقة التعريف الوطنية","National ID card",12],["Permis de conduire","رخصة السياقة","Driving license",15]],
  foncier:  [["Acte de propriété","عقد الملكية","Property deed",18],["Livret foncier","الدفتر العقاري","Land booklet",18],["Certificats","شهادات","Certificates",10]],
  surete:   [["Service de documentation","مصلحة الوثائق","Documentation service",8],["Attestations","شهادات","Attestations",7]],
  cnas:     [["Remboursements","التعويضات","Refunds",10],["Carte Chifa","بطاقة الشفاء","Chifa card",8],["Déclaration salariés","التصريح بالأجراء","Employee declaration",12]],
  casnos:   [["Affiliation","الانتساب","Affiliation",10],["Carte Chifa","بطاقة الشفاء","Chifa card",8],["Cotisations","الاشتراكات","Contributions",9]],
  cnr:      [["Dossier de retraite","ملف التقاعد","Retirement file",20],["Pensions","المعاشات","Pensions",10],["Attestations","شهادات","Attestations",7]],
  anem:     [["Inscription demandeur d'emploi","تسجيل طالب الشغل","Job seeker registration",10],["Renouvellement","تجديد","Renewal",6],["Offres","عروض الشغل","Job offers",8]],
  sonelgaz: [["Paiement facture","تسديد الفاتورة","Bill payment",5],["Réclamation","شكوى","Complaint",10],["Abonnement","الاشتراك","Subscription",15]],
  ade:      [["Paiement facture d'eau","تسديد فاتورة الماء","Water bill payment",5],["Réclamation","شكوى","Complaint",10],["Raccordement","الربط","Connection",15]],
  at:       [["Abonnement","الاشتراك","Subscription",12],["Réclamation","شكوى","Complaint",8],["Paiement","تسديد","Payment",5]],
  impots:   [["Déclaration","التصريح","Declaration",12],["Paiement de taxes","تسديد الضرائب","Tax payment",8],["Quitus fiscal","وصل الإبراء","Tax clearance",10]],
  cnrc:     [["Registre du commerce","السجل التجاري","Commercial registry",15],["Immatriculation","التسجيل","Registration",15],["Extraits","مستخرجات","Extracts",7]],
};

const DEFAULT_HOURS = {
  mon: ["08:00","16:00"], tue: ["08:00","16:00"], wed: ["08:00","16:00"],
  thu: ["08:00","16:00"], fri: null, sat: ["08:00","12:00"], sun: ["08:00","16:00"],
};

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestWilaya(point, wilayas) {
  let best = null;
  let bestD = Infinity;
  for (const w of wilayas) {
    const d = distanceKm(point, { lat: w.lat, lng: w.lng });
    if (d < bestD) { bestD = d; best = w; }
  }
  return { wilaya: best, distanceKm: bestD };
}

function pickName(tags) {
  return tags["name:fr"] || tags.name || tags["name:en"] || tags["name:ar"] || "(sans nom)";
}

function pickAddress(tags) {
  const parts = [
    tags["addr:housenumber"], tags["addr:street"], tags["addr:city"], tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : (tags["addr:full"] || "");
}

function pickPhone(tags)   { return tags.phone   || tags["contact:phone"]   || ""; }
function pickWebsite(tags) { return tags.website || tags["contact:website"] || ""; }

function elementCenter(el) {
  if (el.type === "node") return { lat: el.lat, lng: el.lon };
  if (el.center)          return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

async function overpassFetch(predicate) {
  const body =
    `[out:json][timeout:${OVERPASS_TIMEOUT_S}];` +
    `area["ISO3166-1"="DZ"][admin_level=2]->.algeria;` +
    `(${predicate});` +
    `out center tags;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NOBTY-osm-importer/1.0" },
    body: `data=${encodeURIComponent(body)}`,
  });

  if (res.status === 429 || res.status === 504) {
    throw new Error(`Overpass rate-limited (${res.status}) — relancez plus tard.`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Overpass HTTP ${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.elements || [];
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function main() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    console.error("✖ PB_ADMIN_EMAIL et PB_ADMIN_PASSWORD doivent être définis (admin PocketBase).");
    process.exit(2);
  }

  const pb = new PocketBase(PB_URL);
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.log(`✓ Authentifié sur ${PB_URL}`);

  const wilayas = await pb.collection("wilayas").getFullList({ batch: 200, sort: "+code" });
  const types   = await pb.collection("institution_types").getFullList({ batch: 100, sort: "+sort_order" });
  const typeByKey = Object.fromEntries(types.map((t) => [t.key, t]));
  console.log(`✓ Référentiels chargés : ${wilayas.length} wilayas, ${types.length} types`);

  const groups = OSM_GROUPS.filter((g) => ONLY.length === 0 || g.keys.some((k) => ONLY.includes(k)));
  if (groups.length === 0) {
    console.error(`✖ Aucun groupe ne correspond au filtre : ${ONLY.join(", ")}`);
    process.exit(2);
  }

  const summary = { created: 0, updated: 0, skipped: 0, unmapped: 0, services_created: 0 };

  for (const group of groups) {
    console.log(`\n▶ Groupe «${group.name}» (types : ${group.keys.join(", ")})`);
    const elements = await overpassFetch(group.query);
    console.log(`  ↳ ${elements.length} éléments Overpass`);

    for (const el of elements) {
      const center = elementCenter(el);
      if (!center) { summary.skipped++; continue; }

      const tags = el.tags || {};
      const key  = group.matcher(tags);
      if (!key)         { summary.unmapped++; continue; }
      const type = typeByKey[key];
      if (!type)        { summary.unmapped++; continue; }

      const { wilaya } = nearestWilaya(center, wilayas);
      if (!wilaya)      { summary.skipped++; continue; }

      const osmId = `${el.type}/${el.id}`;
      const name  = pickName(tags);

      const record = {
        type:          type.id,
        wilaya:        wilaya.id,
        name,
        address:       pickAddress(tags) || `${wilaya.name_fr}`,
        lat:           center.lat,
        lng:           center.lng,
        opening_hours: DEFAULT_HOURS,
        is_active:     true,
        osm_id:        osmId,
        osm_type:      el.type,
        phone:         pickPhone(tags),
        website:       pickWebsite(tags),
      };

      if (DRY_RUN) {
        summary.created++;
        continue;
      }

      let existing = null;
      try {
        existing = await pb.collection("establishments").getFirstListItem(`osm_id = "${osmId}"`);
      } catch (_) { /* not found */ }

      let saved;
      if (existing) {
        saved = await pb.collection("establishments").update(existing.id, record);
        summary.updated++;
      } else {
        saved = await pb.collection("establishments").create(record);
        summary.created++;
      }

      // Services standards pour ce type (clé "bank" partagée par les 5 banques)
      const catalogKey = ["bna","bea","cpa","badr","cnep"].includes(key) ? "bank" : key;
      const catalog    = SERVICE_CATALOG[catalogKey] || [];
      for (const [name_fr, name_ar, name_en, avg] of catalog) {
        try {
          await pb.collection("services").getFirstListItem(
            `establishment = "${saved.id}" && name_fr = "${name_fr.replace(/"/g, '\\"')}"`,
          );
        } catch (_) {
          const svc = await pb.collection("services").create({
            establishment: saved.id, name_fr, name_ar, name_en,
            avg_duration_min: avg, is_active: true,
          });
          await pb.collection("queue_counters").create({
            service: svc.id, last_number: 0, now_serving: 0,
          });
          summary.services_created++;
        }
      }
    }
  }

  console.log("\n══════════════ Résumé ══════════════");
  console.log(`  Créés      : ${summary.created}`);
  console.log(`  Mis à jour : ${summary.updated}`);
  console.log(`  Non mappés : ${summary.unmapped}`);
  console.log(`  Ignorés    : ${summary.skipped}`);
  console.log(`  Services   : ${summary.services_created} créés`);
  if (DRY_RUN) console.log("  (mode --dry-run : aucune écriture)");
}

main().catch((err) => {
  console.error("\n✖ Import échoué :", err.message);
  process.exit(1);
});
