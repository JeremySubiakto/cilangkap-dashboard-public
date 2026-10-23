/* ==========================================================================
 * MCD.health: the Kesehatan engine (docs/HEALTH_SPEC.md §9.1; V7_SPEC D40; COPY_STYLE_EN item 52, H1–H25).
 *
 * Reads data/health-facilities.js (window.MCD_HEALTH_FACILITIES: rumah sakit, klinik kesehatan, klinik kecantikan
 * within 30 km of Mabes TNI) through MCD.app.lazy('health-facilities'), or one <script> injection of the same file
 * after sign-in while the shell has no such loader yet (never fetch, so file:// works). Every rule of the Kesehatan
 * screens lives here, without DOM at load, so Node tests run it on the real file:
 *
 *   data       load() / ensure() → Promise<boolean>, state() 'idle' | 'loading' | 'ready' | 'error', data(), meta(),
 *              index() {rows, byId, cov (kota code → Kemenkes klinik directory status), chains}, row(id), on(fn)
 *   view       FILTERS, defaults(), filterKey(f), rows({km, f}) (scope by in15 / distMabesKm only, H12), counts({km, f})
 *              (each chip counted without its own group), sort(rows, 'rsBesar' | 'near' | 'kelas' | 'nama', {dist})
 *              (Prioritas merchant first, H13), cluster(rows, zq, key) (clinics per kind on a 64 px grid, H6),
 *              stacks(rows) (identical points, H7), BUBBLE, bubbleDiameter / bubbleRadius / bubbleInk / bubbleBadge
 *              (n, zoom, coarse) (bubbles stay smaller than RS sedang, H6), bubbleOffset(a, b, zoom, coarse),
 *              hasLvm(), lvmToken() (the LVM state in every memo key), invalidate()
 *   sym        the map symbols (H1–H3, H5): shapes plus · circle · sparkle as unit polygons (PLUS_PTS, SPARKLE_PTS),
 *              path(ctx, shape, cx, cy, r) for map.js, COLOURS per theme, spec(row), px(spec, zoom, coarse), ink(shape),
 *              raster(shape, px, o) and inkPx(spec, zoom, coarse) (inked pixels, the "RS lebih besar" test), the colour
 *              checks (contrast, deltaE, cvd), atlas(theme) for a deck IconLayer (MCD.map.symbolSprite once it draws
 *              plus and sparkle, else an own canvas atlas), spriteUrl, chip(spec, theme, o), legend(theme, km, counts,
 *              zoom, flags)
 *   words      kind, sub, owner, size, beds, geo, sources, coverage, eyebrow … (plain Indonesian, COPY_DECK §10)
 *   plays      Peluang Mandiri per kind (public products only: no rate, cap, plafond or fee; H16)
 *   contact    institutional contacts through MCD_HEALTH_FACILITIES.telHref (D18) and .webLink (D17) only (H18)
 *   merchant   merchantLink(row): the facility's own public listing (data/sme-pois.js, strict point and name guard) and
 *              its status read through MCD.lvm only (H17); a guess is never counted
 *   plan       planStop(row): {id, kind: 'kesehatan', label, lon, lat, geoPrecision?} (H20)
 *   pipeline   MCD.seal.pipeline('health.pipeline', …) (encrypted, H19); a memory-only list without MCD.seal
 *   csv, search, door (the Ringkasan line, H11)
 *
 * Nothing here serves KSM, KKB, TNI loans or satker (D39). No network, no storage apart from the sealed pipeline.
 * Classic IIFE on window.MCD (UMD for Node), safe DOM only in sym.chip.
 * ========================================================================== */
