/* ==========================================================================
 * MCD.sections.position + MCD.position: the page "Posisi cabang" (layout 'page', group 'cabang'; its key number
 * comes from the shell registry).
 * v7 build contract: docs/V7_SPEC.md §6 (page), §1.7.6 (MCD.position), §6.5 and §6.6 (chips and landing states),
 * D12 (fixed order, no ranking by largest gap), D13 (one resolver MCD.nav.gapTarget), D17 (lead chips only for
 * counts that MCD.leadsUi shows), D24 (rank only, no peer branch names; amounts veiled by "Samarkan nama"), D28
 * (not printed, not translated), D32 ("Lihat ..." chip words, "Mendekati Prioritas"), §10.5, §11.4. User
 * decision of 19 Oct 2026: Posisi cabang is visible to every signed-in staff member, rank only, never printable.
 * D39 (22 Oct 2026, the KSM & KKB section removed): the KSM, KKB and KPR rows of the KPI file stay as branch facts;
 * there is no KSM concentration line, no policy limit line and no link to a removed tab. A KSM or KKB row points
 * to the Leads panel ("Calon KSM di Leads: {n}", "Calon KKB di Leads: {n}") while the lead list shows that count,
 * else it carries no chip.
 *
 * One page in a fixed order (the Kepala cabang reads the same order every month):
 *   1. Head: eyebrow "POSISI CABANG · {PERIODE} · AREA {AREA}", the file line "File KPI: {Terbaru | Perlu
 *      diperbarui | Kedaluwarsa} · diimpor {tanggal}" with "Impor file bulan baru", "{n} catatan impor" (opens
 *      ⓘ Sumber) and "Skor KPI: peringkat {r} dari {n}".
 *   2. Goal line as a KPI card: "Kredit consumer {x}% dari DPK" with the two amounts as its helper line.
 *   3. Four gap cards, always in this order: Booking kredit consumer · DPK · CASA · NPL retail.
 *   4. Detail only: "Booking per produk, {periode}" (KSM, KPR, KKB glass bars against target with their chips)
 *      beside "Kredit menurut produk" (one share bar of kredit consumer), then the fold "Semua KPI ({n})".
 *   Sederhana shows the head, the goal line and the four cards.
 *
 * Chips carry an id only (a gapTarget token, a task id or a lead rule id), never a value. A place chip resolves
 * through MCD.nav.gapTarget(token, {kpi}) and MCD.nav.go(target, {from: 'position'}) when the shell has MCD.nav
 * (SHELL lane, Phase B); until then the local landing table below (the same §6.6 states) is passed to
 * ctx.navigate. A chip leads only to the sections of CHIP_SECTIONS and only when that section is in the registry
 * (MCD.config.sections); any other answer of the resolver draws nothing. Lead chips come from
 * MCD.leadsUi.chip(rule) and are drawn only while that module says the count is shown (switch on, ≥ 1024 px, a
 * list loaded, the count not hidden), never while "Samarkan nama" is on.
 *
 * Privacy: the KPI model holds every branch of the area (for ranks). The page never renders another branch's
 * name, code or value; import notes that name another office are counted in one line ("{n} catatan tentang
 * cabang lain di file KPI.") and named nowhere. Amounts read "Rp •••" while names are veiled; percentages,
 * statuses and ranks stay. The page root carries translate="no"; while the page is mounted, print shows only
 * "Halaman ini memuat data bank dan tidak dicetak dari dashboard." (body.pos-noprint and the .pos-print node,
 * section-position.css). Nothing is stored: no localStorage, sessionStorage, URL or console use.
 *
 * Data, read-only: MCD.kpi.fromRecords(MCD.data.kpi_cabang) (assets/js/kpi-import.js; amounts in Rp juta,
 * ratios as fractions), MCD.data.meta.kpi_cabang (importedAt), MCD.data.lvm_kpi (UREG, the Rev LVM report),
 * MCD.leadsUi (lead chips; the page redraws on its 'mcd:leads' event and on 'mcd:policy', since the lead
 * thresholds decide which counts are shown). Everything is feature-detected. Safe DOM only. No bank policy
 * number in this file.
 * ========================================================================== */
