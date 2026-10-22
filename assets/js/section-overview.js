/* ==========================================================================
 * MCD.sections.overview: section 1 "Ringkasan" (key 1), the chart-first executive page.
 * Product rules: docs/COPY_STYLE_EN.md items 19-22 (Bahasa Indonesia, no hexagons, a new chart-first
 * Ringkasan, "Buka di Google Maps"), 26-29 (SMA students 17+, distance from the branch, product logos),
 * 31 (named, clickable rankings in glass charts), 32-35 and 37 (EDC vs LVM by size of business, Google
 * ratings live only, school symbols, "Sasaran LVM" / "Sasaran EDC" panels, never a bare score),
 * docs/UX_FIX_PLAN.md §2.6 and C-01. Contract: INTEGRATION_NOTES §3.
 *
 * One page, no map and no views (the layout is 'page'; the view switch and the breadcrumb are hidden here):
 *   1. Action title with its unit, period and source. Before the LVM import, one line under it: what the
 *      import adds, with the single primary button "Impor file LVM".
 *   2. KPI tiles beside "Prioritas kunjungan" (the top 3 of MCD.territory.priority). Before the import:
 *      "Sasaran EDC", "Sasaran LVM" (counts of MCD.sme.edcTierCounts) and "Siswa SMA 17+ (dapat memiliki
 *      KTP)"; the merchant total is already the title. After the import: the LVM tiles.
 *   3. Row 2, the named rankings (item 31, 35), side by side from 1200 px:
 *      - "SMA dengan siswa terbanyak": switch Semua siswa | Siswa 17+, the 5 kecamatan with the most
 *        students (click one: "5 SMA terbesar di <kecamatan>", back with "Semua kecamatan", and "Lihat di peta
 *        Sekolah": Sekolah's action 'schools:kec:<id>', else the selection {kind: 'smaKec', id}, so the map
 *        enters the kecamatan focus mode of item 38) and the 5 SMA by name; "Semua siswa" bars are split into
 *        siswa 17+ and di bawah 17 (item 35a). A click on a school
 *        opens Sekolah at that school: MCD.app.focus({section: 'schools', kind: 'sma', id: npsn}). Shared
 *        display rule: rows with duplicateOf are dropped, 17+ = ktp17Resmi when present (else ktp17Est,
 *        marked "perkiraan"), 0 students = "kemungkinan tidak aktif" and left out of the rankings.
 *      - "Sasaran EDC — usaha menengah & besar" and "Sasaran LVM — usaha kecil & mikro" (item 35b): the 5
 *        kecamatan with the most targets (a bar opens Merchant › Kandidat EDC filtered to that tier and
 *        kecamatan: 'merchants:sasaran:<edc|lvm>:<kecamatanId>') and the top merchants by name
 *        (MCD.sme.edcCandidates({tiers}); a row opens the Merchant map at that business). "Naik ke EDC"
 *        rows sit in the EDC panel. Tier words come from MCD.sme.TIERS. No score is shown (item 37).
 *        Optional live "Cek rating Google" in the EDC panel (MCD.places, public listing names only,
 *        never in presentation mode, never stored).
 *   4. Columns per kecamatan (10 with the most merchants within 15 km, coloured by the ranked third;
 *      Cipayung, the branch's kecamatan, is always included) beside a donut (LVM status or jenis usaha).
 *   5. UREG and USAK against target per branch: horizontal glass bars with a dashed target line.
 *   6. Pintasan to Merchant, Sekolah and KPR, plus the programmes that end soon.
 *
 * Glass treatment (item 31): gradient fills, a soft inner highlight, gentle shadows, rounded ends. Lengths
 * and angles still carry the data from a zero baseline. No 3D faces, no rotation, tilt or perspective.
 * Colours come only from classes and tokens, so a theme switch recolours without a redraw. Every chart is
 * an <svg role="img"> with a one-sentence aria-label and a "Lihat tabel" toggle, or a list of buttons
 * (MCD.charts.rankedBars).
 *
 * v4 (items 37, 38): tier ids 'edc' | 'lvm' | 'naik-edc' (the v3 id 'edc+lvm' is still read while MCD.sme
 * keeps it); every named merchant row shows three level dots, nilai belanja · keramaian · daya beli area
 * (MCD.sme.factors(idx), else the same words from the candidate and MCD_AREA_WEALTH), with their words and
 * one reason each on hover or keyboard focus; each Sasaran panel has a "?" that says the three factors in one
 * short sentence each. Motion (MCD.motion when the shell has it, else the same ease-out locally; transform and
 * opacity only; nothing under prefers-reduced-motion): charts grow in once when they scroll into view, 35 ms
 * apart; the KPI numbers count up once; the drill-down "kecamatan → its 5 SMA" fades its rows through (old
 * rows out first, no overlap) and morphs the kept bars (MCD.charts.rankedBars), settled in about 540 ms.
 * Every duration is a motion token (--dur-fast 180, --dur-base 300, --dur-slow 500 ms). A redraw with the
 * same model and width is skipped, so the update that follows mount never cuts an entrance short. Row 2 from 1200 px: the SMA card across the page
 * (its two lists side by side), then Sasaran EDC beside Sasaran LVM with their two lists side by side, the
 * two cards of equal height. The breadcrumb is turned off through ctx.page({crumbs: false}) when the shell
 * honours it; otherwise the v3 CSS rule hides it (feature-detected after the page is built).
 *
 * v5 (items 39, 42, 43; concept C "Kartu bertahap", MCD.windows feature-detected): Sasaran EDC counts local merchants
 * only, with one line under the number, "Tidak termasuk {n} jaringan nasional (lewat kantor pusat).", that opens
 * 'merchants:sasaran:nasional'. n is the whole group, the number Merchant shows under the same label
 * (edcTierCounts().nasional, else nasionalEdc, else the v4 alias edcChain). When the group also holds chains that would
 * otherwise be Sasaran LVM (nasional > nasionalEdc), Sasaran LVM carries the same line, so neither number drops
 * without a word (spec §10.3); the SMA
 * drill-down shows the kecamatan's numbers in the shared card markup (MCD.windows.card, else .ov-card); the key of
 * the factor dots is a repeated hint (MCD.windows.hint: once per browser); the factor card floats beside its row
 * (charts-plus, MCD.windows.place). Clicks still open sections through MCD.app.focus (schools, merchants) or
 * Sekolah's own 'schools:kec:<id>', so the section opens its detail card directly (no callout).
 *
 * v6 (COPY_STYLE_EN item 45, docs/V6_SPEC.md D1, D2, D12 and §6.12): "Pintasan" gains a fourth door, "Kampus", built
 * exactly like the other three (icon, title, one line of numbers, one primary button "Buka Kampus"), shown only when the
 * shell registers the 'campus' section. Its line is "{n} kampus dalam 30 km · {m} mahasiswa" with the D12 totals from
 * data/campuses.js: n = perguruan tinggi with a kode PT within 30 km (the design and course schools count apart, D13),
 * m = their students without the distance-learning rows (`nationwide`) and the rows whose main campus lies outside
 * 30 km (`mainOutside`), so it equals meta.coverage.studentsTotalLocal. No campus names (D2). The file is asked for
 * through MCD.app.lazy('campuses') 2 s after the mount, in an idle callback, never in the mount frame; until it is in
 * (or when it fails) the line reads "Perguruan tinggi dalam 30 km" and Ringkasan shows no error. The Sekolah door keeps
 * "Sekolah (SMA)" and its 15 km pilot line (D1). Doors: 4 columns from 1200 px, 2 × 2 from 768, stacked on phones.
 *
 * Data, read-only: MCD.lvm.aggregate('kecamatan'), MCD.territory.stats(MCD.lvm.territoryInput()),
 * MCD.territory.priority (feature-detected, same formula as a fallback), MCD.lvm.summary(),
 * MCD.sme.kpi() / MCD.data.lvm_kpi, MCD.sme.edcCandidates / edcTierCounts / TIERS, MCD.schools.smaCount(15),
 * MCD_SMA_STUDENTS (injected once when index.html does not load it), MCD.distance (else MCD.travel, else
 * the straight line), MCD_PROPERTY_PROJECTS. Safe DOM only (MCD.util.el / textContent). Nothing runs at load
 * time except the registration. Presentation mode ("Samarkan nama") redraws the merchant names as initials.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'overview';
  var W = typeof window !== 'undefined' ? window : {};
  var KM = 15;
  var KPR_KM = 30;
  var HOME = '12903';
  var HOME_KEC = '31.75.10';                 // Kecamatan Cipayung, where KCP Cilangkap sits
  var MABES = { lat: -6.32945, lon: 106.91366 };
  var CATS = [
    { key: 'grocery', label: 'Toko kelontong & ritel', color: 'c2' },
    { key: 'restaurant', label: 'Restoran & warung makan', color: 'c3' },
    { key: 'other', label: 'UMKM lainnya', color: 'c1' }     /* the largest slice gets the strongest colour: ≥ 3:1 in both themes */
  ];
  var BAND_TONE = { acquired: 'ok', partly: 'mid', notYet: 'bad', noData: 'none', potential: 'potential' };
  var GM_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  /* Optional depth of the geometry helpers (kept for callers and tests). The glass charts of item 31 draw
     with dx = dy = 0: no side or top faces, only a soft highlight and shadow. */
  var DEPTH = { x: 8, y: 5 };
  var GLASS = { dx: 0, dy: 0 };
  var LVM_ICON = 'assets/brand/livin-merchant-icon.png';
  var SMA_FILE = 'data/sma-students.js';
  var SMA_SEMESTER = '2026/2027 Ganjil';
  var TOP_N = 5;
  /* v6 Kampus door (V6_SPEC §6.12): 30 km scope, data asked for 2 s after the mount at an idle moment */
  var CAMPUS_KM = 30;
  var CAMPUS_WAIT_MS = 2000;
  var CAMPUS_LINE_WAIT = 'Perguruan tinggi dalam 30 km';
  var CAMPUS_TITLE = 'Jumlah mahasiswa per perguruan tinggi dari PDDikti, untuk seluruh kampusnya. ' +
    'Kampus pendidikan jarak jauh dan kampus dengan kampus utama di luar 30 km tidak dihitung.';
  /* The tone of each tier chip (the same colours as Merchant's chips). The words come from MCD.sme.TIERS
     (item 35); these are only the fallback when that module is older or missing. */
  var TIER = {
    edc: { label: 'Sasaran EDC', tone: 'edc', words: 'Usaha menengah atau besar. Tawarkan EDC Mandiri untuk pembayaran kartu. EDC juga menerima QRIS.' },
    'naik-edc': { label: 'Naik ke EDC', tone: 'up', words: 'Telah terdaftar di Livin’ Merchant dan termasuk usaha menengah atau besar. Tawarkan EDC Mandiri.' },
    lvm: { label: 'Sasaran LVM', tone: 'lvm', words: 'Usaha kecil atau mikro. Tawarkan Livin’ Merchant untuk QRIS di HP.' },
    /* item 42: national chains (Indomaret, Alfamart, KFC and similar) are their own group, not branch targets */
    nasional: { label: 'Jaringan nasional (lewat kantor pusat)', tone: 'plain',
      words: 'Jaringan nasional biasanya bekerja sama dengan bank di kantor pusat. Tetap tampil, tetapi tidak dihitung sebagai sasaran cabang.' }
  };
  /* v3 tier id of "Sasaran EDC" (item 32's 'edc+lvm'); read as 'edc' until MCD.sme renames it (item 35) */
  var TIER_ALIAS = { 'edc+lvm': 'edc' };
  function normTier(t) { return TIER_ALIAS[t] || t; }
  /* The two panels of item 35b: which tiers each one lists, and the Merchant action of its bars. */
  var SAS = {
    edc: { key: 'edc', tiers: ['edc', 'naik-edc'], main: 'edc', title: 'Sasaran EDC — usaha menengah & besar', short: 'Sasaran EDC' },
    lvm: { key: 'lvm', tiers: ['lvm'], main: 'lvm', title: 'Sasaran LVM — usaha kecil & mikro', short: 'Sasaran LVM' }
  };
  /* Item 37: why a merchant is "Sasaran EDC" — three factors, shown as levels with one plain reason each. */
  var FACTORS = [
    { key: 'ticket', label: 'Nilai belanja' },
    { key: 'crowd', label: 'Keramaian' },
    { key: 'wealth', label: 'Daya beli area' }
  ];
  var LEVEL_STEP = { kecil: 1, rendah: 1, sedang: 2, besar: 3, tinggi: 3 };
  /* The "?" of each Sasaran panel (item 37): one short sentence per factor, plain Indonesian. */
  var FACTOR_TIP = [
    'Nilai belanja: besarnya belanja per transaksi, terutama dari jenis usaha.',
    'Keramaian: banyaknya pembeli, dilihat dari merek, jaringan dan data usaha di peta publik.',
    'Daya beli area: seberapa mungkin pembeli di sekitar toko membayar dengan kartu (perkiraan per kelurahan).'
  ];
  var SAS_TIP = {
    edc: { t: 'Cara memilih Sasaran EDC', lead: 'Sasaran EDC dinilai dari tiga faktor. Pada Sasaran EDC, tidak ada faktor yang rendah atau kecil.' },
    lvm: { t: 'Cara memilih Sasaran LVM', lead: 'Sasaran LVM adalah usaha yang belum memenuhi ketiga faktor EDC. QRIS melalui Livin’ Merchant sesuai untuk pembayaran kecil.' }
  };
  var DOTS_TIP = 'Titik di kanan nama menunjukkan ketiga faktor ini. Lingkaran kosong berarti rendah atau kecil, setengah berarti sedang, penuh berarti tinggi atau besar.';
  /* Motion (item 38): ease-out quint for entrances (MCD.motion.ease.out when the shell has it) */
  var EASE_OUT = [0.22, 1, 0.36, 1];

  var S = { host: null, ctx: null, page: null, refs: null, model: null, sig: '', drawn: false, ro: null, width: 0,
    donutMode: 'status', barMode: 'ureg', tables: {}, resizeT: 0, uid: 0, mid: 0,
    sma: { metric: 'all', kec: null }, charts: {}, sas: {}, sasCount: null, google: null, googleBusy: false, googleToken: 0, onDist: null,
    drawKey: {}, kpiSig: '', counted: {}, jobs: [], tipOpen: {}, crumbCss: true, hints: {},
    campusT: 0, campusIdle: 0, campusIdleFn: null, campusSum: null };
  var ONCE = { schoolsAsked: false, smaAsked: false, smaFailed: false, poi: { ref: null, n: null }, tileCats: { ref: null, by: null }, tni: null };

  /* ------------------------------------------------------------------ helpers */

  function U() { return MCD.util; }
  function F() { return MCD.util.fmt; }
  function el() { return U().el.apply(null, arguments); }
  function svg() { return U().el.svg.apply(null, arguments); }
  function icon(name, cls) { return U().icon(name, cls); }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function rows(key) { return (MCD.data && Array.isArray(MCD.data[key])) ? MCD.data[key] : []; }
  function demoOn() { return !!(MCD.demo && isFn(MCD.demo.isOn) && MCD.demo.isOn()); }
  function int(n) { return isNum(n) ? F().int(n) : '—'; }
  /** Coverage-style percent: one decimal, two when one would round a share to 0% or 100% it has not reached. */
  function pctA(x) {
    if (!isNum(x)) return '—';
    if (x < 1 && x >= 0.99995) return '> ' + F().pct(0.9999, 2);
    return F().pct(x, (x > 0 && x < 0.0005) || (x < 1 && x >= 0.9995) ? 2 : 1);
  }
  function pct0(x) { return isNum(x) ? F().pct(x, 0) : '—'; }
  /** Axis ticks: as few decimals as the value needs (5%, 2,5%). */
  function tickPct(v) {
    var p = v * 100, d = Math.abs(p - Math.round(p)) < 1e-9 ? 0 : (Math.abs(p * 10 - Math.round(p * 10)) < 1e-9 ? 1 : 2);
    return F().pct(v, d);
  }
  function km(x) { return isNum(x) ? F().num(x, 1) + ' km' : '—'; }
  function safe(fn, self, args) {
    try { return fn.apply(self || null, args || []); } catch (e) { if (W.console) W.console.warn('[ringkasan]', e && e.message ? e.message : e); return undefined; }
  }
  function uid(p) { S.uid += 1; return 'ov-' + p + '-' + S.uid; }
  function hav(lat1, lon1, lat2, lon2) {
    var D = Math.PI / 180, dLat = (lat2 - lat1) * D, dLon = (lon2 - lon1) * D;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * D) * Math.cos(lat2 * D) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function monthYear(s) {
    var m = /^(\d{4})-(\d{2})/.exec(String(s || ''));
    return m ? BULAN[+m[2] - 1] + ' ' + m[1] : '';
  }
  function dateTxt(d) { return d ? F().date(d) : ''; }
  function pois() { return W.MCD_SME_POIS || null; }
  function poisWhen() { var p = pois(), m = (p && p.meta) || {}; return monthYear(m.release || m.generated) || 'Sep 2026'; }
  function go(id, opts) { if (S.ctx) S.ctx.navigate(id, opts); }
  /** false for a section the config hides (KPR since 22 Oct 2026): its door and commands are not drawn. */
  function shown(id) { var L = MCD.config && MCD.config.sections; return !L || L.some(function (s) { return s.id === id; }); }
  function btn(label, opts) {
    opts = opts || {};
    var b = el('button', { type: 'button', class: 'btn ' + (opts.cls || 'btn--secondary') + ' ov-btn', title: opts.title || null, aria: opts.aria || null },
      opts.icon ? icon(opts.icon) : null, el('span', { text: label }), opts.after ? icon(opts.after) : null);
    if (opts.run) b.addEventListener('click', function (e) { opts.run(e, b); });
    return b;
  }
  function demoTag() { return el('span', { class: 'demo-tag demo-tag--inline ov-demo', title: 'Angka contoh, hanya untuk ilustrasi', text: 'CONTOH' }); }
  /** 'masked' | 'reveal' | 'veil' (presentation mode "Samarkan nama": every business name becomes initials). */
  function privacyMode() {
    var A = MCD.app, m = A && isFn(A.privacyMode) ? safe(A.privacyMode, A) : null;
    return m ? String(m) : 'masked';
  }
  function veilOn() { return privacyMode() === 'veil'; }

  /* ------------------------------------------- MCD.windows (v5, concept C "Kartu bertahap"; COPY_STYLE_EN item 43) */

  /** MCD.windows when it has `name` (the SHELL lane's module; it may load later or not at all). */
  function winApi(name) { var Wn = MCD.windows; return Wn && typeof Wn === 'object' && isFn(Wn[name]) ? Wn : null; }
  /**
   * A repeated hint (item 39e): MCD.windows.hint(id, node) shows it once per browser (the node the first time, null
   * afterwards). Decided once per mount, so a redraw keeps what this visit showed. Without the shell's hint (or when
   * it fails) the node always shows, as before v5.
   */
  function hintOnce(id, node) {
    if (Object.prototype.hasOwnProperty.call(S.hints, id)) return S.hints[id] ? node : null;
    var Wn = winApi('hint'), shown = true;
    if (Wn) { try { var got = Wn.hint(id, node); shown = got != null && got !== false; } catch (e) { shown = true; } }
    S.hints[id] = shown;
    return shown ? node : null;
  }
  /**
   * A static card in the shared card markup (MCD.windows.card: the same head as the map callout and the detail sheet),
   * else the same parts drawn here (.ov-card): eyebrow, title, at most 3 numbers (the first large), an optional note.
   * spec: {kind, eyebrow, title, demo?, numbers: [{label, value, big?, title?}], note?: {text}}.
   */
  function cardEl(spec) {
    var Wn = winApi('card');
    if (Wn) {
      var n = null;
      try { n = Wn.card(spec); } catch (e) { n = null; }
      if (n && n.nodeType === 1) { if (n.classList) n.classList.add('ov-card--ws'); return n; }
    }
    return ownCard(spec);
  }
  function ownCard(spec) {
    var nums = el('dl', { class: 'ov-card__nums' });
    (spec.numbers || []).slice(0, 3).forEach(function (q, i) {
      nums.appendChild(el('div', { class: 'ov-card__num' + (q.big || i === 0 ? ' is-big' : ''), title: q.title || null },
        el('dt', { class: 'ov-card__k', text: q.label }), el('dd', { class: 'ov-card__v', text: String(q.value) })));
    });
    return el('div', { class: 'ov-card', role: 'group', aria: { label: (spec.eyebrow ? spec.eyebrow + ': ' : '') + spec.title } },
      el('p', { class: 'ov-card__eyebrow' }, el('span', { text: spec.eyebrow || '' }), spec.demo ? demoTag() : null),
      el('p', { class: 'ov-card__title', text: spec.title || '' }),
      nums,
      spec.note && spec.note.text ? el('p', { class: 'ov-card__note', text: spec.note.text }) : null);
  }

  /* ------------------------------------------------------------- motion (item 38) */

  /** MCD.motion (the shell's one motion language) when it is loaded. */
  function motionApi() { var Mo = MCD.motion; return Mo && typeof Mo === 'object' ? Mo : null; }
  function reduced() {
    var Mo = motionApi();
    if (Mo && isFn(Mo.reduced)) return !!safe(Mo.reduced, Mo);
    return !!(U().reducedMotion && U().reducedMotion());
  }
  function durMs(name, fallback) { var Mo = motionApi(), d = Mo && Mo.dur ? Mo.dur[name] : null; return isNum(d) ? d : fallback; }
  /** Keeps a running animation's handle so unmount can stop it ({cancel()} or a stop function). */
  function keepJob(h) {
    if (!h) return;
    if (isFn(h.cancel)) S.jobs.push(h);
    else if (isFn(h)) S.jobs.push({ cancel: h });
  }
  function stopJobs() { var j = S.jobs; S.jobs = []; j.forEach(function (h) { safe(h.cancel, h); }); }
  /** A number counts up once (MCD.motion.countUp, else a local tween with the same ease-out); final text at the end. */
  function countUp(node, to, fmt, ms) {
    if (!node || !isNum(to) || !isFn(fmt)) return;
    if (reduced() || to === 0) { node.textContent = fmt(to); return; }
    var Mo = motionApi();
    if (Mo && isFn(Mo.countUp)) { keepJob(safe(Mo.countUp, Mo, [node, to, { format: fmt, ms: ms }])); return; }
    var tw = U().tween, ez = U().easing;
    if (!isFn(tw)) { node.textContent = fmt(to); return; }
    node.textContent = fmt(0);
    keepJob(tw({ from: 0, to: to, duration: ms || 500, easing: ez && isFn(ez.cubicBezier) ? ez.cubicBezier.apply(null, EASE_OUT) : 'enter',
      onUpdate: function (v) { node.textContent = fmt(v); }, onDone: function () { node.textContent = fmt(to); } }));
  }
  /**
   * The first entrance of an SVG chart (class is-grow): its CSS animations stay paused (is-wait) until the
   * chart is on screen, so a chart below the fold grows when it is scrolled to. A 6 s safety timer; no wait
   * without IntersectionObserver; nothing at all under reduced motion.
   */
  function enterOnView(node, then) {
    if (!node) return;
    if (reduced()) { node.classList.remove('is-grow'); if (then) then(); return; }
    var done = false, io = null, t = 0;
    var go = function () {
      if (done) return;
      done = true;
      if (io) safe(io.disconnect, io);
      clearTimeout(t);
      node.classList.remove('is-wait');
      if (then) then();
    };
    node.classList.add('is-wait');
    if (isFn(W.IntersectionObserver)) {
      try {
        io = new W.IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) go(); }, { threshold: 0.2 });
        io.observe(node);
      } catch (e) { io = null; }
    }
    t = setTimeout(go, io ? 6000 : 0);
    S.jobs.push({ cancel: function () { done = true; if (io) safe(io.disconnect, io); clearTimeout(t); } });
  }
  /** New words in a heading cross-fade in (drill-down titles); nothing on the first draw or under reduced motion. */
  function swapText(node, text) {
    if (!node) return;
    text = String(text);
    if (node.textContent === text) return;
    node.textContent = text;
    if (!S.drawn || reduced()) return;
    node.classList.remove('ov-swap');
    void node.offsetWidth;                 /* restart the animation */
    node.classList.add('ov-swap');
  }
  /** True when a chart was already drawn for this key (same model, mode and width): the redraw is skipped. */
  function drawnFor(name, key) {
    if (S.drawKey[name] === key) return true;
    S.drawKey[name] = key;
    return false;
  }

  /* -------------------------------------------- Google Maps (COPY_STYLE item 22) */

  var GM_BASE = 'https://www.google.com/maps/search/?api=1&query=';
  /** Uses MCD.util.gmaps when the shell has it; the same rules otherwise (UX_FIX_PLAN §2.8). */
  function gmapsUrl(o) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && isFn(G.url)) return G.url(o);
    if (!o) return null;
    if (o.q) return GM_BASE + encodeURIComponent(String(o.q));
    var lat = Number(o.lat), lon = Number(o.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return GM_BASE + (Math.round(lat * 1e5) / 1e5).toFixed(5) + ',' + (Math.round(lon * 1e5) / 1e5).toFixed(5);
  }
  function gmapsLink(o, label) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && isFn(G.link)) { var a0 = safe(G.link, G, [o, { label: label }]); if (a0) return a0; }
    var url = gmapsUrl(o);
    if (!url) return null;
    return el('a', { class: 'btn btn--secondary gm-link', href: url, target: '_blank', rel: 'noopener noreferrer', title: GM_TIP },
      icon('external'), el('span', { text: label || 'Buka di Google Maps' }));
  }
  function kecQuery(r) { return 'Kecamatan ' + r.name + (r.kota ? ', ' + r.kota : ''); }

  /* ----------------------------------------------------------- pure geometry */

  /** A round axis maximum: 1, 2, 2.5 or 5 times a power of ten, at or above v. */
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * p >= v - 1e-12) return steps[i] * p;
    return 10 * p;
  }
  /**
   * Columns with a constant depth. values → {axisMax, base, plotH, grid: [{v, y}], bars: [{i, x, w, y, h,
   * side: [[x, y]…], top: [[x, y]…], shadow: {cx, cy, rx, ry}, label: {x, y}, mid}]}.
   * The front face height is value ÷ axisMax × plotH from the baseline; depth never depends on the value.
   */
  function columnsGeo(values, o) {
    o = o || {};
    var width = o.width || 640, height = o.height || 300, dx = o.dx != null ? o.dx : DEPTH.x, dy = o.dy != null ? o.dy : DEPTH.y;
    var padL = o.padL != null ? o.padL : 44, padR = (o.padR != null ? o.padR : 12) + dx, padT = (o.padT != null ? o.padT : 22) + dy, padB = o.padB != null ? o.padB : 44;
    var n = Math.max(1, values.length), max = 0;
    values.forEach(function (v) { if (isNum(v) && v > max) max = v; });
    var axisMax = o.axisMax || niceMax(max);
    var base = height - padB, plotH = Math.max(10, base - padT), slot = (width - padL - padR) / n;
    var w = Math.max(6, Math.min(56, slot * 0.56));
    var bars = values.map(function (v, i) {
      var val = isNum(v) && v > 0 ? v : 0, h = val / axisMax * plotH, x = padL + slot * i + (slot - w) / 2, y = base - h;
      return {
        i: i, x: x, w: w, y: y, h: h, mid: x + w / 2,
        side: [[x + w, y], [x + w + dx, y - dy], [x + w + dx, base - dy], [x + w, base]],
        top: [[x, y], [x + dx, y - dy], [x + w + dx, y - dy], [x + w, y]],
        shadow: { cx: x + w / 2 + dx / 2, cy: base + 2, rx: w / 2 + dx, ry: Math.max(2, dy * 0.8) },
        label: { x: x + w / 2 + dx / 2, y: y - dy - 6 }
      };
    });
    var grid = [0, 0.25, 0.5, 0.75, 1].map(function (f) { return { f: f, v: axisMax * f, y: base - plotH * f }; });
    return { width: width, height: height, axisMax: axisMax, base: base, plotH: plotH, slot: slot, padL: padL, grid: grid, bars: bars, dx: dx, dy: dy };
  }
  /** Horizontal extruded bars (phones and the UREG/USAK chart): value → length from the left edge x0. */
  function hbarsGeo(values, o) {
    o = o || {};
    var width = o.width || 360, rowH = o.rowH || 30, barH = o.barH || 14, dx = o.dx != null ? o.dx : 6, dy = o.dy != null ? o.dy : 4;
    var x0 = o.x0 != null ? o.x0 : 110, padR = (o.padR != null ? o.padR : 48) + dx, padT = (o.padT != null ? o.padT : 6) + dy;
    var max = 0;
    values.forEach(function (v) { if (isNum(v) && v > max) max = v; });
    var axisMax = o.axisMax || niceMax(max), plotW = Math.max(10, width - x0 - padR);
    var bars = values.map(function (v, i) {
      var val = isNum(v) && v > 0 ? v : 0, len = val / axisMax * plotW, y = padT + i * rowH + (rowH - barH) / 2, x1 = x0 + len;
      return {
        i: i, x: x0, y: y, len: len, h: barH, cy: y + barH / 2,
        cap: [[x1, y], [x1 + dx, y - dy], [x1 + dx, y + barH - dy], [x1, y + barH]],
        top: [[x0, y], [x0 + dx, y - dy], [x1 + dx, y - dy], [x1, y]]
      };
    });
    return { width: width, height: padT + values.length * rowH + 8, x0: x0, plotW: plotW, axisMax: axisMax, bars: bars, rowH: rowH, dx: dx, dy: dy,
      xOf: function (v) { return x0 + (isNum(v) ? Math.max(0, v) : 0) / axisMax * plotW; } };
  }
  function arcPath(cx, cy, r0, r1, a0, a1) {
    var big = a1 - a0 > Math.PI ? 1 : 0;
    function pt(r, a) { return (cx + r * Math.sin(a)).toFixed(2) + ' ' + (cy - r * Math.cos(a)).toFixed(2); }
    if (a1 - a0 >= Math.PI * 2 - 1e-6) {
      return 'M ' + pt(r1, 0) + ' A ' + r1 + ' ' + r1 + ' 0 1 1 ' + pt(r1, Math.PI) + ' A ' + r1 + ' ' + r1 + ' 0 1 1 ' + pt(r1, 0) +
        ' M ' + pt(r0, 0) + ' A ' + r0 + ' ' + r0 + ' 0 1 0 ' + pt(r0, Math.PI) + ' A ' + r0 + ' ' + r0 + ' 0 1 0 ' + pt(r0, 0) + ' Z';
    }
    return 'M ' + pt(r1, a0) + ' A ' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + pt(r1, a1) + ' L ' + pt(r0, a1) + ' A ' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + pt(r0, a0) + ' Z';
  }
  /**
   * Donut with a wall: the face is a true circle (angles stay exact); the wall is the same ring shifted
   * `wall` px down, drawn first. slices [{key, value}] → {total, arcs: [{key, value, share, a0, a1, d, wallD, lx, ly}]}.
   */
  function donutGeo(slices, o) {
    o = o || {};
    var cx = o.cx || 100, cy = o.cy || 100, r = o.r || 90, t = o.thickness || 28, wall = o.wall != null ? o.wall : 10, r0 = r - t;
    var total = 0;
    slices.forEach(function (s) { if (isNum(s.value) && s.value > 0) total += s.value; });
    var a = 0, arcs = [];
    slices.forEach(function (s) {
      var v = isNum(s.value) && s.value > 0 ? s.value : 0;
      if (!v || !total) return;
      var share = v / total, a0 = a, a1 = a + share * Math.PI * 2, mid = (a0 + a1) / 2, rm = r - t / 2;
      arcs.push({ key: s.key, value: v, share: share, a0: a0, a1: a1, d: arcPath(cx, cy, r0, r, a0, a1), wallD: arcPath(cx, cy + wall, r0, r, a0, a1),
        lx: cx + rm * Math.sin(mid), ly: cy - rm * Math.cos(mid) });
      a = a1;
    });
    return { cx: cx, cy: cy, r: r, r0: r0, wall: wall, total: total, arcs: arcs };
  }
  /** A column with rounded top corners and a square foot on the baseline (glass columns, item 31). */
  function colPath(x, y, w, h, r) {
    if (!(h > 0) || !(w > 0)) return '';
    r = Math.max(0, Math.min(r, w / 2, h));
    var f = function (v) { return (Math.round(v * 10) / 10).toString(); };
    return 'M' + f(x) + ',' + f(y + h) + ' V' + f(y + r) + ' Q' + f(x) + ',' + f(y) + ' ' + f(x + r) + ',' + f(y) +
      ' H' + f(x + w - r) + ' Q' + f(x + w) + ',' + f(y) + ' ' + f(x + w) + ',' + f(y + r) + ' V' + f(y + h) + ' Z';
  }

  /* ------------------------------------------- SMA students (pure, shared display rule) */

  /**
   * The SMA of MCD_SMA_STUDENTS under the shared display rule (every lane): rows with duplicateOf are
   * dropped (also duplicateOf: null, an OSM point that is not a separate school); 17+ = Dapodik's own age
   * count ktp17Resmi when present, else ktp17Est marked "perkiraan"; students === 0 = "kemungkinan tidak
   * aktif", left out of every ranking. Expected: 366 SMA, 160.411 siswa, about 79.985 aged 17+.
   */
  function smaPool(D) {
    var list = D && Array.isArray(D.schools) ? D.schools : [];
    return list.filter(function (s) { return s && !Object.prototype.hasOwnProperty.call(s, 'duplicateOf'); });
  }
  function smaKtp(s) {
    if (isNum(s.ktp17Resmi)) return { v: s.ktp17Resmi, est: false };
    return { v: isNum(s.ktp17Est) ? s.ktp17Est : 0, est: true };
  }
  /** metric 'all' (students) or '17' (aged 17+) → {v, est}. */
  function smaMetric(s, metric) {
    if (metric === '17') return smaKtp(s);
    return { v: isNum(s.students) ? s.students : 0, est: s.studentsSource === 'perkiraan' };
  }
  function smaActive(s) { return isNum(s.students) && s.students > 0; }
  function smaTotals(D) {
    var t = { sma: 0, students: 0, ktp17: 0, inactive: 0, ktpEst: 0, studentsEst: 0 };
    smaPool(D).forEach(function (s) {
      if (!smaActive(s)) { t.inactive++; return; }
      var k = smaKtp(s);
      t.sma++; t.students += s.students; t.ktp17 += k.v;
      if (k.est) t.ktpEst++;
      if (s.studentsSource === 'perkiraan') t.studentsEst++;
    });
    return t;
  }
  function smaKecName(D, id) { var k = D && D.kecamatan && D.kecamatan[id]; return k && k.name ? k.name : ''; }
  function byValue(a, b) {
    return (b.value - a.value) || ((isNum(a.distKm) ? a.distKm : 99) - (isNum(b.distKm) ? b.distKm : 99)) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }
  /** The largest SMA by the metric, optionally inside one kecamatan: [{id, npsn, name, kecamatanId, value, est, …}]. */
  function smaTop(D, o) {
    o = o || {};
    var metric = o.metric === '17' ? '17' : 'all', n = isNum(o.n) ? o.n : TOP_N;
    return smaPool(D).filter(function (s) { return smaActive(s) && (!o.kec || s.kecamatanId === o.kec); }).map(function (s) {
      var m = smaMetric(s, metric), k = smaKtp(s);
      return { id: s.npsn ? String(s.npsn) : 'osm:' + s.lon + ',' + s.lat, npsn: s.npsn ? String(s.npsn) : null, name: String(s.name || ''),
        kecamatanId: s.kecamatanId || null, kelurahanId: s.kelurahanId || null, kecName: smaKecName(D, s.kecamatanId),
        value: m.v, est: m.est, students: s.students, k17: Math.min(k.v, s.students), k17Est: k.est,
        lon: s.lon, lat: s.lat, distKm: s.distKm, status: s.status || 'unknown', bentuk: s.bentuk || null };
    }).sort(byValue).slice(0, n);
  }
  /** The kecamatan with the most students (or students 17+) in the active SMA: [{id, name, kota, value, sma, est}]. */
  function smaKecamatan(D, o) {
    o = o || {};
    var metric = o.metric === '17' ? '17' : 'all', n = isNum(o.n) ? o.n : TOP_N, by = {};
    smaPool(D).forEach(function (s) {
      if (!smaActive(s) || !s.kecamatanId) return;
      var a = by[s.kecamatanId] || (by[s.kecamatanId] = { id: s.kecamatanId, name: smaKecName(D, s.kecamatanId) || s.kecamatanId,
        kota: (D.kecamatan && D.kecamatan[s.kecamatanId] && D.kecamatan[s.kecamatanId].kota) || '', value: 0, sma: 0, est: false, distKm: 99,
        students: 0, k17: 0, k17Est: false });
      var m = smaMetric(s, metric), k = smaKtp(s);
      a.value += m.v; a.sma += 1; a.est = a.est || m.est;
      a.students += s.students; a.k17 += Math.min(k.v, s.students); a.k17Est = a.k17Est || k.est;
      if (isNum(s.distKm) && s.distKm < a.distKm) a.distKm = s.distKm;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(byValue).slice(0, n);
  }
  /** "SMAN 4 KOTA DEPOK" → "SMAN 4 Kota Depok": all-caps names read calmer in title case; school acronyms stay. */
  var KEEP_UP = { SMA: 1, SMAN: 1, SMAS: 1, SMAIT: 1, SMAK: 1, SMTK: 1, SMK: 1, MA: 1, IT: 1, PGRI: 1, DITKESAD: 1, PSKD: 1, BPK: 1, TNI: 1, KORPRI: 1, IPEKA: 1, DKI: 1, BPI: 1, YPI: 1, SPK: 1 };
  var LOW_UP = { AL: 'Al', AR: 'Ar', AN: 'An', AS: 'As', ASY: 'Asy', AT: 'At', AZ: 'Az', EL: 'El', BIN: 'Bin', DAN: 'dan', DI: 'di' };
  function tidyName(name) {
    var s = String(name || '').trim();
    if (!s || /[a-z]/.test(s)) return s;
    return s.split(/(\s+|-)/).map(function (w) {
      if (!/[A-Z]/.test(w)) return w;
      if (KEEP_UP[w]) return w;
      if (LOW_UP[w]) return LOW_UP[w];
      if (/^(?=[MDCLXVI]+$)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/.test(w)) return w;   /* roman numerals */
      if (w.length <= 3 && !/[AEIOU]/.test(w)) return w;                                             /* PKP, BPK */
      return w.charAt(0) + w.slice(1).toLowerCase();
    }).join('');
  }
  /** Which TNI-foundation SMA (data/tni-schools.js) by NPSN: {npsn: matra}. */
  function tniSet() {
    var T = W.MCD_TNI_SCHOOLS;
    if (ONCE.tni && ONCE.tni.ref === T) return ONCE.tni.set;
    var set = {};
    (T && Array.isArray(T.rows) ? T.rows : []).forEach(function (r) { if (r && r.category === 'school' && r.npsn) set[String(r.npsn)] = r.matra || 'TNI'; });
    ONCE.tni = { ref: T, set: set };
    return set;
  }
  /** The item-34 symbol of an SMA row: shape = jenis, colour = status, star = TNI foundation. */
  function smaSymbol(row) {
    var SC = MCD.schools, cls = SC && isFn(SC.smaClass) ? safe(SC.smaClass, SC, [row.name, !!row.npsn]) : 1;
    var tni = !!(row.npsn && tniSet()[row.npsn]);
    return { shape: cls === 2 ? 'diamond' : 'circle', tone: tni ? 'tni' : (row.status === 'negeri' ? 'negeri' : 'swasta'), star: tni };
  }
  /**
   * The symbol beside a school name: the same picture as the Sekolah map (MCD.schools.map.chip, item 34)
   * when that module is loaded, else the token-coloured SVG of the chart kit (same shape and colours).
   */
  function smaSymbolFor(row, given) {
    var spec = given || smaSymbol(row), SM = MCD.schools && MCD.schools.map;
    if (SM && isFn(SM.spec) && isFn(SM.chip)) {
      var sp = safe(SM.spec, SM, [{ jenis: spec.shape === 'diamond' ? 'ma' : 'sma', negeri: spec.tone === 'negeri', unknown: row.status === 'unknown', tni: spec.star, students: row.students }]);
      var theme = S.ctx && isFn(S.ctx.theme) ? S.ctx.theme() : (MCD.app && isFn(MCD.app.theme) ? MCD.app.theme() : 'night');
      var node = sp ? safe(SM.chip, SM, [sp, theme, { cls: 'ov-sym' }]) : null;
      if (node && node.nodeType === 1) return node;
    }
    return spec;
  }
  function statusWord(row) {
    if (row.npsn && tniSet()[row.npsn]) return 'Yayasan TNI';
    return row.status === 'negeri' ? 'Negeri' : (row.status === 'unknown' ? 'Jenis belum diketahui' : 'Swasta');
  }

  /* ------------------------------------------------------- focus on a map (cross-section) */

  /**
   * Opens a section at one place: MCD.app.focus({section, kind, id}) when the shell has it, else the same
   * action through navigate (the section's onAction handles 'focus:<kind>:<id>'). Returns which path ran.
   */
  function focusOn(section, kind, id) {
    var A = MCD.app;
    if (A && isFn(A.focus)) { safe(A.focus, A, [{ section: section, kind: kind, id: id }]); return 'focus'; }
    if (S.ctx) S.ctx.navigate(section, { action: 'focus:' + kind + ':' + id });
    else if (A && isFn(A.navigate)) A.navigate(section, { action: 'focus:' + kind + ':' + id });
    return 'navigate';
  }
  /** The Sekolah row index of an SMA without NPSN (OpenStreetMap only): same point in MCD.schools.idx. */
  function appSchoolId(row) {
    var I = MCD.schools && MCD.schools.idx;
    if (!I || !isNum(row.lon) || !isNum(row.lat)) return null;
    var best = -1, bestD = 4e-4, key = String(row.name || '').toLowerCase();
    for (var i = 0; i < I.n; i++) {
      if (I.npsn && I.npsn[i]) continue;
      var d = Math.abs(I.lon[i] - row.lon) + Math.abs(I.lat[i] - row.lat);
      if (d < bestD || (d === bestD && String(I.name[i]).toLowerCase() === key)) { bestD = d; best = i; }
    }
    return best >= 0 ? best : null;
  }
  function focusSchool(row) {
    if (!row) return null;
    if (row.npsn) return focusOn('schools', 'sma', row.npsn);
    var id = appSchoolId(row);
    if (id != null) return focusOn('schools', 'sma', id);
    var SC = MCD.schools;
    if (SC && isFn(SC.ensureData)) {
      Promise.resolve(safe(SC.ensureData, SC)).then(function () {
        var j = appSchoolId(row);
        if (j != null) focusOn('schools', 'sma', j); else go('schools');
      }, function () { go('schools'); });
      return 'pending';
    }
    go('schools');
    return 'navigate';
  }

  /**
   * Item 38 entry point from the SMA drill-down: the kecamatan opens in Sekolah and the map enters the kecamatan focus
   * mode there. Sekolah's own action 'schools:kec:<id>' (its showKec: highlight, drawer, focus) when it handles it;
   * otherwise the shared selection {kind: 'smaKec', id, extra: {kecamatanId}}, which Sekolah's drawer and map.js's
   * focus mode both follow. The user's view (Sederhana or Detail) is kept, as for a school row. Returns false for a
   * missing or malformed id.
   */
  function openSchoolsKec(id) {
    id = id == null ? '' : String(id);
    if (!/^\d\d\.\d\d\.\d\d$/.test(id)) return false;
    go('schools', { action: 'schools:kec:' + id, fallback: function () { selectSmaKec(id); } });
    return true;
  }
  /** The fallback of openSchoolsKec: the shared selection, else (an older shell) the map's focus mode alone. */
  function selectSmaKec(id) {
    var A = MCD.app, sel = { kind: 'smaKec', id: id, extra: { kecamatanId: id } };
    if (A && isFn(A.select)) { safe(A.select, A, [sel]); return 'select'; }
    var M = MCD.map;
    if (M && isFn(M.focusArea)) { safe(M.focusArea, M, [{ kind: 'kecamatan', id: id }]); return 'focus'; }
    return null;
  }

  /* ------------------------------------- Sasaran EDC / Sasaran LVM (pure, items 32, 35, 37) */

  /** A tier's chip words and its plain explanation: MCD.sme.TIERS (Merchant's own words), else the fallback. */
  function tierInfo(id, c) {
    var key = normTier(id), ST = MCD.sme && MCD.sme.TIERS;
    var t = ST ? (ST[id] || ST[key] || (key === 'edc' ? ST['edc+lvm'] : null)) : null, f = TIER[key] || null;
    if (!t && !f) return null;
    return { id: id, label: String((c && c.tierLabel) || (t && (t.label || t.short)) || (f && f.label) || id),
      words: String((t && t.title) || (f && f.words) || ''), tone: f ? f.tone : 'plain' };
  }
  /**
   * The named merchants of one panel: MCD.sme.edcCandidates({tiers, limit}) feature-detected →
   * {state: 'ok' | 'empty' | 'missing', items, skipped}. Order as given (tier, then the open-data rank).
   * A name the listing rules mask (a practitioner, "Dr W***") reads like an error in a short showcase, so it
   * is left out here (Merchant lists it), in every privacy mode so the list stays the same in presentation mode.
   */
  function sasNamed(sme, key, n) {
    var P = SAS[key] || SAS.edc, lim = isNum(n) ? n : TOP_N;
    if (!sme || !isFn(sme.edcCandidates)) return { state: 'missing', items: [], skipped: 0 };
    var got = safe(sme.edcCandidates, sme, [{ tiers: P.tiers.slice(), limit: lim + 30 }]);
    if (!Array.isArray(got)) return { state: 'missing', items: [], skipped: 0 };
    var skipped = 0;
    var masked = function (c) {
      var pub = publicName(c.idx), m = pub && isFn(sme.maskName) ? safe(sme.maskName, sme, [pub, 'masked']) : null;
      return /\*/.test(String(m != null ? m : (c.name || '')));
    };
    var items = got.filter(function (c) {
      if (!c || c.idx == null || P.tiers.indexOf(normTier(c.tier)) < 0) return false;
      /* item 42: Sasaran EDC names local merchants only (an older engine still has national chains in this tier) */
      if (key === 'edc' && c.largeChain) return false;
      if (masked(c)) { skipped++; return false; }
      return true;
    }).slice(0, lim);
    return { state: items.length ? 'ok' : 'empty', items: items, skipped: skipped };
  }
  /**
   * One MCD.sme.edcTierCounts result → {edc: Sasaran EDC + Naik ke EDC, lvm, naik}. Reads the v3 ids
   * ({'edc+lvm', 'naik-edc', lvm, edc: both}) and the item-35 ids ({edc, 'naik-edc', lvm}); `combined` says that a
   * renamed result's `edc` already holds both EDC tiers.
   */
  function tierTally(c, combined) {
    var naik = c['naik-edc'] || 0;
    var only = isNum(c['edc+lvm']) ? c['edc+lvm'] : Math.max(0, (c.edc || 0) - (combined ? naik : 0));
    var edc = only + naik;
    /* item 42: Sasaran EDC counts local merchants only. A Merchant engine with the 'nasional' tier already leaves the
       national chains out; an older one counts them inside the EDC tiers and gives edcChain / edcLocal (v4 keys). */
    if (!isNum(c.nasional) && c.edcChain > 0) edc = isNum(c.edcLocal) ? c.edcLocal : Math.max(0, edc - c.edcChain);
    return { edc: edc, lvm: c.lvm || 0, naik: naik };
  }
  /**
   * Item 42: the size of the group "Jaringan nasional (lewat kantor pusat)", from one edcTierCounts result. It is the
   * number Merchant shows under the same label (its Kandidat EDC group and its rail), so the line and the screen it
   * opens agree (spec §10.3): nasional (the whole group: 4.110 on the public file, EDC_SCORE.md §7.2), else nasionalEdc, else the v4 alias
   * edcChain (an older engine: the chains inside the EDC tiers).
   */
  function natTally(c) {
    if (!c) return 0;
    if (isNum(c.nasional)) return c.nasional;
    if (isNum(c.nasionalEdc)) return c.nasionalEdc;
    return isNum(c.edcChain) ? c.edcChain : 0;
  }
  /**
   * Item 42: does the group also hold chains that would otherwise be Sasaran LVM (NASIONAL_ALL in sme.js: 1.688 of the
   * 4.110)? Then Sasaran LVM leaves them out too and carries the same line. From edcTierCounts: nasional > nasionalEdc;
   * from the candidates alone (no edcTierCounts): MCD.sme.nasionalAll() says it.
   */
  function natInLvm(c, sme) {
    if (c && isNum(c.nasional) && isNum(c.nasionalEdc)) return c.nasional > c.nasionalEdc;
    return !!(sme && isFn(sme.nasionalAll) && safe(sme.nasionalAll, sme) === true);
  }
  /** After the rename, does edcTierCounts().edc count Sasaran EDC alone or both EDC tiers? One check per model. */
  function edcCombined(sme, all) {
    if (isNum(all['edc+lvm']) || !isNum(all.edc) || !(all['naik-edc'] > 0) || !isFn(sme.edcCandidates)) return false;
    var only = safe(sme.edcCandidates, sme, [{ tiers: ['edc'], limit: 0 }]);
    return Array.isArray(only) && only.length !== all.edc && only.length + all['naik-edc'] === all.edc;
  }
  /**
   * Targets per kecamatan and in total: {by: {kecId: {edc, lvm, naik}}, total: {edc, lvm, naik}} or null.
   * edc counts both EDC tiers ('edc' and 'naik-edc'). MCD.sme.edcTierCounts per kecamatan when the list of
   * kecamatan is known (about 10 ms), else one pass over edcCandidates({limit: 0}).
   */
  function sasCounts(sme, ids) {
    if (!sme) return null;
    var by = {}, total = { edc: 0, lvm: 0, naik: 0 }, counted = false, combined = false, nat = 0, natLvm = false;
    var put = function (id, c, both) {
      var o = tierTally(c, both);
      if (o.edc || o.lvm) by[id] = o;
    };
    if (isFn(sme.edcTierCounts)) {
      var all = safe(sme.edcTierCounts, sme, [{}]);
      if (all && typeof all === 'object') {
        combined = edcCombined(sme, all);
        total = tierTally(all, combined);
        nat = natTally(all);
        natLvm = nat > 0 && natInLvm(all, sme);
        counted = true;
        if (Array.isArray(ids) && ids.length) {
          ids.forEach(function (id) { var c = safe(sme.edcTierCounts, sme, [{ kecamatanId: id }]); if (c && typeof c === 'object') put(id, c, combined); });
          return { by: by, total: total, nat: nat, natLvm: natLvm };
        }
      }
    }
    if (!isFn(sme.edcCandidates)) return null;
    var list = safe(sme.edcCandidates, sme, [{ limit: 0 }]);
    if (!Array.isArray(list)) return null;
    var tally = {}, sum = { edc: 0, lvm: 0, naik: 0 }, natN = 0, natTier = 0;
    list.forEach(function (c) {
      var tier = c ? normTier(c.tier) : null;
      /* item 42: the national group, and (an older engine) national chains still inside the EDC tiers, stay apart */
      if (tier === 'nasional' || (c && c.largeChain && (tier === 'edc' || tier === 'naik-edc'))) { natN++; if (tier === 'nasional') natTier++; return; }
      if (!tier || !TIER[tier] || tier === 'nasional') return;
      var t = tally[c.kecamatanId || '?'] || (tally[c.kecamatanId || '?'] = { edc: 0, 'naik-edc': 0, lvm: 0 });
      t[tier]++;
      if (tier === 'lvm') sum.lvm++; else { sum.edc++; if (tier === 'naik-edc') sum.naik++; }
    });
    if (!counted) { total = sum; nat = natN; natLvm = natTier > 0 && natInLvm(null, sme); }
    Object.keys(tally).forEach(function (id) { if (id !== '?') put(id, tally[id], false); });
    return { by: by, total: total, nat: nat, natLvm: natLvm };
  }
  /** The kecamatan with the most targets of one panel: [{id, value}], ties by id (stable). */
  function sasTopKec(counts, key, n) {
    if (!counts || !counts.by) return [];
    var f = key === 'lvm' ? 'lvm' : 'edc';
    return Object.keys(counts.by).map(function (id) { return { id: id, value: counts.by[id][f] || 0 }; })
      .filter(function (r) { return r.value > 0; })
      .sort(function (a, b) { return b.value - a.value || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); })
      .slice(0, isNum(n) ? n : TOP_N);
  }
  /** The public listing name of MCD_SME_POIS row idx (Overture): the only name ever sent to Google. */
  function publicName(idx) {
    var P = W.MCD_SME_POIS, row = P && Array.isArray(P.rows) ? P.rows[idx] : null;
    return row && row[3] != null ? String(row[3]) : '';
  }
  /** "Nilai belanja sangat besar" (item 37: words, never a bare score). */
  function ticketWords(c) {
    var t = c && c.ticketLabel ? String(c.ticketLabel) : '';
    return t ? 'Nilai belanja ' + t.charAt(0).toLowerCase() + t.slice(1) : '';
  }
  /** Daya beli area of a point: MCD_AREA_WEALTH per kelurahan, else per kecamatan ({level, why} or null). */
  function wealthAt(c) {
    var A = W.MCD_AREA_WEALTH;
    if (!A || !isFn(A.at)) return null;
    var e = (c.kelurahanId && safe(A.at, A, [c.kelurahanId])) || (c.kecamatanId && safe(A.at, A, [c.kecamatanId])) || null;
    return e && e.level ? { level: String(e.level), why: e.why ? String(e.why) : '' } : null;
  }
  /**
   * The same three factors from the candidate itself, only while MCD.sme.factors is missing: nilai belanja from
   * the ticket class (0 kecil, 1 sedang, 2–3 besar), keramaian from the open-data busyness (Merchant's BUSY_MIN
   * is "tinggi"), daya beli area from MCD_AREA_WEALTH.
   */
  function factorsLocal(c) {
    var sm = MCD.sme || {}, hi = isNum(sm.BUSY_MIN) ? sm.BUSY_MIN : 0.6, t = isNum(c.ticketClass) ? c.ticketClass : null;
    return {
      ticket: t == null ? null : { level: t <= 0 ? 'kecil' : (t === 1 ? 'sedang' : 'besar'), why: '' },
      crowd: isNum(c.busy) ? { level: c.busy >= hi ? 'tinggi' : (c.busy >= hi * 0.6 ? 'sedang' : 'rendah'),
        why: c.established === true ? 'data usaha lengkap' : (c.established === false ? 'data usaha belum lengkap' : '') } : null,
      wealth: wealthAt(c)
    };
  }
  /**
   * Item 37 for one candidate: its own `factors` or MCD.sme.factors(idx) (Merchant's rule) when present, else factorsLocal →
   * [{key, label, word, step, why}] for the rankedBars level dots, or null when nothing is known. Never a score.
   */
  function factorsOf(c) {
    if (!c || c.idx == null) return null;
    var sm = MCD.sme, got = c.factors && typeof c.factors === 'object' ? c.factors : (sm && isFn(sm.factors) ? safe(sm.factors, sm, [c.idx]) : null);
    if (!got || typeof got !== 'object') got = factorsLocal(c);
    var out = FACTORS.map(function (f) {
      var v = got[f.key] || null, lv = v && v.level ? String(v.level).toLowerCase() : '';
      return { key: f.key, label: f.label, word: lv, step: LEVEL_STEP[lv] || 0, why: v && v.why ? String(v.why) : '' };
    });
    return out.some(function (l) { return l.step > 0; }) ? out : null;
  }

  /* --------------------------------------------------------------- the model */

  function poiCount() {
    var p = pois();
    if (!p || !Array.isArray(p.rows)) return null;
    if (ONCE.poi.ref === p) return ONCE.poi.n;
    var n = 0;
    p.rows.forEach(function (r) { if (r && r[2] >= 0 && r[2] <= 11) n++; });
    ONCE.poi = { ref: p, n: n };
    return n;
  }
  /** Public merchants per kecamatan and jenis usaha, summed from the internal spatial index (UX_FIX_PLAN D1). */
  function indexCats() {
    var T = MCD.territory, H = W.MCD_TERRITORY_HEX;
    if (!T || !H || !isFn(T.tiles)) return null;
    if (ONCE.tileCats.ref === H) return ONCE.tileCats.by;
    var by = {};
    safe(function () {
      T.tiles().forEach(function (t) {
        var p = t.potential || {}, o = by[t.kecamatanId] || (by[t.kecamatanId] = { grocery: 0, restaurant: 0, other: 0 });
        o.grocery += p.grocery || 0; o.restaurant += p.restaurant || 0; o.other += p.other || 0;
      });
    });
    ONCE.tileCats = { ref: H, by: by };
    return by;
  }
  function homeKec() {
    var A = W.MCD_ADMIN_AREAS, b = MCD.config && MCD.config.branch;
    if (A && isFn(A.locate) && b && isNum(b.lat) && isNum(b.lon)) {
      var loc = safe(A.locate, A, [b.lon, b.lat]);
      if (loc && loc.kecamatanId) return loc.kecamatanId;
    }
    return HOME_KEC;
  }
  function sigNow() {
    var T = MCD.territory;
    return [MCD.data && MCD.data.version, demoOn(), rows('lvm').length, rows('edc').length, rows('lvm_kpi').length, rows('sekolah').length,
      !!(T && isFn(T.ready) && T.ready()), !!MCD.lvm, !!W.MCD_SCHOOLS, !!W.MCD_SMA_STUDENTS, !!(MCD.sme && isFn(MCD.sme.edcCandidates)), !!MCD.distance, !!MCD.places].join('|');
  }

  function computeModel() {
    var T = MCD.territory, L = MCD.lvm, lvmRows = rows('lvm');
    var tReady = !!(T && isFn(T.ready) && T.ready());
    var M = { id: ++S.mid, tReady: tReady, demo: demoOn(), hasLvm: lvmRows.length > 0, kec: [], byId: {}, asOf: null, home: homeKec() };
    M.asOf = (MCD.data && MCD.data.meta && MCD.data.meta.lvm && MCD.data.meta.lvm.asOf) || null;
    var agg = L && isFn(L.aggregate) ? safe(L.aggregate, L, ['kecamatan']) : null, st = null;
    if (tReady) {
      if (L && isFn(L.territoryInput)) st = safe(function () { return T.stats(L.territoryInput()); });
      if (!st && isFn(T.statsFromRecords)) st = safe(T.statsFromRecords, T, [lvmRows, rows('edc')]);
    }
    M.stats = st || null; M.agg = agg || null;
    M.hasBank = st ? !!st.hasBank : !!(agg ? agg.hasLvm : M.hasLvm);
    var t = st && st.totals, at = agg && agg.totals;
    if (t) {
      M.potential = t.potential; M.matched = M.hasBank ? t.acquired : null; M.unlisted = M.hasBank ? (t.unlisted || 0) : 0;
      M.notYet = M.hasBank ? t.notYet : null; M.coverage = M.hasBank ? t.coverage : null;
    } else if (at) {
      M.potential = at.potential; M.matched = M.hasBank ? at.acquired : null; M.unlisted = M.hasBank ? (at.offMap ? at.offMap.all : 0) : 0;
      M.notYet = M.hasBank ? at.notYet : null; M.coverage = M.hasBank ? at.coverageKnown : null;
    } else {
      M.potential = poiCount(); M.matched = null; M.unlisted = 0; M.notYet = null; M.coverage = null;
    }
    M.lvm15 = M.hasBank && isNum(M.matched) ? M.matched + (M.unlisted || 0) : null;
    M.known = isNum(M.potential) ? M.potential + (M.unlisted || 0) : null;

    /* LVM file facts (UX_FIX_PLAN B-06: one meaning per number) */
    var sm = L && isFn(L.summary) ? safe(L.summary, L) : null;
    var own = 0, ownActive = 0;
    lvmRows.forEach(function (r) { if (r && String(r.branchCode || '') === HOME) { own++; if (r.status === 'active') ownActive++; } });
    M.storesOwn = sm && isNum(sm.storesOwnBranch) ? sm.storesOwnBranch : own;
    M.activeOwn = sm && isNum(sm.activeOwnBranch) ? sm.activeOwnBranch : ownActive;

    /* branch KPIs (UREG / USAK) */
    var kp = MCD.sme && isFn(MCD.sme.kpi) ? safe(MCD.sme.kpi, MCD.sme) : null;
    var kRows = kp && Array.isArray(kp.rows) ? kp.rows : rows('lvm_kpi').filter(function (r) { return r && !r.isTotal; });
    M.kpi = kRows.filter(function (r) { return r && (isNum(r.uregPct) || isNum(r.usakPct)); });
    M.kpiHome = M.kpi.filter(function (r) { return r.home || String(r.code) === HOME; })[0] || null;
    M.kpiAsOf = (kp && kp.asOf) || (M.kpiHome && M.kpiHome.asOf) || null;

    /* per kecamatan in the 15 km focus */
    if (tReady) {
      var cats = null;
      safe(function () {
        T.kecamatan().forEach(function (k) {
          var ks = (st && st.kecamatan && st.kecamatan[k.id]) || {}, a = agg && agg.areas ? agg.areas[k.id] : null;
          var pot = isNum(ks.potential) ? ks.potential : (k.potential || 0), unl = M.hasBank ? (ks.unlisted || 0) : 0;
          if (pot + unl <= 0) return;
          var cat = {};
          CATS.forEach(function (c) {
            if (a && a.byCategory && a.byCategory[c.key]) cat[c.key] = a.byCategory[c.key].potential || 0;
            else { cats = cats || indexCats() || {}; cat[c.key] = (cats[k.id] || {})[c.key] || 0; }
          });
          var dist = isNum(k.distKm) ? k.distKm : (k.label ? hav(MABES.lat, MABES.lon, k.label[1], k.label[0]) : null);
          var r = { id: k.id, name: k.name, kota: k.kotaName || '', dist: dist, in15: isNum(k.in15) ? k.in15 : 1, potential: pot, unlisted: unl,
            known: pot + unl, notYet: M.hasBank ? (ks.notYet || 0) : null, coverage: M.hasBank && isNum(ks.coverage) ? ks.coverage : null,
            band: M.hasBank ? (ks.band || 'noData') : 'potential', ranked: !!ks.ranked, cat: cat };
          M.kec.push(r); M.byId[r.id] = r;
        });
      });
    }
    M.rel = st && st.relative && st.relative.kecamatan && st.relative.kecamatan.applied ? st.relative.kecamatan : null;
    M.cats = CATS.map(function (c) {
      var o = { key: c.key, label: c.label, color: c.color, potential: 0 };
      M.kec.forEach(function (r) { o.potential += r.cat[c.key] || 0; });
      return o;
    });
    M.top10 = topColumns(M);
    M.priority = priorityList(M, 3);
    /* Sasaran EDC / Sasaran LVM per kecamatan (item 35b): once per data version */
    M.sas = MCD.sme ? safe(sasCounts, null, [MCD.sme, M.kec.map(function (k) { return k.id; })]) || null : null;
    return M;
  }

  /** The 10 kecamatan with the most merchants within 15 km; Cipayung (the branch) replaces no. 10 if needed. */
  function topColumns(M) {
    var list = M.kec.filter(function (r) { return r.in15 >= 0.5; });
    if (!list.length) list = M.kec.slice();
    list.sort(function (a, b) { return b.known - a.known || (a.dist || 0) - (b.dist || 0); });
    var top = list.slice(0, 10), home = M.byId[M.home];
    if (home && top.indexOf(home) < 0) { if (top.length >= 10) top[9] = home; else top.push(home); }
    return top;
  }

  /**
   * One "where to go" ranking (UX_FIX_PLAN D4, A-06): MCD.territory.priority when the shell has it.
   * Fallback with the same rule: kecamatan inside the focus with merchants and a band other than the
   * strongest third (before the import: every kecamatan in the focus); score notYet ÷ (1 + km ÷ 3), where
   * notYet is the potential before the import; ties go to the nearer kecamatan.
   */
  function priorityList(M, n) {
    var T = MCD.territory;
    if (T && isFn(T.priority) && M.stats) {
      var got = safe(T.priority, T, [M.stats, { n: n }]);
      if (Array.isArray(got)) {
        return got.slice(0, n).map(function (p, i) {
          var r = M.byId[p.id] || {};
          return { rank: p.rank || i + 1, id: p.id, name: p.name || r.name, kota: p.kota || r.kota, notYet: isNum(p.notYet) ? p.notYet : r.notYet,
            potential: isNum(p.potential) ? p.potential : r.potential, coverage: isNum(p.coverage) ? p.coverage : r.coverage,
            band: p.band || r.band, dist: isNum(p.distKm) ? p.distKm : r.dist, why: p.why || whyLine(M, r) };
        });
      }
    }
    return localPriority(M.kec, !!M.hasBank, n).map(function (r, i) {
      return { rank: i + 1, id: r.id, name: r.name, kota: r.kota, notYet: r.notYet, potential: r.potential, coverage: r.coverage, band: r.band, dist: r.dist, why: whyLine(M, r) };
    });
  }
  /** The fallback ranking, pure (tested): kec [{id, potential, notYet, band, dist, in15}] → sorted list. */
  function localPriority(kec, hasBank, n) {
    var pool = kec.filter(function (r) {
      if (!(r.potential > 0) || !(r.in15 >= 0.5)) return false;
      return !hasBank || r.band !== 'acquired';
    });
    var score = function (r) { var v = hasBank ? (r.notYet || 0) : r.potential; return v / (1 + (isNum(r.dist) ? r.dist : 0) / 3); };
    pool.sort(function (a, b) { return score(b) - score(a) || (a.dist || 0) - (b.dist || 0); });
    return pool.slice(0, n == null ? 3 : n);
  }
  function whyLine(M, r) {
    if (!r) return '';
    if (M.hasBank) return int(r.notYet) + ' belum ada di LVM · coverage ' + pctA(r.coverage) + ' · ' + km(r.dist);
    return int(r.potential) + ' merchant · ' + km(r.dist);
  }

  function model(force) {
    var sig = sigNow();
    if (!force && S.model && sig === S.sig) return S.model;
    S.model = computeModel();
    S.sig = sig;
    return S.model;
  }

  /* ---------------------------------------------------------------- shared text */

  function period(M) {
    if (M.demo) return 'data contoh';
    if (M.hasBank) return 'data LVM' + (M.asOf ? ' per ' + dateTxt(M.asOf) : '');
    return 'peta publik ' + poisWhen();
  }
  function source(M, extra) {
    if (M.demo) return 'Sumber: data contoh (ilustrasi) · merchant publik dari Overture Maps Places (' + poisWhen() + ')' + (extra ? ' · ' + extra : '');
    var s = 'Sumber: Overture Maps Places (' + poisWhen() + ')';
    if (M.hasBank) s += ' · file Rev LVM' + (M.asOf ? ' per ' + dateTxt(M.asOf) : '');
    return s + (extra ? ' · ' + extra : '');
  }

  /* ---------------------------------------------------------------- the DOM */

  function exhibit(cls, eyebrow) {
    var title = el('h2', { class: 'exhibit__title ov-x__title' });
    var sub = el('p', { class: 'exhibit__sub ov-x__sub' });
    var tools = el('div', { class: 'ov-x__tools' });
    var body = el('div', { class: 'ov-x__body' });
    var src = el('p', { class: 'exhibit__source ov-x__src' });
    var head = el('header', { class: 'ov-x__head' }, el('div', { class: 'ov-x__titles' }, eyebrow ? el('p', { class: 'ov-x__eyebrow', text: eyebrow }) : null, title, sub), tools);
    var node = el('section', { class: 'exhibit ov-x ' + (cls || '') }, head, body, src);
    return { el: node, title: title, sub: sub, tools: tools, body: body, src: src };
  }
  /** "Lihat tabel" toggle: the numbers of a chart as a plain table under it. */
  function tableToggle(x, key) {
    var b = el('button', { type: 'button', class: 'btn btn--ghost ov-tbtn', aria: { expanded: S.tables[key] ? 'true' : 'false' } },
      el('span', { text: S.tables[key] ? 'Sembunyikan tabel' : 'Lihat tabel' }));
    var host = el('div', { class: 'ov-table', hidden: !S.tables[key] });
    b.addEventListener('click', function () {
      S.tables[key] = !S.tables[key];
      host.hidden = !S.tables[key];
      b.setAttribute('aria-expanded', S.tables[key] ? 'true' : 'false');
      b.firstChild.textContent = S.tables[key] ? 'Sembunyikan tabel' : 'Lihat tabel';
    });
    x.tools.appendChild(b);
    return host;
  }
  function plainTable(host, head, body, caption) {
    clear(host);
    var t = el('table', { class: 'tbl ov-tbl' },
      el('caption', { class: 'sr-only', text: caption }),
      el('thead', null, el('tr', null, head.map(function (h, i) { return el('th', { scope: 'col', class: i ? 'num' : null, text: h }); }))),
      el('tbody', null, body));
    host.appendChild(el('div', { class: 'tbl-wrap' }, t));
  }
  function chartSvg(w, h, label, cls) {
    return svg('svg', { class: 'ov-svg ' + (cls || ''), viewBox: '0 0 ' + Math.round(w) + ' ' + Math.round(h), width: Math.round(w), height: Math.round(h),
      role: 'img', 'aria-label': label, focusable: 'false' });
  }
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
  /** One vertical gradient per tone: the tone at full strength at the top, 72% at the base (single hue). */
  function gradDefs(node, tones, horizontal) {
    var defs = svg('defs'), ids = {};
    tones.forEach(function (t) {
      var id = uid('g' + t);
      ids[t] = id;
      defs.appendChild(svg('linearGradient', { id: id, x1: '0', y1: '0', x2: horizontal ? '1' : '0', y2: horizontal ? '0' : '1' },
        svg('stop', { offset: '0', class: 'ov-stop ov-stop--' + t + (horizontal ? ' is-lo' : '') }),
        svg('stop', { offset: '1', class: 'ov-stop ov-stop--' + t + (horizontal ? '' : ' is-lo') })));
    });
    node.appendChild(defs);
    return ids;
  }
  /** The soft inner highlight of a glass mark: a light band across the mark ('x': vertical columns, 'y': bars). */
  function sheenDef(node, axis) {
    var id = uid('sheen'), horiz = axis === 'x';
    var lg = svg('linearGradient', { id: id, x1: '0', y1: '0', x2: horiz ? '1' : '0', y2: horiz ? '0' : '1' },
      svg('stop', { offset: '0', class: 'ov-sheen-stop', 'stop-opacity': horiz ? '0.15' : '0.95' }),
      svg('stop', { offset: horiz ? '0.24' : '0.55', class: 'ov-sheen-stop', 'stop-opacity': horiz ? '0.85' : '0.25' }),
      svg('stop', { offset: horiz ? '0.55' : '1', class: 'ov-sheen-stop', 'stop-opacity': '0' }),
      svg('stop', { offset: '1', class: 'ov-sheen-stop', 'stop-opacity': '0' }));
    var defs = node.querySelector ? node.querySelector('defs') : null;
    if (!defs) { defs = svg('defs'); node.appendChild(defs); }
    defs.appendChild(lg);
    return id;
  }
  /** Splits a label into at most two lines that fit `maxW` px at 12 px (≈ 6.4 px per character). */
  function wrap2(text, maxW) {
    var per = Math.max(3, Math.floor(maxW / 6.4)), words = String(text).split(/\s+/), lines = [''];
    words.forEach(function (w) {
      var cur = lines[lines.length - 1];
      if (!cur) lines[lines.length - 1] = w;
      else if ((cur + ' ' + w).length <= per) lines[lines.length - 1] = cur + ' ' + w;
      else lines.push(w);
    });
    if (lines.length > 2) lines = [lines[0], lines.slice(1).join(' ')];
    return lines.map(function (l) { return l.length > per ? l.slice(0, Math.max(1, per - 1)) + '…' : l; });
  }

  function buildPage(body) {
    var root = el('div', { class: 'ov-page' });
    var r = S.refs = {};
    r.hero = el('header', { class: 'ov-hero' });
    r.heroT = el('h2', { class: 'ov-hero__t' });
    r.heroS = el('p', { class: 'ov-hero__s' });
    r.heroM = el('p', { class: 'ov-hero__m' });
    r.hero.appendChild(r.heroT); r.hero.appendChild(r.heroS); r.hero.appendChild(r.heroM);
    r.banner = el('div', { class: 'ov-banner', role: 'note', hidden: true });
    r.kpis = el('div', { class: 'ov-kpis', role: 'list', aria: { label: 'Angka utama' } });
    r.cols = exhibit('ov-x--cols');
    r.colsTable = tableToggle(r.cols, 'cols');
    r.colsPlot = el('div', { class: 'ov-plot ov-plot--cols' });
    r.colsKey = el('ul', { class: 'ov-key', aria: { label: 'Arti warna' } });
    r.cols.body.appendChild(r.colsPlot); r.cols.body.appendChild(r.colsKey); r.cols.body.appendChild(r.colsTable);
    r.prio = exhibit('ov-x--prio', 'Prioritas kunjungan');
    r.prioList = el('ol', { class: 'ov-prio' });
    r.prio.body.appendChild(r.prioList);
    r.donut = exhibit('ov-x--donut');
    r.donutSeg = el('div', { class: 'seg ov-seg', role: 'radiogroup', aria: { label: 'Tampilkan menurut' } });
    r.donut.tools.appendChild(r.donutSeg);
    r.donutTable = tableToggle(r.donut, 'donut');
    r.donutPlot = el('div', { class: 'ov-donut' });
    r.donut.body.appendChild(r.donutPlot); r.donut.body.appendChild(r.donutTable);
    r.bars = exhibit('ov-x--bars');
    r.barSeg = el('div', { class: 'seg ov-seg', role: 'radiogroup', aria: { label: 'Indikator' } });
    r.bars.tools.appendChild(r.barSeg);
    r.barsTable = tableToggle(r.bars, 'bars');
    r.barsPlot = el('div', { class: 'ov-plot ov-plot--bars' });
    r.barsKey = el('ul', { class: 'ov-key', aria: { label: 'Arti warna' } });
    r.bars.body.appendChild(r.barsPlot); r.bars.body.appendChild(r.barsKey); r.bars.body.appendChild(r.barsTable);
    /* SMA with the most students: the kecamatan ranking and the school ranking (item 31) */
    r.sma = exhibit('ov-x--sma', 'Sekolah (SMA)');
    r.smaSeg = el('div', { class: 'seg ov-seg', role: 'radiogroup', aria: { label: 'Hitung' } });
    r.sma.tools.appendChild(r.smaSeg);
    r.smaKecT = el('h3', { class: 'ov-sma__t', id: uid('smak'), text: TOP_N + ' kecamatan teratas' });
    r.smaKecHint = el('p', { class: 'ov-sma__hint', text: 'Pilih kecamatan untuk melihat SMA-nya.' });
    r.smaKecHost = el('div', { class: 'ov-sma__chart' });
    r.smaTopT = el('h3', { class: 'ov-sma__t', id: uid('smat'), aria: { live: 'polite' }, attrs: { tabindex: '-1' } });
    r.smaBack = btn('Semua kecamatan', { cls: 'btn--ghost ov-sma__back', icon: 'chev-l', run: function () { pickKec(null); } });
    /* item 38: the drill-down's kecamatan opens in Sekolah, where the map enters the kecamatan focus mode */
    r.smaMap = btn('Lihat di peta Sekolah', { cls: 'btn--secondary ov-sma__map', icon: 'map', run: function () { openSchoolsKec(S.sma.kec); } });
    r.smaActs = el('div', { class: 'ov-sma__acts' }, r.smaMap, r.smaBack);
    r.smaTopHost = el('div', { class: 'ov-sma__chart' });
    /* v5: the picked kecamatan's numbers in the shared card markup, above its SMA (the drill-down card) */
    r.smaCard = el('div', { class: 'ov-sma__card', hidden: true });
    r.smaSplit = el('ul', { class: 'ov-key ov-key--split', aria: { label: 'Arti warna batang' } });
    r.smaKey = el('ul', { class: 'ov-key ov-key--sym', aria: { label: 'Arti simbol sekolah' } });
    r.smaNote = el('p', { class: 'ov-note' });
    r.smaPanes = el('div', { class: 'ov-sma' },
      el('section', { class: 'ov-sma__pane ov-sma__pane--kec', aria: { labelledby: r.smaKecT.id } },
        el('header', { class: 'ov-sma__head' }, el('div', null, r.smaKecT, r.smaKecHint))),
      el('section', { class: 'ov-sma__pane ov-sma__pane--top', aria: { labelledby: r.smaTopT.id } },
        el('header', { class: 'ov-sma__head' }, r.smaTopT, r.smaActs)));
    r.smaPanes.firstChild.appendChild(r.smaKecHost);
    r.smaPanes.lastChild.appendChild(r.smaCard);
    r.smaPanes.lastChild.appendChild(r.smaTopHost);
    r.smaPanes.lastChild.appendChild(r.smaKey);
    r.sma.body.appendChild(r.smaPanes);
    r.sma.body.appendChild(r.smaSplit);
    r.sma.body.appendChild(r.smaNote);
    /* "Sasaran EDC" and "Sasaran LVM" (item 35b); the EDC panel also holds the live Google check (item 33) */
    r.sas = { edc: sasPanel('edc'), lvm: sasPanel('lvm') };
    r.edcAct = r.sas.edc.act; r.edcGoogle = r.sas.edc.google;
    r.short = el('section', { class: 'ov-short', aria: { labelledby: 'ov-short-t' } });
    /* Row 1: the title, the import line and the KPI tiles beside "Prioritas kunjungan". Row 2: the named
       rankings (SMA, Sasaran EDC, Sasaran LVM), side by side from 1200 px, so they start on the first screen.
       Then the columns beside the donut, the UREG / USAK bars and the shortcuts. */
    root.appendChild(el('div', { class: 'ov-grid ov-grid--a' }, el('div', { class: 'ov-lead' }, r.hero, r.banner, r.kpis), r.prio.el));
    root.appendChild(el('div', { class: 'ov-grid ov-grid--r' }, r.sma.el, r.sas.edc.el, r.sas.lvm.el));
    root.appendChild(el('div', { class: 'ov-grid ov-grid--c' }, r.cols.el, r.donut.el));
    root.appendChild(el('div', { class: 'ov-grid ov-grid--b' }, r.bars.el));
    root.appendChild(r.short);
    body.appendChild(root);
    r.root = root;
  }
  /** One "Sasaran" panel: the kecamatan with the most targets, then the top merchants by name. */
  function sasPanel(key) {
    var x = exhibit('ov-x--sas ov-x--sas-' + key, 'Merchant');
    /* the "?" beside the title (item 37): the three factors, one short sentence each, in a note that opens below */
    var tipId = uid('sastip'), tipLabel = SAS_TIP[key].t;
    x.tipBtn = el('button', { type: 'button', class: 'tipbtn ov-tipbtn', title: tipLabel,
      aria: { label: tipLabel, expanded: S.tipOpen[key] ? 'true' : 'false', controls: tipId } }, el('span', { aria: { hidden: 'true' }, text: '?' }));
    x.tip = el('div', { class: 'ov-tipbox', id: tipId, role: 'note', hidden: !S.tipOpen[key] });
    x.tipBtn.addEventListener('click', function () {
      S.tipOpen[key] = !S.tipOpen[key];
      x.tip.hidden = !S.tipOpen[key];
      x.tipBtn.setAttribute('aria-expanded', S.tipOpen[key] ? 'true' : 'false');
    });
    var trow = el('div', { class: 'ov-x__trow' });
    x.title.parentNode.insertBefore(trow, x.title);
    trow.appendChild(x.title);
    trow.appendChild(x.tipBtn);
    /* item 42: one line under the number, "Tidak termasuk {n} jaringan nasional (lewat kantor pusat).", which opens
       that group in Merchant ('merchants:sasaran:nasional'). The EDC panel always; the LVM panel when the group also
       holds chains that would otherwise be Sasaran LVM (renderNat) */
    x.nat = el('button', { type: 'button', class: 'ov-sas__nat', hidden: true }, el('span', { class: 'ov-sas__natt' }), icon('chev-r'));
    x.nat.addEventListener('click', function () { openSasaran('nasional'); });
    x.sub.parentNode.insertBefore(x.nat, x.sub.nextSibling);
    x.kecT = el('h3', { class: 'ov-sas__t', id: uid('sask') });
    x.kecHost = el('div', { class: 'ov-sas__chart' });
    x.namedT = el('h3', { class: 'ov-sas__t', id: uid('sasn') });
    x.namedHost = el('div', { class: 'ov-sas__chart' });
    x.lvKey = el('p', { class: 'ov-lvkey', hidden: true });
    x.naik = el('div', { class: 'ov-sas__naik', hidden: true });
    x.empty = el('div', { class: 'ov-sas__empty', hidden: true });
    x.act = el('div', { class: 'ov-edc__act ov-sas__act' });
    x.google = el('section', { class: 'ov-google', hidden: true, aria: { label: 'Rating Google' } });
    x.parts = el('div', { class: 'ov-sas' },
      el('section', { class: 'ov-sas__pane', aria: { labelledby: x.kecT.id } }, el('header', { class: 'ov-sma__head' }, x.kecT), x.kecHost),
      el('section', { class: 'ov-sas__pane', aria: { labelledby: x.namedT.id } }, el('header', { class: 'ov-sma__head' }, x.namedT), x.namedHost, x.lvKey, x.naik));
    x.body.appendChild(x.tip);
    x.body.appendChild(x.parts);
    x.body.appendChild(x.empty);
    x.body.appendChild(x.act);
    x.body.appendChild(x.google);
    return x;
  }

  /* ------------------------------------------------------------------ hero */

  function renderHero(M) {
    var r = S.refs;
    if (M.hasBank) {
      r.heroT.textContent = pctA(M.coverage) + ' merchant dalam ' + KM + ' km telah terdaftar di Livin’ Merchant';
      r.heroS.textContent = 'Coverage dari ' + int(M.known) + ' merchant dalam ' + KM + ' km dari Mabes TNI · ' + period(M);
    } else {
      r.heroT.textContent = isNum(M.potential) ? 'Ada ' + int(M.potential) + ' merchant dalam ' + KM + ' km dari Mabes TNI' : 'Merchant dalam ' + KM + ' km dari Mabes TNI';
      r.heroS.textContent = '';     /* the line under the title says what the import adds */
    }
    r.heroS.hidden = !r.heroS.textContent;
    clear(r.heroM);
    r.heroM.appendChild(el('span', { text: source(M) }));
    if (M.demo && M.hasBank) r.heroM.appendChild(demoTag());
    renderBanner(M);
  }
  /** Before the LVM import: one line under the title with the single primary button (UX_FIX_PLAN C-01). */
  function renderBanner(M) {
    var r = S.refs, b = r.banner;
    clear(b);
    b.hidden = !!M.hasBank;
    if (M.hasBank) return;
    var imp = btn('Impor file LVM', { cls: 'btn--primary', icon: 'upload', title: 'File hanya dibaca di komputer ini.',
      run: function () { go('data', { view: 'deep', action: 'data:import' }); } });
    b.appendChild(lvmIcon('ov-banner__ic'));
    b.appendChild(el('p', { class: 'ov-banner__t' },
      el('span', { text: 'Impor file LVM untuk melihat merchant yang telah diakuisisi, coverage per kecamatan, serta UREG dan USAK per cabang.' }),
      el('span', { class: 'ov-banner__m', text: 'File hanya dibaca di komputer ini.' })));
    b.appendChild(imp);
  }

  /* --------------------------------------------------------------- KPI cards */

  function lvmIcon(cls) {
    return el('img', { class: cls || 'ov-kpi__ic', src: LVM_ICON, alt: '', width: 28, height: 28, decoding: 'async', draggable: 'false' });
  }
  function kpiCard(c) {
    var meta = el('p', { class: 'ov-kpi__m' }, el('span', { text: c.meta || '' }));
    if (c.demo) meta.appendChild(demoTag());
    var head = el('div', { class: 'ov-kpi__h' }, c.icon ? lvmIcon() : null, el('p', { class: 'ov-kpi__l', text: c.label }));
    return el('article', { class: 'ov-kpi ov-kpi--' + (c.tone || 'accent') + (c.empty ? ' is-empty' : '') + (c.icon ? ' has-icon' : ''), role: 'listitem', title: c.title || null,
      aria: { label: c.label + ': ' + c.text + (c.title ? '. ' + c.title : '') } },
      head,
      el('p', { class: 'ov-kpi__v', text: c.text }),
      meta,
      c.src ? el('p', { class: 'ov-kpi__src', text: c.src }) : null);
  }
  /** "Siswa SMA 17+ (dapat memiliki KTP)" (items 26 and 31): the shared display rule, with its source line. */
  function smaKpi() {
    var D = smaData();
    if (!D) {
      return { label: 'Siswa SMA 17+ (dapat memiliki KTP)', text: '—', tone: 'potential', empty: true, sma: true,
        meta: ONCE.smaFailed ? 'Data siswa tidak dapat dimuat. Muat ulang halaman.' : 'Memuat data siswa SMA…', src: smaSource() };
    }
    var t = smaTotals(D);
    return { label: 'Siswa SMA 17+ (dapat memiliki KTP)', text: int(t.ktp17), num: t.ktp17, fmt: intUp, tone: 'potential', sma: true,
      meta: 'Dari ' + int(t.students) + ' siswa di ' + int(t.sma) + ' SMA dalam ' + KM + ' km', src: smaSource() };
  }
  function intUp(v) { return int(Math.round(v)); }
  function renderKpis(M) {
    var r = S.refs, demo = M.demo && M.hasBank, cards = [];
    if (!M.hasBank) {
      /* the merchant total is the title already; the tiles say what to offer, by size of business (item 35) */
      var tot = M.sas && M.sas.total;
      if (tot && (tot.edc || tot.lvm)) {
        var te = tierInfo('edc'), tl = tierInfo('lvm'), nat = M.sas.nat || 0, natL = nat > 0 && !!M.sas.natLvm;
        /* item 42: local merchants only; the national chains are named in one line under the number (Sasaran LVM too
           when the group also holds chains that would otherwise be Sasaran LVM) */
        cards.push({ label: 'Sasaran EDC', text: int(tot.edc), num: tot.edc, fmt: intUp, tone: 'accent',
          title: te ? te.words + (nat > 0 ? ' ' + natLine(nat) : '') : null,
          meta: 'Usaha menengah & besar dalam ' + KM + ' km', src: nat > 0 ? natLine(nat) : null });
        cards.push({ label: 'Sasaran LVM', text: int(tot.lvm), num: tot.lvm, fmt: intUp, tone: 'potential', icon: true,
          title: tl ? tl.words + (natL ? ' ' + natLine(nat) : '') : null,
          meta: 'Usaha kecil & mikro dalam ' + KM + ' km', src: natL ? natLine(nat) : null });
      } else {
        cards.push({ label: 'Merchant dalam ' + KM + ' km', text: int(M.potential), num: M.potential, fmt: intUp, tone: 'potential',
          meta: 'Toko kelontong, restoran dan UMKM di peta publik, ' + poisWhen() });
      }
      cards.push(smaKpi());
    } else {
      var home = M.kpiHome;
      var tgtTone = home && isNum(home.uregPct) ? (home.uregPct >= 1 ? 'ok' : (home.uregPct >= 0.9 ? 'mid' : 'bad')) : 'none';
      cards = [
        { label: 'Merchant dalam ' + KM + ' km', text: int(M.known), num: M.known, fmt: intUp, tone: 'accent', demo: demo,
          meta: int(M.potential) + ' di peta publik + ' + int(M.unlisted) + ' toko LVM', title: int(M.unlisted) + ' toko LVM tidak ada di peta publik.' },
        { label: 'Sudah diakuisisi', text: int(M.lvm15), num: M.lvm15, fmt: intUp, tone: 'ok', demo: demo, icon: true,
          meta: M.storesOwn ? int(M.storesOwn) + ' toko di file milik KCP Cilangkap' : 'Terdaftar di Livin’ Merchant' },
        { label: 'Belum ada di LVM', text: int(M.notYet), num: M.notYet, fmt: intUp, tone: 'bad', demo: demo,
          meta: 'Kemungkinan besar belum diakuisisi' },
        { label: 'Coverage', text: pctA(M.coverage), num: M.coverage, fmt: pctA, tone: 'accent', demo: demo,
          meta: 'Porsi merchant yang telah tergarap' },
        { label: 'Toko LVM aktif', text: int(M.activeOwn), num: M.activeOwn, fmt: intUp, tone: 'ok', demo: demo,
          meta: 'Toko KCP Cilangkap yang bertransaksi bulan ini' },
        home && isNum(home.uregPct)
          ? { label: 'Target LVM bulan ini', text: pct0(home.uregPct), num: home.uregPct, fmt: pct0, tone: tgtTone, demo: demo,
            meta: 'UREG (pengguna terdaftar) ' + int(home.ureg) + ' dari ' + int(home.uregTarget) + (isNum(home.usakPct) ? ' · USAK ' + pct0(home.usakPct) : ''),
            title: 'UREG: pengguna terdaftar terhadap target.' + (isNum(home.usakPct) ? ' USAK: pengguna aktif terhadap target, ' + pct0(home.usakPct) + '.' : '') }
          : { label: 'Target LVM bulan ini', text: '—', tone: 'none', empty: true, meta: 'Impor file Rev LVM lengkap untuk melihat target' },
        smaKpi()
      ];
    }
    /* the same tiles are not rebuilt (a number that is still counting up keeps counting) */
    var sig = JSON.stringify([!!M.hasBank, cards.map(function (c) { return [c.label, c.text, c.meta, c.tone, c.title || '', c.src || '', !!c.empty, !!c.demo, !!c.icon]; })]);
    if (sig === S.kpiSig && r.kpis.firstChild) return;
    S.kpiSig = sig;
    clear(r.kpis);
    r.kpis.classList.toggle('is-before', !M.hasBank);
    cards.forEach(function (c) {
      var n = kpiCard(c);
      if (c.sma) n.classList.add('ov-kpi--sma');
      r.kpis.appendChild(n);
      /* item 38: each big number counts up once per visit */
      if (isNum(c.num) && isFn(c.fmt) && !S.counted[c.label]) {
        S.counted[c.label] = true;
        countUp(n.querySelector('.ov-kpi__v'), c.num, c.fmt, durMs('slow', 500));
      }
    });
  }

  /* --------------------------------------------------- glass columns per kecamatan */

  function plotWidth(host, fallback) {
    var w = host && host.clientWidth;
    return w > 40 ? w : (fallback || 640);
  }
  function colTone(M, r) { return M.hasBank ? (BAND_TONE[r.band] || 'none') : 'potential'; }
  /** True when two values of different colours round to the same one-decimal label (pure, tested). */
  function covClash(rows) {
    var seen = {};
    return rows.some(function (q) {
      if (!isNum(q.v)) return false;
      var t = pctA(q.v);
      if (seen[t] != null && seen[t] !== q.tone) return true;
      if (seen[t] == null) seen[t] = q.tone;
      return false;
    });
  }
  /**
   * The colour key of the ranked thirds with their cut-offs, in the same words as the map legend
   * (MCD.territory.relativeWords): "Merah: sepertiga dengan coverage terendah (sampai 5,1%), …". d = decimals.
   */
  function relKey(rel, d) {
    var p = function (v) { return F().pct(v, d || 1); };
    var lo = isNum(rel.lo) ? rel.lo : 0, hi = isNum(rel.hi) ? rel.hi : null;
    return [
      ['ok', 'Hijau: sepertiga kecamatan dengan coverage tertinggi' + (hi != null ? ' (di atas ' + p(hi) + ')' : '')],
      ['mid', 'Kuning: sepertiga di tengah' + (hi != null ? ' (' + (lo > 0 ? p(lo).replace('%', '') + '–' + p(hi) : 'sampai ' + p(hi)) + ')' : '')],
      ['bad', 'Merah: sepertiga dengan coverage terendah (' + (lo > 0 ? 'sampai ' + p(lo) : p(0)) + '), kunjungi lebih dulu'],
      ['none', 'Abu-abu: tidak dinilai']
    ];
  }
  function renderCols(M) {
    var r = S.refs, x = r.cols, list = M.top10;
    if (drawnFor('cols', M.id + ':' + plotWidth(r.colsPlot, 720))) return;
    clear(r.colsPlot); clear(r.colsKey);
    if (!list.length) {
      x.title.textContent = 'Angka per kecamatan belum dapat ditampilkan';
      x.sub.textContent = 'Data batas kecamatan belum termuat. Muat ulang halaman.';
      x.src.textContent = 'Sumber: BPS, OpenStreetMap';
      return;
    }
    var vals = list.map(function (k) { return M.hasBank ? (isNum(k.coverage) ? k.coverage : 0) : k.known; });
    if (M.hasBank) {
      var withCov = list.filter(function (k) { return isNum(k.coverage); });
      var hi = withCov.slice().sort(function (a, b) { return b.coverage - a.coverage; })[0], lo = withCov.slice().sort(function (a, b) { return a.coverage - b.coverage; })[0];
      var nLo = lo ? withCov.filter(function (k) { return pctA(k.coverage) === pctA(lo.coverage); }).length : 0;
      x.title.textContent = !(hi && lo) || pctA(hi.coverage) === pctA(lo.coverage) ? 'Coverage LVM per kecamatan'
        : (nLo > 1 ? 'Coverage tertinggi di Kec. ' + hi.name + ', sedangkan ' + nLo + ' kecamatan masih ' + pctA(lo.coverage)
          : 'Coverage tertinggi di Kec. ' + hi.name + ' dan terendah di Kec. ' + lo.name);
      x.sub.textContent = 'Coverage per kecamatan (%) · 10 kecamatan dengan merchant terbanyak dalam ' + KM + ' km · ' + period(M);
    } else {
      x.title.textContent = 'Kec. ' + list.slice().sort(function (a, b) { return b.known - a.known; })[0].name + ' memiliki merchant terbanyak dalam ' + KM + ' km';
      x.sub.textContent = 'Jumlah merchant · 10 kecamatan terbanyak dalam ' + KM + ' km dari Mabes TNI · ' + period(M);
    }
    x.src.textContent = source(M, 'batas kecamatan BPS dan OpenStreetMap');
    var width = plotWidth(r.colsPlot, 720), phone = width < 520;
    /* two columns of different colours must never show the same label: two decimals then (5,14% and 5,08%) */
    var dec2 = M.hasBank && covClash(list.map(function (k) { return { v: k.coverage, tone: colTone(M, k) }; }));
    var fmtV = function (v) { return M.hasBank ? (dec2 && isNum(v) ? F().pct(v, 2) : pctA(v)) : int(v); };
    var label = M.hasBank
      ? 'Grafik kolom coverage LVM untuk ' + list.length + ' kecamatan dengan merchant terbanyak. ' + list.map(function (k) { return k.name + ' ' + pctA(k.coverage); }).join(', ') + '.'
      : 'Grafik kolom jumlah merchant untuk ' + list.length + ' kecamatan. ' + list.map(function (k) { return k.name + ' ' + int(k.known); }).join(', ') + '.';
    var node = phone ? hColumns(M, list, vals, width, label, fmtV) : vColumns(M, list, vals, width, label, fmtV);
    r.colsPlot.appendChild(node);
    if (!S.drawn) enterOnView(node);
    // colour key in words (UX_FIX_PLAN §2.5)
    var key = M.hasBank
      ? (M.rel ? relKey(M.rel, dec2 ? 2 : 1)
        : [['ok', 'Hijau: coverage 50% atau lebih'], ['mid', 'Kuning: 20–50%'], ['bad', 'Merah: di bawah 20%'], ['none', 'Abu-abu: tidak ada data']])
      : [['potential', 'Biru: potensi, file LVM belum diimpor.']];
    key.forEach(function (k) { r.colsKey.appendChild(el('li', null, el('span', { class: 'ov-sw ov-sw--' + k[0], aria: { hidden: 'true' } }), el('span', { text: k[1] }))); });
    if (!M.hasBank) r.colsKey.appendChild(el('li', { class: 'ov-key__note', text: 'Makin tinggi kolom, makin banyak merchant.' }));
    if (M.byId[M.home] && list.indexOf(M.byId[M.home]) >= 0) r.colsKey.appendChild(el('li', null, el('span', { class: 'ov-sw ov-sw--home', aria: { hidden: 'true' } }), el('span', { text: 'Lingkaran: kecamatan tempat KCP Cilangkap' })));
    if (M.hasBank && !M.rel) r.colsKey.appendChild(el('li', { class: 'ov-key__note', text: 'Coverage antarkecamatan masih hampir sama, sehingga warna menggunakan batas tetap.' }));
    // the table, with a button per kecamatan (keyboard path to the Merchant list)
    plainTable(r.colsTable, ['Kecamatan', M.hasBank ? 'Coverage' : 'Merchant', M.hasBank ? 'Belum ada di LVM' : 'Jarak dari Mabes TNI', ''],
      list.map(function (k) {
        return el('tr', null, el('td', { text: 'Kec. ' + k.name }), el('td', { class: 'num', text: M.hasBank ? fmtV(k.coverage) : int(k.known) }),
          el('td', { class: 'num', text: M.hasBank ? int(k.notYet) : km(k.dist) }),
          el('td', { class: 'num' }, btn('Lihat merchant', { cls: 'btn--ghost', run: function () { openKec(k.id); } })));
      }), 'Angka per kecamatan');
  }
  function vColumns(M, list, vals, width, label, fmtV) {
    var height = 330, g = columnsGeo(vals, { width: width, height: height, padB: 56, padT: 26, dx: GLASS.dx, dy: GLASS.dy,
      axisMax: M.hasBank ? niceMax(Math.max.apply(null, vals.concat([0.01]))) : null });
    var node = chartSvg(width, height, label, 'ov-svg--cols' + (S.drawn ? '' : ' is-grow'));
    var tones = ['ok', 'mid', 'bad', 'none', 'potential'], ids = gradDefs(node, tones), sheen = sheenDef(node, 'x');
    g.grid.forEach(function (t) {
      node.appendChild(svg('line', { class: 'ov-gl' + (t.f === 0 ? ' is-base' : ''), x1: g.padL, x2: width - 6, y1: t.y.toFixed(1), y2: t.y.toFixed(1) }));
      node.appendChild(svg('text', { class: 'ov-tick', x: g.padL - 6, y: (t.y + 4).toFixed(1), 'text-anchor': 'end' }, M.hasBank ? tickPct(t.v) : int(t.v)));
    });
    var rad = Math.min(8, g.bars.length ? g.bars[0].w / 3 : 8);
    g.bars.forEach(function (b, i) {
      var k = list[i], tone = colTone(M, k), d = colPath(b.x, b.y, b.w, b.h, rad);
      var grp = svg('g', { class: 'ov-col ov-col--' + tone, 'data-kec': k.id, style: { '--ov-i': i } });
      grp.appendChild(svg('ellipse', { class: 'ov-shadow', cx: b.mid.toFixed(1), cy: (g.base + 1).toFixed(1), rx: (b.w / 2 + 3).toFixed(1), ry: 3 }));
      var body = svg('g', { class: 'ov-col__body' });
      if (d) {
        body.appendChild(svg('path', { class: 'ov-front', d: d, fill: 'url(#' + ids[tone] + ')' }));
        body.appendChild(svg('path', { class: 'ov-sheen', d: d, fill: 'url(#' + sheen + ')' }));
        body.appendChild(svg('path', { class: 'ov-rim', d: d }));
      }
      grp.appendChild(body);
      grp.appendChild(svg('text', { class: 'ov-val', x: b.mid.toFixed(1), y: (b.y - 8).toFixed(1), 'text-anchor': 'middle' }, fmtV(vals[i])));
      var lines = wrap2(k.name, g.slot - 4);
      var t = svg('text', { class: 'ov-lbl', x: b.mid.toFixed(1), y: (g.base + 18).toFixed(1), 'text-anchor': 'middle' });
      lines.forEach(function (ln, j) { t.appendChild(svg('tspan', { x: b.mid.toFixed(1), dy: j ? '15' : '0' }, ln)); });
      t.appendChild(svg('title', null, 'Kec. ' + k.name + (k.kota ? ', ' + k.kota : '')));
      grp.appendChild(t);
      if (k.id === M.home) grp.appendChild(svg('circle', { class: 'ov-homedot', cx: b.mid.toFixed(1), cy: (g.base + 18 + (lines.length - 1) * 15 + 13).toFixed(1), r: 4.5 }));
      grp.appendChild(svg('rect', { class: 'ov-hit', x: (b.x - 4).toFixed(1), y: '0', width: (b.w + 8).toFixed(1), height: height }));
      grp.addEventListener('click', function () { openKec(k.id); });
      node.appendChild(grp);
    });
    return node;
  }
  /** A horizontal glass bar: rounded ends, gradient fill, soft highlight on the upper half. */
  function hGlassBar(body, b, tone, ids, sheen, x0, plotW) {
    if (isNum(plotW)) body.appendChild(svg('rect', { class: 'ov-track', x: x0, y: b.y.toFixed(1), width: Math.max(0, plotW).toFixed(1), height: b.h, rx: b.h / 2 }));
    var len = b.len > 0 ? Math.max(b.len, b.h) : 0;
    if (!len) return;
    body.appendChild(svg('rect', { class: 'ov-front', x: b.x, y: b.y.toFixed(1), width: len.toFixed(1), height: b.h, rx: b.h / 2, fill: 'url(#' + ids[tone] + ')' }));
    body.appendChild(svg('rect', { class: 'ov-sheen', x: (b.x + 2).toFixed(1), y: (b.y + 1).toFixed(1), width: Math.max(0, len - 4).toFixed(1), height: (b.h * 0.45).toFixed(1), rx: b.h * 0.22, fill: 'url(#' + sheen + ')' }));
  }
  function hColumns(M, list, vals, width, label, fmtV) {
    var g = hbarsGeo(vals, { width: width, x0: Math.min(136, Math.round(width * 0.38)), rowH: 34, barH: 14, padR: 56, dx: GLASS.dx, dy: GLASS.dy,
      axisMax: M.hasBank ? niceMax(Math.max.apply(null, vals.concat([0.01]))) : null });
    var node = chartSvg(width, g.height, label, 'ov-svg--hcols' + (S.drawn ? '' : ' is-grow'));
    var ids = gradDefs(node, ['ok', 'mid', 'bad', 'none', 'potential'], true), sheen = sheenDef(node, 'y');
    g.bars.forEach(function (b, i) {
      var k = list[i], tone = colTone(M, k);
      var grp = svg('g', { class: 'ov-hcol ov-col--' + tone, 'data-kec': k.id, style: { '--ov-i': i } });
      var body = svg('g', { class: 'ov-hcol__body' });
      hGlassBar(body, b, tone, ids, sheen, g.x0, null);
      grp.appendChild(body);
      var isHome = k.id === M.home, per = Math.max(4, Math.floor((g.x0 - 12 - (isHome ? 14 : 0)) / 6.4));
      var name = k.name.length <= per ? k.name : k.name.slice(0, per - 1) + '…';
      grp.appendChild(svg('text', { class: 'ov-lbl' + (isHome ? ' is-kechome' : ''), x: g.x0 - 8, y: (b.cy + 4).toFixed(1), 'text-anchor': 'end' }, name,
        svg('title', null, 'Kec. ' + k.name + (k.kota ? ', ' + k.kota : ''))));
      if (isHome) grp.appendChild(svg('circle', { class: 'ov-homedot', cx: Math.max(5, g.x0 - 8 - name.length * 6.4 - 9).toFixed(1), cy: b.cy.toFixed(1), r: 4 }));
      grp.appendChild(svg('text', { class: 'ov-val', x: (b.x + Math.max(b.len, b.len > 0 ? b.h : 0) + 6).toFixed(1), y: (b.cy + 4).toFixed(1) }, fmtV(vals[i])));
      grp.appendChild(svg('rect', { class: 'ov-hit', x: 0, y: (b.y - 8).toFixed(1), width: width, height: g.rowH }));
      grp.addEventListener('click', function () { openKec(k.id); });
      node.appendChild(grp);
    });
    return node;
  }

  /** A column, a priority row or "Lihat merchant": highlight the kecamatan in Merchant › Prioritas kunjungan. */
  function openKec(id) {
    if (MCD.sme && isFn(MCD.sme.setView)) safe(MCD.sme.setView, MCD.sme, [{ kec: id }]);
    go('merchants', { view: 'deep', action: 'merchants:leads' });
  }

  /* ------------------------------------------------------------- priority card */

  var COUNT_WORD = ['', 'satu', 'dua', 'tiga', 'empat', 'lima'];
  /**
   * Short action title (one line in the 4-column card), names in the rows: rows 2 and 3 stay above the fold
   * at 1366 × 768. Each row is one button "Lihat merchant" plus a compact "Buka di Google Maps" link.
   */
  function renderPrio(M) {
    var r = S.refs, x = r.prio, list = M.priority;
    clear(r.prioList);
    if (!list.length) {
      x.title.textContent = 'Prioritas kunjungan belum dapat ditampilkan';
      x.sub.textContent = '';
      x.src.textContent = 'Sumber: BPS, OpenStreetMap';
      return;
    }
    x.title.textContent = list.length > 1 ? 'Kunjungi ' + (COUNT_WORD[list.length] || list.length) + ' kecamatan ini' : 'Kunjungi Kec. ' + list[0].name;
    x.sub.textContent = M.hasBank ? 'Dipilih dari jumlah merchant yang belum ada di LVM dan jaraknya dari Mabes TNI'
      : 'Dipilih dari jumlah merchant dan jaraknya dari Mabes TNI';
    x.src.textContent = source(M) + '. Jarak diukur dari Mabes TNI, sekitar 0,6 km dari KCP Cilangkap.';
    list.forEach(function (p) {
      var tone = M.hasBank ? (BAND_TONE[p.band] || 'none') : 'potential';
      var go1 = el('button', { type: 'button', class: 'ov-prio__go', aria: { label: 'Lihat merchant di Kec. ' + p.name + '. ' + p.why } },
        el('span', { class: 'ov-prio__n ov-tone--' + tone, aria: { hidden: 'true' }, text: String(p.rank) }),
        el('span', { class: 'ov-prio__main', aria: { hidden: 'true' } },
          el('span', { class: 'ov-prio__name', text: 'Kec. ' + p.name }),
          el('span', { class: 'ov-prio__why', text: p.why })),
        el('span', { class: 'ov-prio__cta', aria: { hidden: 'true' } }, el('span', { class: 'ov-prio__ctat', text: 'Lihat merchant' }), icon('chev-r')));
      go1.addEventListener('click', function () { openKec(p.id); });
      var url = gmapsUrl({ q: kecQuery(p) });
      var gm = url ? el('a', { class: 'ov-prio__gm', href: url, target: '_blank', rel: 'noopener noreferrer', title: GM_TIP,
        aria: { label: 'Buka di Google Maps: Kec. ' + p.name } }, icon('external'), el('span', { class: 'ov-prio__gmt', text: 'Maps' })) : null;
      r.prioList.appendChild(el('li', { class: 'ov-prio__row' }, go1, gm));
    });
  }

  /* ------------------------------------------------------------------ donut */

  function segOpts(host, opts, value, onPick) {
    clear(host);
    opts.forEach(function (o) {
      var on = o.v === value;
      var b = el('button', { type: 'button', class: 'seg__opt', role: 'radio', aria: { checked: on ? 'true' : 'false' }, title: o.title || null, attrs: { tabindex: on ? '0' : '-1' }, disabled: !!o.disabled, text: o.label });
      b.addEventListener('click', function () { if (!b.disabled) onPick(o.v); });
      host.appendChild(b);
    });
    if (host.getAttribute('data-keys')) return;
    host.setAttribute('data-keys', '1');
    host.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var list = Array.prototype.filter.call(host.children, function (b) { return !b.disabled; }), i = list.indexOf(W.document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
      n.click();
      var again = Array.prototype.filter.call(host.children, function (b) { return b.getAttribute('aria-checked') === 'true'; })[0];
      if (again) again.focus();
    });
  }

  function donutData(M) {
    if (M.hasBank && S.donutMode === 'status') {
      return [
        { key: 'acq', label: 'Sudah diakuisisi, ada di peta publik', value: M.matched || 0, cls: 'ok' },
        { key: 'off', label: 'Sudah diakuisisi, tidak ada di peta publik', value: M.unlisted || 0, cls: 'ok55' },
        { key: 'not', label: 'Belum ada di LVM', value: M.notYet || 0, cls: 'bad' }
      ];
    }
    return M.cats.map(function (c) { return { key: c.key, label: c.label, value: c.potential, cls: c.color }; });
  }
  function renderDonut(M) {
    var r = S.refs, x = r.donut;
    if (!M.hasBank) S.donutMode = 'type';
    else if (!S.donutPicked) S.donutMode = 'status';
    segOpts(r.donutSeg, [
      { v: 'status', label: 'Status', disabled: !M.hasBank, title: M.hasBank ? 'Status LVM setiap merchant' : 'Status muncul setelah file LVM diimpor' },
      { v: 'type', label: 'Jenis usaha' }
    ], S.donutMode, function (v) { S.donutMode = v; S.donutPicked = true; renderDonut(S.model); });
    if (drawnFor('donut', M.id + ':' + S.donutMode)) return;
    var data = donutData(M), tot = 0;
    data.forEach(function (d) { tot += d.value || 0; });
    if (M.hasBank && S.donutMode === 'status') {
      x.title.textContent = tot ? pctA((M.notYet || 0) / tot) + ' merchant dalam ' + KM + ' km belum ada di LVM' : 'Merchant menurut status LVM';
      x.sub.textContent = 'Jumlah merchant dalam ' + KM + ' km menurut status LVM · ' + period(M);
    } else {
      var top = data.slice().sort(function (a, b) { return b.value - a.value; })[0];
      x.title.textContent = top && tot ? top.label + ' mencakup ' + pct0(top.value / tot) + ' merchant dalam ' + KM + ' km' : 'Merchant menurut jenis usaha';
      x.sub.textContent = 'Jumlah merchant di peta publik dalam ' + KM + ' km menurut jenis usaha · data ' + poisWhen();
    }
    x.src.textContent = source(M);
    clear(r.donutPlot);
    var size = 220, g = donutGeo(data, { cx: size / 2, cy: size / 2, r: 98, thickness: 30, wall: 0 });
    var label = 'Grafik donat ' + (S.donutMode === 'status' && M.hasBank ? 'status LVM' : 'jenis usaha') + ' dari ' + int(g.total) + ' merchant: ' +
      g.arcs.map(function (a) { var d = data.filter(function (q) { return q.key === a.key; })[0]; return d.label + ' ' + pctA(a.share); }).join(', ') + '.';
    var node = chartSvg(size, size, label, 'ov-svg--donut' + (S.drawn ? '' : ' is-grow'));
    /* glass ring: flat slice colours, one soft highlight over the whole ring, a thin light rim, a gentle shadow */
    var hl = uid('ring'), defs = svg('defs');
    defs.appendChild(svg('radialGradient', { id: hl, cx: '0.32', cy: '0.18', r: '0.9' },
      svg('stop', { offset: '0', class: 'ov-sheen-stop', 'stop-opacity': '0.9' }),
      svg('stop', { offset: '0.45', class: 'ov-sheen-stop', 'stop-opacity': '0.18' }),
      svg('stop', { offset: '1', class: 'ov-sheen-stop', 'stop-opacity': '0' })));
    node.appendChild(defs);
    node.appendChild(svg('circle', { class: 'ov-dn__well', cx: g.cx, cy: g.cy, r: (g.r - (g.r - g.r0) / 2).toFixed(1) }));
    var face = svg('g', { class: 'ov-dn__face' });
    g.arcs.forEach(function (a) {
      var d = data.filter(function (q) { return q.key === a.key; })[0];
      face.appendChild(svg('path', { class: 'ov-face ov-face--' + d.cls + ' ov-dn__slice', d: a.d }, svg('title', null, d.label + ': ' + int(d.value) + ' (' + pctA(a.share) + ')')));
    });
    node.appendChild(face);
    if (g.arcs.length) {
      node.appendChild(svg('path', { class: 'ov-dn__sheen', d: arcPath(g.cx, g.cy, g.r0, g.r, 0, Math.PI * 2), fill: 'url(#' + hl + ')' }));
      node.appendChild(svg('circle', { class: 'ov-dn__rim', cx: g.cx, cy: g.cy, r: g.r - 0.5 }));
      node.appendChild(svg('circle', { class: 'ov-dn__rim is-in', cx: g.cx, cy: g.cy, r: g.r0 + 0.5 }));
    }
    /* the shares are written in the list beside the ring, not on the slices (no outlined text on colour) */
    var totEl = svg('text', { class: 'ov-dn__tot', x: g.cx, y: g.cy + 2, 'text-anchor': 'middle' }, int(g.total));
    node.appendChild(totEl);
    node.appendChild(svg('text', { class: 'ov-dn__cap', x: g.cx, y: g.cy + 20, 'text-anchor': 'middle' }, 'merchant'));
    var legend = el('ul', { class: 'ov-dl' });
    data.forEach(function (d) {
      legend.appendChild(el('li', { class: 'ov-dl__row' }, el('span', { class: 'ov-sw ov-sw--' + d.cls, aria: { hidden: 'true' } }),
        el('span', { class: 'ov-dl__l', text: d.label }),
        el('span', { class: 'ov-dl__n' }, el('span', { class: 'ov-dl__v', text: int(d.value) }), el('span', { class: 'ov-dl__p', text: tot ? pctA(d.value / tot) : '—' }))));
    });
    r.donutPlot.appendChild(el('div', { class: 'ov-donut__fig' }, node));
    /* item 38: the ring fades up once when it is seen, and its total counts up with it */
    if (!S.drawn) enterOnView(node, function () { countUp(totEl, g.total, intUp, durMs('slow', 500)); });
    r.donutPlot.appendChild(legend);
    if (M.demo && M.hasBank && S.donutMode === 'status') legend.appendChild(el('li', { class: 'ov-dl__note' }, demoTag()));
    plainTable(r.donutTable, [S.donutMode === 'status' && M.hasBank ? 'Status' : 'Jenis usaha', 'Merchant', 'Porsi'],
      data.map(function (d) { return el('tr', null, el('td', { text: d.label }), el('td', { class: 'num', text: int(d.value) }), el('td', { class: 'num', text: tot ? pctA(d.value / tot) : '—' })); }), 'Komposisi merchant');
  }

  /* ------------------------------------------------------- UREG / USAK bars */

  function kpiTone(p) { return !isNum(p) ? 'none' : (p >= 1 ? 'ok' : (p >= 0.9 ? 'mid' : 'bad')); }
  function branchName(r) {
    var n = String(r.name || '').replace(/^(kcp|kc|kantor cabang( pembantu)?)\s+/i, '').trim();
    if (!n) return String(r.code || '');
    if (r.home || String(r.code) === HOME) return 'KCP Cilangkap';
    return n.toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  function renderBars(M) {
    var r = S.refs, x = r.bars, list = M.kpi;
    if (drawnFor('bars', M.id + ':' + S.barMode + ':' + plotWidth(r.barsPlot, 560))) return;
    clear(r.barsPlot); clear(r.barsKey);
    segOpts(r.barSeg, [{ v: 'ureg', label: 'UREG', title: 'Pengguna terdaftar terhadap target' }, { v: 'usak', label: 'USAK', title: 'Pengguna aktif terhadap target' }], S.barMode,
      function (v) { S.barMode = v; renderBars(S.model); });
    r.barSeg.hidden = !list.length;
    var h = M.kpiHome;
    if (!list.length) {
      x.title.textContent = 'UREG dan USAK terhadap target per cabang';
      x.sub.textContent = 'Pencapaian target per cabang (%)';
      r.barsPlot.appendChild(el('div', { class: 'ov-empty' },
        el('p', { text: 'Grafik ini perlu sheet UREG dan USAK dari file Rev LVM.' }),
        el('p', { text: 'Impor file Rev LVM lengkap di Data & Privasi.' }),
        btn('Impor file LVM', { icon: 'upload', run: function () { go('data', { view: 'deep', action: 'data:import' }); } })));
      x.src.textContent = 'Sumber: sheet UREG dan USAK pada file Rev LVM';
      plainTable(r.barsTable, ['Cabang', 'UREG', 'USAK'], [], 'UREG dan USAK');
      return;
    }
    x.title.textContent = h ? 'KCP Cilangkap mencapai ' + pct0(h.uregPct) + ' target UREG dan ' + pct0(h.usakPct) + ' target USAK' : 'UREG dan USAK terhadap target per cabang';
    x.sub.textContent = 'Pencapaian target per cabang (%) · ' + (monthYear(M.kpiAsOf || M.asOf) || 'periode sesuai file LVM');
    x.src.textContent = M.demo ? 'Sumber: data contoh (ilustrasi)' : 'Sumber: sheet UREG dan USAK pada file Rev LVM' + (M.kpiAsOf ? ' per ' + dateTxt(M.kpiAsOf) : '');
    var key = S.barMode === 'usak' ? 'usakPct' : 'uregPct';
    var sorted = list.filter(function (q) { return isNum(q[key]); }).sort(function (a, b) { return b[key] - a[key]; });
    var vals = sorted.map(function (q) { return q[key]; });
    var width = plotWidth(r.barsPlot, 560), x0 = Math.min(160, Math.round(width * 0.36));
    var g = hbarsGeo(vals, { width: width, x0: x0, rowH: 28, barH: 14, padR: 54, padT: 14, dx: GLASS.dx, dy: GLASS.dy, axisMax: Math.max(1.2, niceMax(Math.max.apply(null, vals.concat([1])))) });
    var label = 'Grafik batang ' + (key === 'usakPct' ? 'USAK' : 'UREG') + ' terhadap target untuk ' + sorted.length + ' cabang. ' +
      sorted.map(function (q) { return branchName(q) + ' ' + pct0(q[key]); }).join(', ') + '.';
    var node = chartSvg(width, g.height + 12, label, 'ov-svg--bars' + (S.drawn ? '' : ' is-grow'));
    var ids = gradDefs(node, ['ok', 'mid', 'bad', 'none'], true), sheen = sheenDef(node, 'y');
    var tx = g.xOf(1);   /* the target line sits behind the bars and their values */
    g.bars.forEach(function (b) { node.appendChild(svg('rect', { class: 'ov-track', x: g.x0, y: b.y.toFixed(1), width: g.plotW.toFixed(1), height: b.h, rx: b.h / 2 })); });
    node.appendChild(svg('line', { class: 'ov-target', x1: tx.toFixed(1), x2: tx.toFixed(1), y1: 4, y2: g.height + 2 }));
    node.appendChild(svg('text', { class: 'ov-tick', x: tx.toFixed(1), y: g.height + 10, 'text-anchor': 'middle' }, 'target 100%'));
    g.bars.forEach(function (b, i) {
      var q = sorted[i], tone = kpiTone(q[key]), home = q.home || String(q.code) === HOME;
      var grp = svg('g', { class: 'ov-hbar ov-col--' + tone, style: { '--ov-i': i } }), body = svg('g', { class: 'ov-hbar__body' });
      hGlassBar(body, b, tone, ids, sheen, g.x0, null);
      grp.appendChild(body);
      var full = branchName(q), per = Math.max(4, Math.floor((x0 - 14 - (home ? 12 : 0)) / 6.4));
      var nm = full.length <= per ? full : full.slice(0, per - 1) + '…';
      if (home) {
        var w = Math.min(x0 - 10, nm.length * 6.6 + 12);
        grp.appendChild(svg('rect', { class: 'ov-homepill', x: (x0 - 8 - w).toFixed(1), y: (b.cy - 10).toFixed(1), width: w.toFixed(1), height: 20, rx: 10 }));
      }
      grp.appendChild(svg('text', { class: 'ov-lbl' + (home ? ' is-home' : ''), x: home ? (x0 - 14) : (x0 - 8), y: (b.cy + 4).toFixed(1), 'text-anchor': 'end' }, nm, svg('title', null, branchName(q) + ' (' + q.code + ')')));
      grp.appendChild(svg('text', { class: 'ov-val', x: (b.x + Math.max(b.len, b.len > 0 ? b.h : 0) + 6).toFixed(1), y: (b.cy + 4).toFixed(1) }, pct0(q[key])));
      node.appendChild(grp);
    });
    r.barsPlot.appendChild(node);
    if (!S.drawn) enterOnView(node);
    [['ok', 'Tercapai: 100% atau lebih'], ['mid', 'Hampir tercapai: 90–99%'], ['bad', 'Tertinggal: di bawah 90%'], ['home', 'Label biru tua: KCP Cilangkap']].forEach(function (k) {
      r.barsKey.appendChild(el('li', null, el('span', { class: 'ov-sw ov-sw--' + (k[0] === 'home' ? 'homepill' : k[0]), aria: { hidden: 'true' } }), el('span', { text: k[1] })));
    });
    if (M.demo) r.barsKey.appendChild(el('li', null, demoTag()));
    plainTable(r.barsTable, ['Cabang', 'UREG', 'Target UREG', 'UREG %', 'USAK', 'Target USAK', 'USAK %'], list.map(function (q) {
      return el('tr', null, el('td', { text: branchName(q) + ' (' + q.code + ')' }), el('td', { class: 'num', text: int(q.ureg) }), el('td', { class: 'num', text: int(q.uregTarget) }),
        el('td', { class: 'num', text: pct0(q.uregPct) }), el('td', { class: 'num', text: int(q.usak) }), el('td', { class: 'num', text: int(q.usakTarget) }), el('td', { class: 'num', text: pct0(q.usakPct) }));
    }), 'UREG dan USAK terhadap target per cabang');
  }

  /* ------------------------------------------------- SMA with the most students (item 31) */

  function smaData() { var D = W.MCD_SMA_STUDENTS; return D && Array.isArray(D.schools) ? D : null; }
  function smaSemester(D) {
    var m = D && D.meta, list = m && Array.isArray(m.semester) ? m.semester : null;
    return (list && list.length && list[list.length - 1]) || SMA_SEMESTER;
  }
  function smaSource() { return 'Data siswa: Dapodik (Kemendikdasmen), semester ' + smaSemester(smaData()); }
  /** data/sma-students.js once, by script injection (never fetch), when index.html does not load it. */
  function ensureSma() {
    if (smaData() || ONCE.smaAsked) return;
    var doc = W.document;
    if (!doc || !isFn(doc.createElement)) return;
    ONCE.smaAsked = true;
    var sc = doc.createElement('script');
    sc.src = SMA_FILE;
    sc.async = true;
    sc.addEventListener('load', smaArrived);
    sc.addEventListener('error', function () { ONCE.smaFailed = true; if (sc.parentNode) sc.parentNode.removeChild(sc); smaArrived(); });
    (doc.head || doc.body).appendChild(sc);
  }
  function smaArrived() {
    if (!S.ctx || !S.refs || !S.model) return;
    renderSma(); renderKpis(S.model); renderShort(S.model);
  }
  function shortKota(k) {
    return String(k || '').replace(/^Kota Administrasi\s+/i, '').replace(/^Kabupaten\s+/i, 'Kab. ');
  }
  /** "27,5 km · ± 53 menit" → "27,5 km dari KCP · ± 53 menit": a road distance from the branch says so, so it
      never reads as a contradiction of "dalam 15 km dari Mabes TNI" (a straight line). */
  function fromKcp(t) {
    var parts = String(t).split(' · ');
    if (/^\d[\d.,]*\s?(km|m)$/.test(parts[0])) parts[0] += ' dari KCP';
    return parts.join(' · ');
  }
  /** "4,2 km dari KCP · ± 14 menit" (MCD.distance, else MCD.travel), else the straight line from Mabes TNI. */
  function distOf(p) {
    if (!p || !isNum(p.lon) || !isNum(p.lat)) return null;
    var Dm = MCD.distance;
    if (Dm && isFn(Dm.of)) {
      var r = safe(Dm.of, Dm, [p.lon, p.lat, { kelurahanId: p.kelurahanId || undefined, kecamatanId: p.kecamatanId || undefined }]);
      if (r) {
        var o = {};
        if (isFn(Dm.peakOn)) o.peak = !!safe(Dm.peakOn, Dm);
        if (isFn(Dm.noTollOn)) o.noToll = !!safe(Dm.noTollOn, Dm);
        var t = isFn(Dm.format) ? safe(Dm.format, Dm, [r, o]) : null;
        if (t && t !== '—') return { text: fromKcp(t), tip: isFn(Dm.tip) ? String(safe(Dm.tip, Dm, [r]) || '') : '' };
      }
    }
    var Tr = MCD.travel;
    if (Tr && isFn(Tr.ready) && isFn(Tr.at) && safe(Tr.ready, Tr)) {
      var q = safe(Tr.at, Tr, [p.lon, p.lat]);
      var t2 = q && isNum(q.km) && isFn(Tr.format) ? safe(Tr.format, Tr, [q, {}]) : null;
      if (t2 && t2 !== '—') return { text: fromKcp(t2), tip: 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.' };
    }
    if (isNum(p.distKm)) return { text: km(p.distKm) + ' dari Mabes TNI', tip: 'Jarak garis lurus dari Mabes TNI.' };
    return null;
  }
  /** One rankedBars chart per slot, kept across renders so rows animate from their old place. */
  function chart(name, host, opts) {
    var C = MCD.charts;
    if (!C || !isFn(C.rankedBars)) {
      clear(host);
      host.appendChild(el('p', { class: 'ov-note', text: 'Grafik tidak dapat ditampilkan. Muat ulang halaman.' }));
      return null;
    }
    var h = S.charts[name];
    if (h && h.el && h.el.parentNode === host) { h.update(opts); return h; }
    if (h) safe(h.destroy, h);
    clear(host);
    S.charts[name] = C.rankedBars(host, opts, {});
    return S.charts[name];
  }
  function dropChart(name) { var h = S.charts[name]; if (h) safe(h.destroy, h); delete S.charts[name]; }
  function symKey(host, rows) {
    clear(host);
    var C = MCD.charts;
    rows.forEach(function (k) {
      var own = smaSymbolFor({ students: null }, k.sym);
      var sy = own && own.nodeType === 1 ? own : (C && isFn(C.schoolSymbol) ? C.schoolSymbol(k.sym) : null);
      host.appendChild(el('li', null, sy || el('span', { class: 'ov-sw ov-sw--potential', aria: { hidden: 'true' } }), el('span', { text: k.text })));
    });
  }
  function pickKec(id) {
    var was = S.sma.kec;
    S.sma.kec = id && id !== S.sma.kec ? id : null;
    renderSma();
    var t = S.refs && S.refs.smaTopT;
    if (!t) return;
    if (was && !S.sma.kec) { try { t.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    /* one column (phones, narrow windows): the school list sits under the kecamatan list, so bring it into view */
    var narrow = false;
    try { narrow = !!(W.matchMedia && W.matchMedia('(max-width: 899px)').matches); } catch (e) { narrow = false; }
    if (narrow && S.sma.kec && isFn(t.scrollIntoView)) {
      try { t.scrollIntoView({ block: 'start', behavior: U().reducedMotion && U().reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
    }
  }
  /** One kecamatan of the active SMA: {id, name, kota, sma, students, k17, k17Est} or null. */
  function smaKecStats(D, id) {
    if (!D || !id) return null;
    return smaKecamatan(D, { metric: 'all', n: 9999 }).filter(function (k) { return k.id === id; })[0] || null;
  }
  /**
   * The drill-down card (v5, COPY_STYLE_EN item 43): the picked kecamatan's numbers (siswa 17+, siswa, SMA) in the
   * shared card markup (MCD.windows.card, else .ov-card) above "5 SMA terbesar di Kec. …". It fades in only when the
   * kecamatan changes; a switch of Semua siswa | Siswa 17+ or a distance toggle redraws it in place.
   */
  function renderKecCard(D, kec) {
    var host = S.refs && S.refs.smaCard;
    if (!host) return;
    clear(host);
    var k = kec ? smaKecStats(D, kec) : null;
    host.hidden = !k;
    var isNew = !!k && S.sma.cardKec !== kec;
    S.sma.cardKec = k ? kec : null;
    if (!k) return;
    /* titleTag 'p': the pane's heading above already names the kecamatan ("5 SMA terbesar di Kec. …") */
    host.appendChild(cardEl({ kind: 'kec', key: 'kec:' + kec, eyebrow: 'Angka kecamatan' + (k.kota ? ' · ' + shortKota(k.kota) : ''), title: 'Kec. ' + k.name, titleTag: 'p',
      numbers: [
        { label: 'Siswa 17+', value: (k.k17Est ? '± ' : '') + int(k.k17), big: true, title: k.k17Est ? 'Sebagian angka siswa 17+ adalah perkiraan.' : 'Angka umur resmi Dapodik.' },
        { label: 'Siswa', value: int(k.students) },
        { label: 'SMA', value: int(k.sma) }
      ] }));
    host.classList.toggle('is-new', isNew && S.drawn && !reduced());
  }
  function setNote(node, lines) {
    clear(node);
    lines.forEach(function (t, i) { if (i) node.appendChild(el('br')); node.appendChild(W.document.createTextNode(t)); });
    node.hidden = !lines.length;
  }
  function renderSma() {
    var r = S.refs;
    if (!r || !r.sma) return;
    var x = r.sma, D = smaData(), metric = S.sma.metric === '17' ? '17' : 'all', is17 = metric === '17';
    segOpts(r.smaSeg, [
      { v: 'all', label: 'Semua siswa', title: 'Jumlah siswa kelas 10 sampai 12' },
      { v: '17', label: 'Siswa 17+', title: 'Siswa berusia 17 tahun ke atas, dapat memiliki KTP' }
    ], metric, function (v) { S.sma.metric = v; renderSma(); });
    x.src.textContent = smaSource() + ' · jarak dari KCP: perkiraan, lalu lintas normal';
    if (!D) {
      x.title.textContent = 'SMA dengan siswa terbanyak';
      x.sub.textContent = ONCE.smaFailed ? 'Data siswa tidak dapat dimuat. Muat ulang halaman.' : 'Memuat data siswa SMA…';
      r.smaSeg.hidden = true; r.smaPanes.hidden = true;
      setNote(r.smaNote, []);
      return;
    }
    r.smaSeg.hidden = false; r.smaPanes.hidden = false;
    var t = smaTotals(D), kec = S.sma.kec, kecName = kec ? (smaKecName(D, kec) || kec) : '';
    var kecs = smaKecamatan(D, { metric: metric, n: TOP_N });
    var top = smaTop(D, { metric: metric, kec: kec, n: TOP_N });
    var lead = top[0], unit = is17 ? ' siswa 17+' : ' siswa';
    /* item 38: the drill-down titles cross-fade to their new words; the rows below cross-fade and morph */
    swapText(x.title, lead ? tidyName(lead.name) + ' memiliki ' + (is17 ? 'siswa 17+' : 'siswa') + ' terbanyak ' + (kec ? 'di Kec. ' + kecName : 'dalam ' + KM + ' km')
      : 'SMA dengan siswa terbanyak');
    swapText(x.sub, (is17 ? 'Siswa berusia 17+ per kecamatan dan per SMA' : 'Jumlah siswa per kecamatan dan per SMA') + ' · ' + int(t.sma) + ' SMA dalam radius ' + KM + ' km dari Mabes TNI');
    swapText(r.smaTopT, kec
      ? (top.length >= TOP_N ? TOP_N + ' SMA ' + (is17 ? 'dengan siswa 17+ terbanyak' : 'terbesar') : int(top.length) + ' SMA') + ' di Kec. ' + kecName
      : TOP_N + ' SMA dengan ' + (is17 ? 'siswa 17+' : 'siswa') + ' terbanyak');
    renderKecCard(D, kec);
    r.smaBack.hidden = !kec;
    r.smaMap.hidden = !kec;
    r.smaActs.hidden = !kec;
    if (kec) r.smaMap.setAttribute('aria-label', 'Lihat Kec. ' + kecName + ' di peta Sekolah');
    else r.smaMap.removeAttribute('aria-label');
    /* "Semua siswa": each bar in two shades, siswa 17+ and di bawah 17 (item 35a), so close totals still differ */
    var split = function (q) { return is17 ? null : [{ value: q.k17, cls: 'a' }, { value: Math.max(0, q.students - q.k17), cls: 'b' }]; };
    var k17Txt = function (q) { return is17 ? '' : int(q.k17) + ' siswa 17+'; };
    chart('smaKec', r.smaKecHost, {
      items: kecs.map(function (k) {
        return { id: k.id, label: 'Kec. ' + k.name, value: k.value, valueLabel: int(k.value) + unit, valueNote: k.est ? '(sebagian perkiraan)' : '',
          parts: split(k), sub: [k17Txt(k), int(k.sma) + ' SMA', k.kota ? shortKota(k.kota) : ''] };
      }),
      selected: kec, pressable: true, tone: 'navy', label: TOP_N + ' kecamatan dengan' + unit + ' terbanyak',
      actionHint: 'Tampilkan SMA di kecamatan ini', emptyText: 'Belum ada data siswa per kecamatan.',
      onSelect: function (it) { pickKec(it.id); }
    });
    chart('smaTop', r.smaTopHost, {
      items: top.map(function (row) {
        var dist = distOf(row), bits = [k17Txt(row), statusWord(row)];
        if (!kec && row.kecName) bits.push('Kec. ' + row.kecName);
        if (dist) bits.push(dist.text);
        return { id: row.id, label: tidyName(row.name), value: row.value, valueLabel: int(row.value) + unit, valueNote: row.est ? '(perkiraan)' : '',
          parts: split(row), sub: bits, symbol: function () { return smaSymbolFor(row); }, title: dist && dist.tip ? dist.tip : '', row: row };
      }),
      tone: 'brand', label: r.smaTopT.textContent, actionHint: 'Buka di peta Sekolah', emptyText: 'Tidak ada SMA aktif di kecamatan ini.',
      onSelect: function (it) { focusSchool(it.row); }
    });
    clear(r.smaSplit);
    r.smaSplit.hidden = is17;
    if (!is17) {
      r.smaSplit.appendChild(el('li', null, el('span', { class: 'ov-sw ov-sw--k17', aria: { hidden: 'true' } }), el('span', { text: 'Siswa 17+: dapat membuka Tabungan dan Livin’ by Mandiri dengan KTP' })));
      r.smaSplit.appendChild(el('li', null, el('span', { class: 'ov-sw ov-sw--u17', aria: { hidden: 'true' } }), el('span', { text: 'Di bawah 17: Tabungan SimPel, dibuka bersama orang tua' })));
    }
    symKey(r.smaKey, [
      { sym: { shape: 'circle', tone: 'negeri' }, text: 'SMA negeri' },
      { sym: { shape: 'circle', tone: 'swasta' }, text: 'SMA swasta' },
      { sym: { shape: 'circle', tone: 'tni', star: true }, text: 'Yayasan TNI' }
    ]);
    var notes = [];
    if (t.inactive) notes.push(int(t.inactive) + ' SMA dengan 0 siswa tidak dihitung karena kemungkinan tidak aktif.');
    if (is17) notes.push('Siswa 17+ menggunakan angka umur resmi Dapodik. Angka bertanda perkiraan dihitung dari jumlah siswa per kelas.');
    else if (t.studentsEst) notes.push('Angka bertanda perkiraan berasal dari sekolah tanpa data Dapodik. Jumlahnya diperkirakan dari SMA sejenis.');
    setNote(r.smaNote, notes);
  }

  /* ------------------------------------- Sasaran EDC / Sasaran LVM panels (items 32, 33, 35, 37) */

  function kecNameOf(id) {
    if (!id) return '';
    var sm = MCD.sme;
    if (sm && isFn(sm.kecName)) { var n = safe(sm.kecName, sm, [id]); if (n) return String(n); }
    if (S.model && S.model.byId && S.model.byId[id]) return S.model.byId[id].name;
    return smaKecName(smaData(), id);
  }
  function placesApi() {
    var P = MCD.places;
    return P && isFn(P.hasKey) && isFn(P.checkShortlist) && safe(P.hasKey, P) ? P : null;
  }
  /** Item 42: "Tidak termasuk 4.110 jaringan nasional (lewat kantor pusat)." */
  function natLine(n) { return 'Tidak termasuk ' + int(n) + ' jaringan nasional (lewat kantor pusat).'; }
  /** Merchant › Kandidat EDC filtered to one tier ('edc' | 'lvm' | 'naik-edc' | 'nasional'), optionally in one kecamatan. */
  function openSasaran(tier, kec) {
    go('merchants', { view: 'deep', action: 'merchants:sasaran:' + tier + (kec ? ':' + kec : '') });
  }
  /** The "?" note of a Sasaran panel (item 37): who it lists, then the three factors, one short sentence each. */
  function renderSasTip(key, x) {
    if (!x.tip || x.tip.firstChild) return;
    x.tip.appendChild(el('p', { class: 'ov-tipbox__lead', text: SAS_TIP[key].lead }));
    x.tip.appendChild(el('ul', { class: 'ov-tipbox__list' }, FACTOR_TIP.map(function (t) {
      var i = t.indexOf(': ');
      return el('li', null, el('span', { class: 'ov-tipbox__k', text: t.slice(0, i + 1) }), el('span', { text: t.slice(i + 1) }));
    })));
    x.tip.appendChild(el('p', { class: 'ov-tipbox__note', text: DOTS_TIP }));
    var tn = tierInfo('nasional');
    x.tipNat = el('p', { class: 'ov-tipbox__note', text: tn && tn.words ? tn.words : TIER.nasional.words });
    if (key === 'edc') x.tip.appendChild(x.tipNat);
  }
  /** The key under a named list: what the three dots are, and what ring, half and full mean. */
  function renderLvKey(node, on) {
    clear(node);
    node.hidden = !on;
    if (!on) return;
    node.appendChild(el('span', { class: 'ov-lvkey__l', text: 'Titik menunjukkan nilai belanja, keramaian dan daya beli area' }));
    var scale = el('span', { class: 'ov-lvkey__s' });
    [[1, 'rendah/kecil'], [2, 'sedang'], [3, 'tinggi/besar']].forEach(function (d) {   /* nilai belanja uses kecil and besar */
      scale.appendChild(el('span', { class: 'ov-lvkey__i' }, el('span', { class: 'mcp-rk__dot is-' + d[0], aria: { hidden: 'true' } }), el('span', { text: d[1] })));
    });
    node.appendChild(scale);
  }
  var GOOGLE_FAIL = 'Rating Google tidak dapat diambil. Periksa internet, lalu coba lagi.';
  function googleBy(list) {
    var by = {};
    (list || []).forEach(function (g) { if (g && g.id != null) by[String(g.id)] = g; });
    return by;
  }
  /**
   * Live Google ratings for the named EDC merchants on screen (item 33): kept in memory while Ringkasan is open,
   * never stored. Only the PUBLIC listing name (Overture) and point are sent, never the masked name on screen,
   * and nothing in presentation mode. A reply that arrives after an unmount, a re-mount, a privacy change or a
   * newer check is dropped (request token).
   */
  function checkGoogle() {
    var P = placesApi(), res = S.sas.edc;
    if (!P || S.googleBusy || veilOn() || !res || !res.items || !res.items.length) return null;
    var list = res.items.map(function (c) { return { id: String(c.idx), name: publicName(c.idx), lon: c.lon, lat: c.lat }; })
      .filter(function (q) { return !!q.name; });
    if (!list.length) return null;
    var token = ++S.googleToken;
    S.googleBusy = true;
    renderSas('edc');
    var done = function (by, err) {
      if (token !== S.googleToken) return;
      S.googleBusy = false;
      if (!S.ctx || !S.refs) return;
      if (by) S.google = { by: by };
      if (err) S.ctx.toast(err, 'warn');
      renderSas('edc');
    };
    var run;
    try { run = Promise.resolve(P.checkShortlist(list)); } catch (e) { run = Promise.reject(e); }
    return run.then(function (out) {
      if (!Array.isArray(out)) done(null, GOOGLE_FAIL); else done(googleBy(out), null);
    }, function (err) {
      var part = err && Array.isArray(err.results) && err.results.length ? googleBy(err.results) : null;
      done(part, err && err.text ? String(err.text) : GOOGLE_FAIL);
    });
  }
  function renderGoogle(host, items) {
    var G = S.google, P = placesApi();
    clear(host);
    host.hidden = !(G && P) || veilOn();
    if (host.hidden) return;
    var found = function (q) { return q.g && q.g.matched !== false && isNum(q.g.rating); };
    var rows = null, sm = MCD.sme, results = Object.keys(G.by).map(function (k) { return G.by[k]; });
    /* the Merchant section's rule when it is loaded: reviews × ticket weight (item 33); else reviews alone */
    if (sm && isFn(sm.googleRank)) {
      var ranked = safe(sm.googleRank, sm, [items, results]);
      if (Array.isArray(ranked)) rows = ranked.map(function (c) { return { c: c, g: G.by[String(c.idx)] || null }; });
    }
    if (!rows) {
      rows = items.map(function (c) { return { c: c, g: G.by[String(c.idx)] || null }; });
      rows.sort(function (a, b) { return (found(b) ? 1 : 0) - (found(a) ? 1 : 0) || ((b.g && b.g.userRatingCount) || 0) - ((a.g && a.g.userRatingCount) || 0); });
    }
    host.appendChild(el('h3', { class: 'ov-google__t', text: 'Rating Google, diurutkan menurut jumlah ulasan' }));
    host.appendChild(el('p', { class: 'ov-note', text: 'Diambil langsung dari Google dan tidak disimpan. Banyak ulasan berarti tempatnya ramai.' }));
    var ul = el('ul', { class: 'ov-google__list' });
    rows.forEach(function (q) {
      var ok = found(q), uri = q.g && /^https:\/\//.test(String(q.g.googleMapsUri || '')) ? String(q.g.googleMapsUri) : null;
      ul.appendChild(el('li', { class: 'ov-google__row' },
        el('span', { class: 'ov-google__n', text: String(q.c.name || '') }),
        el('span', { class: 'ov-google__r', text: ok ? F().num(q.g.rating, 1) + ' dari 5 · ' + int(q.g.userRatingCount || 0) + ' ulasan' : 'Tidak ditemukan di Google Maps' }),
        uri ? el('a', { class: 'ov-google__a', href: uri, target: '_blank', rel: 'noopener noreferrer', title: GM_TIP }, icon('external'), el('span', { text: 'Buka di Google Maps' })) : null));
    });
    host.appendChild(ul);
    var attr = isFn(P.attribution) ? safe(P.attribution, P) : null;
    if (attr && attr.nodeType === 1) host.appendChild(attr);
  }
  /** One panel: the kecamatan with the most targets, the top merchants by name, then its actions. */
  function renderSas(key) {
    var r = S.refs, x = r && r.sas && r.sas[key];
    if (!x) return;
    var P = SAS[key], M = S.model || {}, sme = MCD.sme, main = tierInfo(P.main), counts = M.sas || null;
    var tot = counts && counts.total ? (key === 'lvm' ? counts.total.lvm : counts.total.edc) : null;
    var named = sasNamed(sme, key, TOP_N);
    S.sas[key] = named;
    x.title.textContent = P.title;
    x.sub.textContent = (M.hasBank && isNum(tot) ? int(tot) + ' usaha dalam ' + KM + ' km. ' : '') + (main ? main.words : '');
    x.src.textContent = 'Sumber: Overture Maps Places (' + poisWhen() + ') · perkiraan dari data peta publik · jarak dari KCP: lalu lintas normal';
    renderSasTip(key, x);
    renderNat(x, counts, key);
    clear(x.act); clear(x.empty); clear(x.naik);
    x.naik.hidden = true;
    if (named.state === 'missing' && !counts) {
      dropChart(key + 'Kec'); dropChart(key + 'Named');
      clear(x.kecHost); clear(x.namedHost);
      x.parts.hidden = true; x.empty.hidden = false; x.google.hidden = true;
      x.empty.appendChild(el('div', { class: 'ov-empty' },
        el('p', { class: 'ov-empty__t', text: 'Daftar ' + P.short + ' belum tersedia.' }),
        el('p', { text: 'Buka Merchant untuk melihat merchant per kecamatan.' }),
        btn('Buka Merchant', { after: 'chev-r', run: function () { go('merchants'); } })));
      return;
    }
    x.parts.hidden = false; x.empty.hidden = true;
    /* where: the kecamatan with the most targets; a bar opens Merchant filtered to this tier and kecamatan */
    /* a short heading beside "Merchant teratas" (the card title names the tier); the list keeps the full name */
    x.kecT.textContent = TOP_N + ' kecamatan teratas';
    chart(key + 'Kec', x.kecHost, {
      items: sasTopKec(counts, key, TOP_N).map(function (k) {
        var row = M.byId && M.byId[k.id];
        return { id: k.id, label: 'Kec. ' + (kecNameOf(k.id) || k.id), value: k.value, valueLabel: int(k.value) + ' usaha',
          title: row && row.kota ? 'Kec. ' + row.name + ', ' + shortKota(row.kota) : '', kec: k.id };
      }),
      tone: 'navy', label: TOP_N + ' kecamatan dengan ' + P.short + ' terbanyak', actionHint: 'Buka daftar ' + P.short + ' di kecamatan ini',
      emptyText: 'Belum ada ' + P.short + ' per kecamatan.',
      onSelect: function (it) { openSasaran(key, it.kec); }
    });
    /* who: the top merchants by name (no score on screen, item 37); "Naik ke EDC" rows carry their chip; three
       level dots per row (nilai belanja · keramaian · daya beli area), their words on hover or keyboard focus */
    x.namedT.textContent = 'Merchant teratas';
    var anyLv = false;
    chart(key + 'Named', x.namedHost, {
      items: named.items.map(function (c, i) {
        var ti = tierInfo(c.tier, c), kn = kecNameOf(c.kecamatanId), lv = factorsOf(c);
        var dist = distOf({ lon: c.lon, lat: c.lat, kecamatanId: c.kecamatanId, kelurahanId: c.kelurahanId });
        if (lv) anyLv = true;
        return { id: String(c.idx), label: String(c.name || 'Tanpa nama'), value: named.items.length - i, valueLabel: '',
          sub: [lv ? '' : ticketWords(c), kn ? 'Kec. ' + kn : '', dist ? dist.text : ''], levels: lv,
          chip: normTier(c.tier) !== P.main && ti ? { text: ti.label, tone: ti.tone } : null,
          title: lv ? '' : (c.why ? String(c.why) : (ti ? ti.words : '')), cand: c };
      }),
      sort: false, bars: false, tone: 'brand', label: P.short + ': merchant teratas', actionHint: 'Buka di peta Merchant',
      emptyText: 'Belum ada ' + P.short + ' dalam ' + KM + ' km.',
      onSelect: function (it) { focusOn('merchants', 'poi', it.cand.idx); }
    });
    /* the key of the dots is a repeated hint (item 39e): with MCD.windows.hint it shows once per browser, in one panel
       only; the same words stay in each panel's "?" note (DOTS_TIP) */
    var keyOn = anyLv && named.items.length > 0;
    if (keyOn && winApi('hint')) {
      if (S.dotsKeyIn && S.dotsKeyIn !== key) keyOn = false;
      else { keyOn = !!hintOnce('ov-factor-dots', x.lvKey); if (keyOn) S.dotsKeyIn = key; }
    }
    renderLvKey(x.lvKey, keyOn);
    /* EDC panel: merchants already on LVM that qualify for EDC (item 35b) */
    var naik = counts && counts.total ? counts.total.naik : 0;
    if (key === 'edc' && naik > 0) {
      var tn = tierInfo('naik-edc');
      x.naik.hidden = false;
      x.naik.appendChild(el('p', { class: 'ov-sas__naikt' },
        el('span', { class: 'mcp-rk__chip mcp-rk__chip--' + (tn ? tn.tone : 'up'), text: tn ? tn.label : 'Naik ke EDC' }),
        el('span', { text: int(naik) + ' merchant telah terdaftar di Livin’ Merchant dan termasuk usaha menengah atau besar.' })));
      x.naik.appendChild(btn('Lihat daftar ' + (tn ? tn.label : 'Naik ke EDC'), { cls: 'btn--ghost', after: 'chev-r', run: function () { openSasaran('naik-edc'); } }));
    }
    x.act.appendChild(btn('Lihat semua ' + P.short, { after: 'chev-r', run: function () { openSasaran(key); } }));
    if (key === 'edc' && placesApi() && !veilOn() && named.items.length) {
      var gb = btn(S.googleBusy ? 'Memeriksa rating Google…' : 'Cek rating Google (' + named.items.length + ')', { icon: 'search',
        title: 'Ambil rating dan jumlah ulasan dari Google Maps. Hasilnya tidak disimpan.', run: function () { checkGoogle(); } });
      gb.disabled = !!S.googleBusy;
      x.act.appendChild(gb);
      var u = isFn(MCD.places.usage) ? safe(MCD.places.usage, MCD.places) : null;
      if (u && isNum(u.used)) x.act.appendChild(el('span', { class: 'ov-note', text: int(u.used) + ' dari ' + int(isNum(u.free) ? u.free : 1000) + ' cek tanpa biaya bulan ini' }));
    }
    if (key === 'edc') renderGoogle(x.google, named.items); else x.google.hidden = true;
  }
  function renderSasaran() { renderSas('edc'); renderSas('lvm'); }
  /**
   * Item 42: a panel's line "Tidak termasuk {n} jaringan nasional (lewat kantor pusat)." (hidden at 0). Sasaran EDC
   * always; Sasaran LVM only while the group also holds chains that would otherwise be Sasaran LVM (counts.natLvm),
   * and then its "?" note says why too.
   */
  function renderNat(x, counts, key) {
    if (!x.nat) return;
    var n = counts && isNum(counts.nat) ? counts.nat : 0, tn = tierInfo('nasional');
    if (key === 'lvm' && !(counts && counts.natLvm)) n = 0;
    if (key === 'lvm' && x.tipNat) {
      if (n > 0 && !x.tipNat.parentNode) x.tip.appendChild(x.tipNat);
      else if (!(n > 0) && x.tipNat.parentNode) x.tipNat.parentNode.removeChild(x.tipNat);
    }
    x.nat.hidden = !(n > 0);
    x.nat.firstChild.textContent = n > 0 ? natLine(n) : '';
    if (n > 0) {
      x.nat.setAttribute('aria-label', 'Lihat ' + int(n) + ' jaringan nasional (lewat kantor pusat) di Merchant');
      x.nat.setAttribute('title', tn && tn.words ? tn.words : TIER.nasional.words);
    }
  }

  /* --------------------------------------------------------------- shortcuts */

  function smaCount() {
    var SC = MCD.schools;
    if (SC && isFn(SC.smaCount)) { var c0 = safe(SC.smaCount, SC, [KM]); if (isNum(c0)) return c0; }
    return null;
  }
  function askSchools() {
    if (ONCE.schoolsAsked || W.MCD_SCHOOLS || !MCD.schools || !isFn(MCD.schools.ensureData)) return;
    ONCE.schoolsAsked = true;
    setTimeout(function () {
      var p = safe(MCD.schools.ensureData, MCD.schools);
      Promise.resolve(p).then(function () { if (S.ctx && S.model) renderShort(S.model); }, function () { /* the card keeps its fallback line */ });
    }, 1500);
  }
  /* v6 Kampus door (V6_SPEC D2, D12, §6.12) */

  /** The campus file when it is in (MCD.app.lazy('campuses') or an earlier visit to Kampus), else null. */
  function campusData() { var c = W.MCD_CAMPUSES; return c && Array.isArray(c.rows) ? c : null; }
  /** The door shows only when the shell registers the Kampus section (D10), so its button always leads somewhere. */
  function campusDoorOn() { var by = MCD.config && MCD.config.sectionById; return !!(by && by.campus); }
  /**
   * D12 totals within `km` of Mabes TNI: `campuses` = perguruan tinggi with a kode PT (one row each, at its main point);
   * `students` = their students, leaving out the distance-learning rows (`nationwide`) and the rows whose main campus is
   * outside 30 km (`mainOutside`); `design` = the design and course schools outside PDDikti, counted apart (D13);
   * `left` = the rows listed but not summed. Pure: the same numbers in Node and in the browser.
   */
  function campusTotals(C, km) {
    var out = { campuses: 0, students: 0, withStudents: 0, design: 0, left: 0 };
    var rows = C && Array.isArray(C.rows) ? C.rows : [], lim = isNum(km) ? km : Infinity;
    rows.forEach(function (r) {
      if (!r || (isNum(r.km) && r.km > lim)) return;
      var pt = !!r.kode || /^pt:/.test(String(r.id || ''));
      if (!pt) { out.design++; return; }
      out.campuses++;
      if (r.nationwide || r.mainOutside) { out.left++; return; }
      if (isNum(r.students)) { out.students += r.students; out.withStudents++; }
    });
    return out;
  }
  /**
   * The D12 totals of the door: MCD.campus.summary(30) when the Kampus engine gives them ({n, students}: the same numbers
   * as the Kampus section), else this file's own count of the same rule.
   */
  function campusSum(C) {
    var K = MCD.campus, s = K && isFn(K.summary) ? safe(K.summary, K, [CAMPUS_KM]) : null;
    if (s && isNum(s.n) && isNum(s.students)) return { campuses: s.n, students: s.students };
    return campusTotals(C, CAMPUS_KM);
  }
  /** The door line: "{n} kampus dalam 30 km · {m} mahasiswa" once the file is in, else the waiting line (also after a failure). */
  function campusLine() {
    var C = campusData();
    if (!C) return { text: CAMPUS_LINE_WAIT, title: null };
    if (!S.campusSum || S.campusSum.ref !== C) S.campusSum = { ref: C, v: campusSum(C) };
    var t = S.campusSum.v;
    if (!t.campuses) return { text: CAMPUS_LINE_WAIT, title: null };
    return { text: int(t.campuses) + ' kampus dalam ' + CAMPUS_KM + ' km · ' + int(t.students) + ' mahasiswa', title: CAMPUS_TITLE };
  }
  function paintCampusLine() {
    var p = S.refs && S.refs.campusLine;
    if (!p) return;
    var c = campusLine();
    p.textContent = c.text;
    if (c.title) p.setAttribute('title', c.title); else p.removeAttribute('title');
  }
  function stopCampus() {
    if (S.campusT) { clearTimeout(S.campusT); S.campusT = 0; }
    if (S.campusIdle) {
      if (S.campusIdleFn && isFn(W.cancelIdleCallback)) safe(W.cancelIdleCallback, W, [S.campusIdle]);
      else clearTimeout(S.campusIdle);
      S.campusIdle = 0;
    }
    S.campusIdleFn = null;
  }
  /**
   * Asks the shell for data/campuses.js 2 s after the mount, at an idle moment (requestIdleCallback with a 2 s
   * timeout, else the next task), never in the mount frame. One request per mount; the shell shares one promise
   * per name, so a second mount injects nothing new. A failure keeps the waiting line (no error on Ringkasan).
   */
  function askCampuses() {
    stopCampus();
    if (campusData() || !campusDoorOn() || !MCD.app || !isFn(MCD.app.lazy)) return;
    S.campusT = setTimeout(function () {
      S.campusT = 0;
      var run = function () {
        S.campusIdle = 0; S.campusIdleFn = null;
        if (!S.ctx) return;
        var p;
        try { p = MCD.app.lazy('campuses'); } catch (e) { p = null; }
        Promise.resolve(p).then(function () { if (S.ctx) paintCampusLine(); }, function () { /* the waiting line stays */ });
      };
      if (isFn(W.requestIdleCallback)) { S.campusIdleFn = run; S.campusIdle = W.requestIdleCallback(run, { timeout: CAMPUS_WAIT_MS }); }
      else S.campusIdle = setTimeout(run, 0);
    }, CAMPUS_WAIT_MS);
  }
  function projectsCount() {
    var pp = W.MCD_PROPERTY_PROJECTS;
    return pp && Array.isArray(pp.rows) ? pp.rows.filter(function (r) { return !isNum(r.distanceKm) || r.distanceKm <= KPR_KM; }).length : null;
  }
  function programmes() {
    var cfg = MCD.config || {};
    if (!isFn(cfg.livePrograms)) return [];
    var t = new Date(), asOf = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
    return (safe(cfg.livePrograms, cfg, [asOf]) || []).filter(function (p) { return p.product === 'BIZ' || p.product === 'KPR'; }).slice(0, 3).map(function (p) {
      var s = (isFn(cfg.programStatus) && safe(cfg.programStatus, cfg, [p, asOf])) || {};
      return { p: p, days: s.daysLeft, level: s.level };
    });
  }
  function renderShort(M) {
    var r = S.refs;
    clear(r.short);
    r.short.appendChild(el('h2', { class: 'ov-short__t', id: 'ov-short-t', text: 'Pintasan' }));
    var n = smaCount(), np = projectsCount(), D = smaData(), st = D ? smaTotals(D) : null;
    var smaLine = st ? int(st.sma) + ' SMA dalam ' + KM + ' km · ± ' + int(st.ktp17) + ' siswa berusia 17+'
      : (isNum(n) ? int(n) + ' SMA dalam ' + KM + ' km' : 'Memuat daftar SMA…');
    var cards = [
      { id: 'merchants', icon: 'sec-merchants', t: 'Merchant (LVM & EDC)',
        line: M.hasBank ? int(M.notYet) + ' merchant belum ada di LVM' : (isNum(M.potential) ? int(M.potential) + ' merchant dalam ' + KM + ' km' : 'Merchant dalam ' + KM + ' km'), b: 'Buka Merchant' },
      { id: 'schools', icon: 'sec-schools', t: 'Sekolah (SMA)', line: smaLine, b: 'Buka Sekolah' },
      shown('property') ? { id: 'property', icon: 'sec-property', t: 'KPR', line: isNum(np) ? int(np) + ' proyek perumahan dalam ' + KPR_KM + ' km' : 'Proyek perumahan dan simulasi KPR', b: 'Buka KPR' } : null
    ].filter(Boolean);
    /* v6: the Kampus door after Sekolah (D2: same anatomy, no campus names) */
    if (campusDoorOn()) { var cl = campusLine(); cards.splice(2, 0, { id: 'campus', icon: 'sec-campus', t: 'Kampus', line: cl.text, title: cl.title, b: 'Buka Kampus' }); }
    r.campusLine = null;
    var grid = el('div', { class: 'ov-doors' + (cards.length === 4 ? ' ov-doors--4' : '') });
    cards.forEach(function (c) {
      var acts = el('div', { class: 'ov-door__act' }, btn(c.b, { after: 'chev-r', run: function () { go(c.id); } }));
      var line = el('p', { class: 'ov-door__l', text: c.line, title: c.title || null });
      if (c.id === 'campus') r.campusLine = line;
      var main = el('div', { class: 'ov-door__main' }, el('h3', { class: 'ov-door__t', text: c.t }), line);
      if (c.id === 'property') {
        /* the second door sits above the primary button, so the primary buttons of every door share one baseline */
        main.appendChild(el('div', { class: 'ov-door__x' }, btn('Hitung kemampuan bayar nasabah', { cls: 'btn--ghost ov-link', icon: 'sliders', title: 'Buka kalkulator KPR',
          run: function () { go('property', { view: 'deep', action: 'property:calculator' }); } })));
      }
      main.appendChild(acts);
      grid.appendChild(el('article', { class: 'ov-door ov-door--' + c.id },
        el('span', { class: 'ov-door__ic', aria: { hidden: 'true' } }, icon(c.icon)), main));
    });
    r.short.appendChild(grid);
    var prog = programmes();
    if (prog.length) {
      var list = el('ul', { class: 'ov-prog' });
      prog.forEach(function (q) {
        var d = q.days;
        list.appendChild(el('li', { class: 'ov-prog__row is-' + (q.level || 'normal'), title: (q.p.terms || '') + (q.p.src ? ' · Sumber: ' + q.p.src : '') },
          el('span', { class: 'ov-prog__d' }, el('strong', { text: isNum(d) ? String(d) : '—' }), el('small', { text: 'hari lagi' })),
          el('span', { class: 'ov-prog__t' }, el('span', { class: 'ov-prog__l', text: q.p.short || q.p.label }),
            el('span', { class: 'ov-prog__m', text: 'Berakhir ' + dateTxt(q.p.end) + (q.p.product === 'KPR' ? ' · KPR' : ' · Merchant dan UMKM') }))));
      });
      r.short.appendChild(el('section', { class: 'ov-progx', aria: { label: 'Program yang segera berakhir' } },
        el('h3', { class: 'ov-progx__t', text: 'Program yang segera berakhir' }), list,
        el('p', { class: 'exhibit__source', text: 'Sumber: halaman program Bank Mandiri, ketentuan BI dan Kementerian Keuangan' })));
    }
  }

  /* --------------------------------------------------------------- render */

  function renderAll(force) {
    if (!S.ctx || !S.refs) return;
    var M = model(force);
    renderHero(M);
    renderKpis(M);
    renderCols(M);
    renderPrio(M);
    renderSma();
    renderSasaran();
    renderDonut(M);
    renderBars(M);
    renderShort(M);
    S.drawn = true;
    S.width = S.refs.root.clientWidth;
  }
  /** Width changes redraw the charts (labels stay at 12 px and above); colours never need a redraw. */
  function onResize() {
    if (!S.refs || !S.model) return;
    var w = S.refs.root.clientWidth;
    if (!w || Math.abs(w - S.width) < 8) return;
    S.width = w;
    clearTimeout(S.resizeT);
    S.resizeT = setTimeout(function () { if (S.ctx && S.model) { renderCols(S.model); renderBars(S.model); } }, 120);
  }

  /* ------------------------------------------------------------ page and mount */

  var SPEC = {
    dataKeys: [],
    emptyFirst: false,
    lede: 'Akuisisi Livin’ Merchant dan EDC dalam 15 km dari Mabes TNI.',   /* one line: the priority rows stay above the fold */
    shows: [
      'Merchant dalam 15 km: yang telah diakuisisi dan yang belum ada di LVM',
      'Coverage per kecamatan, berwarna hijau, kuning atau merah',
      'Tiga kecamatan untuk dikunjungi lebih dulu',
      'SMA dengan siswa terbanyak',
      'Sasaran EDC (usaha menengah & besar) dan Sasaran LVM (usaha kecil & mikro) per kecamatan',
      'UREG dan USAK terhadap target per cabang'
    ],
    needs: ['1_lvm'],
    cards: function () { return []; },
    primary: null,
    /* no breadcrumb on this page: it would only repeat "Ringkasan" (V3_REPORT §4.5; the shell's option) */
    crumbs: false,
    breadcrumb: false,
    render: function (body) { buildPage(body); }
  };
  Object.defineProperty(SPEC, 'source', { enumerable: true, get: function () {
    var M = S.model;
    if (M && M.hasLvm && S.ctx) return S.ctx.provenance('lvm');
    return 'Sumber: Overture Maps (' + poisWhen() + '), OpenStreetMap, BPS · data publik · file LVM belum diimpor';
  } });

  /**
   * True when the shell honoured {crumbs: false}: the breadcrumb row is missing, hidden or not displayed.
   * Otherwise Ringkasan keeps the v3 behaviour (its own CSS hides the row: .ov-crumbcss).
   */
  function shellHidCrumbs(pg) {
    var head = pg && pg.head;
    if (!head || !isFn(head.querySelector)) return false;
    var row = head.querySelector('.pg-crumbrow');
    if (!row || row.hidden) return true;
    var cs = isFn(W.getComputedStyle) ? safe(W.getComputedStyle, W, [row]) : null;
    return !!(cs && cs.display === 'none');
  }

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (root, c) {
      S.host = root; S.ctx = c; S.refs = null; S.drawn = false; S.width = 0;
      S.drawKey = {}; S.kpiSig = ''; S.counted = {}; S.hints = {}; S.dotsKeyIn = null; stopJobs();
      root.classList.add('ov-host');
      model(true);
      S.page = c.page(SPEC);
      S.crumbCss = !shellHidCrumbs(S.page);
      root.classList.toggle('ov-crumbcss', S.crumbCss);
      renderAll(true);
      if (W.ResizeObserver && S.refs) { S.ro = new W.ResizeObserver(onResize); S.ro.observe(S.refs.root); }
      askSchools();
      ensureSma();
      askCampuses();
      /* the shared "Jam sibuk" and "Motor (tanpa tol)" switches change every distance on the page */
      S.onDist = function () { if (S.ctx && S.refs) { renderSma(); renderSasaran(); } };
      if (isFn(W.addEventListener)) W.addEventListener('mcd:distance', S.onDist);
      c.registerCommands(function () {
        var M = S.model || { priority: [] };
        var cmds = [
          { label: 'Buka Merchant (LVM & EDC)', kw: 'merchant lvm edc akuisisi', run: function () { go('merchants'); } },
          shown('property') ? { label: 'Hitung kemampuan bayar nasabah (kalkulator KPR)', kw: 'kpr kalkulator penghasilan angsuran', run: function () { go('property', { view: 'deep', action: 'property:calculator' }); } } : null,
          { label: 'Impor file LVM', kw: 'impor upload rev lvm', run: function () { go('data', { view: 'deep', action: 'data:import' }); } },
          { label: 'Lihat Sasaran EDC (usaha menengah & besar)', kw: 'sasaran edc kartu usaha menengah besar', run: function () { openSasaran('edc'); } },
          { label: 'Lihat Sasaran LVM (usaha kecil & mikro)', kw: 'sasaran lvm qris usaha kecil mikro', run: function () { openSasaran('lvm'); } },
          { label: 'Lihat Jaringan nasional (lewat kantor pusat)', kw: 'jaringan nasional kantor pusat minimarket waralaba chain', run: function () { openSasaran('nasional'); } }
        ].filter(Boolean);
        (M.priority || []).forEach(function (p) {
          cmds.push({ label: 'Prioritas ' + p.rank + ': Kec. ' + p.name, kw: 'kecamatan prioritas kunjungan ' + (p.kota || ''), run: function () { openKec(p.id); } });
        });
        var D = smaData();
        if (D) smaTop(D, { metric: 'all', n: 3 }).forEach(function (row) {
          cmds.push({ label: 'SMA terbesar: ' + tidyName(row.name), kw: 'sma sekolah siswa terbesar ' + (row.kecName || ''), run: function () { focusSchool(row); } });
        });
        return cmds;
      });
    },
    update: function (d, keys) {
      if (S.page) S.page.update(d, keys);
      var ks = keys || ['*'];
      if (ks.indexOf('*') >= 0 || ks.indexOf('data') >= 0 || ks.indexOf('demo') >= 0 || ks.indexOf('ext') >= 0 || ks.indexOf('settings') >= 0) {
        var sig = sigNow(), changed = sig !== S.sig;
        if (changed || ks.indexOf('*') >= 0) renderAll(changed);
        if (changed && S.page && isFn(S.page.refill)) S.page.refill();
      }
      /* presentation mode ("Samarkan nama", V) and "Tampilkan nama": the merchant names change, Google results
         of the old names are dropped and a check still running is ignored */
      if (ks.indexOf('privacy.veil') >= 0 || ks.indexOf('privacy.reveal') >= 0) {
        S.google = null; S.googleBusy = false; S.googleToken++;
        if (S.ctx && S.refs) renderSasaran();
      }
      /* 'theme': nothing to redraw, every colour is a class bound to the theme tokens */
    },
    unmount: function () {
      if (S.ro) { safe(S.ro.disconnect, S.ro); S.ro = null; }
      clearTimeout(S.resizeT);
      if (S.onDist && isFn(W.removeEventListener)) W.removeEventListener('mcd:distance', S.onDist);
      S.onDist = null;
      stopCampus();
      Object.keys(S.charts).forEach(dropChart);
      stopJobs();
      S.drawKey = {}; S.kpiSig = ''; S.counted = {};
      S.google = null; S.googleBusy = false; S.googleToken++; S.sas = {};
      if (S.host) { S.host.classList.remove('ov-host'); S.host.classList.remove('ov-crumbcss'); }
      S.host = null; S.ctx = null; S.page = null; S.refs = null; S.drawn = false;
    },
    layout: function () { return { posture: { deck: false, camera: null, rings: null }, padding: S.page && isFn(S.page.padding) ? S.page.padding() : undefined }; },
    onResize: onResize,
    /* pure helpers for the tests (no DOM) */
    _geo: { niceMax: niceMax, columns: columnsGeo, hbars: hbarsGeo, donut: donutGeo, priority: localPriority, gmapsUrl: gmapsUrl, DEPTH: DEPTH, colPath: colPath },
    /* item 31 helpers for tests/overview-v3.test.mjs */
    _v3: { smaPool: smaPool, smaTotals: smaTotals, smaTop: smaTop, smaKecamatan: smaKecamatan, smaKtp: smaKtp, tidyName: tidyName, smaSymbol: smaSymbol,
      focusOn: focusOn, focusSchool: focusSchool, sasNamed: sasNamed, sasCounts: sasCounts, sasTopKec: sasTopKec, tierInfo: tierInfo, covClash: covClash,
      relKey: relKey, fromKcp: fromKcp, checkGoogle: checkGoogle, state: function () { return { metric: S.sma.metric, kec: S.sma.kec }; },
      pickKec: pickKec, setMetric: function (m) { S.sma.metric = m === '17' ? '17' : 'all'; renderSma(); }, refs: function () { return S.refs; }, charts: function () { return S.charts; } },
    /* items 37, 38 and the v4 layout, for tests/overview-v4.test.mjs */
    _v4: { normTier: normTier, tierTally: tierTally, factorsOf: factorsOf, factorsLocal: factorsLocal, countUp: countUp, swapText: swapText,
      drawnFor: drawnFor, shellHidCrumbs: shellHidCrumbs, FACTOR_TIP: FACTOR_TIP, SAS_TIP: SAS_TIP, DOTS_TIP: DOTS_TIP,
      openSchoolsKec: openSchoolsKec, selectSmaKec: selectSmaKec,
      state: function () { return { crumbCss: S.crumbCss, counted: Object.keys(S.counted), drawKey: S.drawKey, jobs: S.jobs.length, model: S.model ? S.model.id : null }; } },
    /* v5 (items 39e, 42, 43) for tests/overview-data-v5.test.mjs */
    _v5: { natTally: natTally, natInLvm: natInLvm, natLine: natLine, hintOnce: hintOnce, cardEl: cardEl, smaKecStats: smaKecStats, openSasaran: openSasaran,
      state: function () { return { hints: S.hints, dotsKeyIn: S.dotsKeyIn, cardKec: S.sma.cardKec, nat: S.model && S.model.sas ? S.model.sas.nat : null }; } },
    /* v6 (V6_SPEC §6.12) for tests/overview-data-v6.test.mjs */
    _v6: { campusTotals: campusTotals, campusLine: campusLine, campusDoorOn: campusDoorOn, CAMPUS_TITLE: CAMPUS_TITLE, CAMPUS_LINE_WAIT: CAMPUS_LINE_WAIT,
      CAMPUS_WAIT_MS: CAMPUS_WAIT_MS, state: function () { return { waiting: !!S.campusT, idle: !!S.campusIdle, line: S.refs ? S.refs.campusLine : null }; } }
  };
})(window.MCD = window.MCD || {});
