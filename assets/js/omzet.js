/* ==========================================================================
 * MCD.omzet: "trafik bisnis" for every UMKM, as a monthly turnover band (perkiraan omzet).
 * Dashboard Akuisisi · Bank Mandiri KCP Jakarta Cilangkap (12903). Pure logic, no DOM, no storage, no network.
 * Method, bands and sources: docs/OMZET_ESTIMATE.md. Figures: data/omzet-benchmarks.js (from docs/research-omzet.json).
 *
 * Per-business tax data is confidential (UU KUP Pasal 34, UU 1/2022 Pasal 103) and is never used. The estimate starts
 * from a published figure for the business type, moves with the three factors of MCD.sme (nilai belanja, keramaian,
 * daya beli area; docs/EDC_SCORE.md §4) and stays inside the range of its sources. A type whose only source is very weak
 * (one shop, a franchise target, a break-even figure) starts from the general UMKM mean and uses its source as a ceiling
 * only. Published regional restaurant tax is context for the kecamatan card and an upper-tail check (taxCheck); it never
 * changes an estimate. The bank's own transaction figures (Livin' Merchant and EDC files, the Funding Merchant report)
 * always win on screen, and are shown as bands only.
 *
 * API (all dependencies optional; create(deps) builds an engine with injected inputs, for tests)
 *   estimate(i) → {i, kind: 'estimate' | 'none', band: 'b1'..'b5' | null, bandIndex, label: '± Rp10–40 jt/bulan',
 *                  low, high (band edges, Rp per month; high null for b5), yearLabel, short, point, sizeClass:
 *                  'mikro' | 'kecil' | 'menengah', sizeLabel, fit: 'lvm' | 'edc', fitText, category, categoryLabel,
 *                  mode: 'jenis' | 'umum' | 'umum-batas', levels, basis: [plain reasons], confidence: 'rendah' | 'sedang',
 *                  sources, note, caption, legal}  · null when i is not a merchant or not a listing
 *   observed(ref) → {kind: 'observed', sources, lines: [plain], recorded: {band, label, note} | null, lvm, edc,
 *                  funding, caption, legal} | null     ref = listing index | 'poi:<i>' | LVM store id | EDC merchant id |
 *                  Funding merchant id | {poi, lvmId, edcId, fundingId}
 *   display(ref) → {kind: 'observed' | 'estimate' | 'none', primary, lines, observed, estimate, showEstimate, caption,
 *                  legal}: observed data always wins over the estimate
 *   kecSummary(kecId) → {kecamatanId, n, estimated, none, counts: {b1..b5}, bands, total, totalLabel, totalYearLabel,
 *                  bySize, observed, tax: {id, area, year, lines} | null, note, caption, legal}
 *   taxCheck(areaId) · categoryOf(i) · bandOf(rpPerMonth) · sizeOf(rpPerYear) · setFunding(model, matchResult)
 *   V8 (docs/V8_SPEC.md §3.4, D49): warm({sliceMs: 40, onProgress(done, total)}) → Promise<{n, ms}> (every listing in idle
 *   slices; at once when warm; starts over after a data change) · isWarm() · bandFor(i) → 'b1'…'b5' | null (= estimate(i).band)
 *   rp(v[, {long}]) 'Rp30 jt' | 'Rp30 juta' · rpRange(lo, hi[, {long}]) 'Rp10–40 jt' · num(n) '1.234'
 *   BANDS · ADJ · CAPTION · LEGAL · TIP · TIER_TEXT · create(deps) · clearCache()
 *   deps: {bench, exists(i), factors(i), category(i), group(i), chain(i), notMerchant(i), area(i) → {kecamatanId}, lvmCat(i),
 *          listings() → [{i, kecamatanId}], links(i) → {lvmId, edcId}, record(id) → {kind: 'lvm'|'edc', rec, known?: {trx, vol}},
 *          funding() → {model, match}, version() → [refs], now() → ms, schedule(fn) (warm's idle slices; tests use a fake clock)}
 * UMD: MCD.omzet in the browser (classic script), module.exports in Node.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.omzet = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  /* ------------------------------------------------------------- constants (assumptions, docs/OMZET_ESTIMATE.md §2) */

  var LEVEL3 = ['rendah', 'sedang', 'tinggi'];
  var TICKET3 = ['kecil', 'sedang', 'besar'];
  var ADJ = {
    crowd: [0.6, 1, 1.7],            // keramaian rendah / sedang / tinggi
    wealth: [0.85, 1, 1.2],          // daya beli area rendah / sedang / tinggi (unknown: 1)
    ticketStep: 1.5,                 // per level of nilai belanja above (below) the usual level of the type
    spread: 3,                       // no high figure: the ceiling is the typical figure × this (no low figure: no floor)
    taxCheckBand: [0.8, 1.25],       // taxCheck: tax figure ÷ top-tail estimate inside this band reads 'sejalan'
    taxCheckMinN: 10                 // taxCheck: fewest top-tail listings to compare
  };
  var EDC_FROM = 40000000;           // EDC from this level when nilai belanja is sedang or besar (asumsi)
  var EDC_ALL_FROM = 170000000;      // EDC for every type from this level
  var BAND_DEF = [
    { id: 'b1', min: 0, max: 10000000, short: 'Sangat kecil', fit: 'lvm' },
    { id: 'b2', min: 10000000, max: 40000000, short: 'Kecil', fit: 'lvm' },
    { id: 'b3', min: 40000000, max: 170000000, short: 'Sedang', fit: 'edc-jika' },
    { id: 'b4', min: 170000000, max: 400000000, short: 'Besar', fit: 'edc' },
    { id: 'b5', min: 400000000, max: null, short: 'Sangat besar', fit: 'edc' }
  ];
  var LVM = 'Livin’ Merchant';
  var FIT_TEXT = {
    lvm: LVM + ' (QRIS di HP)',
    edc: 'EDC Mandiri dan ' + LVM,
    'edc-jika': LVM + '. EDC jika nilai belanja sedang atau besar'
  };
  var CAPTION = 'Perkiraan omzet, bukan data pajak atau data rekening';
  var CAPTION_OBS = 'Transaksi tercatat dari file bank yang diimpor';
  var LEGAL = 'Omzet di sini adalah perkiraan dari data publik, karena data pajak setiap usaha bersifat rahasia (UU KUP Pasal 34, UU 1/2022 Pasal 103).';
  var NONE_LABEL = 'Belum ada perkiraan omzet';
  /* V8 final fix: a Funding Merchant tier 'nihil' says the EDC was not used, not that the shop has no turnover */
  var IDLE_LINE = 'EDC tidak digunakan bulan ini';
  /* Funding Merchant report tiers: the labels of MCD.funding.TIERS (one term per object, COPY_DECK_ID rule 13), read live
     when that module is loaded; this copy is used before it loads. docs/OMZET_ESTIMATE.md §6. */
  var TIER_LABEL = {
    sv: { nihil: 'Nihil', kurang: 'Kurang optimal', hampir: 'Hampir optimal', optimal: 'Optimal' },
    freq: { nihil: 'Nihil', kurang: 'Kurang aktif', hampir: 'Hampir aktif', aktif: 'Aktif' }
  };
  var TIER_PREFIX = { freq: 'Transaksi EDC: ', sv: 'Nilai transaksi EDC: ' };
  var TIER_RANK = { freq: ['nihil', 'kurang', 'hampir', 'aktif'], sv: ['nihil', 'kurang', 'hampir', 'optimal'] };
  var EVIDENCE = { medium: 'sedang', weak: 'lemah', 'very weak': 'sangat lemah', none: 'tidak ada' };
  var LONG = { long: true };

  /* ------------------------------------------------------------- helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function safe(fn, dflt) { try { return fn(); } catch (e) { return dflt === undefined ? null : dflt; } }
  function M() { return root && root.MCD; }

  /* ------------------------------------------------------------- Indonesian numbers (COPY_DECK_ID §1) */

  /** num(1234) → '1.234'; num(2.5, 1) → '2,5'; trailing zero decimals are dropped ('2,0' → '2'). */
  function num(n, d) {
    if (!isNum(n)) return '—';
    d = d || 0;
    var s = Math.abs(n).toFixed(d), parts = s.split('.'), int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var dec = parts[1] ? parts[1].replace(/0+$/, '') : '';
    var out = int + (dec ? ',' + dec : '');
    return (n < 0 && out !== '0' ? '-' : '') + out;
  }
  /* short units for cards, chips and band labels; long units for sentences and tips (COPY_DECK_ID §1, Numbers) */
  var UNITS = [['jt', 1e6], ['M', 1e9], ['T', 1e12]];
  var UNITS_LONG = [['juta', 1e6], ['miliar', 1e9], ['triliun', 1e12]];
  /** {n: '37,4', u: 'jt'} of a Rupiah amount: one decimal under 100 units, none from 100; full digits under Rp1 juta. */
  function rpParts(v, long) {
    var a = Math.abs(v), U = long ? UNITS_LONG : UNITS;
    if (a < 999500) return { n: num(Math.round(v)), u: '' };
    for (var k = 0; k < U.length; k++) {
      var s = v / U[k][1], d = Math.abs(s) < 100 ? 1 : 0, r = Math.round(s * Math.pow(10, d)) / Math.pow(10, d);
      if (Math.abs(r) < 1000 || k === U.length - 1) return { n: num(r, d), u: U[k][0] };
    }
    return { n: num(v), u: '' };
  }
  function isLong(o) { return !!(o && (o === true || o.long)); }
  /** rp(30e6) → 'Rp30 jt' · rp(1.2e9) → 'Rp1,2 M' · rp(850000) → 'Rp850.000' · rp(30e6, {long: true}) → 'Rp30 juta' */
  function rp(v, o) {
    if (!isNum(v)) return '—';
    var p = rpParts(v, isLong(o));
    return 'Rp' + p.n + (p.u ? ' ' + p.u : '');
  }
  /** rpRange(10e6, 40e6) → 'Rp10–40 jt' · rpRange(480e6, 2.04e9) → 'Rp480 jt–2 M' · {long: true} → 'Rp10–40 juta' */
  function rpRange(lo, hi, o) {
    if (!isNum(lo) || !isNum(hi)) return '—';
    var L = isLong(o), a = rpParts(lo, L), b = rpParts(hi, L);
    if (a.u === b.u) return 'Rp' + a.n + '–' + b.n + (b.u ? ' ' + b.u : '');
    return 'Rp' + a.n + (a.u ? ' ' + a.u : '') + '–' + b.n + (b.u ? ' ' + b.u : '');
  }
  function sig2(v) { if (!isNum(v) || v === 0) return v; var e = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1); return Math.round(v / e) * e; }

  /* ------------------------------------------------------------- bands */

  function bandText(b, f, per) {
    var lo = b.min * f, hi = b.max == null ? null : b.max * f, tail = per ? '/' + per : '';
    if (!b.min) return 'Di bawah ' + rp(hi) + tail;
    if (hi == null) return rp(lo) + tail + ' atau lebih';
    return '± ' + rpRange(lo, hi) + tail;
  }
  var BANDS = BAND_DEF.map(function (b, k) {
    return { id: b.id, index: k, min: b.min, max: b.max, short: b.short, fit: b.fit, fitText: FIT_TEXT[b.fit],
      label: bandText(b, 1, 'bulan'), range: bandText(b, 1, ''), yearLabel: bandText(b, 12, 'tahun') };
  });
  /** bandOf(rpPerMonth) → the band object (edges belong to the band above: Rp10 jt is b2). */
  function bandOf(v) {
    if (!isNum(v)) return null;
    for (var k = BANDS.length - 1; k >= 0; k--) if (v >= BANDS[k].min) return BANDS[k];
    return BANDS[0];
  }

  /* ------------------------------------------------------------- Funding Merchant tier lines */

  /** tierLine('freq', 'kurang') → 'Transaksi EDC: kurang aktif' (label of MCD.funding.TIERS, lower case after the colon) */
  function tierLine(kind, id) {
    if (!id || !has(TIER_LABEL, kind)) return null;
    var F = M() && M().funding, T = F && F.TIERS && F.TIERS[kind];
    var l = T && has(T, id) && typeof T[id] === 'string' ? T[id] : (has(TIER_LABEL[kind], id) ? TIER_LABEL[kind][id] : null);
    return l ? TIER_PREFIX[kind] + l.toLowerCase() : null;
  }
  var TIER_TEXT = { freq: {}, sv: {} };
  Object.keys(TIER_TEXT).forEach(function (k) { TIER_RANK[k].forEach(function (id) { TIER_TEXT[k][id] = TIER_PREFIX[k] + TIER_LABEL[k][id].toLowerCase(); }); });

  /* ------------------------------------------------------------- the engine */

  function create(deps) {
    deps = deps || {};
    var FUND = { model: null, match: null };
    /* gen counts every reset, so a warm-up in progress (warm) notices a data change and starts over */
    var C = { ver: null, list: null, byKec: null, tax: {}, est: {}, band: {}, warm: false, gen: 0 };

    /* ---------- live inputs (each replaced by deps.<name> when given) */

    function bench() { return deps.bench || (root && root.MCD_OMZET_BENCHMARKS) || null; }
    function lvmResult() {
      var L = M() && M().lvm;
      if (!L) return null;
      var R = typeof L.result === 'function' ? safe(L.result) : null;
      if (!R && typeof L.match === 'function') R = safe(L.match);
      return R && R.pois ? R : null;
    }
    var XA = { E: null, P: null, ok: false };
    function extra() {
      var E = root && root.MCD_SME_EXTRA, P = root && root.MCD_SME_POIS;
      if (!E || !P || !P.rows || typeof E.catOf !== 'function') return null;
      if (XA.E !== E || XA.P !== P) {
        XA.E = E; XA.P = P;
        /* V8 fix round (D49 ≤ 50 ms tasks): MCD.lvm checked this pair for its match and keeps the answer (about 55 ms saved) */
        var L = M() && M().lvm, viaL = L && typeof L.extraFor === 'function' ? safe(function () { return L.extraFor(P); }) : null;
        XA.ok = viaL === E ? true : (typeof E.alignedWith === 'function' ? !!safe(function () { return E.alignedWith(P); }, false) : true);
      }
      return XA.ok ? E : null;
    }
    var D = {
      /* is i a row of the public listing file? (injected inputs stand for that file) */
      exists: deps.exists || function (i) {
        if (deps.factors || deps.category || deps.group || deps.lvmCat) return true;
        var P = root && root.MCD_SME_POIS;
        return !!(P && P.rows && i < P.rows.length);
      },
      factors: deps.factors || function (i) { var S = M() && M().sme; return S && typeof S.factors === 'function' ? safe(function () { return S.factors(i); }) : null; },
      category: deps.category || function (i) { var E = extra(); return E ? safe(function () { return E.catOf(i); }) : null; },
      group: deps.group || function (i) { var P = root && root.MCD_SME_POIS, r = P && P.rows && P.rows[i]; return r ? (r[2] | 0) : -1; },
      chain: deps.chain || function (i) { var S = M() && M().sme; var c = S && typeof S.chainOf === 'function' ? safe(function () { return S.chainOf(i); }) : null; return !!(c && c.largeChain); },
      notMerchant: deps.notMerchant || function (i) { var L = M() && M().lvm; return L && typeof L.nonMerchant === 'function' ? safe(function () { return L.nonMerchant(i); }) : null; },
      area: deps.area || function (i) {
        var L = M() && M().lvm, R = lvmResult(), ps = L && R && typeof L.poiStatus === 'function' ? safe(function () { return L.poiStatus(i, R); }) : null;
        if (ps && ps.kecamatanId) return { kecamatanId: ps.kecamatanId, kelurahanId: ps.kelurahanId || null };
        var P = root && root.MCD_SME_POIS, r = P && P.rows && P.rows[i], A = root && root.MCD_ADMIN_AREAS;
        var loc = r && A && typeof A.locate === 'function' ? safe(function () { return A.locate(r[0], r[1]); }) : null;
        return loc ? { kecamatanId: loc.kecamatanId || null, kelurahanId: loc.kelurahanId || null } : null;
      },
      lvmCat: deps.lvmCat || function (i) { var L = M() && M().lvm, R = lvmResult(), ps = L && R ? safe(function () { return L.poiStatus(i, R); }) : null; return ps ? ps.category : null; },
      listings: deps.listings || liveListings,
      links: deps.links || function (i) {
        var L = M() && M().lvm, R = lvmResult(), ps = L && R ? safe(function () { return L.poiStatus(i, R); }) : null;
        return ps ? { lvmId: ps.merchantId || null, edcId: ps.edc ? ps.edc.merchantId : null } : null;
      },
      record: deps.record || function (id) {
        var R = lvmResult(), x = R && R.byId ? R.byId[id] : null;
        if (!x) return null;
        if (x.kind === 'lvm') return { kind: 'lvm', rec: (R.lvmRef || [])[x.ix] || null };
        if (x.kind === 'edc') {
          /* MCD.lvm.edc.merchants() starts trxMonth / volumeMonth at 0, so a 0 may mean "no such column": look at the rows */
          var rec = (R.edcMerchants || [])[x.ix] || null, rows = rec && rec._rows, src = R.edcRef || [], known = null;
          if (rows && rows.length) {
            known = { trx: false, vol: false };
            rows.forEach(function (k) { var r = src[k]; if (r && isNum(r.trxMonth)) known.trx = true; if (r && isNum(r.volumeMonth)) known.vol = true; });
          }
          return { kind: 'edc', rec: rec, known: known };
        }
        return null;
      },
      funding: deps.funding || function () { return FUND.model ? FUND : null; },
      /* V8 fix round: prime(ms, now) → true when the factor provider is ready, else it worked for about ms (MCD.sme's
         first build of its candidate list takes about 0,2 s at once; warm() spreads it over idle slices) */
      prime: deps.prime || (deps.factors ? function () { return true; } : function (ms, now) {
        var S = M() && M().sme;
        return S && typeof S.warmFactors === 'function' ? safe(function () { return S.warmFactors(ms, now); }, true) !== false : true;
      }),
      version: deps.version || function () { return [lvmResult(), bench(), root && root.MCD_AREA_WEALTH, root && root.MCD_SME_EXTRA, root && root.MCD_SME_POIS, FUND.model, FUND.match]; }
    };
    function liveListings() {
      var L = M() && M().lvm, R = lvmResult();
      if (!L || !R || typeof L.poiStatus !== 'function') return [];
      var P = R.pois, kecId = {}, out = [];
      for (var i = 0; i < P.n; i++) {
        if (!P.ok[i] || P.kec[i] < 0) continue;
        var k = P.kec[i];
        if (!has(kecId, k)) { var ps = safe(function () { return L.poiStatus(i, R); }); kecId[k] = ps ? ps.kecamatanId : null; }
        if (kecId[k]) out.push({ i: i, kecamatanId: kecId[k] });
      }
      return out;
    }

    /* ---------- caches, dropped when an input changes */

    function reset(ver) { C.ver = ver; C.list = null; C.byKec = null; C.tax = {}; C.est = {}; C.band = {}; C.warm = false; C.gen++; }
    function fresh() {
      var v = safe(D.version, []) || [];
      var same = C.ver && C.ver.length === v.length && v.every(function (x, k) { return x === C.ver[k]; });
      if (!same) reset(v);
    }
    function clearCache() { reset(null); }
    function listings() {
      fresh();
      if (!C.list) {
        C.list = (safe(D.listings, []) || []).filter(function (x) { return x && isNum(x.i); });
        C.byKec = {};
        C.list.forEach(function (x) { if (x.kecamatanId) (C.byKec[x.kecamatanId] = C.byKec[x.kecamatanId] || []).push(x.i); });
      }
      return C.list;
    }
    /** listing indices of an area: a kecamatan id exactly, or every kecamatan inside a kota / province id */
    function listingsIn(id) {
      listings();
      if (has(C.byKec, id)) return C.byKec[id];
      var out = [];
      Object.keys(C.byKec).forEach(function (k) { if (k.indexOf(id + '.') === 0) out = out.concat(C.byKec[k]); });
      return out;
    }

    /* ---------- the business type */

    var RX = { key: null, list: [] };
    function patterns(B) {
      if (RX.key !== B) { RX.key = B; RX.list = (B.patterns || []).map(function (p) { return [new RegExp(p[0]), p[1]]; }); }
      return RX.list;
    }
    /** categoryOf(i) → {id: benchmark id | null, src: 'kategori'|'pola'|'kelompok'|'jenis'|'umum', cat, approx, chain} */
    function categoryOf(i) {
      var B = bench();
      if (!B) return null;
      var cat = safe(function () { return D.category(i); }), chain = !!safe(function () { return D.chain(i); }, false);
      var approx = (B.approx || []).indexOf(cat) >= 0;
      if (cat) {
        if (chain && B.chainCategories && has(B.chainCategories, cat)) return { id: B.chainCategories[cat], src: 'kategori', cat: cat, approx: approx, chain: true };
        if (B.categories && has(B.categories, cat)) return { id: B.categories[cat], src: 'kategori', cat: cat, approx: approx, chain: chain };
        var ps = patterns(B);
        for (var k = 0; k < ps.length; k++) if (ps[k][0].test(cat)) return { id: ps[k][1], src: 'pola', cat: cat, approx: false, chain: chain };
        return { id: null, src: 'kategori', cat: cat, approx: false, chain: chain };
      }
      var g = safe(function () { return D.group(i); }, -1);
      if (isNum(g) && g >= 0 && B.groups && g < B.groups.length) {
        return B.groups[g] ? { id: B.groups[g], src: 'kelompok', cat: null, approx: true, chain: chain } : null;   // null: bank offices
      }
      var lc = safe(function () { return D.lvmCat(i); });
      if (lc && B.lvmCats && has(B.lvmCats, lc)) return { id: B.lvmCats[lc], src: 'jenis', cat: null, approx: true, chain: chain };
      return { id: B.fallback || null, src: 'umum', cat: null, approx: true, chain: chain };
    }
    /** the typical monthly figure of a benchmark: its mid, else the geometric mean of low and high; never invented from one side */
    function typical(b) {
      if (!b) return null;
      if (isNum(b.mid)) return b.mid;
      if (isNum(b.low) && isNum(b.high)) return Math.sqrt(b.low * b.high);
      return null;
    }
    /** a figure of its own: a typical value and evidence stronger than 'very weak' */
    function ownFigure(b) { return !!b && b.strength !== 'very weak' && b.strength !== 'none' && typical(b) != null; }
    /** a very weak source is a ceiling only: its high, else its mid (a low alone, such as a break-even figure, is no ceiling) */
    function ceilingOf(b) { return b && b.strength === 'very weak' ? (isNum(b.high) ? b.high : (isNum(b.mid) ? b.mid : null)) : null; }
    /** [floor, ceiling]: the source's low (no low: no floor) and high (no high: typical × ADJ.spread) */
    function rangeOf(b) { var t = typical(b); return [isNum(b.low) ? b.low : 0, isNum(b.high) ? b.high : t * ADJ.spread]; }
    function levelIx(list, f) { var x = f && f.level != null ? list.indexOf(String(f.level)) : -1; return x; }

    /* ---------- the estimate */

    /** core(i): the estimate of listing i before labels (cached per data version), or null / {kind: 'none'} */
    function core(i) {
      fresh();
      if (has(C.est, i)) return C.est[i];
      var r = coreOf(i);
      C.est[i] = r;
      return r;
    }
    /*
     * mode 'jenis'      the type's own figure (evidence weak or medium);
     * mode 'umum'       no figure for the type, or a listing known only by its group: the general UMKM mean (B.fallback);
     * mode 'umum-batas' a very weak source: the general UMKM mean, capped at that source's figure.
     * The general mean is never used for a big-ticket listing (nilai belanja besar) or a type marked general: false.
     */
    function coreOf(i) {
      var B = bench();
      if (!B || !B.bench || !isNum(i) || i < 0 || Math.floor(i) !== i) return null;
      if (!safe(function () { return D.exists(i); }, false)) return null;
      var f = safe(function () { return D.factors(i); });
      if (f && f.notMerchant) return null;
      if (safe(function () { return D.notMerchant(i); })) return null;
      var cat = categoryOf(i);
      if (!cat) return null;
      var t = f ? levelIx(TICKET3, f.ticket) : -1, c = f ? levelIx(LEVEL3, f.crowd) : -1, w = f ? levelIx(LEVEL3, f.wealth) : -1;
      /* the type in plain words: the benchmark's label, else the reason of nilai belanja ("toko furnitur", MCD.sme catWords) */
      var words = f && f.ticket && typeof f.ticket.why === 'string' && f.ticket.why ? f.ticket.why : null;
      var orig = cat.id && B.bench[cat.id] ? B.bench[cat.id] : null, origId = orig ? cat.id : null, G = B.fallback ? B.bench[B.fallback] : null;
      var b = orig, mode = 'jenis', cap = null;
      if (!ownFigure(orig) || origId === B.fallback) {
        mode = orig && orig.strength === 'very weak' ? 'umum-batas' : 'umum';
        var tl = t >= 0 ? t : (orig && isNum(orig.ticket) ? orig.ticket : 0);
        var base = { kind: 'none', i: i, cat: cat, orig: orig, origId: origId, words: words, t: t, c: c, w: w, mode: mode };
        if ((orig && orig.general === false) || tl >= 2 || !ownFigure(G)) return base;
        b = G;
        if (mode === 'umum-batas') cap = ceilingOf(orig);
      }
      var T = typical(b), rg = rangeOf(b), bt = isNum(b.ticket) ? b.ticket : 0;
      if (cap != null && cap < rg[1]) rg = [Math.min(rg[0], cap), cap];
      var mT = t >= 0 ? Math.pow(ADJ.ticketStep, t - bt) : 1, mC = c >= 0 ? ADJ.crowd[c] : 1, mW = w >= 0 ? ADJ.wealth[w] : 1;
      var raw = T * mT * mC * mW, clipped = clamp(raw, rg[0], rg[1]);
      return { kind: 'estimate', i: i, cat: cat, b: b, benchId: mode === 'jenis' ? cat.id : B.fallback, orig: orig, origId: origId, mode: mode, words: words,
        t: t, c: c, w: w, T: T, lo: rg[0], hi: rg[1], cap: cap, mT: mT, mC: mC, mW: mW, raw: raw, clipped: clipped, pbjt: mode === 'jenis' && !!b.pbjt };
    }
    /** the type's name: the benchmark label (not the general mean's), else MCD.sme's words */
    function typeWords(x) { var B = bench(); return x.orig && x.origId !== (B && B.fallback) ? x.orig.label : x.words; }
    /** 'Jenis usaha: toko furnitur.' · 'Jenis usaha belum diketahui.' */
    function typeLine(x) { var w = typeWords(x); return w ? 'Jenis usaha: ' + w + '.' : 'Jenis usaha belum diketahui.'; }
    function weakLines(x) {
      var o = x.orig, cap = ceilingOf(o), out = ['Sumber omzet jenis ini sangat lemah: ' + o.basis + '.'];
      if (x.kind === 'none' && cap != null) out.push('Batas atas dari sumber: ' + rp(cap, LONG) + ' per bulan.');
      return out;
    }
    function moved(m) { return m > 1 ? 'dinaikkan' : (m < 1 ? 'diturunkan' : 'tetap'); }
    function evidenceOf(b) { var B = bench(), E = (B && B.meta && B.meta.evidence) || EVIDENCE; return E[b.strength] || EVIDENCE[b.strength] || 'tidak ada'; }
    function legal() { var B = bench(); return (B && B.legalLine) || LEGAL; }
    function caption() { var B = bench(); return (B && B.caption) || CAPTION; }
    function sizeOf(annual) {
      var B = bench(), S = (B && B.sizeClasses) || [{ id: 'mikro', label: 'Usaha mikro', annualMax: 2e9 }, { id: 'kecil', label: 'Usaha kecil', annualMax: 15e9 }, { id: 'menengah', label: 'Usaha menengah', annualMax: 50e9 }];
      if (!isNum(annual)) return null;
      for (var k = 0; k < S.length; k++) if (annual <= S[k].annualMax) return { id: S[k].id, label: S[k].label };
      return { id: 'besar', label: 'Usaha besar' };
    }

    /** estimate(i): the full, labelled estimate of public listing i (see the header). */
    function estimate(i) {
      if (i == null || i === '' || typeof i === 'boolean') return null;
      i = +i;
      var x = core(i);
      if (!x) return null;
      var basis = [], B = bench(), ownType = x.orig && x.origId !== B.fallback;
      if (x.kind === 'none') {
        basis.push(typeLine(x));
        if (x.mode === 'umum-batas') basis = basis.concat(weakLines(x));
        else basis.push('Belum ada data omzet publik untuk jenis usaha ini.');
        if (x.t === 2) basis.push('Nilai belanja besar: usaha seperti ini biasanya di atas usaha mikro.');
        return { i: i, kind: 'none', band: null, bandIndex: -1, label: NONE_LABEL, low: null, high: null, yearLabel: null, short: null, point: null,
          sizeClass: null, sizeLabel: null, fit: null, fitText: null, category: ownType ? x.origId : null, categoryLabel: ownType ? x.orig.label : null,
          mode: null, levels: levelsOf(x), basis: basis, confidence: null, sources: ownType ? (x.orig.sources || []).slice() : [],
          note: ownType && x.orig.note ? x.orig.note : 'Belum ada sumber omzet untuk jenis usaha ini.', caption: caption(), legal: legal() };
      }
      var b = x.b;
      /* the reasons, one plain line each */
      if (x.mode === 'jenis') basis.push('Jenis usaha: ' + b.label + (x.cat.src === 'kelompok' || x.cat.src === 'jenis' ? ' (dari kelompok usaha)' : '') + '.');
      else if (x.mode === 'umum-batas') basis = basis.concat([typeLine(x)], weakLines(x));
      else basis.push(typeLine(x) + ' Belum ada angka omzet untuk jenis ini.');
      basis.push('Titik awal ± ' + rp(x.T, LONG) + ' per bulan: ' + b.basis + '.');
      if (x.t >= 0 && x.mT !== 1) basis.push('Nilai belanja ' + TICKET3[x.t] + ' untuk jenis usaha ini: perkiraan ' + moved(x.mT) + '.');
      basis.push(x.c >= 0 ? 'Keramaian ' + LEVEL3[x.c] + ': perkiraan ' + moved(x.mC) + '.' : 'Keramaian belum diketahui: perkiraan tetap.');
      basis.push(x.w >= 0 ? 'Daya beli area ' + LEVEL3[x.w] + ': perkiraan ' + moved(x.mW) + '.' : 'Daya beli area belum diketahui: perkiraan tetap.');
      if (x.clipped !== x.raw) {
        if (x.raw > x.hi && x.cap != null && x.hi === x.cap) basis.push('Dibatasi ke batas atas sumber: ' + rp(x.hi, LONG) + ' per bulan.');
        else if (x.lo > 0) basis.push('Dibatasi ke kisaran sumber: ' + rpRange(x.lo, x.hi, LONG) + ' per bulan.');
        else basis.push('Dibatasi ke batas atas: ' + rp(x.hi, LONG) + ' per bulan.');
      }
      if (x.cat.chain) basis.push(x.benchId === 'minimarket' ? 'Bagian dari jaringan nasional. Kerja sama pembayarannya biasanya diputuskan kantor pusat.'
        : 'Bagian dari jaringan nasional. Omzet gerai dapat di atas perkiraan ini.');
      var point = Math.round(x.clipped / 1e5) * 1e5;              // one rounding, shared by the band, the size class and totals
      var band = bandOf(point), size = sizeOf(point * 12);
      var fit = band.fit === 'edc-jika' ? (x.t >= 1 ? 'edc' : 'lvm') : band.fit;
      var conf = x.mode === 'jenis' && b.strength === 'medium' && !x.cat.approx && (x.cat.src === 'kategori' || x.cat.src === 'pola') && x.c >= 0 && !(x.cat.chain && x.benchId !== 'minimarket') ? 'sedang' : 'rendah';
      var nb = x.mode === 'umum-batas' ? x.orig : b;
      var note = 'Bukti untuk jenis usaha ini: ' + evidenceOf(nb) + '.' + (nb.note ? ' ' + nb.note : '');
      return {
        i: i, kind: 'estimate', band: band.id, bandIndex: band.index, label: band.label, low: band.min, high: band.max, yearLabel: band.yearLabel,
        short: band.short, point: point, sizeClass: size.id, sizeLabel: size.label, fit: fit, fitText: FIT_TEXT[fit],
        category: x.benchId, categoryLabel: b.label, categorySrc: x.cat.src, fromCategory: x.origId || null, mode: x.mode, chain: !!x.cat.chain,
        levels: levelsOf(x), basis: basis, confidence: conf,
        sources: (x.mode === 'umum-batas' ? (x.orig.sources || []).concat(b.sources || []) : (b.sources || [])).slice(), evidence: evidenceOf(nb), note: note, caption: caption(), legal: legal()
      };
    }
    function levelsOf(x) {
      return { ticket: x.t >= 0 ? TICKET3[x.t] : null, crowd: x.c >= 0 ? LEVEL3[x.c] : null, wealth: x.w >= 0 ? LEVEL3[x.w] : null };
    }

    /* ---------- published restaurant tax: context and an upper-tail check (docs/OMZET_ESTIMATE.md §4) */

    function taxEntry(id) {
      var B = bench(), T = B && B.restaurantTax;
      if (!T || !id) return null;
      var p = String(id).split('.');
      for (var n = p.length; n > 0; n--) { var k = p.slice(0, n).join('.'); if (has(T, k)) return { id: k, e: T[k] }; }
      return null;
    }
    function thresholdOf(id, e) {
      if (e && isNum(e.threshold)) return e.threshold;
      var B = bench(), T = (B && B.thresholds) || {};
      var p = id.split('.');
      for (var n = p.length; n > 0; n--) { var k = p.slice(0, n).join('.'); if (has(T, k)) return T[k]; }
      return null;
    }
    function taxLines(o) {
      var L = [];
      if (o.tax == null) L.push('Belum ada data pajak restoran ' + o.area + (o.year ? ' ' + o.year : '') + '.');
      else {
        L.push('Pajak restoran ' + o.area + (o.year ? ' ' + o.year : '') + ': ' + rp(o.tax, LONG) + '.');
        if (o.implied != null) L.push('Rata-rata penjualan ' + num(o.taxpayers) + ' restoran terdaftar: ± ' + rp(o.implied, LONG) + ' per bulan.');
        else L.push('Jumlah restoran terdaftar belum dipublikasikan.');
        if (o.share != null) L.push('Sekitar ' + num(o.share * 100) + '% usaha makanan terdaftar, biasanya yang besar.');
      }
      if (o.threshold) L.push('Batas pajak restoran: omzet ' + rp(o.threshold, LONG) + ' per bulan.');
      L.push('Angka pajak ini hanya keterangan dan tidak mengubah perkiraan per usaha.');
      return L;
    }
    /**
     * taxCheck(areaId) → {id, area, year, level, tax, rate, taxpayers, threshold, implied, share, n, top, topMean, ratio,
     *                     verdict: 'lebih-rendah' | 'sejalan' | 'lebih-tinggi' | null, reason, lines} | null
     *   implied = tax ÷ rate ÷ taxpayers ÷ 12: sales per registered restaurant per month (registered = the large ones).
     *   Like with like: it is compared with the mean estimate of the TOP share of the area's restaurant-type listings
     *   (share = registered taxpayers ÷ food businesses, from the research), never with all listings. The result is a
     *   check for the docs and a later recalibration: no estimate changes (no taxpayer count: reason 'incomplete';
     *   no share: 'no-share'; fewer than ADJ.taxCheckMinN top listings: 'few'). `lines` is the plain context text.
     */
    function taxCheck(areaId) {
      fresh();
      var hit = taxEntry(areaId);
      if (!hit) return null;
      if (has(C.tax, hit.id)) return C.tax[hit.id];
      var e = hit.e, pos = function (v) { return isNum(v) && v > 0 ? v : null; };
      var o = { id: hit.id, area: e.area || hit.id, year: e.year || null, level: e.level || null, tax: pos(e.tax), rate: pos(e.rate), taxpayers: pos(e.taxpayers),
        threshold: thresholdOf(hit.id, e), implied: null, share: pos(e.registeredShare), n: 0, top: 0, topMean: null, ratio: null, verdict: null, reason: null };
      if (o.tax && o.rate && o.taxpayers) o.implied = o.tax / o.rate / o.taxpayers / 12;
      if (o.implied == null) o.reason = 'incomplete';
      else if (o.share == null) o.reason = 'no-share';
      else {
        var pts = [];
        listingsIn(hit.id).forEach(function (j) { var x = core(j); if (x && x.kind === 'estimate' && x.pbjt) pts.push(x.clipped); });
        pts.sort(function (a, b) { return b - a; });
        o.n = pts.length; o.top = Math.round(pts.length * o.share);
        if (o.top < ADJ.taxCheckMinN) o.reason = 'few';
        else {
          var s = 0;
          for (var k = 0; k < o.top; k++) s += pts[k];
          o.topMean = s / o.top; o.ratio = o.implied / o.topMean;
          o.verdict = o.ratio > ADJ.taxCheckBand[1] ? 'lebih-rendah' : (o.ratio < ADJ.taxCheckBand[0] ? 'lebih-tinggi' : 'sejalan');
        }
      }
      o.lines = taxLines(o);
      C.tax[hit.id] = o;
      return o;
    }

    /* ---------- what the bank's own files say (docs/OMZET_ESTIMATE.md §6) */

    function fund() { var F = safe(D.funding); return F && (F.model || F.merchants) ? F : null; }
    function fundMerchants(F) { return (F.model && F.model.merchants) || F.merchants || []; }
    var FX = { of: null, by: null };
    function fundById(F, id) {
      var list = fundMerchants(F);
      if (FX.of !== list) {
        FX.of = list; FX.by = {};
        list.forEach(function (m) { if (m && m.id != null) FX.by[String(m.id)] = m; });
      }
      return has(FX.by, String(id)) ? FX.by[String(id)] : null;
    }
    function refsOf(map, key) { return key != null && map && has(map, String(key)) ? map[String(key)] : []; }
    function poiOf(ref) {
      if (isNum(ref)) return ref;
      if (typeof ref === 'string') { var m = /^(?:poi:)?(\d+)$/.exec(ref); return m ? +m[1] : null; }
      if (ref && typeof ref === 'object' && ref.poi != null) return +ref.poi;
      return null;
    }
    /** {poi, lvmId, edcId, fundingIds} of any reference */
    function resolve(ref) {
      var F = fund(), X = F && F.match, out = { poi: poiOf(ref), lvmId: null, edcId: null, fundingIds: [] };
      if (ref && typeof ref === 'object') { out.lvmId = ref.lvmId || null; out.edcId = ref.edcId || null; if (ref.fundingId) out.fundingIds.push(String(ref.fundingId)); }
      if (typeof ref === 'string' && out.poi == null) {
        if (F && fundById(F, ref)) out.fundingIds.push(ref);
        else {
          var r = safe(function () { return D.record(ref); });
          if (r && r.kind === 'lvm') out.lvmId = ref; else if (r && r.kind === 'edc') out.edcId = ref;
        }
      }
      if (out.poi != null && (!out.lvmId || !out.edcId)) {
        var l = safe(function () { return D.links(out.poi); });
        if (l) { out.lvmId = out.lvmId || l.lvmId || null; out.edcId = out.edcId || l.edcId || null; }
      }
      if (X) {
        refsOf(X.poi, out.poi).concat(refsOf(X.lvm, out.lvmId), refsOf(X.edc, out.edcId)).forEach(function (id) { if (out.fundingIds.indexOf(String(id)) < 0) out.fundingIds.push(String(id)); });
        /* a Funding merchant matched to a store or terminal brings that record too */
        out.fundingIds.forEach(function (fid) {
          var h = X.byId && X.byId[fid];
          if (!h) return;
          if (!out.lvmId && h.lvm && h.lvm.ref != null) out.lvmId = String(h.lvm.ref);
          if (!out.edcId && h.edc && h.edc.ref != null) out.edcId = String(h.edc.ref);
          if (out.poi == null && h.poi && h.poi.ref != null && isNum(+h.poi.ref)) out.poi = +h.poi.ref;
        });
      }
      return out;
    }
    function bestTier(list, kind) {
      var best = -1;
      list.forEach(function (m) { var k = m ? TIER_RANK[kind].indexOf(kind === 'sv' ? m.tierSv : m.tierFreq) : -1; if (k > best) best = k; });
      return best >= 0 ? TIER_RANK[kind][best] : null;
    }
    /** 'di bawah Rp10 jt' · '± Rp10–40 jt' · 'Rp400 jt atau lebih': a band in the middle of a sentence */
    function midSentence(s) { return /^Di bawah /.test(s) ? 'di bawah ' + s.slice(9) : s; }
    function rangeWords(v) { var b = bandOf(v); return b ? midSentence(b.range) : '—'; }
    /** an LVM record's activity: `active` (MCD.lvm), else `status` of the importer's baseline schema (template sheet 1_lvm) */
    function lvmActive(r) {
      if (r.active === true || r.active === false) return r.active;
      return r.status === 'active' ? true : (r.status === 'inactive' ? false : null);
    }

    /** observed(ref): the transaction figures of the bank's own files for a listing, store or merchant (header). Amounts
        are reduced to a band here: no exact rupiah figure leaves this function. */
    function observed(ref) {
      var ids = resolve(ref), lines = [], src = [];
      var lr = ids.lvmId ? safe(function () { return D.record(ids.lvmId); }) : null, lvm = lr && lr.kind === 'lvm' ? lr.rec : null;
      var er = ids.edcId ? safe(function () { return D.record(ids.edcId); }) : null, edc = er && er.kind === 'edc' ? er.rec : null;
      var eKnown = er && er.known ? er.known : { trx: true, vol: true };
      var F = fund(), fl = F ? ids.fundingIds.map(function (id) { return fundById(F, id); }).filter(Boolean) : [];
      if (!lvm && !edc && !fl.length) return null;
      var monthly = 0, outLvm = null, outEdc = null, outF = null;
      if (lvm) {
        src.push('lvm');
        outLvm = { active: lvmActive(lvm), freq30: isNum(lvm.freq30) ? lvm.freq30 : null,
          freqMtd: isNum(lvm.freqMtd) ? lvm.freqMtd : null, svBand: isNum(lvm.sv30) && lvm.sv30 > 0 ? bandOf(lvm.sv30).id : null };
        if (outLvm.active != null) lines.push(LVM + ': ' + (outLvm.active ? 'aktif bulan ini' : 'tidak aktif bulan ini'));
        if (outLvm.freq30 != null) lines.push('Transaksi ' + LVM + ' 30 hari: ' + (outLvm.freq30 > 0 ? num(outLvm.freq30) + ' kali' : 'belum ada'));
        else if (outLvm.freqMtd != null) lines.push('Transaksi ' + LVM + ' bulan ini: ' + (outLvm.freqMtd > 0 ? num(outLvm.freqMtd) + ' kali' : 'belum ada'));
        if (isNum(lvm.sv30) && lvm.sv30 > 0) { lines.push('Nilai transaksi ' + LVM + ' 30 hari: ' + rangeWords(lvm.sv30)); monthly += lvm.sv30; }
      }
      if (edc) {
        src.push('edc');
        outEdc = { terminals: isNum(edc.terminals) ? edc.terminals : null, activeTerminals: isNum(edc.activeTerminals) ? edc.activeTerminals : null,
          trxMonth: isNum(edc.trxMonth) && (edc.trxMonth > 0 || eKnown.trx) ? edc.trxMonth : null,
          volBand: isNum(edc.volumeMonth) && edc.volumeMonth > 0 ? bandOf(edc.volumeMonth).id : null };
        if (outEdc.terminals) lines.push('EDC Mandiri: ' + num(outEdc.terminals) + ' terminal' + (outEdc.activeTerminals != null ? ', ' + num(outEdc.activeTerminals) + ' aktif' : ''));
        if (outEdc.trxMonth != null) lines.push('Transaksi EDC bulan ini: ' + (outEdc.trxMonth > 0 ? num(outEdc.trxMonth) + ' kali' : 'belum ada'));
        if (isNum(edc.volumeMonth) && edc.volumeMonth > 0) { lines.push('Nilai transaksi EDC bulan ini: ' + rangeWords(edc.volumeMonth)); monthly += edc.volumeMonth; }
      }
      if (fl.length) {
        src.push('funding');
        var tf = bestTier(fl, 'freq'), ts = bestTier(fl, 'sv');
        outF = { n: fl.length, tierFreq: tf, tierSv: ts, freqText: tierLine('freq', tf), svText: tierLine('sv', ts) };
        if (outF.freqText) lines.push(outF.freqText);
        if (outF.svText) lines.push(outF.svText);
      }
      if (!lines.length) return null;
      var rb = monthly > 0 ? bandOf(monthly) : null;
      var recorded = rb ? { band: rb.id, label: 'Transaksi tercatat ' + midSentence(rb.label),
        note: 'Omzet sebenarnya dapat lebih besar karena sebagian pembeli membayar tunai.' } : null;
      return { kind: 'observed', ids: ids, sources: src, lines: lines, recorded: recorded, lvm: outLvm, edc: outEdc, funding: outF, caption: CAPTION_OBS, legal: legal() };
    }

    /** display(ref): what a card or list row shows. The bank's own figures win over the estimate. */
    function display(ref) {
      var obs = observed(ref), p = obs && obs.ids && obs.ids.poi != null ? obs.ids.poi : poiOf(ref);
      var est = p != null ? estimate(p) : null;
      /* V8 final fix (critic, 24 Oct 2026): a Funding Merchant tier 'nihil' (no EDC transaction this month) is never shown
         as the omzet. Its two tier lines become one IDLE_LINE; when nothing else of the bank's files measures turnover,
         the public estimate (or "Belum ada perkiraan omzet") stays, with that line. */
      var idle = !!(obs && obs.funding && obs.funding.tierFreq === 'nihil');
      var ol = obs ? (idle ? obs.lines.filter(function (l) { return l !== obs.funding.freqText && l !== obs.funding.svText; }) : obs.lines) : [];
      if (obs && (obs.recorded || ol.length)) {
        if (idle) ol = ol.concat([IDLE_LINE]);
        var lines = obs.recorded ? [obs.recorded.note].concat(ol) : ol.slice(1);
        return { kind: 'observed', primary: obs.recorded ? obs.recorded.label : ol[0], lines: lines, observed: obs, estimate: est, showEstimate: false,
          caption: obs.caption, legal: obs.legal, idle: idle };
      }
      var pre = idle ? [IDLE_LINE] : [];
      if (est && est.kind === 'estimate') {
        return { kind: 'estimate', primary: est.label, lines: pre.concat(['Cocok: ' + est.fitText, est.sizeLabel + ' (PP 7/2021)']), observed: obs || null, estimate: est, showEstimate: true,
          caption: est.caption, legal: est.legal, idle: idle };
      }
      return { kind: 'none', primary: NONE_LABEL, lines: pre.concat(est ? est.basis.slice(0, 2) : []), observed: obs || null, estimate: est, showEstimate: false, caption: caption(), legal: legal(), idle: idle };
    }

    /** kecSummary(kecId): listings per band and the estimated total for the kecamatan card, with the area's restaurant tax as context. */
    function kecSummary(kecId) {
      var list = kecId ? listingsIn(String(kecId)) : [], counts = {}, bySize = {}, total = 0, none = 0, n = 0, est = 0, obsN = 0;
      BANDS.forEach(function (b) { counts[b.id] = 0; });
      var F = fund();
      list.forEach(function (i) {
        var e = estimate(i);
        if (!e) return;
        n++;
        if (e.kind !== 'estimate') { none++; } else {
          est++; counts[e.band]++; total += e.point; bySize[e.sizeClass] = (bySize[e.sizeClass] || 0) + 1;
        }
        /* listings with the bank's own figures (their cards show those instead of the estimate) */
        var l = safe(function () { return D.links(i); });
        if ((l && (l.lvmId || l.edcId)) || (F && F.match && refsOf(F.match.poi, i).length)) obsN++;
      });
      var bands = BANDS.map(function (b) { return { id: b.id, short: b.short, label: b.label, range: b.range, fitText: b.fitText, n: counts[b.id], share: est ? counts[b.id] / est : 0 }; });
      var tc = kecId ? taxCheck(String(kecId)) : null;
      return {
        kecamatanId: kecId || null, n: n, estimated: est, none: none, counts: counts, bands: bands, bySize: bySize, observed: obsN,
        total: total, totalLabel: est ? '± ' + rp(sig2(total)) + '/bulan' : '—', totalYearLabel: est ? '± ' + rp(sig2(total * 12)) + '/tahun' : '—',
        tax: tc ? { id: tc.id, area: tc.area, year: tc.year, lines: tc.lines.slice() } : null,
        note: est ? 'Jumlah perkiraan omzet ' + num(est) + ' merchant di kecamatan ini.' + (none ? ' ' + num(none) + ' merchant belum memiliki perkiraan.' : '') : 'Belum ada merchant dengan perkiraan omzet di kecamatan ini.',
        caption: caption(), legal: legal()
      };
    }

    function setFunding(model, match) { FUND.model = model || null; FUND.match = match || (model && model.match) || null; clearCache(); return !!FUND.model; }
    if (deps.fundingModel) setFunding(deps.fundingModel, deps.fundingMatch);

    /* ---------- V8 (docs/V8_SPEC.md §3.4, D49): the band of every listing, warmed in idle slices */

    /** bandFor(i) → 'b1'…'b5' | null: the band of listing i's estimate (equal to estimate(i).band), cached per data version. */
    function bandFor(i) {
      if (i == null || i === '' || typeof i === 'boolean') return null;
      i = +i;
      if (!isNum(i)) return null;
      fresh();
      if (has(C.band, i)) return C.band[i];
      var x = core(i), b = null;
      if (x && x.kind === 'estimate') { var bo = bandOf(Math.round(x.clipped / 1e5) * 1e5); b = bo ? bo.id : null; }   // the rounding of estimate()
      C.band[i] = b;
      return b;
    }
    /** isWarm() → true once warm() has estimated every listing of the current data (false again after a data change). */
    function isWarm() { fresh(); return C.warm === true; }
    function clock() {
      if (typeof deps.now === 'function') return deps.now();
      var p = root && root.performance;
      return p && typeof p.now === 'function' ? p.now() : Date.now();
    }
    function later(fn) {
      if (typeof deps.schedule === 'function') return deps.schedule(fn);
      if (root && typeof root.requestIdleCallback === 'function') return root.requestIdleCallback(fn, { timeout: 1000 });
      return setTimeout(fn, 0);
    }
    var WARM = null;     // the warm-up in progress: {promise, prog: [fn], slice, ms}
    /**
     * warm({sliceMs: 40, onProgress(done, total)}) → Promise<{n, ms}>: estimates every listing in idle slices of at most
     * sliceMs (≤ 45; each estimate ≤ 2 ms, so no task passes 50 ms). Resolves at once when warm; a second call while one
     * runs shares it; a data change (or clearCache, setFunding) during the run starts the pass over. ms: busy time.
     * V8 fix round: the cold work is split too: the list of listings in a task of its own, then the factor provider's
     * first build (D.prime: MCD.sme's crowd pass and candidate list) in slices, then the estimates.
     */
    function warm(o) {
      o = o || {};
      var slice = isNum(o.sliceMs) && o.sliceMs > 0 ? Math.min(o.sliceMs, 45) : 40;
      var prog = typeof o.onProgress === 'function' ? o.onProgress : null;
      if (isWarm()) {
        var n0 = (C.list || listings()).length;
        if (prog) safe(function () { prog(n0, n0); });
        return Promise.resolve({ n: n0, ms: 0 });
      }
      if (WARM) { if (prog) WARM.prog.push(prog); WARM.slice = Math.min(WARM.slice, slice); return WARM.promise; }
      var run = WARM = { prog: prog ? [prog] : [], slice: slice, ms: 0, promise: null };
      run.promise = new Promise(function (resolve) {
        var gen = -1, list = null, k = 0, primed = -1;
        function step() {
          var t0 = clock();
          var cur = listings();
          if (gen !== C.gen || list !== cur) {
            gen = C.gen; list = cur; k = 0;
            /* the list of listings was built in this task: the estimates start in the next one */
            if (primed !== gen) { run.ms += clock() - t0; later(step); return; }
          }
          var total = list.length;
          /* the factor provider's first build, in slices (each task stops at sliceMs) */
          if (primed !== gen) {
            var ready = safe(function () { return D.prime(run.slice, clock); }, true) !== false;
            if (ready) primed = gen;
            run.ms += clock() - t0;
            run.prog.forEach(function (p) { safe(function () { p(0, total); }); });
            later(step);
            return;
          }
          while (k < total) {
            bandFor(list[k].i);
            k++;
            if (clock() - t0 >= run.slice) break;
          }
          run.ms += clock() - t0;
          var done = k;
          run.prog.forEach(function (p) { safe(function () { p(done, total); }); });
          if (k < total || gen !== C.gen) { later(step); return; }
          C.warm = true;
          WARM = null;
          resolve({ n: total, ms: Math.round(run.ms) });
        }
        later(step);
      });
      return run.promise;
    }

    return {
      estimate: estimate, observed: observed, display: display, kecSummary: kecSummary, taxCheck: taxCheck, categoryOf: categoryOf,
      bandOf: bandOf, sizeOf: sizeOf, setFunding: setFunding, clearCache: clearCache,
      warm: warm, isWarm: isWarm, bandFor: bandFor,
      rp: rp, rpRange: rpRange, num: num, tierLine: tierLine,
      BANDS: BANDS, ADJ: ADJ, EDC_FROM: EDC_FROM, EDC_ALL_FROM: EDC_ALL_FROM, FIT_TEXT: FIT_TEXT, TIER_TEXT: TIER_TEXT,
      CAPTION: CAPTION, CAPTION_OBS: CAPTION_OBS, LEGAL: LEGAL, NONE_LABEL: NONE_LABEL, IDLE_LINE: IDLE_LINE, TIP: TIP,
      create: create
    };
  }

  /* the "?" tip, one idea per line (COPY_DECK_ID rule 1); amounts in the long form of sentences (COPY_DECK_ID §1) */
  var TIP = [
    'Perkiraan omzet per bulan dari jenis usaha dan data publik.',
    'Titik awal: angka survei atau sumber publik untuk jenis usaha itu.',
    'Jika sumbernya sangat lemah atau tidak ada, titik awal adalah rata-rata usaha mikro dan kecil.',
    'Lalu disesuaikan dengan nilai belanja, keramaian dan daya beli area.',
    'Pajak restoran kota hanya menjadi keterangan dan tidak mengubah perkiraan.',
    'Data pajak setiap usaha bersifat rahasia dan tidak digunakan.',
    'Transaksi ' + LVM + ' dan EDC dari file bank menggantikan perkiraan.',
    'EDC mulai ' + rp(EDC_FROM, LONG) + ' per bulan jika nilai belanja sedang atau besar.',
    'Mulai ' + rp(EDC_ALL_FROM, LONG) + ' per bulan, EDC cocok untuk semua jenis usaha.'
  ];

  return create();
});
