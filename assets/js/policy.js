/* ==========================================================================
 * MCD.policy: bank policy numbers entered by the branch (v7, docs/V7_SPEC.md §1.7.1, D18, D19, D22,
 * D27, D30, D31; COPY_STYLE_EN item 48 "rates, caps and the Prioritas threshold are entered by the
 * branch and kept in the vault, never in the repo").
 *
 * EVERY KEY STARTS EMPTY. This file holds no default, fallback or example number for any policy key:
 * the branch types the numbers in Data & Privasi › Kebijakan & leads, they live in this module's memory
 * for the session and in the encrypted copy (vault payload `policy`), never in localStorage,
 * sessionStorage, IndexedDB, the URL, the console or the repository. Messages repeat the user's own
 * number; no hint, error or label carries a fixed example number (D18).
 *
 * Classic IIFE + UMD: MCD.policy in the browser, module.exports in Node. No DOM writes, no storage, no
 * network. Optional reads at call time only (feature-detected): MCD.config.dsrCap (forKpr's v5 Asumsi,
 * D19), MCD.data.demoActive (Data contoh), MCD.leads.configure (fed on every leads.* change).
 * Listens to 'mcd:gate-locking' on document and calls reset().
 *
 * Keys, in display order (KEYS); each follows one rule of RULES (KEY_RULE), whose ranges are those of
 * the spec table §1.7.1. No line of this file puts a number next to a key name (a test checks it).
 *   caps (ksm.capPct, kkb.capPct, risk.ksmShareMaxPct): percent; a fraction is refused
 *   rates (ksm.ratePa, kkb.ratePa): percent; a rate under one percent is accepted with a check
 *   tenors (ksm.tenorMonths, kkb.tenorMonths, leads.topUpMaxTenor): whole months
 *   methods (ksm.method, kkb.method): 'anuitas' | 'flat'
 *   kkb.dpPct: percent, zero allowed; a fraction is refused
 *   kkb.provisiPct: percent, no fraction rule (a provisi under one percent is common)
 *   kkb.adminRp, kkb.asuransiRp: whole rupiah, zero allowed
 *   tni.incomeBase: 'semua' | 'tanpa-lauk-pauk' | 'tanpa-lauk-pauk-tukin' (which income counts is policy)
 *   tni.minSisaRp, leads.prioritasThreshold, leads.kkbMinIncome, leads.kprMinIncome: whole rupiah above zero
 *   kpr.capPct: percent within the range of config.dsrCap; empty = the Asumsi of Pengaturan & sumber
 *   leads.k: whole, never below the lead floor nor the current value ("Hanya dapat dinaikkan.")
 * Optional (OPTIONAL): kkb.provisiPct, kkb.adminRp, kkb.asuransiRp, tni.minSisaRp (empty = no floor),
 * risk.ksmShareMaxPct (empty = no limit line), kpr.capPct, leads.k (empty = the lead floor).
 * leads.topUpMaxTenor is required by its rule: empty = Calon top up KSM off.
 * Decisions behind these rules: D18 (fractions, no example numbers), D19 (KPR Asumsi), D22 (KSM share
 * limit), D30 (remaining-income floor), D31 (top-up tenor). The lead floor is the item-48 rule "groups
 * under 5 hidden" (GROUP_FLOOR, the same as MCD.leads.MIN_K), a product rule and not bank policy.
 *
 * Input: Indonesian format. Decimal comma, dot grouping, optional "%" (percent keys), "Rp" (rupiah keys)
 * and "bulan" (month keys), ",-" or ",00" after rupiah. A lone dot that is not a grouping ("7.5", "0.4")
 * is read as a decimal point on percent keys only. Short forms ("500 jt", "1,5 M", "750 rb") are refused
 * and the message writes the user's number out in full. Values are stored as numbers (choices as their id).
 *
 * API (contract §1.7.1; additions marked +)
 *   KEYS · LABELS · UNITS · + NAMES (short names for lists and the Riwayat) · + HINTS · + CHOICES
 *   + GROUPS (the four policy groups and the thresholds card, D37) · + REQUIRED {ksm, kkb, leads}
 *   + OPTIONAL · + ACTS · + LOG_MAX · + MESSAGES
 *   get(key) → number | string | null
 *   all() → {values (filled keys only), filled: {<key>: ISO}, savedAt: ISO | null}
 *   missing(keys?) → [key]          empty or invalid; keys omitted = every required key
 *   set(patch, {source: 'user' | 'vault'}) → {ok, changed: [key], errors: [{key, code, pesan}], + warnings}
 *       ATOMIC: one error and nothing changes. '' or null clears a key. source 'user' marks dirty,
 *       stamps fill dates and writes its own Riwayat entry ('policy-set'; 'leads-k' for k), and is refused
 *       while Data contoh is on (nothing is logged there, §8.5, so nothing may change unlogged).
 *   clear(keys?, + {lowerK}) → changed   keys omitted = the policy card (every key outside the leads
 *       group). 'leads.k' is cleared only with {lowerK: true}: the "Matikan dan hapus daftar leads" flow
 *       (§8.2). Logs 'policy-clear' (and 'leads-k' when k goes down). Refused ([]) under Data contoh.
 *   + parse(key, raw) → {ok, value, code?, pesan?, warning?}   one field, nothing stored (on blur)
 *   + format(key, v?) → field text ('7,5', '500.000.000', 'anuitas') · + text(key, v?) → '7,5%',
 *     'Rp500.000.000', '180 bulan', 'anuitas' · + listText(keys) → 'batas angsuran KSM dan suku bunga KSM'
 *   + groupStatus(id) → {id, label, optional, keys, required, missing, filled, date, complete}
 *   on(fn) → off                     fn({keys, source, dirty}); also document event 'mcd:policy' (same
 *       detail, key names only, never values). source: 'user' | 'vault' | 'reset' | 'log' | 'saved'.
 *   filledDate(keys?) → ISO | null   newest fill date among the keys ("Kebijakan bank · diisi {tanggal}")
 *   forLoanCap('ksm' | 'kkb') → {ok: true, capPct, ratePa, tenorMonths, method, + incomeBase,
 *       dpPct (kkb), feesOptional (kkb: only filled fees)} | {ok: false, missing: [key]}   PERCENT units,
 *       as MCD.loanCap takes them
 *   incomeBase() → 'semua' | 'tanpa-lauk-pauk' | 'tanpa-lauk-pauk-tukin' | null
 *   forLeads() → {prioritasThreshold, kkbMinIncome, kprMinIncome, topUpMaxTenor, k}   null thresholds
 *       while empty; topUpMaxTenor null while empty (the rule is shown off, D31); k = the stored value or
 *       the item-48 floor
 *   forKpr() → {dsr: fraction, pct: percent, source: 'kebijakan' | 'asumsi'}   THE ONLY PLACE THAT
 *       CONVERTS percent ↔ fraction. 'asumsi' reads MCD.config.dsrCap (null pair when it is absent).
 *   ksmShareMax() → percent | null · minSisa() → Rp | null
 *   actor() → initials | null · setActor(initials) → {ok, pesan?}   2–4 letters, upper-cased, memory only
 *   log(act, detail) → entry | null  the acts LEADS UI and SHELL write: 'leads-on', 'leads-import'
 *       ({fp, m, asOf}), 'leads-off', 'leads-expired' ({asOf}). 'policy-set', 'policy-clear' and 'leads-k'
 *       are written by set() and clear() only (log() refuses them, so a caller cannot double-log).
 *       Every detail passes an allowlist: key names, old and new policy values, a 12-hex file code, a
 *       customer total (below the floor it becomes '<5'), a data date. Never a file name, CIF key, row
 *       number or unit code. At most LOG_MAX entries, oldest dropped. No call deletes or edits an entry.
 *   history() → [entry] newest first (copies) · + capped() → true once entries were dropped
 *   + describe(entry) → the Riwayat row text of §8.5 (and `changes` for the row's fold)
 *   dirty() → true while values or the Riwayat changed since the last saved encrypted copy
 *   vaultExport() → {v: 1, values, filled, log, + capped?} | null (nothing to keep)
 *   vaultLoad(obj) → replaces the session state from payload.policy (each value re-checked, each log
 *       entry re-sanitised); not dirty afterwards. Call it BEFORE log('leads-expired') at sign-in.
 *   markSaved(savedISO) → clean up to the last vaultExport() (a change made after the export stays dirty)
 *   reset() → values, fill dates, Riwayat (memory) and initials dropped; on 'mcd:gate-locking'. Not for
 *       "Hapus semua data": the Riwayat survives that (§8.5).
 *   _clock(fn) (tests only: fn() → ms)
 *
 * Wiring the SHELL / DATA lanes do (§1.7.1): app.js calls vaultLoad(payload.policy) at sign-in before
 * applyVault, writes next.policy = vaultExport() in saveEncrypted() and calls markSaved() after the file
 * is written; dirty() lights the top-bar "Data belum disimpan". This module itself calls
 * MCD.leads.configure(forLeads()) whenever a leads.* key changes (vault or user), so the lead module
 * never holds a threshold the branch has not entered.
 * User-facing strings are plain Indonesian (COPY_DECK_ID §1).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) {
    root.MCD = root.MCD || {};
    root.MCD.policy = api;
    // The gate dispatches 'mcd:gate-locking' on document (no bubbling): drop values, Riwayat and initials.
    try { if (root.document && root.document.addEventListener) root.document.addEventListener('mcd:gate-locking', api.reset); } catch (e) { /* no document */ }
  }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  /* ================================================================== keys */

  var KEYS = [
    'ksm.capPct', 'kkb.capPct',
    'ksm.ratePa', 'kkb.ratePa',
    'ksm.tenorMonths', 'kkb.tenorMonths',
    'ksm.method', 'kkb.method',
    'kkb.dpPct',
    'kkb.provisiPct', 'kkb.adminRp', 'kkb.asuransiRp',
    'tni.incomeBase',
    'tni.minSisaRp',
    'risk.ksmShareMaxPct',
    'kpr.capPct',
    'leads.prioritasThreshold', 'leads.kkbMinIncome', 'leads.kprMinIncome', 'leads.topUpMaxTenor', 'leads.k'
  ];

  var LABELS = {
    'ksm.capPct': 'Batas angsuran (% dari penghasilan bersih)',
    'kkb.capPct': 'Batas angsuran (% dari penghasilan bersih)',
    'ksm.ratePa': 'Suku bunga (% per tahun)',
    'kkb.ratePa': 'Suku bunga (% per tahun)',
    'ksm.tenorMonths': 'Tenor maksimal (bulan)',
    'kkb.tenorMonths': 'Tenor maksimal (bulan)',
    'ksm.method': 'Cara hitung angsuran',
    'kkb.method': 'Cara hitung angsuran',
    'kkb.dpPct': 'Uang muka minimal (%)',
    'kkb.provisiPct': 'Provisi (% dari pinjaman, opsional)',
    'kkb.adminRp': 'Biaya administrasi (Rp, opsional)',
    'kkb.asuransiRp': 'Asuransi (Rp, opsional)',
    'tni.incomeBase': 'Penghasilan yang dihitung (KSM dan KKB)',
    'tni.minSisaRp': 'Sisa penghasilan paling sedikit setelah angsuran (Rp per bulan, opsional)',
    'risk.ksmShareMaxPct': 'Batas porsi KSM (% dari kredit consumer, opsional)',
    'kpr.capPct': 'Batas angsuran KPR (% dari penghasilan bersih)',
    'leads.prioritasThreshold': 'Ambang saldo Mandiri Prioritas (Rp)',
    'leads.kkbMinIncome': 'Penghasilan minimal Calon KKB (Rp per bulan)',
    'leads.kprMinIncome': 'Penghasilan minimal Calon KPR (Rp per bulan)',
    'leads.topUpMaxTenor': 'Sisa tenor untuk top up KSM (bulan)',
    'leads.k': 'Kelompok terkecil yang ditampilkan'
  };

  // Short names for "Angka kebijakan bank belum diisi: {daftar}." and "Angka kebijakan diubah: {nama angka}".
  var NAMES = {
    'ksm.capPct': 'batas angsuran KSM',
    'kkb.capPct': 'batas angsuran KKB',
    'ksm.ratePa': 'suku bunga KSM',
    'kkb.ratePa': 'suku bunga KKB',
    'ksm.tenorMonths': 'tenor maksimal KSM',
    'kkb.tenorMonths': 'tenor maksimal KKB',
    'ksm.method': 'cara hitung angsuran KSM',
    'kkb.method': 'cara hitung angsuran KKB',
    'kkb.dpPct': 'uang muka minimal KKB',
    'kkb.provisiPct': 'provisi KKB',
    'kkb.adminRp': 'biaya administrasi KKB',
    'kkb.asuransiRp': 'asuransi KKB',
    'tni.incomeBase': 'penghasilan yang dihitung',
    'tni.minSisaRp': 'sisa penghasilan paling sedikit',
    'risk.ksmShareMaxPct': 'batas porsi KSM',
    'kpr.capPct': 'batas angsuran KPR',
    'leads.prioritasThreshold': 'ambang saldo Mandiri Prioritas',
    'leads.kkbMinIncome': 'penghasilan minimal Calon KKB',
    'leads.kprMinIncome': 'penghasilan minimal Calon KPR',
    'leads.topUpMaxTenor': 'sisa tenor untuk top up KSM',
    'leads.k': 'kelompok terkecil'
  };

  var UNITS = {
    'ksm.capPct': 'pct', 'kkb.capPct': 'pct',
    'ksm.ratePa': 'pctRate', 'kkb.ratePa': 'pctRate',
    'ksm.tenorMonths': 'months', 'kkb.tenorMonths': 'months',
    'ksm.method': 'choice', 'kkb.method': 'choice',
    'kkb.dpPct': 'pct',
    'kkb.provisiPct': 'pct', 'kkb.adminRp': 'rp', 'kkb.asuransiRp': 'rp',
    'tni.incomeBase': 'choice',
    'tni.minSisaRp': 'rpMonth',
    'risk.ksmShareMaxPct': 'pct',
    'kpr.capPct': 'pct',
    'leads.prioritasThreshold': 'rp', 'leads.kkbMinIncome': 'rpMonth', 'leads.kprMinIncome': 'rpMonth',
    'leads.topUpMaxTenor': 'months',
    'leads.k': 'int'
  };

  // Which validation rule each key follows. The bounds sit in RULES below, by rule name, so that no
  // number ever sits next to a key in this file (a test checks every line that names a key).
  var KEY_RULE = {
    'ksm.capPct': 'cap', 'kkb.capPct': 'cap', 'risk.ksmShareMaxPct': 'cap',
    'ksm.ratePa': 'rate', 'kkb.ratePa': 'rate',
    'ksm.tenorMonths': 'months', 'kkb.tenorMonths': 'months', 'leads.topUpMaxTenor': 'months',
    'ksm.method': 'method', 'kkb.method': 'method',
    'kkb.dpPct': 'dp',
    'kkb.provisiPct': 'provisi',
    'kkb.adminRp': 'fee', 'kkb.asuransiRp': 'fee',
    'tni.incomeBase': 'incomeBase',
    'tni.minSisaRp': 'rpPositive',
    'leads.prioritasThreshold': 'rpPositive', 'leads.kkbMinIncome': 'rpPositive', 'leads.kprMinIncome': 'rpPositive',
    'kpr.capPct': 'kprCap',
    'leads.k': 'groupSize'
  };

  // Validation ranges (not defaults). lo/hi with open ends; frac: the fraction refusal of D18.
  var RULES = {
    cap: { lo: 1, hi: 100, loOpen: true, frac: 'upToOne' },
    rate: { lo: 0, hi: 100, loOpen: true, hiOpen: true, rateCheck: true },
    months: { lo: 1, hi: 600, whole: true },
    dp: { lo: 0, hi: 100, hiOpen: true, frac: 'belowOne' },
    provisi: { lo: 0, hi: 100, hiOpen: true },
    fee: { rupiah: true, min: 0 },
    rpPositive: { rupiah: true, positive: true },
    kprCap: { lo: 5, hi: 95, frac: 'upToOne' },
    groupSize: { groupSize: true },
    method: { choice: 'method' },
    incomeBase: { choice: 'incomeBase' }
  };

  // Item 48: aggregated lead views hide groups smaller than this. A product rule, not bank policy;
  // the same floor as MCD.leads.MIN_K. leads.k can only go up from it.
  var GROUP_FLOOR = 5;
  var LOG_MAX = 500;

  var CHOICES = {
    method: [{ value: 'anuitas', label: 'Anuitas' }, { value: 'flat', label: 'Flat' }],
    incomeBase: [
      { value: 'semua', label: 'Semua komponen' },
      { value: 'tanpa-lauk-pauk', label: 'Tanpa uang lauk pauk' },
      { value: 'tanpa-lauk-pauk-tukin', label: 'Tanpa uang lauk pauk dan tunjangan kinerja' }
    ]
  };

  var OPTIONAL = ['kkb.provisiPct', 'kkb.adminRp', 'kkb.asuransiRp', 'tni.minSisaRp', 'risk.ksmShareMaxPct', 'kpr.capPct', 'leads.k'];

  var REQUIRED = {
    ksm: ['ksm.capPct', 'ksm.ratePa', 'ksm.tenorMonths', 'ksm.method', 'tni.incomeBase'],
    kkb: ['kkb.capPct', 'kkb.ratePa', 'kkb.tenorMonths', 'kkb.method', 'kkb.dpPct', 'tni.incomeBase'],
    leads: ['leads.prioritasThreshold', 'leads.kkbMinIncome', 'leads.kprMinIncome', 'leads.topUpMaxTenor']
  };

  var GROUPS = [
    { id: 'ksmKkb', label: 'KSM dan KKB', optional: false,
      keys: ['ksm.capPct', 'kkb.capPct', 'ksm.ratePa', 'kkb.ratePa', 'ksm.tenorMonths', 'kkb.tenorMonths', 'ksm.method', 'kkb.method', 'kkb.dpPct', 'tni.incomeBase'] },
    { id: 'kkbFees', label: 'Biaya KKB (opsional)', optional: true, keys: ['kkb.provisiPct', 'kkb.adminRp', 'kkb.asuransiRp'] },
    { id: 'risk', label: 'Batas risiko (opsional)', optional: true, keys: ['tni.minSisaRp', 'risk.ksmShareMaxPct'] },
    { id: 'kpr', label: 'KPR (opsional)', optional: true, keys: ['kpr.capPct'] },
    { id: 'leads', label: 'Ambang daftar leads', optional: false,
      keys: ['leads.prioritasThreshold', 'leads.kkbMinIncome', 'leads.kprMinIncome', 'leads.topUpMaxTenor', 'leads.k'] }
  ];
  var LEAD_KEYS = GROUPS[GROUPS.length - 1].keys;
  var CARD_KEYS = KEYS.filter(function (k) { return LEAD_KEYS.indexOf(k) < 0; });

  // Messages. Every number in them comes from the user's own input or from the key's range (D18).
  var MSG = {
    pct: 'Isi dalam persen.',
    frac: 'Isi dalam persen: tulis {y}, jangan {x}.',
    range: 'Isi angka antara {a} dan {b}.',
    rangeWhole: 'Isi angka bulat antara {a} dan {b}.',
    short: 'Isi angka lengkap: {nilai}.',
    rupiah: 'Isi angka lengkap dalam rupiah.',
    rupiahPositive: 'Isi angka rupiah lebih dari nol.',
    rateCheck: 'Suku bunga terbaca {x}% per tahun. Periksa jika maksudnya {y}%.',
    onlyUp: 'Hanya dapat dinaikkan.',
    whole: 'Isi angka bulat.',
    choice: 'Pilih salah satu pilihan yang tersedia.',
    unknownKey: 'Angka ini tidak dikenal dashboard.',
    demo: 'Tidak tersedia saat Data contoh aktif. Matikan Data contoh lebih dulu.',
    actorEmpty: 'Isi inisial petugas untuk riwayat.',
    actorBad: 'Isi 2 sampai 4 huruf, misalnya AB.'
  };

  var HINTS = {};
  KEYS.forEach(function (k) { if (UNITS[k] === 'pct' || UNITS[k] === 'pctRate') HINTS[k] = MSG.pct; });
  HINTS['leads.k'] = MSG.onlyUp;

  var ACTS = ['leads-on', 'leads-import', 'leads-off', 'leads-k', 'policy-set', 'policy-clear', 'leads-expired'];
  var EXTERNAL_ACTS = ['leads-on', 'leads-import', 'leads-off', 'leads-expired'];

  /* =============================================================== helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isKey(k) { return typeof k === 'string' && has(KEY_RULE, k); }
  function isWhole(x) { return isNum(x) && Math.floor(x) === x; }
  function fill(t, v) { return t.replace(/\{(\w+)\}/g, function (m, k) { return has(v, k) ? String(v[k]) : m; }); }
  function inKeyOrder(keys) { return KEYS.filter(function (k) { return keys.indexOf(k) >= 0; }); }

  var NOW = function () { return Date.now(); };
  function nowISO() { return new Date(NOW()).toISOString(); }
  var ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  function isISO(s) { return typeof s === 'string' && ISO_RE.test(s) && isFinite(Date.parse(s)); }
  function isDay(s) { return typeof s === 'string' && DAY_RE.test(s) && isFinite(Date.parse(s + 'T00:00:00Z')); }

  /** Indonesian number text: dot grouping, decimal comma, no trailing zeros ('1.250.000', '7,25', '0,4'). */
  function fmtNum(x) {
    if (!isNum(x)) return '';
    var neg = x < 0, s = Math.abs(Math.round(x * 1e8) / 1e8).toFixed(8).replace(/\.?0+$/, '');
    var parts = s.split('.');
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '\u2212' : '') + int + (parts[1] ? ',' + parts[1] : '');
  }
  function times100(x) { return Math.round(x * 100 * 1e8) / 1e8; }

  var MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fmtDay(day) {
    if (!isDay(day)) return '';
    var p = day.split('-');
    return Number(p[2]) + ' ' + MONTHS_ID[Number(p[1]) - 1] + ' ' + p[0];
  }

  /* ============================================================== parsing */

  var SHORT_UNITS = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6, m: 1e9, miliar: 1e9, milyar: 1e9, t: 1e12, triliun: 1e12 };
  var SPACES = /[\s\u00a0\u2007\u202f]+/g;

  /** Indonesian number string → number | null. dotDecimal: read a lone non-grouping dot as a decimal point. */
  function idNumber(s, dotDecimal) {
    var neg = false;
    if (/^[-\u2212]/.test(s)) { neg = true; s = s.slice(1); }
    var x = null;
    if (/^\d+$/.test(s)) x = Number(s);
    else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) x = Number(s.replace(/\./g, ''));
    else if (/^(\d+|[1-9]\d{0,2}(\.\d{3})+),\d+$/.test(s)) x = Number(s.replace(/\./g, '').replace(',', '.'));
    else if (dotDecimal && /^\d+\.\d+$/.test(s)) x = Number(s);
    if (x === null || !isFinite(x)) return null;
    return neg ? -x : x;
  }

  /** raw (string or number) → {empty} | {value} | {short: full | null} | {bad} for one unit. */
  function readNumber(raw, unit) {
    if (raw === null || raw === undefined) return { empty: true };
    if (typeof raw === 'number') return isFinite(raw) ? { value: raw } : { bad: true };
    if (typeof raw !== 'string') return { bad: true };
    var s = raw.replace(SPACES, ' ').trim().toLowerCase();
    if (!s) return { empty: true };
    var rupiah = unit === 'rp' || unit === 'rpMonth', percent = unit === 'pct' || unit === 'pctRate';
    var hadRp = /^rp\.?\s*/.test(s);
    if (hadRp) s = s.replace(/^rp\.?\s*/, '');
    var hadPct = /\s*%$/.test(s);
    if (hadPct) s = s.replace(/\s*%$/, '');
    if (unit === 'months') s = s.replace(/\s*(bulan|bln\.?)$/, '');
    if (rupiah) s = s.replace(/,-$/, '').replace(/,0+$/, '');
    if ((hadRp && !rupiah) || (hadPct && !percent)) return { bad: true };
    var m = /^([-\u2212]?[\d.,]*\d)\s*([a-z]+)\.?$/.exec(s);
    if (m && has(SHORT_UNITS, m[2])) {
      var base = idNumber(m[1], true);
      return { short: base === null ? null : Math.round(base * SHORT_UNITS[m[2]] * 1e6) / 1e6 };
    }
    if (/[a-z]/.test(s)) return { bad: true };
    if (/^[-\u2212]?\d{1,3}( \d{3})+(,\d+)?$/.test(s)) s = s.replace(/ /g, '');
    var v = idNumber(s, percent);
    return v === null ? { bad: true } : { value: v };
  }

  function fail(code, pesan) { return { ok: false, code: code, pesan: pesan }; }
  function inRange(rule, x) {
    var low = rule.loOpen ? x <= rule.lo : x < rule.lo, high = rule.hiOpen ? x >= rule.hi : x > rule.hi;
    return !low && !high;
  }
  function rangeText(rule) { return fill(rule.whole ? MSG.rangeWhole : MSG.range, { a: fmtNum(rule.lo), b: fmtNum(rule.hi) }); }
  function unreadable(unit, rule) {
    if (unit === 'pct' || unit === 'pctRate') return MSG.pct;
    if (unit === 'rp' || unit === 'rpMonth') return MSG.rupiah;
    if (unit === 'months') return rangeText(rule);
    return MSG.whole;
  }

  /**
   * check(key, raw, {source, current}) → {ok, value (null = empty), code?, pesan?, warning?}
   * current: the stored value (for "k only up"). source 'vault' skips the only-up rule and the rate check.
   */
  function check(key, raw, opts) {
    opts = opts || {};
    if (!isKey(key)) return fail('kunci-tidak-dikenal', MSG.unknownKey);
    var rule = RULES[KEY_RULE[key]], unit = UNITS[key];
    if (rule.choice) {
      if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return { ok: true, value: null };
      var c = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
      var hit = CHOICES[rule.choice].filter(function (o) { return o.value === c; })[0];
      return hit ? { ok: true, value: hit.value } : fail('pilihan', MSG.choice);
    }
    var r = readNumber(raw, unit);
    if (r.empty) {
      if (rule.groupSize && opts.source !== 'vault' && isNum(opts.current) && opts.current > GROUP_FLOOR) return fail('hanya-naik', MSG.onlyUp);
      return { ok: true, value: null };
    }
    if (has(r, 'short')) {
      if (rule.rupiah && isWhole(r.short) && r.short > 0) return fail('angka-singkat', fill(MSG.short, { nilai: 'Rp' + fmtNum(r.short) }));
      return fail('angka-singkat', unreadable(unit, rule));
    }
    if (r.bad) return fail('tidak-terbaca', unreadable(unit, rule));
    var x = r.value;
    if (rule.rupiah) {
      if (!isWhole(x)) return fail('bukan-bulat', MSG.rupiah);
      if (rule.positive && x <= 0) return fail('rentang', MSG.rupiahPositive);
      if (x < rule.min) return fail('rentang', MSG.rupiah);
      return { ok: true, value: x };
    }
    if (rule.groupSize) {
      if (!isWhole(x)) return fail('bukan-bulat', MSG.whole);
      var floor = GROUP_FLOOR;
      if (opts.source !== 'vault' && isNum(opts.current) && opts.current > floor) floor = opts.current;
      if (x < floor) return fail('hanya-naik', MSG.onlyUp);
      return { ok: true, value: x };
    }
    // A fraction is refused with the user's own number (D18). The message suggests x × 100 only when
    // that value would be accepted; otherwise the range message follows.
    if (rule.frac && x > 0 && (rule.frac === 'upToOne' ? x <= 1 : x < 1) && inRange(rule, times100(x))) {
      return fail('pecahan', fill(MSG.frac, { y: fmtNum(times100(x)), x: fmtNum(x) }));
    }
    if (!inRange(rule, x)) return fail('rentang', rangeText(rule));
    if (rule.whole && !isWhole(x)) return fail('bukan-bulat', rangeText(rule));
    var out = { ok: true, value: x };
    if (rule.rateCheck && opts.source !== 'vault' && x < 1) {
      out.warning = { code: 'periksa-bunga', pesan: fill(MSG.rateCheck, { x: fmtNum(x), y: fmtNum(times100(x)) }) };
    }
    return out;
  }

  /* ================================================================ state */

  function fresh() { return { values: {}, filled: {}, log: [], capped: false, savedAt: null }; }
  var S = fresh();
  var ACTOR = null;
  var REV = 0, SAVED_REV = 0, EXPORTED_REV = null;
  var LISTENERS = [];

  function MCDref() { return (root && root.MCD) || null; }
  function demoOn() {
    var M = MCDref();
    try { return !!(M && M.data && typeof M.data.demoActive === 'function' && M.data.demoActive()); } catch (e) { return false; }
  }
  function val(key) { return has(S.values, key) ? S.values[key] : null; }
  function filledKeys() { return KEYS.filter(function (k) { return has(S.values, k); }); }
  function kNow() { var k = val('leads.k'); return isNum(k) ? k : GROUP_FLOOR; }

  /* =============================================================== events */

  function later(e) { try { if (typeof setTimeout === 'function') setTimeout(function () { throw e; }); } catch (x) { /* nowhere to report */ } }

  function feedLeads(keys) {
    var M = MCDref();
    if (!M || !M.leads || typeof M.leads.configure !== 'function') return;
    if (!keys.some(function (k) { return k.indexOf('leads.') === 0; })) return;
    try { M.leads.configure(forLeads()); } catch (e) { later(e); }
  }

  function emit(keys, source) {
    var detail = { keys: keys.slice(), source: source, dirty: dirty() };
    LISTENERS.slice().forEach(function (fn) {
      try { fn({ keys: detail.keys.slice(), source: source, dirty: detail.dirty }); } catch (e) { later(e); }
    });
    if (source === 'user' || source === 'vault') feedLeads(keys);
    try {
      var doc = root && root.document, CE = root && root.CustomEvent;
      if (doc && typeof doc.dispatchEvent === 'function' && typeof CE === 'function') {
        doc.dispatchEvent(new CE('mcd:policy', { detail: { keys: detail.keys.slice(), source: source, dirty: detail.dirty } }));
      }
    } catch (e) { /* no DOM events */ }
  }

  function on(fn) {
    if (typeof fn !== 'function') return function () {};
    LISTENERS.push(fn);
    return function off() { var i = LISTENERS.indexOf(fn); if (i >= 0) LISTENERS.splice(i, 1); };
  }

  /* ============================================================== Riwayat */

  function validValue(key, v) {
    if (v === null || v === undefined) return null;
    var r = check(key, v, { source: 'vault' });
    return r.ok ? r.value : null;
  }
  function cleanKeys(a) { return Array.isArray(a) ? inKeyOrder(a.filter(isKey)) : []; }
  function cleanChanges(a) {
    if (!Array.isArray(a)) return [];
    var seen = {};
    return a.filter(function (c) { return c && isKey(c.key) && !seen[c.key] && (seen[c.key] = true); })
      .map(function (c) { return { key: c.key, from: validValue(c.key, c.from), to: validValue(c.key, c.to) }; });
  }
  function cleanCount(m) {
    if (m === '<5') return '<5';
    if (!isWhole(m) || m < 0) return undefined;
    return m >= GROUP_FLOOR ? m : '<5';
  }

  /** The allowlist of a Riwayat detail (§1.7.1 storage rule): nothing else survives. */
  function cleanDetail(act, d) {
    d = d && typeof d === 'object' ? d : {};
    var out = {};
    if (act === 'policy-set' || act === 'policy-clear') {
      out.keys = cleanKeys(d.keys);
      out.changes = cleanChanges(d.changes);
      if (!out.keys.length) out.keys = out.changes.map(function (c) { return c.key; });
    } else if (act === 'leads-k') {
      if (isWhole(d.from) && d.from >= GROUP_FLOOR) out.from = d.from;
      if (isWhole(d.to) && d.to >= GROUP_FLOOR) out.to = d.to;
    } else if (act === 'leads-import') {
      if (typeof d.fp === 'string' && /^[0-9a-f]{12}$/.test(d.fp)) out.fp = d.fp;
      var m = cleanCount(d.m);
      if (m !== undefined) out.m = m;
      if (isDay(d.asOf)) out.asOf = d.asOf;
    } else if (act === 'leads-expired') {
      if (isDay(d.asOf)) out.asOf = d.asOf;
    }
    return out;
  }

  function copyEntry(e) { return { at: e.at, act: e.act, by: e.by, detail: JSON.parse(JSON.stringify(e.detail)) }; }

  function push(act, detail) {
    var entry = { at: nowISO(), act: act, by: ACTOR, detail: cleanDetail(act, detail) };
    S.log.push(entry);
    if (S.log.length > LOG_MAX) { S.log.splice(0, S.log.length - LOG_MAX); S.capped = true; }
    REV += 1;
    return entry;
  }

  /** log(act, detail) → entry | null. Only the external acts; never under Data contoh (§8.5). */
  function log(act, detail) {
    if (EXTERNAL_ACTS.indexOf(act) < 0 || demoOn()) return null;
    var e = push(act, detail);
    emit([], 'log');
    return copyEntry(e);
  }
  function history() { return S.log.slice().reverse().map(copyEntry); }
  function capped() { return S.capped === true; }

  function listText(keys) {
    var names = (keys || []).map(function (k) { return NAMES[k] || String(k); });
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' dan ' + names[names.length - 1];
  }

  /** describe(entry) → {text, changes} with the §8.5 row wording. */
  function describe(e) {
    if (!e || ACTS.indexOf(e.act) < 0) return { text: '', changes: [] };
    var d = e.detail || {}, by = e.by ? ' · ' + e.by : '', t = '';
    if (e.act === 'leads-on') t = 'Daftar leads dinyalakan' + by;
    else if (e.act === 'leads-import') {
      t = 'Daftar leads diimpor' + (d.fp ? ' · kode file ' + d.fp : '') +
        (d.m !== undefined ? ' · ' + (d.m === '<5' ? '<5' : fmtNum(d.m)) + ' nasabah' : '') +
        (d.asOf ? ' · data per ' + fmtDay(d.asOf) : '') + by;
    } else if (e.act === 'leads-off') t = 'Daftar leads dimatikan dan dihapus' + by;
    else if (e.act === 'leads-k') t = 'Kelompok terkecil diubah dari ' + fmtNum(d.from) + ' menjadi ' + fmtNum(d.to) + by;
    else if (e.act === 'policy-set') t = 'Angka kebijakan diubah: ' + listText(d.keys) + by;
    else if (e.act === 'policy-clear') t = 'Angka kebijakan dikosongkan' + by;
    else if (e.act === 'leads-expired') t = 'Daftar leads lama tidak dibuka' + (d.asOf ? ' · data per ' + fmtDay(d.asOf) : '');
    var changes = (d.changes || []).map(function (c) {
      return { key: c.key, name: NAMES[c.key], from: text(c.key, c.from), to: text(c.key, c.to) };
    });
    return { text: t, changes: changes };
  }

  /* ================================================================ reads */

  function get(key) { return isKey(key) ? val(key) : null; }

  function all() {
    var values = {}, filled = {};
    filledKeys().forEach(function (k) { values[k] = S.values[k]; if (S.filled[k]) filled[k] = S.filled[k]; });
    return { values: values, filled: filled, savedAt: S.savedAt };
  }

  function missing(keys) {
    var list = Array.isArray(keys) ? keys : KEYS.filter(function (k) { return OPTIONAL.indexOf(k) < 0; });
    return list.filter(function (k) { return !isKey(k) || val(k) === null || validValue(k, val(k)) === null; });
  }

  function filledDate(keys) {
    var list = Array.isArray(keys) ? keys : KEYS, best = null;
    list.forEach(function (k) { var d = isKey(k) && has(S.values, k) ? S.filled[k] : null; if (d && (!best || d > best)) best = d; });
    return best;
  }

  function groupStatus(id) {
    var g = GROUPS.filter(function (x) { return x.id === id; })[0];
    if (!g) return null;
    var required = g.keys.filter(function (k) { return OPTIONAL.indexOf(k) < 0; });
    var miss = missing(required), n = g.keys.filter(function (k) { return has(S.values, k); }).length;
    return {
      id: g.id, label: g.label, optional: g.optional, keys: g.keys.slice(), required: required, missing: miss,
      filled: n, date: filledDate(g.keys), complete: !miss.length && (required.length > 0 || n > 0)
    };
  }

  function forLoanCap(product) {
    if (product !== 'ksm' && product !== 'kkb') return { ok: false, missing: [] };
    var miss = missing(REQUIRED[product]);
    if (miss.length) return { ok: false, missing: miss };
    var p = product + '.';
    var out = {
      ok: true, capPct: val(p + 'capPct'), ratePa: val(p + 'ratePa'), tenorMonths: val(p + 'tenorMonths'),
      method: val(p + 'method'), incomeBase: val('tni.incomeBase')
    };
    if (product === 'kkb') {
      out.dpPct = val('kkb.dpPct');
      var fees = {};
      [['provisiPct', 'kkb.provisiPct'], ['adminRp', 'kkb.adminRp'], ['asuransiRp', 'kkb.asuransiRp']].forEach(function (f) {
        if (val(f[1]) !== null) fees[f[0]] = val(f[1]);
      });
      out.feesOptional = fees;
    }
    return out;
  }

  function incomeBase() { return val('tni.incomeBase'); }

  function forLeads() {
    return {
      prioritasThreshold: val('leads.prioritasThreshold'),
      kkbMinIncome: val('leads.kkbMinIncome'),
      kprMinIncome: val('leads.kprMinIncome'),
      topUpMaxTenor: val('leads.topUpMaxTenor'),
      k: kNow()
    };
  }

  /** The one place that converts percent ↔ fraction (D18, D19). */
  function forKpr() {
    var pct = val('kpr.capPct');
    if (pct !== null) return { dsr: Math.round(pct / 100 * 1e10) / 1e10, pct: pct, source: 'kebijakan' };
    var M = MCDref(), dsr = M && M.config ? M.config.dsrCap : null;
    if (!isNum(dsr) || dsr <= 0 || dsr >= 1) return { dsr: null, pct: null, source: 'asumsi' };
    return { dsr: dsr, pct: times100(dsr), source: 'asumsi' };
  }

  function ksmShareMax() { return val('risk.ksmShareMaxPct'); }
  function minSisa() { return val('tni.minSisaRp'); }

  function format(key, v) {
    if (!isKey(key)) return '';
    if (arguments.length < 2) v = val(key);
    if (v === null || v === undefined) return '';
    if (UNITS[key] === 'choice') return String(v);
    return fmtNum(v);
  }
  function text(key, v) {
    if (!isKey(key)) return '';
    if (arguments.length < 2) v = val(key);
    if (v === null || v === undefined) return '';
    var u = UNITS[key];
    if (u === 'choice') {
      var o = CHOICES[RULES[KEY_RULE[key]].choice].filter(function (c) { return c.value === v; })[0];
      return o ? o.label.toLowerCase() : String(v);
    }
    if (u === 'pct' || u === 'pctRate') return fmtNum(v) + '%';
    if (u === 'rp' || u === 'rpMonth') return 'Rp' + fmtNum(v);
    if (u === 'months') return fmtNum(v) + ' bulan';
    return fmtNum(v);
  }

  function parse(key, raw) {
    var r = check(key, raw, { source: 'user', current: val(key) });
    var out = { ok: r.ok, value: r.ok ? r.value : null };
    if (!r.ok) { out.code = r.code; out.pesan = r.pesan; }
    if (r.warning) out.warning = { code: r.warning.code, pesan: r.warning.pesan };
    return out;
  }

  /* =============================================================== writes */

  function set(patch, opts) {
    var source = opts && opts.source === 'vault' ? 'vault' : 'user';
    var res = { ok: false, changed: [], errors: [], warnings: [] };
    if (!patch || typeof patch !== 'object') { res.errors.push({ key: null, code: 'tidak-terbaca', pesan: MSG.unknownKey }); return res; }
    if (source === 'user' && demoOn()) { res.errors.push({ key: null, code: 'data-contoh', pesan: MSG.demo }); return res; }
    var next = {};
    Object.keys(patch).forEach(function (key) {
      if (!isKey(key)) {
        if (source === 'user') res.errors.push({ key: key, code: 'kunci-tidak-dikenal', pesan: MSG.unknownKey });
        return;
      }
      var r = check(key, patch[key], { source: source, current: val(key) });
      if (!r.ok) { res.errors.push({ key: key, code: r.code, pesan: r.pesan }); return; }
      if (r.warning) res.warnings.push({ key: key, code: r.warning.code, pesan: r.warning.pesan });
      next[key] = r.value;
    });
    if (res.errors.length) return res;
    var at = nowISO(), changes = [], kChange = null;
    KEYS.forEach(function (key) {
      if (!has(next, key) || next[key] === val(key)) return;
      var from = val(key), to = next[key];
      if (to === null) { delete S.values[key]; delete S.filled[key]; } else { S.values[key] = to; S.filled[key] = at; }
      res.changed.push(key);
      if (key === 'leads.k') kChange = { from: isNum(from) ? from : GROUP_FLOOR, to: isNum(to) ? to : GROUP_FLOOR };
      else changes.push({ key: key, from: from, to: to });
    });
    res.ok = true;
    if (!res.changed.length) return res;
    if (source === 'user') {
      REV += 1;
      if (changes.length) push('policy-set', { keys: changes.map(function (c) { return c.key; }), changes: changes });
      if (kChange && kChange.from !== kChange.to) push('leads-k', kChange);
    }
    emit(res.changed, source);
    return res;
  }

  function clear(keys, opts) {
    if (demoOn()) return [];
    var list = Array.isArray(keys) ? keys.filter(isKey) : CARD_KEYS;
    var lowerK = !!(opts && opts.lowerK === true);
    var changed = [], changes = [], kChange = null;
    inKeyOrder(list).forEach(function (key) {
      if (!has(S.values, key)) return;
      if (key === 'leads.k' && !lowerK) return;
      var from = S.values[key];
      delete S.values[key]; delete S.filled[key];
      changed.push(key);
      if (key === 'leads.k') kChange = { from: from, to: GROUP_FLOOR };
      else changes.push({ key: key, from: from, to: null });
    });
    if (!changed.length) return [];
    REV += 1;
    if (changes.length) push('policy-clear', { keys: changes.map(function (c) { return c.key; }), changes: changes });
    if (kChange && kChange.from !== kChange.to) push('leads-k', kChange);
    emit(changed, 'user');
    return changed;
  }

  /* ================================================================ actor */

  function actor() { return ACTOR; }
  function setActor(initials) {
    var s = typeof initials === 'string' ? initials.replace(SPACES, '').trim() : '';
    if (!s) return { ok: false, pesan: MSG.actorEmpty };
    if (!/^[A-Za-z]{2,4}$/.test(s)) return { ok: false, pesan: MSG.actorBad };
    ACTOR = s.toUpperCase();
    return { ok: true };
  }

  /* ================================================================ vault */

  function dirty() { return REV !== SAVED_REV; }

  function vaultExport() {
    var keys = filledKeys();
    if (!keys.length && !S.log.length) { EXPORTED_REV = REV; return null; }
    var values = {}, filled = {};
    keys.forEach(function (k) { values[k] = S.values[k]; if (S.filled[k]) filled[k] = S.filled[k]; });
    var out = { v: 1, values: values, filled: filled, log: S.log.map(copyEntry) };
    if (S.capped) out.capped = true;
    EXPORTED_REV = REV;
    return out;
  }

  function vaultLoad(obj) {
    var before = filledKeys(), loaded = [], dropped = [];
    S = fresh();
    if (obj && typeof obj === 'object' && obj.v === 1) {
      var values = obj.values && typeof obj.values === 'object' ? obj.values : {};
      var filled = obj.filled && typeof obj.filled === 'object' ? obj.filled : {};
      Object.keys(values).forEach(function (key) {
        var v = isKey(key) ? validValue(key, values[key]) : null;
        if (v === null) { dropped.push(key); return; }
        S.values[key] = v;
        if (isISO(filled[key])) S.filled[key] = filled[key];
        loaded.push(key);
      });
      var entries = Array.isArray(obj.log) ? obj.log : [];
      entries.forEach(function (e) {
        if (!e || typeof e !== 'object' || ACTS.indexOf(e.act) < 0 || !isISO(e.at)) return;
        var by = typeof e.by === 'string' && /^[A-Z]{2,4}$/.test(e.by) ? e.by : null;
        S.log.push({ at: e.at, act: e.act, by: by, detail: cleanDetail(e.act, e.detail) });
      });
      S.capped = obj.capped === true || S.log.length > LOG_MAX;
      if (S.log.length > LOG_MAX) S.log.splice(0, S.log.length - LOG_MAX);
    }
    REV += 1; SAVED_REV = REV; EXPORTED_REV = null;
    var keys = inKeyOrder(before.concat(loaded));
    emit(keys, 'vault');
    return { ok: true, loaded: inKeyOrder(loaded), dropped: dropped };
  }

  function markSaved(savedISO) {
    SAVED_REV = EXPORTED_REV !== null ? EXPORTED_REV : REV;
    EXPORTED_REV = null;
    S.savedAt = isISO(savedISO) ? savedISO : nowISO();
    emit([], 'saved');
  }

  function reset() {
    var keys = filledKeys(), hadLog = S.log.length > 0;
    S = fresh();
    ACTOR = null;
    REV = 0; SAVED_REV = 0; EXPORTED_REV = null;
    if (keys.length || hadLog) emit(keys, 'reset');
  }

  function clock(fn) { NOW = typeof fn === 'function' ? fn : function () { return Date.now(); }; }

  return {
    VERSION: 1,
    KEYS: KEYS.slice(), LABELS: LABELS, NAMES: NAMES, UNITS: UNITS, HINTS: HINTS, CHOICES: CHOICES,
    GROUPS: GROUPS, REQUIRED: REQUIRED, OPTIONAL: OPTIONAL.slice(), ACTS: ACTS.slice(), LOG_MAX: LOG_MAX,
    MESSAGES: MSG,
    get: get, all: all, missing: missing, set: set, clear: clear, parse: parse, on: on,
    filledDate: filledDate, groupStatus: groupStatus,
    forLoanCap: forLoanCap, incomeBase: incomeBase, forLeads: forLeads, forKpr: forKpr,
    ksmShareMax: ksmShareMax, minSisa: minSisa,
    format: format, text: text, listText: listText,
    actor: actor, setActor: setActor,
    log: log, history: history, capped: capped, describe: describe,
    dirty: dirty, vaultExport: vaultExport, vaultLoad: vaultLoad, markSaved: markSaved, reset: reset,
    _clock: clock
  };
});
