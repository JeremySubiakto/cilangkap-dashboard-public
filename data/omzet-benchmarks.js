/* Perkiraan omzet UMKM: monthly turnover figures per business type, the regional restaurant-tax aggregates (context only,
   never applied to an estimate), the PP 7/2021 size classes and the legal line. Every figure is copied from docs/research-omzet.json (22 Oct 2026, public
   sources only, no bank data). Figures marked `derived` are arithmetic on the research's own numbers, with the formula.
   Rupiah per month unless a field says otherwise. Read by assets/js/omzet.js (MCD.omzet). Method: docs/OMZET_ESTIMATE.md.
   Classic script. */
window.MCD_OMZET_BENCHMARKS = {
  meta: {
    title: 'Perkiraan omzet per jenis usaha (data publik)',
    generated: '2026-10-22',
    research: 'docs/research-omzet.json',
    researchAsOf: '2026-10-22',
    doc: 'docs/OMZET_ESTIMATE.md',
    unit: 'Rp per bulan',
    label: 'perkiraan',
    /* research strength words → plain Indonesian (shown as "Bukti: lemah") */
    evidence: { medium: 'sedang', weak: 'lemah', 'very weak': 'sangat lemah', none: 'tidak ada' },
    /* ticket level of MCD.sme.factors(): 0 kecil, 1 sedang, 2 besar */
    ticketLevels: ['kecil', 'sedang', 'besar'],
    note: 'No per-business tax data is used: it is confidential (UU KUP Pasal 34, UU 1/2022 Pasal 103) and PP 35/2023 Pasal 115 gives a bank no route to it.'
  },

  /* research legalLine and uiLines, word for word */
  legalLine: 'Omzet di sini adalah perkiraan dari data publik, karena data pajak setiap usaha bersifat rahasia (UU KUP Pasal 34, UU 1/2022 Pasal 103).',
  caption: 'Perkiraan omzet, bukan data pajak atau data rekening',
  uiLines: {
    legal: 'Omzet di sini adalah perkiraan dari data publik, karena data pajak setiap usaha bersifat rahasia (UU KUP Pasal 34, UU 1/2022 Pasal 103).',
    taxGap: 'Banyak usaha kecil tidak tercatat di data pajak: usaha perorangan dengan omzet sampai Rp500 juta setahun tidak dikenai PPh final, dan rumah makan di Jakarta dengan omzet sampai Rp42 juta sebulan tidak dikenai pajak restoran.',
    estimate: 'Angka omzet per jenis usaha adalah kisaran dari survei dan sumber publik, bukan omzet usaha tertentu.'
  },

  /*
   * Benchmarks, Rp per month. low / mid / high are the research's monthlyLow / monthlyMid / monthlyHigh (null = the
   * research has no such figure). research = the research's category name. strength = the research's strength.
   * ticket = the usual nilai belanja level of the type (0 kecil, 1 sedang, 2 besar; docs/EDC_SCORE.md §2).
   * pbjt = the type is a regional restaurant-tax (PBJT makanan dan/atau minuman) object: its listings form the top tail
   * that MCD.omzet.taxCheck compares with the published tax (a check only; no estimate changes).
   * lvmCat = MCD.lvm category. basis / note = plain Indonesian for the "?" tip and the card.
   * How MCD.omzet uses a benchmark (docs/OMZET_ESTIMATE.md §2.1):
   *   - weak or medium with a mid (or a low and a high): its own figure, kept inside its low and high;
   *   - 'very weak' (one shop, a franchise target, a break-even figure): never a typical value or a floor. The estimate
   *     starts from the general UMKM mean ('umkm-umum') and the source's high (else its mid) is a ceiling only;
   *   - no figure ('none'): the general UMKM mean. general: false = never the general mean (no estimate instead);
   *   - the general UMKM mean is never used for a listing with nilai belanja besar (no estimate instead).
   */
  bench: {
    'kelontong': {
      label: 'warung atau toko kelontong', lvmCat: 'grocery', ticket: 0, pbjt: false,
      research: 'warung/toko kelontong', low: 15000000, mid: 30000000, high: 150000000, strength: 'weak',
      sources: ['liputan6-warung-2025', 'ukmindonesia-warung-2025', 'investortrust-perpeksi-2024'],
      basis: 'perkiraan media dan asosiasi toko kelontong (2024–2025)',
      note: 'Belum ada survei omzet warung di Jabodetabek. Sekitar 60% penjualan warung adalah rokok.'
    },
    'minimarket': {
      label: 'minimarket atau swalayan', lvmCat: 'grocery', ticket: 1, pbjt: false,
      research: 'minimarket waralaba', low: null, mid: 423300000, high: null, strength: 'medium',
      derived: 'Research figure, itself derived: listed chain net revenue 2024 Rp118,23 triliun / 23.277 stores / 12.',
      sources: ['detik-amrt-2025'],
      basis: 'pendapatan jaringan minimarket 2024 dibagi jumlah toko',
      note: 'Angka rata-rata jaringan nasional. Minimarket lokal biasanya lebih kecil.'
    },
    'swalayan': {
      label: 'swalayan atau toko serba ada', lvmCat: 'grocery', ticket: 1, pbjt: false, general: false,
      research: null, low: null, mid: null, high: null, strength: 'none',
      derived: 'No figure: the research has no turnover source for a local supermarket, department store or wholesale club. The chain-minimarket average (detik-amrt-2025) covers chain outlets only, and the general UMKM mean would understate a large store, so these listings get no estimate (general: false).',
      sources: [],
      basis: null,
      note: 'Belum ada sumber omzet swalayan lokal. Rata-rata minimarket jaringan nasional hanya berlaku untuk gerai jaringan.'
    },
    'rumah-makan': {
      label: 'rumah makan atau restoran', lvmCat: 'restaurant', ticket: 1, pbjt: true,
      research: 'warung makan/rumah makan', low: 10620000, mid: 37410000, high: 150000000, strength: 'medium',
      sources: ['bps-mamin-2023', 'okezone-warteg-2021', 'katadata-warteg-2026'],
      basis: 'rata-rata BPS 2023 untuk restoran dan rumah makan',
      note: 'Rata-rata BPS tertarik ke atas oleh restoran besar. Usaha yang umum biasanya lebih kecil.'
    },
    'kaki-lima': {
      label: 'warung makan kecil atau kaki lima', lvmCat: 'restaurant', ticket: 0, pbjt: true,
      research: null, low: 8880000, mid: 10620000, high: null, strength: 'medium',
      derived: 'From the research aggregate bps-mamin-2023 (Tabel 4.39, national 2023). low: group "keliling" Rp75.343.393,85 juta / 706.660 businesses / 12 = Rp8,88 juta. mid: group "lainnya" (kedai makanan minuman, kafe, bar) Rp354.022.117,92 juta / 2.777.059 / 12 = Rp10,62 juta, the research\'s own figure for that group.',
      sources: ['bps-mamin-2023'],
      basis: 'rata-rata BPS 2023 untuk kedai dan usaha makanan keliling',
      note: 'Angka nasional. Warteg yang ramai dapat jauh di atas angka ini.'
    },
    'kafe': {
      label: 'kafe atau kedai kopi', lvmCat: 'restaurant', ticket: 0, pbjt: true,
      research: 'kafe/kedai kopi', low: null, mid: 10620000, high: null, strength: 'weak',
      sources: ['bps-mamin-2023'],
      basis: 'rata-rata BPS 2023 untuk kedai, kafe dan bar',
      note: 'Kelompok BPS ini mencampur kedai kecil dengan kafe dan bar. Belum ada survei kafe di Jabodetabek.'
    },
    'roti': {
      label: 'toko roti atau kue', lvmCat: 'restaurant', ticket: 0, pbjt: false,
      research: 'bakery', low: 4170000, mid: 8330000, high: 18340000, strength: 'medium',
      sources: ['bps-imk-jabar-2024'],
      basis: 'BPS Jawa Barat 2024 untuk industri makanan mikro dan kecil',
      note: 'Termasuk produsen rumahan. Toko roti dengan etalase biasanya lebih besar.'
    },
    'toko-bangunan': {
      label: 'toko bangunan', lvmCat: 'other', ticket: 2, pbjt: false,
      research: 'toko bangunan', low: null, mid: null, high: 1000000000, strength: 'very weak',
      sources: ['ebisnis-tokobangunan-2026'],
      basis: 'satu toko bangunan di Lampung (2024)',
      note: 'Hanya satu toko, di luar Jabodetabek. Digunakan sebagai batas atas toko yang mapan.'
    },
    'bengkel': {
      label: 'bengkel motor atau mobil', lvmCat: 'other', ticket: 1, pbjt: false,
      research: 'bengkel motor/mobil', low: 7000000, mid: null, high: 100000000, strength: 'weak',
      sources: ['antara-bengkel-2026', 'detik-bengkel-franchise-2013'],
      basis: 'bengkel binaan di Kota Bogor (2026) dan klaim waralaba (2013)',
      note: 'Belum ada survei omzet bengkel.'
    },
    'apotek': {
      label: 'apotek atau toko obat', lvmCat: 'other', ticket: 1, pbjt: false,
      research: 'apotek/toko obat', low: null, mid: null, high: 390000000, strength: 'very weak',
      sources: ['detik-apotek-franchise-2022'],
      basis: 'target penjualan waralaba apotek 24 jam (2022)',
      note: 'Angka ini target balik modal waralaba. Belum ada sumber untuk apotek mandiri.'
    },
    'salon': {
      label: 'salon atau pangkas rambut', lvmCat: 'other', ticket: 1, pbjt: false,
      research: 'salon/barbershop', low: null, mid: 45000000, high: null, strength: 'very weak',
      sources: ['detik-barbershop-2022'],
      basis: 'satu barbershop di Jakarta (2022)',
      note: 'Hanya satu usaha. Salon dan pangkas rambut di permukiman biasanya jauh lebih kecil.'
    },
    'laundry': {
      label: 'laundry', lvmCat: 'other', ticket: 0, pbjt: false,
      research: 'laundry', low: 8000000, mid: 19500000, high: null, strength: 'weak',
      sources: ['detik-laundry-sepatu-2021', 'detik-laundry-asli-2016'],
      basis: 'laundry sepatu di Depok (2021) dan asosiasi laundry (2016)',
      note: 'Harga tahun 2016. Belum ada survei omzet laundry.'
    },
    'toko-pakaian': {
      label: 'toko pakaian', lvmCat: 'other', ticket: 1, pbjt: false,
      research: 'toko pakaian', low: null, mid: null, high: null, strength: 'none',
      sources: [],
      basis: null,
      note: 'Belum ada sumber omzet toko pakaian.'
    },
    'toko-hp': {
      label: 'toko HP atau pulsa', lvmCat: 'other', ticket: 2, pbjt: false,
      research: 'toko HP/pulsa', low: 5778550, mid: null, high: null, strength: 'very weak',
      sources: ['absis-konterpulsa-2024'],
      basis: 'titik impas penjualan pulsa di Lumajang',
      note: 'Batas minimum untuk pulsa saja. Penjualan HP dan aksesori menambah omzet.'
    },
    'klinik': {
      label: 'klinik', lvmCat: 'other', ticket: 2, pbjt: false,
      research: 'klinik', low: null, mid: null, high: null, strength: 'none',
      sources: ['permenkes-3-2023', 'djsn-jkn-2025-12'],
      basis: null,
      note: 'Belum ada sumber omzet klinik. Kapitasi JKN Rp9.000–16.000 per peserta per bulan, jumlah peserta per klinik tidak dipublikasikan.'
    },
    'umkm-umum': {
      label: 'usaha mikro dan kecil', lvmCat: 'other', ticket: 0, pbjt: false,
      research: null, low: null, mid: 16000000, high: null, strength: 'weak',
      derived: 'From the research aggregate bps-se2016-lanjutan: more than 26 juta UMK nonpertanian with omzet of more than Rp5.000 triliun a year; the research derives a mean of about Rp16 juta per business per month (2017 prices, a lower bound).',
      sources: ['bps-se2016-lanjutan'],
      basis: 'rata-rata usaha mikro dan kecil, Sensus Ekonomi 2016',
      note: 'Rata-rata semua usaha mikro dan kecil, harga 2017. Digunakan jika jenis usaha belum memiliki angka sendiri.'
    }
  },

  /*
   * Business category → benchmark. Keys are the categories of data/sme-pois-extra.js (Overture categories and the
   * nama:* classes of docs/EDC_SCORE.md §2.1). A category that is not listed goes through `patterns`, then `groups`
   * (the Overture group of data/sme-pois.js), then `lvmCats`. A type with no figures, a very weak figure, or no benchmark
   * at all, falls back to 'umkm-umum' unless its nilai belanja is besar: then there is no estimate (hospital, dealer,
   * hotel, furniture, toko bangunan, toko HP …). Local supermarkets and department stores ('swalayan') get none either.
   */
  categories: {
    grocery_store: 'kelontong', convenience_store: 'kelontong', 'nama:minimarket': 'kelontong', organic_grocery_store: 'kelontong',
    food_and_beverage_store: 'kelontong', health_food_store: 'kelontong', produce_store: 'kelontong', tobacco_shop: 'kelontong',
    fishmonger: 'kelontong', butcher_shop: 'kelontong', liquor_store: 'kelontong', smoke_and_vape_store: 'kelontong',
    'nama:supermarket': 'swalayan', supermarket: 'swalayan', hypermarket: 'swalayan', superstore: 'swalayan',
    department_store: 'swalayan', warehouse_club_store: 'swalayan',
    restaurant: 'rumah-makan', indonesian_restaurant: 'rumah-makan', diner: 'rumah-makan', caterer: 'rumah-makan',
    food_and_drink: 'rumah-makan', bar: 'rumah-makan', lounge: 'rumah-makan', food_court: 'rumah-makan',
    steakhouse: 'rumah-makan', salad_bar: 'rumah-makan', sandwich_shop: 'rumah-makan', delicatessen: 'rumah-makan',
    cafeteria: 'rumah-makan', pub: 'rumah-makan', gastropub: 'rumah-makan', beer_garden: 'rumah-makan', beer_bar: 'rumah-makan',
    wine_bar: 'rumah-makan', cocktail_bar: 'rumah-makan', sports_bar: 'rumah-makan', tapas_bar: 'rumah-makan',
    frozen_yogurt_shop: 'kafe', gelato_shop: 'kafe', chocolatier: 'kafe', candy_store: 'kafe',
    'nama:warung_kaki_lima': 'kaki-lima', food_truck_stand: 'kaki-lima', food_stand: 'kaki-lima', street_vendor: 'kaki-lima',
    coffee_shop: 'kafe', cafe: 'kafe', bubble_tea_shop: 'kafe', tea_room: 'kafe', smoothie_juice_bar: 'kafe', juice_bar: 'kafe',
    dessert_shop: 'kafe', ice_cream_shop: 'kafe',
    bakery: 'roti', cupcake_shop: 'roti', donut_shop: 'roti', cake_shop: 'roti', patisserie_cake_shop: 'roti', bagel_shop: 'roti',
    building_supply_store: 'toko-bangunan', hardware_store: 'toko-bangunan', home_improvement_store: 'toko-bangunan',
    lumber_store: 'toko-bangunan', paint_store: 'toko-bangunan', 'nama:toko_bangunan': 'toko-bangunan',
    automotive_repair: 'bengkel', motorcycle_repair: 'bengkel', automotive_service: 'bengkel', auto_body_shop: 'bengkel',
    tire_dealer_and_repair: 'bengkel', oil_change_station: 'bengkel', auto_detailing: 'bengkel', car_wash: 'bengkel',
    auto_customization: 'bengkel', auto_parts_store: 'bengkel', bike_repair_maintenance: 'bengkel', car_window_tinting: 'bengkel',
    auto_glass_service: 'bengkel', auto_electrical_repair: 'bengkel', auto_upholstery: 'bengkel', auto_restoration_service: 'bengkel',
    pharmacy: 'apotek', drugstore: 'apotek', 'nama:apotek': 'apotek', medical_supply_store: 'apotek', vitamin_and_supplement_store: 'apotek',
    beauty_salon: 'salon', hair_salon: 'salon', barber: 'salon', nail_salon: 'salon', skin_care_and_makeup: 'salon',
    hair_stylist: 'salon', makeup_artist: 'salon', waxing: 'salon', personal_or_beauty_service: 'salon',
    laundromat: 'laundry', laundry_service: 'laundry', dry_cleaning: 'laundry',
    clothing_store: 'toko-pakaian', fashion_and_apparel_store: 'toko-pakaian', fashion_boutique: 'toko-pakaian',
    womens_clothing_store: 'toko-pakaian', mens_clothing_store: 'toko-pakaian', childrens_clothing_store: 'toko-pakaian',
    shoe_store: 'toko-pakaian', sportswear_store: 'toko-pakaian', bridal_shop: 'toko-pakaian', fashion_accessories_store: 'toko-pakaian',
    mobile_phone_store: 'toko-hp', mobile_phone_accessories: 'toko-hp',
    health_care: 'klinik', outpatient_care_facility: 'klinik', dental_clinic: 'klinik', doctors_office: 'klinik',
    laboratory_testing: 'klinik', maternity_center: 'klinik', family_practice: 'klinik', obstetrics_and_gynecology: 'klinik',
    medical_service_organization: 'klinik', physical_therapy: 'klinik'
  },
  /* mapped by a near type only: the estimate stays 'rendah' even with a medium benchmark (chain supermarkets included) */
  approx: ['nama:supermarket', 'supermarket', 'hypermarket', 'superstore', 'department_store', 'warehouse_club_store',
    'auto_parts_store', 'car_wash', 'auto_detailing', 'auto_customization', 'skin_care_and_makeup', 'caterer', 'bar', 'lounge',
    'dessert_shop', 'ice_cream_shop', 'smoke_and_vape_store', 'liquor_store', 'steakhouse', 'salad_bar', 'sandwich_shop', 'delicatessen',
    'cafeteria', 'pub', 'gastropub', 'beer_garden', 'beer_bar', 'wine_bar', 'cocktail_bar', 'sports_bar', 'tapas_bar', 'frozen_yogurt_shop',
    'gelato_shop', 'chocolatier', 'candy_store', 'bike_repair_maintenance', 'car_window_tinting', 'auto_glass_service', 'auto_electrical_repair',
    'auto_upholstery', 'auto_restoration_service', 'medical_supply_store', 'vitamin_and_supplement_store', 'hair_stylist', 'makeup_artist',
    'waxing', 'personal_or_beauty_service'],
  /* a national chain (MCD.sme.chainOf) of these categories is a chain minimarket; chain supermarkets take the same chain
     average as a near type (confidence rendah). Local supermarkets and department stores stay 'swalayan'. */
  chainCategories: { convenience_store: 'minimarket', 'nama:minimarket': 'minimarket', grocery_store: 'minimarket',
    'nama:supermarket': 'minimarket', supermarket: 'minimarket', hypermarket: 'minimarket', superstore: 'minimarket' },
  /* [regular expression source, benchmark] for categories not listed above */
  patterns: [
    ['_restaurant$', 'rumah-makan'],
    ['clinic|dentist|_care_facility$|medicine$|surgery|dermatolog|orthodont|gynecolog|pediatric', 'klinik'],
    ['_clothing_store$|_apparel_store$', 'toko-pakaian']
  ],
  /* Overture groups 0-11 of data/sme-pois.js when the category is unknown (always 'rendah'); groups 12-13 are banks.
     The rules above still hold: a group mapped to a very weak type starts from the general mean, and the general mean is
     never used with nilai belanja besar (an uncategorised hotel or hospital gets no estimate). */
  groups: ['rumah-makan', 'kelontong', 'bengkel', 'umkm-umum', 'umkm-umum', 'salon', 'toko-bangunan', 'umkm-umum', 'umkm-umum',
    'umkm-umum', 'umkm-umum', 'umkm-umum', null, null],
  /* MCD.lvm categories when nothing else is known (always 'rendah') */
  lvmCats: { restaurant: 'rumah-makan', grocery: 'kelontong', other: 'umkm-umum' },
  fallback: 'umkm-umum',

  /*
   * Restaurant-tax (PBJT makanan dan/atau minuman) aggregates by area: CONTEXT for the kecamatan card and an upper-tail
   * check (MCD.omzet.taxCheck). They never change an estimate: registered taxpayers are a small, larger slice of food
   * businesses (research taxRegistrationGap), so their average is no measure of a typical listing.
   * Keys: Kemendagri ids of a kecamatan ('31.75.06'), kota ('32.75') or province ('31'). The research found no kecamatan
   * figure (kecamatanTaxFound: false). The average per registered restaurant needs the tax, the rate AND the number of
   * taxpayers (tax / rate / taxpayers / 12); only Kota Bekasi has all three. registeredShare = registered taxpayers ÷ food
   * businesses (research derived aggregate, 6,7% for Kota Bekasi): the top share of listings the check compares with.
   */
  restaurantTax: {
    '31': {
      level: 'provinsi', area: 'DKI Jakarta', year: 2024, tax: 4300000000000, rate: 0.10, taxpayers: null, threshold: 42000000,
      sources: ['ddtc-profil-dki-2025', 'perda-dki-1-2024'],
      note: 'Number of PBJT makanan/minuman taxpayers in DKI Jakarta not found (research gaps); no average per restaurant, context line only.'
    },
    '32.76': {
      level: 'kota', area: 'Kota Depok', year: 2024, tax: 283540000000, rate: 0.10, taxpayers: null, threshold: 10000000,
      sources: ['ddtc-profil-depok-2026', 'perda-depok-1-2024'],
      note: 'Number of taxpayers not found; no average per restaurant, context line only. The 7% rate of Perda 8/2025 starts after 2024.'
    },
    '32.75': {
      level: 'kota', area: 'Kota Bekasi', year: 2024, tax: 435980087538, rate: 0.10, taxpayers: 3150, threshold: 10000000,
      registeredShare: 0.067,
      sources: ['costing-bekasi-2025', 'perda-bekasi-1-2024', 'bps-se2016-brs-jabar'],
      note: 'Research derived figures: Rp115,3 juta taxable sales per registered taxpayer per month (all taxpayers active all year at 10%); 3.150 taxpayers against 47.187 food and accommodation businesses in SE2016, about 6,7% (mixed years). Context and check only.'
    },
    '32.01': {
      level: 'kabupaten', area: 'Kabupaten Bogor', year: 2024, tax: null, rate: 0.10, taxpayers: null, threshold: 10000000,
      sources: ['perda-kabbogor-11-2023'],
      note: '2024 realisation not found (research gaps); context line only.'
    }
  },
  /* restaurant-tax thresholds (Rp per month), the line above which a restaurant is a PBJT object (shown as context) */
  thresholds: { '31': 42000000, '32.76': 10000000, '32.75': 10000000, '32.01': 10000000 },

  /* PP 7/2021 Pasal 35: annual sales (hasil penjualan tahunan), Rupiah per year */
  sizeClasses: [
    { id: 'mikro', label: 'Usaha mikro', annualMax: 2000000000, article: 'PP 7/2021 Pasal 35 ayat (3) huruf a' },
    { id: 'kecil', label: 'Usaha kecil', annualMax: 15000000000, article: 'PP 7/2021 Pasal 35 ayat (3) huruf b' },
    { id: 'menengah', label: 'Usaha menengah', annualMax: 50000000000, article: 'PP 7/2021 Pasal 35 ayat (3) huruf c' }
  ],
  /* thresholds behind the five bands of MCD.omzet (docs/OMZET_ESTIMATE.md §3), Rp per month */
  lines: {
    regionalRestaurantTax: 10000000,       // Depok, Kota Bekasi, Kab. Bogor: below it a restaurant is no PBJT object
    dkiRestaurantTax: 42000000,             // DKI Jakarta, Perda 1/2024 Pasal 45
    pphFinalFreePart: 41666667,             // Rp500 juta a year of an individual's turnover not taxed (PP 55/2022 Pasal 60)
    mikroMax: 166666667,                    // Rp2 miliar a year (PP 7/2021)
    pphFinalCeiling: 400000000              // Rp4,8 miliar a year (PP 55/2022 Pasal 57, kept by PP 20/2026)
  },

  /* the research sources cited above (docs/research-omzet.json → sources) */
  sources: {
    'uu-kup-28-2007': { title: 'UU 28/2007 (KUP) Pasal 34, Pasal 41', publisher: 'Pemerintah RI', year: 2007, url: 'https://peraturan.go.id/files/uu28-2007.pdf' },
    'uu-hkpd-1-2022': { title: 'UU 1/2022 (HKPD) Pasal 51, 58, 103, 184', publisher: 'Pemerintah RI', year: 2022, url: 'https://peraturan.go.id/files/uu1-2022bt.pdf' },
    'pp-35-2023': { title: 'PP 35/2023 Pasal 115', publisher: 'JDIH BPK', year: 2023, url: 'https://peraturan.bpk.go.id/Details/252130/pp-no-35-tahun-2023' },
    'pp-7-2021': { title: 'PP 7/2021 Pasal 35', publisher: 'Pemerintah RI', year: 2021, url: 'https://peraturan.go.id/files/pp7-2021bt.pdf' },
    'pp-55-2022': { title: 'PP 55/2022 Pasal 56-60', publisher: 'JDIH BPK', year: 2022, url: 'https://peraturan.bpk.go.id/Download/284096/PP%20Nomor%2055%20Tahun%202022.pdf' },
    'pp-20-2026': { title: 'PP 20/2026 (perubahan PP 55/2022)', publisher: 'JDIH BPK; DJP', year: 2026, url: 'https://peraturan.bpk.go.id/Details/349415/pp-no-20-tahun-2026' },
    'perda-dki-1-2024': { title: 'Perda DKI Jakarta 1/2024 Pasal 45, 53, 105', publisher: 'Bapenda DKI Jakarta', year: 2024, url: 'https://bapenda.jakarta.go.id/peraturan-perpajakan/unduh/perda-nomor-1-tahun-2024-tentang-pajak-dan-retribusi-daerah' },
    'perda-depok-1-2024': { title: 'Perda Kota Depok 1/2024 Pasal 21, 29', publisher: 'DDTC Perpajakan', year: 2024, url: 'https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-daerah/perda-kota-depok-1-tahun-2024' },
    'perda-bekasi-1-2024': { title: 'Perda Kota Bekasi 1/2024 Pasal 25, 33', publisher: 'DDTC Perpajakan', year: 2024, url: 'https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-daerah/perda-kota-bekasi-1-tahun-2024' },
    'perda-kabbogor-11-2023': { title: 'Perda Kab. Bogor 11/2023 Pasal 18, 26', publisher: 'DDTC Perpajakan', year: 2023, url: 'https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-daerah/perda-kabupaten-bogor-11-tahun-2023' },
    'ddtc-profil-dki-2025': { title: 'Update 2025, Simak Profil Pajak DKI Jakarta', publisher: 'DDTCNews', year: 2025, url: 'https://news.ddtc.co.id/literasi/profil-daerah/1815189/update-2025-simak-profil-pajak-dki-jakarta' },
    'ddtc-profil-depok-2026': { title: 'Update 2026, Simak Profil Pajak Kota Penyangga Jakarta Ini (Kota Depok)', publisher: 'DDTCNews', year: 2026, url: 'https://news.ddtc.co.id/literasi/profil-daerah/1821126/update-2026-simak-profil-pajak-kota-penyangga-jakarta-ini' },
    'costing-bekasi-2025': { title: 'Strategi Optimalisasi PBJT Makanan dan/atau Minuman di Kota Bekasi, COSTING 8(6)', publisher: 'COSTING journal', year: 2025, url: 'https://journal.ipm2kpe.or.id/index.php/COSTING/article/view/17993' },
    'bps-se2016-brs-jabar': { title: 'BRS Hasil Pendaftaran (Listing) Usaha/Perusahaan SE2016 Jawa Barat', publisher: 'BPS', year: 2017, url: 'https://se2016.bps.go.id/umkumb/files/brs/brs_3200.pdf' },
    'bps-mamin-2023': { title: 'Statistik Penyediaan Makanan dan Minuman 2023', publisher: 'BPS', year: 2024, url: 'https://www.bps.go.id/id/publication/2024/12/23/f2c7743c4712aaeaa4abf694/statistik-penyediaan-makanan-dan-minuman-2023' },
    'bps-imk-jabar-2024': { title: 'Profil Industri Mikro dan Kecil Provinsi Jawa Barat 2024', publisher: 'BPS Provinsi Jawa Barat', year: 2026, url: 'https://jabar.bps.go.id/id/publication/2026/04/30/5eb764388862de03211879fc/profil-industri-mikro-dan-kecil-provinsi-jawa-barat-2024.html' },
    'bps-se2016-lanjutan': { title: 'Potensi Usaha Mikro Kecil, Sensus Ekonomi 2016 Lanjutan', publisher: 'BPS', year: 2018, url: 'https://se2016.bps.go.id/umkumb/files/umkumb/00_Pusat/00_booklet_SE2016Lanjutan_01_Potensi_UMK.pdf' },
    'permenkes-3-2023': { title: 'Standar tarif JKN (Permenkes 3/2023, kapitasi)', publisher: 'Kementerian Kesehatan', year: 2023, url: 'https://kemkes.go.id/eng/ini-dia-standar-tarif-baru-pelayanan-jkn' },
    'djsn-jkn-2025-12': { title: 'Monthly Report JKN Desember 2025', publisher: 'DJSN', year: 2026, url: 'https://sismonev.djsn.go.id/kesehatan/doc/laporan-bulanan/Monthly_Report_JKN_12_2025.pdf' },
    'detik-amrt-2025': { title: 'Raup Pendapatan Rp 118 T, Alfamart Tebar Dividen Rp 1,4 T', publisher: 'detikFinance', year: 2025, url: 'https://finance.detik.com/bursa-dan-valas/d-7927409/raup-pendapatan-rp-118-t-alfamart-tebar-dividen-rp-1-4-t' },
    'okezone-warteg-2021': { title: 'Derita Bisnis Warteg Jabodetabek, Omzet Anjlok Selama Covid-19', publisher: 'Okezone', year: 2021, url: 'https://economy.okezone.com/read/2021/02/18/455/2364329/derita-bisnis-warteg-jabodetabek-omzet-anjlok-selama-covid-19?page=all' },
    'katadata-warteg-2026': { title: 'Dari Daging ke Tumis Sayur, Jejak Pelemahan Daya Beli di Warteg dan Rumah Makan', publisher: 'Katadata', year: 2026, url: 'https://katadata.co.id/amp/berita/industri/6a22dc64772f2/dari-daging-ke-tumis-sayur-jejak-pelemahan-daya-beli-di-warteg-dan-rumah-makan' },
    'investortrust-perpeksi-2024': { title: 'Soal Aturan Larang Jual Rokok Eceran, 60% Toko Kelontong Terancam Bangkrut', publisher: 'Investortrust', year: 2024, url: 'https://investortrust.id/business/37165/soal-aturan-larang-jual-rokok-eceran-60-toko-kelontong-terancam-bangkrut' },
    'liputan6-warung-2025': { title: 'Berapa Modal Buka Warung Sembako? Panduan Lengkap untuk Pemula', publisher: 'Liputan6', year: 2025, url: 'https://www.liputan6.com/hot/read/6173144/berapa-modal-buka-warung-sembako-panduan-lengkap-untuk-pemula' },
    'ukmindonesia-warung-2025': { title: 'Bisnis Warung Sembako: Perhitungan Modal, Untung, dan Balik Modalnya', publisher: 'UKMIndonesia.id', year: 2025, url: 'https://ukmindonesia.id/baca-deskripsi-posts/bisnis-warung-sembako-perhitungan-modal-untung-dan-balik-modalnya' },
    'detik-laundry-asli-2016': { title: 'Berapa Modal Awal Buka Usaha Laundry?', publisher: 'detikFinance', year: 2016, url: 'https://finance.detik.com/berita-ekonomi-bisnis/d-3182240/berapa-modal-awal-buka-usaha-laundry' },
    'detik-laundry-sepatu-2021': { title: 'Modal Kecil Beromzet Rp 16 Juta/Bulan dari Laundry Sepatu', publisher: 'detikFinance', year: 2021, url: 'https://finance.detik.com/solusiukm/d-5473283/menggiurkan-modal-kecil-beromzet-rp-16-jutabulan-dari-laundry-sepatu' },
    'detik-barbershop-2022': { title: 'Barbershop Asgar Bisa Beromzet 100 Juta Per Bulan', publisher: 'detikFinance', year: 2022, url: 'https://finance.detik.com/berita-ekonomi-bisnis/d-6252878/barbershop-asgar-bisa-beromzet-100-juta-per-bulan' },
    'antara-bengkel-2026': { title: 'Bengkel mustahik binaan Baznas di Bogor raih omzet Rp10 juta per bulan', publisher: 'ANTARA', year: 2026, url: 'https://www.antaranews.com/berita/5680363/bengkel-mustahik-binaan-baznas-di-bogor-raih-omzet-rp10-juta-per-bulan' },
    'detik-bengkel-franchise-2013': { title: 'Mr. Montir, Peluang Bisnis Bengkel Resmi Harga Jalanan', publisher: 'detikOto', year: 2013, url: 'https://oto.detik.com/motor/d-2262594/mr-montir-peluang-bisnis-bengkel-resmi-harga-jalanan' },
    'detik-apotek-franchise-2022': { title: 'Cek! Biaya Buka Apotek K-24, Estimasi Balik Modal, hingga Link Daftarnya', publisher: 'detikFinance', year: 2022, url: 'https://finance.detik.com/berita-ekonomi-bisnis/d-6219809/cek-biaya-buka-apotek-k-24-estimasi-balik-modal-hingga-link-daftarnya' },
    'ebisnis-tokobangunan-2026': { title: 'Toko Bangunan Yolanda Kabupaten Tanggamus, EBISNIS 19(1)', publisher: 'EBISNIS (Universitas STEKOM)', year: 2026, url: 'https://journal.stekom.ac.id/index.php/Bisnis/article/download/3449/2383/13734' },
    'absis-konterpulsa-2024': { title: 'Analisa Perkembangan Counter Pulsa Hand Phone di Kabupaten Lumajang, Jurnal Absis 6(2)', publisher: 'Jurnal Absis', year: 2024, url: 'https://journal.upp.ac.id/index.php/absis/article/download/2363/1423' }
  }
};
