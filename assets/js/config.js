/* ==========================================================================
 * MCD.config: constants, section registry, keymap, map endpoints, programmes
 * and user settings for the Acquisition Dashboard (BUILD_SPEC §F.2, §F.4, §E, §J.3).
 *
 * Loads after the gate scripts and before util.js, so it has no dependencies.
 * Nothing here touches the DOM or storage at load time. Settings are read
 * only when app.js calls MCD.config.loadSettings() inside boot(), i.e.
 * after the password gate has unlocked.
 *
 * Scope (branch decisions 15 and 16 Oct 2026, docs/COPY_STYLE_EN.md items 10–22):
 *   - Five sections on keys 1–5: Ringkasan · Merchant (LVM & EDC) · Sekolah (SMA) · KPR · Data & Privasi.
 *     Ringkasan and Data & Privasi are full-width pages without a map (layout 'page', UX fix plan A-03).
 *   - UI words in Bahasa Indonesia (item 19); internal ids stay English (overview, merchants, …).
 *   - Every map is flat and north-up: no 2D/3D toggle, no tilt, no orbit, no 3D buildings.
 *   - statusScale + coverageBands: the shared green / amber / red / grey colour code.
 *   - Programmes (§F.4 + AM-5 + property addendum) are public reference data.
 *   - Auth gate addendum §2.2: MCD.config.gate; §4 applyUserFields (vault).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var prior = MCD.config || {};

  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function parseISO(s) {
    if (s && typeof s.getUTCFullYear === 'function') return isNaN(s.getTime()) ? null : new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }

  /* ------------------------------------------------------------ sections */

  // Registry: exactly five sections on keys 1–5 (branch decision 15 Oct 2026, COPY_STYLE_EN item 14).
  // layout: 'rails' (§C.3) | 'sheet' (§C.4) | 'sheet-wide' | 'page' (no map: Ringkasan, Data & Privasi)
  // posture.imagery: key of map.postures · posture.camera: key of map.presets or null (keep camera)
  // posture.rings: key of rings.sets · posture.layerSet: the section's layer family · posture.deck: deck layers on
  // sheets: sheets of templates/Permintaan_Data_KCP_Cilangkap.xlsx that fill the section.
  var SECTIONS = [
    { id: 'overview', key: '1', label: 'Ringkasan', short: 'Ringkasan', title: 'Ringkasan', titleFull: 'Ringkasan akuisisi KCP Jakarta Cilangkap',
      help: 'Semua angka utama cabang dalam satu halaman.\nBerapa merchant dalam 15 km yang telah terdaftar di Livin’ Merchant.\nKecamatan yang perlu dikunjungi lebih dulu.\nPencapaian target UREG (pengguna terdaftar) dan USAK (pengguna aktif).',
      sheets: ['1_lvm', '2_edc'],
      file: 'assets/js/section-overview.js', css: 'assets/css/section-overview.css',
      layout: 'page',
      posture: { imagery: 'full', camera: null, rings: null, layerSet: null, deck: false } },
    { id: 'merchants', key: '2', label: 'Merchant', short: 'Merchant', title: 'Merchant (LVM & EDC)', titleFull: 'Akuisisi merchant dalam 15 km: Livin’ Merchant dan EDC Mandiri',
      help: 'Semua toko kelontong, restoran dan UMKM dalam 15 km dari Mabes TNI.\nSetiap merchant berstatus “Sudah diakuisisi” atau “Belum ada di LVM”.\nLihat juga status EDC Mandiri dan sisa potensi per kecamatan.',
      sheets: ['1_lvm', '2_edc'],
      file: 'assets/js/section-merchants.js', css: 'assets/css/section-merchants.css',
      layout: 'sheet',
      posture: { imagery: 'merchants', camera: 'sme15', rings: 'merchants', layerSet: 'merchants', deck: true } },
    { id: 'schools', key: '3', label: 'Sekolah', short: 'Sekolah', title: 'Sekolah (SMA)', titleFull: 'SMA di sekitar Mabes TNI',
      help: 'SMA di sekitar Mabes TNI dan KCP Cilangkap.\nLihat SMA yang telah menjadi nasabah Mandiri dan yang masih dapat didekati.\nLihat juga perkiraan siswa berusia 17 tahun ke atas, yang dapat memiliki KTP.',
      sheets: ['3_sekolah'],
      file: 'assets/js/section-schools.js', css: 'assets/css/section-schools.css',
      layout: 'rails',
      posture: { imagery: 'full', camera: 'ring30', rings: 'schools', layerSet: 'schools', deck: true } },
    { id: 'property', key: '4', label: 'KPR', short: 'KPR', title: 'KPR dalam 30 km', titleFull: 'Proyek perumahan dan KPR dalam 30 km',
      help: 'Proyek perumahan baru dalam 30 km dari Mabes TNI.\nIsi penghasilan bersih untuk melihat rumah yang terjangkau.\nHitung angsuran KPR di kalkulator.',
      sheets: [],
      file: 'assets/js/section-property.js', css: 'assets/css/section-property.css',
      layout: 'rails',
      posture: { imagery: 'full', camera: 'ring30', rings: 'property', layerSet: 'property', deck: true } },
    { id: 'data', key: '5', label: 'Data & Privasi', short: 'Data', title: 'Data & Privasi', titleFull: 'Data & Privasi',
      help: 'Impor laporan bulanan Rev LVM apa adanya.\nImpor juga file EDC dan SMA dari template permintaan data.\nSimpan salinan terenkripsi agar data terbuka lagi saat masuk.\nFile hanya dibaca di komputer ini.',
      sheets: ['1_lvm', '2_edc', '3_sekolah'],
      file: 'assets/js/section-data.js', css: 'assets/css/section-data.css',
      layout: 'page',
      posture: { imagery: 'dimmed', camera: null, rings: null, layerSet: null, deck: false } }
  ];

  // Camera padding per layout (§C.1, property §8.1). `right` for sheets = sheetWidth + 28.
  // 'page' (UX fix plan A-03): a full-width page without a map (Ringkasan, Data & Privasi); no camera padding.
  var LAYOUTS = {
    rails: { padding: { top: 148, left: 388, right: 412, bottom: 188 } },
    sheet: { padding: { top: 148, left: 16, right: 28, bottom: 64 }, sheetWidth: 'var(--sheet-w)', rightIsSheetOffset: true },
    'sheet-wide': { padding: { top: 148, left: 16, right: 28, bottom: 64 }, sheetWidth: 'clamp(820px, 70vw, 1180px)', rightIsSheetOffset: true },
    page: { padding: { top: 0, left: 0, right: 0, bottom: 0 }, page: true, map: false, maxWidth: 1280 }
  };

  /* -------------------------------------------------------------- keymap */

  // One table for every shortcut. scope 'global' fires in every section; a section id
  // fires only there. Keys are lower-case KeyboardEvent.key values; modifiers as
  // 'shift+f', 'mod+k' (⌘ or Ctrl). Collision rule: no section sees the same key twice
  // (checked by tests/core.test.mjs). Every key is also a visible button.
  // The map is always flat and north-up (COPY_STYLE_EN item 10): no 2D/3D, orbit or tilt keys.
  var KEYMAP = [
    { key: 'mod+k', scope: 'global', action: 'palette', label: 'Cari' },
    { key: 'mod+shift+l', scope: 'global', action: 'lock', label: 'Kunci dashboard' },
    { key: '?', scope: 'global', action: 'help', label: 'Buka bantuan' },
    { key: 'escape', scope: 'global', action: 'escape', label: 'Tutup panel atau batalkan pilihan' },
    { key: 'shift+d', scope: 'global', action: 'view:toggle', label: 'Ganti tampilan Sederhana atau Detail' },
    { key: 'n', scope: 'global', action: 'theme:toggle', label: 'Ganti tema Terang atau Gelap' },
    { key: 'v', scope: 'global', action: 'veil', label: 'Samarkan nama saat berbagi layar' },
    { key: 'h', scope: 'global', action: 'map:reset', label: 'Atur ulang peta' },
    { key: 'm', scope: 'global', action: 'camera:M', label: 'Ke Mabes TNI' },
    { key: 'b', scope: 'global', action: 'camera:B', label: 'Ke cabang' },
    { key: '0', scope: 'global', action: 'camera:0', label: 'Tampilkan 10 km dari cabang' },
    { key: 'l', scope: 'global', action: 'map:legend', label: 'Tampilkan atau sembunyikan keterangan' },
    { key: '[', scope: 'global', action: 'rail:left', label: 'Buka atau perkecil panel ringkasan' },
    { key: ']', scope: 'global', action: 'rail:right', label: 'Buka atau perkecil daftar & grafik' },
    /* item 43 (MCD.windows): Rapikan and the panel cycle */
    { key: 't', scope: 'global', action: 'windows:tidy', label: 'Rapikan kartu dan panel' },
    { key: 'f6', scope: 'global', action: 'windows:next', label: 'Pindah ke panel berikutnya' },
    { key: 'shift+f6', scope: 'global', action: 'windows:prev', label: 'Pindah ke panel sebelumnya' },
    { key: 'i', scope: 'property', action: 'property:income', label: 'Isi penghasilan bersih' },
    { key: 'k', scope: 'property', action: 'property:calculator', label: 'Buka kalkulator KPR' },
    { key: ',', scope: 'property', action: 'property:tenor-', label: 'Kurangi tenor 1 tahun' },
    { key: '.', scope: 'property', action: 'property:tenor+', label: 'Tambah tenor 1 tahun' },
    { key: 's', scope: 'property', action: 'property:stress', label: 'Uji kenaikan bunga 0 sampai 3%' },
    { key: 'c', scope: 'property', action: 'property:color', label: 'Ganti warna peta: keterjangkauan, segmen atau harga' },
    { key: 'p', scope: 'property', action: 'property:print', label: 'Cetak simulasi' }
  ];
  SECTIONS.forEach(function (s) {
    KEYMAP.unshift({ key: s.key, scope: 'global', action: 'section:' + s.id, label: 'Buka ' + s.label });
  });

  /* ---------------------------------------------------------- programs */

  // §F.4 verbatim, + AM-5 (SME) + property addendum (§3.4, §16). `end` inclusive.
  var PROGRAMS = [
    { id: 'ksm-tni', label: 'KSM untuk TNI (AL, AU, Mabes TNI)', short: 'KSM TNI', product: 'KSM', end: '2026-10-31', terms: 'hingga Rp1 miliar · 15 tahun · bunga 8,25% tetap', src: 'bankmandiri.co.id/ksm-tni', origin: 'F.4' },
    { id: 'ksm-hut28', label: 'KSM HUT Mandiri ke-28 (Livin’)', product: 'KSM', start: '2026-10-02', end: '2026-10-31', terms: 'bunga 8,25% · gaji melalui Mandiri', src: 'bankmandiri.co.id/ksm-hut-mandiri-28', origin: 'F.4' },
    { id: 'ksm-tni-ad', label: 'KSM TNI AD Payroll', short: 'KSM TNI AD', product: 'KSM', end: '2026-12-31', terms: 'hingga Rp1,5 miliar · tanpa biaya provisi · potongan biaya admin Rp100.000', src: 'bankmandiri.co.id/ksm-tni-ad-payroll', origin: 'F.4' },
    { id: 'kpr-spesial', label: 'KPR bunga spesial, take over dan top up 7,77%', product: 'KPR', end: '2026-11-30', terms: 'Take over atau top up: bunga 7,77% tetap 10 tahun', src: 'bankmandiri.co.id/kpr-bunga-spesial', origin: 'F.4' },
    { id: 'kpr-apply', label: 'Pengajuan KPR dan KPR subsidi (FLPP)', product: 'KPR', end: '2026-12-31', terms: 'FLPP bunga 5% tetap · DP 1%', src: 'bankmandiri.co.id/kredit-pemilikan-rumah-bersubsidi', origin: 'F.4' },
    { id: 'bi-ltv', label: 'DP 0% untuk KPR dan KKB (PADG 30/2025)', product: 'KPR', end: '2026-12-31', terms: 'Pinjaman hingga 100% harga (LTV 100%)', src: 'bi.go.id PADG 30/2025', origin: 'F.4' },
    { id: 'livin-kkb', label: 'Bunga KKB mobil baru di Livin’', product: 'KKB', end: '2026-12-31', terms: 'Bunga flat mulai 1,45%, angsuran pertama dibayar di muka (ADDM)', src: 'bankmandiri.co.id/livin/auto', origin: 'F.4' },
    { id: 'lvm-mdr', label: 'MDR spesial Livin’ Merchant 0,3%', product: 'BIZ', end: '2026-12-31', terms: '0% untuk transaksi sampai Rp100.000 (aturan BI, mulai 1 Okt 2026)', src: 'bankmandiri.co.id/livin-merchant-special', origin: 'F.4' },
    { id: 'lvm-melaju', label: 'MELAJU Merchant Hoki', product: 'BIZ', start: '2026-08-01', end: '2026-12-31', terms: 'Rp200.000 untuk 100 merchant setiap bulan', src: 'bankmandiri.co.id/lvm-melaju', origin: 'F.4' },
    { id: 'kur-2026', label: 'Program KUR Mandiri 2026', product: 'BIZ', end: '2026-12-31', terms: 'KUR Super Mikro 3% · KUR Mikro dan Kecil 6% (Permenko 1/2026)', src: 'bankmandiri.co.id/kredit-usaha-rakyat-kur', origin: 'AM-5' },
    { id: 'kpp-2026', label: 'Kredit Program Perumahan (KPP)', product: 'BIZ', end: '2026-12-31', terms: 'Untuk developer: Rp500 juta–5 miliar per kontrak · bunga hingga 6%', src: 'bankmandiri.co.id/kredit-program-perumahan', origin: 'AM-5' },
    { id: 'kpr-lelang', label: 'KPR Lelang (rumah lelang Bank Mandiri)', product: 'KPR', end: '2026-12-31', terms: 'Pinjaman hingga 80% dari nilai limit lelang · bunga tetap 2,60% tahun pertama, lalu berjenjang', src: 'bankmandiri.co.id/web/guest/program-marketing-kpr-lelang-reguler', origin: 'PROP' },
    { id: 'ppn-dtp', label: 'PPN ditanggung pemerintah untuk rumah baru (PMK 90/2025)', product: 'KPR', start: '2026-01-01', end: '2026-12-31', terms: 'PPN ditanggung hingga Rp2 miliar untuk rumah sampai Rp5 miliar · serah terima paling lambat 31 Des 2026', src: 'PMK 90/2025', origin: 'PROP' }
  ];

  /* ----------------------------------------------------------------- map */

  // Every map is flat and north-up (COPY_STYLE_EN item 10): pitch 0, bearing 0, no
  // 3D buildings, no orbit. Overview draws the street map, Deep dive flat satellite imagery.
  var MAP = {
    imagery: {
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics'
    },
    vector: { url: 'https://tiles.openfreemap.org/planet', attribution: 'OpenFreeMap © OpenMapTiles · data dari OpenStreetMap' },
    // Overview street basemap (OpenFreeMap styles, merged into the map at runtime; icons and
    // the Natural Earth raster are dropped so no sprite or extra host is needed).
    street: {
      day: 'https://tiles.openfreemap.org/styles/positron',
      night: 'https://tiles.openfreemap.org/styles/dark',
      attribution: 'OpenFreeMap © OpenMapTiles · data dari OpenStreetMap'
    },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    font: 'Noto Sans Regular',
    attribution: {
      base: 'Esri, Maxar, Earthstar Geographics',
      vector: 'OpenFreeMap © OpenMapTiles · data dari OpenStreetMap',
      mabes: 'Batas Mabes TNI: OpenStreetMap way 912445334 (ODbL)',
      merchants: '© Overture Maps Foundation · Foursquare (Apache-2.0) · © OpenStreetMap',
      sme: '© Overture Maps Foundation · Foursquare (Apache-2.0) · © OpenStreetMap'
    },
    init: {   // §E.1, flat
      center: [106.9118, -6.3310], zoom: 13.4, pitch: 0, bearing: 0,
      maxPitch: 0, minZoom: 9, maxZoom: 19.5,
      maxBounds: [[105.9, -6.85], [107.9, -5.8]],   // mirrors MAX_BOUNDS in map.js (wide enough for the KPR 30 km circle)
      fadeDuration: 200
    },
    intro: { center: [106.9118, -6.3310], zoom: 12.2, pitch: 0, bearing: 0, maxMs: 2400 },
    flyTo: { duration: 1800, curve: 1.25, easing: 'camera' },
    // Camera presets (flat). fit kinds are resolved by map.js.
    presets: {
      H: { label: 'Sekitar cabang dan Mabes TNI', center: [106.9118, -6.3310], zoom: 13.4, pitch: 0, bearing: 0 },
      M: { label: 'Ke Mabes TNI', center: [106.91366, -6.32945], zoom: 15.1, pitch: 0, bearing: 0 },
      B: { label: 'Ke cabang', center: 'branch', zoom: 16.6, pitch: 0, bearing: 0 },
      '0': { label: '10 km dari cabang', fit: 'ring', anchor: 'branch', km: 10, pitch: 0, bearing: 0 },
      '5': { label: '5 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 5, pitch: 0, bearing: 0 },
      '10': { label: '10 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 10, pitch: 0, bearing: 0 },
      sme15: { label: '15 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 15, pitch: 0, bearing: 0 },
      ring30: { label: '30 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 30, pitch: 0, bearing: 0 }
    },
    // §E.3 imagery postures (Deep dive satellite tint). Paint transitions 600 ms. No 3D buildings.
    postures: {
      full: { brightnessMax: 0.52, saturation: -0.70, wash: 0.38, buildings: 'off' },
      plan: { brightnessMax: 0.42, saturation: -0.80, wash: 0.46, buildings: 'flat', flatOpacity: 0.22 },
      merchants: { brightnessMax: 0.46, saturation: -0.78, wash: 0.42, buildings: 'off' },
      dimmed: { brightnessMax: 0.18, saturation: -0.90, wash: 0.60, buildings: 'off' }
    },
    postureMs: 600,
    labelAnchor: [106.91340, -6.31790],   // §E.4 Mabes label
    labelMinZoom: 12,
    imageryFailure: { errors: 6, windowMs: 10000 }
  };

  // Distance rings (§E.2, §E.4, property P2). Union of radii: 1/3/5/10/15/20/30 km.
  var RINGS = {
    radiiKm: [1, 3, 5, 10, 15, 20, 30], vertices: 128, R: 6371.0088,
    center: [106.91329, -6.32818],          // Mabes TNI centre used by every data file (property D1)
    sets: {
      default: { anchor: 'branch', show: [1, 3, 5, 10, 20], core: null, outer: null },
      merchants: { anchor: 'center', show: [3, 5, 10, 15], core: 15, outer: null },
      property: { anchor: 'center', show: [5, 10, 15, 20, 30], core: 30, outer: 30 },
      schools: { anchor: 'center', show: [5, 10, 15, 30], core: 15, outer: 30 }
    }
  };

  /* ----------------------------------------------------------------- CDN */

  // §J.3 pinned libraries (primary + mirror share the SRI hash). index.html uses `primary`;
  // app.js injects `mirror` with the same integrity when a global is missing.
  var CDN = {
    maplibre: { global: 'maplibregl', primary: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js', mirror: 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', integrity: 'sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj' },
    maplibreCss: { primary: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css', mirror: 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css', integrity: 'sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V' },
    deck: { global: 'deck', primary: 'https://cdn.jsdelivr.net/npm/deck.gl@9.0.41/dist.min.js', mirror: 'https://unpkg.com/deck.gl@9.0.41/dist.min.js', integrity: 'sha384-paGNIdvc5jHDlOq9Lcg+VKOSmOzm82uTvGpZhDNwTtNu7l5EONhLnqs9skE1bP2w' },
    d3: { global: 'd3', primary: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js', mirror: 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js', integrity: 'sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i' },
    papa: { global: 'Papa', primary: 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js', mirror: 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', integrity: 'sha384-D/t0ZMqQW31H3az8ktEiNb39wyKnS82iFY52QPACM+IjKW3jDUhyIgh2PApRqJZs' },
    xlsx: { global: 'XLSX', lazy: true, primary: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', mirror: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', integrity: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw' },
    fonts: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300..600;1,8..60,400&family=Inter+Tight:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
    loadTimeoutMs: 8000
  };

  /* ------------------------------------------------------------- config */

  var cfg = {
    appVersion: '1.0.0',
    appName: 'Dashboard Akuisisi',
    asOfDemo: '2026-10-12', asOfTimeLabel: '08.00 WIB',
    seed: 20261012,
    locale: 'id-ID', currency: 'IDR', timeZone: 'Asia/Jakarta', tzLabel: 'WIB',

    // §F.2 / §E.4 home branch (user-placed Foursquare pin; verify on site). Editable.
    branch: { lat: -6.33203, lon: 106.90989, label: 'Bank Mandiri KCP Jakarta Cilangkap', confidence: 'medium' },
    // Mabes TNI centre used by SME, property and schools data files (property D1). Not editable.
    center: { lat: -6.32818, lon: 106.91329, label: 'Mabes TNI Cilangkap' },

    dsrCap: 0.40,                      // ASSUMPTION (internal cap not public), editable; KPR affordability default
    retire: {
      tmtNextMonth: true, tamtamaBintara: 55, pamaPamen: 58, pati: [60, 61, 62, 63], pns: 58,
      // UU 3/2025 Pasal II, Tamtama/Bintara (completed age on 26 Mar 2025: 52 → 53, 51 → 54)
      transition: [{ bornOnOrBefore: '1973-03-26', bup: 53 }, { bornOnOrBefore: '1974-03-26', bup: 54 }],
      // UU 3/2025 Pasal II, Pati ★1–★3 (age 57 → 58/58/60, age 56 → 59/59/60); ★4 has none
      patiTransition: [{ bornOnOrBefore: '1968-03-26', bup: [58, 58, 60] }, { bornOnOrBefore: '1969-03-26', bup: [59, 59, 60] }],
      lawDate: '2025-03-26'
    },
    geocode: { kelurahanJitterM: 350 },
    veilCellM: 250,
    farSiteKm: 12,
    merchantRadiusKm: 15,              // merchant acquisition scope: 15 km from the Mabes TNI centre
    programs: PROGRAMS,
    programsExpired: [],
    hosts: { imagery: 'server.arcgisonline.com', vector: 'tiles.openfreemap.org' },

    // Auth gate addendum §2.2 (read by MCD.gate.mount()).
    gate: { idleMinutes: 15, map: true },

    sections: SECTIONS,
    layouts: LAYOUTS,
    keymap: KEYMAP,
    map: MAP,
    rings: RINGS,
    cdn: CDN,

    // Status colour code used everywhere (COPY_STYLE_EN item 11). Legends always say the words.
    // Colours are CSS tokens (tokens.css / brand.css): never hard-code them in sections.
    // `potential` is the neutral blue shown before the LVM file is imported (never a fake red).
    statusScale: {
      acquired: { label: 'Sudah diakuisisi', short: 'Sudah', token: '--status-ok', tone: 'ok' },
      partly: { label: 'Sebagian diakuisisi', short: 'Sebagian', token: '--status-mid', tone: 'mid' },
      notYet: { label: 'Belum ada di LVM', short: 'Belum', token: '--status-bad', tone: 'bad' },
      noData: { label: 'Tidak ada data', short: 'Tanpa data', token: '--status-none', tone: 'none' },
      potential: { label: 'Potensi (file LVM belum diimpor)', short: 'Potensi', token: '--status-potential', tone: 'potential' }
    },
    // Coverage bands for kecamatan (share of the merchants we know of that are already acquired).
    // ASSUMPTION shown in legends as words: hijau ≥ 50% · kuning 20–50% · merah < 20%.
    coverageBands: { ok: 0.5, mid: 0.2 },
    // distance: the shared travel-time switches of MCD.distance ("Jam sibuk", "Motor (tanpa tol)"), JSON {peak, noToll}
    storageKeys: { settings: 'mcd.settings', lastView: 'mcd.lastView', theme: 'mcd.ui.theme', lastDownload: 'mcd.data.lastDownload', distance: 'mcd.distance.v1', windows: 'mcd.ui.windows.v1' },

    // Global view modes (U6). Stored in state.view and the URL hash (view=deep); default overview.
    views: [
      { id: 'overview', label: 'Sederhana', hint: 'Angka utama dan peta jalan' },
      { id: 'deep', label: 'Detail', hint: 'Semua filter, grafik, tabel dan peta satelit' }
    ],
    themes: [
      { id: 'day', label: 'Terang', icon: 'sun' },
      { id: 'night', label: 'Gelap', icon: 'moon' }
    ],

    copy: {
      brand: 'BANK MANDIRI', branchName: 'KCP Jakarta Cilangkap',
      brandLine: 'BANK MANDIRI · KCP JAKARTA CILANGKAP', product: 'Dashboard Akuisisi',
      noData: 'Belum ada data bank',
      noDataLong: 'Belum ada data bank. Impor file LVM di Data & Privasi.',
      asOf: 'Data per 12 Okt 2026 · 08.00 WIB',
      legendUnits: 'jt = juta · M = miliar · T = triliun',
      notApplicable: 'Tidak berlaku di bagian ini',
      assumption: 'asumsi, dapat diubah di Data & Privasi › Pengaturan & sumber',
      lock: 'Kunci',
      gateMissing: 'Halaman masuk tidak termuat',
      gateMissingBody: 'File halaman masuk tidak termuat, sehingga dashboard tidak dapat dibuka.\nPengelola dashboard: periksa assets/js/gate.js, assets/js/vault.js dan data/vault.js.',
      settingsMemoryOnly: 'Nilai dari salinan terenkripsi hanya berlaku sampai dashboard dikunci.\nTekan Simpan salinan terenkripsi untuk menyimpannya.',
      provenance: 'Sumber {file} · {n} baris · hanya di komputer ini · {date} {time} WIB',
      template: 'templates/Permintaan_Data_KCP_Cilangkap.xlsx'
    }
  };

  // Keep any gate options set before this file loaded (e.g. a preview page).
  if (prior.gate && typeof prior.gate === 'object') {
    Object.keys(prior.gate).forEach(function (k) { cfg.gate[k] = prior.gate[k]; });
  }

  /* ---------------------------------------------------- lookups / helpers */

  cfg.sectionById = {};
  SECTIONS.forEach(function (s, i) { s.index = i; cfg.sectionById[s.id] = s; });
  cfg.sectionByKey = {};
  SECTIONS.forEach(function (s) { cfg.sectionByKey[s.key] = s; });
  cfg.programById = {};
  PROGRAMS.forEach(function (p) { cfg.programById[p.id] = p; });

  /** Active key bindings for a section: global + that section's own. */
  cfg.keysFor = function (sectionId) {
    return KEYMAP.filter(function (k) { return k.scope === 'global' || k.scope === sectionId; });
  };
  /**
   * Resolves a KeyboardEvent-like {key, shiftKey, metaKey, ctrlKey} for a section → keymap entry | null.
   * Letter keys are case-insensitive; Shift only matters where a 'shift+' binding exists.
   */
  cfg.keyAction = function (sectionId, ev) {
    if (!ev || ev.key == null) return null;
    var k = String(ev.key).toLowerCase();
    var mod = !!(ev.metaKey || ev.ctrlKey);
    var list = cfg.keysFor(sectionId), i;
    var combo = (mod ? 'mod+' : '') + (ev.shiftKey && /^([a-z]|f\d{1,2})$/.test(k) ? 'shift+' : '') + k;   /* letters and F-keys (Shift+F6) */
    for (i = 0; i < list.length; i++) if (list[i].key === combo) return list[i];
    if (!mod) for (i = 0; i < list.length; i++) if (list[i].key === k) return list[i];
    return null;
  };

  /** Map padding for a section layout; sheetWidthPx is the measured sheet width. */
  cfg.paddingFor = function (sectionId, sheetWidthPx) {
    var s = cfg.sectionById[sectionId];
    var L = LAYOUTS[(s && s.layout) || 'rails'] || LAYOUTS.rails;
    var p = clone(L.padding);
    if (L.rightIsSheetOffset) p.right = (sheetWidthPx || 893) + p.right;
    if (sectionId === 'property') p.bottom = 180; // property §8.1
    return p;
  };

  /** Posture for a section: {imagery:{…}, camera, rings, layerSet, deck}. */
  cfg.postureFor = function (sectionId) {
    var s = cfg.sectionById[sectionId];
    if (!s) return null;
    var p = s.posture;
    var out = clone(p);
    out.imageryKey = p.imagery;
    out.imagery = clone(MAP.postures[p.imagery] || MAP.postures.full);
    return out;
  };

  /**
   * Program status on asOf: {live, upcoming, ended, daysLeft, level}.
   * daysLeft = ceil((end − asOf) / day) with `end` inclusive (ksm-tni on 12 Okt → 19).
   * level: 'ended' | 'upcoming' | 'urgent' (≤ 30 days) | 'soon' (≤ 90) | 'normal'.
   */
  cfg.programStatus = function (p, asOf) {
    if (typeof p === 'string') p = cfg.programById[p];
    var a = parseISO(asOf || cfg.asOfDemo);
    if (!p || !a) return null;
    if (p.status === 'unavailable' || !p.end) return { live: false, upcoming: false, ended: true, daysLeft: null, level: 'ended' };
    var end = parseISO(p.end), start = p.start ? parseISO(p.start) : null;
    var daysLeft = Math.ceil((end - a) / 86400000);
    var ended = a > end, upcoming = !!(start && a < start);
    var level = ended ? 'ended' : (upcoming ? 'upcoming' : (daysLeft <= 30 ? 'urgent' : (daysLeft <= 90 ? 'soon' : 'normal')));
    return { live: !ended && !upcoming, upcoming: upcoming, ended: ended, daysLeft: daysLeft, level: level };
  };
  /** Live programs on asOf sorted by end date (then label). Optional product filter. */
  cfg.livePrograms = function (asOf, product) {
    return PROGRAMS.filter(function (p) {
      var s = cfg.programStatus(p, asOf);
      return s && s.live && (!product || p.product === product);
    }).sort(function (x, y) { return x.end < y.end ? -1 : (x.end > y.end ? 1 : (x.label < y.label ? -1 : 1)); });
  };
  /** Appends programs (e.g. MCD_SME_PLAYS.meta.newPrograms) without duplicating ids. Returns added ids. */
  cfg.mergePrograms = function (list) {
    var added = [];
    (list || []).forEach(function (p) {
      if (!p || !p.id || cfg.programById[p.id]) return;
      var c = clone(p); c.origin = c.origin || 'merged';
      PROGRAMS.push(c); cfg.programById[c.id] = c; added.push(c.id);
    });
    return added;
  };

  /* --------------------------------------------------------- settings */

  // User-editable fields (§F.2, gate addendum §4 rule 2): branch pin, KPR DSR cap, retirement rule, geocoding radius.
  var EDITABLE = ['branch', 'dsrCap', 'retire', 'geocode'];
  var DEFAULTS = {};
  EDITABLE.forEach(function (k) { DEFAULTS[k] = clone(cfg[k]); });
  var vaultOwned = {};
  var listeners = [];

  function within(x, lo, hi) { return isNum(x) && x >= lo && x <= hi; }
  /** Validates and merges a patch into the editable fields. Returns changed top-level keys. */
  function applyPatch(patch) {
    var changed = {};
    if (!patch || typeof patch !== 'object') return [];
    if (patch.branch && typeof patch.branch === 'object') {
      var b = patch.branch;
      if (within(b.lat, -6.62, -6.02) && within(b.lon, 106.55, 107.25)) {
        if (b.lat !== cfg.branch.lat || b.lon !== cfg.branch.lon) { cfg.branch.lat = b.lat; cfg.branch.lon = b.lon; changed.branch = 1; }
      }
      if (typeof b.label === 'string' && b.label.trim() && b.label !== cfg.branch.label) { cfg.branch.label = b.label.trim().slice(0, 120); changed.branch = 1; }
      if (/^(high|medium|low)$/.test(b.confidence || '') && b.confidence !== cfg.branch.confidence) { cfg.branch.confidence = b.confidence; changed.branch = 1; }
    }
    if (within(patch.dsrCap, 0.05, 0.95) && patch.dsrCap !== cfg.dsrCap) { cfg.dsrCap = patch.dsrCap; changed.dsrCap = 1; }
    if (patch.retire && typeof patch.retire.tmtNextMonth === 'boolean' && patch.retire.tmtNextMonth !== cfg.retire.tmtNextMonth) {
      cfg.retire.tmtNextMonth = patch.retire.tmtNextMonth; changed.retire = 1;
    }
    if (patch.geocode && typeof patch.geocode === 'object') {
      ['kelurahanJitterM'].forEach(function (k) {
        var v = patch.geocode[k];
        if (within(v, 0, 5000) && v !== cfg.geocode[k]) { cfg.geocode[k] = v; changed.geocode = 1; }
      });
    }
    return Object.keys(changed);
  }

  function emit(keys, source) {
    if (!keys.length) return;
    listeners.slice().forEach(function (fn) { try { fn({ keys: keys, source: source }); } catch (e) { if (typeof console !== 'undefined') console.error(e); } });
  }
  function readStored() {
    try {
      var s = (typeof window !== 'undefined') && window.localStorage;
      var raw = s ? s.getItem(cfg.storageKeys.settings) : null;
      var o = raw ? JSON.parse(raw) : null;
      return (o && o.v === 1 && o.values && typeof o.values === 'object') ? o.values : {};
    } catch (e) { return {}; }
  }
  function writeStored(values) {
    try {
      var s = (typeof window !== 'undefined') && window.localStorage;
      if (!s) return false;
      if (Object.keys(values).length) s.setItem(cfg.storageKeys.settings, JSON.stringify({ v: 1, values: values }));
      else s.removeItem(cfg.storageKeys.settings);
      return true;
    } catch (e) { return false; }
  }

  /**
   * Merges user-editable fields in memory only. opts.source: 'user' | 'storage' | 'vault'.
   * Vault-sourced keys (gate addendum §4) are marked so saveSettings() never writes them
   * to localStorage. Returns the changed top-level keys.
   */
  cfg.applyUserFields = function (patch, opts) {
    var source = (opts && opts.source) || 'user';
    var keys = applyPatch(patch);
    if (source === 'vault' && patch) {
      EDITABLE.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(patch, k)) vaultOwned[k] = true; });
    }
    emit(keys, source);
    return keys;
  };
  /** Reads localStorage['mcd.settings'] (try/catch) and applies it. Call inside MCD.boot(). */
  cfg.loadSettings = function () { return cfg.applyUserFields(readStored(), { source: 'storage' }); };
  /**
   * Applies a user edit and persists the touched non-vault keys.
   * Returns {applied, persisted, memoryOnly}. memoryOnly lists vault-owned keys (copy.settingsMemoryOnly).
   */
  cfg.saveSettings = function (patch) {
    var applied = cfg.applyUserFields(patch, { source: 'user' });
    var stored = readStored(), persisted = [], memoryOnly = [];
    EDITABLE.forEach(function (k) {
      if (!patch || !Object.prototype.hasOwnProperty.call(patch, k)) return;
      if (vaultOwned[k]) { memoryOnly.push(k); return; }
      stored[k] = k === 'retire' ? { tmtNextMonth: cfg.retire.tmtNextMonth } : clone(cfg[k]);
      persisted.push(k);
    });
    if (persisted.length && !writeStored(stored)) { memoryOnly = memoryOnly.concat(persisted); persisted = []; }
    return { applied: applied, persisted: persisted, memoryOnly: memoryOnly };
  };
  /** Restores defaults for the given keys (all editable keys when omitted) and drops them from storage. */
  cfg.resetSettings = function (keys) {
    var list = (keys && keys.length) ? keys.filter(function (k) { return EDITABLE.indexOf(k) >= 0; }) : EDITABLE.slice();
    list.forEach(function (k) {
      var d = clone(DEFAULTS[k]);
      if (d && typeof d === 'object' && !Array.isArray(d)) { Object.keys(cfg[k]).forEach(function (x) { delete cfg[k][x]; }); Object.keys(d).forEach(function (x) { cfg[k][x] = d[x]; }); }
      else cfg[k] = d;
      delete vaultOwned[k];
    });
    var stored = readStored();
    list.forEach(function (k) { delete stored[k]; });
    writeStored(stored);
    emit(list, 'reset');
    return list;
  };
  /** Snapshot of the editable fields. */
  cfg.getUserFields = function () { var o = {}; EDITABLE.forEach(function (k) { o[k] = clone(cfg[k]); }); return o; };
  cfg.defaults = function () { return clone(DEFAULTS); };
  cfg.isVaultOwned = function (k) { return !!vaultOwned[k]; };
  /** Subscribe to settings changes: fn({keys, source}). Returns an unsubscribe function. */
  cfg.onChange = function (fn) {
    listeners.push(fn);
    return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  };
  cfg.EDITABLE = EDITABLE.slice();

  MCD.config = cfg;
  /* "Cari" providers (UX fix plan A-17): a section may register at load time, before app.js exists:
     MCD.searchProviders.<id> = function (query) { return [{label, sub, run}]; }. app.js reads this object. */
  MCD.searchProviders = MCD.searchProviders || {};
})(window.MCD = window.MCD || {});
