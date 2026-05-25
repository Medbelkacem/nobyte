/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Démo : 1 établissement par (wilaya × type) et 2-7 services par établissement.
 *
 * En production, remplacer ce seed par un import depuis :
 *   - Google Places API
 *   - Données officielles (Algérie Poste, ministère Santé, CNAS…)
 *   - OpenStreetMap / Overpass API
 */

const SERVICE_CATALOG = {
  poste: [
    ["Retrait CCP","سحب الحساب البريدي","CCP withdrawal",7],
    ["Versement","الإيداع","Deposit",6],
    ["Paiement de factures","تسديد الفواتير","Bill payment",5],
    ["Mandat","حوالة","Money order",8],
    ["Service chèques","خدمة الشيكات","Cheque service",6],
    ["Change","صرف العملة","Currency exchange",10],
  ],
  bank: [ // utilisé pour bna, bea, cpa, badr, cnep
    ["Opérations guichet","عمليات الشباك","Counter operations",8],
    ["Dépôt / Retrait","إيداع/سحب","Deposit / Withdrawal",6],
    ["Virement","تحويل","Transfer",9],
    ["Ouverture de compte","فتح حساب","Account opening",20],
  ],
  hopital: [
    ["Consultation spécialisée","استشارة مختصة","Specialist consultation",15],
    ["Urgences","الاستعجالات","Emergency",20],
    ["Radiologie","الأشعة","Radiology",12],
    ["Analyses","التحاليل","Lab analyses",10],
    ["Prise de rendez-vous","أخذ موعد","Appointment booking",5],
  ],
  epsp: [
    ["Consultation générale","استشارة عامة","General consultation",10],
    ["Soins de proximité","العلاج القريب","Local care",12],
    ["Vaccination","التلقيح","Vaccination",5],
    ["Imagerie","التصوير","Imaging",12],
  ],
  tribunal: [
    ["Greffe","كتابة الضبط","Court clerk",10],
    ["Casier judiciaire (extrait n°3)","صحيفة السوابق العدلية","Criminal record (no.3)",8],
    ["Actes judiciaires","عقود قضائية","Judicial deeds",12],
    ["Dépôt de dossiers","إيداع الملفات","File submission",9],
  ],
  apc: [
    ["État civil","الحالة المدنية","Civil status",6],
    ["Certificat de résidence","شهادة الإقامة","Residence certificate",5],
    ["Légalisation","المصادقة","Legalization",4],
  ],
  daira: [
    ["Passeport biométrique","جواز السفر البيومتري","Biometric passport",15],
    ["Carte d'identité nationale","بطاقة التعريف الوطنية","National ID card",12],
    ["Permis de conduire","رخصة السياقة","Driving license",15],
  ],
  foncier: [
    ["Acte de propriété","عقد الملكية","Property deed",18],
    ["Livret foncier","الدفتر العقاري","Land booklet",18],
    ["Certificats","شهادات","Certificates",10],
  ],
  surete: [
    ["Service de documentation","مصلحة الوثائق","Documentation service",8],
    ["Attestations","شهادات","Attestations",7],
  ],
  cnas: [
    ["Remboursements","التعويضات","Refunds",10],
    ["Carte Chifa","بطاقة الشفاء","Chifa card",8],
    ["Déclaration salariés","التصريح بالأجراء","Employee declaration",12],
  ],
  casnos: [
    ["Affiliation","الانتساب","Affiliation",10],
    ["Carte Chifa","بطاقة الشفاء","Chifa card",8],
    ["Cotisations","الاشتراكات","Contributions",9],
  ],
  cnr: [
    ["Dossier de retraite","ملف التقاعد","Retirement file",20],
    ["Pensions","المعاشات","Pensions",10],
    ["Attestations","شهادات","Attestations",7],
  ],
  anem: [
    ["Inscription demandeur d'emploi","تسجيل طالب الشغل","Job seeker registration",10],
    ["Renouvellement","تجديد","Renewal",6],
    ["Offres","عروض الشغل","Job offers",8],
  ],
  sonelgaz: [
    ["Paiement facture","تسديد الفاتورة","Bill payment",5],
    ["Réclamation","شكوى","Complaint",10],
    ["Abonnement","الاشتراك","Subscription",15],
  ],
  ade: [
    ["Paiement facture d'eau","تسديد فاتورة الماء","Water bill payment",5],
    ["Réclamation","شكوى","Complaint",10],
    ["Raccordement","الربط","Connection",15],
  ],
  at: [
    ["Abonnement","الاشتراك","Subscription",12],
    ["Réclamation","شكوى","Complaint",8],
    ["Paiement","تسديد","Payment",5],
  ],
  impots: [
    ["Déclaration","التصريح","Declaration",12],
    ["Paiement de taxes","تسديد الضرائب","Tax payment",8],
    ["Quitus fiscal","وصل الإبراء","Tax clearance",10],
  ],
  cnrc: [
    ["Registre du commerce","السجل التجاري","Commercial registry",15],
    ["Immatriculation","التسجيل","Registration",15],
    ["Extraits","مستخرجات","Extracts",7],
  ],
};