(function (root, MCD) {
  'use strict';

  var H = MCD.health = MCD.health || {};
  var LAZY = 'health-facilities', SRC = 'data/health-facilities.js', GLOBAL = 'MCD_HEALTH_FACILITIES';
  var ID_RE = /^(rs:\d{7}|ks:[0-9a-f]{12}|dk:[0-9a-f]{12}(-[0-9a-f]{4})?|osm:[nw]\d{1,12}|ovt:[0-9a-f]{12})$/;
  var KINDS = [
    { id: 'rs', label: 'Rumah sakit', short: 'RS', shape: 'plus', legend: 'Rumah sakit: tanda tambah', tip: 'Rumah sakit (RS) terdaftar di SIRS Kemenkes dengan kode RS.' },
    { id: 'klinik', label: 'Klinik kesehatan', short: 'Klinik', shape: 'circle', legend: 'Klinik kesehatan: lingkaran', tip: 'Klinik pratama dan klinik utama terdaftar, termasuk klinik gigi, klinik mata dan laboratorium klinik.' },
    { id: 'kecantikan', label: 'Klinik kecantikan', short: 'Kecantikan', shape: 'sparkle', legend: 'Klinik kecantikan: bintang empat sudut', tip: 'Klinik kecantikan dan estetika, dikenali dari nama dan kategori peta.' }
  ];
  var KIND_IDS = ['rs', 'klinik', 'kecantikan'];
  var SIZE_RANK = { besar: 0, sedang: 1, kecil: 2 };
  var KELAS_RANK = { A: 0, B: 1, C: 2, D: 3 };
  var OWNER_WORD = { swasta: 'Swasta', bumn: 'BUMN', pemerintah: 'Pemerintah', tni: 'TNI', polri: 'Polri' };
  var GEO_PREC = { jalan: 'JALAN', kampung: 'KAMPUNG', kelurahan: 'KELURAHAN', kecamatan: 'KECAMATAN' };
  var GEO_SRC = { sirs: 'SIRS', siranap: 'SIRANAP', keslan: 'Direktori Klinik', osm: 'OpenStreetMap', overture: 'Overture Maps', alamat: 'alamat resmi', 'alamat-kota': 'alamat resmi dicari di seluruh kota' };
  var SRC_SHORT = { sirs: 'SIRS', siranap: 'SIRANAP', keslan: 'Direktori Klinik', 'sdj-klinik': 'Dinkes DKI', 'sdj-rs': 'Dinkes DKI', osm: 'OpenStreetMap', overture: 'Overture' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /* ------------------------------------------------------------ small helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function fmtInt(n) {
    var F = MCD.util && MCD.util.fmt;
    if (F && isFn(F.int)) return F.int(n);
    return isNum(n) ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—';
  }
  function fmtKm(km) { return isNum(km) ? (Math.round(km * 10) / 10).toFixed(1).replace('.', ',') + ' km' : '—'; }
  function dateWords(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : '';
  }
  function fold(s) {
    var t = String(s == null ? '' : s);
    if (isFn(t.normalize)) t = t.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return t.toLowerCase().replace(/[^a-z0-9+&]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function cap(t) { t = String(t || ''); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function admin() { var A = root.MCD_ADMIN_AREAS; return A && isFn(A.byId) ? A : null; }
  function todayIso() { var d = isFn(H._now) ? H._now() : new Date(); try { return d.toISOString().slice(0, 10); } catch (e) { return ''; } }
  function nowIso() { try { return (isFn(H._now) ? H._now() : new Date()).toISOString(); } catch (e) { return ''; } }
  var KX = 110.64, KY = 110.574;
  function metres(lon1, lat1, lon2, lat2) { var dx = (lon2 - lon1) * KX, dy = (lat2 - lat1) * KY; return Math.sqrt(dx * dx + dy * dy) * 1000; }
  var D2R = Math.PI / 180;
  function merc(lon, lat, w) { var sy = Math.sin(lat * D2R); return [(lon + 180) / 360 * w, (0.5 - Math.log((1 + sy) / (1 - sy)) / (4 * Math.PI)) * w]; }

  /* ------------------------------------------------------------ data and loading (H22) */

  function data() { var D = root[GLOBAL]; return D && Array.isArray(D.rows) && D.meta ? D : null; }
  var LOAD = null, FAILED = false, SUBS = [];
  function booted() { var A = MCD.app; try { return !A || !isFn(A.isBooted) || !!A.isBooted(); } catch (e) { return false; } }
  function inject(src) {
    return new Promise(function (resolve, reject) {
      var d = root.document;
      if (!d || !isFn(d.createElement) || !d.body) { reject(new Error('no document')); return; }
      var s = d.createElement('script');
      s.src = src; s.async = false;
      s.addEventListener('load', function () { resolve(); });
      s.addEventListener('error', function () { if (s.parentNode) s.parentNode.removeChild(s); reject(new Error('Could not load ' + src)); });
      d.body.appendChild(s);
    });
  }
  function emit(type, d) { SUBS.slice().forEach(function (fn) { try { fn(Object.assign({ type: type }, d || {})); } catch (e) { /* next */ } }); }
  /**
   * load() → Promise<boolean>: MCD.app.lazy('health-facilities') (V8 wires LAZY['health-facilities']); while the shell
   * has no such loader (an "unknown lazy" answer) the same file is injected once, only after sign-in. Never rejects.
   */
  function load() {
    if (data()) { FAILED = false; return Promise.resolve(true); }
    if (LOAD) return LOAD;
    var A = MCD.app, p;
    if (A && isFn(A.lazy)) {
      p = Promise.resolve().then(function () { return A.lazy(LAZY); }).then(function () { return !!data(); }, function (e) {
        if (/unknown lazy/i.test(String((e && e.message) || e || '')) && booted()) return inject(SRC).then(function () { return !!data(); });
        throw e;
      });
    } else if (booted()) p = inject(SRC).then(function () { return !!data(); });
    else p = Promise.reject(new Error('locked'));
    LOAD = p.then(function (ok) { FAILED = !ok; LOAD = null; emit('data', { ok: !!ok }); return !!ok; },
      function () { FAILED = true; LOAD = null; emit('data', { ok: false }); return false; });
    return LOAD;
  }
  H.ID_RE = ID_RE;
  H.KINDS = KINDS.map(function (k) { return Object.assign({}, k); });
  H.KIND_IDS = KIND_IDS.slice();
  H.load = load;
  H.ensure = load;
  H.state = function () { return data() ? 'ready' : LOAD ? 'loading' : FAILED ? 'error' : 'idle'; };
  H.on = function (fn) { if (isFn(fn)) SUBS.push(fn); return function () { SUBS = SUBS.filter(function (f) { return f !== fn; }); }; };
  H.data = data;
  H.meta = function () { var D = data(); return D ? D.meta : null; };
  H.keyOk = function (id) { return typeof id === 'string' && ID_RE.test(id); };

  var IX = null;
  /** index() → {D, rows, byId, cov: {<kota code>: {name, status}}, chains: [{name, kinds}]} or null before the file is in. */
  function index() {
    var D = data();
    if (!D) return null;
    if (IX && IX.D === D) return IX;
    var byId = new Map(), chains = {}, cov = {};
    D.rows.forEach(function (r) {
      if (!r || !r.id) return;
      byId.set(String(r.id), r);
      if (r.chain) (chains[r.chain] = chains[r.chain] || {})[r.kind] = 1;
    });
    var kb = D.meta.coverage && D.meta.coverage.keslanByKota;
    Object.keys(kb || {}).forEach(function (name) { var e = kb[name]; if (e && e.kota) cov[String(e.kota)] = { name: name, status: e.status || null }; });
    IX = { D: D, rows: D.rows, byId: byId, cov: cov, chains: Object.keys(chains).sort().map(function (n) { return { name: n, kinds: Object.keys(chains[n]) }; }) };
    MEMO = {};
    return IX;
  }
  H.index = index;
  H.ready = function () { return !!index(); };
  H.row = function (id) { var I = index(); return I && id != null ? I.byId.get(String(id)) || null : null; };
  /** The rows of the file (scope 30 km, no filter), for the screens that read the whole file. */
  H.all = function () { var I = index(); return I ? I.rows : []; };

  /* ------------------------------------------------------------ filters (H14) */

  var GROUPS = {
    show: KIND_IDS,
    kelas: ['A', 'B', 'C', 'D'],
    size: ['besar', 'sedang', 'kecil'],
    layanan: ['rsUmum', 'rsIa', 'rsKhusus', 'pratama', 'utama', 'gigi', 'mata', 'kia', 'lab'],
    owner: ['swasta', 'bumn', 'pemerintah', 'tni', 'polri'],
    lvm: ['acquired', 'not_yet', 'unlisted'],
    bpjs: ['ya', 'tidak', 'belum']
  };
  /* the chips of "Filter lain" in the order of the screen (§4.4); `kinds` = the kinds a chip applies to */
  H.FILTERS = {
    kelas: { label: 'Kelas RS', title: 'Kelas RS dari SIRS Kemenkes. Kelas A paling lengkap, kelas D paling dasar.',
      chips: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }, { id: 'C', label: 'C' }, { id: 'D', label: 'D' }], kinds: ['rs'] },
    size: { label: 'Ukuran RS', title: 'Besar: 200 tempat tidur atau lebih. Sedang: 100 sampai 199. Kecil: di bawah 100.',
      chips: [{ id: 'besar', label: 'Besar' }, { id: 'sedang', label: 'Sedang' }, { id: 'kecil', label: 'Kecil' }], kinds: ['rs'] },
    layanan: { label: 'Layanan', title: 'Jenis layanan dari register. Titik peta tanpa tingkat klinik tampil selama Klinik pratama dan Klinik utama menyala.',
      chips: [{ id: 'rsUmum', label: 'RS umum', kinds: ['rs'] }, { id: 'rsIa', label: 'RS ibu dan anak', kinds: ['rs'] }, { id: 'rsKhusus', label: 'RS khusus', kinds: ['rs'] },
        { id: 'pratama', label: 'Klinik pratama', kinds: ['klinik', 'kecantikan'] }, { id: 'utama', label: 'Klinik utama', kinds: ['klinik', 'kecantikan'] },
        { id: 'gigi', label: 'Klinik gigi', kinds: ['klinik'] }, { id: 'mata', label: 'Klinik mata', kinds: ['klinik'] },
        { id: 'kia', label: 'Klinik ibu dan anak', kinds: ['klinik'] }, { id: 'lab', label: 'Laboratorium', kinds: ['klinik'] }] },
    owner: { label: 'Kepemilikan', line: 'Fasilitas milik pemerintah, TNI dan Polri tampil tanpa prioritas merchant.',
      chips: [{ id: 'swasta', label: 'Swasta' }, { id: 'bumn', label: 'BUMN' }, { id: 'pemerintah', label: 'Pemerintah' }, { id: 'tni', label: 'TNI' }, { id: 'polri', label: 'Polri' }] },
    jaringan: { label: 'Jaringan', title: 'Cabang jaringan biasanya memutuskan bank di kantor pusat.',
      options: [{ v: 'semua', label: 'Semua' }, { v: 'tanpa', label: 'Tanpa jaringan' }, { v: 'jaringan', label: 'Jaringan' }] },
    lvm: { label: 'Status Livin’ Merchant', title: 'Fasilitas dengan prioritas merchant dalam 15 km, dari file Rev LVM yang diimpor.',
      chips: [{ id: 'acquired', label: 'Sudah diakuisisi' }, { id: 'not_yet', label: 'Belum ada di LVM' }, { id: 'unlisted', label: 'Tidak tercantum di peta publik' }] },
    bpjs: { label: 'Mitra BPJS', none: 'Status mitra BPJS belum tersedia. Situs BPJS Kesehatan tidak dapat dibuka saat data dikumpulkan.',
      chips: [{ id: 'ya', label: 'Mitra BPJS' }, { id: 'tidak', label: 'Bukan mitra' }, { id: 'belum', label: 'Belum diketahui' }] }
  };
  function allTrue(ids) { var o = {}; ids.forEach(function (k) { o[k] = true; }); return o; }
  /** defaults() → every chip on, jaringan 'semua', no chain. */
  function defaults() {
    var f = { jaringan: 'semua', chain: null };
    Object.keys(GROUPS).forEach(function (g) { f[g] = allTrue(GROUPS[g]); });
    return f;
  }
  function norm(f) {
    var d = defaults();
    if (!f || typeof f !== 'object') return d;
    Object.keys(GROUPS).forEach(function (g) { if (f[g] && typeof f[g] === 'object') GROUPS[g].forEach(function (k) { d[g][k] = f[g][k] !== false; }); });
    d.jaringan = f.jaringan === 'tanpa' || f.jaringan === 'jaringan' ? f.jaringan : 'semua';
    d.chain = typeof f.chain === 'string' && f.chain ? f.chain : null;
    if (!KIND_IDS.some(function (k) { return d.show[k]; })) d.show = allTrue(KIND_IDS);
    return d;
  }
  function allOn(o, g) { return GROUPS[g].every(function (k) { return !o || o[k] !== false; }); }
  function bpjsActive() { var b = H.meta() && H.meta().bpjs; return !!(b && typeof b === 'object'); }
  function lvmApi() { var L = MCD.lvm; return L && isFn(L.match) && isFn(L.poiStatus) ? L : null; }
  /* an LVM file is in (imported or Data contoh): the last match result when there is one, else the imported rows; the
     matcher itself runs only when a status is needed (it scores every public listing once) */
  function hasLvm() {
    var L = lvmApi(), R = null;
    if (!L) return false;
    try { R = isFn(L.result) ? L.result() : null; } catch (e) { R = null; }
    if (R) return !!R.hasLvm;
    var d = MCD.data;
    return !!(d && Array.isArray(d.lvm) && d.lvm.length);
  }
  /*
   * lvmToken() → the LVM state the cached rows and counts were made with, as a short key part: '' without an LVM file,
   * else 'L<n>' for the MCD.lvm.match() result the statuses come from (merchantLink reads the same object; MCD.lvm caches
   * it, so asking again is cheap). An import, a second import or Data contoh gives a new result object and so a new
   * token, even while every Status Livin' Merchant chip is at its default (the chip counts depend on it then too).
   */
  var LVT = { R: null, n: 0 };
  function lvmToken() {
    if (!hasLvm()) return '';
    var R = null;
    try { R = MCD.lvm.match(); } catch (e) { R = null; }
    if (!R) return 'L?';
    if (LVT.R !== R) LVT = { R: R, n: LVT.n + 1 };
    return 'L' + LVT.n;
  }
  /** filterKey(f) → a short stable key of the filters that are not at their default ('' = no filter). */
  function filterKey(f) {
    f = norm(f);
    var parts = [];
    Object.keys(GROUPS).forEach(function (g) {
      if (g === 'lvm' && !hasLvm()) return;
      if (g === 'bpjs' && !bpjsActive()) return;
      if (!allOn(f[g], g)) parts.push(g + ':' + GROUPS[g].filter(function (k) { return f[g][k]; }).join(','));
    });
    if (f.jaringan !== 'semua') parts.push('j:' + f.jaringan);
    if (f.chain) parts.push('c:' + f.chain);
    /* an LVM chip off: the rows depend on the LVM result (the counts always carry the token, see H.counts) */
    if (parts.some(function (p) { return /^lvm:/.test(p); })) parts.push('r:' + lvmToken());
    return parts.join('|');
  }
  H.hasLvm = hasLvm;
  H.lvmToken = lvmToken;
  H.defaults = defaults;
  H.normFilters = norm;
  H.filterKey = filterKey;
  H.GROUPS = GROUPS;

  function rsChip(r) { var s = String(r.sub || ''); return s === 'RS umum' ? 'rsUmum' : s === 'RS ibu dan anak' ? 'rsIa' : /^RS khusus/.test(s) ? 'rsKhusus' : null; }
  var SUB_CHIP = { 'klinik gigi': 'gigi', 'klinik mata': 'mata', 'klinik ibu dan anak': 'kia', lab: 'lab' };
  /**
   * Layanan (§4.4): RS by sub; clinics by their sub chip (gigi, mata, ibu dan anak, laboratorium) and by their tier chip
   * (pratama, utama). A map-only clinic without a tier falls under no tier chip: it stays while both tier chips are on.
   */
  function passLayanan(r, L) {
    if (allOn(L, 'layanan')) return true;
    if (r.kind === 'rs') { var c = rsChip(r); return !c || L[c] !== false; }
    var s = SUB_CHIP[r.sub];
    if (s && L[s] === false) return false;
    if (r.tier === 'pratama' || r.tier === 'utama') return L[r.tier] !== false;
    return L.pratama !== false && L.utama !== false;
  }
  function lvmChip(r) {
    if (!r.in15 || !r.play) return null;
    var m = merchantLink(r);
    return m.state === 'acquired' ? 'acquired' : m.state === 'not_yet' ? 'not_yet' : m.state === 'tanpa-peta' ? 'unlisted' : null;
  }
  function bpjsChip(r) { return r.bpjs === true ? 'ya' : r.bpjs === false ? 'tidak' : 'belum'; }
  /* 5 km (merge of the public prototype, 23 Oct 2026): inside the 15 km set and within 5 km of Mabes TNI (distMabesKm) */
  function inScope(r, km) {
    if (km === 5) return r.in15 === true && isNum(r.distMabesKm) && r.distMabesKm <= 5;
    return km === 15 ? r.in15 === true : isNum(r.distMabesKm) && r.distMabesKm <= 30;
  }
  /** The pass flags of one row for every group (each chip counts without its own group). */
  function passes(r, f, act) {
    return {
      show: f.show[r.kind] !== false,
      kelas: r.kind !== 'rs' || act.kelas === false || f.kelas[r.kelas] !== false && (r.kelas != null || act.kelas === false),
      size: r.kind !== 'rs' || act.size === false || f.size[r.size] !== false,
      layanan: passLayanan(r, f.layanan),
      owner: f.owner[r.owner] !== false,
      jaringan: (f.jaringan === 'semua' || (f.jaringan === 'tanpa' ? !r.chain : !!r.chain)) && (!f.chain || r.chain === f.chain),
      lvm: !act.lvm || (function () { var c = lvmChip(r); return !!c && f.lvm[c] !== false; })(),
      bpjs: !act.bpjs || f.bpjs[bpjsChip(r)] !== false
    };
  }
  var PASS_KEYS = ['show', 'kelas', 'size', 'layanan', 'owner', 'jaringan', 'lvm', 'bpjs'];
  function allBut(p, skip) { for (var i = 0; i < PASS_KEYS.length; i++) { var k = PASS_KEYS[i]; if (k !== skip && !p[k]) return false; } return true; }

  var MEMO = {};
  function memo(kind, key, fn) {
    var I = index();
    if (!I) return null;
    var k = kind + '#' + key;
    if (has(MEMO, k)) return MEMO[k];
    var keys = Object.keys(MEMO);
    if (keys.length > 40) keys.slice(0, 20).forEach(function (x) { delete MEMO[x]; });
    MEMO[k] = fn(I);
    return MEMO[k];
  }
  /**
   * invalidate() → drops every memo that bank data can change: rows, counts, the bubble grid and the merchant links. The
   * section calls it on the update keys 'data' and 'demo' (an LVM import, Data contoh); the keys carry the LVM token as
   * well (lvmToken), so this is the second guard, not the only one.
   */
  H.invalidate = function () { MEMO = {}; CL = new Map(); ML = { R: null, m: new Map() }; };
  /** 5 | 15 | 30; a call without km keeps 15 (the Ringkasan door and the older callers ask for 15 km). */
  function scopeKm(o) { var k = o ? +o.km : NaN; return k === 30 || k === 5 ? k : 15; }
  function activeOf(f) { return { kelas: !allOn(f.kelas, 'kelas'), size: !allOn(f.size, 'size'), lvm: hasLvm() && !allOn(f.lvm, 'lvm'), bpjs: bpjsActive() && !allOn(f.bpjs, 'bpjs') }; }
  /** rows({km: 5 | 15 | 30, f}) → the rows in scope (in15 / distMabesKm, never distKm: H12) that pass every filter. */
  H.rows = function (o) {
    var km = scopeKm(o), f = norm(o && o.f), key = km + '|' + filterKey(f);
    return memo('rows', key, function (I) {
      var act = activeOf(f), out = [];
      I.rows.forEach(function (r) { if (inScope(r, km) && allBut(passes(r, f, act), null)) out.push(r); });
      return out;
    }) || [];
  };
  function zeroes(ids) { var o = {}; ids.forEach(function (k) { o[k] = 0; }); return o; }
  /**
   * counts({km, f}) → {km, rs, klinik, kecantikan, total, play, noPlay, rendah, bySize, byKelas, byOwner, bySub,
   * byChain {name: {rs, klinik, kecantikan, n, nearKm}}, noChain, kec {<kecId>: {rs, klinik, kecantikan, total, play}},
   * chips {show, kelas, size, layanan, owner, jaringan, lvm, bpjs}} — each chip counted without its own group.
   */
  H.counts = function (o) {
    /* the LVM token always: the chips of Status Livin' Merchant are counted whenever an LVM file is in */
    var km = scopeKm(o), f = norm(o && o.f), key = km + '|' + filterKey(f) + '|' + lvmToken();
    return memo('counts', key, function (I) {
      var act = activeOf(f);
      var c = { km: km, rs: 0, klinik: 0, kecantikan: 0, total: 0, play: 0, noPlay: 0, rendah: 0,
        bySize: zeroes(GROUPS.size), byKelas: zeroes(GROUPS.kelas), byOwner: zeroes(GROUPS.owner), bySub: {}, byChain: {}, noChain: 0, kec: {},
        chips: { show: zeroes(GROUPS.show), kelas: zeroes(GROUPS.kelas), size: zeroes(GROUPS.size), layanan: zeroes(GROUPS.layanan), owner: zeroes(GROUPS.owner),
          jaringan: { semua: 0, tanpa: 0, jaringan: 0 }, lvm: zeroes(GROUPS.lvm), bpjs: zeroes(GROUPS.bpjs) } };
      var lvmOn = hasLvm();
      I.rows.forEach(function (r) {
        if (!inScope(r, km)) return;
        var p = passes(r, f, act), ch = c.chips;
        if (allBut(p, 'show')) ch.show[r.kind]++;
        if (r.kind === 'rs' && allBut(p, 'kelas') && has(ch.kelas, r.kelas)) ch.kelas[r.kelas]++;
        if (r.kind === 'rs' && allBut(p, 'size') && has(ch.size, r.size)) ch.size[r.size]++;
        if (allBut(p, 'layanan')) {
          if (r.kind === 'rs') { var rc = rsChip(r); if (rc) ch.layanan[rc]++; }
          else { var sc = SUB_CHIP[r.sub]; if (sc) ch.layanan[sc]++; if (r.tier === 'pratama' || r.tier === 'utama') ch.layanan[r.tier]++; }
        }
        if (allBut(p, 'owner') && has(ch.owner, r.owner)) ch.owner[r.owner]++;
        if (allBut(p, 'jaringan')) { ch.jaringan.semua++; ch.jaringan[r.chain ? 'jaringan' : 'tanpa']++; }
        if (lvmOn && allBut(p, 'lvm')) { var lc = lvmChip(r); if (lc) ch.lvm[lc]++; }
        if (allBut(p, 'bpjs')) ch.bpjs[bpjsChip(r)]++;
        if (!allBut(p, null)) return;
        c[r.kind]++; c.total++;
        if (r.play) c.play++; else c.noPlay++;
        if (r.conf === 'rendah') c.rendah++;
        if (r.kind === 'rs') { if (has(c.bySize, r.size)) c.bySize[r.size]++; if (has(c.byKelas, r.kelas)) c.byKelas[r.kelas]++; }
        if (has(c.byOwner, r.owner)) c.byOwner[r.owner]++;
        c.bySub[r.sub] = (c.bySub[r.sub] || 0) + 1;
        if (r.chain) {
          var b = c.byChain[r.chain] || (c.byChain[r.chain] = { name: r.chain, rs: 0, klinik: 0, kecantikan: 0, n: 0, nearKm: Infinity });
          b[r.kind]++; b.n++; if (isNum(r.distKm) && r.distKm < b.nearKm) b.nearKm = r.distKm;
        } else c.noChain++;
        if (r.kecId) {
          var k = c.kec[r.kecId] || (c.kec[r.kecId] = { id: r.kecId, rs: 0, klinik: 0, kecantikan: 0, total: 0, play: 0 });
          k[r.kind]++; k.total++; if (r.play) k.play++;
        }
      });
      return c;
    });
  };

  /* ------------------------------------------------------------ sorting (H13) */

  function bedsDesc(a, b) { var x = isNum(a.beds), y = isNum(b.beds); if (x !== y) return x ? -1 : 1; return x ? b.beds - a.beds : 0; }
  function sizeRank(r) { return r.kind === 'rs' ? (has(SIZE_RANK, r.size) ? SIZE_RANK[r.size] : 2) : 3; }
  function nameCmp(a, b) { var x = fold(a.name), y = fold(b.name); return x < y ? -1 : x > y ? 1 : 0; }
  /**
   * sort(rows, by, {dist: fn(row) → minutes | Infinity}) → a new array, every play row first (H13):
   *   'rsBesar' size class, then reported beds (rows without beds after them), then distance ·
   *   'near' minutes from KCP (o.dist), ties by distKm · 'kelas' A → D, then beds, then distance · 'nama' A–Z.
   */
  H.sort = function (rows, by, o) {
    o = o || {};
    var list = (rows || []).slice(), dist = isFn(o.dist) ? o.dist : function (r) { return isNum(r.distKm) ? r.distKm : Infinity; };
    var dv = new Map();
    function dOf(r) { if (!dv.has(r)) { var d = dist(r); dv.set(r, isNum(d) ? d : Infinity); } return dv.get(r); }
    function near(a, b) { var x = dOf(a), y = dOf(b); return (x === y ? 0 : x < y ? -1 : 1) || (a.distKm - b.distKm) || nameCmp(a, b); }
    var cmp = by === 'near' ? near
      : by === 'nama' ? function (a, b) { return nameCmp(a, b) || (a.distKm - b.distKm); }
      : by === 'kelas' ? function (a, b) {
        var ka = has(KELAS_RANK, a.kelas) ? KELAS_RANK[a.kelas] : 4, kb = has(KELAS_RANK, b.kelas) ? KELAS_RANK[b.kelas] : 4;
        return (a.kind === 'rs' ? 0 : 1) - (b.kind === 'rs' ? 0 : 1) || ka - kb || bedsDesc(a, b) || near(a, b);
      }
      : function (a, b) { return sizeRank(a) - sizeRank(b) || bedsDesc(a, b) || near(a, b); };
    return list.sort(function (a, b) { return (a.play ? 0 : 1) - (b.play ? 0 : 1) || cmp(a, b); });
  };
  H.SORTS = {
    rs: [{ v: 'rsBesar', label: 'RS terbesar', title: 'Urut menurut ukuran RS, lalu jumlah tempat tidur. Ukuran dari tempat tidur SIRANAP atau kelas RS.' },
      { v: 'near', label: 'Terdekat dari KCP' }, { v: 'kelas', label: 'Kelas RS' }],
    klinik: [{ v: 'near', label: 'Terdekat dari KCP' }, { v: 'nama', label: 'Nama A–Z' }]
  };
  /** The index of the first row without merchant priority (the divider "Tanpa prioritas merchant"), or -1. */
  H.dividerAt = function (sorted) { for (var i = 0; i < (sorted || []).length; i++) if (!sorted[i].play) return i; return -1; };

  /* ------------------------------------------------------------ grouping and stacks (H6, H7) */

  var CELL_PX = 64, CL = new Map();
  /**
   * cluster(rows, zq, key?) → {klinik: [cell], kecantikan: [cell]}; cell = {id, kind, n, lon, lat, ids}: clinics per kind
   * on a 64 px grid of the Web Mercator world (512 × 2^zq px), at the members' mean position. Hospitals are never grouped.
   * With a key the answer is memoised per (key, zq) (the section passes filters, scope and selection).
   */
  H.cluster = function (rows, zq, key) {
    zq = isNum(zq) ? Math.round(zq * 2) / 2 : 10;
    var mk = key != null ? String(key) + '#' + zq : null;
    if (mk && CL.has(mk)) return CL.get(mk);
    var w = 512 * Math.pow(2, zq), cells = { klinik: new Map(), kecantikan: new Map() };
    (rows || []).forEach(function (r) {
      var m = cells[r && r.kind];
      if (!m || !isNum(r.lon) || !isNum(r.lat)) return;
      var p = merc(r.lon, r.lat, w), k = Math.floor(p[0] / CELL_PX) + ':' + Math.floor(p[1] / CELL_PX), c = m.get(k);
      if (!c) { c = { id: r.kind + '|' + zq + '|' + k, kind: r.kind, n: 0, lon: 0, lat: 0, ids: [] }; m.set(k, c); }
      c.n++; c.lon += r.lon; c.lat += r.lat; c.ids.push(r.id);
    });
    var out = {};
    Object.keys(cells).forEach(function (kind) {
      out[kind] = [];
      cells[kind].forEach(function (c) { c.lon /= c.n; c.lat /= c.n; out[kind].push(c); });
      out[kind].sort(function (a, b) { return a.n - b.n; });
    });
    if (mk) { if (CL.size > 24) CL.clear(); CL.set(mk, out); }
    return out;
  };
  H.CELL_PX = CELL_PX;
  H.CLUSTER_BELOW = 13;
  /*
   * Bubble sizes (H6 as amended after the review of 23 Oct 2026: "rs lebih besar" holds against the bubbles too). The
   * diameter at zoom 13 is 14,5 px for a group of two, + 4,5 px per tenfold count, never above 21 px; it takes the
   * symbols' zoom factor and, on a coarse pointer, the hospitals' pointer factor. So at every zoom a bubble of two is
   * smaller than RS kecil (18 px at zoom 13; its whole disc inks less than the plus) and every bubble is smaller than
   * RS sedang (22 px): the largest marks on the map stay the hospitals. The merchant rule of sme.js (radius
   * 9 + 3,2 × log10(n + 1), not zoomed) drew a group of 38 at 28 px on the 15 km camera, wider than every RS there.
   * A 1,5 px ring and 11 px counts keep the bubble lighter than a hospital; the count may run past a small disc, so it
   * carries an outline in the glass colour.
   */
  var BUBBLE = { min: 14.5, perTen: 4.5, max: 21, ring: 1.5, text: 11, badgeMin: 6, badgeMax: 8 };
  H.BUBBLE = Object.assign({}, BUBBLE);
  /** bubbleDiameter(n, zoom, coarse) → px, rounded to 0,1 (zoom omitted: the zoom-13 size). */
  H.bubbleDiameter = function (n, zoom, coarse) {
    var k = isNum(n) && n > 2 ? n : 2, base = Math.min(BUBBLE.max, BUBBLE.min + BUBBLE.perTen * Math.log10(k / 2));
    return Math.round(base * zoomF(zoom) * (coarse ? COARSE_F.rs : 1) * 10) / 10;
  };
  /** bubbleRadius(n, zoom, coarse) → half the diameter (deck ScatterplotLayer radius in px). */
  H.bubbleRadius = function (n, zoom, coarse) { return H.bubbleDiameter(n, zoom, coarse) / 2; };
  /** bubbleInk(n, zoom, coarse) → the area of the whole disc in px², the glass counted as ink (the strict measure). */
  H.bubbleInk = function (n, zoom, coarse) { var r = H.bubbleRadius(n, zoom, coarse); return Math.round(Math.PI * r * r * 100) / 100; };
  /** bubbleBadge(n, zoom, coarse) → the px of the sparkle badge of a kecantikan bubble: half the bubble, 6 to 8 px. */
  H.bubbleBadge = function (n, zoom, coarse) { return Math.max(BUBBLE.badgeMin, Math.min(BUBBLE.badgeMax, Math.round(H.bubbleDiameter(n, zoom, coarse) * 5) / 10)); };
  /**
   * bubbleOffset(kl, kc, zoom, coarse) → px to move the klinik kecantikan bubble kc right so it clears the klinik bubble
   * kl of the same cell (2 px apart); 0 when they do not touch. Positions stay the members' mean (§2.3).
   */
  H.bubbleOffset = function (a, b, zoom, coarse) {
    if (!a || !b) return 0;
    var z = isNum(zoom) ? zoom : 10, w = 512 * Math.pow(2, z), pa = merc(a.lon, a.lat, w), pb = merc(b.lon, b.lat, w);
    var dx = pb[0] - pa[0], dy = pb[1] - pa[1], R = H.bubbleRadius(a.n, z, coarse) + H.bubbleRadius(b.n, z, coarse) + 2;
    if (dx * dx + dy * dy >= R * R || Math.abs(dy) >= R) return 0;
    return Math.max(0, Math.ceil(Math.sqrt(R * R - dy * dy) - dx));
  };
  function stackKey(r) { return r.lon.toFixed(5) + ',' + r.lat.toFixed(5); }
  H.stackKey = stackKey;
  /** stacks(rows) → Map<'lon,lat', [id]> for the points that carry 2 or more rows (lon, lat to 5 decimals). */
  H.stacks = function (rows) {
    var m = new Map(), out = new Map();
    (rows || []).forEach(function (r) { if (!r || !isNum(r.lon) || !isNum(r.lat)) return; var k = stackKey(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r.id); });
    m.forEach(function (ids, k) { if (ids.length > 1) out.set(k, ids); });
    return out;
  };
  /** The row a stack symbol draws: a hospital before a clinic, the larger size class first, then klinik, then kecantikan. */
  H.stackLead = function (rows) {
    return (rows || []).slice().sort(function (a, b) {
      return sizeRank(a) - sizeRank(b) || (a.kind === 'klinik' ? 0 : 1) - (b.kind === 'klinik' ? 0 : 1) || bedsDesc(a, b) || (a.play ? 0 : 1) - (b.play ? 0 : 1);
    })[0] || null;
  };

  /* ------------------------------------------------------------ symbols (H1–H3, H5) */

  var SYM = H.sym = H.sym || {};
  /* the shapes in a unit box [-1, 1]² (y down): a Greek cross (arm half-width 0,34, arm length 0,98) and a four-point
     sparkle (outer radius 1, inner radius 0,55, points up, right, down, left); the disc has radius 0,9 */
  var AW = 0.34, AL = 0.98;
  var PLUS_PTS = [[-AW, -AL], [AW, -AL], [AW, -AW], [AL, -AW], [AL, AW], [AW, AW], [AW, AL], [-AW, AL], [-AW, AW], [-AL, AW], [-AL, -AW], [-AW, -AW]];
  var SPARKLE_PTS = (function () {
    var out = [];
    for (var i = 0; i < 8; i++) { var a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 0.55 : 1; out.push([Math.round(Math.cos(a) * r * 1e4) / 1e4, Math.round(Math.sin(a) * r * 1e4) / 1e4]); }
    return out;
  })();
  var DISC_R = 0.9;
  var SHAPE_OF = { rs: 'plus', klinik: 'circle', kecantikan: 'sparkle' };
  var BASE_PX = { klinik: 10, kecantikan: 13, rs: { kecil: 18, sedang: 22, besar: 28 } };
  var ZOOM_F = [[9, 0.70], [11, 0.85], [13, 1], [15, 1.2], [17, 1.4]];
  var COARSE_F = { rs: 1.1, clinic: 1.2 };
  /* the one place with raw colours (H2): rumah sakit in the map's ink, klinik green in Terang (#148000) and teal in Gelap,
     klinik kecantikan violet; a keyline that separates the symbol from the base map and a faint outer edge, as
     campus-core.js. No red cross anywhere. The Terang teal #008080 of the first build sat ΔE 10 from the Terang
     selection colour #00727F (map halo, the section's selection ring, focus and pressed chips): replaced after review. */
  var COLOURS = {
    day: { rs: [17, 24, 39], klinik: [20, 128, 0], kecantikan: [106, 27, 154], keyline: [255, 255, 255], edge: [24, 34, 52], edgeA: 0.42,
      bubble: [255, 255, 255, 236], count: [14, 30, 54] },
    night: { rs: [241, 245, 249], klinik: [32, 160, 150], kecantikan: [179, 136, 255], keyline: [9, 14, 26], edge: [9, 14, 26], edgeA: 0.9,
      bubble: [17, 24, 37, 226], count: [237, 239, 243] }
  };
  /* what a kind's colour must stay clear of (K5): the route blue, the selection colour (halo: the map's `signal`, Terang
     #00727F and Gelap #38D6E8, also the section's selection ring, focus and pressed chips), gold, the status and matra
     colours */
  SYM.REFERENCE = {
    day: { route: [26, 95, 209], halo: [0, 114, 127], gold: [122, 86, 0], ok: [18, 118, 74], mid: [184, 115, 0], bad: [194, 57, 46], none: [93, 104, 121], potential: [31, 95, 209],
      AL: [27, 54, 99], AD: [146, 124, 92], AU: [58, 128, 181], GAB: [122, 92, 18] },
    night: { route: [26, 95, 209], halo: [56, 214, 232], gold: [242, 183, 5], ok: [47, 184, 121], mid: [240, 169, 46], bad: [238, 90, 79], none: [111, 123, 144], potential: [76, 141, 246],
      AL: [62, 100, 166], AD: [124, 108, 84], AU: [120, 186, 228], GAB: [176, 138, 52] }
  };
  function themeOf(t) { return t === 'day' ? 'day' : 'night'; }
  SYM.PLUS_PTS = PLUS_PTS.map(function (p) { return p.slice(); });
  SYM.SPARKLE_PTS = SPARKLE_PTS.map(function (p) { return p.slice(); });
  SYM.DISC_R = DISC_R;
  SYM.SHAPES = Object.assign({}, SHAPE_OF);
  SYM.BASE_PX = JSON.parse(JSON.stringify(BASE_PX));
  SYM.ZOOM_F = ZOOM_F.map(function (z) { return z.slice(); });
  SYM.COARSE_F = Object.assign({}, COARSE_F);
  SYM.FAINT_ALPHA = 0.55;
  SYM.FOCUS_ALPHA = 0.15;
  SYM.colours = function (theme) { var c = COLOURS[themeOf(theme)], out = {}; Object.keys(c).forEach(function (k) { out[k] = Array.isArray(c[k]) ? c[k].slice() : c[k]; }); return out; };
  SYM.rgb = function (kind, theme) { var c = COLOURS[themeOf(theme)]; return (c[kind] || c.klinik).slice(); };
  /** spec(row) → {kind, shape, hollow (play false, H5), faint (conf 'rendah'), step (RS size class), key}. */
  SYM.spec = function (r) {
    var kind = r && SHAPE_OF[r.kind] ? r.kind : 'klinik', hollow = !!(r && r.play === false);
    var step = kind === 'rs' ? (r && has(SIZE_RANK, r.size) ? r.size : 'kecil') : null;
    return { kind: kind, shape: SHAPE_OF[kind], hollow: hollow, faint: !!(r && r.conf === 'rendah'), step: step, key: kind + (hollow ? '-h' : '') };
  };
  function zoomF(z) {
    if (!isNum(z)) return 1;
    if (z <= ZOOM_F[0][0]) return ZOOM_F[0][1];
    for (var i = 1; i < ZOOM_F.length; i++) { var a = ZOOM_F[i - 1], b = ZOOM_F[i]; if (z <= b[0]) return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); }
    return ZOOM_F[ZOOM_F.length - 1][1];
  }
  SYM.zoomF = zoomF;
  /**
   * px(spec, zoom, coarse) → the icon box in CSS px: base × zoom factor × pointer factor (0,1 px), one zoom factor for
   * every kind (H3). A single clinic below zoom 13 (a cell of one) is drawn at px(spec, zoom) too, never at its zoom-13
   * size: at zoom 9 a 10 px disc beside a 12,6 px RS kecil would break "rs lebih besar" (ink 1,4× instead of ≥ 2×).
   */
  SYM.px = function (spec, zoom, coarse) {
    spec = spec || {};
    var rs = spec.kind === 'rs' || spec.shape === 'plus';
    var base = rs ? BASE_PX.rs[spec.step] || BASE_PX.rs.kecil : spec.kind === 'kecantikan' || spec.shape === 'sparkle' ? BASE_PX.kecantikan : BASE_PX.klinik;
    return Math.round(base * zoomF(zoom) * (coarse ? (rs ? COARSE_F.rs : COARSE_F.clinic) : 1) * 10) / 10;
  };
  function polyArea(pts) { var s = 0; for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  /** ink(shape) → the inked area of the shape in its unit box (the box is 2 × 2): disc 2,54 · sparkle 1,56 · plus 2,20. */
  SYM.ink = function (shape) { return shape === 'circle' ? Math.PI * DISC_R * DISC_R : polyArea(shape === 'plus' ? PLUS_PTS : SPARKLE_PTS); };
  function inPoly(x, y, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function segDist(x, y, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1);
    t = Math.max(0, Math.min(1, t));
    var px = a[0] + t * dx - x, py = a[1] + t * dy - y;
    return Math.sqrt(px * px + py * py);
  }
  function edgeDist(x, y, pts) { var m = Infinity; for (var i = 0; i < pts.length; i++) m = Math.min(m, segDist(x, y, pts[i], pts[(i + 1) % pts.length])); return m; }
  /* the keyline (the symbolSprite rule: 1,5 px from 14 px, 1,2 px below) and the band of a hollow symbol: a band of the
     fill colour along the edge with the keyline colour inside. An outline band between two keylines (the Kampus look)
     leaves nothing inside the 6 px arms of an 18 px plus, so a hollow RS would read as a filled one. */
  SYM.keylinePx = function (px) { return px >= 14 ? 1.5 : 1.2; };
  SYM.bandPx = function (px) { return Math.max(1.5, px * 0.09); };
  /**
   * raster(shape, px, {hollow, scale}) → {size, mask, cls, ink, fill}: the symbol in a px × px box, 4 × 4 samples per
   * pixel. mask: 1 where at least half the pixel is covered (the silhouette). cls: 0 empty, 1 keyline colour, 2 fill
   * colour (filled: keyline along the edge, fill inside; hollow: fill along the edge, keyline colour inside). ink: the
   * covered area in px² (anti-aliased, what the eye weighs); fill: pixels of the fill colour. scale: the shape grown or
   * shrunk in its box (the equal-area silhouette test). Pure: no canvas.
   */
  SYM.raster = function (shape, px, o) {
    o = o || {};
    var size = Math.max(1, Math.ceil(px)), half = px / 2, sc = isNum(o.scale) ? o.scale : 1, n = size * size;
    var mask = new Uint8Array(n), cls = new Uint8Array(n), ink = 0, fill = 0;
    var pts = shape === 'plus' ? PLUS_PTS : shape === 'sparkle' ? SPARKLE_PTS : null;
    var edge = o.hollow ? SYM.bandPx(px) : SYM.keylinePx(px), off = (size - px) / 2, unit = half * sc;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var hit = 0, near = 0;
        for (var sy = 0; sy < 4; sy++) {
          for (var sx = 0; sx < 4; sx++) {
            var ux = ((x + (sx + 0.5) / 4 - off) - half) / unit, uy = ((y + (sy + 0.5) / 4 - off) - half) / unit, inside, d;
            if (pts) { inside = inPoly(ux, uy, pts); d = inside ? edgeDist(ux, uy, pts) * unit : 0; }
            else { var rr = Math.sqrt(ux * ux + uy * uy); inside = rr <= DISC_R; d = (DISC_R - rr) * unit; }
            if (inside) { hit++; if (d <= edge) near++; }
          }
        }
        ink += hit / 16;
        if (hit >= 8) {
          var k = y * size + x, isEdge = near * 2 >= hit;
          mask[k] = 1;
          cls[k] = o.hollow ? (isEdge ? 2 : 1) : (isEdge ? 1 : 2);
          if (cls[k] === 2) fill++;
        }
      }
    }
    return { size: size, mask: mask, cls: cls, ink: Math.round(ink * 100) / 100, fill: fill };
  };
  /** inkPx(spec, zoom, coarse) → the inked area (px²) of the symbol as drawn at that zoom and pointer. */
  SYM.inkPx = function (spec, zoom, coarse) { return SYM.raster(spec.shape, SYM.px(spec, zoom, coarse), { hollow: spec.hollow }).ink; };
  /** differ(shape, px) → the share of inked pixels whose colour differs between the filled and the hollow symbol (K4). */
  SYM.differ = function (shape, px) {
    var a = SYM.raster(shape, px), b = SYM.raster(shape, px, { hollow: true }), d = 0, n = 0;
    for (var k = 0; k < a.cls.length; k++) { if (a.cls[k] || b.cls[k]) { n++; if (a.cls[k] !== b.cls[k]) d++; } }
    return n ? d / n : 0;
  };
  /** iou(shapeA, shapeB, px) → the overlap of the two silhouettes scaled to the same ink area (the disc's), in a px box. */
  SYM.iou = function (a, b, px) {
    px = px || 64;
    var target = Math.min(SYM.ink(a), SYM.ink(b)), ma = SYM.raster(a, px, { scale: Math.sqrt(target / SYM.ink(a)) }), mb = SYM.raster(b, px, { scale: Math.sqrt(target / SYM.ink(b)) });
    var i = 0, u = 0;
    for (var k = 0; k < ma.mask.length; k++) { if (ma.mask[k] && mb.mask[k]) i++; if (ma.mask[k] || mb.mask[k]) u++; }
    return u ? i / u : 0;
  };
  /* colour checks (H2, K5): WCAG contrast, CIELAB ΔE (1976) and the Machado et al. (2009) colour-vision simulation at
     full severity, on linear RGB */
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function unlin(v) { v = Math.max(0, Math.min(1, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  SYM.contrast = function (a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function lab(c) {
    var r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    var X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  SYM.deltaE = function (a, b) { var p = lab(a), q = lab(b); return Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2) + Math.pow(p[2] - q[2], 2)); };
  var CVD = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };
  SYM.CVD_TYPES = ['normal', 'protan', 'deutan', 'tritan'];
  SYM.cvd = function (c, type) {
    var M = CVD[type];
    if (!M) return c.slice(0, 3);
    var v = [lin(c[0]), lin(c[1]), lin(c[2])];
    return M.map(function (row) { return Math.round(unlin(row[0] * v[0] + row[1] * v[1] + row[2] * v[2])); });
  };

  /* drawing (for map.js and the own atlas): the path of a shape in a box of radius r around (cx, cy) */
  function path(ctx, shape, cx, cy, r) {
    ctx.beginPath();
    if (shape === 'circle') { ctx.arc(cx, cy, r * DISC_R, 0, Math.PI * 2); ctx.closePath(); return; }
    var pts = shape === 'plus' ? PLUS_PTS : SPARKLE_PTS;
    for (var i = 0; i < pts.length; i++) { var x = cx + pts[i][0] * r, y = cy + pts[i][1] * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath();
  }
  SYM.path = path;
  function css(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }
  var CELL = 64;
  /**
   * One sprite in a CELL × CELL box at (ox, oy): a faint outer edge, then filled = keyline along the edge and the fill
   * inside; hollow = a band of the fill colour along the edge and the keyline colour inside (same outline, so a hollow
   * hospital is exactly as large as a filled one).
   */
  function drawSprite(ctx, ox, oy, spec, theme) {
    var c = COLOURS[themeOf(theme)], cx = ox + CELL / 2, cy = oy + CELL / 2, R = CELL / 2 - 3, fill = c[spec.kind];
    ctx.lineJoin = 'round';
    path(ctx, spec.shape, cx, cy, R);
    ctx.lineWidth = 4; ctx.strokeStyle = css(c.edge, c.edgeA); ctx.stroke();
    ctx.fillStyle = css(spec.hollow ? c.keyline : fill); ctx.fill();
    if (isFn(ctx.save) && isFn(ctx.clip)) {
      ctx.save(); ctx.clip();
      ctx.lineWidth = spec.hollow ? 12 : 10; ctx.strokeStyle = css(spec.hollow ? fill : c.keyline); ctx.stroke();
      ctx.restore();
    }
  }
  SYM.drawSprite = drawSprite;
  SYM.CELL = CELL;
  SYM.KEYS = ['rs', 'rs-h', 'klinik', 'klinik-h', 'kecantikan', 'kecantikan-h'];
  function specOfKey(k) { var p = String(k).split('-'), kind = SHAPE_OF[p[0]] ? p[0] : 'klinik'; return { kind: kind, shape: SHAPE_OF[kind], hollow: p[1] === 'h', step: kind === 'rs' ? 'kecil' : null, key: k }; }
  function newCanvas(w, h) {
    var d = root.document;
    if (!d || !isFn(d.createElement)) return null;
    var cv = d.createElement('canvas');
    if (!cv || !isFn(cv.getContext)) return null;
    cv.width = w; cv.height = h;
    return cv;
  }
  function isCanvas(x) { return !!x && isFn(x.getContext) && x.width > 0 && x.height > 0; }
  /*
   * The map's shared sprite maker once it draws these shapes (V8, HEALTH_SPEC §14.1 item 4): detected by asking for a
   * plus and a sparkle and checking that the sprite ids name them (today's symbolSprite draws a circle for any other
   * shape). Hollow sprites only when the map tells them apart from the filled ones.
   */
  var MAPSYM = { M: null, ok: false, hollow: false };
  function mapSprites() {
    var M = MCD.map;
    if (!M || !isFn(M.symbolSprite)) return false;
    if (MAPSYM.M === M) return MAPSYM.ok;
    MAPSYM.M = M; MAPSYM.ok = false; MAPSYM.hollow = false;
    try {
      var a = M.symbolSprite({ shape: 'plus', fill: [1, 2, 3], px: 16 }), s = M.symbolSprite({ shape: 'sparkle', fill: [1, 2, 3], px: 16 }), b = M.symbolSprite({ shape: 'plus', fill: [1, 2, 3], hollow: true, px: 16 });
      MAPSYM.ok = !!(a && isCanvas(a.canvas) && /plus/.test(String(a.id)) && s && /sparkle/.test(String(s.id)));
      MAPSYM.hollow = MAPSYM.ok && !!(b && isCanvas(b.canvas) && b.id !== a.id);
    } catch (e) { MAPSYM.ok = false; }
    return MAPSYM.ok;
  }
  SYM.mapSprites = function () { return mapSprites(); };
  var ATL = {};
  /** atlas(theme) → {iconAtlas, iconMapping, key} for a deck.gl IconLayer (mask off: real colours), or null without a canvas. */
  SYM.atlas = function (theme) {
    theme = themeOf(theme);
    var viaMap = mapSprites() && MAPSYM.hollow, key = theme + (viaMap ? ':map' : ':own');
    if (ATL[key]) return ATL[key];
    var mapping = {}, cv = null, c = COLOURS[theme];
    if (viaMap && isFn(MCD.map.spriteAtlas)) {
      try {
        var list = SYM.KEYS.map(function (k) { var s = specOfKey(k); return MCD.map.symbolSprite({ shape: s.shape, fill: c[s.kind].slice(), ring: c.keyline.slice(), hollow: s.hollow, px: 36 }); });
        var src = list.every(function (s) { return s && isCanvas(s.canvas); }) ? MCD.map.spriteAtlas(list) : null;
        if (src && src.iconAtlas) { cv = src.iconAtlas; SYM.KEYS.forEach(function (k, n) { var m = src.iconMapping[list[n].id]; if (m) mapping[k] = Object.assign({}, m, { mask: false }); }); }
      } catch (e) { cv = null; }
    }
    if (!cv || Object.keys(mapping).length !== SYM.KEYS.length) {
      mapping = {};
      cv = newCanvas(SYM.KEYS.length * CELL, CELL);
      var ctx = cv && cv.getContext('2d');
      if (!ctx) return null;
      SYM.KEYS.forEach(function (k, n) {
        drawSprite(ctx, n * CELL, 0, specOfKey(k), theme);
        mapping[k] = { x: n * CELL, y: 0, width: CELL, height: CELL, anchorX: CELL / 2, anchorY: CELL / 2, mask: false };
      });
      key = theme + ':own';
    }
    ATL[key] = { iconAtlas: cv, iconMapping: mapping, key: key };
    return ATL[key];
  };
  /* the same shapes as small vector paths (16 × 16) for chips beside names and the legend: no canvas, no PNG */
  function pathD(shape, cx, cy, r) {
    if (shape === 'circle') { var rr = r * DISC_R; return 'M' + (cx - rr) + ' ' + cy + 'a' + rr + ' ' + rr + ' 0 1 0 ' + (2 * rr) + ' 0a' + rr + ' ' + rr + ' 0 1 0 ' + (-2 * rr) + ' 0z'; }
    var pts = shape === 'plus' ? PLUS_PTS : SPARKLE_PTS;
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + (Math.round((cx + p[0] * r) * 100) / 100) + ' ' + (Math.round((cy + p[1] * r) * 100) / 100); }).join('') + 'Z';
  }
  SYM.pathD = pathD;
  SYM.CHIP_PATH = { plus: pathD('plus', 8, 8, 7.2), circle: pathD('circle', 8, 8, 7.4), sparkle: pathD('sparkle', 8, 8, 7.6) };
  function rgbHex(c) { return '#' + c.slice(0, 3).map(function (v) { var h = Math.max(0, Math.min(255, Math.round(v))).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }
  var SPR = {};
  /** spriteUrl(spec, theme) → an SVG data URL of one symbol (the legend before the map draws plus and sparkle). */
  SYM.spriteUrl = function (spec, theme) {
    if (!spec) return null;
    theme = themeOf(theme);
    var k = theme + '|' + spec.shape + '|' + spec.kind + '|' + (spec.hollow ? 1 : 0) + '|' + (spec.faint ? 1 : 0);
    if (has(SPR, k)) return SPR[k];
    var c = COLOURS[theme], fill = rgbHex(c[spec.kind] || c.klinik), key = rgbHex(c.keyline), d = SYM.CHIP_PATH[spec.shape] || SYM.CHIP_PATH.circle;
    var body = spec.hollow
      ? '<path d="' + d + '" fill="' + key + '" stroke="' + fill + '" stroke-width="2" stroke-linejoin="round"/>'
      : '<path d="' + d + '" fill="' + fill + '" stroke="' + key + '" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32"' + (spec.faint ? ' opacity="0.55"' : '') + '>' + body + '</svg>';
    SPR[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return SPR[k];
  };
  /** chip(spec, theme, {title, cls}) → <span class="hf-sym"> with the symbol as inline SVG; colours from section-health.css. */
  SYM.chip = function (spec, theme, o) {
    var d = root.document;
    if (!d || !spec) return null;
    o = o || {};
    var wrap = d.createElement('span');
    wrap.className = 'hf-sym hf-sym--' + spec.shape + ' is-' + spec.kind + (spec.hollow ? ' is-hollow' : '') + (spec.faint ? ' is-faint' : '') + (o.cls ? ' ' + o.cls : '');
    wrap.setAttribute('aria-hidden', 'true');
    if (o.title) wrap.title = o.title;
    if (isFn(d.createElementNS)) {
      var NS = 'http://www.w3.org/2000/svg', svg = d.createElementNS(NS, 'svg'), p = d.createElementNS(NS, 'path');
      svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.setAttribute('focusable', 'false');
      p.setAttribute('d', SYM.CHIP_PATH[spec.shape] || SYM.CHIP_PATH.circle);
      p.setAttribute('class', 'hf-sym__p');
      svg.appendChild(p);
      wrap.appendChild(svg);
    } else wrap.appendChild(d.createElement('i'));
    return wrap;
  };
  SYM.words = function (r) { return r ? kindWord(r) + (r.play === false ? ', tanpa prioritas merchant' : '') : ''; };
  /**
   * legend(theme, km, counts, zoom, flags) → the group "Kesehatan dalam {km} km" (§2.5): at most seven rows; rows 5–7
   * only when they apply. flags {show: {rs, klinik, kecantikan}, hollow, faint}. The rows are {shape, rgb, hollow} rows
   * of map.js once the map draws plus and sparkle (legend and map from one sprite maker); before that each row carries
   * the same picture as an SVG (img, imgKey).
   */
  SYM.legend = function (theme, km, counts, zoom, flags) {
    theme = themeOf(theme);
    var c = COLOURS[theme], n = counts || {}, fl = flags || {}, show = fl.show || {}, viaMap = mapSprites(), rows = [];
    function row(spec, label, count, extra) {
      var r = Object.assign({ shape: spec.shape, rgb: c[spec.kind].slice(), hollow: !!spec.hollow, label: label }, extra || {});
      if (count !== undefined) r.count = isNum(count) ? count : null;
      if (spec.faint) r.alpha = SYM.FAINT_ALPHA;
      if (!viaMap || (spec.hollow && !MAPSYM.hollow)) { r.img = SYM.spriteUrl(spec, theme); r.imgKey = 'hf|' + theme + '|' + spec.key + (spec.faint ? '-f' : ''); r.glyph = null; }
      return r;
    }
    if (show.rs !== false) rows.push(row({ kind: 'rs', shape: 'plus', key: 'rs' }, KINDS[0].legend, n.rs));
    if (show.klinik !== false) rows.push(row({ kind: 'klinik', shape: 'circle', key: 'klinik' }, KINDS[1].legend, n.klinik));
    if (show.kecantikan !== false) rows.push(row({ kind: 'kecantikan', shape: 'sparkle', key: 'kecantikan' }, KINDS[2].legend, n.kecantikan));
    if (show.rs !== false) rows.push({ glyph: 'none', label: 'Rumah sakit lebih besar dari klinik. Ukurannya menurut tempat tidur: di bawah 100, 100 sampai 199, 200 atau lebih.' });
    if (fl.hollow) rows.push(row({ kind: show.rs !== false ? 'rs' : (show.klinik !== false ? 'klinik' : 'kecantikan'), shape: show.rs !== false ? 'plus' : (show.klinik !== false ? 'circle' : 'sparkle'), hollow: true, key: 'hollow' }, 'Simbol kosong: milik pemerintah, TNI atau Polri, tanpa prioritas merchant'));
    if (isNum(zoom) && zoom < H.CLUSTER_BELOW && (show.klinik !== false || show.kecantikan !== false)) rows.push({ glyph: 'ring', rgb: c.count.slice(), label: 'Lingkaran berangka: kelompok klinik saat peta diperkecil. Dengan bintang kecil: klinik kecantikan.' });
    if (fl.faint) rows.push(row({ kind: 'klinik', shape: 'circle', faint: true, key: 'faint' }, 'Simbol pudar: titik perkiraan dari alamat'));
    return { id: 'health-sym', title: 'Kesehatan dalam ' + (km === 30 || km === 5 ? km : 15) + ' km', rows: rows };
  };

  /* ------------------------------------------------------------ words (COPY_DECK §10; H25) */

  function kindWord(r) { var k = KINDS.filter(function (x) { return x.id === (r && r.kind); })[0]; return k ? k.label : ''; }
  var SUB_WORD = { lab: 'Laboratorium', klinik: 'Klinik' };
  function subWord(r) { if (!r) return ''; var s = String(r.sub || ''); return has(SUB_WORD, s) ? SUB_WORD[s] : cap(s); }
  function kotaWord(kecId) {
    var A = admin(), k = kecId && A ? A.byId(kecId) : null, kota = k && A ? A.byId(k.kota) : null;
    if (!kota) return '';
    var short = kota.short || String(kota.name || '').replace(/^(Kota Administrasi|Kota|Kabupaten)\s+/, '');
    return kota.kind === 'kabupaten' ? 'Kab. ' + short : kota.kind === 'kota' ? 'Kota ' + short : short;
  }
  function kecName(id) { var A = admin(), r = id && A ? A.byId(id) : null; return r ? r.name : (id || ''); }
  function kelName(id) { var A = admin(), r = id && A ? A.byId(id) : null; return r ? r.name : null; }
  function covOf(r) {
    var I = index();
    if (!I || !r || r.kind === 'rs' || !r.kecId) return null;
    var kota = String(r.kecId).split('.').slice(0, 2).join('.');
    return I.cov[kota] || null;
  }
  function srcFetched(id) { var D = data(), s = D && (D.meta.sources || []).filter(function (x) { return x.id === id; })[0]; return s ? s.fetched : null; }
  var W = H.words = {
    kind: kindWord,
    sub: subWord,
    kotaWord: kotaWord,
    kecName: kecName,
    kelName: kelName,
    ownerShort: function (r) { return r ? OWNER_WORD[r.owner] || cap(r.owner) : ''; },
    owner: function (r) { return r ? 'Milik ' + (r.owner === 'bumn' ? 'BUMN' : r.owner === 'tni' ? 'TNI' : r.owner === 'polri' ? 'Polri' : String(r.owner || 'swasta')) : ''; },
    ownerNote: function (r) { return r && r.ownerSrc === 'nama' ? 'Pemilik dibaca dari nama fasilitas, sehingga dapat keliru.' : null; },
    tier: function (r) { return r && r.tier === 'pratama' ? 'Pratama' : r && r.tier === 'utama' ? 'Utama' : '—'; },
    size: function (r) { return r && r.kind === 'rs' ? cap(r.size || 'kecil') : ''; },
    /** {value, label, title, line}: the bed number of a hospital (§1.2: not reported, incomplete report). */
    beds: function (r) {
      if (!r || r.kind !== 'rs') return null;
      var when = dateWords(srcFetched('siranap')) || '22 Okt 2026';
      if (!isNum(r.beds)) return { value: '—', label: 'Tempat tidur', title: 'RS ini tidak melaporkan tempat tidur ke SIRANAP. Ukuran dari kelas RS.', line: 'RS ini tidak melaporkan tempat tidur ke SIRANAP. Ukuran dari kelas RS.', short: null };
      if (r.sizeBasis === 'kelas') return { value: fmtInt(r.beds), label: 'TT dilaporkan', title: 'Tempat tidur yang dilaporkan ke SIRANAP. Laporan belum lengkap, sehingga ukuran dari kelas RS.', line: fmtInt(r.beds) + ' tempat tidur dilaporkan ke SIRANAP pada ' + when + '. Laporan belum lengkap, sehingga ukuran dari kelas RS.', short: fmtInt(r.beds) + ' TT dilaporkan' };
      return { value: fmtInt(r.beds), label: 'Tempat tidur', title: 'Tempat tidur yang dilaporkan ke SIRANAP pada ' + when + '.', line: fmtInt(r.beds) + ' tempat tidur, dilaporkan ke SIRANAP pada ' + when + '.', short: fmtInt(r.beds) + ' TT' };
    },
    sizeLine: function (r) {
      if (!r || r.kind !== 'rs') return null;
      var s = String(r.size || 'kecil');
      if (r.sizeBasis === 'tempat tidur') return 'Ukuran ' + s + ' menurut tempat tidur.';
      if (r.sizeBasis === 'kelas') return isNum(r.beds) ? 'Ukuran ' + s + ' menurut kelas RS, karena laporan tempat tidur belum lengkap.' : 'Ukuran ' + s + ' menurut kelas RS.';
      return 'Ukuran ' + s + '. Kelas dan tempat tidur RS ini tidak tercatat.';
    },
    /** The point line of the Jarak & rute fold (§4.7). */
    geo: function (r) {
      if (!r) return '';
      if (r.geo === 'kelurahan') return 'Titik pusat kelurahan, karena alamat hanya menyebut kelurahan.';
      if (r.geo === 'kecamatan') return 'Titik pusat kecamatan, karena alamat hanya menyebut kecamatan.';
      if ((r.geo === 'jalan' || r.geo === 'kampung') && r.conf === 'rendah') return 'Titik di tengah jalan yang panjang. Lokasi fasilitas dapat bergeser beberapa ratus meter dari titik ini.';
      if (r.geo === 'jalan' || r.geo === 'kampung') return 'Titik di jalan sesuai alamat resmi.';
      return 'Titik tepat dari register atau peta.';
    },
    exact: function (r) { return !!r && r.geo === 'titik' && r.conf !== 'rendah'; },
    geoSrc: function (r) { return r ? GEO_SRC[r.geoSrc] || String(r.geoSrc || '') : ''; },
    /** [{text, title}] one line per source of the row: "{title} · {publisher} · {fetched}", the licence as title. */
    sources: function (r) {
      var D = data(), list = (D && D.meta.sources) || [];
      return (r && Array.isArray(r.src) ? r.src : []).map(function (id) {
        var s = list.filter(function (x) { return x.id === id; })[0];
        if (!s) return null;
        var f = String(s.fetched || '').split(/\s*s\.d\.\s*/).map(dateWords).filter(Boolean).join(' sampai ');
        return { id: id, text: [s.title, s.publisher, f].filter(Boolean).join(' · '), title: s.licence || null };
      }).filter(Boolean);
    },
    srcShort: function (r) { var seen = {}; return (r && r.src || []).map(function (s) { return SRC_SHORT[s] || s; }).filter(function (s) { if (seen[s]) return false; seen[s] = 1; return true; }).join(', '); },
    mapOnly: function (r) { return !!r && Array.isArray(r.src) && r.src.every(function (s) { return s === 'osm' || s === 'overture'; }); },
    /** The coverage line of a clinic whose kota was not read in the Kemenkes klinik directory (§1.2), else null. */
    coverage: function (r) { var c = covOf(r); return c && c.status === 'belum' ? 'Daftar klinik Kemenkes untuk wilayah ini belum dibaca. Klinik dari Dinkes DKI dan peta terbuka.' : null; },
    kotaBelum: function (kecId) {
      var I = index();
      if (!I || !kecId) return false;
      var c = I.cov[String(kecId).split('.').slice(0, 2).join('.')];
      return !!(c && c.status === 'belum');
    },
    beauty: 'Klinik kecantikan dikenali dari nama dan kategori peta, sehingga perlu diperiksa.',
    mapOnlyLine: 'Dari peta terbuka, tidak tercantum di register Kemenkes atau Dinkes DKI.',
    /** "RUMAH SAKIT · SWASTA · KOTA BEKASI" / "KLINIK KESEHATAN · PRATAMA · JAKARTA TIMUR" (upper-cased by the caller). */
    eyebrow: function (r) {
      if (!r) return '';
      var mid = r.kind === 'rs' ? W.ownerShort(r) : (r.tier ? W.tier(r) : null);
      return [kindWord(r), mid, kotaWord(r.kecId)].filter(Boolean).join(' · ');
    },
    attribution: function (r) {
      var out = [];
      if (!r) return out;
      if (r.kind === 'rs') out.push('Data RS: Kemenkes (SIRS Online). Tempat tidur: Kemenkes (SIRANAP).');
      else out.push('Data klinik: Kemenkes (Direktori Klinik) dan Dinas Kesehatan DKI Jakarta (Satu Data Jakarta).');
      var osm = (r.src || []).indexOf('osm') >= 0, ov = (r.src || []).indexOf('overture') >= 0;
      if (osm || ov) out.push([osm ? '© kontributor OpenStreetMap' : null, ov ? '© Overture Maps Foundation' : null].filter(Boolean).join(' · '));
      return out;
    }
  };
  H.kecName = kecName;
  H.kotaWord = kotaWord;

  /* ------------------------------------------------------------ Peluang Mandiri (H16; research-health.json plays) */

  var PLAYS = {
    rs: [
      { id: 'payroll', label: 'Payroll', text: 'Payroll dokter, perawat dan karyawan melalui Kopra by Mandiri.', logos: ['kopra'] },
      { id: 'giro', label: 'Giro dan cash management', text: 'Giro operasional dengan Kopra Cash Management dan Smart Account per unit.' },
      { id: 'va', label: 'Tagihan pasien', text: 'Mandiri Virtual Account untuk tagihan pasien, asuransi dan perusahaan.' },
      { id: 'kasir', label: 'Kasir', text: 'EDC Mandiri dan QRIS di kasir. EDC Pre-Authorization menahan deposit pasien rawat inap.' },
      { id: 'bpjs', label: 'Klaim BPJS', text: 'Receivable Financing BPJS membiayai klaim BPJS Kesehatan yang telah diverifikasi tetapi belum dibayar.' },
      { id: 'payable', label: 'Pemasok dan honor dokter', text: 'Mandiri Corporate Payable untuk pembayaran ke pemasok dan dokter.' },
      { id: 'kredit', label: 'Kredit', text: 'Kredit investasi, modal kerja dan bank guarantee bersama unit bisnis bank.' },
      { id: 'prioritas', label: 'Direksi dan dokter spesialis', text: 'Mandiri Prioritas dan KPR sebagai penawaran lanjutan.' }
    ],
    klinik: [
      { id: 'qris', label: 'QRIS dan Livin’ Merchant', text: 'QRIS di meja kasir. Livin’ Merchant tanpa biaya untuk kasir, stok dan beberapa cabang.', logos: ['qris', 'lvm'], programs: ['lvm-mdr', 'lvm-melaju'] },
      { id: 'edc', label: 'EDC', text: 'EDC Mandiri untuk kartu debit, kartu kredit dan pembayaran nirsentuh.' },
      { id: 'rekening', label: 'Rekening operasional', text: 'Jika klinik ini mitra BPJS, dana kapitasi bulanan dapat masuk ke giro Mandiri.' },
      { id: 'payroll', label: 'Payroll', text: 'Payroll dokter, perawat dan staf melalui Kopra.', logos: ['kopra'] },
      { id: 'kur', label: 'Kredit usaha', text: 'KUR atau Kredit Usaha Mikro untuk klinik milik perorangan. Kelayakan melalui proses kredit resmi.', programs: ['kur-2026'] },
      { id: 'prioritas', label: 'Pemilik dan dokter', text: 'Mandiri Prioritas dan KPR sebagai penawaran lanjutan.' }
    ],
    kecantikan: [
      { id: 'cicil', label: 'Cicilan kartu', text: 'EDC Mandiri dengan cicilan kartu kredit Mandiri Power Buy untuk paket perawatan.' },
      { id: 'qris', label: 'QRIS dan Livin’ Merchant', text: 'QRIS untuk penjualan produk dan perawatan kecil. Laporan beberapa outlet di Livin’ Merchant.', logos: ['qris', 'lvm'], programs: ['lvm-mdr', 'lvm-melaju'] },
      { id: 'girojaringan', label: 'Giro jaringan', text: 'Kopra dan Smart Account per outlet untuk kantor pusat jaringan.', chainOnly: true },
      { id: 'payroll', label: 'Payroll', text: 'Payroll dokter, terapis dan staf melalui Kopra.', logos: ['kopra'] },
      { id: 'prioritas', label: 'Pemilik dan dokter estetika', text: 'Mandiri Prioritas dan KPR sebagai penawaran lanjutan.' }
    ]
  };
  var OWNER_PLAY = {
    pemerintah: { label: 'Milik pemerintah', text: 'Rekening dan payroll diatur melalui Pemda (BLUD) atau kementerian.' },
    tni: { label: 'Milik TNI', text: 'Kerja sama melalui institusi TNI.' },
    polri: { label: 'Milik Polri', text: 'Kerja sama melalui institusi Polri.' }
  };
  H.PLAY_PREVIEW = { rs: 'payroll, giro, kasir', klinik: 'QRIS, EDC, rekening', kecantikan: 'cicilan kartu, QRIS, payroll' };
  H.PLAY_FOOT = 'Produk dari halaman publik Bank Mandiri, dibaca 22 Okt 2026. Syarat dan biaya mengikuti ketentuan bank.';
  /** plays(row) → [{id, label, text, logos?, programs?}] (§4.9): never a rate, cap, plafond or fee. */
  H.plays = function (r) {
    if (!r) return [];
    if (r.play === false) {
      var o = OWNER_PLAY[r.owner] || OWNER_PLAY.pemerintah;
      return [{ id: 'owner', label: o.label, text: o.text }, { id: 'nonplay', label: 'Tanpa prioritas merchant', text: 'Fasilitas ini tidak memiliki prioritas merchant.' }];
    }
    var out = [];
    if (r.chain) out.push({ id: 'chain', label: 'Cabang jaringan ' + r.chain, text: 'Keputusan bank biasanya di kantor pusat jaringan. Kunjungan cabang untuk hubungan dan rujukan ke kantor pusat.' });
    (PLAYS[r.kind] || PLAYS.klinik).forEach(function (p) {
      if (p.chainOnly && !r.chain) return;
      out.push({ id: p.id, label: p.label, text: p.text, logos: p.logos ? p.logos.slice() : null, programs: p.programs ? p.programs.slice() : null });
    });
    return out;
  };
  /* programme names without a number in them (Peluang Mandiri shows no rate: the config label of lvm-mdr has one) */
  var PROGRAM_WORD = { 'lvm-mdr': 'MDR spesial Livin’ Merchant', 'lvm-melaju': 'MELAJU Merchant Hoki', 'kur-2026': 'Program KUR Mandiri 2026' };
  /** programmes(ids) → [{id, label, end}] of MCD.config programmes running today (start ≤ today ≤ end). */
  H.programmes = function (ids) {
    var cfg = MCD.config || {}, byId = cfg.programById || {}, list = Array.isArray(cfg.programs) ? cfg.programs : [], t = todayIso();
    return (ids || []).map(function (id) {
      var p = byId[id] || list.filter(function (x) { return x && x.id === id; })[0];
      if (!p || !p.end || (t && (p.end < t || (p.start && p.start > t)))) return null;
      return { id: id, label: PROGRAM_WORD[id] || String(p.label || id).replace(/\s*\d+([.,]\d+)?\s*%/g, '').trim(), end: p.end };
    }).filter(Boolean);
  };

  /* ------------------------------------------------------------ contacts (H18; D17, D18) */

  var SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|blogspot\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|linktr\.ee|wordpress\.com|sites\.google\.com|wixsite\.com)$/i;
  /** safeUrl(v) → {url, host, https, social} for an http(s) address with a dotted host and no credentials, else null. */
  function safeUrl(v) {
    if (typeof v !== 'string' || !v.trim()) return null;
    var U = root.URL;
    if (!isFn(U)) return null;
    var u;
    try { u = new U(v.trim()); } catch (e) { return null; }
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username || u.password) return null;
    var host = String(u.hostname || '').toLowerCase();
    if (!host || host.indexOf('.') < 0 || /[^a-z0-9.-]/.test(host) || /^[\d.]+$/.test(host)) return null;
    return { url: u.href, host: host.replace(/^www\./, ''), https: u.protocol === 'https:', social: SOCIAL.test(host) };
  }
  function mailOf(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim().toLowerCase();
    if (!s || /[\s<>"'`]/.test(s) || s.split('@').length !== 2) return null;
    var p = s.split('@');
    return p[0] && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(p[1]) ? s : null;
  }
  H.safeUrl = safeUrl;
  /**
   * contact(row, {veiled}) → {veiled?, none, phone: {display, tel, noArea, mobile} | null, email: {value} | null,
   * emailDropped, web: {url?, host, https, social, link, check, redirected, unchecked} | null, webDropped, clinic}.
   * A tel: link only from telHref (D18), a website link only from webLink (D17); e-mail on hospitals only; a mobile
   * number never on a klinik row; nothing at all while "Samarkan nama" is on (V6 D7).
   */
  H.contact = function (r, o) {
    o = o || {};
    var D = data(), c = r && r.contact, clinic = !!r && r.kind !== 'rs';
    if (o.veiled) return { veiled: true, none: true, phone: null, email: null, web: null, emailDropped: false, webDropped: false, clinic: clinic };
    var out = { none: true, phone: null, email: null, emailDropped: false, web: null, webDropped: false, clinic: clinic };
    if (!r || !c) return out;
    if (c.phone && !(clinic && c.mobile)) {
      var tel = D && isFn(D.telHref) ? D.telHref(r) : null;
      if (typeof tel !== 'string' || !/^tel:\+?\d{7,15}$/.test(tel)) tel = null;
      out.phone = { display: String(c.phone), tel: tel, noArea: !!c.phoneNoArea, mobile: !clinic && !!c.mobile };
    }
    if (!clinic) { var em = mailOf(c.email); if (em) out.email = { value: em }; else if (c.emailWhy === 'pribadi') out.emailDropped = true; }
    var link = D && isFn(D.webLink) ? D.webLink(r) : null, w = link ? safeUrl(link) : null;
    if (w) out.web = Object.assign(w, { link: true, check: c.webCheck || null, redirected: c.webCheck === 'dialihkan', unchecked: c.webCheck === 'belum' });
    else if (c.web && c.webCheck === 'gagal') { var g = safeUrl(c.web); if (g) out.web = { host: g.host, https: g.https, social: g.social, link: false, check: 'gagal' }; }
    else if (c.webCheck === 'dibuang') out.webDropped = true;
    out.none = !out.phone && !out.email && !out.web && !out.webDropped && !out.emailDropped;
    return out;
  };

  /* ------------------------------------------------------------ Merchant terkait (H17; LVM_MATCHING.md) */

  var LST = { P: null, grid: null, rows: null };
  var GRID = 0.002;
  /* the public listings of data/sme-pois.js in the groups Health & Pharmacy (3) and Beauty & Personal Care (5), on a grid */
  function listings() {
    var P = root.MCD_SME_POIS, rows = P && P.rows;
    if (!Array.isArray(rows)) return null;
    if (LST.P === P) return LST;
    var grid = new Map();
    for (var i = 0; i < rows.length; i++) {
      var t = rows[i];
      if (!Array.isArray(t) || (t[2] !== 3 && t[2] !== 5) || !isNum(t[0]) || !isNum(t[1])) continue;
      var k = Math.floor(t[0] / GRID) + ':' + Math.floor(t[1] / GRID);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    LST = { P: P, grid: grid, rows: rows, links: new Map() };
    return LST;
  }
  /* the name score: MCD.lvm.similarity (one rule with the Merchant tab), else the share of common words */
  function simOf(a, b) {
    var L = MCD.lvm;
    if (L && isFn(L.similarity)) { try { return +L.similarity(a, b) || 0; } catch (e) { /* own below */ } }
    var x = fold(a).split(' ').filter(Boolean), y = fold(b).split(' ').filter(Boolean);
    if (!x.length || !y.length) return 0;
    var common = x.filter(function (w) { return y.indexOf(w) >= 0; }).length;
    return 2 * common / (x.length + y.length);
  }
  /**
   * listingOf(row) → the MCD_SME_POIS index of the facility's own listing, or -1 (§5 step 3): only for a row with
   * 'overture' in src; within 5 m when the row's point is that listing's (geoSrc 'overture'), else 150 m; the name score
   * ≥ 0,8; exactly one listing passes.
   */
  function listingOf(r) {
    var X = listings();
    if (!X || !r || (r.src || []).indexOf('overture') < 0) return -1;
    if (X.links.has(r.id)) return X.links.get(r.id);
    var maxM = r.geoSrc === 'overture' ? 5 : 150, gx = Math.floor(r.lon / GRID), gy = Math.floor(r.lat / GRID), hits = [];
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      (X.grid.get((gx + dx) + ':' + (gy + dy)) || []).forEach(function (i) {
        var t = X.rows[i];
        if (metres(r.lon, r.lat, t[0], t[1]) <= maxM && simOf(r.name, t[3]) >= 0.8) hits.push(i);
      });
    }
    var out = hits.length === 1 ? hits[0] : -1;
    X.links.set(r.id, out);
    return out;
  }
  H.listingOf = listingOf;
  var ML = { R: null, m: new Map() };
  /* an LVM or EDC entry with no public listing in the same kelurahan, a near-identical name (≥ 0,9), not a
     low-information name, and the only one (§5 step 6): a suggestion, never counted */
  function guessOf(r, R) {
    var L = MCD.lvm;
    if (!R || !r.kelId || !L) return null;
    var found = [];
    function scan(list, raw, kind) {
      (list || []).forEach(function (m) {
        if (!m || m.poi >= 0 || m.kelurahanId !== r.kelId) return;
        var src = raw && raw[m.ix], name = src && (src.name || src.merchantName || src.storeName);
        if (!name) return;
        var nm = null;
        try { nm = isFn(L.normName) ? L.normName(name) : null; } catch (e) { nm = null; }
        if (nm && !(nm.core || []).some(function (w) { return String(w).length >= 4; })) return;
        if (simOf(r.name, name) >= 0.9) found.push({ id: m.id, name: String(name), kind: kind, active: m.active });
      });
    }
    scan(R.merchants, R.lvmRef, 'lvm');
    scan(R.edc, R.edcMerchants, 'edc');
    return found.length === 1 ? found[0] : null;
  }
  /**
   * merchantLink(row) → {state, poi?, status?, guess?, demo} (§5): 'bukan-merchant' (play false) · 'luar-15' (outside
   * 15 km) · 'potensi' (no LVM file; poi when linked) · 'acquired' | 'not_yet' (linked, MCD.lvm.poiStatus) · 'tidak-dihitung'
   * (linked, not a merchant in the Merchant tab) · 'tanpa-peta' (no listing; maybe a guess). Rows that are not merchants
   * never read MCD.lvm. Memoised per MCD.lvm.result() object.
   */
  function merchantLink(r) {
    if (!r) return { state: 'none', demo: false };
    if (r.play === false) return { state: 'bukan-merchant', demo: false };
    if (!r.in15) return { state: 'luar-15', demo: false };
    var L = lvmApi(), R = null;
    if (L && hasLvm()) { try { R = L.match(); } catch (e) { R = null; } }
    if (ML.R !== R) ML = { R: R, m: new Map() };
    if (ML.m.has(r.id)) return ML.m.get(r.id);
    var poi = listingOf(r), demo = !!(R && R.demo), out;
    if (!R || !R.hasLvm) out = { state: 'potensi', poi: poi >= 0 ? poi : null, demo: false };
    else if (poi >= 0) {
      var ps = null;
      try { ps = L.poiStatus(poi); } catch (e) { ps = null; }
      out = ps ? { state: ps.status === 'acquired' ? 'acquired' : 'not_yet', poi: poi, status: ps, demo: demo } : { state: 'tidak-dihitung', poi: poi, demo: demo };
    } else out = { state: 'tanpa-peta', poi: null, guess: guessOf(r, R), demo: demo };
    ML.m.set(r.id, out);
    return out;
  }
  H.merchantLink = merchantLink;

  /* ------------------------------------------------------------ Rencana kunjungan (H20) */

  /** planStop(row) → {id, kind: 'kesehatan', label, lon, lat, geoPrecision?}: coordinates only, nothing else. */
  H.planStop = function (r) {
    if (!r || !H.keyOk(r.id) || !isNum(r.lon) || !isNum(r.lat)) return null;
    var s = { id: r.id, kind: 'kesehatan', label: String(r.name || ''), lon: r.lon, lat: r.lat };
    if (has(GEO_PREC, r.geo)) s.geoPrecision = GEO_PREC[r.geo];
    return s;
  };

  /* ------------------------------------------------------------ Tindak lanjut (H19) */

  var STAGES = [
    { id: 'baru', label: 'Belum dihubungi' }, { id: 'kontak', label: 'Telah dihubungi' }, { id: 'presentasi', label: 'Presentasi' },
    { id: 'proposal', label: 'Proposal' }, { id: 'pks', label: 'Negosiasi & PKS' }, { id: 'onboarding', label: 'Onboarding' },
    { id: 'aktif', label: 'Aktif' }, { id: 'ditunda', label: 'Ditunda', side: true }, { id: 'gugur', label: 'Batal', side: true }
  ];
  var PRODUCTS = [
    { id: 'PAYROLL', label: 'Payroll (Kopra)', short: 'Payroll' },
    { id: 'GIRO', label: 'Giro dan cash management', short: 'Giro' },
    { id: 'VA', label: 'Virtual Account tagihan', short: 'Virtual Account' },
    { id: 'EDC', label: 'EDC Mandiri', short: 'EDC' },
    { id: 'LVM', label: 'QRIS dan Livin’ Merchant', short: 'QRIS dan LVM' },
    { id: 'CICIL', label: 'Cicilan kartu (Power Buy)', short: 'Cicilan kartu' },
    { id: 'BPJS', label: 'Pembiayaan klaim BPJS', short: 'Klaim BPJS' },
    { id: 'KREDIT', label: 'Kredit usaha', short: 'Kredit usaha' }
  ];
  var PROGRAMS = [{ id: '', label: 'Belum ada' }, { id: 'lvm-mdr', label: PROGRAM_WORD['lvm-mdr'] }, { id: 'lvm-melaju', label: PROGRAM_WORD['lvm-melaju'] }, { id: 'kur-2026', label: PROGRAM_WORD['kur-2026'] }];
  var MSG = {
    noKey: 'Fasilitas ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.',
    noQuickKey: 'Fasilitas ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.',
    badKey: 'Fasilitas ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.',
    notExport: 'File ini bukan ekspor tindak lanjut fasilitas kesehatan. Pilih file lain.'
  };
  function stages() { var S = MCD.schools && MCD.schools.config && MCD.schools.config.stages; return Array.isArray(S) && S.length ? S : STAGES; }
  H.STAGES = STAGES.map(function (s) { return Object.assign({}, s); });
  H.PRODUCTS = PRODUCTS.map(function (p) { return Object.assign({}, p); });
  H.PROGRAMS = PROGRAMS.map(function (p) { return Object.assign({}, p); });
  H.MSG = Object.assign({}, MSG);
  H.stages = stages;
  H.stageLabel = function (id) { var s = stages().filter(function (x) { return x.id === id; })[0]; return s ? s.label : ''; };
  H.productName = function (id) { var p = PRODUCTS.filter(function (x) { return x.id === id; })[0]; return p ? p.short : id; };
  H.programName = function (id) { var p = PROGRAMS.filter(function (x) { return x.id === id; })[0]; return p && p.id ? p.label : ''; };
  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, max); }
  function dateOk(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : ''; }
  function validStage(s) { return stages().some(function (x) { return x.id === s; }) ? s : 'baru'; }
  function prodOk(a) { return (Array.isArray(a) ? a : []).filter(function (x) { return PRODUCTS.some(function (q) { return q.id === x; }); }); }
  function progOk(x) { return PROGRAMS.some(function (p) { return p.id && p.id === x; }) ? x : ''; }
  /** The memory-only list (no MCD.seal): the MCD.seal pipeline API, never written to storage in plain text. */
  function memoryPipeline() {
    var mem = {}, subs = [];
    function fire() { subs.slice().forEach(function (fn) { try { fn(mem); } catch (e) { /* next */ } }); emit('pipeline', {}); }
    function clean(inc) {
      return { stage: validStage(inc.stage), owner: cleanText(inc.owner, 60), products: prodOk(inc.products), program: progOk(inc.program),
        nextStep: cleanText(inc.nextStep, 120), nextDate: dateOk(inc.nextDate), lastContact: dateOk(inc.lastContact), note: cleanText(inc.note, 500),
        history: Array.isArray(inc.history) ? inc.history.slice(-20).map(function (h) { return { stage: validStage(h && h.stage), t: cleanText(h && h.t, 40) }; }) : [],
        t: cleanText(inc.t, 40), label: cleanText(inc.label, 160) };
    }
    var api = {
      key: 'health.pipeline', memory: true,
      all: function () { return mem; },
      get: function (k) { return mem[k] || null; },
      count: function () { return Object.keys(mem).length; },
      persisted: function () { return false; },
      status: function () { return 'memory'; },
      ready: function () { return Promise.resolve(api); },
      orphans: function (known) { var s = known instanceof Set ? known : new Set(known || []); return Object.keys(mem).filter(function (k) { return !s.has(k); }); },
      set: function (k, patch, meta) {
        if (!H.keyOk(k)) return { ok: false, error: MSG.badKey };
        var cur = mem[k] || { stage: 'baru', owner: '', products: [], program: '', nextStep: '', nextDate: '', lastContact: '', note: '', history: [], t: '' };
        var next = Object.assign({}, cur);
        patch = patch || {};
        if ('stage' in patch) { var s2 = validStage(patch.stage); if (s2 !== cur.stage || !cur.history.length) next.history = cur.history.concat([{ stage: s2, t: nowIso() }]).slice(-20); next.stage = s2; }
        if ('program' in patch) next.program = progOk(patch.program);
        if ('owner' in patch) next.owner = cleanText(patch.owner, 60);
        if ('nextStep' in patch) next.nextStep = cleanText(patch.nextStep, 120);
        if ('note' in patch) next.note = cleanText(patch.note, 500);
        if ('nextDate' in patch) next.nextDate = dateOk(patch.nextDate);
        if ('lastContact' in patch) next.lastContact = dateOk(patch.lastContact);
        if ('products' in patch) next.products = prodOk(patch.products);
        if (meta && meta.label) next.label = cleanText(meta.label, 160);
        next.t = nowIso();
        mem[k] = next;
        fire();
        return { ok: true, entry: next };
      },
      quickAdd: function (k, label) {
        if (!H.keyOk(k)) return { ok: false, error: MSG.noQuickKey };
        if (mem[k]) return { ok: true, entry: mem[k], existed: true };
        var res = api.set(k, { stage: 'baru' }, { label: label || '' });
        if (res.ok) res.existed = false;
        return res;
      },
      remove: function (k) { if (mem[k]) { delete mem[k]; fire(); } },
      clear: function () { mem = {}; fire(); },
      exportJson: function () { return JSON.stringify({ v: 1, kind: 'mcd.health.pipeline', exported: nowIso(), data: mem }, null, 1); },
      importJson: function (text) {
        var obj;
        try { obj = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, error: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).' }; }
        if (!obj || obj.v !== 1 || !obj.data || typeof obj.data !== 'object' || (obj.kind && obj.kind !== 'mcd.health.pipeline')) return { ok: false, error: MSG.notExport };
        var added = 0, updated = 0, kept = 0;
        Object.keys(obj.data).forEach(function (k) {
          var inc = obj.data[k];
          if (!inc || typeof inc !== 'object' || !H.keyOk(k)) return;
          var c = clean(inc);
          if (!mem[k]) { mem[k] = c; added++; } else if (c.t > (mem[k].t || '')) { mem[k] = c; updated++; } else kept++;
        });
        fire();
        return { ok: true, added: added, updated: updated, kept: kept };
      },
      on: function (fn) { if (isFn(fn)) subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
      _reset: function () { mem = {}; }
    };
    return api;
  }
  var PIPE = null;
  /** The follow-up list: MCD.seal.pipeline('health.pipeline') when the SEAL lane is loaded (encrypted), else memory only. */
  function pipeline() {
    if (PIPE && !(PIPE.memory && MCD.seal && isFn(MCD.seal.pipeline) && !PIPE.count())) return PIPE;
    var S = MCD.seal, p = null;
    if (S && isFn(S.pipeline)) {
      try {
        p = S.pipeline('health.pipeline', { keyRe: ID_RE, stages: stages(), products: PRODUCTS.map(function (x) { return x.id; }),
          programs: PROGRAMS.map(function (x) { return x.id; }).filter(Boolean), messages: Object.assign({}, MSG),
          check: function (key) { return H.keyOk(key) ? null : MSG.badKey; }, onChange: function () { emit('pipeline', {}); } });
      } catch (e) { p = null; }
    }
    PIPE = p || memoryPipeline();
    return PIPE;
  }
  try { Object.defineProperty(H, 'pipeline', { configurable: true, enumerable: true, get: pipeline, set: function (v) { PIPE = v || null; } }); }
  catch (e) { H.pipeline = pipeline(); }
  H._memoryPipeline = memoryPipeline;

  /* ------------------------------------------------------------ CSV (§4.8) */

  function csvCell(v) {
    var c = MCD.util && MCD.util.csv;
    if (c && isFn(c.cell)) return c.cell(v);
    if (v == null) return '';
    var s = String(v);
    if (/^[=+\-@\t]/.test(s)) s = "'" + s;
    return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function initials(name) {
    var M = MCD.util && MCD.util.mask;
    if (M && isFn(M.initials)) { try { return M.initials(name); } catch (e) { /* own below */ } }
    return String(name || '').split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  H.initials = initials;
  H.CSV_COLUMNS = ['id', 'kode_rs', 'nama', 'jenis', 'layanan', 'tingkat', 'kelas', 'tempat_tidur', 'ukuran', 'dasar_ukuran', 'pemilik', 'prioritas_merchant',
    'jaringan', 'alamat', 'kecamatan', 'kelurahan', 'dalam_15_km', 'jarak_dari_kcp_km', 'menit_dari_kcp', 'telepon', 'email', 'situs_resmi', 'ketepatan_titik', 'sumber'];
  /**
   * csv(rows, {veiled, dist: fn(row) → {km, min} | null}) → CSV text (UTF-8 BOM first). telepon only a number with an area
   * code (telHref), situs_resmi only a webLink (D17); while names are veiled: initials, no address, no contact. No LVM
   * status column (bank data is not exported from this tab).
   */
  H.csv = function (rows, o) {
    o = o || {};
    var lines = [H.CSV_COLUMNS.join(',')];
    (rows || []).forEach(function (r) {
      var c = H.contact(r, { veiled: !!o.veiled }), d = isFn(o.dist) ? o.dist(r) : null;
      lines.push([
        r.id, r.kode || '', o.veiled ? initials(r.name) : r.name, kindWord(r), subWord(r), r.tier ? W.tier(r) : '', r.kelas || '',
        isNum(r.beds) ? r.beds : '', r.kind === 'rs' ? W.size(r) : '', r.kind === 'rs' ? (r.sizeBasis || '') : '', W.ownerShort(r), r.play ? 'ya' : 'tidak',
        r.chain || '', o.veiled ? '' : (r.addr || ''), kecName(r.kecId), kelName(r.kelId) || '', r.in15 ? 'ya' : 'tidak',
        d && isNum(d.km) ? d.km.toFixed(1) : (isNum(r.distKm) ? r.distKm.toFixed(1) : ''), d && isNum(d.min) ? Math.round(d.min) : '',
        c.phone && c.phone.tel ? c.phone.display : '', c.email ? c.email.value : '', c.web && c.web.link ? c.web.url : '',
        r.conf === 'rendah' ? 'perkiraan' : W.exact(r) ? 'tepat' : 'alamat', W.srcShort(r)
      ].map(csvCell).join(','));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  };

  /* ------------------------------------------------------------ search and the Ringkasan door */

  /** search(q, max) → {rows: [row], chains: [{name, kinds}]}: whole names first, then names that contain the words. */
  H.search = function (q, max) {
    var I = index(), key = fold(q), lim = isNum(max) ? max : 8;
    if (!I || key.length < 3) return { rows: [], chains: [] };
    var exact = [], part = [];
    for (var i = 0; i < I.rows.length && exact.length + part.length < lim * 4; i++) {
      var n = fold(I.rows[i].name);
      if (n === key) exact.push(I.rows[i]);
      else if (n.indexOf(key) >= 0) part.push(I.rows[i]);
    }
    var rows = exact.concat(H.sort(part, 'rsBesar')).slice(0, lim);
    var chains = I.chains.filter(function (c) { return fold(c.name).indexOf(key) >= 0 || key.indexOf(fold(c.name)) >= 0 && fold(c.name).length >= 3; }).slice(0, 3);
    return { rows: rows, chains: chains };
  };
  /** door() → the Ringkasan door (H11, 15 km, no filter): {rs, klinik (both clinic kinds), kecantikan, line, title}. */
  H.door = function () {
    var c = H.ready() ? H.counts({ km: 15 }) : null;
    if (!c) return { line: 'Rumah sakit dan klinik dalam 15 km', title: null, rs: null, klinik: null, kecantikan: null };
    var k = c.klinik + c.kecantikan;
    return { rs: c.rs, klinik: k, kecantikan: c.kecantikan, line: fmtInt(c.rs) + ' rumah sakit · ' + fmtInt(k) + ' klinik dalam 15 km',
      title: 'Termasuk ' + fmtInt(c.kecantikan) + ' klinik kecantikan. Data Kemenkes dan Dinas Kesehatan DKI Jakarta.' };
  };
  H.fmtKm = fmtKm;
  H.dateWords = dateWords;
  H._fold = fold;
})(typeof window !== 'undefined' ? window : globalThis, (typeof window !== 'undefined' ? (window.MCD = window.MCD || {}) : (globalThis.MCD = globalThis.MCD || {})));
if (typeof module !== 'undefined' && module && module.exports) module.exports = (typeof window !== 'undefined' ? window : globalThis).MCD.health;
