/* ==========================================================================
 * MCD.kprMath — the KPR engine (Property & KPR addendum §4, vectors §17.1)
 *
 * PURE: no DOM, no window reads, no globals. Configuration comes in as
 * arguments (cfg = MCD_KPR_CONFIG, retire = MCD.config.retire). UMD wrapper:
 * MCD.kprMath in the browser, module.exports in Node (tests/kpr-math.test.mjs).
 *
 * Conventions (§4.1)
 *   Money    IDR doubles, unrounded. Rounding only for display (dispRp,
 *            floor1000 for limits, roundRp for detail rows).
 *   Rates    % p.a. Monthly rate r/1200 ('nominal', default, D2) or
 *            (1 + r/100)^(1/12) − 1 ('effective', parity with §H.2 only).
 *   Tenor    whole years in the UI, n = years × 12 in the maths.
 *   Resets   re-amortised at every rate change (segment instalment =
 *            pmt(balance at segment start, rate, remaining months)).
 *   Percent  dpPct and stretchPct in % (10 = 10%); dsr as a fraction (0.40).
 *
 * API
 *   floor1000 · dispRp · roundRp · monthlyRate · pmt
 *   ratePath(scheme, n, {floatingPct, stressBps, floatingDefault})
 *   schedule(P, path, n, {months, convention}) · yearly(sched)
 *   unitInstallment(path, n, basis) · maxPrincipal(budget, path, n, basis)
 *   budget({income, jointIncome, dsr, existing})
 *   bupFor(rankGroup, o, cfg, retire) · retireTenor(o, cfg, retire)
 *   affordClass(price, maxPrice, stretchPct)
 *   schemeStatus(scheme, ctx) · fallbackTier(tier, cfg) · bestInTier(schemes, tier, T, opts)
 *   effectivePrice(list, o, cfg) · ppnDtpSaving(list, o, cfg) · bphtb(npop, region, o, cfg)
 *   costs(price, loan, scheme, o, cfg) · cashNeed(price, o, cfg) · maxPriceByCash(cash, cap, o, cfg)
 *   regionOf(kota) · resolveProject(p, inputs, cfg, env) · panel(inputs, cfg, env)
 *   flppOk(p, cfg) · fitsList(rows, maxPrice, {n, stretchPct})   (UX_FIX_PLAN C-04)
 *   Reasons and warnings are in Bahasa Indonesia (COPY_STYLE item 19).
 * ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.kprMath = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var RETIRE_DEFAULT = { tmtNextMonth: true, tamtamaBintara: 55, pamaPamen: 58, pati: [60, 61, 62, 63], pns: 58, transition: [], patiTransition: [] };
  // Tiers whose fallback is the tier of cfg.defaultSchemeId (Silver), §4.3
  var FALLBACK_TIERS = { 'Top Developer': 1, 'Subsidi': 1, 'Take Over': 1, 'Custom': 1, 'Planned': 1, 'Rencana': 1, 'Payroll Korporasi': 1, 'Promo': 1, 'Pegawai': 1 };

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function num(x, d) { return isNum(x) ? x : d; }

  /* ----------------------------------------------------------- rounding (§4.7) */

  /** Limits only (budget, max plafond, max price): a ceiling is never rounded up. */
  function floor1000(x) { return Math.floor(x / 1000) * 1000; }
  /** Headline instalments and totals: half-up to Rp 1,000. */
  function dispRp(x) { return Math.floor(x / 1000 + 0.5) * 1000; }
  /** Detail rows (costs, amortisation rows, CSV). */
  function roundRp(x) { return Math.round(x); }

  /* ------------------------------------------------------------- dates (UTC) */

  function ymd(iso) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(iso || ''));
    return m ? { y: +m[1], m: +m[2], d: m[3] ? +m[3] : 1 } : null;
  }
  function isoOf(y, m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
  /** Whole months from a to b (ISO dates); negative when b is before a. */
  function wholeMonths(aIso, bIso) {
    var a = ymd(aIso), b = ymd(bIso);
    if (!a || !b) return null;
    var n = (b.y - a.y) * 12 + (b.m - a.m);
    if (n > 0 && b.d < a.d) n -= 1;
    else if (n < 0 && b.d > a.d) n += 1;
    return n;
  }
  function dateLabel(iso) {
    var p = ymd(iso);
    return p ? p.d + ' ' + MON[p.m - 1] + ' ' + p.y : String(iso || '');
  }
  function rpShort(v) {
    if (!isNum(v)) return '—';
    var dec = function (x) { return String(x).replace('.', ','); };
    if (v >= 1e9) return 'Rp ' + dec(Math.round(v / 1e7) / 100) + ' M';
    if (v >= 1e6) return 'Rp ' + dec(Math.round(v / 1e5) / 10) + ' jt';
    return 'Rp ' + Math.round(v);
  }

  /* -------------------------------------------------------------- core (§4.2) */

  function monthlyRate(ratePct, convention) {
    return convention === 'effective' ? Math.pow(1 + ratePct / 100, 1 / 12) - 1 : ratePct / 1200;
  }

  /** Annuity instalment for principal P over n months. */
  function pmt(P, ratePct, n, convention) {
    if (!(n > 0)) return 0;
    var i = monthlyRate(ratePct, convention);
    if (i === 0) return P / n;
    return P * i / (1 - Math.pow(1 + i, -n));
  }

  /**
   * Rate path over n months: fixed steps (scheme.steps, else one fixed block), then the
   * floating rate (+ stress) for the rest. Stress touches only the floating segment.
   * → [{from, to, rate, kind: 'fixed' | 'float'}] (1-based, inclusive)
   */
  function ratePath(scheme, n, opts) {
    opts = opts || {};
    var steps = scheme && scheme.steps && scheme.steps.length ? scheme.steps : [{ rate: scheme ? scheme.fixedRate : 0, years: scheme ? scheme.fixedYears : 0 }];
    var out = [], m = 0;
    for (var s = 0; s < steps.length && m < n; s++) {
      var len = Math.min(Math.round(num(steps[s].years, 0) * 12), n - m);
      if (len <= 0) continue;
      out.push({ from: m + 1, to: m + len, rate: num(steps[s].rate, 0), kind: 'fixed' });
      m += len;
    }
    if (m < n) {
      var fl = isNum(opts.floatingPct) ? opts.floatingPct
        : (scheme && isNum(scheme.floatingRate) ? scheme.floatingRate : num(opts.floatingDefault, 13));
      out.push({ from: m + 1, to: n, rate: fl + num(opts.stressBps, 0) / 100, kind: 'float' });
    }
    return out;
  }

  /** True when no floating segment can occur within n months (stress has no effect). */
  function fixedForTenor(scheme, n) {
    return !ratePath(scheme, n, {}).some(function (s) { return s.kind === 'float'; });
  }

  /**
   * Amortisation schedule (§4.2). With {months:true} the monthly rows come back as
   * columnar Float64Arrays: months.inst, months.int, months.prin, months.bal.
   */
  function schedule(P, path, n, opts) {
    opts = opts || {};
    var conv = opts.convention, keep = !!opts.months;
    var B = P, totInt = 0, segs = [], maxA = 0, rows = null;
    if (keep) rows = { inst: new Float64Array(n), int: new Float64Array(n), prin: new Float64Array(n), bal: new Float64Array(n) };
    for (var s = 0; s < path.length; s++) {
      var seg = path[s];
      var A = pmt(B, seg.rate, n - seg.from + 1, conv);
      var i = monthlyRate(seg.rate, conv), b0 = B, sI = 0, sP = 0;
      for (var k = seg.from; k <= seg.to; k++) {
        var I = B * i, pr = A - I;
        if (k === n) pr = B;                       // final month clears float residue
        B -= pr; sI += I; sP += pr; totInt += I;
        if (keep) { rows.inst[k - 1] = pr + I; rows.int[k - 1] = I; rows.prin[k - 1] = pr; rows.bal[k - 1] = B; }
      }
      segs.push({ from: seg.from, to: seg.to, rate: seg.rate, kind: seg.kind, installment: A, balanceStart: b0, balanceEnd: B, interest: sI, principal: sP });
      if (A > maxA) maxA = A;
    }
    var first = segs.length ? segs[0].installment : 0;
    return {
      segments: segs, months: rows, n: n, principal: P,
      totalInterest: totInt, totalPaid: P + totInt,
      first: first, max: maxA, shockPct: first > 0 ? (maxA / first - 1) * 100 : 0, endBalance: B
    };
  }

  /** Yearly sums of a schedule built with {months:true}. */
  function yearly(sched) {
    var r = sched && sched.months, out = [];
    if (!r) return out;
    for (var y = 0; y * 12 < sched.n; y++) {
      var o = { year: y + 1, interest: 0, principal: 0, paid: 0, endBalance: 0 };
      for (var k = y * 12; k < Math.min(sched.n, y * 12 + 12); k++) {
        o.interest += r.int[k]; o.principal += r.prin[k]; o.paid += r.inst[k]; o.endBalance = r.bal[k];
      }
      out.push(o);
    }
    return out;
  }

  /** Instalment per rupiah of plafond; the schedule is linear in P. */
  function unitInstallment(path, n, basis, convention) {
    var s = schedule(1e9, path, n, { convention: convention });
    return (basis === 'first' ? s.first : s.max) / 1e9;
  }

  /** Largest plafond whose instalment (highest, or promo with basis 'first') fits the budget. */
  function maxPrincipal(budgetIdr, path, n, basis, convention) {
    if (!(budgetIdr > 0) || !(n > 0)) return 0;
    var u = unitInstallment(path, n, basis, convention);
    return u > 0 ? floor1000(budgetIdr / u) : 0;
  }

  /** Monthly budget for instalments: (income + joint) × DSR − other instalments, never below 0. */
  function budget(o) {
    o = o || {};
    return Math.max(0, (num(o.income, 0) + num(o.jointIncome, 0)) * num(o.dsr, 0) - num(o.existing, 0));
  }

  /* --------------------------------------------------------- tenor cap (§4.2) */

  function normGroup(g) {
    var s = String(g || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s === 'tamtama' || s === 'bintara') return s;
    if (s === 'perwira' || s === 'perwirasdkolonel' || s === 'pama' || s === 'pamen') return 'perwira';
    if (s.indexOf('pati') === 0) return 'pati';
    if (s === 'pns') return 'pns';
    if (s === 'professional' || s === 'selfemployed' || s === 'profesional' || s === 'wiraswasta') return 'professional';
    return 'employee';
  }

  /** Retirement age (BUP) or maximum age at maturity for a rank group, with the UU 3/2025 transition. */
  function bupFor(rankGroup, o, cfg, retire) {
    o = o || {};
    var R = retire || RETIRE_DEFAULT, g = normGroup(rankGroup);
    var maxAge = (cfg && cfg.tenor && cfg.tenor.maxAgeAtMaturity) || {};
    var stars = Math.min(4, Math.max(1, num(o.patiStars, 1)));
    var birth = o.birthYm ? String(o.birthYm).slice(0, 7) + '-01' : null;
    var bup, transition = false;
    switch (g) {
      case 'tamtama': case 'bintara':
        bup = num(R.tamtamaBintara, 55);
        if (birth) (R.transition || []).some(function (t) { if (birth <= t.bornOnOrBefore) { bup = t.bup; transition = true; return true; } return false; });
        break;
      case 'perwira': bup = num(R.pamaPamen, 58); break;
      case 'pati':
        bup = (R.pati || [60, 61, 62, 63])[stars - 1];
        if (birth) (R.patiTransition || []).some(function (t) {
          if (birth <= t.bornOnOrBefore && Array.isArray(t.bup) && isNum(t.bup[stars - 1])) { bup = t.bup[stars - 1]; transition = true; return true; }
          return false;
        });
        break;
      case 'pns': bup = num(R.pns, 58); break;
      case 'professional': bup = num(maxAge.professional, 60); break;
      default: bup = num(maxAge.employee, 55);
    }
    return { bup: bup, group: g, transition: transition };
  }

  /**
   * Tenor cap from retirement: {age | birthYm, rankGroup, patiStars, productKey, asOf}
   * → {years, bupAge, limitedBy: 'usia' | 'produk', months, retireDate, transitionHint}
   */
  function retireTenor(o, cfg, retire) {
    o = o || {};
    var R = retire || RETIRE_DEFAULT;
    var b = bupFor(o.rankGroup, o, cfg, R);
    var prodMax = num(cfg && cfg.tenor && cfg.tenor.maxYearsByProduct && cfg.tenor.maxYearsByProduct[o.productKey || 'rumahTapak'], 30);
    var raw, months = null, retireDate = null;
    if (o.birthYm && ymd(o.birthYm)) {
      var bd = ymd(o.birthYm);
      var y = bd.y + b.bup, m = bd.m + (R.tmtNextMonth === false ? 0 : 1);
      if (m > 12) { m -= 12; y += 1; }
      retireDate = isoOf(y, m, 1);
      months = Math.max(0, wholeMonths(o.asOf, retireDate) || 0);
      raw = Math.floor(months / 12);
    } else {
      raw = Math.floor(b.bup - num(o.age, b.bup));
    }
    var years = Math.max(0, Math.min(prodMax, raw));
    return {
      years: years, bupAge: b.bup, limitedBy: raw >= prodMax ? 'produk' : 'usia', months: months, retireDate: retireDate,
      transition: b.transition,
      transitionHint: !o.birthYm && (b.group === 'tamtama' || b.group === 'bintara') && num(o.age, 0) >= 52
    };
  }

  /* ---------------------------------------------------------- classes (§4.2) */

  /** 'A' affordable · 'S' stretch (≤ stretchPct above) · 'O' out of reach. 'NA' is set by callers. */
  function affordClass(price, maxPrice, stretchPct) {
    var s = isNum(stretchPct) ? stretchPct : 15;
    if (!(maxPrice > 0)) return 'O';
    if (price <= maxPrice) return 'A';
    if (price <= maxPrice * (100 + s) / 100) return 'S';
    return 'O';
  }

  /* --------------------------------------------------- schemes (§4.3) */

  function flppCap(c, cfg) {
    var inc = (cfg && cfg.flpp && cfg.flpp.incomeCap) || {};
    return c.married ? num(inc.marriedCombinedIdr, 14e6) : num(inc.singleIdr, 12e6);
  }
  function flppPriceCap(c, cfg) {
    var pc = (cfg && cfg.flpp && cfg.flpp.priceCaps) || {};
    if (!c.isApartment) return num(pc.tapakJabodetabek, 185e6);
    var per = pc.rusun2026PerUnit || {}, r = String(c.rusunArea || ''), best = null;
    Object.keys(per).forEach(function (k) { if (best == null && r && k.indexOf(r) >= 0) best = per[k]; });
    if (best == null) Object.keys(per).forEach(function (k) { best = best == null ? per[k] : Math.min(best, per[k]); });
    return num(best, 585e6);
  }
  /**
   * FLPP applies only when the unit type and its subsidised price are within the FLPP cap for that type
   * (UX_FIX_PLAN C-04): landed house Rp 185 jt (Jabodetabek); apartment per flpp.priceCaps.rusun2026PerUnit
   * for the project's area. A project without a subsidised price never carries FLPP.
   */
  function rusunAreaOf(kota) { return String(kota || '').replace(/^(kota|kab\.?|kabupaten)\s+/i, '').trim(); }
  function flppOk(p, cfg) {
    if (!p || !p.subsidiPrice || !p.subsidiPrice.length || !isNum(p.subsidiPrice[0])) return false;
    var apt = p.type === 'apartment';
    return p.subsidiPrice[0] <= flppPriceCap({ isApartment: apt, rusunArea: apt ? rusunAreaOf(p.kota) : null }, cfg);
  }
  /**
   * fitsList(rows, maxPrice, {n, stretchPct}) → {fit: bool, rows}: the nearest projects whose simulated price is at
   * or below the headline maximum price (rows are {p, r, cls}, already nearest first). When none fits: the
   * nearest within stretchPct above it ("hampir sesuai"), fit = false. Never a project above the shown maximum.
   */
  function fitsList(rows, maxPrice, o) {
    o = o || {};
    var n = isNum(o.n) ? o.n : 3, s = isNum(o.stretchPct) ? o.stretchPct : 15;
    if (!(maxPrice > 0)) return { fit: false, rows: [] };
    var priceOf = function (x) { return x && x.r && isNum(x.r.price) ? x.r.price : (x && x.p ? x.p.priceMin : null); };
    var fit = (rows || []).filter(function (x) { var v = priceOf(x); return isNum(v) && v <= maxPrice && x.cls !== 'NA'; });
    if (fit.length) return { fit: true, rows: fit.slice(0, n) };
    var near = (rows || []).filter(function (x) { var v = priceOf(x); return isNum(v) && v > maxPrice && v <= maxPrice * (100 + s) / 100; });
    return { fit: false, rows: near.slice(0, n) };
  }
  function isTopDevProject(p, groups) {
    return !!(p && p.developerGroup && (groups || []).indexOf(p.developerGroup) >= 0);
  }

  /**
   * schemeStatus(scheme, ctx) → {ok, code, reason, warn?}. First failure wins.
   * ctx: {asOf, T, mode: 'panel' | 'project' | 'calc', project, topDevGroups, income, jointIncome,
   *       married, price, isApartment, rusunArea, showPlanned, signingYm, cfg}
   */
  function schemeStatus(scheme, c) {
    c = c || {};
    var cfg = c.cfg || {};
    if (!scheme) return { ok: false, code: 'none', reason: 'Belum ada skema yang dipilih' };
    if (scheme.expired || (scheme.validUntil && c.asOf && scheme.validUntil < String(c.asOf).slice(0, 10))) {
      return { ok: false, code: 'expired', reason: 'Berakhir ' + dateLabel(scheme.validUntil) };
    }
    if (scheme.referenceOnly) return { ok: false, code: 'reference', reason: 'Hanya acuan, tidak tersedia untuk TNI' };
    if (isNum(c.T) && isNum(scheme.minTenorYears) && scheme.minTenorYears > c.T) {
      return { ok: false, code: 'minTenor', reason: 'Perlu tenor paling singkat ' + scheme.minTenorYears + ' tahun' };
    }
    if (isNum(c.T) && isNum(scheme.maxTenorYears) && scheme.maxTenorYears < c.T) {
      return { ok: false, code: 'maxTenor', reason: 'Tenor paling lama skema ini ' + scheme.maxTenorYears + ' tahun' };
    }
    if (scheme.tier === 'Top Developer' && c.mode === 'project' && !isTopDevProject(c.project, c.topDevGroups)) {
      return { ok: false, code: 'topdev', reason: 'Hanya untuk proyek mitra Top Developer' };
    }
    var inc = num(c.income, 0) + num(c.jointIncome, 0);
    if (scheme.tier === 'Subsidi') {
      if (inc > flppCap(c, cfg)) return { ok: false, code: 'flppIncome', reason: 'Penghasilan di atas batas FLPP ' + rpShort(flppCap(c, cfg)) };
      if (c.mode === 'project' && !flppOk(c.project, cfg)) return { ok: false, code: 'flppPrice', reason: 'Harga di atas batas FLPP' };
      if (c.mode === 'calc' && isNum(c.price) && c.price > flppPriceCap(c, cfg)) return { ok: false, code: 'flppPrice', reason: 'Harga di atas batas FLPP' };
    }
    if (scheme.tier === 'Planned' || scheme.tier === 'Rencana') {
      if (!c.showPlanned || (isNum(scheme.incomeCapIdr) && inc > scheme.incomeCapIdr) || (isNum(c.price) && isNum(scheme.maxPriceIdr) && c.price > scheme.maxPriceIdr)) {
        return { ok: false, code: 'planned', reason: 'Skema rencana, belum berlaku' };
      }
    }
    if (c.signingYm && scheme.validUntil && String(c.signingYm).slice(0, 7) > String(scheme.validUntil).slice(0, 7)) {
      var sy = ymd(c.signingYm);
      return { ok: true, code: 'signing', warn: 'Akad pada ' + (sy ? MON[sy.m - 1] + ' ' + sy.y : c.signingYm) + ' melewati batas pencairan ' + dateLabel(scheme.validUntil) };
    }
    return { ok: true, code: 'ok', reason: '' };
  }

  function fallbackTier(tier, cfg) {
    if (!FALLBACK_TIERS[tier]) return tier;
    var id = cfg && cfg.defaultSchemeId, list = (cfg && cfg.rateSchemes) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].tier;
    return 'Silver';
  }

  /**
   * Lowest-instalment eligible scheme of a tier for tenor T.
   * opts: {schemes?, basis, floatingPct, stressBps, floatingDefault, status: ctx for schemeStatus}
   */
  function bestInTier(schemes, tier, T, opts) {
    opts = opts || {};
    var n = Math.round(T * 12), cand = [];
    (schemes || []).forEach(function (s) {
      if (s.tier !== tier || s.referenceOnly) return;
      var st = schemeStatus(s, Object.assign({}, opts.status || {}, { T: T }));
      if (!st.ok) return;
      cand.push({ s: s, u: unitInstallment(ratePath(s, n, opts), n, opts.basis) });
    });
    cand.sort(function (a, b) {
      return (a.u - b.u) || (num(a.s.fixedRate, 0) - num(b.s.fixedRate, 0)) || (a.s.id < b.s.id ? -1 : (a.s.id > b.s.id ? 1 : 0));
    });
    return cand.length ? cand[0].s : null;
  }

  /* ------------------------------------------------- taxes and costs (§4.5) */

  function ppnCfg(cfg) {
    var p = (cfg && cfg.ppnDtp) || {};
    return { r: num(p.effectivePpnPct, 11) / 100, cap: num(p.priceCap, 5e9), dtpCap: num(p.dtpPortionCap, 2e9) };
  }

  /** Possible PPN DTP saving on a list price (information in 'unknown' mode). */
  function ppnDtpSaving(listPrice, o, cfg) {
    o = o || {};
    var P = ppnCfg(cfg);
    if (!o.dtpEligible || o.isSubsidi) return 0;
    if (o.ppnMode === 'included') {
      var dpp = listPrice / (1 + P.r);
      return dpp <= P.cap ? P.r * Math.min(dpp, P.dtpCap) : 0;
    }
    return listPrice <= P.cap ? P.r * Math.min(listPrice, P.dtpCap) : 0;
  }

  /** Price the buyer pays after PPN and any PPN DTP relief (list price in 'unknown' mode). */
  function effectivePrice(listPrice, o, cfg) {
    o = o || {};
    if (o.isSubsidi) return listPrice;                 // FLPP is exempt from PPN
    var P = ppnCfg(cfg), mode = o.ppnMode || 'unknown';
    if (mode === 'excluded') return listPrice + P.r * listPrice - ppnDtpSaving(listPrice, { dtpEligible: o.dtpEligible, ppnMode: 'excluded' }, cfg);
    if (mode === 'included') return listPrice - ppnDtpSaving(listPrice, { dtpEligible: o.dtpEligible, ppnMode: 'included' }, cfg);
    return listPrice;
  }

  /** BPHTB with NPOPTKP by region and the DKI first-home relief (Kepgub 840/2025 & 450/2026). */
  function bphtb(npop, region, o, cfg) {
    o = o || {};
    if (o.mbr) return 0;
    var B = (cfg && cfg.bphtb) || {}, first = o.firstAcquisition !== false;
    var table = B.npoptkpByRegion || {};
    var nptkp = first ? num(table[region], 80e6) : 0;
    var tax = Math.max(0, npop - nptkp) * num(B.ratePct, 5) / 100;
    if (region === 'DKI Jakarta' && first && o.ktpDki) {
      var R = B.dkiFirstHouseRelief || {}, hb = R.hakBaruTapakAtauTanah || {}, jb = R.jualBeliTapakAtauRusun || {};
      if (o.hakBaru && npop <= num(hb.maxNpop, 1e9)) tax *= 1 - num(hb.reductionPct, 75) / 100;
      else if (npop <= num(jb.maxNpop, 5e8)) tax *= 1 - num(jb.reductionPct, 50) / 100;
    }
    return Math.round(tax);
  }
  /** Relief share applied by bphtb() for the same inputs: 0, 50 or 75 (%). */
  function bphtbReliefPct(npop, region, o, cfg) {
    o = o || {};
    if (o.mbr || region !== 'DKI Jakarta' || o.firstAcquisition === false || !o.ktpDki) return 0;
    var R = ((cfg && cfg.bphtb) || {}).dkiFirstHouseRelief || {}, hb = R.hakBaruTapakAtauTanah || {}, jb = R.jualBeliTapakAtauRusun || {};
    if (o.hakBaru && npop <= num(hb.maxNpop, 1e9)) return num(hb.reductionPct, 75);
    if (npop <= num(jb.maxNpop, 5e8)) return num(jb.reductionPct, 50);
    return 0;
  }

  var COST_KEYS = ['dp', 'provisi', 'admin', 'layanan', 'appraisal', 'notarisKpr', 'ppatAjb', 'asuransiJiwa', 'asuransiKebakaran', 'bphtb'];

  /**
   * Upfront costs (§4.5). `price` is the EFFECTIVE price, so PPN is already inside the
   * down payment and the loan; the PPN effect is reported, never added twice.
   * o: {region, firstAcquisition, ktpDki, hakBaru, devCoversAjb, isFlpp, buildingValue,
   *     listPrice, ppnMode, dtpEligible, isSubsidi}
   * → {dp, provisi, …, bphtb, total, ppn, ppnDtpInfo, bphtbReliefPct}
   */
  function costs(price, loan, scheme, o, cfg) {
    o = o || {};
    var F = (cfg && cfg.fees) || {}, sf = (scheme && scheme.fees) || {}, N = F.notarisPctOrIdr || {};
    var provisiPct = isNum(sf.provisiPct) ? sf.provisiPct : num(F.provisiPct, 1);
    var out = {
      dp: price - loan,
      provisi: Math.max(loan * provisiPct / 100, num(sf.provisiMinIdr, 0)),
      admin: isNum(sf.adminIdr) ? sf.adminIdr : num(F.adminIdr, 500000),
      layanan: loan * (isNum(sf.biayaLayananPct) ? sf.biayaLayananPct : num(F.biayaLayananPct, 0)) / 100,
      appraisal: o.isFlpp ? 0 : num(F.appraisalIdr, 1000000),
      notarisKpr: loan * num(N.kprNotarisPctOfLoan, 0.75) / 100,
      ppatAjb: o.devCoversAjb ? 0 : price * num(N.ppatAjbPctOfPrice, 0.75) / 100,
      asuransiJiwa: loan * num(F.insuranceLifeSinglePremiumPctOfLoan, 1.5) / 100,
      asuransiKebakaran: (isNum(o.buildingValue) ? o.buildingValue : price * 0.6) * num(F.insuranceFirePctPerYear, 0.05) / 100,
      bphtb: bphtb(price, o.region, Object.assign({}, o, { mbr: !!o.isFlpp }), cfg)
    };
    var total = 0;
    COST_KEYS.forEach(function (k) { total += out[k]; });
    out.total = total;
    var list = isNum(o.listPrice) ? o.listPrice : price;
    out.ppn = price - list;
    out.ppnDtpInfo = (o.ppnMode || 'unknown') === 'unknown' && !o.isSubsidi ? ppnDtpSaving(list, { dtpEligible: o.dtpEligible, ppnMode: 'unknown' }, cfg) : 0;
    out.bphtbReliefPct = o.isFlpp ? 0 : bphtbReliefPct(price, o.region, o, cfg);
    return out;
  }

  /** Cash needed to buy at price p with DP o.dpPct and the scheme's fees (§4.4 step 6). */
  function cashNeed(p, o, cfg) {
    o = o || {};
    var loan = p * (1 - num(o.dpPct, 10) / 100);
    return costs(p, loan, o.scheme, o, cfg).total;
  }

  /** Largest multiple of Rp 1,000 ≤ cap whose cash need fits `cash` (integer bisection, §4.4). */
  function maxPriceByCash(cash, cap, o, cfg) {
    var hi = Math.floor(cap / 1000), lo = 0;
    if (hi <= 0) return 0;
    if (cashNeed(1000 * hi, o, cfg) <= cash) return 1000 * hi;
    if (cashNeed(0, o, cfg) > cash) return 0;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (cashNeed(1000 * mid, o, cfg) <= cash) lo = mid; else hi = mid;
    }
    return 1000 * lo;
  }

  /* ------------------------------------------------ region mapping (§4.6) */

  var REGION_MAP = {
    'jakarta timur': 'DKI Jakarta', 'jakarta selatan': 'DKI Jakarta', 'jakarta pusat': 'DKI Jakarta', 'jakarta utara': 'DKI Jakarta', 'jakarta barat': 'DKI Jakarta',
    'kota depok': 'Kota Depok', 'kota bekasi': 'Kota Bekasi', 'kota bogor': 'Kota Bogor', 'kota tangerang selatan': 'Kota Tangerang Selatan', 'kota tangerang': 'Kota Tangerang',
    'kab. bekasi': 'Kab. Bekasi', 'kabupaten bekasi': 'Kab. Bekasi', 'kab. bogor': 'Kab. Bogor', 'kabupaten bogor': 'Kab. Bogor'
  };
  /** Project `kota` → BPHTB region. Unknown values keep NPOPTKP Rp 80 mn and carry known:false. */
  function regionOf(kota) {
    var k = String(kota || '').trim().toLowerCase();
    return REGION_MAP[k] ? { region: REGION_MAP[k], known: true } : { region: String(kota || ''), known: false };
  }

  /* ------------------------------------------------ resolution (§4.3, §4.4) */

  function cacheGet(env, key, fn) {
    if (!env || !env.cache) return fn();
    if (!(key in env.cache)) env.cache[key] = fn();
    return env.cache[key];
  }
  function maxPlafondFor(scheme, T, inp, budgetIdr, env) {
    var key = 'mp|' + scheme.id + '|' + T + '|' + inp.basis + '|' + inp.floatingPct + '|' + inp.stressBps + '|' + budgetIdr;
    return cacheGet(env, key, function () {
      return maxPrincipal(budgetIdr, ratePath(scheme, T * 12, inp), T * 12, inp.basis);
    });
  }
  function flppIncomeOk(inp, cfg) {
    return num(inp.income, 0) + num(inp.jointIncome, 0) <= flppCap({ married: inp.married }, cfg);
  }

  /**
   * One project under the current inputs (§4.3 per-project resolution).
   * inputs: {income, jointIncome, dsr, existing, tenorYears (already age-capped), dpPct, scheme,
   *          floatingPct, stressBps, basis, useFlpp, firstHome, married, flppTenorCap, cashOn, cash,
   *          ppnMode, showPlanned}
   * env: {asOf, schemes, schemeById, topDevGroups, cache, regionOf}
   */
  function resolveProject(p, inp, cfg, env) {
    env = env || {};
    var T_user = inp.tenorYears, byId = env.schemeById || {}, how = 'panel', scheme, T, listPrice, dp, isSubsidi, isFlpp = false;
    var apt = p.type === 'apartment';
    var maxApt = num(cfg && cfg.tenor && cfg.tenor.maxYearsByProduct && cfg.tenor.maxYearsByProduct.apartemenRukoRukan, 15);
    var useFlpp = inp.useFlpp && inp.firstHome !== false && flppOk(p, cfg) && flppIncomeOk(inp, cfg);
    if (useFlpp) {
      var fs = byId[apt ? 'flpp-rusun' : 'flpp-tapak'];
      if (!fs || schemeStatus(fs, { asOf: env.asOf }).code === 'expired') useFlpp = false;
      else scheme = fs;
    }
    if (useFlpp) {
      isFlpp = true; how = 'flpp';
      T = Math.min(T_user, num(inp.flppTenorCap, 20));
      listPrice = p.subsidiPrice[0];
      dp = Math.max(num(inp.dpPct, 10), num(cfg && cfg.flpp && cfg.flpp.dpMinPct, 1));
      isSubsidi = true;
    } else {
      T = apt ? Math.min(T_user, maxApt) : T_user;
      scheme = inp.scheme;
      var stx = { asOf: env.asOf, T: T, mode: 'project', project: p, topDevGroups: env.topDevGroups, income: inp.income, jointIncome: inp.jointIncome,
        married: inp.married, showPlanned: inp.showPlanned, cfg: cfg };
      if (!scheme || !schemeStatus(scheme, stx).ok) {
        var tier = fallbackTier(scheme ? scheme.tier : 'Silver', cfg);
        scheme = cacheGet(env, 'bt|' + tier + '|' + T + '|' + inp.basis + '|' + inp.floatingPct + '|' + inp.stressBps, function () {
          return bestInTier(env.schemes || (cfg && cfg.rateSchemes) || [], tier, T, {
            basis: inp.basis, floatingPct: inp.floatingPct, stressBps: inp.stressBps,
            status: { asOf: env.asOf, mode: 'panel', income: inp.income, jointIncome: inp.jointIncome, married: inp.married, cfg: cfg }
          });
        });
        how = 'auto';
      }
      if (!scheme) return { id: p.id, cls: 'NA', why: 'Tidak ada skema aktif untuk tenor ' + T + ' tahun', T: T, how: 'none' };
      listPrice = p.priceMin;
      dp = num(inp.dpPct, 10);
      isSubsidi = p.segment === 'subsidi';
    }
    if (!isNum(listPrice) || !(T > 0)) return { id: p.id, cls: 'NA', why: !(T > 0) ? 'Tidak ada tenor yang tersedia' : 'Harga belum dipublikasikan', T: T, how: how, scheme: scheme };
    var price = effectivePrice(listPrice, { ppnMode: inp.ppnMode || 'unknown', isSubsidi: isSubsidi }, cfg);
    var B = budget(inp);
    var maxPlafond = maxPlafondFor(scheme, T, inp, B, env);
    var maxPrice = dp >= 100 ? 0 : floor1000(maxPlafond / (1 - dp / 100));
    var binding = 'DSR';
    if (inp.cashOn && isNum(inp.cash)) {
      var reg = (env.regionOf || regionOf)(p.kota).region;
      var mc = cacheGet(env, 'cash|' + reg + '|' + scheme.id + '|' + dp + '|' + maxPrice + '|' + inp.cash + '|' + isFlpp, function () {
        return maxPriceByCash(inp.cash, maxPrice, { dpPct: dp, scheme: scheme, region: reg, isFlpp: isFlpp, firstAcquisition: true, ktpDki: !!inp.ktpDki }, cfg);
      });
      if (mc < maxPrice) { maxPrice = mc; binding = 'cash'; }
    }
    var path = ratePath(scheme, T * 12, inp);
    var s = schedule(price * (1 - dp / 100), path, T * 12);
    return {
      id: p.id, scheme: scheme, how: how, T: T, listPrice: listPrice, price: price, dp: dp, loan: price * (1 - dp / 100),
      segments: s.segments, first: s.first, max: s.max, maxPlafond: maxPlafond, maxPrice: maxPrice, binding: binding,
      gap: maxPrice - price, isFlpp: isFlpp, isSubsidi: isSubsidi, cls: affordClass(price, maxPrice, 15)
    };
  }

  /**
   * The affordability panel (§4.4): tenor cap, panel scheme with auto-switch, budget, limits.
   * inputs as resolveProject plus {age, birthYm, rankGroup, patiStars, tenorTouched, schemeId,
   *   schemeIdWanted, cashRegion, ktpDki}; env adds {retire}.
   * → {cap, T, scheme, switched, budget, maxPlafond, maxPriceByLoan, maxPrice, binding, sched, …}
   */
  function panel(inp, cfg, env) {
    env = env || {};
    var cap = retireTenor({ age: inp.age, birthYm: inp.birthYm, rankGroup: inp.rankGroup, patiStars: inp.patiStars, asOf: env.asOf }, cfg, env.retire);
    var lo = Math.min(5, cap.years);
    var T = inp.tenorTouched && isNum(inp.tenorYears) ? Math.max(lo, Math.min(cap.years, Math.round(inp.tenorYears))) : cap.years;
    var out = { cap: cap, T: T, tenorMin: lo, scheme: null, switched: null, budget: budget(inp), state: 'ok' };
    if (!(cap.years >= 1)) { out.state = 'retired'; return out; }
    var byId = env.schemeById || {};
    var wanted = byId[inp.schemeIdWanted || inp.schemeId] || byId[cfg && cfg.defaultSchemeId];
    var stx = { asOf: env.asOf, T: T, mode: 'panel', income: inp.income, jointIncome: inp.jointIncome, married: inp.married, showPlanned: inp.showPlanned, cfg: cfg };
    var st = schemeStatus(wanted, stx), scheme = wanted;
    if (!st.ok) {
      scheme = bestInTier(env.schemes || (cfg && cfg.rateSchemes) || [], fallbackTier(wanted ? wanted.tier : 'Silver', cfg), T, {
        basis: inp.basis, floatingPct: inp.floatingPct, stressBps: inp.stressBps, status: stx
      });
      out.switched = scheme ? { from: wanted, to: scheme, reason: st.reason, code: st.code } : null;
    }
    out.scheme = scheme;
    if (!scheme) { out.state = 'noScheme'; return out; }
    if (!(num(inp.income, 0) + num(inp.jointIncome, 0) > 0)) { out.state = 'noIncome'; return out; }
    if (!(out.budget > 0)) { out.state = 'noBudget'; out.maxPlafond = 0; out.maxPrice = 0; out.maxPriceByLoan = 0; return out; }
    var n = T * 12, path = ratePath(scheme, n, inp);
    out.path = path;
    out.maxPlafond = maxPrincipal(out.budget, path, n, inp.basis);
    var dp = num(inp.dpPct, 10);
    if (dp >= 100) { out.state = 'fullDp'; out.maxPriceByLoan = 0; out.maxPrice = 0; return out; }
    out.maxPriceByLoan = floor1000(out.maxPlafond / (1 - dp / 100));
    out.maxPrice = out.maxPriceByLoan;
    out.binding = 'DSR';
    if (inp.cashOn && isNum(inp.cash)) {
      var reg = inp.cashRegion || 'Kota Bekasi';
      out.maxPriceByCash = maxPriceByCash(inp.cash, out.maxPriceByLoan, { dpPct: dp, scheme: scheme, region: reg, firstAcquisition: true, ktpDki: !!inp.ktpDki }, cfg);
      if (out.maxPriceByCash < out.maxPriceByLoan) { out.maxPrice = out.maxPriceByCash; out.binding = 'cash'; }
    }
    out.sched = schedule(out.maxPlafond, path, n);
    out.fixedForTenor = fixedForTenor(scheme, n);
    return out;
  }

  return {
    stub: false, ready: true, version: '1.0.0',
    floor1000: floor1000, dispRp: dispRp, roundRp: roundRp, wholeMonths: wholeMonths,
    monthlyRate: monthlyRate, pmt: pmt, ratePath: ratePath, fixedForTenor: fixedForTenor, schedule: schedule, yearly: yearly,
    unitInstallment: unitInstallment, maxPrincipal: maxPrincipal, budget: budget,
    bupFor: bupFor, retireTenor: retireTenor, affordClass: affordClass,
    schemeStatus: schemeStatus, fallbackTier: fallbackTier, bestInTier: bestInTier, isTopDevProject: isTopDevProject,
    flppPriceCap: function (o, cfg) { return flppPriceCap(o || {}, cfg); }, flppIncomeCap: function (married, cfg) { return flppCap({ married: married }, cfg); },
    effectivePrice: effectivePrice, ppnDtpSaving: ppnDtpSaving, bphtb: bphtb, bphtbReliefPct: bphtbReliefPct,
    costs: costs, costKeys: COST_KEYS.slice(), cashNeed: cashNeed, maxPriceByCash: maxPriceByCash,
    regionOf: regionOf, resolveProject: resolveProject, panel: panel, flppOk: flppOk, fitsList: fitsList
  };
});
