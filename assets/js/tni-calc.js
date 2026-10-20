/* ==========================================================================
 * MCD.tniCalc: "Kalkulator KSM & KKB" (v7, docs/V7_SPEC.md §4, D8, D9, D18, D19, D22, D23, D28, D30, D35, D38).
 *
 * One full sheet over the stage, like the KPR calculator: MCD.windows.suspend(true) while open, a KSM | KKB switch over
 * one member profile, "Tutup" (Esc). The numbers come from MCD.loanCap (assets/js/loan-capacity.js) and the official pay
 * table (data/tni-pay.js, loaded on the first open through MCD.tni.loadPay); the bank's numbers come from MCD.policy
 * (forLoanCap, incomeBase, minSisa, filledDate). This file holds NO policy number: without the branch's numbers the
 * result block names what is missing and who fills it (D38), and the take-home estimate still shows.
 *
 * Privacy (D9): customer inputs live in MCD.tni.calc (memory) only, every input is autocomplete="off" and
 * spellcheck="false" with no name, there is no <form>, the sheet is translate="no", and printing shows one line (D28).
 * Inputs go on Tutup, Esc, lock (also the idle lock) and "Mulai nasabah baru"; the "Buka Kebijakan & leads" round trip
 * keeps them for at most 10 minutes (§4.5).
 *
 *   compute(state, env?) → {route, income, age, ksm, kkb, errors}   pure; env = {loanCap, policy, kprMath, retire, pay}
 *   parseRp(s) · parseInt(s) · parsePct(s) → number | null (blank) | NaN (unreadable)
 *   policySnapshot() · missingText(keys) · policyLine(kind, snap)   the bank's numbers as the screen names them
 *   open({tab, matra, host, crumb, resume, onClose, onDealers, onPolicy}) · close(reason) · isOpen() · resume(o) · refresh()
 * ========================================================================== */
