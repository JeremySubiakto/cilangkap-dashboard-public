/* ==========================================================================
 * MCD.state · MCD.data · MCD.derive: the shared core of the Acquisition Dashboard.
 *
 * Scope (branch decision 15 Oct 2026, docs/COPY_STYLE_EN.md items 10–14; v6, item 45): six
 * sections (Overview · Merchants · Schools · Kampus · KPR · Data & Privacy). There is no
 * customer (nasabah), loan, giro, payroll or staff model any more: the core only
 * routes state, holds the bank datasets the sections use, and memoises the
 * per-section derived blocks that sections register. Kampus (id 'campus', #s=campus)
 * adds no bank dataset and no state key: its list sort lives in mcd.campus.ui.v1 and
 * the 15 km / 30 km scope of Sekolah and Kampus in sessionStorage (MCD.inst.scope),
 * never in the hash (V6_SPEC D4: a view setting, not a filter). V8 (docs/V8_SPEC.md §2.1): the shown sections come
 * from MCD.config.sections (nine on keys 1–9; KPR hidden, so s=property is refused like an unknown id); popstate
 * events of MCD.back layer entries are ignored and a push over a layer entry replaces it (M2).
 *
 * Load order: config → util → data-reference → state. Nothing runs at load time
 * except declarations: no hash read, no storage access, no data generation.
 * app.js, inside boot() after the password gate:
 *
 *   MCD.state.init({ hash: true })            read #hash (never mcd.lastView, A-10), listen to hashchange/popstate
 *   MCD.importer.applyDataset(k, rows, …)     vault datasets
 *   MCD.data.loadReference()                  public map sites only (no synthetic records)
 *   var d = MCD.derive.compute()              → Derived {signature, asOf, dataVersion, demo, counts, ext, …hooks}
 *   MCD.state.on('change' | 'data', …)        → requestAnimationFrame → derive.compute → render
 *
 * MCD.state   get · set(patch, {source, history}) · on/off · emit · reset(scope) · undo · canUndo ·
 *             signature · init · hash · parseHash · applyHash · suspendHash · setCamera · defaults · enums
 * MCD.data    lvm · edc · sekolah · sites · meta · version · asOf ·
 *             loadReference · loadDemo (tests and the demo switch) · replace(type, records, meta) ·
 *             revert(type) · clearAll(opts) · registerDataset · setDemo · keyFor · isDemo · isEmpty ·
 *             summary · datasets · enterDemo · exitDemo · demoActive · real (COPY_STYLE_EN item 7)
 * MCD.derive  compute(state?) · register(key, fn(state, data, core), opts) · invalidate · version
 *
 * State keys: section · view ('overview'|'deep') · filters.radiusKm (distance focus, km) ·
 *   map.layers {labels, rings, sites, competitors, boundary} · privacy {veil, reveal} ·
 *   sme {groups, bands, hexColor, layerSet, leadRadius, leadSites} (merchant map, assets/js/sme.js) ·
 *   camera {lon, lat, zoom} (always flat: pitch and bearing are 0) · selection · hover.
 *
 * Privacy (§K.1): personal data stays in memory. The URL hash and
 * localStorage['mcd.lastView'] carry section, view, distance focus, merchant map
 * options and camera only; never a record id, a name or the selection.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = typeof window !== 'undefined' ? window : {};

  /* ================================================================ enums */

  var VIEWS = ['overview', 'deep'];
  var RADII = [1, 3, 5, 10, 15, 20, 30];                       // distance focus (km), the ring radii
  var SME_HEX = { dominant: 'd', density: 'k', penetration: 'p' };
  var SME_LAYER = { sme: 'u', tni: 't', both: 'g' };
  var SME_RADII = [250, 500, 1000];
  var LAYER_KEYS = ['labels', 'rings', 'sites', 'competitors', 'boundary'];

  function sectionIds() {
    var s = MCD.config && MCD.config.sections;
    return s ? s.map(function (x) { return x.id; }) : ['overview', 'merchants', 'schools', 'campus', 'property', 'data'];
  }

  /* ============================================================== helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function now() { return (W.performance && W.performance.now) ? W.performance.now() : Date.now(); }
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    }
    return o;
  }
  function sameJSON(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function warn(msg, e) { if (W.console && W.console.warn) W.console.warn('[MCD.state] ' + msg, e && e.message ? e.message : ''); }
  function ord(list, order) { return order.filter(function (x) { return list.indexOf(x) >= 0; }); }
  function uniqList(v, allowed, mapFn) {
    if (!Array.isArray(v)) v = v == null || v === '' ? [] : [v];
    var out = [];
    v.forEach(function (x) {
      var y = mapFn ? mapFn(x) : x;
      if (y != null && allowed.indexOf(y) >= 0 && out.indexOf(y) < 0) out.push(y);
    });
    return ord(out, allowed);
  }

  /* ================================================================ events */

  var listeners = {};
  function on(ev, fn) {
    if (typeof fn !== 'function') return function () {};
    (listeners[ev] = listeners[ev] || []).push(fn);
    return function () { off(ev, fn); };
  }
  function off(ev, fn) {
    var l = listeners[ev];
    if (!l) return;
    if (!fn) { listeners[ev] = []; return; }
    var i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  function emit(ev, payload) {
    (listeners[ev] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { if (W.console) W.console.error(e); }
    });
  }

  /* ================================================================= state */

  function defaults() {
    return {
      v: 1,
      section: 'overview',
      view: 'overview',         // 'overview' | 'deep' (U6: global view mode; hash view=deep)
      filters: { radiusKm: null },
      map: { layers: { labels: true, rings: true, sites: true, competitors: true, boundary: true } },
      privacy: { veil: false, reveal: false },
      sme: { groups: [], bands: [], hexColor: 'dominant', layerSet: 'sme', leadRadius: 500, leadSites: false },
      camera: null,             // {lon, lat, zoom, pitch: 0, bearing: 0}; written by the map on moveend
      selection: null,          // {kind, id}; never persisted
      hover: null               // transient cross-highlight; never persisted
    };
  }
  var DEFAULT = deepFreeze(defaults());
  var cur = deepFreeze(defaults());
  var undoSnap = null;

  function cleanRadius(v) {
    if (v == null || v === '') return null;
    var n = +v;
    return RADII.indexOf(n) >= 0 ? n : null;
  }
  /** Flat, north-up camera (COPY_STYLE_EN item 10): pitch and bearing are always 0. */
  function cleanCamera(c) {
    if (!c || typeof c !== 'object') return null;
    var lon = +c.lon, lat = +c.lat, z = +c.zoom;
    if (!isNum(lon) || !isNum(lat) || !isNum(z) || lon < 100 || lon > 115 || lat < -10 || lat > 0 || z < 0 || z > 24) return null;
    return { lon: Math.round(lon * 1e5) / 1e5, lat: Math.round(lat * 1e5) / 1e5, zoom: Math.round(z * 100) / 100, pitch: 0, bearing: 0 };
  }

  /**
   * set(patch, {source, history}) → changed keys. Shallow merge; filters, map, privacy and
   * sme merge one level deep (map.layers two). Every value is validated.
   * history: 'push' (default for section and view), 'replace' (the rest), 'none'.
   */
  function set(patch, opts) {
    opts = opts || {};
    if (!patch || typeof patch !== 'object') return [];
    var next = clone(cur), changed = [];
    function mark(k) { if (changed.indexOf(k) < 0) changed.push(k); }

    if (has(patch, 'section') && sectionIds().indexOf(patch.section) >= 0 && patch.section !== next.section) { next.section = patch.section; mark('section'); }
    if (has(patch, 'view') && VIEWS.indexOf(patch.view) >= 0 && patch.view !== next.view) { next.view = patch.view; mark('view'); }
    if (patch.filters && typeof patch.filters === 'object' && has(patch.filters, 'radiusKm')) {
      var r = cleanRadius(patch.filters.radiusKm);
      if (r !== next.filters.radiusKm) { next.filters.radiusKm = r; mark('filters.radiusKm'); }
    }
    if (patch.map && typeof patch.map === 'object' && patch.map.layers && typeof patch.map.layers === 'object') {
      Object.keys(patch.map.layers).forEach(function (k) {
        if (LAYER_KEYS.indexOf(k) < 0) return;
        var v = !!patch.map.layers[k];
        if (next.map.layers[k] !== v) { next.map.layers[k] = v; mark('map.layers'); }
      });
    }
    if (patch.privacy && typeof patch.privacy === 'object') {
      var pv = patch.privacy;
      if (has(pv, 'veil') && !!pv.veil !== next.privacy.veil) {
        next.privacy.veil = !!pv.veil; mark('privacy.veil');
        if (next.privacy.veil && next.privacy.reveal) { next.privacy.reveal = false; mark('privacy.reveal'); }
      }
      if (has(pv, 'reveal') && !!pv.reveal !== next.privacy.reveal) {
        next.privacy.reveal = !!pv.reveal; mark('privacy.reveal');
        if (next.privacy.reveal && next.privacy.veil) { next.privacy.veil = false; mark('privacy.veil'); }   // §K.3: mutually exclusive
      }
    }
    if (patch.sme && typeof patch.sme === 'object') {
      var s = patch.sme, ns = next.sme;
      var smeSet = function (k, v) { if (!sameJSON(v, ns[k])) { ns[k] = v; mark('sme.' + k); } };
      if (has(s, 'groups')) smeSet('groups', uniqList(s.groups, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], function (x) { return parseInt(x, 10); }));
      if (has(s, 'bands')) smeSet('bands', uniqList(s.bands, [0, 1, 2, 3], function (x) { return parseInt(x, 10); }));
      if (has(s, 'hexColor') && has(SME_HEX, s.hexColor)) smeSet('hexColor', s.hexColor);
      if (has(s, 'layerSet') && has(SME_LAYER, s.layerSet)) smeSet('layerSet', s.layerSet);
      if (has(s, 'leadRadius') && SME_RADII.indexOf(+s.leadRadius) >= 0) smeSet('leadRadius', +s.leadRadius);
      if (has(s, 'leadSites')) smeSet('leadSites', !!s.leadSites);
    }
    if (has(patch, 'camera')) {
      var c = cleanCamera(patch.camera);
      if (!sameJSON(c, next.camera)) { next.camera = c; mark('camera'); }
    }
    if (has(patch, 'selection')) {
      var sel = patch.selection && patch.selection.kind && patch.selection.id != null ? { kind: String(patch.selection.kind), id: patch.selection.id } : null;
      if (sel && patch.selection.extra) sel.extra = clone(patch.selection.extra);
      if (!sameJSON(sel, next.selection)) { next.selection = sel; mark('selection'); }
    }
    if (has(patch, 'hover')) {
      var hv = patch.hover && typeof patch.hover === 'object' ? clone(patch.hover) : null;
      if (hv && !Object.keys(hv).length) hv = null;
      if (!sameJSON(hv, next.hover)) { next.hover = hv; mark('hover'); }
    }
    if (!changed.length) return changed;

    var prev = cur;
    cur = deepFreeze(next);
    var source = opts.source || 'ui';
    var main = changed.filter(function (k) { return k !== 'hover' && k !== 'camera'; });
    if (changed.indexOf('hover') >= 0) emit('hover', { hover: cur.hover, state: cur, source: source });
    if (changed.indexOf('selection') >= 0) emit('select', { selection: cur.selection, state: cur, source: source });
    if (changed.indexOf('camera') >= 0) emit('camera', { camera: cur.camera, state: cur, source: source });
    if (main.length) emit('change', { keys: main, state: cur, prev: prev, source: source });

    var persisted = changed.filter(function (k) { return k !== 'hover' && k !== 'selection' && k !== 'privacy.reveal' && k !== 'map.layers'; });
    if (persisted.length) {
      var hist = opts.history || ((persisted.indexOf('section') >= 0 || persisted.indexOf('view') >= 0) ? 'push' : 'replace');
      if (hist !== 'none') writeHash(hist);
    }
    return changed;
  }

  function get() { return cur; }

  /** reset('filters' | 'all'). A filters reset keeps one level of undo. */
  function reset(scope) {
    var d = defaults();
    if (scope === 'all') {
      undoSnap = clone(cur.filters);
      return set({ section: d.section, view: d.view, filters: d.filters, map: d.map, privacy: d.privacy, sme: d.sme, selection: null, hover: null }, { source: 'reset' });
    }
    if (sameJSON(cur.filters, d.filters)) return [];
    undoSnap = clone(cur.filters);
    var ch = set({ filters: d.filters }, { source: 'reset' });
    emit('reset', { scope: 'filters', canUndo: true });
    return ch;
  }
  function undo() {
    if (!undoSnap) return [];
    var snap = undoSnap;
    undoSnap = null;
    return set({ filters: snap }, { source: 'undo' });
  }
  function canUndo() { return !!undoSnap; }

  /** Stable string of the filters (cache key). */
  function signature(st) {
    var f = (st || cur).filters;
    return f.radiusKm != null ? 'r=' + f.radiusKm : 'all';
  }

  /* ================================================================ hash (§D.8) */

  function encFloat(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  function invert(o) { var r = {}; Object.keys(o).forEach(function (k) { r[o[k]] = k; }); return r; }

  /** State → '#v=1&…' with non-default keys only ('' when everything is default). */
  function hash(st) {
    st = st || cur;
    var d = DEFAULT, out = [];
    function push(k, v) { out.push(k + '=' + encodeURIComponent(v).replace(/%2C/g, ',')); }
    if (st.section !== d.section) push('s', st.section);
    if (st.view && st.view !== d.view) push('view', st.view);
    if (st.filters.radiusKm != null) push('r', String(st.filters.radiusKm));
    if (st.camera) {
      var c = st.camera;
      push('cam', [encFloat(c.lon, 5), encFloat(c.lat, 5), encFloat(c.zoom, 2)].join(','));
    }
    if (st.privacy.veil) push('veil', '1');
    var s = st.sme, ds = d.sme;
    if (s.groups.length) push('ug', s.groups.join('.'));
    if (s.bands.length) push('ub', s.bands.join('.'));
    if (s.hexColor !== ds.hexColor) push('uh', SME_HEX[s.hexColor]);
    if (s.layerSet !== ds.layerSet) push('ul', SME_LAYER[s.layerSet]);
    if (s.leadRadius !== ds.leadRadius) push('ur', String(s.leadRadius));
    if (s.leadSites) push('us', '1');
    return out.length ? '#v=1&' + out.join('&') : '';
  }

  /**
   * '#…' → {ok, patch} with the full persisted part (defaults for absent keys).
   * Unknown keys (including the removed sections' keys) and invalid values are dropped
   * silently; v ≠ 1 → {ok:false}. A `cam` with pitch and bearing is read flat.
   */
  function parseHash(str) {
    var s = String(str || '').replace(/^#/, '');
    var d = defaults();
    var patch = { section: d.section, view: d.view, filters: d.filters, privacy: { veil: false }, sme: d.sme, camera: null };
    if (!s) return { ok: true, empty: true, patch: patch };
    var kv = {};
    s.split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('='), k = i < 0 ? pair : pair.slice(0, i), v = i < 0 ? '' : pair.slice(i + 1);
      try { kv[decodeURIComponent(k)] = decodeURIComponent(v); } catch (e) { /* malformed: dropped */ }
    });
    if (has(kv, 'v') && kv.v !== '1') return { ok: false, reason: 'version', patch: null };
    function list(k) { return has(kv, k) && kv[k] !== '' ? kv[k].split('.') : []; }
    if (has(kv, 's') && sectionIds().indexOf(kv.s) >= 0) patch.section = kv.s;
    if (has(kv, 'view') && VIEWS.indexOf(kv.view) >= 0) patch.view = kv.view;
    patch.filters = { radiusKm: has(kv, 'r') ? cleanRadius(kv.r) : null };
    if (has(kv, 'cam')) {
      var c = kv.cam.split(',').map(Number);
      if (c.length === 3 || c.length === 5) patch.camera = cleanCamera({ lon: c[0], lat: c[1], zoom: c[2] });
    }
    patch.privacy.veil = kv.veil === '1';
    var ih = invert(SME_HEX), il = invert(SME_LAYER);
    patch.sme = {
      groups: uniqList(list('ug'), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], function (x) { return /^\d+$/.test(x) ? +x : null; }),
      bands: uniqList(list('ub'), [0, 1, 2, 3], function (x) { return /^\d$/.test(x) ? +x : null; }),
      hexColor: has(ih, kv.uh) ? ih[kv.uh] : d.sme.hexColor,
      layerSet: has(il, kv.ul) ? il[kv.ul] : d.sme.layerSet,
      leadRadius: SME_RADII.indexOf(+kv.ur) >= 0 ? +kv.ur : d.sme.leadRadius,
      leadSites: kv.us === '1'
    };
    return { ok: true, patch: patch };
  }

  var hashCtl = { enabled: false, suspended: false, pending: null, lastWritten: null, listening: false };

  function lastViewKey() { return (MCD.config && MCD.config.storageKeys && MCD.config.storageKeys.lastView) || 'mcd.lastView'; }

  /** V8 M2 (MCD.back, assets/js/backstack.js): the history entry of an open layer keeps its marker when the hash is
      replaced (a camera write while a phone sheet is open); markers carry an id only, never a name or a record. */
  function layerState(hist) {
    var s0 = null;
    try { s0 = hist.state; } catch (e) { s0 = null; }
    return s0 && typeof s0 === 'object' && (s0.mcdLayer || s0.mcdBase || s0.mcdHome) ? s0 : null;
  }
  function writeHash(mode) {
    if (!hashCtl.enabled) return;
    if (hashCtl.suspended) { hashCtl.pending = hashCtl.pending === 'push' ? 'push' : mode; return; }
    var h = hash(cur), loc = W.location, hist = W.history;
    if (!loc || !hist) return;
    var url = loc.pathname + loc.search + h;
    if ((loc.hash || '') === h) return;
    /* V8 M2: a section or view change while a phone layer sits on top of the history replaces that layer's entry
       (MCD.back.release), so Back never returns to a layer that is closed */
    var B = MCD.back;
    if (mode === 'push' && B && typeof B.release === 'function') {
      try { if (B.release()) mode = 'replace-layer'; } catch (e) { /* push as before */ }
    }
    try {
      hashCtl.lastWritten = h;
      if (mode === 'push' && hist.pushState) hist.pushState(null, '', url);
      else if (mode === 'replace-layer' && hist.replaceState) hist.replaceState(null, '', url);
      else if (hist.replaceState) hist.replaceState(layerState(hist), '', url);
    } catch (e) { warn('hash write', e); }
    try { if (MCD.util && MCD.util.storage) MCD.util.storage.set(lastViewKey(), h); } catch (e) { /* storage blocked: in-memory only */ }
  }

  /** Applies a hash string to the state (persisted keys only). Returns the changed keys. */
  function applyHash(str, opts) {
    var r = parseHash(str);
    if (!r.ok || !r.patch) {
      if (r.reason === 'version') warn('hash version mismatch: defaults used');
      return [];
    }
    return set(r.patch, { source: (opts && opts.source) || 'hash', history: 'none' });
  }

  /** Pauses hash writes (e.g. during a camera flight); the last pending write runs on resume. */
  function suspendHash(on) {
    hashCtl.suspended = !!on;
    if (!on && hashCtl.pending) { var m = hashCtl.pending; hashCtl.pending = null; writeHash(m); }
  }

  /**
   * init({hash: true}) — call once inside boot(), after the gate has unlocked.
   * Reads location.hash only (UX fix plan A-10, D14: sessions start clean on Ringkasan; mcd.lastView is still
   * written for "Salin tautan" but never read at boot), and listens to hashchange/popstate. Returns the state.
   */
  function init(opts) {
    opts = opts || {};
    if (opts.hash === false) return cur;
    var loc = W.location, h = loc ? loc.hash : '';
    if (h === '#') h = '';
    if (h) applyHash(h, { source: 'boot' });
    hashCtl.enabled = true;
    if (!hashCtl.listening && W.addEventListener) {
      hashCtl.listening = true;
      var onNav = function (e) {
        /* V8 M2: a layer entry of MCD.back (a phone sheet, Cari, Bantuan, Lainnya, a menu) is not a page */
        if (e && e.type === 'popstate' && e.state && typeof e.state === 'object' && e.state.mcdLayer) return;
        var cur2 = W.location ? W.location.hash : '';
        if (cur2 === hashCtl.lastWritten) return;
        applyHash(cur2, { source: 'hash' });
      };
      W.addEventListener('hashchange', onNav);
      W.addEventListener('popstate', onNav);
    }
    if (loc && h && (loc.hash || '') !== hash(cur)) writeHash('replace');
    return cur;
  }

  function setCamera(cam, opts) { return set({ camera: cam }, { source: (opts && opts.source) || 'map', history: (opts && opts.history) || 'replace' }); }

  MCD.state = {
    get: get, set: set, on: on, off: off, emit: emit, reset: reset, undo: undo, canUndo: canUndo,
    signature: signature, init: init, hash: hash, parseHash: parseHash,
    applyHash: applyHash, suspendHash: suspendHash, setCamera: setCamera,
    defaults: defaults, DEFAULT: DEFAULT,
    enums: { VIEWS: VIEWS, RADII: RADII, LAYER_KEYS: LAYER_KEYS, SME_HEX: Object.keys(SME_HEX), SME_LAYER: Object.keys(SME_LAYER), SME_RADII: SME_RADII }
  };

  /* ===================================================== MCD.data (§F.1, §J.4) */

  // Bank datasets of the sections (Kampus adds none), plus the public map sites. Sections may add more
  // with registerDataset(). `bank: false` marks public reference data (never tagged DEMO).
  var DATASETS = {
    lvm: { types: ['lvm', 'livin_merchant', 'livin_merchants'], label: 'Livin’ Merchant (LVM)', bank: true },
    edc: { types: ['edc', 'edc_mandiri'], label: 'EDC Mandiri', bank: true },
    sekolah: { types: ['sekolah', 'sekolah_nasabah', 'schools'], label: 'Nasabah SMA', bank: true },
    sites: { types: ['situs', 'sites'], label: 'Lokasi tambahan di peta', bank: false, reference: true }
  };
  var demoCache = null;
  /* Demo data (COPY_STYLE_EN product decision 7). demoMode: the bank datasets hold synthetic
     records (loadDemo, tests and MCD.demo). stash: the real datasets set aside by enterDemo(),
     restored by exitDemo(); null when demo data was never switched on in this session. */
  var demoMode = false;
  var stash = null;

  var data = { lvm: [], edc: [], sekolah: [], sites: [], meta: {}, version: 0, asOf: null };
  function emptyMeta() { return { source: 'empty', file: null, sheet: null, rows: 0, asOf: null }; }
  Object.keys(DATASETS).forEach(function (k) { data.meta[k] = emptyMeta(); });

  function bankKeys() { return Object.keys(DATASETS).filter(function (k) { return DATASETS[k].bank !== false; }); }
  function keyFor(type) {
    if (type == null) return null;
    if (has(DATASETS, type)) return type;
    var t = String(type);
    for (var k in DATASETS) if (DATASETS[k].types.indexOf(t) >= 0) return k;
    return null;
  }
  function isoNow() { try { return new Date().toISOString(); } catch (e) { return null; } }
  function cfgAsOf() { return (MCD.config && MCD.config.asOfDemo) || '2026-10-12'; }
  /** Data date: the latest asOf of the bank datasets that hold records. */
  function latestAsOf() {
    var best = null;
    bankKeys().forEach(function (k) {
      var a = data.meta[k] && data.meta[k].asOf;
      if (data[k] && data[k].length && a && (!best || a > best)) best = a;
    });
    return best;
  }
  function referenceSites() { return clone((MCD.ref && MCD.ref.sites) || []); }

  function touch(keys, source) {
    data.version++;
    derive.invalidate();
    emit('data', { types: keys, source: source, version: data.version });
  }

  /**
   * loadDemo(opts) — synthetic demo rows (assets/js/data-synthetic.js, MCD.synth) for every bank
   * dataset that is not imported (unless opts.force). Tests call it directly; the app only through
   * the "Demo data" switch (enterDemo). Public sites stay reference data.
   */
  function loadDemo(opts) {
    opts = opts || {};
    var cfg = MCD.config || {}, seed = opts.seed == null ? cfg.seed : opts.seed, asOf = opts.asOf || cfgAsOf();
    var key = seed + '|' + asOf, t0 = now(), filled = [];
    if (!demoCache || demoCache.key !== key) {
      if (!MCD.synth) throw new Error('MCD.data.loadDemo: data-synthetic.js is not loaded (MCD.demo injects it on demand)');
      demoCache = { key: key, res: MCD.synth.generate(seed, asOf) };
    }
    var res = demoCache.res;
    demoMode = true;
    bankKeys().forEach(function (k) {
      var src = data.meta[k].source, ds = DATASETS[k];
      if (!opts.force && (src === 'import' || src === 'vault')) return;
      var rows = null;
      if (typeof ds.demo === 'function') { try { rows = ds.demo() || []; } catch (e) { warn('demo ' + k, e); rows = []; } }
      else if (Array.isArray(res[k])) rows = clone(res[k]);
      if (!rows) return;
      data[k] = rows;
      data.meta[k] = { source: 'demo', file: null, sheet: null, rows: rows.length, asOf: res.meta.asOf, seed: seed };
      filled.push(k);
    });
    if (data.meta.sites.source !== 'import' && data.meta.sites.source !== 'vault') {
      data.sites = referenceSites();
      data.meta.sites = { source: 'reference', file: null, sheet: null, rows: data.sites.length, asOf: null, reference: true };
    }
    data.asOf = latestAsOf() || res.meta.asOf;
    MCD.debug = MCD.debug || {};
    MCD.debug.timings = MCD.debug.timings || {};
    MCD.debug.timings.generate = Math.round((now() - t0) * 10) / 10;
    touch(filled, 'demo');
    return res.meta;
  }

  /**
   * loadReference() — the shipped app's boot path (real information only): no synthetic
   * records. Fills only the public map sites from MCD.ref (unless imported); every bank
   * dataset stays empty until a vault payload or an import provides it.
   */
  function loadReference() {
    var filled = [];
    demoMode = false;
    if (data.meta.sites.source !== 'import' && data.meta.sites.source !== 'vault') {
      data.sites = referenceSites();
      data.meta.sites = { source: 'reference', file: null, sheet: null, rows: data.sites.length, asOf: null, reference: true };
      filled.push('sites');
    }
    data.asOf = latestAsOf();
    touch(filled, 'reference');
    return summary();
  }
  /** true when no bank dataset (LVM, EDC, school customers, registered ones) holds records. */
  function isEmpty() {
    return bankKeys().every(function (k) { return !data[k] || !data[k].length; });
  }

  /**
   * replace(type, records, meta) — type is a dataset key ('lvm') or importer type ('situs').
   * meta: {source:'import'|'vault', file, sheet, rows, asOf, importedAt, report}.
   */
  function replace(type, records, meta) {
    var k = keyFor(type);
    if (!k) throw new Error('MCD.data.replace: unknown dataset type: ' + type);
    meta = meta || {};
    var list = Array.isArray(records) ? records : [];
    var source = meta.source || (meta.file === 'vault' ? 'vault' : 'import');
    var m = { source: source, file: meta.file || null, sheet: meta.sheet || null, rows: list.length,
      importedAt: meta.importedAt || isoNow(), asOf: meta.asOf || cfgAsOf() };
    if (meta.report) m.summary = meta.report;
    if (stash && source !== 'demo') {
      // Demo data is on: real records never mix with it. They join the set-aside real
      // datasets and appear when demo data is switched off (exitDemo).
      stash.sets[k] = { rows: list, meta: m };
      emit('data', { types: [k], source: 'set-aside', version: data.version, setAside: true });
      return m;
    }
    data[k] = list;
    data.meta[k] = m;
    data.asOf = latestAsOf();
    touch([k], source);
    return data.meta[k];
  }

  /** revert(type): back to empty (the public sites for 'sites'; the demo rows while demo data is on). */
  function revert(type) {
    var k = keyFor(type);
    if (!k) return null;
    var ds = DATASETS[k];
    if (stash) {                                   // demo data is on: the real dataset is the one set aside
      stash.sets[k] = { rows: ds.reference ? referenceSites() : [],
        meta: ds.reference ? { source: 'reference', file: null, sheet: null, rows: 0, asOf: null, reference: true } : emptyMeta() };
      emit('data', { types: [k], source: 'set-aside', version: data.version, setAside: true });
      return stash.sets[k].meta;
    }
    if (ds.reference) {
      data[k] = referenceSites();
      data.meta[k] = { source: 'reference', file: null, sheet: null, rows: data[k].length, asOf: null, reference: true };
    } else if (demoMode && (typeof ds.demo === 'function' || (demoCache && Array.isArray(demoCache.res[k])))) {
      var rows = [];
      try { rows = typeof ds.demo === 'function' ? (ds.demo() || []) : clone(demoCache.res[k]); } catch (e) { rows = []; }
      data[k] = rows;
      data.meta[k] = { source: 'demo', file: null, sheet: null, rows: rows.length, asOf: data.asOf };
    } else {
      data[k] = [];
      data.meta[k] = emptyMeta();
    }
    data.asOf = latestAsOf();
    touch([k], 'revert');
    return data.meta[k];
  }

  /**
   * clearAll(opts) — §K.1 "Remove all data from memory": drops every imported dataset,
   * memo caches, selection and importer buffers, then reloads the public sites (or the demo
   * rows while demo data is on). opts.settings also resets MCD.config settings;
   * opts.lastView removes mcd.lastView; opts.smeTracker removes mcd.sme.* (merchant work state).
   */
  function clearAll(opts) {
    opts = opts || {};
    Object.keys(DATASETS).forEach(function (k) { data[k] = []; data.meta[k] = emptyMeta(); });
    if (stash) stash = { asOf: null, sets: {} };   // demo stays on; the set-aside real data is removed too
    derive.invalidate();
    if (MCD.importer && typeof MCD.importer.reset === 'function') { try { MCD.importer.reset(); } catch (e) { warn('importer reset', e); } }
    set({ selection: null, hover: null }, { source: 'clear', history: 'none' });
    var st = MCD.util && MCD.util.storage;
    if (opts.settings && MCD.config && MCD.config.resetSettings) MCD.config.resetSettings();
    if (st) {
      try {
        if (opts.lastView) st.remove(lastViewKey());
        if (opts.smeTracker) st.keys('mcd.sme.').forEach(function (k) { st.remove(k); });
      } catch (e) { /* storage blocked */ }
    }
    if (demoMode && MCD.synth) loadDemo({ force: true }); else loadReference();
    return summary();
  }

  /**
   * enterDemo() — "Demo data" switch on (COPY_STYLE_EN item 7). Needs MCD.synth (data-synthetic.js,
   * injected on demand by MCD.demo). Every real dataset (vault, import, public sites) is set aside
   * untouched, then the synthetic rows fill the bank datasets. Real and demo records never mix.
   * Emits 'demo' {on:true} after the usual 'data' event.
   */
  function enterDemo(opts) {
    if (stash) return summary();
    if (!MCD.synth) throw new Error('MCD.data.enterDemo: data-synthetic.js is not loaded');
    stash = { asOf: data.asOf, sets: {} };
    Object.keys(DATASETS).forEach(function (k) {
      stash.sets[k] = { rows: data[k], meta: data.meta[k] };
      data[k] = [];
      data.meta[k] = emptyMeta();
    });
    try {
      loadDemo(Object.assign({}, opts || {}, { force: true }));
    } catch (e) {
      exitDemo({ silent: true });
      throw e;
    }
    emit('demo', { on: true, version: data.version });
    return summary();
  }
  /** exitDemo() — switch off: drops the synthetic records and restores the set-aside real datasets. */
  function exitDemo(opts) {
    if (!stash) return summary();
    var keys = Object.keys(DATASETS);
    keys.forEach(function (k) {
      var s = stash.sets[k];
      data[k] = s ? s.rows : [];
      data.meta[k] = s ? s.meta : emptyMeta();
    });
    stash = null;
    demoMode = false;
    data.asOf = latestAsOf();
    touch(keys, 'demo-off');
    if (!opts || !opts.silent) emit('demo', { on: false, version: data.version });
    return summary();
  }
  /** true while the "Demo data" switch has the synthetic datasets in place of the real ones. */
  function demoActive() { return !!stash; }
  /**
   * real() — the real datasets whatever the switch says: {key: {rows, meta}}. While demo data is
   * on these are the set-aside ones; Save encrypted copy and the Data & Privacy status read them.
   */
  function real() {
    var out = {};
    Object.keys(DATASETS).forEach(function (k) {
      var s = stash ? stash.sets[k] : { rows: data[k], meta: data.meta[k] };
      out[k] = { rows: (s && s.rows) || [], meta: (s && s.meta) || emptyMeta() };
    });
    return out;
  }

  function isDemo(type) { var k = keyFor(type); return !!k && data.meta[k].source === 'demo'; }
  /** Per-dataset status for Data & Privacy and the DEMO badge. */
  function summary() {
    return Object.keys(DATASETS).map(function (k) {
      var m = data.meta[k];
      return { key: k, label: DATASETS[k].label, source: m.source, rows: data[k].length, file: m.file, sheet: m.sheet,
        asOf: m.asOf, importedAt: m.importedAt || null, demo: m.source === 'demo', empty: !data[k].length, bank: DATASETS[k].bank !== false };
    });
  }
  /** Sections add datasets: registerDataset('x', {types, label, demo: fn → records, bank}). */
  function registerDataset(key, def) {
    def = def || {};
    if (!key || (has(DATASETS, key) && !def.override)) return false;
    DATASETS[key] = { types: (def.types || []).concat([key]), label: def.label || key, demo: def.demo || null, bank: def.bank !== false };
    if (!has(data, key)) data[key] = [];
    data.meta[key] = data.meta[key] || emptyMeta();
    return true;
  }

  /**
   * setDemo(key, fn) — a demo script gives a dataset its synthetic rows: fn() → records. Applied by
   * the next loadDemo / enterDemo, or at once when demo data is already on. Never used for real data.
   */
  function setDemo(key, fn) {
    var k = keyFor(key);
    if (!k || typeof fn !== 'function') return false;
    DATASETS[k].demo = fn;
    if (demoMode && data.meta[k].source !== 'import' && data.meta[k].source !== 'vault') {
      try { data[k] = fn() || []; } catch (e) { warn('demo ' + k, e); data[k] = []; }
      data.meta[k] = { source: 'demo', file: null, sheet: null, rows: data[k].length, asOf: data.asOf };
      touch([k], 'demo');
    }
    return true;
  }

  data.loadDemo = loadDemo;
  data.setDemo = setDemo;
  data.loadReference = loadReference;
  data.isEmpty = isEmpty;
  data.replace = replace;
  data.revert = revert;
  data.clearAll = clearAll;
  data.isDemo = isDemo;
  data.enterDemo = enterDemo;
  data.exitDemo = exitDemo;
  data.demoActive = demoActive;
  data.real = real;
  data.summary = summary;
  data.keyFor = keyFor;
  data.registerDataset = registerDataset;
  data.bankKeys = bankKeys;
  data.datasets = function () {
    var o = {};
    Object.keys(DATASETS).forEach(function (k) { var d = DATASETS[k]; o[k] = { types: d.types.slice(), label: d.label, bank: d.bank !== false, reference: !!d.reference }; });
    return o;
  };
  data.on = function (fn) { return on('data', fn); };
  MCD.data = data;

  /* ================================================================ MCD.derive */

  var derive = { _memo: [], _coreMemo: [], _hooks: {}, _hookOrder: [], version: 0 };
  derive.invalidate = function () { derive._memo = []; derive._coreMemo = []; };

  // Settings changes (Data & Privacy › Assumptions) re-derive; nothing is read at load time.
  if (MCD.config && typeof MCD.config.onChange === 'function') {
    MCD.config.onChange(function (ev) {
      var keys = (ev && ev.keys) || [];
      if (!keys.length) return;
      derive.version++;
      derive.invalidate();
      emit('data', { types: ['config'], keys: keys, source: 'settings', version: data.version });
    });
  }

  function coreKey(st) {
    return signature(st) + '|v' + (st.privacy && st.privacy.veil ? 1 : 0) + '|d' + data.version + '|e' + derive.version;
  }
  function lruGet(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) { var e = list.splice(i, 1)[0]; list.unshift(e); return e.val; }
    return undefined;
  }
  function lruPut(list, key, val) { list.unshift({ key: key, val: val }); if (list.length > 8) list.length = 8; }
  function computeCore(st) {
    var counts = {}, demo = false;
    Object.keys(DATASETS).forEach(function (k) {
      counts[k] = (data[k] || []).length;
      if (DATASETS[k].bank !== false && data.meta[k].source === 'demo' && counts[k]) demo = true;
    });
    return {
      signature: signature(st), asOf: data.asOf, dataVersion: data.version, radiusKm: st.filters.radiusKm,
      counts: counts, hasBankData: !isEmpty(), demo: demo, ext: {}
    };
  }

  /**
   * compute(state?) → Derived: {signature, asOf, dataVersion, radiusKm, counts, hasBankData, demo, ext}
   * plus every registered hook result under ext[key] (and derived[key] when the name is free).
   * Memoised by signature, veil, data and settings versions (LRU 8); hooks add their own deps key.
   */
  derive.compute = function (st) {
    st = st || cur;
    var t0 = now();
    var ck = coreKey(st), core = lruGet(derive._coreMemo, ck);
    if (!core) { core = computeCore(st); lruPut(derive._coreMemo, ck, core); }
    var hooks = derive._hookOrder.filter(function (k) { var h = derive._hooks[k]; return !h.when || safeWhen(h, st); });
    if (!hooks.length) { timing(t0); return core; }
    var ek = hooks.map(function (k) { var h = derive._hooks[k]; return k + ':' + (h.deps ? safeDeps(h, st) : defaultDeps(st)); }).join('|');
    var full = lruGet(derive._memo, ck + '#' + ek);
    if (full) { timing(t0); return full; }
    full = {};
    Object.keys(core).forEach(function (k) { full[k] = core[k]; });
    full.ext = {};
    hooks.forEach(function (k) {
      var h = derive._hooks[k], hk = ck + '#' + k + ':' + (h.deps ? safeDeps(h, st) : defaultDeps(st));
      var val = h.cache.key === hk ? h.cache.val : undefined;
      if (val === undefined) {
        try { val = h.fn(st, data, core); } catch (e) { warn('derive hook ' + k, e); val = null; }
        h.cache = { key: hk, val: val };
      }
      full.ext[k] = val;
      if (!has(core, k) && RESERVED.indexOf(k) < 0) full[k] = val;     // e.g. Derived.sme
    });
    lruPut(derive._memo, ck + '#' + ek, full);
    timing(t0);
    return full;
  };
  var RESERVED = ['signature', 'asOf', 'dataVersion', 'radiusKm', 'counts', 'hasBankData', 'demo', 'ext'];
  function safeWhen(h, st) { try { return !!h.when(st); } catch (e) { return false; } }
  function safeDeps(h, st) { try { return String(h.deps(st)); } catch (e) { return 'x'; } }
  function defaultDeps(st) { return JSON.stringify([st.section, st.view, st.sme]); }
  function timing(t0) {
    MCD.debug = MCD.debug || {};
    MCD.debug.timings = MCD.debug.timings || {};
    MCD.debug.timings.compute = Math.round((now() - t0) * 10) / 10;
  }

  /**
   * register(key, fn(state, data, coreDerived) → any, opts) → unregister().
   * opts.when(state) → bool (skip when false, e.g. only in the Merchants section);
   * opts.deps(state) → string (extra cache key; default: section, view, sme).
   * Results appear under derived.ext[key] (and derived[key] when the name is free).
   * Area aggregates for the territory map use keys 'area:<section-id>' (COPY_STYLE_EN item 9).
   */
  derive.register = function (key, fn, opts) {
    if (!key || typeof fn !== 'function') return function () {};
    opts = opts || {};
    derive._hooks[key] = { fn: fn, when: opts.when || null, deps: opts.deps || null, cache: {} };
    if (derive._hookOrder.indexOf(key) < 0) derive._hookOrder.push(key);
    derive._memo = [];
    return function () {
      delete derive._hooks[key];
      var i = derive._hookOrder.indexOf(key);
      if (i >= 0) derive._hookOrder.splice(i, 1);
      derive._memo = [];
    };
  };

  MCD.derive = derive;
})(window.MCD = window.MCD || {});
