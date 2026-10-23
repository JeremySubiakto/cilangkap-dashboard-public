/* ==========================================================================
 * MCD.sections.health: the priority section "Kesehatan" (key 6 after V8; docs/HEALTH_SPEC.md, V7_SPEC D40,
 * COPY_STYLE_EN item 52 H1–H25). Rumah sakit, klinik kesehatan and klinik kecantikan within 5, 15 or 30 km of Mabes TNI
 * (scope switch, 5 km by default since the public-prototype merge of 23 Oct 2026, remembered per browser tab; a view
 * setting, never a filter, H12).
 *
 * Layout C "Kartu bertahap" (docs/LAYOUT_V5C_SPEC.md), the Kampus pattern (section-campus.js):
 *   Sederhana  guide: scope, Jenis chips, "Filter lain ({n})", three cards ("Rumah sakit dalam {km} km", "Klinik dalam
 *              {km} km", "Fasilitas untuk dikunjungi") and "Lihat daftar fasilitas".
 *   Detail     the same panel as the summary rail (workspace(), summary() with the scope pair) and the drawer
 *              "Daftar & grafik kesehatan": Rumah sakit · Klinik · Kecamatan · Jaringan · Tindak lanjut.
 *   Cards      facility ('hf': Profil · Peluang Mandiri · Kontak · Jarak & rute dari KCP · Merchant terkait · Tindak lanjut ·
 *              Identitas & sumber), identical point ('hfstack'), kecamatan ('kec', list first).
 *   Map        hospitals as a plus (larger, by size class), klinik as a disc, klinik kecantikan as a sparkle; hollow =
 *              no merchant priority; faint = approximate point; clinics in count bubbles per kind below zoom 13;
 *              identical points as one symbol with a count (MCD.health.sym).
 * Everything that exists only after the V8 wiring is feature-detected: the registry entry, MCD.app.lazy('health-
 * facilities') (engine falls back to one script injection), the map sprites for plus and sparkle, the 'kesehatan' plan
 * kind (MCD.plan.quick answers null until plan.js knows it), the 'sec-health' icon. Shared pieces as Kampus: MCD.inst
 * (scope), MCD.seal (through MCD.health.pipeline), MCD.windows, MCD.distance, MCD.territory, MCD.lvm.
 * Storage: mcd.health.ui.v1 {v, sortRs, sortKl, show, tab} (no name, id, number or place); the scope in sessionStorage
 * mcd.scope.v1 (through MCD.inst.scope when present). Safe DOM only (MCD.util.el, textContent). Nothing for the removed
 * TNI credit products or satker (D39, D41).
 * V8 (docs/V8_SPEC.md §4.4): the landing grammar health:tab:<rs|klinik|kec|jaringan|pipe>[:half[:<sort>]] (an unknown
 * part is ignored), the chip "Merchant KCP Cilangkap" in Merchant terkait (MCD.funding, no band or amount), the search
 * field's phone keyboard attributes (M3) and 44 px controls on phones (M7).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'health';
  var UI_KEY = 'mcd.health.ui.v1';
  var SCOPE_KEY = 'mcd.scope.v1';

  /* ============================================================ words (COPY_DECK §10.x copies this table) */

  var T = {
    title: 'Kesehatan',
    lede: 'Rumah sakit dan klinik dalam 5, 15 atau 30 km, dari data Kemenkes dan Dinkes DKI.',
    shows: ['Rumah sakit tanda tambah, klinik lingkaran, klinik kecantikan bintang empat sudut.', 'Rumah sakit lebih besar dari klinik dan dari lingkaran jumlah klinik.',
      'Rumah sakit: payroll, giro dan Virtual Account. Klinik: EDC, QRIS dan Livin’ Merchant.', 'Data dari Kemenkes, Dinas Kesehatan DKI Jakarta dan peta terbuka.'],
    scope: 'Cakupan', scopeLabel: 'Cakupan jarak dari Mabes TNI',
    scopeTip: 'Fasilitas kesehatan dalam radius 5 km, 15 km atau 30 km dari Mabes TNI. 15 km adalah cakupan pilot.',
    scopeSay: function (km, n) { return 'Cakupan ' + km + ' km. ' + n + ' fasilitas tampil.'; },
    jenis: 'Jenis', keepOne: 'Paling sedikit satu jenis tampil.', more: 'Filter lain', clear: 'Hapus filter',
    railRs: 'Rumah sakit', railKl: 'Klinik', railKc: 'Kecantikan',
    railRsTitle: function (km, b) { return 'Rumah sakit dalam ' + km + ' km dari Mabes TNI: ' + b.besar + ' besar, ' + b.sedang + ' sedang, ' + b.kecil + ' kecil.'; },
    railKlTitle: function (km) { return 'Klinik kesehatan dalam ' + km + ' km, termasuk klinik gigi, klinik mata dan laboratorium.'; },
    railKcTitle: function (km) { return 'Klinik kecantikan dalam ' + km + ' km.'; },
    kindOff: function (k) { return k + ' tidak ditampilkan.'; },
    c1: function (km) { return 'Rumah sakit dalam ' + km + ' km'; }, c1Line: function (p) { return p + ' milik swasta atau BUMN'; },
    noPlayTitle: 'Fasilitas milik pemerintah, TNI dan Polri tampil tanpa prioritas merchant.',
    c2: function (km) { return 'Klinik dalam ' + km + ' km'; }, c2Line: function (a, b) { return a + ' klinik kesehatan · ' + b + ' klinik kecantikan'; },
    c2Chain: function (c) { return c + ' cabang jaringan, keputusan bank melalui kantor pusat'; },
    c3: 'Fasilitas untuk dikunjungi', c3Title: 'Hanya fasilitas dengan prioritas merchant.', near: 'Terdekat dari KCP', biggest: 'RS terbesar',
    listBtn: 'Lihat daftar fasilitas',
    src: 'Sumber: Kemenkes (SIRS, SIRANAP, Direktori Klinik) · Dinkes DKI · OpenStreetMap · Overture · 22–23 Okt 2026',
    srcFull: 'Sumber: Kemenkes (SIRS Online, SIRANAP, Direktori Klinik) · Dinas Kesehatan DKI Jakarta (Satu Data Jakarta) · © kontributor OpenStreetMap · © Overture Maps Foundation · diambil 22–23 Okt 2026',
    attribution: 'Kesehatan: Kemenkes (SIRS Online, SIRANAP, Direktori Klinik) · Dinas Kesehatan DKI Jakarta · © kontributor OpenStreetMap (ODbL) · © Overture Maps Foundation · batas wilayah: BPS melalui OCHA/HDX (CC BY 3.0 IGO)',
    drawer: 'Daftar & grafik kesehatan', drawerLede: 'Rumah sakit, klinik, kecamatan, jaringan dan tindak lanjut.',
    divPlay: 'Prioritas merchant', divNo: 'Tanpa prioritas merchant (pemerintah, TNI, Polri)',
    csv: 'Ekspor daftar fasilitas (CSV)', csvTip: 'Daftar fasilitas yang tampil, dalam CSV. File CSV dapat dibuka di Excel.',
    rsOff: 'Rumah sakit tidak ditampilkan. Nyalakan jenis Rumah sakit.', rsOn: 'Tampilkan rumah sakit',
    klOff: 'Klinik tidak ditampilkan. Nyalakan jenis Klinik kesehatan atau Klinik kecantikan.', klOn: 'Tampilkan klinik',
    in15: 'dalam 15 km', all: 'Semua',
    chainRow: function (c, n, word, km, near) { return c + ' · ' + n + ' ' + word + ' dalam ' + km + ' km · terdekat ' + near; },
    noChain: function (n) { return 'Tanpa jaringan: ' + n + ' fasilitas'; },
    chainNote: 'Cabang jaringan biasanya memutuskan bank di kantor pusat. Kunjungan cabang untuk hubungan dan rujukan ke kantor pusat.',
    chainChip: function (c) { return 'Jaringan: ' + c; },
    loading: 'Memuat data fasilitas kesehatan…', failed: 'Data fasilitas kesehatan tidak dapat dimuat. Coba lagi.', retry: 'Coba lagi',
    empty: 'Tidak ada fasilitas yang cocok dengan filter ini. Hapus salah satu filter.',
    kecEmpty15: 'Tidak ada fasilitas kesehatan dalam 15 km di kecamatan ini.', kecTo30: 'Pilih 30 km untuk melihat lebih banyak.',
    kecList: function (k) { return 'Fasilitas di ' + k + ', rumah sakit dulu'; }, kecMore: 'Lihat semua di daftar', kecOpen: 'Lihat fasilitas di kecamatan ini',
    pipeEmpty: 'Belum ada fasilitas di tindak lanjut. Tambahkan dari kartu fasilitas dengan tombol + Tindak lanjut.',
    stackEyebrow: function (n) { return n + ' fasilitas di titik yang sama'; }, stackOpen: 'Lihat daftar',
    stackNote: 'Titik dari alamat. Beberapa fasilitas di jalan yang sama berada di satu titik.', stackCrumb: 'Titik ini',
    clusterTip: function (n, kind) { return n + ' ' + (kind === 'kecantikan' ? 'klinik kecantikan' : 'klinik kesehatan') + ' · klik untuk memperbesar'; },
    folds: { profil: 'Profil', peluang: 'Peluang Mandiri', kontak: 'Kontak', rute: 'Jarak & rute dari KCP', merchant: 'Merchant terkait', pipe: 'Tindak lanjut', sumber: 'Identitas & sumber' },
    addPipe: '+ Tindak lanjut', addPlan: '+ Rencana kunjungan',
    planWith: function (rs) { return '✓ Di rencana bersama ' + rs; }, planWithTip: function (rs) { return 'Klinik ini berada di lokasi ' + rs + ' yang telah ada di rencana.'; },
    rawatInap: 'Rawat inap: ya', rsLink: function (n) { return 'Terkait RS ' + n; },
    rsLinkLine: 'Klinik ini menggunakan nama rumah sakit di dekatnya dan memiliki izin sendiri.',
    chainLine: function (c) { return 'Jaringan: ' + c; },
    straight: function (x) { return 'Jarak garis lurus dari KCP: ' + x; }, routeShow: 'Tampilkan rute', routeOn: 'Rute tampil', zoomTo: 'Perbesar ke titik',
    kodeRs: 'Kode RS', kodeDone: 'Kode RS disalin', dataId: 'ID data', dataIdTip: 'Kode baris di data dashboard, untuk melacak tindak lanjut.',
    ownerReg: 'Pemilik di register', geoSrc: 'Sumber titik', sources: 'Sumber',
    veiledContact: 'Kontak disembunyikan saat nama disamarkan.', noContact: 'Kontak fasilitas ini belum tercatat di register.',
    mobileNote: 'Nomor seluler klinik di register tidak disimpan karena sering milik pribadi.',
    telTip: 'Hubungi melalui aplikasi telepon di perangkat ini.', noArea: 'tanpa kode area',
    noAreaTip: 'Nomor ini tercatat tanpa kode area. Tambahkan kode area saat menelepon dari ponsel.',
    mobile: 'seluler', mobileTip: 'Nomor seluler yang tercatat sebagai telepon rumah sakit di SIRS.', telDone: 'Nomor telepon disalin',
    mailTip: 'Tulis e-mail dengan aplikasi e-mail di perangkat ini.', mailDone: 'Alamat e-mail disalin',
    mailDropped: 'E-mail di daftar resmi tampak milik pribadi, sehingga tidak ditampilkan.',
    webTip: 'Buka situs resmi di tab baru. Perlu internet.', webMoved: 'Situs ini terbuka di alamat lain milik lembaga yang sama.',
    webSocial: 'Halaman resmi', webUnchecked: 'Alamat dari daftar resmi, belum diperiksa.', webHttp: 'Situs ini tidak menggunakan HTTPS.',
    webFailed: 'Situs resmi tidak dapat dibuka saat diperiksa.', webDropped: 'Alamat situs di daftar resmi tidak ditampilkan karena tidak aktif atau tidak aman.',
    noTel: 'Telepon belum tercatat.', noMail: 'E-mail belum tercatat.', noWeb: 'Situs resmi belum tercatat.',
    m: {
      'bukan-merchant': 'Fasilitas milik pemerintah, TNI atau Polri tidak dihitung sebagai merchant.',
      'luar-15': 'Status Livin’ Merchant dan EDC hanya tersedia dalam 15 km dari Mabes TNI.',
      potensi: 'File LVM belum diimpor. Status tampil setelah laporan Rev LVM diimpor di Data & Privasi.',
      'tanpa-peta': 'Fasilitas ini tidak tercantum di peta publik, sehingga statusnya tidak dapat dicocokkan.',
      'tidak-dihitung': 'Tidak dihitung sebagai merchant di bagian Merchant.',
      guess: 'Kemungkinan sama dengan toko LVM di kelurahan ini. Periksa sebelum dicatat.',
      active: 'Toko LVM aktif bulan ini', inactive: 'Toko LVM tidak aktif bulan ini', own: 'Terdaftar di KCP Cilangkap', other: 'Terdaftar di cabang lain',
      edcOn: 'EDC Mandiri: ada, aktif', edcOff: 'EDC Mandiri: ada, tidak aktif', edcNone: 'EDC Mandiri: belum ada di file EDC', go: 'Lihat di Merchant'
    },
    mWord: { 'bukan-merchant': 'Tanpa prioritas merchant', 'luar-15': 'Hanya dalam 15 km', potensi: 'Potensi', acquired: 'Sudah diakuisisi', not_yet: 'Belum ada di LVM',
      'tanpa-peta': 'Tidak tercantum di peta publik', 'tidak-dihitung': 'Tidak dihitung', guess: 'Perlu diperiksa', ours: 'Merchant KCP Cilangkap' },
    oursTip: 'Usaha ini ada di file funding merchant cabang.',
    notYetTip: 'Belum ada di LVM: usaha ini tidak ditemukan di file Livin’ Merchant yang diimpor.',
    notePh: 'Tulis langkah kerja. Jangan tulis nomor pribadi atau data pasien.',
    sealed: 'Terenkripsi dengan kata sandi dashboard.', memLine: 'Tindak lanjut hanya tersimpan selama halaman terbuka. Penyimpanan terenkripsi belum aktif.',
    blocked: 'Daftar tindak lanjut tidak tersimpan di perangkat ini karena penyimpanan browser diblokir. Ekspor sebelum menutup halaman.',
    quota: 'Penyimpanan browser penuh. Ekspor daftar, lalu hapus entri lama.',
    gmaps: 'Buka di Google Maps', gmapsTip: 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.', route: 'Rute di Google Maps',
    routeTip: 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.',
    distTip: 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.', distNone: 'Jarak belum dapat dihitung untuk titik ini.',
    unplaced: function (n) { return n + ' rumah sakit terdaftar di SIRS belum dapat ditempatkan di peta.'; },
    kesNotRead: function (n) { return 'Daftar klinik Kemenkes belum dibaca untuk ' + n + ' kota dan kabupaten. Di wilayah itu klinik berasal dari Dinkes DKI dan peta terbuka.'; }
  };
  var TABS = [{ id: 'rs', label: 'Rumah sakit' }, { id: 'klinik', label: 'Klinik' }, { id: 'kec', label: 'Kecamatan' }, { id: 'jaringan', label: 'Jaringan' }, { id: 'pipe', label: 'Tindak lanjut' }];
  var LOGO = {
    kopra: { src: 'assets/brand/kopra-logo.webp', alt: 'Kopra by Mandiri', w: 480, h: 245 },
    qris: { src: 'assets/brand/qris-logo.png', alt: 'QRIS', w: 360, h: 145 },
    lvm: { src: 'assets/brand/livin-merchant-icon.png', alt: 'Livin’ Merchant', w: 192, h: 192 }
  };
  var GM_BASE = 'https://www.google.com/maps/search/?api=1&query=';
  var KL_MAX = 60, TOP_KEC = 12, TOP_N = 5, LBL_CLINIC_MAX = 80;
  var STAGE_TONE = { baru: 'bad', kontak: 'mid', presentasi: 'mid', proposal: 'mid', pks: 'mid', onboarding: 'mid', aktif: 'ok', ditunda: 'none', gugur: 'none' };
  var SEL_RE = /^(health|hfStack|hfCluster|hfKec)$/;

  var H = null;                                  // MCD.health
  var ctx = null, page = null, ui = null, st = null;
  var offs = [], mapOffs = [], distSwitches = [], timers = [];
  var V = null, drawerSel = null, drawerObs = null, flyNext = false, unbindTerr = null, building = null, pipeEds = {};
  var ownFocus = null, pendingFocus = null, hlTimer = 0, LM = { key: '', m: null }, BUB = {};
  var hl = { set: null, key: '' };

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
  function idle(fn, ms) {
    later(function () {
      if (isFn(window.requestIdleCallback)) { try { window.requestIdleCallback(function () { fn(); }, { timeout: 2000 }); return; } catch (e) { /* timer below */ } }
      fn();
    }, ms || 0);
  }
  function admin() { var A = window.MCD_ADMIN_AREAS; return A && isFn(A.byId) ? A : null; }
  function territory() { var Tr = MCD.territory; return Tr && isFn(Tr.ready) && Tr.ready() ? Tr : null; }
  function requestRender() { if (MCD.map && isFn(MCD.map.requestRender)) MCD.map.requestRender(); }
  function uiTheme() { var t = ctx && isFn(ctx.theme) ? ctx.theme() : document.documentElement.getAttribute('data-theme'); return t === 'day' ? 'day' : 'night'; }
  function demoOn() { return !!(MCD.demo && isFn(MCD.demo.isOn) && MCD.demo.isOn()); }
  function guard(b) { if (b && MCD.demo && isFn(MCD.demo.guard)) MCD.demo.guard(b); return b; }
  function toast(m, k) { if (ctx) ctx.toast(m, k || null); }
  function copy(text) { var n = typeof navigator !== 'undefined' ? navigator : null; return n && n.clipboard && isFn(n.clipboard.writeText) ? n.clipboard.writeText(text) : Promise.reject(new Error('clipboard')); }
  function download(name, text, type) {
    try {
      var url = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' })), a = E('a', { href: url, download: name, hidden: true });
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  }
  function ymd() { var u = MCD.util.date; try { return u && u.ymd ? u.ymd(new Date()) : ''; } catch (e) { return ''; } }
  function nameOf(r) { return !r ? '' : veil() ? H.initials(r.name) : r.name; }
  function shortName(s, n) { s = String(s || ''); n = n || 34; return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function coarse() { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } }

  function WS() { var W0 = MCD.windows; return W0 && typeof W0 === 'object' ? W0 : null; }
  function adopted() { var w = ui && ui.work && ui.work.el; return !!(w && w.classList && w.classList.contains('ws-drawer')); }
  function syncAdopted() {
    var w = ui && ui.work && ui.work.el;
    if (!w) return;
    var on = adopted();
    if (on === !!w.__hfAdopted) return;
    w.__hfAdopted = on;
    if (on) { w.removeAttribute('data-slideover'); w.removeAttribute('data-slideover-label'); }
    else { w.setAttribute('data-slideover', ''); w.setAttribute('data-slideover-label', T.listBtn); }
  }

  function btn(label, iconName, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['btn', cls || 'btn--secondary'], title: title || null }, iconName ? icon(iconName) : null, E('span', { text: label }));
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function link(label, onClick, cls, title) {
    var b = E('button', { type: 'button', class: ['hf-link', cls], text: label, title: title || null });
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  /** A radio group (← → move; Tab lands on the checked option); kind 'chips' = quiet chips that wrap. */
  function seg(label, opts, onPick, extra, kind) {
    var asChips = kind === 'chips';
    var wrap = E('div', { class: asChips ? ['hf-rchips', extra] : ['seg', 'hf-seg', extra], role: 'radiogroup', aria: { label: label } });
    var btns = opts.map(function (o) {
      var b = E('button', { type: 'button', class: asChips ? 'chip hf-rchip' : 'seg__opt', role: 'radio', aria: { checked: 'false' }, title: o.title || o.label, attrs: { tabindex: '-1' }, text: o.label });
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
      },
      label: function (v, text) { opts.forEach(function (o, i) { if (String(o.v) === String(v) && btns[i].textContent !== text) btns[i].textContent = text; }); }
    };
  }
  /** Toggle chips (button.chip[aria-pressed]) with a count each: "Rumah sakit · 145". */
  function chips(label, items, onToggle, cls) {
    var wrap = E('div', { class: ['hf-chips', cls], role: 'group', aria: { label: label } }), map = {};
    items.forEach(function (it) {
      var cnt = E('span', { class: 'chip__count' });
      var b = E('button', { type: 'button', class: 'chip hf-chip', aria: { pressed: 'true' }, title: it.title || null, attrs: { 'data-id': it.id } }, it.sym || null, E('span', { class: 'hf-chip__t', text: it.label }), cnt);
      b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') === 'true' || b.disabled) return; onToggle(it.id); });
      wrap.appendChild(b);
      map[it.id] = { b: b, cnt: cnt, title: it.title || '' };
    });
    return {
      el: wrap,
      set: function (on, counts, o) {
        o = o || {};
        var onIds = Object.keys(map).filter(function (k) { return on[k] !== false; });
        Object.keys(map).forEach(function (id) {
          var m = map[id], pressed = on[id] !== false;
          m.b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
          m.cnt.textContent = counts && isNum(counts[id]) ? ' · ' + fm().int(counts[id]) : '';
          m.b.disabled = !!(o.disabled && o.disabled[id]);
          if (o.keepOne && pressed && onIds.length === 1) { m.b.setAttribute('aria-disabled', 'true'); m.b.title = T.keepOne; }
          else { m.b.removeAttribute('aria-disabled'); m.b.title = m.title; }
        });
      }
    };
  }
  function exhibit(o) {
    var titleEl = E('h3', { class: 'exhibit__title hf-ex__title' }), subEl = E('p', { class: 'exhibit__sub hf-ex__sub' }), body = E('div', { class: 'hf-ex__body' }), src = E('p', { class: 'exhibit__source hf-ex__src' });
    var el = E('article', { class: ['exhibit', 'hf-ex', o.cls] }, o.eyebrow ? E('p', { class: 'hf-ex__eyebrow', text: o.eyebrow }) : null, titleEl, subEl, body, src);
    return { el: el, body: body, set: function (t, s, so) { titleEl.textContent = t || ''; subEl.textContent = s || ''; src.textContent = so || ''; subEl.hidden = !s; src.hidden = !so; } };
  }
  function logo(k, cls) { var L = LOGO[k]; return E('span', { class: ['hf-logo', 'hf-logo--' + k, cls], aria: { hidden: 'true' } }, E('img', { src: L.src, alt: L.alt, width: L.w, height: L.h, decoding: 'async', loading: 'lazy' })); }
  function kv(k, v, title) { return E('div', { class: 'dd-kv', title: title || null }, E('span', { class: 'dd-kv__k', text: k }), E('span', { class: 'dd-kv__v' }, v)); }
  function note(text, cls, title) { return E('p', { class: ['hf-note', cls], text: text, title: title || null }); }
  function tag(text, tone, title) { return E('span', { class: 'hf-tag' + (tone ? ' is-' + tone : ''), text: text, title: title || null }); }
  /** A card fold: .dd-blk with data-fold, data-preview and data-open (MCD.windows reads them). */
  function blk(title, kids, cls, o) {
    var s = E('section', { class: ['dd-blk', 'hf-dd', cls] }, E('h3', { class: 't-eyebrow dd-blk__t', text: title }), kids);
    if (o) {
      if (o.id) s.setAttribute('data-fold', o.id);
      if (o.preview) s.setAttribute('data-preview', o.preview);
      if (o.open != null) s.setAttribute('data-open', o.open ? '1' : '0');
    }
    return s;
  }
  function gmapsUrl(o) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && isFn(G.url)) return G.url(o);
    var lat = Number(o && o.lat), lon = Number(o && o.lon);
    return isFinite(lat) && isFinite(lon) ? GM_BASE + (Math.round(lat * 1e5) / 1e5) + ',' + (Math.round(lon * 1e5) / 1e5) : null;
  }
  function routeUrl(lon, lat) {
    var D = MCD.distance;
    if (D && isFn(D.directionsUrl)) { try { var u = D.directionsUrl(lon, lat); if (u) return String(u); } catch (e) { /* own URL below */ } }
    if (!isNum(lon) || !isNum(lat)) return null;
    var b = (MCD.config && MCD.config.branch) || {}, bl = isNum(b.lat) ? b.lat : -6.33203, bo = isNum(b.lon) ? b.lon : 106.90989;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + bl.toFixed(5) + ',' + bo.toFixed(5) + '&destination=' + lat.toFixed(5) + ',' + lon.toFixed(5) + '&travelmode=driving';
  }
  function extLink(href, text, title, cls, aria) {
    return E('a', { class: ['hf-ext', cls], href: href, target: '_blank', rel: 'noopener noreferrer', attrs: { referrerpolicy: 'no-referrer' }, title: title || null, aria: aria ? { label: aria } : null },
      E('span', { text: text }), icon('external'), E('span', { class: 'sr-only', text: ', terbuka di tab baru' }));
  }

  /* ============================================================ scope (H12) */

  /* Merge of the public prototype (23 Oct 2026): every map section opens at 5 km with 15 and 30 km as options (the
     teammates' rule of 21 Oct 2026, applied here in spirit since Kesehatan came after their base). 5 km: camera '5'
     and the 15 km kecamatan zones; the facilities by distMabesKm (H12 keeps in15 / distMabesKm only). */
  var SCOPES = [5, 15, 30];
  function scopeOf(v) { v = +v; return v === 15 || v === 30 ? v : 5; }
  var SCOPE_MEM = null;
  function scopeApi() { var I = MCD.inst; return I && I.scope && isFn(I.scope.get) && isFn(I.scope.set) ? I.scope : null; }
  function scopeGet() {
    var A = scopeApi();
    if (A) { try { return scopeOf(A.get(ID, 5)); } catch (e) { /* own below */ } }
    if (SCOPE_MEM != null) return SCOPE_MEM;
    try { var o = JSON.parse(window.sessionStorage.getItem(SCOPE_KEY) || 'null'); if (o && o.v === 1 && SCOPES.indexOf(o.health) >= 0) return o.health; } catch (e) { /* memory */ }
    return 5;
  }
  function scopeSet(v) {
    v = scopeOf(v);
    var A = scopeApi();
    if (A) { try { A.set(ID, v); return; } catch (e) { /* own below */ } }
    SCOPE_MEM = v;
    try {
      var o = JSON.parse(window.sessionStorage.getItem(SCOPE_KEY) || 'null');
      if (!o || o.v !== 1 || typeof o !== 'object') o = { v: 1 };
      o.health = v;
      window.sessionStorage.setItem(SCOPE_KEY, JSON.stringify(o));
    } catch (e) { /* the value stays in memory */ }
  }
  function scopeSwitch() {
    var I = MCD.inst;
    if (I && isFn(I.scopeSwitch)) {
      try {
        var r = I.scopeSwitch({ section: ID, value: st.km, wide: true, label: false, tip: T.scopeTip,
          onChange: function (v) { setKm(+v, { quiet: true }); }, announce: function (v) { return scopeWords(+v); } });
        var n = nodeOf(r);
        if (n) return { el: n, set: function (v) { var a = n.mcdScope || r; if (a && isFn(a.set)) a.set(v); } };
      } catch (e) { /* own below */ }
    }
    var s = seg(T.scopeLabel, SCOPES.map(function (v) { return { v: v, label: v + ' km', title: T.scopeTip }; }), function (v) { setKm(v); }, 'scope hf-scope');
    s.el.title = T.scopeTip;
    return s;
  }
  function announce(text) { if (ui && ui.panel && ui.panel.live) ui.panel.live.textContent = text; }
  function scopeWords(v) { computeView(); return T.scopeSay(v, fm().int(V ? V.counts.total : 0)); }
  function setKm(v, o) {
    v = scopeOf(v);
    if (!st) return;
    var changed = v !== st.km;
    st.km = v;
    scopeSet(v);
    if (!changed) { if (ui && ui.panel) ui.panel.scope.set(v); return; }
    refresh(['scope']);
    applyZones();
    registerPosture();
    if (!(o && o.camera === false)) { var M = MCD.map; if (M && isFn(M.preset)) { try { M.preset(cameraOf(st.km)); } catch (e) { /* the map keeps its view */ } } }
    if (!(o && o.quiet)) announce(scopeWords(v));
  }
  /** The camera of a scope: the 5 km ring ('5', MCD.config.map.presets), 'sme15' or 'ring30'. */
  function cameraOf(km) { return km === 5 ? '5' : km === 15 ? 'sme15' : 'ring30'; }
  /** 5 and 15 km keep the 15 km kecamatan zones (as Kampus does at 5 km); 30 km the 30 km set. */
  function zoneSpec() { return !st || st.km <= 15 ? { mode: 'kecamatan15' } : { mode: 'kecamatan', km: 30 }; }
  function applyZones() { var M = MCD.map; if (M && isFn(M.setZones)) { try { M.setZones(Object.assign({ section: ID }, zoneSpec())); } catch (e) { /* the map keeps its zones */ } } }

  /* ============================================================ state (H14; UX_FIX_PLAN D14: filters in memory only) */

  function defaults() {
    return { km: 5, f: H.defaults(), sortRs: 'rsBesar', sortKl: 'near', topSort: 'near', tab: 'rs', q: '', kecBy: 'semua', kecAll: false,
      pipeStage: '', pipeProd: '', moreOpen: false, workOpen: false, selKec: null };
  }
  function loadState() {
    var s = defaults(), saved = sget(UI_KEY, null);
    if (saved && saved.v === 1) {
      if (/^(rsBesar|near|kelas)$/.test(saved.sortRs)) s.sortRs = saved.sortRs;
      if (/^(near|nama)$/.test(saved.sortKl)) s.sortKl = saved.sortKl;
      if (TABS.some(function (t) { return t.id === saved.tab; })) s.tab = saved.tab;
      if (saved.show && typeof saved.show === 'object') H.KIND_IDS.forEach(function (k) { if (saved.show[k] === false) s.f.show[k] = false; });
      s.f = H.normFilters(s.f);
    }
    s.km = scopeGet();
    return s;
  }
  var saveUi = function () {};
  var LISTED = ['kelas', 'size', 'layanan', 'owner', 'lvm', 'bpjs'];
  function groupOff(g) { return H.GROUPS[g].some(function (k) { return st.f[g][k] === false; }); }
  function groupOn(g) { return g === 'lvm' ? hasLvm() : g === 'bpjs' ? bpjsReady() : true; }
  function filterCount() {
    if (!st) return 0;
    var n = LISTED.filter(function (g) { return groupOn(g) && groupOff(g); }).length;
    return n + (st.f.jaringan !== 'semua' ? 1 : 0) + (st.f.chain ? 1 : 0);
  }
  function resetFilters() {
    var show = st.f.show;
    st.f = H.defaults();
    st.f.show = show;
    refresh(['filters']);
  }
  function resetAll() { st.f = H.defaults(); saveUi(); refresh(['filters']); }
  function toggleShow(id) {
    var on = st.f.show[id] !== false, others = H.KIND_IDS.filter(function (k) { return k !== id && st.f.show[k] !== false; }).length;
    if (on && !others) { toast(T.keepOne); return; }
    st.f.show[id] = !on;
    saveUi();
    refresh(['filters']);
  }
  function toggleChip(g, id) { st.f[g][id] = st.f[g][id] === false; refresh(['filters']); }
  function setJaringan(v) { st.f.jaringan = v === 'tanpa' || v === 'jaringan' ? v : 'semua'; refresh(['filters']); }
  function setChain(name) { st.f.chain = name || null; if (name) st.f.jaringan = 'semua'; refresh(['filters']); }
  function showOnly(kind) { if (H.KIND_IDS.indexOf(kind) < 0) return; H.KIND_IDS.forEach(function (k) { st.f.show[k] = k === kind; }); saveUi(); refresh(['filters']); }
  /* one rule with the engine (MCD.health.hasLvm), so the section and the counts agree on "an LVM file is in" */
  function hasLvm() {
    if (H && isFn(H.hasLvm)) { try { return !!H.hasLvm(); } catch (e) { return false; } }
    var L = MCD.lvm, R = null; try { R = L && isFn(L.result) ? L.result() : null; } catch (e) { R = null; } if (R) return !!R.hasLvm; var d = MCD.data; return !!(d && Array.isArray(d.lvm) && d.lvm.length && L);
  }
  function bpjsReady() { var m = H && H.meta(); return !!(m && m.bpjs && typeof m.bpjs === 'object'); }
  /** Active filters as chips in the section header (ctx.filterChips): one per group; the scope is not a filter. */
  function syncChips() {
    if (!ctx || !isFn(ctx.filterChips)) return;
    var out = [];
    LISTED.forEach(function (g) {
      if (!groupOn(g) || !groupOff(g)) return;
      var F = H.FILTERS[g], on = F.chips.filter(function (c) { return st.f[g][c.id] !== false; }).map(function (c) { return c.label; });
      out.push({ label: F.label + ': ' + (on.length ? on.join(', ') : 'tidak ada'), onClear: function () { H.GROUPS[g].forEach(function (k) { st.f[g][k] = true; }); refresh(['filters']); } });
    });
    if (st.f.jaringan !== 'semua') out.push({ label: 'Jaringan: ' + (st.f.jaringan === 'tanpa' ? 'Tanpa jaringan' : 'Jaringan'), onClear: function () { setJaringan('semua'); } });
    if (st.f.chain) out.push({ label: T.chainChip(st.f.chain), onClear: function () { setChain(null); } });
    try { ctx.filterChips(out, { onClearAll: resetFilters }); } catch (e) { /* the shell has its own guard */ }
  }

  /* ============================================================ data */

  function startData() {
    if (!H || H.ready()) return;
    var p = H.load();
    renderAll();
    p.then(function (ok) {
      if (!ctx) return;
      V = null;
      refresh(['*']);
      if (ok) { if (isDeep() && ui.work) renderWork(true); if (pendingFocus != null) later(runPendingFocus, 60); }
      if (isFn(ctx.requestRender)) ctx.requestRender(['ext']);
    });
  }
  function startTerritory() {
    var Tr = MCD.territory;
    if (!Tr || !isFn(Tr.ensureData) || (isFn(Tr.ready) && Tr.ready())) return;
    Tr.ensureData().then(function () { if (ctx) { V = null; refresh(['*']); } }, function () { /* names from the boundary file */ });
  }

  var DISTC = new Map();
  function peakOn() { var D = MCD.distance; try { return !!(D && isFn(D.peakOn) && D.peakOn()); } catch (e) { return false; } }
  function noTollOn() { var D = MCD.distance; try { return !!(D && isFn(D.noTollOn) && D.noTollOn()); } catch (e) { return false; } }
  /** Road distance and minutes from KCP for a row (MCD.distance), cached; the straight line from KCP (distKm) without it. */
  function distOf(r) {
    if (!r || !isNum(r.lon) || !isNum(r.lat)) return null;
    var key = r.lon.toFixed(5) + ',' + r.lat.toFixed(5);
    if (DISTC.has(key)) return DISTC.get(key);
    var A = MCD.distance, d = null;
    if (A && isFn(A.of)) { try { d = A.of(r.lon, r.lat, { kelurahanId: r.kelId || null, kecamatanId: r.kecId || null }); } catch (e) { d = null; } }
    if (!d && isNum(r.distKm)) d = { km: r.distKm, min: null, precision: 'garis-lurus', source: 'garis' };
    DISTC.set(key, d || null);
    return d || null;
  }
  function minutesWords(m) { m = Math.max(1, Math.round(m)); return '± ' + (m >= 60 ? Math.floor(m / 60) + ' jam' + (m % 60 ? ' ' + (m % 60) + ' menit' : '') : m + ' menit'); }
  function kmWords(km) { return km < 1 ? Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m' : fm().num(km, 1) + ' km'; }
  /** "2,4 km · ± 8 menit" (MCD.distance.format); parts 'cell' → {km, min}. */
  function distText(d, parts) {
    var A = MCD.distance;
    if (d && A && isFn(A.format)) {
      try {
        var t = A.format(d);
        if (t) {
          if (!parts) return t;
          if (d.pending) return { km: t, min: '' };
          var cut = t.indexOf(' · '), o = cut >= 0 ? { km: t.slice(0, cut), min: t.slice(cut + 3) } : (/^±/.test(t) ? { km: '', min: t } : { km: t, min: '' });
          if (o.min) o.min = o.min.replace(/\s*\((?:jam sibuk|tanpa tol)[^)]*\)\s*$/, '');
          return o;
        }
      } catch (e) { /* own words below */ }
    }
    if (!d || !isNum(d.km)) return parts ? { km: '—', min: '' } : '—';
    var kmT = kmWords(d.km), minT = isNum(d.min) ? minutesWords(d.min) : (d.source === 'garis' ? 'garis lurus' : '');
    return parts ? { km: kmT, min: minT } : kmT + (minT ? ' · ' + minT : '');
  }
  function distTip(d) {
    var A = MCD.distance;
    if (A && isFn(A.tip)) { try { var t = A.tip(d); if (t) return t; } catch (e) { /* own words below */ } }
    return !d ? T.distNone : d.source === 'garis' ? 'Jarak garis lurus dari KCP Jakarta Cilangkap. Waktu tempuh belum dapat dihitung.' : T.distTip;
  }
  function distShort(d) { var p = distText(d, 'cell'); return p.km && p.km !== '—' ? p.km + (p.min ? ' · ' + p.min : '') : '—'; }
  function distSortVal(r) {
    var d = distOf(r);
    if (!d) return Infinity;
    var nt = noTollOn() && d.noToll && isNum(d.noToll.min) ? d.noToll.min : null;
    return isNum(nt) ? nt : isNum(d.min) ? d.min : isNum(d.km) ? d.km * 3 + 1e4 : Infinity;
  }
  function distModeWords() { return [peakOn() ? 'jam sibuk' : null, noTollOn() ? 'tanpa tol' : null].filter(Boolean).join(', '); }
  function distToggles() {
    var D = MCD.distance, c = null;
    if (D && isFn(D.controls)) { try { c = D.controls({ compact: true }); } catch (e) { c = null; } }
    var api = { el: E('div', { class: 'hf-distsw' }, c), sync: function () { if (c && isFn(c.sync)) c.sync(); } };
    distSwitches.push(api);
    return api;
  }
  function onDistance() {
    DISTC = new Map();
    if (!ctx) return;
    distSwitches.forEach(function (s) { try { s.sync(); } catch (e) { /* ignore */ } });
    renderPanel();
    if (ui && ui.work && (st.tab === 'rs' || st.tab === 'klinik')) renderList();
    refreshOpenCard();
  }

  /* ============================================================ view model */

  function computeView() {
    if (!H || !H.ready() || !st) { V = null; return null; }
    /* lvmToken: a new LVM result (import, second import, Data contoh, LVM settings) is a new view even with the LVM
       chips at their default, since the chip counts and Merchant terkait read it */
    var key = H.filterKey(st.f), lv = hasLvm(), lt = lv && isFn(H.lvmToken) ? H.lvmToken() : (lv ? 1 : 0);
    var sig = [st.km, key, JSON.stringify(st.f.show), lt, territory() ? 1 : 0].join('|');
    if (V && V.sig === sig && V.D === H.data()) return V;
    var rows = H.rows({ km: st.km, f: st.f }), v = { sig: sig, D: H.data(), km: st.km, rows: rows, counts: H.counts({ km: st.km, f: st.f }), hasLvm: lv,
      specs: new Map(), ids: new Set(), by: { rs: [], klinik: [], kecantikan: [] } };
    rows.forEach(function (r) { v.specs.set(r.id, H.sym.spec(r)); v.ids.add(r.id); v.by[r.kind].push(r); });
    v.stacks = H.stacks(rows);
    v.stackOf = new Map();
    v.stacks.forEach(function (ids, k) { ids.forEach(function (id) { v.stackOf.set(id, k); }); });
    V = v;
    LM = { key: '', m: null };
    return v;
  }

  /* ============================================================ symbols */

  function symChip(r, cls) { return H && r ? H.sym.chip(H.sym.spec(r), uiTheme(), { title: H.sym.words(r), cls: cls }) : null; }
  function kindChip(kind) { var r = { kind: kind, play: true, size: 'sedang' }; return H.sym.chip(H.sym.spec(r), uiTheme(), { cls: 'hf-chip__sym' }); }
  function symLabel(r) { return E('span', { class: 'hf-symlabel' }, symChip(r), E('span', { text: H.words.sub(r) })); }

  /* ============================================================ panel: guide (Sederhana) and rail (Detail) */

  function buildPanel(body) {
    var p = {};
    p.live = E('p', { class: 'sr-only', aria: { live: 'polite' }, attrs: { role: 'status' } });
    p.status = E('div', { class: 'hf-load', hidden: true });
    p.openWork = isDeep() ? btn(T.listBtn, 'chev-r', function () { openWork(true, 'list'); }, 'btn--secondary btn--lg hf-openwork') : null;
    p.scope = scopeSwitch();
    p.jenis = chips(T.jenis, H.KINDS.map(function (k) { return { id: k.id, label: k.label, title: k.tip, sym: kindChip(k.id) }; }), toggleShow, 'hf-chips--jenis');
    p.moreBtn = E('button', { type: 'button', class: 'hf-morebtn', aria: { expanded: st.moreOpen ? 'true' : 'false', controls: 'hf-more' } }, E('span', { class: 'hf-morebtn__t' }), icon('chev-d'));
    p.more = E('div', { class: 'hf-more', id: 'hf-more', hidden: !st.moreOpen });
    buildMore(p);
    p.moreBtn.addEventListener('click', function () { st.moreOpen = !st.moreOpen; p.more.hidden = !st.moreOpen; p.moreBtn.setAttribute('aria-expanded', st.moreOpen ? 'true' : 'false'); });
    p.cards = E('div', { class: 'hf-cards', role: 'list' });
    p.c1 = card('hf-card--rs'); p.c2 = card('hf-card--kl'); p.c3 = buildTop();
    [p.c1, p.c2, p.c3].forEach(function (c) { p.cards.appendChild(c.el); });
    p.src = E('p', { class: 'hf-src', text: T.src });
    p.el = E('div', { class: 'hf-panel', aria: { busy: 'false' } }, p.openWork, p.live, p.status,
      E('div', { class: 'hf-row' }, E('span', { class: 'hf-row__l', text: T.scope }), p.scope.el),
      E('div', { class: 'hf-row' }, E('span', { class: 'hf-row__l', text: T.jenis }), p.jenis.el),
      p.moreBtn, p.more, p.cards, p.src);
    body.insertBefore(p.el, body.firstChild);
    ui.panel = p;
  }
  /** "Filter lain": Kelas RS, Ukuran RS, Layanan, Kepemilikan, Jaringan, Status Livin’ Merchant (after an LVM import) and Mitra BPJS. */
  function buildMore(p) {
    var F = H.FILTERS;
    p.groups = {};
    ['kelas', 'size', 'layanan', 'owner'].forEach(function (g) {
      var c = chips(F[g].label, F[g].chips.map(function (x) { return { id: x.id, label: x.label, title: F[g].title || null }; }), function (id) { toggleChip(g, id); }, 'hf-chips--' + g);
      p.groups[g] = c;
      p.more.appendChild(E('div', { class: 'hf-fg', title: F[g].title || null }, E('p', { class: 'hf-fg__l', text: F[g].label }), c.el, F[g].line ? note(F[g].line) : null));
    });
    p.jar = seg(F.jaringan.label, F.jaringan.options, function (v) { setJaringan(v); }, 'hf-seg--jar');
    p.more.appendChild(E('div', { class: 'hf-fg', title: F.jaringan.title }, E('p', { class: 'hf-fg__l', text: F.jaringan.label }), p.jar.el));
    p.lvm = chips(F.lvm.label, F.lvm.chips, function (id) { toggleChip('lvm', id); }, 'hf-chips--lvm');
    p.lvmRow = E('div', { class: 'hf-fg', title: F.lvm.title, hidden: true }, E('p', { class: 'hf-fg__l', text: F.lvm.label }), p.lvm.el);
    p.more.appendChild(p.lvmRow);
    p.bpjs = chips(F.bpjs.label, F.bpjs.chips, function (id) { toggleChip('bpjs', id); }, 'hf-chips--bpjs');
    p.bpjsNone = E('p', { class: 'hf-fg__off', aria: { disabled: 'true' } }, E('span', { class: 'hf-fg__l', text: F.bpjs.label }), E('span', { class: 'hf-note', text: F.bpjs.none }));
    p.more.appendChild(E('div', { class: 'hf-fg hf-fg--bpjs' }, p.bpjsNone, p.bpjs.el));
    p.clear = btn(T.clear, 'reset', function () { resetFilters(); }, 'btn--ghost btn--bar hf-clear');
    p.more.appendChild(p.clear);
  }
  function renderMore(p) {
    var ch = V ? V.counts.chips : null, show = st.f.show;
    ['kelas', 'size'].forEach(function (g) { var dis = {}; H.GROUPS[g].forEach(function (k) { dis[k] = show.rs === false; }); p.groups[g].set(st.f[g], ch && ch[g], { disabled: dis }); });
    var lay = {};
    H.FILTERS.layanan.chips.forEach(function (c) { lay[c.id] = c.kinds.every(function (k) { return show[k] === false; }); });
    p.groups.layanan.set(st.f.layanan, ch && ch.layanan, { disabled: lay });
    p.groups.owner.set(st.f.owner, ch && ch.owner);
    p.jar.set(st.f.jaringan);
    ['semua', 'tanpa', 'jaringan'].forEach(function (v) { var o = H.FILTERS.jaringan.options.filter(function (x) { return x.v === v; })[0]; p.jar.label(v, o.label + (ch ? ' · ' + fm().int(ch.jaringan[v]) : '')); });
    p.lvmRow.hidden = !hasLvm();
    p.lvm.set(st.f.lvm, ch && ch.lvm);
    var b = bpjsReady();
    p.bpjsNone.hidden = b; p.bpjs.el.hidden = !b;
    if (b) p.bpjs.set(st.f.bpjs, ch && ch.bpjs);
  }
  function card(cls) {
    var head = E('p', { class: 'hf-card__t' }), big = E('p', { class: 'hf-card__v' }), lines = E('div', { class: 'hf-card__lines' });
    return { el: E('article', { class: ['hf-card', cls], role: 'listitem' }, E('div', { class: 'hf-card__body' }, head, big, lines)), head: head, big: big, lines: lines };
  }
  function buildTop() {
    var c = card('hf-card--top');
    c.big.remove();
    c.sort = seg(T.c3, [{ v: 'near', label: T.near }, { v: 'rsBesar', label: T.biggest }], function (v) { st.topSort = v; renderTop(c); }, 'hf-rchips--top', 'chips');
    c.sw = distToggles();
    c.list = E('ul', { class: 'hf-mini' });
    c.lines.appendChild(c.sort.el); c.lines.appendChild(c.sw.el); c.lines.appendChild(c.list);
    c.lines.appendChild(E('p', { class: 'hf-card__foot' }, link(T.listBtn, function () { goTab(st.topSort === 'rsBesar' ? 'rs' : (st.f.show.klinik === false && st.f.show.kecantikan === false ? 'rs' : 'klinik')); })));
    return c;
  }
  function renderLoad(host) {
    if (!host) return;
    clear(host);
    var s = H ? H.state() : 'error';
    if (s === 'ready') { host.hidden = true; return; }
    host.hidden = false;
    host.classList.toggle('is-error', s === 'error');
    if (s === 'error') { host.appendChild(E('p', { class: 'hf-load__t', text: T.failed })); host.appendChild(btn(T.retry, 'reset', function () { startData(); }, 'btn--secondary')); }
    else { host.appendChild(E('span', { class: 'hf-load__bar', aria: { hidden: 'true' } })); host.appendChild(E('p', { class: 'hf-load__t', text: T.loading })); }
  }
  function renderPanel() {
    var p = ui && ui.panel;
    if (!p || !st) return;
    computeView();
    p.scope.set(st.km);
    renderLoad(p.status);
    p.el.setAttribute('aria-busy', H.state() === 'loading' ? 'true' : 'false');
    var nf = filterCount();
    p.moreBtn.querySelector('.hf-morebtn__t').textContent = T.more + (nf ? ' (' + nf + ')' : '');
    p.clear.disabled = !nf;
    p.jenis.set(st.f.show, V ? V.counts.chips.show : null, { keepOne: true });
    renderMore(p);
    p.cards.hidden = !V;
    if (!V) return;
    renderC1(p.c1); renderC2(p.c2); renderTop(p.c3);
  }
  function emptyFilter() { return E('div', { class: 'hf-empty' }, E('p', { text: T.empty }), btn(T.clear, 'reset', function () { resetAll(); }, 'btn--ghost btn--bar')); }
  function renderC1(c) {
    var f = fm(), n = V.counts, km = st.km;
    c.head.textContent = T.c1(km);
    clear(c.lines);
    if (st.f.show.rs === false) { c.big.textContent = '—'; c.big.title = T.kindOff('Rumah sakit'); c.lines.appendChild(E('div', { class: 'hf-empty' }, E('p', { text: T.rsOff }), btn(T.rsOn, 'plus', function () { toggleShow('rs'); }, 'btn--ghost btn--bar'))); return; }
    c.big.textContent = f.int(n.rs);
    c.big.title = T.railRsTitle(km, n.bySize);
    if (!n.rs) { c.lines.appendChild(emptyFilter()); return; }
    var parts = [{ k: 'besar', label: 'Besar' }, { k: 'sedang', label: 'Sedang' }, { k: 'kecil', label: 'Kecil' }].map(function (x) { x.v = n.bySize[x.k]; return x; }).filter(function (x) { return x.v > 0; });
    var bar = E('div', { class: 'hf-split__bar', role: 'img', title: T.railRsTitle(km, n.bySize), aria: { label: parts.map(function (x) { return x.label + ' ' + x.v; }).join(', ') } });
    parts.forEach(function (x) { bar.appendChild(E('i', { class: 'is-' + x.k, style: { width: (100 * x.v / n.rs).toFixed(2) + '%' } })); });
    var keys = E('div', { class: 'hf-split__keys' });
    parts.forEach(function (x) { keys.appendChild(E('span', { class: 'hf-split__k' }, E('i', { class: 'hf-split__sw is-' + x.k, aria: { hidden: 'true' } }), E('span', { text: x.label + ' ' }), E('b', { text: f.int(x.v) }))); });
    c.lines.appendChild(E('div', { class: 'hf-split' }, bar, keys));
    var playRs = V.by.rs.filter(function (r) { return r.play; }).length;
    c.lines.appendChild(E('p', { class: 'hf-card__line', title: T.noPlayTitle, text: T.c1Line(f.int(playRs)) }));
  }
  function renderC2(c) {
    var f = fm(), n = V.counts, km = st.km, kl = st.f.show.klinik !== false, kc = st.f.show.kecantikan !== false;
    c.head.textContent = T.c2(km);
    clear(c.lines);
    if (!kl && !kc) { c.big.textContent = '—'; c.big.title = T.kindOff('Klinik'); c.lines.appendChild(E('p', { class: 'hf-card__line hf-card__line--quiet', text: T.klOff })); return; }
    c.big.textContent = f.int(n.klinik + n.kecantikan);
    c.big.title = null;
    if (!(n.klinik + n.kecantikan)) { c.lines.appendChild(emptyFilter()); return; }
    c.lines.appendChild(E('p', { class: 'hf-card__line', text: T.c2Line(kl ? f.int(n.klinik) : '—', kc ? f.int(n.kecantikan) : '—') }));
    var chain = V.by.klinik.concat(V.by.kecantikan).filter(function (r) { return !!r.chain; }).length;
    if (chain) c.lines.appendChild(E('p', { class: 'hf-card__line hf-card__line--quiet', title: H.FILTERS.jaringan.title, text: T.c2Chain(f.int(chain)) }));
  }
  function topRows(by) {
    var rows = V.rows.filter(function (r) { return r.play && (by !== 'rsBesar' || r.kind === 'rs'); });
    return H.sort(rows, by === 'rsBesar' ? 'rsBesar' : 'near', { dist: distSortVal }).slice(0, TOP_N);
  }
  function rowMeta(r) { var p = distText(distOf(r), 'cell'); return [H.words.kind(r), p.km && p.km !== '—' ? p.km + (p.min ? ' · ' + p.min : '') : null].filter(Boolean).join(' · '); }
  function renderTop(c) {
    if (!c || !V) return;
    var by = st.topSort === 'rsBesar' ? 'rsBesar' : 'near';
    c.head.textContent = T.c3;
    c.head.title = T.c3Title;
    c.sort.set(by);
    c.sw.sync();
    clear(c.list);
    var rows = topRows(by);
    rows.forEach(function (r) {
      var meta = rowMeta(r), b = E('button', { type: 'button', class: 'hf-mini__row', title: 'Buka ' + nameOf(r) + ' di peta' }, symChip(r),
        E('span', { class: 'hf-mini__txt' }, E('span', { class: 'hf-mini__name', text: nameOf(r) }), E('span', { class: 'hf-mini__meta', text: meta, title: distTip(distOf(r)) })));
      b.addEventListener('click', function () { focusRow(r, 'list'); });
      c.list.appendChild(E('li', {}, b));
    });
    if (!rows.length) c.list.appendChild(E('li', { class: 'hf-mini__empty', text: T.empty }));
  }

  /* ============================================================ Detail: the drawer "Daftar & grafik kesehatan" */

  function makeTabs(host, active, onChange, panel) {
    var items = TABS.map(function (t) { return { id: t.id, label: t.label }; });
    if (ctx && isFn(ctx.tabs)) {
      try { var t0 = ctx.tabs(host, { items: items, active: active, onChange: onChange, panel: panel, label: T.drawer }); if (t0 && t0.el) { if (!t0.el.parentNode) host.appendChild(t0.el); return t0; } } catch (e) { /* own tabs below */ }
    }
    var list = E('div', { class: 'hf-tabs', role: 'tablist', aria: { label: T.drawer } }), cur = active;
    var btns = items.map(function (t) {
      var b = E('button', { type: 'button', class: 'hf-tab', role: 'tab', id: 'hf-tab-' + t.id, aria: { selected: 'false', controls: 'hf-panel' }, attrs: { tabindex: '-1' }, text: t.label });
      b.addEventListener('click', function () { onChange(t.id); });
      list.appendChild(b);
      return b;
    });
    list.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) < 0) return;
      var ids = items.map(function (t) { return t.id; }), i = ids.indexOf(cur);
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
      onChange(ids[n]); btns[n].focus();
    });
    host.appendChild(list);
    var api = { el: list, set: function (id) { cur = id; btns.forEach(function (b, i) { var on = items[i].id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }, get: function () { return cur; } };
    api.set(active);
    return api;
  }
  function buildWork(host) {
    var w = {};
    w.tabHost = E('div', { class: 'hf-tabhost' });
    w.body = E('div', { class: 'hf-work__body', id: 'hf-panel', role: 'tabpanel' });
    w.tabsApi = makeTabs(w.tabHost, st.tab, function (id) { setTab(id); }, w.body);
    w.closeB = btn('Tutup', 'close', function () { openWork(false); }, 'btn--secondary btn--lg hf-work__close', 'Tutup daftar & grafik');
    w.head = E('header', { class: 'hf-work__head' }, E('div', { class: 'hf-work__titles' }, E('p', { class: 'hf-work__eyebrow', text: T.drawer }), E('p', { class: 'hf-work__lede', text: T.drawerLede })), E('div', { class: 'hf-work__tools' }, w.closeB));
    w.foot = E('footer', { class: 'hf-work__foot' }, link('Sumber data', function () { openSources(); }));
    w.el = E('aside', { class: 'hf-work panel panel--sheet', aria: { label: T.drawer }, attrs: { 'data-map-occluder': '', 'data-slideover': '', 'data-slideover-label': T.listBtn } }, w.head, w.tabHost, w.body, w.foot);
    host.appendChild(w.el);
    ui.work = w;
  }
  function setTab(id) { if (st.tab === id && ui.work && ui.work.current === id) return; st.tab = id; saveUi(); renderWork(true); }
  /** goTab(id, how?): how 'half' opens the drawer at half height (a landing state, V8 §2.5); else the list rule. */
  function goTab(id, how) {
    st.tab = TABS.some(function (t) { return t.id === id; }) ? id : 'rs';
    st.openHow = how === 'half' ? 'half' : null;
    saveUi();
    if (!isDeep()) { st.openOnMount = true; ctx.setView('deep'); return; }
    openWork(true, st.openHow || (st.tab === 'rs' || st.tab === 'klinik' ? 'list' : null));
    st.openHow = null;
    renderWork(true);
  }
  /**
   * The landing grammar of MCD.nav (V8 §2.5): health:tab:<tab>[:half[:<sort>]]. An unknown tab opens Rumah sakit, an
   * unknown drawer part or sort is ignored (the remembered sort stays).
   */
  function land(tab, drawer, sort) {
    var t = TABS.some(function (x) { return x.id === tab; }) ? tab : 'rs';
    if (sort && (t === 'rs' || t === 'klinik') && H && H.SORTS) {
      var ok = (H.SORTS[t] || []).some(function (x) { return x.v === sort; });
      if (ok) { if (t === 'rs') st.sortRs = sort; else st.sortKl = sort; }
    }
    goTab(t, drawer === 'half' ? 'half' : null);
  }
  function listDrawer() {
    var I0 = MCD.inst;
    if (I0 && isFn(I0.listDrawerState)) { try { var s0 = I0.listDrawerState(); if (s0 === 'full' || s0 === 'half') return s0; } catch (e) { /* own rule below */ } }
    return (window.innerHeight || 0) > 0 && window.innerHeight <= 900 ? 'full' : 'half';
  }
  function openWork(on, how) {
    st.workOpen = !!on;
    syncWork();
    if (on && adopted()) { var W0 = WS(); try { if (W0 && isFn(W0.drawer) && isFn(W0.setDrawer) && W0.drawer() === 'peek') W0.setDrawer(how === 'list' ? listDrawer() : 'half'); } catch (e) { /* keeps its height */ } }
    if (on && ui.work) later(function () {
      if (!ui || !ui.work) return;
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
    document.body.classList.toggle('hf-work-open', !!st.workOpen);
    if (ctx) ctx.relayout();
    later(function () { if (ctx) { ctx.relayout(); if (ui && ui.work && ui.work.table && isFn(ui.work.table.resize)) ui.work.table.resize(); } }, 340);
  }
  var BUILD = { rs: function (b) { buildList(b, 'rs'); }, klinik: function (b) { buildList(b, 'klinik'); }, kec: function (b) { buildKecTab(b); }, jaringan: function (b) { buildChains(b); }, pipe: function (b) { buildPipe(b); } };
  var RENDER = { rs: function () { renderList(); }, klinik: function () { renderList(); }, kec: function () { renderKecTab(); }, jaringan: function () { renderChains(); }, pipe: function () { renderPipe(true); } };
  function dropPanel() {
    var w = ui.work;
    (w.handles || []).forEach(function (h) { try { h.destroy(); } catch (e) { /* ignore */ } });
    w.handles = [];
    if (w.table && isFn(w.table.destroy)) { try { w.table.destroy(); } catch (e) { /* ignore */ } }
    w.table = null; w.list = w.kec = w.chains = w.pipe = null;
  }
  function renderWork(force) {
    var w = ui && ui.work;
    if (!w) return;
    if (!BUILD[st.tab]) st.tab = 'rs';
    if (w.tabsApi && isFn(w.tabsApi.set)) w.tabsApi.set(st.tab);
    if (w.current !== st.tab || force === true) {
      dropPanel(); clear(w.body);
      w.current = st.tab; w.body.scrollTop = 0;
      if (!H.ready() && st.tab !== 'pipe') { var box = E('div', { class: 'hf-load' }); renderLoad(box); w.body.appendChild(box); return; }
      BUILD[st.tab](w.body);
    }
    if (!H.ready() && st.tab !== 'pipe') return;
    RENDER[st.tab]();
  }
  function panelChart(kind, el, data, cfg) {
    var Ch = MCD.charts, h = null;
    if (Ch && isFn(Ch[kind])) { try { h = Ch[kind](el, data, cfg); } catch (e) { h = null; } }
    if (h) ui.work.handles = (ui.work.handles || []).concat([h]);
    return h;
  }

  /* ---- Rumah sakit and Klinik (H13: "Prioritas merchant" first, the divider, then the rest) */

  function buildList(body, tab) {
    var s = { tab: tab }, sorts = H.SORTS[tab === 'rs' ? 'rs' : 'klinik'];
    s.ex = exhibit({ eyebrow: tab === 'rs' ? 'Rumah sakit' : 'Klinik', cls: 'hf-ex--fill' });
    s.sortSel = E('select', { class: 'select hf-sortsel', aria: { label: 'Urutkan daftar' }, title: sorts[0].title || 'Urutkan daftar' }, sorts.map(function (o) { return E('option', { value: o.v, text: o.label, title: o.title || null }); }));
    s.sortSel.addEventListener('change', function () { if (tab === 'rs') st.sortRs = s.sortSel.value; else st.sortKl = s.sortSel.value; saveUi(); renderList(); });
    s.sw = distToggles();
    /* M3 (MOBILE_UX_PLAN): no capitals or "corrections" of place names on phone keyboards, a Cari key */
    s.q = E('input', { class: 'input hf-search__in', type: 'search', placeholder: 'Cari fasilitas', title: 'Cari menurut nama, jaringan atau kode RS', aria: { label: 'Cari fasilitas menurut nama, jaringan atau kode RS' }, value: st.q || '',
      attrs: { enterkeyhint: 'search', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off' } });
    s.q.addEventListener('input', debounce(function () { st.q = s.q.value; renderList(); }, 150));
    s.exportB = guard(btn(T.csv, 'download', function () { exportCsv(); }, 'btn--secondary btn--bar', T.csvTip));
    s.ex.el.insertBefore(E('div', { class: 'hf-tools hf-tools--list' }, E('label', { class: 'search hf-search' }, icon('search'), s.q),
      E('label', { class: 'hf-fg hf-fg--inline hf-sortf' }, E('span', { class: 'hf-fg__l', text: 'Urutkan' }), s.sortSel), s.sw.el, s.exportB), s.ex.body);
    s.off = E('div', { class: 'hf-empty', hidden: true });
    s.tableHost = E('div', { class: 'hf-table' });
    s.foot = note('');
    s.ex.body.appendChild(s.off); s.ex.body.appendChild(s.tableHost); s.ex.body.appendChild(s.foot);
    body.appendChild(s.ex.el);
    ui.work.list = s;
  }
  function tabRows(tab) { return tab === 'rs' ? V.by.rs : V.by.klinik.concat(V.by.kecantikan); }
  /** The shown rows of a list tab, sorted, with the divider row before the first row without merchant priority. */
  function listRows(tab) {
    var q = st.q ? H._fold(st.q) : '';
    var rows = tabRows(tab).filter(function (r) { return !q || H._fold(r.name).indexOf(q) >= 0 || (r.chain && H._fold(r.chain).indexOf(q) >= 0) || (r.kode && r.kode.indexOf(q) >= 0); });
    var sorted = H.sort(rows, tab === 'rs' ? st.sortRs : st.sortKl, { dist: distSortVal }), at = H.dividerAt(sorted);
    if (at >= 0) sorted.splice(at, 0, { _div: true, id: '__div', label: T.divNo });
    return sorted;
  }
  function listWidth(s) { return (s && s.tableHost && s.tableHost.clientWidth) || window.innerWidth || 1024; }
  function divCell(td, r, first) { if (first) td.appendChild(E('span', { class: 'hf-divrow', text: r.label })); }
  function nameCell(r, sub, phone) {
    return E('span', { class: 'hf-ent' + (phone ? ' hf-ent--phone' : ''), title: r.conf === 'rendah' ? 'Titik perkiraan dari alamat.' : null }, symChip(r, 'hf-ent__sym'),
      E('span', { class: 'hf-ent__txt' }, E('span', { class: 'hf-ent__name', text: nameOf(r), title: nameOf(r) }), E('span', { class: 'hf-ent__sub', text: sub, title: sub })));
  }
  function distCell(td, r) {
    var d = distOf(r), p = distText(d, 'cell');
    td.appendChild(E('span', { class: 'hf-num2', title: distTip(d) }, E('span', { class: 'hf-num2__a', text: p.km || '—' }), E('span', { class: 'hf-num2__b', text: p.min || '' })));
  }
  function renderList() {
    var s = ui.work && ui.work.list;
    if (!s || !V) return;
    var tab = s.tab, mode = distModeWords(), off = tab === 'rs' ? st.f.show.rs === false : (st.f.show.klinik === false && st.f.show.kecantikan === false);
    s.sortSel.value = tab === 'rs' ? st.sortRs : st.sortKl;
    s.sw.sync();
    clear(s.off);
    s.off.hidden = !off;
    s.tableHost.hidden = off;
    if (off) {
      s.off.appendChild(E('p', { text: tab === 'rs' ? T.rsOff : T.klOff }));
      s.off.appendChild(btn(tab === 'rs' ? T.rsOn : T.klOn, 'plus', function () { if (tab === 'rs') toggleShow('rs'); else { st.f.show.klinik = true; st.f.show.kecantikan = true; saveUi(); refresh(['filters']); } }, 'btn--ghost btn--bar'));
      s.ex.set(tab === 'rs' ? T.rsOff : T.klOff, '', T.src);
      return;
    }
    var rows = listRows(tab), n = rows.filter(function (r) { return !r._div; }).length, f = fm();
    var word = tab === 'rs' ? 'rumah sakit' : 'klinik', byW = { rsBesar: 'RS terbesar lebih dulu', near: 'terdekat dari KCP lebih dulu', kelas: 'kelas RS lebih dulu', nama: 'menurut nama' }[tab === 'rs' ? st.sortRs : st.sortKl];
    s.ex.set(st.q ? count(n, word) + ' cocok dengan “' + st.q + '”' : (n ? count(n, word) + ' dalam ' + st.km + ' km, ' + byW : T.empty),
      'Prioritas merchant lebih dulu · jarak dan waktu dari KCP, perkiraan' + (mode ? ' (' + mode + ')' : ''), T.src);
    s.foot.textContent = tab === 'rs' ? 'Ukuran RS dari tempat tidur SIRANAP, atau dari kelas RS bila laporan tidak ada atau belum lengkap.\nCSV memuat kontak lembaga dari register, tanpa status Livin’ Merchant.'
      : 'Klinik kesehatan dan klinik kecantikan menurut jenis yang menyala.\nCSV memuat kontak lembaga dari register, tanpa status Livin’ Merchant.';
    var tw = listWidth(s), narrow = tw < 520;
    s.narrow = narrow;
    var cols;
    if (narrow) {
      cols = [{ key: 'name', label: tab === 'rs' ? 'Rumah sakit' : 'Klinik', sortable: false, render: function (td, r) {
        if (r._div) return divCell(td, r, true);
        td.appendChild(nameCell(r, [H.words.sub(r), r.kind === 'rs' && r.kelas ? 'kelas ' + r.kelas : null, distShort(distOf(r))].filter(Boolean).join(' · '), true));
      } }];
    } else if (tab === 'rs') {
      cols = [
        { key: 'name', label: 'Nama', sortable: false, render: function (td, r) { if (r._div) return divCell(td, r, true); td.appendChild(nameCell(r, H.words.sub(r) + (r.chain ? ' · ' + r.chain : ''))); } },
        { key: 'kelas', label: 'Kelas', width: 60, sortable: false, align: 'center', headerTitle: H.FILTERS.kelas.title, render: function (td, r) { if (!r._div) td.appendChild(E('span', { class: 'hf-num2__a', text: r.kelas || '—' })); } },
        { key: 'tt', label: 'TT', width: 104, sortable: false, align: 'right', headerTitle: 'Tempat tidur (TT) yang dilaporkan ke SIRANAP.', render: function (td, r) {
          if (r._div) return;
          var b = H.words.beds(r);
          td.appendChild(E('span', { class: 'hf-num2', title: b.title }, E('span', { class: 'hf-num2__a', text: b.value }), E('span', { class: 'hf-num2__b', text: b.label === 'TT dilaporkan' ? 'TT dilaporkan' : H.words.size(r) })));
        } },
        { key: 'owner', label: 'Pemilik', width: 96, sortable: false, render: function (td, r) { if (!r._div) td.appendChild(E('span', { class: 'hf-cellt', text: H.words.ownerShort(r) })); } },
        { key: 'dist', label: mode ? 'Dari KCP (' + mode + ')' : 'Dari KCP', width: 112, sortable: false, align: 'right', headerTitle: T.distTip, render: function (td, r) { if (!r._div) distCell(td, r); } }
      ];
    } else {
      cols = [
        { key: 'name', label: 'Nama', sortable: false, render: function (td, r) { if (r._div) return divCell(td, r, true); td.appendChild(nameCell(r, [H.words.sub(r), r.tier ? H.words.tier(r).toLowerCase() : null].filter(Boolean).join(' · '))); } },
        { key: 'chain', label: 'Jaringan', width: 116, sortable: false, render: function (td, r) { if (!r._div) td.appendChild(E('span', { class: 'hf-cellt', text: r.chain || '—' })); } },
        { key: 'tel', label: 'Kontak', width: 76, sortable: false, headerTitle: 'Telepon lembaga dengan kode area.', render: function (td, r) {
          if (r._div || veil()) return;
          var c = H.contact(r);
          if (c.phone && c.phone.tel) td.appendChild(tag('Telepon', null, c.phone.display));
        } },
        V.hasLvm ? { key: 'lvm', label: 'Status LVM', width: 128, sortable: false, render: function (td, r) {
          if (r._div || !r.in15 || !r.play) return;
          var m = H.merchantLink(r, { ours: false }), w = T.mWord[m.state];
          if (m.state === 'acquired' || m.state === 'not_yet' || m.state === 'tanpa-peta') td.appendChild(tag(w, m.state === 'acquired' ? 'ok' : m.state === 'not_yet' ? 'bad' : null));
        } } : null,
        { key: 'dist', label: mode ? 'Dari KCP (' + mode + ')' : 'Dari KCP', width: 112, sortable: false, align: 'right', headerTitle: T.distTip, render: function (td, r) { if (!r._div) distCell(td, r); } }
      ].filter(Boolean);
    }
    var cfg = { columns: cols, rows: rows, rowKey: function (r) { return r.id; }, rowHeight: narrow ? 64 : (tab === 'rs' ? 48 : 40), virtual: 'auto', label: tab === 'rs' ? 'Rumah sakit yang tampil' : 'Klinik yang tampil',
      emptyText: st.q ? 'Tidak ada fasilitas yang cocok dengan pencarian ini. Kosongkan kolom cari.' : T.empty,
      onRow: function (r) { if (r && !r._div) { flyNext = true; ctx.select({ kind: 'health', id: r.id }); } }, onHover: function (r) { highlight(r && !r._div ? [r.id] : null, 2500); } };
    var Tb = MCD.charts && MCD.charts.table;
    if (isFn(Tb)) {
      if (!s.table) s.table = ui.work.table = Tb(s.tableHost, rows, cfg);
      else s.table.update(rows, cfg);
    } else {
      clear(s.tableHost);
      var ul = E('ul', { class: 'hf-plain' });
      rows.slice(0, 200).forEach(function (r) {
        if (r._div) { ul.appendChild(E('li', { class: 'hf-divrow', text: r.label })); return; }
        var b = E('button', { type: 'button', class: 'hf-plain__row', text: nameOf(r) + ' · ' + H.words.sub(r) });
        b.addEventListener('click', function () { cfg.onRow(r); });
        ul.appendChild(E('li', {}, b));
      });
      s.tableHost.appendChild(ul);
    }
  }
  function exportCsv() {
    var s = ui && ui.work && ui.work.list;
    if (!V || !s) return;
    if (MCD.demo && isFn(MCD.demo.blocks) && MCD.demo.blocks()) return;
    var rows = listRows(s.tab).filter(function (r) { return !r._div; });
    var csv = H.csv(rows, { veiled: veil(), dist: function (r) { var d = distOf(r); return d && d.source !== 'garis' && !d.pending ? { km: d.km, min: d.min } : null; } });
    var name = 'kesehatan_' + (s.tab === 'rs' ? 'rumah-sakit' : 'klinik') + '_cilangkap_' + ymd() + '.csv';
    toast(download(name, csv) ? name + ' tersimpan di komputer ini' + (veil() ? '. Kontak dikosongkan karena nama disamarkan.' : '') : 'File tidak dapat disimpan. Coba lagi.', null);
  }

  /* ---- Kecamatan */

  function buildKecTab(body) {
    var k = {};
    k.ex = exhibit({ eyebrow: 'Kecamatan' });
    k.by = seg('Jenis yang dihitung', [{ v: 'semua', label: T.all }, { v: 'rs', label: 'Rumah sakit' }, { v: 'klinik', label: 'Klinik kesehatan' }, { v: 'kecantikan', label: 'Klinik kecantikan' }], function (v) { st.kecBy = v; renderKecTab(); }, 'hf-rchips--kec', 'chips');
    k.top = seg('Kecamatan yang ditampilkan', [{ v: 'top', label: TOP_KEC + ' teratas' }, { v: 'all', label: T.all }], function (v) { st.kecAll = v === 'all'; renderKecTab(); });
    k.ex.el.insertBefore(E('div', { class: 'hf-tools' }, k.by.el, k.top.el), k.ex.body);
    k.host = E('div', { class: 'hf-chart' });
    k.ex.body.appendChild(k.host);
    body.appendChild(k.ex.el);
    ui.work.kec = k;
  }
  function kecVal(a, by) { return by === 'semua' ? a.total : a[by] || 0; }
  function kecParts(a) { var p = []; if (a.rs) p.push(a.rs + ' RS'); if (a.klinik + a.kecantikan) p.push(fm().int(a.klinik + a.kecantikan) + ' klinik'); return p.join(' · '); }
  function renderKecTab() {
    var k = ui.work && ui.work.kec;
    if (!k || !V) return;
    var by = st.kecBy, f = fm(), in15 = st.km === 30 ? H.counts({ km: 15, f: st.f }).kec : null;
    k.by.set(by); k.top.set(st.kecAll ? 'all' : 'top');
    var list = Object.keys(V.counts.kec).map(function (id) { return V.counts.kec[id]; }).filter(function (a) { return kecVal(a, by) > 0; })
      .sort(function (a, b) { return kecVal(b, by) - kecVal(a, by) || b.total - a.total || (a.id < b.id ? -1 : 1); });
    var lead = list[0], word = by === 'semua' ? 'fasilitas kesehatan' : by === 'rs' ? 'rumah sakit' : by === 'klinik' ? 'klinik kesehatan' : 'klinik kecantikan';
    k.ex.set(lead ? 'Kec. ' + kecShown(lead.id) + ' memiliki ' + word + ' terbanyak dari ' + count(list.length, 'kecamatan') + ' (' + f.int(kecVal(lead, by)) + ')' : T.empty,
      'Fasilitas per kecamatan dalam ' + st.km + ' km, dengan filter yang menyala.', T.src + ' · batas kecamatan © kontributor OpenStreetMap, BPS (2020)');
    var items = (st.kecAll ? list : list.slice(0, TOP_KEC)).map(function (a) {
      return { id: a.id, label: kecShown(a.id), value: kecVal(a, by), sub: [kecParts(a), H.kotaWord(a.id), in15 && in15[a.id] ? T.in15 : null].filter(Boolean),
        title: H.words.kotaBelum(a.id) ? 'Daftar klinik Kemenkes untuk wilayah ini belum dibaca. Klinik dari Dinkes DKI dan peta terbuka.' : null };
    });
    var data = { items: items, onSelect: function (it) { showKec(it.id); }, max: items.length, label: 'Kecamatan menurut ' + word, actionHint: 'Buka kecamatan di peta', emptyText: T.empty };
    if (k.chart && isFn(k.chart.update)) k.chart.update(data);
    else {
      k.chart = panelChart('rankedBars', k.host, data);
      if (!k.chart) { clear(k.host); items.forEach(function (it) { k.host.appendChild(link(it.label + ' · ' + f.int(it.value), function () { showKec(it.id); }, 'hf-plain__row')); }); }
    }
  }

  /* ---- Jaringan */

  function buildChains(body) {
    var c = {};
    c.ex = exhibit({ eyebrow: 'Jaringan' });
    c.list = E('div', { class: 'hf-chains' });
    c.ex.body.appendChild(c.list);
    c.ex.body.appendChild(note(T.chainNote));
    body.appendChild(c.ex.el);
    ui.work.chains = c;
  }
  function renderChains() {
    var c = ui.work && ui.work.chains;
    if (!c || !V) return;
    clear(c.list);
    var by = V.counts.byChain, names = Object.keys(by), f = fm();
    c.ex.set(count(names.length, 'jaringan') + ' dalam ' + st.km + ' km', 'Cabang jaringan menurut jenis. Pilih satu untuk menampilkan cabangnya saja.', T.src);
    [{ id: 'rs', label: 'Rumah sakit', n: function (b) { return b.rs; }, word: 'RS' }, { id: 'klinik', label: 'Klinik', n: function (b) { return b.klinik + b.kecantikan; }, word: 'klinik' }].forEach(function (g) {
      var list = names.map(function (n) { return by[n]; }).filter(function (b) { return g.n(b) > 0; }).sort(function (a, b) { return g.n(b) - g.n(a) || (a.name < b.name ? -1 : 1); });
      if (!list.length) return;
      c.list.appendChild(E('h4', { class: 'hf-h4', text: g.label }));
      list.forEach(function (b) {
        var on = st.f.chain === b.name;
        var r = E('button', { type: 'button', class: 'hf-chainrow' + (on ? ' is-on' : ''), aria: { pressed: on ? 'true' : 'false' }, text: T.chainRow(b.name, f.int(g.n(b)), g.word, st.km, H.fmtKm(b.nearKm)) });
        r.addEventListener('click', function () { if (on) { setChain(null); return; } setChain(b.name); goTab(g.id); });
        c.list.appendChild(r);
      });
    });
    c.list.appendChild(E('p', { class: 'hf-chainrow hf-chainrow--none', text: T.noChain(f.int(V.counts.noChain)) }));
  }

  /* ---- Tindak lanjut (MCD.health.pipeline: encrypted through MCD.seal, else memory only) */

  function P() { return H.pipeline; }
  function pipeAll() { try { return P().all() || {}; } catch (e) { return {}; } }
  function pipeGet(k) { try { return P().get(k); } catch (e) { return null; } }
  function pipeState() {
    var p = P(), s = 'memory', reason = null, Se = MCD.seal;
    try { s = isFn(p.status) ? p.status() : (p.persisted() ? 'ready' : 'memory'); } catch (e) { s = 'memory'; }
    try { reason = Se && isFn(Se.reason) ? Se.reason() : null; } catch (e) { reason = null; }
    if (s === 'ready' || s === 'loading') return { state: s, ok: true, text: 'Tersimpan di komputer ini.', title: T.sealed };
    if (s === 'old-password') return { state: s, text: 'Daftar tindak lanjut lama terenkripsi dengan kata sandi sebelumnya.', action: { label: 'Buka di Data & Privasi', run: function () { if (ctx) ctx.navigate('data', { view: 'deep', action: 'data:followups' }); } } };
    if (s === 'damaged') return { state: s, text: 'Daftar tindak lanjut di komputer ini rusak dan tidak dapat dibuka. Daftar baru dimulai.' };
    return { state: 'memory', text: reason === 'no-storage' ? T.blocked : reason === 'quota' ? T.quota : T.memLine };
  }
  function pipeStateEl(cls) {
    var s = pipeState(), el = E('div', { class: ['hf-pstate', s.ok ? 'is-ok' : 'is-warn', cls], title: s.title || null }, E('p', { text: s.text }));
    if (s.action) el.appendChild(btn(s.action.label, 'chev-r', s.action.run, 'btn--ghost btn--bar'));
    return el;
  }
  function buildPipe(body) {
    var p = {};
    p.ex = exhibit({ eyebrow: 'Tindak lanjut fasilitas kesehatan' });
    p.state = E('div', { class: 'hf-pstatehost' });
    p.barHost = E('div', { class: 'hf-chart hf-chart--bar' });
    p.steps = E('div', { class: 'hf-steps', role: 'list' });
    p.prodHost = E('div', { class: 'hf-tools hf-tools--prod' });
    p.list = E('div', { class: 'hf-plist' });
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
      ctx.confirm({ title: 'Ekspor daftar tindak lanjut fasilitas kesehatan', body: 'File ini tidak terenkripsi. Simpan hanya di komputer kantor.', ok: 'Ekspor (JSON)', cancel: 'Batal' }).then(function (yes) {
        if (!yes) return;
        var name = 'kesehatan-tindak-lanjut_cilangkap_' + ymd() + '.json', text = null;
        try { text = P().exportJson(); } catch (e) { text = null; }
        toast(text && download(name, text, 'application/json') ? name + ' tersimpan di komputer ini' : 'File tidak dapat disimpan. Coba lagi.', text ? null : 'warn');
      });
    }, 'btn--secondary btn--bar'));
    p.importB = btn('Impor (JSON)', 'upload', function () { p.file.click(); }, 'btn--secondary btn--bar');
    p.clearB = btn('Kosongkan daftar', 'close', function () {
      var n = Object.keys(pipeAll()).length;
      if (!n) return;
      ctx.confirm({ title: 'Kosongkan daftar tindak lanjut fasilitas kesehatan', body: count(n, 'entri') + ' beserta catatannya akan dihapus dari komputer ini. Salinan terenkripsi yang telah diunduh tidak berubah.', ok: 'Kosongkan daftar', cancel: 'Batal', danger: true })
        .then(function (yes) { if (yes) { try { P().clear(); } catch (e) { /* ignore */ } renderPipe(true); toast('Daftar tindak lanjut dikosongkan'); } });
    }, 'btn--ghost btn--bar');
    p.ex.el.insertBefore(E('div', { class: 'hf-tools' }, p.exportB, p.importB, p.clearB, p.file), p.ex.body);
    p.prod = seg('Produk sasaran', [{ v: '', label: 'Semua produk' }].concat(H.PRODUCTS.map(function (q) { return { v: q.id, label: q.short, title: q.label }; })), function (v) { st.pipeProd = v; renderPipe(true); }, 'hf-rchips--prod', 'chips');
    p.prodHost.appendChild(E('div', { class: 'hf-fg hf-fg--prod' }, E('span', { class: 'hf-fg__l', text: 'Produk sasaran' }), p.prod.el));
    [p.state, p.barHost, E('h4', { class: 'hf-h4', text: 'Per tahap' }), p.steps, E('h4', { class: 'hf-h4', text: 'Semua entri tindak lanjut' }), p.prodHost, p.list,
      note('Catatan kerja tanpa angka bank dan tanpa data pasien. Tahap “Aktif” hanya tanda kerja staf.')].forEach(function (n) { p.ex.body.appendChild(n); });
    buildSteps(p);
    body.appendChild(p.ex.el);
    ui.work.pipe = p;
  }
  function buildSteps(p) {
    var stages = H.stages();
    p.stepSig = stages.map(function (s) { return s.id; }).join('|');
    p.stepEls = {};
    clear(p.steps);
    stages.forEach(function (s) {
      var fill = E('i'), n = E('span', { class: 'hf-step__n', text: '0' });
      var b = E('button', { type: 'button', class: 'hf-step hf-step--' + (STAGE_TONE[s.id] || 'none'), aria: { pressed: 'false' }, title: 'Tampilkan tahap ' + s.label + ' saja' },
        E('span', { class: 'hf-step__l', text: s.label }), E('span', { class: 'hf-step__bar', aria: { hidden: 'true' } }, fill), n);
      b.addEventListener('click', function () { st.pipeStage = st.pipeStage === s.id ? '' : s.id; renderPipe(true); });
      p.steps.appendChild(E('div', { class: 'hf-step__li', role: 'listitem' }, b));
      p.stepEls[s.id] = { b: b, fill: fill, n: n };
    });
  }
  function renderPipe(force) {
    var p = ui && ui.work && ui.work.pipe;
    if (!p) return;
    var all = pipeAll(), keys = Object.keys(all), f = fm(), stages = H.stages();
    var sig = JSON.stringify([keys.length, keys.map(function (k) { return all[k].t; }), st.pipeStage, st.pipeProd, veil(), H.ready() ? 1 : 0, pipeState().state]);
    if (!force && p.sig === sig) return;
    p.sig = sig;
    clear(p.state); p.state.appendChild(pipeStateEl());
    var counts = {}, tone = { ok: 0, mid: 0, bad: 0, none: 0 };
    keys.forEach(function (k) { counts[all[k].stage] = (counts[all[k].stage] || 0) + 1; });
    stages.forEach(function (s) { tone[STAGE_TONE[s.id] || 'none'] += counts[s.id] || 0; });
    p.ex.set(keys.length ? count(keys.length, 'entri') + ' di daftar tindak lanjut, ' + f.int(counts.aktif || 0) + ' aktif' : 'Daftar tindak lanjut masih kosong',
      keys.length ? 'Jumlah entri per tahap · diisi staf cabang di komputer ini' : 'Tambahkan fasilitas dari kartunya dengan “+ Tindak lanjut”.', 'Sumber: catatan kerja cabang (lokal)');
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
    clear(p.list);
    function hasProd(k, id) { return (all[k].products || []).indexOf(id) >= 0; }
    p.prodHost.hidden = !keys.length;
    H.PRODUCTS.forEach(function (q) { p.prod.label(q.id, q.short + ' · ' + f.int(keys.filter(function (k) { return hasProd(k, q.id); }).length)); });
    p.prod.set(st.pipeProd || '');
    var shown = keys.filter(function (k) { return (!st.pipeStage || all[k].stage === st.pipeStage) && (!st.pipeProd || hasProd(k, st.pipeProd)); });
    if (!shown.length) { p.list.appendChild(E('p', { class: 'hf-empty-line', text: keys.length ? (st.pipeProd ? 'Tidak ada entri dengan produk sasaran ini.' : 'Tidak ada entri pada tahap ini.') : T.pipeEmpty })); return; }
    var known = H.ready() ? H.index().byId : null;
    function rowOf(k) {
      var e = all[k], gone = known && !known.has(k), label = veil() ? H.initials(e.label || k) : (e.label || k);
      var r = E('button', { type: 'button', class: 'hf-plist__row hf-plist__row--' + (STAGE_TONE[e.stage] || 'none') + (gone ? ' is-gone' : '') },
        E('span', { class: 'hf-plist__name', text: label + (gone ? ' · Tidak ada di data terbaru' : '') }),
        E('span', { class: 'hf-plist__meta', text: [veil() && e.owner ? H.initials(e.owner) : (e.owner || 'Belum ada penanggung jawab'), (e.products || []).map(H.productName).join(' · ') || 'belum ada produk', H.programName(e.program) || null].filter(Boolean).join(' · ') }),
        E('span', { class: 'hf-plist__next', text: e.nextStep ? e.nextStep + (e.nextDate ? ' · ' + f.date(e.nextDate) : '') : '' }));
      r.addEventListener('click', function () { if (!gone) openPipeKey(k); else toast('Fasilitas ini tidak ada di data terbaru. Entrinya tetap disimpan.', 'warn'); });
      return r;
    }
    stages.forEach(function (s) {
      var ks = shown.filter(function (k) { return all[k].stage === s.id && !(known && !known.has(k)); });
      if (!ks.length) return;
      p.list.appendChild(E('p', { class: 'hf-plist__g', text: s.label + ' · ' + ks.length }));
      ks.sort(function (a, b) { return (all[a].label || a) < (all[b].label || b) ? -1 : 1; }).forEach(function (k) { p.list.appendChild(rowOf(k)); });
    });
    var orphans = shown.filter(function (k) { return known && !known.has(k); });
    if (orphans.length) { p.list.appendChild(E('p', { class: 'hf-plist__g', text: 'Tidak ada di data terbaru · ' + orphans.length })); orphans.forEach(function (k) { p.list.appendChild(rowOf(k)); }); }
  }
  function openPipeKey(k) { var r = H.row(k); if (!r) { toast('Fasilitas ini tidak ada di data terbaru. Entrinya tetap disimpan.', 'warn'); return; } flyNext = true; ensureVisible(r); ctx.select({ kind: 'health', id: r.id }); }

  function openSources() {
    if (!ctx) return;
    drawerSel = null;
    var m = H.meta(), cov = (m && m.coverage) || {}, unplaced = 0, belum = [];
    Object.keys(cov.unplaced || {}).forEach(function (k) { if (/^rs /.test(k)) unplaced += +cov.unplaced[k] || 0; });
    Object.keys(cov.keslanByKota || {}).forEach(function (k) { if (cov.keslanByKota[k].status === 'belum') belum.push(k); });
    var body = [
      blk('Sumber data', [E('ul', { class: 'hf-bul' }, [
        'Kemenkes, SIRS Online: rumah sakit dengan kode RS, kelas dan pemilik.', 'Kemenkes, SIRANAP: tempat tidur yang dilaporkan.',
        'Kemenkes, Direktori Klinik dan Dinas Kesehatan DKI Jakarta (Satu Data Jakarta): klinik pratama dan klinik utama.',
        'OpenStreetMap dan Overture Maps: titik fasilitas dan klinik yang hanya ada di peta.'
      ].map(function (t) { return E('li', { text: t }); }))]),
      blk('Cakupan dan batas data', [E('ul', { class: 'hf-bul' }, [
        m ? T.kesNotRead(belum.length) : null, m ? T.unplaced(unplaced) : null, H.FILTERS.bpjs.none, H.words.beauty,
        'Pemilik klinik di luar DKI dibaca dari nama fasilitas, sehingga dapat keliru.', 'Tidak ada nama, telepon atau e-mail orang. Dashboard tidak memuat data pasien.'
      ].filter(Boolean).map(function (t) { return E('li', { text: t }); }))])
    ];
    ctx.openDrawer({ eyebrow: 'KESEHATAN', title: 'Sumber data dan cakupan', body: body, prov: T.srcFull });
  }

  /* ============================================================ the facility card (seven folds, H15) */

  function copyBtn(label, value, done) {
    var b = E('button', { type: 'button', class: 'hf-copy', aria: { label: label + ' ' + value }, title: label }, icon('copy'), E('span', { text: 'Salin' }));
    b.addEventListener('click', function () { copy(value).then(function () { toast(done); }, function () { toast('Fitur salin tidak tersedia di browser ini', 'warn'); }); });
    return b;
  }
  function crow(label, value) { return E('div', { class: 'hf-crow' }, E('span', { class: 'hf-crow__k', text: label }), E('div', { class: 'hf-crow__v' }, value)); }
  function kindSubLine(r) {
    if (r.kind === 'rs') return [String(r.sub || 'RS umum').replace(/^RS\b/, 'Rumah sakit'), r.kelas ? 'kelas ' + r.kelas : null].filter(Boolean).join(' · ');
    return [H.words.sub(r), r.tier ? H.words.tier(r).toLowerCase() : null].filter(Boolean).join(' · ');
  }
  function profilBlock(r) {
    var W = H.words, kids = [E('p', { class: 'hf-line hf-line--lead', text: kindSubLine(r) })], b = W.beds(r);
    if (r.kind === 'rs') { kids.push(E('p', { class: 'hf-line', text: b.line, title: b.title })); kids.push(note(W.sizeLine(r))); }
    if (r.kind === 'kecantikan') kids.push(note(W.beauty));
    if (r.rawatInap) kids.push(E('p', { class: 'hf-line', text: T.rawatInap }));
    kids.push(E('p', { class: 'hf-line', text: W.owner(r) + (r.play ? '' : ' · tanpa prioritas merchant') }));
    if (W.ownerNote(r)) kids.push(note(W.ownerNote(r)));
    if (r.chain) kids.push(E('p', { class: 'hf-line', text: T.chainLine(r.chain), title: H.FILTERS.jaringan.title }));
    var rs = r.rsId ? H.row(r.rsId) : null;
    if (rs) kids.push(E('div', { class: 'hf-rslink' }, link(T.rsLink(nameOf(rs)), function () { openRow(rs); }, 'hf-rslink__b', 'Buka kartu rumah sakit ini'), note(T.rsLinkLine)));
    if (r.addr && !veil()) kids.push(kv('Alamat', r.addr));
    var pv = r.kind === 'rs' ? [r.sub, r.kelas ? 'kelas ' + r.kelas : null, b.short].filter(Boolean).join(' · ') : kindSubLine(r);
    return blk(T.folds.profil, kids, 'hf-dd--profil', { id: 'profil', preview: pv, open: true });
  }
  function peluangBlock(r) {
    var kids = [], plays = H.plays(r), f = fm();
    plays.forEach(function (p) {
      var logos = (p.logos || []).map(function (k) { return logo(k, 'hf-logo--sm'); });
      kids.push(E('div', { class: 'hf-prod' + (p.id === 'nonplay' ? ' is-none' : '') }, E('p', { class: 'hf-prod__h' }, E('b', { text: p.label }), logos.length ? E('span', { class: 'hf-prodlogos' }, logos) : null), E('p', { class: 'hf-prod__t', text: p.text })));
      var progs = H.programmes(p.programs);
      if (progs.length) kids.push(E('ul', { class: 'hf-progs' }, progs.map(function (g) { return E('li', { class: 'hf-prog' }, E('b', { text: g.label }), E('span', { text: ' · berlaku sampai ' + f.date(g.end) })); })));
    });
    if (r.play) kids.push(note(H.PLAY_FOOT));
    var n = plays.filter(function (p) { return p.id !== 'chain'; }).length;
    return blk(T.folds.peluang, kids, 'hf-dd--peluang', { id: 'peluang', preview: r.play ? n + ' peluang · ' + H.PLAY_PREVIEW[r.kind] : 'Tanpa prioritas merchant', open: true });
  }
  /** Kontak (§4.10): links only through telHref (D18) and webLink (D17); nothing while "Samarkan nama" is on (V6 D7). */
  function kontakBlock(r) {
    var c = H.contact(r, { veiled: veil() }), kids = [];
    if (c.veiled) kids.push(note(T.veiledContact, 'is-strong'));
    else if (c.none) { kids.push(note(T.noContact)); if (c.clinic) kids.push(note(T.mobileNote)); }
    else {
      var ph = c.phone;
      kids.push(crow('Telepon', ph ? E('span', { class: 'hf-phone' },
        ph.tel ? E('a', { href: ph.tel, class: 'hf-tel', title: T.telTip, text: ph.display }) : E('span', { class: 'hf-tel is-plain', text: ph.display }),
        ph.noArea ? tag(T.noArea, null, T.noAreaTip) : null, ph.mobile ? tag(T.mobile, null, T.mobileTip) : null, copyBtn('Salin nomor telepon', ph.display, T.telDone))
        : E('span', { class: 'hf-muted', text: T.noTel })));
      if (!c.clinic) {
        kids.push(crow('E-mail', c.email ? E('span', { class: 'hf-code' }, E('a', { href: 'mailto:' + c.email.value, class: 'hf-mail', title: T.mailTip, text: c.email.value }), copyBtn('Salin alamat e-mail', c.email.value, T.mailDone))
          : E('span', { class: 'hf-muted', text: c.emailDropped ? T.mailDropped : T.noMail })));
      }
      var w = c.web, wv;
      if (w && w.link) {
        wv = E('span', { class: 'hf-webv' }, extLink(w.url, w.host, T.webTip, 'hf-web', 'Situs resmi ' + w.host + ', terbuka di tab baru'),
          w.redirected ? note(T.webMoved) : null, w.unchecked ? note(T.webUnchecked) : null, w.https ? null : note(T.webHttp));
      } else if (w && w.check === 'gagal') wv = E('span', { class: 'hf-webv' }, E('span', { class: 'hf-mono', text: w.host }), note(T.webFailed));
      else wv = E('span', { class: 'hf-muted', text: c.webDropped ? T.webDropped : T.noWeb });
      kids.push(crow(w && (w.social || w.unchecked) ? T.webSocial : 'Situs resmi', wv));
      if (c.clinic) kids.push(note(T.mobileNote));
    }
    return blk(T.folds.kontak, kids, 'hf-dd--kontak', { id: 'kontak', preview: c.veiled ? 'Disembunyikan' : c.phone ? c.phone.display : 'Belum tercatat', open: false });
  }
  function ruteBlock(r) {
    var d = distOf(r), kids = [], W = H.words, sel = MCD.state && MCD.state.get ? MCD.state.get().selection : null;
    var on = !!(sel && sel.kind === 'health' && String(sel.id) === r.id);
    var pending = !!(d && d.pending), garis = !d || d.source === 'garis';
    kids.push(E('p', { class: 'hf-line hf-line--lead', title: distTip(d), text: pending ? 'Menghitung jarak…' : garis ? T.straight(H.fmtKm(r.distKm)) : distText(d) }));
    kids.push(distToggles().el);
    var kel = W.kelName(r.kelId), kec = W.kecName(r.kecId);
    if (kec) kids.push(kv('Wilayah', (kel ? 'Kel. ' + kel + ' · ' : '') + 'Kec. ' + kec + (W.kotaWord(r.kecId) ? ' · ' + W.kotaWord(r.kecId) : '')));
    kids.push(note(W.geo(r), r.conf === 'rendah' ? 'is-strong' : null));
    var rl = veil() ? null : routeUrl(r.lon, r.lat);
    kids.push(E('div', { class: 'hf-actions' }, on ? E('span', { class: 'hf-rt__on', text: T.routeOn }) : btn(T.routeShow, 'map', function () { openRow(r); }, 'btn--secondary btn--bar'),
      btn(T.zoomTo, 'target', function () { var M = MCD.map; if (M && isFn(M.flyTo)) M.flyTo({ center: [r.lon, r.lat], zoom: 16 }); }, 'btn--secondary btn--bar'),
      rl ? E('a', { class: 'btn btn--secondary btn--bar gmaps-link gmaps-link--route', href: rl, target: '_blank', rel: 'noopener noreferrer', attrs: { referrerpolicy: 'no-referrer' }, title: T.routeTip }, icon('external'), E('span', { text: T.route })) : null));
    return blk(T.folds.rute, kids, 'hf-dd--rute', { id: 'rute', preview: garis ? H.fmtKm(r.distKm) + ' garis lurus' : distShort(d), open: false });
  }
  /** Merchant terkait (§5): the status of the facility's own public listing, read through MCD.lvm only. */
  function merchantBlock(r) {
    var m = H.merchantLink(r), kids = [], R = null, demo = m.demo || demoOn();
    try { R = MCD.lvm && isFn(MCD.lvm.result) ? MCD.lvm.result() : null; } catch (e) { R = null; }
    var head = [];
    /* V8 final fix: a merchant the branch already serves is never labelled "Potensi" (no LVM file: the chip
       "Merchant KCP Cilangkap" alone, in the status colour of an acquired merchant) */
    var oursOnly = !!(m.ours && m.state === 'potensi');
    if (m.state === 'potensi' && !oursOnly) head.push(tag(T.mWord.potensi, 'potential'));
    if (m.state === 'acquired') head.push(tag(T.mWord.acquired, 'ok'));
    if (m.state === 'not_yet') head.push(tag(T.mWord.not_yet, 'bad', T.notYetTip));
    if (m.ours) head.push(tag(T.mWord.ours, oursOnly ? 'ok' : null, T.oursTip));
    if (head.length && demo && (m.state === 'acquired' || m.state === 'not_yet')) head.push(tag('CONTOH', 'demo', 'Data contoh, bukan data cabang.'));
    if (head.length) kids.push(E('p', { class: 'hf-tags' }, head));
    if (T.m[m.state]) kids.push(note(T.m[m.state]));
    if (m.status) {
      var s = m.status;
      if (m.state === 'acquired') {
        if (s.active != null) kids.push(E('p', { class: 'hf-line', text: s.active ? T.m.active : T.m.inactive }));
        if (s.ownBranch != null) kids.push(E('p', { class: 'hf-line', text: s.ownBranch ? T.m.own : T.m.other }));
      }
      if (s.edc) kids.push(E('p', { class: 'hf-line', text: s.edc.active === false ? T.m.edcOff : T.m.edcOn }));
      else if (R && R.hasEdc) kids.push(E('p', { class: 'hf-line', text: T.m.edcNone }));
    }
    if (m.guess) kids.push(E('div', { class: 'hf-guess' }, E('p', { class: 'hf-tags' }, tag(T.mWord.guess, 'mid')), note(T.m.guess), veil() ? null : E('p', { class: 'hf-line', text: m.guess.name })));
    if (m.poi != null && m.poi >= 0) kids.push(E('div', { class: 'hf-actions' }, link(T.m.go, function () { if (MCD.app && isFn(MCD.app.focus)) MCD.app.focus({ section: 'merchants', kind: 'poi', id: String(m.poi), lon: r.lon, lat: r.lat }); }, 'hf-go', 'Buka usaha ini di bagian Merchant')));
    return blk(T.folds.merchant, kids, 'hf-dd--merchant', { id: 'merchant', preview: oursOnly ? T.mWord.ours : (T.mWord[m.state] || '—'), open: false });
  }
  function sumberBlock(r) {
    var W = H.words, kids = [], srcs = W.sources(r);
    if (r.kind === 'rs' && r.kode) kids.push(crow(T.kodeRs, E('span', { class: 'hf-code' }, E('span', { class: 'hf-mono', text: r.kode }), copyBtn('Salin kode RS', r.kode, T.kodeDone))));
    else kids.push(crow(T.dataId, E('span', { class: 'hf-mono', text: r.id, title: T.dataIdTip })));
    if (r.ownerReg) kids.push(kv(T.ownerReg, r.ownerReg));
    kids.push(kv(T.geoSrc, W.geoSrc(r)));
    kids.push(E('div', { class: 'hf-srcs' }, E('p', { class: 'hf-fg__l', text: T.sources + ':' }), E('ul', { class: 'hf-bul' }, srcs.map(function (s) { return E('li', { text: s.text, title: s.title }); }))));
    if (W.mapOnly(r)) kids.push(note(W.mapOnlyLine));
    if (r.kind === 'kecantikan') kids.push(note(W.beauty));
    if (W.coverage(r)) kids.push(note(W.coverage(r), 'is-strong'));
    W.attribution(r).forEach(function (t) { kids.push(note(t)); });
    var pv = (r.kind === 'rs' && r.kode ? 'Kode RS ' + r.kode + ' · ' : '') + W.srcShort(r);
    return blk(T.folds.sumber, kids, 'hf-dd--sumber', { id: 'sumber', preview: pv, open: false });
  }
  function pipelineEditor(key, label) {
    var p = P(), cur0 = pipeGet(key) || {};
    var stage = E('select', { class: 'select', aria: { label: 'Tahap' } }, H.stages().map(function (s) { return E('option', { value: s.id, text: s.label }); }));
    stage.value = cur0.stage || 'baru';
    var ownerIn = E('input', { class: 'input', type: 'text', maxlength: 60, placeholder: 'Kode atau nama staf', value: cur0.owner || '', aria: { label: 'Penanggung jawab' } });
    var running = H.programmes(['lvm-mdr', 'lvm-melaju', 'kur-2026']).map(function (g) { return g.id; });
    var prog = E('select', { class: 'select', aria: { label: 'Program' } }, H.PROGRAMS.filter(function (x) { return !x.id || running.indexOf(x.id) >= 0 || x.id === cur0.program; }).map(function (x) { return E('option', { value: x.id, text: x.label }); }));
    prog.value = cur0.program || '';
    var prods = E('div', { class: 'hf-checks', role: 'group', aria: { label: 'Produk sasaran' } });
    var boxes = H.PRODUCTS.map(function (x) {
      var cb = E('input', { type: 'checkbox', value: x.id });
      cb.checked = (cur0.products || []).indexOf(x.id) >= 0;
      prods.appendChild(E('label', { class: 'hf-check', title: x.label }, cb, E('span', { text: x.short }), x.id === 'LVM' ? logo('qris', 'hf-logo--xs') : null));
      return cb;
    });
    var next = E('input', { class: 'input', type: 'text', maxlength: 120, placeholder: 'Langkah berikutnya', value: cur0.nextStep || '', aria: { label: 'Langkah berikutnya' } });
    var nextDate = E('input', { class: 'input', type: 'date', value: cur0.nextDate || '', aria: { label: 'Tanggal langkah berikutnya' } });
    var last = E('input', { class: 'input', type: 'date', value: cur0.lastContact || '', aria: { label: 'Kontak terakhir' } });
    var noteIn = E('textarea', { class: 'input hf-ta', maxlength: 500, rows: 3, placeholder: T.notePh, aria: { label: 'Catatan' } });
    noteIn.value = cur0.note || '';
    var msg = E('p', { class: 'hf-pmsg', aria: { live: 'polite' } });
    var save = btn(pipeGet(key) ? 'Simpan' : 'Tambahkan ke tindak lanjut', 'check', function () {
      var res;
      try {
        res = p.set(key, { stage: stage.value, owner: ownerIn.value, program: prog.value, nextStep: next.value, nextDate: nextDate.value, lastContact: last.value, note: noteIn.value,
          products: boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }) }, { label: label });
      } catch (e) { res = { ok: false, error: 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' }; }
      msg.textContent = res && res.ok ? (pipeState().ok ? 'Tersimpan di komputer ini · ' : '') + H.stageLabel(res.entry.stage) : (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.';
      msg.classList.toggle('is-warn', !(res && res.ok));
      if (res && res.ok) { var t = save.querySelector('span'); if (t) t.textContent = 'Simpan'; if (!rm.parentNode) acts.appendChild(rm); afterPipe(); }
    }, 'btn--primary btn--bar');
    var rm = btn('Hapus', 'close', function () { try { p.remove(key); } catch (e) { /* ignore */ } msg.textContent = 'Dihapus dari daftar tindak lanjut'; afterPipe(); }, 'btn--ghost btn--bar');
    function fl(lbl, ctl) { return E('label', { class: 'hf-pf' }, E('span', { class: 'hf-pf__l', text: lbl }), ctl); }
    var acts = E('div', { class: 'hf-actions' }, save, pipeGet(key) ? rm : null);
    var block = blk(T.folds.pipe, [pipeStateEl('hf-pstate--card'),
      E('div', { class: 'hf-pgrid' }, fl('Tahap', stage), fl('Penanggung jawab', ownerIn), fl('Program', prog), fl('Tanggal langkah berikutnya', nextDate), fl('Kontak terakhir', last)),
      fl('Langkah berikutnya', next), E('div', { class: 'hf-pf' }, E('span', { class: 'hf-pf__l', text: 'Produk sasaran' }), prods), fl('Catatan', noteIn), msg, acts
    ], 'hf-dd--pipe', { id: 'pipe', preview: cur0.stage ? H.stageLabel(cur0.stage) : '—', open: false });
    block.setAttribute('data-pipe-key', key);
    if (building !== 'pin') pipeEds[key] = { el: block, sync: function () {
      var c = pipeGet(key);
      if (!c) return;
      stage.value = c.stage || 'baru';
      var t = save.querySelector('span'); if (t) t.textContent = 'Simpan';
      if (!rm.parentNode) acts.appendChild(rm);
      msg.textContent = (pipeState().ok ? 'Tersimpan di komputer ini · ' : '') + H.stageLabel(c.stage);
      msg.classList.remove('is-warn');
    } };
    return block;
  }
  function afterPipe() { if (ui && ui.work && ui.work.pipe) renderPipe(true); }
  function doneOf(key, entry) {
    var s = pipeState();
    return { label: '✓ Di tindak lanjut', text: s.ok ? 'Tersimpan di komputer ini · ' + H.stageLabel(entry && entry.stage) : s.text, title: s.ok ? T.sealed : null, editLabel: 'Ubah', edit: function () { return editPipe(key); } };
  }
  function pipeQuick(r) {
    var key = r && H.keyOk(r.id) ? r.id : null;
    var q = { id: 'pipe', label: T.addPipe, title: key ? 'Tambahkan fasilitas ini ke daftar tindak lanjut. ' + (pipeState().ok ? T.sealed : T.memLine) : H.MSG.noKey,
      run: function () { return quickAdd(key, r ? r.name : ''); }, edit: function () { return editPipe(key); } };
    if (!key) { q.disabled = true; return q; }
    var cur = pipeGet(key);
    if (cur) q.done = doneOf(key, cur);
    return q;
  }
  function quickAdd(key, label) {
    if (!key) return { ok: false, text: H.MSG.noKey };
    var res = null;
    try { res = P().quickAdd(key, label); } catch (e) { res = null; }
    if (!res || !res.ok) return { ok: false, text: (res && res.error) || 'Daftar tindak lanjut tidak dapat disimpan di komputer ini.' };
    var rec = pipeEds[key];
    if (rec && isFn(rec.sync)) { try { rec.sync(); } catch (e) { /* ignore */ } }
    afterPipe();
    var d = doneOf(key, res.entry);
    return { ok: true, text: d.text, done: d, warn: !pipeState().ok };
  }
  function editPipe(key) {
    var el = null, list = document.querySelectorAll('.hf-dd--pipe') || [];
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
  /** "+ Rencana kunjungan" (H20): MCD.plan.quick with the coordinates-only stop; null until plan.js knows 'kesehatan'. */
  function planQuick(r) {
    var Pl = MCD.plan;
    if (!Pl || !isFn(Pl.quick) || !r) return null;
    var rs = r.rsId ? H.row(r.rsId) : null;
    try {
      if (rs && isFn(Pl.has) && Pl.has(rs.id)) return { id: 'plan', label: T.planWith(nameOf(rs)), title: T.planWithTip(nameOf(rs)), disabled: true, run: function () { return { ok: false, text: T.planWithTip(nameOf(rs)) }; } };
      return Pl.quick(H.planStop(r)) || null;
    } catch (e) { return null; }
  }
  /** Callout and card head (≤ 2 chips, ≤ 3 numbers; §4.5). */
  function brief(r) {
    var W = H.words, d = distOf(r), dp = distText(d, 'cell'), nums = [], chipsA = [symLabel(r)];
    var dist = dp.km && dp.km !== '—' ? { label: dp.min ? dp.min + ' dari KCP' : 'Dari KCP', value: dp.km, title: distShort(d) + '\n' + distTip(d) } : { label: 'Dari KCP', value: H.fmtKm(r.distKm), title: distTip(d) };
    if (r.kind === 'rs') {
      var b = W.beds(r);
      nums.push({ label: b.label, value: b.value, big: true, title: b.title });
      nums.push({ label: 'Kelas', value: r.kelas || '—', title: H.FILTERS.kelas.title });
      nums.push(dist);
      chipsA.push(r.play ? tag(W.size(r), null, W.sizeLine(r)) : tag(W.owner(r), 'none', T.noPlayTitle));
    } else {
      dist.big = true;
      nums.push(dist);
      nums.push({ label: 'Tingkat', value: W.tier(r), title: 'Tingkat klinik di register: pratama atau utama.' });
      nums.push({ label: 'Titik', value: W.exact(r) ? 'Tepat' : 'Perkiraan', title: W.geo(r) });
      if (!r.play) chipsA.push(tag(W.owner(r), 'none', T.noPlayTitle));
      else if (r.chain) chipsA.push(tag('Jaringan · ' + r.chain, null, H.FILTERS.jaringan.title));
    }
    return { numbers: nums, chips: chipsA.slice(0, 2), primary: null, note: r.conf === 'rendah' ? { text: 'Titik perkiraan dari alamat.', tone: 'none' } : null };
  }
  function trailCrumb(kid) { var nm = kecShown(kid); return { id: String(kid), label: nm, title: 'Kembali ke Kecamatan ' + nm, run: function () { openKec(String(kid)); } }; }
  function stackCrumb(key) { return { id: 'stack:' + key, label: T.stackCrumb, title: 'Kembali ke daftar fasilitas di titik ini', run: function () { openStack(key); } }; }
  function hfModel(r, o) {
    o = o || {};
    if (!r) return null;
    var body = [profilBlock(r), peluangBlock(r), kontakBlock(r), ruteBlock(r), merchantBlock(r),
      H.keyOk(r.id) ? pipelineEditor(r.id, r.name) : blk(T.folds.pipe, [note(H.MSG.noKey)], 'hf-dd--pipe', { id: 'pipe', preview: '—', open: false }), sumberBlock(r)];
    if (o.fold) body.forEach(function (b) { if (b.getAttribute('data-fold') === o.fold) b.setAttribute('data-open', '1'); });
    var b = brief(r);
    return {
      kind: 'hf', key: 'hf:' + r.id, chipKind: r.kind === 'rs' ? 'RS' : 'KLINIK',
      eyebrow: H.words.eyebrow(r), title: nameOf(r), tags: b.chips.map(function (n) { return n.cloneNode(true); }), body: body,
      gmaps: veil() ? null : { lat: r.lat, lon: r.lon }, prov: T.srcFull, brief: b, quick: [pipeQuick(r), planQuick(r)].filter(Boolean),
      crumb: o.stack ? stackCrumb(o.stack) : o.trail ? trailCrumb(o.trail) : null, anchor: [r.lon, r.lat], hints: []
    };
  }

  /* ---- identical points (H7) */

  function stackRows(key) {
    var ids = V && V.stacks.get(key);
    if (ids) return ids.map(function (id) { return H.row(id); }).filter(Boolean);
    return [];
  }
  function stackPoint(key) { var p = String(key).split(','); return p.length === 2 && isFinite(+p[0]) && isFinite(+p[1]) ? [+p[0], +p[1]] : null; }
  function stackModel(key) {
    var rows = stackRows(key);
    if (!rows.length) return null;
    var lead = H.stackLead(rows), n = { rs: 0, klinik: 0, kecantikan: 0 }, f = fm();
    rows.forEach(function (r) { n[r.kind]++; });
    var sorted = H.sort(rows.filter(function (r) { return r.kind === 'rs'; }), 'rsBesar').concat(H.sort(rows.filter(function (r) { return r.kind !== 'rs'; }), 'nama'));
    var list = E('div', { class: 'dd-list hf-kl', role: 'list', aria: { label: 'Fasilitas di titik ini' } });
    sorted.forEach(function (r) { list.appendChild(E('div', { role: 'listitem', class: 'hf-kl__li' }, listRow(r, function () { openInStack(r, key); }))); });
    var kel = H.words.kelName(lead.kelId), kec = H.words.kecName(lead.kecId);
    var lb = blk(T.stackEyebrow(rows.length), [list, note(T.stackNote)], 'hf-dd--klist', { id: 'daftar', preview: count(rows.length, 'fasilitas'), open: true });
    lb.classList.remove('dd-blk'); lb.classList.add('hf-kl-blk');
    var pt = stackPoint(key);
    return { kind: 'hfstack', key: 'hfstack:' + key, eyebrow: T.stackEyebrow(rows.length).toUpperCase(), title: kel ? 'Kel. ' + kel + ', Kec. ' + kec : 'Kec. ' + kec, body: [lb],
      gmaps: veil() || !pt ? null : { lat: pt[1], lon: pt[0] }, listFirst: true, prov: T.srcFull, anchor: pt, hints: [],
      brief: { numbers: [{ label: 'Rumah sakit', value: f.int(n.rs), big: true }, { label: 'Klinik', value: f.int(n.klinik) }, { label: 'Kecantikan', value: f.int(n.kecantikan) }],
        chips: [], primary: { label: T.stackOpen, run: function () { openStack(key, true); } }, note: { text: T.stackNote, tone: 'none' } } };
  }

  /* ============================================================ the kecamatan card (list first; §4.6) */

  function kecAgg(kid) { return (V && V.counts.kec[kid]) || { id: kid, rs: 0, klinik: 0, kecantikan: 0, total: 0, play: 0 }; }
  function kecShown(id) {
    var Tr = MCD.territory, nm = null;
    if (Tr && isFn(Tr.chipName)) { try { nm = Tr.chipName(String(id)); } catch (e) { nm = null; } }
    return nm || (H ? H.kecName(String(id)) : String(id));
  }
  function kecBrief(kid) {
    var a = kecAgg(kid), f = fm();
    return { numbers: [{ label: 'Fasilitas', value: f.int(a.total), big: true, title: count(a.total, 'fasilitas kesehatan') + ' dalam ' + st.km + ' km' },
      { label: 'Rumah sakit', value: f.int(a.rs) }, { label: 'Klinik kecantikan', value: f.int(a.kecantikan) }],
      chips: [], primary: { label: T.kecOpen, run: function () { openKec(kid); } }, note: null };
  }
  function kecAnchor(kid) {
    var Tr = territory(), A = admin(), b = null, rec = null;
    try { b = Tr && isFn(Tr.boundsOf) ? Tr.boundsOf(kid) : null; } catch (e) { b = null; }
    try { rec = A ? A.byId(kid) : null; } catch (e) { rec = null; }
    var lb = rec && Array.isArray(rec.label) ? [rec.label[0], rec.label[1]] : (b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : null);
    return b ? { bbox: b, label: lb } : lb;
  }
  function listRow(r, run) {
    var meta = [H.words.kind(r), distShort(distOf(r))].filter(Boolean).join(' · ');
    var b = E('button', { type: 'button', class: 'dd-list__row hf-kl__row has-sym' + (r.play ? '' : ' is-noplay'), title: 'Buka ' + nameOf(r) + ' di kartu ini' }, symChip(r),
      E('span', { class: 'dd-list__name', text: nameOf(r) }), E('span', { class: 'dd-list__meta', text: meta, title: distTip(distOf(r)) }));
    b.addEventListener('click', run);
    return b;
  }
  /** Hospitals by RS terbesar, then clinics by Terdekat dari KCP; play rows before the divider in each part. */
  function kecRows(kid) {
    var rows = V ? V.rows.filter(function (r) { return r.kecId === String(kid); }) : [];
    return { rs: H.sort(rows.filter(function (r) { return r.kind === 'rs'; }), 'rsBesar', { dist: distSortVal }), kl: H.sort(rows.filter(function (r) { return r.kind !== 'rs'; }), 'near', { dist: distSortVal }) };
  }
  function kecModel(kid, o) {
    o = o || {};
    if (!V) return null;
    var a = kecAgg(kid), f = fm(), listFirst = o.listFirst !== false, name = kecShown(kid), parts = kecRows(kid), kota = H.kotaWord(kid);
    var list = E('div', { class: 'dd-list hf-kl', role: 'list', aria: { label: 'Fasilitas di ' + name } }), shown = 0;
    [parts.rs, parts.kl].forEach(function (rows) {
      var at = H.dividerAt(rows);
      rows.forEach(function (r, i) {
        if (shown >= KL_MAX) return;
        if (i === at && at >= 0) list.appendChild(E('p', { class: 'hf-divrow', role: 'presentation', text: T.divNo }));
        list.appendChild(E('div', { role: 'listitem', class: 'hf-kl__li' }, listRow(r, function () { openInTrail(r, kid); })));
        shown++;
      });
    });
    var total = parts.rs.length + parts.kl.length, empty = [];
    if (!total) {
      if (st.km <= 15 && !filterCount()) empty.push(E('p', { class: 'hf-note' }, E('span', { text: (st.km === 15 ? T.kecEmpty15 : 'Tidak ada fasilitas kesehatan dalam ' + st.km + ' km di kecamatan ini.') + ' ' }), link(T.kecTo30, function () { setKm(30); if (ctx) ctx.select({ kind: 'hfKec', id: kid, extra: { kecamatanId: kid } }); })));
      else empty.push(note(filterCount() ? T.empty : 'Tidak ada fasilitas kesehatan dalam ' + st.km + ' km di kecamatan ini.'));
    }
    var lb = blk(T.kecList(name), [total ? list : null].concat(empty, [
      total > KL_MAX ? note('+' + (total - KL_MAX) + ' lainnya. Perbesar peta untuk melihat setiap fasilitas.') : null,
      H.words.kotaBelum(kid) ? note('Daftar klinik Kemenkes untuk wilayah ini belum dibaca. Klinik dari Dinkes DKI dan peta terbuka.', 'is-strong') : null,
      E('p', { class: 'hf-kl__foot' }, link(T.kecMore, function () { goTab('kec'); }, 'hf-kl__more', 'Buka tab Kecamatan di Daftar & grafik'))
    ]), 'hf-dd--klist', { id: 'daftar', preview: kecParts(a) || '—', open: true });
    if (listFirst) { lb.classList.remove('dd-blk'); lb.classList.add('hf-kl-blk'); }
    var figs = [kv('Fasilitas dalam ' + st.km + ' km', f.int(a.total)), kv('Rumah sakit', f.int(a.rs)), kv('Klinik kesehatan', f.int(a.klinik)), kv('Klinik kecantikan', f.int(a.kecantikan)),
      kv('Prioritas merchant', f.int(a.play), T.noPlayTitle), E('div', { class: 'hf-actions' }, btn('Perbesar ke kecamatan', 'target', function () { zoomKec(kid); }, 'btn--secondary btn--bar'))];
    var fb = blk('Angka kecamatan', figs, null, { id: 'angka', preview: kecParts(a) || '—', open: !listFirst });
    var kb = kecBrief(kid);
    if (listFirst) kb.primary = null;
    return { kind: 'kec', key: 'kec:' + kid, eyebrow: ('Kecamatan' + (kota ? ' · ' + kota : '')).toUpperCase(), title: name, body: listFirst ? [lb, fb] : [fb, lb],
      gmaps: { q: 'Kecamatan ' + name + (kota ? ', ' + kota : '') }, listFirst: listFirst, prov: T.src + '; batas kecamatan © kontributor OpenStreetMap, BPS (2020)', brief: kb, anchor: kecAnchor(kid), hints: [] };
  }
  function kecPopup(kid) {
    if (!V) return {};
    var a = kecAgg(kid), f = fm();
    return { rows: [{ label: 'Fasilitas dalam ' + st.km + ' km', value: f.int(a.total) }, { label: 'Rumah sakit', value: f.int(a.rs) }, { label: 'Klinik kesehatan', value: f.int(a.klinik) }, { label: 'Klinik kecantikan', value: f.int(a.kecantikan) }],
      big: { value: f.int(a.total), caption: 'Fasilitas' }, chip: null, demo: false, kind: 'kec', key: 'kec:' + kid, brief: kecBrief(kid), anchor: kecAnchor(kid), source: T.src };
  }

  /* ============================================================ map (§2) */

  function selNow() { return MCD.state && isFn(MCD.state.get) ? MCD.state.get().selection : null; }
  function selPoint(sel) {
    if (!sel || !H || !H.ready()) return null;
    if (sel.kind === 'health') { var r = H.row(sel.id); return r ? { lon: r.lon, lat: r.lat, row: r } : null; }
    if (sel.kind === 'hfStack') { var p = stackPoint(sel.id); return p ? { lon: p[0], lat: p[1] } : null; }
    return null;
  }
  function highlight(ids, ms) {
    clearTimeout(hlTimer);
    hl = ids && ids.length ? { set: new Set(ids), key: ids.slice(0, 8).join(',') + ':' + ids.length } : { set: null, key: '' };
    requestRender();
    if (hl.set) hlTimer = setTimeout(function () { highlight(null); }, ms || 6000);
  }
  function rgba(c, a) { return [c[0], c[1], c[2], a == null ? 255 : a]; }
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
  function tipRow(r) {
    if (!r) return null;
    var d = distOf(r), c = H.sym.rgb(r.kind, uiTheme()), lines = [{ glyph: r.kind === 'rs' ? 'none' : 'circle', rgb: c, text: H.words.kind(r) + ' · ' + H.words.sub(r) }];
    if (r.kind === 'rs') { var b = H.words.beds(r); lines.push({ kind: 'body', text: (b.value === '—' ? 'Tempat tidur tidak dilaporkan' : b.value + ' ' + (b.label === 'TT dilaporkan' ? 'TT dilaporkan' : 'tempat tidur')) + (r.kelas ? ' · kelas ' + r.kelas : '') }); }
    if (!r.play) lines.push({ text: H.words.owner(r) + ', tanpa prioritas merchant' });
    if (r.conf === 'rendah') lines.push({ text: 'Titik perkiraan dari alamat' });
    lines.push({ kind: 'meta', text: 'Jarak dari KCP · ' + distText(d) });
    lines.push({ kind: 'body', text: 'Klik untuk melihat detail' });
    return { eyebrow: H.words.eyebrow(r).toUpperCase(), title: nameOf(r), lines: lines };
  }
  function tipStack(s) { return { eyebrow: T.stackEyebrow(s.n).toUpperCase(), title: nameOf(s.lead), lines: [{ kind: 'body', text: T.stackNote }, { kind: 'meta', text: 'Klik untuk melihat daftar' }] }; }
  function tipCluster(c) { var t = T.clusterTip(fm().int(c.n), c.kind); return { eyebrow: 'KELOMPOK KLINIK', title: t, aria: t, lines: [] }; }
  function tipKec(kid) {
    if (!kid || !V) return null;
    var a = kecAgg(kid), lines = [];
    lines.push({ kind: 'body', text: a.total ? count(a.total, 'fasilitas kesehatan') + ' dalam ' + st.km + ' km' : 'Tidak ada fasilitas kesehatan dalam ' + st.km + ' km di kecamatan ini.' });
    if (a.total) lines.push({ text: kecParts(a) });
    lines.push({ kind: 'meta', text: 'Klik untuk melihat angkanya' });
    return { eyebrow: ('Kecamatan' + (H.kotaWord(kid) ? ' · ' + H.kotaWord(kid) : '')).toUpperCase(), title: kecShown(kid), lines: lines };
  }
  function terrStats() {
    if (!V) return null;
    if (V.terr) return V.terr;
    var kec = {};
    Object.keys(V.counts.kec).forEach(function (id) { var n = V.counts.kec[id].total; kec[id] = { potential: n, acquired: null, notYet: null, edc: null, unlisted: null, coverage: null, band: n ? 'potential' : 'noData', ranked: false }; });
    V.terr = { key: 'hf|' + V.sig, hasBank: false, demo: false, rule: 'known', bands: { ok: 0.5, mid: 0.2 }, categories: [], bandMode: 'relative', relative: { kecamatan: null, kelurahan: null },
      totals: { potential: V.rows.length }, kecamatan: kec, kelurahan: {} };
    return V.terr;
  }
  /** "Ciracas · 3 RS · 92 klinik" (zero parts left out; "klinik" = both clinic kinds shown). */
  function kecLabel(k) { var a = V && V.counts.kec[k.id], nm = kecShown(k.id) || k.chipName || k.name; return a && kecParts(a) ? nm + ' · ' + kecParts(a) : nm; }
  function terrLayers(out, ms) {
    var Tr = territory(), stats = terrStats();
    if (!Tr || !stats || !isFn(Tr.layers)) return;
    var res;
    try { res = Tr.layers({ id: 'health-terr', ms: ms, stats: stats, selected: st.selKec || null, outside: 'outline', pickable: true, labelText: function (k) { return kecLabel(k); }, labelKey: stats.key }); } catch (e) { return; }
    (res.base || []).forEach(function (L) {
      if (L && /-kec-fill$/.test(L.id) && isFn(L.clone) && L.props && L.props.mcd) L = L.clone({ mcd: Object.assign({}, L.props.mcd, { tooltip: function (o) { return o && o.kec ? tipKec(o.kec) : null; } }) });
      out.base.push(L);
    });
    (res.top || []).forEach(function (L) { out.top.push(L); });
  }
  function focusKecNow() { var f = focusedKec(); return f || st.selKec || null; }
  /**
   * What the map draws at a zoom quantum (memoised per view, quantum, grouping and selection): hospitals (never grouped),
   * clinics (all from zoom 13; below it the singles of the 64 px grid and the selected one), bubbles per kind, and the
   * identical points as one symbol each (below zoom 13 only among hospitals: clinics there count in their bubbles).
   */
  function drawModel(zc, low, selRow) {
    var co = coarse(), key = V.sig + '|' + zc + '|' + (low ? 1 : 0) + '|' + (selRow ? selRow.id : '') + '|' + (co ? 1 : 0);
    if (LM.key === key) return LM.m;
    var m = { rs: [], kl: [], stacks: [], bubbles: { klinik: [], kecantikan: [] }, kcDx: {} }, drawn = [];
    if (low) {
      var clinics = V.by.klinik.concat(V.by.kecantikan).filter(function (r) { return !selRow || r.id !== selRow.id; });
      var cl = H.cluster(clinics, zc, V.sig + '|' + (selRow ? selRow.id : ''));
      ['klinik', 'kecantikan'].forEach(function (k) { cl[k].forEach(function (c) { if (c.n > 1) m.bubbles[k].push(c); else { var r = H.row(c.ids[0]); if (r) drawn.push(r); } }); });
      if (selRow && selRow.kind !== 'rs') drawn.push(selRow);
      var byCell = {};
      m.bubbles.klinik.forEach(function (c) { byCell[c.id.split('|')[2]] = c; });
      m.bubbles.kecantikan.forEach(function (c) { var k = byCell[c.id.split('|')[2]]; var dx = k ? H.bubbleOffset(k, c, zc, co) : 0; if (dx) m.kcDx[c.id] = dx; });
      drawn = V.by.rs.concat(drawn);
    } else drawn = V.rows;
    var groups = new Map();
    drawn.forEach(function (r) { var k = H.stackKey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    groups.forEach(function (rows, k) {
      if (rows.length > 1) { var lead = H.stackLead(rows); m.stacks.push({ key: k, lead: lead, n: rows.length, lon: lead.lon, lat: lead.lat }); return; }
      (rows[0].kind === 'rs' ? m.rs : m.kl).push(rows[0]);
    });
    m.rs.sort(function (a, b) { return (V.specs.get(a.id).step === 'besar' ? 2 : V.specs.get(a.id).step === 'sedang' ? 1 : 0) - (V.specs.get(b.id).step === 'besar' ? 2 : V.specs.get(b.id).step === 'sedang' ? 1 : 0); });
    BUB = {};
    m.bubbles.klinik.concat(m.bubbles.kecantikan).forEach(function (c) { BUB[c.id] = c; });
    LM = { key: key, m: m };
    return m;
  }
  function clinicLabelsOk(rows, z) {
    if (z < 16 || !rows.length) return false;
    var M = MCD.map, map = null, b = null;
    try { map = M && isFn(M.getMap) ? M.getMap() : null; b = map && isFn(map.getBounds) ? map.getBounds() : null; } catch (e) { b = null; }
    if (!b || !isFn(b.contains)) return rows.length <= LBL_CLINIC_MAX;
    var n = 0;
    for (var i = 0; i < rows.length && n <= LBL_CLINIC_MAX; i++) { try { if (b.contains([rows[i].lon, rows[i].lat])) n++; } catch (e) { n++; } }
    return n <= LBL_CLINIC_MAX;
  }
  var RS_LABEL_Z = { besar: 12, sedang: 13, kecil: 14 };
  function mapLayers(derived, ms) {
    var D = window.deck, out = { base: [], top: [] };
    if (!D || !ms || !ms.kit || !H || !computeView()) return out;
    terrLayers(out, ms);
    var K = ms.kit, P0 = K.palette || {}, z = isNum(ms.zoom) ? ms.zoom : 11, zq = isNum(ms.zoomQ) ? ms.zoomQ : z, zc = Math.round(z * 2) / 2;
    var theme = ms.theme === 'day' ? 'day' : 'night', SY = H.sym, col = SY.colours(theme), co = coarse(), hs = hl.set, fk = focusKecNow();
    var low = z < H.CLUSTER_BELOW, sel = selNow(), selRow = sel && sel.kind === 'health' ? H.row(sel.id) : null;
    if (selRow && !V.ids.has(selRow.id)) selRow = null;
    var m = drawModel(zc, low, selRow), atlas = SY.atlas(theme), pos = function (r) { return [r.lon, r.lat]; };
    var alphaOf = function (r) { var a = r.conf === 'rendah' ? 140 : 255; if (fk && r.kecId !== fk) a = 38; if (hs && !hs.has(r.id)) a = Math.min(a, 60); return a; };
    var sizeOf = function (r) { return SY.px(V.specs.get(r.id), z, co); };
    var trig = [V.sig, zq, co ? 1 : 0], colTrig = [hl.key, fk || '', V.sig];
    var metaR = { kind: 'health', id: function (r) { return r.id; }, tooltip: function (r) { return tipRow(r); } };
    /* bubbles (below zoom 13): a glass disc, a 1,5 px ring in the kind's colour, the count (11 px, outlined in the glass
       colour); kecantikan adds a small sparkle. Sized by H.bubbleDiameter (zoom and pointer as the symbols), so every
       bubble stays smaller than RS kecil ("rs lebih besar", H6; V8 final fix). The counts sit with the bubbles, under
       the hospitals and under the kecamatan pills (they printed over both) */
    if (low) {
      var BB = H.BUBBLE || {}, bTrig = [zq, co ? 1 : 0], glass = rgba(col.bubble, 255);
      var w = 512 * Math.pow(2, zc);
      var kcPos = function (c) { var dx = m.kcDx[c.id] || 0; return [c.lon + dx / w * 360, c.lat]; };
      ['klinik', 'kecantikan'].forEach(function (k) {
        var data = m.bubbles[k];
        if (!data.length) return;
        out.base.push(new D.ScatterplotLayer({
          id: k === 'klinik' ? 'health-kl-bubbles' : 'health-kc-bubbles', data: data, getPosition: k === 'klinik' ? function (c) { return [c.lon, c.lat]; } : kcPos,
          radiusUnits: 'pixels', getRadius: function (c) { return H.bubbleRadius(c.n, z, co); }, filled: true, stroked: true, lineWidthUnits: 'pixels', getLineWidth: BB.ring || 1.5,
          getFillColor: col.bubble.slice(), getLineColor: rgba(col[k], 255), updateTriggers: { getPosition: [zc], getRadius: bTrig, getFillColor: [theme], getLineColor: [theme] },
          pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 50], beforeId: K.beforeId,
          mcd: { kind: 'hfCluster', id: function (c) { return c.id; }, tooltip: function (c) { return tipCluster(c); } }
        }));
      });
      if (m.bubbles.kecantikan.length && atlas && D.IconLayer) out.base.push(new D.IconLayer({
        id: 'health-kc-badge', data: m.bubbles.kecantikan, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping, getIcon: function () { return 'kecantikan'; },
        getPosition: kcPos, getSize: function (c) { return H.bubbleBadge(c.n, z, co); }, sizeUnits: 'pixels', getPixelOffset: function (c) { var r = H.bubbleRadius(c.n, z, co) * 0.72; return [r, -r]; },
        updateTriggers: { getPosition: [zc], getSize: bTrig, getPixelOffset: bTrig }, pickable: false, beforeId: K.beforeId
      }));
      var counts = m.bubbles.klinik.map(function (c) { return { c: c, p: [c.lon, c.lat] }; }).concat(m.bubbles.kecantikan.map(function (c) { return { c: c, p: kcPos(c) }; }));
      if (counts.length && ms.fontsReady !== false) out.base.push(new D.TextLayer({
        id: 'health-cluster-n', data: counts, getPosition: function (o) { return o.p; }, getText: function (o) { return o.c.n > 999 ? fm().num(o.c.n / 1000, 1) + ' rb' : String(o.c.n); },
        getSize: BB.text || 11, sizeUnits: 'pixels', fontFamily: K.fonts && K.fonts.sans, fontWeight: 600, characterSet: 'auto', getColor: rgba(col.count, 255),
        fontSettings: { sdf: true }, outlineWidth: 2, outlineColor: glass,
        getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getPosition: [zc], getColor: [theme] }, pickable: false, beforeId: K.beforeId, mcd: { keep: true }
      }));
    }
    /* symbols: clinics, then hospitals above them, then identical points (a symbol of the largest kind with its count) */
    var stackIcon = function (s) { return V.specs.get(s.lead.id).key; };
    if (atlas && D.IconLayer) {
      var icon0 = { iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping, sizeUnits: 'pixels', alphaCutoff: 0, pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 70], beforeId: K.beforeId };
      if (m.kl.length) out.base.push(new D.IconLayer(Object.assign({ id: 'health-klinik', data: m.kl, getIcon: function (r) { return V.specs.get(r.id).key; }, getPosition: pos, getSize: sizeOf,
        getColor: function (r) { return [255, 255, 255, alphaOf(r)]; }, updateTriggers: { getIcon: [V.sig, atlas.key], getSize: trig, getColor: colTrig }, mcd: metaR }, icon0)));
      if (m.rs.length) out.base.push(new D.IconLayer(Object.assign({ id: 'health-rs', data: m.rs, getIcon: function (r) { return V.specs.get(r.id).key; }, getPosition: pos, getSize: sizeOf,
        getColor: function (r) { return [255, 255, 255, alphaOf(r)]; }, updateTriggers: { getIcon: [V.sig, atlas.key], getSize: trig, getColor: colTrig }, mcd: metaR }, icon0)));
      if (m.stacks.length) out.base.push(new D.IconLayer(Object.assign({ id: 'health-stack', data: m.stacks, getIcon: stackIcon, getPosition: pos, getSize: function (s) { return sizeOf(s.lead); },
        getColor: function (s) { return [255, 255, 255, alphaOf(s.lead)]; }, updateTriggers: { getIcon: [V.sig, atlas.key], getSize: trig, getColor: colTrig },
        mcd: { kind: 'hfStack', id: function (s) { return s.key; }, tooltip: function (s) { return tipStack(s); } } }, icon0)));
    } else {
      [['health-klinik', m.kl], ['health-rs', m.rs]].forEach(function (x) {
        if (!x[1].length) return;
        out.base.push(new D.ScatterplotLayer({ id: x[0], data: x[1], getPosition: pos, radiusUnits: 'pixels', getRadius: function (r) { return sizeOf(r) / 2.2; }, filled: true, stroked: true,
          lineWidthUnits: 'pixels', getLineWidth: 1.2, getFillColor: function (r) { return rgba(col[r.kind], r.play ? alphaOf(r) : 0); }, getLineColor: function (r) { return r.play ? rgba(col.keyline, 230) : rgba(col[r.kind], 255); },
          updateTriggers: { getFillColor: colTrig, getRadius: trig }, pickable: true, autoHighlight: true, beforeId: K.beforeId, mcd: metaR }));
      });
      if (m.stacks.length) out.base.push(new D.ScatterplotLayer({ id: 'health-stack', data: m.stacks, getPosition: pos, radiusUnits: 'pixels', getRadius: function (s) { return sizeOf(s.lead) / 2.2; },
        filled: true, getFillColor: function (s) { return rgba(col[s.lead.kind], alphaOf(s.lead)); }, updateTriggers: { getRadius: trig }, pickable: true, beforeId: K.beforeId,
        mcd: { kind: 'hfStack', id: function (s) { return s.key; }, tooltip: function (s) { return tipStack(s); } } }));
    }
    if (m.stacks.length) out.base.push(new D.TextLayer({
      id: 'health-stack-n', data: m.stacks, getPosition: pos, getText: function (s) { return String(s.n); }, getSize: 11, sizeUnits: 'pixels', fontFamily: K.fonts && K.fonts.sans, fontWeight: 700, characterSet: 'auto',
      getColor: rgba(col.keyline, 255), background: true, getBackgroundColor: rgba(col.count, 235), backgroundPadding: [3, 1, 3, 1],
      getPixelOffset: function (s) { var px = sizeOf(s.lead) / 2; return [px * 0.7 + 4, -px * 0.7 - 3]; }, updateTriggers: { getPixelOffset: trig, getColor: [theme] }, pickable: false, beforeId: K.beforeId, mcd: { keep: true }
    }));
    var sp = selPoint(sel);
    if (sp) {
      var spx = sp.row ? sizeOf(sp.row) : 18;
      out.top.push(new D.ScatterplotLayer({ id: 'health-sel', data: [sp], getPosition: function (p) { return [p.lon, p.lat]; }, radiusUnits: 'pixels', getRadius: spx / 2 + 7,
        filled: false, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.2, getLineColor: rgba(P0.signal || [56, 214, 232], 255), updateTriggers: { getRadius: trig }, pickable: false, beforeId: K.beforeId }));
    }
    /* labels (H8): hospital names from zoom 12 (besar), 13 (sedang), 14 (kecil); clinic names from zoom 16 while ≤ 80 in
       view; none while "Samarkan nama" is on */
    if (ms.fontsReady && !veil()) {
      var lab = [], klab = [];
      m.rs.concat(m.stacks.filter(function (s) { return s.lead.kind === 'rs'; }).map(function (s) { return s.lead; })).forEach(function (r) {
        var step = V.specs.get(r.id).step;
        if (z >= RS_LABEL_Z[step] && (!hs || hs.has(r.id))) lab.push({ p: pos(r), t: shortName(r.name, 28), pr: (3 - (step === 'besar' ? 0 : step === 'sedang' ? 1 : 2)) * 2 + (r.play ? 1 : 0) + (selRow && selRow.id === r.id ? 9 : 0), dx: sizeOf(r) / 2 + 5 });
      });
      if (clinicLabelsOk(m.kl, z)) m.kl.forEach(function (r) { klab.push({ p: pos(r), t: shortName(r.name, 28), pr: r.play ? 1 : 0, dx: sizeOf(r) / 2 + 4 }); });
      if (selRow && selRow.kind !== 'rs' && z >= 13) klab.push({ p: pos(selRow), t: shortName(selRow.name, 28), pr: 9, dx: sizeOf(selRow) / 2 + 4 });
      var both = declutter(lab.concat(klab), z), rsL = both.filter(function (l) { return lab.indexOf(l) >= 0; }), klL = both.filter(function (l) { return klab.indexOf(l) >= 0; });
      var txt = function (id, data, size, weight) {
        return new D.TextLayer({ id: id, data: data, getPosition: function (o) { return o.p; }, getText: function (o) { return o.t; }, getSize: size, sizeUnits: 'pixels', fontFamily: K.fonts && K.fonts.sans,
          fontWeight: weight, characterSet: 'auto', getColor: rgba(P0.text1 || col.count, 245), fontSettings: { sdf: true }, outlineWidth: 2.4, outlineColor: rgba(P0.canvas || col.keyline, 235),
          getPixelOffset: function (o) { return [o.dx, 0]; }, getTextAnchor: 'start', getAlignmentBaseline: 'center', updateTriggers: { getColor: ms.palette }, pickable: false, beforeId: K.beforeId });
      };
      if (rsL.length) out.top.push(txt('health-rs-label', rsL, 12, 600));
      if (klL.length) out.top.push(txt('health-kl-label', klL, 11, 400));
    }
    return out;
  }
  function legend(derived, ms) {
    if (!V || !ms) return [];
    var theme = ms.theme === 'day' ? 'day' : 'night', n = V.counts, groups = [];
    groups.push(H.sym.legend(theme, st.km, { rs: n.rs, klinik: n.klinik, kecantikan: n.kecantikan }, ms.zoom, { show: st.f.show, hollow: n.noPlay > 0, faint: n.rendah > 0 }));
    var Tr = MCD.territory, tg = Tr && isFn(Tr.legendGroups) ? (Tr.legendGroups({ ms: ms, stats: terrStats() }) || []) : [];
    var tkec = tg.filter(function (g) { return g.id === 'territory-kec'; })[0], lines = tg.filter(function (g) { return g.id === 'territory-lines'; })[0];
    var tnote = tkec && tkec.note ? String(tkec.note).split('\n').filter(function (x) { return x && !/file LVM/.test(x); }).join('\n') : '';
    groups.push({ id: 'health-kec', title: 'Label kecamatan', rows: [{ glyph: 'chip', label: 'Nama kecamatan · jumlah rumah sakit dan klinik' }].concat(tkec && tkec.rows ? tkec.rows.filter(function (r) { return r && r.muted; }) : []), note: tnote || null });
    if (lines) groups.push(lines);
    return groups;
  }
  function telemetry() {
    if (!V) return H && H.state() === 'loading' ? 'MEMUAT DATA FASILITAS KESEHATAN' : '';
    return fm().int(V.counts.rs) + ' RS · ' + fm().int(V.counts.klinik + V.counts.kecantikan) + ' KLINIK DALAM ' + st.km + ' KM';
  }
  function registerPosture() {
    var M = MCD.map;
    if (!M || !isFn(M.registerPosture) || !st) return;
    try {
      M.registerPosture(ID, { imagery: 'full', camera: cameraOf(st.km), rings: 'schools', layerSet: ID, deck: true, buildings: 'off', zones: zoneSpec(),
        attribution: T.attribution, onRingClick: function (km) { setKm(km <= 5.01 ? 5 : km <= 15.01 ? 15 : 30); }, ringHint: 'Klik untuk menampilkan fasilitas sampai jarak ini dari Mabes TNI', telemetry: telemetry });
    } catch (e) { /* the map keeps its posture */ }
  }
  function registerMap() {
    unregisterMap();
    var M = MCD.map;
    if (!M || !isFn(M.registerLayers)) return;
    mapOffs.push(M.registerLayers(ID, mapLayers, { id: ID }));
    registerPosture();
    if (isFn(M.registerLegend)) M.registerLegend(ID, legend);
    if (isFn(M.registerSelectable)) {
      M.registerSelectable('health', function (id) { var r = H.ready() ? H.row(id) : null; return r ? [r.lon, r.lat] : null; });
      M.registerSelectable('hfStack', function (id) { return stackPoint(id); });
      M.registerSelectable('hfCluster', function (id) { var c = BUB[id]; return c ? [c.lon, c.lat] : null; });
      M.registerSelectable('hfKec', function () { return null; });
    }
    var Tr = MCD.territory;
    if (Tr && isFn(Tr.bind) && isFn(Tr.popup)) {
      unbindTerr = Tr.bind({
        stats: function () { return terrStats(); },
        popup: function (kid) { return kecPopup(kid); },
        actions: function (kid) { var a = [{ label: T.kecOpen, primary: true, run: function () { openKec(kid); } }]; if (WS()) a.push({ id: 'detail', label: 'Detail', run: function () { openKecNums(kid); } }); return a; },
        onPick: function (h) { if (h && h.kecamatanId) { st.selKec = h.kecamatanId; requestRender(); } },
        onClose: function () { if (!(drawerSel && drawerSel.kind === 'hfKec')) { st.selKec = null; requestRender(); } }
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
    if (!sel || sel.kind !== 'health') return null;
    if (sel.extra && sel.extra.trail) return String(sel.extra.trail);
    if (!WS()) return null;
    var r = H.row(sel.id), f = focusedKec();
    return r && r.kecId && f && String(f) === String(r.kecId) ? String(r.kecId) : null;
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
    var Tr = territory(), b = Tr && isFn(Tr.boundsOf) ? Tr.boundsOf(id) : null;
    if (b && isFn(M.fitBounds)) M.fitBounds(b, { maxZoom: 14 });
  }
  function openKec(id) { flyNext = false; if (ctx) ctx.select({ kind: 'hfKec', id: String(id), extra: { kecamatanId: String(id) } }); }
  function openKecNums(id) { flyNext = false; if (ctx) ctx.select({ kind: 'hfKec', id: String(id), extra: { kecamatanId: String(id), first: 'angka' } }); }
  function showKec(id) { if (!id) return; st.selKec = String(id); requestRender(); openKec(id); }
  function openInTrail(r, kid) { if (!ctx) return; flyNext = !WS(); ctx.select({ kind: 'health', id: r.id, extra: { trail: String(kid) } }); }
  function openInStack(r, key) { if (!ctx) return; flyNext = false; ctx.select({ kind: 'health', id: r.id, extra: { stack: key } }); }
  function openStack(key) { if (!ctx) return; flyNext = false; ctx.select({ kind: 'hfStack', id: String(key) }); }
  function openRow(r, o) { if (!ctx || !r) return; ensureVisible(r); flyNext = true; ctx.select({ kind: 'health', id: r.id, extra: o && o.fold ? { fold: o.fold } : undefined }); }
  /** Make a facility visible before flying to it: a scope wide enough, its kind on, the filters that hide it off. */
  function ensureVisible(r) {
    if (!r) return;
    if (!r.in15 && st.km <= 15) setKm(30, { camera: false });
    else if (st.km === 5 && !(isNum(r.distMabesKm) && r.distMabesKm <= 5)) setKm(15, { camera: false });
    if (st.f.show[r.kind] === false) { st.f.show[r.kind] = true; saveUi(); }
    computeView();
    if (V && !V.ids.has(r.id)) resetFilters(); else refresh(['filters']);
  }
  function focusRow(r, origin) {
    if (!ctx || !r) return false;
    ensureVisible(r);
    var M = MCD.map;
    if (M && isFn(M.focusPoint)) { try { if (M.focusPoint({ lon: r.lon, lat: r.lat, zoom: 16, kind: 'health', id: r.id, origin: origin || null }) !== false) return true; } catch (e) { /* select below */ } }
    flyNext = true;
    ctx.select({ kind: 'health', id: r.id });
    return true;
  }
  function requestFocus(id) {
    pendingFocus = String(id);
    if (!ctx) return;
    H.load().then(function (ok) { if (!ok) { pendingFocus = null; toast(T.failed, 'warn'); return; } later(runPendingFocus, 60); });
  }
  function runPendingFocus() {
    if (!ctx || pendingFocus == null || !H.ready()) return;
    var id = pendingFocus, r = H.row(id);
    pendingFocus = null;
    if (!r) { toast('Fasilitas ini tidak ditemukan di data kesehatan.', 'warn'); return; }
    focusRow(r);
  }
  function showModel(sel, trail) {
    if (!sel || !H.ready()) return null;
    computeView();
    if (sel.kind === 'health') return hfModel(H.row(sel.id), { trail: trail, stack: sel.extra && sel.extra.stack, fold: sel.extra && sel.extra.fold });
    if (sel.kind === 'hfStack') return stackModel(String(sel.id));
    if (sel.kind === 'hfKec') return kecModel(String(sel.id), { listFirst: !(sel.extra && sel.extra.first === 'angka') });
    return null;
  }
  function openFold(id) {
    var d = document.querySelector('.drawer'), el = d ? d.querySelector('[data-fold="' + id + '"]') : null;
    if (!el) return;
    var t = el.querySelector('.dd-blk__t'), b = t && t.querySelector('[aria-expanded="false"]');
    if (b) b.click();
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
  }
  function onSelect(sel) {
    if (sel && MCD.territory && sel.kind === MCD.territory.KIND) { later(function () { if (ctx) ctx.clearSelection(); }, 0); return true; }
    if (!sel || !SEL_RE.test(sel.kind)) return false;
    if (!H.ready()) return true;
    if (sel.kind === 'hfCluster') {
      /* a bubble zooms in by two levels on its position, no callout (LAYOUT_V5C §3.1); a jump under reduced motion */
      var c = BUB[sel.id], M = MCD.map;
      later(function () { if (ctx) ctx.clearSelection(); }, 0);
      if (c && M) {
        var z = 11;
        try { var mp = isFn(M.getMap) ? M.getMap() : null; z = mp && isFn(mp.getZoom) ? mp.getZoom() : z; } catch (e) { z = 11; }
        var reduce = false;
        try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduce = false; }
        if (isFn(M.flyTo)) M.flyTo({ center: [c.lon, c.lat], zoom: Math.min(18, z + 2), duration: reduce ? 0 : undefined });
      }
      return true;
    }
    var trail = trailOf(sel);
    if (sel.kind !== 'hfKec' && !(trail && trail === ownFocus)) dropOwnFocus();
    var model = showModel(sel, trail);
    if (!model) return false;
    drawerSel = sel;
    if (sel.kind === 'hfKec') st.selKec = String(sel.id);
    else if (WS() && st.selKec !== (trail || null)) st.selKec = trail || null;
    requestRender();
    var fly = flyNext;
    flyNext = false;
    later(function () {
      if (!ctx || drawerSel !== sel) return;
      if (MCD.territory && isFn(MCD.territory.closePopup)) { try { MCD.territory.closePopup(); } catch (e) { /* ignore */ } }
      ctx.openDrawer(model);
      watchDrawer(sel, trail);
      if (sel.kind === 'hfKec') { var kid = String(sel.id); later(function () { if (ctx && drawerSel === sel) ensureKecFocus(kid); }, 160); }
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
      if (sel.kind === 'hfKec') { st.selKec = null; dropOwnFocus(sel.id); }
      else if (trail) { st.selKec = null; dropOwnFocus(trail); }
      var s = selNow();
      if (s && s.kind === sel.kind && String(s.id) === String(sel.id) && ctx) ctx.clearSelection();
      requestRender();
    });
    drawerObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }
  /** The open card follows data, filters, distances and privacy in place (never while staff type in its editor). */
  function refreshOpenCard() {
    if (!ctx || !drawerSel || !WS()) return;
    var d = document.querySelector('.drawer'), open = !!(d && d.classList.contains('is-open')) || !!document.querySelector('.ws-co');
    if (!open) return;
    var a = document.activeElement;
    if (a && a.closest && a.closest('.hf-dd--pipe')) return;
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
    if (isDeep() && ui.work) { if (keys.indexOf('pipeline') >= 0 && ui.work.pipe) ui.work.pipe.sig = ''; renderWork(false); }
    syncChips();
    syncControls();
  }
  function syncControls() {
    if (!ctx || syncControls.done) return;
    syncControls.done = true;
    try { ctx.mapControls({ extra: [], presets: ['sme15', 'ring30'] }); } catch (e) { /* ignore */ }
  }

  /* ============================================================ section contract (v5 workspace; v6 scope) */

  function summary() {
    if (!st) return { items: [], filters: 0 };
    var scope = { label: T.scope, value: st.km, options: SCOPES.map(function (v) { return { v: v, label: v + ' km' }; }), set: function (v) { setKm(+v); }, title: T.scopeTip };
    var nf = filterCount(), km = st.km;
    if (!H || !computeView()) {
      var busy = H && H.state() === 'loading' ? T.loading : H && H.state() === 'error' ? T.failed : 'Data fasilitas kesehatan belum dimuat.';
      return { items: [{ value: '—', label: T.railRs, title: busy }, { value: '—', label: T.railKl, title: busy }, { value: '—', label: T.railKc, title: busy }], filters: nf, scope: scope };
    }
    var f = fm(), n = V.counts, sh = st.f.show;
    function item(kind, label, title, word) { return sh[kind] === false ? { value: '—', label: label, title: T.kindOff(word) } : { value: f.int(n[kind]), label: label, title: title }; }
    return { items: [item('rs', T.railRs, T.railRsTitle(km, n.bySize), 'Rumah sakit'), item('klinik', T.railKl, T.railKlTitle(km), 'Klinik kesehatan'), item('kecantikan', T.railKc, T.railKcTitle(km), 'Klinik kecantikan')],
      filters: nf, scope: scope };
  }
  function workspace() {
    if (!ctx || !isDeep() || !ui || !ui.work || !page || !page.el) return null;
    var w = ui.work;
    later(syncAdopted, 0);
    return { rail: { el: page.el, label: T.title, short: T.title, icon: 'sec-health', summary: summary },
      drawer: { el: w.el, tabs: w.tabHost, title: T.drawer, source: T.src, more: function () { openSources(); } },
      hide: [w.head, w.foot, ui.panel && ui.panel.openWork].filter(Boolean) };
  }
  function cardFor(sel) {
    if (!sel || !/^(health|hfStack|hfKec)$/.test(sel.kind)) return null;
    H = H || MCD.health;
    if (!H || !H.ready() || !st) return null;
    var was = building;
    building = 'pin';
    try { return showModel(sel, trailOf(sel)); } catch (e) { return null; } finally { building = was; }
  }

  /* ============================================================ search (Cari; §3.4) */

  function searchHealth(q) {
    H = H || MCD.health;
    var s = String(q || '').trim();
    if (!H || s.length < 3) return [];
    if (!H.ready()) {
      if (s.length >= 4 && MCD.app && isFn(MCD.app.isBooted) && MCD.app.isBooted()) idle(function () { H.load(); }, 0);
      return [];
    }
    var res = H.search(s, 6), out = [];
    res.rows.forEach(function (r) {
      var d = distOf(r), dt = distText(d);
      out.push({ group: T.title, label: nameOf(r), sub: H.words.kind(r) + ' · ' + (dt && dt !== '—' ? dt + ' dari KCP' : H.fmtKm(r.distKm) + ' dari KCP'),
        run: function () { if (MCD.app && isFn(MCD.app.focus)) MCD.app.focus({ section: ID, kind: 'health', id: r.id }); } });
    });
    res.chains.forEach(function (c) {
      out.push({ group: T.title, label: 'Jaringan ' + c.name, sub: 'Kesehatan › Jaringan',
        run: function () { if (ctx && st) { setChain(c.name); goTab(c.kinds.indexOf('rs') >= 0 ? 'rs' : 'klinik'); } else if (MCD.app && isFn(MCD.app.navigate)) MCD.app.navigate(ID, { action: 'health:chain:' + c.name }); } });
    });
    return out;
  }
  var searchDone = false;
  if (MCD.searchProviders && typeof MCD.searchProviders === 'object') { MCD.searchProviders.health = function (q) { return searchHealth(q); }; searchDone = true; }
  function registerSearch() {
    if (searchDone) return;
    var A = MCD.app;
    if (!A || !isFn(A.registerSearch)) return;
    try { A.registerSearch(ID, searchHealth); searchDone = true; } catch (e) { /* the shell keeps its own entries */ }
  }

  /* ============================================================ the section */

  var SPEC = { lede: T.lede, shows: T.shows, needs: [], dataKeys: [], emptyFirst: false, blocks: [], source: T.src, cards: function () { return []; } };

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (host, c) {
      H = MCD.health;
      ctx = c;
      ui = {};
      distSwitches = []; timers = []; pipeEds = {};
      DISTC = new Map();
      if (!H) return;
      if (!st) st = loadState();
      st.km = scopeGet();
      st.workOpen = !!(st.openOnMount && isDeep());
      st.openOnMount = false;
      syncControls.done = false;
      saveUi = debounce(function () { if (st) sset(UI_KEY, { v: 1, sortRs: st.sortRs, sortKl: st.sortKl, show: { rs: st.f.show.rs !== false, klinik: st.f.show.klinik !== false, kecantikan: st.f.show.kecantikan !== false }, tab: st.tab }); }, 400);
      host.classList.add('hf-host');
      page = c.page(Object.assign({}, SPEC, { primary: isDeep() ? null : { label: T.listBtn, icon: 'chev-r', run: function () { goTab(st.f.show.klinik === false && st.f.show.kecantikan === false ? 'rs' : 'klinik'); } } }));
      buildPanel(page.body);
      if (isDeep()) {
        buildWork(host);
        syncWork();
        if (st.workOpen) later(function () { if (ctx && isDeep()) { openWork(true, st.openHow || 'list'); st.openHow = null; renderWork(true); } }, 420);
      }
      registerMap();
      registerSearch();
      offs.push(H.on(debounce(function (e) { if (!ctx) return; if (e && e.type === 'pipeline') { if (isDeep() && st.tab === 'pipe') renderPipe(true); } }, 60)));
      var P0 = H.pipeline;
      if (P0 && isFn(P0.ready)) { try { P0.ready().then(function () { if (ctx) { if (ui && ui.work && ui.work.pipe) renderPipe(true); refreshOpenCard(); } }, function () {}); } catch (e) { /* memory list */ } }
      if (MCD.state && isFn(MCD.state.on)) { var offR = MCD.state.on('reset', function (e) { if (e && e.scope === 'filters') resetFilters(); }); if (isFn(offR)) offs.push(offR); }
      var I = MCD.inst;
      if (I && I.scope && isFn(I.scope.on)) { try { var offS = I.scope.on(function () { var v = scopeGet(); if (st && v !== st.km) setKm(v, { quiet: true }); }); if (isFn(offS)) offs.push(offS); } catch (e) { /* ignore */ } }
      var onDistEvt = function () { onDistance(); };
      window.addEventListener('mcd:distance', onDistEvt);
      offs.push(function () { window.removeEventListener('mcd:distance', onDistEvt); });
      if (MCD.seal && isFn(MCD.seal.on)) { try { var offSeal = MCD.seal.on(function () { if (ctx && ui && ui.work && ui.work.pipe) renderPipe(true); }); if (isFn(offSeal)) offs.push(offSeal); } catch (e) { /* ignore */ } }
      c.registerCommands(function () {
        return [
          { label: 'Kesehatan › Rumah sakit', run: function () { goTab('rs'); }, kw: 'kesehatan rs rumah sakit hospital' },
          { label: 'Kesehatan › Klinik', run: function () { goTab('klinik'); }, kw: 'kesehatan klinik kecantikan estetika' },
          { label: 'Kesehatan › Kecamatan', run: function () { goTab('kec'); }, kw: 'kesehatan kecamatan' },
          { label: 'Kesehatan › Jaringan', run: function () { goTab('jaringan'); }, kw: 'kesehatan jaringan chain' },
          { label: 'Kesehatan › Tindak lanjut', run: function () { goTab('pipe'); }, kw: 'kesehatan tindak lanjut pipeline' },
          { label: 'Kesehatan · Cakupan 5 km', run: function () { setKm(5); }, kw: 'kesehatan cakupan 5' },
          { label: 'Kesehatan · Cakupan 15 km', run: function () { setKm(15); }, kw: 'kesehatan cakupan 15' },
          { label: 'Kesehatan · Cakupan 30 km', run: function () { setKm(30); }, kw: 'kesehatan cakupan 30' },
          { label: 'Kesehatan · Hapus filter', run: function () { resetFilters(); }, kw: 'kesehatan hapus filter' }
        ];
      });
      startTerritory();
      if (H.ready()) refresh(['*']); else startData();
      if (pendingFocus != null) requestFocus(pendingFocus);
    },
    update: function (derived, keys) {
      if (!ctx) return;
      keys = keys || ['*'];
      if (page) page.update(derived, keys);
      if (keys.indexOf('selection') >= 0) {
        var s = selNow();
        if (!s || !SEL_RE.test(s.kind)) {
          drawerSel = null;
          if (st.selKec && !(MCD.territory && isFn(MCD.territory.popupOpen) && MCD.territory.popupOpen())) st.selKec = null;
          requestRender();
        }
      }
      var relevant = keys.some(function (k) { return k === '*' || k === 'data' || k === 'demo' || k === 'theme' || k === 'settings' || k === 'distance' || k.indexOf('privacy') === 0; });
      if (!relevant) return;
      if (keys.indexOf('theme') >= 0 && ui.work && ui.work.table && isFn(ui.work.table.update)) ui.work.table.update();
      if (keys.indexOf('distance') >= 0) DISTC = new Map();
      if (keys.some(function (k) { return k.indexOf('privacy') === 0; }) && ui.work && ui.work.pipe) ui.work.pipe.sig = '';
      if (keys.indexOf('data') >= 0 || keys.indexOf('demo') >= 0) { V = null; if (H && isFn(H.invalidate)) H.invalidate(); }
      refresh(keys);
      if (keys.some(function (k) { return k.indexOf('privacy') === 0 || k === 'distance' || k === 'data' || k === 'demo'; })) refreshOpenCard();
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
      document.body.classList.remove('hf-work-open');
      if (ctx && isFn(ctx.filterChips)) { try { ctx.filterChips([]); } catch (e) { /* ignore */ } }
      /* the zones go back to kecamatan15 (H12): a 30 km Kesehatan view does not leave its zone set behind */
      var M = MCD.map;
      if (M && isFn(M.setZones)) { try { M.setZones({ section: ID, mode: 'kecamatan15' }); } catch (e) { /* ignore */ } }
      distSwitches = [];
      drawerSel = null;
      dropOwnFocus();
      if (st) st.selKec = null;
      saveUi();
      LM = { key: '', m: null };
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
    kecList: function (kecId) { H = H || MCD.health; if (!H || !H.ready() || !st || !kecId) return null; computeView(); return kecModel(String(kecId), { listFirst: true }); },
    onAction: function (action) {
      var a = String(action || '');
      var m = /^focus:(hf|health):(.+)$/.exec(a);
      if (m) { requestFocus(m[2]); return true; }
      if (!ctx) return false;
      var k = /^health:kec:(\d\d\.\d\d\.\d\d)$/.exec(a);
      if (k) { H.load().then(function (ok) { if (ok && ctx) { computeView(); showKec(k[1]); } }); return true; }
      var sc = /^health:scope:(5|15|30)$/.exec(a);
      if (sc) { setKm(+sc[1]); return true; }
      var tb = /^health:tab:([A-Za-z]{1,20})(?::([A-Za-z]{1,10}))?(?::([A-Za-z]{1,20}))?$/.exec(a);
      if (tb) { land(tb[1], tb[2], tb[3]); return true; }
      var ch = /^health:chain:(.{1,80})$/.exec(a);
      if (ch) { H.load().then(function (ok) { if (!ok || !ctx) return; var c = H.index().chains.filter(function (x) { return x.name === ch[1]; })[0]; if (c) { setChain(c.name); goTab(c.kinds.indexOf('rs') >= 0 ? 'rs' : 'klinik'); } }); return true; }
      var kd = /^health:kind:(rs|klinik|kecantikan)$/.exec(a);
      if (kd) { showOnly(kd[1]); return true; }
      if (a === 'health:list') { goTab('klinik'); return true; }
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
      var s = ui && ui.work && ui.work.list;
      if (s && V && (listWidth(s) < 520) !== !!s.narrow) renderList();
    },
    search: searchHealth,
    _test: {
      T: T,
      state: function () { return st; },
      reset: function () { st = null; V = null; SCOPE_MEM = null; LM = { key: '', m: null }; },
      view: function () { return computeView(); },
      setKm: function (v) { setKm(v); },
      toggleShow: function (id) { toggleShow(id); },
      toggleChip: function (g, id) { toggleChip(g, id); },
      setJaringan: function (v) { setJaringan(v); },
      setChain: function (c) { setChain(c); },
      resetFilters: function () { resetFilters(); },
      filterCount: function () { return filterCount(); },
      hfModel: function (id, o) { H = H || MCD.health; computeView(); return hfModel(H.row(id), o); },
      stackModel: function (key) { computeView(); return stackModel(key); },
      kecModel: function (id, o) { computeView(); return kecModel(String(id), o); },
      kecPopup: function (id) { computeView(); return kecPopup(String(id)); },
      kecLabel: function (id) { computeView(); return kecLabel({ id: String(id) }); },
      kontakBlock: function (id) { return kontakBlock(H.row(id)); },
      merchantBlock: function (id) { return merchantBlock(H.row(id)); },
      peluangBlock: function (id) { return peluangBlock(H.row(id)); },
      planQuick: function (id) { return planQuick(H.row(id)); },
      quickAdd: function (key, label) { return quickAdd(key, label); },
      listRows: function (tab) { computeView(); return listRows(tab || 'rs'); },
      legend: function (ms) { computeView(); return legend(null, ms || { theme: 'day', zoom: 11 }); },
      mapLayers: function (ms) { return mapLayers(null, ms); },
      drawModel: function (z, selId) { computeView(); var r = selId ? H.row(selId) : null; LM = { key: '', m: null }; return drawModel(Math.round(z * 2) / 2, z < H.CLUSTER_BELOW, r); },
      summary: function () { return summary(); },
      searchHealth: searchHealth,
      exportCsv: function (tab) { computeView(); return H.csv(listRows(tab || 'rs').filter(function (r) { return !r._div; }), { veiled: veil() }); },
      openTab: function (id) { goTab(id); },
      pipeState: function () { return pipeState(); }
    }
  };
})(window.MCD = window.MCD || {});
