/* ==========================================================================
 * MCD.util: shared helpers for Cilangkap Command (BUILD_SPEC §J.4, §B.3).
 *
 *   fmt     id-ID number, money, percent, date, coordinate and distance text (COPY_STYLE_EN item 19)
 *   gmaps   "Buka di Google Maps" links (item 22): url({lat, lon} | {q}) and link(target, opts)
 *   geo     haversine, bearing, destination, circles, local metre grid,
 *           point-in-polygon, bbox, ring/mask GeoJSON builders
 *   prng    seeded mulberry32 stream with the §G.1 helpers
 *   fnv1a   32-bit FNV-1a hash
 *   debounce, throttleRaf, el (safe DOM builder), tween, easing
 *   storage localStorage with try/catch and an in-memory fallback
 *   mask    §K.3 masking (name, NRP, account, salary band, amount band)
 *   fin     exact annuity maths (pv, annuityPayment, outstanding, monthlyRate)
 *   date    UTC-midnight date helpers (parse, addMonths, monthsBetween, ...)
 *   csv     export cells with the §K.3 CSV-injection guard
 *   math    clamp, lerp, round, sum, mean, median, quantile
 *
 * Conventions
 * - Points: either {lat, lon} objects or GeoJSON [lon, lat] arrays. Numeric
 *   four-argument forms are (lat1, lon1, lat2, lon2). Geometry is returned as
 *   GeoJSON [lon, lat]. circle() keeps the spec order circle(lon, lat, km, steps).
 * - Dates are UTC-midnight Date objects or ISO 'YYYY-MM-DD' strings; every
 *   date helper reads UTC parts, so the browser time zone never shifts a day.
 * - Rates are decimals (0.0825 = 8.25% p.a.).
 * - No DOM access at load time. Pure except el(), tween(), storage, debounce.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var LOCALE = 'id-ID';           // COPY_STYLE_EN item 19: decimal comma, thousands point ('38.888', '10,2%')
  var MINUS = '−';
  var DAY_MS = 86400000;
  var R_KM = 6371.0088; // §E.4: R = 6 371 008.8 m
  var DEG = Math.PI / 180;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus',
    'September', 'Oktober', 'November', 'Desember'];
  var WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  // Duck-typed so Dates from another realm (iframe, vm) are recognised.
  function isDate(x) { return !!x && typeof x.getTime === 'function' && typeof x.getUTCFullYear === 'function'; }

  /* =================================================================== math */

  function roundTo(x, d) {
    var f = Math.pow(10, d || 0);
    var r = Math.round(Math.abs(x) * f + 1e-9) / f;
    r = x < 0 ? -r : r;
    return r === 0 ? 0 : r; // never -0
  }

  var math = {
    clamp: function (x, a, b) { return x < a ? a : (x > b ? b : x); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    round: roundTo,
    sum: function (arr, fn) {
      var s = 0;
      for (var i = 0; i < arr.length; i++) { var v = fn ? fn(arr[i], i) : arr[i]; if (isNum(v)) s += v; }
      return s;
    },
    mean: function (arr, fn) {
      var s = 0, n = 0;
      for (var i = 0; i < arr.length; i++) { var v = fn ? fn(arr[i], i) : arr[i]; if (isNum(v)) { s += v; n++; } }
      return n ? s / n : null;
    },
    /** q in [0,1] over an ascending numeric array (linear interpolation). */
    quantile: function (sorted, q) {
      if (!sorted.length) return null;
      var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    },
    median: function (arr, fn) {
      var v = [];
      for (var i = 0; i < arr.length; i++) { var x = fn ? fn(arr[i], i) : arr[i]; if (isNum(x)) v.push(x); }
      v.sort(function (a, b) { return a - b; });
      return math.quantile(v, 0.5);
    }
  };

  /* ==================================================================== fmt */

  var nfCache = {};
  function nf(d) {
    if (!nfCache[d]) nfCache[d] = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
    return nfCache[d];
  }
  /** id-ID grouping with fixed decimals; uses the typographic minus. */
  function num(x, d) {
    d = d == null ? 0 : d;
    var r = roundTo(x, d);
    var s = nf(d).format(Math.abs(r));
    return r < 0 ? MINUS + s : s;
  }

  // Compact money ladder (COPY_STYLE_EN item 19): full digits below 1 jt · jt (1 dp if < 100)
  // · M (2 dp if < 10, else 1) · T (2 dp). 'Rp 12.500' · 'Rp 850 jt' · 'Rp 184,6 M' · 'Rp 1,20 T'.
  var RP_UNITS = [['', 1], ['jt', 1e6], ['M', 1e9], ['T', 1e12]];
  // Older unit names still accepted by opts.unit (count-ups and section code written for en-GB).
  var RP_ALIAS = { rb: '', k: '', mn: 'jt', bn: 'M', tn: 'T', m: 'jt', b: 'M', t: 'T' };
  function rpDecimals(mag, scaled) {
    if (mag === '') return 0;
    if (mag === 'jt') return scaled < 100 ? 1 : 0;
    if (mag === 'M') return scaled < 10 ? 2 : 1;
    return 2;
  }
  function rpUnitIndex(mag) {
    if (Object.prototype.hasOwnProperty.call(RP_ALIAS, mag)) mag = RP_ALIAS[mag];
    for (var i = 0; i < RP_UNITS.length; i++) if (RP_UNITS[i][0] === mag) return i;
    return -1;
  }
  /** Picks unit and decimals for |v| ≥ 1,000,000, promoting when rounding reaches 1,000. */
  function rpCompactUnit(a) {
    var i = a >= 1e12 ? 3 : a >= 1e9 ? 2 : 1;
    for (;;) {
      var u = RP_UNITS[i], s = a / u[1], d = rpDecimals(u[0], s), r = roundTo(s, d);
      var d2 = rpDecimals(u[0], r);
      if (d2 !== d) { d = d2; r = roundTo(s, d); }
      if (r >= 1000 && i < 3) { i++; continue; }
      return { mag: u[0], div: u[1], decimals: d };
    }
  }

  /**
   * Money split into its typographic parts (B.2 "units are companions").
   * opts.full → all digits. opts.unit ('' | 'jt' | 'M' | 'T'; older 'rb' | 'mn' | 'bn' | 'tn')
   * and opts.decimals pin the unit, e.g. for a count-up that keeps the target's unit (§L.2).
   * Returns {sign, cur:'Rp', n, mag, unit:{mag, div, decimals}, text}.
   */
  function rpParts(v, opts) {
    opts = opts || {};
    if (!isNum(v)) return { sign: '', cur: 'Rp', n: '—', mag: '', unit: null, text: '—' };
    var a = Math.abs(v), unit;
    if (opts.full) unit = { mag: '', div: 1, decimals: 0 };
    else if (opts.unit != null) {
      var idx = rpUnitIndex(opts.unit);
      unit = idx <= 0 ? { mag: '', div: 1, decimals: 0 } : { mag: RP_UNITS[idx][0], div: RP_UNITS[idx][1], decimals: 0 };
      unit.decimals = opts.decimals != null ? opts.decimals : (unit.div === 1 ? 0 : rpDecimals(unit.mag, a / unit.div));
    } else if (a < 1e6) unit = { mag: '', div: 1, decimals: 0 };
    else unit = rpCompactUnit(a);
    var r = roundTo(a / unit.div, unit.decimals);
    var sign = (v < 0 && r !== 0) ? MINUS : '';
    var n = nf(unit.decimals).format(r);
    var text = sign + 'Rp ' + n + (unit.mag ? ' ' + unit.mag : '');
    return { sign: sign, cur: 'Rp', n: n, mag: unit.mag, unit: unit, text: text };
  }

  function toDateUTC(d) {
    if (d == null || d === '') return null;
    if (isDate(d)) return isNaN(d.getTime()) ? null : d;
    if (typeof d === 'string') return date.parse(d);
    if (isNum(d)) return new Date(d);
    return null;
  }
  function plural(n, one, many) { return num(n, 0) + ' ' + (Math.abs(n) === 1 ? one : many); }

  var fmt = {
    MONTHS: MONTHS,
    MONTHS_LONG: MONTHS_LONG,
    LEGEND_UNITS: 'jt = juta · M = miliar · T = triliun',

    /** Plain grouped number with d decimals: num(1204.5, 1) → '1.204,5'. */
    num: function (x, d) { return isNum(x) ? num(x, d) : '—'; },

    /** fmt.rp(v) / fmt.rp(v, {compact:true}) → 'Rp 184,6 M'; fmt.rp(v, {full:true}) → 'Rp 312.450.000'. */
    rp: function (v, opts) { return rpParts(v, opts).text; },
    rpParts: rpParts,

    /** fmt.int(1204) → '1.204'. */
    int: function (n) { return isNum(n) ? num(Math.round(n), 0) : '—'; },

    /** fmt.pct(0.462) → '46,2%'. x is a fraction. */
    pct: function (x, d) { return isNum(x) ? num(x * 100, d == null ? 1 : d) + '%' : '—'; },

    /**
     * fmt.delta(0.032) → '▲ 3,2%', fmt.delta(-0.008) → '▼ 0,8%', fmt.delta(0) → '— 0,0%'.
     * opts: number d, or {d, unit:'pp'} for percentage-point deltas ('▲ 1.2 pp').
     * Colour via fmt.deltaDir(x) → 'up' | 'down' | 'flat'.
     */
    delta: function (x, opts) {
      if (!isNum(x)) return '—';
      var o = typeof opts === 'number' ? { d: opts } : (opts || {});
      var d = o.d == null ? 1 : o.d;
      var r = roundTo(x * 100, d);
      var glyph = r > 0 ? '▲' : (r < 0 ? '▼' : '—');
      return glyph + ' ' + nf(d).format(Math.abs(r)) + (o.unit === 'pp' ? ' pp' : '%');
    },
    deltaDir: function (x, d) {
      if (!isNum(x)) return 'flat';
      var r = roundTo(x * 100, d == null ? 1 : d);
      return r > 0 ? 'up' : (r < 0 ? 'down' : 'flat');
    },

    /** fmt.months(108) → '108 bulan'; fmt.months(108, {long:true}) → '9 tahun'; 111 → '9 tahun 3 bulan'. */
    months: function (m, opts) {
      if (!isNum(m)) return '—';
      var n = Math.round(m);
      if (!(opts && opts.long)) return plural(n, 'bulan', 'bulan');
      var neg = n < 0; n = Math.abs(n);
      var y = Math.floor(n / 12), r = n % 12;
      var s = y > 0 ? (plural(y, 'tahun', 'tahun') + (r ? ' ' + plural(r, 'bulan', 'bulan') : '')) : plural(r, 'bulan', 'bulan');
      return neg ? MINUS + s : s;
    },

    /**
     * fmt.date('2026-10-12') → '12 Okt 2026'. opts.short → '12 Okt'; opts.long → '12 Oktober 2026';
     * opts.weekday → 'Sen, 12 Okt 2026'.
     */
    date: function (d, opts) {
      var x = toDateUTC(d);
      if (!x) return '—';
      var o = opts || {};
      var m = (o.long ? MONTHS_LONG : MONTHS)[x.getUTCMonth()];
      return (o.weekday ? WEEKDAYS[x.getUTCDay()] + ', ' : '') + x.getUTCDate() + ' ' + m + (o.short ? '' : ' ' + x.getUTCFullYear());
    },

    /** fmt.month('2026-10-12') or fmt.month('2026-10') → 'Okt 26' (chart axes); {long:true} → 'Okt 2026'. */
    month: function (d, opts) {
      if (typeof d === 'string' && /^\d{4}-\d{2}$/.test(d)) d = d + '-01';
      var x = toDateUTC(d);
      if (!x) return '—';
      return MONTHS[x.getUTCMonth()] + ' ' + (opts && opts.long ? x.getUTCFullYear() : String(x.getUTCFullYear()).slice(-2));
    },

    /** Time of day in WIB (UTC+7), 24-hour with a point: '08.14'. */
    time: function (d) {
      var x = toDateUTC(d);
      if (!x) return '—';
      var w = new Date(x.getTime() + 7 * 3600000);
      return pad2(w.getUTCHours()) + '.' + pad2(w.getUTCMinutes());
    },
    /** Timestamp in WIB: '12 Okt 2026 08.14 WIB'. */
    dateTime: function (d) {
      /* a full ISO time ("2026-10-16T02:11:25.000Z", e.g. importedAt) keeps its clock time; date.parse would drop it */
      var t = typeof d === 'string' && /T\d\d:\d\d/.test(d) ? Date.parse(d) : NaN;
      var x = isNaN(t) ? toDateUTC(d) : new Date(t);
      if (!x) return '—';
      var w = new Date(x.getTime() + 7 * 3600000);
      return w.getUTCDate() + ' ' + MONTHS[w.getUTCMonth()] + ' ' + w.getUTCFullYear() + ' ' +
        pad2(w.getUTCHours()) + '.' + pad2(w.getUTCMinutes()) + ' WIB';
    },

    /** fmt.coord(-6.33512, 106.90031) → '6.33512° LS · 106.90031° BT' (GIS point decimal, as Google Maps shows it). */
    coord: function (lat, lon, d) {
      if (!isNum(lat) || !isNum(lon)) return '—';
      d = d == null ? 5 : d;
      return Math.abs(lat).toFixed(d) + '° ' + (lat < 0 ? 'LS' : 'LU') + ' · ' +
        Math.abs(lon).toFixed(d) + '° ' + (lon < 0 ? 'BB' : 'BT');
    },

    /** fmt.km(0.85) → '850 m'; fmt.km(2.4) → '2,4 km'; fmt.km(2) → '2,0 km'. */
    km: function (dKm) {
      if (!isNum(dKm)) return '—';
      var a = Math.abs(dKm);
      if (a < 1) {
        var m = a < 0.1 ? Math.round(a * 1000) : Math.round(a * 100) * 10;
        if (m < 1000) return num(m, 0) + ' m';
      }
      return num(a, 1) + ' km';
    }
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* =================================================================== date */

  var MONTH_LOOKUP = (function () {
    var o = {};
    var names = [
      ['jan', 'januari', 'january'], ['feb', 'februari', 'february', 'pebruari'], ['mar', 'maret', 'march'],
      ['apr', 'april'], ['mei', 'may'], ['jun', 'juni', 'june'], ['jul', 'juli', 'july'],
      ['agu', 'agt', 'ags', 'agustus', 'aug', 'august'], ['sep', 'sept', 'september'],
      ['okt', 'oktober', 'oct', 'october'], ['nov', 'nopember', 'november'], ['des', 'desember', 'dec', 'december']
    ];
    names.forEach(function (list, i) { list.forEach(function (n) { o[n] = i; }); });
    return o;
  })();

  function utc(y, m, d) {
    var x = new Date(Date.UTC(y, m, d));
    if (y >= 0 && y < 100) x.setUTCFullYear(y);
    return x;
  }
  function validYmd(y, m, d) {
    if (!(m >= 0 && m <= 11) || !(d >= 1 && d <= 31)) return null;
    var x = utc(y, m, d);
    return (x.getUTCMonth() === m && x.getUTCDate() === d) ? x : null;
  }
  function year2(y) { return y < 100 ? (y <= 30 ? 2000 + y : 1900 + y) : y; }

  var date = {
    /**
     * Parses 'YYYY-MM-DD' (time part ignored), 'YYYY-MM', 'YYYYMMDD', 'DD/MM/YYYY',
     * 'DD-MM-YYYY', 'DD.MM.YY', '12 Okt 2026', Excel serial numbers (< 100000) and
     * Date objects. Returns a UTC-midnight Date or null.
     */
    parse: function (v) {
      if (v == null || v === '') return null;
      if (isDate(v)) {
        if (isNaN(v.getTime())) return null;
        return utc(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
      }
      if (isNum(v)) {
        if (v > 0 && v < 100000) { // Excel serial (1900 date system, Lotus leap-year bug absorbed by the 1899-12-30 epoch)
          var t = Date.UTC(1899, 11, 30) + Math.floor(v) * DAY_MS;
          var e = new Date(t);
          return utc(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
        }
        return date.parse(new Date(v));
      }
      var s = String(v).trim(), m;
      if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s))) return validYmd(+m[1], +m[2] - 1, +m[3]);
      if ((m = /^(\d{4})-(\d{1,2})$/.exec(s))) return validYmd(+m[1], +m[2] - 1, 1);
      if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return validYmd(+m[1], +m[2] - 1, +m[3]);
      if ((m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/.exec(s))) return validYmd(year2(+m[3]), +m[2] - 1, +m[1]);
      if ((m = /^(\d{1,2})[\s\-]+([A-Za-z]+)\.?[\s\-]+(\d{2}|\d{4})$/.exec(s))) {
        var mi = MONTH_LOOKUP[m[2].toLowerCase()];
        return mi == null ? null : validYmd(year2(+m[3]), mi, +m[1]);
      }
      return null;
    },
    /** 'YYYY-MM-DD' (UTC parts). */
    ymd: function (d) {
      var x = toDateUTC(d);
      if (!x) return null;
      var y = x.getUTCFullYear();
      return (y < 1000 ? ('000' + y).slice(-4) : y) + '-' + pad2(x.getUTCMonth() + 1) + '-' + pad2(x.getUTCDate());
    },
    /** 'YYYY-MM'. */
    ym: function (d) { var s = date.ymd(d); return s ? s.slice(0, 7) : null; },
    /** Adds n calendar months, clamping the day to the target month's end. */
    addMonths: function (d, n) {
      var x = toDateUTC(d);
      if (!x) return null;
      var y = x.getUTCFullYear(), m = x.getUTCMonth() + n, day = x.getUTCDate();
      var ty = y + Math.floor(m / 12), tm = ((m % 12) + 12) % 12;
      var last = utc(ty, tm + 1, 0).getUTCDate();
      return utc(ty, tm, Math.min(day, last));
    },
    addDays: function (d, n) { var x = toDateUTC(d); return x ? new Date(x.getTime() + n * DAY_MS) : null; },
    /** Whole months from a to b (negative when b < a); a day-of-month not yet reached does not count. */
    monthsBetween: function (a, b) {
      var x = toDateUTC(a), y = toDateUTC(b);
      if (!x || !y) return null;
      var sign = 1;
      if (y < x) { var t = x; x = y; y = t; sign = -1; }
      var n = (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth());
      if (y.getUTCDate() < x.getUTCDate()) n -= 1;
      return sign * n;
    },
    /** Whole days b − a. */
    daysBetween: function (a, b) {
      var x = toDateUTC(a), y = toDateUTC(b);
      return (x && y) ? Math.round((y.getTime() - x.getTime()) / DAY_MS) : null;
    },
    firstOfNextMonth: function (d) { var x = toDateUTC(d); return x ? utc(x.getUTCFullYear(), x.getUTCMonth() + 1, 1) : null; },
    startOfMonth: function (d) { var x = toDateUTC(d); return x ? utc(x.getUTCFullYear(), x.getUTCMonth(), 1) : null; },
    startOfYear: function (d) { var x = toDateUTC(d); return x ? utc(x.getUTCFullYear(), 0, 1) : null; },
    daysInMonth: function (d) { var x = toDateUTC(d); return x ? utc(x.getUTCFullYear(), x.getUTCMonth() + 1, 0).getUTCDate() : null; },
    /** §H.1 pace = day(asOf) / daysInMonth(asOf). */
    pace: function (d) { var x = toDateUTC(d); return x ? x.getUTCDate() / date.daysInMonth(x) : null; },
    /** Decimal years from birth to asOf. */
    ageYears: function (birth, asOf) {
      var b = toDateUTC(birth), a = toDateUTC(asOf);
      return (b && a) ? (a.getTime() - b.getTime()) / (365.2425 * DAY_MS) : null;
    },
    /** Today's calendar date in WIB as a UTC-midnight Date. */
    today: function () {
      var w = new Date(Date.now() + 7 * 3600000);
      return utc(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
    }
  };

  /* ==================================================================== geo */

  function toPt(a) {
    if (a == null) return null;
    if (Array.isArray(a)) return { lon: +a[0], lat: +a[1] };
    var lon = a.lon != null ? a.lon : (a.lng != null ? a.lng : a.longitude);
    var lat = a.lat != null ? a.lat : a.latitude;
    return { lat: +lat, lon: +lon };
  }
  /** Normalises (lat1, lon1, lat2, lon2) or (p, q) into two {lat, lon} points. */
  function twoPts(args) {
    if (typeof args[0] === 'number') return [{ lat: args[0], lon: args[1] }, { lat: args[2], lon: args[3] }];
    return [toPt(args[0]), toPt(args[1])];
  }
  function defaultOrigin() {
    var c = MCD.config && MCD.config.branch;
    return c ? { lat: c.lat, lon: c.lon } : { lat: -6.33203, lon: 106.90989 };
  }
  var M_PER_DEG = R_KM * 1000 * DEG;

  var geo = {
    R_KM: R_KM,
    toPoint: toPt,
    /** haversineKm(lat1, lon1, lat2, lon2) or haversineKm(p, q). */
    haversineKm: function () {
      var p = twoPts(arguments), a = p[0], b = p[1];
      var dLat = (b.lat - a.lat) * DEG, dLon = (b.lon - a.lon) * DEG;
      var s = Math.sin(dLat / 2), t = Math.sin(dLon / 2);
      var h = s * s + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * t * t;
      return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
    },
    /** Initial bearing in degrees [0, 360), same argument forms as haversineKm. */
    bearingDeg: function () {
      var p = twoPts(arguments), a = p[0], b = p[1];
      var f1 = a.lat * DEG, f2 = b.lat * DEG, dl = (b.lon - a.lon) * DEG;
      var y = Math.sin(dl) * Math.cos(f2);
      var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
      return (Math.atan2(y, x) / DEG + 360) % 360;
    },
    /** destination(lat, lon, bearingDeg, km) or destination(p, bearingDeg, km) → [lon, lat]. */
    destination: function () {
      var p, brg, km;
      if (typeof arguments[0] === 'number') { p = { lat: arguments[0], lon: arguments[1] }; brg = arguments[2]; km = arguments[3]; }
      else { p = toPt(arguments[0]); brg = arguments[1]; km = arguments[2]; }
      var d = km / R_KM, th = brg * DEG, f1 = p.lat * DEG, l1 = p.lon * DEG;
      var f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(th));
      var l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
      return [((l2 / DEG + 540) % 360) - 180, f2 / DEG];
    },
    /** circle(lon, lat, km, steps=128) or circle(p, km, steps) → closed ring of steps+1 [lon, lat]. */
    circle: function () {
      var c, km, steps;
      if (typeof arguments[0] === 'number') { c = { lon: arguments[0], lat: arguments[1] }; km = arguments[2]; steps = arguments[3]; }
      else { c = toPt(arguments[0]); km = arguments[1]; steps = arguments[2]; }
      steps = steps || 128;
      var ring = [];
      for (var i = 0; i < steps; i++) ring.push(geo.destination(c, (360 * i) / steps, km));
      ring.push(ring[0].slice());
      return ring;
    },
    /** localXY(lat, lon, origin?) or localXY(p, origin?) → [x east m, y north m]; origin defaults to MCD.config.branch. */
    localXY: function () {
      var p, o;
      if (typeof arguments[0] === 'number') { p = { lat: arguments[0], lon: arguments[1] }; o = arguments[2]; }
      else { p = toPt(arguments[0]); o = arguments[1]; }
      o = o ? toPt(o) : defaultOrigin();
      return [(p.lon - o.lon) * Math.cos(o.lat * DEG) * M_PER_DEG, (p.lat - o.lat) * M_PER_DEG];
    },
    /** fromLocalXY(x, y, origin?) → [lon, lat]. */
    fromLocalXY: function (x, y, origin) {
      var o = origin ? toPt(origin) : defaultOrigin();
      return [o.lon + x / (Math.cos(o.lat * DEG) * M_PER_DEG), o.lat + y / M_PER_DEG];
    },
    /** Veil (§K.4): centre of the cellM grid cell around p in the local metre grid → [lon, lat]. */
    snap: function (p, cellM, origin) {
      var xy = geo.localXY(p, origin), c = cellM || 250;
      return geo.fromLocalXY((Math.floor(xy[0] / c) + 0.5) * c, (Math.floor(xy[1] / c) + 0.5) * c, origin);
    },
    /**
     * Ray-casting test. p: {lat, lon} or [lon, lat]. poly: a ring [[lon, lat]…],
     * an array of rings (first outer, rest holes), or a GeoJSON Polygon / Feature.
     */
    pointInPolygon: function (p, poly) {
      var q = toPt(p);
      if (!poly) return false;
      if (poly.type === 'Feature') poly = poly.geometry;
      if (poly.type === 'Polygon') poly = poly.coordinates;
      var rings = (Array.isArray(poly[0]) && Array.isArray(poly[0][0])) ? poly : [poly];
      var inside = false;
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r], hit = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
          if (((yi > q.lat) !== (yj > q.lat)) && (q.lon < (xj - xi) * (q.lat - yi) / (yj - yi) + xi)) hit = !hit;
        }
        if (r === 0) inside = hit; else if (hit) return false;
      }
      return inside;
    },
    /** [[minLon, minLat], [maxLon, maxLat]] over points, rings or nested coordinate arrays. */
    bbox: function (coords) {
      var b = [[Infinity, Infinity], [-Infinity, -Infinity]];
      (function walk(c) {
        if (c == null) return;
        if (!Array.isArray(c)) { var p = toPt(c); add(p.lon, p.lat); return; }
        if (typeof c[0] === 'number') { add(c[0], c[1]); return; }
        for (var i = 0; i < c.length; i++) walk(c[i]);
      })(coords);
      function add(x, y) {
        if (!isNum(x) || !isNum(y)) return;
        if (x < b[0][0]) b[0][0] = x; if (y < b[0][1]) b[0][1] = y;
        if (x > b[1][0]) b[1][0] = x; if (y > b[1][1]) b[1][1] = y;
      }
      return isFinite(b[0][0]) ? b : null;
    },
    /** Planar area in hectares of a [lon, lat] ring (local projection; accurate at this scale). */
    areaHa: function (ring) {
      var o = toPt(ring[0]), s = 0;
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var a = geo.localXY(toPt(ring[j]), o), b = geo.localXY(toPt(ring[i]), o);
        s += a[0] * b[1] - b[0] * a[1];
      }
      return Math.abs(s / 2) / 10000;
    },
    /** Area-weighted centroid of a [lon, lat] ring → {lat, lon}. */
    centroid: function (ring) {
      var o = toPt(ring[0]), A = 0, cx = 0, cy = 0;
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var a = geo.localXY(toPt(ring[j]), o), b = geo.localXY(toPt(ring[i]), o);
        var f = a[0] * b[1] - b[0] * a[1];
        A += f; cx += (a[0] + b[0]) * f; cy += (a[1] + b[1]) * f;
      }
      A /= 2;
      var ll = geo.fromLocalXY(cx / (6 * A), cy / (6 * A), o);
      return { lat: ll[1], lon: ll[0] };
    },
    /**
     * Ring LineStrings for the E.2 `rings` source:
     * ringFeatures(center, [1,3,5], {steps:128, activeKm, set, outerKm}) → FeatureCollection
     * with properties {km, active, set, outer}.
     */
    ringFeatures: function (center, radiiKm, opts) {
      var o = opts || {};
      return {
        type: 'FeatureCollection',
        features: (radiiKm || []).map(function (km) {
          return {
            type: 'Feature',
            properties: { km: km, active: o.activeKm === km, set: o.set || 'default', outer: o.outerKm === km },
            geometry: { type: 'LineString', coordinates: geo.circle(center, km, o.steps || 128) }
          };
        })
      };
    },
    /** Focus mask (§E.2): the world polygon with a hole of radius km around center. */
    maskPolygon: function (center, km, steps) {
      var world = [[-180, -85.05], [180, -85.05], [180, 85.05], [-180, 85.05], [-180, -85.05]];
      return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world, geo.circle(center, km, steps || 128).reverse()] } };
    }
  };

  /* ================================================================== prng */

  /**
   * Seeded stream (§G.1 mulberry32). R() and R.u() are uniform [0,1).
   * R.n(mu, sd) Box–Muller · R.int(a, b) inclusive · R.pick(arr) · R.wpick(items, weights)
   * R.clampN(mu, sd, min, max) resample ≤ 8 tries then clamp · R.disk(radiusM) → [dx, dy] m
   * R.chance(p) · R.range(a, b) · R.shuffle(arr) in place.
   */
  function prng(seed) {
    var a = seed >>> 0;
    function u() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    var R = function () { return u(); };
    R.u = u;
    R.range = function (lo, hi) { return lo + (hi - lo) * u(); };
    R.int = function (lo, hi) { return lo + Math.floor(u() * (hi - lo + 1)); };
    R.chance = function (p) { return u() < p; };
    R.n = function (mu, sd) {
      var u1 = 1 - u(), u2 = u();
      return (mu || 0) + (sd == null ? 1 : sd) * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    R.clampN = function (mu, sd, min, max) {
      var lo = min == null ? -Infinity : min, hi = max == null ? Infinity : max, x = mu;
      for (var i = 0; i < 8; i++) { x = R.n(mu, sd); if (x >= lo && x <= hi) return x; }
      return x < lo ? lo : (x > hi ? hi : x);
    };
    R.pick = function (arr) { return arr.length ? arr[Math.floor(u() * arr.length)] : undefined; };
    R.wpick = function (items, weights) {
      var total = 0, i;
      for (i = 0; i < items.length; i++) total += Math.max(0, weights[i] || 0);
      if (!(total > 0)) return null;
      var r = u() * total;
      for (i = 0; i < items.length; i++) { r -= Math.max(0, weights[i] || 0); if (r < 0) return items[i]; }
      return items[items.length - 1];
    };
    R.disk = function (radiusM) {
      var r = radiusM * Math.sqrt(u()), th = 2 * Math.PI * u();
      return [r * Math.cos(th), r * Math.sin(th)];
    };
    R.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(u() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    };
    return R;
  }

  /* ================================================================= fnv1a */

  /** 32-bit FNV-1a over UTF-16 code units → unsigned integer. fnv1a.hex(s) → 8 hex chars. */
  function fnv1a(str) {
    var h = 0x811c9dc5, s = String(str);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  fnv1a.hex = function (str) { return ('0000000' + fnv1a(str).toString(16)).slice(-8); };

  /* ======================================================= timing helpers */

  function debounce(fn, ms) {
    var t = null, lastArgs, lastThis;
    function run() { t = null; fn.apply(lastThis, lastArgs); }
    function d() {
      lastArgs = arguments; lastThis = this;
      if (t) clearTimeout(t);
      t = setTimeout(run, ms || 0);
    }
    d.cancel = function () { if (t) clearTimeout(t); t = null; };
    d.flush = function () { if (t) { clearTimeout(t); run(); } };
    return d;
  }

  var raf = function (cb) {
    return (root.requestAnimationFrame ? root.requestAnimationFrame(cb) : setTimeout(function () { cb(now()); }, 16));
  };
  var caf = function (id) { if (root.cancelAnimationFrame) root.cancelAnimationFrame(id); else clearTimeout(id); };
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }

  /** Calls fn at most once per animation frame with the latest arguments. */
  function throttleRaf(fn) {
    var id = null, lastArgs, lastThis;
    function t() {
      lastArgs = arguments; lastThis = this;
      if (id == null) id = raf(function () { id = null; fn.apply(lastThis, lastArgs); });
    }
    t.cancel = function () { if (id != null) caf(id); id = null; };
    return t;
  }

  function reducedMotion() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  /* ================================================================ easing */

  /** CSS cubic-bezier(x1, y1, x2, y2) as a function of t in [0, 1]. */
  function cubicBezier(x1, y1, x2, y2) {
    function bx(t) { return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t; }
    function by(t) { return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t; }
    function dbx(t) { return 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x, i;
      for (i = 0; i < 8; i++) {
        var e = bx(t) - x;
        if (Math.abs(e) < 1e-6) return by(t);
        var dv = dbx(t);
        if (Math.abs(dv) < 1e-6) break;
        t -= e / dv;
      }
      var lo = 0, hi = 1; t = x;
      for (i = 0; i < 30; i++) {
        var v = bx(t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return by(t);
    };
  }

  var easing = {
    linear: function (t) { return t; },
    outExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    camera: cubicBezier(0.65, 0, 0.35, 1),   // --ease-camera (§E.10)
    enter: cubicBezier(0.16, 1, 0.3, 1),     // --ease-enter
    standard: cubicBezier(0.2, 0, 0, 1),     // --ease-standard
    exit: cubicBezier(0.4, 0, 1, 1),         // --ease-exit
    cubicBezier: cubicBezier
  };

  /* ================================================================= tween */

  /**
   * tween({from, to, duration=600, easing='enter'|fn, delay=0, onUpdate(v, t), onDone()})
   * Numbers or equal-length numeric arrays. Under prefers-reduced-motion (or
   * duration ≤ 0, or reduced:true) it jumps to `to` synchronously.
   * Returns {cancel()}.
   */
  function tween(o) {
    var from = o.from, to = o.to, dur = o.duration == null ? 600 : o.duration;
    var ease = typeof o.easing === 'function' ? o.easing : (easing[o.easing || 'enter'] || easing.enter);
    var isArr = Array.isArray(to);
    function at(k) {
      if (!isArr) return from + (to - from) * k;
      var out = new Array(to.length);
      for (var i = 0; i < to.length; i++) out[i] = from[i] + (to[i] - from[i]) * k;
      return out;
    }
    var cancelled = false, id = null, timer = null;
    var handle = { cancel: function () { cancelled = true; if (id != null) caf(id); if (timer) clearTimeout(timer); } };
    if (dur <= 0 || o.reduced || reducedMotion()) {
      if (o.onUpdate) o.onUpdate(at(1), 1);
      if (o.onDone) o.onDone();
      return handle;
    }
    var start = null;
    function frame(ts) {
      if (cancelled) return;
      var t = ts == null ? now() : ts;
      if (start == null) start = t;
      var p = Math.min(1, (t - start) / dur);
      if (o.onUpdate) o.onUpdate(at(ease(p)), p);
      if (p < 1) id = raf(frame);
      else if (o.onDone) o.onDone();
    }
    if (o.delay > 0) timer = setTimeout(function () { id = raf(frame); }, o.delay);
    else id = raf(frame);
    return handle;
  }

  /* ==================================================================== el */

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SVG_TAGS = { svg: 1, g: 1, path: 1, rect: 1, circle: 1, line: 1, polyline: 1, polygon: 1, text: 1, tspan: 1,
    use: 1, defs: 1, clipPath: 1, linearGradient: 1, radialGradient: 1, stop: 1, symbol: 1, title: 1, mask: 1, pattern: 1, ellipse: 1 };
  var FORBIDDEN_PROPS = { innerHTML: 1, outerHTML: 1, insertAdjacentHTML: 1, srcdoc: 1 };

  function appendKids(node, kids) {
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c == null || c === false || c === true) continue;
      if (Array.isArray(c)) { appendKids(node, c); continue; }
      if (typeof c === 'string' && c.indexOf('\n') >= 0 && node.namespaceURI === HTML_NS) appendLines(node, c);
      else if (typeof c === 'string' || typeof c === 'number') node.appendChild(root.document.createTextNode(String(c)));
      else node.appendChild(c);
    }
  }
  /* Copy deck (COPY_DECK_ID §How to use): "\n" in a tip or note is a new line, drawn as <br>, never one long line. */
  var HTML_NS = 'http://www.w3.org/1999/xhtml';
  var NO_BR = { OPTION: 1, TEXTAREA: 1, TITLE: 1, SCRIPT: 1, STYLE: 1 };
  function appendLines(node, s) {
    String(s).split('\n').forEach(function (line, i) {
      if (i) node.appendChild(root.document.createElement('br'));
      node.appendChild(root.document.createTextNode(line));
    });
    return node;
  }

  function build(isSvg, tag, props, kids) {
    var doc = root.document;
    var node = isSvg ? doc.createElementNS(SVG_NS, tag) : doc.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v == null || v === false) return;
      if (FORBIDDEN_PROPS[k]) throw new Error('MCD.util.el: ' + k + ' is not allowed (use text or children)');
      if (k === 'class' || k === 'className') {
        var cls = Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v);
        if (cls) node.setAttribute('class', cls);
      } else if (k === 'text') {
        var tx = String(v);
        if (!isSvg && tx.indexOf('\n') >= 0 && !NO_BR[node.nodeName] && node.namespaceURI === HTML_NS) { node.textContent = ''; appendLines(node, tx); }
        else node.textContent = tx;
      } else if (k === 'style' && typeof v === 'object') {
        Object.keys(v).forEach(function (s) { if (v[s] != null) node.style.setProperty(s.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), String(v[s])); });
      } else if (k === 'dataset' || k === 'data') {
        Object.keys(v).forEach(function (d) { if (v[d] != null) node.setAttribute('data-' + d.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), String(v[d])); });
      } else if (k === 'aria') {
        Object.keys(v).forEach(function (a) { if (v[a] != null) node.setAttribute('aria-' + a, String(v[a])); });
      } else if (k === 'attrs') {
        Object.keys(v).forEach(function (a) { if (v[a] != null && v[a] !== false) node.setAttribute(a, v[a] === true ? '' : String(v[a])); });
      } else if (k === 'on') {
        Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      } else if (k.length > 2 && k.slice(0, 2) === 'on' && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (!isSvg && k in node && typeof v !== 'object') {
        node[k] = v;
      } else {
        node.setAttribute(k, v === true ? '' : String(v));
      }
    });
    appendKids(node, kids);
    return node;
  }

  /**
   * Safe DOM builder (§J.1): el('button', {class:'chip', type:'button', aria:{pressed:'true'},
   * on:{click: fn}}, 'KPR'). Strings become text nodes; innerHTML is refused.
   * Props: class|className (string|array), text, style {}, dataset|data {}, aria {}, attrs {},
   * on {event: fn} or onClick: fn, other keys → DOM property when present, else attribute.
   * SVG: el('svg', …) and its children via el.svg(tag, …) (or any tag in the SVG set).
   */
  function el(tag, props) {
    var kids = Array.prototype.slice.call(arguments, 2);
    var isSvg = tag.indexOf('svg:') === 0;
    if (isSvg) tag = tag.slice(4);
    else isSvg = SVG_TAGS[tag] === 1 && tag !== 'title'; // 'title' stays HTML unless el.svg / 'svg:title'
    return build(isSvg, tag, props, kids);
  }
  el.svg = function (tag, props) {
    return build(true, tag, props, Array.prototype.slice.call(arguments, 2));
  };

  /** Sprite icon (§B.5): <svg class="i …"><use href="#i-name"/></svg>, aria-hidden. */
  function icon(name, cls) {
    var use = el.svg('use', { href: '#i-' + name });
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);
    return el.svg('svg', { class: ['icon', 'i', 'i-' + name, cls], width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false' }, use);
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  /* =============================================================== storage */

  var memStore = {};
  function ls() { try { var s = root.localStorage; if (s) { s.getItem('mcd.probe'); return s; } } catch (e) { /* blocked */ } return null; }
  var storage = {
    /** JSON value at key, or fallback. Never throws. */
    get: function (key, fallback) {
      var raw = null, s = ls();
      try { raw = s ? s.getItem(key) : (Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null); }
      catch (e) { raw = Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null; }
      if (raw == null) return fallback;
      try { return JSON.parse(raw); } catch (e2) { return fallback; }
    },
    /** Stores JSON; returns true when persisted to localStorage, false when kept in memory only. */
    set: function (key, value) {
      var raw;
      try { raw = JSON.stringify(value); } catch (e) { return false; }
      var s = ls();
      if (s) { try { s.setItem(key, raw); return true; } catch (e2) { /* quota or blocked */ } }
      memStore[key] = raw;
      return false;
    },
    remove: function (key) {
      delete memStore[key];
      var s = ls();
      if (s) { try { s.removeItem(key); } catch (e) { /* ignore */ } }
    },
    /** Keys that start with prefix (localStorage and memory). */
    keys: function (prefix) {
      var out = {}, s = ls(), i;
      if (s) { try { for (i = 0; i < s.length; i++) { var k = s.key(i); if (k && (!prefix || k.indexOf(prefix) === 0)) out[k] = 1; } } catch (e) { /* ignore */ } }
      Object.keys(memStore).forEach(function (k) { if (!prefix || k.indexOf(prefix) === 0) out[k] = 1; });
      return Object.keys(out);
    },
    available: function () { return !!ls(); }
  };

  /* ================================================================== mask */

  function rankShort(p) {
    if (!p) return '';
    var code = p.rankCode;
    var r = code && MCD.ref && MCD.ref.rankByCode && MCD.ref.rankByCode[code];
    if (r && r.short) return r.short;
    if (!code) return '';
    return String(code).charAt(0) + String(code).slice(1).toLowerCase();
  }
  function nameParts(name) {
    var s = String(name || '').split(',')[0];
    return s.split(/\s+/).filter(function (t) {
      if (!t) return false;
      if (/\.$/.test(t) && t.replace(/[^A-Za-z]/g, '').length <= 3) return false; // H., Hj., Dr., Ir.
      return /[A-Za-zÀ-ɏ]/.test(t);
    }).map(function (t) { return t.replace(/^[^A-Za-zÀ-ɏ]+/, ''); }).slice(0, 3);
  }
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }

  function bandText(lo, hi, unit) { return 'Rp ' + lo + '–' + hi + ' ' + unit; }

  var mask = {
    /**
     * name(p, mode): mode 'masked' (default) → 'Serma A*** S***' · 'veil' → 'Serma A. S.' ·
     * 'reveal' → 'Serma Ahmad Subagyo'. p = {name, rankCode}.
     */
    name: function (p, mode) {
      var rank = rankShort(p), parts = nameParts(p && p.name), body;
      if (mode === 'reveal') body = String((p && p.name) || '').trim();
      else if (mode === 'veil') body = parts.map(function (t) { return t.charAt(0).toUpperCase() + '.'; }).join(' ');
      else body = parts.map(function (t) { return t.charAt(0).toUpperCase() + '***'; }).join(' ');
      var out = (rank ? rank + ' ' : '') + body;
      return out.trim() || '—';
    },
    /** nrp(s, mode): '***' + last 4 digits · veil → '—' · reveal → full. */
    nrp: function (s, mode) {
      if (s == null || s === '') return '—';
      if (mode === 'reveal') return String(s);
      if (mode === 'veil') return '—';
      var d = digits(s), tail = d.length ? d.slice(-4) : String(s).slice(-4);
      return '***' + (String(s).length > 4 ? tail : '');
    },
    /** account(s, mode): '•••• 4821' · veil → '—' · reveal → full. */
    account: function (s, mode) {
      if (s == null || s === '') return '—';
      if (mode === 'reveal') return String(s);
      if (mode === 'veil') return '—';
      var d = digits(s);
      return '•••• ' + (d.length ? d.slice(-4) : String(s).slice(-4));
    },
    /** Net salary band (§K.3): Rp 1 jt steps, 5 jt steps from 20 jt → 'Rp 7–8 jt'. */
    salaryBand: function (v) {
      if (!isNum(v)) return '—';
      var j = Math.max(0, v) / 1e6, lo, hi;
      if (j >= 20) { lo = Math.floor(j / 5) * 5; hi = lo + 5; } else { lo = Math.floor(j); hi = lo + 1; }
      return bandText(lo, hi, 'jt');
    },
    /** Facility amount band for Veil (§K.3): 'Rp 250–300 jt', 'Rp 1,25–1,5 M'. */
    amountBand: function (v) {
      if (!isNum(v)) return '—';
      var a = Math.max(0, v), j = a / 1e6, step;
      if (j < 100) {
        step = j < 10 ? 1 : 10;
        var lo = Math.floor(j / step) * step;
        return bandText(lo, lo + step, 'jt');
      }
      if (j < 1000) { var l2 = Math.floor(j / 50) * 50; return l2 + 50 >= 1000 ? 'Rp 950 jt–1 M' : bandText(l2, l2 + 50, 'jt'); }
      var m = a / 1e9; step = m < 10 ? 0.25 : 5;
      var l3 = Math.floor(m / step) * step, f = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
      return 'Rp ' + f.format(l3) + '–' + f.format(l3 + step) + ' M';
    },
    /** Coordinates by mode: veil → 'lokasi disamarkan (±250 m)'. */
    coord: function (lat, lon, mode, d) {
      if (mode === 'veil') {
        var c = (MCD.config && MCD.config.veilCellM) || 250;
        return 'lokasi disamarkan (±' + c + ' m)';
      }
      return fmt.coord(lat, lon, d);
    },
    initials: function (name) { return nameParts(name).map(function (t) { return t.charAt(0).toUpperCase(); }).join(''); }
  };

  /* =================================================================== fin */

  var fin = {
    /**
     * Monthly rate from an annual decimal rate. convention 'effective' (default,
     * §H.2: r = (1 + a)^(1/12) − 1) or 'nominal' (a / 12, the KPR brochure convention).
     */
    monthlyRate: function (annual, convention) {
      if (!isNum(annual)) return null;
      return convention === 'nominal' ? annual / 12 : Math.pow(1 + annual, 1 / 12) - 1;
    },
    /** PV of n payments of pmt at monthly rate r (§H.2). */
    pv: function (pmt, r, n) {
      if (!isNum(pmt) || !(n > 0)) return 0;
      if (!r) return pmt * n;
      return pmt * (1 - Math.pow(1 + r, -n)) / r;
    },
    /** Level instalment that amortises principal over n months at monthly rate r. */
    annuityPayment: function (principal, r, n) {
      if (!isNum(principal) || !(n > 0)) return 0;
      if (!r) return principal / n;
      return principal * r / (1 - Math.pow(1 + r, -n));
    },
    /** Balance after k of n instalments (k clamped to [0, n]). */
    outstanding: function (principal, r, n, k) {
      if (!isNum(principal) || !(n > 0)) return 0;
      var kk = Math.max(0, Math.min(n, Math.floor(k || 0)));
      if (kk >= n) return 0;
      if (!r) return principal * (1 - kk / n);
      var g = Math.pow(1 + r, kk);
      return Math.max(0, principal * g - fin.annuityPayment(principal, r, n) * (g - 1) / r);
    },
    /** Months needed to repay principal with instalment pmt (Infinity if pmt ≤ interest). */
    nper: function (principal, r, pmt) {
      if (!(pmt > 0)) return Infinity;
      if (!r) return principal / pmt;
      var x = 1 - principal * r / pmt;
      return x <= 0 ? Infinity : -Math.log(x) / Math.log(1 + r);
    }
  };

  /* =================================================================== csv */

  var csv = {
    /** One CSV cell: quotes when needed; prefixes ' to cells starting with = + - @ or tab (§K.3). */
    cell: function (v) {
      if (v == null) return '';
      var s = String(v);
      if (/^[=+\-@\t]/.test(s)) s = "'" + s;
      return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    },
    row: function (arr) { return arr.map(csv.cell).join(','); }
  };

  /* ================================================================== gmaps */
  /* "Buka di Google Maps" (COPY_STYLE_EN item 22, UX fix plan §2.8): a point by its coordinates only (5 decimals;
     nothing about a bank customer is sent), a kecamatan by name and kota. Plain navigation in a new tab. */
  var GMAPS_BASE = 'https://www.google.com/maps/search/?api=1&query=';
  var GMAPS_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  var GMAPS_APPROX = 'Titik perkiraan di tengah kelurahan. File LVM tidak memuat koordinat.';
  function gmCoord(v) {
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  function gmR5(v) { var t = String(Math.round(v * 1e5) / 1e5); return t === '-0' ? '0' : t; }
  var gmaps = {
    TIP: GMAPS_TIP,
    APPROX_NOTE: GMAPS_APPROX,
    /** url({lat, lon} | {q}) → string | null (no link without a valid place). */
    url: function (t) {
      if (!t || typeof t !== 'object') return null;
      if (t.q != null) { var q = String(t.q).replace(/\s+/g, ' ').trim(); return q ? GMAPS_BASE + encodeURIComponent(q) : null; }
      var lat = gmCoord(t.lat), lon = gmCoord(t.lon);
      if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) return null;
      return GMAPS_BASE + gmR5(lat) + ',' + gmR5(lon);
    },
    /** link(target, {approx, label, compact, ariaLabel, className}) → <a target=_blank rel="noopener noreferrer"> | null */
    link: function (t, opts) {
      opts = opts || {};
      var url = gmaps.url(t), d = root.document;
      if (!url || !d) return null;
      var approx = !!(opts.approx || (t && t.approx));
      var label = opts.label || (approx ? 'Buka area di Google Maps' : 'Buka di Google Maps');
      var a = el('a', { class: 'btn btn--secondary gmaps-link' + (opts.compact ? ' gmaps-link--icon' : '') + (opts.className ? ' ' + opts.className : ''),
        href: url, target: '_blank', rel: 'noopener noreferrer', title: (approx ? GMAPS_APPROX + ' ' : '') + GMAPS_TIP,
        aria: opts.compact ? { label: opts.ariaLabel || label } : null }, icon('external'), opts.compact ? null : el('span', { text: label }));
      return a;
    }
  };

  MCD.util = {
    gmaps: gmaps,
    fmt: fmt,
    geo: geo,
    prng: prng,
    fnv1a: fnv1a,
    debounce: debounce,
    throttleRaf: throttleRaf,
    el: el,
    icon: icon,
    clear: clear,
    tween: tween,
    easing: easing,
    storage: storage,
    mask: mask,
    fin: fin,
    date: date,
    csv: csv,
    math: math,
    reducedMotion: reducedMotion,
    now: now
  };
})(window.MCD = window.MCD || {});
