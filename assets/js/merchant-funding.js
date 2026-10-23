/* ==========================================================================
 * MCD.funding: the region's "Funding Merchant Mass Retail" report for KCP Jakarta Cilangkap.
 * Pure logic, no DOM, no storage, no network. Method and the reasons behind each rule:
 * docs/MERCHANT_FUNDING.md.
 *
 * What it reads (sheets as MCD.importer.read() gives them, headers found by content):
 *   'funding-region'  the daily region workbook "<ddmmyyyy> Funding Merchant Mass Retail - sent.xlsx":
 *                     "Detail MID R04" (one row per MID, the whole region), "Commonname" (one row per
 *                     merchant name), "All Cab" (one row per branch, grouped by area) and "Summary Area".
 *   'funding-branch'  the branch extract "Cilangkap Merchant Area.xlsx" (one sheet, one row per merchant name).
 * Both may be read together (sheets of two files in one call, or merge(a, b) later): they are joined by
 * merchant name (commonname).
 *
 * Our branch only: rows whose branch code (cd_cbg_perform) is 12903 are kept; when the code is missing, the
 * branch name "KCP JAKARTA CILANGKAP" decides. Other branches' rows are counted in the report and dropped.
 *
 * Privacy: merchantofficialname (the owner's name for a Perorangan account), cifno, norekening, Alamat, actype
 * and sccode are never kept. The address is read once per row to find the kecamatan / kelurahan
 * (MCD.lvm.resolveKecamatan / resolveKelurahan, MCD.geocodeLocal when present) and then dropped. A merchant's
 * balance is kept only as a band (BANDS) and a direction (naik / turun / tetap). Exact sums exist only for the
 * branch as a whole and for its Tabungan / Giro split, and the split only while each part (and what is left
 * when one is hidden) holds money of at least MIN_GROUP merchants and MIN_GROUP accounts at every date. Groups by
 * LOB or kecamatan carry counts, bands and directions, never sums, so no subtraction of one sum from another
 * can give one merchant's balance. Other branches are kept as ranks only, never by name or value (the v7
 * "Posisi cabang" rule, V7_SPEC D24); our area's own figures only when the area has at least MIN_GROUP branches.
 *
 * API
 *   detect(sheets) → 'funding-region' | 'funding-branch' | null
 *   parse(sheets, opts?) → model                     opts {home:'12903', homeName, file, resolve}
 *     model = {ok, kind:'funding', version, layout:'funding-region'|'funding-branch'|'both', asOf:'YYYY-MM-DD',
 *              home:{code, name, area}, merchants:[merchant], aggregates, peers | null, report}
 *     merchant = {id, level:'mid'|'cn', mid, cn, dba, lob, cat, buc, edc, tierSv, tierFreq, holder, product,
 *                 qrisMdr:{off, on} | null, installment, kawasan, kota, prov, kecId, kelId, openYm,
 *                 bal:{band, trendMom, trendMtd, flagEdc}, cnBal:{band, trendMom, trendMtd, flagEdc, edc} | null,
 *                 sharedAccount, multiBranch, src:{file, sheet, row}}
 *   merge(a, b) → model                              joins a region model and a branch model by merchant name
 *   match(modelOrMerchants, lookups, opts?) → {byId, edc, lvm, poi, counts}
 *   buildLookups({edc, lvm, poi}, opts?) → lookups   plain arrays → the lookups match() needs
 *   toRecords(model) → records · fromRecords(records) → model     the dataset / vault form
 *   audit(x) → [paths of forbidden keys]             empty when nothing personal is in x
 *   bandOf(rupiah, hasAccount?) · trendOf(now, before) · periodLabel('2026-10-18') → '18 Okt 2026'
 *   workbookReader = {TYPE:'funding', HOME, label, what, detect, read, toRecords, apply, periodLabel, summary}
 *     (not registered anywhere: the shell wires it in later)
 *   BANDS · TIERS · HOLDERS · DROP_COLUMNS · MIN_GROUP · DATASET · HOME · VERSION
 * UMD: MCD.funding in the browser (classic script), module.exports in Node.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.funding = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var VERSION = 1;
  var HOME = '12903';
  var HOME_NAME = 'KCP JAKARTA CILANGKAP';
  var DATASET = 'funding_merchant';
  var MIN_GROUP = 3;                 // an exact sum needs money of at least this many merchants and accounts (doc §7)
  var TREND_REL = 0.01;              // 'tetap' when the change is within 1% of the earlier balance ...
  var TREND_ABS = 1000;              // ... or within Rp 1.000 (interest and rounding)

  /* Balance bands (rupiah, average balance at the position date). Order-of-magnitude steps; see the doc §4. */
  var BANDS = [
    { id: 'nol', label: 'Tanpa saldo', min: null, max: 0 },
    { id: 'lt1jt', label: 'Di bawah Rp1 juta', min: 0, max: 1e6 },
    { id: '1-10jt', label: 'Rp1–10 juta', min: 1e6, max: 1e7 },
    { id: '10-100jt', label: 'Rp10–100 juta', min: 1e7, max: 1e8 },
    { id: 'ge100jt', label: 'Rp100 juta ke atas', min: 1e8, max: null }
  ];
  var TIERS = {
    sv: { nihil: 'Nihil', kurang: 'Kurang optimal', hampir: 'Hampir optimal', optimal: 'Optimal' },
    freq: { nihil: 'Nihil', kurang: 'Kurang aktif', hampir: 'Hampir aktif', aktif: 'Aktif' }
  };
  var HOLDERS = { perorangan: 'Perorangan', badan: 'Badan usaha', koperasi: 'Koperasi' };
  var TRENDS = { naik: 'Naik', turun: 'Turun', tetap: 'Tetap' };

  /* Columns never kept (normalised header → why). Matched on the normalised header label. */
  var DROP_COLUMNS = ['merchantofficialname', 'cifno', 'norekening', 'Alamat', 'actype', 'sccode'];
  var DROP_RE = /^(merchantofficialname|merchant_official_name|official_name|nama_pemilik|pemilik|owner(_name)?|cif|cifno|cif_no|no_cif|norekening|no_rekening|norek|rekening|account(_no|_number)?|alamat|alamat_\w+|address|actype|ac_type|sccode|sc_code|nik|no_ktp|no_hp|hp|telepon|phone|email)$/;
  var FORBIDDEN_KEY = /^(merchantofficialname|officialname|official_name|owner|ownername|owner_name|nama_pemilik|cif|cifno|cif_no|no_cif|norekening|no_rekening|norek|rekening|account|accountno|account_no|account_number|alamat|address|actype|sccode|nik|phone|email)$/i;

  var MONTHS = [['jan', 'januari', 'january'], ['feb', 'februari', 'pebruari', 'february'], ['mar', 'maret', 'march'], ['apr', 'april'],
    ['mei', 'may'], ['jun', 'juni', 'june'], ['jul', 'juli', 'july'], ['agu', 'agt', 'ags', 'agustus', 'aug', 'august'],
    ['sep', 'sept', 'september'], ['okt', 'oktober', 'oct', 'october'], ['nov', 'nopember', 'november'], ['des', 'desember', 'dec', 'december']];
  var MONTH_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var WEEK_EN = /^(sun|mon|tue|wed|thu|fri|sat)[a-z]*,?\s+([a-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i;
  var MON_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  /* ------------------------------------------------------------- helpers */

  function M() { return root && root.MCD; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function fold(s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t;
  }
  function words(s) { return fold(s).replace(/&/g, ' dan ').replace(/[^a-z0-9]+/g, ' ').trim(); }
  /** Header label → key: lower case, '%' → 'pct', every other character run → '_'. "% MtD" → 'pct_mtd'. */
  function head(h) {
    if (h && typeof h.getTime === 'function') return '';
    return fold(h).replace(/%/g, ' pct ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  /** A text cell, with the report's empty markers (0, '0', '-', '#N/A') as null; inner spaces collapsed. */
  function text(v) {
    if (v == null || v === 0) return null;
    var s = String(v).replace(/\s+/g, ' ').trim();
    return !s || /^(0|-+|#n\/a|n\/a|null|none|nan)$/i.test(s) ? null : s;
  }
  function numOf(v) {
    if (isNum(v)) return v;
    var s = str(v);
    if (!s || /^-+$/.test(s)) return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
    var I = M() && M().importer;
    if (I && I.parse && typeof I.parse.num === 'function') { var x = I.parse.num(s); return isNum(x) ? x : null; }
    return null;
  }
  function intOf(v) { var x = numOf(v); return isNum(x) ? Math.round(x) : null; }
  function codeOf(v) {
    var s = isNum(v) ? String(Math.round(v)) : str(v).replace(/\.0+$/, '');
    return /^\d{5}$/.test(s) ? s : null;
  }
  function idOf(v) {
    var s = isNum(v) ? String(Math.round(v)) : str(v).replace(/\.0+$/, '');
    return !s || /^(0|-+|null|none|nan|#n\/a)$/i.test(s) ? null : s;
  }
  /** Merchant name key for joins: upper case, spaces collapsed. */
  function cnKey(s) { var t = text(s); return t ? t.toUpperCase() : null; }
  function branchNameKey(s) { return words(s).replace(/^(kcp|kc|kk|kantor cabang pembantu|kantor cabang)\s+/, ''); }
  function hash(s) {
    var U = M() && M().util;
    if (U && typeof U.fnv1a === 'function') return U.fnv1a(String(s)) >>> 0;
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function hex8(s) { return ('0000000' + hash(s).toString(16)).slice(-8); }

  /* --------------------------------------------------------------- dates */

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(y, m, d) {
    if (!(y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    var t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCMonth() === m - 1 ? y + '-' + pad(m) + '-' + pad(d) : null;
  }
  function serialYmd(n) {
    var t = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  function addDay(s, k) {
    var t = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + k * 86400000);
    return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  /**
   * A date cell or header → 'YYYY-MM-DD' | null. Accepts a Date (SheetJS cellDates; local midnight, rounded to the
   * nearest day), an Excel serial (as a number or as the text the importer makes of a header), yyyymmdd (text or
   * number), ISO text, m/d/yyyy (the report's own "10/18/2026 Single") and the text of a Date
   * ("Sun Oct 18 2026 00:00:00 GMT+0700 …", what the importer makes of a date in a first-row header).
   */
  function dateOf(v) {
    if (v == null || v === '') return null;
    if (typeof v.getTime === 'function') {
      if (isNaN(v.getTime())) return null;
      var t = v.getTime() - v.getTimezoneOffset() * 60000, r = new Date(Math.round(t / 86400000) * 86400000);
      return ymd(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate());
    }
    if (isNum(v)) {
      if (v >= 19000101 && v <= 21001231 && Math.floor(v) === v) return ymd(Math.floor(v / 10000), Math.floor(v / 100) % 100, v % 100);
      return v >= 36526 && v <= 73051 ? serialYmd(v) : null;          // 2000-01-01 … 2099-12-31
    }
    var s = str(v), m;
    if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return ymd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{5})(?:\.0+)?$/.exec(s))) return +m[1] >= 36526 && +m[1] <= 73051 ? serialYmd(+m[1]) : null;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(s))) return ymd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(s))) return +m[1] > 12 ? ymd(+m[3], +m[2], +m[1]) : ymd(+m[3], +m[1], +m[2]);
    if ((m = WEEK_EN.exec(s))) {
      var mo = MON_EN.indexOf(m[2].toLowerCase()), d = ymd(+m[4], mo + 1, +m[3]);
      return d && m[5] != null && +m[5] >= 12 ? addDay(d, 1) : d;        // 23:59 the day before = this day
    }
    return null;
  }
  /** "Posisi 18 Oktober 2026" (title cells) → '2026-10-18' | null. */
  function posisiOf(v) {
    var m = /\bposisi\b[^0-9]*(\d{1,2})\s+([a-z]+)\.?\s+(20\d\d)/.exec(fold(v));
    if (!m) return null;
    for (var i = 0; i < MONTHS.length; i++) if (MONTHS[i].indexOf(m[2]) >= 0) return ymd(+m[3], i + 1, +m[1]);
    return null;
  }
  function periodLabel(d) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(str(d));
    if (!m) return '';
    return (m[3] ? +m[3] + ' ' : '') + MONTH_ID[+m[2] - 1] + ' ' + m[1];
  }
  /** The comparison dates of a position date among the dates a sheet has (the report's own rules, doc §3). */
  function basesOf(dates) {
    var ds = dates.slice().sort(), pos = ds[ds.length - 1] || null, out = { pos: pos, dtd: null, mom: null, mtd: null, ytd: null };
    if (!pos) return out;
    var month = pos.slice(0, 7), year = pos.slice(0, 4);
    var py = +pos.slice(0, 4), pm = +pos.slice(5, 7) - 1;
    if (pm < 1) { pm = 12; py--; }
    var prevMonth = py + '-' + pad(pm), sameDay = prevMonth + '-' + pos.slice(8, 10);
    ds.forEach(function (d) {
      if (d < pos) out.dtd = d;
      if (d.slice(0, 7) < month) out.mtd = d;
      if (d.slice(0, 4) < year) out.ytd = d;
    });
    if (ds.indexOf(sameDay) >= 0) out.mom = sameDay;
    else ds.forEach(function (d) { if (d.slice(0, 7) === prevMonth && d <= sameDay) out.mom = d; });
    return out;
  }

  /* --------------------------------------------------------------- bands */

  /** Rupiah → band id; null when there is no account behind the MID and no balance. */
  function bandOf(v, hasAccount) {
    if (!isNum(v)) return hasAccount === false ? null : (hasAccount ? 'nol' : null);
    if (v <= 0) return hasAccount === false ? null : 'nol';
    for (var i = 1; i < BANDS.length; i++) if (BANDS[i].max == null || v < BANDS[i].max) return BANDS[i].id;
    return BANDS[BANDS.length - 1].id;
  }
  function trendOf(now, before) {
    if (!isNum(now) || !isNum(before)) return null;
    var d = now - before;
    if (Math.abs(d) <= Math.max(TREND_ABS, TREND_REL * Math.abs(before))) return 'tetap';
    return d > 0 ? 'naik' : 'turun';
  }
  function tierOf(v, kind) {
    var s = words(v);
    if (!s || s === '0') return null;
    if (/^nihil/.test(s)) return 'nihil';
    if (/^kurang/.test(s)) return 'kurang';
    if (/^hampir/.test(s)) return 'hampir';
    if (kind === 'sv' && /^optimal/.test(s)) return 'optimal';
    if (kind === 'freq' && /^aktif/.test(s)) return 'aktif';
    return null;
  }
  function holderOf(v) {
    var s = words(v);
    if (/^perorangan|^individu/.test(s)) return 'perorangan';
    if (/^badan|^bu\b|^pt\b|^cv\b/.test(s)) return 'badan';
    if (/^koperasi/.test(s)) return 'koperasi';
    return null;
  }
  function productOf(v) { var s = str(v).toUpperCase(); return s === 'TABU' || s === 'GIRO' ? s : null; }
  function yesNo(v) { var s = words(v); return s === 'ada' || s === 'ya' || s === 'y' ? true : (s === 'tidak ada' || s === 'tidak' || s === 'no' ? false : null); }
  function ymOf(v) { var d = dateOf(v); return d ? d.slice(0, 7) : null; }

  /* The report's LOB groups (English) → the dashboard's three categories; the rest goes through MCD.lvm. */
  var LOB_CAT = { 'f dan b': 'restaurant', 'food dan beverage': 'restaurant', 'restaurant': 'restaurant', 'groceries': 'grocery',
    'mini market dan convenience stores': 'grocery', 'minimarket dan convenience stores': 'grocery', 'grocery': 'grocery' };
  function categoryOf(lob) {
    var k = words(lob);
    if (!k) return 'other';
    if (has(LOB_CAT, k)) return LOB_CAT[k];
    var L = M() && M().lvm;
    if (L && typeof L.categoryOfLob === 'function') { try { var c = L.categoryOfLob(lob); if (c) return c; } catch (e) { /* ignore */ } }
    return 'other';
  }

  /* ------------------------------------------------------------- sheets */

  /** Sheet → grid {rows, nos}: the importer's header row back on top, so header rows are found by content. */
  function gridOf(sheet) {
    var hs = sheet && Array.isArray(sheet.headers) ? sheet.headers : [], rows = (sheet && Array.isArray(sheet.rows)) ? sheet.rows : [];
    var nos = Array.isArray(sheet && sheet.rowNos) ? sheet.rowNos : rows.map(function (r, i) { return i + 2; });
    var hasHead = hs.some(function (v) { return v != null && v !== ''; });
    return { rows: hasHead ? [hs].concat(rows) : rows.slice(), nos: hasHead ? [sheet.headerRow || 1].concat(nos) : nos.slice() };
  }
  function heads(row) { return (row || []).map(head); }
  function idx(H, keys) {
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k], i = typeof key === 'string' ? H.indexOf(key) : -1;
      if (key instanceof RegExp) for (var j = 0; j < H.length; j++) if (key.test(H[j])) { i = j; break; }
      if (i >= 0) return i;
    }
    return -1;
  }
  var SCAN = 15;
  /** What a sheet is: {kind:'detail'|'cn'|'allcab'|'summary', h} or null. */
  function classify(sheet) {
    var g = gridOf(sheet), n = Math.min(g.rows.length, SCAN);
    for (var i = 0; i < n; i++) {
      var H = heads(g.rows[i]);
      var hasCode = H.indexOf('cd_cbg_perform') >= 0 || H.indexOf('kode_cabang') >= 0, hasCn = H.indexOf('commonname') >= 0;
      if (hasCode && hasCn && H.indexOf('mid') >= 0) return { kind: 'detail', h: i, g: g };
      if (hasCode && hasCn) return { kind: 'cn', h: i, g: g };
      if (H.indexOf('kocab') >= 0 && i + 1 < g.rows.length && heads(g.rows[i + 1]).indexOf('jml_mid') >= 0) return { kind: 'allcab', h: i, g: g };
      if (H.indexOf('area') >= 0 && (g.rows[i] || []).some(function (v) { return /tabungan|giro|casa/i.test(str(v)); }) &&
        i + 1 < g.rows.length && heads(g.rows[i + 1]).indexOf('jml_mid') >= 0) return { kind: 'summary', h: i, g: g };
    }
    return null;
  }
  function groupLayout(cls) {
    var kinds = cls.filter(Boolean).map(function (c) { return c.kind; });
    if (kinds.indexOf('detail') >= 0 || kinds.indexOf('allcab') >= 0) return 'funding-region';
    if (kinds.indexOf('cn') >= 0) return 'funding-branch';
    return null;
  }
  /** detect(sheets) → 'funding-region' | 'funding-branch' | null (several files: the region one wins). */
  function detect(sheets) {
    var list = (sheets || []).filter(Boolean);
    if (!list.length) return null;
    return groupLayout(list.map(function (s) { try { return classify(s); } catch (e) { return null; } }));
  }
  function posisiIn(g, upTo) {
    for (var i = 0; i < Math.min(g.rows.length, upTo); i++) {
      var r = g.rows[i] || [];
      for (var c = 0; c < r.length; c++) { var d = typeof r[c] === 'string' ? posisiOf(r[c]) : null; if (d) return d; }
    }
    return null;
  }

  /* ------------------------------------------------- area from the address */

  var STREET_WORD = /^(jl|jln|jalan|gg|gang|raya|komplek|kompleks|komp|perum|perumahan|blok|cluster|griya|villa|taman|ruko|psr)$/;
  function resolver(opts) {
    if (opts && opts.resolve === false) return null;
    var R = opts && opts.resolve && typeof opts.resolve === 'object' ? opts.resolve : null;
    var L = M() && M().lvm, G = M() && M().geocodeLocal;
    var out = {
      resolveKecamatan: R && R.resolveKecamatan || (L && L.resolveKecamatan) || null,
      resolveKelurahan: R && R.resolveKelurahan || (L && L.resolveKelurahan) || null,
      geocodeLocal: R && has(R, 'geocodeLocal') ? R.geocodeLocal : (G || null),
      areas: R && has(R, 'areas') ? R.areas : ((root && root.MCD_ADMIN_AREAS) || null)
    };
    return typeof out.resolveKecamatan === 'function' ? out : null;
  }
  function tryKec(R, name, kota) {
    try { var r = R.resolveKecamatan(name, kota || undefined); return r && r.id && (kota || !r.ambiguous) ? r : null; } catch (e) { return null; }
  }
  /**
   * Kecamatan and kelurahan named in an address (read once, never kept). "Kec. X" first; else the last place in
   * the text that is a kecamatan of the row's kota (not right after a street word: "Jl. Raya Ciracas" is a street).
   */
  function areaOfAddress(addr, kota, R) {
    var out = { kecId: null, kelId: null, via: null };
    if (!R || !addr) return out;
    var t = words(addr), toks = t ? t.split(' ') : [], kec = null, m;
    var re = /\b(?:kec|kecamatan)\s+([a-z ]+?)(?=\s+(?:kel|kelurahan|desa|ds|kota|kab|kabupaten|jakarta|prov|provinsi|propinsi|rt|rw|no|kode|kodepos|kab|dki|jawa|jabar|indonesia)\b|\s+\d|$)/g;
    while (!kec && (m = re.exec(t))) {
      var w = m[1].trim().split(' ');
      for (var n = Math.min(3, w.length); n >= 1 && !kec; n--) kec = tryKec(R, w.slice(0, n).join(' '), kota);
    }
    for (var end = toks.length; end >= 1 && !kec && kota; end--) {
      for (var len = 3; len >= 1 && !kec; len--) {
        var s = end - len;
        if (s < 0) continue;
        var gram = toks.slice(s, end).join(' ');
        if (gram.replace(/ /g, '').length < 4 || /\d/.test(gram)) continue;
        if (s > 0 && STREET_WORD.test(toks[s - 1])) continue;
        if (toks[end] === 'raya') continue;
        kec = tryKec(R, gram, kota);
      }
    }
    if (kec) {
      out.kecId = kec.id;
      out.via = 'kecamatan';
      if (typeof R.resolveKelurahan === 'function') { try { var kl = R.resolveKelurahan(addr, kec.id); if (kl && kl.id) out.kelId = kl.id; } catch (e) { /* ignore */ } }
      if (!out.kelId) { var st = streetIn(addr, kec.id, R); if (st && st.kel) out.kelId = st.kel; }
      return out;
    }
    /* No kecamatan name: a kelurahan name, else a street, that exists in exactly one kecamatan of the row's kota. */
    var kecs = kecamatanOfKota(kota, R.areas);
    if (!kecs.length) return out;
    var hits = [];
    if (typeof R.resolveKelurahan === 'function') {
      kecs.forEach(function (k) { try { var x = R.resolveKelurahan(addr, k.id); if (x && x.id) hits.push({ kec: k.id, kel: x.id }); } catch (e) { /* ignore */ } });
      if (hits.length === 1) { out.kecId = hits[0].kec; out.kelId = hits[0].kel; out.via = 'kelurahan'; return out; }
    }
    if (hits.length) return out;                                          // the name exists in several kecamatan
    kecs.forEach(function (k) { var st = streetIn(addr, k.id, R); if (st) hits.push(st); });
    if (hits.length === 1) { out.kecId = hits[0].kec; out.kelId = hits[0].kel || null; out.via = 'jalan'; }
    return out;
  }
  /** A sure street or kampung match of the address inside one kecamatan (MCD.geocodeLocal), else null. */
  function streetIn(addr, kecId, R) {
    var G = R.geocodeLocal;
    if (!G || typeof G.locate !== 'function') return null;
    try {
      if (typeof G.ready === 'function' && !G.ready()) return null;
      var g = G.locate({ address: addr, kecamatanId: kecId });
      if (g && (g.precision === 'jalan' || g.precision === 'kampung') && g.confidence !== 'perkiraan') return { kec: kecId, kel: g.kelurahanId || null };
    } catch (e) { /* ignore */ }
    return null;
  }
  function kotaKey(s) {
    var f = ' ' + words(s) + ' ';
    return { kind: /\b(kabupaten|kab)\b/.test(f) ? 'kab' : (/\bkota\b/.test(f) ? 'kota' : ''),
      core: f.replace(/\b(kota administrasi|kota adm|kabupaten|kab|kota|adm|administrasi)\b/g, ' ').replace(/[^a-z0-9]+/g, '') };
  }
  /** The kecamatan of a kota named as in the report ("JAKARTA TIMUR (KOTA ADMINISTRASI)", "BOGOR (KAB)"). */
  function kecamatanOfKota(kota, A) {
    if (!A || !Array.isArray(A.kota) || !Array.isArray(A.kecamatan) || !kota) return [];
    var k = kotaKey(kota);
    if (!k.core) return [];
    var hit = A.kota.filter(function (x) {
      var kind = /kabupaten/i.test(x.kind || x.name) ? 'kab' : 'kota';
      return words(x.short || x.name).replace(/ /g, '') === k.core && (!k.kind || k.kind === kind);
    });
    if (hit.length !== 1) return [];
    return A.kecamatan.filter(function (x) { return x.kota === hit[0].id; });
  }

  /* ------------------------------------------------------------ branch filter */

  /* The branch name decides only for rows without a code: opts.homeName, or HOME_NAME for 12903 itself. */
  function homeTest(opts) {
    var code = str(opts && opts.home) || HOME, given = str(opts && opts.homeName);
    var name = given ? branchNameKey(given) : (code === HOME ? branchNameKey(HOME_NAME) : '');
    return function (codeCell, nameCell) {
      var c = codeOf(codeCell);
      if (c) return c === code ? 'code' : 'other';
      if (name && branchNameKey(nameCell) === name) return 'name';
      return text(nameCell) ? 'other' : 'none';
    };
  }
  function newRowReport() { return { read: 0, kept: 0, keptByName: 0, otherBranch: 0, noBranch: 0 }; }

  /* ------------------------------------------------------------- columns */

  function dropLabels(row) {
    var out = [];
    (row || []).forEach(function (v) { var k = head(v); if (k && DROP_RE.test(k) && out.indexOf(str(v)) < 0) out.push(str(v)); });
    return out;
  }
  /** Date columns of a header row: [{c, d}] (first column per date); group labels above it split the blocks. */
  function dateCols(g, h, keepGroup) {
    var row = g.rows[h] || [], groups = [], out = [], seen = {};
    for (var up = 0; up < h; up++) {
      (g.rows[up] || []).forEach(function (v, c) { if (typeof v === 'string' && /^(avbal|endbal|average|saldo)/i.test(v.trim())) groups.push({ c: c, g: v.trim().toLowerCase() }); });
    }
    groups.sort(function (a, b) { return a.c - b.c; });
    row.forEach(function (v, c) {
      var d = (typeof v === 'string' && /single/i.test(v)) ? null : dateOf(v);
      if (!d) return;
      var grp = null;
      groups.forEach(function (x) { if (x.c <= c) grp = x.g; });
      if (keepGroup && grp && !keepGroup.test(grp)) return;
      if (seen[d]) return;
      seen[d] = 1;
      out.push({ c: c, d: d });
    });
    return out;
  }
  function singleCols(row) {
    var out = {};
    (row || []).forEach(function (v, c) { if (typeof v === 'string' && /single/i.test(v)) { var d = dateOf(v.replace(/single/i, '').trim()); if (d && !has(out, d)) out[d] = c; } });
    return out;
  }
  function figures(bal, B) {
    var pos = B.pos ? bal[B.pos] : null, o = { pos: isNum(pos) ? pos : null };
    ['dtd', 'mom', 'mtd', 'ytd'].forEach(function (k) {
      var b = B[k] ? bal[B[k]] : null;
      o[k] = isNum(pos) && isNum(b) ? pos - b : null;
      o[k + 'Pct'] = isNum(pos) && isNum(b) && b ? (pos - b) / Math.abs(b) : null;
    });
    return o;
  }

  /* ----------------------------------------------------- layout A: detail */

  function parseDetail(c, ctx) {
    var g = c.g, h = c.h, H = heads(g.rows[h]), row = g.rows[h], rep = newRowReport();
    var col = {
      cn: H.indexOf('commonname'), mid: H.indexOf('mid'), edc: idx(H, ['jumlah_edc', 'jml_edc']), dba: idx(H, ['merchantdbaname', 'merchant_dba_name', 'dba_name']),
      code: idx(H, ['cd_cbg_perform', 'kode_cabang']), bname: idx(H, ['cbg_perform', 'nama_cabang']), area: idx(H, ['area_perform', 'nama_area']),
      lob: idx(H, ['grouping_lob', 'lob']), buc: idx(H, ['buc_merchant', 'buc']), open: idx(H, ['open_date']),
      sv: idx(H, ['tier_sv_tbrs', /^tier_sv/]), freq: idx(H, ['tier_freq_tbrs', /^tier_freq/]), holder: idx(H, [/^jenis_rek/]),
      prod: idx(H, ['code_product', 'product']), qOff: idx(H, ['mdr_qris_off']), qOn: idx(H, ['mdr_qris_on']), inst: idx(H, ['installment']),
      kawasan: idx(H, ['kawasan']), kota: idx(H, ['kota_ics', 'kota']), prov: idx(H, ['provinsi', 'prov']), addr: idx(H, ['alamat', 'address']),
      acc: idx(H, ['norekening', 'no_rekening'])
    };
    var av = dateCols(g, h, /avbal|average/), D = {}, dates = av.map(function (x) { D[x.d] = x.c; return x.d; });
    var B = basesOf(dates), S = singleCols(row);
    var useSingle = dates.length && dates.every(function (d) { return has(S, d); });
    var test = homeTest(ctx.opts), R = ctx.resolve, seenAcc = {}, cnOther = {}, kept = [], areaCount = {}, nameCount = {}, codeArea = {}, accountRead = false;
    var areaStats = { tried: 0, kecamatan: 0, kelurahan: 0, via: {} };
    for (var i = h + 1; i < g.rows.length; i++) {
      var r = g.rows[i] || [];
      if (!r.some(function (v) { return v != null && v !== ''; })) continue;
      rep.read++;
      var rc = codeOf(r[col.code]);
      if (rc && !has(codeArea, rc)) codeArea[rc] = text(r[col.area]);
      var who = test(r[col.code], r[col.bname]);
      if (who === 'other' || who === 'none') {
        if (who === 'other') rep.otherBranch++; else rep.noBranch++;
        var ok = cnKey(r[col.cn]);
        if (ok) cnOther[ok] = 1;
        continue;
      }
      rep.kept++;
      if (who === 'name') rep.keptByName++;
      kept.push(i);
      var a = text(r[col.area]);
      if (a) areaCount[a] = (areaCount[a] || 0) + 1;
      var bn = text(r[col.bname]);
      if (bn) nameCount[bn] = (nameCount[bn] || 0) + 1;
    }
    var merchants = [], sums = [];
    kept.forEach(function (i) {
      var r = g.rows[i], cn = text(r[col.cn]), mid = idOf(r[col.mid]), dba = text(r[col.dba]) || cn;
      var product = productOf(r[col.prod]), edc = intOf(r[col.edc]) || 0, kota = text(r[col.kota]);
      var bal = {}, tot = {};
      dates.forEach(function (d) { var v = numOf(r[D[d]]); bal[d] = isNum(v) ? v : 0; });
      /* the branch total counts an account once: the report's "Single" columns, else the first MID of an account */
      var shared = false;
      if (useSingle) {
        dates.forEach(function (d) { var v = numOf(r[S[d]]); tot[d] = isNum(v) ? v : 0; });
        shared = dates.some(function (d) { return bal[d] && !tot[d]; });
      } else {
        var acc = col.acc >= 0 ? idOf(r[col.acc]) : null;            // read here only, never kept
        if (col.acc >= 0) accountRead = true;
        shared = !!(acc && seenAcc[acc]);
        if (acc) seenAcc[acc] = 1;
        dates.forEach(function (d) { tot[d] = shared ? 0 : bal[d]; });
      }
      var area = { kecId: null, kelId: null, via: null };
      if (R && col.addr >= 0) {
        var addr = text(r[col.addr]);                                   // the address: this step only ('-' = none)
        if (addr) { areaStats.tried++; area = areaOfAddress(addr, kota, R); }
        addr = null;
        if (area.kecId) { areaStats.kecamatan++; areaStats.via[area.via] = (areaStats.via[area.via] || 0) + 1; }
        if (area.kelId) areaStats.kelurahan++;
      }
      var lob = text(r[col.lob]), key = cnKey(cn);
      var qOff = numOf(r[col.qOff]), qOn = numOf(r[col.qOn]);
      var band = B.pos ? bandOf(bal[B.pos], product ? true : (bal[B.pos] ? true : false)) : null;   // null: no account behind the MID
      var rec = {
        id: 'F' + hex8(mid ? 'm:' + mid : 'r:' + key + '|' + i), level: 'mid', mid: mid, cn: cn, dba: dba,
        lob: lob, cat: categoryOf(lob), buc: text(r[col.buc]), edc: edc,
        tierSv: tierOf(r[col.sv], 'sv'), tierFreq: tierOf(r[col.freq], 'freq'), holder: holderOf(r[col.holder]), product: product,
        qrisMdr: isNum(qOff) || isNum(qOn) ? { off: isNum(qOff) ? qOff : null, on: isNum(qOn) ? qOn : null } : null,
        installment: col.inst >= 0 ? yesNo(r[col.inst]) : null, kawasan: text(r[col.kawasan]), kota: kota, prov: text(r[col.prov]),
        kecId: area.kecId, kelId: area.kelId, openYm: ymOf(r[col.open]),
        bal: { band: band, trendMom: band && B.mom ? trendOf(bal[B.pos], bal[B.mom]) : null,
          trendMtd: band && B.mtd ? trendOf(bal[B.pos], bal[B.mtd]) : null, flagEdc: edc > 0 },
        cnBal: null, sharedAccount: shared, multiBranch: !!(key && cnOther[key]),
        src: { file: ctx.file || null, sheet: ctx.sheet || null, row: g.nos[i] || null }
      };
      merchants.push(rec);
      sums.push(tot);
    });
    var top = function (o) { return Object.keys(o).sort(function (x, y) { return o[y] - o[x]; })[0] || null; };
    var homeArea = top(areaCount), areaCodes = {};
    Object.keys(codeArea).forEach(function (c) { if (homeArea && codeArea[c] === homeArea) areaCodes[c] = 1; });
    seenAcc = null;
    return { merchants: merchants, sums: sums, dates: dates, bases: B, rows: rep, area: homeArea, name: top(nameCount), areaCodes: areaCodes,
      basis: useSingle ? 'single' : 'dedup', accountRead: accountRead, areaStats: areaStats, dropped: dropLabels(row), columns: keptLabels(row, col) };
  }
  function keptLabels(row, col) {
    var out = [];
    Object.keys(col).forEach(function (k) { if (k !== 'addr' && k !== 'acc' && col[k] >= 0) out.push(str(row[col[k]])); });
    return out;
  }

  /* ----------------------------------------------- per merchant name (cn) */

  function parseCn(c, ctx) {
    var g = c.g, h = c.h, H = heads(g.rows[h]), row = g.rows[h], rep = newRowReport();
    var col = {
      cn: H.indexOf('commonname'), edc: idx(H, ['jumlah_edc', 'jml_edc']), dba: idx(H, ['merchantdbaname', 'merchant_dba_name']),
      code: idx(H, ['cd_cbg_perform', 'kode_cabang']), bname: idx(H, ['cbg_perform', 'nama_cabang']), area: idx(H, ['area_perform', 'nama_area']),
      lob: idx(H, ['lob', 'grouping_lob']), buc: idx(H, ['buc', 'buc_merchant']), open: idx(H, ['open_date']), prod: idx(H, ['code_product']),
      mom: H.indexOf('mom'), mtd: H.indexOf('mtd'), fMom: idx(H, ['flag_mom']), fMtd: idx(H, ['flag_mtd']), fEdc: idx(H, ['flag_ada_edc'])
    };
    var dc = dateCols(g, h, null), D = {}, dates = dc.map(function (x) { D[x.d] = x.c; return x.d; }), B = basesOf(dates);
    var test = homeTest(ctx.opts), out = [], sums = [], areaCount = {}, nameCount = {};
    for (var i = h + 1; i < g.rows.length; i++) {
      var r = g.rows[i] || [];
      if (!r.some(function (v) { return v != null && v !== ''; })) continue;
      var cn = text(r[col.cn]);
      if (!cn && !codeOf(r[col.code])) continue;                         // totals and notes under the table
      rep.read++;
      var who = test(r[col.code], r[col.bname]);
      if (who === 'other') { rep.otherBranch++; continue; }
      if (who === 'none') { rep.noBranch++; continue; }
      rep.kept++;
      if (who === 'name') rep.keptByName++;
      var a = text(r[col.area]); if (a) areaCount[a] = (areaCount[a] || 0) + 1;
      var bn = text(r[col.bname]); if (bn) nameCount[bn] = (nameCount[bn] || 0) + 1;
      var bal = {};
      dates.forEach(function (d) { var v = numOf(r[D[d]]); bal[d] = isNum(v) ? v : 0; });
      var pos = B.pos ? bal[B.pos] : null, edc = intOf(r[col.edc]) || 0;
      var fe = col.fEdc >= 0 ? yesNo(r[col.fEdc]) : null, product = productOf(r[col.prod]), lob = text(r[col.lob]), key = cnKey(cn);
      var band = B.pos ? bandOf(pos, product ? true : (pos ? true : false)) : null;
      var mom = band && B.mom ? trendOf(pos, bal[B.mom]) : null, mtd = band && B.mtd ? trendOf(pos, bal[B.mtd]) : null;
      if (band && !mom && col.mom >= 0 && isNum(numOf(r[col.mom]))) mom = trendOf(numOf(r[col.mom]), 0);
      if (band && !mtd && col.mtd >= 0 && isNum(numOf(r[col.mtd]))) mtd = trendOf(numOf(r[col.mtd]), 0);
      out.push({
        key: key, cn: cn, dba: text(r[col.dba]) || cn, lob: lob, buc: text(r[col.buc]), edc: edc, product: product, openYm: ymOf(r[col.open]),
        bal: { band: band, trendMom: mom, trendMtd: mtd, flagEdc: fe != null ? fe : edc > 0 },
        src: { file: ctx.file || null, sheet: ctx.sheet || null, row: g.nos[i] || null }
      });
      sums.push(bal);
    }
    var top = function (o) { return Object.keys(o).sort(function (x, y) { return o[y] - o[x]; })[0] || null; };
    return { rows: out, sums: sums, dates: dates, bases: B, report: rep, area: top(areaCount), name: top(nameCount),
      dropped: dropLabels(row), columns: keptLabels(row, col) };
  }
  function cnRecord(x) {
    return {
      id: 'F' + hex8('c:' + x.key), level: 'cn', mid: null, cn: x.cn, dba: x.dba, lob: x.lob, cat: categoryOf(x.lob), buc: x.buc, edc: x.edc,
      tierSv: null, tierFreq: null, holder: null, product: x.product, qrisMdr: null, installment: null, kawasan: null, kota: null, prov: null,
      kecId: null, kelId: null, openYm: x.openYm, bal: clone(x.bal), cnBal: null, sharedAccount: false, multiBranch: false, src: clone(x.src)
    };
  }

  /* ------------------------------------------------------ peers: All Cab */

  function blocksOf(groupRow, subRow) {
    var starts = [];
    (groupRow || []).forEach(function (v, c) {
      var s = fold(v);
      if (/casa|total funding/.test(s)) starts.push({ c: c, key: 'casa' });
      else if (/tabungan/.test(s)) starts.push({ c: c, key: 'tabungan' });
      else if (/giro/.test(s)) starts.push({ c: c, key: 'giro' });
    });
    var S = heads(subRow), out = {};
    starts.forEach(function (b, k) {
      var end = k + 1 < starts.length ? starts[k + 1].c - 1 : Math.max(S.length, (subRow || []).length) - 1;
      var o = { mid: -1, dates: {}, ytd: -1, mom: -1, mtd: -1, mtdPct: -1, dtd: -1, dtdPct: -1, target: -1, ach: -1, achPct: -1, targetLabel: null };
      var last = null;
      for (var c = b.c; c <= end; c++) {
        var d = dateOf((subRow || [])[c]), k2 = S[c];
        if (d) { if (!has(o.dates, d)) o.dates[d] = c; last = 'date'; continue; }
        if (k2 === 'jml_mid') o.mid = c;
        else if (k2 === 'ytd') o.ytd = c;
        else if (k2 === 'mom') o.mom = c;
        else if (k2 === 'mtd') o.mtd = c;
        else if (k2 === 'pct_mtd') o.mtdPct = c;
        else if (k2 === 'dtd') o.dtd = c;
        else if (/^target/.test(k2)) { o.target = c; o.targetLabel = str(subRow[c]); }
        else if (k2 === 'ach') o.ach = c;
        else if (k2 === 'pct') { if (last === 'dtd') o.dtdPct = c; else if (last === 'ach') o.achPct = c; }
        if (k2) last = k2;
      }
      out[b.key] = o;
    });
    return out;
  }
  function blockValues(r, o) {
    var bal = {};
    Object.keys(o.dates).forEach(function (d) { var v = numOf(r[o.dates[d]]); if (isNum(v)) bal[d] = v; });
    var get = function (c) { var v = c >= 0 ? numOf(r[c]) : null; return isNum(v) ? v : null; };
    var out = { mid: get(o.mid), bal: bal, ytd: get(o.ytd), mom: get(o.mom), mtd: get(o.mtd), mtdPct: get(o.mtdPct), dtd: get(o.dtd), dtdPct: get(o.dtdPct) };
    if (o.target >= 0) { out.target = get(o.target); out.targetLabel = o.targetLabel; out.ach = get(o.ach); out.achPct = get(o.achPct); }
    return out;
  }
  /** Competition ranking, 1 = highest: [values] → rank of index k ("1, 2, 2, 4"); null when the value is missing. */
  function rankOf(values, k) {
    var v = values[k];
    if (!isNum(v)) return null;
    var better = 0;
    values.forEach(function (x) { if (isNum(x) && x > v) better++; });
    return better + 1;
  }
  function isAreaLabel(v) { return typeof v === 'string' && /^\s*area\b/i.test(v) && !/^\s*area\s*$/i.test(v); }
  function parseAllCab(c, ctx, areaHint) {
    var g = c.g, h = c.h, H = heads(g.rows[h]), codeCol = H.indexOf('kocab'), kcCol = H.indexOf('kc'), nameCol = idx(H, ['nama_cabang', 'cabang']);
    var blocks = blocksOf(g.rows[h], g.rows[h + 1]), list = [], area = null, areas = 0;
    for (var i = h + 2; i < g.rows.length; i++) {
      var r = g.rows[i] || [], code = codeOf(r[codeCol]);
      if (code) { list.push({ code: code, area: area, r: r, i: i }); continue; }
      var lab = null;
      for (var k = 0; k < Math.min(4, r.length); k++) if (isAreaLabel(r[k])) { lab = text(r[k]); break; }
      if (lab) { area = { name: lab, r: r, i: i }; areas++; }
    }
    var home = null;
    list.forEach(function (x) { if (x.code === ctx.home) home = x; });
    if (!home) return { found: false, branches: list.length };
    var scope = 'area', peers;
    if (home.area) peers = list.filter(function (x) { return x.area === home.area; });
    else if (areaHint && areaHint.codes) { scope = 'area-detail'; peers = list.filter(function (x) { return areaHint.codes[x.code]; }); }
    else { scope = 'file'; peers = list; }
    var ix = peers.indexOf(home);
    var val = function (x, key, f) { return blocks[key] ? f(blockValues(x.r, blocks[key])) : null; };
    var posOf = function (v) { var ds = Object.keys(v.bal).sort(); return ds.length ? v.bal[ds[ds.length - 1]] : null; };
    var rank = {
      casa: { rank: rankOf(peers.map(function (x) { return val(x, 'casa', posOf); }), ix) },
      mom: { rank: rankOf(peers.map(function (x) { return val(x, 'casa', function (v) { return v.mom; }); }), ix) },
      mid: { rank: rankOf(peers.map(function (x) { return val(x, 'casa', function (v) { return v.mid; }); }), ix) }
    };
    ['casa', 'mom', 'mid'].forEach(function (k) { rank[k].of = peers.length; });
    var homeVals = {};
    Object.keys(blocks).forEach(function (k) { homeVals[k] = blockValues(home.r, blocks[k]); });
    var areaVals = null;
    if (home.area) { areaVals = { name: home.area.name }; Object.keys(blocks).forEach(function (k) { areaVals[k] = blockValues(home.area.r, blocks[k]); }); }
    return {
      found: true, scope: scope, of: peers.length, areasInFile: areas, branchesInFile: list.length,
      home: { code: home.code, name: nameCol >= 0 ? text(home.r[nameCol]) : null, kelas: kcCol >= 0 ? text(home.r[kcCol]) : null,
        tabungan: homeVals.tabungan || null, giro: homeVals.giro || null, casa: homeVals.casa || null },
      area: areaVals, rank: rank, row: g.nos[home.i] || null,
      codes: peers.map(function (x) { return x.code; })                     // dropped before the model is returned
    };
  }

  /* -------------------------------------------------- peers: Summary Area */

  function parseSummary(sheet, cls, areaName) {
    var g = cls.g, out = { found: false, rank: null };
    if (!areaName) return out;
    for (var i = 0; i < g.rows.length; i++) {
      var r = g.rows[i] || [], H = heads(r);
      if (H.indexOf('area') < 0 || !r.some(function (v) { return /casa/i.test(str(v)); })) continue;
      var b = blocksOf(r, g.rows[i + 1]).casa;
      if (!b) continue;
      var rows = [];
      for (var j = i + 2; j < g.rows.length; j++) {
        var rr = g.rows[j] || [], lab = null;
        for (var k = 0; k < Math.min(4, rr.length); k++) if (isAreaLabel(rr[k])) { lab = text(rr[k]); break; }
        if (!lab) break;
        rows.push({ lab: lab, r: rr });
      }
      var ix = -1;
      rows.forEach(function (x, k) { if (ix < 0 && sameArea(x.lab, areaName)) ix = k; });
      if (ix < 0) continue;
      var v = blockValues(rows[ix].r, b), ds = Object.keys(v.bal).sort();
      var levels = rows.map(function (x) { var w = blockValues(x.r, b), d = Object.keys(w.bal).sort(); return d.length ? w.bal[d[d.length - 1]] : null; });
      out = { found: true, casa: v, rank: { casa: { rank: rankOf(levels, ix), of: rows.length } }, posDate: ds[ds.length - 1] || null };
      break;
    }
    return out;
  }

  /* -------------------------------------------------------- aggregates */

  /* A group: counts, and per date the sum and who holds money in it (merchant keys, accounts). A row's
     contribution is its share of the branch total (the "Single" column, or the first MID of an account), so each
     row with money is one account. */
  function emptyGroup() { return { mids: 0, merchants: 0, edc: 0, _cn: {}, _bal: {}, _who: {} }; }
  function addTo(gp, rec, sum) {
    gp.mids++;
    gp.edc += rec.edc || 0;
    var k = cnKey(rec.cn) || rec.id;
    if (!gp._cn[k]) { gp._cn[k] = 1; gp.merchants++; }
    Object.keys(sum || {}).forEach(function (d) {
      var v = isNum(sum[d]) ? sum[d] : 0;
      gp._bal[d] = (gp._bal[d] || 0) + v;
      if (!v) return;
      var w = gp._who[d] = gp._who[d] || { cn: {}, merchants: 0, accounts: 0 };
      w.accounts++;
      if (!w.cn[k]) { w.cn[k] = 1; w.merchants++; }
    });
  }
  /** Groups whose sum at every date is either 0 or the money of at least MIN_GROUP merchants and accounts. */
  function safeSum(list, dates) {
    return dates.every(function (d) {
      var cn = {}, merchants = 0, accounts = 0;
      list.forEach(function (gp) {
        var w = gp._who[d];
        if (!w) return;
        accounts += w.accounts;
        Object.keys(w.cn).forEach(function (k) { if (!cn[k]) { cn[k] = 1; merchants++; } });
      });
      return !accounts || (merchants >= MIN_GROUP && accounts >= MIN_GROUP);
    });
  }
  /**
   * Which groups of one split may show exact sums ({key: true|false}). Each shown group must pass safeSum, and so
   * must the hidden rest taken together (the hidden groups plus `extra`, rows outside every group), because the
   * total minus the shown groups gives the rest's sum. Otherwise the smallest shown group is hidden too, until
   * the rest passes or nothing is shown.
   */
  function shownGroups(groups, extra, dates) {
    var keys = Object.keys(groups), show = {}, last = dates.slice().sort().pop();
    keys.forEach(function (k) { show[k] = safeSum([groups[k]], dates); });
    var size = function (k) { var w = groups[k]._who[last]; return w ? w.merchants * 1e6 + w.accounts : 0; };
    for (;;) {
      var rest = keys.filter(function (k) { return !show[k]; }).map(function (k) { return groups[k]; }).concat(extra || []);
      if (safeSum(rest, dates)) return show;
      var open = keys.filter(function (k) { return show[k]; });
      if (!open.length) return show;
      open.sort(function (a, b) { return size(a) - size(b) || (a < b ? -1 : 1); });
      show[open[0]] = false;
    }
  }
  function closeGroup(gp, B, shown) {
    var o = { mids: gp.mids, merchants: gp.merchants, edc: gp.edc };
    if (!shown) { o.suppressed = true; o.bal = null; return o; }
    o.bal = gp._bal;
    var f = figures(gp._bal, B);
    Object.keys(f).forEach(function (k) { o[k] = f[k]; });
    return o;
  }
  function countBy(list, f) {
    var o = {};
    list.forEach(function (x) { var k = f(x); k = k == null ? '?' : k; o[k] = (o[k] || 0) + 1; });
    return o;
  }
  /** A LOB or kecamatan group: counts, bands and directions only (doc §7). */
  function countGroup(list) {
    var cn = {}, merchants = 0, edc = 0;
    list.forEach(function (m) { var k = cnKey(m.cn) || m.id; if (!cn[k]) { cn[k] = 1; merchants++; } edc += m.edc || 0; });
    return { mids: list.length, merchants: merchants, edc: edc, byBand: countBy(list, function (m) { return m.bal && m.bal.band; }),
      trend: { mom: countBy(list, function (m) { return m.bal && m.bal.trendMom; }), mtd: countBy(list, function (m) { return m.bal && m.bal.trendMtd; }) } };
  }
  function aggregate(merchants, sums, dates, B, basis) {
    var total = emptyGroup(), prod = {}, noProd = emptyGroup(), lob = {}, kec = {}, idle = emptyGroup(), withAcc = 0;
    merchants.forEach(function (m, k) {
      var s = sums[k];
      addTo(total, m, s);
      if (m.product) { withAcc++; addTo(prod[m.product] = prod[m.product] || emptyGroup(), m, s); } else addTo(noProd, m, s);
      (lob[m.lob || '?'] = lob[m.lob || '?'] || []).push(m);
      (kec[m.kecId || '?'] = kec[m.kecId || '?'] || []).push(m);
      if (m.tierFreq === 'nihil') addTo(idle, m, null);
    });
    var t = closeGroup(total, B, true);
    t.midsWithAccount = withAcc;
    var byLob = {}, byKec = {}, byProduct = {}, show = shownGroups(prod, [noProd], dates);
    Object.keys(lob).forEach(function (k) { byLob[k] = countGroup(lob[k]); byLob[k].cat = categoryOf(k === '?' ? '' : k); });
    Object.keys(kec).forEach(function (k) { byKec[k] = countGroup(kec[k]); });
    Object.keys(prod).forEach(function (k) { byProduct[k] = closeGroup(prod[k], B, show[k]); });   // the report's own branch split (All Cab)
    return {
      basis: basis, unit: merchants.length && merchants[0].level === 'cn' ? 'commonname' : 'mid', asOf: B.pos || null,
      dates: dates.slice().sort(), bases: { dtd: B.dtd, mom: B.mom, mtd: B.mtd, ytd: B.ytd }, minGroup: MIN_GROUP,
      total: t, byProduct: byProduct, idle: { mids: idle.mids, merchants: idle.merchants, edc: idle.edc }, cnOnly: 0,
      byLob: byLob, byKec: byKec,
      byTier: { sv: countBy(merchants, function (m) { return m.tierSv; }), freq: countBy(merchants, function (m) { return m.tierFreq; }) },
      byBand: countBy(merchants, function (m) { return m.bal && m.bal.band; }),
      byHolder: countBy(merchants, function (m) { return m.holder; }),
      byCat: countBy(merchants, function (m) { return m.cat; }),
      trend: { mom: countBy(merchants, function (m) { return m.bal && m.bal.trendMom; }), mtd: countBy(merchants, function (m) { return m.bal && m.bal.trendMtd; }) },
      flagEdc: countBy(merchants, function (m) { return m.bal ? (m.bal.flagEdc ? 'ada' : 'tidak') : null; })
    };
  }

  /* ------------------------------------------------------------- parse */

  function fmtInt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function byFile(sheets) {
    var order = [], by = {};
    sheets.forEach(function (s) { var f = str(s.file) || '(file)'; if (!by[f]) { by[f] = []; order.push(f); } by[f].push(s); });
    return order.map(function (f) { return { file: f === '(file)' ? null : f, sheets: by[f] }; });
  }
  function emptyModel(opts, layout) {
    return {
      ok: false, kind: 'funding', version: VERSION, layout: layout || null, asOf: null,
      home: { code: str(opts && opts.home) || HOME, name: null, area: null }, merchants: [], aggregates: null, peers: null,
      report: { layout: layout || null, files: [], rows: newRowReport(), droppedColumns: [], keptColumns: [], transientColumns: [],
        sheets: { used: [], ignored: [] }, area: null, asOfTitle: null, asOfColumns: null, warnings: [], checks: [] }
    };
  }
  /* Notes checksFor() writes itself; the other notes are parse-time warnings (report.warnings). */
  var BUILT = { NOT_FUNDING: 1, HOME_ROWS: 1, HOME_MISSING: 1, BY_NAME: 1, OTHER_ROWS: 1, DROPPED: 1, ADDRESS: 1, BANDS: 1, SPLIT_HIDDEN: 1, CN_BASIS: 1, RANK_ONLY: 1 };
  /** Every list and object a report must have (a model restored from older or partial records may lack some). */
  function normReport(rep) {
    rep = rep && typeof rep === 'object' && !Array.isArray(rep) ? rep : {};
    ['files', 'droppedColumns', 'keptColumns', 'transientColumns', 'checks'].forEach(function (k) { if (!Array.isArray(rep[k])) rep[k] = []; });
    if (!Array.isArray(rep.warnings)) rep.warnings = rep.checks.filter(function (c) { return c && !BUILT[c.code]; });
    if (!rep.sheets || typeof rep.sheets !== 'object') rep.sheets = { used: [], ignored: [] };
    if (!Array.isArray(rep.sheets.used)) rep.sheets.used = [];
    if (!Array.isArray(rep.sheets.ignored)) rep.sheets.ignored = [];
    if (!rep.rows || typeof rep.rows !== 'object') rep.rows = newRowReport();
    if (!has(rep, 'layout')) rep.layout = null;
    return rep;
  }
  function branchLabel(code) { return !code || code === HOME ? 'KCP Jakarta Cilangkap' : 'Cabang ' + code; }
  /** Record ids: a second record with the same id (the same MID or name twice in a file) gets a derived one. */
  function uniqueIds(list) {
    var seen = {};
    list.forEach(function (r) {
      var id = r.id, n = 1;
      while (has(seen, id)) id = 'F' + hex8(r.id + '#' + (++n));
      seen[id] = 1;
      r.id = id;
    });
    return list;
  }
  /* Our own Tabungan / Giro figures (All Cab) show only when the split of our sums shows; our area's figures only
     when the area holds at least MIN_GROUP branches (else the area minus our branch gives one other branch). */
  function guardPeers(p, A) {
    var split = !!A && Object.keys(A.byProduct || {}).every(function (k) { return !A.byProduct[k].suppressed; });
    if (!split) ['tabungan', 'giro'].forEach(function (k) { if (p.home && p.home[k]) p.home[k] = { mid: p.home[k].mid, suppressed: true, bal: null }; });
    if (p.area && !(p.of >= MIN_GROUP)) {
      var t = p.area.casaTarget;
      p.area = { name: p.area.name || null, suppressed: true };
      if (t) p.area.casaTarget = { label: t.label, target: t.target, ach: null, achPct: null };
    }
    return p;
  }
  /* The sheet of each kind: the one with the report's own name, else the longest (the region workbook also has
     filtered copies such as "Commonname drop MtD" and the "50 Top …" lists with the same header). */
  var PREFER = { detail: /^detail mid\b/i, cn: /^commonname$/i, allcab: /^all cab$/i, summary: /^summary area$/i };
  function choose(sheets, cls, kind) {
    var best = -1, score = -1;
    sheets.forEach(function (s, k) {
      var c = cls[k];
      if (!c || c.kind !== kind) return;
      var sc = (PREFER[kind].test(str(s.name)) ? 1e9 : 0) + c.g.rows.length;
      if (sc > score) { score = sc; best = k; }
    });
    return best;
  }
  function sameArea(a, b) {
    var k = function (s) { return words(s).replace(/\b(area|jakarta|jkt|kota|kab)\b/g, ' ').replace(/\s+/g, ' ').trim(); };
    return !!(a && b && k(a) && k(a) === k(b));
  }
  function parseGroup(grp, opts) {
    var sheets = grp.sheets, cls = sheets.map(function (s) { try { return classify(s); } catch (e) { return null; } });
    var layout = groupLayout(cls), m = emptyModel(opts, layout), rep = m.report, home = m.home.code;
    rep.files.push({ file: grp.file, layout: layout });
    if (!layout) return m;
    var R = resolver(opts), title = null, used = {};
    sheets.forEach(function (s) { if (!title) title = posisiIn(gridOf(s), 8); });
    var kD = choose(sheets, cls, 'detail'), kC = choose(sheets, cls, 'cn'), kA = choose(sheets, cls, 'allcab'), kS = choose(sheets, cls, 'summary');
    var ctx = function (k) { used[k] = 1; return { opts: opts, resolve: R, file: grp.file, sheet: sheets[k].name }; };
    var detail = kD >= 0 ? parseDetail(cls[kD], ctx(kD)) : null;
    var cnP = kC >= 0 ? parseCn(cls[kC], ctx(kC)) : null;
    var areaHint = detail && detail.area ? { codes: detail.areaCodes } : null;
    var cab = kA >= 0 ? parseAllCab(cls[kA], { home: home }, areaHint) : null;
    if (kA >= 0) used[kA] = 1;
    var areaName = (detail && detail.area) || (cnP && cnP.area) || (cab && cab.area && cab.area.name) || null;
    var sum = kS >= 0 ? parseSummary(sheets[kS], cls[kS], areaName) : null;
    if (sum && sum.found) used[kS] = 1;
    sheets.forEach(function (s, k) { (used[k] ? rep.sheets.used : rep.sheets.ignored).push(s.name); });
    if (detail) {
      m.merchants = detail.merchants;
      rep.rows = detail.rows;
      rep.droppedColumns = detail.dropped.slice();
      rep.keptColumns = detail.columns.slice();
      rep.area = { addresses: detail.areaStats.tried, kecamatan: detail.areaStats.kecamatan, kelurahan: detail.areaStats.kelurahan, via: detail.areaStats.via, resolver: !!R };
      if (detail.areaStats.tried) rep.transientColumns.push('Alamat');
      if (detail.basis !== 'single' && detail.accountRead) rep.transientColumns.push('norekening');
      rep.asOfColumns = detail.bases.pos;
      m.aggregates = aggregate(detail.merchants, detail.sums, detail.dates, detail.bases, detail.basis === 'single' ? 'mid-single' : 'mid-dedup');
      if (cnP) {
        rep.cnRows = cnP.report;
        /* names the Commonname sheet gives to our branch without a MID row of ours: listed as name-level records
           (as the branch extract would list them); the branch totals stay those of the MID sheet */
        rep.namesOnlyInCnSheet = joinCn(m.merchants, cnP.rows, true);
        m.aggregates.cnOnly = rep.namesOnlyInCnSheet;
        cnP.dropped.forEach(function (x) { if (rep.droppedColumns.indexOf(x) < 0) rep.droppedColumns.push(x); });
      }
    } else if (cnP) {
      m.merchants = cnP.rows.map(cnRecord);
      rep.rows = cnP.report;
      rep.droppedColumns = cnP.dropped.slice();
      rep.keptColumns = cnP.columns.slice();
      rep.asOfColumns = cnP.bases.pos;
      m.aggregates = aggregate(m.merchants, cnP.sums, cnP.dates, cnP.bases, 'commonname');
    }
    m.home.name = (detail && detail.name) || (cnP && cnP.name) || (cab && cab.found && cab.home.name) || null;
    m.home.area = areaName;
    if (cab && cab.found) {
      var p = { source: 'All Cab', scope: cab.scope, of: cab.of, home: cab.home, area: cab.area, rank: cab.rank, areaRank: null };
      if (sum && sum.found) {
        p.area = p.area || { name: areaName };
        p.area.casaTarget = { label: sum.casa.targetLabel || null, target: has(sum.casa, 'target') ? sum.casa.target : null,
          ach: has(sum.casa, 'ach') ? sum.casa.ach : null, achPct: has(sum.casa, 'achPct') ? sum.casa.achPct : null };
        p.areaRank = sum.rank;
      }
      if (detail && detail.area && cab.area && !sameArea(cab.area.name, detail.area)) {
        rep.warnings.push({ level: 'warn', code: 'AREA_MISMATCH', text: 'Area cabang di sheet All Cab berbeda dengan area di sheet rincian.\nPeringkat dihitung dari kelompok area di sheet All Cab.' });
      }
      if (cab.scope === 'file') rep.warnings.push({ level: 'warn', code: 'RANK_SCOPE', text: 'Kelompok area tidak ditemukan.\nPeringkat dihitung terhadap semua cabang di file.' });
      m.peers = guardPeers(p, m.aggregates);
    } else if (cab && !cab.found) {
      rep.warnings.push({ level: 'warn', code: 'HOME_NOT_IN_SUMMARY', text: branchLabel(home) + ' (' + home + ') tidak ada di sheet All Cab.\nPeringkat tidak dapat dihitung.' });
    }
    rep.asOfTitle = title;
    m.asOf = rep.asOfColumns || title || null;
    if (title && rep.asOfColumns && title !== rep.asOfColumns) {
      rep.warnings.push({ level: 'warn', code: 'ASOF_MISMATCH', text: 'Tanggal posisi di judul (' + periodLabel(title) + ') berbeda dengan tanggal kolom saldo (' + periodLabel(rep.asOfColumns) + ').\nTanggal kolom saldo yang dipakai.' });
    }
    uniqueIds(m.merchants);
    m.ok = m.merchants.length > 0 || !!m.peers;
    return m;
  }
  /** Adds the merchant-name figures (cn rows) to MID records with the same name; returns the names left over. */
  function joinCn(merchants, cnRows, addMissing) {
    var by = {}, used = {};
    cnRows.forEach(function (x) { if (x.key && !by[x.key]) by[x.key] = x; });
    merchants.forEach(function (m) {
      var x = by[cnKey(m.cn)];
      if (!x) return;
      used[x.key] = 1;
      m.cnBal = { band: x.bal.band, trendMom: x.bal.trendMom, trendMtd: x.bal.trendMtd, flagEdc: x.bal.flagEdc, edc: x.edc };
      if (!m.lob && x.lob) { m.lob = x.lob; m.cat = categoryOf(x.lob); }
    });
    var rest = cnRows.filter(function (x) { return x.key && !used[x.key]; });
    if (addMissing) rest.forEach(function (x) { merchants.push(cnRecord(x)); });
    return rest.length;
  }
  /** The import notes, built fresh each time from the model and the parse-time warnings (never added twice). */
  function checksFor(m) {
    var rep = normReport(m.report), out = [], rows = rep.rows;
    if (!m.layout) { out.push({ level: 'warn', code: 'NOT_FUNDING', text: 'File ini tidak terbaca sebagai laporan funding merchant.' }); return out; }
    var A = m.aggregates, byMid = A && A.unit === 'mid', home = m.home && m.home.code;
    if (m.merchants.length && A) {
      out.push({ level: 'ok', code: 'HOME_ROWS', text: 'Posisi ' + (m.asOf ? periodLabel(m.asOf) : '–') + ': ' +
        (byMid ? fmtInt(A.total.mids) + ' MID dari ' + fmtInt(A.total.merchants) + ' merchant' : fmtInt(A.total.merchants) + ' merchant') + ' ' + branchLabel(home) + '.' });
    } else {
      out.push({ level: 'warn', code: 'HOME_MISSING', text: branchLabel(home) + ' (' + home + ') tidak ada di rincian file ini.' });
    }
    if (rows.keptByName) out.push({ level: 'info', code: 'BY_NAME', text: fmtInt(rows.keptByName) + ' baris tanpa kode cabang dikenali dari nama cabang.' });
    if (rows.otherBranch || rows.noBranch) out.push({ level: 'info', code: 'OTHER_ROWS', text: fmtInt(rows.otherBranch + rows.noBranch) + ' baris milik cabang lain atau tanpa cabang tidak disimpan.' });
    if (rep.droppedColumns.length) out.push({ level: 'info', code: 'DROPPED', text: 'Kolom data pribadi yang dihapus, tidak pernah disimpan: ' + rep.droppedColumns.join(', ') + '.' });
    if (rep.transientColumns.indexOf('Alamat') >= 0) out.push({ level: 'info', code: 'ADDRESS', text: 'Alamat hanya dibaca untuk mencari kecamatan dan kelurahan, lalu tidak disimpan.' });
    var P = (A && A.byProduct) || {}, hidden = Object.keys(P).some(function (k) { return P[k] && P[k].suppressed; });
    out.push({ level: 'info', code: 'BANDS', text: 'Saldo per merchant disimpan sebagai rentang saja.\n' +
      (hidden || !Object.keys(P).length ? 'Angka pasti hanya untuk total cabang.' : 'Angka pasti hanya untuk total cabang serta Tabungan dan Giro cabang.') +
      '\nPer LOB dan per kecamatan hanya jumlah merchant dan rentang saldonya.' });
    if (hidden) out.push({ level: 'info', code: 'SPLIT_HIDDEN', text: 'Pembagian Tabungan dan Giro tidak ditampilkan.\nSalah satunya berisi saldo kurang dari ' + MIN_GROUP + ' merchant atau rekening, sehingga saldo satu merchant bisa terbaca.' });
    if (A && A.basis === 'commonname') {
      out.push({ level: 'info', code: 'CN_BASIS', text: 'Total dari file ini adalah jumlah saldo per nama merchant.\nSatu nama merchant bisa mencakup MID di cabang lain, sehingga total ini bisa berbeda dengan total CASA cabang di laporan region.' });
    }
    if (m.peers && m.peers.rank) out.push({ level: 'info', code: 'RANK_ONLY', text: 'Cabang lain hanya dipakai untuk peringkat. Nama dan angkanya tidak disimpan.' });
    return out.concat(rep.warnings);
  }
  /**
   * parse(sheets, opts) → model. sheets: Sheet[] from MCD.importer.read() of one or two files (the region workbook
   * and / or the branch extract); opts {home, homeName, file, resolve:{resolveKecamatan, resolveKelurahan,
   * geocodeLocal} | false}.
   */
  function parse(sheets, opts) {
    opts = opts || {};
    var list = (sheets || []).filter(Boolean);
    if (opts.file) list = list.map(function (s) { return s.file ? s : Object.assign({}, s, { file: opts.file }); });
    var models = byFile(list).map(function (g) { return parseGroup(g, opts); }).filter(function (x) { return x.layout; });
    var m;
    if (!models.length) m = emptyModel(opts, null);
    else {
      var region = models.filter(function (x) { return x.layout === 'funding-region'; })[0] || null;
      var branch = models.filter(function (x) { return x.layout === 'funding-branch'; })[0] || null;
      m = region && branch ? join(region, branch) : (region || branch);
    }
    m.report.checks = checksFor(m);
    return m;
  }
  function join(region, branch) {
    var m = region, rep = m.report = normReport(m.report), brep = branch.report = normReport(branch.report);
    m.merchants = m.merchants || [];
    var cnRows = (branch.merchants || []).map(function (b) { return { key: cnKey(b.cn), cn: b.cn, dba: b.dba, lob: b.lob, buc: b.buc, edc: b.edc, product: b.product, openYm: b.openYm, bal: b.bal, src: b.src }; });
    var anyCn = m.merchants.some(function (x) { return x.cnBal; });
    var added = 0;
    if (!anyCn) added = joinCn(m.merchants, cnRows, true);
    else {
      var known = {};
      m.merchants.forEach(function (x) { known[cnKey(x.cn)] = 1; });
      cnRows.forEach(function (x) { if (x.key && !known[x.key]) { m.merchants.push(cnRecord(x)); added++; } });
    }
    uniqueIds(m.merchants);
    m.layout = rep.layout = 'both';
    if (m.aggregates) m.aggregates.cnOnly = (m.aggregates.cnOnly || 0) + added;
    rep.files = rep.files.concat(brep.files);
    rep.branchRows = brep.rows;
    rep.namesOnlyInBranchFile = added;
    brep.droppedColumns.forEach(function (x) { if (rep.droppedColumns.indexOf(x) < 0) rep.droppedColumns.push(x); });
    rep.sheets.used = rep.sheets.used.concat(brep.sheets.used);
    rep.sheets.ignored = rep.sheets.ignored.concat(brep.sheets.ignored);
    var seen = {};
    rep.warnings.forEach(function (w) { seen[w.code + '|' + w.text] = 1; });
    brep.warnings.forEach(function (w) { if (!seen[w.code + '|' + w.text]) { seen[w.code + '|' + w.text] = 1; rep.warnings.push(w); } });
    if (branch.asOf && m.asOf && branch.asOf !== m.asOf) {
      rep.warnings.push({ level: 'warn', code: 'ASOF_FILES', text: 'Kedua file berbeda tanggal posisi (' + periodLabel(m.asOf) + ' dan ' + periodLabel(branch.asOf) + ').\nTotal cabang memakai laporan region.' });
    }
    m.ok = true;
    return m;
  }
  /**
   * merge(a, b): a region model and a branch model (either order, fresh from parse() or restored by fromRecords())
   * → one model joined by merchant name, the same as parse() of both files in one call.
   */
  function merge(a, b) {
    if (!a || !b) return a || b || null;
    var A = clone(a), B = clone(b);
    if (B.layout === 'funding-region' && A.layout !== 'funding-region') { var t = A; A = B; B = t; }
    if (A.layout !== 'funding-region' || B.layout !== 'funding-branch') return A;
    var m = join(A, B);
    m.report.checks = checksFor(m);
    return m;
  }

  /* -------------------------------------------------------------- match */

  var NAME_STOP = { toko: 1, tk: 1, warung: 1, wr: 1, rm: 1, rumah: 1, makan: 1, kedai: 1, cv: 1, pt: 1, ud: 1, tbk: 1, dan: 1, the: 1, store: 1, shop: 1, mart: 1, cabang: 1 };
  /* words of 3+ letters and every number ("TOKO CONTOH 01" ≠ "TOKO CONTOH 07"), without the generic shop words */
  function nameTokens(s) { return words(s).split(' ').filter(function (t) { return (t.length >= 3 || /^\d+$/.test(t)) && !NAME_STOP[t]; }); }
  /** Fallback name score (Dice on words) when MCD.lvm.similarity is not loaded. */
  function simpleSimilarity(a, b) {
    var x = nameTokens(a), y = nameTokens(b);
    if (!x.length || !y.length) return words(a) && words(a) === words(b) ? 1 : 0;
    var used = {}, shared = 0;
    x.forEach(function (t) { for (var j = 0; j < y.length; j++) if (!used[j] && y[j] === t) { used[j] = 1; shared++; return; } });
    return Math.round(2 * shared / (x.length + y.length) * 1000) / 1000;
  }
  /**
   * buildLookups({edc, lvm, poi}) → lookups for match(). Each list holds plain objects:
   *   edc: MCD.lvm.edc.merchants(rows) items {id, mid, name, kecamatanId, kelurahanId}
   *   lvm: LVM store records {id, mid, storeId, name, kecamatanId, kelurahanId}
   *   poi: public listings {ref | id | index, name, kecId | kecamatanId, kelId | kelurahanId}
   */
  function buildLookups(src, opts) {
    src = src || {};
    var byMid = { edc: {}, lvm: {} }, byKec = {};
    function add(kind, x) {
      if (!x) return;
      var ref = has(x, 'ref') ? x.ref : (has(x, 'id') ? x.id : x.index);
      var mid = idOf(x.mid);
      if (mid && byMid[kind] && !has(byMid[kind], mid)) byMid[kind][mid] = ref;
      var kec = x.kecId || x.kecamatanId, name = x.name;
      if (!kec || !name) return;
      var k = byKec[kec] = byKec[kec] || { all: [], tok: {} };
      var c = { kind: kind, ref: ref, name: name, kelId: x.kelId || x.kelurahanId || null, mid: mid || null };
      k.all.push(c);
      nameTokens(name).forEach(function (t) { (k.tok[t] = k.tok[t] || []).push(c); });
    }
    (src.edc || []).forEach(function (x) { add('edc', x); });
    (src.lvm || []).forEach(function (x) { add('lvm', x); });
    (src.poi || []).forEach(function (x) { add('poi', x); });
    return {
      edcByMid: function (mid) { return has(byMid.edc, mid) ? byMid.edc[mid] : null; },
      lvmByMid: function (mid) { return has(byMid.lvm, mid) ? byMid.lvm[mid] : null; },
      candidates: function (kecId, rec) {
        var k = byKec[kecId];
        if (!k) return [];
        var seen = [], out = [];
        nameTokens((rec.cn || '') + ' ' + (rec.dba || '')).forEach(function (t) {
          (k.tok[t] || []).forEach(function (c) { if (seen.indexOf(c) < 0) { seen.push(c); out.push(c); } });
        });
        return out;
      }
    };
  }
  /**
   * match(modelOrMerchants, lookups, opts?) → {byId:{<id>:{edc?, lvm?, poi?}}, edc:{ref:[id]}, lvm:{…}, poi:{…}, counts}
   * lookups: {edcByMid(mid), lvmByMid(mid), candidates(kecId, merchant) → [{kind, ref, name, kelId, mid?}], similarity(a, b)}
   * (all optional). MID first (EDC, then LVM stores); then names within the merchant's kecamatan: the best name
   * per kind must reach opts.accept (0.85) and beat the runner-up by opts.margin (0.05); same kelurahan +0.03.
   * A candidate that carries a different MID than the merchant is never taken by name (another terminal).
   */
  function match(model, look, opts) {
    var list = Array.isArray(model) ? model : ((model && model.merchants) || []);
    look = look || {};
    opts = opts || {};
    var L = M() && M().lvm;
    var sim = typeof look.similarity === 'function' ? look.similarity : (L && typeof L.similarity === 'function' ? L.similarity : simpleSimilarity);
    var accept = isNum(opts.accept) ? opts.accept : 0.85, margin = isNum(opts.margin) ? opts.margin : 0.05;
    var out = { byId: {}, edc: {}, lvm: {}, poi: {}, counts: { edc: 0, lvm: 0, poi: 0, any: 0, none: 0, total: list.length, byMid: 0, byName: 0 } };
    function put(rec, kind, hit) {
      out.byId[rec.id] = out.byId[rec.id] || {};
      out.byId[rec.id][kind] = hit;
      (out[kind][hit.ref] = out[kind][hit.ref] || []).push(rec.id);
      out.counts[kind]++;
      if (hit.via === 'mid') out.counts.byMid++; else out.counts.byName++;
    }
    list.forEach(function (rec) {
      if (!rec) return;
      if (rec.mid && typeof look.edcByMid === 'function') { var e = look.edcByMid(rec.mid); if (e != null) put(rec, 'edc', { ref: e, via: 'mid', score: 1 }); }
      if (rec.mid && typeof look.lvmByMid === 'function') { var l = look.lvmByMid(rec.mid); if (l != null) put(rec, 'lvm', { ref: l, via: 'mid', score: 1 }); }
      if (rec.kecId && typeof look.candidates === 'function') {
        var cands = look.candidates(rec.kecId, rec) || [], best = {};
        cands.forEach(function (c) {
          if (!c || !c.name) return;
          if (c.mid && rec.mid && String(c.mid) !== String(rec.mid)) return;   // another terminal: never the same MID record
          var s = Math.max(rec.dba ? sim(rec.dba, c.name) : 0, rec.cn ? sim(rec.cn, c.name) : 0);
          if (rec.kelId && c.kelId && c.kelId === rec.kelId) s += 0.03;
          var b = best[c.kind] = best[c.kind] || { top: null, s1: -1, s2: -1 };
          if (s > b.s1) { b.s2 = b.s1; b.s1 = s; b.top = c; } else if (s > b.s2) b.s2 = s;
        });
        Object.keys(best).forEach(function (kind) {
          var b = best[kind];
          if (out.byId[rec.id] && out.byId[rec.id][kind]) return;
          if (b.top && b.s1 >= accept && b.s1 - Math.max(0, b.s2) >= margin) put(rec, kind, { ref: b.top.ref, via: 'name', score: Math.round(Math.min(1, b.s1) * 1000) / 1000 });
        });
      }
      if (out.byId[rec.id]) out.counts.any++; else out.counts.none++;
    });
    return out;
  }

  /* ------------------------------------------------------ records / vault */

  var KEEP = ['id', 'level', 'mid', 'cn', 'dba', 'lob', 'cat', 'buc', 'edc', 'tierSv', 'tierFreq', 'holder', 'product', 'qrisMdr', 'installment',
    'kawasan', 'kota', 'prov', 'kecId', 'kelId', 'openYm', 'bal', 'cnBal', 'sharedAccount', 'multiBranch', 'src'];
  function pick(m) { var o = {}; KEEP.forEach(function (k) { o[k] = has(m, k) ? strip(m[k]) : null; }); return o; }
  /* The meta record's known keys, at each level. fromRecords() keeps only these and drops every forbidden key at
     any depth, so a tampered or older saved record cannot bring back a CIF, an address or a group sum. */
  var META = {
    home: ['code', 'name', 'area'],
    aggregates: ['basis', 'unit', 'asOf', 'dates', 'bases', 'minGroup', 'total', 'byProduct', 'idle', 'cnOnly', 'byLob', 'byKec', 'byTier',
      'byBand', 'byHolder', 'byCat', 'trend', 'flagEdc'],
    group: ['mids', 'merchants', 'edc', 'cat', 'byBand', 'trend'],
    peers: ['source', 'scope', 'of', 'home', 'area', 'rank', 'areaRank'],
    report: ['layout', 'files', 'rows', 'cnRows', 'branchRows', 'droppedColumns', 'keptColumns', 'transientColumns', 'sheets', 'area', 'asOfTitle',
      'asOfColumns', 'warnings', 'checks', 'namesOnlyInCnSheet', 'namesOnlyInBranchFile']
  };
  /** A copy without forbidden keys, at any depth. */
  function strip(v) {
    if (v == null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(strip);
    var o = {};
    Object.keys(v).forEach(function (k) { if (!FORBIDDEN_KEY.test(k)) o[k] = strip(v[k]); });
    return o;
  }
  /** The keys of o that are in `keys` (in o's own order), copied without forbidden keys; null when o is not an object. */
  function only(o, keys) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    var out = {};
    Object.keys(o).forEach(function (k) { if (keys.indexOf(k) >= 0) out[k] = strip(o[k]); });
    return out;
  }
  function metaAggregates(a) {
    var out = only(a, META.aggregates);
    if (!out) return null;
    ['byLob', 'byKec'].forEach(function (d) {
      if (!out[d] || typeof out[d] !== 'object') return;
      var g = {};
      Object.keys(out[d]).forEach(function (k) { g[k] = only(out[d][k], META.group) || {}; });
      out[d] = g;
    });
    return out;
  }
  /** Model → records: one per merchant (kept fields only) plus one meta record (isMeta) with the branch figures. */
  function toRecords(model) {
    if (!model) return [];
    var out = (model.merchants || []).map(pick);
    out.push({
      id: 'funding-meta', isMeta: true, version: VERSION, kind: 'funding', layout: model.layout || null, asOf: model.asOf || null,
      home: only(model.home, META.home), aggregates: metaAggregates(model.aggregates), peers: only(model.peers, META.peers),
      report: normReport(only(model.report, META.report))
    });
    return out;
  }
  function fromRecords(records) {
    var list = (records || []).filter(function (r) { return r && typeof r === 'object'; }), meta = list.filter(function (r) { return r.isMeta; })[0] || {};
    var merchants = list.filter(function (r) { return !r.isMeta; }).map(pick);
    var peers = only(meta.peers, META.peers);
    return {
      ok: merchants.length > 0 || !!peers, kind: 'funding', version: isNum(meta.version) ? meta.version : VERSION, layout: str(meta.layout) || null,
      asOf: str(meta.asOf) || null, home: only(meta.home, META.home) || { code: HOME, name: null, area: null }, merchants: merchants,
      aggregates: metaAggregates(meta.aggregates), peers: peers, report: normReport(only(meta.report, META.report))
    };
  }
  /** audit(x) → paths of keys that must never be kept (CIF, account, owner name, address, actype, sccode …). */
  function audit(x) {
    var out = [];
    (function walk(v, p) {
      if (v == null || typeof v !== 'object') return;
      if (Array.isArray(v)) { v.forEach(function (e, i) { walk(e, p + '[' + i + ']'); }); return; }
      Object.keys(v).forEach(function (k) { if (FORBIDDEN_KEY.test(k)) out.push(p ? p + '.' + k : k); walk(v[k], p ? p + '.' + k : k); });
    })(x, '');
    return out;
  }

  /* ----------------------------------------------------- workbook reader */

  function apply(model, meta) {
    meta = meta || {};
    var D = M() && M().data;
    if (!D || typeof D.replace !== 'function' || !(D.keyFor && D.keyFor(DATASET))) return false;   // registered by the shell later
    return D.replace(DATASET, toRecords(model), { source: meta.source || 'import', file: meta.file || null,
      sheet: (model.report && model.report.sheets && model.report.sheets.used || []).join(' + ') || null, asOf: model.asOf || null });
  }
  var workbookReader = {
    TYPE: 'funding', HOME: HOME, label: 'Laporan Funding Merchant Mass Retail',
    what: 'File Excel dari region berisi saldo tabungan dan giro merchant EDC per MID, per nama merchant dan per cabang.\nHanya merchant KCP Jakarta Cilangkap yang disimpan.',
    /** detect(sheetNames | sheets) → {ok, use, layout}. Names alone find the region workbook; the one-sheet branch
        extract ("Sheet1") needs its sheets (header labels). */
    detect: function (x) {
      var list = x || [];
      if (list.length && typeof list[0] === 'object') { var l = detect(list); return { ok: !!l, use: list.map(function (s) { return s.name; }), layout: l }; }
      var n = list.map(str);
      var region = n.some(function (s) { return /^detail mid\b/i.test(s); }) || (n.some(function (s) { return /^all cab$/i.test(s); }) && n.some(function (s) { return /^commonname$/i.test(s); }));
      return { ok: region, use: region ? n.filter(function (s) { return /^(detail mid\b|commonname$|all cab$|summary area$)/i.test(s); }) : [], layout: region ? 'funding-region' : null };
    },
    read: function (file) {
      var I = M() && M().importer;
      if (!I || typeof I.read !== 'function') return Promise.reject(new Error('MCD.importer is not loaded'));
      return I.read(file).then(function (sheets) {
        var m = parse(sheets, { file: file && file.name });
        if (!m.layout) {
          var e = new Error('File ini tidak terbaca sebagai laporan funding merchant.\nPakai file “Funding Merchant Mass Retail” dari region atau daftar merchant cabang.');
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
      var p = m && m.peers;
      return { branch: m ? { code: m.home.code, name: m.home.name, rank: p && p.rank && p.rank.casa ? p.rank.casa.rank : null } : null,
        of: p ? p.of : 0, asOf: m ? m.asOf : null, merchants: m ? m.merchants.length : 0 };
    }
  };

  return {
    VERSION: VERSION, HOME: HOME, HOME_NAME: HOME_NAME, DATASET: DATASET, MIN_GROUP: MIN_GROUP,
    BANDS: BANDS, TIERS: TIERS, HOLDERS: HOLDERS, TRENDS: TRENDS, DROP_COLUMNS: DROP_COLUMNS,
    detect: detect, classify: function (s) { var c = classify(s); return c ? { kind: c.kind, headerRow: c.g.nos[c.h] || null } : null; },
    parse: parse, merge: merge, match: match, buildLookups: buildLookups, similarity: simpleSimilarity,
    toRecords: toRecords, fromRecords: fromRecords, audit: audit, apply: apply, workbookReader: workbookReader,
    bandOf: bandOf, trendOf: trendOf, dateOf: dateOf, posisiOf: posisiOf, basesOf: basesOf, periodLabel: periodLabel,
    areaOfAddress: areaOfAddress, categoryOf: categoryOf
  };
});
