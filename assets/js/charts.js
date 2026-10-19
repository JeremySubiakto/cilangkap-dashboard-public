/* ==========================================================================
 * MCD.charts: hand-built D3/SVG (+ canvas) chart primitives
 * Cilangkap Command · Bank Mandiri KCP Jakarta Cilangkap
 * Spec: docs/BUILD_SPEC.md §B.7 (chart style), §C.8.1 (KPI tile), §C.8.3
 * (tables), §D.7 (cross-highlight), §J.4 (API), §L.2 (count-up), §L.5 (a11y);
 * docs/BUILD_SPEC_SME_ADDENDUM.md §7.3–7.4; docs/BUILD_SPEC_PROPERTY_LEADERBOARD.md
 * §9.7 (amortisation), §13.3 (podium), §13.6 (calendar, funnel), §14.1 (motion).
 *
 * ---------------------------------------------------------------------------
 * CONTRACT
 * ---------------------------------------------------------------------------
 * Every chart factory has the shape
 *
 *     const h = MCD.charts.<name>(el, data, cfg);
 *     h.update(data?, cfg?)   re-render; cfg merges shallowly into the previous cfg
 *     h.highlight(key|null)   cross-highlight (§D.7): non-matching marks drop to 30 %
 *     h.showTable(on?)        toggles the accessible "Show table" data table (§L.5)
 *     h.resize()              forces a re-measure (normally ResizeObserver does it)
 *     h.destroy()             removes DOM, observers, listeners and timers
 *     h.el                    the chart root element (div.mc-chart)
 *
 * The chart owns `el` (its content is replaced). If `el` has a CSS height the
 * chart fills it; otherwise it uses cfg.height or a per-chart default.
 * Common cfg keys: label (accessible name), ariaLabel (override summary),
 * format ('rp' | 'rpFull' | 'int' | 'pct' | 'pct0' | 'pp' | 'num' | 'num1' | fn),
 * onHover(payload|null), onClick(payload, event), animate (default true),
 * tableToggle (true = visually hidden until focused, 'visible', false),
 * demo (true when the chart draws the bank's own figures: a "DEMO" mark is shown
 * while the Demo data switch is on; leave it out for public sourced data).
 * Percentages are always RATIOS (0.462 → "46.2%").
 *
 * Exceptions to the (el, data, cfg) shape, kept from §J.4:
 *     kpiTile(el, cfg)                    also accepts (el, data, cfg)
 *     table(el, {columns, rows, ...})     also accepts (el, rows, cfg)
 *     countUp(el, from, to, fmt)          → { stop(), finished: Promise }
 *
 * Colours are read from tokens.css through getComputedStyle (§M.7); the
 * literals below are the fallbacks used only when a token is not defined.
 * Text is always written with textContent; no innerHTML anywhere (§J.1, §K.5).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = window;
  var D = document;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var VERSION = '1.0.0';

  /* ──────────────────────────────────────────────────────────────────────
   * 1. Tokens (read live; fallbacks mirror tokens.css §B.1)
   * ────────────────────────────────────────────────────────────────────── */
  var FALLBACK = {
    'canvas': '#05080F', 'surface-glass': 'rgba(10, 17, 31, 0.76)', 'surface-glass-hi': 'rgba(10, 17, 31, 0.88)',
    'surface-sheet': 'rgba(9, 15, 27, 0.95)', 'surface-solid': '#0E1626', 'surface-raised': '#121C2E',
    'surface-hover': '#141E31', 'surface-well': '#080D18', 'brand-navy': '#003D79', 'navy-deep': '#00244A', 'navy-wash': '#04122A',
    'rule': 'rgba(214, 224, 240, 0.08)', 'rule-strong': 'rgba(214, 224, 240, 0.14)', 'rule-gold': 'rgba(242, 183, 5, 0.32)',
    'rule-platinum': 'rgba(201, 209, 220, 0.30)', 'rule-signal': 'rgba(56, 214, 232, 0.55)',
    'text-1': '#EDEFF3', 'text-2': '#A7B0C0', 'text-3': '#7C879A', 'text-off': '#4B5568', 'text-on-gold': '#1A1405',
    'gold': '#F2B705', 'gold-soft': '#FFE7A1', 'gold-brand': '#FFB700', 'gold-a10': 'rgba(242, 183, 5, 0.10)',
    'gold-a16': 'rgba(242, 183, 5, 0.16)', 'platinum': '#C9D1DC', 'platinum-a10': 'rgba(201, 209, 220, 0.10)',
    'signal': '#38D6E8', 'signal-a20': 'rgba(56, 214, 232, 0.20)',
    'pos': '#4CC38A', 'neg': '#F26D5B', 'warn': '#E8A13A', 'info': '#6CC4E0',
    'kol-1': '#4CC38A', 'kol-2': '#E8A13A', 'kol-3': '#F2925B', 'kol-4': '#F26D5B', 'kol-5': '#C8475E',
    'p-ksm': '#5AA9FF', 'p-kpr': '#3FC1A5', 'p-kkb': '#E8875B', 'p-cc': '#B58CFF', 'p-mg': '#EF7A9A', 'p-pen': '#B8D35A', 'p-oth': '#8F99AB',
    'st-whitespace': '#F2B705', 'st-prospect': '#8F99AB',
    'heat-0': '#2A1B3D', 'heat-1': '#5A2A4E', 'heat-2': '#8E3B47', 'heat-3': '#C2573A', 'heat-4': '#E68A2E', 'heat-5': '#F2B705', 'heat-6': '#FFE7A1',
    'div-neg-2': '#F26D5B', 'div-neg-1': '#9C4A42', 'div-mid': '#2B3445', 'div-pos-1': '#2E6E8E', 'div-pos-2': '#6CC4E0',
    'plat-0': '#1A2333', 'plat-1': '#3A4A63', 'plat-2': '#6F819E', 'plat-3': '#AEBBCD', 'plat-4': '#EEF2F7',
    'b-merchant': '#E9EDF2', 'b-giro': '#A7B4C6', 'b-payroll': '#7E97BA',
    'bank-bsi': '#5A6B88', 'bank-bni': '#4A5873', 'bank-bri': '#3D495F', 'bank-btn': '#334055', 'bank-bjb': '#6B5A4A', 'bank-oth': '#2B3445',
    'prop-principal': '#5AA9FF', 'prop-interest': '#FFB547', 'prop-balance': '#E8EEF8',
    'metal': '#F2B705', 'metal-rule': 'rgba(242, 183, 5, 0.32)',
    'font-serif': '"Source Serif 4", "Iowan Old Style", Georgia, serif',
    'font-sans': '"Inter Tight", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    'font-mono': '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'dur-hover': '140ms', 'dur-xhl': '180ms', 'dur-num': '600ms', 'dur-grow': '900ms'
  };
  /* Leaderboard calendar ramp (property/leaderboard addendum §2.5). */
  var CIVIDIS = ['#00224E', '#35456C', '#666970', '#948E77', '#C8B866', '#FEE838'];
  /* Restrained metals for the podium (addendum §2.5 --lb-metal-1/2/3). */
  var METALS = {
    1: ['#F3DE9A', '#C9A24B', '#9C7A2C'],
    2: ['#E9EEF3', '#AEB8C4', '#7E8896'],
    3: ['#E8B992', '#B27447', '#7E4A29']
  };

  var tokCache = Object.create(null);

  function readVar(node, name) {
    try { return W.getComputedStyle(node).getPropertyValue('--' + name).trim(); } catch (e) { return ''; }
  }

  /* Sections whose metal is platinum (tokens.css: body[data-section=…]). --metal is a
     registered colour that cross-fades in 300 ms, so charts resolve the TARGET metal from
     the section instead of reading the mid-transition computed value. */
  var PLATINUM_SECTIONS = { business: 1, data: 1, sme: 1, schools: 1 };

  /** Resolve a design token ("gold", "--gold", "text-2"). Section metal follows body[data-section]. */
  function tok(name, node) {
    name = String(name).replace(/^--/, '');
    if (name === 'metal' || name === 'metal-rule') {
      var sec = D.body && D.body.getAttribute('data-section');
      if (sec) {
        var plat = !!PLATINUM_SECTIONS[sec];
        return name === 'metal' ? tok(plat ? 'platinum' : 'gold') : tok(plat ? 'rule-platinum' : 'rule-gold');
      }
      return readVar(node || D.body || D.documentElement, name) || FALLBACK[name];
    }
    var c = tokCache[name];
    if (c) return c;
    var v = readVar(D.documentElement, name);
    if (v) { tokCache[name] = v; return v; }
    return FALLBACK[name] || '';
  }

  function refreshTokens() { tokCache = Object.create(null); }

  function parseColor(c) {
    c = String(c || '').trim();
    var m = /^#([0-9a-f]{3,8})$/i.exec(c);
    if (m) {
      var hx = m[1];
      if (hx.length === 3 || hx.length === 4) hx = hx.split('').map(function (ch) { return ch + ch; }).join('');
      var n = parseInt(hx.slice(0, 6), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: hx.length === 8 ? parseInt(hx.slice(6), 16) / 255 : 1 };
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    return null;
  }

  function alpha(c, a) {
    var p = parseColor(c);
    if (!p) return c;
    return 'rgba(' + p.r + ', ' + p.g + ', ' + p.b + ', ' + (+(p.a * a).toFixed(3)) + ')';
  }

  /* Product and status glyph table (§B.5). */
  var PRODUCTS = {
    KSM: { label: 'KSM', token: 'p-ksm', shape: 'circle' },
    KPR: { label: 'KPR', token: 'p-kpr', shape: 'square' },
    KKB: { label: 'KKB', token: 'p-kkb', shape: 'diamond' },
    CC: { label: 'Kartu kredit', token: 'p-cc', shape: 'triangle' },
    MG: { label: 'Multiguna', token: 'p-mg', shape: 'hexagon' },
    PEN: { label: 'Pensiun', token: 'p-pen', shape: 'star' },
    OTH: { label: 'Lainnya', token: 'p-oth', shape: 'dash' },
    WHITESPACE: { label: 'Belum tergarap', token: 'gold', shape: 'ring' },
    PROSPECT: { label: 'Prospek', token: 'st-prospect', shape: 'diamond-o' },
    DEBITUR: { label: 'Debitur', token: 'text-2', shape: 'circle' },
    MERCHANT: { label: 'Merchant', token: 'b-merchant', shape: 'square' },
    GIRO: { label: 'Giro', token: 'b-giro', shape: 'diamond' },
    PAYROLL: { label: 'Payroll', token: 'b-payroll', shape: 'ring' }
  };
  var PRODUCT_ORDER = ['KSM', 'KPR', 'KKB', 'CC', 'MG', 'PEN', 'OTH'];
  /* Payroll share bars: Mandiri first, then other banks in slate (§C.5.3). */
  var KEY_TOKENS = {
    MANDIRI: 'plat-4', MDR: 'plat-4', BSI: 'bank-bsi', BNI: 'bank-bni', BRI: 'bank-bri', BTN: 'bank-btn',
    BJB: 'bank-bjb', LAINNYA: 'bank-oth', OTHER: 'bank-oth', PESAING: 'bank-oth'
  };

  /** Resolve a colour spec: product code, token name ("gold", "--gold") or CSS colour. */
  function color(x, node) {
    if (x == null || x === '') return tok('text-2');
    if (typeof x !== 'string') return String(x);
    if (PRODUCTS[x]) return tok(PRODUCTS[x].token, node);
    if (KEY_TOKENS[x]) return tok(KEY_TOKENS[x], node);
    if (/^--/.test(x) || /^[a-z][a-z0-9-]*$/.test(x)) return tok(x, node) || x;
    return x;
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 2. Number and date formatting (§B.3; MCD.util.fmt preferred when present)
   * ────────────────────────────────────────────────────────────────────── */
  var MINUS = '−';
  var NF = Object.create(null);
  function nf(d) {
    return NF[d] || (NF[d] = new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }));
  }
  function num(v, d) {
    d = d == null ? 0 : d;
    v = +v || 0;
    var neg = v < 0 && Math.abs(v) >= 0.5 * Math.pow(10, -d);
    return (neg ? MINUS : '') + nf(d).format(Math.abs(v));
  }

  var RP_UNITS = [
    /* COPY_STYLE_EN item 19: 'Rp 12.500' · 'Rp 850 jt' · 'Rp 184,6 M' · 'Rp 1,2 T' */
    { lim: 1e6, div: 1, mag: '', word: '', dec: function () { return 0; } },
    { lim: 1e9, div: 1e6, mag: 'jt', word: 'juta', dec: function (a) { return a < 1e7 ? 1 : 0; } },
    { lim: 1e12, div: 1e9, mag: 'M', word: 'miliar', dec: function (a) { return a < 1e10 ? 2 : 1; } },
    { lim: Infinity, div: 1e12, mag: 'T', word: 'triliun', dec: function () { return 2; } }
  ];
  function rpUnit(a) {
    for (var i = 0; i < RP_UNITS.length; i++) {
      var u = RP_UNITS[i];
      if (a < u.lim) {
        var dec = u.dec(a);
        var p = Math.pow(10, dec);
        var rounded = Math.round(a / u.div * p) / p;
        if (rounded * u.div >= u.lim && i < RP_UNITS.length - 1) continue; // 999.96 mn → 1.00 bn
        return { u: u, dec: dec };
      }
    }
    return { u: RP_UNITS[RP_UNITS.length - 1], dec: 2 };
  }
  /** Split Rupiah into companion parts; `ref` fixes the unit (count-up rule §L.2). */
  function rpParts(v, ref) {
    v = +v || 0;
    var basis = Math.abs(ref != null && isFinite(ref) ? +ref : v);
    var r = rpUnit(basis);
    var scaled = Math.abs(v) / r.u.div;
    var neg = v < 0 && scaled >= 0.5 * Math.pow(10, -r.dec);
    return { sign: neg ? MINUS : '', cur: 'Rp', num: nf(r.dec).format(scaled), mag: r.u.mag, word: r.u.word };
  }
  function rpCompact(v, ref) {
    var p = rpParts(v, ref);
    return p.sign + 'Rp ' + p.num + (p.mag ? ' ' + p.mag : '');
  }
  function rpFull(v) {
    v = +v || 0;
    return (v < 0 ? MINUS : '') + 'Rp ' + nf(0).format(Math.round(Math.abs(v)));
  }
  function rpSpoken(v) {
    var p = rpParts(v);
    return p.sign + 'Rp ' + p.num + (p.word ? ' ' + p.word : '');
  }

  function utilFmt() { return MCD.util && MCD.util.fmt; }

  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  function toDate(k) {
    if (k instanceof Date) return k;
    if (typeof k === 'number') return new Date(k);
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(k || ''));
    if (m) return new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1);
    return null;
  }
  function isMonthKey(k) { return k instanceof Date || /^\d{4}-\d{2}/.test(String(k)); }

  var fmt = {
    rp: function (v, o) {
      o = o || {};
      var u = utilFmt();
      if (u && typeof u.rp === 'function' && o.ref == null) {
        try {
          var s = u.rp(v, o.full ? { full: true } : { compact: true });
          if (typeof s === 'string' && s) return s;
        } catch (e) { /* fall through to the local formatter */ }
      }
      return o.full ? rpFull(v) : rpCompact(v, o.ref);
    },
    int: function (v) {
      var u = utilFmt();
      if (u && typeof u.int === 'function') {
        try { var s = u.int(Math.round(+v || 0)); if (typeof s === 'string' && s) return s; } catch (e) { /* local */ }
      }
      return num(Math.round(+v || 0), 0);
    },
    num: num,
    pct: function (x, d) { return num((+x || 0) * 100, d == null ? 1 : d) + '%'; },
    pp: function (x, d) { return num((+x || 0) * 100, d == null ? 1 : d) + ' pp'; },
    month: function (k) { var d = toDate(k); return d ? BULAN[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) : String(k); },
    monthLong: function (k) { var d = toDate(k); return d ? BULAN[d.getMonth()] + ' ' + d.getFullYear() : String(k); },
    monthSpoken: function (k) { var d = toDate(k); return d ? BULAN_PANJANG[d.getMonth()] + ' ' + d.getFullYear() : String(k); },
    date: function (k) { var d = toDate(k); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : String(k); },
    day: function (k) { var d = toDate(k); return d ? HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : String(k); },
    rpSpoken: rpSpoken,
    rpParts: rpParts,
    /** Delta with glyph (§B.3). kind: 'pct' (ratio) | 'pp' | 'int' | 'rp' | 'num'. */
    delta: function (x, kind, opt) {
      opt = opt || {};
      x = +x || 0;
      var d = opt.d == null ? 1 : opt.d;
      var mag;
      switch (kind) {
        case 'pp': mag = num(Math.abs(x) * 100, d) + ' pp'; break;
        case 'int': mag = num(Math.abs(x), 0); break;
        case 'rp': mag = rpCompact(Math.abs(x)); break;
        case 'num': mag = num(Math.abs(x), d); break;
        default: mag = num(Math.abs(x) * 100, d) + '%';
      }
      var scaled = (kind === 'int' || kind === 'num' || kind === 'rp') ? Math.abs(x) : Math.abs(x) * 100;
      var zero = scaled < 0.5 * Math.pow(10, -(kind === 'int' ? 0 : d));
      var sign = zero ? 0 : (x > 0 ? 1 : -1);
      var good = opt.invert ? -sign : sign;
      return {
        text: (sign > 0 ? '▲ ' : sign < 0 ? '▼ ' : '— ') + mag,
        cls: good > 0 ? 'mc-pos' : good < 0 ? 'mc-neg' : 'mc-flat',
        sign: sign
      };
    }
  };

  /** Build a formatter from a spec. `ref` fixes the Rupiah unit (count-up). */
  function formatter(spec, ref) {
    if (typeof spec === 'function') return spec;
    switch (spec) {
      case 'rp': return function (v) { return ref != null ? rpCompact(v, ref) : fmt.rp(v); };
      case 'rpFull': return function (v) { return fmt.rp(v, { full: true }); };
      case 'pct': return function (v) { return fmt.pct(v, 1); };
      case 'pct0': return function (v) { return fmt.pct(v, 0); };
      case 'pct2': return function (v) { return fmt.pct(v, 2); };
      case 'pp': return function (v) { return fmt.pp(v, 1); };
      case 'num': return function (v) { return num(v, 0); };
      case 'num1': return function (v) { return num(v, 1); };
      case 'num2': return function (v) { return num(v, 2); };
      case 'int': return fmt.int;
      default: return fmt.int;
    }
  }
  /** Axis variant: same ladder, trailing zero decimals removed ("Rp 5,00 M" → "Rp 5 M"). */
  function axisFmt(f) {
    return function (v) {
      /* trims trailing zeros of the decimal part only ("Rp 20,0 M" → "Rp 20 M"); thousands ("1.000") stay.
         The decimal mark follows the formatter in use (comma for id-ID, point for en-GB). */
      var s = String(f(v)), dm = decimalMark();
      var re = dm === ',' ? /,(\d+)/ : /\.(\d+)/;
      return s.replace(re, function (m, d) { var t = d.replace(/0+$/, ''); return t ? dm + t : ''; });
    };
  }
  function decimalMark() {
    var u = utilFmt(), probe = '';
    try { probe = u && typeof u.num === 'function' ? String(u.num(1.5, 1)) : num(1.5, 1); } catch (e) { probe = num(1.5, 1); }
    return /,5/.test(probe) ? ',' : '.';
  }
  /** Long-form for screen readers ("Rp 5,4 miliar"). */
  function spoken(spec) {
    if (spec === 'rp') return rpSpoken;
    return formatter(spec);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 3. Motion (tokens §B.1 / §L; prefers-reduced-motion always wins)
   * ────────────────────────────────────────────────────────────────────── */
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    function dx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    function solve(x) {
      var t = x, i, e, d;
      for (i = 0; i < 8; i++) {
        e = sx(t) - x;
        if (Math.abs(e) < 1e-6) return t;
        d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      var lo = 0, hi = 1;
      t = x;
      for (i = 0; i < 30; i++) {
        e = sx(t);
        if (Math.abs(e - x) < 1e-6) return t;
        if (x > e) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    }
    return function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)); };
  }
  var EASE = {
    enter: bezier(0.16, 1, 0.3, 1),
    standard: bezier(0.2, 0, 0, 1),
    exit: bezier(0.4, 0, 1, 1),
    camera: bezier(0.65, 0, 0.35, 1),
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); }
  };
  var DUR = { bar: 420, stagger: 12, ring: 800, morph: 300, flip: 400, sweep: 600, cell: 160, cellStagger: 8 };

  function reducedMotion() {
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function tokMs(name, fb) {
    var v = tok(name);
    var m = /^([\d.]+)\s*(ms|s)?$/.exec(v || '');
    if (!m) return fb;
    return m[2] === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
  }
  /** rAF tween. Returns cancel(). Duration 0 → onUpdate(1) synchronously. */
  function tween(dur, ease, onUpdate, onDone) {
    if (!dur || dur <= 0) { onUpdate(1); if (onDone) onDone(); return function () {}; }
    var raf = 0, t0 = 0, stopped = false;
    function step(t) {
      if (stopped) return;
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      onUpdate((ease || EASE.enter)(p));
      if (p < 1) raf = W.requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    raf = W.requestAnimationFrame(step);
    return function () { stopped = true; W.cancelAnimationFrame(raf); };
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 4. DOM helpers (textContent only)
   * ────────────────────────────────────────────────────────────────────── */
  var UID = 0;
  function uid(p) { UID += 1; return 'mc-' + (p || 'x') + '-' + UID; }

  function h(tag, attrs, kids) {
    var n = D.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style') {
          Object.keys(v).forEach(function (sk) {
            if (sk.indexOf('--') === 0) n.style.setProperty(sk, v[sk]); else n.style[sk] = v[sk];
          });
        } else if (k === 'on') Object.keys(v).forEach(function (ev) { n.addEventListener(ev, v[ev]); });
        else n.setAttribute(k, v === true ? '' : String(v));
      });
    }
    append(n, kids);
    return n;
  }
  function append(n, kids) {
    if (kids == null) return n;
    (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'object' ? c : D.createTextNode(String(c)));
    });
    return n;
  }
  function svgEl(tag, attrs) {
    var n = D.createElementNS(SVGNS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null) return;
        if (k === 'text') n.textContent = v; else n.setAttribute(k, String(v));
      });
    }
    return n;
  }

  var measureCtx = null;
  function textW(str, font) {
    if (!measureCtx) measureCtx = D.createElement('canvas').getContext('2d');
    measureCtx.font = font;
    return measureCtx.measureText(String(str)).width;
  }
  function fontMono(px, w) { return (w || 400) + ' ' + (px || 10) + 'px ' + tok('font-mono'); }
  function fontSans(px, w) { return (w || 400) + ' ' + (px || 12) + 'px ' + tok('font-sans'); }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function crisp(v) { return Math.round(v) + 0.5; }
  function maxOf(arr, f) { var m = -Infinity; arr.forEach(function (d, i) { var v = f ? f(d, i) : d; if (v != null && isFinite(v) && v > m) m = v; }); return m === -Infinity ? 0 : m; }
  function minOf(arr, f) { var m = Infinity; arr.forEach(function (d, i) { var v = f ? f(d, i) : d; if (v != null && isFinite(v) && v < m) m = v; }); return m === Infinity ? 0 : m; }
  function sum(arr, f) { var s = 0; arr.forEach(function (d, i) { var v = f ? f(d, i) : d; if (v != null && isFinite(v)) s += +v; }); return s; }
  function keyOf(d, i) { return d == null ? String(i) : String(d.key != null ? d.key : d.id != null ? d.id : d.label != null ? d.label : i); }

  /* ──────────────────────────────────────────────────────────────────────
   * 5. Glyphs (§B.5) and small shared builders
   * ────────────────────────────────────────────────────────────────────── */
  function glyphPath(shape, size) {
    var r = size / 2, k, pts, i, a;
    switch (shape) {
      case 'square': k = r * 0.84; return 'M' + -k + ',' + -k + 'H' + k + 'V' + k + 'H' + -k + 'Z';
      case 'diamond': case 'diamond-o': return 'M0,' + -r + 'L' + r + ',0L0,' + r + 'L' + -r + ',0Z';
      case 'triangle': return 'M0,' + (-r) + 'L' + r + ',' + (r * 0.78) + 'L' + -r + ',' + (r * 0.78) + 'Z';
      case 'hexagon':
        pts = [];
        for (i = 0; i < 6; i++) { a = Math.PI / 3 * i - Math.PI / 2; pts.push((r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2)); }
        return 'M' + pts.join('L') + 'Z';
      case 'star':
        k = r * 0.3;
        return 'M0,' + -r + 'L' + k + ',' + -k + 'L' + r + ',0L' + k + ',' + k + 'L0,' + r + 'L' + -k + ',' + k + 'L' + -r + ',0L' + -k + ',' + -k + 'Z';
      case 'dash': k = Math.max(0.75, r * 0.26); return 'M' + -r + ',' + -k + 'H' + r + 'V' + k + 'H' + -r + 'Z';
      default: return 'M' + r + ',0A' + r + ',' + r + ' 0 1,1 ' + -r + ',0A' + r + ',' + r + ' 0 1,1 ' + r + ',0Z';
    }
  }
  function isHollow(shape) { return shape === 'ring' || shape === 'diamond-o'; }

  /** Inline glyph <svg> for a product/status code or shape name. */
  function glyph(code, opts) {
    opts = opts || {};
    var size = opts.size || 10;
    var p = PRODUCTS[code];
    var shape = opts.shape || (p ? p.shape : code) || 'circle';
    var col = opts.color ? color(opts.color) : p ? tok(p.token) : tok('text-2');
    var svg = svgEl('svg', { width: size, height: size, viewBox: [-size / 2, -size / 2, size, size].join(' '), class: 'mc-glyph', 'aria-hidden': 'true', focusable: 'false' });
    var hollow = isHollow(shape);
    var inner = hollow ? size - 2 : size;
    svg.appendChild(svgEl('path', {
      d: glyphPath(shape, inner),
      fill: hollow ? 'none' : col,
      stroke: hollow ? col : 'none',
      'stroke-width': hollow ? 1.25 : null
    }));
    return svg;
  }
  /** Append a glyph into a d3 selection at (x, y). */
  function d3Glyph(sel, code, x, y, size, colOverride) {
    var p = PRODUCTS[code];
    var shape = p ? p.shape : code || 'circle';
    var col = colOverride || (p ? tok(p.token) : tok('text-2'));
    var hollow = isHollow(shape);
    return sel.append('path')
      .attr('class', 'mc-glyph')
      .attr('transform', 'translate(' + x + ',' + y + ')')
      .attr('d', glyphPath(shape, hollow ? size - 2 : size))
      .attr('fill', hollow ? 'none' : col)
      .attr('stroke', hollow ? col : 'none')
      .attr('stroke-width', hollow ? 1.25 : null);
  }

  /** Matra monogram (§B.5): 18×14 ruled box, mono caps. */
  function monogram(text, active) {
    return h('span', { class: 'mc-monogram' + (active ? ' is-active' : ''), text: String(text || '').toUpperCase() });
  }

  /** Static mini sparkline (tables, podium): no D3 needed. */
  function miniSpark(values, w, hgt, col, opts) {
    opts = opts || {};
    var vals = (values || []).map(function (v) { return v == null ? null : +v; });
    var svg = svgEl('svg', { width: w, height: hgt, viewBox: '0 0 ' + w + ' ' + hgt, class: 'mc-minispark', 'aria-hidden': 'true', focusable: 'false' });
    var real = vals.filter(function (v) { return v != null && isFinite(v); });
    if (real.length < 2) return svg;
    var lo = Math.min.apply(null, real), hi = Math.max.apply(null, real);
    if (hi === lo) { hi += 1; lo -= 1; }
    var n = vals.length;
    var pad = 2;
    function X(i) { return pad + (w - pad * 2) * (n === 1 ? 0.5 : i / (n - 1)); }
    function Y(v) { return hgt - 1.5 - (hgt - 3) * (v - lo) / (hi - lo); }
    var d = '', last = null;
    vals.forEach(function (v, i) {
      if (v == null || !isFinite(v)) return;
      d += (d ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1);
      last = [X(i), Y(v)];
    });
    var c = color(col || 'text-2');
    if (opts.area !== false) {
      svg.appendChild(svgEl('path', { d: d + 'L' + X(n - 1).toFixed(1) + ',' + hgt + 'L' + X(0).toFixed(1) + ',' + hgt + 'Z', fill: alpha(c, 0.08), stroke: 'none' }));
    }
    svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: c, 'stroke-width': opts.stroke || 1.25, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (last) svg.appendChild(svgEl('circle', { cx: last[0], cy: last[1], r: 1.75, fill: c }));
    return svg;
  }

  /** Heat / ramp colour lookup. */
  function ramp(name, i, n) {
    var arr;
    if (name === 'cividis') arr = CIVIDIS.slice();
    else if (name === 'plat') arr = ['plat-1', 'plat-2', 'plat-3', 'plat-4'].map(function (t) { return tok(t); });
    else if (name === 'div') arr = ['div-neg-2', 'div-neg-1', 'div-mid', 'div-pos-1', 'div-pos-2'].map(function (t) { return tok(t); });
    else arr = ['heat-1', 'heat-2', 'heat-3', 'heat-4', 'heat-5', 'heat-6'].map(function (t) { return tok(t); });
    if (n && n !== arr.length && name !== 'div') {
      var out = [];
      for (var k = 0; k < n; k++) out.push(arr[Math.round(k * (arr.length - 1) / Math.max(1, n - 1))]);
      arr = out;
    }
    return i == null ? arr : arr[clamp(i, 0, arr.length - 1)];
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 6. Base styles. Zero-specificity (:where) so charts.css / section CSS win.
   * ────────────────────────────────────────────────────────────────────── */
  var CSS = [
    ':where(.mc-chart){position:relative;display:block;width:100%;box-sizing:border-box;color:var(--text-2,#A7B0C0);font:400 12px/16px var(--font-mono,"IBM Plex Mono",ui-monospace,monospace);font-variant-numeric:lining-nums tabular-nums;-webkit-tap-highlight-color:transparent}',
    ':where(.mc-chart:focus){outline:none}',
    ':where(.mc-chart:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:4px;border-radius:2px}',
    ':where(.mc-svg){position:absolute;left:0;top:0;display:block;overflow:visible;user-select:none;-webkit-user-select:none}',
    ':where(.mc-chart text){font-family:var(--font-mono,"IBM Plex Mono",ui-monospace,monospace);font-size:12px;fill:var(--text-3,#7C879A);font-variant-numeric:lining-nums tabular-nums}',
    ':where(.mc-chart tspan.mc-t-label){font-family:var(--font-sans,"Inter Tight",system-ui,sans-serif);font-size:12px}',
    ':where(.mc-chart text.mc-t-label){font-family:var(--font-sans,"Inter Tight",system-ui,sans-serif);font-size:12px;fill:var(--text-2,#A7B0C0)}',
    ':where(.mc-chart text.mc-t-strong){fill:var(--text-1,#EDEFF3)}',
    ':where(.mc-chart text.mc-t-value){font-size:12px;fill:var(--text-1,#EDEFF3)}',
    ':where(.mc-chart text.mc-t-muted){fill:var(--text-3,#7C879A)}',
    ':where(.mc-chart text.mc-t-gold){fill:var(--gold-soft,#FFE7A1)}',
    ':where(.mc-chart text.mc-t-pos){fill:var(--pos,#4CC38A)}',
    ':where(.mc-chart text.mc-t-neg){fill:var(--neg,#F26D5B)}',
    ':where(.mc-chart text.mc-t-warn){fill:var(--warn,#E8A13A)}',
    ':where(.mc-chart text.mc-t-serif){font-family:var(--font-serif,"Source Serif 4",Georgia,serif);fill:var(--text-1,#EDEFF3)}',
    ':where(.mc-chart text.mc-halo){paint-order:stroke;stroke:var(--mc-halo,var(--surface-sheet,rgba(9,15,27,.95)));stroke-width:3px;stroke-linejoin:round}',
    ':where(.mc-grid line){stroke:var(--rule,rgba(214,224,240,.08));stroke-width:1;shape-rendering:crispEdges}',
    ':where(.mc-base){stroke:var(--rule-strong,rgba(214,224,240,.14));stroke-width:1;shape-rendering:crispEdges}',
    ':where(.mc-target){fill:none;stroke:var(--gold,#F2B705);stroke-width:1;stroke-dasharray:3 3;shape-rendering:crispEdges}',
    ':where(.mc-cross){stroke:var(--signal,#38D6E8);stroke-width:1;shape-rendering:crispEdges;pointer-events:none}',
    ':where(.mc-mark){transition:opacity var(--dur-xhl,180ms) var(--ease-standard,cubic-bezier(.2,0,0,1))}',
    ':where(.mc-is-dim){opacity:.3}',
    ':where(.mc-hit){fill:transparent;stroke:none}',
    ':where(.mc-clickable) :where(.mc-hit,[data-k],[data-c]){cursor:pointer}',
    '.mc-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}',
    ':where(.mc-empty){margin:0;padding:12px 0;font:italic 400 15px/22px var(--font-serif,"Source Serif 4",Georgia,serif);color:var(--text-2,#A7B0C0)}',
    /* data-table toggle (§L.5) */
    ':where(.mc-dt-toggle){position:absolute;right:0;bottom:0;z-index:3;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);margin:0;padding:0;border:0;background:none;white-space:nowrap}',
    ':where(.mc-dt-toggle:focus-visible,.mc-dt-toggle.is-visible){width:auto;height:auto;clip-path:none;padding:1px 6px;background:var(--surface-solid,#0E1626);border:1px solid var(--rule-strong,rgba(214,224,240,.14));border-radius:2px;color:var(--text-2,#A7B0C0);font:500 12px/16px var(--font-mono,"IBM Plex Mono",monospace);letter-spacing:.04em;cursor:pointer}',
    ':where(.mc-dt-toggle:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:1px}',
    ':where(.mc-dt){position:absolute;inset:0;z-index:2;overflow:auto;background:var(--surface-sheet,rgba(9,15,27,.95))}',
    ':where(.mc-dt table){width:100%;border-collapse:collapse;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-1,#EDEFF3)}',
    ':where(.mc-dt th){position:sticky;top:0;background:var(--surface-solid,#0E1626);text-align:left;font:600 12px/16px var(--font-sans,"Inter Tight",sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--text-3,#7C879A);padding:6px 8px;border-bottom:1px solid var(--rule-strong,rgba(214,224,240,.14))}',
    ':where(.mc-dt td){padding:4px 8px;border-bottom:1px solid var(--rule,rgba(214,224,240,.08));white-space:nowrap}',
    ':where(.mc-dt td.is-num,.mc-dt th.is-num){text-align:right}',
    /* tooltip (§B.7, §C.8.4, §E.7) */
    ':where(.mc-tip){position:fixed;left:0;top:0;z-index:var(--z-tip,80);box-sizing:border-box;max-width:280px;padding:12px;background:var(--surface-solid,#0E1626);border:1px solid var(--rule-strong,rgba(214,224,240,.14));border-radius:var(--r-tip,4px);box-shadow:var(--shadow-pop,8px 18px 40px -10px rgba(0,0,0,.7));color:var(--text-1,#EDEFF3);font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);font-variant-numeric:lining-nums tabular-nums;pointer-events:none;opacity:0;visibility:hidden;overflow:hidden}',
    ':where(.mc-tip)::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent 0%,var(--metal,#F2B705) 30%,transparent 85%);opacity:.32}',
    ':where(.mc-tip.is-on){opacity:1;visibility:visible}',
    ':where(.mc-tip__title){margin:0 0 6px;font:600 12px/16px var(--font-sans,"Inter Tight",sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--text-3,#7C879A)}',
    ':where(.mc-tip__body){margin:0;font:400 12px/18px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-2,#A7B0C0);white-space:normal}',
    ':where(.mc-tip__head){margin:0 0 4px;font:600 13px/18px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-1,#EDEFF3)}',
    ':where(.mc-tip__rows){display:grid;grid-template-columns:auto 1fr auto;column-gap:8px;row-gap:2px;align-items:center}',
    ':where(.mc-tip__g){display:inline-flex;width:10px;justify-content:center}',
    ':where(.mc-tip__l){font:400 12px/16px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-2,#A7B0C0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    ':where(.mc-tip__v){text-align:right;color:var(--text-1,#EDEFF3);white-space:nowrap}',
    ':where(.mc-tip__row--strong .mc-tip__l){color:var(--text-1,#EDEFF3);font-weight:600}',
    ':where(.mc-tip__row--strong .mc-tip__v){font-weight:500}',
    ':where(.mc-tip__row--muted .mc-tip__l,.mc-tip__row--muted .mc-tip__v){color:var(--text-3,#7C879A)}',
    ':where(.mc-tip__row--gold .mc-tip__v){color:var(--gold-soft,#FFE7A1)}',
    ':where(.mc-tip__foot){margin:8px 0 0;padding:6px 0 0;border-top:1px solid var(--rule,rgba(214,224,240,.08));font-size:12px;line-height:14px;color:var(--text-3,#7C879A)}',
    ':where(.mc-tip .mc-pos){color:var(--pos,#4CC38A)} :where(.mc-tip .mc-neg){color:var(--neg,#F26D5B)} :where(.mc-tip .mc-flat){color:var(--text-3,#7C879A)}',
    /* semantic text */
    ':where(.mc-pos){color:var(--pos,#4CC38A)} :where(.mc-neg){color:var(--neg,#F26D5B)} :where(.mc-warn){color:var(--warn,#E8A13A)} :where(.mc-flat){color:var(--text-3,#7C879A)}',
    ':where(.mc-monogram){display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:18px;height:14px;padding:0 2px;border:1px solid var(--rule-strong,rgba(214,224,240,.14));font:500 12px/1 var(--font-mono,"IBM Plex Mono",monospace);letter-spacing:.02em;color:var(--text-2,#A7B0C0)}',
    ':where(.mc-monogram.is-active){border-color:var(--rule-gold,rgba(242,183,5,.32))}',
    ':where(.mc-glyph){flex:none;display:inline-block;vertical-align:middle;overflow:visible}',
    /* legend (§B.7: inline, glyph + label 12 px, never boxed) */
    ':where(.mc-legend){display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin:0;padding:0;list-style:none;font:400 12px/16px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-legend__i){display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
    ':where(.mc-legend__i button){all:unset;display:inline-flex;align-items:center;gap:6px;cursor:pointer;border-radius:2px}',
    ':where(.mc-legend__i button:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:2px}',
    ':where(.mc-legend__i.is-off){opacity:.45}',
    ':where(.mc-legend__line){display:inline-block;width:14px;height:0;border-top:1.5px solid currentColor}',
    ':where(.mc-legend__line.is-dashed){border-top-style:dashed;border-top-width:1px}',
    /* KPI tile (§C.8.1) */
    ':where(.mc-kpi){position:relative;box-sizing:border-box;height:var(--kpi-h,124px);padding:16px;display:flex;flex-direction:column;min-width:0;color:var(--text-1,#EDEFF3);background:transparent;transition:background-color var(--dur-hover,140ms) var(--ease-standard,cubic-bezier(.2,0,0,1));overflow:hidden}',
    ':where(.mc-kpi.is-clickable){cursor:pointer}',
    ':where(.mc-kpi.is-clickable:hover){background:var(--surface-hover,#141E31)}',
    ':where(.mc-kpi:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:-1px}',
    /* the title wraps to a second line instead of being cut ("Consumer outstandi…"); two lines are
       reserved so every value in a strip sits on the same baseline */
    ':where(.mc-kpi__eyebrow){display:flex;align-items:flex-end;gap:6px;min-height:28px;min-width:0;font:600 12px/16px var(--font-sans,"Inter Tight",sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--text-3,#7C879A);white-space:normal}',
    ':where(.mc-kpi__eyebrow-t){flex:1 1 auto;min-width:0;overflow-wrap:break-word;text-wrap:balance}',
    ':where(.mc-kpi__sw){margin-bottom:4px}',
    ':where(.mc-kpi .demo-tag){margin-bottom:-1px}',
    ':where(.mc-kpi__sw){flex:none;width:6px;height:6px}',
    ':where(.mc-kpi__info){all:unset;flex:none;margin-left:auto;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--text-3,#7C879A);cursor:help;border-radius:2px}',
    ':where(.mc-kpi__info:hover){color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi__info:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:1px}',
    ':where(.mc-kpi__value){display:flex;align-items:baseline;margin-top:6px;height:40px;min-width:0;white-space:nowrap;font:400 36px/40px var(--font-serif,"Source Serif 4",Georgia,serif);font-variation-settings:"opsz" 48;letter-spacing:-.005em;color:var(--text-1,#EDEFF3)}',
    ':where(.mc-kpi .u-cur){align-self:flex-start;margin:6px 5px 0 0;font:400 15px/15px var(--font-sans,"Inter Tight",sans-serif);letter-spacing:0;color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi .u-mag){margin-left:5px;font:400 18px/18px var(--font-serif,"Source Serif 4",Georgia,serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi .u-unit){margin-left:6px;font:400 13px/13px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi .n){display:inline-block}',
    ':where(.mc-kpi .u-mag.u-pct){margin-left:2px}',
    ':where(.mc-kpi__v2){display:inline-flex;align-items:baseline;margin-left:14px;font:400 24px/28px var(--font-serif,"Source Serif 4",Georgia,serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi__v2 .u-unit,.mc-kpi__v2 .u-mag){font-size:13px;margin-left:4px}',
    ':where(.mc-kpi__v2 .u-mag.u-pct){margin-left:1px}',
    ':where(.mc-kpi__v2-sep){margin-right:10px;color:var(--text-off,#4B5568);font-family:var(--font-sans,"Inter Tight",sans-serif);font-size:18px}',
    ':where(.mc-kpi__foot){position:relative;display:flex;align-items:center;gap:8px;margin-top:auto;height:16px;min-width:0;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);white-space:nowrap;color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi__delta){flex:none}',
    ':where(.mc-kpi__sub){overflow:hidden;text-overflow:ellipsis;min-width:0;color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi__spark){position:absolute;right:16px;bottom:14px;width:34%;max-width:112px;min-width:56px;height:28px}',
    ':where(.mc-kpi.has-spark .mc-kpi__foot){padding-right:calc(34% + 8px)}',
    ':where(.mc-kpi__rail){position:relative;flex:1 1 40px;min-width:28px;height:16px}',
    ':where(.mc-kpi__rail svg){position:absolute;left:0;top:0;overflow:visible}',
    ':where(.mc-kpi__rl){flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:var(--text-2,#A7B0C0)}',
    ':where(.mc-kpi.is-compact){height:auto;min-height:var(--kpi-h,124px)}',
    ':where(.mc-kpi.is-compact .mc-kpi__value){flex-wrap:wrap;height:auto;font-size:28px;line-height:32px}',
    ':where(.mc-kpi.is-compact .u-cur){margin:4px 4px 0 0;font-size:13px;line-height:13px}',
    ':where(.mc-kpi.is-compact .u-mag){font-size:15px;line-height:15px}',
    ':where(.mc-kpi.is-compact .mc-kpi__v2){flex-basis:100%;margin:0;font-size:15px;line-height:20px}',
    ':where(.mc-kpi.is-compact .mc-kpi__v2-sep){display:none}',
    ':where(.mc-kpi.is-compact .mc-kpi__foot){margin-top:10px}',
    ':where(.mc-kpi__na){margin-top:auto;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-3,#7C879A)}',
    ':where(.mc-kpi__br){position:absolute;width:8px;height:8px;border:0 solid rgba(56,214,232,.7);pointer-events:none;opacity:0;transition:opacity var(--dur-hover,140ms) var(--ease-standard,ease)}',
    ':where(.mc-kpi__br.tl){left:4px;top:4px;border-left-width:1px;border-top-width:1px}',
    ':where(.mc-kpi__br.tr){right:4px;top:4px;border-right-width:1px;border-top-width:1px}',
    ':where(.mc-kpi__br.bl){left:4px;bottom:4px;border-left-width:1px;border-bottom-width:1px}',
    ':where(.mc-kpi__br.br){right:4px;bottom:4px;border-right-width:1px;border-bottom-width:1px}',
    ':where(.mc-kpi.is-selected .mc-kpi__br){opacity:1}',
    ':where(.mc-kpi__skel){position:absolute;inset:16px;display:none;pointer-events:none}',
    ':where(.mc-kpi.is-loading .mc-kpi__skel){display:block}',
    ':where(.mc-kpi.is-loading) :where(.mc-kpi__value,.mc-kpi__foot,.mc-kpi__spark,.mc-kpi__na){visibility:hidden}',
    ':where(.mc-kpi__skel i){position:absolute;left:0;height:1px;background:var(--rule-strong,rgba(214,224,240,.14));overflow:hidden}',
    ':where(.mc-kpi__skel i)::after{content:"";position:absolute;inset:-1px 0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);transform:translateX(-100%);animation:mc-shimmer 1.4s linear infinite}',
    '@keyframes mc-shimmer{to{transform:translateX(100%)}}',
    '@media (prefers-reduced-motion: reduce){:where(.mc-kpi__skel i)::after{animation:none}}',
    /* matrix (§C.4 block 3) */
    ':where(.mc-matrix){position:relative;overflow:auto;max-width:100%;scrollbar-width:thin;scrollbar-color:rgba(214,224,240,.14) transparent}',
    ':where(.mc-matrix table){border-collapse:separate;border-spacing:2px;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-1,#EDEFF3)}',
    ':where(.mc-matrix th){font-weight:400;text-align:left;white-space:nowrap}',
    ':where(.mc-matrix thead th){height:24px;padding:0 6px;vertical-align:bottom;font:600 12px/16px var(--font-sans,"Inter Tight",sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--text-3,#7C879A);text-align:center}',
    ':where(.mc-matrix thead th.is-click){cursor:pointer}',
    ':where(.mc-matrix thead th.is-click:hover){color:var(--text-1,#EDEFF3)}',
    ':where(.mc-matrix__ch){display:inline-flex;align-items:center;gap:5px}',
    ':where(.mc-matrix tbody th){position:sticky;left:0;z-index:1;padding:0 12px 0 0;background:var(--surface-sheet,rgba(9,15,27,.95))}',
    ':where(.mc-matrix__rl){display:block;font:500 12px/16px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-1,#EDEFF3)}',
    ':where(.mc-matrix__rs){display:block;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-3,#7C879A)}',
    ':where(.mc-matrix td){position:relative;box-sizing:border-box;padding:0 8px;text-align:right;vertical-align:middle;white-space:nowrap;border-radius:1px;transition:opacity var(--dur-xhl,180ms) var(--ease-standard,ease),box-shadow var(--dur-hover,140ms) ease}',
    ':where(.mc-matrix td.is-cell){cursor:pointer}',
    ':where(.mc-matrix td.is-cell:hover,.mc-matrix td.is-cell:focus-visible){box-shadow:inset 0 0 0 1px var(--signal,#38D6E8);outline:none}',
    ':where(.mc-matrix td .v){display:block;font-size:12px;line-height:16px}',
    ':where(.mc-matrix td .s){display:block;font-size:12px;line-height:12px;opacity:.78}',
    ':where(.mc-matrix td.is-na){color:var(--text-3,#7C879A)}',
    ':where(.mc-matrix td.is-total,.mc-matrix tr.is-total td,.mc-matrix tr.is-total th .mc-matrix__rl){color:var(--text-2,#A7B0C0)}',
    ':where(.mc-matrix tr.is-total td,.mc-matrix tr.is-total th){border-top:1px solid var(--rule-strong,rgba(214,224,240,.14))}',
    ':where(.mc-matrix tr.is-static td){color:var(--text-2,#A7B0C0)}',
    ':where(.mc-matrix tr.is-rule td){height:1px;padding:0;background:var(--rule,rgba(214,224,240,.08))}',
    ':where(.mc-matrix td.mc-is-dim,.mc-matrix th.mc-is-dim){opacity:.3}',
    /* table (§C.8.3) */
    ':where(.mc-table-wrap){display:flex;flex-direction:column;min-width:0}',
    ':where(.mc-table-wrap.is-bounded){height:100%}',
    ':where(.mc-table-wrap.is-bounded .mc-table){flex:1 1 auto;min-height:0}',
    ':where(.mc-table-wrap .mc-table__empty,.mc-table-wrap .mc-table__foot){flex:none}',
    ':where(.mc-table){position:relative;overflow:auto;max-width:100%;outline:none;scrollbar-width:thin;scrollbar-color:rgba(214,224,240,.14) transparent}',
    ':where(.mc-table)::-webkit-scrollbar{width:6px;height:6px} :where(.mc-table)::-webkit-scrollbar-thumb{background:rgba(214,224,240,.14);border-radius:3px} :where(.mc-table)::-webkit-scrollbar-track{background:transparent}',
    ':where(.mc-table table){width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font:400 13px/20px var(--font-sans,"Inter Tight",system-ui,sans-serif);font-feature-settings:"tnum" 1,"cv01" 1,"cv05" 1,"cv08" 1;color:var(--text-1,#EDEFF3)}',
    ':where(.mc-table th){position:sticky;top:0;z-index:2;box-sizing:border-box;height:32px;padding:0 12px;background:var(--mc-table-head,var(--surface-solid,#0E1626));text-align:left;vertical-align:middle;font:600 12px/16px var(--font-sans,"Inter Tight",sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--text-3,#7C879A);border-bottom:1px solid var(--rule-strong,rgba(214,224,240,.14));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    ':where(.mc-table th.is-right,.mc-table td.is-right){text-align:right}',
    ':where(.mc-table th.is-center,.mc-table td.is-center){text-align:center}',
    ':where(.mc-table th button){all:unset;display:inline-flex;align-items:center;gap:4px;max-width:100%;cursor:pointer;color:inherit;border-radius:2px}',
    ':where(.mc-table th.is-right button){flex-direction:row-reverse}',
    ':where(.mc-table th button:hover){color:var(--text-2,#A7B0C0)}',
    ':where(.mc-table th button:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:2px}',
    ':where(.mc-table th[aria-sort="ascending"],.mc-table th[aria-sort="descending"]){color:var(--text-1,#EDEFF3)}',
    ':where(.mc-table__sg){font:400 12px/1 var(--font-mono,"IBM Plex Mono",monospace);letter-spacing:0;color:var(--text-3,#7C879A);opacity:0}',
    ':where(.mc-table th button:hover .mc-table__sg){opacity:.6}',
    ':where(.mc-table th[aria-sort="ascending"] .mc-table__sg,.mc-table th[aria-sort="descending"] .mc-table__sg){opacity:1;color:var(--text-1,#EDEFF3)}',
    ':where(.mc-table td){box-sizing:border-box;height:var(--mc-row-h,32px);padding:0 12px;border-bottom:1px solid var(--rule,rgba(214,224,240,.08));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}',
    ':where(.mc-table td.is-mono){font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-table td.is-muted){color:var(--text-2,#A7B0C0)}',
    ':where(.mc-table td.is-serif){font:400 20px/24px var(--font-serif,"Source Serif 4",Georgia,serif)}',
    ':where(.mc-table tbody tr.mc-row){cursor:default;transition:background-color var(--dur-hover,140ms) var(--ease-standard,ease),opacity var(--dur-xhl,180ms) ease}',
    ':where(.mc-table.is-clickable tbody tr.mc-row){cursor:pointer}',
    ':where(.mc-table tbody tr.mc-row:hover){background:var(--surface-hover,#141E31)}',
    ':where(.mc-table tbody tr.mc-row:focus){outline:none}',
    ':where(.mc-table tbody tr.mc-row:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:-1px}',
    ':where(.mc-table tbody tr.is-selected){background:rgba(0,61,121,.4)}',
    ':where(.mc-table tbody tr.is-selected td:first-child){box-shadow:inset 2px 0 0 var(--metal,#F2B705)}',
    ':where(.mc-table tbody tr.is-flag td:first-child){box-shadow:inset 2px 0 0 var(--gold,#F2B705)}',
    ':where(.mc-table tbody tr.mc-is-dim){opacity:.3}',
    ':where(.mc-table tr.mc-group th){position:static;height:28px;background:transparent;color:var(--text-2,#A7B0C0);border-bottom:1px solid var(--rule-strong,rgba(214,224,240,.14))}',
    ':where(.mc-table tr.mc-spacer td){padding:0;border:0;height:auto}',
    ':where(.mc-table__empty){padding:20px 12px;font:italic 400 15px/22px var(--font-serif,"Source Serif 4",Georgia,serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-table__foot){padding:8px 12px 0;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-3,#7C879A)}',
    ':where(.mc-cell-bar){display:inline-flex;align-items:center;gap:8px;justify-content:flex-end;width:100%}',
    ':where(.mc-cell-bar__t){position:relative;flex:none;width:40px;height:4px;background:var(--rule,rgba(214,224,240,.08))}',
    ':where(.mc-cell-bar__f){position:absolute;left:0;top:0;bottom:0;background:var(--plat-3,#AEBBCD)}',
    ':where(.mc-cell-bar__v){min-width:44px;text-align:right}',
    ':where(.mc-cell-g){display:inline-flex;align-items:center;gap:6px}',
    /* podium (leaderboard §13.3) */
    ':where(.mc-podium){position:relative;display:flex;flex-direction:column;justify-content:flex-end;height:100%;min-height:300px}',
    ':where(.mc-podium__stage){display:grid;grid-template-columns:1fr 1.12fr 1fr;align-items:end;gap:12px}',
    ':where(.mc-podium__col){position:relative;display:flex;flex-direction:column;align-items:center;min-width:0;cursor:default}',
    ':where(.mc-podium.is-clickable .mc-podium__col){cursor:pointer}',
    ':where(.mc-podium__col:focus-visible){outline:1px solid var(--signal,#38D6E8);outline-offset:2px;border-radius:2px}',
    ':where(.mc-podium__card){display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 4px 12px;min-width:0;max-width:100%;text-align:center}',
    ':where(.mc-podium__name){max-width:100%;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 14px/20px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-1,#EDEFF3)}',
    ':where(.mc-podium__role){display:inline-block;padding:0 5px;border:1px solid var(--rule-strong,rgba(214,224,240,.14));border-radius:2px;font:500 12px/16px var(--font-mono,"IBM Plex Mono",monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--text-2,#A7B0C0)}',
    ':where(.mc-podium__val){display:flex;align-items:baseline;justify-content:center;gap:4px;margin-top:6px;font:400 32px/36px var(--font-serif,"Source Serif 4",Georgia,serif);font-variation-settings:"opsz" 40;color:var(--text-1,#EDEFF3);white-space:nowrap}',
    ':where(.mc-podium__col[data-place="1"] .mc-podium__val){font-size:36px;line-height:40px}',
    ':where(.mc-podium__val .u-cur){align-self:flex-start;margin-top:5px;font:400 13px/13px var(--font-sans,"Inter Tight",sans-serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-podium__val .u-mag,.mc-podium__val .u-unit){font:400 15px/15px var(--font-serif,"Source Serif 4",Georgia,serif);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-podium__meta){display:flex;align-items:center;gap:10px;font:400 12px/16px var(--font-mono,"IBM Plex Mono",monospace);color:var(--text-2,#A7B0C0)}',
    ':where(.mc-podium__ach){display:inline-flex;align-items:center;gap:5px}',
    ':where(.mc-podium__mix){display:flex;gap:1px;width:96px;height:6px;margin-top:6px}',
    ':where(.mc-podium__mix i){display:block;height:100%}',
    ':where(.mc-podium__plinth){position:relative;box-sizing:border-box;width:100%;background:var(--surface-solid,#0E1626);border:1px solid var(--rule,rgba(214,224,240,.08));border-bottom:0;border-radius:2px 2px 0 0;overflow:hidden;display:flex;justify-content:center;padding-top:14px}',
    ':where(.mc-podium__plinth)::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--mc-metal)}',
    ':where(.mc-podium__sweep){position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 30%,rgba(255,244,214,.10) 50%,transparent 70%);transform:translateX(-100%);opacity:0}',
    ':where(.mc-podium__base){height:1px;background:var(--rule-strong,rgba(214,224,240,.14))}',
    ':where(.mc-podium.is-empty .mc-podium__plinth){background:transparent;border:1px dashed var(--rule-strong,rgba(214,224,240,.14))}',
    ':where(.mc-podium.is-empty .mc-podium__plinth)::before{display:none}',
    ':where(.mc-podium__empty){position:absolute;left:0;right:0;top:24px;text-align:center}'
  ].join('\n');

  function injectStyles() {
    if (D.getElementById('mcd-charts-base')) return;
    var st = D.createElement('style');
    st.id = 'mcd-charts-base';
    st.textContent = CSS;
    var head = D.head || D.documentElement;
    head.insertBefore(st, head.firstChild);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 7. Shared tooltip (one node; §B.7 hover, §C.8.4 tooltip, §E.7)
   * content = { eyebrow?, head?, rows: [{glyph?, color?, label, value, cls?,
   *             strong?, muted?, gold?}], foot? }
   * ────────────────────────────────────────────────────────────────────── */
  var Tip = (function () {
    var node = null, owner = null, dwell = 0;
    function ensure() {
      if (node && node.isConnected) return node;
      node = h('div', { class: 'mc-tip', 'aria-hidden': 'true' });
      (D.getElementById('overlay-root') || D.body).appendChild(node);
      return node;
    }
    function build(c) {
      node.textContent = '';
      if (c.eyebrow) node.appendChild(h('p', { class: 'mc-tip__title', text: c.eyebrow }));
      if (c.head) node.appendChild(h('p', { class: 'mc-tip__head', text: c.head }));
      if (c.body) node.appendChild(h('p', { class: 'mc-tip__body', text: c.body }));
      if (c.rows && c.rows.length) {
        var grid = h('div', { class: 'mc-tip__rows' });
        c.rows.forEach(function (r) {
          var cls = 'mc-tip__row' + (r.strong ? ' mc-tip__row--strong' : '') + (r.muted ? ' mc-tip__row--muted' : '') + (r.gold ? ' mc-tip__row--gold' : '');
          var g = h('span', { class: 'mc-tip__g ' + cls });
          if (r.glyph || r.color) g.appendChild(glyph(r.glyph || 'circle', { size: 8, color: r.color, shape: r.shape }));
          grid.appendChild(g);
          grid.appendChild(h('span', { class: 'mc-tip__l ' + cls, text: r.label == null ? '' : r.label }));
          grid.appendChild(h('span', { class: 'mc-tip__v ' + cls + (r.cls ? ' ' + r.cls : ''), text: r.value == null ? '' : r.value }));
        });
        node.appendChild(grid);
      }
      if (c.foot) node.appendChild(h('p', { class: 'mc-tip__foot', text: c.foot }));
    }
    function place(pt) {
      var r = node.getBoundingClientRect();
      var vw = W.innerWidth, vh = W.innerHeight, off = 14;
      var x = pt.x + off, y = pt.y + off;
      if (x + r.width > vw - 8) x = pt.x - off - r.width;
      if (y + r.height > vh - 8) y = pt.y - off - r.height;
      x = clamp(x, 8, Math.max(8, vw - r.width - 8));
      y = clamp(y, 8, Math.max(8, vh - r.height - 8));
      node.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }
    function show(pt, content, who, immediate) {
      if (!content) { hide(who); return; }
      ensure();
      owner = who || null;
      build(content);
      place(pt);
      W.clearTimeout(dwell);
      if (immediate || node.classList.contains('is-on')) node.classList.add('is-on');
      else dwell = W.setTimeout(function () { if (node) node.classList.add('is-on'); }, 60); // §E.7 60 ms dwell
    }
    function hide(who) {
      if (!node) return;
      if (who && owner && who !== owner) return;
      W.clearTimeout(dwell);
      node.classList.remove('is-on'); // disappears instantly (§E.7)
      owner = null;
    }
    function text(c) {
      if (!c) return '';
      var parts = [];
      if (c.eyebrow) parts.push(c.eyebrow);
      if (c.head) parts.push(c.head);
      if (c.body) parts.push(c.body);
      (c.rows || []).forEach(function (r) { parts.push([r.label, r.value].filter(function (x) { return x != null && x !== ''; }).join(' ')); });
      if (c.foot) parts.push(c.foot);
      return parts.join('. ');
    }
    return { show: show, hide: hide, text: text, move: function (pt) { if (node && node.classList.contains('is-on')) place(pt); } };
  })();

  /* ──────────────────────────────────────────────────────────────────────
   * 8. Base factory: sizing, ResizeObserver, a11y, keyboard nav, data table
   * spec = { svg?, d3?, height?, autoHeight(ctx, w)?, defaults?, setup(ctx)?,
   *          render(ctx), summary(ctx)?, table(ctx)?, nav?, highlight?, api? }
   * ────────────────────────────────────────────────────────────────────── */
  function define(kind, spec) {
    return function (el, data, cfg) {
      if (!el || el.nodeType !== 1) throw new TypeError('MCD.charts.' + kind + ': the target element is not valid');
      injectStyles();
      var d3 = W.d3;
      el.textContent = '';

      var ctx = {
        kind: kind, el: el, data: data,
        cfg: Object.assign({}, spec.defaults || {}, cfg || {}),
        id: uid(kind), first: true, destroyed: false, hl: null, nav: -1,
        w: 0, h: 0, animate: false, autoH: null, d3: d3, cleanup: [], spec: spec
      };
      var root = h('div', { class: 'mc-chart mc-chart--' + kind });
      ctx.root = root;
      el.appendChild(root);

      if (spec.d3 !== false && !d3) {
        root.appendChild(h('p', { class: 'mc-empty', text: 'Grafik tidak dapat ditampilkan. Muat ulang halaman.' }));
        return noopHandle(root, kind);
      }

      var cs = W.getComputedStyle(el);
      var padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      var padH = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);

      if (spec.svg !== false) {
        ctx.svgNode = svgEl('svg', { class: 'mc-svg', role: 'img', focusable: 'false' });
        root.appendChild(ctx.svgNode);
        ctx.svg = d3.select(ctx.svgNode);
        ctx.defs = ctx.svg.append('defs');
        ctx.g = ctx.svg.append('g').attr('class', 'mc-plot');
      }
      ctx.live = h('div', { class: 'mc-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
      root.appendChild(ctx.live);

      /* helpers bound to this chart */
      ctx.c = function (name) { return color(name, root); };
      ctx.fmt = function (spec2, ref) { return formatter(spec2 != null ? spec2 : ctx.cfg.format, ref); };
      ctx.say = function (t) { ctx.live.textContent = ''; if (t) W.setTimeout(function () { if (!ctx.destroyed) ctx.live.textContent = t; }, 30); };
      ctx.pt = function (x, y) {
        var r = (ctx.svgNode || root).getBoundingClientRect();
        return { x: r.left + x, y: r.top + y };
      };
      ctx.tip = function (pt, content, immediate) { Tip.show(pt, content, ctx, immediate); };
      ctx.untip = function () { Tip.hide(ctx); };
      ctx.hover = function (payload) {
        var k = payload == null ? null : (payload.key != null ? String(payload.key) : JSON.stringify(payload));
        if (k === ctx._hoverKey) return;
        ctx._hoverKey = k;
        if (typeof ctx.cfg.onHover === 'function') {
          try { ctx.cfg.onHover(payload); } catch (e) { console.error(e); }
        }
      };
      ctx.click = function (payload, ev) {
        if (typeof ctx.cfg.onClick === 'function') {
          try { ctx.cfg.onClick(payload, ev); } catch (e) { console.error(e); }
        }
      };
      ctx.dim = function (key) { applyDim(ctx, key == null ? ctx.hl : key); };
      ctx.on = function (target, ev, fn, opt) { target.addEventListener(ev, fn, opt); ctx.cleanup.push(function () { target.removeEventListener(ev, fn, opt); }); };
      ctx.later = function (fn, ms) { var t = W.setTimeout(fn, ms); ctx.cleanup.push(function () { W.clearTimeout(t); }); return t; };
      ctx.tr = function (sel, opt) {
        opt = opt || {};
        if (!ctx.animate) { sel.interrupt(); return sel; }
        return sel.transition().duration(opt.dur != null ? opt.dur : DUR.bar).delay(opt.delay || 0).ease(opt.ease || EASE.enter);
      };
      ctx.layer = function (name, parent) {
        var p = parent || ctx.g;
        var s = p.select(':scope > g.mc-l-' + name);
        if (s.empty()) s = p.append('g').attr('class', 'mc-l-' + name);
        return s;
      };
      ctx.isClickable = function () { return typeof ctx.cfg.onClick === 'function'; };

      /* keyboard navigation (one cursor across data points) */
      if (spec.nav) {
        root.tabIndex = 0;
        root.setAttribute('role', 'group');
        root.setAttribute('aria-roledescription', 'chart');
        var hint = h('span', { class: 'mc-sr', id: ctx.id + '-hint', text: spec.nav.hint || 'Gunakan tombol panah untuk berpindah data. Enter untuk memilih, Esc untuk keluar.' });
        root.appendChild(hint);
        root.setAttribute('aria-describedby', hint.id);
        ctx.on(root, 'keydown', onKey);
        ctx.on(root, 'focusout', function (e) { if (!root.contains(e.relatedTarget)) clearNav(); });
      }
      function onKey(e) {
        if (e.target !== root) return;
        var n = spec.nav.count(ctx);
        if (!n) return;
        var i = ctx.nav;
        if (spec.nav.key) {
          var r = spec.nav.key(ctx, e, i, n);
          if (typeof r === 'number') { e.preventDefault(); setNav(clamp(r, 0, n - 1)); return; }
        }
        var big = spec.nav.big || 10;
        switch (e.key) {
          case 'ArrowRight': case 'ArrowDown': i = i < 0 ? 0 : Math.min(n - 1, i + (e.shiftKey ? big : 1)); break;
          case 'ArrowLeft': case 'ArrowUp': i = i < 0 ? n - 1 : Math.max(0, i - (e.shiftKey ? big : 1)); break;
          case 'Home': i = 0; break;
          case 'End': i = n - 1; break;
          case 'PageDown': i = Math.min(n - 1, Math.max(0, i) + big); break;
          case 'PageUp': i = Math.max(0, i - big); break;
          case 'Enter': case ' ':
            if (i >= 0 && spec.nav.activate) { e.preventDefault(); spec.nav.activate(ctx, i, e); }
            return;
          case 'Escape':
            if (ctx.nav >= 0) { e.preventDefault(); e.stopPropagation(); clearNav(); }
            return;
          default: return;
        }
        e.preventDefault();
        setNav(i);
      }
      function setNav(i) {
        ctx.nav = i;
        var f = spec.nav.focus(ctx, i);
        if (f) {
          if (f.content) ctx.tip(ctx.pt(f.x, f.y), f.content, true);
          ctx.say(f.text || Tip.text(f.content));
        }
      }
      function clearNav() {
        if (ctx.nav < 0) return;
        ctx.nav = -1;
        if (spec.nav && spec.nav.blur) spec.nav.blur(ctx);
        ctx.untip();
      }
      ctx.clearNav = clearNav;

      /* accessible data table toggle (§L.5) */
      var dtBtn = null, dtBox = null;
      if (spec.table && ctx.cfg.tableToggle !== false) {
        dtBtn = h('button', { type: 'button', class: 'mc-dt-toggle' + (ctx.cfg.tableToggle === 'visible' ? ' is-visible' : ''), text: 'Lihat tabel', 'aria-expanded': 'false' });
        root.appendChild(dtBtn);
        ctx.on(dtBtn, 'click', function () { showTable(!ctx.tableOn); });
      }
      function buildTable() {
        if (!dtBox) return;
        var t = spec.table(ctx);
        dtBox.textContent = '';
        if (!t) return;
        var table = h('table', null, [h('caption', { class: 'mc-sr', text: ctx.cfg.label || summary() })]);
        var thead = h('thead'), trh = h('tr');
        t.columns.forEach(function (c, ci) { trh.appendChild(h('th', { scope: 'col', class: ci > 0 && t.numeric !== false ? 'is-num' : null, text: c })); });
        thead.appendChild(trh);
        var tbody = h('tbody');
        t.rows.forEach(function (r) {
          var tr = h('tr');
          r.forEach(function (v, ci) { tr.appendChild(h(ci === 0 ? 'th' : 'td', { scope: ci === 0 ? 'row' : null, class: ci > 0 && t.numeric !== false ? 'is-num' : null, text: v == null ? '—' : String(v) })); });
          tbody.appendChild(tr);
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        dtBox.appendChild(table);
      }
      function showTable(on) {
        if (!spec.table) return;
        on = on == null ? !ctx.tableOn : !!on;
        ctx.tableOn = on;
        if (on) {
          if (!dtBox) { dtBox = h('div', { class: 'mc-dt', tabindex: '0', role: 'region', 'aria-label': 'Tabel data ' + (ctx.cfg.label || '') }); root.insertBefore(dtBox, dtBtn); }
          buildTable();
          dtBox.hidden = false;
        } else if (dtBox) dtBox.hidden = true;
        if (ctx.svgNode) ctx.svgNode.setAttribute('aria-hidden', on ? 'true' : 'false');
        if (dtBtn) { dtBtn.textContent = on ? 'Sembunyikan tabel' : 'Lihat tabel'; dtBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
      }

      function summary() {
        if (ctx.cfg.ariaLabel) return ctx.cfg.ariaLabel;
        try { return spec.summary ? spec.summary(ctx) : ''; } catch (e) { return ''; }
      }
      function aria() {
        var s = summary();
        if (ctx.svgNode) ctx.svgNode.setAttribute('aria-label', s || (ctx.cfg.label || 'Grafik'));
        if (spec.nav) root.setAttribute('aria-label', ctx.cfg.label || s || 'Grafik');
        else if (!ctx.svgNode) { root.setAttribute('role', spec.role || 'img'); root.setAttribute('aria-label', s || ctx.cfg.label || ''); }
        root.classList.toggle('mc-clickable', ctx.isClickable());
        /* cfg.demo: true when the chart draws bank data; MCD.demo adds the DEMO mark while demo data is on */
        if (ctx.cfg.demo != null && MCD.demo && typeof MCD.demo.tag === 'function') MCD.demo.tag(root, { when: !!ctx.cfg.demo });
      }

      /* sizing */
      var lastW = -1, lastH = -1;
      function render(anim) {
        if (ctx.destroyed) return;
        if (ctx.autoH === null) {
          if (!el.getClientRects().length) { ctx.pending = true; return; }
          ctx.autoH = (el.clientHeight - padV) < 4;
        }
        var cw = Math.floor(el.clientWidth - padH);
        var ch;
        if (spec.natural) ch = ctx.autoH ? 0 : Math.floor(el.clientHeight - padV);
        else if (ctx.cfg.height) ch = ctx.cfg.height;
        else if (ctx.autoH) ch = spec.autoHeight ? spec.autoHeight(ctx, cw) : (spec.height || 220);
        else ch = Math.floor(el.clientHeight - padV);
        ctx.w = cw; ctx.h = ch; lastW = cw; lastH = ch;
        if (spec.natural) root.style.height = ctx.autoH ? '' : '100%';
        else root.style.height = (ctx.autoH || ctx.cfg.height) ? ch + 'px' : '100%';
        if (cw < 8 || (ch < 2 && !spec.natural)) { ctx.pending = true; return; }
        ctx.pending = false;
        ctx.animate = !!anim && ctx.cfg.animate !== false && !reducedMotion();
        if (ctx.svgNode) {
          ctx.svgNode.setAttribute('width', cw);
          ctx.svgNode.setAttribute('height', ch);
          ctx.svgNode.setAttribute('viewBox', '0 0 ' + cw + ' ' + ch);
        }
        try { spec.render(ctx); }
        catch (err) {
          console.error('[MCD.charts.' + kind + ']', err);
        }
        ctx.first = false;
        aria();
        if (ctx.hl != null) applyHighlight(ctx.hl);
        if (ctx.tableOn) buildTable();
      }
      ctx.render = render;

      function applyHighlight(key) {
        if (spec.highlight) spec.highlight(ctx, key);
        else applyDim(ctx, key);
      }

      var roTimer = 0;
      var ro = null;
      if ('ResizeObserver' in W) {
        ro = new W.ResizeObserver(function () {
          W.clearTimeout(roTimer);
          roTimer = W.setTimeout(function () {
            if (ctx.destroyed) return;
            if (ctx.autoH === null || ctx.pending) { render(ctx.first); return; }
            var cw = Math.floor(el.clientWidth - padH);
            var ch = ctx.autoH || ctx.cfg.height ? lastH : Math.floor(el.clientHeight - padV);
            if (cw !== lastW || ch !== lastH) render(false);
          }, ctx.first ? 0 : 120);
        });
        ro.observe(el);
      } else {
        var onResize = function () { W.clearTimeout(roTimer); roTimer = W.setTimeout(function () { render(false); }, 120); };
        ctx.on(W, 'resize', onResize);
      }
      /* re-measure once the webfonts arrive (axis widths depend on them) */
      if (D.fonts && D.fonts.status !== 'loaded' && D.fonts.ready) {
        D.fonts.ready.then(function () { if (!ctx.destroyed && !ctx.first) render(false); });
      }

      if (spec.setup) spec.setup(ctx);
      render(true);

      var handle = {
        el: root,
        kind: kind,
        update: function (d, c) {
          if (ctx.destroyed) return handle;
          if (d !== undefined) ctx.data = d;
          if (c) ctx.cfg = Object.assign({}, ctx.cfg, c);
          if (ctx.nav >= 0) clearNav();
          render(!ctx.pending || ctx.first);
          return handle;
        },
        highlight: function (key) {
          ctx.hl = key == null ? null : key;
          if (!ctx.destroyed) applyHighlight(ctx.hl);
          return handle;
        },
        showTable: function (on) { showTable(on); return handle; },
        resize: function () { render(false); return handle; },
        destroy: function () {
          if (ctx.destroyed) return;
          ctx.destroyed = true;
          if (ro) ro.disconnect();
          W.clearTimeout(roTimer);
          ctx.cleanup.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
          if (spec.destroy) { try { spec.destroy(ctx); } catch (e) { /* ignore */ } }
          if (ctx.svg) ctx.svg.selectAll('*').interrupt();
          Tip.hide(ctx);
          if (root.parentNode) root.parentNode.removeChild(root);
        }
      };
      if (spec.api) Object.assign(handle, spec.api(ctx, handle));
      return handle;
    };
  }

  function noopHandle(root, kind) {
    var hd = { el: root, kind: kind };
    ['update', 'highlight', 'showTable', 'resize'].forEach(function (m) { hd[m] = function () { return hd; }; });
    hd.destroy = function () { if (root.parentNode) root.parentNode.removeChild(root); };
    return hd;
  }

  /** Default cross-highlight: marks carry data-k (series) and/or data-c (category). */
  function applyDim(ctx, key) {
    var keys = key == null ? null : (Array.isArray(key) ? key : [key]).map(String);
    var nodes = ctx.root.querySelectorAll('[data-k],[data-c]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var on = !keys || keys.indexOf(n.getAttribute('data-k')) >= 0 || keys.indexOf(n.getAttribute('data-c')) >= 0;
      if (n.classList) n.classList.toggle('mc-is-dim', !on);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 9. Cartesian helpers
   * ────────────────────────────────────────────────────────────────────── */
  function niceTicks(scale, max) {
    max = max || 5;
    var t = scale.ticks(4);
    if (t.length > max) t = scale.ticks(3);
    if (t.length > max) t = t.filter(function (_, i) { return i % 2 === 0; });
    return t;
  }
  /** Gridlines (horizontal only) + left labels + baseline. Returns nothing. */
  function drawYAxis(ctx, g, y, ticks, f, pw, opt) {
    opt = opt || {};
    var lo = y.domain()[0];
    if (!opt.right) { /* horizontal gridlines follow the left axis only */
      var grid = ctx.layer('grid', g);
      grid.attr('class', 'mc-l-grid mc-grid');
      var gl = grid.selectAll('line').data(ticks.filter(function (t) { return t !== lo || opt.gridAtZero; }), function (t) { return t; });
      gl.exit().remove();
      gl.enter().append('line').merge(gl)
        .attr('x1', 0).attr('x2', pw)
        .attr('y1', function (t) { return crisp(y(t)); }).attr('y2', function (t) { return crisp(y(t)); });
    }
    var ax = ctx.layer(opt.right ? 'yaxis2' : 'yaxis', g);
    ax.attr('class', (opt.right ? 'mc-l-yaxis2' : 'mc-l-yaxis') + ' mc-ax');
    var tl = ax.selectAll('text').data(opt.labels === false ? [] : ticks, function (t) { return t; });
    tl.exit().remove();
    tl.enter().append('text').merge(tl)
      .attr('x', opt.right ? pw + 8 : -8)
      .attr('y', function (t) { return y(t); })
      .attr('dy', '0.32em')
      .attr('text-anchor', opt.right ? 'start' : 'end')
      .text(function (t) { return f(t); });
    if (!opt.right) {
      var base = ctx.layer('base', g).selectAll('line').data([0]);
      base.enter().append('line').attr('class', 'mc-base').merge(base)
        .attr('x1', 0).attr('x2', pw)
        .attr('y1', crisp(y(lo < 0 && y.domain()[1] > 0 ? 0 : lo))).attr('y2', crisp(y(lo < 0 && y.domain()[1] > 0 ? 0 : lo)));
    }
  }
  function axisWidth(labels) {
    var f = fontMono(10);
    return Math.ceil(maxOf(labels, function (s) { return textW(s, f); }));
  }
  /** Thin band labels so they never collide; the latest label is always kept. */
  function thinStep(n, step, labelW) {
    if (!step) return 1;
    return Math.max(1, Math.ceil((labelW + 10) / step));
  }
  function drawXBand(ctx, g, x, keys, labels, ph, opt) {
    opt = opt || {};
    var bw = x.bandwidth();
    var lw = axisWidth(labels);
    var k = thinStep(keys.length, x.step(), lw);
    var n = keys.length;
    var data = keys.map(function (key, i) { return { key: key, i: i, label: labels[i] }; })
      .filter(function (d) { return (n - 1 - d.i) % k === 0; });
    var ax = ctx.layer('xaxis', g).attr('class', 'mc-l-xaxis mc-ax');
    var t = ax.selectAll('text').data(data, function (d) { return d.key; });
    t.exit().remove();
    t.enter().append('text').merge(t)
      .attr('x', function (d) { return x(d.key) + bw / 2; })
      .attr('y', ph + (opt.offset || 16))
      .attr('text-anchor', 'middle')
      .text(function (d) { return d.label; });
  }
  function drawTargetLine(ctx, g, pathD, label, lx, ly) {
    var tl = ctx.layer('target', g);
    var p = tl.selectAll('path').data(pathD ? [pathD] : []);
    p.exit().remove();
    p.enter().append('path').attr('class', 'mc-target').merge(p).attr('d', function (d) { return d; });
    var t = tl.selectAll('text').data(pathD && label ? [label] : []);
    t.exit().remove();
    t.enter().append('text').attr('class', 'mc-t-gold mc-halo').merge(t)
      .attr('x', lx).attr('y', ly).attr('text-anchor', 'end').text(function (d) { return d; });
  }
  function hatchPattern(ctx, id, col, bg) {
    var p = ctx.defs.select('#' + id);
    if (p.empty()) {
      p = ctx.defs.append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4).attr('height', 4).attr('patternTransform', 'rotate(45)');
      p.append('rect').attr('class', 'bg').attr('width', 4).attr('height', 4);
      p.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 4).attr('stroke-width', 1.25);
    }
    p.select('rect.bg').attr('fill', bg || 'transparent');
    p.select('line').attr('stroke', col);
    return 'url(#' + id + ')';
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 10. countUp (§L.2) and legend
   * ────────────────────────────────────────────────────────────────────── */
  /**
   * countUp(el, from, to, fmt) → { stop(), finished }
   * fmt: formatter spec ('rp' | 'int' | 'pct' | …) or fn(v, to). For 'rp' the
   * magnitude unit and decimals stay fixed to the target for the whole run.
   */
  function countUp(el, from, to, f, opts) {
    opts = opts || {};
    var fn = typeof f === 'function' ? function (v) { return f(v, to); } : formatter(f || 'int', f === 'rp' ? to : null);
    var dur = reducedMotion() ? 0 : (opts.duration != null ? opts.duration : tokMs('dur-num', 600));
    var resolve;
    var finished = new Promise(function (r) { resolve = r; });
    from = +from;
    to = +to;
    if (!isFinite(to)) { el.textContent = '—'; resolve(); return { stop: function () {}, finished: finished }; }
    if (!dur || !isFinite(from) || from === to) { el.textContent = fn(to); resolve(); return { stop: function () {}, finished: finished }; }
    var cancel = tween(dur, opts.ease || EASE.enter, function (p) { el.textContent = fn(from + (to - from) * p); }, resolve);
    return { stop: function () { cancel(); el.textContent = fn(to); resolve(); }, finished: finished };
  }

  /**
   * legend(el, items, cfg) → handle. items: [{key, label, glyph?|color?, line?}]
   * cfg.onToggle(key) makes items buttons (aria-pressed); cfg.off: [keys].
   */
  function legend(el, items, cfg) {
    injectStyles();
    var state = { items: items || [], cfg: cfg || {} };
    function render() {
      el.textContent = '';
      var ul = h('ul', { class: 'mc-legend', 'aria-label': state.cfg.label || 'Keterangan' });
      state.items.forEach(function (it) {
        var off = (state.cfg.off || []).indexOf(it.key) >= 0;
        var li = h('li', { class: 'mc-legend__i' + (off ? ' is-off' : '') });
        var mark = it.line
          ? h('span', { class: 'mc-legend__line' + (it.line === 'dashed' ? ' is-dashed' : ''), style: { color: color(it.color || 'gold') } })
          : glyph(it.glyph || it.key, { size: 10, color: it.color });
        var lbl = h('span', { text: it.label != null ? it.label : (PRODUCTS[it.key] ? PRODUCTS[it.key].label : it.key) });
        if (typeof state.cfg.onToggle === 'function') {
          var b = h('button', { type: 'button', 'aria-pressed': off ? 'false' : 'true' }, [mark, lbl]);
          b.addEventListener('click', function () { state.cfg.onToggle(it.key); });
          if (typeof state.cfg.onHover === 'function') {
            b.addEventListener('mouseenter', function () { state.cfg.onHover(it.key); });
            b.addEventListener('mouseleave', function () { state.cfg.onHover(null); });
          }
          li.appendChild(b);
        } else {
          li.appendChild(mark);
          li.appendChild(lbl);
        }
        ul.appendChild(li);
      });
      el.appendChild(ul);
    }
    render();
    return {
      el: el,
      update: function (it, c) { if (it) state.items = it; if (c) state.cfg = Object.assign({}, state.cfg, c); render(); },
      destroy: function () { el.textContent = ''; }
    };
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 11. Shared normalisers and pointer plumbing
   * ────────────────────────────────────────────────────────────────────── */
  var CYCLE = ['plat-3', 'p-ksm', 'p-kpr', 'p-kkb', 'p-cc', 'p-mg', 'p-pen', 'plat-2'];

  function seriesColor(s, i, node) {
    if (s.color) return color(s.color, node);
    if (PRODUCTS[s.key] || KEY_TOKENS[s.key]) return color(s.key, node);
    return tok(CYCLE[i % CYCLE.length], node);
  }
  function normSeriesDefs(series, keysFrom, node) {
    if (!series) {
      var seen = {};
      keysFrom.forEach(function (k) { seen[k] = 1; });
      var ordered = PRODUCT_ORDER.filter(function (k) { return seen[k]; })
        .concat(Object.keys(seen).filter(function (k) { return PRODUCT_ORDER.indexOf(k) < 0; }));
      series = ordered.map(function (k) { return { key: k }; });
    }
    return series.map(function (s, i) {
      if (typeof s === 'string') s = { key: s };
      var key = String(s.key);
      return {
        key: key,
        label: s.label != null ? s.label : (PRODUCTS[key] ? PRODUCTS[key].label : key),
        color: seriesColor(s, i, node),
        glyph: s.glyph || (PRODUCTS[key] ? key : null),
        raw: s
      };
    });
  }
  function normVals(data, labels) {
    return (data || []).map(function (d, i) {
      var obj = d != null && typeof d === 'object';
      var v = obj ? (d.y != null ? d.y : d.value != null ? d.value : d.v) : d;
      var lab = obj ? (d.label != null ? d.label : d.x != null ? (isMonthKey(d.x) ? fmt.monthLong(d.x) : String(d.x)) : null) : null;
      if (lab == null && labels) lab = labels[i];
      return { i: i, y: v == null || v === '' || !isFinite(v) ? null : +v, label: lab };
    });
  }
  function pointerXY(ctx, e) {
    var r = ctx.svgNode.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  /** Mouse hover (touch: tap) on the whole svg; handlers get svg-local coords. */
  function bindPointer(ctx, move, leave, click) {
    var node = ctx.svgNode;
    ctx.on(node, 'pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var p = pointerXY(ctx, e);
      move(p[0], p[1], e);
    });
    ctx.on(node, 'pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      var p = pointerXY(ctx, e);
      move(p[0], p[1], e);
    });
    ctx.on(node, 'pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      leave(e);
    });
    if (click) {
      ctx.on(node, 'click', function (e) {
        var p = pointerXY(ctx, e);
        click(p[0], p[1], e);
      });
    }
  }
  function clipReveal(ctx, target, w, hh) {
    var id = ctx.id + '-clip';
    var cp = ctx.defs.select('#' + id);
    if (cp.empty()) { cp = ctx.defs.append('clipPath').attr('id', id); cp.append('rect'); }
    var r = cp.select('rect').attr('x', -6).attr('y', -12).attr('height', hh + 24);
    target.attr('clip-path', 'url(#' + id + ')');
    if (ctx.animate && ctx.first) {
      r.interrupt().attr('width', 0).transition().duration(DUR.bar * 1.6).ease(EASE.enter).attr('width', w + 12);
    } else {
      r.interrupt().attr('width', w + 12);
    }
  }
  function curveOf(d3, name) {
    switch (name) {
      case 'monotone': return d3.curveMonotoneX;
      case 'step': return d3.curveStepAfter;
      case 'stepCenter': return d3.curveStep;
      default: return d3.curveLinear;
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 12. sparkline(el, series, cfg)  (§C.8.1 item 4)
   * series: numbers or [{value|y, label|x}]; cfg: color, format, labels, zero
   * ────────────────────────────────────────────────────────────────────── */
  var sparkline = define('sparkline', {
    height: 28,
    defaults: { color: 'text-2', format: 'rp', tableToggle: false },
    setup: function (ctx) {
      bindPointer(ctx, function (mx) {
        if (!ctx.x || !ctx.pts) return;
        var i = clamp(Math.round(ctx.x.invert(mx)), 0, ctx.pts.length - 1);
        sparkFocus(ctx, i, true);
      }, function () { sparkBlur(ctx); });
    },
    render: function (ctx) {
      var d3 = ctx.d3, w = ctx.w, hh = ctx.h, cfg = ctx.cfg;
      var pts = normVals(ctx.data, cfg.labels);
      ctx.pts = pts;
      var col = ctx.c(cfg.color);
      ctx.col = col;
      var real = pts.filter(function (p) { return p.y != null; });
      var marks = ctx.layer('marks');
      if (!real.length) { marks.selectAll('*').remove(); return; }
      var lo = d3.min(real, function (p) { return p.y; });
      var hi = d3.max(real, function (p) { return p.y; });
      if (cfg.zero) lo = Math.min(0, lo);
      if (hi === lo) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; }
      var x = d3.scaleLinear().domain([0, Math.max(1, pts.length - 1)]).range([2.5, w - 3]);
      var y = d3.scaleLinear().domain([lo, hi]).range([hh - 2.5, 2.5]);
      ctx.x = x; ctx.y = y;
      var def = function (p) { return p.y != null; };
      var area = d3.area().defined(def).x(function (p) { return x(p.i); }).y0(hh).y1(function (p) { return y(p.y); });
      var line = d3.line().defined(def).x(function (p) { return x(p.i); }).y(function (p) { return y(p.y); });
      var a = marks.selectAll('path.mc-sp-area').data([pts]);
      a.enter().append('path').attr('class', 'mc-sp-area').merge(a).attr('d', area).attr('fill', alpha(col, 0.08));
      var l = marks.selectAll('path.mc-sp-line').data([pts]);
      l.enter().append('path').attr('class', 'mc-sp-line').attr('fill', 'none').attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
        .merge(l).attr('d', line).attr('stroke', col).attr('stroke-width', cfg.stroke || 1.25);
      var last = real[real.length - 1];
      var dot = marks.selectAll('circle.mc-sp-last').data([last]);
      dot.enter().append('circle').attr('class', 'mc-sp-last').merge(dot)
        .attr('cx', x(last.i)).attr('cy', y(last.y)).attr('r', 1.75).attr('fill', col);
      var hv = ctx.layer('hover').selectAll('circle').data([0]);
      hv.enter().append('circle').attr('r', 2.5).attr('fill', ctx.c('canvas')).attr('stroke-width', 1.25).style('opacity', 0)
        .merge(hv).attr('stroke', col);
      clipReveal(ctx, marks, w, hh);
    },
    summary: function (ctx) {
      var pts = (ctx.pts || []).filter(function (p) { return p.y != null; });
      if (!pts.length) return 'Tren: belum ada data.';
      var f = spoken(ctx.cfg.format);
      var a = pts[0].y, b = pts[pts.length - 1].y;
      var d = a ? (b - a) / Math.abs(a) : 0;
      return (ctx.cfg.label ? ctx.cfg.label + ': ' : '') + 'tren ' + pts.length + ' titik, terakhir ' + f(b) +
        (a ? ', ' + (d >= 0 ? 'naik ' : 'turun ') + fmt.pct(Math.abs(d)) + ' dari titik pertama' : '') + '.';
    }
  });
  function sparkFocus(ctx, i, fromPointer) {
    var p = ctx.pts[i];
    if (!p || p.y == null) { sparkBlur(ctx); return null; }
    var cx = ctx.x(p.i), cy = ctx.y(p.y);
    ctx.g.select('.mc-l-hover circle').attr('cx', cx).attr('cy', cy).style('opacity', 1);
    var content = { rows: [{ label: p.label || '', value: ctx.fmt()(p.y) }] };
    if (fromPointer) ctx.tip(ctx.pt(cx, cy), content);
    ctx.hover({ key: String(i), index: i, value: p.y });
    return { x: cx, y: cy, content: content };
  }
  function sparkBlur(ctx) {
    ctx.g.select('.mc-l-hover circle').style('opacity', 0);
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 13. kpiTile(el, cfg)  (§C.8.1, §L.2, §L.3)
   * cfg: eyebrow, product, info, value, from, format ('rp'|'int'|'pct'|'pp'|fn),
   *      unit, decimals, value2 {value, format, unit, sep}, delta (number |
   *      {value, kind, label, invert}), deltaLabel, sub, spark [13], sparkLabels,
   *      sparkColor, target {attainment, pace, label, month}, state
   *      ('loading'|'na'|null), selected, onClick, onHover, label,
   *      demo (true for bank figures: inline "DEMO" mark while demo data is on).
   *      The eyebrow wraps to two lines; it is never cut short.
   * ────────────────────────────────────────────────────────────────────── */
  function kpiTile(el, a, b) {
    if (!el || el.nodeType !== 1) throw new TypeError('MCD.charts.kpiTile: the target element is not valid');
    injectStyles();
    function merge(base, x, y) {
      var o = Object.assign({}, base);
      if (y === undefined) return Object.assign(o, x || {});
      Object.assign(o, y || {});
      if (x != null && typeof x === 'object' && !Array.isArray(x)) Object.assign(o, x);
      else if (x !== undefined) o.value = x;
      return o;
    }
    var cfg = merge({}, a, b);
    el.textContent = '';
    var st = { shown: null, stop: null, railStop: null, spark: null, destroyed: false };

    var root = h('div', { class: 'mc-kpi' });
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { root.appendChild(h('span', { class: 'mc-kpi__br ' + c, 'aria-hidden': 'true' })); });
    var eyebrow = h('div', { class: 'mc-kpi__eyebrow' });
    var sw = h('span', { class: 'mc-kpi__sw', 'aria-hidden': 'true' });
    var eyeT = h('span', { class: 'mc-kpi__eyebrow-t' });
    var info = h('button', { type: 'button', class: 'mc-kpi__info', 'aria-label': 'Penjelasan' });
    info.appendChild(infoIcon());
    append(eyebrow, [sw, eyeT, info]);

    var value = h('div', { class: 'mc-kpi__value' });
    var uCur = h('span', { class: 'u-cur' });
    var uN = h('span', { class: 'n' });
    var uMag = h('span', { class: 'u-mag' });
    var uUnit = h('span', { class: 'u-unit' });
    var v2 = h('span', { class: 'mc-kpi__v2' });
    append(value, [uCur, uN, uMag, uUnit, v2]);

    var foot = h('div', { class: 'mc-kpi__foot' });
    var deltaEl = h('span', { class: 'mc-kpi__delta' });
    var subEl = h('span', { class: 'mc-kpi__sub' });
    var rail = h('div', { class: 'mc-kpi__rail', 'aria-hidden': 'true' });
    var railLabel = h('span', { class: 'mc-kpi__rl' });
    append(foot, [deltaEl, subEl, rail, railLabel]);

    var sparkBox = h('div', { class: 'mc-kpi__spark' });
    var na = h('div', { class: 'mc-kpi__na', text: 'Tidak berlaku untuk filter ini' });
    var skel = h('div', { class: 'mc-kpi__skel', 'aria-hidden': 'true' }, [
      h('i', { style: { top: '44px', width: '60%' } }),
      h('i', { style: { top: '72px', width: '38%' } }),
      h('i', { style: { top: '72px', left: '62%', width: '38%' } })
    ]);
    append(root, [eyebrow, value, foot, sparkBox, na, skel]);
    el.appendChild(root);

    var railSvg = svgEl('svg', { width: '100%', height: 16 });
    var rTrack = svgEl('rect', { x: 0, y: 7, width: '100%', height: 2 });
    var rFill = svgEl('rect', { x: 0, y: 7, width: '0%', height: 2 });
    var rTick = svgEl('rect', { x: '100%', y: 5, width: 1, height: 6, transform: 'translate(-1,0)' });
    var rPace = svgEl('rect', { x: '0%', y: 4, width: 1, height: 8 });
    append(railSvg, [rTrack, rFill, rTick, rPace]);
    rail.appendChild(railSvg);

    function infoIcon() {
      var s = svgEl('svg', { class: 'icon icon--12', width: 12, height: 12, viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' });
      if (D.getElementById('i-info')) {
        var u = svgEl('use');
        u.setAttribute('href', '#i-info');
        s.appendChild(u);
      } else {
        s.appendChild(svgEl('circle', { cx: 8, cy: 8, r: 6.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.25 }));
        s.appendChild(svgEl('path', { d: 'M8 7.2V11.4M8 4.6v.2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'square' }));
      }
      return s;
    }

    function parts(v, ref) {
      var f = cfg.format || 'rp';
      if (typeof f === 'function') return { cur: '', n: f(v), mag: '', unit: cfg.unit || '' };
      if (f === 'rp') { var p = rpParts(v, ref); return { cur: p.sign + 'Rp', n: p.num, mag: p.mag, unit: '' }; }
      if (f === 'pct') return { cur: '', n: num((+v || 0) * 100, cfg.decimals == null ? 1 : cfg.decimals), mag: '%', unit: '' };
      if (f === 'pp') return { cur: '', n: num((+v || 0) * 100, cfg.decimals == null ? 1 : cfg.decimals), mag: '', unit: 'pp' };
      if (f === 'num') return { cur: '', n: num(v, cfg.decimals || 0), mag: '', unit: cfg.unit || '' };
      return { cur: '', n: fmt.int(v), mag: '', unit: cfg.unit || '' };
    }
    function paint(v, ref) {
      var p = parts(v, ref);
      uCur.textContent = p.cur; uCur.hidden = !p.cur;
      uN.textContent = p.n;
      uMag.textContent = p.mag; uMag.hidden = !p.mag;
      uMag.classList.toggle('u-pct', p.mag === '%');
      uUnit.textContent = p.unit; uUnit.hidden = !p.unit;
    }
    function setValue(v, animate) {
      if (st.stop) { st.stop(); st.stop = null; }
      if (v == null || !isFinite(v)) { uCur.textContent = uMag.textContent = uUnit.textContent = ''; uCur.hidden = uMag.hidden = uUnit.hidden = true; uN.style.minWidth = ''; uN.textContent = '—'; st.shown = null; return Promise.resolve(); }
      var from = st.shown != null ? st.shown : (cfg.from != null ? +cfg.from : null);
      st.shown = +v;
      var dur = animate && from != null && from !== +v && !reducedMotion() ? tokMs('dur-num', 600) : 0;
      uN.style.minWidth = '';
      paint(v, v);
      if (!dur) return Promise.resolve();
      /* §L.2 steady layout: reserve the target's rendered width during the run */
      var wpx = uN.getBoundingClientRect().width;
      if (wpx) uN.style.minWidth = Math.ceil(wpx) + 'px';
      return new Promise(function (res) {
        st.stop = tween(dur, EASE.enter, function (p) { paint(from + (v - from) * p, v); }, function () { st.stop = null; uN.style.minWidth = ''; res(); });
      });
    }
    function setRail(t, animate) {
      if (st.railStop) { st.railStop(); st.railStop = null; }
      var att = Math.max(0, +t.attainment || 0), pace = clamp(+t.pace || 0, 0, 1);
      var metal = tok('metal', root);
      rTrack.setAttribute('fill', tok('rule-strong'));
      rFill.setAttribute('fill', t.color ? color(t.color) : metal);
      rTick.setAttribute('fill', tok('text-1'));
      rPace.setAttribute('fill', tok('signal'));
      rPace.setAttribute('x', (pace * 100).toFixed(2) + '%');
      if (pace >= 0.999) rPace.setAttribute('transform', 'translate(-1,0)'); else rPace.removeAttribute('transform');
      var to = Math.min(att, 1) * 100;
      var from = parseFloat(rFill.getAttribute('width')) || 0;
      var dur = animate && !reducedMotion() ? tokMs('dur-num', 600) : 0;
      st.railStop = tween(dur, EASE.enter, function (p) { rFill.setAttribute('width', (from + (to - from) * p).toFixed(2) + '%'); });
      st.railAhead = att >= pace;
      st.railFull = t.label || (fmt.pct(att, 0) + ' target' + (t.month ? ' ' + t.month : '') + ' · laju ' + fmt.pct(pace, 0));
      st.railShort = t.shortLabel || ('pace ' + fmt.pct(pace, 0));
      fitRailLabel();
    }
    function fitRailLabel() {
      if (!st.railFull) return;
      var avail = foot.clientWidth;
      var full = textW('▲ ' + st.railFull, fontMono(10));
      var useShort = avail > 0 && avail - full < 56;
      railLabel.textContent = '';
      railLabel.title = st.railFull;
      railLabel.appendChild(h('span', { class: st.railAhead ? 'mc-pos' : 'mc-warn', text: (st.railAhead ? '▲' : '▼') + ' ' }));
      railLabel.appendChild(D.createTextNode(useShort ? st.railShort : st.railFull));
    }
    function setDelta() {
      var d = cfg.delta;
      deltaEl.textContent = '';
      if (d == null) { deltaEl.hidden = true; return; }
      if (typeof d !== 'object') d = { value: d };
      var r = fmt.delta(d.value, d.kind || 'pct', { invert: d.invert, d: d.d });
      deltaEl.hidden = false;
      deltaEl.className = 'mc-kpi__delta ' + r.cls;
      deltaEl.textContent = r.text + ' ' + (d.label != null ? d.label : (cfg.deltaLabel || 'dibanding bulan lalu'));
    }
    function ariaText() {
      var p = cfg.value == null ? '—' : (cfg.format === 'rp' ? rpSpoken(cfg.value) : (function () { var q = parts(cfg.value, cfg.value); return q.cur + ' ' + q.n + (q.mag ? ' ' + q.mag : '') + (q.unit ? ' ' + q.unit : ''); })());
      var bits = [cfg.label || cfg.eyebrow || 'KPI', p.trim()];
      if (cfg.state === 'na') bits.push('Tidak berlaku untuk filter ini');
      if (cfg.value2 && cfg.value2.value != null) bits.push(formatter(cfg.value2.format || 'int')(cfg.value2.value) + (cfg.value2.unit ? ' ' + cfg.value2.unit : ''));
      if (cfg.delta != null && !cfg.target) bits.push(deltaEl.textContent.replace('▲', 'up').replace('▼', 'down'));
      if (cfg.target && st.railFull) bits.push(st.railFull + (st.railAhead ? ', lebih cepat dari laju' : ', lebih lambat dari laju'));
      if (cfg.sub) bits.push(String(cfg.sub).replace(/^·\s*/, ''));
      return bits.join(', ');
    }

    function render(animate) {
      if (st.destroyed) return;
      root.classList.toggle('is-loading', cfg.state === 'loading');
      root.classList.toggle('is-na', cfg.state === 'na');
      root.classList.toggle('is-selected', !!cfg.selected);
      root.classList.toggle('is-clickable', typeof cfg.onClick === 'function');
      root.classList.toggle('has-spark', !!(cfg.spark && cfg.spark.length && !cfg.target && cfg.state !== 'na'));
      if (typeof cfg.onClick === 'function') {
        root.setAttribute('role', 'button');
        root.tabIndex = 0;
        if (cfg.selected != null) root.setAttribute('aria-pressed', cfg.selected ? 'true' : 'false');
      } else {
        root.setAttribute('role', 'group');
        root.removeAttribute('tabindex');
        root.removeAttribute('aria-pressed');
      }
      /* eyebrow */
      sw.textContent = '';
      if (cfg.product) { sw.hidden = false; sw.appendChild(glyph(cfg.product, { size: 7, color: cfg.color })); } else sw.hidden = true;
      eyeT.textContent = cfg.eyebrow || '';
      info.hidden = !cfg.info;
      /* cfg.demo: true for bank figures. The DEMO mark shows while demo data is on (MCD.demo). */
      if (cfg.demo != null && MCD.demo && typeof MCD.demo.tag === 'function') MCD.demo.tag(eyebrow, { inline: true, before: info, when: !!cfg.demo });
      /* value */
      var isNa = cfg.state === 'na';
      var vp = setValue(isNa ? null : cfg.value, animate);
      v2.textContent = '';
      if (cfg.value2 && cfg.value2.value != null && !isNa) {
        v2.hidden = false;
        if (cfg.value2.sep !== false) v2.appendChild(h('span', { class: 'mc-kpi__v2-sep', text: cfg.value2.sep || '·' }));
        var f2 = cfg.value2.format || 'int';
        if (f2 === 'pct' || f2 === 'pct0') {
          v2.appendChild(h('span', { text: num((+cfg.value2.value || 0) * 100, f2 === 'pct0' ? 0 : 1) }));
          v2.appendChild(h('span', { class: 'u-mag u-pct', text: '%' }));
        } else if (f2 === 'rp') {
          var q = rpParts(cfg.value2.value);
          v2.appendChild(h('span', { text: q.sign + 'Rp ' + q.num }));
          if (q.mag) v2.appendChild(h('span', { class: 'u-mag', text: q.mag }));
        } else {
          v2.appendChild(h('span', { text: formatter(f2)(cfg.value2.value) }));
        }
        if (cfg.value2.unit) v2.appendChild(h('span', { class: 'u-unit', text: cfg.value2.unit }));
      } else v2.hidden = true;
      /* foot */
      na.hidden = !isNa;
      foot.hidden = isNa;
      var hasTarget = !!cfg.target && !isNa;
      rail.hidden = railLabel.hidden = !hasTarget;
      subEl.hidden = !cfg.sub || hasTarget;
      subEl.textContent = cfg.sub || '';
      if (cfg.sub) subEl.title = String(cfg.sub); else subEl.removeAttribute('title');
      if (hasTarget) { deltaEl.hidden = true; setRail(cfg.target, animate); }
      else {
        /* §L.2: the delta glyph and colour switch at the end of the count-up */
        if (animate && st.shown != null && cfg.delta != null) vp.then(function () { if (!st.destroyed) { setDelta(); root.setAttribute('aria-label', ariaText()); } });
        else setDelta();
      }
      /* sparkline */
      var showSpark = cfg.spark && cfg.spark.length && !hasTarget && !isNa;
      sparkBox.hidden = !showSpark;
      if (showSpark) {
        var sc = { color: cfg.sparkColor || cfg.color || cfg.product || 'text-2', format: cfg.sparkFormat || (typeof cfg.format === 'string' ? cfg.format : 'int'), labels: cfg.sparkLabels, label: (cfg.eyebrow || '') + ' trend', animate: animate };
        if (st.spark) st.spark.update(cfg.spark, sc);
        else st.spark = sparkline(sparkBox, cfg.spark, Object.assign({ height: 28 }, sc));
      }
      root.setAttribute('aria-label', ariaText());
    }

    root.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.mc-kpi__info')) return;
      if (typeof cfg.onClick === 'function') cfg.onClick(cfg, e);
    });
    root.addEventListener('keydown', function (e) {
      if (e.target !== root || typeof cfg.onClick !== 'function') return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cfg.onClick(cfg, e); }
    });
    root.addEventListener('mouseenter', function () { if (typeof cfg.onHover === 'function') cfg.onHover(cfg); });
    root.addEventListener('mouseleave', function () { if (typeof cfg.onHover === 'function') cfg.onHover(null); });
    function showInfo() {
      if (!cfg.info) return;
      var r = info.getBoundingClientRect();
      Tip.show({ x: r.left, y: r.bottom - 6 }, { eyebrow: cfg.eyebrow ? 'Penjelasan · ' + cfg.eyebrow : 'Penjelasan', body: cfg.info }, root, true);
    }
    function hideInfo() { Tip.hide(root); }
    info.addEventListener('mouseenter', showInfo);
    info.addEventListener('focus', showInfo);
    info.addEventListener('mouseleave', hideInfo);
    info.addEventListener('blur', hideInfo);
    info.addEventListener('click', function (e) { e.stopPropagation(); showInfo(); });
    info.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideInfo(); });

    /* §C.3 390 layout: 171 px cells with 28 px numerals; value2 drops to its own line */
    function fitCompact() { var w = root.clientWidth; if (w) root.classList.toggle('is-compact', w < 200); }
    fitCompact();
    render(cfg.from != null);
    var kro = null;
    if ('ResizeObserver' in W) {
      var kroT = 0;
      kro = new W.ResizeObserver(function () {
        W.clearTimeout(kroT);
        kroT = W.setTimeout(function () { if (st.destroyed) return; fitCompact(); if (cfg.target) fitRailLabel(); }, 120);
      });
      kro.observe(root);
    }
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { if (!st.destroyed && cfg.target) fitRailLabel(); });

    var handle = {
      el: root,
      kind: 'kpiTile',
      update: function (x, y) {
        if (st.destroyed) return handle;
        if (y === undefined && x != null && typeof x === 'object' && !Array.isArray(x)) cfg = Object.assign({}, cfg, x);
        else cfg = merge(cfg, x, y || {});
        render(true);
        return handle;
      },
      setState: function (s) { cfg.state = s || null; render(false); return handle; },
      select: function (on) { cfg.selected = !!on; root.classList.toggle('is-selected', !!on); if (cfg.onClick) root.setAttribute('aria-pressed', on ? 'true' : 'false'); return handle; },
      highlight: function () { return handle; }, /* §D.7: KPI tiles stay unchanged on hover */
      showTable: function () { return handle; },
      resize: function () { if (st.spark) st.spark.resize(); return handle; },
      destroy: function () {
        st.destroyed = true;
        if (kro) kro.disconnect();
        if (st.stop) st.stop();
        if (st.railStop) st.railStop();
        if (st.spark) st.spark.destroy();
        Tip.hide(root);
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
    return handle;
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 14. stackedColumns(el, data, cfg)  (§C.4 block 5, §B.7)
   * data: [{key|month, label?, values|byProduct: {KSM: n, …}, target?, ghost?}]
   * cfg: series [{key,label,color}], valueKey, format, axisFormat, targetLabel
   * ────────────────────────────────────────────────────────────────────── */
  function normColumns(data, cfg) {
    var vk = cfg.valueKey;
    return (data || []).map(function (d, i) {
      var key = String(d.key != null ? d.key : d.month != null ? d.month : d.label != null ? d.label : i);
      var values = (vk && d[vk]) || d.values || d.byProduct || {};
      var label = d.label != null ? d.label : isMonthKey(key) ? fmt.month(key) : key;
      return {
        key: key, i: i, label: label,
        labelLong: d.labelLong || (isMonthKey(key) ? fmt.monthLong(key) : label),
        values: values,
        target: d.target != null && isFinite(d.target) ? +d.target : null,
        ghost: d.ghost != null && isFinite(d.ghost) ? +d.ghost : null,
        note: d.note, raw: d
      };
    });
  }
  function columnTip(ctx, r) {
    var f = ctx.fmt();
    var rows = [];
    ctx.series.forEach(function (s) {
      var v = +r.values[s.key] || 0;
      if (v > 0 || ctx.cfg.showZero) rows.push({ glyph: s.glyph, color: s.color, label: s.label, value: f(v) });
    });
    rows.push({ label: 'Total', value: f(r.total), strong: true });
    if (r.target != null) rows.push({ label: ctx.cfg.targetName || 'Target', value: f(r.target) + (r.target ? ' · ' + fmt.pct(r.total / r.target, 0) : ''), gold: true });
    if (r.ghost != null) rows.push({ label: ctx.cfg.ghostLabel || 'Proyeksi satu bulan penuh', value: f(r.ghost), muted: true });
    return { eyebrow: r.labelLong, rows: rows, foot: r.note || null };
  }
  var stackedColumns = define('stackedColumns', {
    height: 280,
    defaults: { format: 'rp' },
    setup: function (ctx) {
      ['grid', 'yaxis', 'xaxis', 'ghost', 'cols', 'base', 'target', 'cross'].forEach(function (n) { ctx.layer(n); });
      bindPointer(ctx, function (mx) {
        if (!ctx.rows || !ctx.rows.length) return;
        var i = bandIndex(ctx.x, mx - ctx.m.l, ctx.rows.length);
        if (i < 0) { colBlur(ctx); return; }
        var f = colFocus(ctx, i);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { colBlur(ctx); }, function (mx, my, e) {
        if (!ctx.rows || !ctx.rows.length) return;
        var i = bandIndex(ctx.x, mx - ctx.m.l, ctx.rows.length);
        if (i >= 0) ctx.click({ key: ctx.rows[i].key, index: i, datum: ctx.rows[i].raw }, e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var rows = normColumns(ctx.data, cfg);
      var keys = [];
      rows.forEach(function (r) { Object.keys(r.values).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
      var series = normSeriesDefs(cfg.series, keys, ctx.root);
      ctx.rows = rows; ctx.series = series;
      rows.forEach(function (r) {
        var acc = 0, top = null;
        r.segs = series.map(function (s) {
          var v = Math.max(0, +r.values[s.key] || 0);
          var seg = { s: s, k: s.key, v: v, y0: acc, y1: acc + v };
          acc += v;
          if (v > 0) top = seg;
          return seg;
        });
        if (top) top.top = true;
        r.total = acc;
      });
      var fAxis = axisFmt(ctx.fmt(cfg.axisFormat || cfg.format));
      var maxV = maxOf(rows, function (r) { return Math.max(r.total, r.target || 0, r.ghost || 0); }) || 1;
      var y = d3.scaleLinear().domain([0, maxV * 1.04]).nice(4);
      var ticks = niceTicks(y);
      var hasTarget = rows.some(function (r) { return r.target != null; });
      var m = { l: Math.max(24, axisWidth(ticks.map(fAxis)) + 12), t: hasTarget ? 20 : 8, r: 2, b: 24 };
      var pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, hh - m.t - m.b);
      y.range([ph, 0]);
      var x = d3.scaleBand().domain(rows.map(function (r) { return r.key; })).range([0, pw]).paddingInner(0.3).paddingOuter(0.15);
      var bw = x.bandwidth();
      ctx.x = x; ctx.y = y; ctx.m = m; ctx.pw = pw; ctx.ph = ph;
      var g = ctx.g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      drawYAxis(ctx, g, y, ticks, fAxis, pw);
      drawXBand(ctx, g, x, rows.map(function (r) { return r.key; }), rows.map(function (r) { return r.label; }), ph);

      /* pace ghost (§C.4 block 5): projected full month as a dashed outline */
      var ghosts = rows.filter(function (r) { return r.ghost != null; });
      var gh = ctx.layer('ghost').selectAll('rect').data(ghosts, function (r) { return r.key; });
      gh.exit().remove();
      gh.enter().append('rect').attr('fill', 'none').attr('stroke-dasharray', '2 2').attr('shape-rendering', 'crispEdges').merge(gh)
        .attr('data-c', function (r) { return r.key; })
        .attr('class', 'mc-mark')
        .attr('stroke', ctx.c('text-2'))
        .attr('x', function (r) { return Math.round(x(r.key)) + 0.5; })
        .attr('width', Math.max(0, Math.round(bw) - 1))
        .attr('y', function (r) { return crisp(y(r.ghost)); })
        .attr('height', function (r) { return Math.max(0, Math.round(y(0)) - crisp(y(r.ghost))); });

      var cols = ctx.layer('cols').selectAll('g.mc-col').data(rows, function (r) { return r.key; });
      cols.exit().remove();
      cols = cols.enter().append('g').attr('class', 'mc-col').merge(cols);
      cols.each(function (r, i) {
        var segs = d3.select(this).selectAll('rect').data(r.segs, function (s) { return s.k; });
        segs.exit().remove();
        var segE = segs.enter().append('rect').attr('class', 'mc-mark')
          .attr('x', x(r.key)).attr('width', bw).attr('y', ph).attr('height', 0);
        var all = segE.merge(segs)
          .attr('data-k', function (s) { return s.k; })
          .attr('data-c', r.key)
          .attr('fill', function (s) { return s.s.color; })
          .attr('fill-opacity', 0.9)
          .attr('rx', function (s) { return s.top ? 1 : 0; });
        ctx.tr(all, { delay: i * DUR.stagger })
          .attr('x', x(r.key)).attr('width', bw)
          .attr('y', function (s) { return y(s.y1); })
          .attr('height', function (s) {
            var hgt = y(s.y0) - y(s.y1);
            return Math.max(0, hgt - (s.y0 > 0 && hgt > 2 ? 1 : 0));
          });
      });

      /* target step line + right-aligned label above (§B.7) */
      var half = (x.step() - bw) / 2, pts = [], lastT = null;
      rows.forEach(function (r) {
        if (r.target == null) return;
        var ty = crisp(y(r.target));
        pts.push([x(r.key) - half, ty], [x(r.key) + bw + half, ty]);
        lastT = r;
      });
      var tLabel = lastT ? (cfg.targetLabel || ((cfg.targetName || 'Target') + ' ' + fAxis(lastT.target))) : null;
      drawTargetLine(ctx, g, pts.length ? 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1]; }).join('L') : null,
        tLabel, lastT ? Math.min(pw, x(lastT.key) + bw + half) : 0, lastT ? y(lastT.target) - 6 : 0);

      var cr = ctx.layer('cross').selectAll('line').data([0]);
      cr.enter().append('line').attr('class', 'mc-cross').style('opacity', 0).merge(cr).attr('y1', 0).attr('y2', ph);
    },
    summary: function (ctx) {
      var rows = ctx.rows || [];
      if (!rows.length) return (ctx.cfg.label || 'Grafik kolom') + ': belum ada data.';
      var f = spoken(ctx.cfg.format), last = rows[rows.length - 1];
      return (ctx.cfg.label || 'Kolom bertumpuk') + ', ' + rows.length + ' periode, ' + rows[0].labelLong + ' sampai ' + last.labelLong + '. ' +
        last.labelLong + ' ' + f(last.total) + (last.target ? ', ' + fmt.pct(last.total / last.target, 0) + ' dari target' : '') + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt();
      var hasT = ctx.rows.some(function (r) { return r.target != null; });
      return {
        columns: ['Periode'].concat(ctx.series.map(function (s) { return s.label; }), ['Total'], hasT ? ['Target'] : []),
        rows: ctx.rows.map(function (r) {
          return [r.labelLong].concat(ctx.series.map(function (s) { return f(+r.values[s.key] || 0); }), [f(r.total)], hasT ? [r.target != null ? f(r.target) : null] : []);
        })
      };
    },
    nav: {
      count: function (ctx) { return ctx.rows ? ctx.rows.length : 0; },
      focus: function (ctx, i) { return colFocus(ctx, i); },
      blur: function (ctx) { colBlur(ctx); },
      activate: function (ctx, i, e) { var r = ctx.rows[i]; ctx.click({ key: r.key, index: i, datum: r.raw }, e); }
    }
  });
  function bandIndex(x, px, n) {
    var r = x.range(), step = x.step();
    var start = r[0] + x.paddingOuter() * step - x.paddingInner() * step / 2;
    var i = Math.floor((px - start) / step);
    return i < 0 || i >= n ? -1 : i;
  }
  function colFocus(ctx, i) {
    var r = ctx.rows[i];
    var cx = ctx.x(r.key) + ctx.x.bandwidth() / 2;
    ctx.g.select('.mc-l-cross line').attr('x1', crisp(cx)).attr('x2', crisp(cx)).style('opacity', 1);
    applyDim(ctx, r.key);
    ctx.hover({ key: r.key, index: i, datum: r.raw });
    return { x: ctx.m.l + cx, y: ctx.m.t + ctx.y(Math.max(r.total, r.ghost || 0, r.target || 0)), content: columnTip(ctx, r) };
  }
  function colBlur(ctx) {
    ctx.g.select('.mc-l-cross line').style('opacity', 0);
    applyDim(ctx, ctx.hl);
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 15. hbars(el, data, cfg)  (§C.4 block 4, §C.5.1 mix kategori)
   * data: [{key, label, value, value2?, note?, glyph?, color?}]
   * cfg: format, color ('plat-3'), secondary {color, label}, max, sort,
   *      rowHeight 28, barHeight 10, labelWidth, valueLabel
   * ────────────────────────────────────────────────────────────────────── */
  function rowsFocus(ctx, i) {
    var r = ctx.rows[i];
    if (!r) return null;
    applyDim(ctx, r.key);
    ctx.hover({ key: r.key, index: i, datum: r.raw });
    return { x: ctx.anchorX ? ctx.anchorX(r, i) : ctx.w / 2, y: ctx.anchorY ? ctx.anchorY(r, i) : (i * ctx.rowH), content: ctx.tipFor(r, i) };
  }
  function rowsBlur(ctx) { applyDim(ctx, ctx.hl); ctx.untip(); ctx.hover(null); }
  function rowsPointer(ctx) {
    bindPointer(ctx, function (mx, my) {
      if (!ctx.rows || !ctx.rows.length) return;
      var i = ctx.rowAt ? ctx.rowAt(mx, my) : Math.floor((my - (ctx.top || 0)) / ctx.rowH);
      if (i < 0 || i >= ctx.rows.length) { rowsBlur(ctx); return; }
      var f = rowsFocus(ctx, i);
      if (f) ctx.tip(ctx.pt(f.x, f.y), f.content);
    }, function () { rowsBlur(ctx); }, function (mx, my, e) {
      if (!ctx.rows) return;
      var i = ctx.rowAt ? ctx.rowAt(mx, my) : Math.floor((my - (ctx.top || 0)) / ctx.rowH);
      if (i >= 0 && i < ctx.rows.length) ctx.click({ key: ctx.rows[i].key, index: i, datum: ctx.rows[i].raw }, e);
    });
  }
  var rowsNav = {
    count: function (ctx) { return ctx.rows ? ctx.rows.length : 0; },
    focus: function (ctx, i) { return rowsFocus(ctx, i); },
    blur: function (ctx) { rowsBlur(ctx); },
    activate: function (ctx, i, e) { var r = ctx.rows[i]; ctx.click({ key: r.key, index: i, datum: r.raw }, e); }
  };

  var hbars = define('hbars', {
    defaults: { format: 'int', rowHeight: 28, barHeight: 10, color: 'plat-3' },
    autoHeight: function (ctx) { return Math.max(1, (ctx.data || []).length) * ctx.cfg.rowHeight + 4; },
    setup: function (ctx) { rowsPointer(ctx); },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var f = ctx.fmt();
      var rows = (ctx.data || []).map(function (d, i) {
        var k = keyOf(d, i);
        return {
          key: k, label: d.label != null ? d.label : k, v: +d.value || 0,
          v2: d.value2 != null && isFinite(d.value2) ? +d.value2 : null,
          note: d.note, glyph: d.glyph || (cfg.glyphs !== false && PRODUCTS[k] && PRODUCT_ORDER.indexOf(k) >= 0 ? k : null),
          color: d.color, raw: d
        };
      });
      if (cfg.sort) rows.sort(function (a, b) { return cfg.sort === 'asc' ? a.v - b.v : b.v - a.v; });
      ctx.rows = rows;
      var gW = rows.some(function (r) { return r.glyph; }) ? 16 : 0;
      var labelW = cfg.labelWidth || clamp(Math.ceil(maxOf(rows, function (r) { return textW(r.label, fontSans(12)); })) + gW + 14, 40, Math.round(w * 0.4));
      var notes = rows.map(function (r) { r.noteText = r.note != null ? String(r.note) : f(r.v); return r.noteText; });
      var noteW = Math.ceil(maxOf(notes, function (s) { return textW(s, fontMono(11)); })) + 12;
      var pw = Math.max(16, w - labelW - noteW);
      var x = d3.scaleLinear().domain([0, cfg.max || maxOf(rows, function (r) { return Math.max(r.v, r.v2 || 0); }) || 1]).range([0, pw]);
      var rowH = ctx.autoH ? cfg.rowHeight : Math.max(16, Math.min(cfg.rowHeight, (hh - 4) / Math.max(1, rows.length)));
      var bh = Math.max(4, Math.min(cfg.barHeight, rowH - 10));
      ctx.rowH = rowH; ctx.top = 2;
      ctx.anchorX = function (r) { return labelW + x(r.v); };
      ctx.anchorY = function (r, i) { return 2 + i * rowH + rowH / 2 - bh / 2; };
      var secCol = ctx.c((cfg.secondary && cfg.secondary.color) || 'gold');
      ctx.tipFor = function (r) {
        var out = [{ label: cfg.valueLabel || 'Nilai', value: f(r.v), strong: true }];
        if (r.v2 != null) out.push({ label: (cfg.secondary && cfg.secondary.label) || 'Nilai kedua', value: f(r.v2) + (r.v ? ' · ' + fmt.pct(r.v2 / r.v, 0) : ''), color: secCol, shape: 'dash' });
        return { eyebrow: r.label, rows: out, foot: r.raw && r.raw.foot };
      };

      var sel = ctx.g.selectAll('g.mc-row').data(rows, function (r) { return r.key; });
      sel.exit().remove();
      var en = sel.enter().append('g').attr('class', 'mc-row mc-mark')
        .attr('transform', function (r, i) { return 'translate(0,' + (2 + i * rowH) + ')'; });
      en.append('text').attr('class', 'mc-t-label');
      en.append('rect').attr('class', 'mc-bar').attr('x', labelW).attr('width', 0).attr('rx', 1);
      en.append('rect').attr('class', 'mc-bar2').attr('x', labelW).attr('width', 0);
      en.append('text').attr('class', 'mc-note').attr('x', labelW + 8);
      var all = en.merge(sel).attr('data-k', function (r) { return r.key; });
      all.selectAll('path.mc-glyph').remove();
      all.each(function (r) { if (r.glyph) d3Glyph(d3.select(this), r.glyph, 5, rowH / 2, 8); });
      ctx.tr(all).attr('transform', function (r, i) { return 'translate(0,' + (2 + i * rowH) + ')'; });
      all.select('text.mc-t-label').attr('x', gW).attr('y', rowH / 2).attr('dy', '0.32em').text(function (r) { return r.label; });
      var by = (rowH - bh) / 2;
      var bar = all.select('rect.mc-bar')
        .attr('y', function (r) { return r.v2 != null ? by - 1.5 : by; }).attr('height', bh)
        .attr('fill', function (r) { return r.color ? ctx.c(r.color) : ctx.c(cfg.color); })
        .attr('fill-opacity', 0.9);
      ctx.tr(bar, { delay: function (r, i) { return i * DUR.stagger; } }).attr('x', labelW).attr('width', function (r) { return Math.max(0, x(r.v)); });
      var b2 = all.select('rect.mc-bar2').attr('y', by - 1.5 + bh + 2).attr('height', function (r) { return r.v2 != null ? 2 : 0; }).attr('fill', secCol);
      ctx.tr(b2, { delay: function (r, i) { return i * DUR.stagger + 60; } }).attr('x', labelW).attr('width', function (r) { return r.v2 != null ? Math.max(0, x(r.v2)) : 0; });
      var notesSel = all.select('text.mc-note').attr('y', rowH / 2).attr('dy', '0.32em')
        .attr('class', 'mc-note mc-t-value').style('fill', ctx.c('text-2'))
        .text(function (r) { return r.noteText; });
      ctx.tr(notesSel, { delay: function (r, i) { return i * DUR.stagger; } }).attr('x', function (r) { return labelW + x(r.v) + 8; });
    },
    summary: function (ctx) {
      var rows = ctx.rows || [];
      if (!rows.length) return (ctx.cfg.label || 'Grafik batang') + ': belum ada data.';
      var f = spoken(ctx.cfg.format);
      var top = rows.slice().sort(function (a, b) { return b.v - a.v; })[0];
      return (ctx.cfg.label || 'Grafik batang') + ', ' + rows.length + ' baris. Tertinggi ' + top.label + ' ' + f(top.v) + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt(), sec = ctx.rows.some(function (r) { return r.v2 != null; });
      return {
        columns: ['Kategori', ctx.cfg.valueLabel || 'Nilai'].concat(sec ? [(ctx.cfg.secondary && ctx.cfg.secondary.label) || 'Nilai kedua'] : []),
        rows: ctx.rows.map(function (r) { return [r.label, f(r.v)].concat(sec ? [r.v2 != null ? f(r.v2) : null] : []); })
      };
    },
    nav: rowsNav
  });

  /* ──────────────────────────────────────────────────────────────────────
   * 16. stepBars(el, data, cfg)  (§C.4 block 8; SME §7.4)
   * Stepped bars, never a funnel shape: widths relative to the first bar,
   * drop counts in --text-3, final bar in --metal.
   * data: [{key, label|step, n, plan?, auto?, kind?:'side'}]
   * cfg: format, footer, side {label, n}, note {text, tone:'warn'}, planLabel
   * ────────────────────────────────────────────────────────────────────── */
  var stepBars = define('stepBars', {
    defaults: { format: 'int', rowHeight: 30, barHeight: 12 },
    autoHeight: function (ctx) {
      var rows = ctx.data || [], c = ctx.cfg;
      var main = rows.filter(function (r) { return r.kind !== 'side'; }).length;
      var side = rows.length - main;
      return main * c.rowHeight + side * 18 + ((c.footer || c.side || c.note) ? 26 : 4) + (c.note ? 18 : 0);
    },
    setup: function (ctx) {
      rowsPointer(ctx);
      ctx.rowAt = function (mx, my) {
        for (var i = 0; i < ctx.rows.length; i++) { var r = ctx.rows[i]; if (my >= r.y0 && my < r.y1) return i; }
        return -1;
      };
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w;
      var f = ctx.fmt();
      var all = (ctx.data || []).map(function (d, i) {
        return { key: keyOf(d, i), label: d.label != null ? d.label : (d.step != null ? d.step : keyOf(d, i)), n: +(d.n != null ? d.n : d.value) || 0, plan: d.plan != null ? +d.plan : null, auto: d.auto != null ? +d.auto : null, side: d.kind === 'side', raw: d };
      });
      var main = all.filter(function (r) { return !r.side; });
      var first = main.length ? main[0].n : 0;
      var base = cfg.base || Math.max(first, maxOf(main, function (r) { return Math.max(r.n, r.plan || 0); })) || 1;
      var prev = null, yy = 2;
      all.forEach(function (r) {
        r.y0 = yy;
        if (r.side) { r.y1 = yy + 18; yy += 18; return; }
        r.prev = prev ? prev.n : null;
        r.drop = prev ? prev.n - r.n : null;
        r.share = first ? r.n / first : 0;
        r.conv = prev && prev.n ? r.n / prev.n : null;
        prev = r;
        r.y1 = yy + cfg.rowHeight;
        yy += cfg.rowHeight;
      });
      if (main.length) main[main.length - 1].last = true;
      ctx.rows = all;
      var labelW = cfg.labelWidth || clamp(Math.ceil(maxOf(main, function (r) { return textW(r.label, fontSans(12)); })) + 16, 64, Math.round(w * 0.42));
      var pctW = Math.ceil(textW('100%', fontMono(10))) + 4;
      var trailW = Math.ceil(maxOf(main, function (r) {
        return textW(f(r.n), fontMono(11)) + (r.drop ? textW('  −' + f(r.drop), fontMono(10)) : 0) + (r.plan != null ? textW('  ' + (cfg.planLabel || 'rencana') + ' ' + f(r.plan), fontMono(10)) : 0);
      })) + 10;
      var pw = Math.max(24, w - labelW - trailW - pctW - 8);
      var x = d3.scaleLinear().domain([0, base]).range([0, pw]);
      var bh = cfg.barHeight;
      var metal = ctx.c('metal'), neutral = ctx.c(cfg.color || 'plat-2');
      ctx.rowH = cfg.rowHeight;
      ctx.anchorX = function (r) { return labelW + x(Math.max(r.n, r.plan || 0)); };
      ctx.anchorY = function (r) { return r.y0 + (r.side ? 9 : cfg.rowHeight / 2 - bh / 2); };
      ctx.tipFor = function (r) {
        if (r.side) return { eyebrow: r.label, rows: [{ label: 'Jumlah', value: f(r.n), strong: true }] };
        var rr = [{ label: 'Jumlah', value: f(r.n), strong: true }];
        if (r.conv != null) rr.push({ label: 'Dari tahap sebelumnya', value: fmt.pct(r.conv, 1) });
        if (r.drop != null) rr.push({ label: 'Gugur di tahap ini', value: '−' + f(r.drop), muted: true });
        rr.push({ label: 'Dari tahap pertama', value: fmt.pct(r.share, 1) });
        if (r.plan != null) rr.push({ label: cfg.planLabel ? cfg.planLabel.charAt(0).toUpperCase() + cfg.planLabel.slice(1) : 'Rencana', value: f(r.plan) });
        if (r.auto != null) rr.push({ label: cfg.autoLabel || 'Otomatis', value: f(r.auto), muted: true });
        return { eyebrow: r.label, rows: rr };
      };
      var hatch = hatchPattern(ctx, ctx.id + '-hatch', alpha(metal, 0.9), alpha(metal, 0.25));

      var sel = ctx.g.selectAll('g.mc-row').data(all, function (r) { return r.key; });
      sel.exit().remove();
      var en = sel.enter().append('g').attr('class', 'mc-row mc-mark');
      en.append('text').attr('class', 'mc-t-label');
      en.append('rect').attr('class', 'mc-plan').attr('fill', 'none').attr('stroke-dasharray', '2 2').attr('shape-rendering', 'crispEdges');
      en.append('rect').attr('class', 'mc-bar').attr('x', labelW).attr('width', 0).attr('rx', 1);
      en.append('rect').attr('class', 'mc-auto').attr('width', 0);
      var tx = en.append('text').attr('class', 'mc-trail');
      tx.append('tspan').attr('class', 'mc-tv');
      tx.append('tspan').attr('class', 'mc-td');
      tx.append('tspan').attr('class', 'mc-tp');
      en.append('text').attr('class', 'mc-pct');
      var rowsSel = en.merge(sel).attr('data-k', function (r) { return r.key; })
        .attr('transform', function (r) { return 'translate(0,' + r.y0 + ')'; });
      rowsSel.select('text.mc-t-label')
        .attr('x', function (r) { return r.side ? 14 : 0; })
        .attr('y', function (r) { return r.side ? 9 : cfg.rowHeight / 2; }).attr('dy', '0.32em')
        .style('fill', function (r) { return r.last ? ctx.c('text-1') : null; })
        .style('font-size', function (r) { return r.side ? '12px' : null; })
        .text(function (r) { return r.side ? '↳ ' + r.label + ' · ' + f(r.n) : r.label; });
      var by = (cfg.rowHeight - bh) / 2;
      rowsSel.select('rect.mc-plan')
        .attr('stroke', ctx.c('text-2'))
        .attr('x', labelW + 0.5).attr('y', by + 0.5 - 2).attr('height', bh + 3)
        .attr('width', function (r) { return r.plan != null && !r.side ? Math.max(0, Math.round(x(r.plan)) - 1) : 0; })
        .style('display', function (r) { return r.plan != null && !r.side ? null : 'none'; });
      var bar = rowsSel.select('rect.mc-bar').attr('x', labelW).attr('y', by).attr('height', function (r) { return r.side ? 0 : bh; })
        .attr('fill', function (r) { return r.last ? metal : neutral; }).attr('fill-opacity', function (r) { return r.last ? 1 : 0.9; });
      ctx.tr(bar, { delay: function (r, i) { return i * 40; } }).attr('width', function (r) { return r.side ? 0 : Math.max(r.n > 0 ? 1 : 0, x(r.n)); });
      var au = rowsSel.select('rect.mc-auto').attr('y', by).attr('height', function (r) { return r.auto != null && !r.side ? bh : 0; }).attr('fill', hatch);
      ctx.tr(au, { delay: function (r, i) { return i * 40; } })
        .attr('x', function (r) { return labelW + x(Math.max(0, r.n - (r.auto || 0))); })
        .attr('width', function (r) { return r.auto != null && !r.side ? Math.max(0, x(Math.min(r.auto, r.n))) : 0; });
      var trail = rowsSel.select('text.mc-trail').attr('y', cfg.rowHeight / 2).attr('dy', '0.32em')
        .style('display', function (r) { return r.side ? 'none' : null; });
      trail.select('tspan.mc-tv').attr('class', 'mc-tv').style('fill', ctx.c('text-1')).style('font-size', '12px').text(function (r) { return f(r.n); });
      trail.select('tspan.mc-td').style('fill', ctx.c('text-3')).text(function (r) { return r.drop ? '  −' + f(r.drop) : ''; });
      trail.select('tspan.mc-tp').style('fill', ctx.c('text-3')).text(function (r) { return r.plan != null ? '  ' + (cfg.planLabel || 'rencana') + ' ' + f(r.plan) : ''; });
      ctx.tr(trail, { delay: function (r, i) { return i * 40; } }).attr('x', function (r) { return labelW + x(Math.max(r.n, r.plan || 0)) + 8; });
      rowsSel.select('text.mc-pct').attr('x', w).attr('y', cfg.rowHeight / 2).attr('dy', '0.32em').attr('text-anchor', 'end')
        .style('display', function (r) { return r.side ? 'none' : null; })
        .text(function (r) { return fmt.pct(r.share, r.share > 0 && r.share < 0.1 ? 1 : 0); });

      /* footer: provenance/potential on the left, side counter on the right */
      var fy = yy + 16;
      var foot = ctx.layer('foot');
      var ft = foot.selectAll('text.mc-foot-l').data(cfg.footer ? [cfg.footer] : []);
      ft.exit().remove();
      ft.enter().append('text').attr('class', 'mc-foot-l mc-t-value').merge(ft).attr('x', 0).attr('y', fy).style('fill', ctx.c('text-2')).text(function (d) { return d; });
      var sd = foot.selectAll('text.mc-foot-r').data(cfg.side ? [cfg.side] : []);
      sd.exit().remove();
      sd.enter().append('text').attr('class', 'mc-foot-r').merge(sd).attr('x', w).attr('y', fy).attr('text-anchor', 'end')
        .text(function (d) { return d.label + ' ' + f(d.n); });
      var nt = foot.selectAll('text.mc-foot-n').data(cfg.note ? [cfg.note] : []);
      nt.exit().remove();
      nt.enter().append('text').attr('class', 'mc-foot-n').merge(nt).attr('x', 0).attr('y', fy + (cfg.footer || cfg.side ? 18 : 0))
        .attr('class', function (d) { return 'mc-foot-n ' + (d.tone === 'warn' ? 'mc-t-warn' : 'mc-t-muted'); })
        .text(function (d) { return (d.tone === 'warn' ? '▲ ' : '') + (d.text || d); });
    },
    summary: function (ctx) {
      var rows = (ctx.rows || []).filter(function (r) { return !r.side; });
      if (!rows.length) return (ctx.cfg.label || 'Tahapan') + ': belum ada data.';
      var f = ctx.fmt();
      return (ctx.cfg.label || 'Tahapan') + ': ' + rows.map(function (r) { return r.label + ' ' + f(r.n); }).join(', ') + '. Tahap terakhir ' + fmt.pct(rows[rows.length - 1].share, 0) + ' dari tahap pertama.';
    },
    table: function (ctx) {
      var f = ctx.fmt();
      return {
        columns: ['Tahap', 'Jumlah', 'Gugur', '% dari tahap pertama'],
        rows: ctx.rows.map(function (r) { return [r.label, f(r.n), r.drop != null ? f(r.drop) : null, r.side ? null : fmt.pct(r.share, 0)]; })
      };
    },
    nav: Object.assign({}, rowsNav, { hint: 'Gunakan tombol panah atas dan bawah untuk berpindah tahap.' })
  });

  /* ──────────────────────────────────────────────────────────────────────
   * 17. histogram(el, data, cfg)  (§C.4 block 9)
   * data: [{bin, n}] (bin = lower edge) or [{x0, x1, n}]
   * cfg: binWidth 5, xFormat (v → label), overflowLabel '80%+', unitLabel,
   *      threshold {value, label, above: 'neg', alpha: .7}, color 'plat-3'
   * ────────────────────────────────────────────────────────────────────── */
  var histogram = define('histogram', {
    height: 220,
    defaults: { format: 'int', binWidth: 5, color: 'plat-3' },
    setup: function (ctx) {
      ['grid', 'yaxis', 'xaxis', 'bars', 'base', 'thr'].forEach(function (n) { ctx.layer(n); });
      bindPointer(ctx, function (mx) {
        if (!ctx.bins || !ctx.bins.length) return;
        var i = histIndex(ctx, mx - ctx.m.l);
        if (i < 0) { histBlur(ctx); return; }
        var f = histFocus(ctx, i);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { histBlur(ctx); }, function (mx, my, e) {
        var i = ctx.bins ? histIndex(ctx, mx - ctx.m.l) : -1;
        if (i >= 0) ctx.click({ key: ctx.bins[i].key, index: i, datum: ctx.bins[i].raw }, e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var bwid = cfg.binWidth;
      var xf = cfg.xFormat || function (v) { return num(v, 0); };
      var bins = (ctx.data || []).map(function (d, i) {
        var x0 = d.x0 != null ? +d.x0 : +d.bin;
        var x1 = d.x1 != null ? +d.x1 : x0 + bwid;
        return { key: String(d.key != null ? d.key : x0), x0: x0, x1: x1, n: +(d.n != null ? d.n : d.value) || 0, raw: d, i: i };
      }).filter(function (b) { return isFinite(b.x0); });
      bins.forEach(function (b, i) {
        b.last = i === bins.length - 1;
        b.label = b.last && cfg.overflowLabel ? cfg.overflowLabel : xf(b.x0) + '–' + xf(b.x1);
      });
      ctx.bins = bins;
      var yF = axisFmt(ctx.fmt());
      var y = d3.scaleLinear().domain([0, (maxOf(bins, function (b) { return b.n; }) || 1) * 1.04]).nice(4);
      var ticks = niceTicks(y);
      var thr = cfg.threshold;
      var m = { l: Math.max(20, axisWidth(ticks.map(yF)) + 12), t: thr && thr.label ? 20 : 8, r: 4, b: 24 };
      var pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, hh - m.t - m.b);
      y.range([ph, 0]);
      var lo = bins.length ? bins[0].x0 : 0, hi = bins.length ? bins[bins.length - 1].x1 : 1;
      var x = d3.scaleLinear().domain([lo, hi]).range([0, pw]);
      ctx.x = x; ctx.y = y; ctx.m = m; ctx.ph = ph;
      var g = ctx.g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      drawYAxis(ctx, g, y, ticks, yF, pw);
      /* x ticks at bin edges, thinned to fit */
      var edges = bins.map(function (b) { return b.x0; });
      if (cfg.overflowLabel && edges.length > 1) edges.pop(); /* the overflow bin carries its own label */
      var lw = axisWidth(edges.map(xf));
      var stepPx = bins.length ? pw / bins.length : pw;
      var k = Math.max(1, Math.ceil((lw + 12) / stepPx));
      var tickData = edges.filter(function (_, i) { return i % k === 0; }).map(function (v) { return { v: v, t: xf(v) }; });
      if (cfg.overflowLabel && bins.length) tickData.push({ v: (bins[bins.length - 1].x0 + bins[bins.length - 1].x1) / 2, t: cfg.overflowLabel, over: true });
      var ax = ctx.layer('xaxis').attr('class', 'mc-l-xaxis mc-ax').selectAll('text').data(tickData, function (d) { return d.t; });
      ax.exit().remove();
      ax.enter().append('text').merge(ax).attr('x', function (d) { return x(d.v); }).attr('y', ph + 16)
        .attr('text-anchor', function (d, i) { return d.over ? 'middle' : (i === 0 ? 'start' : 'middle'); }).text(function (d) { return d.t; });
      var above = ctx.c((thr && thr.above) || 'neg'), base = ctx.c(cfg.color);
      var bars = ctx.layer('bars').selectAll('rect').data(bins, function (b) { return b.key; });
      bars.exit().remove();
      var be = bars.enter().append('rect').attr('class', 'mc-mark').attr('y', ph).attr('height', 0);
      var ball = be.merge(bars).attr('data-c', function (b) { return b.key; })
        .attr('x', function (b) { return x(b.x0) + 0.5; })
        .attr('width', function (b) { return Math.max(0.5, x(b.x1) - x(b.x0) - 1); })
        .attr('fill', function (b) { return thr && b.x0 >= thr.value ? above : base; })
        .attr('fill-opacity', function (b) { return thr && b.x0 >= thr.value ? (thr.alpha != null ? thr.alpha : 0.7) : 0.9; });
      ctx.tr(ball, { delay: function (b, i) { return i * DUR.stagger; } })
        .attr('y', function (b) { return y(b.n); }).attr('height', function (b) { return Math.max(0, ph - y(b.n)); });
      /* threshold: gold dashed with label */
      var tl = ctx.layer('thr');
      var tp = tl.selectAll('line').data(thr ? [thr] : []);
      tp.exit().remove();
      tp.enter().append('line').attr('class', 'mc-target').merge(tp)
        .attr('x1', function (d) { return crisp(x(d.value)); }).attr('x2', function (d) { return crisp(x(d.value)); }).attr('y1', -4).attr('y2', ph);
      var tt = tl.selectAll('text').data(thr && thr.label ? [thr] : []);
      tt.exit().remove();
      tt.enter().append('text').attr('class', 'mc-t-gold').merge(tt)
        .attr('x', function (d) { return x(d.value) + 6; }).attr('y', -8)
        .attr('text-anchor', function (d) { return x(d.value) > pw * 0.7 ? 'end' : 'start'; })
        .attr('dx', function (d) { return x(d.value) > pw * 0.7 ? -12 : 0; })
        .text(function (d) { return d.label; });
    },
    summary: function (ctx) {
      var bins = ctx.bins || [];
      if (!bins.length) return (ctx.cfg.label || 'Histogram') + ': belum ada data.';
      var tot = sum(bins, function (b) { return b.n; });
      var mode = bins.slice().sort(function (a, b) { return b.n - a.n; })[0];
      var thr = ctx.cfg.threshold;
      var above = thr ? sum(bins.filter(function (b) { return b.x0 >= thr.value; }), function (b) { return b.n; }) : 0;
      return (ctx.cfg.label || 'Histogram') + ', ' + fmt.int(tot) + ' ' + (ctx.cfg.unitLabel || 'data') + '. Terbanyak di ' + mode.label + ' (' + fmt.int(mode.n) + ')' +
        (thr ? '. ' + fmt.int(above) + ' di atas ' + (thr.label || 'batas') : '') + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt();
      return { columns: ['Rentang', 'Jumlah'], rows: ctx.bins.map(function (b) { return [b.label, f(b.n)]; }) };
    },
    nav: {
      count: function (ctx) { return ctx.bins ? ctx.bins.length : 0; },
      focus: function (ctx, i) { return histFocus(ctx, i); },
      blur: function (ctx) { histBlur(ctx); },
      activate: function (ctx, i, e) { ctx.click({ key: ctx.bins[i].key, index: i, datum: ctx.bins[i].raw }, e); }
    }
  });
  function histIndex(ctx, px) {
    var v = ctx.x.invert(px);
    for (var i = 0; i < ctx.bins.length; i++) if (v >= ctx.bins[i].x0 && v < ctx.bins[i].x1) return i;
    return -1;
  }
  function histFocus(ctx, i) {
    var b = ctx.bins[i];
    applyDim(ctx, b.key);
    ctx.hover({ key: b.key, index: i, datum: b.raw });
    var tot = sum(ctx.bins, function (q) { return q.n; });
    return {
      x: ctx.m.l + (ctx.x(b.x0) + ctx.x(b.x1)) / 2, y: ctx.m.t + ctx.y(b.n),
      content: { eyebrow: b.label, rows: [{ label: ctx.cfg.unitLabel ? ctx.cfg.unitLabel.charAt(0).toUpperCase() + ctx.cfg.unitLabel.slice(1) : 'Jumlah', value: ctx.fmt()(b.n), strong: true }, { label: 'Porsi', value: tot ? fmt.pct(b.n / tot, 1) : '—' }] }
    };
  }
  function histBlur(ctx) { applyDim(ctx, ctx.hl); ctx.untip(); ctx.hover(null); }

  /* ──────────────────────────────────────────────────────────────────────
   * 18. line(el, series, cfg)  (§B.7; combo for §C.5 Volume QRIS, ADB,
   *     retention, leakage, leaderboard trend)
   * series: [{key, label, color, values: number[] | [{x, y}], type: 'line' |
   *          'bar', axis: 'left'|'right', dash, area, width, format, hatch,
   *          lastDot}]  (a single series object or number[] also works)
   * cfg: x (categories), xType ('band'|'linear'|'time'), xFormat, xLabels,
   *      format, rightFormat, target (number | number[]), targetLabel,
   *      markers [{x, label}], between {a, b, color}, curve, yDomain
   * ────────────────────────────────────────────────────────────────────── */
  function normLine(data, cfg, node) {
    var raw = data;
    if (!Array.isArray(raw)) raw = raw ? [raw] : [];
    if (raw.length && (typeof raw[0] === 'number' || raw[0] == null)) raw = [{ key: 'value', values: raw }];
    var xs = cfg.x ? cfg.x.slice() : null;
    if (!xs) {
      var first = raw.length ? raw[0].values || [] : [];
      xs = first.map(function (v, i) { return v != null && typeof v === 'object' && v.x != null ? v.x : i; });
    }
    var keyIdx = {};
    xs.forEach(function (x, i) { keyIdx[String(x instanceof Date ? x.getTime() : x)] = i; });
    var series = raw.map(function (s, si) {
      var key = String(s.key != null ? s.key : si);
      var vals = new Array(xs.length).fill(null);
      (s.values || []).forEach(function (v, i) {
        if (v != null && typeof v === 'object') {
          var idx = v.x != null ? keyIdx[String(v.x instanceof Date ? v.x.getTime() : v.x)] : i;
          if (idx != null) vals[idx] = v.y == null || !isFinite(v.y) ? null : +v.y;
        } else if (i < vals.length) vals[i] = v == null || !isFinite(v) ? null : +v;
      });
      return {
        key: key,
        label: s.label != null ? s.label : (PRODUCTS[key] ? PRODUCTS[key].label : key),
        color: seriesColor({ key: key, color: s.color }, si, node),
        glyph: s.glyph || (PRODUCTS[key] ? key : null),
        type: s.type || 'line', axis: s.axis || 'left', dash: s.dash || null,
        area: s.area, width: s.width || 1.5, format: s.format, hatch: s.hatch, lastDot: s.lastDot !== false,
        alpha: s.alpha, curve: s.curve, vals: vals, raw: s
      };
    });
    var xType = cfg.xType;
    if (!xType) {
      if (series.some(function (s) { return s.type === 'bar'; })) xType = 'band';
      else if (xs.length && xs.every(function (x) { return x instanceof Date; })) xType = 'time';
      else if (xs.length && xs.every(function (x) { return typeof x === 'number'; }) && !cfg.x) xType = 'band';
      else if (xs.length && xs.every(function (x) { return typeof x === 'number'; })) xType = 'linear';
      else xType = 'band';
    }
    var labels = cfg.xLabels ? cfg.xLabels.slice() : xs.map(function (x) {
      if (cfg.xFormat) return cfg.xFormat(x);
      if (x instanceof Date || isMonthKey(x)) return fmt.month(x);
      return String(x);
    });
    var labelsLong = xs.map(function (x, i) {
      if (cfg.xLabelsLong) return cfg.xLabelsLong[i];
      if (x instanceof Date || isMonthKey(x)) return fmt.monthLong(x);
      return labels[i];
    });
    return { series: series, xs: xs, xType: xType, labels: labels, labelsLong: labelsLong };
  }
  var line = define('line', {
    height: 240,
    defaults: { format: 'rp', curve: 'linear' },
    setup: function (ctx) {
      ['grid', 'yaxis', 'yaxis2', 'xaxis', 'between', 'bars', 'areas', 'base', 'lines', 'target', 'markers', 'dots', 'cross', 'hdots'].forEach(function (n) { ctx.layer(n); });
      bindPointer(ctx, function (mx) {
        if (!ctx.L || !ctx.L.xs.length) return;
        var i = lineIndex(ctx, mx - ctx.m.l);
        if (i < 0) { lineBlur(ctx); return; }
        var f = lineFocus(ctx, i);
        if (f) ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { lineBlur(ctx); }, function (mx, my, e) {
        if (!ctx.L) return;
        var i = lineIndex(ctx, mx - ctx.m.l);
        if (i >= 0) ctx.click({ key: String(ctx.L.xs[i]), index: i, x: ctx.L.xs[i] }, e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var L = normLine(ctx.data, cfg, ctx.root);
      ctx.L = L;
      var n = L.xs.length;
      var left = L.series.filter(function (s) { return s.axis !== 'right'; });
      var right = L.series.filter(function (s) { return s.axis === 'right'; });
      var tgt = cfg.target;
      var tArr = tgt == null ? null : Array.isArray(tgt) ? tgt : L.xs.map(function () { return +tgt; });
      function ext(list, extra) {
        var lo = Infinity, hi = -Infinity;
        list.forEach(function (s) { s.vals.forEach(function (v) { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }); });
        (extra || []).forEach(function (v) { if (v != null && isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } });
        if (lo === Infinity) { lo = 0; hi = 1; }
        return [Math.min(0, lo), hi];
      }
      var eL = cfg.yDomain || ext(left, tArr);
      var yL = d3.scaleLinear().domain([eL[0], eL[1] === eL[0] ? eL[0] + 1 : eL[1] * (cfg.yDomain ? 1 : 1.04)]).nice(4);
      var yR = null;
      if (right.length) {
        var eR = cfg.yDomainRight || ext(right);
        yR = d3.scaleLinear().domain([eR[0], eR[1] === eR[0] ? eR[0] + 1 : eR[1] * (cfg.yDomainRight ? 1 : 1.04)]).nice(4);
      }
      var fL = axisFmt(ctx.fmt(cfg.axisFormat || cfg.format));
      var fR = right.length ? axisFmt(formatter(cfg.rightFormat || right[0].format || 'pct0')) : null;
      var tL = niceTicks(yL);
      var tR = yR ? niceTicks(yR) : [];
      var hasTop = tArr || (cfg.markers && cfg.markers.length);
      var m = { l: Math.max(24, axisWidth(tL.map(fL)) + 12), t: hasTop ? 20 : 8, r: yR ? axisWidth(tR.map(fR)) + 12 : 4, b: 24 };
      var pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, hh - m.t - m.b);
      yL.range([ph, 0]);
      if (yR) yR.range([ph, 0]);
      var xb = null, xl = null, px;
      if (L.xType === 'band') {
        xb = d3.scaleBand().domain(L.xs.map(String)).range([0, pw]).paddingInner(0.3).paddingOuter(0.15);
        px = function (i) { return xb(String(L.xs[i])) + xb.bandwidth() / 2; };
      } else {
        xl = (L.xType === 'time' ? d3.scaleTime() : d3.scaleLinear()).domain(d3.extent(L.xs)).range([0, pw]);
        px = function (i) { return xl(L.xs[i]); };
      }
      ctx.xb = xb; ctx.xl = xl; ctx.px = px; ctx.yL = yL; ctx.yR = yR; ctx.m = m; ctx.pw = pw; ctx.ph = ph;
      var g = ctx.g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      drawYAxis(ctx, g, yL, tL, fL, pw);
      if (yR) drawYAxis(ctx, g, yR, tR, fR, pw, { right: true });
      else ctx.layer('yaxis2').selectAll('*').remove();
      /* x labels */
      if (xb) drawXBand(ctx, g, xb, L.xs.map(String), L.labels, ph);
      else {
        var lw = axisWidth(L.labels);
        var k = Math.max(1, Math.ceil((lw + 12) / (pw / Math.max(1, n - 1))));
        var xd = L.xs.map(function (x, i) { return { i: i, t: L.labels[i] }; }).filter(function (d) { return (n - 1 - d.i) % k === 0; });
        var xa = ctx.layer('xaxis').attr('class', 'mc-l-xaxis mc-ax').selectAll('text').data(xd, function (d) { return d.t; });
        xa.exit().remove();
        xa.enter().append('text').merge(xa).attr('x', function (d) { return px(d.i); }).attr('y', ph + 16)
          .attr('text-anchor', function (d) { return d.i === 0 ? 'start' : d.i === n - 1 ? 'end' : 'middle'; }).text(function (d) { return d.t; });
      }
      function yOf(s) { return s.axis === 'right' && yR ? yR : yL; }
      function defd(s) { return function (i) { return s.vals[i] != null; }; }
      var idx = L.xs.map(function (_, i) { return i; });

      /* shaded gap between two series (leaderboard cumulative mode) */
      var bt = cfg.between;
      var bsel = ctx.layer('between').selectAll('path').data(bt ? [bt] : []);
      bsel.exit().remove();
      if (bt) {
        var A = L.series.filter(function (s) { return s.key === String(bt.a); })[0];
        var B = L.series.filter(function (s) { return s.key === String(bt.b); })[0];
        if (A && B) {
          var ar = d3.area().defined(function (i) { return A.vals[i] != null && B.vals[i] != null; })
            .x(px).y0(function (i) { return yOf(B)(B.vals[i]); }).y1(function (i) { return yOf(A)(A.vals[i]); })
            .curve(curveOf(d3, cfg.curve));
          bsel.enter().append('path').merge(bsel).attr('d', ar(idx)).attr('fill', alpha(ctx.c(bt.color || 'neg'), bt.alpha != null ? bt.alpha : 0.08));
        }
      }
      /* bars */
      var barSeries = L.series.filter(function (s) { return s.type === 'bar' && xb; });
      var bw = xb ? xb.bandwidth() / Math.max(1, barSeries.length) : 0;
      var bg = ctx.layer('bars').selectAll('g.mc-bs').data(barSeries, function (s) { return s.key; });
      bg.exit().remove();
      bg = bg.enter().append('g').attr('class', 'mc-bs').merge(bg);
      bg.each(function (s, si) {
        var y = yOf(s), y0 = y(Math.max(y.domain()[0], 0));
        var hatchFill = s.hatch != null ? hatchPattern(ctx, ctx.id + '-h' + si, alpha(s.color, 0.85), alpha(s.color, 0.2)) : null;
        var data = idx.filter(function (i) { return s.vals[i] != null; });
        var r = d3.select(this).selectAll('rect').data(data, function (i) { return String(L.xs[i]); });
        r.exit().remove();
        var re = r.enter().append('rect').attr('class', 'mc-mark').attr('y', y0).attr('height', 0);
        var all = re.merge(r).attr('data-k', s.key).attr('data-c', function (i) { return String(L.xs[i]); })
          .attr('x', function (i) { return xb(String(L.xs[i])) + si * bw; }).attr('width', Math.max(0.5, bw - (barSeries.length > 1 ? 1 : 0)))
          .attr('rx', 1)
          .attr('fill', function (i) { return hatchFill && (s.hatch === i || (Array.isArray(s.hatch) && s.hatch.indexOf(i) >= 0)) ? hatchFill : s.color; })
          .attr('fill-opacity', s.alpha != null ? s.alpha : 0.9);
        ctx.tr(all, { delay: function (i, k) { return k * DUR.stagger; } })
          .attr('y', function (i) { return Math.min(y(s.vals[i]), y0); })
          .attr('height', function (i) { return Math.abs(y0 - y(s.vals[i])); });
      });
      /* areas (8 %) and lines (1.5 px) */
      var lineSeries = L.series.filter(function (s) { return s.type !== 'bar'; });
      var areaSeries = lineSeries.filter(function (s) { return s.area === true || (s.area !== false && cfg.area !== false && !s.dash); });
      var as = ctx.layer('areas').selectAll('path').data(areaSeries, function (s) { return s.key; });
      as.exit().remove();
      var asAll = as.enter().append('path').attr('class', 'mc-mark').merge(as).attr('data-k', function (s) { return s.key; })
        .attr('fill', function (s) { return alpha(s.color, 0.08); });
      ctx.tr(asAll, { dur: DUR.morph }).attr('d', function (s) {
        var y = yOf(s), y0 = y(Math.max(y.domain()[0], 0));
        return d3.area().defined(defd(s)).x(px).y0(y0).y1(function (i) { return y(s.vals[i]); }).curve(curveOf(d3, s.curve || cfg.curve))(idx);
      });
      var ls = ctx.layer('lines').selectAll('path').data(lineSeries, function (s) { return s.key; });
      ls.exit().remove();
      var lsAll = ls.enter().append('path').attr('class', 'mc-mark').attr('fill', 'none').attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
        .merge(ls).attr('data-k', function (s) { return s.key; })
        .attr('stroke', function (s) { return s.color; }).attr('stroke-width', function (s) { return s.width; })
        .attr('stroke-dasharray', function (s) { return s.dash || null; });
      ctx.tr(lsAll, { dur: DUR.morph }).attr('d', function (s) {
        var y = yOf(s);
        return d3.line().defined(defd(s)).x(px).y(function (i) { return y(s.vals[i]); }).curve(curveOf(d3, s.curve || cfg.curve))(idx);
      });
      /* last-point dots (3 px) */
      var lastPts = lineSeries.filter(function (s) { return s.lastDot && !s.dash; }).map(function (s) {
        var li = -1;
        s.vals.forEach(function (v, i) { if (v != null) li = i; });
        return li < 0 ? null : { s: s, i: li };
      }).filter(Boolean);
      var dts = ctx.layer('dots').selectAll('circle').data(lastPts, function (d) { return d.s.key; });
      dts.exit().remove();
      dts.enter().append('circle').attr('class', 'mc-mark').attr('r', 1.75).merge(dts)
        .attr('data-k', function (d) { return d.s.key; }).attr('fill', function (d) { return d.s.color; })
        .attr('cx', function (d) { return px(d.i); }).attr('cy', function (d) { return yOf(d.s)(d.s.vals[d.i]); });
      clipReveal(ctx, ctx.layer('lines'), pw, ph);
      ctx.layer('areas').attr('clip-path', ctx.layer('lines').attr('clip-path'));
      ctx.layer('between').attr('clip-path', ctx.layer('lines').attr('clip-path'));
      ctx.layer('dots').style('opacity', ctx.animate && ctx.first ? 0 : 1);
      if (ctx.animate && ctx.first) ctx.layer('dots').transition().delay(DUR.bar).duration(240).style('opacity', 1);
      /* target */
      if (tArr) {
        var pts = [];
        if (xb) {
          var half = (xb.step() - xb.bandwidth()) / 2;
          tArr.forEach(function (t, i) { if (t == null) return; var ty = crisp(yL(t)); pts.push([xb(String(L.xs[i])) - half, ty], [xb(String(L.xs[i])) + xb.bandwidth() + half, ty]); });
        } else tArr.forEach(function (t, i) { if (t != null) pts.push([px(i), yL(t)]); });
        var lastT = null;
        tArr.forEach(function (t) { if (t != null) lastT = t; });
        drawTargetLine(ctx, g, pts.length ? 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + (+p[1]).toFixed(1); }).join('L') : null,
          cfg.targetLabel || ((cfg.targetName || 'Target') + ' ' + fL(lastT)), pw, yL(lastT) - 6);
      } else drawTargetLine(ctx, g, null);
      /* markers (retention D+3, D+10, D+25) */
      var mk = (cfg.markers || []).map(function (mm) {
        var i = L.xs.findIndex(function (x) { return String(x) === String(mm.x); });
        return i < 0 ? null : { i: i, label: mm.label, s: lineSeries[0] };
      }).filter(Boolean);
      var mg = ctx.layer('markers').selectAll('g').data(mk, function (d) { return d.label; });
      mg.exit().remove();
      var me = mg.enter().append('g');
      me.append('line').attr('stroke-dasharray', '2 2').attr('shape-rendering', 'crispEdges');
      me.append('text').attr('class', 'mc-mk-l').attr('text-anchor', 'middle');
      me.append('circle').attr('r', 2.5);
      me.append('text').attr('class', 'mc-mk-v mc-t-value mc-halo');
      var mAll = me.merge(mg);
      mAll.select('line').attr('stroke', ctx.c('rule-strong')).attr('x1', function (d) { return crisp(px(d.i)); }).attr('x2', function (d) { return crisp(px(d.i)); }).attr('y1', -4).attr('y2', ph);
      mAll.select('text.mc-mk-l').attr('x', function (d) { return px(d.i); }).attr('y', -8).style('fill', ctx.c('text-2')).text(function (d) { return d.label; });
      mAll.select('circle').attr('cx', function (d) { return px(d.i); })
        .attr('cy', function (d) { return d.s && d.s.vals[d.i] != null ? yOf(d.s)(d.s.vals[d.i]) : -99; })
        .attr('fill', ctx.c('canvas')).attr('stroke', function (d) { return d.s ? d.s.color : ctx.c('text-1'); }).attr('stroke-width', 1.25);
      mAll.select('text.mc-mk-v').attr('x', function (d) { return px(d.i) + 6; })
        .attr('y', function (d) { return d.s && d.s.vals[d.i] != null ? yOf(d.s)(d.s.vals[d.i]) - 6 : -99; })
        .text(function (d) { return d.s && d.s.vals[d.i] != null ? formatter(d.s.format || cfg.format)(d.s.vals[d.i]) : ''; });
      var cr = ctx.layer('cross').selectAll('line').data([0]);
      cr.enter().append('line').attr('class', 'mc-cross').style('opacity', 0).merge(cr).attr('y1', 0).attr('y2', ph);
    },
    summary: function (ctx) {
      var L = ctx.L;
      if (!L || !L.xs.length) return (ctx.cfg.label || 'Grafik garis') + ': belum ada data.';
      var parts = L.series.map(function (s) {
        var li = -1;
        s.vals.forEach(function (v, i) { if (v != null) li = i; });
        return li < 0 ? null : s.label + ' ' + L.labelsLong[li] + ' ' + (s.format ? formatter(s.format) : spoken(s.axis === 'right' ? (ctx.cfg.rightFormat || 'pct0') : ctx.cfg.format))(s.vals[li]);
      }).filter(Boolean);
      return (ctx.cfg.label || 'Grafik garis') + ', ' + L.xs.length + ' titik, ' + L.labelsLong[0] + ' sampai ' + L.labelsLong[L.xs.length - 1] + '. Terakhir: ' + parts.join('; ') + '.';
    },
    table: function (ctx) {
      var L = ctx.L;
      return {
        columns: ['Periode'].concat(L.series.map(function (s) { return s.label; })),
        rows: L.xs.map(function (x, i) {
          return [L.labelsLong[i]].concat(L.series.map(function (s) {
            return s.vals[i] == null ? null : formatter(s.format || (s.axis === 'right' ? (ctx.cfg.rightFormat || 'pct0') : ctx.cfg.format))(s.vals[i]);
          }));
        })
      };
    },
    nav: {
      count: function (ctx) { return ctx.L ? ctx.L.xs.length : 0; },
      focus: function (ctx, i) { return lineFocus(ctx, i); },
      blur: function (ctx) { lineBlur(ctx); },
      activate: function (ctx, i, e) { ctx.click({ key: String(ctx.L.xs[i]), index: i, x: ctx.L.xs[i] }, e); }
    }
  });
  function lineIndex(ctx, px) {
    var L = ctx.L, n = L.xs.length;
    if (ctx.xb) return bandIndex(ctx.xb, px, n);
    var best = -1, bd = Infinity;
    for (var i = 0; i < n; i++) { var d = Math.abs(ctx.px(i) - px); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function lineFocus(ctx, i) {
    var L = ctx.L, cfg = ctx.cfg;
    var cx = ctx.px(i);
    ctx.g.select('.mc-l-cross line').attr('x1', crisp(cx)).attr('x2', crisp(cx)).style('opacity', 1);
    var pts = L.series.filter(function (s) { return s.type !== 'bar' && s.vals[i] != null; });
    var hd = ctx.layer('hdots').selectAll('circle').data(pts, function (s) { return s.key; });
    hd.exit().remove();
    hd.enter().append('circle').attr('r', 3).attr('stroke-width', 1.5).merge(hd)
      .attr('fill', ctx.c('canvas')).attr('stroke', function (s) { return s.color; })
      .attr('cx', cx).attr('cy', function (s) { return (s.axis === 'right' && ctx.yR ? ctx.yR : ctx.yL)(s.vals[i]); });
    if (ctx.xb) {
      ctx.root.querySelectorAll('.mc-l-bars rect').forEach(function (n) { n.classList.toggle('mc-is-dim', n.getAttribute('data-c') !== String(L.xs[i])); });
    }
    var rows = L.series.map(function (s) {
      var v = s.vals[i];
      return { glyph: s.glyph, color: s.color, shape: s.type === 'bar' ? 'square' : (s.dash ? 'dash' : 'circle'), label: s.label, value: v == null ? '—' : formatter(s.format || (s.axis === 'right' ? (cfg.rightFormat || 'pct0') : cfg.format))(v) };
    });
    var t = cfg.target;
    var tv = t == null ? null : Array.isArray(t) ? t[i] : t;
    if (tv != null) rows.push({ label: cfg.targetName || 'Target', value: formatter(cfg.format)(tv), gold: true });
    ctx.hover({ key: String(L.xs[i]), index: i, x: L.xs[i] });
    var topY = minOf(pts, function (s) { return (s.axis === 'right' && ctx.yR ? ctx.yR : ctx.yL)(s.vals[i]); });
    if (!pts.length) topY = ctx.ph / 2;
    return { x: ctx.m.l + cx, y: ctx.m.t + topY, content: { eyebrow: L.labelsLong[i], rows: rows, foot: cfg.footFor ? cfg.footFor(i) : null } };
  }
  function lineBlur(ctx) {
    ctx.g.select('.mc-l-cross line').style('opacity', 0);
    ctx.layer('hdots').selectAll('circle').remove();
    applyDim(ctx, ctx.hl);
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 19. shareBars(el, rows, cfg)  (§C.3 mix bar / status split, §C.5.3)
   * rows: [{key, label, sub?, segments: [{key, label, value, color?}],
   *         valueText?, flag?}]   or a single {segments} / segments[]
   * cfg: single (bool), barHeight, gap 2, rowHeight 36, format, labelWidth,
   *      valueText(row) → string, onSegmentClick(seg, row), share (show %)
   * ────────────────────────────────────────────────────────────────────── */
  function normShare(data, cfg) {
    var rows;
    if (Array.isArray(data) && data.length && data[0] && data[0].segments) rows = data;
    else if (data && data.segments) rows = [data];
    else rows = [{ key: 'all', segments: data || [] }];
    return rows.map(function (r, i) {
      var segs = (r.segments || []).map(function (s, si) {
        var k = String(s.key != null ? s.key : si);
        return { key: k, label: s.label != null ? s.label : (PRODUCTS[k] ? PRODUCTS[k].label : k), value: Math.max(0, +s.value || 0), color: s.color, glyph: s.glyph || (PRODUCTS[k] ? k : null), raw: s, si: si };
      });
      var tot = sum(segs, function (s) { return s.value; });
      segs.forEach(function (s) { s.share = tot ? s.value / tot : 0; });
      return { key: keyOf(r, i), label: r.label, sub: r.sub, segs: segs, total: tot, flag: !!r.flag, valueText: r.valueText, raw: r };
    });
  }
  var shareBars = define('shareBars', {
    defaults: { gap: 2, rowHeight: 36, format: 'int' },
    autoHeight: function (ctx) {
      var rows = normShare(ctx.data, ctx.cfg);
      var single = ctx.cfg.single || rows.length === 1 && !rows[0].label;
      return single ? (ctx.cfg.barHeight || 12) : rows.length * ctx.cfg.rowHeight;
    },
    setup: function (ctx) {
      bindPointer(ctx, function (mx, my) {
        var hit = shareHit(ctx, mx, my);
        if (!hit) { shareBlur(ctx); return; }
        var f = shareFocusSeg(ctx, hit.r, hit.s);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { shareBlur(ctx); }, function (mx, my, e) {
        var hit = shareHit(ctx, mx, my);
        if (!hit) return;
        var payload = { key: hit.s.key, segment: hit.s.raw, row: hit.r.raw, rowKey: hit.r.key };
        if (typeof ctx.cfg.onSegmentClick === 'function') ctx.cfg.onSegmentClick(payload, e);
        ctx.click(payload, e);
      });
    },
    render: function (ctx) {
      var cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var rows = normShare(ctx.data, cfg);
      var single = cfg.single || (rows.length === 1 && !rows[0].label);
      ctx.rows = rows; ctx.single = single;
      var f = ctx.fmt();
      var labelW = 0, valW = 0;
      if (!single) {
        labelW = cfg.labelWidth || clamp(Math.ceil(maxOf(rows, function (r) {
          return textW(r.label || '', fontSans(12, 500)) + (r.sub ? textW('  ' + r.sub, fontMono(10)) : 0);
        })) + 16 + (rows.some(function (r) { return r.flag; }) ? 10 : 0), 56, Math.round(w * 0.4));
        var vt = rows.map(function (r) { return r.valueText != null ? r.valueText : cfg.valueText ? cfg.valueText(r.raw) : fmt.pct(r.segs.length ? r.segs[0].share : 0, 1); });
        rows.forEach(function (r, i) { r.vt = vt[i]; });
        valW = Math.ceil(maxOf(vt, function (s) { return textW(s, fontMono(11)); })) + 14;
      }
      var bh = single ? (cfg.barHeight || hh) : (cfg.barHeight || 8);
      var rowH = single ? hh : cfg.rowHeight;
      var bw = Math.max(10, w - labelW - valW);
      ctx.geo = { labelW: labelW, bw: bw, bh: bh, rowH: rowH };
      rows.forEach(function (r, ri) {
        var live = r.segs.filter(function (s) { return s.value > 0; });
        var gaps = Math.max(0, live.length - 1) * cfg.gap;
        var avail = Math.max(0, bw - gaps), x = labelW;
        r.segs.forEach(function (s) {
          s.w = s.value > 0 ? Math.max(1, avail * s.share) : 0;
          s.x = x;
          if (s.value > 0) x += s.w + cfg.gap;
          s.y = single ? (hh - bh) / 2 : ri * rowH + (rowH - bh) / 2;
          s.col = s.color ? ctx.c(s.color) : seriesColor({ key: s.key }, s.si, ctx.root);
        });
      });
      var rs = ctx.g.selectAll('g.mc-srow').data(rows, function (r) { return r.key; });
      rs.exit().remove();
      var re = rs.enter().append('g').attr('class', 'mc-srow');
      re.append('rect').attr('class', 'mc-flag');
      re.append('text').attr('class', 'mc-t-label mc-sl');
      re.append('text').attr('class', 'mc-sv mc-t-value');
      re.append('g').attr('class', 'mc-segs');
      var all = re.merge(rs);
      all.select('rect.mc-flag').attr('x', 0).attr('width', 2)
        .attr('y', function (r, i) { return i * rowH + 4; }).attr('height', function (r) { return r.flag && !single ? rowH - 8 : 0; })
        .attr('fill', ctx.c('gold'));
      var anyFlag = rows.some(function (r) { return r.flag; });
      var sl = all.select('text.mc-sl').attr('x', anyFlag ? 10 : 0)
        .attr('y', function (r, i) { return i * rowH + rowH / 2; }).attr('dy', '0.32em')
        .style('display', single ? 'none' : null);
      sl.each(function (r) {
        var t = ctx.d3.select(this);
        t.selectAll('tspan').remove();
        t.append('tspan').style('fill', ctx.c('text-1')).style('font-weight', 500).text(r.label || '');
        if (r.sub) t.append('tspan').attr('dx', 8).style('font-family', tok('font-mono')).style('font-size', '12px').style('fill', ctx.c('text-3')).text(r.sub);
      });
      all.select('text.mc-sv').attr('x', w).attr('text-anchor', 'end')
        .attr('y', function (r, i) { return i * rowH + rowH / 2; }).attr('dy', '0.32em')
        .style('display', single ? 'none' : null).text(function (r) { return r.vt || ''; });
      all.each(function (r) {
        var segs = ctx.d3.select(this).select('g.mc-segs').selectAll('rect').data(r.segs, function (s) { return s.key; });
        segs.exit().remove();
        var se = segs.enter().append('rect').attr('class', 'mc-mark').attr('x', labelW).attr('width', 0);
        var sa = se.merge(segs).attr('data-k', function (s) { return s.key; }).attr('data-c', r.key)
          .attr('y', function (s) { return s.y; }).attr('height', bh).attr('fill', function (s) { return s.col; })
          .attr('fill-opacity', function (s) { return s.raw && s.raw.alpha != null ? s.raw.alpha : 0.92; });
        ctx.tr(sa, { dur: DUR.bar }).attr('x', function (s) { return s.x; }).attr('width', function (s) { return s.w; });
      });
    },
    summary: function (ctx) {
      var rows = ctx.rows || [];
      if (!rows.length) return (ctx.cfg.label || 'Komposisi') + ': belum ada data.';
      var f = ctx.fmt();
      if (ctx.single) {
        var r = rows[0];
        return (ctx.cfg.label || 'Komposisi') + ': ' + r.segs.map(function (s) { return s.label + ' ' + fmt.pct(s.share, 0); }).join(', ') + '.';
      }
      return (ctx.cfg.label || 'Komposisi') + ', ' + rows.length + ' baris. ' + rows.slice(0, 3).map(function (r) { return r.label + ' ' + (r.vt || ''); }).join('; ') + (rows.length > 3 ? '; …' : '') + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt();
      var keys = [];
      ctx.rows.forEach(function (r) { r.segs.forEach(function (s) { if (keys.indexOf(s.label) < 0) keys.push(s.label); }); });
      return {
        columns: ['Row'].concat(keys),
        rows: ctx.rows.map(function (r) {
          return [r.label || ctx.cfg.label || 'Total'].concat(keys.map(function (k) {
            var s = r.segs.filter(function (q) { return q.label === k; })[0];
            return s ? f(s.value) + ' (' + fmt.pct(s.share, 0) + ')' : null;
          }));
        })
      };
    },
    nav: {
      count: function (ctx) { return ctx.rows ? ctx.rows.reduce(function (a, r) { return a + r.segs.filter(function (s) { return s.value > 0; }).length; }, 0) : 0; },
      focus: function (ctx, i) { var p = shareFlat(ctx)[i]; return p ? shareFocusSeg(ctx, p.r, p.s) : null; },
      blur: function (ctx) { shareBlur(ctx); },
      activate: function (ctx, i, e) {
        var p = shareFlat(ctx)[i];
        if (!p) return;
        var payload = { key: p.s.key, segment: p.s.raw, row: p.r.raw, rowKey: p.r.key };
        if (typeof ctx.cfg.onSegmentClick === 'function') ctx.cfg.onSegmentClick(payload, e);
        ctx.click(payload, e);
      }
    }
  });
  function shareFlat(ctx) {
    var out = [];
    (ctx.rows || []).forEach(function (r) { r.segs.forEach(function (s) { if (s.value > 0) out.push({ r: r, s: s }); }); });
    return out;
  }
  function shareHit(ctx, mx, my) {
    var rows = ctx.rows || [], gg = ctx.geo;
    if (!gg) return null;
    var ri = ctx.single ? 0 : Math.floor(my / gg.rowH);
    var r = rows[ri];
    if (!r) return null;
    for (var i = 0; i < r.segs.length; i++) {
      var s = r.segs[i];
      if (s.value > 0 && mx >= s.x - ctx.cfg.gap / 2 && mx <= s.x + s.w + ctx.cfg.gap / 2) return { r: r, s: s };
    }
    return null;
  }
  function shareFocusSeg(ctx, r, s) {
    var f = ctx.fmt();
    ctx.root.querySelectorAll('.mc-segs rect').forEach(function (n) {
      n.classList.toggle('mc-is-dim', !(n.getAttribute('data-k') === s.key && n.getAttribute('data-c') === r.key));
    });
    ctx.hover({ key: s.key, rowKey: r.key, segment: s.raw, row: r.raw });
    return {
      x: s.x + s.w / 2, y: s.y,
      content: { eyebrow: r.label || ctx.cfg.label || '', rows: [{ glyph: s.glyph, color: s.col, shape: s.glyph ? null : 'square', label: s.label, value: f(s.value), strong: true }, { label: 'Porsi', value: fmt.pct(s.share, 1) }] }
    };
  }
  function shareBlur(ctx) { applyDim(ctx, ctx.hl); ctx.untip(); ctx.hover(null); }

  /* ──────────────────────────────────────────────────────────────────────
   * 20. matrix(el, data, cfg)  (§C.4 block 3; SME §7.3). Semantic <table>.
   * data: { columns: [{key, label, glyph?}], rows: [{key, label, sub?,
   *         cells: {colKey: number | {value, sub?, label?}}, total?,
   *         kind?: 'rule' | 'total', static?: bool}] }
   * cfg: format ('pct'), scale ('linear' | 'quantile' | 'diverging'), domain
   *      [0, .7], mid (1), steps 6, scheme ('heat' | 'plat' | 'div' | 'cividis'),
   *      alpha .85, cellWidth 72, cellHeight 44, subFormat(cell,row,col),
   *      totalLabel, corner, onClick({row, col, value}), onHeaderClick(col),
   *      onHover({row, col} | null)
   * ────────────────────────────────────────────────────────────────────── */
  function luminance(c) {
    var p = parseColor(c);
    if (!p) return 0;
    var f = function (u) { u /= 255; return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
  }
  function cellValue(cell) { return cell == null ? null : typeof cell === 'number' ? cell : (cell.value == null || !isFinite(cell.value) ? null : +cell.value); }
  var matrix = define('matrix', {
    svg: false, d3: false, natural: true, role: 'group',
    defaults: { format: 'pct', scale: 'linear', steps: 6, scheme: 'heat', alpha: 0.85, cellWidth: 72, cellHeight: 44, tableToggle: false },
    render: function (ctx) {
      var cfg = ctx.cfg, data = ctx.data || {};
      var f = ctx.fmt();
      var cols = (data.columns || []).map(function (c) { return typeof c === 'string' ? { key: c, label: c === 'CC' ? 'KK' : c, glyph: PRODUCTS[c] && PRODUCT_ORDER.indexOf(c) >= 0 ? c : null } : Object.assign({ glyph: null }, c, { key: String(c.key) }); });
      var rows = (data.rows || []).map(function (r, i) { return Object.assign({}, r, { key: keyOf(r, i) }); });
      ctx.cols = cols; ctx.rows = rows;
      /* scale → ramp step */
      var vals = [];
      rows.forEach(function (r) {
        if (r.kind || r.static) return;
        cols.forEach(function (c) { var v = cellValue(r.cells && r.cells[c.key]); if (v != null) vals.push(v); });
      });
      var div = cfg.scale === 'diverging';
      var steps = div ? 5 : cfg.steps;
      var palette = ramp(div ? 'div' : cfg.scheme, null, div ? 5 : steps);
      var stepOf;
      if (cfg.scale === 'quantile') {
        var sorted = vals.slice().sort(function (a, b) { return a - b; });
        var breaks = [];
        for (var k = 1; k < steps; k++) breaks.push(sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(k / steps * sorted.length))] : 0);
        stepOf = function (v) { var s = 0; breaks.forEach(function (b) { if (v >= b) s++; }); return clamp(s, 0, steps - 1); };
      } else if (div) {
        var mid = cfg.mid != null ? cfg.mid : 1;
        var span = cfg.span || maxOf(vals, function (v) { return Math.abs(v - mid); }) || 1;
        stepOf = function (v) { return clamp(Math.round((v - mid) / span * 2) + 2, 0, 4); };
      } else {
        var lo = cfg.domain ? cfg.domain[0] : 0;
        var hi = cfg.domain ? cfg.domain[1] : (maxOf(vals) || 1);
        stepOf = function (v) { return clamp(Math.floor((v - lo) / ((hi - lo) || 1) * steps), 0, steps - 1); };
      }
      var onGold = tok('text-on-gold'), t1 = tok('text-1');

      var focusRC = ctx.focusRC || [0, 0];
      var hadFocus = ctx.root.contains(D.activeElement);
      ctx.root.querySelectorAll('.mc-matrix').forEach(function (n) { n.parentNode.removeChild(n); });
      var wrap = h('div', { class: 'mc-matrix' });
      var table = h('table', { role: 'grid', 'aria-readonly': 'true' });
      table.appendChild(h('caption', { class: 'mc-sr', text: ctx.cfg.label || 'Tabel warna' }));
      var thead = h('thead'), trh = h('tr');
      trh.appendChild(h('th', { scope: 'col', class: 'mc-matrix__corner', text: cfg.corner || '' }));
      cols.forEach(function (c) {
        var th = h('th', { scope: 'col', 'data-k': c.key, class: typeof cfg.onHeaderClick === 'function' ? 'is-click' : null, style: { minWidth: cfg.cellWidth + 'px' } });
        var inner = h('span', { class: 'mc-matrix__ch' });
        if (c.glyph) inner.appendChild(glyph(c.glyph, { size: 8 }));
        inner.appendChild(D.createTextNode(c.label != null ? c.label : c.key));
        th.appendChild(inner);
        if (typeof cfg.onHeaderClick === 'function') {
          th.tabIndex = 0;
          th.addEventListener('click', function (e) { cfg.onHeaderClick(c, e); });
          th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cfg.onHeaderClick(c, e); } });
        }
        trh.appendChild(th);
      });
      var hasTotal = rows.some(function (r) { return r.total != null; });
      if (hasTotal) trh.appendChild(h('th', { scope: 'col', class: 'is-total', text: cfg.totalLabel || 'Total', style: { minWidth: cfg.cellWidth + 'px' } }));
      thead.appendChild(trh);
      table.appendChild(thead);
      var tbody = h('tbody');
      var grid = []; /* [rowIdx][colIdx] → td for keyboard nav */
      rows.forEach(function (r) {
        if (r.kind === 'rule') {
          tbody.appendChild(h('tr', { class: 'is-rule', 'aria-hidden': 'true' }, h('td', { colspan: cols.length + 1 + (hasTotal ? 1 : 0) })));
          return;
        }
        var isTotal = r.kind === 'total';
        var tr = h('tr', { class: (isTotal ? 'is-total' : '') + (r.static ? ' is-static' : '') });
        var th = h('th', { scope: 'row', 'data-c': r.key }, [h('span', { class: 'mc-matrix__rl', text: r.label != null ? r.label : r.key })]);
        if (r.sub) th.appendChild(h('span', { class: 'mc-matrix__rs', text: r.sub }));
        tr.appendChild(th);
        var line = [];
        cols.forEach(function (c) {
          var cell = r.cells ? r.cells[c.key] : null;
          var v = cellValue(cell);
          var interactive = !isTotal && !r.static && v != null;
          var td = h('td', {
            'data-k': c.key, 'data-c': r.key,
            class: (interactive ? 'is-cell' : '') + (v == null ? ' is-na' : '') + (isTotal ? ' is-total' : ''),
            style: { height: cfg.cellHeight + 'px', minWidth: cfg.cellWidth + 'px' }
          });
          if (v != null && !isTotal && !r.static) {
            var bg = palette[stepOf(v)];
            td.style.background = alpha(bg, cfg.alpha);
            td.style.color = luminance(bg) > 0.42 ? onGold : t1;
          }
          td.appendChild(h('span', { class: 'v', text: v == null ? '—' : (cell && cell.label != null ? cell.label : f(v)) }));
          var sub = cell && typeof cell === 'object' && cell.sub != null ? cell.sub : (cfg.subFormat && v != null ? cfg.subFormat(cell, r, c) : null);
          if (sub != null && sub !== '') td.appendChild(h('span', { class: 's', text: String(sub) }));
          if (interactive) {
            td.tabIndex = -1;
            td.setAttribute('aria-label', (r.label || r.key) + ', ' + (c.label || c.key) + ': ' + f(v) + (sub ? ', ' + sub : ''));
            line.push(td);
            td._mc = { r: r, c: c, v: v, cell: cell, sub: sub };
          }
          tr.appendChild(td);
        });
        if (hasTotal) {
          var tv = cellValue(r.total);
          var ttd = h('td', { class: 'is-total' + (tv == null ? ' is-na' : ''), style: { height: cfg.cellHeight + 'px' } });
          ttd.appendChild(h('span', { class: 'v', text: tv == null ? '—' : (r.total && r.total.label != null ? r.total.label : f(tv)) }));
          if (r.total && r.total.sub != null) ttd.appendChild(h('span', { class: 's', text: String(r.total.sub) }));
          tr.appendChild(ttd);
        }
        if (line.length) grid.push(line);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      ctx.root.insertBefore(wrap, ctx.root.firstChild);
      ctx.grid = grid;
      ctx.table = table;
      /* roving tabindex */
      var fr = clamp(focusRC[0], 0, Math.max(0, grid.length - 1));
      var fc = grid[fr] ? clamp(focusRC[1], 0, grid[fr].length - 1) : 0;
      if (grid[fr] && grid[fr][fc]) {
        grid[fr][fc].tabIndex = 0;
        if (hadFocus) grid[fr][fc].focus({ preventScroll: true });
      }
      function locate(td) {
        for (var i = 0; i < grid.length; i++) { var j = grid[i].indexOf(td); if (j >= 0) return [i, j]; }
        return null;
      }
      function payload(td) { var m = td._mc; return { key: m.r.key + '|' + m.c.key, row: m.r.key, col: m.c.key, value: m.v, cell: m.cell, rowDatum: m.r, colDatum: m.c }; }
      function tipFor(td) {
        var m = td._mc;
        var rr = [{ label: ctx.cfg.valueLabel || 'Nilai', value: f(m.v), strong: true }];
        if (m.sub) rr.push({ label: '', value: String(m.sub), muted: true });
        return { eyebrow: (m.r.label || m.r.key) + ' · ' + (m.c.label || m.c.key), rows: rr, foot: m.cell && m.cell.foot };
      }
      table.addEventListener('click', function (e) {
        var td = e.target.closest && e.target.closest('td.is-cell');
        if (!td || !td._mc) return;
        var p = locate(td);
        if (p) ctx.focusRC = p;
        ctx.click(payload(td), e);
      });
      table.addEventListener('mouseover', function (e) {
        var td = e.target.closest && e.target.closest('td.is-cell');
        if (!td || !td._mc) return;
        var r = td.getBoundingClientRect();
        ctx.tip({ x: r.right - 6, y: r.top + 6 }, tipFor(td));
        ctx.hover(payload(td));
      });
      table.addEventListener('mouseleave', function () { ctx.untip(); ctx.hover(null); });
      table.addEventListener('focusin', function (e) {
        var td = e.target.closest && e.target.closest('td.is-cell');
        if (!td || !td._mc) return;
        var r = td.getBoundingClientRect();
        ctx.tip({ x: r.right - 6, y: r.top + 6 }, tipFor(td), true);
        ctx.hover(payload(td));
      });
      table.addEventListener('focusout', function (e) { if (!table.contains(e.relatedTarget)) { ctx.untip(); ctx.hover(null); } });
      table.addEventListener('keydown', function (e) {
        var td = e.target.closest && e.target.closest('td.is-cell');
        if (!td) return;
        var p = locate(td);
        if (!p) return;
        var r = p[0], c = p[1];
        switch (e.key) {
          case 'ArrowRight': c++; break;
          case 'ArrowLeft': c--; break;
          case 'ArrowDown': r++; break;
          case 'ArrowUp': r--; break;
          case 'Home': c = 0; break;
          case 'End': c = grid[r].length - 1; break;
          case 'Enter': case ' ': e.preventDefault(); ctx.click(payload(td), e); return;
          case 'Escape': ctx.untip(); return;
          default: return;
        }
        e.preventDefault();
        r = clamp(r, 0, grid.length - 1);
        c = clamp(c, 0, grid[r].length - 1);
        var next = grid[r][c];
        if (!next) return;
        td.tabIndex = -1;
        next.tabIndex = 0;
        ctx.focusRC = [r, c];
        next.focus();
      });
    },
    highlight: function (ctx, key) {
      var cells = ctx.root.querySelectorAll('td[data-k]');
      cells.forEach(function (td) {
        var k = td.getAttribute('data-k'), c = td.getAttribute('data-c');
        var on = true;
        if (key != null) {
          if (typeof key === 'object' && !Array.isArray(key)) on = (key.row == null || String(key.row) === c) && (key.col == null || String(key.col) === k);
          else { var ks = (Array.isArray(key) ? key : [key]).map(String); on = ks.indexOf(k) >= 0 || ks.indexOf(c) >= 0; }
        }
        td.classList.toggle('mc-is-dim', !on);
      });
    },
    summary: function (ctx) {
      var f = ctx.fmt(), best = null;
      (ctx.rows || []).forEach(function (r) {
        if (r.kind || r.static) return;
        (ctx.cols || []).forEach(function (c) { var v = cellValue(r.cells && r.cells[c.key]); if (v != null && (!best || v > best.v)) best = { r: r, c: c, v: v }; });
      });
      return (ctx.cfg.label || 'Tabel warna') + ', ' + (ctx.rows || []).filter(function (r) { return r.kind !== 'rule'; }).length + ' baris × ' + (ctx.cols || []).length + ' kolom' +
        (best ? '. Tertinggi ' + (best.r.label || best.r.key) + ' · ' + (best.c.label || best.c.key) + ' ' + f(best.v) : '') + '.';
    }
  });

  /* ──────────────────────────────────────────────────────────────────────
   * 21. table(el, {columns, rows, rowHeight, virtual, sort, onRow})  (§C.8.3)
   * Virtualised, sortable, keyboard accessible (↑ ↓ PgUp PgDn Home End,
   * Enter = onRow). aria-rowcount / aria-rowindex / aria-sort per §L.5.
   * columns: [{key, label, type: 'text'|'mono'|'int'|'num'|'rp'|'rpFull'|
   *            'pct'|'delta'|'bar'|'spark'|'glyph'|'monogram'|'serif',
   *            value(row), format(v,row), render(td,row,v), align, width,
   *            sortable, sortValue(row), defaultDir, tip(row), color, kind,
   *            invert, className}]
   * opts: rows, rowKey(row), rowHeight 32, virtual ('auto'), height,
   *       sort {key, dir}, onSort, onRow(row, i, e), onHover(row|null),
   *       selectedKey, flag(row), groupBy(row), groupLabel(key, rows),
   *       emptyText, footer, label, caption, flip
   * ────────────────────────────────────────────────────────────────────── */
  var NUMERIC_TYPES = { int: 1, num: 1, rp: 1, rpFull: 1, pct: 1, delta: 1, bar: 1, serif: 1 };
  function table(el, a, b) {
    if (!el || el.nodeType !== 1) throw new TypeError('MCD.charts.table: the target element is not valid');
    injectStyles();
    var opts = Array.isArray(a) ? Object.assign({}, b || {}, { rows: a }) : Object.assign({}, a || {}, b || {});
    var st = { list: [], start: -1, end: -1, focus: -1, dirty: true, destroyed: false, raf: 0, hoverKey: null, sort: opts.sort || null };
    var BUF = 8;
    el.textContent = '';
    /* bounded host (CSS height) → the scroller fills it; auto host → max-height */
    var hostCs = W.getComputedStyle(el);
    var hostPad = (parseFloat(hostCs.paddingTop) || 0) + (parseFloat(hostCs.paddingBottom) || 0);
    st.bounded = (el.clientHeight - hostPad) > 40;
    var wrap = h('div', { class: 'mc-table-wrap' + (st.bounded ? ' is-bounded' : '') });
    var root = h('div', { class: 'mc-table', role: 'region', tabindex: '-1' });
    var tbl = h('table');
    var cap = h('caption', { class: 'mc-sr' });
    var colgroup = h('colgroup');
    var thead = h('thead');
    var trh = h('tr', { 'aria-rowindex': '1' });
    thead.appendChild(trh);
    var tbody = h('tbody');
    append(tbl, [cap, colgroup, thead, tbody]);
    root.appendChild(tbl);
    var empty = h('div', { class: 'mc-table__empty' });
    var foot = h('div', { class: 'mc-table__foot' });
    append(wrap, [root, empty, foot]);
    el.appendChild(wrap);

    function rowKey(r, i) { return opts.rowKey ? String(opts.rowKey(r)) : String(r && (r.id != null ? r.id : r.key != null ? r.key : i)); }
    function colVal(c, r) { return c.value ? c.value(r) : r[c.key]; }
    function colType(c) { return c.type || 'text'; }
    function alignOf(c) { return c.align || (NUMERIC_TYPES[colType(c)] ? 'right' : colType(c) === 'monogram' || colType(c) === 'spark' ? 'center' : 'left'); }
    function sortKeyOf(c, r) {
      if (c.sortValue) return c.sortValue(r);
      var v = colVal(c, r);
      if (colType(c) === 'spark' && Array.isArray(v)) return v.length ? v[v.length - 1] : null;
      return v;
    }
    function compare(a2, b2) {
      var an = a2 == null || a2 === '' || (typeof a2 === 'number' && isNaN(a2));
      var bn = b2 == null || b2 === '' || (typeof b2 === 'number' && isNaN(b2));
      if (an && bn) return 0;
      if (an) return 1;
      if (bn) return -1;
      if (typeof a2 === 'number' && typeof b2 === 'number') return a2 - b2;
      return String(a2).localeCompare(String(b2), 'id', { numeric: true, sensitivity: 'base' });
    }
    function build() {
      var rows = (opts.rows || []).map(function (r, i) { return { r: r, i: i, key: rowKey(r, i) }; });
      var s = st.sort;
      var col = s ? opts.columns.filter(function (c) { return c.key === s.key; })[0] : null;
      if (col) {
        var dir = s.dir === 'asc' ? 1 : -1;
        rows.forEach(function (x) { x.sk = sortKeyOf(col, x.r); });
        rows.sort(function (p, q) {
          var pn = p.sk == null || p.sk === '' || (typeof p.sk === 'number' && isNaN(p.sk));
          var qn = q.sk == null || q.sk === '' || (typeof q.sk === 'number' && isNaN(q.sk));
          if (pn !== qn) return pn ? 1 : -1; /* nulls last in both directions */
          var c = compare(p.sk, q.sk) * dir;
          return c || p.i - q.i;
        });
      }
      var list = [];
      if (opts.groupBy) {
        var groups = [], byKey = {};
        rows.forEach(function (x) {
          var g = String(opts.groupBy(x.r));
          if (!byKey[g]) { byKey[g] = []; groups.push(g); }
          byKey[g].push(x);
        });
        groups.forEach(function (g) {
          list.push({ group: g, label: opts.groupLabel ? opts.groupLabel(g, byKey[g].map(function (x) { return x.r; })) : g });
          byKey[g].forEach(function (x) { list.push(x); });
        });
      } else list = rows;
      st.list = list;
      st.dataCount = rows.length;
    }
    function header() {
      trh.textContent = '';
      colgroup.textContent = '';
      opts.columns.forEach(function (c) {
        colgroup.appendChild(h('col', { style: c.width ? { width: typeof c.width === 'number' ? c.width + 'px' : c.width } : null }));
        var al = alignOf(c);
        var sorted = st.sort && st.sort.key === c.key;
        var th = h('th', {
          scope: 'col',
          class: al === 'right' ? 'is-right' : al === 'center' ? 'is-center' : null,
          'aria-sort': c.sortable === false ? null : (sorted ? (st.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'),
          title: c.headerTitle || null
        });
        if (c.sortable === false) th.textContent = c.label != null ? c.label : c.key;
        else {
          var btn = h('button', { type: 'button' }, [
            h('span', { text: c.label != null ? c.label : c.key }),
            h('span', { class: 'mc-table__sg', 'aria-hidden': 'true', text: sorted ? (st.sort.dir === 'asc' ? '▲' : '▼') : '▼' })
          ]);
          btn.addEventListener('click', function () { setSort(c.key); });
          th.appendChild(btn);
        }
        trh.appendChild(th);
      });
    }
    function setSort(key, dir) {
      var c = opts.columns.filter(function (q) { return q.key === key; })[0];
      if (!c) return;
      if (dir) st.sort = { key: key, dir: dir };
      else if (st.sort && st.sort.key === key) st.sort = { key: key, dir: st.sort.dir === 'asc' ? 'desc' : 'asc' };
      else st.sort = { key: key, dir: c.defaultDir || (NUMERIC_TYPES[colType(c)] ? 'desc' : 'asc') };
      if (typeof opts.onSort === 'function') opts.onSort(st.sort);
      refresh(true);
    }
    function cell(c, x, td) {
      var r = x.r, v = colVal(c, r), t = colType(c);
      var al = alignOf(c);
      td.className = (al === 'right' ? 'is-right' : al === 'center' ? 'is-center' : '') + (t === 'mono' ? ' is-mono' : '') + (t === 'serif' ? ' is-serif' : '') + (c.className ? ' ' + c.className : '');
      if (typeof c.render === 'function') { c.render(td, r, v); return; }
      if (c.format) { td.textContent = v == null ? '—' : c.format(v, r); return; }
      if (v == null || v === '') { td.textContent = '—'; return; }
      switch (t) {
        case 'int': td.textContent = fmt.int(v); break;
        case 'num': td.textContent = num(v, c.decimals || 0); break;
        case 'rp': td.textContent = fmt.rp(v); break;
        case 'rpFull': td.textContent = fmt.rp(v, { full: true }); break;
        case 'pct': td.textContent = fmt.pct(v, c.decimals == null ? 1 : c.decimals); break;
        case 'delta': {
          var d = fmt.delta(v, c.kind || 'pct', { invert: c.invert, d: c.decimals });
          td.appendChild(h('span', { class: d.cls, text: d.text }));
          td.classList.add('is-mono');
          break;
        }
        case 'bar': {
          var share = clamp(+v || 0, 0, 1);
          var fill = h('i', { class: 'mc-cell-bar__f', style: { width: (share * 100).toFixed(1) + '%', background: c.color ? color(typeof c.color === 'function' ? c.color(r) : c.color) : null } });
          td.appendChild(h('span', { class: 'mc-cell-bar' }, [h('span', { class: 'mc-cell-bar__t' }, fill), h('span', { class: 'mc-cell-bar__v', text: fmt.pct(v, c.decimals == null ? 1 : c.decimals) })]));
          break;
        }
        case 'spark':
          td.appendChild(miniSpark(v, c.sparkWidth || 72, 16, typeof c.color === 'function' ? c.color(r) : (c.color || 'text-2')));
          break;
        case 'glyph': {
          var code = String(v);
          td.appendChild(h('span', { class: 'mc-cell-g' }, [glyph(code, { size: 9 }), h('span', { text: c.labelOf ? c.labelOf(code, r) : (PRODUCTS[code] ? PRODUCTS[code].label : code) })]));
          break;
        }
        case 'monogram': td.appendChild(monogram(v, c.active ? c.active(r) : false)); break;
        case 'mono': td.textContent = String(v); break;
        default: td.textContent = String(v);
      }
    }
    function buildRow(x, i) {
      var nCols = opts.columns.length;
      if (x.group != null) {
        return h('tr', { class: 'mc-group', 'aria-rowindex': String(i + 2) }, h('th', { colspan: nCols, scope: 'colgroup', text: x.label }));
      }
      var cls = 'mc-row' + (opts.selectedKey != null && String(opts.selectedKey) === x.key ? ' is-selected' : '') + (opts.flag && opts.flag(x.r) ? ' is-flag' : '');
      var tr = h('tr', { class: cls, 'data-i': String(i), 'data-key': x.key, 'aria-rowindex': String(i + 2), tabindex: i === st.focus ? '0' : '-1' });
      if (opts.selectedKey != null) tr.setAttribute('aria-selected', String(opts.selectedKey) === x.key ? 'true' : 'false');
      if (st.hl != null && String(st.hl) !== x.key) tr.classList.add('mc-is-dim');
      opts.columns.forEach(function (c) {
        var td = h('td');
        cell(c, x, td);
        tr.appendChild(td);
      });
      return tr;
    }
    function spacer(px) {
      return h('tr', { class: 'mc-spacer', 'aria-hidden': 'true' }, h('td', { colspan: opts.columns.length, style: { height: px + 'px' } }));
    }
    function isVirtual() {
      var v = opts.virtual == null ? 'auto' : opts.virtual;
      return v === 'auto' ? st.list.length > 120 : !!v;
    }
    function renderRows(force) {
      var list = st.list, n = list.length, rh = opts.rowHeight || 32;
      var virtual = isVirtual();
      var start = 0, end = n;
      if (virtual) {
        var headH = thead.offsetHeight || 32;
        var top = Math.max(0, root.scrollTop - headH);
        var vh = root.clientHeight || opts.height || 480;
        start = Math.max(0, Math.floor(top / rh) - BUF);
        end = Math.min(n, Math.ceil((top + vh) / rh) + BUF);
      }
      if (!force && !st.dirty && start === st.start && end === st.end) return;
      var hadFocus = root.contains(D.activeElement) && D.activeElement.tagName === 'TR';
      st.start = start; st.end = end; st.dirty = false;
      if (st.focus < 0 || st.focus >= n || (list[st.focus] && list[st.focus].group != null)) st.focus = firstData();
      tbody.textContent = '';
      if (virtual && start > 0) tbody.appendChild(spacer(start * rh));
      var frag = D.createDocumentFragment();
      for (var i = start; i < end; i++) frag.appendChild(buildRow(list[i], i));
      tbody.appendChild(frag);
      if (virtual && end < n) tbody.appendChild(spacer((n - end) * rh));
      if (hadFocus) focusRowEl(st.focus, false);
    }
    function firstData() {
      for (var i = 0; i < st.list.length; i++) if (st.list[i].group == null) return i;
      return -1;
    }
    function focusRowEl(i, scroll) {
      var tr = tbody.querySelector('tr[data-i="' + i + '"]');
      if (!tr) return;
      tbody.querySelectorAll('tr.mc-row[tabindex="0"]').forEach(function (n) { if (n !== tr) n.tabIndex = -1; });
      tr.tabIndex = 0;
      tr.focus({ preventScroll: true });
      if (scroll !== false && !isVirtual() && tr.scrollIntoView) tr.scrollIntoView({ block: 'nearest' });
    }
    function moveFocus(i, dirn) {
      var n = st.list.length;
      if (!n) return;
      i = clamp(i, 0, n - 1);
      while (st.list[i] && st.list[i].group != null) { i += dirn || 1; if (i < 0 || i >= n) { i = clamp(i, 0, n - 1); dirn = -(dirn || 1); } }
      st.focus = i;
      if (isVirtual()) {
        var rh = opts.rowHeight || 32, headH = thead.offsetHeight || 32;
        var top = i * rh;
        if (top < root.scrollTop) root.scrollTop = top;
        else if (top + rh + headH > root.scrollTop + root.clientHeight) root.scrollTop = top + rh + headH - root.clientHeight;
        renderRows(true);
      }
      focusRowEl(i);
    }
    function pageSize() { return Math.max(1, Math.floor((root.clientHeight || 320) / (opts.rowHeight || 32)) - 1); }

    function refresh(keepScroll) {
      var flipFrom = null;
      if (opts.flip && !isVirtual() && !reducedMotion()) {
        flipFrom = {};
        tbody.querySelectorAll('tr.mc-row').forEach(function (tr) { flipFrom[tr.getAttribute('data-key')] = tr.getBoundingClientRect().top; });
      }
      build();
      header();
      root.style.setProperty('--mc-row-h', (opts.rowHeight || 32) + 'px');
      if (opts.height) root.style.height = typeof opts.height === 'number' ? opts.height + 'px' : opts.height;
      else if (!st.bounded && isVirtual()) root.style.maxHeight = (opts.maxHeight || 480) + 'px';
      else if (!st.bounded && opts.maxHeight) root.style.maxHeight = opts.maxHeight + 'px';
      root.setAttribute('aria-label', opts.label || 'Tabel');
      root.classList.toggle('is-clickable', typeof opts.onRow === 'function');
      tbl.setAttribute('aria-rowcount', String(st.list.length + 1));
      cap.textContent = opts.caption || opts.label || 'Tabel';
      if (!keepScroll) root.scrollTop = 0;
      st.dirty = true;
      renderRows(true);
      var isEmpty = !st.dataCount;
      empty.hidden = !isEmpty;
      empty.textContent = isEmpty ? (opts.emptyText || 'Tidak ada data yang cocok dengan filter ini. Hapus salah satu filter.') : '';
      foot.hidden = !opts.footer;
      foot.textContent = opts.footer || '';
      if (flipFrom) {
        tbody.querySelectorAll('tr.mc-row').forEach(function (tr) {
          var before = flipFrom[tr.getAttribute('data-key')];
          if (before == null || !tr.animate) return;
          var dy = before - tr.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          tr.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'translateY(0)' }], { duration: DUR.flip, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
        });
      }
    }

    /* events */
    function rowOf(e) { var tr = e.target.closest && e.target.closest('tr.mc-row'); return tr && tbody.contains(tr) ? tr : null; }
    function entry(tr) { return st.list[+tr.getAttribute('data-i')]; }
    tbody.addEventListener('click', function (e) {
      var tr = rowOf(e);
      if (!tr) return;
      st.focus = +tr.getAttribute('data-i');
      tbody.querySelectorAll('tr.mc-row[tabindex="0"]').forEach(function (n) { if (n !== tr) n.tabIndex = -1; });
      tr.tabIndex = 0;
      var x = entry(tr);
      if (x && typeof opts.onRow === 'function') opts.onRow(x.r, x.i, e);
    });
    tbody.addEventListener('mouseover', function (e) {
      var tr = rowOf(e);
      var td = e.target.closest && e.target.closest('td');
      if (tr && td) {
        var ci = Array.prototype.indexOf.call(tr.children, td);
        var c = opts.columns[ci];
        var x = entry(tr);
        if (c && typeof c.tip === 'function' && x) {
          var t = c.tip(x.r);
          if (t) {
            var rr = td.getBoundingClientRect();
            Tip.show({ x: rr.left + 8, y: rr.bottom - 4 }, typeof t === 'string' ? { body: t } : t, root);
          } else Tip.hide(root);
        } else Tip.hide(root);
      }
      var k = tr ? tr.getAttribute('data-key') : null;
      if (k === st.hoverKey) return;
      st.hoverKey = k;
      if (typeof opts.onHover === 'function') opts.onHover(tr ? entry(tr).r : null);
    });
    tbody.addEventListener('mouseleave', function () {
      Tip.hide(root);
      if (st.hoverKey == null) return;
      st.hoverKey = null;
      if (typeof opts.onHover === 'function') opts.onHover(null);
    });
    tbody.addEventListener('keydown', function (e) {
      var tr = rowOf(e);
      if (!tr || e.target !== tr) return;
      var i = +tr.getAttribute('data-i');
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); moveFocus(i + 1, 1); break;
        case 'ArrowUp': e.preventDefault(); moveFocus(i - 1, -1); break;
        case 'PageDown': e.preventDefault(); moveFocus(i + pageSize(), 1); break;
        case 'PageUp': e.preventDefault(); moveFocus(i - pageSize(), -1); break;
        case 'Home': e.preventDefault(); moveFocus(0, 1); break;
        case 'End': e.preventDefault(); moveFocus(st.list.length - 1, -1); break;
        case 'Enter': case ' ': {
          e.preventDefault();
          var x = entry(tr);
          if (x && typeof opts.onRow === 'function') opts.onRow(x.r, x.i, e);
          break;
        }
        default:
      }
    });
    tbody.addEventListener('focusin', function (e) {
      var tr = rowOf(e);
      if (!tr || typeof opts.onHover !== 'function' || !opts.hoverOnFocus) return;
      opts.onHover(entry(tr).r);
    });
    root.addEventListener('scroll', function () {
      if (!isVirtual() || st.raf) return;
      st.raf = W.requestAnimationFrame(function () { st.raf = 0; if (!st.destroyed) renderRows(false); });
    }, { passive: true });

    refresh(false);

    var handle = {
      el: root,
      kind: 'table',
      update: function (x, y) {
        if (st.destroyed) return handle;
        if (Array.isArray(x)) { opts.rows = x; if (y) Object.assign(opts, y); }
        else if (x) Object.assign(opts, x, y || {});
        if (x && x.sort) st.sort = x.sort;
        refresh(true);
        return handle;
      },
      setSort: function (key, dir) { setSort(key, dir); return handle; },
      getSort: function () { return st.sort ? Object.assign({}, st.sort) : null; },
      select: function (key) { opts.selectedKey = key; st.dirty = true; renderRows(true); return handle; },
      highlight: function (key) {
        st.hl = key == null ? null : key;
        tbody.querySelectorAll('tr.mc-row').forEach(function (tr) { tr.classList.toggle('mc-is-dim', st.hl != null && tr.getAttribute('data-key') !== String(st.hl)); });
        return handle;
      },
      scrollToKey: function (key) {
        var i = st.list.findIndex(function (x) { return x.key === String(key); });
        if (i < 0) return handle;
        var rh = opts.rowHeight || 32;
        root.scrollTop = Math.max(0, i * rh - root.clientHeight / 3);
        renderRows(true);
        return handle;
      },
      focusRow: function (i) { moveFocus(i == null ? Math.max(0, st.focus) : i, 1); return handle; },
      rows: function () { return st.list.filter(function (x) { return x.group == null; }).map(function (x) { return x.r; }); },
      showTable: function () { return handle; },
      resize: function () { renderRows(true); return handle; },
      destroy: function () {
        st.destroyed = true;
        if (st.raf) W.cancelAnimationFrame(st.raf);
        Tip.hide(root);
        el.textContent = '';
      }
    };
    if ('ResizeObserver' in W && st.bounded) {
      var tro = new W.ResizeObserver(function () { if (!st.destroyed && isVirtual()) renderRows(false); });
      tro.observe(root);
      var d0 = handle.destroy;
      handle.destroy = function () { tro.disconnect(); d0(); };
    }
    return handle;
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 22. scatterCanvas(el, data, cfg)  (§C.4 block 6; canvas > 1.500 marks)
   * data: { points: Float32Array|number[] stride 4 [x, y, codeIdx, id] } or
   *       [{x, y, code, id, ...}]
   * cfg: xDomain [0,240], yDomain [0,240], xClampLabel '240+', xLabel,
   *      yLabel, xName, yName, xFormat, yFormat, codes (codeIdx → product),
   *      diagonal {label, above: {label, color: 'neg', alpha: .06}},
   *      radius, alpha .55, ringAbove (bool), tooltip(point) → content,
   *      onClick(point), onHover(point|null)
   * ────────────────────────────────────────────────────────────────────── */
  var scatterCanvas = define('scatterCanvas', {
    height: 300,
    defaults: { radius: 1.6, alpha: 0.55, ringAbove: true, codes: PRODUCT_ORDER, tableToggle: true },
    setup: function (ctx) {
      ctx.canvas = h('canvas', { class: 'mc-canvas', 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0' } });
      ctx.root.insertBefore(ctx.canvas, ctx.svgNode);
      ['grid', 'yaxis', 'xaxis', 'labels', 'hover'].forEach(function (n) { ctx.layer(n); });
      bindPointer(ctx, function (mx, my) {
        var i = scatterFind(ctx, mx, my);
        if (i < 0) { scatterBlur(ctx); return; }
        var f = scatterFocus(ctx, i);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { scatterBlur(ctx); }, function (mx, my, e) {
        var i = scatterFind(ctx, mx, my);
        if (i >= 0) ctx.click(scatterPoint(ctx, i), e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var P = { x: [], y: [], c: [], id: [], obj: null };
      var data = ctx.data || {};
      if (Array.isArray(data)) {
        P.obj = data;
        data.forEach(function (p) { P.x.push(+p.x); P.y.push(+p.y); P.c.push(p.code != null ? p.code : null); P.id.push(p.id != null ? p.id : null); });
      } else if (data.points) {
        var a = data.points;
        for (var k = 0; k + 3 < a.length; k += 4) { P.x.push(a[k]); P.y.push(a[k + 1]); P.c.push(cfg.codes[a[k + 2]] || null); P.id.push(a[k + 3]); }
      }
      var n = P.x.length;
      ctx.P = P;
      var xd = cfg.xDomain || [0, maxOf(P.x) || 1];
      var yd = cfg.yDomain || [0, maxOf(P.y) || 1];
      var xF = cfg.xFormat || function (v) { return num(v, 0); };
      var yF = cfg.yFormat || function (v) { return num(v, 0); };
      var y = d3.scaleLinear().domain(yd);
      if (!cfg.yDomain) { y.nice(4); yd = y.domain(); }
      var ticks = niceTicks(y);
      var m = { l: Math.max(24, axisWidth(ticks.map(yF)) + 12), t: cfg.yLabel ? 22 : 10, r: 10, b: cfg.xLabel ? 38 : 24 };
      var pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, hh - m.t - m.b);
      y.range([ph, 0]);
      var x = d3.scaleLinear().domain(xd).range([0, pw]);
      ctx.x = x; ctx.y = y; ctx.m = m; ctx.pw = pw; ctx.ph = ph;
      var g = ctx.g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      drawYAxis(ctx, g, y, ticks, yF, pw);
      var xt = x.ticks(Math.max(2, Math.min(8, Math.floor(pw / 70))));
      var xTicks = xt.map(function (v) { return { v: v, t: xF(v) }; });
      if (cfg.xClampLabel && xTicks.length) xTicks[xTicks.length - 1].t = xt[xt.length - 1] >= xd[1] ? cfg.xClampLabel : xTicks[xTicks.length - 1].t;
      var xa = ctx.layer('xaxis').attr('class', 'mc-l-xaxis mc-ax').selectAll('text.mc-xt').data(xTicks, function (d) { return d.v; });
      xa.exit().remove();
      xa.enter().append('text').attr('class', 'mc-xt').merge(xa).attr('x', function (d) { return x(d.v); }).attr('y', ph + 16)
        .attr('text-anchor', function (d, i) { return i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'; }).text(function (d) { return d.t; });
      var lab = ctx.layer('labels');
      var titles = [];
      if (cfg.xLabel) titles.push({ k: 'x', t: cfg.xLabel, x: pw, y: ph + 32, a: 'end' });
      if (cfg.yLabel) titles.push({ k: 'y', t: cfg.yLabel, x: -m.l + 2, y: -10, a: 'start' });
      var dg = cfg.diagonal;
      var lo = Math.max(xd[0], yd[0]), hi = Math.min(xd[1], yd[1]);
      if (dg && dg.label) {
        var ang = Math.atan2(y(hi) - y(lo), x(hi) - x(lo)) * 180 / Math.PI;
        titles.push({ k: 'd', t: dg.label, x: x(lo + (hi - lo) * 0.3), y: y(lo + (hi - lo) * 0.3) - 6, a: 'middle', rot: ang });
      }
      if (dg && dg.above && dg.above.label) titles.push({ k: 'a', t: dg.above.label, x: x(lo) + 8, y: y(hi) + 14, a: 'start', cls: 'mc-t-neg' });
      var tt = lab.selectAll('text').data(titles, function (d) { return d.k; });
      tt.exit().remove();
      tt.enter().append('text').merge(tt)
        .attr('class', function (d) { return (d.cls || '') + (d.k === 'd' || d.k === 'a' ? ' mc-halo' : ''); })
        .attr('text-anchor', function (d) { return d.a; })
        .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')' + (d.rot ? ' rotate(' + d.rot + ')' : ''); })
        .style('fill', function (d) { return d.k === 'd' ? ctx.c('text-2') : null; })
        .text(function (d) { return d.t; });
      /* screen coordinates (clamped to the domain; '240+' convention) */
      var sx = new Float32Array(n), sy = new Float32Array(n), above = new Uint8Array(n);
      for (var i = 0; i < n; i++) {
        var vx = clamp(P.x[i], xd[0], xd[1]), vy = clamp(P.y[i], yd[0], yd[1]);
        sx[i] = x(vx); sy[i] = y(vy);
        above[i] = dg && P.y[i] > P.x[i] ? 1 : 0;
      }
      P.sx = sx; P.sy = sy; P.above = above;
      ctx.delaunay = n ? d3.Delaunay.from(Array.prototype.map.call(sx, function (_, j) { return j; }), function (j) { return sx[j]; }, function (j) { return sy[j]; }) : null;
      scatterDraw(ctx);
      if (ctx.animate && ctx.first) {
        ctx.canvas.style.opacity = '0';
        tween(DUR.bar * 1.4, EASE.enter, function (p) { ctx.canvas.style.opacity = String(p); });
      } else ctx.canvas.style.opacity = '1';
    },
    highlight: function (ctx, key) { scatterDraw(ctx); },
    summary: function (ctx) {
      var P = ctx.P;
      if (!P || !P.x.length) return (ctx.cfg.label || 'Sebaran') + ': belum ada data.';
      var ab = 0;
      for (var i = 0; i < P.x.length; i++) if (P.above[i]) ab++;
      var dg = ctx.cfg.diagonal;
      return (ctx.cfg.label || 'Sebaran') + ', ' + fmt.int(P.x.length) + ' titik' + (dg ? '. ' + fmt.int(ab) + ' ' + ((dg.above && dg.above.label) || 'di atas garis diagonal').toLowerCase() : '') + '.';
    },
    table: function (ctx) {
      var P = ctx.P, xF = ctx.cfg.xFormat || function (v) { return num(v, 0); }, yF = ctx.cfg.yFormat || function (v) { return num(v, 0); };
      var counts = {};
      for (var i = 0; i < P.x.length; i++) {
        var c = P.c[i] || 'OTH';
        counts[c] = counts[c] || { n: 0, ab: 0 };
        counts[c].n++;
        if (P.above[i]) counts[c].ab++;
      }
      return {
        columns: ['Produk', 'Titik', (ctx.cfg.diagonal && ctx.cfg.diagonal.above && ctx.cfg.diagonal.above.label) || 'Di atas garis diagonal'],
        rows: Object.keys(counts).map(function (k) { return [PRODUCTS[k] ? PRODUCTS[k].label : k, fmt.int(counts[k].n), fmt.int(counts[k].ab)]; })
      };
    },
    nav: {
      big: 25,
      count: function (ctx) { return ctx.P ? ctx.P.x.length : 0; },
      focus: function (ctx, i) { var o = scatterOrder(ctx); return scatterFocus(ctx, o[i]); },
      blur: function (ctx) { scatterBlur(ctx); },
      activate: function (ctx, i, e) { var o = scatterOrder(ctx); ctx.click(scatterPoint(ctx, o[i]), e); },
      hint: 'Gunakan tombol panah kiri dan kanan untuk berpindah titik. Shift untuk melompat, Enter untuk memilih.'
    }
  });
  function scatterOrder(ctx) {
    if (ctx._ord && ctx._ord.n === ctx.P.x.length && ctx._ord.src === ctx.P) return ctx._ord.a;
    var a = ctx.P.x.map(function (_, i) { return i; }).sort(function (p, q) { return ctx.P.x[p] - ctx.P.x[q] || ctx.P.y[p] - ctx.P.y[q]; });
    ctx._ord = { n: a.length, a: a, src: ctx.P };
    return a;
  }
  function scatterDraw(ctx) {
    var P = ctx.P, cfg = ctx.cfg;
    if (!P) return;
    var dpr = Math.min(2, W.devicePixelRatio || 1);
    var cv = ctx.canvas, w = ctx.w, hh = ctx.h, m = ctx.m;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(hh * dpr);
    cv.style.width = w + 'px';
    cv.style.height = hh + 'px';
    var c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, hh);
    c.save();
    c.translate(m.l, m.t);
    var x = ctx.x, y = ctx.y;
    var xd = x.domain(), yd = y.domain();
    var dg = cfg.diagonal;
    if (dg) {
      var lo = Math.max(xd[0], yd[0]), hi = Math.min(xd[1], yd[1]);
      if (dg.above) {
        c.fillStyle = alpha(ctx.c(dg.above.color || 'neg'), dg.above.alpha != null ? dg.above.alpha : 0.06);
        c.beginPath();
        c.moveTo(x(lo), y(lo));
        c.lineTo(x(hi), y(hi));
        c.lineTo(x(hi), y(yd[1]));
        c.lineTo(x(xd[0]), y(yd[1]));
        c.lineTo(x(xd[0]), y(lo));
        c.closePath();
        c.fill();
      }
      c.strokeStyle = ctx.c('text-3');
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x(lo), y(lo));
      c.lineTo(x(hi), y(hi));
      c.stroke();
    }
    var r = cfg.radius, a = cfg.alpha, hl = ctx.hl;
    var groups = {};
    for (var i = 0; i < P.x.length; i++) {
      var code = P.c[i] || 'OTH';
      (groups[code] || (groups[code] = [])).push(i);
    }
    var neg = ctx.c('neg');
    Object.keys(groups).forEach(function (code) {
      var idx = groups[code];
      var dim = hl != null && (Array.isArray(hl) ? hl.indexOf(code) < 0 : String(hl) !== code);
      c.fillStyle = alpha(color(code, ctx.root), dim ? a * 0.3 : a);
      c.beginPath();
      idx.forEach(function (j) { c.moveTo(P.sx[j] + r, P.sy[j]); c.arc(P.sx[j], P.sy[j], r, 0, Math.PI * 2); });
      c.fill();
      if (cfg.ringAbove && dg) {
        c.strokeStyle = alpha(neg, dim ? 0.3 : 0.9);
        c.lineWidth = 1;
        c.beginPath();
        idx.forEach(function (j) { if (P.above[j]) { c.moveTo(P.sx[j] + r + 1, P.sy[j]); c.arc(P.sx[j], P.sy[j], r + 1, 0, Math.PI * 2); } });
        c.stroke();
      }
    });
    c.restore();
  }
  function scatterFind(ctx, mx, my) {
    if (!ctx.delaunay) return -1;
    var px = mx - ctx.m.l, py = my - ctx.m.t;
    var i = ctx.delaunay.find(px, py);
    if (i < 0) return -1;
    var dx = ctx.P.sx[i] - px, dy = ctx.P.sy[i] - py;
    return dx * dx + dy * dy <= 14 * 14 ? i : -1;
  }
  function scatterPoint(ctx, i) {
    var P = ctx.P;
    var base = P.obj ? P.obj[i] : { x: P.x[i], y: P.y[i], code: P.c[i], id: P.id[i] };
    return Object.assign({ index: i, key: String(P.id[i] != null ? P.id[i] : i), above: !!P.above[i] }, base);
  }
  function scatterFocus(ctx, i) {
    var P = ctx.P, cfg = ctx.cfg;
    var sx = P.sx[i], sy = P.sy[i];
    var hv = ctx.layer('hover').selectAll('circle').data([0]);
    hv.enter().append('circle').attr('fill', 'none').attr('stroke-width', 1.25).merge(hv)
      .attr('stroke', ctx.c('signal')).attr('r', cfg.radius + 4).attr('cx', sx).attr('cy', sy).style('opacity', 1);
    var pt = scatterPoint(ctx, i);
    ctx.hover(pt);
    var content = cfg.tooltip ? cfg.tooltip(pt) : {
      eyebrow: PRODUCTS[pt.code] ? PRODUCTS[pt.code].label : (pt.code || 'Titik'),
      rows: [
        { label: cfg.xName || 'X', value: (cfg.xFormat || function (v) { return num(v, 0); })(P.x[i]) },
        { label: cfg.yName || 'Y', value: (cfg.yFormat || function (v) { return num(v, 0); })(P.y[i]) }
      ].concat(P.above[i] && cfg.diagonal && cfg.diagonal.above ? [{ label: cfg.diagonal.above.label || 'Di atas garis diagonal', value: '▲', cls: 'mc-neg' }] : [])
    };
    return { x: ctx.m.l + sx, y: ctx.m.t + sy, content: content };
  }
  function scatterBlur(ctx) {
    ctx.layer('hover').selectAll('circle').style('opacity', 0);
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 23. bulletChart(el, data, cfg): actual vs target, zone bands, pace notch
   * data: [{key, label, actual, target?, pace?, glyph?, color?, format?}]
   *       (a single object also works)
   * cfg: format, zones [.7, 1] (fractions of target), scale 'row'|'shared',
   *      rowHeight 34, barHeight 6, color (default --metal)
   * ────────────────────────────────────────────────────────────────────── */
  var bulletChart = define('bulletChart', {
    defaults: { format: 'rp', zones: [0.7, 1], rowHeight: 34, barHeight: 6, scale: 'row' },
    autoHeight: function (ctx) { var d = ctx.data; var n = Array.isArray(d) ? d.length : (d ? 1 : 0); return Math.max(1, n) * ctx.cfg.rowHeight + 2; },
    setup: function (ctx) { rowsPointer(ctx); },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w;
      var src = Array.isArray(ctx.data) ? ctx.data : (ctx.data ? [ctx.data] : []);
      var rows = src.map(function (d, i) {
        var k = keyOf(d, i);
        var t = d.target != null && isFinite(d.target) && +d.target > 0 ? +d.target : null;
        var a = +d.actual || 0;
        return { key: k, label: d.label != null ? d.label : k, a: a, t: t, pace: d.pace != null ? clamp(+d.pace, 0, 1) : (cfg.pace != null ? clamp(+cfg.pace, 0, 1) : null), att: t ? a / t : null, glyph: d.glyph || (PRODUCTS[k] && PRODUCT_ORDER.indexOf(k) >= 0 ? k : null), color: d.color, f: formatter(d.format || cfg.format), raw: d };
      });
      ctx.rows = rows;
      var rowH = cfg.rowHeight;
      ctx.rowH = rowH; ctx.top = 0;
      rows.forEach(function (r) {
        r.txtA = r.f(r.a);
        r.txtT = r.t != null ? ' / ' + r.f(r.t) : '';
        r.txtP = r.att != null ? fmt.pct(r.att, 0) : '';
        r.ahead = r.att != null && r.pace != null ? r.att >= r.pace : null;
      });
      var gW = rows.some(function (r) { return r.glyph; }) ? 16 : 0;
      var labelW = cfg.labelWidth || clamp(Math.ceil(maxOf(rows, function (r) { return textW(r.label, fontSans(12)); })) + gW + 14, 48, Math.round(w * 0.32));
      var valW = Math.ceil(maxOf(rows, function (r) { return textW(r.txtA + r.txtT + (r.txtP ? '  ▲ ' + r.txtP : ''), fontMono(11)); })) + 14;
      var pw = Math.max(30, w - labelW - valW);
      var sharedMax = maxOf(rows, function (r) { return Math.max(r.a, (r.t || 0) * 1.15); }) || 1;
      rows.forEach(function (r) {
        var mx = cfg.scale === 'shared' ? sharedMax : (Math.max(r.a, (r.t || 0) * 1.15) || 1);
        r.x = d3.scaleLinear().domain([0, mx]).range([0, pw]);
      });
      var metal = ctx.c('metal');
      var zoneA = [0.035, 0.065, 0.1];
      var bh = cfg.barHeight, zh = 14;
      ctx.anchorX = function (r) { return labelW + r.x(r.a); };
      ctx.anchorY = function (r, i) { return i * rowH + rowH / 2 - zh / 2; };
      ctx.tipFor = function (r) {
        var out = [{ label: 'Realisasi', value: r.f(r.a), strong: true }];
        if (r.t != null) {
          out.push({ label: 'Target', value: r.f(r.t), gold: true });
          out.push({ label: 'Pencapaian', value: fmt.pct(r.att, 1) });
          if (r.pace != null) {
            out.push({ label: 'Laju periode', value: fmt.pct(r.pace, 0) });
            var gap = r.a - r.t * r.pace;
            out.push({ label: 'Selisih dari laju', value: (gap >= 0 ? '▲ ' : '▼ ') + r.f(Math.abs(gap)), cls: gap >= 0 ? 'mc-pos' : 'mc-warn' });
          }
        }
        return { eyebrow: r.label, rows: out };
      };
      var sel = ctx.g.selectAll('g.mc-row').data(rows, function (r) { return r.key; });
      sel.exit().remove();
      var en = sel.enter().append('g').attr('class', 'mc-row mc-mark');
      en.append('text').attr('class', 'mc-t-label');
      en.append('g').attr('class', 'mc-zones');
      en.append('rect').attr('class', 'mc-bar').attr('width', 0);
      en.append('rect').attr('class', 'mc-tgt');
      en.append('rect').attr('class', 'mc-pace');
      var tv = en.append('text').attr('class', 'mc-bv');
      tv.append('tspan').attr('class', 'a');
      tv.append('tspan').attr('class', 't');
      tv.append('tspan').attr('class', 'p');
      var all = en.merge(sel).attr('data-k', function (r) { return r.key; }).attr('transform', function (r, i) { return 'translate(0,' + i * rowH + ')'; });
      all.selectAll('path.mc-glyph').remove();
      all.each(function (r) { if (r.glyph) d3Glyph(d3.select(this), r.glyph, 5, rowH / 2, 8); });
      all.select('text.mc-t-label').attr('x', gW).attr('y', rowH / 2).attr('dy', '0.32em').text(function (r) { return r.label; });
      var zy = (rowH - zh) / 2;
      all.each(function (r) {
        var z = [];
        if (r.t != null) {
          var edges = [0].concat(cfg.zones.map(function (q) { return q * r.t; }), [r.x.domain()[1]]);
          for (var k = 0; k < edges.length - 1; k++) z.push({ x0: edges[k], x1: edges[k + 1], a: zoneA[Math.min(k, zoneA.length - 1)] });
        } else z.push({ x0: 0, x1: r.x.domain()[1], a: zoneA[0] });
        var zs = d3.select(this).select('g.mc-zones').selectAll('rect').data(z);
        zs.exit().remove();
        zs.enter().append('rect').merge(zs)
          .attr('x', function (q) { return labelW + r.x(q.x0); }).attr('width', function (q) { return Math.max(0, r.x(q.x1) - r.x(q.x0)); })
          .attr('y', zy).attr('height', zh).attr('fill', function (q) { return 'rgba(214, 224, 240, ' + q.a + ')'; });
      });
      var bar = all.select('rect.mc-bar').attr('x', labelW).attr('y', (rowH - bh) / 2).attr('height', bh)
        .attr('fill', function (r) { return r.color ? ctx.c(r.color) : (cfg.color ? ctx.c(cfg.color) : metal); });
      ctx.tr(bar, { delay: function (r, i) { return i * 40; } }).attr('width', function (r) { return Math.max(0, r.x(r.a)); });
      all.select('rect.mc-tgt').attr('fill', ctx.c('text-1'))
        .attr('x', function (r) { return r.t != null ? Math.round(labelW + r.x(r.t)) - 0.5 : -99; }).attr('width', 1)
        .attr('y', zy - 2).attr('height', function (r) { return r.t != null ? zh + 4 : 0; });
      all.select('rect.mc-pace').attr('fill', ctx.c('signal'))
        .attr('x', function (r) { return r.t != null && r.pace != null ? Math.round(labelW + r.x(r.t * r.pace)) - 0.5 : -99; }).attr('width', 1)
        .attr('y', zy + zh + 1).attr('height', function (r) { return r.t != null && r.pace != null ? 6 : 0; });
      var txt = all.select('text.mc-bv').attr('x', w).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end').style('font-size', '12px');
      txt.select('tspan.a').style('fill', ctx.c('text-1')).text(function (r) { return r.txtA; });
      txt.select('tspan.t').style('fill', ctx.c('text-3')).text(function (r) { return r.txtT; });
      txt.select('tspan.p').attr('class', function (r) { return 'p ' + (r.ahead == null ? 'mc-t-muted' : r.ahead ? 'mc-t-pos' : 'mc-t-warn'); })
        .text(function (r) { return r.txtP ? '  ' + (r.ahead == null ? '' : r.ahead ? '▲ ' : '▼ ') + r.txtP : ''; });
    },
    summary: function (ctx) {
      var rows = ctx.rows || [];
      if (!rows.length) return (ctx.cfg.label || 'Realisasi terhadap target') + ': belum ada data.';
      return (ctx.cfg.label || 'Realisasi terhadap target') + ': ' + rows.map(function (r) {
        return r.label + ' ' + r.f(r.a) + (r.t != null ? ' dari target ' + r.f(r.t) + ' (' + fmt.pct(r.att, 0) + ')' : '');
      }).join('; ') + '.';
    },
    table: function (ctx) {
      return {
        columns: ['Baris', 'Realisasi', 'Target', 'Pencapaian', 'Laju'],
        rows: ctx.rows.map(function (r) { return [r.label, r.f(r.a), r.t != null ? r.f(r.t) : null, r.att != null ? fmt.pct(r.att, 1) : null, r.pace != null ? fmt.pct(r.pace, 0) : null]; })
      };
    },
    nav: rowsNav
  });

  /* ──────────────────────────────────────────────────────────────────────
   * 24. lollipop(el, data, cfg): ranking
   * data: [{key, label, value, prev?, sub?}]
   * cfg: format, sort (true), top 3 (heads in --metal), avg {value, label},
   *      rowHeight 26, max
   * ────────────────────────────────────────────────────────────────────── */
  var lollipop = define('lollipop', {
    defaults: { format: 'int', sort: true, top: 3, rowHeight: 26 },
    autoHeight: function (ctx) { return Math.max(1, (ctx.data || []).length) * ctx.cfg.rowHeight + (ctx.cfg.avg ? 18 : 4); },
    setup: function (ctx) { rowsPointer(ctx); },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var f = ctx.fmt();
      var rows = (ctx.data || []).map(function (d, i) { var k = keyOf(d, i); return { key: k, label: d.label != null ? d.label : k, v: +d.value || 0, prev: d.prev != null && isFinite(d.prev) ? +d.prev : null, sub: d.sub, raw: d }; });
      if (cfg.sort !== false) rows.sort(function (a, b) { return b.v - a.v; });
      rows.forEach(function (r, i) { r.rank = i + 1; });
      ctx.rows = rows;
      var top = cfg.avg ? 16 : 2;
      var rowH = ctx.autoH ? cfg.rowHeight : Math.max(16, Math.min(cfg.rowHeight, (hh - top) / Math.max(1, rows.length)));
      ctx.rowH = rowH; ctx.top = top;
      var rankW = Math.ceil(textW(String(rows.length), fontMono(10))) + 12;
      var labelW = cfg.labelWidth || clamp(Math.ceil(maxOf(rows, function (r) { return textW(r.label, fontSans(12)) + (r.sub ? textW('  ' + r.sub, fontMono(10)) : 0); })) + 14, 48, Math.round(w * 0.42));
      var valW = Math.ceil(maxOf(rows, function (r) { return textW(f(r.v), fontMono(11)); })) + 14;
      var x0 = rankW + labelW;
      var pw = Math.max(24, w - x0 - valW);
      var x = d3.scaleLinear().domain([0, cfg.max || maxOf(rows, function (r) { return Math.max(r.v, r.prev || 0, cfg.avg ? cfg.avg.value : 0); }) * 1.02 || 1]).range([0, pw]);
      var metal = ctx.c('metal'), plat = ctx.c(cfg.color || 'plat-3');
      ctx.anchorX = function (r) { return x0 + x(r.v); };
      ctx.anchorY = function (r, i) { return top + i * rowH + rowH / 2 - 4; };
      ctx.tipFor = function (r) {
        var out = [{ label: 'Peringkat', value: '#' + r.rank }, { label: cfg.valueLabel || 'Nilai', value: f(r.v), strong: true }];
        if (r.prev != null) {
          var d = fmt.delta(r.prev ? (r.v - r.prev) / Math.abs(r.prev) : 0, 'pct');
          out.push({ label: cfg.prevLabel || 'Periode sebelumnya', value: f(r.prev), muted: true });
          out.push({ label: 'Perubahan', value: d.text, cls: d.cls });
        }
        return { eyebrow: r.label, rows: out };
      };
      var sel = ctx.g.selectAll('g.mc-row').data(rows, function (r) { return r.key; });
      sel.exit().remove();
      var en = sel.enter().append('g').attr('class', 'mc-row mc-mark').attr('transform', function (r, i) { return 'translate(0,' + (top + i * rowH) + ')'; });
      en.append('text').attr('class', 'mc-rank');
      var lt = en.append('text').attr('class', 'mc-t-label');
      lt.append('tspan').attr('class', 'l');
      lt.append('tspan').attr('class', 's');
      en.append('line').attr('class', 'mc-link');
      en.append('line').attr('class', 'mc-stem').attr('x1', x0).attr('x2', x0);
      en.append('circle').attr('class', 'mc-prev').attr('r', 3);
      en.append('circle').attr('class', 'mc-head').attr('r', 3.5).attr('cx', x0);
      en.append('text').attr('class', 'mc-val mc-t-value').attr('x', x0 + 10);
      var all = en.merge(sel).attr('data-k', function (r) { return r.key; });
      ctx.tr(all, { dur: DUR.flip }).attr('transform', function (r, i) { return 'translate(0,' + (top + i * rowH) + ')'; });
      var cy = rowH / 2;
      all.select('text.mc-rank').attr('x', rankW - 10).attr('y', cy).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (r) { return r.rank; });
      var lab = all.select('text.mc-t-label').attr('x', rankW).attr('y', cy).attr('dy', '0.32em');
      lab.select('tspan.l').style('fill', function (r) { return r.rank <= cfg.top ? ctx.c('text-1') : null; }).text(function (r) { return r.label; });
      lab.select('tspan.s').attr('dx', function (r) { return r.sub ? 8 : 0; }).style('font-family', tok('font-mono')).style('font-size', '12px').style('fill', ctx.c('text-3')).text(function (r) { return r.sub || ''; });
      all.select('line.mc-link').attr('y1', cy).attr('y2', cy).attr('stroke', ctx.c('text-off')).attr('stroke-dasharray', '1 2')
        .attr('x1', function (r) { return r.prev != null ? x0 + x(Math.min(r.prev, r.v)) : x0; })
        .attr('x2', function (r) { return r.prev != null ? x0 + x(Math.max(r.prev, r.v)) : x0; })
        .style('display', function (r) { return r.prev != null ? null : 'none'; });
      var stem = all.select('line.mc-stem').attr('y1', cy).attr('y2', cy).attr('stroke', function (r) { return r.rank <= cfg.top ? alpha(metal, 0.55) : ctx.c('rule-strong'); }).attr('stroke-width', 1);
      ctx.tr(stem, { delay: function (r, i) { return i * DUR.stagger; } }).attr('x1', x0).attr('x2', function (r) { return x0 + x(r.v); });
      all.select('circle.mc-prev').attr('cy', cy).attr('cx', function (r) { return r.prev != null ? x0 + x(r.prev) : -99; })
        .attr('fill', ctx.c('canvas')).attr('stroke', ctx.c('text-3')).attr('stroke-width', 1)
        .style('display', function (r) { return r.prev != null ? null : 'none'; });
      var head = all.select('circle.mc-head').attr('cy', cy).attr('fill', function (r) { return r.rank <= cfg.top ? metal : plat; });
      ctx.tr(head, { delay: function (r, i) { return i * DUR.stagger; } }).attr('cx', function (r) { return x0 + x(r.v); });
      var vt = all.select('text.mc-val').attr('y', cy).attr('dy', '0.32em').text(function (r) { return f(r.v); });
      ctx.tr(vt, { delay: function (r, i) { return i * DUR.stagger; } }).attr('x', function (r) { return x0 + x(Math.max(r.v, r.prev || 0)) + 10; });
      /* average rule */
      var av = ctx.layer('avg').selectAll('g').data(cfg.avg ? [cfg.avg] : []);
      av.exit().remove();
      var ae = av.enter().append('g');
      ae.append('line').attr('stroke-dasharray', '2 3').attr('shape-rendering', 'crispEdges');
      ae.append('text').attr('text-anchor', 'middle');
      var aa = ae.merge(av);
      aa.select('line').attr('stroke', ctx.c('text-3')).attr('x1', function (d) { return crisp(x0 + x(d.value)); }).attr('x2', function (d) { return crisp(x0 + x(d.value)); })
        .attr('y1', top - 2).attr('y2', top + rows.length * rowH);
      aa.select('text').attr('x', function (d) { return x0 + x(d.value); }).attr('y', 9).text(function (d) { return (d.label || 'Rata-rata') + ' ' + f(d.value); });
    },
    summary: function (ctx) {
      var rows = ctx.rows || [];
      if (!rows.length) return (ctx.cfg.label || 'Peringkat') + ': belum ada data.';
      var f = ctx.fmt();
      return (ctx.cfg.label || 'Peringkat') + ', ' + rows.length + ' baris. ' + rows.slice(0, 3).map(function (r) { return '#' + r.rank + ' ' + r.label + ' ' + f(r.v); }).join('; ') + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt(), hasP = ctx.rows.some(function (r) { return r.prev != null; });
      return { columns: ['#', 'Nama', 'Nilai'].concat(hasP ? ['Periode sebelumnya'] : []), rows: ctx.rows.map(function (r) { return [String(r.rank), r.label, f(r.v)].concat(hasP ? [r.prev != null ? f(r.prev) : null] : []); }), numeric: false };
    },
    nav: rowsNav
  });

  /* ──────────────────────────────────────────────────────────────────────
   * 25. slope(el, data, cfg): rank (or value) movement between two periods
   * data: [{key, label, from, to}]  (from/to = rank, or value in mode 'value')
   * cfg: mode 'rank'|'value', format, leftLabel, rightLabel, rowHeight 22
   * ────────────────────────────────────────────────────────────────────── */
  var slope = define('slope', {
    defaults: { mode: 'rank', format: 'int', leftLabel: 'Periode sebelumnya', rightLabel: 'Periode ini', rowHeight: 22 },
    autoHeight: function (ctx) { return Math.max(2, (ctx.data || []).length) * ctx.cfg.rowHeight + 30; },
    setup: function (ctx) {
      bindPointer(ctx, function (mx, my) {
        if (!ctx.rows || !ctx.rows.length) return;
        var best = -1, bd = Infinity;
        ctx.rows.forEach(function (r, i) {
          var t = clamp((mx - ctx.x0) / Math.max(1, ctx.x1 - ctx.x0), 0, 1);
          var yy = r.y0 + (r.y1 - r.y0) * t;
          var d = Math.abs(yy - my);
          if (d < bd) { bd = d; best = i; }
        });
        if (best < 0 || bd > 12) { slopeBlur(ctx); return; }
        var f = slopeFocus(ctx, best);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { slopeBlur(ctx); }, function (mx, my, e) {
        if (ctx.nav >= 0) return;
        var k = ctx._hoverRow;
        if (k != null) ctx.click({ key: ctx.rows[k].key, datum: ctx.rows[k].raw }, e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var f = ctx.fmt();
      var isRank = cfg.mode === 'rank';
      var rows = (ctx.data || []).map(function (d, i) {
        var k = keyOf(d, i);
        return { key: k, label: d.label != null ? d.label : k, from: d.from == null ? null : +d.from, to: d.to == null ? null : +d.to, raw: d };
      });
      ctx.rows = rows;
      var top = 26, bot = 6;
      var vals = [];
      rows.forEach(function (r) { if (r.from != null) vals.push(r.from); if (r.to != null) vals.push(r.to); });
      var y;
      if (isRank) {
        var maxR = Math.max(2, maxOf(vals));
        y = d3.scaleLinear().domain([1, maxR]).range([top + 6, hh - bot - 6]);
      } else {
        y = d3.scaleLinear().domain([minOf(vals), maxOf(vals)]).nice(4).range([hh - bot - 6, top + 6]);
      }
      function lt(r) { return r.from == null ? '' : (isRank ? '#' + r.from : f(r.from)); }
      function rt(r) { return r.to == null ? '' : (isRank ? '#' + r.to : f(r.to)); }
      function mv(r) {
        if (r.from == null) return { t: 'BARU', cls: 'mc-t-muted', s: 0 };
        if (r.to == null) return { t: 'out', cls: 'mc-t-muted', s: 0 };
        var d = isRank ? r.from - r.to : r.to - r.from;
        if (Math.abs(d) < 1e-9) return { t: '=', cls: 'mc-t-muted', s: 0 };
        return { t: (d > 0 ? '▲' : '▼') + (isRank ? Math.abs(d) : ''), cls: d > 0 ? 'mc-t-pos' : 'mc-t-neg', s: d > 0 ? 1 : -1 };
      }
      rows.forEach(function (r) { r.mv = mv(r); r.lt = lt(r); r.rt = rt(r); });
      var LW = Math.ceil(maxOf(rows, function (r) { return textW(r.label, fontSans(12)) + textW('  ' + r.lt, fontMono(10)); })) + 12;
      var RW = Math.ceil(maxOf(rows, function (r) { return textW(r.rt + '  ', fontMono(10)) + textW(r.label, fontSans(12)) + textW('  ' + r.mv.t, fontMono(10)); })) + 12;
      LW = Math.min(LW, Math.round(w * 0.38));
      RW = Math.min(RW, Math.round(w * 0.42));
      var x0 = LW, x1 = Math.max(x0 + 40, w - RW);
      ctx.x0 = x0; ctx.x1 = x1;
      /* value mode: dodge right/left labels so they never overlap */
      function dodge(list, key) {
        var s = list.slice().sort(function (a, b) { return a[key] - b[key]; });
        for (var it = 0; it < 30; it++) {
          var moved = false;
          for (var i = 1; i < s.length; i++) {
            var gap = s[i][key] - s[i - 1][key];
            if (gap < 13) { var d = (13 - gap) / 2; s[i - 1][key] -= d; s[i][key] += d; moved = true; }
          }
          if (!moved) break;
        }
      }
      rows.forEach(function (r) {
        r.y0 = r.from != null ? y(r.from) : (r.to != null ? y(r.to) : top);
        r.y1 = r.to != null ? y(r.to) : r.y0;
        r.ly = r.y0; r.ry = r.y1;
      });
      if (!isRank) { dodge(rows.filter(function (r) { return r.from != null; }), 'ly'); dodge(rows.filter(function (r) { return r.to != null; }), 'ry'); }
      var pos = ctx.c('pos'), neg = ctx.c('neg'), flat = ctx.c('text-off');
      /* headers */
      var hd = ctx.layer('head').selectAll('text').data([{ x: x0, t: cfg.leftLabel, a: 'end' }, { x: x1, t: cfg.rightLabel, a: 'start' }]);
      hd.enter().append('text').merge(hd).attr('x', function (d) { return d.x; }).attr('y', 10).attr('text-anchor', function (d) { return d.a; })
        .style('letter-spacing', '.12em').style('font-family', tok('font-sans')).style('font-weight', 600)
        .text(function (d) { return String(d.t).toUpperCase(); });
      var axes = ctx.layer('axes').selectAll('line').data([x0, x1]);
      axes.enter().append('line').merge(axes).attr('class', 'mc-base').attr('x1', function (d) { return crisp(d); }).attr('x2', function (d) { return crisp(d); }).attr('y1', top - 2).attr('y2', hh - bot);
      var sel = ctx.layer('rows').selectAll('g.mc-row').data(rows, function (r) { return r.key; });
      sel.exit().remove();
      var en = sel.enter().append('g').attr('class', 'mc-row mc-mark');
      en.append('line').attr('class', 'mc-sl').attr('stroke-width', 1.25).attr('stroke-linecap', 'round');
      en.append('circle').attr('class', 'd0').attr('r', 2.5);
      en.append('circle').attr('class', 'd1').attr('r', 2.5);
      var l0 = en.append('text').attr('class', 'mc-l0').attr('text-anchor', 'end');
      l0.append('tspan').attr('class', 'n mc-t-label');
      l0.append('tspan').attr('class', 'v');
      var l1 = en.append('text').attr('class', 'mc-l1');
      l1.append('tspan').attr('class', 'v');
      l1.append('tspan').attr('class', 'n mc-t-label');
      l1.append('tspan').attr('class', 'm');
      var all = en.merge(sel).attr('data-k', function (r) { return r.key; });
      function stroke(r) { return r.mv.s > 0 ? pos : r.mv.s < 0 ? neg : flat; }
      var ln = all.select('line.mc-sl').attr('stroke', stroke).attr('stroke-opacity', 0.85)
        .style('display', function (r) { return r.from != null && r.to != null ? null : 'none'; });
      ctx.tr(ln, { dur: DUR.flip }).attr('x1', x0).attr('x2', x1).attr('y1', function (r) { return r.y0; }).attr('y2', function (r) { return r.y1; });
      ctx.tr(all.select('circle.d0').attr('fill', stroke).style('display', function (r) { return r.from != null ? null : 'none'; }), { dur: DUR.flip }).attr('cx', x0).attr('cy', function (r) { return r.y0; });
      ctx.tr(all.select('circle.d1').attr('fill', stroke).style('display', function (r) { return r.to != null ? null : 'none'; }), { dur: DUR.flip }).attr('cx', x1).attr('cy', function (r) { return r.y1; });
      var t0 = all.select('text.mc-l0').attr('x', x0 - 8).attr('dy', '0.32em').style('display', function (r) { return r.from != null ? null : 'none'; });
      ctx.tr(t0, { dur: DUR.flip }).attr('y', function (r) { return r.ly; });
      t0.select('tspan.n').text(function (r) { return r.label; });
      t0.select('tspan.v').attr('dx', 8).style('fill', ctx.c('text-3')).text(function (r) { return r.lt; });
      var t1 = all.select('text.mc-l1').attr('x', x1 + 8).attr('dy', '0.32em').style('display', function (r) { return r.to != null ? null : 'none'; });
      ctx.tr(t1, { dur: DUR.flip }).attr('y', function (r) { return r.ry; });
      t1.select('tspan.v').style('fill', ctx.c('text-3')).text(function (r) { return r.rt; });
      t1.select('tspan.n').attr('dx', 8).style('fill', ctx.c('text-1')).text(function (r) { return r.label; });
      t1.select('tspan.m').attr('dx', 8).attr('class', function (r) { return 'm ' + r.mv.cls; }).text(function (r) { return r.mv.t; });
    },
    summary: function (ctx) {
      var rows = ctx.rows || [];
      if (!rows.length) return (ctx.cfg.label || 'Perubahan peringkat') + ': belum ada data.';
      var up = rows.filter(function (r) { return r.mv.s > 0; }).length, dn = rows.filter(function (r) { return r.mv.s < 0; }).length;
      return (ctx.cfg.label || 'Perubahan peringkat') + ', ' + ctx.cfg.leftLabel + ' sampai ' + ctx.cfg.rightLabel + ': ' + up + ' naik, ' + dn + ' turun, ' + (rows.length - up - dn) + ' tetap atau baru.';
    },
    table: function (ctx) {
      return { columns: ['Nama', ctx.cfg.leftLabel, ctx.cfg.rightLabel, 'Perubahan'], rows: ctx.rows.map(function (r) { return [r.label, r.lt || '—', r.rt || '—', r.mv.t]; }), numeric: false };
    },
    nav: {
      count: function (ctx) { return ctx.rows ? ctx.rows.length : 0; },
      focus: function (ctx, i) { var order = slopeOrder(ctx); return slopeFocus(ctx, order[i]); },
      blur: function (ctx) { slopeBlur(ctx); },
      activate: function (ctx, i, e) { var r = ctx.rows[slopeOrder(ctx)[i]]; ctx.click({ key: r.key, datum: r.raw }, e); }
    }
  });
  function slopeOrder(ctx) { return ctx.rows.map(function (r, i) { return i; }).sort(function (a, b) { return ctx.rows[a].y1 - ctx.rows[b].y1; }); }
  function slopeFocus(ctx, i) {
    var r = ctx.rows[i];
    ctx._hoverRow = i;
    applyDim(ctx, r.key);
    ctx.hover({ key: r.key, datum: r.raw });
    return {
      x: ctx.x1, y: r.y1,
      content: { eyebrow: r.label, rows: [{ label: ctx.cfg.leftLabel, value: r.lt || '—' }, { label: ctx.cfg.rightLabel, value: r.rt || '—', strong: true }, { label: 'Perubahan', value: r.mv.t, cls: r.mv.s > 0 ? 'mc-pos' : r.mv.s < 0 ? 'mc-neg' : 'mc-flat' }] }
    };
  }
  function slopeBlur(ctx) { ctx._hoverRow = null; applyDim(ctx, ctx.hl); ctx.untip(); ctx.hover(null); }

  /* ──────────────────────────────────────────────────────────────────────
   * 26. progressRing(el, data, cfg): one metric against its target
   * NOT a donut: a single attainment arc. Part-of-whole donuts stay banned
   * (BUILD_SPEC §0.1 #9, §M.9).
   * data: ratio | {value, total?, pace?, label?, sub?}
   * cfg: size (40; 20 in tables; 96–160 hero), thickness, color ('metal'),
   *      thresholds (true → <70 % neg, <100 % warn, ≥100 % pos | [{lt, color}]),
   *      center (auto when size ≥ 56), format 'pct0'
   * ────────────────────────────────────────────────────────────────────── */
  var DEFAULT_THRESHOLDS = [{ lt: 0.7, color: 'neg' }, { lt: 1, color: 'warn' }, { color: 'pos' }];
  var progressRing = define('progressRing', {
    defaults: { format: 'pct0', tableToggle: false },
    autoHeight: function (ctx) { return ctx.cfg.size || 40; },
    render: function (ctx) {
      var cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var d = ctx.data;
      var o = d != null && typeof d === 'object' ? d : { value: d };
      var v = o.total ? (+o.value || 0) / +o.total : (+o.value || 0);
      if (!isFinite(v)) v = 0;
      ctx.v = v; ctx.o = o;
      var s = Math.min(cfg.size || Math.min(w, hh), w, hh);
      var th = cfg.thickness || clamp(Math.round(s * 0.065), 2, 6);
      var over = v > 1;
      var R = s / 2 - th / 2 - 0.5;
      var C = 2 * Math.PI * R;
      var cx = w / 2, cy = hh / 2;
      var col;
      if (cfg.thresholds) {
        var list = cfg.thresholds === true ? DEFAULT_THRESHOLDS : cfg.thresholds;
        for (var i = 0; i < list.length; i++) { if (list[i].lt == null || v < list[i].lt) { col = ctx.c(list[i].color); break; } }
      }
      col = col || ctx.c(cfg.color || 'metal');
      var g = ctx.g.attr('transform', 'translate(' + cx + ',' + cy + ')');
      var track = g.selectAll('circle.mc-track').data([0]);
      track.enter().append('circle').attr('class', 'mc-track').attr('fill', 'none').merge(track)
        .attr('r', R).attr('stroke', ctx.c('rule-strong')).attr('stroke-width', th);
      var arc = g.selectAll('circle.mc-arc').data([0]);
      var arcE = arc.enter().append('circle').attr('class', 'mc-arc').attr('fill', 'none').attr('transform', 'rotate(-90)')
        .attr('stroke-dashoffset', C);
      arc = arcE.merge(arc).attr('r', R).attr('stroke', col).attr('stroke-width', th).attr('stroke-dasharray', C.toFixed(2) + ' ' + C.toFixed(2));
      var off = C * (1 - clamp(v, 0, 1));
      if (ctx.animate) arc.interrupt().transition().duration(DUR.ring).ease(EASE.outCubic).attr('stroke-dashoffset', off);
      else arc.interrupt().attr('stroke-dashoffset', off);
      /* second lap for > 100 %: thin inner arc in --gold-soft */
      var r2 = R - th - 1.5;
      var C2 = 2 * Math.PI * Math.max(1, r2);
      var lap = g.selectAll('circle.mc-lap').data(over && r2 > 3 ? [0] : []);
      lap.exit().remove();
      var lapAll = lap.enter().append('circle').attr('class', 'mc-lap').attr('fill', 'none').attr('transform', 'rotate(-90)').attr('stroke-dashoffset', C2)
        .merge(lap).attr('r', r2).attr('stroke', alpha(ctx.c('gold-soft'), 0.7)).attr('stroke-width', Math.max(1, th * 0.5))
        .attr('stroke-dasharray', C2.toFixed(2) + ' ' + C2.toFixed(2));
      var off2 = C2 * (1 - clamp(v - 1, 0, 1));
      if (ctx.animate) lapAll.interrupt().transition().delay(DUR.ring * 0.6).duration(DUR.ring * 0.6).ease(EASE.outCubic).attr('stroke-dashoffset', off2);
      else lapAll.interrupt().attr('stroke-dashoffset', off2);
      /* pace notch (signal) */
      var pace = o.pace != null ? clamp(+o.pace, 0, 1) : null;
      var pn = g.selectAll('line.mc-pacen').data(pace != null && s >= 32 ? [pace] : []);
      pn.exit().remove();
      pn.enter().append('line').attr('class', 'mc-pacen').merge(pn)
        .attr('stroke', ctx.c('signal')).attr('stroke-width', 1)
        .attr('x1', 0).attr('x2', 0).attr('y1', -(R + th / 2 + 2)).attr('y2', -(R - th / 2 - 2))
        .attr('transform', function (p) { return 'rotate(' + (p * 360) + ')'; });
      /* centre label */
      var showC = cfg.center != null ? cfg.center : s >= 56;
      var f = ctx.fmt();
      var ct = g.selectAll('text.mc-rv').data(showC ? [0] : []);
      ct.exit().remove();
      ct.enter().append('text').attr('class', 'mc-rv mc-t-serif').attr('text-anchor', 'middle').merge(ct)
        .attr('y', o.label ? -s * 0.02 : 0).attr('dy', '0.35em')
        .style('font-size', Math.round(s * (s >= 120 ? 0.22 : 0.25)) + 'px').style('font-weight', s >= 120 ? 300 : 400)
        .text(f(v));
      var sub = g.selectAll('text.mc-rs').data(showC && o.label ? [o.label] : []);
      sub.exit().remove();
      sub.enter().append('text').attr('class', 'mc-rs').attr('text-anchor', 'middle').merge(sub)
        .attr('y', s * 0.17).attr('dy', '0.35em').text(function (t) { return t; });
    },
    summary: function (ctx) {
      var o = ctx.o || {};
      return (ctx.cfg.label || o.label || 'Pencapaian') + ': ' + fmt.pct(ctx.v || 0, 0) + ' dari target' + (o.pace != null ? ', laju ' + fmt.pct(o.pace, 0) : '') + '.';
    }
  });
  function donutRing(el, data, cfg) {
    if (Array.isArray(data) && data.length > 1 && data[0] && typeof data[0] === 'object' && W.console) {
      console.warn('MCD.charts.donutRing: multi-segment donuts are not used (BUILD_SPEC §0.1 #9); shown as a single progress ring.');
    }
    return progressRing(el, Array.isArray(data) ? data[0] : data, cfg);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 27. funnel(el, data, cfg): staged drop-off as columns + flow bands
   * (leaderboard drawer §13.6). Distinct from stepBars; still no trapezoid.
   * data: [{key, label, n, value?}]  (value = Rp under the bar)
   * cfg: format 'int', valueFormat 'rp', side {label, n}, note
   * ────────────────────────────────────────────────────────────────────── */
  var funnel = define('funnel', {
    height: 220,
    defaults: { format: 'int', valueFormat: 'rp' },
    setup: function (ctx) {
      ['base', 'flows', 'bars', 'labels'].forEach(function (n) { ctx.layer(n); });
      bindPointer(ctx, function (mx) {
        if (!ctx.stages || !ctx.stages.length) return;
        var i = bandIndex(ctx.x, mx, ctx.stages.length);
        if (i < 0) { funnelBlur(ctx); return; }
        var f = funnelFocus(ctx, i);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { funnelBlur(ctx); }, function (mx, my, e) {
        var i = ctx.stages ? bandIndex(ctx.x, mx, ctx.stages.length) : -1;
        if (i >= 0) ctx.click({ key: ctx.stages[i].key, index: i, datum: ctx.stages[i].raw }, e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var f = ctx.fmt(), fv = formatter(cfg.valueFormat);
      var st = (ctx.data || []).map(function (d, i) { var k = keyOf(d, i); return { key: k, label: d.label != null ? d.label : k, n: +(d.n != null ? d.n : d.value) || 0, v: d.n != null && d.value != null ? +d.value : (d.rp != null ? +d.rp : null), raw: d }; });
      st.forEach(function (s, i) { s.prev = i ? st[i - 1].n : null; s.conv = i && st[i - 1].n ? s.n / st[i - 1].n : null; s.drop = i ? st[i - 1].n - s.n : null; s.last = i === st.length - 1; });
      ctx.stages = st;
      var hasV = st.some(function (s) { return s.v != null; });
      var m = { t: 22, b: hasV ? 38 : 24 };
      var ph = Math.max(10, hh - m.t - m.b);
      var x = d3.scaleBand().domain(st.map(function (s) { return s.key; })).range([0, w]).paddingInner(0.46).paddingOuter(0.02);
      var y = d3.scaleLinear().domain([0, maxOf(st, function (s) { return s.n; }) || 1]).range([ph, 0]);
      var bw = x.bandwidth();
      ctx.x = x; ctx.y = y; ctx.m = m; ctx.ph = ph;
      var g = ctx.g.attr('transform', 'translate(0,' + m.t + ')');
      var base = ctx.layer('base').selectAll('line').data([0]);
      base.enter().append('line').attr('class', 'mc-base').merge(base).attr('x1', 0).attr('x2', w).attr('y1', crisp(ph)).attr('y2', crisp(ph));
      var flows = [];
      for (var i = 0; i < st.length - 1; i++) flows.push({ a: st[i], b: st[i + 1], key: st[i].key + '>' + st[i + 1].key });
      var fl = ctx.layer('flows').selectAll('g').data(flows, function (q) { return q.key; });
      fl.exit().remove();
      var fe = fl.enter().append('g');
      fe.append('path').attr('class', 'mc-flow');
      fe.append('text').attr('class', 'mc-conv mc-t-value').attr('text-anchor', 'middle');
      fe.append('text').attr('class', 'mc-drop').attr('text-anchor', 'middle');
      var fa = fe.merge(fl);
      fa.select('path.mc-flow').attr('fill', alpha(ctx.c('text-1'), 0.045))
        .attr('d', function (q) {
          var xa = x(q.a.key) + bw, xb = x(q.b.key);
          return 'M' + xa + ',' + y(q.a.n) + 'L' + xb + ',' + y(q.b.n) + 'L' + xb + ',' + ph + 'L' + xa + ',' + ph + 'Z';
        })
        .style('opacity', ctx.animate && ctx.first ? 0 : 1);
      if (ctx.animate && ctx.first) fa.select('path.mc-flow').transition().delay(DUR.bar).duration(280).style('opacity', 1);
      fa.select('text.mc-conv')
        .attr('x', function (q) { return (x(q.a.key) + bw + x(q.b.key)) / 2; })
        .attr('y', function (q) { return Math.max(12, (y(q.b.n) + ph) / 2 - 4); })
        .text(function (q) { return q.b.conv != null ? fmt.pct(q.b.conv, 0) : ''; });
      fa.select('text.mc-drop')
        .attr('x', function (q) { return (x(q.a.key) + bw + x(q.b.key)) / 2; })
        .attr('y', function (q) { return Math.max(12, (y(q.b.n) + ph) / 2 - 4) + 14; })
        .text(function (q) { return q.b.drop ? '−' + f(q.b.drop) : ''; });
      var metal = ctx.c('metal'), neutral = ctx.c(cfg.color || 'plat-2');
      var bars = ctx.layer('bars').selectAll('rect').data(st, function (s) { return s.key; });
      bars.exit().remove();
      var be = bars.enter().append('rect').attr('class', 'mc-mark').attr('y', ph).attr('height', 0).attr('rx', 1);
      var ba = be.merge(bars).attr('data-c', function (s) { return s.key; })
        .attr('x', function (s) { return x(s.key); }).attr('width', bw)
        .attr('fill', function (s) { return s.last ? metal : neutral; }).attr('fill-opacity', function (s) { return s.last ? 1 : 0.9; });
      ctx.tr(ba, { delay: function (s, i) { return i * 60; } }).attr('y', function (s) { return y(s.n); }).attr('height', function (s) { return Math.max(0, ph - y(s.n)); });
      var lab = ctx.layer('labels');
      var vt = lab.selectAll('text.mc-fv').data(st, function (s) { return s.key; });
      vt.exit().remove();
      var vta = vt.enter().append('text').attr('class', 'mc-fv mc-t-value').attr('text-anchor', 'middle').merge(vt)
        .attr('x', function (s) { return x(s.key) + bw / 2; }).text(function (s) { return f(s.n); });
      ctx.tr(vta, { delay: function (s, i) { return i * 60; } }).attr('y', function (s) { return y(s.n) - 7; });
      var sl = lab.selectAll('text.mc-fl').data(st, function (s) { return s.key; });
      sl.exit().remove();
      sl.enter().append('text').attr('class', 'mc-fl mc-t-label').attr('text-anchor', 'middle').merge(sl)
        .attr('x', function (s) { return x(s.key) + bw / 2; }).attr('y', ph + 17).style('fill', function (s) { return s.last ? ctx.c('text-1') : null; })
        .text(function (s) { return s.label; });
      var rv = lab.selectAll('text.mc-fr').data(st.filter(function (s) { return s.v != null; }), function (s) { return s.key; });
      rv.exit().remove();
      rv.enter().append('text').attr('class', 'mc-fr').attr('text-anchor', 'middle').merge(rv)
        .attr('x', function (s) { return x(s.key) + bw / 2; }).attr('y', ph + 32).text(function (s) { return fv(s.v); });
      var side = ctx.layer('side').selectAll('text').data(cfg.side ? [cfg.side] : []);
      side.exit().remove();
      side.enter().append('text').attr('text-anchor', 'end').merge(side).attr('x', w).attr('y', -10)
        .text(function (s) { return s.label + ': ' + f(s.n); });
    },
    summary: function (ctx) {
      var st = ctx.stages || [];
      if (!st.length) return (ctx.cfg.label || 'Corong') + ': belum ada data.';
      var f = ctx.fmt();
      return (ctx.cfg.label || 'Corong') + ': ' + st.map(function (s) { return s.label + ' ' + f(s.n) + (s.conv != null ? ' (' + fmt.pct(s.conv, 0) + ')' : ''); }).join(', ') + (ctx.cfg.side ? '. ' + ctx.cfg.side.label + ' ' + f(ctx.cfg.side.n) : '') + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt(), fv = formatter(ctx.cfg.valueFormat);
      return {
        columns: ['Tahap', 'Jumlah', 'Konversi', 'Gugur', 'Nilai'],
        rows: ctx.stages.map(function (s) { return [s.label, f(s.n), s.conv != null ? fmt.pct(s.conv, 0) : null, s.drop ? f(s.drop) : null, s.v != null ? fv(s.v) : null]; })
      };
    },
    nav: {
      count: function (ctx) { return ctx.stages ? ctx.stages.length : 0; },
      focus: function (ctx, i) { return funnelFocus(ctx, i); },
      blur: function (ctx) { funnelBlur(ctx); },
      activate: function (ctx, i, e) { ctx.click({ key: ctx.stages[i].key, index: i, datum: ctx.stages[i].raw }, e); }
    }
  });
  function funnelFocus(ctx, i) {
    var s = ctx.stages[i], f = ctx.fmt();
    applyDim(ctx, s.key);
    ctx.hover({ key: s.key, index: i, datum: s.raw });
    var rows = [{ label: 'Jumlah', value: f(s.n), strong: true }];
    if (s.conv != null) rows.push({ label: 'Konversi dari tahap sebelumnya', value: fmt.pct(s.conv, 1) });
    if (s.drop) rows.push({ label: 'Gugur', value: '−' + f(s.drop), muted: true });
    if (s.v != null) rows.push({ label: 'Nilai', value: formatter(ctx.cfg.valueFormat)(s.v) });
    return { x: ctx.x(s.key) + ctx.x.bandwidth() / 2, y: ctx.m.t + ctx.y(s.n), content: { eyebrow: s.label, rows: rows } };
  }
  function funnelBlur(ctx) { applyDim(ctx, ctx.hl); ctx.untip(); ctx.hover(null); }

  /* ──────────────────────────────────────────────────────────────────────
   * 28. calendarHeatmap(el, data, cfg): daily activity (leaderboard §13.6)
   * data: [{date: 'YYYY-MM-DD', value, holiday?, note?}]
   * cfg: end (as-of date), weeks 26, days [1..6,0] (Mon–Sun; [1..6] = Mon–Sat),
   *      cell 14, gap 2, ramp 'heat'|'cividis'|'plat', classes 5, unit 'points',
   *      range [from, to] (gold outline), tipRows(d) → rows, legend true
   * ────────────────────────────────────────────────────────────────────── */
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  var calendarHeatmap = define('calendarHeatmap', {
    defaults: { weeks: 26, days: [1, 2, 3, 4, 5, 6, 0], cell: 14, gap: 2, ramp: 'cividis', classes: 5, format: 'int', unit: 'points', legend: true },
    autoHeight: function (ctx) { var c = ctx.cfg; return 22 + c.days.length * (c.cell + c.gap) + 2; },
    setup: function (ctx) {
      bindPointer(ctx, function (mx, my) {
        var i = calHit(ctx, mx, my);
        if (i < 0) { calBlur(ctx); return; }
        var f = calFocus(ctx, i);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { calBlur(ctx); }, function (mx, my, e) {
        var i = calHit(ctx, mx, my);
        if (i >= 0) ctx.click({ key: ctx.cells[i].key, date: ctx.cells[i].date, datum: ctx.cells[i].raw }, e);
      });
    },
    render: function (ctx) {
      var cfg = ctx.cfg, w = ctx.w;
      var f = ctx.fmt();
      var byDate = {};
      var lastDate = null;
      (ctx.data || []).forEach(function (d) {
        var dt = toDate(d.date);
        if (!dt) return;
        var k = ymd(dt);
        byDate[k] = d;
        if (!lastDate || dt > lastDate) lastDate = dt;
      });
      var end = toDate(cfg.end) || lastDate || new Date();
      end = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      var monday = addDays(end, -((end.getDay() + 6) % 7));
      var start = addDays(monday, -(cfg.weeks - 1) * 7);
      var days = cfg.days;
      var dayW = Math.ceil(textW('Rab', fontMono(10))) + 8;
      var cs = Math.max(6, Math.min(cfg.cell, Math.floor((w - dayW) / cfg.weeks) - cfg.gap));
      var step = cs + cfg.gap;
      var top = 22;
      ctx.geo = { dayW: dayW, cs: cs, step: step, top: top };
      var cells = [];
      for (var c = 0; c < cfg.weeks; c++) {
        for (var r = 0; r < days.length; r++) {
          var dt = addDays(start, c * 7 + ((days[r] + 6) % 7));
          if (dt > end) continue;
          var k = ymd(dt);
          var d = byDate[k] || null;
          cells.push({ key: k, date: dt, c: c, r: r, v: d && d.value != null ? +d.value : null, holiday: d && d.holiday ? d.holiday : null, note: d && d.note, raw: d, x: dayW + c * step, y: top + r * step });
        }
      }
      ctx.cells = cells;
      ctx.cellAt = {};
      cells.forEach(function (q, i) { ctx.cellAt[q.c + ':' + q.r] = i; });
      /* quantile classes over non-zero days */
      var nz = cells.filter(function (q) { return q.v > 0; }).map(function (q) { return q.v; }).sort(function (a, b) { return a - b; });
      var K = cfg.classes;
      var breaks = [];
      for (var b = 1; b < K; b++) breaks.push(nz.length ? nz[Math.min(nz.length - 1, Math.floor(b / K * nz.length))] : Infinity);
      var pal = cfg.ramp === 'cividis' ? CIVIDIS.slice(1, 1 + K) : cfg.ramp === 'plat' ? ramp('plat', null, K) : ramp('heat', null, 6).slice(6 - K);
      ctx.pal = pal;
      var empty = 'rgba(255, 255, 255, 0.05)';
      var hatch = hatchPattern(ctx, ctx.id + '-hol', ctx.c('text-off'), 'rgba(255, 255, 255, 0.03)');
      var gold = ctx.c('gold');
      var rg = cfg.range ? [toDate(cfg.range[0]), toDate(cfg.range[1])] : null;
      cells.forEach(function (q) {
        q.cls = q.v > 0 ? breaks.filter(function (bk) { return q.v >= bk; }).length : -1;
        q.fill = q.holiday ? hatch : q.cls >= 0 ? pal[clamp(q.cls, 0, pal.length - 1)] : empty;
        q.inRange = rg && rg[0] && rg[1] && q.date >= rg[0] && q.date <= rg[1];
      });
      var g = ctx.g;
      /* month labels */
      var months = [];
      var prevM = -1;
      for (var c2 = 0; c2 < cfg.weeks; c2++) {
        var md = addDays(start, c2 * 7);
        var mm = addDays(md, 6).getMonth();
        if (c2 === 0) { prevM = md.getMonth(); months.push({ c: 0, t: BULAN[md.getMonth()] }); continue; }
        if (mm !== prevM) { months.push({ c: c2, t: BULAN[mm] }); prevM = mm; }
      }
      if (months.length > 1 && months[1].c - months[0].c < 3) months.shift();
      var ml = ctx.layer('months').selectAll('text').data(months, function (m) { return m.c + m.t; });
      ml.exit().remove();
      ml.enter().append('text').merge(ml).attr('x', function (m) { return dayW + m.c * step; }).attr('y', 10).text(function (m) { return m.t; });
      var dl = ctx.layer('days').selectAll('text').data(days.map(function (d, r) { return { d: d, r: r }; }).filter(function (q) { return q.d === 1 || q.d === 3 || q.d === 5; }));
      dl.exit().remove();
      dl.enter().append('text').merge(dl).attr('x', 0).attr('y', function (q) { return top + q.r * step + cs / 2; }).attr('dy', '0.32em').text(function (q) { return HARI[q.d]; });
      var cl = ctx.layer('cells').selectAll('rect').data(cells, function (q) { return q.key; });
      cl.exit().remove();
      var ce = cl.enter().append('rect').attr('class', 'mc-mark').attr('rx', 1);
      var ca = ce.merge(cl).attr('data-c', function (q) { return q.key; })
        .attr('x', function (q) { return q.x + (q.inRange ? 0.5 : 0); }).attr('y', function (q) { return q.y + (q.inRange ? 0.5 : 0); })
        .attr('width', function (q) { return cs - (q.inRange ? 1 : 0); }).attr('height', function (q) { return cs - (q.inRange ? 1 : 0); })
        .attr('fill', function (q) { return q.fill; })
        .attr('stroke', function (q) { return q.inRange ? gold : 'none'; }).attr('stroke-width', 1);
      if (ctx.animate) {
        ca.style('opacity', 0).transition().delay(function (q) { return q.c * DUR.cellStagger; }).duration(DUR.cell).ease(EASE.standard).style('opacity', 1);
      } else ca.interrupt().style('opacity', null);
      var fr = ctx.layer('focus').selectAll('rect').data([0]);
      fr.enter().append('rect').attr('fill', 'none').attr('stroke-width', 1.25).style('opacity', 0).merge(fr).attr('stroke', ctx.c('signal')).attr('width', cs + 2).attr('height', cs + 2);
      /* legend: Fewer ▢▤▥▦■ More */
      var lg = ctx.layer('legend');
      lg.selectAll('*').remove();
      if (cfg.legend && w > 260) {
        var lx = w - (pal.length * 12 + textW('Lebih banyak', fontMono(10)) + textW('Lebih sedikit', fontMono(10)) + 16);
        lg.append('text').attr('x', lx).attr('y', 10).text('Lebih sedikit');
        var sx = lx + textW('Lebih sedikit', fontMono(10)) + 6;
        pal.forEach(function (p, i) { lg.append('rect').attr('x', sx + i * 12).attr('y', 2).attr('width', 10).attr('height', 10).attr('rx', 1).attr('fill', p); });
        lg.append('text').attr('x', sx + pal.length * 12 + 4).attr('y', 10).text('Lebih banyak');
      }
    },
    summary: function (ctx) {
      var cells = ctx.cells || [];
      var active = cells.filter(function (q) { return q.v > 0; });
      var best = active.slice().sort(function (a, b) { return b.v - a.v; })[0];
      return (ctx.cfg.label || 'Kalender aktivitas') + ', ' + ctx.cfg.weeks + ' minggu: ' + active.length + ' hari aktif' + (best ? '. Tertinggi ' + fmt.day(best.date) + ' ' + ctx.fmt()(best.v) + ' ' + ctx.cfg.unit : '') + '.';
    },
    table: function (ctx) {
      var f = ctx.fmt();
      return { columns: ['Tanggal', ctx.cfg.unit, 'Catatan'], rows: ctx.cells.filter(function (q) { return q.v != null || q.holiday; }).map(function (q) { return [fmt.day(q.date), q.v != null ? f(q.v) : null, q.holiday || q.note || null]; }), numeric: false };
    },
    nav: {
      big: 4,
      count: function (ctx) { return ctx.cells ? ctx.cells.length : 0; },
      key: function (ctx, e, i, n) {
        var cur = ctx.cells[i < 0 ? n - 1 : i];
        if (!cur) return;
        var dc = 0, dr = 0;
        if (e.key === 'ArrowLeft') dc = -1; else if (e.key === 'ArrowRight') dc = 1;
        else if (e.key === 'ArrowUp') dr = -1; else if (e.key === 'ArrowDown') dr = 1;
        else return;
        if (i < 0) return n - 1;
        var j = ctx.cellAt[(cur.c + dc) + ':' + (cur.r + dr)];
        return j == null ? i : j;
      },
      focus: function (ctx, i) { return calFocus(ctx, i); },
      blur: function (ctx) { calBlur(ctx); },
      activate: function (ctx, i, e) { var q = ctx.cells[i]; ctx.click({ key: q.key, date: q.date, datum: q.raw }, e); },
      hint: 'Gunakan tombol panah kiri dan kanan untuk mengganti minggu. Atas dan bawah untuk mengganti hari.'
    }
  });
  function calHit(ctx, mx, my) {
    var gg = ctx.geo;
    if (!gg) return -1;
    var c = Math.floor((mx - gg.dayW) / gg.step), r = Math.floor((my - gg.top) / gg.step);
    if (mx - gg.dayW - c * gg.step > gg.cs || my - gg.top - r * gg.step > gg.cs) return -1;
    var i = ctx.cellAt[c + ':' + r];
    return i == null ? -1 : i;
  }
  function calFocus(ctx, i) {
    var q = ctx.cells[i];
    if (!q) return null;
    ctx.layer('focus').select('rect').attr('x', q.x - 1).attr('y', q.y - 1).style('opacity', 1);
    ctx.hover({ key: q.key, date: q.date, datum: q.raw });
    var rows = ctx.cfg.tipRows ? ctx.cfg.tipRows(q.raw || { date: q.key, value: q.v }) : [{ label: ctx.cfg.unit, value: q.v != null ? ctx.fmt()(q.v) : '0', strong: true }];
    return { x: q.x + ctx.geo.cs / 2, y: q.y, content: { eyebrow: fmt.day(q.date), rows: rows, foot: q.holiday ? q.holiday : (q.note || null) } };
  }
  function calBlur(ctx) { ctx.layer('focus').select('rect').style('opacity', 0); ctx.untip(); ctx.hover(null); }

  /* ──────────────────────────────────────────────────────────────────────
   * 29. amortizationArea(el, data, cfg)  (property addendum §9.7)
   * data: { schedule: [{month, principal, interest, balance}], segments:
   *         [{from, to, rate, label?}], start: 'YYYY-MM' (1st instalment) }
   *   or  { loan: {amount, segments: [{months, rate, label?}]}, start }
   * cfg: mode 'monthly'|'yearly', balance (true), marker {month, label},
   *      principalColor, interestColor, fixedLabel
   * Keyboard: ← → move one month (Shift = 12), Home/End; tooltip mirrored
   * into the live region.
   * ────────────────────────────────────────────────────────────────────── */
  function amortize(loan) {
    var bal = +loan.amount || 0, out = [], segs = [], m = 0;
    var total = sum(loan.segments || [], function (s) { return +s.months || 0; });
    (loan.segments || []).forEach(function (s) {
      var i = (+s.rate || 0) / 12, rem = total - m, k = +s.months || 0;
      var pmt = i ? bal * i / (1 - Math.pow(1 + i, -rem)) : bal / Math.max(1, rem);
      segs.push({ from: m + 1, to: m + k, rate: +s.rate, label: s.label });
      for (var j = 0; j < k; j++) {
        var it = bal * i, pr = Math.min(bal, pmt - it);
        bal = Math.max(0, bal - pr);
        m += 1;
        out.push({ month: m, principal: pr, interest: it, payment: pr + it, balance: bal });
      }
    });
    return { schedule: out, segments: segs };
  }
  var amortizationArea = define('amortizationArea', {
    height: 280,
    defaults: { mode: 'monthly', balance: true, format: 'rp' },
    setup: function (ctx) {
      ['grid', 'yaxis', 'yaxis2', 'xaxis', 'ribbon', 'areas', 'bars', 'base', 'balance', 'rate', 'marker', 'cross', 'hdots'].forEach(function (n) { ctx.layer(n); });
      bindPointer(ctx, function (mx) {
        var i = amIndex(ctx, mx - ctx.m.l);
        if (i < 0) { amBlur(ctx); return; }
        ctx.nav = -1;
        var f = amFocus(ctx, i);
        ctx.tip(ctx.pt(f.x, f.y), f.content);
      }, function () { amBlur(ctx); }, function (mx, my, e) {
        var i = amIndex(ctx, mx - ctx.m.l);
        if (i >= 0) ctx.click({ key: String(ctx.pts[i].k), index: i, datum: ctx.pts[i] }, e);
      });
    },
    render: function (ctx) {
      var d3 = ctx.d3, cfg = ctx.cfg, w = ctx.w, hh = ctx.h;
      var src = ctx.data || {};
      var S = src.loan ? amortize(src.loan) : { schedule: src.schedule || [], segments: src.segments || [] };
      var sched = S.schedule.map(function (r, i) {
        var pr = +r.principal || 0, it = +r.interest || 0;
        return { month: r.month != null ? +r.month : i + 1, principal: pr, interest: it, payment: r.payment != null ? +r.payment : pr + it, balance: r.balance != null ? +r.balance : null };
      });
      var start = toDate(src.start);
      ctx.sched = sched; ctx.segs = S.segments; ctx.start = start;
      var yearly = cfg.mode === 'yearly';
      var pts;
      if (yearly) {
        var by = {};
        sched.forEach(function (r) { var y = Math.ceil(r.month / 12); var o = by[y] || (by[y] = { k: y, principal: 0, interest: 0, payment: 0, balance: null }); o.principal += r.principal; o.interest += r.interest; o.payment += r.payment; o.balance = r.balance; });
        pts = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.k - b.k; });
      } else pts = sched.map(function (r) { return Object.assign({ k: r.month }, r); });
      ctx.pts = pts;
      ctx.yearly = yearly;
      var fAx = axisFmt(formatter('rp'));
      var maxPay = maxOf(pts, function (p) { return p.payment; }) || 1;
      var yL = d3.scaleLinear().domain([0, maxPay * 1.06]).nice(4);
      var tL = niceTicks(yL);
      var showBal = cfg.balance && pts.some(function (p) { return p.balance != null; });
      var maxBal = showBal ? maxOf(sched, function (r) { return r.balance; }) : 0;
      if (showBal && sched.length && src.loan) maxBal = Math.max(maxBal, +src.loan.amount || 0);
      var yR = showBal ? d3.scaleLinear().domain([0, maxBal || 1]).nice(4) : null;
      var tR = yR ? niceTicks(yR) : [];
      var m = { l: Math.max(28, axisWidth(tL.map(fAx)) + 12), t: 44, r: yR ? axisWidth(tR.map(fAx)) + 12 : 6, b: 24 };
      var pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, hh - m.t - m.b);
      yL.range([ph, 0]);
      if (yR) yR.range([ph, 0]);
      var n = sched.length || 1;
      var x, xb = null;
      if (yearly) {
        xb = d3.scaleBand().domain(pts.map(function (p) { return String(p.k); })).range([0, pw]).paddingInner(0.3).paddingOuter(0.1);
        x = d3.scaleLinear().domain([0.5, n + 0.5]).range([0, pw]);
      } else x = d3.scaleLinear().domain([0.5, n + 0.5]).range([0, pw]);
      ctx.x = x; ctx.xb = xb; ctx.yL = yL; ctx.yR = yR; ctx.m = m; ctx.pw = pw; ctx.ph = ph;
      var g = ctx.g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      drawYAxis(ctx, g, yL, tL, fAx, pw);
      if (yR) drawYAxis(ctx, g, yR, tR, fAx, pw, { right: true });
      else ctx.layer('yaxis2').selectAll('*').remove();
      /* x ticks: Thn 1, 5, 10 … (month 12(k−1)+1) */
      var years = Math.ceil(n / 12);
      var yt = [1].concat([5, 10, 15, 20, 25, 30, 35].filter(function (k) { return k <= years; }));
      if (pw / Math.max(1, yt.length) < 44) yt = yt.filter(function (k, i) { return i % 2 === 0; });
      var xd = yt.map(function (k) { return { k: k, x: yearly ? xb(String(k)) + xb.bandwidth() / 2 : x(12 * (k - 1) + 1) }; }).filter(function (d) { return d.x != null && !isNaN(d.x); });
      var xa = ctx.layer('xaxis').attr('class', 'mc-l-xaxis mc-ax').selectAll('text').data(xd, function (d) { return d.k; });
      xa.exit().remove();
      xa.enter().append('text').merge(xa).attr('x', function (d) { return d.x; }).attr('y', ph + 16).attr('text-anchor', function (d, i) { return i === 0 ? 'start' : 'middle'; }).text(function (d) { return 'Thn ' + d.k; });
      var pc = ctx.c(cfg.principalColor || 'prop-principal'), ic = ctx.c(cfg.interestColor || 'prop-interest');
      ctx.pc = pc; ctx.ic = ic;
      /* rate ribbon 12 px above the plot */
      var segs = (S.segments || []).map(function (s, i) { return { i: i, from: +s.from, to: +s.to, rate: +s.rate, label: s.label }; });
      var rb = ctx.layer('ribbon').selectAll('g').data(segs, function (s) { return s.i; });
      rb.exit().remove();
      var rbe = rb.enter().append('g');
      rbe.append('rect');
      rbe.append('text').attr('text-anchor', 'middle');
      var rba = rbe.merge(rb);
      rba.select('rect').attr('x', function (s) { return x(s.from - 0.5) + (s.i ? 1 : 0); }).attr('width', function (s) { return Math.max(0, x(s.to + 0.5) - x(s.from - 0.5) - (s.i ? 1 : 0)); })
        .attr('y', -30).attr('height', 12).attr('rx', 1)
        .attr('fill', function (s) { return s.i === 0 ? ctx.c('gold-a16') : ctx.c('rule-strong'); });
      rba.select('text').attr('x', function (s) { return (x(s.from - 0.5) + x(s.to + 0.5)) / 2; }).attr('y', -24).attr('dy', '0.35em')
        .style('fill', function (s) { return s.i === 0 ? ctx.c('gold-soft') : ctx.c('text-2'); })
        .text(function (s) {
          var t = (s.label ? s.label + ' · ' : '') + num(s.rate * 100, 2) + '%';
          var avail = x(s.to + 0.5) - x(s.from - 0.5) - 8;
          return textW(t, fontMono(10)) <= avail ? t : (textW(num(s.rate * 100, 2) + '%', fontMono(10)) <= avail ? num(s.rate * 100, 2) + '%' : '');
        });
      /* rate-change markers with plate */
      var rc = segs.filter(function (s) { return s.i > 0; });
      var rm = ctx.layer('rate').selectAll('g').data(rc, function (s) { return s.i; });
      rm.exit().remove();
      var rme = rm.enter().append('g');
      rme.append('line').attr('stroke-dasharray', '3 3').attr('shape-rendering', 'crispEdges');
      rme.append('rect').attr('rx', 2);
      rme.append('text');
      var rma = rme.merge(rm);
      rma.select('line').attr('stroke', ctx.c('text-3')).attr('x1', function (s) { return crisp(x(s.from - 0.5)); }).attr('x2', function (s) { return crisp(x(s.from - 0.5)); }).attr('y1', -16).attr('y2', ph);
      rma.each(function (s) {
        var prev = segs[s.i - 1];
        var t = (cfg.fixedLabel && s.i === 1 ? cfg.fixedLabel : (s.i === 1 ? 'Bunga tetap berakhir' : 'Perubahan bunga')) + ' · bulan ' + (s.from - 1) + ' → ' + num(s.rate * 100, 2) + '%';
        var tw = textW(t, fontMono(10)) + 12;
        var lx = x(s.from - 0.5) + 6;
        if (lx + tw > pw) lx = x(s.from - 0.5) - 6 - tw;
        var sel = d3.select(this);
        sel.select('rect').attr('x', lx).attr('y', 6).attr('width', tw).attr('height', 16).attr('fill', ctx.c('surface-solid')).attr('stroke', ctx.c('rule-strong'));
        sel.select('text').attr('x', lx + 6).attr('y', 14).attr('dy', '0.35em').style('fill', ctx.c('text-2')).text(t);
        void prev;
      });
      /* stacked areas (monthly) or stacked bars (yearly) */
      var aSel = ctx.layer('areas'), bSel = ctx.layer('bars');
      if (!yearly) {
        bSel.selectAll('*').remove();
        var idx = pts.map(function (_, i) { return i; });
        var aP = d3.area().x(function (i) { return x(pts[i].k); }).y0(ph).y1(function (i) { return yL(pts[i].principal); }).curve(d3.curveStepAfter);
        var aI = d3.area().x(function (i) { return x(pts[i].k); }).y0(function (i) { return yL(pts[i].principal); }).y1(function (i) { return yL(pts[i].principal + pts[i].interest); }).curve(d3.curveStepAfter);
        var lP = d3.line().x(function (i) { return x(pts[i].k); }).y(function (i) { return yL(pts[i].principal); }).curve(d3.curveStepAfter);
        var lI = d3.line().x(function (i) { return x(pts[i].k); }).y(function (i) { return yL(pts[i].principal + pts[i].interest); }).curve(d3.curveStepAfter);
        var defs = [
          { k: 'p', d: aP(idx), fill: alpha(pc, 0.3), stroke: 'none' },
          { k: 'i', d: aI(idx), fill: alpha(ic, 0.14), stroke: 'none' },
          { k: 'pl', d: lP(idx), fill: 'none', stroke: pc },
          { k: 'il', d: lI(idx), fill: 'none', stroke: ic }
        ];
        var ap = aSel.selectAll('path').data(defs, function (q) { return q.k; });
        ap.exit().remove();
        var apAll = ap.enter().append('path').attr('class', 'mc-mark').attr('stroke-width', 1.25).merge(ap)
          .attr('data-k', function (q) { return q.k.charAt(0) === 'p' ? 'principal' : 'interest'; })
          .attr('fill', function (q) { return q.fill; }).attr('stroke', function (q) { return q.stroke; });
        var same = ctx._amN === pts.length;
        ctx._amN = pts.length;
        if (ctx.animate && !ctx.first && same) apAll.transition().duration(DUR.morph).ease(EASE.standard).attr('d', function (q) { return q.d; });
        else apAll.interrupt().attr('d', function (q) { return q.d; });
        clipReveal(ctx, aSel, pw, ph);
      } else {
        aSel.selectAll('*').remove();
        aSel.attr('clip-path', null);
        var bw = xb.bandwidth();
        var stack = [];
        pts.forEach(function (p) {
          stack.push({ key: p.k + 'p', k: p.k, s: 'principal', y0: 0, y1: p.principal, c: pc });
          stack.push({ key: p.k + 'i', k: p.k, s: 'interest', y0: p.principal, y1: p.principal + p.interest, c: ic });
        });
        var br = bSel.selectAll('rect').data(stack, function (q) { return q.key; });
        br.exit().remove();
        var bre = br.enter().append('rect').attr('class', 'mc-mark').attr('y', ph).attr('height', 0);
        var bra = bre.merge(br).attr('data-k', function (q) { return q.s; }).attr('data-c', function (q) { return String(q.k); })
          .attr('x', function (q) { return xb(String(q.k)); }).attr('width', bw).attr('fill', function (q) { return q.c; })
          .attr('fill-opacity', function (q) { return q.s === 'principal' ? 0.9 : 0.85; });
        ctx.tr(bra, { delay: function (q, i) { return Math.floor(i / 2) * DUR.stagger; } })
          .attr('y', function (q) { return yL(q.y1); }).attr('height', function (q) { return Math.max(0, yL(q.y0) - yL(q.y1) - (q.s === 'interest' ? 1 : 0)); });
      }
      /* outstanding balance (right axis) */
      var bl = ctx.layer('balance').selectAll('path').data(showBal ? [0] : []);
      bl.exit().remove();
      if (showBal) {
        var balLine = yearly
          ? d3.line().x(function (p) { return xb(String(p.k)) + xb.bandwidth() / 2; }).y(function (p) { return yR(p.balance); })(pts)
          : d3.line().x(function (r) { return x(r.month); }).y(function (r) { return yR(r.balance); })(sched);
        bl.enter().append('path').attr('class', 'mc-mark').attr('data-k', 'balance').attr('fill', 'none').attr('stroke-width', 1.25).merge(bl)
          .attr('stroke', alpha(ctx.c('prop-balance'), 0.8)).attr('stroke-dasharray', '4 3').attr('d', balLine);
      }
      /* vertical marker (e.g. current month) */
      var mk = cfg.marker ? [typeof cfg.marker === 'object' ? cfg.marker : { month: cfg.marker }] : [];
      var mg = ctx.layer('marker').selectAll('g').data(mk);
      mg.exit().remove();
      var mge = mg.enter().append('g');
      mge.append('line').attr('shape-rendering', 'crispEdges');
      mge.append('text').attr('class', 'mc-t-gold');
      var mga = mge.merge(mg);
      mga.select('line').attr('stroke', ctx.c('gold')).attr('x1', function (d) { return crisp(x(d.month)); }).attr('x2', function (d) { return crisp(x(d.month)); }).attr('y1', -16).attr('y2', ph);
      function flipM(d) { return x(d.month) + 6 + textW(d.label || ('Bln ' + d.month), fontMono(10)) > pw; }
      mga.select('text').attr('x', function (d) { return x(d.month) + (flipM(d) ? -6 : 6); }).attr('y', -6)
        .attr('text-anchor', function (d) { return flipM(d) ? 'end' : 'start'; })
        .text(function (d) { return d.label || ('Bln ' + d.month); });
      var cr = ctx.layer('cross').selectAll('line').data([0]);
      cr.enter().append('line').attr('class', 'mc-cross').style('opacity', 0).merge(cr).attr('y1', 0).attr('y2', ph);
    },
    summary: function (ctx) {
      var s = ctx.sched || [];
      if (!s.length) return (ctx.cfg.label || 'Angsuran KPR') + ': belum ada data.';
      var ti = sum(s, function (r) { return r.interest; }), tp = sum(s, function (r) { return r.principal; });
      return (ctx.cfg.label || 'Angsuran KPR') + ', ' + s.length + ' bulan. Angsuran pertama ' + fmt.rp(s[0].payment, { full: true }) + ', angsuran tertinggi ' + fmt.rp(maxOf(s, function (r) { return r.payment; }), { full: true }) +
        '. Total pokok ' + rpSpoken(tp) + ', total bunga ' + rpSpoken(ti) + '.';
    },
    table: function (ctx) {
      var f = function (v) { return fmt.rp(v, { full: true }); };
      return {
        columns: [ctx.yearly ? 'Tahun' : 'Bulan', 'Angsuran', 'Pokok', 'Bunga', 'Sisa pokok'],
        rows: ctx.pts.map(function (p) { return [String(p.k), f(p.payment), f(p.principal), f(p.interest), p.balance != null ? f(p.balance) : null]; })
      };
    },
    nav: {
      big: 12,
      count: function (ctx) { return ctx.pts ? ctx.pts.length : 0; },
      focus: function (ctx, i) { return amFocus(ctx, i); },
      blur: function (ctx) { amBlur(ctx); },
      activate: function (ctx, i, e) { ctx.click({ key: String(ctx.pts[i].k), index: i, datum: ctx.pts[i] }, e); },
      hint: 'Gunakan tombol panah kiri dan kanan untuk menggeser penanda satu bulan, Shift untuk 12 bulan.'
    }
  });
  function amIndex(ctx, px) {
    if (!ctx.pts || !ctx.pts.length) return -1;
    if (ctx.yearly) return bandIndex(ctx.xb, px, ctx.pts.length);
    var m = Math.round(ctx.x.invert(px));
    var i = m - ctx.pts[0].k;
    return i < 0 || i >= ctx.pts.length ? -1 : i;
  }
  function amFocus(ctx, i) {
    var p = ctx.pts[i];
    if (!p) return null;
    var cx = ctx.yearly ? ctx.xb(String(p.k)) + ctx.xb.bandwidth() / 2 : ctx.x(p.k);
    ctx.layer('cross').select('line').attr('x1', crisp(cx)).attr('x2', crisp(cx)).style('opacity', 1);
    var dots = [{ k: 'p', y: ctx.yL(p.principal), c: ctx.pc }, { k: 'i', y: ctx.yL(p.principal + p.interest), c: ctx.ic }];
    if (ctx.yR && p.balance != null) dots.push({ k: 'b', y: ctx.yR(p.balance), c: ctx.c('prop-balance') });
    var hd = ctx.layer('hdots').selectAll('circle').data(dots, function (d) { return d.k; });
    hd.exit().remove();
    hd.enter().append('circle').attr('r', 3).attr('stroke-width', 1.5).merge(hd).attr('cx', cx).attr('cy', function (d) { return d.y; }).attr('fill', ctx.c('canvas')).attr('stroke', function (d) { return d.c; });
    var f = function (v) { return fmt.rp(v, { full: true }); };
    var when = '';
    if (ctx.start && !ctx.yearly) { var dt = new Date(ctx.start.getFullYear(), ctx.start.getMonth() + p.k - 1, 1); when = ' · ' + BULAN[dt.getMonth()] + ' ' + dt.getFullYear(); }
    var seg = (ctx.segs || []).filter(function (s) { return p.k >= s.from && p.k <= s.to; })[0];
    var content = {
      eyebrow: (ctx.yearly ? 'Tahun ' + p.k : 'Bulan ' + p.k) + when + (seg ? ' · ' + num(seg.rate * 100, 2) + '%' : ''),
      rows: [
        { label: ctx.yearly ? 'Angsuran dalam setahun' : 'Angsuran', value: f(p.payment), strong: true },
        { color: ctx.pc, shape: 'square', label: 'Pokok', value: f(p.principal) },
        { color: ctx.ic, shape: 'square', label: 'Bunga', value: f(p.interest) }
      ].concat(p.balance != null ? [{ label: 'Sisa pokok', value: f(p.balance), muted: true }] : [])
    };
    ctx.hover({ key: String(p.k), index: i, datum: p });
    return { x: ctx.m.l + cx, y: ctx.m.t + ctx.yL(p.principal + p.interest), content: content };
  }
  function amBlur(ctx) {
    ctx.layer('cross').select('line').style('opacity', 0);
    ctx.layer('hdots').selectAll('circle').remove();
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 30. podium(el, data, cfg): top three, order #2 · #1 · #3 (§13.3)
   * data: [{key, name, initials?, role?, value, movement? (int | 'NEW'; 'BARU' is read as NEW),
   *         achievement? (ratio), mix? [{key, value, color?}], rank?}]
   * cfg: format 'int', unit 'points', emptyText, emptyAction {label, onClick},
   *      onClick(item)
   * Restraint: metallic gradient only on the avatar ring, medal border and
   * the 3 px plinth top. One 600 ms sweep when #1 changes; never under
   * reduced motion.
   * ────────────────────────────────────────────────────────────────────── */
  var PLINTH = { 1: 132, 2: 104, 3: 88 };
  var podium = define('podium', {
    svg: false, d3: false, natural: true, role: 'group',
    defaults: { format: 'int', unit: 'points', emptyText: 'Belum ada data pada periode ini.', tableToggle: false },
    render: function (ctx) {
      var cfg = ctx.cfg;
      var items = (ctx.data || []).slice(0, 3).map(function (d, i) {
        var nm = d.name || d.label || '';
        var ini = d.initials || nm.split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
        return { key: keyOf(d, i), name: nm, ini: ini, role: d.role, v: +d.value || 0, mv: d.movement, ach: d.achievement, mix: d.mix, place: d.rank || i + 1, raw: d };
      });
      ctx.items = items;
      var prevFirst = ctx._first;
      var prevVals = ctx._vals || {};
      var before = {};
      if (ctx.stage && !reducedMotion()) {
        ctx.stage.querySelectorAll('.mc-podium__col').forEach(function (c) { var k = c.getAttribute('data-key'); if (k) before[k] = c.querySelector('.mc-podium__card').getBoundingClientRect(); });
      }
      ctx.root.querySelectorAll('.mc-podium').forEach(function (n) { n.parentNode.removeChild(n); });
      var empty = !items.length;
      var wrap = h('div', { class: 'mc-podium' + (empty ? ' is-empty' : '') + (typeof cfg.onClick === 'function' ? ' is-clickable' : '') });
      var stage = h('div', { class: 'mc-podium__stage' });
      ctx.stage = stage;
      var gid = ctx.id;
      var f = ctx.fmt();
      [2, 1, 3].forEach(function (place) {
        var it = items.filter(function (q, i) { return (i + 1) === place; })[0];
        var col = h('div', { class: 'mc-podium__col', 'data-place': String(place), 'data-key': it ? it.key : null });
        var metal = METALS[place];
        col.style.setProperty('--mc-metal', 'linear-gradient(90deg,' + metal[0] + ' 0%,' + metal[1] + ' 45%,' + metal[2] + ' 100%)');
        var card = h('div', { class: 'mc-podium__card' });
        if (it) {
          var av = place === 1 ? 80 : 64;
          var svg = svgEl('svg', { width: av, height: av, viewBox: '0 0 ' + av + ' ' + av, 'aria-hidden': 'true', focusable: 'false' });
          var defs = svgEl('defs');
          var lg = svgEl('linearGradient', { id: gid + '-g' + place, x1: '0', y1: '0', x2: '1', y2: '1' });
          lg.appendChild(svgEl('stop', { offset: '0', 'stop-color': metal[0] }));
          lg.appendChild(svgEl('stop', { offset: '0.45', 'stop-color': metal[1] }));
          lg.appendChild(svgEl('stop', { offset: '1', 'stop-color': metal[2] }));
          defs.appendChild(lg);
          svg.appendChild(defs);
          svg.appendChild(svgEl('circle', { cx: av / 2, cy: av / 2, r: av / 2 - 1.5, fill: tok('surface-raised'), stroke: 'url(#' + gid + '-g' + place + ')', 'stroke-width': 2 }));
          svg.appendChild(svgEl('text', { x: av / 2, y: av / 2, dy: '0.35em', 'text-anchor': 'middle', style: 'fill:' + tok('text-1') + ';font-family:' + tok('font-sans') + ';font-weight:600;font-size:' + Math.round(av * 0.28) + 'px;letter-spacing:.04em', text: it.ini }));
          card.appendChild(svg);
          card.appendChild(h('div', { class: 'mc-podium__name', text: it.name, title: it.name }));
          if (it.role) card.appendChild(h('span', { class: 'mc-podium__role', text: it.role }));
          var val = h('div', { class: 'mc-podium__val' });
          var nEl = h('span', { class: 'n' });
          val.appendChild(nEl);
          if (cfg.format === 'rp') {
            var rp = rpParts(it.v);
            val.insertBefore(h('span', { class: 'u-cur', text: 'Rp' }), nEl);
            if (rp.mag) val.appendChild(h('span', { class: 'u-mag', text: rp.mag }));
            countUp(nEl, prevVals[it.key] != null ? prevVals[it.key] : (ctx.first ? 0 : it.v), it.v, function (v, to) { return rpParts(v, to).num; });
          } else {
            if (cfg.unit) val.appendChild(h('span', { class: 'u-unit', text: cfg.unit }));
            countUp(nEl, prevVals[it.key] != null ? prevVals[it.key] : (ctx.first ? 0 : it.v), it.v, cfg.format);
          }
          card.appendChild(val);
          var meta = h('div', { class: 'mc-podium__meta' });
          if (it.mv != null) {
            var isNew = it.mv === 'BARU' || it.mv === 'NEW';
            var mvs = isNew ? { t: 'BARU', c: 'mc-flat' } : +it.mv > 0 ? { t: '▲' + it.mv, c: 'mc-pos' } : +it.mv < 0 ? { t: '▼' + Math.abs(it.mv), c: 'mc-neg' } : { t: '=', c: 'mc-flat' };
            meta.appendChild(h('span', { class: mvs.c, text: mvs.t, 'aria-label': isNew ? 'entri baru' : (+it.mv > 0 ? 'naik ' + it.mv : +it.mv < 0 ? 'turun ' + Math.abs(it.mv) : 'tetap') }));
          }
          if (it.ach != null) {
            var ach = h('span', { class: 'mc-podium__ach' });
            var ringBox = h('span', { style: { display: 'inline-block', width: '20px', height: '20px' } });
            ach.appendChild(ringBox);
            ach.appendChild(h('span', { text: fmt.pct(it.ach, 0) }));
            meta.appendChild(ach);
            ctx.later(function () { if (ringBox.isConnected) progressRing(ringBox, it.ach, { size: 20, thresholds: true, label: 'Pencapaian ' + it.name, animate: !ctx.first || ctx.animate }); }, 0);
          }
          if (meta.childNodes.length) card.appendChild(meta);
          if (it.mix && it.mix.length) {
            var tot = sum(it.mix, function (q) { return +q.value || 0; }) || 1;
            var mix = h('div', { class: 'mc-podium__mix', 'aria-hidden': 'true' });
            it.mix.forEach(function (q, qi) {
              if (!(+q.value > 0)) return;
              mix.appendChild(h('i', { style: { width: ((+q.value / tot) * 100).toFixed(2) + '%', background: seriesColor({ key: String(q.key), color: q.color }, qi, ctx.root) } }));
            });
            card.appendChild(mix);
          }
          col.tabIndex = typeof cfg.onClick === 'function' ? 0 : -1;
          col.setAttribute('aria-label', '#' + place + ' ' + it.name + ', ' + f(it.v) + (cfg.unit && cfg.format !== 'rp' ? ' ' + cfg.unit : ''));
          col.addEventListener('click', function (e) { ctx.click(it.raw, e); });
          col.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.click(it.raw, e); } });
          col.addEventListener('mouseenter', function () { ctx.hover({ key: it.key, datum: it.raw }); });
          col.addEventListener('mouseleave', function () { ctx.hover(null); });
        }
        col.appendChild(card);
        var plinth = h('div', { class: 'mc-podium__plinth', style: { height: PLINTH[place] + 'px' } });
        var medal = svgEl('svg', { width: 22, height: 22, viewBox: '0 0 22 22', 'aria-hidden': 'true', focusable: 'false' });
        var mdefs = svgEl('defs');
        var mg = svgEl('linearGradient', { id: gid + '-m' + place, x1: '0', y1: '0', x2: '1', y2: '1' });
        mg.appendChild(svgEl('stop', { offset: '0', 'stop-color': metal[0] }));
        mg.appendChild(svgEl('stop', { offset: '0.45', 'stop-color': metal[1] }));
        mg.appendChild(svgEl('stop', { offset: '1', 'stop-color': metal[2] }));
        mdefs.appendChild(mg);
        medal.appendChild(mdefs);
        medal.appendChild(svgEl('circle', { cx: 11, cy: 11, r: 10, fill: 'none', stroke: empty ? tok('rule-strong') : 'url(#' + gid + '-m' + place + ')', 'stroke-width': 1.25 }));
        medal.appendChild(svgEl('text', { x: 11, y: 11, dy: '0.35em', 'text-anchor': 'middle', style: 'fill:' + (empty ? tok('text-3') : tok('text-1')) + ';font-family:' + tok('font-mono') + ';font-size:12px;font-weight:500', text: String(place) }));
        plinth.appendChild(medal);
        if (place === 1) plinth.appendChild(h('span', { class: 'mc-podium__sweep', 'aria-hidden': 'true' }));
        col.appendChild(plinth);
        stage.appendChild(col);
      });
      wrap.appendChild(stage);
      wrap.appendChild(h('div', { class: 'mc-podium__base', 'aria-hidden': 'true' }));
      if (empty) {
        var em = h('div', { class: 'mc-podium__empty' }, h('p', { class: 'mc-empty', text: cfg.emptyText }));
        if (cfg.emptyAction && typeof cfg.emptyAction.onClick === 'function') {
          var b = h('button', { type: 'button', class: 'mc-dt-toggle is-visible', style: { position: 'static' }, text: cfg.emptyAction.label || 'Lihat periode sebelumnya' });
          b.addEventListener('click', cfg.emptyAction.onClick);
          em.appendChild(b);
        }
        wrap.appendChild(em);
      }
      ctx.root.insertBefore(wrap, ctx.root.firstChild);
      /* FLIP: cards that changed place glide to their new column */
      if (Object.keys(before).length && !reducedMotion()) {
        stage.querySelectorAll('.mc-podium__col').forEach(function (c) {
          var k = c.getAttribute('data-key'), card = c.querySelector('.mc-podium__card');
          if (!k || !before[k] || !card.animate) return;
          var now = card.getBoundingClientRect();
          var dx = before[k].left - now.left, dy = before[k].top - now.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          card.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)', opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: DUR.flip, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
        });
      }
      var first = items[0] ? items[0].key : null;
      if (prevFirst !== undefined && first && prevFirst !== first && !reducedMotion()) {
        var sw = stage.querySelector('.mc-podium__sweep');
        if (sw && sw.animate) sw.animate([{ transform: 'translateX(-100%)', opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: 'translateX(100%)', opacity: 0 }], { duration: DUR.sweep, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      }
      ctx._first = first;
      ctx._vals = {};
      items.forEach(function (it) { ctx._vals[it.key] = it.v; });
    },
    summary: function (ctx) {
      var items = ctx.items || [];
      if (!items.length) return ctx.cfg.emptyText;
      var f = ctx.fmt();
      return 'Podium: ' + items.map(function (it, i) { return '#' + (i + 1) + ' ' + it.name + ' ' + f(it.v) + (ctx.cfg.format !== 'rp' && ctx.cfg.unit ? ' ' + ctx.cfg.unit : ''); }).join('; ') + '.';
    }
  });


  /* ──────────────────────────────────────────────────────────────────────
   * Exports
   * ────────────────────────────────────────────────────────────────────── */
  MCD.charts = Object.assign(MCD.charts || {}, {
    version: VERSION,
    /* §J.4 primitives */
    kpiTile: kpiTile,
    sparkline: sparkline,
    stackedColumns: stackedColumns,
    matrix: matrix,
    hbars: hbars,
    stepBars: stepBars,
    histogram: histogram,
    scatterCanvas: scatterCanvas,
    shareBars: shareBars,
    line: line,
    table: table,
    countUp: countUp,
    /* additional primitives (Properti & KPR, Leaderboard, UMKM) */
    bulletChart: bulletChart,
    lollipop: lollipop,
    slope: slope,
    progressRing: progressRing,
    donutRing: donutRing,
    funnel: funnel,
    calendarHeatmap: calendarHeatmap,
    amortizationArea: amortizationArea,
    podium: podium,
    amortize: amortize,
    legend: legend,
    glyph: glyph,
    monogram: monogram,
    miniSpark: miniSpark,
    tooltip: { show: function (pt, content) { Tip.show(pt, content, 'ext', true); }, hide: function () { Tip.hide(); }, text: Tip.text },
    color: function (name) { return color(name); },
    alpha: alpha,
    tokens: { get: tok, refresh: refreshTokens, platinumSections: PLATINUM_SECTIONS },
    format: { rp: fmt.rp, rpParts: rpParts, int: fmt.int, pct: fmt.pct, pp: fmt.pp, num: num, delta: fmt.delta, month: fmt.month, monthLong: fmt.monthLong, date: fmt.date, day: fmt.day, spoken: rpSpoken, formatter: formatter },
    products: PRODUCTS,
    productOrder: PRODUCT_ORDER.slice(),
    ease: EASE,
    reducedMotion: reducedMotion,
    injectStyles: injectStyles
  });
})(window.MCD = window.MCD || {});
