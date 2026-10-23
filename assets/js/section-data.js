/* ==========================================================================
 * MCD.sections.data — section 5 "Data & Privacy" (key 5).
 * Sources: docs/COPY_STYLE_EN.md (product decisions 1–18; 10–18 override the
 * older ones), docs/DESIGN_DIRECTION_V2.md (exhibits, action titles, source
 * lines), docs/INTEGRATION_NOTES.md §3, §7, §10, docs/phase3-requests/lvm-engine.md
 * (whole-workbook import of the "Rev LVM" report through MCD.lvm.workbookReader).
 *
 * Scope (15 Oct 2026): three bank files only —
 *   1 Livin' Merchant (the monthly "Rev LVM" report as it is, or tab 1_lvm),
 *   2 EDC Mandiri (2_edc), 3 SMA customers (3_sekolah) — plus extra map sites.
 *   The Rev LVM workbook is read whole: its detail sheet (Rincian) becomes the
 *   stores (dataset lvm) and its UREG / USAK tabs the branch KPIs (lvm_kpi).
 *
 * Page layout without a map (UX_FIX_PLAN A-03, C-06). Bahasa Indonesia (COPY_STYLE item 19).
 * Sederhana: a status line, four colour-coded cards (LVM, EDC, SMA, salinan terenkripsi) with the colours
 *   explained in words, the review of dropped files, and ONE primary button whose action follows the state
 *   (Impor file → Pakai data ini → Simpan salinan terenkripsi). Template, Data contoh and a privacy line.
 * Detail: four tabs. Impor (drop zone first, detection, column mapping, validation report with the reason
 *   of each skipped row, data date, Apply) · File dimuat (datasets with data dates and freshness colours, the
 *   LVM file check) · Simpan & kata sandi (save flow with the "telah diunduh, belum dipasang" state, C-05) ·
 *   Pengaturan & sumber (assumptions, "Cek rating Google (opsional)", Data contoh, privacy, sources).
 *
 * Cek rating Google (COPY_STYLE_EN items 32-33, docs/GOOGLE_PLACES.md): the branch pastes its own Places API
 *   key in a password field. MCD.places (google-places.js) keeps it only in its dataset of the encrypted copy,
 *   so "Simpan salinan terenkripsi", the "Data belum disimpan" chip and "Hapus semua data" treat it like an
 *   import. Never localStorage, never logged, never shown in full after saving. Action 'data:google' opens it.
 *
 * "Waktu tempuh saat jam sibuk" (item 27): an Asumsi kept in this browser under localStorage
 *   'mcd.travel.peak.v1' ({v: 1, f}, a number only; the default is not stored). MCD.travel keeps the factor in
 *   memory, so this file applies the saved value at load (before the shell boots; a lock reloads the page).
 *   Saving or "Kembalikan nilai bawaan" fires the window event 'mcd:distance' (detail.changed 'factor') and
 *   ctx.requestRender(['settings']), so every list, drawer and KPR card repaints its jam sibuk minutes.
 *
 * v5 (items 39, 43; concept C "Kartu bertahap", MCD.windows feature-detected, nothing changes without it): the
 *   Sederhana cards draw their head through MCD.windows.card inside the colour-coded frame; the long cards (Kunci
 *   Google, kata sandi, asumsi) fold into .dd-blk sections (MCD.windows.fold, open folds remembered per card);
 *   two repeated hints show once per browser (MCD.windows.hint); Privasi gains "Atur ulang tata letak kartu"
 *   (MCD.windows.resetLayout; the layout key mcd.ui.windows.v1 belongs to the shell and holds no name, number or place).
 *
 * v6 (COPY_STYLE_EN item 45, docs/V6_SPEC.md §7.5-7.6 and §8; MCD.seal, MCD.app.lazy files feature-detected):
 *   - Simpan & kata sandi: the card "Tindak lanjut di komputer ini" (entries per list, the state word "Terenkripsi" /
 *     "Hanya selama halaman terbuka" / "Perlu kata sandi lama", the damaged and memory lines, "Buka dengan kata sandi lama"
 *     in a small dialog that hands the password to MCD.seal and clears the field at once, "Hapus daftar lama",
 *     "Hapus tindak lanjut dari komputer ini" through MCD.seal.purge()); action 'data:followups' opens it. Saving is allowed
 *     when only follow-ups exist (keepAny), removals included (MCD.seal.hasFollowups: a list emptied by removals still
 *     saves, so the removal reaches another computer), and the bullets say the lists travel in the encrypted copy;
 *     "Hapus semua data dari dashboard" says the lists stay.
 *   - Pengaturan & sumber: eight source rows for the v6 data (Dapodik and PDDikti badges on a white tile), the
 *     "perkiraan" lines and the two gap lines (Dapodik schools not on the map, unplaced PT) once their files are in;
 *     lazy files that are not in show "Dimuat saat diperlukan" and are never loaded from here.
 *   - Privasi: institutional contacts only, the follow-up encryption, the new browser keys (sealed lists, the 15 / 30 km
 *     scope per tab, the Kampus list view).
 *   No password, key or follow-up entry is ever written, logged or shown by this file.
 *
 * V8 (docs/V8_SPEC.md §3.2, §4.2; D41, D45, D46, D51, D52, D61; HEALTH_SPEC §8; MOBILE_UX_PLAN M3, M11, M16):
 *   - Impor › "Funding merchant (cabang)": ONE import row for the branch's merchant balance files (the region report
 *     "Funding Merchant Mass Retail" and the branch file "Cilangkap Merchant Area"). MCD.funding.importFiles reads one or
 *     two files and keeps branch 12903 only; its merchant-name sheet goes through the teammates' Saldo schema
 *     (MCD.importer.parse(sheet, 'saldo')). "Hasil pemeriksaan" shows counts, dates and the module's notes only (never a
 *     cell value), the dropped columns in words and the two honest lines of D46. Nothing is kept before "Gunakan data
 *     ini": then MCD.funding.apply (dataset funding_merchant) and MCD.importer.apply('saldo', …), both with the funding
 *     position date. The raw sheets are emptied as soon as they are read. One "Hapus" in File dimuat clears both.
 *     A funding or saldo file dropped on the generic Impor zone lands in this row (MCD.funding.detect, or the best schema
 *     is one with via 'funding'); such schemas, vault-only schemas and 'leads' never appear in the generic type list.
 *   - Whole-workbook readers are a list (MCD.lvm, MCD.kpi, MCD.funding .workbookReader), asked in that order. The KPI
 *     workbook of the area is checked here with MCD.kpi.visibleWarnings (D41: notes about the hidden keys never show);
 *     after "Gunakan data ini" the page offers "Lihat Posisi cabang".
 *   - Tab "Kebijakan & leads" (V7 §8 as trimmed by D41, D51, D52): the lead card (MCD.leadsUi.settingsCard), the card
 *     "Ambang daftar leads" only while the lead list is on, the KPR policy card only while KPR is shown, the Riwayat,
 *     the banner while MCD.policy.dirty(). Fields: no <form>, autocomplete off, spellcheck off, translate="no"; the tab
 *     prints one line only (D28). "Impor daftar leads" (MCD.leadsUi.importFlow) sits in Impor and shows only while on.
 *   - Actions data:policy, data:leads, data:kpi, data:funding. Sources, privacy and the browser list gain Kesehatan,
 *     funding merchant, Perkiraan omzet, the KPI file, the lead list and Rencana kunjungan; "Tindak lanjut di komputer
 *     ini" counts SMA, Kampus and Kesehatan (health.pipeline).
 *
 * Colour code (COPY_STYLE_EN item 11) for a file: green = up to date, amber =
 * update due / not saved yet, red = out of date, grey = not imported. The age
 * limits are an assumption for a monthly report and are said in the legend.
 *
 * Data rules: the dataset list, the counts and Save encrypted copy always
 * describe the REAL data (MCD.data.real(): vault + imports, set aside while
 * demo data is on). Imports never run while demo data is on
 * (MCD.demo.ensureOff). Files are read in this browser only; no value leaves
 * the page. Example values are masked unless identities are shown.
 * Safe DOM only: every text goes through textContent (ctx.el); no HTML strings.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'data';
  var W = window;
  var DOC = document;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var HOME = '12903';
  var TEMPLATE = 'templates/Permintaan_Data_KCP_Cilangkap.xlsx';
  var TEMPLATE_NAME = 'Permintaan_Data_KCP_Cilangkap.xlsx';
  var REKEY = 'node tools/make-vault.mjs --rekey data/vault.js --out data/vault.js';
  var ISSUE_PAGE = 100;
  var LOG_MAX = 14;
  var SKIP_SHEETS = /^(petunjuk|kamus[_ ]?kolom|instructions?|readme)$/i;
  // Age of a file's data date, in days: green up to ok, amber up to mid, red after. An assumption for monthly reports.
  var FRESH = { ok: 45, mid: 75 };

  /* ----------------------------------------------------------- catalogue */

  // The 3 data sheets of the request template, in template order (plain English for Overview).
  var SHEETS = [
    { code: '1_lvm', type: 'lvm', label: 'Livin’ Merchant (LVM)', short: 'Livin’ Merchant', unit: ['toko', 'toko'], main: true,
      need: 'Laporan Rev LVM', brief: 'Mulai dari sini: masukkan laporan bulanan apa adanya.', use: 'Menunjukkan merchant yang telah diakuisisi.',
      what: 'Laporan bulanan “Rev LVM”, diimpor apa adanya. Menunjukkan merchant yang telah diakuisisi.' },
    { code: '2_edc', type: 'edc', label: 'EDC Mandiri', short: 'EDC Mandiri', unit: ['terminal', 'terminal'],
      need: 'Sheet 2_edc', brief: 'Dari template permintaan data.', use: 'Menunjukkan merchant yang telah memiliki mesin EDC Mandiri.',
      what: 'Terminal EDC Mandiri (MID dan TID). Menunjukkan merchant yang telah memiliki mesin EDC Mandiri.' },
    { code: '3_sekolah', type: 'sekolah', label: 'Nasabah SMA', short: 'Nasabah SMA', unit: ['sekolah', 'sekolah'],
      need: 'Sheet 3_sekolah', brief: 'Dari template permintaan data.', use: 'SMA yang menjadi nasabah Mandiri atau prospek.',
      what: 'SMA yang menjadi nasabah Mandiri atau prospek, beserta produknya.' }
  ];
  // Datasets the importer also reads that are not tabs of the template. primary: counted in "x of n".
  var EXTRA = {
    situs: { label: 'Lokasi tambahan di peta', what: 'Lokasi milik cabang yang ditambahkan ke peta.', primary: false },
    /* merge of the public prototype (23 Oct 2026): the merchant balance report (assets/js/merchant-saldo.js), an
       optional daily file, so it is not one of the main files whose age colours the status */
    saldo: { label: 'Saldo merchant', what: 'Saldo merchant nasabah cabang per tanggal, dengan perubahan YtD, MoM, MtD dan DtD.\nCIF, nomor rekening, nama resmi dan alamat dihapus saat file dibaca. Hanya merchant KCP Jakarta Cilangkap (12903).', primary: false }
  };
  var KPI_ENTRY = { code: 'lvm_kpi', type: 'lvm_kpi', key: 'lvm_kpi', label: 'KPI cabang (UREG dan USAK)',
    what: 'Pengguna Livin’ Merchant terdaftar (UREG) dan aktif (USAK) per cabang, terhadap target.\nDari sheet UREG dan USAK laporan Rev LVM.' };
  /* V8 rows of File dimuat that are not columns of a template (D45; V7 §11.2): the funding row also holds the Saldo
     merchant list (one row, one "Hapus"); the KPI workbook and the masked lead list have rows of their own */
  /* V8 final fix: the words of the funding and KPI files on the Sederhana cards (the template sheets carry their own) */
  var V8_CARD = {
    funding: { unit: ['merchant', 'merchant'], need: 'File funding merchant cabang', brief: 'Laporan region atau file Cilangkap Merchant Area.',
      use: 'Menunjukkan merchant KCP Cilangkap di peta dan EDC yang tidak bertransaksi.' },
    kpi: { unit: ['baris', 'baris'], need: 'Laporan KPI area', brief: 'Laporan KPI area bulanan.', use: 'Hasilnya tampil di Posisi cabang.' }
  };
  var V8_ENTRY = {
    funding: { code: 'funding', type: 'funding', label: 'Funding merchant (cabang)', short: 'Funding merchant', sheetText: 'Laporan region atau file cabang',
      what: 'Laporan Funding Merchant Mass Retail atau file Cilangkap Merchant Area.\nHanya merchant KCP Jakarta Cilangkap (12903) yang disimpan.\nCIF, nomor rekening, nama resmi pemilik dan alamat dihapus saat file dibaca.' },
    kpi: { code: 'kpi', type: 'kpi', label: 'File KPI bulanan area', short: 'File KPI', sheetText: 'Laporan KPI area',
      what: 'Laporan KPI area bulanan: DPK, CASA, kredit, booking dan NPL setiap cabang terhadap target.\nHasilnya tampil di Posisi cabang.' },
    leads: { code: 'leads', type: 'leads', label: 'Daftar leads (CIF disamarkan)', short: 'Daftar leads', sheetText: 'Kebijakan & leads',
      what: 'Daftar leads dengan CIF disamarkan. Diatur di tab Kebijakan & leads.' }
  };

  // Indonesian names for canonical import columns (the template keeps its Indonesian keys).
  var COL = {
    mid: 'MID (ID merchant)', tid: 'TID (ID terminal)', store_id: 'ID toko', nama_merchant: 'Nama merchant', kategori: 'Kategori', mcc: 'MCC (kode jenis usaha)',
    lob: 'Jenis usaha', alamat: 'Alamat', kelurahan: 'Kelurahan', kecamatan: 'Kecamatan', kota: 'Kota', kode_pos: 'Kode pos', lat: 'Lintang', lon: 'Bujur', koordinat: 'Koordinat',
    tgl_registrasi: 'Tanggal registrasi', status: 'Status', grading: 'Tingkat aktivitas', kode_cabang: 'Kode cabang', nama_cabang: 'Nama cabang', area: 'Area',
    freq_mtd: 'Transaksi bulan ini', sv_mtd: 'Sales volume bulan ini', freq_30: 'Transaksi 30 hari', sv_30: 'Sales volume 30 hari', dongle: 'Dongle kartu',
    tgl_pasang: 'Tanggal pemasangan', volume_bulan: 'Volume bulanan', frekuensi_bulan: 'Transaksi bulanan',
    npsn: 'NPSN', nama_sekolah: 'Nama sekolah', yayasan: 'Yayasan', jenjang: 'Jenjang', matra: 'Matra', produk: 'Produk', status_nasabah: 'Status nasabah',
    saldo: 'Saldo', jumlah_rekening: 'Rekening', jumlah_siswa: 'Siswa', jumlah_guru: 'Guru', tgl_mulai: 'Nasabah sejak', bank_pesaing: 'Bank pesaing',
    nama: 'Nama', jenis: 'Jenis', keyakinan: 'Ketepatan lokasi', tier: 'Tingkat (1–3)',
    /* Saldo merchant (merge of 23 Oct 2026) */
    nama_dba: 'Nama usaha (DBA)', jumlah_edc: 'Jumlah EDC', segmen: 'Segmen', ytd: 'Perubahan YtD', mom: 'Perubahan MoM', mtd: 'Perubahan MtD',
    dtd: 'Perubahan DtD', flag_mom: 'Tanda MoM (Drop / Growth)', flag_mtd: 'Tanda MtD (Drop / Growth)', ada_edc: 'Ada EDC'
  };
  var TYPE_LABEL = { string: 'Teks', number: 'Angka', int: 'Bilangan bulat', rp: 'Rupiah', pct: 'Persen', date: 'Tanggal', bool: 'Ya / tidak', enum: 'Kode', kol: 'Kol 1–5' };
  var GEO_LABEL = { EXACT: 'Koordinat tepat', KELURAHAN_APPROX: 'Perkiraan dari kelurahan', NONE: 'Tanpa lokasi' };
  var TONE_CLASS = { ok: 'ok', mid: 'mid', bad: 'bad', none: 'none', demo: 'mid' };

  /* --------------------------------------------------------- module state */

  // Kept across remounts (Overview ⇄ Deep dive); memory only, gone on lock or reload.
  var S = {
    staged: [],             // files read and checked, waiting for "Apply"
    log: [],                // what happened, newest first
    reading: 0,             // files being read
    progress: null,         // {label, done, total}
    savedAt: null,          // last successful Save encrypted copy in this session
    saving: false,
    changed: false,         // real data changed since unlock or since the last save
    templateTaken: false,   // the template link was used in this session
    showMap: true,          // Deep dive: draw where the records are
    scrollTo: null,         // block to bring into view after a remount
    matching: false,        // MCD.lvm.matchAsync() running
    matchTried: -1,         // data version of the last match attempt
    matchError: false,      // the last match attempt failed
    uid: 0
  };
  var ctx = null, page = null, ui = null;
  var CH = {};              // live charts of this mount: key → {host, inst}
  var HINTS = {};           // v5: which repeated hints this mount shows (MCD.windows.hint, once per browser)

  /* ------------------------------------------------------------- helpers */

  function F() { return MCD.util.fmt; }
  function el(tag, attrs, kids) { return ctx.el(tag, attrs, kids); }
  function icon(name, extra) { return ctx.icon(name, extra); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function nInt(x) { return F().int(x); }
  function cap1(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function fm0(x) { return F().int(x); }
  /** Indonesian has no plural: one word for both (the second argument is kept for older call sites). */
  function plural(x, one, many) { return nInt(x) + ' ' + (many && WORD_ID[many] ? WORD_ID[many] : (WORD_ID[one] || one)); }
  var WORD_ID = { row: 'baris', rows: 'baris', store: 'toko', stores: 'toko', terminal: 'terminal', terminals: 'terminal', school: 'sekolah', schools: 'sekolah',
    place: 'lokasi', places: 'lokasi', branch: 'cabang', branches: 'cabang', record: 'data', records: 'data', sheet: 'sheet', sheets: 'sheet', file: 'file', files: 'file',
    column: 'kolom', columns: 'kolom', day: 'hari', days: 'hari', note: 'catatan', notes: 'catatan', warning: 'peringatan', warnings: 'peringatan', dataset: 'jenis data', datasets: 'jenis data', tab: 'sheet', tabs: 'sheet',
    'personal column': 'kolom data pribadi', 'personal columns': 'kolom data pribadi', 'row skipped': 'baris dilewati', 'rows skipped': 'baris dilewati',
    'row imported with a warning': 'baris diimpor dengan peringatan', 'rows imported with a warning': 'baris diimpor dengan peringatan',
    'EDC merchant': 'merchant EDC', 'EDC merchants': 'merchant EDC' };
  /** Reason with its column after the first sentence: "ID ganda di file ini (kolom store_id). Hanya baris pertama yang disimpan." */
  function reasonLine(g) {
    var r = String(g.reason || '').replace(/\.$/, ''), i = r.indexOf('. ');
    if (!g.col) return r + '.';
    return i < 0 ? r + ' (kolom ' + g.col + ').' : r.slice(0, i) + ' (kolom ' + g.col + ').' + r.slice(i + 1) + '.';
  }
  function joinWords(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' dan ' + a[a.length - 1]; }
  function pct(x, d) { return F().pct(x, d == null ? 0 : d); }
  function deep() { return !!ctx && ctx.view() === 'deep'; }
  function demoOn() { return !!(MCD.demo && MCD.demo.isOn()); }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  /** Text with "\n" as separate lines (COPY_DECK_ID: one idea per line, drawn with <br>). */
  function setLines(node, text) {
    if (!node) return node;
    clear(node);
    String(text == null ? '' : text).split('\n').forEach(function (ln, i) { if (i) node.appendChild(DOC.createElement('br')); node.appendChild(DOC.createTextNode(ln)); });
    return node;
  }
  function reduced() { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function privacyMode() { return ctx ? ctx.privacy() : 'masked'; }
  function noop() { /* nothing to do */ }
  function charts() { var C = MCD.charts; return C && typeof C.statusBar === 'function' && typeof C.donut === 'function' && typeof C.combo === 'function' && W.d3 ? C : null; }
  function dataVersion() { return (MCD.data && MCD.data.version) || 0; }
  function rowsOf(key) { var d = MCD.data; return d && Array.isArray(d[key]) ? d[key] : []; }
  function metaOf(key) { return (MCD.data && MCD.data.meta && MCD.data.meta[key]) || {}; }
  function isDemoSet(key) { return metaOf(key).source === 'demo'; }
  function today() { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }

  // Small stroke icons that the shared sprite does not carry (16 px grid, currentColor).
  var PATHS = {
    file: ['M4 1.75h5.25L12.25 4.75v9.5H4z', 'M9.25 1.75v3h3'],
    sheet: ['M2.5 2.75h11v10.5h-11z', 'M2.5 6.25h11M2.5 9.75h11M6.25 2.75v10.5'],
    trash: ['M3 4.5h10', 'M6.25 4.5V2.75h3.5V4.5', 'M4.5 4.5l.6 8.75h5.8l.6-8.75'],
    shield: ['M8 1.75l5 1.9v3.9c0 3.05-2.15 5.35-5 6.7-2.85-1.35-5-3.65-5-6.7V3.65z', 'M5.75 8l1.6 1.6L10.5 6.4'],
    terminal: ['M2 3h12v10H2z', 'M4.75 6.25L6.5 8l-1.75 1.75', 'M8 9.75h3'],
    key: ['M10.25 2.25a3.5 3.5 0 1 1-3.1 5.1L2.25 12.25v1.5h2v-1.25h1.25v-1.25h1.25l1.4-1.4'],
    globe: ['M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5z', 'M1.75 8h12.5', 'M8 1.75c1.7 1.75 2.5 3.8 2.5 6.25S9.7 12.5 8 14.25C6.3 12.5 5.5 10.45 5.5 8S6.3 3.5 8 1.75z'],
    nocommit: ['M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5z', 'M3.6 3.6l8.8 8.8']
  };
  function svgIcon(name, extra) {
    var s = DOC.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'icon' + (extra ? ' ' + extra : ''));
    s.setAttribute('viewBox', '0 0 16 16');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    (PATHS[name] || []).forEach(function (d) { var p = DOC.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }

  /* ------------------------------------- MCD.windows (v5, concept C "Kartu bertahap"; COPY_STYLE_EN item 43) */

  /** MCD.windows when it has `name` (the SHELL lane's module; it may load later or not at all). */
  function winApi(name) { var Wn = MCD.windows; return Wn && typeof Wn === 'object' && typeof Wn[name] === 'function' ? Wn : null; }
  /**
   * A repeated hint (item 39e): MCD.windows.hint(id, node) shows it once per browser (the node the first time, null
   * afterwards). Decided once per mount, so a redraw keeps what this visit showed. Without the shell's hint (or when
   * it fails) the node always shows, as before v5.
   */
  function hintOnce(id, node) {
    if (Object.prototype.hasOwnProperty.call(HINTS, id)) return HINTS[id] ? node : null;
    var Wn = winApi('hint'), shown = true;
    if (Wn) { try { var got = Wn.hint(id, node); shown = got != null && got !== false; } catch (e) { shown = true; } }
    HINTS[id] = shown;
    return shown ? node : null;
  }
  /**
   * One folding section of a long form (item 39a): section.dd-blk with an h3.dd-blk__t heading, the markup that
   * MCD.windows.fold(container, kind) turns into a fold (open folds remembered per kind). Without the shell's fold the
   * heading simply stays a heading.
   */
  function blk(cls, title, kids, o) {
    o = o || {};
    return el('section', { class: 'dd-blk dp-blk' + (cls ? ' ' + cls : ''), 'data-fold': o.key || null, 'data-preview': o.preview || null },
      [el('h3', { class: 'dp-h3 dd-blk__t', text: title })].concat(kids || []));
  }
  /** Folds the .dd-blk sections of a container through MCD.windows.fold (no-op without it). */
  function foldIn(container, kind) {
    var Wn = winApi('fold');
    if (!Wn || !container) return false;
    try { Wn.fold(container, kind); return true; } catch (e) { return false; }
  }
  /** Opens the fold that holds `node` (e.g. the Google key field before it is focused). */
  function unfoldFor(node) {
    var b = node;
    while (b && !(b.classList && b.classList.contains('dd-blk'))) b = b.parentNode;
    if (!b || typeof b.querySelector !== 'function') return;
    var t = b.querySelector('.dd-blk__t'), btn = t && typeof t.querySelector === 'function' ? t.querySelector('button[aria-expanded="false"]') : null;
    if (btn) btn.click();
  }
  /**
   * A card of the Sederhana page in the shared card head (MCD.windows.card: eyebrow, title, chips, numbers, note; the
   * same head as the map callout and the detail sheet), else null (the page keeps its own .dp-dc markup).
   */
  function sharedCard(spec) {
    var Wn = winApi('card');
    if (!Wn) return null;
    var n = null;
    try { n = Wn.card(spec); } catch (e) { n = null; }
    return n && n.nodeType === 1 ? n : null;
  }

  function colLabel(key) {
    if (COL[key]) return COL[key];
    var s = String(key || '').replace(/[_]+/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
  }

  /** Masked example value: first character + dots unless identities are shown. */
  function sample(v, personal) {
    if (v == null || v === '') return '';
    var s;
    if (v && typeof v.getTime === 'function') s = isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
    else s = String(v).trim();
    if (!s) return '';
    if (personal && privacyMode() !== 'reveal') return s.charAt(0) + '•••';
    return s.length > 32 ? s.slice(0, 31) + '…' : s;
  }

  function downloadText(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = DOC.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    a.style.display = 'none';
    DOC.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 0);
  }

  function copyText(text) {
    if (W.navigator && W.navigator.clipboard && W.navigator.clipboard.writeText) return W.navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = DOC.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      DOC.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = DOC.execCommand('copy'); } catch (e) { ok = false; }
      DOC.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  /* ------------------------------------------------- status colour words */

  function daysSince(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(iso));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]), t = new Date();
    t.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : Math.round((t - d) / 864e5);
  }
  /** Freshness of a loaded file: {tone: 'ok'|'mid'|'bad'|'none', word, days}. */
  function freshness(n, meta) {
    if (!n) return { tone: 'none', word: 'Belum diimpor' };
    var d = meta && meta.asOf ? daysSince(meta.asOf) : null;
    if (d == null) return { tone: 'mid', word: 'Tanggal data belum ada' };
    if (d <= FRESH.ok) return { tone: 'ok', word: 'Terbaru', days: d };
    if (d <= FRESH.mid) return { tone: 'mid', word: 'Perlu diperbarui', days: d };
    return { tone: 'bad', word: 'Kedaluwarsa', days: d };
  }
  function ageText(f) {
    if (!f || !isNum(f.days)) return '';
    if (f.days <= 0) return 'bertanggal hari ini';
    return plural(f.days, 'day', 'days') + ' lalu';
  }
  var TONE_RANK = { bad: 3, mid: 2, ok: 1, none: 0 };
  function chip(tone, word, extra) {
    return el('span', { class: 'dp-chip dp-chip--' + (TONE_CLASS[tone] || 'none') + (extra ? ' ' + extra : ''), text: word });
  }
  /** Legend in words for the file colours (COPY_STYLE_EN item 11). */
  function freshLegend(withSave) {
    var items = [
      ['ok', 'Hijau', 'terbaru (data paling lama ' + FRESH.ok + ' hari)' + (withSave ? ' atau tersimpan' : '')],
      ['mid', 'Kuning', 'perlu diperbarui (' + FRESH.ok + '–' + FRESH.mid + ' hari)' + (withSave ? ' atau belum disimpan' : '')],
      ['bad', 'Merah', 'kedaluwarsa (lebih dari ' + FRESH.mid + ' hari)'],
      ['none', 'Abu-abu', 'belum diimpor']
    ];
    return el('ul', { class: 'dp-legend', 'aria-label': 'Arti warna' }, items.map(function (i) {
      return el('li', { class: 'dp-legend__i' }, [el('span', { class: 'dp-legend__sw dp-legend__sw--' + i[0], 'aria-hidden': 'true' }),
        el('span', null, [el('strong', { text: i[1] }), ' = ' + i[2]])]);
    }));
  }

  /* ------------------------------------------------------- real datasets */

  // Whole-workbook reader: the "Rev LVM" report (Rincian + UREG / USAK) read by the LVM engine
  // (docs/phase3-requests/lvm-engine.md). Interface: {TYPE, HOME, label, what, detect(names), read(file),
  // toRecords(sc), apply(sc, meta), periodLabel(p), summary(sc)}. Null when lvm.js is not loaded.
  function kpiMod() { return (MCD.lvm && MCD.lvm.workbookReader) || null; }
  function kpiKey() { return MCD.data && MCD.data.keyFor ? MCD.data.keyFor('lvm_kpi') : null; }
  function wbLabel(e) { var K = (e && e.reader) || kpiMod(); return (K && K.label) || 'Laporan Livin’ Merchant (Rev LVM)'; }
  /* V8 §4.2.3: the whole-workbook readers, asked detect() in this order: the Rev LVM report, the KPI workbook of the area
     (MCD.kpi, V7 §9.2) and the funding merchant report (MCD.funding; handed to the one import row, D45) */
  function workbookReaders() {
    return [MCD.lvm && MCD.lvm.workbookReader, MCD.kpi && MCD.kpi.workbookReader, MCD.funding && MCD.funding.workbookReader]
      .filter(function (R) { return R && typeof R === 'object' && typeof R.detect === 'function'; });
  }
  function readerType(R) { return (R && R.TYPE) || 'lvm'; }
  /** {R, det} for the first reader that knows the workbook (sheet names; the funding reader also reads the sheets), else null. */
  function detectWorkbook(names, sheets) {
    var rs = workbookReaders();
    for (var i = 0; i < rs.length; i++) {
      var R = rs[i], d = null;
      try { d = R.detect(readerType(R) === 'funding' ? sheets : names); } catch (e) { d = null; }
      if (d && d.ok) return { R: R, det: d };
    }
    return null;
  }

  function schemasByType() {
    var out = {};
    try { (MCD.importer && MCD.importer.schemas ? MCD.importer.schemas() : []).forEach(function (s) { out[s.type] = s; }); } catch (e) { /* importer missing */ }
    return out;
  }
  /** The registered dataset key of a name (MCD.data.keyFor), or null. */
  function dataKeyAvail(name) { try { return MCD.data && typeof MCD.data.keyFor === 'function' ? MCD.data.keyFor(name) || null : null; } catch (e) { return null; } }
  /** V8 D45: a type read only through the funding row (schema via 'funding'), as the importer or the module says it. */
  function viaFunding(type, s) {
    if (type === 'funding') return true;
    var via = s && s.via;
    if (!via && type === 'saldo' && MCD.saldo && MCD.saldo.schema) via = MCD.saldo.schema.via;
    if (!via && MCD.importer && typeof MCD.importer.lookupSchema === 'function') { try { var ls = MCD.importer.lookupSchema(type); via = ls && ls.via; } catch (e) { via = null; } }
    return via === 'funding';
  }
  /** Every dataset the importer can fill: template sheets first, the branch KPIs, then the others. */
  function catalog() {
    var by = schemasByType(), out = [], seen = {};
    SHEETS.forEach(function (d) {
      var s = by[d.type];
      var key = s ? s.dataKey : (MCD.data && MCD.data.keyFor ? MCD.data.keyFor(d.type) : null);
      if (!key) return;
      seen[d.type] = 1;
      out.push({ code: d.code, type: d.type, key: key, label: d.label, short: d.short, unit: d.unit, main: !!d.main, what: d.what,
        need: d.need, brief: d.brief, use: d.use, template: true, primary: true, schema: s || null });
    });
    var kk = kpiKey();
    if (kk) {                                         // filled by the Rev LVM workbook only (no column schema)
      seen.lvm_kpi = 1;
      out.push({ code: KPI_ENTRY.code, type: KPI_ENTRY.type, key: kk, label: KPI_ENTRY.label, what: KPI_ENTRY.what, unit: ['cabang', 'cabang'],
        template: false, primary: false, schema: null, sub: 'lvm' });
    }
    Object.keys(by).forEach(function (t) {
      if (seen[t]) return;
      var s = by[t], ex = EXTRA[t];
      if (viaFunding(t, s) || t === 'leads') return;           // V8: their own rows below, never offered alone
      out.push({ code: t, type: t, key: s.dataKey, label: ex ? ex.label : String(s.label || t).replace(/\s*\([^)]*\)\s*$/, ''),
        what: ex ? ex.what : (s.description || ''), template: false, primary: ex ? ex.primary : true, schema: s, pick: !s.vaultOnly });
    });
    var fk = dataKeyAvail('funding_merchant'), sk = dataKeyAvail('saldo'), kc = dataKeyAvail('kpi_cabang'), lk = dataKeyAvail('leads');
    var v8 = function (d, key, also) { return Object.assign({}, d, { key: key, also: also || [], template: false, primary: false, schema: null, pick: false }); };
    if (fk || sk) out.push(v8(V8_ENTRY.funding, fk || sk, fk && sk ? [sk] : []));
    if (kc) out.push(v8(V8_ENTRY.kpi, kc));
    if (lk) out.push(v8(V8_ENTRY.leads, lk));
    return out;
  }
  function catalogEntry(type) { return catalog().filter(function (c) { return c.type === type; })[0] || null; }
  function typeLabel(type) { var c = catalogEntry(type); return c ? c.label : (type || '—'); }

  function realSets() {
    if (MCD.data && typeof MCD.data.real === 'function') return MCD.data.real();
    var out = {};
    (MCD.data && MCD.data.summary ? MCD.data.summary() : []).forEach(function (s) { out[s.key] = { rows: MCD.data[s.key] || [], meta: MCD.data.meta[s.key] || {} }; });
    return out;
  }
  function isRealMeta(m) { return !!m && (m.source === 'import' || m.source === 'vault'); }
  /** Real rows of a dataset (imported sites only, never the public reference places). */
  function realCount(sets, key) {
    var s = sets[key];
    if (!s || !isRealMeta(s.meta)) return 0;
    if (key === 'sites') return (s.rows || []).filter(function (x) { return x && x.imported; }).length;
    if (key === 'funding_merchant') return (s.rows || []).filter(function (x) { return x && !x.isMeta; }).length;   // the meta record is not a merchant
    return (s.rows || []).length;
  }
  /** Rows of a catalogue entry: its own key, else the first key it also holds (the Saldo list in the funding row). */
  function entryKey(sets, c) {
    if (realCount(sets, c.key) || !c.also) return c.key;
    for (var i = 0; i < c.also.length; i++) if (realCount(sets, c.also[i])) return c.also[i];
    return c.key;
  }
  function entryCount(sets, c) { return realCount(sets, entryKey(sets, c)); }
  function entryMeta(sets, c) { var k = entryKey(sets, c); return (sets[k] && sets[k].meta) || {}; }
  /** Snapshot of the real data: per catalogue entry, totals, the latest data date and the worst freshness. */
  function realStatus() {
    var sets = realSets(), cat = catalog(), loaded = [], keys = {}, rows = 0, asOf = null, primaryN = 0, primaryLoaded = 0, allVault = true, worst = null;
    cat.forEach(function (c) {
      var n = entryCount(sets, c), m = entryMeta(sets, c);
      if (c.primary) primaryN++;
      if (!n) return;
      if (c.primary) primaryLoaded++;
      var f = freshness(n, m);
      loaded.push({ c: c, n: n, meta: m, fresh: f });
      if (c.primary && (!worst || TONE_RANK[f.tone] > TONE_RANK[worst.fresh.tone])) worst = { c: c, fresh: f, meta: m };
      // the masked lead list is never counted into a row total on screen (item 48: groups under 5 stay hidden)
      if (!keys[c.key]) { keys[c.key] = 1; if (c.type !== 'leads') rows += n; }
      if (m.asOf && (!asOf || m.asOf > asOf)) asOf = m.asOf;
      if (m.source !== 'vault') allVault = false;
    });
    var ex = googleSet(sets), fu = followups(), fuKeep = fu.carry;   // entries or removals (tombstones) to carry
    var pol = policyKeep();                                          // V8 §3.6: payload.policy and payload.leads
    return { sets: sets, cat: cat, loaded: loaded, rows: rows, asOf: asOf, primaryN: primaryN, primaryLoaded: primaryLoaded,
      any: loaded.length > 0, allVault: loaded.length > 0 && allVault, worst: worst, extra: ex, fu: fu, pol: pol,
      // what "Simpan salinan terenkripsi" writes: the files above plus the Google key and place IDs (items 32-33) and,
      // since v6, the sealed follow-up lists (V6_SPEC §7.5: saving is allowed when only follow-ups exist); since V8 the
      // policy numbers, their Riwayat and the lead switch (an unsaved change counts as a change)
      keepAny: loaded.length > 0 || ex.n > 0 || fuKeep || pol.any,
      fuOnly: fuKeep && !loaded.length && !ex.n && !pol.any,
      keepVault: (loaded.length > 0 || ex.n > 0) && (!loaded.length || allVault) && (!ex.n || ex.source === 'vault') };
  }
  /** The Google key / place-ID dataset of MCD.places (not a file, never listed as one): {n, source, pending}. */
  function googleSet(sets) {
    var key = MCD.places && MCD.places.DATASET, s = key && sets ? sets[key] : null;
    if (!s || !isRealMeta(s.meta) || !(s.rows || []).length) return { n: 0, source: null, pending: false };
    var saved = 0;
    try { saved = (MCD.session && MCD.session.savedAt ? +MCD.session.savedAt() || 0 : 0); } catch (e) { saved = 0; }
    if (S.savedAt) saved = Math.max(saved, +S.savedAt);
    var at = Date.parse(s.meta.importedAt || '') || 0;
    return { n: s.rows.length, source: s.meta.source, pending: s.meta.source === 'import' && (!saved || at > saved) };
  }
  function loadedOf(rs, key) { return rs.loaded.filter(function (x) { return x.c.key === key; })[0] || null; }
  /* V8 final fix (critic, 24 Oct 2026): every bank file counts on the status lines, not only the three template sheets,
     so "0 dari 3 file dimuat" never sits over a loaded funding or KPI file. The words of each file in a sentence. */
  var BANK_WORD = { lvm: 'LVM', edc: 'EDC', sekolah: 'nasabah SMA', funding: 'funding merchant', kpi: 'KPI area' };
  function bankWord(c) { return BANK_WORD[c.type] || c.short || c.label; }
  /** {n, names, missing}: the bank files loaded (the LVM KPI sheets ride with the LVM file; the masked lead list is not a
      bank file here) and the template files still missing, in words. */
  function bankFiles(rs) {
    var got = rs.loaded.filter(function (x) { return !x.c.sub && x.c.type !== 'leads'; });
    return { n: got.length, names: got.map(function (x) { return bankWord(x.c); }),
      missing: rs.cat.filter(function (c) { return c.primary && !loadedOf(rs, c.key); }).map(bankWord) };
  }
  /** The lead list's total as MCD.leads shows it ("<5" below the floor, item 48): never a count the module hides. */
  function leadsTotalText(rows) {
    var L = MCD.leads, sm = L && typeof L.summary === 'function' ? call(L.summary, L, [rows || []]) : null;
    return sm && sm.total && sm.total.text != null ? String(sm.total.text) : '—';
  }

  /* ---------------------------------------- follow-ups (v6, V6_SPEC §7; MCD.seal feature-detected) */

  // The three sealed lists: the store name of MCD.seal and the section's own Pipeline (counts, status). V8 (HEALTH_SPEC §8):
  // Kesehatan (health.pipeline) joins SMA and Kampus.
  var FU_STORES = [
    { name: 'schools.pipeline', label: 'Sekolah', pipe: function () { return MCD.schools && MCD.schools.pipeline; } },
    { name: 'campus.pipeline', label: 'Kampus', pipe: function () { return MCD.campus && MCD.campus.pipeline; } },
    { name: 'health.pipeline', label: 'Kesehatan', pipe: function () { return MCD.health && MCD.health.pipeline; } }
  ];
  var FU_MEMORY = {
    'no-key': 'Tindak lanjut hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.',
    'no-crypto': 'Tindak lanjut hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.',
    'no-storage': 'Daftar tindak lanjut tidak tersimpan di perangkat ini karena penyimpanan browser diblokir. Ekspor sebelum menutup halaman.',
    quota: 'Penyimpanan browser penuh. Ekspor daftar, lalu hapus entri lama.'
  };
  var FU_OLD = 'Daftar tindak lanjut lama terenkripsi dengan kata sandi sebelumnya.';
  var FU_DAMAGED = 'Daftar tindak lanjut di komputer ini rusak dan tidak dapat dibuka. Daftar baru dimulai.';
  var FU_TRAVELS = 'Daftar tindak lanjut SMA, kampus dan fasilitas kesehatan ikut tersimpan.';
  var POL_TRAVELS = 'Angka kebijakan bank, riwayatnya dan status daftar leads ikut tersimpan.';
  // every entry removed (or "Kosongkan daftar") with no file: the save carries the removals (D15 / V9)
  var FU_REMOVALS = 'Simpan salinan terenkripsi agar entri yang dihapus juga terhapus di komputer lain';
  function isFn(f) { return typeof f === 'function'; }
  function call(fn, self, args) { try { return fn.apply(self, args || []); } catch (e) { return undefined; } }
  /** MCD.seal when it has the parts this page uses (SEAL lane); without it the lists live in memory only. */
  function sealApi() { var Sl = MCD.seal; return Sl && typeof Sl === 'object' && isFn(Sl.store) ? Sl : null; }
  function fuStore(name) { var Sl = sealApi(), st = Sl ? call(Sl.store, Sl, [name]) : null; return st && typeof st === 'object' ? st : null; }
  /** Entries in one list: the section's Pipeline count, else the sealed store's data (tombstones are never entries). */
  function fuCount(d) {
    var P = d.pipe(), n = P && isFn(P.count) ? call(P.count, P) : null;
    if (isNum(n)) return n;
    var st = fuStore(d.name), x = st && isFn(st.data) ? call(st.data, st) : null;
    var m = x && x.data && typeof x.data === 'object' ? x.data : x;
    return m && typeof m === 'object' ? Object.keys(m).length : 0;
  }
  /** 'loading' | 'ready' | 'memory' | 'old-password' | 'damaged' for one list (the store's own word first). */
  function fuStatus(d) {
    var st = fuStore(d.name), s = st && isFn(st.status) ? call(st.status, st) : null;
    if (typeof s === 'string') return s;
    var P = d.pipe();
    s = P && isFn(P.status) ? call(P.status, P) : null;
    return typeof s === 'string' ? s : 'memory';
  }
  /**
   * The follow-up lists as this page shows them: {sealed, travels, total, lists: [{name, label, n, status}], state:
   * 'encrypted' | 'memory' | 'old', word, tone, reason, old, damaged, carry, removals}. `travels`: the lists go into the
   * encrypted copy (MCD.seal.vaultExport, the shell writes them as payload.followups). `carry`: the copy has something
   * of them to carry, live entries or removals (D15 / V9: a save that carries a removal removes the entry on another
   * computer), read from MCD.seal.hasFollowups() when seal.js gives it, else live entries only. `removals`: carry
   * with no live entry left (every entry removed, or "Kosongkan daftar").
   */
  function followups() {
    var Sl = sealApi(), lists = FU_STORES.map(function (d) { return { name: d.name, label: d.label, n: fuCount(d), status: Sl ? fuStatus(d) : 'memory' }; });
    var total = lists.reduce(function (a, l) { return a + l.n; }, 0);
    var gstate = Sl && isFn(Sl.state) ? call(Sl.state, Sl) : null, reason = Sl && isFn(Sl.reason) ? call(Sl.reason, Sl) : null;
    var memory = !Sl || gstate === 'memory' || lists.every(function (l) { return l.status === 'memory'; });
    var old = lists.some(function (l) { return l.status === 'old-password'; }), damaged = lists.some(function (l) { return l.status === 'damaged'; });
    var state = old ? 'old' : (memory ? 'memory' : 'encrypted');
    var travels = !!(Sl && isFn(Sl.vaultExport)) && !memory;
    var has = travels && isFn(Sl.hasFollowups) ? call(Sl.hasFollowups, Sl) : undefined;   // a throw falls back to the count
    var carry = travels && (typeof has === 'boolean' ? has : total > 0);
    return {
      sealed: !!Sl, travels: travels, total: total, lists: lists, state: state, old: old, damaged: damaged,
      carry: carry, removals: carry && total === 0,
      word: { encrypted: 'Terenkripsi', memory: 'Hanya selama halaman terbuka', old: 'Perlu kata sandi lama' }[state],
      tone: state === 'encrypted' ? 'ok' : 'mid',
      reason: memory ? (FU_MEMORY[reason] || FU_MEMORY['no-key']) : null
    };
  }

  /* Save flow that staff can finish (UX_FIX_PLAN C-05). A download is not a save: the card stays amber
     "Telah diunduh, belum dipasang" until a sign-in reads a vault at least as new as the last download.
     The download time is kept under mcd.data.lastDownload (a non-secret timestamp, A-10). */
  var DL_KEY = (MCD.config && MCD.config.storageKeys && MCD.config.storageKeys.lastDownload) || 'mcd.data.lastDownload';
  function lastDownload() { try { var v = MCD.util.storage.get(DL_KEY, null); return typeof v === 'string' ? v : null; } catch (e) { return null; } }
  function vaultCreated() { var v = W.MCD_VAULT; return v && typeof v.created === 'string' ? v.created : null; }
  /** true when the last downloaded copy is newer than the vault this page opened (not installed yet). */
  function downloadPending() { var d = lastDownload(), c = vaultCreated(); return !!(d && (!c || c < d)); }
  /**
   * Save state: 'demo' | 'empty' | 'downloaded' | 'invault' | 'todo' | 'fu'. 'fu' (v6): no file and no Google key, only
   * the follow-up lists, which already stay encrypted on this computer; a save carries them to another computer.
   */
  function saveState(rs) {
    if (demoOn()) return 'demo';
    var any = rs.keepAny != null ? rs.keepAny : rs.any, allVault = rs.keepVault != null ? rs.keepVault : rs.allVault;
    var changed = S.changed || !!(rs.extra && rs.extra.pending) || !!(rs.pol && rs.pol.dirty);   // a Google key, new place IDs, policy or lead switch
    if (!any) return 'empty';
    if (S.savedAt && !changed) return 'downloaded';
    if (rs.fuOnly) return 'fu';
    if (allVault && !changed) return downloadPending() ? 'downloaded' : 'invault';
    return 'todo';
  }
  function saveTone(ss) {
    return {
      demo: { tone: 'none', word: 'Tidak tersedia saat Data contoh aktif', value: 'Tidak tersedia' },
      empty: { tone: 'none', word: 'Belum ada yang disimpan', value: 'Belum ada' },
      downloaded: { tone: 'mid', word: 'Telah diunduh, belum dipasang', value: 'Belum dipasang' },
      invault: { tone: 'ok', word: 'Tersimpan', value: 'Tersimpan' },
      todo: { tone: 'mid', word: 'Belum disimpan', value: 'Belum disimpan' },
      fu: { tone: 'none', word: 'Hanya tindak lanjut', value: 'Tindak lanjut' }
    }[ss];
  }

  function vaultKeys() {
    try { return MCD.session && MCD.session.datasetNames ? MCD.session.datasetNames() : []; } catch (e) { return []; }
  }

  /* ================================================= LVM engine (matching) */

  /** The current MCD.lvm match result when it belongs to the datasets on screen, else null. */
  function matchReady() {
    var L = MCD.lvm;
    if (!L || typeof L.result !== 'function') return null;
    var R = L.result();
    return R && R.lvmRef === rowsOf('lvm') && R.edcRef === rowsOf('edc') ? R : null;
  }
  /** Runs the matcher once per data version (Deep dive only: the map points and the file check need it). */
  function ensureMatch() {
    var L = MCD.lvm;
    if (!L || typeof L.matchAsync !== 'function' || S.matching) return;
    if (!rowsOf('lvm').length && !rowsOf('edc').length) return;
    if (matchReady() || S.matchTried === dataVersion()) return;
    S.matching = true;
    S.matchTried = dataVersion();
    var done = function (err) {
      S.matching = false;
      S.matchError = !!err;
      if (err && W.console) W.console.warn('[data] match failed', err && err.message);
      if (!ctx || !deep()) return;
      renderCheck();
    };
    L.matchAsync().then(function () { done(null); }, done);
  }

  /** Where a record sits: 'exact' | 'kel' | 'kelpc' | 'kec' | 'none' (location method, for the file check). */
  function locClass(r, type) {
    if (!r) return 'none';
    if (r.geoPrecision === 'EXACT' && isNum(r.lat) && isNum(r.lon)) return 'exact';
    if (r.kelSrc === 'postcode') return 'kelpc';
    if (r.kelurahanId || r.geoPrecision === 'KELURAHAN_APPROX') return 'kel';
    if (type !== 'lvm' && r.kelurahan) return 'kel';
    if (r.kecamatanId || (type !== 'lvm' && r.kecamatan)) return 'kec';
    return 'none';
  }

  /** Figures for the LVM file check (the data on screen: demo rows while demo data is on). */
  function checkModel() {
    var lvm = rowsOf('lvm'), edc = rowsOf('edc');
    if (!lvm.length && !edc.length) return null;
    var R = matchReady(), m = { demo: isDemoSet('lvm') || isDemoSet('edc'), n: lvm.length, nEdc: edc.length, R: R,
      loc: { exact: 0, kel: 0, kelpc: 0, kec: 0, none: 0 }, byBranch: {}, activeBy: {}, home: 0, asOf: metaOf('lvm').asOf || null };
    lvm.forEach(function (r) {
      if (!r) return;
      m.loc[locClass(r, 'lvm')]++;
      var b = r.branchCode != null ? String(r.branchCode) : '';
      if (b) { m.byBranch[b] = (m.byBranch[b] || 0) + 1; if (r.status === 'active') m.activeBy[b] = (m.activeBy[b] || 0) + 1; }
      if (b === HOME) m.home++;
    });
    if (R && R.ready && MCD.lvm.aggregate) {
      var T = null;
      try { T = MCD.lvm.aggregate('kecamatan').totals; } catch (e) { T = null; }
      if (T) {
        m.place = { matched: T.matched || 0, approx: Math.max(0, (T.inFocus || 0) - (T.matched || 0)), off: Math.max(0, lvm.length - (T.inFocus || 0)),
          outside: T.outside || 0, noKec: T.noKecamatan || 0, inFocus: T.inFocus || 0, potential: T.potential || 0 };
      }
      if (edc.length) {
        var em = R.edc || [], e = { merchants: em.length, matched: 0, approx: 0, off: 0 };
        em.forEach(function (x) { if (x.poi >= 0) e.matched++; else if (x.inFocus) e.approx++; else e.off++; });
        m.edc = e;
      }
    }
    m.kpi = rowsOf('lvm_kpi').filter(function (r) { return r && !r.isTotal; });
    return m;
  }

  /* No map on this page (UX_FIX_PLAN C-06): "where the records sit" was removed with the map. */

  /* ========================================================== import flow */

  function log(msg, kind) {
    S.log.unshift({ msg: msg, kind: kind || '', at: new Date() });
    S.log = S.log.slice(0, LOG_MAX);
    renderLog();
  }

  function setProgress(p) {
    S.progress = p;
    if (!ui || !ui.progress) return;
    var on = !!p;
    ui.progress.hidden = !on;
    if (!on) return;
    var pc = p.total ? Math.max(4, Math.min(100, Math.round(p.done / p.total * 100))) : 30;
    ui.progressBar.style.setProperty('--p', pc + '%');
    ui.progressText.textContent = p.label || '';
  }

  /** Reads files into the review list. Nothing is applied until "Apply data" / "Use this data". */
  function stageFiles(files) {
    files = (files || []).filter(Boolean);
    if (!files.length) return;
    if (demoOn()) {                                   // real and demo figures never mix
      MCD.demo.ensureOff().then(function (ok) { if (ok) stageFiles(files); });
      return;
    }
    if (!MCD.importer || typeof MCD.importer.read !== 'function') { log('Fitur impor tidak termuat. Muat ulang halaman, lalu coba lagi.', 'warn'); return; }
    /* V8 D45: funding merchant files of one pick or drop go together to the one import row once every file is read */
    var batch = { left: 0, fund: [] };
    files.forEach(function (file) {
      var name = file.name || 'file';
      if (!/\.(csv|txt|xlsx|xlsm|xls)$/i.test(name)) {
        log(name + ': format tidak dikenali. Impor file CSV atau XLSX, misalnya laporan Rev LVM atau template permintaan data.', 'warn');
        return;
      }
      batch.left++;
      S.reading++;
      setProgress({ label: 'Membaca ' + name + '…', done: 0, total: 0 });
      refreshReview();
      MCD.importer.read(file, { onProgress: function (p) { if (p && p.rows) setProgress({ label: 'Membaca ' + name + ' · ' + nInt(p.rows) + ' baris', done: 0, total: 0 }); } })
        .then(function (sheets) {
          var names = (sheets || []).map(function (s) { return s && s.name; }).filter(Boolean);
          var hit = /\.(xlsx|xlsm|xls)$/i.test(name) ? detectWorkbook(names, sheets) : null;
          if (hit && readerType(hit.R) === 'funding') { routeFunding(batch, file, sheets); return null; }
          if (hit) {                                    // the Rev LVM report or the KPI workbook, read whole by its engine
            var we = stageWorkbook(file, hit.det, sheets, hit.R);
            log(name + (readerType(hit.R) === 'kpi' ? ': dikenali sebagai laporan KPI area bulanan. Periksa, lalu tekan Gunakan data ini.'
              : ': dikenali sebagai laporan Livin’ Merchant (toko dan KPI cabang). Periksa, lalu tekan Gunakan data ini.'), '');
            return checkWorkbook(we).then(function () {
              if (!we.error || readerType(we.reader) !== 'lvm') return null;
              S.staged = S.staged.filter(function (o) { return o !== we; });   // fall back to tab by tab
              log(name + ': dibaca per sheet.', '');
              return stageSheets(file, sheets);
            });
          }
          if (fundingRoute(sheets)) { routeFunding(batch, file, sheets); return null; }   // the branch file or a saldo sheet
          return stageSheets(file, sheets);
        })
        .catch(function (err) {
          var m = String((err && err.message) || '');
          if (W.console) W.console.warn('[data] file could not be read', m);
          if (/sheetjs|could not load|timed out/i.test(m)) log(name + ': pembaca XLSX tidak dapat dimuat. Periksa internet, atau simpan sheet sebagai CSV lalu impor file itu.', 'warn');
          else log(name + ': file tidak dapat dibaca. Pastikan formatnya CSV atau XLSX.', 'warn');
        })
        .then(function () {
          S.reading = Math.max(0, S.reading - 1);
          if (!S.reading) setProgress(null);
          batch.left--;
          if (!batch.left && batch.fund.length) { var items = batch.fund; batch.fund = []; fundRun(items); }
          refreshReview();
        });
    });
  }
  /** V8 D45: a funding merchant file (or a Saldo merchant sheet) read by the generic Impor goes to the one import row. */
  function routeFunding(batch, file, sheets) {
    batch.fund.push({ file: { name: file.name || 'file', size: file.size || 0 }, sheets: sheets || [] });
    log((file.name || 'file') + ': dikenali sebagai file funding merchant. Hasilnya ada di kartu Funding merchant (cabang).', '');
  }
  /** true when MCD.funding knows the layout, or the best schema of a sheet is one read through the funding row. */
  function fundingRoute(sheets) {
    var Fd = MCD.funding;
    if (Fd && typeof Fd.detect === 'function') { try { if (Fd.detect(sheets || [])) return true; } catch (e) { /* not a funding layout */ } }
    var I = MCD.importer;
    if (!I || typeof I.detect !== 'function') return false;
    return (sheets || []).some(function (sh) {
      if (!sh || !sh.rows || !sh.rows.length) return false;
      var d = null;
      try { d = I.detect(sh); } catch (e) { d = null; }
      return !!(d && d.type && viaFunding(d.type, schemasByType()[d.type]));
    });
  }

  /** Sheet-by-sheet path: one review entry per tab with rows (instruction tabs skipped). */
  function stageSheets(file, sheets) {
    var name = file.name || 'file', added = [], empty = [], skipped = [];
    (sheets || []).forEach(function (sheet) {
      if (!sheet) return;
      var sn = sheet.kind === 'csv' ? name : (sheet.name || name);
      if (SKIP_SHEETS.test(str(sheet.name))) { skipped.push(sheet.name); return; }
      if (!sheet.rows || !sheet.rows.length) { empty.push(sn); return; }
      added.push(stageSheet(file, sheet));
    });
    if (skipped.length) log(name + ': sheet petunjuk (' + skipped.join(', ') + ') dilewati.', '');
    if (empty.length) log(name + ': ' + nInt(empty.length) + ' sheet kosong dilewati (' + empty.join(', ') + ').', '');
    preferBest(added);
    if (!added.length) log(name + ': tidak ada baris yang dapat diimpor. Periksa isi file.', 'warn');
    else log(name + ': ' + nInt(added.length) + ' sheet terbaca. Periksa, lalu tekan Gunakan data ini.', '');
    return Promise.all(added.map(function (e) { return validate(e, true); }));
  }

  /** Several sheets of one file detected as the same dataset (the "Rev LVM" report has summary
      tabs next to its detail tab): the one the importer scores highest is used, the others are left out. */
  function preferBest(entries) {
    var best = {};
    entries.forEach(function (e) {
      if (!e.type || (e.det && e.det.type !== e.type)) return;
      var k = dataKeyOf(e.type), sc = (e.det && e.det.score) || 0;
      if (!k) return;
      if (!best[k] || sc > best[k].sc) best[k] = { e: e, sc: sc };
    });
    Object.keys(best).forEach(function (k) {
      var keep = best[k].e;
      if (!keep.include && keep.conflict && entries.every(function (o) { return o.title !== keep.conflict; })) return;   // an earlier file holds this dataset
      keep.include = true;
      resolveConflicts(keep);
    });
  }

  function sheetHint(file, sheet) {
    var base = sheet.kind === 'csv' ? String(file.name || '').replace(/\.[a-z0-9]+$/i, '') : str(sheet.name);
    var b = base.toLowerCase();
    for (var i = 0; i < SHEETS.length; i++) if (b === SHEETS[i].code || b.indexOf(SHEETS[i].code) === 0) return SHEETS[i].type;
    if (/rincian|\blvm\b|livin.?merchant/.test(b) && schemasByType().lvm) return 'lvm';
    if (/\bedc\b/.test(b) && schemasByType().edc) return 'edc';
    if (/sekolah|\bsma\b/.test(b) && schemasByType().sekolah) return 'sekolah';
    return null;
  }

  function stageSheet(file, sheet) {
    var det = null;
    try { det = MCD.importer.detect(sheet); } catch (e) { det = null; }
    var type = (det && det.type) || sheetHint(file, sheet) || null;
    var e = {
      id: 'st' + (++S.uid), file: file.name || 'file', sheet: sheet, sheetName: sheet.kind === 'csv' ? null : sheet.name,
      title: sheet.kind === 'csv' ? (file.name || 'CSV') : sheet.name, rows: sheet.rows.length,
      det: det, guessed: !!(type && !(det && det.type)), type: type, mapping: null, include: !!type,
      asOf: '', res: null, busy: false, error: null, token: 0, open: false, filter: 'error', page: 0
    };
    if (e.include) {                                   // the first sheet for a dataset keeps it; a later one is left out
      var k = dataKeyOf(type), first = S.staged.filter(function (o) { return o.include && o.type && dataKeyOf(o.type) === k; })[0];
      if (first) { e.include = false; e.conflict = first.title; }
    }
    S.staged.push(e);
    return e;
  }

  function stageWorkbook(file, det, sheets, R) {
    var K = R || kpiMod(), type = readerType(K);
    var e = {
      id: 'st' + (++S.uid), kind: 'workbook', reader: K, file: file.name || 'file', fileObj: file, sheets: sheets || null, sheet: null, sheetName: null,
      title: file.name || (type === 'kpi' ? 'Laporan KPI area' : 'Laporan Rev LVM'), rows: 0, det: det, guessed: false, type: type, mapping: null, include: true,
      asOf: '', res: null, sc: null, busy: true, error: null, token: 0, open: false, filter: 'all', page: 0
    };
    var k = dataKeyOf(type), first = S.staged.filter(function (o) { return o.include && o.type && dataKeyOf(o.type) === k; })[0];
    if (first) { e.include = false; e.conflict = first.title; }
    S.staged.push(e);
    return e;
  }
  /** Parses the workbook with the LVM engine (from the sheets already read, else the reader re-reads the file). */
  function checkWorkbook(e) {
    var K = e.reader || kpiMod();
    e.busy = true; e.error = null;
    if (!K) { e.busy = false; e.error = 'Pembaca laporan Livin’ Merchant tidak tersedia. Muat ulang halaman.'; return Promise.resolve(); }
    if (readerType(K) === 'kpi') return checkKpi(e, K);
    var token = ++e.token;
    var L = MCD.lvm, fromSheets = e.sheets && L && K === L.workbookReader && typeof L.parseWorkbook === 'function';
    /* wait (at most 8 s) for the offline street index, so the stores are placed during the parse
       instead of after the short queue in lvm.js (COPY_STYLE_EN item 28) */
    var geo = fromSheets && typeof L.ensureGeocoder === 'function'
      ? new Promise(function (resolve) {
          L.ensureGeocoder().then(resolve, function () { resolve(false); });
          var t = setTimeout(function () { resolve(false); }, 8000); if (t && typeof t.unref === 'function') t.unref();
        })
      : Promise.resolve(false);
    var run = fromSheets
      ? geo.then(function () { return new Promise(function (resolve, reject) { setTimeout(function () { try { resolve(L.parseWorkbook(e.sheets, { file: e.file })); } catch (x) { reject(x); } }, 0); }); })
      : K.read(e.fileObj);
    return run.then(function (sc) {
      if (token !== e.token) return;
      var merchants = (sc && sc.merchants) || [], checks = (sc && sc.checks) || [], rep = (sc && sc.report) || null;
      e.sc = sc; e.busy = false; e.rows = merchants.length;
      e.sheets = null;                                  // the raw rows (with the owners' columns) are no longer needed
      e.res = { records: K.toRecords(sc), report: {
        totalRows: rep ? rep.totalRows : 0, accepted: rep ? rep.accepted : 0, rejected: rep ? rep.rejected : 0,
        warnings: (rep ? rep.warnings : 0), issues: rep ? rep.issues || [] : [], notes: rep ? rep.notes || [] : [],
        dropped: rep ? rep.dropped || [] : [], unmatched: rep ? rep.unmatched || [] : [], mapping: rep ? rep.mapping || {} : {},
        checkWarnings: checks.filter(function (c) { return c.level === 'warn'; }).length,
        asOf: sc.asOf || null, fatal: !merchants.length } };
      if (!S.staged.some(function (o) { return o.open; })) e.open = true;
    }, function (err) {
      if (token !== e.token) return;
      e.busy = false; e.res = null; e.sc = null;
      e.error = err && err.user && err.message ? err.message : 'File Excel ini tidak dapat dibaca sebagai laporan Livin’ Merchant. Pastikan file berasal dari kantor area.';
      if (W.console && !(err && err.user)) W.console.warn('[data] workbook check failed', err && err.message);
    });
  }
  /* V8 (V7 §9.2): the KPI workbook of the area, parsed here from the sheets already read (MCD.kpi.parseWorkbook). Its
     notes are MCD.kpi.visibleWarnings(model) only: notes about the four keys D41 hides never reach this page. */
  var KPI_UNREAD = 'File ini tidak terbaca sebagai laporan KPI area. Pastikan file berasal dari kantor area dan berisi sheet skor KPI per cabang.';
  function kpiNotes(m) {
    var KP = MCD.kpi;
    if (!KP || typeof KP.visibleWarnings !== 'function') return [];
    try { return (KP.visibleWarnings(m) || []).filter(function (w) { return w && w.text; }); } catch (e) { return []; }
  }
  function checkKpi(e, K) {
    var token = ++e.token, KP = MCD.kpi;
    var run = new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(KP && typeof KP.parseWorkbook === 'function' && e.sheets ? KP.parseWorkbook(e.sheets, { file: e.file }) : null); } catch (x) { reject(x); }
      }, 0);
    });
    return run.then(function (m) {
      if (token !== e.token) return;
      e.busy = false;
      e.sheets = null;                                  // the raw rows are no longer needed
      if (!m || !m.ok) { e.res = null; e.sc = null; e.error = KPI_UNREAD; return; }
      var notes = kpiNotes(m), peers = (m.branches || []).filter(function (b) { return b && b.peer; }).length;
      e.sc = m; e.rows = peers;
      e.res = { records: K.toRecords(m), report: { totalRows: (m.branches || []).length, accepted: peers, rejected: 0, warnings: notes.length, issues: [], notes: [],
        dropped: [], unmatched: [], mapping: {}, checkWarnings: notes.filter(function (w) { return w.level === 'warn'; }).length,
        asOf: KP && typeof KP.periodEnd === 'function' && m.period ? KP.periodEnd(m.period) : null, fatal: !peers } };
      if (!S.staged.some(function (o) { return o.open; })) e.open = true;
    }, function (err) {
      if (token !== e.token) return;
      e.busy = false; e.res = null; e.sc = null; e.sheets = null;
      e.error = KPI_UNREAD;
      if (W.console) W.console.warn('[data] KPI workbook check failed', err && err.message);
    });
  }
  function isWorkbook(e) { return !!e && e.kind === 'workbook'; }
  function isKpiBook(e) { return isWorkbook(e) && e.type === 'kpi'; }
  /** Records an entry adds: stores for the Rev LVM workbook, branches of the KPI workbook, rows otherwise. */
  function recordsN(e) { return isKpiBook(e) ? (e.rows || 0) : (isWorkbook(e) ? (e.sc && e.sc.merchants ? e.sc.merchants.length : 0) : (e.res ? e.res.records.length : 0)); }

  function dataKeyOf(type) { var c = catalogEntry(type); return c ? c.key : null; }
  /** One sheet per dataset: a later sheet for the same dataset is left out (the user may switch). */
  function resolveConflicts(keep) {
    if (!keep || !keep.include || !keep.type) return;
    var k = dataKeyOf(keep.type);
    S.staged.forEach(function (o) {
      if (o !== keep && o.include && o.type && dataKeyOf(o.type) === k) { o.include = false; o.conflict = keep.title; }
    });
    keep.conflict = null;
  }

  function validate(e, quiet) {
    if (isWorkbook(e)) { if (!quiet) refreshReview(); return Promise.resolve(); }   // fixed layout; the data date applies at Apply
    if (!e.type) { e.res = null; e.busy = false; if (!quiet) refreshReview(); return Promise.resolve(); }
    var token = ++e.token;
    e.busy = true; e.error = null;
    if (!quiet) refreshReview();
    return MCD.importer.parseAsync(e.sheet, e.type, e.mapping, {
      asOf: e.asOf || undefined,
      onProgress: function (p) { if (p && p.total > 5000) setProgress({ label: 'Memeriksa ' + e.title + ' · ' + nInt(p.done) + ' dari ' + nInt(p.total) + ' baris', done: p.done, total: p.total }); }
    }).then(function (res) {
      if (token !== e.token) return;
      e.res = res; e.busy = false;
      if (!S.reading) setProgress(null);
      if (!e.open && (!S.staged.some(function (o) { return o.open; }))) e.open = true;
    }, function (err) {
      if (token !== e.token) return;
      e.busy = false; e.res = null;
      e.error = 'Sheet ini tidak dapat diperiksa. File mungkin rusak. Coba simpan ulang di Excel.';
      if (W.console) W.console.warn('[data] check failed', err && err.message);
    }).then(function () { if (token === e.token) refreshReview(); });
  }

  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function report(e) { return e && e.res && e.res.report ? e.res.report : null; }
  function isReady(e) { var r = report(e); return !!(e.include && e.type && !e.busy && !e.error && r && !r.fatal && e.res.records.length > 0); }
  function entryState(e) {
    var r = report(e);
    if (e.busy || (e.type && !r && !e.error)) return { k: 'busy', t: 'Memeriksa…' };
    if (e.error) return { k: 'bad', t: isWorkbook(e) ? 'Tidak dapat dibaca' : 'Tidak dapat diperiksa' };
    if (!e.type) return { k: 'off', t: 'Tidak dikenali' };
    if (r.fatal) return { k: 'bad', t: isKpiBook(e) ? 'Tidak ada cabang' : (isWorkbook(e) ? 'Tidak ada toko' : 'Kolom wajib tidak ada') };
    if (!e.res.records.length) return { k: 'bad', t: 'Tidak ada baris yang dapat digunakan' };
    if (!e.include) return { k: 'off', t: 'Tidak digunakan' };
    if (r.rejected) return { k: 'warn', t: 'Siap · ' + plural(r.rejected, 'row', 'rows') + ' dilewati' };
    if (isWorkbook(e) && r.checkWarnings) return { k: 'warn', t: 'Siap · ' + plural(r.checkWarnings, 'note', 'notes') + ' perlu dibaca' };
    return { k: 'ok', t: 'Siap' };
  }

  function applyStaged() {
    if (demoOn()) { MCD.demo.ensureOff().then(function (ok) { if (ok) applyStaged(); }); return; }
    var ready = S.staged.filter(isReady);
    if (!ready.length) return;
    var done = 0;
    S.applied = {};
    ready.forEach(function (e) {
      var r = report(e);
      if (isWorkbook(e)) { if (applyWorkbook(e)) { done++; S.applied[e.type] = true; } return; }
      try {
        MCD.importer.apply(e.type, e.res.records, { file: e.file, sheet: e.sheetName, asOf: e.asOf || r.asOf, report: r });
        done++;
        S.applied[e.type] = true;
        log(e.title + ' → ' + typeLabel(e.type) + ': ' + plural(e.res.records.length, recordWord(e.type, 1), recordWord(e.type, 2)) + ' diimpor' +
          (r.rejected ? ', ' + plural(r.rejected, 'row', 'rows') + ' bermasalah dilewati' : '') +
          (r.dropped && r.dropped.length ? ' · ' + plural(r.dropped.length, 'personal column', 'personal columns') + ' dihapus' : '') + '.', 'ok');
      } catch (err) {
        if (W.console) W.console.warn('[data] apply failed', err && err.message);
        log(e.title + ': data tidak dapat digunakan. Coba lagi.', 'warn');
      }
    });
    S.staged.forEach(function (e) { if (ready.indexOf(e) < 0) log(e.title + ' tidak diimpor (' + entryState(e).t.toLowerCase() + ').', ''); });
    S.staged = [];
    S.justApplied = done > 0;
    if (done) {
      S.changed = true;
      ctx.toast(nInt(done) + ' file diimpor. Simpan salinan terenkripsi agar data tidak hilang.');
    }
    refreshAll();
  }
  function applyWorkbook(e) {
    var K = e.reader || kpiMod();
    if (readerType(K) === 'kpi') return applyKpi(e, K);
    try {
      var sc = e.asOf && e.asOf !== e.sc.asOf ? Object.assign({}, e.sc, { asOf: e.asOf }) : e.sc;
      K.apply(sc, { file: e.file });
      var per = K.periodLabel ? K.periodLabel(sc.period || (sc.asOf ? String(sc.asOf).slice(0, 7) : '')) : '';
      var kp = (sc.branchKpi || []).length, dr = sc.report && sc.report.dropped ? sc.report.dropped.length : 0;
      log(e.title + ' → ' + typeLabel('lvm') + ': ' + plural(recordsN(e), 'toko', 'toko') + ' diimpor' +
        (kp ? ' · KPI ' + plural(kp, 'cabang', 'cabang') : '') + (per ? ' · ' + per : '') + (sc.area ? ' · Area ' + sc.area : '') +
        (dr ? ' · ' + plural(dr, 'personal column', 'personal columns') + ' dihapus' : '') + '.', 'ok');
      return true;
    } catch (err) {
      if (W.console) W.console.warn('[data] workbook apply failed', err && err.message);
      log(e.title + ': laporan tidak dapat digunakan. Coba lagi.', 'warn');
      return false;
    }
  }
  /** The KPI workbook → MCD.kpi.apply (dataset kpi_cabang, data date = the last day of the period). */
  function applyKpi(e, K) {
    try {
      K.apply(e.sc, { file: e.file });
      var per = K.periodLabel && e.sc.period ? K.periodLabel(e.sc.period) : '';
      log(e.title + ' → ' + typeLabel('kpi') + ': KPI ' + plural(recordsN(e), 'cabang', 'cabang') + (per ? ' · ' + per : '') + (e.sc.area ? ' · Area ' + e.sc.area : '') + '.', 'ok');
      return true;
    } catch (err) {
      if (W.console) W.console.warn('[data] KPI apply failed', err && err.message);
      log(e.title + ': laporan tidak dapat digunakan. Coba lagi.', 'warn');
      return false;
    }
  }
  var SECTION_WORD = { overview: 'Ringkasan', merchants: 'Merchant', schools: 'Sekolah', property: 'KPR', health: 'Kesehatan', wealth: 'Calon Prioritas', position: 'Posisi cabang', campus: 'Kampus' };
  /** true when the registry shows section `id` (a hidden section such as KPR answers false). */
  function sectionShown(id) {
    var c = MCD.config, list = c && Array.isArray(c.sections) ? c.sections : null;
    return !!list && list.some(function (x) { return x && x.id === id && !x.hidden; });
  }
  /** Opens a section with the crumb back to Impor (MCD.nav), else plainly. */
  function goSection(id, action) {
    var N = MCD.nav, ok = false;
    if (N && typeof N.go === 'function') { try { ok = N.go({ section: id, view: 'deep', action: action || undefined }, { from: 'data' }) === true; } catch (e) { ok = false; } }
    if (!ok && ctx) ctx.navigate(id, action ? { view: 'deep', action: action } : undefined);
  }
  /** After "Terapkan data": where to look next (UX_FIX_PLAN C-05, IA M4; V8: the KPI workbook leads to Posisi cabang). */
  function afterApply() {
    if (!S.justApplied || !ctx) return null;
    var kinds = S.applied || {}, onlyKpi = !!kinds.kpi && Object.keys(kinds).length === 1;
    var see = onlyKpi ? null : el('button', { type: 'button', class: 'btn btn--secondary' }, [el('span', { text: 'Lihat hasilnya di Merchant' }), icon('chev-r', 'icon--12')]);
    if (see) see.addEventListener('click', function () { S.justApplied = false; ctx.navigate('merchants'); });
    var pos = kinds.kpi && sectionShown('position') ? el('button', { type: 'button', class: 'btn btn--secondary' }, [el('span', { text: 'Lihat Posisi cabang' }), icon('chev-r', 'icon--12')]) : null;
    if (pos) pos.addEventListener('click', function () { S.justApplied = false; goSection('position'); });
    var from = typeof ctx.cameFrom === 'function' ? ctx.cameFrom() : null;
    var back = from && from !== 'merchants' && from !== ID && SECTION_WORD[from] ? el('button', { type: 'button', class: 'btn btn--secondary' }, [icon('chev-l', 'icon--12'), el('span', { text: 'Kembali ke ' + SECTION_WORD[from] })]) : null;
    if (back) back.addEventListener('click', function () { S.justApplied = false; ctx.navigate(from); });
    return el('div', { class: 'dp-callout dp-callout--ok dp-after' }, [icon('check', 'icon--12'), el('p', { text: 'Data siap digunakan. Simpan salinan terenkripsi agar data terbuka saat masuk berikutnya.' }), el('div', { class: 'dp-actions' }, [pos, see, back])]);
  }
  function cancelStaged() {
    if (!S.staged.length) return;
    log('Impor dibatalkan. Tidak ada yang berubah.', '');
    S.staged = [];
    refreshAll();
  }

  function removeDataset(c, n) {
    if (c.type === 'funding') { removeFunding(c); return; }
    // The branch KPIs come from the same Rev LVM report as the stores: removing the stores removes them too.
    var sets = realSets(), kk = kpiKey(), lm = (sets.lvm && sets.lvm.meta) || {}, km = kk && sets[kk] ? sets[kk].meta : null;
    var withKpi = c.key === 'lvm' && kk && realCount(sets, kk) > 0 && km && km.file && km.file === lm.file;
    ctx.confirm({ title: 'Hapus ' + c.label + '?', danger: true, ok: 'Hapus', cancel: 'Batal',
      body: (withKpi ? nInt(n) + ' toko dan KPI cabang (UREG dan USAK) dari laporan yang sama' : nInt(n) + ' baris') + ' akan dihapus dari dashboard ini.\nFile asli Anda tidak berubah dan dapat diimpor lagi.' })
      .then(function (yes) {
        if (!yes) return;
        try { MCD.data.revert(c.key); if (withKpi) MCD.data.revert(kk); } catch (e) { if (W.console) W.console.warn('[data] remove failed', e && e.message); }
        S.changed = true;
        log(c.label + (withKpi ? ' beserta KPI cabangnya' : '') + ' telah dihapus dari dashboard.', 'ok');
        refreshAll();
      });
  }
  function removeAll() {
    ctx.confirm({ title: 'Hapus semua data yang diimpor', danger: true, ok: 'Hapus semua data', cancel: 'Batal',
      body: 'Semua file yang diimpor dan data dari salinan terenkripsi akan dihapus dari dashboard ini.\nData peta publik tetap ada. File asli Anda dan data/vault.js tidak berubah.' +
        (sealApi() ? '\nDaftar tindak lanjut tidak ikut terhapus.' : '') })
      .then(function (yes) {
        if (!yes) return;
        try { MCD.data.clearAll({}); } catch (e) { if (W.console) W.console.warn('[data] clear failed', e && e.message); }
        S.staged = [];
        if (FS.st === 'done') fundReset();
        S.changed = true;
        log('Semua data yang diimpor telah dihapus dari dashboard.', 'ok');
        refreshAll();
      });
  }

  function saveCopy() {
    if (MCD.demo && MCD.demo.blocks()) return;
    var rs = realStatus();
    if (!rs.keepAny) { ctx.toast('Belum ada data untuk disimpan. Impor file lebih dulu.', 'warn'); return; }
    if (S.saving) return;
    S.saving = true;
    refreshAll();
    var stamp = new Date().toISOString();       // taken before the vault is sealed, so its `created` is never older
    ctx.saveEncrypted().then(function () {
      S.savedAt = new Date();
      S.changed = false;
      try { MCD.util.storage.set(DL_KEY, stamp); } catch (e) { /* the card still says "belum dipasang" for this session */ }
      log('Salinan terenkripsi telah diunduh (vault.js). Pasang di folder data agar terbuka saat masuk berikutnya.', 'ok');
    }, function () {
      log('Salinan terenkripsi tidak dapat disimpan. Coba lagi.', 'warn');
    }).then(function () { S.saving = false; refreshAll(); });
  }

  function pickFiles() { if (ui && ui.input) ui.input.click(); }
  function takeTemplate() {
    var a = DOC.createElement('a');
    a.href = TEMPLATE; a.download = TEMPLATE_NAME; a.style.display = 'none';
    DOC.body.appendChild(a); a.click(); a.remove();
    S.templateTaken = true;
  }

  /** The one primary action of the Overview footer, following the state. */
  function primaryAction() {
    var rs = realStatus(), ss = saveState(rs), busy = S.reading > 0 || S.staged.some(function (e) { return e.busy; });
    if (busy) return { label: 'Memeriksa file…', icon: 'upload', run: noop };
    if (S.saving) return { label: 'Menyimpan…', icon: 'lock', run: noop };
    if (S.staged.length) {
      var n = S.staged.filter(isReady).length;
      // The review card carries "Gunakan data ini" right under the result, so the footer stays empty (one primary).
      return n ? false : { label: 'Pilih file lain', icon: 'upload', run: pickFiles };
    }
    if (ss === 'demo') return { label: 'Matikan Data contoh', icon: 'close', run: function () { if (MCD.demo) MCD.demo.set(false); } };
    if (ss === 'todo') return { label: 'Simpan salinan terenkripsi', icon: 'lock', run: saveCopy };
    if (ss === 'downloaded') return { label: 'Lihat cara memasang file', icon: 'chev-r', run: function () { goTab('save'); } };
    return { label: rs.any ? 'Impor file yang lebih baru' : 'Impor file', icon: 'upload', run: pickFiles };
  }

  /* ============================================================ rendering */

  function refreshAll() {
    if (!ctx) return;
    if (page) page.refill();
    refreshReview(true);
    renderLoaded();
    renderSaveBits();
    renderCheck();
    renderFunding();
    renderKpiNow();
    if (deep()) ensureMatch();
  }
  function refreshReview(noRefill) {
    if (!ctx) return;
    if (deep()) renderReview();
    else { renderOverviewState(); if (page && !noRefill) page.refill(); }
  }

  /* --- small builders ---------------------------------------------------- */

  function pill(kind, text) { return el('span', { class: 'dp-pill dp-pill--' + kind, text: text }); }
  function tagAssume(text) { return el('span', { class: 'tag tag--asumsi dp-tag', text: text || 'Asumsi' }); }
  function exhibit(id, title, sub, kids, source) {
    var t = el('h2', { class: 'exhibit__title dp-x__t', id: id + '-t' });
    t.textContent = title;
    var subEl = el('p', { class: 'exhibit__sub dp-x__sub', text: sub || '' });
    var src = el('p', { class: 'exhibit__source dp-x__src', text: source || '' });
    var node = el('section', { class: 'exhibit dp-x', id: id, 'aria-labelledby': id + '-t' }, [t, subEl, kids, source ? src : null]);
    return { el: node, title: t, sub: subEl, src: src };
  }
  function templateLink(cls, label) {
    var a = el('a', { class: 'btn ' + (cls || 'btn--secondary'), href: TEMPLATE, download: TEMPLATE_NAME, title: 'Unduh ' + TEMPLATE }, [
      icon('download'), el('span', { text: label || 'Unduh template permintaan data' })]);
    a.addEventListener('click', function () { S.templateTaken = true; });
    return a;
  }
  function dropZone(big, primary) {
    var zone = el('div', { class: 'dp-drop' + (big ? ' dp-drop--big' : '') });
    var pick = el('button', { type: 'button', class: 'btn btn--lg ' + (primary ? 'btn--primary' : 'btn--secondary') + ' dp-drop__btn' }, [icon('upload'), el('span', { text: 'Pilih file' })]);
    pick.addEventListener('click', function (ev) { ev.stopPropagation(); pickFiles(); });
    zone.appendChild(el('span', { class: 'dp-drop__icon', 'aria-hidden': 'true' }, [svgIcon('sheet', 'icon--20')]));
    zone.appendChild(el('p', { class: 'dp-drop__line', text: big ? 'Letakkan laporan Rev LVM atau file CSV / XLSX lain di sini' : 'Letakkan file di sini' }));
    zone.appendChild(el('p', { class: 'dp-drop__or', text: 'atau' }));
    zone.appendChild(pick);
    zone.appendChild(el('p', { class: 'dp-drop__lock' }, [icon('lock', 'icon--12'), el('span', { text: 'Hanya dibaca di browser ini · tidak ada yang diunggah' })]));
    // the window-wide handler (app.js) receives the drop and passes it to onFiles; this only shows the target
    var depth = 0;
    zone.addEventListener('dragenter', function () { depth++; zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', function () { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('is-over'); });
    zone.addEventListener('drop', function () { depth = 0; zone.classList.remove('is-over'); });
    zone.addEventListener('click', function (ev) { if (ev.target === zone || ev.target.closest('.dp-drop__line, .dp-drop__icon, .dp-drop__or')) pickFiles(); });
    return zone;
  }
  function recordWord(type, n) {
    var w = { lvm: ['toko', 'toko'], edc: ['terminal', 'terminal'], sekolah: ['sekolah', 'sekolah'], situs: ['lokasi', 'lokasi'], lvm_kpi: ['cabang', 'cabang'], kpi: ['cabang', 'cabang'], funding: ['merchant', 'merchant'] }[type];
    return w ? w[n === 1 ? 0 : 1] : (n === 1 ? 'data' : 'data');
  }

  /* --- Overview: colour-coded cards --------------------------------------- */

  function renderOverviewState() {
    if (!ui || !ui.cards) return;
    var rs = realStatus(), ss = saveState(rs), staged = S.staged.length > 0, busy = S.reading > 0 || S.staged.some(function (e) { return e.busy; });

    // status line
    clear(ui.status);
    var lead, tone;
    if (demoOn()) { tone = 'demo'; lead = 'Data contoh aktif. Kartu di bawah menampilkan file Anda sendiri, yang disimpan terpisah sampai Data contoh dimatikan.'; }
    else if (staged || busy) { tone = 'busy'; lead = busy ? 'Membaca dan memeriksa file…' : 'Periksa hasilnya, lalu tekan “Gunakan data ini”.'; }
    else if (rs.any) {
      var w = rs.worst;
      tone = w ? w.fresh.tone : 'ok';
      var bf = bankFiles(rs);
      lead = nInt(bf.n) + ' file bank dimuat: ' + joinWords(bf.names) + (bf.missing.length ? ' · ' + joinWords(bf.missing) + ' belum' : '') + (rs.asOf ? ' · data terbaru ' + F().date(rs.asOf) : '') +
        (w && w.fresh.tone === 'bad' ? ' · ' + w.c.short + ' kedaluwarsa' : (w && w.fresh.tone === 'mid' ? ' · ' + w.c.short + ': ' + w.fresh.word.toLowerCase() : ''));
    } else { tone = 'none'; lead = 'Belum ada file bank. Merchant dan Ringkasan hanya menampilkan potensi (biru).'; }
    ui.status.className = 'dp-ov__status is-' + tone;
    ui.status.appendChild(el('span', { class: 'dp-ov__dot', 'aria-hidden': 'true' }));
    ui.status.appendChild(el('span', { text: lead }));

    // review of dropped files, or what to do after "Pakai data ini"
    clear(ui.ovReview);
    var after = !(staged || busy) ? afterApply() : null;
    ui.ovReview.hidden = !(staged || busy || after);
    if (staged || busy) ui.ovReview.appendChild(overviewReview(busy));
    else if (after) ui.ovReview.appendChild(after);

    // cards
    clear(ui.cards);
    rs.cat.filter(function (c) { return c.template || c.type === 'funding' || (c.type === 'kpi' && loadedOf(rs, c.key)); }).map(function (c) {
      return V8_CARD[c.type] ? Object.assign({}, c, V8_CARD[c.type]) : c;
    }).forEach(function (c) {
      var x = loadedOf(rs, c.key), n = x ? x.n : 0, f = x ? x.fresh : freshness(0), m = x ? x.meta : {};
      var meta = [], home = 0;
      if (n && m.asOf) meta.push('Per ' + F().date(m.asOf));
      if (n && m.source === 'vault') meta.push('dari salinan terenkripsi');
      if (n && c.key === 'lvm') {
        home = (rs.sets.lvm.rows || []).filter(function (r) { return r && String(r.branchCode) === HOME; }).length;
        if (home) meta.push(nInt(home) + ' milik KCP Cilangkap');
      }
      var explain = !n ? c.brief + ' ' + c.use : (f.tone === 'bad' ? 'Impor file terbaru: file ini berumur ' + ageText(f) + '.' :
        (f.tone === 'mid' ? (f.days != null ? 'Impor file yang lebih baru. File ini berumur ' + ageText(f) + '.' : 'Isi tanggal data di tampilan Detail.') : c.use));
      /* v5: the shared card head (MCD.windows.card) when the shell has it; the same facts, the same colour words */
      /* numbers: the count (large), the data date, the stores of KCP Cilangkap; a file not imported yet names what it needs */
      /* V8 final fix: the funding card counts merchants as the import does (19), not the stored records (24 MIDs and rows) */
      var fl = n && c.type === 'funding' ? fundLoaded() : null, nShown = fl ? fl.n : n;
      var nums = !n ? [] : [{ label: c.unit ? c.unit[nShown === 1 ? 0 : 1] : 'baris', value: nInt(nShown), big: true }]
        .concat(m.asOf ? [{ label: 'Data per', value: F().date(m.asOf) }] : [])
        .concat(home ? [{ label: 'Milik KCP Cilangkap', value: nInt(home) }] : []);
      var shared = sharedCard({ kind: 'file', key: 'file:' + c.key, eyebrow: 'File bank', title: c.label, chips: [{ text: f.word, tone: f.tone }],
        numbers: nums, note: { text: (!n ? 'Perlu ' + c.need + '. ' : (m.source === 'vault' ? 'Dari salinan terenkripsi. ' : '')) + explain, tone: f.tone } });
      if (shared) {
        ui.cards.appendChild(el('article', { class: 'dp-dc dp-dc--ws is-' + f.tone + (c.main ? ' is-main' : ''), role: 'listitem', 'aria-label': c.label + ': ' + f.word }, [shared]));
        return;
      }
      ui.cards.appendChild(el('article', { class: 'dp-dc is-' + f.tone + (c.main ? ' is-main' : ''), role: 'listitem', 'aria-label': c.label + ': ' + f.word }, [
        el('div', { class: 'dp-dc__top' }, [el('span', { class: 'dp-dc__name', text: c.label }), chip(f.tone, f.word)]),
        el('p', { class: 'dp-dc__value' }, n ? [el('span', { class: 'dp-dc__n', text: nInt(nShown) }), el('span', { class: 'dp-dc__unit', text: ' ' + (c.unit ? c.unit[nShown === 1 ? 0 : 1] : 'baris') })]
          : [el('span', { class: 'dp-dc__need', text: 'Perlu file' }), el('span', { class: 'dp-dc__n is-empty', text: c.need })]),
        meta.length ? el('p', { class: 'dp-dc__meta', text: meta.join(' · ') }) : null,
        el('p', { class: 'dp-dc__explain', text: explain })
      ]));
    });
    var st = saveTone(ss);
    var saveWords = {
      demo: 'Penyimpanan tidak tersedia saat Data contoh aktif.',
      empty: 'Setelah impor, simpan salinan berkata sandi agar data terbuka saat masuk berikutnya.',
      downloaded: 'File vault.js telah diunduh. Pasang di folder data agar data terbuka saat masuk berikutnya.',
      invault: 'Data dibuka dari salinan terenkripsi dan belum berubah. Tidak perlu disimpan.',
      todo: 'Data impor hanya ada sampai dashboard dikunci. Simpan agar terbuka saat masuk berikutnya.',
      fu: 'Daftar tindak lanjut tersimpan terenkripsi di komputer ini. Simpan salinan agar terbawa ke komputer lain.'
    }[ss];
    var sharedSave = sharedCard({ kind: 'vault', key: 'vault', eyebrow: 'Penyimpanan', title: 'Salinan terenkripsi', chips: [{ text: st.word, tone: st.tone }],
      numbers: [], note: { text: saveWords, tone: st.tone } });
    if (sharedSave) {
      ui.cards.appendChild(el('article', { class: 'dp-dc dp-dc--save dp-dc--ws is-' + st.tone, role: 'listitem', 'aria-label': 'Salinan terenkripsi: ' + st.word }, [sharedSave]));
      return;
    }
    ui.cards.appendChild(el('article', { class: 'dp-dc dp-dc--save is-' + st.tone, role: 'listitem', 'aria-label': 'Salinan terenkripsi: ' + st.word }, [
      el('div', { class: 'dp-dc__top' }, [el('span', { class: 'dp-dc__name' }, [svgIcon('shield', 'icon--12'), el('span', { text: 'Salinan terenkripsi' })]), chip(st.tone, st.word)]),
      el('p', { class: 'dp-dc__value' }, [el('span', { class: 'dp-dc__n' + (ss === 'empty' || ss === 'demo' ? ' is-empty' : ''), text: st.value })]),
      el('p', { class: 'dp-dc__explain', text: saveWords })
    ]));
  }

  function overviewReview(busy) {
    var box = el('div', { class: 'dp-ovr', 'aria-live': 'polite' });
    box.appendChild(el('h2', { class: 'dp-ovr__t', text: busy && !S.staged.length ? 'Membaca file…' : 'Periksa hasil pembacaan' }));
    var list = el('ul', { class: 'dp-ovr__list' });
    var ready = 0, skipped = 0;
    S.staged.forEach(function (e) {
      var st = entryState(e), r = report(e);
      if (isReady(e)) { ready += recordsN(e); skipped += r.rejected || 0; }
      var kp = isWorkbook(e) && !isKpiBook(e) && e.sc && e.sc.branchKpi ? e.sc.branchKpi.length : 0;
      var line = st.k === 'busy' ? 'memeriksa…' : (!e.type ? 'tidak dikenali, tidak digunakan' :
        (st.k === 'bad' ? (isWorkbook(e) && e.error ? e.error : st.t.toLowerCase()) : (!e.include ? (e.conflict ? 'tidak digunakan: ' + e.conflict + ' yang digunakan' : 'tidak digunakan') :
          plural(recordsN(e), recordWord(e.type, 1), recordWord(e.type, 2)) + (kp ? ' · KPI ' + plural(kp, 'cabang', 'cabang') : '') + (isWorkbook(e) ? workbookTail(e) : '') +
          (r.rejected ? ' · ' + plural(r.rejected, 'row', 'rows') + ' dilewati' + skipWhy(r) : '') + (r.dropped && r.dropped.length ? ' · kolom data pribadi dihapus' : ''))));
      list.appendChild(el('li', { class: 'dp-ovr__row is-' + st.k }, [
        el('span', { class: 'dp-ovr__mark', 'aria-hidden': 'true' }, [st.k === 'ok' || st.k === 'warn' ? icon('check', 'icon--12') : (st.k === 'busy' ? el('span', { class: 'dp-spin' }) : icon('warn', 'icon--12'))]),
        el('span', { class: 'dp-ovr__name' }, [el('strong', { text: e.type ? typeLabel(e.type) : e.title }), el('span', { class: 'dp-ovr__from', text: e.type ? ' dari ' + e.title : '' })]),
        el('span', { class: 'dp-ovr__meta', text: line })
      ]));
    });
    box.appendChild(list);
    if (ready) box.appendChild(el('p', { class: 'dp-ovr__sum', text: nInt(ready) + ' baris siap digunakan.' + (skipped ? ' ' + nInt(skipped) + ' baris bermasalah akan dilewati.' : '') }));
    var act = el('div', { class: 'dp-ovr__act' });
    var cancel = el('button', { type: 'button', class: 'btn btn--secondary' }, [icon('close', 'icon--12'), el('span', { text: 'Batal' })]);
    cancel.addEventListener('click', cancelStaged);
    if (!busy && ready) {
      var use = el('button', { type: 'button', class: 'btn btn--primary' }, [icon('check', 'icon--12'), el('span', { text: 'Gunakan data ini' })]);
      use.addEventListener('click', applyStaged);
      act.appendChild(use);
    }
    act.appendChild(cancel);
    if (!busy && S.staged.length) {
      var check = el('button', { type: 'button', class: 'dp-link' }, [el('span', { text: 'Periksa kolom dulu' }), icon('chev-r', 'icon--12')]);
      check.addEventListener('click', function () { goTab('import'); });
      act.appendChild(check);
    }
    if (S.staged.length) box.appendChild(act);
    return box;
  }
  /** ' · Sep 2026 · Area Pasar Rebo' for a workbook entry (as read from the file). */
  function workbookTail(e) {
    var K = e.reader || kpiMod(), sc = e.sc;
    if (!sc) return '';
    var per = K && K.periodLabel && sc.period ? K.periodLabel(sc.period) : '';
    return (per ? ' · ' + per : '') + (sc.area ? ' · Area ' + sc.area : '');
  }

  /* --- Deep dive: review --------------------------------------------------- */

  function focusKey() { var a = DOC.activeElement; return a && a.getAttribute ? a.getAttribute('data-fk') : null; }
  function restoreFocus(k) {
    if (!k || !ui || !ui.root) return;
    var n = ui.root.querySelector('[data-fk="' + k + '"]');
    if (n && typeof n.focus === 'function') n.focus({ preventScroll: true });
  }

  function renderReview() {
    if (!ui || !ui.review) return;
    if (ui.after) { clear(ui.after); var aa = !S.staged.length ? afterApply() : null; if (aa) ui.after.appendChild(aa); }
    var fk = focusKey();
    clear(ui.review);
    var n = S.staged.length;
    var nFiles = uniq(S.staged.map(function (e) { return e.file; })).length;
    ui.importX.title.textContent = n ? (n === 1 ? (isWorkbook(S.staged[0]) ? 'Periksa laporan sebelum digunakan' : 'Periksa sheet sebelum digunakan')
      : 'Periksa ' + n + (nFiles === n ? ' file' : ' sheet') + ' sebelum digunakan')
      : (realStatus().any ? 'Impor file yang lebih baru untuk mengganti data' : 'Impor laporan bulanan Livin’ Merchant untuk memulai');
    setLines(ui.importX.sub, n ? 'Periksa jenis data, kolom dan tanggal data.\nData baru digunakan setelah Anda menekan Gunakan data ini.'
      : (demoOn() ? 'Data contoh aktif. Saat memilih file, Anda diminta mematikan Data contoh.\nDengan begitu, angka nyata dan angka contoh tidak tercampur.'
        : 'CSV atau XLSX · laporan Rev LVM apa adanya atau template permintaan data · hanya dibaca di browser ini'));
    ui.drop.hidden = n > 0;
    if (!n) { ui.review.hidden = true; return; }
    ui.review.hidden = false;
    var more = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'more' }, [icon('upload', 'icon--12'), el('span', { text: 'Tambah file' })]);
    more.addEventListener('click', pickFiles);
    ui.review.appendChild(el('div', { class: 'dp-review__bar' }, [
      el('p', { class: 'dp-review__files', text: 'Dari ' + uniq(S.staged.map(function (e) { return e.file; })).join(', ') }), more]));
    S.staged.forEach(function (e) { ui.review.appendChild(stagedCard(e)); });
    var ready = S.staged.filter(isReady), busy = S.staged.some(function (e) { return e.busy; });
    var applyB = el('button', { type: 'button', class: 'btn btn--lg btn--primary', 'data-fk': 'apply', disabled: !ready.length || busy ? true : null }, [
      icon('check'), el('span', { text: ready.length > 1 ? 'Gunakan ' + ready.length + ' sheet' : 'Gunakan data ini' })]);
    applyB.addEventListener('click', applyStaged);
    var cancelB = el('button', { type: 'button', class: 'btn btn--lg btn--secondary', 'data-fk': 'cancel' }, [el('span', { text: 'Batal' })]);
    cancelB.addEventListener('click', cancelStaged);
    var sets = realSets();
    var replaces = ready.filter(function (e) { return realCount(sets, dataKeyOf(e.type)) > 0; }).map(function (e) { return typeLabel(e.type); });
    ui.review.appendChild(el('div', { class: 'dp-review__foot' }, [
      el('div', { class: 'dp-actions' }, [applyB, cancelB]),
      el('p', { class: 'dp-review__note', text: (replaces.length ? 'Menggantikan ' + replaces.join(', ') + '. ' : '') + 'Hanya data di dashboard yang berubah. File asli Anda tidak berubah.' })
    ]));
    restoreFocus(fk);
  }

  function stagedCard(e) {
    var st = entryState(e), r = report(e), cat = catalog();
    var inc = el('input', { type: 'checkbox', class: 'dp-check', id: e.id + '-inc', 'data-fk': e.id + '-inc', checked: e.include ? true : null, disabled: !e.type ? true : null });
    inc.addEventListener('change', function () { e.include = inc.checked; if (e.include) resolveConflicts(e); refreshReview(); });
    var sel;
    if (isWorkbook(e)) {                               // fixed layout: one dataset, no column choices
      sel = el('span', { class: 'dp-st__fixed', id: e.id + '-type' }, [svgIcon('sheet', 'icon--12'), el('span', { text: wbLabel(e) })]);
    } else {
      sel = el('select', { class: 'select dp-select', id: e.id + '-type', 'data-fk': e.id + '-type', 'aria-label': 'Jenis data untuk ' + e.title });
      sel.appendChild(el('option', { value: '', text: 'Tidak dikenali · pilih jenis data', selected: !e.type ? true : null }));
      /* V8 D45, V7 §9.2: funding, saldo, vault-only schemas and the lead list are never offered here */
      cat.forEach(function (c) { if (c.schema && c.pick !== false) sel.appendChild(el('option', { value: c.type, text: c.label + (c.template ? ' · ' + c.code : ''), selected: e.type === c.type ? true : null })); });
      sel.addEventListener('change', function () {
        e.type = sel.value || null; e.mapping = null; e.include = !!e.type; e.guessed = false; e.page = 0;
        if (e.include) resolveConflicts(e);
        validate(e);
      });
    }
    var toggle = el('button', { type: 'button', class: 'btn btn--secondary dp-st__open', 'data-fk': e.id + '-open', 'aria-expanded': e.open ? 'true' : 'false', 'aria-controls': e.id + '-body' }, [
      el('span', { text: e.open ? 'Sembunyikan detail' : (isWorkbook(e) ? 'Lihat detail' : 'Periksa kolom') }), icon(e.open ? 'chev-u' : 'chev-d', 'icon--12')]);
    toggle.addEventListener('click', function () { e.open = !e.open; renderReview(); });

    var head = el('div', { class: 'dp-st__head' }, [
      el('label', { class: 'dp-st__inc', for: e.id + '-inc', title: 'Gunakan sheet ini' }, [inc, el('span', { class: 'sr-only', text: 'Gunakan ' + e.title })]),
      el('div', { class: 'dp-st__name' }, [
        el('span', { class: 'dp-st__title' }, [svgIcon('sheet', 'icon--12'), el('span', { text: e.title })]),
        el('span', { class: 'dp-st__file', text: isWorkbook(e) ? 'File Excel · dibaca utuh' + (e.det && e.det.use ? ': ' + e.det.use.join(', ') : '') : (e.sheetName ? e.file + ' · ' : '') + plural(e.rows, 'row', 'rows') })
      ]),
      el('div', { class: 'dp-st__ds' }, [isWorkbook(e) ? null : el('label', { class: 'sr-only', for: e.id + '-type', text: 'Jenis data' }), sel]),
      pill(st.k, st.t),
      toggle
    ]);
    var card = el('article', { class: 'dp-st is-' + st.k + (e.open ? ' is-open' : ''), 'aria-label': e.title }, [head]);
    var line = summaryLine(e);
    if (line) card.appendChild(el('p', { class: 'dp-st__line', text: line }));
    if (e.conflict && !e.include && e.type) card.appendChild(el('p', { class: 'dp-st__warn' }, [icon('info', 'icon--12'), el('span', { text: 'Tidak digunakan: ' + e.conflict + ' telah mengisi ' + typeLabel(e.type) + '. Centang untuk menggunakan sheet ini.' })]));
    if (e.guessed && r && r.fatal) card.appendChild(el('p', { class: 'dp-st__warn' }, [icon('info', 'icon--12'), el('span', { text: 'Dikenali dari nama sheet. Beberapa kolom wajib tidak ditemukan.' })]));
    if (e.error) card.appendChild(el('p', { class: 'dp-st__bad', text: e.error }));
    if (e.open && isKpiBook(e) && e.sc) card.appendChild(kpiBody(e));
    else if (e.open && isWorkbook(e) && e.sc) card.appendChild(workbookBody(e));
    else if (e.open && e.type && r) card.appendChild(stagedBody(e));
    else if (e.open && !e.type) card.appendChild(el('div', { class: 'dp-st__body', id: e.id + '-body' }, [el('p', { class: 'dp-p', text: 'Kolom sheet ini tidak cocok dengan jenis data yang dikenal.\nPilih jenis data di atas, lalu periksa kolomnya.\nPanduan kolom di bawah memuat nama kolom yang diterima.' })]));
    return card;
  }

  function summaryLine(e) {
    var r = report(e);
    if (!e.type || !r || e.busy) return null;
    if (isKpiBook(e)) {
      var KR = e.reader, per0 = KR && KR.periodLabel && e.sc && e.sc.period ? KR.periodLabel(e.sc.period) : '';
      return 'KPI ' + plural(recordsN(e), 'cabang', 'cabang') + (per0 ? ' · ' + per0 : '') + (e.sc && e.sc.area ? ' · Area ' + e.sc.area : '') +
        (r.checkWarnings ? ' · ' + plural(r.checkWarnings, 'note', 'notes') + ' perlu dibaca' : '');
    }
    if (isWorkbook(e)) {
      var kp = (e.sc && e.sc.branchKpi) || [];
      return plural(recordsN(e), 'toko', 'toko') + ' · KPI ' + plural(kp.length, 'cabang', 'cabang') + workbookTail(e) +
        (r.rejected ? ' · ' + plural(r.rejected, 'row', 'rows') + ' dilewati' + skipWhy(r) : '') + (r.checkWarnings ? ' · ' + plural(r.checkWarnings, 'note', 'notes') + ' perlu dibaca' : '');
    }
    if (r.fatal) return 'Kolom wajib tidak ada, sehingga tidak ada baris yang terbaca. Pilih kolom yang sesuai di bawah.';
    var bits = [nInt(r.totalRows) + ' baris terbaca', nInt(r.accepted) + ' siap'];
    if (r.rejected) bits.push(nInt(r.rejected) + ' dilewati' + skipWhy(r));
    if (r.warnings) bits.push(plural(r.warnings, 'warning', 'warnings'));
    return bits.join(' · ');
  }

  function schemaOf(type) { return schemasByType()[type] || null; }
  function currentMapping(e) {
    var r = report(e);
    if (e.mapping) return e.mapping;
    if (r && r.mapping) return r.mapping;
    try { return MCD.importer.mapHeaders(e.sheet.headers, e.type).mapping; } catch (err) { return {}; }
  }
  function setColumn(e, idx, canon) {
    var m = {}, cur = currentMapping(e);
    Object.keys(cur).forEach(function (k) { if (cur[k] !== idx && k !== canon) m[k] = cur[k]; });
    if (canon) m[canon] = idx;
    e.mapping = m;
    e.page = 0;
    validate(e);
  }

  function stagedBody(e) {
    var r = report(e), sc = schemaOf(e.type);
    var body = el('div', { class: 'dp-st__body', id: e.id + '-body' });
    var grid = el('div', { class: 'dp-st__grid' });
    grid.appendChild(mappingBlock(e, r, sc));
    grid.appendChild(sideBlock(e, r, sc));
    body.appendChild(grid);
    body.appendChild(reportBlock(e, r, sc));
    return body;
  }

  /** Review of the Rev LVM workbook: what was read, the data date and the engine's own checks. */
  function workbookBody(e) {
    var K = kpiMod(), sc = e.sc, r = report(e);
    var body = el('div', { class: 'dp-st__body', id: e.id + '-body' }), grid = el('div', { class: 'dp-st__grid' });
    var kp = sc.branchKpi || [];
    var per = K && K.periodLabel && sc.period ? K.periodLabel(sc.period) : null;
    var homeStores = (sc.merchants || []).filter(function (m) { return String(m.branchCode) === HOME; }).length;

    var left = el('div', { class: 'dp-map' });
    left.appendChild(el('h3', { class: 'dp-h3', text: 'Yang terbaca' }));
    left.appendChild(el('dl', { class: 'dp-figs' }, [['Toko', nInt(recordsN(e))], ['KCP Cilangkap', nInt(homeStores)], ['Cabang dengan KPI', nInt(kp.length)], ['Periode', per || '—']].map(function (f) {
      return el('div', { class: 'dp-fig' }, [el('dt', { text: f[0] }), el('dd', { text: f[1] })]);
    })));
    var sum = null;
    try { sum = K && K.summary ? K.summary(sc) : null; } catch (err) { sum = null; }
    var home = sum && sum.branch;
    left.appendChild(el('p', { class: 'dp-p dp-wb__home' }, home
      ? [el('strong', { text: 'KCP Cilangkap (' + home.code + ')' }), ' ada di sheet KPI' + (isNum(home.rank) ? ': peringkat ' + nInt(home.rank) + ' dari ' + nInt(sum.of) + ' untuk pengguna aktif (USAK)' : '') + '.']
      : [el('strong', { text: 'KCP Cilangkap (' + ((K && K.HOME) || HOME) + ')' }), ' tidak ada di sheet UREG atau USAK file ini. Tokonya tetap dibaca dari sheet Rincian.']));
    var used = Object.keys(r.mapping || {}).map(colLabel);
    if (used.length) left.appendChild(el('p', { class: 'dp-fine', text: 'Kolom yang digunakan dari sheet rincian: ' + used.join(', ') + '.' }));
    left.appendChild(el('p', { class: 'dp-fine', text: 'Alamat toko hanya dibaca untuk menemukan titik jalan atau kelurahan, lalu tidak disimpan.\nNama pimpinan cabang di sheet KPI tidak dibaca.' }));

    var side = el('div', { class: 'dp-side' });
    side.appendChild(el('h3', { class: 'dp-h3', text: 'Dikenali sebagai' }));
    side.appendChild(el('p', { class: 'dp-side__big', text: wbLabel() }));
    side.appendChild(el('p', { class: 'dp-fine', text: 'Dibaca dari sheet ' + (((sc.sheets && sc.sheets.used) || (e.det && e.det.use)) || []).join(', ') + (sc.area ? ' · Area ' + sc.area : '') }));
    var dateId = e.id + '-asof';
    var inp = el('input', { type: 'date', class: 'input dp-date', id: dateId, 'data-fk': dateId, value: e.asOf || sc.asOf || '' });
    inp.addEventListener('change', function () { e.asOf = inp.value || ''; refreshReview(); });
    side.appendChild(el('div', { class: 'field dp-side__field' }, [
      el('label', { class: 'field__label', for: dateId, text: 'Tanggal data (posisi per)' }), inp,
      el('p', { class: 'field__hint', text: e.asOf ? 'Diisi Anda: ' + F().date(e.asOf) + '.' : (sc.asOf ? 'Dibaca dari laporan: ' + F().date(sc.asOf) + '. Ubah jika tanggal posisinya berbeda.' : 'Tanggal tidak ditemukan di file. Isi tanggal posisi.') })
    ]));
    if (r.dropped && r.dropped.length) {
      side.appendChild(el('h3', { class: 'dp-h3 dp-h3--lock' }, [icon('lock', 'icon--12'), el('span', { text: 'Data pribadi dihapus' })]));
      side.appendChild(el('p', { class: 'dp-fine', text: plural(r.dropped.length, 'column', 'columns') + ' dihapus saat dibaca dan tidak pernah disimpan: ' + r.dropped.join(', ') + '.' }));
    }
    grid.appendChild(left);
    grid.appendChild(side);
    body.appendChild(grid);

    var box = el('div', { class: 'dp-rep' });
    box.appendChild(el('h3', { class: 'dp-h3', text: 'Hasil pemeriksaan' }));
    box.appendChild(el('dl', { class: 'dp-figs' }, [['Baris terbaca', r.totalRows], ['Siap', r.accepted], ['Dilewati', r.rejected], ['Catatan', r.checkWarnings]].map(function (f) {
      return el('div', { class: 'dp-fig' + (f[0] === 'Dilewati' && f[1] ? ' is-bad' : '') + (f[0] === 'Catatan' && f[1] ? ' is-warn' : '') }, [el('dt', { text: f[0] }), el('dd', { text: nInt(f[1] || 0) })]);
    })));
    var list = el('ul', { class: 'dp-find' });
    var order = { warn: 0, info: 1, ok: 2 };
    (sc.checks || []).slice().sort(function (a, b) { return (order[a.level] == null ? 3 : order[a.level]) - (order[b.level] == null ? 3 : order[b.level]); }).forEach(function (c) {
      var lv = c.level === 'warn' ? 'warn' : (c.level === 'ok' ? 'ok' : 'info');
      list.appendChild(el('li', { class: 'dp-find__row is-' + lv }, [icon(lv === 'warn' ? 'warn' : (lv === 'ok' ? 'check' : 'info'), 'icon--12'), el('span', { text: c.text })]));
    });
    findings(r).slice(0, 6).forEach(function (g) {
      var lead = g.level === 'error' ? plural(g.n, 'row skipped', 'rows skipped') : (g.level === 'warn' ? plural(g.n, 'row imported with a warning', 'rows imported with a warning') : plural(g.n, 'note', 'notes'));
      list.appendChild(el('li', { class: 'dp-find__row is-' + g.level }, [icon(g.level === 'error' ? 'warn' : 'info', 'icon--12'),
        el('span', null, [el('strong', { text: lead + ': ' }), reasonLine(g) + ' ' + rowsText(g)])]));
    });
    if (!list.firstChild) list.appendChild(el('li', { class: 'dp-find__row is-ok' }, [icon('check', 'icon--12'), el('span', { text: 'Tidak ada masalah. Semua toko dapat digunakan.' })]));
    box.appendChild(list);
    box.appendChild(el('p', { class: 'dp-fine', text: 'Catatan tidak menghalangi impor. Nomor baris sama dengan di Excel (judul kolom = baris 1).' }));
    body.appendChild(box);
    return body;
  }

  /* V8: the review of the KPI workbook. Counts, the period, whether KCP Cilangkap is in the file and the module's visible
     notes only; a note about another branch is counted, not shown (peers stay out of view, V7 D24). No KPI value. */
  var KPI_OTHER = { DUP_CODE: 1, BY_NAME: 1, NO_DATA: 1 };
  function kpiBody(e) {
    var K = e.reader || {}, m = e.sc, r = report(e), KP = MCD.kpi;
    var body = el('div', { class: 'dp-st__body', id: e.id + '-body' }), grid = el('div', { class: 'dp-st__grid' });
    var hid = (KP && KP.HIDDEN) || [], fields = (m.fields || []).filter(function (f) { return f && hid.indexOf(f.key) < 0; });
    var found = fields.filter(function (f) { return f.found; }).length, home = (m.home || HOME);
    var homeB = (m.branches || []).filter(function (b) { return b && (b.home || b.code === home); })[0];
    var per = K.periodLabel && m.period ? K.periodLabel(m.period) : (m.periodLabel || '—');
    var left = el('div', { class: 'dp-map' });
    left.appendChild(el('h3', { class: 'dp-h3', text: 'Yang terbaca' }));
    left.appendChild(el('dl', { class: 'dp-figs' }, [['Cabang di area', nInt(recordsN(e))], ['KPI terbaca', nInt(found) + ' dari ' + nInt(fields.length)], ['Periode', per || '—'], ['Area', m.area || '—']].map(function (f) {
      return el('div', { class: 'dp-fig' }, [el('dt', { text: f[0] }), el('dd', { text: f[1] })]);
    })));
    left.appendChild(el('p', { class: 'dp-p dp-wb__home' }, [el('strong', { text: 'KCP Cilangkap (' + home + ')' }),
      homeB ? ' ada di file ini.' : ' tidak ada di file ini. Posisi cabang tidak dapat dihitung.']));
    left.appendChild(el('p', { class: 'dp-fine', text: 'File ini hanya memuat angka total setiap cabang, tanpa data nasabah.\nCabang lain hanya digunakan untuk peringkat di Posisi cabang.' }));
    var side = el('div', { class: 'dp-side' });
    side.appendChild(el('h3', { class: 'dp-h3', text: 'Dikenali sebagai' }));
    side.appendChild(el('p', { class: 'dp-side__big', text: wbLabel(e) }));
    var used = (m.sheets && m.sheets.used) || [];
    if (used.length) side.appendChild(el('p', { class: 'dp-fine', text: 'Dibaca dari sheet ' + used.join(', ') }));
    if (r.asOf) side.appendChild(el('p', { class: 'dp-fine', text: 'Tanggal data: ' + F().date(r.asOf) + ', akhir periode file.' }));
    grid.appendChild(left);
    grid.appendChild(side);
    body.appendChild(grid);
    var box = el('div', { class: 'dp-rep' });
    box.appendChild(el('h3', { class: 'dp-h3', text: 'Hasil pemeriksaan' }));
    box.appendChild(el('dl', { class: 'dp-figs' }, [['Cabang', r.totalRows], ['Di skor KPI', r.accepted], ['Catatan', r.checkWarnings]].map(function (f) {
      return el('div', { class: 'dp-fig' + (f[0] === 'Catatan' && f[1] ? ' is-warn' : '') }, [el('dt', { text: f[0] }), el('dd', { text: nInt(f[1] || 0) })]);
    })));
    var list = el('ul', { class: 'dp-find' }), others = 0, order = { warn: 0, info: 1 };
    kpiNotes(m).slice().sort(function (a, b) { return (order[a.level] == null ? 2 : order[a.level]) - (order[b.level] == null ? 2 : order[b.level]); }).forEach(function (w) {
      if (KPI_OTHER[w.code] && String(w.text).indexOf(home) < 0) { others++; return; }
      var lv = w.level === 'warn' ? 'warn' : 'info';
      list.appendChild(el('li', { class: 'dp-find__row is-' + lv }, [icon(lv === 'warn' ? 'warn' : 'info', 'icon--12'), el('span', { text: w.text })]));
    });
    if (others) list.appendChild(el('li', { class: 'dp-find__row is-info' }, [icon('info', 'icon--12'), el('span', { text: nInt(others) + ' catatan tentang cabang lain di file KPI.' })]));
    if (!list.firstChild) list.appendChild(el('li', { class: 'dp-find__row is-ok' }, [icon('check', 'icon--12'), el('span', { text: 'Tidak ada masalah. Semua KPI dapat digunakan.' })]));
    box.appendChild(list);
    body.appendChild(box);
    return body;
  }

  function missingCols(r, sc, mapping) {
    if (!sc) return { req: [], groups: [] };
    var req = sc.columns.filter(function (c) { return c.req === true && !(c.key in mapping); }).map(function (c) { return c.key; });
    var groups = {};
    sc.columns.forEach(function (c) { if (typeof c.req === 'string' && c.req.indexOf('any:') === 0) (groups[c.req.slice(4)] = groups[c.req.slice(4)] || []).push(c.key); });
    var miss = Object.keys(groups).filter(function (g) { return !groups[g].some(function (k) { return k in mapping; }); }).map(function (g) { return groups[g]; });
    return { req: req, groups: miss };
  }

  function mappingBlock(e, r, sc) {
    var headers = e.sheet.headers || [], mapping = currentMapping(e), inv = {};
    Object.keys(mapping).forEach(function (k) { inv[mapping[k]] = k; });
    var auto = {};
    try { auto = MCD.importer.mapHeaders(headers, e.type); } catch (err) { auto = { dropped: [], monthly: {} }; }
    var dropped = {}; (auto.dropped || []).forEach(function (h) { dropped[str(h)] = 1; });
    var monthly = {};
    Object.keys(auto.monthly || {}).forEach(function (canon) { Object.keys(auto.monthly[canon]).forEach(function (ym) { monthly[auto.monthly[canon][ym]] = colLabel(canon) + ' · ' + ym; }); });
    var cols = sc ? sc.columns : [], personal = {};
    cols.forEach(function (c) { personal[c.key] = !!c.personal; });

    var miss = missingCols(r, sc, mapping), wrap = el('div', { class: 'dp-map' });
    wrap.appendChild(el('h3', { class: 'dp-h3', text: 'Kolom' }));
    if (miss.req.length || miss.groups.length) {
      var parts = [];
      if (miss.req.length) parts.push('Wajib, tetapi tidak ditemukan: ' + miss.req.map(function (k) { return colLabel(k) + ' (' + k + ')'; }).join(', ') + '.');
      miss.groups.forEach(function (g) { parts.push('Perlu salah satu dari: ' + g.map(function (k) { return colLabel(k) + ' (' + k + ')'; }).join(', ') + '.'); });
      wrap.appendChild(el('div', { class: 'dp-callout dp-callout--bad', role: 'note' }, [icon('warn', 'icon--12'), el('p', { text: parts.join(' ') + ' Pilih kolom yang sesuai di daftar, atau tambahkan kolom itu ke file.' })]));
    }
    var tbody = el('tbody');
    headers.forEach(function (h, idx) {
      var name = str(h);
      if (!name) return;
      var canon = inv[idx], isDropped = !!dropped[name], isMonthly = monthly[idx] != null;
      var ex = '';
      for (var i = 0; i < Math.min(e.sheet.rows.length, 200); i++) { var v = e.sheet.rows[i][idx]; if (v != null && str(v instanceof Date ? 'd' : v) !== '') { ex = v; break; } }
      var used;
      if (isDropped) used = el('span', { class: 'dp-map__fixed is-drop' }, [icon('lock', 'icon--12'), el('span', { text: 'Dihapus · data pribadi' })]);
      else if (isMonthly) used = el('span', { class: 'dp-map__fixed', text: monthly[idx] });
      else {
        var s = el('select', { class: 'select dp-select dp-select--sm', 'data-fk': e.id + '-col-' + idx, 'aria-label': 'Gunakan kolom ' + name + ' sebagai' });
        s.appendChild(el('option', { value: '', text: 'Tidak digunakan', selected: !canon ? true : null }));
        cols.forEach(function (c) {
          var req = c.req === true ? ' · wajib' : '';
          s.appendChild(el('option', { value: c.key, text: colLabel(c.key) + ' (' + c.key + ')' + req, selected: canon === c.key ? true : null }));
        });
        s.addEventListener('change', function () { setColumn(e, idx, s.value || null); });
        used = s;
      }
      var stat = isDropped ? el('span', { class: 'dp-map__st is-drop', title: 'Dihapus saat impor, tidak pernah disimpan' }, [icon('lock', 'icon--12')])
        : (canon || isMonthly ? el('span', { class: 'dp-map__st is-ok', title: 'Digunakan' }, [icon('check', 'icon--12')]) : el('span', { class: 'dp-map__st is-off', title: 'Tidak digunakan', text: '–' }));
      var exText = isDropped ? '—' : (sample(ex, canon ? personal[canon] : true) || '—');
      tbody.appendChild(el('tr', { class: isDropped ? 'is-drop' : (canon || isMonthly ? 'is-used' : 'is-unused') }, [
        el('td', { class: 'dp-map__name' }, [el('span', { text: name })]),
        el('td', { class: 'dp-map__use' }, [used]),
        el('td', { class: 'dp-map__ex mono', text: exText }),
        el('td', { class: 'ctr' }, [stat])
      ]));
    });
    var tbl = el('table', { class: 'tbl dp-tbl' }, [
      el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: 'Kolom di file Anda' }), el('th', { scope: 'col', text: 'Digunakan sebagai' }), el('th', { scope: 'col', text: 'Contoh isi' }), el('th', { scope: 'col', class: 'ctr' }, [el('span', { class: 'sr-only', text: 'Status' })])])]),
      tbody
    ]);
    wrap.appendChild(el('div', { class: 'tbl-wrap dp-map__scroll' }, [tbl]));
    var nUsed = Object.keys(mapping).length, nUn = (r.unmatched || []).length, nDrop = (r.dropped || []).length;
    wrap.appendChild(el('p', { class: 'dp-fine', text: plural(nUsed, 'column', 'columns') + ' digunakan · ' + nUn + ' tidak digunakan · ' + nDrop + ' dihapus karena data pribadi · contoh disamarkan' + (privacyMode() === 'reveal' ? ' kecuali saat nama ditampilkan' : '') }));
    return wrap;
  }

  function sideBlock(e, r, sc) {
    var side = el('div', { class: 'dp-side' });
    side.appendChild(el('h3', { class: 'dp-h3', text: 'Dikenali sebagai' }));
    var cands = (e.det && e.det.candidates) || [];
    var also = cands.filter(function (c) { return c.ok && c.type !== e.type; }).slice(0, 2).map(function (c) { return typeLabel(c.type); });
    side.appendChild(el('p', { class: 'dp-side__big', text: typeLabel(e.type) }));
    side.appendChild(el('p', { class: 'dp-fine', text: e.det && e.det.type === e.type ? 'Cocok pada ' + plural(e.det.score, 'column', 'columns') + (also.length ? ' · juga mungkin: ' + also.join(', ') : '') : (e.guessed ? 'Dikenali dari nama sheet' : 'Dipilih Anda') }));
    var dateId = e.id + '-asof';
    var inp = el('input', { type: 'date', class: 'input dp-date', id: dateId, 'data-fk': dateId, value: e.asOf || r.asOf || '' });
    inp.addEventListener('change', function () { e.asOf = inp.value || ''; validate(e); });
    side.appendChild(el('div', { class: 'field dp-side__field' }, [
      el('label', { class: 'field__label', for: dateId, text: 'Tanggal data (posisi per)' }), inp,
      el('p', { class: 'field__hint', text: (e.asOf ? 'Diisi Anda: ' + F().date(e.asOf) + '.' : (r.asOf ? 'Terbaca ' + F().date(r.asOf) + '. ' : '') + 'Diambil dari file jika ada. Ubah jika tanggal posisinya berbeda.') })
    ]));
    var g = r.geo || {}, total = (g.EXACT || 0) + (g.KELURAHAN_APPROX || 0) + (g.NONE || 0);
    if (total) {
      side.appendChild(el('h3', { class: 'dp-h3', text: 'Lokasi' }));
      side.appendChild(geoBar(g, total));
    }
    if (r.dropped && r.dropped.length) {
      side.appendChild(el('h3', { class: 'dp-h3 dp-h3--lock' }, [icon('lock', 'icon--12'), el('span', { text: 'Data pribadi dihapus' })]));
      side.appendChild(el('p', { class: 'dp-fine', text: r.dropped.join(', ') + ' · dihapus saat dibaca, tidak pernah disimpan' }));
    }
    return side;
  }

  function geoBar(g, total) {
    var segs = [['EXACT', 'dp-geo--1'], ['KELURAHAN_APPROX', 'dp-geo--2'], ['NONE', 'dp-geo--0']];
    var bar = el('div', { class: 'dp-geo', role: 'img', 'aria-label': segs.map(function (s) { return GEO_LABEL[s[0]] + ' ' + nInt(g[s[0]] || 0); }).join(', ') });
    segs.forEach(function (s) { var v = g[s[0]] || 0; if (v) bar.appendChild(el('i', { class: s[1], style: { 'flex-grow': String(v) } })); });
    var jm = (MCD.config && MCD.config.geocode) || {};
    var note = { EXACT: '', KELURAHAN_APPROX: ' (± ' + (jm.kelurahanJitterM || 350) + ' m)', NONE: ' · ditempatkan kemudian menurut kecamatan atau kode pos' };
    var list = el('ul', { class: 'dp-geo__list' });
    segs.forEach(function (s) {
      var v = g[s[0]] || 0;
      if (!v) return;
      list.appendChild(el('li', null, [el('i', { class: 'dp-geo__sw ' + s[1], 'aria-hidden': 'true' }), el('span', { text: GEO_LABEL[s[0]] + note[s[0]] }), el('span', { class: 'dp-geo__n', text: nInt(v) + ' · ' + pct(v / total) })]));
    });
    return el('div', { class: 'dp-geo-wrap' }, [bar, list]);
  }

  /* The importer's reason codes in Indonesian (item 19). importer.js keeps its English table for the CSV report;
     the page shows these words, falling back to the importer text for a code it does not know. */
  var REASON_ID = {
    REQUIRED_MISSING: 'Kolom wajib kosong',
    MERCHANT_KEY_MISSING: 'MID, ID toko dan nama merchant kosong',
    NEG_VALUE: 'Nilai negatif',
    VALUE_INVALID: 'Nilai tidak terbaca',
    DATE_INVALID: 'Tanggal tidak terbaca',
    DATE_FUTURE: 'Tanggal lebih baru daripada tanggal data',
    DUP_ACCOUNT: 'ID ganda di file ini. Hanya baris pertama yang disimpan.',
    STATUS_UNKNOWN: 'Status tidak dikenali, dikosongkan',
    POSTCODE_INVALID: 'Kode pos tidak 5 angka, dikosongkan',
    GEO_NONE: 'Lokasi kosong: tampil di tabel, tidak di peta',
    COORD_OUT_OF_RANGE: 'Koordinat di luar Jabodetabek. Tidak dihitung dalam filter jarak di atas 20 km.',
    COORD_SWAPPED_FIXED: 'Lintang dan bujur tertukar, telah diperbaiki',
    KELURAHAN_AMBIGUOUS: 'Nama kelurahan ganda, dipilih yang terdekat dengan cabang',
    KELURAHAN_NOT_FOUND: 'Kelurahan tidak ditemukan di daftar wilayah',
    SCHOOL_ID_MISSING: 'NPSN dan nama sekolah kosong',
    NOT_SMA: 'Jenjang selain SMA: disimpan, tetapi tidak tampil di bagian Sekolah'
  };
  /* importer.js schema descriptions in Indonesian (item 19); a type without one shows only the page's own line */
  var SCHEMA_DESC_ID = {
    lvm: 'Satu baris per toko Livin’ Merchant di cabang atau area.\nLaporan bulanan “Rev LVM” dapat diimpor apa adanya. Data pribadi pemilik dihapus.',
    edc: 'Satu baris per terminal EDC Mandiri (MID dan TID).\nHanya data merchant, tanpa data pribadi pemilik.',
    sekolah: 'Satu baris per SMA dan produk, nasabah maupun prospek.\nHanya data sekolah, tanpa data pribadi guru atau siswa.'
  };
  /** importer.js notes in Indonesian (the only English one names the missing required columns). */
  function noteText(n) { return String(n || '').replace(/^Required columns not found: /, 'Kolom wajib tidak ditemukan: '); }
  function reasonText(i) { return (i && REASON_ID[i.code]) || (i && i.reason) || ''; }
  function findings(r) {
    var groups = {}, order = [];
    (r.issues || []).forEach(function (i) {
      var k = i.level + '|' + i.code + '|' + (i.col || '');
      var g = groups[k];
      if (!g) { g = groups[k] = { level: i.level, code: i.code, col: i.col, reason: reasonText(i), n: 0, rows: [] }; order.push(k); }
      g.n++;
      if (g.rows.length < 6 && i.row != null && g.rows.indexOf(i.row) < 0) g.rows.push(i.row);
    });
    var rank = { error: 0, warn: 1, info: 2 };
    return order.map(function (k) { return groups[k]; }).sort(function (a, b) { return (rank[a.level] - rank[b.level]) || (b.n - a.n); });
  }
  /** The reason of the skipped rows, inline (UX_FIX_PLAN C-11): " (alasan, baris 4, 7)". */
  function skipWhy(r) {
    var g = findings(r).filter(function (x) { return x.level === 'error'; });
    if (!g.length) return '';
    var first = g[0], more = g.length > 1 ? ' dan ' + nInt(g.length - 1) + ' alasan lain' : '';
    return ' (' + String(first.reason || '').replace(/\.$/, '') + (first.rows.length ? ', baris ' + first.rows.slice(0, 3).join(', ') : '') + more + ')';
  }
  function rowsText(g) {
    if (!g.rows.length) return '';
    var shown = g.rows.slice(0, 5);
    return (shown.length === 1 && g.n === 1 ? 'Baris ' : 'Baris ') + shown.join(', ') + (g.n > shown.length ? ' dan ' + nInt(g.n - shown.length) + ' lainnya' : '') + '.';
  }

  function reportBlock(e, r) {
    var box = el('div', { class: 'dp-rep' });
    box.appendChild(el('h3', { class: 'dp-h3', text: 'Hasil pemeriksaan' }));
    var figs = [['Baris terbaca', r.totalRows], ['Siap', r.accepted], ['Dilewati', r.rejected], ['Peringatan', r.warnings]];
    figs.push([recordWord(e.type, 2).replace(/^./, function (c) { return c.toUpperCase(); }), r.records || 0]);
    box.appendChild(el('dl', { class: 'dp-figs' }, figs.map(function (f) {
      return el('div', { class: 'dp-fig' + (f[0] === 'Dilewati' && f[1] ? ' is-bad' : '') + (f[0] === 'Peringatan' && f[1] ? ' is-warn' : '') }, [el('dt', { text: f[0] }), el('dd', { text: nInt(f[1] || 0) })]);
    })));
    var fl = findings(r), list = el('ul', { class: 'dp-find' });
    (r.notes || []).forEach(function (n) { list.appendChild(el('li', { class: 'dp-find__row is-info' }, [icon('info', 'icon--12'), el('span', { text: noteText(n) })])); });
    fl.slice(0, 8).forEach(function (g) {
      var lead = g.level === 'error' ? plural(g.n, 'row skipped', 'rows skipped') : (g.level === 'warn' ? plural(g.n, 'row imported with a warning', 'rows imported with a warning') : plural(g.n, 'note', 'notes'));
      list.appendChild(el('li', { class: 'dp-find__row is-' + g.level }, [
        icon(g.level === 'error' ? 'warn' : 'info', 'icon--12'),
        el('span', null, [el('strong', { text: lead + ': ' }), reasonLine(g) + ' ' + rowsText(g)])
      ]));
    });
    if (fl.length > 8) list.appendChild(el('li', { class: 'dp-find__row is-info' }, [icon('info', 'icon--12'), el('span', { text: nInt(fl.length - 8) + ' jenis masalah lain ada di tabel di bawah.' })]));
    if (!list.firstChild) list.appendChild(el('li', { class: 'dp-find__row is-ok' }, [icon('check', 'icon--12'), el('span', { text: 'Tidak ada masalah. Semua baris dapat digunakan.' })]));
    if (r.unmatched && r.unmatched.length) list.appendChild(el('li', { class: 'dp-find__row is-info' }, [icon('info', 'icon--12'), el('span', { text: 'Tidak digunakan: ' + r.unmatched.slice(0, 10).join(', ') + (r.unmatched.length > 10 ? ' dan ' + (r.unmatched.length - 10) + ' lainnya' : '') + '. Pasangkan di atas jika kolom itu diperlukan.' })]));
    box.appendChild(list);
    if (r.truncated) box.appendChild(el('p', { class: 'dp-fine', text: 'Hanya 5.000 masalah pertama yang tercantum.' }));
    var issues = r.issues || [];
    if (issues.length) box.appendChild(issuesTable(e, r, issues));
    return box;
  }

  function issuesTable(e, r, issues) {
    var wrap = el('div', { class: 'dp-iss' });
    var nErr = issues.filter(function (i) { return i.level === 'error'; }).length, nWarn = issues.filter(function (i) { return i.level === 'warn'; }).length;
    if (e.filter === 'error' && !nErr) e.filter = nWarn ? 'warn' : 'all';
    var opts = [['error', 'Baris dilewati', nErr], ['warn', 'Peringatan', nWarn], ['all', 'Semua', issues.length]];
    var seg = el('div', { class: 'seg dp-seg', role: 'group', 'aria-label': 'Tampilkan masalah' });
    opts.forEach(function (o) {
      var b = el('button', { type: 'button', class: 'seg__opt' + (e.filter === o[0] ? ' is-active' : ''), 'data-fk': e.id + '-f-' + o[0], 'aria-pressed': e.filter === o[0] ? 'true' : 'false', disabled: !o[2] ? true : null }, [o[1] + ' · ' + nInt(o[2])]);
      b.addEventListener('click', function () { e.filter = o[0]; e.page = 0; renderReview(); });
      seg.appendChild(b);
    });
    var dl = el('button', { type: 'button', class: 'btn btn--secondary dp-iss__dl', 'data-fk': e.id + '-dl', title: 'Hanya nomor baris, kolom dan alasan, tanpa isi' }, [icon('download', 'icon--12'), el('span', { text: 'Unduh hasil pemeriksaan (CSV)' })]);
    dl.addEventListener('click', function () {
      if (MCD.demo && MCD.demo.blocks()) return;
      downloadText('import-report_' + String(e.title).replace(/[^a-z0-9_-]+/ig, '_') + '.csv', MCD.importer.reportCsv(r));
    });
    if (MCD.demo) MCD.demo.guard(dl);
    wrap.appendChild(el('div', { class: 'dp-iss__bar' }, [seg, dl]));
    var list = issues.filter(function (i) { return e.filter === 'all' || i.level === e.filter; });
    var pages = Math.max(1, Math.ceil(list.length / ISSUE_PAGE));
    if (e.page >= pages) e.page = pages - 1;
    var from = e.page * ISSUE_PAGE, slice = list.slice(from, from + ISSUE_PAGE);
    var tbody = el('tbody');
    slice.forEach(function (i) {
      tbody.appendChild(el('tr', { class: 'is-' + i.level }, [
        el('td', { class: 'num mono', text: i.row == null ? '—' : String(i.row) }),
        el('td', { class: 'mono', text: i.col || '—' }),
        el('td', { class: 'mono dp-iss__val', text: i.value || '—' }),
        el('td', { class: 'dp-iss__why', text: reasonText(i) }),
        el('td', null, [pill(i.level === 'error' ? 'bad' : (i.level === 'warn' ? 'warn' : 'off'), i.level === 'error' ? 'Dilewati' : (i.level === 'warn' ? 'Peringatan' : 'Catatan'))])
      ]));
    });
    wrap.appendChild(el('div', { class: 'tbl-wrap dp-iss__scroll' }, [el('table', { class: 'tbl dp-tbl' }, [
      el('thead', null, [el('tr', null, [el('th', { scope: 'col', class: 'num', text: 'Baris' }), el('th', { scope: 'col', text: 'Kolom' }), el('th', { scope: 'col', text: 'Isi' }), el('th', { scope: 'col', text: 'Masalah' }), el('th', { scope: 'col', text: 'Hasil' })])]),
      tbody])]));
    if (pages > 1) {
      var prev = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': e.id + '-prev', disabled: e.page === 0 ? true : null }, [icon('chev-l', 'icon--12'), el('span', { text: 'Sebelumnya' })]);
      var next = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': e.id + '-next', disabled: e.page >= pages - 1 ? true : null }, [el('span', { text: 'Berikutnya' }), icon('chev-r', 'icon--12')]);
      prev.addEventListener('click', function () { e.page = Math.max(0, e.page - 1); renderReview(); });
      next.addEventListener('click', function () { e.page = Math.min(pages - 1, e.page + 1); renderReview(); });
      wrap.appendChild(el('div', { class: 'dp-iss__pager' }, [el('span', { class: 'dp-fine', text: 'Baris ' + nInt(from + 1) + '–' + nInt(Math.min(list.length, from + ISSUE_PAGE)) + ' dari ' + nInt(list.length) }), prev, next]));
    }
    wrap.appendChild(el('p', { class: 'dp-fine', text: 'Nomor baris sama dengan di Excel (judul kolom = baris 1). Isi pribadi disamarkan.' }));
    return wrap;
  }

  /* --- Deep dive: log, column guide ------------------------------------- */

  function renderLog() {
    if (!ui || !ui.log) return;
    clear(ui.log);
    S.log.forEach(function (l) {
      ui.log.appendChild(el('li', { class: 'dp-log__row' + (l.kind ? ' is-' + l.kind : '') }, [
        el('span', { class: 'dp-log__t mono', text: F().time(l.at) }),
        el('span', { text: l.msg })
      ]));
    });
    ui.logWrap.hidden = !S.log.length;
  }

  function columnGuide() {
    var wrap = el('div', { class: 'dp-guide' });
    if (kpiMod()) wrap.appendChild(workbookGuide());
    if (fundApi()) wrap.appendChild(fundingGuide());
    catalog().forEach(function (c) {
      var sc = c.schema;
      if (!sc || c.pick === false) return;
      var tbody = el('tbody');
      sc.columns.forEach(function (col) {
        var req = col.req === true ? 'Wajib' : (typeof col.req === 'string' && col.req.indexOf('any:') === 0 ? 'Salah satu dari ' + sc.columns.filter(function (x) { return x.req === col.req; }).map(function (x) { return x.key; }).join(' / ') : '');
        tbody.appendChild(el('tr', null, [
          el('td', { class: 'mono', text: col.key }),
          el('td', { text: colLabel(col.key) + (col.personal ? ' · data pribadi' : '') }),
          el('td', { text: TYPE_LABEL[col.type] || col.type || 'Teks' }),
          el('td', { text: req }),
          el('td', { class: 'dp-guide__syn mono', text: (col.syn || []).slice(0, 6).join(', ') + ((col.syn || []).length > 6 ? ' …' : '') })
        ]));
      });
      (sc.monthly || []).forEach(function (m) { tbody.appendChild(el('tr', null, [el('td', { class: 'mono', text: m.pattern }), el('td', { text: colLabel(m.key) + ', satu kolom per bulan' }), el('td', { text: 'Rupiah' }), el('td', { text: '' }), el('td', { class: 'mono', text: '' })])); });
      var hdr = el('button', { type: 'button', class: 'btn btn--secondary' }, [icon('download', 'icon--12'), el('span', { text: 'Unduh judul kolom CSV' })]);
      hdr.addEventListener('click', function () { downloadText(c.code + '.csv', MCD.importer.templateCsv(c.type)); });
      wrap.appendChild(el('details', { class: 'dp-guide__item' }, [
        el('summary', { class: 'dp-guide__sum' }, [
          el('span', { class: 'dp-guide__name', text: c.label }),
          el('span', { class: 'dp-guide__code mono', text: c.template ? 'sheet ' + c.code : 'CSV atau sheet sendiri' }),
          el('span', { class: 'dp-guide__n', text: plural(sc.columns.length, 'column', 'columns') })
        ]),
        el('div', { class: 'dp-guide__body' }, [
          el('p', { class: 'dp-p', text: c.what + (SCHEMA_DESC_ID[c.type] ? ' ' + SCHEMA_DESC_ID[c.type] : '') }),
          el('div', { class: 'tbl-wrap' }, [el('table', { class: 'tbl dp-tbl' }, [
            el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: 'Kolom' }), el('th', { scope: 'col', text: 'Arti' }), el('th', { scope: 'col', text: 'Tipe' }), el('th', { scope: 'col', text: 'Wajib' }), el('th', { scope: 'col', text: 'Nama lain yang diterima' })])]),
            tbody])]),
          el('div', { class: 'dp-actions' }, [hdr])
        ])
      ]));
    });
    wrap.appendChild(el('p', { class: 'dp-fine', text: 'Nama kolom dicocokkan tanpa membedakan huruf besar, spasi atau tanda aksen. Nama pemilik, telepon, e-mail, nomor rekening, CIF, NIK, nama ibu kandung dan NPWP selalu dihapus.' }));
    return wrap;
  }

  /** The Rev LVM workbook is read whole: the guide lists the tabs it is read from instead of columns. */
  function workbookGuide() {
    var rows = [
      ['Rincian', 'Satu baris per toko: ID toko, nama, MID, jenis usaha, kecamatan, kode pos, status transaksi, kode cabang. Kolom data pribadi pemilik dihapus.', 'Wajib'],
      ['UREG', 'Pengguna terdaftar (toko) per cabang terhadap target bulan itu', 'Ini atau USAK'],
      ['USAK', 'Pengguna aktif per cabang terhadap target, beserta peringkatnya', 'Ini atau UREG'],
      ['Sheet lain', 'Ringkasan dari sheet Rincian (daftar teratas, akuisisi bulanan), tidak diimpor', 'Tidak digunakan']
    ];
    var tbody = el('tbody');
    rows.forEach(function (r) { tbody.appendChild(el('tr', null, [el('td', { class: 'mono', text: r[0] }), el('td', { text: r[1] }), el('td', { text: r[2] })])); });
    return el('details', { class: 'dp-guide__item' }, [
      el('summary', { class: 'dp-guide__sum' }, [
        el('span', { class: 'dp-guide__name', text: wbLabel() }),
        el('span', { class: 'dp-guide__code mono', text: 'File XLSX apa adanya' }),
        el('span', { class: 'dp-guide__n', text: plural(rows.length, 'tab', 'tabs') })
      ]),
      el('div', { class: 'dp-guide__body' }, [
        el('p', { class: 'dp-p', text: 'Masukkan laporan bulanan apa adanya, seperti yang dikirim kantor area (“Rev LVM - <tanggal>.xlsx”).\nLaporan dikenali dari nama sheet, sehingga tidak perlu disalin ke template.\nNama pimpinan cabang di sheet KPI tidak dibaca.' }),
        el('div', { class: 'tbl-wrap' }, [el('table', { class: 'tbl dp-tbl' }, [
          el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: 'Sheet' }), el('th', { scope: 'col', text: 'Yang dibaca' }), el('th', { scope: 'col', text: 'Diperlukan' })])]),
          tbody])])
      ])
    ]);
  }

  /** V8 D45: the funding merchant files are read whole by the one import row; the guide lists the sheets it reads. */
  function fundingGuide() {
    var rows = [
      ['Detail MID', 'Laporan region: satu baris per MID. Hanya baris KCP Jakarta Cilangkap (12903) yang dibaca.', 'Ini atau file cabang'],
      ['Commonname', 'Laporan region: satu baris per nama merchant, untuk daftar Saldo merchant.', 'Opsional'],
      ['All Cab dan Summary Area', 'Laporan region: total per cabang dan area. Cabang lain hanya menjadi peringkat.', 'Opsional'],
      ['Sheet1', 'File cabang Cilangkap Merchant Area: satu baris per nama merchant.', 'Ini atau laporan region']
    ];
    var tbody = el('tbody');
    rows.forEach(function (r) { tbody.appendChild(el('tr', null, [el('td', { class: 'mono', text: r[0] }), el('td', { text: r[1] }), el('td', { text: r[2] })])); });
    return el('details', { class: 'dp-guide__item' }, [
      el('summary', { class: 'dp-guide__sum' }, [
        el('span', { class: 'dp-guide__name', text: FUND_T.title }),
        el('span', { class: 'dp-guide__code mono', text: 'File XLSX apa adanya' }),
        el('span', { class: 'dp-guide__n', text: plural(rows.length, 'tab', 'tabs') })
      ]),
      el('div', { class: 'dp-guide__body' }, [
        el('p', { class: 'dp-p', text: FUND_LINES.join('\n') + '\nImpor melalui kartu Funding merchant (cabang) di tab ini.' }),
        el('div', { class: 'tbl-wrap' }, [el('table', { class: 'tbl dp-tbl' }, [
          el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: 'Sheet' }), el('th', { scope: 'col', text: 'Yang dibaca' }), el('th', { scope: 'col', text: 'Diperlukan' })])]),
          tbody])])
      ])
    ]);
  }

  /* --- Deep dive: loaded data ------------------------------------------- */

  function loadedTitle(rs) {
    if (!rs.primaryLoaded) return rs.any ? 'File LVM belum diimpor: peta merchant hanya menampilkan potensi' : 'Belum ada file bank: peta hanya menampilkan potensi';
    var cat = rs.cat.filter(function (c) { return c.primary; });
    var missing = cat.filter(function (c) { return !loadedOf(rs, c.key); }).map(function (c) { return c.short || c.label; });
    var bad = rs.loaded.filter(function (x) { return x.c.primary && x.fresh.tone === 'bad'; })[0];
    var mid = rs.loaded.filter(function (x) { return x.c.primary && x.fresh.tone === 'mid'; })[0];
    if (bad) return (bad.c.short || bad.c.label) + ' kedaluwarsa (' + (bad.meta.asOf ? F().date(bad.meta.asOf) : 'tanpa tanggal') + '): impor file terbaru';
    if (missing.length) return rs.primaryLoaded + ' dari ' + rs.primaryN + ' file dimuat, ' + joinWords(missing) + ' belum diimpor';
    if (mid) return 'Semua ' + rs.primaryN + ' file dimuat · ' + (mid.c.short || mid.c.label) + ': ' + mid.fresh.word.toLowerCase();
    return 'Semua ' + rs.primaryN + ' file dimuat dan terbaru';
  }

  function renderLoaded() {
    if (!ui || !ui.loaded) return;
    var rs = realStatus(), x = ui.loadedX;
    x.title.textContent = loadedTitle(rs);
    x.sub.textContent = 'File yang dimuat · jumlah baris dan tanggal data · warna menurut umur data per ' + F().date(today()) + (demoOn() ? ' · disimpan terpisah saat Data contoh aktif' : '');
    clear(ui.loaded);
    if (demoOn()) {
      var off = el('button', { type: 'button', class: 'btn btn--secondary' }, [el('span', { text: 'Matikan Data contoh' })]);
      off.addEventListener('click', function () { MCD.demo.set(false); });
      ui.loaded.appendChild(el('div', { class: 'dp-callout dp-callout--demo' }, [icon('warn', 'icon--12'), el('p', { text: 'Data contoh aktif. Peta dan grafik menampilkan angka contoh.\nFile Anda di bawah disimpan terpisah tanpa diubah dan kembali saat Data contoh dimatikan.' }), off]));
    }
    var tbody = el('tbody');
    rs.cat.forEach(function (c) {
      var n = entryCount(rs.sets, c), m = entryMeta(rs.sets, c);
      if (!c.primary && !n) return;
      var f = freshness(n, m);
      var src = !n ? 'Belum diimpor' : (m.source === 'vault' ? 'Salinan terenkripsi' : ((m.file || 'File yang diimpor') + (m.sheet && m.sheet !== 'CSV' ? ' › ' + m.sheet : '')));
      var act = null;
      if (n && c.type === 'leads') {                     // the lead list goes through its switch (initials, Riwayat), never a plain Hapus
        act = el('button', { type: 'button', class: 'btn btn--ghost dp-ds__go', title: 'Atur daftar leads di Kebijakan & leads' }, [el('span', { text: 'Atur' }), icon('chev-r', 'icon--12')]);
        act.addEventListener('click', function () { goTab('policy'); });
      } else if (n) {
        act = el('button', { type: 'button', class: 'btn btn--ghost dp-remove', title: 'Hapus ' + c.label + ' dari dashboard' }, [svgIcon('trash', 'icon--12'), el('span', { text: 'Hapus' })]);
        act.addEventListener('click', function () { removeDataset(c, n); });
      }
      /* V8: the funding row says its position date and its merchants; the lead list shows the module's own total text */
      var fl = n && c.type === 'funding' ? fundLoaded() : null;
      var sub = fl ? fill(FUND_T.loaded, { tanggal: fl.asOf ? F().date(fl.asOf) : '—', n: nInt(fl.n) }) : null;
      var count = !n ? '—' : (c.type === 'leads' ? leadsTotalText(rs.sets[c.key].rows) : nInt(n));
      tbody.appendChild(el('tr', { class: (n ? 'is-in' : 'is-out') + (c.sub ? ' is-sub' : '') + (c.type ? ' dp-ds--' + c.type : '') }, [
        el('td', { class: 'dp-ds__cell' }, [el('span', { class: 'dp-ds__rule dp-ds__rule--' + f.tone, 'aria-hidden': 'true' }), el('span', { class: 'dp-ds__name', text: c.label, title: c.what }),
          sub ? el('span', { class: 'dp-ds__sub', text: sub }) : null]),
        el('td', { class: 'mono dp-ds__code', text: c.template ? c.code : (c.sub ? 'Sheet UREG + USAK' : (c.sheetText || c.code)) }),
        el('td', { class: 'dp-ds__src', text: src, title: n && m.importedAt ? 'Diimpor ' + F().dateTime(m.importedAt) : null }),
        el('td', { class: 'num', text: n && m.asOf ? F().date(m.asOf) : '—' }),
        el('td', { class: 'num', text: count }),
        el('td', null, [chip(f.tone, f.word)]),
        el('td', { class: 'dp-ds__act' }, [act])
      ]));
    });
    ui.loaded.appendChild(el('div', { class: 'tbl-wrap' }, [el('table', { class: 'tbl dp-tbl dp-ds' }, [
      el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: 'Jenis data' }), el('th', { scope: 'col', text: 'Sheet' }), el('th', { scope: 'col', text: 'Dari' }), el('th', { scope: 'col', class: 'num', text: 'Data per' }), el('th', { scope: 'col', class: 'num', text: 'Baris' }), el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col' }, [el('span', { class: 'sr-only', text: 'Tindakan' })])])]),
      tbody])]));
    ui.loaded.appendChild(freshLegend(false));
    var vk = vaultKeys().filter(function (k) { return /^MCD_|^config$/.test(k); });
    if (vk.length) ui.loaded.appendChild(el('p', { class: 'dp-fine', text: 'Salinan terenkripsi juga berisi: ' + vk.map(function (k) { return k === 'config' ? 'asumsi yang disimpan' : 'data acuan rahasia (' + k + ')'; }).join(', ') + '.' }));
  }

  /* --- Deep dive: the LVM file check ------------------------------------ */

  /** Creates or updates a chart in a stable host; recreated when the host changed. */
  function drawChart(key, host, kind, data, cfg) {
    var C = charts();
    if (!host) return null;
    if (!C) {
      clear(host);
      host.appendChild(el('p', { class: 'dp-fine dp-ck__na', text: 'Komponen grafik tidak termuat. Angkanya ada di judul dan catatan.' }));
      return null;
    }
    var c = CH[key];
    if (c && c.host !== host) { try { c.inst.destroy(); } catch (e) { /* ignore */ } c = null; }
    try {
      if (c) { c.inst.update(data, cfg); return c.inst; }
      clear(host);                                      // a message may sit where the chart goes
      var inst = C[kind](host, data, cfg);
      CH[key] = { host: host, inst: inst };
      return inst;
    } catch (err) {
      if (W.console) W.console.warn('[data] chart failed', key, err && err.message);
      return null;
    }
  }
  function dropChart(key) { var c = CH[key]; if (c) { try { c.inst.destroy(); } catch (e) { /* ignore */ } delete CH[key]; } }
  function dropCharts() { Object.keys(CH).forEach(dropChart); }

  function branchLabel(r) {
    var n = str(r.name).replace(/^(kcp|kc|kantor cabang( pembantu)?)\s+/i, '');
    if (!n) return r.code;
    n = n.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    return n.length > 18 ? n.slice(0, 17) + '…' : n;
  }

  function renderCheck() {
    if (!ui || !ui.check) return;
    var x = ui.checkX, m = checkModel(), C = charts();
    var demo = !!(m && m.demo);
    clear(ui.checkMsg);
    if (!m || !m.n) {
      ['ckPlace', 'ckLoc', 'ckKpi', 'ckEdc'].forEach(dropChart);
      ui.checkGrid.hidden = true;
      x.title.textContent = m && m.nEdc ? 'Impor laporan Livin’ Merchant untuk memeriksa posisi tokonya di peta' : 'Pemeriksaan file dimulai setelah laporan Livin’ Merchant diimpor';
      x.sub.textContent = 'Jumlah toko Livin’ Merchant · posisi setiap toko di peta 15 km, cara kelurahannya ditemukan dan kecocokan antarsheet';
      var b = el('button', { type: 'button', class: 'btn btn--secondary' }, [icon('upload', 'icon--12'), el('span', { text: 'Pilih file' })]);
      b.addEventListener('click', pickFiles);
      ui.checkMsg.appendChild(el('div', { class: 'dp-ck__empty' }, [
        el('p', { class: 'dp-p', text: 'Sebelum laporan diimpor, peta hanya menampilkan potensi.\nPotensi berarti setiap toko kelontong, restoran dan UMKM dalam 15 km.\nTidak ada yang ditandai “Belum ada di LVM” sebelum file masuk.' }), b]));
      x.src.textContent = 'Sumber: merchant publik, Overture Maps · batas kecamatan dan kelurahan, Kemendagri / BPS / OpenStreetMap';
      return;
    }
    ui.checkGrid.hidden = false;
    var srcFile = demo ? 'data contoh (ilustrasi)' : (metaOf('lvm').file ? metaOf('lvm').file + (metaOf('lvm').sheet ? ' › ' + metaOf('lvm').sheet : '') : 'salinan terenkripsi');
    var pois = W.MCD_SME_POIS, rel = pois && pois.meta && pois.meta.release ? ' ' + pois.meta.release : '';
    x.src.textContent = 'Sumber: ' + srcFile + (m.asOf && !demo ? ' (' + F().date(m.asOf) + ')' : '') + ' · merchant publik: Overture Maps' + rel + ' · batas wilayah: Kemendagri, BPS, OpenStreetMap';

    // 1 · where the stores land (status bar)
    if (m.place) {
      var P = m.place, onMap = P.matched + P.approx;
      x.title.textContent = pct(onMap / m.n) + ' dari ' + nInt(m.n) + ' toko ada di peta 15 km, ' +
        (P.matched ? pct(P.matched / m.n, P.matched / m.n < 0.1 ? 1 : 0) + ' cocok tepat dengan merchant publik' : 'tidak ada yang cocok tepat dengan merchant publik');
      ui.ckPlaceT.textContent = 'Posisi setiap toko di peta';
      drawChart('ckPlace', ui.ckPlace, 'statusBar', { acquired: P.matched, partly: P.approx, noData: P.off }, {
        label: 'Toko Livin’ Merchant menurut posisinya di peta', unit: 'toko', size: 'lg', demo: demo, tableToggle: 'focus',
        labels: { acquired: 'Hijau = titik tepat (cocok dengan merchant publik)', partly: 'Kuning = titik perkiraan di kelurahan atau kecamatannya', noData: 'Abu-abu = di luar 15 km atau di luar area peta' }
      });
      setLines(ui.ckPlaceN, (P.matched < P.approx ? 'Sebagian besar toko adalah usaha mikro yang tidak tercantum di peta publik. Toko itu ditempatkan di titik perkiraan di wilayahnya.\nHal ini wajar dan tidak menandakan kesalahan.\n'
        : 'Toko yang cocok berada di titik merchant publiknya. Toko lain ditempatkan di titik perkiraan di wilayahnya.\n') +
        (P.off ? nInt(P.outside) + ' toko ada di kecamatan pada peta, tetapi di luar 15 km. ' + nInt(P.noKec) + ' toko menyebut kecamatan di luar area peta (30 km) atau yang tidak dikenali.' : 'Semua toko ada dalam 15 km.'));
    } else {
      x.title.textContent = plural(m.n, 'toko', 'toko') + ' dimuat. ' + (!MCD.lvm ? 'Posisinya tampil setelah komponen Livin’ Merchant termuat'
        : (S.matchError ? 'Toko tidak dapat ditempatkan di peta. Muat ulang halaman, lalu coba lagi'
          : (S.matching || !m.R ? 'menempatkan toko di peta…' : 'merchant publik tidak tersedia untuk menempatkannya')));
      dropChart('ckPlace');
      clear(ui.ckPlace);
      ui.ckPlace.appendChild(el('p', { class: 'dp-fine', text: S.matching ? 'Mencocokkan toko dengan merchant publik…' : (MCD.lvm ? 'Merchant publik tidak tersedia, sehingga toko tidak dapat ditempatkan.' : 'Komponen Livin’ Merchant tidak termuat. Muat ulang halaman.') }));
      ui.ckPlaceT.textContent = 'Posisi setiap toko di peta';
      ui.ckPlaceN.textContent = '';
    }
    x.sub.textContent = 'Jumlah toko Livin’ Merchant · ' + (demo ? 'data contoh' : 'file per ' + (m.asOf ? F().date(m.asOf) : 'tanggal belum diketahui')) + ' · 15 km di sekitar Mabes TNI';

    // 2 · how the kelurahan was found (donut)
    var L = m.loc, located = L.exact + L.kel + L.kelpc, how = [];
    if (L.exact) how.push(pct(L.exact / m.n) + ' dari koordinat');
    if (L.kel) how.push(pct(L.kel / m.n) + ' dari alamat');
    if (L.kelpc) how.push(pct(L.kelpc / m.n) + ' dari kode pos');
    ui.ckLocT.textContent = located ? 'Kelurahan diketahui untuk ' + pct(located / m.n) + ' toko: ' + how.join(', ') : 'Tidak ada toko yang dapat ditempatkan di kelurahan';
    var slices = [
      { key: 'exact', label: 'Koordinat tepat', value: L.exact, color: 'chart-1' },
      { key: 'kel', label: 'Kelurahan dari alamat', value: L.kel, color: 'chart-2' },
      { key: 'kelpc', label: 'Kelurahan dari kode pos', value: L.kelpc, color: 'chart-3' },
      { key: 'kec', label: 'Kecamatan saja', value: L.kec, color: 'chart-4' },
      { key: 'none', label: 'Kecamatan tidak ditemukan', value: L.none, color: 'noData' }
    ].filter(function (s) { return s.value > 0; });
    drawChart('ckLoc', ui.ckLoc, 'donut', { slices: slices, centerLabel: 'Toko', centerValue: m.n }, {
      label: 'Toko menurut cara lokasinya ditemukan', valueLabel: 'Toko', categoryLabel: 'Lokasi ditemukan dari', demo: demo, selectable: false, tableToggle: 'focus'
    });
    setLines(ui.ckLocN, 'Laporan tidak memuat koordinat.\nKelurahan diambil dari teks alamat.\nJika alamat tidak menyebut kelurahan, kode pos yang digunakan.\nSyarat: paling sedikit 3 toko dengan kode pos sama harus sepakat.');

    // 3 · detail sheet vs UREG (combo)
    var kp = (m.kpi || []).filter(function (r) { return isNum(r.ureg) || m.byBranch[r.code]; });
    if (kp.length && C) {
      kp = kp.slice().sort(function (a, b) { return (b.home ? 1 : 0) - (a.home ? 1 : 0) || String(a.code).localeCompare(String(b.code)); });
      var det = kp.map(function (r) { return m.byBranch[r.code] || 0; }), ureg = kp.map(function (r) { return isNum(r.ureg) ? r.ureg : null; });
      var ratio = kp.map(function (r, i) { return isNum(ureg[i]) && ureg[i] > 0 ? det[i] / ureg[i] : null; });
      var agree = ratio.filter(function (v) { return v != null && Math.abs(v - 1) < 0.0005; }).length, known = ratio.filter(function (v) { return v != null; }).length;
      ui.ckKpiT.textContent = known ? 'Sheet Rincian sesuai dengan sheet UREG untuk ' + nInt(agree) + ' dari ' + plural(known, 'cabang', 'cabang') : 'Sheet UREG tidak memiliki angka untuk dibandingkan';
      drawChart('ckKpi', ui.ckKpi, 'combo', {
        categories: kp.map(function (r) { return { key: r.code, label: (r.home ? '★ ' : '') + branchLabel(r), sub: r.code }; }),
        bars: [{ key: 'detail', label: 'Toko di sheet Rincian', values: det, color: 'chart-3' }, { key: 'ureg', label: 'Pengguna terdaftar (sheet UREG)', values: ureg, color: 'chart-1' }],
        line: { key: 'agree', label: 'Rincian ÷ UREG', values: ratio, axis: 'right', format: 'pct0' },
        target: { value: 1, label: '100% = kedua sheet sesuai', axis: 'right' }
      }, { label: 'Toko per cabang: sheet Rincian dibanding sheet UREG', categoryLabel: 'Cabang', demo: false, tableToggle: 'focus' });
      ui.ckKpiN.textContent = '★ = KCP Cilangkap (' + HOME + '). ' + (known < kp.length ? nInt(kp.length - known) + ' cabang tidak memiliki angka UREG. ' : '') + 'Selisih berarti kedua sheet berasal dari tanggal berbeda. Gunakan laporan terbaru.';
      ui.ckKpiBox.hidden = false;
    } else {
      dropChart('ckKpi');
      ui.ckKpiBox.hidden = false;
      clear(ui.ckKpi);
      ui.ckKpiT.textContent = 'Sheet Rincian dibanding sheet UREG';
      ui.ckKpi.appendChild(el('p', { class: 'dp-fine dp-ck__na', text: demo ? 'Tanpa data contoh. Tampil setelah laporan Rev LVM beserta sheet UREG dan USAK diimpor.'
        : 'Tampil setelah laporan Rev LVM diimpor utuh dengan sheet UREG dan USAK. Satu sheet Rincian atau CSV tidak memiliki sheet KPI.' }));
      ui.ckKpiN.textContent = '';
    }

    // 4 · EDC terminals (status bar)
    if (m.nEdc && m.edc) {
      var E = m.edc;
      ui.ckEdcBox.hidden = false;
      ui.ckEdcT.textContent = nInt(E.matched) + ' dari ' + plural(E.merchants, 'EDC merchant', 'EDC merchants') + ' cocok dengan merchant publik (' + pct(E.merchants ? E.matched / E.merchants : 0) + ')';
      drawChart('ckEdc', ui.ckEdc, 'statusBar', { acquired: E.matched, partly: E.approx, noData: E.off }, {
        label: 'Merchant EDC Mandiri menurut posisinya di peta', unit: 'merchant', demo: isDemoSet('edc'), tableToggle: 'focus',
        labels: { acquired: 'Hijau = titik tepat', partly: 'Kuning = titik perkiraan', noData: 'Abu-abu = di luar 15 km' }
      });
    } else {
      dropChart('ckEdc');
      ui.ckEdcBox.hidden = true;
    }
  }

  /* --- Save encrypted copy ---------------------------------------------- */

  function renderSaveBits() {
    if (!ui || !ui.saveState) return;
    var rs = realStatus(), ss = saveState(rs);
    clear(ui.saveState);
    var msg = {
      demo: ['demo', 'Tidak tersedia saat Data contoh aktif. Matikan Data contoh dulu, karena salinan hanya berisi data nyata.'],
      empty: ['none', 'Belum ada data untuk disimpan. Impor file lebih dulu.'],
      downloaded: ['todo', 'Telah diunduh' + (S.savedAt ? ' pukul ' + F().time(S.savedAt) + ' WIB' : '') + ', belum dipasang. Ikuti langkah di bawah, lalu masuk kembali agar data terbaca.'],
      invault: ['ok', 'Tersimpan: data ini dibuka dari salinan terenkripsi dan belum berubah. Tidak perlu disimpan lagi.'],
      todo: ['todo', (rs.loaded.length ? fm0(rs.loaded.length) + ' jenis data' + (rs.rows ? ' (' + fm0(rs.rows) + ' baris)' : '') + ' akan disimpan. ' + (rs.extra && rs.extra.n ? 'Kunci Google dan ID tempat Google ikut disimpan. ' : '')
        : (rs.extra && rs.extra.n ? 'Kunci Google dan ID tempat Google akan disimpan. ' : '')) + (rs.pol && rs.pol.any ? POL_TRAVELS + ' ' : '') + (rs.fu && rs.fu.carry ? FU_TRAVELS + ' ' : '') +
        (S.savedAt ? 'Berubah sejak diunduh pukul ' + F().time(S.savedAt) + ' WIB.' : 'Belum disimpan sejak masuk.')],
      fu: ['none', 'Belum ada file yang diimpor. ' + (rs.fu && rs.fu.removals ? FU_REMOVALS + '.' : 'Simpan salinan terenkripsi agar daftar tindak lanjut terbawa ke komputer lain.')]
    }[ss];
    ui.saveState.className = 'dp-savest is-' + msg[0];
    ui.saveState.appendChild(el('span', { class: 'dp-savest__dot', 'aria-hidden': 'true' }));
    ui.saveState.appendChild(el('span', { text: msg[1] }));
    if (ui.install) { clear(ui.install); if (ss === 'downloaded') ui.install.appendChild(installSteps()); ui.install.hidden = ss !== 'downloaded'; }
    if (ui.saveX) ui.saveX.title.textContent = {
      demo: 'Penyimpanan tidak tersedia saat Data contoh aktif, agar angka contoh tidak masuk ke salinan',
      empty: 'Simpan salinan terenkripsi setelah impor agar data terbuka saat masuk berikutnya',
      downloaded: 'Salinan telah diunduh, tetapi belum dipasang di folder data',
      invault: 'Data telah tersimpan di salinan terenkripsi',
      todo: S.savedAt ? 'Perubahan sejak unduhan terakhir belum masuk ke salinan' : 'Data impor hanya ada sampai dashboard dikunci. Simpan salinan terenkripsi agar tidak hilang.',
      fu: rs.fu && rs.fu.removals ? FU_REMOVALS : 'Simpan salinan terenkripsi agar daftar tindak lanjut terbawa ke komputer lain'
    }[ss];
    if (ui.saveBtn) {
      var b = ui.saveBtn;
      b.querySelector('span').textContent = S.saving ? 'Menyimpan…' : 'Simpan salinan terenkripsi';
      if (!demoOn()) { b.disabled = ss === 'empty' || !!S.saving; }
      b.classList.toggle('btn--primary', ss === 'todo');
      b.classList.toggle('btn--secondary', ss !== 'todo');
    }
  }

  /** The real data folder when the page runs from file:// (C-05), else null. */
  function dataFolder() {
    try {
      if (W.location.protocol !== 'file:') return null;
      var p = decodeURIComponent(W.location.pathname || '').replace(/\/[^\/]*$/, '');
      if (/^\/[A-Za-z]:\//.test(p)) return p.slice(1).replace(/\//g, '\\') + '\\data';
      return p + '/data';
    } catch (e) { return null; }
  }
  function installSteps() {
    var folder = dataFolder();
    return el('ol', { class: 'dp-howto dp-install' }, [
      el('li', { text: 'Buka folder Unduhan.' }),
      el('li', { text: 'Salin file vault.js.' }),
      el('li', null, ['Tempel ke folder data di dalam folder dashboard, lalu pilih Ganti.', folder ? el('code', { class: 'dp-path', text: folder }) : null]),
      el('li', { text: 'Muat ulang halaman dan masuk kembali.' })
    ]);
  }
  function saveBlock() {
    var x = exhibit('dp-keep', 'Simpan salinan terenkripsi', 'Agar data yang diimpor terbuka lagi saat masuk berikutnya · AES-256-GCM, dengan kata sandi yang sedang digunakan', null,
      'Sumber: kata sandi saat masuk · kata sandi tidak pernah keluar dari browser ini dan tidak disimpan');
    var steps = el('ol', { class: 'dp-howto' }, [
      el('li', null, [el('strong', { text: 'Simpan. ' }), 'Tombol ini mengunduh ', el('code', { text: 'vault.js' }), ' baru berisi semua data nyata di dashboard, terenkripsi dengan kata sandi Anda saat masuk.']),
      el('li', null, [el('strong', { text: 'Pasang. ' }), 'Pindahkan file ke folder ', el('code', { text: 'data' }), ' di dalam folder dashboard dan ganti ', el('code', { text: 'data/vault.js' }), '. Browser tidak dapat melakukan langkah ini.']),
      el('li', null, [el('strong', { text: 'Masuk kembali. ' }), 'Muat ulang halaman dan masuk dengan kata sandi yang sama. Data terbuka tanpa impor ulang.'])
    ]);
    var btn = el('button', { type: 'button', class: 'btn btn--lg btn--primary dp-save-btn' }, [svgIcon('shield'), el('span', { text: 'Simpan salinan terenkripsi' })]);
    btn.addEventListener('click', saveCopy);
    ui.saveBtn = btn;
    var st = el('p', { class: 'dp-savest', role: 'status' });
    ui.saveState = st;
    ui.install = el('div', { class: 'dp-installwrap', hidden: true });
    var wipe = el('button', { type: 'button', class: 'btn btn--lg btn--danger' }, [svgIcon('trash'), el('span', { text: 'Hapus semua data dari dashboard' })]);
    wipe.addEventListener('click', removeAll);
    x.el.appendChild(steps);
    x.el.appendChild(el('div', { class: 'dp-actions' }, [btn]));
    x.el.appendChild(st);
    x.el.appendChild(ui.install);
    x.el.appendChild(el('ul', { class: 'dp-bullets' }, [
      el('li', { text: 'Hanya data nyata yang disimpan, yaitu file di tab File dimuat. Data contoh tidak pernah disimpan.\nPengaturan yang telah ada di salinan tetap dipertahankan.' }),
      el('li', { text: 'Kata sandi tetap sama. Setiap penyimpanan menggunakan IV acak yang baru.\nUntuk mengganti kata sandi, lihat bagian di bawah.' }),
      el('li', { text: 'Data merchant atau nasabah tidak pernah diekspor tanpa enkripsi. Jauhkan salinan lama vault.js dari folder bersama.' }),
      // v6 (V6_SPEC §7.5): the sealed follow-up lists go into the copy (payload.followups), only when MCD.seal can export them
      sealApi() && isFn(MCD.seal.vaultExport) ? el('li', { text: FU_TRAVELS }) : null,
      /* V8 §3.6, D61: the policy numbers, the lead switch and the visit plan go into the copy too */
      policyApi() ? el('li', { text: POL_TRAVELS }) : null,
      MCD.plan ? el('li', { text: 'Rencana kunjungan ikut tersimpan, terenkripsi dengan kata sandi dashboard.' }) : null
    ]));
    x.el.appendChild(el('div', { class: 'dp-sep' }));
    x.el.appendChild(el('h3', { class: 'dp-h3', text: 'Hapus data' }));
    x.el.appendChild(el('p', { class: 'dp-p', text: 'Menghapus semua file yang diimpor dan data dari salinan terenkripsi dari dashboard ini. Data peta publik tetap ada.\nTombol Kunci atau menutup tab memberi hasil yang sama.' }));
    x.el.appendChild(el('div', { class: 'dp-actions' }, [wipe]));
    x.el.appendChild(x.src);
    if (MCD.demo) MCD.demo.guard(btn);
    ui.saveX = x;
    return x.el;
  }

  /* --- Tindak lanjut di komputer ini (v6, V6_SPEC §7.5-7.6) ----------------- */

  /**
   * The card in Simpan & kata sandi: entries per list, the state word, the lines for an old password, a damaged list or
   * memory only, and the actions. Rebuilt in place (renderFollowups) on every MCD.seal event and after each action.
   */
  function followupsBlock() {
    var x = exhibit('dp-followups', 'Tindak lanjut di komputer ini', 'Daftar kerja staf untuk sekolah, kampus dan fasilitas kesehatan · hanya di browser ini', null,
      'Sumber: catatan kerja staf di browser ini · terenkripsi dengan kata sandi dashboard');
    ui.fuBody = el('div', { class: 'dp-fu' });
    x.el.appendChild(ui.fuBody);
    x.el.appendChild(x.src);
    ui.fuX = x;
    renderFollowups();
    return x.el;
  }
  function renderFollowups() {
    if (!ui || !ui.fuBody) return;
    var fu = followups(), body = ui.fuBody, keep = focusKey();
    clear(body);
    body.appendChild(el('p', { class: 'dp-fu__state' }, [chip(fu.tone, fu.word), el('span', { class: 'dp-fu__lead', text: fu.state === 'encrypted' ? 'Terenkripsi dengan kata sandi dashboard.' : (fu.state === 'old' ? FU_OLD : fu.reason) })]));
    body.appendChild(el('ul', { class: 'dp-fu__lists', 'aria-label': 'Entri tindak lanjut per daftar' }, fu.lists.map(function (l) {
      return el('li', { class: 'dp-fu__row' }, [el('span', { class: 'dp-fu__name', text: l.label }), el('span', { class: 'dp-fu__n', text: nInt(l.n) + ' entri' })]);
    })));
    if (fu.damaged) body.appendChild(el('div', { class: 'dp-callout dp-callout--bad' }, [icon('warn', 'icon--12'), el('p', { text: FU_DAMAGED })]));
    if (fu.old) {
      var openB = el('button', { type: 'button', class: 'btn btn--primary', 'data-fk': 'fu-open' }, [svgIcon('key', 'icon--12'), el('span', { text: 'Buka dengan kata sandi lama' })]);
      openB.addEventListener('click', function () { oldPwDialog(); });
      var dropB = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'fu-drop' }, [svgIcon('trash', 'icon--12'), el('span', { text: 'Hapus daftar lama' })]);
      dropB.addEventListener('click', dropOld);
      body.appendChild(el('div', { class: 'dp-fu__old' }, [
        el('p', { class: 'dp-p', text: 'Isi kata sandi sebelumnya untuk membuka daftar lama dan menggabungkannya dengan daftar sekarang.' }),
        el('div', { class: 'dp-actions' }, [openB, dropB])
      ]));
    }
    if (fu.sealed && isFn(MCD.seal.purge)) {
      var purgeB = el('button', { type: 'button', class: 'btn btn--danger', 'data-fk': 'fu-purge' }, [svgIcon('trash', 'icon--12'), el('span', { text: 'Hapus tindak lanjut dari komputer ini' })]);
      purgeB.addEventListener('click', purgeFollowups);
      body.appendChild(el('div', { class: 'dp-actions dp-fu__act' }, [purgeB]));
      body.appendChild(el('p', { class: 'dp-fine', text: 'Ekspor daftar dari tab Tindak lanjut di Sekolah, Kampus atau Kesehatan jika perlu salinan terbuka.' }));
    }
    restoreFocus(keep);
  }
  /** Every list that waits for its old password: [{d, st}] (the store must offer openOld / dropOld). */
  function oldStores(fnName) {
    return FU_STORES.filter(function (d) { return fuStatus(d) === 'old-password'; })
      .map(function (d) { return { d: d, st: fuStore(d.name) }; })
      .filter(function (x) { return x.st && isFn(x.st[fnName]); });
  }
  /**
   * Opens the old lists with one password: MCD.seal derives the old key from each blob's own salt and iterations,
   * merges and writes with the current key. Lists are tried one after another; the password is passed on and dropped.
   * → Promise<{ok, merged, none?}> (ok when at least one list opened).
   */
  function openOldAll(pw) {
    var Sl = sealApi();
    if (Sl && isFn(Sl.openOld)) {         // MCD.seal opens every waiting list at once and derives each old key only once
      var r0;
      try { r0 = Sl.openOld(pw); } catch (e) { r0 = null; }
      pw = null;
      return Promise.resolve(r0).then(function (v) { return { ok: !!(v && v.ok), merged: v && isNum(v.merged) ? v.merged : 0 }; }, function () { return { ok: false, merged: 0 }; });
    }
    var list = oldStores('openOld');
    if (!list.length) return Promise.resolve({ ok: false, merged: 0, none: true });
    var out = { ok: false, merged: 0 };
    return list.reduce(function (p, x) {
      return p.then(function () {
        var r;
        try { r = x.st.openOld(pw); } catch (e) { r = null; }
        return Promise.resolve(r).then(function (v) { if (v && v.ok) { out.ok = true; if (isNum(v.merged)) out.merged += v.merged; } }, noop);
      });
    }, Promise.resolve()).then(function () { pw = null; return out; });
  }
  function afterFollowups() { renderFollowups(); renderSaveBits(); if (!deep()) renderOverviewState(); }
  function dropOld() {
    if (!ctx) return;
    ctx.confirm({ title: 'Hapus daftar lama', danger: true, ok: 'Hapus daftar lama', cancel: 'Batal',
      body: 'Daftar tindak lanjut yang terenkripsi dengan kata sandi sebelumnya akan dihapus dari browser ini.\nDaftar sekarang tidak berubah.' })
      .then(function (yes) {
        if (!yes) return;
        var Sl = sealApi(), jobs;
        if (Sl && isFn(Sl.dropOld)) { try { jobs = [Promise.resolve(Sl.dropOld())]; } catch (e) { jobs = [Promise.reject(e)]; } }
        else jobs = oldStores('dropOld').map(function (x) { try { return Promise.resolve(x.st.dropOld()); } catch (e) { return Promise.reject(e); } });
        return Promise.all(jobs).then(function () { if (ctx) ctx.toast('Daftar lama dihapus dari browser ini.'); },
          function () { if (ctx) ctx.toast('Daftar lama tidak dapat dihapus. Muat ulang halaman, lalu coba lagi.', 'warn'); })
          .then(afterFollowups);
      });
  }
  function purgeFollowups() {
    var Sl = sealApi();
    if (!ctx || !Sl || !isFn(Sl.purge)) return;
    ctx.confirm({ title: 'Hapus tindak lanjut dari komputer ini', danger: true, ok: 'Hapus tindak lanjut', cancel: 'Batal',
      body: 'Semua daftar tindak lanjut SMA, kampus dan fasilitas kesehatan akan dihapus dari browser ini. Jika salinan terenkripsi di folder dashboard berisi daftar ini, daftar akan terbuka lagi saat masuk berikutnya.' })
      .then(function (yes) {
        if (!yes) return;
        var p;
        try { p = Promise.resolve(Sl.purge()); } catch (e) { p = Promise.reject(e); }
        return p.then(function () { if (ctx) ctx.toast('Daftar tindak lanjut dihapus dari komputer ini.'); },
          function () { if (ctx) ctx.toast('Daftar tindak lanjut tidak dapat dihapus. Muat ulang halaman, lalu coba lagi.', 'warn'); })
          .then(afterFollowups);
      });
  }

  /**
   * "Buka dengan kata sandi lama": one password field in a small dialog (the shell's confirm has no field). The value is
   * read once on submit, the field is emptied at once and the value goes only to MCD.seal (openOld); it is never stored,
   * logged or kept in this page's state. Esc, Batal, a click outside, a lock or leaving the section close the dialog.
   */
  var DLG = null;
  function closeOldDialog() {
    var d = DLG;
    if (!d) return;
    DLG = null;
    d.input.value = '';
    [d.scrim, d.box].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (d.back && d.back.isConnected && isFn(d.back.focus)) { d.back.focus(); return; }
    // the button that opened it is gone (the old list was opened): the card's heading takes the focus
    var t = DOC.getElementById('dp-followups-t');
    if (t && isFn(t.focus)) { t.setAttribute('tabindex', '-1'); t.focus(); }
  }
  function oldPwDialog() {
    closeOldDialog();
    var host = DOC.getElementById('overlay-root') || DOC.body;
    var input = el('input', { type: 'password', id: 'dp-oldpw', class: 'input dp-in dp-oldpw__in', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': 'dp-oldpw-msg' });
    var msg = el('p', { class: 'dp-field__err dp-oldpw__msg', id: 'dp-oldpw-msg', role: 'status', 'aria-live': 'polite' });
    var okB = el('button', { type: 'submit', class: 'btn btn--lg btn--primary' }, [el('span', { text: 'Buka daftar lama' })]);
    var noB = el('button', { type: 'button', class: 'btn btn--lg btn--secondary', text: 'Batal' });
    var scrim = el('div', { class: 'scrim dp-oldpw__scrim' });
    var box = el('form', { class: 'modal dp-oldpw', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dp-oldpw-t', 'aria-describedby': 'dp-oldpw-b', novalidate: true }, [
      el('h2', { class: 'modal__title', id: 'dp-oldpw-t', text: 'Buka dengan kata sandi lama' }),
      el('p', { class: 'modal__body', id: 'dp-oldpw-b', text: FU_OLD + '\nIsi kata sandi itu untuk membuka dan menggabungkannya dengan daftar sekarang.' }),
      el('div', { class: 'dp-field dp-oldpw__field' }, [el('label', { class: 'dp-field__label', for: 'dp-oldpw', text: 'Kata sandi lama' }), input, msg]),
      el('div', { class: 'modal__actions' }, [noB, okB])
    ]);
    var busy = false;
    function setMsg(t) { msg.textContent = t || ''; msg.hidden = !t; input.setAttribute('aria-invalid', t ? 'true' : 'false'); }
    setMsg('');
    box.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      var pw = input.value;
      input.value = '';                                     // cleared at once (V6_SPEC §7.6)
      if (!pw) { setMsg('Isi kata sandi lama.'); input.focus(); return; }
      busy = true; okB.disabled = true; noB.disabled = true; setMsg('');
      okB.firstChild.textContent = 'Membuka daftar lama…';
      openOldAll(pw).then(function (r) {
        if (DLG && DLG.box !== box) return;                 // closed meanwhile (lock, section change)
        busy = false; okB.disabled = false; noB.disabled = false; okB.firstChild.textContent = 'Buka daftar lama';
        if (r && r.ok) {
          afterFollowups();                                 // first the card (the recovery buttons go), then the focus
          closeOldDialog();
          if (ctx) ctx.toast('Daftar lama dibuka dan digabung dengan daftar sekarang.');
          return;
        }
        setMsg('Kata sandi lama tidak cocok. Coba lagi.');
        if (DLG) input.focus();
      });
      pw = null;
    });
    noB.addEventListener('click', closeOldDialog);
    scrim.addEventListener('click', function () { if (!busy) closeOldDialog(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!busy) closeOldDialog(); return; }
      if (e.key !== 'Tab') return;
      var f = [input, noB, okB].filter(function (n) { return !n.disabled; });
      var i = f.indexOf(DOC.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    DLG = { scrim: scrim, box: box, input: input, back: DOC.activeElement };
    host.appendChild(scrim);
    host.appendChild(box);
    input.focus();
    return DLG;
  }
  /** Lock (gate.js dispatches mcd:gate-locking before the reload): the dialog and its field go at once. */
  function onLocking() { closeOldDialog(); fundReset(); FS.after = false; S.logShown = 0; S.logOpen = false; }
  /** MCD.seal events (state, a list opened, merged, purged): the card and the save bits follow. */
  function onSeal() { if (ctx && ui) afterFollowups(); }

  function passwordBlock() {
    var x = exhibit('dp-password', 'Ganti kata sandi dengan satu perintah. Isi data tetap sama.', 'Dilakukan pengelola di komputer yang menyimpan folder dashboard · tools/make-vault.mjs · Node 24 atau lebih baru', null,
      'Sumber: tools/make-vault.mjs (--rekey) · BUILD_SPEC_AUTH_GATE.md §7.2');
    var cmd = el('code', { class: 'dp-cmd__code', text: REKEY });
    var copyB = el('button', { type: 'button', class: 'btn btn--secondary dp-cmd__copy' }, [icon('copy', 'icon--12'), el('span', { text: 'Salin' })]);
    copyB.addEventListener('click', function () {
      copyText(REKEY).then(function () { ctx.toast('Perintah disalin'); }, function () { ctx.toast('Perintah tidak dapat disalin. Pilih teksnya, lalu salin manual.', 'warn'); });
    });
    var pwSteps = el('ol', { class: 'dp-howto' }, [
      el('li', { text: 'Buka terminal di folder dashboard.' }),
      el('li', null, ['Jalankan perintah di bawah. Perintah ini meminta kata sandi saat ini, lalu kata sandi baru dua kali. Isi data di dalam file tetap sama.',
        el('div', { class: 'dp-cmd' }, [svgIcon('terminal', 'icon--12'), cmd, copyB])]),
      el('li', { text: 'Muat ulang dashboard dan masuk dengan kata sandi baru.' }),
      el('li', { text: 'Sampaikan kata sandi baru secara langsung atau melalui telepon, terpisah dari file.\nHapus salinan lama vault.js, karena masih terbuka dengan kata sandi lama.' })
    ]);
    var pwTip = el('div', { class: 'dp-callout dp-callout--tip' }, [svgIcon('key', 'icon--12'), el('p', null, [el('strong', { text: 'Gunakan frasa sandi dari 5 kata acak atau lebih. ' }),
      'Atau paling sedikit 14 karakter acak. Kata sandi pendek atau mudah ditebak akan ditolak, misalnya satu kata ditambah nomor telepon.\nGanti kata sandi jika anggota tim yang mengetahuinya keluar, dan paling sedikit sekali setahun.'])]);
    /* v5 (item 39a): two folding sections with MCD.windows.fold, else the v4 layout */
    if (winApi('fold')) {
      x.el.appendChild(blk('dp-pw__steps', 'Langkah mengganti kata sandi', [pwSteps], { key: 'steps', preview: '4 langkah, satu perintah di terminal' }));
      x.el.appendChild(blk('dp-pw__tip', 'Kata sandi yang kuat', [pwTip], { key: 'tip', preview: '5 kata acak atau lebih' }));
      x.el.appendChild(x.src);
      foldIn(x.el, 'dp-password');
      return x.el;
    }
    x.el.appendChild(pwSteps);
    x.el.appendChild(pwTip);
    x.el.appendChild(x.src);
    return x.el;
  }

  /* --- Assumptions -------------------------------------------------------- */

  function assumeBlock() {
    var x = exhibit('dp-assume', 'Nilai yang belum ada di data adalah asumsi dan dapat diubah di sini', 'Digunakan di perhitungan bagian lain · disimpan di browser ini, tanpa data nasabah', null,
      'Sumber: asumsi cabang · nilai bawaan dashboard · sementara sampai cabang mengonfirmasinya');
    var form = el('form', { class: 'dp-form', novalidate: true });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); saveAssumptions(); });
    ui.assumeForm = form;
    x.el.appendChild(form);
    x.el.appendChild(x.src);
    fillAssumptions();
    return x.el;
  }

  function fieldRow(id, label, input, hint, tag, unit) {
    return el('div', { class: 'dp-field' }, [
      el('div', { class: 'dp-field__top' }, [el('label', { class: 'dp-field__label', for: id, text: label }), tag]),
      el('div', { class: 'dp-field__in' }, [input, unit ? el('span', { class: 'dp-field__unit', text: unit }) : null]),
      hint ? el('p', { class: 'dp-field__hint', id: id + '-h', text: hint }) : null,
      el('p', { class: 'dp-field__err', id: id + '-e', role: 'alert', hidden: true })
    ]);
  }
  /** A number field (M16): type text, inputmode decimal (a comma on every phone keyboard) or numeric for whole numbers. */
  function numInput(id, value, mode) {
    return el('input', { class: 'input input--num dp-in', id: id, name: id, type: 'text', inputmode: mode || 'decimal', autocomplete: 'off', attrs: { spellcheck: 'false' }, value: value, 'aria-describedby': id + '-h ' + id + '-e' });
  }
  function parseNumber(s) {
    var t = str(s).replace(/%$/, '').trim();
    if (!t) return null;
    var v = MCD.importer && MCD.importer.parse && MCD.importer.parse.num ? MCD.importer.parse.num(t) : Number(t);
    return isNum(v) ? v : null;
  }

  function fillAssumptions() {
    var form = ui && ui.assumeForm;
    if (!form || !MCD.config) return;
    clear(form);
    var c = MCD.config, d = c.defaults ? c.defaults() : {};
    var vaultOwned = function (k) { return !!(c.isVaultOwned && c.isVaultOwned(k)); };
    var tagFor = function (k, same, placeholder) {
      if (vaultOwned(k)) return el('span', { class: 'tag dp-tag', text: 'Dari salinan terenkripsi' });
      if (same) return placeholder ? el('span', { class: 'tag dp-tag dp-tag--ph', text: 'Sementara' }) : tagAssume('Asumsi');
      return el('span', { class: 'tag tag--gold dp-tag', text: 'Diisi Anda' });
    };

    /* v5 (item 39a): each fieldset is a folding section with MCD.windows.fold (legend = its heading) */
    var fb = winApi('fold') ? ' dd-blk' : '', ft = fb ? ' dd-blk__t' : '';
    // KPR affordability
    var g1 = el('fieldset', { class: 'dp-fs' + fb, 'data-fold': fb ? 'kpr' : null }, [el('legend', { class: 'dp-fs__t' + ft, text: 'Keterjangkauan KPR' })]);
    var grid1 = el('div', { class: 'dp-fs__grid' });
    g1.appendChild(grid1);
    var dsrPct = Math.round(c.dsrCap * 1000) / 10;
    grid1.appendChild(fieldRow('as-dsr', 'Batas porsi penghasilan untuk angsuran (DSR)', numInput('as-dsr', F().num(dsrPct, dsrPct % 1 ? 1 : 0)),
      'Batas internal bank tidak dipublikasikan. Simulator KPR menggunakan nilai ini sebagai awal. Bawaan ' + pct(d.dsrCap || 0.4) + '.',
      tagFor('dsrCap', c.dsrCap === d.dsrCap), '%'));
    var tmt = el('input', { type: 'checkbox', class: 'dp-check', id: 'as-tmt', checked: c.retire && c.retire.tmtNextMonth ? true : null });
    g1.appendChild(el('div', { class: 'dp-field dp-field--check' }, [
      el('div', { class: 'dp-field__top' }, [el('label', { class: 'dp-field__label dp-field__label--check', for: 'as-tmt' }, [tmt, el('span', { text: 'Pensiun mulai tanggal 1 bulan berikutnya setelah ulang tahun (TMT)' })]),
        tagFor('retire', !!(c.retire && d.retire && c.retire.tmtNextMonth === d.retire.tmtNextMonth))]),
      el('p', { class: 'dp-field__hint', text: 'Untuk tenor KPR terpanjang sebelum pensiun (batas usia pensiun menurut pangkat, UU 3/2025).' })
    ]));
    form.appendChild(g1);

    // Locations
    var g3 = el('fieldset', { class: 'dp-fs' + fb, 'data-fold': fb ? 'lokasi' : null }, [el('legend', { class: 'dp-fs__t' + ft, text: 'Perkiraan lokasi' })]);
    var grid3 = el('div', { class: 'dp-fs__grid' });
    grid3.appendChild(fieldRow('as-kel', 'Radius perkiraan kelurahan', numInput('as-kel', F().num(c.geocode.kelurahanJitterM, 0), 'numeric'),
      'Data yang hanya memiliki kelurahan disebar dalam jarak ini dari titik tengahnya. Bawaan ' + (d.geocode ? d.geocode.kelurahanJitterM : 350) + ' m.', tagFor('geocode', c.geocode.kelurahanJitterM === (d.geocode || {}).kelurahanJitterM), 'm'));
    grid3.appendChild(fieldRow('as-blat', 'Titik cabang, lintang', numInput('as-blat', c.branch.lat.toFixed(5)),
      'Titik cabang yang diatur pengguna. Periksa di lokasi. Jarak dari cabang diukur dari titik ini.', tagFor('cabang', c.branch.lat === (d.branch || {}).lat && c.branch.lon === (d.branch || {}).lon)));
    grid3.appendChild(fieldRow('as-blon', 'Titik cabang, bujur', numInput('as-blon', c.branch.lon.toFixed(5)), null, el('span')));
    /* item 27: "jam sibuk" factor of MCD.travel (editable assumption, kept in this browser), only when the travel data is loaded */
    var tv = travelPeak();
    if (tv) grid3.appendChild(fieldRow('as-peak', 'Waktu tempuh saat jam sibuk', numInput('as-peak', F().num(tv.f, 1)),
      'Waktu tempuh dihitung untuk lalu lintas normal. Faktor ini mengalikan waktu tempuh saat jam sibuk. Bawaan ' + F().num(peakDefault(), 1) + '×.',
      savedPeak() != null ? el('span', { class: 'tag tag--gold dp-tag', text: 'Diisi Anda' }) : tagAssume('Asumsi'), '×'));
    g3.appendChild(grid3);
    form.appendChild(g3);

    // Read-only rules that shape the colours (said in the legends)
    var rules = el('fieldset', { class: 'dp-fs dp-fs--ro' + fb, 'data-fold': fb ? 'aturan' : null }, [el('legend', { class: 'dp-fs__t' + ft, text: 'Aturan di balik warna (hanya baca)' })]);
    var lc = MCD.lvm && MCD.lvm.config ? MCD.lvm.config() : null;
    var items = [
      ['Warna file', 'Hijau jika data paling lama ' + FRESH.ok + ' hari, kuning sampai ' + FRESH.mid + ' hari, merah setelah itu. Ditetapkan untuk laporan bulanan.'],
      ['Area merchant', 'Merchant publik dalam ' + ((c.merchantRadiusKm) || 15) + ' km dari titik tengah Mabes TNI.']
    ];
    if (lc) items.push(['Pencocokan merchant', 'Toko cocok dengan merchant publik jika kemiripan namanya ' + F().num(lc.accept, 2) + ' atau lebih.\nKemiripan itu juga harus unggul ' + F().num(lc.margin, 2) + ' dari kandidat berikutnya. Aturan lengkap ada di dokumentasi teknis dashboard.']);
    rules.appendChild(el('dl', { class: 'dp-ro' }, items.map(function (i) {
      return el('div', { class: 'dp-ro__i' }, [el('dt', null, [el('span', { text: i[0] }), tagAssume('Asumsi')]), el('dd', { text: i[1] })]);
    })));
    form.appendChild(rules);

    var save = el('button', { type: 'submit', class: 'btn btn--lg btn--primary' }, [icon('check'), el('span', { text: 'Simpan asumsi' })]);
    var reset = el('button', { type: 'button', class: 'btn btn--lg btn--secondary' }, [icon('reset'), el('span', { text: 'Kembalikan nilai bawaan' })]);
    reset.addEventListener('click', function () {
      ctx.confirm({ title: 'Kembalikan asumsi bawaan', body: 'Semua nilai di formulir ini kembali ke nilai bawaan dashboard.', ok: 'Kembalikan nilai bawaan', cancel: 'Batal' })
        .then(function (yes) { if (!yes) return; c.resetSettings(); resetPeak(); fillAssumptions(); ctx.toast('Asumsi bawaan telah dikembalikan'); });
    });
    form.appendChild(el('div', { class: 'dp-actions dp-form__act' }, [save, reset]));
    /* a repeated hint (item 39e): once per browser with MCD.windows.hint; the same facts stay in Privasi › Disimpan di browser ini */
    var kept = hintOnce('dp-assume-local', el('p', { class: 'dp-fine', text: 'Disimpan di browser ini: batas DSR, aturan pensiun, perkiraan lokasi, titik cabang dan faktor jam sibuk.\nTidak ada data nasabah yang disimpan.\nNilai dari salinan terenkripsi hanya berlaku sampai dashboard dikunci.' }));
    if (kept) form.appendChild(kept);
    if (fb) foldIn(form, 'dp-assume');
  }

  /* item 27: the "jam sibuk" factor is an Asumsi of this browser (localStorage PEAK_KEY = {v: 1, f}, a number
     only). MCD.travel keeps it in memory, so it is applied again at every page load (section-data.js loads
     before the shell boots, and a lock reloads the page). A change is announced with the window event
     'mcd:distance' (detail.changed 'factor'), so every list and drawer repaints its jam sibuk minutes. */
  var PEAK_KEY = 'mcd.travel.peak.v1';
  function peakStore() { return MCD.util && MCD.util.storage ? MCD.util.storage : null; }
  function peakDefault() {
    try { var m = MCD.travel && typeof MCD.travel.meta === 'function' ? MCD.travel.meta() : null, d = m && m.peakFactor && +m.peakFactor.default; return isNum(d) && d >= 1 && d <= 3 ? d : 1.3; } catch (e) { return 1.3; }
  }
  /** The factor saved in this browser, or null (none saved, unreadable or out of range). */
  function savedPeak() {
    try { var s = peakStore(), v = s ? s.get(PEAK_KEY, null) : null, f = v && v.v === 1 ? +v.f : NaN; return isNum(f) && f >= 1 && f <= 3 ? f : null; } catch (e) { return null; }
  }
  function applySavedPeak() {
    var T = MCD.travel, f = savedPeak();
    if (f == null || !T || typeof T.setPeakFactor !== 'function') return false;
    try { return T.setPeakFactor(f) !== false; } catch (e) { return false; }
  }
  function announcePeak() {
    var D = MCD.distance, name = (D && D.EVENT) || 'mcd:distance';
    var detail = { peak: !!(D && typeof D.peakOn === 'function' && D.peakOn()), noToll: !!(D && typeof D.noTollOn === 'function' && D.noTollOn()), changed: 'factor' };
    try {
      var ev = null;
      if (typeof W.CustomEvent === 'function') ev = new W.CustomEvent(name, { detail: detail });
      else if (DOC && typeof DOC.createEvent === 'function') { ev = DOC.createEvent('CustomEvent'); ev.initCustomEvent(name, false, false, detail); }
      if (ev) W.dispatchEvent(ev);
    } catch (e) { /* the factor changed even if a listener failed */ }
    if (ctx && typeof ctx.requestRender === 'function') ctx.requestRender(['settings']);
  }
  /** Sets, saves and announces the factor. → {ok, persisted}. The default value is not stored (later defaults still apply). */
  function setPeak(f) {
    var T = MCD.travel;
    if (!T || typeof T.setPeakFactor !== 'function') return { ok: false, persisted: false };
    var isDefault = Math.abs(f - peakDefault()) < 1e-9, ok = false, persisted = false;
    try { ok = T.setPeakFactor(isDefault ? null : f) !== false; } catch (e) { ok = false; }
    if (!ok) return { ok: false, persisted: false };
    var s = peakStore();
    try {
      if (isDefault) { if (s) s.remove(PEAK_KEY); persisted = !!s; }
      else persisted = !!(s && s.set(PEAK_KEY, { v: 1, f: f }));
    } catch (e) { persisted = false; }
    announcePeak();
    return { ok: true, persisted: persisted };
  }
  function resetPeak() {
    var had = savedPeak() != null, s = peakStore();
    try { if (s) s.remove(PEAK_KEY); } catch (e) { /* nothing saved */ }
    var T = MCD.travel, changed = false;
    if (T && typeof T.setPeakFactor === 'function' && typeof T.peakFactor === 'function') {
      try { var before = T.peakFactor(); T.setPeakFactor(null); changed = had || T.peakFactor() !== before; } catch (e) { /* keeps its value */ }
    }
    if (changed) announcePeak();
  }
  applySavedPeak();

  /** {f} = the current "jam sibuk" factor when MCD.travel can change it, else null. */
  function travelPeak() {
    var T = MCD.travel;
    if (!T || typeof T.peakFactor !== 'function' || typeof T.setPeakFactor !== 'function') return null;
    var f = T.peakFactor();
    return isNum(f) ? { f: f } : null;
  }
  function fieldErr(id, msg) {
    var e = DOC.getElementById(id + '-e'), i = DOC.getElementById(id);
    if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    if (i) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
    return !msg;
  }
  function saveAssumptions() {
    var c = MCD.config, val = function (id) { var n = DOC.getElementById(id); return n ? n.value : ''; };
    var ok = true, patch = {};
    var dsr = parseNumber(val('as-dsr'));
    ok = fieldErr('as-dsr', isNum(dsr) && dsr >= 5 && dsr <= 95 ? '' : 'Isi persentase antara 5 dan 95.') && ok;
    if (isNum(dsr)) patch.dsrCap = Math.round(dsr * 10) / 1000;
    var tmt = DOC.getElementById('as-tmt');
    patch.retire = { tmtNextMonth: !!(tmt && tmt.checked) };
    var kel = parseNumber(val('as-kel'));
    ok = fieldErr('as-kel', isNum(kel) && kel >= 0 && kel <= 5000 ? '' : 'Isi meter antara 0 dan 5.000.') && ok;
    if (isNum(kel)) patch.geocode = { kelurahanJitterM: Math.round(kel) };
    var lat = parseNumber(val('as-blat')), lon = parseNumber(val('as-blon'));
    var latOk = isNum(lat) && lat >= -6.62 && lat <= -6.02, lonOk = isNum(lon) && lon >= 106.55 && lon <= 107.25;
    ok = fieldErr('as-blat', latOk ? '' : 'Isi lintang antara −6,62 dan −6,02 (Jabodetabek).') && ok;
    ok = fieldErr('as-blon', lonOk ? '' : 'Isi bujur antara 106,55 dan 107,25 (Jabodetabek).') && ok;
    if (latOk && lonOk) patch.branch = { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 };
    var tv = travelPeak(), peak = tv ? parseNumber(val('as-peak')) : null, peakChanged = false;
    if (tv) {
      ok = fieldErr('as-peak', isNum(peak) && peak >= 1 && peak <= 3 ? '' : 'Isi faktor antara 1 dan 3.') && ok;
      peakChanged = ok && isNum(peak) && Math.abs(peak - tv.f) > 1e-9;
    }
    if (!ok) { ctx.toast('Beberapa nilai perlu diperbaiki sebelum disimpan.', 'warn'); var bad = ui.assumeForm.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    // Only what changed is saved, so later default updates still reach untouched fields.
    var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
    var cur = { dsrCap: c.dsrCap, retire: { tmtNextMonth: !!(c.retire && c.retire.tmtNextMonth) }, geocode: { kelurahanJitterM: c.geocode.kelurahanJitterM },
      branch: { lat: c.branch.lat, lon: c.branch.lon } };
    Object.keys(patch).forEach(function (k) { if (same(patch[k], cur[k])) delete patch[k]; });
    var pk = peakChanged ? setPeak(peak) : null;
    var PEAK_MEM = 'Faktor jam sibuk berlaku sampai halaman dimuat ulang. Browser ini tidak dapat menyimpannya.';
    if (pk && !pk.ok) { fieldErr('as-peak', 'Faktor jam sibuk tidak dapat diubah. Muat ulang halaman, lalu coba lagi.'); }
    if (!Object.keys(patch).length) {
      if (pk && pk.ok) { fillAssumptions(); ctx.toast(pk.persisted ? 'Asumsi disimpan' : PEAK_MEM, pk.persisted ? undefined : 'warn'); }
      else if (!pk) ctx.toast('Tidak ada yang berubah');
      return;
    }
    var res = c.saveSettings(patch) || { memoryOnly: [] };
    fillAssumptions();
    if (res.memoryOnly && res.memoryOnly.length) ctx.toast('Asumsi disimpan. Nilai dari salinan terenkripsi hanya berlaku sampai dashboard dikunci.');
    else if (pk && pk.ok && !pk.persisted) ctx.toast(PEAK_MEM, 'warn');
    else ctx.toast('Asumsi disimpan');
  }

  /* --- Cek rating Google (COPY_STYLE_EN items 32-33) ---------------------- */

  // The branch pastes its OWN Places API key here. MCD.places keeps it only in the dataset of the encrypted
  // copy (saved with "Simpan salinan terenkripsi"), never in localStorage, the URL or the console, and the
  // key is never shown in full again after saving (only its last 4 characters). docs/GOOGLE_PLACES.md.
  var GLINK = {
    console: 'https://console.cloud.google.com/apis/credentials',
    policies: 'https://developers.google.com/maps/documentation/places/web-service/policies',
    pricing: 'https://developers.google.com/maps/billing-and-pricing/pricing'
  };
  function placesMod() { var P = MCD.places; return P && typeof P.setKey === 'function' && typeof P.keyState === 'function' ? P : null; }
  function extLink(href, text) {
    return el('a', { class: 'dp-link dp-gk__ext', href: href, target: '_blank', rel: 'noopener noreferrer', title: 'Membuka halaman Google di tab baru. Perlu internet.' },
      [el('span', { text: text }), icon('external', 'icon--12')]);
  }

  function googleBlock() {
    var x = exhibit('dp-google', 'Cek rating Google (opsional)', 'Mati sampai kunci Google cabang diisi · hasil hanya tampil saat diperiksa dan tidak disimpan', null,
      'Sumber: Google Maps Platform, Places API (New) · kebijakan Places API dan ketentuan layanan Google Maps Platform');
    var g = ui.gk = {};
    var what = el('ul', { class: 'dp-bullets dp-gk__what' }, [
      'Memeriksa rating dan jumlah ulasan Google untuk kandidat EDC teratas.',
      'Hasil hanya tampil saat diperiksa, di daftar tanpa peta, dengan tanda Google Maps.',
      'Rating dan ulasan tidak pernah disimpan. Yang disimpan hanya ID tempat Google, di salinan terenkripsi.',
      '1.000 cek per bulan tanpa biaya. Cek berikutnya ditagih Google ke akun penagihan pemilik kunci.',
      'Hanya nama usaha dari peta publik yang dikirim ke Google. Data dari file bank tidak pernah dikirim.'
    ].map(function (t) { return el('li', { text: t }); }));
    /* v5 (item 39a): with MCD.windows.fold the card folds into three sections (the key first, open folds remembered);
       without it the v4 order stays: what it does, the key, then "Cara membuat dan membatasi kunci" as <details> */
    var foldable = !!winApi('fold'), keyKids = [];
    if (!foldable) x.el.appendChild(what);

    g.state = el('div', { class: 'dp-savest dp-gk__state', role: 'status' });
    g.where = el('div', { class: 'dp-gk__where' });
    keyKids.push(g.state, g.where);

    var input = el('input', { class: 'input dp-in dp-gk__in', id: 'gk-key', name: 'gk-key', type: 'password', autocomplete: 'off', spellcheck: 'false',
      autocapitalize: 'off', 'data-lpignore': 'true', 'data-1p-ignore': 'true', placeholder: 'Tempel kunci di sini', 'aria-describedby': 'gk-key-h gk-key-e' });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); saveGoogleKey(); } });
    input.addEventListener('input', function () { fieldErr('gk-key', ''); });
    g.input = input;
    g.save = el('button', { type: 'button', class: 'btn btn--lg btn--primary dp-gk__save' }, [svgIcon('key'), el('span', { text: 'Simpan kunci' })]);
    g.save.addEventListener('click', saveGoogleKey);
    g.del = el('button', { type: 'button', class: 'btn btn--lg btn--secondary dp-gk__del', hidden: true }, [svgIcon('trash'), el('span', { text: 'Hapus kunci' })]);
    g.del.addEventListener('click', deleteGoogleKey);
    g.test = el('button', { type: 'button', class: 'btn btn--lg btn--secondary dp-gk__test', hidden: true }, [icon('check'), el('span', { text: 'Uji kunci (1 cek)' })]);
    g.test.addEventListener('click', testGoogleKey);
    var row = fieldRow('gk-key', 'Kunci Google (Places API)', input,
      'Kunci hanya disimpan di salinan terenkripsi. Setelah disimpan, kunci tidak tampil lengkap lagi.', el('span', { class: 'tag dp-tag', text: 'Opsional' }));
    row.classList.add('dp-gk__field');
    keyKids.push(el('div', { class: 'dp-gk__form' }, [row, el('div', { class: 'dp-actions dp-gk__act' }, [g.save, g.test, g.del])]));
    g.result = el('p', { class: 'dp-gk__result', role: 'status', hidden: true });
    keyKids.push(g.result);

    g.usage = el('div', { class: 'dp-gk__usage' });
    keyKids.push(g.usage);
    if (foldable) x.el.appendChild(blk('dp-gk__keyblk', 'Kunci Google', keyKids, { key: 'key' }));
    else keyKids.forEach(function (n) { x.el.appendChild(n); });
    if (foldable) x.el.appendChild(blk('dp-gk__whatblk', 'Yang diperiksa dan yang disimpan', [what], { key: 'what', preview: 'rating tidak disimpan, nama usaha publik saja' }));

    var steps = [
      'Buka Google Cloud Console, lalu pilih proyek milik cabang. Pastikan akun penagihan aktif.',
      'Aktifkan Places API (New) di menu APIs & Services › Library.',
      'Untuk membuat kunci, buka APIs & Services › Credentials › Create credentials › API key.',
      'Batasi aplikasi dengan HTTP referrers (web sites). Tambahkan http://127.0.0.1:5173/* dan http://localhost:5173/*.',
      'Batasi API dengan Restrict key, lalu centang Places API (New) saja.',
      'Turunkan batas permintaan per hari di Places API (New) › Quotas, misalnya menjadi 100.',
      'Salin kunci, tempel di kolom di atas, lalu tekan Simpan kunci. Setelah itu, simpan salinan terenkripsi.'
    ];
    var howKids = [
      el('ol', { class: 'dp-howto dp-gk__steps' }, steps.map(function (t) { return el('li', { text: t }); })),
      el('ul', { class: 'dp-bullets' }, [
        el('li', { text: 'Kunci dengan pembatasan alamat tidak berfungsi dari file://. Buka dashboard melalui server lokal.' }),
        el('li', { text: 'Jangan kirim kunci melalui chat atau e-mail. Jangan simpan kunci di file lain.' }),
        el('li', { text: 'Jumlah cek yang ditagih Google ada di Google Cloud › Places API (New) › Metrics.' })
      ]),
      el('p', { class: 'dp-gk__links' }, [extLink(GLINK.console, 'Buka Google Cloud Console'), extLink(GLINK.policies, 'Kebijakan Places API'), extLink(GLINK.pricing, 'Harga Google Maps Platform')])
    ];
    if (foldable) x.el.appendChild(blk('dp-gk__how', 'Cara membuat dan membatasi kunci', howKids, { key: 'how', preview: '7 langkah di Google Cloud Console' }));
    else x.el.appendChild(el('details', { class: 'dp-gk__how' }, [el('summary', { class: 'dp-gk__sum', text: 'Cara membuat dan membatasi kunci' })].concat(howKids)));
    x.el.appendChild(x.src);
    if (foldable) foldIn(x.el, 'dp-google');
    if (!placesMod()) { input.disabled = true; g.save.disabled = true; }
    refreshGoogle();
    return x.el;
  }

  function gkLine(node, text, cls) { var p = el('p', { class: cls || 'dp-fine' }); setLines(p, text); node.appendChild(p); return p; }

  function refreshGoogle() {
    var g = ui && ui.gk;
    if (!g || !g.state) return;
    var P = placesMod();
    clear(g.state); clear(g.where); clear(g.usage);
    if (!P) {
      g.state.className = 'dp-savest dp-gk__state is-none';
      g.state.appendChild(el('span', { class: 'dp-savest__dot', 'aria-hidden': 'true' }));
      gkLine(g.state, 'Fitur ini belum termuat. Muat ulang halaman.\nPengelola: periksa assets/js/google-places.js di index.html.', 'dp-gk__msg');
      return;
    }
    var ks = P.keyState(), u = P.usage(), run = P.canRun(), tone, msg;
    var hint = ks.hint ? String(ks.hint).replace('…', '…\u2060') : '';     // keep "…ab12" on one line
    if (!ks.has) { tone = 'none'; msg = 'Belum ada kunci. Cek rating Google mati.'; }
    else if (ks.saved === 'vault') { tone = 'ok'; msg = 'Kunci tersimpan di salinan terenkripsi, berakhiran ' + hint + '.'; }
    else { tone = 'todo'; msg = 'Kunci tersimpan di dashboard, berakhiran ' + hint + '.\nSimpan salinan terenkripsi agar kunci tetap ada saat masuk berikutnya.'; }
    g.state.className = 'dp-savest dp-gk__state is-' + tone;
    g.state.appendChild(el('span', { class: 'dp-savest__dot', 'aria-hidden': 'true' }));
    var body = el('div', { class: 'dp-gk__msg' });
    gkLine(body, msg, 'dp-gk__line');
    if (ks.has && !ks.looksValid) gkLine(body, 'Kunci Google biasanya diawali AIza dan terdiri dari 39 karakter. Periksa kembali kunci ini.', 'dp-gk__line dp-gk__warn');
    if (ks.has && ks.saved !== 'vault' && !demoOn()) {
      var sv = el('button', { type: 'button', class: 'btn btn--secondary dp-gk__keep' }, [svgIcon('shield', 'icon--12'), el('span', { text: 'Simpan salinan terenkripsi' })]);
      sv.addEventListener('click', saveCopy);
      if (S.saving) sv.disabled = true;
      body.appendChild(sv);
    }
    g.state.appendChild(body);
    if (ks.has && !run.ok && run.code !== 'no-key') {
      g.where.appendChild(el('div', { class: 'dp-callout dp-gk__warnbox' }, [icon('info', 'icon--12'), (function () { var p = el('p'); setLines(p, run.text); return p; })()]));
    }
    g.save.querySelector('span').textContent = ks.has ? 'Ganti kunci' : 'Simpan kunci';
    g.del.hidden = !ks.has;
    g.test.hidden = !ks.has;
    g.test.disabled = !run.ok || !!S.gkTesting;
    g.test.querySelector('span').textContent = S.gkTesting ? 'Menguji…' : 'Uji kunci (1 cek)';
    // usage this month (a count only, kept in this browser)
    var pctUsed = Math.min(100, Math.round((u.used / (u.free || 1000)) * 100));
    g.usage.appendChild(el('div', { class: 'dp-gk__ut' }, [el('span', { class: 'dp-gk__ul', text: 'Cek bulan ini' }),
      el('span', { class: 'dp-gk__un', text: nInt(u.used) + ' dari ' + nInt(u.free) + ' tanpa biaya' })]));
    g.usage.appendChild(el('div', { class: 'dp-gk__bar' + (u.used >= u.free ? ' is-over' : (u.used >= u.free * 0.8 ? ' is-near' : '')), role: 'img',
      'aria-label': nInt(u.used) + ' dari ' + nInt(u.free) + ' cek tanpa biaya bulan ini telah digunakan' }, [el('i', { style: { width: pctUsed + '%' } })]));
    var ids = typeof P.storedIds === 'function' ? P.storedIds() : 0;
    gkLine(g.usage, (u.used >= u.free ? 'Cek tanpa biaya bulan ini telah habis. Cek berikutnya ditagih Google.' : 'Sisa ' + nInt(u.left) + ' cek tanpa biaya bulan ini.') +
      '\nHitungan ini hanya dari browser ini.' + (ids ? '\nID tempat Google tersimpan: ' + nInt(ids) + '.' : ''));
  }

  function saveGoogleKey() {
    var P = placesMod(), g = ui && ui.gk;
    if (!P || !g) return;
    var r = P.setKey(g.input.value);
    if (!r.ok) { fieldErr('gk-key', r.text); g.input.focus(); return; }
    g.input.value = '';
    fieldErr('gk-key', '');
    g.result.hidden = true;
    ctx.toast(r.warn ? 'Kunci disimpan di dashboard. ' + r.warn : 'Kunci Google disimpan di dashboard. Simpan salinan terenkripsi agar kunci tetap ada.', r.warn ? 'warn' : undefined);
    refreshGoogle();
    renderSaveBits();
    if (page) page.refill();
  }

  function deleteGoogleKey() {
    var P = placesMod();
    if (!P) return;
    ctx.confirm({ title: 'Hapus kunci Google', body: 'Kunci dihapus dari dashboard dan Cek rating Google mati.\nSimpan salinan terenkripsi sesudahnya agar kunci juga terhapus dari vault.js.',
      ok: 'Hapus kunci', cancel: 'Batal', danger: true }).then(function (yes) {
      if (!yes || !ctx) return;
      P.clearKey();
      if (ui && ui.gk) ui.gk.result.hidden = true;
      ctx.toast('Kunci Google dihapus dari dashboard. Simpan salinan terenkripsi agar kunci juga terhapus dari vault.js.');
      refreshGoogle();
      renderSaveBits();
      if (page) page.refill();
    });
  }

  function testGoogleKey() {
    var P = placesMod(), g = ui && ui.gk;
    if (!P || !g || S.gkTesting || typeof P.testKey !== 'function') return;
    S.gkTesting = true;
    refreshGoogle();
    var show = function (ok, text) {
      S.gkTesting = false;
      if (!ui || !ui.gk) return;
      var res = ui.gk.result;
      res.className = 'dp-gk__result ' + (ok ? 'is-ok' : 'is-bad');
      setLines(res, text);
      res.hidden = false;
      refreshGoogle();
    };
    P.testKey().then(function () { show(true, 'Kunci berfungsi. Google menerima permintaan dari alamat ini.'); },
      function (err) { show(false, (err && err.text) || 'Cek rating Google gagal. Coba lagi beberapa saat lagi.'); });
  }

  /* --- Demo, privacy, sources --------------------------------------------- */

  function demoBlock() {
    var on = demoOn();
    var x = exhibit('dp-demo', on ? 'Data contoh aktif: angka bank hanya ilustrasi' : 'Data contoh mati: angka berasal dari file Anda dan sumber publik',
      'Pilihan · mati setiap kali masuk, dikunci atau dimuat ulang', null, 'Sumber: data contoh (ilustrasi) · dibuat di browser ini');
    ui.demoX = x;
    var sw = MCD.demo && MCD.demo.switchEl ? MCD.demo.switchEl() : null;
    x.el.appendChild(el('div', { class: 'dp-demo' }, [
      el('p', { class: 'dp-p', text: 'Isi panel Livin’ Merchant, EDC dan SMA dengan angka contoh.\nGunakan untuk mencoba dashboard sebelum file cabang diimpor.\nSetiap angka bertanda CONTOH dan banner kuning tetap tampil.\nData Anda disimpan terpisah, lalu kembali saat Data contoh dimatikan.\nSimpan dan ekspor tidak tersedia selama Data contoh aktif.' }),
      sw
    ]));
    x.el.appendChild(x.src);
    return x.el;
  }

  /* V8: which privacy lines apply (each module feature-detected, so a page without it never claims it) */
  function fundingKnown() { return !!(fundApi() || MCD.saldo || dataKeyAvail('funding_merchant')); }
  function omzetKnown() { return !!(MCD.omzet || W.MCD_OMZET_BENCHMARKS); }
  function leadsKnown() { return !!(MCD.leads || MCD.leadsUi || policyApi()); }
  function privacyBlock() {
    var x = exhibit('dp-privacy', 'Data pribadi di laporan LVM dihapus saat impor. Sisanya tetap terenkripsi di komputer ini.', 'Cara data merchant dan nasabah dijaga · UU PDP No. 27/2022', null,
      'Sumber: BUILD_SPEC §K (privasi dan keamanan) · Content Security Policy di index.html · daftar kolom yang ditolak saat impor');
    var idle = (MCD.config && MCD.config.gate && MCD.config.gate.idleMinutes) || 15;
    var sealed = !!sealApi();
    var notes = [
      ['warn', 'Laporan LVM memuat data pribadi: nama pemilik, telepon, e-mail, nomor rekening, CIF dan alamat toko.\nSaat file dibaca, kolom pemilik dihapus dan tidak pernah disimpan.\nAlamat toko hanya dibaca untuk menemukan titik jalan atau kelurahan, lalu tidak disimpan.'],
      ['shield', 'Semua data diproses di browser ini. Data dari file bank tidak pernah dikirim ke server mana pun.\nHalaman ini memblokir semua koneksi, kecuali gambar peta, font, library dengan versi tetap dan Google Places.'],
      ['globe', 'Cek rating Google bersifat opsional dan mati tanpa kunci cabang.\nCek ini mengirim nama usaha dari peta publik dan titiknya ke Google.\nRating dan ulasan tidak disimpan. Hanya ID tempat Google yang disimpan, di salinan terenkripsi.'],
      ['lock', 'Data impor tetap di perangkat ini.\nSelama bekerja, data ada di dashboard. Setelah disimpan, data ada di salinan terenkripsi (data/vault.js).\nData hilang dari dashboard saat Anda menekan Kunci atau menutup tab.\nData juga hilang setelah ' + idle + ' menit tanpa aktivitas.'],
      /* v6 (V6_SPEC §8.2): the follow-up lists are sealed with the dashboard password (MCD.seal); V8: Kesehatan too */
      sealed ? ['lock', 'Daftar tindak lanjut SMA, kampus dan fasilitas kesehatan terenkripsi di browser ini dengan kata sandi dashboard.\nDaftar hanya terbuka setelah masuk dan ikut tersimpan saat salinan terenkripsi disimpan.'] : null,
      /* V8 (D46, D61, D64; V7 §11.2 without the calculator lines): funding merchant, Perkiraan omzet, policy, leads, plan */
      fundingKnown() ? ['lock', 'Saldo per merchant hanya tampil di daftar Saldo merchant dan disamarkan saat nama disamarkan.\nDaftar Saldo merchant tidak dicetak dari dashboard.\nCabang lain hanya tampil sebagai peringkat.'] : null,
      omzetKnown() ? ['info', 'Perkiraan omzet berasal dari data publik. Data pajak setiap usaha bersifat rahasia dan tidak digunakan.'] : null,
      leadsKnown() ? ['lock', 'Angka kebijakan bank dan daftar leads terenkripsi dalam salinan terenkripsi.\nDaftar leads tetap data nasabah yang dilindungi rahasia bank.\nGunakan profil browser tanpa ekstensi yang membaca halaman saat daftar leads menyala.'] : null,
      MCD.plan ? ['lock', 'Rencana kunjungan terenkripsi di browser ini dengan kata sandi dashboard.\nTautan Google Maps rencana kunjungan hanya memuat koordinat.'] : null,
      leadsKnown() || MCD.kpi ? ['info', 'Daftar leads, angka kebijakan dan Posisi cabang tidak dicetak.'] : null,
      ['nocommit', 'Jangan simpan atau kirim file Rev LVM ke repositori kode, e-mail atau folder bersama.\nLarangan ini juga berlaku untuk CSV dan isi file tersebut.\nHanya vault.js terenkripsi yang boleh ada di folder dashboard.'],
      leadsKnown() ? ['nocommit', 'Salinan terenkripsi kini dapat memuat daftar leads. Simpan hanya di laptop cabang.\nJangan kirim salinan terenkripsi melalui e-mail, WhatsApp atau folder awan.'] : null,
      ['pin', 'Toko ditempatkan menurut kecamatan dan kelurahan dengan daftar wilayah bawaan dashboard. Tidak ada alamat yang dikirim ke layanan peta.'],
      /* v6 (V6_SPEC §5.3, §8.2, D7, D17): institutional contacts only */
      ['shield', 'Kontak yang tampil hanya kontak lembaga dari daftar resmi atau situs resmi lembaga.\nNama kepala sekolah, dosen, staf dan siswa tidak disimpan.\nNomor seluler tampil hanya jika daftar resmi mencatatnya sebagai kontak lembaga.\nE-mail yang tampak milik pribadi tidak ditampilkan, walaupun tercatat di daftar resmi.\nSitus resmi menjadi tautan hanya jika terbuka saat diperiksa.\nKontak disembunyikan saat nama disamarkan.'],
      /* V8 (HEALTH_SPEC §8): the five lines of Kesehatan */
      ['shield', 'Kontak fasilitas kesehatan hanya kontak lembaga dari register Kemenkes dan Dinkes DKI.\nNomor seluler klinik tidak disimpan karena sering milik pribadi pemilik atau dokter.\nNama dokter dan tenaga kesehatan tidak dibaca dari sumber mana pun.\nKlinik yang menggunakan nama dokter tampil dengan nama usahanya.\nDashboard tidak memuat data pasien.'],
      ['veil', 'Gunakan Samarkan nama saat berbagi layar (tombol V).\nNama menjadi inisial, nominal dikelompokkan dan titik digeser ke kotak 250 m.'],
      ['id', 'Tampilkan nama lengkap membuka nama dan nomor lengkap selama 5 menit.\nNama disamarkan lagi saat tab tidak aktif atau mode berbagi layar menyala.'],
      ['info', 'Penggunaan data pribadi merchant atau nasabah perlu dasar hukum sesuai UU PDP No. 27/2022 dan persetujuan internal (Compliance atau DPO).\nDashboard ini tidak menggantikan persetujuan tersebut.'],
      ['info', 'Data contoh dibuat otomatis dan tidak mewakili merchant atau nasabah nyata.']
    ];
    notes = notes.filter(Boolean);
    x.el.appendChild(el('ul', { class: 'dp-priv' }, notes.map(function (n, i) {
      var ic = PATHS[n[0]] ? svgIcon(n[0], 'icon--12') : icon(n[0], 'icon--12');
      return el('li', { class: 'dp-priv__row' + (i === 0 || n[0] === 'nocommit' ? ' is-key' : '') }, [el('span', { class: 'dp-priv__ic', 'aria-hidden': 'true' }, [ic]), el('span', { text: n[1] })]);
    })));
    var col = function (title, ic, items, cls) {
      return el('div', { class: 'dp-kind ' + (cls || '') }, [
        el('h3', { class: 'dp-h3' }, [ic, el('span', { text: title })]),
        el('ul', { class: 'dp-bullets' }, items.filter(Boolean).map(function (t) { return el('li', { text: t }); }))
      ]);
    };
    x.el.appendChild(el('div', { class: 'dp-kinds' }, [
      col('Terenkripsi (data/vault.js)', icon('lock', 'icon--12'), [
        'Toko Livin’ Merchant dan KPI cabang (UREG dan USAK), tanpa data pribadi pemilik',
        'Terminal EDC Mandiri dan nasabah SMA',
        fundingKnown() ? 'Funding merchant KCP Cilangkap (saldo sebagai rentang) dan daftar Saldo merchant' : null,
        MCD.kpi ? 'File KPI bulanan area: angka total setiap cabang' : null,
        leadsKnown() ? 'Angka kebijakan bank, riwayatnya dan daftar leads (CIF disamarkan)' : null,
        'Kunci Google dan ID tempat Google, jika diisi',
        sealed ? 'Daftar tindak lanjut SMA, kampus dan fasilitas kesehatan, terenkripsi dengan kata sandi dashboard' : null,
        MCD.plan ? 'Rencana kunjungan, terenkripsi dengan kata sandi dashboard' : null,
        'Hanya terbuka dengan kata sandi (AES-256-GCM, PBKDF2)'
      ], 'is-enc'),
      col('Publik (terbaca tanpa kata sandi)', svgIcon('globe', 'icon--12'), [
        'Toko kelontong, restoran dan UMKM dalam 15 km (Overture Maps)',
        'Batas kecamatan dan kelurahan (Kemendagri, BPS, OpenStreetMap)',
        'Batas dan lokasi Mabes TNI, kantor bank lain (OpenStreetMap)',
        'Sekolah, proyek perumahan dan tabel suku bunga KPR Mandiri',
        'Sekolah dan kampus dalam 30 km dengan kontak lembaga dan kelas biaya',
        'Rumah sakit, klinik dan klinik kecantikan dalam 30 km dengan kontak lembaga',
        omzetKnown() ? 'Perkiraan omzet UMKM dari riset publik' : null
      ], 'is-pub'),
      col('Tidak pernah disimpan', svgIcon('trash', 'icon--12'), [
        'Kata sandi dan kuncinya',
        'Nama pemilik, telepon, e-mail, nomor rekening, CIF, ID pemilik, kode referal, nama pimpinan cabang',
        fundingKnown() ? 'Alamat, actype dan sccode di file funding merchant, serta nama dan angka cabang lain' : null,
        'NIK, nama ibu kandung dan NPWP di file apa pun',
        'Rating, ulasan dan nama dari Google',
        'Data impor dan kunci Google di penyimpanan browser, kolom alamat browser atau repositori kode'
      ], 'is-none'),
      col('Disimpan di browser ini', svgIcon('file', 'icon--12'), [
        'Terang/Gelap, tampilan terakhir, keterangan peta, Warna asli, Tanpa gambar peta dan pilihan peta merchant',
        'Pilihan waktu tempuh Jam sibuk dan Motor (tanpa tol)',
        'Asumsi, termasuk faktor jam sibuk',
        'Tampilan Sekolah (tab, urutan daftar, titik MA/SMK), isian kalkulator dan porsi siswa 17+',
        'Tampilan Kampus: urutan daftar dan jenis yang tampil, tanpa nama',
        'Cakupan 5, 15 atau 30 km per bagian, hanya selama tab terbuka (angka saja)',
        sealed ? 'Daftar tindak lanjut SMA, kampus dan fasilitas kesehatan, terenkripsi dengan kata sandi dashboard. Jangan mengisi data pribadi.'
          : 'Catatan Tindak lanjut SMA (nama petugas dan catatan kerja), tidak terenkripsi. Jangan mengisi data pribadi.',
        sealed && MCD.plan ? 'Rencana kunjungan hari ini dan sebelumnya, terenkripsi dengan kata sandi dashboard' : null,
        'Tampilan Kesehatan, Calon Prioritas dan Rencana kunjungan: tab, urutan dan pilihan, tanpa nama',
        'Jumlah cek rating Google bulan ini (angka saja) dan waktu unduhan salinan terakhir',
        'Jumlah salah kata sandi dan alasan dashboard terakhir dikunci',
        'Tata letak kartu dan panel: ukuran, posisi, bagian yang dilipat dan catatan yang telah tampil. Tanpa nama, angka atau lokasi.',
        'Tanpa data merchant atau nasabah'
      ], 'is-local')
    ]));
    var lay = layoutBlock();
    if (lay) x.el.appendChild(lay);
    x.el.appendChild(x.src);
    return x.el;
  }

  /**
   * "Atur ulang tata letak kartu" (v5, COPY_STYLE_EN item 43): the card and panel layout kept in this browser
   * (mcd.ui.windows.v1: sizes, places, folds, hints seen; never a name, number or place) goes back to the start through
   * MCD.windows.resetLayout(). Shown only when the shell has it. No confirmation: nothing is lost but the layout.
   */
  function resetLayout() {
    var Wn = winApi('resetLayout');
    if (!Wn) return false;
    var ok = true;
    try { Wn.resetLayout(); } catch (e) { ok = false; }
    if (ctx) ctx.toast(ok ? 'Tata letak kartu kembali ke awal.' : 'Tata letak kartu tidak dapat diatur ulang. Muat ulang halaman, lalu coba lagi.', ok ? undefined : 'warn');
    return ok;
  }
  function layoutBlock() {
    if (!winApi('resetLayout')) return null;
    var b = el('button', { type: 'button', class: 'btn btn--secondary dp-layout__btn' }, [icon('reset'), el('span', { text: 'Atur ulang tata letak kartu' })]);
    b.addEventListener('click', resetLayout);
    return el('div', { class: 'dp-layout', id: 'dp-layout' }, [
      el('div', { class: 'dp-sep' }),
      el('h3', { class: 'dp-h3', text: 'Tata letak kartu' }),
      el('p', { class: 'dp-p', text: 'Ukuran dan posisi kartu tersimpan di browser ini. Nama, angka dan lokasi tidak disimpan.' }),
      el('div', { class: 'dp-actions' }, [b])
    ]);
  }

  function metaDate(o) {
    var m = o && o.meta;
    var d = m && (m.generated || m.asOf || (m.release && String(m.release).slice(0, 10)));
    return d && /^\d{4}-\d{2}/.test(d) ? F().date(String(d).slice(0, 10)) : null;
  }
  /* v6 data (V6_SPEC §8.1). Lazy files are read only when a section already loaded them: this page never loads one
     (V10), so a file that is not in shows "Dimuat saat diperlukan". Source badges (D22, COPY_STYLE_EN items 46-47):
     attribution only, on a white tile in both themes, never recoloured or stretched. */
  var LOGO = {
    dapodik: { src: 'assets/brand/dapodik-logo.png', alt: 'Dapodik (Data Pokok Pendidikan)', w: 480, h: 227 },
    pddikti: { src: 'assets/brand/pddikti-logo.webp', alt: 'PDDikti (Pangkalan Data Pendidikan Tinggi)', w: 480, h: 206 }
  };
  var LAZY_WAIT = 'Dimuat saat diperlukan';
  function logoTile(L) {
    return el('span', { class: 'dp-logo' }, [el('img', { class: 'dp-logo__img', src: L.src, alt: L.alt, width: String(L.w), height: String(L.h), decoding: 'async', loading: 'lazy', draggable: 'false' })]);
  }
  function lazyFile(name) { var g = W[name]; return g && g.meta && (Array.isArray(g.rows) || name === 'MCD_TRAVEL_GRID_OUTER') ? g : null; }
  function isoDate(v) { var d = v && /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null; return d ? F().date(d) : null; }
  /** The eight v6 rows: [data, sumber, per, lisensi, logo?] */
  function sourceRows() {
    var ss = lazyFile('MCD_SCHOOL_STUDENTS'), sc = lazyFile('MCD_SCHOOL_CONTACTS'), cp = lazyFile('MCD_CAMPUSES'), tr = lazyFile('MCD_INSTITUTION_TIERS');
    var og = lazyFile('MCD_TRAVEL_GRID_OUTER'), sma = W.MCD_SMA_STUDENTS && W.MCD_SMA_STUDENTS.meta;
    var smaDate = sma ? isoDate(sma.generated || sma.fetched) : null, ssDate = ss ? isoDate(ss.meta.generated) : null;
    /* two download dates: one per line, a date never split across lines */
    var keep = function (d) { return String(d).replace(/ /g, '\u00a0'); };
    var siswaPer = ssDate ? (smaDate ? 'SMA dalam 15 km diunduh ' + keep(smaDate) + ',\nsekolah lain ' + keep(ssDate) : ssDate) : LAZY_WAIT;
    var cpDate = cp ? (isoDate(cp.meta.generated) || '—') : LAZY_WAIT;
    var web = sc && sc.meta.webCheck ? isoDate(sc.meta.webCheck.checked) : null;
    var rel = null;    // the Overture release the campus file read, from its own source line ("rilis 2026-09-23.1")
    (cp && Array.isArray(cp.meta.sources) ? cp.meta.sources : []).some(function (t) { var m = /Overture Maps[^.]*?rilis (\d{4}-\d{2}-\d{2}(?:\.\d+)?)/.exec(String(t)); if (m) rel = m[1]; return !!m; });
    return [
      ['Siswa SMA, SMK dan MA dalam 30 km', 'Kemendikdasmen: Dapodik, Sekolah Kita (termasuk madrasah) dan Data Referensi', siswaPer, 'Data publik lembaga', LOGO.dapodik],
      ['Kontak sekolah', 'Sekolah Kita (Dapodik), Data Referensi Kemendikdasmen', sc ? (isoDate(sc.meta.generated) || '—') : LAZY_WAIT, 'Data publik lembaga'],
      ['Pemeriksaan situs resmi', 'DNS publik dan satu kunjungan ke halaman depan setiap situs', sc ? (web || '—') : LAZY_WAIT, '—'],
      ['Perguruan tinggi dalam 30 km', 'PDDikti (Kemdiktisaintek) · titik dari OpenStreetMap, Overture Maps dan alamat resmi', cpDate, 'Data publik lembaga, ODbL, CDLA-Permissive-2.0', LOGO.pddikti],
      ['Sekolah desain dan kursus', 'OpenStreetMap, Overture Maps Foundation, situs resmi lembaga', cpDate, 'ODbL, CDLA-Permissive-2.0'],
      ['Kelas biaya sekolah dan kampus', 'Situs resmi lembaga (biaya resmi), jenis lembaga, daya beli area (perkiraan)', tr ? 'biaya dibaca ' + (isoDate(tr.meta.generated) || '—') : LAZY_WAIT, 'Data publik lembaga · perkiraan ditandai'],
      ['Kantin dan merchant di sekitar kampus', 'Overture Maps Foundation' + (rel ? ' (rilis ' + rel + ')' : '') + ', garis kampus OpenStreetMap', cpDate, 'CDLA-Permissive-2.0, ODbL'],
      ['Jaringan jalan 16 sampai 32 km dari KCP', 'OpenStreetMap (rute di komputer ini)', og ? (isoDate(og.meta.generated) || '—') : LAZY_WAIT, 'ODbL · perkiraan, lalu lintas normal']
    ];
  }
  /** "2026-10-22 s.d. 2026-10-23" → "22–23 Okt 2026"; one date → "22 Okt 2026"; else null. */
  function fetchedText(v) {
    var d = String(v || '').match(/\d{4}-\d{2}-\d{2}/g);
    if (!d || !d.length) return null;
    var a = d[0], b = d[d.length - 1];
    if (a === b) return F().date(a);
    if (a.slice(0, 7) === b.slice(0, 7)) return (+a.slice(8)) + '–' + F().date(b);
    return F().date(a) + ' – ' + F().date(b);
  }
  /**
   * V8 rows (HEALTH_SPEC §8; V8 §4.2.4; V7 §11.2): Kesehatan (three rows; "Dimuat saat diperlukan" until the lazy file is
   * in, never loaded from here), funding merchant, Perkiraan omzet, the KPI file and the lead list.
   */
  function v8SourceRows() {
    var out = [], hf = lazyFile('MCD_HEALTH_FACILITIES'), hm = hf && hf.meta;
    var src = function (id) { return hm && Array.isArray(hm.sources) ? hm.sources.filter(function (x) { return x && x.id === id; })[0] || null : null; };
    var when = function (id) { var x = src(id); return (x && fetchedText(x.fetched)) || (hm ? isoDate(hm.generated) : null) || '—'; };
    var lic = 'Data publik pemerintah dengan atribusi · ODbL · CDLA-Permissive-2.0';
    out.push(['Rumah sakit dalam 30 km', 'Kemenkes: SIRS Online dan SIRANAP · titik dari OpenStreetMap dan Overture Maps', hm ? when('sirs') : LAZY_WAIT, lic]);
    out.push(['Klinik dan klinik kecantikan dalam 30 km', 'Kemenkes: Direktori Klinik · Dinas Kesehatan DKI Jakarta (Satu Data Jakarta) · OpenStreetMap, Overture Maps', hm ? when('keslan') : LAZY_WAIT, lic]);
    out.push(['Pemeriksaan situs resmi fasilitas kesehatan', 'Satu kunjungan ke halaman depan setiap situs', hm ? when('keslan') : LAZY_WAIT, '—']);
    var sets = realSets(), one = function (type) { var c = catalogEntry(type); return c && entryCount(sets, c) ? entryMeta(sets, c) : null; };
    if (fundingKnown()) { var fm = one('funding'); out.push(['Funding merchant cabang', 'Laporan region dan file cabang, diimpor pengguna', fm && fm.asOf ? F().date(fm.asOf) : 'posisi file', 'Data bank, tidak dibagikan.']); }
    if (omzetKnown()) {
      var om = W.MCD_OMZET_BENCHMARKS && W.MCD_OMZET_BENCHMARKS.meta;
      out.push(['Perkiraan omzet UMKM', 'Riset publik: BPS, peraturan daerah tentang pajak restoran dan PP 7/2021', (om && isoDate(om.researchAsOf || om.generated)) || '22 Okt 2026', 'Data publik']);
    }
    if (MCD.kpi || dataKeyAvail('kpi_cabang')) {
      var km = one('kpi'), KR = MCD.kpi && MCD.kpi.workbookReader, kp = km && km.asOf && KR && KR.periodLabel ? KR.periodLabel(String(km.asOf).slice(0, 7)) : null;
      out.push(['File KPI bulanan area', 'Kantor area, diimpor pengguna', kp || (km && km.asOf ? F().date(km.asOf) : 'periode file'), 'Data bank, tidak dibagikan.']);
    }
    if (MCD.leads || dataKeyAvail('leads')) { var lm = one('leads'); out.push(['Daftar leads (CIF disamarkan)', 'Laporan nasabah cabang, diimpor pengguna', lm && lm.asOf ? F().date(lm.asOf) : 'tanggal data', 'Data bank yang disamarkan, hanya di laptop cabang.']); }
    return out;
  }
  /** HEALTH_SPEC §8: the four lines of Kesehatan under the table, only once its file is in: [{text, title}]. */
  function healthNotes() {
    var hf = lazyFile('MCD_HEALTH_FACILITIES'), cov = hf && hf.meta && hf.meta.coverage;
    if (!hf) return [];
    var belum = [], unplaced = 0;
    Object.keys((cov && cov.keslanByKota) || {}).forEach(function (k) { var v = cov.keslanByKota[k]; if (v && v.status === 'belum') belum.push(k); });
    Object.keys((cov && cov.unplaced) || {}).forEach(function (k) { if (/^rs /.test(k)) unplaced += +cov.unplaced[k] || 0; });
    var out = [];
    if (belum.length) out.push({ text: 'Daftar klinik Kemenkes belum dibaca untuk ' + nInt(belum.length) + ' kota dan kabupaten. Di wilayah itu klinik berasal dari Dinkes DKI dan peta terbuka.', title: belum.join(', ') });
    if (unplaced) out.push({ text: nInt(unplaced) + ' rumah sakit terdaftar di SIRS belum dapat ditempatkan di peta.' });
    out.push({ text: 'Status mitra BPJS belum tersedia: situs faskes BPJS tidak dapat dibuka saat data dikumpulkan.' });
    out.push({ text: 'Klinik kecantikan dikenali dari nama dan kategori peta, sehingga perlu diperiksa.' });
    return out;
  }
  /** The lines under the table: what "perkiraan" means, then the gap lines of files that are in (D16, D20). */
  function sourceNotes() {
    var out = ['Perkiraan berarti angka dihitung dari data lain, tidak dari sumber resmi untuk lembaga itu.',
      'Contoh: kelas biaya dari jenis sekolah dan daya beli area jika biaya resmi tidak dipublikasikan.'];
    var ss = lazyFile('MCD_SCHOOL_STUDENTS'), cp = lazyFile('MCD_CAMPUSES');
    if (ss && Array.isArray(ss.extra) && ss.extra.length) out.push(nInt(ss.extra.length) + ' sekolah yang tercatat di Dapodik dalam 30 km belum ada di peta dashboard.');
    var un = cp && cp.meta.universe && cp.meta.universe.unplaced;
    if (Array.isArray(un) && un.length) out.push(nInt(un.length) + ' perguruan tinggi aktif di wilayah ini belum dapat ditempatkan di peta.');
    return out;
  }
  function sourcesBlock() {
    var x = exhibit('dp-sources', 'Setiap lapisan publik berasal dari sumber terbuka, dengan tanggal di bawah', 'Data publik di peta dan di setiap bagian · tanggal setiap sumber', null,
      'Sumber: info setiap file data di data/ · versi library ditetapkan dengan SRI di index.html');
    var rows = [];
    var ref = MCD.ref || {};
    rows.push(['Peta satelit (Detail)', 'Esri World Imagery · Esri, Maxar, Earthstar Geographics', 'Dimuat langsung dari penyedia', 'Ketentuan penggunaan Esri']);
    rows.push(['Peta jalan (Sederhana)', 'OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors', 'Dimuat langsung dari penyedia', 'ODbL']);
    var refAsOf = ref.meta && ref.meta.asOf ? F().date(ref.meta.asOf) : '—';
    rows.push(['Batas Mabes TNI, lokasi dan tabel kelurahan', (ref.meta && ref.meta.sources && ref.meta.sources.polygon) || 'OpenStreetMap (ODbL)', refAsOf, 'ODbL']);
    var aa = W.MCD_ADMIN_AREAS;
    if (aa) rows.push(['Batas kecamatan dan kelurahan dalam 30 km', 'OpenStreetMap, BPS (COD-AB), kode dan nama Kemendagri', metaDate(aa) || '—', 'ODbL, CC BY 3.0 IGO']);
    var hx = W.MCD_TERRITORY_HEX;
    if (hx) rows.push(['Indeks wilayah internal (15 km)', 'Disusun dari batas wilayah di atas dan daftar merchant', metaDate(hx) || '—', 'ODbL, CC BY 3.0 IGO']);
    var pois = W.MCD_SME_POIS;
    if (pois) rows.push(['Toko kelontong, restoran dan UMKM dalam 15 km', 'Overture Maps Foundation, Places' + (pois.meta && pois.meta.release ? ' rilis ' + pois.meta.release : ''), metaDate(pois) || '—', 'CDLA-Permissive-2.0, Apache-2.0, CC0, ODbL']);
    var sx = W.MCD_SME_EXTRA;
    if (sx && sx.meta) rows.push(['Kategori usaha dan tanda publik (Potensi EDC)', 'Overture Maps Foundation, Places' + (sx.meta.release ? ' rilis ' + sx.meta.release : '') +
      (sx.meta.fallback ? ' · hanya kelompok usaha' : ''), metaDate(sx) || '—', 'CDLA-Permissive-2.0, Apache-2.0, CC0']);
    var gp = placesMod();
    rows.push(['Rating dan ulasan Google (opsional)', 'Google Maps Platform, Places API (New)', gp && gp.hasKey() ? 'Langsung saat diperiksa' : 'Mati, belum ada kunci', 'Ketentuan Google Maps Platform, tidak disimpan']);
    var cl = W.MCD_SME_CLUSTERS;
    if (cl) rows.push(['Kelompok usaha', 'OpenStreetMap (Overpass) dan riset web', metaDate(cl) || '—', 'ODbL']);
    var pp = W.MCD_PROPERTY_PROJECTS;
    if (pp) rows.push(['Proyek perumahan dalam 30 km', 'SiKumbang (Kementerian PKP / BP Tapera), situs developer, berita', metaDate(pp) || '—', 'Sumber publik, harga indikatif']);
    var pm = W.MCD_PROPERTY_MARKET;
    if (pm) rows.push(['Acuan harga rumah', 'Laporan Rumah123, Cushman & Wakefield, SHPR Bank Indonesia (melalui media)', metaDate(pm) || '—', 'Agregat yang dipublikasikan']);
    var kc = W.MCD_KPR_CONFIG;
    if (kc) rows.push(['Suku bunga dan promo KPR', 'Halaman bankmandiri.co.id dan RIPLAY KPR Mandiri', kc.asOf && /^\d{4}-/.test(kc.asOf) ? F().date(kc.asOf) : '—', 'Sistem bank dan SP3K yang berlaku']);
    var ts = W.MCD_TNI_SCHOOLS;
    if (ts) rows.push(['Sekolah yayasan TNI', 'Kemendikdasmen Dapodik dan Verval Yayasan, OpenStreetMap', metaDate(ts) || '—', 'Data publik lembaga, ODbL']);
    var trv = W.MCD_TRAVEL || (MCD.travel && typeof MCD.travel.ready === 'function' && MCD.travel.ready() ? MCD.travel : null);
    if (trv) rows.push(['Jarak dan waktu tempuh dari KCP', 'OSRM (rute OpenStreetMap), per kelurahan', (W.MCD_TRAVEL && metaDate(W.MCD_TRAVEL)) || '—', 'ODbL · perkiraan, lalu lintas normal']);
    rows.push(['Sekolah dalam 30 km', 'Kemendikdasmen (Data Pokok Pendidikan), dimuat di Sekolah', W.MCD_SCHOOLS ? (metaDate(W.MCD_SCHOOLS) || '—') : 'Dimuat saat diperlukan', 'Data publik lembaga']);
    rows = rows.concat(sourceRows()).concat(v8SourceRows());
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var by = el('td', { class: 'dp-src__by' }, [r[4] ? logoTile(r[4]) : null, el('span', { text: r[1] })]);
      tbody.appendChild(el('tr', { title: r[0] + ' — ' + r[1] + ' · ' + r[2] }, [el('td', { text: r[0] }), by, el('td', { class: 'num' + (String(r[2]).length > 30 ? ' is-long' : ''), text: r[2] }), el('td', { class: 'dp-src__lic', text: r[3] })]));
    });
    x.el.appendChild(el('div', { class: 'tbl-wrap' }, [el('table', { class: 'tbl dp-tbl dp-src' }, [
      el('thead', null, [el('tr', null, [el('th', { scope: 'col', text: 'Data' }), el('th', { scope: 'col', text: 'Sumber' }), el('th', { scope: 'col', class: 'num', text: 'Per' }), el('th', { scope: 'col', text: 'Lisensi' })])]),
      tbody])]));
    /* v6 (V6_SPEC §8.1): what "perkiraan" means, then the two gaps staff should know about, once their files are in */
    x.el.appendChild(el('div', { class: 'dp-src-notes' }, sourceNotes().map(function (t) { return el('p', { class: 'dp-fine', text: t }); })
      .concat(healthNotes().map(function (n) { return el('p', { class: 'dp-fine dp-src-notes__hf', text: n.text, title: n.title || null }); }))));
    x.el.appendChild(el('p', { class: 'dp-fine', text: 'Perangkat lunak: MapLibre GL JS 4.7.1 (BSD-3-Clause), deck.gl 9.0.41 (MIT), D3 7.9.0 (ISC), Papa Parse 5.4.1 (MIT), SheetJS CE 0.18.5 (Apache-2.0, dimuat pada impor XLSX pertama). Font: Source Serif 4, Inter Tight, IBM Plex Mono (SIL Open Font Licence).' }));
    x.el.appendChild(x.src);
    return x.el;
  }

  /* ==================================== V8: the one import row "Funding merchant (cabang)" (D45, D46; §3.2, §4.2.1) */

  var FUND_LINES = ['Laporan Funding Merchant Mass Retail atau file Cilangkap Merchant Area.', 'Hanya merchant KCP Jakarta Cilangkap (12903) yang disimpan.',
    'CIF, nomor rekening, nama resmi pemilik dan alamat dihapus saat file dibaca.'];
  var FUND_T = {
    title: 'Funding merchant (cabang)', pick: 'Impor file funding merchant', hint: 'Pilih satu atau dua file: laporan region dan file cabang.',
    reading: 'Membaca file…', notFunding: 'File ini bukan laporan funding merchant. Pilih file lain.',
    unread: 'File tidak dapat dibaca. Pastikan formatnya CSV atau XLSX.', noXlsx: 'Pembaca XLSX tidak dapat dimuat. Periksa internet, lalu coba lagi.',
    noModule: 'Pembaca funding merchant tidak termuat. Muat ulang halaman.', result: 'Hasil pemeriksaan',
    head: 'Posisi {tanggal} · {n} merchant', mids: ' · {m} MID', dropped: 'Kolom yang dihapus dan tidak disimpan: {daftar}.',
    saldoKept: 'Daftar Saldo merchant menyimpan saldo per merchant sesuai file.', bandsOnly: 'Peta dan kartu merchant hanya menampilkan rentang saldo.',
    use: 'Gunakan data ini', cancel: 'Batal', ready: 'Funding merchant siap · {n} merchant KCP Cilangkap', see: 'Lihat di Merchant',
    notKept: 'Isi file tidak disimpan. Untuk impor ulang, pilih file lagi.', failed: 'Funding merchant tidak dapat digunakan. Coba lagi.',
    clearBody: 'Data funding merchant dan daftar Saldo merchant akan dihapus dari dashboard.', loaded: 'Posisi {tanggal} · {n} merchant',
    cancelled: 'Impor funding merchant dibatalkan. Tidak ada yang berubah.'
  };
  /* the dropped columns in words (§4.2.1); other labels (actype, sccode, …) as written in the file */
  var DROP_WORDS = [[/^(cif|cifno|cif_no|no_cif|nocif)$/, 'CIF'], [/^(norekening|no_rekening|nomor_rekening|norek|rekening|account|account_no|account_number)$/, 'nomor rekening'],
    [/^(merchantofficialname|merchant_official_name|official_name|nama_resmi|nama_pemilik|pemilik|owner|owner_name|nama_nasabah)$/, 'nama resmi pemilik'],
    [/^(alamat|alamat_[a-z0-9_]+|address)$/, 'alamat']];
  var DROP_ORDER = ['CIF', 'nomor rekening', 'nama resmi pemilik', 'alamat'];
  function fill(t, v) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(v, k) ? String(v[k]) : m; }); }
  /** Column labels as written in the file → the words of the dropped-columns line, without repeats, CIF first. */
  function dropWords(list) {
    var out = [];
    (list || []).forEach(function (raw) {
      var h = str(raw);
      if (!h) return;
      var n = h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''), w = h;
      for (var i = 0; i < DROP_WORDS.length; i++) if (DROP_WORDS[i][0].test(n)) { w = DROP_WORDS[i][1]; break; }
      if (out.indexOf(w) < 0) out.push(w);
    });
    var rank = function (w) { var i = DROP_ORDER.indexOf(w); return i < 0 ? DROP_ORDER.length : i; };
    return out.map(function (w, i) { return { w: w, i: i }; }).sort(function (a, b) { return rank(a.w) - rank(b.w) || a.i - b.i; }).map(function (x) { return x.w; });
  }

  // memory only (D45: nothing is kept before "Gunakan data ini"): st 'idle' | 'reading' | 'review' | 'error' | 'done'
  var FS = { st: 'idle', res: null, saldo: null, names: [], msg: null, after: false, doneN: 0, token: 0 };
  function fundApi() { var Fd = MCD.funding; return Fd && typeof Fd.importFiles === 'function' && typeof Fd.apply === 'function' ? Fd : null; }
  function fundReset() { FS.token++; FS.st = 'idle'; FS.res = null; FS.saldo = null; FS.names = []; FS.msg = null; FS.after = false; }
  /** Empties a sheet read from a file (its rows hold the columns that are never kept: CIF, account, owner, address). */
  function wipeSheet(sh) {
    if (!sh || typeof sh !== 'object') return;
    if (Array.isArray(sh.rows)) { sh.rows.forEach(function (r) { if (Array.isArray(r)) for (var j = 0; j < r.length; j++) r[j] = null; }); sh.rows.length = 0; }
    if (Array.isArray(sh.headers)) sh.headers.length = 0;
    if (Array.isArray(sh.rowNos)) sh.rowNos.length = 0;
  }
  function wipeItems(items) { (items || []).forEach(function (it) { (it && it.sheets || []).forEach(wipeSheet); }); }
  /** The funding row as stored: {asOf, n} (merchants; the Saldo list when no funding dataset), or null. */
  function fundLoaded() {
    var sets = realSets(), c = catalogEntry('funding');
    if (!c) return null;
    var key = entryKey(sets, c), n = realCount(sets, key);
    if (!n) return null;
    /* merchants as the import counted them (the meta record's branch totals), else the records */
    var rows = (sets[key] && sets[key].rows) || [], meta = rows.filter(function (r) { return r && r.isMeta; })[0], t = meta && meta.aggregates && meta.aggregates.total;
    return { asOf: entryMeta(sets, c).asOf || null, n: t && isNum(t.merchants) ? t.merchants : n };
  }
  function fundMerchants(model) {
    var A = model && model.aggregates, t = A && A.total;
    return t && isNum(t.merchants) ? t.merchants : ((model && model.merchants) || []).length;
  }

  /** "Impor file funding merchant": one or two files, read here, then checked by MCD.funding.importFiles. */
  function fundPick(files) {
    files = (files || []).filter(Boolean);
    if (!files.length) return;
    if (demoOn()) { MCD.demo.ensureOff().then(function (ok) { if (ok) fundPick(files); }); return; }
    var I = MCD.importer;
    if (!fundApi() || !I || typeof I.read !== 'function') { FS.st = 'error'; FS.msg = FUND_T.noModule; renderFunding(); return; }
    if (files.some(function (f) { return !/\.(csv|txt|xlsx|xlsm|xls)$/i.test(f.name || ''); })) { FS.st = 'error'; FS.msg = FUND_T.unread; renderFunding(); return; }
    var token = ++FS.token;
    FS.st = 'reading'; FS.msg = null; FS.after = false; FS.res = null; FS.saldo = null;
    renderFunding();
    Promise.all(files.map(function (file) {
      return I.read(file).then(function (sheets) { return { file: { name: file.name || 'file', size: file.size || 0 }, sheets: sheets || [] }; });
    })).then(function (items) {
      if (token !== FS.token) { wipeItems(items); return; }
      fundRun(items);
    }, function (err) {
      if (token !== FS.token) return;
      var m = String((err && err.message) || '');
      if (W.console) W.console.warn('[data] funding file could not be read', m);
      FS.st = 'error'; FS.msg = /sheetjs|could not load|timed out/i.test(m) ? FUND_T.noXlsx : FUND_T.unread;
      renderFunding();
    });
  }
  /**
   * The check: MCD.funding.importFiles (12903 only, both layouts), the merchant-name sheet through the Saldo schema, then
   * the raw sheets are emptied. Nothing is stored here.
   */
  function fundRun(items) {
    var Fd = fundApi(), I = MCD.importer, names = (items || []).map(function (it) { return (it && it.file && it.file.name) || 'file'; });
    FS.token++;
    if (!Fd) { wipeItems(items); FS.st = 'error'; FS.msg = FUND_T.noModule; renderFunding(); return; }
    var r = null;
    try { r = Fd.importFiles(items); } catch (e) { r = null; if (W.console) W.console.warn('[data] funding check failed', e && e.message); }
    if (!r || !r.model || r.error === 'not-funding') {
      wipeItems(items);
      FS.st = 'error'; FS.msg = FUND_T.notFunding; FS.res = null; FS.saldo = null; FS.names = names;
      log(names.join(', ') + ': bukan laporan funding merchant.', 'warn');
      showFunding();
      return;
    }
    var saldo = null;
    if (r.saldoSheet && r.saldoSheet.sheet && I && typeof I.parse === 'function') {
      try {
        var p = I.parse(r.saldoSheet.sheet, 'saldo', null, {});
        saldo = { records: p.records || [], report: p.report || {}, file: r.saldoSheet.file || null, sheet: r.saldoSheet.sheet.name || null };
      } catch (e2) { saldo = null; if (W.console) W.console.warn('[data] saldo sheet check failed', e2 && e2.message); }
    }
    if (r.saldoSheet) wipeSheet(r.saldoSheet.sheet);
    wipeItems(items);
    FS.st = 'review'; FS.names = names; FS.after = false; FS.msg = null;
    FS.res = { ok: !!r.ok, error: r.error || null, model: r.model, report: r.report || r.model.report || {} };
    FS.saldo = saldo;
    log(names.join(', ') + ': ' + (r.ok ? 'funding merchant terbaca. Periksa, lalu tekan Gunakan data ini.' : 'KCP Jakarta Cilangkap (12903) tidak ada di file ini.'), r.ok ? '' : 'warn');
    showFunding();
  }
  /** Brings the card into view: Detail › Impor (a drop in Sederhana switches the view; the card keeps its state). */
  function showFunding() {
    S.tab = 'import';
    if (ctx && !deep()) { S.scrollTo = 'dp-funding'; ctx.setView('deep'); return; }
    if (ui && ui.panels && !ui.panels.import.hidden) renderFunding();
    else goTab('import');
    if (ctx) bringTo('dp-funding', function (c) { var u = c.querySelector('[data-fk="fund-use"]'); return u && !u.disabled ? u : (c.querySelector('[data-fk="fund-cancel"]') || c.querySelector('[data-fk="fund-pick"]')); }, true);
  }
  /** "Gunakan data ini": both bank datasets in one step, with the funding position date (D45). */
  function fundUse() {
    var res = FS.res, Fd = fundApi();
    if (!res || !res.ok || !Fd) return;
    if (demoOn()) { MCD.demo.ensureOff().then(function (ok) { if (ok) fundUse(); }); return; }
    var model = res.model, file = (FS.names || []).join(' + ') || null, saldo = FS.saldo, ok = false;
    try { ok = Fd.apply(model, { file: file }) !== false; } catch (e) { ok = false; if (W.console) W.console.warn('[data] funding apply failed', e && e.message); }
    if (!ok) { log(FUND_T.failed, 'warn'); if (ctx) ctx.toast(FUND_T.failed, 'warn'); return; }
    var sk = dataKeyAvail('saldo');
    if (saldo && saldo.records.length && MCD.importer && typeof MCD.importer.apply === 'function') {
      try { MCD.importer.apply('saldo', saldo.records, { asOf: model.asOf || (saldo.report && saldo.report.asOf) || null, file: saldo.file || file, sheet: saldo.sheet, report: saldo.report }); }
      catch (e2) { if (W.console) W.console.warn('[data] saldo apply failed', e2 && e2.message); log('Daftar Saldo merchant tidak dapat digunakan. Coba lagi.', 'warn'); }
    } else if (sk && realCount(realSets(), sk)) {
      try { MCD.data.revert(sk); } catch (e3) { /* the older list stays until its own clear */ }   // one import, one date: no older Saldo list stays
    }
    var n = fundMerchants(model), words = dropWords((res.report.droppedColumns || []).concat((saldo && saldo.report && saldo.report.dropped) || []));
    log(file + ' → ' + FUND_T.title + ': ' + nInt(n) + ' merchant' + (model.asOf ? ', posisi ' + F().date(model.asOf) : '') +
      (words.length ? ' · ' + plural(words.length, 'personal column', 'personal columns') + ' dihapus' : '') + '.', 'ok');
    FS.token++; FS.st = 'done'; FS.res = null; FS.saldo = null; FS.after = true; FS.doneN = n;
    S.changed = true;
    if (ctx) ctx.toast(fill(FUND_T.ready, { n: nInt(n) }));
    refreshAll();
  }
  function fundCancel() {
    fundReset();
    FS.after = true;
    log(FUND_T.cancelled, '');
    renderFunding();
  }
  /** One "Hapus" for the row: the funding dataset and the Saldo merchant list (§4.2.4). */
  function removeFunding(c) {
    ctx.confirm({ title: 'Hapus ' + c.label + '?', danger: true, ok: 'Hapus', cancel: 'Batal',
      body: FUND_T.clearBody + '\nFile asli Anda tidak berubah dan dapat diimpor lagi.' })
      .then(function (yes) {
        if (!yes) return;
        ['funding_merchant', 'saldo'].forEach(function (k) {
          var key = dataKeyAvail(k);
          if (key) { try { MCD.data.revert(key); } catch (e) { if (W.console) W.console.warn('[data] remove failed', e && e.message); } }
        });
        S.changed = true;
        if (FS.st === 'done') fundReset();
        log(c.label + ' dan daftar Saldo merchant telah dihapus dari dashboard.', 'ok');
        refreshAll();
      });
  }

  function findRow(level, text, id) {
    var lv = level === 'warn' ? 'warn' : (level === 'ok' ? 'ok' : 'info');
    return el('li', { class: 'dp-find__row is-' + lv, id: id || null }, [icon(lv === 'warn' ? 'warn' : (lv === 'ok' ? 'check' : 'info'), 'icon--12'), el('span', { text: text })]);
  }
  /** "Hasil pemeriksaan" (§4.2.1): dates, counts and the notes of the modules, never a cell value of the files. */
  function fundReport() {
    var res = FS.res, model = res.model || {}, rep = res.report || {}, saldo = FS.saldo;
    var box = el('div', { class: 'dp-rep dp-fund__rep', 'aria-live': 'polite' });
    box.appendChild(el('h4', { class: 'dp-h3', text: FUND_T.result }));
    box.appendChild(el('p', { class: 'dp-fund__files', text: 'Dari ' + (FS.names || []).join(', ') }));
    var A = model.aggregates, t = A && A.total, mids = A && A.unit === 'mid' && t && isNum(t.mids) ? t.mids : null;
    if (res.ok) box.appendChild(el('p', { class: 'dp-fund__head', text: fill(FUND_T.head, { tanggal: model.asOf ? F().date(model.asOf) : '—', n: nInt(fundMerchants(model)) }) + (mids != null ? fill(FUND_T.mids, { m: nInt(mids) }) : '') }));
    var list = el('ul', { class: 'dp-find' });
    var words = dropWords((rep.droppedColumns || []).concat((saldo && saldo.report && saldo.report.dropped) || []));
    var dropLine = words.length ? fill(FUND_T.dropped, { daftar: joinWords(words) }) : null, dropShown = false;
    (rep.checks || []).forEach(function (c) {
      if (!c || !c.text) return;
      if (c.code === 'DROPPED') { if (dropLine && !dropShown) { list.appendChild(findRow('info', dropLine)); dropShown = true; } return; }   // the same fact, in words
      list.appendChild(findRow(c.level, c.text, c.code === 'HOME_MISSING' ? 'dp-fund-why' : null));
    });
    ((saldo && saldo.report && saldo.report.notes) || []).forEach(function (t2) { if (t2) list.appendChild(findRow('info', String(t2))); });
    if (dropLine && !dropShown) list.appendChild(findRow('info', dropLine));
    if (saldo && saldo.records && saldo.records.length) list.appendChild(findRow('info', FUND_T.saldoKept));
    list.appendChild(findRow('info', FUND_T.bandsOnly));
    box.appendChild(list);
    var use = el('button', { type: 'button', class: 'btn btn--lg btn--primary', 'data-fk': 'fund-use', disabled: res.ok ? null : true,
      'aria-describedby': res.ok ? null : 'dp-fund-why' }, [icon('check'), el('span', { text: FUND_T.use })]);
    use.addEventListener('click', fundUse);
    var cancel = el('button', { type: 'button', class: 'btn btn--lg btn--secondary', 'data-fk': 'fund-cancel' }, [el('span', { text: FUND_T.cancel })]);
    cancel.addEventListener('click', fundCancel);
    box.appendChild(el('div', { class: 'dp-actions dp-fund__act' }, [use, cancel]));
    return box;
  }
  /** The card of the Impor tab (built once per Detail render, refilled by renderFunding). */
  function fundingCard() {
    var input = el('input', { type: 'file', class: 'sr-only', accept: '.xlsx,.xlsm,.xls,.csv', multiple: true, tabindex: '-1', 'aria-hidden': 'true' });
    input.addEventListener('change', function () { var f = Array.prototype.slice.call(input.files || []); input.value = ''; fundPick(f); });
    var now = el('p', { class: 'dp-icard__now', hidden: true });
    var body = el('div', { class: 'dp-fund__body' });
    var card = el('section', { class: 'dp-icard dp-fund', id: 'dp-funding', 'aria-labelledby': 'dp-funding-t' }, [
      el('h3', { class: 'dp-icard__t', id: 'dp-funding-t', text: FUND_T.title }),
      el('ul', { class: 'dp-icard__lines' }, FUND_LINES.map(function (t) { return el('li', { text: t }); })),
      now, body, input
    ]);
    ui.fund = { card: card, body: body, input: input, now: now };
    renderFunding();
    return card;
  }
  function renderFunding() {
    var f = ui && ui.fund;
    if (!f) return;
    var keep = focusKey();
    clear(f.body);
    f.card.setAttribute('aria-busy', FS.st === 'reading' ? 'true' : 'false');
    var ld = fundLoaded();
    f.now.hidden = !ld;
    f.now.textContent = ld ? fill(FUND_T.loaded, { tanggal: ld.asOf ? F().date(ld.asOf) : '—', n: nInt(ld.n) }) : '';
    if (!fundApi()) { f.body.appendChild(el('p', { class: 'dp-st__bad', text: FUND_T.noModule })); return; }
    if (FS.st === 'reading') {
      f.body.appendChild(el('p', { class: 'dp-icard__busy', role: 'status' }, [el('span', { class: 'dp-spin', 'aria-hidden': 'true' }), el('span', { text: FUND_T.reading })]));
      return;
    }
    if (FS.st === 'review' && FS.res) { f.body.appendChild(fundReport()); restoreFocus(keep); return; }
    if (FS.st === 'error' && FS.msg) f.body.appendChild(el('p', { class: 'dp-st__bad', role: 'alert', text: FS.msg }));
    if (FS.st === 'done') {
      var see = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'fund-see' }, [el('span', { text: FUND_T.see }), icon('chev-r', 'icon--12')]);
      /* V8 final fix: land where the import shows (Detail › Status LVM & EDC › EDC tidak bertransaksi, with the rank line),
         not in whatever Merchant state was last used */
      see.addEventListener('click', function () { goSection('merchants', 'merchants:idle'); });
      f.body.appendChild(el('div', { class: 'dp-callout dp-callout--ok dp-fund__done' }, [icon('check', 'icon--12'), el('p', { text: fill(FUND_T.ready, { n: nInt(FS.doneN) }) }), el('div', { class: 'dp-actions' }, [see])]));
    }
    var pick = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'fund-pick' }, [icon('upload', 'icon--12'), el('span', { text: FUND_T.pick })]);
    pick.addEventListener('click', function () { f.input.click(); });
    f.body.appendChild(el('div', { class: 'dp-actions' }, [pick]));
    f.body.appendChild(el('p', { class: 'dp-fine', text: FUND_T.hint }));
    if (FS.after) f.body.appendChild(el('p', { class: 'dp-fine dp-fund__after', text: FUND_T.notKept }));
    restoreFocus(keep);
  }

  /* V8 §4.2.3: the KPI workbook goes through the generic Impor (MCD.kpi.workbookReader); this card is the target of
     the action data:kpi and says what the file gives. */
  function kpiCard() {
    var R = MCD.kpi && MCD.kpi.workbookReader;
    if (!R) return null;
    var pick = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'kpi-pick' }, [icon('upload', 'icon--12'), el('span', { text: 'Pilih file KPI' })]);
    pick.addEventListener('click', pickFiles);
    var now = el('p', { class: 'dp-icard__now', hidden: true });
    ui.kpiNow = now;
    renderKpiNow();
    return el('section', { class: 'dp-icard dp-kpicard', id: 'dp-kpi', 'aria-labelledby': 'dp-kpi-t' }, [
      el('h3', { class: 'dp-icard__t', id: 'dp-kpi-t', text: V8_ENTRY.kpi.label }),
      el('ul', { class: 'dp-icard__lines' }, ['Laporan KPI area bulanan apa adanya, seperti yang dikirim kantor area.', 'File dikenali dari nama sheet. Hasilnya tampil di Posisi cabang.']
        .map(function (t) { return el('li', { text: t }); })),
      now, el('div', { class: 'dp-actions' }, [pick])
    ]);
  }
  function renderKpiNow() {
    var n = ui && ui.kpiNow;
    if (!n) return;
    var sets = realSets(), c = catalogEntry('kpi'), cnt = c ? entryCount(sets, c) : 0, m = c ? entryMeta(sets, c) : {};
    n.hidden = !cnt;
    n.textContent = cnt ? 'Data per ' + (m.asOf ? F().date(m.asOf) : '—') + ' · diimpor ' + (m.importedAt ? F().dateTime(m.importedAt) : '—') : '';
  }
  /** "Impor daftar leads" (MCD.leadsUi.importFlow, V7 §9.2): the module draws nothing while the lead switch is off. */
  function leadsImportHost() {
    var LU = MCD.leadsUi, host = el('div', { class: 'dp-luimp', id: 'dp-leads-import' });
    if (!LU || typeof LU.importFlow !== 'function') return host;
    try { ui.luImport = LU.importFlow(host, leadsCtx()); } catch (e) { ui.luImport = null; if (W.console) W.console.warn('[data] lead import card failed', e && e.message); }
    return host;
  }
  function leadsCtx() {
    return {
      saveEncrypted: function () { saveCopy(); },
      toast: function (m, k) { if (ctx) ctx.toast(m, k); },
      onSwitch: function (on) { renderPolicy(); renderSaveBits(); if (on) focusPolicy('leads'); },
      openThresholds: function () { goTab('policy'); focusPolicy('leads'); }
    };
  }
  /** Scrolls a block into view after the shell's own scroll restore, and focuses `pick(block)` unless the user is typing. */
  function bringTo(id, pick, force) {
    [80, 450].forEach(function (ms) {
      setTimeout(function () {
        var c = DOC.getElementById(id);
        if (!c || !ctx) return;
        var top = c.getBoundingClientRect().top;
        if ((top < 0 || top > (W.innerHeight || 800) * 0.6) && c.scrollIntoView) c.scrollIntoView({ block: 'start' });
        var b = pick ? pick(c) : null, act = DOC.activeElement;
        if (!b || b.disabled || act === b) return;
        if (!force && act && /^(INPUT|TEXTAREA|SELECT)$/.test(act.tagName)) return;
        try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
      }, ms);
    });
  }

  /* ============================ V8: tab "Kebijakan & leads" (V7 §8 as trimmed by D41, D51, D52; V8 §4.2.2) */

  var POL_T = {
    banner: 'Angka kebijakan berlaku sampai dashboard dikunci. Simpan salinan terenkripsi agar terbuka lagi.',
    save: 'Simpan salinan terenkripsi', print: 'Halaman ini memuat data bank dan tidak dicetak dari dashboard.',
    cardTitle: 'Angka kebijakan bank (diisi cabang)', noDefault: 'Dashboard tidak memiliki angka kebijakan bawaan.',
    thrFirst: 'Isi ambang sebelum impor. Aturan dengan ambang kosong tidak menghasilkan leads.', thrAfter: 'Setelah ambang diubah, impor ulang file leads.',
    empty: 'Belum diisi', complete: 'Lengkap · diisi {tanggal}', incomplete: 'Belum lengkap: {n} angka', optional: 'opsional',
    actor: 'Inisial petugas', actorHint: 'Isi 2 sampai 4 huruf, misalnya AB.',
    savePolicy: 'Simpan angka kebijakan', clearPolicy: 'Kosongkan angka kebijakan', saveThr: 'Simpan ambang',
    saved: 'Angka kebijakan disimpan untuk sesi ini', nothing: 'Tidak ada yang berubah', cleared: 'Angka kebijakan dikosongkan untuk sesi ini',
    kprAsumsi: 'Jika kosong, simulator KPR menggunakan asumsi {x}% dari Pengaturan & sumber.',
    clearBody: 'Angka kebijakan di kartu ini dikosongkan untuk sesi ini.\nRiwayat tetap mencatat perubahan ini.',
    logTitle: 'Riwayat kebijakan dan leads', logMore: 'Tampilkan 20 berikutnya', logEmpty: 'Belum ada catatan di sesi ini.',
    logLine1: 'Riwayat ini catatan bantu cabang dan ikut tersimpan di salinan terenkripsi.',
    logLine2: 'Catatan persetujuan Kepala cabang tetap disimpan pemilik dashboard.', logCap: 'Riwayat menyimpan {n} catatan terakhir.',
    footer: 'Simpan salinan terenkripsi agar kebijakan dan daftar leads terbuka lagi saat masuk berikutnya.',
    noModule: 'Kebijakan bank belum termuat. Muat ulang halaman.', blank: 'kosong'
  };
  var LOG_PAGE = 20;
  function policyApi() { var P = MCD.policy; return P && typeof P === 'object' && typeof P.set === 'function' && typeof P.get === 'function' ? P : null; }
  function leadsOn() { var L = MCD.leads; return !!(L && typeof L.enabled === 'function' && call(L.enabled, L)); }
  /** What "Simpan salinan terenkripsi" carries for the policy module and the lead switch (V8 §3.6). */
  function policyKeep() {
    var P = policyApi(), LU = MCD.leadsUi, out = { any: false, dirty: false };
    if (P) {
      var d = isFn(P.dirty) ? call(P.dirty, P) === true : false, a = isFn(P.all) ? call(P.all, P) : null, h = isFn(P.history) ? call(P.history, P) : null;
      out.dirty = d;
      out.any = d || !!(a && a.values && Object.keys(a.values).length) || !!(h && h.length);
    }
    if (LU && isFn(LU.dirty) && call(LU.dirty, LU) === true) { out.dirty = true; out.any = true; }
    return out;
  }
  function groupDef(id) { var P = policyApi(); return P && Array.isArray(P.GROUPS) ? P.GROUPS.filter(function (g) { return g && g.id === id; })[0] || null : null; }
  function fieldId(key) { return 'pol-' + String(key).replace(/[^a-zA-Z0-9]+/g, '-'); }
  function statusText(st) {
    if (!st) return '';
    if (st.complete) return fill(POL_T.complete, { tanggal: st.date ? F().date(String(st.date).slice(0, 10)) : '—' });
    if (st.missing && st.missing.length) return fill(POL_T.incomplete, { n: nInt(st.missing.length) });
    return POL_T.optional;
  }
  /** One policy field (no <form>; autocomplete, spellcheck and the browser's own translation off; D18: no example number). */
  function policyField(key) {
    var P = policyApi(), id = fieldId(key), unit = (P.UNITS || {})[key], cur = P.get(key);
    var inp = el('input', { class: 'input dp-in dp-pol__in', id: id, name: id, type: 'text', inputmode: unit === 'pct' ? 'decimal' : 'numeric', autocomplete: 'off',
      'data-fk': id, 'aria-describedby': id + '-h ' + id + '-e', attrs: { spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }, value: P.format(key) });
    inp.addEventListener('blur', function () { if (!str(inp.value)) { fieldErr(id, ''); return; } var r = P.parse(key, inp.value); fieldErr(id, r && r.ok ? '' : (r && r.pesan) || ''); });
    inp.addEventListener('input', function () { fieldErr(id, ''); });
    var tag = cur === null ? el('span', { class: 'tag dp-tag dp-tag--empty', text: POL_T.empty }) : null;
    var row = fieldRow(id, (P.LABELS || {})[key] || key, inp, (P.HINTS || {})[key] || null, tag, unit === 'pct' ? '%' : null);
    if (!(P.HINTS || {})[key]) row.appendChild(el('p', { class: 'sr-only', id: id + '-h' }));
    return row;
  }
  function actorField(prefix) {
    var P = policyApi(), id = 'pol-actor-' + prefix;
    var inp = el('input', { class: 'input dp-in dp-pol__actor', id: id, name: id, type: 'text', maxLength: 4, autocomplete: 'off', 'data-fk': id,
      'aria-describedby': id + '-h ' + id + '-e', attrs: { spellcheck: 'false', autocapitalize: 'characters', autocorrect: 'off' }, value: (P && isFn(P.actor) && P.actor()) || '' });
    inp.addEventListener('input', function () { fieldErr(id, ''); });
    return fieldRow(id, POL_T.actor, inp, POL_T.actorHint, null);
  }
  /** Validates the fields of `keys` and the initials, then MCD.policy.set (it logs the Riwayat entry, D27). */
  function savePolicy(keys, prefix) {
    var P = policyApi();
    if (!P || !ctx) return;
    if (demoOn()) { ctx.toast((P.MESSAGES && P.MESSAGES.demo) || 'Tidak tersedia saat Data contoh aktif.', 'warn'); return; }
    var patch = {}, bad = null;
    keys.forEach(function (k) {
      var id = fieldId(k), node = DOC.getElementById(id);
      if (!node) return;
      var raw = node.value, cur = P.get(k);
      if (!str(raw)) { fieldErr(id, ''); if (cur !== null) patch[k] = ''; return; }
      var r = P.parse(k, raw);
      if (!r || !r.ok) { fieldErr(id, (r && r.pesan) || ''); bad = bad || node; return; }
      fieldErr(id, '');
      if (r.value !== cur) patch[k] = raw;
    });
    var aid = 'pol-actor-' + prefix, an = DOC.getElementById(aid), a = isFn(P.setActor) ? P.setActor(an ? an.value : '') : { ok: true };
    if (!a.ok) { fieldErr(aid, a.pesan || POL_T.actorHint); bad = bad || an; } else fieldErr(aid, '');
    if (bad) { if (isFn(bad.focus)) bad.focus(); return; }
    if (!Object.keys(patch).length) { ctx.toast(POL_T.nothing); return; }
    var res = P.set(patch, { source: 'user' });
    if (!res || !res.ok) {
      var first = null;
      ((res && res.errors) || []).forEach(function (e) {
        if (e && e.key && DOC.getElementById(fieldId(e.key))) { fieldErr(fieldId(e.key), e.pesan || ''); first = first || DOC.getElementById(fieldId(e.key)); }
        else if (e && e.pesan) ctx.toast(e.pesan, 'warn');
      });
      if (first) first.focus();
      return;
    }
    ctx.toast(POL_T.saved);
    renderPolicy(true);
    restoreFocus(prefix === 'thr' ? 'pol-save-thr' : 'pol-save-card');
  }
  function clearPolicyCard() {
    var P = policyApi();
    if (!P || !ctx) return;
    if (demoOn()) { ctx.toast((P.MESSAGES && P.MESSAGES.demo) || 'Tidak tersedia saat Data contoh aktif.', 'warn'); return; }
    var aid = 'pol-actor-card', an = DOC.getElementById(aid), a = isFn(P.setActor) ? P.setActor(an ? an.value : '') : { ok: true };
    if (!a.ok) { fieldErr(aid, a.pesan || POL_T.actorHint); if (an) an.focus(); return; }
    fieldErr(aid, '');
    ctx.confirm({ title: POL_T.clearPolicy, danger: true, ok: POL_T.clearPolicy, cancel: 'Batal', body: POL_T.clearBody }).then(function (yes) {
      if (!yes || !policyApi()) return;
      var changed = P.clear();
      ctx.toast(changed && changed.length ? POL_T.cleared : POL_T.nothing);
      renderPolicy(true);
    });
  }
  /** "Angka kebijakan bank (diisi cabang)": only while KPR is shown (D52); its one group "KPR (opsional)". */
  function policyCard() {
    var P = policyApi();
    if (!P || !sectionShown('property')) return null;
    var groups = (P.GROUPS || []).filter(function (g) { return g && g.id !== 'leads'; }), keys = [];
    var card = el('section', { class: 'dp-pol-card dp-polc', id: 'dp-polc', 'aria-labelledby': 'dp-polc-t', attrs: { translate: 'no' } }, [
      el('h3', { class: 'dp-pol-card__t', id: 'dp-polc-t', text: POL_T.cardTitle }),
      el('p', { class: 'dp-p', text: POL_T.noDefault })
    ]);
    groups.forEach(function (g) {
      var st = isFn(P.groupStatus) ? P.groupStatus(g.id) : null;
      card.appendChild(el('div', { class: 'dp-pol__gh' }, [el('h4', { class: 'dp-h3', text: g.label }), el('span', { class: 'dp-pol__st' + (st && st.complete ? ' is-ok' : ''), text: statusText(st) })]));
      g.keys.forEach(function (k) { keys.push(k); card.appendChild(policyField(k)); });
      if (g.id === 'kpr' && isFn(P.forKpr)) {
        var fk = P.forKpr();
        if (fk && fk.source === 'asumsi' && isNum(fk.pct)) card.appendChild(el('p', { class: 'dp-fine', text: fill(POL_T.kprAsumsi, { x: F().num(fk.pct, fk.pct % 1 ? 1 : 0) }) }));
      }
    });
    card.appendChild(actorField('card'));
    var save = el('button', { type: 'button', class: 'btn btn--primary', 'data-fk': 'pol-save-card' }, [icon('check', 'icon--12'), el('span', { text: POL_T.savePolicy })]);
    save.addEventListener('click', function () { savePolicy(keys, 'card'); });
    var clr = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'pol-clear-card' }, [el('span', { text: POL_T.clearPolicy })]);
    clr.addEventListener('click', clearPolicyCard);
    card.appendChild(el('div', { class: 'dp-actions' }, [save, clr]));
    return card;
  }
  /** "Ambang daftar leads" (V7 §8.2 as trimmed by D41): only while the lead list is on. */
  function thresholdsCard() {
    var P = policyApi(), g = groupDef('leads');
    if (!P || !g || !leadsOn()) return null;
    var st = isFn(P.groupStatus) ? P.groupStatus('leads') : null;
    var card = el('section', { class: 'dp-pol-card dp-thr', id: 'dp-thr', 'aria-labelledby': 'dp-thr-t', attrs: { translate: 'no' } }, [
      el('div', { class: 'dp-pol__gh' }, [el('h3', { class: 'dp-pol-card__t', id: 'dp-thr-t', text: g.label }), el('span', { class: 'dp-pol__st' + (st && st.complete ? ' is-ok' : ''), text: statusText(st) })]),
      el('p', { class: 'dp-p', text: POL_T.thrFirst })
    ]);
    g.keys.forEach(function (k) { card.appendChild(policyField(k)); });
    card.appendChild(actorField('thr'));
    var save = el('button', { type: 'button', class: 'btn btn--primary', 'data-fk': 'pol-save-thr' }, [icon('check', 'icon--12'), el('span', { text: POL_T.saveThr })]);
    save.addEventListener('click', function () { savePolicy(g.keys, 'thr'); });
    card.appendChild(el('div', { class: 'dp-actions' }, [save]));
    card.appendChild(el('p', { class: 'dp-fine', text: POL_T.thrAfter }));
    return card;
  }
  /** "Riwayat kebijakan dan leads" (V7 §8.5): newest first, 20 rows a page, read-only; hidden under Data contoh. */
  function historyBlock() {
    var P = policyApi();
    if (!P || !isFn(P.history) || demoOn()) return null;
    var list = P.history() || [], shown = Math.max(LOG_PAGE, S.logShown || LOG_PAGE);
    var det = el('details', { class: 'dp-pol__log', id: 'dp-pol-log', open: S.logOpen ? true : null });
    det.addEventListener('toggle', function () { S.logOpen = !!det.open; });
    det.appendChild(el('summary', { class: 'dp-pol__logsum' }, [el('span', { text: POL_T.logTitle }), list.length ? el('span', { class: 'dp-pol__logn', text: nInt(list.length) }) : null]));
    var ol = el('ol', { class: 'dp-pol__rows' });
    list.slice(0, shown).forEach(function (e) {
      var d = isFn(P.describe) ? P.describe(e) : { text: '', changes: [] };
      if (!d || !d.text) return;
      var li = el('li', { class: 'dp-pol__row' }, [el('span', { class: 'dp-pol__at', text: F().dateTime(e.at) }), el('span', { class: 'dp-pol__txt', text: d.text })]);
      if (d.changes && d.changes.length) {
        li.appendChild(el('details', { class: 'dp-pol__chg' }, [el('summary', { text: 'Rincian' }),
          el('ul', null, d.changes.map(function (c) { return el('li', { text: (c.name || c.key) + ': ' + (c.from || POL_T.blank) + ' → ' + (c.to || POL_T.blank) }); }))]));
      }
      ol.appendChild(li);
    });
    det.appendChild(ol.firstChild ? ol : el('p', { class: 'dp-fine', text: POL_T.logEmpty }));
    if (list.length > shown) {
      var more = el('button', { type: 'button', class: 'btn btn--secondary', 'data-fk': 'pol-log-more' }, [el('span', { text: POL_T.logMore })]);
      more.addEventListener('click', function () { S.logShown = shown + LOG_PAGE; renderPolicy(); restoreFocus('pol-log-more'); });
      det.appendChild(el('div', { class: 'dp-actions' }, [more]));
    }
    det.appendChild(el('p', { class: 'dp-fine', text: POL_T.logLine1 + '\n' + POL_T.logLine2 }));
    if (isFn(P.capped) && P.capped()) det.appendChild(el('p', { class: 'dp-fine', text: fill(POL_T.logCap, { n: nInt(P.LOG_MAX || 500) }) }));
    return det;
  }
  /** The tab frame (built once per Detail render); the lead card is mounted once and follows MCD.leadsUi itself. */
  function policyPanel(panel) {
    var p = ui.pol = {
      print: el('p', { class: 'dp-print-line', text: POL_T.print }),
      banner: el('div', { class: 'dp-pol__banner' }),
      grid: el('div', { class: 'dp-pol__grid' }),
      card: el('div', { class: 'dp-pol__col dp-pol__col--card' }),
      side: el('div', { class: 'dp-pol__col' }),
      lead: el('div', { class: 'dp-pol__lead', id: 'dp-leads' }),
      thr: el('div', { class: 'dp-pol__thr' }),
      log: el('div', { class: 'dp-pol__logwrap' })
    };
    p.side.appendChild(p.lead);
    p.side.appendChild(p.thr);
    p.grid.appendChild(p.card);
    p.grid.appendChild(p.side);
    var x = exhibit('dp-policy', 'Kebijakan bank dan daftar leads', 'Angka yang diisi cabang dan daftar leads dengan CIF disamarkan · hanya di komputer ini', null,
      'Sumber: angka yang diisi cabang · terenkripsi di salinan terenkripsi');
    x.el.setAttribute('translate', 'no');
    x.el.appendChild(p.banner);
    if (!policyApi()) x.el.appendChild(el('p', { class: 'dp-st__bad', text: POL_T.noModule }));
    x.el.appendChild(p.grid);
    x.el.appendChild(p.log);
    x.el.appendChild(el('p', { class: 'dp-fine dp-pol__foot', text: POL_T.footer }));
    x.el.appendChild(x.src);
    panel.appendChild(p.print);
    panel.appendChild(x.el);
    var LU = MCD.leadsUi;
    if (LU && isFn(LU.settingsCard)) {
      try { ui.luCard = LU.settingsCard(p.lead, leadsCtx()); } catch (e) { ui.luCard = null; if (W.console) W.console.warn('[data] lead card failed', e && e.message); }
    }
    renderPolicy();
  }
  /**
   * The parts that follow MCD.policy and the lead switch: banner, KPR card, thresholds card, Riwayat. An outside change
   * (a lead event, a data refresh) never rebuilds the fields while staff type in one; this tab's own save does (force).
   */
  function renderPolicy(force) {
    var p = ui && ui.pol, P = policyApi();
    if (!p) return;
    var keep = focusKey(), typing = !force && DOC.activeElement && p.grid.contains(DOC.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(DOC.activeElement.tagName);
    clear(p.banner);
    if (P && isFn(P.dirty) && P.dirty() && !demoOn()) {
      var sv = el('button', { type: 'button', class: 'btn btn--primary', 'data-fk': 'pol-banner-save' }, [svgIcon('shield', 'icon--12'), el('span', { text: POL_T.save })]);
      sv.addEventListener('click', saveCopy);
      p.banner.appendChild(el('div', { class: 'dp-callout dp-callout--mid', role: 'status' }, [icon('warn', 'icon--12'), el('p', { text: POL_T.banner }), sv]));
    }
    /* a card that appears or goes (the lead switch, KPR shown) is always redrawn; while staff type, a card that stays
       keeps its fields and only its status line follows */
    var wantCard = !!(P && sectionShown('property')), wantThr = !!(P && groupDef('leads') && leadsOn());
    if (!typing || wantCard !== !!p.card.firstChild) {
      clear(p.card);
      var pc = policyCard();
      if (pc) p.card.appendChild(pc);
      p.card.hidden = !pc;
      p.grid.classList.toggle('has-card', !!pc);
    } else statusInPlace(p.card, 'kpr');
    if (!typing || wantThr !== !!p.thr.firstChild) {
      clear(p.thr);
      var tc = thresholdsCard();
      if (tc) p.thr.appendChild(tc);
      p.thr.hidden = !tc;
    } else statusInPlace(p.thr, 'leads');
    clear(p.log);
    var hb = historyBlock();
    if (hb) p.log.appendChild(hb);
    restoreFocus(keep);
  }
  function statusInPlace(host, id) {
    var P = policyApi(), n = host && host.querySelector ? host.querySelector('.dp-pol__st') : null;
    if (!P || !n || !isFn(P.groupStatus)) return;
    var st = P.groupStatus(id);
    n.textContent = statusText(st);
    n.classList.toggle('is-ok', !!(st && st.complete));
  }
  /** data:policy and data:leads: this tab, then the first empty threshold (lead list on), the KPR field, else the switch. */
  function focusPolicy(kind) {
    bringTo(kind === 'leads' ? 'dp-leads' : 'dp-policy', function () {
      var P = policyApi(), g = groupDef('leads');
      if (P && g && leadsOn() && DOC.getElementById('dp-thr')) {
        var req = g.keys.filter(function (k) { return (P.OPTIONAL || []).indexOf(k) < 0; }), miss = isFn(P.missing) ? P.missing(req) : req;
        if (kind !== 'leads' || miss.length) return DOC.getElementById(fieldId(miss[0] || g.keys[0]));
      }
      if (kind !== 'leads' && DOC.getElementById('dp-polc')) {
        var k0 = (groupDef('kpr') || { keys: [] }).keys[0];
        if (k0) return DOC.getElementById(fieldId(k0));
      }
      var lead = DOC.getElementById('dp-leads');
      return lead ? lead.querySelector('.lu-switch') : null;
    });
  }
  function onPolicyChange() { if (ctx && ui) { renderPolicy(); renderSaveBits(); } }

  /* --- page assembly ------------------------------------------------------ */

  function render(body, c) {
    var input = el('input', { type: 'file', class: 'sr-only', accept: '.csv,.txt,.xlsx,.xlsm,.xls', multiple: true, tabindex: '-1', 'aria-hidden': 'true' });
    input.addEventListener('change', function () { var f = Array.prototype.slice.call(input.files || []); input.value = ''; stageFiles(f); });
    ui = { root: body, input: input };
    body.appendChild(input);
    if (!deep()) renderOverview(body); else renderDeep(body);
    renderLog();
    var queued = c.takeFiles();
    if (queued.length) stageFiles(queued);
  }

  function progressEl() {
    var prog = el('div', { class: 'dp-progress', hidden: true, role: 'status' }, [el('div', { class: 'dp-progress__bar' }, [el('i')]), el('p', { class: 'dp-progress__t' })]);
    ui.progress = prog; ui.progressBar = prog.firstChild; ui.progressText = prog.lastChild;
    return prog;
  }

  function renderOverview(body) {
    var wrap = el('div', { class: 'dp-ov' });
    ui.status = el('p', { class: 'dp-ov__status', role: 'status' });
    ui.ovReview = el('div', { class: 'dp-ov__review', hidden: true });
    ui.cards = el('div', { class: 'dp-cards', role: 'list', 'aria-label': 'File bank dan salinan terenkripsi' });
    wrap.appendChild(ui.status);
    wrap.appendChild(progressEl());
    wrap.appendChild(ui.ovReview);
    wrap.appendChild(ui.cards);
    wrap.appendChild(freshLegend(true));
    var see = el('button', { type: 'button', class: 'btn btn--secondary dp-ov__see' }, [el('span', { text: 'Lihat pemeriksaan lengkap' }), icon('chev-r', 'icon--12')]);
    see.addEventListener('click', function () { ctx.setView('deep'); });
    wrap.appendChild(el('div', { class: 'dp-ov__links' }, [templateLink('btn--secondary', 'Unduh template permintaan data'), see]));
    var logList = el('ol', { class: 'dp-log', 'aria-live': 'polite' });
    ui.log = logList;
    ui.logWrap = el('details', { class: 'dp-ov__log', hidden: true }, [el('summary', { text: 'Yang terjadi' }), logList]);
    wrap.appendChild(ui.logWrap);
    var sw = MCD.demo && MCD.demo.switchEl ? MCD.demo.switchEl() : null;
    /* the line beside the switch is a repeated hint (item 39e): once per browser with MCD.windows.hint; the switch stays */
    if (sw) wrap.appendChild(el('div', { class: 'dp-ov__demo' }, [hintOnce('dp-demo-try', el('p', { class: 'dp-ov__demo-t', text: 'Data contoh dapat digunakan untuk mencoba tanpa file. Panel merchant, EDC dan sekolah terisi angka contoh bertanda CONTOH.' })), sw]));
    wrap.appendChild(el('p', { class: 'dp-ov__lock' }, [svgIcon('shield', 'icon--12'), el('span', { text: 'Laporan LVM memuat data pribadi. File hanya dibaca di komputer ini: data pemilik dihapus dan sisanya tetap terenkripsi di sini. Jangan mengunggah atau menyimpan file ini ke repositori.' })]));
    body.appendChild(wrap);
    setProgress(S.progress);
    renderOverviewState();
  }

  /* V8 R5, §4.2.2: "Kebijakan & leads" between File dimuat and Simpan & kata sandi */
  var TABS = [{ id: 'import', label: 'Impor' }, { id: 'loaded', label: 'File dimuat' }, { id: 'policy', label: 'Kebijakan & leads' },
    { id: 'save', label: 'Simpan & kata sandi' }, { id: 'settings', label: 'Pengaturan & sumber' }];
  function tabOk(id) { return TABS.some(function (t) { return t.id === id; }); }
  /** Shows one tab (the shell's ctx.tabs when present, A-09; else an equivalent tablist). */
  function goTab(id) {
    if (!tabOk(id)) id = 'import';
    S.tab = id;
    if (!ctx) return;
    if (!deep()) { ctx.setView('deep'); return; }
    showTab(id);
  }
  function showTab(id) {
    if (!ui || !ui.panels) return;
    S.tab = id;
    Object.keys(ui.panels).forEach(function (k) { ui.panels[k].hidden = k !== id; });
    if (ui.tabs && typeof ui.tabs.set === 'function' && (!ui.tabs.get || ui.tabs.get() !== id)) ui.tabs.set(id);
    if (id === 'loaded') { renderLoaded(); renderCheck(); ensureMatch(); }
    if (id === 'save') renderSaveBits();
    if (id === 'policy') renderPolicy();
    if (id === 'import') { renderFunding(); renderKpiNow(); }
  }
  function makeTabs(host, panel) {
    var active = tabOk(S.tab) ? S.tab : 'import';
    if (ctx && typeof ctx.tabs === 'function') {
      try { var t = ctx.tabs(host, { items: TABS, active: active, panel: panel, label: 'Data & Privasi', onChange: function (id) { showTab(id); } }); if (t && t.el) { if (!t.el.parentNode) host.appendChild(t.el); return t; } } catch (e) { /* own tabs below */ }
    }
    var cur = active;
    var list = el('div', { class: 'dp-tabs', role: 'tablist', 'aria-label': 'Data & Privasi' });
    var btns = TABS.map(function (t, k) {
      var b = el('button', { type: 'button', class: 'dp-tab', role: 'tab', id: 'dp-tab-' + t.id, 'aria-selected': 'false', tabindex: '-1', text: t.label });
      b.addEventListener('click', function () { showTab(t.id); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var n = TABS[(k + (e.key === 'ArrowLeft' ? -1 : 1) + TABS.length) % TABS.length];
        showTab(n.id); btns[TABS.indexOf(n)].focus();
      });
      list.appendChild(b);
      return b;
    });
    host.appendChild(list);
    return { el: list, get: function () { return cur; }, set: function (id) { cur = id; btns.forEach(function (b, k) { var on = TABS[k].id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); } };
  }

  function renderDeep(body) {
    var tabHost = el('div', { class: 'dp-tabhost' });
    var panelWrap = el('div', { class: 'dp-panels', role: 'tabpanel' });
    body.appendChild(tabHost);
    body.appendChild(panelWrap);
    ui.panels = {};
    TABS.forEach(function (t) { ui.panels[t.id] = el('div', { class: 'dp-panel dp-panel--' + t.id, 'data-tab': t.id, hidden: true }); panelWrap.appendChild(ui.panels[t.id]); });

    // Impor: the drop zone first
    var ix = exhibit('dp-import', '', '', null, 'Sumber: file yang Anda pilih · dibaca di browser ini · 0 byte diunggah');
    ui.importX = ix;
    var tpl = templateLink('btn--secondary', 'Unduh template permintaan data');
    ui.drop = el('div', { class: 'dp-drop-row' }, [dropZone(true, true), el('div', { class: 'dp-drop-side' }, [
      el('p', { class: 'dp-p' }, [el('strong', { text: 'Livin’ Merchant: ' }), 'letakkan laporan bulanan “Rev LVM” persis seperti yang dikirim kantor area. Sheet rincian dan sheet UREG / USAK dibaca bersama.']),
      el('p', { class: 'dp-p' }, [el('strong', { text: 'EDC Mandiri dan nasabah SMA: ' }), 'isi template permintaan data, satu sheet per file, atau file CSV dengan kolom yang sama. Beberapa file dapat dimasukkan sekaligus.']),
      /* V8 (§4.2.3, D45): the funding merchant files and the KPI workbook are recognised as they are */
      el('p', { class: 'dp-p' }, [el('strong', { text: 'Funding merchant dan KPI area: ' }), 'letakkan file apa adanya. Jenis file dikenali dari nama sheet dan judul kolomnya.']),
      tpl,
      el('p', { class: 'dp-fine' }, [el('code', { text: TEMPLATE })])
    ])]);
    ix.el.appendChild(ui.drop);
    ix.el.appendChild(progressEl());
    ui.review = el('div', { class: 'dp-review', hidden: true, 'aria-live': 'polite' });
    ix.el.appendChild(ui.review);
    ui.after = el('div', { class: 'dp-afterwrap' });
    ix.el.appendChild(ui.after);
    var logList = el('ol', { class: 'dp-log', 'aria-live': 'polite' });
    ui.log = logList;
    ui.logWrap = el('div', { class: 'dp-logwrap', hidden: true }, [el('h3', { class: 'dp-h3', text: 'Riwayat' }), logList]);
    ix.el.appendChild(ui.logWrap);
    ix.el.appendChild(el('details', { class: 'dp-guide-wrap' }, [el('summary', { class: 'dp-guide-wrap__sum' }, [el('span', { text: 'Panduan kolom' }), el('span', { class: 'dp-fine', text: 'sheet dan nama kolom yang dapat digunakan setiap file' })]), columnGuide()]));
    ix.el.appendChild(ix.src);
    ui.panels.import.appendChild(ix.el);
    /* V8: the import rows with their own flow (funding merchant, D45), the KPI file card and "Impor daftar leads" */
    ui.panels.import.appendChild(el('div', { class: 'dp-icards' }, [fundingCard(), kpiCard()]));
    ui.panels.import.appendChild(leadsImportHost());
    // Kebijakan & leads (V7 §8 as trimmed by D41, D51, D52)
    policyPanel(ui.panels.policy);

    // File dimuat: loaded datasets and the LVM file check
    var lx = exhibit('dp-loaded', '', '', null, 'Sumber: salinan terenkripsi dan file yang diimpor · hanya di komputer ini');
    ui.loadedX = lx;
    ui.loaded = el('div', { class: 'dp-loaded' });
    lx.el.appendChild(ui.loaded);
    lx.el.appendChild(lx.src);
    ui.panels.loaded.appendChild(lx.el);
    var cx = exhibit('dp-check', '', '', null, ' ');
    ui.checkX = cx;
    ui.check = el('div', { class: 'dp-ck' });
    ui.checkMsg = el('div', { class: 'dp-ck__msg' });
    function panel(key, wide) {
      var t = el('h3', { class: 'dp-ck__t' }), host = el('div', { class: 'dp-ck__chart dp-ck__chart--' + key }), n = el('p', { class: 'dp-fine dp-ck__note' });
      var box = el('div', { class: 'dp-ck__panel' + (wide ? ' is-wide' : '') }, [t, host, n]);
      return { box: box, t: t, host: host, n: n };
    }
    var p1 = panel('lokasi', true), p2 = panel('loc'), p3 = panel('kpi'), p4 = panel('edc', true);
    ui.ckPlaceT = p1.t; ui.ckPlace = p1.host; ui.ckPlaceN = p1.n;
    ui.ckLocT = p2.t; ui.ckLoc = p2.host; ui.ckLocN = p2.n;
    ui.ckKpiT = p3.t; ui.ckKpi = p3.host; ui.ckKpiN = p3.n; ui.ckKpiBox = p3.box;
    ui.ckEdcT = p4.t; ui.ckEdc = p4.host; ui.ckEdcBox = p4.box;
    ui.checkGrid = el('div', { class: 'dp-ck__grid', hidden: true }, [p1.box, p2.box, p3.box, p4.box]);
    ui.check.appendChild(ui.checkMsg);
    ui.check.appendChild(ui.checkGrid);
    cx.el.appendChild(ui.check);
    cx.el.appendChild(cx.src);
    ui.panels.loaded.appendChild(cx.el);

    // Simpan & kata sandi (v6: the follow-up lists of this computer between the copy and the password)
    ui.panels.save.appendChild(saveBlock());
    ui.panels.save.appendChild(followupsBlock());
    ui.panels.save.appendChild(passwordBlock());
    // Pengaturan & sumber
    ui.panels.settings.appendChild(assumeBlock());
    ui.panels.settings.appendChild(googleBlock());
    ui.panels.settings.appendChild(demoBlock());
    ui.panels.settings.appendChild(privacyBlock());
    ui.panels.settings.appendChild(sourcesBlock());

    ui.tabs = makeTabs(tabHost, panelWrap);
    setProgress(S.progress);
    renderReview();
    renderLoaded();
    renderSaveBits();
    renderCheck();
    showTab(tabOk(S.tab) ? S.tab : 'import');
    if (S.tab === 'loaded') ensureMatch();
    if (S.scrollTo) { var to = S.scrollTo; S.scrollTo = null; bringTo(to, function (c) { var u = c.querySelector('[data-fk="fund-use"]'); return u && !u.disabled ? u : null; }, true); }
  }

  /* ------------------------------------------------------------ the page */

  function cards() {
    if (!deep()) return [];
    var rs = realStatus(), ss = saveState(rs), st = saveTone(ss), w = rs.worst;
    var newest = rs.asOf ? freshness(1, { asOf: rs.asOf }) : null;
    return [
      { label: 'File bank dimuat', value: nInt(bankFiles(rs).n), tone: !rs.any ? 'none' : (rs.primaryLoaded === rs.primaryN ? 'ok' : 'mid'),
        explain: !rs.any ? 'Belum ada yang diimpor: mulai dengan laporan Rev LVM' : (function (bf) {
          return cap1(joinWords(bf.names)) + (bf.missing.length ? ' · belum diimpor: ' + joinWords(bf.missing) : '');
        })(bankFiles(rs)), demo: false, emptyNote: false },
      { label: 'Baris di dashboard', value: rs.rows, explain: 'Dari semua file yang dimuat', demo: false, emptyNote: false },
      { label: 'Tanggal data terbaru', value: rs.asOf ? F().date(rs.asOf) : null, tone: newest ? newest.tone : 'none',
        explain: rs.asOf ? (w && w.fresh.tone !== 'ok' ? (w.c.short || w.c.label) + ': ' + w.fresh.word.toLowerCase() : newest.word + ' · ' + ageText(newest)) : '', emptyNote: 'Belum ada file yang diimpor', demo: false },
      { label: 'Salinan terenkripsi', value: st.value, tone: st.tone,
        explain: { demo: 'Matikan Data contoh untuk menyimpan', empty: 'Impor data lebih dulu', downloaded: 'Pasang vault.js di folder data, lalu masuk kembali', invault: 'Dibuka dari data/vault.js', todo: 'Simpan agar data terbuka saat masuk berikutnya',
          fu: 'Simpan agar tindak lanjut terbawa ke komputer lain' }[ss],
        emptyNote: false, demo: false }
    ];
  }

  function makeSpec(c) {
    var ov = c.view() !== 'deep';
    var spec = {
      dataKeys: [],
      lede: ov ? 'Impor file bulanan cabang. Semua data tetap di komputer ini.'
        : 'Impor dan periksa file cabang, lalu simpan salinan terenkripsi.\nLihat juga posisi toko Livin’ Merchant dan atur asumsi.\nFile tidak pernah keluar dari komputer ini.',
      shows: ['Impor laporan bulanan Rev LVM apa adanya, ditambah file EDC dan SMA', 'File yang dimuat dan umur datanya (hijau, kuning, merah, abu-abu)',
        'Posisi toko Livin’ Merchant di peta', 'Simpan salinan terenkripsi agar data terbuka saat masuk berikutnya', 'Cara data pribadi dijaga'],
      needs: ['1_lvm', '2_edc', '3_sekolah'],
      source: 'Sumber: file Anda dan salinan terenkripsi · hanya dibaca di komputer ini',
      cards: cards,
      render: render,
      refresh: function (d, keys) {
        keys = keys || [];
        var all = keys.indexOf('*') >= 0;
        if (all || keys.indexOf('data') >= 0 || keys.indexOf('demo') >= 0) {
          renderLoaded(); renderSaveBits(); refreshGoogle(); renderFollowups(); renderFunding(); renderKpiNow(); renderPolicy();
          if (deep()) { renderReview(); renderCheck(); ensureMatch(); if (ui && ui.demoX) ui.demoX.title.textContent = demoOn() ? 'Data contoh aktif: angka bank hanya ilustrasi' : 'Data contoh mati: angka berasal dari file Anda dan sumber publik'; }
          else { renderOverviewState(); if (page && !all) page.refill(); }
        }
        if (keys.indexOf('privacy.reveal') >= 0 || keys.indexOf('privacy.veil') >= 0) { if (deep()) renderReview(); }
        if (keys.indexOf('settings') >= 0 && ui && ui.assumeForm && !ui.assumeForm.contains(DOC.activeElement)) fillAssumptions();
      }
    };
    // The footer's one primary button follows the state (Overview only; Deep dive shows "Back to Overview").
    Object.defineProperty(spec, 'primary', { enumerable: true, get: function () { return deep() ? null : primaryAction(); } });
    return spec;
  }

  /** integration 22 Oct 2026: a v6 file that lands while this page is open (V6_SPEC §8.1) fills its dates and the gap
      lines under the sources table in place ("Dimuat saat diperlukan" until then). */
  function onLazyData(e) {
    var n = e && e.detail && e.detail.name;
    if (!ui || !/^(school-students|campuses|school-contacts|institution-tiers|health-facilities)$/.test(String(n || ''))) return;
    var old = DOC.getElementById('dp-sources');
    if (!old || !old.parentNode) return;
    try { old.parentNode.replaceChild(sourcesBlock(), old); } catch (x) { /* the next visit shows them */ }
  }

  /* ------------------------------------------------------- registrations */

  MCD.sections = MCD.sections || {};
  var offSeal = null, offPol = [];
  MCD.sections[ID] = {
    mount: function (root, c) {
      ctx = c;
      ui = null;
      HINTS = {};
      page = c.page(makeSpec(c));
      /* v6: the follow-up card follows MCD.seal (its own on(), else the document event), and a lock closes the dialog */
      var Sl = sealApi();
      offSeal = null;
      if (Sl && isFn(Sl.on)) { var off = call(Sl.on, Sl, [onSeal]); offSeal = isFn(off) ? off : null; }
      if (!offSeal && isFn(DOC.addEventListener)) { DOC.addEventListener('mcd:seal', onSeal); offSeal = function () { DOC.removeEventListener('mcd:seal', onSeal); }; }
      if (isFn(DOC.addEventListener)) DOC.addEventListener('mcd:gate-locking', onLocking);
      if (isFn(DOC.addEventListener)) DOC.addEventListener('mcd:lazy', onLazyData);
      /* V8: the policy tab follows MCD.policy and the lead switch (their own on(), else their document events) */
      offPol = [];
      var Po = MCD.policy, LUo = MCD.leadsUi;
      if (Po && isFn(Po.on)) { var o1 = call(Po.on, Po, [onPolicyChange]); if (isFn(o1)) offPol.push(o1); }
      if (LUo && isFn(LUo.on)) { var o2 = call(LUo.on, LUo, [onPolicyChange]); if (isFn(o2)) offPol.push(o2); }
      if (!offPol.length && isFn(DOC.addEventListener)) {
        ['mcd:policy', 'mcd:leads'].forEach(function (ev) { DOC.addEventListener(ev, onPolicyChange); offPol.push(function () { DOC.removeEventListener(ev, onPolicyChange); }); });
      }
      c.registerCommands(function () {
        return [
          { label: 'Impor file data', kw: 'upload csv xlsx import rev lvm', run: function () { pickFiles(); } },
          { label: 'Unduh template permintaan data', kw: 'template xlsx permintaan', run: takeTemplate },
          { label: 'Simpan salinan terenkripsi', kw: 'vault save encrypt', run: saveCopy },
          { label: 'Hapus semua data dari dashboard', kw: 'clear wipe delete hapus memori', run: removeAll },
          { label: 'Isi kunci Google untuk Cek rating Google', kw: 'google places api key kunci rating ulasan', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:google' }); } },
          { label: 'Tindak lanjut di komputer ini', kw: 'tindak lanjut pipeline terenkripsi kata sandi lama hapus daftar', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:followups' }); } },
          { label: 'Impor file funding merchant', kw: 'funding merchant saldo merchant laporan region cilangkap merchant area', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:funding' }); } },
          { label: 'Impor file KPI bulanan area', kw: 'kpi area bulanan posisi cabang target', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:kpi' }); } },
          { label: 'Kebijakan & leads', kw: 'kebijakan ambang prioritas leads inisial riwayat', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:policy' }); } }
        ].concat(winApi('resetLayout') ? [{ label: 'Atur ulang tata letak kartu', kw: 'tata letak kartu panel reset posisi ukuran rapikan', run: resetLayout }] : []);
      });
    },
    update: function (d, keys) { if (page) page.update(d, keys); },
    unmount: function () {
      dropCharts();
      closeOldDialog();
      if (offSeal) { call(offSeal, null); offSeal = null; }
      (offPol || []).forEach(function (f) { call(f, null); });
      offPol = [];
      if (ui) [ui.luCard, ui.luImport].forEach(function (m) { if (m && isFn(m.destroy)) call(m.destroy, m); });
      if (isFn(DOC.removeEventListener)) DOC.removeEventListener('mcd:gate-locking', onLocking);
      if (isFn(DOC.removeEventListener)) DOC.removeEventListener('mcd:lazy', onLazyData);
      page = null; ui = null; ctx = null;
    },
    onFiles: function (files) { if (ctx) stageFiles(Array.prototype.slice.call(files || [])); },
    onAction: function (action) {
      var m = /^data:(import|loaded|policy|save|settings|google|followups|leads|kpi|funding)$/.exec(String(action || ''));
      if (!m) return false;
      /* V8 §4.2.2: data:policy (this tab, the first empty threshold), data:leads (the lead card and its thresholds),
         data:kpi and data:funding (Impor, the card with its button) */
      if (m[1] === 'policy' || m[1] === 'leads') { goTab('policy'); focusPolicy(m[1]); return true; }
      if (m[1] === 'kpi' || m[1] === 'funding') {
        goTab('import');
        var id = m[1] === 'kpi' ? 'dp-kpi' : 'dp-funding', fk = m[1] === 'kpi' ? 'kpi-pick' : 'fund-pick';
        bringTo(id, function (c) { return c.querySelector('[data-fk="' + fk + '"]') || c.querySelector('[data-fk="fund-use"]'); });
        return true;
      }
      if (m[1] === 'followups') {       // "Buka di Data & Privasi" from a Tindak lanjut tab (V6_SPEC §7.6): the card in Simpan & kata sandi
        goTab('save');
        [80, 450].forEach(function (ms) {
          setTimeout(function () {
            var c = DOC.getElementById('dp-followups');
            if (!c || !ctx) return;
            var top = c.getBoundingClientRect().top;
            if ((top < 0 || top > (W.innerHeight || 800) * 0.6) && c.scrollIntoView) c.scrollIntoView({ block: 'start' });
            var b = c.querySelector('[data-fk="fu-open"]'), act = DOC.activeElement;
            if (b && act !== b && !(act && /^(INPUT|TEXTAREA|SELECT)$/.test(act.tagName))) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
          }, ms);
        });
        return true;
      }
      if (m[1] === 'google') {          // "Isi kunci Google" from other sections: the card in Pengaturan & sumber
        goTab('settings');
        // The shell may restore the page's scroll position right after a mount, so look again a few times.
        [80, 450, 1000].forEach(function (ms) {
          setTimeout(function () {
            var c = DOC.getElementById('dp-google');
            if (!c || !ctx) return;
            var top = c.getBoundingClientRect().top;
            if ((top < 0 || top > (W.innerHeight || 800) * 0.6) && c.scrollIntoView) c.scrollIntoView({ block: 'start' });   // instant: a smooth scroll waits for animation frames
            var i = DOC.getElementById('gk-key'), act = DOC.activeElement;
            if (i) unfoldFor(i);
            // focus the key field unless the user is already typing somewhere (the shell may move focus after a mount)
            if (i && !i.disabled && act !== i && !(act && /^(INPUT|TEXTAREA|SELECT)$/.test(act.tagName))) { try { i.focus({ preventScroll: true }); } catch (e) { i.focus(); } }
          }, ms);
        });
        return true;
      }
      goTab(m[1]);
      return true;
    },
    layout: function () { return { posture: { deck: false, camera: null, rings: null }, padding: page ? page.padding() : undefined }; },
    _test: { saveStateOf: function (o) { var keep = { savedAt: S.savedAt, changed: S.changed }; S.savedAt = o.savedAt || null; S.changed = !!o.changed; var r = saveState({ any: o.any !== false, allVault: !!o.allVault }); S.savedAt = keep.savedAt; S.changed = keep.changed; return r; },
      tabs: TABS.map(function (t) { return t.id; }),
      v5: { hintOnce: hintOnce, blk: blk, foldIn: foldIn, unfoldFor: unfoldFor, sharedCard: sharedCard, resetLayout: resetLayout, layoutBlock: layoutBlock,
        hints: function () { return HINTS; },
        /* builds one card of the Detail tabs without the page (tests): 'google' | 'password' | 'assume' | 'privacy' */
        block: function (name) { ui = ui || { root: null }; return { google: googleBlock, password: passwordBlock, assume: assumeBlock, privacy: privacyBlock }[name](); } },
      /* v6 (V6_SPEC §7.5-7.6, §8) for tests/overview-data-v6.test.mjs */
      v6: { followups: followups, openOldAll: openOldAll, oldPwDialog: oldPwDialog, closeOldDialog: closeOldDialog, dialog: function () { return DLG; },
        saveState: function () { return saveState(realStatus()); }, realStatus: realStatus, sourceRows: sourceRows, sourceNotes: sourceNotes,
        block: function (name) { ui = ui || { root: null }; return { followups: followupsBlock, sources: sourcesBlock, privacy: privacyBlock, save: saveBlock }[name](); } },
      peak: { set: setPeak, reset: resetPeak, saved: savedPeak, apply: applySavedPeak, KEY: PEAK_KEY },
      /* V8 (docs/V8_SPEC.md §3.2, §4.2) for tests/data-v8.test.mjs */
      v8: { catalog: catalog, fundRun: fundRun, fundUse: fundUse, fundCancel: fundCancel, fundPick: fundPick, state: function () { return FS; },
        dropWords: dropWords, fundingRoute: fundingRoute, detectWorkbook: detectWorkbook, sourceRows: v8SourceRows, healthNotes: healthNotes,
        realStatus: realStatus, saveState: function () { return saveState(realStatus()); }, policyKeep: policyKeep, renderPolicy: function () { renderPolicy(); },
        tabs: function () { return TABS.map(function (t) { return t.id; }); }, stage: function (files) { stageFiles(files); } } }
  };
})(window.MCD = window.MCD || {});