(function (root) {
  'use strict';
  var MCD = root.MCD = root.MCD || {};
  if (MCD.tniCalc && MCD.tniCalc.VERSION) return;
  var C = MCD.tniCalc = { VERSION: 1 };

  var KSM_KEYS = ['ksm.capPct', 'ksm.ratePa', 'ksm.tenorMonths', 'ksm.method', 'tni.incomeBase'];
  var KKB_KEYS = ['kkb.capPct', 'kkb.ratePa', 'kkb.tenorMonths', 'kkb.method', 'kkb.dpPct', 'tni.incomeBase'];
  var KEY_WORDS = { capPct: 'batas angsuran', ratePa: 'suku bunga', tenorMonths: 'tenor maksimal', method: 'cara hitung angsuran', dpPct: 'uang muka minimal', incomeBase: 'penghasilan yang dihitung' };
  var EXCLUDE = { 'semua': [], 'tanpa-lauk-pauk': ['uangLaukPauk'], 'tanpa-lauk-pauk-tukin': ['uangLaukPauk', 'tunjanganKinerja'] };
  var BASE_WORDS = { 'tanpa-lauk-pauk': 'tanpa uang lauk pauk', 'tanpa-lauk-pauk-tukin': 'tanpa uang lauk pauk dan tunjangan kinerja' };
  var T = {
    title: 'Kalkulator KSM & KKB',
    routeA: 'Perkiraan dari pangkat', routeB: 'Dari slip gaji',
    notSaved: 'Angka nasabah tidak disimpan.', fresh: 'Mulai nasabah baru',
    needAge: 'Isi usia untuk menghitung plafond.',
    d23a: 'Hasil ini perkiraan untuk bahan percakapan dan tidak mengikat bank.',
    d23b: 'Persetujuan kredit tetap melalui slip gaji, SLIK dan proses kredit resmi.',
    owner: 'Pemilik dashboard mengisinya di Data & Privasi › Kebijakan & leads.',
    noDefault: 'Dashboard tidak memiliki angka kebijakan bawaan.',
    openPolicy: 'Buka Kebijakan & leads',
    print: 'Halaman ini memuat data bank dan tidak dicetak dari dashboard.',
    payLoading: 'Memuat tabel gaji…', payFailed: 'Tabel gaji tidak dapat dimuat. Coba lagi.', retry: 'Coba lagi',
    paySource: 'Tabel gaji dari peraturan resmi, diperiksa 18 Okt 2026.',
    sameRoom: 'Ruang angsuran sama dengan KSM. Jika KSM juga diambil, angsurannya mengurangi ruang ini.',
    rpInvalid: 'Isi angka lengkap dalam rupiah.', intInvalid: 'Isi angka bulat.', pctInvalid: 'Isi dalam persen.'
  };
  var HELP = {
    gaji: 'Gaji kotor dikurangi iuran ASABRI dan BPJS.',
    slip: 'Angka dari slip gaji, sebelum cicilan.',
    ruang: 'Angsuran baru paling besar dalam batas bank.',
    plafond: 'Pinjaman yang angsurannya muat dalam ruang angsuran.',
    angsuran: 'Pokok dan bunga setiap bulan selama tenor.',
    sisa: 'Penghasilan setelah semua potongan dan angsuran.',
    dp: 'Dibayar nasabah dari harga kendaraan.',
    akad: 'Uang muka ditambah biaya yang diisi cabang.'
  };

  /* ------------------------------------------------------------ helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function blank(v) { return v === undefined || v === null || v === ''; }
  function TNI() { return MCD.tni || null; }
  function LC() { return MCD.loanCap || null; }
  function floor1000(x) { return Math.floor(x / 1000) * 1000; }
  function dispRp(x) { return Math.floor(x / 1000 + 0.5) * 1000; }
  function group(n) { return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  /** 'Rp 7.083.000' on result rows; 'Rp7.083.000' in sentences (COPY_DECK §1). */
  function rpRow(x) { return isNum(x) ? (x < 0 ? '−' : '') + 'Rp ' + group(x) : '—'; }
  function rpSay(x) { return isNum(x) ? (x < 0 ? '−' : '') + 'Rp' + group(x) : '—'; }
  function rpShort(x) { var F = MCD.util && MCD.util.fmt; return isNum(x) && F && isFn(F.rp) ? F.rp(x) : rpRow(x); }
  function pctNum(p) { return isNum(p) ? String(Math.round(p * 100) / 100).replace('.', ',') + '%' : '—'; }
  function dateWords(iso) { var F = MCD.util && MCD.util.fmt; if (!iso) return ''; try { return F && isFn(F.date) ? F.date(String(iso).slice(0, 10)) : String(iso).slice(0, 10); } catch (e) { return String(iso).slice(0, 10); } }

  /** parseRp('1.500.000') → 1500000 · '' → null · 'Rp 2 jt' → NaN (short forms are refused, §1.7.1). */
  function parseRp(s) {
    if (blank(s)) return null;
    if (isNum(s)) return s >= 0 ? s : NaN;
    var t = String(s).trim().replace(/^rp\.?/i, '').replace(/\s+/g, '');
    if (!t) return null;
    if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return NaN;
    var v = Number(t.replace(/\./g, '').replace(',', '.'));
    return isNum(v) && v >= 0 ? v : NaN;
  }
  function parseIntF(s) {
    if (blank(s)) return null;
    if (isNum(s)) return Math.floor(s) === s && s >= 0 ? s : NaN;
    var t = String(s).trim();
    if (!t) return null;
    return /^\d{1,3}$/.test(t) ? parseInt(t, 10) : NaN;
  }
  function parsePct(s) {
    if (blank(s)) return null;
    if (isNum(s)) return s;
    var t = String(s).trim().replace(/%$/, '').trim();
    if (!t) return null;
    if (!/^\d{1,3}(,\d{1,4})?$/.test(t)) return NaN;
    return Number(t.replace(',', '.'));
  }
  C.parseRp = parseRp; C.parseInt = parseIntF; C.parsePct = parsePct;
  C.rpRow = rpRow; C.rpSay = rpSay;

  /* ============================================================ the bank's numbers (MCD.policy, §1.7.1) */

  function words(key) {
    var p = String(key).split('.'), w = KEY_WORDS[p[1]] || p[1];
    return p[0] === 'tni' ? w : w + ' ' + p[0].toUpperCase();
  }
  /** "batas angsuran KSM, suku bunga KSM, penghasilan yang dihitung" */
  function missingText(keys) { return (keys || []).map(words).join(', '); }
  C.missingText = missingText;
  /**
   * policySnapshot() → {ksm: {ok, values, empty, invalid}, kkb: {…}, base, minSisa, filled(keys)}. A key is "empty" when the
   * branch has not filled it, "invalid" when MCD.policy holds it but reports it as not usable. No value is made up here.
   */
  function policySnapshot() {
    var P = MCD.policy;
    function part(kind, keys) {
      if (!P) return { ok: false, values: null, empty: keys.slice(), invalid: [] };
      var miss = [];
      try { miss = isFn(P.missing) ? P.missing(keys) || [] : keys.slice(); } catch (e) { miss = keys.slice(); }
      var lc = null;
      try { lc = isFn(P.forLoanCap) ? P.forLoanCap(kind) : null; } catch (e) { lc = null; }
      if (lc && Array.isArray(lc.missing)) lc.missing.forEach(function (k) { if (miss.indexOf(k) < 0) miss.push(k); });
      var empty = [], invalid = [];
      miss.forEach(function (k) { var v = null; try { v = P.get(k); } catch (e) { v = null; } if (v === null || v === undefined || v === '') empty.push(k); else invalid.push(k); });
      var ok = !miss.length && !!lc && !lc.missing;
      return { ok: ok, values: ok ? lc : null, empty: empty, invalid: invalid };
    }
    var base = null, minSisa = null;
    if (P) {
      try { base = isFn(P.incomeBase) ? P.incomeBase() : null; } catch (e) { base = null; }
      try { minSisa = isFn(P.minSisa) ? P.minSisa() : null; } catch (e) { minSisa = null; }
    }
    return {
      available: !!P, ksm: part('ksm', KSM_KEYS), kkb: part('kkb', KKB_KEYS),
      base: EXCLUDE.hasOwnProperty(base) ? base : null, minSisa: isNum(minSisa) && minSisa > 0 ? minSisa : null,
      filled: function (keys) { try { return P && isFn(P.filledDate) ? P.filledDate(keys) : null; } catch (e) { return null; } }
    };
  }
  C.policySnapshot = policySnapshot;
  C.KSM_KEYS = KSM_KEYS.slice(); C.KKB_KEYS = KKB_KEYS.slice();
  /** "Batas angsuran 33% · bunga 11% per tahun · anuitas · tenor sampai 48 bulan" (the branch's own values, §4.4). */
  function policyLine(kind, snap) {
    var p = snap && snap[kind] && snap[kind].values;
    if (!p) return '';
    var parts = ['Batas angsuran ' + pctNum(p.capPct), 'bunga ' + pctNum(p.ratePa) + ' per tahun', String(p.method || ''), 'tenor sampai ' + p.tenorMonths + ' bulan'];
    if (kind === 'kkb' && isNum(p.dpPct)) parts.push('uang muka paling sedikit ' + pctNum(p.dpPct));
    if (snap.minSisa != null) parts.push('sisa penghasilan paling sedikit ' + rpRow(snap.minSisa));
    if (snap.base && BASE_WORDS[snap.base]) parts.push('penghasilan ' + BASE_WORDS[snap.base]);
    return parts.join(' · ');
  }
  C.policyLine = policyLine;

  /* ============================================================ compute (pure) */

  function retireCap(env, age, kode) {
    var K = env.kprMath || MCD.kprMath, info = TNI() && isFn(TNI().rankInfo) ? TNI().rankInfo(kode) : { rankGroup: 'tamtama', patiStars: null, known: false };
    var R = env.retire || (MCD.config && MCD.config.retire) || null;
    if (!K || !isFn(K.retireTenor)) return { months: null, bup: null, known: info.known };
    var r = K.retireTenor({ age: age, rankGroup: info.rankGroup, patiStars: info.patiStars }, null, R);
    return { months: Math.max(0, (r.years || 0) * 12), bup: r.bupAge, known: info.known };
  }
  function excludedOf(th, base) {
    var list = EXCLUDE[base] || [];
    return (th.komponen || []).reduce(function (a, r) { return a + (list.indexOf(r.kode) >= 0 && isNum(r.nilai) ? r.nilai : 0); }, 0);
  }
  /**
   * The income passed to MCD.loanCap and the obligations already running. Pangkat route, base 'semua': {takeHome} with the
   * salary cuts inside it; other bases: incomeNet = bersih − the excluded komponen, every cut as existingInstalments (never
   * bersih − totalPotonganGaji, LOAN_CAPACITY §4). Slip route: the typed income, every cut as existingInstalments.
   */
  function incomeArgs(inc, base, extra) {
    extra = extra || 0;
    if (inc.kind === 'slip') return { args: { incomeNet: inc.incomeNet, existingInstalments: inc.cuts.gaji + inc.cuts.lain + inc.cuts.luar + extra }, I: inc.incomeNet };
    var th = inc.th;
    if (!base || base === 'semua') return { args: { takeHome: th, existingInstalments: inc.cuts.luar + extra }, I: th.bersih };
    var net = Math.max(0, th.bersih - excludedOf(th, base));
    return { args: { incomeNet: net, existingInstalments: th.totalPotonganGaji + inc.cuts.luar + extra }, I: net };
  }
  /** Take-home after every salary cut and every other instalment, before the new one (D30): the base of "Sisa penghasilan". */
  function netAfterCuts(inc) {
    if (inc.kind === 'slip') return inc.incomeNet - inc.cuts.gaji - inc.cuts.lain - inc.cuts.luar;
    return inc.th.bersih - inc.th.totalPotonganGaji - inc.cuts.luar;
  }
  /** capPct' = min(capPct, 100 × (I − minSisa) ÷ I) (D30, §4.3). */
  function effectiveCap(cap, I, minSisa) {
    if (minSisa == null) return { cap: cap, floor: false };
    var f = I > 0 ? 100 * (I - minSisa) / I : 0;
    return f < cap ? { cap: f, floor: true } : { cap: cap, floor: false };
  }
  function tenorOf(policyT, typed, cap) {
    var want = isNum(typed) && typed >= 1 ? Math.min(typed, policyT) : policyT;
    var t = isNum(cap) ? Math.min(want, cap) : want;
    return { months: Math.floor(t), capped: isNum(cap) && cap < want, aboveMax: isNum(typed) && typed > policyT };
  }

  /**
   * compute(state, env) → everything the result block shows. state = MCD.tni.calc.get(): {route, tab, inputs}. Never a
   * plafond unless MCD.loanCap says 'ok'; the two policy statuses are told in the calculator's own words (D38).
   */
  function compute(state, env) {
    env = env || {};
    var L = env.loanCap || LC(), snap = env.policy || policySnapshot(), s = state || {}, inp = s.inputs || {};
    var out = { route: s.route === 'slip' ? 'slip' : 'pangkat', errors: {}, income: null, age: null, ksm: null, kkb: null, policy: snap };
    var err = out.errors;
    function rp(k) { var v = parseRp(inp[k]); if (v !== v) { err[k] = T.rpInvalid; return 0; } return v == null ? 0 : v; }
    var cuts = { gaji: rp('cicilanGaji'), lain: rp('potLain'), luar: rp('cicilanLain') };
    if (!L) { out.income = { ok: false, status: 'tanpa-modul', pesan: 'Kalkulator belum tersedia di halaman ini.' }; return out; }

    /* income: the estimate from the pay table, or the slip */
    if (out.route === 'slip') {
      var slip = parseRp(inp.slip);
      if (slip !== slip) { err.slip = T.rpInvalid; slip = null; }
      out.income = slip == null ? { ok: false, kind: 'slip', status: 'data-belum-lengkap', pesan: 'Isi penghasilan bersih sebelum cicilan.' }
        : { ok: true, kind: 'slip', incomeNet: slip, cuts: cuts };
    } else {
      var mkg = parseIntF(inp.mkg), anak = parseIntF(inp.anak), kelas = parseIntF(inp.kelas);
      if (mkg !== mkg) { err.mkg = T.intInvalid; mkg = null; }
      if (anak !== anak) { err.anak = T.intInvalid; anak = null; }
      if (kelas !== kelas) { err.kelas = T.intInvalid; kelas = null; }
      if (!inp.pangkat || mkg == null) out.income = { ok: false, kind: 'estimate', status: 'data-belum-lengkap', pesan: 'Pilih pangkat dan isi masa kerja golongan.' };
      else {
        var th = L.estimateTakeHome({ pangkat: inp.pangkat, mkg: mkg, kelasJabatan: kelas, tanggungan: { pasangan: !!inp.menikah, anak: anak || 0 },
          beras: inp.beras === 'uang' ? 'uang' : 'natura', cicilanPotongGaji: cuts.gaji, potonganLain: cuts.lain }, env.pay || undefined);
        out.income = th && th.ok ? { ok: true, kind: 'estimate', th: th, cuts: cuts } : { ok: false, kind: 'estimate', status: th ? th.status : 'data-tidak-valid', pesan: th ? th.pesan : '' };
      }
    }

    /* age and the BUP cap (D35) */
    var usia = parseIntF(inp.usia);
    if (usia !== usia) { err.usia = T.intInvalid; usia = null; }
    if (usia != null && (usia < 15 || usia > 80)) { err.usia = 'Isi usia dalam tahun.'; usia = null; }
    var rc = usia != null ? retireCap(env, usia, inp.pangkat) : { months: null, bup: null, known: !!inp.pangkat };
    out.age = { given: usia != null, value: usia, capMonths: rc.months, bup: rc.bup, rankKnown: rc.known };

    out.ksm = ksmPart(L, snap, inp, out);
    out.kkb = kkbPart(L, snap, inp, out);
    return out;
  }
  C.compute = compute;

  function policyState(part) {
    if (part.ok) return null;
    if (part.empty.length) return { status: 'kebijakan-belum-diisi', keys: part.empty };
    return { status: 'kebijakan-tidak-valid', keys: part.invalid };
  }
  function moduleMsg(r) {
    /* the module's own message, except for the two policy statuses (D18: it carries a fixed example) */
    if (!r) return '';
    if (r.status === 'kebijakan-belum-diisi' || r.status === 'kebijakan-tidak-valid') return '';
    return r.pesan || '';
  }
  function ksmPart(L, snap, inp, out) {
    var ps = policyState(snap.ksm);
    if (ps) return { status: ps.status, keys: ps.keys };
    if (!out.income.ok) return { status: 'perlu-data', pesan: out.income.pesan };
    if (!out.age.given) return { status: 'perlu-usia' };
    var p = snap.ksm.values, ia = incomeArgs(out.income, snap.base, 0), cap = effectiveCap(p.capPct, ia.I, snap.minSisa);
    var typed = parseIntF(inp.tenorKsm);
    if (typed !== typed) { out.errors.tenorKsm = T.intInvalid; typed = null; }
    var tn = tenorOf(p.tenorMonths, typed, out.age.capMonths);
    var base = { tenor: tn.months, tenorCapped: tn.capped, tenorAbove: tn.aboveMax, bup: out.age.bup, floorActive: cap.floor, minSisa: snap.minSisa,
      netAfterCuts: netAfterCuts(out.income), capUsed: cap.cap, policy: p };
    if (tn.months < 1) return Object.assign(base, { status: 'usia-pensiun', pesan: 'Usia telah mencapai usia pensiun (' + out.age.bup + ' tahun).' });
    if (cap.cap <= 1) return Object.assign(base, { status: 'tidak-ada-ruang', zeroRoom: true, ruang: 0, plafon: null });
    var r = L.maxLoan(Object.assign({}, ia.args, { capPct: cap.cap, ratePa: p.ratePa, tenorMonths: tn.months, method: p.method }));
    if (r.status === 'kebijakan-belum-diisi' || r.status === 'kebijakan-tidak-valid') return Object.assign(base, { status: 'kebijakan-tidak-valid', keys: (r.salah || r.kurang || []).map(function (k) { return 'ksm.' + k; }) });
    if (r.status !== 'ok') return Object.assign(base, { status: r.status, pesan: moduleMsg(r), ruang: isNum(r.ruangAngsuran) ? r.ruangAngsuran : null, plafon: null });
    return Object.assign(base, { status: 'ok', ruang: r.ruangAngsuran, plafon: r.plafon, angsuran: r.angsuran, angsuranTampil: r.angsuranTampil,
      sisa: base.netAfterCuts - r.angsuran, raw: r });
  }
  function kkbPart(L, snap, inp, out) {
    var ps = policyState(snap.kkb);
    if (ps) return { status: ps.status, keys: ps.keys };
    var p = snap.kkb.values, er = out.errors;
    var price = parseRp(inp.harga);
    if (price !== price) { er.harga = T.rpInvalid; price = null; }
    var dpIn = parsePct(inp.dp);
    if (dpIn !== dpIn) { er.dp = T.pctInvalid; dpIn = null; }
    var dp = isNum(dpIn) ? Math.max(dpIn, p.dpPct) : p.dpPct;
    var typed = parseIntF(inp.tenorKkb);
    if (typed !== typed) { er.tenorKkb = T.intInvalid; typed = null; }
    var tn = tenorOf(p.tenorMonths, typed, out.age.given ? out.age.capMonths : null);
    var res = { dpPct: dp, dpRaised: isNum(dpIn) && dpIn < p.dpPct, tenor: tn.months, tenorCapped: tn.capped, tenorAbove: tn.aboveMax, bup: out.age.bup, policy: p, minSisa: snap.minSisa };
    if (price == null) return Object.assign(res, { status: 'perlu-harga', pesan: 'Isi harga kendaraan.' });
    if (out.age.given && tn.months < 1) return Object.assign(res, { status: 'usia-pensiun', pesan: 'Usia telah mencapai usia pensiun (' + out.age.bup + ' tahun).' });
    var fees = {};
    if (isNum(p.feesOptional && p.feesOptional.provisiPct)) fees.provisiPct = p.feesOptional.provisiPct;
    if (isNum(p.feesOptional && p.feesOptional.adminRp)) fees.adminRp = p.feesOptional.adminRp;
    if (isNum(p.feesOptional && p.feesOptional.asuransiRp)) fees.asuransiRp = p.feesOptional.asuransiRp;
    var k = L.kkb({ price: price, dpPct: dp, ratePa: p.ratePa, tenorMonths: tn.months, method: p.method, feesOptional: fees });
    if (k.status === 'kebijakan-belum-diisi' || k.status === 'kebijakan-tidak-valid') return Object.assign(res, { status: 'kebijakan-tidak-valid', keys: (k.salah || k.kurang || []).map(function (x) { return 'kkb.' + x; }) });
    if (k.status !== 'ok') return Object.assign(res, { status: k.status, pesan: moduleMsg(k) });
    res.k = k;
    res.fees = Object.keys(fees);
    res.status = 'ok';
    if (!out.income.ok) { res.fit = null; res.fitStatus = 'perlu-data'; res.pesanFit = out.income.pesan; return res; }
    if (!out.age.given) { res.fit = null; res.fitStatus = 'perlu-usia'; return res; }
    /* D30: the KSM instalment of the KSM tab counts here too while that tab shows an ok result (on by default) */
    var ksm = out.ksm, ksmA = ksm && ksm.status === 'ok' ? ksm.angsuran : null;
    res.ksmAngsuran = ksmA;
    res.ksmAngsuranTampil = ksm && ksm.status === 'ok' ? ksm.angsuranTampil : null;
    res.combined = isNum(ksmA) && inp.combined !== false;
    var extra = res.combined ? ksmA : 0;
    var ia = incomeArgs(out.income, snap.base, extra), cap = effectiveCap(p.capPct, ia.I, snap.minSisa);
    res.floorActive = cap.floor;
    res.netAfterCuts = netAfterCuts(out.income) - extra;
    if (cap.cap <= 1) {
      res.room = 0;
      res.fit = { muat: false, sisa: -k.angsuran, zeroRoom: true };
    } else {
      var room = L.ruangAngsuran(Object.assign({}, ia.args, { capPct: cap.cap }));
      if (!room.ok) { res.fit = null; res.fitStatus = room.status; res.pesanFit = moduleMsg(room); return res; }
      res.room = room.ruang;
      res.fit = L.fits(room, k);
    }
    res.fitStatus = res.fit && res.fit.muat ? 'muat' : 'tidak-muat';
    res.sisa = res.netAfterCuts - k.angsuran;
    return res;
  }

  /* ============================================================ the sheet (DOM) */

  var S = null;           // {el, host, o, refs, timer}
  function E() { return MCD.util.el.apply(null, arguments); }
  function icon(n) { return MCD.util && isFn(MCD.util.icon) ? MCD.util.icon(n) : null; }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function doc() { return root.document || null; }
  function state() { return TNI() ? TNI().calc.get() : null; }
  /** Neutral ids (no "usia", "gaji" or "income" for a browser's autofill heuristics to learn, D9). */
  function uid() { uid.n = (uid.n || 0) + 1; return 'tc-x' + uid.n; }
  /** Every customer field: no name, no autofill history, no cloud spell check (D9). */
  function field(id, o) {
    var inp = E('input', { class: 'input tc-f__in', id: id, type: 'text', value: o.value == null ? '' : String(o.value),
      attrs: { autocomplete: 'off', spellcheck: 'false', inputmode: o.mode || 'numeric', 'aria-describedby': id + '-h ' + id + '-e', 'data-k': o.k } });
    var hint = E('p', { class: 'tc-f__h', id: id + '-h', text: o.hint || '' });
    if (!o.hint) hint.hidden = true;
    var e = E('p', { class: 'tc-f__e', id: id + '-e', attrs: { role: 'alert' } });
    e.hidden = true;
    var wrap = E('div', { class: ['tc-f', o.cls] }, E('label', { class: 'tc-f__l', attrs: { for: id } }, E('span', { text: o.label }), o.unit ? E('span', { class: 'tc-f__u', text: ' ' + o.unit }) : null), inp, hint, e);
    inp.addEventListener('input', function () { TNI().calc.input(o.k, inp.value); schedule(); });
    return { el: wrap, input: inp, err: e, hint: hint };
  }
  function checkbox(id, label, k, checked) {
    var cb = E('input', { type: 'checkbox', id: id, attrs: { autocomplete: 'off', 'data-k': k } });
    cb.checked = !!checked;
    cb.addEventListener('change', function () { TNI().calc.input(k, !!cb.checked); schedule(); });
    return { el: E('label', { class: 'tc-check', attrs: { for: id } }, cb, E('span', { text: label })), input: cb };
  }
  function seg(label, opts, cur, onPick, cls) {
    var wrap = E('div', { class: ['seg', 'tc-seg', cls], role: 'radiogroup', aria: { label: label } });
    var btns = opts.map(function (o) {
      var on = o.v === cur;
      var b = E('button', { type: 'button', class: 'seg__opt', role: 'radio', aria: { checked: on ? 'true' : 'false' }, attrs: { tabindex: on ? '0' : '-1' }, text: o.label });
      b.addEventListener('click', function () { onPick(o.v); });
      wrap.appendChild(b);
      return b;
    });
    wrap.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) < 0) return;
      var i = btns.indexOf(doc().activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length;
      btns[n].focus(); btns[n].click();
    });
    return wrap;
  }
  function btn(label, cls, onClick, title) {
    var b = E('button', { type: 'button', class: ['btn', cls || 'btn--secondary'], title: title || null }, E('span', { text: label }));
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function linkBtn(label, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['tc-link', cls], text: label, title: title || null });
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function extLink(href, text) {
    return E('a', { class: 'tc-ext', href: href, target: '_blank', rel: 'noopener noreferrer', attrs: { referrerpolicy: 'no-referrer' } }, E('span', { text: text }), E('span', { class: 'sr-only', text: ', terbuka di tab baru' }));
  }
  function row(label, value, help, o) {
    o = o || {};
    return E('div', { class: ['tc-r', o.big ? 'tc-r--big' : null], attrs: o.k ? { 'data-r': o.k } : null },
      E('div', { class: 'tc-r__top' }, E('span', { class: 'tc-r__l', text: label }), E('span', { class: 'tc-r__v', text: value })),
      help ? E('p', { class: 'tc-r__h', text: help }) : null);
  }
  function note(text, cls) { return E('p', { class: ['tc-note', cls], text: text }); }

  function schedule() {
    if (!S) return;
    if (S.timer) clearTimeout(S.timer);
    S.timer = setTimeout(function () { if (S) { S.timer = 0; renderOut(); } }, 120);
  }

  /**
   * open(o): o.tab 'ksm' | 'kkb'; o.matra filters the pangkat list ('AL' | 'AU' | 'AD'; gabungan or none = all names);
   * o.host the stage element (else body); o.crumb {label, run} (a sheet opened through MCD.nav.task, §2.4); o.resume keeps
   * the inputs of the policy round trip when they are still held; o.onClose(reason), o.onDealers(), o.onPolicy().
   * Only the matra filter comes from another screen (D8); every other field starts empty.
   */
  function open(o) {
    o = o || {};
    var t = TNI();
    if (!t || !MCD.util || !isFn(MCD.util.el) || !doc()) return false;
    if (S) close('replace');
    if (o.resume && t.calc.held()) t.calc.release();
    else { t.calc.drop(); }
    var st = t.calc.get();
    if (!o.resume) t.calc.set({ tab: o.tab === 'kkb' ? 'kkb' : 'ksm', matra: /^(AL|AU|AD)$/.test(o.matra) ? o.matra : null, allRanks: false });
    else if (o.tab) t.calc.set({ tab: o.tab === 'kkb' ? 'kkb' : 'ksm' });
    void st;
    build(o);
    var W = MCD.windows;
    if (W && isFn(W.suspend)) { try { W.suspend(true); } catch (e) { /* the cards stay */ } }
    doc().body.classList.add('tc-open');
    if (t.payState() !== 'ready') {
      t.loadPay().then(function () { if (S) renderAll(); }, function () { if (S) renderAll(); });
    }
    renderAll();
    setTimeout(function () { if (S && S.refs.title) { try { S.refs.title.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }, 40);
    return true;
  }
  /** close(reason): 'button' | 'esc' | 'lock' | 'policy' (the round trip keeps the inputs) | 'dealers' | 'replace' | 'section'. */
  function close(reason) {
    if (!S) return false;
    var cur = S, keep = reason === 'policy';
    S = null;
    if (cur.timer) clearTimeout(cur.timer);
    if (cur.onKey) doc().removeEventListener('keydown', cur.onKey, true);
    if (cur.el.parentNode) cur.el.parentNode.removeChild(cur.el);           /* nothing typed stays in the DOM */
    if (cur.printLine && cur.printLine.parentNode) cur.printLine.parentNode.removeChild(cur.printLine);
    doc().body.classList.remove('tc-open');
    var W = MCD.windows;
    if (W && isFn(W.suspend)) { try { W.suspend(false); } catch (e) { /* ignore */ } }
    var t = TNI();
    if (t) { if (keep) t.calc.hold(600000); else if (reason !== 'replace') t.calc.drop(); }
    if (cur.o && isFn(cur.o.onClose)) { try { cur.o.onClose(reason || 'button'); } catch (e) { /* ignore */ } }
    return true;
  }
  C.open = open;
  C.close = close;
  C.isOpen = function () { return !!S; };
  /** tni:calc:resume (§4.5): the calculator again on the same tab with its inputs, while they are held. */
  C.resume = function (o) { var t = TNI(); if (!t || !t.calc.held()) return false; return open(Object.assign({}, o || {}, { resume: true })); };
  C.refresh = function () { if (S) renderAll(); };
  C.el = function () { return S ? S.el : null; };

  function build(o) {
    var d = doc(), host = o.host && o.host.nodeType === 1 ? o.host : d.body;
    var titleId = uid('title');
    var r = {};
    r.title = E('h2', { class: 'tc-title', id: titleId, text: T.title, attrs: { tabindex: '-1' } });
    r.tabs = E('div', { class: 'tc-tabs', role: 'tablist', aria: { label: 'Produk' } });
    r.close = E('button', { type: 'button', class: 'btn btn--secondary btn--lg tc-close', title: 'Tutup kalkulator (Esc)', attrs: { 'aria-keyshortcuts': 'Escape' } }, icon('close'), E('span', { text: 'Tutup' }));
    r.close.addEventListener('click', function () { close('button'); });
    r.crumb = null;
    if (o.crumb && o.crumb.label) {
      r.crumb = E('button', { type: 'button', class: 'tc-crumb', title: o.crumb.label, aria: { label: o.crumb.label } }, icon('chev-l'), E('span', { text: o.crumb.label }));
      r.crumb.addEventListener('click', function () { var run = o.crumb.run; close('button'); if (isFn(run)) run(); });
    }
    r.inputs = E('section', { class: 'tc-in', aria: { label: 'Data nasabah' } });
    r.out = E('section', { class: 'tc-out', aria: { label: 'Hasil perkiraan' } });
    r.live = E('p', { class: 'sr-only', attrs: { role: 'status', 'aria-live': 'polite' } });
    r.bar = E('div', { class: 'tc-bar' });
    var el = E('div', { class: 'tc-sheet', role: 'dialog', aria: { labelledby: titleId, modal: 'false' }, attrs: { translate: 'no', 'data-map-occluder': '' } },
      E('header', { class: 'tc-head' }, r.crumb, r.title, r.tabs, r.close),
      E('div', { class: 'tc-body' }, r.inputs, E('div', { class: 'tc-outwrap' }, r.out, r.live)),
      r.bar);
    var printLine = E('p', { class: 'tc-printline', attrs: { translate: 'no' }, text: T.print });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); close('esc'); } });
    host.appendChild(el);
    d.body.appendChild(printLine);
    S = { el: el, host: host, o: o, refs: r, timer: 0, printLine: printLine };
    var onKey = function (e) { if (e.key === 'Escape' && S && S.el === el && !el.contains(e.target)) { e.preventDefault(); close('esc'); } };
    S.onKey = onKey;
    d.addEventListener('keydown', onKey, true);
  }

  function renderAll() {
    if (!S) return;
    renderTabs();
    renderInputs();
    renderOut();
  }
  function renderTabs() {
    var r = S.refs, st = state();
    clear(r.tabs);
    var items = [{ v: 'ksm', label: 'KSM' }, { v: 'kkb', label: 'KKB' }];
    var btns = items.map(function (it) {
      var on = st.tab === it.v;
      var b = E('button', { type: 'button', class: 'tc-tab', role: 'tab', aria: { selected: on ? 'true' : 'false' }, attrs: { tabindex: on ? '0' : '-1', 'data-tab': it.v }, text: it.label });
      b.addEventListener('click', function () { if (state().tab !== it.v) { TNI().calc.set({ tab: it.v }); renderAll(); focusTab(it.v); } });
      r.tabs.appendChild(b);
      return b;
    });
    r.tabs.onkeydown = function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var i = items.map(function (x) { return x.v; }).indexOf(state().tab), n = (i + 1) % 2;
      btns[n].click();
    };
  }
  function focusTab(v) {
    if (!S) return;
    var b = S.refs.tabs.querySelector('[data-tab="' + v + '"]');
    if (b) { try { b.focus(); } catch (e) { /* ignore */ } }
  }

  /* ---- inputs (§4.2, order of the conversation, D35) */

  function renderInputs() {
    var r = S.refs, st = state(), inp = st.inputs, t = TNI(), snap = policySnapshot();
    clear(r.inputs);
    var f = {};
    S.fields = f;
    var payReady = t.payState() === 'ready';
    if (!payReady) {
      var box = E('div', { class: 'tc-load', attrs: { 'aria-busy': t.payState() === 'loading' ? 'true' : 'false' } });
      if (t.payState() === 'error') {
        box.appendChild(note(T.payFailed, 'is-warn'));
        box.appendChild(btn(T.retry, 'btn--secondary', function () { t.loadPay().then(function () { renderAll(); }, function () { renderAll(); }); renderAll(); }));
      } else box.appendChild(note(T.payLoading));
      r.inputs.appendChild(box);
    }
    r.inputs.appendChild(seg('Sumber penghasilan', [{ v: 'pangkat', label: T.routeA }, { v: 'slip', label: T.routeB }], st.route,
      function (v) { if (state().route !== v) { t.calc.set({ route: v }); renderInputs(); renderOut(); } }, 'tc-route'));
    var pk = pangkatField(st, payReady);
    if (st.route === 'slip') {
      f.slip = field(uid('slip'), { k: 'slip', label: 'Penghasilan bersih sebelum cicilan', unit: '(Rp per bulan)', value: inp.slip,
        hint: 'Gaji kotor dikurangi iuran ASABRI dan BPJS. Cicilan diisi di kolom berikutnya.' + (snap.base && BASE_WORDS[snap.base] ? '\nKebijakan bank menghitung penghasilan ' + BASE_WORDS[snap.base] + '. Isi angka tanpa komponen tersebut.' : '') });
      r.inputs.appendChild(f.slip.el);
      f.usia = field(uid('usia'), { k: 'usia', label: 'Usia', unit: '(tahun)', value: inp.usia, hint: 'Usia membatasi tenor sampai usia pensiun.' });
      r.inputs.appendChild(f.usia.el);
      pk.hint.textContent = 'Pangkat menentukan usia pensiun.';
      r.inputs.appendChild(pk.el);
    } else {
      r.inputs.appendChild(pk.el);
      f.mkg = field(uid('mkg'), { k: 'mkg', label: 'Masa kerja golongan', unit: '(tahun)', value: inp.mkg, hint: 'Lihat MKG di slip gaji.' });
      f.usia = field(uid('usia'), { k: 'usia', label: 'Usia', unit: '(tahun)', value: inp.usia, hint: 'Usia membatasi tenor sampai usia pensiun.' });
      var mar = checkbox(uid('nikah'), 'Menikah', 'menikah', inp.menikah);
      f.anak = field(uid('anak'), { k: 'anak', label: 'Jumlah anak', value: inp.anak, hint: 'Tunjangan anak dihitung paling banyak 2 anak.' });
      [f.mkg.el, f.usia.el, mar.el, f.anak.el].forEach(function (n) { r.inputs.appendChild(n); });
      r.inputs.appendChild(moreFold(st));
    }
    r.inputs.appendChild(E('h3', { class: 'tc-sub', text: 'Potongan dan cicilan' }));
    f.cicilanGaji = field(uid('cg'), { k: 'cicilanGaji', label: 'Cicilan yang dipotong dari gaji', unit: '(Rp per bulan)', value: inp.cicilanGaji });
    f.potLain = field(uid('pl'), { k: 'potLain', label: 'Potongan lain (bukan cicilan)', unit: '(Rp per bulan)', value: inp.potLain });
    f.cicilanLain = field(uid('cl'), { k: 'cicilanLain', label: 'Cicilan lain di luar gaji', unit: '(Rp per bulan)', value: inp.cicilanLain });
    [f.cicilanGaji, f.potLain, f.cicilanLain].forEach(function (x) { r.inputs.appendChild(x.el); });
    if (st.tab === 'kkb') {
      r.inputs.appendChild(E('h3', { class: 'tc-sub', text: 'Kendaraan' }));
      f.harga = field(uid('harga'), { k: 'harga', label: 'Harga kendaraan', unit: '(Rp)', value: inp.harga });
      var kv = snap.kkb.values;
      f.dp = field(uid('dp'), { k: 'dp', label: 'Uang muka (%)', mode: 'decimal', value: inp.dp !== '' ? inp.dp : (kv ? String(kv.dpPct).replace('.', ',') : ''),
        hint: kv ? 'Paling sedikit ' + pctNum(kv.dpPct) + ' sesuai kebijakan bank.' : '' });
      f.tenorKkb = field(uid('tk'), { k: 'tenorKkb', label: 'Tenor', unit: '(bulan)', value: inp.tenorKkb !== '' ? inp.tenorKkb : (kv ? String(kv.tenorMonths) : ''),
        hint: kv ? 'Paling lama ' + kv.tenorMonths + ' bulan sesuai kebijakan bank.' : '' });
      [f.harga, f.dp, f.tenorKkb].forEach(function (x) { r.inputs.appendChild(x.el); });
      S.combinedSlot = E('div', { class: 'tc-combined' });
      r.inputs.appendChild(S.combinedSlot);
    } else {
      var kp = snap.ksm.values;
      f.tenorKsm = field(uid('tn'), { k: 'tenorKsm', label: 'Tenor', unit: '(bulan)', value: inp.tenorKsm !== '' ? inp.tenorKsm : (kp ? String(kp.tenorMonths) : ''),
        hint: kp ? 'Paling lama ' + kp.tenorMonths + ' bulan sesuai kebijakan bank.' : '' });
      r.inputs.appendChild(f.tenorKsm.el);
      S.combinedSlot = null;
    }
    var fresh = btn(T.fresh, 'btn--ghost btn--bar tc-fresh', function () { t.calc.clearInputs(); renderAll(); if (S && S.refs.title) { try { S.refs.title.focus(); } catch (e) { /* ignore */ } } });
    r.inputs.appendChild(E('div', { class: 'tc-privacy' }, E('p', { class: 'tc-privacy__t', text: T.notSaved }), fresh));
  }
  /** Pangkat: the matra's names when opened from a pangkalan (D8), "Tampilkan semua pangkat" for the whole list. */
  function pangkatField(st, payReady) {
    var t = TNI(), id = uid('pangkat'), matra = st.allRanks ? null : st.matra;
    var opts = payReady ? t.pangkatOptions(matra) : [];
    var sel = E('select', { class: 'select tc-f__in', id: id, attrs: { autocomplete: 'off', 'data-k': 'pangkat', 'aria-describedby': id + '-h' } });
    sel.appendChild(E('option', { value: '', text: payReady ? 'Pilih pangkat' : T.payLoading }));
    var groups = {};
    opts.forEach(function (o) {
      if (!groups[o.group]) { groups[o.group] = E('optgroup', { attrs: { label: o.groupLabel } }); sel.appendChild(groups[o.group]); }
      groups[o.group].appendChild(E('option', { value: o.kode, text: o.label }));
    });
    var cur = st.inputs.pangkat;
    if (cur && !opts.some(function (o) { return o.kode === cur; })) {
      var all = t.pangkatOptions(null).filter(function (o) { return o.kode === cur; })[0];
      if (all) sel.appendChild(E('option', { value: all.kode, text: all.label }));
    }
    sel.value = cur || '';
    sel.disabled = !payReady;
    sel.addEventListener('change', function () { t.calc.input('pangkat', sel.value); schedule(); });
    var label = matra ? 'Pangkat ' + t.matraLabel(matra) : 'Pangkat';
    var hint = E('p', { class: 'tc-f__h', id: id + '-h' });
    var more = st.matra ? linkBtn(st.allRanks ? 'Tampilkan pangkat ' + t.matraLabel(st.matra) : 'Tampilkan semua pangkat', function () {
      t.calc.set({ allRanks: !state().allRanks }); renderInputs(); }, 'tc-allranks') : null;
    var wrap = E('div', { class: 'tc-f tc-f--pangkat' }, E('div', { class: 'tc-f__row' }, E('label', { class: 'tc-f__l', attrs: { for: id }, text: label }), more), sel, hint);
    return { el: wrap, input: sel, hint: hint };
  }
  /** "Rincian lain (opsional)": Kelas jabatan and Tunjangan beras (Natura first, the lower number, D35). */
  function moreFold(st) {
    var inp = st.inputs, bodyId = uid('more');
    var preview = (inp.kelas ? 'kelas ' + inp.kelas : 'tanpa kelas') + ' · ' + (inp.beras === 'uang' ? 'tunai' : 'natura');
    var b = E('button', { type: 'button', class: 'tc-fold__b', aria: { expanded: st.moreOpen ? 'true' : 'false', controls: bodyId } },
      E('span', { class: 'tc-fold__t', text: 'Rincian lain (opsional)' }), E('span', { class: 'tc-fold__p', text: ' · ' + preview }));
    var body = E('div', { class: 'tc-fold__body', id: bodyId });
    body.hidden = !st.moreOpen;
    b.addEventListener('click', function () { var on = !state().moreOpen; TNI().calc.set({ moreOpen: on }); body.hidden = !on; b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
    var kelas = field(uid('kelas'), { k: 'kelas', label: 'Kelas jabatan (opsional)', value: inp.kelas, hint: 'Kosong berarti tunjangan kinerja tidak dihitung.' });
    S.fields.kelas = kelas;
    body.appendChild(kelas.el);
    body.appendChild(E('div', { class: 'tc-f' }, E('p', { class: 'tc-f__l', text: 'Tunjangan beras' }),
      seg('Tunjangan beras', [{ v: 'uang', label: 'Tunai' }, { v: 'natura', label: 'Natura' }], inp.beras === 'uang' ? 'uang' : 'natura',
        function (v) { TNI().calc.input('beras', v); renderInputs(); renderOut(); }, 'tc-beras')));
    return E('div', { class: 'tc-fold' }, b, body);
  }

  /* ---- results (§4.3, §4.4, §4.7) */

  function renderOut() {
    if (!S) return;
    var r = S.refs, st = state(), t = TNI();
    var res = t.payState() === 'ready' || st.route === 'slip' ? compute(st) : null;
    S.last = res;
    paintErrors(res ? res.errors : {});
    clear(r.out);
    clear(r.bar);
    if (!res) { r.out.appendChild(note(t.payState() === 'error' ? T.payFailed : T.payLoading)); guard(r.out, st.tab); return; }
    if (st.tab === 'kkb') outKkb(r.out, res); else outKsm(r.out, res);
    guard(r.out, st.tab);
    if (S.combinedSlot) paintCombined(res);
  }
  function paintErrors(errs) {
    var f = S.fields || {};
    Object.keys(f).forEach(function (k) {
      var x = f[k];
      if (!x || !x.err) return;
      var m = errs[k] || '';
      x.err.textContent = m;
      x.err.hidden = !m;
      if (m) x.input.setAttribute('aria-invalid', 'true'); else x.input.removeAttribute('aria-invalid');
    });
  }
  function incomeRows(host, res) {
    var inc = res.income;
    if (!inc) return;
    if (inc.kind === 'slip') {
      if (inc.ok) host.appendChild(row('Penghasilan bersih sebelum cicilan', rpRow(inc.incomeNet), HELP.slip, { k: 'slip' }));
      else host.appendChild(note(inc.pesan));
      return;
    }
    if (!inc.ok) { host.appendChild(note(inc.pesan || 'Pilih pangkat dan isi masa kerja golongan.')); return; }
    host.appendChild(row('Perkiraan gaji bersih', rpRow(inc.th.tampil.bersih), HELP.gaji, { k: 'gaji' }));
  }
  function policyHead(host, kind, res) {
    var snap = res.policy, keys = kind === 'kkb' ? KKB_KEYS : KSM_KEYS, d = snap.filled(keys);
    var ubah = linkBtn('Ubah', function () { toPolicy(); }, 'tc-ubah', 'Buka Data & Privasi › Kebijakan & leads');
    host.appendChild(E('p', { class: 'tc-pol' }, E('span', { text: 'Kebijakan bank' + (d ? ' · diisi ' + dateWords(d) : '') + ' · ' }), ubah));
    host.appendChild(E('p', { class: 'tc-pol__v', text: policyLine(kind, snap) }));
  }
  /** D38: who fills the numbers, and the one button; never the module's message (it carries a fixed example, D18). */
  function emptyPolicy(host, part) {
    var list = missingText(part.keys);
    var head = part.status === 'kebijakan-tidak-valid' ? 'Angka kebijakan bank perlu diperiksa: ' + list + '.' : 'Angka kebijakan bank belum diisi: ' + list + '.';
    host.appendChild(E('div', { class: 'tc-empty', attrs: { 'data-state': part.status } },
      E('p', { class: 'tc-empty__t', text: head }), E('p', { text: T.owner }), E('p', { text: T.noDefault }),
      btn(T.openPolicy, 'btn--secondary tc-topolicy', function () { toPolicy(); })));
  }
  function rincian(host, res) {
    var inc = res.income;
    if (!inc || !inc.ok || inc.kind !== 'estimate') return;
    var th = inc.th, bodyId = uid('rinci');
    var b = E('button', { type: 'button', class: 'tc-fold__b', aria: { expanded: 'false', controls: bodyId } }, E('span', { class: 'tc-fold__t', text: 'Rincian' }));
    var body = E('div', { class: 'tc-fold__body tc-rinci', id: bodyId });
    body.hidden = true;
    b.addEventListener('click', function () { body.hidden = !body.hidden; b.setAttribute('aria-expanded', body.hidden ? 'false' : 'true'); });
    function list(title, rows, minus) {
      if (!rows || !rows.length) return;
      body.appendChild(E('p', { class: 'tc-rinci__h', text: title }));
      var ul = E('ul', { class: 'tc-rinci__l' });
      rows.forEach(function (x) { ul.appendChild(E('li', {}, E('span', { text: x.label }), E('span', { class: 'tc-rinci__v', text: (minus ? '− ' : '') + rpRow(Math.round(x.nilai)) }))); });
      body.appendChild(ul);
    }
    list('Penghasilan', th.komponen);
    list('Iuran wajib', th.potongan, true);
    list('Potongan gaji yang diisi', th.potonganGaji, true);
    (th.catatan || []).filter(function (c) { return !/^Perkiraan untuk percakapan/.test(c); }).forEach(function (c) { body.appendChild(E('p', { class: 'tc-rinci__n', text: c })); });
    host.appendChild(E('div', { class: 'tc-fold tc-fold--out' }, b, body));
  }
  function outKsm(host, res) {
    var k = res.ksm, r = S.refs;
    if (k.status === 'kebijakan-belum-diisi' || k.status === 'kebijakan-tidak-valid') {
      incomeRows(host, res);
      emptyPolicy(host, k);
      rincian(host, res);
      setBar('Angka kebijakan bank belum diisi.');
      announce('');
      return;
    }
    policyHead(host, 'ksm', res);
    incomeRows(host, res);
    if (k.status === 'perlu-data') { setBar(k.pesan || ''); rincian(host, res); return; }
    if (k.status === 'perlu-usia') {
      host.appendChild(E('p', { class: 'tc-needage', text: T.needAge }));
      setBar(T.needAge);
      rincian(host, res);
      return;
    }
    if (k.status === 'usia-pensiun') { host.appendChild(note(k.pesan, 'is-warn')); setBar(k.pesan); rincian(host, res); return; }
    if (k.status === 'tidak-ada-ruang' && k.zeroRoom) {
      host.appendChild(row('Ruang angsuran', 'Rp0', HELP.ruang, { k: 'ruang' }));
      if (k.floorActive) host.appendChild(note(floorText(k.minSisa)));
      setBar('Ruang angsuran Rp0');
      rincian(host, res);
      return;
    }
    if (k.status !== 'ok') {
      if (isNum(k.ruang)) host.appendChild(row('Ruang angsuran', rpRow(floor1000(k.ruang)), HELP.ruang, { k: 'ruang' }));
      if (k.pesan) host.appendChild(note(k.pesan));
      if (k.floorActive) host.appendChild(note(floorText(k.minSisa)));
      setBar(k.pesan || '');
      rincian(host, res);
      return;
    }
    host.appendChild(row('Ruang angsuran', rpRow(floor1000(k.ruang)), HELP.ruang, { k: 'ruang' }));
    host.appendChild(row('Perkiraan plafond KSM', rpRow(k.plafon), HELP.plafond, { k: 'plafond', big: true }));
    host.appendChild(row('Angsuran per bulan', rpRow(k.angsuranTampil) + ' · tenor ' + k.tenor + ' bulan', HELP.angsuran, { k: 'angsuran' }));
    host.appendChild(row('Sisa penghasilan setelah angsuran', rpRow(floor1000(k.sisa)), HELP.sisa, { k: 'sisa' }));
    if (k.floorActive) host.appendChild(note(floorText(k.minSisa)));
    if (k.tenorCapped) host.appendChild(note('Tenor dibatasi sampai usia pensiun (' + k.bup + ' tahun).'));
    else if (k.tenorAbove) host.appendChild(note('Tenor paling lama ' + k.policy.tenorMonths + ' bulan sesuai kebijakan bank.'));
    rincian(host, res);
    setBar('Perkiraan plafond ± ' + rpShort(k.plafon), true);
    announce('Perkiraan plafond KSM ' + rpSay(k.plafon));
    void r;
  }
  function floorText(min) { return 'Perkiraan plafond dibatasi agar sisa penghasilan paling sedikit ' + rpSay(min) + ' per bulan.'; }
  function outKkb(host, res) {
    var k = res.kkb;
    if (k.status === 'kebijakan-belum-diisi' || k.status === 'kebijakan-tidak-valid') {
      incomeRows(host, res);
      emptyPolicy(host, k);
      rincian(host, res);
      setBar('Angka kebijakan bank belum diisi.');
      return;
    }
    policyHead(host, 'kkb', res);
    incomeRows(host, res);
    if (k.status !== 'ok') {
      host.appendChild(note(k.pesan || ''));
      setBar(k.pesan || '');
      rincian(host, res);
      dealersBtn(host);
      return;
    }
    var kk = k.k;
    host.appendChild(row('Angsuran per bulan', rpRow(kk.angsuranTampil) + ' · tenor ' + k.tenor + ' bulan', HELP.angsuran, { k: 'angsuran' }));
    host.appendChild(row('Uang muka', rpRow(dispRp(kk.uangMuka)) + ' · ' + pctNum(k.dpPct), HELP.dp, { k: 'dp' }));
    host.appendChild(row('Bayar saat akad', rpRow(dispRp(kk.bayarDiMuka)), HELP.akad + (k.fees.length ? '' : ' Biaya lain belum diisi cabang.'), { k: 'akad' }));
    if (k.dpRaised) host.appendChild(note('Uang muka paling sedikit ' + pctNum(k.policy.dpPct) + ' sesuai kebijakan bank.'));
    if (k.tenorCapped) host.appendChild(note('Tenor dibatasi sampai usia pensiun (' + k.bup + ' tahun).'));
    else if (k.tenorAbove) host.appendChild(note('Tenor paling lama ' + k.policy.tenorMonths + ' bulan sesuai kebijakan bank.'));
    if (k.fitStatus === 'perlu-usia') {
      host.appendChild(E('p', { class: 'tc-needage', text: T.needAge }));
      setBar(T.needAge);
    } else if (k.fitStatus === 'perlu-data' || !k.fit) {
      host.appendChild(note(k.pesanFit || 'Isi penghasilan untuk melihat ruang angsuran.'));
      setBar(k.pesanFit || '');
    } else {
      var muat = k.fit.muat, gap = Math.abs(k.fit.sisa);
      var text = muat ? 'Muat dalam ruang angsuran. Sisa ' + rpSay(floor1000(gap)) + ' per bulan.'
        : (k.combined ? 'Tidak muat bersama angsuran KSM, kurang ' : 'Tidak muat, kurang ') + rpSay(Math.ceil(gap / 1000) * 1000) + ' per bulan.';
      host.appendChild(E('p', { class: ['tc-fit', muat ? 'is-ok' : 'is-no'], attrs: { 'data-r': 'fit' }, text: text }));
      host.appendChild(row('Sisa penghasilan setelah angsuran', rpRow(floor1000(k.sisa)), HELP.sisa, { k: 'sisa' }));
      if (k.floorActive) host.appendChild(note(floorText(k.minSisa)));
      setBar((muat ? 'Muat · sisa ' : 'Tidak muat · kurang ') + rpShort(gap), true);
      announce(text);
    }
    host.appendChild(note(T.sameRoom));
    rincian(host, res);
    dealersBtn(host);
  }
  /** D30: "Hitung bersama angsuran KSM dari tab KSM (Rp{x} per bulan)", on by default, while the KSM tab shows an ok result. */
  function paintCombined(res) {
    var slot = S.combinedSlot, k = res.kkb, inp = state().inputs;
    var text = k && isNum(k.ksmAngsuran) ? 'Hitung bersama angsuran KSM dari tab KSM (' + rpSay(k.ksmAngsuranTampil) + ' per bulan)' : '';
    if (slot.__text === text) return;                     /* the same box stays (and keeps the focus) */
    slot.__text = text;
    clear(slot);
    if (!text) return;
    slot.appendChild(checkbox(uid('comb'), text, 'combined', inp.combined !== false).el);
  }
  function dealersBtn(host) {
    host.appendChild(btn('Lihat dealer terdekat', 'btn--secondary tc-dealers', function () {
      var o = S && S.o;
      close('dealers');
      if (o && isFn(o.onDealers)) o.onDealers();
    }));
  }
  /** The guardrail strip (§4.7, §10.1, D22, D23): the concentration sentence once on this screen, the limit line, D23. */
  function guard(host, tab) {
    var t = TNI(), c = t ? t.concentration() : null, g = E('div', { class: 'tc-guard' });
    if (c) {
      var line = t.concentrationText(c, { mode: tab === 'kkb' ? 'npl' : 'full' });
      if (line) g.appendChild(E('p', { class: 'tc-guard__c', title: t.CONCENTRATION_TITLE, text: line }));
      var lim = t.limitText(c);
      if (lim && tab !== 'kkb') g.appendChild(E('p', { class: 'tc-guard__lim', text: lim }));
    }
    g.appendChild(E('p', { class: 'tc-guard__d', text: T.d23a }));
    g.appendChild(E('p', { class: 'tc-guard__d', text: T.d23b }));
    var srcId = uid('src');
    var sb = E('button', { type: 'button', class: 'tc-src__b', aria: { expanded: 'false', controls: srcId } }, E('span', { aria: { hidden: 'true' }, text: 'ⓘ ' }), E('span', { text: 'Sumber' }));
    var sl = E('div', { class: 'tc-src', id: srcId });
    sl.hidden = true;
    sb.addEventListener('click', function () { sl.hidden = !sl.hidden; sb.setAttribute('aria-expanded', sl.hidden ? 'false' : 'true'); });
    var th = S && S.last && S.last.income && S.last.income.th;
    var ul = E('ul', { class: 'tc-src__l' });
    ((th && th.sumber) || []).forEach(function (x) {
      var label = [x.nomor, x.pasal].filter(Boolean).join(', ');
      var safe = x.url && /^https:\/\/[^\s"'<>]+$/.test(x.url) ? x.url : null;
      ul.appendChild(E('li', {}, safe ? extLink(safe, label) : E('span', { text: label })));
    });
    sl.appendChild(ul);
    sl.appendChild(E('p', { text: T.paySource }));
    g.appendChild(E('div', { class: 'tc-srcwrap' }, sb, sl));
    host.appendChild(g);
  }
  /** Phones: the sticky bottom bar (§4.8) with the main number or the missing step, and "Lihat hasil". */
  function setBar(text, withLink) {
    if (!S) return;
    var bar = S.refs.bar;
    clear(bar);
    bar.appendChild(E('span', { class: 'tc-bar__t', text: text || '' }));
    if (withLink) {
      var b = linkBtn('Lihat hasil', function () { try { S.refs.out.scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ } }, 'tc-bar__go');
      bar.appendChild(b);
    }
  }
  function announce(text) { if (S && S.refs.live && S.refs.live.textContent !== text) S.refs.live.textContent = text || ''; }
  /** "Buka Kebijakan & leads" and "Ubah" (§4.5): the inputs are held for the round trip, then Data & Privasi opens. */
  function toPolicy() {
    var o = S && S.o;
    close('policy');
    if (o && isFn(o.onPolicy)) { o.onPolicy(); return; }
    var N = MCD.nav, A = MCD.app;
    if (N && isFn(N.go)) { try { if (N.go({ section: 'data', action: 'data:policy' }, { from: 'tni' }) !== false) return; } catch (e) { /* navigate below */ } }
    if (A && isFn(A.navigate)) A.navigate('data', { view: 'deep', action: 'data:policy' });
  }

  /* lock (also the idle lock): the sheet closes and the memory goes (MCD.tni drops it too) */
  try {
    var d1 = root.document;
    if (d1 && isFn(d1.addEventListener)) d1.addEventListener('mcd:gate-locking', function () { close('lock'); });
  } catch (e) { /* Node */ }

  C._test = { state: function () { return S; }, compute: compute, incomeArgs: incomeArgs, effectiveCap: effectiveCap, netAfterCuts: netAfterCuts, T: T, HELP: HELP };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
