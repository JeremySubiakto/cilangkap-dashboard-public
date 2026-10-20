/* ==========================================================================
 * MCD.sections.schools: section 3 "Sekolah (SMA, SMK, MA)" (key 3)
 * Product rules: docs/COPY_STYLE_EN.md items 10-22 (SMA only, flat map, bold status colours with legends
 * in words, Bahasa Indonesia, one solid shape per kecamatan, "Buka di Google Maps"), exhibits per
 * docs/DESIGN_DIRECTION_V2.md, contracts in docs/INTEGRATION_NOTES.md, changes in docs/UX_FIX_PLAN.md C-02,
 * C-03, C-07, C-09, C-10.
 *
 * Scope (v6): SMA, SMK and MA. Madrasah aliyah (MA) share the SMA/MA level of data/schools.js and are split off by
 * name; SMK are their own level. SMA alone is the default (the pilot view); SMK and MA are full layers once their
 * Jenis chip is on (v5 drew them as small neutral context points; that is gone).
 *
 * Sederhana: scope and Jenis controls, "Filter lain", the new-CIF card (item 35(a): siswa 17+ → Tabungan /
 *   Livin' by Mandiri with a KTP, siswa di bawah 17 → Tabungan SimPel with a parent or guardian), the SMA with the
 *   most students aged 17+ (or nearest the branch), status, TNI and cluster cards (distances from KCP).
 * Detail: left rail (status bar, new-CIF card, key figures, other filters, programme deadlines) and the
 *   workbench on the right with five tabs: Daftar SMA (distance, TNI, sort and travel-time switches above the
 *   list) · Kecamatan · Yayasan · Program & kalkulator · Tindak lanjut. "Sumber data" is a footer link. Between
 *   600 and 1279 px the workbench is a slide-over ([data-slideover]); its opener sits at the top of the left panel.
 * Students (items 26, 29): MCD.schools.students (window.MCD_SMA_STUDENTS) with the shared display rule:
 *   duplicates hidden, 0 students = "kemungkinan tidak aktif" (listed, never counted), 17+ = Dapodik's own age
 *   count when published, else the per-grade estimate marked "perkiraan". The "?" opens the method with the
 *   editable per-grade shares (they change only the schools without an official age count).
 * Distance (items 27, 28): MCD.distance.of / format / tip per school ("4,2 km · ± 14 menit" from KCP), the shared
 *   "Jam sibuk" and "Motor (tanpa tol)" switches (window event 'mcd:distance'), sort "Terdekat dari KCP". Without
 *   MCD.distance: MCD.travel, then MCD_TRAVEL (× 1,6 for normal traffic), then a straight line.
 * Map (flat, north-up, item 34): school symbols from MCD.schools.map (schools-map.js): SMA circles sized by
 *   students (blue negeri, amber swasta, grey jenis belum diketahui, a navy star for TNI-foundation SMA, faded
 *   when "kemungkinan tidak aktif"), MA diamonds and SMK rounded squares as small slate context points; a green /
 *   red ring for SMA nasabah / prospek once the school file is in. Legend counts follow the panel's display rule.
 *   The calm kecamatan map (MCD.territory.layers, items 23, 25, 30): thin grey outlines, no fill, a chip
 *   "Cipayung · 12 SMA" with a dot for the ranked third of SMA nasabah Mandiri ÷ SMA once the school file is in.
 *   A kecamatan click highlights its outline in navy and opens the calm popup.
 * Actions: 'focus:sma:<npsn | school row>' (MCD.app.focus) flies to the school (MCD.map.focusPoint) and opens it.
 * v4 (items 36, 38; V3_REPORT §4.5): the school drawer has "Rute di Google Maps" beside "Jarak dari KCP"
 *   (MCD.distance.directionsUrl, coordinates only, a new tab on a click). Route lines and the kecamatan focus mode
 *   are map.js's: a school is selected as {kind: 'smaSchool', id} (a registered point), a kecamatan as
 *   {kind: 'smaKec', id, extra: {kecamatanId}} from every entry point (showKec), with MCD.map.focusArea only as a
 *   fallback. Motion through MCD.motion (drawer blocks and list rows 35 ms apart, the new-CIF numbers count up
 *   once, nothing moves under reduced motion; CSS .sk-stg without it). On phones (Daftar SMA narrower than 360 px)
 *   the SMA name wraps instead of being cut, and siswa 17+ sits on the line under it.
 * v5 (item 43, concept C "Kartu bertahap"; docs/LAYOUT_V5C_SPEC.md §7.4, §9): the drawer models carry what the SHELL
 *   lane's MCD.windows reads (feature-detected; the older drawer ignores it): kind, key, brief {numbers ≤ 3, chips ≤ 2,
 *   primary, note with a hintId}, quick ("+ Tindak lanjut" in the SMA card, MCD.schools.pipeline.quickAdd), crumb
 *   ("‹ Makasar" inside a trail), listFirst, anchor and hints; every .dd-blk names its fold (data-fold, data-preview,
 *   data-open). "Lihat SMA di kecamatan ini" opens the kecamatan card with its SMA list first, ranked by siswa 17+;
 *   a row selects {kind: 'smaSchool', id, extra: {trail: kecamatanId}}. The callout's "Detail" (bind action
 *   {id: 'detail'}) opens it with the numbers first ({kind: 'smaKec', …, extra: {kecamatanId, first: 'angka'}}).
 *   Section functions: workspace() (rail, drawer, hide), summary() (the slim rail's three numbers), cardFor(sel)
 *   (live pins) and kecList(kecId).
 *
 * v6 (COPY_STYLE_EN item 45, docs/V6_SPEC.md §3–§5, §7; lane SEKOLAH):
 *   - Scope "Cakupan: 15 km | 30 km" (D3, D4): a view setting, not a filter (no chip, not counted, kept by "Hapus
 *     filter"), remembered per browser tab (MCD.inst.scope, sessionStorage mcd.scope.v1; own copy without MCD.inst).
 *     It sits in the slim rail (summary().scope), the rail and guide controls and the "Daftar sekolah" toolbar.
 *   - SMK and MA are full layers (D5): Jenis chips "SMA · SMK · MA" (SMA only by default, the choice kept in
 *     mcd.schools.ui.v2 show), status colour and size for every jenis, counted in every number while shown. Students
 *     of SMK, MA and every school beyond 15 km come from data/school-students.js (MCD.schools.students.view, lazy);
 *     the SMA within 15 km keep data/sma-students.js, so SMA only at 15 km still reads 366 / 160.411 / 79.985.
 *   - Kelas biaya (§4): five chips (Premium · Atas · Menengah · Reguler · Belum diketahui) with counts, the "signal
 *     bars" badge on the map while filtered or from zoom 14, a fold per card and a list column (MCD.inst.tierOf, else
 *     data/institution-tiers.js directly).
 *   - "Kontak & identitas" (§5, D14, D17, D18): one fold replaces Identitas and Sumber (MCD.inst.contactBlock, else a
 *     plain copy of its rules); contacts hide while "Samarkan nama" is on (D7); the Dapodik badge (D22).
 *   - Tindak lanjut sealed (§7): MCD.schools.pipeline delegates to MCD.seal; the tab names the storage state.
 *
 * Engine: assets/js/schools-core.js (MCD.schools). Public data always shows with its source; bank data
 * only from the vault, an import or the opt-in Data contoh switch (then tagged CONTOH). Storage:
 * mcd.schools.* (the distance is not stored, UX_FIX_PLAN D14); the scope in sessionStorage (mcd.scope.v1).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'schools';
  var UI_KEY = 'mcd.schools.ui.v2';
  var CALC_KEY = 'mcd.schools.calc.v2';
  var KMS = [5, 10, 15, 30];
  var DENSITY_KM = 1;
  var CLUSTER_MIN = 4;
  var TOP_KEC = 12;
  var TABS = [
    { id: 'list', label: 'Daftar sekolah' },
    { id: 'kec', label: 'Kecamatan' },
    { id: 'yay', label: 'Yayasan' },
    { id: 'prog', label: 'Program & kalkulator' },
    { id: 'pipe', label: 'Tindak lanjut' }
  ];
  var OLD_TAB = { calc: 'prog', src: 'list' };
  var SLIDE_LABEL = 'Buka daftar & grafik';
  var SRC_SCHOOLS = 'Sumber: Kemendikdasmen Dapodik (2026/2027 Gasal), OpenStreetMap, Overture Maps · diambil 12 Okt 2026';
  var SRC_SHORT = 'Dapodik · OpenStreetMap · Overture · 12 Okt 2026';
  var SRC_TNI = 'Sumber: Kemendikdasmen Dapodik dan Verval Yayasan (daftar yayasan TNI) · 12 Okt 2026';
  var SRC_AREAS = 'batas kecamatan © kontributor OpenStreetMap, BPS (2020)';
  var SRC_PROG = 'Sumber: bankmandiri.co.id/referral-biller-2026 dan /gempita-2026 · dibaca 12 Okt 2026';
  var ATTRIBUTION = 'Sekolah: Kemendikdasmen (Dapodik) · © kontributor OpenStreetMap (ODbL) · © Overture Maps Foundation · batas wilayah: BPS melalui OCHA/HDX (CC BY 3.0 IGO)';
  var GM_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  var GM_BASE = 'https://www.google.com/maps/search/?api=1&query=';
  /* item 36: Google Maps directions from KCP to the school (coordinates only, opened in a new tab on a click) */
  var ROUTE_LABEL = 'Rute di Google Maps';
  var ROUTE_TIP = 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.';
  var STU_SRC = 'Data siswa: Dapodik (Kemendikdasmen), semester 2026/2027 Ganjil';
  var LIVIN_LOGO = 'assets/brand/livin-logo.png';
  var SIMPEL_CARD = 'assets/brand/simpel-card.webp';
  var K17_LABEL = 'Siswa 17+ (dapat memiliki KTP)';
  var U17_LABEL = 'Siswa di bawah 17 tahun (Tabungan SimPel)';
  var DIST_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  var DIST_NONE = 'Jarak belum dapat dihitung untuk titik ini.';
  var LIST_SORTS = [{ v: 'near', label: 'Terdekat dari KCP' }, { v: 'k17', label: 'Siswa 17+ terbanyak' }, { v: 'stu', label: 'Siswa terbanyak' }, { v: 'tier', label: 'Kelas biaya tertinggi' }];
  var JENIS_WORD = { sma: 'SMA', ma: 'MA', smk: 'SMK' };
  var JENIS_LEVEL = { sma: 'SMA', smk: 'SMK', ma: 'MA' };
  var JENIS_ORDER = ['sma', 'smk', 'ma'];
  var JENIS_NAME = { sma: 'SMA', smk: 'SMK (sekolah menengah kejuruan)', ma: 'MA (madrasah aliyah)' };

  /* v6 scope (V6_SPEC §3.1, D3, D4) */
  var SCOPES = [15, 30];
  var SCOPE_KEY = 'mcd.scope.v1';
  var SCOPE_ARIA = 'Cakupan jarak dari Mabes TNI';
  var SCOPE_TIP = 'Sekolah dalam radius 15 km atau 30 km dari Mabes TNI. 15 km adalah cakupan pilot.';
  var SCOPE30_HINT = 'Angka di Ringkasan tetap untuk 15 km, cakupan pilot.';
  var LOAD30 = 'Memuat jumlah siswa dalam 30 km…';
  var FAIL30 = 'Jumlah siswa dalam 30 km tidak dapat dimuat. Coba lagi.';
  var JENIS_TIP = 'SMK adalah sekolah menengah kejuruan. MA adalah madrasah aliyah di bawah Kementerian Agama.';
  var JENIS_LAST = 'Paling sedikit satu jenis tampil.';

  /* v6 kelas biaya (V6_SPEC §4, D6, D21) */
  var TIERS = [{ id: 'premium', label: 'Premium', level: 4 }, { id: 'atas', label: 'Atas', level: 3 }, { id: 'menengah', label: 'Menengah', level: 2 },
    { id: 'reguler', label: 'Reguler', level: 1 }, { id: 'unknown', label: 'Belum diketahui', level: 0 }];
  var TIER_LINE = 'Kelas biaya menunjukkan besar biaya sekolah. Sekolah negeri umumnya tanpa SPP. Kemudahan kerja sama tetap perlu ditanyakan ke sekolah atau yayasan.';
  var TIER_LOADING = 'Memuat kelas biaya…';
  var TIER_FAILED = 'Kelas biaya tidak dapat dimuat. Coba lagi.';
  var TIER_NONE = 'Kelas biaya belum diketahui. Data biaya dan jenis sekolah belum cukup.';
  var TIER_LEGEND_2 = 'Batang berisi = dari biaya resmi atau jenis sekolah. Batang kosong = perkiraan. Tanpa tanda = belum diketahui.';
  var TIER_ZOOM = 14;

  /* v6 kontak (V6_SPEC §5, D7, D17, D18) and the source badge (D22) */
  var DAPODIK_LOGO = 'assets/brand/dapodik-logo.png';
  var DAPODIK_ALT = 'Dapodik (Data Pokok Pendidikan)';
  var REF_BASE = 'https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/';
  var NOTE_PLACEHOLDER = 'Tulis langkah kerja. Jangan tulis nomor pribadi atau data siswa.';

  /* Programme terms as recorded in docs/research-schools.json (products[0], products[1]). */
  var PROGRAMMES = [
    { id: 'RB', name: 'Referral Biller 2026', start: '2026-04-10', end: '2027-02-28',
      headline: 'Rp25.000 untuk yayasan per rekening Tabungan NOW yang memenuhi syarat',
      lines: [
        ['Untuk', 'Yayasan atau sekolah yang telah menagih SPP melalui Kopra Mandiri Bill Collection dan terdaftar di Kopra Bill Reminder'],
        ['Cara', 'Orang tua membuka Tabungan NOW secara online dengan kode promo yayasan'],
        ['Fee', 'Rp25.000 per rekening yang memenuhi syarat.\nKuota 250 per bulan, 3.000 total. Belum jelas apakah kuota per biller atau untuk seluruh program.'],
        ['Rekening yang memenuhi syarat', 'Setoran paling sedikit Rp100.000 dan 1 transaksi Livin’ Rp25.000 atau lebih dalam 30 hari'],
        ['Periode', '10 Apr 2026 sampai 28 Feb 2027'],
        ['Pendaftaran', 'Melalui cabang pengelola, atas nama yayasan atau PIC yang diberi kuasa sesuai AD/ART'],
        ['Ketentuan', 'Tidak dapat digabung dengan GEMPITA di sekolah yang sama']
      ], src: 'bankmandiri.co.id/referral-biller-2026' },
    { id: 'GEMPITA', name: 'GEMPITA 2026 (SMA)', start: '2026-03-01', end: '2027-02-28',
      headline: 'Rp30.000 per rekening untuk guru, staf dan pekerja kantin. Rp15.000 untuk siswa yang menjadi KOL.',
      lines: [
        ['Untuk', 'Siswa SMA dan KOL dari sekolah (guru, staf, pekerja kantin)'],
        ['Fee', 'KOL guru/staf Rp30.000 per rekening (kuota 1.400) · KOL siswa Rp15.000 (kuota 3.500) · paling tinggi Rp5 juta per KOL'],
        ['Pengguna akhir', 'Cashback Rp25.000 untuk Tabungan NOW (kuota 4.900) dan RDN (kuota 1.050)'],
        ['Rekening yang memenuhi syarat', 'Setoran paling sedikit Rp100.000 dan transaksi paling sedikit Rp10.000 dalam 7 hari.\nUntuk RDN: top-up Rp200.000 dalam 30 hari.'],
        ['Siswa', 'Tabungan NOW perlu e-KTP, sehingga hanya untuk siswa berusia 17 tahun ke atas'],
        ['Periode', '1 Mar 2026 sampai 28 Feb 2027'],
        ['Ketentuan', 'Fee dibayarkan kepada KOL perorangan, tidak kepada yayasan. Sekolah tidak dapat menjalankan GEMPITA dan Bill Reminder bersamaan']
      ], src: 'bankmandiri.co.id/gempita-2026' }
  ];
  /* Pipeline stage → status tone (green aktif, amber in progress, red belum dihubungi, grey ditunda or batal). */
  var STAGE_TONE = { baru: 'bad', kontak: 'mid', presentasi: 'mid', proposal: 'mid', pks: 'mid', onboarding: 'mid', aktif: 'ok', ditunda: 'none', gugur: 'none' };
  var TAG_WORD = { assumption: 'asumsi', source: 'sumber', input: 'isian', 'RM rate': 'tarif RM' };

  var SC = null;            // MCD.schools
  var ctx = null, page = null, ui = null, st = null;
  var offs = [], mapOffs = [], handles = [];
  var V = null;             // current view model
  var X = { idx: null };    // SMA index cache (per school index)
  var drawerObs = null, drawerSel = null, flyNext = false, hlTimer = 0, unbindTerr = null, drawerDist = null;
  var pipeEds = {}, building = null;    /* v5: the open pipeline editors by key; 'pin' while cardFor builds a pinned card */
  var NO_NPSN = 'SMA ini tidak memiliki NPSN. Tambahkan yayasannya ke tindak lanjut.';
  var NO_NPSN_SK = 'Sekolah ini tidak memiliki NPSN. Tambahkan yayasannya ke tindak lanjut.';
  var scopeSwitches = [], ctlSets = [], lazyTimers = [], scopeOff = null, scopeLive = null, seenMigrated = false;
  var SHARE_HINT = 'Porsi nasabah tampil setelah file sekolah diimpor.';
  var KL_MAX = 60;                      /* rows in the kecamatan card's SMA list (§3.3.4) */

  /* =============================================================== pure helpers */

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

  function rgba(c, a) { return [c[0], c[1], c[2], a == null ? 255 : a]; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  var KX = 110.64, KY = 110.574;    // km per degree of longitude and latitude at the Mabes TNI latitude
  function kmFast(lon1, lat1, lon2, lat2) { var dx = (lon2 - lon1) * KX, dy = (lat2 - lat1) * KY; return Math.sqrt(dx * dx + dy * dy); }

  /* ================================================================ DOM helpers */

  function E() { return MCD.util.el.apply(null, arguments); }
  function fm() { return MCD.util.fmt; }
  function icon(n, extra) { return ctx ? ctx.icon(n, extra) : MCD.util.icon(n); }
  function clear(n) { return MCD.util.clear(n); }
  /** Text with "\n" as separate lines (copy deck ⏎), replacing what the element held. */
  function setLines(el, text) { clear(el); el.appendChild(E('span', { text: text })); return el; }
  function isDeep() { return !!(ctx && ctx.view() === 'deep'); }
  function veil() { return !!(ctx && ctx.privacy() === 'veil'); }
  function demoOn() { return !!(MCD.demo && MCD.demo.isOn && MCD.demo.isOn()); }
  function sget(k, d) { try { var s = MCD.util.storage; return s ? s.get(k, d) : d; } catch (e) { return d; } }
  function sset(k, v) { try { var s = MCD.util.storage; return s ? s.set(k, v) : false; } catch (e) { return false; } }
  function debounce(fn, ms) { return MCD.util.debounce(fn, ms); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  /** Indonesian has no plural: "3 SMA", "12 siswa". */
  function count(n, word) { return fm().int(n) + ' ' + word; }
  function relDemo() { var m = MCD.data && MCD.data.meta && MCD.data.meta.sekolah; return !!(m && m.source === 'demo'); }
  function today() { var u = MCD.util.date; try { return u.today(); } catch (e) { return new Date(); } }
  function ymd(d) { var u = MCD.util.date; return u && u.ymd ? u.ymd(d) : ''; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function territory() { var T = MCD.territory; return T && typeof T.ready === 'function' && T.ready() ? T : null; }
  function admin() { var A = window.MCD_ADMIN_AREAS; return A && typeof A.locate === 'function' ? A : null; }
  function owner(name) { return veil() && name ? MCD.util.mask.initials(name) : (name || ''); }
  function demoTag(el, opts) { if (el && MCD.demo && MCD.demo.tag) MCD.demo.tag(el, opts || { inline: true }); return el; }
  function guard(btnEl) { if (btnEl && MCD.demo && MCD.demo.guard) MCD.demo.guard(btnEl); return btnEl; }

  /* ---- v5 workspace (item 43): MCD.windows belongs to the SHELL lane and may be missing; every use is feature-detected */
  function WS() { var W0 = MCD.windows; return W0 && typeof W0 === 'object' ? W0 : null; }
  /** The Detail workbench is the shell's bottom drawer ("Daftar & grafik"): the shell marks it .ws-drawer. */
  function adopted() { var w = ui && ui.work && ui.work.el; return !!(w && w.classList && w.classList.contains('ws-drawer')); }
  /** A hint shown once per browser (MCD.windows.hint): the node the first time, null afterwards; always the node without it. */
  function hintNode(id, node) {
    var W0 = WS();
    if (node && W0 && isFn(W0.hint)) { try { return W0.hint(id, node); } catch (e) { return node; } }
    return node;
  }
  /** The hint list of a card ({id, node}): MCD.windows lists a hint under Sumber › Catatan once it no longer shows in the card. */
  function hintRec(id, node) { return { id: id, node: node, text: node ? node.textContent : '' }; }
  /** Adopted or not, the workbench keeps the right slide-over attributes (the shell's slide-over rules skip a drawer). */
  function syncAdopted() {
    var w = ui && ui.work && ui.work.el;
    if (!w) return;
    var on = adopted();
    if (on === !!w.__skAdopted) return;
    w.__skAdopted = on;
    if (on) { w.removeAttribute('data-slideover'); w.removeAttribute('data-slideover-label'); }
    else { w.setAttribute('data-slideover', ''); w.setAttribute('data-slideover-label', SLIDE_LABEL); w.classList.toggle('is-wide', !!(st && st.wide)); }
  }

  /* ----------------------------------------------- Google Maps (COPY_STYLE item 22) */

  function gmapsUrl(o) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && isFn(G.url)) return G.url(o);
    if (!o) return null;
    if (o.q) return GM_BASE + encodeURIComponent(String(o.q));
    var lat = Number(o.lat), lon = Number(o.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return null;
    return GM_BASE + (Math.round(lat * 1e5) / 1e5) + ',' + (Math.round(lon * 1e5) / 1e5);
  }
  function gmapsLink(o, label) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && isFn(G.link)) { try { var a0 = G.link(o, { label: label }); if (a0) return a0; } catch (e) { /* own link below */ } }
    var url = gmapsUrl(o);
    if (!url) return null;
    return E('a', { class: 'btn btn--secondary gmaps-link', href: url, target: '_blank', rel: 'noopener noreferrer', title: GM_TIP }, icon('external'), E('span', { text: label || 'Buka di Google Maps' }));
  }
  /**
   * Google Maps directions from KCP Jakarta Cilangkap to (lon, lat), item 36: MCD.distance.directionsUrl when the
   * shell has it, else the same URL built here from MCD.config.branch. Coordinates only (5 decimals), never a name.
   */
  function routeUrl(lon, lat) {
    var D = MCD.distance;
    if (D && isFn(D.directionsUrl)) { try { var u = D.directionsUrl(lon, lat); if (u) return String(u); } catch (e) { /* own URL below */ } }
    lon = Number(lon); lat = Number(lat);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return null;
    var b = (MCD.config && MCD.config.branch) || {}, bl = isNum(b.lat) ? b.lat : -6.33203, bo = isNum(b.lon) ? b.lon : 106.90989;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + bl.toFixed(5) + ',' + bo.toFixed(5) +
      '&destination=' + lat.toFixed(5) + ',' + lon.toFixed(5) + '&travelmode=driving';
  }
  /** "Rute di Google Maps" beside the distance line: a plain link that opens only when clicked (new tab). */
  function routeLink(lon, lat) {
    var url = routeUrl(lon, lat);
    if (!url) return null;
    return E('a', { class: 'sk-route', href: url, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', title: ROUTE_TIP }, icon('external'), E('span', { text: ROUTE_LABEL }));
  }

  /* ------------------------------------------- motion (item 38: MCD.motion when the shell has it) */

  function motion() { var M = MCD.motion; return M && typeof M === 'object' ? M : null; }
  function reducedMotion() {
    var M = motion();
    if (M && isFn(M.reduced)) { try { return !!M.reduced(); } catch (e) { /* media query below */ } }
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  var STAGGER_MS = 35, STAGGER_MAX = 10;
  /**
   * Blocks appear one after another, 35 ms apart (drawer blocks, list rows). MCD.motion.stagger when present;
   * otherwise the CSS entrance .sk-stg (opacity and transform only). Nothing moves under reduced motion.
   * Only the first STAGGER_MAX get their own step, so a long list is complete within about 0,35 s.
   */
  function stagger(els) {
    var list = Array.prototype.filter.call(els || [], function (n) { return n && n.nodeType === 1; });
    if (!list.length || reducedMotion()) return list.length;
    var M = motion();
    if (M && isFn(M.stagger)) { try { M.stagger(list, { stepMs: STAGGER_MS, max: STAGGER_MAX }); return list.length; } catch (e) { /* CSS below */ } }
    list.forEach(function (n, k) {
      n.classList.remove('sk-stg');
      if (n.style && isFn(n.style.setProperty)) n.style.setProperty('--sk-stg-d', Math.min(k, STAGGER_MAX) * STAGGER_MS + 'ms');
      n.classList.add('sk-stg');
    });
    return list.length;
  }
  /**
   * Drawer content: the body blocks of the drawer just opened, in order. The shell's openDrawer already staggers
   * the title, every body block and the source line through MCD.motion.stagger (INTEGRATION_NOTES §15 "Drawer"),
   * so the section only does it when that path is missing (no motion.js); otherwise each block would carry two
   * entrance animations and lose the shell's 70 ms lead.
   */
  function shellStaggersDrawer() { var M = motion(); return !!(M && isFn(M.stagger)); }
  function staggerDrawer(model) { if (model && model.body && !shellStaggersDrawer()) stagger(model.body); }
  /**
   * A big number counts up once, the first time it shows (MCD.motion.countUp); every later value is set at
   * once and stops a count still running, so the number on screen is always the current one.
   */
  function countOnce(el, value, format) {
    if (!el) return;
    var text = format(value);
    var M = motion(), anim = el.__skCount;
    el.__skLast = text;
    if (anim) {
      if (anim.stop) { try { anim.stop(); } catch (e) { /* ignore */ } }
      el.__skCount = { done: true };
      el.textContent = text;
      if (!anim.stop && !anim.done) setTimeout(function () { if (el.__skLast != null) el.textContent = el.__skLast; }, (anim.ms || 500) + 200);
      return;
    }
    if (!isNum(value) || value === 0 || !M || !isFn(M.countUp) || reducedMotion()) { el.textContent = text; if (isNum(value)) el.__skCount = { done: true }; return; }
    var ms = M.dur && isNum(M.dur.slow) ? M.dur.slow : 500, h = null;
    try { h = M.countUp(el, value, { format: format, ms: ms }); } catch (e) { h = null; }
    var stop = isFn(h) ? h : (h && isFn(h.stop) ? function () { h.stop(); } : (h && isFn(h.cancel) ? function () { h.cancel(); } : null));
    el.__skCount = { stop: stop, ms: ms, done: false };
    setTimeout(function () { if (el.__skCount && !el.__skCount.stop) el.__skCount.done = true; }, ms + 60);
  }

  function kecQuery(id) {
    var T = MCD.territory;
    if (T && isFn(T.gmapsQuery)) { var q = T.gmapsQuery(id); if (q) return q; }
    var k = kecIndex()[id];
    return 'Kecamatan ' + kecName(id) + (k && k.kotaName ? ', ' + k.kotaName : '');
  }
  /** The shell renders model.gmaps under the drawer title (UX_FIX_PLAN A-02); until it does, the link goes on top of the body. */
  function ensureDrawerGmaps(target) {
    var url = gmapsUrl(target);
    if (!url) return;
    var d = document.querySelector('#overlay-root .drawer') || document.querySelector('.drawer');
    if (!d || d.querySelector('a[href^="https://www.google.com/maps/search/"]')) return;
    var body = d.querySelector('.drawer__body');
    var a = gmapsLink(target, 'Buka di Google Maps');
    if (body && a) body.insertBefore(E('div', { class: 'sk-dd-gm' }, a), body.firstChild);
  }

  /* ------------------------------------- students and 17+ (items 26, 29; MCD.schools.students) */

  function SS() { var s = SC && SC.students; return s && isFn(s.ready) && s.ready() ? s : null; }
  /** The v6 adapter (schools-core.js): students of every SMA, SMK and MA within 30 km under the display rule. */
  function SV() { var s = SC && SC.students; return s && isFn(s.view) ? s : null; }
  function f30Ready() { var s = SC && SC.students; return !!(s && isFn(s.ready30) && s.ready30()); }
  function f30State() { return SC && isFn(SC.dataStatus) ? SC.dataStatus('school-students') : 'error'; }
  /** The jenis switched on, as the levels of the data files ({SMA, SMK, MA}): the sum rule needs it (§1.1). */
  function shownLevels() { var s = (st && st.show) || { sma: true }; return { SMA: s.sma !== false, SMK: !!s.smk, MA: !!s.ma }; }
  var SINFO = { key: '', idx: null, m: new Map() };
  /**
   * Students of one school row under the display rule, or null (not an SMA, SMK or MA): the pilot file for the SMA
   * within 15 km, data/school-students.js for every other school (V6_SPEC §1.1). The shape keeps v5's {students,
   * perGrade, k17, k17Official, duplicate, inactive, note, semester, …} and adds src, missing, olderTable, npsn.
   */
  function sInfo(i) {
    var I = SC && SC.idx, S0 = SS(), A = SV();
    if (!I || i == null || i < 0 || (!S0 && !A)) return null;
    var sh = shownLevels();
    var key = (S0 ? S0.sig() : '-') + '|' + (f30Ready() ? 1 : 0) + f30State() + '|' + (sh.SMK ? 1 : 0) + (sh.MA ? 1 : 0);
    if (SINFO.key !== key || SINFO.idx !== I) SINFO = { key: key, idx: I, m: new Map() };
    if (SINFO.m.has(i)) return SINFO.m.get(i);
    var v = null;
    try { v = A ? A.view(I, i, { shown: sh }) : (S0 ? S0.info(I, i) : null); } catch (e) { v = null; }
    SINFO.m.set(i, v);
    return v;
  }
  /** Students of a row: the pilot or the 30 km file (v6); without either adapter the school list (private SMA only);
      while the 30 km file loads (or failed) a school beyond the pilot shows "—" (-1), as V6_SPEC §3.1 says. */
  function stuOf(i) {
    var s = sInfo(i);
    if (s && s.students != null) return s.students;
    if (s && s.src !== 'pilot') return -1;
    var I = SC.idx;
    return I && I.stu[i] >= 0 ? I.stu[i] : -1;
  }
  function k17Num(i) { var s = sInfo(i); return s && !s.inactive && s.k17 != null ? s.k17 : null; }
  /** "612 (data resmi)" or "± 600 (perkiraan)" */
  function k17Words(s, plain) {
    if (!s || s.k17 == null) return '—';
    var n = fm().int(s.k17);
    if (plain) return (s.k17Official ? '' : '± ') + n;
    return s.k17Official ? n + ' (data resmi)' : '± ' + n + ' (perkiraan)';
  }
  /** Students line for popups: "1.234 siswa · 612 berusia 17+ (data resmi)". */
  function studentsLine(i) {
    var s = sInfo(i), I = SC.idx;
    if (s && s.inactive) return s.closedLikely ? 'Kemungkinan tidak aktif' : 'Kemungkinan tidak aktif: Dapodik mencatat 0 siswa';
    if (s && s.students != null) return count(s.students, 'siswa') + (s.k17 == null ? '' : ' · ' + (s.k17Official ? fm().int(s.k17) + ' berusia 17+ (data resmi)' : '± ' + fm().int(s.k17) + ' berusia 17+ (perkiraan)'));
    if (I && I.stu[i] >= 0) return count(I.stu[i], 'siswa') + ' (Dapodik, 12 Okt 2026)';
    if (s && s.missing === 'loading') return LOAD30;
    return 'Jumlah siswa belum tersedia';
  }
  /** Why a school has no student count, in words (V6_SPEC §3.2, §1.0.1), or null. */
  function missingWords(s) {
    if (!s || s.students != null || s.duplicate) return null;
    switch (s.missing) {
      case 'osm': return 'Titik ini dari OpenStreetMap atau Overture dan tidak cocok dengan data Dapodik, sehingga jumlah siswanya tidak tersedia.';
      case 'closed': return 'Kemungkinan tidak aktif: NPSN tidak ditemukan lagi di Data Referensi dan belum ada data siswa 2026/2027.';
      case 'loading': return LOAD30;
      case 'failed': return FAIL30;
      case 'dapodik': return 'Jumlah siswa sekolah ini belum tersedia di Dapodik.';
      default: return null;
    }
  }

  /* ------------------------------------- distance from KCP (items 27, 28; MCD.distance) */

  var LOCAL_DIST = { peak: false, noToll: false };
  var DISTC = { key: '', m: new Map() };
  function distApi() { var D = MCD.distance; return D && isFn(D.of) ? D : null; }
  function travelGrid() { var T = MCD.travel; try { return T && isFn(T.ready) && T.ready() ? T : null; } catch (e) { return null; } }
  function distProvider() { return distApi() ? 'api' : travelGrid() ? 'grid' : (window.MCD_TRAVEL && isFn(window.MCD_TRAVEL.estimate)) ? 'table' : 'line'; }
  function peakOn() { var D = MCD.distance; if (D && isFn(D.peakOn)) { try { return !!D.peakOn(); } catch (e) { /* local below */ } } return LOCAL_DIST.peak; }
  function noTollOn() { var D = MCD.distance; if (D && isFn(D.noTollOn)) { try { return !!D.noTollOn(); } catch (e) { /* local below */ } } return LOCAL_DIST.noToll; }
  function setPeak(v) {
    var D = MCD.distance;
    if (D && isFn(D.setPeak)) { try { D.setPeak(!!v); return; } catch (e) { /* local below */ } }
    LOCAL_DIST.peak = !!v; onDistance();
  }
  function setNoToll(v) {
    var D = MCD.distance;
    if (D && isFn(D.setNoToll)) { try { D.setNoToll(!!v); return; } catch (e) { /* local below */ } }
    LOCAL_DIST.noToll = !!v; onDistance();
  }
  function peakFactor() { var T = MCD.travel; try { var f = T && isFn(T.peakFactor) ? T.peakFactor() : null; return isNum(f) ? f : 1.3; } catch (e) { return 1.3; } }
  /** Without MCD.distance: the road grid, then the kelurahan table (free flow × 1,6 = normal traffic), then a straight line. */
  function distFallback(lon, lat, o, i) {
    var T = travelGrid();
    if (T) {
      var g = null;
      try { g = T.at(lon, lat); } catch (e) { g = null; }
      if (g && g.precision !== 'none' && isNum(g.km) && isNum(g.min)) {
        return { km: g.km, min: g.min, minPeak: isNum(g.minPeak) ? g.minPeak : g.min * peakFactor(), precision: 'jalan', source: 'grid',
          noToll: g.noToll && isNum(g.noToll.km) ? { km: g.noToll.km, min: g.noToll.min } : null };
      }
    }
    var TT = window.MCD_TRAVEL;
    if (TT && isFn(TT.estimate)) {
      var e2 = null;
      try { e2 = TT.estimate(lon, lat, { kelurahanId: o.kelurahanId, kecamatanId: o.kecamatanId }); } catch (e) { e2 = null; }
      if (e2 && isNum(e2.km) && isNum(e2.min)) return { km: e2.km, min: e2.min * 1.6, minPeak: e2.min * 1.6 * peakFactor(), precision: 'perkiraan', source: 'tabel', noToll: null };
    }
    var I = SC.idx;
    return I && i != null ? { km: I.distBranch[i], min: null, minPeak: null, precision: 'garis-lurus', source: 'garis', noToll: null } : null;
  }
  /** Road distance and minutes from KCP for a school row ({km, min, minPeak, precision, source, noToll}), cached. */
  function distOf(i) {
    var I = SC && SC.idx;
    if (!I || i == null || i < 0 || i >= I.n) return null;
    var pk = distProvider();
    if (DISTC.key !== pk) DISTC = { key: pk, m: new Map() };
    if (DISTC.m.has(i)) return DISTC.m.get(i);
    var o = { kelurahanId: X.kel ? X.kel[i] || null : null, kecamatanId: X.kec ? X.kec[i] || null : null }, r = null, A = distApi();
    if (A) { try { r = A.of(I.lon[i], I.lat[i], o); } catch (e) { r = null; } }
    else r = distFallback(I.lon[i], I.lat[i], o, i);
    DISTC.m.set(i, r || null);
    return r || null;
  }
  function minutesWords(m) {
    m = Math.max(1, Math.round(m));
    return '± ' + (m >= 60 ? Math.floor(m / 60) + ' jam' + (m % 60 ? ' ' + (m % 60) + ' menit' : '') : m + ' menit');
  }
  function kmWords(km) { return km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m' : fm().num(km, 1) + ' km'; }
  /** "4,2 km · ± 14 menit" (the shared MCD.distance.format when present). parts = true → {km, min};
      parts = 'cell' → {km, min} without the "(jam sibuk, tanpa tol)" words, for narrow table cells whose
      column header names the mode once (distModeWords). */
  function distText(r, parts) {
    var A = MCD.distance;
    function cell(o) { if (parts === 'cell' && o.min) o.min = o.min.replace(/\s*\((?:jam sibuk|tanpa tol)[^)]*\)\s*$/, ''); return o; }
    if (r && A && isFn(A.format)) {
      try {
        var t = A.format(r, { peak: peakOn(), noToll: noTollOn() });
        if (t) {
          if (!parts) return t;
          var cut = t.indexOf(' · ');
          return cell(cut >= 0 ? { km: t.slice(0, cut), min: t.slice(cut + 3) } : (/^±/.test(t) ? { km: '', min: t } : { km: t, min: '' }));
        }
      } catch (e) { /* own words below */ }
    }
    if (!r || !isNum(r.km)) return parts ? { km: '—', min: '' } : '—';
    var nt = noTollOn() && r.noToll && isNum(r.noToll.km) ? r.noToll : null;
    var km = nt ? nt.km : r.km, min = nt ? nt.min : r.min;
    if (isNum(min) && peakOn()) min = nt ? min * peakFactor() : (isNum(r.minPeak) ? r.minPeak : min * peakFactor());
    var kmT = kmWords(km), minT = isNum(min) ? minutesWords(min) + (peakOn() ? ' (jam sibuk)' : '') : (r.source === 'garis' ? 'garis lurus' : '');
    if (parts) return cell({ km: kmT, min: minT });
    return kmT + (minT ? ' · ' + minT : '');
  }
  /** "4,2 km" over "± 14 menit" (two short lines, right-aligned) for mini lists and cells; the mode is named once elsewhere. */
  function distStack(r, extra) {
    var p = distText(r, 'cell');
    return E('span', { class: 'sk-num2 sk-mini__meta', title: distTip(r) }, E('span', { class: 'sk-num2__a', text: p.km || '—' }),
      E('span', { class: 'sk-num2__b', text: (p.min || '') + (extra ? (p.min ? ' · ' : '') + extra : '') }));
  }
  /** The travel-time mode in words for a column header or a subtitle: '' (normal traffic, fastest route),
      'jam sibuk', 'tanpa tol' or 'jam sibuk, tanpa tol'. */
  function distModeWords() { return [peakOn() ? 'jam sibuk' : null, noTollOn() ? 'tanpa tol' : null].filter(Boolean).join(', '); }
  /** "Jarak dan waktu dari KCP, perkiraan (jam sibuk)." for cards whose rows show the short distance. */
  function distBasis() { var m = distModeWords(); return 'Jarak dan waktu dari KCP, perkiraan' + (m ? ' (' + m + ')' : '') + '.'; }
  function distTip(r) {
    var A = MCD.distance;
    if (A && isFn(A.tip)) { try { var t = A.tip(r); if (t) return t; } catch (e) { /* own words below */ } }
    if (!r) return DIST_NONE;
    if (r.source === 'garis') return 'Jarak garis lurus dari KCP Jakarta Cilangkap. Waktu tempuh belum dapat dihitung.';
    return DIST_TIP + (peakOn() ? ' Waktu jam sibuk: dikali ' + fm().num(peakFactor(), 1) + ' (asumsi).' : '') + (noTollOn() ? ' Rute tanpa jalan tol.' : '');
  }
  /** Minutes used to sort "Terdekat dari KCP" (the motorbike route when that switch is on); Infinity when unknown. */
  function distSortVal(i) {
    var r = distOf(i);
    if (!r) return Infinity;
    var nt = noTollOn() && r.noToll && isNum(r.noToll.min) ? r.noToll.min : null;
    if (isNum(nt)) return nt;
    if (isNum(r.min)) return r.min;
    return isNum(r.km) ? r.km * 3 + 1e4 : Infinity;
  }
  /** Both shared switches ("Jam sibuk", "Motor (tanpa tol)") as a pair of toggles. */
  function distToggles() {
    /* the one shared "Waktu tempuh" control (MCD.distance.controls); own toggles only when it is missing */
    var D = MCD.distance, c = null;
    if (D && isFn(D.controls)) { try { c = D.controls({ compact: true }); } catch (e) { c = null; } }
    if (c) {
      var shared = { el: E('div', { class: 'sk-distsw' }, c), sync: function () { if (isFn(c.sync)) c.sync(); } };
      distSwitches.push(shared);
      return shared;
    }
    var p = toggle('Jam sibuk', function (on) { setPeak(on); }, { title: 'Tampilkan waktu tempuh saat jam sibuk (asumsi, dikali ' + fm().num(peakFactor(), 1) + ').' });
    var n = toggle('Motor (tanpa tol)', function (on) { setNoToll(on); }, { title: 'Tampilkan jarak dan waktu melalui rute tanpa jalan tol, untuk motor.' });
    var api = { el: E('div', { class: 'sk-distsw', role: 'group', aria: { label: 'Cara menghitung waktu tempuh' } }, p.el, n.el),
      sync: function () { p.set(peakOn()); n.set(noTollOn()); } };
    api.sync();
    distSwitches.push(api);
    return api;
  }
  var distSwitches = [];

  /* ------------------------------------- symbols (item 34; MCD.schools.map in schools-map.js) */

  function symMod() { return SC && SC.map && isFn(SC.map.spec) ? SC.map : null; }
  function jenisOf(i) {
    var I = SC.idx;
    if (!I) return 'sma';
    if (I.jen[i] === 4) return 'smk';
    if (I.jen[i] === 3 && X.idx === I && X.cls && X.cls[i] === 2) return 'ma';
    if (I.jen[i] === 3 && X.idx !== I && SC.smaClass(I.name[i], !!I.npsn[i]) === 2) return 'ma';
    return 'sma';
  }
  function specOf(i) {
    var Mx = symMod(), I = SC.idx;
    if (!Mx || !I) return null;
    var j = jenisOf(i), n = stuOf(i);
    return Mx.spec({ jenis: j, negeri: I.st[i] === 0, unknown: I.st[i] === 2, tni: I.tni[i] >= 0, students: n >= 0 ? n : null });
  }
  function uiTheme() { var t = ctx && isFn(ctx.theme) ? ctx.theme() : document.documentElement.getAttribute('data-theme'); return t === 'day' ? 'day' : 'night'; }
  function symChip(i, cls) {
    var Mx = symMod(), sp = specOf(i);
    if (!Mx || !sp) return null;
    try { return Mx.chip(sp, uiTheme(), { title: Mx.words(sp), cls: cls }); } catch (e) { return null; }
  }
  /** "SMA swasta · yayasan TNI" in words, with the symbol in front. */
  function symLabel(i) {
    var Mx = symMod(), sp = specOf(i);
    return E('span', { class: 'sk-symlabel' }, symChip(i), E('span', { text: Mx && sp ? Mx.words(sp) : JENIS_WORD[jenisOf(i)] }));
  }

  /* ================================================== v6: jenis words (V6_SPEC §3.2) */

  function showNow() { return (st && st.show) || { sma: true, smk: false, ma: false }; }
  /** SMA alone on: every word stays "SMA" (the pilot view, the deck's numbers). */
  function onlySma() { var s = showNow(); return s.sma !== false && !s.smk && !s.ma; }
  function shownJenis() { var s = showNow(); return JENIS_ORDER.filter(function (j) { return j === 'sma' ? s.sma !== false : !!s[j]; }); }
  /** "SMA" or "sekolah": the noun of every count ("366 SMA", "1.234 sekolah"). */
  function nounOf() { return onlySma() ? 'SMA' : 'sekolah'; }
  function Noun() { var n = nounOf(); return n.charAt(0).toUpperCase() + n.slice(1); }
  /** "{a} SMA · {b} SMK · {c} MA" for the jenis shown (titles, the rail card). */
  function splitWords(byJ) {
    if (!byJ) return '';
    return shownJenis().map(function (j) { return fm().int((byJ[j] && byJ[j].n) || 0) + ' ' + JENIS_WORD[j]; }).join(' · ');
  }

  /* ================================================== v6: scope 15 km | 30 km (V6_SPEC §3.1, D3, D4) */

  /* Own copy of MCD.inst.scope (INSTITUSI lane) for a shell without it: the same sessionStorage record
     {"v":1,"schools":30,"campus":30} (numbers only), memory when storage is blocked. */
  var LOCAL_SCOPE = { mem: {}, fns: [] };
  function sstore() { try { return window.sessionStorage || null; } catch (e) { return null; } }
  var LOCAL_SCOPE_API = {
    KEY: SCOPE_KEY,
    get: function (section, def) {
      var v = null;
      try { var ss = sstore(), raw = ss ? ss.getItem(SCOPE_KEY) : null, o = raw ? JSON.parse(raw) : null; if (o && o.v === 1) v = o[section]; } catch (e) { v = null; }
      if (v == null && Object.prototype.hasOwnProperty.call(LOCAL_SCOPE.mem, section)) v = LOCAL_SCOPE.mem[section];
      return v === 15 || v === 30 ? v : def;
    },
    set: function (section, val) {
      val = +val === 30 ? 30 : 15;
      LOCAL_SCOPE.mem[section] = val;
      try {
        var ss = sstore();
        if (ss) { var o = null; try { o = JSON.parse(ss.getItem(SCOPE_KEY) || 'null'); } catch (e) { o = null; } if (!o || o.v !== 1) o = { v: 1 }; o[section] = val; ss.setItem(SCOPE_KEY, JSON.stringify(o)); }
      } catch (e) { /* kept in memory */ }
      LOCAL_SCOPE.fns.slice().forEach(function (fn) { try { fn(section, val); } catch (e) { /* ignore */ } });
      return val;
    },
    on: function (fn) { if (isFn(fn)) LOCAL_SCOPE.fns.push(fn); return function () { LOCAL_SCOPE.fns = LOCAL_SCOPE.fns.filter(function (f) { return f !== fn; }); }; }
  };
  function scopeApi() { var I0 = MCD.inst, s = I0 && I0.scope; return s && isFn(s.get) && isFn(s.set) ? s : LOCAL_SCOPE_API; }
  function scopeGet() { var v = 15; try { v = scopeApi().get(ID, 15); } catch (e) { v = 15; } return +v === 30 ? 30 : 15; }
  function scopeNow() { return st && st.f.km > 15 ? 30 : 15; }
  /** Staff chose a scope (any switch, the slim rail, the ring, an action): stored, then applied. */
  function setScope(v, o) {
    v = +v === 30 ? 30 : 15;
    /* applied first, then stored: the store's listener (below) then finds the view already there and stays quiet */
    applyScope(v, o);
    try { scopeApi().set(ID, v); } catch (e) { /* the view still changes */ }
  }
  function applyScope(v, o) {
    if (!st) return;
    syncScopes(v);
    if (st.f.km === v) return;
    setF({ km: v }, o);
    if (v === 30) need30();
    if (!(o && o.quiet)) announceScope();
  }
  function syncScopes(v) {
    v = v || scopeNow();
    scopeSwitches.forEach(function (s) { try { s.set(v); } catch (e) { /* ignore */ } });
  }
  /** "Cakupan 30 km. 1.234 sekolah tampil." (the symbols on the map) through the section's live region. */
  function announceScope() {
    if (!ui || !ui.live) return;
    var n = V ? V.rows.length : 0;
    ui.live.textContent = '';
    var msg = 'Cakupan ' + scopeNow() + ' km. ' + count(n, nounOf()) + ' tampil.';
    setTimeout(function () { if (ui && ui.live) ui.live.textContent = msg; }, 30);
  }
  /**
   * One scope control (MCD.inst.scopeSwitch when INSTITUSI has it, else the same radiogroup here):
   * div[role=radiogroup][aria-label="Cakupan jarak dari Mabes TNI"] with "15 km" and "30 km"; ← → (↑ ↓), Home, End.
   */
  function scopeCtl(o) {
    o = o || {};
    var I0 = MCD.inst, r = null;
    if (I0 && isFn(I0.scopeSwitch)) {
      try {
        r = I0.scopeSwitch({ section: ID, value: scopeNow(), onChange: function (v) { setScope(v, { quiet: true }); }, vertical: !!o.vertical, wide: !!o.wide, label: o.label !== false,
          hint: o.hint ? { id: 'sk-scope30', text: SCOPE30_HINT, at: 30 } : null,
          announce: function (v) { return 'Cakupan ' + v + ' km. ' + count(V ? V.rows.length : 0, nounOf()) + ' tampil.'; } });
      } catch (e) { r = null; }
      var el0 = r && r.nodeType === 1 ? r : (r && r.el && r.el.nodeType === 1 ? r.el : null);
      if (el0) {
        var ms = el0.mcdScope || null;
        var api0 = { el: el0, own: false, field: true,
          set: function (v) { if (ms && isFn(ms.get) && ms.get() === v) return; if (isFn(el0.set)) { try { el0.set(v); } catch (e) { /* ignore */ } } },
          status: function (text, so) { if (ms && isFn(ms.status)) { try { ms.status(text, so); } catch (e) { /* ignore */ } } } };
        scopeSwitches.push(api0);
        return api0;
      }
    }
    var api = ownScope(o);
    /* the same field as MCD.inst.scopeSwitch: visible label "Cakupan", the radiogroup, a status line, the 30 km hint */
    var st0 = E('div', { class: 'sk-scope__st', hidden: true });
    var hint = E('div', { class: 'sk-scope__hint' });
    var field = E('div', { class: ['sk-scopefield', o.vertical ? 'is-vertical' : null] },
      o.label === false || o.vertical ? null : E('span', { class: 'sk-ctl__l', aria: { hidden: 'true' }, text: 'Cakupan', title: SCOPE_TIP }), api.el, st0, hint);
    var group = api.el, setGroup = api.set;
    api.el = field;
    api.field = true;
    api.set = function (v) {
      setGroup(v);
      if (!o.hint) return;
      clear(hint);
      if (v === 30) { var hn = hintNode('sk-scope30', E('p', { class: 'sk-note', text: SCOPE30_HINT })); if (hn) hint.appendChild(hn); }
    };
    api.status = function (text, so) {
      so = so || {};
      clear(st0);
      st0.hidden = !text;
      st0.classList.toggle('is-error', !!so.retry);
      if (!text) { group.removeAttribute('aria-busy'); return; }
      st0.setAttribute('aria-live', 'polite');
      st0.appendChild(E('p', { class: 'sk-load__t', text: so.retry ? String(text).replace(/\s*Coba lagi\.?\s*$/, '') : text }));
      if (so.retry) st0.appendChild(btn('Coba lagi', 'reset', function () { so.retry(); }, 'btn--ghost btn--bar'));
      if (so.busy) group.setAttribute('aria-busy', 'true'); else group.removeAttribute('aria-busy');
    };
    api.set(scopeNow());
    return api;
  }
  function ownScope(o) {
    var wrap = E('div', { class: ['scope', 'seg', 'sk-scope', o.vertical ? 'is-vertical' : null, o.cls], role: 'radiogroup', aria: { label: SCOPE_ARIA }, title: SCOPE_TIP });
    var btns = SCOPES.map(function (v) {
      var b = E('button', { type: 'button', class: 'seg__opt', role: 'radio', aria: { checked: 'false' }, attrs: { tabindex: '-1' }, text: v + ' km' });
      b.addEventListener('click', function () { setScope(v); });
      wrap.appendChild(b);
      return b;
    });
    wrap.addEventListener('keydown', function (e) {
      var k = e.key, i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      var n = k === 'Home' ? 0 : k === 'End' ? btns.length - 1 : (k === 'ArrowRight' || k === 'ArrowDown') ? Math.min(btns.length - 1, i + 1) : (k === 'ArrowLeft' || k === 'ArrowUp') ? Math.max(0, i - 1) : -1;
      if (n < 0) return;
      e.preventDefault();
      btns[n].focus();
      setScope(SCOPES[n]);
    });
    var api = { el: wrap, own: true, set: function (v) { btns.forEach(function (b, i) { var on = SCOPES[i] === v; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); } };
    api.set(scopeNow());
    scopeSwitches.push(api);
    return api;
  }

  /* ================================================== v6: lazy data (V6_SPEC §9.1) */

  function need(name) {
    if (!SC || !isFn(SC.lazy)) return Promise.resolve(null);
    var p;
    try { p = SC.lazy(name); } catch (e) { return Promise.resolve(null); }
    return p.then(function (g) { return g; }, function () { return null; });
  }
  function need30() { return need('school-students'); }
  function needTiers() { return need('institution-tiers'); }
  function needContacts() { return need('school-contacts'); }
  /** The scope or a jenis needs the 30 km file: SMK / MA on, or 30 km. */
  function wants30() { var s = showNow(); return !!(st && (st.f.km > 15 || s.smk || s.ma)); }
  /** Idle loads after the mount (§9.1): students at 2 s, kelas biaya at 2,5 s, contacts at 4 s; never in the mount frame. */
  function scheduleLazy() {
    lazyTimers.forEach(clearTimeout);
    lazyTimers = [];
    function idle(ms, fn) {
      lazyTimers.push(setTimeout(function () {
        if (!ctx) return;
        var ric = window.requestIdleCallback;
        if (isFn(ric)) { try { ric(function () { if (ctx) fn(); }, { timeout: 1500 }); return; } catch (e) { /* timer below */ } }
        fn();
      }, ms));
    }
    idle(2000, need30);
    idle(2500, needTiers);
    idle(4000, needContacts);
  }

  /* ================================================== v6: kelas biaya (V6_SPEC §4) */

  function TD() { var T = window.MCD_INSTITUTION_TIERS; return T && Array.isArray(T.rows) && isFn(T.byId) && T.meta ? T : null; }
  function tiersState() { return TD() ? 'ready' : (SC && isFn(SC.dataStatus) ? SC.dataStatus('institution-tiers') : 'error'); }
  function rowId(i) { var A = SC && SC.students; return A && isFn(A.idOf) ? A.idOf(SC.idx, i) : null; }
  function capWords(s) { s = String(s || '').trim(); if (!s) return ''; s = s.charAt(0).toUpperCase() + s.slice(1); return /[.!?]$/.test(s) ? s : s + '.'; }
  /** The tier model of §4.1 from the file itself (MCD.inst.tierOf when INSTITUSI has it). */
  function tierFallback(id) {
    var T = TD(), r = T && id ? T.byId(id) : null, M0 = (T && T.meta) || {};
    var none = { tier: null, label: 'Belum diketahui', level: 0, basis: null, basisWords: '', check: null, checkWords: '', fee: null, year: null, url: null, quote: null, fetched: null, note: null, source: null };
    if (!r) return none;
    var tm = (M0.tiers || []).filter(function (x) { return x.label === r.tier || x.id === String(r.tier).toLowerCase(); })[0];
    if (!tm) return none;
    var types = (M0.types && M0.types.sekolah) || {}, bw = '';
    if (r.basis === 'biaya') bw = r.year ? 'Dari biaya resmi, ' + r.year : 'Dari biaya resmi (tahun tidak disebut)';
    else if (r.basis === 'jenis') bw = 'Dari jenis sekolah: ' + (types[r.type] || r.type || '');
    else if (r.basis === 'perkiraan') bw = 'Perkiraan dari jenis sekolah dan daya beli area' + (r.area ? ' (' + r.area + ')' : '');
    return { tier: tm.id, label: tm.label, level: tm.level, basis: r.basis || null, basisWords: bw, check: r.check || null,
      checkWords: capWords((M0.checkWords || {})[r.check]), fee: r.fee || null, year: r.year || null, url: r.url || null, quote: r.quote || null,
      fetched: r.fetched || null, note: r.note || null, source: r.url ? 'situs resmi sekolah' : null };
  }
  var TIERC = { T: null, inst: null, m: new Map() };
  /** tierOf a school row → {tier, label, level, basis, basisWords, …} or null while the file is not in (§4.2 loading). */
  function tierOf(i) {
    var T = TD(), I = SC && SC.idx;
    if (!T || !I || i == null || i < 0 || i >= I.n) return null;
    var I0 = MCD.inst && isFn(MCD.inst.tierOf) ? MCD.inst : null;
    if (TIERC.T !== T || TIERC.inst !== I0 || TIERC.idx !== I) TIERC = { T: T, inst: I0, idx: I, m: new Map() };
    if (TIERC.m.has(i)) return TIERC.m.get(i);
    var id = rowId(i), t = null;
    if (I0) { try { t = I0.tierOf(id, { kind: 'sekolah' }); } catch (e) { t = null; } }
    if (!t || typeof t !== 'object') t = tierFallback(id);
    if (t && t.tier && !t.label) t = Object.assign({}, t, { label: (TIERS.filter(function (x) { return x.id === t.tier; })[0] || {}).label || '' });
    TIERC.m.set(i, t);
    return t;
  }
  /** The filter key of a row: 'premium' … 'reguler', 'unknown' (Belum diketahui), or null while the file is not in. */
  function tierKey(i) { var t = tierOf(i); return t ? (t.tier || 'unknown') : null; }
  function tierLevel(i) { var t = tierOf(i); return t && t.tier ? (+t.level || 0) : 0; }
  /** Four small bars (D6): the first `level` filled (fee or type) or outlined (perkiraan); no bars for level 0. */
  function tierBarsEl(level, basis) {
    var w = E('span', { class: ['sk-bars', basis === 'perkiraan' ? 'is-line' : 'is-fill'], aria: { hidden: 'true' } });
    for (var k = 1; k <= 4; k++) w.appendChild(E('i', { class: k <= level ? 'is-on' : null }));
    return w;
  }
  /** "Kelas biaya Atas, dari biaya resmi" chip (MCD.inst.tierChip when INSTITUSI has it). */
  function tierChipEl(t) {
    if (!t) return null;
    var I0 = MCD.inst;
    if (I0 && isFn(I0.tierChip)) { try { var n = I0.tierChip(t); if (n && n.nodeType === 1) return n; } catch (e) { /* own chip below */ } }
    var lv = +t.level || 0, words = t.tier ? t.label : 'Belum diketahui';
    var said = 'Kelas biaya ' + words + (t.basisWords ? ', ' + t.basisWords.charAt(0).toLowerCase() + t.basisWords.slice(1) : '');
    return E('span', { class: 'sk-tier', title: said, aria: { label: said } }, lv ? tierBarsEl(lv, t.basis) : null, E('span', { text: words }));
  }
  /** "Atas · dari biaya resmi, 2026/2027" (fold preview). */
  function tierPreview(t) {
    if (!t) return tiersState() === 'error' ? 'belum tersedia' : 'memuat';
    if (!t.tier) return 'Belum diketahui';
    return t.label + (t.basisWords ? ' · ' + t.basisWords.charAt(0).toLowerCase() + t.basisWords.slice(1) : '');
  }
  function hostOf(url) { try { var u = new URL(String(url)); return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, '') : ''; } catch (e) { return ''; } }
  function safeHref(url) { try { var u = new URL(String(url)); return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password && /\./.test(u.hostname) ? u.href : null; } catch (e) { return null; } }
  /** An outside link that opens only on a click, in a new tab, without a referrer (§5.2 link rules). */
  function extLink(href, text, title, cls) {
    var h = safeHref(href);
    if (!h) return null;
    return E('a', { class: ['sk-ext', cls], href: h, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', title: title || 'Buka di tab baru. Perlu internet.' },
      E('span', { text: text }), icon('external'), E('span', { class: 'sr-only', text: ', terbuka di tab baru' }));
  }
  function dateWords(ymd0) { var f = fm(); try { return ymd0 ? f.date(ymd0) : ''; } catch (e) { return String(ymd0 || ''); } }
  /** The "Kelas biaya" fold (§4.4): MCD.inst.tierBlock when INSTITUSI has it, else the same content here. */
  function tierBlockFor(i) {
    var id = rowId(i), t = tierOf(i), I0 = MCD.inst, el = null;
    if (t && I0 && isFn(I0.tierBlock)) { try { el = I0.tierBlock(id, { kind: 'sekolah', veiled: veil() }); } catch (e) { el = null; } }
    if (el && el.nodeType === 1) {
      if (!el.getAttribute('data-fold')) el.setAttribute('data-fold', 'biaya');
      if (!el.getAttribute('data-preview')) el.setAttribute('data-preview', tierPreview(t));
      if (!el.getAttribute('data-open')) el.setAttribute('data-open', '0');
      return el;
    }
    var kids = [], stt = tiersState();
    if (!t) {
      kids.push(E('p', { class: 'sk-note', text: stt === 'error' ? 'Kelas biaya belum tersedia.' : TIER_LOADING }));
      if (stt === 'error') kids.push(btn('Coba lagi', 'reset', function () { needTiers(); }, 'btn--ghost btn--bar'));
    } else if (!t.tier) {
      kids.push(E('p', { class: 'sk-note', text: TIER_NONE }));
    } else {
      kids.push(E('p', { class: 'sk-dd-status' }, tierChipEl(t)));
      if (t.basisWords) kids.push(E('p', { class: 'sk-tierblk__basis', text: t.basisWords }));
      if (t.fee && t.fee.text) kids.push(kv('Biaya', t.fee.text));
      if (t.quote) kids.push(E('p', { class: 'sk-tierblk__q', text: '“' + String(t.quote).slice(0, 160) + '”' }));
      if (t.basis === 'biaya') {
        if (t.fetched) kids.push(E('p', { class: 'sk-note', text: 'Sumber: situs resmi sekolah, dibaca ' + dateWords(t.fetched) }));
        var h = hostOf(t.url);
        var a = veil() ? null : extLink(t.url, 'Buka sumber biaya', 'Buka sumber biaya di tab baru (' + h + '). Perlu internet.', 'sk-tierblk__src');
        if (a) kids.push(E('p', { class: 'sk-tierblk__link' }, a, h ? E('span', { class: 'sk-tierblk__host', text: h }) : null));
      } else if (t.checkWords) kids.push(E('p', { class: 'sk-note', text: t.checkWords }));
      if (t.note) kids.push(E('p', { class: 'sk-note', text: t.note }));
    }
    kids.push(E('p', { class: 'sk-note', text: TIER_LINE }));
    return blk('Kelas biaya', kids, 'sk-dd--tier', { id: 'biaya', preview: tierPreview(t), open: false });
  }

  /* ================================================== v6: kontak & identitas (V6_SPEC §5) */

  function CD() { var C = window.MCD_SCHOOL_CONTACTS; return C && Array.isArray(C.rows) && isFn(C.byNpsn) ? C : null; }
  function contactsState() { return CD() ? 'ready' : (SC && isFn(SC.dataStatus) ? SC.dataStatus('school-contacts') : 'error'); }
  /** The NPSN of a row: the app's own, else the one the 30 km file matched to an OpenStreetMap point (8 rows). */
  function npsnOf(i) { var I = SC.idx; if (I && I.npsn[i]) return I.npsn[i]; var s = sInfo(i); return s && s.npsn ? String(s.npsn) : ''; }
  var SRC_WORDS = { sekolahkita: 'Sekolah Kita (Dapodik)', referensi: 'Data Referensi Kemendikdasmen', 'sekolahkita, referensi': 'Sekolah Kita (Dapodik) dan Data Referensi Kemendikdasmen' };
  function srcLine(code, fetched) { var w = SRC_WORDS[code]; return w ? w + (fetched ? ' · ' + dateWords(fetched) : '') : ''; }
  /** Digits without an area code (no 0 or 62 in front): shown and copyable, never a tel: link (D18). */
  function noAreaCode(num) { var d = String(num || '').replace(/[^\d]/g, ''); return !!d && !/^(0|62)/.test(d); }
  function telHrefOf(C, p) {
    if (!p || noAreaCode(p.number)) return null;
    var h = null;
    try { h = C && isFn(C.telHref) ? C.telHref(p) : null; } catch (e) { h = null; }
    return h && /^tel:\+?\d{7,15}$/.test(h) ? h : null;
  }
  function mailOf(v) { var s = String(v || '').trim().toLowerCase(); return /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/.test(s) ? s : null; }
  function copyBtn(text, aria, toastText) {
    var b = E('button', { type: 'button', class: 'btn btn--ghost btn--bar sk-copy', aria: { label: aria }, title: aria }, icon('copy'), E('span', { text: 'Salin' }));
    b.addEventListener('click', function () { copy(text).then(function () { if (ctx) ctx.toast(toastText); }, function () { if (ctx) ctx.toast('Fitur salin tidak tersedia di browser ini', 'warn'); }); });
    return b;
  }
  function kvSrc(k, v, src) { var r = kv(k, v); if (src) r.appendChild(E('span', { class: 'sk-kv__src', text: src })); return r; }
  function dapodikBadge(h) {
    var I0 = MCD.inst;
    if (I0 && isFn(I0.logo)) { try { var n = I0.logo('dapodik', { px: h || 24 }); if (n && n.nodeType === 1) return n; } catch (e) { /* own tile below */ } }
    return E('span', { class: 'sk-srcbadge', title: 'Sumber data: Dapodik' }, E('img', { src: DAPODIK_LOGO, alt: DAPODIK_ALT, width: Math.round((h || 24) * 480 / 227), height: h || 24, decoding: 'async' }));
  }
  /** The section's own identity rows for the fold (jenjang, jenis, catatan data, yayasan TNI). */
  function identityRows(i) {
    var I = SC.idx, t = I.tni[i] >= 0 ? I.tniRows[I.tni[i]] : null, j = jenisOf(i), s = sInfo(i);
    var np = npsnOf(i), pt = I.src[i] === 2 ? 'daftar yayasan TNI' : I.npsn[i] ? 'Dapodik' : 'OpenStreetMap / Overture · tanpa NPSN';
    var rows = [
      kv('Jenjang', JENIS_NAME[j] || 'SMA'),
      kv('Jenis', E('span', {}, symLabel(i), I.inf[i] ? ' (tanpa NPSN)' : '')),
      kv('Catatan data', (np && !I.npsn[i] ? 'NPSN ' + np + ' · ' : '') + 'Titik dari ' + pt)
    ];
    if (s && s.npsnMatched && s.note) rows.push(E('p', { class: 'sk-note', text: s.note }));
    if (t) rows.push(kv('Yayasan TNI', E('span', { class: 'sk-tnirow' }, tniBadge(t), E('span', { text: [t.foundation, SC.config.matraFull[t.matra], t.npyp ? 'NPYP ' + t.npyp : null, t.accreditation ? 'Akreditasi ' + t.accreditation : null].filter(Boolean).join(' · ') }))));
    return rows;
  }
  /** "(021) 840 1234 · NPSN 20100123" (fold preview); never a number while names are veiled. */
  function contactPreview(i) {
    var np = npsnOf(i), C = CD(), c = C && np ? C.byNpsn(np) : null;
    var tel = !veil() && c && c.phone && c.phone[0] ? c.phone[0].number : '';
    return [tel, np ? 'NPSN ' + np : 'tanpa NPSN'].filter(Boolean).join(' · ');
  }
  /** "Kontak & identitas" (§5.2, D14): MCD.inst.contactBlock when INSTITUSI has it, else the same rules here. */
  function contactBlockFor(i) {
    var id = rowId(i), I0 = MCD.inst, el = null;
    if (I0 && isFn(I0.contactBlock)) {
      try { el = I0.contactBlock(id, { veiled: veil(), toast: function (m) { if (ctx) ctx.toast(m); }, identity: identityRows(i), kind: 'sekolah' }); } catch (e) { el = null; }
    }
    if (el && el.nodeType === 1) {
      if (!el.getAttribute('data-fold')) el.setAttribute('data-fold', 'kontak');
      if (!el.getAttribute('data-preview')) el.setAttribute('data-preview', contactPreview(i));
      if (!el.getAttribute('data-open')) el.setAttribute('data-open', '0');
      return el;
    }
    return blk('Kontak & identitas', contactRows(i), 'sk-dd--kontak', { id: 'kontak', preview: contactPreview(i), open: false });
  }
  function contactRows(i) {
    var np = npsnOf(i), kids = [], C = CD(), c = C && np ? C.byNpsn(np) : null, stt = contactsState();
    var npsnRow = np ? kv('NPSN', E('span', { class: 'sk-kvv' }, E('span', { class: 'sk-mono', text: np }), copyBtn(np, 'Salin NPSN ' + np, 'NPSN disalin'))) : null;
    if (!np) kids.push(E('p', { class: 'sk-note', text: 'Sekolah ini tidak memiliki NPSN, sehingga kontaknya tidak dapat dicari.' }));
    else if (veil()) { kids.push(npsnRow); kids.push(E('p', { class: 'sk-note', text: 'Kontak disembunyikan saat nama disamarkan.' })); }
    else if (!C) {
      kids.push(npsnRow);
      kids.push(E('p', { class: 'sk-note', text: stt === 'error' ? 'Kontak tidak dapat dimuat. Coba lagi.' : 'Memuat kontak…' }));
      if (stt === 'error') kids.push(btn('Coba lagi', 'reset', function () { needContacts(); }, 'btn--ghost btn--bar'));
    } else {
      var phones = c && Array.isArray(c.phone) ? c.phone.filter(function (p) { var d = String(p && p.number || '').replace(/[^\d]/g, ''); return d.length >= 7 && d.length <= 15; }) : [];
      var mail = c ? mailOf(c.email) : null, web = c && c.website ? String(c.website) : null, wl = null;
      try { wl = c && isFn(C.webLink) ? C.webLink(c) : null; } catch (e) { wl = null; }
      var fetched = c && c.fetched, srcs = (c && c.src) || {};
      if (!phones.length && !mail && !web && !(c && c.webCheck === 'dibuang')) {
        kids.push(E('p', { class: 'sk-note' }, 'Kontak sekolah belum tercatat di daftar resmi. ', extLink(REF_BASE + np, 'Lihat Data Referensi Kemendikdasmen', 'Buka Data Referensi Kemendikdasmen di tab baru. Perlu internet.')));
        if (c && c.emailWhy) kids.push(E('p', { class: 'sk-note', text: 'E-mail di daftar resmi tampak milik pribadi, sehingga tidak ditampilkan.' }));
      } else {
        var tv = E('span', { class: 'sk-phones' });
        phones.forEach(function (p) {
          var href = telHrefOf(C, p), na = noAreaCode(p.number);
          var line = E('span', { class: 'sk-phone' }, href ? E('a', { href: href, title: 'Hubungi melalui aplikasi telepon di perangkat ini.', text: p.number }) : E('span', { class: 'sk-mono', text: p.number }),
            na ? E('span', { class: 'sk-mini-tag', title: 'Nomor ini tercatat tanpa kode area. Tambahkan kode area saat menelepon dari ponsel.', text: 'tanpa kode area' }) : null,
            p.mobile ? E('span', { class: 'sk-mini-tag', title: 'Nomor seluler yang tercatat sebagai kontak lembaga di Dapodik.', text: 'seluler' }) : null,
            copyBtn(p.number, 'Salin nomor telepon ' + p.number, 'Nomor telepon disalin'));
          tv.appendChild(line);
        });
        kids.push(kvSrc('Telepon', phones.length ? tv : 'Telepon belum tercatat.', phones.length ? srcLine(srcs.phone, fetched) : ''));
        kids.push(kvSrc('E-mail', mail ? E('span', { class: 'sk-kvv' }, E('a', { href: 'mailto:' + mail, title: 'Tulis e-mail dengan aplikasi e-mail di perangkat ini.', text: mail }), copyBtn(mail, 'Salin alamat e-mail ' + mail, 'Alamat e-mail disalin'))
          : (c && c.emailWhy ? 'E-mail di daftar resmi tampak milik pribadi, sehingga tidak ditampilkan.' : 'E-mail belum tercatat.'), mail ? srcLine(srcs.email, fetched) : ''));
        var wv;
        if (c && c.webCheck === 'dibuang') wv = 'Alamat situs di daftar resmi tidak ditampilkan karena tidak aktif atau tidak aman.';
        else if (!web) wv = 'Situs resmi belum tercatat.';
        else if (wl && safeHref(wl)) {
          var hst = hostOf(wl), tt = 'Buka situs resmi di tab baru. Perlu internet.' + (c.webCheck === 'dialihkan' ? ' Situs ini terbuka di alamat lain milik lembaga yang sama.' : c.webCheck === 'belum' ? ' Alamat dari daftar resmi, belum diperiksa.' : '');
          wv = E('span', { class: 'sk-kvv' }, extLink(wl, hst, tt, 'sk-web'), /^http:/i.test(wl) ? E('span', { class: 'sk-kv__src', text: 'Situs ini tidak menggunakan HTTPS.' }) : null);
        } else wv = E('span', {}, E('span', { class: 'sk-mono', text: hostOf(web) || web }), E('span', { class: 'sk-kv__src', text: 'Situs resmi tidak dapat dibuka saat diperiksa.' }));
        kids.push(kvSrc(/facebook\.com|instagram\.com|blogspot\.|wordpress\.com|sites\.google\.com/i.test(web || '') ? 'Halaman resmi' : 'Situs resmi', wv, web && c.webCheck !== 'dibuang' ? srcLine(srcs.website, fetched) : ''));
      }
      kids.push(npsnRow);
      if (c && c.akreditasi) kids.push(kvSrc('Akreditasi', c.akreditasi, 'BAN-PDM, tercatat di Dapodik'));
      if (c && c.address) kids.push(kvSrc('Alamat', c.address, srcLine(srcs.address, fetched)));
      if (c && c.officialName) kids.push(kv('Nama di Dapodik', c.officialName));
    }
    identityRows(i).forEach(function (r) { kids.push(r); });
    kids.push(E('p', { class: 'sk-srcline' }, dapodikBadge(24), E('span', { text: 'Data siswa: Dapodik' })));
    if (np && !veil()) kids.push(E('p', { class: 'sk-reflink' }, extLink(REF_BASE + np, 'Lihat di Data Referensi Kemendikdasmen', 'Buka Data Referensi Kemendikdasmen di tab baru. Perlu internet.')));
    return kids;
  }
  /** Institutional contacts of a row for the CSV (§5.2 exports): official values only, empty while names are veiled. */
  function contactCsv(i) {
    if (veil()) return {};
    var I0 = MCD.inst;
    if (I0 && isFn(I0.contactCsv)) {
      try { var o = I0.contactCsv(rowId(i), { veiled: false }); if (o) return { telepon: o.telepon, seluler: o.telepon_seluler_resmi, email: o.email, situs: o.situs_resmi, sumber: o.sumber_kontak }; } catch (e) { /* own copy below */ }
    }
    var np = npsnOf(i), C = CD(), c = C && np ? C.byNpsn(np) : null;
    if (!c) return {};
    var phones = (c.phone || []).map(function (p) { return p && p.number; }).filter(Boolean);
    var wl = null;
    try { wl = isFn(C.webLink) ? C.webLink(c) : null; } catch (e) { wl = null; }
    var srcs = c.src || {}, from = uniq([srcs.phone, srcs.email, srcs.website].filter(Boolean).map(function (s) { return SRC_WORDS[s] || s; }));
    return { telepon: phones.join('; '), seluler: (c.phone || []).some(function (p) { return p && p.mobile; }) ? 'ya' : '', email: mailOf(c.email) || '',
      situs: wl && safeHref(wl) ? safeHref(wl) : '', sumber: from.join('; ') + (from.length && c.fetched ? ' · ' + c.fetched : '') };
  }
  function tierCsv(i) {
    var t = tierOf(i);
    if (!t) return {};
    var I0 = MCD.inst;
    if (I0 && isFn(I0.tierCsv)) {
      try { var o = I0.tierCsv(rowId(i)); if (o) return { kelas: o.kelas_biaya, dasar: o.dasar_kelas_biaya, biaya: o.biaya_resmi, tahun: o.tahun_biaya, sumber: o.sumber_biaya }; } catch (e) { /* own copy below */ }
    }
    return { kelas: t.tier ? t.label : 'Belum diketahui', dasar: t.basisWords || '', biaya: t.fee && t.fee.text ? t.fee.text : '', tahun: t.year || '', sumber: t.basis === 'biaya' && t.url ? (safeHref(t.url) || '') : '' };
  }

  function seg(label, opts, onPick, extra) {
    var wrap = E('div', { class: ['seg', 'sk-seg', extra], role: 'radiogroup', aria: { label: label } });
    var btns = opts.map(function (o) {
      var b = E('button', { type: 'button', class: 'seg__opt', role: 'radio', aria: { checked: 'false' }, title: o.title || o.label, attrs: { tabindex: '-1' } }, o.label);
      b.addEventListener('click', function () { onPick(o.v); });
      wrap.appendChild(b);
      return b;
    });
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      n.focus(); n.click();
    });
    return {
      el: wrap,
      set: function (v) {
        var any = false;
        btns.forEach(function (b, i) { var on = same(opts[i].v, v); any = any || on; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
        if (!any && btns[0]) btns[0].tabIndex = 0;
      }
    };
  }
  function toggle(label, onChange, o) {
    o = o || {};
    var b = E('button', { type: 'button', class: ['toggle', 'sk-toggle', o.cls], role: 'switch', aria: { checked: 'false' }, title: o.title || null },
      E('span', { class: 'toggle__track', aria: { hidden: 'true' } }), E('span', { class: 'sk-toggle__t', text: label }));
    var on = false;
    b.addEventListener('click', function () { if (!b.disabled) onChange(!on); });
    return { el: b, set: function (v, disabled, title) { on = !!v; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.disabled = !!disabled; if (title !== undefined) b.title = title || ''; } };
  }
  function btn(label, iconName, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['btn', cls || 'btn--secondary'], title: title || null }, iconName ? icon(iconName) : null, E('span', { text: label }));
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function link(label, onClick, cls) {
    var b = E('button', { type: 'button', class: ['sk-link', cls], text: label });
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function exhibit(o) {
    var titleEl = E('h3', { class: 'exhibit__title sk-ex__title' });
    var subEl = E('p', { class: 'exhibit__sub sk-ex__sub' });
    var body = E('div', { class: 'sk-ex__body' });
    var src = E('p', { class: 'exhibit__source sk-ex__src' });
    var root = E('article', { class: ['exhibit', 'sk-ex', o.cls] }, o.eyebrow ? E('p', { class: 'sk-ex__eyebrow', text: o.eyebrow }) : null, titleEl, subEl, o.tools || null, body, src);
    return { el: root, title: titleEl, sub: subEl, body: body, src: src,
      set: function (t, s, so) { titleEl.textContent = t || ''; subEl.textContent = s || ''; src.textContent = so || ''; subEl.hidden = !s; src.hidden = !so; } };
  }
  function download(name, text, type) {
    try {
      var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = E('a', { href: url, download: name, hidden: true });
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return Promise.reject(new Error('clipboard'));
  }
  function exportBlocked() {
    if (MCD.demo && MCD.demo.blocks && MCD.demo.blocks()) return true;
    if (veil()) { ctx.toast('Ekspor tidak tersedia saat nama disamarkan. Tekan V untuk menampilkan nama lagi.', 'warn'); return true; }
    return false;
  }

  /* Status chip in words: green nasabah · red prospek · grey tanpa data · blue potensi. */
  var STATUS = {
    1: { tone: 'potential', label: 'SMA (file sekolah belum diimpor)', short: 'Potensi' },
    2: { tone: 'ok', label: 'Nasabah Mandiri', short: 'Nasabah' },
    3: { tone: 'bad', label: 'Prospek, belum nasabah', short: 'Prospek' },
    4: { tone: 'none', label: 'Tidak ada di file sekolah', short: 'Tanpa data' }
  };
  var TYPE_WORD = { 0: 'Negeri', 1: 'Swasta', 2: 'Jenis belum diketahui' };
  function typeWord(i) { return TYPE_WORD[i] || TYPE_WORD[2]; }
  /** Status code of a school row for chips: the view's code, else potential / no data. */
  function codeOf(i) { return V ? (V.status[i] || (V.hasBank ? 4 : 1)) : 1; }
  function chipEl(code, text) {
    var s = STATUS[code] || STATUS[4];
    return E('span', { class: 'sk-st sk-st--' + s.tone }, E('i', { class: 'sk-st__dot', aria: { hidden: 'true' } }), E('span', { text: text || s.short }));
  }
  function toneChip(tone, text) {
    return E('span', { class: 'sk-st sk-st--' + tone }, E('i', { class: 'sk-st__dot', aria: { hidden: 'true' } }), E('span', { text: text }));
  }

  /* --------------------------------------------- charts (charts-plus.js, with a plain fallback) */

  function chart(kind, el, data, cfg) {
    var C = MCD.charts;
    if (C && typeof C[kind] === 'function') {
      try { var h = C[kind](el, data, cfg); if (h) { handles.push(h); return h; } } catch (e) { if (window.console) console.warn('[schools] chart ' + kind, e); }
    }
    return fallbackChart(kind, el, data, cfg);
  }
  /** Text-only stand-in when charts-plus.js is not loaded: the same numbers as a short list. */
  function fallbackChart(kind, el, data, cfg) {
    var cur = { d: data || {}, c: cfg || {} };
    function draw() {
      clear(el);
      el.classList.add('sk-fb');
      var d = cur.d, f = fm(), list = E('ul', { class: 'sk-fb__list' });
      if (kind === 'bigNumber') {
        el.appendChild(E('p', { class: 'sk-fb__l', text: d.label || '' }));
        el.appendChild(E('p', { class: 'sk-fb__v', text: d.value == null ? '—' : (typeof d.value === 'string' ? d.value : f.int(d.value)) }));
        if (d.note) el.appendChild(E('p', { class: 'sk-fb__n', text: d.note }));
        return;
      }
      if (kind === 'statusBar') {
        var lab = (cur.c.labels || {});
        ['acquired', 'partly', 'notYet', 'noData', 'potential'].forEach(function (k) {
          if (d[k] != null) list.appendChild(E('li', { text: (lab[k] || k) + ': ' + f.int(d[k]) }));
        });
      } else if (kind === 'donut' || kind === 'pie') {
        (d.slices || []).forEach(function (s) { list.appendChild(E('li', { text: s.label + ': ' + f.int(s.value) })); });
      } else if (kind === 'combo') {
        (d.categories || []).forEach(function (c, i) {
          var parts = (d.bars || []).map(function (b) { return b.label + ' ' + f.int(b.values[i]); });
          if (d.line && d.line.values[i] != null) parts.push(d.line.label + ' ' + f.int(d.line.values[i]));
          list.appendChild(E('li', { text: (c.label || c) + ': ' + parts.join(' · ') }));
        });
      } else if (kind === 'heatmap') {
        (d.rows || []).forEach(function (r, i) {
          var parts = (d.cols || []).map(function (c, j) { var v = d.values[i][j]; v = v && typeof v === 'object' ? v.value : v; return c.label + ' ' + (v == null ? '—' : d.scale === 'coverage' || d.scale === 'ranked' ? f.pct(v, 0) : f.int(v)); });
          list.appendChild(E('li', { text: r.label + ': ' + parts.join(' · ') }));
        });
      }
      el.appendChild(list);
    }
    draw();
    return { el: el, kind: kind, update: function (d, c) { if (d) cur.d = Object.assign({}, cur.d, d); if (c) cur.c = Object.assign({}, cur.c, c); draw(); }, destroy: function () { clear(el); }, highlight: function () {}, resize: function () {} };
  }
  function dropHandle(h) {
    if (!h) return;
    try { h.destroy(); } catch (e) { /* ignore */ }
    handles = handles.filter(function (x) { return x !== h; });
  }

  /* ===================================================================== state */

  function defaultCalc() {
    var c = SC.calcDefaults();
    c.siswa = 190; c.spp = 290000;
    return c;
  }
  function defaults() {
    return {
      f: { km: 15, type: 'all', tni: false, inf: false, tiers: null },
      show: { sma: true, ma: false, smk: false },
      tab: 'list', kecAll: false, kecSort: 'k17', sort: 'schools', listSort: 'near', topSort: 'k17', q: '', sq: '',
      mapShow: 'both', wide: false, workOpen: false, pipeStage: '', pipeProd: '',
      selKec: null, calc: defaultCalc(), calcTarget: ''
    };
  }
  /** Filters live in memory only (UX_FIX_PLAN D14, C-07): the filters are never restored. The scope (15 or 30 km) is a
      view setting kept per browser tab (V6_SPEC D4, mcd.scope.v1). The jenis switches (SMA · SMK · MA, v6 D5) and the
      list order are display choices, remembered per browser; SMA alone is the default, and a choice saved before
      16 Oct 2026 (no showV) was the old default, so it is not restored. At least one jenis stays on. */
  function loadState() {
    var s = defaults(), saved = sget(UI_KEY, null);
    if (saved && saved.v === 2) {
      var tab = OLD_TAB[saved.tab] || saved.tab;
      if (TABS.some(function (t) { return t.id === tab; })) s.tab = tab;
      if (/^(schools|students|nearest|score)$/.test(saved.sort)) s.sort = saved.sort;
      if (/^(both|dots|kec|tiles)$/.test(saved.mapShow)) s.mapShow = saved.mapShow === 'tiles' ? 'kec' : saved.mapShow;
      if (/^(near|k17|stu|tier)$/.test(saved.listSort)) s.listSort = saved.listSort;
      if (/^(near|k17)$/.test(saved.topSort)) s.topSort = saved.topSort;
      if (/^(k17|n|stu)$/.test(saved.kecSort)) s.kecSort = saved.kecSort;
      if (saved.showV === 2 && saved.show && typeof saved.show === 'object') {
        s.show = { sma: saved.show.sma !== false, ma: saved.show.ma === true, smk: saved.show.smk === true };
        if (!s.show.sma && !s.show.ma && !s.show.smk) s.show.sma = true;
      }
      s.kecAll = !!saved.kecAll;
      s.wide = !!saved.wide;
    }
    s.f.km = scopeGet();
    var c = sget(CALC_KEY, null);
    if (c && c.v === 2 && c.inputs) SC.config.calcFields.forEach(function (fd) { if (fd.k in c.inputs) s.calc[fd.k] = c.inputs[fd.k]; });
    if (c && c.v === 2 && typeof c.target === 'string') s.calcTarget = c.target;
    return s;
  }
  var saveUi = function () {};
  var saveCalc = function () {};

  function setF(patch, opts) {
    var f = Object.assign({}, st.f, patch || {});
    if (KMS.indexOf(f.km) < 0) f.km = 15;
    if (f.tiers && (!Array.isArray(f.tiers) || f.tiers.length >= TIERS.length)) f.tiers = null;
    if (same(f, st.f)) return;
    var kmChanged = f.km !== st.f.km;
    st.f = f;
    saveUi();
    refresh(['filters']);
    if (kmChanged) { applyZones(); syncScopes(); }
    if (((opts && opts.camera) || kmChanged) && !(opts && opts.camera === false)) cameraForKm();
  }
  /** "Hapus filter" (and filters:reset): the scope is a view setting, not a filter, so it stays (V6_SPEC D4). */
  function resetF(opts) { setF({ type: 'all', tni: false, inf: false, tiers: null }, opts); }
  /** The jenis shown on the map (SMA · SMK · MA, v6 D5): every number, list and chip follows; at least one stays on. */
  function setShow(patch) {
    var next = Object.assign({}, st.show, patch || {});
    if (!next.sma && !next.ma && !next.smk) return;
    if (same(next, st.show)) return;
    st.show = next;
    saveUi();
    if (next.smk || next.ma) need30();
    refresh(['filters']);
  }
  function noun() { return nounOf(); }
  function filtersActive() { var f = st.f; return f.type !== 'all' || f.tni || f.inf || !!f.tiers; }
  function presetForKm(km) { return km === 30 ? 'ring30' : 'sma' + km; }
  function cameraForKm() { if (MCD.map && MCD.map.preset) MCD.map.preset(presetForKm(st.f.km)); }
  /** Zones (item 30, V6_SPEC §3.3): the 15 km kecamatan focus; at 30 km the kecamatan focus of the 30 km circle. */
  var zonesSet = false;
  function applyZones(reset) {
    var Mp = MCD.map;
    if (!Mp || !isFn(Mp.setZones)) return;
    var wide = !reset && st && st.f.km > 15;
    if (!wide && !zonesSet) return;
    try { Mp.setZones(wide ? { mode: 'kecamatan', km: 30 } : { mode: 'kecamatan15' }); zonesSet = wide; } catch (e) { /* the map keeps its zones */ }
  }
  function tierWords(list) { return (list || []).map(function (id) { return (TIERS.filter(function (t) { return t.id === id; })[0] || {}).label; }).filter(Boolean).join(', '); }

  /** Active filters as chips in the section header (ctx.filterChips, A-09) when the shell has them. No scope chip (D4). */
  function syncChips() {
    if (!ctx || !isFn(ctx.filterChips)) return;
    var f = st.f, chips = [];
    if (f.type !== 'all') chips.push({ label: f.type === 'private' ? 'Swasta' : 'Negeri', onClear: function () { setF({ type: 'all' }); } });
    if (f.tni) chips.push({ label: 'Yayasan TNI', onClear: function () { setF({ tni: false }); } });
    if (f.inf) chips.push({ label: 'Sekolah tanpa NPSN disembunyikan', onClear: function () { setF({ inf: false }); } });
    if (f.tiers) chips.push({ label: 'Kelas biaya: ' + (tierWords(f.tiers) || 'tidak ada'), onClear: function () { setF({ tiers: null }); } });
    try { ctx.filterChips(chips, { onClearAll: resetF }); } catch (e) { /* the shell has its own guard */ }
  }

  /* ================================================================ SMA index */

  /**
   * SMA-level rows of the school index, nearest first, with their class (SMA / MA / other) and kecamatan; v6: X.uni =
   * every SMA, MA and SMK within 30 km of Mabes TNI, nearest first (the rows of data/school-students.js).
   */
  function smaIdx(I) {
    if (X.idx === I && X.rows) { ensureKec(I); return X; }
    var cls = new Uint8Array(I.n), rows = [], uni = [], classify = typeof SC.smaClass === 'function' ? SC.smaClass : smaClass;
    for (var k = 0; k < I.n; k++) {
      var i = I.order[k];
      if (I.jen[i] === 4) { if (I.dist[i] <= 30) uni.push(i); continue; }
      if (I.jen[i] !== 3) continue;
      var c = classify(I.name[i], !!I.npsn[i]);
      cls[i] = c === 0 ? 3 : c;
      rows.push(i);
      if (c !== 0 && I.dist[i] <= 30) uni.push(i);
    }
    X = { idx: I, cls: cls, rows: rows, uni: uni, kec: null, kel: null, clusters: {} };
    ensureKec(I);
    return X;
  }
  function ensureKec(I) {
    if (X.kec) return;
    var A = admin();
    if (!A) return;
    var kec = new Array(I.n), kel = new Array(I.n);
    X.rows.concat(X.uni.filter(function (i) { return I.jen[i] === 4; })).forEach(function (i) {
      var loc = null;
      try { loc = A.locate(I.lon[i], I.lat[i]); } catch (e) { loc = null; }
      kec[i] = loc ? loc.kecamatanId : null;
      kel[i] = loc ? loc.kelurahanId : null;
    });
    X.kec = kec; X.kel = kel;
  }
  function relNow() {
    var I = SC.idx, recs = (MCD.data && MCD.data.sekolah) || [];
    if (!I || !recs.length) return null;
    return SC.relFor(I, recs, { version: (MCD.data && MCD.data.version) || 1, demo: relDemo() });
  }
  function kecName(id) {
    var T = territory();
    if (T) { var k = kecIndex()[id]; if (k) return k.name; }
    var A = admin(), r = A && A.byId(id);
    return r ? r.name : id;
  }
  var KEC_IX = { n: 0, map: null };
  function kecIndex() {
    var T = territory();
    if (!T) return {};
    if (KEC_IX.map) return KEC_IX.map;
    var m = {};
    T.kecamatan().forEach(function (k) { m[k.id] = k; });
    KEC_IX.map = m;
    return m;
  }
  function kelName(id) { var A = admin(), r = id && A ? A.byId(id) : null; return r ? r.name : null; }

  /* ================================================================ view model */

  /**
   * computeView() → V: every figure the panels and the map need, for the current filters (v6: every jenis shown).
   *   rows    the schools of the jenis shown within the scope, after the filters (status, yayasan TNI, tanpa NPSN,
   *           kelas biaya): the map symbols, lists, KPIs and the yayasan board. "Kemungkinan tidak aktif" schools
   *           (0 students, or probably closed outside the pilot) stay in rows with that flag but are never counted;
   *           duplicate points are left out (V6_SPEC §1.1 display rule; the Labiomed sum rule in the adapter).
   *   base    the same without the distance (the TNI card lists up to 30 km)
   *   kec     per kecamatan, the rows within the scope only (so "Gunungputri · 24 SMA" at 15 km matches the 366 total,
   *           Ringkasan and the student file); nAll = every counted school of the kecamatan up to 30 km
   *   byJ     per jenis: {n, stu, stuN, k17, inactive, noData}; tierCounts: the kelas biaya chips (everything but that
   *           filter); kpi.noData: counted schools without a student count; kpi.loading: of those, still loading
   *   ctxMa, ctxSmk  (tests, v5 names) the MA and SMK rows shown within the scope
   * Students, 17+ and under 17 (siswa − siswa 17+, Tabungan SimPel, item 35(a)) follow the display rule of
   * MCD.schools.students; under 17 is summed only over schools with both counts.
   */
  function newKecAgg(id) { return { id: id, n: 0, nAll: 0, priv: 0, pub: 0, unk: 0, tni: 0, stu: 0, stuN: 0, k17: 0, k17Est: 0, u17: 0, u17N: 0, inactive: 0, cust: 0, pros: 0, none: 0, nJ: { sma: 0, smk: 0, ma: 0 }, rows: [] }; }
  function newJ() { return { n: 0, stu: 0, stuN: 0, k17: 0, inactive: 0, noData: 0, rows: 0 }; }
  function tierSig() { return TD() ? 't' + (MCD.inst && isFn(MCD.inst.tierOf) ? 'i' : 'o') : tiersState(); }
  function computeView() {
    var I = SC.idx;
    if (!I) { V = null; return null; }
    var Xs = smaIdx(I), f = st.f, rel = relNow(), S0 = SS(), show = showNow();
    var relSig = rel ? [rel.version, rel.total, rel.demo ? 1 : 0, (MCD.data && MCD.data.version) || 0].join(':') : '0';
    var sig = [I.n, f.km, f.type, f.tni ? 1 : 0, f.inf ? 1 : 0, (f.tiers || []).join(','), show.sma !== false ? 1 : 0, show.ma ? 1 : 0, show.smk ? 1 : 0, relSig,
      Xs.kec ? 1 : 0, territory() ? 1 : 0, S0 ? S0.sig() : '-', f30Ready() ? 1 : 0, f30State(), tierSig()].join('|');
    if (V && V.sig === sig) return V;
    var v = {
      sig: sig, rel: rel, hasBank: !!rel, demo: !!(rel && relDemo()), km: f.km, students: !!(S0 || f30Ready()), s30: f30Ready(), s30State: f30State(),
      status: new Uint8Array(I.n), rows: [], base: [], tni: [], allKm: 0, hidden: 0, ctxMa: [], ctxSmk: [],
      n: { 5: 0, 10: 0, 15: 0, 30: 0 }, nTni: { 5: 0, 10: 0, 15: 0, 30: 0 },
      mix: { priv: 0, tni: 0, pub: 0, unk: 0 },
      kpi: { n: 0, priv: 0, pub: 0, unk: 0, tni: 0, stu: 0, stuN: 0, k17: 0, k17Off: 0, k17Est: 0, k17EstN: 0, u17: 0, u17N: 0, inactive: 0, cust: 0, pros: 0, none: 0, noData: 0, loading: 0, fee: 0 },
      byJ: { sma: newJ(), smk: newJ(), ma: newJ() }, tiers: !!TD(), tierCounts: { premium: 0, atas: 0, menengah: 0, reguler: 0, unknown: 0, biaya: 0 },
      kec: {}, ents: [], entMap: new Map()
    };
    function typeOk(i) { return !(f.type === 'private' && I.st[i] !== 1) && !(f.type === 'public' && I.st[i] !== 0); }
    var aggs = v.entMap, tierOn = f.tiers && v.tiers ? f.tiers : null;
    for (var k = 0; k < Xs.uni.length; k++) {
      var i = Xs.uni[k], j = jenisOf(i), d = I.dist[i];
      if (j === 'sma' ? show.sma === false : !show[j]) continue;
      if (f.inf && I.inf[i]) continue;
      var si = sInfo(i);
      if (si && si.duplicate) { v.hidden++; continue; }
      var inact = !!(si && si.inactive);
      if (!inact) {
        if (d <= 5) v.n[5]++;
        if (d <= 10) v.n[10]++;
        if (d <= 15) v.n[15]++;
        v.n[30]++;
      }
      if (I.tni[i] >= 0) {
        v.tni.push(i);
        if (d <= 5) v.nTni[5]++;
        if (d <= 10) v.nTni[10]++;
        if (d <= 15) v.nTni[15]++;
        v.nTni[30]++;
      }
      var inKm = d <= f.km;
      if (inKm && !inact) {
        v.allKm++;
        if (I.tni[i] >= 0) v.mix.tni++; else if (I.st[i] === 1) v.mix.priv++; else if (I.st[i] === 0) v.mix.pub++; else v.mix.unk++;
      }
      if (!typeOk(i)) continue;
      if (f.tni && I.tni[i] < 0) continue;
      /* kelas biaya: the chips count what every other filter lets through (a facet ignores its own dimension) */
      var tk = v.tiers ? tierKey(i) : null;
      if (inKm && !inact && tk) { v.tierCounts[tk]++; if (tierOf(i).basis === 'biaya') v.tierCounts.biaya++; }
      if (tierOn && tk && tierOn.indexOf(tk) < 0) continue;
      v.base.push(i);
      var code = 1;
      if (rel) { var r = SC.relationOf(rel, I, i); code = r === 'active' ? 2 : r === 'prospect' ? 3 : 4; }
      v.status[i] = code;
      var stu = stuOf(i), k17 = si && !inact ? si.k17 : null;
      var u17 = k17 != null && si.students != null ? Math.max(0, si.students - k17) : null;
      var kid = Xs.kec ? Xs.kec[i] : null;
      if (kid) {
        var ka = v.kec[kid] || (v.kec[kid] = newKecAgg(kid));
        if (!inact) ka.nAll++;
        if (inKm) {
          ka.rows.push(i);
          if (inact) ka.inactive++;
          else {
            ka.n++;
            ka.nJ[j]++;
            if (I.st[i] === 1) ka.priv++; else if (I.st[i] === 0) ka.pub++; else ka.unk++;
            if (I.tni[i] >= 0) ka.tni++;
            if (stu >= 0) { ka.stu += stu; ka.stuN++; }
            if (k17 != null) { ka.k17 += k17; if (!si.k17Official) ka.k17Est += k17; }
            if (u17 != null) { ka.u17 += u17; ka.u17N++; }
            if (code === 2) ka.cust++; else if (code === 3) ka.pros++; else if (code === 4) ka.none++;
          }
        }
      }
      if (!inKm) continue;
      v.rows.push(i);
      if (j === 'ma') v.ctxMa.push(i); else if (j === 'smk') v.ctxSmk.push(i);
      var K = v.kpi, BJ = v.byJ[j];
      BJ.rows++;
      if (inact) { K.inactive++; BJ.inactive++; continue; }
      K.n++; BJ.n++;
      if (I.st[i] === 1) K.priv++; else if (I.st[i] === 0) K.pub++; else K.unk++;
      if (I.tni[i] >= 0) K.tni++;
      if (stu >= 0) { K.stu += stu; K.stuN++; BJ.stu += stu; BJ.stuN++; }
      else { K.noData++; BJ.noData++; if (si && (si.missing === 'loading' || si.missing === 'failed')) K.loading++; }
      if (k17 != null) { K.k17 += k17; BJ.k17 += k17; if (si.k17Official) K.k17Off += k17; else { K.k17Est += k17; K.k17EstN++; } }
      if (u17 != null) { K.u17 += u17; K.u17N++; }
      if (code === 2) K.cust++; else if (code === 3) K.pros++; else if (code === 4) K.none++;
      if (v.tiers) { var tt = tierOf(i); if (tt && tt.basis === 'biaya') K.fee++; }
      var e = I.ent[i];
      if (e >= 0) {
        var a = aggs.get(e);
        if (!a) { a = { e: e, n: 0, core: 0, jen: [0, 0, 0, 0, 0, 0, 0], students: 0, studentsN: 0, k17: 0, dmin: Infinity, dmax: 0, rows: [], anyActiveRow: false, cust: 0 }; aggs.set(e, a); }
        a.n++; a.jen[I.jen[i]]++; a.rows.push(i);
        if (d <= 15) a.core++;
        if (stu >= 0) { a.students += stu; a.studentsN++; }
        if (k17 != null) a.k17 += k17;
        if (d < a.dmin) a.dmin = d;
        if (d > a.dmax) a.dmax = d;
        if (code === 2) { a.anyActiveRow = true; a.cust++; }
      }
    }
    aggs.forEach(function (a) {
      var E0 = I.ents[a.e];
      a.key = E0.key; a.label = E0.label; a.tni = E0.tni; a.kind = E0.kind; a.foundation = E0.foundation; a.npyp = E0.npyp;
      a.netKey = E0.netKey; a.netLabel = E0.netLabel; a.pattern = E0.pattern; a.inferred = E0.inferred; a.competitors = E0.competitors || [];
      a.nAll = E0.n;
      var sc = SC.score(a);
      a.score = sc.score; a.parts = sc.parts;
      a.fit = SC.fit(a);
      if (rel) {
        var re = rel.byEntity.get(a.e);
        a.active = !!(re && re.status === 'nasabah');
        a.prospect = !!(re && re.status !== 'nasabah') || a.rows.some(function (ri) { return v.status[ri] === 3; });
        a.held = {};
        if (re) re.products.forEach(function (p) { a.held[p] = 1; });
        a.rows.forEach(function (ri) { var rr = rel.byRow.get(ri); if (rr) rr.products.forEach(function (p) { a.held[p] = 1; }); });
      }
      v.ents.push(a);
    });
    /* kecamatan list: the 15 km focus (MCD.territory) with names; at 30 km also every other kecamatan with a school in
       scope (names from data/admin-areas.js), each marked whether it is a pilot kecamatan (focus15) */
    var T = territory(), list = [], seen = {}, A = admin();
    if (T) T.kecamatan().forEach(function (k2) { var a = v.kec[k2.id] || newKecAgg(k2.id); a.name = k2.name; a.kota = k2.kotaName; a.dist = k2.distKm; a.focus = true; a.focus15 = (k2.in15 || 0) >= 0.5; v.kec[k2.id] = a; list.push(a); seen[k2.id] = 1; });
    Object.keys(v.kec).forEach(function (id) {
      if (seen[id]) return;
      var a = v.kec[id];
      if (T && f.km <= 15 && !a.n) return;
      var rec = A && isFn(A.byId) ? A.byId(id) : null, kr = rec && rec.kota && isFn(A.byId) ? A.byId(rec.kota) : null;
      a.name = rec ? rec.name : kecName(id); a.kota = kr ? kr.name : ''; a.dist = rec && isNum(rec.distKm) ? rec.distKm : null; a.focus15 = !!(rec && (rec.in15 || 0) >= 0.5);
      list.push(a);
    });
    list.forEach(function (a) { a.cov = rel && a.n ? a.cust / a.n : null; });
    list.sort(function (a, b) { return (b.n - a.n) || (a.name < b.name ? -1 : 1); });
    v.kecList = list;
    v.rank = rankKec(list, T, !!rel);
    v.terr = T ? terrStats(v) : null;
    V = v;
    return v;
  }

  /**
   * One coverage language (COPY_STYLE item 18, as in Merchant and Ringkasan): the kecamatan with at least
   * half their area within 15 km and SMA in them are ranked by the share of their SMA that bank with Mandiri
   * (SMA nasabah ÷ SMA) and split into thirds: green strongest, amber middle, red weakest (prioritas kunjungan),
   * ties in the lower third, grey = not ranked. Same cut rule as MCD.territory.terciles; when the shares do not
   * vary enough (fewer than 3 different values) the fixed 50% / 20% bands apply and the legend says so.
   * Sets a.band3 ('acquired' | 'partly' | 'notYet' | 'noData') and a.ranked on each row.
   */
  function rankKec(list, T, hasBank) {
    var minIn = 0.5, kin = {}, info = { applied: false, lo: null, hi: null, n: 0, minInFocus: minIn };
    if (T) T.kecamatan().forEach(function (k) { kin[k.id] = k.in15 || 0; });
    var b = (MCD.config && MCD.config.coverageBands) || { ok: 0.5, mid: 0.2 };
    var pool = list.filter(function (a) { return hasBank && a.n > 0 && isNum(a.cov) && (kin[a.id] || 0) >= minIn; });
    info.n = pool.length;
    var terc = T && T.terciles ? T.terciles : (MCD.charts && MCD.charts.status && MCD.charts.status.rankCuts);
    var cut = terc ? terc(pool.map(function (a) { return a.cov; })) : null;
    list.forEach(function (a) { a.band3 = null; a.ranked = false; });
    if (cut) {
      info.applied = true; info.lo = cut.lo; info.hi = cut.hi;
      pool.forEach(function (a) { a.band3 = a.cov <= cut.lo ? 'notYet' : (a.cov <= cut.hi ? 'partly' : 'acquired'); a.ranked = true; });
      list.forEach(function (a) { if (!a.ranked) a.band3 = 'noData'; });
    } else {
      list.forEach(function (a) { a.band3 = !hasBank || !a.n || !isNum(a.cov) ? 'noData' : (a.cov >= b.ok ? 'acquired' : a.cov >= b.mid ? 'partly' : 'notYet'); });
    }
    return info;
  }
  var THIRD = { acquired: 'Sepertiga tertinggi', partly: 'Sepertiga tengah', notYet: 'Sepertiga terendah', noData: 'Tidak dinilai' };
  var BAND_TONE = { acquired: 'ok', partly: 'mid', notYet: 'bad', noData: 'none', potential: 'potential' };
  /** "Sepertiga terendah dari 24 kecamatan, kunjungi lebih dulu · peringkat 20 dari 24" (or the fixed band in words). */
  function kecThird(a) {
    if (!V || !V.hasBank || !a || !a.n) return null;
    if (V.rank && V.rank.applied) {
      if (!a.ranked) return 'Tidak dinilai: kurang dari separuh wilayahnya dalam 15 km';
      var above = 0;
      V.kecList.forEach(function (x) { if (x.ranked && x.cov > a.cov) above++; });
      return THIRD[a.band3] + ' dari ' + V.rank.n + ' kecamatan' + (a.band3 === 'notYet' ? ', kunjungi lebih dulu' : '') + ' · peringkat ' + (above + 1) + ' dari ' + V.rank.n;
    }
    var b = (MCD.config && MCD.config.coverageBands) || { ok: 0.5, mid: 0.2 };
    return a.band3 === 'acquired' ? Math.round(b.ok * 100) + '% atau lebih SMA nasabah Mandiri' : a.band3 === 'partly' ? Math.round(b.mid * 100) + '–' + Math.round(b.ok * 100) + '% SMA nasabah Mandiri' : 'Di bawah ' + Math.round(b.mid * 100) + '% SMA nasabah Mandiri';
  }

  /** Stats in the shape MCD.territory.layers() reads, per kecamatan only: SMA count, SMA nasabah, share, band. */
  function terrStats(v) {
    var b = (MCD.config && MCD.config.coverageBands) || { ok: 0.5, mid: 0.2 }, hasBank = v.hasBank, kec = {};
    v.kecList.forEach(function (a) {
      kec[a.id] = { potential: a.n, acquired: hasBank ? a.cust : null, notYet: hasBank ? a.n - a.cust : null, edc: null, unlisted: null,
        coverage: a.cov, band: !a.n ? 'noData' : (!hasBank ? 'potential' : (a.band3 || 'noData')), ranked: !!a.ranked };
    });
    return {
      key: 'sma|' + v.sig, hasBank: hasBank, demo: v.demo, rule: 'known', bands: b, categories: [], bandMode: 'relative',
      relative: { kecamatan: hasBank ? v.rank : null, kelurahan: null },
      totals: { potential: v.base.length }, kecamatan: kec, kelurahan: {}
    };
  }

  /** Nearest clusters: places where at least CLUSTER_MIN SMA sit within 1 km of each other (greedy, within 15 km). */
  function clusters() {
    var I = SC.idx;
    if (!I || !V) return [];
    var key = [st.f.inf ? 1 : 0, SS() ? 1 : 0].join('');
    if (X.clusters[key]) return X.clusters[key];
    var pts = [];
    X.rows.forEach(function (i) {
      var c = X.cls[i], s = sInfo(i);
      if (c !== 1 || (st.f.inf && I.inf[i]) || I.dist[i] > 15 || (s && (s.duplicate || s.inactive))) return;
      pts.push(i);
    });
    var nb = pts.map(function (i) { return pts.filter(function (j) { return kmFast(I.lon[i], I.lat[i], I.lon[j], I.lat[j]) <= DENSITY_KM; }); });
    var order = pts.map(function (i, k) { return k; }).sort(function (a, b) { return (nb[b].length - nb[a].length) || (I.dist[pts[a]] - I.dist[pts[b]]); });
    var used = {}, out = [];
    order.forEach(function (k) {
      var i = pts[k];
      if (used[i]) return;
      var mem = nb[k].filter(function (j) { return !used[j]; });
      if (mem.length < CLUSTER_MIN) return;
      mem.forEach(function (j) { used[j] = 1; });
      var loc = null, A = admin();
      if (A) { try { loc = A.locate(I.lon[i], I.lat[i]); } catch (e) { loc = null; } }
      out.push({ centre: i, rows: mem, n: mem.length, km: I.dist[i], kel: loc ? loc.kelurahan : null, kec: loc ? loc.kecamatan : null });
    });
    out.sort(function (a, b) { return a.km - b.km; });
    X.clusters[key] = out;
    return out;
  }

  /* ============================================================== map layers */

  /** Status colours as RGB for deck layers: MCD.territory's mirror of the --status-* tokens for the map palette,
      else the page tokens themselves (read through getComputedStyle). */
  function statusPal(ms) {
    var T = MCD.territory;
    if (T && typeof T.palette === 'function') { var p = T.palette(ms); return { key: p.key, ok: p.status.ok, mid: p.status.mid, bad: p.status.bad, none: p.status.none, potential: p.status.potential }; }
    var K = ms.kit.palette, theme = document.documentElement.getAttribute('data-theme') || '';
    if (TOK.key !== theme) TOK = { key: theme, v: {} };
    function tok(name, fb) {
      if (!(name in TOK.v)) { var raw = ''; try { raw = getComputedStyle(document.documentElement).getPropertyValue(name); } catch (e) { raw = ''; } TOK.v[name] = parseRGB(raw); }
      return TOK.v[name] || fb;
    }
    return { key: 'tok' + theme, ok: tok('--status-ok', K.text1), mid: tok('--status-mid', K.gold), bad: tok('--status-bad', K.text1), none: tok('--status-none', K.text3), potential: tok('--status-potential', K.text2) };
  }
  var TOK = { key: null, v: {} };
  function parseRGB(s) {
    s = String(s || '').trim();
    var m = /^#([0-9a-f]{6})$/i.exec(s);
    if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    m = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (m) { var q = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); if (q.length >= 3) return [q[0], q[1], q[2]]; }
    return null;
  }
  function statusRGB(S, code) { return code === 2 ? S.ok : code === 3 ? S.bad : code === 4 ? S.none : S.potential; }

  var hl = { set: null, key: '' };
  function highlightRows(rows, ms0) {
    clearTimeout(hlTimer);
    hl = rows && rows.length ? { set: new Set(rows), key: rows.slice(0, 8).join(',') + ':' + rows.length } : { set: null, key: '' };
    if (MCD.map && MCD.map.requestRender) MCD.map.requestRender();
    if (hl.set) hlTimer = setTimeout(function () { highlightRows(null); }, ms0 || 6000);
  }

  function schoolMeta() { return { kind: 'smaSchool', id: function (i) { return i; }, tooltip: function (i) { return tipSchool(i); } }; }

  /** Icon size of a row at this zoom (MCD.schools.map.px), with a plain fallback. */
  function symPx(i, zq) { var Mx = symMod(), sp = specOf(i); return Mx && sp ? Mx.px(sp, zq) : 10; }
  /** SMA rows in drawing order: larger symbols first so small ones stay visible, TNI-foundation SMA on top. */
  function drawOrder() {
    if (V.drawRows && V.drawSig === V.sig) return V.drawRows;
    var I = SC.idx, step = {};
    V.rows.forEach(function (i) { var sp = specOf(i); step[i] = (sp ? sp.step || 0 : 0) - (I.tni[i] >= 0 ? 10 : 0); });
    V.drawRows = V.rows.slice().sort(function (a, b) { return step[b] - step[a] || I.dist[b] - I.dist[a]; });
    V.drawSig = V.sig;
    return V.drawRows;
  }

  function mapLayers(derived, ms) {
    var D = window.deck, out = { base: [], top: [] }, I = SC && SC.idx;
    if (!D || !I || !V || !ms || !ms.kit) return out;
    var overview = ms.view === 'overview';
    var show = overview ? 'both' : st.mapShow;
    if (show !== 'dots') terrLayers(out, ms);
    if (show === 'kec') return out;
    var K = ms.kit, P = K.palette, S = statusPal(ms), z = ms.zoom, zq = ms.zoomQ;
    var theme = ms.theme === 'day' ? 'day' : 'night', Mx = symMod(), atlas = Mx ? Mx.atlas(theme) : null;
    var pos = function (i) { return [I.lon[i], I.lat[i]]; };
    var hset = hl.set;
    var dataRows = drawOrder();
    var size = function (i) { return symPx(i, zq); };
    var inact = function (i) { var s = sInfo(i); return !!(s && s.inactive); };
    /* school symbols (item 34; v6 D5: SMA, SMK and MA alike): shape = jenis, colour = negeri / swasta, size = students,
       star = SMA yayasan TNI */
    if (atlas && D.IconLayer) {
      out.base.push(new D.IconLayer({
        id: 'schools-sma-icons', data: dataRows, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping,
        getIcon: function (i) { return Mx.iconKey(specOf(i)); }, getPosition: pos, getSize: size, sizeUnits: 'pixels',
        getColor: function (i) { return [255, 255, 255, hset && !hset.has(i) ? 60 : inact(i) ? 120 : 255]; },
        updateTriggers: { getIcon: [V.sig, atlas.key], getSize: [V.sig, zq], getColor: [hl.key, V.sig] },
        pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 70], beforeId: K.beforeId, mcd: schoolMeta()
      }));
    } else {
      /* no canvas: plain dots in the same colours */
      var C = Mx ? Mx.colours(theme) : { negeri: P.text1, swasta: P.gold, unknown: P.text3 || P.text1 };
      var fillOf = function (i) { var sp = specOf(i); return (sp && C[sp.tone]) || (I.st[i] === 0 ? C.negeri : C.swasta); };
      out.base.push(new D.ScatterplotLayer({
        id: 'schools-sma-dots', data: dataRows, getPosition: pos, radiusUnits: 'pixels', getRadius: function (i) { return size(i) / 2.4; },
        filled: true, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 1,
        getFillColor: function (i) { return rgba(fillOf(i), hset && !hset.has(i) ? 60 : inact(i) ? 120 : 230); },
        getLineColor: rgba(P.canvas, 215), updateTriggers: { getFillColor: [V.sig, hl.key, theme], getRadius: [V.sig, zq] },
        pickable: true, autoHighlight: true, highlightColor: rgba(P.text1, 70), beforeId: K.beforeId, mcd: schoolMeta()
      }));
    }
    /* Mandiri status once the school file is in: a green ring for nasabah, a red ring for prospek */
    if (V.hasBank) {
      var ringRows = dataRows.filter(function (i) { return V.status[i] === 2 || V.status[i] === 3; });
      if (ringRows.length) {
        out.top.push(new D.ScatterplotLayer({
          id: 'schools-sma-status', data: ringRows, getPosition: pos, radiusUnits: 'pixels', getRadius: function (i) { return size(i) / 2 + 2.5; },
          filled: false, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.2,
          getLineColor: function (i) { return rgba(statusRGB(S, V.status[i]), hset && !hset.has(i) ? 60 : 245); },
          updateTriggers: { getLineColor: [V.sig, hl.key, S.key], getRadius: [V.sig, zq] }, pickable: false, beforeId: K.beforeId
        }));
      }
    }
    /* kelas biaya (D6, §4.3): a "signal bars" badge at the symbol's top right while the filter is on or from zoom 14,
       never at the default zoom otherwise; filled = fee or school type, outline = perkiraan; no badge = belum diketahui */
    var TA = badgesOn(ms) && Mx && isFn(Mx.tierAtlas) ? Mx.tierAtlas(theme) : null;
    if (TA && D.IconLayer) {
      var badgeRows = dataRows.filter(function (i) { return tierLevel(i) > 0; });
      var bpx = Math.round(Math.max(10, Math.min(15, 12 * (zq >= 15 ? 1.15 : zq <= 11 ? 0.9 : 1))));
      /* in the base group, right above the symbols: the kecamatan chips, the selection ring and the names stay on top */
      out.base.push(new D.IconLayer({
        id: 'schools-tier-badges', data: badgeRows, iconAtlas: TA.iconAtlas, iconMapping: TA.iconMapping,
        getIcon: function (i) { var t = tierOf(i); return Mx.tierKey(t.level, t.basis); }, getPosition: pos, getSize: bpx, sizeUnits: 'pixels',
        getPixelOffset: function (i) { var s = size(i) / 2; return [Math.round(s * 0.7 + bpx * 0.45), -Math.round(s * 0.7 + bpx * 0.4)]; },
        getColor: function (i) { return [255, 255, 255, hset && !hset.has(i) ? 60 : inact(i) ? 120 : 255]; },
        updateTriggers: { getIcon: [V.sig, TA.key], getPixelOffset: [V.sig, zq], getColor: [hl.key, V.sig] },
        pickable: false, beforeId: K.beforeId
      }));
    }
    var tniRows = dataRows.filter(function (i) { return I.tni[i] >= 0; });
    var sel = MCD.state.get().selection, selRow = sel && sel.kind === 'smaSchool' ? +sel.id : -1;
    var selRows = [];
    if (selRow >= 0 && selRow < I.n) selRows.push(selRow);
    if (sel && sel.kind === 'smaYay') dataRows.forEach(function (i) { if (I.ent[i] === +sel.id) selRows.push(i); });
    if (selRows.length) {
      out.top.push(new D.ScatterplotLayer({
        id: 'schools-sma-sel', data: selRows, getPosition: pos, radiusUnits: 'pixels', getRadius: function (i) { return size(i) / 2 + 6; },
        filled: false, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.2, getLineColor: rgba(P.signal, 255),
        updateTriggers: { getRadius: [zq, V.sig] }, pickable: false, beforeId: K.beforeId
      }));
    }
    if (ms.fontsReady) {
      var lab = [];
      if (z >= 10) tniRows.forEach(function (i) { lab.push({ p: pos(i), t: shortName(I.name[i]) + ' · TNI ' + (SC.config.matra[I.matra[i]] || ''), pr: 3, dx: size(i) / 2 + 5 }); });
      if (z >= 14.6) dataRows.forEach(function (i) { if (I.tni[i] < 0 && (!hset || hset.has(i))) lab.push({ p: pos(i), t: shortName(I.name[i]), pr: 1, dx: size(i) / 2 + 5 }); });
      selRows.slice(0, 30).forEach(function (i) { lab.push({ p: pos(i), t: shortName(I.name[i]), pr: 4, dx: size(i) / 2 + 8 }); });
      lab = declutter(lab, z, 14);
      if (lab.length) {
        out.top.push(new D.TextLayer({
          id: 'schools-sma-labels', data: lab, getPosition: function (o) { return o.p; }, getText: function (o) { return o.t; },
          getSize: 12, sizeUnits: 'pixels', fontFamily: K.fonts.sans, fontWeight: 600, characterSet: 'auto',
          getColor: rgba(P.text1, 245), fontSettings: { sdf: true }, outlineWidth: 2.4, outlineColor: rgba(P.canvas, 235),
          getPixelOffset: function (o) { return [o.dx || 14, 0]; }, getTextAnchor: 'start', getAlignmentBaseline: 'center',
          updateTriggers: { getColor: ms.palette }, pickable: false, beforeId: K.beforeId
        }));
      }
    }
    return out;
  }
  /** Kelas biaya badges show while the kelas biaya filter is on, or from zoom 14 (D6). */
  function badgesOn(ms) { return !!(V && V.tiers && st && (st.f.tiers || (ms && isNum(ms.zoom) && ms.zoom >= TIER_ZOOM))); }
  function shortName(s) { s = String(s || ''); return s.length > 34 ? s.slice(0, 33) + '…' : s; }
  /** Greedy label placement in Web Mercator pixels at this zoom: highest priority first, no overlaps.
      (deck's CollisionFilterExtension hid every label in this deck build, so labels are decluttered here.) */
  function declutter(list, zoom, dx) {
    if (list.length < 2) return list;
    var W0 = 512 * Math.pow(2, zoom), boxes = [], out = [];
    list.slice().sort(function (a, b) { return b.pr - a.pr; }).forEach(function (l) {
      var x = (l.p[0] + 180) / 360 * W0, sy = Math.sin(l.p[1] * Math.PI / 180);
      var y = (0.5 - Math.log((1 + sy) / (1 - sy)) / (4 * Math.PI)) * W0;
      var w = String(l.t).length * 6.8 + 6, b = [x + dx - 2, y - 9, x + dx + w, y + 9];
      for (var i = 0; i < boxes.length; i++) { var o = boxes[i]; if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return; }
      boxes.push(b);
      out.push(l);
    });
    return out;
  }

  /** The calm kecamatan map (COPY_STYLE item 23): thin grey outlines, no fill, and a chip "Cipayung · 12 SMA"
      per kecamatan (a coloured dot for its third once the school file is imported). Shared territory layers. */
  function terrLayers(out, ms) {
    var T = territory();
    if (!T || !V || !V.terr) return;
    var stats = V.terr, res;
    try {
      res = T.layers({ id: 'schools-terr', ms: ms, stats: stats, selected: st.selKec || null, outside: 'outline', pickable: true,
        labelText: function (k) { return kecLabel(k); }, labelKey: stats.key });
    } catch (e) { return; }
    (res.base || []).forEach(function (L) {
      /* the kecamatan fill keeps the shared pick, with a tooltip about SMA instead of merchants */
      if (L && /-kec-fill$/.test(L.id) && typeof L.clone === 'function' && L.props && L.props.mcd) {
        L = L.clone({ mcd: Object.assign({}, L.props.mcd, { tooltip: function (o) { return o && o.kec ? tipKec(o.kec) : null; } }) });
      }
      out.base.push(L);
    });
    (res.top || []).forEach(function (L) { out.top.push(L); });
  }
  /* "Cipayung · 12 SMA" (SMA within the distance, as the panel counts them) before and after the import:
     the share of SMA nasabah is the dot and the popup */
  function kecLabel(k) {
    var a = V && V.kec[k.id];
    if (!a || !a.n) return k.name;
    return k.name + ' · ' + count(a.n, nounOf());
  }

  function tipSchool(i) {
    var I = SC.idx;
    if (!I || i == null || i < 0 || i >= I.n) return null;
    var f = fm(), t = I.tni[i] >= 0 ? I.tniRows[I.tni[i]] : null, lines = [], j = jenisOf(i);
    var Mx = symMod(), sp = specOf(i), e = I.ent[i] >= 0 ? I.ents[I.ent[i]] : null;
    var eyebrow = (t ? 'Yayasan TNI · ' + t.matra + ' · ' : '') + JENIS_WORD[j] + ' · ' + typeWord(I.st[i]) + (I.inf[i] ? ' · tanpa NPSN' : '');
    if (V && V.hasBank) { var S = STATUS[codeOf(i)] || STATUS[1]; lines.push({ kind: 'body', text: S.label + (V.demo && codeOf(i) > 1 ? ' (data contoh)' : '') }); }
    var who = e ? e.label : (I.yay[i] || (I.st[i] === 0 ? 'Sekolah negeri' : 'Yayasan tidak tercatat'));
    lines.push(Mx && sp ? { glyph: sp.glyph, rgb: Mx.rgb(sp.tone, uiTheme()), text: Mx.words(sp) + ' · ' + who } : { text: who });
    lines.push({ kind: 'body', text: studentsLine(i) });
    var tt = tierOf(i);
    if (tt && tt.tier) lines.push({ text: 'Kelas biaya ' + tt.label + (tt.basis === 'perkiraan' ? ' (perkiraan)' : '') });
    lines.push({ kind: 'meta', text: 'Jarak dari KCP · ' + distText(distOf(i)) });
    var kn = X.kec && X.kec[i] ? 'Kec. ' + kecName(X.kec[i]) + ' · ' : '';
    lines.push({ kind: 'meta', text: kn + f.km(I.dist[i]) + ' dari Mabes TNI' });
    lines.push({ kind: 'body', text: 'Klik untuk melihat detail' });
    return { eyebrow: eyebrow.toUpperCase(), title: I.name[i], lines: lines };
  }
  function tipKec(kid) {
    if (!kid || !V) return null;
    var a = V.kec[kid], f = fm(), lines = [], k = kecIndex()[kid], nn = nounOf();
    if (!a || !a.n) lines.push({ kind: 'body', text: 'Tidak ada ' + nn + ' dalam ' + st.f.km + ' km di kecamatan ini dengan filter ini.' });
    else {
      if (!V.hasBank) lines.push({ kind: 'body', text: count(a.n, nn) + ' dalam ' + st.f.km + ' km: ' + f.int(a.priv) + ' swasta · ' + f.int(a.pub) + ' negeri' + (a.tni ? ' · ' + f.int(a.tni) + ' yayasan TNI' : '') });
      else {
        lines.push({ kind: 'body', text: f.int(a.cust) + ' nasabah Mandiri · ' + f.int(a.pros) + ' prospek · ' + f.int(a.none) + ' tanpa data' });
        lines.push({ text: f.pct(a.cov, 0) + ' ' + nn + '-nya nasabah Mandiri' + (V.demo ? ' (data contoh)' : '') });
        var kt = kecThird(a);
        if (kt) lines.push({ text: kt });
      }
      if (V.students && a.stuN) lines.push({ text: count(a.stu, 'siswa') + ' · ' + (a.k17Est ? '± ' : '') + f.int(a.k17) + ' berusia 17+' + (a.u17N ? ' · ' + (a.k17Est ? '± ' : '') + f.int(a.u17) + ' di bawah 17' : '') });
    }
    lines.push({ kind: 'meta', text: 'Klik untuk melihat angkanya' });
    var kota = k && k.kotaName ? k.kotaName : (a && a.kota) || '';
    return { eyebrow: ('Kecamatan' + (kota ? ' · ' + kota : '')).toUpperCase(), title: kecName(kid), lines: lines };
  }

  /** The calm kecamatan popup (MCD.territory.bind): SMA figures, students, the rank in words, one action and Google Maps. */
  function kecPopup(kid) {
    var a = V && V.kec[kid], f = fm(), k = kecIndex()[kid];
    if (!V) return {};
    var n = a ? a.n : 0, unknown = 'Belum diketahui';
    var rows = [{ label: Noun() + ' dalam ' + st.f.km + ' km', value: f.int(n), tone: V.hasBank ? null : 'potential' }];
    if (a && a.nAll > n) rows.push({ label: 'Semua ' + noun() + ' di kecamatan ini', value: f.int(a.nAll) });
    if (V.students) {
      rows.push({ label: 'Siswa', value: a && a.stuN ? f.int(a.stu) : '—' });
      rows.push({ label: K17_LABEL, value: a && a.stuN ? (a.k17Est ? '± ' : '') + f.int(a.k17) : '—' });
      rows.push({ label: U17_LABEL, value: a && a.u17N ? (a.k17Est ? '± ' : '') + f.int(a.u17) : '—' });
    }
    rows.push({ label: Noun() + ' nasabah Mandiri', value: V.hasBank ? f.int(a ? a.cust : 0) : unknown, tone: 'ok' });
    rows.push({ label: 'Prospek, belum nasabah', value: V.hasBank ? f.int(a ? a.pros : 0) : unknown, tone: 'bad' });
    rows.push({ label: Noun() + ' yayasan TNI', value: f.int(a ? a.tni : 0) });
    var kd = k && isNum(k.distKm) ? k.distKm : (a && isNum(a.dist) ? a.dist : null);
    rows.push({ label: 'Jarak dari Mabes TNI', value: kd != null ? f.km(kd) : '—' });
    if (a && a.n && !onlySma()) rows.splice(1, 0, { label: 'Menurut jenis', value: splitWords({ sma: { n: a.nJ.sma }, smk: { n: a.nJ.smk }, ma: { n: a.nJ.ma } }) });
    var big = V.hasBank && a && a.n ? { value: f.pct(a.cov, 0), caption: Noun() + ' nasabah Mandiri' }
      : (V.students && a && a.stuN ? { value: (a.k17Est ? '± ' : '') + f.int(a.k17), caption: K17_LABEL } : { value: f.int(n), caption: Noun() + (V.hasBank ? '' : ' · file sekolah belum diimpor') });
    var chip = V.hasBank ? (a && a.n ? { tone: BAND_TONE[a.band3 || 'noData'], text: kecThird(a) || THIRD.noData } : null)
      : { tone: 'none', text: SHARE_HINT };
    /* v5 (item 43): the callout's brief (MCD.windows.callout through MCD.territory); the older popup reads rows, big and chip */
    return { rows: rows, big: big, chip: chip, demo: V.demo, kind: 'kec', key: 'kec:' + kid, brief: kecBrief(kid), anchor: kecAnchor(kid),
      source: (V.hasBank ? (V.demo ? 'Sumber: data contoh (ilustrasi) · ' : 'Sumber: file sekolah cabang (sheet 3_sekolah) · ') : 'Sumber: ') + SRC_SHORT + (V.students ? ' · ' + STU_SRC.replace('Data siswa: ', 'siswa: ') : '') + ' · ' + SRC_AREAS };
  }

  /**
   * The kecamatan brief (v5, §9): the big number is the share of SMA nasabah Mandiri with the school file, else siswa
   * 17+; then SMA within the distance and siswa 17+ (siswa without the school file). Main action "Lihat SMA di
   * kecamatan ini"; before the school file a once-per-browser note (hintId 'sk-import-share').
   */
  function kecBrief(kid) {
    if (!V) return null;
    var a = V.kec[kid], f = fm(), km = st.f.km, nums = [], nn = nounOf();
    var k17v = V.students && a && a.stuN ? (a.k17Est ? '± ' : '') + f.int(a.k17) : null;
    if (V.hasBank && a && a.n) nums.push({ label: Noun() + ' nasabah Mandiri', value: f.pct(a.cov, 0), big: true, tone: BAND_TONE[a.band3 || 'noData'], title: f.int(a.cust) + ' dari ' + count(a.n, nn) + ' nasabah Mandiri' + (V.demo ? ' (data contoh)' : '') });
    else if (k17v) nums.push({ label: 'Siswa 17+', value: k17v, big: true, title: K17_LABEL + (a.k17Est ? ', sebagian perkiraan' : '') });
    nums.push({ label: Noun() + ' dalam ' + km + ' km', value: f.int(a ? a.n : 0), title: a && a.n && !onlySma() ? splitWords({ sma: { n: a.nJ.sma }, smk: { n: a.nJ.smk }, ma: { n: a.nJ.ma } }) : null });
    if (V.hasBank) nums.push({ label: 'Siswa 17+', value: k17v || '—', title: K17_LABEL });
    else nums.push({ label: 'Siswa', value: a && a.stuN ? f.int(a.stu) : '—' });
    /* the chip names the third only ("Sepertiga tertinggi"); the rank in words is its title (a chip never wraps) */
    var chips = V.hasBank && a && a.n ? [{ text: THIRD[a.band3 || 'noData'] || THIRD.noData, tone: BAND_TONE[a.band3 || 'noData'], title: kecThird(a) || THIRD.noData }] : [];
    return {
      numbers: nums.slice(0, 3), chips: chips,
      primary: { label: listLabel(), run: function () { openKec(kid); } },
      note: V.hasBank ? null : { text: SHARE_HINT, tone: 'none', hintId: 'sk-import-share' }
    };
  }
  /** "Lihat SMA di kecamatan ini" while only SMA is on, "Lihat sekolah di kecamatan ini" otherwise (V6_SPEC §3.2). */
  function listLabel() { return onlySma() ? 'Lihat SMA di kecamatan ini' : 'Lihat sekolah di kecamatan ini'; }
  /** Where a kecamatan sits for the callout and the away rule: its bounding box and its label point. */
  function kecAnchor(kid) {
    var T = territory(), A = admin(), b = null, rec = null;
    try { b = T && isFn(T.boundsOf) ? T.boundsOf(kid) : null; } catch (e) { b = null; }
    try { rec = A && isFn(A.byId) ? A.byId(kid) : null; } catch (e) { rec = null; }
    if (!b && rec && rec.geometry && isFn(A.coordinates)) {
      /* the boundary file alone (MCD.territory still loading): the same box as MCD.territory.boundsOf */
      try {
        var c = A.coordinates(rec), polys = rec.geometry.type === 'Polygon' ? [c] : c, bb = [Infinity, Infinity, -Infinity, -Infinity];
        polys.forEach(function (pg) { pg[0].forEach(function (q) { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); }); });
        if (isFinite(bb[0])) b = [[bb[0], bb[1]], [bb[2], bb[3]]];
      } catch (e) { b = null; }
    }
    var lb = rec && Array.isArray(rec.label) ? [rec.label[0], rec.label[1]] : (b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : null);
    return b ? { bbox: b, label: lb } : (lb ? lb : null);
  }

  /** Legend counts under the panel's display rule (MCD.schools.students): the "kemungkinan tidak aktif" schools get
      their own faded row, so negeri + swasta + TNI + jenis belum diketahui = the SMA counted on the panel (V.kpi.n). */
  function legendCounts() {
    var I = SC.idx, c = { negeri: 0, swasta: 0, tni: 0, tniStar: 0, unknown: 0, inactive: 0, jenis: {}, split: {} };
    var st3 = { sma: [0, 0, 0], smk: [0, 0, 0], ma: [0, 0, 0] };
    V.rows.forEach(function (i) {
      var s = sInfo(i), j = jenisOf(i);
      if (s && s.inactive) { c.inactive++; return; }
      if (I.tni[i] >= 0) { c.tni++; if (j === 'sma') c.tniStar++; }
      else if (I.st[i] === 0) c.negeri++;
      else if (I.st[i] === 1) c.swasta++;
      else c.unknown++;
      st3[j][I.st[i] === 0 ? 0 : I.st[i] === 1 ? 1 : 2]++;
    });
    /* one legend row per jenis shown: its counted symbols (the list counts), the split by status in its title */
    shownJenis().forEach(function (j) {
      c.jenis[j] = V.byJ[j].n;
      c.split[j] = fm().int(st3[j][0]) + ' negeri · ' + fm().int(st3[j][1]) + ' swasta' + (st3[j][2] ? ' · ' + fm().int(st3[j][2]) + ' belum diketahui' : '');
    });
    c.ma = V.ctxMa.length; c.smk = V.ctxSmk.length;
    c.showMa = !!st.show.ma && c.ma > 0; c.showSmk = !!st.show.smk && c.smk > 0;
    return c;
  }
  /** Legend group "Kelas biaya" (§4.3, two rows): MCD.inst.tierLegendRows when INSTITUSI has it. */
  function tierLegendRows(theme) {
    var I0 = MCD.inst;
    if (I0 && isFn(I0.tierLegendRows)) {
      try { var r = I0.tierLegendRows(theme, { kind: 'sekolah' }); if (Array.isArray(r) && r.length && r.every(function (x) { return x && !x.nodeType && x.label; })) return r; } catch (e) { /* own rows below */ }
    }
    var Mx = symMod(), strip = Mx && isFn(Mx.tierStrip) ? Mx.tierStrip(theme) : null;
    return [
      strip ? { img: strip, imgKey: 'sk|tier|' + theme, size: 18, label: 'Reguler · Menengah · Atas · Premium' } : { glyph: 'none', label: 'Batang 1 sampai 4: Reguler · Menengah · Atas · Premium' },
      { glyph: 'none', label: TIER_LEGEND_2 }
    ];
  }
  function legend(derived, ms) {
    if (!V || !ms || !ms.kit) return [];
    var S = statusPal(ms), overview = ms.view === 'overview', show = overview ? 'both' : st.mapShow, groups = [];
    var theme = ms.theme === 'day' ? 'day' : 'night', Mx = symMod();
    if (show !== 'kec') {
      var k = V.kpi;
      if (Mx) {
        var L = Mx.legend(theme, legendCounts());
        groups.push({ id: 'schools-sym', title: 'Sekolah dalam ' + st.f.km + ' km', rows: L.rows, note: L.note });
      }
      if (badgesOn(ms)) groups.push({ id: 'schools-tier', title: 'Kelas biaya', rows: tierLegendRows(theme) });
      if (V.hasBank) {
        groups.push({ id: 'schools-sma', title: 'Status Mandiri' + (V.demo ? ' (data contoh)' : ''), rows: [
          { glyph: 'ring', rgb: S.ok, label: 'Lingkar hijau: nasabah Mandiri', count: k.cust },
          { glyph: 'ring', rgb: S.bad, label: 'Lingkar merah: prospek, belum nasabah', count: k.pros },
          { glyph: 'none', label: 'Tanpa lingkar: tidak ada di file sekolah', count: k.none }
        ] });
      }
    }
    if (show !== 'dots' && V.terr) {
      /* the calm kecamatan map (COPY_STYLE item 23): no fills, so no fill swatches. Chips, dots and lines in words. */
      var b = V.terr.bands, brows = [], rk = V.rank && V.rank.applied ? V.rank : null;
      if (!V.hasBank) {
        groups.push({ id: 'schools-kec', title: 'Label kecamatan', rows: [{ glyph: 'chip', label: 'Nama kecamatan · jumlah ' + nounOf() }],
          note: 'Setelah file sekolah diimpor, setiap label mendapat titik warna porsi nasabah.' });
      } else {
        if (rk) {
          brows.push({ glyph: 'circle', rgb: S.ok, label: 'Titik hijau pada label: porsi SMA nasabah tertinggi' });
          brows.push({ glyph: 'circle', rgb: S.mid, label: 'Titik kuning: sepertiga di tengah' });
          brows.push({ glyph: 'circle', rgb: S.bad, label: 'Titik merah: porsi terendah, kunjungi lebih dulu' });
        } else {
          brows.push({ glyph: 'circle', rgb: S.ok, label: 'Titik hijau: ' + Math.round(b.ok * 100) + '% atau lebih SMA nasabah Mandiri' });
          brows.push({ glyph: 'circle', rgb: S.mid, label: 'Titik kuning: ' + Math.round(b.mid * 100) + '–' + Math.round(b.ok * 100) + '%' });
          brows.push({ glyph: 'circle', rgb: S.bad, label: 'Titik merah: di bawah ' + Math.round(b.mid * 100) + '%. Porsi masih hampir sama, sehingga berlaku batas tetap.' });
        }
        brows.push({ glyph: 'circle', rgb: S.none, label: rk ? 'Tanpa titik: tidak dinilai atau tidak ada SMA' : 'Tanpa titik: tidak ada SMA' });
        groups.push({ id: 'schools-kec', title: !onlySma() ? (rk ? 'Titik pada label: porsi sekolah nasabah Mandiri, dibandingkan antarkecamatan' : 'Titik pada label: porsi sekolah nasabah Mandiri')
          : rk ? 'Titik pada label: porsi SMA nasabah Mandiri, dibandingkan antarkecamatan' : 'Titik pada label: porsi SMA nasabah Mandiri', rows: brows });
      }
      var T = MCD.territory, lines = T && isFn(T.legendGroups) ? (T.legendGroups({ ms: ms, stats: V.terr }) || []).filter(function (g) { return g.id === 'territory-lines'; })[0] : null;
      if (lines) groups.push(lines);
    }
    return groups;
  }

  function telemetry() {
    if (!V) return SC && SC.loading ? 'MEMUAT DATA SEKOLAH 1,6 MB' : '';
    var f = fm();
    return f.int(V.kpi.n) + ' ' + nounOf().toUpperCase() + ' DALAM ' + st.f.km + ' KM · ' + f.int(V.kpi.tni) + ' YAYASAN TNI' + (V.students && V.kpi.stuN ? ' · ' + f.int(V.kpi.k17) + ' SISWA 17+' : '') + (V.hasBank ? ' · ' + f.int(V.kpi.cust) + ' NASABAH MANDIRI' : '');
  }

  function registerMap() {
    unregisterMap();
    if (!MCD.map || !MCD.map.registerLayers) return;
    mapOffs.push(MCD.map.registerLayers('schools', mapLayers, { id: 'sma' }));
    MCD.map.registerPosture('schools', {
      imagery: 'full', camera: presetForKm(st.f.km), rings: 'schools', layerSet: 'schools', deck: true, buildings: 'off',
      attribution: ATTRIBUTION,
      /* v6 (D3): a ring click sets the scope, 15 km for the inner rings, else 30 km */
      onRingClick: function (km) { setScope(km <= 15.01 ? 15 : 30); },
      ringHint: 'Klik untuk memilih cakupan 15 km atau 30 km dari Mabes TNI',
      telemetry: telemetry
    });
    MCD.map.registerLegend('schools', legend);
    MCD.map.registerSelectable('smaSchool', function (id) { var I = SC.idx; return I && id >= 0 && id < I.n ? [I.lon[id], I.lat[id]] : null; });
    MCD.map.registerSelectable('smaKec', function () { return null; });
    MCD.map.registerSelectable('smaYay', function () { return null; });
    [5, 10, 15].forEach(function (km) { MCD.map.registerPreset('sma' + km, { label: km + ' km dari Mabes TNI', fit: 'ring', anchor: 'center', km: km }); });
    MCD.map.registerPreset('smaTni', { label: 'SMA yayasan TNI', bounds: function () {
      var I = SC.idx, pts = [];
      if (I && V) V.tni.forEach(function (i) { pts.push([I.lon[i], I.lat[i]]); });
      var b = MCD.config && MCD.config.branch;
      if (b) pts.push([b.lon, b.lat]);
      return bbox(pts);
    } });
    var T = MCD.territory;
    if (T && isFn(T.bind) && isFn(T.popup)) {
      unbindTerr = T.bind({
        stats: function () { return V ? V.terr : null; },
        popup: function (kid) { return kecPopup(kid); },
        /* v5: the callout's "Detail" runs the action {id: 'detail'} (the kecamatan card with its numbers first); the
           older popup has no "Detail", so the action is offered only with MCD.windows */
        actions: function (kid) {
          var out = [{ label: listLabel(), primary: true, run: function () { openKec(kid); } }];
          if (WS()) out.push({ id: 'detail', label: 'Detail', run: function () { openKecNums(kid); } });
          return out;
        },
        onPick: function (h) { if (h && h.kecamatanId) { st.selKec = h.kecamatanId; if (MCD.map.requestRender) MCD.map.requestRender(); } },
        onClose: function () { if (!(drawerSel && drawerSel.kind === 'smaKec')) { st.selKec = null; if (MCD.map && MCD.map.requestRender) MCD.map.requestRender(); } }
      });
    }
    applyZones();
  }
  function unregisterMap() {
    mapOffs.forEach(function (off) { try { off(); } catch (e) { /* ignore */ } });
    mapOffs = [];
    if (unbindTerr) { try { unbindTerr(); } catch (e) { /* ignore */ } unbindTerr = null; }
  }
  function bbox(pts) {
    if (!pts.length) return null;
    var w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    pts.forEach(function (p) { if (p[0] < w) w = p[0]; if (p[0] > e) e = p[0]; if (p[1] < s) s = p[1]; if (p[1] > n) n = p[1]; });
    return [[w, s], [e, n]];
  }
  function fitRows(rows, opts) {
    var I = SC.idx;
    if (!I || !rows || !rows.length || !MCD.map) return;
    var b = bbox(rows.map(function (i) { return [I.lon[i], I.lat[i]]; }));
    if (!b) return;
    if (b[0][0] === b[1][0] && b[0][1] === b[1][1]) { MCD.map.flyTo({ center: b[0], zoom: (opts && opts.zoom) || 15.6 }); return; }
    MCD.map.fitBounds(b, Object.assign({ maxZoom: 15.2 }, opts || {}));
  }
  function selectKec(id, opts) {
    st.selKec = id || null;
    if (MCD.map && MCD.map.requestRender) MCD.map.requestRender();
    var T = territory();
    if (id && T && (!opts || opts.fit !== false)) { var b = T.boundsOf(id); if (b) MCD.map.fitBounds(b, { maxZoom: 14 }); }
    if (ui && ui.work && ui.work.kec) renderKecTab();
  }

  /* ================================================================ Sederhana */

  /* ================================================== v6 controls: scope, Jenis, "Filter lain" (V6_SPEC §2, §3, §4.2) */

  /** "Jenis: SMA · SMK · MA": three pressed chips; the last one on cannot be turned off (its title says why). */
  function jenisCtl() {
    var wrap = E('div', { class: 'sk-chips sk-jenis', role: 'group', aria: { label: 'Jenis sekolah' }, title: JENIS_TIP });
    var tips = { sma: 'SMA: sekolah menengah atas.', smk: 'SMK adalah sekolah menengah kejuruan.', ma: 'MA adalah madrasah aliyah di bawah Kementerian Agama.' };
    var btns = JENIS_ORDER.map(function (j) {
      var b = E('button', { type: 'button', class: 'chip sk-chip sk-chip--jenis', aria: { pressed: 'false' }, attrs: { 'data-jenis': j } }, E('span', { class: 'sk-chip__t', text: JENIS_WORD[j] }));
      b.addEventListener('click', function () {
        var on = shownJenis();
        if (on.length === 1 && on[0] === j) { if (ctx) ctx.toast(JENIS_LAST, null); return; }
        var patch = {};
        patch[j] = on.indexOf(j) < 0;
        setShow(patch);
      });
      wrap.appendChild(b);
      return { j: j, b: b, tip: tips[j] };
    });
    return {
      el: wrap,
      set: function () {
        var on = shownJenis();
        btns.forEach(function (x) {
          var p = on.indexOf(x.j) >= 0, last = p && on.length === 1;
          x.b.setAttribute('aria-pressed', p ? 'true' : 'false');
          x.b.title = last ? JENIS_LAST : x.tip;
        });
      }
    };
  }
  /** Kelas biaya chips (§4.2): Premium · Atas · Menengah · Reguler · Belum diketahui with their counts in scope; disabled
      while the file loads, hidden with a "Coba lagi" line when it failed; the entry line and the "?" under them. */
  function tierCtl() {
    /* MCD.inst.tierFilter (INSTITUSI lane) when present: the same chips, line and "?" as Kampus */
    var I0 = MCD.inst, ids = TIERS.map(function (t) { return t.id; });
    if (I0 && isFn(I0.tierFilter)) {
      var el0 = null;
      try {
        el0 = I0.tierFilter({ kind: 'sekolah', counts: V && V.tiers ? V.tierCounts : null, value: st.f.tiers || ids,
          onChange: function (v) { setF({ tiers: Array.isArray(v) && v.length < ids.length ? v.slice() : null }); },
          onRetry: function () { needTiers(); }, onLoad: function () { V = null; if (ctx) refresh(['tiers']); } });
      } catch (e) { el0 = null; }
      if (el0 && el0.nodeType === 1 && el0.mcdTier && isFn(el0.mcdTier.update)) {
        return { el: el0, shared: true, set: function () {
          var stt = tiersState();
          try { el0.mcdTier.update({ counts: V && V.tiers ? V.tierCounts : null, value: st.f.tiers || ids, state: TD() ? 'ready' : stt === 'error' ? 'error' : 'loading' }); } catch (e) { /* ignore */ }
        } };
      }
    }
    var c = {};
    c.chips = E('div', { class: 'sk-chips sk-tiers', role: 'group', aria: { label: 'Kelas biaya' } });
    c.btns = TIERS.map(function (t) {
      var n = E('span', { class: 'chip__count' });
      var b = E('button', { type: 'button', class: 'chip sk-chip sk-chip--tier', aria: { pressed: 'true' }, attrs: { 'data-tier': t.id } },
        t.level ? tierBarsEl(t.level, 'biaya') : null, E('span', { class: 'sk-chip__t', text: t.label }), n);
      b.addEventListener('click', function () { toggleTier(t.id); });
      c.chips.appendChild(b);
      return { t: t, b: b, n: n };
    });
    c.state = E('p', { class: 'sk-fg__note sk-tierstate', aria: { live: 'polite' } });
    c.retry = btn('Coba lagi', 'reset', function () { needTiers(); }, 'btn--ghost btn--bar sk-tierretry');
    c.line = E('p', { class: 'sk-fg__note', text: TIER_LINE });
    var help = E('button', { type: 'button', class: 'tipbtn sk-help', title: 'Arti kelas biaya', aria: { label: 'Arti kelas biaya', haspopup: 'dialog' } }, E('span', { aria: { hidden: 'true' }, text: '?' }));
    help.addEventListener('click', function () { needTiers().then(function () { openTierHelp(); }); });
    c.el = E('div', { class: 'sk-fg sk-fg--tier' }, E('div', { class: 'sk-fg__head' }, E('p', { class: 'sk-fg__l', text: 'Kelas biaya' }), help), c.chips, c.state, c.retry, c.line);
    c.set = function () {
      var stt = tiersState(), on = st.f.tiers, counts = V && V.tiers ? V.tierCounts : null;
      c.chips.hidden = stt === 'error';
      c.retry.hidden = stt !== 'error';
      c.line.hidden = stt === 'error';
      c.state.hidden = stt === 'ready';
      c.state.textContent = stt === 'error' ? TIER_FAILED : stt === 'ready' ? '' : TIER_LOADING;
      c.btns.forEach(function (x) {
        var p = !on || on.indexOf(x.t.id) >= 0;
        x.b.setAttribute('aria-pressed', p ? 'true' : 'false');
        x.b.disabled = stt !== 'ready';
        x.n.textContent = counts ? fm().int(counts[x.t.id] || 0) : '';
        x.b.title = x.t.id === 'unknown' ? 'Sekolah tanpa data biaya atau status: belum diketahui' : 'Kelas biaya ' + x.t.label;
      });
    };
    return c;
  }
  function toggleTier(id) {
    if (tiersState() !== 'ready') { needTiers(); return; }
    var cur = st.f.tiers ? st.f.tiers.slice() : TIERS.map(function (t) { return t.id; });
    var k = cur.indexOf(id);
    if (k >= 0) cur.splice(k, 1); else cur.push(id);
    setF({ tiers: cur.length >= TIERS.length ? null : cur });
  }
  /** A quiet fold: "Filter lain (2)" opens its body (the phone panel and Sederhana keep it folded, §2). */
  function foldBox(title, kids, open) {
    var body = E('div', { class: 'sk-more__body' }, kids);
    var n = E('span', { class: 'sk-more__n' });
    var b = E('button', { type: 'button', class: 'sk-more__btn', aria: { expanded: open ? 'true' : 'false' } }, E('span', { text: title }), n, icon('chev-r', 'sk-more__chev'));
    body.hidden = !open;
    b.addEventListener('click', function () { var on = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', on ? 'true' : 'false'); body.hidden = !on; });
    return { el: E('section', { class: 'sk-more' }, b, body), body: body, set: function (count0) { n.textContent = count0 ? ' (' + count0 + ')' : ''; } };
  }
  function activeFilterCount() { var f = st.f; return (f.type !== 'all' ? 1 : 0) + (f.tni ? 1 : 0) + (f.inf ? 1 : 0) + (f.tiers ? 1 : 0); }
  /**
   * The controls of the guide (Sederhana, phones) and the Detail rail: "Cakupan" (the scope switch, first control) with
   * its status line, "Jenis" chips, then "Filter lain" (Status, Kelas biaya, Tanpa NPSN, Hapus filter).
   */
  function buildCtl(where) {
    var c = { where: where };
    c.scope = scopeCtl({ cls: where === 'ov' ? 'seg--big' : null, hint: true, wide: where === 'ov' });
    c.jenis = jenisCtl();
    c.type = seg('Status', [{ v: 'all', label: 'Semua' }, { v: 'private', label: 'Swasta' }, { v: 'public', label: 'Negeri' }], function (v) { setF({ type: v }); });
    c.tier = tierCtl();
    c.inf = toggle('Sembunyikan sekolah tanpa NPSN', function (on) { setF({ inf: on }); }, { title: 'Sekolah yang hanya ada di OpenStreetMap atau Overture' });
    c.clear = btn('Hapus filter', 'reset', function () { resetF(); }, 'btn--ghost btn--bar');
    c.more = foldBox('Filter lain', [E('div', { class: 'sk-fg' }, E('p', { class: 'sk-fg__l', text: 'Status' }), c.type.el), c.tier.el,
      E('div', { class: 'sk-fg sk-fg--toggles' }, c.inf.el), E('div', { class: 'sk-ctl__clear' }, c.clear)], where === 'rail');
    c.el = E('section', { class: ['sk-ctl', 'sk-ctl--' + where], aria: { label: 'Cakupan dan jenis sekolah' } },
      E('div', { class: 'sk-ctl__row sk-ctl__row--scope' }, c.scope.el),
      E('div', { class: 'sk-ctl__row' }, E('span', { class: 'sk-ctl__l', text: 'Jenis', title: JENIS_TIP }), c.jenis.el),
      c.more.el);
    c.sync = function () {
      c.scope.set(scopeNow());
      c.jenis.set();
      c.type.set(st.f.type);
      c.inf.set(st.f.inf);
      c.clear.disabled = !filtersActive();
      c.more.set(activeFilterCount());
      c.tier.set();
      renderStatus30(c.scope);
    };
    ctlSets.push(c);
    return c;
  }
  /** "Memuat jumlah siswa dalam 30 km…" under the switch (aria-live), or the failed line with "Coba lagi" (§3.1). */
  function renderStatus30(sc) {
    if (!sc || !isFn(sc.status)) return;
    var stt = f30State(), need = wants30(), key = need ? stt : 'off';
    if (sc.__st30 === key) return;
    sc.__st30 = key;
    if (!need || stt === 'ready' || stt === 'idle') { sc.status(null); return; }
    if (stt === 'error') sc.status(FAIL30, { retry: function () { need30(); } });
    else sc.status(LOAD30, { busy: true });
  }
  function syncCtls() { ctlSets.forEach(function (c) { try { c.sync(); } catch (e) { /* ignore */ } }); }
  /** "?" of Kelas biaya (§4.2): the four bands from meta.tiers, the three bases, what perkiraan means, the share in scope. */
  function openTierHelp() {
    if (!ctx) return;
    var T = TD(), M0 = (T && T.meta) || {}, body = [];
    function ul(lines) { return E('ul', { class: 'sk-bul' }, lines.map(function (t) { return E('li', { text: t }); })); }
    drawerSel = null;
    drawerDist = null;
    body.push(E('p', { class: 'sk-note', text: TIER_LINE }));
    if (Array.isArray(M0.tiers)) body.push(blk('Batas kelas', [E('dl', { class: 'sk-prog__dl' }, M0.tiers.map(function (t) {
      return [E('dt', { text: t.label }), E('dd', { text: (t.text && t.text.sekolah) || '' })];
    }))]));
    var bases = M0.basis || {};
    body.push(blk('Dasar kelas', [ul([bases.biaya, bases.jenis, bases.perkiraan].filter(Boolean)),
      E('p', { class: 'sk-note', text: 'Perkiraan berarti kelas biaya dihitung dari jenis sekolah dan daya beli area karena biaya resmi tidak dipublikasikan.' })]));
    if (V && V.tiers) body.push(E('p', { class: 'sk-note', text: 'Biaya resmi ditemukan untuk ' + count(V.kpi.fee, 'sekolah') + '. Selebihnya dari jenis sekolah atau perkiraan.' }));
    body.push(blk('Di peta', [ul(['Tanda batang di kanan atas titik sekolah: 1 batang Reguler sampai 4 batang Premium.', TIER_LEGEND_2,
      'Tanda tampil saat filter kelas biaya aktif atau saat peta diperbesar.'])]));
    var tm = { eyebrow: 'SEKOLAH', title: 'Kelas biaya', body: body, prov: 'Sumber: situs resmi sekolah (biaya resmi), jenis sekolah, daya beli area (perkiraan) · biaya dibaca 18 Okt 2026' };
    ctx.openDrawer(tm);
    staggerDrawer(tm);
  }

  function buildOverview(body) {
    var o = {};
    o.status = E('div', { class: 'sk-load', hidden: true });
    o.ctl = buildCtl('ov');
    o.more = E('p', { class: 'sk-ov__more', hidden: true });
    o.cards = E('div', { class: 'sk-cards', role: 'list' });
    var ctl = E('section', { class: 'sk-ov', aria: { label: 'Yang tampil di peta' } }, o.ctl.el, o.more);
    body.insertBefore(E('div', { class: 'sk-ovwrap' }, o.status, ctl, o.cards), body.firstChild);
    // card 1: SMA within the distance, private / public split
    o.c1 = card('sk-card--count');
    o.c1.big = chart('bigNumber', o.c1.slot, { label: 'SMA dalam 15 km', value: null, status: 'potential' }, { card: false, onClick: function () { cameraForKm(); } });
    o.c1.split = E('div', { class: 'sk-split' });
    o.c1.body.appendChild(o.c1.split);
    // card 2: new CIF, students aged 17+ (items 26, 29)
    o.cif = buildCif(false);
    // card 3: the SMA with the most students aged 17+, or nearest the branch
    o.top = buildTop();
    // card 4: Mandiri status
    o.c2 = card('sk-card--status');
    o.c2.head = E('p', { class: 'sk-card__t', text: 'Nasabah Mandiri' });
    o.c2.body.insertBefore(o.c2.head, o.c2.slot);
    o.c2.bar = chart('statusBar', o.c2.slot, { potential: 0 }, statusBarCfg());
    o.c2.note = E('div', { class: 'sk-card__note' });
    o.c2.body.appendChild(o.c2.note);
    // card 5: TNI-foundation SMA
    o.c3 = card('sk-card--tni');
    o.c3.head = E('p', { class: 'sk-card__t' });
    o.c3.list = E('ul', { class: 'sk-mini' });
    o.c3.body.insertBefore(o.c3.head, o.c3.slot);
    o.c3.body.appendChild(o.c3.list);
    o.c3.slot.remove();
    // card 6: nearest clusters
    o.c4 = card('sk-card--cluster');
    o.c4.head = E('p', { class: 'sk-card__t', text: 'Kelompok SMA terdekat' });
    o.c4.list = E('ul', { class: 'sk-mini' });
    o.c4.foot = E('p', { class: 'sk-card__foot' });
    o.c4.body.insertBefore(o.c4.head, o.c4.slot);
    o.c4.body.appendChild(o.c4.list);
    o.c4.body.appendChild(o.c4.foot);
    o.c4.slot.remove();
    [o.c1, o.cif, o.top, o.c2, o.c3, o.c4].forEach(function (c) { o.cards.appendChild(c.el); });
    stagger(o.cards.children);
    ui.ov = o;
  }
  function card(cls) {
    var slot = E('div', { class: 'sk-card__slot' }), body = E('div', { class: 'sk-card__body' }, slot);
    var el = E('article', { class: ['sk-card', cls], role: 'listitem' }, body);
    return { el: el, body: body, slot: slot };
  }

  /* ---- new-CIF card (items 29, 35(a)): two groups for the current filter. Siswa 17+ open Tabungan through
     Livin' by Mandiri with their own KTP; siswa di bawah 17 (siswa − siswa 17+) open Tabungan SimPel together
     with a parent or guardian. Small product pictures, plain lines, no product numbers or promotions. */

  function helpBtn(label) {
    var b = E('button', { type: 'button', class: 'tipbtn sk-help', title: label, aria: { label: label, haspopup: 'dialog' } }, E('span', { aria: { hidden: 'true' }, text: '?' }));
    b.addEventListener('click', function () { openMethod(); });
    return b;
  }
  function buildCif(compact) {
    var c = { compact: !!compact };
    c.value = E('p', { class: 'sk-cif__v' });
    c.split = E('p', { class: 'sk-cif__split' });
    c.u17 = E('p', { class: 'sk-cif__v' });
    c.u17Sub = E('p', { class: 'sk-cif__split' });
    c.scope = E('p', { class: 'sk-cif__scope' });
    var livin = E('span', { class: 'sk-cif__logo' }, E('img', { src: LIVIN_LOGO, alt: 'Livin’ by Mandiri', width: 64, height: 37, decoding: 'async' }));
    var simpel = E('span', { class: 'sk-cif__card' }, E('img', { src: SIMPEL_CARD, alt: 'Kartu Tabungan SimPel', width: 40, height: 26, decoding: 'async' }));
    function group(cls, pic, label, value, sub, line) {
      return E('section', { class: ['sk-cif__grp', cls], aria: { label: label } },
        pic, E('div', { class: 'sk-cif__txt' }, E('p', { class: 'sk-cif__l', text: label }), value, sub, E('p', { class: 'sk-cif__line', text: line })));
    }
    c.body = E('div', { class: 'sk-card__body' },
      E('div', { class: 'sk-cif__head' }, (c.title = E('p', { class: 'sk-card__t', text: 'Calon nasabah baru dari SMA' })), helpBtn('Cara menghitung siswa 17+ dan di bawah 17')),
      group('sk-cif__grp--k17', livin, K17_LABEL, c.value, c.split, 'Membuka Tabungan sendiri dengan KTP, melalui aplikasi Livin’ by Mandiri.'),
      group('sk-cif__grp--u17', simpel, 'Siswa di bawah 17 tahun', c.u17, c.u17Sub, 'Membuka Tabungan SimPel bersama orang tua atau wali.'),
      c.scope, E('p', { class: 'sk-card__src', text: STU_SRC }));
    c.el = E('article', { class: ['sk-card', 'sk-cif', compact ? 'is-compact' : null], role: compact ? null : 'listitem', aria: { label: 'Calon nasabah baru dari SMA' } }, c.body);
    return c;
  }
  function intOrDash(v) { return isNum(v) ? fm().int(Math.round(v)) : '—'; }
  function renderCif(c) {
    if (!c) return;
    var fmt = fm();
    /* v6: "Calon nasabah baru dari sekolah" once SMK or MA are shown (SMA only: unchanged) */
    if (c.title) c.title.textContent = onlySma() ? 'Calon nasabah baru dari SMA' : 'Calon nasabah baru dari sekolah';
    if (!V || !V.students) {
      countOnce(c.value, null, intOrDash);
      countOnce(c.u17, null, intOrDash);
      c.split.textContent = !V ? '' : (SC.studentsFailed ? 'Data siswa tidak dapat dimuat. Muat ulang halaman.' : 'Data siswa sedang dimuat.');
      c.u17Sub.textContent = '';
      c.scope.textContent = '';
      return;
    }
    var k = V.kpi;
    /* the total without "±" (as on Ringkasan); the estimated part is named in the line below it */
    /* the two big numbers count up once, the first time they show (item 38) */
    countOnce(c.value, k.stuN ? k.k17 : null, intOrDash);
    c.split.textContent = !k.stuN ? (k.loading ? LOAD30 : 'Tidak ada data siswa untuk ' + nounOf() + ' dengan filter ini.')
      : k.k17Est ? fmt.int(k.k17Off) + ' dari data resmi umur · ± ' + fmt.int(k.k17Est) + ' perkiraan (' + count(k.k17EstN, nounOf()) + ')'
      : 'Semua dari data resmi umur Dapodik.';
    countOnce(c.u17, k.u17N ? k.u17 : null, intOrDash);
    c.u17Sub.textContent = k.u17N ? 'Siswa dikurangi siswa 17+' + (k.k17Est ? ', sebagian perkiraan.' : '.') : '';
    var sc = k.stuN ? 'Dari ' + count(k.stu, 'siswa') + ' di ' + count(k.stuN, nounOf()) + ' dalam ' + st.f.km + ' km' + filterWords() + '.' : '';
    if (k.loading) sc += ' ' + (f30State() === 'error' ? FAIL30 : LOAD30);
    if (k.inactive && c.compact) sc += ' ' + count(k.inactive, nounOf()) + ' kemungkinan tidak aktif tidak dihitung.';
    c.scope.textContent = sc.trim();
  }

  /* ---- top SMA by students aged 17+ (or nearest the branch), with the distance from KCP */

  function buildTop() {
    var c = card('sk-card--top');
    c.head = E('p', { class: 'sk-card__t', text: 'SMA untuk dikunjungi' });
    c.sort = seg('Urutkan SMA', [{ v: 'k17', label: 'Siswa 17+ terbanyak' }, { v: 'near', label: 'Terdekat dari KCP' }], function (v) { st.topSort = v; saveUi(); renderTop(c); }, 'sk-seg--top');
    c.sw = distToggles();
    c.list = E('ul', { class: 'sk-mini sk-top' });
    c.more = link('Lihat semua di daftar', function () { st.listSort = st.topSort; saveUi(); goTab('list'); });
    c.body.insertBefore(c.head, c.slot);
    c.body.insertBefore(c.sort.el, c.slot);
    c.body.insertBefore(c.sw.el, c.slot);
    c.body.appendChild(c.list);
    c.body.appendChild(E('p', { class: 'sk-card__foot' }, c.more));
    c.slot.remove();
    return c;
  }
  function topRows(by, n) {
    var rows = V.rows.filter(function (i) { var s = sInfo(i); return !(s && s.inactive); });
    if (by === 'near') rows.sort(function (a, b) { return distSortVal(a) - distSortVal(b) || SC.idx.dist[a] - SC.idx.dist[b]; });
    else rows = rows.filter(function (i) { return k17Num(i) != null; }).sort(function (a, b) { return k17Num(b) - k17Num(a) || distSortVal(a) - distSortVal(b); });
    return rows.slice(0, n);
  }
  function renderTop(c) {
    if (!c || !V) return;
    var by = st.topSort === 'near' ? 'near' : 'k17', fmt = fm();
    c.head.textContent = Noun() + ' untuk dikunjungi';
    c.sort.set(by);
    c.sw.sync();
    setCardTone(c, 'plain');
    clear(c.list);
    var rows = topRows(by, 5);
    rows.forEach(function (i) {
      var s = sInfo(i), r = distOf(i);
      /* the card's own "Jam sibuk" / "Motor (tanpa tol)" switches show the mode, so the row keeps km and minutes only */
      var dp = distText(r, 'cell');
      var meta = [s && s.k17 != null ? k17Words(s, true) + ' siswa 17+' : (stuOf(i) >= 0 ? count(stuOf(i), 'siswa') : null), dp.km + (dp.min ? ' · ' + dp.min : '')].filter(Boolean).join(' · ');
      var b = E('button', { type: 'button', class: 'sk-mini__row sk-top__row' }, symChip(i),
        E('span', { class: 'sk-top__txt' }, E('span', { class: 'sk-mini__name', text: SC.idx.name[i] }), E('span', { class: 'sk-top__meta', text: meta, title: distTip(r) })));
      b.title = 'Klik untuk melihat ' + SC.idx.name[i] + ' di peta';
      b.addEventListener('click', function () { focusRow(i); });
      c.list.appendChild(E('li', {}, b));
    });
    if (!rows.length) c.list.appendChild(E('li', { class: 'sk-mini__empty', text: by === 'k17' && !V.students ? 'Data siswa belum termuat.' : 'Tidak ada ' + nounOf() + ' yang cocok dengan filter ini. Hapus salah satu filter.' }));
    staggerOnChange(c, by + '|' + rows.join(','), c.list.children);
  }
  /** Rows enter one after another when the list shows other rows or another order, not on every redraw. */
  function staggerOnChange(holder, sig, els) {
    if (!holder || holder.stgSig === sig) return;
    holder.stgSig = sig;
    stagger(els);
  }

  /* tagged: the exhibit title already carries the CONTOH tag (Detail), so the bar does not add a second one */
  function statusBarCfg(tagged) {
    return { label: 'SMA menurut status Mandiri', unit: 'SMA', size: 'lg', labels: { acquired: 'Nasabah Mandiri', notYet: 'Prospek, belum nasabah', noData: 'Tanpa data (tidak ada di file)', potential: 'SMA (file sekolah belum diimpor)' }, demo: !tagged, tableToggle: false };
  }
  function statusBarData() {
    var k = V.kpi;
    if (!V.hasBank) return { acquired: null, partly: null, notYet: null, noData: null, potential: k.n };
    return { acquired: k.cust, partly: null, notYet: k.pros, noData: k.none, potential: null };
  }
  /** Empty state of the Mandiri status (no school file yet): what to do, and the import button. */
  function importEmpty(host) {
    host.appendChild(E('p', { class: 'sk-empty__t', text: 'Impor file sekolah untuk melihat SMA yang telah menjadi nasabah Mandiri.' }));
    host.appendChild(E('p', { class: 'sk-note' }, 'Gunakan sheet ', E('code', { text: '3_sekolah' }), '. Setelah itu, SMA nasabah mendapat lingkar hijau dan prospek lingkar merah.'));
    host.appendChild(btn('Impor file sekolah', 'upload', function () { if (ctx) ctx.navigate('data', { action: 'data:import' }); }, 'btn--secondary btn--bar sk-empty__btn'));
  }
  function setCardTone(c, tone) { ['ok', 'mid', 'bad', 'none', 'potential', 'gold', 'plain'].forEach(function (t) { c.el.classList.toggle('is-' + t, t === tone); }); }
  /** "3 dalam 15 km" or "Tidak ada dalam 5 km (3 dalam 15 km)". */
  function withinWords(nAt, km, nFallback, kmFallback) {
    if (nAt > 0) return fm().int(nAt) + ' dalam ' + km + ' km';
    return 'Tidak ada dalam ' + km + ' km' + (nFallback > 0 && kmFallback !== km ? ' (' + fm().int(nFallback) + ' dalam ' + kmFallback + ' km)' : '');
  }

  function renderOverview() {
    var o = ui && ui.ov;
    if (!o) return;
    var f = st.f, fmt = fm();
    if (o.ctl) o.ctl.sync();
    renderLoad(o.status);
    var extra = [];
    if (f.type !== 'all') extra.push(f.type === 'private' ? 'swasta saja' : 'negeri saja');
    if (f.tni) extra.push('yayasan TNI saja');
    if (f.inf) extra.push('sekolah tanpa NPSN disembunyikan');
    if (f.tiers) extra.push('kelas biaya ' + (tierWords(f.tiers) || 'tidak ada'));
    o.more.hidden = !extra.length;
    clear(o.more);
    if (extra.length) {
      o.more.appendChild(document.createTextNode('Filter lain aktif: ' + extra.join(' · ') + '. '));
      o.more.appendChild(link('Hapus filter', function () { resetF(); }));
    }
    o.cards.hidden = !V;
    if (!V) return;
    var k = V.kpi;
    // 1 · count
    var nm = noun();
    var other = [15, 30].filter(function (x) { return x !== f.km; }).map(function (x) { return fmt.int(V.n[x]) + ' dalam ' + x + ' km'; }).join(' · ');
    o.c1.big.update({ label: Noun() + ' dalam ' + f.km + ' km', value: V.allKm, status: V.hasBank ? null : 'potential', statusLabel: V.hasBank ? null : 'Potensi',
      note: (V.allKm ? '' : withinWords(0, f.km, V.n[15], 15) + '. ') + other + ' dari Mabes TNI.' + (!onlySma() ? ' ' + splitWords(V.byJ) + '.' : '') +
        (V.kpi.inactive ? ' ' + count(V.kpi.inactive, nm) + ' kemungkinan tidak aktif tidak dihitung.' : '') + (k.noData && !k.loading ? ' ' + count(k.noData, 'sekolah') + ' tanpa data siswa.' : '') });
    setCardTone(o.c1, V.hasBank ? 'plain' : 'potential');
    renderSplit(o.c1.split);
    renderCif(o.cif);
    renderTop(o.top);
    // 2 · status: before the school file a text empty state (a full bar would read as "every SMA is a customer")
    o.c2.slot.hidden = !V.hasBank;
    if (V.hasBank) o.c2.bar.update(statusBarData(), statusBarCfg());
    /* no fixed-band colour on the overall share: the kecamatan are ranked into thirds on the map (COPY_STYLE item 18) */
    setCardTone(o.c2, 'plain');
    clear(o.c2.note);
    if (!V.hasBank) {
      importEmpty(o.c2.note);
    } else {
      o.c2.note.appendChild(E('p', { text: (k.n ? fmt.pct(k.cust / k.n, 0) : '—') + ' ' + nm + ' dalam ' + f.km + ' km telah menjadi nasabah Mandiri' + (V.demo ? ' (data contoh).' : '.') + ' ' + count(k.pros, 'prospek') + ' dan ' + count(k.none, nm + ' tanpa data') + ' masih dapat didekati.' }));
      o.c2.note.appendChild(E('p', { class: 'sk-card__rank', text: V.rank && V.rank.applied
        ? 'Di peta, ' + fmt.int(V.rank.n) + ' kecamatan dibandingkan menurut porsi ini. Titik hijau tertinggi, kuning tengah, merah terendah.'
        : 'Porsi antarkecamatan masih hampir sama.\nTitik mengikuti batas tetap: hijau 50% atau lebih, kuning 20–50%, merah di bawah 20%.' }));
      o.c2.note.appendChild(E('p', { class: 'sk-card__src', text: V.demo ? 'Sumber: data contoh (ilustrasi)' : 'Sumber: file sekolah cabang (sheet 3_sekolah), hanya di komputer ini' }));
      demoTag(o.c2.head, { inline: true, when: V.demo });
    }
    // 3 · TNI
    var tniIn = V.tni.filter(function (i) { return SC.idx.dist[i] <= f.km; });
    o.c3.head.textContent = Noun() + ' yayasan TNI · ' + withinWords(tniIn.length, f.km, V.nTni[15], 15) + ', ' + fmt.int(V.tni.length) + ' dalam 30 km';
    setCardTone(o.c3, 'gold');
    clear(o.c3.list);
    /* distances from KCP (items 27, 28), as everywhere else in the rail and the lists; the head counts by Mabes TNI */
    V.tni.slice(0, 6).forEach(function (i) {
      var I = SC.idx, t = I.tniRows[I.tni[i]], far = I.dist[i] > f.km, r = distOf(i);
      var b = E('button', { type: 'button', class: 'sk-mini__row' + (far ? ' is-far' : '') },
        E('span', { class: 'sk-mini__badge' }, symChip(i), E('span', { text: t.matra })),
        E('span', { class: 'sk-mini__name', text: I.name[i] }),
        distStack(r, V.hasBank ? STATUS[codeOf(i)].short : ''));
      b.title = (t.foundation || '') + ' · ' + SC.config.matraFull[t.matra] + '\nJarak dari KCP: ' + distTip(r) + '\nKlik untuk melihat di peta';
      b.addEventListener('click', function () { flyNext = true; ctx.select({ kind: 'smaSchool', id: i }); });
      o.c3.list.appendChild(E('li', {}, b));
    });
    if (!V.tni.length) o.c3.list.appendChild(E('li', { class: 'sk-mini__empty', text: 'Tidak ada ' + nm + ' yayasan TNI dengan filter ini.' }));
    else o.c3.list.appendChild(E('li', { class: 'sk-mini__foot', text: distBasis() }));
    staggerOnChange(o.c3, V.tni.slice(0, 6).join(','), o.c3.list.children);
    // 4 · clusters, nearest to KCP first
    var cl = clusters().slice().sort(function (a, b) { return distSortVal(a.centre) - distSortVal(b.centre) || a.km - b.km; }).slice(0, 3);
    clear(o.c4.list);
    setCardTone(o.c4, 'plain');
    cl.forEach(function (c) {
      var r = distOf(c.centre);
      var b = E('button', { type: 'button', class: 'sk-mini__row' },
        E('span', { class: 'sk-mini__n', text: fmt.int(c.n) }),
        E('span', { class: 'sk-mini__name', text: (c.kel ? c.kel + ', ' : '') + (c.kec || 'kecamatan tidak diketahui') }),
        distStack(r));
      b.title = count(c.n, 'SMA') + ' dalam radius 1 km\nJarak dari KCP: ' + distTip(r) + '\nKlik untuk melihatnya di peta';
      b.addEventListener('click', function () { fitRows(c.rows, { maxZoom: 15 }); highlightRows(c.rows); });
      o.c4.list.appendChild(E('li', {}, b));
    });
    if (!cl.length) o.c4.list.appendChild(E('li', { class: 'sk-mini__empty', text: 'Tidak ada kelompok ' + CLUSTER_MIN + ' SMA atau lebih dalam radius 1 km.' }));
    staggerOnChange(o.c4, cl.map(function (c) { return c.centre; }).join(','), o.c4.list.children);
    setLines(o.c4.foot, 'Kelompok: ' + CLUSTER_MIN + ' SMA atau lebih yang saling berjarak paling jauh 1 km.\nSemua dalam 15 km dari Mabes TNI. ' + distBasis());
  }
  function renderSplit(host) {
    clear(host);
    var m = V.mix, fmt = fm(), tot = m.priv + m.tni + m.pub + m.unk;
    /* the map's colours and the legend's order (item 34): negeri blue, swasta amber, jenis belum diketahui grey */
    var parts = [
      { k: 'pub', label: 'Negeri', v: m.pub, cls: 'is-pub' },
      { k: 'priv', label: 'Swasta (yayasan)', v: m.priv + m.tni, cls: 'is-priv' },
      { k: 'unk', label: 'Jenis belum diketahui', v: m.unk, cls: 'is-unk' }
    ].filter(function (p) { return p.v > 0; });
    var bar = E('div', { class: 'sk-split__bar', role: 'img', aria: { label: parts.map(function (p) { return p.label + ' ' + p.v; }).join(', ') } });
    parts.forEach(function (p) { bar.appendChild(E('i', { class: p.cls, style: { width: (tot ? 100 * p.v / tot : 0).toFixed(2) + '%' } })); });
    host.appendChild(bar);
    var keys = E('div', { class: 'sk-split__keys' });
    parts.forEach(function (p) {
      keys.appendChild(E('span', { class: 'sk-split__k' }, E('i', { class: 'sk-split__sw ' + p.cls, aria: { hidden: 'true' } }),
        E('span', { text: p.label + ' ' }), E('b', { text: fmt.int(p.v) }), E('span', { class: 'sk-split__p', text: ' (' + (tot ? fmt.pct(p.v / tot, 0) : '—') + ')' })));
    });
    host.appendChild(keys);
    if (m.tni) host.appendChild(E('p', { class: 'sk-split__note', text: 'Swasta termasuk ' + count(m.tni, 'SMA yayasan TNI') + '.' }));
  }

  function renderLoad(host) {
    if (!host) return;
    clear(host);
    if (SC.idx) { host.hidden = true; return; }
    host.hidden = false;
    if (SC.failed) {
      host.classList.add('is-error');
      host.appendChild(E('p', { class: 'sk-load__t', text: 'Daftar sekolah tidak dapat dimuat. Muat ulang halaman, lalu tekan Coba lagi.\nPengelola: pastikan folder data/ ada di samping index.html.' }));
      host.appendChild(btn('Coba lagi', 'reset', function () { startLoad(); }, 'btn--secondary'));
    } else {
      host.classList.remove('is-error');
      host.appendChild(E('span', { class: 'sk-load__bar', aria: { hidden: 'true' } }));
      host.appendChild(E('p', { class: 'sk-load__t', text: 'Memuat daftar sekolah (1,6 MB, hanya di komputer ini)…' }));
    }
  }

  /* ========================================================== Detail: rail */

  function buildRail(body) {
    var r = {};
    r.status = E('div', { class: 'sk-load', hidden: true });
    r.openWork = btn(SLIDE_LABEL, 'chev-r', function () { openWork(true); }, 'btn--secondary btn--lg sk-openwork');
    r.ex = exhibit({ cls: 'sk-ex--rail' });
    r.barHost = E('div', { class: 'sk-ex__bar' });
    r.empty = E('div', { class: 'sk-empty', hidden: true });
    r.ex.body.appendChild(r.barHost);
    r.ex.body.appendChild(r.empty);
    r.bar = chart('statusBar', r.barHost, { potential: 0 }, statusBarCfg(true));
    r.kpis = E('div', { class: 'sk-kpis', role: 'list' });
    r.k = {};
    r.cif = buildCif(true);
    [['n', 'SMA yang tampil'], ['priv', 'Swasta (yayasan)'], ['tni', 'SMA yayasan TNI'], ['stu', 'Siswa']].forEach(function (d) {
      var host = E('div', { class: 'sk-kpi', role: 'listitem' });
      r.kpis.appendChild(host);
      r.k[d[0]] = chart('bigNumber', host, { label: d[1], value: null }, { size: 'sm' });
    });
    /* v6 (§2, ≥ 1441 full rail and the overlay): the scope beside the title row, Jenis chips, then "Filter lain" */
    r.ctl = buildCtl('rail');
    r.dl = E('div', { class: 'sk-dl' });
    body.insertBefore(E('div', { class: 'sk-rail' }, r.openWork, r.status, r.ctl.el, r.ex.el, r.cif.el, r.kpis, r.dl), body.firstChild);
    ui.rail = r;
  }
  function renderRail() {
    var r = ui && ui.rail;
    if (!r) return;
    renderLoad(r.status);
    var f = st.f, fmt = fm();
    r.ctl.sync();
    renderDeadline(r.dl);
    if (!V) { r.ex.set('Memuat daftar sekolah', '', ''); return; }
    var k = V.kpi;
    r.ex.set(!V.hasBank ? count(k.n, noun()) + ' dalam ' + f.km + ' km dapat didekati' : (k.n ? fmt.pct(k.cust / k.n, 0) : '—') + ' ' + noun() + ' dalam ' + f.km + ' km telah menjadi nasabah Mandiri',
      V.hasBank ? 'Jumlah ' + noun() + ' dalam ' + f.km + ' km dari Mabes TNI, menurut status Mandiri' + filterWords() : 'Status Mandiri tampil setelah file sekolah diimpor',
      V.hasBank ? (V.demo ? 'Sumber: data contoh (ilustrasi)' : 'Sumber: file sekolah cabang (sheet 3_sekolah) · ' + SRC_SHORT) : 'Sumber: ' + SRC_SHORT + ' · file sekolah belum diimpor');
    demoTag(r.ex.title, { inline: true, when: V.demo });
    /* before the school file: a text empty state, no bar (a full bar would read as "every SMA is a customer") */
    r.barHost.hidden = !V.hasBank;
    r.empty.hidden = V.hasBank;
    clear(r.empty);
    if (V.hasBank) r.bar.update(statusBarData(), statusBarCfg(true));
    else importEmpty(r.empty);
    r.k.n.update({ label: Noun() + ' yang tampil', value: k.n, note: (filtersActive() ? 'Sesuai filter' : 'Dalam ' + f.km + ' km') + (onlySma() ? '' : ' · ' + splitWords(V.byJ)) });
    r.k.priv.update({ label: 'Swasta (yayasan)', value: k.priv, note: fmt.int(k.pub) + ' negeri' + (k.unk ? ' · ' + fmt.int(k.unk) + ' belum diketahui' : '') });
    r.k.tni.update({ label: Noun() + ' yayasan TNI', value: k.tni, note: k.tni ? 'Hang Tuah · Angkasa · Kartika' : withinWords(0, f.km, V.nTni[15], 15) });
    r.k.stu.update({ label: 'Siswa', value: k.stuN ? k.stu : null, note: k.stuN ? count(k.stuN, nounOf()) + ' dengan data Dapodik' + (k.noData ? ' · ' + count(k.noData, 'sekolah') + ' tanpa data siswa' : '') : (k.loading ? LOAD30 : 'Jumlah siswa belum tersedia') });
    renderCif(r.cif);
  }
  function renderDeadline(host) {
    clear(host);
    PROGRAMMES.forEach(function (p) {
      var left = SC.daysLeft(p.end), soon = left != null && left <= 60;
      var row = E('button', { type: 'button', class: 'sk-dl__row' + (soon ? ' is-soon' : '') + (left != null && left < 0 ? ' is-ended' : '') },
        E('span', { class: 'sk-dl__name', text: p.name }),
        E('span', { class: 'sk-dl__when', text: left == null ? '—' : left < 0 ? 'Berakhir ' + fm().date(p.end) : 'Berakhir ' + fm().date(p.end) + ' · ' + count(left, 'hari') + ' lagi' }),
        E('span', { class: 'sk-dl__what', text: p.headline }));
      row.addEventListener('click', function () { goTab('prog'); });
      host.appendChild(row);
    });
  }

  /* ===================================================== Detail: workbench */

  /** Tabs: the shell's ctx.tabs (A-09: remembers the tab and its scroll) when present, else an equivalent tablist. */
  function makeTabs(host, active, onChange, panel) {
    var items = TABS.map(function (t) { return { id: t.id, label: t.label }; });
    if (ctx && isFn(ctx.tabs)) {
      try { var t = ctx.tabs(host, { items: items, active: active, onChange: onChange, panel: panel, label: 'Daftar dan grafik SMA' }); if (t && t.el) { if (!t.el.parentNode) host.appendChild(t.el); return t; } } catch (e) { /* own tabs below */ }
    }
    var list = E('div', { class: 'sk-tabs', role: 'tablist', aria: { label: 'Daftar dan grafik SMA' } });
    var btns = items.map(function (t) {
      var b = E('button', { type: 'button', class: 'sk-tab', role: 'tab', id: 'sk-tab-' + t.id, aria: { selected: 'false', controls: 'sk-panel' }, attrs: { tabindex: '-1' }, text: t.label });
      b.addEventListener('click', function () { onChange(t.id); });
      list.appendChild(b);
      return b;
    });
    list.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) < 0) return;
      var ids = items.map(function (t) { return t.id; }), i = ids.indexOf(cur);
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
      onChange(ids[n]);
      btns[n].focus();
    });
    list.addEventListener('scroll', function () { edges(); }, { passive: true });
    var cur = active;
    function edges() {
      list.classList.toggle('is-fade-l', list.scrollLeft > 2);
      list.classList.toggle('is-fade-r', list.scrollLeft + list.clientWidth < list.scrollWidth - 2);
    }
    var api = {
      el: list,
      set: function (id) {
        cur = id;
        btns.forEach(function (b, i) { var on = items[i].id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; if (on && b.scrollIntoView && list.scrollWidth > list.clientWidth) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ } } });
        setTimeout(edges, 0);
      },
      get: function () { return cur; }
    };
    host.appendChild(list);
    api.set(active);
    return api;
  }

  function buildWork(host) {
    var w = {};
    w.tabHost = E('div', { class: 'sk-tabhost' });
    w.body = E('div', { class: 'sk-work__body', id: 'sk-panel', role: 'tabpanel' });
    w.tabsApi = makeTabs(w.tabHost, st.tab, function (id) { setTab(id); }, w.body);
    w.wideB = btn('Lebarkan panel', 'chev-l', function () { st.wide = !st.wide; saveUi(); syncWork(0); wideFade(w); }, 'btn--ghost btn--bar sk-wide', 'Lebarkan atau perkecil panel ini');
    w.closeB = btn('Tutup', 'close', function () { openWork(false); }, 'btn--secondary btn--lg sk-work__close', 'Tutup daftar & grafik');
    var srcB = link('Sumber data', function () { openSources(); }, 'sk-work__src');
    /* v5: the head ("Lebarkan panel", Tutup) and the foot ("Sumber data") give way to the shell drawer's own bar */
    w.head = E('header', { class: 'sk-work__head' },
      E('div', { class: 'sk-work__titles' }, E('p', { class: 'sk-work__eyebrow', text: 'Daftar & grafik SMA' }), E('p', { class: 'sk-work__lede', text: 'Lokasi SMA, yayasan pengelolanya, fee program dan siapa yang perlu dihubungi berikutnya.' })),
      E('div', { class: 'sk-work__tools' }, w.wideB, w.closeB));
    w.foot = E('footer', { class: 'sk-work__foot' }, srcB);
    w.el = E('aside', { class: 'sk-work panel panel--sheet', aria: { label: 'Daftar dan grafik SMA' }, attrs: { 'data-map-occluder': '', 'data-slideover': '', 'data-slideover-label': SLIDE_LABEL } },
      w.head, w.tabHost, w.body, w.foot);
    host.appendChild(w.el);
    ui.work = w;
  }
  function setTab(id) {
    if (st.tab === id && ui.work && ui.work.current === id) return;
    st.tab = id;
    saveUi();
    renderWork(true);
  }
  function goTab(id) {
    st.tab = id;
    saveUi();
    if (!isDeep()) { st.openOnMount = true; ctx.setView('deep'); return; }
    openWork(true);
    renderWork(true);
  }
  function openWork(on) {
    st.workOpen = !!on;
    syncWork();
    /* v5: "Lihat daftar …" opens the shell's bottom drawer to half height when it only peeks (§3.7) */
    if (on && adopted()) {
      var W0 = WS();
      try { if (W0 && isFn(W0.drawer) && isFn(W0.setDrawer) && W0.drawer() === 'peek') W0.setDrawer('half'); } catch (e) { /* the drawer keeps its height */ }
    }
    if (on && ui.work) setTimeout(function () { if (!ui || !ui.work) return; var b = ui.work.el.querySelector('[role="tab"][aria-selected="true"]'); if (b) b.focus({ preventScroll: true }); }, 60);
    else if (!on && ui && ui.rail && ui.rail.openWork) { try { ui.rail.openWork.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  /**
   * "Lebarkan panel" changes the width at once: a width transition would lay out the panel and its virtual SMA table
   * on every frame (finding, 16 Oct 2026). The reflowed tabs and content then fade up from 35 % over --dur-base,
   * ease-out, so the jump reads as one calm step (opacity only, item 38). Reduced motion: the cut alone.
   */
  function wideFade(w) {
    if (!w || reducedMotion()) return;
    var M = motion();
    var ms = M && M.dur && typeof M.dur.base === 'number' ? M.dur.base : 300;
    var ease = M && M.ease && M.ease.out ? M.ease.out : 'cubic-bezier(.22,1,.36,1)';
    [w.tabHost, w.body].forEach(function (n) {
      if (!n || !isFn(n.animate)) return;
      if (n.skWideFade) { try { n.skWideFade.cancel(); } catch (e) { /* ignore */ } }
      try { n.skWideFade = n.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: ms, easing: ease }); } catch (e) { n.skWideFade = null; }
    });
  }
  /** Classes and layout of the workbench. settleMs: when charts and the table re-measure (default after the
      320 ms slide of open/close; 0 for "Lebarkan panel", whose width changes at once). */
  function syncWork(settleMs) {
    var w = ui && ui.work;
    if (!w) return;
    syncAdopted();
    if (!adopted()) w.el.classList.toggle('is-wide', !!st.wide);     /* adopted: the shell sets .is-wide from the drawer's width (v5) */
    w.el.classList.toggle('is-open', !!st.workOpen);
    document.body.classList.toggle('sk-work-open', !!st.workOpen);
    var t = w.wideB.querySelector('span');
    if (t) t.textContent = st.wide ? 'Perkecil panel' : 'Lebarkan panel';
    ctx.relayout();
    setTimeout(function () {
      if (!ctx) return;
      ctx.relayout();
      handles.forEach(function (h) { try { if (h.resize) h.resize(); } catch (e) { /* ignore */ } });
      if (ui && ui.work && ui.work.table && ui.work.table.resize) ui.work.table.resize();
      if (ui && ui.work && ui.work.yay && st.tab === 'yay') renderYay();
    }, typeof settleMs === 'number' ? settleMs : 340);
  }
  function dropPanel() {
    var w = ui.work;
    (w.panelHandles || []).forEach(dropHandle);
    w.panelHandles = [];
    if (w.table && w.table.destroy) { try { w.table.destroy(); } catch (e) { /* ignore */ } }
    w.table = null;
    w.kec = w.yay = w.list = w.calc = w.pipe = null;
  }
  function panelChart(kind, el, data, cfg) {
    var h = chart(kind, el, data, cfg);
    ui.work.panelHandles = (ui.work.panelHandles || []).concat([h]);
    return h;
  }
  var BUILD = {
    list: function (b) { buildList(b); },
    kec: function (b) { buildKecTab(b); },
    yay: function (b) { buildYay(b); },
    prog: function (b) { buildProg(b); buildCalc(b); },
    pipe: function (b) { buildPipe(b); }
  };
  var RENDER = {
    list: function () { renderList(); },
    kec: function () { renderKecTab(); },
    yay: function () { renderYay(); },
    prog: function () { renderCalc(); },
    pipe: function () { renderPipe(); }
  };
  function renderWork(force) {
    var w = ui && ui.work;
    if (!w) return;
    if (!BUILD[st.tab]) st.tab = 'list';
    if (w.tabsApi && isFn(w.tabsApi.set)) w.tabsApi.set(st.tab);
    if (!w.tabsApi || !w.tabsApi.panelId) w.body.setAttribute('aria-labelledby', 'sk-tab-' + st.tab);
    if (w.current !== st.tab || force === true) {
      dropPanel();
      clear(w.body);
      w.current = st.tab;
      w.body.classList.toggle('is-fill', st.tab === 'yay' || st.tab === 'list');
      w.body.scrollTop = 0;
      if (!SC.idx && st.tab !== 'prog') { var box = E('div', { class: 'sk-load' }); renderLoad(box); w.body.appendChild(box); return; }
      BUILD[st.tab](w.body);
    }
    if (!SC.idx && st.tab !== 'prog') return;
    RENDER[st.tab]();
  }
  function filterWords() {
    var f = st.f, w = [];
    if (f.type !== 'all') w.push(f.type === 'private' ? 'swasta' : 'negeri');
    if (f.tni) w.push('yayasan TNI saja');
    if (f.inf) w.push('sekolah tanpa NPSN disembunyikan');
    return w.length ? ' · ' + w.join(', ') : '';
  }

  /* ---- Daftar SMA: the distance and TNI filters sit above the list, plus the lead export */

  function buildList(body) {
    var s = {};
    s.ex = exhibit({ eyebrow: 'Daftar sekolah', cls: 'sk-ex--fill' });
    /* v6 (§3.1): the scope switch sits where "Jarak dari Mabes TNI" was; one instance per built panel */
    scopeSwitches = scopeSwitches.filter(function (x) { return x.tag !== 'list'; });
    s.km = scopeCtl({ cls: 'sk-seg--km' });
    s.km.tag = 'list';
    s.km.set(scopeNow());
    s.tni = toggle('Hanya SMA yayasan TNI', function (on) { setF({ tni: on }); }, { title: 'Hang Tuah (AL), Angkasa / Ardhya Garini (AU), Kartika (AD)' });
    s.sort = seg('Urutkan daftar sekolah', LIST_SORTS, function (v) { st.listSort = v; saveUi(); if (v === 'tier') needTiers(); renderList(); }, 'sk-seg--sort');
    s.sw = distToggles();
    s.q = E('input', { class: 'input sk-search__in', type: 'search', placeholder: 'Cari sekolah atau yayasan', title: 'Cari menurut nama sekolah, NPSN atau yayasan', aria: { label: 'Cari sekolah menurut nama, NPSN atau yayasan' }, value: st.sq || '' });
    s.q.addEventListener('input', debounce(function () { st.sq = s.q.value; renderList(); }, 150));
    s.exportB = guard(btn('Ekspor daftar SMA (CSV)', 'download', function () { exportSchools(); }, 'btn--secondary btn--bar', 'Daftar sekolah untuk dikunjungi, dalam CSV. Tidak tersedia saat Data contoh aktif atau nama disamarkan.'));
    s.ex.el.insertBefore(E('div', { class: 'sk-tools sk-tools--filters' },
      E('div', { class: 'sk-fg sk-fg--inline' }, s.km.el), s.tni.el), s.ex.body);
    s.ex.el.insertBefore(E('div', { class: 'sk-tools sk-tools--sort' },
      E('div', { class: 'sk-fg sk-fg--inline' }, E('span', { class: 'sk-fg__l', text: 'Urutkan' }), s.sort.el), s.sw.el), s.ex.body);
    s.ex.el.insertBefore(E('div', { class: 'sk-tools' }, E('label', { class: 'search sk-search' }, icon('search'), s.q), s.exportB), s.ex.body);
    s.tableHost = E('div', { class: 'sk-table' });
    s.ex.body.appendChild(s.tableHost);
    s.foot = E('p', { class: 'sk-note' });
    s.ex.body.appendChild(s.foot);
    body.appendChild(s.ex.el);
    ui.work.list = s;
  }
  function listRows() {
    var I = SC.idx, q = st.sq ? SC.searchKey(st.sq) : '', out = [];
    V.rows.forEach(function (i) {
      if (q && I.nameKey[i].indexOf(q) < 0 && I.npsn[i].indexOf(q) < 0 && SC.searchKey(I.yay[i]).indexOf(q) < 0) return;
      out.push({ i: i });
    });
    var by = st.listSort;
    function act(i) { var s = sInfo(i); return s && s.inactive ? 1 : 0; }
    if (by === 'k17') out.sort(function (a, b) { return act(a.i) - act(b.i) || (k17Num(b.i) == null ? -1 : k17Num(b.i)) - (k17Num(a.i) == null ? -1 : k17Num(a.i)) || distSortVal(a.i) - distSortVal(b.i); });
    else if (by === 'stu') out.sort(function (a, b) { return act(a.i) - act(b.i) || stuOf(b.i) - stuOf(a.i) || distSortVal(a.i) - distSortVal(b.i); });
    else if (by === 'tier') out.sort(function (a, b) { return act(a.i) - act(b.i) || tierLevel(b.i) - tierLevel(a.i) || tierBasisRank(a.i) - tierBasisRank(b.i) || distSortVal(a.i) - distSortVal(b.i); });
    else out.sort(function (a, b) { return distSortVal(a.i) - distSortVal(b.i) || I.dist[a.i] - I.dist[b.i]; });
    return out;
  }
  /** Within a tier, a published fee first, then the school type, then perkiraan ("Kelas biaya tertinggi"). */
  function tierBasisRank(i) { var t = tierOf(i); return !t || !t.basis ? 3 : t.basis === 'biaya' ? 0 : t.basis === 'jenis' ? 1 : 2; }
  function renderList() {
    var s = ui.work && ui.work.list;
    if (!s || !V) return;
    s.km.set(scopeNow());
    s.tni.set(st.f.tni);
    s.sort.set(st.listSort);
    s.sw.sync();
    var nn = nounOf(), tniLbl = s.tni.el.querySelector('.sk-toggle__t');
    if (tniLbl) tniLbl.textContent = 'Hanya ' + nn + ' yayasan TNI';
    var xb = s.exportB.querySelector('span:last-child');
    if (xb) xb.textContent = onlySma() ? 'Ekspor daftar SMA (CSV)' : 'Ekspor daftar sekolah (CSV)';
    var I = SC.idx, fmt = fm(), rows = listRows(), byWords = { near: 'terdekat dari KCP lebih dulu', k17: 'siswa 17+ terbanyak lebih dulu', stu: 'siswa terbanyak lebih dulu', tier: 'kelas biaya tertinggi lebih dulu' }[st.listSort] || '';
    var open = V.hasBank ? V.kpi.pros + V.kpi.none : V.kpi.n;
    s.ex.set(st.sq ? count(rows.length, noun()) + ' cocok dengan “' + st.sq + '”'
      : (!V.kpi.n ? withinWords(0, st.f.km, st.f.tni ? V.nTni[15] : V.n[15], 15) + (st.f.tni ? ' untuk ' + nn + ' yayasan TNI' : '')
        : (V.hasBank ? fmt.int(open) + ' dari ' + count(V.kpi.n, noun()) + ' dalam ' + st.f.km + ' km belum menjadi nasabah Mandiri' : count(V.kpi.n, noun()) + ' dalam ' + st.f.km + ' km, ' + byWords)),
      Noun() + ' yang tampil · siswa 17+ dan jumlah siswa dari Dapodik · jarak dan waktu dari KCP, perkiraan' + (distModeWords() ? ' (' + distModeWords() + ')' : '') + filterWords(),
      SRC_SCHOOLS + (V.students ? ' · ' + STU_SRC.replace('Data siswa: ', 'siswa: ') : '') + (V.hasBank ? ' · status: ' + (V.demo ? 'data contoh (ilustrasi)' : 'file cabang, sheet 3_sekolah') : ''));
    demoTag(s.ex.title, { inline: true, when: V.demo });
    /* three short lines at most (calm screens, item 39) */
    setLines(s.foot, 'Angka dengan ± adalah perkiraan. Cara hitungnya ada di tombol tanda tanya pada kartu Siswa 17+.' +
      (V.kpi.inactive || V.kpi.noData ? '\n' + [V.kpi.inactive ? count(V.kpi.inactive, nn) + ' kemungkinan tidak aktif tetap tampil, tetapi tidak dihitung.' : null,
        V.kpi.noData ? count(V.kpi.noData, 'sekolah') + ' tanpa data siswa, alasannya ada di kartunya.' : null].filter(Boolean).join(' ') : '') +
      '\nCSV memuat siswa, jarak dari KCP, kelas biaya, kontak lembaga dan tanda nasabah Mandiri (Y/N), tanpa saldo.');
    /* narrow lists (the workbench at 1280-1440 px): narrower number columns. Phones (V3_REPORT §4.5): the SMA name
       keeps most of the row and wraps onto a second line instead of being cut; siswa 17+ (and the Mandiri status)
       move under the name, so only the distance keeps its own column */
    var tw = (s.tableHost && s.tableHost.clientWidth) || window.innerWidth || 1024, narrow = tw < 480, phone = tw < 360, mode = distModeWords();
    /* v6 (§4.2): a "Kelas biaya" column from 820 px; narrower lists carry it on the row's second line */
    var tierCol = !!(V.tiers && tw >= 820);
    var cols = [
      V.hasBank && !phone ? { key: 'st', label: 'Status', width: narrow ? 96 : 112, sortable: false, render: function (td, r) { td.appendChild(chipEl(V.status[r.i])); } } : null,
      { key: 'name', label: phone ? Noun() + ' · siswa 17+' : Noun(), sortable: false, headerTitle: phone ? 'Nama sekolah. Di bawahnya: siswa 17+ (dapat memiliki KTP), jenis sekolah dan yayasan. Angka dengan ± adalah perkiraan.' : null, render: function (td, r) {
        var t = I.tni[r.i] >= 0, e = I.ent[r.i] >= 0 ? I.ents[I.ent[r.i]] : null, si = sInfo(r.i);
        var tt = V.tiers && !tierCol ? tierOf(r.i) : null;
        var sub = (si && si.inactive ? 'Kemungkinan tidak aktif · ' : '') + (onlySma() ? '' : JENIS_WORD[jenisOf(r.i)] + ' · ') + (t ? 'Yayasan TNI · ' : '') + typeWord(I.st[r.i]) + ' · ' + (e ? e.label : (I.yay[r.i] || (I.st[r.i] === 0 ? 'tanpa yayasan' : 'yayasan tidak tercatat'))) + (I.inf[r.i] ? ' · tanpa NPSN' : '') + (tt && tt.tier ? ' · kelas biaya ' + tt.label : '');
        if (phone) sub = (si && si.inactive ? '' : k17Short(si, r.i)) + sub;
        var subEl = E('span', { class: 'sk-ent__sub' + (t ? ' is-gold' : '') + (si && si.inactive ? ' is-off' : ''), text: sub, title: sub });
        td.appendChild(E('span', { class: 'sk-ent sk-ent--sym' + (phone ? ' sk-ent--wrap' : ''), title: phone ? I.name[r.i] : null }, symChip(r.i, 'sk-ent__sym'),
          E('span', { class: 'sk-ent__txt' }, E('span', { class: 'sk-ent__name', text: I.name[r.i], title: I.name[r.i] }),
            phone && V.hasBank ? E('span', { class: 'sk-ent__line' }, chipEl(V.status[r.i]), subEl) : subEl)));
      } },
      phone ? null : { key: 'k17', label: 'Siswa 17+', width: narrow ? 64 : 92, sortable: false, align: 'right', headerTitle: 'Siswa berusia 17 tahun ke atas, dapat memiliki KTP. Angka dengan ± adalah perkiraan. Di bawahnya: semua siswa.',
        render: function (td, r) {
          var si = sInfo(r.i), n = stuOf(r.i);
          var top = si && si.inactive ? '0' : si && si.k17 != null ? k17Words(si, true) : '—';
          td.appendChild(E('span', { class: 'sk-num2', title: si && !si.inactive && si.k17 != null ? (si.k17Official ? 'Data resmi umur dari Dapodik' : 'Perkiraan dari siswa per kelas') : 'Jumlah siswa 17+ belum tersedia' },
            E('span', { class: 'sk-num2__a', text: top }), E('span', { class: 'sk-num2__b', text: n >= 0 ? 'dari ' + fmt.int(n) : 'tanpa data' })));
        } },
      tierCol ? { key: 'tier', label: 'Kelas biaya', width: 128, sortable: false, headerTitle: TIER_LINE + '\nBatang berisi = dari biaya resmi atau jenis sekolah. Batang kosong = perkiraan.',
        render: function (td, r) { var t = tierOf(r.i); var c0 = t ? tierChipEl(t) : null; if (c0) td.appendChild(c0); else td.textContent = '—'; } } : null,
      /* the cell drops "(jam sibuk, tanpa tol)": the header names the mode once, so km and minutes stay readable */
      { key: 'dist', label: (narrow || mode ? 'Dari KCP' : 'Jarak dari KCP') + (mode ? ' (' + mode + ')' : ''), width: phone ? 84 : narrow ? 100 : 112, sortable: false, align: 'right',
        headerTitle: DIST_TIP + (mode ? '\nWaktu: ' + mode + '.' : ''),
        render: function (td, r) {
          var dr = distOf(r.i), p = distText(dr, 'cell');
          td.appendChild(E('span', { class: 'sk-num2 sk-num2--dist', title: distTip(dr) }, E('span', { class: 'sk-num2__a', text: p.km || '—' }), E('span', { class: 'sk-num2__b', text: p.min || '' })));
        } }
    ].filter(Boolean);
    /* phones: room for a name on two lines, the line under it and, after the school-file import, the status chip */
    var cfg = { columns: cols, rows: rows, rowKey: function (r) { return r.i; }, rowHeight: phone ? (V.hasBank ? 76 : 62) : 50, virtual: 'auto', label: Noun() + ' yang tampil',
      emptyText: st.sq ? 'Tidak ada ' + nn + ' yang cocok dengan pencarian ini. Kosongkan kolom cari.' : 'Tidak ada ' + (onlySma() ? 'SMA' : 'sekolah') + ' yang cocok dengan filter ini. Hapus salah satu filter.',
      onRow: function (r) { flyNext = true; ctx.select({ kind: 'smaSchool', id: r.i }); }, onHover: function (r) { highlightRows(r ? [r.i] : null, 2500); } };
    if (!s.table) s.table = ui.work.table = MCD.charts.table(s.tableHost, rows, cfg);
    else s.table.update(rows, cfg);
  }
  /** "612 siswa 17+ · " (or "± 600 …") at the start of the line under a name on phones; '' without a count. */
  function k17Short(si, i) {
    if (si && si.k17 != null) return k17Words(si, true) + ' siswa 17+ · ';
    var n = stuOf(i);
    return n >= 0 ? count(n, 'siswa') + ' · ' : '';
  }
  /** Road distance and minutes for the CSV (normal traffic, the car route). */
  function csvDistance(i) { var r = distOf(i); return r && r.source !== 'garis' ? { km: r.km, min: r.min } : null; }
  function exportSchools() {
    if (exportBlocked() || !V) return;
    /* v6 (§5.2, §4.2): the contact and kelas biaya columns need their files; both load first (each at most once) */
    Promise.all([needContacts(), needTiers()]).then(function () { if (ctx && V) exportNow(); });
  }
  function exportNow() {
    var csv = SC.leadsCsv(SC.idx, { rows: Int32Array.from(listRowsAll()) }, V.rel, { grain: 'school', distance: csvDistance,
      info: function (i) { return sInfo(i); }, level: function (i) { return JENIS_LEVEL[jenisOf(i)]; }, tier: tierCsv, contact: contactCsv });
    var name = (onlySma() ? 'sma' : 'sekolah') + '-leads_cilangkap_' + ymd(today()) + '.csv';
    ctx.toast(download(name, csv) ? name + ' tersimpan di komputer ini' : 'File tidak dapat disimpan. Coba lagi.', null);
  }
  /** Every row of the list in its current order (the search box only narrows the screen). */
  function listRowsAll() { var q = st.sq; st.sq = ''; var r = listRows().map(function (x) { return x.i; }); st.sq = q; return r; }

  /* ---- Kecamatan: combo (negeri and swasta bars, siswa per SMA line), donut, heatmap */

  function buildKecTab(body) {
    var k = {};
    k.note = E('div', { class: 'sk-load', hidden: true });
    /* students aged 17+ per kecamatan (items 26, 29): totals, then the schools with the most in the drawer */
    k.stu = exhibit({ eyebrow: 'Siswa 17+ per kecamatan' });
    k.top = seg('Kecamatan yang ditampilkan', [{ v: false, label: TOP_KEC + ' teratas' }, { v: true, label: 'Semua' }], function (v) { st.kecAll = v; saveUi(); renderKecTab(); });
    /* v6 (§3.3): every kecamatan in scope, ranked by siswa 17+ (default), by schools or by students */
    k.sort = seg('Urutkan kecamatan', [{ v: 'k17', label: 'Siswa 17+ terbanyak' }, { v: 'n', label: 'Sekolah terbanyak' }, { v: 'stu', label: 'Siswa terbanyak' }],
      function (v) { st.kecSort = v; saveUi(); renderKecTab(); }, 'sk-seg--sort');
    k.stu.el.insertBefore(E('div', { class: 'sk-tools sk-tools--sort' }, k.sort.el, k.top.el, helpBtn('Cara menghitung siswa 17+')), k.stu.body);
    k.stuHost = E('div', { class: 'sk-chart sk-chart--rank' });
    k.stu.body.appendChild(k.stuHost);
    k.combo = exhibit({ eyebrow: 'SMA per kecamatan' });
    k.comboHost = E('div', { class: 'sk-chart sk-chart--rank' });
    k.combo.body.appendChild(k.comboHost);
    k.donut = exhibit({ eyebrow: 'Komposisi' });
    k.donutHost = E('div', { class: 'sk-chart sk-chart--donut' });
    k.donut.body.appendChild(k.donutHost);
    k.heat = exhibit({ eyebrow: 'Kecamatan menurut jenis' });
    k.heatHost = E('div', { class: 'sk-chart sk-chart--heat' });
    k.heat.body.appendChild(k.heatHost);
    body.appendChild(k.note);
    body.appendChild(k.stu.el);
    body.appendChild(k.combo.el);
    body.appendChild(E('div', { class: 'sk-pair' }, k.donut.el, k.heat.el));
    ui.work.kec = k;
  }
  function kecRows() {
    var list = V.kecList.filter(function (a) { return a.n > 0; });
    return st.kecAll ? list : list.slice(0, TOP_KEC);
  }
  function renderKecTab() {
    var k = ui.work && ui.work.kec;
    if (!k || !V) return;
    var fmt = fm(), f = st.f;
    k.top.set(st.kecAll);
    var T = territory();
    k.note.hidden = !!T;
    clear(k.note);
    if (!T) k.note.appendChild(E('p', { class: 'sk-load__t', text: 'Batas kecamatan sedang dimuat.\nJika tidak muncul, muat ulang halaman.' }));
    var rows = kecRows(), all = V.kecList.filter(function (a) { return a.n > 0; });
    var top = rows[0];
    renderKecStudents(k);
    k.combo.set(top ? 'Kec. ' + top.name + ' memiliki ' + nounOf() + ' terbanyak dari ' + all.length + ' kecamatan di sekitar Mabes TNI (' + fmt.int(top.n) + ')' : 'Tidak ada ' + nounOf() + ' yang cocok dengan filter ini',
      'Jumlah ' + nounOf() + ' dalam ' + f.km + ' km per kecamatan, terbanyak di atas · di bawah nama: negeri, swasta dan rata-rata siswa per sekolah jika tercatat di Dapodik' + filterWords(),
      SRC_SCHOOLS + ' · ' + SRC_AREAS + '. Semua kecamatan yang masuk ' + f.km + ' km dari Mabes TNI.');
    var data, cfg;
    if (V.hasBank) {
      /* with the school file: SMA nasabah vs belum (bars) and the share nasabah (line), its dots in the map's colours,
         ranked into thirds (COPY_STYLE item 18) */
      var rk = V.rank && V.rank.applied ? V.rank : null;
      var weak = rows.filter(function (a) { return a.ranked && a.band3 === 'notYet'; }).sort(function (a, b) { return (b.n - b.cust) - (a.n - a.cust); })[0];
      k.combo.set(weak ? 'Kec. ' + weak.name + ' berada di sepertiga terendah: ' + (weak.cust ? fmt.int(weak.n - weak.cust) + ' dari ' + count(weak.n, 'SMA') + ' belum menjadi nasabah Mandiri' : 'belum ada dari ' + count(weak.n, 'SMA') + ' yang menjadi nasabah Mandiri')
          : (top ? 'Kec. ' + top.name + ' memiliki ' + nounOf() + ' terbanyak dari ' + all.length + ' kecamatan di sekitar Mabes TNI (' + fmt.int(top.n) + ')' : 'Tidak ada ' + nounOf() + ' yang cocok dengan filter ini'),
        'SMA yang belum menjadi nasabah Mandiri (batang) dan porsi nasabah Mandiri, % (titik), per kecamatan' + filterWords(),
        (V.demo ? 'Sumber: data contoh (ilustrasi) · ' : 'Sumber: file sekolah cabang (sheet 3_sekolah) · ') + SRC_SHORT + ' · ' + SRC_AREAS + '. Titik dibagi menjadi tiga kelompok, sama dengan label peta.');
      /* ranked bars like Merchant › Kecamatan (B-09 / A-16): full names, one number per row, a coverage column */
      data = { rows: rows.map(function (a) {
        return { key: a.id, label: a.name, sub: fmt.int(a.cust) + ' dari ' + count(a.n, 'SMA') + ' nasabah Mandiri · ' + a.kota,
          value: a.n - a.cust, dot: a.n ? a.cov : null, dotTone: a.n ? (a.band3 || null) : 'none' };
      }) };
      cfg = { label: 'SMA belum nasabah Mandiri dan porsi nasabah per kecamatan', categoryLabel: 'Kecamatan', valueLabel: 'Belum nasabah', dotLabel: 'Nasabah',
        dotFormat: 'pct0', color: 'notYet', demo: true, onClick: function (p) { showKec(p.key); } };
    } else {
      data = { rows: rows.map(function (a) {
        var stu = a.stuN ? Math.round(a.stu / a.stuN) : null;
        return { key: a.id, label: a.name, value: a.n,
          sub: fmt.int(a.pub) + ' negeri · ' + fmt.int(a.priv) + ' swasta' + (a.unk ? ' · ' + fmt.int(a.unk) + ' belum diketahui' : '') + (stu != null ? ' · ' + fmt.int(stu) + ' siswa per sekolah' : '') };
      }) };
      cfg = { label: Noun() + ' per kecamatan', categoryLabel: 'Kecamatan', valueLabel: Noun(), color: 'chart-3', demo: false,
        onClick: function (p) { showKec(p.key); } };
    }
    if (!k.comboChart) k.comboChart = panelChart('rankBars', k.comboHost, data, cfg); else k.comboChart.update(data, cfg);
    // donut in the map's school colours (item 34): negeri blue, swasta amber, yayasan TNI gold (the section's TNI
    // highlight), grey unknown
    var m = V.mix, tot = m.priv + m.tni + m.pub + m.unk;
    k.donut.set(tot ? fmt.pct((m.priv + m.tni) / tot, 0) + ' ' + nounOf() + ' dalam ' + f.km + ' km adalah sekolah swasta milik yayasan' : 'Tidak ada ' + nounOf() + ' dalam ' + f.km + ' km',
      'Jumlah ' + nounOf() + ' dalam ' + f.km + ' km dari Mabes TNI menurut status', SRC_SCHOOLS);
    var ddata = { slices: [
      { key: 'pub', label: 'Negeri', value: m.pub, color: 'chart-3' },
      { key: 'priv', label: 'Swasta (yayasan)', value: m.priv, color: 'status-mid' },
      { key: 'tni', label: 'Yayasan TNI (swasta)', value: m.tni, color: 'chart-hl' },
      { key: 'unk', label: 'Jenis belum diketahui', value: m.unk, color: 'noData' }
    ].filter(function (s) { return s.value > 0; }), centerLabel: nounOf(), centerValue: tot };
    var dcfg = { label: 'SMA menurut jenis', valueLabel: 'SMA', categoryLabel: 'Jenis', height: 240,
      onClick: function (p) {
        if (!p.selected) { setF({ type: 'all', tni: false }); return; }
        if (p.key === 'pub') setF({ type: 'public', tni: false }); else if (p.key === 'tni') setF({ type: 'all', tni: true }); else if (p.key === 'priv') setF({ type: 'private', tni: false });
      } };
    if (!k.donutChart) k.donutChart = panelChart('donut', k.donutHost, ddata, dcfg); else k.donutChart.update(ddata, dcfg);
    // heatmap: counts before the school file, share nasabah after
    var hrows = rows.slice(0, TOP_KEC);
    var cols = [{ key: 'priv', label: 'Swasta' }, { key: 'tni', label: 'Yayasan TNI' }, { key: 'pub', label: 'Negeri' }]
      .filter(function (c) { return c.key !== 'tni' || hrows.some(function (a) { return a.tni > 0; }); });
    if (V.hasBank) cols.unshift({ key: 'all', label: 'Semua SMA' });
    var I = SC.idx;
    var tally = function (a, col) {
      var n = 0, c = 0;
      a.rows.forEach(function (i) {
        var isT = I.tni[i] >= 0, ok = col === 'all' ? true : col === 'tni' ? isT : col === 'priv' ? (!isT && I.st[i] !== 0) : I.st[i] === 0;
        if (!ok) return;
        n++;
        if (V.status[i] === 2) c++;
      });
      return { n: n, c: c };
    };
    var cell = function (a, col) {
      var t = tally(a, col);
      if (!V.hasBank) return t.n;
      /* a kecamatan that is not ranked on the map stays grey here too */
      return t.n ? { value: t.c / t.n, n: t.c, of: t.n, tone: V.rank && V.rank.applied && !a.ranked ? 'none' : null } : null;
    };
    /* thirds per column among the ranked kecamatan (all of them, not only the rows shown), the same cut rule
       as the map; the "Semua SMA" column uses the map's own cut points so it matches the kecamatan colours */
    var hcuts = null;
    if (V.hasBank) {
      var CS = MCD.charts && MCD.charts.status, pool = V.kecList.filter(function (a) { return a.ranked; });
      hcuts = {};
      cols.forEach(function (c) {
        if (c.key === 'all' && V.rank && V.rank.applied) { hcuts.all = { lo: V.rank.lo, hi: V.rank.hi }; return; }
        hcuts[c.key] = CS && CS.rankCuts ? CS.rankCuts(pool.map(function (a) { var t = tally(a, c.key); return t.n ? t.c / t.n : null; })) : null;
      });
    }
    var hdata = { rows: hrows.map(function (a) { return { key: a.id, label: a.name, sub: a.kota }; }), cols: cols, values: hrows.map(function (a) { return cols.map(function (c) { return cell(a, c.key); }); }), scale: V.hasBank ? 'ranked' : 'count' };
    var best = null;
    if (V.hasBank) hrows.forEach(function (a) { if (a.n && (!best || a.cov > best.cov)) best = a; });
    var privMore = hrows.filter(function (a) { return a.priv + a.unk > a.pub; }).length;
    k.heat.set(V.hasBank ? (best && best.cov > 0 ? 'Kec. ' + best.name + ' memiliki porsi SMA nasabah Mandiri tertinggi (' + fmt.pct(best.cov, 0) + ')' : 'Belum ada SMA di kecamatan ini yang menjadi nasabah Mandiri') :
      (hrows.length ? 'SMA swasta lebih banyak daripada SMA negeri di ' + (privMore === hrows.length ? 'semua ' + fmt.int(privMore) : fmt.int(privMore) + ' dari') + ' ' + fmt.int(hrows.length) + ' kecamatan ini' : 'Tidak ada ' + nounOf() + ' yang cocok dengan filter ini'),
      V.hasBank ? 'Porsi SMA nasabah Mandiri (%) per kecamatan dan jenis · warna membagi setiap kolom menjadi tiga kelompok, sama dengan label peta' : 'Jumlah SMA per kecamatan dan jenis · ' + hrows.length + ' kecamatan teratas',
      V.hasBank ? (V.demo ? 'Sumber: data contoh (ilustrasi); ' : 'Sumber: file sekolah cabang (sheet 3_sekolah); ') + SRC_SHORT : SRC_SCHOOLS);
    demoTag(k.heat.title, { inline: true, when: V.demo });
    var hcfg = { label: V.hasBank ? 'Porsi SMA nasabah Mandiri per kecamatan dan jenis, diperingkat' : 'SMA per kecamatan dan jenis', rowLabel: 'Kecamatan', valueLabel: V.hasBank ? 'Nasabah Mandiri' : 'SMA', countLabel: 'Nasabah Mandiri', unit: 'SMA', format: V.hasBank ? 'pct0' : 'int', cellLabel: true, demo: V.hasBank,
      rankBy: 'col', cuts: hcuts, noneWords: 'Abu-abu: tidak dinilai atau tidak ada SMA jenis ini', tipFormat: V.hasBank ? 'pct0' : null,
      onClick: function (p) { showKec(p.rowKey || p.row); } };
    if (!k.heatChart) k.heatChart = panelChart('heatmap', k.heatHost, hdata, hcfg); else k.heatChart.update(hdata, hcfg);
  }

  /** Siswa 17+ per kecamatan (ranked bars): total aged 17+, with SMA, students and the largest school under the name. */
  function kecStudents() {
    var I = SC.idx, by = st.kecSort === 'n' ? 'n' : st.kecSort === 'stu' ? 'stu' : 'k17';
    return V.kecList.filter(function (a) { return by === 'n' ? a.n > 0 : a.stuN > 0; }).map(function (a) {
      var best = null;
      a.rows.forEach(function (i) { var n = k17Num(i); if (n != null && (best == null || n > k17Num(best))) best = i; });
      return { a: a, best: best, name: best != null ? I.name[best] : '' };
    }).sort(function (x, y) { return (y.a[by] - x.a[by]) || (y.a.k17 - x.a.k17) || (x.a.name < y.a.name ? -1 : 1); });
  }
  function renderKecStudents(k) {
    if (!k || !k.stu) return;
    var fmt = fm();
    if (!V.students) {
      k.stu.set('Data siswa belum termuat', 'Siswa berusia 17+ per kecamatan', STU_SRC);
      clear(k.stuHost);
      k.stuHost.appendChild(E('p', { class: 'sk-note', text: SC.studentsFailed ? 'Data siswa tidak dapat dimuat. Muat ulang halaman.' : 'Data siswa sedang dimuat.' }));
      k.stuChart = null;
      return;
    }
    var list = kecStudents(), shown = st.kecAll ? list : list.slice(0, TOP_KEC), lead = list[0], nn = nounOf();
    var by = st.kecSort === 'n' ? 'n' : st.kecSort === 'stu' ? 'stu' : 'k17', wide = st.f.km > 15;
    k.top.set(st.kecAll);
    if (k.sort) k.sort.set(by);
    var leadWords = !lead ? '' : by === 'n' ? count(lead.a.n, nn) + ' terbanyak (' + fmt.int(lead.a.n) + ')' : by === 'stu' ? 'siswa terbanyak (' + fmt.int(lead.a.stu) + ')' : 'siswa 17+ terbanyak (' + (lead.a.k17Est ? '± ' : '') + fmt.int(lead.a.k17) + ')';
    k.stu.set(lead ? 'Kec. ' + lead.a.name + ' memiliki ' + (by === 'n' ? Noun().toLowerCase() + ' terbanyak (' + fmt.int(lead.a.n) + ')' : leadWords) : 'Tidak ada data siswa dengan filter ini',
      (by === 'n' ? Noun() : by === 'stu' ? 'Siswa' : 'Siswa berusia 17+ (dapat memiliki KTP)') + ' per kecamatan, ' + nn + ' dalam ' + st.f.km + ' km' + (wide ? ' · "dalam 15 km" = kecamatan pilot' : '') + filterWords(),
      STU_SRC + ' · ' + SRC_AREAS + '. Data resmi umur jika ada, selain itu perkiraan.');
    var data = { rows: shown.map(function (x) {
      return { key: x.a.id, label: x.a.name, value: x.a[by],
        sub: (wide && x.a.focus15 ? 'dalam 15 km · ' : '') + count(x.a.n, nn) + ' · ' + count(x.a.stu, 'siswa') + (by !== 'k17' && x.a.stuN ? ' · ' + (x.a.k17Est ? '± ' : '') + fmt.int(x.a.k17) + ' siswa 17+' : '') + (x.a.k17Est ? ' · sebagian perkiraan' : '') + (x.name ? ' · terbanyak: ' + x.name : '') };
    }) };
    var cfg = { label: (by === 'n' ? Noun() : by === 'stu' ? 'Siswa' : 'Siswa berusia 17+') + ' per kecamatan', categoryLabel: 'Kecamatan', valueLabel: by === 'n' ? Noun() : by === 'stu' ? 'Siswa' : 'Siswa 17+', color: 'chart-2', demo: false,
      onClick: function (p) { showKec(p.key); } };
    if (!k.stuChart) k.stuChart = panelChart('rankBars', k.stuHost, data, cfg); else k.stuChart.update(data, cfg);
  }

  /* ---- Yayasan ranking (SMA only) */

  function buildYay(body) {
    var b = {};
    b.ex = exhibit({ eyebrow: 'Urutan yayasan · SMA saja', cls: 'sk-ex--fill' });
    b.sort = seg('Urutkan menurut', [{ v: 'schools', label: 'SMA' }, { v: 'students', label: 'Siswa' }, { v: 'nearest', label: 'Terdekat' }, { v: 'score', label: 'Skor' }], function (v) { st.sort = v; saveUi(); renderYay(); });
    b.q = E('input', { class: 'input sk-search__in', type: 'search', placeholder: 'Cari yayasan atau NPYP', aria: { label: 'Cari yayasan' }, value: st.q || '' });
    b.q.addEventListener('input', debounce(function () { st.q = b.q.value; renderYay(); }, 150));
    b.exportB = guard(btn('Ekspor daftar yayasan (CSV)', 'download', function () { exportYay(); }, 'btn--secondary btn--bar', 'Daftar yayasan untuk dikunjungi, dalam CSV. Tidak tersedia saat Data contoh aktif atau nama disamarkan.'));
    b.ex.el.insertBefore(E('div', { class: 'sk-tools' }, b.sort.el), b.ex.body);
    b.ex.el.insertBefore(E('div', { class: 'sk-tools' }, E('label', { class: 'search sk-search' }, icon('search'), b.q), b.exportB), b.ex.body);
    b.tableHost = E('div', { class: 'sk-table' });
    b.ex.body.appendChild(b.tableHost);
    b.ex.body.appendChild(E('p', { class: 'sk-note', text: 'Nama yayasan dari Dapodik (SMA swasta, 15 km) dan daftar yayasan TNI (30 km).\nSMA negeri tidak memiliki yayasan.\nSkor = urutan kunjungan menurut asumsi bobot: ukuran, jangkauan, jarak dan TNI.' }));
    body.appendChild(b.ex.el);
    ui.work.yay = b;
  }
  function boardRows(q) {
    var key = st.sort, dir = key === 'nearest' ? 1 : -1;
    var val = { schools: function (a) { return a.n; }, students: function (a) { return a.students; }, nearest: function (a) { return a.dmin; }, score: function (a) { return a.score; } }[key];
    var list = V.ents;
    if (q) { var s = SC.searchKey(q); list = list.filter(function (a) { return SC.searchKey(a.label).indexOf(s) >= 0 || (a.npyp && a.npyp.indexOf(s) >= 0); }); }
    return list.slice().sort(function (a, b) { return ((val(a) - val(b)) * dir) || (b.n - a.n) || (b.students - a.students) || (a.dmin - b.dmin) || (a.label < b.label ? -1 : 1); });
  }
  function yayStatus(a) { return !V.hasBank ? 1 : (a.active || a.anyActiveRow) ? 2 : a.prospect ? 3 : 4; }
  function renderYay() {
    var b = ui.work && ui.work.yay;
    if (!b || !V) return;
    b.sort.set(st.sort);
    var rows = boardRows(st.q), fmt = fm(), top = rows[0];
    var eb = b.ex.el.querySelector('.sk-ex__eyebrow');
    if (eb) eb.textContent = 'Urutan yayasan · ' + (onlySma() ? 'SMA saja' : shownJenis().map(function (j) { return JENIS_WORD[j]; }).join(', '));
    rows.forEach(function (a, i) { a._rank = i + 1; });
    var title = !rows.length ? 'Tidak ada yayasan pengelola SMA dengan filter ini. Hapus salah satu filter.' :
      st.sort === 'score' ? top.label + ' memiliki skor tertinggi (' + fmt.num(top.score, 1) + ')' :
      st.sort === 'nearest' ? top.label + ' mengelola SMA terdekat, ' + fmt.km(top.dmin) + ' dari Mabes TNI' :
      st.sort === 'students' ? top.label + ' memiliki siswa SMA tercatat terbanyak (' + fmt.int(top.students) + ')' :
      top.label + ' mengelola SMA terbanyak dalam ' + st.f.km + ' km (' + fmt.int(top.n) + ')';
    b.ex.set(title, count(rows.length, 'yayasan') + ' dengan SMA dalam ' + st.f.km + ' km · jumlah SMA dan siswa tercatat, Dapodik 2026/2027 Gasal' + filterWords(),
      SRC_TNI.replace('Sumber: ', 'Sumber: Dapodik 2026/2027 Gasal · ') + (V.hasBank ? ' · kolom Mandiri: ' + (V.demo ? 'data contoh (ilustrasi)' : 'file cabang, sheet 3_sekolah') : ''));
    demoTag(b.ex.title, { inline: true, when: V.demo });
    /* fixed columns, then optional ones while the yayasan name keeps at least 190 px */
    var cols = [
      { key: 'rank', label: '#', type: 'int', width: 32, sortable: false, value: function (a) { return a._rank; } },
      { key: 'label', label: 'Yayasan', sortable: false, render: function (td, a) {
        var sub = a.netLabel && a.netLabel !== a.label ? a.netLabel : (a.kind === 'npyp' ? 'NPYP ' + a.npyp : a.inferred ? 'Cabang belum tercatat · perkiraan' : '');
        td.appendChild(E('span', { class: 'sk-ent' }, E('span', { class: 'sk-ent__name', text: a.label, title: a.label }),
          a.tni || sub ? E('span', { class: 'sk-ent__sub' + (a.tni ? ' is-gold' : '') }, (a.tni ? 'Yayasan TNI · ' + a.tni + (sub ? ' · ' : '') : '') + sub) : null));
      } },
      { key: 'n', label: 'SMA', type: 'int', width: 60, sortable: false },
      { key: 'students', label: 'Siswa', width: 76, sortable: false, align: 'right', value: function (a) { return a.studentsN ? a.students : null; },
        format: function (v, a) { return fmt.int(v) + (a.studentsN < a.n ? '*' : ''); }, headerTitle: 'Siswa tercatat di Dapodik. * = tidak semua SMA memiliki jumlah siswa' }
    ];
    if (V.hasBank) cols.push({ key: 'mandiri', label: 'Mandiri', width: 112, sortable: false, render: function (td, a) { if (veil()) { td.textContent = '•'; return; } td.appendChild(chipEl(yayStatus(a))); } });
    var optional = [];
    optional.push({ key: 'dmin', label: 'Terdekat', width: 76, sortable: false, align: 'right', format: function (v) { return fmt.km(v); }, headerTitle: 'Jarak SMA terdekat dari Mabes TNI' });
    if (Object.keys(pipeAll()).length) optional.push({ key: 'stage', label: 'Tahap', width: 96, sortable: false, value: function (a) { var p = pipeGet(a.key); return p ? SC.stageLabel(p.stage) : null; }, format: function (v) { return v; } });
    optional.push({ key: 'score', label: 'Skor', width: 56, sortable: false, align: 'right', format: function (v) { return fmt.num(v, 1); } });
    var avail = (b.tableHost.clientWidth || 460) - 8, used = cols.reduce(function (t, c) { return t + (c.width || 0); }, 0);
    optional.forEach(function (c) { if (avail - used - c.width >= 180) { cols.push(c); used += c.width; } });
    var sel = drawerSel && drawerSel.kind === 'smaYay' ? +drawerSel.id : -1;
    var cfg = { columns: cols, rowKey: function (a) { return a.key; }, rowHeight: 46, virtual: 'auto', label: 'Urutan yayasan', emptyText: 'Tidak ada yayasan yang cocok dengan filter ini. Hapus salah satu filter.',
      onRow: function (a) { flyNext = true; ctx.select({ kind: 'smaYay', id: a.e }); },
      onHover: function (a) { highlightRows(a ? a.rows : null, 2500); },
      selectedKey: sel >= 0 && SC.idx.ents[sel] ? SC.idx.ents[sel].key : null };
    if (!b.table) b.table = ui.work.table = MCD.charts.table(b.tableHost, rows, cfg);
    else b.table.update(rows, cfg);
  }
  function exportYay() {
    if (exportBlocked() || !V) return;
    var csv = SC.leadsCsv(SC.idx, { rows: Int32Array.from(V.rows) }, V.rel, { grain: 'entity', list: boardRows('') });
    var name = 'sma-yayasan-leads_cilangkap_' + ymd(today()) + '.csv';
    ctx.toast(download(name, csv) ? name + ' tersimpan di komputer ini' : 'File tidak dapat disimpan. Coba lagi.', null);
  }

  /* ---- Program & kalkulator: Referral Biller 2026, GEMPITA 2026, then the economics calculator */

  function buildProg(body) {
    var ex = exhibit({ eyebrow: 'Program untuk SMA' });
    var rb = PROGRAMMES[0], left = SC.daysLeft(rb.end);
    ex.set('Referral Biller membayar yayasan Rp25.000 per Tabungan NOW yang memenuhi syarat sampai 28 Feb 2027' + (left != null && left >= 0 ? ', ' + count(left, 'hari') + ' lagi' : ''),
      'Fee dan ketentuan per program, Rp · sesuai publikasi Bank Mandiri', SRC_PROG);
    var grid = E('div', { class: 'sk-progs' });
    PROGRAMMES.forEach(function (p) {
      var l = SC.daysLeft(p.end), tone = l == null ? 'none' : l < 0 ? 'bad' : l <= 60 ? 'mid' : 'ok';
      var tbl = E('dl', { class: 'sk-prog__dl' });
      p.lines.forEach(function (ln) { tbl.appendChild(E('dt', { text: ln[0] })); tbl.appendChild(E('dd', { text: ln[1] })); });
      grid.appendChild(E('article', { class: 'sk-prog sk-prog--' + p.id.toLowerCase() },
        E('header', { class: 'sk-prog__head' }, E('h4', { class: 'sk-prog__name', text: p.name }),
          toneChip(tone, l == null ? 'Tanpa tanggal akhir' : l < 0 ? 'Telah berakhir' : count(l, 'hari') + ' lagi')),
        E('p', { class: 'sk-prog__fee', text: p.headline }), tbl,
        E('p', { class: 'sk-prog__src', text: 'Sumber: ' + p.src })));
    });
    ex.body.appendChild(grid);
    ex.body.appendChild(E('p', { class: 'sk-note', text: 'Pilih satu program per sekolah.\nReferral Biller membayar yayasan. GEMPITA membayar guru, staf dan siswa secara perorangan.\nSisa hari dihitung dari hari ini sampai tanggal akhir.' }));
    var comp = E('ul', { class: 'sk-comp' }, SC.config.compliance.map(function (c) { return E('li', { class: c.unverified ? 'is-unverified' : null }, E('span', { text: c.text }), c.unverified ? E('span', { class: 'sk-calc__tag', text: 'belum diverifikasi' }) : null); }));
    ex.body.appendChild(E('h4', { class: 'sk-h4', text: 'Catatan kepatuhan' }));
    ex.body.appendChild(comp);
    body.appendChild(ex.el);
  }

  function buildCalc(body) {
    var c = {};
    c.ex = exhibit({ eyebrow: 'Kalkulator potensi SMA' });
    c.target = E('select', { class: 'select sk-calc__target', aria: { label: 'Yayasan untuk kalkulator' } });
    c.target.addEventListener('change', function () { applyTarget(c.target.value); });
    c.restore = btn('Kembalikan angka contoh', 'reset', function () { st.calc = defaultCalc(); st.calcTarget = ''; saveCalc(); renderCalc(true); }, 'btn--ghost btn--bar');
    c.ex.el.insertBefore(E('div', { class: 'sk-tools' }, E('label', { class: 'sk-calc__tl' }, E('span', { text: 'Contoh untuk' }), c.target), c.restore), c.ex.body);
    c.form = E('div', { class: 'sk-calc__form' });
    c.inputs = {};
    SC.config.calcFields.forEach(function (fd) {
      var inp = E('input', { class: 'input input--num sk-calc__in', type: 'number', inputmode: 'decimal', min: fd.min, max: fd.max, step: fd.step, id: 'sk-calc-' + fd.k, aria: { describedby: 'sk-calc-h-' + fd.k } });
      var err = E('span', { class: 'sk-calc__err', id: 'sk-calc-e-' + fd.k });
      inp.addEventListener('input', debounce(function () {
        var raw = inp.value.trim(), v = raw === '' ? null : Number(raw);
        var bad = v != null && (!isFinite(v) || v < fd.min || v > fd.max);
        inp.classList.toggle('is-invalid', bad);
        err.textContent = bad ? 'Isi angka dari ' + fm().num(fd.min, 0) + ' sampai ' + fm().num(fd.max, fd.dec || 0) + '.' : '';
        if (bad) return;
        st.calc[fd.k] = v;
        saveCalc();
        renderCalcOut();
      }, 200));
      c.inputs[fd.k] = inp;
      c.form.appendChild(E('div', { class: 'sk-calc__field' },
        E('label', { class: 'sk-calc__label', for: 'sk-calc-' + fd.k }, E('span', { text: fd.label }), E('span', { class: 'sk-calc__tag sk-calc__tag--' + fd.tag.replace(/\s+/g, '-').toLowerCase(), text: TAG_WORD[fd.tag] || fd.tag })),
        E('span', { class: 'sk-calc__ctl' }, inp, E('span', { class: 'sk-calc__unit', text: fd.unit })),
        E('span', { class: 'sk-calc__hint', id: 'sk-calc-h-' + fd.k, text: fd.hint || '' }), err));
    });
    c.out = E('div', { class: 'sk-calc__out' });
    c.ex.body.appendChild(E('div', { class: 'sk-calc' }, c.form, c.out));
    c.ex.body.appendChild(E('div', { class: 'sk-notes' },
      E('p', { class: 'sk-note', text: 'Estimasi skenario.\nSetiap isian adalah asumsi yang dapat diubah. Nilai bawaan bersumber dari publikasi atau tarif RM.\nIsian tetap di komputer ini.' }),
      E('p', { class: 'sk-note', text: 'Fee Referral Biller (Rp25.000 per Tabungan NOW yang memenuhi syarat, 10 Apr 2026 sampai 28 Feb 2027) dibayarkan ke rekening atas nama yayasan (UU Yayasan Pasal 5).' }),
      E('p', { class: 'sk-note', text: 'MDR QRIS kantin hampir nol: MDR 0% untuk transaksi QRIS sampai Rp100.000 sejak 1 Okt 2026.' })));
    body.appendChild(c.ex.el);
    ui.work.calc = c;
  }
  function applyTarget(key) {
    st.calcTarget = key || '';
    if (key && V) {
      var a = V.ents.filter(function (x) { return x.key === key; })[0];
      if (a) { if (a.studentsN) st.calc.siswa = a.students; st.calc.spp = 290000; }
    }
    saveCalc();
    renderCalc(true);
  }
  function medianPupils() {
    if (!V) return null;
    var I = SC.idx, list = [];
    V.rows.forEach(function (i) { var n = stuOf(i); if (I.st[i] === 1 && n > 0) list.push(n); });
    if (!list.length) return null;
    list.sort(function (a, b) { return a - b; });
    return { m: list[list.length >> 1], n: list.length };
  }
  function renderCalc(force) {
    var c = ui.work && ui.work.calc;
    if (!c) return;
    var opts = [{ v: '', t: 'SMA contoh (ukuran median)' }];
    if (V) boardRows('').slice(0, 60).forEach(function (a) { opts.push({ v: a.key, t: a.label + ' (' + count(a.n, 'SMA') + ')' }); });
    var osig = JSON.stringify(opts.map(function (o) { return o.v; })) + st.calcTarget;
    if (c.osig !== osig) {
      c.osig = osig;
      clear(c.target);
      opts.forEach(function (o) { c.target.appendChild(E('option', { value: o.v, text: o.t })); });
      if (st.calcTarget && !opts.some(function (o) { return o.v === st.calcTarget; })) c.target.appendChild(E('option', { value: st.calcTarget, text: 'Yayasan sebelumnya (tidak tampil karena filter)' }));
    }
    c.target.value = st.calcTarget;
    SC.config.calcFields.forEach(function (fd) {
      var inp = c.inputs[fd.k];
      if (force || document.activeElement !== inp) inp.value = st.calc[fd.k] == null ? '' : String(st.calc[fd.k]);
    });
    var a = st.calcTarget && V ? V.ents.filter(function (x) { return x.key === st.calcTarget; })[0] : null;
    var med = medianPupils(), fmt = fm();
    var h = c.form.querySelector('#sk-calc-h-siswa');
    if (h) h.textContent = a ? (a.studentsN ? 'Jumlah di Dapodik: ' + a.studentsN + ' dari ' + count(a.n, 'SMA') + ' memiliki jumlah siswa.' : 'Yayasan ini belum memiliki jumlah siswa. Isi perkiraan.') :
      (med ? 'Median SMA swasta yang tampil: ' + count(med.m, 'siswa') + ' (' + count(med.n, 'SMA') + ' dengan jumlah Dapodik).' : '');
    var hs = c.form.querySelector('#sk-calc-h-spp');
    if (hs) hs.textContent = 'Acuan terendah: SPP SMA swasta dalam KJP Plus 2026, Rp290.000 per bulan. Isi dengan SPP yang berlaku di sekolah itu.';
    c.ex.set(a ? 'Potensi bisnis ' + a.label + ' untuk cabang' : 'Potensi bisnis SMA swasta dengan ' + count(st.calc.siswa || 0, 'siswa') + ' untuk cabang',
      'Estimasi bulanan dan tahunan (Rp) · setiap isian adalah asumsi, nilai bawaan dari publikasi atau tarif RM', 'Sumber: halaman program Bank Mandiri (dibaca 12 Okt 2026) · rata-rata SimPel: Antara, Mar 2026 · SPP KJP Plus 2026');
    renderCalcOut();
  }
  function renderCalcOut() {
    var c = ui.work && ui.work.calc;
    if (!c) return;
    var o = SC.calc(st.calc), fmt = fm();
    clear(c.out);
    function rp(v, need) { return v == null ? E('span', { class: 'sk-calc__need', text: '— isi ' + need }) : fmt.rp(v); }
    c.out.appendChild(E('div', { class: 'sk-calc__heroes' },
      E('div', { class: 'sk-calc__hero is-casa' }, E('span', { class: 'sk-calc__hl', text: 'Dana tabungan dan giro (CASA, estimasi)' }), E('span', { class: 'sk-calc__hv', text: o.casa == null ? '—' : fmt.rp(o.casa) }), o.casaPartial && o.casa != null ? E('span', { class: 'sk-calc__hs', text: 'Sebagian: beberapa isian kosong' }) : null),
      E('div', { class: 'sk-calc__hero is-ref' }, E('span', { class: 'sk-calc__hl', text: 'Fee Referral Biller untuk yayasan' }), E('span', { class: 'sk-calc__hv', text: o.refFee == null ? '—' : fmt.rp(o.refFee) }), o.tabAcc != null ? E('span', { class: 'sk-calc__hs', text: count(o.tabAcc, 'rekening') + ' · ' + count(o.tabMonths, 'bulan') + ' kuota' }) : null),
      E('div', { class: 'sk-calc__hero' }, E('span', { class: 'sk-calc__hl', text: 'Pendapatan fee per bulan' }), E('span', { class: 'sk-calc__hv', text: o.feeMonth == null ? '—' : fmt.rp(o.feeMonth) }), o.feeYear != null ? E('span', { class: 'sk-calc__hs', text: fmt.rp(o.feeYear) + ' per tahun' + (o.feeMonthPartial ? ' · sebagian' : '') }) : E('span', { class: 'sk-calc__hs', text: 'Isi fee per transaksi dari RM' }))));
    var lines = [
      ['SPP melalui Mandiri per bulan', rp(o.V, 'siswa, SPP dan porsi'), 'siswa × SPP × porsi melalui Mandiri'],
      ['Transaksi VA per bulan', o.N == null ? '—' : fmt.int(o.N), 'siswa × porsi melalui Mandiri'],
      ['Fee penagihan per bulan · per tahun', o.feeColl == null ? rp(null, 'fee per transaksi') : fmt.rp(o.feeColl) + ' · ' + (o.feeCollYear == null ? '—' : fmt.rp(o.feeCollYear)), 'transaksi × fee per transaksi'],
      ['SPP yang mengendap di Mandiri', rp(o.sppFloat, 'lama dana mengendap'), 'SPP bulanan × hari mengendap ÷ 30,4'],
      ['Rekening Tabungan NOW · bulan kuota', o.tabAcc == null ? '—' : fmt.int(o.tabAcc) + ' · ' + count(o.tabMonths, 'bulan'), 'siswa × porsi orang tua, paling banyak 3.000, kuota 250 per bulan'],
      ['Setoran awal Tabungan NOW', rp(o.tabCasa, 'setoran awal'), 'rekening × setoran awal (batas bawah)'],
      ['Rekening SimPel · saldo', o.simAcc == null ? '—' : fmt.int(o.simAcc) + ' · ' + (o.simCasa == null ? '—' : fmt.rp(o.simCasa)), 'siswa × porsi SimPel × saldo rata-rata'],
      ['Pendapatan dari selisih bunga (spread) per tahun', o.nii == null ? '—' : fmt.rp(o.nii), 'CASA × spread (hanya jika spread diisi)']
    ];
    var tbl = E('div', { class: 'sk-calc__tbl', role: 'table', aria: { label: 'Rincian kalkulator' } });
    lines.forEach(function (ln) {
      tbl.appendChild(E('div', { class: 'sk-calc__row', role: 'row', title: ln[2] },
        E('span', { role: 'rowheader', class: 'sk-calc__k', text: ln[0] }), E('span', { role: 'cell', class: 'sk-calc__v' }, ln[1])));
    });
    c.out.appendChild(tbl);
    if (o.capped) c.out.appendChild(E('p', { class: 'sk-warn', text: '▲ Dibatasi kuota total 3.000 rekening (' + fmt.int(o.parents) + ' orang tua dalam skenario).' }));
  }

  /* ---- Pipeline tracker (localStorage through MCD.schools.pipeline, try/catch) */

  function pipeAll() { try { return SC.pipeline.all() || {}; } catch (e) { return {}; } }
  function pipeGet(k) { try { return SC.pipeline.get(k); } catch (e) { return null; } }
  function pipeSet(k, patch, meta) { try { return SC.pipeline.set(k, patch, meta); } catch (e) { return { ok: false, error: 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' }; } }
  function pipePersisted() { try { return SC.pipeline.persisted(); } catch (e) { return false; } }

  function buildPipe(body) {
    var p = {};
    p.ex = exhibit({ eyebrow: 'Tindak lanjut' });
    p.barHost = E('div', { class: 'sk-chart sk-chart--bar' });
    p.steps = E('div', { class: 'sk-steps', role: 'list' });
    p.next = E('ul', { class: 'sk-next' });
    p.list = E('div', { class: 'sk-plist' });
    /* v6 (§7.6): the storage state in one line: memory (no key, blocked, full), an old password, a damaged list */
    p.store = E('div', { class: 'sk-warn sk-pstore', hidden: true, aria: { live: 'polite' } });
    p.file = E('input', { type: 'file', accept: '.json,application/json', hidden: true });
    p.file.addEventListener('change', function () {
      var file = p.file.files && p.file.files[0];
      if (!file) return;
      var rd = new FileReader();
      rd.addEventListener('load', function () {
        var res;
        try { res = SC.pipeline.importJson(String(rd.result || '')); } catch (e) { res = { ok: false, error: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).' }; }
        ctx.toast(res.ok ? 'Tindak lanjut diimpor: ' + res.added + ' ditambahkan, ' + res.updated + ' diperbarui, ' + res.kept + ' tetap' : res.error, res.ok ? null : 'warn');
        p.file.value = '';
        renderPipe(true);
      });
      rd.addEventListener('error', function () { ctx.toast('File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).', 'warn'); });
      rd.readAsText(file);
    });
    p.exportB = guard(btn('Ekspor (JSON)', 'download', function () {
      if (exportBlocked()) return;
      /* the export is the staff's explicit action and is not encrypted (§7.5): say so before the file is written */
      ctx.confirm({ title: 'Ekspor daftar tindak lanjut', body: 'File ini tidak terenkripsi. Simpan hanya di komputer kantor.', ok: 'Ekspor (JSON)', cancel: 'Batal' }).then(function (yes) {
        if (!yes || !ctx) return;
        var name = 'sma-pipeline_cilangkap_' + ymd(today()) + '.json';
        var text;
        try { text = SC.pipeline.exportJson(); } catch (e) { text = null; }
        if (text && download(name, text, 'application/json')) ctx.toast(name + ' tersimpan di komputer ini');
        else ctx.toast('File tidak dapat disimpan. Coba lagi.', 'warn');
      });
    }, 'btn--secondary btn--bar'));
    p.importB = btn('Impor (JSON)', 'upload', function () { p.file.click(); }, 'btn--secondary btn--bar');
    p.clearB = btn('Kosongkan daftar', 'close', function () {
      var n = Object.keys(pipeAll()).length;
      if (!n) return;
      ctx.confirm({ title: 'Kosongkan daftar tindak lanjut SMA', body: count(n, 'entri') + ' beserta catatannya akan dihapus dari komputer ini. Ekspor dulu jika perlu salinan.\nSalinan terenkripsi yang telah diunduh tidak berubah.', ok: 'Kosongkan daftar', cancel: 'Batal', danger: true })
        .then(function (yes) { if (yes) { try { SC.pipeline.clear(); } catch (e) { /* ignore */ } renderPipe(true); ctx.toast('Daftar tindak lanjut dikosongkan'); } });
    }, 'btn--ghost btn--bar');
    p.ex.el.insertBefore(E('div', { class: 'sk-tools' }, p.exportB, p.importB, p.clearB, p.file), p.ex.body);
    p.ex.body.appendChild(p.store);
    p.ex.body.appendChild(p.barHost);
    p.ex.body.appendChild(E('h4', { class: 'sk-h4', text: 'Per tahap' }));
    p.ex.body.appendChild(p.steps);
    p.ex.body.appendChild(E('h4', { class: 'sk-h4', text: 'Langkah berikutnya' }));
    p.ex.body.appendChild(p.next);
    p.ex.body.appendChild(E('h4', { class: 'sk-h4', text: 'Semua entri tindak lanjut' }));
    /* filter by target product (item 35(a): Penagihan SPP · Tabungan · Tabungan SimPel · QRIS kantin); in memory only */
    p.prodHost = E('div', { class: 'sk-tools sk-tools--prod' });
    p.ex.body.appendChild(p.prodHost);
    p.ex.body.appendChild(p.list);
    p.ex.body.appendChild(E('p', { class: 'sk-note', text: 'Catatan kerja hanya tersimpan di browser ini, terenkripsi dengan kata sandi dashboard, tanpa angka bank.\nTambahkan sekolah atau yayasan dari kartunya.\nTahap “Aktif” hanya tanda kerja staf. Status Mandiri tetap dari file cabang.' }));
    body.appendChild(p.ex.el);
    ui.work.pipe = p;
  }
  function renderPipe(force) {
    var p = ui.work && ui.work.pipe;
    if (!p) return;
    var all = pipeAll(), keys = Object.keys(all), fmt = fm(), line = pipeLine();
    var sig = JSON.stringify([keys.length, keys.map(function (k) { return all[k].t; }), st.pipeStage, st.pipeProd, veil(), line ? line.text : '', !!SC.idx]);
    if (!force && p.sig === sig) return;
    p.sig = sig;
    clear(p.store);
    p.store.hidden = !line;
    if (line) {
      p.store.appendChild(E('p', { text: '▲ ' + line.text }));
      if (line.action === 'followups') p.store.appendChild(btn('Buka di Data & Privasi', 'chev-r', function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:followups' }); }, 'btn--ghost btn--bar'));
    }
    p.ex.el.title = pipeSealed() ? SC.pipelineLines.sealed : '';
    /* entries whose school or yayasan is no longer in the data (§7.3): kept, listed last, marked */
    var gone = {};
    if (SC.idx) { try { (SC.pipeline.orphans(knownPipeKey) || []).forEach(function (k) { gone[k] = 1; }); } catch (e) { gone = {}; } }
    var counts = {};
    SC.config.stages.forEach(function (s) { counts[s.id] = 0; });
    keys.forEach(function (k) { counts[all[k].stage] = (counts[all[k].stage] || 0) + 1; });
    var tone = { ok: 0, mid: 0, bad: 0, none: 0 };
    SC.config.stages.forEach(function (s) { tone[STAGE_TONE[s.id] || 'none'] += counts[s.id]; });
    p.ex.set(keys.length ? count(keys.length, 'entri') + ' di daftar tindak lanjut, ' + fmt.int(counts.aktif) + ' aktif' : 'Daftar tindak lanjut masih kosong',
      keys.length ? 'Jumlah entri per tahap · diisi staf cabang di komputer ini' : 'Tambahkan sekolah atau yayasan dari kartunya.', 'Sumber: catatan kerja cabang (lokal) · ' + fmt.date(today()));
    var bdata = { acquired: tone.ok, partly: tone.mid, notYet: tone.bad, noData: tone.none };
    var bcfg = { label: 'Tindak lanjut per kelompok tahap', unit: 'entri', labels: { acquired: 'Aktif', partly: 'Dalam proses', notYet: 'Belum dihubungi', noData: 'Ditunda atau batal' }, tableToggle: false };
    if (!p.bar) { p.bar = panelChart('statusBar', p.barHost, bdata, bcfg); } else p.bar.update(bdata, bcfg);
    p.barHost.hidden = !keys.length;
    clear(p.steps);
    var max = Math.max(1, Math.max.apply(null, SC.config.stages.map(function (s) { return counts[s.id]; })));
    SC.config.stages.forEach(function (s) {
      var on = st.pipeStage === s.id, t = STAGE_TONE[s.id] || 'none';
      var b = E('button', { type: 'button', class: 'sk-step sk-step--' + t + (s.side ? ' is-side' : '') + (on ? ' is-on' : ''), role: 'listitem', aria: { pressed: on ? 'true' : 'false' }, title: 'Tampilkan tahap ' + s.label + ' saja' },
        E('span', { class: 'sk-step__l', text: s.label }),
        E('span', { class: 'sk-step__bar', aria: { hidden: 'true' } }, E('i', { style: { width: (100 * counts[s.id] / max).toFixed(1) + '%' } })),
        E('span', { class: 'sk-step__n', text: fmt.int(counts[s.id]) }));
      b.addEventListener('click', function () { st.pipeStage = on ? '' : s.id; renderPipe(true); });
      p.steps.appendChild(b);
    });
    clear(p.next);
    var t0 = today(), withDate = keys.filter(function (k) { return all[k].nextDate; }).sort(function (a, b) { return all[a].nextDate < all[b].nextDate ? -1 : 1; });
    if (!withDate.length) p.next.appendChild(E('li', { class: 'sk-note', text: 'Belum ada langkah berikutnya yang bertanggal.' }));
    withDate.slice(0, 12).forEach(function (k) {
      var e = all[k], dd = Math.round((Date.parse(e.nextDate + 'T00:00:00Z') - t0.getTime()) / 86400000), late = dd < 0;
      var nb = link(e.label || k, function () { openPipeKey(k); }, 'sk-next__name');
      p.next.appendChild(E('li', { class: 'sk-next__row' + (late ? ' is-late' : '') },
        E('span', { class: 'sk-next__date', text: fmt.date(e.nextDate) + (late ? ' · ▲ terlambat ' + count(-dd, 'hari') : dd === 0 ? ' · hari ini' : '') }),
        nb, E('span', { class: 'sk-next__step', text: e.nextStep || '—' })));
    });
    clear(p.list);
    clear(p.prodHost);
    function hasProd(k, id) { return (all[k].products || []).indexOf(id) >= 0; }
    if (st.pipeProd && !SC.config.products.some(function (q) { return q.id === st.pipeProd; })) st.pipeProd = '';
    p.prodHost.hidden = !keys.length;
    if (keys.length) {
      var pseg = seg('Produk sasaran', [{ v: '', label: 'Semua produk' }].concat(SC.config.products.map(function (q) {
        return { v: q.id, label: q.short + ' · ' + fmt.int(keys.filter(function (k) { return hasProd(k, q.id); }).length), title: 'Tampilkan entri dengan produk sasaran ' + q.short };
      })), function (v) { st.pipeProd = v; renderPipe(true); }, 'sk-seg--prod');
      pseg.set(st.pipeProd || '');
      p.prodHost.appendChild(E('div', { class: 'sk-fg sk-fg--inline' }, E('span', { class: 'sk-fg__l', text: 'Produk sasaran' }), pseg.el));
    }
    var shown = keys.filter(function (k) { return (!st.pipeStage || all[k].stage === st.pipeStage) && (!st.pipeProd || hasProd(k, st.pipeProd)); });
    if (!shown.length) { p.list.appendChild(E('p', { class: 'sk-empty-line', text: keys.length ? (st.pipeProd ? 'Tidak ada entri dengan produk sasaran ini.' : 'Tidak ada entri pada tahap ini.') : 'Daftar tindak lanjut masih kosong. Buka SMA atau yayasan, lalu pilih “Tambahkan ke tindak lanjut”.' })); return; }
    SC.config.stages.forEach(function (s) {
      var ks = shown.filter(function (k) { return all[k].stage === s.id; });
      if (!ks.length) return;
      p.list.appendChild(E('p', { class: 'sk-plist__g', text: s.label + ' · ' + ks.length }));
      ks.sort(function (a, b) { return ((gone[a] ? 1 : 0) - (gone[b] ? 1 : 0)) || ((all[a].label || a) < (all[b].label || b) ? -1 : 1); }).forEach(function (k) {
        var e = all[k], days = SC.daysInStage(e);
        var row = E('button', { type: 'button', class: 'sk-plist__row sk-plist__row--' + (STAGE_TONE[e.stage] || 'none') + (gone[k] ? ' is-gone' : '') },
          E('span', { class: 'sk-plist__name', text: (e.label || k) + (/^npsn:/.test(k) ? ' · ' + pipeJenis(k) : ' · yayasan') + (gone[k] ? ' · Tidak ada di data terbaru' : '') }),
          E('span', { class: 'sk-plist__meta', text: [owner(e.owner) || 'Belum ada penanggung jawab', (e.products || []).filter(knownProduct).map(productName).join(' · ') || 'belum ada produk', e.program ? (e.program === 'RB' ? 'Referral Biller' : 'GEMPITA') : null, days != null ? count(days, 'hari') + ' di tahap ini' : null].filter(Boolean).join(' · ') }),
          E('span', { class: 'sk-plist__next', text: e.nextStep ? e.nextStep + (e.nextDate ? ' · ' + fmt.date(e.nextDate) : '') : '' }));
        row.addEventListener('click', function () { openPipeKey(k); });
        p.list.appendChild(row);
      });
    });
  }
  /** The school row of a follow-up key 'npsn:<NPSN>': the app's own NPSN, else the OpenStreetMap point the 30 km file matched. */
  function rowOfKey(key) {
    var I = SC.idx, m = /^npsn:(\d+)$/.exec(String(key || ''));
    if (!I || !m) return -1;
    if (X.idx !== I || !X.uni) smaIdx(I);
    if (I.npsnIndex.has(m[1])) return I.npsnIndex.get(m[1]);
    var A = SC.students, r = A && isFn(A.byNpsn) ? A.byNpsn(m[1]) : null;
    if (r && /^app:/.test(r.id)) { var pm = /^app:(-?[\d.]+),(-?[\d.]+)$/.exec(r.id); if (pm) { for (var k = 0; k < X.uni.length; k++) { var i = X.uni[k]; if (I.lon[i].toFixed(5) === pm[1] && I.lat[i].toFixed(5) === pm[2]) return i; } } }
    return -1;
  }
  function knownPipeKey(k) { var I = SC.idx; if (!I) return true; if (/^npsn:/.test(k)) return rowOfKey(k) >= 0; return I.entByKey.has(k); }
  function pipeJenis(k) { var i = rowOfKey(k); return i >= 0 ? JENIS_WORD[jenisOf(i)] : 'sekolah'; }
  function openPipeKey(key) {
    var I = SC.idx;
    if (!I) return;
    var row = rowOfKey(key);
    if (row >= 0) { flyNext = true; ctx.select({ kind: 'smaSchool', id: row }); return; }
    var e = I.entByKey.get(key);
    if (e) { flyNext = true; ctx.select({ kind: 'smaYay', id: e.i }); return; }
    ctx.toast('Entri ini tidak ada di daftar sekolah.', 'warn');
  }

  /* ---- Sumber data (the workbench footer link opens it in the drawer) */

  function sourcesBody() {
    var S0 = window.MCD_SCHOOLS, meta = (S0 && S0.meta) || null, out = [];
    var list = E('ul', { class: 'sk-srcs' });
    if (meta && Array.isArray(meta.sources)) meta.sources.forEach(function (s) { list.appendChild(E('li', { text: s })); });
    else list.appendChild(E('li', { text: 'Kemendikdasmen Dapodik (Sekolah Kita), OpenStreetMap (Overpass), Overture Maps places 2026-09-23.1. Dimuat bersama daftar sekolah.' }));
    list.appendChild(E('li', { text: 'Sekolah yayasan TNI: Kemendikdasmen Dapodik dan Verval Yayasan (NPYP), 12 Okt 2026.' }));
    /* v6 (V6_SPEC §8.1): the three school files, each named once its file is in ("Dimuat saat diperlukan" before) */
    var D30 = SC.students && isFn(SC.students.file30) ? SC.students.file30() : null;
    list.appendChild(E('li', { text: 'Siswa SMA, SMK dan MA dalam 30 km: Kemendikdasmen (Dapodik, Sekolah Kita, termasuk madrasah; Data Referensi). SMA dalam 15 km diunduh 16 Okt 2026, sekolah lain 18 Okt 2026.' + (D30 ? '' : ' Dimuat saat diperlukan.') }));
    list.appendChild(E('li', { text: 'Kontak sekolah: Sekolah Kita (Dapodik), Data Referensi Kemendikdasmen, 18 Okt 2026. Situs resmi diperiksa 18 Okt 2026.' + (CD() ? '' : ' Dimuat saat diperlukan.') }));
    list.appendChild(E('li', { text: 'Kelas biaya: situs resmi sekolah (biaya resmi, dibaca 18 Okt 2026), jenis sekolah, daya beli area (perkiraan, ditandai).' + (TD() ? '' : ' Dimuat saat diperlukan.') }));
    list.appendChild(E('li', { text: 'Batas kecamatan dan kelurahan: OpenStreetMap (ODbL), BPS 2020 melalui OCHA/HDX (CC BY 3.0 IGO), kode Kemendagri.' }));
    var I = SC.idx, fmt = fm(), counts = '';
    if (I) {
      var n1 = 0, n2 = 0, n0 = 0, inf = 0;
      X.rows.forEach(function (i) { var c = X.cls[i]; if (c === 1) { n1++; if (I.inf[i]) inf++; } else if (c === 2) n2++; else n0++; });
      counts = 'Jenjang SMA/MA di daftar sekolah memuat ' + fmt.int(X.rows.length) + ' baris dalam 30 km.\n' + fmt.int(n1) + ' SMA, ' + fmt.int(inf) + ' di antaranya hanya dari OpenStreetMap atau Overture.\n' + fmt.int(n2) + ' MA (madrasah aliyah dan pesantren setara, menurut nama).\n' + fmt.int(n0) + ' baris lain tidak tampak sebagai sekolah dan tidak dihitung.';
    }
    var cav = E('ul', { class: 'sk-bul' }, [
      counts || 'SMA dipisahkan dari MA menurut nama setelah daftar sekolah dimuat.',
      'Jumlah siswa SMA, SMK dan MA dalam 30 km dari Dapodik (Sekolah Kita).\nSMA dalam 15 km menggunakan data pilot yang sama dengan Ringkasan.\nMA tidak pernah diperkirakan. Sekolah tanpa data siswa tetap tampil dengan alasannya.',
      'Perkiraan berarti angka dihitung dari data lain, tidak dari sumber resmi untuk lembaga itu.',
      'Enam SMA dikelola yayasan TNI: Yayasan Hang Tuah (AL), Yayasan Ardhya Garini (AU, sekolah Angkasa) dan Yayasan Kartika Jaya (AD).',
      'Titik pada label kecamatan menunjukkan porsi SMA nasabah Mandiri.\nPembandingnya kecamatan lain yang separuh wilayahnya atau lebih dalam 15 km.\nHijau sepertiga tertinggi, kuning tengah, merah terendah (kunjungi lebih dulu).\nTanpa titik: tidak dinilai. Aturannya sama dengan peta merchant.',
      'Tidak ada data pribadi siswa, guru atau orang tua yang disimpan atau diterima.'
    ].map(function (t) { return E('li', { text: t }); }));
    out.push(blk('Sumber data', [list]));
    out.push(E('p', { class: 'sk-note', text: 'Lisensi: ' + (meta && meta.license ? meta.license : 'Dapodik: data publik pemerintah Indonesia (penggunaan analitis internal dengan atribusi) · OSM: ODbL-1.0 · Overture places: CDLA-Permissive-2.0 / Apache-2.0 / CC0-1.0 sesuai sumber.') }));
    out.push(blk('Cakupan', [cav]));
    return out;
  }
  function openSources() {
    if (!ctx) return;
    drawerSel = null;
    var model = { eyebrow: 'SEKOLAH', title: 'Sumber data dan cakupan', sub: [E('span', { text: 'Setiap angka sekolah berasal dari data publik. Status Mandiri hanya dari file cabang.' }), E('span', { class: 'sk-srcline' }, dapodikBadge(28))],
      body: sourcesBody(), prov: 'Disusun 12 Okt 2026 · data/schools.js, data/tni-schools.js, data/admin-areas.js' };
    ctx.openDrawer(model);
    staggerDrawer(model);
  }

  /* ================================================================= drawer */

  function kv(k, v) { return E('div', { class: 'dd-kv' }, E('span', { class: 'dd-kv__k', text: k }), E('span', { class: 'dd-kv__v' }, v)); }
  /**
   * A drawer block. o (v5): its fold for MCD.windows: {id, preview, open} → data-fold, data-preview ("LOKASI · 18,3 km
   * · ± 39 menit" while folded) and data-open '1' | '0' (the default before staff fold or open it themselves; a
   * list-first card always opens as given).
   */
  function blk(title, kids, cls, o) {
    var s = E('section', { class: ['dd-blk', 'sk-dd', cls] }, E('h3', { class: 't-eyebrow dd-blk__t', text: title }), kids);
    if (o) {
      if (o.id) s.setAttribute('data-fold', o.id);
      if (o.preview) s.setAttribute('data-preview', o.preview);
      if (o.open != null) s.setAttribute('data-open', o.open ? '1' : '0');
    }
    return s;
  }

  /** Students block of the school drawer: students per grade, 17+ with its source, the school's own note. */
  function studentsBlock(i) {
    var si = sInfo(i), fmt = fm(), I = SC.idx, kids = [];
    if (si && (si.students != null || si.inactive || si.src === 'pilot')) {
      if (si.inactive) kids.push(E('p', { class: 'sk-dd-status' }, toneChip('none', 'Kemungkinan tidak aktif')));
      var g = si.perGrade;
      var sv = si.students == null ? '—' : count(si.students, 'siswa') + (si.studentsOfficial ? ' (data resmi)' : ' (perkiraan)');
      /* a perkiraan count from the 30 km file carries the row note in its "?" tip (V6_SPEC §3.2) */
      var tip = si.src === 'file' && si.students != null && !si.studentsOfficial && si.note
        ? E('span', { class: 'tipbtn sk-help sk-help--inline', tabindex: 0, role: 'note', title: si.note, aria: { label: si.note } }, E('span', { aria: { hidden: 'true' }, text: '?' })) : null;
      kids.push(kv('Siswa', tip ? E('span', { class: 'sk-kvv' }, E('span', { text: sv }), tip) : sv));
      if (g) kids.push(kv('Per kelas', 'Kelas 10: ' + fmt.int(g.k10) + ' · kelas 11: ' + fmt.int(g.k11) + ' · kelas 12: ' + fmt.int(g.k12)));
      if (!si.inactive) kids.push(kv(K17_LABEL, si.k17 == null ? '—' : k17Words(si)));
      /* item 35(a): the rest of the school opens Tabungan SimPel together with a parent or guardian */
      if (!si.inactive && si.k17 != null && si.students != null) kids.push(kv(U17_LABEL, (si.k17Official ? '' : '± ') + fmt.int(Math.max(0, si.students - si.k17)) + (si.k17Official ? ' (data resmi)' : ' (perkiraan)')));
      if (si.note && si.src !== 'file') kids.push(E('p', { class: 'sk-note', text: si.note }));
      if (si.inactive && si.closedLikely) kids.push(E('p', { class: 'sk-note', text: missingWords({ students: null, missing: 'closed' }) }));
      else if (si.inactive && !si.note) kids.push(E('p', { class: 'sk-note', text: 'Dapodik mencatat 0 siswa. Sekolah ini tidak dihitung.' }));
      var sem = si.semester && si.semester !== '2026/2027 Ganjil' ? (si.olderTable ? ' (sekolah ini: ' + si.semester + ', data terbaru yang tersedia)' : ' (sekolah ini: ' + si.semester + ')') : '';
      kids.push(E('p', { class: 'sk-note' }, STU_SRC + sem + '. ', link('Cara menghitung siswa 17+', function () { openMethod(); })));
    } else if (si && si.missing) {
      /* no count: the cause in words (§3.2): an OpenStreetMap point, probably closed, no table in Dapodik, or loading */
      kids.push(kv('Siswa', '—'));
      kids.push(E('p', { class: 'sk-note', text: missingWords(si) }));
      if (si.missing === 'failed') kids.push(btn('Coba lagi', 'reset', function () { need30(); }, 'btn--ghost btn--bar'));
    } else if (I.stu[i] >= 0) {
      kids.push(kv('Siswa', count(I.stu[i], 'siswa') + ' · Dapodik, 12 Okt 2026'));
      kids.push(E('p', { class: 'sk-note', text: 'Siswa 17+ hanya dihitung untuk SMA dalam 15 km.' }));
    } else {
      kids.push(kv('Siswa', 'Belum tersedia'));
      kids.push(E('p', { class: 'sk-note', text: I.dist[i] > 15 ? 'Data siswa hanya tersedia untuk SMA dalam 15 km.' : 'Jumlah siswa sekolah ini tidak tercatat.' }));
    }
    var pv = si && si.inactive ? 'kemungkinan tidak aktif' : si && si.k17 != null ? k17Words(si, true) + ' siswa 17+' + (si.students != null ? ' · ' + count(si.students, 'siswa') : '')
      : stuOf(i) >= 0 ? count(stuOf(i), 'siswa') : si && si.missing === 'loading' ? 'memuat' : 'belum tersedia';
    return blk('Siswa', kids, 'sk-dd--stu', { id: 'siswa', preview: pv, open: true });
  }
  /** "Jarak dari KCP · 4,2 km · ± 14 menit": the value follows the shared switches while the drawer is open.
      "Rute di Google Maps" sits beside it (item 36; not while the screen is shared with the veil on). */
  function distKv(i) {
    var r = distOf(i), v = E('span', { class: 'sk-dd-dist', text: distText(r), title: distTip(r) });
    if (building !== 'pin') drawerDist = { i: i, el: v };     /* a pinned card is rebuilt by the shell (cardFor) */
    var I = SC.idx, rl = veil() || !I ? null : routeLink(I.lon[i], I.lat[i]);
    return kv('Jarak dari KCP', rl ? E('span', { class: 'sk-dd-distv' }, v, rl) : v);
  }
  /**
   * The school card (every jenis, v6 D14): eight folds in this order: Siswa, Lokasi (open), Kelas biaya, Kontak &
   * identitas (it absorbs v5's Identitas and Sumber; the register is a real link there), Produk sasaran, Status Mandiri,
   * Tindak lanjut (the editor), Yayasan. The brief feeds the callout; "+ Tindak lanjut" sits in the card head (quick) for
   * every school with an NPSN. o.trail: the kecamatan id when the school was opened inside that kecamatan's card (crumb
   * "‹ Makasar"; the map keeps its focus).
   */
  function schoolModel(i, o) {
    o = o || {};
    var I = SC.idx, fmt = fm();
    if (!I || i == null || i < 0 || i >= I.n) return null;
    var t = I.tni[i] >= 0 ? I.tniRows[I.tni[i]] : null, e = I.ent[i] >= 0 ? I.ents[I.ent[i]] : null;
    var j = jenisOf(i), isSmaRow = j === 'sma';
    var code = codeOf(i), body = [], hints = [];
    var r = distOf(i), dp = distText(r, 'cell'), distShort = dp.km && dp.km !== '—' ? dp.km + (dp.min ? ' · ' + dp.min : '') : '—';
    body.push(studentsBlock(i));
    var kid = X.kec ? X.kec[i] : null, kel = X.kel ? kelName(X.kel[i]) : null;
    var coordB = btn('Salin koordinat', 'copy', function () {
      copy(I.lat[i].toFixed(5) + ', ' + I.lon[i].toFixed(5)).then(function () { ctx.toast('Koordinat disalin'); }, function () { ctx.toast('Fitur salin tidak tersedia di browser ini', 'warn'); });
    }, 'btn--ghost btn--bar');
    coordB.disabled = veil();
    var zoomB = btn('Perbesar ke sekolah', 'target', function () { focusMap(i); }, 'btn--secondary btn--bar');
    body.push(blk('Lokasi', [
      distKv(i),
      kv('Jarak dari Mabes TNI', fmt.km(I.dist[i])),
      kid ? kv('Wilayah', (kel ? 'Kel. ' + kel + ' · ' : '') + 'Kec. ' + kecName(kid)) : null,
      veil() ? null : kv('Koordinat', fmt.coord(I.lat[i], I.lon[i], 5)),
      t && t.address ? kv('Alamat', (t.confidence === 'low' ? '≈ ' : '') + t.address) : null,
      E('div', { class: 'sk-dd-actions' }, zoomB, coordB, kid ? btn('Lihat kecamatan', 'map', function () { showKec(kid); }, 'btn--ghost btn--bar') : null)
    ], null, { id: 'lokasi', preview: distShort, open: true }));
    body.push(tierBlockFor(i));
    body.push(contactBlockFor(i));
    var np = npsnOf(i), pkey = np ? 'npsn:' + np : null;
    body.push(productsBlock(i));
    var stNote = E('p', { class: 'sk-note', text: !V || !V.hasBank ? 'Impor sheet 3_sekolah untuk melihat apakah ' + (isSmaRow ? 'SMA' : 'sekolah') + ' ini nasabah Mandiri.' : veil() ? 'Disamarkan saat berbagi layar.' : V.demo ? 'Sumber: data contoh (ilustrasi)' : 'Sumber: file sekolah cabang, sheet 3_sekolah (hanya di komputer ini)' });
    /* repeated in every school card before the school file: shown once per browser, then under Sumber › Catatan */
    if (!V || !V.hasBank) { hints.push(hintRec('sk-import-status', stNote)); stNote = hintNode('sk-import-status', stNote); }
    var stBlk = blk('Status Mandiri', [
      E('p', { class: 'sk-dd-status' }, chipEl(code, STATUS[code].label)),
      V && V.hasBank && !veil() && V.rel.byRow.get(i) ? kv('Produk yang dimiliki', V.rel.byRow.get(i).products.filter(knownProduct).map(productName).join(' · ') || '—') : null,
      stNote
    ], 'sk-dd--status', { id: 'status', preview: V && V.hasBank ? STATUS[code].label : 'file sekolah belum diimpor', open: false });
    demoTag(stBlk.querySelector('.dd-blk__t'), { inline: true, when: !!(V && V.demo) });
    body.push(stBlk);
    if (pkey) body.push(pipelineEditor(pkey, I.name[i], e ? [e.key] : []));
    else body.push(blk('Tindak lanjut', [E('p', { class: 'sk-note', text: (isSmaRow ? 'SMA' : 'Sekolah') + ' ini tidak memiliki NPSN, sehingga tidak dapat dilacak sendiri. Tambahkan yayasannya.' })], 'sk-dd--pipe', { id: 'pipe', preview: 'tanpa NPSN', open: false }));
    var fb = null;
    if (e) { fb = link(e.label, function () { flyNext = true; ctx.select({ kind: 'smaYay', id: e.i }); }); }
    body.push(blk('Yayasan', [fb || E('p', { class: 'sk-note', text: I.yay[i] || (I.st[i] === 0 ? 'Sekolah negeri, tanpa yayasan.' : 'Nama yayasan belum tercatat di Dapodik.') })],
      null, { id: 'yayasan', preview: e ? e.label : (I.st[i] === 0 ? 'sekolah negeri' : 'belum tercatat'), open: false }));
    /* at most two chips in the card head (§4.4): the jenis symbol, then the Mandiri status with the school file, else the
       kelas biaya chip (the TNI badge stays in "Kontak & identitas"; the star and the eyebrow still say it) */
    var tags = [symLabel(i)];
    if (V && V.hasBank) tags.push(chipEl(code));
    else { var tt = tierOf(i); if (tt) tags.push(tierChipEl(tt)); }
    var gm = veil() ? null : { lat: I.lat[i], lon: I.lon[i] };
    var src = I.src[i] === 1 ? 'Sumber: OpenStreetMap (ODbL) / Overture Maps · diambil 12 Okt 2026' : 'Sumber: Kemendikdasmen Dapodik · diambil 12 Okt 2026';
    return {
      kind: 'sma', key: 'smaSchool:' + i,
      eyebrow: ((t ? JENIS_WORD[j] + ' yayasan TNI' : JENIS_WORD[j]) + ' · ' + typeWord(I.st[i])).toUpperCase(),
      title: I.name[i], tags: tags.filter(Boolean), body: body, gmaps: gm, demo: !!(V && V.hasBank && V.demo),
      prov: src + (sInfo(i) ? ' · ' + STU_SRC.replace('Data siswa: ', 'siswa: ') : '') + (TD() ? ' · kelas biaya: situs resmi sekolah, jenis sekolah dan perkiraan' : '') + (CD() ? ' · kontak: Sekolah Kita (Dapodik), Data Referensi · 18 Okt 2026' : ''),
      provBadge: { src: DAPODIK_LOGO, alt: DAPODIK_ALT, width: 51, height: 24 },
      brief: schoolBrief(i, pkey, distShort, r),
      quick: [pipeQuick(pkey, I.name[i], isSmaRow)],
      crumb: o.trail ? trailCrumb(o.trail) : null,
      anchor: [I.lon[i], I.lat[i]],
      hints: hints
    };
  }
  function tniBadge(t) { return E('span', { class: 'sk-mono-badge is-gold', title: SC.config.matraFull[t.matra], text: 'TNI ' + t.matra }); }
  /**
   * The school brief (callout, phone peek): siswa 17+ (big), siswa and the distance from KCP; chips: the jenis symbol,
   * then the Mandiri status with the school file, else the kelas biaya chip.
   */
  function schoolBrief(i, pkey, distShort, r) {
    var I = SC.idx, si = sInfo(i), fmt = fm(), nums = [], chips = [symLabel(i)];
    var n = stuOf(i);
    if (si && !si.inactive && si.k17 != null) nums.push({ label: 'Siswa 17+', value: k17Words(si, true), big: true, title: K17_LABEL + (si.k17Official ? ' (data resmi)' : ' (perkiraan)') });
    if (n >= 0) nums.push({ label: 'Siswa', value: fmt.int(n), title: si && si.inactive ? 'Kemungkinan tidak aktif' : null });
    else if (si && si.missing) nums.push({ label: 'Siswa', value: '—', title: missingWords(si) });
    /* short values keep the three numbers on one row of the card head; the minutes go into the label
       ("18,3 km" over "± 39 menit dari KCP"), so the callout still says both while the route chip steps aside */
    var dp = distText(r, 'cell');
    nums.push(dp.km && dp.km !== '—' ? { label: dp.min ? dp.min + ' dari KCP' : 'Dari KCP', value: dp.km, title: distShort + '\n' + distTip(r) } : { label: 'Dari KCP', value: '—', title: distTip(r) });
    if (V && V.hasBank) chips.push(chipEl(codeOf(i), STATUS[codeOf(i)].label));
    else { var tt = tierOf(i); if (tt) chips.push(tierChipEl(tt)); }
    /* no main action: "Detail" leads in the callout, and "+ Tindak lanjut" (quick) is the card head button and the
       phone's sticky action, where it turns into "✓ Di tindak lanjut" in place */
    void pkey;
    return { numbers: nums.slice(0, 3), chips: chips.filter(Boolean).slice(0, 2), primary: null, note: null };
  }
  /** "Produk sasaran" (v5 fold; items 26 and 35(a)): who opens what at this school, then the two programmes. */
  function productsBlock(i) {
    var si = sInfo(i), fmt = fm(), est = si && !si.k17Official ? '± ' : '';
    var k17 = si && !si.inactive && si.k17 != null ? si.k17 : null;
    var u17 = k17 != null && si.students != null ? Math.max(0, si.students - k17) : null;
    var sk = jenisOf(i) !== 'sma';
    var kids = [
      kv('Tabungan (Livin’ by Mandiri)', k17 != null ? est + fmt.int(k17) + ' siswa 17+, dengan KTP' : 'Jumlah siswa 17+ belum tersedia'),
      kv('Tabungan SimPel', u17 != null ? est + fmt.int(u17) + ' siswa di bawah 17, bersama orang tua atau wali' : 'Jumlah siswa di bawah 17 belum tersedia'),
      kv('QRIS kantin', 'Livin’ Merchant untuk kantin dan koperasi'),
      kv('Referral Biller 2026', 'Fee untuk yayasan. Penagihan SPP melalui Kopra Mandiri Bill Collection dan Bill Reminder harus berjalan lebih dulu'),
      kv('GEMPITA 2026', 'Fee untuk guru, staf, pekerja kantin dan siswa berusia 17+ yang menjadi KOL'),
      sk ? E('p', { class: 'sk-note', text: 'GEMPITA 2026 berlaku untuk SMA. Cek ketentuan untuk SMK dan MA.' }) : null,
      E('p', { class: 'sk-note', text: 'Satu program per sekolah: keduanya tidak dapat berjalan bersamaan.' })
    ];
    var pv = [k17 != null ? est + fmt.int(k17) + ' siswa 17+' : null, u17 != null ? est + fmt.int(u17) + ' di bawah 17' : null].filter(Boolean).join(' · ');
    return blk('Produk sasaran', kids, 'sk-dd--prod', { id: 'produk', preview: pv || 'Tabungan · SimPel · QRIS kantin', open: false });
  }

  /* ---- "+ Tindak lanjut" (v5, §3.3.4): one click adds the SMA at stage "Belum dihubungi" (MCD.schools.pipeline) */

  function pipeQuick(key, label, isSma) {
    var noKey = isSma === false ? NO_NPSN_SK : NO_NPSN;
    var q = { id: 'pipe', label: '+ Tindak lanjut', title: key ? 'Tambahkan ' + (isSma === false ? 'sekolah' : 'SMA') + ' ini ke daftar tindak lanjut. Tersimpan di komputer ini.' + (pipeSealed() ? ' ' + SC.pipelineLines.sealed : '') : noKey,
      run: function () { return quickAdd(key, label, isSma); }, edit: function () { return editPipe(key); } };
    if (!key) { q.disabled = true; return q; }
    var cur = pipeGet(key);
    if (cur) q.done = doneOf(key, cur);
    return q;
  }
  function pipeSealed() { try { return !!(SC.pipeline && isFn(SC.pipeline.sealed) && SC.pipeline.sealed() && SC.pipeline.persisted()); } catch (e) { return false; } }
  /** "Tersimpan di komputer ini · {tahap}" (sealed: its title says so); in the memory state (§7.6) the line says that
      the list only lasts while the page is open, so the card never claims a save that did not happen. */
  function doneOf(key, entry) {
    var kept = pipePersisted(), ln = kept ? null : pipeLine();
    return { label: '✓ Di tindak lanjut', text: (kept ? 'Tersimpan di komputer ini · ' : 'Hanya selama halaman terbuka · ') + SC.stageLabel(entry && entry.stage),
      title: kept ? (pipeSealed() ? SC.pipelineLines.sealed : null) : (ln && ln.text) || SC.pipelineLines.memory, editLabel: 'Ubah', edit: function () { return editPipe(key); } };
  }
  function savedWords(stage) { return (pipePersisted() ? 'Tersimpan di komputer ini · ' : 'Hanya selama halaman terbuka · ') + SC.stageLabel(stage); }
  /** The storage line of the list (§7.6): null when sealed and ready, else {tone, text, action?}. */
  function pipeLine() { try { return SC && isFn(SC.pipelineLine) ? SC.pipelineLine() : null; } catch (e) { return null; } }
  /** → {ok, text, done?, warn?}: the shell shows text inline (an error in its own words, never a silent failure); in the
      memory state (§7.6) the text is the storage line ("hanya tersimpan selama halaman terbuka", blocked or full). */
  function quickAdd(key, label, isSma) {
    if (!key) return { ok: false, text: isSma === false ? NO_NPSN_SK : NO_NPSN };
    var res = null, P = SC && SC.pipeline;
    try { res = P && isFn(P.quickAdd) ? P.quickAdd(key, label) : (P ? P.set(key, { stage: 'baru' }, { label: label }) : null); } catch (e) { res = null; }
    if (!res || !res.ok) return { ok: false, text: (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' };
    syncPipeEditor(key);
    var d = doneOf(key, res.entry), warn = !pipePersisted(), ln = warn ? pipeLine() : null;
    return { ok: true, text: warn ? (ln && ln.text) || SC.pipelineLines.memory : d.text, done: d, warn: warn };
  }
  /** "Ubah": open the Tindak lanjut fold of the card on screen and put the keyboard in its first field. */
  function editPipe(key) {
    var el = null, rec = pipeEds[key];
    var list = document.querySelectorAll('.sk-dd--pipe') || [];
    for (var k = 0; k < list.length && !el; k++) if (list[k].getAttribute('data-pipe-key') === key && list[k].closest && list[k].closest('.drawer')) el = list[k];
    if (!el && rec && rec.el && rec.el.isConnected) el = rec.el;
    if (!el) return false;
    var t = el.querySelector('.dd-blk__t'), b = t && t.querySelector('[aria-expanded="false"]');
    if (b) b.click();
    var f = el.querySelector('select, input, textarea');
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    return true;
  }
  /** The editor of an SMA added from the card head follows at once ("Simpan", the stage, the line under it). */
  function syncPipeEditor(key) { var rec = pipeEds[key]; if (rec && isFn(rec.sync)) { try { rec.sync(); } catch (e) { /* ignore */ } } }
  /** "‹ Makasar": back to the kecamatan card (its SMA list first); the map keeps the kecamatan in focus. */
  function trailCrumb(kid) {
    var name = kecName(kid);
    return { id: String(kid), label: name, title: 'Kembali ke Kecamatan ' + name, run: function () { openKec(String(kid)); } };
  }
  /**
   * The kecamatan a school selection belongs to as a trail: extra.trail (opened from the kecamatan card), or, with
   * MCD.windows, a school picked on the map inside the kecamatan the map is focused on (§3.3.3).
   */
  function trailOf(sel) {
    if (!sel || sel.kind !== 'smaSchool') return null;
    if (sel.extra && sel.extra.trail) return String(sel.extra.trail);
    if (!WS() || !X.kec) return null;
    var kid = X.kec[+sel.id], f = focusedKec();
    return kid && f && String(f) === String(kid) ? String(kid) : null;
  }
  function productName(p) { return (SC.config.products.filter(function (x) { return x.id === p; })[0] || {}).short || p; }
  /** Products still in scope (an older pipeline entry may name one that left the dashboard on 15 Oct 2026). */
  function knownProduct(p) { return SC.config.products.some(function (x) { return x.id === p; }); }

  function yayAgg(e) {
    if (!V) return null;
    var a = V.entMap.get(e);
    if (a) return a;
    // not in view: aggregate over every SMA row of the yayasan
    var I = SC.idx, rows = X.rows.filter(function (i) { var si = sInfo(i); return I.ent[i] === e && X.cls[i] === 1 && !(si && (si.duplicate || si.inactive)); });
    if (!rows.length) return null;
    var E0 = I.ents[e], b = { e: e, key: E0.key, label: E0.label, tni: E0.tni, kind: E0.kind, npyp: E0.npyp, netLabel: E0.netLabel, competitors: E0.competitors || [], inferred: E0.inferred, n: rows.length, core: 0, jen: [0, 0, 0, rows.length, 0, 0, 0], students: 0, studentsN: 0, dmin: Infinity, dmax: 0, rows: rows, outside: true };
    rows.forEach(function (i) { var n = stuOf(i); if (n >= 0) { b.students += n; b.studentsN++; } b.dmin = Math.min(b.dmin, I.dist[i]); b.dmax = Math.max(b.dmax, I.dist[i]); if (I.dist[i] <= 15) b.core++; });
    var sc = SC.score(b); b.score = sc.score; b.parts = sc.parts; b.fit = SC.fit(b);
    return b;
  }
  function yayModel(e) {
    var I = SC.idx, fmt = fm();
    if (!I || !I.ents[e]) return null;
    var E0 = I.ents[e], a = yayAgg(e);
    if (!a) return null;
    var body = [];
    if (V && V.hasBank) {
      var code = a.outside ? 4 : yayStatus(a);
      var mb = blk('Status Mandiri', veil() ? [E('p', { class: 'sk-note', text: 'Disamarkan saat berbagi layar.' })] : [
        E('p', { class: 'sk-dd-status' }, chipEl(code, code === 2 ? 'Nasabah Mandiri' : STATUS[code].label)),
        kv('Produk yang dimiliki', Object.keys(a.held || {}).filter(knownProduct).map(productName).join(' · ') || '—'),
        kv('SMA nasabah Mandiri', fmt.int(a.cust || 0) + ' dari ' + fmt.int(a.n)),
        E('p', { class: 'sk-note', text: V.demo ? 'Sumber: data contoh (ilustrasi)' : 'Sumber: file sekolah cabang, sheet 3_sekolah (hanya di komputer ini)' })
      ], 'sk-dd--status');
      demoTag(mb.querySelector('.dd-blk__t'), { inline: true, when: V.demo });
      body.push(mb);
    }
    body.push(blk(a.outside ? 'SMA (tidak ada yang tampil)' : 'SMA yang tampil', [
      kv('SMA', fmt.int(a.n) + ' · ' + fmt.int(a.core) + ' dalam 15 km'),
      kv('Siswa tercatat', a.studentsN ? fmt.int(a.students) + ' dari ' + count(a.studentsN, 'SMA') : 'Jumlah siswa belum tersedia'),
      kv('Jarak dari Mabes TNI', fmt.km(a.dmin) + (a.dmax > a.dmin + 0.05 ? ' sampai ' + fmt.km(a.dmax) : '')),
      kv('Skor (asumsi)', fmt.num(a.score, 1) + ' · ukuran ' + fmt.num(a.parts.size, 1) + ' · jangkauan ' + fmt.num(a.parts.reach, 1) + ' · jarak ' + fmt.num(a.parts.prox, 1) + ' · TNI ' + fmt.num(a.parts.tni, 1)),
      E0.n > a.n ? E('p', { class: 'sk-note', text: 'Juga mengelola ' + count(E0.n - a.n, 'sekolah') + ' jenjang lain atau di luar filter (tidak dihitung di sini).' }) : null
    ]));
    if (E0.foundation) {
      var org = SC.config.foundationOrg[E0.foundation];
      body.push(blk('Yayasan TNI', [
        org ? kv('Bersama', org.org) : null,
        kv('Registrasi', E0.npyp ? 'NPYP ' + E0.npyp + (E0.branch ? ' · ' + E0.branch : '') : 'Cabang belum tercatat (perkiraan dari nama sekolah)'),
        E('p', { class: 'sk-note', text: SC.config.bankingKnown[E0.foundation] || 'Tidak ada sumber publik yang menyebut bank penagih SPP sekolah ini.' })
      ]));
    }
    if ((E0.competitors || []).length) body.push(blk('Tanda dari bank lain', E0.competitors.map(function (c) { return E('p', { class: 'sk-sig' }, E('span', { class: 'sk-tag', text: c.tag }), E('span', { text: c.text + ' (' + c.src + ')' })); })));
    var fitRows = E('div', { class: 'sk-fitlist' });
    SC.config.products.forEach(function (p) {
      var f = a.fit[p.id], held = !!(V && V.hasBank && !veil() && a.held && a.held[p.id]);
      fitRows.appendChild(E('div', { class: 'sk-fitlist__row' }, E('span', { class: 'sk-fitlist__k', text: p.label }),
        E('span', { class: 'sk-fitlist__v' + (held ? ' is-held' : '') }, held ? 'Dimiliki' : SC.fitLabel(f.v)),
        null));
    });
    body.push(blk('Kecocokan produk (asumsi)', [fitRows]));
    var calcIn = Object.assign({}, st.calc);
    if (a.studentsN) calcIn.siswa = a.students;
    var o = SC.calc(calcIn);
    body.push(blk('Potensi bisnis (skenario)', [
      kv('Dana tabungan dan giro (CASA, estimasi)', o.casa == null ? '—' : fmt.rp(o.casa)),
      kv('Fee Referral Biller untuk yayasan', o.refFee == null ? '—' : fmt.rp(o.refFee) + ' · ' + count(o.tabAcc, 'rekening')),
      E('p', { class: 'sk-note', text: 'Dihitung dari jumlah siswa SMA yayasan ini yang tercatat, dengan asumsi kalkulator lainnya.' }),
      btn('Buka di kalkulator', 'chev-r', function () { st.calcTarget = E0.key; if (a.studentsN) st.calc.siswa = a.students; saveCalc(); ctx.closeDrawer(); goTab('prog'); }, 'btn--secondary btn--bar')
    ]));
    body.push(pipelineEditor(E0.key, E0.label, a.rows.filter(function (i) { return I.npsn[i]; }).map(function (i) { return 'npsn:' + I.npsn[i]; })));
    var list = E('div', { class: 'sk-dd-list' });
    a.rows.slice().sort(function (x, y) { return I.dist[x] - I.dist[y]; }).slice(0, 40).forEach(function (i) {
      var b = E('button', { type: 'button', class: 'dd-list__row sk-dd-row' + (V && V.hasBank ? ' has-st' : '') }, V && V.hasBank ? chipEl(codeOf(i)) : null,
        E('span', { class: 'dd-list__name', text: I.name[i] }),
        E('span', { class: 'dd-list__meta', text: distText(distOf(i)) + (stuOf(i) >= 0 ? ' · ' + count(stuOf(i), 'siswa') : '') + (k17Num(i) != null ? ' · ' + k17Words(sInfo(i), true) + ' siswa 17+' : '') }));
      b.addEventListener('click', function () { flyNext = true; ctx.select({ kind: 'smaSchool', id: i }); });
      list.appendChild(b);
    });
    body.push(blk('SMA', [list]));
    var exp = guard(btn('Ekspor yayasan ini (CSV)', 'download', function () {
      if (exportBlocked()) return;
      var csv = SC.leadsCsv(SC.idx, { rows: Int32Array.from(a.rows) }, V ? V.rel : null, { grain: 'entity', list: [a] });
      download('sma-yayasan-lead_' + E0.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '_' + ymd(today()) + '.csv', csv);
    }, 'btn--ghost btn--bar'));
    body.push(E('div', { class: 'sk-dd-actions' }, btn('Tampilkan di peta', 'target', function () { fitRows(a.rows); }, 'btn--secondary btn--bar'), exp));
    var tags = [];
    if (E0.tni) tags.push(E('span', { class: 'sk-mono-badge is-gold', title: SC.config.matraFull[E0.tni], text: 'TNI ' + E0.tni }));
    if (E0.inferred) tags.push(E('span', { class: 'tag tag--asumsi', text: 'perkiraan' }));
    var yb = bbox(a.rows.map(function (ri) { return [I.lon[ri], I.lat[ri]]; }));
    return {
      kind: 'yay', key: 'smaYay:' + e,
      eyebrow: (E0.kind === 'npyp' ? 'Yayasan TNI · NPYP ' + E0.npyp : E0.kind === 'tni' ? 'Yayasan TNI' : 'Yayasan · Dapodik').toUpperCase(),
      title: E0.label, tags: tags, body: body, demo: !!(V && V.hasBank && V.demo),
      prov: E0.kind === 'dapodik' ? 'Sumber: Kemendikdasmen Dapodik 2026/2027 Gasal · diambil 12 Okt 2026' : SRC_TNI,
      /* v5 brief: SMA, siswa and the score (an assumption); the card itself keeps every figure */
      brief: { numbers: [
        { label: 'SMA', value: fmt.int(a.n), big: true, title: fmt.int(a.n) + ' SMA · ' + fmt.int(a.core) + ' dalam 15 km' },
        { label: 'Siswa', value: a.studentsN ? fmt.int(a.students) : '—', title: a.studentsN ? 'Siswa tercatat di ' + count(a.studentsN, 'SMA') : 'Jumlah siswa belum tersedia' },
        { label: 'Skor (asumsi)', value: fmt.num(a.score, 1) }
      ], chips: tags.slice(0, 2).map(function (n) { return n.cloneNode(true); }), primary: null, note: null },
      anchor: yb ? (yb[0][0] === yb[1][0] && yb[0][1] === yb[1][1] ? yb[0] : { bbox: yb, label: [(yb[0][0] + yb[1][0]) / 2, (yb[0][1] + yb[1][1]) / 2] }) : null,
      hints: []
    };
  }

  /**
   * The kecamatan card. v5 (item 43, §3.3.4): "Lihat SMA di kecamatan ini" opens it with the list first and open:
   * "SMA di {kecamatan}, siswa 17+ terbanyak", every SMA ranked by siswa 17+ (ties: time from KCP), at most 60 rows,
   * then "Lihat semua di daftar"; the kecamatan numbers fold under "Angka kecamatan · 9 SMA · 3.526 siswa 17+".
   * o.listFirst === false (the callout's "Detail"): the numbers first. A row opens its school in the same card
   * ({kind: 'smaSchool', id, extra: {trail: kecamatanId}}), so the map keeps the kecamatan in focus.
   */
  function kecModel(id, o) {
    o = o || {};
    if (!V || !SC.idx) return null;
    var a = V.kec[id], I = SC.idx, fmt = fm();
    var name = kecName(id), k = kecIndex()[id], listFirst = o.listFirst !== false, hints = [];
    if (!a) a = newKecAgg(id);
    var nn = nounOf();
    var figs = [kv(Noun() + ' dalam ' + st.f.km + ' km', fmt.int(a.n) + (a.n ? ' · ' + fmt.int(a.priv) + ' swasta, ' + fmt.int(a.pub) + ' negeri' + (a.unk ? ', ' + fmt.int(a.unk) + ' belum diketahui' : '') : '')),
      a.n && !onlySma() ? kv('Menurut jenis', splitWords({ sma: { n: a.nJ.sma }, smk: { n: a.nJ.smk }, ma: { n: a.nJ.ma } })) : null,
      a.nAll > a.n ? kv('Semua ' + nn + ' di kecamatan ini', fmt.int(a.nAll)) : null,
      a.tni ? kv(Noun() + ' yayasan TNI', fmt.int(a.tni)) : null,
      kv('Siswa', a.stuN ? fmt.int(a.stu) + ' di ' + count(a.stuN, 'SMA') : 'Jumlah siswa belum tersedia'),
      V.students && a.stuN ? kv(K17_LABEL, (a.k17Est ? '± ' : '') + fmt.int(a.k17) + (a.k17Est ? ' (sebagian perkiraan)' : ' (data resmi)')) : null,
      V.students && a.u17N ? kv(U17_LABEL, (a.k17Est ? '± ' : '') + fmt.int(a.u17) + (a.k17Est ? ' (sebagian perkiraan)' : ' (data resmi)')) : null,
      a.inactive ? kv('Kemungkinan tidak aktif', count(a.inactive, nn) + ', tidak dihitung') : null,
      kv('Jarak dari Mabes TNI', k && isNum(k.distKm) ? fmt.km(k.distKm) : (a && isNum(a.dist) ? fmt.km(a.dist) : '—'))];
    if (V.hasBank) {
      figs.unshift(E('p', { class: 'sk-dd-status' }, toneChip(a.n ? BAND_TONE[a.band3 || 'noData'] : 'none', a.n ? fmt.pct(a.cov, 0) + ' ' + nn + '-nya nasabah Mandiri' : 'Tidak ada ' + nn)));
      if (a.n && kecThird(a)) figs.splice(1, 0, kv('Urutan', kecThird(a)));
      figs.push(kv('Status', fmt.int(a.cust) + ' nasabah · ' + fmt.int(a.pros) + ' prospek · ' + fmt.int(a.none) + ' tanpa data'));
    }
    figs.push(E('div', { class: 'sk-dd-actions' }, btn('Perbesar ke kecamatan', 'target', function () { zoomKec(id); }, 'btn--secondary btn--bar')));
    var fb = blk('Angka kecamatan', figs, V.hasBank ? 'sk-dd--status' : null,
      { id: 'angka', preview: count(a.n, nn) + (V.students && a.stuN ? ' · ' + (a.k17Est ? '± ' : '') + fmt.int(a.k17) + ' siswa 17+' : ''), open: !listFirst });
    demoTag(fb.querySelector('.dd-blk__t'), { inline: true, when: V.demo });
    /* every SMA of the kecamatan within the distance, siswa 17+ first (the official age count, else the estimate) */
    var rows = kecRanked(a), list = E('div', { class: 'sk-dd-list sk-kl', role: 'list', aria: { label: Noun() + ' di ' + name } });
    rows.slice(0, KL_MAX).forEach(function (i) { list.appendChild(E('div', { role: 'listitem', class: 'sk-kl__li' }, kecRow(i, id))); });
    var est = rows.some(function (i) { var s = sInfo(i); return !!(s && s.k17 != null && !s.k17Official); });
    var estNote = est ? E('p', { class: 'sk-note', text: 'Angka dengan ± adalah perkiraan.' }) : null;
    if (estNote) { hints.push(hintRec('sk-estimate', estNote)); estNote = hintNode('sk-estimate', estNote); }
    var more = link('Lihat semua di daftar', function () { goTab('kec'); }, 'sk-kl__more');
    more.title = 'Buka tab Kecamatan di Daftar & grafik';
    /* v6 (§3.5): an empty kecamatan says the scope; at 15 km a link switches to 30 km */
    var empty = E('p', { class: 'sk-note' }, 'Tidak ada ' + nn + ' dalam ' + st.f.km + ' km di kecamatan ini.' + (filtersActive() ? ' Hapus salah satu filter.' : ''),
      st.f.km <= 15 ? E('span', {}, ' ', link('Pilih 30 km untuk melihat lebih banyak.', function () { setScope(30); if (ctx) openKec(id); })) : null);
    var lb = blk(Noun() + ' di ' + name + ', siswa 17+ terbanyak', [
      rows.length ? list : empty,
      rows.length > KL_MAX ? E('p', { class: 'sk-note', text: '+' + (rows.length - KL_MAX) + ' lainnya. Perbesar peta untuk melihat setiap ' + nn + '.' }) : null,
      estNote, E('p', { class: 'sk-kl__foot' }, more)
    ], 'sk-dd--klist', { id: 'daftar', preview: count(rows.length, nn), open: true });
    /* list first: the list is the card, never folded (phones fold every .dd-blk of a new card until "Semua detail");
       numbers first ("Detail"): it is one more fold under the numbers */
    if (listFirst) { lb.classList.remove('dd-blk'); lb.classList.add('sk-kl-blk'); }
    var body = listFirst ? [lb, fb] : [fb, lb];
    var kb = kecBrief(id);
    if (kb && listFirst) kb.primary = null;     /* the list is on screen already: no "Lihat SMA di kecamatan ini" again */
    var kota = k && k.kotaName ? k.kotaName : (a && a.kota) || '';
    return { kind: 'kec', key: 'kec:' + id, eyebrow: ('Kecamatan' + (kota ? ' · ' + kota : '')).toUpperCase(), title: name, body: body,
      gmaps: { q: kecQuery(id) }, demo: !!(V.hasBank && V.demo), listFirst: listFirst,
      prov: SRC_SCHOOLS + '; ' + SRC_AREAS + (V.students ? ' · ' + STU_SRC.replace('Data siswa: ', 'siswa: ') : ''),
      brief: kb, anchor: kecAnchor(id), hints: hints };
  }
  /** The SMA of a kecamatan for its card: siswa 17+ first (none last), then the time from KCP, then Mabes TNI. */
  function kecRanked(a) {
    var I = SC.idx;
    return a.rows.slice().sort(function (x, y) {
      var kx = k17Num(x), ky = k17Num(y);
      if ((kx == null) !== (ky == null)) return kx == null ? 1 : -1;
      return ((ky || 0) - (kx || 0)) || (distSortVal(x) - distSortVal(y)) || (I.dist[x] - I.dist[y]);
    });
  }
  /** One row of the kecamatan card: symbol, name, "504 siswa 17+ · 18,3 km · ± 39 menit", the status chip with the school file. */
  function kecRow(i, kid) {
    var I = SC.idx, si = sInfo(i), r = distOf(i), dp = distText(r, 'cell'), parts = [];
    if (si && si.inactive) parts.push('kemungkinan tidak aktif');
    else if (si && si.k17 != null) parts.push(k17Words(si, true) + ' siswa 17+');
    else if (stuOf(i) >= 0) parts.push(count(stuOf(i), 'siswa'));
    if (dp.km && dp.km !== '—') parts.push(dp.km + (dp.min ? ' · ' + dp.min : ''));
    var b = E('button', { type: 'button', class: 'dd-list__row sk-dd-row sk-kl__row has-sym' + (V.hasBank ? ' has-chip' : '') }, symChip(i),
      E('span', { class: 'dd-list__name', text: I.name[i] + (I.tni[i] >= 0 ? ' · TNI' : '') }),
      E('span', { class: 'dd-list__meta', text: parts.join(' · '), title: distTip(r) }),
      V.hasBank ? chipEl(codeOf(i)) : null);
    b.title = 'Buka ' + I.name[i] + ' di kartu ini';
    b.addEventListener('click', function () { openInTrail(i, kid); });
    return b;
  }
  /**
   * A school from the kecamatan card opens in the same card with the crumb "‹ {kecamatan}" (selection extra.trail):
   * the map keeps the kecamatan in focus and draws the route, the camera stays (v5). Without MCD.windows the older
   * drawer has no trail, so the camera flies to the school as before.
   */
  function openInTrail(i, kid) {
    if (!ctx) return;
    flyNext = !WS();
    ctx.select({ kind: 'smaSchool', id: i, extra: { trail: String(kid) } });
  }
  /**
   * Open a kecamatan through the shared selection: {kind: 'smaKec', id, extra: {kecamatanId}} (id = admin-areas
   * kecamatan id; MCD.state keeps kind, id and extra). map.js enters the kecamatan focus mode for it (item 38) and flies the camera itself; until it
   * recognises the kind, ensureKecFocus asks MCD.map.focusArea once the drawer is open.
   */
  function openKec(id) { flyNext = false; if (ctx) ctx.select({ kind: 'smaKec', id: id, extra: { kecamatanId: id } }); }
  /** v5: the kecamatan callout's "Detail": the same card with the numbers first (extra.first, kept by MCD.state). */
  function openKecNums(id) { flyNext = false; if (ctx) ctx.select({ kind: 'smaKec', id: id, extra: { kecamatanId: id, first: 'angka' } }); }
  /** Highlight and open a kecamatan from a chart, a list or a drawer. With the map's focus mode the camera is
      left to the map (no second flight); without it the outline is fitted here, as before. */
  function showKec(id) {
    if (!id) return;
    selectKec(id, { fit: !mapFocusMode() });
    openKec(id);
  }
  function mapFocusMode() { var M = MCD.map; return !!(M && isFn(M.focusArea)); }
  /** "Perbesar ke kecamatan" in its drawer: in focus mode the map fits it again in the free area (beside the drawer),
      one flight; otherwise the outline is fitted here. */
  function zoomKec(id) {
    if (!id) return;
    var refit = false;
    if (mapFocusMode() && focusedKec() === String(id)) {
      try { refit = MCD.map.focusArea({ kind: 'kecamatan', id: String(id), refit: true }) !== false; } catch (e) { refit = false; }
    }
    selectKec(id, { fit: !refit });
  }
  /** The kecamatan id the map is focused on, when map.js tells (several shapes are accepted), else undefined. */
  function focusedKec() {
    var M = MCD.map, f;
    if (!M) return undefined;
    try {
      if (isFn(M.focusState)) f = M.focusState();
      else if (isFn(M.focused)) f = M.focused();
      else if (isFn(M.snapshot)) { var sn = M.snapshot(); f = sn ? (sn.focusArea !== undefined ? sn.focusArea : sn.focus) : undefined; }
      else return undefined;
    } catch (e) { return undefined; }
    if (f === undefined) return undefined;
    if (!f) return null;
    if (typeof f !== 'object') return String(f);
    /* MCD.map.focusState() → {id, phase, …}: a focus on its way out ('exit', 'off') no longer counts */
    return f.id != null && f.phase !== 'exit' && f.phase !== 'off' ? String(f.id) : null;
  }
  var ownFocus = null;
  /** Focus mode for a kecamatan opened here, when map.js has not entered it by itself (asked once). */
  function ensureKecFocus(id) {
    if (!mapFocusMode() || !id) return;
    var cur = focusedKec();
    if (cur === String(id)) return;
    try { if (MCD.map.focusArea({ kind: 'kecamatan', id: String(id) }) !== false) ownFocus = String(id); } catch (e) { /* the map keeps its view */ }
  }
  /** Leave the focus mode this section asked for (the drawer closed or the section left). */
  function dropOwnFocus(id) {
    if (!ownFocus || (id != null && String(id) !== ownFocus)) return;
    var M = MCD.map, cur = focusedKec(), mine = ownFocus;
    ownFocus = null;
    /* only the focus this section asked for: never one that staff opened since (another kecamatan, the popup) */
    if (M && isFn(M.clearFocus) && (cur === undefined || cur === mine)) { try { M.clearFocus(); } catch (e) { /* ignore */ } }
  }

  function pipelineEditor(key, label, related) {
    var cur0 = pipeGet(key) || {};
    var stage = E('select', { class: 'select', aria: { label: 'Tahap' } }, SC.config.stages.map(function (s) { return E('option', { value: s.id, text: s.label }); }));
    stage.value = cur0.stage || 'baru';
    var ownerIn = E('input', { class: 'input', type: 'text', maxlength: 60, placeholder: 'Kode atau nama staf', value: cur0.owner || '', aria: { label: 'Penanggung jawab' } });
    var prog = E('select', { class: 'select', aria: { label: 'Program' } }, SC.config.pipePrograms.map(function (p) { return E('option', { value: p.id, text: p.label }); }));
    prog.value = cur0.program || '';
    var prods = E('div', { class: 'sk-checks', role: 'group', aria: { label: 'Produk sasaran' } });
    var boxes = SC.config.products.map(function (p) {
      var cb = E('input', { type: 'checkbox', value: p.id });
      cb.checked = (cur0.products || []).indexOf(p.id) >= 0;
      prods.appendChild(E('label', { class: 'sk-check' }, cb, E('span', { text: p.short })));
      return cb;
    });
    var next = E('input', { class: 'input', type: 'text', maxlength: 120, placeholder: 'Langkah berikutnya', value: cur0.nextStep || '', aria: { label: 'Langkah berikutnya' } });
    var nextDate = E('input', { class: 'input', type: 'date', value: cur0.nextDate || '', aria: { label: 'Tanggal langkah berikutnya' } });
    var last = E('input', { class: 'input', type: 'date', value: cur0.lastContact || '', aria: { label: 'Kontak terakhir' } });
    var note = E('textarea', { class: 'input sk-ta', maxlength: 500, rows: 3, placeholder: NOTE_PLACEHOLDER, aria: { label: 'Catatan' } });
    note.value = cur0.note || '';
    var msg = E('p', { class: 'sk-pmsg', aria: { live: 'polite' } });
    var save = btn(pipeGet(key) ? 'Simpan' : 'Tambahkan ke tindak lanjut', 'check', function () {
      var res = pipeSet(key, {
        stage: stage.value, owner: ownerIn.value, program: prog.value, nextStep: next.value, nextDate: nextDate.value, lastContact: last.value, note: note.value,
        products: boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; })
      }, { label: label, relatedKeys: uniq(related || []) });
      msg.textContent = res.ok ? savedWords(res.entry.stage) : res.error;
      msg.classList.toggle('is-warn', !res.ok);
      if (res.ok) { var t = save.querySelector('span'); if (t) t.textContent = 'Simpan'; refresh(['pipeline']); }
    }, 'btn--primary btn--bar');
    var rm = btn('Hapus', 'close', function () { try { SC.pipeline.remove(key); } catch (e) { /* ignore */ } msg.textContent = 'Dihapus dari daftar tindak lanjut'; refresh(['pipeline']); }, 'btn--ghost btn--bar');
    function f(lbl, ctl) { return E('label', { class: 'sk-pf' }, E('span', { class: 'sk-pf__l', text: lbl }), ctl); }
    var acts = E('div', { class: 'sk-dd-actions' }, save, pipeGet(key) ? rm : null);
    var block = blk('Tindak lanjut (hanya di komputer ini)', [
      E('div', { class: 'sk-pgrid' }, f('Tahap', stage), f('Penanggung jawab', ownerIn), f('Program', prog), f('Tanggal langkah berikutnya', nextDate), f('Kontak terakhir', last)),
      f('Langkah berikutnya', next), E('div', { class: 'sk-pf' }, E('span', { class: 'sk-pf__l', text: 'Produk sasaran' }), prods),
      f('Catatan', note), E('p', { class: 'sk-hint', text: 'Jangan mengisi data pribadi siswa, guru atau orang tua, atau data rekening.' }),
      msg, acts
    ], 'sk-dd--pipe', { id: 'pipe', preview: cur0.stage ? SC.stageLabel(cur0.stage) : 'belum ada', open: false });
    block.setAttribute('data-pipe-key', key);
    /* v5: "+ Tindak lanjut" in the card head adds the entry; this editor then reads "Simpan" with the stage at once */
    if (building !== 'pin') pipeEds[key] = { el: block, sync: function () {
      var c = pipeGet(key);
      if (!c) return;
      stage.value = c.stage || 'baru';
      var t = save.querySelector('span');
      if (t) t.textContent = 'Simpan';
      if (!rm.parentNode) acts.appendChild(rm);
      msg.textContent = savedWords(c.stage);
      msg.classList.remove('is-warn');
    } };
    return block;
  }

  /* ---- "?" for students aged 17+: the method in plain words and the editable per-grade shares (item 26) */

  function pctIn(x) { return isNum(x) ? String(Math.round(x * 1000) / 10) : ''; }
  function sharesEditor(S0) {
    var fmt = fm(), cur = S0.shares(), def = S0.defaults(), inputs = {};
    var total = E('p', { class: 'sk-shares__total', aria: { live: 'polite' } });
    function renderTotal() {
      var t = S0.totals();
      setLines(total, 'Siswa 17+ di SMA dalam 15 km: ' + fmt.int(t.k17) + '.\n' + fmt.int(t.k17Official) + ' dari data resmi umur, ± ' + fmt.int(t.k17Est) + ' perkiraan dari ' + count(t.estSchools, 'SMA') + '.');
    }
    var grid = E('div', { class: 'sk-shares' });
    [['k10', 'Kelas 10'], ['k11', 'Kelas 11'], ['k12', 'Kelas 12']].forEach(function (d) {
      var id = 'sk-share-' + d[0];
      var inp = E('input', { class: 'input input--num sk-shares__in', type: 'number', inputmode: 'decimal', min: 0, max: 100, step: 0.1, id: id, value: pctIn(cur[d[0]]), aria: { describedby: 'sk-share-hint' } });
      var err = E('span', { class: 'sk-calc__err' });
      inp.addEventListener('input', debounce(function () {
        var raw = inp.value.trim().replace(',', '.'), v = raw === '' ? NaN : Number(raw);
        var bad = !isFinite(v) || v < 0 || v > 100;
        inp.classList.toggle('is-invalid', bad);
        err.textContent = bad ? 'Isi angka dari 0 sampai 100.' : '';
        if (bad) return;
        var patch = {};
        patch[d[0]] = v / 100;
        S0.setShares(patch);
        renderTotal();
      }, 250));
      inputs[d[0]] = inp;
      grid.appendChild(E('div', { class: 'sk-shares__f' },
        E('label', { class: 'sk-shares__l', for: id, text: d[1] }),
        E('span', { class: 'sk-calc__ctl' }, inp, E('span', { class: 'sk-calc__unit', text: '%' })), err));
    });
    var reset = btn('Kembalikan angka bawaan', 'reset', function () {
      S0.resetShares();
      var d2 = S0.shares();
      Object.keys(inputs).forEach(function (k) { inputs[k].value = pctIn(d2[k]); inputs[k].classList.remove('is-invalid'); });
      renderTotal();
    }, 'btn--ghost btn--bar');
    renderTotal();
    return blk('Porsi siswa berusia 17+ per kelas (asumsi)', [grid,
      E('p', { class: 'sk-hint', id: 'sk-share-hint', text: 'Asumsi. Sebagian besar siswa kelas 12 telah berusia 17 tahun.\nPorsi ini hanya mengubah ' + count(S0.estimatedSchools(), 'SMA') + ' tanpa data umur resmi.\nAngka bawaan dari tabel umur Dapodik: kelas 10 ' + fmt.pct(def.k10, 1) + ', kelas 11 ' + fmt.pct(def.k11, 1) + ', kelas 12 ' + fmt.pct(def.k12, 1) + '.' }),
      total, E('div', { class: 'sk-dd-actions' }, reset)], 'sk-dd--shares');
  }
  function openMethod() {
    if (!ctx) return;
    var S0 = SS(), body = [];
    function ul(lines) { return E('ul', { class: 'sk-bul' }, lines.map(function (t) { return E('li', { text: t }); })); }
    drawerSel = null;
    drawerDist = null;
    body.push(blk('Arti siswa 17+', [ul([
      'Siswa 17+ adalah siswa SMA yang berusia 17 tahun atau lebih.',
      'Pada usia ini siswa wajib memiliki KTP-el, sehingga dapat membuka rekening sendiri.',
      'Sebagian siswa mungkin belum merekam KTP-el di Dukcapil.',
      'Sekolah internasional (SPK) dapat memiliki siswa WNA yang tidak memiliki KTP-el.'
    ])]));
    body.push(blk('Siswa di bawah 17 tahun', [ul([
      'Angka ini adalah siswa dikurangi siswa 17+, per SMA dan per kecamatan.',
      'Mereka membuka Tabungan SimPel bersama orang tua atau wali.',
      'Jika siswa 17+ di sekolah itu perkiraan, angka ini juga perkiraan.'
    ])]));
    body.push(blk('Cara menghitung', [ul([
      'Data resmi: jumlah siswa menurut umur dari Dapodik, per sekolah.',
      'Perkiraan: siswa per kelas dikali porsi siswa 17+ di kelas itu.',
      'Perkiraan hanya digunakan untuk sekolah tanpa data umur resmi.',
      'Sekolah dengan 0 siswa ditandai kemungkinan tidak aktif dan tidak dihitung.',
      'Titik sekolah ganda disembunyikan agar siswanya tidak terhitung dua kali.'
    ])]));
    if (S0) body.push(sharesEditor(S0));
    else body.push(E('p', { class: 'sk-note', text: SC.studentsFailed ? 'Data siswa tidak dapat dimuat. Muat ulang halaman.' : 'Data siswa sedang dimuat. Buka lagi sebentar lagi.' }));
    body.push(E('p', { class: 'sk-note', text: STU_SRC + '.\nHanya angka per sekolah, tanpa data pribadi siswa.' }));
    ctx.openDrawer({ eyebrow: 'SEKOLAH (SMA)', title: 'Cara menghitung siswa 17+', body: body,
      prov: 'Sumber: Dapodik (Kemendikdasmen), semester 2026/2027 Ganjil · wajib KTP-el sejak 17 tahun: UU 24/2013 Pasal 63' });
    staggerDrawer({ body: body });
  }

  /* ---- focus one school (lists, cards, kecamatan drawer, Ringkasan through 'focus:sma:<id>') */

  /** Fly to the school at zoom 16. With MCD.map.focusPoint and pick = true the map reports the pick once the
      camera has arrived, and that pick opens the drawer (returns true); otherwise the caller opens it. */
  function focusMap(i, pick) {
    var I = SC.idx, Mp = MCD.map;
    if (!I || !Mp) return false;
    var o = { lon: I.lon[i], lat: I.lat[i], zoom: 16 };
    if (pick) { o.kind = 'smaSchool'; o.id = i; }
    if (isFn(Mp.focusPoint)) { try { if (Mp.focusPoint(o) !== false) return !!pick; } catch (e) { /* flyTo below */ } }
    if (isFn(Mp.flyTo)) Mp.flyTo({ center: [o.lon, o.lat], zoom: o.zoom });
    return false;
  }
  /** Widen the distance and drop the filters that would hide this school, so its symbol is on the map. */
  function ensureVisible(i) {
    var I = SC.idx, j = jenisOf(i), patch = {};
    if (j === 'ma' && !st.show.ma) setShow({ ma: true });
    if (j === 'smk' && !st.show.smk) setShow({ smk: true });
    if (j === 'sma' && st.show.sma === false) setShow({ sma: true });
    /* v6: the scope widens to 30 km for a school beyond 15 km (stored, as a staff choice would be) */
    if (I.dist[i] > st.f.km) { if (I.dist[i] > 15) setScope(30, { camera: false }); else patch.km = 15; }
    if ((st.f.type === 'private' && I.st[i] !== 1) || (st.f.type === 'public' && I.st[i] !== 0)) patch.type = 'all';
    if (st.f.tni && I.tni[i] < 0) patch.tni = false;
    if (st.f.inf && I.inf[i]) patch.inf = false;
    var tk = st.f.tiers ? tierKey(i) : null;
    if (tk && st.f.tiers.indexOf(tk) < 0) patch.tiers = null;
    if (Object.keys(patch).length) setF(patch, { camera: false });
  }
  function focusRow(i, c) {
    var cx = c || ctx;
    if (!cx || !SC.idx || i == null || i < 0 || i >= SC.idx.n) return false;
    if (!c) ensureVisible(i);
    flyNext = false;
    if (!focusMap(i, true)) cx.select({ kind: 'smaSchool', id: i });
    return true;
  }
  /** The school row for an id: an NPSN (of the student file first, then of the school list), else a row index. */
  function focusTarget(id) {
    var I = SC.idx;
    if (!I || id == null) return -1;
    var s = String(id).trim(), S0 = SS(), row = -1;
    if (S0 && /^\d{6,}$/.test(s)) {
      var D = S0.data(), rec = null;
      for (var k = 0; k < D.schools.length && !rec; k++) if (String(D.schools[k].npsn || '') === s && !S0.isDuplicate(D.schools[k])) rec = D.schools[k];
      if (rec) row = S0.rowOf(I, rec);
    }
    if (row < 0 && /^\d{8}$/.test(s) && I.npsnIndex.has(s)) row = I.npsnIndex.get(s);
    if (row < 0 && /^\d{1,7}$/.test(s) && +s < I.n) row = +s;
    if (row < 0) return -1;
    /* a hidden duplicate point: the school it duplicates */
    var si = sInfo(row);
    if (si && si.duplicate) { var dup = si.duplicateOf && I.npsnIndex.has(String(si.duplicateOf)) ? I.npsnIndex.get(String(si.duplicateOf)) : -1; return dup; }
    return row;
  }
  var pendingFocus = null;
  function requestFocus(id) {
    pendingFocus = String(id);
    if (!ctx) return;      /* the next mount runs it */
    SC.ensureData().then(function () { setTimeout(runPendingFocus, 60); }, function () {
      pendingFocus = null;
      if (ctx) ctx.toast('Daftar sekolah tidak dapat dimuat. Muat ulang halaman, lalu coba lagi.', 'warn');
    });
  }
  function runPendingFocus() {
    if (!ctx || pendingFocus == null || !SC.idx) return;
    var id = pendingFocus;
    pendingFocus = null;
    computeView();
    var row = focusTarget(id);
    if (row < 0) { ctx.toast('SMA ini tidak ditemukan di daftar sekolah.', 'warn'); return; }
    focusRow(row);
  }

  /** The shared travel-time switches changed (or the distance source became ready): redraw distances in place. */
  function onDistance() {
    DISTC = { key: '', m: new Map() };
    if (!ctx) return;
    distSwitches.forEach(function (s) { try { s.sync(); } catch (e) { /* ignore */ } });
    if (ui && ui.ov) renderOverview();     /* the top-5, TNI and cluster cards all show minutes from KCP */
    if (ui && ui.work && ui.work.list && st.tab === 'list') renderList();
    if (drawerDist && drawerDist.el && drawerDist.el.isConnected) {
      var r = distOf(drawerDist.i);
      drawerDist.el.textContent = distText(r);
      drawerDist.el.title = distTip(r);
    }
    refreshOpenCard();
  }
  /**
   * v5: the open card (or its callout) follows "Jam sibuk" / "Motor (tanpa tol)" too: MCD.windows draws the head
   * numbers from the brief and the kecamatan card lists minutes per SMA, so the model is refilled in place
   * (openDrawer {refresh: true} never moves anything). Not while staff type in the Tindak lanjut editor.
   */
  function refreshOpenCard() {
    if (!ctx || !drawerSel || !WS()) return;
    var d = document.querySelector('.drawer'), open = !!(d && d.classList.contains('is-open')) || !!document.querySelector('.ws-co');
    if (!open) return;
    var a = document.activeElement;
    if (a && a.closest && a.closest('.sk-dd--pipe')) return;
    var model = showModel(drawerSel);
    if (model) ctx.openDrawer(model, { refresh: true, keepSelection: true });
  }

  /** The card of a selection. trail: the kecamatan of a school opened inside its card (default: trailOf(sel)). */
  function showModel(sel, trail) {
    if (sel.kind === 'smaSchool') return schoolModel(+sel.id, { trail: trail !== undefined ? trail : trailOf(sel) });
    if (sel.kind === 'smaYay') return yayModel(+sel.id);
    if (sel.kind === 'smaKec') return kecModel(String(sel.id), { listFirst: !(sel.extra && sel.extra.first === 'angka') });
    return null;
  }
  function onSelect(sel) {
    /* a kecamatan click on the map opens the territory popup (bind); drop the selection so no empty drawer follows */
    if (sel && MCD.territory && sel.kind === MCD.territory.KIND) { setTimeout(function () { if (ctx) ctx.clearSelection(); }, 0); return true; }
    if (!sel || !/^sma(School|Yay|Kec)$/.test(sel.kind)) return false;
    var trail = SC.idx ? trailOf(sel) : null;
    /* another kecamatan: ensureKecFocus moves the focus without leaving it; a school of that kecamatan's card keeps it (v5) */
    if (sel.kind !== 'smaKec' && !(trail && trail === ownFocus)) dropOwnFocus();
    if (!SC.idx) return true;
    var model = showModel(sel, trail);
    if (!model) return false;
    /* v6 (§9.1): the first school card loads the contacts (and kelas biaya); the card refills when they land */
    if (sel.kind === 'smaSchool') { needContacts(); needTiers(); }
    drawerSel = sel;
    if (sel.kind === 'smaKec') { st.selKec = String(sel.id); MCD.map.requestRender(); }
    else if (sel.kind === 'smaSchool' && WS() && st.selKec !== (trail || null)) { st.selKec = trail || null; MCD.map.requestRender(); }
    var fly = flyNext;
    flyNext = false;
    setTimeout(function () {
      if (!ctx || drawerSel !== sel) return;
      if (MCD.territory && isFn(MCD.territory.closePopup)) { try { MCD.territory.closePopup(); } catch (e) { /* ignore */ } }
      ctx.openDrawer(model);
      if (model.gmaps) ensureDrawerGmaps(model.gmaps);
      staggerDrawer(model);
      watchDrawer(sel, trail);
      if (sel.kind === 'smaKec') { var kid = String(sel.id); setTimeout(function () { if (ctx && drawerSel === sel) ensureKecFocus(kid); }, 160); }
      if (fly && SC.idx) {
        if (sel.kind === 'smaSchool') MCD.map.flyTo({ center: [SC.idx.lon[sel.id], SC.idx.lat[sel.id]], zoom: 15.4 });
        else if (sel.kind === 'smaYay') { var a = yayAgg(+sel.id); if (a) fitRows(a.rows); }
      }
      MCD.map.requestRender();
      if (ui && ui.work && ui.work.yay && st.tab === 'yay') renderYay();
    }, 0);
    return true;
  }
  /** The app closes the drawer; clear our selection with it (no app hook exists for this). */
  function watchDrawer(sel, trail) {
    if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
    var d = document.querySelector('.drawer');
    if (!d || typeof MutationObserver !== 'function') return;
    drawerObs = new MutationObserver(function () {
      if (d.classList.contains('is-open')) return;
      drawerObs.disconnect(); drawerObs = null;
      if (drawerSel !== sel) return;
      drawerSel = null;
      if (sel.kind === 'smaKec') { st.selKec = null; dropOwnFocus(sel.id); }
      else if (trail) { st.selKec = null; dropOwnFocus(trail); }     /* Tutup on a school of the kecamatan card ends the trail */
      var s = MCD.state.get().selection;
      if (s && s.kind === sel.kind && String(s.id) === String(sel.id) && ctx) ctx.clearSelection();
      if (MCD.map && MCD.map.requestRender) MCD.map.requestRender();
      if (ui && ui.work && ui.work.yay && st.tab === 'yay') renderYay();
    });
    drawerObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }

  /* ================================================================= render */

  function refresh(keys) {
    if (!ctx) return;
    keys = keys || ['*'];
    computeView();
    if (MCD.map && MCD.map.requestRender) MCD.map.requestRender();
    if (isDeep()) {
      renderRail();
      if (keys.indexOf('pipeline') >= 0 && ui.work && ui.work.pipe) ui.work.pipe.sig = '';
      renderWork(false);
    } else renderOverview();
    syncScopes();
    syncControls();
    syncChips();
    repaintSummary();
  }
  /**
   * The slim rail shows summary() and pins rebuild from cardFor(): after an in-section change (a jenis, a filter, the
   * scope, a data file that landed) the shell is told, at most once per frame: MCD.windows.paintSlim when the SHELL lane
   * exports it, else the state event the shell already listens to for filter changes ({keys: ['filters.schools']};
   * app.js only re-renders the page head for it, so nothing loops back into refresh()).
   */
  var summaryQ = 0;
  function repaintSummary() {
    if (summaryQ || !ctx) return;
    summaryQ = setTimeout(function () {
      summaryQ = 0;
      if (!ctx) return;
      var W0 = WS(), fn = W0 && (W0.paintSlim || W0.refreshSummary);
      try {
        if (isFn(fn)) fn.call(W0);
        else if (MCD.state && isFn(MCD.state.emit)) MCD.state.emit('change', { keys: ['filters.schools'], state: MCD.state.get(), source: ID });
      } catch (e) { /* the rail repaints on its next sync */ }
    }, 16);
  }
  function syncControls() {
    if (!ctx) return;
    var groups = [];
    if (isDeep()) {
      groups.push({ label: 'Peta menampilkan', items: [
        { label: 'SMA dan kecamatan', title: 'Titik SMA dan label kecamatan', run: function () { setMapShow('both'); }, pressed: function () { return st.mapShow === 'both'; } },
        { label: 'Hanya SMA', title: 'Titik SMA saja', run: function () { setMapShow('dots'); }, pressed: function () { return st.mapShow === 'dots'; } },
        { label: 'Hanya kecamatan', title: 'Batas dan label kecamatan, dengan titik porsi SMA nasabah Mandiri', run: function () { setMapShow('kec'); }, pressed: function () { return st.mapShow === 'kec'; } }
      ] });
    }
    var sig = JSON.stringify([isDeep(), st.mapShow]);
    if (sig === syncControls.sig) return;
    syncControls.sig = sig;
    ctx.mapControls({ extra: groups, presets: ['sma15', 'ring30', 'smaTni'] });
  }
  function setMapShow(v) {
    st.mapShow = v;
    saveUi();
    syncControls.sig = '';
    syncControls();
    if (MCD.map && MCD.map.requestRender) MCD.map.requestRender();
  }

  function startLoad() {
    SC.failed = false;
    if (ui && ui.ov) renderLoad(ui.ov.status);
    if (ui && ui.rail) renderLoad(ui.rail.status);
    SC.ensureData().then(function () {
      if (!ctx) return;
      refresh(['*']);
      if (isDeep() && ui.work) renderWork(true);
      ctx.requestRender(['ext']);
    }, function () {
      if (!ctx) return;
      if (ui && ui.ov) renderLoad(ui.ov.status);
      if (ui && ui.rail) renderLoad(ui.rail.status);
      if (ui && ui.work) renderWork(true);
    });
  }
  function startTerritory() {
    var T = MCD.territory;
    if (!T || typeof T.ensureData !== 'function' || (T.ready && T.ready())) return;
    T.ensureData().then(function () {
      if (!ctx) return;
      KEC_IX.map = null;
      X.kec = null;
      V = null;
      refresh(['*']);
      if (isDeep() && ui.work && st.tab === 'kec') renderWork(true);
    }, function () { /* the kecamatan tab says so */ });
  }

  /* ============================================== v5 workspace contract (§7.4) */

  /**
   * summary() → {items: [{value, label, tone?, title}] (≤ 3), filters}: the slim rail. SMA within the distance,
   * siswa 17+ and, with the school file, the share of SMA nasabah Mandiri (else the SMA of TNI foundations).
   */
  /**
   * v6 (V6_SPEC §3.6): summary() → {items, filters, scope}. The scope is not a filter (D4): `filters` counts status,
   * yayasan TNI, tanpa NPSN and kelas biaya only; `scope` is the slim rail's vertical pair (windows.js paints it).
   * Items: "SMA 15 km" (SMA alone) or "Sekolah 30 km" with the split per jenis and the schools without a count in the
   * title, "Siswa 17+" ("—" while the 30 km file loads), then "Nasabah %" (school file) or "Yayasan TNI".
   */
  function scopeSummary() {
    return { label: 'Cakupan', value: scopeNow(), options: [{ v: 15, label: '15 km' }, { v: 30, label: '30 km' }], title: SCOPE_TIP, aria: SCOPE_ARIA,
      set: function (v) { setScope(v); } };
  }
  function summary() {
    if (!st) return { items: [], filters: 0, scope: { label: 'Cakupan', value: scopeGet(), options: [{ v: 15, label: '15 km' }, { v: 30, label: '30 km' }], set: function (v) { setScope(v); } } };
    var f = st.f, nf = activeFilterCount(), sc = scopeSummary();
    if (!V) return { items: [], filters: nf, scope: sc };
    var k = V.kpi, fmt = fm(), items = [], nn = nounOf(), km = scopeNow();
    var t0 = count(k.n, nn) + ' dalam ' + km + ' km dari Mabes TNI' + filterWords() + (!onlySma() ? ' · ' + splitWords(V.byJ) : '') + (k.noData ? ' · ' + count(k.noData, 'sekolah') + ' tanpa data siswa' : '');
    items.push({ value: fmt.int(k.n), label: (onlySma() ? 'SMA ' : 'Sekolah ') + km + ' km', title: t0 });
    if (V.students && k.stuN && !k.loading) items.push({ value: fmt.int(k.k17), label: 'Siswa 17+', title: fmt.int(k.k17) + ' siswa berusia 17+ (dapat memiliki KTP)' + (k.k17Est ? ', sebagian perkiraan' : '') });
    else if (k.loading) items.push({ value: '—', label: 'Siswa 17+', title: f30State() === 'error' ? FAIL30 : LOAD30 });
    if (V.hasBank) items.push({ value: k.n ? fmt.pct(k.cust / k.n, 0) : '—', label: 'Nasabah', tone: 'ok', title: fmt.int(k.cust) + ' dari ' + count(k.n, nn) + ' telah menjadi nasabah Mandiri' + (V.demo ? ' (data contoh)' : '') });
    else items.push({ value: fmt.int(k.tni), label: 'Yayasan TNI', title: count(k.tni, nn) + ' dikelola yayasan TNI' });
    return { items: items.slice(0, 3), filters: nf, scope: sc };
  }
  /**
   * workspace() → {rail, drawer, hide} for MCD.windows.adopt (Detail ≥ 1024 px): the left panel is the summary rail,
   * the workbench the bottom drawer "Daftar & grafik" with its five tabs; its head ("Lebarkan panel", Tutup), its foot
   * ("Sumber data" moves to the drawer bar's Sumber) and the rail's "Buka daftar & grafik" give way. null in Sederhana.
   */
  function workspace() {
    if (!ctx || !isDeep() || !ui || !ui.work || !page || !page.el) return null;
    var w = ui.work;
    setTimeout(syncAdopted, 0);
    return {
      rail: { el: page.el, label: 'Sekolah', icon: 'sec-schools', summary: summary },
      drawer: { el: w.el, tabs: w.tabHost, title: onlySma() ? 'Daftar & grafik SMA' : 'Daftar & grafik sekolah', source: SRC_SCHOOLS + ' · ' + STU_SRC, more: function () { openSources(); } },
      hide: [w.head, w.foot, ui.rail && ui.rail.openWork].filter(Boolean)
    };
  }
  /** cardFor(sel) → the card model of a selection now (live pins after data, filter, distance or privacy changes), or null. */
  function cardFor(sel) {
    if (!sel || !/^sma(School|Yay|Kec)$/.test(sel.kind)) return null;
    SC = SC || MCD.schools;
    if (!SC || !SC.idx || !st) return null;
    computeView();
    var was = building;
    building = 'pin';
    try { return showModel(sel); } catch (e) { return null; } finally { building = was; }
  }

  /* ============================================================ search (C-12) */

  /** SMA names for the shell search (MCD.app.registerSearch), only once data/schools.js is loaded. */
  function searchSma(q) {
    SC = SC || MCD.schools || null;     /* the provider is registered at load time, before the first mount sets SC */
    var I = SC && SC.idx;
    if (!I || !q || String(q).trim().length < 3) return [];
    var key = SC.searchKey(q), out = [];
    for (var k = 0; k < I.n && out.length < 8; k++) {
      var i = I.order[k];
      if (I.jen[i] !== 3 || I.nameKey[i].indexOf(key) < 0 || SC.smaClass(I.name[i], !!I.npsn[i]) === 2) continue;
      var dKcp = distText(distOf(i));
      out.push({ group: 'SMA', label: I.name[i], sub: 'SMA · ' + (dKcp && dKcp !== '—' ? dKcp + ' dari KCP' : fm().km(I.dist[i]) + ' dari Mabes TNI'), run: (function (row) {
        return function () { flyNext = true; if (ctx) ctx.select({ kind: 'smaSchool', id: row }); else if (MCD.app && MCD.app.navigate) { MCD.app.navigate(ID); setTimeout(function () { flyNext = true; if (ctx) ctx.select({ kind: 'smaSchool', id: row }); }, 600); } };
      })(i) });
    }
    return out;
  }
  /** v6: SMK and MA names for "Cari" (their own provider, after the SMA): a hit turns its jenis on and opens it. */
  function searchSkMa(q) {
    SC = SC || MCD.schools || null;
    var I = SC && SC.idx;
    if (!I || !q || String(q).trim().length < 3) return [];
    var key = SC.searchKey(q), out = [];
    for (var k = 0; k < I.n && out.length < 8; k++) {
      var i = I.order[k];
      if (I.dist[i] > 30 || I.nameKey[i].indexOf(key) < 0) continue;
      var w = I.jen[i] === 4 ? 'SMK' : I.jen[i] === 3 && SC.smaClass(I.name[i], !!I.npsn[i]) === 2 ? 'MA' : null;
      if (!w) continue;
      var dKcp = distText(distOf(i));
      out.push({ group: 'SMK dan MA', label: I.name[i], sub: w + ' · ' + (dKcp && dKcp !== '—' ? dKcp + ' dari KCP' : fm().km(I.dist[i]) + ' dari Mabes TNI'), run: (function (row) {
        return function () { if (ctx) focusRow(row); else if (MCD.app && MCD.app.navigate) { MCD.app.navigate(ID); setTimeout(function () { if (ctx) focusRow(row); }, 600); } };
      })(i) });
    }
    return out;
  }
  var searchDone = false;
  /* load time: "Cari" finds SMA (and, v6, SMK and MA) from every section once the school list is loaded (empty until then) */
  if (MCD.searchProviders && typeof MCD.searchProviders === 'object') {
    MCD.searchProviders.sma = function (q) { return searchSma(q); };
    MCD.searchProviders.sekolah = function (q) { return searchSkMa(q); };
    searchDone = true;
  }
  function registerSearch() {
    if (searchDone) return;
    var A = MCD.app;
    if (!A || !isFn(A.registerSearch)) return;
    try { A.registerSearch('sma', searchSma); A.registerSearch('sekolah', searchSkMa); searchDone = true; } catch (e) { /* the shell keeps its own entries */ }
  }

  /* =============================================================== contract */

  var SPEC = {
    lede: 'SMA, SMK dan MA dalam 15 km atau 30 km dari Mabes TNI, dengan jumlah siswa dan siswa 17+.\nLihat kelas biaya dan kontak lembaga setiap sekolah.\nSiswa 17+ untuk Tabungan, siswa di bawah 17 untuk Tabungan SimPel.',
    shows: [
      'Setiap sekolah di peta: lingkaran = SMA, kotak = SMK, belah ketupat = MA',
      'Biru = negeri, kuning = swasta, bintang biru tua = SMA yayasan TNI. Titik lebih besar = siswa lebih banyak',
      'Siswa 17+ dan siswa di bawah 17 per sekolah dan per kecamatan, dengan jarak dan waktu dari KCP',
      'Kelas biaya dari biaya resmi, jenis sekolah atau perkiraan, dan kontak lembaga dari daftar resmi',
      'Setelah file sekolah diimpor: lingkar hijau = nasabah Mandiri, lingkar merah = prospek',
      'Urutan yayasan, ketentuan Referral Biller dan GEMPITA, kalkulator dan tindak lanjut di tampilan Detail'
    ],
    needs: ['3_sekolah'],
    dataKeys: [],
    emptyFirst: false,
    blocks: [],
    source: 'Sumber: Kemendikdasmen Dapodik, OpenStreetMap, Overture Maps (12 Okt 2026) · siswa: Dapodik 2026/2027 Ganjil · kontak dan kelas biaya: 18 Okt 2026 · file sekolah: sheet 3_sekolah',
    cards: function () { return []; }
  };

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (host, c) {
      SC = MCD.schools;
      ctx = c;
      ui = {};
      handles = [];
      distSwitches = [];
      scopeSwitches = [];
      ctlSets = [];
      drawerDist = null;
      if (!st) st = loadState();
      else st.f.km = scopeGet();            /* the scope of this browser tab (another section or the slim rail may have set it) */
      st.workOpen = !!(st.openOnMount && isDeep());
      st.openOnMount = false;
      saveUi = debounce(function () {
        sset(UI_KEY, { v: 2, tab: st.tab, sort: st.sort, mapShow: st.mapShow, kecAll: st.kecAll, kecSort: st.kecSort, wide: st.wide, listSort: st.listSort, topSort: st.topSort,
          show: { sma: st.show.sma !== false, ma: !!st.show.ma, smk: !!st.show.smk }, showV: 2 });
      }, 400);
      saveCalc = debounce(function () { var inputs = {}; SC.config.calcFields.forEach(function (f) { inputs[f.k] = st.calc[f.k]; }); sset(CALC_KEY, { v: 2, inputs: inputs, target: st.calcTarget, t: new Date().toISOString() }); }, 400);
      host.classList.add('sk-host');
      var spec = Object.assign({}, SPEC, { primary: isDeep() ? null : { label: onlySma() ? 'Lihat daftar SMA' : 'Lihat daftar sekolah', icon: 'chev-r', run: function () { goTab('list'); } } });
      page = c.page(spec);
      /* one polite live region for the scope announcement ("Cakupan 30 km. 1.234 sekolah tampil.") */
      ui.live = E('p', { class: 'sr-only', aria: { live: 'polite', atomic: 'true' } });
      page.body.appendChild(ui.live);
      if (isDeep()) { buildRail(page.body); buildWork(host); syncWork(); }
      else buildOverview(page.body);
      registerMap();
      registerSearch();
      /* v6: the scope set elsewhere in this tab (the slim rail, another control), the lazy data files, the seal */
      try { var so = scopeApi().on(function () { if (ctx && st) applyScope(scopeGet(), { quiet: true }); }); if (isFn(so)) offs.push(so); } catch (e) { /* the controls still work */ }
      offs.push(SC.on('data', debounce(function (d) {
        if (!ctx) return;
        V = null;
        refresh(['data30']);
        if (MCD.map && MCD.map.requestRender) MCD.map.requestRender();
        if (ctx.requestRender) ctx.requestRender(['ext']);
        refreshOpenCard();
        void d;
      }, 60)));
      /* §7.4: the old plain list moved into the sealed store: one line, once (the migration may run before this mount) */
      var migratedNote = function () {
        if (seenMigrated || !ctx) return;
        var mg = false;
        try { mg = isFn(SC.pipeline.migrated) && SC.pipeline.migrated(); } catch (e) { mg = false; }
        if (mg) { seenMigrated = true; ctx.toast('Daftar tindak lanjut SMA kini terenkripsi di komputer ini.'); }
      };
      var onSeal = function (e) {
        var d = e && e.detail;
        if (d && (d.change === 'migrated' || d.migrated) && (!d.name || d.name === SC.pipeline.name)) migratedNote();
        if (ctx && isDeep() && st.tab === 'pipe') renderPipe(true);
      };
      document.addEventListener('mcd:seal', onSeal);
      offs.push(function () { document.removeEventListener('mcd:seal', onSeal); });
      try { SC.pipeline.ready().then(migratedNote, function () { /* the tab names the state */ }); } catch (e) { /* ignore */ }
      if (wants30()) need30();
      scheduleLazy();
      offs.push(SC.on('pipeline', debounce(function () { if (ctx && isDeep() && st.tab === 'pipe') renderPipe(true); if (ctx && isDeep() && st.tab === 'yay') renderYay(); }, 60)));
      offs.push(MCD.state.on('reset', function (e) { if (e && e.scope === 'filters') resetF(); }));
      /* the 17+ shares changed (the "?" method): every 17+ figure is recomputed */
      offs.push(SC.on('shares', debounce(function () { if (ctx) { V = null; refresh(['shares']); } }, 80)));
      /* the shared "Jam sibuk" / "Motor (tanpa tol)" switches, or the distance source became ready */
      var onDistEvt = function () { onDistance(); };
      window.addEventListener('mcd:distance', onDistEvt);
      offs.push(function () { window.removeEventListener('mcd:distance', onDistEvt); });
      c.registerCommands(function () {
        var out = [
          { label: 'Sekolah · Cakupan 15 km', run: function () { setScope(15, { camera: true }); }, kw: 'sma smk ma sekolah 15 cakupan pilot' },
          { label: 'Sekolah · Cakupan 30 km', run: function () { setScope(30, { camera: true }); }, kw: 'sma smk ma sekolah 30 cakupan' },
          { label: 'Sekolah · Hanya sekolah yayasan TNI', run: function () { setF({ tni: !st.f.tni }); goTab('list'); }, kw: 'hang tuah kartika angkasa yasarini tni yayasan' },
          { label: 'Sekolah · ' + (st.show.ma ? 'Sembunyikan MA' : 'Tampilkan MA (madrasah aliyah)'), run: function () { setShow({ ma: !st.show.ma }); }, kw: 'madrasah aliyah ma jenis' },
          { label: 'Sekolah · ' + (st.show.smk ? 'Sembunyikan SMK' : 'Tampilkan SMK'), run: function () { setShow({ smk: !st.show.smk }); }, kw: 'smk kejuruan jenis' },
          { label: 'Sekolah · Arti kelas biaya', run: function () { needTiers().then(function () { openTierHelp(); }); }, kw: 'kelas biaya spp uang pangkal premium atas menengah reguler' },
          { label: 'Sekolah · Cara menghitung siswa 17+', run: function () { openMethod(); }, kw: 'siswa 17 ktp cif rekening porsi kelas' },
          { label: 'Sekolah · Hapus filter', run: function () { resetF(); }, kw: 'reset filter' },
          { label: 'Sekolah · Daftar sekolah', run: function () { goTab('list'); }, kw: 'daftar sma leads csv ekspor' },
          { label: 'Sekolah · Sekolah per kecamatan', run: function () { goTab('kec'); }, kw: 'kecamatan grafik' },
          { label: 'Sekolah · Urutan yayasan', run: function () { goTab('yay'); }, kw: 'yayasan peringkat urutan' },
          { label: 'Sekolah · Program dan kalkulator', run: function () { goTab('prog'); }, kw: 'program referral biller gempita fee kalkulator casa' },
          { label: 'Sekolah · Tindak lanjut', run: function () { goTab('pipe'); }, kw: 'pipeline tindak lanjut tahap' },
          { label: 'Sekolah · Ekspor daftar sekolah (CSV)', run: function () { exportSchools(); }, kw: 'unduh csv ekspor sekolah sma leads' },
          { label: 'Sekolah · Impor nasabah sekolah (sheet 3_sekolah)', run: function () { ctx.navigate('data'); }, kw: 'impor nasabah sekolah' }
        ];
        if (V && SC.idx) {
          V.tni.forEach(function (i) { out.push({ label: 'SMA · ' + SC.idx.name[i], run: function () { flyNext = true; ctx.select({ kind: 'smaSchool', id: i }); }, kw: 'tni ' + (SC.config.matra[SC.idx.matra[i]] || '') }); });
          boardRows('').slice(0, 150).forEach(function (a) { out.push({ label: 'Yayasan · ' + a.label, run: function () { flyNext = true; ctx.select({ kind: 'smaYay', id: a.e }); }, kw: (a.npyp || '') + ' yayasan sma' }); });
        }
        return out;
      });
      syncControls.sig = '';
      startTerritory();
      if (SC.idx) refresh(['*']);
      else { renderOverview(); renderRail(); if (ui.work) renderWork(true); startLoad(); }
      if (pendingFocus != null) requestFocus(pendingFocus);
    },
    update: function (derived, keys) {
      if (!ctx) return;
      keys = keys || ['*'];
      if (page) page.update(derived, keys);
      if (keys.indexOf('selection') >= 0) {
        var s = MCD.state.get().selection;
        if (!s || !/^sma/.test(s.kind)) { drawerSel = null; if (st.selKec && !(s && s.kind === 'smaKec') && !(MCD.territory && isFn(MCD.territory.popupOpen) && MCD.territory.popupOpen())) { st.selKec = null; } if (MCD.map && MCD.map.requestRender) MCD.map.requestRender(); }
      }
      var relevant = keys.some(function (k) { return k === '*' || k === 'data' || k === 'demo' || k === 'theme' || k === 'settings' || k.indexOf('privacy') === 0; });
      if (!relevant) return;
      if (keys.indexOf('theme') >= 0) {
        if (ui.work && ui.work.table && ui.work.table.update) ui.work.table.update();
        handles.forEach(function (h) { try { if (h.update) h.update(); } catch (e) { /* ignore */ } });
      }
      if (keys.some(function (k) { return k === 'data' || k === 'demo' || k.indexOf('privacy') === 0; }) && ui.work && (st.tab === 'yay' || st.tab === 'list')) {
        var t = ui.work.table;
        if (t) { try { t.destroy(); } catch (e) { /* ignore */ } }
        ui.work.table = null;
        if (ui.work.yay) ui.work.yay.table = null;
        if (ui.work.list) ui.work.list.table = null;
        ui.work.current = null;
      }
      syncControls.sig = '';
      refresh(keys);
      /* D7: "Samarkan nama" hides the contacts of the card on screen at once (no tel:, mailto: or site link left) */
      if (keys.some(function (k) { return k.indexOf('privacy') === 0; })) refreshOpenCard();
    },
    unmount: function () {
      offs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      offs = [];
      unregisterMap();
      clearTimeout(hlTimer);
      hl = { set: null, key: '' };
      if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
      handles.slice().forEach(dropHandle);
      handles = [];
      if (ui && ui.work && ui.work.table && ui.work.table.destroy) { try { ui.work.table.destroy(); } catch (e) { /* ignore */ } }
      document.body.classList.remove('sk-work-open');
      if (ctx && isFn(ctx.filterChips)) { try { ctx.filterChips([]); } catch (e) { /* ignore */ } }
      applyZones(true);
      distSwitches = [];
      scopeSwitches = [];
      ctlSets = [];
      lazyTimers.forEach(clearTimeout);
      lazyTimers = [];
      drawerDist = null;
      drawerSel = null;
      dropOwnFocus();
      if (st) st.selKec = null;
      saveUi();
      ctx = null; page = null; ui = null;
    },
    layout: function () {
      var lay = { posture: ID };
      if (!ctx) return lay;
      syncAdopted();
      var p = ctx.padding();
      var w = ui && ui.work && ui.work.el;
      /* v5: an adopted workbench is the shell's bottom drawer, already in MCD.windows.padding */
      if (w && isDeep() && !adopted() && window.matchMedia && window.matchMedia('(min-width: 1280px)').matches && !document.body.classList.contains('rail-r-collapsed')) {
        var r = w.getBoundingClientRect();
        if (r.width > 0) p.right = Math.round(window.innerWidth - r.left + 12);
      }
      lay.padding = p;
      return lay;
    },
    onSelect: onSelect,
    /* v5 workspace contract (docs/LAYOUT_V5C_SPEC.md §7.4): feature-detected by the shell */
    workspace: workspace,
    summary: summary,
    cardFor: cardFor,
    kecList: function (kecId) { SC = SC || MCD.schools; if (!SC || !SC.idx || !st || !kecId) return null; computeView(); return kecModel(String(kecId), { listFirst: true }); },
    onAction: function (action) {
      /* MCD.app.focus({section: 'schools', kind: 'sma', id}) → 'focus:sma:<npsn | school row>': fly there, open it */
      var fm0 = /^focus:sma:(.+)$/.exec(String(action || ''));
      if (fm0) { requestFocus(fm0[1]); return true; }
      /* v6 (§3.6): 'schools:scope:<15|30>' (before the mount it is stored and the mount picks it up) */
      var sm = /^schools:scope:(15|30)$/.exec(String(action || ''));
      if (sm) { if (ctx && st) setScope(+sm[1]); else { try { scopeApi().set(ID, +sm[1]); } catch (e) { /* ignore */ } } return true; }
      if (!ctx) return false;
      /* Ringkasan "Lihat di peta Sekolah" (SMA drill-down): open that kecamatan here (drawer, Kecamatan tab, map focus) */
      var km = /^schools:kec:(\d\d\.\d\d\.\d\d)$/.exec(String(action || ''));
      if (km) { showKec(km[1]); return true; }
      if (action === 'filters:reset') { resetF(); return true; }
      if (action === 'schools:list') { goTab('list'); return true; }
      return false;
    },
    onEscape: function () {
      if (st && st.workOpen && !adopted() && window.matchMedia && !window.matchMedia('(min-width: 1280px)').matches) { openWork(false); return true; }
      return false;
    },
    onResize: function () { if (ctx) ctx.relayout(); },
    search: searchSma,
    /* pure helpers for tests and other modules (no DOM) */
    smaClass: smaClass,
    _test: { tabs: TABS.map(function (t) { return t.id; }), gmapsUrl: gmapsUrl, withinWords: function (a, b, c, d) { return withinWords(a, b, c, d); },
      focusTarget: function (id) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); return focusTarget(id); },
      focusRow: function (i, c) { SC = SC || MCD.schools; return focusRow(i, c); },
      pendingFocus: function () { return pendingFocus; }, clearFocus: function () { pendingFocus = null; },
      distText: function (r, parts) { return distText(r, parts); }, distOf: function (i) { SC = SC || MCD.schools; return distOf(i); },
      specOf: function (i) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); return specOf(i); },
      /* the view model without a DOM: view({km, type, tni, inf}, {ma, smk}) → {kpi, legend, kec, ctxMa, ctxSmk, show} */
      view: function (f, show) {
        SC = SC || MCD.schools;
        if (!SC || !SC.idx) return null;
        if (!st) st = loadState();
        if (f) st.f = Object.assign({}, st.f, f);
        if (show) st.show = Object.assign({}, st.show, show);
        V = null;
        if (!computeView()) return null;
        var kec = {};
        Object.keys(V.kec).forEach(function (id) { var a = V.kec[id]; kec[id] = { n: a.n, nAll: a.nAll, priv: a.priv, pub: a.pub, unk: a.unk, stu: a.stu, k17: a.k17, u17: a.u17, rows: a.rows.length }; });
        return { kpi: Object.assign({}, V.kpi), legend: legendCounts(), kec: kec, ctxMa: V.ctxMa.length, ctxSmk: V.ctxSmk.length, show: { ma: !!st.show.ma, smk: !!st.show.smk }, jenis: shownJenis(), mix: Object.assign({}, V.mix),
          byJ: JSON.parse(JSON.stringify(V.byJ)), rows: V.rows.slice(), hidden: V.hidden, tierCounts: Object.assign({}, V.tierCounts), tiers: V.tiers, n: Object.assign({}, V.n) };
      },
      /* v6 (tests/schools-v6.test.mjs): scope, jenis, kelas biaya and kontak pieces without a mounted DOM */
      sInfo: function (i) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); if (!st) st = loadState(); return sInfo(i); },
      setShow: function (patch) { if (!st) st = loadState(); st.show = Object.assign({}, st.show, patch || {}); V = null; },
      setScope: function (v) { setScope(v); }, scopeGet: function () { return scopeGet(); }, scopeApi: function () { return scopeApi(); },
      tierOf: function (i) { return tierOf(i); }, tierKey: function (i) { return tierKey(i); }, tierBlockFor: function (i) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); return tierBlockFor(i); },
      contactBlockFor: function (i) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); if (!st) st = loadState(); return contactBlockFor(i); },
      contactCsv: function (i) { return contactCsv(i); }, tierCsv: function (i) { return tierCsv(i); },
      badgesOn: function (ms) { return badgesOn(ms); }, mapLayers: function (ms) { return mapLayers(null, ms); }, legend: function (ms) { return legend(null, ms); },
      jenisOf: function (i) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); return jenisOf(i); }, rowOfKey: function (k) { return rowOfKey(k); },
      searchSkMa: function (q) { return searchSkMa(q); }, idOf: function (i) { return rowId(i); },
      reset: function () { st = null; V = null; },
      kecPopup: function (id) { return V ? kecPopup(id) : null; }, tipKec: function (id) { return V ? tipKec(id) : null; },
      distStack: function (r) { return distText(r, 'cell'); }, distModeWords: function () { return distModeWords(); },
      /* v4 (tests/sections-v4.test.mjs): route link, motion and kecamatan focus helpers */
      routeUrl: routeUrl, routeLink: routeLink, stagger: stagger, countOnce: countOnce, staggerDrawer: staggerDrawer, wideFade: wideFade,
      k17Short: function (si, i) { SC = SC || MCD.schools; return k17Short(si, i); },
      schoolModel: function (i) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); return schoolModel(i); },
      ensureKecFocus: ensureKecFocus, dropOwnFocus: dropOwnFocus, ownFocus: function () { return ownFocus; },
      /* v5 (tests/sections-v5.test.mjs): cards, briefs, the trail and "+ Tindak lanjut" */
      kecModel: function (id, o) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); if (!st) st = loadState(); computeView(); return kecModel(String(id), o); },
      kecBrief: function (id) { return V ? kecBrief(String(id)) : null; },
      showModel: function (sel) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); if (!st) st = loadState(); computeView(); return showModel(sel); },
      quickAdd: function (key, label) { SC = SC || MCD.schools; return quickAdd(key, label); },
      trailOf: function (sel) { SC = SC || MCD.schools; if (SC && SC.idx) smaIdx(SC.idx); return trailOf(sel); },
      openInTrail: function (i, kid) { openInTrail(i, kid); }, openKecNums: function (id) { openKecNums(id); }, onDistance: function () { onDistance(); } }
  };
})(window.MCD = window.MCD || {});
