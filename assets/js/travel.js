/* ==========================================================================
 * MCD.travel: road distance and driving time from KCP Jakarta Cilangkap to any point.
 *
 * Branch decision 16 Oct 2026 (docs/COPY_STYLE_EN.md items 27-28): every merchant and school is
 * pinpointed at its own location with its own "x,x km · ± y menit". The numbers come from
 * data/travel-grid.js (window.MCD_TRAVEL_GRID), built offline by tools/build-travel-grid.py:
 * one shortest-path search from the branch over the OpenStreetMap road network, stored as a
 * 100 m grid. A lookup is a few array reads; nothing is sent over the network, so bank data
 * (LVM merchant locations) never leaves the browser. Method: docs/TRAVEL_GRID.md.
 *
 * PURE: no storage, no network request. The one DOM use is the lazy loader of the OUTER grid (below): it adds a classic
 * <script> tag for a local file (works from file://; CSP script-src 'self' file:). UMD wrapper: MCD.travel in the
 * browser (classic script), module.exports in Node (tests/travel-grid.test.mjs, tests/travel-routes.test.mjs,
 * tests/travel-outer.test.mjs).
 *
 * API
 *   ready() → boolean                 decodes window.MCD_TRAVEL_GRID once (lazy); false if absent
 *   load(grid) → boolean              use another grid object (tests, or a rebuilt grid)
 *   at(lon, lat) → { km, min, minPeak, precision, viaToll, noToll }
 *       km, min      road km and minutes by car, normal traffic. The route uses a toll road only when the toll
 *                    road saves MORE than 1 minute against the route without toll roads, or when the toll route
 *                    is both faster and shorter (v5); otherwise km and min are the toll-free ones (so the car
 *                    value is never slower than noToll, and a near-tie shows the shorter route,
 *                    docs/TRAVEL_GRID.md sections 12 and 13)
 *       minPeak      min × the "jam sibuk" factor
 *       viaToll      true when that route uses a toll road
 *       noToll       { km, min, minPeak } along the fastest route WITHOUT toll roads (motorcycles may not
 *                    use toll roads), or null
 *       precision 'exact-grid'  the point's own 100 m cell has a road within 250 m
 *                 'nearby'      no road near the cell; nearest cell with a value within 500 m,
 *                               plus the extra approach distance
 *                 'none'        outside the grid (about 16 km from the branch) or no road nearby;
 *                               km, min and minPeak are null
 *   format(r, {peak, noToll}) → '4,2 km · ± 14 menit' ('850 m · ± 3 menit', '± 1 jam 5 menit', '—')
 *   sortByTime(points, {lonLat, noToll}) → new array, nearest by driving time first; points without
 *       a value keep their order at the end. A point is [lon, lat, ...] or {lon|lng, lat}.
 *   peakFactor() / setPeakFactor(f)  "jam sibuk" multiplier (editable assumption, default from
 *       meta.peakFactor.default; 1 ≤ f ≤ 3)
 *   meta() → grid meta (sources, speeds, note 'perkiraan, lalu lintas normal', licence ODbL)
 *
 * ROUTE LINES (item 36: the route from the branch drawn "ala Google Maps", offline)
 *   data/travel-routes.js (window.MCD_TRAVEL_ROUTES, about 1.2 MB) holds the shortest-path trees of the SAME
 *   searches that gave the grid (normal, and without toll roads). This file never loads it: the UI injects it
 *   the first time a route is shown (MCD.app.lazy('travel-routes')), then calls routesReady().
 *   routesReady() → boolean           decodes window.MCD_TRAVEL_ROUTES once (lazy); false if absent or invalid
 *   loadRoutes(obj) → boolean         use another routes object (tests); kept even when the global exists
 *   route(lon, lat, {noToll}) → { coords, connector, km, min, minPeak, viaToll, precision, noToll } | null
 *       coords     [[lon, lat], ...] from the branch pin (inside the Mabes TNI compound, out through its gate)
 *                  along the roads to the road point the minutes were measured to
 *       connector  [[lon, lat] of that road point, [lon, lat] asked]: the last stretch, to draw dashed
 *       km, min, minPeak, precision   exactly as at() (or at().noToll with {noToll: true}), so label and list agree
 *       viaToll    the line uses a toll road (equals at().viaToll; always false with {noToll: true})
 *   A cell whose car value is its toll-free value (listed in MCD_TRAVEL_ROUTES.carNoToll) draws its toll-free line
 *   for the car as well, so line and minutes still agree.
 *       null       routes not loaded, routes built from another grid, or no value at the point (precision 'none')
 *
 * OUTER GRID, 15-31 km (v6, 18 Oct 2026, COPY_STYLE_EN item 45: schools and campuses to 30 km; docs/TRAVEL_GRID.md §14)
 *   data/travel-grid-outer.js (window.MCD_TRAVEL_GRID_OUTER, 200 m cells) and data/travel-routes-outer.js
 *   (window.MCD_TRAVEL_ROUTES_OUTER): the same origin, road rules, speeds, toll choice and jam sibuk factor as the inner
 *   files, from one search per profile over roads to ±32,5 km. Inside the inner grid's box at() and route() answer
 *   from the inner grid exactly as before; beyond it, from the outer grid. Neither outer file is in index.html: the
 *   first at() beyond the inner box (within about 32 km) injects the grid file, the first route() there the routes
 *   file (only after sign-in when MCD.app exists; never in Node). While the grid loads, at() returns
 *   {precision: 'none', pending: true, ...} so the UI can show "Menghitung jarak…"; then onOuter() listeners run.
 *   Outer answers carry grid: 'outer'. Inner answers are unchanged.
 *   at(lon, lat, {grid: 'inner' | 'outer'}) / route(lon, lat, {grid, noToll})   force one grid (tests, seam checks)
 *   gridFor(lon, lat) → 'inner' | 'outer' | null    which grid answers the point (null: beyond both)
 *   outerState() → {grid, routes, files}            each 'idle' | 'loading' | 'ready' | 'error' | 'unavailable'
 *   onOuter(fn) → off                               fn(outerState()) after each change (loaded, failed)
 *   loadOuter() / loadOuterRoutes() → Promise<boolean>   load now (shared, never rejects; false: cannot load here)
 *   outerReady() / outerRoutesReady() → boolean     decode the globals once when present
 *   useOuter(grid) / useOuterRoutes(obj) → boolean  use these objects (tests)
 *   outerMeta() → outer grid meta (sources, ring, seam check), or null
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.travel = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var NULL16 = 65535;
  var NEAR_CELLS = 5;            // 'nearby' search radius in cells (500 m at 100 m cells)
  var NONE = Object.freeze({ km: null, min: null, minPeak: null, precision: 'none', viaToll: false, noToll: null });
  // beyond the inner grid while the outer grid loads: no value yet, the UI may say "Menghitung jarak…"
  var PENDING = Object.freeze({ km: null, min: null, minPeak: null, precision: 'none', viaToll: false, noToll: null, pending: true });
  var OUTER_FILES = { grid: 'data/travel-grid-outer.js', routes: 'data/travel-routes-outer.js' };
  var OUTER_REACH_KM = 32;       // the outer grid answers to 31,15 km (+ 500 m 'nearby'): never load it for points further
  var LOAD_TIMEOUT_MS = 30000;

  var G = null;                  // decoded grid
  var source = null;             // the grid object G was decoded from
  var explicit = false;          // true when load() was called directly: keep that grid
  var userPeak = null;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }

  /* ------------------------------------------------------------ decoding */

  function bytesOf(b64) {
    if (typeof b64 !== 'string') return null;
    var atobFn = (typeof atob === 'function') ? atob : (root && typeof root.atob === 'function' ? root.atob : null);
    try {
      if (atobFn) {
        var bin = atobFn(b64);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
    } catch (e) { /* not base64 */ }
    return null;
  }

  var LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

  function u16(b64, n) {
    var b = bytesOf(b64);
    if (!b || b.length !== n * 2) return null;
    if (LITTLE) return new Uint16Array(b.buffer, b.byteOffset, n);   // fresh buffer, offset 0
    var out = new Uint16Array(n);
    for (var i = 0; i < n; i++) out[i] = b[2 * i] | (b[2 * i + 1] << 8);
    return out;
  }

  /** Use a grid object ({meta, cols, rows, minutes, km, toll?, minutesNoToll?, kmNoToll?}). True when it
   *  decodes. A grid passed here is kept even when window.MCD_TRAVEL_GRID exists. */
  function load(grid) {
    explicit = true;
    return decode(grid);
  }

  /** A decoded grid object, or null. outer: the outer grid ('nearby' radius meta.nearM metres; answers carry
   *  grid: 'outer'). The inner grid keeps its rule: NEAR_CELLS cells. */
  function decodeGrid(grid, outer) {
    if (!grid || !grid.meta || !isNum(grid.cols) || !isNum(grid.rows)) return null;
    var bb = grid.meta.bbox;
    if (!bb || bb.length !== 4 || !(bb[2] > bb[0]) || !(bb[3] > bb[1])) return null;
    var n = grid.cols * grid.rows;
    var mins = u16(grid.minutes, n);
    var kms = u16(grid.km, n);
    if (!mins || !kms) return null;
    var toll = grid.toll ? bytesOf(grid.toll) : null;
    if (toll && toll.length < Math.ceil(n / 8)) toll = null;
    var nmin = grid.minutesNoToll ? u16(grid.minutesNoToll, n) : null;
    var nkm = grid.kmNoToll ? u16(grid.kmNoToll, n) : null;
    if (!nmin || !nkm) { nmin = null; nkm = null; }
    var midLat = (bb[1] + bb[3]) / 2 * Math.PI / 180;
    var mLat = 111132.954 - 559.822 * Math.cos(2 * midLat) + 1.175 * Math.cos(4 * midLat);
    var mLon = 111412.84 * Math.cos(midLat) - 93.5 * Math.cos(3 * midLat) + 0.118 * Math.cos(5 * midLat);
    var ap = grid.meta.approach || {};
    var g = {
      meta: grid.meta, cols: grid.cols, rows: grid.rows,
      w: bb[0], s: bb[1], e: bb[2], n: bb[3],
      cw: (bb[2] - bb[0]) * mLon / grid.cols,        // cell width in metres
      ch: (bb[3] - bb[1]) * mLat / grid.rows,        // cell height in metres
      min: mins, km: kms, toll: toll, nmin: nmin, nkm: nkm,
      detour: isNum(ap.detour) ? ap.detour : 1.3,
      apKmh: isNum(ap.kmh) && ap.kmh > 0 ? ap.kmh : 6,
      outer: !!outer
    };
    if (outer) {
      var nearM = isNum(grid.meta.nearM) && grid.meta.nearM > 0 ? grid.meta.nearM : 500;
      g.nearCells = Math.ceil(nearM / Math.min(g.cw, g.ch));
      g.lim = nearM + 1e-6;
    } else {
      g.nearCells = NEAR_CELLS;
      g.lim = NEAR_CELLS * Math.min(g.cw, g.ch) + 1e-6;
    }
    return g;
  }

  function decode(grid) {
    G = null; source = null;
    var g = decodeGrid(grid, false);
    if (!g) return false;
    G = g;
    source = grid;
    return true;
  }

  function ready() {
    var g = root && root.MCD_TRAVEL_GRID;
    if (G && (explicit || !g || g === source)) return true;
    if (!g) return false;
    explicit = false;
    return decode(g);
  }

  function meta() { return ready() ? G.meta : null; }

  /* ------------------------------------------------------------ lookup */

  function peakFactor() {
    if (isNum(userPeak)) return userPeak;
    var pf = G && G.meta.peakFactor;
    return pf && isNum(pf.default) ? pf.default : 1.3;
  }

  function setPeakFactor(f) {
    if (f == null) { userPeak = null; return true; }
    f = Number(f);
    if (!isNum(f) || f < 1 || f > 3) return false;
    userPeak = f;
    return true;
  }

  function result(g, i, extraM, precision) {
    var aKm = extraM > 0 ? extraM * g.detour / 1000 : 0;          // extra approach for 'nearby'
    var aMin = aKm * 1000 / (g.apKmh * 1000 / 60);
    var pf = peakFactor();
    var m = g.min[i] / 10 + aMin, k = g.km[i] / 100 + aKm;
    var viaToll = !!(g.toll && (g.toll[i >> 3] >> (i & 7)) & 1);
    var noToll = null;
    if (g.nmin && g.nmin[i] !== NULL16 && g.nkm[i] !== NULL16) {
      var nm = g.nmin[i] / 10 + aMin;
      noToll = { km: g.nkm[i] / 100 + aKm, min: nm, minPeak: nm * pf };
    }
    var r = { km: k, min: m, minPeak: m * pf, precision: precision, viaToll: viaToll, noToll: noToll };
    if (g.outer) r.grid = 'outer';
    return r;
  }

  /** True when (lon, lat) lies in grid g's box (the cell arithmetic of locate). */
  function inBox(g, lon, lat) {
    var c = Math.floor((lon - g.w) / (g.e - g.w) * g.cols);
    var r = Math.floor((g.n - lat) / (g.n - g.s) * g.rows);
    return c >= 0 && c < g.cols && r >= 0 && r < g.rows;
  }

  /** The cell of grid g that answers for (lon, lat): {i, d (extra approach metres), precision}, or null. Shared by
   *  at() and route(), so a route always ends where the minutes were measured. */
  function locate(g, lon, lat) {
    var c = Math.floor((lon - g.w) / (g.e - g.w) * g.cols);
    var r = Math.floor((g.n - lat) / (g.n - g.s) * g.rows);
    if (c < 0 || c >= g.cols || r < 0 || r >= g.rows) return null;
    var i = r * g.cols + c;
    if (g.min[i] !== NULL16 && g.km[i] !== NULL16) return { i: i, d: 0, precision: 'exact-grid' };
    var best = -1, bestD = Infinity, lim = g.lim, K = g.nearCells;
    for (var dr = -K; dr <= K; dr++) {
      var r2 = r + dr;
      if (r2 < 0 || r2 >= g.rows) continue;
      for (var dc = -K; dc <= K; dc++) {
        var c2 = c + dc;
        if (c2 < 0 || c2 >= g.cols) continue;
        var j = r2 * g.cols + c2;
        if (g.min[j] === NULL16 || g.km[j] === NULL16) continue;
        var d = Math.sqrt(dc * g.cw * dc * g.cw + dr * g.ch * dr * g.ch);
        if (d <= lim && d < bestD) { bestD = d; best = j; }
      }
    }
    return best < 0 ? null : { i: best, d: bestD, precision: 'nearby' };
  }

  /** Straight-line km from the inner grid's origin (the branch), for the outer reach check. */
  function crowKm(lon, lat) {
    var o = (G && G.meta && G.meta.origin) || {};
    var lon0 = isNum(o.lon) ? o.lon : 106.90989, lat0 = isNum(o.lat) ? o.lat : -6.33203;
    var R = 6371.0088, rad = Math.PI / 180, dp = (lat - lat0) * rad, dl = (lon - lon0) * rad;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(lat0 * rad) * Math.cos(lat * rad) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** 'inner' when the inner grid answers (lon, lat), 'outer' beyond its box within the outer grid's reach, else null. */
  function gridFor(lon, lat) {
    if (!isNum(lon) || !isNum(lat) || !ready()) return null;
    if (inBox(G, lon, lat)) return 'inner';
    if (GO && outerReady()) return inBox(GO, lon, lat) ? 'outer' : null;
    return crowKm(lon, lat) <= OUTER_REACH_KM ? 'outer' : null;
  }

  /** Distance and time from the branch to (lon, lat). O(1): one cell, or at most 11 × 11 cells. Inside the inner
   *  grid's box: the inner grid, exactly as before. Beyond it: the outer grid (loaded on first use; PENDING meanwhile).
   *  opts.grid 'inner' | 'outer' forces one grid. */
  function at(lon, lat, opts) {
    if (!isNum(lon) || !isNum(lat)) return NONE;
    var want = opts && opts.grid;
    if (want !== 'outer') {
      if (!ready()) return NONE;
      if (want === 'inner' || inBox(G, lon, lat)) {
        var L = locate(G, lon, lat);
        return L ? result(G, L.i, L.d, L.precision) : NONE;
      }
    }
    if (!outerReady()) {
      if (want !== 'outer' && crowKm(lon, lat) > OUTER_REACH_KM) return NONE;
      if (ostate.grid === 'idle' && canLoad()) loadOuter();
      return ostate.grid === 'loading' ? PENDING : NONE;
    }
    var L2 = locate(GO, lon, lat);
    return L2 ? result(GO, L2.i, L2.d, L2.precision) : NONE;
  }

  /* ------------------------------------------------------------ outer grid (v6): state and lazy loading */

  var GO = null;                 // decoded outer grid
  var osource = null;            // the outer grid object GO was decoded from
  var oexplicit = false;         // useOuter() was called: keep that grid
  var ostate = { grid: 'idle', routes: 'idle' };
  var opending = { grid: null, routes: null };
  var olisteners = [];

  function outerReady() {
    var o = root && root.MCD_TRAVEL_GRID_OUTER;
    if (GO && (oexplicit || !o || o === osource)) return true;
    if (!o) return false;
    oexplicit = false;
    GO = decodeGrid(o, true);
    osource = GO ? o : null;
    if (GO) setState('grid', 'ready');
    return !!GO;
  }

  /** Use this outer grid object (tests). True when it decodes. */
  function useOuter(grid) {
    oexplicit = true;
    GO = decodeGrid(grid, true);
    osource = GO ? grid : null;
    setState('grid', GO ? 'ready' : 'error');
    return !!GO;
  }

  function outerMeta() { return outerReady() ? GO.meta : null; }

  function outerState() {
    return { grid: GO ? 'ready' : ostate.grid, routes: RTO ? 'ready' : ostate.routes,
      files: { grid: OUTER_FILES.grid, routes: OUTER_FILES.routes } };
  }

  function setState(k, v) {
    if (ostate[k] === v) return;
    ostate[k] = v;
    var st = outerState();
    for (var i = 0; i < olisteners.length; i++) {
      try { olisteners[i](st); } catch (e) { /* one broken listener never stops the others */ }
    }
  }

  /** onOuter(fn): fn(outerState()) after each change of the outer grid or routes state; returns off(). */
  function onOuter(fn) {
    if (typeof fn !== 'function') return function () {};
    olisteners.push(fn);
    return function () { var i = olisteners.indexOf(fn); if (i >= 0) olisteners.splice(i, 1); };
  }

  /** A page can load the outer files: a document, Promise, and (when the shell exists) after sign-in. */
  function canLoad() {
    var d = root && root.document;
    if (!d || typeof d.createElement !== 'function' || typeof Promise !== 'function') return false;
    var app = root.MCD && root.MCD.app;
    if (app && typeof app.isBooted === 'function') {
      try { return !!app.isBooted(); } catch (e) { return false; }
    }
    return true;
  }

  /** Adds a classic <script> for a local file once; resolves when present() holds after it ran. */
  function inject(src, present) {
    return new Promise(function (resolve, reject) {
      if (present()) { resolve(); return; }
      var d = root.document, s = null, done = false, timer = null;
      function finish(err) {
        if (done) return;
        done = true;
        if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
        if (err) {
          try { if (s && s.parentNode) s.parentNode.removeChild(s); } catch (e) { /* already gone */ }
          reject(err);
        } else resolve();
      }
      try {
        s = d.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = function () { finish(present() ? null : new Error('not usable: ' + src)); };
        s.onerror = function () { finish(new Error('could not load ' + src)); };
        (d.head || d.body || d.documentElement).appendChild(s);
      } catch (e) { finish(e); return; }
      if (typeof setTimeout === 'function') {
        timer = setTimeout(function () { finish(new Error('timeout ' + src)); }, LOAD_TIMEOUT_MS);
        if (timer && typeof timer.unref === 'function') timer.unref();   // Node: never keep a test run alive
      }
    });
  }

  /** Loads data/travel-grid-outer.js once (shared promise); true when the outer grid is ready. Never rejects. A failed
   *  load may be tried again by the next explicit call; at() itself only starts a load from the 'idle' state. */
  function loadOuter() {
    if (outerReady()) return Promise.resolve(true);
    if (opending.grid) return opending.grid;
    if (!canLoad()) return Promise.resolve(false);
    setState('grid', 'loading');
    var p = inject(OUTER_FILES.grid, function () { return !!(root && root.MCD_TRAVEL_GRID_OUTER); }).then(function () {
      var ok = outerReady();
      opending.grid = null;
      setState('grid', ok ? 'ready' : 'error');
      return ok;
    }, function () {
      opending.grid = null;
      setState('grid', 'error');
      return false;
    });
    opending.grid = p;
    return p;
  }

  /** Loads the outer grid and data/travel-routes-outer.js once; true when outer routes can be drawn. Never rejects. */
  function loadOuterRoutes() {
    if (outerReady() && outerRoutesReady()) return Promise.resolve(true);
    if (opending.routes) return opending.routes;
    if (!canLoad()) return Promise.resolve(false);
    var p = loadOuter().then(function (ok) {
      if (!ok) return false;
      if (outerRoutesReady()) return true;
      setState('routes', 'loading');
      return inject(OUTER_FILES.routes, function () { return !!(root && root.MCD_TRAVEL_ROUTES_OUTER); })
        .then(function () { return outerRoutesReady(); }, function () { return false; });
    }).then(function (ok) {
      opending.routes = null;
      setState('routes', ok ? 'ready' : 'error');
      return ok;
    }, function () {
      opending.routes = null;
      setState('routes', 'error');
      return false;
    });
    opending.routes = p;
    return p;
  }

  /* ------------------------------------------------------------ route lines (item 36) */

  var RT = null;                 // decoded routes
  var rsource = null;            // the routes object RT was decoded from
  var rexplicit = false;         // true when loadRoutes() was called directly: keep those routes
  var rmatch = null;             // cached grid fingerprint check {grid, routes, ok}

  /** Unsigned LEB128 varints over a base64 stream (data/travel-routes.js, meta.encoding). */
  function Varints(b64) {
    this.b = bytesOf(b64);
    if (!this.b) throw new Error('routes: not base64');
    this.p = 0;
  }
  Varints.prototype.u = function () {
    var b = this.b, v = 0, m = 1, c;
    do {
      if (this.p >= b.length) throw new Error('routes: stream ends early');
      c = b[this.p++];
      v += (c & 127) * m;
      m *= 128;
    } while (c & 128);
    return v;
  };
  Varints.prototype.end = function () { return this.p >= this.b.length; };

  function unzz(v) { return v % 2 ? -(v + 1) / 2 : v / 2; }

  /** Chains in DFS preorder (meta.encoding.tree): fills X, Y, P from index `next`; returns the next free index. */
  function readChains(r, stack, X, Y, P, next, limit) {
    while (stack.length) {
      var top = stack[stack.length - 1], parent = top[0];
      if (--top[1] === 0) stack.pop();
      var h = r.u(), n = Math.floor(h / 4), k = h % 4;
      if (k === 3) k += r.u();
      if (n < 1 || next + n > limit || parent < 0 || parent >= next) throw new Error('routes: bad chain');
      var px = X[parent], py = Y[parent], prev = parent;
      for (var j = 0; j < n; j++) {
        px += unzz(r.u()); py += unzz(r.u());
        X[next] = px; Y[next] = py; P[next] = prev;
        prev = next++;
      }
      if (k > 0) stack.push([prev, k]);
    }
    return next;
  }

  /** A decoded routes object ({meta, cols, rows, points, tree, toll, cells, noToll}), or null. Pure. */
  function decodeRoutesObj(obj) {
    if (!obj || !obj.meta || !obj.meta.origin || !obj.noToll || !isNum(obj.points) || !isNum(obj.noToll.points) ||
        !isNum(obj.cols) || !isNum(obj.rows)) return null;
    try {
      var N = obj.points, T = N + obj.noToll.points, ncell = obj.cols * obj.rows, c, v, r;
      var X = new Int32Array(T), Y = new Int32Array(T), P = new Int32Array(T);
      P[0] = -1;
      r = new Varints(obj.tree);
      if (readChains(r, [[0, r.u()]], X, Y, P, 1, N) !== N || !r.end()) return null;
      var toll = new Uint8Array(N), at_ = 0;
      r = new Varints(obj.toll || '');
      while (!r.end()) {
        at_ += r.u();
        var len = r.u();
        if (at_ + len > N) return null;
        for (var t = at_; t < at_ + len; t++) toll[t] = 1;
        at_ += len;
      }
      var cells = new Int32Array(ncell), prev = 0;
      r = new Varints(obj.cells);
      for (c = 0; c < ncell; c++) {
        v = r.u();
        if (v) { prev += unzz(v - 1); if (prev < 0 || prev >= N) return null; cells[c] = prev; } else cells[c] = -1;
      }
      if (!r.end()) return null;
      r = new Varints(obj.noToll.tree);
      var next = N, pp = 0, groups = r.u();
      for (var g = 0; g < groups; g++) {
        pp += r.u();
        if (pp >= N) return null;
        next = readChains(r, [[pp, r.u()]], X, Y, P, next, T);
      }
      if (next !== T || !r.end()) return null;
      var PT = new Int32Array(P), i = 0;
      r = new Varints(obj.noToll.reparent);
      while (!r.end()) {
        i += r.u();
        var np = i + unzz(r.u());
        if (i >= N || np < 0 || np >= T) return null;
        PT[i] = np;
      }
      var ntc = new Int32Array(cells);
      r = new Varints(obj.noToll.cells);
      c = -1;
      while (!r.end()) {
        c += r.u() + 1;
        v = r.u();
        if (c >= ncell) return null;
        ntc[c] = v === 0 ? -1 : Math.max(cells[c], 0) + unzz(v - 1);
        if (ntc[c] >= T || ntc[c] < -1) return null;
      }
      // cells whose car route is the toll-free one (the toll road saves at most 1 minute there and is not both
      // faster and shorter): 0 in 'cells'
      var carNt = null;
      if (obj.carNoToll) {
        carNt = new Uint8Array(ncell);
        r = new Varints(obj.carNoToll);
        c = -1;
        while (!r.end()) {
          c += r.u() + 1;
          if (c >= ncell || cells[c] !== -1 || ntc[c] < 0) return null;
          carNt[c] = 1;
        }
      }
      var q = obj.meta.quantumDeg > 0 ? Math.round(1 / obj.meta.quantumDeg) : 100000;
      return {
        meta: obj.meta, N: N, T: T, X: X, Y: Y, P: P, PT: PT, toll: toll, cells: cells, ntCells: ntc, carNt: carNt, q: q,
        ox: Math.round(obj.meta.origin.lon * q), oy: Math.round(obj.meta.origin.lat * q)
      };
    } catch (e) {
      return null;
    }
  }

  function decodeRoutes(obj) {
    RT = null; rsource = null; rmatch = null;
    var rt = decodeRoutesObj(obj);
    if (!rt) return false;
    RT = rt;
    rsource = obj;
    return true;
  }

  /** Use a routes object ({meta, cols, rows, points, tree, toll, cells, noToll}). True when it decodes. */
  function loadRoutes(obj) {
    rexplicit = true;
    return decodeRoutes(obj);
  }

  /** Decodes window.MCD_TRAVEL_ROUTES once (about 1.2 MB, lazy-loaded by the UI). */
  function routesReady() {
    var o = root && root.MCD_TRAVEL_ROUTES;
    if (RT && (rexplicit || !o || o === rsource)) return true;
    if (!o) return false;
    rexplicit = false;
    return decodeRoutes(o);
  }

  /* outer routes (v6): data/travel-routes-outer.js, the trees of the outer grid's searches */
  var RTO = null, rosource = null, roexplicit = false, romatch = null;

  function outerRoutesReady() {
    var o = root && root.MCD_TRAVEL_ROUTES_OUTER;
    if (RTO && (roexplicit || !o || o === rosource)) return true;
    if (!o) return false;
    roexplicit = false;
    romatch = null;
    RTO = decodeRoutesObj(o);
    rosource = RTO ? o : null;
    if (RTO) setState('routes', 'ready');
    return !!RTO;
  }

  /** Use this outer routes object (tests). True when it decodes. */
  function useOuterRoutes(obj) {
    roexplicit = true;
    romatch = null;
    RTO = decodeRoutesObj(obj);
    rosource = RTO ? obj : null;
    setState('routes', RTO ? 'ready' : 'error');
    return !!RTO;
  }

  /** FNV-1a 32 over the characters of the strings (the grid fingerprint in routes meta.grid.hash). */
  function fnv1a() {
    var h = 0x811c9dc5;
    for (var a = 0; a < arguments.length; a++) {
      var s = String(arguments[a] == null ? '' : arguments[a]);
      for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  /** The routes rt were built with grid g (decoded from gsrc): same cells, same minutes; otherwise no line is drawn. */
  function routesMatch(g, gsrc, rt) {
    var gm = rt.meta.grid || {};
    return gm.cols === g.cols && gm.rows === g.rows && (!gm.hash || gm.hash === fnv1a(gsrc.minutes, gsrc.minutesNoToll));
  }

  /** The inner routes were built with the inner grid in use (cached per pair). */
  function routesMatchGrid() {
    if (rmatch && rmatch.grid === source && rmatch.routes === rsource) return rmatch.ok;
    var ok = routesMatch(G, source, RT);
    rmatch = { grid: source, routes: rsource, ok: ok };
    return ok;
  }

  function outerRoutesMatchGrid() {
    if (romatch && romatch.grid === osource && romatch.routes === rosource) return romatch.ok;
    var ok = routesMatch(GO, osource, RTO);
    romatch = { grid: osource, routes: rosource, ok: ok };
    return ok;
  }

  /** The driving route from the branch to (lon, lat), from the same search as at(). opts.noToll: without toll
   *  roads (motorcycles). Null when the routes are not loaded or the point has no value. Beyond the inner grid's box
   *  the outer routes answer (loaded on first use; null until then). opts.grid 'inner' | 'outer' forces one grid. */
  function route(lon, lat, opts) {
    if (!isNum(lon) || !isNum(lat)) return null;
    var want = opts && opts.grid;
    if (want !== 'outer') {
      if (!ready()) return null;
      if (want === 'inner' || inBox(G, lon, lat)) {
        if (!routesReady() || !routesMatchGrid()) return null;
        return routeOn(G, RT, lon, lat, opts);
      }
    }
    if (!outerReady() || !outerRoutesReady() || !outerRoutesMatchGrid()) {
      if (ostate.routes === 'idle' && canLoad() && (want === 'outer' || crowKm(lon, lat) <= OUTER_REACH_KM)) loadOuterRoutes();
      return null;
    }
    return routeOn(GO, RTO, lon, lat, opts);
  }

  function routeOn(g, rt, lon, lat, opts) {
    var L = locate(g, lon, lat);
    if (!L) return null;
    var r = result(g, L.i, L.d, L.precision);
    var noToll = !!(opts && opts.noToll);
    var v = noToll ? r.noToll : r;
    if (!v || !isNum(v.km) || !isNum(v.min)) return null;
    var useNt = noToll || !!(rt.carNt && rt.carNt[L.i]);     // the car takes the toll-free route in this cell
    var a = (useNt ? rt.ntCells : rt.cells)[L.i];
    if (!(a >= 0)) return null;
    var par = useNt ? rt.PT : rt.P;
    var ids = [], guard = rt.T, viaToll = false;
    for (var i = a; i >= 0; i = par[i]) {
      if (guard-- < 0) return null;            // corrupt data: never loop
      ids.push(i);
      if (i < rt.N && rt.toll[i]) viaToll = true;
    }
    if (ids[ids.length - 1] !== 0) return null;
    var n = ids.length, coords = new Array(n);
    for (var j = 0; j < n; j++) {
      var k = ids[n - 1 - j];
      coords[j] = [(rt.ox + rt.X[k]) / rt.q, (rt.oy + rt.Y[k]) / rt.q];
    }
    var end = coords[n - 1];
    var out = {
      coords: coords, connector: [[end[0], end[1]], [lon, lat]],
      km: v.km, min: v.min, minPeak: v.minPeak, viaToll: viaToll, precision: r.precision, noToll: noToll
    };
    if (g.outer) out.grid = 'outer';
    return out;
  }

  /* ------------------------------------------------------------ text (Bahasa Indonesia) */

  function dec1(x) { return x.toFixed(1).replace('.', ','); }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function kmText(k) {
    if (k < 1) {
      var m = k < 0.1 ? Math.round(k * 1000) : Math.round(k * 100) * 10;
      if (m < 1000) return m + ' m';
    }
    var s = dec1(k);
    var p = s.split(',');
    return thousands(p[0]) + ',' + p[1] + ' km';
  }

  function minText(m) {
    var t = Math.max(1, Math.round(m));
    if (t < 60) return '± ' + t + ' menit';
    var h = Math.floor(t / 60), r = t % 60;
    return '± ' + h + ' jam' + (r ? ' ' + r + ' menit' : '');
  }

  /** '4,2 km · ± 14 menit'. opts.peak uses the "jam sibuk" time; opts.noToll the route without
   *  toll roads. '—' when there is no value. */
  function format(r, opts) {
    if (r && opts && opts.noToll) r = r.noToll;
    if (!r || !isNum(r.km) || !isNum(r.min)) return '—';
    var m = opts && opts.peak && isNum(r.minPeak) ? r.minPeak : r.min;
    return kmText(r.km) + ' · ' + minText(m);
  }

  /* ------------------------------------------------------------ sorting */

  function lonLatOf(p) {
    if (!p) return null;
    if (Array.isArray(p) || (typeof p.length === 'number' && typeof p !== 'string')) return [p[0], p[1]];
    var lon = isNum(p.lon) ? p.lon : p.lng;
    return [lon, p.lat];
  }

  /** New array of the same points, nearest by driving time first (ties: shorter km, then input order). */
  function sortByTime(points, opts) {
    if (!points || typeof points.length !== 'number') return [];
    var get = opts && typeof opts.lonLat === 'function' ? opts.lonLat : lonLatOf;
    var noToll = !!(opts && opts.noToll);
    var dec = new Array(points.length);
    for (var i = 0; i < points.length; i++) {
      var ll = get(points[i]);
      var r = ll ? at(ll[0], ll[1]) : NONE;
      if (noToll) r = r.noToll || NONE;
      dec[i] = { p: points[i], i: i, m: isNum(r.min) ? r.min : Infinity, k: isNum(r.km) ? r.km : Infinity };
    }
    dec.sort(function (a, b) { return (a.m - b.m) || (a.k - b.k) || (a.i - b.i); });
    return dec.map(function (d) { return d.p; });
  }

  return {
    ready: ready, load: load, meta: meta, at: at, format: format, sortByTime: sortByTime,
    peakFactor: function () { ready(); return peakFactor(); }, setPeakFactor: setPeakFactor,
    route: route, routesReady: routesReady, loadRoutes: loadRoutes,
    gridFor: gridFor, outerState: outerState, onOuter: onOuter, loadOuter: loadOuter, loadOuterRoutes: loadOuterRoutes,
    outerReady: outerReady, outerRoutesReady: outerRoutesReady, useOuter: useOuter, useOuterRoutes: useOuterRoutes,
    outerMeta: outerMeta
  };
});
