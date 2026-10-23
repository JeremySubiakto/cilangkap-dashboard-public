/* ==========================================================================
 * MCD.sections.campus: section 4 "Kampus (perguruan tinggi)" (key 4; docs/V6_SPEC.md §6, D9–D13, D17–D22;
 * COPY_STYLE_EN item 45 b and d, items 46–47 for the source and product logos).
 *
 * Universities, institutes, sekolah tinggi, politeknik and akademi from PDDikti, plus the design and course schools
 * outside PDDikti (D13), within 15 or 30 km of Mabes TNI (scope switch, 30 km by default, remembered per browser tab;
 * a view setting, never a filter, D4). The plays: payroll of dosen tetap (tendik is never a number, D11), kantin and
 * merchants around the campus (Livin’ Merchant QRIS, EDC), then student accounts.
 *
 * Layout C "Kartu bertahap" (docs/LAYOUT_V5C_SPEC.md):
 *   Sederhana  guide: scope, Jenis chips, "Filter lain ({n})" (Status, Kelas biaya), three cards ("Kampus dalam 30 km",
 *              "Sasaran payroll: dosen tetap", "Kampus untuk dikunjungi") and "Lihat daftar kampus".
 *   Detail     the same panel as the summary rail (workspace(), summary() with the scope pair) and the drawer
 *              "Daftar & grafik kampus" with four tabs: Daftar kampus (with the folded "Belum di peta ({n})", D20) ·
 *              Kecamatan · Merchant sekitar · Tindak lanjut.
 *   Cards      campus (selection kinds 'campus' and 'campusSite') with eight folds: Mahasiswa · Dosen (payroll) ·
 *              Kelas biaya · Kontak & identitas · Jarak & rute dari KCP · Merchant sekitar kampus · Produk sasaran ·
 *              Tindak lanjut; kecamatan ('cpKec', list first: "Kampus di {kecamatan}, mahasiswa terbanyak").
 *   Map        shields and triangles by jenis, colour by status, size by mahasiswa, empty outlines for other campus
 *              points (MCD.campus.sym); kecamatan outlines and chips "Beji · 3 kampus" (MCD.territory); kelas biaya
 *              badges only while that filter is on or from zoom 14 (MCD.map.tierSprite, when the map has it).
 * Shared pieces are feature-detected: MCD.inst (scope, contacts, tiers), MCD.seal (encrypted follow-ups through
 * MCD.campus.pipeline), MCD.windows (callouts and cards), MCD.distance (km and minutes from KCP), MCD.territory.
 * Engine: assets/js/campus-core.js (MCD.campus). Storage: mcd.campus.ui.v1 {v, sort, show} (no names), the scope in
 * sessionStorage mcd.scope.v1 (through MCD.inst.scope when present). Safe DOM only (MCD.util.el, textContent).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'campus';
  var UI_KEY = 'mcd.campus.ui.v1';
  var SCOPE_KEY = 'mcd.scope.v1';
  var TABS = [
    { id: 'list', label: 'Daftar kampus' },
    { id: 'kec', label: 'Kecamatan' },
    { id: 'merch', label: 'Merchant sekitar' },
    { id: 'pipe', label: 'Tindak lanjut' }
  ];
  var SLIDE_LABEL = 'Buka daftar & grafik';
  var SRC_LINE = 'Sumber: PDDikti (Kemdiktisaintek) · situs resmi kampus · Overture Maps (rilis 2026-09-23.1), OpenStreetMap · diambil 18 Okt 2026';
  var SRC_SHORT = 'PDDikti · OpenStreetMap · Overture · 18 Okt 2026';
  var SRC_AREAS = 'batas kecamatan © kontributor OpenStreetMap, BPS (2020)';
  var ATTRIBUTION = 'Kampus: PDDikti (Kemdiktisaintek) · © kontributor OpenStreetMap (ODbL) · © Overture Maps Foundation · batas wilayah: BPS melalui OCHA/HDX (CC BY 3.0 IGO)';
  var LOGO = {
    pddikti: { src: 'assets/brand/pddikti-logo.webp', alt: 'PDDikti (Pangkalan Data Pendidikan Tinggi)', w: 480, h: 206 },
    kopra: { src: 'assets/brand/kopra-logo.webp', alt: 'Kopra by Mandiri', w: 480, h: 245 },
    qris: { src: 'assets/brand/qris-logo.png', alt: 'QRIS', w: 360, h: 145 },
    lvm: { src: 'assets/brand/livin-merchant-icon.png', alt: 'Livin’ Merchant', w: 192, h: 192 }
  };
  var GM_BASE = 'https://www.google.com/maps/search/?api=1&query=';
  var GM_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  var ROUTE_LABEL = 'Rute di Google Maps';
  var ROUTE_TIP = 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.';
  var DIST_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  var DIST_NONE = 'Jarak belum dapat dihitung untuk titik ini.';
  var ENTRY_LINE = 'Kelas biaya menunjukkan besar biaya kuliah. Kemudahan kerja sama tetap perlu ditanyakan ke kampus atau yayasan.';
  var NOTE_PH = 'Tulis langkah kerja. Jangan tulis nomor pribadi atau data siswa.';
  var NO_KEY = 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.';
  var KANTIN_FLOOR = 'Kantin di dalam kampus jarang tercatat di peta publik, sehingga angka ini batas bawah. Tanyakan ke pengelola kampus.';
  var EMPTY_FILTER = 'Tidak ada kampus yang cocok dengan filter ini. Hapus salah satu filter.';
  var MEM_LINE = 'Tindak lanjut hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.';
  var BLOCKED_LINE = 'Daftar tindak lanjut tidak tersimpan di perangkat ini karena penyimpanan browser diblokir. Ekspor sebelum menutup halaman.';
  var QUOTA_LINE = 'Penyimpanan browser penuh. Ekspor daftar, lalu hapus entri lama.';
  var SEALED_TITLE = 'Terenkripsi dengan kata sandi dashboard.';
  /* MERCH_TOP 10: a list short enough to be on screen in the half-open drawer, so its entrance plays at once */
  var KL_MAX = 60, TOP_KEC = 12, MERCH_TOP = 10;
  var TOP_SORTS = [{ v: 'mhs', label: 'Mahasiswa terbanyak' }, { v: 'dosen', label: 'Dosen terbanyak' }, { v: 'near', label: 'Terdekat dari KCP' }];
  var STAGE_TONE = { baru: 'bad', kontak: 'mid', presentasi: 'mid', proposal: 'mid', pks: 'mid', onboarding: 'mid', aktif: 'ok', ditunda: 'none', gugur: 'none' };
  var TIER_WORD = { edc: 'Sasaran EDC', 'naik-edc': 'Naik ke EDC', lvm: 'Sasaran LVM', nasional: 'Jaringan nasional' };

  var C = null;                                  // MCD.campus
  var ctx = null, page = null, ui = null, st = null;
  var offs = [], mapOffs = [], handles = [], distSwitches = [];
  var V = null, drawerSel = null, drawerObs = null, flyNext = false, unbindTerr = null, building = null, pipeEds = {};
  var ownFocus = null, pendingFocus = null, hlTimer = 0, timers = [];
  var hl = { set: null, key: '' };

  /* ============================================================ helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function E() { return MCD.util.el.apply(null, arguments); }
  function S() { return MCD.util.el.svg.apply(null, arguments); }
  function fm() { return MCD.util.fmt; }
  function icon(n) { return ctx && isFn(ctx.icon) ? ctx.icon(n) : MCD.util.icon(n); }
  function clear(n) { return MCD.util.clear(n); }
  function isDeep() { return !!(ctx && ctx.view() === 'deep'); }
  function veil() { return !!(ctx && ctx.privacy() === 'veil'); }
  function sget(k, d) { try { var s = MCD.util.storage; return s ? s.get(k, d) : d; } catch (e) { return d; } }
  function sset(k, v) { try { var s = MCD.util.storage; return s ? s.set(k, v) : false; } catch (e) { return false; } }
  function debounce(fn, ms) { return MCD.util.debounce(fn, ms); }
  /** Indonesian has no plural: "3 kampus", "1.204 mahasiswa". */
  function count(n, word) { return fm().int(n) + ' ' + word; }
  function intOr(v) { return isNum(v) ? fm().int(v) : '—'; }
  function nodeOf(x) { return x && x.nodeType === 1 ? x : (x && x.el && x.el.nodeType === 1 ? x.el : null); }
  function later(fn, ms) { var t = setTimeout(function () { timers = timers.filter(function (x) { return x !== t; }); fn(); }, ms || 0); timers.push(t); return t; }
  function idle(fn, ms) {
    var w = typeof window !== 'undefined' ? window : null;
    later(function () {
      if (w && isFn(w.requestIdleCallback)) { try { w.requestIdleCallback(function () { fn(); }, { timeout: 2000 }); return; } catch (e) { /* timer below */ } }
      fn();
    }, ms || 0);
  }
  function admin() { var A = window.MCD_ADMIN_AREAS; return A && isFn(A.byId) ? A : null; }
  function territory() { var T = MCD.territory; return T && isFn(T.ready) && T.ready() ? T : null; }
  function requestRender() { if (MCD.map && isFn(MCD.map.requestRender)) MCD.map.requestRender(); }
  function uiTheme() { var t = ctx && isFn(ctx.theme) ? ctx.theme() : document.documentElement.getAttribute('data-theme'); return t === 'day' ? 'day' : 'night'; }
  function demoOn() { return !!(MCD.demo && isFn(MCD.demo.isOn) && MCD.demo.isOn()); }
  function guard(b) { if (b && MCD.demo && isFn(MCD.demo.guard)) MCD.demo.guard(b); return b; }
  function toast(m, k) { if (ctx) ctx.toast(m, k || null); }
  function copy(text) {
    var n = typeof navigator !== 'undefined' ? navigator : null;
    if (n && n.clipboard && isFn(n.clipboard.writeText)) return n.clipboard.writeText(text);
    return Promise.reject(new Error('clipboard'));
  }
  function download(name, text, type) {
    try {
      var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = E('a', { href: url, download: name, hidden: true });
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  }
  function ymd(d) { var u = MCD.util.date; try { return u && u.ymd ? u.ymd(d || new Date()) : ''; } catch (e) { return ''; } }

  /* ---- v5 workspace (MCD.windows, SHELL lane; feature-detected) */
  function WS() { var W0 = MCD.windows; return W0 && typeof W0 === 'object' ? W0 : null; }
  function adopted() { var w = ui && ui.work && ui.work.el; return !!(w && w.classList && w.classList.contains('ws-drawer')); }
  function syncAdopted() {
    var w = ui && ui.work && ui.work.el;
    if (!w) return;
    var on = adopted();
    if (on === !!w.__cpAdopted) return;
    w.__cpAdopted = on;
    if (on) { w.removeAttribute('data-slideover'); w.removeAttribute('data-slideover-label'); }
    else { w.setAttribute('data-slideover', ''); w.setAttribute('data-slideover-label', SLIDE_LABEL); }
  }

  /* ---- small controls */
  function btn(label, iconName, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['btn', cls || 'btn--secondary'], title: title || null }, iconName ? icon(iconName) : null, E('span', { text: label }));
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function link(label, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['cp-link', cls], text: label, title: title || null });
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  /**
   * A radio group (← → move, Tab lands on the checked option). Short options use the shared .seg look; kind 'chips'
   * gives quiet chips that wrap, for long option names (the "Kampus untuk dikunjungi" sort, the product filter).
   * Built once: set(v) moves the check, label(v, text) changes an option's words, so focus never drops (§10).
   */
  function seg(label, opts, onPick, extra, kind) {
    var asChips = kind === 'chips';
    var wrap = E('div', { class: asChips ? ['cp-rchips', extra] : ['seg', 'cp-seg', extra], role: 'radiogroup', aria: { label: label } });
    /* an option may carry a mark after its words (o.icon); its words then live in their own span, so label() never
       drops the mark */
    var words = [];
    var btns = opts.map(function (o) {
      var t = o.icon ? E('span', { class: 'cp-rchip__t', text: o.label }) : null;
      var b = E('button', { type: 'button', class: (asChips ? 'chip cp-rchip' : 'seg__opt') + (o.icon ? ' has-mark' : ''), role: 'radio', aria: { checked: 'false' }, title: o.title || o.label, attrs: { tabindex: '-1' } }, t || o.label, o.icon || null);
      words.push(t || b);
      b.addEventListener('click', function () { onPick(o.v); });
      wrap.appendChild(b);
      return b;
    });
    wrap.addEventListener('keydown', function (e) {
      var keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (keys.indexOf(e.key) < 0) return;
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
      },
      label: function (v, text) {
        for (var i = 0; i < opts.length; i++) if (String(opts[i].v) === String(v)) { if (words[i].textContent !== text) words[i].textContent = text; return; }
      }
    };
  }
  /** A group of toggle chips (button.chip[aria-pressed]) with a count each: "Universitas dan institut · 159". */
  function chips(label, items, onToggle, cls) {
    var wrap = E('div', { class: ['cp-chips', cls], role: 'group', aria: { label: label } });
    var map = {};
    items.forEach(function (it) {
      var cnt = E('span', { class: 'chip__count' });
      var b = E('button', { type: 'button', class: 'chip cp-chip', aria: { pressed: 'true' }, title: it.title || null }, E('span', { class: 'cp-chip__t', text: it.label }), cnt);
      b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') === 'true') return; onToggle(it.id); });
      wrap.appendChild(b);
      map[it.id] = { b: b, cnt: cnt, title: it.title || '' };
    });
    return {
      el: wrap,
      set: function (on, counts, o) {
        o = o || {};
        Object.keys(map).forEach(function (id) {
          var m = map[id], pressed = on[id] !== false;
          m.b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          m.cnt.textContent = counts && isNum(counts[id]) ? ' · ' + fm().int(counts[id]) : '';
          var last = o.keepOne && pressed && Object.keys(map).filter(function (k) { return on[k] !== false; }).length === 1;
          m.b.disabled = !!o.disabled;
          if (last) { m.b.setAttribute('aria-disabled', 'true'); m.b.title = 'Paling sedikit satu jenis tampil.'; }
          else { m.b.removeAttribute('aria-disabled'); m.b.title = m.title; }
        });
      }
    };
  }
  function exhibit(o) {
    var titleEl = E('h3', { class: 'exhibit__title cp-ex__title' });
    var subEl = E('p', { class: 'exhibit__sub cp-ex__sub' });
    var body = E('div', { class: 'cp-ex__body' });
    var src = E('p', { class: 'exhibit__source cp-ex__src' });
    var el = E('article', { class: ['exhibit', 'cp-ex', o.cls] }, o.eyebrow ? E('p', { class: 'cp-ex__eyebrow', text: o.eyebrow }) : null, titleEl, subEl, body, src);
    return { el: el, title: titleEl, sub: subEl, body: body, src: src,
      set: function (t, s, so) { titleEl.textContent = t || ''; subEl.textContent = s || ''; src.textContent = so || ''; subEl.hidden = !s; src.hidden = !so; } };
  }
  /** A source or product mark on a white rounded tile (items 46–47): never recoloured or stretched. */
  function logo(k, cls) {
    var L = LOGO[k];
    return E('span', { class: ['cp-logo', 'cp-logo--' + k, cls] }, E('img', { src: L.src, alt: L.alt, width: L.w, height: L.h, decoding: 'async', loading: 'lazy' }));
  }
  /** A mark placed right beside the words that already name it ("QRIS kantin"): hidden from screen readers there. */
  function markBesideWords(n) { if (n) n.setAttribute('aria-hidden', 'true'); return n; }
  function kv(k, v, title) { return E('div', { class: 'dd-kv', title: title || null }, E('span', { class: 'dd-kv__k', text: k }), E('span', { class: 'dd-kv__v' }, v)); }
  function note(text, cls) { return E('p', { class: ['cp-note', cls], text: text }); }
  /** A card fold: .dd-blk with data-fold, data-preview and data-open (MCD.windows reads them). */
  function blk(title, kids, cls, o) {
    var s = E('section', { class: ['dd-blk', 'cp-dd', cls] }, E('h3', { class: 't-eyebrow dd-blk__t', text: title }), kids);
    if (o) {
      if (o.id) s.setAttribute('data-fold', o.id);
      if (o.preview) s.setAttribute('data-preview', o.preview);
      if (o.open != null) s.setAttribute('data-open', o.open ? '1' : '0');
    }
    return s;
  }

  /* ---- Google Maps links (coordinates only, opened in a new tab on a click) */
  function gmapsUrl(o) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && isFn(G.url)) return G.url(o);
    var lat = Number(o && o.lat), lon = Number(o && o.lon);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return GM_BASE + (Math.round(lat * 1e5) / 1e5) + ',' + (Math.round(lon * 1e5) / 1e5);
  }
  function routeUrl(lon, lat) {
    var D = MCD.distance;
    if (D && isFn(D.directionsUrl)) { try { var u = D.directionsUrl(lon, lat); if (u) return String(u); } catch (e) { /* own URL below */ } }
    lon = Number(lon); lat = Number(lat);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    var b = (MCD.config && MCD.config.branch) || {}, bl = isNum(b.lat) ? b.lat : -6.33203, bo = isNum(b.lon) ? b.lon : 106.90989;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + bl.toFixed(5) + ',' + bo.toFixed(5) + '&destination=' + lat.toFixed(5) + ',' + lon.toFixed(5) + '&travelmode=driving';
  }
  function extLink(href, text, title, cls) {
    return E('a', { class: ['cp-ext', cls], href: href, target: '_blank', rel: 'noopener noreferrer', attrs: { referrerpolicy: 'no-referrer' }, title: title || null },
      E('span', { text: text }), icon('external'), E('span', { class: 'sr-only', text: ', terbuka di tab baru' }));
  }

  /* ============================================================ scope (D3, D4) */

  var SCOPE_MEM = null;
  /** 5 | 15 | 30 for any value; 5 km is the default since 21 Oct 2026. */
  function scopeOf(v) { v = +v; return v === 15 || v === 30 ? v : 5; }
  function scopeApi() { var I = MCD.inst; return I && I.scope && isFn(I.scope.get) && isFn(I.scope.set) ? I.scope : null; }
  function scopeGet() {
    var A = scopeApi();
    if (A) { try { return scopeOf(A.get('campus', 5)); } catch (e) { /* own below */ } }
    if (SCOPE_MEM != null) return SCOPE_MEM;
    try {
      var raw = window.sessionStorage.getItem(SCOPE_KEY), o = raw ? JSON.parse(raw) : null;
      if (o && o.v === 1 && (o.campus === 5 || o.campus === 15 || o.campus === 30)) return o.campus;
    } catch (e) { /* blocked: memory */ }
    return 5;
  }
  function scopeSet(v) {
    v = scopeOf(v);
    var A = scopeApi();
    if (A) { try { A.set('campus', v); return; } catch (e) { /* own below */ } }
    SCOPE_MEM = v;
    try {
      var raw = window.sessionStorage.getItem(SCOPE_KEY), o = raw ? JSON.parse(raw) : null;
      if (!o || o.v !== 1 || typeof o !== 'object') o = { v: 1 };
      o.campus = v;
      window.sessionStorage.setItem(SCOPE_KEY, JSON.stringify(o));
    } catch (e) { /* the value stays in memory */ }
  }
  /** One scope control (§3.1): MCD.inst.scopeSwitch when present (it keeps every copy in sync), else the same radiogroup here. */
  function scopeSwitch(vertical) {
    var I = MCD.inst;
    if (I && isFn(I.scopeSwitch)) {
      try {
        var r = I.scopeSwitch({ section: 'campus', value: st.km, vertical: !!vertical, wide: true, label: false,
          onChange: function (v) { setKm(+v, { quiet: true }); },
          announce: function (v) { return scopeWords(v); } });
        var n = nodeOf(r);
        if (n) return { el: n, set: function (v) { if (r && isFn(r.set)) r.set(v); } };
      } catch (e) { /* own below */ }
    }
    var s = seg('Cakupan jarak dari Mabes TNI', [5, 15, 30].map(function (v) { return { v: v, label: v + ' km', title: 'Kampus dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.' }; }),
      function (v) { setKm(v); }, 'scope cp-scope' + (vertical ? ' is-vertical' : ''));
    s.el.title = 'Kampus dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.';
    return s;
  }
  function announce(text) { if (ui && ui.panel && ui.panel.live) ui.panel.live.textContent = text; }
  /** "Cakupan 15 km. 187 kampus tampil." (§10): PDDikti campuses only; design and course schools are counted apart (D13). */
  function scopeWords(v) { computeView(); return 'Cakupan ' + v + ' km. ' + count(V ? V.n : 0, 'kampus') + ' tampil.'; }
  function setKm(v, o) {
    v = scopeOf(v);
    if (!st) return;
    var changed = v !== st.km;
    st.km = v;
    scopeSet(v);
    if (!changed) { if (ui && ui.panel && ui.panel.scope) ui.panel.scope.set(v); return; }
    refresh(['scope']);
    applyZones();
    if (!(o && o.camera === false)) cameraForKm();
    if (!(o && o.quiet)) announce(scopeWords(v));     /* the shared switch says it itself */
    /* the outer road preload has one owner, the shell (app.js probeOuter: afterPaint, 1 s, idle, once per session) */
  }
  function cameraForKm() { var M = MCD.map; if (M && isFn(M.preset)) { try { M.preset(st.km === 5 ? 'cp5' : st.km === 15 ? 'cp15' : 'ring30'); } catch (e) { /* the map keeps its view */ } } }
  /**
   * Zones (§3.3, §6.3): the 103-kecamatan focus at 30 km, kecamatan15 at 5 and 15 km. The call names its section, so it holds
   * from the first frame of Kampus even while the map still shows the section before it. The answer of setZones() is
   * not read: during a mount it describes the previous section's zones (fix round 19 Oct 2026: reading it as "mode not
   * supported" replaced the 30 km kecamatan set with a plain circle on every entry from another section).
   */
  function zoneSpec() { return !st || st.km <= 15 ? { mode: 'kecamatan15' } : { mode: 'kecamatan', km: 30 }; }
  function applyZones() {
    var M = MCD.map;
    if (!M || !isFn(M.setZones)) return;
    try { M.setZones(Object.assign({ section: ID }, zoneSpec())); } catch (e) { /* the map keeps its zones */ }
  }

  /* ============================================================ state */

  function defaults() {
    return {
      km: 5, show: { univ: true, st: true, desain: true }, status: { negeri: true, swasta: true, kedinasan: true },
      tiers: { premium: true, atas: true, menengah: true, reguler: true, unknown: true },
      sort: 'mhs', topSort: 'mhs', tab: 'list', q: '', kecBy: 'mhs', kecAll: false, merchAll: false,
      pipeStage: '', pipeProd: '', moreOpen: false, unplacedOpen: false, workOpen: false, selKec: null
    };
  }
  /** Remembered per browser: the list order and the jenis shown (mcd.campus.ui.v1, no names). Status and kelas biaya
      filters live in memory only (UX_FIX_PLAN D14); the scope comes from the tab's session (D4). */
  function loadState() {
    var s = defaults(), saved = sget(UI_KEY, null);
    if (saved && saved.v === 1) {
      if (/^(mhs|dosen|near|merchant)$/.test(saved.sort)) s.sort = saved.sort;
      if (saved.show && typeof saved.show === 'object') ['univ', 'st', 'desain'].forEach(function (k) { if (saved.show[k] === false) s.show[k] = false; });
      if (!s.show.univ && !s.show.st && !s.show.desain) s.show = { univ: true, st: true, desain: true };
    }
    s.km = scopeGet();
    return s;
  }
  var saveUi = function () {};
  function filterCount() {
    if (!st) return 0;
    var a = ['negeri', 'swasta', 'kedinasan'].some(function (k) { return st.status[k] === false; }) ? 1 : 0;
    var b = ['premium', 'atas', 'menengah', 'reguler', 'unknown'].some(function (k) { return st.tiers[k] === false; }) ? 1 : 0;
    return a + b;
  }
  function tierFilterOn() { return !!st && ['premium', 'atas', 'menengah', 'reguler', 'unknown'].some(function (k) { return st.tiers[k] === false; }); }
  function resetFilters() {
    st.status = { negeri: true, swasta: true, kedinasan: true };
    st.tiers = { premium: true, atas: true, menengah: true, reguler: true, unknown: true };
    refresh(['filters']);
  }
  function toggleShow(id) {
    var on = st.show[id] !== false;
    var others = Object.keys(st.show).filter(function (k) { return k !== id && st.show[k] !== false; }).length;
    if (on && !others) { toast('Paling sedikit satu jenis tampil.'); return; }
    st.show[id] = !on;
    saveUi();
    refresh(['filters']);
  }
  function toggleStatus(id) { st.status[id] = st.status[id] === false; refresh(['filters']); }
  var TIER_IDS = ['premium', 'atas', 'menengah', 'reguler', 'unknown'];
  function tierOnIds() { return TIER_IDS.filter(function (k) { return !st || st.tiers[k] !== false; }); }
  function tierStateWord() { var t = tierState(); return t === 'ready' ? 'ready' : t === 'error' ? 'error' : 'loading'; }
  /** The shared filter reports the chips that stay on (an array of tier ids). */
  function setTiers(v) {
    var on = Array.isArray(v) ? v : TIER_IDS;
    TIER_IDS.forEach(function (k) { st.tiers[k] = on.indexOf(k) >= 0; });
    refresh(['filters']);
  }
  function toggleTier(id) {
    if (tierState() !== 'ready') { loadTiers(true); return; }
    st.tiers[id] = st.tiers[id] === false;
    refresh(['filters']);
  }
  /** Active filters as chips in the section header (ctx.filterChips): the scope is not a filter (D4). */
  function syncChips() {
    if (!ctx || !isFn(ctx.filterChips)) return;
    var out = [];
    if (['negeri', 'swasta', 'kedinasan'].some(function (k) { return st.status[k] === false; })) {
      var on = C.STATUSES.filter(function (s) { return st.status[s.id] !== false; }).map(function (s) { return s.label; });
      out.push({ label: 'Status: ' + (on.length ? on.join(', ') : 'tidak ada'), onClear: function () { st.status = { negeri: true, swasta: true, kedinasan: true }; refresh(['filters']); } });
    }
    if (tierFilterOn()) {
      var tOn = C.TIERS.filter(function (t) { return st.tiers[t.id] !== false; }).map(function (t) { return t.label; });
      out.push({ label: 'Kelas biaya: ' + (tOn.length ? tOn.join(', ') : 'tidak ada'), onClear: function () { st.tiers = { premium: true, atas: true, menengah: true, reguler: true, unknown: true }; refresh(['filters']); } });
    }
    try { ctx.filterChips(out, { onClearAll: resetFilters }); } catch (e) { /* the shell has its own guard */ }
  }

  /* ============================================================ data, tiers, distances */

  function tierState() { return C ? C.state('institution-tiers') : 'idle'; }
  function loadTiers(now) {
    if (!C || tierState() === 'ready') return;
    var go = function () {
      C.ensureTiers().then(function () { if (ctx) { V = null; refresh(['tiers']); refreshOpenCard(); } });
      if (ctx) renderPanel();
    };
    if (now) go(); else idle(go, 1500);
  }
  function startData() {
    if (!C) return;
    if (C.ready()) return;
    var p = C.ensure();
    renderAll();
    p.then(function (ok) {
      if (!ctx) return;
      V = null;
      refresh(['*']);
      if (ok) { if (isDeep() && ui.work) renderWork(true); if (pendingFocus != null) later(runPendingFocus, 60); }
      if (ctx && isFn(ctx.requestRender)) ctx.requestRender(['ext']);
    });
  }
  function startTerritory() {
    var T = MCD.territory;
    if (!T || !isFn(T.ensureData) || (isFn(T.ready) && T.ready())) return;
    T.ensureData().then(function () { if (!ctx) return; V = null; refresh(['*']); }, function () { /* the kecamatan names come from the boundary file */ });
  }

  var DISTC = new Map();
  function distApi() { var D = MCD.distance; return D && isFn(D.of) ? D : null; }
  function peakOn() { var D = MCD.distance; try { return !!(D && isFn(D.peakOn) && D.peakOn()); } catch (e) { return false; } }
  function noTollOn() { var D = MCD.distance; try { return !!(D && isFn(D.noTollOn) && D.noTollOn()); } catch (e) { return false; } }
  /** Road distance and minutes from KCP for a point {lon, lat, kecamatanId, kelurahanId} (row or campus point), cached. */
  function distOf(p) {
    if (!p || !isNum(p.lon) || !isNum(p.lat)) return null;
    var key = p.lon.toFixed(5) + ',' + p.lat.toFixed(5);
    if (DISTC.has(key)) return DISTC.get(key);
    var A = distApi(), r = null;
    if (A) { try { r = A.of(p.lon, p.lat, { kelurahanId: p.kelurahanId || null, kecamatanId: p.kecamatanId || null }); } catch (e) { r = null; } }
    if (!r && isNum(p.km)) r = { km: p.km, min: null, minPeak: null, precision: 'garis-lurus', source: 'garis', noToll: null };
    DISTC.set(key, r || null);
    return r || null;
  }
  function minutesWords(m) { m = Math.max(1, Math.round(m)); return '± ' + (m >= 60 ? Math.floor(m / 60) + ' jam' + (m % 60 ? ' ' + (m % 60) + ' menit' : '') : m + ' menit'); }
  function kmWords(km) { return km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m' : fm().num(km, 1) + ' km'; }
  /** "10,9 km · ± 31 menit" (MCD.distance.format); parts 'cell' → {km, min} without "(jam sibuk, tanpa tol)". */
  function distText(r, parts) {
    var A = MCD.distance;
    function cell(o) { if (parts === 'cell' && o.min) o.min = o.min.replace(/\s*\((?:jam sibuk|tanpa tol)[^)]*\)\s*$/, ''); return o; }
    if (r && A && isFn(A.format)) {
      try {
        var t = A.format(r);
        if (t) {
          if (!parts) return t;
          if (r.pending) return { km: t, min: '' };
          var cut = t.indexOf(' · ');
          return cell(cut >= 0 ? { km: t.slice(0, cut), min: t.slice(cut + 3) } : (/^±/.test(t) ? { km: '', min: t } : { km: t, min: '' }));
        }
      } catch (e) { /* own words below */ }
    }
    if (!r || !isNum(r.km)) return parts ? { km: '—', min: '' } : '—';
    var kmT = kmWords(r.km), minT = isNum(r.min) ? minutesWords(r.min) : (r.source === 'garis' ? 'garis lurus' : '');
    if (parts) return cell({ km: kmT, min: minT });
    return kmT + (minT ? ' · ' + minT : '');
  }
  function distTip(r) {
    var A = MCD.distance;
    if (A && isFn(A.tip)) { try { var t = A.tip(r); if (t) return t; } catch (e) { /* own words below */ } }
    if (!r) return DIST_NONE;
    return r.source === 'garis' ? 'Jarak garis lurus dari KCP Jakarta Cilangkap. Waktu tempuh belum dapat dihitung.' : DIST_TIP;
  }
  function distShort(r) { var p = distText(r, 'cell'); return p.km && p.km !== '—' ? p.km + (p.min ? ' · ' + p.min : '') : '—'; }
  /** Minutes used to sort "Terdekat dari KCP" (the motorbike route when that switch is on); Infinity when unknown. */
  function distSortVal(p) {
    var r = distOf(p);
    if (!r) return Infinity;
    var nt = noTollOn() && r.noToll && isNum(r.noToll.min) ? r.noToll.min : null;
    if (isNum(nt)) return nt;
    if (isNum(r.min)) return r.min;
    return isNum(r.km) ? r.km * 3 + 1e4 : Infinity;
  }
  function distModeWords() { return [peakOn() ? 'jam sibuk' : null, noTollOn() ? 'tanpa tol' : null].filter(Boolean).join(', '); }
  /** The one shared "Waktu tempuh" control (MCD.distance.controls) beside a list; nothing when it is missing. */
  function distToggles() {
    var D = MCD.distance, c = null;
    if (D && isFn(D.controls)) { try { c = D.controls({ compact: true }); } catch (e) { c = null; } }
    var api = { el: E('div', { class: 'cp-distsw' }, c), sync: function () { if (c && isFn(c.sync)) c.sync(); } };
    distSwitches.push(api);
    return api;
  }
  function onDistance() {
    DISTC = new Map();
    if (!ctx) return;
    distSwitches.forEach(function (s) { try { s.sync(); } catch (e) { /* ignore */ } });
    renderPanel();
    if (ui && ui.work && st.tab === 'list') renderList();
    refreshOpenCard();
  }

  /* ============================================================ view model */

  function computeView() {
    if (!C || !C.ready() || !st) { V = null; return null; }
    var tierReady = tierState() === 'ready';
    var sig = [st.km, JSON.stringify(st.show), JSON.stringify(st.status), JSON.stringify(st.tiers), tierReady ? 1 : 0, territory() ? 1 : 0].join('|');
    if (V && V.cpSig === sig && V.D === C.data()) return V;
    var v = C.view({ km: st.km, show: st.show, status: st.status, tiers: st.tiers, tierId: tierReady ? C.tierId : function () { return undefined; } });
    if (!v) { V = null; return null; }
    v.cpSig = sig;
    v.D = C.data();
    v.specs = new Map();
    v.rows.forEach(function (r) { v.specs.set(r.id, C.sym.spec(r)); });
    /* larger symbols first, so the small ones stay visible on top */
    v.draw = v.rows.slice().sort(function (a, b) { return (v.specs.get(b.id).step - v.specs.get(a.id).step) || (b.km - a.km); });
    v.ids = new Set(v.rows.map(function (r) { return r.id; }));
    v.unplaced = C.unplaced();
    v.feeN = C.feeCount(v.rows);
    V = v;
    return v;
  }

  /* ============================================================ symbols and chips */

  function symChip(r, hollow, cls) { return C && r ? C.sym.chip(C.sym.spec(r, { hollow: !!hollow }), uiTheme(), { title: C.sym.words(r), cls: cls }) : null; }
  function symLabel(r) { return E('span', { class: 'cp-symlabel' }, symChip(r), E('span', { text: C.sym.words(r) })); }
  /** "▂▄▆█ Atas": the kelas biaya chip (MCD.inst.tierChip when present). Filled bars = from the fee or the type; outline = perkiraan. */
  function barsSvg(level, filled) {
    var svg = S('svg', { class: 'cp-bars', width: 15, height: 12, viewBox: '0 0 15 12', 'aria-hidden': 'true', focusable: 'false' });
    for (var i = 0; i < 4; i++) {
      var h = 3 + i * 3, on = i < level;
      svg.appendChild(S('rect', { x: (0.5 + i * 3.6).toFixed(1), y: (11.5 - h).toFixed(1), width: '2.6', height: String(h), rx: '0.6', class: on ? (filled ? 'is-on' : 'is-est') : 'is-off' }));
    }
    return svg;
  }
  function tierOf(r) { return C && r ? C.tierOf(r.id) : undefined; }
  function tierChip(t) {
    if (!t) return null;
    var I = MCD.inst;
    if (I && isFn(I.tierChip)) { try { var n = nodeOf(I.tierChip(t)); if (n) return n; } catch (e) { /* own below */ } }
    var lvl = t.level || 0, filled = t.basis !== 'perkiraan';
    return E('span', { class: 'cp-tier cp-tier--' + (t.tier || 'unknown'), title: t.basisWords || t.label, aria: { label: 'Kelas biaya ' + t.label + (t.basisWords ? ', ' + t.basisWords.charAt(0).toLowerCase() + t.basisWords.slice(1) : '') } },
      lvl ? barsSvg(lvl, filled) : null, E('span', { text: t.label }));
  }

  /* ============================================================ panel: guide (Sederhana) and rail (Detail) */

  function buildPanel(body) {
    var p = {};
    p.live = E('p', { class: 'sr-only', aria: { live: 'polite' }, attrs: { role: 'status' } });
    p.status = E('div', { class: 'cp-load', hidden: true });
    p.openWork = isDeep() ? btn(SLIDE_LABEL, 'chev-r', function () { openWork(true); }, 'btn--secondary btn--lg cp-openwork') : null;
    p.scope = scopeSwitch(false);
    p.jenis = chips('Jenis', C.GROUPS, toggleShow, 'cp-chips--jenis');
    p.status2 = chips('Status', C.STATUSES, toggleStatus, 'cp-chips--status');
    p.tiers = chips('Kelas biaya', C.TIERS, toggleTier, 'cp-chips--tier');
    p.tierLine = E('div', { class: 'cp-tierstate', aria: { live: 'polite' } });
    p.tierHelp = E('button', { type: 'button', class: 'tipbtn cp-help', title: 'Arti kelas biaya', aria: { label: 'Arti kelas biaya', haspopup: 'dialog' } }, E('span', { aria: { hidden: 'true' }, text: '?' }));
    p.tierHelp.addEventListener('click', function () { openTierHelp(); });
    p.moreBtn = E('button', { type: 'button', class: 'cp-morebtn', aria: { expanded: st.moreOpen ? 'true' : 'false', controls: 'cp-more' } }, E('span', { class: 'cp-morebtn__t' }), icon('chev-d'));
    p.clear = btn('Hapus filter', 'reset', function () { resetFilters(); }, 'btn--ghost btn--bar cp-clear');
    /* the shared kelas biaya filter of MCD.inst when the INSTITUSI lane is loaded (same chips, entry line and "?" tip in
       Sekolah and Kampus); the same five chips here otherwise */
    var I = MCD.inst;
    if (I && isFn(I.tierFilter)) {
      try {
        p.tierInst = nodeOf(I.tierFilter({ kind: 'kampus', counts: tierCounts(), value: tierOnIds(), state: tierStateWord(),
          onChange: function (v) { setTiers(v); }, onRetry: function () { loadTiers(true); }, onLoad: function () { if (ctx) { V = null; refresh(['tiers']); } } }));
      } catch (e) { p.tierInst = null; }
    }
    p.more = E('div', { class: 'cp-more', id: 'cp-more', hidden: !st.moreOpen },
      E('div', { class: 'cp-fg' }, E('p', { class: 'cp-fg__l', text: 'Status' }), p.status2.el),
      p.tierInst ? E('div', { class: 'cp-fg cp-fg--inst' }, p.tierInst)
        : E('div', { class: 'cp-fg' }, E('div', { class: 'cp-fg__head' }, E('p', { class: 'cp-fg__l', text: 'Kelas biaya' }), p.tierHelp), p.tiers.el, p.tierLine,
          E('p', { class: 'cp-entry', text: ENTRY_LINE })),
      p.clear);
    p.moreBtn.addEventListener('click', function () { st.moreOpen = !st.moreOpen; p.more.hidden = !st.moreOpen; p.moreBtn.setAttribute('aria-expanded', st.moreOpen ? 'true' : 'false'); if (st.moreOpen) loadTiers(true); });
    p.cards = E('div', { class: 'cp-cards', role: 'list' });
    p.c1 = card('cp-card--count');
    p.c2 = card('cp-card--pay');
    p.c3 = buildTop();
    [p.c1, p.c2, p.c3].forEach(function (c) { p.cards.appendChild(c.el); });
    p.src = E('p', { class: 'cp-src' }, logo('pddikti'), E('span', { text: 'Data mahasiswa dan dosen: PDDikti · titik: OpenStreetMap, Overture · 18 Okt 2026' }));
    p.el = E('div', { class: 'cp-panel', aria: { busy: 'false' } },
      p.openWork, p.live, p.status,
      E('div', { class: 'cp-row' }, E('span', { class: 'cp-row__l', text: 'Cakupan' }), p.scope.el),
      E('div', { class: 'cp-row' }, E('span', { class: 'cp-row__l', text: 'Jenis' }), p.jenis.el),
      p.moreBtn, p.more, p.cards, p.src);
    body.insertBefore(p.el, body.firstChild);
    ui.panel = p;
  }
  /** The counts of the shared kelas biaya filter: the five chips, plus `biaya` (official fees found in this scope), which
      its "?" tip turns into "Biaya resmi ditemukan untuk {a} kampus. Selebihnya dari jenis kampus atau perkiraan." (§4.2) */
  function tierCounts() {
    if (!V || tierState() !== 'ready') return null;
    return Object.assign({}, V.chips.tier, { biaya: V.feeN });
  }
  function card(cls) {
    var head = E('p', { class: 'cp-card__t' }), big = E('p', { class: 'cp-card__v' }), lines = E('div', { class: 'cp-card__lines' });
    var el = E('article', { class: ['cp-card', cls], role: 'listitem' }, E('div', { class: 'cp-card__body' }, head, big, lines));
    return { el: el, head: head, big: big, lines: lines };
  }
  function buildTop() {
    var c = card('cp-card--top');
    c.big.remove();
    c.sort = seg('Urutkan kampus', TOP_SORTS, function (v) { st.topSort = v; renderTop(c); }, 'cp-rchips--top', 'chips');
    c.sw = distToggles();
    c.list = E('ul', { class: 'cp-mini' });
    c.more = link('Lihat semua di daftar', function () { st.sort = st.topSort; saveUi(); goTab('list'); });
    c.lines.appendChild(c.sort.el);
    c.lines.appendChild(c.sw.el);
    c.lines.appendChild(c.list);
    c.lines.appendChild(E('p', { class: 'cp-card__foot' }, c.more));
    return c;
  }
  function renderLoad(host) {
    if (!host) return;
    clear(host);
    var s = C ? C.state('campuses') : 'error';
    if (s === 'ready') { host.hidden = true; return; }
    host.hidden = false;
    host.classList.toggle('is-error', s === 'error');
    if (s === 'error') {
      host.appendChild(E('p', { class: 'cp-load__t', text: 'Daftar kampus tidak dapat dimuat. Coba lagi.' }));
      host.appendChild(btn('Coba lagi', 'reset', function () { startData(); }, 'btn--secondary'));
    } else {
      host.appendChild(E('span', { class: 'cp-load__bar', aria: { hidden: 'true' } }));
      host.appendChild(E('p', { class: 'cp-load__t', text: 'Memuat daftar kampus…' }));
    }
  }
  function renderPanel() {
    var p = ui && ui.panel;
    if (!p || !st) return;
    computeView();
    p.scope.set(st.km);
    renderLoad(p.status);
    p.el.setAttribute('aria-busy', C.state('campuses') === 'loading' ? 'true' : 'false');
    var nf = filterCount();
    p.moreBtn.querySelector('.cp-morebtn__t').textContent = 'Filter lain' + (nf ? ' (' + nf + ')' : '');
    p.clear.disabled = !nf;
    var ts = tierState();
    if (p.tierInst && p.tierInst.mcdTier && isFn(p.tierInst.mcdTier.update)) {
      try { p.tierInst.mcdTier.update({ counts: tierCounts(), value: tierOnIds(), state: tierStateWord() }); } catch (e) { /* the shared filter keeps its look */ }
    }
    p.jenis.set(st.show, V ? V.chips.group : null, { keepOne: true });
    p.status2.set(st.status, V ? V.chips.status : null);
    p.tiers.el.hidden = ts === 'error';
    p.tiers.set(st.tiers, V && ts === 'ready' ? V.chips.tier : null, { disabled: ts !== 'ready' });
    clear(p.tierLine);
    if (ts === 'error') {
      p.tierLine.appendChild(E('p', { class: 'cp-note', text: 'Kelas biaya tidak dapat dimuat. Coba lagi.' }));
      p.tierLine.appendChild(btn('Coba lagi', 'reset', function () { loadTiers(true); }, 'btn--ghost btn--bar'));
    } else if (ts !== 'ready') p.tierLine.appendChild(E('p', { class: 'cp-note', text: 'Memuat kelas biaya…' }));
    p.cards.hidden = !V;
    if (!V) return;
    renderCount(p.c1);
    renderPay(p.c2);
    renderTop(p.c3);
  }
  function renderCount(c) {
    var f = fm(), km = st.km;
    c.head.textContent = 'Kampus dalam ' + km + ' km';
    c.big.textContent = f.int(V.n);
    c.big.title = count(V.n, 'perguruan tinggi') + ' dari PDDikti dalam ' + km + ' km.\n' + count(V.unplaced.length, 'perguruan tinggi') + ' belum di peta.';
    clear(c.lines);
    if (!V.rows.length) { c.lines.appendChild(emptyFilter()); return; }
    var b = V.byStatus, tot = b.negeri + b.swasta + b.kedinasan;
    var parts = [{ k: 'negeri', label: 'Negeri', v: b.negeri }, { k: 'swasta', label: 'Swasta', v: b.swasta }, { k: 'kedinasan', label: 'Kedinasan', v: b.kedinasan }].filter(function (x) { return x.v > 0; });
    if (tot) {
      var bar = E('div', { class: 'cp-split__bar', role: 'img', aria: { label: parts.map(function (x) { return x.label + ' ' + x.v; }).join(', ') } });
      parts.forEach(function (x) { bar.appendChild(E('i', { class: 'is-' + x.k, style: { width: (100 * x.v / tot).toFixed(2) + '%' } })); });
      var keys = E('div', { class: 'cp-split__keys' });
      parts.forEach(function (x) { keys.appendChild(E('span', { class: 'cp-split__k' }, E('i', { class: 'cp-split__sw is-' + x.k, aria: { hidden: 'true' } }), E('span', { text: x.label + ' ' }), E('b', { text: f.int(x.v) }))); });
      c.lines.appendChild(E('div', { class: 'cp-split' }, bar, keys));
    }
    if (st.show.desain !== false && V.k) c.lines.appendChild(E('p', { class: 'cp-card__line', text: count(V.k, 'sekolah desain dan kursus') }));
    if (V.unplaced.length) c.lines.appendChild(E('p', { class: 'cp-card__foot', text: count(V.unplaced.length, 'perguruan tinggi') + ' belum di peta.' }));
  }
  function renderPay(c) {
    c.head.textContent = 'Sasaran payroll: dosen tetap';
    c.big.textContent = V.dosenN ? fm().int(V.dosen) : '—';
    c.big.title = 'Dosen dengan homebase di perguruan tinggi ini (NIDN dan NIDK), dari PDDikti.\n' + C.TOTAL_TITLE;
    clear(c.lines);
    if (!V.rows.length) { c.lines.appendChild(emptyFilter()); return; }
    c.lines.appendChild(E('p', { class: 'cp-card__line', title: C.TOTAL_TITLE }, E('span', { text: 'Mahasiswa: ' }), E('b', { text: V.stuN ? fm().int(V.students) : '—' })));
    c.lines.appendChild(E('p', { class: 'cp-card__line cp-card__line--quiet', text: C.TENDIK_LINE }));
  }
  function emptyFilter() {
    return E('div', { class: 'cp-empty' }, E('p', { text: EMPTY_FILTER }), btn('Hapus filter', 'reset', function () { resetFilters(); st.show = { univ: true, st: true, desain: true }; saveUi(); refresh(['filters']); }, 'btn--ghost btn--bar'));
  }
  function topRows(by) {
    var rows = V.rows.slice();
    if (by === 'near') return C.sort(rows, 'near', { dist: distSortVal }).slice(0, 5);
    return C.sort(rows, by === 'dosen' ? 'dosen' : 'mhs').filter(function (r) { return C.counted(r) && isNum(by === 'dosen' ? r.dosenTetap : r.students); }).slice(0, 5);
  }
  function renderTop(c) {
    if (!c || !V) return;
    var by = st.topSort;
    c.head.textContent = 'Kampus untuk dikunjungi';
    c.sort.set(by);
    c.sw.sync();
    clear(c.list);
    var rows = topRows(by);
    rows.forEach(function (r) {
      var d = distOf(r), dp = distText(d, 'cell');
      var meta = [isNum(r.students) ? count(r.students, 'mahasiswa') : (C.isDesain(r) ? 'tanpa data siswa' : 'mahasiswa belum dilaporkan'),
        by === 'dosen' && isNum(r.dosenTetap) ? count(r.dosenTetap, 'dosen tetap') : null, dp.km + (dp.min ? ' · ' + dp.min : '')].filter(Boolean).join(' · ');
      var b = E('button', { type: 'button', class: 'cp-mini__row', title: 'Buka ' + r.name + ' di peta' }, symChip(r),
        E('span', { class: 'cp-mini__txt' }, E('span', { class: 'cp-mini__name', text: r.name }), E('span', { class: 'cp-mini__meta', text: meta, title: distTip(d) })));
      b.addEventListener('click', function () { focusRow(r); });
      c.list.appendChild(E('li', {}, b));
    });
    if (!rows.length) c.list.appendChild(E('li', { class: 'cp-mini__empty', text: EMPTY_FILTER }));
  }

  /* ============================================================ Detail: the drawer "Daftar & grafik kampus" */

  function makeTabs(host, active, onChange, panel) {
    var items = TABS.map(function (t) { return { id: t.id, label: t.label }; });
    if (ctx && isFn(ctx.tabs)) {
      try { var t0 = ctx.tabs(host, { items: items, active: active, onChange: onChange, panel: panel, label: 'Daftar dan grafik kampus' }); if (t0 && t0.el) { if (!t0.el.parentNode) host.appendChild(t0.el); return t0; } } catch (e) { /* own tabs below */ }
    }
    var list = E('div', { class: 'cp-tabs', role: 'tablist', aria: { label: 'Daftar dan grafik kampus' } }), cur = active;
    var btns = items.map(function (t) {
      var b = E('button', { type: 'button', class: 'cp-tab', role: 'tab', id: 'cp-tab-' + t.id, aria: { selected: 'false', controls: 'cp-panel' }, attrs: { tabindex: '-1' }, text: t.label });
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
    w.tabHost = E('div', { class: 'cp-tabhost' });
    w.body = E('div', { class: 'cp-work__body', id: 'cp-panel', role: 'tabpanel' });
    w.tabsApi = makeTabs(w.tabHost, st.tab, function (id) { setTab(id); }, w.body);
    w.closeB = btn('Tutup', 'close', function () { openWork(false); }, 'btn--secondary btn--lg cp-work__close', 'Tutup daftar & grafik');
    w.head = E('header', { class: 'cp-work__head' },
      E('div', { class: 'cp-work__titles' }, E('p', { class: 'cp-work__eyebrow', text: 'Daftar & grafik kampus' }), E('p', { class: 'cp-work__lede', text: 'Kampus, mahasiswa, dosen tetap, merchant sekitar dan tindak lanjut.' })),
      E('div', { class: 'cp-work__tools' }, w.closeB));
    w.foot = E('footer', { class: 'cp-work__foot' }, link('Sumber data', function () { openSources(); }));
    w.el = E('aside', { class: 'cp-work panel panel--sheet', aria: { label: 'Daftar dan grafik kampus' }, attrs: { 'data-map-occluder': '', 'data-slideover': '', 'data-slideover-label': SLIDE_LABEL } },
      w.head, w.tabHost, w.body, w.foot);
    host.appendChild(w.el);
    ui.work = w;
  }
  function setTab(id) { if (st.tab === id && ui.work && ui.work.current === id) return; st.tab = id; renderWork(true); }
  function goTab(id) {
    st.tab = TABS.some(function (t) { return t.id === id; }) ? id : 'list';
    if (!isDeep()) { st.openOnMount = true; ctx.setView('deep'); return; }
    openWork(true, st.tab === 'list' ? 'list' : null);
    renderWork(true);
  }
  /** "Lihat daftar kampus" opens the drawer to full height on short screens (≤ 900 px), else to half (final fix round). */
  function listDrawer() {
    var I0 = MCD.inst;
    if (I0 && isFn(I0.listDrawerState)) { try { var s0 = I0.listDrawerState(); if (s0 === 'full' || s0 === 'half') return s0; } catch (e) { /* own rule below */ } }
    return (window.innerHeight || 0) > 0 && window.innerHeight <= 900 ? 'full' : 'half';
  }
  function openWork(on, how) {
    st.workOpen = !!on;
    syncWork();
    if (on && adopted()) { var W0 = WS(); try { if (W0 && isFn(W0.drawer) && isFn(W0.setDrawer) && W0.drawer() === 'peek') W0.setDrawer(how === 'list' ? listDrawer() : 'half'); } catch (e) { /* the drawer keeps its height */ } }
    if (on && ui.work) later(function () {
      if (!ui || !ui.work) return;
      /* phones: the drawer flows under the panel, so the page scrolls to it */
      if (window.innerWidth < 600 && isFn(ui.work.el.scrollIntoView)) { try { ui.work.el.scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ } }
      var b = ui.work.el.querySelector('[role="tab"][aria-selected="true"]');
      if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }, 60);
  }
  function syncWork() {
    var w = ui && ui.work;
    if (!w) return;
    syncAdopted();
    w.el.classList.toggle('is-open', !!st.workOpen);
    document.body.classList.toggle('cp-work-open', !!st.workOpen);
    if (ctx) ctx.relayout();
    later(function () { if (!ctx) return; ctx.relayout(); if (ui && ui.work && ui.work.table && isFn(ui.work.table.resize)) ui.work.table.resize(); }, 340);
  }
  var BUILD = { list: function (b) { buildList(b); }, kec: function (b) { buildKecTab(b); }, merch: function (b) { buildMerch(b); }, pipe: function (b) { buildPipe(b); } };
  var RENDER = { list: function () { renderList(); }, kec: function () { renderKecTab(); }, merch: function () { renderMerch(); }, pipe: function () { renderPipe(true); } };
  function dropPanel() {
    var w = ui.work;
    (w.handles || []).forEach(function (h) { try { h.destroy(); } catch (e) { /* ignore */ } });
    w.handles = [];
    if (w.table && isFn(w.table.destroy)) { try { w.table.destroy(); } catch (e) { /* ignore */ } }
    w.table = null;
    w.list = w.kec = w.merch = w.pipe = null;
  }
  function renderWork(force) {
    var w = ui && ui.work;
    if (!w) return;
    if (!BUILD[st.tab]) st.tab = 'list';
    if (w.tabsApi && isFn(w.tabsApi.set)) w.tabsApi.set(st.tab);
    if (w.current !== st.tab || force === true) {
      dropPanel();
      clear(w.body);
      w.current = st.tab;
      w.body.scrollTop = 0;
      if (!C.ready() && st.tab !== 'pipe') { var box = E('div', { class: 'cp-load' }); renderLoad(box); w.body.appendChild(box); return; }
      BUILD[st.tab](w.body);
    }
    if (!C.ready() && st.tab !== 'pipe') return;
    RENDER[st.tab]();
  }
  function panelChart(kind, el, data, cfg) {
    var Ch = MCD.charts, h = null;
    if (Ch && isFn(Ch[kind])) { try { h = Ch[kind](el, data, cfg); } catch (e) { h = null; } }
    if (h) ui.work.handles = (ui.work.handles || []).concat([h]);
    return h;
  }

  /* ---- Daftar kampus */

  function buildList(body) {
    var s = {};
    s.ex = exhibit({ eyebrow: 'Daftar kampus', cls: 'cp-ex--fill' });
    /* a compact select keeps the list's tools on one line, so the first rows show in the half-open drawer */
    s.sortSel = E('select', { class: 'select cp-sortsel', aria: { label: 'Urutkan daftar kampus' }, title: 'Urutkan daftar kampus' }, C.SORTS.map(function (o) { return E('option', { value: o.v, text: o.label }); }));
    s.sortSel.addEventListener('change', function () { st.sort = s.sortSel.value; saveUi(); renderList(); });
    s.sort = { el: s.sortSel, set: function (v) { s.sortSel.value = v; } };
    s.sw = distToggles();
    s.q = E('input', { class: 'input cp-search__in', type: 'search', placeholder: 'Cari kampus', title: 'Cari menurut nama, singkatan atau kode PT', aria: { label: 'Cari kampus menurut nama, singkatan atau kode PT' }, value: st.q || '' });
    s.q.addEventListener('input', debounce(function () { st.q = s.q.value; renderList(); }, 150));
    s.exportB = guard(btn('Ekspor daftar kampus (CSV)', 'download', function () { exportCampus(); }, 'btn--secondary btn--bar', 'Daftar kampus yang tampil, dalam CSV. File CSV dapat dibuka di Excel.'));
    s.ex.el.insertBefore(E('div', { class: 'cp-tools cp-tools--list' }, E('label', { class: 'search cp-search' }, icon('search'), s.q),
      E('label', { class: 'cp-fg cp-fg--inline cp-sortf' }, E('span', { class: 'cp-fg__l', text: 'Urutkan' }), s.sortSel), s.sw.el, s.exportB), s.ex.body);
    s.tableHost = E('div', { class: 'cp-table' });
    s.foot = E('p', { class: 'cp-note' });
    s.unplaced = E('div', { class: 'cp-unplaced' });
    s.ex.body.appendChild(s.tableHost);
    s.ex.body.appendChild(s.foot);
    s.ex.body.appendChild(s.unplaced);
    body.appendChild(s.ex.el);
    ui.work.list = s;
  }
  function listRows() {
    var q = st.q ? C.searchKey(st.q) : '';
    var rows = V.rows.filter(function (r) { return !q || C.searchKey(r.name).indexOf(q) >= 0 || (r.short && C.searchKey(r.short).indexOf(q) >= 0) || (r.kode && r.kode.indexOf(q) >= 0); });
    return C.sort(rows, st.sort, { dist: distSortVal });
  }
  function subLine(r, withTier) {
    var parts = [C.jenisWord(r), C.statusWord(r).toLowerCase()];
    if (r.tags && r.tags.indexOf('desain-seni') >= 0) parts.push('desain dan seni');
    if (r.nationwide) parts.push('jarak jauh, tidak dihitung');
    else if (r.mainOutside) parts.push('kampus utama di luar 30 km, tidak dihitung');
    if (withTier) { var t = tierOf(r); if (t && t.tier) parts.push('kelas biaya ' + t.label); }
    return parts.join(' · ');
  }
  /** PDDikti campuses and design and course schools counted apart (D13): {n, k} of a list of rows. */
  function splitNK(rows) { var k = 0; rows.forEach(function (r) { if (C.isDesain(r)) k++; }); return { n: rows.length - k, k: k }; }
  /** "477 kampus", "477 kampus dan 12 sekolah desain dan kursus", "2 sekolah desain dan kursus". */
  function nkWords(o) {
    if (!o.n && o.k) return count(o.k, 'sekolah desain dan kursus');
    return count(o.n, 'kampus') + (o.k ? ' dan ' + count(o.k, 'sekolah desain dan kursus') : '');
  }
  function listWidth(s) { return (s && s.tableHost && s.tableHost.clientWidth) || window.innerWidth || 1024; }
  /** The line under the name on phones: "53.455 mahasiswa · 14,0 km · ± 33 menit" (D12 rows say they are not summed). */
  function phoneMeta(r) {
    var dp = distText(distOf(r), 'cell');
    var m = isNum(r.students) ? count(r.students, 'mahasiswa') + (C.counted(r) ? '' : ' (tidak dihitung)')
      : (C.isDesain(r) ? 'tanpa data siswa' : 'mahasiswa belum dilaporkan');
    return [m, dp.km && dp.km !== '—' ? dp.km + (dp.min ? ' · ' + dp.min : '') : null].filter(Boolean).join(' · ');
  }
  function renderList() {
    var s = ui.work && ui.work.list;
    if (!s || !V) return;
    s.sort.set(st.sort);
    s.sw.sync();
    var rows = listRows(), f = fm(), mode = distModeWords();
    var byWords = { mhs: 'mahasiswa terbanyak lebih dulu', dosen: 'dosen tetap terbanyak lebih dulu', near: 'terdekat dari KCP lebih dulu', merchant: 'merchant sekitar terbanyak lebih dulu' }[st.sort] || '';
    var nk = splitNK(rows);
    s.ex.set(st.q ? nkWords(nk) + ' cocok dengan “' + st.q + '”' : (rows.length ? nkWords(nk) + ' dalam ' + st.km + ' km, ' + byWords : EMPTY_FILTER),
      'Mahasiswa dan dosen tetap per perguruan tinggi dari PDDikti · jarak dan waktu dari KCP, perkiraan' + (mode ? ' (' + mode + ')' : ''), SRC_LINE);
    clear(s.foot);
    s.foot.appendChild(E('span', { text: 'Jumlah mahasiswa per perguruan tinggi, untuk seluruh kampusnya.\nKampus pendidikan jarak jauh dan kampus dengan kampus utama di luar 30 km tampil di akhir dan tidak dihitung.\nCSV memuat kontak lembaga dari PDDikti, kelas biaya dan jarak dari KCP.' }));
    var tw = listWidth(s), wide = tw >= 820, narrow = tw < 520;
    s.narrow = narrow;
    var tierOk = tierState() === 'ready';
    var cols = narrow ? [
      /* phones (§4.2, §10): one column; the name may take two lines, mahasiswa and the way from KCP on the line under it */
      { key: 'name', label: 'Kampus', sortable: false, headerTitle: 'Nama kampus, mahasiswa dan jarak dari KCP', render: function (td, r) {
        var meta = phoneMeta(r), d = distOf(r);
        td.appendChild(E('span', { class: 'cp-ent cp-ent--phone', title: r.coordConf === 'rendah' ? 'Titik kampus perkiraan dari alamat resmi.' : null }, symChip(r, false, 'cp-ent__sym'),
          E('span', { class: 'cp-ent__txt' }, E('span', { class: 'cp-ent__name', text: r.name + (r.short ? ' (' + r.short + ')' : ''), title: r.name }),
            E('span', { class: 'cp-ent__sub' + (C.counted(r) ? '' : ' is-off'), text: meta, title: meta + '\n' + distTip(d) }))));
      } }
    ] : [
      { key: 'name', label: 'Kampus', sortable: false, render: function (td, r) {
        var sub = subLine(r, !wide && tierOk);
        td.appendChild(E('span', { class: 'cp-ent', title: r.coordConf === 'rendah' ? 'Titik kampus perkiraan dari alamat resmi.' : null }, symChip(r, false, 'cp-ent__sym'),
          E('span', { class: 'cp-ent__txt' }, E('span', { class: 'cp-ent__name', text: r.name + (r.short ? ' (' + r.short + ')' : ''), title: r.name }),
            E('span', { class: 'cp-ent__sub' + (C.counted(r) ? '' : ' is-off'), text: sub, title: sub }))));
      } },
      { key: 'mhs', label: 'Mahasiswa', width: 96, sortable: false, align: 'right', headerTitle: C.TOTAL_TITLE, render: function (td, r) {
        var miss = C.isDesain(r) ? 'Jumlah siswa tidak tercatat di daftar resmi.' : 'Belum dilaporkan ke PDDikti';
        td.appendChild(E('span', { class: 'cp-num2', title: isNum(r.students) ? (C.counted(r) ? null : 'Tidak dihitung dalam jumlah 30 km.') : miss },
          E('span', { class: 'cp-num2__a' + (C.counted(r) ? '' : ' is-off'), text: intOr(r.students) }), E('span', { class: 'cp-num2__b', text: C.counted(r) || !isNum(r.students) ? '' : 'tidak dihitung' })));
      } },
      { key: 'dosen', label: 'Dosen tetap', width: 92, sortable: false, align: 'right', headerTitle: 'Dosen dengan homebase di perguruan tinggi ini (NIDN dan NIDK).', render: function (td, r) {
        td.appendChild(E('span', { class: 'cp-num2', title: isNum(r.dosenTetap) ? null : 'Belum dilaporkan ke PDDikti' }, E('span', { class: 'cp-num2__a', text: intOr(r.dosenTetap) })));
      } },
      wide && tierOk ? { key: 'tier', label: 'Kelas biaya', width: 128, sortable: false, render: function (td, r) { var c = tierChip(tierOf(r)); if (c) td.appendChild(c); } } : null,
      { key: 'dist', label: (mode ? 'Dari KCP' : 'Jarak dari KCP') + (mode ? ' (' + mode + ')' : ''), width: 112, sortable: false, align: 'right', headerTitle: DIST_TIP, render: function (td, r) {
        var d = distOf(r), p = distText(d, 'cell');
        td.appendChild(E('span', { class: 'cp-num2', title: distTip(d) }, E('span', { class: 'cp-num2__a', text: p.km || '—' }), E('span', { class: 'cp-num2__b', text: p.min || '' })));
      } }
    ].filter(Boolean);
    var cfg = { columns: cols, rows: rows, rowKey: function (r) { return r.id; }, rowHeight: narrow ? 72 : 50, virtual: 'auto', label: 'Kampus yang tampil',
      emptyText: st.q ? 'Tidak ada kampus yang cocok dengan pencarian ini. Kosongkan kolom cari.' : EMPTY_FILTER,
      onRow: function (r) { flyNext = true; ctx.select({ kind: 'campus', id: r.id }); }, onHover: function (r) { highlight(r ? [r.id] : null, 2500); } };
    var T = MCD.charts && MCD.charts.table;
    if (isFn(T)) {
      if (!s.table) s.table = ui.work.table = T(s.tableHost, rows, cfg);
      else s.table.update(rows, cfg);
    } else {
      clear(s.tableHost);
      var ul = E('ul', { class: 'cp-plain' });
      rows.slice(0, 200).forEach(function (r) { var b = E('button', { type: 'button', class: 'cp-plain__row', text: r.name + ' · ' + intOr(r.students) + ' mahasiswa' }); b.addEventListener('click', function () { cfg.onRow(r); }); ul.appendChild(E('li', {}, b)); });
      s.tableHost.appendChild(ul);
    }
    renderUnplaced(s.unplaced);
  }
  /** "Belum di peta ({n})" (D20): active PT of the area that have no usable point. Listed, never drawn or summed. */
  function renderUnplaced(host) {
    clear(host);
    var list = V.unplaced, f = fm();
    if (!list.length) return;
    var bodyId = 'cp-unplaced-body';
    var b = E('button', { type: 'button', class: 'cp-unplaced__btn', aria: { expanded: st.unplacedOpen ? 'true' : 'false', controls: bodyId } }, E('span', { text: 'Belum di peta (' + f.int(list.length) + ')' }), icon('chev-d'));
    var body = E('div', { class: 'cp-unplaced__body', id: bodyId, hidden: !st.unplacedOpen });
    b.addEventListener('click', function () { st.unplacedOpen = !st.unplacedOpen; body.hidden = !st.unplacedOpen; b.setAttribute('aria-expanded', st.unplacedOpen ? 'true' : 'false'); });
    body.appendChild(note('Perguruan tinggi aktif di wilayah ini yang belum dapat ditempatkan di peta karena alamat dan titiknya tidak tersedia di PDDikti. Tidak dihitung dalam jumlah 30 km.'));
    var ul = E('ul', { class: 'cp-unplaced__list' });
    list.slice().sort(function (a, c) { return (isNum(c.students) ? c.students : -1) - (isNum(a.students) ? a.students : -1) || (a.name < c.name ? -1 : 1); }).forEach(function (u) {
      var why = String(u.why || '').split(/\s*;\s*/).filter(Boolean).join(', ');
      ul.appendChild(E('li', { class: 'cp-unplaced__row' },
        E('span', { class: 'cp-unplaced__name', text: u.name + ' · ' + (u.kota || '') + ' · ' + (isNum(u.students) ? count(u.students, 'mahasiswa') : 'mahasiswa belum dilaporkan') }),
        why ? E('span', { class: 'cp-unplaced__why', text: why.charAt(0).toUpperCase() + why.slice(1) + '.' }) : null,
        extLink(C.pddiktiUrl(u.name), 'Cari di PDDikti', 'Buka pencarian PDDikti dengan nama ini, di tab baru. Perlu internet.')));
    });
    body.appendChild(ul);
    host.appendChild(b);
    host.appendChild(body);
  }
  function exportCampus() {
    if (!V) return;
    if (MCD.demo && isFn(MCD.demo.blocks) && MCD.demo.blocks()) return;
    var rows = C.sort(V.rows, st.sort, { dist: distSortVal });
    var csv = C.csv(rows, { veiled: veil(), dist: function (r) { var d = distOf(r); return d && d.source !== 'garis' && !d.pending ? { km: d.km, min: d.min } : null; } });
    var name = 'kampus_cilangkap_' + ymd() + '.csv';
    toast(download(name, csv) ? name + ' tersimpan di komputer ini' + (veil() ? '. Kontak dikosongkan karena nama disamarkan.' : '') : 'File tidak dapat disimpan. Coba lagi.', null);
  }

  /* ---- Kecamatan */

  function buildKecTab(body) {
    var k = {};
    k.ex = exhibit({ eyebrow: 'Kecamatan' });
    k.by = seg('Ukuran batang', [{ v: 'mhs', label: 'Mahasiswa' }, { v: 'dosen', label: 'Dosen tetap' }], function (v) { st.kecBy = v; renderKecTab(); });
    k.top = seg('Kecamatan yang ditampilkan', [{ v: 'top', label: TOP_KEC + ' teratas' }, { v: 'all', label: 'Semua' }], function (v) { st.kecAll = v === 'all'; renderKecTab(); });
    k.ex.el.insertBefore(E('div', { class: 'cp-tools' }, k.by.el, k.top.el), k.ex.body);
    k.host = E('div', { class: 'cp-chart' });
    k.ex.body.appendChild(k.host);
    body.appendChild(k.ex.el);
    ui.work.kec = k;
  }
  function renderKecTab() {
    var k = ui.work && ui.work.kec;
    if (!k || !V) return;
    var f = fm(), by = st.kecBy === 'dosen' ? 'dosen' : 'mhs';
    k.by.set(by); k.top.set(st.kecAll ? 'all' : 'top');
    var list = V.kecList.slice().sort(function (a, b) { return by === 'dosen' ? (b.dosen - a.dosen) || (b.students - a.students) : (b.students - a.students) || (b.dosen - a.dosen); });
    var lead = list[0];
    k.ex.set(lead ? 'Kec. ' + kecShown(lead.id, lead.name) + ' memiliki ' + (by === 'dosen' ? 'dosen tetap' : 'mahasiswa') + ' terbanyak dari ' + count(list.length, 'kecamatan') + ' (' + f.int(by === 'dosen' ? lead.dosen : lead.students) + ')' : EMPTY_FILTER,
      (by === 'dosen' ? 'Dosen tetap' : 'Mahasiswa') + ' per kecamatan, kampus dalam ' + st.km + ' km. Kampus jarak jauh dan kampus utama di luar 30 km tidak dihitung.',
      SRC_LINE + ' · ' + SRC_AREAS);
    var items = (st.kecAll ? list : list.slice(0, TOP_KEC)).map(function (a) {
      return { id: a.id, label: kecShown(a.id, a.name), value: by === 'dosen' ? a.dosen : a.students, sub: [nkWords(a), a.kota].filter(Boolean) };
    });
    var data = { items: items, onSelect: function (it) { showKec(it.id); }, max: items.length, label: 'Kecamatan menurut ' + (by === 'dosen' ? 'dosen tetap' : 'mahasiswa'), actionHint: 'Buka kecamatan di peta', emptyText: EMPTY_FILTER };
    if (k.chart && isFn(k.chart.update)) k.chart.update(data);
    else {
      k.chart = panelChart('rankedBars', k.host, data);
      if (!k.chart) { clear(k.host); items.forEach(function (it) { var b = link(it.label + ' · ' + f.int(it.value), function () { showKec(it.id); }, 'cp-plain__row'); k.host.appendChild(b); }); }
    }
  }

  /* ---- Merchant sekitar (ranked by kantinAll without national chains: never the main point's kantin alone) */

  function buildMerch(body) {
    var m = {};
    m.ex = exhibit({ eyebrow: 'Merchant sekitar kampus' });
    m.top = seg('Kampus yang ditampilkan', [{ v: 'top', label: MERCH_TOP + ' teratas' }, { v: 'all', label: 'Semua' }], function (v) { st.merchAll = v === 'all'; renderMerch(); });
    m.ex.el.insertBefore(E('div', { class: 'cp-tools' }, m.top.el, E('span', { class: 'cp-prodlogos', title: 'Livin’ Merchant (QRIS) untuk kantin dan koperasi' }, logo('lvm'), logo('qris'))), m.ex.body);
    m.host = E('div', { class: 'cp-chart' });
    m.ex.body.appendChild(m.host);
    m.ex.body.appendChild(note(KANTIN_FLOOR));
    body.appendChild(m.ex.el);
    ui.work.merch = m;
  }
  function renderMerch() {
    var m = ui.work && ui.work.merch;
    if (!m || !V) return;
    var f = fm();
    m.top.set(st.merchAll ? 'all' : 'top');
    var list = C.sort(V.rows, 'merchant').filter(function (r) { return C.kantinRank(r) > 0; });
    var lead = list[0];
    m.ex.set(lead ? lead.name + ' memiliki usaha lokal terbanyak di sekitarnya (' + f.int(C.kantinRank(lead)) + ')' : 'Belum ada usaha yang tercatat di sekitar kampus dengan filter ini',
      'Usaha di sekitar setiap titik kampus, tanpa jaringan nasional (batang). Di bawah nama: semua usaha, jaringan nasional dan kelompoknya.', 'Sumber: Overture Maps Foundation (rilis 2026-09-23.1), garis kampus OpenStreetMap · 18 Okt 2026');
    var items = (st.merchAll ? list : list.slice(0, MERCH_TOP)).map(function (r) {
      var a = r.kantinAll || {};
      var full = count(a.total || 0, 'usaha') + ' di sekitar kampus, ' + f.int(a.chain || 0) + ' di antaranya jaringan nasional';
      /* one short line under the name (the parts wrap only on a narrow screen); the full sentence in the tip */
      return { id: r.id, label: r.name, value: C.kantinRank(r), symbol: symChip(r), title: full + '\n' + f.int(a.makan || 0) + ' makan & minum · ' + f.int(a.toko || 0) + ' toko & jasa',
        sub: [count(a.total || 0, 'usaha') + ', ' + f.int(a.chain || 0) + ' jaringan nasional', f.int(a.makan || 0) + ' makan & minum', f.int(a.toko || 0) + ' toko & jasa'] };
    });
    var data = { items: items, onSelect: function (it) { openCampus(C.row(it.id), { fold: 'kantin' }); }, max: items.length, label: 'Kampus menurut merchant sekitar', actionHint: 'Buka kartu kampus', emptyText: 'Belum ada usaha yang tercatat di sekitar kampus dengan filter ini.' };
    if (m.chart && isFn(m.chart.update)) m.chart.update(data);
    else {
      m.chart = panelChart('rankedBars', m.host, data);
      if (!m.chart) { clear(m.host); items.forEach(function (it) { m.host.appendChild(link(it.label + ' · ' + f.int(it.value), function () { openCampus(C.row(it.id), { fold: 'kantin' }); }, 'cp-plain__row')); }); }
    }
  }

  /* ---- Tindak lanjut (MCD.campus.pipeline: encrypted through MCD.seal, else memory only) */

  function P() { return C.pipeline; }
  function pipeAll() { try { return P().all() || {}; } catch (e) { return {}; } }
  function pipeGet(k) { try { return P().get(k); } catch (e) { return null; } }
  /** The storage state in words (§7.6). */
  function pipeState() {
    var p = P(), s = 'memory', reason = null;
    try { s = isFn(p.status) ? p.status() : (p.persisted() ? 'ready' : 'memory'); } catch (e) { s = 'memory'; }
    var Se = MCD.seal;
    try { reason = Se && isFn(Se.reason) ? Se.reason() : null; } catch (e) { reason = null; }
    if (s === 'ready' || s === 'loading') return { state: s, ok: true, text: 'Tersimpan di komputer ini.', title: SEALED_TITLE };
    if (s === 'old-password') return { state: s, text: 'Daftar tindak lanjut lama terenkripsi dengan kata sandi sebelumnya.', action: { label: 'Buka di Data & Privasi', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:followups' }); } } };
    if (s === 'damaged') return { state: s, text: 'Daftar tindak lanjut di komputer ini rusak dan tidak dapat dibuka. Daftar baru dimulai.' };
    return { state: 'memory', text: reason === 'no-storage' ? BLOCKED_LINE : reason === 'quota' ? QUOTA_LINE : MEM_LINE };
  }
  function pipeStateEl(cls) {
    var s = pipeState();
    var el = E('div', { class: ['cp-pstate', s.ok ? 'is-ok' : 'is-warn', cls], title: s.title || null }, E('p', { text: s.text }));
    if (s.action) el.appendChild(btn(s.action.label, 'chev-r', s.action.run, 'btn--ghost btn--bar'));
    return el;
  }
  function buildPipe(body) {
    var p = {};
    p.ex = exhibit({ eyebrow: 'Tindak lanjut kampus' });
    p.state = E('div', { class: 'cp-pstatehost' });
    p.barHost = E('div', { class: 'cp-chart cp-chart--bar' });
    p.steps = E('div', { class: 'cp-steps', role: 'list' });
    p.next = E('ul', { class: 'cp-next' });
    p.prodHost = E('div', { class: 'cp-tools cp-tools--prod' });
    p.list = E('div', { class: 'cp-plist' });
    p.file = E('input', { type: 'file', accept: '.json,application/json', hidden: true });
    p.file.addEventListener('change', function () {
      var file = p.file.files && p.file.files[0];
      if (!file) return;
      var rd = new FileReader();
      rd.addEventListener('load', function () {
        var res;
        try { res = P().importJson(String(rd.result || '')); } catch (e) { res = { ok: false, error: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).' }; }
        toast(res.ok ? 'Tindak lanjut diimpor: ' + res.added + ' ditambahkan, ' + res.updated + ' diperbarui, ' + res.kept + ' tetap' : res.error, res.ok ? null : 'warn');
        p.file.value = '';
        renderPipe(true);
      });
      rd.readAsText(file);
    });
    p.exportB = guard(btn('Ekspor (JSON)', 'download', function () {
      if (demoOn()) return;
      ctx.confirm({ title: 'Ekspor daftar tindak lanjut kampus', body: 'File ini tidak terenkripsi. Simpan hanya di komputer kantor.', ok: 'Ekspor (JSON)', cancel: 'Batal' }).then(function (yes) {
        if (!yes) return;
        var name = 'kampus-tindak-lanjut_cilangkap_' + ymd() + '.json', text = null;
        try { text = P().exportJson(); } catch (e) { text = null; }
        toast(text && download(name, text, 'application/json') ? name + ' tersimpan di komputer ini' : 'File tidak dapat disimpan. Coba lagi.', text ? null : 'warn');
      });
    }, 'btn--secondary btn--bar'));
    p.importB = btn('Impor (JSON)', 'upload', function () { p.file.click(); }, 'btn--secondary btn--bar');
    p.clearB = btn('Kosongkan daftar', 'close', function () {
      var n = Object.keys(pipeAll()).length;
      if (!n) return;
      ctx.confirm({ title: 'Kosongkan daftar tindak lanjut kampus', body: count(n, 'entri') + ' beserta catatannya akan dihapus dari komputer ini. Salinan terenkripsi yang telah diunduh tidak berubah.', ok: 'Kosongkan daftar', cancel: 'Batal', danger: true })
        .then(function (yes) { if (yes) { try { P().clear(); } catch (e) { /* ignore */ } renderPipe(true); toast('Daftar tindak lanjut dikosongkan'); } });
    }, 'btn--ghost btn--bar');
    p.ex.el.insertBefore(E('div', { class: 'cp-tools' }, p.exportB, p.importB, p.clearB, p.file), p.ex.body);
    p.ex.body.appendChild(p.state);
    p.ex.body.appendChild(p.barHost);
    p.ex.body.appendChild(E('h4', { class: 'cp-h4', text: 'Per tahap' }));
    p.ex.body.appendChild(p.steps);
    p.ex.body.appendChild(E('h4', { class: 'cp-h4', text: 'Langkah berikutnya' }));
    p.ex.body.appendChild(p.next);
    p.ex.body.appendChild(E('h4', { class: 'cp-h4', text: 'Semua entri tindak lanjut' }));
    p.ex.body.appendChild(p.prodHost);
    p.ex.body.appendChild(p.list);
    p.ex.body.appendChild(note('Catatan kerja tanpa angka bank. Tambahkan kampus dari kartunya.\nTahap “Aktif” hanya tanda kerja staf.'));
    /* the product filter and the stage list are built once and updated in place, so keyboard focus stays on the
       option that was picked (§10; rebuilding them on every change dropped focus to the page) */
    /* D22 / item 47: the QRIS mark sits on the "QRIS kantin" chip itself (always, as in Sekolah), beside its words, so
       it is hidden from screen readers there (the name is not read twice) */
    p.prod = seg('Produk sasaran', [{ v: '', label: 'Semua produk', title: 'Tampilkan semua entri' }].concat(C.PRODUCTS.map(function (q) {
      return { v: q.id, label: q.short, title: 'Tampilkan entri dengan produk sasaran ' + q.short, icon: q.id === 'LVM' ? markBesideWords(logo('qris', 'cp-logo--chip')) : null };
    })), function (v) { st.pipeProd = v; renderPipe(true); }, 'cp-rchips--prod', 'chips');
    p.prodHost.appendChild(E('div', { class: 'cp-fg cp-fg--prod' }, E('span', { class: 'cp-fg__l', text: 'Produk sasaran' }), E('div', { class: 'cp-prodrow' }, p.prod.el)));
    buildSteps(p);
    body.appendChild(p.ex.el);
    ui.work.pipe = p;
  }
  /** The nine stage rows ("Per tahap"): a button each (aria-pressed), its bar and its count; renderPipe() updates them. */
  function buildSteps(p) {
    var stages = C.stages();
    p.stepSig = stages.map(function (s) { return s.id; }).join('|');
    p.stepEls = {};
    clear(p.steps);
    stages.forEach(function (s) {
      var t = STAGE_TONE[s.id] || 'none', fill = E('i'), n = E('span', { class: 'cp-step__n', text: '0' });
      var b = E('button', { type: 'button', class: 'cp-step cp-step--' + t, aria: { pressed: 'false' }, title: 'Tampilkan tahap ' + s.label + ' saja' },
        E('span', { class: 'cp-step__l', text: s.label }), E('span', { class: 'cp-step__bar', aria: { hidden: 'true' } }, fill), n);
      b.addEventListener('click', function () { st.pipeStage = st.pipeStage === s.id ? '' : s.id; renderPipe(true); });
      p.steps.appendChild(E('div', { class: 'cp-step__li', role: 'listitem' }, b));
      p.stepEls[s.id] = { b: b, fill: fill, n: n };
    });
  }
  function renderPipe(force) {
    var p = ui.work && ui.work.pipe;
    if (!p) return;
    var all = pipeAll(), keys = Object.keys(all), f = fm(), stages = C.stages();
    var sig = JSON.stringify([keys.length, keys.map(function (k) { return all[k].t; }), st.pipeStage, st.pipeProd, veil(), C.ready() ? 1 : 0, pipeState().state]);
    if (!force && p.sig === sig) return;
    p.sig = sig;
    clear(p.state);
    p.state.appendChild(pipeStateEl());
    var counts = {}, tone = { ok: 0, mid: 0, bad: 0, none: 0 };
    stages.forEach(function (s) { counts[s.id] = 0; });
    keys.forEach(function (k) { counts[all[k].stage] = (counts[all[k].stage] || 0) + 1; });
    stages.forEach(function (s) { tone[STAGE_TONE[s.id] || 'none'] += counts[s.id] || 0; });
    p.ex.set(keys.length ? count(keys.length, 'entri') + ' di daftar tindak lanjut kampus, ' + f.int(counts.aktif || 0) + ' aktif' : 'Daftar tindak lanjut kampus masih kosong',
      keys.length ? 'Jumlah entri per tahap · diisi staf cabang di komputer ini' : 'Tambahkan kampus dari kartunya dengan “+ Tindak lanjut”.', 'Sumber: catatan kerja cabang (lokal)');
    var bdata = { acquired: tone.ok, partly: tone.mid, notYet: tone.bad, noData: tone.none };
    var bcfg = { label: 'Tindak lanjut per kelompok tahap', unit: 'entri', labels: { acquired: 'Aktif', partly: 'Dalam proses', notYet: 'Belum dihubungi', noData: 'Ditunda atau batal' }, tableToggle: false };
    if (!p.bar) p.bar = panelChart('statusBar', p.barHost, bdata, bcfg); else p.bar.update(bdata, bcfg);
    p.barHost.hidden = !keys.length;
    if (p.stepSig !== stages.map(function (s) { return s.id; }).join('|')) buildSteps(p);
    var max = Math.max.apply(null, [1].concat(stages.map(function (s) { return counts[s.id] || 0; })));
    stages.forEach(function (s) {
      var el = p.stepEls[s.id], on = st.pipeStage === s.id, c = counts[s.id] || 0;
      if (!el) return;
      el.b.classList.toggle('is-on', on);
      el.b.setAttribute('aria-pressed', on ? 'true' : 'false');
      el.fill.style.width = (100 * c / max).toFixed(1) + '%';
      el.n.textContent = f.int(c);
    });
    clear(p.next);
    var dated = keys.filter(function (k) { return all[k].nextDate; }).sort(function (a, b) { return all[a].nextDate < all[b].nextDate ? -1 : 1; });
    if (!dated.length) p.next.appendChild(E('li', { class: 'cp-note', text: 'Belum ada langkah berikutnya yang bertanggal.' }));
    dated.slice(0, 12).forEach(function (k) {
      var e = all[k];
      p.next.appendChild(E('li', { class: 'cp-next__row' }, E('span', { class: 'cp-next__date', text: f.date(e.nextDate) }), link(e.label || k, function () { openPipeKey(k); }, 'cp-next__name'), E('span', { class: 'cp-next__step', text: e.nextStep || '—' })));
    });
    clear(p.list);
    function hasProd(k, id) { return (all[k].products || []).indexOf(id) >= 0; }
    p.prodHost.hidden = !keys.length;
    C.PRODUCTS.forEach(function (q) { p.prod.label(q.id, q.short + ' · ' + f.int(keys.filter(function (k) { return hasProd(k, q.id); }).length)); });
    p.prod.set(st.pipeProd || '');
    var shown = keys.filter(function (k) { return (!st.pipeStage || all[k].stage === st.pipeStage) && (!st.pipeProd || hasProd(k, st.pipeProd)); });
    if (!shown.length) { p.list.appendChild(E('p', { class: 'cp-empty-line', text: keys.length ? (st.pipeProd ? 'Tidak ada entri dengan produk sasaran ini.' : 'Tidak ada entri pada tahap ini.') : 'Daftar tindak lanjut masih kosong. Buka kartu kampus, lalu pilih “+ Tindak lanjut”.' })); return; }
    var known = C.ready() ? new Set(C.index().rows.map(function (r) { return r.id; })) : null;
    function rowOf(k) {
      var e = all[k], gone = known && !known.has(k);
      var r = E('button', { type: 'button', class: 'cp-plist__row cp-plist__row--' + (STAGE_TONE[e.stage] || 'none') + (gone ? ' is-gone' : '') },
        E('span', { class: 'cp-plist__name', text: (e.label || k) + (gone ? ' · Tidak ada di data terbaru' : '') }),
        E('span', { class: 'cp-plist__meta', text: [veil() && e.owner ? MCD.util.mask.initials(e.owner) : (e.owner || 'Belum ada penanggung jawab'), (e.products || []).map(C.productName).join(' · ') || 'belum ada produk', e.program === 'GEMPITA' ? 'GEMPITA 2026' : null].filter(Boolean).join(' · ') }),
        E('span', { class: 'cp-plist__next', text: e.nextStep ? e.nextStep + (e.nextDate ? ' · ' + f.date(e.nextDate) : '') : '' }));
      r.addEventListener('click', function () { if (!gone) openPipeKey(k); else toast('Kampus ini tidak ada di data terbaru. Entrinya tetap disimpan.', 'warn'); });
      return r;
    }
    stages.forEach(function (s) {
      var ks = shown.filter(function (k) { return all[k].stage === s.id && !(known && !known.has(k)); });
      if (!ks.length) return;
      p.list.appendChild(E('p', { class: 'cp-plist__g', text: s.label + ' · ' + ks.length }));
      ks.sort(function (a, b) { return (all[a].label || a) < (all[b].label || b) ? -1 : 1; }).forEach(function (k) { p.list.appendChild(rowOf(k)); });
    });
    var orphans = shown.filter(function (k) { return known && !known.has(k); });
    if (orphans.length) {
      p.list.appendChild(E('p', { class: 'cp-plist__g', text: 'Tidak ada di data terbaru · ' + orphans.length }));
      orphans.forEach(function (k) { p.list.appendChild(rowOf(k)); });
    }
  }
  function openPipeKey(k) {
    var r = C.row(k);
    if (!r) { toast('Kampus ini tidak ada di data terbaru. Entrinya tetap disimpan.', 'warn'); return; }
    flyNext = true;
    ctx.select({ kind: 'campus', id: r.id });
  }

  /* ---- "Sumber data" and the kelas biaya "?" (drawer cards) */

  function openSources() {
    if (!ctx) return;
    drawerSel = null;
    var u = C.unplaced().length, m = C.meta();
    var cov = m && m.coverage ? m.coverage : {};
    var body = [
      blk('Sumber data', [E('ul', { class: 'cp-bul' }, [
        'PDDikti (Kemdiktisaintek): daftar perguruan tinggi, alamat, kontak kantor, mahasiswa aktif dan dosen tetap per semester.',
        'OpenStreetMap dan Overture Maps: titik kampus, sekolah desain dan kursus, usaha di sekitar kampus.',
        'Situs resmi kampus: biaya kuliah yang dipublikasikan, untuk kelas biaya.',
        'Batas kecamatan: OpenStreetMap, BPS 2020 melalui OCHA/HDX, kode Kemendagri.'
      ].map(function (t) { return E('li', { text: t }); })), E('p', { class: 'cp-src' }, logo('pddikti'), E('span', { text: 'Data mahasiswa dan dosen: PDDikti' }))]),
      blk('Cakupan dan batas data', [E('ul', { class: 'cp-bul' }, [
        count(cov.pddikti || 0, 'perguruan tinggi') + ' dan ' + count(cov.desainKursus || 0, 'sekolah desain dan kursus') + ' dalam 30 km.',
        'Mahasiswa dan dosen tetap adalah angka seluruh perguruan tinggi, untuk semua kampusnya.',
        'Kampus pendidikan jarak jauh dan kampus dengan kampus utama di luar 30 km tampil, tetapi tidak dihitung.',
        C.TENDIK_LINE,
        count(u, 'perguruan tinggi') + ' aktif di wilayah ini belum dapat ditempatkan di peta.',
        'Usaha di sekitar kampus berasal dari peta publik, sehingga angkanya batas bawah.',
        'Tidak ada data pribadi dosen, staf atau mahasiswa yang disimpan.'
      ].map(function (t) { return E('li', { text: t }); }))])
    ];
    ctx.openDrawer({ eyebrow: 'KAMPUS', title: 'Sumber data dan cakupan', body: body, prov: SRC_LINE });
  }
  /**
   * "Perkiraan untuk kampus paling tinggi Menengah. Kampus dengan biaya tinggi yang tidak mempublikasikan biaya dapat
   * tampil lebih rendah." (final fix round, 23 Oct 2026): MCD.inst.capLine, else the same from meta.perkiraanRule.
   */
  function capLine() {
    var I0 = MCD.inst;
    if (I0 && isFn(I0.capLine)) { try { var l0 = I0.capLine('kampus'); if (typeof l0 === 'string') return l0; } catch (e) { /* own below */ } }
    var T = window.MCD_INSTITUTION_TIERS, M0 = T && T.meta, row = M0 && M0.perkiraanRule && M0.perkiraanRule.table && M0.perkiraanRule.table.kampus, best = null;
    if (!row) return '';
    Object.keys(row).forEach(function (a) { ((M0 && M0.tiers) || []).forEach(function (m) { if (m && m.label === row[a] && (!best || m.level > best.level)) best = m; }); });
    return best ? 'Perkiraan untuk kampus paling tinggi ' + best.label + '. Kampus dengan biaya tinggi yang tidak mempublikasikan biaya dapat tampil lebih rendah.' : '';
  }
  function openTierHelp() {
    if (!ctx) return;
    drawerSel = null;
    loadTiers(true);
    var rows = C.tierText('kampus'), body = [];
    body.push(blk('Batas kelas biaya kampus', rows.length ? [E('ul', { class: 'cp-bul' }, rows.map(function (t) { return E('li', {}, E('b', { text: t.label + ': ' }), E('span', { text: t.text })); }))] : [note('Kelas biaya sedang dimuat. Buka lagi sebentar lagi.')]));
    body.push(blk('Dasar kelas', [E('ul', { class: 'cp-bul' }, [
      'Batang berisi = dari biaya resmi atau jenis kampus.',
      'Batang kosong = perkiraan.',
      'Perkiraan berarti kelas biaya dihitung dari jenis kampus dan daya beli area karena biaya resmi tidak dipublikasikan.',
      capLine() || null,
      V && tierState() === 'ready' ? 'Biaya resmi ditemukan untuk ' + count(V.feeN, 'kampus') + '. Selebihnya dari jenis kampus atau perkiraan.' : null
    ].filter(Boolean).map(function (t) { return E('li', { text: t }); }))]));
    body.push(note(ENTRY_LINE));
    ctx.openDrawer({ eyebrow: 'KAMPUS', title: 'Arti kelas biaya', body: body, prov: 'Sumber: situs resmi kampus (biaya resmi), jenis kampus, daya beli area · dibaca 18 Okt 2026' });
  }

  /* ============================================================ the campus card (eight folds, §6.5) */

  function mhsBlock(r) {
    var kids = [], f = fm(), sem = C.semLabel(r.studentsSem);
    if (C.isDesain(r)) kids.push(note('Jumlah siswa tidak tercatat di daftar resmi.'));
    else if (isNum(r.students)) {
      kids.push(r.studentsBasis === 'halaman' ? E('p', { class: 'cp-line', text: 'Mahasiswa: ' + f.int(r.students) + ' · angka dari halaman PDDikti, semester tidak disebut.' })
        : E('p', { class: 'cp-line', title: C.TOTAL_TITLE }, E('span', { text: 'Mahasiswa aktif: ' }), E('b', { text: f.int(r.students) }), E('span', { text: ' · PDDikti' + (sem ? ', ' + sem : '') })));
    } else kids.push(note('Jumlah mahasiswa belum dilaporkan ke PDDikti.'));
    if (isNum(r.prodi) && r.prodi > 0) kids.push(kv('Program studi aktif', f.int(r.prodi)));
    if (Array.isArray(r.campuses) && r.campuses.length) kids.push(note('Jumlah untuk seluruh kampus perguruan tinggi ini. Data per lokasi kampus tidak tersedia.'));
    if (r.mainOutside) kids.push(note('Kampus utama di ' + (r.mainOutside.kota || 'luar wilayah ini') + ', di luar 30 km. Mahasiswanya tidak dihitung dalam jumlah 30 km.', 'is-strong'));
    if (r.nationwide) kids.push(note('Pendidikan jarak jauh: mahasiswa tersebar di seluruh Indonesia. Tidak dihitung dalam jumlah 30 km.', 'is-strong'));
    if (r.note) kids.push(E('p', { class: 'cp-note' }, E('b', { text: 'Catatan data: ' }), E('span', { text: r.note })));
    var pv = C.isDesain(r) ? 'tidak tercatat' : isNum(r.students) ? count(r.students, 'mahasiswa') + (C.counted(r) ? '' : ' · tidak dihitung') : 'belum dilaporkan';
    return blk('Mahasiswa', kids, 'cp-dd--mhs', { id: 'mhs', preview: pv, open: true });
  }
  function payBlock(r) {
    var kids = [], f = fm(), sem = C.semLabel(r.dosenSem || r.studentsSem);
    if (isNum(r.dosenTetap)) {
      kids.push(kv('Dosen tetap', f.int(r.dosenTetap) + ' · PDDikti' + (sem ? ', ' + sem : ''), 'Dosen dengan homebase di perguruan tinggi ini (NIDN dan NIDK).'));
      if (isNum(r.dosenTotal) && r.dosenTotal !== r.dosenTetap) kids.push(kv('Dosen di halaman PDDikti', f.int(r.dosenTotal), 'Termasuk dosen dengan homebase di perguruan tinggi lain.'));
    } else if (C.isDesain(r)) kids.push(note('Lembaga ini tidak terdaftar di PDDikti, sehingga jumlah pengajarnya tidak tercatat.'));
    else kids.push(note('Jumlah dosen belum dilaporkan ke PDDikti.'));
    kids.push(note('Jumlah tendik tidak diterbitkan PDDikti. Tanyakan ke bagian kepegawaian kampus.'));
    if (!C.counted(r) && !C.isDesain(r)) kids.push(note('Tidak dihitung dalam jumlah 30 km.'));
    return blk('Dosen (payroll)', kids, 'cp-dd--pay', { id: 'payroll', preview: isNum(r.dosenTetap) ? count(r.dosenTetap, 'dosen tetap') : 'belum dilaporkan', open: true });
  }
  function tierBlock(r) {
    var I = MCD.inst;
    if (I && isFn(I.tierBlock)) {
      try {
        var n = nodeOf(I.tierBlock(r.id, { kind: 'kampus', veiled: veil() }));
        if (n) { if (!n.getAttribute('data-fold')) n.setAttribute('data-fold', 'biaya'); return n; }
      } catch (e) { /* own below */ }
    }
    var t = tierOf(r), kids = [];
    if (t === undefined) {
      var ts = tierState();
      kids.push(note(ts === 'error' ? 'Kelas biaya belum tersedia.' : 'Memuat kelas biaya…'));
      if (ts === 'error') kids.push(btn('Coba lagi', 'reset', function () { loadTiers(true); }, 'btn--ghost btn--bar'));
      return blk('Kelas biaya', kids, 'cp-dd--tier', { id: 'biaya', preview: ts === 'error' ? 'belum tersedia' : 'memuat', open: false });
    }
    if (!t || !t.tier) {
      kids.push(note('Kelas biaya belum diketahui. Data biaya dan jenis kampus belum cukup.'));
      return blk('Kelas biaya', kids, 'cp-dd--tier', { id: 'biaya', preview: 'Belum diketahui', open: false });
    }
    kids.push(E('p', { class: 'cp-tierline' }, tierChip(t), E('span', { class: 'cp-tierline__w', text: t.basisWords })));
    if (t.fee && t.fee.text) kids.push(E('p', { class: 'cp-line', text: t.fee.text }));
    if (t.quote) kids.push(E('blockquote', { class: 'cp-quote', text: '“' + t.quote + '”' }));
    if (t.fee && t.url) {
      var sp = C.safeUrl(t.url);
      kids.push(note('Sumber: ' + (t.source || 'situs resmi kampus') + (t.fetched ? ', dibaca ' + fm().date(t.fetched) : '')));
      if (sp && !veil()) kids.push(E('p', { class: 'cp-line' }, extLink(sp.url, 'Buka sumber biaya', 'Buka halaman biaya resmi di tab baru. Perlu internet.'), E('span', { class: 'cp-host', text: ' · ' + sp.host })));
    } else if (t.checkWords) kids.push(note(t.checkWords));
    if (t.basis === 'perkiraan') { var cl = capLine(); if (cl) kids.push(note(cl)); }
    if (t.note) kids.push(note(t.note));
    kids.push(note(ENTRY_LINE));
    var bw = t.basisWords ? t.basisWords.charAt(0).toLowerCase() + t.basisWords.slice(1) : '';
    return blk('Kelas biaya', kids, 'cp-dd--tier', { id: 'biaya', preview: t.label + (bw ? ' · ' + bw : ''), open: false });
  }
  function copyBtn(label, value, done) {
    var b = E('button', { type: 'button', class: 'cp-copy', aria: { label: label + ' ' + value }, title: label }, icon('copy'), E('span', { text: 'Salin' }));
    b.addEventListener('click', function () { copy(value).then(function () { toast(done); }, function () { toast('Fitur salin tidak tersedia di browser ini', 'warn'); }); });
    return b;
  }
  function crow(label, value, src) { return E('div', { class: 'cp-crow' }, E('span', { class: 'cp-crow__k', text: label }), E('div', { class: 'cp-crow__v' }, value), src ? E('span', { class: 'cp-crow__src', text: src }) : null); }
  /**
   * "Kontak & identitas" (§5.2): MCD.inst.contactBlock when present; else the same rows here. Links only for numbers
   * with an area code (D18) and checked websites (D17); nothing but the kode PT while names are veiled (D7).
   */
  function contactBlock(r, identity) {
    var I = MCD.inst;
    if (I && isFn(I.contactBlock)) {
      try {
        var n = nodeOf(I.contactBlock(r.id, { veiled: veil(), toast: toast, identity: identity, kind: 'kampus' }));
        if (n) { if (!n.getAttribute('data-fold')) n.setAttribute('data-fold', 'kontak'); return n; }
      } catch (e) { /* own below */ }
    }
    var c = C.contactOf(r.id) || { id: null, phones: [], email: null, website: null };
    var kids = [], srcP = 'PDDikti · 18 Okt 2026';
    var code = c.id ? E('span', { class: 'cp-code' }, E('span', { class: 'cp-mono', text: c.id.value }), copyBtn('Salin kode PT', c.id.value, 'Kode PT disalin'))
      : E('span', { class: 'cp-muted', text: 'Tidak terdaftar di PDDikti (lembaga kursus)' });
    if (veil()) {
      kids.push(note('Kontak disembunyikan saat nama disamarkan.', 'is-strong'));
      kids.push(crow('Kode PT', code));
    } else {
      var none = !c.phones.length && !c.email && !c.website && !c.websiteDropped;
      if (none) kids.push(note(r.kode ? 'Kontak kampus belum tercatat di PDDikti.' : 'Kontak lembaga ini belum tercatat.'));
      else {
        var ph = E('div', { class: 'cp-phones' });
        c.phones.forEach(function (p) {
          var line = E('span', { class: 'cp-phone' },
            p.tel && !p.noArea ? E('a', { href: p.tel, class: 'cp-tel', title: 'Hubungi melalui aplikasi telepon di perangkat ini.', text: p.display }) : E('span', { class: 'cp-tel is-plain', text: p.display }),
            p.noArea ? E('span', { class: 'cp-tag', title: 'Nomor ini tercatat tanpa kode area. Tambahkan kode area saat menelepon dari ponsel.', text: 'tanpa kode area' }) : null,
            p.mobile ? E('span', { class: 'cp-tag', title: 'Nomor seluler yang tercatat sebagai kontak lembaga di PDDikti.', text: 'seluler' }) : null,
            copyBtn('Salin nomor telepon', p.display, 'Nomor telepon disalin'));
          ph.appendChild(line);
        });
        kids.push(crow('Telepon', c.phones.length ? ph : E('span', { class: 'cp-muted', text: 'Telepon belum tercatat.' }), c.phones.length ? srcP : null));
        kids.push(crow('E-mail', c.email ? E('span', { class: 'cp-code' }, E('a', { href: 'mailto:' + c.email.value, class: 'cp-mail', title: 'Tulis e-mail dengan aplikasi e-mail di perangkat ini.', text: c.email.value }), copyBtn('Salin alamat e-mail', c.email.value, 'Alamat e-mail disalin'))
          : E('span', { class: 'cp-muted', text: 'E-mail belum tercatat.' }), c.email ? srcP : null));
      }
      kids.push(crow('Kode PT', code, c.id ? srcP : null));
      if (!none || c.websiteDropped) {
        var w = c.website, wv;
        if (w && w.link) {
          var extra = w.checked === 'dialihkan' ? '\nSitus ini terbuka di alamat lain milik lembaga yang sama.' : w.checked === 'belum' ? '\nAlamat dari daftar resmi, belum diperiksa.' : '';
          wv = E('span', { class: 'cp-webv' }, extLink(w.url, w.host, 'Buka situs resmi di tab baru. Perlu internet.' + extra, 'cp-web'), w.https ? null : E('span', { class: 'cp-note', text: 'Situs ini tidak menggunakan HTTPS.' }));
        } else if (w && w.checked === 'gagal') wv = E('span', { class: 'cp-webv' }, E('span', { class: 'cp-mono', text: w.host }), E('span', { class: 'cp-note', text: 'Situs resmi tidak dapat dibuka saat diperiksa.' }));
        else if (c.websiteDropped) wv = E('span', { class: 'cp-muted', text: c.websiteDroppedText || 'Alamat situs di daftar resmi tidak ditampilkan karena tidak aktif atau tidak aman.' });
        else wv = E('span', { class: 'cp-muted', text: 'Situs resmi belum tercatat.' });
        kids.push(crow(w && w.social ? 'Halaman resmi' : 'Situs resmi', wv, w ? C.srcWords(w.src) : null));
      }
    }
    if (c.akreditasi) kids.push(crow('Akreditasi', E('span', { text: c.akreditasi }), 'Seperti tercatat di PDDikti'));
    if (c.address && !veil()) kids.push(crow('Alamat', E('span', { text: c.address }), r.kode ? srcP : null));
    var idRows = E('div', { class: 'cp-ident' });
    (identity || []).forEach(function (x) { idRows.appendChild(kv(x[0], x[1])); });
    idRows.appendChild(kv('Titik di peta', pointWords(r.coord)));
    kids.push(E('div', { class: 'cp-crow cp-crow--id' }, E('span', { class: 'cp-crow__k', text: 'Identitas' }), idRows));
    if (r.kode) kids.push(E('p', { class: 'cp-src' }, logo('pddikti'), E('span', { text: 'Data mahasiswa dan dosen: PDDikti' })));
    if (c.refUrl && !veil()) kids.push(E('p', { class: 'cp-line' }, extLink(c.refUrl, c.refLabel || 'Cari di PDDikti', 'Buka pencarian PDDikti dengan nama ini, di tab baru. PDDikti tidak memiliki alamat tetap per perguruan tinggi. Perlu internet.')));
    var first = !veil() && c.phones && c.phones[0] ? c.phones[0].display : null;
    var pv = [first, c.id ? 'Kode PT ' + c.id.value : 'tidak terdaftar di PDDikti'].filter(Boolean).join(' · ');
    return blk('Kontak & identitas', kids, 'cp-dd--kontak', { id: 'kontak', preview: pv, open: false });
  }
  function pointWords(coord) {
    return { osm: 'OpenStreetMap', overture: 'Overture Maps', dapodik: 'Dapodik', alamat: 'alamat resmi', 'alamat-kelurahan': 'pusat kelurahan dari alamat resmi', 'alamat-kecamatan': 'pusat kecamatan dari alamat resmi', registri: 'titik registri PDDikti' }[coord] || 'belum diketahui';
  }
  /** The points of the PT in scope: the main campus first, then the other campuses (each "Tampilkan rute"). */
  function pointsOf(r) {
    var out = [{ id: r.id, kind: 'campus', name: 'Kampus utama', pt: r }];
    (C.index().sites || []).forEach(function (s) { if (s.row === r && isNum(s.km) && s.km <= st.km) out.push({ id: s.id, kind: 'campusSite', name: s.name, pt: s }); });
    return out;
  }
  function routeBlock(r, site, trail) {
    var kids = [], cur = site || r, f = fm();
    var list = E('div', { class: 'cp-rts', role: 'list' });
    pointsOf(r).forEach(function (p) {
      var d = distOf(p.pt), on = (site ? site.id : r.id) === p.id;
      var b = on ? E('span', { class: 'cp-rt__on', text: 'Rute tampil' }) : link('Tampilkan rute', function () { selectPoint(p, trail); }, 'cp-rt__go', 'Tampilkan rute dari KCP ke titik ini');
      list.appendChild(E('div', { class: 'cp-rt' + (on ? ' is-on' : ''), role: 'listitem' }, E('span', { class: 'cp-rt__n', text: p.name }), E('span', { class: 'cp-rt__d', text: distText(d), title: distTip(d) }), b));
    });
    kids.push(list);
    var kel = C.kelName(cur.kelurahanId), kec = cur.kecamatanId ? C.kecName(cur.kecamatanId) : null;
    if (kec) kids.push(kv('Wilayah', (kel ? 'Kel. ' + kel + ' · ' : '') + 'Kec. ' + kec + (C.kotaWord(cur.kecamatanId) ? ' · ' + C.kotaWord(cur.kecamatanId) : '')));
    kids.push(kv('Jarak dari Mabes TNI', isNum(cur.km) ? f.km(cur.km) : '—'));
    if (!site && r.coordConf === 'rendah') kids.push(note('Titik kampus perkiraan dari alamat resmi.', 'is-strong'));
    if (r.mainOutside && !site) kids.push(note('Kampus utama di ' + (r.mainOutside.kota || 'luar wilayah ini') + ', di luar 30 km. Titik ini kampus terdekat dalam 30 km.'));
    var zoomB = btn('Perbesar ke kampus', 'target', function () { focusMapPt(cur); }, 'btn--secondary btn--bar');
    var rl = veil() ? null : routeUrl(cur.lon, cur.lat);
    kids.push(E('div', { class: 'cp-actions' }, zoomB, rl ? E('a', { class: 'btn btn--secondary btn--bar gmaps-link gmaps-link--route', href: rl, target: '_blank', rel: 'noopener noreferrer', attrs: { referrerpolicy: 'no-referrer' }, title: ROUTE_TIP }, icon('external'), E('span', { text: ROUTE_LABEL })) : null));
    return blk('Jarak & rute dari KCP', kids, 'cp-dd--rute', { id: 'rute', preview: (site ? site.name + ' · ' : 'Kampus utama · ') + distShort(distOf(cur)), open: false });
  }
  /*
   * Merchant tier chips of the listed shops (Sasaran EDC / Sasaran LVM / Jaringan nasional, §6.5 fold 6). The first
   * MCD.sme.tierOfRow() call scores the whole Merchant file (≈ 220 ms), so Kampus never starts it while a card opens
   * (§9.3: card open ≤ 33 ms; fix round 19 Oct 2026). The chips are worked out only for an open fold, after the camera
   * flight has landed, then written into their places (no card rebuild). When the Merchant engine says its scores are
   * ready (MCD.sme.tiersReady(), when it has one) they show at once.
   */
  var POI_TIER = {};
  function poiTier(i) {
    if (Object.prototype.hasOwnProperty.call(POI_TIER, i)) return POI_TIER[i];
    return undefined;
  }
  function smeScored() { var Sm = MCD.sme; try { return !!(Sm && isFn(Sm.tiersReady) && Sm.tiersReady()); } catch (e) { return false; } }
  function scorePoiTiers(list) {
    var Sm = MCD.sme, L = MCD.lvm;
    list.forEach(function (i) {
      if (poiTier(i) !== undefined) return;
      var t = null;
      try {
        var ps = L && isFn(L.poiStatus) && !demoOn() ? L.poiStatus(i) : null;     /* LVM status only from a real import */
        if (ps && ps.status === 'acquired') t = { text: 'Telah diakuisisi', tone: 'ok' };
        else if (Sm && isFn(Sm.tierOfRow)) { var id = Sm.tierOfRow(i); if (id) t = { text: (Sm.TIERS && Sm.TIERS[id] && Sm.TIERS[id].short) || TIER_WORD[id] || id, tone: id === 'nasional' ? 'none' : id === 'lvm' ? 'potential' : 'mid' }; }
      } catch (e) { t = null; }
      POI_TIER[i] = t;
    });
  }
  /** Write the known tiers into the chip places under root (default: the page, so the card and any pinned copy). */
  function paintPoiTiers(root) {
    var els = (root || document).querySelectorAll('.cp-near__tier[data-poi]') || [];
    for (var k = 0; k < els.length; k++) {
      var el = els[k], t = POI_TIER[el.getAttribute('data-poi')];
      if (!t) continue;
      el.textContent = t.text;
      el.className = 'cp-tag cp-near__tier is-' + t.tone;
      el.hidden = false;
    }
  }
  /** Run fn once the map is still (the card's camera flight has landed), then in an idle moment. */
  function afterFlight(fn) {
    var M = MCD.map, m = null, done = false, off = null;
    try { m = M && isFn(M.getMap) ? M.getMap() : null; } catch (e) { m = null; }
    function go() { if (done) return; done = true; if (isFn(off)) { try { off(); } catch (e) { /* ignore */ } } idle(fn, 200); }
    var moving = false;
    try { moving = !!(m && isFn(m.isMoving) && m.isMoving()); } catch (e) { moving = false; }
    if (!moving || !isFn(M.on)) { go(); return; }
    off = M.on('camera', function () { var still = true; try { still = !m.isMoving(); } catch (e) { still = true; } if (still) go(); });
    if (isFn(off)) offs.push(off);
    later(go, 4000);
  }
  /** The fold is open now (by a click on its heading, or opened by MCD.windows): fill its chips after the flight. */
  function wantPoiTiers(blk, list) {
    if (!list.length || blk.__cpTierQueued || blk.classList.contains('is-folded')) return;
    blk.__cpTierQueued = true;
    afterFlight(function () { if (!ctx) return; scorePoiTiers(list); paintPoiTiers(); });
  }
  function watchPoiTiers(blk, list) {
    if (!list.length) return;
    if (list.every(function (i) { return poiTier(i) !== undefined; })) return;
    if (smeScored()) { scorePoiTiers(list); paintPoiTiers(blk); return; }
    /* a click on the fold heading (MCD.windows toggles it first, the click then reaches the block) */
    blk.addEventListener('click', function (e) {
      var t = e && e.target;
      if (t && t.closest && t.closest('.ws-fold__btn')) later(function () { wantPoiTiers(blk, list); }, 0);
    });
    /* a fold that is already open once the card is placed (from the Merchant sekitar tab, or remembered open) */
    later(function () { if (ctx && blk.isConnected) wantPoiTiers(blk, list); }, 400);
  }
  function kantinBlock(r, site) {
    var k = (site ? site.kantin : r.kantin) || null, kids = [], f = fm(), poiList = [];
    if (!k || !k.total) {
      kids.push(note('Belum ada usaha yang tercatat dalam 400 m dari titik ini.'));
    } else {
      kids.push(E('p', { class: 'cp-line cp-line--lead', text: C.kantinLead(k) }));
      kids.push(E('p', { class: 'cp-line', text: C.kantinText(k) }));
      if (C.chainLine(k)) kids.push(note(C.chainLine(k)));
      var near = C.near(k, 5);
      if (near.length) {
        kids.push(E('h4', { class: 'cp-h4', text: 'Terdekat dari kampus' }));
        var ul = E('ul', { class: 'cp-near' });
        near.forEach(function (n) {
          var chipsEl = [];
          if (n.chain) chipsEl.push(E('span', { class: 'cp-tag', text: 'Jaringan nasional' }));
          else if (n.poi != null) {
            /* the tier chip's place: filled now when the tier is known, else once the fold is open and the map still */
            poiList.push(n.poi);
            var t = poiTier(n.poi);
            chipsEl.push(E('span', { class: 'cp-tag cp-near__tier' + (t ? ' is-' + t.tone : ''), hidden: !t, text: t ? t.text : '', attrs: { 'data-poi': String(n.poi) } }));
          }
          var act = null;
          if (n.poi != null) act = link('Lihat di Merchant', function () { if (MCD.app && isFn(MCD.app.focus)) MCD.app.focus({ section: 'merchants', kind: 'poi', id: String(n.poi), lon: n.lon, lat: n.lat }); }, 'cp-near__go', 'Buka usaha ini di bagian Merchant');
          else if (!veil()) { var u = gmapsUrl({ lat: n.lat, lon: n.lon }); if (u) act = extLink(u, 'Buka di Google Maps', GM_TIP, 'cp-near__go'); }
          ul.appendChild(E('li', { class: 'cp-near__row' }, E('span', { class: 'cp-near__name', text: n.name }), E('span', { class: 'cp-near__meta', text: [n.groupWord, isNum(n.m) ? f.int(n.m) + ' m' : null].filter(Boolean).join(' · ') }), chipsEl, act));
        });
        kids.push(ul);
      }
    }
    kids.push(note(KANTIN_FLOOR));
    var pt = site || r;
    if (isNum(pt.km) && pt.km <= 15) {
      kids.push(E('div', { class: 'cp-actions' }, btn('Lihat merchant di sekitar kampus', 'map', function () {
        if (!ctx) return;
        var lon = pt.lon, lat = pt.lat;
        ctx.navigate('merchants', { action: 'campus:near', fallback: function () {
          var Sm = MCD.sme;
          if (Sm && isFn(Sm.setView)) { try { Sm.setView({ mode: 'merchants' }, { temporary: true }); } catch (e) { /* the map keeps its mode */ } }
          if (MCD.map && isFn(MCD.map.flyTo)) MCD.map.flyTo({ center: [lon, lat], zoom: 16 });
        } });
      }, 'btn--secondary btn--bar', 'Buka peta Merchant di titik kampus ini')));
    }
    var b = blk('Merchant sekitar kampus', kids, 'cp-dd--kantin', { id: 'kantin', preview: k && k.total ? count(k.total, 'usaha') + ' dalam 400 m' : 'belum tercatat', open: false });
    watchPoiTiers(b, poiList);
    return b;
  }
  function programmeLines() {
    var cfg = MCD.schools && MCD.schools.config, list = cfg && Array.isArray(cfg.programmes) ? cfg.programmes : [], f = fm(), out = [];
    var daysLeft = MCD.schools && isFn(MCD.schools.daysLeft) ? MCD.schools.daysLeft : null;
    list.filter(function (p) { return p.id === 'gempita-2026' || p.id === 'lvm-mdr'; }).forEach(function (p) {
      var left = daysLeft ? daysLeft(p.end) : null;
      out.push(E('li', { class: 'cp-prog' + (left != null && left < 0 ? ' is-ended' : '') }, E('b', { text: p.label }),
        E('span', { text: ' · ' + (left != null && left < 0 ? 'berakhir ' + f.date(p.end) : 'berlaku sampai ' + f.date(p.end) + (left != null ? ' · ' + count(left, 'hari') + ' lagi' : '')) })));
    });
    return out;
  }
  function productBlock(r) {
    function line(head, logos, text) { return E('div', { class: 'cp-prod' }, E('p', { class: 'cp-prod__h' }, E('b', { text: head }), logos), E('p', { class: 'cp-prod__t', text: text })); }
    var kids = [
      line('Payroll', logo('kopra', 'cp-logo--md'), 'Tawarkan payroll dosen dan tendik melalui kerja sama dengan pimpinan kampus atau yayasan.'),
      line('Kantin dan koperasi', E('span', { class: 'cp-prodlogos' }, logo('lvm', 'cp-logo--sm'), logo('qris', 'cp-logo--sm')), 'Ajak menjadi Livin’ Merchant (QRIS). Tawarkan EDC untuk tempat dengan transaksi besar.'),
      line('Mahasiswa', null, 'Tabungan dan Livin’ by Mandiri untuk mahasiswa, misalnya saat penerimaan mahasiswa baru. GEMPITA 2026 berlaku untuk kampus.'),
      line('Biaya kuliah', null, 'Penagihan biaya kuliah melalui Kopra Mandiri Bill Collection.')
    ];
    if (r.status === 'kedinasan') kids.push(note('Kampus kedinasan dikelola kementerian atau lembaga. Tanyakan siapa yang menentukan bank penyalur gaji.', 'is-strong'));
    var pl = programmeLines();
    if (pl.length) kids.push(E('ul', { class: 'cp-progs' }, pl));
    return blk('Produk sasaran', kids, 'cp-dd--prod', { id: 'produk', preview: 'Payroll · QRIS kantin · Tabungan mahasiswa', open: false });
  }
  function pipelineEditor(key, label) {
    var p = P(), cur0 = pipeGet(key) || {};
    var stage = E('select', { class: 'select', aria: { label: 'Tahap' } }, C.stages().map(function (s) { return E('option', { value: s.id, text: s.label }); }));
    stage.value = cur0.stage || 'baru';
    var ownerIn = E('input', { class: 'input', type: 'text', maxlength: 60, placeholder: 'Kode atau nama staf', value: cur0.owner || '', aria: { label: 'Penanggung jawab' } });
    var prog = E('select', { class: 'select', aria: { label: 'Program' } }, C.PROGRAMS.map(function (x) { return E('option', { value: x.id, text: x.label }); }));
    prog.value = cur0.program || '';
    var prods = E('div', { class: 'cp-checks', role: 'group', aria: { label: 'Produk sasaran' } });
    var boxes = C.PRODUCTS.map(function (x) {
      var cb = E('input', { type: 'checkbox', value: x.id });
      cb.checked = (cur0.products || []).indexOf(x.id) >= 0;
      prods.appendChild(E('label', { class: 'cp-check' }, cb, E('span', { text: x.short }), x.id === 'LVM' ? logo('qris', 'cp-logo--xs') : null));
      return cb;
    });
    var next = E('input', { class: 'input', type: 'text', maxlength: 120, placeholder: 'Langkah berikutnya', value: cur0.nextStep || '', aria: { label: 'Langkah berikutnya' } });
    var nextDate = E('input', { class: 'input', type: 'date', value: cur0.nextDate || '', aria: { label: 'Tanggal langkah berikutnya' } });
    var last = E('input', { class: 'input', type: 'date', value: cur0.lastContact || '', aria: { label: 'Kontak terakhir' } });
    var noteIn = E('textarea', { class: 'input cp-ta', maxlength: 500, rows: 3, placeholder: NOTE_PH, aria: { label: 'Catatan' } });
    noteIn.value = cur0.note || '';
    var msg = E('p', { class: 'cp-pmsg', aria: { live: 'polite' } });
    var save = btn(pipeGet(key) ? 'Simpan' : 'Tambahkan ke tindak lanjut', 'check', function () {
      var res;
      try {
        res = p.set(key, { stage: stage.value, owner: ownerIn.value, program: prog.value, nextStep: next.value, nextDate: nextDate.value, lastContact: last.value, note: noteIn.value,
          products: boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }) }, { label: label });
      } catch (e) { res = { ok: false, error: 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' }; }
      msg.textContent = res && res.ok ? (pipeState().ok ? 'Tersimpan di komputer ini · ' : '') + C.stageLabel(res.entry.stage) : (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.';
      msg.classList.toggle('is-warn', !(res && res.ok));
      if (res && res.ok) { var t = save.querySelector('span'); if (t) t.textContent = 'Simpan'; if (!rm.parentNode) acts.appendChild(rm); afterPipe(); }
    }, 'btn--primary btn--bar');
    var rm = btn('Hapus', 'close', function () { try { p.remove(key); } catch (e) { /* ignore */ } msg.textContent = 'Dihapus dari daftar tindak lanjut'; afterPipe(); }, 'btn--ghost btn--bar');
    function fl(lbl, ctl) { return E('label', { class: 'cp-pf' }, E('span', { class: 'cp-pf__l', text: lbl }), ctl); }
    var acts = E('div', { class: 'cp-actions' }, save, pipeGet(key) ? rm : null);
    var block = blk('Tindak lanjut', [
      pipeStateEl('cp-pstate--card'),
      E('div', { class: 'cp-pgrid' }, fl('Tahap', stage), fl('Penanggung jawab', ownerIn), fl('Program', prog), fl('Tanggal langkah berikutnya', nextDate), fl('Kontak terakhir', last)),
      fl('Langkah berikutnya', next), E('div', { class: 'cp-pf' }, E('span', { class: 'cp-pf__l', text: 'Produk sasaran' }), prods),
      fl('Catatan', noteIn), msg, acts
    ], 'cp-dd--pipe', { id: 'pipe', preview: cur0.stage ? C.stageLabel(cur0.stage) : 'belum ada', open: false });
    block.setAttribute('data-pipe-key', key);
    if (building !== 'pin') pipeEds[key] = { el: block, sync: function () {
      var c = pipeGet(key);
      if (!c) return;
      stage.value = c.stage || 'baru';
      var t = save.querySelector('span'); if (t) t.textContent = 'Simpan';
      if (!rm.parentNode) acts.appendChild(rm);
      msg.textContent = (pipeState().ok ? 'Tersimpan di komputer ini · ' : '') + C.stageLabel(c.stage);
      msg.classList.remove('is-warn');
    } };
    return block;
  }
  function afterPipe() { if (ui && ui.work && ui.work.pipe) renderPipe(true); }
  function doneOf(key, entry) {
    var s = pipeState();
    /* §7.6: the words stay; the title adds the storage line (the shell's paintDone shows it on the kept row) */
    return { label: '✓ Di tindak lanjut', text: s.ok ? 'Tersimpan di komputer ini · ' + C.stageLabel(entry && entry.stage) : s.text, title: s.ok ? SEALED_TITLE : null,
      editLabel: 'Ubah', edit: function () { return editPipe(key); } };
  }
  function pipeQuick(r) {
    var key = r && C.validKey(r.id) ? r.id : null;
    var q = { id: 'pipe', label: '+ Tindak lanjut', title: key ? 'Tambahkan kampus ini ke daftar tindak lanjut. ' + (pipeState().ok ? SEALED_TITLE : MEM_LINE) : NO_KEY,
      run: function () { return quickAdd(key, r ? r.name : ''); }, edit: function () { return editPipe(key); } };
    if (!key) { q.disabled = true; return q; }
    var cur = pipeGet(key);
    if (cur) q.done = doneOf(key, cur);
    return q;
  }
  /** "+ Tindak lanjut" → {ok, text, done?, warn?}: stage "Belum dihubungi" (§6.9). */
  function quickAdd(key, label) {
    if (!key) return { ok: false, text: NO_KEY };
    var res = null;
    try { res = P().quickAdd(key, label); } catch (e) { res = null; }
    if (!res || !res.ok) return { ok: false, text: (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' };
    var rec = pipeEds[key];
    if (rec && isFn(rec.sync)) { try { rec.sync(); } catch (e) { /* ignore */ } }
    afterPipe();
    var d = doneOf(key, res.entry), s = pipeState();
    return { ok: true, text: d.text, done: d, warn: !s.ok };
  }
  function editPipe(key) {
    var el = null, list = document.querySelectorAll('.cp-dd--pipe') || [];
    for (var k = 0; k < list.length && !el; k++) if (list[k].getAttribute('data-pipe-key') === key && list[k].closest && list[k].closest('.drawer')) el = list[k];
    if (!el && pipeEds[key] && pipeEds[key].el && pipeEds[key].el.isConnected) el = pipeEds[key].el;
    if (!el) return false;
    var t = el.querySelector('.dd-blk__t'), b = t && t.querySelector('[aria-expanded="false"]');
    if (b) b.click();
    var f = el.querySelector('select, input, textarea');
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    return true;
  }
  function trailCrumb(kid) { var name = C.kecName(kid); return { id: String(kid), label: name, title: 'Kembali ke Kecamatan ' + name, run: function () { openKec(String(kid)); } }; }
  /** The callout and card head (≤ 2 chips, ≤ 3 numbers): Mahasiswa (big), Dosen tetap, "10,9 km" over "± 31 menit dari KCP". */
  function campusBrief(r, pt) {
    var f = fm(), d = distOf(pt), dp = distText(d, 'cell'), nums = [];
    var missM = C.isDesain(r) ? 'Jumlah siswa tidak tercatat di daftar resmi.' : 'Belum dilaporkan ke PDDikti';
    nums.push({ label: 'Mahasiswa', value: isNum(r.students) ? f.int(r.students) : '—', big: true,
      title: isNum(r.students) ? C.TOTAL_TITLE + (C.counted(r) ? '' : '\nTidak dihitung dalam jumlah 30 km.') : missM });
    nums.push({ label: 'Dosen tetap', value: isNum(r.dosenTetap) ? f.int(r.dosenTetap) : '—', title: isNum(r.dosenTetap) ? 'Dosen dengan homebase di perguruan tinggi ini (NIDN dan NIDK).' : (C.isDesain(r) ? 'Tidak terdaftar di PDDikti' : 'Belum dilaporkan ke PDDikti') });
    nums.push(dp.km && dp.km !== '—' ? { label: dp.min ? dp.min + ' dari KCP' : 'Dari KCP', value: dp.km, title: distShort(d) + '\n' + distTip(d) } : { label: 'Dari KCP', value: '—', title: distTip(d) });
    var noteObj = r.nationwide ? { text: 'Pendidikan jarak jauh. Tidak dihitung dalam jumlah 30 km.', tone: 'none' }
      : r.mainOutside ? { text: 'Kampus utama di luar 30 km. Tidak dihitung dalam jumlah 30 km.', tone: 'none' } : null;
    return { numbers: nums, chips: [symLabel(r), tierChip(tierOf(r))].filter(Boolean).slice(0, 2), primary: null, note: noteObj };
  }
  /**
   * The campus card. o.site: the selected campus point ('campusSite'), else the main point; o.trail: the kecamatan of
   * a card opened from that kecamatan's list (crumb "‹ Beji"; the map keeps its focus).
   */
  function campusModel(r, o) {
    o = o || {};
    if (!r) return null;
    var site = o.site || null, pt = site || r;
    var identity = [['Jenis', C.isDesain(r) ? 'Sekolah desain dan kursus' : C.jenisWord(r)], ['Status', C.statusWord(r).toLowerCase()]];
    if (r.kelompok) identity.push(['Kelompok', r.kelompok]);
    if (r.pembina) identity.push(['Pembina', r.pembina]);
    var body = [mhsBlock(r), payBlock(r), tierBlock(r), contactBlock(r, identity), routeBlock(r, site, o.trail), kantinBlock(r, site), productBlock(r)];
    body.push(C.validKey(r.id) ? pipelineEditor(r.id, r.name) : blk('Tindak lanjut', [note(NO_KEY)], 'cp-dd--pipe', { id: 'pipe', preview: 'tidak dapat dilacak', open: false }));
    if (o.fold) body.forEach(function (b) { if (b.getAttribute('data-fold') === o.fold) b.setAttribute('data-open', '1'); });
    var b = campusBrief(r, pt);
    return {
      kind: 'pt', key: 'campus:' + (site ? site.id : r.id),
      eyebrow: site ? ['Kampus lain', C.isDesain(r) ? 'Desain dan kursus' : C.jenisWord(r), C.statusWord(r), C.kotaWord(site.kecamatanId)].filter(Boolean).join(' · ') : C.eyebrow(r),
      title: r.name + (r.short ? ' (' + r.short + ')' : ''),
      tags: b.chips.map(function (n) { return n.cloneNode(true); }), body: body,
      gmaps: veil() ? null : { lat: pt.lat, lon: pt.lon },
      prov: SRC_LINE, provBadge: { src: LOGO.pddikti.src, alt: LOGO.pddikti.alt, width: 56, height: 24 }, brief: b, quick: [pipeQuick(r)],
      crumb: o.trail ? trailCrumb(o.trail) : null,
      anchor: [pt.lon, pt.lat], hints: []
    };
  }

  /* ============================================================ the kecamatan card (list first) */

  function kecAgg(kid) { return (V && V.kec[kid]) || { id: kid, name: C.kecName(kid), kota: C.kotaWord(kid), n: 0, k: 0, students: 0, dosen: 0, stuN: 0, rows: [] }; }
  function kecBrief(kid) {
    var a = kecAgg(kid), f = fm();
    return {
      numbers: [
        { label: 'Mahasiswa', value: a.stuN ? f.int(a.students) : '—', big: true, title: C.TOTAL_TITLE },
        { label: 'Kampus', value: f.int(a.n), title: count(a.n, 'perguruan tinggi') + ' dalam ' + st.km + ' km' + (a.k ? '.\nDitambah ' + count(a.k, 'sekolah desain dan kursus') + ', dihitung terpisah.' : '') },
        { label: 'Dosen tetap', value: f.int(a.dosen), title: 'Dosen dengan homebase di perguruan tinggi (NIDN dan NIDK). ' + C.TENDIK_LINE }
      ],
      chips: [], primary: { label: 'Lihat kampus di kecamatan ini', run: function () { openKec(kid); } }, note: null
    };
  }
  function kecAnchor(kid) {
    var T = territory(), A = admin(), b = null, rec = null;
    try { b = T && isFn(T.boundsOf) ? T.boundsOf(kid) : null; } catch (e) { b = null; }
    try { rec = A ? A.byId(kid) : null; } catch (e) { rec = null; }
    if (!b && rec && rec.geometry && isFn(A.coordinates)) {
      try {
        var c = A.coordinates(rec), polys = rec.geometry.type === 'Polygon' ? [c] : c, bb = [Infinity, Infinity, -Infinity, -Infinity];
        polys.forEach(function (pg) { pg[0].forEach(function (q) { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); }); });
        if (isFinite(bb[0])) b = [[bb[0], bb[1]], [bb[2], bb[3]]];
      } catch (e) { b = null; }
    }
    var lb = rec && Array.isArray(rec.label) ? [rec.label[0], rec.label[1]] : (b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : null);
    return b ? { bbox: b, label: lb } : lb;
  }
  function kecRow(r, kid) {
    var d = distOf(r), dp = distText(d, 'cell');
    var meta = [isNum(r.students) ? count(r.students, 'mahasiswa') + (C.counted(r) ? '' : ' (tidak dihitung)') : (C.isDesain(r) ? 'tanpa data siswa' : 'mahasiswa belum dilaporkan'), dp.km && dp.km !== '—' ? dp.km + (dp.min ? ' · ' + dp.min : '') : null].filter(Boolean).join(' · ');
    var b = E('button', { type: 'button', class: 'dd-list__row cp-kl__row has-sym', title: 'Buka ' + r.name + ' di kartu ini' }, symChip(r),
      E('span', { class: 'dd-list__name', text: r.name }), E('span', { class: 'dd-list__meta', text: meta, title: distTip(d) }));
    b.addEventListener('click', function () { openInTrail(r, kid); });
    return b;
  }
  function kecModel(kid, o) {
    o = o || {};
    if (!V) return null;
    var a = kecAgg(kid), f = fm(), listFirst = o.listFirst !== false, name = a.name;
    var rows = C.sort(a.rows, 'mhs');
    var figs = [
      kv('Kampus dalam ' + st.km + ' km', f.int(a.n)),
      a.k ? kv('Sekolah desain dan kursus', f.int(a.k), 'Tidak terdaftar di PDDikti, dihitung terpisah.') : null,
      kv('Mahasiswa', a.stuN ? f.int(a.students) : '—', C.TOTAL_TITLE),
      kv('Dosen tetap', f.int(a.dosen)),
      note(C.TENDIK_LINE),
      E('div', { class: 'cp-actions' }, btn('Perbesar ke kecamatan', 'target', function () { zoomKec(kid); }, 'btn--secondary btn--bar'))
    ];
    var fb = blk('Angka kecamatan', figs.filter(Boolean), null, { id: 'angka', preview: count(a.n, 'kampus') + ' · ' + (a.stuN ? count(a.students, 'mahasiswa') : 'mahasiswa belum dilaporkan'), open: !listFirst });
    var list = E('div', { class: 'dd-list cp-kl', role: 'list', aria: { label: 'Kampus di ' + name } });
    rows.slice(0, KL_MAX).forEach(function (r) { list.appendChild(E('div', { role: 'listitem', class: 'cp-kl__li' }, kecRow(r, kid))); });
    var emptyKids = [];
    if (!rows.length) {
      if (st.km <= 15) emptyKids.push(E('p', { class: 'cp-note' }, E('span', { text: 'Tidak ada kampus dalam ' + st.km + ' km di kecamatan ini. ' }), link('Pilih 30 km untuk melihat lebih banyak.', function () { setKm(30); if (ctx) ctx.select({ kind: 'cpKec', id: kid, extra: { kecamatanId: kid } }); })));
      else emptyKids.push(note(filterCount() ? EMPTY_FILTER : 'Tidak ada kampus dalam 30 km di kecamatan ini.'));
    }
    var more = link('Lihat semua di daftar', function () { goTab('kec'); }, 'cp-kl__more', 'Buka tab Kecamatan di Daftar & grafik');
    var lb = blk('Kampus di ' + name + ', mahasiswa terbanyak', [rows.length ? list : null].concat(emptyKids, [
      rows.length > KL_MAX ? note('+' + (rows.length - KL_MAX) + ' lainnya. Perbesar peta untuk melihat setiap kampus.') : null,
      E('p', { class: 'cp-kl__foot' }, more)
    ]), 'cp-dd--klist', { id: 'daftar', preview: nkWords(a), open: true });
    if (listFirst) { lb.classList.remove('dd-blk'); lb.classList.add('cp-kl-blk'); }
    var kb = kecBrief(kid);
    if (listFirst) kb.primary = null;
    return { kind: 'kec', key: 'kec:' + kid, eyebrow: ('Kecamatan' + (a.kota ? ' · ' + a.kota : '')).toUpperCase(), title: name, body: listFirst ? [lb, fb] : [fb, lb],
      gmaps: { q: 'Kecamatan ' + name + (a.kota ? ', ' + a.kota : '') }, listFirst: listFirst, prov: SRC_LINE + '; ' + SRC_AREAS, brief: kb, anchor: kecAnchor(kid), hints: [] };
  }
  function kecPopup(kid) {
    if (!V) return {};
    var a = kecAgg(kid), f = fm(), rec = admin() ? admin().byId(kid) : null;
    return {
      rows: [
        { label: 'Kampus dalam ' + st.km + ' km', value: f.int(a.n) },
        { label: 'Mahasiswa', value: a.stuN ? f.int(a.students) : '—' },
        { label: 'Dosen tetap', value: f.int(a.dosen) },
        { label: 'Jarak dari Mabes TNI', value: rec && isNum(rec.distKm) ? f.km(rec.distKm) : '—' }
      ],
      big: { value: a.stuN ? f.int(a.students) : f.int(a.n), caption: a.stuN ? 'Mahasiswa' : 'Kampus' },
      chip: null, demo: false, kind: 'kec', key: 'kec:' + kid, brief: kecBrief(kid), anchor: kecAnchor(kid), source: 'Sumber: ' + SRC_SHORT + ' · ' + SRC_AREAS
    };
  }

  /* ============================================================ map */

  function selPoint(sel) {
    if (!sel || !C.ready()) return null;
    if (sel.kind === 'campus') return C.row(sel.id);
    if (sel.kind === 'campusSite') return C.site(sel.id);
    return null;
  }
  function highlight(ids, ms) {
    clearTimeout(hlTimer);
    hl = ids && ids.length ? { set: new Set(ids), key: ids.slice(0, 8).join(',') + ':' + ids.length } : { set: null, key: '' };
    requestRender();
    if (hl.set) hlTimer = setTimeout(function () { highlight(null); }, ms || 6000);
  }
  function rgba(c, a) { return [c[0], c[1], c[2], a == null ? 255 : a]; }
  function shortName(s) { s = String(s || ''); return s.length > 34 ? s.slice(0, 33) + '…' : s; }
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
  function tipCampus(r) {
    if (!r) return null;
    var d = distOf(r), lines = [];
    var c = C.sym.colours(uiTheme())[C.sym.spec(r).tone];
    lines.push({ glyph: C.sym.spec(r).glyph, rgb: c, text: C.sym.words(r) });
    lines.push({ kind: 'body', text: (isNum(r.students) ? count(r.students, 'mahasiswa') : (C.isDesain(r) ? 'Jumlah siswa tidak tercatat' : 'Mahasiswa belum dilaporkan')) + (isNum(r.dosenTetap) ? ' · ' + count(r.dosenTetap, 'dosen tetap') : '') });
    if (!C.counted(r) && !C.isDesain(r)) lines.push({ text: r.nationwide ? 'Pendidikan jarak jauh, tidak dihitung' : 'Kampus utama di luar 30 km, tidak dihitung' });
    lines.push({ kind: 'meta', text: 'Jarak dari KCP · ' + distText(d) });
    lines.push({ kind: 'body', text: 'Klik untuk melihat detail' });
    return { eyebrow: C.eyebrow(r).toUpperCase(), title: r.name, lines: lines };
  }
  function tipSite(s) {
    if (!s) return null;
    var d = distOf(s);
    return { eyebrow: ('Kampus lain · ' + C.eyebrow(s.row)).toUpperCase(), title: s.name, lines: [{ kind: 'body', text: s.row.name }, { kind: 'meta', text: 'Jarak dari KCP · ' + distText(d) }, { kind: 'body', text: 'Klik untuk melihat detail' }] };
  }
  function tipKec(kid) {
    if (!kid || !V) return null;
    var a = kecAgg(kid), lines = [];
    if (!(a.n + a.k)) lines.push({ kind: 'body', text: 'Tidak ada kampus dalam ' + st.km + ' km di kecamatan ini.' });
    else {
      lines.push({ kind: 'body', text: nkWords(a) + ' dalam ' + st.km + ' km' });
      lines.push({ text: (a.stuN ? count(a.students, 'mahasiswa') : 'Mahasiswa belum dilaporkan') + ' · ' + count(a.dosen, 'dosen tetap') });
    }
    lines.push({ kind: 'meta', text: 'Klik untuk melihat angkanya' });
    return { eyebrow: ('Kecamatan' + (a.kota ? ' · ' + a.kota : '')).toUpperCase(), title: a.name, lines: lines };
  }
  function terrStats() {
    if (!V) return null;
    if (V.terr) return V.terr;
    var kec = {};
    Object.keys(V.kec).forEach(function (id) { var a = V.kec[id], n = a.n + a.k; kec[id] = { potential: n, acquired: null, notYet: null, edc: null, unlisted: null, coverage: null, band: n ? 'potential' : 'noData', ranked: false }; });
    V.terr = { key: 'cp|' + V.sig, hasBank: false, demo: false, rule: 'known', bands: { ok: 0.5, mid: 0.2 }, categories: [], bandMode: 'relative',
      relative: { kecamatan: null, kelurahan: null }, totals: { potential: V.rows.length }, kecamatan: kec, kelurahan: {} };
    return V.terr;
  }
  /** The kecamatan chip: "Beji · 3 kampus" counts PDDikti campuses only (D13); a kecamatan with design schools alone says so. */
  function kecLabel(k) {
    var a = V && V.kec[k.id], nm = kecShown(k.id, k.chipName || k.name);
    if (!a) return nm;
    if (a.n) return nm + ' · ' + count(a.n, 'kampus');
    return a.k ? nm + ' · ' + count(a.k, 'sekolah desain') : nm;
  }
  /** integration 22 Oct 2026: the kecamatan name on a chip or a ranking row, qualified for the two repeated names
      ("Cipayung (Depok)", "Setu (Tangsel)") through MCD.territory.chipName; the plain name otherwise. */
  function kecShown(id, fallback) {
    var T = MCD.territory, nm = null;
    if (T && isFn(T.chipName)) { try { nm = T.chipName(String(id)); } catch (e) { nm = null; } }
    return nm || fallback || (C ? C.kecName(String(id)) : String(id));
  }
  function terrLayers(out, ms) {
    var T = territory(), stats = terrStats();
    if (!T || !stats || !isFn(T.layers)) return;
    var res;
    try { res = T.layers({ id: 'campus-terr', ms: ms, stats: stats, selected: st.selKec || null, outside: 'outline', pickable: true, labelText: function (k) { return kecLabel(k); }, labelKey: stats.key }); } catch (e) { return; }
    (res.base || []).forEach(function (L) {
      if (L && /-kec-fill$/.test(L.id) && isFn(L.clone) && L.props && L.props.mcd) L = L.clone({ mcd: Object.assign({}, L.props.mcd, { tooltip: function (o) { return o && o.kec ? tipKec(o.kec) : null; } }) });
      out.base.push(L);
    });
    (res.top || []).forEach(function (L) { out.top.push(L); });
  }
  var TIER_ATL = {};
  /** Kelas biaya badges (D6): only while the filter is on or from zoom 14, and only when the map draws the sprite. */
  function tierBadges(out, ms, rows, zq) {
    var M = MCD.map, D = window.deck;
    if (!M || !isFn(M.tierSprite) || !isFn(M.spriteAtlas) || !D || !D.IconLayer || tierState() !== 'ready') return;
    if (!tierFilterOn() && !(ms.zoom >= 14)) return;
    var theme = ms.theme === 'day' ? 'day' : 'night';
    var A = TIER_ATL[theme];
    if (!A) {
      var list = [], ids = {};
      try {
        [1, 2, 3, 4].forEach(function (lv) { ['biaya', 'perkiraan'].forEach(function (bs) { var sp = M.tierSprite({ level: lv, basis: bs, theme: theme, px: 14 }); if (sp && sp.canvas) { list.push(sp); ids[lv + '|' + (bs === 'perkiraan' ? 'e' : 'f')] = sp.id; } }); });
        var at = M.spriteAtlas(list);
        if (at && at.iconAtlas) { A = TIER_ATL[theme] = { atlas: at.iconAtlas, mapping: at.iconMapping, ids: ids }; }
      } catch (e) { A = null; }
    }
    if (!A) return;
    var data = [];
    rows.forEach(function (r) { var t = C.tierOf(r.id); if (t && t.level) data.push({ r: r, k: A.ids[t.level + '|' + (t.basis === 'perkiraan' ? 'e' : 'f')] }); });
    data = data.filter(function (x) { return x.k && A.mapping[x.k]; });
    if (!data.length) return;
    out.top.push(new D.IconLayer({
      id: 'campus-tier', data: data, iconAtlas: A.atlas, iconMapping: A.mapping, getIcon: function (x) { return x.k; },
      getPosition: function (x) { return [x.r.lon, x.r.lat]; }, getSize: 14, sizeUnits: 'pixels',
      getPixelOffset: function (x) { var px = C.sym.px(V.specs.get(x.r.id), zq); return [px * 0.55 + 4, -px * 0.55 - 3]; },
      getColor: function (x) { return [255, 255, 255, hl.set && !hl.set.has(x.r.id) ? 60 : 255]; },
      updateTriggers: { getPixelOffset: [zq], getColor: [hl.key] }, pickable: false, beforeId: ms.kit.beforeId
    }));
  }
  function mapLayers(derived, ms) {
    var D = window.deck, out = { base: [], top: [] };
    if (!D || !ms || !ms.kit || !C || !computeView()) return out;
    terrLayers(out, ms);
    var K = ms.kit, P0 = K.palette, z = ms.zoom, zq = ms.zoomQ, theme = ms.theme === 'day' ? 'day' : 'night';
    var SY = C.sym, atlas = SY.atlas(theme), rows = V.draw, sites = V.sites, hs = hl.set;
    var posR = function (r) { return [r.lon, r.lat]; };
    var siteSpec = function (s) { return SY.spec(s.row, { hollow: true }); };
    var metaR = { kind: 'campus', id: function (r) { return r.id; }, tooltip: function (r) { return tipCampus(r); } };
    var metaS = { kind: 'campusSite', id: function (s) { return s.id; }, tooltip: function (s) { return tipSite(s); } };
    if (atlas && D.IconLayer) {
      if (sites.length) out.base.push(new D.IconLayer({
        id: 'campus-sites', data: sites, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping,
        getIcon: function (s) { return siteSpec(s).key; }, getPosition: posR, getSize: function (s) { return SY.px(siteSpec(s), zq); }, sizeUnits: 'pixels',
        getColor: function (s) { return [255, 255, 255, hs && !hs.has(s.row.id) ? 50 : 235]; },
        updateTriggers: { getIcon: [V.sig, atlas.key], getSize: [zq], getColor: [hl.key] },
        pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 60], beforeId: K.beforeId, mcd: metaS
      }));
      out.base.push(new D.IconLayer({
        id: 'campus-icons', data: rows, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping,
        getIcon: function (r) { return V.specs.get(r.id).key; }, getPosition: posR, getSize: function (r) { return SY.px(V.specs.get(r.id), zq); }, sizeUnits: 'pixels',
        getColor: function (r) { return [255, 255, 255, hs && !hs.has(r.id) ? 60 : 255]; },
        updateTriggers: { getIcon: [V.sig, atlas.key], getSize: [V.sig, zq], getColor: [hl.key] },
        pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 70], beforeId: K.beforeId, mcd: metaR
      }));
    } else {
      var col = SY.colours(theme);
      out.base.push(new D.ScatterplotLayer({
        id: 'campus-dots', data: rows, getPosition: posR, radiusUnits: 'pixels', getRadius: function (r) { return SY.px(V.specs.get(r.id), zq) / 2.4; },
        filled: true, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 1, getFillColor: function (r) { return rgba(col[V.specs.get(r.id).tone], hs && !hs.has(r.id) ? 60 : 230); },
        getLineColor: rgba(P0.canvas, 215), updateTriggers: { getFillColor: [V.sig, hl.key, theme], getRadius: [V.sig, zq] },
        pickable: true, autoHighlight: true, highlightColor: rgba(P0.text1, 70), beforeId: K.beforeId, mcd: metaR
      }));
    }
    tierBadges(out, ms, rows, zq);
    var sel = MCD.state.get().selection, sp = selPoint(sel);
    if (sp) {
      var spSpec = sel.kind === 'campusSite' ? siteSpec(sp) : SY.spec(sp);
      out.top.push(new D.ScatterplotLayer({
        id: 'campus-sel', data: [sp], getPosition: posR, radiusUnits: 'pixels', getRadius: SY.px(spSpec, zq) / 2 + 7,
        filled: false, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.2, getLineColor: rgba(P0.signal, 255),
        updateTriggers: { getRadius: [zq] }, pickable: false, beforeId: K.beforeId
      }));
    }
    if (ms.fontsReady) {
      var lab = [];
      if (z >= 13.2) rows.forEach(function (r) { if (!hs || hs.has(r.id)) lab.push({ p: posR(r), t: z >= 14.6 ? shortName(r.name) : (r.short || shortName(r.name)), pr: (r.students || 0) / 1e6 + 1, dx: SY.px(V.specs.get(r.id), zq) / 2 + 5 }); });
      if (z >= 14.6) sites.forEach(function (s) { lab.push({ p: posR(s), t: shortName(s.name), pr: 0.5, dx: 10 }); });
      if (sp) lab.push({ p: posR(sp), t: shortName(sp.name), pr: 9, dx: 14 });
      lab = declutter(lab, z);
      if (lab.length) out.top.push(new D.TextLayer({
        id: 'campus-labels', data: lab, getPosition: function (o) { return o.p; }, getText: function (o) { return o.t; },
        getSize: 12, sizeUnits: 'pixels', fontFamily: K.fonts.sans, fontWeight: 600, characterSet: 'auto',
        getColor: rgba(P0.text1, 245), fontSettings: { sdf: true }, outlineWidth: 2.4, outlineColor: rgba(P0.canvas, 235),
        getPixelOffset: function (o) { return [o.dx || 14, 0]; }, getTextAnchor: 'start', getAlignmentBaseline: 'center',
        updateTriggers: { getColor: ms.palette }, pickable: false, beforeId: K.beforeId
      }));
    }
    return out;
  }
  function legend(derived, ms) {
    if (!V || !ms) return [];
    var theme = ms.theme === 'day' ? 'day' : 'night', groups = [];
    var counts = { univ: 0, st: 0 };
    V.rows.forEach(function (r) { if (C.group(r) === 'univ') counts.univ++; else counts.st++; });
    groups.push(C.sym.legend(theme, st.km, counts));
    var I = MCD.inst, badges = MCD.map && isFn(MCD.map.tierSprite) && tierState() === 'ready' && (tierFilterOn() || ms.zoom >= 14);
    if (badges) {
      var rows = null;
      if (I && isFn(I.tierLegendRows)) { try { rows = I.tierLegendRows(theme, { kind: 'kampus' }); } catch (e) { rows = null; } }
      groups.push({ id: 'campus-tier', title: 'Kelas biaya', rows: rows && rows.length ? rows : [
        { glyph: 'none', label: 'Reguler · Menengah · Atas · Premium (1 sampai 4 batang)' },
        { glyph: 'none', label: 'Batang berisi = dari biaya kuliah resmi atau jenis kampus. Batang kosong = perkiraan. Tanpa tanda = belum diketahui.' }
      ] });
    }
    var T = MCD.territory, tg = T && isFn(T.legendGroups) ? (T.legendGroups({ ms: ms, stats: terrStats() }) || []) : [];
    var tkec = tg.filter(function (g) { return g.id === 'territory-kec'; })[0], lines = tg.filter(function (g) { return g.id === 'territory-lines'; })[0];
    /* integration 22 Oct 2026: the muted ring chip and the zoom rule of MCD.territory ("Label kecamatan di luar 15 km
       tampil saat peta diperbesar.") join the section's own chip row */
    groups.push({ id: 'campus-kec', title: 'Label kecamatan', rows: [{ glyph: 'chip', label: 'Nama kecamatan · jumlah kampus' }]
      .concat(tkec && tkec.rows ? tkec.rows.filter(function (r) { return r && r.muted; }) : []), note: kecNote(tkec) });
    if (lines) groups.push(lines);
    return groups;
  }
  /** The territory note without its merchant line (the LVM dot does not exist on the Kampus map). */
  function kecNote(g) {
    var t = g && g.note ? String(g.note).split('\n').filter(function (x) { return x && !/file LVM/.test(x); }).join('\n') : '';
    return t || null;
  }
  function telemetry() {
    if (!V) return C && C.state('campuses') === 'loading' ? 'MEMUAT DAFTAR KAMPUS' : '';
    return fm().int(V.n) + ' KAMPUS DALAM ' + st.km + ' KM · ' + fm().int(V.students) + ' MAHASISWA · ' + fm().int(V.dosen) + ' DOSEN TETAP';
  }
  function registerMap() {
    unregisterMap();
    var M = MCD.map;
    if (!M || !isFn(M.registerLayers)) return;
    mapOffs.push(M.registerLayers('campus', mapLayers, { id: 'campus' }));
    if (isFn(M.registerPosture)) M.registerPosture('campus', {
      imagery: 'full', camera: st.km === 5 ? 'cp5' : st.km === 15 ? 'cp15' : 'ring30', rings: 'schools', layerSet: 'campus', deck: true, buildings: 'off',
      zones: st.km <= 15 ? 'kecamatan15' : { mode: 'kecamatan', km: 30 },
      attribution: ATTRIBUTION,
      onRingClick: function (km) { setKm(km <= 5.01 ? 5 : km <= 15.01 ? 15 : 30); },
      ringHint: 'Klik untuk menampilkan kampus sampai jarak ini dari Mabes TNI',
      telemetry: telemetry
    });
    if (isFn(M.registerLegend)) M.registerLegend('campus', legend);
    if (isFn(M.registerSelectable)) {
      M.registerSelectable('campus', function (id) { var r = C.ready() ? C.row(id) : null; return r ? [r.lon, r.lat] : null; });
      M.registerSelectable('campusSite', function (id) { var s = C.ready() ? C.site(id) : null; return s ? [s.lon, s.lat] : null; });
      M.registerSelectable('cpKec', function () { return null; });
    }
    if (isFn(M.registerPreset)) {
      M.registerPreset('cp5', { label: '5 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 5 });
      M.registerPreset('cp15', { label: '15 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 15 });
    }
    var T = MCD.territory;
    if (T && isFn(T.bind) && isFn(T.popup)) {
      unbindTerr = T.bind({
        stats: function () { return terrStats(); },
        popup: function (kid) { return kecPopup(kid); },
        actions: function (kid) {
          var outA = [{ label: 'Lihat kampus di kecamatan ini', primary: true, run: function () { openKec(kid); } }];
          if (WS()) outA.push({ id: 'detail', label: 'Detail', run: function () { openKecNums(kid); } });
          return outA;
        },
        onPick: function (h) { if (h && h.kecamatanId) { st.selKec = h.kecamatanId; requestRender(); } },
        onClose: function () { if (!(drawerSel && drawerSel.kind === 'cpKec')) { st.selKec = null; requestRender(); } }
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

  function trailOf(sel) {
    if (!sel || (sel.kind !== 'campus' && sel.kind !== 'campusSite')) return null;
    if (sel.extra && sel.extra.trail) return String(sel.extra.trail);
    if (!WS()) return null;
    var p = selPoint(sel), f = focusedKec();
    return p && p.kecamatanId && f && String(f) === String(p.kecamatanId) ? String(p.kecamatanId) : null;
  }
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
    var M = MCD.map;
    if (!M) return;
    if (isFn(M.focusArea) && focusedKec() === String(id)) { try { if (M.focusArea({ kind: 'kecamatan', id: String(id), refit: true }) !== false) return; } catch (e) { /* fit below */ } }
    var T = territory(), b = T && isFn(T.boundsOf) ? T.boundsOf(id) : null;
    if (b && isFn(M.fitBounds)) M.fitBounds(b, { maxZoom: 14 });
  }
  function openKec(id) { flyNext = false; if (ctx) ctx.select({ kind: 'cpKec', id: String(id), extra: { kecamatanId: String(id) } }); }
  function openKecNums(id) { flyNext = false; if (ctx) ctx.select({ kind: 'cpKec', id: String(id), extra: { kecamatanId: String(id), first: 'angka' } }); }
  function showKec(id) { if (!id) return; st.selKec = String(id); requestRender(); openKec(id); }
  function openInTrail(r, kid) { if (!ctx) return; flyNext = !WS(); ctx.select({ kind: 'campus', id: r.id, extra: { trail: String(kid) } }); }
  function openCampus(r, o) { if (!ctx || !r) return; flyNext = true; ctx.select({ kind: 'campus', id: r.id, extra: o && o.fold ? { fold: o.fold } : undefined }); }
  function selectPoint(p, trail) {
    if (!ctx) return;
    var extra = trail ? { trail: String(trail) } : undefined;
    ctx.select(p.kind === 'campusSite' ? { kind: 'campusSite', id: p.id, extra: extra } : { kind: 'campus', id: p.id, extra: extra });
  }
  function focusMapPt(pt) {
    var M = MCD.map;
    if (!M || !pt) return;
    if (isFn(M.flyTo)) M.flyTo({ center: [pt.lon, pt.lat], zoom: 16 });
  }
  /** Make a campus visible before flying to it: a scope wide enough, its jenis on, the filters that hide it off. */
  function ensureVisible(r, site) {
    var km = (site || r).km;
    if (isNum(km) && km > st.km) setKm(km > 15 ? 30 : 15, { camera: false });
    var g = C.group(r);
    if (st.show[g] === false) { st.show[g] = true; saveUi(); }
    var t = C.tierId(r.id);
    if (st.status[r.status] === false || (t !== undefined && st.tiers[t || 'unknown'] === false)) resetFilters();
    else refresh(['filters']);
  }
  function focusRow(r, site) {
    if (!ctx || !r) return false;
    ensureVisible(r, site);
    var pt = site || r, kind = site ? 'campusSite' : 'campus', id = site ? site.id : r.id, M = MCD.map;
    if (M && isFn(M.focusPoint)) { try { if (M.focusPoint({ lon: pt.lon, lat: pt.lat, zoom: 16, kind: kind, id: id }) !== false) return true; } catch (e) { /* select below */ } }
    flyNext = true;
    ctx.select({ kind: kind, id: id });
    return true;
  }
  function requestFocus(id) {
    pendingFocus = String(id);
    if (!ctx) return;
    C.ensure().then(function (ok) {
      if (!ok) { pendingFocus = null; toast('Daftar kampus tidak dapat dimuat. Coba lagi.', 'warn'); return; }
      later(runPendingFocus, 60);
    });
  }
  function runPendingFocus() {
    if (!ctx || pendingFocus == null || !C.ready()) return;
    var id = pendingFocus;
    pendingFocus = null;
    computeView();
    var site = /#\d+$/.test(id) ? C.site(id) : null, r = site ? site.row : C.row(id);
    if (!r) { toast('Kampus ini tidak ditemukan di daftar kampus.', 'warn'); return; }
    focusRow(r, site);
  }
  function showModel(sel, trail) {
    if (!sel || !C.ready()) return null;
    computeView();
    if (sel.kind === 'campus') return campusModel(C.row(sel.id), { trail: trail, fold: sel.extra && sel.extra.fold });
    if (sel.kind === 'campusSite') { var s = C.site(sel.id); return s ? campusModel(s.row, { site: s, trail: trail }) : null; }
    if (sel.kind === 'cpKec') return kecModel(String(sel.id), { listFirst: !(sel.extra && sel.extra.first === 'angka') });
    return null;
  }
  function openFold(id) {
    var d = document.querySelector('.drawer');
    var el = d ? d.querySelector('[data-fold="' + id + '"]') : null;
    if (!el) return;
    var t = el.querySelector('.dd-blk__t'), b = t && t.querySelector('[aria-expanded="false"]');
    if (b) b.click();
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
  }
  function onSelect(sel) {
    if (sel && MCD.territory && sel.kind === MCD.territory.KIND) { later(function () { if (ctx) ctx.clearSelection(); }, 0); return true; }
    if (!sel || !/^(campus|campusSite|cpKec)$/.test(sel.kind)) return false;
    if (!C.ready()) return true;
    var trail = trailOf(sel);
    if (sel.kind !== 'cpKec' && !(trail && trail === ownFocus)) dropOwnFocus();
    var model = showModel(sel, trail);
    if (!model) return false;
    drawerSel = sel;
    if (sel.kind === 'cpKec') st.selKec = String(sel.id);
    else if (WS() && st.selKec !== (trail || null)) st.selKec = trail || null;
    requestRender();
    var fly = flyNext;
    flyNext = false;
    later(function () {
      if (!ctx || drawerSel !== sel) return;
      if (MCD.territory && isFn(MCD.territory.closePopup)) { try { MCD.territory.closePopup(); } catch (e) { /* ignore */ } }
      ctx.openDrawer(model);
      watchDrawer(sel, trail);
      if (sel.kind === 'cpKec') { var kid = String(sel.id); later(function () { if (ctx && drawerSel === sel) ensureKecFocus(kid); }, 160); }
      if (fly) { var p = selPoint(sel); if (p && MCD.map && isFn(MCD.map.flyTo)) MCD.map.flyTo({ center: [p.lon, p.lat], zoom: 15.2 }); }
      if (sel.extra && sel.extra.fold) later(function () { openFold(sel.extra.fold); }, 120);
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
      if (sel.kind === 'cpKec') { st.selKec = null; dropOwnFocus(sel.id); }
      else if (trail) { st.selKec = null; dropOwnFocus(trail); }
      var s = MCD.state.get().selection;
      if (s && s.kind === sel.kind && String(s.id) === String(sel.id) && ctx) ctx.clearSelection();
      requestRender();
    });
    drawerObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }
  /** The open card follows data, filters, distances, privacy and the tiers in place (never while staff type in its editor). */
  function refreshOpenCard() {
    if (!ctx || !drawerSel || !WS()) return;
    var d = document.querySelector('.drawer'), open = !!(d && d.classList.contains('is-open')) || !!document.querySelector('.ws-co');
    if (!open) return;
    var a = document.activeElement;
    if (a && a.closest && a.closest('.cp-dd--pipe')) return;
    var model = showModel(drawerSel, trailOf(drawerSel));
    if (model) ctx.openDrawer(model, { refresh: true, keepSelection: true });
  }

  /* ============================================================ render */

  function renderAll() { renderPanel(); if (isDeep() && ui.work) renderWork(false); }
  function refresh(keys) {
    if (!ctx) return;
    keys = keys || ['*'];
    computeView();
    requestRender();
    renderPanel();
    if (isDeep() && ui.work) {
      if (keys.indexOf('pipeline') >= 0 && ui.work.pipe) ui.work.pipe.sig = '';
      renderWork(false);
    }
    syncChips();
    syncControls();
  }
  function syncControls() {
    if (!ctx || syncControls.done) return;
    syncControls.done = true;
    try { ctx.mapControls({ extra: [], presets: ['cp15', 'ring30'] }); } catch (e) { /* ignore */ }
  }

  /* ============================================================ section contract (v5 workspace, §7.4; v6 scope) */

  /** summary() → the slim rail: "Kampus 30 km" · "Mahasiswa" · "Dosen tetap", the filter count and the scope pair (§3.6). */
  /* "Kampus 30 km" with a no-break space before "km": the 76 px slim rail wraps it as "Kampus / 30 km", never "km" alone */
  function railLabel() { return 'Kampus ' + st.km + '\u00a0km'; }
  function summary() {
    if (!st) return { items: [], filters: 0 };
    var scope = { label: 'Cakupan', value: st.km, options: [5, 15, 30].map(function (v) { return { v: v, label: v + ' km' }; }), set: function (v) { setKm(+v); }, title: 'Kampus dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.' };
    var nf = filterCount();
    if (!C || !computeView()) {
      var busy = C && C.state('campuses') === 'loading' ? 'Memuat daftar kampus…' : 'Daftar kampus belum dimuat.';
      return { items: [{ value: '—', label: railLabel(), title: busy }, { value: '—', label: 'Mahasiswa', title: busy }, { value: '—', label: 'Dosen tetap', title: busy }], filters: nf, scope: scope };
    }
    var f = fm();
    return {
      items: [
        { value: f.int(V.n), label: railLabel(), title: count(V.n, 'kampus') + ' dalam ' + st.km + ' km dari Mabes TNI' + (V.k ? ' · ' + count(V.k, 'sekolah desain dan kursus') : '') + '\n' + count(V.unplaced.length, 'perguruan tinggi') + ' belum di peta' },
        { value: V.stuN ? f.int(V.students) : '—', label: 'Mahasiswa', title: C.TOTAL_TITLE },
        { value: V.dosenN ? f.int(V.dosen) : '—', label: 'Dosen tetap', title: 'Dosen dengan homebase di perguruan tinggi (NIDN dan NIDK), dari PDDikti.\n' + C.TENDIK_LINE }
      ],
      filters: nf, scope: scope
    };
  }
  function workspace() {
    if (!ctx || !isDeep() || !ui || !ui.work || !page || !page.el) return null;
    var w = ui.work;
    later(syncAdopted, 0);
    return {
      rail: { el: page.el, label: 'Kampus', short: 'Kampus', icon: 'sec-campus', summary: summary },
      drawer: { el: w.el, tabs: w.tabHost, title: 'Daftar & grafik kampus', source: SRC_LINE, more: function () { openSources(); } },
      hide: [w.head, w.foot, ui.panel && ui.panel.openWork].filter(Boolean)
    };
  }
  function cardFor(sel) {
    if (!sel || !/^(campus|campusSite|cpKec)$/.test(sel.kind)) return null;
    C = C || MCD.campus;
    if (!C || !C.ready() || !st) return null;
    var was = building;
    building = 'pin';
    try { return showModel(sel, trailOf(sel)); } catch (e) { return null; } finally { building = was; }
  }

  /* ============================================================ search (Cari) */

  function searchCampus(q) {
    C = C || MCD.campus;
    var s = String(q || '').trim();
    if (!C || s.length < 2) return [];
    if (!C.ready()) {
      if (s.length >= 3 && MCD.app && isFn(MCD.app.isBooted) && MCD.app.isBooted()) C.ensure();
      return [];
    }
    return C.search(s, 8).map(function (r) {
      var d = distOf(r), dt = distText(d);
      return { group: 'Kampus', label: r.name + (r.short ? ' (' + r.short + ')' : ''), sub: (C.isDesain(r) ? 'Desain dan kursus' : C.jenisWord(r)) + ' · ' + (dt && dt !== '—' ? dt + ' dari KCP' : fm().km(r.km) + ' dari Mabes TNI'),
        run: function () { if (MCD.app && isFn(MCD.app.focus)) MCD.app.focus({ section: ID, kind: 'campus', id: r.id }); } };
    });
  }
  var searchDone = false;
  if (MCD.searchProviders && typeof MCD.searchProviders === 'object') { MCD.searchProviders.campus = function (q) { return searchCampus(q); }; searchDone = true; }
  function registerSearch() {
    if (searchDone) return;
    var A = MCD.app;
    if (!A || !isFn(A.registerSearch)) return;
    try { A.registerSearch('campus', searchCampus); searchDone = true; } catch (e) { /* the shell keeps its own entries */ }
  }

  /* ============================================================ the section */

  var SPEC = {
    lede: 'Kampus dalam 5, 15 atau 30 km, dengan jumlah mahasiswa dan dosen dari PDDikti.',
    shows: [
      'Perisai = universitas dan institut. Segitiga = sekolah tinggi, politeknik, akademi, desain dan kursus',
      'Biru = negeri, kuning = swasta, abu-abu = kedinasan. Titik lebih besar = mahasiswa lebih banyak',
      'Dosen tetap untuk payroll, merchant sekitar kampus untuk Livin’ Merchant, mahasiswa untuk Tabungan',
      'Kontak kantor, kode PT, situs resmi dan kelas biaya setiap kampus'
    ],
    needs: [], dataKeys: [], emptyFirst: false, blocks: [], source: SRC_LINE,
    cards: function () { return []; }
  };

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (host, c) {
      C = MCD.campus;
      ctx = c;
      ui = {};
      handles = []; distSwitches = []; timers = []; pipeEds = {};
      DISTC = new Map();
      if (!st) st = loadState();
      st.km = scopeGet();
      st.workOpen = !!(st.openOnMount && isDeep());
      st.openOnMount = false;
      syncControls.done = false;
      saveUi = debounce(function () { sset(UI_KEY, { v: 1, sort: st.sort, show: { univ: st.show.univ !== false, st: st.show.st !== false, desain: st.show.desain !== false } }); }, 400);
      host.classList.add('cp-host');
      var spec = Object.assign({}, SPEC, { lede: isDeep() ? 'Perguruan tinggi dalam ' + st.km + ' km: mahasiswa, dosen tetap, kantin dan merchant sekitar.' : SPEC.lede,
        primary: isDeep() ? null : { label: 'Lihat daftar kampus', icon: 'chev-r', run: function () { goTab('list'); } } });
      page = c.page(spec);
      buildPanel(page.body);
      if (isDeep()) {
        buildWork(host);
        syncWork();
        /* "Lihat daftar kampus" from Sederhana: once the shell adopted the drawer, open it to half height (§3.7) */
        if (st.workOpen) later(function () { if (ctx && isDeep()) { openWork(true, st.tab === 'list' ? 'list' : null); renderWork(true); } }, 420);
      }
      registerMap();
      registerSearch();
      offs.push(C.onEvent('pipeline', debounce(function () { if (ctx && isDeep() && st.tab === 'pipe') renderPipe(true); }, 60)));
      var P0 = C.pipeline;
      if (P0 && isFn(P0.on)) { var offP = P0.on(debounce(function () { if (ctx && isDeep() && st.tab === 'pipe') renderPipe(true); }, 60)); if (isFn(offP)) offs.push(offP); }
      if (P0 && isFn(P0.ready)) { try { P0.ready().then(function () { if (ctx) { if (ui && ui.work && ui.work.pipe) renderPipe(true); refreshOpenCard(); } }, function () {}); } catch (e) { /* memory list */ } }
      if (MCD.state && isFn(MCD.state.on)) { var offR = MCD.state.on('reset', function (e) { if (e && e.scope === 'filters') resetFilters(); }); if (isFn(offR)) offs.push(offR); }
      var I = MCD.inst;
      if (I && I.scope && isFn(I.scope.on)) { try { var offS = I.scope.on(function () { var v = scopeGet(); if (st && v !== st.km) setKm(v, { quiet: true }); }); if (isFn(offS)) offs.push(offS); } catch (e) { /* ignore */ } }
      var onDistEvt = function () { onDistance(); };
      window.addEventListener('mcd:distance', onDistEvt);
      offs.push(function () { window.removeEventListener('mcd:distance', onDistEvt); });
      if (MCD.seal && isFn(MCD.seal.on)) { try { var offSeal = MCD.seal.on(function () { if (ctx) { if (ui && ui.work && ui.work.pipe) renderPipe(true); } }); if (isFn(offSeal)) offs.push(offSeal); } catch (e) { /* ignore */ } }
      c.registerCommands(function () {
        return [
          { label: 'Kampus · Cakupan 5 km', run: function () { setKm(5); }, kw: 'kampus cakupan 5' },
          { label: 'Kampus · Cakupan 15 km', run: function () { setKm(15); }, kw: 'kampus cakupan 15' },
          { label: 'Kampus · Cakupan 30 km', run: function () { setKm(30); }, kw: 'kampus cakupan 30' },
          { label: 'Kampus · Daftar kampus', run: function () { goTab('list'); }, kw: 'kampus daftar universitas csv' },
          { label: 'Kampus · Kecamatan', run: function () { goTab('kec'); }, kw: 'kampus kecamatan mahasiswa' },
          { label: 'Kampus · Merchant sekitar', run: function () { goTab('merch'); }, kw: 'kampus kantin merchant qris' },
          { label: 'Kampus · Tindak lanjut', run: function () { goTab('pipe'); }, kw: 'kampus tindak lanjut pipeline payroll' },
          { label: 'Kampus · Ekspor daftar kampus (CSV)', run: function () { exportCampus(); }, kw: 'kampus ekspor csv' },
          { label: 'Kampus · Hapus filter', run: function () { resetFilters(); }, kw: 'kampus hapus filter' }
        ];
      });
      startTerritory();
      if (C.ready()) refresh(['*']);
      else startData();
      loadTiers(false);
      if (pendingFocus != null) requestFocus(pendingFocus);
    },
    update: function (derived, keys) {
      if (!ctx) return;
      keys = keys || ['*'];
      if (page) page.update(derived, keys);
      if (keys.indexOf('selection') >= 0) {
        var s = MCD.state.get().selection;
        if (!s || !/^(campus|campusSite|cpKec)$/.test(s.kind)) {
          drawerSel = null;
          if (st.selKec && !(MCD.territory && isFn(MCD.territory.popupOpen) && MCD.territory.popupOpen())) st.selKec = null;
          requestRender();
        }
      }
      var relevant = keys.some(function (k) { return k === '*' || k === 'data' || k === 'demo' || k === 'theme' || k === 'settings' || k === 'distance' || k.indexOf('privacy') === 0; });
      if (!relevant) return;
      if (keys.indexOf('theme') >= 0 && ui.work && ui.work.table && isFn(ui.work.table.update)) ui.work.table.update();
      if (keys.indexOf('distance') >= 0) DISTC = new Map();
      if (keys.some(function (k) { return k.indexOf('privacy') === 0; }) && ui.work && st.tab === 'pipe' && ui.work.pipe) ui.work.pipe.sig = '';
      refresh(keys);
      if (keys.some(function (k) { return k.indexOf('privacy') === 0 || k === 'distance'; })) refreshOpenCard();
    },
    unmount: function () {
      offs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      offs = [];
      timers.forEach(function (t) { clearTimeout(t); });
      timers = [];
      unregisterMap();
      clearTimeout(hlTimer);
      hl = { set: null, key: '' };
      if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
      if (ui && ui.work && ui.work.table && isFn(ui.work.table.destroy)) { try { ui.work.table.destroy(); } catch (e) { /* ignore */ } }
      if (ui && ui.work) (ui.work.handles || []).forEach(function (h) { try { h.destroy(); } catch (e) { /* ignore */ } });
      document.body.classList.remove('cp-work-open');
      if (ctx && isFn(ctx.filterChips)) { try { ctx.filterChips([]); } catch (e) { /* ignore */ } }
      /* no zone reset here: the Kampus zones end by themselves when the next section takes the map (MCD.map.setZones) */
      distSwitches = [];
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
      var p = ctx.padding(), w = ui && ui.work && ui.work.el;
      if (w && isDeep() && !adopted() && window.matchMedia && window.matchMedia('(min-width: 1280px)').matches && st.workOpen) {
        var r = w.getBoundingClientRect();
        if (r.width > 0) p.right = Math.round(window.innerWidth - r.left + 12);
      }
      lay.padding = p;
      return lay;
    },
    onSelect: onSelect,
    workspace: workspace,
    summary: summary,
    cardFor: cardFor,
    kecList: function (kecId) { C = C || MCD.campus; if (!C || !C.ready() || !st || !kecId) return null; computeView(); return kecModel(String(kecId), { listFirst: true }); },
    onAction: function (action) {
      var a = String(action || '');
      var m = /^focus:(pt|campus):(.+)$/.exec(a);
      if (m) { requestFocus(m[2]); return true; }
      if (!ctx) return false;
      var k = /^campus:kec:(\d\d\.\d\d\.\d\d)$/.exec(a);
      if (k) { C.ensure().then(function (ok) { if (ok && ctx) { computeView(); showKec(k[1]); } }); return true; }
      var sc = /^campus:scope:(5|15|30)$/.exec(a);
      if (sc) { setKm(+sc[1]); return true; }
      var tb = /^campus:tab:(list|kec|merch|pipe)$/.exec(a);
      if (tb) { goTab(tb[1]); return true; }
      if (a === 'campus:list') { goTab('list'); return true; }
      if (a === 'filters:reset') { resetFilters(); return true; }
      return false;
    },
    onEscape: function () {
      if (st && st.workOpen && !adopted() && window.matchMedia && !window.matchMedia('(min-width: 1280px)').matches) { openWork(false); return true; }
      return false;
    },
    onResize: function () {
      if (!ctx) return;
      ctx.relayout();
      /* the Daftar kampus columns change at 520 px (phones: one column, the name on two lines) */
      var s = ui && ui.work && ui.work.list;
      if (s && st.tab === 'list' && V && (listWidth(s) < 520) !== !!s.narrow) renderList();
    },
    search: searchCampus,
    _test: {
      state: function () { return st; },
      reset: function () { st = null; V = null; SCOPE_MEM = null; },
      view: function () { return computeView(); },
      setKm: function (v) { setKm(v); },
      toggleShow: function (id) { toggleShow(id); },
      toggleStatus: function (id) { toggleStatus(id); },
      toggleTier: function (id) { toggleTier(id); },
      resetFilters: function () { resetFilters(); },
      campusModel: function (id, o) { C = C || MCD.campus; computeView(); var site = /#\d+$/.test(String(id)) ? C.site(id) : null; return campusModel(site ? site.row : C.row(id), Object.assign({ site: site }, o || {})); },
      kecModel: function (id, o) { C = C || MCD.campus; computeView(); return kecModel(String(id), o); },
      kecPopup: function (id) { computeView(); return kecPopup(String(id)); },
      kecBrief: function (id) { computeView(); return kecBrief(String(id)); },
      kecLabel: function (id) { C = C || MCD.campus; computeView(); return kecLabel({ id: String(id), name: C.kecName(String(id)) }); },
      tipKec: function (id) { computeView(); return tipKec(String(id)); },
      contactBlock: function (id) { C = C || MCD.campus; var r = C.row(id); return contactBlock(r, []); },
      tierBlock: function (id) { C = C || MCD.campus; return tierBlock(C.row(id)); },
      capLine: function () { return capLine(); },
      kantinBlock: function (id) { C = C || MCD.campus; var site = /#\d+$/.test(String(id)) ? C.site(id) : null; return kantinBlock(site ? site.row : C.row(id), site); },
      quickAdd: function (key, label) { C = C || MCD.campus; return quickAdd(key, label); },
      listRows: function () { computeView(); return listRows(); },
      legend: function (ms) { computeView(); return legend(null, ms || { theme: 'day', zoom: 11 }); },
      mapLayers: function (ms) { return mapLayers(null, ms); },
      searchCampus: searchCampus,
      distText: function (r, p) { return distText(r, p); },
      pipeState: function () { return pipeState(); },
      exportCsv: function () { computeView(); return C.csv(C.sort(V.rows, st.sort, { dist: distSortVal }), { veiled: veil() }); },
      openTab: function (id) { goTab(id); }
    }
  };
})(window.MCD = window.MCD || {});
