/* ==========================================================================
 * MCD.schools: pure engine for section 7 "Schools & Foundations"
 * docs/BUILD_SPEC_EDUCATION.md §4 (data contracts), §7 (filters), §10 (formulas),
 * §11.4 (customer matching), §9.7 (lead CSV), §9.8 (pipeline store); copy and
 * product decisions in docs/COPY_STYLE_EN.md (English UI, en-GB numbers).
 *
 * Public data (shown in every mode, with source and date):
 *   window.MCD_SCHOOLS       data/schools.js (≈1.6 MB, loaded lazily by ensureData())
 *   window.MCD_TNI_SCHOOLS   data/tni-schools.js (in index.html)
 * Bank data: MCD.data.sekolah (sheet 8_sekolah of the request template; vault or
 * import; or the opt-in demo rows of data-synthetic.js).
 *
 * API (no DOM at load; Node-testable through buildIndexFrom):
 *   ensureData() → Promise           injects data/schools.js (and data/sma-students.js) once, builds the index
 *   students.*                       students and students aged 17+ per SMA (COPY_STYLE_EN items 26, 29),
 *                                    the shared display rule and the editable per-grade shares (see below)
 *   buildIndexFrom(S, T, opts) → idx  pure; buildIndex() uses the window globals
 *   defaultFilters() · filterSig(f) · derive(idx, f, rel) → Derived (KPIs, facets, ledger,
 *     passing rows, entities, board) · board(d, {mode, sort, q})
 *   score(e) · fit(e) · calc(inputs) · sppRef(e) · normYayasan(s) · entKey(s)
 *   matchCustomers(idx, records) → rel   (NPSN / NPYP / exact foundation name)
 *   pipeline.{get, set, quickAdd, remove, all, clear, count, exportJson, importJson, persisted, ready, status,
 *     orphans, _reset}: v6 (docs/V6_SPEC.md §7) MCD.seal.pipeline('schools.pipeline', …) when the shell has
 *     MCD.seal (sealed with the gate's session key), else a list kept in memory only (never written as plain text)
 *   pipelineLine() → {tone, text, action?} | null: the storage line of the Tindak lanjut tab (§7.6)
 *   lazy(name) → Promise · dataStatus(name): v6 data files (school-students, institution-tiers, school-contacts)
 *     through MCD.app.lazy, else one classic script injection (never fetch); emits 'data' {name, state}
 *   students.idOf · byId · byNpsn · row30 · view(idx, i, opts): v6 students of every SMA, SMK and MA within 30 km
 *     (data/school-students.js) under the display rule of V6_SPEC §1.1; data/sma-students.js stays the source for
 *     the SMA within 15 km (the pilot numbers 366 / 160.411 / 79.985)
 *   leadsCsv(idx, d, rel, {grain}) → string (BOM, confidentiality line, CSV guard)
 *   config: levels, statuses, bands, stages, programmes, networks, competitor notes,
 *     calculator defaults, compliance notes, sources. on(evt, fn) / emit(evt, x).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var S = MCD.schools = MCD.schools || {};

  var CENTER = [106.91329, -6.32818];               // Mabes TNI centre used by every data file (property D1)
  var R_KM = 6371.0088;
  var D2R = Math.PI / 180;

  /* ------------------------------------------------------------ config */

  var LEVELS = [
    { i: 0, code: 'TK', short: 'TK', label: 'TK/PAUD', name: 'Taman kanak-kanak dan PAUD', glyph: 'circle', token: '--p-kpr', rgbKey: 'KPR' },
    { i: 1, code: 'SD', short: 'SD', label: 'SD/MI', name: 'Sekolah dasar', glyph: 'circle', token: '--p-ksm', rgbKey: 'KSM' },
    { i: 2, code: 'SP', short: 'SMP', label: 'SMP/MTs', name: 'Sekolah menengah pertama', glyph: 'circle', token: '--p-cc', rgbKey: 'CC' },
    { i: 3, code: 'SA', short: 'SMA', label: 'SMA/MA', name: 'Sekolah menengah atas', glyph: 'circle', token: '--p-mg', rgbKey: 'MG' },
    { i: 4, code: 'SK', short: 'SMK', label: 'SMK', name: 'Sekolah menengah kejuruan', glyph: 'circle', token: '--p-kkb', rgbKey: 'KKB' },
    { i: 5, code: 'LB', short: 'SLB', label: 'SLB', name: 'Sekolah luar biasa', glyph: 'diamond', token: '--plat-3', plat: 3 },
    { i: 6, code: 'PT', short: 'PT', label: 'Perguruan tinggi', name: 'Perguruan tinggi (PT)', glyph: 'square', token: '--plat-4', plat: 4 }
  ];
  var STATUSES = [
    { i: 0, code: 'n', label: 'Negeri', id: 'negeri' },
    { i: 1, code: 's', label: 'Swasta', id: 'swasta' },
    { i: 2, code: 'u', label: 'Belum diketahui', id: 'unknown' }
  ];
  var BANDS = [
    { i: 0, label: '0–5 km', min: 0, max: 5, upTo: 5 },
    { i: 1, label: '5–10 km', min: 5, max: 10, upTo: 10 },
    { i: 2, label: '10–15 km', min: 10, max: 15, upTo: 15 },
    { i: 3, label: '15–20 km', min: 15, max: 20, upTo: 20 },
    { i: 4, label: '20–30 km', min: 20, max: Infinity, upTo: 30 }
  ];
  var MATRA = ['', 'AL', 'AU', 'AD'];
  var MATRA_FULL = { AL: 'TNI AL', AU: 'TNI AU', AD: 'TNI AD' };
  var STUDENT_PRESETS = [
    { id: 'lt100', label: '< 100', range: [0, 99] },
    { id: '100', label: '100–299', range: [100, 299] },
    { id: '300', label: '300–599', range: [300, 599] },
    { id: '600', label: '600–999', range: [600, 999] },
    { id: '1000', label: '≥ 1.000', range: [1000, 1e9] }
  ];

  // §9.8 stages (Bahasa Indonesia, COPY_STYLE item 19)
  var STAGES = [
    { id: 'baru', label: 'Belum dihubungi' }, { id: 'kontak', label: 'Telah dihubungi' }, { id: 'presentasi', label: 'Presentasi' },
    { id: 'proposal', label: 'Proposal' }, { id: 'pks', label: 'Negosiasi & PKS' }, { id: 'onboarding', label: 'Onboarding' },
    { id: 'aktif', label: 'Aktif' }, { id: 'ditunda', label: 'Ditunda', side: true }, { id: 'gugur', label: 'Batal', side: true }
  ];
  // In scope since 15 Oct 2026 (COPY_STYLE_EN item 14): school fee collection, pupils' savings and the canteen
  // Livin' Merchant. Operating accounts, staff salaries and staff loans left the dashboard with Business and
  // consumer loans; import codes for them are read and ignored. Item 35(a) (16 Oct 2026) adds Tabungan SimPel
  // (Simpanan Pelajar) for students under 17, opened together with a parent or guardian: import code SIMPEL.
  var PRODUCTS = [
    { id: 'COLL', col: 'coll', label: 'Penagihan SPP + Referral Biller', short: 'Penagihan SPP', import: ['VA_SPP'] },
    { id: 'TAB', col: 'tab', label: 'Tabungan siswa 17+ (dengan KTP)', short: 'Tabungan', import: ['TABUNGAN'] },
    { id: 'SIMPEL', col: 'simpel', label: 'Tabungan SimPel (siswa di bawah 17 tahun, bersama orang tua atau wali)', short: 'Tabungan SimPel', import: ['SIMPEL'] },
    { id: 'LVM', col: 'lvm', label: 'Livin’ Merchant (kantin, koperasi)', short: 'QRIS kantin', import: ['LVM'] }
  ];
  var PIPE_PROGRAMS = [{ id: '', label: 'Belum ada' }, { id: 'RB', label: 'Referral Biller 2026' }, { id: 'GEMPITA', label: 'GEMPITA 2026' }];

  // §3.2 programmes (Bank Mandiri pages, read 12 Oct 2026). `end` inclusive.
  var PROGRAMMES = [
    { id: 'referral-biller-2026', label: 'Referral Biller 2026', start: '2026-04-10', end: '2027-02-28', fee: 25000, key: true,
      what: 'Rp25.000 untuk yayasan per Tabungan NOW yang memenuhi syarat dan dibuka dengan kode promonya',
      terms: 'Syarat: setoran Rp100.000 atau lebih dan paling sedikit 1 transaksi Livin’ Rp25.000 dalam 30 hari.\nKuota 250 per bulan, 3.000 total.\nYayasan harus menagih SPP melalui Kopra Mandiri Bill Collection dan terdaftar di Kopra Bill Reminder.',
      src: 'bankmandiri.co.id/referral-biller-2026' },
    { id: 'gempita-2026', label: 'GEMPITA 2026', start: '2026-03-01', end: '2027-02-28',
      what: 'Referral KOL untuk kampus dan SMA, dibayarkan kepada perorangan.\nRp30.000 per Tabungan NOW atau RDN untuk KOL guru, staf dan kantin.\nRp15.000 untuk KOL siswa.',
      terms: 'Paling tinggi Rp5 juta per KOL. Cashback pengguna Rp25.000.\nSekolah tidak dapat menjalankan GEMPITA dan Bill Reminder bersamaan.',
      src: 'bankmandiri.co.id/gempita-2026' },
    { id: 'lvm-mdr', label: 'Tarif khusus Livin’ Merchant', start: null, end: '2026-12-31',
      what: 'Merchant pendidikan: MDR 0% sampai Rp100.000, 0,3% di atasnya',
      terms: 'Aturan BI: MDR 0% untuk transaksi QRIS sampai Rp100.000 sejak 1 Okt 2026. Berlaku untuk semua kategori.',
      src: 'bankmandiri.co.id/livin-merchant-special' },
    { id: 'power-bill-spp', label: 'Mandiri Power Bill SPP', start: '2023-08-11', end: '2027-10-31',
      what: 'SPP dibayar melalui autodebit kartu kredit',
      terms: 'Ada contoh sekolah peserta. Tercantum Rp5.000 per tagihan untuk satu sekolah.',
      src: 'mandirikartukredit.com/hot-offer/bayar-spp-sekolah-pakai-mandiri-power-bill' }
  ];
  var PROGRAMMES_ENDED = [
    { id: 'livin-iuran-sekolah-2025', label: 'Livin’ Bayar Iuran Sekolah dan Universitas', end: '2025-12-31', note: 'Telah berakhir. Belum ada promo pembayar 2026.' }
  ];

  // §4.5 network seed table (name-pattern based)
  var NETWORKS = [
    { id: 'muhammadiyah', label: 'Muhammadiyah (PDM/PWM)', re: /MUHAMMADIYAH|AISYIYAH/ },
    { id: 'as-syafiiyah', label: 'As-Syafi’iyah', re: /\bAS ?SYAFI ?I ?YAH\b|ASSYAFIIYAH|ASY ?SYAFI ?I ?YAH/ },
    { id: 'pgri', label: 'PGRI (YPLP)', re: /\bPGRI\b/ },
    { id: 'penabur', label: 'BPK Penabur', re: /PENABUR/ },
    { id: 'strada', label: 'Perkumpulan Strada', re: /\bSTRADA\b/ },
    { id: 'kemala-bhayangkari', label: 'Kemala Bhayangkari (Polri)', re: /KEMALA BHAYANGKARI/ },
    { id: 'al-azhar', label: 'Al-Azhar', re: /\bAL ?AZHAR\b/ },
    { id: 'maarif-nu', label: 'LP Ma’arif NU', re: /\bMA ?ARIF\b|NAHDLATUL ULAMA/ },
    { id: 'teratai-putih', label: 'Teratai Putih Global', re: /TERATAI PUTIH/ }
  ];
  // §4.5 competitor signals (display only)
  var COMPETITOR_NOTES = [
    { net: 'muhammadiyah', tag: 'BSI', text: 'BSI mengelola pembayaran sekolah Muhammadiyah melalui VA EduMu dan BEWIZE (MoU dengan Majelis Dikdasmen PP Muhammadiyah, Mei 2026).', src: 'kontan.co.id' },
    { net: 'al-azhar', tag: 'BSI', text: 'BSI memiliki Deposito Wakaf dengan YPI Al Azhar (Agu 2026).', src: 'ringkasan riset, pesaing › BSI' },
    { foundation: 'Yayasan Kartika Jaya', tag: 'bjb', text: 'Yayasan TNI AD lain (YKEP: Unjani, Unjaya) memperbarui MoU dengan bank bjb pada 27 Agu 2026, termasuk virtual account biaya kuliah.', src: 'republika.co.id' },
    { foundation: 'Yayasan Ardhya Garini (Yasarini)', tag: 'bjb', text: 'Yayasan TNI AU lain (Yayasan Adi Upaya: Unsurya) menandatangani MoU dan PKS dengan bank bjb pada 29 Jul 2026, berlaku sampai Jul 2028.', src: 'katadata.co.id' },
    { foundation: 'Yayasan Hang Tuah', tag: 'AG', text: 'TNI AL (satuan tidak disebutkan) menandatangani PKS dengan Bank Artha Graha pada 18 Des 2023.\nBank bjb memperpanjang kerja sama TNI AL pada 30 Des 2025.', src: 'kontan.co.id · bisnis.com' }
  ];
  var BANKING_KNOWN = {
    'Yayasan Hang Tuah': 'Tidak ada sumber publik yang menyebut bank penagih SPP sekolah Yayasan Hang Tuah.',
    'Yayasan Ardhya Garini (Yasarini)': 'Tidak ada sumber publik yang menyebut bank penagih SPP sekolah Yasarini.',
    'Yayasan Kartika Jaya': 'Tidak ada sumber publik yang menyebut bank penagih SPP sekolah Yayasan Kartika Jaya.'
  };
  var FOUNDATION_ORG = {
    'Yayasan Hang Tuah': { matra: 'AL', org: 'Jalasenastri (istri prajurit TNI AL)', registry: 'NPYP AG3546 (Cabang Jakarta), AX1640 (Pusat)' },
    'Yayasan Ardhya Garini (Yasarini)': { matra: 'AU', org: 'PIA Ardhya Garini (istri prajurit TNI AU)', registry: 'NPYP AD2274 (Cabang Lanud Halim), AA1391 (Cabang Lanud Atang Sendjaja)' },
    'Yayasan Kartika Jaya': { matra: 'AD', org: 'Persit Kartika Chandra Kirana (istri prajurit TNI AD)', registry: 'NPYP AL1532, AA1018, AD6563, AJ6094, AA4900' }
  };

  // §13.3 compliance notes (Bahasa Indonesia)
  var COMPLIANCE = [
    { text: 'Fee Referral Biller dibayarkan ke rekening atas nama yayasan.\nUU Yayasan Pasal 5 melarang kekayaan yayasan dialihkan kepada pendiri, pengurus atau pengawas.' },
    { text: 'Komite sekolah hanya boleh menggalang sumbangan sukarela (Permendikbud 75/2016). Program bank tidak disalurkan melalui komite sebagai pungutan.' },
    { text: 'Sekolah tidak menyerahkan data orang tua atau siswa tanpa dasar hukum (UU PDP 27/2022).\nKode promo Referral Biller menggantikan daftar nama.' },
    { text: 'Bank bertanggung jawab atas pihak ketiga yang memasarkan produknya, termasuk biller dan KOL (POJK 22/2023).\nMateri yang dibagikan sekolah perlu persetujuan cabang.' },
    { text: 'Imbalan GEMPITA masuk ke rekening pribadi KOL.\nUntuk guru ASN di sekolah negeri, tanyakan aturan gratifikasi kepada Compliance sebelum mendaftar.', unverified: true },
    { text: 'Tabungan NOW perlu e-KTP (usia 17 tahun ke atas).\nSimPel melalui sekolah perlu persetujuan dan surat kuasa orang tua.\nNext-G (usia 12 sampai di bawah 17 tahun) dibuka orang tua melalui Livin’.' }
  ];
  var GEMPITA_NOTE = 'GEMPITA 2026 dapat menggantikan Referral Biller untuk SMA.\nFee GEMPITA dibayarkan kepada KOL perorangan. Fee Referral Biller dibayarkan kepada yayasan.\nSekolah tidak dapat mengikuti keduanya.';

  // §10.4 calculator: illustrative example (every value is an editable assumption or a sourced default)
  var CALC_FIELDS = [
    { k: 'siswa', label: 'Siswa', unit: 'siswa', tag: 'assumption', def: 600, min: 0, max: 100000, step: 1 },
    { k: 'spp', label: 'SPP per siswa', unit: 'Rp / bulan', tag: 'assumption', def: 200000, min: 0, max: 20000000, step: 1000, rp: true,
      hint: 'Acuan terendah, SPP sekolah swasta KJP Plus 2026: SD 130 rb · SMP 170 rb · SMA 290 rb · SMK 240 rb.\nIsi dengan SPP yang berlaku di sekolah itu.' },
    { k: 'bulanSpp', label: 'Bulan SPP per tahun', unit: 'bulan', tag: 'assumption', def: 12, min: 1, max: 12, step: 1 },
    { k: 'porsi', label: 'Porsi siswa yang membayar melalui Mandiri', unit: '%', tag: 'assumption', def: 50, min: 0, max: 100, step: 1, pct: true },
    { k: 'feeTrx', label: 'Fee per transaksi', unit: 'Rp', tag: 'RM rate', def: null, min: 0, max: 100000, step: 100, rp: true,
      hint: 'Tarif Bill Collection tidak dipublikasikan. Tanyakan penawaran RM (Mandiri Call 14000).' },
    { k: 'floatHari', label: 'Lama SPP mengendap di Mandiri', unit: 'hari', tag: 'assumption', def: 10, min: 0, max: 60, step: 1,
      hint: 'Rata-rata hari antara penagihan dan penggunaan dana oleh sekolah.' },
    { k: 'porsiOrtu', label: 'Orang tua yang membuka Tabungan NOW (Referral Biller)', unit: '% siswa', tag: 'assumption', def: 40, min: 0, max: 100, step: 1, pct: true,
      hint: 'Satu keluarga dapat memiliki lebih dari satu anak di sekolah itu. Sesuaikan porsinya.' },
    { k: 'setoranAwal', label: 'Setoran awal Tabungan NOW', unit: 'Rp', tag: 'source', def: 100000, min: 0, max: 10000000, step: 1000, rp: true,
      hint: 'Batas terendah syarat Referral Biller.' },
    { k: 'porsiSimpel', label: 'Siswa yang membuka SimPel atau Next-G', unit: '%', tag: 'assumption', def: 50, min: 0, max: 100, step: 1, pct: true },
    { k: 'saldoSimpel', label: 'Saldo rata-rata SimPel', unit: 'Rp', tag: 'source', def: 366000, min: 0, max: 50000000, step: 1000, rp: true,
      hint: 'Rata-rata nasional, Antara, Mar 2026.' },
    { k: 'spread', label: 'Selisih bunga dana (spread, opsional)', unit: '% per tahun', tag: 'assumption', def: null, min: 0, max: 20, step: 0.1, pct: true, dec: 1,
      hint: 'Mengubah estimasi CASA menjadi pendapatan tahunan. Kosongkan untuk menyembunyikan baris ini.' }
  ];
  var REFERRAL_FEE = 25000, REFERRAL_QUOTA_MONTH = 250, REFERRAL_QUOTA_TOTAL = 3000;
  var SPP_REF = { 1: 130000, 2: 170000, 3: 290000, 4: 240000 };   // KJP Plus 2026 private-school SPP components

  S.config = {
    center: CENTER, levels: LEVELS, statuses: STATUSES, bands: BANDS, matra: MATRA, matraFull: MATRA_FULL,
    studentPresets: STUDENT_PRESETS, stages: STAGES, products: PRODUCTS, pipePrograms: PIPE_PROGRAMS,
    programmes: PROGRAMMES, programmesEnded: PROGRAMMES_ENDED, networks: NETWORKS, competitorNotes: COMPETITOR_NOTES,
    bankingKnown: BANKING_KNOWN, foundationOrg: FOUNDATION_ORG, compliance: COMPLIANCE, gempitaNote: GEMPITA_NOTE,
    calcFields: CALC_FIELDS, referralFee: REFERRAL_FEE, referralQuotaMonth: REFERRAL_QUOTA_MONTH, referralQuotaTotal: REFERRAL_QUOTA_TOTAL,
    sppRef: SPP_REF, dataFile: 'data/schools.js'
  };

  /* ------------------------------------------------------------ events */

  var listeners = {};
  S.on = function (evt, fn) {
    if (typeof fn !== 'function') return function () {};
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () { listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; }); };
  };
  S.emit = function (evt, x) {
    (listeners[evt] || []).slice().forEach(function (fn) { try { fn(x); } catch (e) { if (root.console) root.console.warn('[MCD.schools] ' + evt, e); } });
  };

  /* ------------------------------------------------------------ helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function hav(lon1, lat1, lon2, lat2) {
    var dLat = (lat2 - lat1) * D2R, dLon = (lon2 - lon1) * D2R;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function bandOf(km) { return km < 5 ? 0 : km < 10 ? 1 : km < 15 ? 2 : km < 20 ? 3 : 4; }
  function branchLL() {
    var b = MCD.config && MCD.config.branch;
    return b && isNum(b.lon) && isNum(b.lat) ? [b.lon, b.lat] : [106.90989, -6.33203];
  }
  function fold(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  /** §4.5 normYayasan: accent-folded upper case, non-alphanumerics to single spaces. */
  function normYayasan(s) {
    return fold(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  function entKey(s) { return normYayasan(s).replace(/^(YAYASAN|YYS|YAY)\s+/, ''); }
  function searchKey(s) { return normYayasan(s); }
  function levelOfTni(j) {
    var s = String(j || '').toUpperCase();
    if (/^(TK|KB|PAUD)/.test(s)) return 0;
    if (/^SD/.test(s)) return 1;
    if (/^SMP/.test(s)) return 2;
    if (/^SMA/.test(s)) return 3;
    if (/^SMK/.test(s)) return 4;
    if (/^SLB/.test(s)) return 5;
    return 6;
  }
  function matraCode(m) { var i = MATRA.indexOf(String(m || '').toUpperCase()); return i > 0 ? i : 0; }
  function cleanFoundation(f) { return String(f || '').replace(/\s*\(dugaan\)\s*$/i, '').trim(); }
  function today() {
    var u = MCD.util && MCD.util.date;
    if (u && typeof u.today === 'function') { try { var t = u.today(); if (t) return t; } catch (e) { /* fall through */ } }
    var n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function daysLeft(end, from) {
    var e = parseYmd(end), f = from || today();
    if (!e || !f) return null;
    return Math.round((e.getTime() - f.getTime()) / 86400000);
  }
  S.daysLeft = daysLeft;
  S.normYayasan = normYayasan;
  S.entKey = entKey;
  S.searchKey = searchKey;

  /* ======================================================= index (§4.3–4.5) */

  /**
   * buildIndexFrom(MCD_SCHOOLS, MCD_TNI_SCHOOLS, {branch:[lon,lat]}) → idx. Pure.
   * Merges TNI-foundation rows by NPSN (appends the 7 without a match), keeps the 9
   * colleges and military-education rows apart (dikmil), and builds entities and networks.
   */
  function buildIndexFrom(SD, TD, opts) {
    opts = opts || {};
    var base = (SD && Array.isArray(SD.rows)) ? SD.rows : [];
    var trows = (TD && Array.isArray(TD.rows)) ? TD.rows : [];
    var center = (SD && SD.meta && Array.isArray(SD.meta.center)) ? SD.meta.center : CENTER;
    var br = opts.branch || branchLL();

    // NPSN → base row
    var npsnIndex = new Map();
    for (var i = 0; i < base.length; i++) { var np = base[i][7]; if (np) npsnIndex.set(String(np), i); }

    // TNI schools: match by NPSN or append
    var tniOf = new Map(), appended = [], dikmil = [], matched = 0;
    trows.forEach(function (t, ti) {
      if (t.category !== 'school') { dikmil.push(Object.assign({ ti: ti }, t)); return; }
      var k = t.npsn ? String(t.npsn) : '';
      if (k && npsnIndex.has(k)) { tniOf.set(npsnIndex.get(k), ti); matched++; }
      else appended.push(ti);
    });

    var n = base.length + appended.length;
    var idx = {
      n: n, nBase: base.length, center: center, branch: br,
      lon: new Float64Array(n), lat: new Float64Array(n), jen: new Uint8Array(n), st: new Uint8Array(n),
      stu: new Int32Array(n), inf: new Uint8Array(n), src: new Uint8Array(n), dist: new Float32Array(n),
      distBranch: new Float32Array(n), band: new Uint8Array(n), tni: new Int16Array(n), matra: new Uint8Array(n),
      ent: new Int32Array(n), net: new Int32Array(n), name: new Array(n), nameKey: new Array(n), npsn: new Array(n), yay: new Array(n),
      npsnIndex: new Map(), order: null, tniRows: trows, dikmil: dikmil, tniMatched: matched, tniAppended: appended.length,
      ents: [], entByKey: new Map(), nets: [], netByKey: new Map(), meta: (SD && SD.meta) || {}, tniMeta: (TD && TD.meta) || {}
    };

    function put(j, lon, lat, jen, st, name, yay, stu, npsn, inf, src, ti) {
      idx.lon[j] = lon; idx.lat[j] = lat; idx.jen[j] = jen; idx.st[j] = st;
      idx.name[j] = name || '—'; idx.nameKey[j] = searchKey(name);
      idx.yay[j] = yay || ''; idx.stu[j] = isNum(stu) ? stu : -1;
      idx.npsn[j] = npsn ? String(npsn) : ''; idx.inf[j] = inf ? 1 : 0; idx.src[j] = src;
      var d = hav(center[0], center[1], lon, lat);
      idx.dist[j] = d; idx.band[j] = bandOf(d);
      idx.distBranch[j] = hav(br[0], br[1], lon, lat);
      idx.tni[j] = ti == null ? -1 : ti;
      idx.matra[j] = ti == null ? 0 : matraCode(trows[ti].matra);
      if (idx.npsn[j] && !idx.npsnIndex.has(idx.npsn[j])) idx.npsnIndex.set(idx.npsn[j], j);
    }
    for (i = 0; i < base.length; i++) {
      var r = base[i];
      var ti = tniOf.has(i) ? tniOf.get(i) : null;
      put(i, +r[0], +r[1], r[2] | 0, r[3] | 0, r[4], r[5], r[6], r[7], r[8], r[7] ? 0 : 1, ti);
    }
    appended.forEach(function (ti2, k) {
      var t = trows[ti2];
      put(base.length + k, +t.lon, +t.lat, levelOfTni(t.jenjang), 1, t.name, cleanFoundation(t.foundation), null, t.npsn, 0, 2, ti2);
    });

    // nearest first
    var order = new Int32Array(n);
    for (i = 0; i < n; i++) order[i] = i;
    var dist = idx.dist;
    Array.prototype.sort.call(order, function (a, b) { return dist[a] - dist[b] || a - b; });
    idx.order = order;

    // §4.5 entities
    var spell = new Map();     // key → Map(spelling → count)
    var ents = idx.ents, byKey = idx.entByKey;
    function entity(key, label, kind, extra) {
      var e = byKey.get(key);
      if (!e) {
        e = Object.assign({ i: ents.length, key: key, label: label, kind: kind, tni: '', foundation: '', npyp: '', inferred: false, n: 0, net: -1 }, extra || {});
        ents.push(e); byKey.set(key, e);
      }
      return e;
    }
    for (i = 0; i < n; i++) {
      var e = null, tix = idx.tni[i];
      if (tix >= 0) {
        var t = trows[tix], fnd = cleanFoundation(t.foundation);
        if (t.npyp) e = entity('npyp:' + t.npyp, fnd + ' · ' + (t.branch || 'cabang tidak tercatat'), 'npyp', { tni: MATRA[idx.matra[i]], foundation: fnd, npyp: t.npyp, branch: t.branch || '' });
        else e = entity('tni:' + normYayasan(fnd) + ':dugaan', fnd + ' (cabang tidak tercatat · dugaan)', 'tni', { tni: MATRA[idx.matra[i]], foundation: fnd, inferred: true });
      } else if (idx.yay[i]) {
        var k = entKey(idx.yay[i]);
        if (k) {
          e = entity('y:' + k, idx.yay[i], 'dapodik');
          var m = spell.get(e.key);
          if (!m) { m = new Map(); spell.set(e.key, m); }
          m.set(idx.yay[i], (m.get(idx.yay[i]) || 0) + 1);
        }
      }
      idx.ent[i] = e ? e.i : -1;
      if (e) e.n++;
    }
    spell.forEach(function (m, key) {
      var best = null, bc = -1;
      m.forEach(function (c, sp) { if (c > bc || (c === bc && sp < best)) { best = sp; bc = c; } });
      byKey.get(key).label = best;
    });
    // networks
    ents.forEach(function (e2) {
      var nk, nl, pat = null;
      if (e2.foundation) { nk = 'f:' + normYayasan(e2.foundation); nl = e2.foundation; }
      else {
        var ny = normYayasan(e2.label);
        for (var q = 0; q < NETWORKS.length; q++) if (NETWORKS[q].re.test(ny)) { pat = NETWORKS[q]; break; }
        if (pat) { nk = 'p:' + pat.id; nl = pat.label; } else { nk = 'e:' + e2.key; nl = e2.label; }
      }
      var nw = idx.netByKey.get(nk);
      if (!nw) { nw = { i: idx.nets.length, key: nk, label: nl, pattern: pat ? pat.id : null, tni: e2.tni, foundation: e2.foundation || '', entities: 0 }; idx.nets.push(nw); idx.netByKey.set(nk, nw); }
      nw.entities++;
      e2.net = nw.i;
      e2.netKey = nk; e2.netLabel = nl; e2.pattern = pat ? pat.id : null;
    });
    for (i = 0; i < n; i++) idx.net[i] = idx.ent[i] >= 0 ? ents[idx.ent[i]].net : -1;
    // competitor tags per entity
    ents.forEach(function (e3) { e3.competitors = competitorFor(e3); });
    idx.nets.forEach(function (nw2) { nw2.competitors = competitorFor({ pattern: nw2.pattern, foundation: nw2.foundation }); });
    return idx;
  }
  function competitorFor(e) {
    return COMPETITOR_NOTES.filter(function (c) {
      return (c.net && e.pattern === c.net) || (c.foundation && e.foundation === c.foundation);
    });
  }
  S.buildIndexFrom = buildIndexFrom;

  /* ============================================ SMA only (product decision 14) */

  var RE_SMA = /\b(SMA|SMAN|SMAS|SMAK|SMAIT|SMAI|SMU|SMTK|SLTA)\b|SEKOLAH\s+MENENGAH\s+ATAS|SEKOLAH\s+RAKYAT\s+MENENGAH\s+ATAS|HIGH\s+SCHOOL|SENIOR\s+(HIGH|SECONDARY)/i;
  var RE_MA = /^(MA|MAN|MAS|MAK|MAU|MA'?HAD|PDF|SPM|TMI)\b|MADRASAH\s+ALIYAH|\bALIYAH\b|\bULYA\b|\bPESANTREN\b|MUADALAH/i;
  /**
   * smaClass(name, hasNpsn) → 1 SMA · 2 MA (madrasah aliyah and pesantren equivalents) · 0 other.
   * For rows of the SMA/MA level only. Dapodik rows (with an NPSN) are SMA unless the name says MA;
   * OpenStreetMap / Overture rows (no NPSN) must also look like an SMA by name.
   */
  function smaClass(name, hasNpsn) {
    var n = String(name || '').trim();
    if (RE_MA.test(n) && !/\bSMA/i.test(n)) return 2;
    if (hasNpsn) return 1;
    return RE_SMA.test(n) ? 1 : 0;
  }
  S.smaClass = smaClass;
  /** isSma(idx, i) → true for an SMA (not MA, not a non-school row) of the SMA/MA level. */
  function isSma(idx, i, withMA) {
    if (!idx || idx.jen[i] !== 3) return false;
    var c = smaClass(idx.name[i], !!idx.npsn[i]);
    return c === 1 || (!!withMA && c === 2);
  }
  S.isSma = isSma;
  /**
   * smaCount(km, {withMA}) → SMA within km of the Mabes TNI centre (the count the Schools section and the
   * Overview door both show), or null while the school list is not loaded.
   */
  S.smaCount = function (km, opts) {
    var idx = S.idx;
    if (!idx) return null;
    var lim = isNum(km) ? km : 15, withMA = !!(opts && opts.withMA), n = 0;
    for (var i = 0; i < idx.n; i++) if (idx.dist[i] <= lim && isSma(idx, i, withMA)) n++;
    return n;
  };

  /** Builds S.idx from the window globals (after ensureData). */
  S.buildIndex = function () {
    S.idx = buildIndexFrom(root.MCD_SCHOOLS, root.MCD_TNI_SCHOOLS);
    S.ready = true;
    return S.idx;
  };

  /** Lazy data (§2.4): classic script injection, never fetch. Resolves with the index. */
  S.ensureData = function () {
    if (S.idx && S.ready) return Promise.resolve(S.idx);
    if (S._p) return S._p;
    var doc = root.document;
    function load(src) {
      return new Promise(function (res, rej) {
        if (!doc) { rej(new Error('no document')); return; }
        var s = doc.createElement('script');
        s.src = src; s.async = false;
        s.addEventListener('load', function () { res(); });
        s.addEventListener('error', function () { if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('Tidak dapat memuat ' + src)); });
        doc.head.appendChild(s);
      });
    }
    S.loading = true;
    S._p = Promise.all([
      root.MCD_SCHOOLS ? 0 : load('data/schools.js'),
      root.MCD_TNI_SCHOOLS ? 0 : load('data/tni-schools.js'),
      /* students per SMA (items 26, 29): optional, the school list still works without it */
      root.MCD_SMA_STUDENTS ? 0 : load('data/sma-students.js').catch(function () { S.studentsFailed = true; return 0; })
    ]).then(function () {
      if (!root.MCD_SCHOOLS || !Array.isArray(root.MCD_SCHOOLS.rows)) throw new Error('MCD_SCHOOLS missing');
      S.buildIndex();
      S.loading = false;
      S.failed = false;
      S.emit('ready', S.idx);
      return S.idx;
    }, function (e) { throw e; }).catch(function (e) {
      S._p = null; S.loading = false; S.failed = true;
      S.emit('failed', e);
      throw e;
    });
    return S._p;
  };

  /* ================================================ v6 lazy data (docs/V6_SPEC.md §9.1) */

  /*
   * The three school files of v6, each one classic script loaded after sign-in, never linked in index.html and never
   * fetched: MCD.app.lazy(name) when the shell knows the name (SHELL lane), else one script injection here.
   *   school-students   data/school-students.js   MCD_SCHOOL_STUDENTS    (first 30 km scope, first SMK / MA switch, idle)
   *   institution-tiers data/institution-tiers.js MCD_INSTITUTION_TIERS  (idle after mount, a kelas biaya chip or fold)
   *   school-contacts   data/school-contacts.js   MCD_SCHOOL_CONTACTS    (first school card, a CSV export, idle)
   * dataStatus(name) → 'idle' | 'loading' | 'ready' | 'error'; every change emits 'data' {name, state}.
   */
  var LAZY_FILES = {
    'school-students': { src: 'data/school-students.js', global: 'MCD_SCHOOL_STUDENTS' },
    'institution-tiers': { src: 'data/institution-tiers.js', global: 'MCD_INSTITUTION_TIERS' },
    'school-contacts': { src: 'data/school-contacts.js', global: 'MCD_SCHOOL_CONTACTS' }
  };
  var LAZY_STATE = {}, LAZY_P = {};
  function usable(g) { return !!g && Array.isArray(g.rows) && !!(g.meta && g.meta.generated); }
  function setLazy(name, state) { if (LAZY_STATE[name] === state) return; LAZY_STATE[name] = state; S.emit('data', { name: name, state: state }); }
  S.lazyFiles = LAZY_FILES;
  S.dataStatus = function (name) {
    var f = LAZY_FILES[name];
    if (!f) return 'error';
    if (usable(root[f.global])) return 'ready';
    return LAZY_STATE[name] || 'idle';
  };
  function injectScript(src) {
    var doc = root.document;
    return new Promise(function (res, rej) {
      if (!doc || typeof doc.createElement !== 'function' || !doc.head) { rej(new Error('no document')); return; }
      var s = doc.createElement('script');
      s.src = src; s.async = true;
      s.addEventListener('load', function () { res(); });
      s.addEventListener('error', function () { if (s.parentNode) s.parentNode.removeChild(s); rej(new Error('Tidak dapat memuat ' + src)); });
      doc.head.appendChild(s);
    });
  }
  /** lazy(name) → Promise<global>: one load per name at a time; a failed load can be tried again ("Coba lagi"). */
  S.lazy = function (name) {
    var f = LAZY_FILES[name];
    if (!f) return Promise.reject(new Error('unknown data: ' + name));
    if (usable(root[f.global])) { setLazy(name, 'ready'); return Promise.resolve(root[f.global]); }
    if (LAZY_P[name]) return LAZY_P[name];
    setLazy(name, 'loading');
    var A = MCD.app;
    function own() { return injectScript(f.src).then(function () { if (!usable(root[f.global])) throw new Error(f.global + ' missing'); return root[f.global]; }); }
    var p = (A && typeof A.lazy === 'function'
      ? Promise.resolve().then(function () { return A.lazy(name); }).then(function (g) { return usable(g) ? g : (usable(root[f.global]) ? root[f.global] : own()); },
        function (e) { if (/unknown lazy data/i.test(String(e && e.message))) return own(); throw e; })
      : own());
    LAZY_P[name] = p.then(function (g) { LAZY_P[name] = null; setLazy(name, 'ready'); return g; },
      function (e) { LAZY_P[name] = null; setLazy(name, 'error'); throw e; });
    return LAZY_P[name];
  };

  /* ============================================================ filters (§7) */

  S.defaultFilters = function () {
    return { jen: [], st: [], tniOnly: false, matra: [], bands: [], stu: null, stuUnknown: true, untapped: false, hideInf: false };
  };
  function normFilters(f) {
    var d = S.defaultFilters();
    f = f || {};
    function ints(a, max) { return Array.isArray(a) ? a.map(Number).filter(function (x) { return x >= 0 && x <= max && Math.floor(x) === x; }).filter(function (x, i, arr) { return arr.indexOf(x) === i; }).sort() : []; }
    d.jen = ints(f.jen, 6); d.st = ints(f.st, 2); d.bands = ints(f.bands, 4);
    d.matra = ints(f.matra, 3).filter(function (x) { return x > 0; });
    d.tniOnly = !!f.tniOnly; d.untapped = !!f.untapped; d.hideInf = !!f.hideInf;
    d.stu = Array.isArray(f.stu) && f.stu.length === 2 && isNum(+f.stu[0]) && isNum(+f.stu[1]) ? [+f.stu[0], +f.stu[1]] : null;
    d.stuUnknown = f.stuUnknown == null ? !d.stu : !!f.stuUnknown;
    return d;
  }
  S.normFilters = normFilters;
  S.filterSig = function (f) { f = normFilters(f); return JSON.stringify([f.jen, f.st, f.tniOnly ? 1 : 0, f.matra, f.bands, f.stu, f.stuUnknown ? 1 : 0, f.untapped ? 1 : 0, f.hideInf ? 1 : 0]); };
  S.filtersActive = function (f) {
    f = normFilters(f);
    return !!(f.jen.length || f.st.length || f.tniOnly || f.matra.length || f.bands.length || f.stu || f.untapped || f.hideInf);
  };

  // dimension bits for facet counts (§D.5: a facet ignores its own dimension)
  var B_JEN = 1, B_ST = 2, B_TNI = 4, B_MATRA = 8, B_BAND = 16, B_STU = 32, B_UNT = 64, B_INF = 128;

  function failMask(idx, i, f, sets, rel) {
    var m = 0;
    if (sets.jen && !sets.jen[idx.jen[i]]) m |= B_JEN;
    if (sets.st && !sets.st[idx.st[i]]) m |= B_ST;
    if (f.tniOnly && idx.tni[i] < 0) m |= B_TNI;
    if (sets.matra && !(idx.tni[i] < 0 && !f.tniOnly) && !sets.matra[idx.matra[i]]) m |= B_MATRA;
    if (sets.bands && !sets.bands[idx.band[i]]) m |= B_BAND;
    if (f.stu) {
      var s = idx.stu[i];
      if (s >= 0 ? (s < f.stu[0] || s > f.stu[1]) : !f.stuUnknown) m |= B_STU;
    }
    if (f.untapped && rel && isActive(rel, idx, i)) m |= B_UNT;
    if (f.hideInf && idx.inf[i]) m |= B_INF;
    return m;
  }
  function setOf(a, size) { if (!a || !a.length) return null; var s = new Uint8Array(size); a.forEach(function (x) { s[x] = 1; }); return s; }

  /** Passing row indices (nearest first). Pure. */
  S.filterRows = function (idx, f, rel) {
    f = normFilters(f);
    var sets = { jen: setOf(f.jen, 7), st: setOf(f.st, 3), matra: setOf(f.matra, 4), bands: setOf(f.bands, 5) };
    var out = [];
    for (var k = 0; k < idx.n; k++) { var i = idx.order[k]; if (!failMask(idx, i, f, sets, rel)) out.push(i); }
    return Int32Array.from(out);
  };

  function isActive(rel, idx, i) {
    if (!rel) return false;
    var r = rel.byRow.get(i);
    if (r && r.status === 'nasabah') return true;
    var e = idx.ent[i];
    if (e >= 0) { var re = rel.byEntity.get(e); if (re && re.status === 'nasabah') return true; }
    return false;
  }
  S.isActive = isActive;
  /** Relationship of one school: 'active' | 'prospect' | null (null also before an import). */
  S.relationOf = function (rel, idx, i) {
    if (!rel) return null;
    var r = rel.byRow.get(i), e = idx.ent[i], re = e >= 0 ? rel.byEntity.get(e) : null;
    if ((r && r.status === 'nasabah') || (re && re.status === 'nasabah')) return 'active';
    if (r || re) return 'prospect';
    return null;
  };

  /* ============================================================ derive (§4.6) */

  function newAgg(e) {
    return { e: e, n: 0, core: 0, jen: [0, 0, 0, 0, 0, 0, 0], students: 0, studentsN: 0, dmin: Infinity, dmax: 0, rows: [], active: false, prospect: false, held: {} };
  }

  /**
   * derive(idx, filters, rel) → {sig, rows, kpi, facets, ledger, ents, entAgg, cells?}. Pure.
   * ents: aggregates over passing rows for every entity with ≥ 1 passing row (with score, fit).
   */
  S.derive = function (idx, filters, rel) {
    var f = normFilters(filters);
    var sets = { jen: setOf(f.jen, 7), st: setOf(f.st, 3), matra: setOf(f.matra, 4), bands: setOf(f.bands, 5) };
    var rows = [];
    var kpi = { schools: 0, dapodik: 0, osm: 0, tniAppended: 0, negeri: 0, swasta: 0, unknown: 0, studentsKnown: 0, studentsSchools: 0,
      tni: { n: 0, AL: 0, AU: 0, AD: 0 }, entities: { n: 0, ge2: 0, tni: 0, sizes: [0, 0, 0, 0] }, penetration: null, core: 0 };
    var facets = { jen: [0, 0, 0, 0, 0, 0, 0], st: [0, 0, 0], bands: [0, 0, 0, 0, 0], matra: [0, 0, 0, 0], tniOnly: 0, stuBuckets: [0, 0, 0, 0, 0], inf: 0, untapped: 0 };
    var ledger = LEVELS.map(function (l) { return { jen: l.i, negeri: 0, swasta: 0, unknown: 0, students: 0, studentsN: 0, total: 0 }; });
    var aggs = new Map();
    var activeRows = 0;
    for (var k = 0; k < idx.n; k++) {
      var i = idx.order[k];
      var m = failMask(idx, i, f, sets, rel);
      if ((m & ~B_JEN) === 0) facets.jen[idx.jen[i]]++;
      if ((m & ~B_ST) === 0) facets.st[idx.st[i]]++;
      if ((m & ~B_BAND) === 0) facets.bands[idx.band[i]]++;
      if ((m & ~(B_MATRA | B_TNI)) === 0 && idx.tni[i] >= 0) { facets.matra[idx.matra[i]]++; facets.tniOnly++; }
      if ((m & ~B_STU) === 0 && idx.stu[i] >= 0) {
        var s0 = idx.stu[i];
        facets.stuBuckets[s0 < 100 ? 0 : s0 < 300 ? 1 : s0 < 600 ? 2 : s0 < 1000 ? 3 : 4]++;
      }
      if ((m & ~B_INF) === 0 && idx.inf[i]) facets.inf++;
      if (m) continue;
      rows.push(i);
      kpi.schools++;
      if (idx.src[i] === 1) kpi.osm++; else kpi.dapodik++;
      var st = idx.st[i];
      if (st === 0) kpi.negeri++; else if (st === 1) kpi.swasta++; else kpi.unknown++;
      if (idx.band[i] <= 2) kpi.core++;
      var L = ledger[idx.jen[i]];
      L.total++;
      if (st === 0) L.negeri++; else if (st === 1) L.swasta++; else L.unknown++;
      var stu = idx.stu[i];
      if (stu >= 0) { L.students += stu; L.studentsN++; if (st === 1) { kpi.studentsKnown += stu; kpi.studentsSchools++; } }
      if (idx.tni[i] >= 0) { kpi.tni.n++; var mt = MATRA[idx.matra[i]]; if (mt) kpi.tni[mt]++; }
      var act = rel ? isActive(rel, idx, i) : false;
      if (act) activeRows++;
      else if (rel) facets.untapped++;
      var e = idx.ent[i];
      if (e >= 0) {
        var a = aggs.get(e);
        if (!a) { a = newAgg(e); aggs.set(e, a); }
        a.n++;
        if (idx.band[i] <= 2) a.core++;
        a.jen[idx.jen[i]]++;
        if (stu >= 0) { a.students += stu; a.studentsN++; }
        var d = idx.dist[i];
        if (d < a.dmin) a.dmin = d;
        if (d > a.dmax) a.dmax = d;
        a.rows.push(i);
        if (act) a.anyActiveRow = true;
      }
    }
    var ents = [];
    aggs.forEach(function (a) {
      var E = idx.ents[a.e];
      a.key = E.key; a.label = E.label; a.tni = E.tni; a.kind = E.kind; a.foundation = E.foundation; a.npyp = E.npyp;
      a.netKey = E.netKey; a.netLabel = E.netLabel; a.pattern = E.pattern; a.inferred = E.inferred; a.competitors = E.competitors || [];
      a.nAll = E.n;
      var sc = score(a);
      a.score = sc.score; a.parts = sc.parts;
      a.fit = fit(a);
      if (rel) {
        var re = rel.byEntity.get(a.e);
        a.active = !!(re && re.status === 'nasabah');
        a.prospect = !!(re && re.status !== 'nasabah');
        a.held = {};
        if (re) re.products.forEach(function (p) { a.held[p] = 1; });
        a.rows.forEach(function (ri) { var rr = rel.byRow.get(ri); if (rr) rr.products.forEach(function (p) { a.held[p] = 1; }); });
        a.anyRel = a.active || a.prospect || a.rows.some(function (ri) { return rel.byRow.has(ri); });
      }
      ents.push(a);
      kpi.entities.n++;
      if (a.n >= 2) kpi.entities.ge2++;
      if (a.tni) kpi.entities.tni++;
      kpi.entities.sizes[a.n === 1 ? 0 : a.n <= 4 ? 1 : a.n <= 9 ? 2 : 3]++;
    });
    if (rel) {
      var activeEnts = ents.filter(function (a2) { return a2.active || a2.anyActiveRow; }).length;
      kpi.penetration = { entities: ents.length, active: activeEnts, share: ents.length ? activeEnts / ents.length : null,
        schoolsCovered: activeRows, schoolsShare: rows.length ? activeRows / rows.length : null };
    }
    return { sig: S.filterSig(f) + '|' + (rel ? rel.version : 0), filters: f, rows: Int32Array.from(rows), kpi: kpi, facets: facets, ledger: ledger, ents: ents, dikmil: idx.dikmil.length };
  };

  /** Board rows (§9.4): entity or network mode, sorted, optionally searched. */
  S.board = function (d, opts) {
    opts = opts || {};
    var mode = opts.mode === 'network' ? 'network' : 'entity';
    var list = d.ents;
    if (mode === 'network') {
      var by = new Map();
      d.ents.forEach(function (a) {
        var g = by.get(a.netKey);
        if (!g) {
          g = { key: a.netKey, label: a.netLabel, tni: a.tni, foundation: a.foundation, pattern: a.pattern, network: true, members: [], n: 0, core: 0,
            jen: [0, 0, 0, 0, 0, 0, 0], students: 0, studentsN: 0, dmin: Infinity, dmax: 0, rows: [], competitors: a.competitors, active: false, prospect: false, held: {} };
          by.set(a.netKey, g);
        }
        g.members.push(a); g.n += a.n; g.core += a.core; g.students += a.students; g.studentsN += a.studentsN;
        for (var j = 0; j < 7; j++) g.jen[j] += a.jen[j];
        g.dmin = Math.min(g.dmin, a.dmin); g.dmax = Math.max(g.dmax, a.dmax);
        g.rows = g.rows.concat(a.rows);
        if (a.active) g.active = true;
        if (a.prospect) g.prospect = true;
        Object.keys(a.held || {}).forEach(function (p) { g.held[p] = 1; });
      });
      list = [];
      by.forEach(function (g) { var sc = score(g); g.score = sc.score; g.parts = sc.parts; g.fit = fit(g); g.entities = g.members.length; list.push(g); });
    }
    if (opts.q) {
      var q = searchKey(opts.q);
      list = list.filter(function (a) { return searchKey(a.label).indexOf(q) >= 0 || (a.npyp && a.npyp.indexOf(q) >= 0) || (a.netLabel && searchKey(a.netLabel).indexOf(q) >= 0); });
    }
    var key = (opts.sort && opts.sort.key) || 'schools';
    var dir = (opts.sort && opts.sort.dir) || (key === 'nearest' ? 1 : -1);
    var val = {
      schools: function (a) { return a.n; }, students: function (a) { return a.students; },
      nearest: function (a) { return a.dmin; }, score: function (a) { return a.score; }, core: function (a) { return a.core; }
    }[key] || function (a) { return a.n; };
    return list.slice().sort(function (a, b) {
      var c = (val(a) - val(b)) * dir;
      if (c) return c;
      return (b.n - a.n) || (b.students - a.students) || (a.dmin - b.dmin) || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
    });
  };

  /* ===================================================== formulas (§10.2–10.4) */

  function r1(x) { return Math.round(x * 10 + 1e-9) / 10; }
  /** §10.2 opportunity score (canvassing heuristic; weights are assumptions). */
  function score(e) {
    var n = e.n || 0, stu = e.students || 0, dmin = isNum(e.dmin) ? e.dmin : Infinity, j = e.jen || [0, 0, 0, 0, 0, 0, 0];
    var size = Math.max(Math.min(1, stu / 2000), 0.5 * Math.min(1, n / 10));
    var reach = Math.min(1, n / 10);
    var prox = dmin <= 5 ? 1 : dmin <= 10 ? 0.75 : dmin <= 15 ? 0.5 : dmin <= 20 ? 0.3 : 0.15;
    var tni = e.tni === 'AL' ? 1 : (e.tni === 'AU' || e.tni === 'AD') ? 2 / 3 : 0;
    var fitj = n ? (j[0] + j[3] + j[4] + j[6]) / n : 0;
    var parts = { size: 35 * size, reach: 20 * reach, prox: 20 * prox, tni: 15 * tni, fit: 10 * fitj };
    var total = parts.size + parts.reach + parts.prox + parts.tni + parts.fit;
    return { score: r1(total), parts: parts };
  }
  S.score = score;

  /** §10.3 product fit (1 Low · 2 Medium · 3 High; 0 = not applicable); flags and prerequisites. */
  function fit(e) {
    var n = e.n || 0, stu = e.students || 0, j = e.jen || [0, 0, 0, 0, 0, 0, 0];
    var big = stu >= 1000 || n >= 5, mid = stu >= 300 || n >= 2;
    var share = n ? (j[0] + j[3] + j[4] + j[6]) / n : 0;
    var basic = n ? (j[1] + j[2]) / n : 0;
    var sec = j[2] + j[3] + j[4];
    var COLL = mid && share >= 0.5 ? 3 : mid ? 2 : 1;
    var TAB = (n && j[6] === n) ? 0 : ((j[0] + j[1] + j[2]) >= 0.5 * n && mid) ? 3 : mid ? 2 : 1;
    var LVM = sec >= 1 && big ? 3 : (sec >= 1 || mid) ? 2 : 1;
    /* Tabungan SimPel: pupils under 17 (TK to SMA; not for universities), opened with a parent or guardian */
    var SIMPEL = (n && j[6] === n) ? 0 : big ? 3 : mid ? 2 : 1;
    return {
      COLL: { v: COLL, flags: basic >= 0.5 ? ['MK'] : [], pre: null },
      TAB: { v: TAB, flags: [], pre: null },
      SIMPEL: { v: SIMPEL, flags: [], pre: null },
      LVM: { v: LVM, flags: ['MDR'], pre: null },
      inputs: { n: n, stu: stu, share: share, basic: basic, big: big, mid: mid }
    };
  }
  S.fit = fit;
  S.fitLabel = function (v) { return v === 3 ? 'Tinggi' : v === 2 ? 'Sedang' : v === 1 ? 'Rendah' : 'Tidak berlaku'; };
  S.flagText = {
    MK: 'Putusan MK 3/PUU-XXII/2024 (SD/SMP bebas biaya) dapat mengurangi SPP di SD dan SMP. Pelaksanaannya masih disimulasikan pada Jun 2026.',
    MDR: 'MDR QRIS 0% untuk transaksi sampai Rp100.000 sejak 1 Okt 2026.\nNilai kantin bagi bank berasal dari dana mengendap dan data transaksi, tidak dari fee.'
  };

  /** §10.4 SPP reference: school-count-weighted KJP Plus mean over SD/SMP/SMA/SMK, nearest Rp 1,000. */
  S.sppRef = function (e) {
    var j = e.jen || [], num = 0, den = 0;
    [1, 2, 3, 4].forEach(function (k) { num += (j[k] || 0) * SPP_REF[k]; den += (j[k] || 0); });
    return den ? Math.round(num / den / 1000) * 1000 : null;
  };

  S.calcDefaults = function () { var o = {}; CALC_FIELDS.forEach(function (fd) { o[fd.k] = fd.def; }); return o; };

  /** §10.4 economics calculator. Inputs: percentages as 0–100. Missing inputs → null outputs (never 0). */
  S.calc = function (inp) {
    inp = Object.assign(S.calcDefaults(), inp || {});
    function v(k) { var x = inp[k]; return x === '' || x == null || !isNum(+x) ? null : +x; }
    function mul() { var p = 1; for (var a = 0; a < arguments.length; a++) { if (arguments[a] == null) return null; p *= arguments[a]; } return p; }
    var M = 365 / 12;
    var siswa = v('siswa'), spp = v('spp'), porsi = v('porsi') == null ? null : v('porsi') / 100, bulan = v('bulanSpp');
    var feeTrx = v('feeTrx'), floatH = v('floatHari');
    var porsiOrtu = v('porsiOrtu') == null ? null : v('porsiOrtu') / 100, setoran = v('setoranAwal');
    var porsiSim = v('porsiSimpel') == null ? null : v('porsiSimpel') / 100, saldoSim = v('saldoSimpel');
    var spread = v('spread') == null ? null : v('spread') / 100;
    var o = {};
    o.V = mul(siswa, spp, porsi);
    o.N = siswa == null || porsi == null ? null : Math.round(siswa * porsi);
    o.feeColl = o.N == null || feeTrx == null ? null : o.N * feeTrx;
    o.feeCollYear = o.feeColl == null || bulan == null ? null : o.feeColl * bulan;
    o.sppFloat = o.V == null || floatH == null ? null : o.V * floatH / M;
    o.parents = siswa == null || porsiOrtu == null ? null : Math.round(siswa * porsiOrtu);
    o.capped = o.parents != null && o.parents > REFERRAL_QUOTA_TOTAL;
    o.tabAcc = o.parents == null ? null : Math.min(o.parents, REFERRAL_QUOTA_TOTAL);
    o.tabMonths = o.tabAcc == null ? null : Math.ceil(o.tabAcc / REFERRAL_QUOTA_MONTH);
    o.refFee = o.tabAcc == null ? null : o.tabAcc * REFERRAL_FEE;
    o.tabCasa = o.tabAcc == null || setoran == null ? null : o.tabAcc * setoran;
    o.simAcc = siswa == null || porsiSim == null ? null : Math.round(siswa * porsiSim);
    o.simCasa = o.simAcc == null || saldoSim == null ? null : o.simAcc * saldoSim;
    var casaParts = [o.sppFloat, o.tabCasa, o.simCasa];
    o.casaPartial = casaParts.some(function (x) { return x == null; });
    o.casa = casaParts.every(function (x) { return x == null; }) ? null : casaParts.reduce(function (s, x) { return s + (x || 0); }, 0);
    o.feeMonthPartial = o.feeColl == null;
    o.feeMonth = o.feeColl;
    o.feeYear = o.feeCollYear;
    o.nii = o.casa == null || spread == null ? null : o.casa * spread;
    return o;
  };

  /* ================================================= customers (§11.4, 8_sekolah) */

  var PRODUCT_OF_IMPORT = {};
  PRODUCTS.forEach(function (p) { p.import.forEach(function (c) { PRODUCT_OF_IMPORT[c] = p.id; }); });

  function bigrams(s) { var out = new Map(); for (var i = 0; i < s.length - 1; i++) { var b = s.substr(i, 2); out.set(b, (out.get(b) || 0) + 1); } return out; }
  function dice(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    var A = bigrams(a), B = bigrams(b), inter = 0, na = 0, nb = 0;
    A.forEach(function (c, k) { na += c; if (B.has(k)) inter += Math.min(c, B.get(k)); });
    B.forEach(function (c) { nb += c; });
    return na + nb ? 2 * inter / (na + nb) : 0;
  }
  var STOP = /\b(PERGURUAN|PENDIDIKAN|LEMBAGA|BADAN|CABANG|PUSAT|YPI|YP|YPK|DAN)\b/g;
  function diceKey(s) { return entKey(s).replace(STOP, ' ').replace(/\s+/g, ''); }
  S.dice = dice;

  /**
   * matchCustomers(idx, records) → rel. records: MCD.data.sekolah ({npsn, name, foundation, status:
   * 'nasabah'|'prospek', products:[VA_SPP, TABUNGAN, SIMPEL, LVM, …]}); other product codes are ignored.
   * Strong matches only: NPSN → school; NPYP or exact foundation key → entity. Name-similar
   * foundations are listed as possible matches and never counted (§11.4: they need confirmation).
   */
  S.matchCustomers = function (idx, records, opts) {
    var rel = { byRow: new Map(), byEntity: new Map(), unmatched: [], matched: 0, total: 0, version: (opts && opts.version) || 1, demo: !!(opts && opts.demo) };
    if (!idx || !Array.isArray(records)) return rel;
    var npypKeys = new Map();
    idx.ents.forEach(function (e) { if (e.npyp) npypKeys.set(String(e.npyp).toUpperCase(), e.i); });
    function merge(map, k, rec) {
      var cur = map.get(k);
      var prods = (rec.products || []).map(function (p) { return PRODUCT_OF_IMPORT[p]; }).filter(Boolean);
      var st = rec.status === 'prospek' ? 'prospek' : 'nasabah';
      if (!cur) { cur = { status: st, products: [], records: [] }; map.set(k, cur); }
      if (st === 'nasabah') cur.status = 'nasabah';
      prods.forEach(function (p) { if (cur.products.indexOf(p) < 0) cur.products.push(p); });
      cur.records.push(rec);
      return cur;
    }
    records.forEach(function (rec) {
      if (!rec) return;
      rel.total++;
      var done = false, npsn = rec.npsn ? String(rec.npsn).replace(/\D/g, '') : '';
      if (npsn && idx.npsnIndex.has(npsn)) { merge(rel.byRow, idx.npsnIndex.get(npsn), rec); done = true; }
      var fnd = rec.foundation ? String(rec.foundation).trim() : '';
      if (fnd) {
        var up = fnd.toUpperCase().replace(/\s+/g, '');
        if (/^[A-Z]{2}\d{4}$/.test(up) && npypKeys.has(up)) { merge(rel.byEntity, npypKeys.get(up), rec); done = true; }
        else {
          var ek = idx.entByKey.get('y:' + entKey(fnd));
          if (ek) { merge(rel.byEntity, ek.i, rec); done = true; }
        }
      }
      if (done) { rel.matched++; return; }
      // possible matches for the report (display only)
      var best = null, bs = 0;
      if (fnd) {
        var dk = diceKey(fnd);
        idx.ents.forEach(function (e) { var s2 = dice(dk, diceKey(e.label)); if (s2 > bs) { bs = s2; best = e; } });
      }
      rel.unmatched.push({ name: rec.name || fnd || rec.npsn || '—', npsn: npsn || null, foundation: fnd || null, status: rec.status,
        possible: best && bs >= 0.85 ? { label: best.label, key: best.key, score: Math.round(bs * 1000) / 1000 } : null });
    });
    return rel;
  };

  /* ============================================================ pipeline (§9.8) */

  /*
   * v6 (docs/V6_SPEC.md §7, D8): the list is sealed. With MCD.seal (assets/js/seal.js, the SEAL lane) S.pipeline
   * delegates to MCD.seal.pipeline('schools.pipeline', …), which keeps this exact synchronous API, encrypts every write
   * with the gate's session key, migrates the old plain key once and merges the copy in the encrypted file. Without
   * MCD.seal (Node tests, an old shell) the list lives in memory only: it is never written as plain text. The old plain
   * list (mcd.schools.pipeline.v1) is read once so staff still see it, but it is never written back or removed here.
   */
  var PIPE_KEY = 'mcd.schools.pipeline.v1';
  var PIPE_NAME = 'schools.pipeline';
  var PIPE_KEY_RE = /^(npyp|tni|y|npsn|f|p|e):/;
  var GEMPITA_RB = 'Sekolah tidak dapat mengikuti Bill Reminder dan GEMPITA bersamaan (ketentuan GEMPITA 2026).';
  var pipeMem = null;
  function pipeLoad() {
    if (pipeMem) return pipeMem;
    var raw = null;
    try { var st = MCD.util && MCD.util.storage; raw = st ? st.get(PIPE_KEY, null) : null; } catch (e) { raw = null; }
    pipeMem = {};
    if (raw && raw.v === 1 && raw.data && typeof raw.data === 'object') {
      Object.keys(raw.data).forEach(function (k) { if (PIPE_KEY_RE.test(k) && raw.data[k] && typeof raw.data[k] === 'object') pipeMem[k] = raw.data[k]; });
    }
    return pipeMem;
  }
  function pipeSave() { S.emit('pipeline', pipeMem); }
  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, max); }
  function validStage(s) { return STAGES.some(function (x) { return x.id === s; }) ? s : 'baru'; }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }
  /** GEMPITA and Referral Biller never run together on related keys (§9.8): the check the sealed pipeline runs too. */
  function gempitaRule(k, patch, all, meta) {
    if (!patch || !('program' in patch)) return null;
    var p = patch.program === 'RB' || patch.program === 'GEMPITA' ? patch.program : '';
    var other = p === 'RB' ? 'GEMPITA' : p === 'GEMPITA' ? 'RB' : null;
    var related = (meta && meta.relatedKeys) || [];
    all = all || {};
    if (other && related.some(function (rk) { return rk !== k && all[rk] && all[rk].program === other; })) return GEMPITA_RB;
    return null;
  }
  S.gempitaRule = gempitaRule;
  var memPipe = {
    key: PIPE_KEY,
    all: function () { return pipeLoad(); },
    get: function (k) { return pipeLoad()[k] || null; },
    persisted: function () { return false; },
    ready: function () { return Promise.resolve(true); },
    status: function () { return 'memory'; },
    /** set(key, patch) → {ok, entry, error}. Refuses GEMPITA + Referral Biller on the same foundation (§9.8). */
    set: function (k, patch, meta) {
      if (!k) return { ok: false, error: 'Belum ada yayasan yang dipilih.' };
      var all = pipeLoad(), cur = all[k] || { stage: 'baru', owner: '', products: [], program: '', nextStep: '', nextDate: '', lastContact: '', note: '', history: [], t: '' };
      var next = Object.assign({}, cur);
      patch = patch || {};
      if ('program' in patch) {
        var p = patch.program === 'RB' || patch.program === 'GEMPITA' ? patch.program : '';
        var bad = gempitaRule(k, patch, all, meta);
        if (bad) return { ok: false, error: bad };
        next.program = p;
      }
      if ('stage' in patch) {
        var s2 = validStage(patch.stage);
        if (s2 !== cur.stage || !cur.history.length) next.history = (cur.history || []).concat([{ stage: s2, t: nowIso() }]).slice(-20);
        next.stage = s2;
      }
      if ('owner' in patch) next.owner = cleanText(patch.owner, 60);
      if ('nextStep' in patch) next.nextStep = cleanText(patch.nextStep, 120);
      if ('note' in patch) next.note = cleanText(patch.note, 500);
      ['nextDate', 'lastContact'].forEach(function (f) { if (f in patch) next[f] = /^\d{4}-\d{2}-\d{2}$/.test(String(patch[f] || '')) ? patch[f] : ''; });
      if ('products' in patch) next.products = (Array.isArray(patch.products) ? patch.products : []).filter(function (x) { return PRODUCTS.some(function (q) { return q.id === x; }); });
      if (meta && meta.label) next.label = cleanText(meta.label, 160);
      next.t = nowIso();
      all[k] = next;
      pipeSave();
      return { ok: true, entry: next };
    },
    /**
     * quickAdd(key, label) → {ok, entry, existed, error}: the "+ Tindak lanjut" button of an SMA card (v5, item 43).
     * A new entry starts at stage 'baru' (Belum dihubungi); an entry that is already in the list is left as it is.
     */
    quickAdd: function (k, label) {
      if (!k) return { ok: false, error: 'SMA ini tidak memiliki NPSN. Tambahkan yayasannya ke tindak lanjut.' };
      var cur = pipeLoad()[k];
      if (cur) return { ok: true, entry: cur, existed: true };
      var res = memPipe.set(k, { stage: 'baru' }, { label: label || '' });
      if (res && res.ok) res.existed = false;
      return res;
    },
    remove: function (k) { var all = pipeLoad(); if (all[k]) { delete all[k]; pipeSave(); } },
    clear: function () { pipeMem = {}; pipeSave(); },
    count: function () { return Object.keys(pipeLoad()).length; },
    /** Keys of the list that are no longer in the data (knownKeys: a Set, an array or a function key → bool). */
    orphans: function (known) {
      var has = typeof known === 'function' ? known : known instanceof Set ? function (k) { return known.has(k); } : Array.isArray(known) ? function (k) { return known.indexOf(k) >= 0; } : function () { return true; };
      return Object.keys(pipeLoad()).filter(function (k) { return !has(k); });
    },
    exportJson: function () { return JSON.stringify({ v: 1, kind: 'mcd.schools.pipeline', exported: nowIso(), data: pipeLoad() }, null, 1); },
    /** Merges by key; the newer `t` wins. → {added, updated, kept} */
    importJson: function (text) {
      var obj;
      try { obj = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, error: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).' }; }
      if (!obj || obj.v !== 1 || !obj.data || typeof obj.data !== 'object') return { ok: false, error: 'File ini bukan ekspor tindak lanjut sekolah. Pilih file lain.' };
      var all = pipeLoad(), added = 0, updated = 0, kept = 0;
      Object.keys(obj.data).forEach(function (k) {
        var inc = obj.data[k];
        if (!inc || typeof inc !== 'object' || !PIPE_KEY_RE.test(k)) return;
        var clean = { stage: validStage(inc.stage), owner: cleanText(inc.owner, 60), products: Array.isArray(inc.products) ? inc.products.filter(function (x) { return PRODUCTS.some(function (q) { return q.id === x; }); }) : [],
          program: inc.program === 'RB' || inc.program === 'GEMPITA' ? inc.program : '', nextStep: cleanText(inc.nextStep, 120),
          nextDate: /^\d{4}-\d{2}-\d{2}$/.test(String(inc.nextDate || '')) ? inc.nextDate : '', lastContact: /^\d{4}-\d{2}-\d{2}$/.test(String(inc.lastContact || '')) ? inc.lastContact : '',
          note: cleanText(inc.note, 500), history: Array.isArray(inc.history) ? inc.history.slice(-20).map(function (h) { return { stage: validStage(h && h.stage), t: String((h && h.t) || '') }; }) : [],
          t: String(inc.t || ''), label: cleanText(inc.label, 160) };
        if (!all[k]) { all[k] = clean; added++; }
        else if (clean.t > (all[k].t || '')) { all[k] = clean; updated++; }
        else kept++;
      });
      pipeSave();
      return { ok: true, added: added, updated: updated, kept: kept };
    },
    _reset: function () { pipeMem = null; }
  };

  /* The sealed pipeline when MCD.seal is there (bound on first use, so a seal.js loaded after this file still counts). */
  var sealedPipe = null, sealOff = null;
  function sealApi() { var Z = MCD.seal; return Z && typeof Z === 'object' && typeof Z.pipeline === 'function' ? Z : null; }
  function pipeImpl() {
    if (sealedPipe) return sealedPipe;
    var Z = sealApi();
    if (!Z) return memPipe;
    var P = null;
    try { P = Z.pipeline(PIPE_NAME, { keyRe: PIPE_KEY_RE, stages: STAGES, products: PRODUCTS, programs: PIPE_PROGRAMS, check: gempitaRule }); } catch (e) { P = null; }
    if (!P || typeof P.get !== 'function' || typeof P.set !== 'function') return memPipe;
    sealedPipe = P;
    /* entries made in memory before the seal was bound (should not happen in the app's load order) are kept */
    if (pipeMem && Object.keys(pipeMem).length && typeof P.importJson === 'function') {
      try { P.importJson({ v: 1, data: pipeMem }); } catch (e) { /* the memory copy is dropped with the page */ }
    }
    pipeMem = null;
    /* the sealed store finished loading, merged another tab or the encrypted copy: the lists redraw */
    if (typeof Z.on === 'function') {
      try { sealOff = Z.on(function (e) { if (!e || !e.name || e.name === PIPE_NAME) S.emit('pipeline', null); }); } catch (e) { sealOff = null; }
    }
    if (typeof P.ready === 'function') { try { P.ready().then(function () { S.emit('pipeline', null); }, function () { S.emit('pipeline', null); }); } catch (e) { /* ignore */ } }
    return P;
  }
  function pcall(fn, args, fallback) {
    var P = pipeImpl(), f = P[fn];
    if (typeof f !== 'function') return fallback;
    return f.apply(P, args);
  }
  function emitAfter(res) { if (sealedPipe) S.emit('pipeline', null); return res; }
  S.pipeline = {
    key: PIPE_KEY,
    name: PIPE_NAME,
    keyRe: PIPE_KEY_RE,
    all: function () { return pcall('all', [], {}) || {}; },
    get: function (k) { return pcall('get', [k], null) || null; },
    persisted: function () { return !!pcall('persisted', [], false); },
    ready: function () { var r = pcall('ready', [], null); return r && typeof r.then === 'function' ? r : Promise.resolve(true); },
    /** 'loading' | 'ready' | 'memory' | 'old-password' | 'damaged' (memory without MCD.seal) */
    status: function () { return pcall('status', [], 'memory') || 'memory'; },
    sealed: function () { pipeImpl(); return !!sealedPipe; },
    /** True once MCD.seal moved the old plain list into the sealed store (the section shows its line once). */
    migrated: function () { return !!pcall('migrated', [], false); },
    set: function (k, patch, meta) { return emitAfter(pcall('set', [k, patch, meta], { ok: false, error: 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' })); },
    quickAdd: function (k, label) {
      if (!k) return { ok: false, error: 'SMA ini tidak memiliki NPSN. Tambahkan yayasannya ke tindak lanjut.' };
      var P = pipeImpl();
      if (typeof P.quickAdd === 'function') return emitAfter(P.quickAdd(k, label));
      var cur = P.get(k);
      if (cur) return { ok: true, entry: cur, existed: true };
      var res = P.set(k, { stage: 'baru' }, { label: label || '' });
      if (res && res.ok) res.existed = false;
      return emitAfter(res);
    },
    remove: function (k) { return emitAfter(pcall('remove', [k])); },
    clear: function () { return emitAfter(pcall('clear', [])); },
    count: function () { var n = pcall('count', [], null); return typeof n === 'number' ? n : Object.keys(S.pipeline.all()).length; },
    orphans: function (known) {
      var P = pipeImpl();
      if (typeof P.orphans === 'function') return P.orphans(known) || [];
      return memPipe.orphans.call(null, known);
    },
    exportJson: function () { return pcall('exportJson', [], ''); },
    importJson: function (text) { return emitAfter(pcall('importJson', [text], { ok: false, error: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).' })); },
    /** Test hook (tests/schools.test.mjs, schools-v3.test.mjs): drop the memory copy; a sealed store resets its own. */
    _reset: function () {
      if (sealedPipe && typeof sealedPipe._reset === 'function') { try { sealedPipe._reset(); } catch (e) { /* ignore */ } }
      pipeMem = null;
    },
    /** Test hook: forget the bound sealed store (a new MCD.seal is bound on the next use). */
    _unbind: function () { if (typeof sealOff === 'function') { try { sealOff(); } catch (e) { /* ignore */ } } sealOff = null; sealedPipe = null; }
  };
  var PIPE_LINES = {
    memory: 'Tindak lanjut hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.',
    blocked: 'Daftar tindak lanjut tidak tersimpan di perangkat ini karena penyimpanan browser diblokir. Ekspor sebelum menutup halaman.',
    quota: 'Penyimpanan browser penuh. Ekspor daftar, lalu hapus entri lama.',
    old: 'Daftar tindak lanjut lama terenkripsi dengan kata sandi sebelumnya.',
    damaged: 'Daftar tindak lanjut di komputer ini rusak dan tidak dapat dibuka. Daftar baru dimulai.',
    sealed: 'Terenkripsi dengan kata sandi dashboard.'
  };
  S.pipelineLines = PIPE_LINES;
  /**
   * pipelineLine() → {tone: 'warn' | 'none', text, action?: 'followups'} | null (sealed and ready: nothing to say).
   * memory: the reason from MCD.seal.reason() (no-storage, quota, else no key); old-password links to Data & Privasi.
   */
  S.pipelineLine = function () {
    var st = 'memory';
    try { st = S.pipeline.status(); } catch (e) { st = 'memory'; }
    if (st === 'ready' || st === 'loading') return null;
    if (st === 'old-password') return { tone: 'warn', text: PIPE_LINES.old, action: 'followups' };
    if (st === 'damaged') return { tone: 'warn', text: PIPE_LINES.damaged };
    var Z = MCD.seal, why = null;
    if (Z && typeof Z.reason === 'function') { try { why = Z.reason(); } catch (e) { why = null; } }
    return { tone: 'warn', text: why === 'no-storage' ? PIPE_LINES.blocked : why === 'quota' ? PIPE_LINES.quota : PIPE_LINES.memory };
  };
  /** Days since the last stage change (null without history). */
  S.daysInStage = function (entry, from) {
    if (!entry || !entry.history || !entry.history.length) return null;
    var t = Date.parse(entry.history[entry.history.length - 1].t);
    if (!isNum(t)) return null;
    var f = (from || today()).getTime();
    return Math.max(0, Math.floor((f - t) / 86400000));
  };

  /* ============================================================ leads CSV (§9.7) */

  function csvCell(v) {
    var c = MCD.util && MCD.util.csv;
    if (c && c.cell) return c.cell(v);
    if (v == null) return '';
    var s = String(v);
    if (/^[=+\-@\t]/.test(s)) s = "'" + s;
    return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function fixed(x, d) { return isNum(x) ? x.toFixed(d) : ''; }
  function isFn0(f) { return typeof f === 'function'; }
  function jenText(j) { var out = []; LEVELS.forEach(function (l) { if (j[l.i]) out.push(l.short + ' ' + j[l.i]); }); return out.join('; '); }
  S.jenText = jenText;

  /**
   * leadsCsv(idx, d, rel, {grain:'entity'|'school', created: Date}) → CSV text (UTF-8 BOM first).
   * The only link to imported data is the mandiri_customer Y/N flag; balances never appear.
   */
  S.leadsCsv = function (idx, d, rel, opts) {
    opts = opts || {};
    var fm = MCD.util && MCD.util.fmt;
    var created = opts.created || new Date();
    var stamp = fm && fm.dateTime ? fm.dateTime(created) : created.toISOString();
    var attribution = (idx.meta && idx.meta.attribution) || 'Kemendikdasmen (Dapodik, Sekolah Kita) · © kontributor OpenStreetMap · © Overture Maps Foundation';
    var lines = ['# Data internal Bank Mandiri, rahasia, dibuat ' + stamp + ' · sumber publik + tindak lanjut lokal'];
    var pipe = S.pipeline.all();
    if (opts.grain === 'school') {
      /* pupils and pupils aged 17+ follow the shared display rule (students.*); road distance and minutes from
         the branch come from opts.distance(i) → {km, min} when the section passes it */
      /* v6 (V6_SPEC §4.2, §5.2): kelas biaya and the institutional contacts come from opts.tier(i) and opts.contact(i)
         (the section's adapters); a contact column is empty when the section leaves it out (Samarkan nama, a site
         that may not be a link). opts.info(i): students under the v6 display rule (every level); opts.level(i). */
      lines.push(['npsn', 'school', 'level', 'status', 'foundation', 'foundation_key', 'tni_foundation', 'matra', 'npyp', 'pupils', 'pupils_17plus', 'pupils_17plus_source', 'pupils_under17_simpel', 'lat', 'lon', 'km_from_mabes', 'road_km_from_kcp', 'minutes_from_kcp', 'band', 'data_source', 'inferred', 'mandiri_customer', 'pipeline_stage', 'owner', 'target_products',
        'kelas_biaya', 'dasar_kelas_biaya', 'biaya_resmi', 'tahun_biaya', 'sumber_biaya', 'telepon', 'telepon_seluler_resmi', 'email', 'situs_resmi', 'sumber_kontak', 'attribution'].join(','));
      for (var k = 0; k < d.rows.length; k++) {
        var i = d.rows[k], e = idx.ent[i] >= 0 ? idx.ents[idx.ent[i]] : null, t = idx.tni[i] >= 0 ? idx.tniRows[idx.tni[i]] : null;
        var si = isFn0(opts.info) ? opts.info(i) : S.students.info(idx, i), dv = isFn0(opts.distance) ? opts.distance(i) : null;
        var npsn = idx.npsn[i] || (si && si.npsn) || '';
        var pe = e ? pipe[e.key] : null, ps = npsn ? pipe['npsn:' + npsn] : null;
        var relv = rel ? (isActive(rel, idx, i) ? 'Y' : 'N') : '';
        var pupils = si && si.students != null ? si.students : (idx.stu[i] >= 0 ? idx.stu[i] : '');
        var k17ok = !!(si && si.k17 != null && !si.inactive);
        var tr = isFn0(opts.tier) ? (opts.tier(i) || {}) : {}, ct = isFn0(opts.contact) ? (opts.contact(i) || {}) : {};
        var lvl = isFn0(opts.level) ? opts.level(i) : null;
        lines.push([npsn, idx.name[i], lvl || LEVELS[idx.jen[i]].label, STATUSES[idx.st[i]].label, idx.yay[i] || (e ? e.label : ''), e ? e.key : '',
          idx.tni[i] >= 0 ? 'Y' : 'N', MATRA[idx.matra[i]], t && t.npyp ? t.npyp : '', pupils,
          k17ok ? si.k17 : '', k17ok ? (si.k17Official ? 'data resmi' : 'perkiraan') : (si && si.inactive ? 'kemungkinan tidak aktif' : ''),
          k17ok && si.students != null ? Math.max(0, si.students - si.k17) : '',
          fixed(idx.lat[i], 3), fixed(idx.lon[i], 3), fixed(idx.dist[i], 2), dv && isNum(dv.km) ? fixed(dv.km, 1) : '', dv && isNum(dv.min) ? Math.round(dv.min) : '', BANDS[idx.band[i]].label,
          idx.src[i] === 1 ? 'OpenStreetMap/Overture' : idx.src[i] === 2 ? 'daftar yayasan TNI (Dapodik)' : 'Dapodik',
          idx.inf[i] ? 'Y' : 'N', relv, pe ? stageLabel(pe.stage) : '', pe ? pe.owner : '', productText((ps || pe || {}).products),
          tr.kelas || '', tr.dasar || '', tr.biaya || '', tr.tahun || '', tr.sumber || '',
          ct.telepon || '', ct.seluler || '', ct.email || '', ct.situs || '', ct.sumber || '',
          attribution + (idx.src[i] === 1 ? ' · OSM: ODbL, wajib berbagi serupa jika basis data turunan disebarkan.' : '')].map(csvCell).join(','));
      }
    } else {
      lines.push(['key', 'foundation', 'key_type', 'network', 'tni_foundation', 'matra', 'schools', 'core_schools', 'levels', 'pupils_known', 'schools_with_pupil_data',
        'nearest_km', 'score', 'fit_collection_referral', 'fit_student_savings', 'fit_simpel', 'fit_livin_merchant',
        'policy_notes', 'competitor_signals', 'mandiri_customer', 'pipeline_stage', 'owner', 'next_step', 'next_date', 'target_products', 'source', 'attribution'].join(','));
      var list = opts.list || S.board(d, { mode: 'entity' });
      list.forEach(function (a) {
        var pe2 = pipe[a.key], f2 = a.fit || fit(a);
        var flags = [];
        if (f2.COLL.flags.indexOf('MK') >= 0) flags.push('Putusan MK 3/PUU-XXII/2024 (SD/SMP bebas biaya)');
        flags.push('MDR QRIS 0% sampai Rp100.000');
        lines.push([a.key, a.label, a.kind === 'npyp' ? 'NPYP' : a.kind === 'tni' ? 'Yayasan TNI (perkiraan)' : 'Yayasan Dapodik', a.netLabel || '', a.tni ? 'Y' : 'N', a.tni || '',
          a.n, a.core, jenText(a.jen), a.studentsN ? a.students : '', a.studentsN, fixed(a.dmin, 2), fixed(a.score, 1),
          f2.COLL.v, f2.TAB.v || 'n/a', f2.SIMPEL ? (f2.SIMPEL.v || 'n/a') : '', f2.LVM.v, flags.join('; '),
          (a.competitors || []).map(function (c) { return c.tag; }).join('; '), rel ? (a.active || a.anyActiveRow ? 'Y' : 'N') : '',
          pe2 ? stageLabel(pe2.stage) : '', pe2 ? pe2.owner : '', pe2 ? pe2.nextStep : '', pe2 ? pe2.nextDate : '', productText(pe2 && pe2.products),
          a.kind === 'dapodik' ? 'Dapodik 2026/2027 Gasal' : 'Dapodik / Verval Yayasan (daftar yayasan TNI)', attribution].map(csvCell).join(','));
      });
    }
    return '﻿' + lines.join('\r\n') + '\r\n';
  };
  function stageLabel(id) { var s = STAGES.filter(function (x) { return x.id === id; })[0]; return s ? s.label : ''; }
  S.stageLabel = stageLabel;
  /** Target products of a follow-up entry in words, in the PRODUCTS order: "Tabungan; Tabungan SimPel". */
  function productText(ids) {
    if (!Array.isArray(ids) || !ids.length) return '';
    return PRODUCTS.filter(function (p) { return ids.indexOf(p.id) >= 0; }).map(function (p) { return p.short; }).join('; ');
  }
  S.productText = productText;

  /* ================================== relationships (shared by the section and area hook) */

  var _rel = { key: null, val: null };
  /**
   * relFor(idx, records, {version, demo}) → rel | null. matchCustomers memoised on
   * data version, record count and index size, so the section and the area hook share one match.
   */
  S.relFor = function (idx, records, opts) {
    opts = opts || {};
    if (!idx || !Array.isArray(records) || !records.length) return null;
    var key = (opts.version || 0) + '|' + records.length + '|' + idx.n + '|' + (opts.demo ? 1 : 0);
    if (_rel.key !== key) _rel = { key: key, val: S.matchCustomers(idx, records, { version: opts.version || 1, demo: !!opts.demo }) };
    return _rel.val;
  };

  /* ============== students and students aged 17+ per SMA (COPY_STYLE_EN items 26 and 29) */

  /*
   * window.MCD_SMA_STUDENTS (data/sma-students.js, docs/SMA_STUDENTS.md): the 373 SMA within 15 km with
   * Dapodik counts. SHARED DISPLAY RULE (every section shows the same totals: 366 SMA, 160.411 siswa,
   * about 79.985 aged 17+):
   *   - a row that carries duplicateOf (even null) is a duplicate or mislabel of another point: hidden;
   *   - students === 0: "kemungkinan tidak aktif", listed with that flag, never counted or ranked;
   *   - 17+ shown = ktp17Resmi (Dapodik's own age table) when present, else the per-grade estimate,
   *     marked "perkiraan". The per-grade shares are an editable assumption: they change only the
   *     schools without an official age count.
   * Join to the school index: NPSN on an SMA-level row within 1 km, else the same name at the same point
   * (the file keeps the app's own names and points). Aggregate numbers only, no data about any student.
   *
   *   students.ready() · data() · source · sig()
   *   students.shares() · defaults() · setShares({k10, k11, k12} as 0–1) · resetShares() · estimatedSchools()
   *   students.k17(rec) → {n, official} | null      students.isDuplicate(rec) · isInactive(rec)
   *   students.info(idx, i) → {students, perGrade, k17, k17Official, duplicate, inactive, spk, note, …} | null
   *   students.rowOf(idx, rec) → row | -1           students.recOf(idx, i) → rec | null
   *   students.totals(recs?) → {sma, students, k17, k17Official, k17Est, estSchools, inactive, duplicates}
   *   students.byKecamatan() → {id: {name, kota, sma, students, k17, k17Est, top: [rec…]}}
   *   students.top({by: 'k17'|'students', kecamatanId, limit}) → [rec…] (active schools only)
   */
  var STU_SOURCE = 'Data siswa: Dapodik (Kemendikdasmen), semester 2026/2027 Ganjil';
  var SHARES_KEY = 'mcd.schools.shares.v1';
  var STU = { shares: null, sig: 0, join: null, overall: null };

  function stuData() {
    var D = root.MCD_SMA_STUDENTS;
    return D && Array.isArray(D.schools) && D.meta && D.meta.shares ? D : null;
  }
  function isDup(s) { return !!s && Object.prototype.hasOwnProperty.call(s, 'duplicateOf'); }
  function isInactive(s) { return !!s && !isDup(s) && s.students === 0; }
  function share01(x, d) { x = +x; return x !== x || !isFinite(x) ? d : Math.min(1, Math.max(0, x)); }
  function normShares(s, def) {
    s = s || {};
    return { k10: share01(s.k10, def.k10), k11: share01(s.k11, def.k11), k12: share01(s.k12, def.k12) };
  }
  function sameShares(a, b) { return !!a && !!b && a.k10 === b.k10 && a.k11 === b.k11 && a.k12 === b.k12; }
  function sharesNow() {
    var D = stuData();
    if (!D) return null;
    if (!STU.shares) {
      var saved = null;
      try { var st = MCD.util && MCD.util.storage; saved = st ? st.get(SHARES_KEY, null) : null; } catch (e) { saved = null; }
      STU.shares = normShares(saved && saved.v === 1 ? saved : D.meta.shares, D.meta.shares);
    }
    return STU.shares;
  }
  /** Share aged 17+ for schools without per-grade counts, from the official rows (same as the data file's helper). */
  function overallNow() {
    var D = stuData(), sh = sharesNow();
    if (!D || !sh) return 0;
    if (sameShares(sh, D.meta.shares)) return D.meta.overallShare;
    if (STU.overall && sameShares(STU.overall.sh, sh)) return STU.overall.v;
    var n = 0, k = 0;
    D.schools.forEach(function (s) { if (s.studentsSource === 'resmi' && s.perGrade) { n += s.students; k += s.perGrade.k10 * sh.k10 + s.perGrade.k11 * sh.k11 + s.perGrade.k12 * sh.k12; } });
    var v = n ? Math.round(k / n * 1000) / 1000 : 0;
    STU.overall = { sh: sh, v: v };
    return v;
  }
  /** Students aged 17+ of one school: Dapodik's own age count when published, else the estimate. */
  function k17Of(s) {
    if (!s || isDup(s)) return null;
    if (isNum(s.ktp17Resmi)) return { n: s.ktp17Resmi, official: true };
    var D = stuData(), sh = sharesNow();
    if (!D || !sh) return null;
    if (sameShares(sh, D.meta.shares) && isNum(s.ktp17Est)) return { n: s.ktp17Est, official: false };
    var g = s.perGrade;
    var n = g ? Math.round(g.k10 * sh.k10 + g.k11 * sh.k11 + g.k12 * sh.k12) : Math.round((s.students || 0) * overallNow());
    return { n: n, official: false };
  }
  function joinFor(idx) {
    var D = stuData();
    if (!D || !idx) return null;
    if (STU.join && STU.join.idx === idx && STU.join.D === D) return STU.join;
    var byRow = new Map(), rowOf = new Int32Array(D.schools.length).fill(-1), byName = new Map();
    for (var i = 0; i < idx.n; i++) {
      if (idx.jen[i] !== 3) continue;
      var a = byName.get(idx.name[i]);
      if (!a) byName.set(idx.name[i], (a = []));
      a.push(i);
    }
    D.schools.forEach(function (s, k) {
      var row = -1, np = s.npsn ? String(s.npsn) : '';
      if (np && idx.npsnIndex.has(np)) {
        var j = idx.npsnIndex.get(np);
        if (idx.jen[j] === 3 && hav(idx.lon[j], idx.lat[j], +s.lon, +s.lat) <= 1) row = j;
      }
      if (row < 0) {
        var best = -1, bd = Infinity;
        (byName.get(s.name) || []).forEach(function (j2) { var d = Math.abs(idx.lon[j2] - s.lon) + Math.abs(idx.lat[j2] - s.lat); if (d < bd) { bd = d; best = j2; } });
        if (best >= 0 && bd < 0.001) row = best;
      }
      if (row >= 0 && !byRow.has(row)) { byRow.set(row, k); rowOf[k] = row; }
    });
    STU.join = { idx: idx, D: D, byRow: byRow, rowOf: rowOf };
    return STU.join;
  }
  function activeRecs(D) { return D.schools.filter(function (s) { return !isDup(s) && !isInactive(s); }); }

  S.students = {
    source: STU_SOURCE,
    ready: function () { return !!stuData(); },
    data: stuData,
    /** Changes whenever a 17+ figure can change (the shares): use it in cache keys. */
    sig: function () { return stuData() ? 's' + STU.sig : '0'; },
    isDuplicate: isDup,
    isInactive: isInactive,
    k17: k17Of,
    shares: function () { var s = sharesNow(); return s ? { k10: s.k10, k11: s.k11, k12: s.k12 } : null; },
    defaults: function () { var D = stuData(); return D ? { k10: D.meta.shares.k10, k11: D.meta.shares.k11, k12: D.meta.shares.k12 } : null; },
    /** setShares({k10, k11, k12}) with shares 0–1. Schools with an official age count keep it. Per browser. */
    setShares: function (s) {
      var D = stuData();
      if (!D) return null;
      var next = normShares(s, sharesNow());
      if (sameShares(next, STU.shares)) return S.students.shares();
      STU.shares = next;
      STU.sig++;
      try {
        var st = MCD.util && MCD.util.storage;
        if (st) { if (sameShares(next, D.meta.shares)) st.remove(SHARES_KEY); else st.set(SHARES_KEY, { v: 1, k10: next.k10, k11: next.k11, k12: next.k12 }); }
      } catch (e) { /* kept in memory */ }
      S.emit('shares', S.students.shares());
      return S.students.shares();
    },
    resetShares: function () { var d = S.students.defaults(); return d ? S.students.setShares(d) : null; },
    isDefault: function () { var D = stuData(); return !!D && sameShares(sharesNow(), D.meta.shares); },
    /** Active schools whose 17+ figure is an estimate (the ones the shares change). */
    estimatedSchools: function () { var D = stuData(); return D ? activeRecs(D).filter(function (s) { return !isNum(s.ktp17Resmi); }).length : 0; },
    recOf: function (idx, i) { var J = joinFor(idx); if (!J) return null; var k = J.byRow.get(i); return k == null ? null : J.D.schools[k]; },
    rowOf: function (idx, rec) { var J = joinFor(idx); if (!J || !rec) return -1; var k = J.D.schools.indexOf(rec); return k < 0 ? -1 : J.rowOf[k]; },
    info: function (idx, i) {
      var s = S.students.recOf(idx, i);
      if (!s) return null;
      var dup = isDup(s), k = dup ? null : k17Of(s);
      return {
        rec: s, students: dup ? null : (isNum(s.students) ? s.students : null), perGrade: dup ? null : (s.perGrade || null),
        studentsOfficial: s.studentsSource === 'resmi', k17: k ? k.n : null, k17Official: !!(k && k.official),
        duplicate: dup, duplicateOf: dup ? (s.duplicateOf || null) : null, inactive: isInactive(s),
        spk: /SPK/.test(String(s.bentuk || '')), note: s.note || null, semester: s.semester || null,
        kecamatanId: s.kecamatanId || null, kelurahanId: s.kelurahanId || null
      };
    },
    totals: function (recs) {
      var D = stuData(), t = { sma: 0, students: 0, k17: 0, k17Official: 0, k17Est: 0, estSchools: 0, inactive: 0, duplicates: 0 };
      if (!D) return t;
      (recs || D.schools).forEach(function (s) {
        if (!s) return;
        if (isDup(s)) { t.duplicates++; return; }
        if (isInactive(s)) { t.inactive++; return; }
        var k = k17Of(s);
        t.sma++; t.students += s.students || 0; t.k17 += k.n;
        if (k.official) t.k17Official += k.n; else { t.k17Est += k.n; t.estSchools++; }
      });
      return t;
    },
    byKecamatan: function () {
      var D = stuData(), out = {};
      if (!D) return out;
      activeRecs(D).forEach(function (s) {
        var id = s.kecamatanId;
        if (!id) return;
        var meta = (D.kecamatan && D.kecamatan[id]) || {};
        var a = out[id] || (out[id] = { id: id, name: meta.name || id, kota: meta.kota || '', sma: 0, students: 0, k17: 0, k17Est: 0, top: [] });
        var k = k17Of(s);
        a.sma++; a.students += s.students; a.k17 += k.n;
        if (!k.official) a.k17Est += k.n;
        a.top.push(s);
      });
      Object.keys(out).forEach(function (id) { out[id].top.sort(function (x, y) { return k17Of(y).n - k17Of(x).n || x.distKm - y.distKm; }); });
      return out;
    },
    top: function (o) {
      o = o || {};
      var D = stuData();
      if (!D) return [];
      var by = o.by === 'students' ? 'students' : 'k17';
      var list = activeRecs(D).filter(function (s) { return !o.kecamatanId || s.kecamatanId === o.kecamatanId; });
      list.sort(function (x, y) { return (by === 'students' ? y.students - x.students : k17Of(y).n - k17Of(x).n) || x.distKm - y.distKm; });
      return isNum(o.limit) ? list.slice(0, o.limit) : list;
    }
  };

  /* ============== v6: students of every SMA, SMK and MA within 30 km (docs/V6_SPEC.md §1.1, D16) */

  /*
   * window.MCD_SCHOOL_STUDENTS (data/school-students.js, docs/SCHOOL_STUDENTS.md): the app's own SMA, SMK and MA
   * within 30 km, one row per app school, keyed by the app's id (idOf). DISPLAY RULE (every level):
   *   1. duplicateOf: the same school as another row: hidden (map, lists, counts);
   *   2. closedLikely or 0 students: "kemungkinan tidak aktif": drawn faded, listed, never counted;
   *   3. students null: listed and counted in "{n} sekolah", not in student sums (the cause in words);
   *   4. studentsSource 'perkiraan': marked, with the row note.
   * The SMA within 15 km keep data/sma-students.js and its own rule (the pilot numbers, D1 and D16). With another
   * level shown, a pilot SMA whose 30 km twin is a duplicateOf a row of that level (the Labiomed point, counted on its
   * SMK row) is hidden, so its students count once (§1.1 sum rule). `extra` (Dapodik schools the app's map lacks) is
   * never read here (D16).
   *
   *   students.idOf(idx, i) → 'npsn:<NPSN>' | 'app:<lon>,<lat>'      students.file30() → the global | null
   *   students.byId(id) · byNpsn(npsn) → row | null                   students.row30(idx, i) → row | null
   *   students.levelOf(idx, i) → 'SMA' | 'SMK' | 'MA' | null
   *   students.view(idx, i, {shown: {SMA, SMK, MA}}) → {src: 'pilot' | 'file' | 'none', students, perGrade,
   *     studentsOfficial, k17, k17Official, duplicate, duplicateOf, inactive, closedLikely, missing: null | 'osm' |
   *     'closed' | 'dapodik' | 'loading' | 'failed', semester, olderTable, note, npsn, npsnMatched, spk, level, id} | null
   *   students.sum(idx, rows, opts) → {schools, students, studentsN, k17, inactive, noData}
   */
  var F30 = { D: null, byId: null, byNpsn: null };
  function file30() { var D = root.MCD_SCHOOL_STUDENTS; return D && Array.isArray(D.rows) && D.meta ? D : null; }
  function f30() {
    var D = file30();
    if (!D) return null;
    if (F30.D === D) return F30;
    var byId = new Map(), byNp = new Map();
    D.rows.forEach(function (r) {
      if (!r || !r.id) return;
      byId.set(String(r.id), r);
      if (r.npsn && !byNp.has(String(r.npsn)) && !Object.prototype.hasOwnProperty.call(r, 'duplicateOf')) byNp.set(String(r.npsn), r);
    });
    F30 = { D: D, byId: byId, byNpsn: byNp };
    return F30;
  }
  function idOf(idx, i) {
    if (!idx || i == null || i < 0 || i >= idx.n) return null;
    return idx.npsn[i] ? 'npsn:' + idx.npsn[i] : 'app:' + idx.lon[i].toFixed(5) + ',' + idx.lat[i].toFixed(5);
  }
  function levelOf(idx, i) {
    if (!idx || i == null || i < 0 || i >= idx.n) return null;
    if (idx.jen[i] === 4) return 'SMK';
    if (idx.jen[i] !== 3) return null;
    var c = smaClass(idx.name[i], !!idx.npsn[i]);
    return c === 1 ? 'SMA' : c === 2 ? 'MA' : null;
  }
  function hasOwn(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  S.students.idOf = idOf;
  S.students.levelOf = levelOf;
  S.students.file30 = file30;
  S.students.ready30 = function () { return !!file30(); };
  S.students.byId = function (id) { var F = f30(); return F && id != null ? F.byId.get(String(id)) || null : null; };
  S.students.byNpsn = function (npsn) { var F = f30(); return F && npsn ? F.byNpsn.get(String(npsn)) || null : null; };
  S.students.row30 = function (idx, i) { var id = idOf(idx, i); return id ? S.students.byId(id) : null; };
  S.students.view = function (idx, i, opts) {
    var level = levelOf(idx, i);
    if (!level) return null;
    opts = opts || {};
    var shown = opts.shown || { SMA: true };
    var D = file30(), r = D ? S.students.row30(idx, i) : null;
    var pilot = level === 'SMA' ? S.students.info(idx, i) : null;
    if (pilot) {
      var out = Object.assign({}, pilot, { src: 'pilot', level: level, id: idOf(idx, i), missing: null, closedLikely: false, olderTable: false,
        npsn: idx.npsn[i] || (r && r.npsn) || null, npsnMatched: !!(r && r.npsnMatched) });
      /* the sum rule: the 30 km twin of a pilot SMA is a duplicate point of a row of another level that is shown */
      if (!out.duplicate && r && hasOwn(r, 'duplicateOf') && r.duplicateOf) {
        var tw = S.students.byNpsn(r.duplicateOf);
        if (tw && tw.level !== 'SMA' && shown[tw.level]) { out.duplicate = true; out.duplicateOf = String(r.duplicateOf); out.twin = true; }
      }
      if (!out.duplicate && out.students == null && !out.inactive) out.missing = 'dapodik';
      return out;
    }
    if (!r) {
      var st = S.dataStatus('school-students');
      return { src: 'none', level: level, id: idOf(idx, i), students: null, perGrade: null, studentsOfficial: false, k17: null, k17Official: false,
        duplicate: false, duplicateOf: null, inactive: false, closedLikely: false, missing: D ? 'dapodik' : (st === 'error' ? 'failed' : 'loading'),
        semester: null, olderTable: false, note: null, npsn: idx.npsn[i] || null, npsnMatched: false, spk: false, kecamatanId: null, kelurahanId: null };
    }
    var dup = hasOwn(r, 'duplicateOf');
    var inact = !dup && (r.closedLikely === true || r.students === 0);
    var students = dup || !isNum(r.students) ? null : r.students;
    var k17 = dup || inact || !isNum(r.age17) ? null : r.age17;
    var missing = null;
    if (!dup && students == null) missing = !r.npsn ? 'osm' : r.closedLikely ? 'closed' : 'dapodik';
    var main = D.meta && D.meta.semesterMain;
    return {
      src: 'file', level: level, id: r.id, students: students, perGrade: dup ? null : (r.perGrade || null), studentsOfficial: r.studentsSource === 'resmi',
      k17: k17, k17Official: r.age17Source === 'resmi', duplicate: dup, duplicateOf: dup ? (r.duplicateOf || null) : null, inactive: inact,
      closedLikely: r.closedLikely === true, missing: missing, semester: r.semester || null, olderTable: !!(r.semester && main && r.semester !== main),
      note: r.note || null, npsn: r.npsn || null, npsnMatched: r.npsnMatched === true, spk: r.spk === true, status: r.status || null,
      kecamatanId: r.kecamatanId || null, kelurahanId: r.kelurahanId || null
    };
  };
  /** Sums under the display rule over rows (index rows): what every total of the section shows. */
  S.students.sum = function (idx, rows, opts) {
    var t = { schools: 0, students: 0, studentsN: 0, k17: 0, k17N: 0, inactive: 0, noData: 0, hidden: 0 };
    (rows || []).forEach(function (i) {
      var v = S.students.view(idx, i, opts);
      if (!v) return;
      if (v.duplicate) { t.hidden++; return; }
      if (v.inactive) { t.inactive++; return; }
      t.schools++;
      if (v.students != null) { t.students += v.students; t.studentsN++; } else t.noData++;
      if (v.k17 != null) { t.k17 += v.k17; t.k17N++; }
    });
    return t;
  };

  /* ================================ area aggregates (COPY_STYLE_EN item 9, PHASE3 §1) */

  var AREA_LEVELS = ['kecamatan', 'kelurahan'];
  var _areaOf = { key: null, names: null };
  /**
   * areaAggregates(idx, rel, locate, level) → {level, areas:{name:{potential, banked, penetration}}, ready, …}. Pure
   * apart from a cache of each school's area. potential = private schools in the area (public Dapodik /
   * OSM data); banked = those served by Mandiri (sheet 8_sekolah: NPSN, NPYP or exact foundation match);
   * penetration = banked ÷ potential, only when bank data (real or demo) is present, otherwise null.
   */
  S.areaAggregates = function (idx, rel, locate, level, opts) {
    opts = opts || {};
    level = AREA_LEVELS.indexOf(level) >= 0 ? level : 'kecamatan';
    var out = { level: level, areas: {}, ready: false, bank: !!rel, demo: !!(rel && rel.demo),
      definition: 'Sekolah swasta nasabah Mandiri ÷ sekolah swasta di wilayah ini (sheet 8_sekolah dan daftar sekolah publik)',
      source: 'Kemendikdasmen Dapodik · OpenStreetMap · Overture Maps (12 Okt 2026)' + (rel ? (rel.demo ? ' · data contoh (ilustrasi)' : ' · file cabang, sheet 3_sekolah') : '') };
    if (!idx) { out.note = 'Daftar sekolah belum dimuat'; return out; }
    if (typeof locate !== 'function') { out.note = 'Data wilayah belum termuat. Muat ulang halaman.'; return out; }
    /* opts.sma: SMA only (product decision 14) instead of private schools of every level;
       opts.keyBy 'id': areas keyed by Kemendagri code (two Cipayung, two Setu), name inside each entry */
    var sma = !!opts.sma, byId = opts.keyBy === 'id';
    if (sma) out.definition = 'SMA nasabah Mandiri ÷ SMA di wilayah ini (sheet 3_sekolah dan daftar sekolah publik)';
    var ck = level + '|' + idx.n + '|' + (opts.areasVersion || 0) + '|' + (sma ? 1 : 0) + '|' + (byId ? 1 : 0);
    if (_areaOf.key !== ck || _areaOf.idx !== idx) {
      var names = new Array(idx.n), labels = {};
      for (var i = 0; i < idx.n; i++) {
        if (sma ? !isSma(idx, i) : idx.st[i] !== 1) { names[i] = null; continue; }
        var a = null;
        try { a = locate(idx.lon[i], idx.lat[i]); } catch (e) { a = null; }
        var nmI = a && a[level] ? String(a[level]) : null, idI = byId && a && a[level + 'Id'] ? String(a[level + 'Id']) : null;
        names[i] = idI || nmI;
        if (idI && nmI) labels[idI] = nmI;
      }
      _areaOf = { key: ck, idx: idx, names: names, labels: labels };
    }
    var areas = out.areas, nm = _areaOf.names, lab = _areaOf.labels || {};
    if (byId) out.keyedBy = 'id';
    for (var j = 0; j < idx.n; j++) {
      var name = nm[j];
      if (!name) continue;
      var x = areas[name] || (areas[name] = byId ? { name: lab[name] || name, potential: 0, banked: 0, penetration: null } : { potential: 0, banked: 0, penetration: null });
      x.potential++;
      if (rel && isActive(rel, idx, j)) x.banked++;
    }
    Object.keys(areas).forEach(function (k) { var y = areas[k]; y.penetration = rel && y.potential ? y.banked / y.potential : null; });
    out.ready = true;
    return out;
  };

  var _areaHook = { key: null, val: null };
  function areaHook(st, data) {
    var level = st && st.areaLevel === 'kelurahan' ? 'kelurahan' : 'kecamatan';
    /* MCD.areas (if a module provides it) or the boundary file itself (data/admin-areas.js) */
    var A = MCD.areas && typeof MCD.areas.locate === 'function' ? MCD.areas : (root.MCD_ADMIN_AREAS && typeof root.MCD_ADMIN_AREAS.locate === 'function' ? root.MCD_ADMIN_AREAS : null);
    var locate = A ? function (lon, lat) { return A.locate(lon, lat); } : null;
    var recs = (data && data.sekolah) || [];
    var demo = !!(data && data.meta && data.meta.sekolah && data.meta.sekolah.source === 'demo');
    var key = level + '|' + (data ? data.version : 0) + '|' + recs.length + '|' + (S.idx ? S.idx.n : 0) + '|' + (A && A.version || 0) + '|' + (locate ? 1 : 0);
    if (_areaHook.key === key) return _areaHook.val;
    var rel = S.idx ? S.relFor(S.idx, recs, { version: data ? data.version : 0, demo: demo }) : null;
    _areaHook = { key: key, val: S.areaAggregates(S.idx, rel, locate, level, { areasVersion: A && A.version || 0, sma: true, keyBy: 'id' }) };
    return _areaHook.val;
  }
  S.areaHook = areaHook;
  if (MCD.derive && typeof MCD.derive.register === 'function') {
    MCD.derive.register('area:schools', areaHook, {
      deps: function (st) {
        var A = MCD.areas || root.MCD_ADMIN_AREAS;
        return [MCD.data ? MCD.data.version : 0, st && st.areaLevel || '', S.idx ? S.idx.n : 0, A && A.version || 0].join('|');
      }
    });
  }

  /* ------------------------------------------- opt-in demo rows (decision 7) */

  // Demo SMA customers come from assets/js/data-synthetic.js (MCD.synth.generate().sekolah),
  // injected only when the "Demo data" switch is turned on; it fills the nearby SMA from
  // data/schools.js once this module emits 'ready'.
})(window.MCD = window.MCD || {});
