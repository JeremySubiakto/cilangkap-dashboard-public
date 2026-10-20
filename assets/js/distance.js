/* ==========================================================================
 * MCD.distance: one road distance and travel time from KCP Jakarta Cilangkap for any point.
 *
 * Branch decisions 16 Oct 2026 (docs/COPY_STYLE_EN.md items 27-28): every merchant, school and project
 * shows its own "x,x km · ± y menit" from the branch, and lists can be sorted "Terdekat dari KCP".
 * This module is the one place that picks the best source and writes the text, so every section says
 * the same thing. Three sources, best first; all three give NORMAL-traffic minutes, so they mix safely:
 *
 *   'grid'   MCD.travel (assets/js/travel.js + data/travel-grid.js): our own road network from the branch,
 *            100 m cells over about ±16 km, normal traffic (calibrated to TomTom 2025 Jakarta).
 *            precision 'jalan'. Beyond the inner box, 15-31 km: the outer grid (data/travel-grid-outer.js, 200 m
 *            cells, same rules; v6, item 45), loaded on first use. While it loads, of() returns the next source's
 *            value with pending: true, and format() writes 'Menghitung jarak…'; once it is there (or failed) the
 *            window event 'mcd:distance' fires with changed: 'outer', so sections render again.
 *   'tabel'  window.MCD_TRAVEL (data/travel-times.js): OSRM routes per kelurahan / kecamatan up to about
 *            39 km, scaled to the exact point. Its minutes are FREE-FLOW (empty roads): converted to normal
 *            traffic × 1,6 (TomTom 2025 Jakarta, congestion 59,8%). precision 'perkiraan'.
 *   'garis'  straight line × 1,44 (median road ÷ straight km) at 35 km/jam (OSRM median 55,9 ÷ 1,6).
 *            precision 'garis-lurus'. Also used when MCD_TRAVEL itself falls back to a straight line.
 *
 * "Jam sibuk" = minutes × MCD.travel.peakFactor() (default 1,3, an editable assumption in Data & Privasi).
 * "Motor (tanpa tol)" = the grid's route without toll roads (motorcycles may not use toll roads); the
 * table and the straight line have no such route, so they keep the car time and say so in tip().
 *
 * No network. No DOM, except controls() and directionsLink(), which build an element only when a section calls them.
 * The only side effects are the two shared toggles below: stored per browser
 * in localStorage key 'mcd.distance.v1' ({peak, noToll}; try/catch, memory fallback when storage is
 * blocked), read lazily on first use, and announced with the window event 'mcd:distance'
 * (detail {peak, noToll, changed: 'peak' | 'noToll'}). Robust to missing modules: without the grid it
 * uses the table, without both a straight line. UMD: MCD.distance in the browser, module.exports in Node.
 *
 * API (contract: docs/INTEGRATION_NOTES.md §5)
 *   of(lon, lat, {kelurahanId?, kecamatanId?})
 *       → {km, min, minPeak, precision: 'jalan'|'perkiraan'|'garis-lurus', source: 'grid'|'tabel'|'garis',
 *          noToll: {km, min, minPeak} | null, viaToll, basis} | null (bad input)
 *       basis: 'exact-grid' | 'nearby' (grid), 'kelurahan' | 'kecamatan' (tabel), 'garis'
 *       grid: 'outer' when the value comes from the outer grid (15-31 km); pending: true while the outer grid loads
 *       (the numbers are then the table's or the straight line's, to sort by; show format()'s 'Menghitung jarak…')
 *       Grid rule (fix 16 Oct 2026): the main value is the route WITHOUT toll roads when that route is faster,
 *       or ties within 0,05 menit and is shorter (the grid's toll search can snap to the toll carriageway and
 *       come out longer for the same time); viaToll is then false. noToll is always the toll-free route.
 *   format(r, {peak?, noToll?}) → '4,2 km · ± 14 menit' · '4,2 km · ± 18 menit (jam sibuk)' ·
 *       '850 m · ± 3 menit' · '31,4 km · ± 1 jam 5 menit' · '—' · 'Menghitung jarak…' (r.pending). A missing peak /
 *       noToll option follows the shared toggle; pass false to switch it off for one call.
 *   tip(r, {peak?, noToll?}) → plain Indonesian tooltip, one idea per line ('\n')
 *   sortNearest(items, getLonLat?, {noToll?, areaOf?}) → new array, nearest by time first; ties by km,
 *       then input order; items without a value last, in input order. getLonLat(item) returns [lon, lat],
 *       [lon, lat, {kelurahanId, kecamatanId}] or {lon|lng, lat, kelurahanId?, kecamatanId?}; default reads
 *       the item itself. opts.areaOf(item) → {kelurahanId, kecamatanId} (skips the polygon lookup).
 *   peakOn() / setPeak(bool) · noTollOn() / setNoToll(bool) · on(fn) → off
 *   controls({compact?, label?}) → the one "Waktu tempuh" control every section shows: label + two .toggle
 *       switches ("Jam sibuk", "Motor (tanpa tol)") that call setPeak / setNoToll and stay in sync; null
 *       without a document. el.sync() re-reads the toggles, el.destroy() stops syncing it.
 *   peakFactor() · ready() · available() → {grid, tabel} · sourceLine() · KEY · EVENT
 *   route(lon, lat, {noToll?, peak?}) → Promise<{coords, connector, km, min, minPeak, viaToll, precision, noToll,
 *       label, tip} | null> (item 36): the line from KCP along the roads, from data/travel-routes.js, loaded once
 *       through MCD.app.lazy('travel-routes'). Offline: no routing request ever leaves the computer. The same route
 *       as of() (line, label and lists agree); a missing noToll follows the "Motor (tanpa tol)" toggle. Never rejects.
 *   preload({outer?}) → Promise<boolean> (item 41): the same one load of the route data, started early by the shell when
 *       a map section with routes opens (never rejects; false when it cannot load). outer: true also loads the outer grid
 *       and its routes (the 30 km view).
 *   state() → {grid, outer, outerRoutes} (v6): grid true when the inner grid is ready; outer / outerRoutes 'idle' |
 *       'loading' | 'ready' | 'error' | 'unavailable' (MCD.travel.outerState()). 'loading' = show 'Menghitung jarak…'.
 *   directionsUrl(lon, lat) → 'https://www.google.com/maps/dir/?api=1&origin=<KCP lat,lon>&destination=<lat,lon>
 *       &travelmode=driving' | null: coordinates only, 5 decimals. directionsLink(lon, lat, {compact?, label?}) →
 *       the "Rute di Google Maps" <a> (new tab, noopener noreferrer) | null. Opens only on a click.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.distance = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var KEY = 'mcd.distance.v1';
  var EVENT = 'mcd:distance';
  var ORIGIN = [106.90989, -6.33203];   // KCP Jakarta Cilangkap (MCD.config.branch; the origin of both data files)
  var FREE_TO_NORMAL = 1.6;             // TomTom Traffic Index 2025 Jakarta: congestion 59,8% → normal ≈ 1,6 × free flow
  var PEAK_DEFAULT = 1.3;               // MCD.travel default: TomTom 2025 all-day 22,8 ÷ rush hour 17,8 km/jam
  var CIRCUITY = 1.44;                  // road km ÷ straight km, median of data/travel-times.js
  var LINE_KMH = 35;                    // normal traffic for the straight line: OSRM median 55,9 km/jam ÷ 1,6
  var FLOOR_KM = 0.3;
  var TIE_MIN = 0.05;                   // minutes: a toll / no-toll difference this small is a tie (grid rounding)

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function mcd() { return (root && root.MCD) || {}; }
  function grid() { var T = mcd().travel; return T && typeof T.at === 'function' ? T : null; }
  function table() { var V = root && root.MCD_TRAVEL; return V && typeof V.estimate === 'function' ? V : null; }

  /* ------------------------------------------------------------ sources */

  function gridReady() {
    var T = grid();
    if (!T) return false;
    try { return typeof T.ready === 'function' ? !!T.ready() : true; } catch (e) { return false; }
  }
  function available() { return { grid: gridReady(), tabel: !!table() }; }
  function ready() { var a = available(); return a.grid || a.tabel; }

  function peakFactor() {
    var T = grid();
    if (T && typeof T.peakFactor === 'function') {
      try { var f = T.peakFactor(); if (isNum(f) && f >= 1 && f <= 3) return f; } catch (e) { /* default below */ }
    }
    return PEAK_DEFAULT;
  }

  function freeToNormal() {
    var V = table(), pf = V && V.meta && V.meta.peakFactor, o = pf && pf.options;
    var f = o && o.rataRata;
    return isNum(f) && f >= 1 && f <= 3 ? f : FREE_TO_NORMAL;
  }

  function origin() {
    var cands = [root && root.MCD_TRAVEL_GRID && root.MCD_TRAVEL_GRID.meta && root.MCD_TRAVEL_GRID.meta.origin,
      root && root.MCD_TRAVEL && root.MCD_TRAVEL.meta && root.MCD_TRAVEL.meta.origin];
    for (var i = 0; i < cands.length; i++) {
      var o = cands[i];
      if (o && isNum(o.lon) && isNum(o.lat)) return [o.lon, o.lat];
    }
    return ORIGIN;
  }

  function haversineKm(lon1, lat1, lon2, lat2) {
    var R = 6371.0088, rad = Math.PI / 180, p1 = lat1 * rad, p2 = lat2 * rad, dp = p2 - p1, dl = (lon2 - lon1) * rad;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* ------------------------------------------------------------ lookup */

  /** The grid's toll search can snap to the toll carriageway and come out slower than, or as fast as, the route
   *  without toll roads, yet several km longer. The route a driver would take is the one without toll roads when it
   *  is faster, or when the minutes tie (within TIE_MIN) and it is shorter. g: MCD.travel.at() (or its noToll part
   *  as nt). Shared by of() and route(), so the list, the label and the line always name the same route. */
  function noTollWins(g, nt) {
    return !!(nt && isNum(nt.km) && isNum(nt.min) && (nt.min < g.min - TIE_MIN || (nt.min <= g.min + TIE_MIN && nt.km < g.km)));
  }

  /** Distance and time from the branch to (lon, lat), normal traffic. null only for a bad point. */
  function of(lon, lat, opts) {
    if (!isNum(lon) || !isNum(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) return null;
    opts = opts || {};
    var pf = peakFactor();

    // 1 · our own road grid (about ±16 km; beyond it the outer grid to about 31 km, v6)
    var T = grid(), pending = false;
    if (T) {
      hookOuter();
      var g = null;
      try { g = T.at(lon, lat); } catch (e) { g = null; }
      if (g && g.precision && g.precision !== 'none' && isNum(g.km) && isNum(g.min)) {
        var nt = g.noToll && isNum(g.noToll.km) && isNum(g.noToll.min)
          ? { km: g.noToll.km, min: g.noToll.min, minPeak: g.noToll.min * pf } : null;
        var out;
        if (noTollWins(g, nt)) {
          out = { km: nt.km, min: nt.min, minPeak: nt.minPeak, precision: 'jalan', source: 'grid',
            noToll: nt, viaToll: false, basis: g.precision };
        } else {
          out = { km: g.km, min: g.min, minPeak: g.min * pf, precision: 'jalan', source: 'grid',
            noToll: nt, viaToll: !!g.viaToll, basis: g.precision };
        }
        if (g.grid === 'outer') out.grid = 'outer';
        return out;
      }
      pending = !!(g && g.pending);   // the outer grid is loading: a value below for sorting, 'Menghitung jarak…' shown
    }

    // 2 · OSRM table per kelurahan / kecamatan, free flow → normal traffic
    var V = table();
    if (V) {
      var est = null;
      try {
        est = V.estimate(lon, lat, { kelurahanId: opts.kelurahanId || undefined, kecamatanId: opts.kecamatanId || undefined });
      } catch (e2) { est = null; }
      if (est && isNum(est.km) && isNum(est.min)) {
        var line = est.basis === 'garis lurus', m = est.min * freeToNormal();
        var tr = { km: est.km, min: m, minPeak: m * pf, precision: line ? 'garis-lurus' : 'perkiraan',
          source: line ? 'garis' : 'tabel', noToll: null, viaToll: false, basis: line ? 'garis' : (est.basis || 'kelurahan') };
        if (pending) tr.pending = true;
        return tr;
      }
    }

    // 3 · straight line
    var o = origin(), d = haversineKm(o[0], o[1], lon, lat);
    var km = Math.max(d * CIRCUITY, FLOOR_KM), mm = Math.max(1, km / LINE_KMH * 60);
    var lr = { km: km, min: mm, minPeak: mm * pf, precision: 'garis-lurus', source: 'garis', noToll: null, viaToll: false, basis: 'garis' };
    if (pending) lr.pending = true;
    return lr;
  }

  /* ------------------------------------------------------------ outer grid state (v6) */

  var PENDING_TEXT = 'Menghitung jarak…';
  var hooked = false;

  /** Once: when the outer grid finishes loading (or fails), announce 'mcd:distance' {changed: 'outer'} so every
   *  section renders its distances again (the shell schedules the 'distance' update on that event). */
  function hookOuter() {
    if (hooked) return;
    var T = grid();
    if (!T || typeof T.onOuter !== 'function') return;
    hooked = true;
    var last = null;
    try {
      T.onOuter(function (st) {
        var g = st && st.grid;
        if (g === last) return;
        var was = last;
        last = g;
        if (g === 'ready' || (g === 'error' && was === 'loading')) announce('outer');
      });
    } catch (e) { hooked = false; }
  }

  /** {grid, outer, outerRoutes}: the inner grid is ready; the outer grid's and routes' load state. */
  function state() {
    var T = grid(), st = null;
    try { st = T && typeof T.outerState === 'function' ? T.outerState() : null; } catch (e) { st = null; }
    return { grid: gridReady(), outer: st ? st.grid : 'unavailable', outerRoutes: st ? st.routes : 'unavailable' };
  }

  function valid(r) { return !!(r && isNum(r.km) && isNum(r.min)); }

  /* ------------------------------------------------------------ text (Bahasa Indonesia) */

  function dec1(x) { return x.toFixed(1).replace('.', ','); }
  function thousands(s) { return String(s).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function decimal(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }

  function kmText(k) {
    if (k < 0) k = 0;
    if (k < 1) {
      var m = k < 0.1 ? Math.round(k * 1000) : Math.round(k * 100) * 10;
      if (m < 1000) return m + ' m';
    }
    var p = dec1(k).split(',');
    return thousands(p[0]) + ',' + p[1] + ' km';
  }

  function minText(m) {
    var t = Math.max(1, Math.round(m));
    if (t < 60) return '± ' + t + ' menit';
    var h = Math.floor(t / 60), r = t % 60;
    return '± ' + thousands(h) + ' jam' + (r ? ' ' + r + ' menit' : '');
  }

  /** The options in effect: a missing peak / noToll follows the shared toggle. */
  function wants(opts) {
    opts = opts || {};
    return { peak: opts.peak == null ? peakOn() : !!opts.peak, noToll: opts.noToll == null ? noTollOn() : !!opts.noToll };
  }

  /** The value shown for r under these options: {km, min, peak, noToll} (noToll only when the route exists). */
  function shown(r, w) {
    var useNT = !!(w.noToll && r.noToll && isNum(r.noToll.km) && isNum(r.noToll.min));
    var v = useNT ? r.noToll : r;
    return { km: v.km, min: w.peak ? v.min * peakFactor() : v.min, peak: w.peak, noToll: useNT };
  }

  function format(r, opts) {
    if (r && r.pending) return PENDING_TEXT;
    if (!valid(r)) return '—';
    var s = shown(r, wants(opts)), tags = [];
    if (s.peak) tags.push('jam sibuk');
    if (s.noToll) tags.push('tanpa tol');
    return kmText(s.km) + ' · ' + minText(s.min) + (tags.length ? ' (' + tags.join(', ') + ')' : '');
  }

  function tip(r, opts) {
    if (r && r.pending) return 'Jarak dari KCP sedang dihitung.\nData jalan untuk 16–31 km sedang dimuat.';
    if (!valid(r)) return 'Jarak belum dapat dihitung untuk titik ini.';
    var w = wants(opts), lines = [];
    lines.push(r.source === 'garis'
      ? 'Perkiraan kasar jarak dan waktu dari KCP Jakarta Cilangkap, lalu lintas normal.'
      : 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.');
    if (r.source === 'grid') {
      lines.push(r.basis === 'nearby' ? 'Diukur dari jalan terdekat. Data jalan: OpenStreetMap.' : 'Dihitung dari jaringan jalan OpenStreetMap.');
    } else if (r.source === 'tabel') {
      lines.push('Dihitung dari rute ke pusat ' + (r.basis === 'kecamatan' ? 'kecamatan' : 'kelurahan') + ' (OSRM, OpenStreetMap).');
    } else {
      lines.push('Dihitung dari jarak garis lurus, karena rute jalan belum tersedia.');
    }
    if (w.peak) lines.push('Jam sibuk: waktu dikali ' + decimal(peakFactor()) + ' (asumsi).');
    if (w.noToll) lines.push(r.noToll ? 'Rute tanpa jalan tol, untuk sepeda motor.' : 'Rute tanpa tol belum tersedia di sini. Waktu ini untuk mobil.');
    else if (r.viaToll) lines.push('Rute tercepat melalui jalan tol.');
    return lines.join('\n');
  }

  function sourceLine() {
    return 'Jarak dan waktu dari KCP: perkiraan, lalu lintas normal. Data jalan © OpenStreetMap (ODbL).';
  }

  /* ------------------------------------------------------------ sorting */

  function pointOf(x) {
    if (!x) return null;
    var lon, lat, area = null;
    if (Array.isArray(x) || (typeof x === 'object' && typeof x.length === 'number')) {
      lon = x[0]; lat = x[1];
      if (x[2] && typeof x[2] === 'object') area = x[2];
    } else if (typeof x === 'object') {
      lon = isNum(x.lon) ? x.lon : x.lng; lat = x.lat;
      if (x.kelurahanId || x.kecamatanId) area = { kelurahanId: x.kelurahanId, kecamatanId: x.kecamatanId };
    }
    lon = typeof lon === 'string' ? parseFloat(lon) : lon;
    lat = typeof lat === 'string' ? parseFloat(lat) : lat;
    return isNum(lon) && isNum(lat) ? { lon: lon, lat: lat, area: area } : null;
  }

  /** New array of the same items, nearest first by travel time (noToll: the motorcycle route). */
  function sortNearest(items, getLonLat, opts) {
    if (!items || typeof items.length !== 'number' || typeof items === 'string') return [];
    if (getLonLat && typeof getLonLat === 'object' && !opts) { opts = getLonLat; getLonLat = null; }
    opts = opts || {};
    var get = typeof getLonLat === 'function' ? getLonLat : function (it) { return it; };
    var nt = opts.noToll == null ? noTollOn() : !!opts.noToll;
    var areaOf = typeof opts.areaOf === 'function' ? opts.areaOf : null;
    var rows = new Array(items.length);
    for (var i = 0; i < items.length; i++) {
      var it = items[i], p = null, r = null;
      try { p = pointOf(get(it, i)); } catch (e) { p = null; }
      if (p) {
        var area = p.area;
        if (areaOf) { try { area = areaOf(it, i) || area; } catch (e2) { /* keep the point's own area */ } }
        r = of(p.lon, p.lat, area || undefined);
      }
      var v = valid(r) ? (nt && r.noToll && isNum(r.noToll.min) ? r.noToll : r) : null;
      rows[i] = { it: it, i: i, m: v ? v.min : Infinity, k: v ? v.km : Infinity };
    }
    rows.sort(function (a, b) {
      if (a.m !== b.m) return a.m < b.m ? -1 : 1;
      if (a.k !== b.k) return a.k < b.k ? -1 : 1;
      return a.i - b.i;
    });
    return rows.map(function (x) { return x.it; });
  }

  /* ------------------------------------------------------------ route lines (item 36) */

  var routesP = null;   // the one pending load of data/travel-routes.js through MCD.app.lazy

  /** MCD.travel with its route trees decoded, or null. Loads data/travel-routes.js once (MCD.app.lazy). */
  function routesTravel() {
    var T = grid();
    if (!T || typeof T.route !== 'function') return Promise.resolve(null);
    var have = false;
    try { have = typeof T.routesReady === 'function' && !!T.routesReady(); } catch (e) { have = false; }
    if (have) return Promise.resolve(T);
    var app = mcd().app;
    if (!app || typeof app.lazy !== 'function') return Promise.resolve(null);
    if (!routesP) {
      var p;
      try { p = Promise.resolve(app.lazy('travel-routes')); } catch (e2) { p = Promise.reject(e2); }
      routesP = p.then(function () {
        var ok = false;
        try { ok = typeof T.routesReady === 'function' && !!T.routesReady(); } catch (e3) { ok = false; }
        return ok ? T : null;
      }, function () { return null; });
      // a failed or refused load (locked, file missing) may be tried again by the next call
      routesP.then(function (t) { if (!t) routesP = null; });
    }
    return routesP;
  }

  /**
   * preload() → Promise<boolean> (item 41): load the route data now, so the first route of a session needs one camera
   * flight. Idempotent (shares the one pending load with route()); never rejects (false: locked, file missing, no grid).
   * The shell calls it a moment after Merchant, Sekolah or KPR mounts (app.js schedulePreload), never on pages.
   */
  function preload(opts) {
    var p;
    try { p = routesTravel(); } catch (e) { return Promise.resolve(false); }
    var inner = Promise.resolve(p).then(function (t) { return !!t; }, function () { return false; });
    if (!(opts && opts.outer)) return inner;
    var q;
    try { q = outerTravel(); } catch (e2) { q = Promise.resolve(null); }
    return Promise.all([inner, Promise.resolve(q).then(function (t) { return !!t; }, function () { return false; })])
      .then(function (v) { return v[0] && v[1]; }, function () { return false; });
  }

  /** MCD.travel with the outer grid and its routes loaded (v6, points 16-31 km), or null. Never rejects. */
  function outerTravel() {
    var T = grid();
    if (!T || typeof T.loadOuterRoutes !== 'function') return Promise.resolve(null);
    hookOuter();
    var p;
    try { p = Promise.resolve(T.loadOuterRoutes()); } catch (e) { return Promise.resolve(null); }
    return p.then(function (ok) { return ok ? T : null; }, function () { return null; });
  }

  /**
   * route(lon, lat, {noToll?}) → Promise<{coords, connector, km, min, minPeak, viaToll, precision, noToll, label, tip}
   * | null>: the driving route from KCP Jakarta Cilangkap to the point, from the dashboard's own road network
   * (data/travel-routes.js, offline: nothing leaves the computer, so LVM locations stay private).
   *   coords     [[lon, lat], …] branch pin → roads → the road point the minutes were measured to (solid line)
   *   connector  [[lon, lat] of that road point, [lon, lat] asked]: the last stretch, drawn dashed
   *   km, min, minPeak, viaToll, precision   the same route the lists show (the of() rule: without toll roads
   *              when that is faster, or as fast and shorter), so the line, its label and every list agree
   *   noToll     true when this is the route without toll roads (asked, or the better one)
   *   label      '6,2 km · ± 18 menit' (+ '(jam sibuk)' / '(tanpa tol)' as format() writes them); tip: tip()
   * A missing opts.noToll follows the shared "Motor (tanpa tol)" toggle. Where no toll-free route exists the car
   * route is given (noToll false). null: a bad point, the point is outside both road grids (about 31 km), the
   * route data cannot load (before sign-in, file missing) or was built from another grid. Never rejects. Beyond the inner
   * grid (16-31 km, v6) the outer grid and its routes load first (MCD.travel.loadOuterRoutes()).
   */
  function route(lon, lat, opts) {
    if (!isNum(lon) || !isNum(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) return Promise.resolve(null);
    opts = opts || {};
    var wantNT = opts.noToll == null ? noTollOn() : !!opts.noToll;
    var T0 = grid(), outer = false;
    try { outer = !!(T0 && typeof T0.gridFor === 'function' && T0.gridFor(lon, lat) === 'outer'); } catch (e0) { outer = false; }
    return (outer ? outerTravel() : routesTravel()).then(function (T) {
      if (!T) return null;
      var g = null;
      try { g = T.at(lon, lat); } catch (e) { g = null; }
      if (!g || !g.precision || g.precision === 'none' || !isNum(g.km) || !isNum(g.min)) return null;
      var useNT = wantNT || noTollWins(g, g.noToll);
      var r = null;
      try { r = T.route(lon, lat, { noToll: useNT }); } catch (e2) { r = null; }
      if (!r && useNT) { try { r = T.route(lon, lat, { noToll: false }); } catch (e3) { r = null; } }
      if (!r || !r.coords || !r.coords.length || !isNum(r.km) || !isNum(r.min)) return null;
      var pf = peakFactor(), nt = !!r.noToll;
      var shownR = { km: r.km, min: r.min, minPeak: r.min * pf, source: 'grid', basis: g.precision, viaToll: !!r.viaToll,
        noToll: null, precision: 'jalan' };
      var peak = opts.peak == null ? peakOn() : !!opts.peak;
      var tags = [];
      if (peak) tags.push('jam sibuk');
      if (nt && wantNT) tags.push('tanpa tol');
      return {
        coords: r.coords, connector: r.connector, km: r.km, min: r.min, minPeak: r.min * pf,
        viaToll: !!r.viaToll, precision: r.precision, noToll: nt,
        label: kmText(r.km) + ' · ' + minText(peak ? r.min * pf : r.min) + (tags.length ? ' (' + tags.join(', ') + ')' : ''),
        tip: tip(shownR, { peak: peak, noToll: false }) + (nt && wantNT ? '\nRute tanpa jalan tol, untuk sepeda motor.' : '')
      };
    }).then(null, function () { return null; });
  }

  /* ------------------------------------------------------------ "Rute di Google Maps" (item 36) */

  var DIR_BASE = 'https://www.google.com/maps/dir/?api=1';
  var DIR_TIP = 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.';   /* one wording in every section (COPY_DECK rule 13) */

  function fix5(v) { var s = v.toFixed(5); return /^-0\.0+$/.test(s) ? s.slice(1) : s; }
  function okPoint(lon, lat) {
    return isNum(lon) && isNum(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90 && !(lon === 0 && lat === 0);
  }
  /** The branch pin: MCD.config.branch (editable in Data & Privasi), else the origin of the travel data. */
  function branchPoint() {
    var b = mcd().config && mcd().config.branch;
    if (b && okPoint(Number(b.lon), Number(b.lat))) return [Number(b.lon), Number(b.lat)];
    return origin();
  }

  /**
   * directionsUrl(lon, lat) → 'https://www.google.com/maps/dir/?api=1&origin=<lat,lon of KCP>&destination=<lat,lon>
   * &travelmode=driving' | null. Coordinates only, 5 decimals: never a name, an address or anything about a bank
   * customer. A plain link the user opens; the dashboard itself sends nothing.
   */
  function directionsUrl(lon, lat) {
    lon = typeof lon === 'string' && lon.trim() !== '' ? Number(lon) : lon;
    lat = typeof lat === 'string' && lat.trim() !== '' ? Number(lat) : lat;
    if (!okPoint(lon, lat)) return null;
    var o = branchPoint();
    return DIR_BASE + '&origin=' + fix5(o[1]) + ',' + fix5(o[0]) + '&destination=' + fix5(lat) + ',' + fix5(lon) + '&travelmode=driving';
  }

  /**
   * directionsLink(lon, lat, {compact?, label?, className?}) → <a class="btn btn--secondary gmaps-link"> "Rute di Google
   * Maps" (new tab, rel="noopener noreferrer", no referrer) | null without a document or a valid point. Opens only on
   * a click. The same look as "Buka di Google Maps" (MCD.util.gmaps.link).
   */
  function directionsLink(lon, lat, opts) {
    opts = opts || {};
    var url = directionsUrl(lon, lat), d = root && root.document;
    if (!url || !d || typeof d.createElement !== 'function') return null;
    var label = typeof opts.label === 'string' && opts.label ? opts.label : 'Rute di Google Maps';
    var a = d.createElement('a');
    a.className = 'btn btn--secondary gmaps-link gmaps-link--route' + (opts.compact ? ' gmaps-link--icon' : '') + (opts.className ? ' ' + opts.className : '');
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.setAttribute('referrerpolicy', 'no-referrer');
    a.setAttribute('title', DIR_TIP);
    if (opts.compact) a.setAttribute('aria-label', label);
    if (typeof d.createElementNS === 'function') {
      var svg = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var use = d.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#i-external');
      svg.appendChild(use);
      a.appendChild(svg);
    }
    if (!opts.compact) { var s = d.createElement('span'); s.textContent = label; a.appendChild(s); }
    return a;
  }

  /* ------------------------------------------------------------ shared toggles */

  var prefs = null;   // {peak, noToll}; read on first use, never at load time

  function store() {
    try { var s = root && root.localStorage; return s || null; } catch (e) { return null; }   // the getter itself may throw
  }
  function prefsNow() {
    if (prefs) return prefs;
    prefs = { peak: false, noToll: false };
    try {
      var s = store(), raw = s ? s.getItem(KEY) : null;
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') { prefs.peak = o.peak === true; prefs.noToll = o.noToll === true; }
      }
    } catch (e) { /* blocked storage or bad JSON: defaults, in memory */ }
    return prefs;
  }
  function save() {
    try {
      var s = store();
      if (!s) return false;
      s.setItem(KEY, JSON.stringify({ peak: prefs.peak, noToll: prefs.noToll }));
      return true;
    } catch (e) { return false; }   // quota or blocked: the choice stays in memory for this page
  }
  function announce(changed) {
    if (!root || typeof root.dispatchEvent !== 'function') return;
    var p = prefsNow();   // the 'outer' announcement may come before any toggle was read
    var detail = { peak: p.peak, noToll: p.noToll, changed: changed };
    try {
      var ev = null;
      if (typeof root.CustomEvent === 'function') ev = new root.CustomEvent(EVENT, { detail: detail });
      else if (root.document && typeof root.document.createEvent === 'function') {
        ev = root.document.createEvent('CustomEvent');
        ev.initCustomEvent(EVENT, false, false, detail);
      }
      if (ev) root.dispatchEvent(ev);
    } catch (e) { /* the toggle changed even if a listener failed */ }
  }
  function setPref(k, on) {
    on = !!on;
    var p = prefsNow();
    if (p[k] === on) return on;
    p[k] = on;
    save();
    syncControls();
    announce(k);
    return on;
  }

  function peakOn() { return prefsNow().peak; }
  function noTollOn() { return prefsNow().noToll; }
  function setPeak(on) { return setPref('peak', on); }
  function setNoToll(on) { return setPref('noToll', on); }

  /** on(fn): fn({peak, noToll, changed}) after each toggle change; returns off(). */
  function on(fn) {
    if (typeof fn !== 'function' || !root || typeof root.addEventListener !== 'function') return function () {};
    var h = function (e) { fn((e && e.detail) || { peak: peakOn(), noToll: noTollOn() }); };
    root.addEventListener(EVENT, h);
    return function () { if (typeof root.removeEventListener === 'function') root.removeEventListener(EVENT, h); };
  }

  /* ------------------------------------------------------------ the one switch pair (UI) */

  /* Every section shows the same control for the two shared toggles: the label "Waktu tempuh" and two
     switches built on the shared .toggle of components.css. Live controls are kept in CTL and synced after
     each change, without a window listener per control; a control that was on the page and has left it is
     dropped at the next sync, so remounting a section never piles them up. */
  var CTL = [];

  function syncControls() {
    var keep = [];
    for (var i = 0; i < CTL.length; i++) {
      var c = CTL[i];
      if (c.dead) continue;
      var conn = c.el.isConnected;
      if (conn === false && c.seen) { c.dead = true; continue; }
      if (conn) c.seen = true;
      try { c.sync(); } catch (e) { /* a broken control never stops the others */ }
      keep.push(c);
    }
    // controls built but never put on the page: keep a few, drop the rest once the list grows
    if (keep.length > 64) keep = keep.filter(function (c) { return c.el.isConnected !== false; });
    CTL = keep;
  }

  /**
   * controls({compact?, label?}) → <div class="dist-ctl" role="group"> with the label and two switches
   * ("Jam sibuk", "Motor (tanpa tol)"), or null without a document. The element has sync() (re-read the
   * toggles, e.g. after it was detached and attached again) and destroy() (stop syncing it). compact: the
   * smaller size for rails and cards. label: another visible label, or false for none (the group keeps its
   * aria-label). Clicks call setPeak / setNoToll: the window event 'mcd:distance' does the rest.
   */
  function controls(opts) {
    opts = opts || {};
    var d = root && root.document;
    if (!d || typeof d.createElement !== 'function') return null;
    function el(tag, cls, text) {
      var n = d.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function sw(label, isOn, set, title) {
      var b = el('button', 'toggle dist-ctl__sw');
      b.type = 'button';
      b.setAttribute('role', 'switch');
      var track = el('span', 'toggle__track');
      track.setAttribute('aria-hidden', 'true');
      b.appendChild(track);
      b.appendChild(el('span', 'dist-ctl__t', label));
      b.addEventListener('click', function () { set(!isOn()); paint(); });
      function paint() { b.setAttribute('aria-checked', isOn() ? 'true' : 'false'); b.title = title(); }
      paint();
      return { el: b, paint: paint };
    }
    var g = el('div', 'dist-ctl' + (opts.compact ? ' dist-ctl--compact' : ''));
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Waktu tempuh dari KCP');
    var text = opts.label === false ? null : (typeof opts.label === 'string' && opts.label ? opts.label : 'Waktu tempuh');
    if (text) g.appendChild(el('span', 'dist-ctl__l', text));
    var peak = sw('Jam sibuk', peakOn, setPeak, function () {
      return 'Tampilkan waktu tempuh saat jam sibuk: waktu normal dikali ' + decimal(peakFactor()) + ' (asumsi, dapat diubah di Data & Privasi).';
    });
    var moto = sw('Motor (tanpa tol)', noTollOn, setNoToll, function () {
      return 'Tampilkan rute tanpa jalan tol, untuk sepeda motor.';
    });
    g.appendChild(peak.el);
    g.appendChild(moto.el);
    var entry = { el: g, seen: false, dead: false, sync: function () { peak.paint(); moto.paint(); } };
    g.sync = function () { entry.dead = false; if (CTL.indexOf(entry) < 0) { entry.seen = false; CTL.push(entry); } entry.sync(); };
    g.destroy = function () { entry.dead = true; };
    // a control that was away from the page while a toggle changed catches up when it is used again
    g.addEventListener('focusin', entry.sync);
    g.addEventListener('pointerenter', entry.sync);
    CTL.push(entry);
    return g;
  }

  hookOuter();   // MCD.travel loads before this file in index.html; of() and route() retry when it was not there yet

  return {
    KEY: KEY, EVENT: EVENT,
    of: of, format: format, tip: tip, sortNearest: sortNearest,
    route: route, preload: preload, state: state, directionsUrl: directionsUrl, directionsLink: directionsLink,
    peakOn: peakOn, setPeak: setPeak, noTollOn: noTollOn, setNoToll: setNoToll, on: on, controls: controls,
    peakFactor: peakFactor, ready: ready, available: available, sourceLine: sourceLine
  };
});