(function (W, MCD) {
  'use strict';

  var ID = 'position';
  var HOME = '12903';
  var HOME_NAME = 'KCP Jakarta Cilangkap';
  var DATASET = 'kpi_cabang';
  var VEIL_RP = 'Rp •••';

  var TXT = {
    title: 'Posisi cabang',
    eyebrow: 'POSISI CABANG',
    empty: 'Belum ada file KPI. Impor file KPI area di Data & Privasi.',
    importBtn: 'Impor file KPI',
    importNew: 'Impor file bulan baru',
    demo: 'Posisi cabang tidak memiliki data contoh. Matikan Data contoh untuk melihat file KPI.',
    homeMissing: 'File ini tidak memuat ' + HOME_NAME + ' (' + HOME + '). Periksa file KPI yang diimpor.',
    missing: 'Belum ada angka di file ini.',
    print: 'Halaman ini memuat data bank dan tidak dicetak dari dashboard.',
    freshTitle: 'Terbaru berarti data bulan lalu atau dua bulan lalu.',
    goalTitle: 'Kredit consumer dibagi DPK, dihitung dashboard dari file KPI.',
    mixTitleAttr: 'Saldo kredit setiap produk dibagi kredit consumer cabang, dihitung dashboard dari file KPI.',
    nplLine: 'Kualitas kredit ditangani melalui proses penagihan cabang.',
    nplAreaMissing: 'NPL area belum ada di file ini.',
    prodTitle: 'Booking per produk',
    mixTitle: 'Kredit menurut produk',
    allTitle: 'Semua KPI',
    sumber: 'Sumber',
    peerLine: ' catatan tentang cabang lain di file KPI.',
    notes: ' catatan impor',
    cols: ['KPI', 'Realisasi', 'Target', 'Capaian', 'Kurang', 'Peringkat', 'Garap di'],
    lede: 'Capaian cabang terhadap target dan area, dari file KPI bulanan area.'
  };

  var STATUS = { ok: 'Tercapai', mid: 'Hampir tercapai', bad: 'Tertinggal' };
  var FRESH = ['Terbaru', 'Perlu diperbarui', 'Kedaluwarsa'];

  /* The four gap cards, in the one fixed order (D12). */
  var CARD_KEYS = ['booking.consumer', 'dpk', 'casa', 'nplRetail'];
  var CARD_TITLE = { 'booking.consumer': 'Booking kredit consumer', dpk: 'DPK', casa: 'CASA', nplRetail: 'NPL retail' };
  /* KSM · KPR · KKB, always in this order (the booking card lines and "Booking per produk"). */
  var PRODUCTS = [
    { key: 'booking.ksm', short: 'KSM', id: 'ksm', tone: 'ksm' },
    { key: 'booking.kpr', short: 'KPR', id: 'kpr', tone: 'kpr' },
    { key: 'booking.autoloan', short: 'KKB', id: 'kkb', tone: 'kkb' }
  ];
  /* "Kredit menurut produk": shares of kredit consumer; the rest is "lainnya". */
  var MIX = [
    { key: 'kredit.ksm', label: 'KSM', tone: 'ksm' },
    { key: 'kredit.kpr', label: 'KPR', tone: 'kpr' },
    { key: 'kredit.autoloan', label: 'KKB', tone: 'kkb' },
    { key: 'kredit.kartu', label: 'Kartu Kredit', tone: 'cc' }
  ];
  /* "Semua KPI" groups (§6.4). */
  var GROUPS = [
    { id: 'dana', label: 'Dana', keys: ['dpk', 'tabungan', 'giro', 'deposito', 'casa', 'casaRatio', 'cof', 'dpkRetail'] },
    { id: 'kredit', label: 'Kredit', keys: ['kredit.consumer', 'kredit.ksm', 'kredit.kpr', 'kredit.autoloan', 'kredit.kartu'] },
    { id: 'booking', label: 'Booking', keys: ['booking.consumer', 'booking.ksm', 'booking.kpr', 'booking.autoloan'] },
    { id: 'kualitas', label: 'Kualitas', keys: ['nplRetail', 'nplConsumer'] },
    { id: 'akuisisi', label: 'Akuisisi', keys: ['newCifTabungan', 'rekeningBersaldo', 'ureg', 'usak', 'fbi', 'skorKpi'] }
  ];

  /* Chips per KPI (§6.5 as changed by D39): the place chip, then the task chip; ids only. 'per-produk' scrolls to
     "Booking per produk"; a lead chip is drawn by MCD.leadsUi.chip(rule) with its own count. KSM and KKB have
     no place or task chip (their section is removed, D39): only the lead chip, which is absent unless the lead
     list shows that count. */
  function P(target, label) { return { type: 'place', target: target, label: label }; }
  function T(target, label) { return { type: 'task', target: target, label: label }; }
  function L(rule, label) { return { type: 'lead', target: 'leads:' + rule, rule: rule, label: label }; }
  var LEAD_PRIO = L('calonPrioritas', 'Mendekati Prioritas di Leads');
  var LEAD_KSM = L('calonKsm', 'Calon KSM di Leads');
  var LEAD_KKB = L('calonKkb', 'Calon KKB di Leads');
  var CHIPS = {
    'booking.ksm': [LEAD_KSM],
    'kredit.ksm': [LEAD_KSM],
    'booking.autoloan': [LEAD_KKB],
    'kredit.autoloan': [LEAD_KKB],
    'booking.kpr': [P('property', 'Lihat proyek KPR'), T('kpr-calc', 'Buka kalkulator KPR')],
    'kredit.kpr': [P('property', 'Lihat proyek KPR'), T('kpr-calc', 'Buka kalkulator KPR')],
    'booking.consumer': [P('per-produk', 'Lihat per produk')],
    'kredit.consumer': [P('per-produk', 'Lihat per produk')],
    dpk: [P('wealth', 'Lihat calon Prioritas'), LEAD_PRIO],
    deposito: [P('wealth', 'Lihat calon Prioritas'), LEAD_PRIO],
    dpkRetail: [P('wealth', 'Lihat calon Prioritas'), LEAD_PRIO],
    'kredit.kartu': [P('wealth', 'Lihat calon Prioritas'), LEAD_PRIO],
    tabungan: [P('schools', 'Lihat sekolah'), P('campus', 'Lihat kampus')],
    newCifTabungan: [P('schools', 'Lihat sekolah'), P('campus', 'Lihat kampus')],
    usak: [P('schools', 'Lihat sekolah'), P('campus', 'Lihat kampus')],
    casa: [P('merchants', 'Lihat merchant'), P('campus', 'Lihat kampus')],
    casaRatio: [P('merchants', 'Lihat merchant'), P('campus', 'Lihat kampus')],
    rekeningBersaldo: [P('schools', 'Lihat sekolah'), P('merchants', 'Lihat merchant')],
    cof: [P('merchants', 'Lihat merchant'), P('schools', 'Lihat sekolah')],
    giro: [P('merchants', 'Lihat merchant')],
    fbi: [P('merchants', 'Lihat merchant')],
    ureg: [P('merchants', 'Lihat merchant')],
    nplRetail: [], nplConsumer: [], skorKpi: []
  };
  /* The lead rules this page asks MCD.leadsUi about (its redraw signature). */
  var LEAD_RULES = ['calonPrioritas', 'calonKsm', 'calonKkb'];
  var CAMPUS_DOSEN = { casa: 1, casaRatio: 1, tabungan: 1 };
  var MERCHANT_PRIO = { ureg: 1, usak: 1, rekeningBersaldo: 1 };
  /* The only sections a place or task chip may open (D39: nothing else, whatever a resolver answers). */
  var CHIP_SECTIONS = { wealth: 1, schools: 1, campus: 1, merchants: 1, property: 1 };
  var TASKS = { 'kpr-calc': 1 };
  /* Import notes that may name another office (§6.2); they are counted, never shown. */
  var PEER_CODES = { NO_DATA: 1, BY_NAME: 1, DUP_CODE: 1, RANK_FILE: 1 };

  var S = { ctx: null, host: null, page: null, slot: null, root: null, printEl: null, allOpen: false, srcOpen: false,
    onExt: null, leadsOn: null, now: null, model: null, sig: null, allFold: null, srcFold: null };

  /* --------------------------------------------------------------- helpers */

  function isFn(f) { return typeof f === 'function'; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function safe(fn, self, args) { try { return fn.apply(self, args || []); } catch (e) { return undefined; } }
  function fmt() { return (MCD.util && MCD.util.fmt) || null; }
  function h() { return MCD.util.el.apply(null, arguments); }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function get(obj, key) {
    if (!obj) return null;
    var parts = String(key).split('.'), o = obj;
    for (var i = 0; i < parts.length; i++) { if (o == null) return null; o = o[parts[i]]; }
    return o == null ? null : o;
  }
  function num(x, d) {
    var f = fmt();
    if (f) return f.num(x, d);
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');
  }
  /** Percent from a fraction, 1 decimal (2 only when 1 would round a non-zero value to zero): '30,5'. */
  function pctDigits(x) { return Math.abs(x) > 0 && Math.round(Math.abs(x) * 1000) === 0 ? 2 : 1; }
  function pctNum(x) { return num(x * 100, pctDigits(x)); }
  /**
   * NPL against the area at the precision the card shows (so "1,5% · area 1,5%" never reads "Di atas area"):
   * 'Di atas area' (tone bad) · 'Di bawah area' · 'Sama dengan area' (tone ok); null without both values.
   */
  function compareArea(v, area) {
    if (!isNum(v) || !isNum(area)) return null;
    var p = Math.pow(10, Math.max(pctDigits(v), pctDigits(area)) + 2), a = Math.round(v * p), b = Math.round(area * p);
    return { text: a > b ? 'Di atas area' : (a < b ? 'Di bawah area' : 'Sama dengan area'), tone: a > b ? 'bad' : 'ok' };
  }
  function pct(x) { return isNum(x) ? pctNum(x) + '%' : '—'; }
  /** Capaian shown with one decimal, cut (not rounded) so 99,96% never reads "100,0%" next to "kurang". */
  function capText(c) {
    if (!isNum(c)) return '—';
    return num(Math.floor(c * 1000 + 1e-7) / 10, 1) + '%';
  }
  function veiled() {
    var c = S.ctx;
    if (c && isFn(c.privacy)) return safe(c.privacy, c) === 'veil';
    if (MCD.app && isFn(MCD.app.privacyMode)) return safe(MCD.app.privacyMode, MCD.app) === 'veil';
    var st = MCD.state && isFn(MCD.state.get) ? safe(MCD.state.get, MCD.state) : null;
    return !!(st && st.privacy && st.privacy.veil);
  }
  function demoOn() {
    var c = S.ctx;
    if (c && isFn(c.isDemo)) return !!safe(c.isDemo, c);
    return !!(MCD.data && isFn(MCD.data.demoActive) && safe(MCD.data.demoActive, MCD.data));
  }
  function deep() {
    var c = S.ctx;
    if (c && isFn(c.view)) return safe(c.view, c) === 'deep';
    return !!(MCD.app && isFn(MCD.app.view) && safe(MCD.app.view, MCD.app) === 'deep');
  }
  /** Rp juta → 'Rp 184,6 M'; veiled: 'Rp •••'. */
  function rp(vJuta, veil) {
    if (!isNum(vJuta)) return '—';
    if (veil) return VEIL_RP;
    var f = fmt();
    return f ? f.rp(vJuta * 1e6) : 'Rp ' + num(vJuta, 0) + ' jt';
  }
  /** A KPI value in its unit (§1.3: amounts Rp juta, ratios as fractions, counts, points). */
  function valText(unit, v, veil) {
    if (!isNum(v)) return '—';
    if (unit === 'rp') return rp(v, veil);
    if (unit === 'rasio') return pct(v);
    if (unit === 'jumlah') { var f = fmt(); return f ? f.int(v) : String(Math.round(v)); }
    return num(v, 2);
  }
  function statusOf(c) {
    if (!isNum(c)) return null;
    return c >= 1 ? STATUS.ok : (c >= 0.9 ? STATUS.mid : STATUS.bad);
  }
  function toneOf(status) {
    return status === STATUS.ok ? 'ok' : status === STATUS.mid ? 'mid' : status === STATUS.bad ? 'bad' : 'none';
  }
  function rankText(r, of) { return isNum(r) && isNum(of) ? 'peringkat ' + r + ' dari ' + of : null; }
  function clock() { var n = S.now; return n ? (isFn(n) ? n() : new Date(n)) : new Date(); }

  /** Freshness of a file period 'YYYY-MM' against today (WIB): last closed month or the one before = Terbaru;
      2 to 3 months older = Perlu diperbarui; older = Kedaluwarsa (§1.7.6). */
  function freshness(period, now) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
    if (!m) return FRESH[2];
    var d = now ? new Date(now) : clock();
    var wib = new Date(d.getTime() + 7 * 3600000);
    var back = (wib.getUTCFullYear() * 12 + wib.getUTCMonth() + 1) - (+m[1] * 12 + +m[2]);
    return back <= 2 ? FRESH[0] : (back <= 4 ? FRESH[1] : FRESH[2]);
  }

  /* --------------------------------------------------------- peer warnings */

  function peerMarks(kpi) {
    var codes = [], names = [];
    ((kpi && kpi.branches) || []).forEach(function (b) {
      if (!b || b.code === HOME) return;
      if (b.code && /^\d{3,6}$/.test(String(b.code))) codes.push(String(b.code));
      var n = String(b.name || '').trim().toLowerCase();
      if (n.length >= 4) names.push(n);
    });
    return { codes: codes, names: names };
  }
  /** True when an import note is about another office (D24): it names a peer's code or name, or it is a
      NO_DATA / BY_NAME / DUP_CODE / RANK_FILE note that does not name the home branch. */
  function isPeerWarning(w, kpi, marks) {
    var t = String((w && w.text) || ''), low = t.toLowerCase();
    var mk = marks || peerMarks(kpi);
    for (var i = 0; i < mk.codes.length; i++) {
      if (new RegExp('(^|\\D)' + mk.codes[i] + '(\\D|$)').test(t)) return true;
    }
    for (var j = 0; j < mk.names.length; j++) if (low.indexOf(mk.names[j]) >= 0) return true;
    if (w && PEER_CODES[w.code]) return !(t.indexOf(HOME) >= 0 || /cilangkap/i.test(t));
    return false;
  }

  /* ----------------------------------------------------- landing (§6.6) */

  function target(section, action, landing, label) {
    return { section: section, view: 'deep', action: action, landing: landing, label: label };
  }
  /** The §6.6 landing state of a gapTarget token for a KPI (the local copy of MCD.nav.gapTarget). Only the tokens
      of CHIP_SECTIONS answer; any other token (the importer still proposes tokens of removed tabs) gives null. */
  function landing(token, kpi) {
    switch (token) {
      case 'wealth':
        return target('wealth', 'wealth:tab:kec:half', { drawerTab: 'kec', drawer: 'half' }, 'Lihat calon Prioritas');
      case 'schools':
        return target('schools', 'schools:tab:list:half:k17', { drawerTab: 'list', drawer: 'half', sort: 'k17' }, 'Lihat sekolah');
      case 'campus': {
        var sort = CAMPUS_DOSEN[kpi] ? 'dosen' : 'mhs';
        return target('campus', 'campus:tab:list:half:' + sort, { drawerTab: 'list', drawer: 'half', sort: sort }, 'Lihat kampus');
      }
      case 'merchants': {
        var tab = MERCHANT_PRIO[kpi] ? 'prio' : 'edc';
        return target('merchants', 'merchants:tab:' + tab + ':half', { drawerTab: tab, drawer: 'half' }, 'Lihat merchant');
      }
      case 'property':
        return target('property', 'property:tab:projects:half:gap', { drawerTab: 'projects', drawer: 'half', sort: 'gap' }, 'Lihat proyek KPR');
      default:
        return null;
    }
  }
  /** Task chips (the local copy of MCD.nav.task): the KPR calculator only. */
  function taskTarget(id) {
    if (id === 'kpr-calc') return { section: 'property', view: 'deep', action: 'property:calculator', label: 'Buka kalkulator KPR' };
    return null;
  }
  function sectionKnown(id) {
    var list = MCD.config && MCD.config.sections;
    if (!Array.isArray(list)) return true;
    return list.some(function (s) { return s && s.id === id; });
  }
  /** Where a chip leads: {section, view, action, …} or null (unknown token or task, a section outside
      CHIP_SECTIONS, or a section not in the registry). */
  function resolve(chip, kpi) {
    if (!chip) return null;
    var N = MCD.nav, t = null;
    if (chip.type === 'place') {
      if (!CHIP_SECTIONS[chip.target]) return null;
      t = N && isFn(N.gapTarget) ? safe(N.gapTarget, N, [chip.target, { kpi: kpi }]) : landing(chip.target, kpi);
    } else if (chip.type === 'task') {
      if (!TASKS[chip.target]) return null;
      t = N && isFn(N.task) ? safe(N.task, N, [chip.target]) : taskTarget(chip.target);
    }
    if (!t || !t.section || !CHIP_SECTIONS[t.section] || !sectionKnown(t.section)) return null;
    return t;
  }
  function leadsUsable() {
    var LU = MCD.leadsUi;
    if (!LU || !isFn(LU.chip) || veiled()) return false;
    return isFn(LU.available) ? !!safe(LU.available, LU) : true;
  }
  /** What the lead chips of this page would show now (memory only, for the redraw signature): null while the
      lead list is not usable here; else, per rule, the chip's own text or null when the module hides it. */
  function leadSig() {
    if (!leadsUsable()) return null;
    var LU = MCD.leadsUi;
    return LEAD_RULES.map(function (rule) {
      var el = safe(LU.chip, LU, [rule]);
      return el && el.nodeType === 1 ? String(el.textContent || '') : null;
    });
  }

  /* ------------------------------------------------------------ the model */

  function fieldSource(kpi, key) {
    var f = ((kpi && kpi.fields) || []).filter(function (x) { return x && x.key === key; })[0];
    if (!f) return null;
    if (f.derived) return 'Dihitung dari ' + f.derived + ' (file KPI).';
    if (f.sheet) return 'Sheet ' + f.sheet + (f.header ? ' › ' + f.header : '') + ' (file KPI).';
    return null;
  }
  /** UREG is not in the KPI workbook: the home row of the Rev LVM import (dataset lvm_kpi), never demo rows. */
  function uregFromLvm() {
    var D = MCD.data, rows = D && Array.isArray(D.lvm_kpi) ? D.lvm_kpi : [];
    var meta = (D && D.meta && D.meta.lvm_kpi) || {};
    if (!rows.length || meta.source === 'demo') return null;
    var r = rows.filter(function (x) { return x && !x.isTotal && !x._demo && (x.home || String(x.code) === HOME); })[0];
    if (!r || !isNum(r.ureg)) return null;
    var tg = isNum(r.uregTarget) ? r.uregTarget : null;
    var cap = isNum(r.uregPct) ? r.uregPct : (tg ? r.ureg / tg : null);
    return { actual: r.ureg, target: tg, capaian: cap, kurang: tg != null ? Math.max(0, tg - r.ureg) : null };
  }

  function rowOf(kpi, r) {
    var cap = isNum(r.capaian) ? r.capaian : null;
    var met = isNum(cap) ? cap >= 1 : null;
    var lebih = null;
    if (met && isNum(r.actual) && isNum(r.target)) lebih = r.better === 'down' ? r.target - r.actual : r.actual - r.target;
    return {
      key: r.key, label: r.label, unit: r.unit, better: r.better,
      actual: isNum(r.actual) ? r.actual : null, target: isNum(r.target) ? r.target : null, capaian: cap,
      kurang: isNum(r.kurang) ? r.kurang : null, lebih: isNum(lebih) ? lebih : null, met: met,
      status: statusOf(cap), rank: isNum(r.rank) ? r.rank : null, of: isNum(r.of) ? r.of : null,
      chips: (CHIPS[r.key] || []).map(function (c) { return { type: c.type, label: c.label, target: c.target }; }),
      source: fieldSource(kpi, r.key)
    };
  }

  /**
   * MCD.position.model() → {state: 'empty' | 'demo' | 'ready', reason, kpi, period, periodLabel, area, freshness,
   * importedAt, rank, goal: {consumer, dpk, ratio}, cards: [4], products: [3], mix, rows, groups, warnings,
   * peerWarnings, warningCount, source}. Pure: reads MCD.data and MCD.kpi, writes nothing.
   * state 'empty' has reason 'no-file' (no KPI dataset) or 'home-missing' (the file has no row for 12903).
   */
  function model() {
    var M = { state: 'empty', reason: 'no-file', kpi: null, period: null, periodLabel: null, area: null, freshness: null, importedAt: null,
      rank: null, goal: null, cards: [], products: [], mix: null, rows: [], groups: GROUPS,
      warnings: [], peerWarnings: 0, warningCount: 0, source: null };
    if (demoOn()) { M.state = 'demo'; M.reason = null; return M; }
    var D = MCD.data, K = MCD.kpi;
    var recs = D && Array.isArray(D[DATASET]) ? D[DATASET] : [];
    if (!recs.length || !K || !isFn(K.fromRecords)) return M;
    var kpi = safe(K.fromRecords, K, [recs]);
    if (!kpi || !Array.isArray(kpi.branches) || !kpi.branches.length) return M;
    var meta = (D.meta && D.meta[DATASET]) || {};
    M.kpi = kpi;
    M.period = kpi.period || null;
    M.periodLabel = kpi.periodLabel || (K.periodLabel && kpi.period ? K.periodLabel(kpi.period) : null);
    M.area = kpi.area || null;
    M.freshness = freshness(kpi.period);
    M.importedAt = meta.importedAt || null;
    M.source = 'Sumber: file KPI ' + (M.area ? 'Area ' + M.area : 'area') + (M.periodLabel ? ', ' + M.periodLabel : '') + '. Sheet setiap angka ada di ⓘ.';
    var marks = peerMarks(kpi);
    (kpi.warnings || []).forEach(function (w) {
      if (!w) return;
      if (isPeerWarning(w, kpi, marks)) M.peerWarnings++;
      else M.warnings.push({ level: w.level || 'info', code: w.code || null, text: String(w.text || '') });
    });
    M.warningCount = M.warnings.length + M.peerWarnings;
    var home = kpi.branches.filter(function (b) { return b && b.code === HOME; })[0] || null;
    if (!home) { M.reason = 'home-missing'; return M; }
    M.state = 'ready'; M.reason = null;

    var rows = (isFn(K.homeRows) ? K.homeRows(kpi, HOME) : []).map(function (r) { return rowOf(kpi, r); });
    var by = {};
    rows.forEach(function (r) { by[r.key] = r; });
    if (by.ureg && by.ureg.actual == null) {
      var u = uregFromLvm();
      if (u) {
        by.ureg.actual = u.actual; by.ureg.target = u.target; by.ureg.capaian = isNum(u.capaian) ? u.capaian : null;
        by.ureg.kurang = u.kurang; by.ureg.met = isNum(u.capaian) ? u.capaian >= 1 : null; by.ureg.status = statusOf(by.ureg.capaian);
        by.ureg.lebih = by.ureg.met && isNum(u.target) ? u.actual - u.target : null;
        by.ureg.source = 'Dari laporan Rev LVM yang diimpor (UREG tidak ada di file KPI).';
      }
    }
    M.rows = rows;
    M.rank = { r: get(home.rank, 'skorKpi'), of: (kpi.rankOf && kpi.rankOf.skorKpi) || kpi.peerCount || null };

    var cons = by['kredit.consumer'] ? by['kredit.consumer'].actual : null, dpk = by.dpk ? by.dpk.actual : null;
    M.goal = { consumer: cons, dpk: dpk, ratio: isNum(cons) && isNum(dpk) && dpk > 0 ? cons / dpk : null };

    M.cards = CARD_KEYS.map(function (k) {
      var r = by[k] || { key: k, chips: [] };
      var c = { key: k, title: CARD_TITLE[k], kind: k === 'nplRetail' ? 'npl' : (k === 'booking.consumer' ? 'booking' : 'gap'),
        row: r, chips: (r.chips || []).slice(), missing: false, tone: 'none' };
      if (c.kind === 'npl') {
        var area = kpi.areaTotal ? get(kpi.areaTotal.kpi, 'nplRetail') : null;
        c.value = r.actual; c.area = isNum(area) ? area : null;
        c.missing = !isNum(r.actual);
        var cmp = c.missing ? null : compareArea(r.actual, c.area);
        c.compare = cmp ? cmp.text : null;
        if (cmp) c.tone = cmp.tone;
        c.chips = [];
      } else {
        c.missing = !isNum(r.capaian);
        c.tone = c.missing ? 'none' : toneOf(r.status);
        if (c.missing) c.chips = [];
      }
      if (k === 'casa') c.ratio = by.casaRatio ? by.casaRatio.actual : null;
      if (c.kind === 'booking') c.sub = PRODUCTS.map(function (p) { return { key: p.key, short: p.short, id: p.id, row: by[p.key] || null }; });
      return c;
    });
    M.products = PRODUCTS.map(function (p) {
      var r = by[p.key] || { key: p.key, chips: [] };
      return { key: p.key, short: p.short, id: p.id, tone: p.tone, row: r, missing: !isNum(r.capaian) };
    });
    if (isNum(cons) && cons > 0) {
      var known = 0;
      var parts = MIX.map(function (m) {
        var v = by[m.key] ? by[m.key].actual : null;
        if (isNum(v) && v > 0) known += v;
        return { key: m.key, label: m.label, tone: m.tone, value: isNum(v) ? v : null, share: isNum(v) ? Math.max(0, v) / cons : null };
      });
      var other = Math.max(0, cons - known);
      parts.push({ key: 'lainnya', label: 'lainnya', tone: 'oth', value: other, share: other / cons });
      M.mix = { consumer: cons, parts: parts };
    }
    return M;
  }

  /* ------------------------------------------------------------- actions */

  function navigate(t, from) {
    if (!t) return false;
    var N = MCD.nav;
    if (N && isFn(N.go)) return safe(N.go, N, [t, { from: from || ID }]) !== false;
    var c = S.ctx;
    if (c && isFn(c.navigate)) { c.navigate(t.section, { view: t.view || 'deep', action: t.action }); return true; }
    if (MCD.app && isFn(MCD.app.navigate)) { MCD.app.navigate(t.section, { view: t.view || 'deep', action: t.action }); return true; }
    return false;
  }
  function importKpi() {
    return navigate({ section: 'data', view: 'deep', action: 'data:kpi', label: TXT.importBtn }, ID);
  }
  function scrollToId(id) {
    var doc = W.document, el = doc && isFn(doc.getElementById) ? doc.getElementById(id) : null;
    if (!el && S.root && isFn(S.root.querySelector)) el = S.root.querySelector('#' + id);
    if (!el) return false;
    var reduce = MCD.util && isFn(MCD.util.reducedMotion) ? safe(MCD.util.reducedMotion) : false;
    if (isFn(el.scrollIntoView)) safe(el.scrollIntoView, el, [{ block: 'center', behavior: reduce ? 'auto' : 'smooth' }]);
    if (isFn(el.focus)) safe(el.focus, el, [{ preventScroll: true }]);
    return true;
  }
  /** Follows a chip: a place chip through gapTarget, a task chip through task, 'per-produk' scrolls. */
  function follow(chip, kpi) {
    if (!chip) return false;
    if (chip.type === 'place' && chip.target === 'per-produk') return scrollToId('pos-prod');
    if (chip.type === 'lead') {
      var LU = MCD.leadsUi;
      if (LU && isFn(LU.open)) { safe(LU.open, LU, [{ rule: chip.target.replace(/^leads:/, '') }]); return true; }
      return false;
    }
    return navigate(resolve(chip, kpi), ID);
  }

  /* ------------------------------------------------------------- the DOM */

  function chipUsable(chip, kpi, isDeep) {
    if (chip.type === 'lead') return leadsUsable();
    if (chip.type === 'place' && chip.target === 'per-produk') return !!isDeep;
    return !!resolve(chip, kpi);
  }
  function chipEl(chip, kpi) {
    if (chip.type === 'lead') {
      var LU = MCD.leadsUi, el = safe(LU.chip, LU, [chip.target.replace(/^leads:/, '')]);
      return el && el.nodeType === 1 ? el : null;
    }
    var b = h('button', { type: 'button', class: 'chip pos-chip pos-chip--' + chip.type, data: { chip: chip.type, target: chip.target } },
      h('span', { class: 'pos-chip__t', text: chip.label }), h('span', { class: 'pos-chip__go', 'aria-hidden': 'true', text: '›' }));
    b.addEventListener('click', function () { follow(chip, kpi); });
    return b;
  }
  /** The chips of one KPI as a group, or null when none can be followed here. */
  function chipsEl(chips, kpi, isDeep, only) {
    var list = (chips || []).filter(function (c) { return (!only || only(c)) && chipUsable(c, kpi, isDeep); });
    var els = list.map(function (c) { return chipEl(c, kpi); }).filter(Boolean);
    if (!els.length) return null;
    return h('div', { class: 'pos-chips', role: 'group', 'aria-label': 'Garap di' }, els);
  }
  function btn(label, cls, run) {
    var b = h('button', { type: 'button', class: 'btn pos-btn ' + (cls || 'btn--secondary') }, h('span', { text: label }));
    b.addEventListener('click', run);
    return b;
  }

  function headEl(M, veil) {
    var bits = [TXT.eyebrow];
    if (M.periodLabel) bits.push(String(M.periodLabel).toUpperCase());
    if (M.area) bits.push('AREA ' + String(M.area).toUpperCase());
    var f = fmt();
    var fileLine = 'File KPI: ' + M.freshness + (M.importedAt && f ? ' · diimpor ' + f.date(M.importedAt) : '');
    var notes = null;
    if (M.warningCount) {
      notes = h('button', { type: 'button', class: 'pos-link pos-notes', 'aria-controls': 'pos-src-body' }, h('span', { text: M.warningCount + TXT.notes }));
      notes.addEventListener('click', function () { S.srcOpen = true; if (S.srcFold) S.srcFold.refresh(); scrollToId('pos-src-body-btn'); });
    }
    var rank = M.rank && rankText(M.rank.r, M.rank.of);
    return h('header', { class: 'pos-head' },
      h('p', { class: 'pos-eyebrow', text: bits.join(' · ') }),
      h('div', { class: 'pos-file' },
        h('span', { class: 'pos-file__t pos-fresh pos-fresh--' + FRESH.indexOf(M.freshness), title: TXT.freshTitle, text: fileLine }),
        btn(TXT.importNew, 'btn--secondary pos-btn--sm', importKpi),
        notes,
        rank ? h('span', { class: 'pos-rank', text: 'Skor KPI: ' + rank }) : null));
  }
  function goalEl(M, veil) {
    var g = M.goal || {};
    var ok = isNum(g.ratio);
    return h('section', { class: 'pos-goal', 'aria-label': 'Kredit consumer dibanding DPK', title: TXT.goalTitle },
      h('p', { class: 'pos-goal__v' },
        h('span', { class: 'pos-goal__l', text: 'Kredit consumer ' }),
        h('strong', { class: 'pos-goal__n', text: ok ? pct(g.ratio) : '—' }),
        h('span', { class: 'pos-goal__l', text: ' dari DPK' })),
      h('p', { class: 'pos-goal__m', text: ok ? 'Kredit consumer ' + rp(g.consumer, veil) + ' · DPK ' + rp(g.dpk, veil) : TXT.missing }));
  }
  function kurangLine(r, veil) {
    if (!r || !isNum(r.capaian)) return null;
    if (r.met) return 'Tercapai' + (isNum(r.lebih) && r.better !== 'down' ? ' · lebih ' + valText(r.unit, r.lebih, veil) : '');
    return (isNum(r.kurang) ? 'kurang ' + valText(r.unit, r.kurang, veil) + ' · ' : '') + r.status;
  }
  /** The big value with the rank on the same row (keeps a card near 180 px tall at 1366×768, §6.8). */
  function bigRow(r, value, title) {
    var rk = rankText(r.rank, r.of);
    return h('div', { class: 'pos-card__big' }, h('p', { class: 'pos-card__v', title: title || null }, value),
      rk ? h('span', { class: 'pos-card__rank', text: rk }) : null);
  }
  function cardEl(c, veil, isDeep) {
    var r = c.row || {}, kids = [];
    if (c.kind === 'npl') {
      if (c.missing) kids.push(h('p', { class: 'pos-card__miss', text: TXT.missing }));
      else {
        kids.push(bigRow({}, h('span', { text: pct(c.value) }), r.source));
        /* the area line only with the area's value; a file without it says so in words, never a bare "area —" */
        kids.push(c.compare ? h('p', { class: 'pos-card__m pos-card__m--' + c.tone, text: 'area ' + pct(c.area) + ' · ' + c.compare })
          : h('p', { class: 'pos-card__m', text: TXT.nplAreaMissing }));
      }
      kids.push(h('p', { class: 'pos-card__note', text: TXT.nplLine }));
    } else if (c.missing) {
      kids.push(h('p', { class: 'pos-card__miss', text: TXT.missing }));
    } else if (c.kind === 'booking') {
      kids.push(bigRow(r, [h('span', { text: capText(r.capaian) }), h('span', { class: 'pos-card__u', text: ' dari target' })], r.source));
      kids.push(h('p', { class: 'pos-card__m pos-card__m--' + c.tone, text: kurangLine(r, veil) }));
      kids.push(h('ul', { class: 'pos-sub', 'aria-label': 'Booking per produk' }, c.sub.map(function (s) {
        var sr = s.row, text = !sr || !isNum(sr.capaian) ? TXT.missing : kurangLine(sr, veil);
        if (isDeep) {
          var line = h('button', { type: 'button', class: 'pos-sub__go', 'aria-controls': 'pos-prod-' + s.id },
            h('span', { class: 'pos-sub__k', text: s.short }), h('span', { class: 'pos-sub__t', text: text }), h('span', { class: 'pos-sub__a', 'aria-hidden': 'true', text: '↓' }));
          line.addEventListener('click', function () { scrollToId('pos-prod-' + s.id); });
          return h('li', { class: 'pos-sub__row' }, line);
        }
        /* Sederhana: the line's place chip (KPR), or its lead chip (KSM, KKB) while the lead list shows that count */
        var chip = sr ? chipsEl(sr.chips, s.key, false, function (x) { return x.type !== 'task'; }) : null;
        return h('li', { class: 'pos-sub__row' }, h('span', { class: 'pos-sub__line' }, h('span', { class: 'pos-sub__k', text: s.short }), h('span', { class: 'pos-sub__t', text: text })), chip);
      })));
      if (isDeep) { var pc = chipsEl(c.chips, c.key, true); if (pc) kids.push(pc); }
    } else {
      kids.push(bigRow(r, h('span', { text: valText(r.unit, r.actual, veil) }), r.source));
      kids.push(h('p', { class: 'pos-card__m', text: (c.key === 'casa' ? 'rasio CASA ' + pct(c.ratio) + ' · ' : '') + capText(r.capaian) + ' dari target' }));
      kids.push(h('p', { class: 'pos-card__m pos-card__m--' + c.tone, text: kurangLine(r, veil) }));
      var ch = chipsEl(c.chips, c.key, isDeep);
      if (ch) kids.push(ch);
    }
    return h('article', { class: 'pos-card pos-card--' + c.tone + ' pos-card--' + c.kind, role: 'listitem', data: { kpi: c.key } },
      h('h2', { class: 'pos-card__t', text: c.title }), kids);
  }

  function prodEl(M, veil) {
    var caps = M.products.map(function (p) { return p.row && isNum(p.row.capaian) ? p.row.capaian : 0; });
    /* one scale for the three bars, with room past the target so its tick stays inside the track */
    var scale = Math.min(1.5, Math.max(1.1, Math.max.apply(null, caps)));
    var rows = M.products.map(function (p) {
      var r = p.row || {}, kids = [];
      kids.push(h('div', { class: 'pos-prow__h' }, h('span', { class: 'pos-prow__k', text: p.short }),
        h('span', { class: 'pos-prow__c', text: p.missing ? '' : capText(r.capaian) + ' dari target' })));
      if (p.missing) kids.push(h('p', { class: 'pos-card__miss', text: TXT.missing }));
      else {
        var fill = Math.max(0, Math.min(r.capaian, scale)) / scale * 100, tick = 100 / scale;
        kids.push(h('div', { class: 'pos-bar', role: 'img', 'aria-label': 'Booking ' + p.short + ' ' + capText(r.capaian) + ' dari target' },
          h('span', { class: 'pos-bar__fill pos-fill--' + p.tone, style: { width: fill.toFixed(2) + '%' } }),
          h('span', { class: 'pos-bar__tick', title: 'Target', style: { left: tick.toFixed(2) + '%' } })));
      }
      var info = [];
      if (!p.missing) info.push(h('p', { class: 'pos-prow__m pos-card__m--' + toneOf(r.status), text: kurangLine(r, veil) }));
      var ch = p.missing ? null : chipsEl(r.chips, p.key, true);
      if (info.length || ch) kids.push(h('div', { class: 'pos-prow__f' }, info.length ? h('div', { class: 'pos-prow__i' }, info) : null, ch));
      return h('div', { class: 'pos-prow', id: 'pos-prod-' + p.id, tabindex: '-1' }, kids);
    });
    return h('section', { class: 'pos-x pos-prod', id: 'pos-prod', tabindex: '-1', 'aria-labelledby': 'pos-prod-t' },
      h('h2', { class: 'pos-x__t', id: 'pos-prod-t', text: TXT.prodTitle + (M.periodLabel ? ', ' + M.periodLabel : '') }), rows);
  }
  function mixEl(M) {
    var kids = [h('h2', { class: 'pos-x__t', id: 'pos-mix-t', text: TXT.mixTitle })];
    if (!M.mix) kids.push(h('p', { class: 'pos-card__miss', text: TXT.missing }));
    else {
      var label = function (p) { return p.label + ' ' + (isNum(p.share) ? pct(p.share) : '—'); };
      var aria = 'Kredit consumer menurut produk: ' + M.mix.parts.map(label).join(', ') + '.';
      kids.push(h('div', { class: 'pos-share', role: 'img', 'aria-label': aria, title: TXT.mixTitleAttr }, M.mix.parts.filter(function (p) { return isNum(p.share) && p.share > 0; }).map(function (p) {
        return h('span', { class: 'pos-share__seg pos-fill--' + p.tone, style: { width: (p.share * 100).toFixed(2) + '%' }, title: label(p) });
      })));
      kids.push(h('ul', { class: 'pos-legend' }, M.mix.parts.map(function (p) {
        return h('li', { class: 'pos-legend__i', title: isNum(p.share) ? null : TXT.missing },
          h('span', { class: 'pos-legend__sw pos-fill--' + p.tone, 'aria-hidden': 'true' }), h('span', { text: label(p) }));
      })));
    }
    return h('section', { class: 'pos-x pos-mix', 'aria-labelledby': 'pos-mix-t' }, kids);
  }
  function allRows(M, veil) {
    var by = {};
    M.rows.forEach(function (r) { by[r.key] = r; });
    var head = h('thead', null, h('tr', null, TXT.cols.map(function (c) { return h('th', { scope: 'col', text: c }); })));
    var bodies = GROUPS.map(function (g) {
      var trs = [h('tr', { class: 'pos-tbl__g' }, h('th', { scope: 'colgroup', attrs: { colspan: '7' }, text: g.label }))];
      g.keys.forEach(function (k) {
        var r = by[k];
        if (!r) return;
        var name = h('th', { scope: 'row', class: 'pos-tbl__k', title: r.source || null }, h('span', { class: 'pos-tbl__l', text: r.label }));
        var cells;
        if (!isNum(r.actual) && !isNum(r.target)) {
          cells = [h('td', { class: 'pos-tbl__miss', attrs: { colspan: '5', 'data-label': TXT.cols[1] }, text: TXT.missing })];
        } else {
          var kur = r.met ? (r.better !== 'down' && isNum(r.lebih) ? 'lebih ' + valText(r.unit, r.lebih, veil) : '—') : valText(r.unit, r.kurang, veil);
          cells = [
            h('td', { class: 'pos-num', attrs: { 'data-label': TXT.cols[1] }, text: valText(r.unit, r.actual, veil) }),
            h('td', { class: 'pos-num', attrs: { 'data-label': TXT.cols[2] }, text: valText(r.unit, r.target, veil) }),
            h('td', { class: 'pos-num', attrs: { 'data-label': TXT.cols[3] }, text: isNum(r.capaian) ? capText(r.capaian) + ' · ' + r.status : '—' }),
            h('td', { class: 'pos-num', attrs: { 'data-label': TXT.cols[4] }, text: kur }),
            h('td', { class: 'pos-num', attrs: { 'data-label': TXT.cols[5] }, text: isNum(r.rank) && isNum(r.of) ? r.rank + ' dari ' + r.of : '—' })
          ];
        }
        var ch = chipsEl(r.chips, r.key, true);
        trs.push(h('tr', { class: 'pos-tbl__r', data: { kpi: r.key } }, [name].concat(cells,
          [h('td', { class: 'pos-tbl__chips', attrs: { 'data-label': TXT.cols[6] } }, ch || h('span', { class: 'pos-dim', text: '—' }))])));
      });
      return h('tbody', { class: 'pos-tbl__grp', data: { group: g.id } }, trs);
    });
    return h('div', { class: 'pos-tbl__wrap' }, h('table', { class: 'pos-tbl' },
      h('caption', { class: 'sr-only', text: TXT.allTitle + (M.periodLabel ? ', ' + M.periodLabel : '') }), head, bodies));
  }
  /** A fold toggled in place (no redraw of the page, so focus stays on its button). */
  function foldEl(o) {
    var icon = h('span', { class: 'pos-fold__i', 'aria-hidden': 'true', text: o.open() ? '▾' : '▸' });
    var toggle = h('button', { type: 'button', class: o.cls, id: o.id + '-btn', 'aria-expanded': o.open() ? 'true' : 'false', 'aria-controls': o.id }, o.icon ? null : icon, o.label);
    var body = h('div', { class: o.bodyCls, id: o.id, hidden: !o.open() });
    function fill() { clear(body); if (o.open()) o.fill(body); }
    fill();
    toggle.addEventListener('click', function () {
      o.set(!o.open());
      toggle.setAttribute('aria-expanded', o.open() ? 'true' : 'false');
      icon.textContent = o.open() ? '▾' : '▸';
      body.hidden = !o.open();
      fill();
    });
    return { toggle: toggle, body: body, refresh: function () { toggle.setAttribute('aria-expanded', o.open() ? 'true' : 'false'); icon.textContent = o.open() ? '▾' : '▸'; body.hidden = !o.open(); fill(); } };
  }
  function allEl(M, veil) {
    var f = foldEl({ id: 'pos-all-body', cls: 'pos-fold', bodyCls: 'pos-all__body', label: h('span', { text: TXT.allTitle + ' (' + M.rows.length + ')' }),
      open: function () { return S.allOpen; }, set: function (v) { S.allOpen = v; },
      fill: function (body) { body.appendChild(allRows(M, veil)); } });
    S.allFold = f;
    return h('section', { class: 'pos-all' }, f.toggle, f.body);
  }
  function srcEl(M) {
    var f = foldEl({ id: 'pos-src-body', cls: 'pos-link pos-src__btn', bodyCls: 'pos-src__body', icon: true,
      label: h('span', null, h('span', { 'aria-hidden': 'true', text: 'ⓘ ' }), h('span', { text: TXT.sumber })),
      open: function () { return S.srcOpen; }, set: function (v) { S.srcOpen = v; },
      fill: function (body) {
        if (M.warnings.length) body.appendChild(h('ul', { class: 'pos-src__list' }, M.warnings.map(function (w) { return h('li', { class: 'pos-src__w pos-src__w--' + w.level, text: w.text }); })));
        if (M.peerWarnings) body.appendChild(h('p', { class: 'pos-src__peer', text: M.peerWarnings + TXT.peerLine }));
        if (!M.warningCount) body.appendChild(h('p', { class: 'pos-src__peer', text: 'Tidak ada catatan impor.' }));
      } });
    S.srcFold = f;
    return h('footer', { class: 'pos-src', id: 'pos-src' }, h('p', { class: 'pos-src__line', text: M.source }), f.toggle, f.body);
  }
  function stateEl(text, withButton) {
    return h('section', { class: 'pos-state', role: 'status' },
      h('p', { class: 'pos-state__t', text: text }),
      withButton ? btn(TXT.importBtn, 'btn--primary', importKpi) : null);
  }

  /** What the page depends on; an update with the same signature draws nothing (focus and scroll stay). */
  function signature() {
    var D = MCD.data || {}, meta = (D.meta && D.meta[DATASET]) || {};
    return JSON.stringify([D.version, (D[DATASET] || []).length, meta.importedAt || null, (D.lvm_kpi || []).length, demoOn(), veiled(), deep(),
      leadSig(), S.now ? String(clock().getTime()) : null]);
  }
  /** Builds the page into the slot. Returns the model it drew. */
  function render() {
    if (!S.slot) return null;
    var M = model(), veil = veiled(), isDeep = deep();
    S.allFold = null; S.srcFold = null;
    clear(S.slot);
    var kids;
    if (M.state === 'demo') kids = [stateEl(TXT.demo, false)];
    else if (M.state === 'empty') kids = [stateEl(M.reason === 'home-missing' ? TXT.homeMissing : TXT.empty, true)];
    else {
      kids = [headEl(M, veil), goalEl(M, veil),
        h('div', { class: 'pos-cards', role: 'list', 'aria-label': 'Empat kekurangan utama' }, M.cards.map(function (c) { return cardEl(c, veil, isDeep); }))];
      if (isDeep) {
        kids.push(h('div', { class: 'pos-panels' }, prodEl(M, veil), mixEl(M)));
        kids.push(allEl(M, veil));
      }
      kids.push(srcEl(M));
    }
    S.root = h('div', { class: 'pos notranslate pos--' + (isDeep ? 'deep' : 'simple') + ' pos--' + M.state + (veil ? ' is-veiled' : ''), attrs: { translate: 'no' } }, kids);
    S.slot.appendChild(S.root);
    S.leadsOn = leadsUsable();
    S.model = M;
    S.sig = signature();
    return M;
  }

  /* D28: while the page is mounted, print shows one line only (section-position.css). */
  function printGuard(on) {
    var doc = W.document;
    if (!doc || !doc.body) return;
    if (on) {
      if (!S.printEl) {
        S.printEl = h('div', { class: 'pos-print', attrs: { translate: 'no' } }, h('p', { text: TXT.print }));
        doc.body.appendChild(S.printEl);
      }
      if (doc.body.classList) doc.body.classList.add('pos-noprint');
    } else {
      if (S.printEl && S.printEl.parentNode) S.printEl.parentNode.removeChild(S.printEl);
      S.printEl = null;
      if (doc.body.classList) doc.body.classList.remove('pos-noprint');
    }
  }

  /* ------------------------------------------------------------ the section */

  var SPEC = {
    dataKeys: [],
    emptyFirst: false,
    title: TXT.title,
    lede: TXT.lede,
    crumbs: false,
    breadcrumb: false,
    shows: ['Capaian cabang terhadap target dari file KPI bulanan area', 'Kekurangan DPK, CASA, booking kredit consumer dan NPL retail',
      'Booking per produk (Detail)', 'Peringkat cabang di area, tanpa nama cabang lain'],
    needs: [],
    cards: function () { return []; },
    primary: null,
    render: function (custom) { S.slot = custom; render(); }
  };
  Object.defineProperty(SPEC, 'source', { enumerable: true, get: function () {
    var recs = MCD.data && MCD.data[DATASET];
    if (demoOn() || !Array.isArray(recs) || !recs.length) return 'File KPI area belum diimpor · data bank, hanya di komputer ini';
    var M = MCD.kpi && isFn(MCD.kpi.fromRecords) ? safe(MCD.kpi.fromRecords, MCD.kpi, [recs]) : null;
    return 'Sumber: file KPI ' + (M && M.area ? 'Area ' + M.area : 'area') + (M && M.periodLabel ? ', ' + M.periodLabel : '') + ' · data bank, hanya di komputer ini';
  } });

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (root, c) {
      S.host = root; S.ctx = c; S.slot = null; S.root = null; S.allOpen = false; S.srcOpen = false;
      if (root && root.classList) root.classList.add('pos-host');
      if (root && isFn(root.setAttribute)) root.setAttribute('translate', 'no');
      S.page = c && isFn(c.page) ? c.page(SPEC) : null;
      if (S.page && S.page.el && isFn(S.page.el.setAttribute)) {
        S.page.el.setAttribute('translate', 'no');
        if (S.page.el.classList) S.page.el.classList.add('notranslate');
      }
      if (!S.slot) { S.slot = (S.page && S.page.body) || root; render(); }
      printGuard(true);
      var doc = W.document;
      /* the lead chips follow the lead list (import, switch, thresholds); redrawn only when what they show changed */
      S.onExt = function () { if (S.slot && signature() !== S.sig) render(); };
      if (doc && isFn(doc.addEventListener)) { doc.addEventListener('mcd:leads', S.onExt); doc.addEventListener('mcd:policy', S.onExt); }
      if (c && isFn(c.registerCommands)) {
        c.registerCommands(function () {
          return [
            { label: 'Impor file KPI area', kw: 'kpi posisi cabang impor file bulanan target', run: importKpi },
            { label: 'Posisi cabang: booking per produk', kw: 'booking ksm kpr kkb posisi cabang', run: function () { if (S.ctx && isFn(S.ctx.setView) && !deep()) S.ctx.setView('deep'); scrollToId('pos-prod'); } }
          ];
        });
      }
    },
    update: function (d, keys) {
      if (S.page && isFn(S.page.update)) safe(S.page.update, S.page, [d, keys]);
      var ks = keys || ['*'];
      var hit = ['*', 'data', 'demo', 'settings', 'privacy.veil', 'privacy.reveal', 'view', 'ext', 'leads', 'policy'].some(function (k) { return ks.indexOf(k) >= 0; });
      if (hit && S.slot && signature() !== S.sig) render();
    },
    unmount: function () {
      var doc = W.document;
      if (S.onExt && doc && isFn(doc.removeEventListener)) { doc.removeEventListener('mcd:leads', S.onExt); doc.removeEventListener('mcd:policy', S.onExt); }
      S.onExt = null;
      printGuard(false);
      if (S.host && S.host.classList) S.host.classList.remove('pos-host');
      if (S.host && isFn(S.host.removeAttribute)) S.host.removeAttribute('translate');
      S.host = null; S.ctx = null; S.page = null; S.slot = null; S.root = null; S.allOpen = false; S.srcOpen = false;
    },
    layout: function () { return { posture: { deck: false, camera: null, rings: null }, padding: S.page && isFn(S.page.padding) ? S.page.padding() : undefined }; },
    /** The lead chips depend on the width (MCD.leadsUi.available: 1024 px and wider). */
    onResize: function () { if (S.slot && signature() !== S.sig) render(); },
    onAction: function (action) {
      var a = String(action || '');
      if (a === 'position:produk') { if (S.ctx && isFn(S.ctx.setView) && !deep()) S.ctx.setView('deep'); return scrollToId('pos-prod'); }
      if (a === 'position:semua') { S.allOpen = true; if (S.allFold) S.allFold.refresh(); return scrollToId('pos-all-body-btn'); }
      return false;
    }
  };

  MCD.position = {
    model: model,
    render: render,
    freshness: freshness,
    status: statusOf,
    landing: landing,
    taskTarget: taskTarget,
    resolve: resolve,
    follow: follow,
    isPeerWarning: isPeerWarning,
    CHIPS: CHIPS,
    CARD_KEYS: CARD_KEYS,
    GROUPS: GROUPS,
    TXT: TXT,
    /* tests: a fixed "today" (Date, ISO string or function) for the freshness word; null = the real clock */
    _setNow: function (d) { S.now = d || null; },
    _state: function () { return { allOpen: S.allOpen, srcOpen: S.srcOpen, mounted: !!S.slot, printGuard: !!S.printEl, leadsOn: S.leadsOn }; }
  };
})(window, window.MCD = window.MCD || {});
