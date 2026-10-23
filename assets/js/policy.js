/* ==========================================================================
 * MCD.policy: bank policy numbers entered by the branch (v7, docs/V7_SPEC.md §1.7.1 as trimmed by D39 and
 * D41; D18, D19, D27, D31; COPY_STYLE_EN item 48 "rates, caps and the Prioritas threshold are entered by the
 * branch and kept in the vault, never in the repo").
 *
 * D39, D41 (22 and 23 Oct 2026, the user removed the former TNI credit section, then its two products everywhere;
 * docs/V8_SPEC.md §3.5): the store keeps only what the remaining screens read, the KPR cap (the KPR simulator,
 * D19) and the thresholds of the two remaining lead rules (Calon KPR, Mendekati Prioritas; §8.2). The calculator
 * keys, their groups and feeds, the vehicle-loan income minimum and the top-up tenor are gone. An encrypted copy
 * saved earlier that still holds them loads without error: vaultLoad ignores every key it does not know (and
 * lists it in `dropped`), and an old Riwayat entry keeps only the key names this module still knows.
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
 *   kpr.capPct: percent within the range of config.dsrCap, a fraction is refused; empty = the Asumsi of
 *     Pengaturan & sumber
 *   leads.prioritasThreshold, leads.kprMinIncome: whole rupiah above zero, up to a typing guard
 *     (RULES.rpPositive.hi, far above any threshold and below Number.MAX_SAFE_INTEGER, so every stored
 *     value is exact and prints in full)
 *   leads.k: whole, never below the lead floor nor the current value ("Hanya dapat dinaikkan."), and
 *     never above the group ceiling (RULES.groupSize.hi), so a typo cannot hide every group
 * Optional (OPTIONAL): kpr.capPct, leads.k (empty = the lead floor). Required (REQUIRED.leads): the rest.
 * Decisions behind these rules: D18 (fractions, no example numbers), D19 (KPR Asumsi). The lead floor is the item-48 rule "groups under 5 hidden" (GROUP_FLOOR, the same as
 * MCD.leads.MIN_K); the floor, the group ceiling and the rupiah guard are product rules, not bank policy.
 *
 * Input: Indonesian format only. Decimal comma, dot grouping, optional "%" (percent keys), "Rp" (rupiah
 * keys) and "bulan" (month keys). A lone dot that is not a grouping ("7.5", "0.4") is read as a decimal
 * point on percent keys only. Rupiah, months and group sizes are whole numbers: the only comma they may
 * carry is a ",-" (rupiah), ",0" or ",00" at the end. Any other comma is refused, so English grouping
 * ("7,000,000", "500,000") is never read as a decimal comma and stored as a tiny number. Short forms
 * ("500 jt", "1,5 M", "750 rb") are refused and the message writes the user's number out in full (only
 * when it is unambiguous and the field would accept it). Values are stored as numbers.
 *
 * API (contract §1.7.1 as trimmed by D39; additions marked +)
 *   KEYS · LABELS · UNITS ('pct' | 'months' | 'rp' | 'rpMonth' | 'int') · + NAMES (short names for lists
 *   and the Riwayat) · + HINTS · + GROUPS (D37 as trimmed by D39: 'kpr' and the thresholds card 'leads')
 *   + REQUIRED {leads} · + OPTIONAL · + ACTS · + LOG_MAX · + MESSAGES
 *   get(key) → number | null
 *   all() → {values (filled keys only), filled: {<key>: ISO}, savedAt: ISO | null}
 *   missing(keys?) → [key]          empty, invalid or unknown; keys omitted = every required key
 *   set(patch, {source: 'user' | 'vault'}) → {ok, changed: [key], errors: [{key, code, pesan}]}
 *       ATOMIC: one error and nothing changes. '' or null clears a key. A key this module does not know
 *       is refused from the user ('kunci-tidak-dikenal') and ignored from the vault. source 'user' marks
 *       dirty, stamps fill dates and writes its own Riwayat entry ('policy-set'; 'leads-k' for k), and is
 *       refused while Data contoh is on (nothing is logged there, §8.5, so nothing may change unlogged).
 *   clear(keys?) → changed   the frozen contract. keys omitted = the policy card (every key outside the
 *       leads group: the KPR cap); it never touches the thresholds or k. A list that names 'leads.k'
 *       brings k back to the lead floor: only "Matikan dan hapus daftar leads" (LEADS UI turnOff, §8.2)
 *       names it, and a source test keeps it that way; to empty the thresholds alone, name REQUIRED.leads.
 *       A second argument ({lowerK: true}) is accepted and changes nothing. Logs 'policy-clear' (and
 *       'leads-k' when k goes down). Refused ([]) under Data contoh.
 *   + parse(key, raw) → {ok, value, code?, pesan?}   one field, nothing stored (on blur)
 *   + format(key, v?) → field text ('33,5', '500.000.000') · + text(key, v?) → '33,5%', 'Rp500.000.000',
 *     '17 bulan' · + listText(keys) → 'batas angsuran KPR dan ambang saldo Mandiri Prioritas'
 *   + groupStatus(id) → {id, label, optional, keys, required, missing, filled, date, complete}
 *   on(fn) → off                     fn({keys, source, dirty}); also document event 'mcd:policy' (same
 *       detail, key names only, never values). source: 'user' | 'vault' | 'reset' | 'log' | 'saved'.
 *   filledDate(keys?) → ISO | null   newest fill date among the keys ("Kebijakan bank · diisi {tanggal}")
 *   forLeads() → {prioritasThreshold, kprMinIncome, k}   null thresholds while empty (the rule is shown
 *       off); k = the stored value or the item-48 floor (V8 §3.5)
 *   forKpr() → {dsr: fraction, pct: percent, source: 'kebijakan' | 'asumsi'}   THE ONLY PLACE THAT
 *       CONVERTS percent ↔ fraction. 'asumsi' reads MCD.config.dsrCap (null pair when it is absent).
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
 *   vaultLoad(obj) → {ok, loaded, dropped}: replaces the session state from payload.policy (each value
 *       re-checked, each log entry re-sanitised, unknown keys ignored); not dirty afterwards. Call it
 *       BEFORE log('leads-expired') at sign-in.
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
    'kpr.capPct',
    'leads.prioritasThreshold', 'leads.kprMinIncome', 'leads.k'
  ];

  var LABELS = {
    'kpr.capPct': 'Batas angsuran KPR (% dari penghasilan bersih)',
    'leads.prioritasThreshold': 'Ambang saldo Mandiri Prioritas (Rp)',
    'leads.kprMinIncome': 'Penghasilan minimal Calon KPR (Rp per bulan)',
    'leads.k': 'Kelompok terkecil yang ditampilkan'
  };

  // Short names for "Angka kebijakan bank belum diisi: {daftar}." and "Angka kebijakan diubah: {nama angka}".
  var NAMES = {
    'kpr.capPct': 'batas angsuran KPR',
    'leads.prioritasThreshold': 'ambang saldo Mandiri Prioritas',
    'leads.kprMinIncome': 'penghasilan minimal Calon KPR',
    'leads.k': 'kelompok terkecil'
  };

  var UNITS = {
    'kpr.capPct': 'pct',
    'leads.prioritasThreshold': 'rp', 'leads.kprMinIncome': 'rpMonth',
    'leads.k': 'int'
  };

  // Which validation rule each key follows. The bounds sit in RULES below, by rule name, so that no
  // number ever sits next to a key in this file (a test checks every line that names a key).
  var KEY_RULE = {
    'kpr.capPct': 'kprCap',
    'leads.prioritasThreshold': 'rpPositive', 'leads.kprMinIncome': 'rpPositive',
    'leads.k': 'groupSize'
  };

  // Validation ranges (not defaults), both ends included. frac: a value above zero and at most one is
  // refused as a fraction (D18). rpPositive.hi is a typing guard (Rp1.000 triliun): far above any
  // threshold, below Number.MAX_SAFE_INTEGER so every value stays exact. groupSize.hi is the product
  // ceiling of the smallest group shown (the floor is GROUP_FLOOR): above it nearly every group of one
  // KCP's lead file would be hidden, and k can be lowered only by turning the lead list off.
  var RULES = {
    kprCap: { lo: 5, hi: 95, frac: true },
    months: { lo: 1, hi: 600, whole: true },
    rpPositive: { rupiah: true, lo: 1, hi: 1e15, whole: true },
    groupSize: { groupSize: true, hi: 100, whole: true }
  };

  // Item 48: aggregated lead views hide groups smaller than this. A product rule, not bank policy;
  // the same floor as MCD.leads.MIN_K. leads.k can only go up from it.
  var GROUP_FLOOR = 5;
  var LOG_MAX = 500;

  var OPTIONAL = ['kpr.capPct', 'leads.k'];

  var REQUIRED = {
    leads: ['leads.prioritasThreshold', 'leads.kprMinIncome']
  };

  var GROUPS = [
    { id: 'kpr', label: 'KPR (opsional)', optional: true, keys: ['kpr.capPct'] },
    { id: 'leads', label: 'Ambang daftar leads', optional: false,
      keys: ['leads.prioritasThreshold', 'leads.kprMinIncome', 'leads.k'] }
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
    onlyUp: 'Hanya dapat dinaikkan.',
    whole: 'Isi angka bulat.',
    unknownKey: 'Angka ini tidak dikenal dashboard.',
    demo: 'Tidak tersedia saat Data contoh aktif. Matikan Data contoh lebih dulu.',
    actorEmpty: 'Isi inisial petugas untuk riwayat.',
    actorBad: 'Isi 2 sampai 4 huruf, misalnya AB.'
  };

  var HINTS = {};
  KEYS.forEach(function (k) { if (UNITS[k] === 'pct') HINTS[k] = MSG.pct; });
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

  /**
   * Indonesian number text: dot grouping, decimal comma, no trailing zeros ('1.250.000', '7,25', '0,4').
   * '' beyond Number.MAX_SAFE_INTEGER (no exponent or invented digits); whole numbers are written exactly.
   */
  function fmtNum(x) {
    if (!isNum(x) || Math.abs(x) > Number.MAX_SAFE_INTEGER) return '';
    var neg = x < 0, a = Math.abs(x);
    var s = isWhole(a) ? String(a) : (Math.round(a * 1e8) / 1e8).toFixed(8).replace(/\.?0+$/, '');
    var parts = s.split('.');
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + int + (parts[1] ? ',' + parts[1] : '');
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
  var SPACES = /[\s   ]+/g;

  /** Indonesian number string → number | null. dotDecimal: read a lone non-grouping dot as a decimal point. */
  function idNumber(s, dotDecimal) {
    var neg = false;
    if (/^[-−]/.test(s)) { neg = true; s = s.slice(1); }
    var x = null;
    if (/^\d+$/.test(s)) x = Number(s);
    else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) x = Number(s.replace(/\./g, ''));
    else if (/^(\d+|[1-9]\d{0,2}(\.\d{3})+),\d+$/.test(s)) x = Number(s.replace(/\./g, '').replace(',', '.'));
    else if (dotDecimal && /^\d+\.\d+$/.test(s)) x = Number(s);
    if (x === null || !isFinite(x)) return null;
    return neg ? -x : x;
  }

  // A comma followed by exactly three digits: English thousands grouping ("7,000,000", "500,000"), or at
  // best an Indonesian decimal nobody types in rupiah. Never read as a decimal comma in a whole field.
  var COMMA_GROUP = /,\d{3}(?!\d)/;

  /** raw (string or number) → {empty} | {value} | {short: full | null} | {bad} for one unit. */
  function readNumber(raw, unit) {
    if (raw === null || raw === undefined) return { empty: true };
    if (typeof raw === 'number') return isFinite(raw) ? { value: raw } : { bad: true };
    if (typeof raw !== 'string') return { bad: true };
    var s = raw.replace(SPACES, ' ').trim().toLowerCase();
    if (!s) return { empty: true };
    var rupiah = unit === 'rp' || unit === 'rpMonth', percent = unit === 'pct', whole = !percent;
    var hadRp = /^rp\.?\s*/.test(s);
    if (hadRp) s = s.replace(/^rp\.?\s*/, '');
    var hadPct = /\s*%$/.test(s);
    if (hadPct) s = s.replace(/\s*%$/, '');
    if (unit === 'months') s = s.replace(/\s*(bulan|bln\.?)$/, '');
    // The only decimal tail a whole field takes: ",-" (rupiah), ",0" or ",00". Not ",000": that is a group.
    if (rupiah) s = s.replace(/,-$/, '');
    if (whole) s = s.replace(/,0{1,2}$/, '');
    if ((hadRp && !rupiah) || (hadPct && !percent)) return { bad: true };
    var m = /^([-−]?[\d.,]*\d)\s*([a-z]+)\.?$/.exec(s);
    if (m && has(SHORT_UNITS, m[2])) {
      // "1,500 jt" could be 1,5 jt or 1.500 jt: no full number is written out for it.
      var base = COMMA_GROUP.test(m[1]) ? null : idNumber(m[1], true);
      return { short: base === null ? null : Math.round(base * SHORT_UNITS[m[2]] * 1e6) / 1e6 };
    }
    if (/[a-z]/.test(s)) return { bad: true };
    if (/^[-−]?\d{1,3}( \d{3})+(,\d+)?$/.test(s)) s = s.replace(/ /g, '');
    var v = idNumber(s, percent);
    if (whole && s.indexOf(',') >= 0) {
      // A comma left in a whole field: a true decimal ("12,5") is reported as not whole by check();
      // a whole reading ("7,000", "7,0000") or a three-digit group ("1,250") is unreadable.
      if (v === null || isWhole(v) || COMMA_GROUP.test(s)) return { bad: true };
    }
    return v === null ? { bad: true } : { value: v };
  }

  function fail(code, pesan) { return { ok: false, code: code, pesan: pesan }; }
  function inRange(rule, x) { return x >= rule.lo && x <= rule.hi; }
  function rangeText(rule) { return fill(rule.whole ? MSG.rangeWhole : MSG.range, { a: fmtNum(rule.lo), b: fmtNum(rule.hi) }); }
  function unreadable(unit, rule) {
    if (unit === 'pct') return MSG.pct;
    if (unit === 'rp' || unit === 'rpMonth') return MSG.rupiah;
    if (unit === 'months') return rangeText(rule);
    return MSG.whole;
  }

  /**
   * check(key, raw, {source, current}) → {ok, value (null = empty), code?, pesan?}
   * current: the stored value (for "k only up"). source 'vault' skips the only-up rule.
   */
  function check(key, raw, opts) {
    opts = opts || {};
    if (!isKey(key)) return fail('kunci-tidak-dikenal', MSG.unknownKey);
    var rule = RULES[KEY_RULE[key]], unit = UNITS[key];
    var r = readNumber(raw, unit);
    if (r.empty) {
      if (rule.groupSize && opts.source !== 'vault' && isNum(opts.current) && opts.current > GROUP_FLOOR) return fail('hanya-naik', MSG.onlyUp);
      return { ok: true, value: null };
    }
    if (has(r, 'short')) {
      // The full number is written out only when the field would take it (as for fractions below).
      if (rule.rupiah && isWhole(r.short) && r.short > 0) {
        if (r.short > rule.hi) return fail('rentang', rangeText(rule));
        return fail('angka-singkat', fill(MSG.short, { nilai: 'Rp' + fmtNum(r.short) }));
      }
      return fail('angka-singkat', unreadable(unit, rule));
    }
    if (r.bad) return fail('tidak-terbaca', unreadable(unit, rule));
    var x = r.value;
    if (rule.rupiah) {
      if (!isWhole(x)) return fail('bukan-bulat', MSG.rupiah);
      if (x <= 0) return fail('rentang', MSG.rupiahPositive);
      if (x > rule.hi) return fail('rentang', rangeText(rule));
      return { ok: true, value: x };
    }
    if (rule.groupSize) {
      if (!isWhole(x)) return fail('bukan-bulat', MSG.whole);
      var floor = GROUP_FLOOR;
      if (opts.source !== 'vault' && isNum(opts.current) && opts.current > floor) floor = opts.current;
      if (x < floor) return fail('hanya-naik', MSG.onlyUp);
      if (x > rule.hi) {
        // A saved copy is the branch's own value: brought down to the ceiling, never dropped (a dropped
        // k would fall back to the floor, the least private setting).
        if (opts.source === 'vault') return { ok: true, value: rule.hi };
        return fail('rentang', fill(MSG.rangeWhole, { a: fmtNum(floor), b: fmtNum(rule.hi) }));
      }
      return { ok: true, value: x };
    }
    // A fraction is refused with the user's own number (D18). The message suggests x × 100 only when
    // that value would be accepted; otherwise the range message follows.
    if (rule.frac && x > 0 && x <= 1 && inRange(rule, times100(x))) {
      return fail('pecahan', fill(MSG.frac, { y: fmtNum(times100(x)), x: fmtNum(x) }));
    }
    if (!inRange(rule, x)) return fail('rentang', rangeText(rule));
    if (rule.whole && !isWhole(x)) return fail('bukan-bulat', rangeText(rule));
    return { ok: true, value: x };
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
  // Unknown key names (such as the keys withdrawn by D39 and D41 in an older copy) are dropped here.
  function cleanKeys(a) { return Array.isArray(a) ? inKeyOrder(a.filter(isKey)) : []; }
  function cleanChanges(a) {
    if (!Array.isArray(a)) return [];
    var seen = {};
    return a.filter(function (c) { return c && isKey(c.key) && !seen[c.key] && (seen[c.key] = true); })
      .map(function (c) { return { key: c.key, from: validValue(c.key, c.from), to: validValue(c.key, c.to) }; });
  }
  function isCount(n) { return isWhole(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER; }
  function cleanCount(m) {
    if (m === '<5') return '<5';
    if (!isCount(m)) return undefined;
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
      if (isCount(d.from) && d.from >= GROUP_FLOOR) out.from = d.from;
      if (isCount(d.to) && d.to >= GROUP_FLOOR) out.to = d.to;
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
    else if (e.act === 'policy-set') {
      // An entry from an older copy whose keys were all withdrawn (D39, D41) keeps its date and initials only.
      var named = Array.isArray(d.keys) ? d.keys.filter(isKey) : [];
      t = 'Angka kebijakan diubah' + (named.length ? ': ' + listText(named) : '') + by;
    } else if (e.act === 'policy-clear') t = 'Angka kebijakan dikosongkan' + by;
    else if (e.act === 'leads-expired') t = 'Daftar leads lama tidak dibuka' + (d.asOf ? ' · data per ' + fmtDay(d.asOf) : '');
    var changes = (d.changes || []).filter(function (c) { return c && isKey(c.key); }).map(function (c) {
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

  function forLeads() {
    return {
      prioritasThreshold: val('leads.prioritasThreshold'),
      kprMinIncome: val('leads.kprMinIncome'),
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

  function format(key, v) {
    if (!isKey(key)) return '';
    if (arguments.length < 2) v = val(key);
    if (v === null || v === undefined) return '';
    return fmtNum(v);
  }
  function text(key, v) {
    if (!isKey(key)) return '';
    if (arguments.length < 2) v = val(key);
    var n = v === null || v === undefined ? '' : fmtNum(v), u = UNITS[key];
    if (!n) return '';
    if (u === 'pct') return n + '%';
    if (u === 'rp' || u === 'rpMonth') return 'Rp' + n;
    if (u === 'months') return n + ' bulan';
    return n;
  }

  function parse(key, raw) {
    var r = check(key, raw, { source: 'user', current: val(key) });
    var out = { ok: r.ok, value: r.ok ? r.value : null };
    if (!r.ok) { out.code = r.code; out.pesan = r.pesan; }
    return out;
  }

  /* =============================================================== writes */

  function set(patch, opts) {
    var source = opts && opts.source === 'vault' ? 'vault' : 'user';
    var res = { ok: false, changed: [], errors: [] };
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

  /**
   * clear(keys?) → changed (frozen contract §1.7.1). Without keys: the policy card only (CARD_KEYS), never
   * the thresholds or k. Naming the group-size key brings k back to the floor (the turnOff flow, §8.2).
   */
  function clear(keys) {
    if (demoOn()) return [];
    var list = Array.isArray(keys) ? keys.filter(isKey) : CARD_KEYS;
    var changed = [], changes = [], kChange = null;
    inKeyOrder(list).forEach(function (key) {
      if (!has(S.values, key)) return;
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

  /** Unknown keys (such as those withdrawn by D39 and D41) are ignored and listed in `dropped`; never an error. */
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
    KEYS: KEYS.slice(), LABELS: LABELS, NAMES: NAMES, UNITS: UNITS, HINTS: HINTS,
    GROUPS: GROUPS, REQUIRED: REQUIRED, OPTIONAL: OPTIONAL.slice(), ACTS: ACTS.slice(), LOG_MAX: LOG_MAX,
    MESSAGES: MSG,
    get: get, all: all, missing: missing, set: set, clear: clear, parse: parse, on: on,
    filledDate: filledDate, groupStatus: groupStatus,
    forLeads: forLeads, forKpr: forKpr,
    format: format, text: text, listText: listText,
    actor: actor, setActor: setActor,
    log: log, history: history, capped: capped, describe: describe,
    dirty: dirty, vaultExport: vaultExport, vaultLoad: vaultLoad, markSaved: markSaved, reset: reset,
    _clock: clock
  };
});
