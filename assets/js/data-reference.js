/* ==========================================================================
 * MCD.ref: reference data for Cilangkap Command (BUILD_SPEC §F.3).
 *
 * Built from BUILD_SPEC §F.3 (which wins) and docs/research-tni-products.json
 * (source and notes of each site, competitor sources). Institutional data
 * only: no personal data lives in this file.
 *
 *   mabesPolygon   [[lon, lat]] ×100, OSM way 912445334 (ODbL), ~272,6 ha
 *   mabes          {centroid, labelAnchor, areaHa, osmWay, source, caveat}
 *   worldPolygon   ring for the focus mask (§E.2)
 *   kelurahan      [name, kecamatan, kota, lat, lon, lowPrecision 0|1] ×150
 *   findKelurahan(name, kota?) · kelurahanByKey · normPlace(s)
 *   sites          89 map markers (§F.3.3); the complex centroid is mabes.centroid
 *   siteById · homeSite · siteKinds
 *   matra (AL, AD, AU, GAB) · matraOrder · pangkalanKinds · pangkalanOf(site): every TNI site has an explicit
 *                  `matra` and `matraWhy` (COPY_STYLE_EN item 34)
 *   satker         27 units (§F.3.4) · satkerById · satkerAlias · satkerAliasNote
 *   normSatker(s) · resolveSatker(raw)
 *   competitors    11 public PKS/MoU facts (§F.3.5) · competitorsFooter
 *   ranks · rankByCode · rankGroups · parseRank(s) · inferMatra(s)
 *   bupAge(p, cfg) · retireDate(birth, bup, cfg) · retirement(p, cfg)
 *   salaryBands · salaryBandFor(rankGroup, pnsGol) · banks
 *
 * Generated data blocks come from the spec tables; edit the spec, not here.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ref = {};
  function isNum(x) { return typeof x === 'number' && isFinite(x); }

  ref.meta = {
    asOf: '2026-10-12',
    sources: {
      polygon: 'OpenStreetMap way 912445334 (ODbL)',
      kelurahan: 'docs/research-tni-products.json geo.kelurahan (centroid OSM/place node)',
      sites: 'BUILD_SPEC §F.3.3 + docs/research-tni-products.json geo.sites',
      satker: 'BUILD_SPEC §F.3.4 (nama dari riset, koordinat dalam kompleks = penempatan demo)',
      competitors: 'BUILD_SPEC §F.3.5 + docs/research-tni-products.json tni.competitors',
      ranks: 'UU 3/2025 Pasal 53 & Pasal II · PP 11/2017 jo. PP 17/2020 (PNS)',
      salary: 'BUILD_SPEC §F.3.7 (pita demo, termasuk tukin & tunjangan saat ini)'
    }
  };

  /* ------------------------------------------------- F.3.1 Mabes polygon */

  ref.mabesPolygon = [[106.913415,-6.315075],[106.912631,-6.315069],[106.91209,-6.315016],[106.912014,-6.316765],[106.912041,-6.317351],[106.912009,-6.31878],[106.911993,-6.320529],[106.909627,-6.320332],[106.909407,-6.320401],[106.9093,-6.320625],[106.909155,-6.324171],[106.908474,-6.324155],[106.908415,-6.324949],[106.908522,-6.32601],[106.908898,-6.327002],[106.907852,-6.327018],[106.907578,-6.327098],[106.90746,-6.327988],[106.907106,-6.328159],[106.90694,-6.328521],[106.906881,-6.328799],[106.906945,-6.329193],[106.90694,-6.329492],[106.906916,-6.329753],[106.906875,-6.329908],[106.90658,-6.330302],[106.90643,-6.330635],[106.906409,-6.330835],[106.90646,-6.331043],[106.906674,-6.331392],[106.906902,-6.331619],[106.907186,-6.331928],[106.907508,-6.33211],[106.907691,-6.332312],[106.90827,-6.332435],[106.908635,-6.332707],[106.908565,-6.334365],[106.908082,-6.338625],[106.909488,-6.33871],[106.910539,-6.339051],[106.91114,-6.339179],[106.911022,-6.339734],[106.911419,-6.339915],[106.911301,-6.340256],[106.912043,-6.340466],[106.912328,-6.340503],[106.912975,-6.340598],[106.913822,-6.34088],[106.914836,-6.341141],[106.915335,-6.341344],[106.916032,-6.340582],[106.917197,-6.338859],[106.918028,-6.335874],[106.918339,-6.33589],[106.918548,-6.335788],[106.918715,-6.335666],[106.918795,-6.33549],[106.919112,-6.333528],[106.919832,-6.333219],[106.919879,-6.333113],[106.919802,-6.333055],[106.919743,-6.332967],[106.919655,-6.332785],[106.919523,-6.332022],[106.919353,-6.33172],[106.920099,-6.327898],[106.919949,-6.327599],[106.919573,-6.327514],[106.919176,-6.327311],[106.918291,-6.3273],[106.918205,-6.327199],[106.918237,-6.327071],[106.918983,-6.326618],[106.919149,-6.326394],[106.919213,-6.326106],[106.919144,-6.325882],[106.918919,-6.325674],[106.918951,-6.325184],[106.919369,-6.324517],[106.919573,-6.323579],[106.920142,-6.322896],[106.920179,-6.321281],[106.920088,-6.321137],[106.919669,-6.321084],[106.917937,-6.320737],[106.917475,-6.320348],[106.91754,-6.319644],[106.916934,-6.319548],[106.916859,-6.319441],[106.916649,-6.319404],[106.91637,-6.319895],[106.916204,-6.320033],[106.915625,-6.319948],[106.915555,-6.320566],[106.914031,-6.320518],[106.914085,-6.319313],[106.913763,-6.319303],[106.913774,-6.31669],[106.913796,-6.315176],[106.913415,-6.315075]];

  ref.mabes = {
    name: 'Mabes TNI Cilangkap',
    label: 'MABES TNI · CILANGKAP',
    sublabel: '272.6 ha · OSM way 912445334',
    centroid: { lat: -6.32945, lon: 106.91366 },        // area-weighted; anchors the polygon label only (no marker)
    labelAnchor: { lat: -6.31790, lon: 106.91340 },      // §E.4 HTML label position
    areaHa: 272.6,
    osmWay: 912445334,
    address: 'Jl. Mabes Hankam, Kel. Cilangkap, Kec. Cipayung, Jakarta Timur 13870',
    source: 'https://www.openstreetmap.org/way/912445334',
    caveat: 'The OSM outline also covers civilian housing at Perumahan Setu Indah to the north (27 vertices in Kel. Setu) ' +
      'and part of Pondok Ranggon to the south. A point-in-polygon test is therefore not used to mark personnel as “inside Mabes”.',
    notes: "Area-weighted centroid of the OSM military polygon (~272.6 ha as mapped). OSM places it in Kel. Cilangkap with an RW-level unit 'MABES'. The polygon also takes in civilian housing: 27 of its 100 vertices fall in Kel. Setu (north, incl. Perumahan Setu Indah) and 8 in Pondok Ranggon (south)."
  };

  ref.worldPolygon = [[-180, -85.05], [180, -85.05], [180, 85.05], [-180, 85.05], [-180, -85.05]];

  /* --------------------------------------------- F.3.2 kelurahan centroids */

  // [name, kecamatan, kota, lat, lon, lowPrecision]; lowPrecision = 1 for Kota Bekasi and
  // Kota Depok (Cimanggis, Sukmajaya, Cilodong), which come from place nodes (51 rows).
  ref.kelurahan = [
    ["Cilangkap","Cipayung","Jakarta Timur",-6.33368,106.90867,0],
    ["Setu","Cipayung","Jakarta Timur",-6.31306,106.91483,0],
    ["Jatiranggon","Jatisampurna","Kota Bekasi",-6.33838,106.92759,1],
    ["Jatimurni","Pondok Melati","Kota Bekasi",-6.32494,106.93031,1],
    ["Cipayung","Cipayung","Jakarta Timur",-6.32904,106.8939,0],
    ["Bambu Apus","Cipayung","Jakarta Timur",-6.31322,106.90221,0],
    ["Jatimelati","Pondok Melati","Kota Bekasi",-6.31611,106.93034,1],
    ["Munjul","Cipayung","Jakarta Timur",-6.34788,106.89541,0],
    ["Jatiraden","Jatisampurna","Kota Bekasi",-6.35429,106.92205,1],
    ["Jatiwarna","Pondok Melati","Kota Bekasi",-6.30982,106.93191,1],
    ["Pondok Ranggon","Cipayung","Jakarta Timur",-6.35634,106.90659,0],
    ["Ceger","Cipayung","Jakarta Timur",-6.31248,106.88995,0],
    ["Jatisampurna","Jatisampurna","Kota Bekasi",-6.35965,106.92317,1],
    ["Kelapa Dua Wetan","Ciracas","Jakarta Timur",-6.34104,106.88301,0],
    ["Jatisari","Jatiasih","Kota Bekasi",-6.3393,106.94526,1],
    ["Jatirahayu","Pondok Melati","Kota Bekasi",-6.29734,106.92453,1],
    ["Lubang Buaya","Cipayung","Jakarta Timur",-6.29413,106.90364,0],
    ["Jatiluhur","Jatiasih","Kota Bekasi",-6.32021,106.95037,1],
    ["Ciracas","Ciracas","Jakarta Timur",-6.326,106.87551,0],
    ["Jatirangga","Jatisampurna","Kota Bekasi",-6.36066,106.93785,1],
    ["Cibubur","Ciracas","Jakarta Timur",-6.35721,106.8824,0],
    ["Rambutan","Ciracas","Jakarta Timur",-6.30739,106.87783,0],
    ["Jatiasih","Jatiasih","Kota Bekasi",-6.3055,106.95234,1],
    ["Jatimakmur","Pondok Gede","Kota Bekasi",-6.28468,106.92563,1],
    ["Susukan","Ciracas","Jakarta Timur",-6.31276,106.86881,0],
    ["Jatimekar","Jatiasih","Kota Bekasi",-6.29498,106.94684,1],
    ["Dukuh","Kramat Jati","Jakarta Timur",-6.29612,106.8778,0],
    ["Pinang Ranti","Makasar","Jakarta Timur",-6.28944,106.88421,0],
    ["Pekayon","Pasar Rebo","Jakarta Timur",-6.34527,106.86439,0],
    ["Ciangsana","Gunung Putri","Kabupaten Bogor",-6.35602,106.95875,0],
    ["Jatikarya","Jatisampurna","Kota Bekasi",-6.38206,106.92233,1],
    ["Cijantung","Pasar Rebo","Jakarta Timur",-6.32142,106.85857,0],
    ["Bojong Kulur","Gunung Putri","Kabupaten Bogor",-6.3212,106.96935,0],
    ["Jatiwaringin","Pondok Gede","Kota Bekasi",-6.27246,106.91474,1],
    ["Harjamukti","Cimanggis","Kota Depok",-6.38276,106.88592,1],
    ["Gedong","Pasar Rebo","Jakarta Timur",-6.30182,106.85999,0],
    ["Jatikramat","Jatiasih","Kota Bekasi",-6.2762,106.94199,1],
    ["Kalisari","Pasar Rebo","Jakarta Timur",-6.33522,106.85319,0],
    ["Mekarsari","Cimanggis","Kota Depok",-6.3671,106.8656,1],
    ["Tengah","Kramat Jati","Jakarta Timur",-6.28973,106.86668,0],
    ["Jatirasa","Jatiasih","Kota Bekasi",-6.2958,106.96851,1],
    ["Nagrak","Gunung Putri","Kabupaten Bogor",-6.38499,106.94592,0],
    ["Makasar","Makasar","Jakarta Timur",-6.27533,106.87698,0],
    ["Gunung Putri","Gunung Putri","Kabupaten Bogor",-6.39246,106.93472,0],
    ["Baru","Pasar Rebo","Jakarta Timur",-6.32424,106.84694,0],
    ["Halim Perdana Kusuma","Makasar","Jakarta Timur",-6.2658,106.89331,0],
    ["Jaticempaka","Pondok Gede","Kota Bekasi",-6.26127,106.91063,1],
    ["Cisalak Pasar","Cimanggis","Kota Depok",-6.3711,106.85879,1],
    ["Curug","Cimanggis","Kota Depok",-6.38604,106.87395,1],
    ["Bantargebang","Bantar Gebang","Kota Bekasi",-6.32308,106.98307,1],
    ["Sukatani","Tapos","Kota Depok",-6.39346,106.88675,0],
    ["Cisalak","Sukmajaya","Kota Depok",-6.37933,106.86505,1],
    ["Tanjung Barat","Jagakarsa","Jakarta Selatan",-6.30671,106.84747,0],
    ["Kramat Jati","Kramat Jati","Jakarta Timur",-6.27417,106.87073,0],
    ["Pasir Gunung Selatan","Cimanggis","Kota Depok",-6.34658,106.8455,1],
    ["Cikiwul","Bantar Gebang","Kota Bekasi",-6.33284,106.98548,1],
    ["Limusnunggal","Cileungsi","Kabupaten Bogor",-6.37501,106.9692,0],
    ["Jatibening","Pondok Gede","Kota Bekasi",-6.26194,106.93928,1],
    ["Tugu","Cimanggis","Kota Depok",-6.36648,106.85088,1],
    ["Batu Ampar","Kramat Jati","Jakarta Timur",-6.27908,106.86107,0],
    ["Jatibening Baru","Pondok Gede","Kota Bekasi",-6.26291,106.94338,1],
    ["Bojong Menteng","Rawalumbu","Kota Bekasi",-6.29666,106.98036,1],
    ["Cikeas Udik","Gunung Putri","Kabupaten Bogor",-6.40388,106.92718,0],
    ["Lenteng Agung","Jagakarsa","Jakarta Selatan",-6.32549,106.83691,0],
    ["Bale Kambang","Kramat Jati","Jakarta Timur",-6.28155,106.85278,0],
    ["Leuwinanggung","Tapos","Kota Depok",-6.40811,106.90652,0],
    ["Jakamulya","Bekasi Selatan","Kota Bekasi",-6.26647,106.96209,1],
    ["Ciketing Udik","Bantar Gebang","Kota Bekasi",-6.36231,106.98664,1],
    ["Cipinang Melayu","Makasar","Jakarta Timur",-6.24941,106.9059,0],
    ["Baktijaya","Sukmajaya","Kota Depok",-6.38493,106.85495,1],
    ["Pejaten Timur","Pasar Minggu","Jakarta Selatan",-6.28001,106.8484,0],
    ["Kebon Pala","Makasar","Jakarta Timur",-6.25574,106.87775,0],
    ["Cililitan","Kramat Jati","Jakarta Timur",-6.26248,106.86443,0],
    ["Pasar Minggu","Pasar Minggu","Jakarta Selatan",-6.28981,106.83946,0],
    ["Pasirangin","Cileungsi","Kabupaten Bogor",-6.37818,106.98307,0],
    ["Kebagusan","Pasar Minggu","Jakarta Selatan",-6.30971,106.83095,0],
    ["Cileungsi","Cileungsi","Kabupaten Bogor",-6.39969,106.96245,0],
    ["Jakasetia","Bekasi Selatan","Kota Bekasi",-6.26785,106.97422,1],
    ["Abadijaya","Sukmajaya","Kota Depok",-6.38896,106.85,1],
    ["Sukamaju Baru","Tapos","Kota Depok",-6.40581,106.87182,0],
    ["Pondok Kelapa","Duren Sawit","Jakarta Timur",-6.2435,106.93195,0],
    ["Pondok Cina","Beji","Kota Depok",-6.36552,106.83218,0],
    ["Pekayon Jaya","Bekasi Selatan","Kota Bekasi",-6.26319,106.97372,1],
    ["Srengseng Sawah","Jagakarsa","Jakarta Selatan",-6.34843,106.82445,0],
    ["Mekarjaya","Sukmajaya","Kota Depok",-6.38672,106.84284,1],
    ["Bintara Jaya","Bekasi Barat","Kota Bekasi",-6.24798,106.95457,1],
    ["Cawang","Kramat Jati","Jakarta Timur",-6.25082,106.86672,0],
    ["Bojong Rawalumbu","Rawalumbu","Kota Bekasi",-6.28503,106.99418,1],
    ["Jati Padang","Pasar Minggu","Jakarta Selatan",-6.28831,106.83106,0],
    ["Tapos","Tapos","Kota Depok",-6.41831,106.88963,0],
    ["Sumur Batu","Bantar Gebang","Kota Bekasi",-6.34319,107.00518,1],
    ["Rawajati","Pancoran","Jakarta Selatan",-6.25811,106.85466,0],
    ["Wanaherang","Gunung Putri","Kabupaten Bogor",-6.41648,106.94501,0],
    ["Jagakarsa","Jagakarsa","Jakarta Selatan",-6.32543,106.81929,0],
    ["Pondok Bambu","Duren Sawit","Jakarta Timur",-6.23475,106.90094,0],
    ["Padurenan","Mustika Jaya","Kota Bekasi",-6.31702,107.00893,1],
    ["Duren Sawit","Duren Sawit","Jakarta Timur",-6.23328,106.91581,0],
    ["Pejaten Barat","Pasar Minggu","Jakarta Selatan",-6.2729,106.83513,0],
    ["Ragunan","Pasar Minggu","Jakarta Selatan",-6.29881,106.82125,0],
    ["Kemirimuka","Beji","Kota Depok",-6.38096,106.83093,0],
    ["Cileungsi Kidul","Cileungsi","Kabupaten Bogor",-6.41071,106.96938,0],
    ["Pengadegan","Pancoran","Jakarta Selatan",-6.24925,106.85539,0],
    ["Cipenjo","Cileungsi","Kabupaten Bogor",-6.39002,106.9925,0],
    ["Kalibata","Pancoran","Jakarta Selatan",-6.26329,106.83767,0],
    ["Cipinang Cempedak","Jatinegara","Jakarta Timur",-6.23684,106.8735,0],
    ["Kukusan","Beji","Kota Depok",-6.36626,106.8186,0],
    ["Bojong Nangka","Gunung Putri","Kabupaten Bogor",-6.43133,106.90253,0],
    ["Jatijajar","Tapos","Kota Depok",-6.42072,106.86608,0],
    ["Cikoko","Pancoran","Jakarta Selatan",-6.24491,106.85428,0],
    ["Beji Timur","Beji","Kota Depok",-6.37931,106.82284,0],
    ["Jakasampurna","Bekasi Barat","Kota Bekasi",-6.2435,106.97219,1],
    ["Cicadas","Gunung Putri","Kabupaten Bogor",-6.43239,106.92812,0],
    ["Ciganjur","Jagakarsa","Jakarta Selatan",-6.33634,106.80861,0],
    ["Bidara Cina","Jatinegara","Jakarta Timur",-6.23534,106.86694,0],
    ["Mustikasari","Mustika Jaya","Kota Bekasi",-6.2986,107.01502,1],
    ["Sukamaju","Cilodong","Kota Depok",-6.41583,106.85183,1],
    ["Sukmajaya","Sukmajaya","Kota Depok",-6.41119,106.84406,1],
    ["Duren Tiga","Pancoran","Jakarta Selatan",-6.25584,106.83536,0],
    ["Cilandak Timur","Pasar Minggu","Jakarta Selatan",-6.29119,106.81281,0],
    ["Kebon Baru","Tebet","Jakarta Selatan",-6.23372,106.86162,0],
    ["Sepanjang Jaya","Rawalumbu","Kota Bekasi",-6.26672,107.00337,1],
    ["Pancoran","Pancoran","Jakarta Selatan",-6.24752,106.84076,0],
    ["Pangkalanjati Baru","Cinere","Kota Depok",-6.32283,106.80233,0],
    ["Tebet Timur","Tebet","Jakarta Selatan",-6.23379,106.85553,0],
    ["Mekarsari","Cileungsi","Kabupaten Bogor",-6.40584,106.99608,0],
    ["Beji","Beji","Kota Depok",-6.38276,106.81405,0],
    ["Pengasinan","Rawalumbu","Kota Bekasi",-6.26917,107.0094,1],
    ["Cilangkap","Tapos","Kota Depok",-6.43283,106.86671,0],
    ["Depok","Pancoran Mas","Kota Depok",-6.39893,106.8235,0],
    ["Kayuringin Jaya","Bekasi Selatan","Kota Bekasi",-6.2424,106.98685,1],
    ["Cipedak","Jagakarsa","Jakarta Selatan",-6.35373,106.80215,0],
    ["Tebet Barat","Tebet","Jakarta Selatan",-6.23481,106.84899,0],
    ["Dayeuh","Cileungsi","Kabupaten Bogor",-6.43055,106.96766,0],
    ["Bangka","Mampang Prapatan","Jakarta Selatan",-6.26315,106.81828,0],
    ["Tegal Parang","Mampang Prapatan","Jakarta Selatan",-6.24881,106.82923,0],
    ["Tlajung Udik","Gunung Putri","Kabupaten Bogor",-6.44599,106.9139,0],
    ["Pondok Labu","Cilandak","Jakarta Selatan",-6.30932,106.79697,0],
    ["Tanah Baru","Beji","Kota Depok",-6.37417,106.80329,0],
    ["Depok Jaya","Pancoran Mas","Kota Depok",-6.39328,106.81101,0],
    ["Mampang Prapatan","Mampang Prapatan","Jakarta Selatan",-6.24275,106.82867,0],
    ["Menteng Dalam","Tebet","Jakarta Selatan",-6.23168,106.84122,0],
    ["Gandul","Cinere","Kota Depok",-6.34013,106.79188,0],
    ["Cilodong","Cilodong","Kota Depok",-6.42661,106.83999,1],
    ["Tirtajaya","Sukmajaya","Kota Depok",-6.41194,106.82347,1],
    ["Cipete Selatan","Cilandak","Jakarta Selatan",-6.27276,106.80508,0],
    ["Cilandak Barat","Cilandak","Jakarta Selatan",-6.29053,106.7972,0],
    ["Kembang Kuning","Klapanunggal","Kabupaten Bogor",-6.4495,106.93887,0],
    ["Cimpaeun","Tapos","Kota Depok",-6.44594,106.87375,0],
    ["Pela Mampang","Mampang Prapatan","Jakarta Selatan",-6.24855,106.81716,0],
    ["Margahayu","Bekasi Timur","Kota Bekasi",-6.2525,107.01507,1]
  ];

  /** Lower-case, no diacritics, no 'kota/kabupaten/kab./adm.' prefixes, alphanumerics only. */
  ref.normPlace = function (s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    t = t.replace(/\b(kota administrasi|kota adm|kabupaten|kab|kota|adm|kelurahan|kel|desa)\b\.?/g, ' ');
    t = t.replace(/\bjak(t|ar)?\s*(tim|timur)\b/g, 'jakarta timur').replace(/\bjaktim\b/g, 'jakarta timur')
      .replace(/\bjaksel\b/g, 'jakarta selatan').replace(/\bjakbar\b/g, 'jakarta barat')
      .replace(/\bjakut\b/g, 'jakarta utara').replace(/\bjakpus\b/g, 'jakarta pusat');
    return t.replace(/[^a-z0-9]+/g, '');
  };

  function kelObj(r) {
    return { name: r[0], kecamatan: r[1], kota: r[2], lat: r[3], lon: r[4], lowPrecision: r[5] === 1 };
  }
  ref.kelurahanByKey = {};      // normPlace(name) + '|' + normPlace(kota) → row object
  ref.kelurahanByName = {};     // normPlace(name) → [row objects] (Cilangkap and Mekarsari repeat)
  ref.kelurahan.forEach(function (r) {
    var o = kelObj(r), n = ref.normPlace(r[0]);
    ref.kelurahanByKey[n + '|' + ref.normPlace(r[2])] = o;
    (ref.kelurahanByName[n] = ref.kelurahanByName[n] || []).push(o);
  });
  /**
   * findKelurahan(name, kota?) → {name, kecamatan, kota, lat, lon, lowPrecision} | null.
   * With kota: exact key. Without kota (or no key match): the unique name match, else null
   * (ambiguous names return null; the importer asks the user).
   */
  ref.findKelurahan = function (name, kota) {
    var n = ref.normPlace(name);
    if (!n) return null;
    if (kota) {
      var hit = ref.kelurahanByKey[n + '|' + ref.normPlace(kota)];
      if (hit) return hit;
    }
    var list = ref.kelurahanByName[n];
    return (list && list.length === 1) ? list[0] : null;
  };

  /* ------------------------------------------------------- F.3.3 sites */

  // {id, label, name, kind, bank, lat, lon, confidence, tier, home?, source, notes}
  // bank: 'MANDIRI' for Mandiri outlets, competitor monogram (BNI/BRI) for competitor_branch, else null.
  // `far` (> 12 km from the branch) is derived at runtime (MCD.config.farSiteKm).
  ref.sites = [
    {"id":"mdr-cilangkap","label":"KCP Jakarta Cilangkap","name":"Bank Mandiri Jakarta Cilangkap (di dalam kompleks)","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.33203,"lon":106.90989,"confidence":"medium","tier":1,"home":true,"source":"https://bankmandiri.co.id/customer-service-machine-bank-mandiri/lokasi-csm ; https://www.trackpacking.com/v/index/4c29a075ed0ac9b68b1762aa","notes":"Address (high confidence) is from Mandiri's CSM location list: 'Jakarta Cilangkap - Komplek Mabes ABRI Cilangkap, Wil. Kota Jakarta Timur 13870'. The coordinate is the user-placed Foursquare venue 'Bank Mandiri Mabes TNI Cilangkap', so confirm it. Mandiri's 2021 ATM list shows in-complex ATMs CB CILANGKAP 01-03, GV MABESTNICLKP 01/02, GV MABESTNI2 01 and GV MABESTNIAUCLNK 01, under Area 129 Jakarta Pasar Rebo / Wilayah IV Jakarta Thamrin (2021 data)."},
    {"id":"mabesal","label":"Mabes TNI AL (perkiraan)","name":"Mabes TNI AL (Mabesal), approximate","kind":"hq_navy","matra":"AL","matraWhy":"Mabes TNI AL (Mabesal), markas besar TNI AL","bank":null,"lat":-6.33133,"lon":106.91169,"confidence":"low","tier":1,"source":"https://www.trackpacking.com/v/index/4fbd968de4b0ecb7890e3f4f ; https://www.kemhan.go.id/ropeg/2018/12/11/jadwal-pelaksanaan-testskb-cpns-kemhan-uo-tni-al-ta-2018-wilayah-barat-jakarta.html ; https://ppid.tni.mil.id/pages-7-simpul-layanan.html","notes":"Not mapped in OSM or Wikidata. The pin is the Foursquare venue 'Auditorium Denma Mabes TNI AL'. Kemhan (2018) says to enter via 'pintu Delta 4 / Pintu Mabes TNI AL' from Jalan Mabes Hankam. Mandiri's 2021 ATM list has an ATM 'JKT GV MBALCILANGKAP 01' geocoded to Jl. Cilangkap Raya No.72 RT1/RW3, and a Foursquare 'DISKOMLEKAL, Markas Besar TNI AL' pin sits at -6.33272,106.90276, both on the west side. Verify on site."},
    {"id":"mabesau","label":"Mabes TNI AU (perkiraan)","name":"Mabes TNI AU (Mabesau), approximate","kind":"hq_airforce","matra":"AU","matraWhy":"Mabes TNI AU (Mabesau), markas besar TNI AU","bank":null,"lat":-6.32901,"lon":106.91419,"confidence":"low","tier":1,"source":"https://www.trackpacking.com/v/index/4c402b12da3dc92817ebc6b9 ; https://www.trackpacking.com/v/index/5059607be4b099330e1ade29","notes":"Foursquare 'Mabes TNI AU' and 'Gedung B2, Mabes TNI AU' (-6.32870,106.91401) agree, and the OSM 'Kantin Mabes Angkatan Udara' is further east. Conflict: BNI labels its in-complex office 'Komp. Mabes TNI AU Cilangkap' at -6.330606,106.907243 (west side). TNI AU news (Dec 2024) mentions a separate Mabesau main gate and 'delta 2'."},
    {"id":"bni-mabes","label":"BNI Mabes TNI Cilangkap","name":"BNI Mabes TNI Cilangkap (Komp. Mabes TNI AU Cilangkap)","kind":"competitor_branch","bank":"BNI","lat":-6.330606,"lon":106.907243,"confidence":"high","tier":1,"source":"https://bniexperience.bni.co.id/lokasi/cabang/1059","notes":"From BNI's own branch locator. A direct competitor inside the complex, ~0.7 km west of the centroid."},
    {"id":"al-ciangsana","label":"Komplek TNI AL Ciangsana","name":"Komplek TNI AL Ciangsana","kind":"navy_housing","matra":"AL","matraWhy":"Nama kompleks \"TNI AL\" dan jalan bernama KRI","bank":null,"lat":-6.3565,"lon":106.9505,"confidence":"high","tier":1,"source":"https://www.openstreetmap.org/way/363690250 ; https://www.kompas.tv/video/92826/bakti-sosial-rayakan-hut-ke-74-jalasenastri","notes":"Navy-named streets (Jl. KRI Pattimura, KRI Hasan Basri, KRI Imam Bonjol, Laut Jawa/Flores/Natuna, Jl. TNI AL), plus Gereja POUK TNI AL Ciangsana and SDS Plus Hang Tuah 7. Desa Ciangsana, Kec. Gunung Putri, Kab. Bogor. The nearest navy cluster to Mabes, ~5.0 km SE."},
    {"id":"pati-jatikarya","label":"Komplek Pati Mabes TNI Jatikarya","name":"Komplek Pati Mabes TNI Jatikarya","kind":"military_housing","matra":"GAB","matraWhy":"Perumahan perwira tinggi Mabes TNI","bank":null,"lat":-6.38213,"lon":106.91646,"confidence":"medium","tier":1,"source":"https://www.openstreetmap.org/way/492980583","notes":"Senior-officer housing, Kel. Jatikarya, Jatisampurna (Kota Bekasi), ~5.8 km S."},
    {"id":"hankam-jatimakmur","label":"Komplek Hankam Jatimakmur","name":"Komplek Hankam (Jatimakmur, Pondok Gede)","kind":"military_housing","matra":"GAB","matraWhy":"Nama \"Hankam\" (Kemhan): semua matra","bank":null,"lat":-6.29184,"lon":106.9315,"confidence":"medium","tier":1,"source":"https://www.openstreetmap.org/node/13077890389","notes":"~4.6 km NNE."},
    {"id":"plaza-mabes","label":"Plaza Mabes TNI","name":"Plaza Mabes TNI, poros patung Jenderal Sudirman dan air mancur","kind":"hq_unit","matra":"GAB","matraWhy":"Poros upacara di tengah kompleks Mabes TNI","bank":null,"lat":-6.33043,"lon":106.91278,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/13546873994","notes":"Central ceremonial axis: OSM maps 6 fountains from -6.3288 to -6.3319 at lon ~106.9125-106.9132. A Foursquare pin for 'Markas Besar TNI (MABES TNI)' sits at -6.33178,106.91187 (https://www.trackpacking.com/v/index/4c09296bffb8c9b6e9636961)."},
    {"id":"kantin-mabesau","label":"Kantin Mabes AU","name":"Kantin Mabes Angkatan Udara","kind":"other","matra":"AU","matraWhy":"Kantin Mabes TNI AU di dalam kompleks","bank":null,"lat":-6.32903,"lon":106.91917,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/5091090521","notes":"Air Force HQ canteen in the east part of the complex."},
    {"id":"mako-akademi","label":"Mako Akademi TNI","name":"Mako Akademi TNI (Komp. Mako Akademi TNI Cilangkap)","kind":"hq_unit","matra":"GAB","matraWhy":"Akademi TNI: pendidikan gabungan semua matra","bank":null,"lat":-6.33168,"lon":106.91578,"confidence":"low","tier":2,"source":"https://www.trackpacking.com/v/index/4de79e7c091a2770a18738c8 ; https://www.medcom.id/nasional/metro/aNr7zY1b-2-anggota-tni-tersambar-petir-saat-berjaga-di-mabes-cilangkap-jaktim","notes":"Foursquare pin. The OSM 'Taruna' statue (-6.33163,106.91731) and grandstands (~-6.333..-6.335, 106.917) are nearby. Medcom (Apr 2024) confirms Mabesal, Mabesau, Koopsus TNI and Mako Akademi TNI are all inside the Cilangkap complex."},
    {"id":"mes-akademi","label":"Mes Mako Akademi TNI","name":"Mes Mako Akademi TNI","kind":"military_housing","matra":"GAB","matraWhy":"Mes Akademi TNI (gabungan)","bank":null,"lat":-6.34727,"lon":106.90689,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/1493440501","notes":"Tagged military=barracks. Jl. Cilangkap Baru, Pondok Ranggon, just south of the complex."},
    {"id":"pusterad","label":"Pusterad","name":"Pusat Teritorial Angkatan Darat (Pusterad)","kind":"hq_unit","matra":"AD","matraWhy":"Pusat Teritorial Angkatan Darat","bank":null,"lat":-6.32419,"lon":106.90472,"confidence":"high","tier":2,"source":"https://www.openstreetmap.org/way/1316349699","notes":"Army territorial centre on the NW edge of the complex. Office building is OSM way 155941031."},
    {"id":"museum-bhakti","label":"Museum Bhakti TNI","name":"Museum Bhakti TNI dan monumen (ujung utara)","kind":"other","matra":"GAB","matraWhy":"Museum Bhakti TNI di kompleks Mabes TNI","bank":null,"lat":-6.31721,"lon":106.91347,"confidence":"high","tier":2,"source":"https://www.openstreetmap.org/way/507253152","notes":"Public-facing landmark with the Trikora/Dwikora/Seroja monuments, near Jl. Terusan Mabes Hankam."},
    {"id":"golf-cilangkap","label":"Padang Golf Cilangkap","name":"Padang Golf Cilangkap","kind":"other","matra":"GAB","matraWhy":"Operator di OSM: Tentara Nasional Indonesia","bank":null,"lat":-6.32385,"lon":106.91656,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/32024831","notes":"Golf course in the NE quadrant; OSM operator = Tentara Nasional Indonesia."},
    {"id":"barak-satpamwal","label":"Barak SatPamWal","name":"Barak SatPamWal Mabes TNI","kind":"military_housing","matra":"GAB","matraWhy":"SatPamWal Mabes TNI (gabungan)","bank":null,"lat":-6.33742,"lon":106.90967,"confidence":"low","tier":3,"source":"https://www.trackpacking.com/v/index/4f82e8f1e4b0a6d0b8650aa0","notes":"Security and escort unit barracks (Foursquare pin)."},
    {"id":"gate-west","label":"Gerbang barat (kandidat Delta 1)","name":"Gerbang barat, Jl. Hankam Cilangkap (kandidat Pintu Delta 1)","kind":"gate","matra":"GAB","matraWhy":"Gerbang kompleks Mabes TNI","bank":null,"lat":-6.33071,"lon":106.90644,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/node/1682629236 ; https://moovitapp.com/index/en/public_transit-Delta_1_Mabes_TNI_Cilangkap_JakTim-Jakarta-site_54293765-2044 ; https://megapolitan.antaranews.com/berita/286644/tni-benarkan-dua-prajuritnya-tersambar-petir-saat-jaga-di-depan-pintu-delta-1-mabes-tni","notes":"The OSM lift_gate (access=private) location is reliable; the name 'Delta 1' is not. A second lift gate sits at -6.33072,106.90848 (node 4996552110). Moovit lists 'Delta 1 Mabes TNI' with nearest stop 'Jalan Hankam Cilangkap 3a' (~148 m). Antara (24 Apr 2024) confirms a gate called Pintu Delta 1 exists."},
    {"id":"gate-delta5","label":"Pintu Delta 5","name":"Pintu Delta 5 (barat daya, sisi Pondok Ranggon)","kind":"gate","matra":"GAB","matraWhy":"Gerbang kompleks Mabes TNI","bank":null,"lat":-6.33898,"lon":106.90924,"confidence":"low","tier":2,"source":"https://www.trackpacking.com/v/index/4d528fd607b1a0909e47143c ; https://www.pinhome.id/disewa/rumah-sekunder/unit/disewakan-rumah-di-jl-mabes-tni-pintu-delta-5-cipayung-jaktim","notes":"Foursquare pin. A rental ad uses the address 'Jl. Mabes TNI Pintu Delta 5', Pondok Ranggon."},
    {"id":"gate-north","label":"Gerbang utara","name":"Gerbang utara (Jl. Raya / Terusan Mabes Hankam)","kind":"gate","matra":"GAB","matraWhy":"Gerbang kompleks Mabes TNI","bank":null,"lat":-6.31503,"lon":106.91304,"confidence":"low","tier":2,"source":"https://www.openstreetmap.org/node/2059303423 ; https://www.infopublik.id/kategori/sorot-politik-hukum/436617/presiden-naik-panser-anoa-amfibi-membelah-danau-mabes-tni-cilangkap ; https://m.beritajakarta.id/en/read/11998/Jalan%20Raya%20Mabes%20Hankam%20will%20Be%20Widened%20Soon","notes":"OSM barrier=gate at the north tip. InfoPublik (2017) calls 'Delta II' the main gate; matching it to this node is not verified. BeritaJakarta (undated) reports widening ~2 km of Jl. Raya Mabes Hankam from the JORR bridge to the Mabes main gate."},
    {"id":"gate-east","label":"Gerbang timur","name":"Gerbang timur (sisi Jatimurni / Bekasi)","kind":"gate","matra":"GAB","matraWhy":"Gerbang kompleks Mabes TNI","bank":null,"lat":-6.33315,"lon":106.9198,"confidence":"low","tier":2,"source":"https://www.openstreetmap.org/node/6477476992","notes":"OSM gate plus lift_gate (node 6486969219), access=private."},
    {"id":"checkpoint-south","label":"Pos selatan","name":"Pos penjagaan militer, selatan (Pondok Ranggon)","kind":"gate","matra":"GAB","matraWhy":"Pos jaga kompleks Mabes TNI","bank":null,"lat":-6.34682,"lon":106.91413,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/6664997925","notes":"Tagged military=checkpoint."},
    {"id":"mdr-raya-cilangkap","label":"Mandiri Jl. Raya Cilangkap","name":"Bank Mandiri, Jl. Raya Cilangkap","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.33806,"lon":106.89901,"confidence":"low","tier":2,"source":"https://www.openstreetmap.org/way/509533185","notes":"OSM building from the 2017 HOT InAWARE survey. Outlet name and type are unknown; check that it still operates."},
    {"id":"mdr-kdw","label":"Mandiri Kelapa Dua Wetan","name":"Bank Mandiri, Jl. Raya Kelapa Dua Wetan Blok Taqwa No.70","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.34016,"lon":106.88782,"confidence":"low","tier":2,"source":"https://www.openstreetmap.org/way/501539630","notes":"2017 survey data; outlet name unknown."},
    {"id":"mdr-cibubur","label":"KCP Jakarta Cibubur","name":"Bank Mandiri Jakarta Cibubur (Jl. Lapangan Tembak, Pertokoan Cibubur Indah Blok A-22/23)","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.34911,"lon":106.87657,"confidence":"medium","tier":2,"source":"https://bankmandiri.co.id/customer-service-machine-bank-mandiri/lokasi-csm ; https://www.openstreetmap.org/way/498993807","notes":"Address (postal code 13720) is from the Mandiri CSM list, matched to the OSM 'Bank Mandiri' on Jl. Lapangan Tembak."},
    {"id":"mdr-cibubur-2","label":"Mandiri Cibubur","name":"Bank Mandiri (Cibubur, di sebelah BCA)","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.35234,"lon":106.88302,"confidence":"low","tier":3,"source":"https://www.openstreetmap.org/node/4920971801","notes":"OSM node; outlet name and type unknown."},
    {"id":"mdr-cimanggis","label":"KCP Jakarta Cimanggis","name":"Bank Mandiri Jakarta Cimanggis (Jl. Raya Jakarta Bogor Km 28)","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.35025,"lon":106.86429,"confidence":"low","tier":2,"source":"https://bankmandiri.co.id/customer-service-machine-bank-mandiri/lokasi-csm ; https://www.openstreetmap.org/way/119587054","notes":"Matching the CSM address to this OSM Bank Mandiri on Jl. Raya Bogor is uncertain."},
    {"id":"mdr-kota-wisata","label":"KCP Cibubur Kota Wisata","name":"Bank Mandiri Cibubur Kota Wisata (Ruko Sentra Eropa Blok A No.5-6)","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.36971,"lon":106.95726,"confidence":"low","tier":2,"source":"https://bankmandiri.co.id/customer-service-machine-bank-mandiri/lokasi-csm ; https://www.openstreetmap.org/way/492980593","notes":"Pin is the centroid of the Ruko Sentra Eropa block. It is the closest Mandiri outlet (~1.5 km) to Komplek TNI AL Ciangsana."},
    {"id":"mdr-citra-grand","label":"KCP Cibubur Citra Grand","name":"Bank Mandiri Cibubur Citra Grand (Ruko 2 No.15, Jl. Alternatif Km 4)","kind":"mandiri_branch","bank":"MANDIRI","lat":-6.38135,"lon":106.92634,"confidence":"low","tier":2,"source":"https://bankmandiri.co.id/customer-service-machine-bank-mandiri/lokasi-csm ; https://www.openstreetmap.org/way/1475038557","notes":"Pin is the centroid of Kawasan Niaga Citra Grand, ~1 km from the Jatikarya Mabes TNI housing."},
    {"id":"atm-mabes2","label":"ATM Mandiri Jl. Mabes 2","name":"ATM Mandiri, sisi timur (Jl. Mabes 2)","kind":"mandiri_atm","bank":"MANDIRI","lat":-6.32514,"lon":106.92085,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/13564035864","notes":"Unnamed Mandiri ATM on the eastern boundary of the complex."},
    {"id":"atm-spbu-setu","label":"ATM Mandiri SPBU Setu","name":"ATM Mandiri SPBU 34-13805","kind":"mandiri_atm","bank":"MANDIRI","lat":-6.30576,"lon":106.91681,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/12191854464","notes":"Setu, north of the complex."},
    {"id":"atm-indomaret-setu","label":"ATM Mandiri Indomaret Setu","name":"ATM Mandiri Indomaret Setu","kind":"mandiri_atm","bank":"MANDIRI","lat":-6.3053,"lon":106.92131,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/12191854491","notes":null},
    {"id":"atm-pagelarang","label":"ATM Mandiri Pagelarang","name":"ATM Mandiri Indomaret Pagelarang","kind":"mandiri_atm","bank":"MANDIRI","lat":-6.30677,"lon":106.91615,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/12191854472","notes":null},
    {"id":"bri-hankam","label":"BRI Hankam","name":"Bank BRI Hankam","kind":"competitor_branch","bank":"BRI","lat":-6.31197,"lon":106.92432,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/node/4358144295","notes":"Jatiwarna, ~2.3 km NNE."},
    {"id":"bri-cilangkap","label":"BRI Jl. Raya Cilangkap","name":"BRI, Jl. Raya Cilangkap","kind":"competitor_branch","bank":"BRI","lat":-6.34297,"lon":106.90839,"confidence":"low","tier":2,"source":"https://www.openstreetmap.org/way/506334752","notes":"2017 survey data."},
    {"id":"bni-ceger","label":"BNI Ceger","name":"BNI, Jl. Bina Marga (Ceger)","kind":"competitor_branch","bank":"BNI","lat":-6.33099,"lon":106.88842,"confidence":"low","tier":2,"source":"https://www.openstreetmap.org/node/4981849395","notes":"2017 survey data."},
    {"id":"kodam-jatiwarna","label":"Komplek Kodam Jaya Jatiwarna","name":"Komplek Kodam Jaya Jatiwarna (gerbang utama)","kind":"military_housing","matra":"AD","matraWhy":"Kodam Jaya: komando daerah TNI AD","bank":null,"lat":-6.3018,"lon":106.92396,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/node/4240863165","notes":"~3.3 km NNE."},
    {"id":"kemhan-jatimakmur","label":"Komplek Kemhan Mabes TNI Jatimakmur","name":"Komplek Kemhan Mabes TNI Jatimakmur","kind":"military_housing","matra":"GAB","matraWhy":"Nama \"Kemhan Mabes TNI\": gabungan","bank":null,"lat":-6.28434,"lon":106.92728,"confidence":"low","tier":2,"source":"https://www.trackpacking.com/v/index/50520d5ee4b03d1e199a81cf","notes":"Foursquare pin, ~5.2 km NNE."},
    {"id":"barak-jatimurni","label":"Barak timur Jatimurni","name":"Kompleks barak di timur Mabes (Jatimurni/Jatiwarna)","kind":"military_housing","matra":"GAB","matraWhy":"Satuan tidak diketahui (barak tanpa nama di OSM)","bank":null,"lat":-6.32,"lon":106.9285,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/675171197","notes":"Several unnamed private roads tagged military=barracks (ways 565638662, 675171196, 701297130, ...). Unit unknown. ~1.9 km NE."},
    {"id":"perumdis-jatikarya","label":"Perumahan Dinas Mabes TNI Jatikarya","name":"Perumahan Dinas Mabes TNI (Jatikarya)","kind":"military_housing","matra":"GAB","matraWhy":"Perumahan dinas Mabes TNI","bank":null,"lat":-6.38313,"lon":106.92173,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/1475038572","notes":"Tagged military=barracks."},
    {"id":"rumdis-akademi","label":"Rumah Dinas Akademi TNI","name":"Rumah Dinas Akademi TNI","kind":"military_housing","matra":"GAB","matraWhy":"Rumah dinas Akademi TNI (gabungan)","bank":null,"lat":-6.39744,"lon":106.92469,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/492980618","notes":null},
    {"id":"kodam-ceger","label":"Komp Kodam Ceger","name":"Komp Kodam Ceger","kind":"military_housing","matra":"AD","matraWhy":"Nama \"Kodam\": TNI AD","bank":null,"lat":-6.31404,"lon":106.89171,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/155953884","notes":null},
    {"id":"seni-ad","label":"Komplek TNI Seni AD","name":"Komplek Perumahan TNI Seni AD (Lubang Buaya)","kind":"military_housing","matra":"AD","matraWhy":"Nama \"TNI Seni AD\"","bank":null,"lat":-6.2908,"lon":106.89263,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/155953693","notes":null},
    {"id":"hankam-cibubur","label":"Komplek Hankam Mabes TNI Cibubur","name":"Komplek Hankam Mabes TNI Cibubur","kind":"military_housing","matra":"GAB","matraWhy":"Nama \"Hankam Mabes TNI\": gabungan","bank":null,"lat":-6.34507,"lon":106.88026,"confidence":"low","tier":3,"source":"https://www.trackpacking.com/v/index/509d0e52e4b0cfcd39489546","notes":"Foursquare pin."},
    {"id":"ad-cibubur","label":"Komplek Perum AD Cibubur","name":"Komplek Perum AD Cibubur","kind":"military_housing","matra":"AD","matraWhy":"Nama \"Perum AD\"","bank":null,"lat":-6.36584,"lon":106.88848,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/relation/17329324","notes":null},
    {"id":"asabri-indah","label":"Komplek Asabri Indah","name":"Komplek Asabri Indah (Jatiasih)","kind":"military_housing","matra":"GAB","matraWhy":"Nama \"Asabri\" (asuransi TNI): matra tidak jelas","bank":null,"lat":-6.3273,"lon":106.95133,"confidence":"low","tier":3,"source":"https://www.openstreetmap.org/node/2639245046","notes":"Name refers to ASABRI, the military social-insurance and pension insurer. The military link is inferred from the name only."},
    {"id":"bumi-dirgantara","label":"Komplek Bumi Dirgantara (AU)","name":"Komplek Bumi Dirgantara (TNI AU)","kind":"military_housing","matra":"AU","matraWhy":"Nama \"Dirgantara\" dan jalan bernama pesawat","bank":null,"lat":-6.35042,"lon":106.94756,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/node/2639246362","notes":"Streets are named after aircraft (Jl. Hercules, Mustang, Fokker, Ilyusin, Albatros). Jatirangga/Ciangsana edge, ~4.4 km SE."},
    {"id":"waringin-permai","label":"Komplek TNI AU Waringin Permai","name":"Komplek TNI AU Waringin Permai / Perumahan TNI AU (Jatiwaringin)","kind":"military_housing","matra":"AU","matraWhy":"Nama kompleks \"TNI AU\"","bank":null,"lat":-6.25168,"lon":106.91129,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/334989578","notes":"Foursquare 'Komplek auri jatiwaringin' pin at -6.25136,106.91218. ~8.6 km N."},
    {"id":"triloka","label":"Komplek TNI AU Triloka","name":"Komplek TNI AU Triloka (Pancoran)","kind":"military_housing","matra":"AU","matraWhy":"Nama kompleks \"TNI AU\"","bank":null,"lat":-6.24613,"lon":106.84273,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/4240929793","notes":null},
    {"id":"dwikora-cilodong","label":"Komplek TNI AU Dwikora","name":"Komplek TNI AU Dwikora (Cilodong, Depok)","kind":"military_housing","matra":"AU","matraWhy":"Nama kompleks \"TNI AU\"","bank":null,"lat":-6.43924,"lon":106.85442,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1107713710","notes":null},
    {"id":"purn-kopassus","label":"Komp. Purn. Kopassus Pelita I","name":"Komp. Purn. Kopassus Pelita I (Sukatani, Depok)","kind":"military_housing","matra":"AD","matraWhy":"Purnawirawan Kopassus (TNI AD)","bank":null,"lat":-6.39509,"lon":106.88967,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/relation/9694934","notes":"Retiree complex. Pelita II and Kedayutama are adjacent (relations 9682710, 9694912)."},
    {"id":"kopassus-hq","label":"Mako Kopassus Cijantung","name":"Markas Kopassus, Cijantung","kind":"hq_unit","matra":"AD","matraWhy":"Kopassus, Cijantung (TNI AD)","bank":null,"lat":-6.31874,"lon":106.84872,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/912445333","notes":"~7.2 km W."},
    {"id":"halim","label":"Lanud Halim Perdanakusuma","name":"Lanud Halim Perdanakusuma","kind":"hq_unit","matra":"AU","matraWhy":"Lanud Halim Perdanakusuma (TNI AU)","bank":null,"lat":-6.26563,"lon":106.89451,"confidence":"high","tier":2,"source":"https://www.openstreetmap.org/relation/12381950","notes":"Main TNI AU cluster (Koopsudnas, Kodiklatau, Paskhas Wing 1). ~7.4 km NNW."},
    {"id":"rsau-esnawan","label":"RSAU dr. Esnawan Antariksa","name":"RSAU dr. Esnawan Antariksa","kind":"hospital","matra":"AU","matraWhy":"RSAU: rumah sakit TNI AU","bank":null,"lat":-6.25749,"lon":106.89219,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/782995198","notes":null},
    {"id":"al-teluk-tomini","label":"Klaster Teluk Tomini/Amboina","name":"Klaster keluarga TNI AL Teluk Tomini / Teluk Amboina (Ciangsana selatan)","kind":"navy_housing","matra":"AL","matraWhy":"Jalan bernama teluk dan sekolah Hang Tuah","bank":null,"lat":-6.36503,"lon":106.95009,"confidence":"medium","tier":2,"source":"https://overpass-api.de (OSM street-name cluster) ; https://rri.co.id/tual/iptek/2628976/kepala-tk-hang-tuah-apresiasi-kunjungan-danlanal-tual-dan-dukungan-tni-al","notes":"Bay-named streets plus SMP Hang Tuah 4 and TK Hang Tuah. Hang Tuah schools run under Yayasan Hang Tuah with TNI AL patronage (RRI). Calling this navy housing is an inference. ~5.6 km SE."},
    {"id":"al-jatibening","label":"Komplek TNI AL Jatibening","name":"Komplek TNI AL Jatibening (Pondok Gede)","kind":"navy_housing","matra":"AL","matraWhy":"Nama \"Komplek Angkatan Laut\"","bank":null,"lat":-6.26757,"lon":106.94683,"confidence":"medium","tier":2,"source":"https://www.trackpacking.com/v/index/4d1f03b6d7b0b1f733ab099f ; https://www.rumah123.com/venue/al-jatibening-vcm20873/","notes":"Foursquare 'Komplek Angkatan Laut'. OSM shows island-named streets (Jawa, Bintan, Tarakan, Talaud, Tidore) and Jl. Ikan Paus. Kel. Jatibening, Pondok Gede 17412. ~7.8 km NNE."},
    {"id":"al-duren-sawit","label":"Kav. TNI AL Duren Sawit","name":"Kav. TNI AL Duren Sawit","kind":"navy_housing","matra":"AL","matraWhy":"Nama \"Kav. TNI AL\"","bank":null,"lat":-6.23753,"lon":106.9128,"confidence":"medium","tier":2,"source":"https://overpass-api.de (OSM 'Selat'/'Laut' street cluster, 121 segments) ; https://m.beritajakarta.id/en/read/12942/New%20Crossing%20Constructed%20on%20Jalan%20Selat%20Sulawesi","notes":"Property listings call the area 'Kav TNI AL Duren Sawit' (e.g. Jl. Selat Raas). ~10.2 km N."},
    {"id":"marinir-pondok-kelapa","label":"Komplek Marinir Pondok Kelapa","name":"Komplek Marinir Pondok Kelapa","kind":"navy_housing","matra":"AL","matraWhy":"Marinir (Korps Marinir TNI AL)","bank":null,"lat":-6.23582,"lon":106.92535,"confidence":"medium","tier":2,"source":"https://www.brighton.co.id/cari-properti/view/rumah-luas-550m-di-komplek-marinir-pondok-kelapa","notes":"OSM has Jl. Marinir Barat/Tengah/Timur. ~10.4 km N."},
    {"id":"al-rawa-bambu","label":"Komplek TNI AL Rawa Bambu","name":"Komplek TNI AL Rawa Bambu (Pasar Minggu)","kind":"navy_housing","matra":"AL","matraWhy":"Nama \"Komp. TNI AL\" di OSM","bank":null,"lat":-6.29983,"lon":106.83835,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/node/6133839293","notes":"OSM has a node 'Portal Komp. TNI AL Rawa Bambu' and ~36 'Teluk ...' street segments. ~8.9 km W."},
    {"id":"al-pangkalan-jati","label":"Komplek TNI AL Pangkalan Jati","name":"Komplek TNI AL Pangkalan Jati (Cinere / Pondok Labu)","kind":"navy_housing","matra":"AL","matraWhy":"Nama kompleks \"TNI AL\" dan Balkesmas TNI AL","bank":null,"lat":-6.31419,"lon":106.78369,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/316474659","notes":"Balai Kesehatan Masyarakat TNI AL Pangkalan Jati and TK Hang Tuah 11. Dislitbang TNI AL is adjacent. ~14.4 km W."},
    {"id":"al-kebon-pala","label":"Komplek AL Kebon Pala","name":"Komplek AL dekat Kebon Pala (Makasar)","kind":"navy_housing","matra":"AL","matraWhy":"Hanya nama OSM \"Kompleks AL\" (bukti lemah)","bank":null,"lat":-6.2574,"lon":106.8747,"confidence":"low","tier":3,"source":"https://www.openstreetmap.org/way/155956793","notes":"The only evidence is an OSM feature named 'Lapangan Tennis Kompleks AL'."},
    {"id":"al-pramuka","label":"Komplek TNI AL Pramuka","name":"Komplek TNI AL Pramuka (Utan Kayu / Rawamangun)","kind":"navy_housing","matra":"AL","matraWhy":"Nama kompleks \"TNI AL\"","bank":null,"lat":-6.19115,"lon":106.87122,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1075721006","notes":"Foursquare 'Aula Komplek TNI AL Pramuka' at -6.19076,106.87145. ~16 km NNW."},
    {"id":"al-kodamar","label":"Komplek TNI AL Kodamar","name":"Komplek TNI AL Kodamar (Kelapa Gading)","kind":"navy_housing","matra":"AL","matraWhy":"Nama kompleks \"TNI AL\"","bank":null,"lat":-6.16832,"lon":106.88615,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/128879786","notes":"~18 km N."},
    {"id":"al-seskoal","label":"Perumahan AL sekitar Seskoal","name":"Perumahan TNI AL sekitar Seskoal (Cipulir, Kebayoran Lama)","kind":"navy_housing","matra":"AL","matraWhy":"Jalan bernama laut di sekitar Seskoal (TNI AL)","bank":null,"lat":-6.24004,"lon":106.77326,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/397146468","notes":"'Laut'/'Selat' streets plus SDS Hang Tuah 4, SMP Hang Tuah 2, SMA Hang Tuah 1 and TK Hang Tuah 7 around Seskoal. ~18 km WNW."},
    {"id":"al-jala-graha","label":"Perum TNI AL Jala Graha Prima","name":"Perumahan TNI AL Jala Graha Prima (Cileungsi / Jonggol)","kind":"navy_housing","matra":"AL","matraWhy":"Nama perumahan \"TNI AL\"","bank":null,"lat":-6.44585,"lon":107.06585,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1479081562","notes":"SD Plus Hang Tuah 2 Jonggol is adjacent. ~21 km SE."},
    {"id":"al-dewa-ruci","label":"Perum TNI AL Dewa Ruci","name":"Perumahan TNI AL Dewa Ruci dan Dewa Kembar (Cilincing)","kind":"navy_housing","matra":"AL","matraWhy":"Nama perumahan \"TNI AL\"","bank":null,"lat":-6.1117,"lon":106.92218,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1444836013","notes":"~24 km N, outside the 20 km ring."},
    {"id":"rusun-marunda","label":"Rusun TNI AL Marunda","name":"Rusun TNI AL Marunda","kind":"navy_housing","matra":"AL","matraWhy":"Nama rusun \"TNI AL\"","bank":null,"lat":-6.11828,"lon":106.95445,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/154835958","notes":"~24 km N."},
    {"id":"rsal-mintohardjo","label":"RSAL Dr. Mintohardjo","name":"RSAL Dr. Mintohardjo","kind":"hospital","matra":"AL","matraWhy":"RSAL: rumah sakit TNI AL","bank":null,"lat":-6.21087,"lon":106.81083,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/155115832","notes":"Navy hospital in Bendungan Hilir. RSGM Ladokgi TNI AL is adjacent. ~17 km NW."},
    {"id":"rs-marinir","label":"RS Marinir Cilandak","name":"RS Marinir Cilandak","kind":"hospital","matra":"AL","matraWhy":"Rumah sakit Marinir (TNI AL)","bank":null,"lat":-6.30483,"lon":106.81049,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/510968265","notes":null},
    {"id":"kormar-cilandak","label":"Kesatrian Marinir Cilandak","name":"Korps Marinir, Kesatrian Cilandak","kind":"hq_unit","matra":"AL","matraWhy":"Korps Marinir (TNI AL)","bank":null,"lat":-6.30121,"lon":106.81062,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/1064222853","notes":"~11.8 km W. Denjaka rusun is on Jl. Cilandak KKO (industry.co.id, Jan 2022)."},
    {"id":"mako-kormar","label":"Mako Korps Marinir","name":"Mako Korps Marinir (Kwitang)","kind":"hq_unit","matra":"AL","matraWhy":"Mako Korps Marinir (TNI AL)","bank":null,"lat":-6.18023,"lon":106.8367,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1426002423","notes":null},
    {"id":"seskoal","label":"Seskoal","name":"Seskoal (Sekolah Staf dan Komando TNI AL)","kind":"hq_unit","matra":"AL","matraWhy":"Sekolah Staf dan Komando TNI AL","bank":null,"lat":-6.24123,"lon":106.77446,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/397146468","notes":null},
    {"id":"pushidrosal","label":"Pushidrosal","name":"Pushidrosal (Pusat Hidrografi dan Oseanografi TNI AL), Ancol","kind":"hq_unit","matra":"AL","matraWhy":"Pusat Hidrografi TNI AL","bank":null,"lat":-6.12342,"lon":106.84585,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/12019686930","notes":"A second OSM 'Pushidrosal' node is at -6.10945,106.88368."},
    {"id":"kodaeral-3","label":"Kodaeral III (eks Lantamal III)","name":"Lantamal III (Pangkalan Utama TNI AL III)","kind":"hq_unit","matra":"AL","matraWhy":"Kodaeral III (eks Lantamal III) TNI AL","bank":null,"lat":-6.13319,"lon":106.83312,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/489926330","notes":"OSM has a second polygon with the same name at -6.16256,106.88812 (Sunter / Kodamar)."},
    {"id":"kolinlamil","label":"Kolinlamil","name":"Kolinlamil (Komando Lintas Laut Militer), Tanjung Priok","kind":"hq_unit","matra":"AL","matraWhy":"Kolinlamil (TNI AL)","bank":null,"lat":-6.10649,"lon":106.89196,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/850698170","notes":null},
    {"id":"koarmada-1","label":"Koarmada I Pondok Dayung","name":"Koarmada I Pondok Dayung","kind":"hq_unit","matra":"AL","matraWhy":"Koarmada I (TNI AL)","bank":null,"lat":-6.09362,"lon":106.87529,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/850698166","notes":"Naval base and pier area as named in OSM."},
    {"id":"puspomal","label":"Puspomal","name":"Puspomal (Pusat Polisi Militer AL)","kind":"hq_unit","matra":"AL","matraWhy":"Polisi Militer TNI AL","bank":null,"lat":-6.16705,"lon":106.88731,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1173424262","notes":null},
    {"id":"inkopal","label":"Inkopal","name":"Inkopal (Induk Koperasi TNI AL), Kelapa Gading","kind":"koperasi","matra":"AL","matraWhy":"Induk Koperasi TNI AL","bank":null,"lat":-6.15526,"lon":106.89534,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/121919381","notes":"Ruko Inkopal is adjacent. A natural partner for koperasi Giro and payroll."},
    {"id":"pasmar-1","label":"Pasmar 1 Marunda","name":"Pasmar 1 (Pasukan Marinir 1), Marunda","kind":"hq_unit","matra":"AL","matraWhy":"Pasukan Marinir 1 (TNI AL)","bank":null,"lat":-6.11595,"lon":106.95086,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/491746195","notes":null},
    {"id":"kowal","label":"Kesatrian Kowal","name":"Kesatrian Kowal Cut Nyak Dien","kind":"hq_unit","matra":"AL","matraWhy":"Korps Wanita TNI AL","bank":null,"lat":-6.1942,"lon":106.81274,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/155102257","notes":"Navy women's corps quarters."},
    {"id":"dislitbangal","label":"Dislitbangal Pondok Labu","name":"Dislitbang TNI AL (Pondok Labu)","kind":"hq_unit","matra":"AL","matraWhy":"Dislitbang TNI AL","bank":null,"lat":-6.31371,"lon":106.79054,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/way/1064222852","notes":null},
    {"id":"dislaikmatal-ceger","label":"Satker Mabesal Ceger","name":"Mabes TNI AL satker (Dislaikmatal), Ceger","kind":"hq_unit","matra":"AL","matraWhy":"Satker Mabes TNI AL","bank":null,"lat":-6.32285,"lon":106.89337,"confidence":"low","tier":3,"source":"https://www.trackpacking.com/v/index/509a2befe4b07f27239b9757","notes":"Foursquare pin. Suggests some Mabesal service units sit outside the main complex."},
    {"id":"dispotmar-ciracas","label":"Dispotmar Ciracas","name":"Dispotmar Mabes TNI AL, Ciracas","kind":"hq_unit","matra":"AL","matraWhy":"Dispotmar Mabes TNI AL","bank":null,"lat":-6.33033,"lon":106.87856,"confidence":"low","tier":3,"source":"https://www.trackpacking.com/v/index/5072199ae4b0a1f886b438d2","notes":"Foursquare pin."},
    {"id":"mabesad","label":"Mabes TNI AD (Gambir)","name":"Markas Besar TNI AD (Gambir)","kind":"hq_unit","matra":"AD","matraWhy":"Mabes TNI AD (Gambir)","bank":null,"lat":-6.16959,"lon":106.82886,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/way/857957849 ; https://ppid.tni.mil.id/pages-7-simpul-layanan.html","notes":"Army HQ is not in Cilangkap. It is at Jl. Medan Merdeka Utara No.2, Gambir 10110."},
    {"id":"pasar-auri","label":"Pasar AURI","name":"Pasar AURI (Jatisampurna)","kind":"market","bank":null,"lat":-6.34631,"lon":106.94259,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/258857974","notes":"Candidate Livin' Merchant / QRIS cluster near AU and AL housing."},
    {"id":"cibubur-square","label":"Cibubur Square","name":"Cibubur Square","kind":"other","bank":null,"lat":-6.34029,"lon":106.89022,"confidence":"medium","tier":2,"source":"https://www.openstreetmap.org/way/398229401","notes":"Mall; retail and merchant anchor ~2.6 km SW."},
    {"id":"rs-jatisampurna","label":"RS Jatisampurna","name":"RS Jatisampurna","kind":"hospital","bank":null,"lat":-6.34697,"lon":106.92578,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/2639374228","notes":null},
    {"id":"sds-hang-tuah-7","label":"SDS Plus Hang Tuah 7","name":"SDS Plus Hang Tuah 7 (Ciangsana)","kind":"school","matra":"AL","matraWhy":"Sekolah Yayasan Hang Tuah (keluarga TNI AL)","bank":null,"lat":-6.3554,"lon":106.9505,"confidence":"medium","tier":3,"source":"https://www.openstreetmap.org/node/13438935803","notes":"Navy-family school inside the Ciangsana cluster."},
    {"id":"lrt-ciracas","label":"LRT Ciracas","name":"Stasiun LRT Ciracas","kind":"other","bank":null,"lat":-6.323826,"lon":106.886606,"confidence":"high","tier":2,"source":"https://www.wikidata.org/wiki/Q19726743","notes":"Nearest rail transit, ~3 km W."},
    {"id":"tol-jatiwarna-2","label":"GT Jatiwarna 2","name":"Gerbang Tol Jatiwarna 2 (JORR)","kind":"other","bank":null,"lat":-6.31137,"lon":106.92169,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/node/359302588","notes":"Toll access ~2 km N. Gerbang Tol Setu is at -6.31222,106.91038."},
    {"id":"tol-bambu-apus-1","label":"GT Bambu Apus 1","name":"Gerbang Tol Bambu Apus 1 (JORR)","kind":"other","bank":null,"lat":-6.31021,"lon":106.90092,"confidence":"high","tier":3,"source":"https://www.openstreetmap.org/node/309511905","notes":null}
  ];

  // Site labels stay in Indonesian (COPY_STYLE_EN item 19). The English display table of 12 Oct 2026
  // ("North gate", "Navy housing near Seskoal", "(approx.)") was removed on 16 Oct 2026.

  ref.siteById = {};
  ref.sites.forEach(function (s) { ref.siteById[s.id] = s; });
  ref.homeSite = ref.siteById['mdr-cilangkap'];

  // Legend groups (§E.11): Mandiri, Pesaing, Markas/Satker, Gerbang, Perumahan, Lainnya.
  ref.siteKinds = {
    mandiri_branch: { group: 'mandiri', label: 'Cabang Mandiri' },
    mandiri_atm: { group: 'mandiri', label: 'ATM Mandiri' },
    competitor_branch: { group: 'competitor', label: 'Bank lain' },
    hq_complex: { group: 'hq', label: 'Markas' },
    hq_navy: { group: 'hq', label: 'Markas TNI AL' },
    hq_airforce: { group: 'hq', label: 'Markas TNI AU' },
    hq_unit: { group: 'hq', label: 'Markas / satker' },
    gate: { group: 'gate', label: 'Gerbang' },
    military_housing: { group: 'housing', label: 'Perumahan TNI' },
    navy_housing: { group: 'housing', label: 'Perumahan TNI AL' },
    hospital: { group: 'other', label: 'Rumah sakit' },
    school: { group: 'other', label: 'Pendidikan' },
    market: { group: 'other', label: 'Pasar' },
    koperasi: { group: 'other', label: 'Koperasi' },
    other: { group: 'other', label: 'Lainnya' }
  };
  ref.siteGroups = [
    { id: 'mandiri', label: 'Mandiri' }, { id: 'competitor', label: 'Bank lain' }, { id: 'hq', label: 'Markas / satker' },
    { id: 'gate', label: 'Gerbang' }, { id: 'housing', label: 'Perumahan' }, { id: 'other', label: 'Lainnya' }
  ];

  /* ------------------------------------------- pangkalan TNI (COPY_STYLE_EN item 34) */

  // Every TNI-related site carries an explicit `matra` with its evidence in `matraWhy` (name or OSM tag):
  //   AL  = TNI AL, incl. Marinir (anchor) · AD = TNI AD, incl. Kopassus, Kodam, Kostrad, Cijantung (tank)
  //   AU  = TNI AU, incl. Lanud Halim, Dirgantara (wings) · GAB = Mabes TNI / gabungan: Kemhan, Hankam,
  //   Akademi TNI, Asabri and anything unclear (star).
  // The map draws one round badge per pangkalan: filled = markas / satuan (hq_*), outlined = perumahan /
  // asrama (military_housing, navy_housing), a small cross at the corner = rumah sakit (hospital with a matra).
  ref.matra = {
    AL: { id: 'AL', name: 'TNI AL', icon: 'anchor', iconWord: 'Jangkar', note: 'termasuk Marinir' },
    AD: { id: 'AD', name: 'TNI AD', icon: 'tank', iconWord: 'Tank', note: 'termasuk Kopassus dan Kodam' },
    AU: { id: 'AU', name: 'TNI AU', icon: 'wings', iconWord: 'Sayap', note: 'termasuk Lanud Halim' },
    GAB: { id: 'GAB', name: 'Mabes TNI', icon: 'star', iconWord: 'Bintang', note: 'gabungan, termasuk Kemhan dan Akademi TNI' }
  };
  ref.matraOrder = ['AL', 'AD', 'AU', 'GAB'];
  var PANGKALAN_KIND = { hq_complex: 'markas', hq_navy: 'markas', hq_airforce: 'markas', hq_unit: 'markas',
    military_housing: 'perumahan', navy_housing: 'perumahan', hospital: 'rs' };
  ref.pangkalanKinds = { markas: 'Markas', perumahan: 'Perumahan', rs: 'Rumah sakit' };
  /** A best guess from the name for sites without an explicit matra (an imported site list): GAB when unclear. */
  function guessMatra(s) {
    var t = String((s.name || '') + ' ' + (s.label || '')).toLowerCase();
    if (/\b(tni al|angkatan laut|marinir|hang tuah|lantamal|kodaeral|koarmada|rsal|mabesal|kowal)\b|\bal\b/.test(t)) return 'AL';
    if (/\b(tni au|angkatan udara|auri|dirgantara|lanud|rsau|mabesau|halim)\b|\bau\b/.test(t)) return 'AU';
    if (/\b(tni ad|angkatan darat|kodam|kostrad|kopassus|cijantung|mabesad|rspad)\b|\bad\b/.test(t)) return 'AD';
    return 'GAB';
  }
  /**
   * pangkalanOf(site) → {matra, matraName, jenis 'markas'|'perumahan'|'rs', jenisLabel, label "TNI AL · Markas",
   * why, icon} for a TNI site the map draws as a badge, or null (banks, gates, markets, schools …).
   */
  ref.pangkalanOf = function (s) {
    if (!s) return null;
    var jenis = PANGKALAN_KIND[s.kind];
    var own = s.matra || (s.id && ref.siteById && ref.siteById[s.id] && ref.siteById[s.id].matra) || null;
    if (!jenis || (jenis === 'rs' && !own)) return null;          // a civilian hospital is not a pangkalan
    var m = ref.matra[own] ? own : guessMatra(s);
    var why = s.matraWhy || (s.id && ref.siteById && ref.siteById[s.id] && ref.siteById[s.id].matraWhy) || (own ? '' : 'Perkiraan dari nama tempat');
    return { matra: m, matraName: ref.matra[m].name, jenis: jenis, jenisLabel: ref.pangkalanKinds[jenis],
      label: ref.matra[m].name + ' · ' + ref.pangkalanKinds[jenis], why: why, icon: ref.matra[m].icon };
  };

  ref.banks = {
    MANDIRI: 'Mandiri', BJB: 'bjb', BRI: 'BRI', BNI: 'BNI', BSI: 'BSI', BTN: 'BTN',
    KOPERASI: 'koperasi', LAINNYA: 'bank lain', OTHER: 'bank lain'
  };

  /* -------------------------------------------------- F.3.4 satker master */

  // approx: demo placement inside the OSM polygon (tooltip `Lokasi satker perkiraan`).
  // w: §G.2 strength weight for the demo generator. shareTarget/bpg/tukin are SYNTHETIC (demo only).
  function S(id, abbr, name, matra, parent, lat, lon, shareTarget, bpg, tukin, w, inComplex) {
    return { id: id, abbr: abbr, name: name, matra: matra, parent: parent, lat: lat, lon: lon,
      approx: inComplex, inComplex: inComplex, shareTarget: shareTarget, bpg: bpg.split(','), tukin: tukin, w: w };
  }
  ref.satker = [
    S('denma-mabesal', 'Denma Mabesal', 'Detasemen Markas Mabesal', 'AL', 'Mabesal', -6.33180, 106.91050, 0.72, 'MANDIRI,BSI,BRI', 'MANDIRI', 560, true),
    S('diskual', 'Diskual', 'Dinas Keuangan TNI AL', 'AL', 'Mabesal', -6.33090, 106.91120, 0.86, 'MANDIRI,BSI', 'MANDIRI', 110, true),
    S('spersal', 'Spersal', 'Staf Personalia TNI AL', 'AL', 'Mabesal', -6.33020, 106.91010, 0.64, 'MANDIRI,BSI,BNI', 'MANDIRI', 130, true),
    S('srenal', 'Srenal', 'Staf Perencanaan & Anggaran TNI AL', 'AL', 'Mabesal', -6.32970, 106.91090, 0.58, 'MANDIRI,BSI,BNI', 'MANDIRI', 90, true),
    S('sopsal', 'Sopsal', 'Staf Operasi TNI AL', 'AL', 'Mabesal', -6.33230, 106.91180, 0.61, 'MANDIRI,BSI,BRI', 'MANDIRI', 120, true),
    S('slogal', 'Slogal', 'Staf Logistik TNI AL', 'AL', 'Mabesal', -6.33280, 106.91080, 0.55, 'MANDIRI,BSI,BRI', 'BJB', 115, true),
    S('spamal', 'Spamal', 'Staf Pengamanan TNI AL', 'AL', 'Mabesal', -6.33350, 106.90990, 0.49, 'MANDIRI,BSI,BNI', 'MANDIRI', 80, true),
    S('itjenal', 'Itjenal', 'Inspektorat Jenderal TNI AL', 'AL', 'Mabesal', -6.32910, 106.91160, 0.66, 'MANDIRI,BSI', 'MANDIRI', 70, true),
    S('dispenal', 'Dispenal', 'Dinas Penerangan TNI AL', 'AL', 'Mabesal', -6.33060, 106.91240, 0.70, 'MANDIRI,BSI', 'MANDIRI', 60, true),
    S('disinfolahtal', 'Disinfolahtal', 'Dinas Informasi & Pengolahan Data TNI AL', 'AL', 'Mabesal', -6.33140, 106.91310, 0.52, 'MANDIRI,BSI,BNI', 'BJB', 105, true),
    S('disminpersal', 'Disminpersal', 'Dinas Administrasi Personel TNI AL', 'AL', 'Mabesal', -6.32990, 106.90930, 0.68, 'MANDIRI,BSI,BRI', 'MANDIRI', 125, true),
    S('diskomlekal', 'Diskomlekal', 'Dinas Komunikasi & Elektronika TNI AL', 'AL', 'Mabesal', -6.33260, 106.90920, 0.44, 'MANDIRI,BSI,BNI', 'BJB', 150, true),
    S('disopslatal', 'Disopslatal', 'Dinas Operasi & Latihan TNI AL', 'AL', 'Mabesal', -6.33400, 106.91120, 0.47, 'MANDIRI,BSI,BRI', 'MANDIRI', 95, true),
    S('dissenlekal', 'Dissenlekal', 'Dinas Senjata & Elektronika TNI AL', 'AL', 'Mabesal', -6.33450, 106.91210, 0.51, 'MANDIRI,BSI,BNI', 'MANDIRI', 130, true),
    S('disfaslanal', 'Disfaslanal', 'Dinas Fasilitas Pangkalan TNI AL', 'AL', 'Mabesal', -6.32820, 106.91070, 0.57, 'MANDIRI,BSI,BRI', 'MANDIRI', 115, true),
    S('puslaikmatlamjaal', 'Puslaikmatlamjaal', 'Pusat Kelaikan Matra Laut, K3 & Kerja Sama AL', 'AL', 'Mabesal', -6.32770, 106.91180, 0.38, 'MANDIRI,BSI,BNI', 'BJB', 85, true),
    S('puspomal', 'Puspomal', 'Pusat Polisi Militer TNI AL (Kelapa Gading)', 'AL', 'Mabesal', -6.16705, 106.88731, 0.31, 'MANDIRI,BSI,BRI', 'BRI', 210, false),
    S('pusku-tni', 'Pusku TNI', 'Pusat Keuangan TNI', 'TNI', 'Mabes TNI', -6.32870, 106.91310, 0.62, 'MANDIRI,BSI,BNI', 'MANDIRI', 80, true),
    S('puspen-tni', 'Puspen TNI', 'Pusat Penerangan TNI', 'TNI', 'Mabes TNI', -6.32760, 106.91380, 0.54, 'MANDIRI,BSI,BNI', 'MANDIRI', 75, true),
    S('pusinfolahta-tni', 'Pusinfolahta TNI', 'Pusat Informasi & Pengolahan Data TNI', 'TNI', 'Mabes TNI', -6.32680, 106.91290, 0.46, 'MANDIRI,BSI,BNI', 'BNI', 95, true),
    S('pusdalops-tni', 'Pusdalops TNI', 'Pusat Pengendalian Operasi TNI', 'TNI', 'Mabes TNI', -6.32550, 106.91330, 0.41, 'MANDIRI,BSI,BNI', 'BJB', 70, true),
    S('denma-mabes-tni', 'Denma Mabes TNI', 'Detasemen Markas Mabes TNI', 'TNI', 'Mabes TNI', -6.32480, 106.91280, 0.59, 'MANDIRI,BSI,BNI', 'MANDIRI', 410, true),
    S('koopsus-tni', 'Koopsus TNI', 'Komando Operasi Khusus TNI', 'TNI', 'Mabes TNI', -6.33520, 106.91430, 0.28, 'MANDIRI,BSI,BNI', 'BNI', 190, true),
    S('akademi-tni', 'Akademi TNI', 'Mako Akademi TNI', 'TNI', 'Mabes TNI', -6.33168, 106.91578, 0.36, 'MANDIRI,BSI,BRI', 'MANDIRI', 130, true),
    S('denma-mabesau', 'Denma Mabesau', 'Detasemen Markas Mabes TNI AU', 'AU', 'Mabesau', -6.32860, 106.91680, 0.42, 'MANDIRI,BSI,BNI', 'BJB', 320, true),
    S('staf-mabesau', 'Staf Mabesau', 'Staf & Dinas Mabes TNI AU (gabungan)', 'AU', 'Mabesau', -6.32950, 106.91550, 0.37, 'MANDIRI,BSI,BNI', 'BJB', 260, true),
    S('pusterad', 'Pusterad', 'Pusat Teritorial Angkatan Darat', 'AD', 'Mabesad', -6.32419, 106.90472, 0.22, 'MANDIRI,BNI,BSI', 'BNI', 150, false)
  ];
  ref.satkerById = {};
  ref.satker.forEach(function (s) { ref.satkerById[s.id] = s; });

  /**
   * Strict satker key (§F.3.4): lower-case, no diacritics, punctuation → space, the words
   * 'tni', 'al' and the phrase 'angkatan laut' removed, then spaces removed.
   * 'Disku AL' → 'disku'; 'Dinas Keuangan TNI AL' → 'dinaskeuangan'; 'Denma Mabesal' → 'denmamabesal'.
   */
  ref.normSatker = function (s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    t = ' ' + t.replace(/[^a-z0-9]+/g, ' ') + ' ';
    t = t.replace(/ angkatan laut /g, ' ').replace(/ (tni|al) /g, ' ').replace(/ (tni|al) /g, ' ');
    return t.replace(/\s+/g, '');
  };
  function looseKey(s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t.replace(/[^a-z0-9]+/g, '');
  }

  var ALIASES = [
    ['denma-mabesal', ['Denma Mabesal', 'Detasemen Markas Mabesal', 'Detasemen Markas Mabes TNI AL']],
    ['diskual', ['Diskual', 'Disku AL', 'Dinas Keuangan TNI AL', 'Dinas Keuangan Angkatan Laut', 'Kuwil Mabesal', 'Keuangan Wilayah Mabesal']],
    ['spersal', ['Spersal', 'Staf Personalia TNI AL', 'Staf Personel TNI AL']],
    ['srenal', ['Srenal', 'Staf Perencanaan dan Anggaran TNI AL', 'Staf Perencanaan & Anggaran TNI AL']],
    ['sopsal', ['Sopsal', 'Staf Operasi TNI AL']],
    ['slogal', ['Slogal', 'Staf Logistik TNI AL']],
    ['spamal', ['Spamal', 'Staf Pengamanan TNI AL']],
    ['itjenal', ['Itjenal', 'Inspektorat Jenderal TNI AL', 'Irjenal']],
    ['dispenal', ['Dispenal', 'Dinas Penerangan TNI AL']],
    ['disinfolahtal', ['Disinfolahtal', 'Dinas Informasi dan Pengolahan Data TNI AL']],
    ['disminpersal', ['Disminpersal', 'Dinas Administrasi Personel TNI AL']],
    ['diskomlekal', ['Diskomlekal', 'Dinas Komunikasi dan Elektronika TNI AL']],
    ['disopslatal', ['Disopslatal', 'Dinas Operasi dan Latihan TNI AL']],
    ['dissenlekal', ['Dissenlekal', 'Dinas Senjata dan Elektronika TNI AL']],
    ['disfaslanal', ['Disfaslanal', 'Dinas Fasilitas Pangkalan TNI AL']],
    ['puslaikmatlamjaal', ['Puslaikmatlamjaal', 'Pusat Kelaikan Matra Laut, Keselamatan Kerja dan Kerja Sama AL']],
    ['puspomal', ['Puspomal', 'Pusat Polisi Militer TNI AL', 'Pusat Polisi Militer Angkatan Laut', 'Pomal']],
    ['pusku-tni', ['Pusku TNI', 'Pusku', 'Puskeu TNI', 'Pusat Keuangan TNI']],
    ['puspen-tni', ['Puspen TNI', 'Pusat Penerangan TNI']],
    ['pusinfolahta-tni', ['Pusinfolahta TNI', 'Pusat Informasi dan Pengolahan Data TNI']],
    ['pusdalops-tni', ['Pusdalops TNI', 'Pusat Pengendalian Operasi TNI']],
    ['denma-mabes-tni', ['Denma Mabes TNI', 'Detasemen Markas Mabes TNI']],
    ['koopsus-tni', ['Koopsus TNI', 'Koopsus', 'Koopssus TNI', 'Komando Operasi Khusus TNI']],
    ['akademi-tni', ['Akademi TNI', 'Mako Akademi TNI', 'Makoakademi', 'Mako Akademi']],
    ['denma-mabesau', ['Denma Mabesau', 'Detasemen Markas Mabesau', 'Detasemen Markas Mabes TNI AU']],
    ['staf-mabesau', ['Staf Mabesau', 'Staf dan Dinas Mabes TNI AU', 'Mabesau', 'Mabes TNI AU', 'Mabes AU']],
    ['pusterad', ['Pusterad', 'Pusat Teritorial Angkatan Darat', 'Pusterad TNI AD']]
  ];
  // Known values that must not auto-map (null + importer warning).
  var UNMAPPED = [
    [['Lantamal III', 'Lantamal 3', 'Kodaeral III', 'Kodaeral 3'], 'Kodaeral III (eks Lantamal III) bukan satker dalam daftar Cilangkap'],
    [['Mabesal', 'Mabes TNI AL', 'Mabes AL', 'Mabes TNI'], 'Satker induk terlalu umum. Pilih satker yang lebih spesifik.'],
    [['Mabesad', 'Mabes TNI AD', 'Mabes AD'], 'Mabes TNI AD (Gambir) tidak ada dalam daftar satker. Gunakan Pusterad jika sesuai.']
  ];

  ref.satkerAlias = {};       // strict or loose key → satker id | null
  ref.satkerAliasNote = {};   // key → warning text for values that map to null (or with a caveat)
  function addAlias(raw, id, note) {
    [ref.normSatker(raw), looseKey(raw)].forEach(function (k) {
      if (!k) return;
      if (Object.prototype.hasOwnProperty.call(ref.satkerAlias, k) && ref.satkerAlias[k] !== id) return; // first wins
      ref.satkerAlias[k] = id;
      if (note) ref.satkerAliasNote[k] = note;
    });
  }
  ref.satker.forEach(function (s) { addAlias(s.id, s.id); addAlias(s.abbr, s.id); addAlias(s.name, s.id); });
  ALIASES.forEach(function (a) { a[1].forEach(function (raw) { addAlias(raw, a[0]); }); });
  addAlias('Kuwil Mabesal', 'diskual', 'Kuwil Mabesal adalah juru bayar di bawah Diskual');
  UNMAPPED.forEach(function (u) { u[0].forEach(function (raw) { addAlias(raw, null, u[1]); }); });

  /**
   * resolveSatker(raw) → {id: string|null, note: string|null, known: boolean}.
   * known=false means the value is not in the alias table (importer offers the mapping dropdown).
   */
  ref.resolveSatker = function (raw) {
    if (raw == null || String(raw).trim() === '') return { id: null, note: null, known: false };
    var s = String(raw).trim();
    if (ref.satkerById[s]) return { id: s, note: null, known: true };
    var keys = [ref.normSatker(s), looseKey(s)];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k && Object.prototype.hasOwnProperty.call(ref.satkerAlias, k)) {
        return { id: ref.satkerAlias[k], note: ref.satkerAliasNote[k] || null, known: true };
      }
    }
    return { id: null, note: null, known: false };
  };

  /* ---------------------------------------------------- F.3.5 competitors */

  // Public facts with dates; display data only (Business › Payroll, Pesaing di Mabes).
  // code is the payroll-bank enum used in data (BJB/BSI/BNI/BRI/BTN/OTHER).
  ref.competitors = [
    {"bank":"bank bjb","code":"BJB","counterpart":"Mabes TNI (Pusku)","date":"2026-04-09","dateLabel":"9 Apr 2026","scope":"KGB, KGB Ekstra, KPPB, KPR, UMKM, giro/tabungan, DPLK; diperluas ke P3K","source":"https://finance.detik.com/berita-ekonomi-bisnis/d-8437284/bank-bjb-perpanjang-kemitraan-strategis-dengan-mabes-tni ; https://www.metrotvnews.com/read/NLMC8lD5-kolaborasi-berlanjut-bank-bjb-perpanjang-kemitraan-strategis-dengan-mabes-tni"},
    {"bank":"bank bjb","code":"BJB","counterpart":"TNI AL (Diskual)","date":"2025-12-30","dateLabel":"30 Des 2025","scope":"kredit personel aktif dan pra-pensiun, KPR, UMKM, giro, tabungan, DPLK","source":"https://ekonomi.republika.co.id/berita/t8dv32472/bank-bjb-dan-tni-al-lanjutkan-kolaborasi-penguatan-layanan-keuangan ; https://rmol.id/bisnis/read/2023/11/09/596518/perkuat-sinergi-bank-bjb-dan-tni-al-teken-perjanjian-kerja-sama"},
    {"bank":"bank bjb","code":"BJB","counterpart":"TNI AU / satuan Lanud","date":"2026-05-25","dateLabel":"14 Jan 2026 / 25 Mei 2026","scope":"payroll tukin melalui Tandamata (Lanud Husein: 441 personel)","source":"https://rmol.id/bisnis/read/2025/10/17/683567/bank-bjb-tni-ad-kolaborasi-perkuat-akses-keuangan-prajurit ; https://ekonomi.republika.co.id/berita/tftzj7472/bank-bjb-tingkatkan-layanan-perbankan-melalui-kerja-sama-dengan-lanud-husein-sastranegara"},
    {"bank":"BSI","code":"BSI","counterpart":"TNI AL (Diskual)","date":"2023-01-19","dateLabel":"19 Jan 2023","scope":"dana APBN non-gaji, payroll, CMS, giro online","source":"https://keuangan.kontan.co.id/news/bsi-bersinergi-dengan-tni-al-untuk-perkuat-inklusi-keuangan-syariah ; https://keuangan.kontan.co.id/news/jalin-kerja-sama-bsi-kelola-dana-apbn-non-gaji-tni-al"},
    {"bank":"BSI","code":"BSI","counterpart":"Mabes TNI","date":"2023-11-17","dateLabel":"17 Nov 2023","scope":"bank payroll alternatif untuk gaji dan tukin","source":"https://keuangan.kontan.co.id/news/bsi-bersinergi-dengan-tni-al-untuk-perkuat-inklusi-keuangan-syariah ; https://keuangan.kontan.co.id/news/jalin-kerja-sama-bsi-kelola-dana-apbn-non-gaji-tni-al"},
    {"bank":"BNI","code":"BNI","counterpart":"Mabes TNI","date":"2024-03-26","dateLabel":"26 Mar 2024","scope":"MoU pengelolaan keuangan Mabes TNI, AD, AL, AU","source":"https://www.bni.co.id/en-us/home/bni-news/news/articleid/23759"},
    {"bank":"BNI","code":"BNI","counterpart":"TNI AD","date":"2024-04-30","dateLabel":"30 Apr 2024","scope":"bank penyalur gaji","source":"https://bni.co.id/en-us/home/bni-news/news/articleid/21544 ; https://infobanknews.com/bni-hadirkan-layanan-keuangan-terintegrasi-di-lingkungan-tni-ad/ ; https://www.medcom.id/properti/news-properti/5b2wwydk-rumah-untuk-tni-ad-bakal-dibangun-februari"},
    {"bank":"BRI","code":"BRI","counterpart":"TNI AL (Diskual)","date":"2018-06-29","dateLabel":"29 Jun 2018","scope":"payroll Britama + asuransi PA gratis, BRIGUNA, KPR, KKB (status belum diketahui)","source":"https://www.industry.co.id/read/37079/bri-siapkan-layanan-menyeluruh-bagi-satuan-tni-angkatan-laut ; https://www.industry.co.id/read/35582/bri-garap-layanan-perbankan-mabes-tni"},
    {"bank":"Artha Graha","code":"OTHER","counterpart":"Mabes TNI (Pusku)","date":"2026-04-09","dateLabel":"9 Apr 2026","scope":"PKS layanan perbankan","source":"https://www.arthagraha.com/en/blog/post/perkokoh-sinergi-nasional-bank-artha-graha-internasional-jadi-mitra-strategis-perbankan-tni"},
    {"bank":"Bank Woori Saudara","code":"OTHER","counterpart":"Mabes TNI","date":"2026-04-21","dateLabel":"21 Apr 2026","scope":"perpanjangan kerja sama, pembiayaan personel","source":"https://keuangan.kontan.co.id/news/perkuat-layanan-perbankan-segmen-institusi-bws-perpanjang-kerjasama-dengan-tni"},
    {"bank":"BTN","code":"BTN","counterpart":"TNI AD / Kemhan","date":"2026-09-21","dateLabel":"21 Sep 2026 (penjajakan)","scope":"KPR TWP AD; pembahasan perumahan dengan Sekjen Kemhan","source":"https://ekonomi.bisnis.com/read/20210416/47/1382304/bank-btn-dukung-pembiayaan-perumahan-anggota-tni-ad"}
  ];
  ref.competitorsFooter = 'Tidak ditemukan PKS publik Mandiri–Mabes TNI/Diskual 2023–2026 (cek internal).';

  /* ------------------------------------------------ F.3.6 ranks and BUP */

  ref.rankGroups = [
    { code: 'TAMTAMA', label: 'Tamtama', hash: 'TAM', military: true },
    { code: 'BINTARA', label: 'Bintara', hash: 'BIN', military: true },
    { code: 'PAMA', label: 'Pama', full: 'Perwira Pertama', hash: 'PAMA', military: true },
    { code: 'PAMEN', label: 'Pamen', full: 'Perwira Menengah', hash: 'PAMEN', military: true },
    { code: 'PATI', label: 'Pati', full: 'Perwira Tinggi', hash: 'PATI', military: true },
    { code: 'PNS', label: 'PNS', full: 'PNS / ASN di lingkungan TNI', hash: 'PNS', military: false }
  ];

  // {code, label, short, abbr[] (lower-case match phrases), group, matra[], order, patiStars?, pnsGol?}
  var ALL3 = ['AL', 'AU', 'AD'];
  function K(code, label, short, abbr, group, matra, order, extra) {
    var o = { code: code, label: label, short: short, abbr: abbr, group: group, matra: matra, order: order };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  ref.ranks = [
    K('KLD', 'Kelasi Dua', 'Kld', ['kld', 'kelasi dua'], 'TAMTAMA', ['AL'], 1),
    K('KLS', 'Kelasi Satu', 'Kls', ['kls', 'kelasi satu'], 'TAMTAMA', ['AL'], 2),
    K('KLK', 'Kelasi Kepala', 'Klk', ['klk', 'kelasi kepala'], 'TAMTAMA', ['AL'], 3),
    K('PRADA', 'Prajurit Dua', 'Prada', ['prada', 'prajurit dua'], 'TAMTAMA', ['AD', 'AU', 'AL'], 1),
    K('PRATU', 'Prajurit Satu', 'Pratu', ['pratu', 'prajurit satu'], 'TAMTAMA', ['AD', 'AU', 'AL'], 2),
    K('PRAKA', 'Prajurit Kepala', 'Praka', ['praka', 'prajurit kepala'], 'TAMTAMA', ['AD', 'AU', 'AL'], 3),
    K('KOPDA', 'Kopral Dua', 'Kopda', ['kopda', 'kopral dua'], 'TAMTAMA', ALL3, 4),
    K('KOPTU', 'Kopral Satu', 'Koptu', ['koptu', 'kopral satu'], 'TAMTAMA', ALL3, 5),
    K('KOPKA', 'Kopral Kepala', 'Kopka', ['kopka', 'kopral kepala'], 'TAMTAMA', ALL3, 6),
    K('SERDA', 'Sersan Dua', 'Serda', ['serda', 'sersan dua'], 'BINTARA', ALL3, 7),
    K('SERTU', 'Sersan Satu', 'Sertu', ['sertu', 'sersan satu'], 'BINTARA', ALL3, 8),
    K('SERKA', 'Sersan Kepala', 'Serka', ['serka', 'sersan kepala'], 'BINTARA', ALL3, 9),
    K('SERMA', 'Sersan Mayor', 'Serma', ['serma', 'sersan mayor'], 'BINTARA', ALL3, 10),
    K('PELDA', 'Pembantu Letnan Dua', 'Pelda', ['pelda', 'pembantu letnan dua'], 'BINTARA', ALL3, 11),
    K('PELTU', 'Pembantu Letnan Satu', 'Peltu', ['peltu', 'pembantu letnan satu'], 'BINTARA', ALL3, 12),
    K('LETDA', 'Letnan Dua', 'Letda', ['letda', 'letnan dua'], 'PAMA', ALL3, 13),
    K('LETTU', 'Letnan Satu', 'Lettu', ['lettu', 'letnan satu'], 'PAMA', ALL3, 14),
    K('KAPTEN', 'Kapten', 'Kapten', ['kapten', 'kapt'], 'PAMA', ALL3, 15),
    K('MAYOR', 'Mayor', 'Mayor', ['mayor', 'may'], 'PAMEN', ALL3, 16),
    K('LETKOL', 'Letnan Kolonel', 'Letkol', ['letkol', 'letnan kolonel'], 'PAMEN', ALL3, 17),
    K('KOLONEL', 'Kolonel', 'Kolonel', ['kolonel', 'kol'], 'PAMEN', ALL3, 18),
    K('LAKSMA', 'Laksamana Pertama', 'Laksma', ['laksma', 'laksamana pertama'], 'PATI', ['AL'], 19, { patiStars: 1 }),
    K('LAKSDA', 'Laksamana Muda', 'Laksda', ['laksda', 'laksamana muda'], 'PATI', ['AL'], 20, { patiStars: 2 }),
    K('LAKSDYA', 'Laksamana Madya', 'Laksdya', ['laksdya', 'laksamana madya'], 'PATI', ['AL'], 21, { patiStars: 3 }),
    K('LAKSAMANA', 'Laksamana', 'Laksamana', ['laksamana'], 'PATI', ['AL'], 22, { patiStars: 4 }),
    K('MARSMA', 'Marsekal Pertama', 'Marsma', ['marsma', 'marsekal pertama'], 'PATI', ['AU'], 19, { patiStars: 1 }),
    K('MARSDA', 'Marsekal Muda', 'Marsda', ['marsda', 'marsekal muda'], 'PATI', ['AU'], 20, { patiStars: 2 }),
    K('MARSDYA', 'Marsekal Madya', 'Marsdya', ['marsdya', 'marsekal madya'], 'PATI', ['AU'], 21, { patiStars: 3 }),
    K('MARSEKAL', 'Marsekal', 'Marsekal', ['marsekal'], 'PATI', ['AU'], 22, { patiStars: 4 }),
    K('BRIGJEN', 'Brigadir Jenderal', 'Brigjen', ['brigjen', 'brigadir jenderal'], 'PATI', ['AD', 'AL'], 19, { patiStars: 1 }),
    K('MAYJEN', 'Mayor Jenderal', 'Mayjen', ['mayjen', 'mayor jenderal'], 'PATI', ['AD', 'AL'], 20, { patiStars: 2 }),
    K('LETJEN', 'Letnan Jenderal', 'Letjen', ['letjen', 'letnan jenderal'], 'PATI', ['AD', 'AL'], 21, { patiStars: 3 }),
    K('JENDERAL', 'Jenderal', 'Jenderal', ['jenderal'], 'PATI', ['AD', 'AL'], 22, { patiStars: 4 })
  ];
  // PNS golongan (PP 11/2017 names) and P3K
  var GOL = {
    I: ['Juru Muda', 'Juru Muda Tingkat I', 'Juru', 'Juru Tingkat I'],
    II: ['Pengatur Muda', 'Pengatur Muda Tingkat I', 'Pengatur', 'Pengatur Tingkat I'],
    III: ['Penata Muda', 'Penata Muda Tingkat I', 'Penata', 'Penata Tingkat I'],
    IV: ['Pembina', 'Pembina Tingkat I', 'Pembina Utama Muda', 'Pembina Utama Madya', 'Pembina Utama']
  };
  var ord = 100;
  ['I', 'II', 'III', 'IV'].forEach(function (g) {
    GOL[g].forEach(function (name, i) {
      var code = g + '/' + 'abcde'.charAt(i);
      ref.ranks.push(K(code, 'PNS ' + code + ' (' + name + ')', 'PNS ' + code, [code.toLowerCase()], 'PNS', ['PNS'], ++ord, { pnsGol: g }));
    });
  });
  ref.ranks.push(K('P3K', 'PPPK (P3K)', 'P3K', ['p3k', 'pppk'], 'PNS', ['PNS'], 100, { pnsGol: 'P3K' }));

  ref.rankByCode = {};
  ref.ranks.forEach(function (r) { ref.rankByCode[r.code] = r; });

  // Longest phrase first so 'pembantu letnan satu' beats 'letnan satu' and 'laksamana pertama' beats 'laksamana'.
  var RANK_PHRASES = [];
  ref.ranks.forEach(function (r) {
    if (r.group === 'PNS') return;
    r.abbr.forEach(function (a) { RANK_PHRASES.push([a, r.code]); });
  });
  RANK_PHRASES.sort(function (a, b) { return b[0].length - a[0].length; });

  var AU_CORPS = /\b(pnb|tek|kal|nav|adm|lek|psk)\b/;
  var AD_CORPS = /\b(inf|kav|arm|arh|czi|chb|cpm|cku|ckm|cpl|caj|cpn|ctp|chk)\b/;

  /**
   * Matra inference when the column is missing (§F.3.6): Laut/Kelasi/Laksma…/Marinir → AL;
   * Udara/(Pnb)/(Tek)/(Kal)/(Nav)/Marsma… → AU; Inf/Kav/Arm/Arh/Czi/Chb/Cpm or Brigjen… without Mar → AD;
   * golongan pattern or P3K → PNS. Returns null when nothing matches.
   */
  ref.inferMatra = function (s) {
    var t = ' ' + String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9\/]+/g, ' ') + ' ';
    if (/\b(i|ii|iii|iv)\s*\/?\s*[a-e]\b/.test(t) || /\b(p3k|pppk|pns|asn)\b/.test(t)) return 'PNS';
    if (/\b(laut|kelasi|kld|kls|klk|laksma|laksda|laksdya|laksamana|mar|marinir)\b/.test(t)) return 'AL';
    if (/\b(udara|marsma|marsda|marsdya|marsekal)\b/.test(t) || AU_CORPS.test(t)) return 'AU';
    if (AD_CORPS.test(t) || /\b(brigjen|mayjen|letjen|jenderal)\b/.test(t)) return 'AD';
    return null;
  };

  /**
   * parseRank('Kolonel Laut (E)') → {code:'KOLONEL', group:'PAMEN', corps:'E', matra:'AL', patiStars:0, pnsGol:null, label}
   * Accepts full labels and abbreviations ('Kol Laut', 'Letkol Mar', 'Serma', 'Pelda Ttu', 'III/a', 'PPPK').
   * matra is the inferred matra (null when the text does not say). Returns null when no rank matches.
   */
  ref.parseRank = function (s) {
    if (s == null) return null;
    var raw = String(s);
    var gm = /\b(IV|III|II|I)\s*\/?\s*([a-e])\b/i.exec(raw);
    if (gm) {
      var code = gm[1].toUpperCase() + '/' + gm[2].toLowerCase(), pr = ref.rankByCode[code];
      if (pr) return { code: code, group: 'PNS', corps: null, matra: 'PNS', patiStars: 0, pnsGol: pr.pnsGol, label: pr.label };
    }
    if (/\b(p3k|pppk)\b/i.test(raw)) return { code: 'P3K', group: 'PNS', corps: null, matra: 'PNS', patiStars: 0, pnsGol: 'P3K', label: ref.rankByCode.P3K.label };
    var corps = null, pm = /\(([^)]+)\)/.exec(raw);
    if (pm) corps = pm[1].trim();
    var t = ' ' + raw.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z]+/g, ' ') + ' ';
    if (!corps && /\b(mar|marinir)\b/.test(t)) corps = 'Mar';
    if (!corps) { var cm = / (psk|ttu|inf|kav|arm|arh|czi|chb|cpm|pnb|tek|kal|nav|adm|lek) /.exec(t); if (cm) corps = cm[1].charAt(0).toUpperCase() + cm[1].slice(1); }
    var stripped = t.replace(/\b(laut|udara|tni|mar|marinir|psk|purn|purnawirawan)\b/g, ' ').replace(/\s+/g, ' ');
    for (var i = 0; i < RANK_PHRASES.length; i++) {
      var ph = RANK_PHRASES[i][0];
      if ((' ' + stripped + ' ').indexOf(' ' + ph + ' ') >= 0) {
        var r = ref.rankByCode[RANK_PHRASES[i][1]];
        var matra = ref.inferMatra(raw);
        if (!matra && r.matra.length === 1) matra = r.matra[0];
        return { code: r.code, group: r.group, corps: corps, matra: matra, patiStars: r.patiStars || 0, pnsGol: null, label: r.label };
      }
    }
    return null;
  };

  function isoOf(d) {
    if (d == null || d === '') return null;
    if (typeof d.getUTCFullYear === 'function') return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
    return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }
  function retireCfg(cfg) {
    return (cfg && cfg.retire) || (cfg && cfg.tamtamaBintara ? cfg : null) || (MCD.config && MCD.config.retire) ||
      { tmtNextMonth: true, tamtamaBintara: 55, pamaPamen: 58, pati: [60, 61, 62, 63], pns: 58, transition: [], patiTransition: [] };
  }

  /**
   * BUP (retirement age) per UU 3/2025 Pasal 53 and Pasal II (§F.3.6):
   * Tamtama/Bintara 55 (born ≤ 1973-03-26 → 53, ≤ 1974-03-26 → 54); Pama/Pamen 58;
   * Pati ★1–★4 60/61/62/63 (★1–★3 transition: born ≤ 1968-03-26 → 58/58/60, ≤ 1969-03-26 → 59/59/60);
   * PNS 58. p = {rankGroup, paTiStars|patiStars, birthDate, rankCode?}; cfg = MCD.config (or its retire block).
   * Returns null when the group is unknown.
   */
  ref.bupAge = function (p, cfg) {
    if (!p) return null;
    var rc = retireCfg(cfg), birth = isoOf(p.birthDate), i, list;
    var group = p.rankGroup || (p.rankCode && ref.rankByCode[p.rankCode] && ref.rankByCode[p.rankCode].group);
    if (group === 'TAMTAMA' || group === 'BINTARA') {
      if (birth) {
        list = (rc.transition || []).slice().sort(function (a, b) { return a.bornOnOrBefore < b.bornOnOrBefore ? -1 : 1; });
        for (i = 0; i < list.length; i++) if (birth <= list[i].bornOnOrBefore) return list[i].bup;
      }
      return rc.tamtamaBintara;
    }
    if (group === 'PAMA' || group === 'PAMEN') return rc.pamaPamen;
    if (group === 'PATI') {
      var stars = p.paTiStars || p.patiStars || (p.rankCode && ref.rankByCode[p.rankCode] && ref.rankByCode[p.rankCode].patiStars) || 1;
      stars = Math.max(1, Math.min(4, stars));
      if (birth && stars <= 3) {
        list = (rc.patiTransition || []).slice().sort(function (a, b) { return a.bornOnOrBefore < b.bornOnOrBefore ? -1 : 1; });
        for (i = 0; i < list.length; i++) if (birth <= list[i].bornOnOrBefore) return list[i].bup[stars - 1];
      }
      return rc.pati[stars - 1];
    }
    if (group === 'PNS') return rc.pns;
    return null;
  };

  /**
   * Retirement date (TMT pensiun) as ISO: the BUP birthday, moved to the first day of the
   * following month when cfg.retire.tmtNextMonth (default, §F.1.1). null without a birth date.
   */
  ref.retireDate = function (birthDate, bup, cfg) {
    var b = isoOf(birthDate);
    if (!b || !isNum(bup)) return null;
    var y = +b.slice(0, 4) + bup, m = +b.slice(5, 7) - 1, d = +b.slice(8, 10);
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var day = Math.min(d, last);
    var rc = retireCfg(cfg);
    var out = rc.tmtNextMonth === false ? new Date(Date.UTC(y, m, day)) : new Date(Date.UTC(y, m + 1, 1));
    return out.toISOString().slice(0, 10);
  };

  /** {bupAge, retireDate} for a person-like object. */
  ref.retirement = function (p, cfg) {
    var bup = ref.bupAge(p, cfg);
    return { bupAge: bup, retireDate: ref.retireDate(p && p.birthDate, bup, cfg) };
  };

  /* --------------------------------------------------- F.3.7 salary bands */

  // Net monthly take-home (Rp). Includes current tukin and allowances; the Perpres 42/2026
  // tukin raise is not assumed (not yet paid on 12 Okt 2026).
  ref.salaryBands = {
    TAMTAMA: { min: 4.6e6, max: 6.4e6, label: 'Tamtama' },
    BINTARA: { min: 5.6e6, max: 8.6e6, label: 'Bintara' },
    PAMA: { min: 7.4e6, max: 10.8e6, label: 'Pama' },
    PAMEN: { min: 9.8e6, max: 17.5e6, label: 'Pamen' },
    PATI: { min: 24e6, max: 46e6, label: 'Pati' },
    PNS_I: { min: 4.2e6, max: 5.2e6, label: 'PNS I' },
    PNS_II: { min: 5.0e6, max: 7.0e6, label: 'PNS II' },
    PNS_III: { min: 6.2e6, max: 10.0e6, label: 'PNS III' },
    PNS_IV: { min: 8.8e6, max: 14.5e6, label: 'PNS IV' },
    P3K: { min: 4.5e6, max: 6.5e6, label: 'P3K' }
  };
  /** Band for a rank group (PNS needs pnsGol 'I'|'II'|'III'|'IV'|'P3K'). */
  ref.salaryBandFor = function (rankGroup, pnsGol) {
    if (rankGroup === 'PNS') return pnsGol === 'P3K' ? ref.salaryBands.P3K : (ref.salaryBands['PNS_' + pnsGol] || null);
    return ref.salaryBands[rankGroup] || null;
  };

  MCD.ref = ref;
})(window.MCD = window.MCD || {});
