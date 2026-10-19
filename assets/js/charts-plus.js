/* ==========================================================================
 * MCD.charts (plus): the merchant acquisition chart kit
 * Bank Mandiri · Jakarta Cilangkap Branch · Acquisition Dashboard
 *
 * Five charts for the new sections (COPY_STYLE_EN items 11-14,
 * DESIGN_DIRECTION_V2): bold status colours that are the same everywhere
 * (green = acquired / on target, amber = partly / close, red = not yet /
 * behind, grey = no data, blue = potential before the LVM file is imported),
 * legends in words, and charts that read in five seconds.
 *
 *   MCD.charts.combo(el, {categories, bars:[{key,label,values,color}],
 *                         line:{label, values, axis:'right', format:'pct', status:'coverage'},
 *                         target?, stacked?})
 *   MCD.charts.donut(el, {slices:[{key?,label,value,color}], centerLabel, centerValue})
 *   MCD.charts.pie(el,   {slices:[…]})
 *   MCD.charts.heatmap(el, {rows, cols, values, scale:'coverage'|'ranked'|'count'|'status', cellLabel:true})
 *   MCD.charts.statusBar(el, {acquired, partly, notYet, noData} | {potential}, {scale?: 'ranked'})
 *   MCD.charts.bigNumber(el, {label, value, delta, status ('neutral' = plain chip), note, help ("?" tip)})
 *   MCD.charts.rankedBars(el, {items:[{id,label,sub,value,valueLabel,symbol,parts}], onSelect, max, format, bars})
 *       (also MCD.chartsPlus.rankedBars): named glass rankings, every row a button (item 31, §13); v5: the words
 *       of a row's level dots float in one card BESIDE the row, outside the list (MCD.windows.place when present,
 *       else plus.placeCard), so the row below stays readable (V4 open item 7)
 *   MCD.charts.status.{tone, css, color, token, label, coverageTone, coverageWords, bands,
 *                      ranked, rankCuts, rankTone, rankWords, rankLegend, cutPct}
 *
 * Ranked colours (COPY_STYLE_EN item 18, 15 Oct 2026): coverage is compared, not judged against
 * fixed targets. status.ranked(values) splits the values into thirds with the same cut rule as
 * MCD.territory (green = strongest third, amber = middle third, red = weakest third, go here next;
 * ties share the lower band); heatmap scale 'ranked' (per column by default, rankBy 'row' | 'all',
 * cuts {lo, hi}), combo line.status 'ranked' (line.cuts or line.tones from the map) and statusBar
 * scale 'ranked' use it, and every legend says it in words.
 *
 * Every factory takes (el, data, cfg?) and returns
 *   { el, kind, update(data?, cfg?), destroy(), highlight(key|null), showTable(on?), resize() }
 * (donut and pie add select(key|null)). update() shallow-merges data and cfg
 * into the previous ones (pass a key as null to remove it) and animates from
 * the previous values. Options may sit in data or cfg; cfg wins. Common options:
 *   label (accessible name) · ariaLabel (override the summary) · height (px)
 *   onClick(payload, event) · onHover(payload|null) · animate (default true)
 *   tableToggle (true = visible "Show data table" button, hidden while there
 *   are no rows; 'focus' = hidden until focused; false = none) · demo (true
 *   when the chart draws the bank's own
 *   figures: a DEMO mark follows the Demo data switch) · legend (false = none)
 *   format ('int' | 'num1' | 'pct' | 'pct0' | 'rp' | fn); percentages are RATIOS.
 *
 * Colours: a series / slice colour may be a status word ('acquired', 'partly',
 * 'notYet', 'noData', 'potential', also 'ok' | 'mid' | 'bad' | 'none'), a token
 * name ('chart-2', '--chart-hl') or any CSS colour. Fills are written as
 * var(--token) so Day / Night switch at once; computed colours (contrast,
 * tooltips) are re-read on every render, and every live chart re-renders by
 * itself when html[data-theme] changes (or on a 'mcd:theme' document event).
 *
 * Safe DOM only: text through textContent (d3 .text()), no innerHTML, no
 * inline scripts. Classic IIFE on window.MCD; loads after charts.js and d3.
 * Motion: 650 ms grow / sweep, nothing under prefers-reduced-motion.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = window;
  var D = document;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var VERSION = '1.2.0';
  var MINUS = '−';

  /* ──────────────────────────────────────────────────────────────────────
   * 1. Tokens (read live from :root; fallbacks mirror tokens.css / brand.css)
   * ────────────────────────────────────────────────────────────────────── */
  var FALLBACK = {
    'ink': '#EEF2F8', 'ink-2': '#AEB9CB', 'ink-3': '#7E8BA0',
    'text-1': '#EDEFF3', 'text-2': '#A7B0C0', 'text-3': '#7C879A',
    'canvas': '#05080F', 'surface-solid': '#0E1626',
    'rule': 'rgba(214, 224, 240, 0.08)', 'rule-strong': 'rgba(214, 224, 240, 0.14)',
    'chart-1': '#9CC4F0', 'chart-2': '#5B9BE0', 'chart-3': '#2F72C0', 'chart-4': '#1A4F8B', 'chart-5': '#0B2E59', 'chart-hl': '#F2B705',
    'status-ok': '#2FB879', 'status-mid': '#F0A92E', 'status-bad': '#EE5A4F', 'status-none': '#6F7B90',
    'status-potential': '#4C8DF6', 'status-ink': '#05080F', 'status-none-a20': 'rgba(111, 123, 144, 0.20)',
    'pos': '#4CC38A', 'neg': '#F26D5B', 'signal': '#38D6E8',
    'font-serif': '"Source Serif 4", Georgia, serif',
    'font-sans': '"Inter Tight", "Inter", system-ui, sans-serif',
    'font-mono': '"IBM Plex Mono", ui-monospace, monospace'
  };

  /** One reader per render: getComputedStyle once, each token memoised for that render only. */
  function reader() {
    var cs = null, memo = Object.create(null);
    return function (name) {
      name = String(name).replace(/^--/, '');
      if (name in memo) return memo[name];
      if (!cs) { try { cs = W.getComputedStyle(D.documentElement); } catch (e) { cs = null; } }
      var v = cs ? String(cs.getPropertyValue('--' + name) || '').trim() : '';
      if (!v) v = FALLBACK[name] || '';
      memo[name] = v;
      return v;
    };
  }
  function cssVar(token) {
    return 'var(--' + token + (FALLBACK[token] ? ', ' + FALLBACK[token] : '') + ')';
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 2. Status colour code (COPY_STYLE_EN item 11; MCD.config.statusScale)
   * ────────────────────────────────────────────────────────────────────── */
  var TONE_ALIAS = {
    acquired: 'ok', ok: 'ok', ontarget: 'ok', good: 'ok', green: 'ok', done: 'ok',
    partly: 'mid', partial: 'mid', mid: 'mid', close: 'mid', amber: 'mid',
    notyet: 'bad', bad: 'bad', behind: 'bad', red: 'bad',
    nodata: 'none', none: 'none', grey: 'none', gray: 'none', na: 'none',
    potential: 'potential', blue: 'potential'
  };
  var TONE_TOKEN = { ok: 'status-ok', mid: 'status-mid', bad: 'status-bad', none: 'status-none', potential: 'status-potential' };
  var TONE_KEY = { ok: 'acquired', mid: 'partly', bad: 'notYet', none: 'noData', potential: 'potential' };
  var SCALE_FALLBACK = {
    acquired: { label: 'Sudah diakuisisi', short: 'Sudah' },
    partly: { label: 'Sebagian diakuisisi', short: 'Sebagian' },
    notYet: { label: 'Belum ada di LVM', short: 'Belum' },
    noData: { label: 'Tidak ada data', short: 'Tanpa data' },
    potential: { label: 'Potensi (file LVM belum diimpor)', short: 'Potensi' }
  };
  var TARGET_WORDS = { ok: 'Tercapai', mid: 'Hampir tercapai', bad: 'Tertinggal', none: 'Tidak ada data', potential: 'Potensi' };

  /** 'notYet' | 'Not yet' | 'bad' | 'red' → 'bad'; unknown → null. */
  function toneOf(x) {
    if (x == null) return null;
    var k = String(x).replace(/[\s_-]/g, '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(TONE_ALIAS, k) ? TONE_ALIAS[k] : null;
  }
  function scaleEntry(tone) {
    var key = TONE_KEY[tone];
    var sc = MCD.config && MCD.config.statusScale;
    return (sc && sc[key]) || SCALE_FALLBACK[key] || null;
  }
  /** Words for a tone, from MCD.config.statusScale ("Already acquired", "Not yet", …). */
  function statusLabel(tone, short) {
    var e = scaleEntry(tone);
    return e ? (short ? (e.short || e.label) : e.label) : '';
  }
  function bands() {
    var b = MCD.config && MCD.config.coverageBands;
    return { ok: b && isNum(b.ok) ? b.ok : 0.5, mid: b && isNum(b.mid) ? b.mid : 0.2 };
  }
  /** Coverage ratio → tone with the shared bands (green ≥ 50 %, amber 20–50 %, red < 20 %). */
  function coverageTone(r) {
    if (r == null || !isFinite(r)) return 'none';
    var b = bands();
    return r >= b.ok ? 'ok' : r >= b.mid ? 'mid' : 'bad';
  }
  /** Legend words for a coverage band: "coverage 50% atau lebih", "coverage 20–50%", "coverage di bawah 20%". */
  function coverageWords(tone) {
    var b = bands();
    if (tone === 'ok') return 'coverage ' + fmtPct(b.ok, 0) + ' atau lebih';
    if (tone === 'mid') return 'coverage ' + fmtPct(b.mid, 0).replace('%', '') + '–' + fmtPct(b.ok, 0);
    if (tone === 'bad') return 'coverage di bawah ' + fmtPct(b.mid, 0);
    if (tone === 'potential') return statusLabel('potential');
    return 'Tidak ada data';
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 2b. Ranked (relative) colour scale: COPY_STYLE_EN item 18
   *    The values are ranked against each other and split into thirds: top
   *    third green ('ok'), middle third amber ('mid'), bottom third red
   *    ('bad'); ties share the lower band. The cut rule is the same as
   *    MCD.territory.terciles and MCD.lvm.terciles, so a chart beside the
   *    territory map colours each kecamatan exactly like its border:
   *    3 or more values with 3 or more different numbers and a real middle
   *    third (lo < hi), else null and the fixed coverage bands apply.
   *    lo = the highest value of the red third, hi = of the amber third.
   * ────────────────────────────────────────────────────────────────────── */
  function rankCuts(values) {
    var v = [];
    (values || []).forEach(function (x) { if (isNum(x)) v.push(x); });
    v.sort(function (a, c) { return a - c; });
    var n = v.length, distinct = 0;
    for (var i = 0; i < n; i++) if (!i || v[i] !== v[i - 1]) distinct++;
    if (n < 3 || distinct < 3) return null;
    var lo = v[Math.ceil(n / 3) - 1], hi = v[Math.ceil(2 * n / 3) - 1];
    return lo < hi ? { lo: lo, hi: hi, n: n, min: v[0], max: v[n - 1] } : null;
  }
  function cutsOf(c) { return c && isNum(c.lo) && isNum(c.hi) && c.lo < c.hi ? c : null; }
  /** Value → 'ok' | 'mid' | 'bad' ('none' for no value); without cut points the fixed coverage bands apply. */
  function rankTone(v, cut) {
    if (!isNum(v)) return 'none';
    var c = cutsOf(cut);
    if (!c) return coverageTone(v);
    return v <= c.lo ? 'bad' : (v <= c.hi ? 'mid' : 'ok');
  }
  /** Coverage-style percent for cut points: one decimal under 10% so 4.3% and 7.5% stay distinct. */
  function cutPct(x) { return isNum(x) ? fmtPct(x, x > 0 && x < 0.00095 ? 2 : x > 0 && x < 0.095 ? 1 : 0) : '—'; }
  var RANK_COLOUR = { ok: 'Hijau', mid: 'Kuning', bad: 'Merah', none: 'Abu-abu' };
  /**
   * Words for a ranked tone. opts: cut ({lo, hi}: adds the cut points), format (cut points; 'pct'
   * style by default), of ('of kecamatan'), colour (true: "Green: strongest third …"), none (words
   * for grey). Without cut points (fixed bands) the coverage band words are returned instead.
   */
  function rankWords(tone, opts) {
    opts = opts || {};
    var c = cutsOf(opts.cut);
    var t = toneOf(tone) || 'none';
    if (opts.fixed && t !== 'none') return (opts.colour ? RANK_COLOUR[t] + ': ' : '') + coverageWords(t).replace(/^./, function (ch) { return opts.colour ? ch.toLowerCase() : ch; });
    var f = typeof opts.format === 'function' ? opts.format : (opts.format ? formatter(opts.format) : cutPct);
    var of = opts.of ? ' ' + opts.of : '';
    var w;
    if (t === 'ok') w = 'sepertiga' + of + ' dengan coverage tertinggi' + (c ? ' (di atas ' + f(c.hi) + ')' : '');   /* "sepertiga kecamatan dengan coverage tertinggi" */
    else if (t === 'mid') w = 'sepertiga di tengah' + (c ? ' (' + (c.lo > 0 ? f(c.lo).replace('%', '') + '–' + f(c.hi) : 'sampai ' + f(c.hi)) + ')' : '');
    else if (t === 'bad') w = 'sepertiga dengan coverage terendah' + (c && opts.next === false ? ' (' + f(c.lo) + ' atau kurang)' : '') + (opts.next === false ? '' : ', kunjungi lebih dulu');
    else if (t === 'potential') w = statusLabel('potential').replace(/^./, function (ch) { return ch.toLowerCase(); });
    else w = opts.none || 'tidak dinilai atau tidak ada data';
    return opts.colour ? RANK_COLOUR[t] ? RANK_COLOUR[t] + ': ' + w : w : w.charAt(0).toUpperCase() + w.slice(1);
  }
  /** Legend items [{tone, label}] for a ranked scale, in words ("Green: strongest third …"). */
  function rankLegend(opts) {
    opts = opts || {};
    /* fixed: the fixed coverage bands' words; by default when there are no cut points. fixed: false keeps the
       ranked words without cut points (e.g. a heatmap ranked per column, each with its own cut points) */
    var fixed = opts.fixed != null ? !!opts.fixed : !cutsOf(opts.cut);
    var items = ['ok', 'mid', 'bad'].map(function (t) {
      return { tone: t, label: rankWords(t, { cut: opts.cut, format: opts.format, of: t === 'ok' ? opts.of : null, colour: true, fixed: fixed }) };
    });
    if (opts.none !== false) items.push({ tone: 'none', label: 'Abu-abu: ' + (opts.none || (fixed ? 'tidak ada data' : 'tidak dinilai atau tidak ada data')) });
    return items;
  }
  /**
   * ranked(values, opts?) → {applied, lo, hi, n, cut, tone(v), words(tone, extra?), legend(extra?)}:
   * the shared relative scale for a list of values (coverage ratios, shares). opts.cut uses given cut
   * points (for example the territory's relative.kecamatan) instead of computing them.
   */
  function ranked(values, opts) {
    opts = opts || {};
    var cut = cutsOf(opts.cut) || rankCuts(values || []);
    return {
      applied: !!cut, cut: cut, lo: cut ? cut.lo : null, hi: cut ? cut.hi : null, n: cut ? cut.n : (values || []).filter(isNum).length,
      tone: function (v) { return rankTone(v, cut); },
      words: function (tone, extra) { return rankWords(tone, assign({ cut: cut, fixed: !cut, format: opts.format, of: opts.of }, extra || {})); },
      legend: function (extra) { return rankLegend(assign({ cut: cut, format: opts.format, of: opts.of }, extra || {})); }
    };
  }

  var CYCLE = ['chart-2', 'chart-4', 'chart-1', 'chart-3', 'chart-5'];
  var DONUT_CYCLE = ['chart-1', 'chart-3', 'chart-5', 'chart-2', 'chart-4'];   /* A-16: slices read light → mid → dark */
  var SINGLE_TOKENS = { ink: 1, canvas: 1, gold: 1, pos: 1, neg: 1, warn: 1, info: 1, signal: 1, platinum: 1 };

  /** Colour spec → { css (for style.fill / background), token?, tone?, raw? }. */
  function colorSpec(x, fallback) {
    if (x == null || x === '') x = fallback;
    if (x == null || x === '') x = 'chart-2';
    var t = toneOf(x);
    if (t) return { css: cssVar(TONE_TOKEN[t]), token: TONE_TOKEN[t], tone: t };
    var s = String(x).trim();
    if (/^--[a-z0-9-]+$/i.test(s)) return { css: cssVar(s.slice(2)), token: s.slice(2) };
    if (/^[a-z]+(-[a-z0-9]+)+$/.test(s) || SINGLE_TOKENS[s]) return { css: cssVar(s), token: s };
    return { css: s, raw: s };
  }
  /** The actual colour of a spec in the current theme (for tooltips and contrast). */
  function resolve(T, spec) { return spec.token ? T(spec.token) : spec.raw || spec.css; }

  /* ──────────────────────────────────────────────────────────────────────
   * 3. Numbers (MCD.util.fmt first: en-GB, 'Rp 184.6 bn', '8.25%')
   * ────────────────────────────────────────────────────────────────────── */
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function toNum(x) {
    if (x == null || x === '' || typeof x === 'boolean') return null;
    var n = +x;
    return isFinite(n) ? n : null;
  }
  var NF = Object.create(null);
  function nf(d) { return NF[d] || (NF[d] = new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })); }
  function uf() { return MCD.util && MCD.util.fmt; }
  function fmtNum(v, d) {
    var f = uf();
    if (f && typeof f.num === 'function') return f.num(v, d);
    if (!isNum(v)) return '—';
    var s = nf(d || 0).format(Math.abs(v));
    return (v < 0 && s.replace(/[0.,]/g, '') !== '' ? MINUS : '') + s;
  }
  function fmtInt(v) {
    var f = uf();
    if (f && typeof f.int === 'function') return f.int(v);
    return isNum(v) ? fmtNum(Math.round(v), 0) : '—';
  }
  function fmtPct(v, d) {
    var f = uf();
    if (f && typeof f.pct === 'function') return f.pct(v, d == null ? 1 : d);
    return isNum(v) ? fmtNum(v * 100, d == null ? 1 : d) + '%' : '—';
  }
  function fmtRp(v) {
    var f = uf();
    if (f && typeof f.rp === 'function') return f.rp(v);
    if (MCD.charts && MCD.charts.format && MCD.charts.format.rp) return MCD.charts.format.rp(v);
    return isNum(v) ? 'Rp ' + fmtNum(v, 0) : '—';
  }
  /** 'int' | 'num' | 'num1' | 'num2' | 'pct' | 'pct0' | 'pct1' | 'pct2' | 'rp' | fn → fn(v). */
  function formatter(spec) {
    if (typeof spec === 'function') return function (v) { return v == null ? '—' : String(spec(v)); };
    switch (spec) {
      case 'pct': case 'pct1': return function (v) { return fmtPct(v, 1); };
      case 'pct0': return function (v) { return fmtPct(v, 0); };
      case 'pct2': return function (v) { return fmtPct(v, 2); };
      case 'pctAuto': return cutPct;                       /* one decimal under 10% (coverage), whole above */
      case 'rp': return fmtRp;
      case 'num1': return function (v) { return fmtNum(v, 1); };
      case 'num2': return function (v) { return fmtNum(v, 2); };
      default: return fmtInt;
    }
  }
  function isPctSpec(spec) { return typeof spec === 'string' && /^pct/.test(spec); }
  /** Axis labels: whole percentages drop their decimal ("25%", not "25.0%"). */
  function axisFormatter(spec, ticks) {
    if (isPctSpec(spec)) {
      var whole = ticks.every(function (t) { return Math.abs(t * 100 - Math.round(t * 100)) < 1e-6; });
      return formatter(whole ? 'pct0' : 'pct1');
    }
    return formatter(spec);
  }
  /** Signed gap: pct → '+4.2 pp' / '−12.0 pp', others through the formatter. */
  function gapText(d, pct, f) {
    var sign = d > 0 ? '+' : d < 0 ? MINUS : '';
    if (pct) return sign + fmtNum(Math.abs(d) * 100, 1) + ' pp';
    return sign + (f ? f(Math.abs(d)) : fmtInt(Math.abs(d)));
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 4. DOM, text and colour helpers
   * ────────────────────────────────────────────────────────────────────── */
  function h(tag, attrs, kids) {
    var n = D.createElement(tag);
    setAttrs(n, attrs);
    appendKids(n, kids);
    return n;
  }
  function s(tag, attrs, kids) {
    var n = D.createElementNS(SVGNS, tag);
    setAttrs(n, attrs);
    appendKids(n, kids);
    return n;
  }
  function setAttrs(n, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.setAttribute('class', v);
      else if (k === 'text') n.textContent = String(v);
      else if (k === 'style') Object.keys(v).forEach(function (sk) { if (v[sk] != null) n.style.setProperty(sk, String(v[sk])); });
      else if (k === 'on') Object.keys(v).forEach(function (ev) { n.addEventListener(ev, v[ev]); });
      else n.setAttribute(k, v === true ? '' : String(v));
    });
  }
  function appendKids(n, kids) {
    if (kids == null) return;
    (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'object' ? c : D.createTextNode(String(c)));
    });
  }
  function assign(t) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) t[k] = src[k];
    }
    return t;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function crisp(v) { return Math.round(v) + 0.5; }
  function pf(x) { return parseFloat(x) || 0; }
  function sum(arr, f) { var t = 0; (arr || []).forEach(function (d, i) { var v = f ? f(d, i) : d; if (isNum(v)) t += v; }); return t; }

  var measureCtx = null;
  function textW(str, font) {
    if (!measureCtx) {
      try { measureCtx = D.createElement('canvas').getContext('2d'); } catch (e) { measureCtx = null; }
      if (!measureCtx) return String(str).length * 7;
    }
    measureCtx.font = font;
    return measureCtx.measureText(String(str)).width;
  }
  function font(T, kind, px, wt) { return (wt || 400) + ' ' + px + 'px ' + (T('font-' + kind) || 'sans-serif'); }
  function maxW(list, f) { var m = 0; list.forEach(function (t) { var w = textW(t, f); if (w > m) m = w; }); return m; }
  /** Truncate with an ellipsis to fit maxW. */
  function fit(str, maxWidth, f) {
    str = String(str == null ? '' : str);
    if (maxWidth <= 0) return '';
    if (textW(str, f) <= maxWidth) return str;
    var lo = 0, hi = str.length;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (textW(str.slice(0, mid).replace(/\s+$/, '') + '…', f) <= maxWidth) lo = mid; else hi = mid - 1;
    }
    return lo ? str.slice(0, lo).replace(/\s+$/, '') + '…' : '';
  }
  /** Two balanced lines by words, or null when a word alone does not fit. */
  function wrap2(str, maxWidth, f) {
    var words = String(str).split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;
    var best = null;
    for (var i = 1; i < words.length; i++) {
      var a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      var wa = textW(a, f), wb = textW(b, f);
      if (wa <= maxWidth && wb <= maxWidth) {
        var score = Math.max(wa, wb);
        if (!best || score < best.score) best = { lines: [a, b], score: score };
      }
    }
    return best ? best.lines : null;
  }

  function parseColor(c) {
    c = String(c || '').trim();
    var m = /^#([0-9a-f]{3,8})$/i.exec(c);
    if (m) {
      var hx = m[1];
      if (hx.length < 6) hx = hx.split('').map(function (ch) { return ch + ch; }).join('');
      var n = parseInt(hx.slice(0, 6), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    m = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0], g: p[1], b: p[2] };
    }
    return null;
  }
  function luminance(c) {
    var p = parseColor(c);
    if (!p) return 0.5;
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(p.r) + 0.7152 * ch(p.g) + 0.0722 * ch(p.b);
  }
  function contrast(a, b) { var la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
  /** The better of ink / canvas on a fill (works in Day and Night). */
  function inkOn(T, fill) {
    var a = T('ink') || T('text-1'), b = T('canvas');
    return contrast(fill, a) >= contrast(fill, b) ? a : b;
  }

  function reducedMotion() {
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function raf(fn) { return W.requestAnimationFrame ? W.requestAnimationFrame(fn) : W.setTimeout(fn, 16); }
  function caf(id) { if (W.cancelAnimationFrame) W.cancelAnimationFrame(id); else W.clearTimeout(id); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ──────────────────────────────────────────────────────────────────────
   * 5. Tooltip: the shared MCD.charts tooltip (same look as every chart);
   *    a small local one only if charts.js is not loaded.
   * content = { eyebrow?, head?, body?, rows:[{color, shape, label, value, strong, muted}], foot? }
   * ────────────────────────────────────────────────────────────────────── */
  var ownTip = null;
  function sharedTip() { return MCD.charts && MCD.charts.tooltip && typeof MCD.charts.tooltip.show === 'function' ? MCD.charts.tooltip : null; }
  function tipShow(pt, content) {
    if (!content) { tipHide(); return; }
    var T = sharedTip();
    if (T) {
      try { if (typeof MCD.charts.injectStyles === 'function') MCD.charts.injectStyles(); T.show(pt, content); return; } catch (e) { /* local tooltip below */ }
    }
    if (!ownTip || !ownTip.isConnected) {
      ownTip = h('div', { class: 'mcp-tip', 'aria-hidden': 'true' });
      (D.getElementById('overlay-root') || D.body).appendChild(ownTip);
    }
    ownTip.textContent = '';
    if (content.eyebrow) ownTip.appendChild(h('p', { class: 'mcp-tip__eyebrow', text: content.eyebrow }));
    if (content.head) ownTip.appendChild(h('p', { class: 'mcp-tip__head', text: content.head }));
    (content.rows || []).forEach(function (r) {
      var row = h('p', { class: 'mcp-tip__row' + (r.strong ? ' is-strong' : '') + (r.muted ? ' is-muted' : '') });
      if (r.color) row.appendChild(h('span', { class: 'mcp-tip__sw', style: { background: r.color } }));
      row.appendChild(h('span', { class: 'mcp-tip__l', text: r.label == null ? '' : r.label }));
      row.appendChild(h('span', { class: 'mcp-tip__v', text: r.value == null ? '' : r.value }));
      ownTip.appendChild(row);
    });
    if (content.foot) ownTip.appendChild(h('p', { class: 'mcp-tip__foot', text: content.foot }));
    ownTip.classList.add('is-on');
    var r = ownTip.getBoundingClientRect(), vw = W.innerWidth, vh = W.innerHeight;
    var x = pt.x + 14, y = pt.y + 14;
    if (x + r.width > vw - 8) x = pt.x - 14 - r.width;
    if (y + r.height > vh - 8) y = pt.y - 14 - r.height;
    ownTip.style.transform = 'translate(' + Math.round(clamp(x, 8, Math.max(8, vw - r.width - 8))) + 'px,' + Math.round(clamp(y, 8, Math.max(8, vh - r.height - 8))) + 'px)';
  }
  function tipHide() {
    var T = sharedTip();
    if (T && typeof T.hide === 'function') { try { T.hide(); } catch (e) { /* ignore */ } }
    if (ownTip) ownTip.classList.remove('is-on');
  }
  function tipText(c) {
    if (!c) return '';
    var parts = [];
    if (c.eyebrow) parts.push(c.eyebrow);
    if (c.head) parts.push(c.head);
    (c.rows || []).forEach(function (r) { parts.push([r.label, r.value].filter(function (x) { return x != null && x !== ''; }).join(' ')); });
    if (c.foot) parts.push(c.foot);
    return parts.join('. ');
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 6. Theme: every live chart re-renders when html[data-theme] changes,
   *    on the system colour-scheme change, or on a 'mcd:theme' event.
   * ────────────────────────────────────────────────────────────────────── */
  var LIVE = [];
  var themeWatch = false, themeRaf = 0;
  function rerenderAll() {
    if (themeRaf) return;
    var done = false;
    function run() {
      if (done) return;
      done = true;
      themeRaf = 0;
      LIVE.slice().forEach(function (c) { if (!c.destroyed) c.render(false); });
    }
    /* next frame, or a short timer when frames are paused (hidden pane) */
    themeRaf = raf(run) || 1;
    W.setTimeout(run, 80);
  }
  function watchTheme() {
    if (themeWatch) return;
    themeWatch = true;
    try {
      if ('MutationObserver' in W) {
        new W.MutationObserver(rerenderAll).observe(D.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      }
    } catch (e) { /* older browsers: sections still call update() on 'theme' */ }
    try {
      var m = W.matchMedia && W.matchMedia('(prefers-color-scheme: light)');
      if (m && m.addEventListener) m.addEventListener('change', rerenderAll);
      else if (m && m.addListener) m.addListener(rerenderAll);
    } catch (e) { /* ignore */ }
    D.addEventListener('mcd:theme', rerenderAll);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 7. Base factory: sizing, ResizeObserver, legend, a11y, keyboard, table
   * spec = { kind, svg, d3, natural, height(ctx, w, o) | number, legend,
   *          render(ctx, o), summary(ctx, o), table(ctx, o) → {columns, rows, numeric?},
   *          nav: {count, focus(ctx, i) → {pt, content, text}, blur, activate, key?},
   *          highlight(ctx, key), api(ctx, handle) }
   * ────────────────────────────────────────────────────────────────────── */
  var UID = 0;
  var OWNED = typeof W.WeakMap === 'function' ? new W.WeakMap() : null;

  function make(kind, spec) {
    return function (el, data, cfg) {
      if (!el || el.nodeType !== 1) throw new TypeError('MCD.charts.' + kind + ': the target element is not valid');
      if (OWNED && OWNED.get(el)) { try { OWNED.get(el).destroy(); } catch (e) { /* ignore */ } }
      watchTheme();
      el.textContent = '';
      UID += 1;
      var ctx = {
        kind: kind, el: el, spec: spec, id: 'mcp-' + kind + '-' + UID,
        data: assign({}, data), cfg: assign({}, cfg),
        first: true, destroyed: false, pending: false, fixed: null, nav: -1, hl: null,
        prev: null, tableOn: false, anim: false, cleanup: [], lastW: -1, lastH: -1
      };
      var root = h('div', { class: 'mcp mcp--' + kind });
      ctx.root = root;
      ctx.legendEl = spec.legend ? h('div', { class: 'mcp__legend' }) : null;
      if (ctx.legendEl) root.appendChild(ctx.legendEl);
      ctx.plot = h('div', { class: 'mcp__plot' });
      root.appendChild(ctx.plot);
      ctx.belowEl = h('div', { class: 'mcp__below', hidden: true });
      root.appendChild(ctx.belowEl);
      ctx.summaryEl = h('p', { class: 'mcp-sr', id: ctx.id + '-sum' });
      root.appendChild(ctx.summaryEl);
      ctx.live = h('div', { class: 'mcp-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
      root.appendChild(ctx.live);
      el.appendChild(root);

      var d3 = W.d3;
      if (spec.d3 && !d3) {
        ctx.plot.appendChild(h('p', { class: 'mcp-empty', text: 'Grafik tidak dapat ditampilkan. Muat ulang halaman.' }));
        var dead = { el: root, kind: kind, update: function () { return dead; }, highlight: function () { return dead; }, showTable: function () { return dead; }, resize: function () { return dead; }, destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); } };
        return dead;
      }
      if (spec.svg) {
        ctx.svgNode = s('svg', { class: 'mcp__svg', focusable: 'false', 'aria-hidden': 'true' });
        ctx.plot.appendChild(ctx.svgNode);
        ctx.svg = d3.select(ctx.svgNode);
        ctx.g = ctx.svg.append('g').attr('class', 'mcp-g');
      }

      /* ---- helpers bound to this chart ---- */
      ctx.opts = function () { return assign({}, spec.defaults || {}, ctx.data, ctx.cfg); };
      ctx.on = function (target, ev, fn, opt) { target.addEventListener(ev, fn, opt); ctx.cleanup.push(function () { target.removeEventListener(ev, fn, opt); }); };
      ctx.say = function (t) {
        ctx.live.textContent = '';
        if (t) W.setTimeout(function () { if (!ctx.destroyed) ctx.live.textContent = t; }, 30);
      };
      ctx.hover = function (payload) {
        var k = payload == null ? null : String(payload.key);
        if (k === ctx._hoverKey) return;
        ctx._hoverKey = k;
        var o = ctx.o || {};
        if (typeof o.onHover === 'function') { try { o.onHover(payload); } catch (e) { console.error(e); } }
      };
      ctx.click = function (payload, ev) {
        var o = ctx.o || {};
        if (typeof o.onClick === 'function') { try { o.onClick(payload, ev); } catch (e) { console.error(e); } }
      };
      ctx.clickable = function () { return typeof (ctx.o || {}).onClick === 'function'; };
      ctx.tip = function (pt, content) { tipShow(pt, content); ctx._tipOn = true; };
      ctx.untip = function () { if (ctx._tipOn) { tipHide(); ctx._tipOn = false; } };
      ctx.ptOf = function (node, where) {
        var r = node.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: where === 'mid' ? r.top + r.height / 2 : r.top };
      };
      ctx.evPt = function (ev, node) {
        if (ev && isNum(ev.clientX) && (ev.clientX || ev.clientY)) return { x: ev.clientX, y: ev.clientY };
        return ctx.ptOf(node || ctx.plot, 'mid');
      };
      ctx.clearSvg = function () {
        if (ctx.svg) { ctx.svg.selectAll('*').interrupt(); ctx.g.selectAll('*').remove(); ctx.g.attr('transform', null); }
        var e = ctx.plot.querySelector('.mcp-empty');
        if (e) e.parentNode.removeChild(e);
      };
      ctx.empty = function (text) {
        ctx.plot.appendChild(h('p', { class: 'mcp-empty', text: text }));
      };
      ctx.setSvg = function (w, hh) {
        if (!ctx.svgNode) return;
        ctx.svgNode.setAttribute('width', Math.max(0, Math.round(w)));
        ctx.svgNode.setAttribute('height', Math.max(0, Math.round(hh)));
        ctx.svgNode.setAttribute('viewBox', '0 0 ' + Math.max(0, Math.round(w)) + ' ' + Math.max(0, Math.round(hh)));
      };
      /** Plot size: cfg.height, else the element's CSS height (fills it), else the chart's natural height. */
      ctx.size = function (o) {
        var w = Math.floor(ctx.plot.clientWidth);
        if (w < 40) { ctx.pending = true; return null; }
        var hh;
        if (spec.natural) hh = 0;
        else if (isNum(+o.height) && +o.height > 0) { hh = +o.height; ctx.plot.style.height = hh + 'px'; }
        else if (ctx.fixed) { ctx.plot.style.height = ''; hh = Math.max(spec.minHeight || 120, Math.floor(ctx.plot.clientHeight)); }
        else { hh = typeof spec.height === 'function' ? spec.height(ctx, w, o) : (spec.height || 260); ctx.plot.style.height = hh + 'px'; }
        if (!spec.natural) ctx.setSvg(w, hh);
        return { w: w, h: hh };
      };
      /** HTML legend in words: groups [{title?, items:[{kind:'box'|'line'|'linedot'|'dash'|'dot', css, label, key?}]}]. */
      ctx.legend = function (groups) {
        if (!ctx.legendEl) return;
        ctx.legendEl.textContent = '';
        var any = false;
        (groups || []).forEach(function (gr) {
          if (!gr || !gr.items || !gr.items.length) return;
          any = true;
          var ul = h('ul', { class: 'mcp-legend' + (gr.title ? ' mcp-legend--sub' : ''), 'aria-label': gr.title || 'Keterangan' });
          if (gr.title) ul.appendChild(h('li', { class: 'mcp-legend__t', text: gr.title }));
          gr.items.forEach(function (it) {
            var li = it.kind === 'note' ? h('li', { class: 'mcp-legend__i mcp-legend__note' }, [h('span', { text: it.label })])
              : h('li', { class: 'mcp-legend__i' }, [swatch(it), h('span', { text: it.label })]);
            if (it.key != null && spec.legendHover) {
              li.setAttribute('data-k', it.key);
              li.addEventListener('mouseenter', function () { spec.legendHover(ctx, it.key); });
              li.addEventListener('mouseleave', function () { spec.legendHover(ctx, null); });
            }
            ul.appendChild(li);
          });
          ctx.legendEl.appendChild(ul);
        });
        ctx.legendEl.hidden = !any;
      };

      /* ---- keyboard: one cursor across the data points ---- */
      if (spec.nav) {
        ctx.plot.tabIndex = 0;
        ctx.plot.setAttribute('role', 'group');
        ctx.plot.setAttribute('aria-roledescription', 'chart');
        var hint = h('span', { class: 'mcp-sr', id: ctx.id + '-hint', text: spec.nav.hint || 'Gunakan tombol panah untuk berpindah data. Enter untuk memilih, Esc untuk keluar.' });
        root.appendChild(hint);
        ctx.plot.setAttribute('aria-describedby', ctx.id + '-sum ' + ctx.id + '-hint');
        ctx.on(ctx.plot, 'keydown', onKey);
        ctx.on(ctx.plot, 'blur', function () { clearNav(); });
      }
      function onKey(e) {
        if (e.target !== ctx.plot) return;
        var n = spec.nav.count(ctx);
        if (!n) return;
        var i = ctx.nav;
        if (spec.nav.key) {
          var r = spec.nav.key(ctx, e, i, n);
          if (isNum(r)) { e.preventDefault(); setNav(clamp(r, 0, n - 1)); return; }
        }
        switch (e.key) {
          case 'ArrowRight': case 'ArrowDown': i = i < 0 ? 0 : Math.min(n - 1, i + 1); break;
          case 'ArrowLeft': case 'ArrowUp': i = i < 0 ? n - 1 : Math.max(0, i - 1); break;
          case 'Home': i = 0; break;
          case 'End': i = n - 1; break;
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
        var f = spec.nav.focus(ctx, i, null);
        if (f) {
          if (f.content) ctx.tip(f.pt, f.content);
          ctx.say(f.text || tipText(f.content));
        }
      }
      function clearNav() {
        if (ctx.nav < 0) return;
        ctx.nav = -1;
        if (spec.nav && spec.nav.blur) spec.nav.blur(ctx);
        ctx.untip();
      }
      ctx.clearNav = clearNav;

      /* ---- accessible data table ---- */
      var foot = null, ttBtn = null, dtBox = null;
      function ensureTable(o) {
        if (!spec.table || o.tableToggle === false) {
          if (foot) foot.hidden = true;
          return;
        }
        if (!foot) {
          foot = h('div', { class: 'mcp__foot' });
          ttBtn = h('button', { type: 'button', class: 'mcp__tt', 'aria-expanded': 'false', 'aria-controls': ctx.id + '-dt', text: 'Lihat tabel' });
          ttBtn.addEventListener('click', function () { showTable(!ctx.tableOn); });
          foot.appendChild(ttBtn);
          dtBox = h('div', { class: 'mcp__dt', id: ctx.id + '-dt', role: 'region', tabindex: '0', hidden: true });
          root.insertBefore(foot, ctx.summaryEl);
          root.insertBefore(dtBox, ctx.summaryEl);
        }
        foot.hidden = false;
        foot.classList.toggle('is-focus-only', o.tableToggle === 'focus');
      }
      function buildTable() {
        if (!dtBox) return;
        var o = ctx.o || ctx.opts();
        var t = null;
        try { t = spec.table(ctx, o); } catch (e) { console.error(e); }
        dtBox.textContent = '';
        dtBox.setAttribute('aria-label', 'Tabel data: ' + (o.label || kind));
        if (!t || !t.rows) return;
        var table = h('table', null, h('caption', { class: 'mcp-sr', text: o.label || ctx.summaryEl.textContent || 'Tabel data' }));
        var trh = h('tr');
        t.columns.forEach(function (c, ci) { trh.appendChild(h('th', { scope: 'col', class: ci > 0 && t.numeric !== false ? 'is-num' : null, text: c })); });
        table.appendChild(h('thead', null, trh));
        var tb = h('tbody');
        t.rows.forEach(function (r) {
          var tr = h('tr');
          r.forEach(function (v, ci) { tr.appendChild(h(ci === 0 ? 'th' : 'td', { scope: ci === 0 ? 'row' : null, class: ci > 0 && t.numeric !== false ? 'is-num' : null, text: v == null ? '—' : String(v) })); });
          tb.appendChild(tr);
        });
        table.appendChild(tb);
        dtBox.appendChild(table);
      }
      function showTable(on) {
        if (!spec.table) return;
        on = on == null ? !ctx.tableOn : !!on;
        ensureTable(assign({}, ctx.o || ctx.opts(), { tableToggle: (ctx.o && ctx.o.tableToggle === false) ? true : (ctx.o && ctx.o.tableToggle) }));
        ctx.tableOn = on;
        if (on) buildTable();
        if (dtBox) dtBox.hidden = !on;
        if (ttBtn) { ttBtn.textContent = on ? 'Sembunyikan tabel' : 'Lihat tabel'; ttBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
      }

      /* ---- render ---- */
      function detectFixed() {
        if (spec.natural) { ctx.fixed = false; return; }
        var was = root.style.display;
        root.style.display = 'none';
        var cs = W.getComputedStyle(el);
        var inner = el.clientHeight - pf(cs.paddingTop) - pf(cs.paddingBottom);
        root.style.display = was;
        ctx.fixed = inner > 40;
      }
      function render(anim) {
        if (ctx.destroyed) return;
        if (!el.getClientRects().length) { ctx.pending = true; return; }
        var o = ctx.opts();
        ctx.o = o;
        ctx.T = reader();
        if (ctx.fixed == null) detectFixed();
        root.classList.toggle('is-fixed', !!ctx.fixed && !o.height);
        root.classList.toggle('is-clickable', typeof o.onClick === 'function');
        ctx.anim = !!anim && o.animate !== false && !reducedMotion();
        ctx.pending = false;
        ensureTable(o);
        try { spec.render(ctx, o); }
        catch (err) { console.error('[MCD.charts.' + kind + ']', err); }
        var sum0 = '';
        try { sum0 = o.ariaLabel || (spec.summary ? spec.summary(ctx, o) : ''); } catch (e) { sum0 = ''; }
        ctx.summaryEl.textContent = sum0;
        if (spec.nav) ctx.plot.setAttribute('aria-label', o.label || sum0 || 'Grafik');
        else if (spec.role !== false) { ctx.plot.setAttribute('role', 'img'); ctx.plot.setAttribute('aria-label', (o.label ? o.label + '. ' : '') + sum0); }
        if (ctx.hl != null && spec.highlight) spec.highlight(ctx, ctx.hl);
        /* no rows, no "Show data table" button */
        if (foot && !foot.hidden) {
          var hasRows = false;
          try { var tt = spec.table(ctx, o); hasRows = !!(tt && tt.rows && tt.rows.length); } catch (e) { hasRows = false; }
          if (!hasRows) { foot.hidden = true; if (dtBox) dtBox.hidden = true; }
          else if (dtBox) dtBox.hidden = !ctx.tableOn;
        }
        if (ctx.tableOn) buildTable();
        if (o.demo != null && MCD.demo && typeof MCD.demo.tag === 'function') {
          /* the CONTOH mark sits in a header row above the plot (or in the card's label row), never inside a plot */
          try {
            if (spec.tagTarget) MCD.demo.tag(spec.tagTarget(ctx), { inline: true, when: !!o.demo });
            else {
              if (!ctx.tagRow) { ctx.tagRow = h('div', { class: 'mcp__tagrow' }); root.insertBefore(ctx.tagRow, root.firstChild); }
              MCD.demo.tag(ctx.tagRow, { inline: true, when: !!o.demo });
            }
          } catch (e) { /* ignore */ }
        }
        ctx.first = false;
        ctx.lastW = el.clientWidth;
        ctx.lastH = el.clientHeight;
      }
      ctx.render = render;

      /* ---- size changes ---- */
      var rafId = 0, ro = null;
      function schedule() {
        if (rafId || ctx.destroyed) return;
        rafId = raf(function () {
          rafId = 0;
          if (ctx.destroyed) return;
          if (ctx.pending) { render(ctx.first); return; }
          var w = el.clientWidth, hh = el.clientHeight;
          if (w === ctx.lastW && (!ctx.fixed || hh === ctx.lastH)) return;
          render(false);
        });
      }
      if ('ResizeObserver' in W) { ro = new W.ResizeObserver(schedule); ro.observe(el); }
      else ctx.on(W, 'resize', schedule);
      if (D.fonts && D.fonts.status !== 'loaded' && D.fonts.ready) {
        D.fonts.ready.then(function () { if (!ctx.destroyed && !ctx.first) render(false); });
      }

      render(true);
      LIVE.push(ctx);

      var handle = {
        el: root,
        kind: kind,
        update: function (d, c) {
          if (ctx.destroyed) return handle;
          if (d != null && typeof d === 'object') ctx.data = assign({}, ctx.data, d);
          if (c && typeof c === 'object') ctx.cfg = assign({}, ctx.cfg, c);
          clearNav();
          ctx.untip();
          render(true);
          return handle;
        },
        highlight: function (key) {
          ctx.hl = key == null ? null : key;
          if (!ctx.destroyed && spec.highlight) spec.highlight(ctx, ctx.hl);
          return handle;
        },
        showTable: function (on) { showTable(on); return handle; },
        resize: function () { render(false); return handle; },
        destroy: function () {
          if (ctx.destroyed) return;
          ctx.destroyed = true;
          if (ro) ro.disconnect();
          if (rafId) caf(rafId);
          ctx.cleanup.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
          if (spec.destroy) { try { spec.destroy(ctx); } catch (e) { /* ignore */ } }
          if (ctx.svg) ctx.svg.selectAll('*').interrupt();
          ctx.untip();
          var i = LIVE.indexOf(ctx);
          if (i >= 0) LIVE.splice(i, 1);
          if (OWNED && OWNED.get(el) === handle) OWNED.delete(el);
          if (root.parentNode) root.parentNode.removeChild(root);
        }
      };
      if (spec.api) assign(handle, spec.api(ctx, handle));
      if (OWNED) OWNED.set(el, handle);
      return handle;
    };
  }

  /** Legend swatch (HTML/SVG, coloured by var(--token) so it follows the theme). */
  function swatch(it) {
    var kind = it.kind || 'box';
    if (kind === 'box' || kind === 'dot') return h('span', { class: 'mcp-sw mcp-sw--' + kind, 'aria-hidden': 'true', style: { background: it.css } });
    var svgN = s('svg', { class: 'mcp-sw mcp-sw--svg', width: 22, height: 12, viewBox: '0 0 22 12', 'aria-hidden': 'true', focusable: 'false' });
    var ln = s('line', { x1: 1, y1: 6, x2: 21, y2: 6, 'stroke-width': kind === 'dash' ? 1.75 : 2.25, 'stroke-linecap': 'round' });
    ln.style.stroke = it.css;
    if (kind === 'dash') ln.setAttribute('stroke-dasharray', '4 3');
    svgN.appendChild(ln);
    if (kind === 'linedot') {
      var c = s('circle', { cx: 11, cy: 6, r: 4, class: 'mcp-sw__dot' });
      c.style.fill = it.dot || it.css;
      svgN.appendChild(c);
    }
    return svgN;
  }

  function normCats(list) {
    return (list || []).map(function (c, i) {
      if (c != null && typeof c === 'object') {
        var key = c.key != null ? c.key : c.id != null ? c.id : c.label != null ? c.label : i;
        return { key: String(key), label: String(c.label != null ? c.label : key), sub: c.sub != null ? String(c.sub) : null };
      }
      return { key: String(c), label: String(c), sub: null };
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 8. combo(el, {categories, bars, line, target, stacked})
   *    Grouped (default) or stacked bars on the left axis + a line on the
   *    right axis. line.status:'coverage' colours each dot by the coverage
   *    bands (green / amber / red) and says so in the legend.
   *    target: number | {value, label?, tag?, axis?: 'left'|'right'}: a gold
   *    dashed line, its value ("25%") in the axis gutter, its words in the legend.
   *    Options: format (bars; 'int'), leftLabel, categoryLabel, barLabels
   *    ('auto' | true | false), lineLabels ('auto' | true | false), tipFoot.
   *    onClick({key, index, category, values, line}, event).
   * ────────────────────────────────────────────────────────────────────── */
  function normSeries(list, n) {
    return (list || []).filter(Boolean).map(function (sr, i) {
      var key = String(sr.key != null ? sr.key : sr.label != null ? sr.label : 's' + i);
      var col = colorSpec(sr.color != null ? sr.color : (toneOf(key) ? key : CYCLE[i % CYCLE.length]));
      var vals = [];
      for (var k = 0; k < n; k++) vals.push(toNum(sr.values ? sr.values[k] : null));
      return { key: key, label: String(sr.label != null ? sr.label : key), values: vals, col: col };
    });
  }
  function normLine(ln, n) {
    if (!ln || !ln.values) return null;
    var vals = [];
    for (var k = 0; k < n; k++) vals.push(toNum(ln.values[k]));
    var fmtSpec = ln.format || 'pct';
    return {
      key: String(ln.key || 'line'), label: String(ln.label || 'Coverage'), values: vals,
      format: fmtSpec, isPct: isPctSpec(fmtSpec), axis: ln.axis === 'left' ? 'left' : 'right',
      status: ln.status === 'coverage' || ln.status === 'ranked' ? ln.status : null, axisLabel: ln.axisLabel || null,
      col: colorSpec(ln.color, 'ink'),
      /* ranked: cut points given ({lo, hi}, e.g. the territory's relative.kecamatan) or computed from the line;
         tones: one status word per point (the map's own band, 'noData' = not ranked) wins over both */
      cut: ln.status === 'ranked' ? (cutsOf(ln.cuts) || rankCuts(vals)) : null,
      tones: Array.isArray(ln.tones) ? ln.tones : null, rankOf: ln.rankOf || null, noneWords: ln.noneWords || null
    };
  }
  /** Status tone of the line's point k: 'ok' | 'mid' | 'bad' | 'none', or null when the line has no status. */
  function lineTone(ln, k) {
    if (!ln || !ln.status) return null;
    var v = ln.values[k];
    if (ln.tones && ln.tones[k] != null) return toneOf(ln.tones[k]) || 'none';
    if (v == null) return 'none';
    return ln.status === 'ranked' ? rankTone(v, ln.cut) : coverageTone(v);
  }
  function lineWords(ln, tone) {
    if (ln.status === 'ranked') return rankWords(tone, { cut: ln.cut, fixed: !ln.cut, of: tone === 'ok' ? ln.rankOf : null, none: ln.noneWords });
    return coverageWords(tone);
  }
  function normTarget(t, ln, f) {
    if (t == null || t === false) return null;
    var o = typeof t === 'object' ? t : { value: t };
    var v = toNum(o.value);
    if (v == null) return null;
    var axis = o.axis === 'left' || o.axis === 'right' ? o.axis : (ln && ln.axis === 'right' ? 'right' : 'left');
    return { value: v, axis: axis, label: o.label || ('Target ' + f(v)), tag: o.tag != null ? String(o.tag) : f(v) };
  }

  var combo = make('combo', {
    svg: true, d3: true, legend: true,
    height: function (ctx, w) { return clamp(Math.round(w * 0.5), 240, 340); },
    render: function (ctx, o) {
      var d3 = W.d3, T = ctx.T;
      var cats = normCats(o.categories);
      var n = cats.length;
      var bars = normSeries(o.bars, n);
      var ln = normLine(o.line, n);
      var stacked = o.stacked === true || o.mode === 'stacked';
      var barSpec = o.format || o.barFormat || 'int';
      var fL = formatter(barSpec);
      var lnRight = !!ln && ln.axis === 'right';
      var fR = ln ? formatter(ln.format) : fL;
      var tgt = normTarget(o.target, ln, (ln && ((o.target && o.target.axis) || ln.axis) === 'right') ? (ln.isPct ? formatter('pct0') : fR) : fL);
      var M = ctx.m = { cats: cats, bars: bars, ln: ln, stacked: stacked, tgt: tgt, fL: fL, fR: fR, lnRight: lnRight, n: n };

      /* legend in words */
      var items = bars.map(function (sr) { return { kind: 'box', css: sr.col.css, label: sr.label, key: sr.key }; });
      if (ln) items.push({ kind: ln.status ? 'linedot' : 'line', css: ln.col.css, dot: ln.status ? cssVar('ink-3') : null, label: ln.label + (lnRight && bars.length ? ' (sumbu kanan)' : ''), key: '__line' });
      if (tgt) items.push({ kind: 'dash', css: cssVar('chart-hl'), label: tgt.label });
      var groups = [{ items: items }];
      if (ln && ln.status === 'coverage') {
        groups.push({ title: 'Warna titik', items: ['ok', 'mid', 'bad'].map(function (t) { return { kind: 'dot', css: cssVar(TONE_TOKEN[t]), label: coverageWords(t) }; }) });
      } else if (ln && ln.status === 'ranked') {
        var anyNone = false;
        for (var q = 0; q < n; q++) if (lineTone(ln, q) === 'none' && ln.values[q] != null) anyNone = true;
        groups.push({ title: o.dotTitle || (ln.cut || ln.tones ? 'Warna titik, dibandingkan antarkecamatan' : 'Warna titik'), items: rankLegend({ cut: ln.cut, of: ln.rankOf, none: anyNone ? (ln.noneWords || 'tidak dinilai') : false })
          .map(function (it) { return { kind: 'dot', css: cssVar(TONE_TOKEN[it.tone]), label: it.label }; }) });
      }
      ctx.legend(o.legend === false ? [] : groups);

      var sz = ctx.size(o);
      if (!sz) return;
      ctx.clearSvg();
      if (!n || (!bars.length && !ln)) { ctx.empty(o.emptyText || 'Belum ada data.'); M.ready = false; return; }
      M.ready = true;
      var w = sz.w, hh = sz.h;

      /* scales */
      var leftVals = [];
      if (bars.length) {
        if (stacked) for (var i = 0; i < n; i++) leftVals.push(sum(bars, function (sr) { var v = sr.values[i]; return v > 0 ? v : 0; }));
        else bars.forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) leftVals.push(v); }); });
      }
      if (ln && !lnRight) ln.values.forEach(function (v) { if (v != null) leftVals.push(v); });
      if (tgt && tgt.axis === 'left') leftVals.push(tgt.value);
      var hasLeft = bars.length > 0 || (ln && !lnRight);
      var maxL = Math.max(0, d3.max(leftVals) || 0);
      var yL = d3.scaleLinear().domain([0, maxL > 0 ? maxL : 1]).nice(4);
      var intL = barSpec === 'int' || barSpec === 'num';
      var ticksL = yL.ticks(4).filter(function (t) { return !intL || Math.abs(t - Math.round(t)) < 1e-9; });
      var yR = null, ticksR = [];
      if (lnRight) {
        var rv = ln.values.filter(isNum);
        if (tgt && tgt.axis === 'right') rv.push(tgt.value);
        var maxR = Math.max(0, d3.max(rv) || 0);
        yR = d3.scaleLinear().domain([0, maxR > 0 ? maxR * 1.12 : 1]).nice(4);
        if (ln.isPct && maxR <= 1 && yR.domain()[1] > 1) yR.domain([0, 1]);
        ticksR = yR.ticks(4);
      }
      var axL = axisFormatter(lnRight || !ln ? barSpec : (bars.length ? barSpec : ln.format), ticksL);
      var axR = ln ? axisFormatter(ln.format, ticksR) : null;

      /* margins */
      var fAx = font(T, 'sans', 12), fCat = font(T, 'sans', 12, 500), fVal = font(T, 'sans', 12, 500);
      var labL = hasLeft ? ticksL.map(axL) : [];
      var labR = lnRight ? ticksR.map(axR) : [];
      /* the target value sits in the axis gutter (gold), its words in the legend */
      var tgtSide = tgt ? (tgt.axis === 'right' && lnRight ? 'right' : 'left') : null;
      if (tgtSide === 'right') labR = labR.concat(tgt.tag);
      else if (tgtSide === 'left') labL = labL.concat(tgt.tag);
      var capL = o.leftLabel || null, capR = ln && lnRight ? ln.axisLabel : null;
      var m = { t: (capL || capR) ? 28 : 20, r: lnRight ? Math.ceil(maxW(labR, fAx)) + 12 : 10, l: hasLeft ? Math.ceil(maxW(labL, fAx)) + 12 : 10, b: 24 };
      var pw = Math.max(40, w - m.l - m.r);
      var keys = cats.map(function (c) { return c.key; });
      var x0 = d3.scaleBand().domain(keys).range([0, pw]).paddingInner(n > 1 ? 0.28 : 0).paddingOuter(0.12);
      var labs = cats.map(function (c) { return c.label; });
      var maxLab = maxW(labs, fCat);
      var mode = 'flat', wrapped = null, ANGD = 38, ANG = 38 * Math.PI / 180, ROTMAX = 128, every = 1;
      if (maxLab > x0.step() - 6) {
        wrapped = labs.map(function (l) { return textW(l, fCat) <= x0.step() - 6 ? [l] : wrap2(l, x0.step() - 6, fCat); });
        mode = wrapped.every(Boolean) ? 'wrap' : 'rot';
      }
      if (mode === 'wrap') m.b = 40;
      else if (mode === 'rot') {
        /* steeper when the categories are close, so rotated labels keep 15 px between lines */
        var rw = Math.min(ROTMAX, maxLab);
        var fitAngle = function () {
          var stp0 = x0.step();
          ANGD = stp0 > 15 ? clamp(Math.ceil(Math.asin(Math.min(1, 15 / stp0)) * 180 / Math.PI), 38, 90) : 90;
          every = stp0 < 15 ? Math.ceil(15 / Math.max(1, stp0)) : 1;
          ANG = ANGD * Math.PI / 180;
          m.b = Math.ceil(rw * Math.sin(ANG) + 12 * Math.cos(ANG) + 16);
        };
        fitAngle();
        var over = rw * Math.cos(ANG) - (m.l + x0(keys[0]) + x0.bandwidth() / 2) + 4;
        /* room for the first label on the left narrows the bands: fit the angle again to the new step */
        if (over > 0) { m.l += Math.ceil(over); pw = Math.max(40, w - m.l - m.r); x0.range([0, pw]); fitAngle(); }
      }
      var ph = Math.max(40, hh - m.t - m.b);
      /* a short plot (phones, long rotated names) keeps at least 18 px between axis labels */
      var maxTicks = Math.max(2, Math.floor(ph / 18) + 1);
      var thin = function (ts) {
        if (ts.length <= maxTicks) return ts;
        var nth = Math.ceil((ts.length - 1) / (maxTicks - 1));
        return ts.filter(function (t, k) { return k % nth === 0; });
      };
      if (ticksL.length > maxTicks) { ticksL = thin(ticksL); labL = hasLeft ? ticksL.map(axL) : []; }
      if (ticksR.length > maxTicks) { ticksR = thin(ticksR); labR = lnRight ? ticksR.map(axR) : []; }
      yL.range([ph, 0]);
      if (yR) yR.range([ph, 0]);
      var step = x0.step(), bw0 = x0.bandwidth();
      assign(M, { x0: x0, yL: yL, yR: yR, step: step, bw0: bw0, m: m, ph: ph, pw: pw, keys: keys });

      var g = ctx.g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      var anim = ctx.anim, dur = 650, stg = Math.min(45, 420 / Math.max(1, n));
      var prev = ctx.prev || {};
      var pb = prev.bars || {};
      var next = { bars: {}, line: null };

      /* grid and axes */
      var gridScale = hasLeft ? yL : yR, gridTicks = hasLeft ? ticksL : ticksR;
      var gg = g.append('g').attr('class', 'mcp-grid');
      gridTicks.forEach(function (t) { if (t > 0) gg.append('line').attr('x1', 0).attr('x2', pw).attr('y1', crisp(gridScale(t))).attr('y2', crisp(gridScale(t))); });
      g.append('line').attr('class', 'mcp-base').attr('x1', 0).attr('x2', pw).attr('y1', crisp(ph)).attr('y2', crisp(ph));
      var tgtY = tgt ? (tgtSide === 'right' ? yR : yL)(tgt.value) : null;
      var nearTgt = function (side, y) { return tgtSide === side && Math.abs(y - tgtY) < 13; };
      if (hasLeft) ticksL.forEach(function (t, k) { if (!nearTgt('left', yL(t))) g.append('text').attr('class', 'mcp-t mcp-t--axis').attr('x', -8).attr('y', yL(t)).attr('dy', '0.35em').attr('text-anchor', 'end').text(labL[k]); });
      if (lnRight) ticksR.forEach(function (t, k) { if (!nearTgt('right', yR(t))) g.append('text').attr('class', 'mcp-t mcp-t--axis').attr('x', pw + 8).attr('y', yR(t)).attr('dy', '0.35em').attr('text-anchor', 'start').text(labR[k]); });
      if (capL) g.append('text').attr('class', 'mcp-t mcp-t--cap').attr('x', -m.l + 2).attr('y', -16).attr('text-anchor', 'start').text(capL);
      if (capR) g.append('text').attr('class', 'mcp-t mcp-t--cap').attr('x', pw + m.r - 2).attr('y', -16).attr('text-anchor', 'end').text(capR);

      M.band = g.append('rect').attr('class', 'mcp-band').attr('y', -8).attr('height', ph + 8).attr('rx', 4).attr('opacity', 0);

      /* bars */
      var nb = bars.length;
      var sbw = Math.min(bw0, 56), sOff = (bw0 - sbw) / 2;
      var gap = nb > 1 ? clamp(bw0 * 0.06, 1, 4) : 0;
      var gbw = nb ? (bw0 - gap * (nb - 1)) / nb : 0;
      if (gbw > 40) gbw = 40;
      var gw = gbw * nb + gap * (nb - 1), gOff = (bw0 - gw) / 2;
      var gb = g.append('g').attr('class', 'mcp-bars');
      var barTops = [], segLabels = [], topLabels = [];
      cats.forEach(function (c, ci) {
        var gc = gb.append('g').attr('class', 'mcp-cat mcp-mark').attr('data-c', c.key);
        var acc = 0, top = null;
        bars.forEach(function (sr, j) {
          var v = sr.values[ci];
          if (v == null) return;
          var y0, y1, x, bw;
          if (stacked) { if (!(v > 0)) return; y0 = acc; y1 = acc + v; acc = y1; x = x0(c.key) + sOff; bw = sbw; }
          else { y0 = 0; y1 = Math.max(0, v); x = x0(c.key) + gOff + j * (gbw + gap); bw = gbw; }
          var key = c.key + '\u0001' + sr.key;
          var p = pb[key] || { y0: stacked ? 0 : 0, y1: 0 };
          var sep = stacked && y0 > 0 ? 1.5 : 0;
          var r = gc.append('rect').attr('class', 'mcp-bar mcp-mark').attr('data-k', sr.key).attr('data-c', c.key)
            .attr('x', x).attr('width', Math.max(0.5, bw)).attr('rx', Math.min(2.5, bw / 4)).style('fill', sr.col.css);
          var geo = function (sel, a0, a1) { return sel.attr('y', yL(a1)).attr('height', Math.max(0, yL(a0) - yL(a1) - sep)); };
          if (anim) geo(geo(r, p.y0, p.y1).transition().duration(dur).delay(ci * stg).ease(d3.easeCubicOut), y0, y1);
          else geo(r, y0, y1);
          next.bars[key] = { y0: y0, y1: y1 };
          if (stacked) segLabels.push({ x: x + bw / 2, y: (yL(y0) + yL(y1)) / 2, hgt: yL(y0) - yL(y1), bw: bw, v: v, sr: sr, ci: ci });
          else topLabels.push({ x: x + bw / 2, y: yL(y1), bw: bw, v: v, ci: ci });
          top = top == null ? yL(y1) : Math.min(top, yL(y1));
        });
        if (stacked && acc > 0) topLabels.push({ x: x0(c.key) + bw0 / 2, y: yL(acc), bw: sbw, v: acc, ci: ci });
        barTops[ci] = top;
      });

      /* bar value labels: all or none, so the chart stays even */
      var showBL = false;
      if (o.barLabels !== false && topLabels.length) {
        var need = maxW(topLabels.map(function (q) { return fL(q.v); }), fVal);
        showBL = o.barLabels === true || need <= (stacked ? sbw + 14 : gbw + 8);
      }
      var gl = g.append('g').attr('class', 'mcp-labels');
      var barLabelY = [], segNodes = [];
      if (showBL) {
        topLabels.forEach(function (q) {
          var t = gl.append('text').attr('class', 'mcp-t mcp-t--val mcp-t--halo').attr('x', q.x).attr('y', q.y - 5).attr('text-anchor', 'middle').text(fL(q.v));
          if (anim) t.attr('opacity', 0).transition().delay(dur * 0.7 + q.ci * stg).duration(260).attr('opacity', 1);
          barLabelY[q.ci] = Math.min(barLabelY[q.ci] == null ? Infinity : barLabelY[q.ci], q.y - 5);
        });
      }
      if (stacked && bars.length > 1 && o.segmentLabels !== false) {
        segLabels.forEach(function (q) {
          var txt = fL(q.v);
          if (q.hgt < 17 || textW(txt, fVal) > q.bw - 6) return;
          var t = gl.append('text').attr('class', 'mcp-t mcp-t--val').attr('x', q.x).attr('y', q.y).attr('dy', '0.35em').attr('text-anchor', 'middle').text(txt);
          segNodes.push({ ci: q.ci, y: q.y, node: t });
          if (q.sr.col.tone) t.style('fill', cssVar('status-ink'));
          else t.style('fill', inkOn(T, resolve(T, q.sr.col)));
          if (anim) t.attr('opacity', 0).transition().delay(dur * 0.8).duration(260).attr('opacity', 1);
        });
      }

      /* target */
      if (tgt) {
        g.append('line').attr('class', 'mcp-target').attr('x1', 0).attr('x2', pw).attr('y1', crisp(tgtY)).attr('y2', crisp(tgtY));
        g.append('text').attr('class', 'mcp-t mcp-t--hl mcp-t--tag').attr('x', tgtSide === 'right' ? pw + 8 : -8).attr('y', tgtY).attr('dy', '0.35em')
          .attr('text-anchor', tgtSide === 'right' ? 'start' : 'end').text(tgt.tag);
      }

      /* line + dots + labels */
      M.dots = [];
      if (ln) {
        var yS = lnRight ? yR : yL;
        var cx = function (k) { return x0(keys[k]) + bw0 / 2; };
        var pts = ln.values.map(function (v, k) { return v == null ? null : [cx(k), yS(v), v, k]; });
        var lineGen = d3.line().defined(function (d) { return d != null; }).x(function (d) { return d[0]; }).y(function (d) { return d[1]; });
        var path = g.append('path').attr('class', 'mcp-line mcp-mark').attr('data-k', '__line').style('stroke', ln.col.css).attr('d', lineGen(pts));
        var pl = prev.line && prev.line.length === n ? prev.line : null;
        if (anim) {
          if (pl) {
            var from = pts.map(function (p, k) { return p && pl[k] != null ? [p[0], yS(pl[k])] : p; });
            path.attr('d', lineGen(from)).transition().duration(dur).ease(d3.easeCubicOut).attr('d', lineGen(pts));
          } else {
            var L = path.node().getTotalLength ? path.node().getTotalLength() : 0;
            if (L > 0) {
              path.attr('stroke-dasharray', L + ' ' + L).attr('stroke-dashoffset', L)
                .transition().delay(dur * 0.45).duration(700).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0)
                .on('end', function () { d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null); });
            }
          }
        }
        var gd = g.append('g').attr('class', 'mcp-dots');
        var fLL = font(T, 'sans', 12, 500);
        var llTexts = pts.map(function (p) { return p ? formatter(ln.format)(p[2]) : ''; });
        var showLL = o.lineLabels !== false && (o.lineLabels === true || maxW(llTexts, fLL) + 6 <= step);
        /* a segment value under the line's dot or label gives way to the line */
        var clearSeg = function (k, y, gapY) { segNodes.forEach(function (sn) { if (sn.ci === k && sn.node && Math.abs(sn.y - y) < gapY) { sn.node.remove(); sn.node = null; } }); };
        pts.forEach(function (p, k) {
          if (!p) { M.dots[k] = null; return; }
          clearSeg(k, p[1], 12);
          var tone = lineTone(ln, k);
          var dot = gd.append('circle').attr('class', 'mcp-dot mcp-mark').attr('data-c', keys[k]).attr('cx', p[0]).attr('r', 5)
            .style('fill', tone ? cssVar(TONE_TOKEN[tone]) : ln.col.css);
          if (anim) {
            if (pl && pl[k] != null) dot.attr('cy', yS(pl[k])).transition().duration(dur).ease(d3.easeCubicOut).attr('cy', p[1]);
            else dot.attr('cy', p[1]).attr('r', 0).transition().delay(dur * 0.45 + k * 35).duration(320).ease(d3.easeBackOut).attr('r', 5);
          } else dot.attr('cy', p[1]);
          M.dots[k] = dot;
          if (showLL) {
            var ly = p[1] - 11;
            var bl = barLabelY[k];
            if ((bl != null && Math.abs(ly - bl) < 13) || ly < -m.t + 12) ly = p[1] + 20;
            if (ly > ph - 2 && p[1] - 11 >= -m.t + 12) ly = p[1] - 11;
            clearSeg(k, ly - 4, 14);
            var t = gl.append('text').attr('class', 'mcp-t mcp-t--val mcp-t--strong mcp-t--halo').attr('x', p[0]).attr('y', ly).attr('text-anchor', 'middle').text(llTexts[k]);
            if (anim) t.attr('opacity', 0).transition().delay(dur + 200).duration(260).attr('opacity', 1);
          }
        });
        next.line = ln.values.slice();
      }

      /* category labels */
      var gx = g.append('g').attr('class', 'mcp-xlabels');
      cats.forEach(function (c, k) {
        var cxk = x0(c.key) + bw0 / 2;
        var t = gx.append('text').attr('class', 'mcp-t mcp-t--cat').attr('data-c', c.key);
        if (mode === 'flat') t.attr('x', cxk).attr('y', ph + 17).attr('text-anchor', 'middle').text(c.label);
        else if (mode === 'wrap') {
          var lines = wrapped[k];
          t.attr('x', cxk).attr('y', ph + 17).attr('text-anchor', 'middle');
          lines.forEach(function (l, li) { t.append('tspan').attr('x', cxk).attr('dy', li ? 14 : 0).text(l); });
        } else {
          if (k % every) { t.remove(); return; }
          t.attr('x', cxk).attr('y', ph + 14).attr('text-anchor', 'end').attr('transform', 'rotate(-' + ANGD + ',' + cxk + ',' + (ph + 14) + ')').text(fit(c.label, ROTMAX, fCat));
          if (ANGD > 60) t.attr('dy', '0.35em');
        }
      });

      /* hit areas on top: hover, touch and click */
      var hits = g.append('g').attr('class', 'mcp-hits');
      M.hits = [];
      cats.forEach(function (c, k) {
        var r = hits.append('rect').attr('class', 'mcp-hit').attr('x', x0(c.key) - (step - bw0) / 2).attr('width', step).attr('y', -8).attr('height', ph + m.b);
        r.on('pointerenter pointermove', function (ev) { var f = comboFocus(ctx, k); if (f) ctx.tip(ctx.evPt(ev, this), f.content); })
          .on('pointerleave', function () { comboBlur(ctx); })
          .on('click', function (ev) { ctx.click(comboPayload(ctx, k), ev); });
        M.hits[k] = r.node();
      });
      ctx.prev = next;
    },
    legendHover: function (ctx, key) {
      if (!ctx.m || !ctx.m.ready) return;
      ctx.g.selectAll('.mcp-bar, .mcp-line').classed('mcp-dim', function () { return key != null && this.getAttribute('data-k') !== key; });
      ctx.g.selectAll('.mcp-dot').classed('mcp-dim', key != null && key !== '__line');
    },
    highlight: function (ctx, key) { comboDim(ctx, key); },
    summary: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.n) return (o.label ? o.label + ': ' : '') + 'belum ada data.';
      var parts = [];
      if (M.bars.length) parts.push((M.stacked ? 'Batang bertumpuk: ' : 'Batang: ') + M.bars.map(function (b) { return b.label; }).join(', '));
      if (M.ln) {
        parts.push('garis: ' + M.ln.label);
        var best = null, worst = null;
        M.ln.values.forEach(function (v, i) {
          if (v == null) return;
          if (!best || v > best.v) best = { v: v, i: i };
          if (!worst || v < worst.v) worst = { v: v, i: i };
        });
        var fl = formatter(M.ln.format);
        if (best) parts.push('tertinggi ' + M.cats[best.i].label + ' ' + fl(best.v));
        if (worst && worst.i !== best.i) parts.push('terendah ' + M.cats[worst.i].label + ' ' + fl(worst.v));
      }
      if (M.tgt) parts.push(M.tgt.label);
      return (o.label ? o.label + '. ' : '') + M.n + ' kategori. ' + parts.join(', ') + '.';
    },
    table: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.n) return null;
      var cols = [o.categoryLabel || 'Kategori'].concat(M.bars.map(function (b) { return b.label; }));
      if (M.stacked && M.bars.length > 1) cols.push('Total');
      if (M.ln) cols.push(M.ln.label);
      if (M.ln && M.ln.status) cols.push('Status');
      var fl = M.ln ? formatter(M.ln.format) : null;
      return {
        columns: cols,
        rows: M.cats.map(function (c, i) {
          var r = [c.label].concat(M.bars.map(function (b) { return b.values[i] == null ? null : M.fL(b.values[i]); }));
          if (M.stacked && M.bars.length > 1) r.push(M.fL(sum(M.bars, function (b) { return b.values[i]; })));
          if (M.ln) r.push(M.ln.values[i] == null ? null : fl(M.ln.values[i]));
          if (M.ln && M.ln.status) r.push(lineWords(M.ln, lineTone(M.ln, i)));
          return r;
        })
      };
    },
    nav: {
      count: function (ctx) { return ctx.m && ctx.m.ready ? ctx.m.n : 0; },
      focus: function (ctx, i) {
        var f = comboFocus(ctx, i);
        if (!f) return null;
        f.pt = ctx.ptOf(ctx.m.hits[i], 'mid');
        return f;
      },
      blur: function (ctx) { comboBlur(ctx); },
      activate: function (ctx, i, e) { ctx.click(comboPayload(ctx, i), e); },
      hint: 'Gunakan tombol panah kiri dan kanan untuk berpindah kategori. Enter untuk memilih, Esc untuk keluar.'
    }
  });
  function comboPayload(ctx, i) {
    var M = ctx.m, c = M.cats[i], vals = {};
    M.bars.forEach(function (b) { vals[b.key] = b.values[i]; });
    return { key: c.key, index: i, category: c.label, values: vals, line: M.ln ? M.ln.values[i] : null };
  }
  function comboDim(ctx, key) {
    if (!ctx.m || !ctx.m.ready) return;
    ctx.g.selectAll('.mcp-cat, .mcp-dot').classed('mcp-dim', function () { return key != null && this.getAttribute('data-c') !== String(key); });
  }
  function comboFocus(ctx, i) {
    var M = ctx.m;
    if (!M || !M.ready || !M.cats[i]) return null;
    var c = M.cats[i], T = ctx.T;
    M.band.attr('x', M.x0(c.key) - (M.step - M.bw0) / 2 + 2).attr('width', Math.max(0, M.step - 4)).attr('opacity', 1);
    comboDim(ctx, c.key);
    (M.dots || []).forEach(function (d, k) { if (d) d.classed('is-on', k === i); });
    ctx.g.selectAll('.mcp-xlabels text').classed('is-on', function () { return this.getAttribute('data-c') === c.key; });
    var rows = [];
    M.bars.forEach(function (b) {
      var v = b.values[i];
      rows.push({ color: resolve(T, b.col), shape: 'square', label: b.label, value: v == null ? 'Tidak ada data' : M.fL(v) });
    });
    if (M.stacked && M.bars.length > 1) rows.push({ label: 'Total', value: M.fL(sum(M.bars, function (b) { return b.values[i]; })), strong: true });
    if (M.ln) {
      var lv = M.ln.values[i];
      var tone = lineTone(M.ln, i);
      rows.push({ color: tone ? T(TONE_TOKEN[tone]) : resolve(T, M.ln.col), shape: 'circle', label: M.ln.label, value: lv == null ? 'Tidak ada data' : M.fR(lv), strong: true });
      if (tone) rows.push({ label: M.ln.status === 'ranked' ? 'Peringkat' : 'Status', value: lineWords(M.ln, tone), muted: true });
      if (M.tgt && lv != null && M.tgt.axis === M.ln.axis) rows.push({ label: 'Selisih dari target', value: gapText(lv - M.tgt.value, M.ln.isPct, M.fR), muted: true });
    }
    var content = { eyebrow: ctx.o.categoryLabel || null, head: c.label, rows: rows, foot: ctx.o.tipFoot || null };
    ctx.hover({ key: c.key, index: i, category: c.label });
    return { content: content };
  }
  function comboBlur(ctx) {
    var M = ctx.m;
    if (M && M.ready) {
      M.band.attr('opacity', 0);
      (M.dots || []).forEach(function (d) { if (d) d.classed('is-on', false); });
      ctx.g.selectAll('.mcp-xlabels text').classed('is-on', false);
      comboDim(ctx, ctx.hl);
    }
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 9. donut(el, {slices, centerLabel, centerValue}) and pie(el, {slices})
   *    Outside labels with leader lines ("Label" / "34.5% · 1,204"); when
   *    the box is too narrow, a legend list in words goes under the chart.
   *    Hover lifts a slice (the donut centre shows its share); click selects
   *    it and calls onClick({key, label, value, share, index, selected}).
   *    Options: format ('int'), innerRatio (0.6), labels ('outside' |
   *    'legend' | 'none'), minLabelShare (0.015), selected (key), maxRadius.
   * ────────────────────────────────────────────────────────────────────── */
  function normSlices(list) {
    return (list || []).filter(Boolean).map(function (sl, i) {
      var key = String(sl.key != null ? sl.key : sl.label != null ? sl.label : i);
      var v = toNum(sl.value);
      return {
        key: key, label: String(sl.label != null ? sl.label : key), value: v != null && v > 0 ? v : 0, index: i,
        col: colorSpec(sl.color != null ? sl.color : (toneOf(key) ? key : DONUT_CYCLE[i % DONUT_CYCLE.length])), note: sl.note || null
      };
    });
  }
  function makeDonut(kind) {
    var isPie = kind === 'pie';
    return make(kind, {
      svg: true, d3: true, legend: false,
      height: function (ctx, w) { return clamp(Math.round(w * 0.6), 220, 320); },
      render: function (ctx, o) {
        var d3 = W.d3, T = ctx.T;
        var inner = isPie ? 0 : clamp(o.innerRatio != null ? +o.innerRatio : 0.6, 0.3, 0.85);
        var slices = normSlices(o.slices);
        var total = sum(slices, function (q) { return q.value; });
        var fV = formatter(o.format || 'int');
        var minShare = o.minLabelShare != null ? +o.minLabelShare : 0.015;
        if (o.selected !== undefined && o.selected !== ctx._selCfg) { ctx._selCfg = o.selected; ctx.sel = o.selected == null ? null : String(o.selected); }
        var vis = slices.filter(function (q) { return q.value > 0; });
        vis.forEach(function (q) { q.share = q.value / total; q.l2 = fmtPct(q.share, 1) + ' · ' + fV(q.value); });
        var M = ctx.m = { slices: slices, vis: vis, total: total, fV: fV, inner: inner, ready: false };
        if (ctx.sel != null && !vis.some(function (q) { return q.key === ctx.sel; })) ctx.sel = null;

        var sz = ctx.size(o);
        if (!sz) return;
        ctx.clearSvg();
        var w = sz.w, hh = sz.h;
        var pie = d3.pie().sort(null).value(function (q) { return q.value; }).padAngle(isPie || vis.length < 2 ? 0 : 0.012);
        var arcs = pie(vis);
        var fl = font(T, 'sans', 12, 500), fs = font(T, 'sans', 12);
        var need = 0;
        vis.forEach(function (q) { need = Math.max(need, Math.min(150, Math.max(textW(q.label, fl), textW(q.l2, fs)))); });
        var mode = o.labels === 'legend' || o.labels === 'none' ? o.labels : 'outside';
        var maxR = o.maxRadius || 150;
        var r = Math.min(hh / 2 - 18, w / 2 - 36 - need, maxR);
        if (mode === 'outside') {
          var perSide = { '1': 0, '-1': 0 };
          arcs.forEach(function (a) { if (a.data.share >= minShare) perSide[Math.sin((a.startAngle + a.endAngle) / 2) >= 0 ? '1' : '-1'] += 1; });
          if (r < (o.minRadius || 60) || Math.max(perSide['1'], perSide['-1']) * 31 > hh - 20) mode = 'legend';
        }
        /* legend list under the chart (narrow boxes or labels:'legend') */
        ctx.belowEl.textContent = '';
        ctx.belowEl.hidden = mode !== 'legend' || !vis.length;
        if (mode === 'legend' && vis.length) {
          var ul = h('ul', { class: 'mcp-dl', 'aria-hidden': 'true' });
          M.dl = [];
          arcs.forEach(function (a, i) {
            var q = a.data;
            var li = h('li', { class: 'mcp-dl__i', 'data-k': q.key }, [
              h('span', { class: 'mcp-sw mcp-sw--box', style: { background: q.col.css } }),
              h('span', { class: 'mcp-dl__l', text: q.label }),
              h('span', { class: 'mcp-dl__p', text: fmtPct(q.share, 1) }),
              h('span', { class: 'mcp-dl__v', text: fV(q.value) })
            ]);
            li.addEventListener('mouseenter', function () { var f = donutFocus(ctx, i); if (f) ctx.tip(ctx.ptOf(li, 'top'), f.content); });
            li.addEventListener('mouseleave', function () { donutBlur(ctx); });
            li.addEventListener('click', function (ev) { donutClick(ctx, i, ev); });
            ul.appendChild(li);
            M.dl[i] = li;
          });
          ctx.belowEl.appendChild(ul);
          sz = ctx.size(o);
          if (!sz) return;
          w = sz.w; hh = sz.h;
        }
        if (mode !== 'outside') r = Math.min(hh / 2 - 8, w / 2 - 8, mode === 'legend' ? Math.min(maxR, 130) : maxR);
        r = Math.max(24, r);
        var ir = r * inner;
        var cxp = w / 2, cyp = hh / 2;
        var g = ctx.g.attr('transform', 'translate(' + cxp + ',' + cyp + ')');
        assign(M, { r: r, ir: ir, arcs: arcs, mode: mode, w: w, h: hh, ready: true });

        if (!vis.length) {
          g.append('circle').attr('class', 'mcp-ring-empty').attr('r', r - (isPie ? 0 : (r - ir) / 2)).style('stroke-width', isPie ? 0 : (r - ir)).style('fill', isPie ? cssVar('status-none-a20') : 'none');
          g.append('text').attr('class', 'mcp-t mcp-t--center-l').attr('text-anchor', 'middle').attr('dy', '0.35em').text(o.emptyText || 'Belum ada data');
          M.ready = false;
          return;
        }

        var arcGen = d3.arc().innerRadius(ir).outerRadius(r).cornerRadius(isPie ? 0 : 2);
        var anim = ctx.anim, prev = ctx.prev || {};
        var gs = g.append('g').attr('class', 'mcp-slices');
        M.paths = [];
        M.groups = [];
        arcs.forEach(function (a, i) {
          var q = a.data;
          var sg = gs.append('g').attr('class', 'mcp-slice mcp-mark').attr('data-k', q.key);
          var p = sg.append('path').attr('class', 'mcp-arc' + (isPie ? ' mcp-arc--pie' : '')).style('fill', q.col.css).attr('d', arcGen(a));
          p.on('pointerenter pointermove', function (ev) { var f = donutFocus(ctx, i); if (f) ctx.tip(ctx.evPt(ev, this), f.content); })
            .on('pointerleave', function () { donutBlur(ctx); })
            .on('click', function (ev) { donutClick(ctx, i, ev); });
          M.paths[i] = p;
          M.groups[i] = sg;
        });
        if (anim) {
          var pa = prev.angles;
          if (pa) {
            arcs.forEach(function (a, i) {
              var was = pa[a.data.key] || { startAngle: a.startAngle, endAngle: a.startAngle };
              var ip = d3.interpolate({ startAngle: was.startAngle, endAngle: was.endAngle }, { startAngle: a.startAngle, endAngle: a.endAngle });
              M.paths[i].attr('d', arcGen(assign({}, a, ip(0)))).transition().duration(650).ease(d3.easeCubicOut)
                .attrTween('d', function () { return function (t) { return arcGen(assign({}, a, ip(t))); }; });
            });
          } else {
            var TAU = Math.PI * 2;
            var sweep = function (t) {
              var lim = t * TAU;
              arcs.forEach(function (a, i) {
                var sa = Math.min(a.startAngle, lim), ea = Math.min(a.endAngle, lim);
                M.paths[i].attr('d', ea > sa ? arcGen(assign({}, a, { startAngle: sa, endAngle: ea })) : null);
              });
            };
            sweep(0);
            g.transition().duration(850).ease(d3.easeCubicInOut).tween('mcp-sweep', function () { return sweep; })
              .on('interrupt', function () { sweep(1); });
          }
        }
        var angles = {};
        arcs.forEach(function (a) { angles[a.data.key] = { startAngle: a.startAngle, endAngle: a.endAngle }; });
        ctx.prev = { angles: angles };

        /* outside labels with leader lines */
        M.labels = [];
        if (mode === 'outside') {
          var lab = [];
          arcs.forEach(function (a, i) {
            var q = a.data;
            if (q.share < minShare) return;
            var mid = (a.startAngle + a.endAngle) / 2, sx = Math.sin(mid), sy = -Math.cos(mid);
            lab.push({ i: i, q: q, side: sx >= 0 ? 1 : -1, sx: sx, sy: sy, y: sy * (r + 14) });
          });
          [1, -1].forEach(function (side) {
            var L = lab.filter(function (q) { return q.side === side; }).sort(function (p, q) { return p.y - q.y; });
            var gapY = 31, top = -hh / 2 + 16, bot = hh / 2 - 18;
            var k;
            for (k = 0; k < L.length; k++) {
              if (L[k].y < top) L[k].y = top;
              if (k > 0) L[k].y = Math.max(L[k].y, L[k - 1].y + gapY);
            }
            if (L.length && L[L.length - 1].y > bot) {
              L[L.length - 1].y = bot;
              for (k = L.length - 2; k >= 0; k--) L[k].y = Math.min(L[k].y, L[k + 1].y - gapY);
            }
          });
          var gLab = g.append('g').attr('class', 'mcp-dlabels');
          var maxTextW = w / 2 - (r + 30) - 4;
          lab.forEach(function (q) {
            var lg = gLab.append('g').attr('class', 'mcp-dlabel mcp-mark').attr('data-k', q.q.key);
            var ax = q.sx * (r + 3), ay = q.sy * (r + 3);
            var ex = q.sx * (r + 12), endX = q.side * (r + 24);
            lg.append('polyline').attr('class', 'mcp-leader').attr('points', [ax, ay, ex, q.y, endX, q.y].map(function (v) { return v.toFixed(1); }).join(' '));
            lg.append('circle').attr('class', 'mcp-leader-dot').attr('cx', ax).attr('cy', ay).attr('r', 2);
            var tx = q.side * (r + 28), anchor = q.side > 0 ? 'start' : 'end';
            lg.append('text').attr('class', 'mcp-t mcp-t--dl').attr('x', tx).attr('y', q.y - 2).attr('text-anchor', anchor).text(fit(q.q.label, maxTextW, fl));
            lg.append('text').attr('class', 'mcp-t mcp-t--dl2').attr('x', tx).attr('y', q.y + 12).attr('text-anchor', anchor).text(fit(q.q.l2, maxTextW, fs));
            lg.append('rect').attr('class', 'mcp-hit').attr('x', q.side > 0 ? tx - 4 : tx - Math.min(maxTextW, need) - 4).attr('y', q.y - 15).attr('width', Math.min(maxTextW, need) + 8).attr('height', 32)
              .on('pointerenter', function (ev) { var f = donutFocus(ctx, q.i); if (f) ctx.tip(ctx.evPt(ev, this), f.content); })
              .on('pointerleave', function () { donutBlur(ctx); })
              .on('click', function (ev) { donutClick(ctx, q.i, ev); });
            if (anim) lg.attr('opacity', 0).transition().delay(ctx.prev && prev.angles ? 0 : 650).duration(300).attr('opacity', 1);
            M.labels[q.i] = lg;
          });
        }

        /* centre (donut only) */
        if (!isPie) {
          var cg = g.append('g').attr('class', 'mcp-center').attr('aria-hidden', 'true');
          M.cVal = cg.append('text').attr('class', 'mcp-t mcp-t--center').attr('text-anchor', 'middle');
          M.cLab = cg.append('text').attr('class', 'mcp-t mcp-t--center-l').attr('text-anchor', 'middle');
          M.center = {
            value: o.centerValue != null ? (isNum(o.centerValue) ? fV(o.centerValue) : String(o.centerValue)) : fV(total),
            label: o.centerLabel != null ? String(o.centerLabel) : 'Total'
          };
          setCenter(ctx, M.center.value, M.center.label);
        }
        applySelection(ctx);
      },
      highlight: function (ctx, key) {
        var M = ctx.m;
        if (!M || !M.ready) return;
        ctx.g.selectAll('.mcp-slice, .mcp-dlabel').classed('mcp-dim', function () { return key != null && this.getAttribute('data-k') !== String(key); });
      },
      summary: function (ctx, o) {
        var M = ctx.m;
        if (!M || !M.vis || !M.vis.length) return (o.label ? o.label + ': ' : '') + 'belum ada data.';
        var top = M.vis.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 4);
        return (o.label ? o.label + '. ' : '') + 'Grafik donat, total ' + M.fV(M.total) + '. ' +
          top.map(function (q) { return q.label + ' ' + fmtPct(q.share, 1) + ' (' + M.fV(q.value) + ')'; }).join('; ') +
          (M.vis.length > top.length ? ', serta ' + (M.vis.length - top.length) + ' lainnya' : '') + '.';
      },
      table: function (ctx, o) {
        var M = ctx.m;
        if (!M || !M.slices) return null;
        return {
          columns: [o.categoryLabel || 'Bagian', o.valueLabel || 'Jumlah', 'Porsi'],
          rows: M.slices.map(function (q) { return [q.label, M.fV(q.value), M.total > 0 ? fmtPct(q.value / M.total, 1) : null]; })
        };
      },
      nav: {
        count: function (ctx) { return ctx.m && ctx.m.ready ? ctx.m.arcs.length : 0; },
        focus: function (ctx, i) {
          var f = donutFocus(ctx, i);
          if (!f) return null;
          var node = ctx.m.labels[i] ? ctx.m.labels[i].node() : ctx.m.paths[i].node();
          f.pt = ctx.ptOf(node, 'mid');
          return f;
        },
        blur: function (ctx) { donutBlur(ctx); },
        activate: function (ctx, i, e) { donutClick(ctx, i, e); },
        hint: 'Gunakan tombol panah untuk berpindah bagian. Enter untuk memilih atau membatalkan, Esc untuk keluar.'
      },
      api: function (ctx, handle) {
        return {
          select: function (key) {
            ctx.sel = key == null ? null : String(key);
            applySelection(ctx);
            return handle;
          },
          selected: function () { return ctx.sel; }
        };
      }
    });
  }
  function setCenter(ctx, value, label) {
    var M = ctx.m, T = ctx.T;
    if (!M.cVal) return;
    var ir = M.ir;
    var fsz = clamp(Math.round(ir * 0.42), 15, 34);
    var fSerif = font(T, 'serif', fsz, 500);
    while (fsz > 13 && textW(value, fSerif) > ir * 1.6) { fsz -= 1; fSerif = font(T, 'serif', fsz, 500); }
    var fl = font(T, 'sans', 12, 600);
    var lines = [];
    if (label) {
      var maxLW = ir * 1.5;
      lines = textW(label.toUpperCase(), fl) <= maxLW ? [label] : (wrap2(label.toUpperCase(), maxLW, fl) || [fit(label.toUpperCase(), maxLW, fl)]);
    }
    var block = fsz + lines.length * 14 + (lines.length ? 4 : 0);
    var y0 = -block / 2 + fsz * 0.8;
    M.cVal.style('font-size', fsz + 'px').attr('y', y0).text(value);
    M.cLab.selectAll('tspan').remove();
    M.cLab.text(null);
    lines.forEach(function (l, i) { M.cLab.append('tspan').attr('x', 0).attr('y', y0 + fsz * 0.2 + 16 + i * 14).text(l); });
  }
  function donutFocus(ctx, i) {
    var M = ctx.m;
    if (!M || !M.ready || !M.arcs[i]) return null;
    var a = M.arcs[i], q = a.data, T = ctx.T;
    ctx.g.selectAll('.mcp-slice, .mcp-dlabel').classed('mcp-dim', function () { return this.getAttribute('data-k') !== q.key; });
    liftSlice(ctx, i, ctx.sel === q.key ? 9 : 6);
    if (M.dl) M.dl.forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
    if (M.cVal) setCenter(ctx, fmtPct(q.share, 1), q.label);
    ctx.hover({ key: q.key, index: i, label: q.label, value: q.value, share: q.share });
    var rows = [
      { color: resolve(T, q.col), shape: 'square', label: ctx.o.valueLabel || 'Jumlah', value: M.fV(q.value), strong: true },
      { label: 'Porsi', value: fmtPct(q.share, 1) }
    ];
    if (q.col.tone) rows.push({ label: 'Status', value: statusLabel(q.col.tone), muted: true });
    return { content: { head: q.label, rows: rows, foot: q.note || (ctx.clickable() ? (ctx.sel === q.key ? 'Klik untuk menghapus filter ini.' : 'Klik untuk menampilkan bagian ini saja.') : null) } };
  }
  function donutBlur(ctx) {
    var M = ctx.m;
    if (M && M.ready) {
      ctx.g.selectAll('.mcp-slice, .mcp-dlabel').classed('mcp-dim', function () { return ctx.hl != null && this.getAttribute('data-k') !== String(ctx.hl); });
      if (M.dl) M.dl.forEach(function (li) { li.classList.remove('is-on'); });
      if (M.cVal && M.center) setCenter(ctx, M.center.value, M.center.label);
      applySelection(ctx);
    }
    ctx.untip();
    ctx.hover(null);
  }
  function liftSlice(ctx, i, px) {
    var M = ctx.m;
    M.arcs.forEach(function (a, k) {
      var off = k === i ? px : (ctx.sel === a.data.key ? 9 : 0);
      var mid = (a.startAngle + a.endAngle) / 2;
      /* CSS transform (not the attribute) so the lift eases in charts-plus.css */
      M.groups[k].style('transform', off ? 'translate(' + (Math.sin(mid) * off).toFixed(2) + 'px,' + (-Math.cos(mid) * off).toFixed(2) + 'px)' : null);
    });
  }
  function applySelection(ctx) {
    var M = ctx.m;
    if (!M || !M.ready) return;
    liftSlice(ctx, -1, 0);
    ctx.g.selectAll('.mcp-slice, .mcp-dlabel').classed('mcp-mute', function () { return ctx.sel != null && this.getAttribute('data-k') !== ctx.sel; });
    if (M.dl) M.dl.forEach(function (li) { li.classList.toggle('is-sel', li.getAttribute('data-k') === ctx.sel); li.classList.toggle('is-mute', ctx.sel != null && li.getAttribute('data-k') !== ctx.sel); });
  }
  function donutClick(ctx, i, ev) {
    var M = ctx.m;
    if (!M || !M.ready || !M.arcs[i]) return;
    var q = M.arcs[i].data;
    if (ctx.clickable() && ctx.o.selectable !== false) {
      ctx.sel = ctx.sel === q.key ? null : q.key;
      applySelection(ctx);
      liftSlice(ctx, i, ctx.sel === q.key ? 9 : 6);
      /* the tooltip now offers the opposite action ("Click to clear the filter.") */
      if (ctx._tipOn) { var f = donutFocus(ctx, i); if (f) ctx.tip(ctx.evPt(ev, M.paths[i].node()), f.content); }
    }
    ctx.click({ key: q.key, label: q.label, value: q.value, share: q.share, index: q.index, selected: ctx.sel === q.key }, ev);
  }
  var donut = makeDonut('donut');
  var pie = makeDonut('pie');

  /* ──────────────────────────────────────────────────────────────────────
   * 10. heatmap(el, {rows, cols, values, scale, cellLabel})
   *    rows / cols: strings or {key, label, sub?}. values[r][c]: number |
   *    null (no data) | {value, n?, of?, note?} (n of of shows "120 / 351").
   *    scale 'coverage': bold status bands (green / amber / red / grey) with
   *    the band words in the legend. scale 'count' (also 'potential'): five
   *    calm blue steps, "Fewer → More" with the ranges in words. scale
   *    'status': each cell {value, tone} carries its own status colour
   *    ('ok' | 'mid' | 'bad' | 'none' | 'potential' or the status words) and
   *    legendItems [{tone, label}] say what each colour means.
   *    Options: format (cell; 'pct0' | 'int'), tipFormat, valueLabel,
   *    countLabel ('Already acquired'), unit, cellHeight, rowHeaderWidth.
   *    onClick({row, col, rowKey, colKey, rowIndex, colIndex, value, cell}, event).
   * ────────────────────────────────────────────────────────────────────── */
  var RAMP = ['chart-5', 'chart-4', 'chart-3', 'chart-2', 'chart-1'];
  /** Four round edges (five steps) so that the top step is used: max 771 → 150, 300, 450, 600. */
  function countEdges(max, ints) {
    if (!(max > 0)) { var e0 = [1, 2, 3, 4]; e0.whole = true; return e0; }
    var whole = !!ints || max >= 5;
    var target = max / 5, best = null;
    var p = Math.pow(10, Math.floor(Math.log(target) / Math.LN10) - 1);
    for (var k = 0; k < 3; k++, p *= 10) {
      [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].forEach(function (m) {
        var stp = whole ? Math.max(1, Math.round(m * p)) : +(m * p).toPrecision(2);
        if (stp * 4 >= max && !(whole && max <= 4)) return;
        if (!best || Math.abs(stp - target) < Math.abs(best - target)) best = stp;
      });
    }
    if (!best) best = whole ? 1 : +(target).toPrecision(1);
    var e = [best, best * 2, best * 3, best * 4].map(function (v) { return +v.toPrecision(6); });
    e.whole = whole;
    return e;
  }
  function binOf(v, edges) { var b = 0; for (var i = 0; i < edges.length; i++) if (v >= edges[i]) b = i + 1; return b; }

  var heatmap = make('heatmap', {
    svg: true, d3: true, legend: true, natural: true,
    render: function (ctx, o) {
      var T = ctx.T, d3 = W.d3;
      var rows = normCats(o.rows), cols = normCats(o.cols);
      var nr = rows.length, nc = cols.length;
      var scale = o.scale === 'count' || o.scale === 'potential' ? 'count' : (o.scale === 'status' || o.scale === 'ranked' ? o.scale : 'coverage');
      var fCell = formatter(o.format || (scale === 'coverage' ? 'pct0' : scale === 'ranked' ? 'pctAuto' : 'int'));
      var fTip = formatter(o.tipFormat || (scale === 'coverage' ? 'pct' : (o.format || (scale === 'ranked' ? 'pctAuto' : 'int'))));
      var vals = o.values || [];
      var max = 0, anyNull = false;
      var cells = [];
      for (var r = 0; r < nr; r++) {
        for (var c = 0; c < nc; c++) {
          var raw = vals[r] ? vals[r][c] : null;
          var obj = raw != null && typeof raw === 'object' ? raw : null;
          var v = toNum(obj ? obj.value : raw);
          if (v == null) anyNull = true; else if (v > max) max = v;
          cells.push({ r: r, c: c, v: v, raw: raw, n: obj ? toNum(obj.n) : null, of: obj ? toNum(obj.of) : null, note: obj && obj.note ? String(obj.note) : null, tone0: obj ? toneOf(obj.tone) : null });
        }
      }
      var edges = scale === 'count' ? countEdges(max, cells.every(function (q) { return q.v == null || Math.abs(q.v - Math.round(q.v)) < 1e-9; })) : null;
      /* ranked: thirds per column (default), per row or over every cell; cuts can be given (one {lo, hi}
         for all, or {<col or row key>: {lo, hi}}); a cell {tone} (e.g. 'none') overrides its colour */
      var rankBy = o.rankBy === 'row' || o.rankBy === 'all' ? o.rankBy : 'col';
      var cutFor = null, rankFixed = 0, rankGroups = 0, rankCache = {};
      if (scale === 'ranked') {
        var given = o.cuts || null, cache = rankCache;
        cutFor = function (q) {
          var key = rankBy === 'all' ? '*' : rankBy === 'row' ? rows[q.r].key : cols[q.c].key;
          if (key in cache) return cache[key];
          /* given cut points win; a key given as null means "fixed bands" for that column (too few to rank) */
          var c = null, has = false;
          if (given && cutsOf(given)) { c = cutsOf(given); has = true; }
          else if (given && Object.prototype.hasOwnProperty.call(given, key)) { c = cutsOf(given[key]); has = true; }
          if (!has) {
            var vs = cells.filter(function (x) { return x.v != null && !x.tone0 && (rankBy === 'all' || (rankBy === 'row' ? x.r === q.r : x.c === q.c)); }).map(function (x) { return x.v; });
            c = rankCuts(vs);
          }
          rankGroups += 1;
          if (!c) rankFixed += 1;
          return (cache[key] = c);
        };
      }
      cells.forEach(function (q) {
        if (q.v == null) { q.tone = 'none'; q.css = cssVar('status-none-a20'); q.ink = null; return; }
        if (scale === 'status') { q.tone = q.tone0 && TONE_TOKEN[q.tone0] ? q.tone0 : 'none'; q.css = cssVar(TONE_TOKEN[q.tone]); q.ink = cssVar('status-ink'); }
        else if (scale === 'ranked') {
          q.cut = cutFor(q);
          q.tone = q.tone0 && TONE_TOKEN[q.tone0] ? q.tone0 : rankTone(q.v, q.cut);
          q.css = q.tone === 'none' ? cssVar('status-none-a20') : cssVar(TONE_TOKEN[q.tone]);
          q.ink = q.tone === 'none' ? null : cssVar('status-ink');
        }
        else if (scale === 'coverage') { q.tone = coverageTone(q.v); q.css = cssVar(TONE_TOKEN[q.tone]); q.ink = cssVar('status-ink'); }
        else { q.bin = binOf(q.v, edges); q.fill = T(RAMP[q.bin]); q.css = q.fill; q.ink = inkOn(T, q.fill); }
      });
      var M = ctx.m = { rows: rows, cols: cols, nr: nr, nc: nc, cells: cells, scale: scale, fTip: fTip, fCell: fCell, edges: edges, rankBy: rankBy, ready: false };

      /* legend in words */
      var items;
      if (scale === 'status') {
        /* the caller says what each colour means: legendItems [{tone, label}] */
        items = (o.legendItems || []).map(function (it) { var t = toneOf(it.tone) || 'none'; return { kind: 'box', css: cssVar(TONE_TOKEN[t]), label: String(it.label || statusLabel(t)) }; });
      } else if (scale === 'coverage') {
        items = ['ok', 'mid', 'bad'].map(function (t) { return { kind: 'box', css: cssVar(TONE_TOKEN[t]), label: coverageWords(t) }; });
      } else if (scale === 'ranked') {
        var inWhat = rankBy === 'all' ? '' : rankBy === 'row' ? ' di barisnya' : ' di kolomnya';
        var allFixed = rankGroups > 0 && rankFixed === rankGroups;
        items = o.legendItems ? o.legendItems.map(function (it) { var t = toneOf(it.tone) || 'none'; return { kind: 'box', css: cssVar(t === 'none' ? 'status-none-a20' : TONE_TOKEN[t]), label: String(it.label), nodata: t === 'none' }; })
          : rankLegend({ none: false, fixed: allFixed, cut: rankBy === 'all' ? rankCache['*'] : null })
            .map(function (it, k) { return { kind: 'box', css: cssVar(TONE_TOKEN[it.tone]), label: k === 0 && !allFixed && rankBy !== 'all' ? it.label + inWhat : it.label }; });
        if (rankFixed && !o.legendItems) items.push({ kind: 'note', label: rankFixed === rankGroups ? 'Nilainya terlalu sedikit untuk dibandingkan, sehingga menggunakan batas tetap'
          : (rankBy === 'row' ? 'Baris' : 'Kolom') + ' dengan nilai terlalu sedikit menggunakan batas tetap (50% dan 20%)' });
        anyNull = anyNull || cells.some(function (q) { return q.tone === 'none'; });
      } else {
        var fI = formatter(o.format || 'int');
        items = RAMP.map(function (tk, b) {
          var lo = b === 0 ? 0 : edges[b - 1], hi = b < edges.length ? edges[b] : null;
          if (hi == null) return { kind: 'box', css: cssVar(tk), label: fI(lo) + ' atau lebih' };
          if (!edges.whole) return { kind: 'box', css: cssVar(tk), label: (b === 0 ? 'Di bawah ' : fI(lo) + ' sampai di bawah ') + fI(hi) };
          return { kind: 'box', css: cssVar(tk), label: lo === hi - 1 ? fI(lo) : fI(lo) + '–' + fI(hi - 1) };
        });
      }
      if ((anyNull || scale === 'coverage') && !(scale === 'ranked' && o.legendItems)) items.push({ kind: 'box', css: cssVar('status-none-a20'), label: scale === 'ranked' ? (o.noneWords || 'Abu-abu: tidak ada data') : 'Tidak ada data', nodata: true });
      ctx.legend(o.legend === false ? [] : [{ title: scale === 'count' ? (o.legendTitle || ((o.unit ? o.unit.charAt(0).toUpperCase() + o.unit.slice(1) : 'Jumlah') + ', dari sedikit ke banyak')) : (o.legendTitle || null), items: items }]);
      if (ctx.legendEl) Array.prototype.forEach.call(ctx.legendEl.querySelectorAll('.mcp-legend__i'), function (li, k) { var it = items[k]; if (it && it.nodata && li.firstChild && li.firstChild.classList) li.firstChild.classList.add('mcp-sw--nodata'); });

      var sz = ctx.size(o);
      if (!sz) return;
      ctx.clearSvg();
      if (!nr || !nc) { ctx.plot.style.height = ''; ctx.setSvg(0, 0); ctx.empty(o.emptyText || 'Belum ada data.'); return; }
      M.ready = true;
      var w = sz.w;
      var fRow = font(T, 'sans', 12, 500), fCol = font(T, 'sans', 12, 600), fVal = font(T, 'sans', 12, 500), fSub = font(T, 'sans', 12);
      var hasSub = rows.some(function (q) { return q.sub; });
      var rowCap = Math.min(o.rowHeaderWidth || 180, Math.max(64, Math.round(w * 0.4)));
      var rowW = clamp(Math.ceil(Math.max(maxW(rows.map(function (q) { return q.label; }), fRow), hasSub ? maxW(rows.map(function (q) { return q.sub || ''; }), fSub) : 0)) + 16, 64, rowCap);
      var gap = w < 480 ? 2 : 3;
      var cellH = o.cellHeight || (hasSub ? 42 : 36);
      var cellW = clamp((w - rowW - gap * (nc - 1)) / nc, o.minCellWidth || 38, o.maxCellWidth || 150);
      var gridW = rowW + nc * cellW + (nc - 1) * gap;   // may grow below when a header needs 72 px
      var colLabs = cols.map(function (q) { return q.label; });
      var maxCol = maxW(colLabs, fCol);
      var hmode = 'flat', cw = null, ANG = 40 * Math.PI / 180, ROTMAX = 120;
      /* A-16: column headers stay horizontal, on at most 2 lines and 72 px; the cells widen (and the grid
         scrolls sideways) rather than tilting a name */
      if (maxCol > cellW - 6) {
        var lim = Math.max(cellW - 6, Math.min(72, maxCol));
        if (lim > cellW - 6) { cellW = lim + 6; gridW = rowW + nc * cellW + (nc - 1) * gap; }
        cw = colLabs.map(function (l) {
          if (textW(l, fCol) <= lim) return [l];
          var two = wrap2(l, lim, fCol);
          if (two) return two;
          var ws = String(l).split(/\s+/), first = ws.shift() || '';
          return ws.length ? [fit(first, lim, fCol), fit(ws.join(' '), lim, fCol)] : [fit(first, lim, fCol)];
        });
        hmode = 'wrap';
      }
      var headH = hmode === 'flat' ? 26 : hmode === 'wrap' ? 44 : Math.ceil(Math.min(ROTMAX, maxCol) * Math.sin(ANG) + 18);
      var totalH = headH + nr * (cellH + gap) - gap + 2;
      /* rotated headers lean right: keep the last one inside the drawing */
      var overR = 0;
      if (hmode === 'rot') cols.forEach(function (q, c) { var end = rowW + c * (cellW + gap) + cellW / 2 - 4 + Math.min(ROTMAX, textW(q.label, fCol)) * Math.cos(ANG); if (end > overR) overR = end; });
      var scroll = gridW > w + 1 || overR > w + 16;
      var svgW = scroll ? Math.max(w, gridW, Math.ceil(overR) + 4) : w;
      ctx.plot.style.height = totalH + 'px';
      ctx.plot.classList.toggle('is-scroll', scroll);
      ctx.setSvg(svgW, totalH);
      assign(M, { rowW: rowW, cellW: cellW, cellH: cellH, gap: gap, headH: headH });

      var g = ctx.g;
      /* fade the cells in only when the numbers change (not on a theme or size redraw) */
      var sig = rows.map(function (q) { return q.key; }).join('\u0001') + '\u0002' + cols.map(function (q) { return q.key; }).join('\u0001') + '\u0002' +
        cells.map(function (q) { return q.v == null ? '' : q.v; }).join(',');
      var anim = ctx.anim && ctx._hmSig !== sig;
      ctx._hmSig = sig;
      /* column headers */
      var gh = g.append('g').attr('class', 'mcp-hm-cols');
      M.colEls = cols.map(function (q, c) {
        var x = rowW + c * (cellW + gap) + cellW / 2;
        var t = gh.append('text').attr('class', 'mcp-t mcp-t--colh').attr('data-c', c);
        if (hmode === 'flat') t.attr('x', x).attr('y', headH - 9).attr('text-anchor', 'middle').text(q.label);
        else if (hmode === 'wrap') {
          var lines = cw[c];
          t.attr('x', x).attr('y', headH - 9 - (lines.length - 1) * 15).attr('text-anchor', 'middle');
          lines.forEach(function (l, li) { t.append('tspan').attr('x', x).attr('dy', li ? 15 : 0).text(l); });
        } else {
          t.attr('x', x - 4).attr('y', headH - 8).attr('text-anchor', 'start').attr('transform', 'rotate(-40,' + (x - 4) + ',' + (headH - 8) + ')').text(fit(q.label, ROTMAX, fCol));
        }
        return t;
      });
      /* row headers */
      var gr = g.append('g').attr('class', 'mcp-hm-rows');
      M.rowEls = rows.map(function (q, r) {
        var y = headH + r * (cellH + gap) + cellH / 2;
        var t = gr.append('text').attr('class', 'mcp-t mcp-t--rowh').attr('x', 0).attr('y', q.sub ? y - 3 : y).attr('dy', q.sub ? 0 : '0.35em').text(fit(q.label, rowW - 12, fRow));
        if (q.sub) gr.append('text').attr('class', 'mcp-t mcp-t--rows').attr('x', 0).attr('y', y + 12).text(fit(q.sub, rowW - 12, fSub));
        return t;
      });
      /* cells */
      var gc = g.append('g').attr('class', 'mcp-hm-cells');
      var showLabel = o.cellLabel !== false;
      M.cellEls = [];
      cells.forEach(function (q, idx) {
        var x = rowW + q.c * (cellW + gap), y = headH + q.r * (cellH + gap);
        var cg = gc.append('g').attr('class', 'mcp-hm-cell mcp-mark').attr('data-r', q.r).attr('data-c', q.c);
        var rect = cg.append('rect').attr('x', x).attr('y', y).attr('width', cellW).attr('height', cellH).attr('rx', 4).style('fill', q.css);
        if (q.v == null) rect.attr('class', 'mcp-hm-nodata');
        if (showLabel) {
          var txt = q.v == null ? '—' : fCell(q.v);
          var sub = q.n != null && q.of != null && cellH >= 38 && o.cellSub !== false ? fmtInt(q.n) + ' / ' + fmtInt(q.of) : null;
          if (sub && textW(sub, fSub) > cellW - 8) sub = null;
          if (textW(txt, fVal) <= cellW - 6) {
            var tt = cg.append('text').attr('class', 'mcp-t mcp-t--cell' + (q.v == null ? ' mcp-t--cell-na' : '')).attr('x', x + cellW / 2).attr('y', sub ? y + cellH / 2 - 4 : y + cellH / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').text(txt);
            if (q.ink) tt.style('fill', q.ink);
            if (sub) {
              var st = cg.append('text').attr('class', 'mcp-t mcp-t--cellsub').attr('x', x + cellW / 2).attr('y', y + cellH / 2 + 11).attr('dy', '0.35em').attr('text-anchor', 'middle').text(sub);
              if (q.ink) st.style('fill', q.ink);
            }
          }
        }
        cg.on('pointerenter pointermove', function (ev) { var f = heatFocus(ctx, idx); if (f) ctx.tip(ctx.evPt(ev, this), f.content); })
          .on('pointerleave', function () { heatBlur(ctx); })
          .on('click', function (ev) { ctx.click(heatPayload(ctx, idx), ev); });
        if (anim) cg.attr('opacity', 0).transition().delay((q.r + q.c) * 22).duration(280).ease(d3.easeCubicOut).attr('opacity', 1);
        M.cellEls[idx] = cg;
      });
      M.focusRect = g.append('rect').attr('class', 'mcp-hm-focus').attr('width', cellW + 2).attr('height', cellH + 2).attr('rx', 5).attr('opacity', 0);
    },
    highlight: function (ctx, key) {
      var M = ctx.m;
      if (!M || !M.ready) return;
      var rk = key && typeof key === 'object' ? key.row : key, ck = key && typeof key === 'object' ? key.col : null;
      ctx.g.selectAll('.mcp-hm-cell').classed('mcp-dim', function () {
        if (key == null) return false;
        var r = M.rows[+this.getAttribute('data-r')], c = M.cols[+this.getAttribute('data-c')];
        return !((rk == null || r.key === String(rk)) && (ck == null || c.key === String(ck)));
      });
    },
    summary: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.nr || !M.nc) return (o.label ? o.label + ': ' : '') + 'belum ada data.';
      var known = M.cells.filter(function (q) { return q.v != null; });
      var parts = [(o.label ? o.label + '. ' : '') + 'Tabel warna, ' + M.nr + ' baris kali ' + M.nc + ' kolom'];
      if (known.length) {
        var hi = known.reduce(function (a, b) { return b.v > a.v ? b : a; });
        var lo = known.reduce(function (a, b) { return b.v < a.v ? b : a; });
        parts.push('tertinggi ' + M.rows[hi.r].label + ', ' + M.cols[hi.c].label + ' ' + M.fTip(hi.v));
        parts.push('terendah ' + M.rows[lo.r].label + ', ' + M.cols[lo.c].label + ' ' + M.fTip(lo.v));
      }
      if (M.scale === 'coverage' || M.scale === 'status' || M.scale === 'ranked') {
        var cnt = { ok: 0, mid: 0, bad: 0, none: 0, potential: 0 };
        M.cells.forEach(function (q) { cnt[q.tone] += 1; });
        parts.push(cnt.ok + ' hijau, ' + cnt.mid + ' kuning, ' + cnt.bad + ' merah' + (cnt.none ? ', ' + cnt.none + ' tanpa data' : ''));
      }
      return parts.join('; ') + '.';
    },
    table: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.nr || !M.nc) return null;
      return {
        columns: [o.rowLabel || ''].concat(M.cols.map(function (c) { return c.label; })),
        rows: M.rows.map(function (rw, r) {
          return [rw.label].concat(M.cols.map(function (c, ci) {
            var q = M.cells[r * M.nc + ci];
            if (q.v == null) return 'Tidak ada data';
            var t = M.fTip(q.v) + (q.n != null && q.of != null ? ' (' + fmtInt(q.n) + ' dari ' + fmtInt(q.of) + ')' : '');
            if (M.scale === 'ranked') t += ' · ' + (q.tone === 'none' ? 'tidak dinilai' : rankWords(q.tone, { cut: q.cut, fixed: !q.cut, next: false }).replace(/ \(.*\)$/, '').toLowerCase());
            return t;
          }));
        })
      };
    },
    nav: {
      count: function (ctx) { return ctx.m && ctx.m.ready ? ctx.m.cells.length : 0; },
      key: function (ctx, e, i) {
        var nc = ctx.m.nc, n = ctx.m.cells.length;
        if (i < 0 && /^Arrow/.test(e.key)) return 0;
        switch (e.key) {
          case 'ArrowRight': return i % nc < nc - 1 ? i + 1 : i;
          case 'ArrowLeft': return i % nc > 0 ? i - 1 : i;
          case 'ArrowDown': return i + nc < n ? i + nc : i;
          case 'ArrowUp': return i - nc >= 0 ? i - nc : i;
          default: return undefined;
        }
      },
      focus: function (ctx, i) {
        var f = heatFocus(ctx, i);
        if (!f) return null;
        f.pt = ctx.ptOf(ctx.m.cellEls[i].node(), 'top');
        return f;
      },
      blur: function (ctx) { heatBlur(ctx); },
      activate: function (ctx, i, e) { ctx.click(heatPayload(ctx, i), e); },
      hint: 'Gunakan tombol panah untuk berpindah sel. Enter untuk memilih, Esc untuk keluar.'
    }
  });
  function heatPayload(ctx, i) {
    var M = ctx.m, q = M.cells[i];
    return { row: M.rows[q.r].label, col: M.cols[q.c].label, rowKey: M.rows[q.r].key, colKey: M.cols[q.c].key, rowIndex: q.r, colIndex: q.c, value: q.v, cell: q.raw, key: M.rows[q.r].key + '|' + M.cols[q.c].key };
  }
  function heatFocus(ctx, i) {
    var M = ctx.m;
    if (!M || !M.ready || !M.cells[i]) return null;
    var q = M.cells[i], T = ctx.T, o = ctx.o;
    var x = M.rowW + q.c * (M.cellW + M.gap) - 1, y = M.headH + q.r * (M.cellH + M.gap) - 1;
    M.focusRect.attr('x', x).attr('y', y).attr('opacity', 1);
    M.rowEls.forEach(function (t, r) { t.classed('is-on', r === q.r); });
    M.colEls.forEach(function (t, c) { t.classed('is-on', c === q.c); });
    var rows = [];
    if (q.v == null) rows.push({ color: T('status-none'), label: o.valueLabel || (M.scale === 'coverage' ? 'Coverage' : 'Jumlah'), value: 'Tidak ada data', strong: true });
    else if (M.scale === 'coverage') {
      rows.push({ color: T(TONE_TOKEN[q.tone]), shape: 'square', label: o.valueLabel || 'Coverage', value: M.fTip(q.v), strong: true });
      rows.push({ label: 'Status', value: coverageWords(q.tone), muted: true });
    } else if (M.scale === 'status') {
      rows.push({ color: T(TONE_TOKEN[q.tone]), shape: 'square', label: o.valueLabel || 'Nilai', value: M.fTip(q.v), strong: true });
    } else if (M.scale === 'ranked') {
      rows.push({ color: T(TONE_TOKEN[q.tone]), shape: 'square', label: o.valueLabel || 'Coverage', value: M.fTip(q.v), strong: true });
      rows.push({ label: 'Peringkat', value: q.tone === 'none' ? (o.noneTip || 'Tidak dinilai') : rankWords(q.tone, { cut: q.cut, fixed: !q.cut, of: q.tone === 'ok' ? (M.rankBy === 'col' ? 'di ' + M.cols[q.c].label : M.rankBy === 'row' ? 'di ' + M.rows[q.r].label : null) : null }), muted: true });
    } else rows.push({ color: q.fill, shape: 'square', label: o.valueLabel || (o.unit ? o.unit.charAt(0).toUpperCase() + o.unit.slice(1) : 'Jumlah'), value: M.fTip(q.v), strong: true });
    if (q.n != null && q.of != null) rows.push({ label: o.countLabel || statusLabel('ok'), value: fmtInt(q.n) + ' of ' + fmtInt(q.of) });
    ctx.hover(heatPayload(ctx, i));
    return { content: { head: M.rows[q.r].label + ' · ' + M.cols[q.c].label, rows: rows, foot: q.note || o.tipFoot || null } };
  }
  function heatBlur(ctx) {
    var M = ctx.m;
    if (M && M.ready) {
      M.focusRect.attr('opacity', 0);
      M.rowEls.forEach(function (t) { t.classed('is-on', false); });
      M.colEls.forEach(function (t) { t.classed('is-on', false); });
    }
    ctx.untip();
    ctx.hover(null);
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 11. statusBar(el, {acquired, partly, notYet, noData} | {potential})
   *    One 100 % bar in the bold status colours, shares inside the segments
   *    and a legend in words with counts underneath. Only the keys you pass
   *    are shown. {potential: n} alone (before the LVM import) draws one
   *    neutral blue bar, never a fake red.
   *    Options: labels {acquired: '…'}, unit ('merchants'), format ('int'),
   *    size ('md' | 'lg'), total (true), onClick({key, label, value, share}).
   *    Motion (item 38): transform only. The bar grows from the left as one
   *    piece on the first draw; an update moves each segment from its old place
   *    (FLIP, translateX + scaleX) in --dur-slow. A share is never transitioned
   *    through flex-grow (that would lay the page out on every frame).
   * ────────────────────────────────────────────────────────────────────── */
  var SB_ORDER = ['acquired', 'partly', 'notYet', 'noData'];
  /* scale: 'ranked' (COPY_STYLE_EN item 18): the same green / amber / red, in the words of the thirds */
  var SB_RANKED = { acquired: 'Sepertiga tertinggi', partly: 'Sepertiga tengah', notYet: 'Sepertiga terendah, kunjungi lebih dulu', noData: 'Tidak dinilai' };
  var statusBar = make('statusBar', {
    svg: false, d3: false, natural: true,
    render: function (ctx, o) {
      var f = formatter(o.format || 'int');
      var items = [];
      var core = SB_ORDER.some(function (k) { return toNum(o[k]) != null; });
      if (!core && toNum(o.potential) != null) items.push({ key: 'potential', tone: 'potential', value: Math.max(0, toNum(o.potential)) });
      else SB_ORDER.forEach(function (k) { var v = toNum(o[k]); if (v != null) items.push({ key: k, tone: toneOf(k), value: Math.max(0, v) }); });
      var total = sum(items, function (q) { return q.value; });
      var rankedBar = o.scale === 'ranked';
      items.forEach(function (q) {
        q.share = total > 0 ? q.value / total : 0;
        q.label = (o.labels && o.labels[q.key]) || (rankedBar ? SB_RANKED[q.key] : null) || statusLabel(q.tone);
      });
      var M = ctx.m = { items: items, total: total, f: f, ready: items.length > 0 && total > 0 };

      if (!ctx.bar) {
        ctx.bar = h('div', { class: 'mcp-sb__bar' });
        ctx.sbLegend = h('ul', { class: 'mcp-sb__legend', 'aria-hidden': 'true' });
        ctx.plot.appendChild(ctx.bar);
        ctx.plot.appendChild(ctx.sbLegend);
        ctx.segs = {};
      }
      ctx.bar.classList.toggle('is-lg', o.size === 'lg');
      ctx.bar.classList.toggle('is-empty', !M.ready);
      var w = ctx.plot.clientWidth || 0;
      var T = ctx.T, fIn = font(T, 'sans', 12, 600);
      var anim = ctx.anim && reducedMotion() === false;
      /* item 38 motion: transform only (FLIP). Read where every segment is before any write (one layout). */
      var before = anim ? sbBoxes(ctx) : null;
      var keep = {};
      M.segs = [];
      items.forEach(function (q, i) {
        keep[q.key] = true;
        var seg = ctx.segs[q.key];
        var fresh = !seg;
        if (fresh) {
          seg = h('div', { class: 'mcp-sb__seg mcp-sb__seg--' + q.tone, 'data-k': q.key }, h('span', { class: 'mcp-sb__in' }));
          seg.addEventListener('pointerenter', function (ev) { var fc = sbFocus(ctx, q.key); if (fc) ctx.tip(ctx.evPt(ev, seg), fc.content); });
          seg.addEventListener('pointermove', function (ev) { var fc = sbFocus(ctx, q.key); if (fc) ctx.tip(ctx.evPt(ev, seg), fc.content); });
          seg.addEventListener('pointerleave', function () { sbBlur(ctx); });
          seg.addEventListener('click', function (ev) { var it = sbItem(ctx, q.key); if (it) ctx.click({ key: it.key, label: it.label, value: it.value, share: it.share }, ev); });
          ctx.segs[q.key] = seg;
        }
        ctx.bar.appendChild(seg);
        /* the share is the segment's flex-grow, set at once (never transitioned: no layout per frame) */
        seg.style.flexGrow = String(Math.max(0, q.share * 1000));
        seg.classList.toggle('is-zero', !(q.value > 0));
        var segW = w * q.share;
        var pctT = fmtPct(q.share, q.share > 0 && q.share < 0.1 ? 1 : 0);
        var both = pctT + ' · ' + f(q.value);
        var txt = segW >= textW(both, fIn) + 18 ? both : segW >= textW(pctT, fIn) + 12 ? pctT : '';
        seg.firstChild.textContent = txt;
        M.segs.push(seg);
      });
      Object.keys(ctx.segs).forEach(function (k) { if (!keep[k]) { var sg = ctx.segs[k]; if (sg.parentNode) sg.parentNode.removeChild(sg); delete ctx.segs[k]; } });
      sbMove(ctx, M.segs, before);

      /* legend in words with counts */
      ctx.sbLegend.textContent = '';
      items.forEach(function (q) {
        var li = h('li', { class: 'mcp-sb__li', 'data-k': q.key }, [
          h('span', { class: 'mcp-sw mcp-sw--box mcp-sw--' + q.tone, style: { background: cssVar(TONE_TOKEN[q.tone]) } }),
          h('span', { class: 'mcp-sb__lt' }, [
            h('span', { class: 'mcp-sb__ll', text: q.label }),
            h('span', { class: 'mcp-sb__lv' }, [h('b', { text: f(q.value) }), h('span', { text: ' · ' + fmtPct(q.share, 1) })])
          ])
        ]);
        li.addEventListener('mouseenter', function () { sbDim(ctx, q.key); });
        li.addEventListener('mouseleave', function () { sbDim(ctx, ctx.hl); });
        ctx.sbLegend.appendChild(li);
      });
      if (o.total !== false && items.length > 1) {
        ctx.sbLegend.appendChild(h('li', { class: 'mcp-sb__li mcp-sb__li--total' }, [
          h('span', { class: 'mcp-sb__lt' }, [
            h('span', { class: 'mcp-sb__ll', text: 'Total' }),
            h('span', { class: 'mcp-sb__lv' }, [h('b', { text: f(total) }), o.unit ? h('span', { text: ' ' + o.unit }) : null])
          ])
        ]));
      }
      if (!items.length) ctx.sbLegend.appendChild(h('li', { class: 'mcp-sb__li mcp-sb__li--empty', text: o.emptyText || 'Belum ada data.' }));
    },
    highlight: function (ctx, key) { sbDim(ctx, key); },
    summary: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.items.length) return (o.label ? o.label + ': ' : '') + 'belum ada data.';
      return (o.label ? o.label + '. ' : '') + M.items.map(function (q) { return q.label + ' ' + M.f(q.value) + ' (' + fmtPct(q.share, 1) + ')'; }).join('; ') +
        '. Total ' + M.f(M.total) + (o.unit ? ' ' + o.unit : '') + '.';
    },
    table: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.items.length) return null;
      var rows = M.items.map(function (q) { return [q.label, M.f(q.value), fmtPct(q.share, 1)]; });
      rows.push(['Total', M.f(M.total), M.total > 0 ? fmtPct(1, 0) : null]);
      return { columns: ['Status', o.valueLabel || 'Jumlah', 'Porsi'], rows: rows };
    },
    nav: {
      count: function (ctx) { return ctx.m ? ctx.m.items.length : 0; },
      focus: function (ctx, i) {
        var q = ctx.m.items[i];
        var f = q ? sbFocus(ctx, q.key) : null;
        if (!f) return null;
        f.pt = ctx.ptOf(ctx.segs[q.key], 'top');
        return f;
      },
      blur: function (ctx) { sbBlur(ctx); },
      activate: function (ctx, i, e) { var q = ctx.m.items[i]; if (q) ctx.click({ key: q.key, label: q.label, value: q.value, share: q.share }, e); },
      hint: 'Gunakan tombol panah untuk berpindah status. Enter untuk memilih, Esc untuk keluar.'
    }
  });
  /** Where each shown segment sits in the bar now: {key: {x, w}} in px (null when the bar is not laid out). */
  function sbBoxes(ctx) {
    if (!ctx.bar || !ctx.segs || typeof ctx.bar.getBoundingClientRect !== 'function') return null;
    var bb = ctx.bar.getBoundingClientRect();
    if (!(bb.width > 0)) return null;
    var out = {}, any = false;
    Object.keys(ctx.segs).forEach(function (k) {
      var sg = ctx.segs[k];
      if (sg.parentNode !== ctx.bar || sg.classList.contains('is-zero')) return;
      var b = sg.getBoundingClientRect();
      if (b.width > 0) { out[k] = { x: b.left - bb.left, w: b.width }; any = true; }
    });
    return any ? out : null;
  }
  /**
   * The segments move with transform only (FLIP, item 38): each one starts where it was (translateX + scaleX from
   * its left edge) and eases to its new place in --dur-slow. On the first draw (nothing on screen yet) the whole bar
   * grows from the left as one piece: segment i starts at translateX(-x) scaleX(0), so at every frame the segments
   * still touch. Words inside a moving segment wait until it has nearly arrived (no squeezed text). Without motion
   * (a resize, reduced motion) the segments are simply in place.
   */
  function sbMove(ctx, segs, before) {
    var after = ctx.anim && reducedMotion() === false ? sbBoxes(ctx) : null;
    var moved = [];
    segs.forEach(function (sg) {
      var k = sg.getAttribute('data-k'), a = after && after[k], b = before && before[k], from = '';
      if (a && a.w > 0) {
        if (!before) from = 'translateX(' + (-a.x).toFixed(1) + 'px) scaleX(0)';
        else if (!b) from = 'translateX(0px) scaleX(0)';
        else if (Math.abs(b.x - a.x) > 0.5 || Math.abs(b.w - a.w) > 0.5) from = 'translateX(' + (b.x - a.x).toFixed(1) + 'px) scaleX(' + (b.w / a.w).toFixed(4) + ')';
      }
      if (!from) { sg.classList.remove('is-set'); sg.classList.remove('is-hide'); sg.style.transform = ''; return; }
      sg.classList.add('is-set');
      sg.classList.add('is-hide');
      sg.style.transform = from;
      moved.push(sg);
    });
    if (!moved.length) return;
    void ctx.bar.offsetWidth;                     /* commit the start state, then let the transitions run */
    moved.forEach(function (sg) { sg.classList.remove('is-set'); sg.classList.remove('is-hide'); sg.style.transform = ''; });
  }
  function sbItem(ctx, key) { return ctx.m ? ctx.m.items.filter(function (q) { return q.key === key; })[0] : null; }
  function sbDim(ctx, key) {
    if (!ctx.segs) return;
    Object.keys(ctx.segs).forEach(function (k) { ctx.segs[k].classList.toggle('mcp-dim', key != null && k !== String(key)); });
    Array.prototype.forEach.call(ctx.sbLegend.children, function (li) { var k = li.getAttribute('data-k'); li.classList.toggle('mcp-dim', key != null && k != null && k !== String(key)); });
  }
  function sbFocus(ctx, key) {
    var q = sbItem(ctx, key);
    if (!q) return null;
    sbDim(ctx, key);
    ctx.hover({ key: q.key, label: q.label, value: q.value, share: q.share });
    var o = ctx.o;
    return { content: { head: q.label, rows: [
      { color: ctx.T(TONE_TOKEN[q.tone]), shape: 'square', label: o.unit ? o.unit.charAt(0).toUpperCase() + o.unit.slice(1) : 'Jumlah', value: ctx.m.f(q.value), strong: true },
      { label: 'Porsi', value: fmtPct(q.share, 1) },
      { label: 'Total', value: ctx.m.f(ctx.m.total), muted: true }
    ], foot: q.tone === 'potential' ? 'Impor file LVM untuk melihat merchant yang telah diakuisisi.' : null } };
  }
  function sbBlur(ctx) { sbDim(ctx, ctx.hl); ctx.untip(); ctx.hover(null); }

  /* ──────────────────────────────────────────────────────────────────────
   * 11b. rankBars(el, {rows: [{key, label, value, dot?, dotTone?, sub?}]}, cfg?)  (UX fix plan A-16)
   *    Horizontal bars sorted from the largest value down. Full names are
   *    left-aligned and wrap (never rotated or cut), the value sits at the end
   *    of its bar, and a separate right-hand column shows a coloured dot with
   *    the coverage % (dot: 0–1; dotTone: 'ok' | 'mid' | 'bad' | 'none' |
   *    'potential', or the ranked thirds of the dots by default).
   *    Options: format ('int'), dotFormat ('pctAuto'), valueLabel, dotLabel,
   *    color (bar colour token, default chart-3), highlight (key: gold label),
   *    limit (rows shown), onClick({key, label, value, dot}).
   * ────────────────────────────────────────────────────────────────────── */
  var rankBars = make('rankBars', {
    svg: false, d3: false, natural: true,
    render: function (ctx, o) {
      var f = formatter(o.format || 'int'), fd = formatter(o.dotFormat || 'pctAuto');
      var rows = (o.rows || []).map(function (r, i) {
        return { key: String(r.key != null ? r.key : i), label: String(r.label == null ? '' : r.label), sub: r.sub ? String(r.sub) : '',
          value: toNum(r.value), dot: toNum(r.dot), dotTone: toneOf(r.dotTone), i: i };
      }).filter(function (r) { return r.value != null; });
      rows.sort(function (a, b) { return (b.value - a.value) || (a.i - b.i); });
      if (isNum(o.limit) && o.limit > 0) rows = rows.slice(0, o.limit);
      var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0);
      var anyDot = rows.some(function (r) { return r.dot != null || r.dotTone; });
      var cut = anyDot ? rankCuts(rows.map(function (r) { return r.dot; })) : null;
      var col = colorSpec(o.color, 'chart-3');
      ctx.m = { rows: rows, f: f, fd: fd, anyDot: anyDot };
      ctx.plot.textContent = '';
      if (!rows.length) { ctx.plot.appendChild(h('p', { class: 'mcp-empty', text: o.emptyText || 'Belum ada data.' })); return; }
      var list = h('ol', { class: 'mcp-rb' + (anyDot ? ' has-dot' : ''), 'aria-hidden': 'true' });
      if (anyDot && (o.valueLabel || o.dotLabel)) {
        list.appendChild(h('li', { class: 'mcp-rb__head' }, [h('span', { text: '' }), h('span', { class: 'mcp-rb__hv', text: o.valueLabel || '' }), h('span', { class: 'mcp-rb__hd', text: o.dotLabel || '' })]));
      }
      rows.forEach(function (r) {
        var tone = r.dotTone || (r.dot != null ? rankTone(r.dot, cut) : 'none');
        var w = max > 0 ? Math.max(0.5, r.value / max * 100) : 0;
        var bar = h('span', { class: 'mcp-rb__bar', style: { '--w': (w / 100).toFixed(4), background: col.css } });
        var li = h('li', { class: 'mcp-rb__row' + (o.highlight != null && String(o.highlight) === r.key ? ' is-hl' : ''), 'data-k': r.key }, [
          h('span', { class: 'mcp-rb__name' }, [h('span', { class: 'mcp-rb__l', text: r.label }), r.sub ? h('span', { class: 'mcp-rb__sub', text: r.sub }) : null]),
          h('span', { class: 'mcp-rb__track' }, [bar, h('span', { class: 'mcp-rb__v', text: f(r.value) })]),
          anyDot ? h('span', { class: 'mcp-rb__dot' }, [h('i', { class: 'mcp-rb__sw', style: { background: cssVar(TONE_TOKEN[tone] || 'status-none') } }), h('span', { text: r.dot != null ? fd(r.dot) : '—' })]) : null
        ]);
        if (typeof o.onClick === 'function') {
          li.classList.add('is-clickable');
          li.addEventListener('click', function (ev) { ctx.click({ key: r.key, label: r.label, value: r.value, dot: r.dot }, ev); });
        }
        list.appendChild(li);
      });
      ctx.plot.appendChild(list);
    },
    summary: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.rows.length) return (o.label ? o.label + ': ' : '') + 'belum ada data.';
      return (o.label ? o.label + '. ' : '') + M.rows.slice(0, 10).map(function (r) { return r.label + ' ' + M.f(r.value) + (r.dot != null ? ' (' + M.fd(r.dot) + ')' : ''); }).join('; ') + '.';
    },
    table: function (ctx, o) {
      var M = ctx.m;
      if (!M || !M.rows.length) return null;
      var cols = [o.categoryLabel || 'Nama', o.valueLabel || 'Jumlah'];
      if (M.anyDot) cols.push(o.dotLabel || 'Coverage');
      return { columns: cols, rows: M.rows.map(function (r) { var x = [r.label, M.f(r.value)]; if (M.anyDot) x.push(r.dot != null ? M.fd(r.dot) : null); return x; }) };
    }
  });

  /* ──────────────────────────────────────────────────────────────────────
   * 12. bigNumber(el, {label, value, delta, status, note})
   *    KPI card: label, big number (counts up), a solid status chip in the
   *    bold colours and one plain line. status: 'acquired' | 'partly' |
   *    'notYet' | 'noData' | 'potential' (chip says "Acquired", "Not yet", …)
   *    or 'ok' | 'mid' | 'bad' | 'none' (chip says "On target", "Close to
   *    target", "Behind target", "No data"); statusLabel overrides the words.
   *    delta: number | {value, format?, label?, invert?}; deltaFormat
   *    ('pp' for pct values, else the value format), deltaLabel ('vs Sep 2026').
   *    Options: format ('int' | 'pct' | 'rp' | …), unit ('merchants'),
   *    card (true: own card surface; false: flat inside a panel), onClick.
   * ────────────────────────────────────────────────────────────────────── */
  var CHIP_WORDS = {
    acquired: function () { return statusLabel('ok', true); }, partly: function () { return statusLabel('mid', true); },
    notyet: function () { return statusLabel('bad', true); }, nodata: function () { return statusLabel('none', true); },
    potential: function () { return statusLabel('potential', true); }
  };
  function chipText(status, tone, override) {
    if (override) return String(override);
    var k = String(status).replace(/[\s_-]/g, '').toLowerCase();
    if (CHIP_WORDS[k]) return CHIP_WORDS[k]();
    return TARGET_WORDS[tone] || '';
  }
  function valueParts(v, spec, unit, pin) {
    if (v == null) return { n: '—' };
    if (typeof v === 'string') return { n: v, unit: unit };
    if (spec === 'rp') {
      var f = uf();
      if (f && typeof f.rpParts === 'function') {
        var p = f.rpParts(v, pin ? { unit: pin.mag, decimals: pin.decimals } : undefined);
        return { cur: 'Rp', n: p.sign + p.n, mag: p.mag, pin: p.unit };
      }
      return { n: fmtRp(v) };
    }
    if (isPctSpec(spec)) {
      var d = spec === 'pct0' ? 0 : spec === 'pct2' ? 2 : 1;
      /* a positive share never reads "0.0%": two decimals while one would round it to zero */
      if (d < 2 && isNum(v) && v > 0 && v * 100 < (d ? 0.05 : 0.5)) d = 2;
      return { n: fmtNum(v * 100, d), mag: '%' };
    }
    return { n: formatter(spec)(v), unit: unit };
  }
  var bigNumber = make('bigNumber', {
    svg: false, d3: false, natural: true, role: false,
    tagTarget: function (ctx) { return ctx.bnHead || ctx.card || ctx.root; },
    render: function (ctx, o) {
      var spec = o.format || 'int';
      var v = typeof o.value === 'string' ? o.value : toNum(o.value);
      var tone = bnTone(o, v);
      var clickable = typeof o.onClick === 'function';
      if (!ctx.card) {
        ctx.card = h('div', { class: 'mcp-bn' });
        ctx.bnHead = h('div', { class: 'mcp-bn__head' });
        ctx.bnLabel = h('p', { class: 'mcp-bn__label' });
        ctx.bnHead.appendChild(ctx.bnLabel);
        ctx.bnValue = h('p', { class: 'mcp-bn__value' });
        ctx.bnMeta = h('div', { class: 'mcp-bn__meta' });
        ctx.bnNote = h('p', { class: 'mcp-bn__note' });
        ctx.bnHelp = h('p', { class: 'mcp-bn__helptext', id: ctx.id + '-help', hidden: true });
        appendKids(ctx.card, [ctx.bnHead, ctx.bnValue, ctx.bnMeta, ctx.bnNote, ctx.bnHelp]);
        ctx.plot.appendChild(ctx.card);
        ctx.card.addEventListener('click', function (ev) { if (typeof ctx.o.onClick === 'function') ctx.click({ key: ctx.o.key || ctx.o.label, value: ctx.o.value, status: ctx.o.status }, ev); });
        ctx.card.addEventListener('keydown', function (ev) {
          if ((ev.key === 'Enter' || ev.key === ' ') && typeof ctx.o.onClick === 'function') { ev.preventDefault(); ctx.click({ key: ctx.o.key || ctx.o.label, value: ctx.o.value, status: ctx.o.status }, ev); }
        });
      }
      var card = ctx.card;
      card.className = 'mcp-bn' + (tone ? ' mcp-bn--' + tone : ' mcp-bn--plain') + (o.card === false ? ' is-flat' : '') + (clickable ? ' is-clickable' : '') + (o.size === 'sm' ? ' is-sm' : '');
      if (clickable) { card.setAttribute('role', 'button'); card.tabIndex = 0; }
      else { card.setAttribute('role', 'group'); card.removeAttribute('tabindex'); }
      ctx.bnLabel.textContent = o.label || '';
      /* "?" tip: a visible button beside the label that shows one plain paragraph (help: string) */
      if (o.help && !ctx.bnHelpBtn) {
        ctx.bnHelpBtn = h('button', { type: 'button', class: 'mcp-bn__help', 'aria-expanded': 'false', 'aria-controls': ctx.id + '-help', text: '?' });
        ctx.bnHelpBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var on = ctx.bnHelp.hidden;
          ctx.bnHelp.hidden = !on;
          ctx.bnHelpBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
          ctx.bnHelpBtn.classList.toggle('is-on', on);
        });
        ctx.bnHelpBtn.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
        ctx.bnHead.appendChild(ctx.bnHelpBtn);
      }
      if (ctx.bnHelpBtn) {
        ctx.bnHelpBtn.hidden = !o.help;
        ctx.bnHelpBtn.title = o.help ? 'Apa arti angka ini' : '';
        ctx.bnHelpBtn.setAttribute('aria-label', 'Arti ' + (o.label || 'angka ini'));
        ctx.bnHelp.textContent = '';   /* "\n" in a tip is a new line (COPY_DECK_ID) */
        String(o.help || '').split('\n').forEach(function (ln, i) { if (i) ctx.bnHelp.appendChild(D.createElement('br')); ctx.bnHelp.appendChild(D.createTextNode(ln)); });
        if (!o.help) ctx.bnHelp.hidden = true;
      }

      /* value with companions: 'Rp' · number · 'bn' / '%' / unit */
      var parts = valueParts(v, spec, o.unit, null);
      ctx.bnValue.textContent = '';
      var nEl = h('span', { class: 'mcp-bn__n', text: parts.n });
      if (parts.cur) ctx.bnValue.appendChild(h('span', { class: 'mcp-bn__cur', text: parts.cur }));
      ctx.bnValue.appendChild(nEl);
      if (parts.mag) ctx.bnValue.appendChild(h('span', { class: 'mcp-bn__mag' + (parts.mag === '%' ? ' is-pct' : ''), text: parts.mag }));
      if (parts.unit) ctx.bnValue.appendChild(h('span', { class: 'mcp-bn__unit', text: parts.unit }));
      if (ctx.countStop) { ctx.countStop(); ctx.countStop = null; }
      /* count up once, on the first draw only: a later change (demo on / off, a new file) shows the new number at once (A-16) */
      if (isNum(v) && ctx.anim && ctx.first && !isNum(ctx.prevValue) && v !== 0) {
        ctx.countStop = countUp(nEl, 0, v, function (x) { return valueParts(x, spec, null, parts.pin).n; }, 700);
      }
      ctx.prevValue = isNum(v) ? v : null;

      /* chip + delta */
      ctx.bnMeta.textContent = '';
      var chipT = tone ? chipText(o.status == null ? 'noData' : o.status, tone, o.statusLabel) : '';
      if (chipT) ctx.bnMeta.appendChild(h('span', { class: 'mcp-chip mcp-chip--' + tone, text: chipT }));
      var dl = o.delta;
      var dv = dl != null && typeof dl === 'object' ? toNum(dl.value) : toNum(dl);
      if (dv != null) {
        var dSpec = (dl && dl.format) || o.deltaFormat || (isPctSpec(spec) ? 'pp' : spec);
        var invert = !!((dl && dl.invert) || o.deltaInvert);
        var zero = Math.abs(dSpec === 'pp' || isPctSpec(dSpec) ? dv * 1000 : dv) < 0.5;
        var sign = zero ? 0 : dv > 0 ? 1 : -1;
        var good = invert ? -sign : sign;
        var mag = dSpec === 'pp' ? fmtNum(Math.abs(dv) * 100, 1) + ' pp' : formatter(dSpec)(Math.abs(dv));
        var glyph = sign > 0 ? '▲' : sign < 0 ? '▼' : '—';
        var dLabel = (dl && dl.label) || o.deltaLabel || '';
        var dEl = h('span', { class: 'mcp-bn__delta ' + (good > 0 ? 'is-up' : good < 0 ? 'is-down' : 'is-flat') }, [
          h('span', { 'aria-hidden': 'true', text: glyph + ' ' + mag }),
          h('span', { class: 'mcp-sr', text: (sign > 0 ? 'naik ' : sign < 0 ? 'turun ' : 'tetap ') + mag })
        ]);
        ctx.bnMeta.appendChild(dEl);
        if (dLabel) ctx.bnMeta.appendChild(h('span', { class: 'mcp-bn__dl', text: dLabel }));
      }
      ctx.bnMeta.hidden = !ctx.bnMeta.childNodes.length;
      ctx.bnNote.textContent = o.note || '';
      ctx.bnNote.hidden = !o.note;
      card.setAttribute('aria-label', bnSummary(ctx, o));
    },
    summary: function (ctx, o) { return bnSummary(ctx, o); },
    destroy: function (ctx) { if (ctx.countStop) { ctx.countStop(); ctx.countStop = null; } }
  });
  /** status 'neutral': a plain chip with words and no status colour (a figure that is not judged by a fixed band). */
  function bnTone(o, v) {
    if (o.status != null && String(o.status).toLowerCase() === 'neutral') return 'neutral';
    return toneOf(o.status) || (o.status == null && v == null ? 'none' : null);
  }
  function bnSummary(ctx, o) {
    var spec = o.format || 'int';
    var v = typeof o.value === 'string' ? o.value : toNum(o.value);
    var tone = bnTone(o, v);
    /* the words the card shows: the same text as the number on screen (A-16) */
    var vp = valueParts(v, spec, o.unit, null);
    var vt = v == null ? 'tidak ada data' : (vp.cur ? vp.cur + ' ' : '') + vp.n + (vp.mag ? (vp.mag === '%' ? '' : ' ') + vp.mag : '') + (vp.unit ? ' ' + vp.unit : '');
    var parts = [(o.label || 'Nilai') + ': ' + vt];
    var chipT = tone ? chipText(o.status == null ? 'noData' : o.status, tone, o.statusLabel) : '';
    if (chipT) parts.push((tone === 'neutral' ? '' : 'Status: ') + chipT);
    var dl = o.delta, dv = dl != null && typeof dl === 'object' ? toNum(dl.value) : toNum(dl);
    if (dv != null) {
      var dSpec = (dl && dl.format) || o.deltaFormat || (isPctSpec(spec) ? 'pp' : spec);
      var mag = dSpec === 'pp' ? fmtNum(Math.abs(dv) * 100, 1) + ' pp' : formatter(dSpec)(Math.abs(dv));
      parts.push((dv > 0 ? 'Naik ' : dv < 0 ? 'Turun ' : 'Tetap ') + mag + (((dl && dl.label) || o.deltaLabel) ? ' ' + ((dl && dl.label) || o.deltaLabel) : ''));
    }
    if (o.note) parts.push(String(o.note).replace(/[.\s]+$/, ''));
    return parts.join('. ') + '.';
  }
  function countUp(node, from, to, f, dur) {
    if (reducedMotion() || !dur) { node.textContent = f(to); return function () {}; }
    var t0 = 0, id = 0, stopped = false;
    function step(t) {
      if (stopped) return;
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      node.textContent = f(from + (to - from) * easeOutCubic(p));
      if (p < 1) id = raf(step);
      else node.textContent = f(to);
    }
    node.textContent = f(from);
    id = raf(step);
    return function () { stopped = true; caf(id); node.textContent = f(to); };
  }

  /* ──────────────────────────────────────────────────────────────────────
   * 13. rankedBars(el, {items, onSelect, …}, cfg?)  (COPY_STYLE_EN items 31, 37, 38)
   *    Named rankings in glass: a rank badge (1–n), the name with an optional
   *    map symbol, the value label in Indonesian format and a gradient bar with
   *    a soft inner highlight, a gentle shadow and rounded ends. Calm: no 3D,
   *    no perspective, no count-up.
   *    items: [{id, label, sub?, value, valueLabel?, valueNote?, chip?: {text, tone},
   *             symbol?, title?, aria?, parts?, levels?}]
   *      sub: a string, or an array of short parts shown as "a · b · c"; a part never breaks
   *           inside (e.g. "4,2 km dari KCP · ± 14 menit" stays on one line).
   *      valueNote: a short note ("(perkiraan)") shown in the line under the bar.
   *      chip tones: 'edc' (Sasaran EDC, gold), 'up' (Naik ke EDC), 'lvm' (neutral), 'plain'.
   *      parts: [{value, cls: 'a' | 'b'}] splits the bar into two shades (e.g. siswa 17+ and
   *             di bawah 17); the bar length is still `value`.
   *      symbol: a Node, fn(item) → Node, or {shape: 'circle' | 'diamond' | 'rsq',
   *              tone: 'negeri' | 'swasta' | any status tone, star: bool} (item 34)
   *      levels: [{key, label, word, step: 1 | 2 | 3 (0 = no data), why?}] — small level dots
   *              at the right of the name (item 37: nilai belanja, keramaian, daya beli area;
   *              ring = rendah, half = sedang, full = tinggi). Their words and one plain reason
   *              each show in a small card on hover or keyboard focus, and are read in the
   *              row's accessible name. Never a bare score.
   *    Options: max (rows shown, default 5) · format ('int' | fn) · scaleMax (the
   *      value of a full bar; default the largest shown) · sort (default true:
   *      largest first, ties keep their order) · tone ('brand' | 'navy' | 'gold' |
   *      a status tone) · bars (false: a named list without bars, e.g. merchants where
   *      a bar would only repeat the rank) · selected (id of the highlighted row) · pressable (rows
   *      are toggle buttons with aria-pressed) · actionHint (words read after
   *      every row, e.g. "Buka di peta Sekolah") · label (name of the list) ·
   *      emptyText · onSelect(item, event).
   *    Accessible: an <ol> of rows; with onSelect every row is a <button> (Tab,
   *    Enter, Space) whose name reads "1. Name, value, sub. actionHint".
   *    Motion (item 38, transform and opacity only): rows are keyed by id. New rows
   *    fade up one after the other (35 ms apart) and their bars grow from 0; kept rows
   *    slide to their new place and their bars morph from the old length (FLIP:
   *    scaleX from the old length, the width is set once); rows that leave fade out
   *    in place before the new ones show (a fade-through: two names never overlap).
   *    Everything settles in --dur-base after its 35 ms step. The first entrance
   *    waits until the list is scrolled into view (IntersectionObserver, keyboard
   *    focus or a 6 s safety timer). Nothing moves under
   *    prefers-reduced-motion or animate: false.
   * ────────────────────────────────────────────────────────────────────── */
  var RK_TONE = { brand: 1, navy: 1, gold: 1, ok: 1, mid: 1, bad: 1, none: 1, potential: 1 };
  var RK_SYM_TONE = { negeri: 1, swasta: 1, tni: 1 };
  /* Timing (item 38), the same numbers as the CSS of §13: rows and bars move in --dur-base, rows that leave fade in
     half of --dur-fast (a fade-through: an old and a new name never overlap); MCD.motion.dur when the shell has it.
     A drill-down of five rows settles in 60 + 4 × 35 + 40 + 300 = 540 ms. */
  var RK_STEP_MS = 35;            /* stagger between rows (item 38: 30–40 ms; the CSS --rk-step) */
  var RK_LEAD_MS = 60;            /* new rows start while the old ones fade out (the CSS --rk-lead) */
  var RK_LAG_MS = 40;             /* a new bar grows this long after its row starts (the CSS --rk-lag) */
  var RK_SAFETY_MS = 6000;        /* the first entrance never waits longer than this */
  /** A duration of the motion scale in ms: MCD.motion.dur[name] when present, else the token's own value. */
  function rkMs(name) {
    var Mo = MCD.motion, d = Mo && Mo.dur ? Mo.dur[name] : null;
    return isNum(d) && d >= 0 ? d : ({ fast: 180, base: 300, slow: 500 })[name];
  }
  function rkTone(x) {
    if (x != null && RK_TONE[String(x)]) return String(x);
    return toneOf(x) || 'brand';
  }
  function rkStar(cx, cy, ro, ri) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? ri : ro, a = (-90 + i * 36) * Math.PI / 180;
      p.push((cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2));
    }
    return 'M' + p.join(' L') + ' Z';
  }
  /** The item-34 school symbol as a small SVG (tokens through CSS classes), or the caller's own node. */
  function rkSymbol(sym, it) {
    if (!sym) return null;
    if (typeof sym === 'function') { try { sym = sym(it); } catch (e) { return null; } }
    if (!sym) return null;
    if (sym.nodeType === 1) return sym;
    var shape = sym.shape === 'diamond' || sym.shape === 'rsq' ? sym.shape : 'circle';
    var t = String(sym.tone || '');
    var tone = RK_SYM_TONE[t] ? t : (toneOf(t) || 'negeri');
    var svg = s('svg', { class: 'mcp-rk__sym mcp-rk__sym--' + tone + ' is-' + shape, viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': 'true', focusable: 'false' });
    if (shape === 'circle') svg.appendChild(s('circle', { class: 'mcp-rk__symf', cx: 8, cy: 8, r: 6.2 }));
    else if (shape === 'diamond') svg.appendChild(s('path', { class: 'mcp-rk__symf', d: 'M8 1.2 L14.8 8 L8 14.8 L1.2 8 Z' }));
    else svg.appendChild(s('rect', { class: 'mcp-rk__symf', x: 2, y: 2, width: 12, height: 12, rx: 3.4 }));
    if (sym.star) svg.appendChild(s('path', { class: 'mcp-rk__star', d: rkStar(8, 8.3, 4.4, 1.9) }));
    return svg;
  }
  /** One level dot ({step: 0–3}); the level is in its shape (ring, half, full), never in colour alone. */
  function rkDot(step) { return h('span', { class: 'mcp-rk__dot is-' + (isNum(step) ? clamp(step, 0, 3) : 0) }); }
  function rkLevels(list) {
    if (!Array.isArray(list)) return null;
    var out = list.map(function (l) {
      if (!l || !l.label) return null;
      var st = toNum(l.step);
      return { key: String(l.key || l.label).replace(/[^a-z0-9-]/gi, '').toLowerCase(), label: String(l.label), word: l.word ? String(l.word) : '',
        step: st == null ? 0 : clamp(Math.round(st), 0, 3), why: l.why ? String(l.why) : '' };
    }).filter(Boolean);
    return out.length ? out : null;
  }
  /** "Nilai belanja besar, Keramaian sedang, Daya beli area tinggi" (the row's spoken words). */
  function rkLevelWords(lv) { return (lv || []).map(function (l) { return l.label + ' ' + (l.word || 'belum ada data'); }).join(', '); }

  /* ── The factor card (item 37; v5, V4 open item 7) ──────────────────────────────────────────────────────────────
     The words of the level dots show in a small card BESIDE the row, outside the list, so it never covers the row
     below. One card for the page, in the overlay layer (#overlay-root, else <body>): a glass panel clips what is
     drawn inside it, and its backdrop-filter would hold a fixed child. Placement: MCD.windows.place(el, anchorRect,
     {avoid, sides}) when the shell has it (checked afterwards: on screen and clear of its row), else rkPlace below.
     Hover (after 160 ms, pointers that hover) or keyboard focus (:focus-visible) shows it; leaving the row, blur,
     a scroll, a resize or a redraw of the row hides it. Opacity and translate only; instant under reduced motion. */
  var RK_CARD_DELAY = 160;
  var RK_SIDES = ['left', 'right', 'bottom', 'top'];
  var RKC = { el: null, r: null, t: 0, hideT: 0, watching: false };
  function rkRect(x, y, w, hh) { return { x: x, y: y, w: w, h: hh, left: x, top: y, width: w, height: hh, right: x + w, bottom: y + hh }; }
  function rkBox(n) {
    if (!n || typeof n.getBoundingClientRect !== 'function') return null;
    var b = n.getBoundingClientRect();
    return rkRect(b.left, b.top, b.width, b.height);
  }
  function rkHits(a, b, m) { m = m || 0; return a.x < b.x + b.w + m && a.x + a.w > b.x - m && a.y < b.y + b.h + m && a.y + a.h > b.y - m; }
  /**
   * rkPlace({w, h}, anchor {x, y, w, h}, {vw, vh, sides?, avoid?: [rect], gap?: 8, margin?: 8}) → {x, y, side, fits}
   * (client px, pure). The first side in `sides` where the card fits inside the viewport and crosses no `avoid` rect;
   * beside the anchor (left / right) it may slide up or down, above or below it may slide sideways. When no side fits:
   * below the anchor, clamped into the viewport (fits: false).
   */
  function rkPlace(size, a, o) {
    o = o || {};
    var w = size.w, hh = size.h, g = isNum(o.gap) ? o.gap : 8, m = isNum(o.margin) ? o.margin : 8;
    var vw = isNum(o.vw) ? o.vw : (W.innerWidth || 1280), vh = isNum(o.vh) ? o.vh : (W.innerHeight || 800);
    var sides = Array.isArray(o.sides) && o.sides.length ? o.sides : RK_SIDES, avoid = Array.isArray(o.avoid) ? o.avoid : [];
    var clampX = function (x) { return Math.max(m, Math.min(x, vw - m - w)); };
    var clampY = function (y) { return Math.max(m, Math.min(y, vh - m - hh)); };
    function at(side) {
      if (side === 'right') return { x: a.x + a.w + g, y: clampY(a.y + a.h / 2 - hh / 2), side: side };
      if (side === 'left') return { x: a.x - g - w, y: clampY(a.y + a.h / 2 - hh / 2), side: side };
      if (side === 'top') return { x: clampX(a.x + Math.min(44, a.w / 4)), y: a.y - g - hh, side: side };
      return { x: clampX(a.x + Math.min(44, a.w / 4)), y: a.y + a.h + g, side: 'bottom' };
    }
    for (var i = 0; i < sides.length; i++) {
      var c = at(sides[i]), box = rkRect(c.x, c.y, w, hh);
      if (c.x < m - 0.5 || c.x + w > vw - m + 0.5 || c.y < m - 0.5 || c.y + hh > vh - m + 0.5) continue;
      if (rkHits(box, a, 0)) continue;
      if (avoid.some(function (r) { return r && rkHits(box, r, 0); })) continue;
      c.fits = true;
      return c;
    }
    var last = at('bottom');
    last.y = clampY(last.y);
    last.fits = false;
    return last;
  }
  /** True when the card's place is on screen and clear of its row (a check of MCD.windows.place). */
  function rkPlacedOk(box, a, vw, vh) {
    return !!box && box.w > 0 && box.x >= -0.5 && box.y >= -0.5 && box.x + box.w <= vw + 0.5 && box.y + box.h <= vh + 0.5 && !rkHits(box, a, -1);
  }
  function rkCardEl() {
    if (RKC.el && RKC.el.parentNode) return RKC.el;
    var host = (typeof D.getElementById === 'function' && D.getElementById('overlay-root')) || D.body;
    if (!host) return null;
    RKC.el = h('div', { class: 'mcp-rk-card', 'aria-hidden': 'true' });
    RKC.el.hidden = true;
    host.appendChild(RKC.el);
    return RKC.el;
  }
  function rkCardWatch(on) {
    if (on === RKC.watching || typeof W.addEventListener !== 'function') return;
    RKC.watching = on;
    var f = on ? 'addEventListener' : 'removeEventListener';
    W[f]('scroll', rkCardHideNow, true);
    W[f]('resize', rkCardHideNow);
  }
  /** Fills and places the card for row r (its item's levels), then fades it in. */
  function rkCardShow(r) {
    W.clearTimeout(RKC.t); RKC.t = 0;
    W.clearTimeout(RKC.hideT); RKC.hideT = 0;
    var it = r && r.item, lv = it && it.levels;
    if (!lv || !lv.length || !r.el.parentNode || r.el.classList.contains('is-leaving')) return false;
    var el = rkCardEl();
    if (!el) return false;
    el.textContent = '';
    el.appendChild(h('p', { class: 'mcp-rk-card__t', text: it.label }));
    lv.forEach(function (l) {
      el.appendChild(h('span', { class: 'mcp-rk__popl' }, [rkDot(l.step),
        h('span', { class: 'mcp-rk__popt' }, [h('span', { class: 'mcp-rk__popk', text: l.label + ': ' }),
          h('span', { text: (l.word || 'belum ada data') + (l.why ? ' — ' + l.why : '') })])]));
    });
    el.classList.remove('is-in');
    el.hidden = false;
    RKC.r = r;
    var a = rkBox(r.box), list = r.el.parentNode, avoid = list ? [rkBox(list)] : [];
    var vw = W.innerWidth || 1280, vh = W.innerHeight || 800;
    if (a) {
      var size = { w: el.offsetWidth || 280, h: el.offsetHeight || 96 };
      var p = rkPlace(size, a, { vw: vw, vh: vh, sides: RK_SIDES, avoid: avoid });
      el.style.setProperty('left', Math.round(p.x) + 'px');
      el.style.setProperty('top', Math.round(p.y) + 'px');
      el.setAttribute('data-side', p.side);
      var Wn = MCD.windows;
      if (Wn && typeof Wn.place === 'function') {
        /* the shell's placement for popovers and hover cards; kept only when it lands on screen and clear of the row */
        var mine = { x: p.x, y: p.y }, got = null;
        try { Wn.place(el, a, { avoid: avoid, sides: RK_SIDES.slice() }); got = rkBox(el); } catch (e) { got = null; }
        var crosses = !!got && avoid.some(function (q) { return q && rkHits(got, q, -1); });
        if (!rkPlacedOk(got, a, vw, vh) || (p.fits && crosses)) {
          el.style.removeProperty('transform');
          el.style.setProperty('left', Math.round(mine.x) + 'px');
          el.style.setProperty('top', Math.round(mine.y) + 'px');
        }
      }
    }
    if (reducedMotion()) el.classList.add('is-in');
    else { void el.offsetWidth; el.classList.add('is-in'); }
    rkCardWatch(true);
    return true;
  }
  function rkCardHideNow() {
    W.clearTimeout(RKC.t); RKC.t = 0;
    W.clearTimeout(RKC.hideT); RKC.hideT = 0;
    RKC.r = null;
    rkCardWatch(false);
    if (RKC.el) { RKC.el.classList.remove('is-in'); RKC.el.hidden = true; }
  }
  /** Hides the card of row r (or any card when r is omitted): a short fade, then hidden. */
  function rkCardHide(r) {
    W.clearTimeout(RKC.t); RKC.t = 0;
    if (r && RKC.r && RKC.r !== r) return;
    if (!RKC.el || RKC.el.hidden) { RKC.r = null; return; }
    RKC.r = null;
    rkCardWatch(false);
    RKC.el.classList.remove('is-in');
    if (reducedMotion()) { RKC.el.hidden = true; return; }
    W.clearTimeout(RKC.hideT);
    RKC.hideT = W.setTimeout(function () { RKC.hideT = 0; if (RKC.el && !RKC.r) RKC.el.hidden = true; }, rkMs('fast') + 20);
  }
  function rkFocusVisible(n) {
    try { return typeof n.matches === 'function' ? n.matches(':focus-visible') : true; } catch (e) { return true; }
  }
  /** The listeners of one row: hover (pointers that hover, after a short pause) and keyboard focus. */
  function rkCardWire(r) {
    r.el.addEventListener('pointerenter', function (ev) {
      if (!r.float || !r.item || !r.item.levels || (ev && ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen')) return;
      W.clearTimeout(RKC.t);
      RKC.t = W.setTimeout(function () { RKC.t = 0; rkCardShow(r); }, RK_CARD_DELAY);
    });
    r.el.addEventListener('pointerleave', function () { if (RKC.r === r || RKC.t) rkCardHide(); });
    r.box.addEventListener('focus', function () { if (r.float && r.item && r.item.levels && rkFocusVisible(r.box)) rkCardShow(r); });
    r.box.addEventListener('blur', function () { rkCardHide(r); });
  }
  /** Is the floating card possible here (a document with a body and a layout)? Else the card stays in the row (CSS). */
  function rkFloatOk() { return !!(D.body && typeof D.createElement === 'function' && typeof W.getComputedStyle === 'function'); }
  function rkItems(o) {
    var list = (o.items || []).map(function (it, i) {
      if (!it) return null;
      var v = toNum(it.value);
      if (v == null) return null;
      var subs = Array.isArray(it.sub) ? it.sub.filter(function (x) { return x != null && x !== ''; }).map(String) : (it.sub ? [String(it.sub)] : []);
      var parts = Array.isArray(it.parts) ? it.parts.map(function (p) { return p ? { value: Math.max(0, toNum(p.value) || 0), cls: String(p.cls || 'a').replace(/[^a-z0-9-]/gi, '') } : null; }).filter(Boolean) : null;
      return { src: it, i: i, id: String(it.id != null ? it.id : i), label: String(it.label == null ? '' : it.label), sub: subs.join(' · '), subs: subs,
        value: v, valueLabel: it.valueLabel != null ? String(it.valueLabel) : null, valueNote: it.valueNote ? String(it.valueNote) : '',
        chip: it.chip && it.chip.text ? { text: String(it.chip.text), tone: String(it.chip.tone || 'plain') } : null,
        parts: parts && parts.length ? parts : null, levels: rkLevels(it.levels),
        symbol: it.symbol || null, title: it.title ? String(it.title) : '', aria: it.aria ? String(it.aria) : '' };
    }).filter(Boolean);
    if (o.sort !== false) list.sort(function (a, b) { return (b.value - a.value) || (a.i - b.i); });
    var n = isNum(o.max) && o.max > 0 ? Math.floor(o.max) : 5;
    return list.slice(0, n);
  }
  function rkRow(ctx) {
    var clickable = typeof (ctx.o || {}).onSelect === 'function';
    var r = { el: h('li', { class: 'mcp-rk__row' }), shownW: 0 };
    r.box = h(clickable ? 'button' : 'div', clickable ? { type: 'button', class: 'mcp-rk__btn' } : { class: 'mcp-rk__btn is-static' });
    r.badge = h('span', { class: 'mcp-rk__badge', 'aria-hidden': 'true' });
    r.sym = h('span', { class: 'mcp-rk__symw', 'aria-hidden': 'true' });
    r.label = h('span', { class: 'mcp-rk__l' });
    r.value = h('span', { class: 'mcp-rk__v' });
    r.lv = h('span', { class: 'mcp-rk__lv', 'aria-hidden': 'true' });
    r.note = h('span', { class: 'mcp-rk__vn' });
    r.fill = h('span', { class: 'mcp-rk__fill' });
    r.chip = h('span', { class: 'mcp-rk__chip' });
    r.sub = h('span', { class: 'mcp-rk__sub' });
    r.meta = h('span', { class: 'mcp-rk__meta' }, [r.chip, r.sub, r.note]);
    /* the words of the level dots: a small card under the row on hover or keyboard focus (read in the row's name) */
    r.pop = h('span', { class: 'mcp-rk__pop', 'aria-hidden': 'true' });
    var main = h('span', { class: 'mcp-rk__main', 'aria-hidden': clickable ? 'true' : null }, [
      h('span', { class: 'mcp-rk__top' }, [h('span', { class: 'mcp-rk__name' }, [r.sym, r.label]), h('span', { class: 'mcp-rk__val' }, [r.value, r.lv])]),
      h('span', { class: 'mcp-rk__track' }, r.fill),
      r.meta
    ]);
    appendKids(r.box, [r.badge, main, clickable ? h('span', { class: 'mcp-rk__go', 'aria-hidden': 'true', text: '›' }) : null]);
    r.el.appendChild(r.box);
    r.el.appendChild(r.pop);
    r.clickable = clickable;
    r.float = !!ctx.rkFloat;
    rkCardWire(r);
    if (clickable) {
      r.box.addEventListener('click', function (ev) {
        var o = ctx.o || {};
        if (typeof o.onSelect === 'function' && r.item) { try { o.onSelect(r.item.src, ev); } catch (e) { console.error(e); } }
      });
    }
    return r;
  }
  function rkFill(r, it, rank, o, f, top) {
    r.item = it;
    r.badge.textContent = String(rank);
    r.label.textContent = it.label;
    var vt = it.valueLabel != null ? it.valueLabel : f(it.value);
    r.value.textContent = vt;
    r.value.hidden = !vt;
    r.note.textContent = it.valueNote || '';
    r.note.hidden = !it.valueNote;
    r.sym.textContent = '';
    var sy = rkSymbol(it.symbol, it.src);
    if (sy) r.sym.appendChild(sy);
    r.sym.hidden = !sy;
    r.chip.textContent = it.chip ? it.chip.text : '';
    r.chip.className = 'mcp-rk__chip' + (it.chip ? ' mcp-rk__chip--' + it.chip.tone.replace(/[^a-z0-9-]/gi, '') : '');
    r.chip.hidden = !it.chip;
    /* each part of the line under the bar stays whole; the line breaks only between parts */
    r.sub.textContent = '';
    it.subs.forEach(function (t, k) {
      if (k) r.sub.appendChild(D.createTextNode(' · '));
      r.sub.appendChild(h('span', { class: 'mcp-rk__subp', text: t }));
    });
    r.sub.hidden = !it.sub;
    r.meta.hidden = !it.sub && !it.chip && !it.valueNote;
    /* level dots (item 37) and their words */
    var lv = it.levels || [];
    r.lv.textContent = '';
    r.pop.textContent = '';
    lv.forEach(function (l) {
      var d = rkDot(l.step);
      d.classList.add('mcp-rk__dot--' + l.key);
      r.lv.appendChild(d);
      r.pop.appendChild(h('span', { class: 'mcp-rk__popl' }, [rkDot(l.step),
        h('span', { class: 'mcp-rk__popt' }, [h('span', { class: 'mcp-rk__popk', text: l.label + ': ' }),
          h('span', { text: (l.word || 'belum ada data') + (l.why ? ' — ' + l.why : '') })])]));
    });
    r.lv.hidden = !lv.length;
    r.pop.hidden = !lv.length;
    r.el.classList.toggle('has-lv', !!lv.length);
    /* a bar in two shades (parts): each part's share of the bar */
    var tot = 0;
    (it.parts || []).forEach(function (p) { tot += p.value; });
    r.fill.classList.toggle('is-split', !!(it.parts && tot > 0));
    r.fill.textContent = '';
    if (it.parts && tot > 0) {
      it.parts.forEach(function (p) {
        var seg = h('span', { class: 'mcp-rk__part mcp-rk__part--' + p.cls });
        seg.style.setProperty('width', (p.value / tot * 100).toFixed(2) + '%');
        r.fill.appendChild(seg);
      });
    }
    var sel = o.selected != null && String(o.selected) === it.id;
    r.el.classList.toggle('is-sel', sel);
    r.el.setAttribute('data-k', it.id);
    if (r.clickable) {
      if (o.pressable) r.box.setAttribute('aria-pressed', sel ? 'true' : 'false');
      else r.box.removeAttribute('aria-pressed');
      var words = it.aria || [rank + '. ' + it.label, [vt, it.valueNote].filter(Boolean).join(' '), it.chip ? it.chip.text : '', it.sub, rkLevelWords(lv)].filter(Boolean).join(', ');
      r.box.setAttribute('aria-label', words + (o.actionHint ? '. ' + o.actionHint : ''));
    }
    if (it.title) r.box.setAttribute('title', it.title); else r.box.removeAttribute('title');
    r.w = top > 0 ? Math.max(0, Math.min(1, it.value / top)) : 0;
  }
  /** The bar length on screen: tiny values keep a visible stub (3,5%). */
  function rkW(r) { return r.w > 0 ? Math.max(r.w, 0.035) : 0; }
  function rkPct(w) { return (w * 100).toFixed(2) + '%'; }
  /** Starts the transitions of rows whose start state is set (entering rows, FLIP rows, morphing bars). */
  function rkPlay(ctx, rows) {
    var entering = [];
    rows.forEach(function (r) {
      r.el.classList.remove('is-flip');
      r.el.style.setProperty('transform', '');
      if (r.el.classList.contains('is-enter')) { r.el.classList.remove('is-enter'); r.el.classList.add('is-entering'); entering.push(r); }
      r.fill.classList.remove('is-set');
      r.fill.style.setProperty('transform', '');
    });
    if (!entering.length) return;
    if (ctx.rkT) W.clearTimeout(ctx.rkT);
    var last = entering.reduce(function (m, r) { return Math.max(m, r.idx || 0); }, 0);
    var lead = ctx.rkGone && ctx.rkGone.length ? RK_LEAD_MS : 0;
    ctx.rkT = W.setTimeout(function () {
      ctx.rkT = 0;
      entering.forEach(function (r) { r.el.classList.remove('is-entering'); });
    }, lead + last * RK_STEP_MS + RK_LAG_MS + rkMs('base') + 60);
  }
  /** The first entrance: plays once the list is on screen (or focused), never later than RK_SAFETY_MS. */
  function rkWatch(ctx) {
    if (ctx.rkWatching) return;
    ctx.rkWatching = true;
    var list = ctx.rkList;
    function go() {
      if (ctx.destroyed || !ctx.rkWait || list !== ctx.rkList) { stop(); return; }
      stop();
      ctx.rkWait = false;
      var rows = (ctx.m ? ctx.m.items : []).map(function (it) { return ctx.rkRows[it.id]; }).filter(Boolean);
      void list.offsetWidth;
      rkPlay(ctx, rows);
    }
    function stop() {
      ctx.rkWatching = false;
      if (ctx.rkIO) { try { ctx.rkIO.disconnect(); } catch (e) { /* ignore */ } ctx.rkIO = null; }
      if (ctx.rkSafeT) { W.clearTimeout(ctx.rkSafeT); ctx.rkSafeT = 0; }
      list.removeEventListener('focusin', go);
    }
    ctx.rkStopWatch = stop;
    list.addEventListener('focusin', go);
    if (typeof W.IntersectionObserver === 'function') {
      try {
        ctx.rkIO = new W.IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) go(); }, { threshold: 0.12 });
        ctx.rkIO.observe(list);
      } catch (e) { ctx.rkIO = null; }
    }
    ctx.rkSafeT = W.setTimeout(go, ctx.rkIO ? RK_SAFETY_MS : 0);
  }
  /** Rows that leave fade out where they were (absolutely placed, no hit target, hidden from assistive tech). */
  function rkLeave(ctx, gone, listBox) {
    var list = ctx.rkList;
    gone.forEach(function (g) {
      var el = g.r.el;
      el.classList.add('is-leaving');
      el.classList.remove('is-entering');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('inert', '');
      el.style.setProperty('top', (g.box.top - listBox.top).toFixed(1) + 'px');
      el.style.setProperty('left', (g.box.left - listBox.left).toFixed(1) + 'px');
      el.style.setProperty('width', g.box.width.toFixed(1) + 'px');
      el.style.setProperty('transform', '');
      list.appendChild(el);                       /* after the rows in rank order; it fades (is-out) once this
                                                     place is committed, a moved node has no old style to fade from */
      ctx.rkGone.push(el);
    });
    list.classList.add('is-xfade');
    list.style.setProperty('--rk-lead', RK_LEAD_MS + 'ms');
    if (ctx.rkGoneT) W.clearTimeout(ctx.rkGoneT);
    ctx.rkGoneT = W.setTimeout(function () { ctx.rkGoneT = 0; rkFlushGone(ctx); }, Math.round(rkMs('fast') / 2) + 60);
  }
  function rkFlushGone(ctx) {
    (ctx.rkGone || []).forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
    ctx.rkGone = [];
    if (ctx.rkList) { ctx.rkList.classList.remove('is-xfade'); ctx.rkList.style.removeProperty('--rk-lead'); }
  }
  /** True when the factor card on screen belongs to a row of this chart. */
  function rkOwnsCard(ctx) { var r = RKC.r; return !!r && !!ctx.rkRows && Object.keys(ctx.rkRows).some(function (k) { return ctx.rkRows[k] === r; }); }
  function rkDrop(ctx) {
    if (rkOwnsCard(ctx)) rkCardHideNow();
    if (ctx.rkStopWatch) ctx.rkStopWatch();
    rkFlushGone(ctx);
    if (ctx.rkList && ctx.rkList.parentNode) ctx.rkList.parentNode.removeChild(ctx.rkList);
    ctx.rkList = null; ctx.rkRows = {}; ctx.rkWait = false;
  }
  var rankedBars = make('rankedBars', {
    svg: false, d3: false, natural: true, role: false,
    render: function (ctx, o) {
      var f = formatter(o.format || 'int');
      var items = rkItems(o);
      var top = isNum(o.scaleMax) && o.scaleMax > 0 ? o.scaleMax : items.reduce(function (m, it) { return Math.max(m, it.value); }, 0);
      var clickable = typeof o.onSelect === 'function';
      /* motion on the first draw and on update(); a resize, a theme or font change redraws in place */
      var allowed = o.animate !== false && !reducedMotion();
      var motion = allowed && !!ctx.anim;
      ctx.m = { items: items, f: f };
      ctx.rkGone = ctx.rkGone || [];
      /* a redraw (data, resize, theme) hides the factor card of this list; the next hover or focus shows it again */
      if (rkOwnsCard(ctx)) rkCardHideNow();
      ctx.rkFloat = rkFloatOk();
      var old = ctx.plot.querySelector('.mcp-empty');
      if (old) old.parentNode.removeChild(old);
      /* a change between clickable and static rows rebuilds the rows */
      if (ctx.rkList && ctx.rkClickable !== clickable) rkDrop(ctx);
      if (!items.length) {
        rkDrop(ctx);
        ctx.empty(o.emptyText || 'Belum ada data.');
        return;
      }
      if (!ctx.rkList) {
        ctx.rkList = h('ol', { class: 'mcp-rk' });
        ctx.rkRows = {};
        ctx.rkClickable = clickable;
        ctx.rkWait = allowed;                         /* the first entrance waits until the list is seen */
        ctx.plot.appendChild(ctx.rkList);
      }
      var list = ctx.rkList, wait = !!ctx.rkWait && allowed;
      list.className = 'mcp-rk mcp-rk--' + rkTone(o.tone) + (clickable ? ' is-clickable' : '') + (o.bars === false ? ' is-nobar' : '') + (ctx.rkGone.length ? ' is-xfade' : '') +
        (ctx.rkFloat ? ' is-float' : '');
      list.setAttribute('aria-label', o.label || 'Peringkat');
      /* 1. read where every row is now, before any write (one layout) */
      var before = {}, listBox = null;
      if (motion && !wait) {
        listBox = list.getBoundingClientRect();
        Object.keys(ctx.rkRows).forEach(function (k) { before[k] = ctx.rkRows[k].el.getBoundingClientRect(); });
      }
      /* 2. rows that leave: cross-fade out in place (with motion), else removed at once */
      var gone = [];
      Object.keys(ctx.rkRows).forEach(function (k) {
        if (items.some(function (it) { return it.id === k; })) return;
        var r = ctx.rkRows[k];
        if (motion && !wait && before[k] && before[k].height > 0) gone.push({ r: r, box: before[k] });
        else if (r.el.parentNode) r.el.parentNode.removeChild(r.el);
      });
      if (gone.length) rkLeave(ctx, gone, listBox);
      /* 3. fill the rows in rank order; rows already in place are not moved (a focused row keeps the focus) */
      var keep = {}, fresh = [], act = D.activeElement;
      items.forEach(function (it, i) {
        var r = ctx.rkRows[it.id];
        if (!r) { r = rkRow(ctx); fresh.push(r); r.isNew = true; } else r.isNew = false;
        r.prevW = r.isNew ? 0 : (r.shownW || 0);
        rkFill(r, it, i + 1, o, f, top);
        r.idx = i;
        if (list.children[i] !== r.el) list.insertBefore(r.el, list.children[i] || null);
        keep[it.id] = r;
      });
      ctx.rkRows = keep;
      if (act && act !== D.activeElement && typeof act.focus === 'function' && list.contains(act)) { try { act.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      var rows = items.map(function (it) { return keep[it.id]; });
      if (!motion && !wait) {
        if (ctx.rkStopWatch) ctx.rkStopWatch();
        ctx.rkWait = false;
        rows.forEach(function (r) {
          r.el.classList.remove('is-entering'); r.el.classList.remove('is-enter'); r.el.classList.remove('is-flip');
          r.el.style.setProperty('transform', '');
          r.fill.classList.remove('is-set');
          r.fill.style.setProperty('transform', '');
          r.fill.style.setProperty('width', rkPct(rkW(r)));
          r.shownW = rkW(r);
        });
        return;
      }
      /* 4. start states: new rows faded and low with a bar at 0; kept bars at their old length (scaleX) */
      fresh.forEach(function (r) { r.el.classList.add('is-enter'); });
      rows.forEach(function (r) {
        var w = rkW(r);
        r.el.style.setProperty('--rk-i', String(r.idx));
        r.fill.style.setProperty('width', rkPct(w));
        if (r.isNew || wait) { r.fill.classList.add('is-set'); r.fill.style.setProperty('transform', 'scaleX(0)'); }
        else if (w > 0 && Math.abs(r.prevW - w) > 1e-4) { r.fill.classList.add('is-set'); r.fill.style.setProperty('transform', 'scaleX(' + (r.prevW / w).toFixed(4) + ')'); }
        r.shownW = w;
      });
      if (wait) { rkWatch(ctx); return; }
      /* 5. FLIP: read the new places (one layout), then move kept rows back to where they were */
      var moves = [];
      rows.forEach(function (r) {
        var b = before[r.item.id];
        if (r.isNew || !b) return;
        var dy = b.top - r.el.getBoundingClientRect().top;
        if (Math.abs(dy) > 1) moves.push([r, dy]);
      });
      moves.forEach(function (m) { m[0].el.classList.add('is-flip'); m[0].el.style.setProperty('transform', 'translateY(' + m[1].toFixed(1) + 'px)'); });
      void list.offsetWidth;                          /* commit the start state before the transitions */
      gone.forEach(function (g) { g.r.el.classList.add('is-out'); });
      rkPlay(ctx, rows);
    },
    destroy: function (ctx) {
      if (rkOwnsCard(ctx)) rkCardHideNow();
      if (ctx.rkT) { W.clearTimeout(ctx.rkT); ctx.rkT = 0; }
      if (ctx.rkGoneT) { W.clearTimeout(ctx.rkGoneT); ctx.rkGoneT = 0; }
      if (ctx.rkStopWatch) ctx.rkStopWatch();
      rkFlushGone(ctx);
    },
    summary: function () { return ''; },
    api: function (ctx) {
      return {
        /** The rows on screen, in rank order: [{id, label, value}] (tests and callers). */
        rows: function () { return ctx.m ? ctx.m.items.map(function (it) { return { id: it.id, label: it.label, value: it.value }; }) : []; }
      };
    }
  });

  /* ──────────────────────────────────────────────────────────────────────
   * Exports (merged into MCD.charts; charts.js keeps its own members)
   * ────────────────────────────────────────────────────────────────────── */
  MCD.charts = MCD.charts || {};
  assign(MCD.charts, {
    combo: combo,
    donut: donut,
    pie: pie,
    heatmap: heatmap,
    statusBar: statusBar,
    rankBars: rankBars,
    rankedBars: rankedBars,
    /** The item-34 school symbol as a small SVG ({shape, tone: 'negeri' | 'swasta' | 'tni', star}), for legends beside rankedBars. */
    schoolSymbol: function (spec) { return rkSymbol(spec, null); },
    bigNumber: bigNumber,
    /** The shared colour code, for maps, legends and tables that sit beside these charts. */
    status: {
      tone: toneOf,
      css: function (x) { var t = toneOf(x); return t ? cssVar(TONE_TOKEN[t]) : null; },
      color: function (x) { var t = toneOf(x); return t ? reader()(TONE_TOKEN[t]) : null; },
      token: function (x) { var t = toneOf(x); return t ? '--' + TONE_TOKEN[t] : null; },
      label: function (x, short) { var t = toneOf(x); return t ? statusLabel(t, short) : ''; },
      coverageTone: coverageTone,
      coverageWords: coverageWords,
      bands: bands,
      /* the ranked (relative) scale of COPY_STYLE_EN item 18: thirds, the same cut rule as MCD.territory */
      ranked: ranked,
      rankCuts: rankCuts,
      rankTone: rankTone,
      rankWords: rankWords,
      rankLegend: rankLegend,
      cutPct: cutPct
    },
    plus: { version: VERSION, refresh: rerenderAll, live: function () { return LIVE.length; }, features: { heatmapStatus: true, ranked: true, bigNumberHelp: true, rankBars: true, rankedBars: true, glass: true, factorCard: true },
      /* the floating factor card of rankedBars (v5): its pure placement rule, and show / hide for tests and callers */
      placeCard: rkPlace, factorCard: { show: rkCardShow, hide: rkCardHideNow, el: function () { return RKC.el; }, row: function () { return RKC.r; } } }
  });
  /* the same factory under the name the section lanes use (item 31) */
  MCD.chartsPlus = MCD.chartsPlus || {};
  MCD.chartsPlus.rankedBars = rankedBars;
})(window.MCD = window.MCD || {});
