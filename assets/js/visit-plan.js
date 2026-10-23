/* ==========================================================================
 * MCD.visitPlan: the daily visit planner core (v7 groundwork, docs/COPY_STYLE_EN.md item 48d).
 *
 * Staff pick up to 15 targets across the tabs (merchants, schools, campuses, KPR projects). The planner
 * orders them by travel time from KCP Jakarta Cilangkap and turns the order into Google Maps multi-stop links that
 * hold COORDINATES ONLY. Every number is an estimate; Google Maps decides the real route. Method, calibration and
 * limits: docs/VISIT_PLAN.md.
 *
 * Leg estimate. Between two stops: straight-line (haversine) km × a detour ratio = road km, and road km × minutes
 * per road km = minutes. Both factors are calibrated on the existing road data (data/travel-grid.js: per band of
 * straight-line distance from the branch, the median road km / straight km and the median minutes per road km, for
 * the car value and the value without toll roads) by tools/calibrate-visit-plan.mjs, embedded below as CAL. At each
 * band's median distance (a knot) the curve gives exactly those medians; in between it is linear, from (0, 0) and
 * beyond the last knot at that knot's rate, so a farther stop never costs fewer km or minutes. A leg that starts or
 * ends at the branch uses the grid's own value through MCD.travel.at() when the grid is loaded (the same value both
 * ways; return trips can differ on one-way streets). Legs are symmetric, so the order can be optimised with 2-opt.
 *
 * Ordering. Nearest neighbour from the start, then 2-opt until no reversal saves time. The input order improved by
 * 2-opt is tried too and kept when it is shorter, so a plan is never longer than the order staff picked. Objective:
 * minutes (ties: km). Deterministic: no randomness, ties broken by input position. At most 15 stops.
 *
 * Privacy (item 49), fail closed. Every point (stops, start, link points) must be a public place: its kind must be on
 * PUBLIC_KINDS (cabang, awal, merchant, sekolah, kampus, kpr; or a map alias: kcp, mandiri_branch, poi, mxPoi,
 * smaSchool, project). Anything else, or no kind, refuses the WHOLE request ('invalid-kind'). The kinds satuan and
 * dealer (and the alias tni) were removed with the KSM & KKB section on 22 Oct 2026 (docs/V7_SPEC.md D39); a
 * kesehatan kind comes with the Kesehatan section (D40, docs/HEALTH_SPEC.md), not before.
 * Backstops refuse it as customer data ('private', checked first): a private / isPrivate / sensitive flag; a non-string
 * kind; a customer word (lead, nasabah, customer, cif, debitur, calon, prospek, …) anywhere in kind, type, dataset,
 * source, layer or schema, or at the start of the id; any customer or personal key (cif, nik, noRek, nama, telepon, …)
 * or any field of an MCD.leads record (PRIVATE_FIELDS, plus MCD.leads.FIELDS / STORED_FIELDS when loaded), compared
 * without case or separators. Leads never go into a planner or a link. Links carry only "lat,lon" pairs, never names,
 * labels, ids or addresses. Opening a link sends those coordinates to Google (the branch's choice in item 48d); the
 * planner itself sends nothing.
 *
 * PURE: no DOM, storage or network. The one outside read is MCD.travel (or opts.travel) for the legs from the branch;
 * it never starts loading the outer grid (only an outer grid that is already loaded is used). UMD wrapper:
 * MCD.visitPlan in the browser (classic script), module.exports in Node (tests/visit-plan.test.mjs). Not yet loaded
 * by index.html (v7 UI lane).
 *
 * API
 *   plan({stops, start, returnToStart, mode, keepOrder, dwellMin, peakFactor, travel}) → result
 *     stops        [{id, kind, label, lon, lat, geoPrecision?}]  1-15, each a fresh object (never a data row) with a
 *                  kind on PUBLIC_KINDS; ids unique (missing ids become 't1', 't2', …)
 *     start        {id, kind, label, lon, lat}, kind 'cabang' or 'awal' (any public kind); default KCP (106.90989, -6.33203)
 *     returnToStart  true: back to the start at the end (closed tour); default false (the day ends at the last stop)
 *     mode         'mobil' (default; the car may use toll roads) | 'motor' (no toll roads, grid noToll values)
 *     keepOrder    true: no optimising, legs in the given order (the "urutan saya sendiri" baseline)
 *     dwellMin     minutes spent at each stop, 0-240 (default 0): only adds totalDayMinEst
 *     peakFactor   "jam sibuk" multiplier 1-3 (default MCD.travel.peakFactor(), else 1,3): minPeakEst
 *     travel       an MCD.travel-like object; null = estimates only; default root.MCD.travel
 *   ok result → {ok: true, order, legs, totalKmEst, totalMinEst, totalMinPeakEst, totalDayMinEst, method,
 *                improvedFrom, mode, returnToStart, count, peakFactor, dwellMin, legSources: {grid, estimate}, warnings}
 *     order      route points in visiting order: [start (seq 0, role 'start'), stops (seq 1..n, role 'stop'),
 *                start again (role 'end', only with returnToStart)]; each {seq, role, id, kind, label, lon, lat}
 *     legs       [{from, to, fromSeq, toSeq, straightKm, kmEst, minEst, minPeakEst, source: 'grid'|'estimate',
 *                 viaToll?, precision?}]; legs[i] runs order[i] → order[i+1]; km to 0,01, minutes to 0,1
 *     method     'nearest-neighbour+2-opt' | 'input-order' (keepOrder) | 'single' (one stop)
 *     improvedFrom  'nearest-neighbour' | 'input-order': which starting order gave the kept plan
 *     warnings   [{code: 'long-leg'|'far-stop'|'coarse-location', id, seq, message}]
 *   refused → {ok: false, code, message, order: [], legs: [], totalKmEst: null, totalMinEst: null, method: null}
 *     code 'private' | 'invalid-kind' | 'too-many' | 'empty' | 'invalid' | 'invalid-point' | 'duplicate-id' | 'invalid-mode'
 *   mapsLinks(input, {maxWaypoints, travelmode}) → {ok: true, links: [{url, part, parts, fromSeq, toSeq, waypoints,
 *                    ids, text}], urls, note}
 *                    | {ok: false, code, message, links: [], urls: []}
 *     input      a plan result, or an array of route points [origin, …, destination] ({kind, lon|lng, lat}, 2-17
 *                points; the same privacy and kind rules as plan(): code 'private' | 'invalid-kind' | …)
 *     url        https://www.google.com/maps/dir/?api=1&origin=lat,lon&destination=lat,lon
 *                &waypoints=lat,lon%7Clat,lon…&travelmode=driving   (coordinates to 6 decimals; | written %7C)
 *     More than 9 waypoints (Google's limit per link): the route is split into consecutive links of at most 9
 *     waypoints each, as even as possible; each link starts where the previous one ended. maxWaypoints 1-9 lowers
 *     the limit (Google honours only 3 in a phone browser without the Maps app). travelmode 'driving' (default) or
 *     'two-wheeler' (Google's motorbike mode, a UI choice for mode 'motor'); nothing else is ever written.
 *   legEstimate(a, b, mode) → {straightKm, kmEst, minEst, source: 'estimate'}   between two {lon, lat}
 *   estimateKm(straightKm, mode) → {kmEst, minEst}   the calibrated curve
 *   orderByMatrix(minutes, {returnToStart, keepOrder, km}) → {seq, minutes, improvedFrom}   pure ordering on a
 *       square matrix (index 0 = start); used by plan()
 *   checkStop(stop) → null (may be planned) | 'private' | 'invalid-kind' · isPrivate(stop) → boolean (the backstops)
 *   kindOf(kind) → 'merchant' | 'sekolah' | … (the public kind, aliases resolved) | null
 *   haversineKm(a, b) · calibration() → copy of CAL
 *   summary(result) → '8 tujuan · 23,4 km · ± 1 jam 35 menit (perkiraan, lalu lintas normal)' or the refusal text
 *   legText(leg) → '2,3 km · ± 9 menit' · kmText(km) · minText(min)
 *   MAX_STOPS (15) · MAX_WAYPOINTS (9) · KCP · MODES · PUBLIC_KINDS · PRIVATE_FIELDS
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.visitPlan = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var MAX_STOPS = 15;
  var MAX_WAYPOINTS = 9;                 // Google Maps URLs: up to 9 waypoints between origin and destination
  var KCP = Object.freeze({ id: 'kcp', kind: 'cabang', label: 'KCP Jakarta Cilangkap', lon: 106.90989, lat: -6.33203 });
  var MODES = Object.freeze(['mobil', 'motor']);
  var GRID_ORIGIN_M = 150;               // a start this close to the grid origin uses the grid for its legs
  var CAL_MAX_KM = 16;                   // the curve is calibrated on 0-16 km
  var FAR_KM = 32;                       // beyond the outer grid's reach: warn
  var PEAK_DEFAULT = 1.3;                // docs/TRAVEL_GRID.md §2 (TomTom 2025)
  var DWELL_MAX = 240;
  var TIE_KM = 1e-6;                     // objective = minutes + 1e-6 × km (ties: shorter km)
  var EPS = 1e-9;
  // Item 49, fail closed: ONLY these kinds of public place are planned or linked; any other kind, or none, is refused.
  // Lowercase, matched after trim. Aliases are the map's own point kinds for the same public places (assets/js/map.js).
  var PUBLIC_KINDS = Object.freeze(['cabang', 'awal', 'merchant', 'sekolah', 'kampus', 'kpr']);
  var KIND_ALIAS = { kcp: 'cabang', mandiri_branch: 'cabang', poi: 'merchant', mxpoi: 'merchant', smaschool: 'sekolah',
    project: 'kpr' };
  // Backstops, each enough on its own to make a point private (code 'private'):
  //  · a customer word anywhere in kind, type, dataset, source, layer or schema ('lead-ksm', 'leadKsm', 'calon-nasabah',
  //    'nasabah-prioritas', type 'lead', dataset 'leads', …), or at the start of the id ('lead:41'); a non-string kind;
  var PRIVATE_RE = /lead|nasabah|customer|cif|debitur|debitor|debtor|calon|prospek|prospect|klien|client|borrower|peminjam/i;
  var PRIVATE_ID_RE = /^(lead|leads|nasabah|customer|cif|debitur|calon|prospek)([^a-z]|$)/i;
  var MARKER_FIELDS = ['kind', 'type', 'dataset', 'source', 'layer', 'schema'];
  var PRIVATE_FLAGS = ['private', 'isPrivate', 'sensitive'];
  //  · any of these keys, compared without case or separators ('no_rek', 'NoRek' and 'No. Rek' are one key): customer
  //    identifiers and personal data, and every field of an MCD.leads record (static copy of assets/js/leads.js FIELDS and
  //    STORED_FIELDS; the live lists are added while MCD.leads is loaded). A stop is a fresh {id, kind, label, lon, lat}.
  var PRIVATE_FIELDS = Object.freeze([
    'cif', 'maskedCif', 'cifMasked', 'nik', 'ktp', 'noKk', 'npwp', 'paspor', 'passport',
    'noRek', 'noRekening', 'nomorRekening', 'rekening', 'accountNo', 'accountNumber', 'account', 'noKartu', 'cardNumber',
    'nama', 'namaNasabah', 'namaLengkap', 'namaIbuKandung', 'ibuKandung',
    'telepon', 'telp', 'noTelp', 'noTelepon', 'hp', 'noHp', 'handphone', 'ponsel', 'phone', 'whatsapp', 'email',
    'tanggalLahir', 'tglLahir', 'tempatLahir', 'dob', 'usia', 'umur', 'nrp', 'nip',
    'lead', 'leadId', 'leadRow', 'leadKey', 'nasabah', 'debitur',
    // assets/js/leads.js FIELDS
    'segmen', 'kodeSatuan', 'saldo', 'penghasilan', 'sisaTenorKsm', 'kolektibilitas',
    'tabungan', 'giro', 'deposito', 'ksm', 'kkb', 'kpr', 'kartuKredit', 'livin', 'prioritas',
    // assets/js/leads.js STORED_FIELDS (the rest)
    'key', 'sourceRow', 'fp', 'saldoBand', 'penghasilanBand', 'tenorBand', 'lancar'
  ]);
  var COARSE = { KELURAHAN: 'pusat kelurahan', KECAMATAN: 'pusat kecamatan' };   // GEOCODE_LOCAL.md labels
  var TRAVELMODES = { driving: 1, 'two-wheeler': 1 };   // the Maps URL values the planner may write

  // Generated by tools/calibrate-visit-plan.mjs from data/travel-grid.js; replace the whole block after a grid
  // rebuild (`node tools/calibrate-visit-plan.mjs check` says when). knotsKm: median straight km of each band
  // 0-1, 1-2, 2-3, 3-5, 5-8, 8-12, 12-16 km; ratio: median road km / straight km; minPerKm: median minutes per road km.
  /* CALIBRATION:BEGIN */
  var CAL = {"source":"data/travel-grid.js (2026-10-16), 79339 sel 100 m dengan nilai, 0-16 km dari cabang","knotsKm":[0.71,1.59,2.56,4.13,6.67,10.2,14.13],"mobil":{"ratio":[1.579,1.713,1.61,1.548,1.565,1.58,1.515],"minPerKm":[5.356,3.807,3.394,3.041,2.635,2.255,1.815]},"motor":{"ratio":[1.579,1.713,1.61,1.548,1.554,1.557,1.485],"minPerKm":[5.356,3.807,3.394,3.041,2.694,2.36,2.264]}};
  /* CALIBRATION:END */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function r2(x) { return Math.round(x * 100) / 100; }
  function r1(x) { return Math.round(x * 10) / 10; }

  /* ------------------------------------------------------------ geometry and the leg curve */

  /** [lon, lat] of a point ({lon|lng, lat}), or null when not a valid WGS84 position. Numbers only. */
  function lonLatOf(p) {
    if (!p || typeof p !== 'object') return null;
    var lon = isNum(p.lon) ? p.lon : p.lng, lat = p.lat;
    if (!isNum(lon) || !isNum(lat) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return [lon, lat];
  }

  /** Great-circle km between two {lon, lat} (R = 6371,0088 km, as travel.js). */
  function haversineKm(a, b) {
    var A = lonLatOf(a), B = lonLatOf(b);
    if (!A || !B) return NaN;
    var R = 6371.0088, rad = Math.PI / 180, dp = (B[1] - A[1]) * rad, dl = (B[0] - A[0]) * rad;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(A[1] * rad) * Math.cos(B[1] * rad) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** Value at x of the curve through (0, 0) and the knots (xs[i], ys[i]), linear in between; beyond the last knot it
   *  grows at the last knot's own rate ys / xs. Rising knot values give a rising curve (more km, more minutes). */
  function curve(xs, ys, x) {
    var n = xs.length;
    if (x >= xs[n - 1]) return x * ys[n - 1] / xs[n - 1];
    var x0 = 0, y0 = 0;
    for (var i = 0; i < n; i++) {
      if (x <= xs[i]) return y0 + (x - x0) / (xs[i] - x0) * (ys[i] - y0);
      x0 = xs[i]; y0 = ys[i];
    }
    return y0;
  }

  function modeOf(m) {
    if (m == null || m === '') return 'mobil';
    var s = typeof m === 'string' ? m.trim().toLowerCase() : '';
    return s === 'mobil' || s === 'motor' ? s : null;
  }

  /** Knot values of one mode: road km and minutes at each knot's straight km (the band medians multiplied out). */
  var KNOTS = {};
  MODES.forEach(function (m) {
    var c = CAL[m], km = [], min = [];
    for (var i = 0; i < CAL.knotsKm.length; i++) {
      km.push(CAL.knotsKm[i] * c.ratio[i]);
      min.push(CAL.knotsKm[i] * c.ratio[i] * c.minPerKm[i]);
    }
    KNOTS[m] = { km: km, min: min };
  });

  /** Road km and minutes for a straight-line distance (the calibrated curve). At a knot: straight km × the band's
   *  median ratio, × its median minutes per road km; linear between knots, so a farther stop never costs less. */
  function estimateKm(straightKm, mode) {
    var k = KNOTS[modeOf(mode) || 'mobil'];
    var d = isNum(straightKm) && straightKm > 0 ? straightKm : 0;
    return { kmEst: curve(CAL.knotsKm, k.km, d), minEst: curve(CAL.knotsKm, k.min, d) };
  }

  /** The estimate between two points, either way (symmetric). */
  function legEstimate(a, b, mode) {
    var d = haversineKm(a, b);
    if (!isNum(d)) return { straightKm: null, kmEst: null, minEst: null, source: 'estimate' };
    var e = estimateKm(d, mode);
    return { straightKm: d, kmEst: e.kmEst, minEst: e.minEst, source: 'estimate' };
  }

  function calibration() { return JSON.parse(JSON.stringify(CAL)); }

  /* ------------------------------------------------------------ privacy */

  function normKey(k) { return String(k).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var PRIVATE_SET = {};
  PRIVATE_FIELDS.forEach(function (k) { PRIVATE_SET[normKey(k)] = 1; });

  /** The private key set: the static list, plus MCD.leads FIELDS / STORED_FIELDS when that module is loaded. */
  function privateSet() {
    var L = root && root.MCD && root.MCD.leads, set = PRIVATE_SET, extra = null;
    [L && L.STORED_FIELDS, L && L.FIELDS].forEach(function (list) {
      if (!Array.isArray(list)) return;
      for (var i = 0; i < list.length; i++) {
        if (typeof list[i] !== 'string' || has(PRIVATE_SET, normKey(list[i]))) continue;
        if (!extra) { extra = {}; for (var k in PRIVATE_SET) extra[k] = 1; }
        extra[normKey(list[i])] = 1;
      }
    });
    return extra || set;
  }

  /** A customer word in a marker value: a string, or any string in an array. */
  function markerHit(v) {
    if (typeof v === 'string') return PRIVATE_RE.test(v);
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) if (markerHit(v[i])) return true; }
    return false;
  }

  /** The public kind ('merchant', 'sekolah', …) for a kind string, or null (not on the list: never planned). */
  function kindOf(kind) {
    if (typeof kind !== 'string') return null;
    var k = kind.trim().toLowerCase();
    if (PUBLIC_KINDS.indexOf(k) >= 0) return k;
    return has(KIND_ALIAS, k) ? KIND_ALIAS[k] : null;
  }

  /** True for anything that may be customer data: never planned, never linked (item 49). The backstops of the kind
   *  allowlist: a private flag, a customer word in a marker field or at the start of the id, a non-string kind, or a
   *  customer / lead key (own or inherited). An object that cannot be read counts as private. */
  function isPrivate(stop) {
    if (!stop || typeof stop !== 'object') return false;
    try {
      var i, k;
      for (i = 0; i < PRIVATE_FLAGS.length; i++) if (stop[PRIVATE_FLAGS[i]]) return true;
      if (stop.kind != null && typeof stop.kind !== 'string') return true;
      for (i = 0; i < MARKER_FIELDS.length; i++) if (markerHit(stop[MARKER_FIELDS[i]])) return true;
      if ((typeof stop.id === 'string' || typeof stop.id === 'number') && PRIVATE_ID_RE.test(String(stop.id).trim())) return true;
      var set = privateSet();
      for (k in stop) if (has(set, normKey(k))) return true;                     // enumerable keys, own or inherited
      for (i = 0; i < PRIVATE_FIELDS.length; i++) if (PRIVATE_FIELDS[i] in stop) return true;   // and hidden ones
      return false;
    } catch (e) {
      return true;
    }
  }

  /** null when the point may be planned and linked; 'private' (customer data) or 'invalid-kind' (not a kind on the
   *  public list, no kind at all, or not an object). */
  function checkStop(stop) {
    if (!stop || typeof stop !== 'object' || Array.isArray(stop)) return 'invalid-kind';
    if (isPrivate(stop)) return 'private';
    return kindOf(stop.kind) ? null : 'invalid-kind';
  }

  /** {priv: count of private points, bad: index of the first point not on the public list, or -1}. */
  function screen(list) {
    var priv = 0, bad = -1;
    for (var i = 0; i < list.length; i++) {
      var c = checkStop(list[i]);
      if (c === 'private') priv++;
      else if (c && bad < 0) bad = i;
    }
    return { priv: priv, bad: bad };
  }

  /* ------------------------------------------------------------ text (Bahasa Indonesia) */

  function dec(x, d) { return x.toFixed(d).replace('.', ','); }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  /** '18,4 km', '850 m', '1.234,5 km'; '—' when not a number. */
  function kmText(k) {
    if (!isNum(k)) return '—';
    if (k < 1) {
      var m = k < 0.1 ? Math.round(k * 1000) : Math.round(k * 100) * 10;
      if (m < 1000) return m + ' m';
    }
    var p = dec(k, 1).split(',');
    return thousands(p[0]) + ',' + p[1] + ' km';
  }

  /** '± 9 menit', '± 1 jam 12 menit'; '—' when not a number. */
  function minText(m) {
    if (!isNum(m)) return '—';
    var t = Math.max(1, Math.round(m));
    if (t < 60) return '± ' + t + ' menit';
    var h = Math.floor(t / 60), r = t % 60;
    return '± ' + h + ' jam' + (r ? ' ' + r + ' menit' : '');
  }

  function legText(leg) {
    if (!leg || !isNum(leg.kmEst) || !isNum(leg.minEst)) return '—';
    return kmText(leg.kmEst) + ' · ' + minText(leg.minEst);
  }

  function summary(res) {
    if (!res) return '';
    if (!res.ok) return res.message || '';
    var s = res.count + ' tujuan · ' + kmText(res.totalKmEst) + ' · ' + minText(res.totalMinEst);
    if (res.returnToStart) s += ' · kembali ke titik awal';
    if (res.dwellMin > 0) s += ' · dengan waktu di lokasi ' + minText(res.totalDayMinEst);
    return s + ' (perkiraan, lalu lintas normal)';
  }

  /* ------------------------------------------------------------ refusals */

  function refuse(code, message) {
    return { ok: false, code: code, message: message, order: [], legs: [], totalKmEst: null, totalMinEst: null, method: null };
  }

  function linkRefuse(code, message) {
    return { ok: false, code: code, message: message, links: [], urls: [] };
  }

  var LEAD_TEXT = 'Data nasabah (lead) tidak pernah masuk perencana kunjungan atau tautan Google Maps. ' +
    'Cari nasabah tersebut di sistem bank.';
  var KIND_TEXT = 'bukan tempat umum yang bisa direncanakan. Yang bisa: cabang, merchant, sekolah, kampus dan proyek KPR.';

  /* ------------------------------------------------------------ ordering (pure) */

  function costOf(seq, M, K, closed) {
    var m = 0, k = 0;
    for (var i = 1; i < seq.length; i++) { m += M[seq[i - 1]][seq[i]]; if (K) k += K[seq[i - 1]][seq[i]]; }
    if (closed && seq.length > 1) { m += M[seq[seq.length - 1]][seq[0]]; if (K) k += K[seq[seq.length - 1]][seq[0]]; }
    return m + TIE_KM * k;
  }

  /** Nearest neighbour from 0: always the cheapest unvisited next stop (ties: lower index). */
  function nearestNeighbour(C) {
    var n = C.length, seen = new Array(n), seq = [0], cur = 0;
    seen[0] = true;
    for (var step = 1; step < n; step++) {
      var best = -1, bc = Infinity;
      for (var j = 1; j < n; j++) {
        if (seen[j]) continue;
        if (C[cur][j] < bc - EPS) { bc = C[cur][j]; best = j; }
      }
      seen[best] = true;
      seq.push(best);
      cur = best;
    }
    return seq;
  }

  /** 2-opt on a route that starts at index 0 (fixed). Open path: the end is free; closed: back to 0. First
   *  improvement, scanned in a fixed order, until no reversal saves more than EPS. C must be symmetric. */
  function twoOpt(seq, C, closed) {
    var s = seq.slice(), n = s.length - 1, guard = 0, improved = true;
    while (improved && guard++ < 10000) {
      improved = false;
      for (var i = 1; i < n && !improved; i++) {
        for (var k = i + 1; k <= n && !improved; k++) {
          var prev = s[i - 1], first = s[i], last = s[k];
          var next = k < n ? s[k + 1] : (closed ? s[0] : -1);
          var delta = C[prev][last] - C[prev][first];
          if (next >= 0) delta += C[first][next] - C[last][next];
          if (delta < -EPS) {
            for (var a = i, b = k; a < b; a++, b--) { var t = s[a]; s[a] = s[b]; s[b] = t; }
            improved = true;
          }
        }
      }
    }
    return s;
  }

  /** Orders a square cost matrix (index 0 = start). opts.km: a matching km matrix for ties. Returns the visiting
   *  sequence of indices starting with 0 (without the closing 0), its minutes and which starting order won. */
  function orderByMatrix(minutes, opts) {
    opts = opts || {};
    var n = minutes && minutes.length;
    if (!n) return { seq: [], minutes: 0, improvedFrom: null };
    var K = opts.km || null, closed = !!opts.returnToStart;
    var C = new Array(n);
    for (var i = 0; i < n; i++) {
      C[i] = new Array(n);
      for (var j = 0; j < n; j++) {
        var v = minutes[i] && minutes[i][j], w = K && K[i] ? K[i][j] : 0;
        C[i][j] = i === j ? 0 : (isNum(v) ? v : 1e9) + (isNum(w) ? TIE_KM * w : 0);   // a missing value: never chosen
      }
    }
    var input = [];
    for (var q = 0; q < n; q++) input.push(q);
    if (opts.keepOrder || n <= 2) return { seq: input, minutes: costOf(input, minutes, null, closed), improvedFrom: 'input-order' };
    var a = twoOpt(nearestNeighbour(C), C, closed);
    var b = twoOpt(input, C, closed);
    var ca = costOf(a, C, null, closed), cb = costOf(b, C, null, closed);
    var win = cb < ca - EPS ? b : a;
    return { seq: win, minutes: costOf(win, minutes, null, closed), improvedFrom: win === b ? 'input-order' : 'nearest-neighbour' };
  }

  /* ------------------------------------------------------------ the grid for legs at the branch */

  /** A function point → {km, min, precision, viaToll, grid} from MCD.travel for legs that touch the start, or null
   *  when the grid cannot answer for this start (not loaded, start not at the grid origin, travel === null). */
  function gridLegs(travel, start, mode) {
    if (travel === null) return null;
    var T = travel !== undefined ? travel : (root && root.MCD && root.MCD.travel);
    if (!T || typeof T.at !== 'function' || typeof T.meta !== 'function') return null;
    var meta = null;
    try { meta = T.meta(); } catch (e) { return null; }
    var o = meta && meta.origin;
    if (!o || !lonLatOf(o) || !(haversineKm(o, start) * 1000 <= GRID_ORIGIN_M)) return null;
    return function (p) {
      try {
        var which = typeof T.gridFor === 'function' ? T.gridFor(p.lon, p.lat) : 'inner';
        if (which !== 'inner' && which !== 'outer') return null;
        // only an outer grid that is already loaded: the planner never starts a download
        if (which === 'outer' && !(typeof T.outerReady === 'function' && T.outerReady())) return null;
        var r = T.at(p.lon, p.lat, { grid: which });
        if (!r || r.pending) return null;
        var v = mode === 'motor' ? r.noToll : r;
        if (!v || !isNum(v.km) || !isNum(v.min)) return null;
        return { km: v.km, min: v.min, precision: r.precision, viaToll: mode === 'motor' ? false : !!r.viaToll, grid: which };
      } catch (e) { return null; }
    };
  }

  function peakOf(opts, travel) {
    var f = Number(opts.peakFactor);
    if (opts.peakFactor != null && isNum(f) && f >= 1 && f <= 3) return f;
    var T = travel !== undefined ? travel : (root && root.MCD && root.MCD.travel);
    if (T && typeof T.peakFactor === 'function') {
      try { var g = T.peakFactor(); if (isNum(g) && g >= 1 && g <= 3) return g; } catch (e) { /* default */ }
    }
    return PEAK_DEFAULT;
  }

  /* ------------------------------------------------------------ plan */

  function pointOut(p, seq, role) {
    return { seq: seq, role: role, id: p.id, kind: p.kind, label: p.label, lon: p.lon, lat: p.lat };
  }

  function plan(opts) {
    opts = opts || {};
    var stops = opts.stops;
    if (!Array.isArray(stops)) return refuse('invalid', 'Daftar tujuan tidak terbaca.');
    var start = opts.start == null ? KCP : opts.start;

    // privacy first: one lead refuses the whole plan, whatever else is wrong; then only kinds on the public list
    var sc = screen(stops), s0c = checkStop(start), priv = sc.priv + (s0c === 'private' ? 1 : 0);
    if (priv) return refuse('private', 'Rencana tidak dibuat: ' + priv + ' titik adalah data nasabah. ' + LEAD_TEXT);
    if (s0c) return refuse('invalid-kind', 'Rencana tidak dibuat: titik awal ' + KIND_TEXT);
    if (sc.bad >= 0) return refuse('invalid-kind', 'Rencana tidak dibuat: tujuan ke-' + (sc.bad + 1) + ' ' + KIND_TEXT);
    if (!stops.length) return refuse('empty', 'Pilih minimal satu tujuan.');
    if (stops.length > MAX_STOPS) {
      return refuse('too-many', 'Maksimal ' + MAX_STOPS + ' tujuan dalam satu rencana; yang dipilih ' + stops.length +
        '. Bagi menjadi dua rencana, misalnya pagi dan siang.');
    }
    var mode = modeOf(opts.mode);
    if (!mode) return refuse('invalid-mode', 'Kendaraan harus "mobil" atau "motor".');
    var s0 = lonLatOf(start);
    if (!s0) return refuse('invalid-point', 'Titik awal tidak punya koordinat yang benar.');

    var pts = [{ id: start.id == null ? 'awal' : String(start.id), kind: String(start.kind).trim(),
      label: String(start.label || ''), lon: s0[0], lat: s0[1], geo: null }];
    var ids = {};
    ids[pts[0].id] = true;
    for (var i = 0; i < stops.length; i++) {
      var st = stops[i], ll = lonLatOf(st);
      if (!ll) return refuse('invalid-point', 'Tujuan ke-' + (i + 1) + ' tidak punya koordinat yang benar.');
      var id = st.id == null || st.id === '' ? 't' + (i + 1) : String(st.id);
      if (ids[id]) return refuse('duplicate-id', 'Tujuan ke-' + (i + 1) + ' muncul dua kali (id sama).');
      ids[id] = true;
      pts.push({ id: id, kind: String(st.kind).trim(), label: String(st.label || ''), lon: ll[0], lat: ll[1],
        geo: typeof st.geoPrecision === 'string' ? st.geoPrecision.toUpperCase() : null });
    }

    // symmetric matrices: minutes, km, straight km, source
    var n = pts.length, grid = gridLegs(opts.travel, pts[0], mode);
    var M = [], K = [], D = [], S = [];
    for (var a = 0; a < n; a++) { M.push(new Array(n)); K.push(new Array(n)); D.push(new Array(n)); S.push(new Array(n)); }
    for (a = 0; a < n; a++) {
      M[a][a] = 0; K[a][a] = 0; D[a][a] = 0; S[a][a] = null;
      for (var b = a + 1; b < n; b++) {
        var d = haversineKm(pts[a], pts[b]), g = a === 0 && grid ? grid(pts[b]) : null, leg;
        if (g) leg = { km: g.km, min: g.min, src: { source: 'grid', viaToll: g.viaToll, precision: g.precision } };
        else { var e = estimateKm(d, mode); leg = { km: e.kmEst, min: e.minEst, src: { source: 'estimate' } }; }
        M[a][b] = M[b][a] = leg.min;
        K[a][b] = K[b][a] = leg.km;
        D[a][b] = D[b][a] = d;
        S[a][b] = S[b][a] = leg.src;
      }
    }

    var closed = !!opts.returnToStart;
    var ord = orderByMatrix(M, { km: K, returnToStart: closed, keepOrder: !!opts.keepOrder });
    var seq = ord.seq.slice();
    if (closed) seq.push(0);

    var pf = peakOf(opts, opts.travel);
    var dwell = isNum(Number(opts.dwellMin)) && Number(opts.dwellMin) > 0 ? Math.min(DWELL_MAX, Number(opts.dwellMin)) : 0;
    var order = [], legs = [], warnings = [], totKm = 0, totMin = 0, nGrid = 0, nEst = 0;
    for (var p = 0; p < seq.length; p++) {
      var role = p === 0 ? 'start' : (closed && p === seq.length - 1 ? 'end' : 'stop');
      order.push(pointOut(pts[seq[p]], p, role));
    }
    for (p = 1; p < seq.length; p++) {
      var f = seq[p - 1], t = seq[p], src = S[f][t];
      var lg = {
        from: pts[f].id, to: pts[t].id, fromSeq: p - 1, toSeq: p, straightKm: r2(D[f][t]),
        kmEst: r2(K[f][t]), minEst: r1(M[f][t]), minPeakEst: r1(M[f][t] * pf), source: src.source
      };
      if (src.source === 'grid') { lg.viaToll = src.viaToll; lg.precision = src.precision; nGrid++; } else nEst++;
      if (src.source === 'estimate' && D[f][t] > CAL_MAX_KM) {
        warnings.push({ code: 'long-leg', id: pts[t].id, seq: p,
          message: (order[p].role === 'end' ? 'Perjalanan kembali ke titik awal' : 'Perjalanan ke kunjungan ke-' + p) +
            ' lebih dari ' + CAL_MAX_KM + ' km garis lurus; perkiraannya kasar.' });
      }
      legs.push(lg);
      totKm += lg.kmEst;
      totMin += lg.minEst;
    }
    for (p = 1; p < order.length; p++) {
      if (order[p].role !== 'stop') continue;
      var pt = pts[seq[p]];
      if (D[0][seq[p]] > FAR_KM) {
        warnings.push({ code: 'far-stop', id: pt.id, seq: p,
          message: 'Kunjungan ke-' + p + ' lebih dari ' + FAR_KM + ' km dari titik awal, di luar data jalan dasbor.' });
      }
      if (pt.geo && has(COARSE, pt.geo)) {
        warnings.push({ code: 'coarse-location', id: pt.id, seq: p,
          message: 'Lokasi kunjungan ke-' + p + ' hanya perkiraan (' + COARSE[pt.geo] + '); cek alamat sebelum berangkat.' });
      }
    }
    totKm = r2(totKm);
    totMin = r1(totMin);
    return {
      ok: true, order: order, legs: legs,
      totalKmEst: totKm, totalMinEst: totMin, totalMinPeakEst: r1(totMin * pf),
      totalDayMinEst: r1(totMin + dwell * (n - 1)),
      method: opts.keepOrder ? 'input-order' : (n === 2 ? 'single' : 'nearest-neighbour+2-opt'),
      improvedFrom: opts.keepOrder ? null : (n === 2 ? null : ord.improvedFrom),
      mode: mode, returnToStart: closed, count: n - 1, peakFactor: pf, dwellMin: dwell,
      legSources: { grid: nGrid, estimate: nEst }, warnings: warnings
    };
  }

  /* ------------------------------------------------------------ Google Maps links (coordinates only) */

  /** 'lat,lon' to at most 6 decimals (about 0,1 m), from numbers only. */
  function llText(ll) {
    return String(Number(ll[1].toFixed(6))) + ',' + String(Number(ll[0].toFixed(6)));
  }

  /** opts.maxWaypoints: 1-9 (default 9; 3 for a phone browser without the Google Maps app). opts.travelmode:
   *  'driving' (default) | 'two-wheeler' (Google's motorbike mode, for mode 'motor'; not offered everywhere). */
  function mapsLinks(input, opts) {
    opts = opts || {};
    var maxWp = opts.maxWaypoints == null ? MAX_WAYPOINTS : Number(opts.maxWaypoints);
    if (!(maxWp >= 1 && maxWp <= MAX_WAYPOINTS && Math.floor(maxWp) === maxWp)) maxWp = MAX_WAYPOINTS;
    var tm = has(TRAVELMODES, opts.travelmode) ? opts.travelmode : 'driving';
    var pts;
    if (Array.isArray(input)) pts = input;
    else if (input && typeof input === 'object') {
      if (input.ok === false) {
        return linkRefuse(input.code === 'private' ? 'private' : 'invalid',
          input.code === 'private' ? 'Tautan tidak dibuat. ' + LEAD_TEXT : 'Tautan tidak dibuat: rencana kunjungan belum ada.');
      }
      pts = input.order;
    }
    if (!Array.isArray(pts)) return linkRefuse('invalid', 'Tautan tidak dibuat: rute tidak terbaca.');
    var sc = screen(pts);
    if (sc.priv) return linkRefuse('private', 'Tautan tidak dibuat: ' + sc.priv + ' titik adalah data nasabah. ' + LEAD_TEXT);
    if (sc.bad >= 0) return linkRefuse('invalid-kind', 'Tautan tidak dibuat: titik ke-' + (sc.bad + 1) + ' ' + KIND_TEXT);
    if (pts.length < 2) return linkRefuse('too-few', 'Tautan butuh titik awal dan minimal satu tujuan.');
    if (pts.length > MAX_STOPS + 2) {
      return linkRefuse('too-many', 'Maksimal ' + MAX_STOPS + ' tujuan per rute; rute ini punya ' + (pts.length - 2) + ' tujuan.');
    }
    var lls = [];
    for (var i = 0; i < pts.length; i++) {
      var ll = lonLatOf(pts[i]);
      if (!ll) return linkRefuse('invalid-point', 'Tautan tidak dibuat: titik ke-' + (i + 1) + ' tidak punya koordinat yang benar.');
      lls.push(ll);
    }
    var segs = pts.length - 1, perLink = maxWp + 1;
    var parts = Math.ceil(segs / perLink), base = Math.floor(segs / parts), extra = segs % parts;
    var links = [], s = 0;
    for (var part = 0; part < parts; part++) {
      var e = s + base + (part < extra ? 1 : 0);
      var mid = [];
      for (var j = s + 1; j < e; j++) mid.push(llText(lls[j]));
      var url = 'https://www.google.com/maps/dir/?api=1&origin=' + llText(lls[s]) + '&destination=' + llText(lls[e]) +
        (mid.length ? '&waypoints=' + mid.join('%7C') : '') + '&travelmode=' + tm;
      var ids = [];
      for (j = s; j <= e; j++) ids.push(pts[j].id == null ? null : String(pts[j].id));
      var fromTxt = s === 0 ? 'titik awal' : 'kunjungan ' + s;
      var toTxt = pts[e].role === 'end' ? 'kembali ke titik awal' : 'kunjungan ' + e;
      links.push({
        url: url, part: part + 1, parts: parts, fromSeq: s, toSeq: e, waypoints: mid.length, ids: ids,
        text: (parts > 1 ? 'Bagian ' + (part + 1) + ' dari ' + parts + ': ' : 'Rute: ') + fromTxt + ' → ' + toTxt
      });
      s = e;
    }
    var note = 'Tautan hanya berisi koordinat, tanpa nama tempat. Google Maps menentukan rute sebenarnya.';
    if (parts > 1) {
      note = 'Google Maps menerima paling banyak ' + maxWp + ' titik singgah per tautan, jadi rute dibagi menjadi ' +
        parts + ' tautan. Buka berurutan. ' + note;
    }
    return { ok: true, links: links, urls: links.map(function (l) { return l.url; }), note: note };
  }

  return {
    plan: plan, mapsLinks: mapsLinks, legEstimate: legEstimate, estimateKm: estimateKm, orderByMatrix: orderByMatrix,
    isPrivate: isPrivate, checkStop: checkStop, kindOf: kindOf, haversineKm: haversineKm, calibration: calibration,
    summary: summary, legText: legText, kmText: kmText, minText: minText,
    MAX_STOPS: MAX_STOPS, MAX_WAYPOINTS: MAX_WAYPOINTS, KCP: KCP, MODES: MODES,
    PUBLIC_KINDS: PUBLIC_KINDS, PRIVATE_FIELDS: PRIVATE_FIELDS
  };
});
