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
 * PURE: no DOM, no storage, no network. UMD wrapper: MCD.travel in the browser (classic script),
 * module.exports in Node (tests/travel-grid.test.mjs, tests/travel-routes.test.mjs).
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

  function decode(grid) {
    G = null; source = null;
    if (!grid || !grid.meta || !isNum(grid.cols) || !isNum(grid.rows)) return false;
    var bb = grid.meta.bbox;
    if (!bb || bb.length !== 4 || !(bb[2] > bb[0]) || !(bb[3] > bb[1])) return false;
    var n = grid.cols * grid.rows;
    var mins = u16(grid.minutes, n);
    var kms = u16(grid.km, n);
    if (!mins || !kms) return false;
    var toll = grid.toll ? bytesOf(grid.toll) : null;
    if (toll && toll.length < Math.ceil(n / 8)) toll = null;
    var nmin = grid.minutesNoToll ? u16(grid.minutesNoToll, n) : null;
    var nkm = grid.kmNoToll ? u16(grid.kmNoToll, n) : null;
    if (!nmin || !nkm) { nmin = null; nkm = null; }
    var midLat = (bb[1] + bb[3]) / 2 * Math.PI / 180;
    var mLat = 111132.954 - 559.822 * Math.cos(2 * midLat) + 1.175 * Math.cos(4 * midLat);
    var mLon = 111412.84 * Math.cos(midLat) - 93.5 * Math.cos(3 * midLat) + 0.118 * Math.cos(5 * midLat);
    var ap = grid.meta.approach || {};
    G = {
      meta: grid.meta, cols: grid.cols, rows: grid.rows,
      w: bb[0], s: bb[1], e: bb[2], n: bb[3],
      cw: (bb[2] - bb[0]) * mLon / grid.cols,        // cell width in metres
      ch: (bb[3] - bb[1]) * mLat / grid.rows,        // cell height in metres
      min: mins, km: kms, toll: toll, nmin: nmin, nkm: nkm,
      detour: isNum(ap.detour) ? ap.detour : 1.3,
      apKmh: isNum(ap.kmh) && ap.kmh > 0 ? ap.kmh : 6
    };
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

  function result(i, extraM, precision) {
    var aKm = extraM > 0 ? extraM * G.detour / 1000 : 0;          // extra approach for 'nearby'
    var aMin = aKm * 1000 / (G.apKmh * 1000 / 60);
    var pf = peakFactor();
    var m = G.min[i] / 10 + aMin, k = G.km[i] / 100 + aKm;
    var viaToll = !!(G.toll && (G.toll[i >> 3] >> (i & 7)) & 1);
    var noToll = null;
    if (G.nmin && G.nmin[i] !== NULL16 && G.nkm[i] !== NULL16) {
      var nm = G.nmin[i] / 10 + aMin;
      noToll = { km: G.nkm[i] / 100 + aKm, min: nm, minPeak: nm * pf };
    }
    return { km: k, min: m, minPeak: m * pf, precision: precision, viaToll: viaToll, noToll: noToll };
  }

  /** The grid cell that answers for (lon, lat): {i, d (extra approach metres), precision}, or null. The grid
   *  must be ready. Shared by at() and route(), so a route always ends where the minutes were measured. */
  function locate(lon, lat) {
    var c = Math.floor((lon - G.w) / (G.e - G.w) * G.cols);
    var r = Math.floor((G.n - lat) / (G.n - G.s) * G.rows);
    if (c < 0 || c >= G.cols || r < 0 || r >= G.rows) return null;
    var i = r * G.cols + c;
    if (G.min[i] !== NULL16 && G.km[i] !== NULL16) return { i: i, d: 0, precision: 'exact-grid' };
    var best = -1, bestD = Infinity, lim = NEAR_CELLS * Math.min(G.cw, G.ch) + 1e-6;
    for (var dr = -NEAR_CELLS; dr <= NEAR_CELLS; dr++) {
      var r2 = r + dr;
      if (r2 < 0 || r2 >= G.rows) continue;
      for (var dc = -NEAR_CELLS; dc <= NEAR_CELLS; dc++) {
        var c2 = c + dc;
        if (c2 < 0 || c2 >= G.cols) continue;
        var j = r2 * G.cols + c2;
        if (G.min[j] === NULL16 || G.km[j] === NULL16) continue;
        var d = Math.sqrt(dc * G.cw * dc * G.cw + dr * G.ch * dr * G.ch);
        if (d <= lim && d < bestD) { bestD = d; best = j; }
      }
    }
    return best < 0 ? null : { i: best, d: bestD, precision: 'nearby' };
  }

  /** Distance and time from the branch to (lon, lat). O(1): one cell, or at most 11 × 11 cells. */
  function at(lon, lat) {
    if (!isNum(lon) || !isNum(lat) || !ready()) return NONE;
    var L = locate(lon, lat);
    return L ? result(L.i, L.d, L.precision) : NONE;
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

  function decodeRoutes(obj) {
    RT = null; rsource = null; rmatch = null;
    if (!obj || !obj.meta || !obj.meta.origin || !obj.noToll || !isNum(obj.points) || !isNum(obj.noToll.points) ||
        !isNum(obj.cols) || !isNum(obj.rows)) return false;
    try {
      var N = obj.points, T = N + obj.noToll.points, ncell = obj.cols * obj.rows, c, v, r;
      var X = new Int32Array(T), Y = new Int32Array(T), P = new Int32Array(T);
      P[0] = -1;
      r = new Varints(obj.tree);
      if (readChains(r, [[0, r.u()]], X, Y, P, 1, N) !== N || !r.end()) return false;
      var toll = new Uint8Array(N), at_ = 0;
      r = new Varints(obj.toll || '');
      while (!r.end()) {
        at_ += r.u();
        var len = r.u();
        if (at_ + len > N) return false;
        for (var t = at_; t < at_ + len; t++) toll[t] = 1;
        at_ += len;
      }
      var cells = new Int32Array(ncell), prev = 0;
      r = new Varints(obj.cells);
      for (c = 0; c < ncell; c++) {
        v = r.u();
        if (v) { prev += unzz(v - 1); if (prev < 0 || prev >= N) return false; cells[c] = prev; } else cells[c] = -1;
      }
      if (!r.end()) return false;
      r = new Varints(obj.noToll.tree);
      var next = N, pp = 0, groups = r.u();
      for (var g = 0; g < groups; g++) {
        pp += r.u();
        if (pp >= N) return false;
        next = readChains(r, [[pp, r.u()]], X, Y, P, next, T);
      }
      if (next !== T || !r.end()) return false;
      var PT = new Int32Array(P), i = 0;
      r = new Varints(obj.noToll.reparent);
      while (!r.end()) {
        i += r.u();
        var np = i + unzz(r.u());
        if (i >= N || np < 0 || np >= T) return false;
        PT[i] = np;
      }
      var ntc = new Int32Array(cells);
      r = new Varints(obj.noToll.cells);
      c = -1;
      while (!r.end()) {
        c += r.u() + 1;
        v = r.u();
        if (c >= ncell) return false;
        ntc[c] = v === 0 ? -1 : Math.max(cells[c], 0) + unzz(v - 1);
        if (ntc[c] >= T || ntc[c] < -1) return false;
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
          if (c >= ncell || cells[c] !== -1 || ntc[c] < 0) return false;
          carNt[c] = 1;
        }
      }
      var q = obj.meta.quantumDeg > 0 ? Math.round(1 / obj.meta.quantumDeg) : 100000;
      RT = {
        meta: obj.meta, N: N, T: T, X: X, Y: Y, P: P, PT: PT, toll: toll, cells: cells, ntCells: ntc, carNt: carNt, q: q,
        ox: Math.round(obj.meta.origin.lon * q), oy: Math.round(obj.meta.origin.lat * q)
      };
      rsource = obj;
      return true;
    } catch (e) {
      RT = null;
      return false;
    }
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

  /** FNV-1a 32 over the characters of the strings (the grid fingerprint in routes meta.grid.hash). */
  function fnv1a() {
    var h = 0x811c9dc5;
    for (var a = 0; a < arguments.length; a++) {
      var s = String(arguments[a] == null ? '' : arguments[a]);
      for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  /** The routes were built with the grid in use (same cells, same minutes); otherwise no line is drawn. */
  function routesMatchGrid() {
    if (rmatch && rmatch.grid === source && rmatch.routes === rsource) return rmatch.ok;
    var gm = RT.meta.grid || {};
    var ok = gm.cols === G.cols && gm.rows === G.rows &&
      (!gm.hash || gm.hash === fnv1a(source.minutes, source.minutesNoToll));
    rmatch = { grid: source, routes: rsource, ok: ok };
    return ok;
  }

  /** The driving route from the branch to (lon, lat), from the same search as at(). opts.noToll: without toll
   *  roads (motorcycles). Null when the routes are not loaded or the point has no value. */
  function route(lon, lat, opts) {
    if (!isNum(lon) || !isNum(lat) || !ready() || !routesReady() || !routesMatchGrid()) return null;
    var L = locate(lon, lat);
    if (!L) return null;
    var r = result(L.i, L.d, L.precision);
    var noToll = !!(opts && opts.noToll);
    var v = noToll ? r.noToll : r;
    if (!v || !isNum(v.km) || !isNum(v.min)) return null;
    var useNt = noToll || !!(RT.carNt && RT.carNt[L.i]);     // the car takes the toll-free route in this cell
    var a = (useNt ? RT.ntCells : RT.cells)[L.i];
    if (!(a >= 0)) return null;
    var par = useNt ? RT.PT : RT.P;
    var ids = [], guard = RT.T, viaToll = false;
    for (var i = a; i >= 0; i = par[i]) {
      if (guard-- < 0) return null;            // corrupt data: never loop
      ids.push(i);
      if (i < RT.N && RT.toll[i]) viaToll = true;
    }
    if (ids[ids.length - 1] !== 0) return null;
    var n = ids.length, coords = new Array(n);
    for (var j = 0; j < n; j++) {
      var k = ids[n - 1 - j];
      coords[j] = [(RT.ox + RT.X[k]) / RT.q, (RT.oy + RT.Y[k]) / RT.q];
    }
    var end = coords[n - 1];
    return {
      coords: coords, connector: [[end[0], end[1]], [lon, lat]],
      km: v.km, min: v.min, minPeak: v.minPeak, viaToll: viaToll, precision: r.precision, noToll: noToll
    };
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
    route: route, routesReady: routesReady, loadRoutes: loadRoutes
  };
});