const DEFAULT_HOURS = {
  mon: ["08:00","16:00"],
  tue: ["08:00","16:00"],
  wed: ["08:00","16:00"],
  thu: ["08:00","16:00"],
  fri: null,
  sat: ["08:00","12:00"],
  sun: ["08:00","16:00"],
};

migrate(
  (app) => {
    const estColl   = app.findCollectionByNameOrId("establishments");
    const svcColl   = app.findCollectionByNameOrId("services");
    const counters  = app.findCollectionByNameOrId("queue_counters");

    const wilayas = app.findRecordsByFilter("wilayas", "code != ''", "+code", 200);
    const types   = app.findRecordsByFilter("institution_types", "key != ''", "+sort_order", 100);

    for (const w of wilayas) {
      for (const t of types) {
        // 1) Établissement
        const filter = `wilaya = "${w.id}" && type = "${t.id}"`;
        let est;
        try { est = app.findFirstRecordByFilter("establishments", filter); }
        catch (_) { est = new Record(estColl); }
        est.set("type",          t.id);
        est.set("wilaya",        w.id);
        est.set("name",          `${t.get("name_fr")} — ${w.get("name_fr")} Centre`);
        est.set("address",       `Centre-ville, ${w.get("name_fr")}`);
        est.set("lat",           w.get("lat"));
        est.set("lng",           w.get("lng"));
        est.set("opening_hours", DEFAULT_HOURS);
        est.set("is_active",     true);
        app.save(est);

        // 2) Services du catalogue (bank → 5 banques)
        const catalogKey = ["bna","bea","cpa","badr","cnep"].includes(t.get("key"))
          ? "bank"
          : t.get("key");
        const catalog = SERVICE_CATALOG[catalogKey] || [];

        for (const [name_fr, name_ar, name_en, avg] of catalog) {
          const svcFilter = `establishment = "${est.id}" && name_fr = "${name_fr.replace(/"/g, '\\"')}"`;
          let svc;
          try { svc = app.findFirstRecordByFilter("services", svcFilter); }
          catch (_) { svc = new Record(svcColl); }
          svc.set("establishment",    est.id);
          svc.set("name_fr",          name_fr);
          svc.set("name_ar",          name_ar);
          svc.set("name_en",          name_en);
          svc.set("avg_duration_min", avg);
          svc.set("is_active",        true);
          app.save(svc);

          // 3) Counter associé
          let counter;
          try { counter = app.findFirstRecordByFilter("queue_counters", `service = "${svc.id}"`); }
          catch (_) {
            counter = new Record(counters);
            counter.set("service",     svc.id);
            counter.set("last_number", 0);
            counter.set("now_serving", 0);
            app.save(counter);
          }
        }
      }
    }
  },
  (app) => {
    for (const name of ["queue_counters","services","establishments"]) {
      const records = app.findRecordsByFilter(name, "id != ''", "", 100000);
      for (const r of records) app.delete(r);
    }
  },
);
