/* ==========================================================================
 * MCD.nav: cross-section navigation with a way back (docs/V8_SPEC.md §2.5; V7_SPEC §1.7.2 and §2.4 as trimmed by
 * D39 and D41; V8 D57). SHELL lane. Bank Mandiri KCP Jakarta Cilangkap · Dashboard Akuisisi.
 *
 * One resolver for "this gap → the place that helps close it" (V7 D13): Posisi cabang, the lead list and the
 * Impor tab call gapTarget / task and then go(); the target section opens on its landing state (the action string
 * of the grammar below) and a crumb "‹ Kembali ke Posisi cabang" leads back. Nothing here reads a value: tokens,
 * KPI keys and section ids only.
 *
 * MCD.nav = {
 *   TOKENS: ['wealth', 'schools', 'campus', 'merchants', 'health', 'property'],   // 'property' only while KPR is shown
 *   gapTarget(token, {kpi}) → {section, view: 'deep', action, landing: {drawerTab, drawer: 'half', sort?}, label} | null
 *   task(id) → {section, view, action, label} | null      'leads:calonKpr' | 'leads:calonPrioritas' | 'kpr-calc'
 *   go(target, {from: 'position' | 'leads' | 'data' | 'merchants' | null}) → boolean   navigate + landing + crumb
 *   crumb() → {label, short, title, run} | null            painted by windows.js (slim rail) and app.js (page heads)
 *   clearCrumb() · on(fn) → off                            fn({crumb}) after every change; document event 'mcd:nav'
 *   shown(id) → boolean                                    the section is on screen (not hidden in the registry)
 * }
 *
 * Landing grammar (§2.5): <section>:tab:<drawerTab>:half[:<sort>], plus data:policy, data:leads, data:kpi,
 * data:funding, leads:open:<rule>, plan:open. A section that does not know a part ignores it (tested per section).
 *
 * Crumb rule (V7 §2.4): pages and full rails show "‹ Kembali ke {tempat}", the 76 px slim rail "‹ Kembali" with the
 * full text as title and aria-label. Any other navigation (a section switch by the row, the tab bar or a key, a hash
 * change) clears it; running it clears it too. Lock clears it.
 *
 * Classic IIFE on window.MCD (UMD for Node tests); no DOM at load, no storage, no network. Load after config.js and
 * state.js, before plan.js, leads-ui.js and windows.js (index.html).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.nav = api; api._wire(); }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  function MCD() { return (root && root.MCD) || {}; }
  function isFn(f) { return typeof f === 'function'; }
  function safe(fn, ctx, args) { try { return fn.apply(ctx || null, args || []); } catch (e) { return undefined; } }

  var TOKENS = ['wealth', 'schools', 'campus', 'merchants', 'health', 'property'];

  /* KPI keys per landing (§2.5 table; V7 §6.6 without tni, plus D57) */
  var CAMPUS_DOSEN = { casa: 1, casaRatio: 1, tabungan: 1 };          // the rest of the campus keys: sort 'mhs'
  var MERCHANT_PRIO = { ureg: 1, usak: 1, rekeningBersaldo: 1 };      // Urutan kecamatan; the rest: Kandidat EDC

  var T = {
    wealth: 'Lihat calon Prioritas', schools: 'Lihat sekolah', campus: 'Lihat kampus', merchants: 'Lihat merchant',
    health: 'Lihat rumah sakit', property: 'Lihat proyek KPR', kprCalc: 'Buka kalkulator KPR',
    leadKpr: 'Calon KPR di Leads', leadPrioritas: 'Mendekati Prioritas di Leads',
    back: 'Kembali', backTo: function (p) { return 'Kembali ke ' + p; },
    places: { position: 'Posisi cabang', leads: 'Leads', data: 'Impor', merchants: 'Merchant' }
  };

  /* ------------------------------------------------------------ registry */

  function sections() {
    var c = MCD().config;
    return c && Array.isArray(c.sections) ? c.sections : null;
  }
  /** shown(id): the section is in the registry's shown list (KPR hidden since 22 Oct 2026 answers false). */
  function shown(id) {
    var list = sections();
    if (!list) return true;                     // no registry (Node tests of a single module): every id passes
    return list.some(function (s) { return s && s.id === id && !s.hidden; });
  }
  function labelOf(id) {
    var c = MCD().config, s = c && c.sectionById ? c.sectionById[id] : null;
    return (s && s.label) || id;
  }

  /* ------------------------------------------------------------ resolvers */

  function target(section, action, landing, label) {
    return { section: section, view: 'deep', action: action, landing: landing, label: label };
  }
  /**
   * gapTarget(token, {kpi}) → the landing state of §2.5, or null for an unknown token or a section that is not
   * shown (KPR while hidden). Pure: nothing navigates here.
   */
  function gapTarget(token, o) {
    var kpi = o && o.kpi != null ? String(o.kpi) : '';
    var t = null;
    switch (token) {
      case 'wealth':
        t = target('wealth', 'wealth:tab:kec:half', { drawerTab: 'kec', drawer: 'half' }, T.wealth); break;
      case 'schools':
        t = target('schools', 'schools:tab:list:half:k17', { drawerTab: 'list', drawer: 'half', sort: 'k17' }, T.schools); break;
      case 'campus': {
        var sort = CAMPUS_DOSEN[kpi] ? 'dosen' : 'mhs';
        t = target('campus', 'campus:tab:list:half:' + sort, { drawerTab: 'list', drawer: 'half', sort: sort }, T.campus); break;
      }
      case 'merchants': {
        var tab = MERCHANT_PRIO[kpi] ? 'prio' : 'edc';
        t = target('merchants', 'merchants:tab:' + tab + ':half', { drawerTab: tab, drawer: 'half' }, T.merchants); break;
      }
      case 'health':                            // D57: giro and FBI gaps also point at hospitals
        t = target('health', 'health:tab:rs:half:rsBesar', { drawerTab: 'rs', drawer: 'half', sort: 'rsBesar' }, T.health); break;
      case 'property':
        t = target('property', 'property:tab:projects:half:gap', { drawerTab: 'projects', drawer: 'half', sort: 'gap' }, T.property); break;
      default:
        return null;
    }
    return shown(t.section) ? t : null;
  }
  /** task(id) → {section, view, action, label} | null. Leads tasks open the panel over the current section. */
  function task(id) {
    id = String(id || '');
    var m = /^leads:(calonKpr|calonPrioritas)$/.exec(id);
    if (m) return { section: null, view: null, action: 'leads:open:' + m[1], label: m[1] === 'calonKpr' ? T.leadKpr : T.leadPrioritas };
    if (id === 'kpr-calc') return shown('property') ? { section: 'property', view: 'deep', action: 'property:calculator', label: T.kprCalc } : null;
    return null;
  }

  /* ------------------------------------------------------------ crumb */

  var CRUMB = null;               // {label, short, title, run, from, to}
  var LISTENERS = [];
  function emit() {
    var c = crumb();
    LISTENERS.slice().forEach(function (fn) { safe(fn, null, [{ crumb: c }]); });
    try {
      var d = root && root.document;
      if (d && isFn(d.dispatchEvent) && isFn(root.CustomEvent)) d.dispatchEvent(new root.CustomEvent('mcd:nav', { detail: { crumb: !!c } }));
    } catch (e) { /* nobody listens */ }
  }
  function app() { return MCD().app; }
  function navigateTo(section, opts) {
    var A = app();
    if (A && isFn(A.navigate)) { safe(A.navigate, A, [section, opts || {}]); return true; }
    return false;
  }
  /** The way back for each origin: a section page, the lead panel or the Impor tab. */
  function backRun(from) {
    if (from === 'leads') return function () { var LU = MCD().leadsUi; if (LU && isFn(LU.open)) safe(LU.open, LU, [{}]); };
    if (from === 'data') return function () { navigateTo('data', { view: 'deep', action: 'tablabel:Impor' }); };
    return function () { navigateTo(from); };
  }
  function placeName(from) { return T.places[from] || labelOf(from); }
  function setCrumb(from, to) {
    if (!from || from === to) { clearCrumb(); return; }
    if (from !== 'leads' && from !== 'data' && !shown(from)) { clearCrumb(); return; }
    var full = T.backTo(placeName(from)), run0 = backRun(from);
    CRUMB = {
      label: full, short: T.back, title: full, from: from, to: to,
      run: function () { clearCrumb(); run0(); }
    };
    emit();
  }
  function crumb() {
    if (!CRUMB) return null;
    return { label: CRUMB.label, short: CRUMB.short, title: CRUMB.title, from: CRUMB.from, run: CRUMB.run };
  }
  function clearCrumb() {
    if (!CRUMB) return;
    CRUMB = null;
    emit();
  }

  /* ------------------------------------------------------------ go */

  /**
   * go(target, {from}) → boolean. A gapTarget or task result (or {section, view?, action?}); navigates, runs the
   * landing action once the section is mounted, and sets the crumb back to `from`. A target whose section is hidden
   * or unknown does nothing (false).
   */
  function go(t, o) {
    if (!t || typeof t !== 'object') return false;
    var from = o && o.from ? String(o.from) : null;
    var action = t.action ? String(t.action) : '';
    var A = app();
    /* the lead panel opens over the section on screen (V7 §9.3); its crumb is the panel's own Tutup */
    var lm = /^leads:open:(.+)$/.exec(action);
    if (lm && !t.section) {
      var LU = MCD().leadsUi;
      if (!LU || !isFn(LU.open)) return false;
      return safe(LU.open, LU, [{ rule: lm[1] }]) !== false;
    }
    if (action === 'plan:open' && !t.section) {
      var P = MCD().plan;
      return !!(P && isFn(P.open) && safe(P.open, P, [{ from: from || 'nav' }]));
    }
    var sec = t.section ? String(t.section) : '';
    if (!sec || !shown(sec)) return false;
    if (!A || !isFn(A.navigate)) return false;
    setCrumb(from, sec);
    PENDING_TO = sec;
    navigateTo(sec, { view: t.view === 'overview' ? 'overview' : 'deep', action: action || undefined });
    PENDING_TO = null;
    return true;
  }
  var PENDING_TO = null;

  /* ------------------------------------------------------------ wiring */

  var wired = false;
  function _wire() {
    if (wired) return;
    wired = true;
    /* any other section switch clears the crumb; MCD.state loads before this file (index.html) */
    var St = MCD().state;
    if (St && isFn(St.on)) {
      safe(St.on, St, ['change', function (e) {
        var keys = (e && e.keys) || [];
        if (!CRUMB || keys.indexOf('section') < 0) return;
        var to = e && e.state ? e.state.section : null;
        if ((PENDING_TO && to === PENDING_TO) || to === CRUMB.to) return;
        clearCrumb();
      }]);
    }
    try {
      var d = root && root.document;
      if (d && isFn(d.addEventListener)) d.addEventListener('mcd:gate-locking', function () { CRUMB = null; });
    } catch (e) { /* no document */ }
  }
  function on(fn) {
    if (!isFn(fn)) return function () {};
    LISTENERS.push(fn);
    return function () { LISTENERS = LISTENERS.filter(function (f) { return f !== fn; }); };
  }

  return {
    VERSION: 1,
    TOKENS: TOKENS.slice(),
    gapTarget: gapTarget, task: task, go: go,
    crumb: crumb, clearCrumb: clearCrumb, on: on, shown: shown,
    T: T,
    _wire: _wire,
    /* tests */
    _setCrumb: setCrumb
  };
});
