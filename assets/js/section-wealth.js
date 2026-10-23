/* ==========================================================================
 * MCD.sections.wealth: the section "Calon Prioritas" (id wealth; docs/V7_SPEC.md §5, D11, D17, D32, D39; COPY_STYLE_EN
 * item 48 b). Its key number and place in the section row come from the shell (D39 shifts them; nothing here pins one).
 * D39 (22 Oct 2026): the loan section is withdrawn; large-ticket merchants come from the public merchant listings only.
 *
 * Where the branch can meet people who may become Mandiri Prioritas customers, from PUBLIC data only: schools and
 * campuses of kelas biaya Premium or Atas, housing projects of segment premium and menengah atas, large-ticket
 * merchants, and the daya beli area of each kecamatan as 1–3 bars on its chip (never a fill, never a colour scale).
 * No lead on the map, no income claim, no follow-up list of its own: every card links to the place's home tab
 * ("Lihat di Sekolah ›"), where its full card and Tindak lanjut live (D11).
 *
 * Layout C "Kartu bertahap" (docs/LAYOUT_V5C_SPEC.md):
 *   Sederhana  guide: lede, the public-data line, scope, "Jenis tempat" chips (Sekolah · Kampus · Perumahan atas on,
 *              Merchant belanja besar off) with one explaining line, three cards (Kecamatan daya beli tinggi · Tempat
 *              sasaran · Tempat terdekat) and "Lihat daftar tempat".
 *   Detail     the same panel as the summary rail (workspace(), summary(): Daya beli tinggi · Tempat sasaran · DPK, the
 *              scope pair) and the drawer "Daftar & grafik" with two tabs: Daftar tempat (Terdekat dari KCP | Kelas
 *              tertinggi) · Kecamatan (ranked bars by daya beli score). Full rail: the lead count line of D17 when
 *              MCD.leadsUi gives one (never while "Samarkan nama" is on).
 *   Cards      place ('wealthPlace'): head quick actions "+ Rencana kunjungan" (MCD.plan, when loaded) and
 *              "Lihat di {tab} ›"; folds Mengapa calon Prioritas · Cara masuk · Jarak & rute. Kecamatan ('wealthKec'):
 *              list first, grouped by kind in chip order, nearest first; the callout through MCD.territory.bind.
 *   Map        one neutral ink; the shape says the kind (circle sekolah, shield or triangle kampus, rounded square
 *              perumahan, small dot merchant); kecamatan chips with bars through the territory option chipBars (MAP lane).
 * Engine: assets/js/wealth-core.js (MCD.wealth). Shared pieces are feature-detected: MCD.inst (scope), MCD.windows,
 * MCD.distance, MCD.territory, MCD.plan, MCD.leadsUi, MCD.kpi / MCD.position (the DPK number), MCD.charts.
 * Storage: mcd.wealth.ui.v1 {v, kinds, sort} (layout only, no names); the scope in sessionStorage mcd.scope.v1
 * (through MCD.inst.scope when present). Safe DOM only (MCD.util.el, textContent).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'wealth';
  var UI_KEY = 'mcd.wealth.ui.v1';
  var SCOPE_KEY = 'mcd.scope.v1';
  var TABS = [{ id: 'places', label: 'Daftar tempat' }, { id: 'kec', label: 'Kecamatan' }];
  var SLIDE_LABEL = 'Buka daftar & grafik';
  var SRC_LINE = 'Sumber: kelas biaya dari situs resmi sekolah dan kampus (dibaca 18 Okt 2026) · siswa: Dapodik · mahasiswa: PDDikti · proyek perumahan: SiKumbang dan situs developer (Okt 2026) · merchant: Overture Maps (rilis 2026-09-23.1) · daya beli area: BPS, harga rumah dan OpenStreetMap (perkiraan, 16 Okt 2026)';
  var SRC_SHORT = 'Data publik · kelas biaya, Dapodik, PDDikti, SiKumbang, Overture, BPS · Okt 2026';
  var SRC_AREAS = 'batas kecamatan © kontributor OpenStreetMap, BPS (2020)';
  var ATTRIBUTION = 'Sekolah: Dapodik · Kampus: PDDikti · Perumahan: SiKumbang · © kontributor OpenStreetMap (ODbL) · © Overture Maps Foundation · batas wilayah: BPS melalui OCHA/HDX (CC BY 3.0 IGO)';
  var DIST_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  var KPI_NONE = 'Impor file KPI untuk melihat target.';
  var LIST_MAX = 300, KL_MAX = 60, TOP_N = 5;
  var SHAPE = { sekolah: 'circle', perumahan: 'rsq', merchant: 'circle' };
  var PX = { sekolah: 12, kampus: 14, perumahan: 12, merchant: 7 };

  var Wc = null;                                  // MCD.wealth
  var ctx = null, page = null, ui = null, st = null;
  var offs = [], mapOffs = [], timers = [], distSwitches = [];
  var V = null, DISTC = new Map(), drawerSel = null, drawerObs = null, unbindTerr = null, ownFocus = null, pendingFocus = null;
  var mReady = false;

  /* ============================================================ helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function E() { return MCD.util.el.apply(null, arguments); }
  function S() { return MCD.util.el.svg.apply(null, arguments); }
  function fm() { return MCD.util.fmt; }
  function icon(n) { return ctx && isFn(ctx.icon) ? ctx.icon(n) : MCD.util.icon(n); }
  function clear(n) { return MCD.util.clear(n); }
  function isDeep() { return !!(ctx && ctx.view() === 'deep'); }
  function privacy() { return ctx && isFn(ctx.privacy) ? ctx.privacy() : 'masked'; }
  function veil() { return privacy() === 'veil'; }
  function sget(k, d) { try { var s = MCD.util.storage; return s ? s.get(k, d) : d; } catch (e) { return d; } }
  function sset(k, v) { try { var s = MCD.util.storage; return s ? s.set(k, v) : false; } catch (e) { return false; } }
  function debounce(fn, ms) { return MCD.util.debounce(fn, ms); }
  function count(n, word) { return fm().int(n) + ' ' + word; }
  function nodeOf(x) { return x && x.nodeType === 1 ? x : (x && x.el && x.el.nodeType === 1 ? x.el : null); }
  function later(fn, ms) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); fn(); }, ms || 0); timers.push(t); return t; }
  function idle(fn, ms) {
    later(function () {
      if (typeof window !== 'undefined' && isFn(window.requestIdleCallback)) { try { window.requestIdleCallback(function () { fn(); }, { timeout: 2000 }); return; } catch (e) { /* timer */ } }
      fn();
    }, ms || 0);
  }
  function admin() { var A = window.MCD_ADMIN_AREAS; return A && isFn(A.byId) ? A : null; }
  function territory() { var T = MCD.territory; return T && (!isFn(T.ready) || T.ready()) ? T : null; }
  function requestRender() { if (MCD.map && isFn(MCD.map.requestRender)) MCD.map.requestRender(); }
  function uiTheme() { var t = ctx && isFn(ctx.theme) ? ctx.theme() : null; return t === 'day' ? 'day' : 'night'; }
  function toast(m, k) { if (ctx) ctx.toast(m, k || null); }
  function WS() { var W0 = MCD.windows; return W0 && typeof W0 === 'object' ? W0 : null; }
  function adopted() { var w = ui && ui.work && ui.work.el; return !!(w && w.classList && w.classList.contains('ws-drawer')); }
  function syncAdopted() {
    var w = ui && ui.work && ui.work.el;
    if (!w) return;
    var on = adopted();
    if (on === !!w.__wlAdopted) return;
    w.__wlAdopted = on;
    if (on) { w.removeAttribute('data-slideover'); w.removeAttribute('data-slideover-label'); }
    else { w.setAttribute('data-slideover', ''); w.setAttribute('data-slideover-label', SLIDE_LABEL); }
  }
  function kindDef(k) { return Wc.KINDS.filter(function (x) { return x.id === k; })[0]; }
  function kindsOn() { return Wc.KIND_IDS.filter(function (k) { return st.kinds[k] !== false; }); }
  function kindsKey() { return kindsOn().join(','); }
  function sub(text, vars) { return String(text).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; }); }
  function labelOf(p) { return Wc.labelOf(p, privacy()); }

  /* ---- small controls */
  function btn(label, iconName, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['btn', cls || 'btn--secondary'], title: title || null }, iconName ? icon(iconName) : null, E('span', { text: label }));
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function link(label, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['wl-link', cls], text: label, title: title || null });
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  /** A radio group on the shared .seg look (← → move, Tab lands on the checked option). */
  function seg(label, opts, onPick, extra) {
    var wrap = E('div', { class: ['seg', 'wl-seg', extra], role: 'radiogroup', aria: { label: label } });
    var btns = opts.map(function (o) {
      var b = E('button', { type: 'button', class: 'seg__opt', role: 'radio', aria: { checked: 'false' }, title: o.title || o.label, attrs: { tabindex: '-1' } }, o.label);
      b.addEventListener('click', function () { onPick(o.v); });
      wrap.appendChild(b);
      return b;
    });
    wrap.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].indexOf(e.key) < 0) return;
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : btns.length - 1)) % btns.length;
      btns[n].focus(); btns[n].click();
    });
    return {
      el: wrap,
      set: function (v) {
        var any = false;
        btns.forEach(function (b, i) { var on = String(opts[i].v) === String(v); any = any || on; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
        if (!any && btns[0]) btns[0].tabIndex = 0;
      }
    };
  }
  function note(text, cls) { return E('p', { class: ['wl-note', cls], text: text }); }
  function kv(k, v, title) { return E('div', { class: 'dd-kv', title: title || null }, E('span', { class: 'dd-kv__k', text: k }), E('span', { class: 'dd-kv__v' }, v)); }
  /** A card fold: .dd-blk with data-fold, data-preview and data-open (MCD.windows reads them). */
  function blk(title, kids, cls, o) {
    var s = E('section', { class: ['dd-blk', 'wl-dd', cls] }, E('h3', { class: 't-eyebrow dd-blk__t', text: title }), kids);
    if (o) {
      if (o.id) s.setAttribute('data-fold', o.id);
      if (o.preview) s.setAttribute('data-preview', o.preview);
      if (o.open != null) s.setAttribute('data-open', o.open ? '1' : '0');
    }
    return s;
  }
  /** The kind glyph in lists and chips: the map's shape in the text colour (one neutral ink, the shape says the kind). */
  function glyph(kind, shape) {
    var sh = kind === 'kampus' ? (shape === 'shield' ? 'shield' : 'triangle') : (SHAPE[kind] || 'circle');
    var paths = {
      circle: S('circle', { cx: 8, cy: 8, r: kind === 'merchant' ? 3.2 : 5.4 }),
      rsq: S('rect', { x: 2.8, y: 2.8, width: 10.4, height: 10.4, rx: 2.4 }),
      shield: S('path', { d: 'M2.6 2.2h10.8v5.4c0 3.3-2.5 5.4-5.4 6.3-2.9-0.9-5.4-3-5.4-6.3z' }),
      triangle: S('path', { d: 'M8 2.1l6.3 11.1H1.7z' })
    };
    return S('svg', { class: ['wl-glyph', 'wl-glyph--' + kind], viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': 'true', focusable: 'false' }, paths[sh]);
  }
  /** Daya beli bars: 3 ascending bars, `n` of them drawn (the kecamatan chip's look in lists). */
  function barsSvg(n) {
    var g = S('svg', { class: 'wl-bars', viewBox: '0 0 11 10', width: 13, height: 12, 'aria-hidden': 'true', focusable: 'false', 'data-bars': n });
    for (var i = 0; i < 3; i++) { var h = 3 + 3 * i; g.appendChild(S('rect', { class: i < n ? 'wl-bars__on' : 'wl-bars__off', x: i * 4, y: 10 - h, width: 3, height: h, rx: 0.6 })); }
    return g;
  }
  function areaWord(level) { return level ? 'Daya beli ' + level : 'Daya beli belum diketahui'; }
  function areaChip(area) {
    var lv = area && area.level, n = lv ? Wc.LEVEL_BARS[lv] : 0;
    return E('span', { class: 'wl-chip wl-chip--area', title: area ? 'Daya beli area: ' + lv + ' (perkiraan)' + (area.name ? ', ' + (area.of === 'kelurahan' ? 'kelurahan ' : 'kecamatan ') + area.name : '') + '. ' + (area.why ? area.why.charAt(0).toUpperCase() + area.why.slice(1) + '.' : '') : 'Daya beli area belum tersedia.' },
      barsSvg(n), E('span', { text: areaWord(lv) }));
  }
  function classChip(p) {
    var w = Wc.classWord(p);
    var title = p.kind === 'perumahan' ? 'Segmen proyek: ' + p.segmentWord : p.kind === 'merchant' ? 'Nilai belanja besar' : 'Kelas biaya ' + p.tierLabel + (p.basisWords ? ', ' + p.basisWords.charAt(0).toLowerCase() + p.basisWords.slice(1) : '');
    return E('span', { class: ['wl-chip', 'wl-chip--class', 'is-' + (p.tier || p.segment || 'besar')], title: title }, glyph(p.kind, p.shape), E('span', { text: w }));
  }

  /* ============================================================ Google Maps (coordinates only, a new tab on a click) */

  function routeUrl(lon, lat) {
    var D = MCD.distance;
    if (D && isFn(D.directionsUrl)) { try { var u = D.directionsUrl(lon, lat); if (u) return String(u); } catch (e) { /* none */ } }
    return null;
  }

  /* ============================================================ scope (5 | 15 | 30 km, a view setting, never a filter) */

  /* Merge of the public prototype (23 Oct 2026): every map section opens at 5 km with 15 and 30 km as options (the
     teammates' rule of 21 Oct 2026, applied here in spirit since Calon Prioritas came after their base). 5 km: camera
     '5', the 15 km kecamatan zones and the 15 km kecamatan set in the ranking, places within 5 km. */
  var SCOPES = [5, 15, 30];
  function scopeOf(v) { v = +v; return v === 15 || v === 30 ? v : 5; }
  var SCOPE_MEM = null;
  function scopeApi() { var I = MCD.inst; return I && I.scope && isFn(I.scope.get) && isFn(I.scope.set) ? I.scope : null; }
  function scopeGet() {
    var A = scopeApi();
    if (A) { try { return scopeOf(A.get(ID, 5)); } catch (e) { /* own below */ } }
    if (SCOPE_MEM != null) return SCOPE_MEM;
    try {
      var raw = window.sessionStorage.getItem(SCOPE_KEY), o = raw ? JSON.parse(raw) : null;
      if (o && o.v === 1 && SCOPES.indexOf(o[ID]) >= 0) return o[ID];
    } catch (e) { /* blocked: memory */ }
    return 5;
  }
  function scopeSet(v) {
    v = scopeOf(v);
    var A = scopeApi();
    if (A) { try { A.set(ID, v); return; } catch (e) { /* own below */ } }
    SCOPE_MEM = v;
    try {
      var raw = window.sessionStorage.getItem(SCOPE_KEY), o = raw ? JSON.parse(raw) : null;
      if (!o || typeof o !== 'object' || o.v !== 1) o = { v: 1 };
      o[ID] = v;
      window.sessionStorage.setItem(SCOPE_KEY, JSON.stringify(o));
    } catch (e) { /* the value stays in memory */ }
  }
  var SCOPE_TIP = 'Tempat dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.';
  function scopeSwitch() {
    var I = MCD.inst;
    if (I && isFn(I.scopeSwitch)) {
      try {
        var r = I.scopeSwitch({ section: ID, value: st.km, wide: true, label: false, tip: SCOPE_TIP,
          onChange: function (v) { setKm(+v, { quiet: true }); },
          announce: function (v) { return 'Cakupan ' + v + ' km. ' + count(V ? V.places.length : 0, 'tempat') + ' tampil.'; } });
        var n = nodeOf(r);
        if (n) return { el: n, set: function (v) { if (r && isFn(r.set)) r.set(v); } };
      } catch (e) { /* own below */ }
    }
    var s = seg('Cakupan jarak dari Mabes TNI', SCOPES.map(function (v) { return { v: v, label: v + ' km', title: SCOPE_TIP }; }), function (v) { setKm(v); }, 'scope wl-scope');
    s.el.title = SCOPE_TIP;
    return s;
  }
  function announce(text) { if (ui && ui.panel && ui.panel.live) ui.panel.live.textContent = text; }
  function setKm(v, o) {
    v = scopeOf(v);
    if (!st) return;
    o = o || {};
    var was = st.km;
    st.km = v;            /* first: MCD.inst.scope.set calls this section's own listener at once, which must see the new value */
    scopeSet(v);
    if (was === v && !o.force) return;
    V = null;
    applyZones();
    if (o.camera !== false) cameraForKm();
    registerPosture();
    refresh(['scope']);
    if (!o.quiet) announce('Cakupan ' + v + ' km. ' + count(V ? V.places.length : 0, 'tempat') + ' tampil.');
    if (v === 30) preloadOuter(600);
  }
  /** The camera of a scope: the 5 km ring ('5', MCD.config.map.presets), 'sme15' or 'ring30'. */
  function cameraOf(km) { return km === 5 ? '5' : km === 15 ? 'sme15' : 'ring30'; }
  function cameraForKm() { var M = MCD.map; if (M && isFn(M.preset)) { try { M.preset(cameraOf(st.km)); } catch (e) { /* the map keeps its view */ } } }
  function zoneSpec() { return !st || st.km <= 15 ? { mode: 'kecamatan15' } : { mode: 'kecamatan', km: 30 }; }
  /** The section's own zones; the call ends by itself when another section takes the map (map.js setZones). */
  function applyZones() {
    var M = MCD.map;
    if (!M || !isFn(M.setZones)) return;
    try { M.setZones(Object.assign({ section: ID }, zoneSpec())); } catch (e) { /* the map keeps its zones */ }
  }
  function preloadOuter(ms) {
    later(function () {
      if (!ctx || !st || st.km !== 30) return;
      var D = MCD.distance;
      if (D && isFn(D.preload)) { try { D.preload({ outer: true }); } catch (e) { /* the table values stay */ } }
    }, ms || 0);
  }

  /* ============================================================ state (layout only in storage) */

  function defaults() {
    var k = {};
    Wc.KINDS.forEach(function (x) { k[x.id] = x.on; });
    return { km: 5, kinds: k, sort: 'near', tab: 'places', workOpen: false, openOnMount: false, selKec: null, landing: null };
  }
  function loadState() {
    var s = defaults(), saved = sget(UI_KEY, null);
    if (saved && saved.v === 1) {
      if (saved.kinds && typeof saved.kinds === 'object') Wc.KIND_IDS.forEach(function (k) { if (typeof saved.kinds[k] === 'boolean') s.kinds[k] = saved.kinds[k]; });
      if (saved.sort === 'kelas' || saved.sort === 'near') s.sort = saved.sort;
    }
    if (!Wc.KIND_IDS.some(function (k) { return s.kinds[k] !== false; })) s.kinds.sekolah = true;
    return s;
  }
  var saveUi = function () {};
  function toggleKind(k) {
    if (!st || !st.kinds.hasOwnProperty(k)) return;
    var on = st.kinds[k] !== false;
    if (on && kindsOn().length === 1) { announce('Paling sedikit satu jenis tempat tampil.'); return; }
    st.kinds[k] = !on;
    saveUi();
    V = null;
    if (k === 'merchant' && !on) mReady = true;
    refresh(['kinds']);
    registerLegendSoon();
  }
  function setSort(v) { st.sort = v === 'kelas' ? 'kelas' : 'near'; saveUi(); if (ui && ui.work && ui.work.list) renderList(); }

  /* ============================================================ data (the lazy v6 files through MCD.wealth) */

  function startData() {
    if (!Wc) return;
    Wc.ensure(['sekolah', 'kampus']).then(function () { if (ctx) { V = null; refresh(['data']); refreshOpenCard(); runPendingFocus(); } });
    refresh(['data']);
  }
  /** The kelas biaya state of the two institution kinds: 'ready' (both in), 'error' (a file failed), else 'loading'. */
  function tierState() {
    var a = Wc.kindState('sekolah'), b = Wc.kindState('kampus');
    if (a === 'ready' && b === 'ready') return 'ready';
    if (a === 'error' || b === 'error') return 'error';
    return 'loading';
  }
  function kindUsable(k) { return Wc.kindState(k) === 'ready'; }

  /* ============================================================ distance from KCP (MCD.distance) */

  function distOf(p) {
    if (!p) return null;
    if (DISTC.has(p.id)) return DISTC.get(p.id);
    var D = MCD.distance, r = null;
    if (D && isFn(D.of)) { try { r = D.of(p.lon, p.lat, { kelurahanId: p.kelurahanId || undefined, kecamatanId: p.kecamatanId || undefined }); } catch (e) { r = null; } }
    if (r && !r.pending) DISTC.set(p.id, r);
    return r;
  }
  function distText(p) {
    var D = MCD.distance, r = distOf(p);
    if (r && D && isFn(D.format)) { try { var t = D.format(r); if (t) return t; } catch (e) { /* km below */ } }
    return fm().km(p.km) + ' dari Mabes TNI';
  }
  function distTip(p) {
    var D = MCD.distance, r = distOf(p);
    if (r && D && isFn(D.tip)) { try { var t = D.tip(r); if (t) return t; } catch (e) { /* default */ } }
    return DIST_TIP;
  }
  function distSortVal(p) { var r = distOf(p); return r && isNum(r.min) ? r.min : (isNum(p.km) ? p.km * 2.4 : Infinity); }
  function distParts(p) {
    var t = distText(p), i = t.indexOf(' · ');
    return i > 0 ? { km: t.slice(0, i), min: t.slice(i + 3) } : { km: t, min: '' };
  }
  function distToggles() {
    var D = MCD.distance, el = D && isFn(D.controls) ? D.controls({ compact: true }) : null;
    if (el) distSwitches.push(el);
    return el || E('span', { hidden: true });
  }
  function onDistance() {
    DISTC = new Map();
    distSwitches.forEach(function (s) { try { if (isFn(s.sync)) s.sync(); } catch (e) { /* ignore */ } });
    if (!ctx) return;
    renderPanel();
    if (isDeep() && ui.work) renderWork(false);
    refreshOpenCard();
  }

  /* ============================================================ the view model */

  function computeView() {
    if (!Wc || !st) return null;
    var sig = [st.km, kindsKey(), Wc._pure.signature(), mReady ? 'm' : '-', MCD.data && MCD.data.version != null ? MCD.data.version : 0].join('|');
    if (V && V.sig === sig) return V;
    var wantM = mReady || st.kinds.merchant !== false;
    var counts = Wc.counts({ km: st.km, kinds: kindsOn(), merchants: wantM });
    var places = Wc.places({ km: st.km, kinds: kindsOn() });
    var kec = Wc.kecRank({ km: st.km, kinds: kindsOn(), merchants: st.kinds.merchant !== false });
    var byKec = {};
    kec.forEach(function (k) { byKec[k.kecamatanId] = k; });
    V = { sig: sig, km: st.km, counts: counts, places: places, kec: kec, byKec: byKec, mCounted: wantM, terr: null };
    return V;
  }
  function placeOf(id) { return Wc ? Wc.byId(id) : null; }
  function kecOf(kid) { return Wc ? Wc.kec(kid, { km: st.km, kinds: kindsOn() }) : null; }

  /* ============================================================ panel: guide (Sederhana) and rail (Detail) */

  function card(cls) {
    var head = E('p', { class: 'wl-card__t' }), big = E('p', { class: 'wl-card__v' }), lines = E('div', { class: 'wl-card__lines' });
    var el = E('article', { class: ['wl-card', cls], role: 'listitem' }, E('div', { class: 'wl-card__body' }, head, big, lines));
    return { el: el, head: head, big: big, lines: lines };
  }
  function buildPanel(body) {
    var p = {};
    p.live = E('p', { class: 'sr-only', aria: { live: 'polite' }, attrs: { role: 'status' } });
    p.openWork = isDeep() ? btn(SLIDE_LABEL, 'chev-r', function () { openWork(true); }, 'btn--secondary btn--lg wl-openwork') : null;
    p.publicLine = E('p', { class: 'wl-public', text: Wc.TEXT.publicLine });
    p.scope = scopeSwitch();
    p.chips = E('div', { class: 'wl-chips', role: 'group', aria: { label: Wc.TEXT.kindHead } });
    p.chipMap = {};
    Wc.KINDS.forEach(function (k) {
      var cnt = E('span', { class: 'chip__count' });
      var b = E('button', { type: 'button', class: 'chip wl-chip-btn', 'data-kind': k.id, aria: { pressed: 'false' }, title: k.title }, glyph(k.id, k.id === 'kampus' ? 'shield' : null), E('span', { class: 'wl-chip-btn__t', text: k.label }), cnt);
      b.addEventListener('click', function () { if (b.disabled || b.getAttribute('aria-disabled') === 'true') return; toggleKind(k.id); });
      p.chips.appendChild(b);
      p.chipMap[k.id] = { b: b, cnt: cnt, title: k.title };
    });
    p.kindLine = E('p', { class: 'wl-kindline', text: Wc.TEXT.kindLine });
    p.m15 = note(Wc.TEXT.merchant15, 'wl-m15');
    p.tierLine = E('div', { class: 'wl-tierstate', aria: { live: 'polite' } });
    p.cards = E('div', { class: 'wl-cards', role: 'list' });
    p.c1 = card('wl-card--kec');
    p.c2 = card('wl-card--count');
    p.c3 = card('wl-card--near');
    p.c3.big.remove();
    p.c3.sw = distToggles();
    [p.c1, p.c2, p.c3].forEach(function (c) { p.cards.appendChild(c.el); });
    p.lead = E('div', { class: 'wl-lead' });
    p.src = E('p', { class: 'wl-src', text: SRC_SHORT, title: SRC_LINE });
    p.el = E('div', { class: 'wl-panel', aria: { busy: 'false' } },
      p.openWork, p.live, p.publicLine,
      E('div', { class: 'wl-row' }, E('span', { class: 'wl-row__l', text: 'Cakupan' }), p.scope.el),
      E('div', { class: 'wl-fg' }, E('p', { class: 'wl-fg__l', text: Wc.TEXT.kindHead }), p.chips, p.kindLine, p.tierLine, p.m15),
      p.cards, p.lead, p.src);
    body.insertBefore(p.el, body.firstChild);
    ui.panel = p;
  }
  function renderChips() {
    var p = ui.panel, c = V ? V.counts : null, ts = tierState();
    Wc.KIND_IDS.forEach(function (k) {
      var m = p.chipMap[k], on = st.kinds[k] !== false, inst = k === 'sekolah' || k === 'kampus';
      var unusable = !kindUsable(k);
      m.b.setAttribute('aria-pressed', on ? 'true' : 'false');
      m.b.hidden = inst && ts === 'error' && Wc.kindState(k) === 'error';
      m.b.disabled = !!unusable;
      var n = c && c[k] != null && (k !== 'merchant' || (V && V.mCounted)) && !unusable ? c[k] : null;
      m.cnt.textContent = n != null ? ' · ' + fm().int(n) : '';
      var last = on && kindsOn().length === 1;
      if (last) { m.b.setAttribute('aria-disabled', 'true'); m.b.title = 'Paling sedikit satu jenis tempat tampil.'; }
      else { m.b.removeAttribute('aria-disabled'); m.b.title = unusable && inst && ts === 'loading' ? Wc.TEXT.tiersLoading : m.title; }
    });
    clear(p.tierLine);
    if (ts === 'error') {
      p.tierLine.appendChild(note(Wc.TEXT.tiersFailed));
      p.tierLine.appendChild(btn('Coba lagi', 'reset', function () { startData(); }, 'btn--ghost btn--bar'));
    } else if (ts !== 'ready') p.tierLine.appendChild(note(Wc.TEXT.tiersLoading, 'wl-note--busy'));
    p.m15.hidden = !(st.km === 30);
  }
  function renderPanel() {
    var p = ui && ui.panel;
    if (!p || !st) return;
    computeView();
    p.scope.set(st.km);
    p.el.setAttribute('aria-busy', tierState() === 'loading' ? 'true' : 'false');
    renderChips();
    renderKecCard(p.c1);
    renderCountCard(p.c2);
    renderNearCard(p.c3);
    renderLead(p.lead);
  }
  function emptyKinds() { return E('div', { class: 'wl-empty' }, E('p', { text: Wc.TEXT.empty })); }
  function renderKecCard(c) {
    var f = fm();
    c.head.textContent = Wc.TEXT.tinggiCard;
    c.big.textContent = V ? f.int(V.counts.tinggi) : '—';
    c.big.title = sub(Wc.TEXT.tinggiTitle, { km: st.km }) + '.';
    clear(c.lines);
    if (!V) return;
    var list = E('ul', { class: 'wl-mini' });
    V.kec.filter(function (k) { return k.level === 'tinggi'; }).slice(0, TOP_N).forEach(function (k) {
      var b = E('button', { type: 'button', class: 'wl-mini__row', title: 'Buka Kecamatan ' + k.name },
        barsSvg(k.bars), E('span', { class: 'wl-mini__txt' }, E('span', { class: 'wl-mini__name', text: k.name }),
          E('span', { class: 'wl-mini__meta', text: count(k.total, 'tempat') + (k.kota ? ' · ' + k.kota : '') })));
      b.addEventListener('click', function () { showKec(k.kecamatanId); });
      list.appendChild(E('li', {}, b));
    });
    c.lines.appendChild(list);
    c.lines.appendChild(E('p', { class: 'wl-card__foot' }, link('Lihat semua kecamatan', function () { goTab('kec'); })));
  }
  function renderCountCard(c) {
    var f = fm();
    c.head.textContent = Wc.TEXT.targets;
    c.big.textContent = V ? f.int(V.places.length) : '—';
    c.big.title = 'Tempat sasaran dari jenis tempat yang tampil, dalam ' + st.km + ' km dari Mabes TNI.';
    clear(c.lines);
    if (!V) return;
    if (!V.places.length) { c.lines.appendChild(emptyKinds()); return; }
    kindsOn().forEach(function (k) {
      var d = kindDef(k), n = V.counts[k], by = V.counts.byTier[k], parts = null;
      if (!kindUsable(k)) return;
      if (by && k === 'perumahan') parts = [by.premium ? count(by.premium, 'premium') : null, by['menengah-atas'] ? count(by['menengah-atas'], 'menengah atas') : null];
      else if (by) parts = [by.premium ? count(by.premium, 'Premium') : null, by.atas ? count(by.atas, 'Atas') : null];
      c.lines.appendChild(E('p', { class: 'wl-card__line', title: d.title },
        glyph(k, k === 'kampus' ? 'shield' : null), E('span', { text: d.label + ': ' }), E('b', { text: f.int(n) }),
        parts && parts.filter(Boolean).length ? E('span', { class: 'wl-card__quiet', text: ' (' + parts.filter(Boolean).join(', ') + ')' }) : null));
    });
    if (st.kinds.merchant !== false && st.km === 30) c.lines.appendChild(E('p', { class: 'wl-card__foot', text: Wc.TEXT.merchant15 }));
  }
  /** The n nearest places by travel time from KCP: the 40 nearest in a straight line first (KCP sits about 1 km from the
      scope centre), then sorted by minutes, so a card never asks MCD.distance for every place. */
  function nearest(n) {
    var list = V ? V.places : [];
    var b = (MCD.config && MCD.config.branch) || {}, bl = isNum(b.lon) ? b.lon : 106.90989, bt = isNum(b.lat) ? b.lat : -6.33203, kx = Math.cos(bt * Math.PI / 180);
    var d2 = function (p) { var dx = (p.lon - bl) * kx, dy = p.lat - bt; return dx * dx + dy * dy; };
    var pre = list.length > 40 ? list.slice().sort(function (a, c) { return d2(a) - d2(c); }).slice(0, 40) : list;
    return Wc.sort(pre, 'near', { dist: distSortVal }).slice(0, n);
  }
  function renderNearCard(c) {
    c.head.textContent = Wc.TEXT.nearest;
    clear(c.lines);
    if (!V) return;
    if (c.sw) { if (isFn(c.sw.sync)) { try { c.sw.sync(); } catch (e) { /* ignore */ } } c.lines.appendChild(c.sw); }
    var list = E('ul', { class: 'wl-mini' });
    nearest(TOP_N).forEach(function (p) {
      var dp = distParts(p);
      var b = E('button', { type: 'button', class: 'wl-mini__row', title: 'Buka ' + labelOf(p) + ' di peta' }, glyph(p.kind, p.shape),
        E('span', { class: 'wl-mini__txt' }, E('span', { class: 'wl-mini__name', text: labelOf(p) }),
          E('span', { class: 'wl-mini__meta', text: [Wc.classWord(p), dp.km, dp.min].filter(Boolean).join(' · '), title: distTip(p) })), E('span', { class: 'wl-mini__go', 'aria-hidden': 'true', text: '›' }));
      b.addEventListener('click', function () { focusPlace(p); });
      list.appendChild(E('li', {}, b));
    });
    if (!list.childNodes.length) list.appendChild(E('li', { class: 'wl-mini__empty', text: Wc.TEXT.empty }));
    c.lines.appendChild(list);
    c.lines.appendChild(E('p', { class: 'wl-card__foot' }, link(Wc.TEXT.seeList, function () { goTab('places'); })));
  }
  /** D17: one lead line in the full rail, only when MCD.leadsUi shows that rule's count, never while veiled. */
  function renderLead(host) {
    clear(host);
    host.hidden = true;
    if (!isDeep() || veil()) return;
    var L = MCD.leadsUi, n = null;
    if (L && isFn(L.railLine)) { try { n = nodeOf(L.railLine(['calonPrioritas'])); } catch (e) { n = null; } }
    if (!n) return;
    host.appendChild(n);
    host.hidden = false;
  }

  /* ============================================================ the slim rail numbers (summary) */

  /** The DPK achievement from the KPI file (MCD.position when the POSISI lane is in, else MCD.kpi); null without a file or under Data contoh. */
  function dpkRow() {
    try {
      if (MCD.data && isFn(MCD.data.demoActive) && MCD.data.demoActive()) return null;
      if (ctx && isFn(ctx.isDemo) && ctx.isDemo()) return null;
    } catch (e) { return null; }
    var P = MCD.position;
    if (P && isFn(P.model)) {
      try {
        var m = P.model();
        if (m && m.state === 'ready' && Array.isArray(m.rows)) {
          var r0 = m.rows.filter(function (r) { return r && r.key === 'dpk'; })[0];
          if (r0 && isNum(r0.capaian)) return { capaian: r0.capaian, period: m.period || '' };
        }
        if (m && m.state && m.state !== 'ready') return null;
      } catch (e) { /* MCD.kpi below */ }
    }
    var K = MCD.kpi, recs = MCD.data && MCD.data.kpi_cabang;
    if (!K || !isFn(K.fromRecords) || !isFn(K.homeRows) || !Array.isArray(recs) || !recs.length) return null;
    try {
      var model = K.fromRecords(recs);
      if (!model || model.ok === false) return null;
      var row = (K.homeRows(model) || []).filter(function (r) { return r && r.key === 'dpk'; })[0];
      return row && isNum(row.capaian) ? { capaian: row.capaian, period: model.periodLabel || '' } : null;
    } catch (e) { return null; }
  }
  function summary() {
    if (!st || !Wc) return { items: [], filters: 0 };
    var scope = { label: 'Cakupan', value: st.km, options: SCOPES.map(function (v) { return { v: v, label: v + ' km' }; }), set: function (v) { setKm(+v); }, title: SCOPE_TIP };
    computeView();
    var f = fm(), d = dpkRow();
    var items = [
      { value: V ? f.int(V.counts.tinggi) : '—', label: Wc.TEXT.tinggi, title: sub(Wc.TEXT.tinggiTitle, { km: st.km }) },
      { value: V ? f.int(V.places.length) : '—', label: Wc.TEXT.targets, title: 'Tempat sasaran dari jenis tempat yang tampil: ' + kindsOn().map(function (k) { return kindDef(k).label.toLowerCase(); }).join(', ') + '.' },
      d ? { value: f.pct(d.capaian, 0), label: 'DPK dari target', title: 'DPK' + (d.period ? ' ' + d.period : '') + ': ' + f.pct(d.capaian, 0) + ' dari target. Dari file KPI.' }
        : { value: '—', label: 'DPK dari target', title: KPI_NONE }
    ];
    return { items: items, filters: 0, scope: scope };
  }

  /* ============================================================ Detail: the drawer "Daftar & grafik" */

  function makeTabs(host, active, onChange, panel) {
    var items = TABS.map(function (t) { return { id: t.id, label: t.label }; });
    if (ctx && isFn(ctx.tabs)) {
      try { var t0 = ctx.tabs(host, { items: items, active: active, onChange: onChange, panel: panel, label: 'Daftar dan grafik Calon Prioritas' }); if (t0 && t0.el) { if (!t0.el.parentNode) host.appendChild(t0.el); return t0; } } catch (e) { /* own tabs */ }
    }
    var list = E('div', { class: 'wl-tabs', role: 'tablist', aria: { label: 'Daftar dan grafik Calon Prioritas' } }), cur = active;
    var btns = items.map(function (t) {
      var b = E('button', { type: 'button', class: 'wl-tab', role: 'tab', id: 'wl-tab-' + t.id, 'data-tab': t.id, aria: { selected: 'false', controls: 'wl-panel' }, attrs: { tabindex: '-1' }, text: t.label });
      b.addEventListener('click', function () { onChange(t.id); });
      list.appendChild(b);
      return b;
    });
    list.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) < 0) return;
      var ids = items.map(function (t) { return t.id; }), i = ids.indexOf(cur);
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
      onChange(ids[n]);
      btns[n].focus();
    });
    host.appendChild(list);
    var api = { el: list, set: function (id) { cur = id; btns.forEach(function (b, i) { var on = items[i].id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }, get: function () { return cur; } };
    api.set(active);
    return api;
  }
  function buildWork(host) {
    var w = {};
    w.tabHost = E('div', { class: 'wl-tabhost' });
    w.body = E('div', { class: 'wl-work__body', id: 'wl-panel', role: 'tabpanel' });
    w.tabsApi = makeTabs(w.tabHost, st.tab, function (id) { setTab(id); }, w.body);
    w.closeB = btn('Tutup', 'close', function () { openWork(false); }, 'btn--secondary btn--lg wl-work__close', 'Tutup daftar & grafik');
    w.head = E('header', { class: 'wl-work__head' },
      E('div', { class: 'wl-work__titles' }, E('p', { class: 'wl-work__eyebrow', text: 'Daftar & grafik' }), E('p', { class: 'wl-work__lede', text: 'Tempat sasaran dan kecamatan menurut daya beli area.' })),
      E('div', { class: 'wl-work__tools' }, w.closeB));
    w.foot = E('footer', { class: 'wl-work__foot' }, E('p', { class: 'wl-src', text: SRC_LINE }));
    w.el = E('aside', { class: 'wl-work panel panel--sheet', aria: { label: 'Daftar dan grafik Calon Prioritas' }, attrs: { 'data-map-occluder': '', 'data-slideover': '', 'data-slideover-label': SLIDE_LABEL } },
      w.head, w.tabHost, w.body, w.foot);
    host.appendChild(w.el);
    ui.work = w;
  }
  function setTab(id) { if (st.tab === id && ui.work && ui.work.current === id) return; st.tab = id; renderWork(true); }
  function goTab(id, o) {
    st.tab = TABS.some(function (t) { return t.id === id; }) ? id : 'places';
    if (o && o.sort) { st.sort = o.sort === 'kelas' ? 'kelas' : 'near'; saveUi(); }
    if (!isDeep()) { st.openOnMount = true; if (o && o.half) st.landing = 'half'; ctx.setView('deep'); return; }
    openWork(true, o && o.half);
    renderWork(true);
  }
  function openWork(on, half) {
    st.workOpen = !!on;
    syncWork();
    if (on && adopted()) { var W0 = WS(); try { if (W0 && isFn(W0.drawer) && isFn(W0.setDrawer) && (half || W0.drawer() === 'peek')) W0.setDrawer('half'); } catch (e) { /* the drawer keeps its height */ } }
    if (on && ui.work) later(function () {
      if (!ui || !ui.work) return;
      var b = ui.work.el.querySelector('[role="tab"][aria-selected="true"]');
      if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }, 60);
  }
  function syncWork() {
    var w = ui && ui.work;
    if (!w) return;
    syncAdopted();
    w.el.classList.toggle('is-open', !!st.workOpen);
    document.body.classList.toggle('wl-work-open', !!st.workOpen);
    if (ctx) ctx.relayout();
  }
  function renderWork(force) {
    var w = ui && ui.work;
    if (!w) return;
    if (!TABS.some(function (t) { return t.id === st.tab; })) st.tab = 'places';
    if (w.tabsApi && isFn(w.tabsApi.set)) w.tabsApi.set(st.tab);
    if (w.current !== st.tab || force === true) {
      dropPanel();
      clear(w.body);
      w.current = st.tab;
      w.body.scrollTop = 0;
      if (st.tab === 'kec') buildKecTab(w.body); else buildList(w.body);
    }
    if (st.tab === 'kec') renderKecTab(); else renderList();
  }
  function dropPanel() {
    var w = ui.work;
    (w.handles || []).forEach(function (h) { try { h.destroy(); } catch (e) { /* ignore */ } });
    w.handles = [];
    w.list = w.kec = null;
  }

  /* ---- tab "Daftar tempat" */
  function buildList(body) {
    var l = {};
    l.title = E('p', { class: 'wl-list__title' });
    l.sort = seg('Urutkan tempat', [{ v: 'near', label: Wc.TEXT.sortNear, title: 'Waktu tempuh dari KCP Jakarta Cilangkap, lalu lintas normal.' }, { v: 'kelas', label: Wc.TEXT.sortKelas, title: Wc.TEXT.sortKelasTitle }],
      function (v) { setSort(v); }, 'wl-sort');
    l.sw = distToggles();
    l.rows = E('div', { class: 'wl-list', role: 'list', aria: { label: Wc.TEXT.list } });
    l.more = E('div', { class: 'wl-list__more' });
    body.appendChild(E('div', { class: 'wl-list__tools' }, l.title, l.sort.el, l.sw));
    body.appendChild(l.rows);
    body.appendChild(l.more);
    ui.work.list = l;
    l.max = LIST_MAX;
  }
  function placeRow(p, kid) {
    var dp = distParts(p);
    var meta = [Wc.classWord(p), p.area ? 'daya beli ' + p.area.level : null, dp.km + (dp.min ? ' · ' + dp.min : '')].filter(Boolean).join(' · ');
    var b = E('button', { type: 'button', class: 'dd-list__row wl-row-btn', 'data-id': p.id, title: 'Buka ' + labelOf(p) + ' di kartu' }, glyph(p.kind, p.shape),
      E('span', { class: 'wl-row-btn__txt' }, E('span', { class: 'dd-list__name', text: labelOf(p) }), E('span', { class: 'dd-list__meta', text: meta, title: distTip(p) })));
    b.addEventListener('click', function () { if (kid) openInTrail(p, kid); else openPlace(p); });
    return E('div', { role: 'listitem', class: 'wl-list__li' }, b);
  }
  function renderList() {
    var l = ui && ui.work && ui.work.list;
    if (!l) return;
    computeView();
    l.sort.set(st.sort);
    if (l.sw && isFn(l.sw.sync)) { try { l.sw.sync(); } catch (e) { /* ignore */ } }
    var rows = Wc.sort(V ? V.places : [], st.sort, { dist: distSortVal });
    l.title.textContent = count(rows.length, 'tempat') + ' dalam ' + st.km + ' km';
    clear(l.rows);
    clear(l.more);
    if (!rows.length) { l.rows.appendChild(emptyKinds()); return; }
    rows.slice(0, l.max).forEach(function (p) { l.rows.appendChild(placeRow(p)); });
    if (rows.length > l.max) {
      l.more.appendChild(note('+' + fm().int(rows.length - l.max) + ' tempat lainnya.'));
      l.more.appendChild(btn('Tampilkan lebih banyak', 'chev-d', function () { l.max += LIST_MAX; renderList(); }, 'btn--ghost btn--bar'));
    }
    if (st.kinds.merchant !== false && st.km === 30) l.more.appendChild(note(Wc.TEXT.merchant15));
  }

  /* ---- tab "Kecamatan" */
  function buildKecTab(body) {
    var k = {};
    k.title = E('p', { class: 'wl-list__title' });
    k.sub = E('p', { class: 'wl-list__sub', text: 'Daya beli area (perkiraan), dari skor tertinggi · tempat sasaran dari jenis tempat yang tampil' });
    k.chart = E('div', { class: 'wl-kecchart' });
    body.appendChild(k.title);
    body.appendChild(k.sub);
    body.appendChild(k.chart);
    body.appendChild(note(Wc.TEXT.legendBars, 'wl-kec__legend'));
    ui.work.kec = k;
  }
  function kecItems() {
    return (V ? V.kec : []).map(function (k) {
      return { id: k.kecamatanId, label: k.name, value: isNum(k.score) ? Math.round(k.score * 100) : 0,
        valueLabel: k.level || '—', sub: [k.level ? 'daya beli ' + k.level : 'daya beli belum tersedia', count(k.total, 'tempat')], line: k.name + ' · ' + (k.level || 'belum tersedia') + ' · ' + count(k.total, 'tempat'),
        title: 'Kecamatan ' + k.name + ': daya beli ' + (k.level || 'belum tersedia') + ' (perkiraan). ' + (k.why ? k.why.charAt(0).toUpperCase() + k.why.slice(1) + '. ' : '') + count(k.total, 'tempat sasaran') + '.',
        bars: k.bars, total: k.total };
    });
  }
  function renderKecTab() {
    var k = ui && ui.work && ui.work.kec;
    if (!k) return;
    computeView();
    var items = kecItems();
    k.title.textContent = count(items.length, 'kecamatan') + ' dalam ' + st.km + ' km · ' + count(V ? V.counts.tinggi : 0, 'kecamatan') + ' daya beli tinggi';
    clear(k.chart);
    (ui.work.handles || []).forEach(function (h) { try { h.destroy(); } catch (e) { /* ignore */ } });
    ui.work.handles = [];
    var Ch = MCD.charts, h = null;
    if (Ch && isFn(Ch.rankedBars) && items.length) {
      try {
        h = Ch.rankedBars(k.chart, { items: items.map(function (x) { return { id: x.id, label: x.label, sub: x.sub, value: x.value, valueLabel: x.valueLabel, title: x.title }; }),
          onSelect: function (it) { if (it && it.id) showKec(String(it.id)); }, max: items.length, sort: false, tone: 'navy', label: 'Kecamatan menurut daya beli area', actionHint: 'Buka daftar tempat di kecamatan ini' }, {});
      } catch (e) { h = null; }
    }
    if (h) { ui.work.handles.push(h); return; }
    var list = E('ol', { class: 'wl-kec' });
    items.forEach(function (x, i) {
      var b = E('button', { type: 'button', class: 'wl-kec__row', title: x.title, 'data-kec': x.id },
        E('span', { class: 'wl-kec__rank', text: String(i + 1) }), barsSvg(x.bars),
        E('span', { class: 'wl-kec__name', text: x.line }));
      b.addEventListener('click', function () { showKec(x.id); });
      list.appendChild(E('li', {}, b));
    });
    if (!items.length) list.appendChild(E('li', { class: 'wl-mini__empty', text: 'Belum ada kecamatan dalam cakupan ini.' }));
    k.chart.appendChild(list);
  }

  /* ============================================================ the place card and its callout */

  function planQuick(p) {
    var P = MCD.plan, stop = Wc.stopOf(p);
    if (!P || !isFn(P.quick) || !stop) return null;
    try { return P.quick(stop) || null; } catch (e) { return null; }
  }
  function homeQuick(p) {
    var h = Wc.homeAction(p);
    if (!h) return null;
    return { id: 'home', label: h.label, title: h.title, nav: true,
      run: function () { var ok = h.run(); if (!ok) toast('Tab ' + h.tab + ' belum dapat dibuka. Coba lagi setelah dashboard terbuka.', 'warn'); return { ok: false, nav: true }; } };
  }
  function placeBrief(p) {
    var dp = distParts(p), f = fm(), nums = [];
    nums.push(dp.km && dp.km !== '—' ? { label: dp.min ? dp.min + ' dari KCP' : 'Dari KCP', value: dp.km, title: distText(p) + '\n' + distTip(p) } : { label: 'Dari KCP', value: '—', title: distTip(p) });
    nums.push({ label: p.key.label + (p.key.approx ? ' (perkiraan)' : ''), value: p.key.value, big: true, title: p.key.title });
    var pq = planQuick(p), hq = homeQuick(p);
    var primary = pq && !pq.done ? { label: pq.label || '+ Rencana kunjungan', run: function () { var r = isFn(pq.run) ? pq.run() : null; if (r && r.ok === false && r.message) toast(r.message, 'warn'); } }
      : (hq ? { label: hq.label, run: function () { hq.run(); } } : null);
    return { numbers: nums, chips: [classChip(p), areaChip(p.area)], primary: primary, note: null };
  }
  function trailCrumb(kid) {
    var name = Wc.kecName(kid);
    return { id: String(kid), label: name, title: 'Kembali ke Kecamatan ' + name, run: function () { openKec(String(kid)); } };
  }
  function whyBlock(p) {
    var lines = Wc.whyLines(p);
    return blk(Wc.TEXT.why, lines.map(function (t, i) { return note(t, i === lines.length - 1 ? 'wl-note--quiet' : null); }), 'wl-dd--why',
      { id: 'mengapa', preview: Wc.classWord(p) + (p.area ? ' · daya beli ' + p.area.level : ''), open: true });
  }
  function wayBlock(p) {
    return blk(Wc.TEXT.wayIn, [note(p.wayIn)], 'wl-dd--way', { id: 'masuk', preview: p.wayIn, open: true });
  }
  function routeBlock(p) {
    var A = admin(), kel = A && p.kelurahanId ? A.byId(p.kelurahanId) : null;
    var where = [kel ? 'Kelurahan ' + kel.name : null, p.kecamatanId ? 'Kecamatan ' + Wc.kecName(p.kecamatanId) : null, Wc.kotaWord(p.kecamatanId) || null].filter(Boolean).join(', ');
    var kids = [
      E('p', { class: 'wl-route', title: distTip(p), text: distText(p) + ' dari KCP (perkiraan, lalu lintas normal)' }),
      where ? kv('Wilayah', where) : null,
      kv('Jarak dari Mabes TNI', fm().km(p.km)),
      p.approx ? note('Titik lokasi perkiraan.') : null,
      E('div', { class: 'wl-actions' }, btn('Perbesar ke lokasi', 'target', function () { zoomTo(p); }, 'btn--secondary btn--bar'))
    ];
    return blk(Wc.TEXT.route, kids, 'wl-dd--route', { id: 'rute', preview: distText(p), open: false });
  }
  /**
   * How many head quick actions MCD.windows paints. The v5/v6 windows.js paints the first only (quickEl); the SHELL lane
   * may raise it by setting MCD.windows.QUICK_MAX. Without MCD.windows the card has no head, so 0.
   */
  function quickMax() {
    var W0 = WS();
    if (!W0) return 0;
    var n = W0.QUICK_MAX;
    return isNum(n) && n >= 1 ? Math.floor(n) : 1;
  }
  /** The quick actions the head cannot show, as a row at the top of the card body ("Lihat di {tab} ›" is never lost). */
  function actionRow(list) {
    var row = E('div', { class: 'wl-actions wl-actions--head' });
    (list || []).forEach(function (q) {
      if (!q || q.done || !isFn(q.run)) return;
      row.appendChild(btn(q.label || '+ Rencana kunjungan', null, function () { var r = q.run(); if (r && r.ok === false && r.message) toast(r.message, 'warn'); },
        q.nav ? 'btn--ghost btn--bar' : 'btn--secondary btn--bar', q.title || null));
    });
    return row.childNodes.length ? row : null;
  }
  /** The place card (§5.4): head quick actions, three folds, the Google links in the footer (hidden while veiled). */
  function placeModel(p, o) {
    o = o || {};
    if (!p) return null;
    var body = [whyBlock(p), wayBlock(p), routeBlock(p)];
    var b = placeBrief(p);
    var quick = [planQuick(p), homeQuick(p)].filter(Boolean);
    var ar = actionRow(quick.slice(quickMax()));
    if (ar) body.unshift(ar);
    return {
      kind: 'wlPlace', key: 'wealth:' + p.id,
      eyebrow: Wc.eyebrow(p).toUpperCase(), title: labelOf(p),
      tags: b.chips.map(function (n) { return n.cloneNode(true); }), body: body,
      gmaps: veil() ? null : { lat: p.lat, lon: p.lon, approx: !!p.approx },
      prov: SRC_LINE, brief: b, quick: quick,
      crumb: o.trail ? trailCrumb(o.trail) : null,
      anchor: [p.lon, p.lat], hints: []
    };
  }

  /* ============================================================ the kecamatan card (list first) and its callout */

  function kecBrief(k) {
    var nums = [];
    Wc.KIND_IDS.forEach(function (x) { if (st.kinds[x] !== false && k.counts[x] > 0 && nums.length < 3) nums.push({ label: kindDef(x).word, value: fm().int(k.counts[x]), big: !nums.length, title: count(k.counts[x], kindDef(x).word) + ' dalam ' + st.km + ' km' }); });
    if (!nums.length) nums.push({ label: 'tempat sasaran', value: '0', big: true, title: sub(Wc.TEXT.kecNone, { km: st.km }) });
    var chips = [k.level ? E('span', { class: 'wl-chip wl-chip--area', title: 'Daya beli area: ' + k.level + ' (perkiraan).' }, barsSvg(k.bars), E('span', { text: areaWord(k.level) })) : null].filter(Boolean);
    var noteObj = k.level ? (k.why ? { text: k.why.charAt(0).toUpperCase() + k.why.slice(1) + '.', tone: 'none' } : null) : { text: Wc.TEXT.kecNoArea, tone: 'none' };
    return { numbers: nums, chips: chips, primary: k.total ? { label: Wc.TEXT.seeKec, run: function () { openKec(k.kecamatanId); } } : null, note: noteObj };
  }
  function kecEyebrow(k) { return 'KECAMATAN' + (k.level ? ' · DAYA BELI ' + k.level.toUpperCase() + ' (PERKIRAAN)' : (k.kota ? ' · ' + k.kota.toUpperCase() : '')); }
  function kecAnchor(kid) {
    var T = territory(), A = admin(), b = null, rec = null;
    try { b = T && isFn(T.boundsOf) ? T.boundsOf(kid) : null; } catch (e) { b = null; }
    try { rec = A ? A.byId(kid) : null; } catch (e) { rec = null; }
    var lb = rec && Array.isArray(rec.label) ? [rec.label[0], rec.label[1]] : (b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : null);
    return b ? { bbox: b, label: lb } : lb;
  }
  function kecModel(kid, o) {
    o = o || {};
    var k = kecOf(kid);
    if (!k) return null;
    var listFirst = o.listFirst !== false;
    var groups = [];
    var shown = 0;
    Wc.KIND_IDS.forEach(function (x) {
      if (st.kinds[x] === false) return;
      var rows = k.places.filter(function (p) { return p.kind === x; });
      if (!rows.length) return;
      var list = E('div', { class: 'dd-list wl-kl', role: 'list', aria: { label: kindDef(x).label + ' di ' + k.name } });
      rows.forEach(function (p) { if (shown < KL_MAX) { list.appendChild(placeRow(p, kid)); shown++; } });
      if (list.childNodes.length) groups.push(E('div', { class: 'wl-kl__group' }, E('p', { class: 'wl-kl__head' }, glyph(x, x === 'kampus' ? 'shield' : null), E('span', { text: kindDef(x).label + ' · ' + fm().int(rows.length) })), list));
    });
    var kids = groups.length ? groups : [note(sub(Wc.TEXT.kecNone, { km: st.km }))];
    if (k.total > KL_MAX) kids.push(note('+' + (k.total - KL_MAX) + ' lainnya. Perbesar peta untuk melihat setiap tempat.'));
    if (st.kinds.merchant !== false && st.km === 30) kids.push(note(Wc.TEXT.merchant15));
    var lb = blk('Tempat di ' + k.name, kids, 'wl-dd--klist', { id: 'daftar', preview: count(k.total, 'tempat'), open: true });
    if (listFirst) { lb.classList.remove('dd-blk'); lb.classList.add('wl-kl-blk'); }
    var area = blk('Daya beli area', [
      k.level ? E('p', { class: 'wl-arealine' }, barsSvg(k.bars), E('span', { text: 'Daya beli area: ' + k.level + ' (perkiraan).' })) : note(Wc.TEXT.kecNoArea),
      k.why ? note(k.why.charAt(0).toUpperCase() + k.why.slice(1) + '.') : null,
      note(Wc.WAY_IN.kecamatan),
      note(Wc.TEXT.publicCard, 'wl-note--quiet'),
      E('div', { class: 'wl-actions' }, btn('Perbesar ke kecamatan', 'target', function () { zoomKec(kid); }, 'btn--secondary btn--bar'))
    ], 'wl-dd--area', { id: 'area', preview: k.level ? 'daya beli ' + k.level : 'belum tersedia', open: !listFirst });
    var kb = kecBrief(k);
    if (listFirst) kb.primary = null;
    return { kind: 'kec', key: 'kec:' + kid, eyebrow: kecEyebrow(k), title: k.name, body: listFirst ? [lb, area] : [area, lb],
      gmaps: veil() ? null : { q: 'Kecamatan ' + k.name + (k.kota ? ', ' + k.kota : '') }, listFirst: listFirst, prov: SRC_LINE + '; ' + SRC_AREAS, brief: kb, anchor: kecAnchor(kid), hints: [] };
  }
  /** territory.bind popup(kid): the kecamatan callout (eyebrow and title through the spec; numbers per kind, ≤ 3). */
  function kecPopup(kid) {
    var k = kecOf(kid);
    if (!k) return {};
    var b = kecBrief(k);
    return {
      eyebrow: kecEyebrow(k), title: k.name,
      rows: b.numbers.map(function (n) { return { label: n.label, value: n.value }; }),
      big: { value: b.numbers[0].value, caption: b.numbers[0].label },
      chip: null, demo: false, kind: 'kec', key: 'kec:' + kid, brief: b, anchor: kecAnchor(kid), source: 'Sumber: ' + SRC_SHORT + ' · ' + SRC_AREAS
    };
  }

  /* ============================================================ map */

  var INK = {};
  function inkOf(ms) {
    var theme = ms && ms.theme === 'day' ? 'day' : 'night';
    if (INK[theme]) return INK[theme];
    var P0 = ms && ms.kit && ms.kit.palette;
    var day = theme === 'day';
    var fill = P0 && P0.text1 ? P0.text1.slice(0, 3) : (day ? [14, 30, 54] : [237, 239, 243]);
    var ring = day ? [255, 255, 255] : (P0 && P0.canvas ? P0.canvas.slice(0, 3) : [5, 8, 15]);
    var quiet = P0 && P0.text2 ? P0.text2.slice(0, 3) : (day ? [59, 74, 98] : [167, 176, 192]);
    INK[theme] = { fill: fill, ring: ring, quiet: quiet };
    return INK[theme];
  }
  function shapeOf(p) { return p.kind === 'kampus' ? (p.shape === 'shield' ? 'shield' : 'triangle') : (SHAPE[p.kind] || 'circle'); }
  var ATL = {};
  function atlasFor(ms) {
    var M = MCD.map;
    if (!M || !isFn(M.symbolSprite) || !isFn(M.spriteAtlas)) return null;
    var theme = ms.theme === 'day' ? 'day' : 'night';
    if (ATL[theme]) return ATL[theme];
    var ink = inkOf(ms), list = [], ids = {};
    try {
      [['sekolah', 'circle'], ['kampus', 'shield'], ['kampus', 'triangle'], ['perumahan', 'rsq'], ['merchant', 'circle']].forEach(function (x) {
        var sp = M.symbolSprite({ shape: x[1], fill: x[0] === 'merchant' ? ink.quiet : ink.fill, ring: ink.ring, px: PX[x[0]] });
        if (sp && sp.canvas) { list.push(sp); ids[x[0] + '|' + x[1]] = sp.id; }
      });
      var at = M.spriteAtlas(list);
      if (at && at.iconAtlas) ATL[theme] = { atlas: at.iconAtlas, mapping: at.iconMapping, ids: ids, key: theme + list.length };
    } catch (e) { ATL[theme] = null; }
    return ATL[theme] || null;
  }
  function rgba(c, a) { return [c[0], c[1], c[2], a == null ? 255 : a]; }
  function shortName(s) { s = String(s || ''); return s.length > 34 ? s.slice(0, 33) + '…' : s; }
  function tipPlace(p) {
    if (!p) return null;
    return { eyebrow: Wc.eyebrow(p).toUpperCase(), title: labelOf(p), lines: [
      { kind: 'body', text: p.sub },
      { text: p.area ? 'Daya beli area ' + p.area.level + ' (perkiraan)' : 'Daya beli area belum tersedia' },
      { kind: 'meta', text: 'Jarak dari KCP · ' + distText(p) },
      { kind: 'body', text: 'Klik untuk melihat detail' }] };
  }
  function tipKec(kid) {
    var k = V && V.byKec[kid];
    if (!k) return null;
    return { eyebrow: kecEyebrow(k), title: k.name, lines: [
      { kind: 'body', text: k.total ? count(k.total, 'tempat sasaran') + ' dalam ' + st.km + ' km' : sub(Wc.TEXT.kecNone, { km: st.km }) },
      { kind: 'meta', text: 'Klik untuk melihat tempatnya' }] };
  }
  function terrStats() {
    if (!V) return null;
    if (V.terr) return V.terr;
    var kec = {};
    V.kec.forEach(function (k) { kec[k.kecamatanId] = { potential: k.total, acquired: null, notYet: null, edc: null, unlisted: null, coverage: null, band: 'noData', ranked: false }; });
    V.terr = { key: 'wl|' + V.sig, hasBank: false, demo: false, rule: 'known', bands: { ok: 0.5, mid: 0.2 }, categories: [], bandMode: 'relative',
      relative: { kecamatan: null, kelurahan: null }, totals: { potential: V.places.length }, kecamatan: kec, kelurahan: {} };
    return V.terr;
  }
  /** chipBars(kecId) → 0..3 for the territory chip option (MAP lane draws the bars; until then the chip shows the name). */
  function chipBars(kecId) { return Wc ? Wc.bars(kecId) : 0; }
  function chipTitle(kecId) {
    var r = Wc ? Wc.areaOf(null, kecId) : null;
    return r ? 'Daya beli area: ' + r.level + ' (perkiraan). ' + (r.why ? r.why.charAt(0).toUpperCase() + r.why.slice(1) + '.' : '') : Wc.TEXT.kecNoArea;
  }
  function terrLayers(out, ms) {
    var T = territory(), stats = terrStats();
    if (!T || !stats || !isFn(T.layers)) return;
    var res;
    try {
      res = T.layers({ id: 'wealth-terr', ms: ms, stats: stats, selected: st.selKec || null, outside: 'outline', pickable: true,
        labelText: function (k) { return k.name; }, labelKey: stats.key, chipBars: chipBars, chipTitle: chipTitle });
    } catch (e) { return; }
    (res.base || []).forEach(function (L) {
      if (L && /-kec-fill$/.test(L.id) && isFn(L.clone) && L.props && L.props.mcd) L = L.clone({ mcd: Object.assign({}, L.props.mcd, { tooltip: function (o) { return o && o.kec ? tipKec(o.kec) : null; } }) });
      out.base.push(L);
    });
    (res.top || []).forEach(function (L) { out.top.push(L); });
  }
  function declutter(list, zoom) {
    if (list.length < 2) return list;
    var W0 = 512 * Math.pow(2, zoom), boxes = [], out = [];
    list.slice().sort(function (a, b) { return b.pr - a.pr; }).forEach(function (l) {
      var x = (l.p[0] + 180) / 360 * W0, sy = Math.sin(l.p[1] * Math.PI / 180), y = (0.5 - Math.log((1 + sy) / (1 - sy)) / (4 * Math.PI)) * W0;
      var w = String(l.t).length * 6.8 + 6, b = [x + l.dx - 2, y - 9, x + l.dx + w, y + 9];
      for (var i = 0; i < boxes.length; i++) { var o = boxes[i]; if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return; }
      boxes.push(b); out.push(l);
    });
    return out;
  }
  function selPlace() {
    var s = MCD.state && isFn(MCD.state.get) ? MCD.state.get().selection : null;
    return s && s.kind === 'wealthPlace' ? placeOf(s.id) : null;
  }
  function mapLayers(derived, ms) {
    var D = window.deck, out = { base: [], top: [] };
    if (!D || !ms || !ms.kit || !Wc || !st || !computeView()) return out;
    terrLayers(out, ms);
    var K = ms.kit, P0 = K.palette, z = ms.zoom, ink = inkOf(ms);
    var rows = V.places.slice().sort(function (a, b) { return (a.kind === 'merchant' ? 0 : 1) - (b.kind === 'merchant' ? 0 : 1); });
    var pos = function (p) { return [p.lon, p.lat]; };
    var meta = { kind: 'wealthPlace', id: function (p) { return p.id; }, tooltip: function (p) { return tipPlace(p); } };
    var A = atlasFor(ms);
    if (A && D.IconLayer) {
      out.base.push(new D.IconLayer({
        id: 'wealth-places', data: rows, iconAtlas: A.atlas, iconMapping: A.mapping,
        getIcon: function (p) { return A.ids[p.kind + '|' + shapeOf(p)]; }, getPosition: pos, getSize: function (p) { return PX[p.kind] || 12; }, sizeUnits: 'pixels',
        updateTriggers: { getIcon: [V.sig, A.key] }, pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 70], beforeId: K.beforeId, mcd: meta
      }));
    } else if (D.ScatterplotLayer) {
      out.base.push(new D.ScatterplotLayer({
        id: 'wealth-places', data: rows, getPosition: pos, radiusUnits: 'pixels', getRadius: function (p) { return (PX[p.kind] || 12) / 2.4; },
        filled: true, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 1,
        getFillColor: function (p) { return rgba(p.kind === 'merchant' ? ink.quiet : ink.fill, p.kind === 'merchant' ? 200 : 235); }, getLineColor: rgba(ink.ring, 220),
        updateTriggers: { getFillColor: [V.sig, ms.theme] }, pickable: true, autoHighlight: true, highlightColor: rgba(P0.text1, 70), beforeId: K.beforeId, mcd: meta
      }));
    }
    var sp = selPlace();
    if (sp && D.ScatterplotLayer) {
      out.top.push(new D.ScatterplotLayer({
        id: 'wealth-sel', data: [sp], getPosition: pos, radiusUnits: 'pixels', getRadius: (PX[sp.kind] || 12) / 2 + 7,
        filled: false, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.2, getLineColor: rgba(P0.signal || ink.fill, 255), pickable: false, beforeId: K.beforeId
      }));
    }
    if (ms.fontsReady && D.TextLayer) {
      var lab = [];
      if (z >= 13.6) rows.forEach(function (p) { if (p.kind !== 'merchant' || z >= 15) lab.push({ p: pos(p), t: shortName(labelOf(p)), pr: p.kind === 'merchant' ? 0.5 : 1 + (10 - Wc.rankOf(p)) / 10, dx: (PX[p.kind] || 12) / 2 + 5 }); });
      if (sp) lab.push({ p: pos(sp), t: shortName(labelOf(sp)), pr: 9, dx: 14 });
      lab = declutter(lab, z);
      if (lab.length) out.top.push(new D.TextLayer({
        id: 'wealth-labels', data: lab, getPosition: function (o) { return o.p; }, getText: function (o) { return o.t; },
        getSize: 12, sizeUnits: 'pixels', fontFamily: K.fonts && K.fonts.sans, fontWeight: 600, characterSet: 'auto',
        getColor: rgba(P0.text1, 245), fontSettings: { sdf: true }, outlineWidth: 2.4, outlineColor: rgba(P0.canvas, 235),
        getPixelOffset: function (o) { return [o.dx || 14, 0]; }, getTextAnchor: 'start', getAlignmentBaseline: 'center',
        updateTriggers: { getColor: ms.palette }, pickable: false, beforeId: K.beforeId
      }));
    }
    return out;
  }
  function legend(derived, ms) {
    if (!V || !ms) return [];
    var ink = inkOf(ms), rows = [];
    kindsOn().forEach(function (k) {
      if (k === 'kampus') {
        rows.push({ shape: 'shield', rgb: ink.fill, label: 'Kampus: universitas dan institut' });
        rows.push({ shape: 'triangle', rgb: ink.fill, label: 'Kampus: sekolah tinggi, politeknik dan akademi' });
      } else rows.push({ shape: SHAPE[k], rgb: k === 'merchant' ? ink.quiet : ink.fill, label: kindDef(k).label });
    });
    var groups = [{ id: 'wealth-kinds', title: Wc.TEXT.targets, rows: rows }];
    /* the map legend draws the chip with its three small bars (map.js, V8 V7_SPEC §5.1) */
    groups.push({ id: 'wealth-bars', title: 'Kecamatan', rows: [{ glyph: 'chip', bars: 3, label: Wc.TEXT.legendBars }] });
    var T = MCD.territory, lines = T && isFn(T.legendGroups) ? (T.legendGroups({ ms: ms, stats: terrStats() }) || []).filter(function (g) { return g.id === 'territory-lines'; })[0] : null;
    if (lines) groups.push(lines);
    return groups;
  }
  function telemetry() {
    if (!V) return '';
    return fm().int(V.places.length) + ' TEMPAT SASARAN DALAM ' + st.km + ' KM · ' + fm().int(V.counts.tinggi) + ' KECAMATAN DAYA BELI TINGGI';
  }
  function registerPosture() {
    var M = MCD.map;
    if (!M || !isFn(M.registerPosture) || !st) return;
    M.registerPosture(ID, {
      imagery: 'full', camera: cameraOf(st.km), rings: 'schools', layerSet: 'wealth', deck: true, buildings: 'off',
      zones: zoneSpec(), attribution: ATTRIBUTION,
      onRingClick: function (km) { setKm(km <= 5.01 ? 5 : km <= 15.01 ? 15 : 30); },
      ringHint: 'Klik untuk menampilkan tempat sampai jarak ini dari Mabes TNI',
      telemetry: telemetry
    });
  }
  var legendTimer = 0;
  function registerLegendSoon() { clearTimeout(legendTimer); legendTimer = setTimeout(function () { requestRender(); }, 0); }
  function registerMap() {
    unregisterMap();
    var M = MCD.map;
    if (!M || !isFn(M.registerLayers)) return;
    var offL = M.registerLayers(ID, mapLayers, { id: ID });
    if (isFn(offL)) mapOffs.push(offL);
    registerPosture();
    if (isFn(M.registerLegend)) M.registerLegend(ID, legend);
    if (isFn(M.registerSelectable)) {
      M.registerSelectable('wealthPlace', function (id) { var p = placeOf(id); return p ? [p.lon, p.lat] : null; });
      M.registerSelectable('wealthKec', function () { return null; });
    }
    var T = MCD.territory;
    if (T && isFn(T.bind) && isFn(T.popup)) {
      unbindTerr = T.bind({
        stats: function () { return terrStats(); },
        popup: function (kid) { return kecPopup(kid); },
        actions: function (kid) {
          var k = V && V.byKec[kid], outA = [];
          if (!k || k.total) outA.push({ label: Wc.TEXT.seeKec, primary: true, run: function () { openKec(kid); } });
          if (WS()) outA.push({ id: 'detail', label: 'Detail', run: function () { openKecNums(kid); } });
          return outA;
        },
        onPick: function (h) { if (h && h.kecamatanId) { st.selKec = h.kecamatanId; requestRender(); } },
        onClose: function () { if (!(drawerSel && drawerSel.kind === 'wealthKec')) { st.selKec = null; requestRender(); } }
      });
    }
    applyZones();
  }
  function unregisterMap() {
    mapOffs.forEach(function (off) { try { off(); } catch (e) { /* ignore */ } });
    mapOffs = [];
    if (unbindTerr) { try { unbindTerr(); } catch (e) { /* ignore */ } unbindTerr = null; }
  }

  /* ============================================================ selection, trail and focus */

  function focusedKec() {
    var M = MCD.map, f;
    if (!M) return undefined;
    try { if (isFn(M.focusState)) f = M.focusState(); else if (isFn(M.focused)) f = M.focused(); else return undefined; } catch (e) { return undefined; }
    if (!f) return null;
    if (typeof f !== 'object') return String(f);
    return f.id != null && f.phase !== 'exit' && f.phase !== 'off' ? String(f.id) : null;
  }
  function ensureKecFocus(id) {
    var M = MCD.map;
    if (!M || !isFn(M.focusArea) || !id || focusedKec() === String(id)) return;
    try { if (M.focusArea({ kind: 'kecamatan', id: String(id) }) !== false) ownFocus = String(id); } catch (e) { /* the map keeps its view */ }
  }
  function dropOwnFocus(id) {
    if (!ownFocus || (id != null && String(id) !== ownFocus)) return;
    var M = MCD.map, cur = focusedKec(), mine = ownFocus;
    ownFocus = null;
    if (M && isFn(M.clearFocus) && (cur === undefined || cur === mine)) { try { M.clearFocus(); } catch (e) { /* ignore */ } }
  }
  function zoomKec(id) {
    var M = MCD.map, T = territory(), b = T && isFn(T.boundsOf) ? T.boundsOf(id) : null;
    if (b && M && isFn(M.fitBounds)) M.fitBounds(b, { maxZoom: 14 });
  }
  function zoomTo(p) { var M = MCD.map; if (M && isFn(M.flyTo)) M.flyTo({ center: [p.lon, p.lat], zoom: 16 }); }
  function openKec(id) { if (ctx) ctx.select({ kind: 'wealthKec', id: String(id), extra: { kecamatanId: String(id) } }); }
  function openKecNums(id) { if (ctx) ctx.select({ kind: 'wealthKec', id: String(id), extra: { kecamatanId: String(id), first: 'angka' } }); }
  function showKec(id) { if (!id) return; st.selKec = String(id); requestRender(); openKec(id); }
  function openInTrail(p, kid) { if (ctx) ctx.select({ kind: 'wealthPlace', id: p.id, extra: { kind: p.kind, trail: String(kid) } }); }
  function openPlace(p) { if (ctx && p) ctx.select({ kind: 'wealthPlace', id: p.id, extra: { kind: p.kind } }); }
  /** Make a place visible (its kind on, the scope wide enough), then fly to it and open its card. */
  function focusPlace(p) {
    if (!ctx || !p) return false;
    if (st.kinds[p.kind] === false) { st.kinds[p.kind] = true; saveUi(); V = null; }
    if (p.km > st.km) setKm(p.km > 15 ? 30 : 15, { camera: false });
    else refresh(['kinds']);
    var M = MCD.map;
    if (M && isFn(M.focusPoint)) { try { if (M.focusPoint({ lon: p.lon, lat: p.lat, zoom: 16, kind: 'wealthPlace', id: p.id }) !== false) return true; } catch (e) { /* select below */ } }
    openPlace(p);
    return true;
  }
  function requestFocus(id) {
    pendingFocus = String(id);
    if (!ctx) return;
    var k = Wc.kindOf(pendingFocus);
    if (k === 'merchant') mReady = true;
    Wc.ensure(k ? [k] : ['sekolah', 'kampus']).then(function () { later(runPendingFocus, 60); });
  }
  function runPendingFocus() {
    if (!ctx || pendingFocus == null) return;
    var id = pendingFocus;
    var p = placeOf(id);
    if (!p) { if (Wc.kindState(Wc.kindOf(id) || 'sekolah') === 'loading') return; pendingFocus = null; toast('Tempat ini tidak ditemukan di daftar Calon Prioritas.', 'warn'); return; }
    pendingFocus = null;
    focusPlace(p);
  }
  function trailOf(sel) {
    if (!sel || sel.kind !== 'wealthPlace') return null;
    if (sel.extra && sel.extra.trail) return String(sel.extra.trail);
    if (!WS()) return null;
    var p = placeOf(sel.id), f = focusedKec();
    return p && p.kecamatanId && f && String(f) === String(p.kecamatanId) ? String(p.kecamatanId) : null;
  }
  function showModel(sel, trail) {
    if (!sel || !Wc) return null;
    computeView();
    if (sel.kind === 'wealthPlace') return placeModel(placeOf(sel.id), { trail: trail });
    if (sel.kind === 'wealthKec') return kecModel(String(sel.id), { listFirst: !(sel.extra && sel.extra.first === 'angka') });
    return null;
  }
  function onSelect(sel) {
    if (sel && MCD.territory && sel.kind === MCD.territory.KIND) { later(function () { if (ctx) ctx.clearSelection(); }, 0); return true; }
    if (!sel || !/^(wealthPlace|wealthKec)$/.test(sel.kind)) return false;
    var trail = trailOf(sel);
    if (sel.kind !== 'wealthKec' && !(trail && trail === ownFocus)) dropOwnFocus();
    var model = showModel(sel, trail);
    if (!model) return false;
    drawerSel = sel;
    if (sel.kind === 'wealthKec') st.selKec = String(sel.id);
    else if (WS() && st.selKec !== (trail || null)) st.selKec = trail || null;
    requestRender();
    later(function () {
      if (!ctx || drawerSel !== sel) return;
      if (MCD.territory && isFn(MCD.territory.closePopup)) { try { MCD.territory.closePopup(); } catch (e) { /* ignore */ } }
      ctx.openDrawer(model);
      watchDrawer(sel, trail);
      if (sel.kind === 'wealthKec') { var kid = String(sel.id); later(function () { if (ctx && drawerSel === sel) ensureKecFocus(kid); }, 160); }
      requestRender();
    }, 0);
    return true;
  }
  function watchDrawer(sel, trail) {
    if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
    var d = document.querySelector('.drawer');
    if (!d || typeof MutationObserver !== 'function') return;
    drawerObs = new MutationObserver(function () {
      if (d.classList.contains('is-open')) return;
      drawerObs.disconnect(); drawerObs = null;
      if (drawerSel !== sel) return;
      drawerSel = null;
      if (sel.kind === 'wealthKec') { st.selKec = null; dropOwnFocus(sel.id); }
      else if (trail) { st.selKec = null; dropOwnFocus(trail); }
      var s = MCD.state && isFn(MCD.state.get) ? MCD.state.get().selection : null;
      if (s && s.kind === sel.kind && String(s.id) === String(sel.id) && ctx) ctx.clearSelection();
      requestRender();
    });
    drawerObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }
  /** The open card follows data, scope, kinds, distances and privacy in place. */
  function refreshOpenCard() {
    if (!ctx || !drawerSel || !WS()) return;
    var d = document.querySelector('.drawer'), open = !!(d && d.classList.contains('is-open')) || !!document.querySelector('.ws-co');
    if (!open) return;
    var model = showModel(drawerSel, trailOf(drawerSel));
    if (model) ctx.openDrawer(model, { refresh: true, keepSelection: true });
  }

  /* ============================================================ render */

  function refresh(keys) {
    if (!ctx) return;
    computeView();
    requestRender();
    renderPanel();
    if (isDeep() && ui.work) renderWork(false);
    return keys;
  }
  /** The merchant count for its chip without blocking the first frame (MCD.sme's list is cached per data version). */
  function warmMerchants() {
    if (mReady || !Wc || !Wc.ready('merchant')) return;
    idle(function () { if (!ctx || mReady) return; mReady = true; V = null; refresh(['merchants']); }, 400);
  }

  /* ============================================================ section contract (v5 workspace, v6 scope) */

  function workspace() {
    if (!ctx || !isDeep() || !ui || !ui.work || !page || !page.el) return null;
    var w = ui.work;
    later(syncAdopted, 0);
    return {
      rail: { el: page.el, label: 'Calon Prioritas', short: 'Prioritas', icon: 'sec-wealth', summary: summary },
      drawer: { el: w.el, tabs: w.tabHost, title: 'Daftar & grafik', source: SRC_LINE },
      hide: [w.head, w.foot, ui.panel && ui.panel.openWork].filter(Boolean)
    };
  }
  function cardFor(sel) {
    if (!sel || !/^(wealthPlace|wealthKec)$/.test(sel.kind)) return null;
    Wc = Wc || MCD.wealth;
    if (!Wc || !st) return null;
    try { return showModel(sel, trailOf(sel)); } catch (e) { return null; }
  }
  /** Landing actions (V7_SPEC §2.4): wealth:tab:<places|kec>[:half[:<sort>]]; unknown parts are ignored. */
  function runTab(parts) {
    var tab = parts[0] === 'kec' ? 'kec' : 'places';
    var half = parts.indexOf('half') >= 0;
    var sortP = parts.filter(function (x) { return x === 'near' || x === 'kelas'; })[0];
    goTab(tab, { half: half, sort: sortP || null });
  }

  var SPEC = {
    lede: Wc0().TEXT.lede,
    shows: [
      'Sekolah dan kampus dengan kelas biaya Premium atau Atas',
      'Perumahan premium dan menengah atas, merchant dengan nilai belanja besar',
      'Batang pada label kecamatan: daya beli area (perkiraan)',
      'Setiap tempat terhubung ke tab asalnya untuk tindak lanjut'
    ],
    needs: [], dataKeys: [], emptyFirst: false, blocks: [], source: SRC_LINE,
    cards: function () { return []; }
  };
  function Wc0() { return MCD.wealth || { TEXT: { lede: 'Tempat dengan biaya sekolah tinggi, perumahan atas dan usaha belanja besar.' } }; }

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (host, c) {
      Wc = MCD.wealth;
      ctx = c;
      ui = {};
      timers = []; distSwitches = [];
      DISTC = new Map();
      if (!Wc) { host.appendChild(E('p', { class: 'wl-note', text: 'Bagian ini belum dapat dibuka. Muat ulang halaman.' })); return; }
      if (!st) st = loadState();
      st.km = scopeGet();
      st.workOpen = !!(st.openOnMount && isDeep());
      var landingHalf = st.landing === 'half';
      st.openOnMount = false;
      st.landing = null;
      saveUi = debounce(function () { var k = {}; Wc.KIND_IDS.forEach(function (x) { k[x] = st.kinds[x] !== false; }); sset(UI_KEY, { v: 1, kinds: k, sort: st.sort }); }, 400);
      host.classList.add('wl-host');
      var spec = Object.assign({}, SPEC, {
        lede: Wc.TEXT.lede,
        primary: isDeep() ? null : { label: Wc.TEXT.seeList, icon: 'chev-r', run: function () { goTab('places'); } }
      });
      page = c.page(spec);
      buildPanel(page.body);
      if (isDeep()) {
        buildWork(host);
        syncWork();
        if (st.workOpen) later(function () { if (ctx && isDeep()) { openWork(true, landingHalf); renderWork(true); } }, 420);
      }
      registerMap();
      offs.push(Wc.on(debounce(function () { if (ctx) { V = null; refresh(['data']); runPendingFocus(); } }, 60)));
      var I = MCD.inst;
      if (I && I.scope && isFn(I.scope.on)) { try { var offS = I.scope.on(function (ev) { if (ev && ev.section && ev.section !== ID) return; var v = scopeGet(); if (st && v !== st.km) setKm(v, { quiet: true }); }); if (isFn(offS)) offs.push(offS); } catch (e) { /* ignore */ } }
      var onDistEvt = function () { onDistance(); };
      window.addEventListener('mcd:distance', onDistEvt);
      offs.push(function () { window.removeEventListener('mcd:distance', onDistEvt); });
      c.registerCommands(function () {
        return [
          { label: 'Calon Prioritas · Cakupan 5 km', run: function () { setKm(5); }, kw: 'calon prioritas cakupan 5 wealth' },
          { label: 'Calon Prioritas · Cakupan 15 km', run: function () { setKm(15); }, kw: 'calon prioritas cakupan 15 wealth' },
          { label: 'Calon Prioritas · Cakupan 30 km', run: function () { setKm(30); }, kw: 'calon prioritas cakupan 30 wealth' },
          { label: 'Calon Prioritas · Daftar tempat', run: function () { goTab('places'); }, kw: 'calon prioritas daftar tempat sekolah kampus perumahan merchant' },
          { label: 'Calon Prioritas · Kecamatan', run: function () { goTab('kec'); }, kw: 'calon prioritas kecamatan daya beli' }
        ];
      });
      startData();
      warmMerchants();
      if (st.km === 30) preloadOuter(1200);
      if (pendingFocus != null) requestFocus(pendingFocus);
    },
    update: function (derived, keys) {
      if (!ctx || !Wc) return;
      keys = keys || ['*'];
      if (page) page.update(derived, keys);
      if (keys.indexOf('selection') >= 0) {
        var s = MCD.state && isFn(MCD.state.get) ? MCD.state.get().selection : null;
        if (!s || !/^(wealthPlace|wealthKec)$/.test(s.kind)) {
          drawerSel = null;
          if (st.selKec && !(MCD.territory && isFn(MCD.territory.popupOpen) && MCD.territory.popupOpen())) st.selKec = null;
          requestRender();
        }
      }
      var relevant = keys.some(function (k) { return k === '*' || k === 'data' || k === 'demo' || k === 'theme' || k === 'settings' || k === 'distance' || k.indexOf('privacy') === 0; });
      if (!relevant) return;
      if (keys.indexOf('theme') >= 0) INK = {};
      if (keys.indexOf('distance') >= 0) DISTC = new Map();
      if (keys.indexOf('data') >= 0 || keys.indexOf('*') >= 0) V = null;
      refresh(keys);
      if (keys.some(function (k) { return k.indexOf('privacy') === 0 || k === 'distance'; })) refreshOpenCard();
    },
    unmount: function () {
      offs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      offs = [];
      timers.forEach(function (t) { clearTimeout(t); });
      timers = [];
      clearTimeout(legendTimer);
      unregisterMap();
      if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
      if (ui && ui.work) (ui.work.handles || []).forEach(function (h) { try { h.destroy(); } catch (e) { /* ignore */ } });
      distSwitches.forEach(function (s) { try { if (isFn(s.destroy)) s.destroy(); } catch (e) { /* ignore */ } });
      distSwitches = [];
      if (typeof document !== 'undefined' && document.body) document.body.classList.remove('wl-work-open');
      drawerSel = null;
      dropOwnFocus();
      if (st) st.selKec = null;
      saveUi();
      ctx = null; page = null; ui = null;
    },
    layout: function () {
      var lay = { posture: ID };
      if (!ctx) return lay;
      syncAdopted();
      var pd = ctx.padding(), w = ui && ui.work && ui.work.el;
      /* ≥ 1280 without MCD.windows the open list is a column on the right: the map keeps its points clear of it */
      if (w && isDeep() && !adopted() && st && st.workOpen && window.matchMedia && window.matchMedia('(min-width: 1280px)').matches) {
        var r = w.getBoundingClientRect();
        if (r.width > 0) pd.right = Math.round(window.innerWidth - r.left + 12);
      }
      lay.padding = pd;
      return lay;
    },
    onSelect: onSelect,
    workspace: workspace,
    summary: summary,
    cardFor: cardFor,
    kecList: function (kecId) { Wc = Wc || MCD.wealth; if (!Wc || !st || !kecId) return null; computeView(); return kecModel(String(kecId), { listFirst: true }); },
    onAction: function (action) {
      var a = String(action || '');
      var m = /^focus:(place|wealthPlace):(.+)$/.exec(a);
      if (m) { requestFocus(m[2]); return true; }
      if (!ctx || !st) return false;
      var k = /^wealth:kec:(\d\d\.\d\d\.\d\d)$/.exec(a);
      if (k) { showKec(k[1]); return true; }
      var sc = /^wealth:scope:(5|15|30)$/.exec(a);
      if (sc) { setKm(+sc[1]); return true; }
      var tb = /^wealth:tab:(.+)$/.exec(a);
      if (tb) { runTab(tb[1].split(':')); return true; }
      var kd = /^wealth:kind:(sekolah|kampus|perumahan|merchant):(on|off)$/.exec(a);
      if (kd) { if ((st.kinds[kd[1]] !== false) !== (kd[2] === 'on')) toggleKind(kd[1]); return true; }
      if (a === 'wealth:list') { goTab('places'); return true; }
      return false;
    },
    onEscape: function () {
      if (st && st.workOpen && !adopted() && window.matchMedia && !window.matchMedia('(min-width: 1280px)').matches) { openWork(false); return true; }
      return false;
    },
    onResize: function () { if (ctx) ctx.relayout(); },
    _test: {
      state: function () { return st; },
      reset: function () { st = null; V = null; SCOPE_MEM = null; mReady = false; INK = {}; ATL = {}; },
      view: function () { return computeView(); },
      setKm: function (v) { setKm(v); },
      toggleKind: function (k) { toggleKind(k); },
      setSort: function (v) { setSort(v); },
      placeModel: function (id, o) { computeView(); return placeModel(placeOf(id), o); },
      kecModel: function (id, o) { computeView(); return kecModel(String(id), o); },
      kecPopup: function (id) { computeView(); return kecPopup(String(id)); },
      legend: function (ms) { computeView(); return legend(null, ms || { theme: 'day', zoom: 11 }); },
      mapLayers: function (ms) { return mapLayers(null, ms); },
      chipBars: chipBars,
      openTab: function (id) { goTab(id); },
      warm: function () { mReady = true; V = null; refresh(['merchants']); }
    }
  };
})(window.MCD = window.MCD || {});
