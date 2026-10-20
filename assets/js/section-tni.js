/* ==========================================================================
 * MCD.sections.tni: section 6 "Kredit TNI" (KSM dan KKB) (v7, docs/V7_SPEC.md §3, D6–D10, D22, D32, D33; COPY_STYLE_EN 48 a).
 *
 * Layout C "Kartu bertahap" (docs/LAYOUT_V5C_SPEC.md):
 *   Sederhana  guide: lede, "Hitung KSM & KKB", scope, "Tampilkan: Pangkalan · Dealer KKB", "Filter lain ({n})", three
 *              cards (KSM cabang · Pangkalan dalam {km} km · Dealer KKB) (§3.8).
 *   Detail     the same panel as the full rail (workspace(): the rail and the drawer), summary() for the slim rail with
 *              the scope pair and the slim-rail action "Hitung" (D33), the drawer "Daftar & grafik" with Pangkalan TNI ·
 *              Dealer KKB · Tindak lanjut (§3.6).
 *   Cards      pangkalan (selection 'site'): six folds Cara masuk · Produk sasaran · Satuan di lokasi ini · Dealer
 *              terdekat · Jarak & rute · Tindak lanjut (§3.4); dealer ('dealer'): five folds (§3.5), with the crumb
 *              "‹ {pangkalan}" when opened from a pangkalan card; kecamatan ('tniKec'): list first (§3.3).
 *   Map        the pangkalan badges are map.js's own layer (item 34); this section draws the dealers (filled = resmi,
 *              outline = bekas, servis small and grey; clusters below zoom 13) and the kecamatan chips "{nama} · {n}
 *              pangkalan" through MCD.territory.
 * Shared pieces are feature-detected: MCD.inst (scope), MCD.seal (follow-ups through MCD.tni.pipeline), MCD.windows,
 * MCD.distance, MCD.territory, MCD.plan ("+ Rencana kunjungan"), MCD.leadsUi (the full-rail lead line), MCD.nav.
 * Engine: assets/js/tni-core.js (MCD.tni); calculator: assets/js/tni-calc.js (MCD.tniCalc).
 * Storage: mcd.tni.ui.v1 {v, show: {pangkalan}, filters, sort, dSort, servis} (layout only, no names); the scope in
 * sessionStorage mcd.scope.v1 (through MCD.inst.scope). Safe DOM only (MCD.util.el, textContent).
 * Data guards (§3.10): no bank research row, no payroll bank, no synthetic satker field, no lead join.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'tni';
  var UI_KEY = 'mcd.tni.ui.v1';
  var TABS = [{ id: 'units', label: 'Pangkalan TNI' }, { id: 'dealers', label: 'Dealer KKB' }, { id: 'pipe', label: 'Tindak lanjut' }];
  var UNIT_SORTS = [{ v: 'near', label: 'Terdekat dari KCP' }, { v: 'pipe', label: 'Belum ditindaklanjuti' }, { v: 'satker', label: 'Satuan terbanyak' }];
  var DEALER_SORTS = [{ v: 'near', label: 'Terdekat dari KCP' }, { v: 'brand', label: 'Merek' }];
  var LEDE = 'Pangkalan TNI, bagian keuangan dan dealer KKB di sekitar Mabes TNI.';
  var SRC_SITE = 'Sumber: OpenStreetMap dan riset publik (data referensi dashboard) · daftar satuan dari riset publik · diperiksa 12 Okt 2026';
  var SRC_DEALER = 'Sumber: Overture Maps (rilis 2026-09-23.1) dan OpenStreetMap · 18 Okt 2026';
  var SATKER_NOTE = 'Daftar satuan dari riset publik. Satuan tidak digambar di peta karena titiknya belum pasti.';
  var EMPTY_FILTER = 'Tidak ada pangkalan yang cocok dengan filter ini. Hapus salah satu filter.';
  var D_LOADING = 'Memuat daftar dealer…', D_FAILED = 'Daftar dealer tidak dapat dimuat. Coba lagi.';
  var NO_KPI = 'Impor file KPI untuk melihat target.';
  var DIST_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  var MEM_LINE = 'Tindak lanjut hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.';
  var SEALED_TITLE = 'Terenkripsi dengan kata sandi dashboard.';
  var KL_MAX = 60;
  var ATTRIBUTION = 'Pangkalan: © kontributor OpenStreetMap (ODbL), riset publik · Dealer: © Overture Maps Foundation, © kontributor OpenStreetMap (ODbL) · batas wilayah: BPS melalui OCHA/HDX (CC BY 3.0 IGO)';
  var CARA_MASUK = {
    markas: ['Mulai dari bagian keuangan satuan (juru bayar).', 'Bagian ini mengurus potongan gaji untuk angsuran KSM.'],
    markasTail: ['Tanyakan prosedur kerja sama potongan gaji sebelum menawarkan KSM kepada prajurit.', 'Kunjungan ke satuan mengikuti izin dan aturan keamanan satuan.'],
    perumahan: ['Perumahan prajurit dan keluarga.', 'Kerja sama KSM tetap melalui bagian keuangan satuan.', 'Cocok untuk kegiatan layanan bersama pengurus kompleks.'],
    rs: ['Rumah sakit militer.', 'Tanyakan bagian keuangan rumah sakit tentang potongan gaji untuk KSM.']
  };
  var PRODUK = [
    { k: 'KSM', t: 'KSM untuk prajurit dengan angsuran yang dipotong dari gaji.' },
    { k: 'Top up KSM', t: 'Top up untuk nasabah KSM yang lancar.' },
    { k: 'KKB', t: 'KKB mobil dan motor melalui rujukan dealer.' },
    { k: 'Tabungan', t: 'Tabungan dan Livin’ by Mandiri untuk prajurit dan keluarga.' }
  ];

  var TN = null;
  var ctx = null, page = null, ui = null, st = null, host = null;
  var offs = [], mapOffs = [], timers = [], distSwitches = [];
  var V = null, drawerSel = null, unbindTerr = null, building = null, pipeEds = {}, openSite = null, SCOPE_MEM = null;
  var saveUi = function () {};

  /* ============================================================ helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function E() { return MCD.util.el.apply(null, arguments); }
  function fm() { return MCD.util.fmt; }
  function icon(n) { return ctx && isFn(ctx.icon) ? ctx.icon(n) : MCD.util.icon(n); }
  function clear(n) { return MCD.util.clear(n); }
  function isDeep() { return !!(ctx && ctx.view() === 'deep'); }
  function veil() { return !!(ctx && ctx.privacy() === 'veil'); }
  function sget(k, d) { try { var s = MCD.util.storage; return s ? s.get(k, d) : d; } catch (e) { return d; } }
  function sset(k, v) { try { var s = MCD.util.storage; return s ? s.set(k, v) : false; } catch (e) { return false; } }
  function debounce(fn, ms) { return MCD.util.debounce(fn, ms); }
  function count(n, word) { return fm().int(n) + ' ' + word; }
  function nodeOf(x) { return x && x.nodeType === 1 ? x : (x && x.el && x.el.nodeType === 1 ? x.el : null); }
  function later(fn, ms) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); fn(); }, ms || 0); timers.push(t); return t; }
  function requestRender() { if (MCD.map && isFn(MCD.map.requestRender)) MCD.map.requestRender(); }
  function toast(m, k) { if (ctx) ctx.toast(m, k || null); }
  function demoOn() { return !!(TN && TN.demoOn()); }
  function guardDemo(b) { if (b && MCD.demo && isFn(MCD.demo.guard)) MCD.demo.guard(b); return b; }
  function WS() { var W0 = MCD.windows; return W0 && typeof W0 === 'object' ? W0 : null; }
  function admin() { var A = window.MCD_ADMIN_AREAS; return A && isFn(A.byId) ? A : null; }
  function territory() { var T0 = MCD.territory; return T0 && isFn(T0.ready) && T0.ready() ? T0 : null; }
  function kecName(id) { var A = admin(), r = null; try { r = A && id ? A.byId(id) : null; } catch (e) { r = null; } return r && r.name ? r.name : ''; }
  function ymd() { var d = new Date(), m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; }
  function download(name, text, type) {
    try {
      var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = E('a', { href: url, download: name, hidden: true });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return true;
    } catch (e) { return false; }
  }
  function btn(label, iconName, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['btn', cls || 'btn--secondary'], title: title || null }, iconName ? icon(iconName) : null, E('span', { text: label }));
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function link(label, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['tn-link', cls], text: label, title: title || null });
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function note(text, cls) { return E('p', { class: ['tn-note', cls], text: text }); }
  function extLink(href, text, title) {
    return E('a', { class: 'tn-ext', href: href, target: '_blank', rel: 'noopener noreferrer', attrs: { referrerpolicy: 'no-referrer' }, title: title || null },
      E('span', { text: text }), icon('external'), E('span', { class: 'sr-only', text: ', terbuka di tab baru' }));
  }
  /** A card fold: .dd-blk with data-fold, data-preview and data-open (MCD.windows reads them). */
  function blk(title, kids, cls, o) {
    var s = E('section', { class: ['dd-blk', 'tn-dd', cls] }, E('h3', { class: 't-eyebrow dd-blk__t', text: title }), kids);
    if (o) {
      if (o.id) s.setAttribute('data-fold', o.id);
      if (o.preview) s.setAttribute('data-preview', o.preview);
      if (o.open != null) s.setAttribute('data-open', o.open ? '1' : '0');
    }
    return s;
  }
  /** A group of toggle chips (button.chip[aria-pressed]) with an optional count: "Pangkalan · 40". */
  function chips(label, items, onToggle, cls) {
    var wrap = E('div', { class: ['tn-chips', cls], role: 'group', aria: { label: label } }), map = {};
    items.forEach(function (it) {
      var cnt = E('span', { class: 'chip__count' });
      var b = E('button', { type: 'button', class: 'chip tn-chip', aria: { pressed: 'true' }, title: it.title || null, attrs: { 'data-id': it.id } }, E('span', { class: 'tn-chip__t', text: it.label }), cnt);
      b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') === 'true') return; onToggle(it.id); });
      wrap.appendChild(b);
      map[it.id] = { b: b, cnt: cnt };
    });
    return {
      el: wrap,
      set: function (on, counts, o) {
        o = o || {};
        Object.keys(map).forEach(function (id) {
          var m = map[id], pressed = on[id] !== false;
          m.b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          m.cnt.textContent = counts && isNum(counts[id]) ? ' · ' + fm().int(counts[id]) : '';
          if (o.busy && o.busy[id]) { m.b.setAttribute('aria-busy', 'true'); m.b.setAttribute('aria-disabled', 'true'); m.b.title = D_LOADING; }
          else { m.b.removeAttribute('aria-busy'); m.b.removeAttribute('aria-disabled'); m.b.title = ''; }
        });
      }
    };
  }
  function seg(label, opts, onPick, extra) {
    var wrap = E('div', { class: ['seg', 'tn-seg', extra], role: 'radiogroup', aria: { label: label } });
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
    return { el: wrap, set: function (v) { btns.forEach(function (b, i) { var on = String(opts[i].v) === String(v); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); } };
  }

  /* ============================================================ distance from KCP (MCD.distance) */

  var DISTC = new Map();
  function distOf(p) {
    if (!p || !isNum(p.lon) || !isNum(p.lat)) return null;
    var key = p.lon.toFixed(5) + ',' + p.lat.toFixed(5);
    if (DISTC.has(key)) return DISTC.get(key);
    var A = MCD.distance, r = null;
    if (A && isFn(A.of)) { try { r = A.of(p.lon, p.lat, { kecamatanId: p.kecamatanId || p.kec || null }); } catch (e) { r = null; } }
    if (!r && TN) { var b = (MCD.config && MCD.config.branch) || { lat: -6.33203, lon: 106.90989 }; r = { km: TN.haversineKm(b.lon, b.lat, p.lon, p.lat), min: null, source: 'garis' }; }
    DISTC.set(key, r || null);
    return r || null;
  }
  function minutesWords(m) { m = Math.max(1, Math.round(m)); return '± ' + (m >= 60 ? Math.floor(m / 60) + ' jam' + (m % 60 ? ' ' + (m % 60) + ' menit' : '') : m + ' menit'); }
  function kmWords(km) { return km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m' : fm().num(km, 1) + ' km'; }
  /** {km: '0,6 km', min: '± 4 menit'} (the "(jam sibuk)" note dropped for cells) or the joined text. */
  function distText(r, parts) {
    var A = MCD.distance;
    if (r && A && isFn(A.format)) {
      try {
        var t = A.format(r);
        if (t) {
          if (!parts) return t;
          var cut = t.indexOf(' · '), o = cut >= 0 ? { km: t.slice(0, cut), min: t.slice(cut + 3) } : { km: t, min: '' };
          o.min = o.min.replace(/\s*\((?:jam sibuk|tanpa tol)[^)]*\)\s*$/, '');
          return o;
        }
      } catch (e) { /* own words below */ }
    }
    if (!r || !isNum(r.km)) return parts ? { km: '—', min: '' } : '—';
    var o2 = { km: kmWords(r.km), min: isNum(r.min) ? minutesWords(r.min) : (r.source === 'garis' ? 'garis lurus' : '') };
    return parts ? o2 : o2.km + (o2.min ? ' · ' + o2.min : '');
  }
  function distTip(r) { var A = MCD.distance; if (A && isFn(A.tip)) { try { var t = A.tip(r); if (t) return t; } catch (e) { /* own */ } } return DIST_TIP; }
  function distShort(p) { var d = distText(distOf(p), 'cell'); return d.km && d.km !== '—' ? d.km + (d.min ? ' · ' + d.min : '') : '—'; }
  function distSortVal(p) {
    var r = distOf(p);
    if (!r) return Infinity;
    if (isNum(r.min)) return r.min;
    return isNum(r.km) ? r.km * 3 + 1e4 : Infinity;
  }
  function distToggles() {
    var D = MCD.distance, c = null;
    if (D && isFn(D.controls)) { try { c = D.controls({ compact: true }); } catch (e) { c = null; } }
    var api = { el: E('div', { class: 'tn-distsw' }, c), sync: function () { if (c && isFn(c.sync)) c.sync(); } };
    distSwitches.push(api);
    return api;
  }
  /** Number for a card head: "0,6 km" over "± 4 menit dari KCP" (item 44g). */
  function distNumber(p) {
    var d = distOf(p), t = distText(d, 'cell');
    return t.km && t.km !== '—' ? { label: t.min ? t.min + ' dari KCP' : 'Dari KCP', value: t.km, title: distTip(d) } : { label: 'Dari KCP', value: '—', title: distTip(d) };
  }

  /* ============================================================ scope (15 / 30 km, a view setting) */

  function scopeApi() { var I = MCD.inst; return I && I.scope && isFn(I.scope.get) && isFn(I.scope.set) ? I.scope : null; }
  function scopeGet() {
    var A = scopeApi();
    if (A) { try { var v = +A.get(ID, 15); return v === 30 ? 30 : 15; } catch (e) { /* own below */ } }
    if (SCOPE_MEM != null) return SCOPE_MEM;
    try { var raw = window.sessionStorage.getItem('mcd.scope.v1'), o = raw ? JSON.parse(raw) : null; if (o && o.v === 1 && (o.tni === 15 || o.tni === 30)) return o.tni; } catch (e) { /* memory */ }
    return 15;
  }
  function scopeSet(v) {
    v = v === 30 ? 30 : 15;
    var A = scopeApi();
    if (A) { try { A.set(ID, v); return; } catch (e) { /* own below */ } }
    SCOPE_MEM = v;
    try { var raw = window.sessionStorage.getItem('mcd.scope.v1'), o = raw ? JSON.parse(raw) : null; if (!o || o.v !== 1) o = { v: 1 }; o.tni = v; window.sessionStorage.setItem('mcd.scope.v1', JSON.stringify(o)); } catch (e) { /* memory */ }
  }
  var SCOPE_TIP = 'Pangkalan TNI dalam radius 15 km atau 30 km dari Mabes TNI.';
  function scopeSwitch() {
    var I = MCD.inst;
    if (I && isFn(I.scopeSwitch)) {
      try {
        var r = I.scopeSwitch({ section: ID, value: st.km, tip: SCOPE_TIP, label: false, wide: true, onChange: function (v) { setKm(+v, { quiet: true }); },
          announce: function (v) { return 'Cakupan ' + v + ' km. ' + count(TN.sites({ km: +v }).length, 'pangkalan') + ' tampil.'; } });
        var n = nodeOf(r);
        if (n) return { el: n, set: function (v) { if (r && isFn(r.set)) r.set(v); } };
      } catch (e) { /* own below */ }
    }
    var s = seg('Cakupan jarak dari Mabes TNI', [{ v: 15, label: '15 km', title: SCOPE_TIP }, { v: 30, label: '30 km', title: SCOPE_TIP }], function (v) { setKm(v); }, 'scope tn-scope');
    s.el.title = SCOPE_TIP;
    return s;
  }
  function setKm(v, o) {
    v = v === 30 ? 30 : 15;
    if (!st) return;
    var changed = v !== st.km;
    st.km = v;
    scopeSet(v);
    if (!changed) { if (ui && ui.panel) ui.panel.scope.set(v); return; }
    V = null;
    refresh(['scope']);
    applyZones();
    var M = MCD.map;
    if (!(o && o.camera === false) && M && isFn(M.preset)) { try { M.preset(v === 15 ? 'tni15' : 'ring30'); } catch (e) { /* the map keeps its view */ } }
    if (!(o && o.quiet)) announce('Cakupan ' + v + ' km. ' + count(computeView().sites.length, 'pangkalan') + ' tampil.');
  }
  function applyZones() {
    var M = MCD.map;
    if (!M || !isFn(M.setZones)) return;
    try { M.setZones(Object.assign({ section: ID }, !st || st.km === 15 ? { mode: 'kecamatan15' } : { mode: 'kecamatan', km: 30 })); } catch (e) { /* the map keeps its zones */ }
  }
  function announce(text) { if (ui && ui.panel && ui.panel.live) ui.panel.live.textContent = text; }

  /* ============================================================ state */

  function defaults() {
    return { km: 15, show: { pangkalan: true, dealer: false }, matra: { AL: true, AU: true, AD: true, GAB: true }, jenis: { markas: true, perumahan: true, rs: true },
      dKinds: { mobil: true, motor: true }, dTypes: { resmi: true, bekas: true }, servis: false, tab: 'units', sort: 'near', dSort: 'near',
      moreOpen: false, workOpen: false, selKec: null, near: null, pipeStage: '', pipeProd: '' };
  }
  function loadState() {
    var s = defaults(), u = sget(UI_KEY, null);
    if (u && u.v === 1) {
      if (u.show && u.show.pangkalan === false) s.show.pangkalan = false;
      ['matra', 'jenis', 'dKinds', 'dTypes'].forEach(function (g) { if (u[g] && typeof u[g] === 'object') Object.keys(s[g]).forEach(function (k) { if (u[g][k] === false) s[g][k] = false; }); });
      if (UNIT_SORTS.some(function (o) { return o.v === u.sort; })) s.sort = u.sort;
      if (DEALER_SORTS.some(function (o) { return o.v === u.dSort; })) s.dSort = u.dSort;
      s.servis = u.servis === true;
    }
    return s;
  }
  function persist() {
    sset(UI_KEY, { v: 1, show: { pangkalan: st.show.pangkalan !== false }, matra: st.matra, jenis: st.jenis, dKinds: st.dKinds, dTypes: st.dTypes, sort: st.sort, dSort: st.dSort, servis: !!st.servis });
  }
  function offCount(g) { return Object.keys(st[g]).filter(function (k) { return st[g][k] === false; }).length; }
  function filterCount() { return st ? offCount('matra') + offCount('jenis') + offCount('dKinds') + offCount('dTypes') : 0; }
  function resetFilters() {
    ['matra', 'jenis', 'dKinds', 'dTypes'].forEach(function (g) { Object.keys(st[g]).forEach(function (k) { st[g][k] = true; }); });
    st.near = null;
    V = null; saveUi(); refresh(['filters']);
  }

  /* ============================================================ view */

  function computeView() {
    if (V && V.km === st.km) return V;
    var all = TN.sites({ km: st.km });
    var sites = all.filter(function (s) { return st.matra[s.matra] !== false && st.jenis[s.jenis] !== false; });
    var byKec = {}, cm = { AL: 0, AU: 0, AD: 0, GAB: 0 }, cj = { markas: 0, perumahan: 0, rs: 0 };
    all.forEach(function (s) { if (st.jenis[s.jenis] !== false) cm[s.matra]++; if (st.matra[s.matra] !== false) cj[s.jenis]++; });
    sites.forEach(function (s) { if (s.kecamatanId) (byKec[s.kecamatanId] = byKec[s.kecamatanId] || []).push(s); });
    V = { km: st.km, all: all, sites: sites, byKec: byKec, counts: { matra: cm, jenis: cj }, sig: st.km + '|' + sites.map(function (s) { return s.id; }).join(','), dealers: null, terr: null };
    return V;
  }
  function dealerView() {
    var rows = TN.dealerRows(), VD = MCD.vehicleDealers;
    if (!rows || !VD) return null;
    var v = computeView();
    if (v.dealers) return v.dealers;
    var types = ['resmi', 'bekas'].filter(function (t) { return st.dTypes[t] !== false; });
    if (st.servis) types.push('servis');
    var kinds = ['mobil', 'motor'].filter(function (k) { return st.dKinds[k] !== false; });
    var list = VD.filter(rows, { types: types, kinds: kinds, maxKm: st.km });
    var near = st.near ? TN.site(st.near) : null;
    if (near) list = list.filter(function (r) { return TN.haversineKm(near.lon, near.lat, r.lon, r.lat) <= 3; });
    var c = { resmi: 0, bekas: 0, servis: 0 }, byKec = {};
    list.forEach(function (r) { c[r.type]++; if (r.kec) byKec[r.kec] = (byKec[r.kec] || 0) + 1; });
    v.dealers = { rows: list, counts: c, byKec: byKec, near: near };
    return v.dealers;
  }
  function dealersOn() { return !!(st && st.show.dealer && TN.dealerState() === 'ready'); }
  /** The dealer file on first use (chip, fold, tab, calculator link); the chip shows "Memuat daftar dealer…" meanwhile. */
  function ensureDealers(then) {
    if (TN.dealerState() === 'ready') { if (then) then(true); return; }
    TN.dealers().then(function () { if (!ctx) return; V = null; refresh(['dealers']); if (then) then(true); }, function () { if (!ctx) return; refresh(['dealers']); if (then) then(false); });
    refresh(['dealers']);
  }
  function setDealerChip(on) {
    st.show.dealer = !!on;
    if (on) ensureDealers();
    V = null;
    refresh(['filters']);
  }

  /* ============================================================ the panel (guide / full rail) */

  function buildPanel(body) {
    var p = {};
    p.live = E('p', { class: 'sr-only', aria: { live: 'polite' }, attrs: { role: 'status' } });
    p.primary = btn('Hitung KSM & KKB', null, function () { openCalc('ksm'); }, 'btn--primary btn--lg tn-primary', 'Hitung KSM & KKB (tombol K)');
    p.scope = scopeSwitch();
    p.show = chips('Tampilkan', [{ id: 'pangkalan', label: 'Pangkalan' }, { id: 'dealer', label: 'Dealer KKB' }], function (id) {
      if (id === 'dealer') setDealerChip(!st.show.dealer);
      else { st.show.pangkalan = !st.show.pangkalan; saveUi(); V = null; refresh(['filters']); }
    }, 'tn-chips--show');
    p.dealerLine = E('div', { class: 'tn-dstate', aria: { live: 'polite' } });
    p.moreBtn = E('button', { type: 'button', class: 'tn-morebtn', aria: { expanded: 'false', controls: 'tn-more' } }, E('span', { class: 'tn-morebtn__t' }), icon('chev-d'));
    p.matra = chips('Matra', TN.MATRA, function (id) { st.matra[id] = st.matra[id] === false; V = null; saveUi(); refresh(['filters']); }, 'tn-chips--matra');
    p.jenis = chips('Jenis', TN.JENIS, function (id) { st.jenis[id] = st.jenis[id] === false; V = null; saveUi(); refresh(['filters']); }, 'tn-chips--jenis');
    p.dKinds = chips('Dealer', [{ id: 'mobil', label: 'Mobil' }, { id: 'motor', label: 'Motor' }], function (id) { st.dKinds[id] = st.dKinds[id] === false; V = null; saveUi(); refresh(['filters']); }, 'tn-chips--dkind');
    p.dTypes = chips('Jenis dealer', [{ id: 'resmi', label: 'Dealer resmi' }, { id: 'bekas', label: 'Showroom bekas' }], function (id) { st.dTypes[id] = st.dTypes[id] === false; V = null; saveUi(); refresh(['filters']); }, 'tn-chips--dtype');
    p.servis = E('input', { type: 'checkbox', id: 'tn-servis' });
    p.servis.addEventListener('change', function () { st.servis = !!p.servis.checked; V = null; saveUi(); refresh(['filters']); });
    p.clear = btn('Hapus filter', 'reset', function () { resetFilters(); }, 'btn--ghost btn--bar tn-clear');
    p.more = E('div', { class: 'tn-more', id: 'tn-more', hidden: true },
      E('div', { class: 'tn-fg' }, E('p', { class: 'tn-fg__l', text: 'Matra' }), p.matra.el),
      E('div', { class: 'tn-fg' }, E('p', { class: 'tn-fg__l', text: 'Jenis' }), p.jenis.el),
      E('div', { class: 'tn-fg' }, E('p', { class: 'tn-fg__l', text: 'Dealer' }), p.dKinds.el, p.dTypes.el,
        E('label', { class: 'tn-check', attrs: { for: 'tn-servis' } }, p.servis, E('span', { text: 'Tampilkan bengkel resmi' }))),
      p.clear);
    p.moreBtn.addEventListener('click', function () { st.moreOpen = !st.moreOpen; p.more.hidden = !st.moreOpen; p.moreBtn.setAttribute('aria-expanded', st.moreOpen ? 'true' : 'false'); });
    p.cards = E('div', { class: 'tn-cards', role: 'list' });
    p.c1 = card('tn-card--ksm');
    p.c2 = card('tn-card--units');
    p.c3 = card('tn-card--dealers');
    [p.c1, p.c2, p.c3].forEach(function (c) { p.cards.appendChild(c.el); });
    p.empty = E('div', { class: 'tn-empty', hidden: true }, E('p', { text: EMPTY_FILTER }), btn('Hapus filter', 'reset', function () { resetFilters(); }, 'btn--ghost btn--bar'));
    p.lead = E('div', { class: 'tn-lead' });
    p.el = E('div', { class: 'tn-panel' }, p.live, p.primary,
      E('div', { class: 'tn-row' }, E('span', { class: 'tn-row__l', text: 'Cakupan' }), p.scope.el),
      E('div', { class: 'tn-row' }, E('span', { class: 'tn-row__l', text: 'Tampilkan' }), p.show.el),
      p.dealerLine, p.moreBtn, p.more, p.empty, p.cards, p.lead);
    body.insertBefore(p.el, body.firstChild);
    ui.panel = p;
  }
  function card(cls) {
    var head = E('p', { class: 'tn-card__t' }), big = E('p', { class: 'tn-card__v' }), lines = E('div', { class: 'tn-card__lines' });
    return { el: E('article', { class: ['tn-card', cls], role: 'listitem' }, head, big, lines), head: head, big: big, lines: lines };
  }
  function renderPanel() {
    var p = ui && ui.panel;
    if (!p || !st) return;
    var v = computeView(), ds = TN.dealerState();
    p.scope.set(st.km);
    var dv = dealerView();
    p.show.set(st.show, { pangkalan: v.sites.length, dealer: dv ? dv.counts.resmi + dv.counts.bekas + dv.counts.servis : null }, { busy: { dealer: ds === 'loading' && st.show.dealer } });
    clear(p.dealerLine);
    if (st.show.dealer && ds === 'loading') p.dealerLine.appendChild(note(D_LOADING));
    if (ds === 'error') {
      /* failed: the chip goes off, one line and "Coba lagi" (§3.9) */
      if (st.show.dealer) { st.show.dealer = false; p.show.set(st.show, { pangkalan: v.sites.length }, {}); }
      p.dealerLine.appendChild(note(D_FAILED, 'is-warn'));
      p.dealerLine.appendChild(btn('Coba lagi', 'reset', function () { setDealerChip(true); }, 'btn--ghost btn--bar'));
    }
    var nf = filterCount();
    p.moreBtn.querySelector('.tn-morebtn__t').textContent = 'Filter lain' + (nf ? ' (' + nf + ')' : '');
    p.more.hidden = !st.moreOpen;
    p.clear.disabled = !nf && !st.near;
    p.matra.set(st.matra, v.counts.matra);
    p.jenis.set(st.jenis, v.counts.jenis);
    p.dKinds.set(st.dKinds, null);
    p.dTypes.set(st.dTypes, null);
    p.servis.checked = !!st.servis;
    p.empty.hidden = v.sites.length > 0 || !nf;
    renderKsmCard(p.c1);
    renderUnitsCard(p.c2, v);
    renderDealerCard(p.c3, ds, dv);
    renderLead(p.lead);
  }
  /** Card 1 "KSM cabang, {periode}" with the concentration sentence (the full sentence of this screen, D22). */
  function renderKsmCard(c) {
    var b = TN.bookingKsm(), con = TN.concentration(), f = fm();
    clear(c.lines);
    if (!b) {
      c.head.textContent = 'KSM cabang';
      c.big.textContent = '—';
      c.lines.appendChild(note('Impor file KPI untuk melihat target KSM.'));
      c.lines.appendChild(btn('Impor file KPI', 'upload', function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:kpi' }); }, 'btn--secondary btn--bar'));
      return;
    }
    c.head.textContent = 'KSM cabang, ' + (b.periodLabel || '');
    c.big.textContent = TN.pctOf(b.capaian) + ' dari target · ' + b.status;
    if (b.capaian >= 1 && isNum(b.actual) && isNum(b.target)) c.lines.appendChild(E('p', { class: 'tn-card__line', text: 'Tercapai · lebih ' + rpM(b.actual - b.target) }));
    else if (isNum(b.kurang)) c.lines.appendChild(E('p', { class: 'tn-card__line', text: 'kurang ' + rpM(b.kurang) }));
    if (con) {
      c.lines.appendChild(E('p', { class: 'tn-card__line tn-conc', title: TN.CONCENTRATION_TITLE, text: TN.concentrationText(con, { mode: 'full' }) }));
      var lim = TN.limitText(con);
      if (lim) c.lines.appendChild(E('p', { class: 'tn-card__line tn-limit', text: lim }));
    }
    void f;
  }
  /** Rp juta of the KPI file → "Rp 1,2 M" (veiled: "Rp •••"). */
  function rpM(juta) {
    if (veil()) return 'Rp •••';
    if (!isNum(juta)) return '—';
    var F = fm();
    return F && isFn(F.rp) ? F.rp(Math.abs(juta) * 1e6) : 'Rp ' + Math.round(Math.abs(juta)) + ' jt';
  }
  function renderUnitsCard(c, v) {
    c.head.textContent = 'Pangkalan dalam ' + st.km + ' km';
    c.big.textContent = fm().int(v.sites.length);
    clear(c.lines);
    if (!v.sites.length) { c.lines.appendChild(note(EMPTY_FILTER)); return; }
    var ul = E('ul', { class: 'tn-mini' });
    sortSites(v.sites.slice(), 'near').slice(0, 5).forEach(function (s) {
      var b = E('button', { type: 'button', class: 'tn-mini__row', title: 'Buka ' + s.label + ' di peta' }, E('span', { class: 'tn-mini__name', text: s.label + ' · ' + distShort(s) + ' ›' }));
      b.addEventListener('click', function () { focusSite(s.id); });
      ul.appendChild(E('li', {}, b));
    });
    c.lines.appendChild(ul);
  }
  function renderDealerCard(c, ds, dv) {
    c.head.textContent = 'Dealer KKB';
    clear(c.lines);
    c.big.textContent = '';
    if (ds !== 'ready') {
      if (ds === 'loading') c.lines.appendChild(note(D_LOADING));
      else {
        if (ds === 'error') c.lines.appendChild(note(D_FAILED, 'is-warn'));
        c.lines.appendChild(btn(ds === 'error' ? 'Coba lagi' : 'Tampilkan dealer', null, function () { setDealerChip(true); }, 'btn--secondary btn--bar'));
      }
      return;
    }
    var VD = MCD.vehicleDealers, all = VD.filter(TN.dealerRows(), { maxKm: st.km }), n = { resmi: 0, bekas: 0 };
    all.forEach(function (r) { if (n[r.type] != null) n[r.type]++; });
    c.big.textContent = fm().int(n.resmi + n.bekas);
    c.lines.appendChild(E('p', { class: 'tn-card__line', text: count(n.resmi, 'dealer resmi') + ' · ' + count(n.bekas, 'showroom bekas') + ' dalam ' + st.km + ' km' }));
    c.lines.appendChild(note('Dealer dihitung terpisah dari merchant.'));
    if (!st.show.dealer) c.lines.appendChild(btn('Tampilkan dealer', null, function () { setDealerChip(true); }, 'btn--ghost btn--bar'));
    void dv;
  }
  /** The one lead line of the full rail (D17): only when MCD.leadsUi shows that count; never while veiled. */
  function renderLead(slot) {
    clear(slot);
    var L = MCD.leadsUi;
    if (!L || !isFn(L.railLine) || veil()) return;
    var n = null;
    try { n = L.railLine(['calonKsm', 'calonTopUpKsm', 'calonKkb']); } catch (e) { n = null; }
    if (n && n.nodeType === 1) slot.appendChild(n);
  }

  /* ============================================================ section contract: summary, workspace */

  /** The slim rail (§3.2): Booking KSM · Porsi KSM · Pangkalan {km} km, the scope pair and the action "Hitung" (D33). */
  function summary() {
    if (!st) return { items: [], filters: 0 };
    var v = computeView(), b = TN.bookingKsm(), con = TN.concentration();
    var items = [
      b ? { value: TN.pctOf(b.capaian), label: 'Booking KSM', title: 'Booking KSM ' + (b.periodLabel || '') + ': ' + TN.pctOf(b.capaian) + ' dari target. Dari file KPI.' }
        : { value: '—', label: 'Booking KSM', title: NO_KPI },
      con ? { value: TN.pctOf(con.ksmShare), label: con.over ? 'Porsi KSM, di atas batas' : 'Porsi KSM',
        title: TN.CONCENTRATION_TITLE + (isNum(con.nplRetail) ? ' NPL retail ' + TN.pctOf(con.nplRetail) + (isNum(con.nplArea) ? ' (area ' + TN.pctOf(con.nplArea) + ').' : '.') : '') + (con.over ? '\n' + TN.limitText(con) : '') }
        : { value: '—', label: 'Porsi KSM', title: NO_KPI },
      { value: fm().int(v.sites.length), label: 'Pangkalan ' + st.km + ' km', title: count(v.sites.length, 'pangkalan TNI') + ' dalam ' + st.km + ' km dari Mabes TNI: markas, perumahan dan rumah sakit.' }
    ];
    var m = openMatra();
    return {
      items: items, filters: filterCount(),
      scope: { label: 'Cakupan', value: st.km, options: [{ v: 15, label: '15 km' }, { v: 30, label: '30 km' }], set: function (x) { setKm(+x); }, title: SCOPE_TIP },
      action: { label: 'Hitung', icon: 'calc', title: m ? 'Hitung KSM & KKB untuk ' + TN.matraLabel(m) : 'Hitung KSM & KKB (tombol K)', run: function () { openCalc('ksm'); } }
    };
  }
  function workspace() {
    if (!ctx || !isDeep() || !ui || !ui.work || !page || !page.el) return null;
    return {
      rail: { el: page.el, label: 'Kredit TNI', short: 'TNI', icon: 'sec-tni', summary: summary },
      drawer: { el: ui.work.el, tabs: ui.work.tabHost, title: 'Daftar & grafik', source: SRC_SITE, more: null },
      hide: [ui.work.head].filter(Boolean)
    };
  }
  /** The matra of the open pangkalan card (D33); null for gabungan or no card. */
  function openMatra() {
    var s = openSite ? TN.site(openSite) : null;
    return s && /^(AL|AU|AD)$/.test(s.matra) ? s.matra : null;
  }

  /* ============================================================ Detail: the drawer "Daftar & grafik" (§3.6) */

  function makeTabs(hostEl, active, onChange, panel) {
    var items = TABS.map(function (t) { return { id: t.id, label: t.label }; });
    if (ctx && isFn(ctx.tabs)) {
      try { var t0 = ctx.tabs(hostEl, { items: items, active: active, onChange: onChange, panel: panel, label: 'Daftar dan grafik Kredit TNI' }); if (t0 && t0.el) { if (!t0.el.parentNode) hostEl.appendChild(t0.el); return t0; } } catch (e) { /* own tabs */ }
    }
    var list = E('div', { class: 'tn-tabs', role: 'tablist', aria: { label: 'Daftar dan grafik Kredit TNI' } }), cur = active;
    var btns = items.map(function (t) {
      var b = E('button', { type: 'button', class: 'tn-tab', role: 'tab', aria: { selected: 'false', controls: 'tn-panel' }, attrs: { tabindex: '-1', 'data-tab': t.id }, text: t.label });
      b.addEventListener('click', function () { onChange(t.id); });
      list.appendChild(b);
      return b;
    });
    hostEl.appendChild(list);
    var api = { el: list, set: function (id) { cur = id; btns.forEach(function (b, i) { var on = items[i].id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }, get: function () { return cur; } };
    api.set(active);
    return api;
  }
  function buildWork(hostEl) {
    var w = {};
    w.tabHost = E('div', { class: 'tn-tabhost' });
    w.body = E('div', { class: 'tn-work__body', id: 'tn-panel', role: 'tabpanel' });
    w.tabsApi = makeTabs(w.tabHost, st.tab, function (id) { setTab(id); }, w.body);
    w.head = E('header', { class: 'tn-work__head' }, E('p', { class: 'tn-work__eyebrow', text: 'Daftar & grafik' }),
      btn('Tutup', 'close', function () { openWork(false); }, 'btn--secondary btn--lg'));
    w.el = E('aside', { class: 'tn-work panel panel--sheet', aria: { label: 'Daftar dan grafik Kredit TNI' }, attrs: { 'data-map-occluder': '' } }, w.head, w.tabHost, w.body);
    hostEl.appendChild(w.el);
    ui.work = w;
  }
  function setTab(id) { st.tab = TABS.some(function (t) { return t.id === id; }) ? id : 'units'; if (st.tab === 'dealers') { if (!st.show.dealer) setDealerChip(true); else ensureDealers(); } renderWork(true); }
  /** Open a drawer tab from anywhere (landing states, "Lihat semua dealer …"); Sederhana switches to Detail first. */
  function goTab(id, o) {
    o = o || {};
    st.tab = TABS.some(function (t) { return t.id === id; }) ? id : 'units';
    if (o.sort && st.tab === 'units' && UNIT_SORTS.some(function (x) { return x.v === o.sort; })) st.sort = o.sort;
    if (o.sort && st.tab === 'dealers' && DEALER_SORTS.some(function (x) { return x.v === o.sort; })) st.dSort = o.sort;
    if ('near' in o) { st.near = o.near || null; V = null; }
    if (st.tab === 'dealers') { st.show.dealer = true; V = null; ensureDealers(); }
    if (!isDeep()) { st.workOpen = true; if (ctx) ctx.setView('deep'); return; }
    openWork(true, o.half !== false);
    renderWork(true);
  }
  function openWork(on, half) {
    st.workOpen = !!on;
    if (ui.work) ui.work.el.classList.toggle('is-open', !!on);
    var W0 = WS();
    if (on && half !== false && W0 && isFn(W0.drawer) && isFn(W0.setDrawer)) { try { if (W0.drawer() === 'peek') W0.setDrawer('half'); } catch (e) { /* keeps */ } }
    if (ctx) ctx.relayout();
  }
  function renderWork(force) {
    var w = ui && ui.work;
    if (!w) return;
    if (w.tabsApi && isFn(w.tabsApi.set)) w.tabsApi.set(st.tab);
    if (w.current !== st.tab || force === true) {
      if (w.table && isFn(w.table.destroy)) { try { w.table.destroy(); } catch (e) { /* ignore */ } }
      w.table = null;
      clear(w.body);
      w.current = st.tab;
      w.parts = {};
    }
    if (st.tab === 'dealers') renderDealersTab(w);
    else if (st.tab === 'pipe') renderPipeTab(w);
    else renderUnitsTab(w);
  }
  function table(hostEl, rows, cols, onRow, label, emptyText) {
    var T0 = MCD.charts && MCD.charts.table, w = ui.work;
    var cfg = { columns: cols, rows: rows, rowKey: function (r) { return r.id; }, rowHeight: 48, virtual: 'auto', label: label, emptyText: emptyText, onRow: onRow };
    if (isFn(T0)) {
      if (w.table && w.tableHost === hostEl) { w.table.update(rows, cfg); return; }
      w.table = T0(hostEl, rows, cfg);
      w.tableHost = hostEl;
      return;
    }
    clear(hostEl);
    var ul = E('ul', { class: 'tn-plain', aria: { label: label } });
    if (!rows.length) ul.appendChild(E('li', { class: 'tn-plain__empty', text: emptyText }));
    rows.slice(0, 200).forEach(function (r) {
      var b = E('button', { type: 'button', class: 'tn-plain__row', attrs: { 'data-id': r.id } });
      cols.forEach(function (c) { var td = E('span', { class: 'tn-plain__c' }); c.render(td, r); b.appendChild(td); });
      b.addEventListener('click', function () { onRow(r); });
      ul.appendChild(E('li', {}, b));
    });
    hostEl.appendChild(ul);
  }
  function sortSites(list, by) {
    var pipe = pipeAll();
    return list.sort(function (a, b) {
      if (by === 'pipe') { var pa = pipe[TN.siteKey(a.id)] ? 1 : 0, pb = pipe[TN.siteKey(b.id)] ? 1 : 0; if (pa !== pb) return pa - pb; }
      if (by === 'satker' && b.nSatker !== a.nSatker) return b.nSatker - a.nSatker;
      return distSortVal(a) - distSortVal(b) || a.km - b.km;
    });
  }
  function badge(s) {
    var txt = s.matra === 'GAB' ? '★' : s.matra;
    return E('span', { class: 'tn-badge tn-badge--' + s.matra.toLowerCase() + ' is-' + s.jenis, title: s.matraName + ' · ' + s.jenisLabel, aria: { hidden: 'true' }, text: txt });
  }
  function renderUnitsTab(w) {
    var p = w.parts;
    if (!p.head) {
      p.head = E('div', { class: 'tn-tools' });
      p.sort = seg('Urutkan pangkalan', UNIT_SORTS, function (v) { st.sort = v; saveUi(); renderUnitsTab(w); }, 'tn-seg--sort');
      p.sw = distToggles();
      p.head.appendChild(p.sort.el);
      p.head.appendChild(p.sw.el);
      p.title = E('h3', { class: 'tn-ex__t' });
      p.table = E('div', { class: 'tn-table' });
      p.foot = note(SATKER_NOTE);
      [p.title, p.head, p.table, p.foot].forEach(function (n) { w.body.appendChild(n); });
    }
    var v = computeView(), rows = sortSites(v.sites.slice(), st.sort), pipe = pipeAll();
    p.sort.set(st.sort);
    p.title.textContent = rows.length ? count(rows.length, 'pangkalan TNI') + ' dalam ' + st.km + ' km' : EMPTY_FILTER;
    table(p.table, rows, [
      { key: 'name', label: 'Pangkalan', sortable: false, render: function (td, s) {
        td.appendChild(E('span', { class: 'tn-ent' }, badge(s), E('span', { class: 'tn-ent__txt' }, E('span', { class: 'tn-ent__name', text: s.label }), E('span', { class: 'tn-ent__sub', text: s.matraName + ' · ' + s.jenisLabel }))));
      } },
      { key: 'satker', label: 'Satuan', width: 70, align: 'right', sortable: false, render: function (td, s) { td.textContent = s.nSatker ? fm().int(s.nSatker) : '—'; } },
      { key: 'dist', label: 'Dari KCP', width: 120, align: 'right', sortable: false, headerTitle: DIST_TIP, render: function (td, s) { td.textContent = distShort(s); td.title = distTip(distOf(s)); } },
      { key: 'pipe', label: 'Tindak lanjut', width: 130, sortable: false, render: function (td, s) { var e = pipe[TN.siteKey(s.id)]; td.textContent = e ? TN.stageLabel(e.stage) : '—'; } }
    ], function (s) { selectSite(s.id); }, 'Pangkalan TNI yang tampil', EMPTY_FILTER);
  }
  function renderDealersTab(w) {
    var p = w.parts, ds = TN.dealerState();
    if (!p.state) { p.state = E('div', { class: 'tn-dstate' }); w.body.appendChild(p.state); }
    clear(p.state);
    if (ds !== 'ready') {
      if (ds === 'error') { p.state.appendChild(note(D_FAILED, 'is-warn')); p.state.appendChild(btn('Coba lagi', 'reset', function () { ensureDealers(); }, 'btn--secondary btn--bar')); }
      else p.state.appendChild(note(D_LOADING));
      return;
    }
    if (!p.head) {
      p.head = E('div', { class: 'tn-tools' });
      p.sort = seg('Urutkan dealer', DEALER_SORTS, function (v) { st.dSort = v; saveUi(); renderDealersTab(w); }, 'tn-seg--sort');
      p.sw = distToggles();
      p.exportB = guardDemo(btn('Ekspor daftar dealer (CSV)', 'download', function () { exportDealers(); }, 'btn--secondary btn--bar', 'Daftar dealer yang tampil, dalam CSV. File CSV dapat dibuka di Excel.'));
      p.nearSlot = E('div', { class: 'tn-nearf' });
      [p.sort.el, p.sw.el, p.exportB].forEach(function (n) { p.head.appendChild(n); });
      p.title = E('h3', { class: 'tn-ex__t' });
      p.table = E('div', { class: 'tn-table' });
      [p.title, p.nearSlot, p.head, p.table, note('Dealer dihitung terpisah dari merchant.'), note(SRC_DEALER, 'tn-src')].forEach(function (n) { w.body.appendChild(n); });
    }
    var dv = dealerView(), rows = dv ? dv.rows.slice() : [];
    rows.sort(st.dSort === 'brand' ? function (a, b) { var x = (a.brand || '￿').localeCompare(b.brand || '￿'); return x || a.name.localeCompare(b.name); } : function (a, b) { return distSortVal(a) - distSortVal(b); });
    p.sort.set(st.dSort);
    clear(p.nearSlot);
    if (dv && dv.near) p.nearSlot.appendChild(E('p', { class: 'tn-chipline' }, E('span', { class: 'chip tn-chip is-on', text: 'Dekat ' + dv.near.label + ' (3 km)' }), link('Hapus', function () { st.near = null; V = null; renderWork(true); refresh(['filters']); }, 'tn-nearf__x', 'Hapus filter lokasi')));
    p.title.textContent = rows.length ? count(rows.length, 'dealer') + ' dalam ' + st.km + ' km' : 'Tidak ada dealer yang cocok dengan filter ini.';
    var VD = MCD.vehicleDealers;
    table(p.table, rows, [
      { key: 'name', label: 'Dealer', sortable: false, render: function (td, r) { td.appendChild(E('span', { class: 'tn-ent__txt' }, E('span', { class: 'tn-ent__name', text: r.name }), E('span', { class: 'tn-ent__sub', text: VD.label(r) }))); } },
      { key: 'brand', label: 'Merek', width: 110, sortable: false, render: function (td, r) { td.textContent = r.brand || 'Tanpa merek'; } },
      { key: 'kind', label: 'Mobil/Motor', width: 96, sortable: false, render: function (td, r) { td.textContent = VD.kindLabel(r.kind); } },
      { key: 'type', label: 'Resmi/Bekas', width: 110, sortable: false, render: function (td, r) { td.textContent = r.type === 'resmi' ? 'Resmi' : r.type === 'bekas' ? 'Bekas' : 'Bengkel'; } },
      { key: 'dist', label: 'Dari KCP', width: 120, align: 'right', sortable: false, headerTitle: DIST_TIP, render: function (td, r) { td.textContent = distShort(r); } }
    ], function (r) { selectDealer(r.id); }, 'Dealer KKB yang tampil', 'Tidak ada dealer yang cocok dengan filter ini.');
  }
  function exportDealers() {
    if (MCD.demo && isFn(MCD.demo.blocks) && MCD.demo.blocks()) return;
    var dv = dealerView();
    if (!dv) return;
    var text = TN.dealerCsv(dv.rows, { veiled: veil(), kecName: kecName, dist: function (r) { var d = distOf(r); return d && d.source !== 'garis' ? { km: d.km, min: d.min } : null; } });
    var name = 'dealer_kkb_cilangkap_' + ymd() + '.csv';
    toast(download(name, text) ? name + ' tersimpan di komputer ini' + (veil() ? '. Nama dealer disamarkan.' : '') : 'File tidak dapat disimpan. Coba lagi.', null);
  }

  /* ---- Tindak lanjut */

  function P() { return TN.pipeline; }
  function pipeAll() { try { return P().all() || {}; } catch (e) { return {}; } }
  function pipeGet(k) { try { return k ? P().get(k) : null; } catch (e) { return null; } }
  function pipeState() {
    var s = 'memory';
    try { s = isFn(P().status) ? P().status() : 'memory'; } catch (e) { s = 'memory'; }
    if (s === 'ready' || s === 'loading') return { ok: true, text: 'Tersimpan di komputer ini.', title: SEALED_TITLE };
    if (s === 'damaged') return { ok: false, text: 'Daftar tindak lanjut di komputer ini rusak dan tidak dapat dibuka. Daftar baru dimulai.' };
    return { ok: false, text: MEM_LINE };
  }
  function keyLabel(k, e) {
    if (/^site:/.test(k)) { var s = TN.site(k); return s ? s.label : (e && e.label) || k.slice(5); }
    var d = TN.dealer(k);
    return d ? d.name : (e && e.label) || 'Dealer';
  }
  function knownKey(k) {
    if (/^site:/.test(k)) return !!TN.site(k);
    return TN.dealerState() === 'ready' ? !!TN.dealer(k) : true;
  }
  function renderPipeTab(w) {
    var p = w.parts;
    if (!p.list) {
      p.state = E('div', { class: 'tn-pstate' });
      p.tools = E('div', { class: 'tn-tools' });
      p.stage = E('select', { class: 'select', aria: { label: 'Tahap' } }, [E('option', { value: '', text: 'Semua tahap' })].concat(TN.stages().map(function (s) { return E('option', { value: s.id, text: s.label }); })));
      p.prod = E('select', { class: 'select', aria: { label: 'Produk' } }, [E('option', { value: '', text: 'Semua produk' })].concat(TN.PRODUCTS.map(function (x) { return E('option', { value: x.id, text: x.short }); })));
      p.stage.addEventListener('change', function () { st.pipeStage = p.stage.value; renderPipeTab(w); });
      p.prod.addEventListener('change', function () { st.pipeProd = p.prod.value; renderPipeTab(w); });
      p.exportB = guardDemo(btn('Ekspor (JSON)', 'download', function () { exportPipe(); }, 'btn--secondary btn--bar'));
      p.clearB = btn('Kosongkan daftar', 'close', function () {
        var n = Object.keys(pipeAll()).length;
        if (!n || !ctx) return;
        ctx.confirm({ title: 'Kosongkan daftar tindak lanjut Kredit TNI', body: count(n, 'entri') + ' beserta catatannya akan dihapus dari komputer ini.', ok: 'Kosongkan daftar', cancel: 'Batal', danger: true })
          .then(function (yes) { if (yes) { try { P().clear(); } catch (e) { /* ignore */ } renderPipeTab(w); toast('Daftar tindak lanjut dikosongkan'); } });
      }, 'btn--ghost btn--bar');
      [p.stage, p.prod, p.exportB, p.clearB].forEach(function (n) { p.tools.appendChild(n); });
      p.title = E('h3', { class: 'tn-ex__t' });
      p.list = E('ul', { class: 'tn-plist' });
      [p.title, p.state, p.tools, p.list, note('Catatan kerja tanpa nama prajurit, NRP, nomor pribadi atau data gaji. Tambahkan pangkalan dan dealer dari kartunya.')].forEach(function (n) { w.body.appendChild(n); });
    }
    clear(p.state);
    var ps = pipeState();
    p.state.appendChild(E('p', { class: ['tn-pstate__t', ps.ok ? 'is-ok' : 'is-warn'], title: ps.title || null, text: ps.text }));
    p.stage.value = st.pipeStage; p.prod.value = st.pipeProd;
    var all = pipeAll(), keys = Object.keys(all).filter(function (k) {
      var e = all[k];
      return (!st.pipeStage || e.stage === st.pipeStage) && (!st.pipeProd || (e.products || []).indexOf(st.pipeProd) >= 0);
    });
    p.title.textContent = Object.keys(all).length ? count(Object.keys(all).length, 'entri') + ' di daftar tindak lanjut Kredit TNI' : 'Daftar tindak lanjut Kredit TNI masih kosong';
    clear(p.list);
    keys.forEach(function (k) {
      var e = all[k], gone = !knownKey(k);
      var b = E('button', { type: 'button', class: 'tn-plist__row' },
        E('span', { class: 'tn-plist__name', text: keyLabel(k, e) }),
        E('span', { class: 'tn-plist__meta', text: [/^site:/.test(k) ? 'Pangkalan' : 'Dealer', TN.stageLabel(e.stage), (e.products || []).map(TN.productName).join(', '), e.nextDate ? 'langkah berikutnya ' + fm().date(e.nextDate) : ''].filter(Boolean).join(' · ') }),
        gone ? E('span', { class: 'tn-plist__gone', text: 'Tidak ada di data terbaru' }) : null);
      b.addEventListener('click', function () { if (gone) return; if (/^site:/.test(k)) selectSite(k.slice(5), { fold: 'pipe' }); else selectDealer(k, { fold: 'pipe' }); });
      p.list.appendChild(E('li', {}, b));
    });
  }
  function exportPipe() {
    if (!ctx || demoOn()) return;
    ctx.confirm({ title: 'Ekspor daftar tindak lanjut Kredit TNI', body: 'File ini tidak terenkripsi. Simpan hanya di komputer kantor.', ok: 'Ekspor (JSON)', cancel: 'Batal' }).then(function (yes) {
      if (!yes) return;
      var res = TN.exportPipeline(), name = 'kredit-tni-tindak-lanjut_cilangkap_' + ymd() + '.json';
      toast(download(name, res.text, 'application/json') ? name + ' tersimpan di komputer ini' + (res.dropped ? '. ' + count(res.dropped, 'catatan') + ' tidak ikut karena memuat angka yang mirip data pribadi.' : '') : 'File tidak dapat disimpan. Coba lagi.', null);
    });
  }

  /* ============================================================ follow-up editor and quick actions (§3.4 fold 6) */

  function pipelineEditor(key, label) {
    var cur0 = pipeGet(key) || {};
    var stage = E('select', { class: 'select', aria: { label: 'Tahap' } }, TN.stages().map(function (s) { return E('option', { value: s.id, text: s.label }); }));
    stage.value = cur0.stage || 'baru';
    var owner = E('input', { class: 'input', type: 'text', maxlength: 60, placeholder: 'Kode atau nama staf', value: cur0.owner || '', aria: { label: 'Penanggung jawab' }, attrs: { autocomplete: 'off' } });
    var progs = TN.programs({ live: true });
    if (cur0.program && !progs.some(function (x) { return x.id === cur0.program; })) progs = progs.concat(TN.programs().filter(function (x) { return x.id === cur0.program; }));
    var prog = E('select', { class: 'select', aria: { label: 'Program' } }, progs.map(function (x) { return E('option', { value: x.id, text: x.label }); }));
    prog.value = cur0.program || '';
    var prods = E('div', { class: 'tn-checks', role: 'group', aria: { label: 'Produk sasaran' } });
    var boxes = TN.PRODUCTS.map(function (x) {
      var cb = E('input', { type: 'checkbox', value: x.id });
      cb.checked = (cur0.products || []).indexOf(x.id) >= 0;
      prods.appendChild(E('label', { class: 'tn-check' }, cb, E('span', { text: x.short })));
      return cb;
    });
    var next = E('input', { class: 'input', type: 'text', maxlength: 120, placeholder: 'Langkah berikutnya', value: cur0.nextStep || '', aria: { label: 'Langkah berikutnya' }, attrs: { autocomplete: 'off' } });
    var nextDate = E('input', { class: 'input', type: 'date', value: cur0.nextDate || '', aria: { label: 'Tanggal langkah berikutnya' } });
    var noteIn = E('textarea', { class: 'input tn-ta', maxlength: 500, rows: 3, placeholder: TN.NOTE_PH, aria: { label: 'Catatan' }, attrs: { autocomplete: 'off' } });
    noteIn.value = cur0.note || '';
    var msg = E('p', { class: 'tn-pmsg', aria: { live: 'polite' } });
    var save = btn(cur0.stage ? 'Simpan' : 'Tambahkan ke tindak lanjut', 'check', function () {
      /* the note check first: the list refuses it too (MCD.tni.pipeCheck), but staff see the reason here (§3.4) */
      if (!TN.noteCheck(noteIn.value).ok) { msg.textContent = TN.NOTE_REFUSED; msg.classList.add('is-warn'); noteIn.setAttribute('aria-invalid', 'true'); return; }
      noteIn.removeAttribute('aria-invalid');
      var res;
      try {
        res = P().set(key, { stage: stage.value, owner: owner.value, program: prog.value, nextStep: next.value, nextDate: nextDate.value, note: noteIn.value,
          products: boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }) }, { label: label });
      } catch (e) { res = { ok: false, error: 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' }; }
      msg.textContent = res && res.ok ? (pipeState().ok ? 'Tersimpan di komputer ini · ' : '') + TN.stageLabel(res.entry.stage) : (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.';
      msg.classList.toggle('is-warn', !(res && res.ok));
      if (res && res.ok) afterPipe();
    }, 'btn--primary btn--bar tn-psave');
    var rm = btn('Hapus', 'close', function () { try { P().remove(key); } catch (e) { /* ignore */ } msg.textContent = 'Dihapus dari daftar tindak lanjut'; afterPipe(); }, 'btn--ghost btn--bar');
    function fl(lbl, c) { return E('label', { class: 'tn-pf' }, E('span', { class: 'tn-pf__l', text: lbl }), c); }
    var b = blk('Tindak lanjut', [
      E('p', { class: ['tn-pstate__t', pipeState().ok ? 'is-ok' : 'is-warn'], text: pipeState().text }),
      E('div', { class: 'tn-pgrid' }, fl('Tahap', stage), fl('Penanggung jawab', owner), fl('Program', prog), fl('Tanggal langkah berikutnya', nextDate)),
      fl('Langkah berikutnya', next), E('div', { class: 'tn-pf' }, E('span', { class: 'tn-pf__l', text: 'Produk sasaran' }), prods),
      fl('Catatan', noteIn), msg, E('div', { class: 'tn-actions' }, save, cur0.stage ? rm : null)
    ], 'tn-dd--pipe', { id: 'pipe', preview: cur0.stage ? TN.stageLabel(cur0.stage) : 'belum ada', open: false });
    b.setAttribute('data-pipe-key', key);
    return b;
  }
  function afterPipe() { if (ui && ui.work && st.tab === 'pipe') renderWork(true); if (ui && ui.work && st.tab === 'units') renderWork(false); }
  function pipeQuick(key, label) {
    var q = { id: 'pipe', label: '+ Tindak lanjut', title: key ? 'Tambahkan ke daftar tindak lanjut. ' + (pipeState().ok ? SEALED_TITLE : MEM_LINE) : TN.NO_KEY,
      run: function () { return quickAdd(key, label); } };
    if (!key) { q.disabled = true; return q; }
    var cur = pipeGet(key);
    if (cur) q.done = { label: '✓ Di tindak lanjut', text: (pipeState().ok ? 'Tersimpan di komputer ini · ' : '') + TN.stageLabel(cur.stage), editLabel: 'Ubah' };
    return q;
  }
  function quickAdd(key, label) {
    var res = null;
    try { res = P().quickAdd(key, label); } catch (e) { res = null; }
    if (!res || !res.ok) return { ok: false, text: (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' };
    afterPipe();
    var s = pipeState();
    return { ok: true, text: (s.ok ? 'Tersimpan di komputer ini · ' : MEM_LINE + ' ') + TN.stageLabel(res.entry.stage), done: { label: '✓ Di tindak lanjut', text: TN.stageLabel(res.entry.stage), editLabel: 'Ubah' }, warn: !s.ok };
  }
  /** "+ Rencana kunjungan" through MCD.plan.quick (PLAN lane); nothing without it. Coordinates and a public label only. */
  function planQuick(id, label, p, kind) {
    var Pl = MCD.plan;
    if (!Pl || !isFn(Pl.quick)) return null;
    try { return Pl.quick({ id: id, kind: kind, label: label, lon: p.lon, lat: p.lat, geoPrecision: p.approx ? 'perkiraan' : null }) || null; } catch (e) { return null; }
  }

  /* ============================================================ the pangkalan card (§3.3, §3.4) */

  function siteNumbers(s) {
    var nums = [distNumber(s)];
    if (s.nSatker) nums.push({ label: 'satuan', value: fm().int(s.nSatker), title: count(s.nSatker, 'satuan') + ' tercatat di lokasi ini (riset publik).' });
    if (TN.dealerState() === 'ready') nums.push({ label: 'dealer dalam 3 km', value: fm().int(TN.nearestDealers(s, { n: 999, maxKm: 3 }).length), title: 'Dealer resmi dan showroom bekas dalam 3 km (garis lurus).' });
    return nums.slice(0, 3);
  }
  function siteChips(s) {
    return [E('span', { class: 'chip tn-chip tn-chip--matra', text: s.matraName }), E('span', { class: 'chip tn-chip', text: s.jenisLabel })];
  }
  function foldMasuk(s) {
    var kids = [];
    var lines = s.jenis === 'markas' ? CARA_MASUK.markas.slice() : (CARA_MASUK[s.jenis] || []).slice();
    lines.forEach(function (t) { kids.push(E('p', { text: t })); });
    if (s.jenis === 'markas') {
      var fin = TN.satkerOf(s.id).filter(function (u) { return u.finance; });
      if (fin.length) kids.push(E('p', { class: 'tn-strong', text: 'Bagian keuangan di lokasi ini: ' + fin.map(function (u) { return u.abbr + ' (' + u.name + ')'; }).join(', ') + '.' }));
      CARA_MASUK.markasTail.forEach(function (t) { kids.push(E('p', { text: t })); });
    }
    return blk('Cara masuk', kids, 'tn-dd--masuk', { id: 'masuk', preview: lines[0], open: true });
  }
  /** "Produk sasaran": four lines, "Hitung KSM & KKB ›", the running programmes, then the concentration line (D22). */
  function foldProduk(s) {
    var kids = [];
    PRODUK.forEach(function (x, i) {
      kids.push(E('p', { class: 'tn-prod' }, E('b', { text: x.k + ' ' }), E('span', { text: x.t })));
      if (i === 2) kids.push(E('p', { class: 'tn-prod__calc' }, link('Hitung KSM & KKB ›', function () { openCalc('ksm', s.matra); }, 'tn-calc-link', 'Buka kalkulator KSM & KKB untuk ' + s.matraName)));
    });
    var progs = TN.programs({ live: true }).filter(function (x) { return x.id; });
    if (progs.length) {
      var ul = E('ul', { class: 'tn-progs' });
      progs.forEach(function (x) {
        var src = x.src ? 'https://' + String(x.src).replace(/^https?:\/\//, '').split(' ')[0] : null;
        ul.appendChild(E('li', { class: 'tn-prog' }, E('b', { text: x.full + ' · berakhir ' + fm().date(x.end) }), x.terms ? E('span', { class: 'tn-prog__t', text: x.terms }) : null,
          src && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s"'<>]*)?$/i.test(src) ? extLink(src, 'Sumber program', 'Halaman program di situs resmi, di tab baru.') : null));
      });
      kids.push(ul);
    }
    var con = TN.concentration();
    if (con) {
      var full = cardShowsFullConcentration();
      kids.push(E('p', { class: 'tn-conc', title: full ? TN.CONCENTRATION_TITLE : TN.concentrationText(con, { mode: 'full' }), text: full ? TN.concentrationText(con, { mode: 'full' }) : TN.concentrationText(con, { mode: 'short' }) }));
      var lim = TN.limitText(con);
      if (lim) kids.push(E('p', { class: 'tn-limit', text: lim }));
    }
    return blk('Produk sasaran', kids, 'tn-dd--produk', { id: 'produk', preview: 'KSM · Top up KSM · KKB · Tabungan', open: true });
  }
  /** The full sentence appears once per screen (D22): the card has it only while the panel's card 1 is out of sight (slim rail). */
  function cardShowsFullConcentration() {
    if (!isDeep()) return false;
    var W0 = WS();
    if (!W0 || !isFn(W0.rail)) return true;
    try { return W0.rail() === 'slim'; } catch (e) { return true; }
  }
  function foldSatuan(s) {
    var units = TN.satkerOf(s.id);
    if (!units.length) return null;
    var ul = E('ul', { class: 'tn-units' });
    units.forEach(function (u) {
      ul.appendChild(E('li', { class: 'tn-unit' }, E('span', { text: u.abbr + ' · ' + u.name }), u.finance ? E('span', { class: 'chip tn-chip tn-chip--fin', text: 'Bagian keuangan' }) : null));
    });
    return blk('Satuan di lokasi ini · ' + units.length, [ul, note(SATKER_NOTE)], 'tn-dd--satuan', { id: 'satuan', preview: count(units.length, 'satuan'), open: false });
  }
  /** "Dealer terdekat": opening the fold loads the dealer file; rows open the dealer in this sheet with the crumb. */
  function foldDealer(s) {
    var body = E('div', { class: 'tn-dnear' });
    var b = blk('Dealer terdekat', [body], 'tn-dd--dealer', { id: 'dealer', preview: TN.dealerState() === 'ready' ? count(TN.nearestDealers(s, { n: 999, maxKm: 3 }).length, 'dealer dalam 3 km') : 'dalam 3 km', open: false });
    function paint() {
      clear(body);
      var ds = TN.dealerState();
      if (ds === 'loading') { body.appendChild(note(D_LOADING)); return; }
      if (ds === 'error') { body.appendChild(note(D_FAILED, 'is-warn')); body.appendChild(btn('Coba lagi', 'reset', function () { load(); }, 'btn--ghost btn--bar')); return; }
      if (ds !== 'ready') { body.appendChild(btn('Tampilkan dealer terdekat', null, function () { load(); }, 'btn--secondary btn--bar')); return; }
      var list = TN.nearestDealers(s, { n: 5, maxKm: 3 });
      if (!list.length) body.appendChild(note('Tidak ada dealer dalam 3 km.'));
      var ul = E('ul', { class: 'tn-dlist' });
      list.forEach(function (x) {
        var row = E('button', { type: 'button', class: 'tn-dlist__row', attrs: { 'data-id': x.row.id }, text: MCD.vehicleDealers.label(x.row) + ' · ' + x.row.name + ' · ' + MCD.vehicleDealers.fmtKm(x.km) });
        row.addEventListener('click', function () { selectDealer(x.row.id, { from: s.id }); });
        ul.appendChild(E('li', {}, row));
      });
      if (list.length) body.appendChild(ul);
      body.appendChild(E('p', {}, link('Lihat semua dealer di sekitar lokasi ini', function () { goTab('dealers', { near: s.id, sort: 'near' }); })));
    }
    function load() { TN.dealers().then(paint, paint); paint(); }
    paint();
    var off = TN.on(function (e) { if (e.what === 'dealers') { if (!b.isConnected && b.__seen) { off(); return; } paint(); } });
    offs.push(off);
    /* the fold opened by staff (MCD.windows toggles .is-folded) loads the file; a fold that stays closed loads nothing */
    b.addEventListener('click', function (e) { var t = e.target && e.target.closest ? e.target.closest('.ws-fold__btn') : null; if (t && t.getAttribute('aria-expanded') === 'true' && TN.dealerState() !== 'ready') load(); });
    if (typeof MutationObserver === 'function') {
      try {
        var mo = new MutationObserver(function () { b.__seen = true; if (b.classList.contains('ws-fold') && !b.classList.contains('is-folded') && TN.dealerState() === 'idle') load(); });
        mo.observe(b, { attributes: true, attributeFilter: ['class'] });
        offs.push(function () { mo.disconnect(); });
      } catch (e2) { /* the button inside stays */ }
    }
    return b;
  }
  function foldRute(p, o) {
    var kids = [E('p', { text: distShort(p) + ' dari KCP (perkiraan, lalu lintas normal)', title: distTip(distOf(p)) })];
    var kid = p.kecamatanId || p.kec;
    if (kid) kids.push(E('p', { text: 'Wilayah: Kecamatan ' + kecName(kid) }));
    if (p.approx) kids.push(note('Titik lokasi perkiraan.'));
    kids.push(E('div', { class: 'tn-actions' }, btn('Perbesar ke lokasi', 'target', function () { var M = MCD.map; if (M && isFn(M.flyTo)) M.flyTo({ center: [p.lon, p.lat], zoom: 16 }); }, 'btn--secondary btn--bar')));
    return blk('Jarak & rute', kids, 'tn-dd--rute', { id: 'rute', preview: distShort(p), open: (o && o.open) || false });
  }
  function siteModel(s, o) {
    o = o || {};
    if (!s) return null;
    var key = TN.siteKey(s.id);
    var body = [foldMasuk(s), foldProduk(s), foldSatuan(s), foldDealer(s), foldRute(s), key ? pipelineEditor(key, s.label) : null].filter(Boolean);
    if (o.fold) body.forEach(function (b) { if (b.getAttribute('data-fold') === o.fold) b.setAttribute('data-open', '1'); });
    var plan = planQuick(key, s.label, s, 'satuan');
    return {
      kind: 'tniSite', key: key, eyebrow: TN.eyebrow(s), title: s.label,
      tags: siteChips(s), body: body,
      gmaps: veil() ? null : { lat: s.lat, lon: s.lon },
      prov: SRC_SITE,
      brief: { numbers: siteNumbers(s), chips: siteChips(s), primary: { label: 'Hitung KSM & KKB', run: function () { openCalc('ksm', s.matra); } }, note: null },
      quick: [pipeQuick(key, s.label), plan].filter(Boolean),
      links: plan ? [plan] : [],
      crumb: o.trail ? kecCrumb(o.trail) : null,
      anchor: [s.lon, s.lat], hints: []
    };
  }

  /* ============================================================ the dealer card (§3.3, §3.5) */

  function dealerEyebrow(r) {
    var VD = MCD.vehicleDealers;
    return (VD.typeLabel(r.type) + ' · ' + VD.kindLabel(r.kind)).toUpperCase();
  }
  function dealerChips(r) { return [E('span', { class: 'chip tn-chip', text: r.brand || 'Tanpa merek' }), E('span', { class: 'chip tn-chip', text: MCD.vehicleDealers.kindLabel(r.kind) })]; }
  function dealerModel(r, o) {
    o = o || {};
    if (!r) return null;
    var VD = MCD.vehicleDealers, web = VD.safeUrl(r.web), near = TN.nearestSites(r, 3);
    var tentang = [E('p', { text: VD.label(r) }), E('p', { text: 'Merek: ' + (r.brand || 'Tanpa merek') + ' · ' + VD.kindLabel(r.kind) }), E('p', { text: 'Sumber: Overture Maps dan OpenStreetMap' })];
    if (r.typeInferred) tentang.push(note('Jenis showroom diperkirakan dari kategori usaha.'));
    if (web && !veil()) tentang.push(E('p', {}, extLink(web, 'Situs resmi', 'Situs resmi dealer, di tab baru. Perlu internet.')));
    var kkb = [
      E('p', {}, btn('Hitung KKB', null, function () { openCalc('kkb', o.from ? (TN.site(o.from) || {}).matra : null); }, 'btn--secondary btn--bar tn-kkb-calc')),
      E('p', { text: 'Cek status rekanan dealer di daftar rekanan cabang.' }),
      E('p', { text: 'Tawarkan kerja sama rujukan KKB kepada pimpinan dealer.' }),
      E('p', { text: 'Kerja sama rujukan mengikuti ketentuan bank tentang rekanan dealer.' })
    ];
    var ul = E('ul', { class: 'tn-dlist' });
    near.forEach(function (x) {
      var b = E('button', { type: 'button', class: 'tn-dlist__row', text: x.site.label + ' · ' + MCD.vehicleDealers.fmtKm(x.km) });
      b.addEventListener('click', function () { selectSite(x.site.id); });
      ul.appendChild(E('li', {}, b));
    });
    var key = TN.dealerKey(r.id), plan = planQuick(r.id, r.name, r, 'dealer');
    var body = [blk('Tentang dealer', tentang, 'tn-dd--tentang', { id: 'tentang', preview: VD.label(r), open: true }),
      blk('KKB', kkb, 'tn-dd--kkb', { id: 'kkb', preview: 'Hitung KKB · rujukan dealer', open: true }),
      blk('Pangkalan terdekat', [ul], 'tn-dd--pangkalan', { id: 'pangkalan', preview: near[0] ? near[0].site.label : '', open: false }),
      foldRute(r), key ? pipelineEditor(key, r.name) : null].filter(Boolean);
    if (o.fold) body.forEach(function (b) { if (b.getAttribute('data-fold') === o.fold) b.setAttribute('data-open', '1'); });
    var nums = [distNumber(r)];
    if (near[0]) nums.push({ label: 'Pangkalan terdekat: ' + near[0].site.label, value: VD.fmtKm(near[0].km) });
    var from = o.from ? TN.site(o.from) : null;
    return {
      kind: 'tniDealer', key: r.id, eyebrow: dealerEyebrow(r), title: r.name,
      tags: dealerChips(r), body: body,
      gmaps: veil() ? null : { lat: r.lat, lon: r.lon },
      prov: SRC_DEALER + ' · ' + ((window.MCD_VEHICLE_DEALERS && window.MCD_VEHICLE_DEALERS.meta && window.MCD_VEHICLE_DEALERS.meta.attribution) || ''),
      brief: { numbers: nums, chips: dealerChips(r), primary: plan ? { label: plan.label, run: plan.run } : null, note: null },
      quick: [pipeQuick(key, r.name), plan].filter(Boolean),
      links: web && !veil() ? [{ label: 'Situs resmi', href: web, title: 'Situs resmi dealer, di tab baru.' }] : [],
      /* the trail of LAYOUT_V5C §3.3.3 with a pangkalan as the parent: back to that card with "Dealer terdekat" open */
      crumb: from ? { id: 'site:' + from.id, label: from.label, title: 'Kembali ke ' + from.label, run: function () { selectSite(from.id, { fold: 'dealer' }); } } : null,
      trailParent: from ? { kind: 'site', id: from.id, label: from.label } : null,
      anchor: [r.lon, r.lat], hints: []
    };
  }

  /* ============================================================ the kecamatan card (list first) */

  function kecCrumb(kid) { var n = kecName(kid); return { id: String(kid), label: n, title: 'Kembali ke Kecamatan ' + n, run: function () { openKec(kid); } }; }
  function kecModel(kid) {
    var v = computeView(), list = sortSites((v.byKec[kid] || []).slice(), 'near'), name = kecName(kid) || 'Kecamatan';
    var dv = dealerView(), nd = dv ? dv.byKec[kid] || 0 : null;
    var ul = E('div', { class: 'dd-list tn-kl', role: 'list', aria: { label: 'Pangkalan di ' + name } });
    list.slice(0, KL_MAX).forEach(function (s) {
      var b = E('button', { type: 'button', class: 'dd-list__row tn-kl__row' }, badge(s), E('span', { class: 'dd-list__name', text: s.label }), E('span', { class: 'dd-list__meta', text: s.matraName + ' · ' + s.jenisLabel + ' · ' + distShort(s) }));
      b.addEventListener('click', function () { selectSite(s.id, { trail: kid }); });
      ul.appendChild(E('div', { role: 'listitem' }, b));
    });
    var kids = list.length ? [ul] : [note('Tidak ada pangkalan TNI dalam ' + st.km + ' km di kecamatan ini.')];
    var lb = blk('Pangkalan di ' + name, kids, 'tn-dd--klist', { id: 'daftar', preview: count(list.length, 'pangkalan'), open: true });
    lb.classList.remove('dd-blk'); lb.classList.add('tn-kl-blk');
    var nums = [{ label: 'Pangkalan', value: fm().int(list.length), big: true }];
    if (nd != null) nums.push({ label: 'dealer', value: fm().int(nd) });
    return { kind: 'kec', key: 'kec:' + kid, eyebrow: 'KECAMATAN', title: name, body: [lb], listFirst: true, prov: SRC_SITE, gmaps: { q: 'Kecamatan ' + name },
      brief: { numbers: nums, chips: [], primary: list.length ? { label: 'Lihat pangkalan di kecamatan ini', run: function () { openKec(kid); } } : null,
        note: list.length ? null : { text: 'Tidak ada pangkalan TNI dalam ' + st.km + ' km di kecamatan ini.', tone: 'none' } }, anchor: null, hints: [] };
  }
  function kecPopup(kid) {
    var v = computeView(), n = (v.byKec[kid] || []).length, dv = dealerView();
    var rows = [{ label: 'Pangkalan dalam ' + st.km + ' km', value: fm().int(n) }];
    if (dv) rows.push({ label: 'Dealer', value: fm().int(dv.byKec[kid] || 0) });
    var b = kecModel(kid).brief;
    return { rows: rows, big: { value: fm().int(n), caption: 'Pangkalan' }, chip: null, demo: false, kind: 'kec', key: 'kec:' + kid, brief: b, source: 'Sumber: OpenStreetMap, riset publik · batas kecamatan BPS' };
  }

  /* ============================================================ map (MAP lane: the dealer kind and sprites; until then this layer) */

  function rgba(c, a) { return [c[0], c[1], c[2], a == null ? 255 : a]; }
  function ink(ms) { return ms && ms.theme === 'day' ? [18, 42, 86] : [236, 240, 246]; }
  function clusters(rows, zoom) {
    var cell = 56 * 360 / (256 * Math.pow(2, zoom)), g = {};
    rows.forEach(function (r) {
      var k = Math.floor(r.lon / cell) + ':' + Math.floor(r.lat / cell), c = g[k];
      if (!c) c = g[k] = { id: k, n: 0, lon: 0, lat: 0 };
      c.n++; c.lon += r.lon; c.lat += r.lat;
    });
    return Object.keys(g).map(function (k) { var c = g[k]; return { id: c.id, n: c.n, lon: c.lon / c.n, lat: c.lat / c.n }; });
  }
  function mapLayers(derived, ms) {
    var D = window.deck, out = { base: [], top: [] };
    if (!D || !ms || !st) return out;
    terrLayers(out, ms);
    var dv = dealersOn() ? dealerView() : null;
    if (!dv || !dv.rows.length) return out;
    var c = ink(ms), z = ms.zoom || 12, K = ms.kit || {};
    if (z < 13) {
      var cl = clusters(dv.rows, z);
      out.base.push(new D.ScatterplotLayer({ id: 'tni-dealer-cluster', data: cl, getPosition: function (o) { return [o.lon, o.lat]; }, radiusUnits: 'pixels',
        getRadius: function (o) { return o.n > 99 ? 15 : o.n > 9 ? 12 : 9; }, filled: true, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 1.2,
        getFillColor: ms.theme === 'day' ? [255, 255, 255, 235] : [40, 46, 58, 235], getLineColor: rgba(c, 200), pickable: true, beforeId: K.beforeId,
        mcd: { kind: 'tniDealerCluster', id: function (o) { return o.lon.toFixed(5) + ',' + o.lat.toFixed(5); } } }));
      if (D.TextLayer) out.top.push(new D.TextLayer({ id: 'tni-dealer-cluster-n', data: cl, getPosition: function (o) { return [o.lon, o.lat]; }, getText: function (o) { return String(o.n); },
        getSize: 11, sizeUnits: 'pixels', getColor: rgba(c, 255), getTextAnchor: 'middle', getAlignmentBaseline: 'center', fontWeight: 600, pickable: false, beforeId: K.beforeId }));
      return out;
    }
    var sel = MCD.state && MCD.state.get().selection;
    out.base.push(new D.ScatterplotLayer({
      id: 'tni-dealers', data: dv.rows, getPosition: function (r) { return [r.lon, r.lat]; }, radiusUnits: 'pixels',
      getRadius: function (r) { return r.type === 'servis' ? 3 : r.kind === 'mobil' ? 5.5 : 4; }, filled: true, stroked: true, lineWidthUnits: 'pixels',
      getLineWidth: function (r) { return r.type === 'bekas' ? 1.6 : 1; },
      getFillColor: function (r) { return r.type === 'resmi' ? rgba(c, 235) : r.type === 'servis' ? [150, 150, 150, 200] : (ms.theme === 'day' ? [255, 255, 255, 230] : [30, 34, 42, 230]); },
      getLineColor: function (r) { return r.type === 'servis' ? [120, 120, 120, 220] : rgba(c, 245); },
      updateTriggers: { getFillColor: [ms.theme], getLineColor: [ms.theme] }, pickable: true, autoHighlight: true, highlightColor: rgba(c, 60), beforeId: K.beforeId,
      mcd: { kind: 'dealer', id: function (r) { return r.id; } }
    }));
    var sd = sel && sel.kind === 'dealer' ? TN.dealer(sel.id) : null;
    if (sd) out.top.push(new D.ScatterplotLayer({ id: 'tni-dealer-sel', data: [sd], getPosition: function (r) { return [r.lon, r.lat]; }, radiusUnits: 'pixels', getRadius: 11,
      filled: false, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.2, getLineColor: rgba((K.palette && K.palette.signal) || c, 255), pickable: false, beforeId: K.beforeId }));
    return out;
  }
  function terrStats() {
    var v = computeView();
    if (v.terr) return v.terr;
    var kec = {};
    Object.keys(v.byKec).forEach(function (id) { var n = v.byKec[id].length; kec[id] = { potential: n, acquired: null, notYet: null, edc: null, unlisted: null, coverage: null, band: n ? 'potential' : 'noData', ranked: false }; });
    v.terr = { key: 'tni|' + v.sig, hasBank: false, demo: false, rule: 'known', bands: { ok: 0.5, mid: 0.2 }, categories: [], bandMode: 'relative', relative: { kecamatan: null, kelurahan: null }, totals: { potential: v.sites.length }, kecamatan: kec, kelurahan: {} };
    return v.terr;
  }
  /** Kecamatan chips "Cipayung · 4 pangkalan" only (the dealer count lives in the callout, §3.1). */
  function kecLabel(k) { var v = computeView(), n = (v.byKec[k.id] || []).length; return n ? k.name + ' · ' + count(n, 'pangkalan') : k.name; }
  function terrLayers(out, ms) {
    var T0 = territory(), stats = terrStats();
    if (!T0 || !stats || !isFn(T0.layers)) return;
    var res;
    try { res = T0.layers({ id: 'tni-terr', ms: ms, stats: stats, selected: st.selKec || null, outside: 'outline', pickable: true, labelText: function (k) { return kecLabel(k); }, labelKey: stats.key }); } catch (e) { return; }
    (res.base || []).forEach(function (L) { out.base.push(L); });
    (res.top || []).forEach(function (L) { out.top.push(L); });
  }
  function legend(derived, ms) {
    var groups = [];
    if (dealersOn()) {
      var sprite = MCD.map && isFn(MCD.map.dealerSprite);
      groups.push({ id: 'tni-dealer', title: 'Dealer KKB', rows: [
        { glyph: 'dot', label: 'Titik penuh = dealer resmi. Titik bergaris = showroom bekas.' },
        { glyph: 'dot', label: sprite ? 'Mobil: ikon mobil. Motor: ikon motor.' : 'Mobil: titik besar. Motor: titik kecil.' },
        { glyph: 'chip', label: 'Angka dalam lingkaran: jumlah dealer di sekitar. Perbesar peta untuk melihat setiap dealer.' }
      ].concat(st.servis ? [{ glyph: 'dot', label: 'Titik abu-abu kecil = bengkel resmi.' }] : []) });
    }
    groups.push({ id: 'tni-kec', title: 'Label kecamatan', rows: [{ glyph: 'chip', label: 'Nama kecamatan · jumlah pangkalan' }] });
    void derived; void ms;
    return groups;
  }
  function telemetry() { return st ? fm().int(computeView().sites.length) + ' PANGKALAN TNI DALAM ' + st.km + ' KM' : ''; }
  function registerMap() {
    unregisterMap();
    var M = MCD.map;
    if (!M || !isFn(M.registerLayers)) return;
    mapOffs.push(M.registerLayers(ID, mapLayers, { id: ID }));
    if (isFn(M.registerPosture)) M.registerPosture(ID, { imagery: 'full', camera: st.km === 15 ? 'tni15' : 'ring30', rings: 'schools', layerSet: 'tni', deck: true, buildings: 'off',
      attribution: ATTRIBUTION, onRingClick: function (km) { setKm(km <= 15.01 ? 15 : 30); }, ringHint: 'Klik untuk menampilkan pangkalan sampai jarak ini dari Mabes TNI', telemetry: telemetry });
    if (isFn(M.registerLegend)) M.registerLegend(ID, legend);
    if (isFn(M.registerSelectable)) {
      M.registerSelectable('dealer', function (id) { var r = TN.dealer(id); return r ? [r.lon, r.lat] : null; });
      M.registerSelectable('tniKec', function () { return null; });
    }
    if (isFn(M.registerPreset)) M.registerPreset('tni15', { label: '15 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 15 });
    var T0 = MCD.territory;
    if (T0 && isFn(T0.bind) && isFn(T0.popup)) {
      unbindTerr = T0.bind({
        stats: function () { return terrStats(); },
        popup: function (kid) { return kecPopup(kid); },
        actions: function (kid) {
          var n = (computeView().byKec[kid] || []).length;
          return n ? [{ label: 'Lihat pangkalan di kecamatan ini', primary: true, run: function () { openKec(kid); } }] : [];
        },
        onPick: function (h) { if (h && h.kecamatanId) { st.selKec = h.kecamatanId; requestRender(); } },
        onClose: function () { if (!(drawerSel && drawerSel.kind === 'tniKec')) { st.selKec = null; requestRender(); } }
      });
    }
    applyZones();
  }
  function unregisterMap() {
    mapOffs.forEach(function (off) { try { if (isFn(off)) off(); } catch (e) { /* ignore */ } });
    mapOffs = [];
    if (unbindTerr) { try { unbindTerr(); } catch (e) { /* ignore */ } unbindTerr = null; }
  }

  /* ============================================================ selection and focus */

  function selectSite(id, o) { if (!ctx) return; var x = {}; if (o && o.fold) x.fold = o.fold; if (o && o.trail) x.trail = String(o.trail); ctx.select({ kind: 'site', id: String(id).replace(/^site:/, ''), extra: Object.keys(x).length ? x : undefined }); }
  function selectDealer(id, o) { if (!ctx) return; var x = {}; if (o && o.from) x.from = String(o.from); if (o && o.fold) x.fold = o.fold; ctx.select({ kind: 'dealer', id: String(id), extra: Object.keys(x).length ? x : undefined }); }
  function openKec(kid) { if (ctx) ctx.select({ kind: 'tniKec', id: String(kid), extra: { kecamatanId: String(kid) } }); }
  function focusSite(id) {
    var s = TN.site(id), M = MCD.map;
    if (!s || !ctx) return false;
    if (s.km > st.km) setKm(30, { camera: false });
    if (st.matra[s.matra] === false || st.jenis[s.jenis] === false) resetFilters();
    if (M && isFn(M.focusPoint)) { try { if (M.focusPoint({ lon: s.lon, lat: s.lat, zoom: 15.5, kind: 'site', id: s.id }) !== false) return true; } catch (e) { /* select below */ } }
    selectSite(s.id);
    return true;
  }
  function focusDealer(id) {
    if (!ctx) return false;
    if (!st.show.dealer) st.show.dealer = true;
    TN.dealers().then(function () {
      var r = TN.dealer(id), M = MCD.map;
      if (!r || !ctx) { toast('Dealer ini tidak ditemukan di daftar dealer.', 'warn'); return; }
      V = null; refresh(['dealers']);
      if (M && isFn(M.focusPoint)) { try { if (M.focusPoint({ lon: r.lon, lat: r.lat, zoom: 16, kind: 'dealer', id: r.id }) !== false) return; } catch (e) { /* select */ } }
      selectDealer(r.id);
    }, function () { toast(D_FAILED, 'warn'); });
    return true;
  }
  function showModel(sel) {
    if (!sel) return null;
    var x = sel.extra || {};
    if (sel.kind === 'site') return siteModel(TN.site(sel.id), { fold: x.fold, trail: x.trail });
    if (sel.kind === 'dealer') return dealerModel(TN.dealer(sel.id), { from: x.from, fold: x.fold });
    if (sel.kind === 'tniKec') return kecModel(String(sel.id));
    return null;
  }
  function onSelect(sel) {
    if (!sel) return false;
    if (MCD.territory && sel.kind === MCD.territory.KIND) { later(function () { if (ctx) ctx.clearSelection(); }, 0); return true; }
    if (sel.kind === 'tniDealerCluster') {
      var p = String(sel.id).split(','), M = MCD.map;
      if (M && isFn(M.flyTo) && p.length === 2) M.flyTo({ center: [+p[0], +p[1]], zoom: 13.6 });
      later(function () { if (ctx) ctx.clearSelection(); }, 0);
      return true;
    }
    if (sel.kind === 'site' && !TN.site(sel.id)) { later(function () { if (ctx) ctx.clearSelection(); }, 0); return true; }   /* gates, "lain", banks: context only here */
    if (!/^(site|dealer|tniKec)$/.test(sel.kind)) return false;
    if (sel.kind === 'dealer' && !TN.dealer(sel.id)) {
      TN.dealers().then(function () { if (ctx && TN.dealer(sel.id)) onSelect(sel); }, function () { toast(D_FAILED, 'warn'); });
      return true;
    }
    var model = showModel(sel);
    if (!model) return false;
    drawerSel = sel;
    openSite = sel.kind === 'site' ? String(sel.id) : (sel.kind === 'dealer' && sel.extra && sel.extra.from ? String(sel.extra.from) : null);
    if (sel.kind === 'tniKec') st.selKec = String(sel.id);
    requestRender();
    later(function () {
      if (!ctx || drawerSel !== sel) return;
      if (MCD.territory && isFn(MCD.territory.closePopup)) { try { MCD.territory.closePopup(); } catch (e) { /* ignore */ } }
      ctx.openDrawer(model);
      watchDrawer(sel);
      if (sel.extra && sel.extra.fold) later(function () { openFold(sel.extra.fold); }, 120);
      paintSummary();
    }, 0);
    return true;
  }
  function openFold(id) {
    var d = document.querySelector('.drawer'), el = d ? d.querySelector('[data-fold="' + id + '"]') : null;
    if (!el) return;
    var b = el.querySelector('.ws-fold__btn[aria-expanded="false"]');
    if (b) b.click();
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
  }
  var drawerObs = null;
  function watchDrawer(sel) {
    if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
    var d = document.querySelector('.drawer');
    if (!d || typeof MutationObserver !== 'function') return;
    drawerObs = new MutationObserver(function () {
      if (d.classList.contains('is-open')) return;
      drawerObs.disconnect(); drawerObs = null;
      if (drawerSel !== sel) return;
      drawerSel = null; openSite = null;
      if (sel.kind === 'tniKec') st.selKec = null;
      paintSummary();
      requestRender();
    });
    drawerObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }
  function paintSummary() { var W0 = WS(); if (W0 && isFn(W0.paintSummary)) { try { W0.paintSummary(); } catch (e) { /* ignore */ } } }
  function refreshOpenCard() {
    if (!ctx || !drawerSel || !WS()) return;
    var a = document.activeElement;
    if (a && a.closest && a.closest('.tn-dd--pipe')) return;
    var model = showModel(drawerSel);
    if (model) ctx.openDrawer(model, { refresh: true, keepSelection: true });
  }

  /* ============================================================ the calculator */

  /** tab 'ksm' | 'kkb'; the matra of the open pangkalan card (or the given one) filters the pangkat list (D8, D33). */
  function openCalc(tab, matra) {
    var K = MCD.tniCalc;
    if (!K || !isFn(K.open) || !ctx) return false;
    var m = matra !== undefined ? matra : openMatra();
    var N = MCD.nav, crumb = null;
    if (N && isFn(N.crumb)) { try { crumb = N.crumb(); } catch (e) { crumb = null; } }
    var near = openSite;
    return K.open({ tab: tab, matra: m, host: host, crumb: crumb,
      onDealers: function () { goTab('dealers', { near: near || null, sort: 'near' }); },
      onClose: function () { if (ctx) ctx.relayout(); } });
  }

  /* ============================================================ search (Cari) */

  function search(q) {
    if (!TN) TN = MCD.tni;
    if (!TN) return [];
    var out = [];
    TN.siteSearch(q, 6).forEach(function (s) {
      out.push({ group: 'Kredit TNI', label: s.label, sub: 'Pangkalan TNI · ' + s.matraName + ' · ' + s.jenisLabel, run: function () { if (MCD.app && isFn(MCD.app.focus)) MCD.app.focus({ section: ID, kind: 'site', id: s.id }); } });
    });
    TN.satkerSearch(q, 6).forEach(function (u) {
      out.push({ group: 'Kredit TNI', label: u.abbr + ' · di ' + u.siteLabel, sub: u.name + (u.finance ? ' · bagian keuangan' : ''), run: function () { if (MCD.app && isFn(MCD.app.focus)) MCD.app.focus({ section: ID, kind: 'site', id: u.siteId }); } });
    });
    return out;
  }
  var searchDone = false;
  function registerSearch() {
    if (searchDone) return;
    if (MCD.searchProviders && typeof MCD.searchProviders === 'object') { MCD.searchProviders.tni = search; searchDone = true; return; }
    var A = MCD.app;
    if (A && isFn(A.registerSearch)) { try { A.registerSearch(ID, search); searchDone = true; } catch (e) { /* the shell keeps its own */ } }
  }

  /* ============================================================ render */

  function refresh(keys) {
    if (!ctx || !st) return;
    if (!keys || keys.indexOf('*') >= 0 || keys.indexOf('data') >= 0 || keys.indexOf('privacy.veil') >= 0) V = null;
    renderPanel();
    if (isDeep() && ui.work) renderWork(false);
    requestRender();
    paintSummary();
  }

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (h, c) {
      TN = MCD.tni;
      ctx = c; host = h;
      ui = {}; offs = []; timers = []; distSwitches = []; DISTC = new Map(); pipeEds = {}; drawerSel = null; openSite = null;
      if (!TN) { h.appendChild(E('p', { class: 'tn-note', text: 'Kredit TNI belum dapat dibuka. Muat ulang halaman.' })); return; }
      st = st || loadState();
      st.km = scopeGet();
      st.show.dealer = st.show.dealer && TN.dealerState() === 'ready';
      saveUi = debounce(persist, 400);
      h.classList.add('tn-host');
      page = c.page({ lede: LEDE, shows: ['Pangkalan TNI dan satuannya di sekitar Mabes TNI', 'Kalkulator KSM dan KKB dari tabel gaji resmi dan angka kebijakan bank', 'Dealer mobil dan motor untuk rujukan KKB'],
        needs: [], dataKeys: [], emptyFirst: false, blocks: [], source: SRC_SITE, cards: function () { return []; } });
      buildPanel(page.body);
      if (isDeep()) { buildWork(h); if (st.workOpen) later(function () { if (ctx && isDeep()) { openWork(true); renderWork(true); } }, 420); }
      registerMap();
      registerSearch();
      offs.push(TN.on(function (e) { if (!ctx) return; if (e.what === 'dealers') { V = null; refresh(['dealers']); refreshOpenCard(); } }));
      var Pl = TN.pipeline;
      if (Pl && isFn(Pl.on)) { var offP = Pl.on(debounce(function () { if (ctx && ui.work) renderWork(false); }, 60)); if (isFn(offP)) offs.push(offP); }
      if (MCD.state && isFn(MCD.state.on)) {
        var offD = MCD.state.on('data', function () { if (ctx) refresh(['data']); });
        if (isFn(offD)) offs.push(offD);
        var offR = MCD.state.on('reset', function (e) { if (e && e.scope === 'filters') resetFilters(); });
        if (isFn(offR)) offs.push(offR);
      }
      var Po = MCD.policy;
      if (Po && isFn(Po.on)) { try { var offPo = Po.on(function () { if (ctx) { refresh(['policy']); if (MCD.tniCalc && MCD.tniCalc.isOpen()) MCD.tniCalc.refresh(); } }); if (isFn(offPo)) offs.push(offPo); } catch (e) { /* ignore */ } }
      var I = MCD.inst;
      if (I && I.scope && isFn(I.scope.on)) { try { var offS = I.scope.on(function () { var v = scopeGet(); if (st && v !== st.km) setKm(v); }); if (isFn(offS)) offs.push(offS); } catch (e) { /* ignore */ } }
      var onDist = function () { DISTC = new Map(); if (ctx) refresh(['distance']); };
      window.addEventListener('mcd:distance', onDist);
      offs.push(function () { window.removeEventListener('mcd:distance', onDist); });
      /* the policy round trip keeps the calculator's inputs only for "‹ Kembali ke Kredit TNI" (§4.5): any other way in drops them */
      later(function () { if (ctx && TN.calc.held() && !(MCD.tniCalc && MCD.tniCalc.isOpen())) TN.calc.drop(); }, 1500);
      c.registerCommands(function () {
        return [
          { label: 'Kalkulator KSM & KKB', run: function () { openCalc('ksm'); }, kw: 'kalkulator ksm kkb plafond angsuran' },
          { label: 'Kredit TNI · Pangkalan TNI', run: function () { goTab('units'); }, kw: 'pangkalan tni satuan markas perumahan' },
          { label: 'Kredit TNI · Dealer KKB', run: function () { goTab('dealers'); }, kw: 'dealer kkb mobil motor showroom' },
          { label: 'Kredit TNI · Tindak lanjut', run: function () { goTab('pipe'); }, kw: 'tindak lanjut ksm kkb' },
          { label: 'Kredit TNI · Cakupan 15 km', run: function () { setKm(15); }, kw: 'cakupan 15' },
          { label: 'Kredit TNI · Cakupan 30 km', run: function () { setKm(30); }, kw: 'cakupan 30' }
        ];
      });
      refresh(['*']);
    },
    update: function (derived, keys) {
      if (!ctx || !st) return;
      keys = keys || ['*'];
      if (keys.indexOf('distance') >= 0) DISTC = new Map();
      if (keys.some(function (k) { return k === '*' || k === 'data' || k === 'demo' || k === 'privacy.veil' || k === 'distance' || k === 'policy'; })) {
        refresh(keys);
        refreshOpenCard();
      }
    },
    unmount: function () {
      offs.forEach(function (f) { try { if (isFn(f)) f(); } catch (e) { /* ignore */ } });
      offs = [];
      timers.forEach(function (t) { clearTimeout(t); });
      timers = [];
      if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
      if (MCD.tniCalc && MCD.tniCalc.isOpen()) MCD.tniCalc.close('section');
      unregisterMap();
      if (ui && ui.work && ui.work.table && isFn(ui.work.table.destroy)) { try { ui.work.table.destroy(); } catch (e) { /* ignore */ } }
      if (ctx && isFn(ctx.filterChips)) { try { ctx.filterChips([]); } catch (e) { /* ignore */ } }
      if (st) { st.selKec = null; persist(); }
      ctx = null; page = null; ui = null; host = null; drawerSel = null; openSite = null;
    },
    layout: function () { return { posture: ID }; },
    onSelect: onSelect,
    workspace: workspace,
    summary: summary,
    cardFor: function (sel) { if (!ctx || !st) return null; var was = building; building = 'pin'; try { return showModel(sel); } catch (e) { return null; } finally { building = was; } },
    kecList: function (kid) { return ctx && st && kid ? kecModel(String(kid)) : null; },
    /**
     * Actions (§3.7, §2.4): tni:calc[:ksm|:kkb|:resume] · tni:tab:<units|dealers|pipe>[:half[:<sort>]] · tni:dealers:<on|off> ·
     * tni:scope:<15|30> · tni:kec:<id> · focus:site:<id> · focus:dealer:<id> · filters:reset. An unknown part opens the default.
     */
    onAction: function (action) {
      var a = String(action || '');
      if (!ctx || !st) return false;
      var m;
      if ((m = /^focus:site:(.+)$/.exec(a))) { if (!focusSite(m[1])) toast('Pangkalan ini tidak ditemukan.', 'warn'); return true; }
      if ((m = /^focus:dealer:(.+)$/.exec(a))) { focusDealer(m[1]); return true; }
      if (a === 'tni:calc:resume') { var K = MCD.tniCalc; if (!(K && K.resume({ host: host, onDealers: function () { goTab('dealers', { sort: 'near' }); } }))) openCalc('ksm'); return true; }
      if ((m = /^tni:calc(?::(ksm|kkb))?(?::.*)?$/.exec(a))) { openCalc(m[1] || 'ksm'); return true; }
      if ((m = /^tni:tab:([a-z]+)(?::(half|full|peek))?(?::([a-z]+))?/.exec(a))) { goTab(TABS.some(function (t) { return t.id === m[1]; }) ? m[1] : 'units', { sort: m[3], half: m[2] !== 'peek' }); return true; }
      if ((m = /^tni:dealers:(on|off)$/.exec(a))) { setDealerChip(m[1] === 'on'); return true; }
      if ((m = /^tni:scope:(15|30)$/.exec(a))) { setKm(+m[1]); return true; }
      if ((m = /^tni:kec:(\d\d\.\d\d\.\d\d)$/.exec(a))) { openKec(m[1]); return true; }
      if (a === 'filters:reset') { resetFilters(); return true; }
      if (/^tni:/.test(a)) { goTab('units'); return true; }
      return false;
    },
    onEscape: function () { var K = MCD.tniCalc; if (K && K.isOpen()) { K.close('esc'); return true; } return false; },
    onResize: function () { if (ctx) ctx.relayout(); },
    search: search,
    _test: {
      state: function () { return st; },
      view: function () { return computeView(); },
      dealerView: function () { return dealerView(); },
      siteModel: function (id, o) { return siteModel(TN.site(id), o); },
      dealerModel: function (id, o) { return dealerModel(TN.dealer(id), o); },
      kecModel: function (id) { return kecModel(String(id)); },
      kecPopup: function (id) { return kecPopup(String(id)); },
      mapLayers: function (ms) { return mapLayers(null, ms); },
      legend: function () { return legend(null, {}); },
      setKm: setKm, setDealerChip: setDealerChip, goTab: goTab, openCalc: openCalc, resetFilters: resetFilters,
      sortSites: function (by) { return sortSites(computeView().sites.slice(), by); },
      exportDealersCsv: function () { var dv = dealerView(); return dv ? TN.dealerCsv(dv.rows, { veiled: veil(), kecName: kecName }) : ''; },
      pipelineEditor: pipelineEditor, quickAdd: quickAdd, search: search, openMatra: openMatra
    }
  };
})(window.MCD = window.MCD || {});
