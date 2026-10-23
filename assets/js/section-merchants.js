/* ==========================================================================
 * MCD.sections.merchants — section 2 "Merchant (LVM & EDC)" (key 2). Dashboard Akuisisi.
 *
 * The heart of the dashboard (docs/COPY_STYLE_EN.md items 10-22, docs/UX_FIX_PLAN.md §6):
 * every grocery store, restaurant, SME and MSME within 15 km of Mabes TNI (public Overture
 * listings), marked "Sudah diakuisisi" (found in the Livin' Merchant file, MCD.lvm) or
 * "Belum ada di LVM", and what is still there to acquire per kecamatan. The map shows one
 * solid shape per kecamatan (item 20), coloured by its ranked third: hijau = strongest third,
 * kuning = middle, merah = weakest (go here next). Before the LVM file: potential only, in blue.
 *
 * SEDERHANA (view 'overview')  one short page: 3 number cards, the top-3 "Prioritas kunjungan"
 *           rows, a one-line colour key and ONE primary button ("Lihat prioritas kunjungan", or
 *           "Impor file LVM" before the import, with the "Setelah file LVM diimpor" card).
 * DETAIL    (view 'deep')      summary strip (3 numbers) · 6 tabs (one panel at a time):
 *           Prioritas kunjungan (top 10 kecamatan + the "Belum ada di LVM" list, CSV) · Kandidat EDC (items 32, 35, 37:
 *           "Potensi EDC (perkiraan)", tiers Sasaran EDC / Naik ke EDC / Sasaran LVM from three factors, nilai belanja ×
 *           keramaian × daya beli area, each a level with one plain reason; the list without the map for the live
 *           Google check of item 33) · Kecamatan (combo + kecamatan × jenis usaha heatmap) · Jenis usaha (donut +
 *           distance heatmap) · Status LVM & EDC (store counts, where the LVM stores sit, re-activation list,
 *           UREG / USAK by branch, EDC) · Info & cara hitung.
 * Items 27-29 (16 Oct 2026): every public business and LVM store shows "x,x km · ± y menit" from KCP (MCD.distance,
 *           through MCD.sme.poiDist / lvmDist), visit lists open "Terdekat dari KCP", the shared toggles "Jam sibuk" and
 *           "Motor (tanpa tol)" sit on the filter row; the two-product strip (Livin' Merchant · EDC Mandiri) tops both
 *           views; the Livin' Merchant icon sits beside the title and in the "Sudah pakai Livin' Merchant" badge.
 *           onAction('focus:poi:<row>' | 'focus:lvm:<id>') flies to the point and opens its drawer (MCD.app.focus).
 *           A collapsed "Filter (n)" row (Jarak · Kecamatan · Jenis usaha · Status); active filters show
 *           as chips (ctx.filterChips when the shell has it, else a chip row here).
 * Map       MCD.sme (assets/js/sme.js) draws the layers and the legend; this file wires the kecamatan
 *           popup (MCD.territory.bind: a click highlights, it never filters), drawers (onSelect, each
 *           with "Buka di Google Maps", item 22, and "Rute di Google Maps", item 36: coordinates only, a new tab;
 *           the route line on the map is MCD.map's, from the selection) and the filters (MCD.sme.setView, memory only).
 * Contract  mount · update · unmount · layout · onAction ('merchants:leads') · onEscape · onSelect · onResize.
 *
 * Shared contracts of the shell (plan §4) are feature-detected: ctx.tabs, ctx.filterChips,
 * MCD.util.gmaps (+ the drawer's gmaps field), MCD.territory.priority, MCD.charts.rankBars.
 * Safe DOM only (MCD.util.el / textContent), tokens only in CSS (prefix .mx-), Bahasa Indonesia per
 * COPY_STYLE item 19. Personal data: LVM store names are masked unless the user reveals them.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'merchants';
  var W = window;
  var TEMPLATE = 'templates/Permintaan_Data_KCP_Cilangkap.xlsx';
  var HOME = '12903';
  var PAGE = 25;                                // table rows per step ("Tampilkan 25 lagi")
  var REACT_FIRST = 10;                         // the re-activation list starts shorter, so Status LVM & EDC stays under 4 screens
  var host = null, ctx = null, page = null, spec0 = null, view = 'overview';
  var R = {};                                   // DOM refs of the current mount
  var CH = {};                                  // chart handles of the current mount
  var cleanups = [];
  var SIG = {};                                 // last painted signature per part

  /* UI state that survives remounts (view switch); never in the hash or in storage */
  var UI = { tab: 'prio', comboAll: false, heatAll: false, leadShown: PAGE, inactShown: REACT_FIRST, inactOwn: true, q: '', filterOpen: false, scrollTo: null,
    leadSort: 'near', reactSort: 'near', ecTier: 'edc', ecSort: 'score', ecShown: PAGE, ecTip: false, focus: null,
    natOpen: false, natShown: PAGE, kecSheet: null, explicitNext: false, saldoShow: 'all', saldoSort: 'drop', saldoShown: PAGE };
  var TABS = [['prio', 'Prioritas kunjungan'], ['edc', 'Kandidat EDC'], ['kec', 'Kecamatan'], ['cat', 'Jenis usaha'], ['status', 'Status LVM & EDC'],
    ['saldo', 'Saldo merchant'], ['info', 'Info & cara hitung']];
  var GM_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  var APPROX_NOTE = 'Titik perkiraan di tengah kelurahan. File LVM tidak memuat koordinat.';
  /* product images (item 29): small and quiet, only where the product is discussed */
  var IMG_LVM = 'assets/brand/livin-merchant-icon.png';
  var IMG_EDC = 'assets/brand/edc-mandiri.webp';
  var LVM_BADGE = 'Sudah pakai Livin’ Merchant';
  var DIST_COL = 'Jarak dari KCP';
  var NEAR_LABEL = 'Terdekat dari KCP';

  /* ------------------------------------------------------------- helpers */

  function S() { return MCD.sme; }
  function TT() { return MCD.territory && MCD.territory.ready && MCD.territory.ready() ? MCD.territory : null; }
  function C() { return MCD.charts && MCD.charts.combo ? MCD.charts : null; }
  function fm() { return MCD.util.fmt; }
  function h() { return MCD.util.el.apply(null, arguments); }
  function icon(name, cls) { return MCD.util.icon(name, cls); }
  function clear(n) { return MCD.util.clear(n); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function deep() { return view === 'deep'; }
  function privacy() { return ctx && ctx.privacy ? ctx.privacy() : 'masked'; }
  function demoOn() { return !!(MCD.demo && MCD.demo.isOn && MCD.demo.isOn()); }
  function safe(fn) { try { return fn(); } catch (e) { try { console.warn('[merchants]', e); } catch (x) { /* ignore */ } return null; } }
  function model() { return S() ? S().model() : null; }
  function int(n) { return fm().int(n); }
  function pct(x) { return S().pctAuto(x); }
  function dateText(d) { return d ? fm().date(d) : null; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function lcFirst(s) { s = String(s || ''); return /^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }   /* "UMKM lainnya" stays upper case */
  function listWords(arr) { return arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' dan ' + arr[arr.length - 1]; }
  function hasTravel() { if (D()) return true; var T = MCD.travel; return !!(T && typeof T.ready === 'function' && safe(function () { return T.ready(); })); }
  function catShort(c) { return S().CAT[c] ? S().CAT[c].short : c; }
  function asOfText(m) { var d = m && m.asOf ? dateText(m.asOf) : null; return d ? 'laporan LVM per ' + d : 'file LVM'; }
  function release() { return S().release(); }
  function srcPoi() { return 'Overture Maps (rilis ' + release() + ', Sep 2026)'; }
  function srcLvm(m) {
    if (m && m.demo) return 'data contoh (ilustrasi)';
    var meta = MCD.data && MCD.data.meta && MCD.data.meta.lvm;
    return 'laporan Livin’ Merchant' + (meta && meta.file ? ' (' + meta.file + ')' : '') + (m && m.asOf ? ' per ' + dateText(m.asOf) : '');
  }
  function lvmAll(t) { return t ? t.acquired + t.offMap.all : 0; }
  function known(t) { return t ? t.potential + t.offMap.all : 0; }
  function targetTone(p) { return !isNum(p) ? 'none' : (p >= 1 ? 'ok' : (p >= 0.9 ? 'mid' : 'bad')); }
  var TARGET_WORDS = { ok: 'Tercapai', mid: 'Hampir tercapai', bad: 'Tertinggal', none: 'Tanpa target' };
  var BAND_TONE = { acquired: 'ok', partly: 'mid', notYet: 'bad', noData: 'none', potential: 'potential' };
  function bandTone(b) { return BAND_TONE[b] || 'none'; }
  function lvmSummary() { return MCD.lvm && MCD.lvm.summary ? safe(function () { return MCD.lvm.summary(); }) : null; }

  function goImport() { if (ctx) ctx.navigate('data'); }
  function importBtn(label, secondary) {
    var b = h('button', { type: 'button', class: 'btn btn--lg ' + (secondary ? 'btn--secondary' : 'btn--primary') + ' mx-btn' }, [icon('upload'), h('span', { text: label || 'Impor file LVM' })]);
    b.addEventListener('click', goImport);
    return b;
  }
  function fileCode() { var i = TEMPLATE.lastIndexOf('/') + 1; return h('code', { class: 'mx-file', title: TEMPLATE }, [TEMPLATE.slice(0, i), h('wbr'), TEMPLATE.slice(i)]); }
  /** Empty state inside a tab: what is missing and the one next step. */
  function emptyCard(title, kids, button) {
    return h('div', { class: 'mx-empty', role: 'note' }, [
      h('span', { class: 'mx-empty__icon', 'aria-hidden': 'true' }, [icon('upload')]),
      h('div', { class: 'mx-empty__txt' }, [h('p', { class: 'mx-empty__t', text: title }), h('div', { class: 'mx-empty__p' }, kids || [])]),
      button ? h('div', { class: 'mx-empty__a' }, [button]) : null
    ]);
  }
  function chart(name, kind, el, data, cfg) {
    var Cc = C();
    if (!Cc || !Cc[kind]) { el.textContent = 'Grafik belum dapat ditampilkan. Muat ulang halaman.'; return null; }
    if (CH[name] && CH[name].kind && CH[name].kind !== kind) dropChart(name);
    if (CH[name] && CH[name].el && CH[name].el.isConnected) { CH[name].update(data, cfg); return CH[name]; }
    if (CH[name]) safe(function () { CH[name].destroy(); });
    CH[name] = Cc[kind](el, data, cfg);
    return CH[name];
  }
  function dropChart(name) { if (CH[name]) { safe(function () { CH[name].destroy(); }); delete CH[name]; } }
  function seg(label, opts, cur, onPick, cls) {
    var wrap = h('div', { class: 'seg mx-seg' + (cls ? ' ' + cls : ''), role: 'radiogroup', 'aria-label': label });
    var btns = opts.map(function (o) {
      var b = h('button', { type: 'button', class: 'seg__opt', role: 'radio', 'aria-checked': o[0] === cur ? 'true' : 'false', title: o[2] || o[1], text: o[1], tabindex: o[0] === cur ? '0' : '-1' });
      b.addEventListener('click', function () { onPick(o[0]); });
      wrap.appendChild(b);
      return b;
    });
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var j = (i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length;
      btns[j].focus(); btns[j].click();
    });
    wrap.setValue = function (v) { btns.forEach(function (b, k) { var on = opts[k][0] === v; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('tabindex', on ? '0' : '-1'); }); };
    return wrap;
  }
  function exhibit(id, opts) {
    var title = h('h2', { class: 'exhibit__title mx-x__title', id: 'mx-t-' + id, text: opts.title || '' });
    var sub = h('p', { class: 'exhibit__sub mx-x__sub', text: opts.sub || '' });
    var tools = h('div', { class: 'mx-x__tools' });
    var body = h('div', { class: 'mx-x__body' });
    var src = h('p', { class: 'exhibit__source mx-x__src', text: opts.source || '' });
    var el = h('section', { class: 'exhibit mx-x' + (opts.cls ? ' ' + opts.cls : ''), id: 'mx-' + id, 'aria-labelledby': 'mx-t-' + id, tabindex: '-1' },
      [h('header', { class: 'mx-x__head' }, [h('div', { class: 'mx-x__titles' }, [title, sub]), tools]), body, src]);
    return { el: el, title: title, sub: sub, tools: tools, body: body, src: src };
  }
  function setX(x, title, sub, source) {
    if (title != null) setText(x.title, title);
    if (sub != null) setText(x.sub, sub);
    if (source != null) setText(x.src, source);
  }
  /** Text with "\n" as a new line (COPY_DECK_ID: one idea per line, drawn as <br>). */
  function setText(node, s) {
    s = String(s);
    if (s.indexOf('\n') < 0) { node.textContent = s; return; }
    clear(node);
    node.appendChild(h('span', { text: s }));
  }
  /** Colour swatch for the ranked thirds (a rounded square; the map draws one shape per kecamatan). */
  function swatch(tone) { return h('span', { class: 'mx-sw mx-sw--' + tone, 'aria-hidden': 'true' }); }

  /** "Buka di Google Maps" (item 22, plan §2.8): a secondary link button that opens a new tab. */
  function gmapsA(target, opts) {
    opts = opts || {};
    var url = S().gmapsUrl(target);
    if (!url) return null;
    var label = opts.label || (opts.approx ? 'Buka area di Google Maps' : 'Buka di Google Maps');
    return h('a', { class: 'btn btn--secondary mx-gm' + (opts.iconOnly ? ' mx-gm--icon' : ''), href: url, target: '_blank', rel: 'noopener noreferrer',
      title: GM_TIP, 'aria-label': opts.aria || (opts.iconOnly ? label : null) }, [icon('external'), opts.iconOnly ? null : h('span', { text: label })]);
  }

  /* ------------------------------------------------------------- product images, badge, distance (items 27-29) */

  /** A product image: alt text, intrinsic size, async decoding (item 29). */
  function brandImg(src, alt, w, ht, cls) {
    return h('img', { src: src, alt: alt || '', width: w, height: ht, decoding: 'async', loading: 'lazy', class: cls || null });
  }
  /** The small "Sudah pakai Livin' Merchant" badge of popups and drawers (item 29). */
  function lvmBadge() {
    return h('span', { class: 'mx-lvmbadge', title: 'Merchant ini ada di file Livin’ Merchant.' }, [brandImg(IMG_LVM, '', 192, 192, 'mx-lvmbadge__img'), h('span', { text: LVM_BADGE })]);
  }
  /** The two-product strip at the top of Merchant (item 29): plain words, no prices, no MDR, no promotion. */
  /* Sederhana (compact): the same two cards with a shorter line, so the guide column stays short. */
  function productStrip(compact) {
    function card(img, title, line, full, cls) {
      return h('article', { class: 'mx-prod ' + cls, title: compact ? full : null }, [h('span', { class: 'mx-prod__media' }, [img]),
        h('div', { class: 'mx-prod__txt' }, [h('p', { class: 'mx-prod__t', text: title }), h('p', { class: 'mx-prod__p', text: compact ? line : full })])]);
    }
    return h('section', { class: 'mx-prods' + (compact ? ' mx-prods--compact' : ''), 'aria-label': 'Produk untuk merchant' }, [
      card(brandImg(IMG_LVM, 'Ikon aplikasi Livin’ Merchant', 192, 192, 'mx-prod__img mx-prod__img--lvm'), 'Livin’ Merchant',
        'QRIS di HP, toko kecil.', 'Terima QRIS melalui HP, cocok untuk toko kecil.', 'mx-prod--lvm'),
      card(brandImg(IMG_EDC, 'Mesin EDC Mandiri, model Android dan model tombol', 474, 760, 'mx-prod__img mx-prod__img--edc'), 'EDC Mandiri',
        'Kartu dan QRIS, belanja besar.', 'Terima kartu debit, kartu kredit dan QRIS untuk belanja besar.', 'mx-prod--edc')
    ]);
  }
  /** The Livin' Merchant icon beside the section title (item 29); the title text itself is not changed. */
  function headerIcon() {
    var head = page && page.head, title = head && head.querySelector ? head.querySelector('.pg-title') : null;
    if (!title || !title.parentNode || (head.querySelector && head.querySelector('.mx-title-ic'))) return;
    title.parentNode.insertBefore(brandImg(IMG_LVM, '', 192, 192, 'mx-title-ic'), title);
  }
  function D() { var x = MCD.distance; return x && typeof x.of === 'function' ? x : null; }
  /** "x,x km · ± y menit" with its plain tooltip (item 27). */
  /* table cells show "4,2 km · ± 14 menit" without "(jam sibuk, tanpa tol)"; the column header names the mode once (distCol) */
  function distSpan(r, cls) { return h('span', { class: 'mx-dist' + (cls ? ' ' + cls : ''), title: S().distTip(r), text: S().distText(r).replace(/\s*\((?:jam sibuk|tanpa tol)[^)]*\)\s*$/, '') }); }
  function distCol() { var m = [S().peakOn() ? 'jam sibuk' : null, S().noTollOn() ? 'tanpa tol' : null].filter(Boolean).join(', '); return DIST_COL + (m ? ' (' + m + ')' : ''); }
  function distSig() { return [S().peakOn() ? 1 : 0, S().noTollOn() ? 1 : 0, D() ? 'd' : 'x'].join(''); }
  /** The shared toggles "Jam sibuk" and "Motor (tanpa tol)" (MCD.distance, remembered per browser by the shell). */
  function travelToggles() {
    var Dx = D();
    if (!Dx || typeof Dx.setPeak !== 'function' || typeof Dx.setNoToll !== 'function') return null;
    /* the one shared "Waktu tempuh" control (MCD.distance.controls); own chips only when it is missing */
    if (typeof Dx.controls === 'function') {
      var c = null;
      try { c = Dx.controls({ compact: true }); } catch (e) { c = null; }
      if (c) { var wrap = h('div', { class: 'mx-travel' }, [c]); wrap.sync = function () { if (typeof c.sync === 'function') c.sync(); }; return wrap; }
    }
    function tog(label, title, on, set) {
      var b = h('button', { type: 'button', class: 'chip mx-chip mx-tog', 'aria-pressed': on() ? 'true' : 'false', title: title }, [h('span', { class: 'mx-tog__box', 'aria-hidden': 'true' }), h('span', { text: label })]);
      b.addEventListener('click', function () { safe(function () { set(!on()); }); b.setAttribute('aria-pressed', on() ? 'true' : 'false'); });
      b.sync = function () { b.setAttribute('aria-pressed', on() ? 'true' : 'false'); };
      return b;
    }
    var peak = tog('Jam sibuk', 'Waktu tempuh saat jam sibuk. Faktor ini asumsi dan dapat diubah di Data & Privasi.', function () { return S().peakOn(); }, function (v) { Dx.setPeak(v); });
    var moto = tog('Motor (tanpa tol)', 'Rute tanpa jalan tol, untuk kunjungan dengan sepeda motor.', function () { return S().noTollOn(); }, function (v) { Dx.setNoToll(v); });
    var g = h('div', { class: 'mx-travel', role: 'group', 'aria-label': 'Waktu tempuh dari KCP' }, [h('span', { class: 'mx-travel__l', text: 'Waktu tempuh:' }), peak, moto]);
    g.sync = function () { peak.sync(); moto.sync(); };
    return g;
  }
  /** Repaints every distance after a toggle (window event 'mcd:distance' from the shell). */
  function onDistance() {
    if (!host) return;
    SIG.leads = ''; SIG.react = ''; SIG.ec = '';
    if (R.travel && R.travel.sync) R.travel.sync();
    if (deep()) paintTab(UI.tab);
    if (GV.el) gvPaint();
    if (!safe(refreshOpenCard)) safe(syncDrawerDist);
    if (S()) S().requestMap();
  }
  /**
   * v5 fixer: with cards (MCD.windows, or the phone sheet) the open merchant, LVM or kecamatan card follows "Jam sibuk" /
   * "Motor (tanpa tol)" as a whole, like Sekolah: the head numbers, the fold previews, the rows and the callout's numbers
   * come from the model, so the model is rebuilt and refilled in place (openDrawer {refresh: true} never moves anything;
   * MCD.windows updates an open callout of the same item instead). Nothing opens when neither shows. true when refilled.
   */
  function refreshOpenCard() {
    if (!ctx || !S() || !sheetsOn() || !ctx.state || typeof ctx.state.get !== 'function') return false;
    var sel = ctx.state.get().selection;
    if (!sel || (sel.kind !== 'mxPoi' && sel.kind !== 'mxLvm' && sel.kind !== 'mxKec')) return false;
    var D0 = W.document, d = D0 && D0.querySelector ? D0.querySelector('.drawer') : null, x = WS();
    var ck = x && typeof x.calloutKey === 'function' ? safe(function () { return x.calloutKey(); }) : null;
    var open = !!(d && d.classList && d.classList.contains('is-open')) || (ck != null && ck === sel.kind + ':' + sel.id);
    if (!open) return false;
    var kid = sel.kind === 'mxKec' ? kecOfSel(sel) : null;
    var model0 = sel.kind === 'mxPoi' ? poiModel(+sel.id, sel) : (sel.kind === 'mxLvm' ? lvmModel(sel.id, sel)
      : (kid ? kecModel(kid, UI.kecSheet && UI.kecSheet.id === kid ? UI.kecSheet : { listFirst: true }) : null));
    if (!model0) return false;
    ctx.openDrawer(model0, { refresh: true, keepSelection: true });
    return true;
  }
  /* v4 fixer: the open merchant or LVM drawer follows "Jam sibuk" / "Motor (tanpa tol)" in place, like the route chip
     on the map and the Sekolah and KPR drawers (no rebuild, no entrance motion). DDIST is the "Jarak dari KCP" row of
     the drawer built last; a closed or replaced drawer is no longer connected and is left alone. */
  var DDIST = null;
  function distKv(kind, id) {
    var r = kind === 'lvm' ? S().lvmDist(id) : S().poiDist(id), row = kv(DIST_COL, S().distText(r), S().distTip(r));
    DDIST = { kind: kind, id: id, row: row, el: row.querySelector ? row.querySelector('.dd-kv__v') : null };
    if (!DDIST.el && row.children) DDIST.el = row.children[1] || null;
    return row;
  }
  function syncDrawerDist() {
    var d = DDIST;
    if (!d || !d.el || !d.row || !d.row.isConnected || !S()) return;
    var r = d.kind === 'lvm' ? S().lvmDist(d.id) : S().poiDist(d.id), text = S().distText(r);
    if (d.el.textContent !== text) d.el.textContent = text;
    d.row.setAttribute('title', S().distTip(r));
  }

  /* ------------------------------------------------------------- selection helpers */

  /* item 38: with the map's kecamatan focus mode the map flies there itself (the Merchant kecamatan filter and the
     territory popup are its signals), so this section does not move the camera a second time */
  function mapFocusMode() { return !!(MCD.map && typeof MCD.map.focusArea === 'function'); }
  /* v4 fixer: the map follows the filter only when it CHANGES (MCD.sme.onView 'kec'). Opening the kecamatan that is
     already the filter (a second Ringkasan visit, Sasaran EDC then Sasaran LVM of one kecamatan, "Lihat merchant" after
     Tutup) changes nothing, so every entry point that means "open this kecamatan" also asks for the focus. The source
     is the filter's own ('filter'), so a focus already on that kecamatan does not fly again. */
  function focusKec(id) {
    if (!id || !mapFocusMode()) return;
    safe(function () { MCD.map.focusArea({ kind: 'kecamatan', id: id, source: 'filter' }); });
  }
  function fitKec(id) {
    if (!id || !TT() || !MCD.map || !MCD.map.fitBounds || privacy() === 'veil' || mapFocusMode()) return;
    var b = TT().boundsOf(id);
    if (b) MCD.map.fitBounds(b, { maxZoom: 14 });
  }
  function selectKec(id, opts) {
    opts = opts || {};
    S().setView({ kec: id || null });
    if (id && opts.fit !== false) fitKec(id);
  }
  /** "Lihat merchant" for a kecamatan: filter the list to it (a chip shows), its merchants as points on the map (the
      focused kecamatan shows them at full strength, item 38), fly there, open tab 1 at the list. */
  function showKecMerchants(id) {
    if (!id || !ctx) return;
    S().setHighlight(null);
    if (MCD.territory && MCD.territory.closePopup) safe(function () { MCD.territory.closePopup(); });
    S().setView({ kec: id, mode: 'merchants' });
    fitKec(id);
    if (deep()) { focusKec(id); showTab('prio'); scrollToPart('leads'); }
    else ctx.navigate(ID, { view: 'deep', action: 'merchants:leads' });
  }
  /** 'merchants:kec:<id>' (the shell's search, plan A-17): tab 1, the kecamatan highlighted and framed, its popup open.
      Highlight only; the list is filtered when staff press "Lihat merchant di kecamatan ini". */
  function showKecOnMap(id) {
    if (!ctx || !id) return;
    /* v5 (item 43): asked for by name (search, Ringkasan), so the list-first sheet opens directly, without a callout */
    if (sheetsOn()) { openKecSheet(id, { listFirst: true }); return; }
    if (deep()) showTab('prio');
    S().setHighlight(id);
    fitKec(id);
    var T = TT(), m = model();
    if (!T || typeof T.popup !== 'function' || !m) return;
    setTimeout(function () {
      if (!ctx) return;
      safe(function () {
        T.popup(id, { stats: m.terr, actions: kecActions(id),
          onClose: function () { if (S()) S().setHighlight(null); } });
      });
    }, mapFocusMode() ? 0 : 900);
  }
  function flyTo(pos, zoom) { if (pos && MCD.map && MCD.map.flyTo && privacy() !== 'veil') MCD.map.flyTo({ center: pos, zoom: zoom || 16.5 }); }
  /* after a remount the shell's tabs restore the remembered scroll on the next frame, so the jump waits for it */
  function scrollToPart(id, delay) {
    setTimeout(function () {
      var el = document.getElementById('mx-' + id);
      if (!el || !el.isConnected) return;
      el.scrollIntoView({ behavior: delay || (MCD.util.reducedMotion && MCD.util.reducedMotion()) ? 'auto' : 'smooth', block: 'start' });
      try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }, delay || 0);
  }

  /* ------------------------------------------------------------- priority rows (one ranking, plan D4) */

  function prioList(list, opts) {
    opts = opts || {};
    var ol = h('ol', { class: 'mx-prio' + (opts.compact ? ' mx-prio--compact' : ''), 'aria-label': 'Prioritas kunjungan' });
    list.forEach(function (p) {
      var name = 'Kec. ' + S().kecName(p.id), tone = bandTone(p.band);
      /* Sederhana: a one-line reason (the coverage % is on the map label); Detail: the full why line */
      var why = opts.compact && isNum(p.distKm) ? (opts.hasLvm && isNum(p.notYet) ? int(p.notYet) + ' belum ada di LVM' : int(p.potential) + ' merchant') + ' · ' + fm().km(p.distKm) : (p.why || '');
      var go = h('button', { type: 'button', class: 'mx-prio__go', title: 'Lihat merchant di ' + name + (opts.compact && p.why ? ' (' + p.why + ')' : ''), 'aria-label': 'Lihat merchant di ' + name + '. ' + (p.why || why) }, [
        h('span', { class: 'mx-prio__name' }, [swatch(tone), h('span', { class: 'mx-prio__nm', text: name })]),
        h('span', { class: 'mx-prio__why', text: why })
      ]);
      go.addEventListener('click', function () { showKecMerchants(p.id); });
      var acts = h('span', { class: 'mx-prio__act' });
      if (!opts.compact) {
        var see = h('button', { type: 'button', class: 'btn btn--secondary mx-btn40', text: 'Lihat merchant' });
        see.addEventListener('click', function () { showKecMerchants(p.id); });
        acts.appendChild(see);
      }
      var gm = gmapsA(p.gmaps || S().kecQuery(p.id), { iconOnly: !!opts.compact, aria: 'Buka ' + name + ' di Google Maps' });
      if (gm) acts.appendChild(gm);
      ol.appendChild(h('li', { class: 'mx-prio__row' + (p.id === S().view().kec ? ' is-on' : '') }, [h('span', { class: 'mx-prio__n', 'aria-hidden': 'true', text: String(p.rank) }), go, acts]));
    });
    return ol;
  }
  /** One-line map key in words (plan §2.5, COPY_STYLE item 23): the calm map has no coloured areas, only a label
      chip per kecamatan and, after the import, a small coloured dot on it (map.css .map-dot). */
  /* v4 (V3_REPORT §4.5): one line, so the Sederhana guide fits 1366 × 768 without scrolling, also with Data contoh;
     the colours keep their names (not colour alone) and "Klik kecamatan …" moves to the tooltip */
  function colourKey(m) {
    var p = h('p', { class: 'mx-key', title: 'Titik pada label kecamatan menunjukkan coverage. ' + 'Klik kecamatan untuk melihat angkanya.' });
    if (!m.hasLvm) {
      p.appendChild(h('span', { class: 'mx-key__i', text: 'Label peta: nama kecamatan · jumlah merchant' }));
      return p;
    }
    var rel = !!(m.bands && m.bands.applied);
    p.appendChild(h('span', { class: 'mx-key__l', text: 'Coverage:' }));
    [['ok', rel ? 'hijau tertinggi' : 'hijau 50% atau lebih'], ['mid', rel ? 'kuning tengah' : 'kuning 20–50%'], ['bad', rel ? 'merah terendah' : 'merah di bawah 20%']].forEach(function (x) {
      p.appendChild(h('span', { class: 'mx-key__i' }, [h('span', { class: 'map-dot map-dot--' + x[0], 'aria-hidden': 'true' }), h('span', { text: x[1] })]));
    });
    return p;
  }

  /* ============================================================ SEDERHANA (overview view) */

  /** "Cakupan 5 km | 15 km" (MCD.inst.scopeSwitch, section 'merchants'): moves the map and the list (sme.js keeps
      V.km in step); the cards and charts stay on the whole 15 km. null without MCD.inst. */
  function scopeCtl() {
    var I = MCD.inst;
    if (!I || typeof I.scopeSwitch !== 'function' || !I.scope) return null;
    var el = safe(function () {
      return I.scopeSwitch({ section: 'merchants', value: I.scope.get('merchants', 5),
        announce: function (v) { return 'Cakupan ' + v + ' km. Peta dan daftar menampilkan merchant dalam ' + v + ' km dari Mabes TNI.'; } });
    });
    if (el && el.mcdScope) cleanups.push(function () { el.mcdScope.destroy(); });
    return el && el.nodeType === 1 ? el : null;
  }

  function scopeKmNow() { var I = MCD.inst, v = 5; if (I && I.scope) v = safe(function () { return +I.scope.get('merchants', 5); }) || 5; return v; }

  function renderOverview(body) {
    R.ov = h('div', { class: 'mx-ov' });
    R.ov.appendChild(productStrip(true));
    var sc = scopeCtl();
    if (sc) R.ov.appendChild(h('div', { class: 'mx-ov__scope' }, [sc]));
    R.ovCards = h('div', { class: 'mx-ov__grid', role: 'list', 'aria-label': 'Angka utama' });
    R.ovSub = h('p', { class: 'mx-ov__sub' });
    R.ovMore = h('div', { class: 'mx-ov__more' });
    [R.ovCards, R.ovSub, R.ovMore].forEach(function (n) { R.ov.appendChild(n); });
    body.appendChild(R.ov);
    R.bn = [];
  }
  function bigCards(grid, list, store) {
    while (store.length > list.length) { var x = store.pop(); safe(function () { x.chart.destroy(); }); if (x.cell.parentNode) x.cell.parentNode.removeChild(x.cell); }
    grid.className = 'mx-ov__grid mx-ov__grid--n' + list.length;
    list.forEach(function (c, i) {
      var cfg = { label: c.label, value: c.value, status: c.status || null, statusLabel: c.statusLabel || null, note: c.note || null, format: c.format || 'int',
        demo: false, help: c.help || null, size: 'sm' };
      if (!store[i]) {
        var cell = h('div', { class: 'mx-ov__card', role: 'listitem' });
        grid.appendChild(cell);
        store[i] = { cell: cell, chart: C() ? C().bigNumber(cell, cfg) : null };
        if (!store[i].chart) cell.textContent = c.label + ': ' + (c.value == null ? '—' : int(c.value));
      } else if (store[i].chart) store[i].chart.update(cfg);
    });
  }
  /* Sederhana fits one screen at 1366 × 768 (plan B-07): short cards, one note line, no 100% status bars. */
  function paintOverview(force) {
    var m = model();
    if (!m || !R.ov) return;
    var sig = [m.ver, demoOn(), ctx.theme(), S().view().kec].join('|');
    if (!force && SIG.ov === sig) return;
    SIG.ov = sig;
    var t = m.totals || { potential: 0, offMap: { all: 0 }, byCategory: { grocery: {}, restaurant: {}, other: {} } };
    var sum = lvmSummary() || {};
    clear(R.ovSub);
    clear(R.ovMore);
    if (!m.hasLvm) {
      var by = t.byCategory;
      bigCards(R.ovCards, [{ label: 'Merchant dalam 15 km', value: t.potential, status: 'potential', statusLabel: 'Potensi',
        note: 'Toko kelontong ' + int(by.grocery.potential) + ' · restoran ' + int(by.restaurant.potential) + ' · UMKM lainnya ' + int(by.other.potential) }], R.bn);
      R.ovSub.hidden = true;
      var seeAll = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-ov__link' }, [h('span', { text: 'Lihat prioritas kunjungan' }), icon('chev-r')]);
      seeAll.addEventListener('click', function () { if (ctx) ctx.navigate(ID, { view: 'deep', action: 'merchants:leads' }); });
      R.ovMore.appendChild(h('section', { class: 'mx-after', 'aria-labelledby': 'mx-after-t' }, [
        h('p', { class: 'mx-after__t', id: 'mx-after-t', text: 'Yang tampil setelah file LVM diimpor' }),
        h('ul', { class: 'mx-after__list' }, [
          h('li', { text: 'Status Sudah diakuisisi atau Belum ada di LVM' }),
          h('li', { text: 'Coverage dan urutan kunjungan per kecamatan' })
        ]),
        h('p', { class: 'mx-after__p', text: 'Data pribadi pemilik dihapus saat impor.' }),
        seeAll
      ]));
    } else {
      bigCards(R.ovCards, [
        { label: 'Merchant dalam 15 km', value: known(t) },
        { label: 'Sudah diakuisisi', value: lvmAll(t), status: 'acquired' },
        { label: 'Belum ada di LVM', value: t.notYet, status: 'notYet' }
      ], R.bn);
      R.ovSub.hidden = false;
      R.ovSub.appendChild(h('span', { text: int(sum.ownWithin15 || 0) + ' di antaranya diakuisisi KCP Cilangkap', title: 'Merchant yang belum ada di LVM kemungkinan besar belum diakuisisi.\nMungkin juga terdaftar dengan nama lain.' }));
      if (m.demo && ctx && ctx.demoTag) safe(function () { ctx.demoTag(R.ovSub, { inline: true }); });
      var top = S().priorityKec(3);
      R.ovMore.appendChild(h('section', { class: 'mx-ov__prio', 'aria-labelledby': 'mx-ovp-t' }, [
        h('p', { class: 'mx-ov__h', id: 'mx-ovp-t', text: 'Prioritas kunjungan' }),
        top.length ? prioList(top, { compact: true, hasLvm: true }) : h('p', { class: 'mx-none', text: 'Belum ada kecamatan yang dapat diurutkan. Impor file LVM atau perluas jarak.' })
      ]));
    }
    R.ovMore.appendChild(colourKey(m));
    setPrimary(overviewPrimary(m));
  }
  function setPrimary(p) {
    if (!spec0 || !page) return;
    var cur = spec0.primary;
    if (cur && cur.label === p.label) return;
    spec0.primary = p;
    if (page.refill) page.refill();
  }

  /* ============================================================ DETAIL (deep view) */

  function renderDeep(body) {
    var root = h('div', { class: 'mx mx--deep' });
    body.appendChild(root);
    R.root = root;
    R.prods = productStrip();
    root.appendChild(R.prods);
    R.strip = h('dl', { class: 'mx-strip', 'aria-label': 'Ringkasan angka' });
    root.appendChild(R.strip);
    /* tabs (sticky); one tabpanel wraps the five panels (the shell's ctx.tabs labels it) */
    R.tabsBar = h('div', { class: 'mx-tabsbar' });
    root.appendChild(R.tabsBar);
    R.panelWrap = h('div', { class: 'mx-panels', tabindex: '-1' });
    buildTabs(R.tabsBar, R.panelWrap);
    /* filter row, collapsed */
    R.fcount = h('span', { class: 'mx-fbtn__n' });
    R.fbtn = h('button', { type: 'button', class: 'btn btn--secondary mx-fbtn', 'aria-expanded': UI.filterOpen ? 'true' : 'false', 'aria-controls': 'mx-filters' },
      [icon('sliders'), h('span', { text: 'Filter' }), R.fcount, icon(UI.filterOpen ? 'chev-u' : 'chev-d', 'mx-fbtn__chev')]);
    R.fbtn.addEventListener('click', function () { UI.filterOpen = !UI.filterOpen; applyFilterOpen(); });
    R.fnote = h('p', { class: 'mx-fbar__note', text: 'Cakupan dan filter mengubah peta dan daftar. Grafik tetap menampilkan seluruh area 15 km.' });
    R.fchips = h('div', { class: 'mx-fchips', role: 'group', 'aria-label': 'Filter aktif' });
    R.travel = travelToggles();
    R.fbar = h('div', { class: 'mx-fbar' }, [scopeCtl(), R.fbtn, R.fchips, R.fnote, R.travel].filter(Boolean));
    root.appendChild(R.fbar);
    R.filters = h('section', { class: 'mx-filters', id: 'mx-filters', 'aria-label': 'Filter peta dan daftar', tabindex: '-1', hidden: !UI.filterOpen });
    root.appendChild(R.filters);
    /* panels: with the shell's tabs the wrapper is the one tabpanel; the local tablist labels each panel */
    root.appendChild(R.panelWrap);
    R.panels = {};
    TABS.forEach(function (t) {
      var p = R.localTabs ? h('div', { class: 'mx-panel', role: 'tabpanel', id: 'mx-panel-' + t[0], 'aria-labelledby': 'mx-tab-' + t[0], tabindex: '-1', hidden: true })
        : h('div', { class: 'mx-panel', id: 'mx-panel-' + t[0], hidden: true });
      R.panels[t[0]] = p;
      R.panelWrap.appendChild(p);
    });
    buildPrio(R.panels.prio);
    buildEdcTab(R.panels.edc);
    buildKecTab(R.panels.kec);
    buildCatTab(R.panels.cat);
    buildStatusTab(R.panels.status);
    buildSaldoTab(R.panels.saldo);
    buildInfoTab(R.panels.info);
    showTab(UI.tab, { silent: true });
  }

  /* ------------------------------------------------------------- tabs (ctx.tabs, else a local tablist) */

  function buildTabs(parent, panel) {
    var items = TABS.map(function (t) { return { id: t[0], label: t[1] }; });
    R.localTabs = false;
    if (ctx && typeof ctx.tabs === 'function') {
      var api = safe(function () { return ctx.tabs(parent, { items: items, active: UI.tab, panel: panel, label: 'Bagian halaman Merchant', onChange: function (id) { showTab(id, { fromTabs: true }); } }); });
      if (api && api.el) { if (!api.el.parentNode) parent.appendChild(api.el); R.tabsApi = api; return; }
    }
    R.localTabs = true;
    var list = h('div', { class: 'mx-tabs', role: 'tablist', 'aria-label': 'Bagian halaman Merchant' }), btns = {};
    TABS.forEach(function (t) {
      var b = h('button', { type: 'button', class: 'mx-tab', role: 'tab', id: 'mx-tab-' + t[0], 'aria-controls': 'mx-panel-' + t[0], 'aria-selected': 'false', tabindex: '-1', text: t[1] });
      b.addEventListener('click', function () { showTab(t[0], { fromTabs: true }); });
      list.appendChild(b);
      btns[t[0]] = b;
    });
    list.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' };
      if (!(e.key in keys)) return;
      e.preventDefault();
      var ids = TABS.map(function (t) { return t[0]; }), i = ids.indexOf(UI.tab), k = keys[e.key];
      var j = k === 'first' ? 0 : (k === 'last' ? ids.length - 1 : (i + k + ids.length) % ids.length);
      showTab(ids[j], { fromTabs: true });
      btns[ids[j]].focus();
    });
    parent.appendChild(list);
    R.tabsApi = {
      el: list,
      set: function (id) {
        Object.keys(btns).forEach(function (k) {
          var on = k === id;
          btns[k].setAttribute('aria-selected', on ? 'true' : 'false');
          btns[k].setAttribute('tabindex', on ? '0' : '-1');
          btns[k].classList.toggle('is-active', on);
        });
      },
      get: function () { return UI.tab; }
    };
  }
  var TAB_PARTS = { prio: ['prio', 'leads'], edc: ['edccand'], kec: ['kec', 'heat'], cat: ['cat'], status: ['stores', 'react', 'kpi', 'edc'], saldo: ['saldo'], info: ['why', 'method'] };
  function showTab(id, opts) {
    opts = opts || {};
    if (!R.panels || !R.panels[id] || R.switching) return;
    var changed = UI.tab !== id;
    UI.tab = id;
    R.switching = true;
    try {
      Object.keys(R.panels).forEach(function (k) { R.panels[k].hidden = k !== id; });
      if (R.tabsApi && R.tabsApi.set && !(opts.fromTabs && !R.localTabs)) safe(function () { R.tabsApi.set(id); });
    } finally { R.switching = false; }
    if (opts.silent) return;
    paintTab(id);
    /* charts drawn while their panel was hidden measure again once it shows */
    Object.keys(CH).forEach(function (k) { if (CH[k] && CH[k].el && R.panels[id].contains(CH[k].el) && CH[k].resize) safe(function () { CH[k].resize(); }); });
    if (changed && opts.fromTabs && R.localTabs && R.tabsBar) {
      var sc = R.root && R.root.closest ? R.root.closest('.sheet__scroll, .guide__scroll, .rail__scroll') : null;
      if (sc && R.tabsBar.offsetTop < sc.scrollTop) sc.scrollTop = Math.max(0, R.tabsBar.offsetTop - 4);
    }
  }
  function paintTab(id) {
    switch (id) {
      case 'prio': safe(paintPrio); safe(paintLeads); break;
      case 'edc': safe(paintEdcCand); break;
      case 'kec': safe(paintKec); safe(paintHeat); break;
      case 'cat': safe(paintCat); break;
      case 'status': safe(paintStores); safe(paintReact); safe(paintKpi); safe(paintEdc); break;
      case 'saldo': safe(paintSaldo); break;
      case 'info': safe(paintMethod); break;
    }
  }

  /* ------------------------------------------------------------- summary strip (3 numbers) */

  function paintStrip() {
    var m = model();
    if (!m || !R.strip) return;
    var sig = [m.ver, demoOn()].join('|');
    if (SIG.strip === sig) return;
    SIG.strip = sig;
    clear(R.strip);
    var t = m.totals, items;
    if (!t) return;
    if (!m.hasLvm) {
      items = [['Merchant dalam 15 km', int(t.potential), 'potential'], ['Toko kelontong & ritel', int(t.byCategory.grocery.potential), null],
        ['Restoran & warung makan', int(t.byCategory.restaurant.potential), null]];
    } else {
      items = [['Merchant dalam 15 km', int(known(t)), null], ['Sudah diakuisisi', int(lvmAll(t)), 'ok', 'coverage ' + pct(t.coverageKnown)],
        ['Belum ada di LVM', int(t.notYet), 'bad']];
    }
    items.forEach(function (x) {
      R.strip.appendChild(h('div', { class: 'mx-strip__i' }, [h('dt', { class: 'mx-strip__k' }, [x[2] ? swatch(x[2]) : null, h('span', { text: x[0] })]),
        h('dd', { class: 'mx-strip__v' }, [h('span', { text: x[1] }), x[3] ? h('span', { class: 'mx-strip__s', text: x[3] }) : null])]));
    });
    if (ctx && ctx.demoTag) safe(function () { ctx.demoTag(R.strip, { when: m.hasLvm }); });
  }

  /* ------------------------------------------------------------- filters (memory only, plan B-03) */

  function applyFilterOpen() {
    if (!R.filters) return;
    R.filters.hidden = !UI.filterOpen;
    R.fbtn.setAttribute('aria-expanded', UI.filterOpen ? 'true' : 'false');
    var chev = R.fbtn.querySelector('.mx-fbtn__chev');
    if (chev) chev.replaceWith(icon(UI.filterOpen ? 'chev-u' : 'chev-d', 'mx-fbtn__chev'));
    if (UI.filterOpen) safe(paintFilters);
  }
  function chipList() {
    var v = S().view(), out = [];
    if (v.kec) out.push({ label: 'Kec. ' + S().kecName(v.kec), onClear: function () { S().setView({ kec: null }); } });
    v.cats.forEach(function (c) { out.push({ label: catShort(c), onClear: function () { S().setView({ cats: S().view().cats.filter(function (x) { return x !== c; }) }); } }); });
    /* 5 km is the "Cakupan" switch, not a filter chip */
    if (v.km && v.km !== 5) out.push({ label: 'Dalam ' + v.km + ' km', onClear: function () { S().setView({ km: scopeKmNow() === 5 ? 5 : null }); } });
    if (v.status !== 'all') {
      var st = S().STATUS_FILTER.filter(function (s) { return s.id === v.status; })[0];
      out.push({ label: 'Status: ' + lcFirst(st ? st.label : v.status), onClear: function () { S().setView({ status: 'all' }); } });
    }
    if (v.tier && v.tier !== 'all') {
      var tf = S().TIER_FILTER.filter(function (s) { return s.id === v.tier; })[0];
      out.push({ label: tf ? tf.label : v.tier, onClear: function () { S().setView({ tier: 'all' }); } });
    }
    return out;
  }
  function paintChips() {
    if (!ctx) return;
    var list = deep() ? chipList() : [];
    var shell = typeof ctx.filterChips === 'function';
    if (shell) safe(function () { ctx.filterChips(list, { onClearAll: function () { S().resetFilters(); } }); });
    if (!R.fchips) return;
    clear(R.fchips);
    R.fchips.hidden = shell || !list.length;
    if (shell) return;
    list.forEach(function (c) {
      var b = h('button', { type: 'button', class: 'chip mx-chipx', 'aria-label': 'Hapus filter ' + c.label, title: 'Hapus filter' }, [h('span', { text: c.label }), icon('close', 'mx-chipx__x')]);
      b.addEventListener('click', c.onClear);
      R.fchips.appendChild(b);
    });
    if (list.length > 1) {
      var all = h('button', { type: 'button', class: 'btn btn--ghost mx-chipx-all', text: 'Hapus filter' });
      all.addEventListener('click', function () { S().resetFilters(); });
      R.fchips.appendChild(all);
    }
  }
  function paintFilterBar() {
    if (!R.fbtn) return;
    var n = S().filterCount();
    R.fcount.textContent = n ? '(' + n + ')' : '';
    R.fbtn.classList.toggle('is-on', n > 0);
    R.fbtn.setAttribute('aria-label', n ? 'Filter, ' + n + ' aktif' : 'Filter');
    paintChips();
    if (UI.filterOpen) safe(paintFilters);
  }
  function paintFilters() {
    var m = model(), v = S().view();
    if (!R.filters || !m) return;
    var sig = [m.ver, v.rev, m.hasLvm].join('|');
    if (SIG.filters === sig) return;
    SIG.filters = sig;
    clear(R.filters);
    /* fixed order: Jarak · Kecamatan · Jenis usaha · Status */
    var dist = seg('Jarak dari Mabes TNI', [['', 'Semua']].concat(S().DIST.map(function (d) { return [String(d), d + ' km']; })), v.km ? String(v.km) : '',
      function (x) { S().setView({ km: x ? +x : null }); });
    R.filters.appendChild(frow('Jarak dari Mabes TNI', [dist], 'Mabes TNI berjarak sekitar 0,6 km dari KCP Cilangkap.'));
    var sel = h('select', { class: 'select mx-select', 'aria-label': 'Kecamatan' });
    sel.appendChild(h('option', { value: '', text: 'Semua kecamatan dalam 15 km' }));
    m.kec.filter(function (k) { return k.potential > 0; }).slice().sort(function (a, b) { return a.label.localeCompare(b.label); }).forEach(function (k) {
      sel.appendChild(h('option', { value: k.id, text: k.label + (k.in15 < 0.5 ? ' (sebagian di luar 15 km)' : '') }));
    });
    sel.value = v.kec || '';
    sel.addEventListener('change', function () { selectKec(sel.value || null); });
    R.filters.appendChild(frow('Kecamatan', [sel]));
    var counts = S().leadCounts();
    var ty = h('div', { class: 'mx-chips', role: 'group', 'aria-label': 'Jenis usaha' });
    var allT = h('button', { type: 'button', class: 'chip mx-chip', 'aria-pressed': v.cats.length ? 'false' : 'true' }, [h('span', { text: 'Semua jenis' }), h('span', { class: 'chip__count', text: int(counts.all) })]);
    allT.addEventListener('click', function () { S().setView({ cats: [] }); });
    ty.appendChild(allT);
    S().CATS.forEach(function (c) {
      var on = v.cats.indexOf(c) >= 0;
      var b = h('button', { type: 'button', class: 'chip mx-chip', 'aria-pressed': on ? 'true' : 'false', title: S().CAT[c].label },
        [h('span', { text: catShort(c) }), h('span', { class: 'chip__count', text: int(counts[c]) })]);
      b.addEventListener('click', function () {
        var cur = S().view().cats;
        cur = cur.indexOf(c) >= 0 ? cur.filter(function (q) { return q !== c; }) : cur.concat([c]);
        S().setView({ cats: cur });
      });
      ty.appendChild(b);
    });
    R.filters.appendChild(frow('Jenis usaha', [ty], m.hasLvm ? 'Angka: merchant yang belum ada di LVM, sesuai filter jarak dan kecamatan.' : 'Angka: merchant sesuai filter jarak dan kecamatan.'));
    if (m.hasLvm && v.mode === 'merchants') {
      var st = h('div', { class: 'mx-chips', role: 'group', 'aria-label': 'Status' });
      S().STATUS_FILTER.forEach(function (s) {
        var c = h('button', { type: 'button', class: 'chip mx-chip', 'aria-pressed': v.status === s.id ? 'true' : 'false' },
          [s.id !== 'all' ? h('span', { class: 'mx-dot mx-dot--' + s.id, 'aria-hidden': 'true' }) : null, h('span', { text: s.label })]);
        c.addEventListener('click', function () { S().setView({ status: s.id }); });
        st.appendChild(c);
      });
      R.filters.appendChild(frow('Status', [st], 'Hanya untuk titik merchant di peta.'));
    }
    /* item 35: Sasaran EDC (usaha menengah & besar) or Sasaran LVM (usaha kecil & mikro), on the map and in the lists */
    var tg = h('div', { class: 'mx-chips', role: 'group', 'aria-label': 'Sasaran' });
    S().TIER_FILTER.filter(function (t) { return m.hasLvm || t.id !== 'naik-edc'; }).forEach(function (t) {
      var b = h('button', { type: 'button', class: 'chip mx-chip', 'aria-pressed': (v.tier || 'all') === t.id ? 'true' : 'false', title: t.id === 'all' ? null : (S().TIERS[t.id] || {}).title || null, text: t.label });
      b.addEventListener('click', function () { S().setView({ tier: t.id }); });
      tg.appendChild(b);
    });
    R.filters.appendChild(frow('Sasaran', [tg], 'Perkiraan dari nilai belanja, keramaian dan daya beli area. Daftarnya ada di tab Kandidat EDC.'));
    var clearB = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-clear', hidden: !S().filterCount() }, [icon('close'), h('span', { text: 'Hapus filter' })]);
    clearB.addEventListener('click', function () { S().resetFilters(); });
    R.filters.appendChild(clearB);
  }
  function frow(label, kids, hint) {
    return h('div', { class: 'mx-frow' }, [h('span', { class: 'mx-flabel', text: label }), h('div', { class: 'mx-fctl' }, kids), hint ? h('p', { class: 'mx-fhint', text: hint }) : null]);
  }

  /* ------------------------------------------------------------- tab 1: Prioritas kunjungan */

  function buildPrio(panel) {
    R.prio = exhibit('prio', { cls: 'mx-x--prio' });
    R.prioBody = h('div', { class: 'mx-prio-wrap' });
    R.prio.body.appendChild(R.prioBody);
    panel.appendChild(R.prio.el);
    R.leads = exhibit('leads', {});
    buildLeadTools();
    R.leadNote = h('p', { class: 'mx-note mx-note--assume' });
    R.leadTable = h('div', { class: 'mx-table mx-table--leads', role: 'table', 'aria-label': 'Daftar merchant' });
    R.leadMore = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-more' });
    R.leadMore.addEventListener('click', function () { UI.leadShown += PAGE; SIG.leads = ''; paintLeads(); });
    [R.leadTable, R.leadMore, R.leadNote].forEach(function (n) { R.leads.body.appendChild(n); });
    panel.appendChild(R.leads.el);
  }
  function paintPrio() {
    var m = model();
    if (!m || !R.prio) return;
    var v = S().view();
    var sig = [m.ver, demoOn(), v.kec].join('|');
    if (SIG.prio === sig) return;
    SIG.prio = sig;
    var list = S().priorityKec(10);
    var top = list.slice(0, 3).map(function (p) { return 'Kec. ' + S().kecName(p.id); });
    setX(R.prio, top.length ? 'Kunjungi ' + listWords(top) + ' lebih dulu' : 'Prioritas kunjungan',
      m.hasLvm ? '10 kecamatan teratas, dipilih dari jumlah merchant yang belum ada di LVM dan jaraknya dari Mabes TNI · ' + asOfText(m)
        : '10 kecamatan teratas, dipilih dari jumlah merchant dan jaraknya dari Mabes TNI · coverage muncul setelah file LVM diimpor',
      'Sumber: ' + srcPoi() + (m.hasLvm ? ' · ' + srcLvm(m) : '') + '. Urutan menggabungkan jumlah merchant' + (m.hasLvm ? ' yang belum ada di LVM' : '') + ' dan jaraknya. Kecamatan dengan coverage tertinggi tidak masuk daftar.');
    clear(R.prioBody);
    R.prioBody.appendChild(list.length ? prioList(list, {}) : h('p', { class: 'mx-none', text: 'Belum ada kecamatan yang dapat diurutkan.' }));
  }

  function buildLeadTools() {
    R.leadQ = h('input', { type: 'search', class: 'input mx-search', placeholder: 'Cari nama merchant', 'aria-label': 'Cari nama merchant di daftar', value: UI.q });
    var deb = MCD.util.debounce(function () { UI.q = R.leadQ.value; UI.leadShown = PAGE; SIG.leads = ''; paintLeads(); }, 160);
    R.leadQ.addEventListener('input', deb);
    R.leadCount = h('span', { class: 'mx-count' });
    R.exportBtn = h('button', { type: 'button', class: 'btn btn--secondary mx-btn40', title: 'Unduh daftar ini sebagai CSV. File CSV dapat dibuka di Excel.' }, [icon('download'), h('span', { text: 'Ekspor daftar (CSV)' })]);
    R.exportBtn.addEventListener('click', exportLeads);
    if (MCD.demo && MCD.demo.guard) MCD.demo.guard(R.exportBtn);
    /* item 27: visit lists open nearest first; "Prioritas" keeps the type × closeness order */
    R.leadSort = seg('Urutan daftar', [['near', NEAR_LABEL, 'Waktu tempuh dari KCP, terdekat di atas'], ['prio', 'Prioritas', 'Jenis usaha dan kedekatan ke Mabes TNI']], UI.leadSort,
      function (v) { UI.leadSort = v; R.leadSort.setValue(v); UI.leadShown = PAGE; SIG.leads = ''; paintLeads(); });
    R.leads.tools.appendChild(h('div', { class: 'mx-toolbar' }, [h('div', { class: 'search mx-searchbox' }, [icon('search'), R.leadQ]), R.leadSort, R.leadCount, R.exportBtn]));
  }
  function filteredLeads() {
    var L = UI.leadSort === 'near' ? S().leadsNear() : S().leads(), q = String(UI.q || '').trim().toLowerCase();
    if (!q) return L;
    var idx = [], score = [], P = W.MCD_SME_POIS;
    L.idx.forEach(function (i, k) { if (String(P.rows[i][3] || '').toLowerCase().indexOf(q) >= 0) { idx.push(i); score.push(L.score[k]); } });
    return { idx: idx, score: score, n: idx.length, potentialOnly: L.potentialOnly };
  }
  /** "187 merchant belum ada di LVM di Kec. Makasar · Restoran" — counted from the filtered list (plan B-03). */
  function scopeTitle(n, m, v) {
    var s = int(n) + ' merchant' + (m.hasLvm ? ' belum ada di LVM' : (v.km ? '' : ' dalam 15 km'));
    if (v.kec) s += ' di Kec. ' + S().kecName(v.kec);
    if (v.km) s += ' dalam ' + v.km + ' km dari Mabes TNI';
    if (v.cats.length) s += ' · ' + v.cats.map(catShort).join(', ');
    return s;
  }
  function paintLeads() {
    var m = model(), v = S().view();
    if (!m || !R.leads) return;
    var sig = [m.ver, v.rev, UI.q, UI.leadShown, UI.leadSort, distSig(), privacy(), demoOn()].join('|');
    if (SIG.leads === sig) return;
    SIG.leads = sig;
    var L = filteredLeads();
    setX(R.leads, scopeTitle(L.n, m, v) + (UI.q ? ' · nama memuat “' + UI.q + '”' : ''),
      (m.hasLvm ? 'Merchant di peta publik yang belum ada di LVM, tanpa sekolah dan tempat yang bukan merchant' : 'Semua merchant di peta publik, tanpa sekolah dan tempat yang bukan merchant (file LVM belum diimpor)') +
        (UI.leadSort === 'near' ? '. Urutan: waktu tempuh dari KCP, terdekat di atas' : '. Urutan: jenis usaha dan kedekatan ke Mabes TNI'),
      'Sumber: ' + srcPoi() + (m.hasLvm ? ' · tidak ditemukan di ' + srcLvm(m) : '') + '. Hanya data merchant publik, tanpa data pribadi.');
    R.leadCount.textContent = int(L.n) + ' merchant';
    R.exportBtn.disabled = !L.n;
    if (MCD.demo && MCD.demo.guard) MCD.demo.guard(R.exportBtn);
    clear(R.leadTable);
    R.leadTable.appendChild(h('div', { class: 'mx-tr mx-tr--head', role: 'row' }, ['#', 'Nama', 'Jenis', 'Kelurahan', distCol(), 'Google Maps'].map(function (t, k) {
      return h('span', { class: 'mx-td mx-td--' + k, role: 'columnheader', text: t, title: k === 4 ? S().DIST_TIP : null });
    })));
    if (!L.n) {
      R.leadTable.appendChild(h('p', { class: 'mx-none', text: UI.q ? 'Tidak ada merchant dengan nama “' + UI.q + '”. Kosongkan kolom cari.'
        : 'Tidak ada merchant yang cocok dengan filter ini. Hapus salah satu filter.' }));
      R.leadMore.hidden = true;
    } else {
      var X = m.R.X, ids = m.ids, mode = privacy(), shown = Math.min(L.n, UI.leadShown), tone = m.hasLvm ? 'notYet' : 'potential';
      for (var k = 0; k < shown; k++) R.leadTable.appendChild(leadRow(L.idx[k], k, X, ids, mode, tone));
      R.leadMore.hidden = shown >= L.n;
      R.leadMore.textContent = 'Tampilkan ' + int(Math.min(PAGE, L.n - shown)) + ' lagi (' + int(L.n - shown) + ' tersisa)';
    }
    /* the weights explain the "Prioritas" order only; "Terdekat dari KCP" is explained by its subtitle */
    var nonM = S().nonMerchantCount ? safe(function () { return S().nonMerchantCount(); }) : null, note = [];
    if (UI.leadSort === 'prio') note.push('Urutan ini berdasarkan asumsi.', 'Bobot jenis usaha: toko kelontong 1,0, restoran 0,9, UMKM lainnya 0,6.', 'Bobot kedekatan: 1,0 di Mabes TNI, 0,2 pada 15 km.');
    if (nonM && nonM.all) note.push('Sekolah, tempat ibadah, kantor pemerintah, bank dan tempat lain yang bukan merchant tidak masuk daftar (' + int(nonM.all) + ' titik). Sekolah ada di bagian Sekolah (SMA).');
    if (m.hasLvm) note.push('Merchant yang belum ada di LVM kemungkinan besar belum diakuisisi. Mungkin juga terdaftar dengan nama lain. Periksa dulu sebelum menawarkan Livin’ Merchant.');
    setText(R.leadNote, note.join('\n'));
    R.leadNote.hidden = !note.length;
  }
  function leadRow(i, k, X, ids, mode, tone) {
    var P = W.MCD_SME_POIS, kid = ids.kec[X.kec[i]], cat = ['restaurant', 'grocery', 'other'][X.cat[i]];
    var nm = S().maskName(P.rows[i][3], mode);
    var name = h('button', { type: 'button', class: 'mx-link', text: nm, title: 'Lihat detail ' + nm });
    name.addEventListener('click', function () { openPoi(i); });
    var kel = S().kelName(ids.kel[X.kel[i]]), kec = kid ? S().kecName(kid) : '—';
    var gm = mode === 'veil' ? null : gmapsA(S().gmapsFor('mxPoi', i), { iconOnly: true, aria: 'Buka ' + nm + ' di Google Maps' });
    var r = S().poiDist(i);
    return h('div', { class: 'mx-tr', role: 'row' }, [
      h('span', { class: 'mx-td mx-td--0 mx-num', role: 'cell', text: String(k + 1) }),
      h('span', { class: 'mx-td mx-td--1', role: 'cell' }, [h('span', { class: 'mx-dot mx-dot--' + tone, 'aria-hidden': 'true' }), name]),
      h('span', { class: 'mx-td mx-td--2', role: 'cell', text: catShort(cat) }),
      h('span', { class: 'mx-td mx-td--3', role: 'cell' }, [h('span', { class: 'mx-td__l1', text: kel }), h('span', { class: 'mx-td__l2', text: 'Kec. ' + kec })]),
      h('span', { class: 'mx-td mx-td--4 mx-num', role: 'cell' }, [distSpan(r)]),
      h('span', { class: 'mx-td mx-td--5', role: 'cell' }, [gm]),
      h('span', { class: 'mx-td mx-td--m', 'aria-hidden': 'true', text: catShort(cat) + ' · Kel. ' + kel + ', Kec. ' + kec + ' · ' + S().distText(r) + ' dari KCP' })
    ]);
  }
  function exportLeads() {
    if (MCD.demo && MCD.demo.blocks && MCD.demo.blocks()) return;
    if (demoOn()) { ctx.toast('Ekspor tidak tersedia saat data contoh aktif', 'warn'); return; }
    if (privacy() === 'veil') { ctx.toast('Ekspor tidak tersedia saat nama disamarkan', 'warn'); return; }
    var L = filteredLeads();
    if (!L.n) return;
    var name = 'merchant-belum-ada-di-lvm_cilangkap_' + MCD.util.date.ymd(MCD.util.date.today()) + '.csv';
    S().download(S().leadsCsv(L), name);
    ctx.toast(int(L.n) + ' merchant diekspor. Hanya merchant publik. Nama perorangan disamarkan.');
  }

  /* ------------------------------------------------------------- tab 2: Kandidat EDC (items 32-33) */

  /* "Potensi EDC (perkiraan)": who gets EDC Mandiri as well as Livin' Merchant, from public data only (MCD.sme
     .edcCandidates). The live Google check runs only in the list without the map (GV below). */
  /* item 35: "Sasaran EDC" (usaha menengah & besar), "Sasaran LVM" (usaha kecil & mikro), "Naik ke EDC" (upsell) */
  var EC_TIERS = [['edc', 'Sasaran EDC', 'Usaha menengah dan besar, termasuk Naik ke EDC'], ['naik-edc', 'Naik ke EDC', 'Telah terdaftar di LVM dan termasuk usaha menengah atau besar'],
    ['lvm', 'Sasaran LVM', 'Usaha kecil dan mikro: tawarkan Livin’ Merchant']];
  /* item 37: why EDC needs all three factors (card volume ≈ pembeli × nilai belanja × porsi kartu), in plain words */
  var EC_TIP = 'Pendapatan bank dari EDC mengikuti nilai transaksi kartu setiap bulan.\n' +
    'Nilai itu sekitar jumlah pembeli × nilai belanja × porsi pembayaran dengan kartu.\n' +
    'Jika salah satu kecil, hasilnya kecil. Karena itu, pada Sasaran EDC tidak ada faktor yang rendah atau kecil.\n' +
    'Nilai belanja: dari jenis usaha. Toko furnitur, elektronik dan bahan bangunan jauh di atas warung.\n' +
    'Keramaian: tanda dari data publik, misalnya jaringan atau merek, kawasan usaha padat, dekat pasar, mal atau kampus.\n' +
    'Daya beli area: perkiraan dari data publik untuk setiap kelurahan, tanpa data pendapatan perorangan.\n' +
    'Sasaran EDC: nilai belanja besar, keramaian dan daya beli minimal sedang.\n' +
    'Atau nilai belanja sedang, keramaian tinggi dan daya beli minimal sedang.\n' +
    'Merchant lain: Sasaran LVM. QRIS di Livin’ Merchant cocok untuk usaha semua ukuran.\n' +
    'Naik ke EDC: telah terdaftar di LVM dan memenuhi syarat Sasaran EDC.\n' +
    'Jaringan nasional biasanya bekerja sama dengan bank di kantor pusat. Contohnya jaringan minimarket dan restoran cepat saji.\n' +
    'Jaringan nasional tetap tampil sebagai kelompok sendiri, tetapi tidak dihitung sebagai sasaran cabang.\n' +
    'Sekolah, tempat ibadah, kantor pemerintah, bank dan tempat lain yang bukan merchant tidak masuk daftar.\n' +
    'Merchant yang telah memiliki EDC Mandiri juga tidak masuk daftar.\n' +
    'Semua perkiraan, tanpa rating Google. Periksa ulasan melalui Buka di Google Maps sebelum menawarkan EDC.';
  function ecTip() { return EC_TIP; }
  var GV_N = 20;                                // the shortlist of "Cek rating Google (20)"
  function placesApi() { var P = MCD.places; return P && typeof P.hasKey === 'function' ? P : null; }
  function placesKey() { var P = placesApi(); return !!(P && safe(function () { return P.hasKey(); })); }
  function placesSig() { var P = placesApi(); return P ? (placesKey() ? 'k' : 'n') : '-'; }
  function ecTier(m) { var t = UI.ecTier; return !m.hasLvm && t === 'naik-edc' ? 'edc' : t; }
  function ecTiers(m) { var t = ecTier(m); return t === 'edc' ? ['edc', 'naik-edc'] : [t]; }
  /** The candidates of the current kecamatan and tier, in the chosen order (score, or nearest to KCP). */
  function ecList(m, v) {
    var list = S().edcCandidates({ kecamatanId: (v && v.kec) || null, limit: 0, tiers: ecTiers(m) });
    return UI.ecSort === 'near' ? S().nearestFirst(list, function (c) { return S().poiDist(c.idx); }) : list;
  }
  /** The tone of a tier for chips: 'edc' (gold), 'up' (Naik ke EDC), 'lvm' (quiet) or 'nat' (Jaringan nasional, item 42). */
  function tierTone(id) { return id === 'edc' ? 'edc' : (id === 'naik-edc' ? 'up' : (id === 'nasional' ? 'nat' : 'lvm')); }
  function tierChip(t) {
    var id = (S().tierId && S().tierId(t)) || t, T0 = S().TIERS[id], nat = id === 'nasional';
    /* the national-chain chip uses the short label in lists; its full label and the reason are in the tooltip */
    return h('span', { class: 'mx-tier mx-tier--' + tierTone(id), title: T0 ? (nat ? T0.label + '. ' + T0.title : T0.title) : null, text: T0 ? (nat ? T0.short : T0.label) : t });
  }
  /** The three factors of item 37 in a list cell: "Nilai belanja: besar", "Keramaian: sedang", "Daya beli: tinggi". */
  function factorCell(f) {
    if (!f) return null;
    function line(o, short) {
      return h('span', { class: 'mx-fx3__i', title: o.text }, [h('span', { class: 'mx-fx3__k', text: short + ': ' }), h('span', { class: 'mx-fx3__v', text: o.level == null ? 'belum diketahui' : o.level })]);
    }
    return h('span', { class: 'mx-fx3' }, [line(f.ticket, 'Nilai belanja'), line(f.crowd, 'Keramaian'), line(f.wealth, 'Daya beli')]);
  }
  /** "Rute di Google Maps" (item 36): directions from KCP to the point, coordinates only, a new tab, only on a click. */
  var ROUTE_TIP = 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.';   /* one wording in every section (COPY_DECK rule 13) */
  /* a store placed at the centre of its kelurahan or kecamatan: the route ends at that area point, not at the shop */
  var ROUTE_AREA = 'Rute ke area (perkiraan)';
  var ROUTE_AREA_TIP = 'Rute dari KCP ke titik perkiraan di tengah kelurahan atau kecamatan. Titik toko belum diketahui.\nDi Google Maps, di tab baru. Hanya koordinat yang dikirim. Perlu internet.';
  function routeA(lon, lat, opts) {
    opts = opts || {};
    if (privacy() === 'veil') return null;
    var url = S().directionsUrl ? S().directionsUrl(lon, lat) : null;
    if (!url) return null;
    var label = opts.approx ? ROUTE_AREA : 'Rute di Google Maps';
    return h('a', { class: 'btn btn--secondary mx-gm mx-route' + (opts.iconOnly ? ' mx-gm--icon' : ''), href: url, target: '_blank', rel: 'noopener noreferrer',
      title: opts.approx ? ROUTE_AREA_TIP : ROUTE_TIP, 'aria-label': opts.aria || (opts.iconOnly ? label : null) }, [icon('external'), opts.iconOnly ? null : h('span', { text: label })]);
  }
  /** Focus a public listing from a list: the dot view with the filters that would hide it cleared, then its drawer. */
  function focusPoi(i) {
    if (!ctx) return;
    safe(function () { S().revealPoi(i); });
    openPoi(i);
  }

  function buildEdcTab(panel) {
    R.ec = exhibit('edccand', { cls: 'mx-x--ec' });
    R.ecTipBtn = h('button', { type: 'button', class: 'tipbtn mx-tipbtn', 'aria-expanded': UI.ecTip ? 'true' : 'false', 'aria-controls': 'mx-ec-tip',
      'aria-label': 'Cara menghitung Potensi EDC', title: 'Cara menghitung Potensi EDC' }, [h('span', { 'aria-hidden': 'true', text: '?' })]);
    R.ecTipBox = h('div', { class: 'mx-tipbox', id: 'mx-ec-tip', role: 'note', hidden: !UI.ecTip, text: ecTip() });
    R.ecTipBtn.addEventListener('click', function () { UI.ecTip = !UI.ecTip; R.ecTipBox.hidden = !UI.ecTip; R.ecTipBtn.setAttribute('aria-expanded', UI.ecTip ? 'true' : 'false'); });
    R.ecKec = h('select', { class: 'select mx-select', 'aria-label': 'Kecamatan' });
    R.ecKec.addEventListener('change', function () { selectKec(R.ecKec.value || null, { fit: false }); });
    R.ecTierBox = h('div', { class: 'mx-ec-tiers' });
    R.ecSortSeg = seg('Urutan daftar', [['score', 'Skor tertinggi', 'Potensi EDC tertinggi di atas'], ['near', NEAR_LABEL, 'Waktu tempuh dari KCP, terdekat di atas']], UI.ecSort,
      function (v) { UI.ecSort = v; R.ecSortSeg.setValue(v); UI.ecShown = PAGE; SIG.ec = ''; paintEdcCand(); });
    /* the "?" sits beside the title, like the section's own tip */
    var trow = h('div', { class: 'mx-ec-trow' });
    R.ec.title.parentNode.insertBefore(trow, R.ec.title);
    trow.appendChild(R.ec.title);
    trow.appendChild(R.ecTipBtn);
    R.ec.tools.appendChild(h('div', { class: 'mx-toolbar' }, [R.ecKec, R.ecSortSeg]));
    R.ecGoogle = h('div', { class: 'mx-ec-google' });
    R.ecTable = h('div', { class: 'mx-table mx-table--ec', role: 'table', 'aria-label': 'Kandidat EDC' });
    R.ecMore = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-more' });
    R.ecMore.addEventListener('click', function () { UI.ecShown += PAGE; SIG.ec = ''; paintEdcCand(); });
    /* item 42: the national chains, folded under the list ("Jaringan nasional (lewat kantor pusat) · n") */
    R.ecNat = h('section', { class: 'mx-nat', id: 'mx-nat', tabindex: '-1' });
    [R.ecTipBox, R.ecTierBox, R.ecGoogle, R.ecTable, R.ecMore, R.ecNat].forEach(function (n) { R.ec.body.appendChild(n); });
    panel.appendChild(R.ec.el);
  }
  function paintEdcCand() {
    var m = model(), v = S().view();
    if (!m || !R.ec) return;
    /* the map filter "Sasaran" leads the list; "Jaringan nasional" (item 42) opens the folded group instead */
    if (v.tier === 'nasional') UI.natOpen = true;
    else if (v.tier !== 'all' && v.tier !== UI.ecTier) UI.ecTier = v.tier;
    var sig = [m.ver, v.kec, v.tier, UI.ecTier, UI.ecSort, UI.ecShown, UI.natOpen, UI.natShown, distSig(), privacy(), demoOn(), placesSig(), S().edcRule ? S().edcRule() : ''].join('|');
    if (SIG.ec === sig) return;
    SIG.ec = sig;
    /* kecamatan (the section's kecamatan filter, so the map and the chips follow) */
    if (R.ecKecVer !== m.ver) {
      R.ecKecVer = m.ver;
      clear(R.ecKec);
      R.ecKec.appendChild(h('option', { value: '', text: 'Semua kecamatan dalam 15 km' }));
      m.kec.filter(function (k) { return k.potential > 0; }).slice().sort(function (a, b) { return a.label.localeCompare(b.label); }).forEach(function (k) {
        R.ecKec.appendChild(h('option', { value: k.id, text: k.label }));
      });
    }
    R.ecKec.value = v.kec || '';
    var cnt = S().edcTierCounts({ kecamatanId: v.kec || null }), tip = ecTip();
    if (R.ecTipBox.textContent !== tip) R.ecTipBox.textContent = tip;
    clear(R.ecTierBox);
    var opts = EC_TIERS.filter(function (t) { return m.hasLvm || t[0] !== 'naik-edc'; }).map(function (t) {
      var n = t[0] === 'edc' ? cnt.edcAll : cnt[t[0]];
      return [t[0], t[1] + ' (' + int(n) + ')', t[2]];
    });
    var cur = ecTier(m);
    /* the list's choice is also the map filter "Sasaran", so the dots show the same merchants */
    R.ecTierBox.appendChild(seg('Sasaran', opts, cur, function (x) { UI.ecTier = x; UI.ecShown = PAGE; SIG.ec = ''; S().setView({ tier: x }); paintEdcCand(); }, 'mx-ec-seg'));
    var list = ecList(m, v), where = v.kec ? ' di Kec. ' + S().kecName(v.kec) : ' dalam 15 km';
    R.ecLast = list;
    var title = cur === 'lvm' ? int(cnt.lvm) + ' merchant' + where + ' termasuk Sasaran LVM, usaha kecil dan mikro'
      : (cur === 'naik-edc' ? int(cnt['naik-edc']) + ' merchant LVM' + where + ' dapat naik ke EDC'
        : int(cnt.edcAll) + ' merchant Sasaran EDC' + where + ecIncl(m, cnt));
    setX(R.ec, title, 'Potensi EDC (perkiraan) dari data publik: nilai belanja, keramaian dan daya beli area · ' + (UI.ecSort === 'near' ? 'terdekat dari KCP di atas' : 'paling sesuai di atas'),
      'Sumber: ' + srcPoi() + (W.MCD_SME_EXTRA ? ', kategori dan data usaha' : '') + (W.MCD_AREA_WEALTH ? ' · daya beli area (perkiraan dari data publik)' : '') +
        (m.hasLvm ? ' · ' + srcLvm(m) : '') + '. Perkiraan, tanpa rating Google. Merchant yang telah memiliki EDC Mandiri tidak masuk daftar.');
    paintEcGoogle(list);
    clear(R.ecTable);
    var heads = ['#', 'Nama', 'Sasaran', 'Tiga faktor', distCol(), 'Google Maps'];
    function headRow() {
      return h('div', { class: 'mx-tr mx-tr--head', role: 'row' }, heads.map(function (t, k) {
        return h('span', { class: 'mx-td mx-td--e' + k, role: 'columnheader', text: t, title: k === 4 ? S().DIST_TIP : (k === 3 ? FX_HEAD_TIP : null) });
      }));
    }
    R.ecTable.appendChild(headRow());
    safe(function () { paintNat(m, v, cnt, headRow); });
    if (!list.length) {
      R.ecTable.appendChild(h('p', { class: 'mx-none', text: 'Tidak ada kandidat dengan pilihan ini. Pilih kecamatan lain atau jenis kandidat lain.' }));
      R.ecMore.hidden = true;
      return;
    }
    var mode = privacy(), shown = Math.min(list.length, UI.ecShown);
    for (var k = 0; k < shown; k++) R.ecTable.appendChild(ecRow(list[k], k, mode));
    R.ecMore.hidden = shown >= list.length;
    R.ecMore.textContent = 'Tampilkan ' + int(Math.min(PAGE, list.length - shown)) + ' lagi (' + int(list.length - shown) + ' tersisa)';
  }
  /**
   * Item 42 (v5): "Jaringan nasional (lewat kantor pusat) · n", a folded group under Kandidat EDC. National chains (Indomaret,
   * Alfamart, KFC and similar brands) usually sign their payment terminals with banks at head office: they stay visible,
   * with their three factors, but are not counted as branch targets. The kecamatan filter applies; nearest to KCP first.
   */
  function paintNat(m, v, cnt, headRow) {
    var box = R.ecNat, T0 = S().TIERS && S().TIERS.nasional;
    if (!box) return;
    clear(box);
    var n = cnt && isNum(cnt.nasional) ? cnt.nasional : 0;
    box.hidden = !T0 || !n;
    if (box.hidden) return;
    var open = !!UI.natOpen;
    var btn = h('button', { type: 'button', class: 'mx-nat__btn', id: 'mx-nat-b', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'mx-nat-body', title: T0.title },
      [h('span', { class: 'mx-nat__t', text: T0.label + ' · ' + int(n) }), icon(open ? 'chev-u' : 'chev-d', 'mx-nat__chev')]);
    btn.addEventListener('click', function () { UI.natOpen = !UI.natOpen; SIG.ec = ''; paintEdcCand(); var b = W.document && W.document.getElementById('mx-nat-b'); if (b) safe(function () { b.focus({ preventScroll: true }); }); });
    box.appendChild(h('h3', { class: 'mx-nat__h' }, [btn]));
    var body = h('div', { class: 'mx-nat__body', id: 'mx-nat-body', hidden: !open });
    box.appendChild(body);
    if (!open) return;
    body.appendChild(h('p', { class: 'mx-note', text: T0.title }));
    var where = v && v.kec ? ' di Kec. ' + S().kecName(v.kec) : ' dalam 15 km';
    var list = S().nearestFirst(S().edcCandidates({ kecamatanId: (v && v.kec) || null, limit: 0, tiers: ['nasional'] }), function (c) { return S().poiDist(c.idx); });
    var table = h('div', { class: 'mx-table mx-table--ec', role: 'table', 'aria-label': T0.label + where });
    if (headRow) table.appendChild(headRow());
    var mode = privacy(), shown = Math.min(list.length, UI.natShown);
    for (var k = 0; k < shown; k++) table.appendChild(ecRow(list[k], k, mode));
    body.appendChild(table);
    if (shown < list.length) {
      var more = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-more', text: 'Tampilkan ' + int(Math.min(PAGE, list.length - shown)) + ' lagi (' + int(list.length - shown) + ' tersisa)' });
      more.addEventListener('click', function () { UI.natShown += PAGE; SIG.ec = ''; paintEdcCand(); });
      body.appendChild(more);
    }
  }
  /** ", termasuk 12 Naik ke EDC". Item 42 (v5): national chains are no longer part of Sasaran EDC; they are their own
      folded group under the list (paintNat), so the title counts local merchants only. */
  function ecIncl(m, cnt) {
    return m.hasLvm ? ', termasuk ' + int(cnt['naik-edc']) + ' Naik ke EDC' : '';
  }
  var FX_HEAD_TIP = 'Nilai belanja, keramaian dan daya beli area. Pada Sasaran EDC, tidak ada faktor yang rendah atau kecil.';
  /* the drawer note states the real rule (two combinations, the same words as the "?" tip and Info & cara hitung), so
     "Keramaian: sedang" next to Sasaran EDC reads right */
  var FX_NOTE = 'Sasaran EDC: nilai belanja besar, keramaian dan daya beli minimal sedang.\nAtau nilai belanja sedang, keramaian tinggi dan daya beli minimal sedang.\n' +
    'Perkiraan dari data publik. Periksa ulasan melalui Buka di Google Maps.';
  /** The second line of a list row: the kecamatan, and the three levels where the factor column does not fit. */
  function ecLine2(c, kec) {
    return h('span', { class: 'mx-td__l2' }, [h('span', { class: 'mx-td__fx', text: c.why + (kec ? ' · ' : '') }), h('span', { text: kec + (c.largeChain && kec ? ' · jaringan nasional' : '') })]);
  }
  function ecRow(c, k, mode) {
    var nm = h('button', { type: 'button', class: 'mx-link', text: c.name, title: 'Lihat ' + c.name + ' di peta' });
    nm.addEventListener('click', function () { focusPoi(c.idx); });
    var gm = mode === 'veil' ? null : gmapsA(S().gmapsFor('mxPoi', c.idx), { iconOnly: true, aria: 'Buka ' + c.name + ' di Google Maps' });
    var r = S().poiDist(c.idx), kec = c.kecamatanId ? 'Kec. ' + S().kecName(c.kecamatanId) : '';
    return h('div', { class: 'mx-tr', role: 'row' }, [
      h('span', { class: 'mx-td mx-td--e0 mx-num', role: 'cell', text: String(k + 1) }),
      h('span', { class: 'mx-td mx-td--e1', role: 'cell' }, [h('span', { class: 'mx-td__l1' }, [nm]), ecLine2(c, kec)]),
      h('span', { class: 'mx-td mx-td--e2', role: 'cell' }, [tierChip(c.tier)]),
      h('span', { class: 'mx-td mx-td--e3', role: 'cell' }, [factorCell(c.factors)]),
      h('span', { class: 'mx-td mx-td--e4 mx-num', role: 'cell' }, [distSpan(r)]),
      h('span', { class: 'mx-td mx-td--e5', role: 'cell' }, [gm])
    ]);
  }
  /** "Lihat daftar tanpa peta" and the Google check (item 33); a quiet line without a key. */
  function paintEcGoogle(list) {
    clear(R.ecGoogle);
    var open = h('button', { type: 'button', class: 'btn btn--secondary mx-btn40', title: 'Daftar kandidat di layar penuh, tanpa peta' }, [icon('menu'), h('span', { text: 'Lihat daftar tanpa peta' })]);
    open.addEventListener('click', function () { gvOpen({ items: list }); });
    var kids = [open];
    if (placesKey()) {
      var n = Math.min(GV_N, list.length), chk = h('button', { type: 'button', class: 'btn btn--primary mx-btn40', disabled: !n || privacy() === 'veil',
        title: 'Membuka daftar tanpa peta, lalu memeriksa rating Google untuk ' + n + ' merchant teratas. Perlu internet.' }, [h('span', { text: 'Cek rating Google (' + n + ')' })]);
      chk.addEventListener('click', function () { gvOpen({ items: list, check: true }); });
      kids.push(chk);
    } else if (placesApi()) {
      kids.push(h('p', { class: 'mx-quiet', text: 'Cek rating Google dapat diaktifkan di Data & Privasi.' }));
    }
    R.ecGoogle.appendChild(h('div', { class: 'mx-toolbar' }, kids));
  }

  /* ------------------------------------------------------------- list view without the map (item 33) */

  /* Google's Places terms forbid showing Places content "in conjunction with a non-Google map". The live check
     therefore runs only in this full-screen list: an opaque overlay over the whole window that also hides the map
     (body.mx-gview-open → #map hidden). Ratings, review counts, names and links from Google stay in memory while the
     list is open and are dropped when it closes; nothing is written to storage (only place IDs may ever be kept, and
     this file keeps none). Each row links to its googleMapsUri; the "Google Maps" attribution is shown with the results. */
  var GV = { el: null, items: null, res: null, token: 0, busy: false, err: null, back: null };
  function gvMapHidden() {
    var d = W.document, b = d && d.body;
    return !!(GV.el && GV.el.parentNode && b && b.classList && b.classList.contains('mx-gview-open'));
  }
  function gvOpen(opts) {
    opts = opts || {};
    var d = W.document, m = model();
    if (!d || !d.body || !m) return false;
    gvClose(true);
    GV.items = (opts.items || ecList(m, S().view())).slice(0, 100);
    GV.res = null; GV.err = null; GV.busy = false;
    GV.back = opts.back || d.activeElement || null;
    var close = h('button', { type: 'button', class: 'btn btn--secondary btn--lg mx-gview__close', title: 'Tutup (Esc)' }, [icon('close'), h('span', { text: 'Tutup daftar' })]);
    close.addEventListener('click', function () { gvClose(); });
    GV.title = h('h2', { class: 'mx-gview__t', id: 'mx-gview-t', text: 'Kandidat EDC · daftar tanpa peta' });
    GV.sub = h('p', { class: 'mx-gview__sub' });
    GV.bar = h('div', { class: 'mx-gview__bar' });
    GV.list = h('div', { class: 'mx-table mx-table--ec mx-gview__list', role: 'table', 'aria-label': 'Kandidat EDC' });
    GV.attr = h('div', { class: 'mx-gview__attr' });
    GV.src = h('p', { class: 'mx-gview__src' });
    GV.el = h('div', { class: 'mx-gview', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mx-gview-t' }, [
      h('div', { class: 'mx-gview__in' }, [h('header', { class: 'mx-gview__head' }, [h('div', { class: 'mx-gview__titles' }, [GV.title, GV.sub]), close]), GV.bar, GV.list, GV.attr, GV.src])]);
    GV.el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); gvClose(); } });
    d.body.appendChild(GV.el);
    d.body.classList.add('mx-gview-open');
    gvPaint();
    try { close.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    if (opts.check) gvCheck();
    return true;
  }
  function gvClose(silent) {
    GV.token++;
    var d = W.document, el = GV.el, back = GV.back;
    GV.el = null; GV.res = null; GV.items = null; GV.busy = false; GV.err = null; GV.back = null;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (d && d.body && d.body.classList) d.body.classList.remove('mx-gview-open');
    if (!silent && back && typeof back.focus === 'function' && back.isConnected !== false) { try { back.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    return !!el;
  }
  /** "Cek rating Google (20)": the top 20 of the list, live, only while the list without the map is open. */
  function gvCheck() {
    var P = placesApi(), rows = W.MCD_SME_POIS && W.MCD_SME_POIS.rows;
    if (!P || typeof P.checkShortlist !== 'function' || !placesKey() || !gvMapHidden() || GV.busy || !GV.items || !GV.items.length || privacy() === 'veil' || !rows) return null;
    /* the public listing name and point (Overture), never an LVM store name */
    var short = GV.items.slice(0, GV_N).map(function (c) { return { id: c.idx, name: String((rows[c.idx] && rows[c.idx][3]) || ''), lon: c.lon, lat: c.lat }; });
    var token = ++GV.token, run;
    GV.busy = true; GV.err = null;
    gvPaint();
    try { run = Promise.resolve(P.checkShortlist(short)); } catch (e) { run = Promise.reject(e); }
    return run.then(function (res) {
      if (token !== GV.token || !gvMapHidden()) return;     // closed meanwhile: the results are dropped
      GV.busy = false; GV.res = Array.isArray(res) ? res : [];
      gvPaint();
    }, function () {
      if (token !== GV.token) return;
      GV.busy = false; GV.err = 'Rating Google tidak dapat diperiksa. Periksa internet, lalu coba lagi.';
      gvPaint();
    });
  }
  function gUri(u) { u = String(u || ''); return /^https:\/\/(maps\.google\.[a-z.]+\/|(www\.)?google\.[a-z.]+\/maps)/.test(u) ? u : null; }
  function gvPaint() {
    if (!GV.el) return;
    var m = model(), v = S().view(), P = placesApi(), key = placesKey(), mode = privacy(), items = GV.items || [];
    setText(GV.sub, int(items.length) + ' kandidat' + (v.kec ? ' di Kec. ' + S().kecName(v.kec) : ' dalam 15 km') + ' · ' + (UI.ecSort === 'near' ? 'terdekat dari KCP di atas' : 'skor tertinggi di atas') +
      '\nPeta disembunyikan selama daftar ini terbuka.');
    clear(GV.bar);
    if (key) {
      var n = Math.min(GV_N, items.length), chk = h('button', { type: 'button', class: 'btn btn--primary btn--lg', disabled: GV.busy || !n || mode === 'veil' }, [h('span', { text: 'Cek rating Google (' + n + ')' })]);
      chk.addEventListener('click', function () { gvCheck(); });
      GV.bar.appendChild(chk);
      var u = P.usage ? safe(function () { return P.usage(); }) : null;
      if (u && isNum(u.used)) GV.bar.appendChild(h('span', { class: 'mx-gview__usage', text: 'Cek bulan ini: ' + int(u.used) + ' dari ' + int(isNum(u.free) ? u.free : 1000) + ' tanpa biaya' }));
    } else if (P) GV.bar.appendChild(h('p', { class: 'mx-quiet', text: 'Cek rating Google dapat diaktifkan di Data & Privasi.' }));
    var status = GV.busy ? 'Memeriksa rating Google…' : (GV.err || (GV.res ? 'Urutan: jumlah ulasan Google dikali bobot nilai belanja. Hasil hanya tampil selama daftar ini terbuka.' : ''));
    if (status) GV.bar.appendChild(h('p', { class: 'mx-gview__status', role: 'status', text: status }));
    var live = !!(GV.res && gvMapHidden());
    var rows = live ? S().googleRank(items.slice(0, GV_N), GV.res).concat(items.slice(GV_N)) : items;
    clear(GV.list);
    GV.list.appendChild(h('div', { class: 'mx-tr mx-tr--head', role: 'row' }, ['#', 'Nama', 'Sasaran', 'Tiga faktor', distCol(), live ? 'Google Maps' : 'Buka di Google Maps'].map(function (t, k) {
      return h('span', { class: 'mx-td mx-td--e' + k, role: 'columnheader', text: t, title: k === 4 ? S().DIST_TIP : (k === 3 ? FX_HEAD_TIP : null) });
    })));
    if (!rows.length) GV.list.appendChild(h('p', { class: 'mx-none', text: 'Tidak ada kandidat dengan pilihan ini. Tutup daftar, lalu pilih kecamatan lain.' }));
    rows.forEach(function (c, k) { GV.list.appendChild(gvRow(c, k, mode, live && k < GV_N)); });
    clear(GV.attr);
    if (live && P && typeof P.attribution === 'function') { var at = safe(function () { return P.attribution(); }); if (at && typeof at === 'object') GV.attr.appendChild(at); }
    GV.src.textContent = 'Sumber: ' + srcPoi() + (m && m.hasLvm ? ' · ' + srcLvm(m) : '') + (live ? ' · rating dan jumlah ulasan dari Google Maps, langsung, tidak disimpan.' : '.');
  }
  function gvRow(c, k, mode, live) {
    var g = live ? c.google : null, gl = null;
    if (g && gUri(g.googleMapsUri)) {
      var n = isNum(g.userRatingCount) ? g.userRatingCount : 0, rt = isNum(g.rating) ? fm().num(g.rating, 1) : '—';
      gl = h('a', { class: 'mx-gr', href: gUri(g.googleMapsUri), target: '_blank', rel: 'noopener noreferrer', title: 'Buka di Google Maps, di tab baru. Perlu internet.',
        'aria-label': 'Rating Google ' + rt + ', ' + int(n) + ' ulasan. Buka di Google Maps' }, [
        h('span', { class: 'mx-gr__star', 'aria-hidden': 'true', text: '★' }), h('span', { class: 'mx-gr__v', text: rt }), h('span', { class: 'mx-gr__n', text: int(n) + ' ulasan' })]);
    } else if (live) gl = h('span', { class: 'mx-gr mx-gr--none', text: 'Tidak ditemukan di Google' });
    else gl = mode === 'veil' ? null : gmapsA(S().gmapsFor('mxPoi', c.idx), { iconOnly: true, aria: 'Buka ' + c.name + ' di Google Maps' });
    var gname = g && g.displayName ? (typeof g.displayName === 'object' ? g.displayName.text : g.displayName) : null;
    var kec = c.kecamatanId ? 'Kec. ' + S().kecName(c.kecamatanId) : '';
    return h('div', { class: 'mx-tr', role: 'row' }, [
      h('span', { class: 'mx-td mx-td--e0 mx-num', role: 'cell', text: String(k + 1) }),
      h('span', { class: 'mx-td mx-td--e1', role: 'cell' }, [h('span', { class: 'mx-td__l1 mx-gview__name', text: c.name }),
        gname ? h('span', { class: 'mx-td__l2', text: 'Di Google: ' + gname }) : ecLine2(c, kec)]),
      h('span', { class: 'mx-td mx-td--e2', role: 'cell' }, [tierChip(c.tier)]),
      h('span', { class: 'mx-td mx-td--e3', role: 'cell' }, [factorCell(c.factors)]),
      h('span', { class: 'mx-td mx-td--e4 mx-num', role: 'cell' }, [distSpan(S().poiDist(c.idx))]),
      h('span', { class: 'mx-td mx-td--e5', role: 'cell' }, [gl])
    ]);
  }

  /* ------------------------------------------------------------- tab 3: Kecamatan */

  function buildKecTab(panel) {
    R.kec = exhibit('kec', {});
    R.kecChart = h('div', { class: 'mx-chart mx-chart--rank' });
    R.kec.body.appendChild(R.kecChart);
    R.kecTool = seg('Kecamatan yang ditampilkan', [['top', '12 teratas'], ['all', 'Semua']], UI.comboAll ? 'all' : 'top', function (v) { UI.comboAll = v === 'all'; R.kecTool.setValue(v); SIG.kec = ''; paintKec(); });
    R.kec.tools.appendChild(R.kecTool);
    panel.appendChild(R.kec.el);
    R.heat = exhibit('heat', {});
    R.heatBox = h('div', { class: 'mx-heat' });
    R.heatMore = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-more' });
    R.heatMore.addEventListener('click', function () { UI.heatAll = !UI.heatAll; SIG.heat = ''; paintHeat(); });
    [R.heatBox, R.heatMore].forEach(function (n) { R.heat.body.appendChild(n); });
    panel.appendChild(R.heat.el);
  }
  function kecRows(m) {
    if (!m.agg) return [];
    return m.kec.filter(function (k) { return k.area && k.area.potential > 0; }).map(function (k) {
      var a = k.area;
      return { id: k.id, label: k.label, name: k.name, kota: k.kota, in15: k.in15, a: a, lvm: a.acquired + a.offMap.all, notYet: a.notYet, potential: a.potential,
        cov: a.coverageKnown, band: a.band };
    });
  }
  /** The kecamatan cut points ({lo, hi}) of the relative bands, when they apply. */
  function relCut(m) { var b = m && m.bands; return b && b.applied && isNum(b.lo) && isNum(b.hi) ? { lo: b.lo, hi: b.hi } : null; }
  function paintKec() {
    var m = model(), v = S().view();
    if (!m || !R.kec) return;
    var sig = [m.ver, UI.comboAll, demoOn(), v.kec || ''].join('|');
    if (SIG.kec === sig) return;
    SIG.kec = sig;
    /* B-09: ranked horizontal bars, full kecamatan names left-aligned (never rotated), the count at the end of each
       bar and a separate coverage column whose dot uses the map's colour for that kecamatan */
    var rows = kecRows(m), data, cfg = { label: 'Merchant dan coverage per kecamatan', categoryLabel: 'Kecamatan', highlight: v.kec || null,
      onClick: function (p) { if (p && p.key) selectKec(S().view().kec === p.key ? null : p.key); } };
    if (!m.hasLvm) {
      rows.sort(function (a, b) { return b.potential - a.potential; });
      var top = UI.comboAll ? rows : rows.slice(0, 12);
      data = { rows: top.map(function (r) { return { key: r.id, label: r.label, value: r.potential }; }) };
      cfg.color = 'potential'; cfg.valueLabel = 'Merchant publik';
      var t3 = rows.slice(0, 3).map(function (r) { return r.label + ' (' + int(r.potential) + ')'; });
      setX(R.kec, 'Merchant terbanyak ada di Kec. ' + listWords(t3), 'Jumlah merchant publik per kecamatan dalam 15 km · ' + (UI.comboAll ? 'semua ' + rows.length + ' kecamatan' : '12 teratas') + ' · coverage muncul setelah file LVM diimpor',
        'Sumber: ' + srcPoi() + ' · batas kecamatan © kontributor OpenStreetMap, BPS.');
    } else {
      rows.sort(function (a, b) { return b.notYet - a.notYet; });
      var shown = UI.comboAll ? rows : rows.slice(0, 12);
      data = { rows: shown.map(function (r) {
        return { key: r.id, label: r.label, value: r.notYet, dot: r.cov, dotTone: r.band, sub: int(r.lvm) + ' sudah diakuisisi' };
      }) };
      cfg.color = 'notYet'; cfg.valueLabel = 'Belum ada di LVM'; cfg.dotLabel = 'Coverage'; cfg.demo = true;
      var top3 = rows.slice(0, 3).map(function (r) { return r.label + ' (' + int(r.notYet) + ')'; });
      setX(R.kec, 'Merchant yang belum ada di LVM paling banyak di Kec. ' + listWords(top3),
        'Jumlah merchant yang belum ada di LVM (batang) dan coverage (titik) per kecamatan · ' + (UI.comboAll ? 'semua ' + rows.length + ' kecamatan' : '12 kecamatan teratas') + ' · ' + asOfText(m),
        'Sumber: ' + srcPoi() + ' · ' + srcLvm(m) + '. Coverage = porsi merchant di kecamatan itu yang telah terdaftar di LVM.');
    }
    var opts = R.kecTool.querySelectorAll('.seg__opt');
    if (opts[1]) opts[1].textContent = 'Semua ' + rows.length;
    R.kecKeys = data.rows.map(function (r) { return r.key; });
    chart('kec', 'rankBars', R.kecChart, data, cfg);
  }

  function paintHeat() {
    var m = model(), v = S().view();
    if (!m || !R.heat) return;
    var sig = [m.ver, UI.heatAll, v.kec, demoOn()].join('|');
    if (SIG.heat === sig) return;
    SIG.heat = sig;
    if (!m.hasLvm) {
      dropChart('heat');
      clear(R.heatBox);
      setX(R.heat, 'Coverage per kecamatan dan jenis usaha', 'Muncul setelah file LVM diimpor', '');
      R.heatBox.appendChild(emptyCard('Coverage muncul setelah file LVM diimpor',
        [h('p', { text: 'Sebelum file Rev LVM diimpor, tabel ini belum dapat diisi.' })], importBtn('Impor file LVM', true)));
      R.heatMore.hidden = true;
      return;
    }
    var L = MCD.lvm, CS = MCD.charts && MCD.charts.status, minIn = (m.bands && m.bands.minInFocus) || 0.5;
    var rows = kecRows(m).filter(function (r) { return r.in15 >= minIn; });
    var cols = [{ key: 'all', label: 'Semua jenis' }].concat(S().CATS.map(function (c) { return { key: c, label: catShort(c) }; }));
    function covOf(a, c) {
      if (c === 'all') return { v: a.coverageKnown, n: a.acquired + a.offMap.all, of: a.potential + a.offMap.all, pot: a.potential };
      var b = a.byCategory[c], off = a.offMap[c] || 0, den = b.potential + off;
      return { v: den && b.potential ? (b.acquired + off) / den : null, n: b.acquired + off, of: den, pot: b.potential };
    }
    /* thirds per column among the ranked kecamatan (the "Semua jenis" column uses the map's own cut points,
       so it matches the kecamatan colours); the same cut rule as the map (MCD.charts.status.rankCuts) */
    var cuts = {}, terc = CS && CS.rankCuts ? CS.rankCuts : L.terciles;
    cols.forEach(function (c) {
      cuts[c.key] = c.key === 'all' ? relCut(m) : terc(rows.map(function (r) { var x = covOf(r.a, c.key); return x.pot > 0 ? x.v : null; }).filter(isNum));
    });
    rows.sort(function (a, b) { return (a.cov - b.cov) || (b.notYet - a.notYet); });
    var shown = UI.heatAll ? rows : rows.slice(0, 12);
    R.heatKeys = shown.map(function (r) { return r.id; });
    var data = {
      rows: shown.map(function (r) { return { key: r.id, label: r.name, sub: S().kotaShort(r.kota) }; }),
      cols: cols,
      values: shown.map(function (r) {
        return cols.map(function (c) {
          var x = covOf(r.a, c.key);
          if (!isNum(x.v) || !x.pot) return null;
          return { value: x.v, n: x.n, of: x.of };
        });
      })
    };
    var cfg = { scale: 'ranked', rankBy: 'col', cuts: cuts, format: 'pctAuto', cellLabel: true, demo: true, tableToggle: true,
      label: 'Coverage per kecamatan dan jenis usaha', rowLabel: 'Kecamatan', valueLabel: 'Coverage', countLabel: 'Merchant LVM', unit: 'merchant',
      noneWords: 'Abu-abu: tidak ada merchant publik jenis ini', minCellWidth: 54, cellHeight: 40,
      onClick: function (p) { if (p && p.rowKey) selectKec(S().view().kec === p.rowKey ? null : p.rowKey); } };
    chart('heat', 'heatmap', R.heatBox, data, cfg);
    if (CH.heat) safe(function () { CH.heat.highlight(v.kec && R.heatKeys.indexOf(v.kec) >= 0 ? { row: v.kec } : null); });
    R.heatMore.hidden = rows.length <= 12;
    R.heatMore.textContent = UI.heatAll ? 'Tampilkan 12 terendah saja' : 'Tampilkan semua ' + rows.length + ' kecamatan';
    var T0 = m.totals, ct = S().CATS.map(function (c) { var x = covOf(T0, c); return { c: c, v: x.v }; }).filter(function (x) { return isNum(x.v); }).sort(function (a, b) { return a.v - b.v; });
    var title = ct.length ? 'Coverage terendah pada ' + lcFirst(catShort(ct[0].c)) + ' (' + pct(ct[0].v) + ') dan tertinggi pada ' + lcFirst(catShort(ct[ct.length - 1].c)) + ' (' + pct(ct[ct.length - 1].v) + ')' : 'Coverage per kecamatan dan jenis usaha';
    setX(R.heat, title, 'Coverage (%) per kecamatan dan jenis usaha · terendah di atas · hanya kecamatan yang separuh wilayahnya atau lebih dalam 15 km · ' + asOfText(m),
      'Sumber: ' + srcPoi() + ' · ' + srcLvm(m) + '. Warna membagi kecamatan di setiap kolom menjadi tiga kelompok: coverage tertinggi, tengah dan terendah.\nJika nilainya hampir sama, warna menggunakan batas tetap.');
  }

  /* ------------------------------------------------------------- tab 4: Jenis usaha */

  function buildCatTab(panel) {
    R.cat = exhibit('cat', { cls: 'mx-x--cat' });
    R.donut = h('div', { class: 'mx-chart mx-chart--donut' });
    R.dist = h('div', { class: 'mx-chart mx-chart--heat' });
    R.donutH = h('p', { class: 'mx-h3' });
    R.distH = h('p', { class: 'mx-h3' });
    R.cat.body.appendChild(h('div', { class: 'mx-pair' }, [h('div', { class: 'mx-pair__a' }, [R.donutH, R.donut]), h('div', { class: 'mx-pair__b' }, [R.distH, R.dist])]));
    panel.appendChild(R.cat.el);
  }
  function paintCat() {
    var m = model(), v = S().view();
    if (!m || !R.cat) return;
    var sig = [m.ver, demoOn(), v.cats.join()].join('|');
    if (SIG.cat === sig) return;
    SIG.cat = sig;
    var t = m.totals, X = m.R.X, st = m.R.pois.status, want = m.hasLvm ? 2 : 1, LC = ['restaurant', 'grocery', 'other'];
    var grid = S().BANDS.map(function () { return { grocery: 0, restaurant: 0, other: 0 }; }), near5 = 0;
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i] || st[i] !== want) continue;
      var b = S().bandIndex(X.dist[i]);
      if (b < 0) continue;
      grid[b][LC[X.cat[i]]]++;
      if (X.dist[i] <= 5) near5++;
    }
    var slices = S().CATS.map(function (c) { return { key: c, label: S().CAT[c].label, value: m.hasLvm ? t.byCategory[c].notYet : t.byCategory[c].potential, color: S().CAT[c].color }; });
    var tot = slices.reduce(function (s, x) { return s + x.value; }, 0);
    var big = slices.slice().sort(function (a, b) { return b.value - a.value; })[0];
    var what = m.hasLvm ? 'merchant yang belum ada di LVM' : 'merchant publik';
    R.donutH.textContent = cap(what) + ' per jenis usaha';
    R.distH.textContent = cap(what) + ' per jarak dan jenis usaha';
    setX(R.cat, (big ? big.label + ' mencakup ' + pct(big.value / (tot || 1)) + ' dari ' + what : 'Merchant per jenis usaha') + ' · ' + int(near5) + ' merchant berada dalam 5 km',
      cap(what) + ', jumlah per jenis usaha dan jarak dari Mabes TNI · klik irisan atau sel untuk menyaring peta dan daftar',
      'Sumber: ' + srcPoi() + (m.hasLvm ? ' · ' + srcLvm(m) : '') + '. Jenis usaha dikelompokkan dari kategori Overture.');
    chart('donut', 'donut', R.donut, { slices: slices, centerLabel: m.hasLvm ? 'Belum ada di LVM' : 'Merchant', centerValue: tot },
      { label: 'Merchant per jenis usaha', valueLabel: 'Merchant', categoryLabel: 'Jenis usaha', demo: m.hasLvm, selected: v.cats.length === 1 ? v.cats[0] : null,
        onClick: function (p) { S().setView({ cats: p && p.selected ? [p.key] : [] }); } });
    chart('dist', 'heatmap', R.dist, {
      rows: S().BANDS.map(function (bd) { return { key: bd.key, label: bd.label }; }),
      cols: S().CATS.map(function (c) { return { key: c, label: catShort(c) }; }),
      values: grid.map(function (g) { return S().CATS.map(function (c) { return g[c]; }); }), scale: 'count'
    }, { unit: 'merchant', format: 'int', cellLabel: true, label: 'Merchant per jarak dan jenis usaha', rowLabel: 'Jarak dari Mabes TNI', valueLabel: 'Merchant', demo: m.hasLvm,
      onClick: function (p) {
        if (!p) return;
        var bd = S().BANDS.filter(function (x) { return x.key === p.rowKey; })[0];
        S().setView({ cats: [p.colKey], km: bd ? Math.min(15, Math.round(bd.hi)) : null });
      } });
  }

  /* ------------------------------------------------------------- tab 5: Status LVM & EDC */

  function buildStatusTab(panel) {
    R.statusEmpty = h('div', { class: 'mx-status-empty' });
    panel.appendChild(R.statusEmpty);
    R.stores = exhibit('stores', {});
    R.storesBody = h('div', { class: 'mx-kpi' });
    R.stores.body.appendChild(R.storesBody);
    panel.appendChild(R.stores.el);
    R.react = exhibit('react', {});
    R.reactTool = seg('Cabang', [['own', 'KCP Cilangkap (12903)'], ['all', 'Semua cabang di area']], UI.inactOwn ? 'own' : 'all', function (v) {
      UI.inactOwn = v === 'own'; UI.inactShown = REACT_FIRST; R.reactTool.setValue(v); SIG.react = ''; paintReact();
    });
    R.revealBtn = h('button', { type: 'button', class: 'btn btn--secondary mx-btn40', 'aria-pressed': 'false' }, [icon('id'), h('span', { class: 'mx-reveal__t', text: 'Tampilkan nama' })]);
    R.revealBtn.addEventListener('click', toggleNames);
    R.reactExport = h('button', { type: 'button', class: 'btn btn--secondary mx-btn40', title: 'Unduh daftar ini sebagai CSV. File CSV dapat dibuka di Excel.' }, [icon('download'), h('span', { text: 'Ekspor daftar (CSV)' })]);
    R.reactExport.addEventListener('click', exportReact);
    if (MCD.demo && MCD.demo.guard) MCD.demo.guard(R.reactExport);
    R.reactSortSeg = seg('Urutan daftar', [['near', NEAR_LABEL, 'Waktu tempuh dari KCP, terdekat di atas'], ['kec', 'Kecamatan terbanyak', 'Kecamatan dengan toko tidak aktif terbanyak di atas']], UI.reactSort,
      function (v) { UI.reactSort = v; R.reactSortSeg.setValue(v); UI.inactShown = REACT_FIRST; SIG.react = ''; paintReact(); });
    R.react.tools.appendChild(h('div', { class: 'mx-toolbar' }, [R.reactTool, R.reactSortSeg, R.revealBtn, R.reactExport]));
    R.reactBody = h('div', { class: 'mx-react' });
    R.react.body.appendChild(R.reactBody);
    panel.appendChild(R.react.el);
    R.kpi = exhibit('kpi', {});
    R.kpiBody = h('div', { class: 'mx-kpi' });
    R.kpi.body.appendChild(R.kpiBody);
    panel.appendChild(R.kpi.el);
    R.edc = exhibit('edc', {});
    R.edcBody = h('div', { class: 'mx-edc' });
    R.edc.body.appendChild(R.edcBody);
    panel.appendChild(R.edc.el);
  }
  /** Before the import the LVM parts of this tab collapse into one card (plan B-04). */
  function paintStores() {
    var m = model();
    if (!m || !R.stores) return;
    var k = S().kpi(), sum = lvmSummary() || {};
    var gs = MCD.lvm && MCD.lvm.geocodeStatus ? safe(function () { return MCD.lvm.geocodeStatus(); }) : null;
    var sig = [m.ver, demoOn(), k ? k.rows.length + '|' + k.asOf : '', sum.storesInFile, gs ? gs.pending + ':' + (gs.last ? gs.last.total : 0) : ''].join('|');
    if (SIG.stores === sig) return;
    SIG.stores = sig;
    clear(R.statusEmpty);
    var lvmParts = [R.stores.el, R.react.el, R.kpi.el];
    if (!m.hasLvm) {
      lvmParts.forEach(function (el) { el.hidden = true; });
      R.statusEmpty.appendChild(emptyCard('Status toko, toko yang perlu diaktifkan kembali dan UREG/USAK muncul setelah file LVM diimpor', [
        h('p', { text: 'Impor laporan bulanan Rev LVM di Data & Privasi, dalam satu file Excel.\nSheet Rincian berisi status setiap toko.\nSheet UREG dan USAK berisi pencapaian setiap cabang.\nNama kepala cabang tidak dibaca.' }),
        S().edc() ? null : h('p', {}, ['Status EDC Mandiri memerlukan sheet ', h('code', { class: 'mx-code', text: '2_edc' }), ' dari ', fileCode(), '.'])
      ], importBtn('Impor file LVM')));
      R.statusEmpty.hidden = false;
      R.edc.el.hidden = !S().edc();
      return;
    }
    lvmParts.forEach(function (el) { el.hidden = false; });
    R.edc.el.hidden = false;
    R.statusEmpty.hidden = true;
    clear(R.storesBody);
    (R.storeCards || []).forEach(function (x) { safe(function () { x.destroy(); }); });
    R.storeCards = [];
    var t = m.totals, home = k && k.home;
    setX(R.stores, int(sum.activeOwnBranch) + ' dari ' + int(sum.storesOwnBranch) + ' toko LVM KCP Cilangkap aktif bulan ini',
      'Jumlah toko di file LVM dan angka laporan KCP Cilangkap · ' + asOfText(m),
      'Sumber: ' + srcLvm(m) + '. Toko LVM aktif dihitung dari status transaksi setiap toko. UREG dan USAK diambil dari sheet KPI laporan.');
    /* one reconciliation line (plan B-06) */
    R.storesBody.appendChild(h('p', { class: 'mx-recon' }, [
      h('span', { text: int(sum.storesInFile) + ' toko di file' }), h('span', { text: int(sum.storesWithin15) + ' dalam 15 km' }),
      h('span', { text: int(sum.storesOwnBranch) + ' milik KCP Cilangkap' })]));
    locationLine(R.storesBody, m);
    var g = h('div', { class: 'mx-kpi__grid mx-kpi__grid--3', role: 'list' });
    R.storesBody.appendChild(g);
    var cards = [{ label: 'Toko LVM aktif (KCP Cilangkap)', value: sum.activeOwnBranch, note: 'Dari ' + int(sum.storesOwnBranch) + ' toko KCP Cilangkap di file, yang bertransaksi bulan ini' }];
    if (home && isNum(home.usak)) {
      var tu = targetTone(home.usakPct);
      cards.push({ label: 'USAK (pengguna aktif, laporan)', value: home.usak, status: tu, statusLabel: TARGET_WORDS[tu], note: isNum(home.usakTarget) ? 'Target ' + int(Math.round(home.usakTarget)) + ' · ' + pct(home.usakPct) + ' dari target' : 'Laporan tidak memuat target' });
    }
    if (home && isNum(home.ureg)) {
      var tr = targetTone(home.uregPct);
      cards.push({ label: 'UREG (pengguna terdaftar, laporan)', value: home.ureg, status: tr, statusLabel: TARGET_WORDS[tr], note: isNum(home.uregTarget) ? 'Target ' + int(Math.round(home.uregTarget)) + ' · ' + pct(home.uregPct) + ' dari target' : 'Laporan tidak memuat target' });
    }
    if (!home) cards.push({ label: 'USAK (pengguna aktif, laporan)', value: null, note: 'Sheet UREG dan USAK belum diimpor' });
    cards.forEach(function (c) {
      var cell = h('div', { class: 'mx-kpi__card', role: 'listitem' });
      g.appendChild(cell);
      if (C()) R.storeCards.push(C().bigNumber(cell, { label: c.label, value: c.value, status: c.status || null, statusLabel: c.statusLabel || null, note: c.note, size: 'sm', demo: true }));
    });
    R.storesBody.appendChild(h('p', { class: 'mx-note', text: int(t.acquired) + ' toko LVM dalam 15 km ditemukan di peta publik, sedangkan ' + int(t.offMap.all) +
      ' lainnya tidak ada di peta publik. Toko itu tampil di titik jalannya, atau di pusat kelurahan jika alamatnya tidak ditemukan.' }));
  }

  /** Where the LVM stores within 15 km sit on the map, counts only (item 28): at their public listing, on their street
      (from the address, offline), or at the centre of their kelurahan or kecamatan. */
  function locationLine(parent, m) {
    var L = MCD.lvm, loc = L && L.locationSummary ? safe(function () { return L.locationSummary(); }) : null;
    if (!loc || !loc.total) return;
    var gs = L.geocodeStatus ? safe(function () { return L.geocodeStatus(); }) : null;
    var parts = [h('span', { class: 'mx-recon__k', text: 'Lokasi toko LVM dalam 15 km:' }), h('span', { text: int(loc.listing) + ' di peta publik' })];
    if (loc.exact) parts.push(h('span', { text: int(loc.exact) + ' titik tepat' }));
    if (loc.street || !loc.exact) parts.push(h('span', { text: int(loc.street) + ' titik jalan' }));
    if (loc.area || !loc.exact) parts.push(h('span', { text: int(loc.area) + ' pusat kelurahan atau kecamatan' }));
    parent.appendChild(h('p', { class: 'mx-recon mx-recon--loc', title: 'Titik jalan dihitung dari alamat toko di browser ini. Alamat tidak disimpan.' }, parts));
    var note = null;
    if (gs && gs.busy) note = 'Lokasi ' + int(gs.pending) + ' toko sedang dihitung dari alamat.';
    else if (!m.demo && !loc.fromAddress && !loc.exact && loc.area && MCD.app && typeof MCD.app.lazy === 'function') note = 'Impor ulang file Rev LVM untuk menempatkan toko di titik jalan.\nSalinan terenkripsi yang lama belum memuat titik ini.';
    if (note) parent.appendChild(h('p', { class: 'mx-note', text: note }));
  }
  function toggleNames() {
    if (!ctx) return;
    var st = ctx.state && ctx.state.get ? ctx.state.get() : null, on = !!(st && st.privacy && st.privacy.reveal);
    if (on) { MCD.state.set({ privacy: { reveal: false } }); return; }
    var ask = ctx.confirm ? ctx.confirm({ title: 'Tampilkan nama toko selama 5 menit', body: 'Pastikan layar tidak sedang dibagikan atau diproyeksikan.\nNama disamarkan lagi setelah 5 menit tanpa aktivitas.',
      ok: 'Tampilkan nama', cancel: 'Batal' }) : Promise.resolve(true);
    Promise.resolve(ask).then(function (yes) { if (yes) MCD.state.set({ privacy: { reveal: true } }); });
  }
  function paintReveal() {
    if (!R.revealBtn) return;
    var mode = privacy(), on = mode === 'reveal';
    R.revealBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    R.revealBtn.querySelector('.mx-reveal__t').textContent = on ? 'Samarkan nama' : 'Tampilkan nama';
    R.revealBtn.disabled = mode === 'veil';
    R.revealBtn.title = mode === 'veil' ? 'Nama disamarkan untuk berbagi layar' : (on ? 'Samarkan lagi nama toko' : 'Tampilkan nama toko selama 5 menit');
  }
  function paintReact() {
    var m = model(), v = S().view();
    if (!m || !R.react) return;
    paintReveal();
    var sig = [m.ver, v.rev, UI.inactOwn, UI.inactShown, UI.reactSort, distSig(), privacy(), demoOn()].join('|');
    if (SIG.react === sig) return;
    SIG.react = sig;
    clear(R.reactBody);
    if (!m.hasLvm) { dropChart('react'); return; }
    var x = S().inactive({ own: UI.inactOwn });
    R.reactX = x;
    // With a filter on, the count is for the filtered stores only, so the title names the filter and drops "dari 10"
    // (an unfiltered denominator next to a filtered count read as "0 of 10 inactive").
    var scope = (v.kec ? ' di Kec. ' + S().kecName(v.kec) : '') + (v.km ? ' dalam ' + v.km + ' km dari Mabes TNI' : '') +
      (v.cats && v.cats.length ? ' · ' + v.cats.map(catShort).join(', ') : '');
    setX(R.react, scope ? int(x.n) + (UI.inactOwn ? ' toko LVM KCP Cilangkap' : ' toko LVM') + ' tidak aktif bulan ini' + scope :
      (UI.inactOwn ? int(x.n) + ' dari ' + int(x.ownAll) + ' toko LVM KCP Cilangkap dalam 15 km tidak aktif bulan ini' : int(x.n) + ' toko LVM di area dalam 15 km tidak aktif bulan ini'),
      'Toko Livin’ Merchant yang tidak bertransaksi bulan ini, per kecamatan · ' + asOfText(m) + ' · nama disamarkan',
      'Sumber: ' + srcLvm(m) + ', sheet rincian. Hanya dibaca di browser ini, data pemilik tidak pernah disimpan.');
    R.reactExport.disabled = !x.n;
    if (MCD.demo && MCD.demo.guard) MCD.demo.guard(R.reactExport);
    if (!x.n) { R.reactBody.appendChild(h('p', { class: 'mx-none', text: 'Tidak ada toko tidak aktif yang cocok dengan filter ini. Hapus salah satu filter.' })); dropChart('react'); return; }
    var top = x.byKec.slice(0, 10);
    var box = h('div', { class: 'mx-chart mx-chart--react' });
    R.reactBody.appendChild(box);
    dropChart('react');
    chart('react', 'combo', box, { categories: top.map(function (k) { return { key: k.id, label: S().kecName(k.id) }; }),
      bars: [{ key: 'inactive', label: 'Tidak aktif bulan ini', values: top.map(function (k) { return k.n; }), color: 'partly' }], line: null },
      { label: 'Toko LVM tidak aktif bulan ini per kecamatan', categoryLabel: 'Kecamatan', demo: true, height: 200,
        onClick: function (p) { if (p && p.key) selectKec(S().view().kec === p.key ? null : p.key); } });
    R.reactBody.appendChild(h('p', { class: 'mx-note', text: int(x.zero) + ' di antaranya tidak bertransaksi sama sekali bulan ini.\n' +
      (UI.reactSort === 'near' ? 'Toko terdekat dari KCP tampil di atas.' : 'Toko yang baru mendaftar tampil lebih dulu, karena paling mudah diaktifkan kembali.') + '\nStatus ini sama dengan dasar hitung USAK.' }));
    var tbl = h('div', { class: 'mx-table mx-table--react', role: 'table', 'aria-label': 'Toko LVM yang perlu diaktifkan kembali' });
    tbl.appendChild(h('div', { class: 'mx-tr mx-tr--head', role: 'row' }, ['Toko', 'Kecamatan', 'Kelurahan', 'Terdaftar', 'Transaksi bulan ini', distCol(), 'Google Maps'].map(function (t, k) {
      return h('span', { class: 'mx-td mx-td--r' + k, role: 'columnheader', text: t, title: k === 5 ? S().DIST_TIP : null });
    })));
    var mode = privacy(), shown = Math.min(x.n, UI.inactShown);
    var items = UI.reactSort === 'near' ? S().nearestFirst(x.items, function (it) { return S().lvmDist(it.id); }) : x.items;
    for (var k = 0; k < shown; k++) tbl.appendChild(reactRow(items[k], mode));
    R.reactBody.appendChild(tbl);
    if (shown < x.n) {
      var more = h('button', { type: 'button', class: 'btn btn--ghost mx-btn40 mx-more', text: 'Tampilkan ' + int(Math.min(PAGE, x.n - shown)) + ' lagi (' + int(x.n - shown) + ' tersisa)' });
      more.addEventListener('click', function () { UI.inactShown += PAGE; SIG.react = ''; paintReact(); });
      R.reactBody.appendChild(more);
    }
  }
  function reactRow(it, mode) {
    var nm = h('button', { type: 'button', class: 'mx-link', text: S().storeName(it.name, mode) });
    nm.addEventListener('click', function () { openLvm(it.id); });
    var g = mode === 'veil' ? null : S().gmapsFor('mxLvm', it.id);
    var gm = g ? gmapsA(g, { iconOnly: true, approx: g.approx, aria: g.approx ? 'Buka area toko di Google Maps (titik perkiraan)' : 'Buka lokasi toko di Google Maps' }) : null;
    return h('div', { class: 'mx-tr', role: 'row' }, [
      h('span', { class: 'mx-td mx-td--r0', role: 'cell' }, [h('span', { class: 'mx-dot mx-dot--inactive', 'aria-hidden': 'true' }), nm, it.branchCode !== HOME ? h('span', { class: 'mx-tag', text: it.branchCode || '—' }) : null]),
      h('span', { class: 'mx-td mx-td--r1', role: 'cell', text: it.kec ? S().kecName(it.kec) : '—' }),
      h('span', { class: 'mx-td mx-td--r2', role: 'cell', text: S().kelName(it.kel) }),
      h('span', { class: 'mx-td mx-td--r3', role: 'cell', text: it.created ? fm().month(it.created, { long: true }) : '—' }),
      h('span', { class: 'mx-td mx-td--r4 mx-num', role: 'cell', text: it.freq == null ? '—' : int(it.freq) }),
      h('span', { class: 'mx-td mx-td--r5', role: 'cell' }, [distSpan(S().lvmDist(it.id), 'mx-td__l1'), h('span', { class: 'mx-td__l2', text: precLabel(it.id) })]),
      h('span', { class: 'mx-td mx-td--r6', role: 'cell' }, [gm])
    ]);
  }
  /** "titik peta publik", "titik jalan", "pusat kelurahan" … for an LVM store (item 28). */
  function precLabel(id) {
    var l = MCD.lvm && MCD.lvm.locationOf ? safe(function () { return MCD.lvm.locationOf(id); }) : null;
    return l && S().PREC_LABEL[l.precision] ? S().PREC_LABEL[l.precision] : 'lokasi belum diketahui';
  }
  function exportReact() {
    if (MCD.demo && MCD.demo.blocks && MCD.demo.blocks()) return;
    if (demoOn()) { ctx.toast('Ekspor tidak tersedia saat data contoh aktif', 'warn'); return; }
    var mode = privacy();
    if (mode === 'veil') { ctx.toast('Ekspor tidak tersedia saat nama disamarkan', 'warn'); return; }
    var x = R.reactX;
    if (!x || !x.n) return;
    S().download(S().inactiveCsv(x, mode), 'reaktivasi-lvm_cilangkap_' + MCD.util.date.ymd(MCD.util.date.today()) + '.csv');
    ctx.toast(int(x.n) + ' toko diekspor. ' + (mode === 'reveal' ? 'Nama toko ditampilkan sesuai pilihan Anda.' : 'Nama toko disamarkan.'));
  }

  function shortBranch(r) {
    var s = String(r.name || r.code || '').replace(/^(kcp|kc|kk)\s+/i, '').replace(/^(jakarta|jkt)\s+/i, '').trim() || r.code;
    return r.home ? s + ' (cabang ini)' : s;
  }
  function paintKpi() {
    var m = model();
    if (!R.kpi || !m || !m.hasLvm) return;
    var k = S().kpi();
    var sig = [m.ver, k ? k.rows.length + '|' + k.asOf : 'none', demoOn()].join('|');
    if (SIG.kpi === sig) return;
    SIG.kpi = sig;
    clear(R.kpiBody);
    dropChart('kpi');
    if (!k) {
      setX(R.kpi, 'UREG dan USAK per cabang', 'Pencapaian target per cabang (%)', 'Sumber: laporan Livin’ Merchant, sheet UREG dan USAK (belum diimpor).');
      R.kpiBody.appendChild(h('p', { class: 'mx-none', text: 'Grafik ini perlu sheet UREG dan USAK dari file Rev LVM.\nImpor file Excel lengkap di Data & Privasi.' }));
      return;
    }
    var home = k.home, d = k.asOf ? fm().month(k.asOf, { long: true }) : null;
    var title = home ? 'KCP Cilangkap mencapai ' + pct(home.uregPct) + ' target UREG dan ' + pct(home.usakPct) + ' target USAK' + (isNum(home.rankUsak) ? ' (peringkat ' + home.rankUsak + ' dari ' + k.rows.length + ' untuk USAK)' : '')
      : 'UREG dan USAK per cabang terhadap target';
    setX(R.kpi, title, 'Pencapaian target per cabang (%) · ' + (d || 'bulan terakhir') + ' · hanya tingkat cabang',
      'Sumber: ' + (k.demo ? 'data contoh (ilustrasi)' : 'laporan Livin’ Merchant, sheet UREG dan USAK' + (k.asOf ? ', per ' + dateText(k.asOf) : '')) + '. Nama kepala cabang tidak dibaca.');
    var rows = k.rows.filter(function (r) { return isNum(r.uregPct) || isNum(r.usakPct); }).slice().sort(function (a, b) { return (b.usakPct || 0) - (a.usakPct || 0); });
    var box = h('div', { class: 'mx-chart mx-chart--combo' });
    R.kpiBody.appendChild(box);
    chart('kpi', 'combo', box, {
      categories: rows.map(function (r) { return { key: String(r.code), label: shortBranch(r) }; }),
      bars: [{ key: 'ureg', label: 'UREG (pengguna terdaftar), % dari target', values: rows.map(function (r) { return r.uregPct; }), color: 'chart-4' },
        { key: 'usak', label: 'USAK (pengguna aktif), % dari target', values: rows.map(function (r) { return r.usakPct; }), color: 'chart-2' }],
      line: null, target: { value: 1, label: 'Target (100%)', axis: 'left' }
    }, { label: 'UREG dan USAK terhadap target per cabang', categoryLabel: 'Cabang', format: 'pct', demo: true, height: 300 });
    R.kpiBody.appendChild(h('p', { class: 'mx-note', text: 'Warna untuk KCP Cilangkap:\nHijau tercapai, 100% atau lebih.\nKuning hampir tercapai, 90–99%.\nMerah tertinggal, di bawah 90%.\nBatas ini merupakan asumsi dashboard.\nSales volume di laporan menggunakan satuan lain, sehingga tidak dibandingkan di sini.' }));
  }

  function paintEdc() {
    var m = model();
    if (!m || !R.edc) return;
    var e = S().edc();
    var sig = [m.ver, demoOn(), e ? e.totals.merchants : 0].join('|');
    if (SIG.edc === sig) return;
    SIG.edc = sig;
    clear(R.edcBody);
    dropChart('edc');
    (R.edcCards || []).forEach(function (x) { safe(function () { x.destroy(); }); });
    R.edcCards = [];
    if (!e) {
      setX(R.edc, 'Status EDC Mandiri', 'Merchant EDC Mandiri yang terpasang dan aktif per kecamatan', 'Sumber: daftar merchant EDC (belum diimpor).');
      if (m.hasLvm) R.edcBody.appendChild(h('p', { class: 'mx-none' }, ['Impor daftar merchant EDC (sheet ', h('code', { class: 'mx-code', text: '2_edc' }), ' dari ', fileCode(), ') untuk melihat EDC Mandiri per kecamatan.']));
      return;
    }
    var T0 = e.totals, meta = (MCD.data.meta && MCD.data.meta.edc) || {};
    setX(R.edc, int(T0.merchants) + ' merchant EDC Mandiri, ' + int(T0.active) + ' di antaranya aktif',
      'Merchant EDC Mandiri per MID, jumlah terpasang dan aktif per kecamatan dalam 15 km · ' + (meta.asOf ? dateText(meta.asOf) : 'daftar terakhir'),
      'Sumber: ' + (e.demo ? 'data contoh (ilustrasi)' : 'daftar merchant EDC' + (meta.file ? ' (' + meta.file + ')' : '')) + ' · dicocokkan dengan ' + srcPoi() + '.');
    var g = h('div', { class: 'mx-kpi__grid mx-kpi__grid--3', role: 'list' });
    R.edcBody.appendChild(g);
    [['Merchant EDC', T0.merchants, null, int(T0.terminals) + ' terminal'], ['Aktif', T0.active, 'acquired', int(T0.activeTerminals) + ' terminal aktif', 'Aktif'],
      ['Di peta publik', T0.matched, null, 'Cocok dengan merchant di peta publik']].forEach(function (x) {
      var cell = h('div', { class: 'mx-kpi__card', role: 'listitem' });
      g.appendChild(cell);
      if (C()) R.edcCards.push(C().bigNumber(cell, { label: x[0], value: x[1], status: x[2], statusLabel: x[4] || null, note: x[3], size: 'sm', demo: true }));
    });
    var top = e.byKec.slice(0, 12);
    if (top.length) {
      var box = h('div', { class: 'mx-chart mx-chart--combo' });
      R.edcBody.appendChild(box);
      chart('edc', 'combo', box, { categories: top.map(function (k) { return { key: k.id, label: S().kecName(k.id) }; }), stacked: true,
        bars: [{ key: 'active', label: 'Aktif', values: top.map(function (k) { return k.active; }), color: 'acquired' },
          { key: 'inactive', label: 'Terpasang, tidak aktif', values: top.map(function (k) { return k.installed - k.active; }), color: 'partly' }], line: null },
        { label: 'Merchant EDC Mandiri per kecamatan', categoryLabel: 'Kecamatan', demo: true, height: 260, stacked: true,
          onClick: function (p) { if (p && p.key) selectKec(S().view().kec === p.key ? null : p.key); } });
    }
  }

  /* ------------------------------------------------------------- tab 6: Saldo merchant (dataset 'saldo', MCD.saldo) */

  /* The merchant balance report staff import in Data & Privasi: read in this browser, CIF and account numbers dropped
     on reading (merchant-saldo.js). A list, biggest MtD drop first; names are hidden while "Samarkan nama" is on. */
  function buildSaldoTab(panel) {
    R.saldo = exhibit('saldo', { cls: 'mx-saldo' });
    R.saldoTools = h('div', { class: 'mx-toolbar mx-saldo__tools' });
    R.saldoBody = h('div', {});
    R.saldo.body.appendChild(R.saldoTools);
    R.saldo.body.appendChild(R.saldoBody);
    panel.appendChild(R.saldo.el);
  }
  function saldoPct(r, last) {
    var b = r.balances[last];
    if (!isNum(b) || !isNum(r.mtd) || b - r.mtd <= 0) return null;
    return r.mtd / (b - r.mtd);
  }
  function signedRp(v) { return isNum(v) ? (v > 0 ? '+' : '') + fm().rp(v) : '—'; }
  function paintSaldo() {
    if (!R.saldo) return;
    var Sd = MCD.saldo, list = Sd ? Sd.rows() : [], sm = Sd ? Sd.summary() : null, veil = privacy() === 'veil';
    var meta = (MCD.data.meta && MCD.data.meta.saldo) || {};
    var sig = [MCD.data.version, list.length, UI.saldoShow, UI.saldoSort, UI.saldoShown, veil ? 1 : 0].join('|');
    if (SIG.saldo === sig) return;
    SIG.saldo = sig;
    clear(R.saldoTools);
    clear(R.saldoBody);
    if (!sm) {
      setX(R.saldo, 'Saldo merchant nasabah', 'Saldo per tanggal dan perubahan MtD setiap merchant nasabah cabang', 'Sumber: file saldo merchant (belum diimpor).');
      var go = h('button', { type: 'button', class: 'btn btn--secondary', text: 'Buka Data & Privasi' });
      go.addEventListener('click', goImport);
      R.saldoBody.appendChild(h('p', { class: 'mx-none' }, ['Impor file saldo merchant (misalnya Cilangkap Merchant Area.xlsx) di Data & Privasi › Impor. File dibaca di browser ini; CIF dan nomor rekening tidak disimpan. ', go]));
      return;
    }
    var last = sm.asOf;
    setX(R.saldo, int(sm.drop) + ' dari ' + int(sm.n) + ' merchant nasabah turun saldonya bulan ini',
      'Saldo per ' + dateText(last) + ' · total ' + fm().rp(sm.total) + ' · ' + int(sm.growth) + ' naik, ' + int(sm.drop) + ' turun (MtD)',
      'Sumber: ' + (sm.demo ? 'data contoh (ilustrasi)' : 'file saldo merchant' + (meta.file ? ' (' + meta.file + ')' : '')) + ' · dibaca di browser ini; CIF, nomor rekening dan nama resmi tidak disimpan.');
    R.saldoTools.appendChild(seg('Tampilkan', [['all', 'Semua'], ['drop', 'Turun'], ['growth', 'Naik']], UI.saldoShow,
      function (v) { UI.saldoShow = v; UI.saldoShown = PAGE; paintSaldo(); }));
    R.saldoTools.appendChild(seg('Urutkan', [['drop', 'Turun terbanyak'], ['bal', 'Saldo terbesar'], ['name', 'Nama']], UI.saldoSort,
      function (v) { UI.saldoSort = v; paintSaldo(); }));
    var rows = list.filter(function (r) { return UI.saldoShow === 'all' || r.flagMtd === UI.saldoShow; });
    var cmp = UI.saldoSort === 'bal' ? function (a, b) { return (b.balances[last] || 0) - (a.balances[last] || 0); }
      : UI.saldoSort === 'name' ? function (a, b) { return a.name.localeCompare(b.name); }
        : function (a, b) { return (isNum(a.mtd) ? a.mtd : 0) - (isNum(b.mtd) ? b.mtd : 0); };
    rows = rows.slice().sort(cmp);
    var shown = rows.slice(0, UI.saldoShown);
    var head = ['Merchant', 'EDC', 'Produk', 'Saldo ' + fm().date(last), 'MtD', 'MtD %', 'MoM', 'Status'];
    var tb = h('tbody', {});
    shown.forEach(function (r) {
      var k = list.indexOf(r) + 1, pct = saldoPct(r, last), tone = r.flagMtd === 'drop' ? 'bad' : (r.flagMtd === 'growth' ? 'ok' : 'none');
      tb.appendChild(h('tr', {}, [
        h('td', { class: 'mx-saldo__name', title: veil ? null : (r.dba && r.dba !== r.name ? r.dba : null), text: veil ? 'Merchant ' + k : r.name }),
        h('td', { class: 'num', text: isNum(r.edc) ? int(r.edc) : (r.hasEdc === false ? '0' : '—') }),
        h('td', { text: r.product || '—' }),
        h('td', { class: 'num', text: fm().rp(r.balances[last]) }),
        h('td', { class: 'num mx-saldo__d mx-saldo__d--' + tone, text: signedRp(r.mtd) }),
        h('td', { class: 'num mx-saldo__d mx-saldo__d--' + tone, text: isNum(pct) ? (pct > 0 ? '+' : '') + fm().pct(pct, 1) : '—' }),
        h('td', { class: 'num', text: signedRp(r.mom) }),
        h('td', {}, [h('span', { class: 'map-dot map-dot--' + tone, 'aria-hidden': 'true' }), ' ', r.flagMtd === 'drop' ? 'Turun' : (r.flagMtd === 'growth' ? 'Naik' : '—')])
      ]));
    });
    var table = h('table', { class: 'tbl tbl--36 mx-saldo__tbl' }, [
      h('thead', {}, [h('tr', {}, head.map(function (t, i) { return h('th', { scope: 'col', class: i === 0 || i === 2 || i === 7 ? null : 'num', text: t }); }))]), tb]);
    R.saldoBody.appendChild(h('div', { class: 'tbl-wrap' }, [table]));
    var foot = h('div', { class: 'tbl-foot' }, [h('span', { text: int(shown.length) + ' dari ' + int(rows.length) + ' merchant' })]);
    if (rows.length > shown.length) {
      var more = h('button', { type: 'button', class: 'btn btn--ghost', text: 'Tampilkan lebih banyak' });
      more.addEventListener('click', function () { UI.saldoShown += PAGE; paintSaldo(); });
      foot.appendChild(more);
    }
    R.saldoBody.appendChild(foot);
  }

  /* ------------------------------------------------------------- tab 7: Info & cara hitung */

  /* Facts from docs/research-tni-products.json (business.products LVM and LVM-MELAJU), docs/research-sme.json
     (smeProducts LVM) and docs/research-schools.json (regulatory), all checked 12 Oct 2026. Nothing about
     GoPay, DANA or OVO terms is held there, so nothing is said about them. */
  var WHY = [
    { t: 'Tanpa biaya pendaftaran', p: 'Livin’ Merchant tanpa biaya berlangganan.\nQRIS statis dan dinamis dapat digunakan setelah registrasi selesai.\nSatu kode QRIS menerima pembayaran dari bank atau e-wallet mana pun.', s: 'bankmandiri.co.id/livin-merchant' },
    { t: 'MDR 0% untuk transaksi QRIS kecil', p: 'Mulai 1 Okt 2026, MDR QRIS 0% untuk transaksi sampai Rp100.000 di semua merchant.\nMerchant mikro (UMI) tetap 0% sampai Rp500.000.', s: 'infobanknews.com, pengumuman Bank Indonesia (Agu 2026)' },
    { t: 'Tarif lebih rendah di atas batas, sampai 31 Des 2026', p: 'Program Livin’ Merchant Special: tarif 0,3% untuk transaksi di atas Rp100.000.\nTarif reguler 0,7%.\nMerchant mikro dikenai 0,3% untuk transaksi di atas Rp500.000.', s: 'bankmandiri.co.id/livin-merchant-special', until: '2026-12-31' },
    { t: 'Dana masuk dengan cepat', p: 'Dana masuk seketika atau terjadwal, hingga lima kali sehari.\nSetiap pembayaran diberi notifikasi suara.', s: 'bankmandiri.co.id/livin-merchant' },
    { t: 'Menerima kartu selain QRIS', p: 'Card dongle tanpa biaya untuk kartu debit dan kartu kredit.\nAplikasi juga memiliki fitur katalog, stok dan multi-outlet.', s: 'bankmandiri.co.id/livin-merchant' },
    { t: 'Hadiah untuk merchant baru', p: 'MELAJU Merchant Hoki, 1 Agu sampai 31 Des 2026.\nRp200.000 setiap bulan untuk 100 merchant baru dengan transaksi terbanyak.\nSyarat: terdaftar dalam 60 hari terakhir dan paling sedikit 20 transaksi senilai Rp100.000.', s: 'bankmandiri.co.id/lvm-melaju', until: '2026-12-31' }
  ];
  function buildInfoTab(panel) {
    R.why = exhibit('why', { cls: 'mx-x--why' });
    panel.appendChild(R.why.el);
    buildWhy();
    R.method = exhibit('method', { cls: 'mx-method' });
    R.methodBody = h('div', {});
    R.method.body.appendChild(R.methodBody);
    panel.appendChild(R.method.el);
  }
  function buildWhy() {
    var today = MCD.util.date.today(), days = MCD.util.date.daysBetween(today, '2026-12-31');
    setX(R.why, 'Livin’ Merchant tanpa biaya pendaftaran. Transaksi QRIS sampai Rp100.000 dikenai MDR 0%.',
      'Bahan bicara saat mengunjungi merchant · hanya fakta bersumber, diperiksa 12 Okt 2026',
      'Sumber: bankmandiri.co.id/livin-merchant, /livin-merchant-special dan /lvm-melaju · infobanknews.com (MDR QRIS Bank Indonesia, Agu 2026) · dihimpun 12 Okt 2026.');
    if (isNum(days) && days >= 0) R.why.tools.appendChild(h('span', { class: 'mx-pill mx-pill--gold', text: int(days) + ' hari lagi untuk tarif khusus dan MELAJU' }));
    var list = h('ol', { class: 'mx-why' });
    WHY.forEach(function (w) {
      list.appendChild(h('li', { class: 'mx-why__i' }, [h('p', { class: 'mx-why__t', text: w.t }), h('p', { class: 'mx-why__p', text: w.p }), h('p', { class: 'mx-why__s', text: 'Sumber: ' + w.s })]));
    });
    R.why.body.appendChild(list);
    R.why.body.appendChild(h('p', { class: 'mx-note', text: 'Dashboard ini tidak memuat ketentuan penyedia QRIS lain. Perbandingan hanya menggunakan fakta di atas.\nBank memberi tahu merchant 30 hari kerja sebelum MDR berubah.' }));
  }
  function paintMethod() {
    var m = model();
    if (!m || !R.method) return;
    var sig = [m.ver, demoOn()].join('|');
    if (SIG.method === sig) return;
    SIG.method = sig;
    clear(R.methodBody);
    var t = m.totals;
    setX(R.method, 'Cara kerja pencocokan, warna dan urutan kunjungan', 'Definisi yang berlaku di seluruh bagian Merchant',
      'Sumber: dokumentasi teknis dashboard (pencocokan LVM dan batas wilayah) · ' + srcPoi() + (m.hasLvm ? ' · ' + srcLvm(m) : '') + '.');
    var rows = [
      ['Merchant publik', int(t.potential) + ' merchant dalam 15 km dari Mabes TNI (' + srcPoi() + ').\nSekolah, tempat ibadah, kantor pemerintah, bank dan tempat lain yang bukan merchant tidak dihitung.'],
      ['Pencocokan', 'Setiap toko LVM dibandingkan dengan merchant publik di kecamatan yang sama, berdasarkan nama.\nLalu kelurahan (dari alamat atau kode pos) dan jenis usaha ikut diperiksa.\nPasangan dianggap cocok jika skornya 0,80 atau lebih dan jelas di atas kandidat kedua.'],
      ['Hasil', m.hasLvm ? int(t.matched) + ' dari ' + int(t.inFocus) + ' toko LVM dalam 15 km ditemukan di peta publik (' + pct(t.matchRate) + '). ' + int(t.outside) + ' toko berada di luar area peta.' : 'Muncul setelah file LVM diimpor.'],
      ['Coverage', 'Coverage adalah porsi merchant yang telah tergarap.\nRumusnya: toko LVM ÷ (merchant publik + toko LVM yang tidak ada di peta publik).\nPorsi merchant publik saja tidak disebut coverage.'],
      ['Warna', 'Kecamatan yang separuh wilayahnya atau lebih dalam 15 km dibandingkan menurut coverage.\nSepertiga tertinggi diberi titik hijau, sepertiga tengah kuning, sepertiga terendah merah.\nJika coverage masih hampir sama, berlaku batas tetap.\nBatas tetap: hijau 50% atau lebih, kuning 20–50%, merah di bawah 20%.'],
      ['Prioritas kunjungan', 'Kecamatan dalam 15 km diurutkan dengan rumus berikut.\nMerchant belum ada di LVM ÷ (1 + jarak dari Mabes TNI ÷ 3 km).\nSebelum file LVM diimpor, rumus menggunakan jumlah merchant publik.\nKecamatan di sepertiga tertinggi tidak masuk daftar.'],
      /* the travel-time line only when travel times are loaded (item 27); otherwise no time is shown anywhere */
      ['Jarak', 'Jarak 15 km diukur dari pusat Mabes TNI, sekitar 0,6 km dari KCP Cilangkap.' + (hasTravel() ? '\nJarak dan waktu tempuh dari KCP adalah perkiraan jalan, lalu lintas normal.' : '')],
      ['Lokasi toko LVM', 'File Rev LVM tidak memuat koordinat.\nToko ditempatkan di jalannya dari alamat toko, di browser ini, tanpa internet.\nJika jalannya tidak ditemukan, titiknya di pusat kelurahan atau kecamatan.\nAlamat tidak disimpan. Titik jalan masih perkiraan, belum titik bangunan.'],
      ['Sasaran EDC dan LVM', 'Perkiraan dari data publik, tanpa rating Google.\nTiga faktor: nilai belanja (dari jenis usaha), keramaian (tanda di data publik) dan daya beli area (perkiraan per kelurahan).\nSasaran EDC: nilai belanja besar, keramaian dan daya beli minimal sedang.\nAtau nilai belanja sedang, keramaian tinggi dan daya beli minimal sedang.\nMerchant lain: Sasaran LVM. Naik ke EDC: telah terdaftar di LVM dan memenuhi syarat EDC.\nUrutan daftar: ketiga faktor dan jarak dari KCP.\nJaringan nasional, misalnya jaringan minimarket, tampil sebagai kelompok sendiri. Kerja samanya biasanya diatur kantor pusat, sehingga tidak dihitung sebagai sasaran cabang.\nRating Google hanya dapat diperiksa langsung di daftar tanpa peta, dan tidak disimpan.'],
      ['Google Maps', 'Tombol Buka di Google Maps hanya mengirim koordinat atau nama kecamatan.\nRute di Google Maps hanya mengirim koordinat KCP dan koordinat tujuan.\nUntuk toko LVM yang tidak ada di peta publik, titiknya titik jalan atau pusat kelurahan.'],
      ['Privasi', 'Laporan hanya dibaca di browser ini.\nNama pemilik, telepon, e-mail, rekening, CIF dan saldo dihapus saat impor.\nAlamat toko hanya dibaca untuk menemukan titik jalan atau kelurahan, lalu tidak disimpan.\nNama toko disamarkan, kecuali Anda memilih Tampilkan nama.']
    ];
    R.methodBody.appendChild(h('dl', { class: 'mx-dl' }, rows.map(function (r) { return h('div', { class: 'mx-dl__r' }, [h('dt', { text: r[0] }), h('dd', { text: r[1] })]); })));
  }

  /* ============================================================ drawers */

  function openPoi(i) {
    if (!ctx) return;
    ctx.select({ kind: 'mxPoi', id: i });
    var info = S().poiInfo(i);
    if (info) flyTo(info.pos, 16.6);
  }
  function openLvm(id) {
    if (!ctx) return;
    ctx.select({ kind: 'mxLvm', id: id });
    var st = S().lvmStore(id);
    if (st && st.loc) flyTo([st.loc.lon, st.loc.lat], 16);
  }
  /** A drawer block. v5 (item 43): the workspace folds every .dd-blk of a sheet (its "else" branch: folds from the
      .dd-blk headings); data-fold names the fold, data-open its default and data-preview the line it shows while folded. */
  function blk(title, kids, fold) {
    var el = h('section', { class: 'dd-blk' }, [h('h3', { class: 't-eyebrow dd-blk__t', text: title })].concat(kids || []));
    if (fold && fold.id) el.setAttribute('data-fold', fold.id);
    if (fold && fold.open != null) el.setAttribute('data-open', fold.open ? '1' : '0');
    if (fold && fold.preview) el.setAttribute('data-preview', String(fold.preview));
    return el;
  }
  function kv(k, v, tip) { return h('div', { class: 'dd-kv', title: tip || null }, [h('span', { class: 'dd-kv__k', text: k }), h('span', { class: 'dd-kv__v', text: v == null || v === '' ? '—' : String(v) })]); }
  var STATUS_WORDS = { potential: 'Potensi', notYet: 'Belum ada di LVM', acquired: 'Sudah diakuisisi', inactive: 'Sudah diakuisisi, tidak aktif', lvmOnly: 'Toko LVM' };
  var STATUS_TONE = { potential: 'potential', notYet: 'bad', acquired: 'ok', inactive: 'mid', lvmOnly: 'ok' };
  function statusChip(status) {
    return h('span', { class: 'mx-chipstat mx-chipstat--' + status, text: STATUS_WORDS[status] || status });
  }
  /** The Google Maps field of a drawer: the shell renders model.gmaps under the title (plan A-02); without that
      contract this section adds the same link as the first block. */
  function withGmaps(model0, target) {
    if (!target || privacy() === 'veil') return model0;
    if (MCD.util && MCD.util.gmaps) { model0.gmaps = target; return model0; }
    var a = gmapsA(target, { approx: target.approx });
    if (a) model0.body.unshift(h('div', { class: 'mx-dd-gm' }, [a, target.approx ? h('p', { class: 'mx-dd-p c-2', text: APPROX_NOTE }) : null]));
    return model0;
  }
  /** A labelled level with its reason: "Nilai belanja | besar — toko furnitur" (item 37, never a bare score). */
  function factorRow(o, tip) {
    return h('div', { class: 'dd-kv mx-fx', title: tip || o.text }, [h('span', { class: 'dd-kv__k', text: o.label }),
      h('span', { class: 'dd-kv__v' }, [h('strong', { class: 'mx-fx__lv', text: o.level == null ? 'belum diketahui' : o.level }), h('span', { text: ' — ' + o.why })])]);
  }
  function wealthTip() { var A = W.MCD_AREA_WEALTH, t = A && A.meta && A.meta.tip; return t && typeof t.id === 'string' ? t.id : null; }
  /** "Nilai belanja besar · keramaian sedang · daya beli tinggi": the one line of the callout and the folded preview. */
  function factorsLine(f) {
    if (!f) return null;
    function lv(o) { return o && o.level != null ? o.level : 'belum diketahui'; }
    return 'Nilai belanja ' + lv(f.ticket) + ' · keramaian ' + lv(f.crowd) + ' · daya beli ' + lv(f.wealth);
  }
  /** "Sasaran (perkiraan)": the tier chip and the three factors of a public listing (MCD.sme.factors / edcOf). */
  function sasaranBlock(i, info, ec, f, note) {
    if (ec === undefined) ec = S().edcOf ? S().edcOf(i) : null;
    if (f === undefined) f = ec && ec.factors ? ec.factors : (S().factors ? S().factors(i) : null);
    if (!f) return null;
    var kids = [], T0 = S().TIERS && S().TIERS.nasional;
    if (ec) kids.push(h('p', { class: 'mx-dd-p' }, [tierChip(ec.tier)]));
    else {
      /* item 42: a national chain already on LVM keeps "Sudah diakuisisi"; its terminals are a head-office matter */
      var cr = S().crowdOf ? safe(function () { return S().crowdOf(i); }) : null;
      kids.push(h('p', { class: 'mx-dd-p c-2', text: info && info.edc ? 'EDC Mandiri telah terpasang. Tidak masuk daftar Sasaran.'
        : (cr && cr.largeChain ? 'Telah terdaftar di LVM. Terminal EDC jaringan nasional biasanya diatur kantor pusat.' : 'Telah terdaftar di LVM. Belum memenuhi syarat EDC.') }));
    }
    if (ec && ec.tier === 'nasional' && T0) kids.push(h('p', { class: 'mx-dd-p c-2', text: T0.title }));
    kids.push(factorRow(f.ticket), factorRow(f.crowd), factorRow(f.wealth, wealthTip()));
    kids.push(note ? note('mx-fx-rule', FX_NOTE, 'mx-fx__note') : h('p', { class: 'mx-dd-p c-2 mx-fx__note', text: FX_NOTE }));
    return blk('Sasaran (perkiraan)', kids, { id: 'sasaran', open: true, preview: factorsLine(f) });
  }
  /** The "Rute di Google Maps" row under the location of a drawer (nothing in Samarkan nama or without a point). */
  function routeRow(lon, lat, opts) { var a = routeA(lon, lat, opts); return a ? h('div', { class: 'mx-dd-route' }, [a]) : null; }
  /** Opens a Google Maps link from a card's main action (coordinates only, a new tab, no referrer). */
  function openUrl(url) { if (url && typeof W.open === 'function') safe(function () { W.open(url, '_blank', 'noopener,noreferrer'); }); }

  /* ------------------------------------------------------------- v5 workspace: callout, sheet, trail (item 43) */

  /* COPY_STYLE_EN item 43 ("Kartu bertahap"). The shell's MCD.windows turns a drawer model into a small callout (a map
     click) or the detail sheet (a list, a crumb, a focus). This section only adds model fields the old drawer ignores
     (kind, key, brief, crumb, hints, anchor, listFirst, demo), so everything also works without MCD.windows. */
  function WS() { var x = MCD.windows; return x && typeof x.active === 'function' ? x : null; }
  function wsOn() { var x = WS(); return !!(x && safe(function () { return x.active(); })); }
  /** Cards in any form: the workspace (desk, tablet) or the app's bottom sheet on a phone (one sheet system, item 43). */
  function sheetsOn() { var x = WS(); return wsOn() || !!(x && typeof x.mode === 'function' && safe(function () { return x.mode(); }) === 'phone'); }
  /** A repeated note shows once per browser (MCD.windows.hint), then sits under the card's Sumber › Catatan; without the
      workspace it stays in place, as before. Every note of a card is listed in model.hints: the node shown in the card
      (so Catatan skips it there), else a node of its own for Catatan. */
  function noteMaker(hints) {
    return function (id, text, cls) {
      var mk = function () { return h('p', { class: 'mx-dd-p c-2' + (cls ? ' ' + cls : ''), text: text }); }, node = mk(), x = WS(), r = node;
      if (x && typeof x.hint === 'function') { try { r = x.hint(id, node); } catch (e) { r = node; } if (r === undefined) r = node; }
      hints.push({ id: id, node: r || mk() });
      return r;
    };
  }
  /** The main action of a point's card on a phone (its sticky row: "Rute di Google Maps"). On a desktop the callout
      already lists "Buka di Google Maps" and "Rute di Google Maps" in words, so "Detail" is its main action. */
  function phoneRoute(url, label, title) {
    if (!url || (W.innerWidth || 0) >= 768) return null;
    return { label: label, href: url, title: title, run: function () { openUrl(url); } };
  }
  /** The head number "Dari KCP" as Sekolah writes it (final integration): "5,8 km" over "± 19 menit dari KCP", so the
      numbers keep one row; the full text (with jam sibuk / tanpa tol) and the source stay in the tooltip. */
  function distNum(r, text) {
    var t = text || S().distText(r), cut = typeof t === 'string' ? t.indexOf(' · ') : -1, tip = S().distTip(r);
    if (cut < 0) return { label: 'Dari KCP', value: t || '—', title: tip };
    var min = t.slice(cut + 3).replace(/\s*\((?:jam sibuk|tanpa tol)[^)]*\)\s*$/, '');
    return { label: min + ' dari KCP', value: t.slice(0, cut), title: t + (tip ? '\n' + tip : '') };
  }
  function focusedKec() { var M = MCD.map; return M && typeof M.focused === 'function' ? safe(function () { return M.focused(); }) : null; }
  /** The kecamatan whose list this item was opened from (the trail "‹ Makasar"): the selection's extra.trail, or a point
      picked on the map inside the kecamatan whose list is open and still in focus. */
  function trailOf(sel, kecId) {
    var t = sel && sel.extra && sel.extra.trail;
    if (t) return String(t);
    var ks = UI.kecSheet;
    return ks && kecId && ks.id === kecId && focusedKec() === ks.id ? ks.id : null;
  }
  function crumbTo(kecId) {
    var name = S().kecName(kecId);
    return { label: name, aria: 'Kembali ke Kecamatan ' + name, run: function () { openKecSheet(kecId, { listFirst: true }); } };
  }
  function takeExplicit() { var e = !!UI.explicitNext; UI.explicitNext = false; return e; }
  /** The kecamatan sheet (list first after "Lihat merchant di kecamatan ini", numbers first after "Detail"). The selection
      {kind: 'mxKec'} holds the map's focus on the kecamatan; Tutup drops it and the camera flies back. */
  function openKecSheet(id, opts) {
    if (!ctx || !id || !S()) return false;
    opts = opts || {};
    UI.kecSheet = { id: id, listFirst: opts.listFirst !== false };
    /* its merchants show as points in the focus, for this task only (v5 fixer): MCD.sme keeps the temporary mode out of
       storage and the stored map comes back when the trail ends, whatever ends it (endTrail, unmount) */
    if (S().view().mode !== 'merchants') S().setView({ mode: 'merchants' }, { temporary: true });
    var cur = ctx.state && ctx.state.get ? ctx.state.get().selection : null;
    if (cur && cur.kind === 'mxKec' && String(cur.id) === String(id)) {
      /* the same kecamatan stays selected: no selection change, so the sheet swaps here */
      var km = safe(function () { return kecModel(id, UI.kecSheet); });
      if (km) ctx.openDrawer(km, { explicit: true });
      return true;
    }
    UI.explicitNext = true;
    ctx.select({ kind: 'mxKec', id: id, extra: { kecamatanId: id } });
    return true;
  }
  /** A row of the kecamatan list: the merchant opens in the same sheet with the crumb back to the list; the focus stays. */
  function openTrailPoi(i, kecId) {
    if (!ctx) return;
    safe(function () { S().revealPoi(i); });
    UI.explicitNext = true;
    ctx.select({ kind: 'mxPoi', id: i, extra: { trail: kecId } });
  }
  /** The trail ends (Tutup, Esc: nothing selected any more): the map goes back to the view it had before the list; with
      a kecamatan filter set meanwhile, the points stay (staff are working through that filtered list). */
  function endTrail() {
    UI.kecSheet = null;
    var x = S();
    if (!x || typeof x.tempMode !== 'function' || x.tempMode() == null) return;
    if (x.view().kec) x.keepMode(); else x.endTempMode();
  }
  /** "Lihat merchant di kecamatan ini": the list-first sheet in the workspace, the filtered visit list without it. */
  function kecMain(id) { if (sheetsOn()) openKecSheet(id, { listFirst: true }); else showKecMerchants(id); }
  /** "Lihat semua di daftar": the kecamatan filter and the Kandidat EDC tab of "Daftar & grafik" (Sasaran EDC first). */
  function kecAllInList(id) {
    if (!ctx || !id) return;
    S().setView({ kec: id, mode: 'merchants' });
    if (S().keepMode) S().keepMode();            // staff chose the filtered list: the points stay
    UI.ecTier = 'edc'; UI.ecShown = PAGE;
    if (!deep()) { UI.tab = 'edc'; UI.scrollTo = 'edccand'; ctx.setView('deep'); return; }
    showTab('edc');
    openListDrawer();
    scrollToPart('edccand', 160);
  }
  /** A "Lihat daftar …" action raises the bottom drawer "Daftar & grafik" from its peek to half height (item 43). */
  function openListDrawer() {
    var x = WS();
    if (!x || typeof x.drawer !== 'function' || typeof x.setDrawer !== 'function') return;
    safe(function () { if (x.drawer() === 'peek') x.setDrawer('half'); });
  }

  function poiModel(i, sel) {
    var info = S().poiInfo(i);
    if (!info) return null;
    var mode = privacy(), m = model(), hints = [], note = noteMaker(hints);
    var ec = S().edcOf ? S().edcOf(i) : null, f = ec && ec.factors ? ec.factors : (S().factors ? S().factors(i) : null);
    var kecTxt = info.kecamatanId ? S().kecName(info.kecamatanId) : '—', r = S().poiDist(i), dist = S().distText(r);
    /* item 37: the tier and the three factors first (the sheet opens this fold first); then the status and where it is,
       with the route (item 36) */
    var body = [sasaranBlock(i, info, ec, f, note)];
    body.push(blk('Status', [h('p', { class: 'mx-dd-p', text: S().WORDS[info.status] + '.' }),
      info.status === 'notYet' ? note('mx-notyet-name', S().WORDS.notYetNote) : null,
      info.status === 'potential' ? note('mx-import-status', 'Impor file LVM untuk melihat status merchant.') : null], { id: 'status', open: true, preview: STATUS_WORDS[info.status] }));
    body.push(blk('Lokasi', [kv('Kecamatan', info.kecamatanId ? S().kecName(info.kecamatanId, true) : '—'), kv('Kelurahan', S().kelName(info.kelurahanId)),
      distKv('poi', i), kv('Jarak dari Mabes TNI', fm().km(info.km)), mode === 'veil' ? null : kv('Koordinat', fm().coord(info.pos[1], info.pos[0], 5)),
      routeRow(info.pos[0], info.pos[1])], { id: 'lokasi', preview: 'Kec. ' + kecTxt + ' · ' + dist }));
    if (info.status === 'acquired' || info.status === 'inactive') {
      var st = info.store || {};
      body.push(blk('Di file Livin’ Merchant', [kv('Nama di LVM', S().storeName(st.name, mode)), kv('Cabang', info.ownBranch ? 'KCP Jakarta Cilangkap (12903)' : (st.branchName || info.branchCode || '—')),
        kv('Aktif bulan ini', info.active === true ? 'Ya' : (info.active === false ? 'Tidak' : '—')), kv('Transaksi bulan ini', isNum(st.freqMtd) ? int(st.freqMtd) : '—'),
        kv('Terdaftar sejak', st.createdDate ? fm().date(st.createdDate) : '—'), kv('Kemiripan nama', isNum(info.score) ? pct(info.score) : '—')],
        { id: 'lvm', preview: info.active === false ? 'Tidak aktif bulan ini' : 'Aktif bulan ini' }));
    }
    if (info.edc) body.push(blk('EDC Mandiri', [kv('Terpasang', 'Ya'), kv('Aktif', info.edc.active === true ? 'Ya' : (info.edc.active === false ? 'Tidak' : '—'))], { id: 'edc', preview: 'Terpasang' }));
    var zoom = h('button', { type: 'button', class: 'btn btn--secondary btn--lg' }, [icon('target'), h('span', { text: 'Perbesar ke merchant ini' })]);
    zoom.addEventListener('click', function () { flyTo(info.pos, 17.2); });
    var kecB = info.kecamatanId ? h('button', { type: 'button', class: 'btn btn--ghost btn--lg' }, [h('span', { text: 'Lihat merchant di Kec. ' + S().kecName(info.kecamatanId) })]) : null;
    if (kecB) kecB.addEventListener('click', function () { if (sheetsOn()) { kecMain(info.kecamatanId); return; } ctx.closeDrawer(); showKecMerchants(info.kecamatanId); });
    body.push(h('div', { class: 'mx-dd-actions' }, [zoom, kecB]));
    var tid = ec ? ec.tier : null, T0 = tid ? S().TIERS[tid] : null, trail = trailOf(sel, info.kecamatanId);
    var rUrl = mode === 'veil' || !S().directionsUrl ? null : S().directionsUrl(info.pos[0], info.pos[1]);
    return withGmaps({
      eyebrow: (S().CAT[info.category].short + ' · ' + (S().GROUP_LABEL[info.group] || '')).toUpperCase(),
      title: S().maskName(info.name, mode),
      sub: [statusChip(info.status), info.status === 'acquired' || info.status === 'inactive' ? lvmBadge() : null].filter(Boolean),
      body: body,
      prov: 'Sumber: ' + srcPoi() + (m && m.hasLvm ? ' · ' + srcLvm(m) : ''),
      /* v5 (item 43): the callout's key numbers ("5,8 km" over "± 19 menit dari KCP", Kecamatan), its chips (status, tier)
         and the three-factor line */
      kind: 'poi', key: 'mxPoi:' + i, anchor: info.pos.slice(0, 2), demo: !!(m && m.demo && m.hasLvm),
      brief: {
        numbers: [distNum(r, dist), { label: 'Kecamatan', value: kecTxt }],
        chips: [{ text: STATUS_WORDS[info.status], tone: STATUS_TONE[info.status] },
          T0 ? { text: tid === 'nasional' ? T0.short : T0.label, tone: tierTone(tid), title: T0.title } : null].filter(Boolean),
        primary: phoneRoute(rUrl, 'Rute di Google Maps', ROUTE_TIP),
        note: f ? { text: factorsLine(f) } : null
      },
      crumb: trail ? crumbTo(trail) : null,
      hints: hints
    }, S().gmapsFor('mxPoi', i));
  }
  function lvmModel(id, sel) {
    var st = S().lvmStore(id);
    if (!st || !st.rec) return null;
    var r = st.rec, mode = privacy(), m = model(), x = st.match, loc = st.loc;
    var listed = x.poi >= 0, status = x.active === false ? 'inactive' : (listed ? 'acquired' : 'lvmOnly');
    /* item 28: "titik jalan" (from the address, offline), "pusat kelurahan" or "pusat kecamatan" */
    var where = !loc ? '—' : S().placeWords({ precision: loc.precision, kelurahanId: x.kelurahanId, kecamatanId: x.kecamatanId });
    /* an area point (pusat kelurahan or kecamatan) is no address: its route link says so (v4 fixer) */
    var areaPt = !!(loc && !(loc.precision === 'listing' || loc.precision === 'exact' || loc.precision === 'jalan' || loc.precision === 'kampung'));
    var kecTxt = x.kecamatanId ? S().kecName(x.kecamatanId) : (r.kecamatan || '—'), dist = S().distText(S().lvmDist(id));
    var active = r.status === 'active' ? 'Ya' : (r.status === 'inactive' ? 'Tidak' : '—');
    var body = [
      blk('Lokasi', [kv('Kecamatan', x.kecamatanId ? S().kecName(x.kecamatanId, true) : (r.kecamatan || '—')), kv('Kelurahan', x.kelurahanId ? S().kelName(x.kelurahanId) : (r.kelurahan || '—')),
        kv('Posisi', where), distKv('lvm', id), loc ? routeRow(loc.lon, loc.lat, { approx: areaPt }) : null], { id: 'lokasi', open: true, preview: 'Kec. ' + kecTxt + ' · ' + dist }),
      blk('Di file Livin’ Merchant', [kv('Cabang', String(r.branchCode) === HOME ? 'KCP Jakarta Cilangkap (12903)' : (r.branchName || r.branchCode || '—')),
        kv('Aktif bulan ini', active), kv('Transaksi bulan ini', isNum(r.freqMtd) ? int(r.freqMtd) : '—'),
        kv('Terdaftar sejak', r.createdDate ? fm().date(r.createdDate) : '—'), kv('Jenis usaha (LVM)', r.lob || (S().CAT[r.category] ? S().CAT[r.category].label : '—'))],
        { id: 'lvm', open: true, preview: 'Aktif bulan ini: ' + active })
    ];
    if (!listed) body.push(blk('Mengapa tidak ada di peta publik', [h('p', { class: 'mx-dd-p', text: x.reason === 'ambiguous' ? 'Ada dua merchant publik yang sama-sama mirip, sehingga tidak ada yang dipilih.'
      : 'Tidak ada merchant publik dengan nama yang cukup mirip di kecamatannya.\nSebagian besar toko LVM adalah usaha mikro yang tidak tercantum di peta publik.' })], { id: 'alasan', open: false }));
    var rUrl = mode === 'veil' || !loc || !S().directionsUrl ? null : S().directionsUrl(loc.lon, loc.lat);
    var gT = mode === 'veil' ? null : S().gmapsFor('mxLvm', id), trail = trailOf(sel, x.kecamatanId);
    return withGmaps({
      eyebrow: (listed ? 'TOKO LVM' : S().WORDS.lvmOnly).toUpperCase(),
      title: S().storeName(r.name, mode),
      sub: [statusChip(status), lvmBadge()],
      body: body,
      prov: 'Sumber: ' + srcLvm(m) + '. Nama toko disamarkan, kecuali Tampilkan nama aktif.',
      /* v5 (item 43): Aktif bulan ini, Dari KCP, Kecamatan; an area point says so (coordinates only, as before) */
      kind: 'lvm', key: 'mxLvm:' + id, anchor: loc ? [loc.lon, loc.lat] : null, demo: !!(m && m.demo),
      brief: {
        numbers: [{ label: 'Aktif bulan ini', value: active }, distNum(S().lvmDist(id), dist), { label: 'Kecamatan', value: kecTxt }],
        chips: [{ text: STATUS_WORDS[status], tone: STATUS_TONE[status] }, areaPt ? { text: 'Titik perkiraan', tone: 'none', title: ROUTE_AREA_TIP } : null].filter(Boolean),
        primary: phoneRoute(rUrl, areaPt ? ROUTE_AREA : 'Rute di Google Maps', areaPt ? ROUTE_AREA_TIP : ROUTE_TIP),
        note: null
      },
      crumb: trail ? crumbTo(trail) : null,
      hints: []
    }, gT);                                       // no link target at all while names are veiled (spec §3.12)
  }

  /* ------------------------------------------------------------- the kecamatan sheet (item 43: list first) */

  var KEC_ROWS = 30;
  /** The merchants of one kecamatan for its sheet: Sasaran EDC (and Naik ke EDC) first, then Sasaran LVM, nearest to KCP
      first inside each group. Jaringan nasional (item 42) stays out of this list: no branch target. */
  function kecCands(id) {
    var all = S().edcCandidates({ kecamatanId: id, limit: 0, tiers: ['edc', 'naik-edc', 'lvm'] }), edc = [], rest = [];
    all.forEach(function (c) { (c.tier === 'lvm' ? rest : edc).push(c); });
    var near = function (c) { return S().poiDist(c.idx); };
    var rows = S().nearestFirst(edc, near);
    if (rows.length < KEC_ROWS) rows = rows.concat(S().nearestFirst(rest, near).slice(0, KEC_ROWS - rows.length));
    return { rows: rows.slice(0, KEC_ROWS), total: all.length, edc: edc.length };
  }
  function kecRow(c, k, kecId) {
    /* the business in plain words ("rumah sakit", "toko furnitur"; item 37), else the broad type */
    var what = S().catWords ? safe(function () { return S().catWords(c.idx); }) : null;
    var meta = cap(what || catShort(c.category)) + ' · ' + S().distText(S().poiDist(c.idx));
    var b = h('button', { type: 'button', class: 'mx-kl__row', title: c.why || null, 'aria-label': 'Lihat ' + c.name + '. ' + c.tierLabel + '. ' + meta + '.' }, [
      h('span', { class: 'mx-kl__n', 'aria-hidden': 'true', text: String(k + 1) }),
      h('span', { class: 'mx-kl__main' }, [h('span', { class: 'mx-kl__name', text: c.name }), h('span', { class: 'mx-kl__meta', text: meta })]),
      tierChip(c.tier)
    ]);
    b.addEventListener('click', function () { openTrailPoi(c.idx, kecId); });
    return h('li', { class: 'mx-kl__i' }, [b]);
  }
  var BAND_WORDS = { acquired: 'Coverage tertinggi', partly: 'Coverage tengah', notYet: 'Coverage terendah', noData: 'Tidak dinilai' };
  /** [[w, s], [e, n]] of a kecamatan (MCD.territory.boundsOf, else the same from data/admin-areas.js), or null. */
  function kecBounds(id) {
    var t = TT();
    if (t && t.boundsOf) return safe(function () { return t.boundsOf(id); });
    var A = W.MCD_ADMIN_AREAS, rec = A && A.byId ? A.byId(id) : null;
    if (!rec || !rec.geometry || typeof A.coordinates !== 'function') return null;
    return safe(function () {
      var c = A.coordinates(rec), polys = rec.geometry.type === 'Polygon' ? [c] : c, b = [Infinity, Infinity, -Infinity, -Infinity];
      polys.forEach(function (pl) { pl[0].forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); });
      return isFinite(b[0]) ? [[b[0], b[1]], [b[2], b[3]]] : null;
    });
  }
  /** "607 merchant dalam 15 km: 73 Sasaran EDC, 462 Sasaran LVM dan 72 jaringan nasional (lewat kantor pusat)." */
  function potTitle(pot, cnt, T0) {
    var parts = [int(cnt.edcAll) + ' Sasaran EDC', int(cnt.lvm) + ' Sasaran LVM'];
    if (T0 && cnt.nasional) parts.push(int(cnt.nasional) + ' ' + lcFirst(T0.label));
    return int(pot) + ' merchant dalam 15 km: ' + listWords(parts) + '.';
  }
  function kecModel(id, opts) {
    opts = opts || {};
    var m = model(), A = W.MCD_ADMIN_AREAS, rec = A && A.byId ? A.byId(id) : null;
    if (!m || !S() || !rec || !/^\d\d\.\d\d\.\d\d$/.test(String(id))) return null;
    /* the territory list when it is loaded, else the kecamatan record of data/admin-areas.js and the LVM aggregate */
    var kota0 = rec.kota && A.byId(rec.kota) ? A.byId(rec.kota).name : '';
    var k = m.kecById[id] || { id: id, kota: kota0, in15: rec.in15, potential: null, area: m.agg && m.agg.areas ? m.agg.areas[id] || null : null };
    var a = k.area || null, name = S().kecName(id), cnt = S().edcTierCounts({ kecamatanId: id }), T0 = S().TIERS.nasional, listFirst = opts.listFirst !== false;
    var pot = a ? a.potential : (isNum(k.potential) ? k.potential : cnt.edc + cnt.lvm + cnt.nasional + cnt['naik-edc']), cov = a && m.hasLvm ? a.coverageKnown : null, band = a && m.hasLvm ? a.band : null;
    var L = kecCands(id), kids = [];
    if (L.rows.length) kids.push(h('ol', { class: 'mx-kl', 'aria-label': 'Merchant di ' + name }, L.rows.map(function (c, n) { return kecRow(c, n, id); })));
    else kids.push(h('p', { class: 'mx-dd-p c-2', text: 'Belum ada merchant sasaran di kecamatan ini.' }));
    var allB = h('button', { type: 'button', class: 'btn btn--secondary mx-btn40 mx-kl__all' }, [h('span', { text: 'Lihat semua di daftar' }), icon('chev-r')]);
    allB.addEventListener('click', function () { kecAllInList(id); });
    /* v5 fixer: the national chains (item 42) are named, so the head numbers add up (Merchant = sasaran + jaringan nasional) */
    var natTxt = T0 && cnt.nasional ? 'tidak termasuk ' + int(cnt.nasional) + ' jaringan nasional' : '';
    kids.push(h('div', { class: 'mx-kl__foot' }, [h('span', { class: 'mx-kl__count', title: natTxt && T0 ? T0.title : null, text: int(L.rows.length) + ' dari ' + int(L.total) + ' merchant sasaran' + (natTxt ? ', ' + natTxt : '') }), allB]));
    var listBlk = blk('Merchant di ' + name + ': Sasaran EDC dulu, lalu terdekat', kids, { id: 'daftar', open: true, preview: int(L.total) + ' merchant sasaran · ' + int(cnt.edcAll) + ' Sasaran EDC' + (natTxt ? ' · ' + int(cnt.nasional) + ' jaringan nasional' : '') });
    var rows = [kv('Merchant dalam 15 km', int(pot))];
    if (m.hasLvm && a) rows.push(kv('Sudah diakuisisi', int(a.acquired + a.offMap.all)), kv('Belum ada di LVM', int(a.notYet)), kv('Coverage', isNum(cov) ? pct(cov) : '—', BAND_WORDS[band] || null));
    rows.push(kv('Sasaran EDC', int(cnt.edc)));
    if (m.hasLvm) rows.push(kv('Naik ke EDC', int(cnt['naik-edc'])));
    rows.push(kv('Sasaran LVM', int(cnt.lvm)));
    if (T0) rows.push(kv(T0.label, int(cnt.nasional), T0.title));
    if (rec && isNum(rec.distKm)) rows.push(kv('Jarak dari Mabes TNI', fm().km(rec.distKm)));
    if (k.kota) rows.push(kv('Kota', k.kota));
    var numsBlk = blk('Angka kecamatan', rows, { id: 'angka', open: !listFirst, preview: int(pot) + ' merchant · ' + int(cnt.edcAll) + ' Sasaran EDC' });
    var tb = kecBounds(id);
    var numbers = m.hasLvm && a ? [{ label: 'Coverage', value: isNum(cov) ? pct(cov) : '—', big: true, tone: bandTone(band), title: BAND_WORDS[band] || null },
      { label: 'Merchant', value: int(pot) }, { label: 'Belum ada di LVM', value: int(a.notYet), tone: 'bad' }]
      : [{ label: 'Merchant', value: int(pot), big: true, title: potTitle(pot, cnt, T0) }, { label: 'Sasaran EDC', value: int(cnt.edcAll) }, { label: 'Sasaran LVM', value: int(cnt.lvm) }];
    var chips = [];
    if (band && BAND_WORDS[band]) chips.push({ text: BAND_WORDS[band], tone: bandTone(band) });
    if (isNum(k.in15) && k.in15 < 0.5) chips.push({ text: 'Sebagian di luar 15 km', tone: 'none' });
    return withGmaps({
      eyebrow: ('Kecamatan' + (k.kota ? ' · ' + S().kotaShort(k.kota) : '')).toUpperCase(),
      title: name,
      sub: [],
      body: listFirst ? [listBlk, numsBlk] : [numsBlk, listBlk],
      prov: 'Sumber: ' + srcPoi() + (m.hasLvm ? ' · ' + srcLvm(m) : '') + '. Sasaran adalah perkiraan dari data publik.',
      kind: 'kec', key: 'kec:' + id, listFirst: listFirst, demo: !!(m.demo && m.hasLvm),
      anchor: tb ? { bbox: tb, label: rec && rec.label ? rec.label.slice(0, 2) : [(tb[0][0] + tb[1][0]) / 2, (tb[0][1] + tb[1][1]) / 2] } : null,
      brief: { numbers: numbers, chips: chips.slice(0, 2), note: null,
        primary: listFirst ? null : { label: 'Lihat merchant di kecamatan ini', run: function () { openKecSheet(id, { listFirst: true }); } } },
      crumb: null,
      hints: []
    }, S().kecQuery(id));
  }

  /* ------------------------------------------------------------- v5 workspace adoption: rail, drawer, summary */

  /* The shell's workspace (MCD.windows.adopt, Detail from 1024 px) asks workspace() for this section's own DOM: the
     header, the product strip, the three numbers and the filters move into a rail element of this section (the summary
     rail, slim at 1280-1440 px); the sheet keeps its tab bar and panels and becomes the bottom drawer "Daftar & grafik".
     unworkspace() puts every node back (the shell's unadopt, a width below 1024 px, Sederhana); a remount rebuilds all. */
  function workspace() {
    if (!deep() || !page || !page.el || !R.root || !host || !R.tabsBar) return null;
    var sheet = page.el, foot = sheet.querySelector ? sheet.querySelector('.pg-foot') : null;
    /* a shell that put the nodes back itself (or removed the rail) asks again: start from the Detail layout */
    if (R.ws && (!R.ws.rail.parentNode || !(R.prods && R.ws.rail.contains(R.prods)))) unworkspace();
    if (!R.ws) {
      var head = sheet.querySelector ? sheet.querySelector('.sheet__head') : null;
      var scroll = h('div', { class: 'rail__scroll mx-wsrail__scroll' }), body = h('div', { class: 'mx mx--deep mx-wsrail__body' });
      var rail = h('aside', { class: 'rail rail--l panel mx-wsrail', 'aria-label': 'Panel ringkasan Merchant', 'data-map-occluder': '' }, [scroll]);
      var moved = [];
      var mv = function (node, into) { if (!node || !node.parentNode) return; moved.push({ node: node, parent: node.parentNode, next: node.nextSibling }); into.appendChild(node); };
      mv(head, scroll);
      scroll.appendChild(body);
      [R.prods, R.strip, R.fbar, R.filters].forEach(function (n) { mv(n, body); });
      host.appendChild(rail);
      R.ws = { rail: rail, moved: moved };
    }
    return {
      rail: { el: R.ws.rail, label: 'Merchant', short: 'Merchant', icon: 'sec-merchants', title: 'Panel ringkasan Merchant', summary: summary },
      drawer: { el: sheet, tabs: R.tabsBar, title: 'Daftar & grafik', source: sourceLine() },
      hide: foot ? [foot] : [],
      created: [R.ws.rail], moved: R.ws.moved.slice(), restore: unworkspace
    };
  }
  function unworkspace() {
    var ws = R.ws;
    if (!ws) return false;
    R.ws = null;
    /* the header back above the sheet body; the rest back into the Detail root in its own order, before the panels
       (the shell may already have put the tab bar back, or not) */
    ws.moved.forEach(function (x) {
      if (x.node !== R.prods && x.node !== R.strip && x.node !== R.fbar && x.node !== R.filters) {
        try { if (x.parent && x.node.parentNode !== x.parent) x.parent.insertBefore(x.node, x.next && x.next.parentNode === x.parent ? x.next : null); } catch (e) { /* host gone */ }
      }
    });
    if (R.root && R.panelWrap && R.panelWrap.parentNode === R.root) {
      [R.prods, R.strip, R.tabsBar, R.fbar, R.filters].forEach(function (n) { if (n) safe(function () { R.root.insertBefore(n, R.panelWrap); }); });
    }
    if (ws.rail && ws.rail.parentNode) ws.rail.parentNode.removeChild(ws.rail);
    return true;
  }
  /** The split stays only while the workspace can hold it (Detail, MCD.windows active, 1024 px or wider). */
  function wsCheck() {
    if (!R.ws) return;
    if (!deep() || !wsOn() || (W.innerWidth || 0) < 1024) unworkspace();
  }
  /** summary() → {items: [{value, label, tone?, title}] (3), filters, scope}: the slim rail's key numbers (item 43). */
  function summary() {
    var r = summaryItems(), I = MCD.inst;
    if (I && typeof I.scopeSummary === 'function') r.scope = safe(function () { return I.scopeSummary('merchants'); });
    return r;
  }
  function summaryItems() {
    var m = model(), n = S() ? S().filterCount() : 0;
    if (!m || !m.totals) return { items: [], filters: n };
    var t = m.totals, T0 = S().TIERS.nasional;
    if (!m.hasLvm) {
      var c = S().edcTierCounts();
      return { items: [
        { value: t.potential, label: 'Merchant 15 km', tone: 'potential', title: int(t.potential) + ' merchant dalam 15 km dari Mabes TNI. File LVM belum diimpor.' },
        { value: c.edcAll, label: 'Sasaran EDC', title: int(c.edcAll) + ' merchant Sasaran EDC, perkiraan.' + (T0 && c.nasional ? ' Tidak termasuk ' + int(c.nasional) + ' ' + lcFirst(T0.label) + '.' : '') },
        { value: c.lvm, label: 'Sasaran LVM', title: int(c.lvm) + ' merchant Sasaran LVM, perkiraan.' + (T0 && c.nasional > (c.nasionalEdc || 0) ? ' Tidak termasuk ' + int(c.nasional) + ' ' + lcFirst(T0.label) + '.' : '') }], filters: n };
    }
    return { items: [
      { value: known(t), label: 'Merchant 15 km', title: int(known(t)) + ' merchant dalam 15 km dari Mabes TNI.' },
      { value: lvmAll(t), label: 'Sudah diakuisisi', tone: 'ok', title: int(lvmAll(t)) + ' merchant telah diakuisisi · coverage ' + pct(t.coverageKnown) + '.' },
      { value: t.notYet, label: 'Belum ada di LVM', tone: 'bad', title: int(t.notYet) + ' merchant belum ada di LVM.' }], filters: n };
  }
  /** cardFor(sel) → the drawer model of a selection, built fresh (live pins and refreshes, item 43), or null. */
  function cardFor(sel) {
    if (!sel || !S() || !ctx) return null;
    var keep = DDIST;
    try {
      if (sel.kind === 'mxPoi') return safe(function () { return poiModel(+sel.id, sel); });
      if (sel.kind === 'mxLvm') return safe(function () { return lvmModel(sel.id, sel); });
      if (sel.kind === 'mxKec') { var id = kecOfSel(sel); return id ? safe(function () { return kecModel(id, UI.kecSheet && UI.kecSheet.id === id ? UI.kecSheet : { listFirst: true }); }) : null; }
      return null;
    } finally { DDIST = keep; }                  // a pin never takes over the live distance row of the open drawer
  }

  /* ============================================================ lifecycle */

  function shows() {
    return ['Semua toko kelontong, restoran dan UMKM dalam 15 km, per kecamatan di peta',
      'Status Sudah diakuisisi atau Belum ada di LVM untuk setiap merchant.\nCoverage per kecamatan, setelah laporan bulanan Rev LVM diimpor.',
      'Prioritas kunjungan: kecamatan dan daftar merchant yang belum ada di LVM, dapat diekspor ke CSV',
      'Toko LVM yang perlu diaktifkan kembali, serta UREG dan USAK cabang terhadap target',
      'Merchant EDC Mandiri yang terpasang dan aktif per kecamatan, setelah sheet 2_edc diimpor'];
  }
  /** Provenance in the page footer: one short line in Sederhana (the panel must fit one screen), the full line in Detail. */
  function sourceLine() {
    var m = model();
    if (!m) return 'Sumber: ' + srcPoi() + '.';
    if (!deep()) return 'Sumber: Overture Maps, Sep 2026 · ' + (m.demo ? 'data contoh (ilustrasi)' : (m.hasLvm ? 'laporan LVM' + (m.asOf ? ' ' + dateText(m.asOf) : '') : 'file LVM belum diimpor'));
    return 'Sumber: ' + srcPoi() + (m.hasLvm ? ' · ' + srcLvm(m) : ' · file LVM belum diimpor') + ' · hanya di komputer ini';
  }
  function overviewPrimary(m) {
    return m && m.hasLvm ? { label: 'Lihat prioritas kunjungan', icon: 'target', run: function () { if (ctx) ctx.navigate(ID, { view: 'deep', action: 'merchants:leads' }); } }
      : { label: 'Impor file LVM', icon: 'upload', run: goImport };
  }
  function spec() {
    var dv = deep();
    return {
      primary: dv ? undefined : overviewPrimary(model()),
      dataKeys: [],
      needs: ['1_lvm', '2_edc'],
      emptyFirst: false,
      shows: shows(),
      lede: dv ? 'Lokasi merchant, status Livin’ Merchant dan kecamatan yang perlu dikunjungi lebih dulu.\nJarak merchant diukur dari KCP. Jarak kecamatan diukur dari Mabes TNI.'
        : 'Status LVM setiap merchant dalam 15 km dari Mabes TNI.',
      source: sourceLine(),
      cards: function () { return []; },
      render: function (bodyEl) { if (dv) renderDeep(bodyEl); else renderOverview(bodyEl); },
      refresh: function (d, keys) { refresh(keys); }
    };
  }

  function refresh(keys) {
    keys = keys || ['*'];
    if (!S() || !model()) return;
    var force = keys.indexOf('*') >= 0 || keys.indexOf('theme') >= 0;
    if (keys.indexOf('privacy.veil') >= 0 || keys.indexOf('privacy.reveal') >= 0) { SIG.leads = ''; SIG.react = ''; }
    if (!deep()) { paintOverview(force); paintChips(); return; }
    safe(paintStrip);
    safe(paintFilterBar);
    paintTab(UI.tab);
  }
  function onViewChange(v, changed) {
    if (!host) return;
    if (!deep()) { if (changed.indexOf('kec') >= 0) { SIG.ov = ''; if (ctx) ctx.requestRender(['ext']); } return; }
    SIG.filters = '';
    safe(paintFilterBar);
    if (changed.indexOf('kec') >= 0) { SIG.heat = ''; SIG.prio = ''; }
    if (changed.indexOf('cats') >= 0) SIG.cat = '';
    if (changed.indexOf('tier') >= 0) { SIG.ec = ''; if (v.tier === 'all' && UI.ecTier !== 'edc' && UI.ecTier !== 'lvm' && UI.ecTier !== 'naik-edc') UI.ecTier = 'edc'; }
    paintTab(UI.tab);
    if (ctx) ctx.requestRender(['ext']);
  }

  function mapControls(c) {
    if (deep()) {
      c.mapControls({ extra: [{ label: 'Tampilkan', items: S().MODES.map(function (md) {
        return { label: md.label, title: md.title, run: function () { S().setView({ mode: md.id }); }, pressed: function () { return S().view().mode === md.id; } };
      }) }], presets: ['sme15'] });
    } else {
      c.mapControls({ presets: ['sme15'] });
    }
  }
  function goTab(c, id, part) {
    if (!deep()) { UI.tab = id; UI.scrollTo = part || null; c.setView('deep'); return; }
    showTab(id);
    if (part) scrollToPart(part);
  }
  function commands(c) {
    c.registerCommands(function () {
      var cmds = [
        { label: 'Merchant: prioritas kunjungan', run: function () { goTab(c, 'prio'); }, kw: 'prioritas kunjungan kecamatan leads target' },
        { label: 'Merchant: kandidat EDC', run: function () { goTab(c, 'edc'); }, kw: 'kandidat edc potensi naik ke edc rating google mesin kartu' },
        { label: 'Merchant: peta per kecamatan', run: function () { S().setView({ mode: 'territory' }); }, kw: 'kecamatan coverage peta' },
        { label: 'Merchant: titik merchant di peta', run: function () { if (!deep()) c.setView('deep'); S().setView({ mode: 'merchants' }); }, kw: 'titik status diakuisisi' },
        { label: 'Merchant: hapus filter', run: function () { S().resetFilters(); }, kw: 'atur ulang filter' },
        { label: 'Merchant: ekspor daftar merchant yang belum ada di LVM', run: function () { if (!deep()) goTab(c, 'prio', 'leads'); else exportLeads(); }, kw: 'ekspor export csv leads daftar' },
        { label: 'Merchant: toko yang perlu diaktifkan kembali', run: function () { goTab(c, 'status', 'react'); }, kw: 'reaktivasi tidak aktif aktifkan kembali' },
        { label: 'Merchant: UREG dan USAK per cabang', run: function () { goTab(c, 'status', 'kpi'); }, kw: 'ureg usak target cabang' },
        /* merge 23 Oct 2026: the teammates' Saldo merchant tab (d812dfe) */
        { label: 'Merchant: saldo merchant nasabah', run: function () { goTab(c, 'saldo'); }, kw: 'saldo merchant nasabah turun naik mtd mom ytd' }
      ];
      /* kecamatan entries only while the shell's search does not index the kecamatan itself (plan A-17) */
      if (!(MCD.app && typeof MCD.app.registerSearch === 'function')) {
        var m = model();
        (m ? m.kec : []).filter(function (k) { return k.potential > 0; }).forEach(function (k) {
          cmds.push({ label: 'Kecamatan ' + k.label, kw: 'kecamatan merchant ' + k.kota, run: function () { showKecMerchants(k.id); } });
        });
      }
      return cmds;
    });
  }
  /** Kecamatan click → the shell's calm popup (numbers + "Buka di Google Maps"); this section adds the action and
      the highlight. A click highlights; it never sets a filter by itself (plan §2.7, IA H7). */
  function bindTerritory() {
    var T = TT();
    if (!T || !T.bind) return;
    var off = T.bind({
      stats: function () { var m = model(); return m ? m.terr : null; },
      actions: function (kecId) { return kecActions(kecId); },
      onPick: function (hit) { var id = hit && (hit.kecamatanId || (hit.kecamatan && hit.kecamatan.id)); if (id && S()) S().setHighlight(id); },
      onClose: function () { if (S()) S().setHighlight(null); }
    });
    cleanups.push(off);
  }
  /** The kecamatan callout's actions (items 39 and 43): "Lihat merchant di kecamatan ini" (the list-first sheet in the
      workspace, else the filtered visit list) and, in the workspace only, {id: 'detail'}, which territory.js runs from
      its "Detail" button (the sheet with the numbers first). The older popup shows the first action only. */
  function kecActions(kecId) {
    var list = [{ id: 'main', label: 'Lihat merchant di kecamatan ini', primary: true, run: function () { kecMain(kecId); } }];
    if (wsOn()) list.push({ id: 'detail', label: 'Detail', run: function () { openKecSheet(kecId, { listFirst: false }); } });
    return list;
  }
  function kecOfSel(sel) {
    var id = sel && sel.id;
    if (id && typeof id === 'object') id = id.kecamatanId || id.id;
    return typeof id === 'string' && /^\d\d\.\d\d\.\d\d$/.test(id) ? id : null;
  }
  function applyPendingScroll() {
    var part = UI.scrollTo;
    UI.scrollTo = null;
    if (part) scrollToPart(part, 160);
  }
  /** 'focus:poi:<row>' / 'focus:lvm:<id>' (MCD.app.focus, item 31): the dot view in Detail, the map at the point
      (zoom 16) and its drawer. From Sederhana the view switches first; the focus runs after the remount. */
  function focusTarget(f) {
    if (!f) return null;
    if (f.kind === 'poi') { var info = S().poiInfo(+f.id); return info ? { pos: info.pos, sel: { kind: 'mxPoi', id: +f.id } } : null; }
    var loc = MCD.lvm && MCD.lvm.locationOf ? safe(function () { return MCD.lvm.locationOf(f.id); }) : null;
    return loc ? { pos: [loc.lon, loc.lat], sel: { kind: 'mxLvm', id: f.id } } : null;
  }
  function runFocus(f) {
    if (!ctx || !f) return false;
    if (!deep()) { UI.focus = f; ctx.setView('deep'); return true; }
    safe(function () { if (f.kind === 'poi') S().revealPoi(+f.id); else S().revealLvm(f.id); });
    var t = focusTarget(f);
    if (!t) { ctx.toast('Titik merchant ini tidak ditemukan di peta.', 'warn'); return true; }
    var M = MCD.map;
    if (privacy() !== 'veil') {
      if (M && typeof M.focusPoint === 'function') safe(function () { M.focusPoint({ lon: t.pos[0], lat: t.pos[1], zoom: 16, kind: t.sel.kind, id: t.sel.id }); });
      else flyTo(t.pos, 16);
    }
    ctx.select(t.sel);
    return true;
  }
  function applyPendingFocus() {
    var f = UI.focus;
    UI.focus = null;
    if (f) setTimeout(function () { if (ctx && deep()) runFocus(f); }, 240);
  }

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (root, c) {
      host = root; ctx = c; view = c.view(); R = {}; CH = {}; SIG = {}; cleanups = [];
      UI.filterOpen = false;                    // the filter row starts collapsed on every visit (plan §2.3)
      var missing = [];
      if (!MCD.sme || !MCD.sme.ready()) missing.push('data merchant publik (data/sme-pois.js)');
      if (!MCD.lvm) missing.push('mesin Livin’ Merchant (assets/js/lvm.js)');
      if (!MCD.territory) missing.push('peta kecamatan (assets/js/territory.js)');
      if (!C()) missing.push('komponen grafik (assets/js/charts-plus.js)');
      if (missing.length) {
        root.appendChild(h('section', { class: (deep() ? 'sheet panel panel--sheet' : 'guide panel') + ' mx-missing' }, [h('div', { class: 'pg-head mx-missing__in' }, [
          h('h1', { class: 'pg-title', text: 'Merchant (LVM & EDC)' }),
          h('p', { class: 't-empty', text: 'Bagian ini belum dapat dibuka karena ' + listWords(missing) + ' tidak termuat.\nMuat ulang halaman. Jika masih gagal, hubungi pengelola dashboard.' })])]));
        return;
      }
      if (!MCD.territory.ready() && MCD.territory.ensureData) {
        MCD.territory.ensureData().then(function () { if (ctx === c) { SIG = {}; S().requestMap(); c.requestRender(['ext']); } });
      }
      S().registerSearch();
      spec0 = spec();
      page = c.page(spec0);
      mapControls(c);
      commands(c);
      bindTerritory();
      cleanups.push(S().onView(onViewChange));
      var dm = MCD.demo && MCD.demo.on ? MCD.demo.on(function () { SIG = {}; if (ctx) ctx.requestRender(['demo']); }) : null;
      if (dm) cleanups.push(dm);
      S().requestMap();
      headerIcon();
      /* the shared travel toggles (MCD.distance) fire 'mcd:distance' */
      if (W.addEventListener) { W.addEventListener('mcd:distance', onDistance); cleanups.push(function () { W.removeEventListener('mcd:distance', onDistance); }); }
      refresh(['*']);
      if (deep()) { applyPendingScroll(); applyPendingFocus(); }
    },
    update: function (d, keys) {
      if (!page) return;
      if (spec0) spec0.source = sourceLine();
      /* the trail ends when nothing is selected any more (Tutup, Esc); the rail split follows the workspace */
      if (keys && (keys.indexOf('selection') >= 0 || keys.indexOf('*') >= 0) && ctx && ctx.state && ctx.state.get && !ctx.state.get().selection) endTrail();
      wsCheck();
      page.update(d, keys);
      /* Saldo merchant follows an import, a vault load and "Samarkan nama" */
      if (UI.tab === 'saldo' && R.saldo) safe(paintSaldo);
    },
    unmount: function () {
      gvClose(true);                            // Google results never outlive the list view
      Object.keys(CH).forEach(function (k) { safe(function () { CH[k].destroy(); }); });
      (R.bn || []).forEach(function (x) { safe(function () { if (x.chart) x.chart.destroy(); }); });
      (R.edcCards || []).concat(R.storeCards || []).forEach(function (x) { safe(function () { x.destroy(); }); });
      cleanups.forEach(function (fn) { safe(fn); });
      safe(unworkspace);
      UI.kecSheet = null; UI.explicitNext = false;
      /* v5 fixer: a section or view switch ends the kecamatan task too; the stored map mode comes back */
      if (MCD.sme && typeof MCD.sme.endTempMode === 'function') safe(function () { MCD.sme.endTempMode(); });
      if (MCD.territory && MCD.territory.closePopup) safe(function () { MCD.territory.closePopup(); });
      if (MCD.sme) safe(function () { MCD.sme.setHighlight(null); });
      if (ctx && typeof ctx.filterChips === 'function') safe(function () { ctx.filterChips([]); });
      cleanups = []; CH = {}; R = {}; SIG = {};
      host = null; ctx = null; page = null; spec0 = null;
    },
    layout: function () { return { posture: ID, padding: page ? page.padding() : undefined }; },
    /** 'merchants:leads' (Sederhana primary, Ringkasan, Bantuan): tab 1, at the merchant list when a kecamatan is
        filtered, else at the top of the tab. 'merchants:poi:<row>' (search): the merchant's drawer. */
    onAction: function (action) {
      var a = String(action || ''), mm;
      if (a === 'merchants:leads') {
        /* with a kecamatan filter ("Lihat merchant di Kec. …" on Ringkasan or in this section): its merchants as points,
           and the kecamatan in focus even when it already was the filter (v4 fixer) */
        var lk = S().view().kec;
        if (lk && S().view().mode !== 'merchants') S().setView({ mode: 'merchants' });
        if (lk) focusKec(lk);
        if (!deep()) { UI.tab = 'prio'; UI.scrollTo = lk ? 'leads' : 'prio'; if (ctx) ctx.setView('deep'); return true; }
        showTab('prio');
        openListDrawer();
        scrollToPart(lk ? 'leads' : 'prio', 160);
        return true;
      }
      if ((mm = /^merchants:tab:(prio|edc|kec|cat|status|saldo|info)$/.exec(a))) { if (ctx) goTab(ctx, mm[1]); return true; }
      if ((mm = /^merchants:kec:(\d\d\.\d\d\.\d\d)$/.exec(a))) { showKecOnMap(mm[1]); return true; }
      if ((mm = /^merchants:poi:(\d+)$/.exec(a))) { openPoi(+mm[1]); return true; }
      /* Ringkasan "Sasaran LVM" / "Sasaran EDC" (item 35): the Kandidat EDC tab and the map filtered to that tier,
         optionally in one kecamatan: 'merchants:sasaran:edc' | 'merchants:sasaran:lvm:31.75.09' | 'merchants:sasaran:naik-edc' */
      if ((mm = /^merchants:sasaran:(edc|lvm|naik-edc)(?::(\d\d\.\d\d\.\d\d))?$/.exec(a))) {
        UI.ecTier = mm[1]; UI.ecShown = PAGE;
        S().setView({ tier: mm[1], kec: mm[2] || null, mode: 'merchants' });
        if (mm[2]) { fitKec(mm[2]); focusKec(mm[2]); }
        if (ctx) goTab(ctx, 'edc', 'edccand');
        if (deep()) openListDrawer();
        return true;
      }
      /* item 42: Ringkasan "Tidak termasuk n jaringan nasional (…)": the map filtered to the national chains and their
         folded group under Kandidat EDC, opened ('merchants:sasaran:nasional' | 'merchants:sasaran:nasional:31.75.09') */
      if ((mm = /^merchants:sasaran:nasional(?::(\d\d\.\d\d\.\d\d))?$/.exec(a))) {
        UI.natOpen = true; UI.natShown = PAGE;
        S().setView({ tier: 'nasional', kec: mm[1] || null, mode: 'merchants' });
        if (mm[1]) { fitKec(mm[1]); focusKec(mm[1]); }
        if (ctx) goTab(ctx, 'edc', 'nat');
        if (deep()) openListDrawer();
        return true;
      }
      /* MCD.app.focus({section: 'merchants', kind: 'poi' | 'lvm', id}) (item 31) */
      if ((mm = /^focus:poi:(\d+)$/.exec(a))) return runFocus({ kind: 'poi', id: +mm[1] });
      if ((mm = /^focus:lvm:(.+)$/.exec(a))) return runFocus({ kind: 'lvm', id: mm[1] });
      return false;
    },
    onEscape: function () {
      if (GV.el) { gvClose(); return true; }
      if (MCD.sme && MCD.sme.highlight()) {
        MCD.sme.setHighlight(null);
        if (MCD.territory && MCD.territory.closePopup) safe(function () { MCD.territory.closePopup(); });
        /* item 38: Esc also ends the kecamatan focus (a focus the filter holds would otherwise need a second Esc) */
        if (MCD.map && typeof MCD.map.clearFocus === 'function') safe(function () { MCD.map.clearFocus({ reason: 'esc' }); });
        return true;
      }
      return false;
    },
    onSelect: function (sel) {
      if (!sel) return false;
      if (sel.kind === 'territory-kec' || (MCD.territory && sel.kind === MCD.territory.KIND)) {
        /* the shell's kecamatan popup shows the numbers; a click only highlights (never filters) */
        var kid = kecOfSel(sel);
        if (kid) S().setHighlight(kid);
        setTimeout(function () { if (ctx) ctx.clearSelection(); }, 0);
        return true;
      }
      if (sel.kind === 'mxCluster') {
        var cl = S().clusterAt(sel.id), z = MCD.map && MCD.map.getMap && MCD.map.getMap() ? MCD.map.getMap().getZoom() : 12;
        if (cl) flyTo(cl.position, z < S().CLUSTER_Z - 2 ? z + 2 : S().CLUSTER_Z + 0.3);
        setTimeout(function () { if (ctx) ctx.clearSelection(); }, 0);
        return true;
      }
      /* v5 (item 43): the kecamatan sheet (list first after "Lihat merchant di kecamatan ini", numbers first after
         "Detail"); the selection {kind: 'mxKec'} holds the map focus on the kecamatan */
      if (sel.kind === 'mxKec') {
        var kk = kecOfSel(sel);
        if (!kk) return false;
        if (!UI.kecSheet || UI.kecSheet.id !== kk) UI.kecSheet = { id: kk, listFirst: true };
        var km = safe(function () { return kecModel(kk, UI.kecSheet); });
        if (!km) return false;
        takeExplicit();                          // a kecamatan sheet is always asked for by name: never a callout
        setTimeout(function () { if (ctx) ctx.openDrawer(km, { explicit: true }); }, 0);
        return true;
      }
      var model0 = sel.kind === 'mxPoi' ? safe(function () { return poiModel(+sel.id, sel); }) : (sel.kind === 'mxLvm' ? safe(function () { return lvmModel(sel.id, sel); }) : null);
      if (!model0) return false;
      /* a row of this section's own lists and the crumb ask for the item by name: the sheet opens directly (no callout) */
      var ex = takeExplicit();
      setTimeout(function () { if (ctx) ctx.openDrawer(model0, ex ? { explicit: true } : undefined); }, 0);
      return true;
    },
    onResize: function () { wsCheck(); /* charts follow their containers by themselves */ },
    /* v5 workspace contract (item 43, LAYOUT_V5C_SPEC §7.4); all optional, feature-detected by the shell */
    workspace: workspace,
    summary: summary,
    cardFor: cardFor,
    kecList: function (kecId) { return kecId ? safe(function () { return kecModel(String(kecId), { listFirst: true }); }) : null; },
    /* test hooks of the list view without the map (tests/merchants-v3.test.mjs); not a public API */
    _gview: { open: gvOpen, close: gvClose, check: gvCheck, mapHidden: gvMapHidden, el: function () { return GV.el; }, results: function () { return GV.res; } }
  };
})(window.MCD = window.MCD || {});
