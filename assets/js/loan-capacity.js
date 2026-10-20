/* ==========================================================================
 * MCD.loanCap: KSM / KKB capacity core for TNI payroll (v7 groundwork, COPY_STYLE_EN items 48-49)
 *
 * PURE: no DOM, no storage, no network. The pay table comes in as the last argument, or from
 * window.MCD_TNI_PAY (data/tni-pay.js) when it is left out. UMD wrapper: MCD.loanCap in the browser
 * (classic script), module.exports in Node (tests/loan-capacity.test.mjs). Not loaded by index.html yet.
 *
 * An ESTIMATE for a conversation at the branch, never an approval. Deductions differ per person
 * (koperasi, TWP, rumah dinas, other loans cut from the salary), the kelas jabatan depends on the
 * posting, and the SLIK check and the credit decision stay in the bank's official process.
 * Sources, method and limits: docs/LOAN_CAPACITY.md.
 *
 * Bank policy numbers are NEVER in this file: the rate, the instalment cap (% of net income), the
 * tenor, the down payment and the instalment method are inputs. A call that misses one returns
 * status 'kebijakan-belum-diisi' with the missing keys (kurang) and a plain Indonesian message,
 * never a number made up by the code.
 *
 * Conventions (same as MCD.kprMath)
 *   Money    IDR doubles, unrounded. Rounding only for display: dispRp (half-up to Rp 1.000) for
 *            headline instalments and totals, floor1000 for limits (plafon, ruang angsuran, net income
 *            used as the base of a limit), roundRp for detail rows.
 *   Rates    % p.a.; monthly rate = ratePa / 1200 (nominal).
 *   Percent  capPct and dpPct in % (40 = 40%). UNIT TRAP: MCD.kprMath.budget and MCD.config.dsrCap
 *            hold the cap as a FRACTION (0.40). Pass capPct = dsr × 100. A capPct of 1 or less is
 *            refused as 'kebijakan-tidak-valid' (it is almost surely a fraction), never computed.
 *   Tenor    whole months.
 *
 * Salary deductions the member reports (two inputs of estimateTakeHome, never mixed up):
 *   cicilanPotongGaji  loan instalments already cut from the salary (KPR, KSM, koperasi loan)
 *   potonganLain       other cuts that are not a loan (simpanan koperasi, TWP, sewa rumah dinas)
 *   Neither lowers `bersih` (net pay after the regulated contributions only). Both come back in
 *   potonganGaji[] / totalPotonganGaji, and maxLoan({takeHome}) subtracts the total IN FULL from the
 *   room, like an existing instalment. So an instalment entered in either field, or passed as
 *   existingInstalments, gives the same plafon; none of the three routes can raise it.
 *
 * API
 *   findPangkat(s, table?) → pangkat row | null      code ('SERTU'), MCD.ref code ('KLS', 'LAKSMA'),
 *       full name ('Sersan Satu', 'Kolonel Laut (E)') or a parseRank() result ({code})
 *   gajiPokok(pangkat, mkg, table?) → {gaji, mkgTabel, posisi: 'tabel'|'di-atas-tabel'|'di-bawah-tabel'} | null
 *   estimateTakeHome(input, table?) → take-home estimate from the official pay tables
 *       input: {pangkat, mkg, kelasJabatan (1-17 | null), tanggungan: {pasangan: bool, anak: n},
 *               beras: 'uang' | 'natura' (default 'uang'), hariKalender: 28-31 (default 30),
 *               golonganJabatan: 'I'..'IX' or tunjanganJabatanRp (either replaces tunjangan umum),
 *               tukinTabel (default table.tunjanganKinerja.tabelBerlaku),
 *               cicilanPotongGaji (Rp, default 0), potonganLain (Rp, default 0)}
 *       → {ok, status, pesan, pangkat, mkg, gajiPokokInfo, komponen[], kotor, potongan[], totalPotongan,
 *          bersih, potonganGaji[], totalPotonganGaji, tampil: {kotor, bersih}, perkiraan: true,
 *          catatan[], sumber[]}
 *          bersih = kotor − totalPotongan (regulated contributions only; potonganGaji is NOT in it)
 *          komponen / potongan / potonganGaji rows: {kode, label, nilai, perkiraan, sumber, keterangan?}
 *   annuityInstalment(principal, ratePa, tenorMonths) → Rp per month | null (invalid input)
 *   flatInstalment(principal, ratePa, tenorMonths) → Rp per month | null
 *   instalment(principal, ratePa, tenorMonths, method) → by method 'anuitas' | 'flat' | null
 *   ruangAngsuran({incomeNet | takeHome, capPct, existingInstalments})
 *       → {ok, status, ruang, batasAngsuran, existingInstalments, potonganGaji, totalKewajiban,
 *          sumberPenghasilan: 'diisi'|'perkiraan-gaji', pesan}
 *       room = income × capPct% − (existingInstalments + takeHome.totalPotonganGaji), never below 0.
 *       takeHome: an estimateTakeHome() result (income = its bersih); give it OR incomeNet, not both.
 *       existingInstalments: instalments NOT already in takeHome (e.g. paid by transfer).
 *       Never pass incomeNet = bersih − totalPotonganGaji: that takes only capPct% of the cuts off the room.
 *   maxLoan({incomeNet | takeHome, capPct, existingInstalments, ratePa, tenorMonths, method})
 *       → {ok, status, plafon, ruangAngsuran, batasAngsuran, totalKewajiban, angsuran, angsuranTampil,
 *          kebijakan, pesan}
 *   kkb({price, dpPct, ratePa, tenorMonths, method, feesOptional: {provisiPct, adminRp, asuransiRp, lainRp}})
 *       → {ok, status, harga, uangMuka, pokok, angsuran, angsuranTampil, totalAngsuran, totalBunga,
 *          biayaAwal: {provisi, admin, asuransi, lain, total}, bayarDiMuka, kebijakan, pesan, catatan[]}
 *   fits(capacity, instalment) → {ok, status: 'muat'|'tidak-muat'|..., muat, sisa, pemakaianPct, pesan}
 *       capacity: Rp, or a maxLoan() / ruangAngsuran() result; instalment: Rp, or a kkb() result
 *   policyCheck(policy, keys) → {ok, status, kurang[], salah[], pesan}
 *   floor1000 · dispRp · roundRp (identical to MCD.kprMath) · rp(x) → 'Rp 1.234.000' · pct(x) → '4,75%'
 *   STATUS · METHODS · POLICY_LABELS
 *   User-facing strings are plain Indonesian for branch staff (COPY_STYLE_EN item 19).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.loanCap = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var STATUS = {
    OK: 'ok',
    POLICY_MISSING: 'kebijakan-belum-diisi',
    POLICY_INVALID: 'kebijakan-tidak-valid',
    DATA_MISSING: 'data-belum-lengkap',
    DATA_INVALID: 'data-tidak-valid',
    NO_ROOM: 'tidak-ada-ruang',
    FITS: 'muat',
    NO_FIT: 'tidak-muat',
    NO_TABLE: 'tabel-belum-dimuat',
    UNKNOWN_RANK: 'pangkat-tidak-dikenal'
  };
  var METHODS = ['anuitas', 'flat'];
  var METHOD_ALIAS = { anuitas: 'anuitas', annuity: 'anuitas', efektif: 'anuitas', flat: 'flat' };
  var POLICY_LABELS = {
    capPct: 'batas angsuran (% dari penghasilan bersih)',
    ratePa: 'suku bunga (% per tahun)',
    tenorMonths: 'tenor (bulan)',
    method: 'cara hitung angsuran (anuitas atau flat)',
    dpPct: 'uang muka (% dari harga)'
  };
  var MINUS = '−';

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function blank(v) { return v === undefined || v === null || v === '' || (typeof v === 'number' && isNaN(v)); }

  /* ----------------------------------------------------------- rounding */

  /** Limits only (plafon, ruang angsuran, income used as a limit base): never rounded up. */
  function floor1000(x) { return Math.floor(x / 1000) * 1000; }
  /** Headline instalments and totals: half-up to Rp 1.000. */
  function dispRp(x) { return Math.floor(x / 1000 + 0.5) * 1000; }
  /** Detail rows. */
  function roundRp(x) { return Math.round(x); }

  /** 'Rp 1.234.000' (all digits, id-ID grouping, typographic minus). '—' for a missing value. */
  function rp(x) {
    if (!isNum(x)) return '—';
    var r = Math.round(x), s = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (r < 0 ? MINUS : '') + 'Rp ' + s;
  }
  /** '4,75%' (decimal comma). */
  function pct(x) { return isNum(x) ? String(Math.round(x * 100) / 100).replace('.', ',') + '%' : '—'; }

  /* ------------------------------------------------------------ policy */

  function methodOf(m) { return typeof m === 'string' ? (METHOD_ALIAS[m.trim().toLowerCase()] || null) : null; }

  function validPolicy(key, v) {
    switch (key) {
      // In %, so 1 or less is refused: 0.4 is almost surely the fraction form (MCD.kprMath dsr) of 40%.
      case 'capPct': return isNum(v) && v > 1 && v <= 100;
      case 'ratePa': return isNum(v) && v >= 0 && v < 100;
      case 'tenorMonths': return isNum(v) && Math.floor(v) === v && v >= 1 && v <= 600;
      case 'dpPct': return isNum(v) && v >= 0 && v < 100;
      case 'method': return methodOf(v) !== null;
      default: return !blank(v);
    }
  }
  var INVALID_TEXT = {
    capPct: 'batas angsuran diisi dalam persen, lebih dari 1 dan paling tinggi 100 (40 berarti 40%; jangan diisi pecahan seperti 0,4)',
    ratePa: 'suku bunga harus 0% atau lebih dan di bawah 100% per tahun',
    tenorMonths: 'tenor harus bilangan bulat 1 sampai 600 bulan',
    dpPct: 'uang muka harus 0% atau lebih dan di bawah 100%',
    method: 'cara hitung angsuran harus anuitas atau flat'
  };

  /**
   * policyCheck(policy, keys) → {ok, status, kurang, salah, pesan}
   * kurang: keys left empty; salah: keys filled with a value outside the allowed range.
   */
  function policyCheck(policy, keys) {
    policy = policy || {};
    var kurang = [], salah = [];
    (keys || []).forEach(function (k) {
      if (blank(policy[k])) kurang.push(k);
      else if (!validPolicy(k, policy[k])) salah.push(k);
    });
    if (kurang.length) {
      // A caller that passes the KPR engine's fraction key (dsr: 0.4) instead of capPct gets told why.
      var dsrHint = kurang.indexOf('capPct') >= 0 && !blank(policy.dsr)
        ? ' Batas angsuran di sini diisi dalam persen (40 berarti 40%), bukan pecahan dsr (0,4).' : '';
      return {
        ok: false, status: STATUS.POLICY_MISSING, kurang: kurang, salah: salah,
        pesan: 'Kebijakan belum diisi: ' + kurang.map(function (k) { return POLICY_LABELS[k] || k; }).join(', ') +
          '. Isi dulu angka kebijakan bank yang berlaku; dashboard tidak memakai angka kebijakan bawaan.' + dsrHint
      };
    }
    if (salah.length) {
      return {
        ok: false, status: STATUS.POLICY_INVALID, kurang: kurang, salah: salah,
        pesan: 'Kebijakan tidak valid: ' + salah.map(function (k) { return INVALID_TEXT[k] || k; }).join('; ') + '.'
      };
    }
    return { ok: true, status: STATUS.OK, kurang: [], salah: [], pesan: '' };
  }

  function echoPolicy(o, keys) {
    var out = {};
    keys.forEach(function (k) { out[k] = k === 'method' ? methodOf(o[k]) : o[k]; });
    return out;
  }

  /* --------------------------------------------------------- instalments */

  function validLoanArgs(P, ratePa, n) {
    return isNum(P) && P >= 0 && isNum(ratePa) && ratePa >= 0 && isNum(n) && Math.floor(n) === n && n >= 1;
  }

  /** Annuity (anuitas): the same instalment every month. Monthly rate ratePa / 1200. null on invalid input. */
  function annuityInstalment(principal, ratePa, tenorMonths) {
    if (!validLoanArgs(principal, ratePa, tenorMonths)) return null;
    var i = ratePa / 1200;
    if (i === 0) return principal / tenorMonths;
    return principal * i / (1 - Math.pow(1 + i, -tenorMonths));
  }

  /** Flat: principal / n plus interest on the ORIGINAL principal every month. null on invalid input. */
  function flatInstalment(principal, ratePa, tenorMonths) {
    if (!validLoanArgs(principal, ratePa, tenorMonths)) return null;
    return principal / tenorMonths + principal * ratePa / 1200;
  }

  function instalment(principal, ratePa, tenorMonths, method) {
    var m = methodOf(method);
    if (m === 'anuitas') return annuityInstalment(principal, ratePa, tenorMonths);
    if (m === 'flat') return flatInstalment(principal, ratePa, tenorMonths);
    return null;
  }

  /* ------------------------------------------------------------ capacity */

  /**
   * The income base and the monthly obligations already running, from numbers or from a takeHome
   * (estimateTakeHome() result). Salary cuts reported in takeHome (cicilan potong gaji, potongan lain)
   * count IN FULL as obligations, never as a lower income: a lower income would only take capPct% of
   * them off the room and overstate the plafon.
   */
  function capacityBase(o) {
    var ex = blank(o.existingInstalments) ? 0 : o.existingInstalments;
    if (!isNum(ex) || ex < 0) return { ok: false, status: STATUS.DATA_INVALID, pesan: 'Angsuran yang sedang berjalan harus angka rupiah, 0 atau lebih.' };
    var th = o.takeHome;
    if (blank(th)) {
      if (blank(o.incomeNet)) return { ok: false, status: STATUS.DATA_MISSING, kurang: ['incomeNet'], pesan: 'Penghasilan bersih per bulan belum diisi.' };
      if (!isNum(o.incomeNet) || o.incomeNet < 0) return { ok: false, status: STATUS.DATA_INVALID, pesan: 'Penghasilan bersih harus angka rupiah, 0 atau lebih.' };
      return { ok: true, income: o.incomeNet, ex: ex, potGaji: 0, sumber: 'diisi' };
    }
    if (!blank(o.incomeNet)) return { ok: false, status: STATUS.DATA_INVALID, pesan: 'Isi penghasilan bersih atau pakai hasil perkiraan gaji, jangan keduanya.' };
    if (typeof th !== 'object' || !has(th, 'bersih') || !has(th, 'ok')) return { ok: false, status: STATUS.DATA_INVALID, pesan: 'Hasil perkiraan gaji tidak dikenali. Hitung ulang perkiraan gajinya.' };
    if (!th.ok) return { ok: false, status: th.status || STATUS.DATA_MISSING, pesan: th.pesan || 'Perkiraan gaji belum berhasil dihitung.' };
    var pg = th.totalPotonganGaji;
    if (!isNum(th.bersih) || th.bersih < 0 || !isNum(pg) || pg < 0) return { ok: false, status: STATUS.DATA_INVALID, pesan: 'Hasil perkiraan gaji tidak lengkap. Hitung ulang perkiraan gajinya.' };
    return { ok: true, income: th.bersih, ex: ex, potGaji: pg, sumber: 'perkiraan-gaji' };
  }

  /**
   * ruangAngsuran({incomeNet | takeHome, capPct, existingInstalments}) → room for a new instalment per
   * month: income × capPct% − (existingInstalments + takeHome.totalPotonganGaji), never below 0.
   * Raw (unrounded) in `ruang`.
   */
  function ruangAngsuran(o) {
    o = o || {};
    var pc = policyCheck(o, ['capPct']);
    if (!pc.ok) return { ok: false, status: pc.status, kurang: pc.kurang, salah: pc.salah, ruang: null, pesan: pc.pesan };
    var b = capacityBase(o);
    if (!b.ok) return { ok: false, status: b.status, kurang: b.kurang || [], ruang: null, pesan: b.pesan };
    var kewajiban = b.ex + b.potGaji;
    var batas = b.income * o.capPct / 100, ruang = Math.max(0, batas - kewajiban);
    var rincian = [];
    if (b.ex > 0 || b.potGaji === 0) rincian.push('angsuran berjalan ' + rp(b.ex));
    if (b.potGaji > 0) rincian.push('potongan gaji ' + rp(b.potGaji));
    // The base shown is floored like tampil.bersih, so it matches the take-home figure staff see.
    var dasar = b.sumber === 'perkiraan-gaji' ? floor1000(b.income) : b.income;
    return {
      ok: true, status: ruang > 0 ? STATUS.OK : STATUS.NO_ROOM,
      incomeNet: b.income, sumberPenghasilan: b.sumber, capPct: o.capPct, batasAngsuran: batas,
      existingInstalments: b.ex, potonganGaji: b.potGaji, totalKewajiban: kewajiban, ruang: ruang,
      pesan: ruang > 0
        ? 'Ruang angsuran baru ' + rp(floor1000(ruang)) + ' per bulan (' + pct(o.capPct) + ' dari ' + rp(dasar) + ', dikurangi ' + rincian.join(' dan ') + ').'
        : 'Tidak ada ruang angsuran baru: ' + rincian.join(' dan ') + ' sudah mencapai batas ' + rp(batas) + '.'
    };
  }

  /**
   * maxLoan({incomeNet | takeHome, capPct, existingInstalments, ratePa, tenorMonths, method}) → the
   * largest plafon whose instalment fits the room (floor to Rp 1.000; a limit is never rounded up).
   */
  function maxLoan(o) {
    o = o || {};
    var keys = ['capPct', 'ratePa', 'tenorMonths', 'method'];
    var pc = policyCheck(o, keys);
    if (!pc.ok) return { ok: false, status: pc.status, kurang: pc.kurang, salah: pc.salah, plafon: null, pesan: pc.pesan };
    var r = ruangAngsuran(o);
    if (!r.ok) return { ok: false, status: r.status, kurang: r.kurang || [], plafon: null, pesan: r.pesan };
    var kebijakan = echoPolicy(o, keys);
    var base = {
      ok: true, ruangAngsuran: r.ruang, batasAngsuran: r.batasAngsuran, incomeNet: r.incomeNet, sumberPenghasilan: r.sumberPenghasilan,
      existingInstalments: r.existingInstalments, potonganGaji: r.potonganGaji, totalKewajiban: r.totalKewajiban, kebijakan: kebijakan
    };
    if (!(r.ruang > 0)) {
      return Object.assign(base, { status: STATUS.NO_ROOM, plafon: 0, angsuran: 0, angsuranTampil: 0, pesan: r.pesan });
    }
    var unit = instalment(1, o.ratePa, o.tenorMonths, kebijakan.method);
    var plafon = unit > 0 ? floor1000(r.ruang / unit) : 0;
    var a = instalment(plafon, o.ratePa, o.tenorMonths, kebijakan.method);
    return Object.assign(base, {
      status: STATUS.OK, plafon: plafon, angsuran: a, angsuranTampil: dispRp(a),
      pesan: 'Perkiraan plafon paling tinggi ' + rp(plafon) + ' (angsuran ' + kebijakan.method + ' ' + rp(roundRp(a)) + ' per bulan, ' +
        o.tenorMonths + ' bulan, bunga ' + pct(o.ratePa) + ' per tahun). Perkiraan untuk percakapan, bukan persetujuan kredit.'
    });
  }

  /**
   * kkb({price, dpPct, ratePa, tenorMonths, method, feesOptional}) → vehicle loan instalment and totals.
   * Fees are only those the branch enters (no default fee anywhere).
   */
  function kkb(o) {
    o = o || {};
    var keys = ['dpPct', 'ratePa', 'tenorMonths', 'method'];
    var pc = policyCheck(o, keys);
    if (!pc.ok) return { ok: false, status: pc.status, kurang: pc.kurang, salah: pc.salah, angsuran: null, pesan: pc.pesan };
    if (blank(o.price)) return { ok: false, status: STATUS.DATA_MISSING, kurang: ['price'], angsuran: null, pesan: 'Harga kendaraan belum diisi.' };
    if (!isNum(o.price) || o.price <= 0) return { ok: false, status: STATUS.DATA_INVALID, angsuran: null, pesan: 'Harga kendaraan harus angka rupiah lebih dari 0.' };
    var f = o.feesOptional || {}, feeErr = null;
    function fee(k) {
      if (blank(f[k])) return 0;
      if (!isNum(f[k]) || f[k] < 0 || (k === 'provisiPct' && f[k] >= 100)) { feeErr = k; return 0; }
      return f[k];
    }
    var provisiPct = fee('provisiPct'), adminRp = fee('adminRp'), asuransiRp = fee('asuransiRp'), lainRp = fee('lainRp');
    if (feeErr) return { ok: false, status: STATUS.DATA_INVALID, angsuran: null, pesan: 'Biaya "' + feeErr + '" harus angka 0 atau lebih (provisi dalam persen, di bawah 100%).' };
    var kebijakan = echoPolicy(o, keys), n = o.tenorMonths;
    var uangMuka = o.price * o.dpPct / 100, pokok = o.price - uangMuka;
    var a = instalment(pokok, o.ratePa, n, kebijakan.method);
    var totalAngsuran = a * n;
    var biaya = { provisi: pokok * provisiPct / 100, admin: adminRp, asuransi: asuransiRp, lain: lainRp };
    biaya.total = biaya.provisi + biaya.admin + biaya.asuransi + biaya.lain;
    var catatan = ['Biaya yang dihitung hanya yang diisi. Provisi, administrasi, asuransi kendaraan dan jiwa, serta fidusia mengikuti kebijakan bank dan diler.'];
    if (kebijakan.method === 'flat') catatan.push('Bunga flat dihitung dari pokok awal setiap bulan; bunga efektifnya lebih tinggi dari angka flat.');
    return {
      ok: true, status: STATUS.OK, harga: o.price, uangMuka: uangMuka, pokok: pokok,
      angsuran: a, angsuranTampil: dispRp(a), totalAngsuran: totalAngsuran, totalBunga: totalAngsuran - pokok,
      biayaAwal: biaya, bayarDiMuka: uangMuka + biaya.total, kebijakan: kebijakan, catatan: catatan,
      pesan: 'Angsuran ' + rp(roundRp(a)) + ' per bulan selama ' + n + ' bulan (' + kebijakan.method + ', bunga ' + pct(o.ratePa) +
        ' per tahun), uang muka ' + rp(uangMuka) + '. Perkiraan, bukan penawaran resmi.'
    };
  }

  /**
   * fits(capacity, instalment) → does the instalment fit the room?
   * capacity: Rp, or a maxLoan() / ruangAngsuran() result; instalment: Rp, or a kkb() result.
   */
  function fits(capacity, inst) {
    var c = capacity, a = inst;
    if (c && typeof c === 'object') {
      if (c.status === STATUS.POLICY_MISSING || c.status === STATUS.POLICY_INVALID) return { ok: false, status: c.status, muat: null, kurang: c.kurang || [], pesan: c.pesan };
      c = has(c, 'ruangAngsuran') ? c.ruangAngsuran : c.ruang;
    }
    if (a && typeof a === 'object') {
      if (a.status === STATUS.POLICY_MISSING || a.status === STATUS.POLICY_INVALID) return { ok: false, status: a.status, muat: null, kurang: a.kurang || [], pesan: a.pesan };
      a = a.angsuran;
    }
    if (!isNum(c) || !isNum(a) || c < 0 || a < 0) {
      return { ok: false, status: STATUS.DATA_MISSING, muat: null, pesan: 'Ruang angsuran dan angsuran harus sudah dihitung (angka rupiah, 0 atau lebih).' };
    }
    var muat = a <= c, sisa = c - a;
    return {
      ok: true, status: muat ? STATUS.FITS : STATUS.NO_FIT, muat: muat, ruang: c, angsuran: a, sisa: sisa,
      pemakaianPct: c > 0 ? a / c * 100 : null,
      pesan: muat
        ? 'Masih muat: angsuran ' + rp(a) + ' dari ruang ' + rp(c) + ' (sisa ' + rp(sisa) + ').'
        : 'Tidak muat: angsuran ' + rp(a) + ' melebihi ruang ' + rp(c) + ' sebesar ' + rp(-sisa) + '.'
    };
  }

  /* ---------------------------------------------------------- pay tables */

  function tableOf(t) { return t || (root && root.MCD_TNI_PAY) || null; }
  function norm(s) { return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]+/g, ''); }

  var EXTRA_ALIAS = { KAPT: 'KAPTEN', KOL: 'KOLONEL' };

  /**
   * findPangkat(s, table?) → pangkat row | null. The longest run of leading words that names a pangkat wins,
   * so 'Letnan Kolonel Inf' is LETKOL, 'Mayor Jenderal' is MAYJEN and 'Kolonel Laut (E)' is KOLONEL.
   */
  function findPangkat(s, table) {
    var T = tableOf(table);
    if (!T || !T.pangkat || s == null) return null;
    if (typeof s === 'object') s = s.kode || s.code || '';
    var byKey = {};
    T.pangkat.forEach(function (p) {
      byKey[norm(p.kode)] = p;
      (p.alias || []).forEach(function (a) { byKey[norm(a)] = p; });
    });
    Object.keys(EXTRA_ALIAS).forEach(function (k) {
      var p = byKey[norm(EXTRA_ALIAS[k])];
      if (p && !byKey[k]) byKey[k] = p;
    });
    var words = String(s).replace(/\([^)]*\)/g, ' ').split(/[^A-Za-z0-9]+/).filter(Boolean);
    for (var n = words.length; n >= 1; n--) {
      var hit = byKey[norm(words.slice(0, n).join(''))];
      if (hit) return hit;
    }
    return null;
  }

  /**
   * gajiPokok(pangkat, mkg, table?) → {gaji, mkgTabel, posisi} | null
   * A blank MKG row takes the nearest lower MKG with a value; above the table the last value; below it
   * the first value (gaji pokok permulaan, PP 28/2001 Pasal 3-4).
   */
  function gajiPokok(pangkat, mkg, table) {
    var T = tableOf(table);
    var p = pangkat && typeof pangkat === 'object' && pangkat.golongan ? pangkat : findPangkat(pangkat, T);
    if (!T || !p || !isNum(mkg) || mkg < 0) return null;
    var row = T.gajiPokok && T.gajiPokok.tabel && T.gajiPokok.tabel[p.kode];
    if (!row || !row.mkg || !row.mkg.length) return null;
    var m = Math.floor(mkg), k = -1;
    for (var i = 0; i < row.mkg.length; i++) if (row.mkg[i] <= m) k = i;
    if (k < 0) return { gaji: row.gaji[0], mkgTabel: row.mkg[0], posisi: 'di-bawah-tabel' };
    return { gaji: row.gaji[k], mkgTabel: row.mkg[k], posisi: m > row.mkg[row.mkg.length - 1] ? 'di-atas-tabel' : 'tabel' };
  }

  function srcRef(T, id) {
    var s = T.sources && T.sources[id];
    return s ? { id: id, nomor: s.nomor, pasal: s.pasal, url: s.url || s.pengumuman || null } : { id: id, nomor: id, pasal: '', url: null };
  }
  function fail(status, pesan, extra) {
    var o = { ok: false, status: status, pesan: pesan, komponen: [], potongan: [], kotor: null, totalPotongan: null, bersih: null, potonganGaji: [], totalPotonganGaji: null, perkiraan: true };
    return extra ? Object.assign(o, extra) : o;
  }

  /**
   * estimateTakeHome(input, table?) → a take-home estimate from the official TNI pay tables.
   * See the header for the input. Raw values; tampil.kotor uses dispRp, tampil.bersih floor1000.
   */
  function estimateTakeHome(input, table) {
    var T = tableOf(table), o = input || {};
    if (!T || !T.gajiPokok) return fail(STATUS.NO_TABLE, 'Tabel gaji TNI belum dimuat (data/tni-pay.js).');
    var p = findPangkat(o.pangkat, T);
    if (!p) return fail(STATUS.UNKNOWN_RANK, 'Pangkat "' + (o.pangkat == null ? '' : (o.pangkat.kode || o.pangkat.code || o.pangkat)) + '" tidak dikenal. Contoh isian: Serda, Kopka, Kapten, Kolonel.');
    if (!isNum(o.mkg) || o.mkg < 0 || o.mkg > 60) return fail(STATUS.DATA_INVALID, 'Masa kerja golongan (MKG) harus angka tahun, 0 sampai 60.');
    var tg = o.tanggungan || {};
    var anakIn = blank(tg.anak) ? 0 : tg.anak;
    if (!isNum(anakIn) || anakIn < 0) return fail(STATUS.DATA_INVALID, 'Jumlah anak harus angka 0 atau lebih.');
    var hari = blank(o.hariKalender) ? 30 : o.hariKalender;
    if (!isNum(hari) || Math.floor(hari) !== hari || hari < 28 || hari > 31) return fail(STATUS.DATA_INVALID, 'Jumlah hari kalender harus 28, 29, 30 atau 31.');
    var beras = blank(o.beras) ? 'uang' : String(o.beras).toLowerCase();
    if (beras !== 'uang' && beras !== 'natura') return fail(STATUS.DATA_INVALID, 'Tunjangan beras harus "uang" atau "natura".');
    var cicilanGaji = blank(o.cicilanPotongGaji) ? 0 : o.cicilanPotongGaji;
    if (!isNum(cicilanGaji) || cicilanGaji < 0) return fail(STATUS.DATA_INVALID, 'Cicilan yang dipotong dari gaji harus angka rupiah, 0 atau lebih.');
    var potLain = blank(o.potonganLain) ? 0 : o.potonganLain;
    if (!isNum(potLain) || potLain < 0) return fail(STATUS.DATA_INVALID, 'Potongan lain harus angka rupiah, 0 atau lebih.');
    var kelas = blank(o.kelasJabatan) ? null : o.kelasJabatan;
    if (kelas !== null && !(isNum(kelas) && Math.floor(kelas) === kelas && kelas >= 1 && kelas <= 17)) {
      return fail(STATUS.DATA_INVALID, 'Kelas jabatan harus bilangan bulat 1 sampai 17, atau dikosongkan bila belum diketahui.');
    }
    var TJS = T.tunjanganJabatanStruktural || {}, golJab = blank(o.golonganJabatan) ? null : String(o.golonganJabatan).toUpperCase();
    if (golJab !== null && !has(TJS.perGolonganJabatan, golJab)) return fail(STATUS.DATA_INVALID, 'Golongan jabatan harus I sampai IX.');
    var tjRp = blank(o.tunjanganJabatanRp) ? null : o.tunjanganJabatanRp;
    if (tjRp !== null && (!isNum(tjRp) || tjRp < 0)) return fail(STATUS.DATA_INVALID, 'Tunjangan jabatan harus angka rupiah, 0 atau lebih.');

    var used = {}, komponen = [], potongan = [], potonganGaji = [], catatan = [];
    function use(id) { if (id) [].concat(id).forEach(function (x) { used[x] = 1; }); }
    function add(list, kode, label, nilai, sumber, perkiraan, ket) {
      var r = { kode: kode, label: label, nilai: nilai, perkiraan: !!perkiraan, sumber: sumber };
      if (ket) r.keterangan = ket;
      list.push(r); use(sumber);
      return r;
    }

    // Gaji pokok (PP 6/2024 Lampiran)
    var gp = gajiPokok(p, o.mkg, T), gapok = gp.gaji;
    add(komponen, 'gajiPokok', 'Gaji pokok', gapok, T.gajiPokok.sumber, false, p.label + ', MKG ' + Math.floor(o.mkg) + ' (Lampiran MKG ' + gp.mkgTabel + ')');
    if (gp.posisi === 'di-atas-tabel') catatan.push('MKG ' + Math.floor(o.mkg) + ' di atas tabel pangkat ini: dipakai gaji pokok MKG ' + gp.mkgTabel + ' (tertinggi).');
    if (gp.posisi === 'di-bawah-tabel') catatan.push('MKG ' + Math.floor(o.mkg) + ' di bawah tabel pangkat ini: dipakai gaji pokok permulaan (MKG ' + gp.mkgTabel + ').');

    // Tunjangan keluarga (PP 28/2001 Pasal 12; Permenhan 33/2017 Pasal 16-17)
    var TK = T.tunjanganKeluarga, pasangan = !!tg.pasangan;
    var anak = Math.floor(anakIn), anakHit = Math.min(anak, TK.anakMaks);
    var tPas = pasangan ? gapok * TK.pasanganPct / 100 : 0;
    var tAnak = gapok * TK.anakPctPerAnak / 100 * anakHit;
    if (pasangan) add(komponen, 'tunjanganPasangan', 'Tunjangan istri/suami (' + pct(TK.pasanganPct) + ')', tPas, TK.sumber, false);
    if (anakHit > 0) add(komponen, 'tunjanganAnak', 'Tunjangan anak (' + anakHit + ' anak × ' + pct(TK.anakPctPerAnak) + ')', tAnak, TK.sumber, false);
    if (anak > TK.anakMaks) catatan.push('Tunjangan anak paling banyak untuk ' + TK.anakMaks + ' anak; ' + (anak - TK.anakMaks) + ' anak lainnya tidak dihitung.');
    if (pasangan) catatan.push('Bila pasangan juga prajurit TNI, anggota Polri atau PNS, tunjangan istri/suami hanya dibayar kepada salah satu.');

    // Tunjangan beras (Permenhan 33/2017 Pasal 18; PER-3/PB/2015 Pasal 3)
    var TB = T.tunjanganBeras, jiwa = (pasangan ? 1 : 0) + anakHit;
    var kg = TB.kgPrajurit + TB.kgPerAnggotaKeluarga * jiwa;
    if (beras === 'uang') {
      add(komponen, 'tunjanganBeras', 'Tunjangan beras (' + kg + ' kg × ' + rp(TB.hargaUangPerKg) + ')', kg * TB.hargaUangPerKg, TB.sumber, false);
    } else {
      add(komponen, 'tunjanganBeras', 'Tunjangan beras (' + kg + ' kg, natura)', 0, TB.sumber, false, 'Diterima dalam bentuk beras, tidak menambah uang tunai.');
    }

    // Tunjangan jabatan struktural (Perpres 15/2006) or the manual amount, else tunjangan umum (Perpres 14/2006)
    var tJabUmum = 0;
    if (golJab !== null) {
      tJabUmum = TJS.perGolonganJabatan[golJab];
      add(komponen, 'tunjanganJabatan', 'Tunjangan jabatan struktural (golongan jabatan ' + golJab + ')', tJabUmum, TJS.sumber, true, 'Tergantung jabatan yang diduduki.');
    } else if (tjRp !== null) {
      tJabUmum = tjRp;
      add(komponen, 'tunjanganJabatan', 'Tunjangan jabatan (diisi pengguna)', tJabUmum, null, true);
    } else {
      tJabUmum = T.tunjanganUmum.perBulan;
      add(komponen, 'tunjanganUmum', 'Tunjangan umum', tJabUmum, T.tunjanganUmum.sumber, false, 'Hanya bila tidak menerima tunjangan jabatan.');
    }

    // Uang lauk pauk (PMK 32/2025 Lampiran I butir 22.2; Permenhan 33/2017 Pasal 20)
    var UL = T.uangLaukPauk, ulp = UL.perHari * hari;
    add(komponen, 'uangLaukPauk', 'Uang lauk pauk (' + hari + ' hari × ' + rp(UL.perHari) + ')', ulp, UL.sumber, false, 'Standar biaya TA ' + UL.tahunAnggaran + ', per hari kalender.');

    // Tunjangan kinerja (per kelas jabatan; posting-dependent)
    var TKin = T.tunjanganKinerja || {}, tKey = blank(o.tukinTabel) ? TKin.tabelBerlaku : o.tukinTabel;
    var tTab = TKin.tabel && TKin.tabel[tKey], tukin = 0;
    if (kelas === null) {
      catatan.push('Kelas jabatan belum diisi: tunjangan kinerja tidak dihitung. Kelas jabatan tergantung jabatan, tanyakan ke juru bayar satuan.');
    } else if (!tTab) {
      return fail(STATUS.DATA_INVALID, 'Tabel tunjangan kinerja "' + tKey + '" tidak ada.');
    } else if (!tTab.kelas || !isNum(tTab.kelas[kelas])) {
      use(tTab.sumber);
      catatan.push('Tabel tunjangan kinerja ' + srcRef(T, tTab.sumber).nomor + ' belum diisi dari teks resmi: tunjangan kinerja tidak dihitung.');
    } else {
      tukin = tTab.kelas[kelas];
      add(komponen, 'tunjanganKinerja', 'Tunjangan kinerja (kelas jabatan ' + kelas + ')', tukin, tTab.sumber, true, 'Tergantung jabatan dan capaian kinerja bulanan.');
      if (tTab.sumber === 'perpres102_2018') {
        catatan.push('Tunjangan kinerja memakai tabel Perpres 102/2018. Perpres 42/2026 sudah menggantikannya, tetapi teks resminya belum dapat dibaca; angka ini bisa lebih rendah dari yang diterima sekarang.');
      }
    }

    // Potongan wajib (PP 102/2015; Perpres 82/2018 jo. 75/2019, 64/2020, 59/2024)
    var IU = T.iuran, penghasilan = gapok + tPas + tAnak;
    add(potongan, 'asabriPensiun', 'Iuran pensiun ASABRI (' + pct(IU.asabriPensiunPct) + ')', penghasilan * IU.asabriPensiunPct / 100, 'pp102_2015', false, 'Dari gaji pokok + tunjangan keluarga.');
    add(potongan, 'asabriTht', 'Iuran THT ASABRI (' + pct(IU.asabriThtPct) + ')', penghasilan * IU.asabriThtPct / 100, 'pp102_2015', false, 'Dari gaji pokok + tunjangan keluarga.');
    var dasarBpjs = penghasilan + tJabUmum + tukin, dasarBpjsDipakai = Math.min(dasarBpjs, IU.bpjsBatasAtasDasar);
    add(potongan, 'bpjsKesehatan', 'Iuran BPJS Kesehatan (' + pct(IU.bpjsPesertaPct) + ')', dasarBpjsDipakai * IU.bpjsPesertaPct / 100, 'perpres82_2018', false,
      dasarBpjs > IU.bpjsBatasAtasDasar ? 'Dasar iuran dibatasi ' + rp(IU.bpjsBatasAtasDasar) + '.' : 'Dari gaji pokok, tunjangan keluarga, tunjangan jabatan/umum dan tunjangan kinerja.');
    use(T.pph21 && T.pph21.sumber);
    catatan.push('PPh Pasal 21 atas gaji, tunjangan dan tunjangan kinerja ditanggung pemerintah: tunjangan PPh dan potongan PPh sama besar, jadi tidak dihitung.');

    // Salary cuts the member reports: kept OUT of bersih, counted in full against the room by maxLoan({takeHome}).
    if (cicilanGaji > 0) add(potonganGaji, 'cicilanPotongGaji', 'Cicilan pinjaman yang dipotong dari gaji (diisi pengguna)', cicilanGaji, null, true, 'Dihitung penuh sebagai angsuran berjalan.');
    if (potLain > 0) add(potonganGaji, 'potonganLain', 'Potongan lain di luar cicilan (diisi pengguna)', potLain, null, true, 'Dihitung penuh sebagai kewajiban bulanan.');
    if (cicilanGaji > 0 || potLain > 0) {
      catatan.push('Cicilan potong gaji dan potongan lain yang diisi tidak mengurangi penghasilan bersih di atas. Saat menghitung plafon, keduanya dikurangkan penuh dari ruang angsuran, sama seperti angsuran berjalan.');
    } else {
      catatan.push('Potongan di luar iuran wajib belum diisi. Tanyakan cicilan pinjaman yang sudah dipotong dari gaji (isi sebagai cicilan potong gaji) dan potongan lain seperti simpanan koperasi, TWP atau sewa rumah dinas (isi sebagai potongan lain).');
    }
    catatan.push('Perkiraan untuk percakapan, bukan persetujuan kredit. Cek SLIK dan keputusan kredit tetap lewat proses resmi bank.');

    var kotor = 0, totPot = 0, totPotGaji = 0;
    komponen.forEach(function (r) { kotor += r.nilai; });
    potongan.forEach(function (r) { totPot += r.nilai; });
    potonganGaji.forEach(function (r) { totPotGaji += r.nilai; });
    var bersih = kotor - totPot;
    var sumber = Object.keys(used).filter(function (id) { return T.sources && T.sources[id]; }).map(function (id) { return srcRef(T, id); });

    return {
      ok: true, status: STATUS.OK,
      pesan: 'Perkiraan penghasilan bersih ' + rp(floor1000(bersih)) + ' per bulan (' + p.label + ', MKG ' + Math.floor(o.mkg) + ').' +
        (totPotGaji > 0 ? ' Potongan gaji yang diisi ' + rp(totPotGaji) + ' dihitung sebagai kewajiban bulanan.' : ''),
      pangkat: { kode: p.kode, label: p.label, golongan: p.golongan, ruang: p.ruang, kelompok: p.kelompok },
      mkg: Math.floor(o.mkg), gajiPokokInfo: gp, kelasJabatan: kelas,
      tanggungan: { pasangan: pasangan, anak: anak, anakDihitung: anakHit },
      komponen: komponen, kotor: kotor, potongan: potongan, totalPotongan: totPot, bersih: bersih,
      potonganGaji: potonganGaji, totalPotonganGaji: totPotGaji,
      tampil: { kotor: dispRp(kotor), bersih: floor1000(bersih) },
      perkiraan: true, catatan: catatan, sumber: sumber
    };
  }

  return {
    ready: true, version: '1.1.0',
    STATUS: STATUS, METHODS: METHODS.slice(), POLICY_LABELS: POLICY_LABELS,
    floor1000: floor1000, dispRp: dispRp, roundRp: roundRp, rp: rp, pct: pct,
    policyCheck: policyCheck,
    annuityInstalment: annuityInstalment, flatInstalment: flatInstalment, instalment: instalment,
    ruangAngsuran: ruangAngsuran, maxLoan: maxLoan, kkb: kkb, fits: fits,
    findPangkat: findPangkat, gajiPokok: gajiPokok, estimateTakeHome: estimateTakeHome
  };
});
