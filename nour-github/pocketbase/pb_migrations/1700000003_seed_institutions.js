/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Seed des 18 institution_types (7 familles)
 */
migrate(
  (app) => {
    const data = [
      // 1. FINANCE & POSTE
      ["poste","La Poste","بريد الجزائر","Algeria Post","finance","mail",10],
      ["bna","BNA","البنك الوطني الجزائري","BNA","finance","bank",11],
      ["bea","BEA","البنك الخارجي الجزائري","BEA","finance","bank",12],
      ["cpa","CPA","القرض الشعبي الجزائري","CPA","finance","bank",13],
      ["badr","BADR","بنك الفلاحة والتنمية الريفية","BADR","finance","bank",14],
      ["cnep","CNEP-Banque","الصندوق الوطني للتوفير","CNEP-Banque","finance","bank",15],
      // 2. SANTÉ
      ["hopital","Hôpital / CHU","مستشفى","Hospital / UHC","sante","hospital",20],
      ["epsp","Polyclinique / EPSP","العيادة المتعددة","Polyclinic / EPSP","sante","health",21],
      // 3. JUSTICE
      ["tribunal","Tribunal / Cour","محكمة","Court","justice","scale",30],
      // 4. ADMINISTRATION LOCALE & CIVILE
      ["apc","Mairie (APC)","البلدية","City Hall","admin_civile","home",40],
      ["daira","Daïra","الدائرة","District Office","admin_civile","building",41],
      ["foncier","Conservation Foncière","المحافظة العقارية","Land Registry","admin_civile","map",42],
      ["surete","Sûreté de Wilaya","أمن الولاية","Wilaya Police","admin_civile","shield",43],
      // 5. PROTECTION SOCIALE & EMPLOI
      ["cnas","CNAS","الصندوق الوطني للضمان الاجتماعي","CNAS","social_emploi","shield",50],
      ["casnos","CASNOS","الصندوق الوطني لغير الأجراء","CASNOS","social_emploi","shield",51],
      ["cnr","CNR","الصندوق الوطني للتقاعد","CNR","social_emploi","shield",52],
      ["anem","ANEM","الوكالة الوطنية للتشغيل","ANEM","social_emploi","briefcase",53],
      // 6. RÉSEAUX & SERVICES PUBLICS
      ["sonelgaz","Sonelgaz","سونلغاز","Sonelgaz","reseaux","bolt",60],
      ["ade","ADE / SEAAL","الجزائرية للمياه","Water Utility","reseaux","droplet",61],
      ["at","Algérie Télécom","اتصالات الجزائر","Algeria Telecom","reseaux","phone",62],
      // 7. FISCALITÉ & COMMERCE
      ["impots","Impôts (Inspection / Recette)","الضرائب","Tax Office","fiscalite_commerce","receipt",70],
      ["cnrc","CNRC","المركز الوطني للسجل التجاري","CNRC","fiscalite_commerce","briefcase",71],
    ];

    const coll = app.findCollectionByNameOrId("institution_types");
    for (const [key, name_fr, name_ar, name_en, family, icon, sort_order] of data) {
      let rec;
      try { rec = app.findFirstRecordByFilter("institution_types", `key = "${key}"`); }
      catch (_) { rec = new Record(coll); }
      rec.set("key",        key);
      rec.set("name_fr",    name_fr);
      rec.set("name_ar",    name_ar);
      rec.set("name_en",    name_en);
      rec.set("family",     family);
      rec.set("icon",       icon);
      rec.set("sort_order", sort_order);
      app.save(rec);
    }
  },
  (app) => {
    const records = app.findRecordsByFilter("institution_types", "key != ''", "", 1000);
    for (const r of records) app.delete(r);
  },
);
