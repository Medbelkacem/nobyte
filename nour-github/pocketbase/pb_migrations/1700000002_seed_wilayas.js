/// <reference path="../pb_data/types.d.ts" />
/**
 * NOBTY — Seed des 69 wilayas (loi n°26-06 du 4 avril 2026)
 */
migrate(
  (app) => {
    const data = [
      ["01","Adrar","أدرار",27.8742,-0.2891,false],
      ["02","Chlef","الشلف",36.1647,1.3349,false],
      ["03","Laghouat","الأغواط",33.8000,2.8650,false],
      ["04","Oum El Bouaghi","أم البواقي",35.8753,7.1132,false],
      ["05","Batna","باتنة",35.5559,6.1741,false],
      ["06","Béjaïa","بجاية",36.7525,5.0843,false],
      ["07","Biskra","بسكرة",34.8500,5.7333,false],
      ["08","Béchar","بشار",31.6167,-2.2167,false],
      ["09","Blida","البليدة",36.4203,2.8277,false],
      ["10","Bouira","البويرة",36.3739,3.9019,false],
      ["11","Tamanrasset","تمنراست",22.7850,5.5228,false],
      ["12","Tébessa","تبسة",35.4042,8.1244,false],
      ["13","Tlemcen","تلمسان",34.8783,-1.3150,false],
      ["14","Tiaret","تيارت",35.3711,1.3170,false],
      ["15","Tizi Ouzou","تيزي وزو",36.7169,4.0497,false],
      ["16","Alger","الجزائر",36.7538,3.0588,false],
      ["17","Djelfa","الجلفة",34.6700,3.2500,false],
      ["18","Jijel","جيجل",36.8214,5.7669,false],
      ["19","Sétif","سطيف",36.1900,5.4108,false],
      ["20","Saïda","سعيدة",34.8303,0.1517,false],
      ["21","Skikda","سكيكدة",36.8761,6.9089,false],
      ["22","Sidi Bel Abbès","سيدي بلعباس",35.1939,-0.6306,false],
      ["23","Annaba","عنابة",36.9000,7.7667,false],
      ["24","Guelma","قالمة",36.4628,7.4283,false],
      ["25","Constantine","قسنطينة",36.3650,6.6147,false],
      ["26","Médéa","المدية",36.2675,2.7539,false],
      ["27","Mostaganem","مستغانم",35.9333,0.0833,false],
      ["28","M'Sila","المسيلة",35.7058,4.5419,false],
      ["29","Mascara","معسكر",35.3961,0.1400,false],
      ["30","Ouargla","ورقلة",31.9500,5.3333,false],
      ["31","Oran","وهران",35.6976,-0.6337,false],
      ["32","El Bayadh","البيض",33.6803,1.0192,false],
      ["33","Illizi","إيليزي",26.4833,8.4667,false],
      ["34","Bordj Bou Arréridj","برج بوعريريج",36.0731,4.7611,false],
      ["35","Boumerdès","بومرداس",36.7667,3.4833,false],
      ["36","El Tarf","الطارف",36.7672,8.3133,false],
      ["37","Tindouf","تندوف",27.6708,-8.1478,false],
      ["38","Tissemsilt","تيسمسيلت",35.6075,1.8108,false],
      ["39","El Oued","الوادي",33.3683,6.8631,false],
      ["40","Khenchela","خنشلة",35.4361,7.1431,false],
      ["41","Souk Ahras","سوق أهراس",36.2864,7.9511,false],
      ["42","Tipaza","تيبازة",36.5944,2.4472,false],
      ["43","Mila","ميلة",36.4503,6.2647,false],
      ["44","Aïn Defla","عين الدفلى",36.2639,1.9683,false],
      ["45","Naâma","النعامة",33.2667,-0.3167,false],
      ["46","Aïn Témouchent","عين تموشنت",35.2978,-1.1408,false],
      ["47","Ghardaïa","غرداية",32.4900,3.6731,false],
      ["48","Relizane","غليزان",35.7372,0.5556,false],
      ["49","Timimoun","تيميمون",29.2639,0.2306,false],
      ["50","Bordj Badji Mokhtar","برج باجي مختار",21.3275,0.9542,false],
      ["51","Ouled Djellal","أولاد جلال",34.4178,5.0686,false],
      ["52","Béni Abbès","بني عباس",30.1311,-2.1700,false],
      ["53","In Salah","عين صالح",27.1969,2.4828,false],
      ["54","In Guezzam","عين قزام",19.5667,5.7667,false],
      ["55","Touggourt","تقرت",33.1000,6.0667,false],
      ["56","Djanet","جانت",24.5547,9.4847,false],
      ["57","El M'Ghair","المغير",33.9536,5.9233,false],
      ["58","El Meniaa","المنيعة",30.5833,2.8833,false],
      // 11 nouvelles wilayas
      ["59","Aflou","أفلو",34.1167,2.1000,true],
      ["60","Barika","بريكة",35.3833,5.3667,true],
      ["61","Ksar Chellala","قصر الشلالة",35.2167,2.3167,true],
      ["62","Messaad","مسعد",34.1547,3.5000,true],
      ["63","Aïn Oussara","عين وسارة",35.4503,2.9061,true],
      ["64","Bou Saâda","بوسعادة",35.2103,4.1839,true],
      ["65","El Abiodh Sidi Cheikh","الأبيض سيدي الشيخ",32.9000,0.5333,true],
      ["66","El Kantara","القنطرة",35.2189,5.7039,true],
      ["67","Bir El Ater","بئر العاتر",34.7333,8.0667,true],
      ["68","Ksar El Boukhari","قصر البخاري",35.8783,2.7589,true],
      ["69","El Aricha","العريشة",34.5333,-1.4167,true],
    ];

    const coll = app.findCollectionByNameOrId("wilayas");
    for (const [code, name_fr, name_ar, lat, lng, is_new] of data) {
      let rec;
      try { rec = app.findFirstRecordByFilter("wilayas", `code = "${code}"`); }
      catch (_) { rec = new Record(coll); }
      rec.set("code",    code);
      rec.set("name_fr", name_fr);
      rec.set("name_ar", name_ar);
      rec.set("lat",     lat);
      rec.set("lng",     lng);
      rec.set("is_new",  is_new);
      app.save(rec);
    }
  },
  (app) => {
    // down : on supprime toutes les wilayas
    const records = app.findRecordsByFilter("wilayas", "code != ''", "", 1000);
    for (const r of records) app.delete(r);
  },
);
