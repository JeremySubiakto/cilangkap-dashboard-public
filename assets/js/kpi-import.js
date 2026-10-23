/* ==========================================================================
 * MCD.kpi: importer for the monthly KPI workbook of the area ("KPI Area <area>_ <bulan> <tahun>.xlsx"),
 * groundwork for the v7 "Posisi cabang" view (docs/COPY_STYLE_EN.md items 48c and 49). Method and
 * what to do when a month changes its layout: docs/KPI_IMPORT.md.
 *
 * PURE: no DOM, no storage, no network. The workbook is read in this browser by MCD.importer.read()
 * (SheetJS) and parsed here. Columns are found by their HEADER LABELS (group label such as "Tabungan",
 * then "Realisasi" / "Target" / "Pencapaian" under it), rows by the 5-digit branch code, never by
 * fixed cell addresses, so next month's file parses even when columns move. Columns found under a label are
 * checked against each other (Pencapaian = Realisasi ÷ Target, the workbook's own rule): a group whose
 * columns do not add up is not used (warning COLUMN_MISMATCH), never read silently. UMD wrapper: MCD.kpi in
 * the browser (classic script, after state.js and importer.js), module.exports in Node
 * (tests/kpi-import.test.mjs).
 *
 * Importer kind 'kpi' (registered like 'lvm' in lvm.js): the dataset 'kpi_cabang' (types 'kpi',
 * 'kpi_cabang', 'kpi_area'; bank data) and MCD.kpi.workbookReader, a whole-workbook reader with the
 * same interface as MCD.lvm.workbookReader. No column schema is registered with
 * MCD.importer.registerSchema(): the KPI file is a multi-sheet layout, not a one-sheet table, and a
 * schema for 'kpi_cabang' would make importer.applyDataset() re-parse the vault records as raw rows.
 *
 * API
 *   parseWorkbook(sheets, opts?) → model          sheets = Sheet[] from MCD.importer.read(); opts {file, home, period, areaCode}
 *     model = {ok, kind:'kpi', version, period:'YYYY-MM' | null, periodLabel:'Mei 2026', area:'Pasar Rebo' | null,
 *              areaCode, file, home:'12903', units, branches:[branch], areaTotal: branch | null, peerCount, rankOf,
 *              fields:[{key, label, unit, better, found, derived, sheet, header, columns, rankBy, tabs}],
 *              warnings:[{level:'warn'|'info', code, field, sheet, text}], sheets:{used, ignored, oldPeriod, scorecard}}
 *     branch = {code, name, kelas, home, peer, noData, isTotal, kpi, target, capaian, gap, kurang, rank, rankKelas, rankFile, rows}
 *       peer     on the area's scorecard; noData: a scorecard branch with every balance, booking, count and target 0
 *                this month (not ranked per KPI, warning NO_DATA)
 *       kpi / target / capaian / gap / kurang / rank share one shape (null where the file has no value):
 *       {dpk, tabungan, giro, deposito, casa, casaRatio, cof, dpkRetail,
 *        kredit:{consumer, kpr, kartu, …}, booking:{consumer, kpr, …} (two more products per group: HIDDEN, D41),
 *        nplRetail, nplConsumer, newCifTabungan, rekeningBersaldo, ureg, usak, fbi, skorKpi}
 *       capaian  from the file's "Pencapaian" column (not when actual and target are both 0 or empty); when absent:
 *                actual / target ("higher is better") or 2 − actual / target ("lower is better": CoF, NPL), the rule
 *                the workbook itself uses. nplRetail = NPL ÷ Total of RETAIL; null when that Total is 0 or empty
 *       gap      target − actual (as in the file's units); kurang = how far from the target in the bad
 *                direction (0 when met): max(0, target − actual), or max(0, actual − target) when lower is better
 *       rank     1 = best among the area's scorecard branches with data (peer && !noData), by capaian when the KPI
 *                has a target, else by the value (CoF / NPL low); ties share a rank; rankOf[key] = how many were
 *                ranked. skorKpi ranks every scorecard branch, as the file's own ranking does. rankKelas = rank of
 *                skorKpi within the same kelas (B.1, B.2, …). rankFile = the rank printed in the file's
 *                current-period ranking sheet (cross-check only)
 *       rows     {sheet name: spreadsheet row number} where this branch was read
 *   FIELDS · LEAF · HOME · DATASET · UNITS              field catalogue (key, label, unit, better, tabs), labels, constants
 *   get(obj, key) · keys()                              nested access by key ('kredit.kpr'), the field keys in order
 *   homeRows(model, code?, {all}?) → [{key, label, unit, better, actual, target, capaian, gap, kurang, met, rank, of, tabs}]
 *                                                        without the HIDDEN keys ({all: true}: tests only)
 *   HIDDEN · visibleWarnings(model) → warnings without those about a HIDDEN key (V8 §3.5, D41, D50)
 *   rankValues(list, better) → ranks                     competition ranking ("1, 2, 2, 4"), nulls stay null
 *   detect(sheetNames) → {ok, use, score}               by sheet names (cheap; the Data & Privasi file picker)
 *   detectSheets(sheets) → {ok, score, found}           by header labels (the whole check)
 *   toRecords(model) → records · fromRecords(records) → model     the dataset / vault form (one record per branch +
 *                                                         one area record with isTotal: true that carries the meta)
 *   apply(model, meta?)                                  → MCD.data.replace('kpi_cabang', …)
 *   workbookReader = {TYPE:'kpi', HOME, label, what, detect, read(file), toRecords, apply, periodLabel, summary}
 *   inspect(sheet) → {codeCol, nameCol, kelasCol, firstRow, header:[{row, labels:[{col, label}]}]} | null   (troubleshooting)
 *   num(v) · codeOf(v) · periodLabel('2026-05') → 'Mei 2026' · periodEnd('2026-05') → '2026-05-31' · register()
 *
 * Units: as in the workbook. Amounts in Rp juta, ratios as fractions (0.0123 = 1,23%), counts as counts,
 * the KPI score in points. User-facing text (labels, warnings) is plain Indonesian for branch staff.
 * D41 (23 Oct 2026; docs/V8_SPEC.md §3.5, D50): the outstanding and booking of the two credit products the user
 * removed are still READ, so the file check (columns that add up, totals) stays the same, but never shown: HIDDEN
 * lists their keys, homeRows() and visibleWarnings() leave them out, and no tab token points at them. The tab token
 * 'tni' is gone with the section (D39); giro and FBI gaps also point at hospitals ('health', D57).
 * Privacy: the workbook holds branch totals only. Only the columns listed in FIELDS are read, only for the
 * rows of the area; pivot tables and helper columns are never read. Nothing leaves the browser.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.kpi = api; api.register(); }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var VERSION = 1;
  var HOME = '12903';
  var HOME_NAME = 'KCP Jakarta Cilangkap';
  var DATASET = 'kpi_cabang';
  var MAX_HEAD = 6;                                  // header rows looked at above the first data row
  var UNITS = { rp: 'Rp juta', rasio: 'pecahan (0,05 = 5%)', jumlah: 'jumlah', poin: 'poin' };

  var MONTHS = [['jan', 'januari', 'january'], ['feb', 'februari', 'pebruari', 'february'], ['mar', 'maret', 'march'], ['apr', 'april'],
    ['mei', 'may'], ['jun', 'juni', 'june'], ['jul', 'juli', 'july'], ['agu', 'agt', 'ags', 'agustus', 'aug', 'august'],
    ['sep', 'sept', 'september'], ['okt', 'oktober', 'oct', 'october'], ['nov', 'nopember', 'november'], ['des', 'desember', 'dec', 'december']];
  var MONTH_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var MONTH_WORD = MONTHS.map(function (m) { return m.join('|'); }).join('|');

  /* ------------------------------------------------------------- helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function nonZero(x) { return isNum(x) && x !== 0; }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function fold(s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t.replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
  }
  function MCD() { return root && root.MCD ? root.MCD : null; }
  function fmtInt(n) {
    var M = MCD(), U = M && M.util && M.util.fmt;
    if (U && typeof U.int === 'function') return U.int(n);
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function q(s) { return '“' + s + '”'; }

  /** A cell as a number: numbers as they are; '1.234,5' · '1,234.5' · '5,2%' (→ 0.052) · '(12)' (→ −12); '-', '#N/A', text → null. */
  function num(v) {
    if (isNum(v)) return v;
    if (typeof v !== 'string') return null;
    var s = v.trim().replace(/−/g, '-');
    if (!s || s === '-' || s === '—' || s.charAt(0) === '#') return null;
    var pct = /%$/.test(s), neg = /^\(.*\)$/.test(s);
    s = s.replace(/%$/, '').replace(/^\((.*)\)$/, '$1').replace(/^rp\.?\s*/i, '').replace(/\s+/g, '');
    if (!/^-?[\d.,]+$/.test(s)) return null;
    var x = null, M = MCD();
    if (M && M.importer && M.importer.parse && typeof M.importer.parse.num === 'function') x = M.importer.parse.num(s);
    else {
      var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
      if (dots && commas) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
      else if (commas) s = commas > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
      else if (dots > 1 || /^-?\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
      x = Number(s);
    }
    if (!isNum(x)) return null;
    if (neg) x = -Math.abs(x);
    return pct ? x / 100 : x;
  }
  /** Branch / area code: 12903 · '12903' · '00615' · '901' → digits as text; anything else → null. */
  function codeOf(v) {
    var s = isNum(v) ? (Math.floor(v) === v && v >= 0 ? String(v) : '') : str(v).replace(/\.0+$/, '');
    return /^\d{1,6}$/.test(s) ? s : null;
  }
  function isBranch(c) { return !!c && c.length === 5; }
  /** Fast test for a 5-digit branch code (the table scan looks at every cell of sheets with 15.000+ rows). */
  function branchCode(v) {
    if (typeof v === 'number') return v >= 10000 && v < 100000 && Math.floor(v) === v ? String(v) : null;
    if (typeof v !== 'string') return null;
    var s = v.length === 5 ? v : v.trim();
    return s.length === 5 && /^\d{5}$/.test(s) ? s : null;
  }
  function sameCode(a, b) { return a != null && b != null && (a === b || (+a === +b && isFinite(+a))); }
  var KELAS_RE = /^([a-z]\.(\d+(\.\d+)?|o)|mmu)$/i;
  function nameLike(v) {
    if (typeof v !== 'string') return false;
    var s = v.trim();
    return s.length >= 4 && /[a-z]{2,}/i.test(s) && s.charAt(0) !== '#' && !KELAS_RE.test(s);
  }
  /** A header cell as a label: text with a letter (or a lone '%'); numbers, numeric text, errors and dates → ''. */
  function headLabel(v) {
    if (v == null || isNum(v) || typeof v === 'boolean' || (v && typeof v.getTime === 'function')) return '';
    var s = String(v).replace(/\s+/g, ' ').trim();
    if (!s || s.charAt(0) === '#' || /^[-+]?[\d.,\s]+%?$/.test(s)) return '';
    if (s !== '%' && !/[a-z]/i.test(s)) return '';
    return s;
  }
  /** Branch name for matching: folded, without "(dh …)" notes, without the leading city word, letters and digits only. */
  function nameKey(s) {
    return fold(s).replace(/\(.*?\)/g, ' ').replace(/^(kcp|kc|kk)\s+/, '').replace(/^jakarta\s+/, '').replace(/[^a-z0-9]+/g, '');
  }
  function titleCase(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s.\-/(])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  /* ------------------------------------------------------------- periods */

  function monthIndex(word) {
    var w = fold(word);
    for (var i = 0; i < MONTHS.length; i++) if (MONTHS[i].indexOf(w) >= 0) return i;
    return -1;
  }
  function ym(y, m) { return y + '-' + (m < 9 ? '0' : '') + (m + 1); }
  /** 'KPI Mei 2026' (a heading of the current or an older month) → '2026-05' | null. */
  function periodOfLabel(s) {
    var m = new RegExp('^(?:kpi|posisi|periode|bulan)\\s+(' + MONTH_WORD + ')\\.?\\s+(20\\d\\d)$').exec(fold(s));
    if (!m) return null;
    var i = monthIndex(m[1]);
    return i < 0 ? null : ym(+m[2], i);
  }
  /** A month and year anywhere in a file name: 'KPI Area X_ Mei 2026.xlsx' → '2026-05'. */
  function periodOfName(name) {
    var m = new RegExp('(?:^|[^a-z])(' + MONTH_WORD + ')[\\s_\\-.]*(20\\d\\d)(?![0-9])').exec(fold(name).replace(/_/g, ' '));
    if (!m) return null;
    var i = monthIndex(m[1]);
    return i < 0 ? null : ym(+m[2], i);
  }
  function periodLabel(p) {
    var m = /^(\d{4})-(\d{2})/.exec(str(p));
    return m ? MONTH_LONG[+m[2] - 1] + ' ' + m[1] : '';
  }
  /** Last day of the month: '2026-05' → '2026-05-31'. */
  function periodEnd(p) {
    var m = /^(\d{4})-(\d{2})/.exec(str(p));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2], 0));
    return d.toISOString().slice(0, 10);
  }
  function periodRe(p) {
    var m = /^(\d{4})-(\d{2})/.exec(str(p));
    if (!m) return null;
    return new RegExp('^kpi\\s+(' + MONTHS[+m[2] - 1].join('|') + ')\\.?\\s+' + m[1] + '$');
  }

  /* -------------------------------------------------------------- tables */

  function gridOf(sheet) {
    var rows = [sheet.headers || []].concat(sheet.rows || []);
    var nos = [isNum(sheet.headerRow) ? sheet.headerRow : 1].concat(sheet.rowNos || (sheet.rows || []).map(function (r, i) { return i + 2; }));
    var width = 0;
    rows.forEach(function (r) { if (r && r.length > width) width = r.length; });
    return { rows: rows, nos: nos, width: width };
  }

  /**
   * tableOf(sheet) → the branch table of a sheet, or null. The code column is the one with the most distinct
   * 5-digit codes that have a name in one of the next three columns (value columns with whole numbers and
   * repeated pivot rows do not qualify); the name column is the one of those three with the most names.
   */
  function tableOf(sheet) {
    if (!sheet || !Array.isArray(sheet.rows)) return null;
    var g = gridOf(sheet), stat = {}, i, c;
    for (i = 0; i < g.rows.length; i++) {
      var r = g.rows[i] || [];
      for (c = 0; c < r.length; c++) {
        var k = branchCode(r[c]);
        if (!k || !(nameLike(r[c + 1]) || nameLike(r[c + 2]) || nameLike(r[c + 3]))) continue;
        var o = stat[c] || (stat[c] = { n: 0, d: {}, nd: 0 });
        o.n++;
        if (!o.d[k]) { o.d[k] = 1; o.nd++; }
      }
    }
    var codeCol = -1, best = 0;
    Object.keys(stat).forEach(function (key) {
      var o = stat[key], col = +key;
      if (o.nd < 2 || o.nd < 0.8 * o.n) return;               // repeated codes: a pivot or a list, not a table
      if (o.nd > best || (o.nd === best && col < codeCol)) { best = o.nd; codeCol = col; }
    });
    if (codeCol < 0) return null;
    var nameCol = -1, kelasCol = -1, nbest = 0, kbest = 0, kel = {}, nm = {};
    g.rows.forEach(function (row) {
      if (!row || !isBranch(codeOf(row[codeCol]))) return;
      for (var d = 1; d <= 3; d++) if (nameLike(row[codeCol + d])) nm[d] = (nm[d] || 0) + 1;
      for (var j = 0; j < row.length; j++) if (typeof row[j] === 'string' && KELAS_RE.test(row[j].trim())) kel[j] = (kel[j] || 0) + 1;
    });
    Object.keys(nm).forEach(function (d) { if (nm[d] > nbest) { nbest = nm[d]; nameCol = codeCol + (+d); } });
    Object.keys(kel).forEach(function (j) { if (kel[j] > kbest) { kbest = kel[j]; kelasCol = +j; } });
    if (nameCol < 0) return null;
    var first = -1;
    for (i = 0; i < g.rows.length && first < 0; i++) {
      var rr = g.rows[i] || [];
      if (codeOf(rr[codeCol]) && nameLike(rr[nameCol])) first = i;
    }
    var head = [];
    for (i = Math.max(0, first - MAX_HEAD); i < first; i++) {
      var hr = g.rows[i] || [], labels = [], raw = [];
      for (c = 0; c < g.width; c++) { var l = headLabel(hr[c]); raw.push(l); labels.push(fold(l)); }
      head.push({ i: i, no: g.nos[i], labels: labels, raw: raw });
    }
    return { sheet: sheet, name: str(sheet.name), grid: g, width: g.width, codeCol: codeCol, nameCol: nameCol, kelasCol: kbest >= 2 ? kelasCol : -1,
      first: first, head: head, blocks: null, periods: periodsIn(head) };
  }
  function periodsIn(head) {
    var out = [];
    head.forEach(function (h) { h.raw.forEach(function (s) { var p = s && periodOfLabel(s); if (p && out.indexOf(p) < 0) out.push(p); }); });
    return out;
  }

  /** Blocks of rows: an area / region row (code of 1–4 digits with a name) followed by its 5-digit branch rows. */
  function blocksOf(t) {
    if (t.blocks) return t.blocks;
    var rows = t.grid.rows, blocks = [], cur = null;
    for (var i = t.first; i < rows.length; i++) {
      var row = rows[i] || [], code = codeOf(row[t.codeCol]);
      if (code && !isBranch(code) && nameLike(row[t.nameCol])) { cur = { code: code, name: str(row[t.nameCol]), row: i, rows: [] }; blocks.push(cur); continue; }
      if (isBranch(code)) { if (!cur) { cur = { code: null, name: null, row: -1, rows: [] }; blocks.push(cur); } cur.rows.push(i); continue; }
      cur = null;                                               // a separator row ends the block
    }
    t.blocks = blocks;
    return blocks;
  }

  /* -------------------------------------------------- finding columns by labels */

  // Leaf labels under a KPI group. "Pencapaian" in any of its spellings; a bare '%' is NOT a capaian (NPL ratio in Source Kualitas).
  var LEAF = {
    actual: /^(realisasi|real\.?|actual|aktual|posisi)$/,
    target: /^(target|tgt\.?|rkap)$/,
    capaian: /^(%\s*)?(pencapaian|penc\.?|capaian|achievement|ach\.?)$/
  };

  function spanEnd(t, h, c) {
    var L = t.head[h].labels;
    for (var k = c + 1; k < t.width; k++) if (L[k]) return k - 1;
    return t.width - 1;
  }
  function descend(t, h, c, end, path, k) {
    if (k === path.length) return { h: h, c: c, end: end };
    for (var h2 = h + 1; h2 < t.head.length; h2++) {
      for (var c2 = c; c2 <= end; c2++) {
        var lab = t.head[h2].labels[c2];
        if (lab && path[k].test(lab)) {
          var r = descend(t, h2, c2, Math.min(end, spanEnd(t, h2, c2)), path, k + 1);
          if (r) return r;
        }
      }
    }
    return null;
  }
  /** The first column of the span whose first label below the group row matches re (no other label in between). */
  function leafCol(t, h, c0, end, re) {
    for (var c = c0; c <= end; c++) {
      for (var h3 = h + 1; h3 < t.head.length; h3++) {
        var lab = t.head[h3].labels[c];
        if (!lab) continue;
        if (re.test(lab)) return { c: c, h: h3 };
        break;
      }
    }
    return null;
  }
  function emptyBelow(t, h, c) {
    for (var h3 = h + 1; h3 < t.head.length; h3++) if (t.head[h3].labels[c]) return false;
    return true;
  }
  /** The first label below header row h in column x, as a key of cols ('actual', 'target', …), '?' (another label) or '' (none). */
  function leafKind(t, h, x, cols) {
    if (x < 0 || x >= t.width) return '';
    for (var h3 = h + 1; h3 < t.head.length; h3++) {
      var lab = t.head[h3].labels[x];
      if (!lab) continue;
      for (var k in cols) if (has(cols, k) && cols[k].test(lab)) return k;
      return '?';
    }
    return '';
  }
  function leafName(t, h, x) {
    for (var h3 = h + 1; h3 < t.head.length; h3++) if (t.head[h3].labels[x]) return t.head[h3].raw[x];
    return '';
  }
  function actualIn(t, h, from, to) {
    for (var x = from; x <= to; x++) if (leafKind(t, h, x, LEAF) === 'actual') return true;
    return false;
  }
  /**
   * The leaves under a group label: Realisasi in the label's own column or the next one, with no Target or
   * Pencapaian before it; then the first Target and Pencapaian after it, before the next Realisasi of the span.
   * → {cols} · {fail: 'letak'} (a Realisasi in the span, but not where it belongs) · null (no Realisasi: not a KPI group)
   */
  function byLabel(t, hit) {
    var a = -1, x, k;
    for (x = hit.c; x <= hit.end; x++) {
      k = leafKind(t, hit.h, x, LEAF);
      if (k === 'actual') { a = x; break; }
      if (k === 'target' || k === 'capaian') return actualIn(t, hit.h, x + 1, hit.end) ? { fail: 'letak' } : null;
    }
    if (a < 0) return null;
    if (a > hit.c + 1) return { fail: 'letak' };
    var out = { actual: a };
    for (x = a + 1; x <= hit.end; x++) {
      k = leafKind(t, hit.h, x, LEAF);
      if (k === 'actual') break;
      if ((k === 'target' || k === 'capaian') && !has(out, k)) out[k] = x;
    }
    return { cols: out };
  }
  /** Realisasi, Target, Pencapaian side by side from column a (Target and Pencapaian when they follow). */
  function runAt(t, h, a) {
    if (leafKind(t, h, a, LEAF) !== 'actual') return null;
    var out = { actual: a }, x = a + 1;
    if (leafKind(t, h, x, LEAF) === 'target') out.target = x++;
    if (leafKind(t, h, x, LEAF) === 'capaian') out.capaian = x;
    return out;
  }
  /**
   * Where the leaves may sit when the label is not over its Realisasi: the run that covers the label's column (a
   * centred or right-aligned label; only when no other label of that header row sits over the run), then the run
   * that starts one column to the right (a label one column too far left). Used only when the numbers agree.
   */
  function shiftedRuns(t, hit) {
    var out = [], c = hit.c, L = t.head[hit.h].labels, x;
    for (var a = c - 1; a >= 0 && a >= c - 4; a--) {
      var r = runAt(t, hit.h, a);
      if (!r) continue;
      var last = Math.max(a, has(r, 'target') ? r.target : -1, has(r, 'capaian') ? r.capaian : -1), free = true;
      for (x = a; x < c; x++) if (L[x]) free = false;
      if (last >= c && free) out.push(r);
      break;
    }
    if (c + 1 <= hit.end) { var r2 = runAt(t, hit.h, c + 1); if (r2) out.push(r2); }
    return out;
  }

  /*
   * The cross-check on the area's rows, the workbook's own rule: Pencapaian = Realisasi ÷ Target, or 2 − Realisasi ÷
   * Target when lower is better; under an NPL group, % = NPL ÷ Total. Columns read from the wrong group or under
   * swapped labels break it on nearly every row. A Pencapaian (or %) typed as percent numbers (95,3 for 95,3%) is
   * recognised and scaled. → {n: rows checked, bad: rows that disagree, kind: 'leaf' | 'ratio', scale: {col, by} | null}
   */
  var CHECK_TOL = 0.006;                             // a Pencapaian rounded to a whole percent still passes
  function crossCheck(t, cols, better) {
    var leaf = has(cols, 'target') && has(cols, 'capaian'), ratio = !leaf && has(cols, 'npl') && has(cols, 'total');
    var res = { n: 0, bad: 0, kind: leaf ? 'leaf' : 'ratio', scale: null };
    if ((!leaf && !ratio) || !t.area) return res;
    var bad100 = 0;
    t.area.rows.forEach(function (i) {
      var r = t.grid.rows[i], a = num(r[cols.actual]), e, p, tol;
      if (!isNum(a)) return;
      if (leaf) {
        var g = num(r[cols.target]);
        p = num(r[cols.capaian]);
        if (!isNum(g) || g === 0 || !isNum(p)) return;
        e = better === 'down' ? 2 - a / g : a / g;
        tol = CHECK_TOL * Math.max(1, Math.abs(e));
      } else {
        var np = num(r[cols.npl]), tot = num(r[cols.total]);
        if (!isNum(np) || !isNum(tot) || tot <= 0) return;
        e = np / tot;
        p = a;
        tol = Math.max(1e-4, 0.02 * Math.abs(e));
      }
      res.n++;
      if (Math.abs(p - e) > tol) res.bad++;
      if (Math.abs(p / 100 - e) > tol) bad100++;
    });
    if (res.n && res.bad * 4 > res.n && bad100 * 4 <= res.n) { res.bad = bad100; res.scale = { col: leaf ? 'capaian' : 'actual', by: 0.01 }; }
    return res;
  }
  function failed(chk) { return chk.bad * 4 > chk.n; }   // more than a quarter of the rows disagree

  /**
   * findColumns(table, path, cols, single, better, rejected) → {cols: {key: colIndex}, header, columns, shifted, check} | null.
   * path: regexes from the top header row down ("Tabungan"; or "NPL" then "Consumer"); cols: leaf regexes
   * (actual is required). single: the value sits in the group column itself (one label, nothing under it).
   * Under a Realisasi · Target · Pencapaian group the leaves must sit where byLabel() expects them and pass the
   * cross-check; otherwise a shifted run that passes it is used (shifted: true). A group whose columns fail is
   * pushed to `rejected` ({sheet, header, reason: 'letak' | 'cek', kind}) and the search goes on.
   */
  function findColumns(t, path, cols, single, better, rejected) {
    if (!t || !t.head.length) return null;
    for (var h = 0; h < t.head.length; h++) {
      for (var c = 0; c < t.width; c++) {
        var lab = t.head[h].labels[c];
        if (!lab || !path[0].test(lab)) continue;
        var hit = descend(t, h, c, spanEnd(t, h, c), path, 1);
        if (!hit) continue;
        var trail = pathText(t, h, c, hit);
        if (single) {
          if (emptyBelow(t, hit.h, hit.c)) return { cols: { actual: hit.c }, header: trail, columns: { actual: trail }, shifted: false, check: null };
          continue;
        }
        var tries = [], reason = null, kind = 'leaf';
        if (cols === LEAF) {
          var p = byLabel(t, hit);
          if (p && p.cols) tries.push({ cols: p.cols, primary: true });
          else if (p) reason = p.fail;
          shiftedRuns(t, hit).forEach(function (r) { tries.push({ cols: r, primary: false }); });
        } else {
          var o = {};
          Object.keys(cols).forEach(function (k) { var f = leafCol(t, hit.h, hit.c, hit.end, cols[k]); if (f) o[k] = f.c; });
          if (has(o, 'actual')) tries.push({ cols: o, primary: true });
        }
        for (var i = 0; i < tries.length; i++) {
          var tr = tries[i], chk = crossCheck(t, tr.cols, better);
          // a shifted run is taken only when its numbers can be checked and agree
          if (!tr.primary && (chk.kind !== 'leaf' || !has(tr.cols, 'target') || !has(tr.cols, 'capaian') || !chk.n)) { reason = reason || 'letak'; continue; }
          if (failed(chk)) { reason = reason || 'cek'; kind = chk.kind; continue; }
          var names = {};
          Object.keys(tr.cols).forEach(function (k) { names[k] = leafName(t, hit.h, tr.cols[k]); });
          return { cols: tr.cols, header: trail, columns: names, shifted: !tr.primary, check: chk };
        }
        if (reason && rejected) rejected.push({ sheet: t.name, header: trail, reason: reason, kind: kind });
      }
    }
    return null;
  }
  function pathText(t, h, c, hit) {
    var parts = [t.head[h].raw[c]];
    if (hit.h !== h) parts.push(t.head[hit.h].raw[hit.c]);
    return parts.join(' › ');
  }

  /* ----------------------------------------------------------------- fields */

  // Sheet-name hints (folded names). Layouts shared by several sheets (KPR · consumer · … in both the outstanding and
  // the booking sheet) need the sheet name; labels that occur once in the file are looked for in every sheet.
  var S_DPK = /(avg|average|rata).*(bal|saldo).*dpk|^dpk\b/;
  var S_DPK_RETAIL = /dpk.*retail|retail.*dpk/;
  var S_KREDIT = /(avg|average|rata).*(bal|saldo).*kredit|^kredit\b|outstanding|baki ?debet/;
  var S_BOOKING = /booking|pencairan/;
  var S_KUALITAS = /kualitas|kolektibilitas/;
  var S_COF = /^cof\b|cost of fund/;
  var S_NPL = /npl/;
  var S_OLD = /bulan ?lalu|bulanlalu/;
  var PERIOD = 'PERIOD';

  function F(key, label, unit, better, sources, more) {
    var f = { key: key, label: label, unit: unit, better: better, sources: sources, target: true, tabs: [] };
    Object.keys(more || {}).forEach(function (k) { f[k] = more[k]; });
    return f;
  }
  function dpkSrc(re, alt) {
    var out = [{ sheet: S_DPK, notSheet: S_DPK_RETAIL, path: [re] }];
    if (alt) out.push({ notSheet: S_DPK_RETAIL, path: [alt] });
    return out;
  }
  function kreditSrc(re) { return [{ sheet: S_KREDIT, notSheet: S_BOOKING, path: [re] }]; }
  function bookingSrc(re) { return [{ sheet: S_BOOKING, path: [re] }]; }

  /**
   * The KPI catalogue in display order. unit: 'rp' (Rp juta) · 'rasio' (fraction) · 'jumlah' · 'poin'.
   * better: 'up' | 'down'. tabs: dashboard tabs that help close the gap (MCD.nav tokens, V8 §2.5: 'wealth', 'schools',
   * 'campus', 'merchants', 'health', 'property'; no 'tni' since D39).
   */
  var FIELDS = [
    F('dpk', 'DPK (rata-rata saldo)', 'rp', 'up', dpkSrc(/^(total )?dpk$/), { derive: 'sum', from: ['tabungan', 'giro', 'deposito'], tabs: ['wealth'] }),
    F('tabungan', 'Tabungan (rata-rata saldo)', 'rp', 'up', dpkSrc(/^tabungan$/, /^(average balance|avg ?bal) tabungan$/), { tabs: ['schools', 'campus'] }),
    F('giro', 'Giro (rata-rata saldo)', 'rp', 'up', dpkSrc(/^giro$/, /^(average balance|avg ?bal) giro$/), { tabs: ['merchants', 'health'] }),
    F('deposito', 'Deposito (rata-rata saldo)', 'rp', 'up', dpkSrc(/^deposito$/, /^(average balance|avg ?bal) deposito$/), { tabs: ['wealth'] }),
    F('casa', 'CASA (Tabungan + Giro)', 'rp', 'up', dpkSrc(/^casa$/), { derive: 'sum', from: ['tabungan', 'giro'], tabs: ['schools', 'merchants', 'campus'] }),
    F('casaRatio', 'Rasio CASA', 'rasio', 'up', dpkSrc(/^(rasio casa|casa ratio|% ?casa)$/, /^(rasio casa|casa ratio)$/),
      { derive: 'ratio', from: ['casa', 'dpk'], tabs: ['schools', 'merchants', 'campus'] }),
    F('cof', 'Biaya dana (CoF) retail', 'rasio', 'down', [{ path: [/cost of fund/] }, { sheet: S_COF, path: [/^% ?cof$/] }], { tabs: ['schools', 'merchants'] }),
    F('dpkRetail', 'DPK retail (rata-rata saldo)', 'rp', 'up', [{ sheet: S_DPK_RETAIL, path: [/^(total )?dpk$/] }, { path: [/^avg ?bal(ance)? dpk retail$/] }], { tabs: ['wealth', 'schools'] }),
    F('kredit.consumer', 'Kredit consumer (rata-rata saldo)', 'rp', 'up',
      kreditSrc(/^consumer$/).concat([{ path: [/^(average balance|avg ?bal) kredit consumer$/] }]), { tabs: ['property'] }),
    F('kredit.ksm', 'Kredit KSM (rata-rata saldo)', 'rp', 'up', kreditSrc(/^ksm$/), { tabs: [] }),                         // D41: read to check the file, never shown
    F('kredit.kpr', 'Kredit KPR (rata-rata saldo)', 'rp', 'up', kreditSrc(/^kpr$/), { tabs: ['property'] }),
    F('kredit.autoloan', 'Kredit KKB (rata-rata saldo)', 'rp', 'up', kreditSrc(/^(auto ?loan|kkb)$/), { tabs: [] }),      // D41: read to check the file, never shown
    F('kredit.kartu', 'Kartu Kredit (rata-rata saldo)', 'rp', 'up', kreditSrc(/^(cc|kartu kredit|credit card)$/), { tabs: ['wealth'] }),
    F('booking.consumer', 'Booking kredit consumer', 'rp', 'up', bookingSrc(/^consumer$/).concat([{ path: [/^booking kredit consumer/] }]), { tabs: ['property'] }),
    F('booking.ksm', 'Booking KSM', 'rp', 'up', bookingSrc(/^ksm$/), { tabs: [] }),                                        // D41: read to check the file, never shown
    F('booking.kpr', 'Booking KPR', 'rp', 'up', bookingSrc(/^kpr$/), { tabs: ['property'] }),
    F('booking.autoloan', 'Booking KKB (Autoloan)', 'rp', 'up', bookingSrc(/^(auto ?loan|kkb)$/), { tabs: [] }),           // D41: read to check the file, never shown
    F('nplRetail', 'NPL retail (rasio)', 'rasio', 'down',
      [{ sheet: S_KUALITAS, path: [/^retail$/], cols: { actual: /^(%|% npl|npl %)$/, npl: /^npl$/, total: /^total$/ } }], { target: false, tabs: [] }),
    F('nplConsumer', 'NPL consumer (nominal, batas atas)', 'rp', 'down',
      [{ scorecard: true, path: [/^npl$/] }, { sheet: S_NPL, path: [/^npl$/, /^consumer$/] }], { tabs: [] }),
    F('newCifTabungan', 'CIF baru Tabungan retail', 'jumlah', 'up', [{ path: [/^new cif tabungan/] }], { tabs: ['schools', 'campus'] }),
    F('rekeningBersaldo', 'Rekening baru berbiaya yang bersaldo', 'jumlah', 'up',
      [{ path: [/rekening berbiaya.*(saldo|bersaldo)|^(new )?rekening bersaldo/] }], { tabs: ['schools', 'merchants', 'campus'] }),
    F('ureg', 'UREG (pengguna terdaftar)', 'jumlah', 'up', [{ path: [/^ureg\b|^user regist/] }], { tabs: ['merchants'] }),
    F('usak', 'USAK FIN Livin’', 'jumlah', 'up', [{ path: [/^usak fin livin|^usak livin/] }], { tabs: ['schools', 'merchants', 'campus'] }),
    F('fbi', 'Fee based income', 'rp', 'up', [{ path: [/^fee based income/] }], { tabs: ['merchants', 'health'] }),
    F('skorKpi', 'Skor KPI', 'poin', 'up',
      [{ scorecard: true, path: [/^(total|total nilai|skor kpi|nilai kpi)$/], single: true }, { periodSheet: true, path: [PERIOD], single: true }],
      { target: false, rankAll: true })
  ];
  var BY_KEY = {};
  FIELDS.forEach(function (f) { BY_KEY[f.key] = f; });
  /* D41: the four keys above that are read to check the file and never shown (homeRows, visibleWarnings, Posisi cabang) */
  var HIDDEN = ['kredit.ksm', 'kredit.autoloan', 'booking.ksm', 'booking.autoloan'];   // D41: read to check the file, never shown
  function hidden(key) { return HIDDEN.indexOf(key) >= 0; }
  var RANK_FILE = { periodSheet: true, path: [/^rank(ing)?$/], single: true };

  function keys() { return FIELDS.map(function (f) { return f.key; }); }
  /** An empty value tree: {dpk: null, …, kredit: {consumer: null, …}, booking: {…}, …}. */
  function blank() {
    var o = {};
    FIELDS.forEach(function (f) { set(o, f.key, null); });
    return o;
  }
  function get(o, key) {
    var parts = String(key).split('.'), cur = o;
    for (var i = 0; i < parts.length; i++) { if (cur == null) return null; cur = cur[parts[i]]; }
    return cur == null ? null : cur;
  }
  function set(o, key, v) {
    var parts = String(key).split('.'), cur = o;
    for (var i = 0; i < parts.length - 1; i++) { if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = v;
  }

  /* ------------------------------------------------------------- ranking */

  /** Competition ranking of values (1 = best): better 'up' → highest first; null values stay null. */
  function rankValues(list, better) {
    var idx = [];
    list.forEach(function (v, i) { if (isNum(v)) idx.push(i); });
    idx.sort(function (a, b) { return better === 'down' ? list[a] - list[b] : list[b] - list[a]; });
    var out = list.map(function () { return null; });
    idx.forEach(function (i, k) {
      out[i] = k > 0 && list[idx[k - 1]] === list[i] ? out[idx[k - 1]] : k + 1;
    });
    return out;
  }

  /* --------------------------------------------------------------- parse */

  /** The parse context: options, the tables found, the warnings and a cache of branch rows. */
  function Ctx(opts) {
    this.home = opts.home || HOME;
    this.warnings = [];
    this.seen = {};
    this.tables = [];
    this.old = [];
    this.used = {};
    this.rowCache = {};
    this.rejected = {};                              // field key → groups whose columns failed the checks
  }
  Ctx.prototype.warn = function (level, code, text, field, sheet) {
    var k = code + '|' + (field || '') + '|' + (sheet || '') + '|' + text;
    if (this.seen[k]) return;
    this.seen[k] = 1;
    this.warnings.push({ level: level, code: code, field: field || null, sheet: sheet || null, text: text });
  };

  /** The period: the latest "KPI <bulan> <tahun>" heading in the file (older months sit in ranking helper sheets). */
  function findPeriod(sheets, file) {
    var best = null;
    sheets.forEach(function (s) {
      if (S_OLD.test(fold(s.name))) return;
      var g = gridOf(s), lim = Math.min(g.rows.length, 14);
      for (var i = 0; i < lim; i++) (g.rows[i] || []).forEach(function (v) {
        var p = typeof v === 'string' ? periodOfLabel(v) : null;
        if (p && (!best || p > best)) best = p;
      });
    });
    return { content: best, file: file ? periodOfName(file) : null };
  }

  /** The scorecard sheet: the branch table whose KPI groups carry "Bobot" and "Nilai" columns (sheet "Data"). */
  function findScorecard(tables) {
    var best = null, bestN = 0;
    tables.forEach(function (t) {
      var bobot = 0, nilai = 0;
      t.head.forEach(function (h) { h.labels.forEach(function (l) { if (l === 'bobot') bobot++; else if (l === 'nilai') nilai++; }); });
      var n = Math.min(bobot, nilai);
      if (n >= 3 && n > bestN) { best = t; bestN = n; }
    });
    return best;
  }

  function areaFromRow(name) {
    var m = /^area\s+(.+)$/i.exec(str(name));
    return m ? titleCase(m[1]) : null;
  }

  /** The block of the area in a table: by area code, by area name, by the home branch, else the whole table. */
  function areaBlock(t, ctx) {
    var blocks = blocksOf(t), b = null;
    if (ctx.areaCode) b = blocks.filter(function (x) { return x.code && sameCode(x.code, ctx.areaCode); })[0] || null;
    if (!b && ctx.area) b = blocks.filter(function (x) { return x.name && areaFromRow(x.name) && nameKey(areaFromRow(x.name)) === nameKey(ctx.area); })[0] || null;
    if (!b) b = blocks.filter(function (x) { return x.rows.some(function (i) { return codeOf(t.grid.rows[i][t.codeCol]) === ctx.home; }); })[0] || null;
    if (!b && blocks.length === 1) b = blocks[0];
    if ((!b || b.code == null) && ctx.peerCodes && ctx.peerNames) {
      // a table without area rows (it may list the whole region): keep the rows of the area's branches only
      var rows = [], src = b ? [b] : blocks;
      src.forEach(function (x) {
        x.rows.forEach(function (i) {
          var r = t.grid.rows[i];
          if (ctx.peerCodes[codeOf(r[t.codeCol])] || ctx.peerNames[nameKey(r[t.nameCol])]) rows.push(i);
        });
      });
      b = rows.length ? { code: null, name: null, row: -1, rows: rows } : null;
    }
    return b;
  }

  /** The row of a branch in a table's area block: by code (several rows with one code: by name), else by exact name. */
  function rowFor(t, ctx, br) {
    var key = t.name + '|' + br.code;
    if (has(ctx.rowCache, key)) return ctx.rowCache[key];
    var blk = t.area, row = -1;
    if (blk) {
      var rows = t.grid.rows, byCode = blk.rows.filter(function (i) { return codeOf(rows[i][t.codeCol]) === br.code; });
      if (byCode.length === 1) row = byCode[0];
      else if (byCode.length > 1) {
        var nk = nameKey(br.name), exact = byCode.filter(function (i) { return nameKey(rows[i][t.nameCol]) === nk; });
        row = exact.length ? exact[0] : byCode[0];
        ctx.warn('info', 'DUP_CODE', 'Kode ' + br.code + ' muncul ' + fmtInt(byCode.length) + ' kali di sheet ' + q(t.name) + ', sehingga baris dipilih menurut nama cabang.', null, t.name);
      } else if (br.name) {
        var k2 = nameKey(br.name), named = blk.rows.filter(function (i) { return nameKey(rows[i][t.nameCol]) === k2; });
        if (named.length === 1) {
          row = named[0];
          ctx.warn('info', 'BY_NAME', 'Baris ' + br.name + ' (' + br.code + ') di sheet ' + q(t.name) + ' ditemukan menurut nama karena kode cabangnya berbeda.', null, t.name);
        }
      }
    }
    ctx.rowCache[key] = row;
    return row;
  }

  function candidates(src, ctx) {
    if (src.scorecard) return ctx.scorecard ? [ctx.scorecard] : [];
    return ctx.tables.filter(function (t) {
      var n = fold(t.name);
      if (src.periodSheet && !(ctx.period && t.periods.indexOf(ctx.period) >= 0)) return false;
      if (src.sheet && !src.sheet.test(n)) return false;
      if (src.notSheet && src.notSheet.test(n)) return false;
      return true;
    });
  }
  /** The first table and columns of one source of a KPI (f: the field, for its direction and the rejected groups). */
  function resolve(src, ctx, f) {
    var path = src.path.map(function (p) { return p === PERIOD ? ctx.periodRe : p; });
    if (path.some(function (p) { return !p; })) return null;
    var list = candidates(src, ctx), rejected = f ? (ctx.rejected[f.key] = ctx.rejected[f.key] || []) : null;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t.area) continue;
      var hit = findColumns(t, path, src.cols || LEAF, !!src.single, f ? f.better : 'up', rejected);
      if (hit) return { table: t, cols: hit.cols, header: hit.header, columns: hit.columns, shifted: hit.shifted, check: hit.check, src: src };
    }
    return null;
  }

  /**
   * The area name when the scorecard has no "AREA …" row: an area row of the chosen blocks, then a title or
   * header cell ("Area Pasar Rebo"; never a data row, where other areas are listed), then the file name.
   */
  function findAreaName(ctx, list, file) {
    ctx.tables.some(function (t) { var a = t.area && t.area.name ? areaFromRow(t.area.name) : null; if (a) ctx.area = a; return !!a; });
    if (ctx.area) return;
    list.some(function (s) {
      if (S_OLD.test(fold(s.name)) || ctx.old.indexOf(str(s.name)) >= 0) return false;
      var t = ctx.tables.filter(function (x) { return x.sheet === s; })[0], cells = [];
      if (t) t.head.forEach(function (h) { cells = cells.concat(h.raw); });
      else { var g = gridOf(s); for (var i = 0; i < Math.min(g.rows.length, 10); i++) cells = cells.concat(g.rows[i] || []); }
      for (var k = 0; k < cells.length; k++) {
        var a = typeof cells[k] === 'string' ? areaFromRow(cells[k].replace(/\s+/g, ' ').trim()) : null;
        if (a && a.length <= 40) { ctx.area = a; return true; }
      }
      return false;
    });
    if (!ctx.area && file) {
      var fm = /kpi\s+area\s+(.+?)[\s_\-]+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|agt|aug|sep|okt|oct|nov|des|dec)/i.exec(String(file).replace(/\.[a-z]+$/i, ''));
      if (fm) ctx.area = titleCase(fm[1].replace(/[_\s]+$/, ''));
    }
  }

  function newBranch(code, name, kelas, peer, home) {
    return { code: code, name: name || null, kelas: kelas || null, home: !!home, peer: !!peer, noData: false, isTotal: false,
      kpi: blank(), target: blank(), capaian: blank(), gap: blank(), kurang: blank(), rank: blank(), rankKelas: null, rankFile: null, rows: {} };
  }

  /* The parse, step by step. Each step reads and writes the parse context `ctx`. */

  /** Step 1. The period, from the headings (the latest "KPI <bulan> <tahun>"), else from the file name. */
  function stepPeriod(ctx, list, file, opts) {
    var per = findPeriod(list, file);
    ctx.period = opts.period || per.content || per.file || null;
    if (!ctx.period) ctx.warn('warn', 'PERIOD_MISSING', 'Periode laporan tidak ditemukan. Periksa judul ' + q('KPI <bulan> <tahun>') + ' di file.');
    else if (per.content && per.file && per.content !== per.file && !opts.period) {
      ctx.warn('warn', 'PERIOD_FILE', 'Periode pada isi file (' + periodLabel(per.content) + ') berbeda dengan nama file (' + periodLabel(per.file) + '). Data dibaca sebagai periode ' + periodLabel(per.content) + '.');
    }
    ctx.periodRe = periodRe(ctx.period);
  }

  /** Step 2. The branch tables; sheets of older months ("bulan lalu", "KPI Desember 2025") are left out. */
  function stepTables(ctx, list) {
    list.forEach(function (s) {
      var t = tableOf(s);
      if (!t) return;
      if (S_OLD.test(fold(t.name)) || (t.periods.length && ctx.period && t.periods.indexOf(ctx.period) < 0)) { ctx.old.push(t.name); return; }
      ctx.tables.push(t);
    });
  }

  function branchOfRow(t, i, peer) {
    var r = t.grid.rows[i], code = codeOf(r[t.codeCol]);
    return newBranch(code, str(r[t.nameCol]), t.kelasCol >= 0 ? str(r[t.kelasCol]) || null : null, peer, false);
  }
  function hasHome(t, b, home) { return b.rows.some(function (i) { return codeOf(t.grid.rows[i][t.codeCol]) === home; }); }

  /**
   * Step 3. The area and its scorecard branches (the peers that are ranked): the area block of the scorecard
   * sheet; without a scorecard, the block of the home branch in the first table that has it. Then the area
   * block of every table.
   */
  function stepPeers(ctx, list, file, opts) {
    var sc = ctx.scorecard = findScorecard(ctx.tables), peers = [], src = null, blk = null;
    ctx.areaCode = opts.areaCode || null;
    if (sc) {
      var b0 = blocksOf(sc);
      if (ctx.areaCode) blk = b0.filter(function (x) { return x.code && sameCode(x.code, ctx.areaCode); })[0] || null;
      if (!blk) blk = b0.filter(function (x) { return x.code && areaFromRow(x.name); })[0] || null;
      if (!blk) blk = b0.filter(function (x) { return hasHome(sc, x, ctx.home); })[0] || b0[0] || null;
      src = sc;
    } else {
      ctx.warn('warn', 'SCORECARD_MISSING', 'Sheet skor KPI per cabang (kolom Realisasi, Target, Pencapaian, Bobot, Nilai) tidak ditemukan. Daftar cabang diambil dari sheet lain.');
      ctx.tables.some(function (t) {
        blk = blocksOf(t).filter(function (x) { return hasHome(t, x, ctx.home); })[0] || null;
        src = blk ? t : null;
        return !!blk;
      });
    }
    if (blk) {
      if (blk.code) { ctx.areaCode = ctx.areaCode || blk.code; ctx.area = areaFromRow(blk.name); }
      blk.rows.forEach(function (i) {
        var b = branchOfRow(src, i, true);
        if (peers.some(function (p) { return p.code === b.code; })) return;
        b.home = b.code === ctx.home;
        peers.push(b);
      });
    }
    ctx.peerCodes = {};
    ctx.peerNames = {};
    peers.forEach(function (p) { ctx.peerCodes[p.code] = 1; if (nameKey(p.name)) ctx.peerNames[nameKey(p.name)] = 1; });
    ctx.tables.forEach(function (t) { t.area = areaBlock(t, ctx); });
    if (!ctx.area) findAreaName(ctx, list, file);
    if (!ctx.area) ctx.warn('warn', 'AREA_MISSING', 'Nama area tidak ditemukan di file ini.');
    return peers;
  }

  /**
   * Step 4. Each KPI to a table and its columns (the first source that matches). Offices in the area block of a
   * used table that are not on the scorecard (and not a scorecard branch under another code) join as peer: false.
   */
  function stepFields(ctx, branches, byCode, peers) {
    var hits = {};
    FIELDS.forEach(function (f) {
      var hit = null;
      for (var i = 0; i < f.sources.length && !hit; i++) hit = resolve(f.sources[i], ctx, f);
      hits[f.key] = hit;
      if (!hit) return;
      ctx.used[hit.table.name] = 1;
      hit.table.area.rows.forEach(function (i) {
        var b = branchOfRow(hit.table, i, false);
        if (byCode[b.code] || nameMatchesPeer(b.name, peers)) return;
        b.home = b.code === ctx.home;
        byCode[b.code] = b;
        branches.push(b);
      });
    });
    return hits;
  }

  /** Step 5. The values of every branch (and of the area row) from the columns found. → {key: text cells} */
  function stepValues(ctx, hits, branches, areaRow) {
    var textCells = {};
    FIELDS.forEach(function (f) {
      var hit = hits[f.key];
      if (!hit) return;
      var t = hit.table;
      var scale = hit.check && hit.check.scale;
      function read(b, i) {
        var r = t.grid.rows[i], v = {};
        Object.keys(hit.cols).forEach(function (k) {
          var raw = r[hit.cols[k]], x = num(raw);
          if (x == null && raw != null && str(raw) !== '' && b.peer) textCells[f.key] = (textCells[f.key] || 0) + 1;
          v[k] = x;
        });
        if (scale && isNum(v[scale.col])) v[scale.col] *= scale.by;                     // Pencapaian typed as percent numbers
        if (has(hit.cols, 'total') && !(isNum(v.total) && v.total > 0)) v.actual = null;  // no portfolio: no NPL ratio
        else if (v.actual == null && isNum(v.npl) && isNum(v.total)) v.actual = v.npl / v.total;   // NPL ratio from NPL ÷ total
        set(b.kpi, f.key, isNum(v.actual) ? v.actual : null);
        if (f.target !== false) set(b.target, f.key, isNum(v.target) ? v.target : null);
        // the file's Pencapaian, unless actual and target are both empty or 0 (then "0%" or "200%" means nothing)
        if (isNum(v.capaian) && (nonZero(v.actual) || nonZero(v.target))) set(b.capaian, f.key, v.capaian);
        b.rows[t.name] = t.grid.nos[i];
      }
      branches.forEach(function (b) { var i = rowFor(t, ctx, b); if (i >= 0) read(b, i); });
      if (t.area && t.area.row >= 0) read(areaRow, t.area.row);
    });
    return textCells;
  }

  /** Step 6. KPIs without their own column: DPK = Tabungan + Giro + Deposito, CASA = Tabungan + Giro, rasio CASA = CASA ÷ DPK. */
  function stepDerived(ctx, hits, all) {
    var derived = {};
    FIELDS.forEach(function (f) {
      if (!f.derive) return;
      var n = 0;
      all.forEach(function (b) {
        if (isNum(get(b.kpi, f.key))) return;
        var va = deriveVal(f.derive, f.from.map(function (k) { return get(b.kpi, k); }));
        var vt = deriveVal(f.derive, f.from.map(function (k) { return get(b.target, k); }));
        if (va == null) return;
        set(b.kpi, f.key, va);
        if (vt != null) set(b.target, f.key, vt);
        set(b.capaian, f.key, null);
        n++;
      });
      if (n && !hits[f.key]) {
        derived[f.key] = f.from.map(function (k) { return BY_KEY[k].label.replace(/ \(.*\)$/, ''); }).join(f.derive === 'ratio' ? ' ÷ ' : ' + ');
        ctx.warn('info', 'DERIVED', f.label + ' dihitung dari ' + derived[f.key] + ', karena kolom ' + q(f.label) + ' tidak ditemukan.', f.key);
      }
    });
    return derived;
  }

  /** Step 7. Capaian where the file has none, gap = target − actual, kurang (the shortfall in the bad direction). */
  function stepScores(all) {
    all.forEach(function (b) {
      FIELDS.forEach(function (f) {
        var a = get(b.kpi, f.key), t = get(b.target, f.key), c = get(b.capaian, f.key);
        if (!isNum(c) && isNum(a) && isNum(t) && t !== 0) set(b.capaian, f.key, f.better === 'down' ? 2 - a / t : a / t);
        if (isNum(a) && isNum(t)) {
          set(b.gap, f.key, t - a);
          set(b.kurang, f.key, f.better === 'down' ? Math.max(0, a - t) : Math.max(0, t - a));
        }
      });
    });
  }

  /**
   * Step 8. Scorecard branches without data this month (noData: true): every balance, booking and count is 0 or
   * empty, and so is every target of a "higher is better" KPI (a ceiling such as NPL consumer can be set without
   * data). Their zeros would take rank 1 on NPL and the last rank elsewhere, so they are left out of the ranks per
   * KPI; the skor KPI keeps the file's own ranking. Only when other branches do have data.
   */
  function stepNoData(ctx, peers) {
    var list = FIELDS.filter(function (f) { return f.unit === 'rp' || f.unit === 'jumlah'; });
    var empty = peers.map(function (b) {
      return list.every(function (f) { return !nonZero(get(b.kpi, f.key)) && (f.better === 'down' || !nonZero(get(b.target, f.key))); });
    });
    if (empty.every(Boolean)) return;
    peers.forEach(function (b, i) {
      if (!empty[i]) return;
      b.noData = true;
      ctx.warn('info', 'NO_DATA', branchLabel(b, ctx) + ' (' + b.code + ') tidak punya data bulan ini: semua saldo, booking dan targetnya 0. ' +
        'Cabang ini tidak ikut peringkat per KPI; peringkat skor KPI tetap mengikuti file.');
    });
  }
  function branchLabel(b, ctx) {
    if (b.code === HOME && ctx.home === HOME) return HOME_NAME;
    var n = str(b.name);
    return /^(kcp|kc|kk|cabang|unit|kantor)\b/i.test(n) ? n : 'Cabang ' + (n || b.code);
  }

  /**
   * Step 9. Ranks among the peers (by capaian, else by value), within the kelas (skor KPI), and the file's own rank.
   * Branches without data are not ranked per KPI; the skor KPI (rankAll) ranks every scorecard branch, as the file does.
   */
  function stepRanks(ctx, peerList) {
    var rankOf = {}, rankBy = {};
    FIELDS.forEach(function (f) {
      var list = f.rankAll ? peerList : peerList.filter(function (b) { return !b.noData; });
      var caps = list.map(function (b) { return get(b.capaian, f.key); });
      var byCap = caps.some(isNum);
      var ranks = rankValues(byCap ? caps : list.map(function (b) { return get(b.kpi, f.key); }), byCap ? 'up' : f.better);
      peerList.forEach(function (b) { set(b.rank, f.key, null); });
      list.forEach(function (b, i) { set(b.rank, f.key, ranks[i]); });
      rankOf[f.key] = ranks.filter(isNum).length;
      rankBy[f.key] = byCap ? 'capaian' : 'nilai';
    });
    var kel = {};
    peerList.forEach(function (b) { if (b.kelas) (kel[b.kelas] = kel[b.kelas] || []).push(b); });
    Object.keys(kel).forEach(function (k) {
      var r = rankValues(kel[k].map(function (b) { return b.kpi.skorKpi; }), 'up');
      kel[k].forEach(function (b, i) { b.rankKelas = r[i]; });
    });
    var rf = ctx.period ? resolve(RANK_FILE, ctx) : null;
    if (rf) {
      peerList.forEach(function (b) {
        var i = rowFor(rf.table, ctx, b);
        if (i >= 0) { var x = num(rf.table.grid.rows[i][rf.cols.actual]); b.rankFile = isNum(x) ? Math.round(x) : null; }
      });
      ctx.used[rf.table.name] = 1;
    }
    return { rankOf: rankOf, rankBy: rankBy };
  }

  /** Step 10. Warnings for what was not found or did not add up. */
  function stepWarnings(ctx, hits, derived, textCells, homeB, peerList) {
    var homeName = ctx.home === HOME ? HOME_NAME : 'Cabang ' + ctx.home;
    if (!homeB) ctx.warn('warn', 'HOME_MISSING', homeName + ' (' + ctx.home + ') tidak ada di file ini.');
    FIELDS.forEach(function (f) {
      var hit = hits[f.key], short = f.label.replace(/ \(.*\)$/, ''), rejected = ctx.rejected[f.key] || [];
      rejected.forEach(function (x) {
        var tail = hit ? '; ' + short + ' diambil dari sheet ' + q(hit.table.name) : derived[f.key] ? '; ' + short + ' dihitung dari ' + derived[f.key] : '';
        ctx.warn('warn', 'COLUMN_MISMATCH', 'Kolom ' + q(x.header) + ' di sheet ' + q(x.sheet) + ' tidak cocok (' + mismatchText(x.reason, x.kind, f) +
          ') dan tidak digunakan' + tail + '. Periksa judul kolomnya.', f.key, x.sheet);
      });
      if (!hit) {
        if (!derived[f.key]) {
          ctx.warn('warn', 'FIELD_MISSING', f.key === 'ureg' ? 'UREG tidak ada di file KPI ini. Angka UREG ada di laporan Rev LVM.' :
            rejected.length ? f.label + ' tidak dapat dibaca karena kolomnya tidak cocok.' : f.label + ' tidak ditemukan di file ini.', f.key);
        }
        return;
      }
      var sheet = hit.table.name;
      if (hit.shifted) {
        ctx.warn('info', 'COLUMN_SHIFTED', 'Judul ' + q(hit.header) + ' di sheet ' + q(sheet) + ' tidak tepat di atas kolom Realisasi-nya. ' +
          'Kolom Realisasi, Target dan Pencapaian di dekatnya digunakan karena angkanya saling cocok.', f.key, sheet);
      }
      if (hit.check && hit.check.bad) {
        ctx.warn('info', 'CAPAIAN_ODD', fmtInt(hit.check.bad) + ' baris ' + short + ' di sheet ' + q(sheet) + ' tidak cocok (' + mismatchText('cek', hit.check.kind, f) +
          '). Angka ' + (hit.check.kind === 'ratio' ? '%' : 'Pencapaian') + ' dari file tetap digunakan.', f.key, sheet);
      }
      if (f.target !== false && !has(hit.cols, 'target')) ctx.warn('warn', 'TARGET_MISSING', 'Target ' + f.label + ' tidak ditemukan, sehingga selisih tidak dihitung.', f.key, sheet);
      if (homeB && !isNum(get(homeB.kpi, f.key))) ctx.warn('warn', 'HOME_VALUE_MISSING', 'Nilai ' + f.label + ' ' + homeName + ' kosong di sheet ' + q(sheet) + '.', f.key, sheet);
      if (textCells[f.key]) ctx.warn('info', 'TEXT_CELLS', fmtInt(textCells[f.key]) + ' sel ' + f.label + ' berisi teks (misalnya ' + q('-') + ') dan dianggap kosong.', f.key, sheet);
      var miss = peerList.filter(function (b) { return !has(b.rows, sheet); }).length;
      if (miss) ctx.warn('info', 'ROWS_MISSING', fmtInt(miss) + ' cabang tidak ada di sheet ' + q(sheet) + '.', null, sheet);
    });
    if (homeB && isNum(homeB.rankFile) && isNum(homeB.rank.skorKpi) && homeB.rankFile !== homeB.rank.skorKpi) {
      ctx.warn('info', 'RANK_FILE', 'Peringkat ' + homeName + ' di file (' + homeB.rankFile + ') berbeda dengan peringkat dari skor KPI (' + homeB.rank.skorKpi + ').');
    }
  }

  function mismatchText(reason, kind, f) {
    if (reason === 'letak') return 'Realisasi, Target dan Pencapaian tidak berurutan di bawah judulnya';
    if (kind === 'ratio') return '% ≠ NPL ÷ Total';
    return f.better === 'down' ? 'Pencapaian ≠ 2 − Realisasi ÷ Target' : 'Pencapaian ≠ Realisasi ÷ Target';
  }

  /**
   * parseWorkbook(sheets, opts) → model (see the header). Never throws on a strange file: what is not found
   * is null in the model and listed in model.warnings; model.ok is false when no branch or fewer than three
   * KPIs were found (then it is not a KPI workbook).
   */
  function parseWorkbook(sheets, opts) {
    opts = opts || {};
    var list = (sheets || []).filter(function (s) { return s && Array.isArray(s.rows); });
    var file = opts.file || (list[0] && list[0].file) || null;
    var ctx = new Ctx(opts);
    stepPeriod(ctx, list, file, opts);
    stepTables(ctx, list);
    var peers = stepPeers(ctx, list, file, opts);
    var branches = peers.slice(), byCode = {};
    branches.forEach(function (b) { byCode[b.code] = b; });
    var areaRow = newBranch(ctx.areaCode, ctx.area ? 'Area ' + ctx.area : null, null, false, false);
    areaRow.isTotal = true;
    var hits = stepFields(ctx, branches, byCode, peers);
    var textCells = stepValues(ctx, hits, branches, areaRow);
    var all = branches.concat([areaRow]);
    var derived = stepDerived(ctx, hits, all);
    stepScores(all);
    stepNoData(ctx, peers);
    var ranking = stepRanks(ctx, peers);
    stepWarnings(ctx, hits, derived, textCells, byCode[ctx.home] || null, peers);

    var fieldList = FIELDS.map(function (f) {
      var hit = hits[f.key];
      return { key: f.key, label: f.label, unit: f.unit, better: f.better, found: !!hit || !!derived[f.key], derived: derived[f.key] || null,
        sheet: hit ? hit.table.name : null, header: hit ? hit.header : null, columns: hit ? hit.columns : null,
        rankBy: ranking.rankBy[f.key], tabs: f.tabs.slice() };
    });
    var found = fieldList.filter(function (x) { return x.found; }).length;
    var used = Object.keys(ctx.used);
    var hasArea = ctx.tables.some(function (t) { return t.area && t.area.row >= 0; });
    return {
      ok: peers.length > 0 && found >= 3, kind: 'kpi', version: VERSION,
      period: ctx.period, periodLabel: periodLabel(ctx.period), area: ctx.area || null, areaCode: ctx.areaCode || null,
      file: file, home: ctx.home, units: UNITS,
      branches: branches, areaTotal: hasArea ? areaRow : null, peerCount: peers.length, rankOf: ranking.rankOf,
      fields: fieldList, warnings: ctx.warnings,
      sheets: { used: used, ignored: list.map(function (s) { return str(s.name); }).filter(function (n) { return used.indexOf(n) < 0; }),
        oldPeriod: ctx.old, scorecard: ctx.scorecard ? ctx.scorecard.name : null }
    };
  }
  function nameMatchesPeer(name, peers) {
    var k = nameKey(name);
    return !!k && peers.some(function (p) { return nameKey(p.name) === k; });
  }
  function deriveVal(kind, xs) {
    if (!xs.every(isNum)) return null;
    if (kind === 'sum') return xs.reduce(function (a, b) { return a + b; }, 0);
    if (kind === 'ratio') return xs[1] ? xs[0] / xs[1] : null;
    return null;
  }

  /* --------------------------------------------------------- views of a model */

  /**
   * The KPI rows of one branch (default: the home branch) for a "Posisi cabang" list. met: capaian ≥ 100%.
   * The HIDDEN keys are left out (D41, D50); opts {all: true} keeps them (tests only). homeRows(model, {all}) works too.
   */
  function homeRows(model, code, opts) {
    if (code && typeof code === 'object') { opts = code; code = null; }
    var all = !!(opts && opts.all);
    var c = code || (model && model.home) || HOME;
    var b = model && (model.branches || []).filter(function (x) { return x.code === c; })[0];
    if (!b) return [];
    return FIELDS.filter(function (f) { return all || !hidden(f.key); }).map(function (f) {
      var cap = get(b.capaian, f.key);
      return { key: f.key, label: f.label, unit: f.unit, better: f.better, actual: get(b.kpi, f.key), target: get(b.target, f.key),
        capaian: cap, gap: get(b.gap, f.key), kurang: get(b.kurang, f.key), met: isNum(cap) ? cap >= 1 : null,
        rank: get(b.rank, f.key), of: (model.rankOf && model.rankOf[f.key]) || null, tabs: f.tabs.slice() };
    });
  }

  /* ----------------------------------------------------- dataset and vault */

  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  /** One record per branch plus one area record (isTotal: true) that carries the model's meta. */
  function toRecords(model) {
    if (!model) return [];
    var base = { period: model.period || null, area: model.area || null, areaCode: model.areaCode || null };
    var out = (model.branches || []).map(function (b) {
      var o = clone(b);
      o.id = 'kpi-' + (model.period || 'x') + '-' + b.code;
      Object.keys(base).forEach(function (k) { o[k] = base[k]; });
      return o;
    });
    var a = model.areaTotal ? clone(model.areaTotal) : newBranch(model.areaCode || null, model.area ? 'Area ' + model.area : null, null, false, false);
    a.isTotal = true;
    a.id = 'kpi-' + (model.period || 'x') + '-area';
    Object.keys(base).forEach(function (k) { a[k] = base[k]; });
    a.meta = { kind: 'kpi', version: VERSION, file: model.file || null, home: model.home || HOME, periodLabel: model.periodLabel || '',
      areaFound: !!model.areaTotal, peerCount: model.peerCount || 0, rankOf: clone(model.rankOf || {}), fields: clone(model.fields || []),
      warnings: clone(model.warnings || []), sheets: clone(model.sheets || {}) };
    out.push(a);
    return out;
  }
  /** Records (from MCD.data.kpi_cabang or the vault) → model. */
  function fromRecords(records) {
    var list = (records || []).filter(Boolean), a = list.filter(function (r) { return r.isTotal; })[0] || null, meta = (a && a.meta) || {};
    var strip = function (r) { var o = clone(r); ['id', 'period', 'area', 'areaCode', 'meta', 'src', '_demo'].forEach(function (k) { delete o[k]; }); return o; };
    var branches = list.filter(function (r) { return !r.isTotal; }).map(strip);
    var period = (a && a.period) || (list[0] && list[0].period) || null;
    return {
      ok: branches.some(function (b) { return b.peer; }), kind: 'kpi', version: meta.version || VERSION,
      period: period, periodLabel: meta.periodLabel || periodLabel(period), area: (a && a.area) || (list[0] && list[0].area) || null,
      areaCode: (a && a.areaCode) || null, file: meta.file || null, home: meta.home || HOME, units: UNITS,
      branches: branches, areaTotal: a && meta.areaFound !== false ? strip(a) : null,
      peerCount: meta.peerCount || branches.filter(function (b) { return b.peer; }).length, rankOf: meta.rankOf || {},
      fields: meta.fields || [], warnings: meta.warnings || [], sheets: meta.sheets || { used: [], ignored: [], oldPeriod: [], scorecard: null }
    };
  }
  /** Applies a parsed model: MCD.data.replace('kpi_cabang', records, {source, file, sheet, asOf: last day of the period}). */
  function apply(model, meta) {
    meta = meta || {};
    var M = MCD();
    if (!M || !M.data || typeof M.data.replace !== 'function') throw new Error('MCD.kpi.apply: MCD.data is not loaded');
    register();
    return M.data.replace(DATASET, toRecords(model), { source: meta.source || 'import', file: meta.file || model.file || null,
      sheet: (model.sheets && model.sheets.used || []).join(' + ') || null, asOf: periodEnd(model.period) });
  }

  /* --------------------------------------------------------------- detection */

  var NAME_HINTS = [/^rekap kpi/, /^kpi cabang$/, /^kpi area$/, S_DPK, S_KREDIT, S_BOOKING, S_KUALITAS, S_COF, /^data$/];
  /** detect(sheetNames) → {ok, use, score}: a KPI workbook has at least three of the usual sheets and is not an LVM report. */
  function detect(names) {
    var n = (names || []).map(str), use = [], score = 0;
    NAME_HINTS.forEach(function (re) {
      var hit = n.filter(function (x) { return re.test(fold(x)); });
      if (hit.length) { score++; hit.forEach(function (x) { if (use.indexOf(x) < 0) use.push(x); }); }
    });
    var lvm = n.some(function (x) { return /^rincian$/i.test(x); }) && n.some(function (x) { return /^(ureg|usak)$/i.test(x); });
    return { ok: score >= 3 && !lvm, use: use, score: score };
  }
  /** detectSheets(sheets) → {ok, score, found}: by header labels; score = the number of KPIs found. */
  function detectSheets(sheets) {
    var m = parseWorkbook(sheets, {});
    var found = m.fields.filter(function (f) { return f.found; }).map(function (f) { return f.key; });
    return { ok: m.ok, score: found.length, found: found };
  }

  /** inspect(sheet) → where the importer sees the code, name and kelas columns and the header labels. */
  function inspect(sheet) {
    var t = tableOf(sheet);
    if (!t) return null;
    return { codeCol: t.codeCol, nameCol: t.nameCol, kelasCol: t.kelasCol, firstRow: t.grid.nos[t.first],
      header: t.head.map(function (h) { return { row: h.no, labels: h.raw.map(function (l, c) { return l ? { col: c, label: l } : null; }).filter(Boolean) }; }) };
  }

  var workbookReader = {
    TYPE: 'kpi', HOME: HOME, label: 'Laporan KPI area bulanan',
    what: 'File Excel bulanan KPI area berisi DPK, CASA, kredit, booking, NPL dan skor KPI setiap cabang terhadap target.',
    detect: detect,
    read: function (file) {
      var M = MCD();
      if (!M || !M.importer || typeof M.importer.read !== 'function') return Promise.reject(new Error('MCD.importer is not loaded'));
      return M.importer.read(file).then(function (sheets) {
        var m = parseWorkbook(sheets, { file: file && file.name });
        if (!m.ok) {
          var e = new Error('File ini tidak terbaca sebagai laporan KPI area. Pastikan file berasal dari kantor area dan berisi sheet skor KPI per cabang.');
          e.user = true;
          throw e;
        }
        return m;
      });
    },
    toRecords: toRecords,
    apply: apply,
    periodLabel: periodLabel,
    summary: function (m) {
      var b = m && (m.branches || []).filter(function (x) { return x.code === (m.home || HOME); })[0];
      return { branch: b ? { code: b.code, name: b.name, rank: b.rank ? b.rank.skorKpi : null } : null, of: (m && m.peerCount) || 0, period: m ? m.period : null };
    }
  };

  /** Registers the dataset 'kpi_cabang' with MCD.data (bank data; idempotent). */
  function register() {
    var M = MCD();
    if (!M || !M.data || typeof M.data.registerDataset !== 'function') return false;
    if (M.data.keyFor && M.data.keyFor(DATASET)) return true;
    return M.data.registerDataset(DATASET, { types: ['kpi', 'kpi_cabang', 'kpi_area'], label: 'KPI cabang (laporan KPI area bulanan)', bank: true });
  }

  /** visibleWarnings(model) → the model's warnings without those about a HIDDEN key (D41: never shown). */
  function visibleWarnings(model) {
    return ((model && model.warnings) || []).filter(function (w) { return !(w && w.field && hidden(w.field)); });
  }

  return {
    VERSION: VERSION, HOME: HOME, DATASET: DATASET, UNITS: UNITS, FIELDS: FIELDS, LEAF: LEAF, HIDDEN: HIDDEN.slice(),
    parseWorkbook: parseWorkbook, homeRows: homeRows, visibleWarnings: visibleWarnings, rankValues: rankValues, get: get, keys: keys,
    detect: detect, detectSheets: detectSheets, inspect: inspect,
    toRecords: toRecords, fromRecords: fromRecords, apply: apply, workbookReader: workbookReader,
    num: num, codeOf: codeOf, periodLabel: periodLabel, periodEnd: periodEnd, register: register
  };
});
