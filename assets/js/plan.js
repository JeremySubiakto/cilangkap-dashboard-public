/* ==========================================================================
 * MCD.plan: "Rencana kunjungan", the dated daily visit plan shared by every tab (v7, docs/V7_SPEC.md §1.7.3 and §7;
 * COPY_STYLE_EN item 48d; decisions D14, D15, D16, D36). Bank Mandiri KCP Jakarta Cilangkap · Dashboard Akuisisi.
 *
 * Staff add public places from the place cards ("+ Rencana kunjungan"): schools, campuses, merchants of the public
 * listing and KPR projects. The plan starts at KCP Cilangkap (D16), is ordered by
 * MCD.visitPlan (or kept in the user's own order), shows "Tiba ± HH.MM" per stop and opens in Google Maps through
 * links that hold COORDINATES ONLY (MCD.visitPlan.mapsLinks, which fails closed). Leads, LVM-only stores, kecamatan
 * and pages are never added (item 49): every stop is re-checked by MCD.visitPlan.checkStop and by a per-kind id rule.
 *
 * STORE   MCD.seal.store('visit.plan') (v6 sealed store, AES-GCM with the dashboard key) holding two entries
 *           today: {v: 1, date: 'YYYY-MM-DD', stops: [stop], opts}   prev: {v: 1, date, stops} (one plan only)
 *         Without MCD.seal (an old shell, Node tests) the plan lives in memory only; no plain-text plan is ever written
 *         to localStorage, sessionStorage, IndexedDB, the URL or the console. The only plain key is the layout-only
 *         'mcd.plan.ui.v1' = {v: 1, settingsOpen} (whether the "Pengaturan" fold is open, D36).
 * DAY     At load of the sealed copy, on focus, on visibilitychange and every 10 minutes, a plan dated before today
 *         moves to `prev` (only when it holds stops) and today starts empty; "Gunakan lagi" copies `prev` into today.
 * TIMES   arriveMin(k) = departAt + Σ minEst of the legs up to stop k + dwellMin × (k − 1), rounded to 5 minutes,
 *         "Tiba ± 10.40"; with "Kembali ke KCP" on, "Kembali di KCP ± HH.MM" (§7.4). All estimates.
 * CARD    One body for every placement (§7.3, D14): a pin in the column opposite the active sheet at ≥ 1280 px in
 *         Detail (left column when no sheet is open; refused with 3 pins), the active sheet at 1024–1279 px and in
 *         Sederhana, a 360 px slide-over on page sections and at 768–1023 px, a full sheet (86 %) on phones with the
 *         Maps links in a sticky row. The frame comes from MCD.windows.planCard when the SHELL lane provides it, else
 *         the generic MCD.windows pin / the app drawer, else this file's own slide-over and phone sheet.
 *         "Pengaturan" fold closed by default with a one-line preview; the order switch from 3 stops; two lines per
 *         stop; phones always split the Maps links per 3 stops and show no second set (D36); "Samarkan nama" shows
 *         the labels as initials and hides the Google links.
 *
 * MCD.plan = {
 *   ready() → Promise<state>, state() → 'locked' | 'ready' | 'memory',
 *   today() → {date, stops: [stop], opts: {mode, returnToStart, keepOrder, order: [id], departAt: 'HH:MM', dwellMin}},
 *   previous() → {date, n, yesterday, text} | null, reuse() → n,
 *   add(stop) → {ok, n, code?, message?}, has(id), remove(id) → boolean, move(id, toIndex) → {ok, from, to, text},
 *   set(opts) → {ok, changed}, clear(), count(),
 *   compute() → {ok, r, arrivals: [{seq, id, arriveMin, text}], back, rows, links, phoneLinks, totals} | {ok: false, code, message},
 *   quick(stopSpec) → {id: 'plan', label: '+ Rencana kunjungan', run, done} | null,
 *   open(opts) → boolean, close(reason), isOpen(), on(fn) → off,
 *   labels() → {title, chip, button, aria}, overlay() → {stops, line, returnToStart} | null,
 *   placement(ctx) → {mode: 'pin' | 'sheet' | 'over' | 'full', side?, refuse?}, mount(host, {mode}) → {el, update, destroy}
 * }
 * stop = a fresh {id, kind, label, lon, lat, geoPrecision?}; kinds and ids (§1.7.3): sekolah npsn:… / app:<lon>,<lat>,
 *   kampus pt:… / osm:… / ovt:… (+ #n for another campus point), merchant poi:<row index>, kpr project:<id>.
 *   Map aliases (smaSchool, poi, project) are accepted. The kinds satuan and dealer were removed with the KSM & KKB
 *   section (22 Oct 2026, docs/V7_SPEC.md D39) and are refused; a kesehatan kind comes with the Kesehatan section
 *   (D40, wired by the V8 build), not before.
 *
 * Seams for Phase B (feature-detected, nothing breaks without them): MCD.windows.planCard({placement, title, root,
 * onClose}) → handle (SHELL: the pin kind 'plan', the surviving tray chip "Rencana · n", Sederhana replacing the
 * sheet); MCD.map.setPlanOverlay / clearPlanOverlay (MAP); "+ Rencana kunjungan" through quick() (PLACES,
 * WEALTH). Events: on(fn) and the document event 'mcd:plan' carry {type, n, reason?} only, never a label or an id.
 *
 * Safe DOM only (textContent, setAttribute; no innerHTML, no eval), CSP-safe, no network, no logging of data.
 * UMD: MCD.plan in the browser (classic script, load after visit-plan.js and seal.js), module.exports in Node.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; if (!root.MCD.plan) root.MCD.plan = api; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  /* ------------------------------------------------------------ constants */

  var STORE_NAME = 'visit.plan';
  var UI_KEY = 'mcd.plan.ui.v1';
  var MAX_STOPS = 15;
  var MAX_LABEL = 120, MAX_ID = 90;
  var DAY_CHECK_MS = 10 * 60 * 1000;
  var PHONE_MAX = 767, TABLET_MAX = 1023, PIN_MIN = 1280, MAX_PINS = 2;
  var PHONE_WAYPOINTS = 3;
  var DWELLS = [15, 30, 45, 60];
  var DEPART_FIRST = 6 * 60, DEPART_LAST = 18 * 60, DEPART_STEP = 15;
  var DEFAULT_OPTS = { mode: 'mobil', returnToStart: true, keepOrder: false, departAt: '08:30', dwellMin: 30 };
  var KINDS = ['sekolah', 'kampus', 'merchant', 'kpr'];   // D39: no satuan, no dealer
  // One id rule per kind (§1.7.3). A merchant is a public listing only (poi:<row index>); an LVM-only store has no
  // public id and is never planned (D16). An NPSN is 6 or 8 digits, a few carry a letter prefix ('NP' + 6 digits in
  // data/schools.js). A school without an NPSN is 'app:<lon>,<lat>' (schools-core idOf and
  // tools/build-school-students.py write toFixed(5), e.g. 'app:106.90416,-6.32555'); no free-text app: form exists.
  // tests/plan-v7.test.mjs checks every id of the data files against these rules, so a format drift fails the suite.
  var ID_RE = {
    sekolah: /^(npsn:[A-Z]{0,2}\d{6,10}|app:-?\d{1,3}\.\d{1,6},-?\d{1,2}\.\d{1,6})$/,
    kampus: /^(pt:\d{6}|osm:(node|way|relation)\/\d{1,15}|ovt:[0-9a-f]{8,40})(#\d{1,3})?$/,
    merchant: /^poi:\d{1,7}$/,
    kpr: /^project:[A-Za-z0-9._-]{1,80}$/
  };
  var KIND_NAME = { sekolah: 'Sekolah', kampus: 'Kampus', merchant: 'Merchant', kpr: 'Proyek KPR' };
  var KIND_ICON = { sekolah: 'sec-schools', kampus: 'sec-campus', merchant: 'sec-merchants', kpr: 'sec-property' };
  var COARSE = { KELURAHAN: 'pusat kelurahan', KECAMATAN: 'pusat kecamatan' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var STATE_EVENTS = { load: 1, merge: 1, purge: 1, clear: 1, 'import': 1, old: 1, migrated: 1 };

  /* ------------------------------------------------------------ words (V7_SPEC §7, §14) */

  var T = {
    title: 'Rencana kunjungan',
    add: '+ Rencana kunjungan',
    addTip: 'Tambahkan tempat ini ke rencana kunjungan hari ini',
    added: function (n) { return 'Ditambahkan ke rencana · ' + n + ' tujuan'; },
    dup: 'Tempat ini telah ada di rencana.',
    done: '✓ Di rencana',
    removeOne: 'Hapus dari rencana',
    removed: 'Tujuan dihapus dari rencana.',
    privateStop: 'Data nasabah tidak pernah masuk rencana kunjungan atau tautan Google Maps. Cari nasabah tersebut di sistem bank.',
    notPublic: 'Tempat ini tidak dapat masuk rencana kunjungan. Yang dapat: sekolah, kampus, merchant dari data publik dan proyek KPR.',
    badPoint: 'Tempat ini tidak memiliki koordinat yang benar.',
    noPlanner: 'Perencana kunjungan belum termuat. Muat ulang halaman.',
    tooMany: 'Maksimal 15 tujuan dalam satu rencana.',
    locked: 'Dashboard dikunci. Masukkan kata sandi untuk melanjutkan.',
    empty: 'Belum ada tujuan hari ini. Tambahkan dari kartu tempat dengan tombol + Rencana kunjungan.',
    prevYesterday: function (n) { return 'Rencana kemarin: ' + n + ' tujuan.'; },
    prevOlder: function (d, n) { return 'Rencana terakhir, ' + d + ': ' + n + ' tujuan.'; },
    reuse: 'Gunakan lagi',
    reused: function (n) { return n + ' tujuan dari rencana sebelumnya ditambahkan.'; },
    settings: 'Pengaturan',
    depart: 'Berangkat',
    dwell: 'Waktu per kunjungan',
    minutes: function (m) { return m + ' menit'; },
    vehicle: 'Kendaraan',
    car: 'Mobil',
    bike: 'Motor (tanpa tol)',
    bikeShort: 'Motor',
    back: 'Kembali ke KCP',
    backShort: 'kembali ke KCP',
    preview: function (o) {
      return 'Berangkat ' + hhmm(parseHHMM(o.departAt)) + ' · ' + o.dwellMin + ' menit per tempat · ' +
        (o.mode === 'motor' ? 'Motor' : 'Mobil') + (o.returnToStart ? ' · kembali ke KCP' : '');
    },
    orderAuto: 'Urutkan otomatis',
    orderOwn: 'Urutan saya sendiri',
    orderGroup: 'Urutan tujuan',
    arrive: function (m) { return 'Tiba ± ' + hhmm(m); },
    backAt: function (m) { return 'Kembali di KCP ± ' + hhmm(m); },
    up: 'Naikkan', down: 'Turunkan',
    moved: function (a, b) { return 'Tujuan ' + a + ' dipindah ke urutan ' + b + '.'; },
    picked: function (a) { return 'Tujuan ' + a + ' diangkat. Panah atas atau bawah untuk memindah, spasi untuk melepas.'; },
    position: function (b) { return 'Urutan ' + b + '.'; },
    cancelled: 'Pemindahan dibatalkan.',
    grip: function (k, label) { return 'Pindahkan tujuan ' + k + ', ' + label; },
    menu: function (k) { return 'Pilihan untuk tujuan ' + k; },
    traffic: 'Waktu tempuh perkiraan untuk lalu lintas normal. Saat jam sibuk dapat lebih lama.',
    coordsOnly: 'Hanya koordinat yang dikirim ke Google Maps.',
    phoneSplit: 'Tautan dibagi per 3 tujuan agar semua tujuan terbuka di ponsel.',
    openMaps: 'Buka di Google Maps',
    part: function (a, b) { return 'Bagian ' + a + ' dari ' + b; },
    partTip: function (a, b) { return 'Buka bagian ' + a + ' dari ' + b + ' rute di Google Maps (tab baru)'; },
    mapsTip: 'Buka rute di Google Maps (tab baru). Hanya koordinat yang dikirim.',
    veiled: 'Tautan Google Maps disembunyikan saat nama disamarkan.',
    clear: 'Kosongkan rencana',
    clearBody: 'Semua tujuan hari ini akan dihapus dari rencana.',
    clearOk: 'Kosongkan rencana',
    cancel: 'Batal',
    cleared: 'Rencana hari ini dikosongkan.',
    close: 'Tutup', closeTip: 'Tutup (Esc)',
    pinMax: 'Maksimal 2 kartu disematkan. Tutup salah satu dulu.',
    chip: function (n) { return 'Rencana · ' + n; },
    aria: function (n) { return n ? 'Rencana kunjungan, ' + n + ' tujuan' : 'Rencana kunjungan'; },
    button: function (n) { return n ? 'Rencana kunjungan (' + n + ')' : 'Rencana kunjungan'; },
    coarse: function (what) { return 'Lokasi hanya perkiraan (' + what + '). Cek alamat sebelum berangkat.'; },
    longLeg: 'Jarak dari titik sebelumnya jauh, sehingga perkiraan waktunya kasar.',
    farStop: 'Tujuan ini di luar data jalan dashboard, sehingga perkiraannya kasar.',
    memNoKey: 'Rencana kunjungan hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.',
    memBlocked: 'Rencana kunjungan tidak tersimpan di perangkat ini karena penyimpanan browser diblokir.',
    memQuota: 'Penyimpanan browser penuh. Rencana kunjungan hanya tersimpan selama halaman terbuka.'
  };

  /* ------------------------------------------------------------ helpers */

  function noop() {}
  function isFn(f) { return typeof f === 'function'; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function MCD() { return (root && root.MCD) || {}; }
  function VP() { var v = MCD().visitPlan; return v && isFn(v.plan) && isFn(v.checkStop) ? v : null; }
  function doc() { return root && root.document && isFn(root.document.createElement) ? root.document : null; }
  /** The document for events only (Node tests run seal.js with a bare EventTarget as the document). */
  function evDoc() { return root && root.document && isFn(root.document.addEventListener) ? root.document : null; }
  function safe(fn, ctx, args) { try { return fn.apply(ctx || null, args || []); } catch (e) { return undefined; } }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }

  /** 'HH:MM' → minutes after midnight, or NaN. */
  function parseHHMM(s) {
    var m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s == null ? '' : s));
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  }
  /** minutes → 'HH.MM' (24-hour, the Indonesian dot; wraps past midnight). */
  function hhmm(min) {
    if (!isNum(min)) return '—';
    var t = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad2(Math.floor(t / 60)) + '.' + pad2(t % 60);
  }
  function hhmmValue(min) { var t = ((Math.round(min) % 1440) + 1440) % 1440; return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60); }
  function round5(m) { return Math.round(m / 5) * 5; }
  function validDepart(s) { var m = parseHHMM(s); return isNum(m) && m % DEPART_STEP === 0; }

  /* ------------------------------------------------------------ clock and dates (local time of the laptop) */

  var CLOCK = null;
  function nowMs() { var t = CLOCK ? Number(CLOCK()) : Date.now(); return isNum(t) ? t : Date.now(); }
  function ymdOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayStr() { return ymdOf(new Date(nowMs())); }
  function validYmd(s) { return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s); }
  function addDays(ymd, n) {
    var p = ymd.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + n, 12);
    return ymdOf(d);
  }
  /** 'YYYY-MM-DD' → 'Sen, 19 Okt 2026'. */
  function dateLabel(ymd) {
    if (!validYmd(ymd)) return '';
    var p = ymd.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return WEEKDAYS[d.getUTCDay()] + ', ' + p[2] + ' ' + MONTHS[p[1] - 1] + ' ' + p[0];
  }

  /* ------------------------------------------------------------ stops (fail closed) */

  function kindOf(k) {
    var v = VP(), c = v && isFn(v.kindOf) ? v.kindOf(k) : null;
    return c && KINDS.indexOf(c) >= 0 ? c : null;
  }
  /** {ok, stop} with a fresh {id, kind, label, lon, lat, geoPrecision?}, or {ok: false, code, message}. The input is
   *  checked as given (a lead row, a private flag or a customer field refuses it), then the copy is checked again. */
  function freshStop(input) {
    var v = VP();
    if (!v) return { ok: false, code: 'no-planner', message: T.noPlanner };
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, code: 'invalid-kind', message: T.notPublic };
    var c0 = safe(v.checkStop, v, [input]);
    if (c0 === undefined || c0 === 'private') return { ok: false, code: 'private', message: T.privateStop };
    var kind = null, id = null, label = '', lon = NaN, lat = NaN, geo = null;
    try {
      kind = kindOf(input.kind);
      id = typeof input.id === 'string' ? input.id.trim() : (typeof input.id === 'number' ? String(input.id) : '');
      label = cleanText(input.label, MAX_LABEL);
      lon = Number(input.lon != null ? input.lon : input.lng);
      lat = Number(input.lat);
      geo = typeof input.geoPrecision === 'string' ? input.geoPrecision.trim().toUpperCase().slice(0, 20) : null;
    } catch (e) { return { ok: false, code: 'private', message: T.privateStop }; }
    if (c0 || !kind || !id || id.length > MAX_ID || !ID_RE[kind].test(id)) return { ok: false, code: 'invalid-kind', message: T.notPublic };
    // Indonesia only: a swapped or empty pair is refused, never planned
    if (!isNum(lon) || !isNum(lat) || lon < 94 || lon > 142 || lat < -12 || lat > 7) return { ok: false, code: 'invalid-point', message: T.badPoint };
    var stop = { id: id, kind: kind, label: label || KIND_NAME[kind], lon: Math.round(lon * 1e6) / 1e6, lat: Math.round(lat * 1e6) / 1e6 };
    if (geo && /^[A-Z_]{2,20}$/.test(geo)) stop.geoPrecision = geo;
    if (v.checkStop(stop) !== null) return { ok: false, code: 'invalid-kind', message: T.notPublic };
    return { ok: true, stop: stop };
  }
  function copyStop(s) {
    var o = { id: s.id, kind: s.kind, label: s.label, lon: s.lon, lat: s.lat };
    if (s.geoPrecision) o.geoPrecision = s.geoPrecision;
    return o;
  }
  function cleanStops(list) {
    var out = [], seen = {};
    (Array.isArray(list) ? list : []).forEach(function (s) {
      if (out.length >= MAX_STOPS) return;
      var f = freshStop(s);
      if (f.ok && !seen[f.stop.id]) { seen[f.stop.id] = 1; out.push(f.stop); }
    });
    return out;
  }
  function cleanOpts(o) {
    o = isObj(o) ? o : {};
    return {
      mode: o.mode === 'motor' ? 'motor' : 'mobil',
      returnToStart: typeof o.returnToStart === 'boolean' ? o.returnToStart : DEFAULT_OPTS.returnToStart,
      keepOrder: o.keepOrder === true,
      departAt: validDepart(o.departAt) ? o.departAt : DEFAULT_OPTS.departAt,
      dwellMin: DWELLS.indexOf(Number(o.dwellMin)) >= 0 ? Number(o.dwellMin) : DEFAULT_OPTS.dwellMin
    };
  }
  function emptyDay(date, opts) {
    var o = cleanOpts(opts);
    o.keepOrder = false;
    return { date: date, stops: [], opts: o };
  }
  /** A stored entry → a day, or null (fail closed: unknown shapes are dropped, never shown). */
  function cleanDay(e, withOpts) {
    if (!isObj(e) || e.v !== 1 || !validYmd(e.date)) return null;
    var d = { date: e.date, stops: cleanStops(e.stops) };
    if (withOpts) d.opts = cleanOpts(e.opts);
    return d;
  }

  /* ------------------------------------------------------------ state */

  var S = {
    today: emptyDay(todayStr(), DEFAULT_OPTS),
    prev: null,
    store: null, unsubStore: null, readyP: null,
    loaded: false,          // the sealed copy has been read (or there is no seal)
    pre: false,             // changes made before the sealed copy was read (merged at load)
    locked: false,          // mcd:gate-locking seen: the page reloads; nothing is planned until then
    listeners: [],
    clockOn: false, timer: null,
    // card
    frame: null, rootEl: null, content: null, live: null, sticky: null, titleEl: null,
    fk: null, drag: null, menu: null, unsubState: null, onResize: null, returnFocus: null,
    status: null
  };

  function sealApi() { var s = MCD().seal; return s && isFn(s.store) && isFn(s.state) ? s : null; }
  function store() {
    if (S.store) return S.store;
    var Sl = sealApi();
    if (!Sl) return null;
    try {
      S.store = Sl.store(STORE_NAME);
      if (S.store && isFn(S.store.on)) S.unsubStore = S.store.on(onStoreEvent);
    } catch (e) { S.store = null; }
    return S.store;
  }
  function onStoreEvent(data, info) {
    var why = info && info.change;
    if (S.locked || !S.loaded || !STATE_EVENTS[why]) return;   // our own writes and status changes are already in memory
    adopt();
    changed('load');
  }

  /** The sealed copy → memory (another tab's change, the first load). The sealed day moves to today first (an older
   *  plan becomes `prev`); stops added in this page before the copy opened are then added to today (no doubles, at
   *  most 15), whatever date the page started with, so they are never lost and an older sealed plan is never dropped. */
  function adopt() {
    var st = store();
    if (!st) return;
    var data = {};
    try { data = st.data() || {}; } catch (e) { data = {}; }
    var t = cleanDay(data.today, true), p = cleanDay(data.prev, false);
    var before = S.pre ? S.today : null;
    S.today = t || emptyDay(todayStr(), S.today.opts);
    S.prev = p && p.stops.length ? p : null;
    S.pre = false;
    var write = rollover();
    if (before && before.stops.length) {
      var ids = {};
      S.today.stops.forEach(function (s) { ids[s.id] = 1; });
      before.stops.forEach(function (s) {
        if (ids[s.id] || S.today.stops.length >= MAX_STOPS) return;
        ids[s.id] = 1;
        S.today.stops.push(s);
      });
      write = true;
    }
    if (write) persist();
  }

  /** A plan dated before today moves to `prev` (when it holds stops); today starts empty. → true when it moved. */
  function rollover() {
    var d = todayStr();
    if (S.today.date === d) return false;
    if (S.today.date > d) { S.today.date = d; return true; }   // the laptop clock went back: keep the plan as today's
    if (S.today.stops.length) S.prev = { date: S.today.date, stops: S.today.stops.map(copyStop) };
    S.today = emptyDay(d, S.today.opts);
    return true;
  }

  function persist() {
    if (S.locked) return;
    var st = store();
    if (!st) return;
    if (!S.loaded) { S.pre = true; return; }
    var t = S.today, next = { today: { v: 1, date: t.date, stops: t.stops.map(copyStop), opts: optsOut(t.opts, t.stops) } };
    if (S.prev && S.prev.stops.length) next.prev = { v: 1, date: S.prev.date, stops: S.prev.stops.map(copyStop) };
    var p = safe(st.write, st, [next]);
    if (p && isFn(p.then)) p.then(function (r) { S.status = r && r.ok === false ? r.error || 'error' : null; }, noop);
  }

  function optsOut(o, stops) {
    return { mode: o.mode, returnToStart: o.returnToStart, keepOrder: o.keepOrder, order: stops.map(function (s) { return s.id; }),
      departAt: o.departAt, dwellMin: o.dwellMin };
  }

  /* ------------------------------------------------------------ events */

  function emit(detail) {
    S.listeners.slice().forEach(function (fn) { try { fn(detail); } catch (e) { /* a listener's error is its own */ } });
    var d = evDoc();
    if (d && isFn(d.dispatchEvent) && isFn(root.CustomEvent)) {
      try { d.dispatchEvent(new root.CustomEvent('mcd:plan', { detail: detail })); } catch (e) { /* ignore */ }
    }
  }
  /** Tell listeners (count and type only), repaint an open card and the map overlay. */
  function changed(type, extra) {
    var detail = { type: type, n: S.today.stops.length };
    if (extra && extra.reason) detail.reason = extra.reason;
    emit(detail);
    if (S.rootEl) paint();
  }

  function startClock() {
    if (S.clockOn || !root) return;
    S.clockOn = true;
    if (isFn(root.setInterval)) {
      S.timer = root.setInterval(tick, DAY_CHECK_MS);
      if (S.timer && isFn(S.timer.unref)) S.timer.unref();   // Node: never keeps a test process alive
    }
    if (isFn(root.addEventListener)) root.addEventListener('focus', tick);
    var d = evDoc();
    if (d) d.addEventListener('visibilitychange', function () { if (!d.hidden) tick(); });
  }
  /** Midnight check (focus, visibility and every 10 minutes). */
  function tick() {
    if (S.locked || !S.loaded) return false;
    if (!rollover()) return false;
    persist();
    changed('day');
    return true;
  }

  function onLocking() {
    S.locked = true;
    closeFrame('lock');
    S.today = emptyDay(todayStr(), DEFAULT_OPTS);
    S.prev = null;
    S.pre = false;
    emit({ type: 'lock', n: 0 });
  }
  (function hook() {
    var d = evDoc();
    if (d) d.addEventListener('mcd:gate-locking', onLocking);
  })();

  /* ------------------------------------------------------------ API: store and plan */

  function ready() {
    if (!S.readyP) S.readyP = loadOnce();
    return S.readyP.then(function () { return state(); });
  }
  function loadOnce() {
    var st = store();
    if (!st) {
      S.loaded = true;
      startClock();
      return Promise.resolve();
    }
    return Promise.resolve(st.ready).then(function () {
      if (S.locked) return;
      S.loaded = true;
      adopt();
      startClock();
      changed('load');
    }, function () { S.loaded = true; startClock(); });
  }

  function state() {
    if (S.locked) return 'locked';
    var Sl = sealApi();
    if (!Sl) return 'memory';
    var g = safe(Sl.state, Sl) || 'locked';
    if (g === 'locked') return 'locked';
    var st = store();
    if (!st) return 'memory';
    if (safe(st.status, st) === 'loading') return g === 'memory' ? 'memory' : 'locked';
    return safe(st.persisted, st) ? 'ready' : 'memory';
  }
  /** The memory line in words (v6 pattern), or '' when the plan is sealed. */
  function memoryLine() {
    if (state() !== 'memory') return '';
    var Sl = sealApi(), why = Sl && isFn(Sl.reason) ? safe(Sl.reason, Sl) : null;
    if (S.status === 'quota' || why === 'quota') return T.memQuota;
    if (why === 'no-storage') return T.memBlocked;
    return T.memNoKey;
  }

  function guard() {
    if (S.locked) return { ok: false, code: 'locked', message: T.locked };
    if (!S.loaded && !store()) S.loaded = true;
    // the day moved before the midnight check ran: listeners hear it (count and type only); no repaint from here,
    // because paint() itself reads the day through labels()
    if (S.loaded && rollover()) { persist(); emit({ type: 'day', n: S.today.stops.length }); }
    return null;
  }

  function today() {
    guard();
    var t = S.today;
    return { date: t.date, stops: t.stops.map(copyStop), opts: Object.assign(optsOut(t.opts, t.stops)) };
  }
  function count() { guard(); return S.today.stops.length; }
  function hasStop(id) { return S.today.stops.some(function (s) { return s.id === String(id); }); }
  function indexOf(id) { for (var i = 0; i < S.today.stops.length; i++) if (S.today.stops[i].id === String(id)) return i; return -1; }

  function previous() {
    guard();
    var p = S.prev;
    if (!p || !p.stops.length) return null;
    var yesterday = p.date === addDays(S.today.date, -1);
    return { date: p.date, n: p.stops.length, yesterday: yesterday,
      text: yesterday ? T.prevYesterday(p.stops.length) : T.prevOlder(dateLabel(p.date), p.stops.length) };
  }
  /** "Gunakan lagi": the previous plan's stops into today (checked again, no doubles, at most 15). → how many. */
  function reuse() {
    if (guard()) return 0;
    var p = S.prev;
    if (!p) return 0;
    var n = 0;
    cleanStops(p.stops).forEach(function (s) {
      if (S.today.stops.length >= MAX_STOPS || hasStop(s.id)) return;
      S.today.stops.push(s);
      n++;
    });
    if (n) { persist(); changed('reuse'); say(T.reused(n)); }
    return n;
  }

  function add(input) {
    var g = guard();
    if (g) return { ok: false, n: S.today.stops.length, code: g.code, message: g.message };
    var f = freshStop(input);
    if (!f.ok) return { ok: false, n: S.today.stops.length, code: f.code, message: f.message };
    if (hasStop(f.stop.id)) return { ok: false, n: S.today.stops.length, code: 'duplicate', message: T.dup };
    if (S.today.stops.length >= MAX_STOPS) {
      var v = VP(), r = v.plan({ stops: S.today.stops.concat([f.stop]) });
      return { ok: false, n: S.today.stops.length, code: 'too-many', message: r && r.code === 'too-many' ? r.message : T.tooMany };
    }
    S.today.stops.push(f.stop);
    persist();
    changed('add');
    return { ok: true, n: S.today.stops.length };
  }
  function remove(id) {
    if (guard()) return false;
    var i = indexOf(id);
    if (i < 0) return false;
    S.today.stops.splice(i, 1);
    if (S.today.stops.length < 2) S.today.opts.keepOrder = false;
    persist();
    changed('remove');
    return true;
  }
  /** The order on screen: the user's own order, or the planned one ("Urutkan otomatis"). → [id] */
  function shownOrder() {
    if (S.today.opts.keepOrder || S.today.stops.length < 2) return S.today.stops.map(function (s) { return s.id; });
    var c = compute();
    if (!c.ok) return S.today.stops.map(function (s) { return s.id; });
    return c.rows.map(function (r) { return r.id; });
  }
  /** Moves a stop to toIndex (0-based) of the order on screen and keeps that order as the user's own (keepOrder). */
  function move(id, toIndex) {
    var g = guard();
    if (g) return { ok: false, code: g.code, message: g.message };
    var order = shownOrder(), from = order.indexOf(String(id));
    if (from < 0) return { ok: false, code: 'unknown' };
    var to = Math.max(0, Math.min(order.length - 1, Math.floor(Number(toIndex))));
    if (!isNum(to)) return { ok: false, code: 'invalid' };
    order.splice(to, 0, order.splice(from, 1)[0]);
    var byId = {};
    S.today.stops.forEach(function (s) { byId[s.id] = s; });
    S.today.stops = order.map(function (k) { return byId[k]; });
    S.today.opts.keepOrder = true;
    persist();
    var text = T.moved(from + 1, to + 1);
    changed('move');
    return { ok: true, from: from, to: to, text: text };
  }
  /** set({mode, returnToStart, keepOrder, departAt, dwellMin, order}) → {ok, changed: [key], errors: [key]} */
  function set(patch) {
    var g = guard();
    if (g) return { ok: false, changed: [], errors: [], code: g.code, message: g.message };
    patch = isObj(patch) ? patch : {};
    var o = S.today.opts, ch = [], bad = [];
    function put(k, v) { if (o[k] !== v) { o[k] = v; ch.push(k); } }
    if (has(patch, 'mode')) { if (patch.mode === 'mobil' || patch.mode === 'motor') put('mode', patch.mode); else bad.push('mode'); }
    if (has(patch, 'returnToStart')) { if (typeof patch.returnToStart === 'boolean') put('returnToStart', patch.returnToStart); else bad.push('returnToStart'); }
    if (has(patch, 'keepOrder')) { if (typeof patch.keepOrder === 'boolean') put('keepOrder', patch.keepOrder); else bad.push('keepOrder'); }
    if (has(patch, 'departAt')) { if (validDepart(patch.departAt)) put('departAt', patch.departAt); else bad.push('departAt'); }
    if (has(patch, 'dwellMin')) { var dw = Number(patch.dwellMin); if (DWELLS.indexOf(dw) >= 0) put('dwellMin', dw); else bad.push('dwellMin'); }
    if (has(patch, 'order')) {
      var ord = Array.isArray(patch.order) ? patch.order.map(String) : null, cur = S.today.stops.map(function (s) { return s.id; });
      var same = ord && ord.length === cur.length && ord.every(function (k) { return cur.indexOf(k) >= 0; }) &&
        ord.filter(function (k, i) { return ord.indexOf(k) === i; }).length === ord.length;
      if (!same) bad.push('order');
      else if (ord.join('|') !== cur.join('|')) {
        var byId = {};
        S.today.stops.forEach(function (s) { byId[s.id] = s; });
        S.today.stops = ord.map(function (k) { return byId[k]; });
        ch.push('order');
      }
    }
    if (ch.length) { persist(); changed('set'); }
    return { ok: !bad.length, changed: ch, errors: bad };
  }
  function clearPlan() {
    if (guard()) return false;
    S.today.stops = [];
    S.today.opts.keepOrder = false;
    persist();
    changed('clear');
    return true;
  }

  /* ------------------------------------------------------------ compute: order, arrivals, links */

  function startPoint() {
    var b = MCD().config && MCD().config.branch, v = VP();
    var k = (v && v.KCP) || { lon: 106.90989, lat: -6.33203 };
    var lon = b && isNum(b.lon) ? b.lon : k.lon, lat = b && isNum(b.lat) ? b.lat : k.lat;
    return { id: 'kcp', kind: 'cabang', label: 'KCP Jakarta Cilangkap', lon: lon, lat: lat };
  }

  /** §7.4 on a plan result: [{seq, id, arriveMin, text}] and the return {arriveMin, text} | null. Pure. */
  function arrivals(r, departAt, dwellMin) {
    var start = parseHHMM(departAt), dwell = Number(dwellMin) || 0, list = [], back = null, acc = 0;
    if (!r || !r.ok || !isNum(start)) return { list: list, back: back };
    for (var i = 0; i < r.legs.length; i++) {
      acc += r.legs[i].minEst;
      var to = r.order[i + 1];
      if (!to) break;
      if (to.role === 'stop') {
        var m = round5(start + acc + dwell * (to.seq - 1));
        list.push({ seq: to.seq, id: to.id, arriveMin: m, text: T.arrive(m) });
      } else if (to.role === 'end') {
        var mb = round5(start + acc + dwell * r.count);
        back = { arriveMin: mb, text: T.backAt(mb) };
      }
    }
    return { list: list, back: back };
  }

  function warningText(w, stop) {
    if (w.code === 'coarse-location') return T.coarse(COARSE[stop && stop.geoPrecision] || 'pusat kelurahan');
    if (w.code === 'long-leg') return T.longLeg;
    if (w.code === 'far-stop') return T.farStop;
    return '';
  }

  function compute() {
    var v = VP();
    if (!v) return { ok: false, code: 'no-planner', message: T.noPlanner };
    var t = S.today, o = t.opts;
    if (!t.stops.length) {
      var r0 = v.plan({ stops: [] });
      return { ok: false, code: 'empty', message: r0 && r0.message ? r0.message : '' };
    }
    var base = { stops: t.stops.map(copyStop), start: startPoint(), returnToStart: o.returnToStart, mode: o.mode };
    var own = v.plan(Object.assign({}, base, { keepOrder: true }));
    var auto = t.stops.length > 1 ? v.plan(Object.assign({}, base, { keepOrder: false })) : own;
    var r = o.keepOrder ? own : auto;
    if (!r || !r.ok) return { ok: false, code: (r && r.code) || 'invalid', message: (r && r.message) || '' };
    var a = arrivals(r, o.departAt, o.dwellMin), bySeq = {}, byId = {};
    a.list.forEach(function (x) { bySeq[x.seq] = x; });
    t.stops.forEach(function (s) { byId[s.id] = s; });
    var warn = {};
    (r.warnings || []).forEach(function (w) { (warn[w.seq] = warn[w.seq] || []).push(w); });
    var rows = r.order.filter(function (p) { return p.role === 'stop'; }).map(function (p) {
      var s = byId[p.id];
      return {
        seq: p.seq, id: p.id, kind: s.kind, label: s.label, arrive: bySeq[p.seq] || null,
        leg: v.legText(r.legs[p.seq - 1]),
        warnings: (warn[p.seq] || []).map(function (w) { return warningText(w, s); }).filter(Boolean)
      };
    });
    var backWarn = r.returnToStart ? (warn[r.order.length - 1] || []).map(function (w) { return warningText(w, null); }).filter(Boolean) : [];
    return {
      ok: true, r: r, arrivals: a.list, back: a.back, backWarnings: backWarn, rows: rows,
      links: v.mapsLinks(r, { travelmode: 'driving' }),
      phoneLinks: v.mapsLinks(r, { maxWaypoints: PHONE_WAYPOINTS, travelmode: 'driving' }),
      totals: { auto: auto && auto.ok ? auto.totalMinEst : null, own: own && own.ok ? own.totalMinEst : null },
      totalText: { auto: auto && auto.ok ? v.minText(auto.totalMinEst) : '—', own: own && own.ok ? v.minText(own.totalMinEst) : '—' },
      summary: v.summary(r)
    };
  }

  /** The numbered stops for MCD.map.setPlanOverlay (MAP lane): coordinates and the order only. */
  function overlay() {
    if (S.locked || !S.today.stops.length) return null;
    var c = compute();
    if (!c.ok) return null;
    return {
      stops: c.r.order.filter(function (p) { return p.role === 'stop'; }).map(function (p) { return { seq: p.seq, lon: p.lon, lat: p.lat }; }),
      line: true, returnToStart: !!c.r.returnToStart
    };
  }

  /** Words for the top bar, the tray chip and Lainnya; the day is checked first, so after midnight the title moves on. */
  function labels() {
    guard();
    var n = S.today.stops.length;
    return { title: T.title + ' · ' + dateLabel(S.today.date), chip: T.chip(n), button: T.button(n), aria: T.aria(n) };
  }

  /* ------------------------------------------------------------ quick action ("+ Rencana kunjungan") */

  function toast(msg) { var A = MCD().app; if (A && isFn(A.toast) && msg) safe(A.toast, A, [msg]); }

  /** For callout link rows ({label, run}) and sheet heads (windows.js quickEl: {label, run, done}). null when the
   *  place cannot be planned (an LVM-only store, a lead, a kecamatan, no coordinates). */
  function quick(spec) {
    var f = freshStop(spec);
    if (!f.ok) return null;
    var id = f.stop.id;
    function doneSpec() {
      var rm = function () { if (remove(id)) { toast(T.removed); return true; } return false; };
      return { label: T.done, text: '', edit: rm, editLabel: T.removeOne, remove: rm };
    }
    return {
      id: 'plan', label: T.add, title: T.addTip,
      run: function () {
        var r = add(spec);
        if (!r.ok) { toast(r.message); return { ok: false, text: r.message, code: r.code }; }
        var text = T.added(r.n);
        toast(text);
        return { ok: true, text: text, done: doneSpec() };
      },
      done: hasStop(id) ? doneSpec() : null
    };
  }

  /* ------------------------------------------------------------ placement (§7.3, D14), pure */

  /**
   * ctx {width, layout: 'map' | 'page', view: 'deep' | 'overview', pins: n (other pinned cards), sheetOpen,
   * sheetSide: 'left' | 'right'} → {mode: 'pin' | 'sheet' | 'over' | 'full', side?, refuse?}
   */
  function placement(ctx) {
    ctx = ctx || {};
    var w = isNum(ctx.width) ? ctx.width : 1366;
    if (w <= PHONE_MAX) return { mode: 'full' };
    if (ctx.layout === 'page' || w <= TABLET_MAX) return { mode: 'over' };
    if (ctx.view === 'overview' || w < PIN_MIN) return { mode: 'sheet' };
    if ((Number(ctx.pins) || 0) >= MAX_PINS) return { mode: 'pin', refuse: T.pinMax };
    var side = ctx.sheetOpen ? (ctx.sheetSide === 'left' ? 'right' : 'left') : 'left';
    return { mode: 'pin', side: side };
  }

  function placeContext() {
    var d = doc(), b = d && d.body, A = MCD().app, Wn = MCD().windows;
    var width = isNum(root.innerWidth) ? root.innerWidth : 1366;
    var layout = b && isFn(b.getAttribute) && b.getAttribute('data-layout') === 'page' ? 'page' : 'map';
    var view = A && isFn(A.view) ? safe(A.view, A) : null;
    if (!view) { var st = MCD().state && isFn(MCD().state.get) ? safe(MCD().state.get, MCD().state) : null; view = st && st.view; }
    var list = Wn && isFn(Wn.list) ? safe(Wn.list, Wn) || [] : [];
    var pins = 0, sheetOpen = false, sheetSide = 'right';
    list.forEach(function (c) {
      if (!c || c.kind === 'plan' || c.id === 'plan') return;
      if (c.pinned) pins++;
      if (c.id === 'detail' && c.state !== 'min' && c.state !== 'closed') {
        sheetOpen = true;
        if (c.rect && isNum(c.rect.x) && isNum(c.rect.w)) sheetSide = c.rect.x + c.rect.w / 2 < width / 2 ? 'left' : 'right';
      }
    });
    return { width: width, layout: layout, view: view === 'overview' ? 'overview' : 'deep', pins: pins, sheetOpen: sheetOpen, sheetSide: sheetSide };
  }

  /* ------------------------------------------------------------ DOM helpers */

  var NS = 'http://www.w3.org/2000/svg';
  var uidN = 0;
  function uid(p) { uidN += 1; return p + '-' + uidN; }
  function h(tag, attrs, kids) {
    var el = doc().createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'hidden') el.hidden = true;
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    (Array.isArray(kids) ? kids : (kids == null ? [] : [kids])).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? doc().createTextNode(c) : c);
    });
    return el;
  }
  function icon(name, cls) {
    var d = doc();
    var s = d.createElementNS(NS, 'svg');
    s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = d.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function on(el, type, fn) { el.addEventListener(type, fn); return el; }
  function reduced() {
    var M = MCD().motion;
    try { if (M && isFn(M.reduced)) return !!M.reduced(); } catch (e) { /* fall through */ }
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e2) { return false; }
  }
  function veiled() {
    var A = MCD().app;
    if (A && isFn(A.privacyMode) && isFn(A.isBooted) && A.isBooted()) return safe(A.privacyMode, A) === 'veil';
    var st = MCD().state && isFn(MCD().state.get) ? safe(MCD().state.get, MCD().state) : null;
    return !!(st && st.privacy && st.privacy.veil);
  }
  function initials(label) {
    var U = MCD().util, m = U && U.mask && isFn(U.mask.initials) ? safe(U.mask.initials, U.mask, [label]) : null;
    if (m) return m;
    return String(label || '').split(/\s+/).filter(function (t) { return /[A-Za-z]/.test(t); }).slice(0, 3)
      .map(function (t) { return t.replace(/^[^A-Za-z]+/, '').charAt(0).toUpperCase(); }).join('');
  }
  function isPhone() { return (isNum(root.innerWidth) ? root.innerWidth : 1366) <= PHONE_MAX; }
  function say(text) {
    if (!S.live || !text) return;
    S.live.textContent = '';
    S.live.textContent = text;
  }

  /* ------------------------------------------------------------ layout memory (layout only, D36) */

  function uiGet() {
    try {
      var raw = root.localStorage ? root.localStorage.getItem(UI_KEY) : null;
      var o = raw ? JSON.parse(raw) : null;
      return isObj(o) && o.v === 1 ? { settingsOpen: o.settingsOpen === true } : { settingsOpen: false };
    } catch (e) { return { settingsOpen: false }; }
  }
  function uiSet(open) {
    try { if (root.localStorage) root.localStorage.setItem(UI_KEY, JSON.stringify({ v: 1, settingsOpen: !!open })); } catch (e) { /* layout only */ }
  }

  /* ------------------------------------------------------------ the card body */

  /** A radiogroup of buttons with a roving tab stop (← → Home End). */
  function radioGroup(label, opts, cur, onPick, cls, key) {
    var g = h('div', { class: 'seg pl-seg' + (cls ? ' ' + cls : ''), role: 'radiogroup', 'aria-label': label });
    var btns = opts.map(function (o) {
      var sel = o.value === cur;
      var b = h('button', { type: 'button', class: 'seg__opt pl-seg__opt', role: 'radio', 'aria-checked': sel ? 'true' : 'false',
        tabindex: sel ? '0' : '-1', 'data-fk': key + ':' + o.value }, o.nodes || [h('span', { text: o.label })]);
      if (o.title) b.setAttribute('title', o.title);
      on(b, 'click', function () { if (o.value !== cur) onPick(o.value); });
      return b;
    });
    btns.forEach(function (b, i) {
      on(b, 'keydown', function (e) {
        var k = e.key, j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % btns.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = btns.length - 1;
        if (j < 0) return;
        if (e.preventDefault) e.preventDefault();
        S.fk = key + ':' + opts[j].value;
        onPick(opts[j].value);
      });
      g.appendChild(b);
    });
    return g;
  }

  function settingsFold(o) {
    var openNow = uiGet().settingsOpen;
    var bodyId = uid('pl-set');
    var btn = h('button', { type: 'button', class: 'pl-fold__btn', 'aria-expanded': openNow ? 'true' : 'false', 'aria-controls': bodyId, 'data-fk': 'fold' }, [
      icon('chev-r', 'pl-fold__chev'),
      h('span', { class: 'pl-fold__t', text: T.settings }),
      h('span', { class: 'pl-fold__pv', text: T.preview(o) })
    ]);
    var sel = h('select', { class: 'pl-select', id: uid('pl-dep'), 'data-fk': 'depart' });
    var times = [];
    for (var m = DEPART_FIRST; m <= DEPART_LAST; m += DEPART_STEP) times.push(m);
    var cur = parseHHMM(o.departAt);
    if (times.indexOf(cur) < 0) { times.push(cur); times.sort(function (a, b) { return a - b; }); }
    times.forEach(function (t) {
      var op = h('option', { value: hhmmValue(t), text: hhmm(t) });
      if (t === cur) { op.setAttribute('selected', ''); op.selected = true; }
      sel.appendChild(op);
    });
    sel.value = o.departAt;
    on(sel, 'change', function () { S.fk = 'depart'; set({ departAt: sel.value }); });
    var depLabel = h('label', { class: 'pl-set__l', for: sel.getAttribute('id'), text: T.depart });
    var dwell = radioGroup(T.dwell, DWELLS.map(function (d) { return { value: d, label: T.minutes(d) }; }), o.dwellMin,
      function (v) { set({ dwellMin: v }); }, 'pl-dwell', 'dwell');
    var mode = radioGroup(T.vehicle, [{ value: 'mobil', label: T.car }, { value: 'motor', label: T.bike }], o.mode,
      function (v) { set({ mode: v }); }, 'pl-mode', 'mode');
    var cb = h('input', { type: 'checkbox', class: 'pl-check', id: uid('pl-back'), 'data-fk': 'back' });
    cb.checked = !!o.returnToStart;
    if (o.returnToStart) cb.setAttribute('checked', '');
    on(cb, 'change', function () { S.fk = 'back'; set({ returnToStart: !!cb.checked }); });
    var body = h('div', { class: 'pl-fold__body', id: bodyId, hidden: !openNow }, [
      h('div', { class: 'pl-set__row' }, [depLabel, sel]),
      h('div', { class: 'pl-set__row pl-set__row--col' }, [h('span', { class: 'pl-set__l', text: T.dwell }), dwell]),
      h('div', { class: 'pl-set__row pl-set__row--col' }, [h('span', { class: 'pl-set__l', text: T.vehicle }), mode]),
      h('label', { class: 'pl-set__row pl-set__check', for: cb.getAttribute('id') }, [cb, h('span', { text: T.back })])
    ]);
    var wrap = h('div', { class: 'pl-fold' + (openNow ? ' is-open' : '') }, [btn, body]);
    on(btn, 'click', function () {
      var next = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', next ? 'true' : 'false');
      body.hidden = !next;
      wrap.classList.toggle('is-open', next);
      uiSet(next);
    });
    return wrap;
  }

  function orderSwitch(c, o) {
    function opt(label, total) { return [h('span', { class: 'pl-order__l', text: label }), h('span', { class: 'pl-order__t', text: total })]; }
    return radioGroup(T.orderGroup, [
      { value: 'auto', nodes: opt(T.orderAuto, c.totalText.auto) },
      { value: 'own', nodes: opt(T.orderOwn, c.totalText.own) }
    ], o.keepOrder ? 'own' : 'auto', function (v) {
      set({ keepOrder: v === 'own' });
    }, 'pl-order', 'order');
  }

  function closeMenu(focusBack) {
    var m = S.menu;
    if (!m) return;
    S.menu = null;
    if (m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
    if (m.btn) { m.btn.setAttribute('aria-expanded', 'false'); if (focusBack && isFn(m.btn.focus)) m.btn.focus(); }
  }
  function openMenu(btn, row, idx, n, id) {
    closeMenu(false);
    var items = [
      { label: T.up, disabled: idx === 0, run: function () { var r = move(id, idx - 1); if (r.ok) say(r.text); } },
      { label: T.down, disabled: idx === n - 1, run: function () { var r = move(id, idx + 1); if (r.ok) say(r.text); } },
      { label: T.removeOne, run: function () { if (remove(id)) say(T.removed); } }
    ];
    var el = h('div', { class: 'pl-menu', role: 'menu', 'aria-label': btn.getAttribute('aria-label') });
    var bs = items.map(function (it) {
      var b = h('button', { type: 'button', class: 'pl-menu__i', role: 'menuitem', tabindex: '-1', text: it.label });
      if (it.disabled) { b.setAttribute('aria-disabled', 'true'); b.disabled = true; }
      on(b, 'click', function () { if (it.disabled) return; S.fk = 'menu:' + id; closeMenu(false); it.run(); });
      el.appendChild(b);
      return b;
    });
    on(el, 'keydown', function (e) {
      var live = bs.filter(function (b) { return !b.disabled; }), i = live.indexOf(doc().activeElement);
      if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); closeMenu(true); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (e.preventDefault) e.preventDefault();
        var j = e.key === 'ArrowDown' ? (i + 1) % live.length : (i - 1 + live.length) % live.length;
        if (live[j]) live[j].focus();
      }
      if (e.key === 'Tab') closeMenu(false);
    });
    row.appendChild(el);
    btn.setAttribute('aria-expanded', 'true');
    S.menu = { el: el, btn: btn };
    var first = bs.filter(function (b) { return !b.disabled; })[0];
    if (first && isFn(first.focus)) first.focus();
  }

  /** Keyboard reordering on the handle: Space or Enter picks up, ↑ ↓ move, Space or Enter drops, Esc cancels. */
  function gripKeys(grip, row, list, idx, id) {
    on(grip, 'keydown', function (e) {
      var k = e.key, dg = S.drag;
      if (k === ' ' || k === 'Spacebar' || k === 'Enter') {
        if (e.preventDefault) e.preventDefault();
        if (dg && dg.id === id && dg.kbd) {
          S.drag = null;
          row.classList.remove('is-picked');
          if (dg.to !== dg.from) { S.fk = 'grip:' + id; var r = move(id, dg.to); if (r.ok) say(r.text); }
          else say(T.position(dg.from + 1));
          return;
        }
        S.drag = { id: id, kbd: true, from: idx, to: idx, row: row, list: list };
        row.classList.add('is-picked');
        grip.setAttribute('aria-pressed', 'true');
        say(T.picked(idx + 1));
        return;
      }
      if (!dg || dg.id !== id || !dg.kbd) return;
      if (k === 'Escape') {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        S.drag = null;
        S.fk = 'grip:' + id;
        paint();
        say(T.cancelled);
        return;
      }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        if (e.preventDefault) e.preventDefault();
        var rows = list.children, to = dg.to + (k === 'ArrowUp' ? -1 : 1);
        if (to < 0 || to >= rows.length) return;
        var ref = k === 'ArrowUp' ? rows[to] : rows[to].nextSibling || null;
        list.insertBefore(row, ref);
        dg.to = to;
        if (isFn(grip.focus)) grip.focus();
        say(T.position(to + 1));
      }
    });
  }

  /** Pointer drag on the handle: the row follows the pointer; dropping between rows moves the stop there. */
  function gripPointer(grip, row, list, idx, id) {
    on(grip, 'pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      if (e.preventDefault) e.preventDefault();
      var rows = Array.prototype.slice.call(list.children || []);
      var mids = rows.map(function (r) { var b = isFn(r.getBoundingClientRect) ? r.getBoundingClientRect() : null; return b ? b.top + b.height / 2 : 0; });
      S.drag = { id: id, kbd: false, from: idx, to: idx, y0: e.clientY, mids: mids, row: row, list: list };
      row.classList.add('is-dragging');
      if (isFn(grip.setPointerCapture) && e.pointerId != null) safe(grip.setPointerCapture, grip, [e.pointerId]);
    });
    on(grip, 'pointermove', function (e) {
      var dg = S.drag;
      if (!dg || dg.id !== id || dg.kbd) return;
      // the drop index = how many other rows have their middle above the pointer
      var dy = e.clientY - dg.y0, y = e.clientY, to = 0;
      for (var i = 0; i < dg.mids.length; i++) if (i !== dg.from && y > dg.mids[i]) to++;
      dg.to = to;
      if (row.style) row.style.transform = 'translateY(' + Math.round(dy) + 'px)';
      Array.prototype.slice.call(list.children || []).forEach(function (r, j) {
        r.classList.toggle('is-drop-before', j === dg.to && dg.to < dg.from);
        r.classList.toggle('is-drop-after', j === dg.to && dg.to > dg.from);
      });
    });
    function end(commit) {
      var dg = S.drag;
      if (!dg || dg.id !== id || dg.kbd) return;
      S.drag = null;
      if (row.style) row.style.transform = '';
      row.classList.remove('is-dragging');
      if (commit && dg.to !== dg.from) { S.fk = 'grip:' + id; var r = move(id, dg.to); if (r.ok) say(r.text); }
      else paint();
    }
    on(grip, 'pointerup', function () { end(true); });
    on(grip, 'pointercancel', function () { end(false); });
  }

  function stopRow(row, idx, n, list, veil) {
    var label = veil ? initials(row.label) || '··' : row.label;
    var grip = h('button', { type: 'button', class: 'pl-grip', 'aria-label': T.grip(row.seq, label), title: T.grip(row.seq, label),
      'aria-describedby': S.helpId || null, 'data-fk': 'grip:' + row.id }, [icon('grip')]);
    var menuBtn = h('button', { type: 'button', class: 'pl-more', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': T.menu(row.seq), title: T.menu(row.seq), 'data-fk': 'menu:' + row.id }, [h('span', { class: 'pl-more__g', 'aria-hidden': 'true', text: '⋮' })]);
    var li = h('li', { class: 'pl-stop' + (veil ? ' is-veiled' : '') }, [
      h('div', { class: 'pl-stop__l1' }, [
        grip,
        h('span', { class: 'pl-num', 'aria-hidden': 'true', text: String(row.seq) }),
        icon(KIND_ICON[row.kind] || 'pin', 'pl-kind'),
        h('span', { class: 'pl-name', title: veil ? null : row.label }, [
          h('span', { class: 'sr-only', text: 'Tujuan ' + row.seq + ', ' + (KIND_NAME[row.kind] || '') + ': ' }),
          h('span', { class: 'pl-name__t', text: label })
        ]),
        menuBtn
      ]),
      h('p', { class: 'pl-stop__l2' }, [
        h('span', { class: 'pl-arr', text: row.arrive ? row.arrive.text : '' }),
        row.arrive ? h('span', { class: 'pl-sep', 'aria-hidden': 'true', text: ' · ' }) : null,
        h('span', { class: 'pl-leg', text: row.leg })
      ])
    ]);
    row.warnings.forEach(function (w) { li.appendChild(h('p', { class: 'pl-warn' }, [icon('warn', 'pl-warn__i'), h('span', { text: w })])); });
    on(menuBtn, 'click', function () {
      if (S.menu && S.menu.btn === menuBtn) { closeMenu(true); return; }
      openMenu(menuBtn, li, idx, n, row.id);
    });
    gripKeys(grip, li, list, idx, row.id);
    gripPointer(grip, li, list, idx, row.id);
    S.rowEls[row.id] = li;
    return li;
  }

  function linkButtons(set, primaryFirst) {
    var out = [];
    (set && set.ok ? set.links : []).forEach(function (l, i) {
      var many = l.parts > 1;
      out.push(h('a', {
        class: 'btn ' + (i === 0 && primaryFirst ? 'btn--primary' : 'btn--secondary') + ' pl-maps',
        href: l.url, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer',
        title: many ? T.partTip(l.part, l.parts) : T.mapsTip, 'data-fk': 'maps:' + l.part
      }, [icon('external'), h('span', { text: many ? T.part(l.part, l.parts) : T.openMaps })]));
    });
    return out;
  }

  function confirmClear() {
    var A = MCD().app;
    function go() { if (clearPlan()) { toast(T.cleared); say(T.cleared); } }
    if (A && isFn(A.confirm)) {
      var p = safe(A.confirm, A, [{ title: T.clear, body: T.clearBody, ok: T.clearOk, cancel: T.cancel, danger: true }]);
      if (p && isFn(p.then)) { p.then(function (yes) { if (yes) go(); }, noop); return; }
    }
    // without the app's dialog: an inline confirmation in the card
    S.confirming = true;
    paint();
  }

  function footer(c, veil, phone, sticky) {
    var foot = h('div', { class: 'pl-foot' });
    var set = phone ? c.phoneLinks : c.links;
    if (veil) foot.appendChild(h('p', { class: 'pl-line pl-line--veil', text: T.veiled }));
    else {
      foot.appendChild(h('p', { class: 'pl-line pl-line--coords', text: T.coordsOnly }));
      if (phone) foot.appendChild(h('p', { class: 'pl-line', text: T.phoneSplit }));
      if (set && set.ok && set.links.length > 1 && set.note) foot.appendChild(h('p', { class: 'pl-line pl-line--note', text: set.note }));
      if (set && !set.ok && set.message) foot.appendChild(h('p', { class: 'pl-line pl-line--err', text: set.message }));
      if (!sticky) foot.appendChild(h('div', { class: 'pl-links' }, linkButtons(set, true)));
    }
    if (S.confirming) {
      var yes = h('button', { type: 'button', class: 'btn btn--danger pl-clear-yes', text: T.clearOk, 'data-fk': 'clear-yes' });
      var no = h('button', { type: 'button', class: 'btn btn--secondary', text: T.cancel, 'data-fk': 'clear-no' });
      on(yes, 'click', function () { S.confirming = false; if (clearPlan()) say(T.cleared); });
      on(no, 'click', function () { S.confirming = false; S.fk = 'clear'; paint(); });
      foot.appendChild(h('div', { class: 'pl-confirm', role: 'group', 'aria-label': T.clear }, [h('p', { text: T.clearBody }), h('div', { class: 'pl-confirm__b' }, [no, yes])]));
      if (!S.fk) S.fk = 'clear-no';
    } else {
      var cb = h('button', { type: 'button', class: 'btn btn--ghost pl-clear', text: T.clear, 'data-fk': 'clear' });
      on(cb, 'click', confirmClear);
      foot.appendChild(cb);
    }
    return foot;
  }

  function stickyRow(c, veil) {
    if (!S.sticky) return;
    clear(S.sticky);
    var links = c && c.ok && !veil ? linkButtons(c.phoneLinks, true) : [];
    links.forEach(function (a) { S.sticky.appendChild(a); });
    var x = h('button', { type: 'button', class: 'btn btn--secondary pl-sticky__close', text: T.close, 'data-fk': 'sticky-close' });
    on(x, 'click', function () { close('button'); });
    S.sticky.appendChild(x);
  }

  function emptyState() {
    var box = h('div', { class: 'pl-empty' }, [h('p', { class: 'pl-empty__t', text: T.empty })]);
    var p = previous();
    if (p) {
      var b = h('button', { type: 'button', class: 'btn btn--secondary pl-reuse', text: T.reuse, 'data-fk': 'reuse' });
      on(b, 'click', function () { S.fk = 'grip:first'; reuse(); });
      box.appendChild(h('div', { class: 'pl-prev' }, [h('p', { class: 'pl-prev__t', text: p.text }), b]));
    }
    return box;
  }

  /** FLIP for a reorder (180 ms): rows slide from where they were. Reduced motion: instant. */
  function flipBefore() {
    var out = {};
    if (reduced()) return out;
    Object.keys(S.rowEls || {}).forEach(function (id) {
      var el = S.rowEls[id];
      if (el && isFn(el.getBoundingClientRect)) { var b = el.getBoundingClientRect(); out[id] = b.top; }
    });
    return out;
  }
  function flipAfter(before) {
    if (reduced()) return;
    var M = MCD().motion, ms = (M && M.dur && M.dur.fast) || 180, ease = (M && M.ease && M.ease.out) || 'cubic-bezier(.22,1,.36,1)';
    Object.keys(before).forEach(function (id) {
      var el = S.rowEls[id];
      if (!el || !isFn(el.getBoundingClientRect) || !isFn(el.animate)) return;
      var dy = before[id] - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      safe(el.animate, el, [[{ transform: 'translateY(' + dy + 'px)' }, { transform: 'translateY(0)' }], { duration: ms, easing: ease }]);
    });
  }

  function restoreFocus(fk) {
    if (!fk || !S.rootEl) return;
    var cand = null, holders = [S.content, S.sticky].filter(Boolean);
    holders.forEach(function (hd) {
      if (cand || !isFn(hd.querySelectorAll)) return;
      var list = hd.querySelectorAll('[data-fk]');
      for (var i = 0; i < list.length; i++) {
        var k = list[i].getAttribute('data-fk');
        if (k === fk || (fk === 'grip:first' && /^grip:/.test(k))) { cand = list[i]; break; }
      }
    });
    if (cand && isFn(cand.focus)) cand.focus();
  }

  /** (Re)builds the card body; one body for every frame. */
  function paint() {
    if (!S.content || !doc()) return;
    var d = doc(), act = d.activeElement, fk = S.fk;
    if (!fk && act && S.rootEl && isFn(S.rootEl.contains) && S.rootEl.contains(act) && isFn(act.getAttribute)) fk = act.getAttribute('data-fk');
    if (!fk && act && S.sticky && isFn(S.sticky.contains) && S.sticky.contains(act) && isFn(act.getAttribute)) fk = act.getAttribute('data-fk');
    S.fk = null;
    S.drag = null;            // a repaint ends a pick-up or drag in progress
    closeMenu(false);
    var before = flipBefore();
    S.rowEls = {};
    clear(S.content);
    var title = labels().title;   // checks the day first, so the body below paints the same day as the title
    var veil = veiled(), phone = S.frame ? S.frame.mode === 'full' : isPhone(), t = S.today, n = t.stops.length;
    if (S.titleEl) S.titleEl.textContent = title;
    var mem = memoryLine();
    if (mem) S.content.appendChild(h('p', { class: 'pl-state', text: mem }));
    var c = n ? compute() : null;
    if (!n) {
      S.confirming = false;
      S.content.appendChild(emptyState());
    } else if (!c.ok) {
      S.content.appendChild(h('p', { class: 'pl-sum pl-sum--err', text: c.message }));
    } else {
      S.content.appendChild(h('p', { class: 'pl-sum', text: c.summary }));
      S.content.appendChild(settingsFold(t.opts));
      if (n >= 3) S.content.appendChild(orderSwitch(c, t.opts));
      var list = h('ol', { class: 'pl-list', role: 'list', 'aria-label': T.title });
      c.rows.forEach(function (r, i) { list.appendChild(stopRow(r, i, c.rows.length, list, veil)); });
      S.content.appendChild(list);
      if (c.back) {
        var bk = h('p', { class: 'pl-back' }, [icon('target', 'pl-back__i'), h('span', { text: c.back.text })]);
        S.content.appendChild(bk);
        c.backWarnings.forEach(function (w) { S.content.appendChild(h('p', { class: 'pl-warn' }, [icon('warn', 'pl-warn__i'), h('span', { text: w })])); });
      }
      S.content.appendChild(h('p', { class: 'pl-line pl-line--traffic', text: T.traffic }));
      S.content.appendChild(footer(c, veil, phone, !!S.sticky));
    }
    stickyRow(c, veil);
    restoreFocus(fk);
    flipAfter(before);
    syncOverlay();
    if (S.frame && S.frame.handle && isFn(S.frame.handle.retitle)) safe(S.frame.handle.retitle, S.frame.handle, [title]);
  }

  function syncOverlay() {
    var Mp = MCD().map;
    if (!Mp) return;
    var mapTab = S.frame && (S.frame.mode === 'pin' || S.frame.mode === 'sheet');
    var o = mapTab && isOpen() ? overlay() : null;
    if (o && isFn(Mp.setPlanOverlay)) safe(Mp.setPlanOverlay, Mp, [o]);
    else if (isFn(Mp.clearPlanOverlay)) safe(Mp.clearPlanOverlay, Mp);
  }

  /** mount(host, {mode}) → {el, update(), destroy()}: the card body inside a frame someone else owns (SHELL). */
  function mount(host, o) {
    if (!doc() || !host) return null;
    o = o || {};
    unmountBody();
    var rootEl = h('div', { class: 'pl-card' + (o.mode === 'full' ? ' pl-card--phone' : '') });
    S.helpId = uid('pl-help');
    var help = h('p', { class: 'sr-only', id: S.helpId, text: 'Spasi untuk mengangkat, panah atas atau bawah untuk memindah, spasi untuk melepas, Esc untuk batal.' });
    S.content = h('div', { class: 'pl-card__body' });
    S.live = h('p', { class: 'sr-only pl-live', 'aria-live': 'polite', role: 'status' });
    rootEl.appendChild(S.content);
    rootEl.appendChild(help);
    rootEl.appendChild(S.live);
    S.rootEl = rootEl;
    host.appendChild(rootEl);
    paint();
    return {
      el: rootEl,
      update: function () { paint(); },
      destroy: function () { if (S.rootEl === rootEl) unmountBody(); else if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl); }
    };
  }
  function unmountBody() {
    closeMenu(false);
    if (S.rootEl && S.rootEl.parentNode) S.rootEl.parentNode.removeChild(S.rootEl);
    S.rootEl = S.content = S.live = S.titleEl = S.sticky = null;
    S.rowEls = {};
    S.drag = null;
    S.confirming = false;
  }

  /* ------------------------------------------------------------ frames */

  function overlayHost() { var d = doc(); return (d && isFn(d.getElementById) && d.getElementById('overlay-root')) || (d && d.body); }

  /** This file's own frame: the 360 px slide-over ('over') or the phone's full sheet ('full'). */
  function ownFrame(mode) {
    var titleId = uid('pl-title');
    var x = h('button', { type: 'button', class: 'ws-tool pl-frame__close', 'aria-label': T.close, title: T.closeTip }, [icon('close')]);
    var title = h('h2', { class: 'pl-frame__title', id: titleId, tabindex: '-1', text: labels().title });
    var body = h('div', { class: 'pl-frame__body' });
    var el = h('section', { class: 'pl-frame pl-frame--' + mode, role: 'dialog', 'aria-labelledby': titleId }, [
      h('header', { class: 'pl-frame__head' }, [title, x]), body
    ]);
    var sticky = mode === 'full' ? h('div', { class: 'pl-frame__sticky' }) : null;
    if (sticky) el.appendChild(sticky);
    on(x, 'click', function () { close('button'); });
    on(el, 'keydown', function (e) {
      if (e.key !== 'Escape' || S.menu || (S.drag && S.drag.kbd)) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      close('escape');
    });
    if (mode === 'over') {
      // below the bars, wherever the shell puts them (MCD.app.stageTop, item 43); CSS has a fallback
      var A = MCD().app, top = A && isFn(A.stageTop) ? safe(A.stageTop, A) : null;
      if (isNum(top) && top > 0 && el.style) el.style.top = Math.round(top + 12) + 'px';
    }
    var host = overlayHost();
    host.appendChild(el);
    mount(body, { mode: mode });
    S.titleEl = title;
    S.sticky = sticky;
    paint();
    if (!reduced()) el.classList.add('is-in');
    else el.classList.add('is-in', 'is-instant');
    if (isFn(title.focus)) title.focus();
    return { mode: mode, kind: 'own', el: el, destroy: function () { if (el.parentNode) el.parentNode.removeChild(el); } };
  }

  /** A card hosted by windows.js (SHELL) reports its own close through onClose; the generic pin and the app drawer
   *  can be replaced by another card, so for them a body that left the page means the card is gone. */
  function isOpen() {
    if (!S.frame || !S.rootEl) return false;
    if (S.frame.kind !== 'windows' && S.rootEl.isConnected === false) { S.frame = null; unmountBody(); unwatch(); return false; }
    return true;
  }

  function booted() { var A = MCD().app; return !!(A && isFn(A.isBooted) && A.isBooted()); }

  /** open({from}) → true when the card is on screen. R and the top-bar button call it (SHELL). */
  function open(o) {
    o = o || {};
    if (S.locked || !doc() || (!booted() && !o.force)) return false;
    guard();
    var p = placement(placeContext());
    if (p.refuse && !isOpen()) { toast(p.refuse); return false; }
    if (isOpen()) {
      if (S.frame.mode === p.mode || p.refuse) { if (S.titleEl && isFn(S.titleEl.focus)) S.titleEl.focus(); paint(); return true; }
      closeFrame('reopen');
    }
    var d = doc(), act = d.activeElement;
    S.returnFocus = act && act !== d.body ? act : null;
    var Wn = MCD().windows, A = MCD().app, frame = null;
    if ((p.mode === 'pin' || p.mode === 'sheet') && Wn && isFn(Wn.planCard)) {
      var host = h('div', { class: 'pl-host' });
      mount(host, { mode: p.mode });
      var hd = safe(Wn.planCard, Wn, [{ placement: p, title: labels().title, root: host, onClose: function (reason) { frameGone(reason || 'windows'); } }]);
      if (hd) frame = { mode: p.mode, kind: 'windows', handle: hd };
      else unmountBody();
    }
    if (!frame && p.mode === 'pin' && Wn && isFn(Wn.sheet)) {
      var host2 = h('div', { class: 'pl-host' });
      mount(host2, { mode: 'pin' });
      var title2 = labels().title;
      var hp = safe(Wn.sheet, Wn, [{ id: 'plan', kind: 'plan', title: title2,
        refresh: function () { return { kind: 'plan', title: labels().title, body: [host2], blocks: [] }; } }]);
      if (hp) frame = { mode: 'pin', kind: 'pin', handle: hp };
      else unmountBody();
    }
    if (!frame && p.mode === 'sheet' && A && isFn(A.openDrawer)) {
      var host3 = h('div', { class: 'pl-host' });
      mount(host3, { mode: 'sheet' });
      safe(A.openDrawer, A, [{ kind: 'plan', title: labels().title, body: [host3], blocks: [] }, { explicit: true }]);
      if (S.rootEl && S.rootEl.isConnected !== false) frame = { mode: 'sheet', kind: 'drawer' };
      else unmountBody();
    }
    if (!frame) frame = ownFrame(p.mode === 'full' ? 'full' : 'over');
    S.frame = frame;
    watch();
    syncOverlay();
    emit({ type: 'open', n: S.today.stops.length });
    return true;
  }

  function closeFrame(reason) {
    var f = S.frame;
    if (!f) { unmountBody(); return false; }
    S.frame = null;
    if (f.kind === 'own' && isFn(f.destroy)) f.destroy();
    else if (f.handle && isFn(f.handle.close)) safe(f.handle.close, f.handle, [reason]);
    else if (f.kind === 'drawer') { var A = MCD().app; if (A && isFn(A.closeDrawer) && S.rootEl && S.rootEl.isConnected !== false) safe(A.closeDrawer, A, [true]); }
    unmountBody();
    unwatch();
    var Mp = MCD().map;
    if (Mp && isFn(Mp.clearPlanOverlay)) safe(Mp.clearPlanOverlay, Mp);
    return true;
  }
  /** The frame went away by itself (windows.js closed the pin). */
  function frameGone(reason) {
    if (!S.frame) return;
    S.frame = null;
    unmountBody();
    unwatch();
    var Mp = MCD().map;
    if (Mp && isFn(Mp.clearPlanOverlay)) safe(Mp.clearPlanOverlay, Mp);
    emit({ type: 'close', n: S.today.stops.length, reason: reason });
  }
  /** close(reason): 'button' | 'escape' | 'section' | 'lock' | 'api'. A section switch keeps the tray chip (SHELL). */
  function close(reason) {
    var back = S.returnFocus;
    var was = closeFrame(reason || 'api');
    S.returnFocus = null;
    if (!was) return false;
    emit({ type: 'close', n: S.today.stops.length, reason: reason || 'api' });
    if ((reason === 'button' || reason === 'escape') && back && back.isConnected !== false && isFn(back.focus)) safe(back.focus, back);
    return true;
  }

  /** While open: veil changes repaint, a section switch closes the card (its chip stays, SHELL), a width change
   *  across the phone line repaints the link set. */
  function watch() {
    unwatch();
    var St = MCD().state;
    if (St && isFn(St.on)) {
      S.unsubState = St.on('change', function (ev) {
        var keys = (ev && ev.keys) || [];
        if (keys.indexOf('section') >= 0) { close('section'); return; }
        if (keys.indexOf('privacy.veil') >= 0 || keys.indexOf('privacy.reveal') >= 0) paint();
      });
    }
    if (isFn(root.addEventListener)) {
      var phone = isPhone();
      S.onResize = function () { if (isPhone() !== phone) { phone = isPhone(); if (S.frame && S.frame.kind === 'own') { close('resize'); open({ from: 'resize' }); } else paint(); } };
      root.addEventListener('resize', S.onResize);
    }
  }
  function unwatch() {
    if (isFn(S.unsubState)) S.unsubState();
    S.unsubState = null;
    if (S.onResize && isFn(root.removeEventListener)) root.removeEventListener('resize', S.onResize);
    S.onResize = null;
  }

  function onChange(fn) {
    if (!isFn(fn)) return noop;
    S.listeners.push(fn);
    return function () { var i = S.listeners.indexOf(fn); if (i >= 0) S.listeners.splice(i, 1); };
  }

  /* ------------------------------------------------------------ boot */

  // Register the sealed store before MCD.seal.init (seal.js loads first), so the plan opens with the other lists.
  store();
  ready();

  return {
    VERSION: 1,
    ready: ready, state: state,
    today: today, previous: previous, reuse: reuse,
    add: add, has: hasStop, remove: remove, move: move,
    set: set, clear: clearPlan, count: count,
    compute: compute, quick: quick,
    open: open, close: close, isOpen: isOpen, on: onChange,
    labels: labels, overlay: overlay, placement: placement, mount: mount,
    memoryLine: memoryLine,
    MAX_STOPS: MAX_STOPS, KINDS: KINDS.slice(), STORE: STORE_NAME, UI_KEY: UI_KEY, T: T,
    _pure: { arrivals: arrivals, hhmm: hhmm, parseHHMM: parseHHMM, dateLabel: dateLabel, round5: round5, freshStop: freshStop, ID_RE: ID_RE },
    /** Tests: a fake clock (ms since epoch) and the midnight check on demand. */
    _setClock: function (fn) { CLOCK = isFn(fn) ? fn : null; },
    _tick: tick
  };
});
