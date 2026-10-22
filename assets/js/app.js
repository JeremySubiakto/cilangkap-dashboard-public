/* ==========================================================================
 * MCD app — boot, shell, router, render loop, section pages and tabs, keyboard,
 * search ("Cari"), detail drawer, privacy (Veil / Reveal), errors.
 * Acquisition Dashboard · Bank Mandiri Jakarta Cilangkap Branch.
 *
 * Spec: BUILD_SPEC §J.3 (boot) · §C.1 (shell) · §D.6–D.8 (readout, hash) ·
 * §L.4 (keys) · §C.7 (palette) · §E.8 (drawer) · §K.3–K.5 (privacy,
 * errors) · BUILD_SPEC_AUTH_GATE.md §2.2, §4, §5, §6 (password gate) ·
 * docs/COPY_STYLE_EN.md (English copy and the branch's product decisions:
 * real information only, six sections (five until v6), a flat north-up map, simple
 * navigation, Overview and Deep dive views, Day and Night themes).
 *
 * GATE CONTRACT
 *   Nothing is initialised or rendered before MCD.gate fires onUnlock: no
 *   map, no data, no charts, no settings, no hash read. If the gate script is
 *   missing the page shows "Security gate not available" and stops; a missing
 *   vault is reported by the gate itself. There is no bypass and no skip flag.
 *   The boot function is private to this closure, so it cannot be called from
 *   the console. {key, salt, iter} and the decrypted payload stay in this
 *   closure only (never on window, MCD.*, storage, the URL or the console).
 *   MCD.session exposes functions only (saveEncrypted for "Save encrypted copy").
 *   v6 (V6_SPEC §7.2, §7.4): the one exception is MCD.seal.init(), called once in
 *   onUnlock before the first section mounts. It receives {key, salt, iter} and
 *   only the follow-up part of the payload, keeps them in its own closure and
 *   refuses a second call; nothing is returned or exposed. saveEncrypted() puts
 *   MCD.seal.vaultExport() into payload.followups and, once the file is written,
 *   tells MCD.seal the time it was saved (vaultSeen, D15). Both are guarded.
 *
 * BOOT (inside onUnlock): CDN mirror fallback → settings → vault config →
 *   state.init (hash) → theme → vault datasets → public reference data (no
 *   synthetic records) → shell → map → section → first derive/render → intro.
 *
 * DEMO DATA (COPY_STYLE_EN product decision 7): MCD.demo. Off at every sign-in and
 *   reload. The switch injects assets/js/data-synthetic.js (+ registered demo
 *   scripts) on first use, sets the real datasets aside (MCD.data.enterDemo),
 *   shows the amber banner, tags bank figures DEMO and turns off exports and
 *   Save encrypted copy. Switching off restores the real datasets untouched.
 *
 * SHELL (fixed placement, the same on every screen; docs/UX_FIX_PLAN.md §2, owner A)
 *   top bar     brand · Cari · Terang | Gelap · Data contoh · Bantuan · (Data belum disimpan) · Kunci;
 *               phones: Cari and Menu only, sections in a bottom tab bar
 *   section row Ringkasan · Merchant · Sekolah · Kampus · KPR · Data & Privasi (keys 1–6, v6; the active one
 *               highlighted); phones: the same six in the bottom tab bar
 *   page header breadcrumb + filter chips · title [?] · Sederhana | Detail · ⋯ (Lainnya: masking,
 *               full names, copy link); ctx.tabs for Detail tabs with per-view tab and scroll memory
 *   pages       Ringkasan and Data & Privasi use layout 'page' (no map, body[data-layout="page"])
 *   map         one column of controls bottom-right (Atur ulang peta, Ke cabang, Ke Mabes TNI,
 *               Perbesar, Perkecil, Peta ▾ with places, distance and layers), legend bottom-left;
 *               always flat and north-up (no 2D/3D, tilt or orbit, COPY_STYLE_EN item 10)
 *   details     slide in from the right with a 40 px Tutup button and "Buka di Google Maps"; below 768 px they
 *               are a bottom sheet (peek ≤ 45 % · full · mini, a handle to tap or drag) and the map padding
 *               keeps the route and the focus above it (sheetLayout)
 *   slide-overs closed rails and [data-slideover] panels are inert between 600 and 1279 px
 *   #readout stays in the DOM, hidden, for compatibility. Filters live inside each section.
 *
 * MOTION (COPY_STYLE_EN item 38): MCD.motion (motion.js) + tokens.css. A section switch slides the section row's
 *   underline and fades the old panels at once, then mounts the new section after that frame (requestMount), whose
 *   panels rise in; Sederhana ⇄ Detail does the same with a sliding thumb; the drawer slides and fades with its
 *   blocks 35 ms apart; menus, dialogs and toasts fade with a small rise. Opacity and transforms only; reduced
 *   motion cuts (the mount still waits for the first frame). So a section is mounted one or two frames after
 *   navigate(): use navigate(id, {action}). The map padding is sent only when the free area changed
 *   (applyLayout), because a setLayout during a camera flight re-aims it.
 *
 * RENDER LOOP: MCD.state 'change' / 'data' / settings / theme → one rAF per
 *   frame → derive.compute → map.render → bars → activeSection.update(derived,
 *   changedKeys) → drawer refresh. 'hover' skips derive. 'select' opens the
 *   detail (section.onSelect may take it over) and moves the map selection.
 *   A change of state.view remounts the active section (fade) and switches the
 *   map basemap; a theme change re-reads chart tokens and sends keys ['theme'].
 *
 * SECTION CONTRACT (assets/js/section-<id>.js → MCD.sections.<id>)
 *   mount(host, ctx) · update(derived, keys) · unmount() · layout() → {padding, posture?}
 *   optional: onAction(action, event), onHover(hover), onSelect(sel) → true,
 *   onEscape() → true (Esc after popover, drawer and selection), onFiles(files), onResize().
 *   ctx: see makeCtx() and docs/INTEGRATION_NOTES.md.
 *   ctx.view() is 'overview' | 'deep'; the section is remounted when it changes.
 * ========================================================================== */
(function (root, MCD) {
  'use strict';

  var doc = root.document;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var VERSION = '2.0.0';
  var REVEAL_IDLE_MS = 5 * 60 * 1000;     // §K.3 re-lock after 5 min without input
  var REVEAL_HIDDEN_MS = 60 * 1000;       // §K.3 re-lock when hidden > 60 s
  var CAMERA_HASH_MS = 400;               // §D.8 camera writes on moveend, debounced
  var LIVE_MS = 800;                      // §L.5 live region debounce
  var UNDO_MS = 6000;                     // §D.5 "Filters cleared · Undo (Z)"
  var VIEW_FADE_MS = 220;                 // U6: Overview ⇄ Deep dive cross-fade
  var THEME_KEY = 'mcd.ui.theme';         // U7: per-browser Day / Night choice (non-personal)
  var LEGEND_KEY = 'mcd.ui.legendHidden';
  var NOIMG_KEY = 'mcd.map.noImagery';
  var TEMPLATE = 'templates/Permintaan_Data_KCP_Cilangkap.xlsx';
  var IS_MAC = /Mac|iPhone|iPad/.test((root.navigator && (root.navigator.platform || root.navigator.userAgent)) || '');

  /* ------------------------------------------------- copy (COPY_STYLE_EN) */

  var T = {
    brandLine: 'BANK MANDIRI · KCP JAKARTA CILANGKAP',
    product: 'Dashboard Akuisisi',
    sectionsAria: 'Bagian',
    viewAria: 'Tampilan',
    viewOverview: 'Sederhana',
    viewOverviewHint: 'Angka utama dan peta jalan',
    viewDeep: 'Detail',
    viewDeepHint: 'Semua filter, grafik, tabel dan peta satelit',
    themeAria: 'Tema',
    day: 'Terang', night: 'Gelap',
    dayHint: 'Untuk ruangan terang',
    nightHint: 'Untuk ruangan gelap atau proyektor',
    themeSwitchTo: function (t) { return t === 'day' ? 'Ganti ke Terang (tombol N)' : 'Ganti ke Gelap (tombol N)'; },
    help: 'Bantuan',
    search: 'Cari',
    searchField: 'Cari kecamatan, merchant, sekolah, kampus atau proyek',
    searchLabel: 'Cari kecamatan, merchant atau SMA',   /* visible in the band; fits without "…" from 1440 px */
    searchShort: 'Cari kecamatan, merchant',            /* 1280–1439 px */
    searchPlaceholder: 'Ketik nama kecamatan, merchant, sekolah, kampus, proyek atau perintah',
    lock: 'Kunci',
    lockAria: 'Kunci dashboard',
    menu: 'Menu',
    more: 'Lainnya',
    moreAria: 'Pilihan lain',
    asOfLead: 'Data LVM per ',
    noData: 'Belum ada data bank',
    noDataTitle: 'Belum ada data bank. Peta hanya menampilkan data publik.',
    unsaved: 'Data belum disimpan',
    unsavedTitle: 'Data baru belum disimpan. Klik untuk menyimpan salinan terenkripsi.',
    veilBadge: 'NAMA DISAMARKAN',
    veilBtn: 'Samarkan nama saat berbagi layar',
    veilTitle: 'Nama menjadi inisial. Nilai dan lokasi disamarkan. (tombol V)',
    revealBtn: 'Tampilkan nama lengkap',
    revealOff: 'Tampilkan nama lengkap',
    revealOn: 'Nama lengkap tampil. Klik untuk menyamarkan lagi.',
    revealBadge: 'NAMA LENGKAP TAMPIL',
    revealBadgeMore: ' · disamarkan lagi setelah 5 menit',
    revealAskTitle: 'Nama lengkap akan ditampilkan',
    revealAskBody: 'Pastikan layar tidak sedang dibagikan atau diproyeksikan.\nNama disamarkan lagi setelah 5 menit tanpa aktivitas.\nNama juga disamarkan jika tab ditinggal lebih dari 60 detik atau mode berbagi layar menyala.',
    revealYes: 'Tampilkan nama',
    revealIdle: 'Nama disamarkan lagi karena 5 menit tanpa aktivitas',
    revealHidden: 'Nama disamarkan lagi karena tab ditinggal lebih dari 60 detik',
    cancel: 'Batal',
    close: 'Tutup',
    /* details as a bottom sheet on phones (< 768 px): the handle above the title */
    sheetGrow: 'Tampilkan semua detail',
    sheetShrink: 'Perkecil panel detail',
    sheetPeek: 'Tampilkan detail',
    sheetHint: 'Ketuk atau geser untuk mengubah tinggi panel',
    distAll: 'Tampilkan semua jarak',
    copyLink: 'Salin tautan halaman ini',
    copyLinkTitle: 'Salin tautan halaman ini. Tautan hanya memuat filter dan posisi peta, tanpa data.',
    linkCopied: 'Tautan disalin. Isinya hanya filter dan posisi peta.',
    copyFail: 'Tautan tidak dapat disalin. Salin alamat dari kolom alamat browser.',
    internalError: 'Terjadi kesalahan. Muat ulang halaman jika ada panel yang kosong.',
    mapLoading: 'Memuat peta',
    mountError: 'Bagian ini tidak dapat dibuka. Tekan Coba lagi atau muat ulang halaman.',
    brokenTitle: 'Bagian ini tidak dapat dibuka',
    brokenBody: 'Bagian lain tetap dapat digunakan. Tekan Coba lagi.',
    tryAgain: 'Coba lagi',
    errorToast: 'Terjadi kesalahan. Muat ulang halaman jika ada panel yang kosong.',
    dismiss: 'Tutup pesan',
    brandProduct: 'Dashboard Akuisisi',
    brandBranch: 'KCP Jakarta Cilangkap (12903)',
    brandBranchShort: 'KCP Cilangkap',
    brandSep: ' · ',
    mandiriAlt: 'Bank Mandiri',
    danantaraLead: 'Bagian dari',
    danantaraAlt: 'Danantara Indonesia',
    missing: 'Bagian ini belum tersedia.',
    blockEyebrow: 'BANK MANDIRI · KCP JAKARTA CILANGKAP',
    blockTitle: 'Halaman masuk tidak termuat',
    blockGate: 'File halaman masuk tidak termuat, sehingga dashboard tetap tertutup.\nPengelola dashboard: periksa file assets/js/gate.js, lalu muat ulang halaman.',
    blockFoot: 'Tidak ada data yang dibuka sebelum kata sandi diperiksa.',
    fatalTitle: 'Dashboard tidak dapat dibuka',
    fatalD3: 'Komponen grafik tidak dapat dimuat. Periksa internet, lalu muat ulang halaman.',
    fatalBoot: 'Data tidak dapat disiapkan. Muat ulang halaman, lalu coba lagi.',
    reload: 'Muat ulang halaman',
    dropLine: 'Lepaskan file di sini. File hanya dibaca di komputer ini.',
    dropQueued: function (n) { return n + ' file dikirim ke Data & Privasi › Impor'; },
    vaultSaved: 'Salinan terenkripsi telah diunduh (vault.js). Pasang di folder data agar terbuka saat masuk berikutnya.',
    vaultFail: 'Salinan terenkripsi tidak dapat disimpan. Coba lagi.',
    sessionMissing: 'Data terenkripsi belum terbuka. Masuk kembali untuk menyimpan.',
    empty: 'Klik titik, kecamatan atau baris tabel untuk melihat detailnya.',
    legend: 'Keterangan',
    legendHide: 'Sembunyikan keterangan (tombol L)',
    legendShow: 'Tampilkan keterangan (tombol L)',
    legendFold: 'Tutup',
    mapCtlAria: 'Kontrol peta',
    mapMenu: 'Peta',
    mapMenuHint: 'Jarak, lapisan dan warna peta',
    layers: 'Lapisan peta',
    distance: 'Jarak',
    zoomIn: 'Perbesar', zoomOut: 'Perkecil',
    zoomMabes: 'Ke Mabes TNI', zoomBranch: 'Ke cabang', resetView: 'Atur ulang peta',
    scaleTitle: 'Skala peta',
    mapUnavailable: 'Peta tidak dapat dimuat',
    seeDetails: 'Lihat detail',
    importData: 'Impor file LVM',
    importFiles: 'Impor file',
    whatIsThis: 'Apa isi bagian ini',
    showMap: 'Lihat peta', showPanel: 'Lihat panel',
    demoSwitch: 'Data contoh',
    demoOffHint: 'Isi semua panel dengan angka contoh untuk mencoba dashboard. Data nyata tetap aman.',
    demoOnHint: 'Data contoh aktif · klik untuk kembali ke data nyata',
    demoBannerLead: 'Data contoh aktif.',
    demoBannerRest: ' Angka di layar hanya ilustrasi.',
    demoTurnOff: 'Matikan Data contoh',
    demoLoading: 'Memuat data contoh',
    demoOnSaid: 'Data contoh aktif. Angka di layar hanya ilustrasi.',
    demoOffSaid: 'Data contoh dimatikan. Angka di layar kembali ke data nyata.',
    demoFail: 'Data contoh tidak dapat dimuat. Muat ulang halaman, lalu coba lagi.',
    demoBlocked: 'Tidak tersedia saat Data contoh aktif. Matikan Data contoh lebih dulu.',
    demoTagTitle: 'Angka contoh, hanya untuk ilustrasi',
    demoTag: 'CONTOH',
    demoStatus: 'Data contoh',
    demoPill: 'Data contoh',
    demoAskTitle: 'Matikan Data contoh untuk mengimpor',
    demoAskBody: 'File Anda masuk ke data nyata.\nData contoh dimatikan dulu agar angka nyata dan angka contoh tidak tercampur.',
    demoAskOk: 'Matikan dan lanjutkan',
    demoProv: 'Sumber: data contoh (ilustrasi)',
    lockAskTitle: 'Data impor belum disimpan',
    lockAskBody: 'Jika dikunci sekarang, data yang baru diimpor hilang dari layar.',
    lockAskSave: 'Simpan dulu',
    lockAskLock: 'Kunci tanpa menyimpan',
    clearFilters: 'Hapus filter',
    clearFilter: function (l) { return 'Hapus filter ' + l; },
    backTo: function (l) { return 'Kembali ke ' + l; },
    keyHint: function (k) { return 'Tombol ' + k; },
    edgeOpen: 'Buka panel',
    trueColour: 'Warna asli',
    trueColourOff: 'Tampilkan peta satelit dengan warna aslinya. Bawaan abu-abu agar titik berwarna mudah terlihat.',
    trueColourOn: 'Kembali ke peta satelit abu-abu.',
    telemetryOn: 'Tampilkan koordinat peta',
    telemetryOff: 'Sembunyikan koordinat peta',
    /* item 27: the shared travel-time switches of MCD.distance (Peta menu, Cari) */
    travelGroup: 'Waktu tempuh dari KCP',
    travelPeak: 'Jam sibuk',
    travelPeakTitle: 'Tampilkan waktu tempuh saat jam sibuk. Faktornya asumsi, dapat diubah di Data & Privasi.',
    travelNoToll: 'Motor (tanpa tol)',
    travelNoTollTitle: 'Tampilkan rute tanpa jalan tol, untuk sepeda motor.',
    travelFromBranch: 'Jarak dari KCP'
  };

  /* ------------------------------------------------------------ DOM helpers */

  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') setText(el, v);
      else if (k === 'class') el.className = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { if (v[s] != null) el.style.setProperty(s, String(v[s])); });
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    if (kids == null) return el;
    (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { append(el, c); return; }
      if (typeof c === 'string' && c.indexOf('\n') >= 0) { appendLines(el, c); return; }
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? doc.createTextNode(String(c)) : c);
    });
    return el;
  }
  /* Copy deck (COPY_DECK_ID §How to use): "\n" in a tip or note is a new line, drawn as <br>, never one long line. */
  var NO_BR = { OPTION: 1, TEXTAREA: 1, TITLE: 1, SCRIPT: 1, STYLE: 1 };
  function appendLines(el, s) {
    String(s).split('\n').forEach(function (line, i) {
      if (i) el.appendChild(doc.createElement('br'));
      el.appendChild(doc.createTextNode(line));
    });
    return el;
  }
  function setText(el, v) {
    var s = String(v);
    if (s.indexOf('\n') < 0 || NO_BR[el.nodeName] || el.namespaceURI !== 'http://www.w3.org/1999/xhtml') { el.textContent = s; return el; }
    el.textContent = '';
    return appendLines(el, s);
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function sym(cls, id) {
    var svg = doc.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = doc.createElementNS(SVGNS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }
  function icon(name, extra) { return sym('icon' + (extra ? ' ' + extra : ''), 'i-' + name); }
  function glyph(code, extra) {
    var c = String(code || '').toLowerCase();
    if (c === 'whitespace') c = 'ws';
    if (c === 'prospect') c = 'pr';
    return sym('glyph g-' + c + (extra ? ' ' + extra : ''), 'g-' + c);
  }
  function kbd(text) { return h('span', { class: 'kbd', 'aria-hidden': 'true', text: text }); }
  function monogram(m) { return h('span', { class: 'mono-badge', text: m || '—' }); }

  function safe(fn, ctx, args) {
    if (typeof fn !== 'function') return undefined;
    try { return fn.apply(ctx, args || []); }
    catch (e) { report(e); return undefined; }
  }
  function report(e) {
    if (root.console) root.console.error('[MCD.app]', e);
    flashReadout(T.internalError, 'error');
    errorToast();
  }
  function reduced() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function mq(q) { return !!(root.matchMedia && root.matchMedia(q).matches); }
  function isTyping(t) {
    if (!t || t === doc.body) return false;
    var tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!t.isContentEditable;
  }
  function debounce(fn, ms) {
    var t = null;
    var d = function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { t = null; fn.apply(self, a); }, ms); };
    d.cancel = function () { clearTimeout(t); t = null; };
    return d;
  }
  function raf(fn) { return (root.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(fn); }

  /* Motion language (COPY_STYLE_EN item 38): MCD.motion (motion.js) holds the numbers, tokens.css the same as CSS
     properties. The chrome moves with opacity and transforms only; under prefers-reduced-motion everything cuts. */
  var DUR_FALLBACK = { fast: 180, base: 300, slow: 500 };
  /* the entrance of a section's own panels (shell.css; sections.css for older sheets): the end of these, and only
     these, means the panels have landed where the free map area is measured */
  var PANEL_ENTRANCE = /^(mo-sec-in|sec-slide)$/;
  function motionMs(k) { var m = MCD.motion; return (m && m.dur && m.dur[k]) || DUR_FALLBACK[k]; }
  function stillMotion() { var m = MCD.motion; return m && typeof m.reduced === 'function' ? !!m.reduced() : reduced(); }
  function afterPaint(fn) {
    var m = MCD.motion;
    if (m && typeof m.afterPaint === 'function') return m.afterPaint(fn);
    var t = setTimeout(fn, 34);
    return function () { clearTimeout(t); };
  }
  /** Content blocks fade in and rise, 35 ms apart (item 38: drawer content staggered 30–40 ms per block). */
  function staggerIn(els, opts) {
    var m = MCD.motion;
    return m && typeof m.stagger === 'function' ? m.stagger(els, opts) : null;
  }
  /** An overlay (menu, dialog, scrim) leaves with a short fade (--dur-fast, ease-in-out) and is removed after it.
      It is inert and lets clicks through at once, so nothing can be used while it fades. */
  function exitThenRemove(el) {
    if (!el || !el.parentNode) return;
    if (stillMotion() || el.__mcdGone) { el.remove(); return; }
    el.__mcdGone = true;
    el.setAttribute('inert', '');
    dropIds(el);                                   // a dialog opened again at once owns its ids (mcd-pal-0, mcd-modal-t)
    el.classList.add('is-leaving');
    setTimeout(function () { el.remove(); }, motionMs('fast') + 40);
  }
  /** MCD.windows (item 43, assets/js/windows.js): the progressive cards. Every hook below is guarded; without the module
      the shell behaves as in v4. */
  function winApi() { var w = MCD.windows; return w && typeof w === 'object' && typeof w.active === 'function' ? w : null; }
  function winActive() { var w = winApi(); return !!(w && safe(w.active, w)); }
  function dropIds(el) {
    if (!el || !el.removeAttribute) return;
    el.removeAttribute('id');
    if (el.querySelectorAll) Array.prototype.forEach.call(el.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
  }
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '');
  }
  function lcFirst(s) { s = String(s == null ? '' : s); return s.charAt(0).toLowerCase() + s.slice(1); }
  function F() { return MCD.util.fmt; }
  function cfg() { return MCD.config || {}; }
  function st() { return MCD.state.get(); }
  function pmode() { var p = st().privacy; return p.veil ? 'veil' : (p.reveal ? 'reveal' : 'masked'); }
  function view() { return S.booted && st().view === 'deep' ? 'deep' : 'overview'; }
  function isDeep() { return view() === 'deep'; }
  function storageGet(k, d) { try { return MCD.util.storage.get(k, d); } catch (e) { return d; } }
  function storageSet(k, v) { try { return MCD.util.storage.set(k, v); } catch (e) { return false; } }
  function copyText(text) {
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) return root.navigator.clipboard.writeText(text);
    return new Promise(function (res, rej) {
      var ta = h('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
      ta.value = text;
      doc.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) res(); else rej(new Error('copy'));
    });
  }
  /** true when a bank dataset (not the public reference data) holds records */
  function hasData(keys) {
    var d = MCD.data || {};
    var list = keys && keys.length ? keys : (typeof d.bankKeys === 'function' ? d.bankKeys() : ['lvm', 'edc', 'sekolah']);
    return list.some(function (k) { return Array.isArray(d[k]) && d[k].length > 0; });
  }

  /* ------------------------------------------------------------ closure state */

  var SESSION = null;      // { key, salt, iter, payload } — this closure only (gate addendum §2.2)

  var S = {
    booted: false, mapOK: false,
    nav: [], byId: {},
    cur: null,             // { id, entry, mod, host, ctx, cleanups, page }
    derived: null, dirty: {}, raf: 0,
    navEl: null, sectionRoot: null, overlay: null,
    readout: null, live: null, top: {},
    furniture: null, legend: null, legendBody: null, telemetry: null, legendHidden: false,
    mc: null, mcExtra: null,
    pop: null, palette: null, help: null, modal: null, drawer: null, drawerSel: null,
    toastEl: null, toastTimer: 0, flashTimer: 0,
    revealTimer: 0, hiddenAt: 0,
    theme: 'night', themeChosen: null,
    commands: {}, pendingFiles: [], vaultInfo: { count: 0, keys: [], pending: [] },
    banner: null,
    errToast: null, errToastAt: 0, errToastTimer: 0,
    pendingAction: null, viewPending: false,
    places: {},            // A-09: active tab and panel scroll per section + view (memory only)
    prevSection: null,     // ctx.cameFrom()
    mapSeen: false,        // the first map section sets its camera without a flight (A-03)
    telemetryOn: false,    // the coordinate line shows only on request (A-12)
    savedAt: 0,            // last successful "Simpan salinan terenkripsi" (A-11)
    tabbarEl: null
  };

  // Demo data switch (product decision 7). In memory only: never in the hash or storage,
  // so it is off at every sign-in, lock and reload.
  var DEMO_SYNTH = 'assets/js/data-synthetic.js';
  var DEMO = { on: false, busy: false, scripts: [], loaded: {}, tagged: [], guarded: [], listeners: [] };

  /* ===================================================================== GATE */

  function blockGate() {
    doc.documentElement.classList.add('mcd-locked');
    var btn = h('button', { type: 'button', class: 'btn btn--secondary', text: T.reload });
    btn.addEventListener('click', function () { root.location.reload(); });
    var card = h('div', { class: 'boot-block__card', role: 'alert', 'aria-labelledby': 'boot-block-title' }, [
      h('p', { class: 'boot-block__eyebrow t-eyebrow' }, [icon('lock'), T.blockEyebrow]),
      h('h1', { class: 'boot-block__title', id: 'boot-block-title', text: T.blockTitle }),
      h('p', { class: 'boot-block__body', text: T.blockGate }),
      h('p', { class: 'boot-block__foot t-mono', text: T.blockFoot }),
      h('div', { class: 'modal__actions' }, [btn])
    ]);
    doc.body.insertBefore(h('section', { id: 'gate', class: 'boot-block' }, [card]), doc.body.firstChild);
  }

  function fatal(message) {
    var btn = h('button', { type: 'button', class: 'btn btn--secondary', text: T.reload });
    btn.addEventListener('click', function () { root.location.reload(); });
    var card = h('div', { class: 'boot-block__card', role: 'alert' }, [
      h('p', { class: 'boot-block__eyebrow t-eyebrow' }, [icon('warn'), T.blockEyebrow]),
      h('h1', { class: 'boot-block__title', text: T.fatalTitle }),
      h('p', { class: 'boot-block__body', text: message }),
      h('div', { class: 'modal__actions' }, [btn])
    ]);
    doc.body.appendChild(h('section', { class: 'boot-block boot-block--fatal' }, [card]));
  }

  /**
   * Theme sync (16 Oct 2026): before the sign-in the saved Terang / Gelap choice goes on <html data-theme>, so the
   * sign-in screen matches the dashboard. gate.js keeps no storage and honours that attribute; without a saved
   * choice it follows the system, as the dashboard does. Read only: nothing is written, nothing else starts.
   */
  function preTheme() {
    var t = storedTheme();
    if (!t) return;
    doc.documentElement.setAttribute('data-theme', t);
    var cs = doc.querySelector && doc.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute('content', t === 'day' ? 'light' : 'dark');
    var tc = doc.querySelector && doc.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', t === 'day' ? '#F4F1EA' : '#05080F');
  }

  function start() {
    preTheme();
    if (!MCD.gate || typeof MCD.gate.mount !== 'function') { blockGate(); return; }
    try {
      MCD.gate.mount({
        vault: root.MCD_VAULT,
        onUnlock: function (session) { onUnlock(session); }
      });
    } catch (e) {
      if (root.console) root.console.error('[MCD.app] gate mount failed:', e && e.name);
      blockGate();
    }
  }

  function onUnlock(session) {
    if (S.booted || !session) return;
    SESSION = { key: session.key, salt: session.salt, iter: session.iter, payload: session.payload || {} };
    initSeal();
    boot().catch(function (e) {
      if (root.console) root.console.error('[MCD.app] boot failed', e && e.name, e && e.message);
      fatal(e && e.code === 'D3' ? T.fatalD3 : T.fatalBoot);
    });
  }

  /**
   * v6 (V6_SPEC §7.2–§7.4): the encrypted follow-up stores open with the key the gate derived at this sign-in. Called
   * once, right after SESSION is set and before the boot mounts the first section. MCD.seal keeps {key, salt, iter} in
   * its own closure and refuses a second call; it gets only the follow-up copy of the payload (payload.followups,
   * merged once per save of the encrypted file, D15), never the datasets. Asynchronous: a follow-up written before the
   * stores are open is applied after the load (the pipeline API). Without MCD.seal (an old page) nothing happens and
   * the sections keep their follow-ups in memory only.
   */
  function initSeal() {
    var SL = MCD.seal;
    if (!SL || typeof SL.init !== 'function' || !SESSION) return;
    var fu = SESSION.payload && SESSION.payload.followups;
    try {
      var p = SL.init({ key: SESSION.key, salt: SESSION.salt, iter: SESSION.iter, payload: { followups: fu && typeof fu === 'object' ? fu : null } });
      if (p && typeof p.then === 'function') p.then(null, function (e) { if (root.console) root.console.warn('[MCD.app] encrypted follow-ups not opened:', e && e.name); });
    } catch (e) {
      if (root.console) root.console.warn('[MCD.app] encrypted follow-ups not opened:', e && e.name);
    }
  }

  /* ===================================================================== BOOT */

  /** §J.3 step 1: inject the mirror for every missing CDN global (same SRI), 8 s timeout. */
  function ensureLibs() {
    var cdn = cfg().cdn || {};
    var want = ['maplibre', 'deck', 'd3', 'papa'].filter(function (k) { return cdn[k] && !root[cdn[k].global]; });
    if (!want.length) return Promise.resolve();
    return Promise.all(want.map(function (k) {
      var lib = cdn[k];
      return new Promise(function (resolve) {
        var s = doc.createElement('script');
        var done = false;
        var fin = function () { if (done) return; done = true; resolve(); };
        s.src = lib.mirror; s.integrity = lib.integrity; s.crossOrigin = 'anonymous'; s.async = false;
        s.onload = fin; s.onerror = fin;
        setTimeout(fin, cdn.loadTimeoutMs || 8000);
        doc.head.appendChild(s);
      });
    })).then(function () {
      if (!root.d3) { var e = new Error('d3 unavailable'); e.code = 'D3'; throw e; }
    });
  }

  function boot() {
    if (S.booted) return Promise.resolve();
    S.booted = true;
    var t0 = now();
    return ensureLibs().then(function () {
      // 2 · settings (localStorage, try/catch inside config), then vault config (memory only)
      safe(cfg().loadSettings, cfg());
      var ds = (SESSION.payload && SESSION.payload.datasets) || {};
      if (Object.prototype.hasOwnProperty.call(ds, 'config') && cfg().applyUserFields) safe(cfg().applyUserFields, cfg(), [ds.config, { source: 'vault' }]);
      if (root.MCD_SME_PLAYS && root.MCD_SME_PLAYS.meta && cfg().mergePrograms) safe(cfg().mergePrograms, cfg(), [root.MCD_SME_PLAYS.meta.newPrograms]);
      // 3 · URL hash (or mcd.lastView) → state, then the Day / Night theme (U7)
      // A-10 / D14: after sign-in the app always opens Ringkasan (Sederhana) with no distance filter, unless the
      // link itself names a section (#s=…). mcd.lastView may still be written for "Salin tautan".
      var linkNamesSection = /(^|[#&])s=/.test(String(root.location.hash || ''));
      MCD.state.init({ hash: true });
      if (!linkNamesSection) {
        safe(MCD.state.set, MCD.state, [{ section: 'overview', view: 'overview', filters: { radiusKm: null } }, { source: 'boot', history: 'replace' }]);
      }
      initTheme();
      // 4 · vault datasets, then public reference data only (U3: no synthetic records)
      S.vaultInfo = applyVault(SESSION.payload);
      if (MCD.data && typeof MCD.data.loadReference === 'function') safe(MCD.data.loadReference, MCD.data);
      // 5 · shell
      buildShell();
      // 6 · map
      initMap();
      // 7 · section + first derive/render
      wireState();
      mountSection(st().section, { boot: true });
      flush();
      MCD.debug = MCD.debug || {};
      MCD.debug.timings = Object.assign(MCD.debug.timings || {}, { boot: Math.round(now() - t0) });
      if (!MCD.debug.fps) MCD.debug.fps = function (on) { if (MCD.map && MCD.map.showFps) MCD.map.showFps(on !== false); };
      MCD.debug.places = function () { return JSON.parse(JSON.stringify(S.places)); };   /* tab and scroll memory (A-09) */
      selfTest();
    });
  }
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }

  /* ----------------------------------------------------------- vault (§4) */

  // Gate addendum §4 + property P10: every dataset MCD.data knows replaces the
  // empty dataset through the importer path; `config` merged above (memory
  // only); MCD_* keys replace window globals. Unknown keys: name logged only.
  function applyVault(payload) {
    var out = { count: 0, keys: [], pending: [] };
    var ds = payload && payload.datasets;
    if (!ds || typeof ds !== 'object') return out;
    // data date of each dataset, saved next to it by saveEncrypted (older vaults have none)
    var dm = (payload.meta && payload.meta.datasets) || {};
    Object.keys(ds).forEach(function (k) {
      var v = ds[k];
      if (k === 'config') { out.keys.push(k); return; }
      if (/^MCD_[A-Z0-9_]+$/.test(k)) { root[k] = v; out.keys.push(k); return; }
      var dk = MCD.data && MCD.data.keyFor ? MCD.data.keyFor(k) : null;
      if (!dk || !Array.isArray(v)) { if (root.console) root.console.warn('[MCD.app] unknown vault key ignored:', k); return; }
      out.keys.push(k);
      var asOf = (dm[k] && dm[k].asOf) || undefined;
      if (MCD.importer && typeof MCD.importer.applyDataset === 'function') safe(MCD.importer.applyDataset, MCD.importer, [k, v, { file: 'vault', source: 'vault', asOf: asOf }]);
      else if (MCD.data && typeof MCD.data.replace === 'function') safe(MCD.data.replace, MCD.data, [k, v, { file: 'vault', source: 'vault', asOf: asOf }]);
      else out.pending.push(k);
    });
    out.count = out.keys.length;
    return out;
  }

  // "Save encrypted copy" (gate addendum §5). The key never leaves this closure.
  function saveEncrypted() {
    var s = SESSION;
    if (DEMO.on) { toast(T.demoBlocked, 'warn'); return Promise.reject(new Error(T.demoBlocked)); }
    if (!s || !MCD.vault || !MCD.gate) return Promise.reject(new Error(T.sessionMissing));
    var datasets = (MCD.importer && MCD.importer.exportImportedDatasets) ? MCD.importer.exportImportedDatasets() : {};
    var prev = s.payload.datasets || {};
    if (Object.prototype.hasOwnProperty.call(prev, 'config')) datasets.config = prev.config;
    Object.keys(prev).forEach(function (k) { if (/^MCD_[A-Z0-9_]+$/.test(k)) datasets[k] = prev[k]; });
    // Keep each dataset's data date (phase 2 data request 2): a dataset reopened from the
    // vault shows its real position date, not the day it was saved. File and sheet names only.
    var realSets = MCD.data && MCD.data.real ? safe(MCD.data.real, MCD.data) || {} : {};
    var prevDm = (s.payload.meta && s.payload.meta.datasets) || {}, dm = {};
    Object.keys(datasets).forEach(function (k) {
      var dk = MCD.data && MCD.data.keyFor ? MCD.data.keyFor(k) || k : k;
      var m = (realSets[k] && realSets[k].meta) || (realSets[dk] && realSets[dk].meta);
      if (!m) return;
      dm[k] = m.source === 'vault' && prevDm[k] ? prevDm[k] : { asOf: m.asOf || null, file: m.file || null, sheet: m.sheet || null, importedAt: m.importedAt || null };
    });
    var next = Object.assign({}, s.payload, { saved: new Date().toISOString(), datasets: datasets, meta: Object.assign({}, s.payload.meta || {}, { datasets: dm }) });
    // v6 (V6_SPEC §7.5, D8, D15): the follow-up lists (entries and tombstones) travel inside the encrypted copy, so a
    // password change or another computer keeps them. Without an open seal the copy the payload already carried stays.
    var fu = followupsExport();
    if (fu) next.followups = fu;
    return MCD.vault.encryptWithKey(next, s.key, s.salt, s.iter)
      .then(function (v) { return MCD.vault.decryptWithKey(v, s.key).then(function () { return v; }); })
      .then(function (v) { MCD.gate.downloadVault(v, 'vault.js'); S.savedAt = Date.now(); followupsSaved(fu); toast(T.vaultSaved); updateTopStatus(); return true; },
        function (e) { toast(T.vaultFail, 'warn'); throw e; });
  }
  /** MCD.seal.vaultExport() → {v: 1, saved, stores} | null (null: no seal, not open, or nothing to carry). */
  function followupsExport() {
    var SL = MCD.seal;
    if (!SL || typeof SL.vaultExport !== 'function') return null;
    var fu = safe(SL.vaultExport, SL);
    return fu && typeof fu === 'object' && fu.stores && typeof fu.stores === 'object' ? fu : null;
  }
  /** After the file is written: MCD.seal sets every store's vaultSeen to this copy's `saved` (D15), so the copy is
      never merged back on this computer. The contract name is vaultSaved(saved); setVaultSeen(saved) is accepted too. */
  function followupsSaved(fu) {
    var SL = MCD.seal;
    if (!fu || !SL) return;
    var fn = typeof SL.vaultSaved === 'function' ? SL.vaultSaved : (typeof SL.setVaultSeen === 'function' ? SL.setVaultSeen : null);
    if (!fn) return;
    try {
      var p = fn.call(SL, fu.saved || null);
      if (p && typeof p.then === 'function') p.then(null, function () { /* the next save sets it again */ });
    } catch (e) { /* the next save sets it again */ }
  }

  function exposeSession() {
    MCD.session = Object.freeze({
      isOpen: function () { return !!SESSION; },
      datasetNames: function () { return S.vaultInfo.keys.slice(); },
      /* datasets imported in this session and not yet written to an encrypted copy (A-11, the "Data belum disimpan" chip) */
      pendingDatasets: function () { return unsavedDatasets(); },
      vaultPending: function () { return S.vaultInfo.pending.slice(); },
      savedAt: function () { return S.savedAt || null; },
      note: function () { return SESSION && SESSION.payload ? (SESSION.payload.note || null) : null; },
      saveEncrypted: saveEncrypted
    });
  }

  /* ================================================================ THEME (U7) */

  function storedTheme() { var v = storageGet(THEME_KEY, null); return v === 'day' || v === 'night' ? v : null; }
  function systemTheme() { return mq('(prefers-color-scheme: light)') ? 'day' : 'night'; }
  function initTheme() {
    S.themeChosen = storedTheme();
    applyTheme(S.themeChosen || systemTheme(), { silent: true });
    try {
      var m = root.matchMedia && root.matchMedia('(prefers-color-scheme: light)');
      var follow = function () { if (!S.themeChosen) applyTheme(systemTheme()); };
      if (m && m.addEventListener) m.addEventListener('change', follow); else if (m && m.addListener) m.addListener(follow);
    } catch (e) { /* older browsers: the stored or initial theme stays */ }
  }
  function applyTheme(t, opts) {
    if (t !== 'day' && t !== 'night') t = 'night';
    S.theme = t;
    doc.documentElement.setAttribute('data-theme', t);
    var cs = doc.querySelector && doc.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute('content', t === 'day' ? 'light' : 'dark');
    var tc = doc.querySelector && doc.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', t === 'day' ? '#F4F1EA' : '#05080F');
    if (MCD.charts && MCD.charts.tokens && typeof MCD.charts.tokens.refresh === 'function') safe(MCD.charts.tokens.refresh);
    if (S.mapOK && MCD.map.setTheme) safe(MCD.map.setTheme, MCD.map, [t]);
    syncThemeSwitch();
    if (!opts || !opts.silent) schedule(['theme']);
  }
  function setThemeChoice(t) {
    S.themeChosen = t;
    storageSet(THEME_KEY, t);
    applyTheme(t);
    announce('Tema ' + (t === 'day' ? T.day : T.night));
  }

  /* ======================================================= DEMO DATA (decision 7) */

  function demoOn() { return DEMO.on; }

  /** Loads one same-origin script once (script-src 'self'); resolves when it has run. */
  function injectScript(src) {
    if (DEMO.loaded[src]) return DEMO.loaded[src];
    DEMO.loaded[src] = new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src; s.async = false;
      s.addEventListener('load', function () { resolve(); });
      s.addEventListener('error', function () { delete DEMO.loaded[src]; if (s.parentNode) s.parentNode.removeChild(s); reject(new Error('Could not load ' + src)); });
      doc.body.appendChild(s);
    });
    return DEMO.loaded[src];
  }
  /* ============================================== LAZY DATA AND FOCUS (v3, 16 Oct 2026) */

  /**
   * MCD.app.lazy(name) → Promise: large public data that only some screens need is injected once, after sign-in.
   *   'street-index'  data/street-index.js (3.6 MB, OpenStreetMap streets per kelurahan), then MCD.geocodeLocal.init;
   *                   resolves with MCD.geocodeLocal (ready to locate). Load it only when LVM data exists.
   *   'travel-routes' data/travel-routes.js (1.2 MB, the road trees behind every "x,x km · ± y menit", item 36), then
   *                   MCD.travel.loadRoutes(window.MCD_TRAVEL_ROUTES); resolves with MCD.travel (route() ready).
   *                   Preloaded when Merchant, Sekolah or KPR opens (item 41, MCD.distance.preload, never on Ringkasan
   *                   or Data & Privasi); MCD.distance.route() still calls it, so a route asked for before the preload
   *                   finished loads it then (that first route fits once more after landing).
   *   v6 (item 45, V6_SPEC §9.1), public files for Sekolah, Kampus and Ringkasan; each resolves with its global as it
   *   is (the adapters live in the lanes: MCD.schools.students, MCD.inst, MCD.campus):
   *   'school-students'   data/school-students.js → MCD_SCHOOL_STUDENTS (SMA, SMK, MA within 30 km; 1,1 MB)
   *   'institution-tiers' data/institution-tiers.js → MCD_INSTITUTION_TIERS (kelas biaya; 0,4 MB)
   *   'school-contacts'   data/school-contacts.js → MCD_SCHOOL_CONTACTS (office contacts; 1,2 MB)
   *   'campuses'          data/campuses.js → MCD_CAMPUSES (Kampus; 0,8 MB)
   * Rejects before sign-in, for an unknown name, or when the file cannot load (a later call tries again). A load that
   * lands fires the document event 'mcd:lazy' {name} (Cari refreshes its results with it).
   */
  var LAZY = {
    'travel-routes': {
      src: 'data/travel-routes.js',
      present: function () { return !!root.MCD_TRAVEL_ROUTES; },
      init: function () {
        var TR = MCD.travel;
        if (!root.MCD_TRAVEL_ROUTES) throw new Error('travel routes not loaded');
        if (!TR || typeof TR.loadRoutes !== 'function') throw new Error('MCD.travel not available');
        if (!TR.loadRoutes(root.MCD_TRAVEL_ROUTES)) throw new Error('travel routes not usable');
        return TR;
      }
    },
    'street-index': {
      src: 'data/street-index.js',
      present: function () { return !!root.MCD_STREET_INDEX; },
      init: function () {
        var G = MCD.geocodeLocal;
        if (!root.MCD_STREET_INDEX) throw new Error('street index not loaded');
        if (!G || typeof G.init !== 'function') return null;
        G.init({ index: root.MCD_STREET_INDEX, admin: root.MCD_ADMIN_AREAS || null });
        if (typeof G.ready === 'function' && !G.ready()) throw new Error('street index not usable');
        return G;
      }
    },
    /* v6 (V6_SPEC §1.0, §9.1): never linked in index.html; never fetched (a classic script, so file:// works) */
    'school-students': dataLazy('data/school-students.js', 'MCD_SCHOOL_STUDENTS'),
    'institution-tiers': dataLazy('data/institution-tiers.js', 'MCD_INSTITUTION_TIERS'),
    'school-contacts': dataLazy('data/school-contacts.js', 'MCD_SCHOOL_CONTACTS'),
    'campuses': dataLazy('data/campuses.js', 'MCD_CAMPUSES')
  };
  /** A v6 data file: present() = its global is on the page; init() checks only that the file is usable (rows is an
      array, meta.generated is set) and returns the global untouched (no transformation; adapters live in the lanes). */
  function dataLazy(src, global) {
    return {
      src: src,
      global: global,
      present: function () { return !!root[global]; },
      init: function () {
        var g = root[global];
        if (!g || typeof g !== 'object') throw new Error(global + ' not loaded');
        if (!Array.isArray(g.rows) || !g.meta || !g.meta.generated) throw new Error(global + ' not usable');
        return g;
      }
    };
  }
  var LAZY_LOADS = {};
  function lazy(name) {
    var spec = Object.prototype.hasOwnProperty.call(LAZY, name) ? LAZY[name] : null;
    if (!spec) return Promise.reject(new Error('unknown lazy data: ' + name));
    if (!S.booted) return Promise.reject(new Error('locked'));
    if (LAZY_LOADS[name]) return LAZY_LOADS[name];
    var p = (spec.present() ? Promise.resolve() : injectScript(spec.src)).then(function () { return spec.init(); });
    LAZY_LOADS[name] = p;
    p.then(function () { lazyLanded(name); }, function () { if (LAZY_LOADS[name] === p) delete LAZY_LOADS[name]; });
    return p;
  }
  /** 'mcd:lazy' {name} on document once a lazy file is in (Cari shows the names it holds); never throws. */
  function lazyLanded(name) {
    try {
      var d = root.document;
      if (!d || typeof d.dispatchEvent !== 'function' || typeof root.CustomEvent !== 'function') return;
      d.dispatchEvent(new root.CustomEvent('mcd:lazy', { detail: { name: name } }));
    } catch (e) { /* nobody listens */ }
  }

  /**
   * MCD.app.focus({section, kind, id, view?, lon?, lat?}) → boolean: opens the section and runs its action
   * 'focus:<kind>:<id>' once it is mounted (the section flies its map to the point, about zoom 16, and opens the
   * popup). Kinds: 'sma' (npsn, or the app school id; v6: SMK and MA rows too), 'poi' (MCD_SME_POIS row), 'lvm' (store
   * id), 'project' (KPR), and v6 'pt' with section 'campus' (V6_SPEC §6.11: id = the 6-digit kode PT or the campus row id
   * 'pt:<kode>' / 'osm:…' / 'ovt:…'; Kampus runs 'focus:pt:<id>'). With lon / lat, the shell flies to the point itself
   * when the section does not handle the action.
   */
  function focusItem(o) {
    if (!S.booted || !o || !S.byId[o.section]) return false;
    var kind = String(o.kind == null ? '' : o.kind), id = o.id == null ? '' : String(o.id);
    if (!/^[a-z][a-z0-9_-]*$/i.test(kind) || !id) return false;
    var lon = Number(o.lon), lat = Number(o.lat);
    var hasPt = o.lon != null && o.lat != null && isFinite(lon) && isFinite(lat);
    var W0 = winApi();
    if (W0) safe(W0.origin, W0, ['focus']);                       /* item 43: asked for by name → the sheet, no callout */
    navigate(o.section, {
      view: o.view,
      action: 'focus:' + kind + ':' + id,
      fallback: hasPt ? function () {
        if (!S.mapOK || !MCD.map || !postureDeck()) return;
        if (typeof MCD.map.focusPoint === 'function') MCD.map.focusPoint({ lon: lon, lat: lat, zoom: 16, kind: kind, id: id });
        else if (typeof MCD.map.flyTo === 'function') MCD.map.flyTo({ lon: lon, lat: lat, zoom: 16 });
      } : null
    });
    return true;
  }

  /** data-synthetic.js first (unless already present), then every registered demo script, in order. */
  function loadDemoScripts() {
    var list = (MCD.synth ? [] : [DEMO_SYNTH]).concat(DEMO.scripts);
    return list.reduce(function (p, src) { return p.then(function () { return injectScript(src); }); }, Promise.resolve());
  }

  function demoSet(want) {
    want = !!want;
    if (!S.booted) return Promise.resolve(false);
    if (DEMO.busy) return DEMO.busy;
    if (want === DEMO.on) return Promise.resolve(DEMO.on);
    if (!want) { demoApply(false); return Promise.resolve(false); }
    syncDemoSwitch(true);
    DEMO.busy = loadDemoScripts().then(function () {
      // one frame for the busy state to paint before the synthetic records are generated
      return new Promise(function (res) { setTimeout(res, 30); });
    }).then(function () {
      demoApply(true);
      return true;
    }).catch(function (e) {
      if (root.console) root.console.error('[MCD.app] demo data', e && e.message);
      toast(T.demoFail, 'warn');
      return false;
    }).then(function (v) { DEMO.busy = false; syncDemoSwitch(false); return v; });
    return DEMO.busy;
  }

  function demoApply(on) {
    closeDrawer(true);
    if (st().selection) MCD.state.set({ selection: null }, { history: 'none' });
    if (on) MCD.data.enterDemo(); else MCD.data.exitDemo();
    DEMO.on = on;
    doc.body.classList.toggle('is-demo', on);
    if (S.banner) S.banner.hidden = !on;
    syncDemoSwitch(false);
    refreshDemoMarks();
    applyLayout();
    schedule(['data', 'demo']);
    announce(on ? T.demoOnSaid : T.demoOffSaid);
    if (!on) toast(T.demoOffSaid);                  // switching on: the banner itself says it
    DEMO.listeners.slice().forEach(function (fn) { safe(fn, null, [on]); });
    try { doc.dispatchEvent(new root.CustomEvent('mcd:demo', { detail: { on: on } })); } catch (e) { /* older browsers: MCD.demo.on() still fires */ }
  }

  /** Re-applies every DEMO tag and export guard after the switch moves; drops detached nodes. */
  function refreshDemoMarks() {
    DEMO.tagged = DEMO.tagged.filter(function (x) { return x.el.isConnected; });
    DEMO.tagged.forEach(function (x) { paintTag(x.el, x.opts); });
    DEMO.guarded = DEMO.guarded.filter(function (x) { return x.el.isConnected; });
    DEMO.guarded.forEach(function (x) { paintGuard(x); });
  }

  /** MCD.demo.tag(el, {inline, before, when}) — the small "DEMO" mark. Follows the switch by itself. */
  function demoTag(el, opts) {
    if (!el || el.nodeType !== 1) return el;
    opts = opts || {};
    var known = DEMO.tagged.filter(function (x) { return x.el === el; })[0];
    if (known) known.opts = opts; else DEMO.tagged.push({ el: el, opts: opts });
    paintTag(el, opts);
    return el;
  }
  function paintTag(el, opts) {
    var want = DEMO.on && (opts.when == null || !!opts.when);
    var mark = null;
    for (var i = 0; i < el.children.length; i++) if (el.children[i].classList.contains('demo-tag')) { mark = el.children[i]; break; }
    if (!want) {
      if (mark) mark.remove();
      el.classList.remove('has-demo-tag', 'has-demo-tag--corner');
      return;
    }
    if (!mark) {
      mark = h('span', { class: 'demo-tag' + (opts.inline ? ' demo-tag--inline' : ' demo-tag--corner'), title: T.demoTagTitle, text: T.demoTag });
      if (opts.before && opts.before.parentNode === el) el.insertBefore(mark, opts.before); else el.appendChild(mark);
    }
    el.classList.add('has-demo-tag');
    if (!opts.inline) {
      el.classList.add('has-demo-tag--corner');
      try { if (root.getComputedStyle(el).position === 'static') el.style.position = 'relative'; } catch (e) { /* detached */ }
    }
  }

  /** MCD.demo.guard(button) — disables an export / save control while demo data is on. */
  function demoGuard(el) {
    if (!el || el.nodeType !== 1) return el;
    var known = DEMO.guarded.filter(function (x) { return x.el === el; })[0];
    if (!known) { known = { el: el, title: el.getAttribute('title'), was: !!el.disabled }; DEMO.guarded.push(known); }
    paintGuard(known);
    return el;
  }
  function paintGuard(x) {
    var el = x.el;
    if (DEMO.on) {
      if (!el.classList.contains('is-demo-locked')) { x.title = el.getAttribute('title'); x.was = !!el.disabled; }
      el.classList.add('is-demo-locked');
      if ('disabled' in el) el.disabled = true;
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('title', T.demoBlocked);
    } else if (el.classList.contains('is-demo-locked')) {
      el.classList.remove('is-demo-locked');
      if ('disabled' in el) el.disabled = x.was;
      el.removeAttribute('aria-disabled');
      if (x.title) el.setAttribute('title', x.title); else el.removeAttribute('title');
    }
  }
  /** true (and a toast) when an export must not run because demo data is on. */
  function demoBlocks() {
    if (!DEMO.on) return false;
    toast(T.demoBlocked, 'warn');
    return true;
  }
  /** Before an import: offers to switch demo data off. Resolves true when demo data is off. */
  function demoEnsureOff() {
    if (!DEMO.on) return Promise.resolve(true);
    return confirmModal({ title: T.demoAskTitle, body: T.demoAskBody, ok: T.demoAskOk, cancel: T.cancel }).then(function (yes) {
      if (!yes) return false;
      return demoSet(false).then(function () { return !DEMO.on; });
    });
  }

  function demoSwitchEl(extra) {
    var b = h('button', { type: 'button', class: 'demo-switch' + (extra ? ' ' + extra : ''), role: 'switch', 'aria-checked': DEMO.on ? 'true' : 'false', title: DEMO.on ? T.demoOnHint : T.demoOffHint }, [
      h('span', { class: 'demo-switch__track', 'aria-hidden': 'true' }, [h('span', { class: 'demo-switch__knob' })]),
      h('span', { class: 'demo-switch__label', text: T.demoSwitch })
    ]);
    b.addEventListener('click', function () { demoSet(!DEMO.on); });
    return b;
  }
  function syncDemoSwitch(busy) {
    var list = doc.querySelectorAll ? doc.querySelectorAll('.demo-switch') : [];
    Array.prototype.forEach.call(list, function (b) {
      b.setAttribute('aria-checked', DEMO.on ? 'true' : 'false');
      b.setAttribute('aria-busy', busy ? 'true' : 'false');
      b.classList.toggle('is-busy', !!busy);
      b.title = busy ? T.demoLoading : (DEMO.on ? T.demoOnHint : T.demoOffHint);
    });
  }

  function buildBanner() {
    var off = h('button', { type: 'button', class: 'btn demo-banner__off', 'aria-label': T.demoTurnOff }, [icon('close', 'icon--12'), h('span', { text: T.demoTurnOff })]);
    off.addEventListener('click', function () { demoSet(false); });
    S.banner = h('div', { id: 'demo-banner', class: 'demo-banner', role: 'status', hidden: true }, [
      h('span', { class: 'demo-banner__icon', 'aria-hidden': 'true' }, [icon('warn')]),
      h('p', { class: 'demo-banner__t' }, [h('strong', { text: T.demoBannerLead }), h('span', { text: T.demoBannerRest })]),
      off
    ]);
    doc.body.insertBefore(S.banner, doc.body.firstChild);
  }

  // Public API (no-ops before unlock). Sections: docs/INTEGRATION_NOTES.md "Demo mode API".
  MCD.demo = {
    isOn: function () { return DEMO.on; },
    /** set(bool) → Promise<boolean> (the state after the switch) */
    set: function (on) { return demoSet(on); },
    toggle: function () { return demoSet(!DEMO.on); },
    isBusy: function () { return !!DEMO.busy; },
    /** registerScript('assets/js/<name>.js'): an extra demo script, injected after data-synthetic.js when demo data is switched on. */
    registerScript: function (path) {
      var p = String(path || '');
      if (!/^assets\/js\/[a-z0-9][a-z0-9._-]*\.js$/i.test(p) || p.indexOf('..') >= 0) return false;
      if (DEMO.scripts.indexOf(p) < 0 && p !== DEMO_SYNTH) DEMO.scripts.push(p);
      if (DEMO.on && !DEMO.busy) injectScript(p).catch(function () { toast(T.demoFail, 'warn'); });
      return true;
    },
    scripts: function () { return [DEMO_SYNTH].concat(DEMO.scripts); },
    tag: function (el, opts) { return demoTag(el, opts); },
    guard: function (el) { return demoGuard(el); },
    blocks: function () { return demoBlocks(); },
    exportsAllowed: function () { return !DEMO.on; },
    ensureOff: function () { return S.booted ? demoEnsureOff() : Promise.resolve(true); },
    on: function (fn) {
      if (typeof fn !== 'function') return function () {};
      DEMO.listeners.push(fn);
      return function () { DEMO.listeners = DEMO.listeners.filter(function (f) { return f !== fn; }); };
    },
    switchEl: function () { return S.booted ? demoSwitchEl('demo-switch--block') : null; }
  };

  /* ================================================================= VIEW (U6) */

  function setView(v) {
    if (v !== 'overview' && v !== 'deep') return;
    if (v === view()) return;
    MCD.state.set({ view: v }, { history: 'push' });
  }
  /**
   * Sederhana ⇄ Detail (item 38): the switch's thumb slides (viewSwitchEl), the old panels start to fade at once
   * (compositor), the map dims a little while its basemap changes, and the remount runs after that frame is on
   * screen, so the click answers within one frame even when Detail takes a while to build. The new panels then
   * rise in like any section switch. When the section changes in the same step (navigate(id, {view})), the section
   * mount does the work: one mount, never two. Reduced motion: an instant cut, still after the first frame (the
   * click answers at once; nothing fades or dims).
   */
  var viewSwitchTimer = 0, viewCancel = null;
  function onViewChange(keys) {
    var v = view(), prev = v === 'deep' ? 'overview' : 'deep';
    doc.body.setAttribute('data-view', v);
    S.viewFrom = prev;
    syncViewSwitch();
    closePopover();
    announce(v === 'deep' ? T.viewDeep : T.viewOverview);
    if (viewCancel) { viewCancel(); viewCancel = null; }
    var calm = stillMotion();
    /* the basemap switch (street ⇄ satellite, about 60 ms) also waits for the first faded frame; it still runs before
       the remount (its rAF callback was queued first), as it always did */
    var mapView = function () { if (S.mapOK && MCD.map.setView && view() === v) safe(MCD.map.setView, MCD.map, [v]); };
    if (!S.cur) mapView(); else afterPaint(mapView);
    clearTimeout(viewSwitchTimer);
    if (!calm) {
      doc.body.classList.add('is-view-switching');
      viewSwitchTimer = setTimeout(function () { doc.body.classList.remove('is-view-switching'); }, motionMs('base') + 60);
    } else doc.body.classList.remove('is-view-switching');
    if (keys && keys.indexOf('section') >= 0) { S.viewPending = false; return; }   // mountSection(new section) follows
    S.viewPending = true;
    function remount() {
      viewCancel = null;
      S.viewPending = false;
      if (S.cur) mountSection(S.cur.id, { force: true });
      renderMapControls();
      updateFurniture();
      schedule(['view']);
    }
    if (!S.cur) { remount(); return; }
    fadeHost(S.cur.host);
    viewCancel = afterPaint(remount);
  }

  /* ==================================================================== SHELL */

  function buildShell() {
    S.nav = navTable();
    S.nav.forEach(function (n) { S.byId[n.id] = n; });
    S.sectionRoot = doc.getElementById('section-root');
    S.sectionRoot.setAttribute('tabindex', '-1');
    S.overlay = doc.getElementById('overlay-root');
    doc.body.setAttribute('data-view', view());
    ['topbar', 'navrow', 'readout'].forEach(function (id) { var el = doc.getElementById(id); if (el) el.classList.add('bar'); });
    var ro = doc.getElementById('readout');
    if (ro) ro.removeAttribute('aria-live');                 // announcements go through the debounced live region
    exposeSession();
    buildBanner();
    buildTopbar();
    buildNav();
    buildReadout();
    buildFurniture();
    buildDropzone();
    S.live = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    doc.body.appendChild(S.live);
    wireGlobal();
    wireSlideovers();
  }

  /* ------------------------------------------- slide-over panels (open issue 2, A-05) */
  /*
   * Between 600 and 1279 px the right rails, the left rail (below 1024 px) and any [data-slideover] panel slide in
   * from the edge. While closed they are made inert and aria-hidden, so Tab never reaches their hidden buttons;
   * opening one moves focus into it, closing it returns focus to the button that opened it.
   * data-slideover-label="Buka daftar & grafik" adds a 40 px edge tab that opens the panel.
   */
  var SLIDE_SEL = '.rail--l, .rail--r, [data-slideover]';
  function slideMode() { return mq('(min-width: 600px) and (max-width: 1279px)'); }
  function focusables(el) {
    return Array.prototype.slice.call(el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function (x) { return x.offsetWidth > 0 || x.offsetHeight > 0; });
  }
  function offscreen(el) {
    var r = el.getBoundingClientRect(), vw = root.innerWidth || 0;
    return r.width > 0 && (r.left >= vw - 2 || r.right <= 2);
  }
  function syncSlideovers(changed) {
    var host = S.sectionRoot;
    if (!host || !host.querySelectorAll) return;
    var on = slideMode();
    Array.prototype.forEach.call(host.querySelectorAll(SLIDE_SEL), function (el) {
      var open = el.classList.contains('is-open');
      var closed = on && !open && offscreen(el);
      var was = el.hasAttribute('inert');
      if (closed) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else if (was || el.getAttribute('aria-hidden') === 'true') { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
      el.__mcdOpen = el.__mcdOpen || false;
      if (on && changed && changed.indexOf(el) >= 0) {
        if (open && !el.__mcdOpen) {
          el.__mcdOpener = doc.activeElement && !el.contains(doc.activeElement) ? doc.activeElement : el.__mcdOpener;
          var f = focusables(el)[0];
          if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
        } else if (!open && el.__mcdOpen) {
          var back = el.__mcdOpener;
          if (back && back.isConnected && (el.contains(doc.activeElement) || doc.activeElement === doc.body)) { try { back.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        }
      }
      el.__mcdOpen = open;
      edgeTab(el, on && !open && !!el.getAttribute('data-slideover-label'));
    });
  }
  function edgeTab(el, show) {
    var tab = el.__mcdEdge;
    if (!show) { if (tab) tab.hidden = true; return; }
    if (!tab) {
      tab = h('button', { type: 'button', class: 'edge-tab', title: el.getAttribute('data-slideover-label') }, [icon('chev-l'), h('span', { class: 'edge-tab__t', text: el.getAttribute('data-slideover-label') })]);
      tab.addEventListener('click', function () {
        var label = el.getAttribute('data-slideover-label'), host = S.cur && S.cur.host, opener = null;
        if (host) Array.prototype.forEach.call(host.querySelectorAll('[data-slideover-open], button'), function (b) {
          if (opener || el.contains(b) || b === tab) return;
          if (b.hasAttribute('data-slideover-open') || norm(b.textContent).trim() === norm(label).trim()) opener = b;
        });
        el.__mcdOpener = tab;
        if (opener) opener.click(); else el.classList.add('is-open');
      });
      S.overlay.appendChild(tab);
      el.__mcdEdge = tab;
      if (S.cur) { var c = S.cur; c.cleanups.push(function () { if (tab.parentNode) tab.parentNode.removeChild(tab); }); }
    }
    tab.hidden = false;
  }
  function wireSlideovers() {
    var later = null, root0 = S.sectionRoot;
    if (!root0 || typeof root.MutationObserver !== 'function') return;
    var mo = new root.MutationObserver(function (list) {
      var changed = [];
      list.forEach(function (m) {
        var t = m.target;
        if (m.type === 'attributes' && t.matches && t.matches(SLIDE_SEL)) changed.push(t);
      });
      if (changed.length) syncSlideovers(changed);
      clearTimeout(later);
      later = setTimeout(function () { syncSlideovers(null); }, 340);   // after the slide transition
    });
    mo.observe(root0, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    root.addEventListener('resize', debounce(function () { syncSlideovers(null); }, 150));
  }

  function navTable() {
    return (cfg().sections || []).map(function (s, i) {
      return {
        id: s.id, key: String(s.key), index: i + 1, label: s.label || s.title || s.id, short: s.short || s.label || s.id,
        title: s.title || s.label, full: s.titleFull || s.title || s.label, help: s.help || '',
        sheets: s.sheets || [], layout: s.layout || 'sheet', posture: s.posture || {},
        kind: s.layout === 'rails' ? 'rails' : ((s.posture && s.posture.imagery === 'dimmed') ? 'dim' : 'sheet'),
        cfg: s
      };
    });
  }

  var ICONS = { overview: 'sec-overview', merchants: 'sec-merchants', schools: 'sec-schools', campus: 'sec-campus', property: 'sec-property', data: 'sec-data' };

  /* ----------------------------------------------------------- top bar */

  function segBtn(label, iconName, hint, pressed) {
    return h('button', { type: 'button', class: 'vswitch__opt', role: 'radio', 'aria-checked': pressed ? 'true' : 'false', title: hint },
      [iconName ? icon(iconName) : null, h('span', { class: 'vswitch__label', text: label })]);
  }

  /** Bank Mandiri primary mark (reverse, on the navy band) and the Danantara Indonesia lockup (DESIGN_DIRECTION_V2 §2, §4). */
  function mandiriMark() {
    return h('img', { class: 'brand-logo brand__logo', src: 'assets/brand/mandiri-logo-reverse.png', alt: T.mandiriAlt,
      width: '479', height: '140', decoding: 'async', draggable: 'false' });
  }
  function danantaraLockup(extra) {
    return h('span', { class: 'brand-lockup' + (extra ? ' ' + extra : '') }, [
      h('span', { class: 'brand-lockup__t', text: T.danantaraLead }),
      h('img', { src: 'assets/brand/danantara-logo-reverse.png', alt: T.danantaraAlt, width: '531', height: '140', decoding: 'async', draggable: 'false' })
    ]);
  }

  function buildTopbar() {
    var top = doc.getElementById('topbar');
    top.classList.add('brand-band');
    // Top band (UX fix plan §2.2): Mandiri logo · "Dashboard Akuisisi / KCP Jakarta Cilangkap (12903)" · Cari ·
    // Terang/Gelap · Data contoh · Bantuan · (Data belum disimpan) · Kunci · Danantara. The view switch lives in each
    // section header since 16 Oct 2026 (D2), so the band no longer carries it.
    var brand = h('div', { class: 'brand' }, [
      mandiriMark(),
      h('span', { class: 'brand__div', 'aria-hidden': 'true' }),
      h('p', { class: 'brand__title' }, [
        h('span', { class: 'brand__product', text: T.brandProduct }),
        h('span', { class: 'brand__branch' }, [h('span', { class: 'brand__long', text: T.brandBranch }), h('span', { class: 'brand__short', text: T.brandBranchShort })])
      ])
    ]);

    var t = S.top, keyK = IS_MAC ? '⌘K' : 'Ctrl+K';
    t.palette = h('button', { type: 'button', class: 'tb-search', title: T.search + ' · ' + keyK, 'aria-label': T.searchField,
      'aria-keyshortcuts': IS_MAC ? 'Meta+K' : 'Control+K' }, [
      icon('search'), h('span', { class: 'tb-search__t', text: T.searchLabel }), h('span', { class: 'tb-search__s', text: T.searchShort }),
      h('span', { class: 'tb-search__w', text: T.search }),
      h('span', { class: 'tb-search__k', 'aria-hidden': 'true', text: keyK })
    ]);
    t.palette.addEventListener('click', function () { openPalette(); });
    t.theme = h('button', { type: 'button', class: 'tb-ctl tb-theme', 'aria-keyshortcuts': 'N' }, [
      h('span', { class: 'tb-theme__i' }), h('span', { class: 'tb-ctl__l tb-theme__l' })
    ]);
    t.theme.addEventListener('click', function () { setThemeChoice(S.theme === 'day' ? 'night' : 'day'); });
    t.status = h('span', { class: 'tb-status', title: T.noDataTitle }, [h('span', { class: 'tb-status__dot', 'aria-hidden': 'true' }), h('span', { class: 'tb-status__t', text: T.noData })]);
    t.revealBadge = h('span', { class: 'badge badge--reveal', hidden: true }, [h('span', { text: T.revealBadge }), h('span', { class: 'badge__more', text: T.revealBadgeMore })]);
    // privacy tools: they live in each section's "⋯" menu; these hidden buttons keep the old hooks working
    t.veil = h('button', { type: 'button', class: 'btn btn--ghost tb-veil', hidden: true, 'aria-pressed': 'false', title: T.veilTitle }, [icon('veil'), h('span', { text: T.veilBtn })]);
    t.veil.addEventListener('click', toggleVeil);
    t.reveal = h('button', { type: 'button', class: 'btn btn--ghost tb-reveal', hidden: true, 'aria-pressed': 'false', title: T.revealOff }, [icon('id'), h('span', { text: T.revealBtn })]);
    t.reveal.addEventListener('click', toggleReveal);
    t.help = h('button', { type: 'button', class: 'tb-ctl tb-help', title: T.help + ' (?)', 'aria-label': T.help, 'aria-keyshortcuts': '?' },
      [h('span', { class: 'tb-btn__q', 'aria-hidden': 'true', text: '?' }), h('span', { class: 'tb-ctl__l', text: T.help })]);
    t.help.addEventListener('click', function () { openHelp(); });
    t.unsaved = h('button', { type: 'button', class: 'tb-unsaved', hidden: true, title: T.unsavedTitle }, [icon('warn'), h('span', { class: 'tb-ctl__l', text: T.unsaved })]);
    t.unsaved.addEventListener('click', function () { navigate('data', { view: 'deep', action: 'data:save' }); });
    t.lock = h('button', { type: 'button', class: 'tb-ctl tb-lock', 'aria-label': T.lockAria,
      title: T.lockAria + ' · ' + (IS_MAC ? '⌘⇧L' : 'Ctrl+Shift+L'), 'aria-keyshortcuts': IS_MAC ? 'Meta+Shift+L' : 'Control+Shift+L' },
      [icon('lock'), h('span', { class: 'tb-ctl__l', text: T.lock })]);
    t.lock.addEventListener('click', lock);
    t.menu = h('button', { type: 'button', class: 'tb-ctl tb-menu', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': T.menu, title: T.menu },
      [icon('menu'), h('span', { class: 'tb-ctl__l', text: T.menu })]);
    t.menu.addEventListener('click', function () { if (S.pop && S.pop.anchor === t.menu) closePopover(); else openPhoneMenu(t.menu); });

    // Data contoh (decision 7, D6): in the band, off at every sign-in; on phones inside the ☰ menu
    t.demo = demoSwitchEl('tb-demo');
    t.danantara = danantaraLockup('tb-danantara');
    var right = h('div', { class: 'tb-right' }, [t.revealBadge, t.palette, t.theme, t.demo, t.help, t.unsaved, t.lock, t.menu, t.danantara]);
    clear(top);
    append(top, h('div', { class: 'tb' }, [brand, right]));
    syncThemeSwitch();
  }

  /** ☰ Menu on phones (< 600 px): Terang/Gelap, Data contoh, Bantuan, Kunci (D6). */
  function openPhoneMenu(anchor) {
    openMenu(anchor, function () {
      return [
        { kind: 'action', label: S.theme === 'day' ? T.night : T.day, run: function () { setThemeChoice(S.theme === 'day' ? 'night' : 'day'); } },
        // The menu closes after the switch: the demo banner that appears (or goes) above the band confirms the state, and
        // an open menu would stay anchored to where the band was before the banner moved it.
        { kind: 'toggle', label: T.demoSwitch, checked: DEMO.on, run: function () { closePopover(); try { anchor.focus({ preventScroll: true }); } catch (e) { /* ignore */ } demoSet(!DEMO.on); } },
        { kind: 'sep' },
        { kind: 'action', label: T.search, run: function () { openPalette(); } },
        { kind: 'action', label: T.help, run: function () { openHelp(); } },
        { kind: 'action', label: T.lock, run: function () { lock(); } }
      ];
    }, { label: T.menu, align: 'right', kind: 'menu-phone' });
  }

  /* the view switch lives in each section header (D2); this keeps the header switches in step */
  function syncViewSwitch() {
    var v = view();
    Array.prototype.forEach.call(doc.querySelectorAll ? doc.querySelectorAll('.pg-vswitch .vswitch__opt') : [], function (b) {
      var on = b.getAttribute('data-view') === v;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    /* the switch that was clicked slides its thumb at once, while its panel fades out (item 38) */
    Array.prototype.forEach.call(doc.querySelectorAll ? doc.querySelectorAll('.pg-vswitch.has-thumb') : [], function (sw) {
      placeThumb(sw, S.viewFrom && S.viewFrom !== v ? S.viewFrom : null);
    });
    syncCrumbs();
  }
  function syncThemeSwitch() {
    var t = S.top;
    if (!t || !t.theme) return;
    var day = S.theme === 'day', i = t.theme.querySelector('.tb-theme__i'), l = t.theme.querySelector('.tb-theme__l');
    if (i) { clear(i); i.appendChild(icon(day ? 'sun' : 'moon')); }
    if (l) l.textContent = day ? T.day : T.night;
    t.theme.setAttribute('aria-label', T.themeAria + ': ' + (day ? T.day : T.night) + '. ' + T.themeSwitchTo(day ? 'night' : 'day'));
    t.theme.title = T.themeSwitchTo(day ? 'night' : 'day');
  }

  function updateTopStatus() {
    var t = S.top;
    if (!t.status) return;
    var any = hasData();
    var asOf = MCD.data && MCD.data.asOf;
    t.status.classList.toggle('is-empty', !any && !DEMO.on);
    t.status.classList.toggle('is-demo', DEMO.on);
    t.status.querySelector('.tb-status__t').textContent = DEMO.on ? T.demoStatus : (any ? T.asOfLead + F().date(asOf || cfg().asOfDemo) : T.noData);
    t.status.title = DEMO.on ? T.demoTagTitle : (any ? T.asOfLead + F().date(asOf || cfg().asOfDemo) + ' · ' + (cfg().asOfTimeLabel || '08.00 WIB') : T.noDataTitle);
    var p = st().privacy;
    t.veil.classList.toggle('is-on', !!p.veil);
    t.veil.setAttribute('aria-pressed', p.veil ? 'true' : 'false');
    t.revealBadge.hidden = !p.reveal;
    t.reveal.classList.toggle('is-on', !!p.reveal);
    t.reveal.setAttribute('aria-pressed', p.reveal ? 'true' : 'false');
    t.reveal.title = p.reveal ? T.revealOn : T.revealOff;
    doc.body.classList.toggle('is-veil', !!p.veil);
    doc.body.classList.toggle('is-reveal', !!p.reveal);
    if (t.unsaved) {
      var un = unsavedDatasets().length > 0;
      if (t.unsaved.hidden === un) { t.unsaved.hidden = !un; doc.body.classList.toggle('has-unsaved', un); }
    }
  }

  /** Real datasets imported in this session and not yet written to an encrypted copy (A-11). */
  function unsavedDatasets() {
    var real = MCD.data && typeof MCD.data.real === 'function' ? (safe(MCD.data.real, MCD.data) || {}) : {};
    return Object.keys(real).filter(function (k) {
      var r = real[k], m = r && r.meta;
      if (!m || m.source !== 'import' || !(r.rows && r.rows.length)) return false;
      var at = Date.parse(m.importedAt || '') || 0;
      return !S.savedAt || at > S.savedAt;
    });
  }

  /* ------------------------------------------------------- section row (U5, A-07) */

  function buildNav() {
    var host = doc.getElementById('navrow');
    if (!host) {                                          // older index.html: create the row after the top bar
      host = h('nav', { id: 'navrow', class: 'bar', 'aria-label': T.sectionsAria });
      var tb = doc.getElementById('topbar');
      if (tb && tb.parentNode) tb.parentNode.insertBefore(host, tb.nextSibling); else doc.body.appendChild(host);
    }
    host.setAttribute('aria-label', T.sectionsAria);
    var list = h('ol', { class: 'nav' });
    var bar = h('ol', { class: 'tabbar__list' });
    S.nav.forEach(function (n) {
      var b = h('button', { type: 'button', class: 'nav__btn', id: 'tab-' + n.id, 'data-section': n.id,
        'aria-keyshortcuts': n.key, title: n.label + ' · ' + T.keyHint(n.key) }, [
        h('span', { class: 'nav__icon', 'aria-hidden': 'true' }, [icon(ICONS[n.id] || 'target')]),
        h('span', { class: 'nav__label' }, [h('span', { class: 'nav__long', text: n.label }), h('span', { class: 'nav__short', text: n.short })])
      ]);
      b.addEventListener('click', function () { navigate(n.id); });
      list.appendChild(h('li', { class: 'nav__item' }, [b]));
      // phones (< 600 px): the same six sections in a fixed bottom tab bar (A-15; v6: six columns, short labels)
      var tb2 = h('button', { type: 'button', class: 'tabbar__btn', 'data-section': n.id, title: n.label }, [
        icon(ICONS[n.id] || 'target'), h('span', { class: 'tabbar__l', text: n.id === 'data' ? n.short : n.label })
      ]);
      tb2.addEventListener('click', function () { navigate(n.id); });
      bar.appendChild(h('li', null, [tb2]));
    });
    /* item 38: one underline that slides to the chosen section (section row) and one marker per tab-bar column (phones) */
    S.navInk = h('li', { class: 'nav__ink', role: 'presentation', 'aria-hidden': 'true' });
    list.appendChild(S.navInk);
    S.tabInk = h('li', { class: 'tabbar__ink', role: 'presentation', 'aria-hidden': 'true' });
    S.tabInk.style.width = (100 / Math.max(1, S.nav.length)) + '%';   /* one column per section shown */
    bar.appendChild(S.tabInk);
    clear(host);
    host.appendChild(list);
    if (S.top.status) host.appendChild(h('div', { class: 'navrow__end' }, [S.top.status]));
    S.navEl = list;
    var tabbar = doc.getElementById('tabbar') || h('nav', { id: 'tabbar', class: 'tabbar', 'aria-label': T.sectionsAria });
    clear(tabbar);
    tabbar.appendChild(bar);
    if (!tabbar.parentNode) doc.body.appendChild(tabbar);
    S.tabbarEl = bar;
  }

  function syncNav(toId) {
    if (!S.navEl) return;
    var id = toId || (S.cur && S.cur.id);
    Array.prototype.forEach.call(S.navEl.querySelectorAll('.nav__btn'), function (b) {
      var on = b.getAttribute('data-section') === id;
      if (on) {
        b.setAttribute('aria-current', 'page');
        var host = S.navEl.parentNode, l = b.parentNode.offsetLeft, r = l + b.parentNode.offsetWidth;
        if (host && host.scrollWidth > host.clientWidth) {
          if (l < host.scrollLeft) host.scrollLeft = l - 16; else if (r > host.scrollLeft + host.clientWidth) host.scrollLeft = r - host.clientWidth + 16;
        }
      } else b.removeAttribute('aria-current');
    });
    if (S.tabbarEl) Array.prototype.forEach.call(S.tabbarEl.querySelectorAll('.tabbar__btn'), function (b) {
      if (b.getAttribute('data-section') === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    syncNavInk(false, id);
  }
  /** The section row's underline slides to the chosen section; on phones the tab bar's marker moves one column per step
      (translateX in its own widths: no measuring). The first placing, and a resize (jump), do not move. */
  function syncNavInk(jump, toId) {
    var id = toId || (mountQ.to) || (S.cur && S.cur.id), i = -1;
    S.nav.forEach(function (n, k) { if (n.id === id) i = k; });
    if (S.tabInk && i >= 0) {
      S.tabInk.style.transform = 'translateX(' + (i * 100) + '%)';
      if (!S.tabInkSet) { S.tabInkSet = true; S.tabInk.style.transition = 'none'; void S.tabInk.offsetWidth; S.tabInk.style.transition = ''; }
      if (S.tabbarEl && S.tabbarEl.classList) S.tabbarEl.classList.add('has-ink');
    }
    var b = S.navEl && id ? S.navEl.querySelector('.nav__btn[data-section="' + id + '"]') : null;
    if (!S.navInk || !b) return;
    var w = b.offsetWidth - 12;
    if (!(w > 0)) return;                                   /* the row is hidden (phones): the button's own underline stays */
    S.navInk.style.top = (b.offsetTop + b.offsetHeight + 1) + 'px';
    inkTo(S.navInk, b.offsetLeft + 6, w, !jump && S.navInk.__inkW != null);
    S.navEl.classList.add('has-ink');
  }

  var hoverDeb = null;
  function hover(hv) {
    if (mq('(hover: none)')) return;                     // §D.7: no hover cross-highlight on touch
    if (!hoverDeb) hoverDeb = debounce(function (x) { MCD.state.set({ hover: x }, { source: 'hover', history: 'none' }); }, 40);
    hoverDeb(hv || null);
  }

  /* ---------------------------------------------------------- popover infra */

  function positionPopover(pop, anchor, align) {
    var r = anchor.getBoundingClientRect(), vw = root.innerWidth, vh = root.innerHeight;
    pop.style.visibility = 'hidden';
    pop.style.left = '0px'; pop.style.top = '0px'; pop.style.maxHeight = '';
    var w = pop.offsetWidth, natural = pop.offsetHeight;      /* measured before any height limit */
    var left = align === 'right' ? r.right - w : r.left;
    left = Math.max(16, Math.min(left, vw - w - 16));
    var below = vh - r.bottom - 8 - 16, above = r.top - 8 - 16;
    pop.style.left = Math.round(left) + 'px';
    if (natural > below && above > below) {                     // the menu fits better above its button (the "Peta" menu)
      var hgt = Math.min(natural, above);
      pop.style.top = Math.round(r.top - 8 - hgt) + 'px';
      pop.style.maxHeight = Math.round(hgt) + 'px';
      pop.setAttribute('data-side', 'top');                     // it grows from its button: up here, down below
    } else {
      pop.style.top = Math.round(r.bottom + 8) + 'px';
      pop.style.maxHeight = Math.max(160, Math.round(below)) + 'px';
      pop.setAttribute('data-side', 'bottom');
    }
    pop.style.transformOrigin = (align === 'right' ? 'right ' : 'left ') + (pop.getAttribute('data-side') === 'top' ? 'bottom' : 'top');
    pop.style.visibility = '';
  }

  function closePopover() {
    var p = S.pop;
    if (!p) return false;
    S.pop = null;
    if (p.el && p.el.parentNode) exitThenRemove(p.el);
    if (p.anchor) p.anchor.setAttribute('aria-expanded', 'false');
    if (p.onClose) safe(p.onClose);
    return true;
  }

  /** Generic menu popover: items [{label, checked?, kind:'toggle'|'radio'|'action'|'sep'|'title', run}] */
  function openMenu(anchor, items, opts) {
    closePopover();
    opts = opts || {};
    var pop = h('div', { class: 'popover menu', role: 'menu', 'aria-label': opts.label || '' });
    function render() {
      clear(pop);
      items().forEach(function (it) {
        if (it.kind === 'sep') { pop.appendChild(h('div', { class: 'popover__sep', role: 'separator' })); return; }
        if (it.kind === 'title') { pop.appendChild(h('div', { class: 'menu__title t-eyebrow', text: it.label })); return; }
        var role = it.kind === 'toggle' ? 'menuitemcheckbox' : (it.kind === 'radio' ? 'menuitemradio' : 'menuitem');
        var b = h('button', { type: 'button', class: 'popover__item', role: role, disabled: it.disabled ? true : null, title: it.title || null },
          [it.kind === 'toggle' || it.kind === 'radio' ? h('span', { class: 'menu__check' + (it.kind === 'radio' ? ' menu__check--radio' : ''), 'aria-hidden': 'true' }) : null,
           h('span', { class: 'menu__label', text: it.label }), it.key ? kbd(it.key) : null]);
        if (role !== 'menuitem') b.setAttribute('aria-checked', it.checked ? 'true' : 'false');
        b.addEventListener('click', function () { it.run(); if (it.kind === 'action') closePopover(); else render(); });
        pop.appendChild(b);
      });
    }
    render();
    pop.addEventListener('keydown', function (e) {
      var list = Array.prototype.slice.call(pop.querySelectorAll('.popover__item:not([disabled])'));
      var i = list.indexOf(doc.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var j = (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; if (list[j]) list[j].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePopover(); anchor.focus(); }
    });
    S.overlay.appendChild(pop);
    S.pop = { kind: opts.kind || 'menu', el: pop, anchor: anchor, update: render };
    anchor.setAttribute('aria-expanded', 'true');
    positionPopover(pop, anchor, opts.align);
    var first = pop.querySelector('.popover__item');
    if (first) first.focus({ preventScroll: true });
  }

  /** "?" help tip next to a section title (U8): a small popover with plain words and a Close button. */
  function openTip(anchor, title, paras, bullets) {
    if (S.pop && S.pop.anchor === anchor) { closePopover(); return; }
    closePopover();
    var closeB = h('button', { type: 'button', class: 'btn btn--secondary btn--bar' }, [icon('close'), h('span', { text: T.close })]);
    var pop = h('div', { class: 'popover tipcard', role: 'dialog', 'aria-label': title }, [
      h('p', { class: 'tipcard__title', text: title }),
      (paras || []).filter(Boolean).map(function (p) { return h('p', { class: 'tipcard__p', text: p }); }),
      bullets && bullets.length ? h('ul', { class: 'tipcard__list' }, bullets.map(function (b) { return h('li', { text: b }); })) : null,
      h('div', { class: 'tipcard__foot' }, [closeB])
    ]);
    closeB.addEventListener('click', function () { closePopover(); anchor.focus(); });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePopover(); anchor.focus(); } });
    S.overlay.appendChild(pop);
    S.pop = { kind: 'tip', el: pop, anchor: anchor };
    anchor.setAttribute('aria-expanded', 'true');
    positionPopover(pop, anchor);
    closeB.focus({ preventScroll: true });
  }

  /* ======================================================== READOUT (§D.6) */

  function buildReadout() {
    var text = h('span', { class: 'readout__text' });
    var note = h('span', { class: 'readout__note t-mono-10 c-3', hidden: true });
    var distBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--xs readout__undo', hidden: true, text: T.distAll });
    distBtn.addEventListener('click', function () { MCD.state.set({ filters: { radiusKm: null } }); });
    var copy = h('button', { type: 'button', class: 'btn btn--ghost btn--xs', title: T.copyLinkTitle }, [icon('copy', 'icon--12'), h('span', { text: T.copyLink })]);
    copy.addEventListener('click', function () {
      copyText(root.location.href).then(function () { toast(T.linkCopied); }, function () { toast(T.copyFail, 'warn'); });
    });
    var q = h('p', { class: 'readout__q' }, [h('span', { class: 'readout__caret', 'aria-hidden': 'true', text: '›' }), text]);
    var r = h('div', { class: 'readout' }, [q, note, distBtn, S.top.veil || null, S.top.reveal || null, copy]);
    var host = doc.getElementById('readout');
    clear(host);
    host.appendChild(r);
    S.readout = { root: r, text: text, note: note, dist: distBtn, q: q };
  }

  var announce = debounce(function (msg) { if (S.live) S.live.textContent = msg; }, LIVE_MS);

  /** Deep dive readout: "› Section title · within N km of the branch — data note". Sections keep their own filters. */
  function updateReadout() {
    if (!S.readout || S.flashTimer) return;
    var s = st(), entry = S.byId[s.section] || {}, parts = [entry.title || s.section];
    if (s.filters && s.filters.radiusKm != null) parts.push('dalam ' + s.filters.radiusKm + ' km dari Mabes TNI');
    var right = DEMO.on ? T.demoStatus : (hasData() ? T.asOfLead + F().date((MCD.data && MCD.data.asOf) || cfg().asOfDemo) : T.noData);
    var t = S.readout.text;
    clear(t);
    parts.forEach(function (seg, i) {
      if (i) t.appendChild(h('span', { class: 'readout__sep', text: ' · ' }));
      t.appendChild(h('b', { text: seg }));
    });
    t.appendChild(h('span', { class: 'readout__sep', text: ' — ' }));
    t.appendChild(h('span', { text: right }));
    S.readout.q.title = parts.join(' · ') + ' — ' + right;
    S.readout.note.hidden = true;
    S.readout.dist.hidden = !(s.filters && s.filters.radiusKm != null);
  }

  function flashReadout(msg, kind) {
    if (!S.readout) return;
    clearTimeout(S.flashTimer);
    clear(S.readout.text);
    S.readout.text.appendChild(h('span', { class: kind === 'error' ? 'readout__err' : 'readout__flash', text: msg }));
    S.readout.root.classList.toggle('is-error', kind === 'error');
    if (kind === 'error') toast(msg, 'warn');
    S.flashTimer = setTimeout(function () { S.flashTimer = 0; S.readout.root.classList.remove('is-error'); updateReadout(); }, kind === 'error' ? 8000 : 2400);
  }

  /* =========================================================== TOAST (status) */

  function toast(msg, kind) {
    if (!S.toastEl) {
      S.toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
      doc.body.appendChild(S.toastEl);
      void S.toastEl.offsetWidth;                  /* the first toast also fades in (its hidden state is computed first) */
    }
    clearTimeout(S.toastTimer);
    setText(S.toastEl, msg);
    S.toastEl.className = 'toast is-on' + (kind === 'warn' ? ' toast--warn' : '');
    S.toastTimer = setTimeout(function () { S.toastEl.className = 'toast'; }, 3600);
  }

  /**
   * Global error toast (coordinator request 2): one calm, dismissible line, never a stack
   * trace, at most one per 10 s. The details go to the browser console.
   */
  var ERROR_TOAST_GAP_MS = 10000;
  function errorToast() {
    if (!S.booted || !doc.body) return;
    var t = now();
    if (S.errToastAt && t - S.errToastAt < ERROR_TOAST_GAP_MS) return;
    S.errToastAt = t;
    if (!S.errToast) {
      var close = h('button', { type: 'button', class: 'errtoast__close', title: T.dismiss, 'aria-label': T.dismiss }, [icon('close')]);
      close.addEventListener('click', hideErrorToast);
      var el = h('div', { class: 'errtoast', role: 'alert', hidden: true }, [
        h('span', { class: 'errtoast__icon', 'aria-hidden': 'true' }, [icon('warn')]),
        h('p', { class: 'errtoast__t', text: T.errorToast }),
        close
      ]);
      el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideErrorToast(); } });
      doc.body.appendChild(el);
      S.errToast = el;
    }
    S.errToast.hidden = false;
    afterPaint(function () { if (S.errToast && !S.errToast.hidden) S.errToast.classList.add('is-on'); });   /* painted hidden first, so it fades in */
    clearTimeout(S.errToastTimer);
    S.errToastTimer = setTimeout(hideErrorToast, 9000);
  }
  function hideErrorToast() {
    clearTimeout(S.errToastTimer);
    var el = S.errToast;
    if (!el) return;
    el.classList.remove('is-on');
    setTimeout(function () { if (!el.classList.contains('is-on')) el.hidden = true; }, motionMs('fast') + 40);
  }

  /* =============================== MAP FURNITURE: legend, telemetry, controls */

  /*
   * Legend (U8, 15 Oct 2026): a compact glass pill "Legend ▸" docked bottom-left of the free map
   * area, above the map credits. A click (or L) expands it upward into a small panel that never
   * reaches the middle of the map; the open / closed choice is remembered per browser
   * (mcd.ui.legendHidden: true = folded to the pill, the default).
   */
  function buildFurniture() {
    var host = h('div', { class: 'section-host section-host--furniture', 'data-host': 'furniture' });
    S.legendBody = h('div', { class: 'pb legend__body', id: 'mcd-legend-body' });
    S.legendToggle = h('button', { type: 'button', class: 'legend__toggle', 'aria-expanded': 'false', 'aria-controls': 'mcd-legend-body',
      title: T.legendShow, 'aria-keyshortcuts': 'L' }, [
      icon('legend', 'legend__icon'),
      h('span', { class: 'legend__title', text: T.legend }),
      icon('chev-r', 'legend__chev'),
      h('span', { class: 'legend__fold', text: T.legendFold })
    ]);
    S.legendToggle.addEventListener('click', function () { setLegend(!legendVisible()); });
    S.legend = h('aside', { class: 'legend panel', 'aria-label': T.legend }, [S.legendBody, S.legendToggle]);
    S.telemetry = h('div', { class: 'telemetry' }, [h('span', { class: 'c-3', text: T.mapLoading })]);
    S.mc = { el: h('div', { class: 'mapctl panel panel--hi', role: 'toolbar', 'aria-label': T.mapCtlAria }), refs: null };
    append(host, [S.legend, S.telemetry, S.mc.el]);
    S.sectionRoot.appendChild(host);
    S.furniture = host;
    S.legendHidden = storageGet(LEGEND_KEY, true) !== false;      /* folded to the pill unless this browser opened it */
    syncLegend();
    renderMapControls();
  }

  /** true when the legend is expanded (the pill is always there while the map draws section layers) */
  function legendVisible() { return !S.legendHidden; }
  function syncLegend() {
    if (!S.legend) return;
    var open = legendVisible();
    S.legend.classList.toggle('is-open', open);
    S.legendBody.hidden = !open;
    S.legendToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    S.legendToggle.title = open ? T.legendHide : T.legendShow;
  }
  function setLegend(on) {
    S.legendHidden = !on;
    storageSet(LEGEND_KEY, S.legendHidden);
    syncLegend();
    updateFurniture();
    if (S.mapOK && MCD.map.relayoutLabels) safe(MCD.map.relayoutLabels, MCD.map);
  }

  /**
   * Does the map draw section layers right now? The posture in effect (config posture merged
   * with the section's registered posture, MCD.map.posture()) decides, so a section such as
   * Data & Privacy can turn its layer, legend and controls on in Deep dive only.
   */
  function postureDeck() {
    var c = S.cur && S.cur.entry;
    if (!S.mapOK || !c) return false;
    var eff = MCD.map && typeof MCD.map.posture === 'function' ? safe(MCD.map.posture, MCD.map) : null;
    if (eff && typeof eff === 'object') return eff.deck !== false;
    return !!(c.posture && c.posture.deck !== false);
  }
  function updateFurniture() {
    if (!S.furniture) return;
    var deck = postureDeck();
    S.legend.hidden = !deck;
    syncLegend();
    S.telemetry.hidden = !S.mapOK || !deck || !S.telemetryOn;
    S.mc.el.hidden = !S.mapOK || !deck;
    fitFurniture();
  }
  /**
   * A narrow map strip (for example beside a wide Detail sheet) cannot hold the legend (bottom-left) and the
   * map controls (bottom-right) side by side: the legend then docks above the controls. Below 900 px of free
   * map the controls show icons only, with tooltips and aria-labels (D5); the "Peta" menu says it all in words.
   */
  function fitFurniture() {
    var b = doc.body, pad = S.freePad;
    var freeW = pad ? root.innerWidth - (pad.left || 0) - (pad.right || 0) : root.innerWidth;
    if (S.mc) S.mc.el.classList.toggle('is-compact', freeW < 900 || root.innerWidth < 600);
    fitControlsHeight();
    b.style.setProperty('--mapctl-w', (S.mc && !S.mc.el.hidden ? Math.round(S.mc.el.offsetWidth || 0) : 0) + 'px');
    if (!pad || S.legend.hidden || S.mc.el.hidden || root.innerWidth < 1024) { b.classList.remove('is-map-narrow'); return; }
    var need = (legendVisible() ? 288 : (S.legend.offsetWidth || 120)) + (S.mc.el.offsetWidth || 56) + 40;
    b.classList.toggle('is-map-narrow', freeW < need);
    b.style.setProperty('--mapctl-h', Math.round(S.mc.el.offsetHeight || 0) + 'px');
  }
  /**
   * Item 43: the controls column (bottom-right of the free map) never climbs over "Warna asli" (top-right, Detail).
   * When the free height under the switch cannot hold the column, the place buttons go (they are in the "Peta" menu
   * too: is-short); still too tall, the buttons line up in a row of icons (is-row). Desktop only: tablets put the
   * column under the switch (shell.css).
   */
  function fitControlsHeight() {
    var el = S.mc && S.mc.el;
    if (!el) return;
    var pill = el.hidden || root.innerWidth < 1024 ? null : doc.querySelector('.map-colour');
    if (!pill || pill.hidden || !pill.offsetHeight) { el.classList.remove('is-short', 'is-row'); return; }
    var pr = pill.getBoundingClientRect(), cr = el.getBoundingClientRect();
    if (cr.left >= pr.right || cr.right <= pr.left) { el.classList.remove('is-short', 'is-row'); return; }   /* another corner */
    var room = cr.bottom - (pr.bottom + 8);
    var compact = el.classList.contains('is-compact'), short = el.classList.contains('is-short'), row = el.classList.contains('is-row');
    if (S.mcFit && S.mcFit.compact !== compact) S.mcFit = null;        /* heights measured in the other mode */
    var F = S.mcFit = S.mcFit || { compact: compact, full: 0, short: 0 };
    if (!short) F.full = cr.height; else if (!row) F.short = cr.height;
    if ((F.full || cr.height) <= room) { el.classList.remove('is-short', 'is-row'); return; }
    if (!short) { el.classList.add('is-short'); F.short = el.getBoundingClientRect().height; }
    el.classList.toggle('is-row', (F.short || cr.height) > room);
  }

  /** "Atur ulang peta": the section's own camera (sme15 for Merchant, ring30 for Sekolah and KPR), A-12. */
  function resetMap() {
    if (!S.mapOK) return;
    var eff = MCD.map.posture ? safe(MCD.map.posture, MCD.map) : null;
    var cam = (eff && typeof eff.camera === 'string' && eff.camera) || (S.cur && S.cur.entry.posture && S.cur.entry.posture.camera) || 'sme15';
    MCD.map.preset(cam);
  }

  /**
   * Map controls (A-12, D5): one bottom-right column of 40 px buttons — Atur ulang peta, Ke cabang, Ke Mabes TNI,
   * Perbesar, Perkecil and "Peta ▾" — plus the km scale bar. The "Peta" menu holds the distance views, the
   * section's own groups (ctx.mapControls extra) and the map layers, in words. The map is always flat and
   * north-up (COPY_STYLE_EN item 10): there is no 2D/3D, tilt or orbit control.
   */
  function renderMapControls() {
    if (!S.mc) return;
    var el = S.mc.el, refs = { extra: [] };
    clear(el);
    function btn(label, iconName, title, run, cls) {
      var b = h('button', { type: 'button', class: 'mapctl__btn' + (cls ? ' ' + cls : ''), title: title || label, 'aria-label': label },
        [icon(iconName), h('span', { class: 'mapctl__label', text: label })]);
      b.addEventListener('click', function () { safe(run); refreshMapControls(); });
      return b;
    }
    function preset(k) { return function () { if (S.mapOK) MCD.map.preset(k); }; }
    function zoom(d) { return function () { var m = S.mapOK && MCD.map.getMap && MCD.map.getMap(); if (m) { if (d > 0) m.zoomIn(); else m.zoomOut(); } }; }
    var mapB = h('button', { type: 'button', class: 'mapctl__btn mapctl__btn--menu', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      title: T.mapMenuHint, 'aria-label': T.mapMenu + ': ' + T.mapMenuHint }, [icon('sliders'), h('span', { class: 'mapctl__label', text: T.mapMenu }), icon('chev-u', 'mapctl__chev')]);
    mapB.addEventListener('click', function () { if (S.pop && S.pop.anchor === mapB) closePopover(); else openMapMenu(mapB); });
    var col = h('div', { class: 'mapctl__col', role: 'group', 'aria-label': T.mapCtlAria }, [
      btn(T.resetView, 'reset', T.resetView + ' (H)', resetMap),
      btn(T.zoomBranch, 'pin', T.zoomBranch + ' (B)', preset('B'), 'mapctl__btn--place'),
      btn(T.zoomMabes, 'target', T.zoomMabes + ' (M)', preset('M'), 'mapctl__btn--place'),
      h('div', { class: 'mapctl__pair' }, [btn(T.zoomIn, 'plus', T.zoomIn, zoom(1), 'mapctl__btn--zoom'), btn(T.zoomOut, 'minus', T.zoomOut, zoom(-1), 'mapctl__btn--zoom')]),
      mapB
    ]);
    var scale = h('span', { class: 'scalebar mapctl__scale', title: T.scaleTitle });
    append(el, [col, scale]);
    if (MCD.map && MCD.map.mountScale) safe(MCD.map.mountScale, MCD.map, [scale]);
    S.mc.refs = refs;
    refreshMapControls();
  }
  function refreshMapControls() {
    var r = S.mc && S.mc.refs;
    if (!r) return;
    S.mc.el.classList.toggle('is-disabled', !S.mapOK);
    if (S.pop && S.pop.kind === 'mapmenu' && S.pop.update) S.pop.update();
  }

  /** The "Peta" menu (A-12): Jarak · the section's groups ("Tampilkan: Kecamatan | Titik merchant", …) · Lapisan. */
  function openMapMenu(anchor) {
    var ex = S.mcExtra || {}, deep = isDeep();
    openMenu(anchor, function () {
      var L = st().map.layers, items = [{ kind: 'title', label: 'Tempat penting' },
        { kind: 'action', label: T.zoomBranch, key: 'B', run: function () { if (S.mapOK) MCD.map.preset('B'); } },
        { kind: 'action', label: T.zoomMabes, key: 'M', run: function () { if (S.mapOK) MCD.map.preset('M'); } },
        { kind: 'title', label: T.distance }];
      [['5', '5 km'], ['10', '10 km'], ['sme15', '15 km'], ['ring30', '30 km']].forEach(function (p) {
        items.push({ kind: 'action', label: p[1] + ' dari Mabes TNI', run: function () { if (S.mapOK) MCD.map.preset(p[0]); } });
      });
      var DS = MCD.distance;
      if (DS && typeof DS.setPeak === 'function' && typeof DS.setNoToll === 'function') {
        items.push({ kind: 'title', label: T.travelGroup });
        items.push({ kind: 'toggle', label: T.travelPeak, title: T.travelPeakTitle, checked: !!safe(DS.peakOn), run: function () { DS.setPeak(!DS.peakOn()); } });
        items.push({ kind: 'toggle', label: T.travelNoToll, title: T.travelNoTollTitle, checked: !!safe(DS.noTollOn), run: function () { DS.setNoToll(!DS.noTollOn()); } });
      }
      (ex.extra || []).forEach(function (g) {
        if (!deep && !g.overview) return;
        items.push({ kind: 'title', label: g.label || T.mapMenu });
        (g.items || []).forEach(function (it) {
          items.push({ kind: 'radio', label: it.label, title: it.title || null, checked: typeof it.pressed === 'function' ? !!safe(it.pressed) : false,
            run: function () { safe(it.run); } });
        });
      });
      function tog(k, label) { return { kind: 'toggle', label: label, checked: !!L[k], run: function () { var p = {}; p[k] = !L[k]; MCD.state.set({ map: { layers: p } }); } }; }
      items.push({ kind: 'title', label: T.layers });
      items.push(tog('labels', 'Nama jalan dan tempat'), tog('rings', 'Lingkar jarak'), tog('sites', 'Tempat penting'),
        tog('competitors', 'Bank lain'), tog('boundary', 'Batas Mabes TNI'));
      (ex.layers || []).forEach(function (x) { items.push(x); });
      /* "Warna asli" (item 25): natural colour on the Detail satellite, off by default; map.js remembers it per browser */
      if (deep && S.mapOK && typeof MCD.map.setTrueColour === 'function' && !storageGet(NOIMG_KEY, false)) {
        var tc = typeof MCD.map.trueColour === 'function' ? !!safe(MCD.map.trueColour) : false;
        items.push({ kind: 'toggle', label: T.trueColour, checked: tc, title: tc ? T.trueColourOn : T.trueColourOff, run: function () { MCD.map.setTrueColour(!tc); } });
      }
      items.push({ kind: 'toggle', label: 'Tanpa gambar peta', checked: !!storageGet(NOIMG_KEY, false), title: 'Mematikan peta jalan dan citra satelit. Berguna jika internet lambat.', run: toggleNoImagery });
      items.push({ kind: 'toggle', label: T.telemetryOn, checked: !!S.telemetryOn, run: function () { S.telemetryOn = !S.telemetryOn; updateFurniture(); } });
      return items;
    }, { label: T.mapMenu, align: 'right', kind: 'mapmenu' });
  }
  function toggleNoImagery() {
    var next = !storageGet(NOIMG_KEY, false);
    storageSet(NOIMG_KEY, next);
    if (S.mapOK && MCD.map.setImagery) MCD.map.setImagery(!next);
  }

  /* ============================================================== MAP (§E) */

  function initMap() {
    S.mapOK = false;
    if (!MCD.map || typeof MCD.map.init !== 'function') { doc.body.classList.add('no-map'); return; }
    var s = st(), cam = s.camera;
    var sec = s.section;
    /* No sign-in flight (A-03): staff land on Ringkasan, a page without a map; the first map section sets
       its own camera at once. A link with a camera (#cam=) keeps it. */
    var introOK = false;
    var camArr = cam ? [cam.lon, cam.lat, cam.zoom] : null;
    var mapEl = doc.getElementById('map');
    if (mapEl) mapEl.setAttribute('aria-label', 'Peta sekitar Mabes TNI Cilangkap dan KCP Cilangkap');
    var ok = safe(MCD.map.init, MCD.map, [mapEl, { padding: defaultPadding(S.byId[sec]), camera: camArr, intro: introOK, view: view(), theme: S.theme }]);
    if (!ok) { updateFurniture(); return; }
    S.mapOK = true;
    if (MCD.map.setView) safe(MCD.map.setView, MCD.map, [view()]);
    if (MCD.map.setTheme) safe(MCD.map.setTheme, MCD.map, [S.theme]);
    // Boot posture: camera only when the hash had no `cam` and no intro runs (§E.10).
    S.bootCamera = !cam && !introOK;
    safe(MCD.map.setPosture, MCD.map, [sec, null, { camera: S.bootCamera }]);
    // The sign-in flight ends on the section's own camera (Overview: 15 km around Mabes, the territory)
    if (introOK) safe(MCD.map.intro, MCD.map, [{ preset: (S.byId[sec] && S.byId[sec].posture && S.byId[sec].posture.camera) || 'H' }]);
    if (MCD.map.mountTelemetry) safe(MCD.map.mountTelemetry, MCD.map, [S.telemetry]);
    if (MCD.map.mountLegend) safe(MCD.map.mountLegend, MCD.map, [S.legendBody]);
    if (storageGet(NOIMG_KEY, false) && MCD.map.setImagery) safe(MCD.map.setImagery, MCD.map, [false]);

    MCD.map.onPick(function (p) { onPick(p); });
    // §D.8: camera → hash on moveend (debounced), never during the intro or a flight.
    var camHoldUntil = Infinity;                                   // released when the map is ready (+ intro)
    var writeCam = debounce(function () {
      var m = MCD.map.getMap && MCD.map.getMap();
      var wait = camHoldUntil - now();
      if (wait > 0) { if (isFinite(wait)) setTimeout(writeCam, wait + 50); return; }
      if (m && m.isMoving && m.isMoving()) return;                                // the final moveend writes
      MCD.state.setCamera(MCD.map.getCamera());
    }, CAMERA_HASH_MS);
    MCD.map.on('ready', function () { camHoldUntil = now() + (introOK ? 2600 : 0); });
    MCD.map.on('camera', function (e) { if (e && e.camera) writeCam(e.camera); });
    MCD.map.on('ready', function () { renderMapControls(); updateFurniture(); });
  }

  function onPick(p) {
    if (!p || !p.kind) {
      if (st().selection) MCD.state.set({ selection: null }, { history: 'none' });
      return;
    }
    if (p.kind === 'ring') return;
    var W0 = winApi();
    if (W0) safe(W0.origin, W0, [p.focus ? 'focus' : 'map']);    /* item 43: a map pick shows a callout first */
    MCD.state.set({ selection: { kind: p.kind, id: p.id } }, { source: 'map', history: 'none' });
  }

  /* ============================================================ ROUTER (§C.1) */

  function navigate(id, opts) {
    if (!S.booted || !S.byId[id]) return;
    opts = opts || {};
    var patch = { section: id };
    if (opts.view === 'overview' || opts.view === 'deep') patch.view = opts.view;
    S.pendingAction = opts.action ? { id: id, action: String(opts.action), fallback: typeof opts.fallback === 'function' ? opts.fallback : null } : null;
    var same = S.cur && S.cur.id === id && (!patch.view || patch.view === view());
    MCD.state.set(patch, { history: 'push' });
    if (same) runPendingAction(id);
    if (opts.focus) { var hst = S.cur && S.cur.host; if (hst) hst.focus && hst.focus(); }
  }

  /**
   * A section switch answers within one frame (item 38: heavy work off the animation frame). The section row's
   * underline slides and the old panels start to fade at once (both run on the compositor); the new section mounts
   * after that frame is on screen, so a mount of 100–200 ms (Merchant's map layers) never freezes the click. A newer
   * switch while one waits takes its place; going back to the section on screen cancels it. A broken or missing
   * section: the mount runs at once. Reduced motion waits for the frame too (it animates nothing, but the click
   * still answers at once); only the fade itself is cut there (no animation, and leaveHost removes the old host at
   * once). (Phones fade the old panels for that frame too; leaveHost then takes them out at once, because there
   * they flow down the page.)
   */
  var mountQ = { to: null, cancel: null };
  function requestMount(id) {
    var cur = S.cur;
    if (viewCancel) { viewCancel(); viewCancel = null; S.viewPending = false; }   // a waiting view remount: this mount replaces it
    if (cur && id === cur.id) {
      if (mountQ.cancel) {                                   // back to the section on screen before the switch landed
        mountQ.cancel(); mountQ.cancel = null; mountQ.to = null;
        unfadeHost(cur.host);
        syncNav();
        schedule([]);
      }
      return;
    }
    if (!cur || cur.broken) { mountNow(id); return; }
    mountQ.to = id;
    if (mountQ.cancel) return;                               // a mount already waits for its frame: it takes the newest id
    closePopover();
    fadeHost(cur.host);
    syncNav(id);
    mountQ.cancel = afterPaint(function () { var t = mountQ.to; mountQ.cancel = null; mountQ.to = null; if (t) mountNow(t); });
  }
  function mountNow(id) {
    if (mountQ.cancel) { mountQ.cancel(); mountQ.cancel = null; }
    mountQ.to = null;
    mountSection(id);
    schedule([]);                                            /* the render that waited for the mount (dirty keys were kept) */
  }
  function unfadeHost(host) {
    if (!host || host.__mcdLeft) return;
    host.__mcdFadeAt = 0;
    host.classList.remove('is-leaving');
    host.style.pointerEvents = '';
  }

  /**
   * Section switch (item 38): the old panels fade out (--dur-fast, ease-in-out, shell.css) while the new ones fade in
   * and rise (--dur-base, ease-out): a cross-fade on the compositor, opacity and translate only. fadeHost starts the
   * fade (the view switch starts it a frame before the heavier remount); leaveHost also makes the old host inert,
   * drops its ids (the new host of the same section reuses them) and removes it once faded. Reduced motion, or a
   * phone (< 600 px), where the panels flow down the page: the old host goes at once.
   */
  function fadeHost(host) {
    if (!host || host.__mcdFadeAt) return;
    host.__mcdFadeAt = now();
    host.classList.add('is-leaving');
    host.style.pointerEvents = 'none';
  }
  function leaveHost(host) {
    if (!host || host.__mcdLeft) return;
    host.__mcdLeft = true;
    if (stillMotion() || mq('(max-width: 599px)')) { host.remove(); return; }
    fadeHost(host);
    host.setAttribute('inert', '');
    host.setAttribute('aria-hidden', 'true');
    dropIds(host);
    var left = motionMs('fast') + 40 - (now() - host.__mcdFadeAt);
    setTimeout(function () { host.remove(); }, Math.max(0, left));
  }

  function mountSection(id, opts) {
    opts = opts || {};
    if (!S.byId[id]) id = 'overview';
    if (S.cur && S.cur.id === id && !opts.force) return;
    var prev = S.cur;
    closePopover();
    if (prev) {
      if (!prev.broken) runUnmount(prev);
      leaveHost(prev.host);
      (prev.cleanups || []).forEach(function (fn) { safe(fn); });
      prev.cleanups = [];
    }
    S.mcExtra = null;
    var W0 = winApi();
    if (W0 && (!prev || prev.id !== id)) safe(W0.closeAll, W0, ['section']);   /* item 43: callouts, cards and pins go */
    var entry = S.byId[id];
    var mod = MCD.sections && MCD.sections[id];
    var wasPage = doc.body.getAttribute('data-layout') === 'page';
    var isPage = entry.layout === 'page';
    doc.body.setAttribute('data-section', id);
    doc.body.setAttribute('data-layout', isPage ? 'page' : 'map');
    doc.body.setAttribute('data-posture', isPage ? 'page' : (isDeep() ? entry.kind : 'guide'));
    doc.body.classList.remove('is-sheet-away');
    doc.body.classList.toggle('is-map-dim', entry.kind === 'dim');
    var host = h('div', { class: 'section-host', id: 'panel-' + id, role: 'region', 'aria-labelledby': 'tab-' + id, 'data-host': id, 'data-view': view(), tabindex: '-1' });
    S.sectionRoot.appendChild(host);
    var cur = { id: id, entry: entry, mod: mod, host: host, page: null, cleanups: [], chips: [], crumbTab: null,
      cameFrom: prev && prev.id !== id ? prev.id : (prev ? prev.cameFrom : S.prevSection) };
    if (prev && prev.id !== id) S.prevSection = prev.id;
    S.cur = cur;
    // Panels rise in (shell.css mo-sec-in): measure the free map area again once they have landed, so the map
    // padding and the map controls never sit under a sheet or a rail. Only the entrance of the host's own panels
    // counts: the animations inside them (a chart, a list row, a drawer block) end while a camera flight runs, and
    // a relayout then would re-aim it for nothing. applyLayout() itself sends the map nothing when the free area
    // has not changed (item 38: one flight per move).
    var landed = debounce(function () { if (S.cur === cur) { applyLayout(); updateFurniture(); } }, 60);
    host.addEventListener('animationend', function (e) {
      var t = e && e.target;
      if (t && t.parentNode === host && PANEL_ENTRANCE.test(String(e.animationName || ''))) landed();
    });
    cur.cleanups.push(function () { landed.cancel(); });
    cur.ctx = makeCtx(cur);
    if (mod && typeof mod.mount === 'function') {
      try { mod.mount(host, cur.ctx); }
      catch (e) { sectionBroken(cur, 'mount', e); }
    } else host.appendChild(hostNote(T.missing));

    if (W0) safe(W0.sync, W0, [cur]);                           /* item 43: slim rail + bottom drawer in Detail ≥ 1024 px */
    var lay = applyLayout();
    var sameSection = prev && prev.id === id;
    /* A-03: the map stays initialised under a page; back on a map section it is resized, and the first map
       section sets its camera at once (no flight from a wrong place) */
    var firstMap = !isPage && !S.mapSeen;
    if (!isPage) S.mapSeen = true;
    if (S.mapOK && wasPage && !isPage && MCD.map.resize) safe(MCD.map.resize, MCD.map);
    if (S.mapOK && !opts.boot && !sameSection) safe(MCD.map.setPosture, MCD.map, [id, null, { camera: !isPage, instant: firstMap, posture: lay.posture }]);
    else if (S.mapOK && (lay.posture || sameSection)) {
      // at boot a link without a camera still lands on the section's own camera (e.g. 15 km for Merchants)
      var bootCam = !!(opts.boot && S.bootCamera) && !isPage;
      safe(MCD.map.setPosture, MCD.map, [id, null, { camera: bootCam, instant: bootCam, posture: lay.posture }]);
    }
    renderMapControls();
    updateFurniture();
    syncNav();
    if (!opts.boot) runUpdate(cur, S.derived, ['*']);
    if (st().selection) showDetail(st().selection);
    S.viewFrom = null;                              /* the view switch of this mount has read where its thumb starts */
    runPendingAction(id);
    schedulePreload(id);
  }

  /**
   * Item 41: the route data (data/travel-routes.js, 1.2 MB) is preloaded when Merchant, Sekolah or KPR opens, so the
   * first route of a session needs one camera flight. Off the mount frame (V4 open item 1): after the frame is on
   * screen, then 500 ms, then an idle moment (requestIdleCallback, timeout 2 s; fallback 600 ms). Never on pages.
   */
  var PRELOAD_IDS = /^(merchants|schools|campus|property)$/;
  var PRE = { t: 0, cancel: null, done: false };
  function schedulePreload(id) {
    var D = MCD.distance;
    if (PRE.cancel) { PRE.cancel(); PRE.cancel = null; }
    clearTimeout(PRE.t);
    probeOuter(id, true);                                         /* v6: the roads 16 to 31 km out, when 30 km is on */
    if (PRE.done || !PRELOAD_IDS.test(String(id)) || !D || typeof D.preload !== 'function') return;
    PRE.cancel = afterPaint(function () {
      PRE.cancel = null;
      PRE.t = setTimeout(function () {
        var run = function () {
          if (!S.booted || PRE.done) return;
          PRE.done = true;
          Promise.resolve(safe(D.preload, D)).then(function (ok) { if (!ok) PRE.done = false; }, function () { PRE.done = false; });
        };
        if (typeof root.requestIdleCallback === 'function') root.requestIdleCallback(run, { timeout: 2000 });
        else setTimeout(run, 100);
      }, 500);
    });
  }

  /**
   * v6 (V6_SPEC §1.5, §9.1): the outer road grid and its route trees (16 to 31 km from KCP, about 2,2 MB, loaded by
   * MCD.travel) come early once a 30 km scope is on screen: Kampus or Sekolah after "30 km". One second after
   * that scope starts, after the frame is on screen and an idle moment: MCD.distance.preload({outer: true}). Once per
   * session (a failed load is tried again at the next 30 km start); dropped when staff leave for another section before
   * it runs; never on pages. The scope comes from MCD.inst.scope (the shared memory of the switch), else the section's
   * summary().scope, else the section default (5 km since 21 Oct 2026).
   */
  var OUTER_IDS = /^(schools|campus)$/;
  var OUTER = { t: 0, cancel: null, done: false, queued: '', probedAt: 0 };
  function scopeKm(id, viaSummary) {
    var I = MCD.inst, def = 5, v;
    if (I && I.scope && typeof I.scope.get === 'function') {
      v = +safe(I.scope.get, I.scope, [id, def]);
      if (v === 5 || v === 15 || v === 30) return v;
    }
    var mod = viaSummary && S.cur && S.cur.id === id ? S.cur.mod : null;
    if (mod && typeof mod.summary === 'function') {
      var s = safe(mod.summary, mod);
      v = s && s.scope ? +s.scope.value : NaN;
      if (v === 5 || v === 15 || v === 30) return v;
    }
    return def;
  }
  /** probeOuter(id, viaSummary): queue the outer preload when section `id` is on screen at 30 km. Cheap; safe to call often. */
  function probeOuter(id, viaSummary) {
    if (OUTER.done || !S.booted) return;
    if (OUTER.queued && OUTER.queued !== id) cancelOuter();
    if (OUTER.queued || !OUTER_IDS.test(String(id))) return;
    var D = MCD.distance;
    if (!D || typeof D.preload !== 'function') return;
    if (!viaSummary && !(MCD.inst && MCD.inst.scope)) {             /* no shared scope memory: ask the section, at most every 400 ms */
      var t = now();
      if (t - OUTER.probedAt < 400) return;
      OUTER.probedAt = t;
      viaSummary = true;
    }
    if (scopeKm(id, viaSummary) !== 30) return;
    OUTER.queued = id;
    OUTER.cancel = afterPaint(function () {
      OUTER.cancel = null;
      OUTER.t = setTimeout(function () {
        OUTER.t = 0;
        var run = function () {
          var here = S.cur && S.cur.id;
          if (!S.booted || OUTER.done || here !== id || scopeKm(id, true) !== 30) { OUTER.queued = ''; return; }
          OUTER.done = true;
          OUTER.queued = '';
          Promise.resolve(safe(D.preload, D, [{ outer: true }])).then(function (ok) { if (!ok) OUTER.done = false; }, function () { OUTER.done = false; });
        };
        if (typeof root.requestIdleCallback === 'function') root.requestIdleCallback(run, { timeout: 2000 });
        else setTimeout(run, 100);
      }, 1000);
    });
  }
  function cancelOuter() {
    if (OUTER.cancel) { OUTER.cancel(); OUTER.cancel = null; }
    clearTimeout(OUTER.t);
    OUTER.t = 0;
    OUTER.queued = '';
  }
  /** The switch moved (MCD.inst.scope.on, a 'schools:scope:30' / 'campus:scope:30' action, the slim rail's pair). */
  function onScopeChange() { if (S.booted && S.cur) probeOuter(S.cur.id, true); }

  /* ----------------------------------------------- section error boundary */
  // Coordinator request 1: a section that throws in mount, update or unmount shows a calm
  // card inside its own host ("Try again" remounts it). The map, the bars and the other
  // sections keep working. The error is logged once.

  function runUpdate(cur, d, keys) {
    if (!cur || cur.broken || !d || !cur.mod || typeof cur.mod.update !== 'function') return;
    try { cur.mod.update(d, keys); }
    catch (e) {
      sectionBroken(cur, 'update', e);
      if (S.cur === cur) { applyLayout(); updateFurniture(); }
    }
  }
  function runUnmount(cur) {
    if (!cur || !cur.mod || typeof cur.mod.unmount !== 'function') return;
    try { cur.mod.unmount(); }
    catch (e) { if (root.console) root.console.error('[MCD.app] section "' + cur.id + '" failed to unmount', e); }
  }
  function sectionBroken(cur, phase, e) {
    if (!cur || cur.broken) return;
    cur.broken = true;
    if (root.console) root.console.error('[MCD.app] section "' + cur.id + '" failed in ' + phase + '; the rest of the dashboard keeps working', e);
    if (phase !== 'mount') runUnmount(cur);
    (cur.cleanups || []).forEach(function (fn) { try { fn(); } catch (x) { /* already broken: keep going */ } });
    cur.cleanups = [];
    if (S.cur === cur) S.mcExtra = null;
    clear(cur.host);
    cur.host.appendChild(brokenCard(cur.id));
    renderMapControls();
  }
  function brokenCard(id) {
    var again = h('button', { type: 'button', class: 'btn btn--primary btn--lg sec-broken__btn' }, [icon('reset'), h('span', { text: T.tryAgain })]);
    again.addEventListener('click', function () { if (S.cur && S.cur.id === id) { mountSection(id, { force: true }); schedule(['*']); } });
    var entry = S.byId[id] || {};
    return h('section', { class: (entry.layout === 'page' ? 'pg-page' : 'guide panel') + ' sec-broken', role: 'alert' }, [
      h('div', { class: 'guide__scroll' }, [
        h('div', { class: 'pg-head' }, [
          h('p', { class: 'pg-crumbs' }, [h('span', { class: 'pg-crumbs__i is-last', text: entry.label || id })]),
          h('div', { class: 'sec-broken__card' }, [
            h('span', { class: 'sec-broken__icon', 'aria-hidden': 'true' }, [icon('warn')]),
            h('h2', { class: 'sec-broken__t', text: T.brokenTitle }),
            h('p', { class: 'sec-broken__p', text: T.brokenBody }),
            h('div', { class: 'sec-broken__actions' }, [again])
          ])
        ])
      ])
    ]);
  }

  /** navigate(id, {action, fallback}): run a section action once the (re)mounted section is on screen;
      `fallback` runs when the section does not handle the action (onAction did not return true). */
  function runPendingAction(id) {
    var pa = S.pendingAction;
    if (!pa || pa.id !== id || S.viewPending) return;
    S.pendingAction = null;
    setTimeout(function () {
      if (!S.cur || S.cur.id !== id || S.cur.broken) return;
      /* MCD.app.focus on a phone: the camera flight starts now and the details sheet opens when it lands, so the
         flight aims above that sheet from the start (held for the flight, 700–1000 ms, and a margin) */
      if (/^focus:/.test(pa.action)) reserveSheet({ kind: pa.action.split(':')[1] }, 1600);
      if (!runAction(pa.action, null) && pa.fallback) safe(pa.fallback);
    }, 0);
  }

  function hostNote(text) {
    return h('section', { class: 'guide panel' }, [h('div', { class: 'pg-head' }, [h('p', { class: 't-empty', text: text })])]);
  }

  /** Bottom edge of the visible bars + 16 px: where the stage (panels, map padding) starts. */
  function stageTop() {
    // phones (< 600 px): the section row and the readout flow below the map, so only the top bar counts
    var xs = mq('(max-width: 599px)');
    var ids = xs ? ['topbar'] : ['topbar', 'navrow'];
    if (isDeep() && !xs) ids.push('readout');
    var b = 0;
    ids.forEach(function (id) {
      var el = doc.getElementById(id);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.height > 0) b = Math.max(b, r.bottom);
    });
    return Math.round(b || 168) + 16;
  }

  /** Free map area left by the section's panels: guide, rails, sheet, KPI strip (§C.1). */
  function measurePadding(host) {
    var W = root.innerWidth, H = root.innerHeight, top = stageTop();
    var pad = { top: top, left: 16, right: 16, bottom: 16 };
    if (!host || mq('(max-width: 1023px)')) return pad;
    function vis(el) { return el && el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).position !== 'static'; }
    var guide = host.querySelector('.guide'), railL = host.querySelector('.rail--l'), railR = host.querySelector('.rail--r');
    var sheet = host.querySelector('.sheet'), strip = host.querySelector('.kpi-strip');
    if (vis(guide)) pad.left = Math.round(guide.getBoundingClientRect().right + 24);
    if (vis(railL) && !doc.body.classList.contains('rail-l-collapsed')) pad.left = Math.max(pad.left, Math.round(railL.getBoundingClientRect().right + 12));
    if (vis(railR) && !doc.body.classList.contains('rail-r-collapsed') && !mq('(max-width: 1279px)')) pad.right = Math.round(W - railR.getBoundingClientRect().left + 12);
    if (vis(sheet) && !doc.body.classList.contains('is-sheet-away') && !mq('(max-width: 1279px)')) pad.right = Math.round(W - sheet.getBoundingClientRect().left + 12);
    if (vis(strip)) pad.bottom = Math.round(H - strip.getBoundingClientRect().top + 12);
    return pad;
  }

  function defaultPadding() { return mapPadding(measurePadding(S.cur && S.cur.host)); }
  /**
   * The free area is measured in the viewport; MapLibre wants it relative to the map box (on phones the map is a
   * hero below the top bar and above the page). `cover`: px of the viewport bottom the details sheet covers on a
   * phone (sheetCover()); the map then keeps its points above the sheet.
   */
  function mapPadding(pad, cover) {
    var el = doc.getElementById('map'), r = el ? el.getBoundingClientRect() : null;
    var top = r ? Math.max(0, Math.round(r.top)) : 0;
    var below = r && r.height > 0 ? Math.max(0, Math.round((root.innerHeight || 0) - r.bottom)) : 0;   /* viewport under the map box */
    var out = Object.assign({}, pad);
    out.top = Math.max(8, (pad.top || 0) - top);
    var bottom = Math.max(pad.bottom || 0, cover > 0 ? cover + 12 : 0);
    /* in map px; a plain margin (16 px) stays as it was, it never comes from under the map box */
    out.bottom = below > 0 ? Math.max(bottom - below, Math.min(pad.bottom || 0, 16)) : bottom;
    return out;
  }
  function padKey(p) { return [p.top, p.right, p.bottom, p.left].map(function (v) { return Math.round(v || 0); }).join(','); }

  /**
   * Reads section.layout(), writes --free-* and moves the map padding (§C.1). Called after every mount, panel
   * entrance, resize, sheet or drawer change: when the free area is the same as last time, the map is not told
   * again (a setLayout during a flight re-aims it, item 38: one flight per move).
   */
  function applyLayout() {
    var c = S.cur;
    if (!c) return {};
    var lay = (c.mod && !c.broken && safe(c.mod.layout, c.mod)) || {};
    var pad = Object.assign({}, lay.padding || measurePadding(c.host));
    pad.top = Math.max(pad.top || 0, stageTop());
    /* item 43: the slim rail, the docked cards and the bottom drawer are part of the free map area (MCD.windows) */
    var W0 = winApi();
    if (W0) pad = safe(W0.padding, W0, [pad]) || pad;
    var fk = padKey(pad);
    /* phones: the Keterangan pill keeps above the bottom sheet (shell.css reads --sheet-cover) */
    var cov = Math.round(sheetCover() || 0);
    if (cov !== S.sheetCoverPx) { S.sheetCoverPx = cov; doc.body.style.setProperty('--sheet-cover', cov + 'px'); }
    if (fk !== S.freeKey) {
      S.freeKey = fk;
      var b = doc.body.style;
      b.setProperty('--free-t', Math.round(pad.top || 0) + 'px');
      b.setProperty('--free-l', Math.round(pad.left || 0) + 'px');
      b.setProperty('--free-r', Math.round(pad.right || 0) + 'px');
      b.setProperty('--free-b', Math.round(pad.bottom || 0) + 'px');
    }
    if (S.mapOK) {
      var mp = mapPadding(pad, sheetCover()), mk = padKey(mp);
      /* {still}: the cards were arranged (pin, dock, drag, minimise, Rapikan, rail, drawer): the map content keeps its place */
      if (mk !== S.mapPadKey) { S.mapPadKey = mk; safe(MCD.map.setLayout, MCD.map, [mp, { still: !!(W0 && safe(W0.still, W0)) }]); }
    }
    S.freePad = pad;
    return { padding: pad, posture: lay.posture && typeof lay.posture === 'object' ? lay.posture : null };
  }

  /* ----------------------------------------------------------- section ctx */

  function makeCtx(cur) {
    var entry = cur.entry;
    var ctx = {
      id: entry.id, nav: entry, config: entry.cfg,
      el: h, icon: icon, glyph: glyph, monogram: monogram, kbd: kbd,
      state: MCD.state,
      view: view,
      theme: function () { return S.theme; },
      derived: function () { return S.derived; },
      privacy: pmode,
      hasData: hasData,
      navigate: navigate, setView: setView,
      select: function (sel) { MCD.state.set({ selection: sel || null }, { history: 'none' }); },
      clearSelection: function () { MCD.state.set({ selection: null }, { history: 'none' }); },
      hover: hover,
      openDrawer: openDrawer, closeDrawer: closeDrawer,
      toast: toast, confirm: confirmModal,
      relayout: function () { var lay = applyLayout(); updateFurniture(); return lay; },
      padding: function () { return measurePadding(cur.host); },
      requestRender: function (keys) { schedule(keys || ['ext']); },
      mapControls: function (opts) { S.mcExtra = opts || null; renderMapControls(); },
      dock: function (opts) { S.mcExtra = opts || null; renderMapControls(); return h('span', { class: 'dock-slot', hidden: true }); },
      provenance: provenance,
      registerCommands: function (fn) { var k = 'section:' + entry.id; S.commands[k] = fn; cur.cleanups.push(function () { delete S.commands[k]; }); },
      onCleanup: function (fn) { cur.cleanups.push(fn); },
      takeFiles: function () { var f = S.pendingFiles; S.pendingFiles = []; return f; },
      saveEncrypted: saveEncrypted,
      isDemo: demoOn,
      demoTag: demoTag,
      emptyState: function (o) { return emptyCard(entry, o || {}); },
      page: function (spec) { cur.page = renderPage(cur, spec || {}); return cur.page; },
      /* A-09: shared tabs with place memory; filter chips in the header line; where staff came from */
      tabs: function (host, opts) { return buildTabs(host, opts, cur); },
      filterChips: function (list, opts) {
        cur.chips = (list || []).filter(function (x) { return x && x.label; });
        cur.chipsAll = opts && typeof opts.onClearAll === 'function' ? opts.onClearAll : null;
        if (S.cur === cur) syncCrumbs();
      },
      cameFrom: function () { return cur.cameFrom || null; },
      setCrumb: function (label) { cur.crumbTab = label || null; if (S.cur === cur) syncCrumbs(); }
    };
    ctx.placeholder = ctx.page;                     // phase-1 name kept for compatibility
    return ctx;
  }

  /** §0.1.5 provenance footer text for a dataset key. */
  function provenance(key, extra) {
    var m = (MCD.data && MCD.data.meta && MCD.data.meta[key]) || {};
    var rows = (MCD.data && MCD.data[key] && MCD.data[key].length) || m.rows || 0;
    var fm = F(), asOf = m.asOf || (MCD.data && MCD.data.asOf);
    if (m.source === 'demo') return T.demoProv + ' · ' + fm.int(rows) + ' baris' + (extra ? ' · ' + extra : '');
    var src = m.source === 'vault' ? 'salinan terenkripsi' : (m.reference ? 'data publik' : (m.file ? m.file + (m.sheet ? ' › ' + m.sheet : '') : 'belum diimpor'));
    return 'Sumber: ' + src + ' · ' + fm.int(rows) + ' baris · hanya di komputer ini' + (asOf ? ' · ' + fm.date(asOf) : '') + (extra ? ' · ' + extra : '');
  }

  /* ====================================================== SECTION PAGE (U3, U6, U8, A-07, A-09) */

  /** Empty-state card: what the section will show, the sheet to import and an Import button. */
  function emptyCard(entry, o) {
    var sheets = o.needs || entry.sheets || [];
    var btn = h('button', { type: 'button', class: 'btn btn--primary btn--lg' }, [icon('upload'), h('span', { text: o.buttonLabel || T.importData })]);
    btn.addEventListener('click', function () { navigate('data', { view: 'deep' }); });
    return h('section', { class: 'empty' }, [
      h('div', { class: 'empty__icon', 'aria-hidden': 'true' }, [icon('upload')]),
      h('h2', { class: 'empty__title', text: o.title || 'Belum ada data' }),
      o.shows && o.shows.length ? h('p', { class: 'empty__p', text: 'Setelah file diimpor, bagian ini menampilkan:' }) : null,
      o.shows && o.shows.length ? h('ul', { class: 'empty__list' }, o.shows.map(function (x) { return h('li', { text: x }); })) : null,
      sheets.length ? h('p', { class: 'empty__p' }, ['Langkahnya: unduh template permintaan data, isi sheet ',
        sheets.map(function (s, i) { return [i ? (i === sheets.length - 1 ? ' dan ' : ', ') : '', h('code', { class: 'empty__sheet', text: s })]; }),
        ', lalu impor di Data & Privasi.']) : null,
      entry.id === 'data' || o.button === false ? null : h('div', { class: 'empty__actions' }, [btn])
    ]);
  }

  function cardEl(c, bank) {
    var fm = F(), v = c.value, txt;
    if (v == null || (typeof v === 'number' && !isFinite(v))) txt = '—';
    else if (typeof v === 'string') txt = v;
    else if (c.format === 'rp') txt = fm.rp(v);
    else if (c.format === 'pct') txt = fm.pct(v);
    else if (c.format === 'km') txt = fm.km(v);
    else if (c.format === 'ha') txt = fm.num(v, 1) + ' ha';
    else txt = fm.int(v);
    var el = h(c.go ? 'button' : 'div', { class: 'pg-card' + (txt === '—' ? ' is-empty' : '') + (c.go ? ' pg-card--link' : '') + (c.tone ? ' pg-card--' + c.tone : ''), type: c.go ? 'button' : null }, [
      h('span', { class: 'pg-card__label' }, [c.glyph ? glyph(c.glyph) : null, h('span', { text: c.label }),
        // CONTOH mark: bank figures (page dataKeys, no public source) or cards that ask for it
        DEMO.on && txt !== '—' && (c.demo === true || (c.demo !== false && bank && !c.source)) ? h('span', { class: 'demo-tag demo-tag--inline', title: T.demoTagTitle, text: T.demoTag }) : null]),
      h('span', { class: 'pg-card__value', text: txt }),
      c.unit && txt !== '—' ? h('span', { class: 'pg-card__unit', text: c.unit }) : null,
      h('span', { class: 'pg-card__explain', text: txt === '—' && c.emptyNote !== false ? (c.emptyNote || 'Belum ada data. Impor file di Data & Privasi.') + (c.explain ? ' · ' + c.explain : '') : (c.explain || '') }),
      c.source ? h('span', { class: 'pg-card__src', text: c.source }) : null,
      c.go ? h('span', { class: 'pg-card__go', 'aria-hidden': 'true' }, [c.goLabel || 'Buka', ' ', icon('chev-r', 'icon--12')]) : null
    ]);
    if (c.go) el.addEventListener('click', function () { if (typeof c.go === 'function') safe(c.go); else navigate(c.go); });
    return el;
  }

  var KIND = { table: 'Tabel', chart: 'Grafik', line: 'Grafik', hbars: 'Grafik', matrix: 'Tabel warna', list: 'Daftar',
    form: 'Formulir', podium: 'Peringkat', drop: 'Impor', cards: 'Status', text: 'Catatan', cells: 'Kartu', map: 'Lapisan peta' };

  /**
   * "Sederhana | Detail" in the section header (D2): one global view, Shift+D still switches it.
   * Item 38: a thumb under the chosen option slides to the other one (transform only: translateX, and scaleX while it
   * moves; its exact width is set once it rests). The header is rebuilt by the remount, so a switch built right after
   * a view change starts on the old option and slides to the new one. Until the thumb is measured (or when it cannot
   * be), the chosen option keeps its own pressed look, so the switch always reads right.
   */
  function viewSwitchEl() {
    var o = segBtn(T.viewOverview, null, T.viewOverviewHint + ' (Shift+D)', view() === 'overview');
    var d = segBtn(T.viewDeep, null, T.viewDeepHint + ' (Shift+D)', view() === 'deep');
    o.setAttribute('data-view', 'overview'); d.setAttribute('data-view', 'deep');
    o.setAttribute('tabindex', view() === 'overview' ? '0' : '-1'); d.setAttribute('tabindex', view() === 'deep' ? '0' : '-1');
    o.addEventListener('click', function () { setView('overview'); });
    d.addEventListener('click', function () { setView('deep'); });
    var thumb = h('span', { class: 'vswitch__thumb', 'aria-hidden': 'true' });
    var sw = h('div', { class: 'vswitch pg-vswitch', role: 'radiogroup', 'aria-label': T.viewAria, 'aria-keyshortcuts': 'Shift+D' }, [thumb, o, d]);
    sw.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var next = view() === 'deep' ? 'overview' : 'deep';
      setView(next);
    });
    var from = S.viewFrom && S.viewFrom !== view() ? S.viewFrom : null;
    afterPaint(function () { placeThumb(sw, from); });
    return sw;
  }
  /** Puts the thumb under the chosen option; from = the option it slides from (a view change), else it just sits. */
  function placeThumb(sw, from) {
    var thumb = sw && sw.querySelector && sw.querySelector('.vswitch__thumb');
    if (!thumb || !sw.isConnected) return;
    var on = sw.querySelector('.vswitch__opt[data-view="' + view() + '"]');
    var start = from ? sw.querySelector('.vswitch__opt[data-view="' + from + '"]') : null;
    if (!on || !on.offsetWidth) return;                       /* not laid out (hidden): the pressed look stays */
    if (start && start.offsetWidth && thumb.__inkW == null) inkAt(thumb, start.offsetLeft, start.offsetWidth);
    inkTo(thumb, on.offsetLeft, on.offsetWidth, !!start);
    sw.classList.add('has-thumb');
  }

  /**
   * A sliding marker (the view switch's thumb, the section row's underline): it moves with transform only, from where
   * it rests to (x, w): translateX plus scaleX while it moves, then, at rest, its real width and no scale, so its
   * rounded ends are never stretched for long. Reduced motion or no earlier place: it jumps.
   */
  function inkAt(ink, x, w) {
    ink.style.transition = 'none';
    ink.style.width = w + 'px';
    ink.style.transform = 'translateX(' + x + 'px)';
    ink.__inkX = x; ink.__inkW = w;
  }
  function inkTo(ink, x, w, animate) {
    var x0 = ink.__inkX, w0 = ink.__inkW;
    if (ink.__inkSettle && x0 === x && w0 === w) return;      /* already sliding there (syncNav again at mount): let it run */
    if (ink.__inkSettle) ink.__inkSettle();
    if (!animate || stillMotion() || w0 == null || !(w0 > 0) || (x0 === x && w0 === w)) { inkAt(ink, x, w); return; }
    inkAt(ink, x0, w0);
    void ink.offsetWidth;                                      /* commit the start before the transition */
    ink.style.transition = '';
    ink.style.transform = 'translateX(' + x + 'px) scaleX(' + (w / w0).toFixed(4) + ')';
    ink.__inkX = x; ink.__inkW = w;
    var timer = 0;
    var settle = function () {
      ink.removeEventListener('transitionend', settle);
      clearTimeout(timer);
      if (ink.__inkSettle !== settle) return;
      ink.__inkSettle = null;
      inkAt(ink, x, w);
    };
    ink.__inkSettle = settle;
    ink.addEventListener('transitionend', settle);
    timer = setTimeout(settle, motionMs('base') + 120);        /* a background tab never fires transitionend */
  }

  /** "⋯ Lainnya" (§2.3): mask names while sharing the screen, show full names, copy a link to this view. */
  function openMore(anchor) {
    openMenu(anchor, function () {
      var p = st().privacy;
      return [
        { kind: 'toggle', label: T.veilBtn, checked: !!p.veil, key: 'V', run: toggleVeil },
        { kind: 'toggle', label: T.revealBtn, checked: !!p.reveal, run: toggleReveal },
        { kind: 'sep' },
        { kind: 'action', label: T.copyLink, title: T.copyLinkTitle, run: function () { copyText(root.location.href).then(function () { toast(T.linkCopied); }, function () { toast(T.copyFail, 'warn'); }); } }
      ];
    }, { label: T.more, align: 'right', kind: 'more' });
  }

  /** Breadcrumb "Merchant › Detail › Prioritas kunjungan" and the active filter chips (§2.3, A-09). */
  function syncCrumbs() {
    var c = S.cur, pg = c && c.page;
    if (!pg || !pg.crumbs) return;
    var parts = [c.entry.label];
    if (c.entry.id !== 'overview') parts.push(view() === 'deep' ? T.viewDeep : T.viewOverview);
    if (c.crumbTab) parts.push(c.crumbTab);
    clear(pg.crumbs);
    parts.forEach(function (t, i) {
      if (i) pg.crumbs.appendChild(h('span', { class: 'pg-crumbs__sep', 'aria-hidden': 'true', text: '›' }));
      pg.crumbs.appendChild(h('span', { class: 'pg-crumbs__i' + (i === parts.length - 1 ? ' is-last' : ''), 'aria-current': i === parts.length - 1 ? 'location' : null, text: t }));
    });
    var chips = c.chips || [];
    clear(pg.chips);
    chips.forEach(function (x) {
      var b = h('button', { type: 'button', class: 'chip pg-chip', 'aria-label': T.clearFilter(x.label), title: T.clearFilter(x.label) }, [h('span', { text: x.label }), icon('close', 'chip__x')]);
      b.addEventListener('click', function () { safe(x.onClear); });
      pg.chips.appendChild(b);
    });
    if (chips.length > 1 || (chips.length && c.chipsAll)) {
      var all = h('button', { type: 'button', class: 'btn btn--ghost pg-chips__all', text: T.clearFilters });
      all.addEventListener('click', function () { if (c.chipsAll) safe(c.chipsAll); else chips.forEach(function (x) { safe(x.onClear); }); });
      pg.chips.appendChild(all);
    }
    pg.chips.hidden = !chips.length;
    /* a page without a breadcrumb (spec.crumbs: false) keeps the line only for its chips or the guide's switch */
    var row = pg.crumbs.parentNode;
    if (row && row.classList && row.classList.contains('pg-crumbrow')) row.hidden = !!pg.crumbs.hidden && !chips.length && !(pg.head && pg.head.classList && pg.head.classList.contains('pg-head--guide'));
  }

  /* Place memory per section and view (A-09, tasks F11): the active tab and the panel scroll position. */
  function placeKey(id) { return id + '|' + view(); }
  var PANEL_SCROLLERS = '.sheet__scroll, .guide__scroll, .rail__scroll, .pg-page__scroll, [data-scroll-panel]';
  function scrollerOf(el) {
    /* the panel's own scroll area first (a tab strip may sit in a sideways-scrolling bar of its own) */
    var known = el && el.closest ? el.closest(PANEL_SCROLLERS) : null;
    if (known) return known;
    var n = el && el.parentNode;
    while (n && n.nodeType === 1 && n !== doc.body) {
      try {
        var cs = root.getComputedStyle(n);
        if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
      } catch (e) { return null; }
      n = n.parentNode;
    }
    return null;
  }

  /**
   * Shared tabs (A-09): role=tablist, roving tabindex with the arrow keys, 40 px, active underline, edge fades
   * when it scrolls. Remembers the tab and the panel scroll position per section and view, and restores both
   * after a remount. opts {items: [{id, label, count?}], active, onChange(id), panel?: element, label?}.
   */
  function buildTabs(host, opts, cur) {
    opts = opts || {};
    var items = (opts.items || []).filter(function (it) { return it && it.id != null; });
    var sid = cur ? cur.id : 'app', mem = S.places[placeKey(sid)] || (S.places[placeKey(sid)] = {});
    var ids = items.map(function (it) { return String(it.id); });
    var active = opts.active != null && ids.indexOf(String(opts.active)) >= 0 ? String(opts.active)
      : (mem.tab && ids.indexOf(mem.tab) >= 0 ? mem.tab : ids[0]);
    var restoreTo = mem.tab === active && typeof mem.scroll === 'number' ? mem.scroll : null;
    var panelId = (opts.panel && opts.panel.id) || ('pg-tabpanel-' + sid);
    var list = h('div', { class: 'pg-tabs__list', role: 'tablist', 'aria-label': opts.label || (cur ? cur.entry.label : T.sectionsAria) });
    var wrap = h('div', { class: 'pg-tabs' }, [list]);
    var btns = items.map(function (it) {
      var id = String(it.id);
      var b = h('button', { type: 'button', class: 'pg-tabs__tab', role: 'tab', id: 'pgtab-' + sid + '-' + id, 'data-tab': id,
        'aria-selected': id === active ? 'true' : 'false', 'aria-controls': panelId, tabindex: id === active ? '0' : '-1' },
        [h('span', { class: 'pg-tabs__l', text: it.label }), it.count != null ? h('span', { class: 'pg-tabs__n', text: String(it.count) }) : null]);
      b.addEventListener('click', function () { select(id, true); });
      list.appendChild(b);
      return b;
    });
    list.addEventListener('keydown', function (e) {
      var i = ids.indexOf(active), j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % ids.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + ids.length) % ids.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = ids.length - 1;
      if (j < 0) return;
      e.preventDefault();
      select(ids[j], true);
      btns[j].focus();
    });
    function fades() {
      var sl = list.scrollLeft || 0, max = (list.scrollWidth || 0) - (list.clientWidth || 0);
      wrap.classList.toggle('has-left', sl > 2);
      wrap.classList.toggle('has-right', max - sl > 2);
    }
    list.addEventListener('scroll', fades, { passive: true });
    /* a view switch re-renders the old panel before it leaves: ignore the scroll events of that moment */
    var scroller = null, onScroll = function () { if (scroller && !S.viewPending && (!cur || S.cur === cur)) mem.scroll = scroller.scrollTop; };
    function attachScroller() {
      var sc = scrollerOf(wrap);
      if (sc === scroller) return;
      if (scroller) scroller.removeEventListener('scroll', onScroll);
      scroller = sc;
      if (scroller) scroller.addEventListener('scroll', onScroll, { passive: true });
    }
    function paint() {
      btns.forEach(function (b, i) {
        var on = ids[i] === active;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
        b.classList.toggle('is-active', on);
      });
      if (opts.panel) {
        opts.panel.id = panelId;
        opts.panel.setAttribute('role', 'tabpanel');
        opts.panel.setAttribute('aria-labelledby', 'pgtab-' + sid + '-' + active);
      }
      var it = items[ids.indexOf(active)];
      if (cur && S.cur === cur) { cur.crumbTab = it ? it.label : null; syncCrumbs(); }
    }
    function select(id, user) {
      id = String(id);
      if (ids.indexOf(id) < 0) return;
      var changed = id !== active;
      active = id;
      mem.tab = id;
      if (changed) mem.scroll = 0;
      paint();
      if (changed || user) {
        if (typeof opts.onChange === 'function') safe(opts.onChange, null, [id]);
        if (changed) raf(function () { attachScroller(); if (scroller) scroller.scrollTop = 0; });
      }
      /* the chosen tab comes into view by scrolling the strip sideways only: scrollIntoView would also scroll the page
         (a phone jumped from the map to the filters when Detail opened) */
      var b = btns[ids.indexOf(id)];
      if (b && b.getBoundingClientRect && list.scrollWidth > list.clientWidth) {
        try {
          var lr = list.getBoundingClientRect(), br = b.getBoundingClientRect();
          if (br.left < lr.left) list.scrollLeft -= Math.round(lr.left - br.left + 8);
          else if (br.right > lr.right) list.scrollLeft += Math.round(br.right - lr.right + 8);
        } catch (e) { /* ignore */ }
      }
    }
    if (host && host.appendChild) host.appendChild(wrap);
    mem.tab = active;
    paint();
    /* after a remount: back to the same tab and the same scroll position (once the panel has its content) */
    raf(function () {
      fades();
      attachScroller();
      if (restoreTo != null) {
        var tries = 0;
        (function again() {
          attachScroller();
          if (scroller && scroller.scrollHeight - scroller.clientHeight >= restoreTo - 2) { scroller.scrollTop = restoreTo; mem.scroll = restoreTo; return; }
          if (++tries < 30) setTimeout(again, 100);
        })();
      }
    });
    if (cur) cur.cleanups.push(function () { if (scroller) scroller.removeEventListener('scroll', onScroll); });
    return {
      el: wrap,
      set: function (id) { select(id, false); if (typeof opts.onChange === 'function' && String(id) !== active) safe(opts.onChange, null, [String(id)]); },
      get: function () { return active; },
      select: function (id) { select(id, true); },
      panelId: panelId
    };
  }

  /**
   * ctx.page(spec) — the standard section page for both views.
   *   spec.lede      one plain sentence (default: config help text)
   *   spec.shows     what the section shows once its data is in (bullets)
   *   spec.needs     request-template sheets that fill it (default: config sheets)
   *   spec.dataKeys  MCD.data keys that count as "data present" ([] = public data only)
   *   spec.cards(derived, ctx) → [{label, value, format, unit, explain, source, glyph, go, emptyNote}]
   *   spec.blocks    Detail outline [{t: title, k: kind, s: span 1–12, note}]
   *   spec.render(bodyEl, api) / spec.refresh(derived, keys) custom content
   *   spec.primary   {label, icon, run} the one primary button of the Sederhana view
   *   spec.title     header title (default: the config title)
   * → {update(derived, keys), padding(), refill(), el, body, head}
   * Header (§2.3): breadcrumb + filter chips · title [?] · Sederhana | Detail (not on Ringkasan) · ⋯ Lainnya.
   * Layout 'page' (Ringkasan, Data & Privasi): a full-width page without a map, max content width 1280 px.
   */
  function renderPage(cur, spec) {
    var entry = cur.entry, host = cur.host, deep = isDeep(), ctxRef = cur.ctx, isPage = entry.layout === 'page';
    function pick(k, d) { return spec[k] != null ? spec[k] : d; }
    function needs() { return pick('needs', entry.sheets || []); }
    function dataKeys() { return pick('dataKeys', []); }
    function filled() { var k = dataKeys(); return k.length ? hasData(k) : true; }

    var titleId = 'pg-title-' + entry.id;
    var tipBtn = h('button', { type: 'button', class: 'tipbtn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-label': T.whatIsThis + ' ' + entry.label, title: T.whatIsThis }, [h('span', { 'aria-hidden': 'true', text: '?' })]);
    tipBtn.addEventListener('click', function () {
      var n = needs(), sh = pick('shows', []);
      openTip(tipBtn, entry.title, [entry.help, n.length ? 'Data: sheet ' + n.join(', ') + ' dari template permintaan data.' : 'Data: data publik. Sumbernya tertulis di setiap angka.'],
        sh.length ? sh : null);
    });
    var demoPill = h('span', { class: 'pg-demo', title: T.demoTagTitle, hidden: true }, [icon('warn', 'icon--12'), h('span', { text: T.demoPill })]);
    var crumbs = h('p', { class: 'pg-crumbs' });
    var chips = h('div', { class: 'pg-chips', role: 'group', 'aria-label': 'Filter aktif', hidden: true });
    var moreBtn = h('button', { type: 'button', class: 'pg-more', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': T.moreAria, title: T.more }, [h('span', { 'aria-hidden': 'true', text: '⋯' })]);
    moreBtn.addEventListener('click', function () { if (S.pop && S.pop.anchor === moreBtn) closePopover(); else openMore(moreBtn); });
    var tools = h('div', { class: 'pg-head__tools' }, [entry.id === 'overview' ? null : viewSwitchEl(), moreBtn]);
    /* Sederhana guide (410 px): the switch and ⋯ share the breadcrumb line, so the header stays near 110 px and the
       panel fits 1366×768 without scrolling; the DOM order follows the visual order */
    var guideHead = !isPage && !deep;
    /* spec.crumbs === false (V3_REPORT §4.5): no breadcrumb, for a page whose own title already says where it is
       (Ringkasan). The line then shows only when it carries filter chips or the guide's switch. */
    crumbs.hidden = spec.crumbs === false;
    var head = h('header', { class: 'pg-head' + (guideHead ? ' pg-head--guide' : '') + (spec.crumbs === false ? ' pg-head--nocrumbs' : '') }, [
      h('div', { class: 'pg-crumbrow' }, [crumbs, chips, guideHead ? tools : null]),
      h('div', { class: 'pg-title-row' }, [h('h1', { class: 'pg-title', id: titleId, text: spec.title || entry.title }), tipBtn, demoPill, guideHead ? null : tools]),
      spec.lede === false ? null : h('p', { class: 'pg-lede', text: spec.lede || entry.help })
    ]);
    var cardsEl = h('div', { class: 'pg-cards', role: 'list' });
    var emptyEl = h('div', { class: 'pg-empty' });
    var outline = h('div', { class: 'pg-outline' });
    var custom = h('div', { class: 'pg-custom' });
    var prov = h('p', { class: 'prov pg-prov' });
    var body = spec.emptyFirst === false ? h('div', { class: 'pg-body' }, [cardsEl, custom, emptyEl]) : h('div', { class: 'pg-body' }, [emptyEl, cardsEl, custom]);

    var actions = h('div', { class: 'pg-actions' });
    function buildActions() {
      clear(actions);
      if (deep) return;
      var prim = spec.primary;
      var empty = !filled();
      if (prim) {
        var pb = h('button', { type: 'button', class: 'btn btn--primary btn--lg' }, [prim.icon ? icon(prim.icon) : null, h('span', { text: prim.label })]);
        pb.addEventListener('click', function () { safe(prim.run); });
        actions.appendChild(pb);
      } else if (spec.primary !== false) {
        if (empty && dataKeys().length) {
          var imp = h('button', { type: 'button', class: 'btn btn--lg btn--primary' }, [icon('upload'), h('span', { text: T.importData })]);
          imp.addEventListener('click', function () { navigate('data', { view: 'deep' }); });
          actions.appendChild(imp);
        }
        if (entry.id !== 'overview') {
          var see = h('button', { type: 'button', class: 'btn btn--lg ' + (empty && dataKeys().length ? 'btn--secondary' : 'btn--primary') }, [h('span', { text: T.seeDetails }), icon('chev-r')]);
          see.addEventListener('click', function () { setView('deep'); });
          actions.appendChild(see);
        }
      }
    }

    var lastSig = null;
    function fill(force) {
      var cards = typeof spec.cards === 'function' ? (safe(spec.cards, null, [S.derived, ctxRef, null]) || []) : (spec.cards || []);
      var empty = !filled();
      if (empty && dataKeys().length) cards = cards.filter(function (c) { return c.value != null; });   // U3: no empty bank tiles; the empty card explains
      var bank = dataKeys().length > 0;
      demoPill.hidden = !(DEMO.on && bank);
      var sig = JSON.stringify([empty, cards.map(function (c) { return [c.label, c.value, c.explain, c.source, c.demo]; }), S.theme, DEMO.on]);
      if (sig === lastSig && !force) return;
      lastSig = sig;
      clear(cardsEl);
      cards.forEach(function (c) { var e = cardEl(c, bank); e.setAttribute('role', 'listitem'); cardsEl.appendChild(e); });
      cardsEl.hidden = !cards.length;
      clear(emptyEl);
      if (empty && dataKeys().length) emptyEl.appendChild(emptyCard(entry, { needs: needs(), shows: pick('shows', []), button: deep }));
      emptyEl.hidden = !emptyEl.firstChild;
      if (deep) {
        clear(outline);
        var blocks = pick('blocks', []);
        if (blocks.length) {
          outline.appendChild(h('p', { class: 'pg-outline__t', text: empty ? 'Yang tampil setelah data masuk' : 'Panel yang sedang disiapkan' }));
          var grid = h('div', { class: 'pg-outline__grid' });
          blocks.forEach(function (b) {
            grid.appendChild(h('article', { class: 'pg-block', style: entry.layout === 'rails' ? null : { 'grid-column': 'span ' + Math.min(12, b.s || 12) } }, [
              h('span', { class: 'pg-block__kind', text: KIND[b.k] || 'Panel' }),
              h('span', { class: 'pg-block__t', text: b.t }),
              h('span', { class: 'pg-block__note', text: b.note || (empty && needs().length ? 'Perlu sheet ' + needs().join(', ') : 'Segera tersedia') })
            ]));
          });
          outline.appendChild(grid);
        }
        outline.hidden = !outline.firstChild;
      }
      var dk = dataKeys();
      prov.textContent = dk.length && !empty ? provenance(dk[0]) : (spec.source || (dk.length ? 'Data bank belum diimpor. Angka publik memuat sumbernya sendiri.' : 'Sumber: data publik · hanya di komputer ini'));
      buildActions();
      actions.hidden = !actions.firstChild;
    }

    var foot = h('footer', { class: 'pg-foot' }, [actions, prov]);
    var nodes;
    if (isPage) {
      if (deep) body.appendChild(outline);
      nodes = [h('section', { class: 'pg-page' + (deep ? ' is-deep' : ''), 'aria-labelledby': titleId }, [
        h('div', { class: 'pg-page__scroll' }, [h('div', { class: 'pg-page__inner' }, [head, body, foot])])])];
    } else if (!deep) {
      nodes = [h('aside', { class: 'guide panel', 'aria-labelledby': titleId }, [h('div', { class: 'guide__scroll' }, [head, body]), foot])];
    } else if (entry.layout === 'rails') {
      body.appendChild(outline);
      nodes = [h('aside', { class: 'rail rail--l panel pg-rail', 'aria-labelledby': titleId }, [h('div', { class: 'rail__scroll pg-rail__scroll' }, [head, body]), foot])];
    } else {
      var width = { 'sheet-wide': ' sheet--data' }[entry.layout] || '';
      body.appendChild(outline);
      nodes = [h('section', { class: 'sheet panel panel--sheet pg-sheet' + width, 'aria-labelledby': titleId }, [
        h('div', { class: 'sheet__scroll' }, [h('div', { class: 'sheet__head' }, [head]), h('div', { class: 'sheet__body' }, [body])]), foot])];
    }
    append(host, nodes);
    var api = {
      el: nodes[0], body: body, head: head, crumbs: crumbs, chips: chips,
      update: function (d, keys) {
        fill(keys && (keys.indexOf('theme') >= 0 || keys.indexOf('*') >= 0));
        if (typeof spec.refresh === 'function') safe(spec.refresh, null, [d, keys, custom]);
      },
      padding: function () { return measurePadding(host); },
      refill: function () { fill(true); }
    };
    cur.page = api;
    if (typeof spec.render === 'function') safe(spec.render, null, [custom, ctxRef]);
    custom.hidden = !custom.firstChild;
    fill(true);
    syncCrumbs();
    return api;
  }

  /* ============================================================ RENDER LOOP */

  function wireState() {
    MCD.state.on('change', function (e) {
      var keys = (e && e.keys) || [];
      if (keys.indexOf('view') >= 0) onViewChange(keys);
      if (keys.indexOf('section') >= 0) requestMount(e.state.section);
      if (keys.indexOf('privacy.reveal') >= 0 || keys.indexOf('privacy.veil') >= 0) onPrivacyChange();
      schedule(keys);
    });
    MCD.state.on('data', function () { schedule(['data']); });
    MCD.state.on('hover', function (e) {
      if (S.mapOK) safe(MCD.map.setHover, MCD.map, [e.hover]);
      if (S.cur && S.cur.mod && typeof S.cur.mod.onHover === 'function') safe(S.cur.mod.onHover, S.cur.mod, [e.hover]);
    });
    MCD.state.on('select', function (e) {
      reserveSheet(e.selection);                     /* phones: the map aims above the sheet that opens for it */
      if (S.mapOK) safe(MCD.map.select, MCD.map, [e.selection]);
      showDetail(e.selection);
    });
    if (cfg().onChange) cfg().onChange(function () { schedule(['settings']); });
    /* item 27: "Jam sibuk" / "Motor (tanpa tol)" (MCD.distance) changed: sections get update(derived, ['distance']) */
    root.addEventListener('mcd:distance', function () { if (S.booted) schedule(['distance']); });
    /* v6: the 5 / 15 / 30 km switch of the sections (MCD.inst.scope, a view setting, not state; D4) */
    var I = MCD.inst;
    if (I && I.scope && typeof I.scope.on === 'function') safe(I.scope.on, I.scope, [onScopeChange]);
  }

  function schedule(keys) {
    (keys || []).forEach(function (k) { S.dirty[k] = 1; });
    if (S.raf) return;
    S.raf = raf(flush);
    S.rafT = setTimeout(flush, 120);                 // rAF is throttled while a heavy frame or a hidden tab stalls it
  }

  function flush() {
    if (!S.raf && !S.rafT && !Object.keys(S.dirty).length && S.derived) return;
    if (S.raf && root.cancelAnimationFrame) root.cancelAnimationFrame(S.raf);
    clearTimeout(S.rafT);
    S.raf = 0; S.rafT = 0;
    if (mountQ.to) return;                           /* a section switch waits for its first frame; mountNow() renders */
    var keys = Object.keys(S.dirty);
    S.dirty = {};
    if (!keys.length) keys = ['*'];
    var s = st();
    if (S.cur && s.section !== S.cur.id) mountSection(s.section);
    var d = null;
    try { d = MCD.derive.compute(s); } catch (e) { report(e); }
    if (d) S.derived = d;
    if (S.mapOK) safe(MCD.map.render, MCD.map, [S.derived]);
    safe(updateReadout);
    safe(updateTopStatus);
    refreshMapControls();
    updateFurniture();
    runUpdate(S.cur, S.derived, keys);
    /* v6 §3.6: the slim rail follows numbers a section changes outside MCD.state (the Kampus scope, memory-only filters) */
    var Wp = winApi();
    if (Wp && typeof Wp.paintSummary === 'function') safe(Wp.paintSummary, Wp);
    if (S.drawerSel && (keys.indexOf('data') >= 0 || keys.indexOf('privacy.veil') >= 0 || keys.indexOf('privacy.reveal') >= 0 || keys.indexOf('settings') >= 0 || keys.indexOf('distance') >= 0)) showDetail(S.drawerSel, { refresh: true });
    if (S.cur && !OUTER.done && !OUTER.queued) probeOuter(S.cur.id, false);
  }

  /* ========================================================= DETAIL (§E.8) */

  function showDetail(sel, opts) {
    if (!sel) { closeDrawer(true); return; }
    if (!opts || !opts.refresh) {
      var mod = S.cur && S.cur.mod;
      if (mod && typeof mod.onSelect === 'function' && safe(mod.onSelect, mod, [sel]) === true) { closeDrawerSoon(); return; }
    }
    var model = detailModel(sel);
    if (!model) {
      /* a selection no section here can show (a merchant dot after switching to Overview, for example):
         drop it instead of opening an empty drawer with a raw id */
      closeDrawer(true);
      var cur = st().selection;
      if (cur && cur.kind === sel.kind && cur.id === sel.id) MCD.state.set({ selection: null }, { history: 'none' });
      return;
    }
    S.drawerSel = sel;
    openDrawer(model, { keepSelection: true });
  }

  /**
   * A section that takes the selection (onSelect → true) opens its own drawer a task later, or nothing (a map chip opens
   * the popup instead). Close the drawer on screen only when no drawer opened meanwhile: another item in an open drawer
   * then swaps its content (30 ms steps) instead of replaying the whole entrance and the furniture slide (item 38).
   */
  function closeDrawerSoon() {
    var d = S.drawer;
    if (!d || !d.el.classList.contains('is-open')) { closeDrawer(true); return; }
    var seq = S.drawerSeq;
    S.drawerSel = null;
    setTimeout(function () { if (S.drawerSeq === seq) closeDrawer(true); }, 0);
  }

  function ensureDrawer() {
    if (S.drawer) return S.drawer;
    var title = h('div', { class: 'drawer__titles' });
    var closeB = h('button', { type: 'button', class: 'btn btn--secondary btn--lg drawer__close', title: T.close + ' (Esc)', 'aria-keyshortcuts': 'Escape' },
      [icon('close'), h('span', { text: T.close })]);
    closeB.addEventListener('click', function () { closeDrawer(); });
    /* phones: the handle of the bottom sheet (hidden from 768 px, shell.css) */
    var grab = h('button', { type: 'button', class: 'drawer__grab', 'aria-expanded': 'false', 'aria-label': T.sheetGrow, title: T.sheetHint },
      [h('span', { class: 'drawer__grip', 'aria-hidden': 'true' })]);
    grab.addEventListener('click', function () {
      if (S.sheetDragged) { S.sheetDragged = false; return; }    /* the click that ends a drag is not a tap */
      var s = S.sheet;
      if (s && s.on) setSheetState(s.state === 'peek' && s.peek < s.full - 1 ? 'full' : 'peek');
    });
    var head = h('header', { class: 'drawer__head' }, [title, closeB]);
    var body = h('div', { class: 'drawer__body' });
    var foot = h('footer', { class: 'prov drawer__prov' });
    var el = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Detail', hidden: true },
      [grab, head, body, foot]);
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDrawer(); } });
    S.overlay.appendChild(el);
    S.drawer = { el: el, grab: grab, head: head, title: title, body: body, foot: foot, close: closeB };
    sheetDrag(S.drawer);
    var W0 = winApi();
    if (W0) safe(W0.adoptDrawer, W0, [S.drawer]);                  /* item 43: the card chrome (desktop and tablet only, CSS) */
    return S.drawer;
  }

  /**
   * openDrawer({eyebrow, title, sub:[nodes], tags:[nodes], body:[nodes], prov:string, kind?, brief?, quick?, crumb?,
   * listFirst?, blocks?, hints?, anchor?}, {keepSelection, refresh, explicit, phone}). Item 43: with MCD.windows a map
   * pick first shows a callout (route), the drawer becomes the active card (decorate); the older fields are unchanged.
   */
  function openDrawer(model, opts) {
    var d = ensureDrawer();
    S.drawerSeq = (S.drawerSeq || 0) + 1;
    opts = opts || {};
    var W0 = winApi(), ws = winActive();
    if (ws && safe(W0.route, W0, [model, opts, S.drawerSel]) === 'callout') return;
    clear(d.title); clear(d.body);
    append(d.title, [
      model.eyebrow ? h('span', { class: 't-eyebrow', text: model.eyebrow }) : null,
      h('h2', { class: 'dd-title', text: model.title || '—' }),
      model.sub ? h('div', { class: 'dd-sub' }, model.sub) : null,
      model.tags ? h('div', { class: 'dd-tags' }, model.tags) : null,
      gmapsRow(model.gmaps)
    ]);
    append(d.body, model.body || []);
    d.foot.textContent = model.prov || '';
    d.foot.hidden = !model.prov;
    /* item 43: card head (numbers, quick action, crumb), folds, Sumber, dock side; phones: the brief and the sticky row */
    if (W0) safe(W0.decorate, W0, [d, model, opts]);
    d.el.setAttribute('aria-label', model.title || 'Detail');
    if (!opts || !opts.keepSelection) S.drawerSel = null;
    var wasOpen = !d.el.hidden && d.el.classList.contains('is-open');
    var refresh = !!(opts && opts.refresh);
    if (d.anim) { d.anim.cancel(); d.anim = null; }               /* measured below without a block in mid-rise */
    if (d.el.hidden) {
      d.el.hidden = false;
      sheetLayout(d, 'peek');                                       /* phones: the sheet starts from its peek height */
      void d.el.offsetWidth;
    } else sheetLayout(d, wasOpen && refresh && S.sheet ? S.sheet.state : 'peek');   /* another item: back to the peek */
    d.el.classList.add('is-open');
    if (!wasOpen) slideFurniture(function () { doc.body.classList.add('is-drawer-open'); }, true);
    else doc.body.classList.add('is-drawer-open');
    if (!refresh) d.body.scrollTop = 0;
    if (!wasOpen && !refresh && !ws) d.close.focus({ preventScroll: true });   /* a card keeps the focus where it was (item 43) */
    if (S.sheet && S.sheet.on) {
      if (!wasOpen) revealMapAboveSheet();
      applyLayout();                                                /* the map keeps its points above the sheet */
    }
    /* item 38: the panel slides and fades in (components.css; on phones it rises as a sheet, shell.css); its blocks
       follow 35 ms apart. Another item in an open drawer: only the content moves, shorter. A refresh (new data,
       distance switch) never moves. */
    if (!refresh) {
      var blocks = [d.title].concat(Array.prototype.slice.call(d.body.children || []));
      if (!d.foot.hidden) blocks.push(d.foot);
      d.anim = staggerIn(blocks, wasOpen ? { stepMs: 30, ms: 240, y: 4 } : { stepMs: 35, delayMs: 70, ms: motionMs('base') });
    }
  }

  function closeDrawer(silent, o) {
    /* item 43: a pinned card stays when its selection goes (a click on the empty map, another item) */
    var W0 = winApi();
    if (W0 && safe(W0.beforeClose, W0, [silent, o]) === 'pinned') return true;
    var d = S.drawer;
    var wasOpen = !!(d && d.el.classList.contains('is-open'));
    if (d) {
      d.el.classList.remove('is-open');
      if (wasOpen) slideFurniture(function () { doc.body.classList.remove('is-drawer-open'); }, false);
      else doc.body.classList.remove('is-drawer-open');
      setTimeout(function () { if (!d.el.classList.contains('is-open')) d.el.hidden = true; }, motionMs('fast') + 40);   /* after its fade */
    }
    if (S.sheet && S.sheet.on) {
      S.sheet.on = false;
      if (wasOpen) applyLayout();
    }
    /* the page returns to where it was only when staff close the details themselves (Tutup, Esc); a section switch
       or another selection leaves the page where it is */
    if (!silent && wasOpen) restoreScrollAfterSheet(); else S.sheetScroll = null;
    var had = S.drawerSel;
    S.drawerSel = null;
    /* Close (or Esc) on a drawer a section opened for the selected item also drops that selection,
       so it does not follow into the next section */
    if (!silent && (had || wasOpen) && st().selection) MCD.state.set({ selection: null }, { history: 'none' });
    return wasOpen;
  }

  /*
   * Details as a bottom sheet on phones (< 768 px; COPY_STYLE_EN items 36 and 38). A drawer over the whole screen
   * hid the map, so the route line of a selected merchant or school was never seen. Below 768 px the drawer is a
   * sheet along the bottom with three heights: "peek" (its content, at most 45 % of the screen; the default),
   * "full" (the whole height under the top bar) and "mini" (the handle and the title only, the most map). The
   * handle switches peek ⇄ full with a tap or the keyboard; dragging the handle or the title moves the sheet with
   * the finger and lets go at the nearest height. The sheet moves with transforms only (shell.css): it is always
   * full height and slides down by --sheet-y; the body gets the same amount of extra padding at its end, so every
   * line can still be scrolled into view while it peeks. The map padding keeps the points, the route and the
   * focus above the sheet (peek or mini; under the full sheet the map stays as it was). On a phone that has
   * scrolled the page over the map, the page goes back to the top so the map shows, and returns on Tutup.
   */
  var SHEET_MQ = '(max-width: 767px)', SHEET_PEEK = 0.45, SHEET_STATES = ['full', 'peek', 'mini'];   /* item 43: peek ≤ 45 % (was 55 %) */
  /* selections that open no details: a kecamatan chip or outline (the territory popup), a cluster (zooms in) */
  var NO_SHEET_KINDS = /territory|cluster|tile|ring/i;
  function sheetMode() { return mq(SHEET_MQ); }
  function sheetLayout(d, state) {
    var el = d.el;
    if (!sheetMode()) {
      if (el.classList.contains('is-sheet')) {
        el.classList.remove('is-sheet', 'is-expanded', 'is-mini', 'is-dragging');
        ['--sheet-y', '--sheet-y-mini', '--sheet-pad'].forEach(function (k) { el.style.removeProperty(k); });
        el.style.removeProperty('transform');
      }
      S.sheet = null;
      return;
    }
    el.classList.add('is-sheet');
    var full = el.offsetHeight || 0;
    /* item 43: the peek ends at the brief (numbers and the sticky action row, MCD.windows) when there is one */
    var brief = Array.prototype.filter.call(d.body.children || [], function (n) { return n.classList && (n.classList.contains('ws-brief') || n.classList.contains('ws-sticky')); }).pop();
    var r0 = d.body.getBoundingClientRect(), last = brief || d.body.lastElementChild;
    var bodyH = (last ? Math.max(0, last.getBoundingClientRect().bottom - r0.top + (d.body.scrollTop || 0)) : 0) + 16;   /* content + its end padding */
    var top = (d.grab.offsetHeight || 0) + (d.head.offsetHeight || 0);
    var natural = top + bodyH + (d.foot.hidden ? 0 : (d.foot.offsetHeight || 0));
    var peek = Math.round(Math.max(Math.min(top, full), Math.min(full, natural, (root.innerHeight || full) * SHEET_PEEK)));
    var mini = Math.round(Math.min(peek, top));
    S.sheet = { on: true, state: SHEET_STATES.indexOf(state) >= 0 ? state : 'peek', full: full, peek: peek, mini: mini,
      yPeek: Math.max(0, full - peek), yMini: Math.max(0, full - mini) };
    S.sheetReserve = 0;
    clearTimeout(S.sheetReserveT);
    el.style.setProperty('--sheet-y', S.sheet.yPeek + 'px');
    el.style.setProperty('--sheet-y-mini', S.sheet.yMini + 'px');
    el.style.setProperty('--sheet-pad', S.sheet.yPeek + 'px');
    paintSheetState();
  }
  function paintSheetState() {
    var d = S.drawer, s = S.sheet;
    if (!d || !s) return;
    d.el.classList.toggle('is-expanded', s.state === 'full');
    d.el.classList.toggle('is-mini', s.state === 'mini');
    d.grab.setAttribute('aria-expanded', s.state === 'full' ? 'true' : 'false');
    d.grab.setAttribute('aria-label', s.state === 'full' ? T.sheetShrink : (s.state === 'mini' ? T.sheetPeek : T.sheetGrow));
  }
  function setSheetState(state) {
    var s = S.sheet;
    if (!s || !s.on || SHEET_STATES.indexOf(state) < 0 || s.state === state) return;
    s.state = state;
    paintSheetState();
    applyLayout();
  }
  /** px of the viewport bottom the open sheet covers for the map: its peek or mini height (the full sheet keeps the
      peek), or the peek reserved for a sheet about to open (reserveSheet). */
  function sheetCover() {
    var s = S.sheet;
    if (doc.body.getAttribute('data-layout') === 'page') return 0;               /* Ringkasan, Data & Privasi: no map */
    if (!s || !s.on) return S.sheetReserve || 0;
    return s.state === 'mini' ? s.mini : s.peek;
  }
  /**
   * A new selection on a phone: its details open as a sheet a moment later (a section opens its drawer a task after
   * onSelect), but the map starts the route fit, the focus flight or the camera move for it at once. So the peek
   * height (at most 45 %) is reserved in the map padding first, before the map hears of the selection; the sheet's
   * real height replaces it when it opens, and the reservation goes when no sheet opens within 400 ms (holdMs: an
   * MCD.app.focus flight, whose selection only comes when it lands).
   */
  function reserveSheet(sel, holdMs) {
    clearTimeout(S.sheetReserveT);
    var had = S.sheetReserve;
    S.sheetReserve = 0;
    if (sel && !NO_SHEET_KINDS.test(String(sel.kind)) && sheetMode() && !(S.sheet && S.sheet.on) && doc.body.getAttribute('data-layout') !== 'page') {
      S.sheetReserve = Math.round((root.innerHeight || 0) * SHEET_PEEK);
      S.sheetReserveT = setTimeout(function () { if (S.sheetReserve) { S.sheetReserve = 0; applyLayout(); } }, holdMs || 400);
    }
    if (had !== S.sheetReserve) applyLayout();
  }
  function sheetDrag(d) {
    var drag = null;
    function snapY(state) { var s = S.sheet; return state === 'full' ? 0 : (state === 'mini' ? s.yMini : s.yPeek); }
    function down(e) {
      var s = S.sheet;
      if (!s || !s.on || drag || (e.button != null && e.button > 0)) return;
      var t = e.target;
      if (t && t.closest && t.closest('a, input, select, textarea, label, button:not(.drawer__grab), [role="button"]')) return;
      drag = { id: e.pointerId, y: e.clientY, base: snapY(s.state), at: s.state, moved: false, last: snapY(s.state), lastT: now(), v: 0 };
      try { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* the drag still follows inside */ }
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id || !S.sheet) return;
      var dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) < 6) return;
      if (!drag.moved) { drag.moved = true; d.el.classList.add('is-dragging'); }
      var y = Math.max(0, Math.min(S.sheet.yMini, drag.base + dy)), t = now();
      if (t > drag.lastT) drag.v = (y - drag.last) / (t - drag.lastT);   /* px per ms, + = down */
      drag.last = y; drag.lastT = t;
      d.el.style.transform = 'translateY(' + Math.round(y) + 'px)';
      if (e.cancelable) e.preventDefault();
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var g = drag;
      drag = null;
      if (!g.moved) return;                                         /* a tap: the handle's click decides */
      S.sheetDragged = e.currentTarget === d.grab;
      setTimeout(function () { S.sheetDragged = false; }, 0);
      d.el.classList.remove('is-dragging');
      d.el.style.removeProperty('transform');
      if (!S.sheet) return;
      /* the nearest height, or the next one in the direction of a quick flick */
      var order = SHEET_STATES.map(function (k) { return { k: k, y: snapY(k) }; });
      var pick = order.reduce(function (a, b) { return Math.abs(b.y - g.last) < Math.abs(a.y - g.last) ? b : a; });
      if (Math.abs(g.v) > 0.5) {
        var i = SHEET_STATES.indexOf(g.at) + (g.v > 0 ? 1 : -1);
        if (i >= 0 && i < SHEET_STATES.length) pick = order[i];
      }
      if (pick.k === S.sheet.state) { paintSheetState(); return; }
      setSheetState(pick.k);
    }
    [d.grab, d.head].forEach(function (el) {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  }
  /** Phones (< 600 px), where the page scrolls over the map: back to the top so the map above the sheet shows. */
  function revealMapAboveSheet() {
    if (!mq('(max-width: 599px)') || doc.body.getAttribute('data-layout') === 'page') return;
    var y = root.scrollY || root.pageYOffset || 0;
    if (y < 8) { S.sheetScroll = null; return; }
    S.sheetScroll = y;
    try { root.scrollTo({ top: 0, behavior: stillMotion() ? 'auto' : 'smooth' }); } catch (e) { root.scrollTo(0, 0); }
  }
  /** Tutup: the page returns to where it was, unless it was scrolled meanwhile. */
  function restoreScrollAfterSheet() {
    var y = S.sheetScroll;
    S.sheetScroll = null;
    if (y == null || (root.scrollY || root.pageYOffset || 0) > 8) return;
    try { root.scrollTo({ top: y, behavior: stillMotion() ? 'auto' : 'smooth' }); } catch (e) { root.scrollTo(0, y); }
  }

  /**
   * With details open, the map controls step left of the drawer (shell.css, ≥ 1024 px). They move there with the
   * drawer instead of jumping (item 38): measure, change, then animate the difference with translate only (FLIP).
   */
  function slideFurniture(change, opening) {
    var els = [S.mc && S.mc.el, doc.querySelector && doc.querySelector('#map .maplibregl-ctrl-bottom-right')].filter(function (el) {
      return el && !el.hidden && el.offsetWidth > 0 && typeof el.animate === 'function';
    });
    if (stillMotion() || !els.length) { change(); return; }
    var before = els.map(function (el) { return el.getBoundingClientRect().left; });
    change();
    els.forEach(function (el, i) {
      var dx = before[i] - el.getBoundingClientRect().left;
      if (Math.abs(dx) < 1) return;
      try {
        el.animate([{ translate: dx + 'px 0' }, { translate: '0 0' }],
          { duration: motionMs(opening ? 'base' : 'fast'), easing: opening ? (MCD.motion ? MCD.motion.ease.out : 'ease-out') : (MCD.motion ? MCD.motion.ease.inOut : 'ease-in-out') });
      } catch (e) { /* the controls simply stand in their new place */ }
    });
  }

  /** "Buka di Google Maps" under a drawer title (item 22): {lat, lon, approx?} or {q}; nothing without a valid place. */
  function gmapsRow(g) {
    var G = MCD.util && MCD.util.gmaps;
    if (!g || !G || typeof G.link !== 'function') return null;
    var a = G.link(g, { approx: !!g.approx, label: g.label });
    if (!a) return null;
    return h('div', { class: 'dd-gmaps' }, [a, g.approx ? h('p', { class: 'dd-gmaps__note', text: G.APPROX_NOTE || '' }) : null]);
  }

  function block(title, kids, cls) {
    return h('section', { class: 'dd-blk' + (cls ? ' ' + cls : '') }, [h('h3', { class: 't-eyebrow dd-blk__t', text: title })].concat(kids || []));
  }

  /** Built-in details: map places (sites) and Mabes TNI. Sections open their own details through onSelect or ctx.openDrawer. */
  function detailModel(sel) {
    switch (sel.kind) {
      case 'site': return siteModel(sel.id);
      case 'mabes': return mabesModel();
      default: return null;          /* other kinds belong to a section (onSelect); nothing to show here */
    }
  }

  var SITE_KIND_ID = {
    mandiri_branch: 'Cabang Mandiri', mandiri_atm: 'ATM Mandiri', competitor_branch: 'Bank lain', hq_complex: 'Markas',
    hq_navy: 'Markas TNI AL', hq_airforce: 'Markas TNI AU', hq_unit: 'Markas atau satuan', gate: 'Gerbang',
    military_housing: 'Perumahan TNI', navy_housing: 'Perumahan TNI AL', hospital: 'Rumah sakit', school: 'Sekolah atau kampus',
    market: 'Pasar', koperasi: 'Koperasi', other: 'Tempat lain'
  };
  function siteModel(id) {
    var s = ((MCD.data && MCD.data.sites) || []).filter(function (x) { return x.id === id; })[0] || (MCD.ref && MCD.ref.siteById && MCD.ref.siteById[id]);
    if (!s) return null;
    var conf = { high: 'tinggi', medium: 'sedang', low: 'rendah' }[s.confidence] || s.confidence || '—';
    var c = cfg().center || {};
    /* a TNI site reads the same as its map badge and tooltip ("TNI AL · Markas", item 34) */
    var pk = MCD.ref && typeof MCD.ref.pangkalanOf === 'function' ? safe(MCD.ref.pangkalanOf, MCD.ref, [s]) : null;
    var mt = pk && MCD.ref.matra && MCD.ref.matra[pk.matra];
    return {
      eyebrow: String((pk && pk.label) || SITE_KIND_ID[s.kind] || s.kind || 'Tempat').toUpperCase(),
      title: s.home ? 'Bank Mandiri KCP Jakarta Cilangkap' : (s.name || s.label),
      sub: [h('span', { class: 'c-2', text: s.label && s.label !== s.name ? s.label : '' })],
      tags: [h('span', { class: 'tag' + (s.confidence === 'low' ? ' tag--asumsi' : ''), text: 'Ketepatan lokasi: ' + conf })],
      gmaps: { lat: s.lat, lon: s.lon },
      body: [
        block('Lokasi', [h('p', { class: 'dd-mono', text: F().coord(s.lat, s.lon, 5) }),
          h('p', { class: 'dd-mono c-2', text: F().km(MCD.util.geo.haversineKm(c.lat, c.lon, s.lat, s.lon)) + ' dari Mabes TNI' }),
          s.home ? null : travelLine(s.lon, s.lat)]),
        pk ? block('Matra', [h('p', { text: pk.matraName + (mt && mt.note ? ' (' + mt.note + ')' : '') }),
          pk.why ? h('p', { class: 'c-2', text: 'Dasar: ' + pk.why }) : null]) : null,
        s.source ? block('Sumber', [h('p', { class: 'dd-mono dd-src', text: s.source })]) : null,
        // The research notes in data-reference.js are English source text: kept word for word, folded away so the
        // drawer reads in Indonesian (COPY_STYLE item 19), the same way KPR shows its English source notes.
        s.notes ? h('details', { class: 'dd-blk dd-fold' }, [h('summary', { class: 'dd-fold__s', text: 'Catatan sumber (bahasa Inggris)' }),
          h('p', { class: 'dd-note', lang: 'en', text: s.notes })]) : null
      ].filter(Boolean),
      prov: provenance('sites')
    };
  }
  /** "Jarak dari KCP · 4,2 km · ± 14 menit" with its plain tooltip (item 27), or null without MCD.distance. */
  function travelLine(lon, lat) {
    var D = MCD.distance;
    if (!D || typeof D.of !== 'function') return null;
    var r = safe(D.of, D, [lon, lat]);
    if (!r) return null;
    return h('p', { class: 'dd-mono c-2', title: safe(D.tip, D, [r]) || null, text: T.travelFromBranch + ' · ' + safe(D.format, D, [r]) });
  }
  function mabesModel() {
    var c = cfg().center || {}, b = cfg().branch || {};
    return {
      eyebrow: 'MABES TNI',
      title: 'Mabes TNI Cilangkap',
      sub: [h('span', { class: 'c-2', text: 'Titik ini menjadi patokan jarak 15 km di dashboard' })],
      gmaps: { lat: c.lat, lon: c.lon },
      body: [
        block('Lokasi', [h('p', { class: 'dd-mono', text: F().coord(c.lat, c.lon, 5) }),
          h('p', { class: 'dd-mono c-2', text: 'KCP Cilangkap berjarak ' + F().km(MCD.util.geo.haversineKm(c.lat, c.lon, b.lat, b.lon)) + ' dari titik ini' })]),
        block('Kawasan', [h('p', { class: 'dd-note', text: 'Kawasan Mabes TNI sekitar 272,6 ha menurut OpenStreetMap.\nGaris ini juga mencakup sebagian perumahan warga di utara dan selatan.' })])
      ],
      prov: 'Sumber: OpenStreetMap way 912445334 (ODbL)'
    };
  }

  /* ===================================================== PRIVACY (§K.3, §K.4) */

  function toggleVeil() { MCD.state.set({ privacy: { veil: !st().privacy.veil } }); }

  function toggleReveal() {
    if (st().privacy.reveal) { MCD.state.set({ privacy: { reveal: false } }); return; }
    confirmModal({ title: T.revealAskTitle, body: T.revealAskBody, ok: T.revealYes, cancel: T.cancel }).then(function (yes) {
      if (yes) MCD.state.set({ privacy: { reveal: true } });
    });
  }

  function onPrivacyChange() {
    clearTimeout(S.revealTimer);
    if (st().privacy.reveal) armReveal();
    updateTopStatus();
  }
  function armReveal() {
    clearTimeout(S.revealTimer);
    S.revealTimer = setTimeout(function () { if (st().privacy.reveal) { MCD.state.set({ privacy: { reveal: false } }); toast(T.revealIdle); } }, REVEAL_IDLE_MS);
  }
  function onActivity() { if (S.booted && st().privacy.reveal) armReveal(); }

  /* =================================================== MODAL, PALETTE, HELP */

  var focusReturn = null;
  function trap(container, e) {
    if (e.key !== 'Tab') return;
    var f = Array.prototype.slice.call(container.querySelectorAll('button:not([disabled]), input, [tabindex="0"]'));
    if (!f.length) return;
    var i = f.indexOf(doc.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }

  function confirmModal(o) {
    return new Promise(function (resolve) {
      closeModal();
      focusReturn = doc.activeElement;
      var scrim = h('div', { class: 'scrim' });
      var okB = h('button', { type: 'button', class: 'btn btn--lg ' + (o.danger ? 'btn--danger' : 'btn--primary'), text: o.ok || 'OK' });
      var noB = h('button', { type: 'button', class: 'btn btn--lg btn--secondary', text: o.cancel || T.cancel });
      var box = h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'mcd-modal-t', 'aria-describedby': 'mcd-modal-b' }, [
        h('h2', { class: 'modal__title', id: 'mcd-modal-t', text: o.title }),
        h('p', { class: 'modal__body', id: 'mcd-modal-b', text: o.body }),
        h('div', { class: 'modal__actions' }, [noB, okB])
      ]);
      function done(v) { closeModal(); resolve(v); }
      okB.addEventListener('click', function () { done(true); });
      noB.addEventListener('click', function () { done(false); });
      scrim.addEventListener('click', function () { done(false); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        trap(box, e);
      });
      append(S.overlay, [scrim, box]);
      S.modal = { scrim: scrim, box: box, cancel: function () { done(false); } };
      noB.focus();
    });
  }
  /** choiceModal({title, body, buttons: [{label, value, primary?, cls?}]}) → Promise<value | 'cancel'> */
  function choiceModal(o) {
    return new Promise(function (resolve) {
      closeModal();
      focusReturn = doc.activeElement;
      var scrim = h('div', { class: 'scrim' });
      function done(v) { closeModal(); resolve(v); }
      var btns = (o.buttons || []).map(function (b) {
        var el = h('button', { type: 'button', class: 'btn btn--lg ' + (b.primary ? 'btn--primary' : (b.cls || 'btn--secondary')), text: b.label });
        el.addEventListener('click', function () { done(b.value); });
        return el;
      });
      var box = h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'mcd-modal-t', 'aria-describedby': 'mcd-modal-b' }, [
        h('h2', { class: 'modal__title', id: 'mcd-modal-t', text: o.title }),
        h('p', { class: 'modal__body', id: 'mcd-modal-b', text: o.body }),
        h('div', { class: 'modal__actions modal__actions--wrap' }, btns)
      ]);
      scrim.addEventListener('click', function () { done('cancel'); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done('cancel'); }
        trap(box, e);
      });
      append(S.overlay, [scrim, box]);
      S.modal = { scrim: scrim, box: box, cancel: function () { done('cancel'); } };
      var prim = btns.filter(function (b, i) { return o.buttons[i].primary; })[0] || btns[0];
      if (prim) prim.focus();
    });
  }
  function closeModal() {
    var m = S.modal;
    if (!m) return false;
    S.modal = null;
    exitThenRemove(m.scrim); exitThenRemove(m.box);
    if (focusReturn && focusReturn.focus && focusReturn.isConnected) focusReturn.focus();
    focusReturn = null;
    return true;
  }

  /* ---------------------------------------------------- "Cari" (§C.7, A-17) */

  /* Tabs staff ask for by name (UX fix plan §2.1). Running one opens the section's Detail view and selects the
     tab with that label (sections build their tabs with ctx.tabs). An optional 4th item is the tab's older label,
     tried when no tab carries the new one (COPY_DECK_ID §5.5 renames). */
  var SEARCH_TABS = [
    ['merchants', 'Prioritas kunjungan', 'prioritas kunjungan daftar leads ekspor csv belum ada di lvm'],
    ['merchants', 'Kandidat EDC', 'kandidat edc sasaran lvm naik ke edc potensi rating google'],
    ['merchants', 'Kecamatan', 'per kecamatan coverage combo heatmap', 'Per kecamatan'],
    ['merchants', 'Jenis usaha', 'per jenis usaha kategori restoran toko kelontong umkm donut', 'Per jenis usaha'],
    ['merchants', 'Status LVM & EDC', 'status reaktivasi tidak aktif target ureg usak edc cabang'],
    ['merchants', 'Info & cara hitung', 'metode cara hitung rumus mengapa livin merchant', 'Info & metode'],
    /* v6 (V6_SPEC §3.2): "Daftar SMA" became "Daftar sekolah"; the old label still finds the tab */
    ['schools', 'Daftar sekolah', 'sma smk ma madrasah sekolah daftar yayasan tni ekspor kontak kelas biaya', 'Daftar SMA'],
    ['schools', 'Yayasan', 'yayasan tni sekolah'],
    ['schools', 'Program & kalkulator', 'program kalkulator tabungan sekolah'],
    ['schools', 'Tindak lanjut', 'tindak lanjut pipeline prospek sekolah', 'Pipeline'],
    /* v6 (V6_SPEC §6.11): Kampus */
    ['campus', 'Daftar kampus', 'kampus perguruan tinggi universitas institut politeknik akademi daftar mahasiswa dosen ekspor kontak'],
    ['campus', 'Merchant sekitar', 'kantin koperasi merchant sekitar kampus qris livin fotokopi'],
    ['campus', 'Tindak lanjut', 'tindak lanjut kampus payroll dosen prospek'],
    ['property', 'Proyek', 'proyek perumahan kpr rumah'],
    ['data', 'Impor', 'impor file lvm rev upload excel xlsx csv'],
    ['data', 'File dimuat', 'file dimuat hapus data'],
    ['data', 'Simpan & kata sandi', 'simpan vault kata sandi enkripsi'],
    ['data', 'Pengaturan & sumber', 'pengaturan asumsi sumber data dsr']
  ];
  /* registerSearch providers. config.js creates MCD.searchProviders first, so a section file that loads before
     app.js can register at load time: MCD.searchProviders[id] = fn (or MCD.app.registerSearch in mount). */
  var SEARCH = MCD.searchProviders && typeof MCD.searchProviders === 'object' ? MCD.searchProviders : (MCD.searchProviders = {});

  /** Search pick of a kecamatan (A-17): Merchant › Detail with the kecamatan highlighted, framed and its popup open.
      The Merchant section handles 'merchants:kec:<id>'; a section without it gets the shell's own framing and popup. */
  function openKecamatan(id) {
    var TT = MCD.territory;
    if (!TT || !id) return;
    navigate('merchants', { view: 'deep', action: 'merchants:kec:' + id, fallback: function () {
      if (!S.cur || S.cur.id !== 'merchants') return;
      var b = TT.boundsOf && TT.boundsOf(id);
      if (b && S.mapOK) MCD.map.fitBounds(b, { maxZoom: 13.5 });
      var m = MCD.sme && typeof MCD.sme.model === 'function' ? safe(MCD.sme.model, MCD.sme) : null;
      var stx = (m && m.terr) || (MCD.lvm && typeof MCD.lvm.territoryInput === 'function' ? safe(function () { return TT.stats(MCD.lvm.territoryInput()); }) : null);
      setTimeout(function () { if (S.cur && S.cur.id === 'merchants' && TT.popup) safe(TT.popup, TT, [id, { stats: stx }]); }, 450);
    } });
  }

  function paletteItems() {
    var c = cfg(), items = [], keyOf = {};
    (c.keymap || []).forEach(function (k) { if (k.scope === 'global' || (S.cur && k.scope === S.cur.id)) keyOf[k.action] = k.key; });
    function K(action) { var k = keyOf[action]; if (!k) return null; return k.replace('mod+', IS_MAC ? '⌘' : 'Ctrl+').replace('shift+', '⇧').toUpperCase(); }
    function add(group, label, run, o) { items.push(Object.assign({ group: group, label: label, run: run }, o || {})); }
    var SYN = { overview: 'ringkasan overview beranda target ureg usak coverage', merchants: 'merchant lvm edc livin qris toko usaha', schools: 'sekolah sma smk ma madrasah yayasan',
      campus: 'kampus perguruan tinggi universitas institut sekolah tinggi politeknik akademi desain mahasiswa dosen payroll kantin',
      property: 'kpr rumah perumahan cicilan kalkulator', data: 'data privasi impor ekspor file vault simpan' };

    (c.sections || []).forEach(function (s) { add('Bagian', s.title || s.label, function () { navigate(s.id); }, { key: s.key, pin: true, kw: s.label + ' ' + s.id + ' ' + (s.titleFull || '') + ' ' + (SYN[s.id] || '') }); });
    SEARCH_TABS.forEach(function (t) {
      var sec = S.byId[t[0]];
      if (!sec) return;
      add('Tab', sec.label + ' › ' + t[1], function () { navigate(t[0], { view: 'deep', action: 'tablabel:' + t[1] + (t[3] ? '|' + t[3] : '') }); }, { kw: t[2] });
    });
    if (S.byId.property) add('Tindakan', 'Hitung kemampuan bayar KPR nasabah', function () { navigate('property', { view: 'deep', action: 'property:calculator' }); }, { kw: 'kpr kalkulator cicilan gaji dsr' });
    add('Tindakan', T.importData, function () { navigate('data', { view: 'deep', action: 'tablabel:Impor' }); }, { pin: true, kw: 'impor upload file excel xlsx csv rev lvm' });
    add('Tindakan', 'Ekspor daftar merchant yang belum ada di LVM (CSV)', function () { navigate('merchants', { view: 'deep', action: 'merchants:leads' }); }, { kw: 'ekspor export csv leads daftar kunjungan' });
    add('Tindakan', 'Lihat toko LVM yang perlu diaktifkan kembali', function () { navigate('merchants', { view: 'deep', action: 'tablabel:Status LVM & EDC' }); }, { kw: 'reaktivasi diaktifkan kembali tidak aktif inactive' });
    add('Tindakan', 'Lihat target UREG dan USAK per cabang', function () { navigate('overview'); }, { kw: 'ureg usak target realisasi cabang' });

    add('Tampilan', T.viewOverview + ': ' + lcFirst(T.viewOverviewHint), function () { setView('overview'); }, { key: K('view:toggle'), kw: 'sederhana peta jalan' });
    add('Tampilan', T.viewDeep + ': ' + lcFirst(T.viewDeepHint), function () { setView('deep'); }, { key: K('view:toggle'), kw: 'detail satelit tabel grafik' });
    add('Tampilan', 'Tema ' + T.day, function () { setThemeChoice('day'); }, { key: K('theme:toggle'), kw: 'terang siang' });
    add('Tampilan', 'Tema ' + T.night, function () { setThemeChoice('night'); }, { key: K('theme:toggle'), kw: 'gelap malam proyektor' });
    var DSc = MCD.distance;
    if (DSc && typeof DSc.setPeak === 'function' && typeof DSc.setNoToll === 'function') {
      add('Tampilan', T.travelGroup + ': ' + (DSc.peakOn() ? 'matikan ' : 'nyalakan ') + lcFirst(T.travelPeak), function () { DSc.setPeak(!DSc.peakOn()); }, { kw: 'jam sibuk macet waktu tempuh jarak' });
      add('Tampilan', T.travelGroup + ': ' + (DSc.noTollOn() ? 'matikan ' : 'nyalakan ') + lcFirst(T.travelNoToll), function () { DSc.setNoToll(!DSc.noTollOn()); }, { kw: 'motor sepeda motor tanpa tol jalan tol waktu tempuh' });
    }

    if (S.mapOK) {
      var seenCam = {};          /* one entry per view: Schools' "15 km dari Mabes TNI" frames the same ring as sme15 */
      MCD.map.presets().forEach(function (p) {
        if (p.key === 'H' || seenCam[p.label]) return;
        seenCam[p.label] = true;
        add('Peta', 'Peta: ' + p.label, function () { if (!postureDeck()) navigate('merchants'); setTimeout(function () { MCD.map.preset(p.key); }, postureDeck() ? 0 : VIEW_FADE_MS + 120); }, { key: K('camera:' + p.key), kw: p.key + ' kamera jarak' });
      });
      add('Peta', T.resetView, function () { runAction('map:reset'); }, { key: K('map:reset'), kw: 'reset kamera' });
      add('Peta', T.legend, function () { runAction('map:legend'); }, { key: K('map:legend'), kw: 'legenda warna' });
      add('Peta', 'Tanpa gambar peta', toggleNoImagery, { kw: 'citra satelit tiles' });
      add('Peta', S.telemetryOn ? T.telemetryOff : T.telemetryOn, function () { S.telemetryOn = !S.telemetryOn; updateFurniture(); }, { kw: 'koordinat zoom telemetri' });
      if (st().filters.radiusKm != null) add('Peta', T.distAll, function () { MCD.state.set({ filters: { radiusKm: null } }); }, { kw: 'jarak lingkar hapus' });
    }

    add('Tindakan', T.veilBtn, toggleVeil, { key: 'V', kw: 'presentasi proyektor samarkan nama berbagi layar' });
    add('Tindakan', st().privacy.reveal ? 'Samarkan nama lengkap' : T.revealBtn + '…', toggleReveal, { kw: 'nama lengkap identitas' });
    add('Tindakan', T.copyLink, function () { copyText(root.location.href).then(function () { toast(T.linkCopied); }, function () { toast(T.copyFail, 'warn'); }); }, { kw: 'tautan link salin' });
    add('Tindakan', 'Simpan salinan terenkripsi (vault.js)', function () { saveEncrypted().catch(function () { /* toast shown */ }); }, { kw: 'vault simpan enkripsi' });
    add('Tindakan', DEMO.on ? 'Matikan Data contoh' : 'Nyalakan Data contoh', function () { demoSet(!DEMO.on); }, { pin: true, kw: 'demo contoh sampel ilustrasi' });
    add('Tindakan', T.lockAria, lock, { key: IS_MAC ? '⌘⇧L' : 'Ctrl+⇧L', pin: true, kw: 'kunci keluar logout' });
    add('Bantuan', 'Cara menggunakan dashboard ini', function () { openHelp(); }, { key: '?', pin: true, kw: 'bantuan panduan help' });

    /* places: the kecamatan in the 15 km focus and the kelurahan centroids */
    var TT = MCD.territory;
    if (TT && TT.ready && TT.ready()) {
      TT.kecamatan().forEach(function (k) {
        if (!(k.in15 > 0)) return;
        add('Kecamatan', 'Kec. ' + k.name, function () { openKecamatan(k.id); }, {
          sub: (k.kotaName || '') + (typeof k.distKm === 'number' ? ' · ' + F().km(k.distKm) + ' dari Mabes TNI' : ''), kw: 'kecamatan ' + k.name + ' ' + (k.kotaName || '') });
      });
    }
    var kel = (MCD.ref && MCD.ref.kelurahan) || [];
    kel.forEach(function (r) {
      add('Kelurahan', 'Kel. ' + r[0], function () {
        var id = TT && TT.kecamatanIdOf ? TT.kecamatanIdOf(r[1], r[2]) : null;
        if (id) openKecamatan(id);
        else { navigate('merchants'); setTimeout(function () { if (S.mapOK) MCD.map.flyTo({ center: [r[4], r[3]], zoom: 14.5 }); }, VIEW_FADE_MS + 120); }
      }, { sub: 'Kec. ' + r[1] + ' · ' + r[2], kw: 'kelurahan ' + r[0] + ' ' + r[1] });
    });

    Object.keys(S.commands).forEach(function (k) {
      var list = safe(S.commands[k]) || [];
      list.forEach(function (it) { if (it && it.label && typeof it.run === 'function') items.push(Object.assign({ group: 'Bagian ini' }, it)); });
    });
    return items;
  }
  /** Results of the registered search providers (merchant names, SMA, projects …) for a query. */
  function providerItems(q) {
    var out = [];
    Object.keys(SEARCH).forEach(function (id) {
      var list = null;
      try { list = SEARCH[id](q); } catch (e) { list = null; }
      (Array.isArray(list) ? list : []).slice(0, 12).forEach(function (r) {
        if (r && r.label && typeof r.run === 'function') out.push({ group: r.group || 'Hasil', label: String(r.label), sub: r.sub ? String(r.sub) : '', run: r.run, provided: true });
      });
    });
    return out;
  }

  function scoreItem(it, toks) {
    var label = norm(it.label), hay = label + ' ' + norm(it.sub || '') + ' ' + norm(it.group) + ' ' + norm(it.kw || '');
    var sc = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], p = hay.indexOf(t);
      if (p < 0) return -1;
      sc += label.indexOf(t) === 0 ? 6 : (new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(label) ? 4 : (label.indexOf(t) >= 0 ? 2 : 1));
    }
    /* places first: a kecamatan before a merchant with the same word in its name */
    return sc + (it.group === 'Kecamatan' ? 4 : it.group === 'Kelurahan' ? 2 : (it.provided ? -1 : 0));
  }

  function openPalette() {
    if (S.palette) { S.palette.input.focus(); return; }
    closePopover();
    focusReturn = doc.activeElement;
    var all = paletteItems();
    var scrim = h('div', { class: 'scrim scrim--palette' });
    var input = h('input', { class: 'palette__input', type: 'text', autocomplete: 'off', spellcheck: 'false', role: 'combobox', 'aria-expanded': 'true',
      'aria-controls': 'mcd-pal-list', 'aria-label': T.search, placeholder: T.searchPlaceholder });
    var list = h('div', { class: 'palette__list', id: 'mcd-pal-list', role: 'listbox', 'aria-label': 'Hasil pencarian' });
    var closeB = h('button', { type: 'button', class: 'btn btn--secondary btn--bar' }, [icon('close'), h('span', { text: T.close })]);
    closeB.addEventListener('click', function () { closePalette(); });
    var foot = h('div', { class: 'palette__foot' }, [kbd('↑'), kbd('↓'), ' pilih · ', kbd('↵'), ' buka · ', kbd('Esc'), ' tutup', h('span', { class: 'palette__sp' }), closeB]);
    var box = h('div', { class: 'palette', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.search }, [h('div', { class: 'palette__field' }, [icon('search'), input]), list, foot]);
    var shown = [], active = 0;
    function render() {
      var q = norm(input.value).trim(), toks = q ? q.split(/\s+/) : [];
      if (!toks.length) shown = all.filter(function (it) { return it.pin; });
      else shown = all.concat(providerItems(input.value.trim())).map(function (it, i) { return { it: it, s: scoreItem(it, toks), i: i }; })
        .filter(function (x) { return x.s >= 0; }).sort(function (a, b) { return b.s - a.s || a.i - b.i; }).slice(0, 40).map(function (x) { return x.it; });
      if (active >= shown.length) active = Math.max(0, shown.length - 1);
      clear(list);
      var lastG = null;
      if (!shown.length) list.appendChild(h('p', { class: 'palette__empty t-empty', text: 'Tidak ditemukan. Coba nama kecamatan, merchant, sekolah atau kampus.' }));
      shown.forEach(function (it, i) {
        if (!q && it.group !== lastG) { list.appendChild(h('div', { class: 'palette__group t-eyebrow', role: 'presentation', text: it.group })); }
        lastG = it.group;
        var row = h('div', { class: 'palette__item', role: 'option', id: 'mcd-pal-' + i, 'aria-selected': i === active ? 'true' : 'false' }, [
          it.glyph ? glyph(it.glyph) : (it.mono ? monogram(it.mono) : h('span', { class: 'palette__g', text: q ? it.group : '' })),
          h('span', { class: 'palette__label' }, [h('span', { text: it.label }), it.sub ? h('span', { class: 'palette__sub', text: it.sub }) : null]),
          it.key ? kbd(it.key) : null
        ]);
        row.addEventListener('mousemove', function () { if (active !== i) { active = i; mark(); } });
        row.addEventListener('mousedown', function (e) { e.preventDefault(); run(i); });
        list.appendChild(row);
      });
      mark();
    }
    function mark() {
      Array.prototype.forEach.call(list.querySelectorAll('.palette__item'), function (r, i) { r.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
      var cur = doc.getElementById('mcd-pal-' + active);
      if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
    }
    function run(i) {
      var it = shown[i];
      closePalette();
      if (it) safe(it.run);
    }
    input.addEventListener('input', function () { active = 0; render(); wantCampuses(input.value); });
    /* v6 (V6_SPEC §6.11, §9.1): a query of 3+ letters loads the campus list once; its names join the results when it lands */
    var tried = false;
    function wantCampuses(q) {
      if (tried || String(q || '').replace(/\s+/g, '').length < 3 || !S.byId.campus || !Object.prototype.hasOwnProperty.call(LAZY, 'campuses') || LAZY.campuses.present()) return;
      tried = true;
      lazy('campuses').then(null, function () { /* Cari keeps working without campus names */ });
    }
    var onLazy = function () { if (S.palette && S.palette.box === box && input.value.trim()) render(); };
    doc.addEventListener('mcd:lazy', onLazy);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); mark(); }
      else if (e.key === 'Enter' && doc.activeElement === input) { e.preventDefault(); run(active); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePalette(); }
    });
    scrim.addEventListener('click', closePalette);
    append(S.overlay, [scrim, box]);
    S.palette = { scrim: scrim, box: box, input: input, off: function () { doc.removeEventListener('mcd:lazy', onLazy); } };
    render();
    input.focus();
  }
  function closePalette() {
    var p = S.palette;
    if (!p) return false;
    S.palette = null;
    if (p.off) p.off();
    exitThenRemove(p.scrim); exitThenRemove(p.box);
    if (focusReturn && focusReturn.focus && focusReturn.isConnected) focusReturn.focus();
    focusReturn = null;
    return true;
  }

  /* ------------------------------------------------------- Bantuan (§L.4, U8, A-18) */

  function openHelp() {
    if (S.help) { closeHelp(); return; }
    closePopover();
    focusReturn = doc.activeElement;
    /* "Saya ingin…": the tasks staff come for (seven since v6: Kampus), each with a button that goes there */
    var tasks = [
      ['Melihat kecamatan yang perlu dikunjungi', 'Merchant › Detail › Prioritas kunjungan', function () { navigate('merchants', { view: 'deep', action: 'merchants:leads' }); }],
      ['Menyiapkan daftar merchant untuk dikunjungi', 'Merchant › Detail › Prioritas kunjungan, lalu Ekspor daftar (CSV)', function () { navigate('merchants', { view: 'deep', action: 'merchants:leads' }); }],
      ['Memantau target UREG dan USAK', 'Merchant › Detail › Status LVM & EDC', function () { navigate('merchants', { view: 'deep', action: 'tablabel:Status LVM & EDC' }); }],
      ['Mencari SMA, SMK dan MA di sekitar Mabes TNI', 'Sekolah › Detail › Daftar sekolah', function () { navigate('schools', { view: 'deep', action: 'tablabel:Daftar sekolah|Daftar SMA' }); }],
      /* v6 (V6_SPEC §6.11) */
      ['Mencari kampus untuk payroll dan kantin', 'Kampus › Detail › Daftar kampus', function () { navigate('campus', { view: 'deep', action: 'tablabel:Daftar kampus' }); }],
      S.byId.property ? ['Menghitung kemampuan bayar KPR nasabah', 'KPR › Detail › Kalkulator KPR', function () { navigate('property', { view: 'deep', action: 'property:calculator' }); }] : null,
      ['Mengimpor file LVM bulanan', 'Data & Privasi › Detail › Impor', function () { navigate('data', { view: 'deep', action: 'tablabel:Impor' }); }]
    ].filter(Boolean);                                /* null: a hidden section's task */
    var want = h('ul', { class: 'help__tasks' }, tasks.map(function (t) {
      var b = h('button', { type: 'button', class: 'btn btn--secondary help__go', 'aria-label': 'Buka: ' + t[0] }, [h('span', { text: 'Buka' }), icon('chev-r')]);
      b.addEventListener('click', function () { closeHelp(); safe(t[2]); });
      return h('li', { class: 'help__task' }, [h('span', { class: 'help__task-t' }, [h('b', { text: t[0] }), h('span', { class: 'help__task-where', text: t[1] })]), b]);
    }));
    var steps = [
      ['Pilih bagian', 'Pilih salah satu bagian di baris atas.\nBagian yang aktif bergaris bawah.'],
      ['Pilih tampilan', 'Sederhana: angka utama dan peta jalan.\nDetail: semua filter, grafik, tabel dan peta satelit.\nTombolnya ada di judul setiap bagian.'],
      ['Gerakkan peta', 'Tombol peta ada di kanan bawah.\nGunakan Atur ulang peta jika peta bergeser terlalu jauh.\nMenu Peta berisi jarak, lapisan dan Warna asli.'],
      /* items 23 and 30: outlines and label chips, no coloured areas; a soft shade outside the 15 km area */
      ['Baca peta', 'Garis abu-abu tipis: batas kecamatan, tanpa isian warna.\nLabel putih: nama kecamatan dan jumlah merchant.\nSetelah file LVM diimpor, label diberi titik kecil untuk coverage.\nKecamatan di luar 15 km diberi bayangan lembut.\nArea yang lebih jauh dibuat lebih pudar.\nGaris lingkar tipis menandai 15 km dari Mabes TNI.'],
      ['Baca warnanya', 'Hijau: telah diakuisisi atau target tercapai.\nKuning: sebagian atau hampir tercapai.\nMerah: belum diakuisisi atau tertinggal.\nAbu-abu: tidak ada data.\nBiru: potensi, sebelum file LVM diimpor.\nTitik pada label kecamatan: hijau coverage tertinggi, kuning tengah, merah terendah.\nPeta sendiri berwarna abu-abu agar titik berwarna mudah terlihat.'],
      /* items 27 and 28: distance and travel time from the branch (MCD.distance) */
      ['Jarak dari KCP', 'Merchant dan SMA menampilkan jarak dan waktu tempuh dari KCP.\nAngkanya perkiraan untuk lalu lintas normal.\nMenu Peta berisi Jam sibuk dan Motor (tanpa tol).'],
      /* v6 (V6_SPEC §6.11): the three Kampus plays, then kelas biaya (the entry line and the badge, §4.2–§4.3) */
      ['Kampus', 'Tawarkan payroll melalui kerja sama dengan pimpinan kampus atau yayasan. Jumlah dosen tetap dari PDDikti.\nAjak kantin dan koperasi menjadi Livin’ Merchant (QRIS).\nTawarkan Tabungan dan Livin’ by Mandiri kepada mahasiswa.'],
      ['Kelas biaya', 'Kelas biaya menunjukkan besar biaya sekolah atau kuliah: Premium, Atas, Menengah atau Reguler.\nTanda batang di samping titik: batang berisi dari biaya resmi atau jenis sekolah, batang kosong berarti perkiraan.\nKemudahan kerja sama tetap perlu ditanyakan ke sekolah, kampus atau yayasan.'],
      ['Lihat detail', 'Klik kecamatan atau titik di peta.\nDetail muncul di kanan, dengan tombol Buka di Google Maps.\nTekan Tutup untuk menutupnya.'],
      ['Terang atau Gelap', 'Terang untuk ruangan terang. Gelap untuk malam hari atau proyektor.\nPilihan ini diingat di komputer ini.'],
      ['Masukkan data', 'Buka Data & Privasi, lalu tekan Impor file.\nGunakan laporan bulanan Rev LVM atau template permintaan data.\nFile hanya dibaca di komputer ini.'],
      ['Coba data contoh', 'Tekan Data contoh di bagian atas untuk mengisi panel dengan angka ilustrasi.\nSetiap angka contoh bertanda CONTOH.\nData nyata kembali saat Data contoh dimatikan.']
    ];
    var how = h('ol', { class: 'help__steps' }, steps.map(function (s, i) {
      return h('li', { class: 'help__step' }, [h('span', { class: 'help__n', 'aria-hidden': 'true', text: String(i + 1) }), h('span', null, [h('b', { text: s[0] }), h('br'), h('span', { text: s[1] })])]);
    }));
    var groups = [
      { t: 'Navigasi', test: function (a) { return /^section:|^palette$|^help$|^escape$|^lock$|^view:|^theme:/.test(a); } },
      { t: 'Peta', test: function (a) { return /^camera:|^map:|^rail:/.test(a); } },
      { t: 'Privasi', test: function (a) { return /^veil$/.test(a); } },
      { t: 'Bagian ini', test: function () { return true; } }
    ];
    var keys = (cfg().keysFor ? cfg().keysFor(S.cur ? S.cur.id : 'overview') : []).slice();
    var secs = keys.filter(function (k) { return /^section:/.test(k.action); }).sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    keys = secs.concat(keys.filter(function (k) { return !/^section:/.test(k.action); }));
    var used = {};
    var cols = h('div', { class: 'help__cols' });
    groups.forEach(function (g) {
      var rows = keys.filter(function (k, i) { if (used[i]) return false; if (g.test(k.action)) { used[i] = 1; return true; } return false; });
      if (!rows.length) return;
      var dl = h('dl', { class: 'help__list' });
      rows.forEach(function (k) {
        var label = k.key.replace('mod+', IS_MAC ? '⌘ ' : 'Ctrl ').replace('shift+', '⇧ ').replace('escape', 'Esc');
        dl.appendChild(h('div', { class: 'help__row' }, [h('dt', null, [kbd(label.length === 1 ? label.toUpperCase() : label)]), h('dd', { text: k.label })]));
      });
      cols.appendChild(h('section', { class: 'help__grp' }, [h('h3', { class: 't-eyebrow', text: g.t }), dl]));
    });
    var keysToggle = h('button', { type: 'button', class: 'btn btn--secondary btn--bar', 'aria-expanded': 'false' }, [icon('keyboard'), h('span', { text: 'Pintasan keyboard' })]);
    cols.hidden = true;
    keysToggle.addEventListener('click', function () { cols.hidden = !cols.hidden; keysToggle.setAttribute('aria-expanded', cols.hidden ? 'false' : 'true'); });
    var closeB = h('button', { type: 'button', class: 'btn btn--primary btn--lg' }, [icon('close'), h('span', { text: T.close })]);
    closeB.addEventListener('click', closeHelp);
    var scrim = h('div', { class: 'scrim' });
    scrim.addEventListener('click', closeHelp);
    var box = h('div', { class: 'modal modal--help', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mcd-help-t' }, [
      h('h2', { class: 'modal__title', id: 'mcd-help-t', text: 'Bantuan' }),
      h('h3', { class: 'help__h', text: 'Saya ingin…' }),
      want,
      h('h3', { class: 'help__h', text: 'Cara menggunakan dashboard ini' }),
      how,
      h('div', { class: 'help__keys' }, [keysToggle, h('p', { class: 'help__note', text: 'Setiap pintasan juga tersedia sebagai tombol di layar.\nPintasan tidak berlaku saat Anda mengetik di kolom isian.' })]),
      cols,
      h('div', { class: 'modal__actions help__foot' }, [h('span', { class: 'help__brand' }, [
        h('img', { class: 'help__logo', src: S.theme === 'day' ? 'assets/brand/mandiri-logo.png' : 'assets/brand/mandiri-logo-reverse.png', alt: T.mandiriAlt, width: '479', height: '140', decoding: 'async' }),
        h('span', { class: 'brand-lockup help__lockup' }, [h('span', { class: 'brand-lockup__t', text: T.danantaraLead }),
          h('img', { src: S.theme === 'day' ? 'assets/brand/danantara-logo.png' : 'assets/brand/danantara-logo-reverse.png', alt: T.danantaraAlt, width: '531', height: '140', decoding: 'async' })])
      ]), closeB])
    ]);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopPropagation(); closeHelp(); }
      trap(box, e);
    });
    append(S.overlay, [scrim, box]);
    S.help = { scrim: scrim, box: box };
    box.scrollTop = 0;
    closeB.focus({ preventScroll: true });
  }
  function closeHelp() {
    var x = S.help;
    if (!x) return false;
    S.help = null;
    exitThenRemove(x.scrim); exitThenRemove(x.box);
    if (focusReturn && focusReturn.focus && focusReturn.isConnected) focusReturn.focus();
    focusReturn = null;
    return true;
  }

  /* ========================================================= KEYBOARD (§L.4) */

  function onKeyDown(e) {
    if (e.defaultPrevented || !S.booted) return;
    if (S.modal || S.palette || S.help) {                    // they own the keyboard while open
      /* focus left the box (a click on plain text inside it moves focus to the page): Esc still closes it */
      if (e.key === 'Escape') { e.preventDefault(); if (S.modal) S.modal.cancel(); else if (S.palette) closePalette(); else closeHelp(); }
      return;
    }
    var k = String(e.key || '');
    if (isTyping(e.target)) {
      if (k === 'Escape' && S.pop) { e.preventDefault(); closePopover(); }
      return;
    }
    if (e.altKey) return;
    var act = cfg().keyAction ? cfg().keyAction(S.cur ? S.cur.id : 'overview', e) : null;
    if (!act) return;
    if (runAction(act.action, e) !== false) e.preventDefault();
  }

  function runAction(action, e) {
    var m;
    if ((m = /^section:(.+)$/.exec(action))) { navigate(m[1]); return true; }
    if ((m = /^camera:(.+)$/.exec(action))) { if (S.mapOK && postureDeck()) MCD.map.preset(m[1]); return true; }
    /* "tablabel:<label>": select the tab with that label in the current section (search and Bantuan, A-17/A-18) */
    if ((m = /^tablabel:(.+)$/.exec(action))) return selectTabByLabel(m[1]);
    switch (action) {
      case 'map:reset': if (postureDeck()) resetMap(); return true;
      case 'palette': openPalette(); return true;
      case 'help': openHelp(); return true;
      case 'lock': lock(); return true;
      case 'escape': return escape();
      case 'view:toggle': setView(isDeep() ? 'overview' : 'deep'); return true;
      case 'theme:toggle': setThemeChoice(S.theme === 'day' ? 'night' : 'day'); return true;
      case 'veil': toggleVeil(); return true;
      case 'map:legend': setLegend(!legendVisible()); return true;
      /* item 43: T = Rapikan, F6 / Shift+F6 = the next / previous panel (MCD.windows) */
      case 'windows:tidy': case 'windows:next': case 'windows:prev': { var Wa = winApi(); return !!(Wa && safe(Wa.action, Wa, [action])); }
      case 'rail:left': case 'rail:right': {
        /* item 43: in the adopted workspace [ opens or slims the summary rail and ] the bottom drawer */
        var Wr = winApi();
        if (Wr && safe(Wr.action, Wr, [action])) return true;
        if (!isDeep() || !S.cur || S.cur.entry.layout !== 'rails') return false;
        doc.body.classList.toggle(action === 'rail:left' ? 'rail-l-collapsed' : 'rail-r-collapsed');
        applyLayout();
        return true;
      }
      default: {
        var md = S.cur && S.cur.mod;
        if (md && typeof md.onAction === 'function') {
          var done = md.onAction(action, e) === true;
          if (done && /^(schools|campus):scope:/.test(action)) onScopeChange();   /* v6 §3.6, §6.11 */
          return done;
        }
        return false;
      }
    }
  }

  function escape() {
    if (closePopover()) return true;
    /* item 43: the rail overlay, the callout, the card that holds the focus, then the active card (MCD.windows) */
    var W0 = winApi();
    if (W0 && safe(W0.escape, W0)) return true;
    if (S.drawer && S.drawer.el.classList.contains('is-open')) { closeDrawer(); return true; }
    if (st().selection) { MCD.state.set({ selection: null }, { history: 'none' }); return true; }
    var md = S.cur && S.cur.mod;            /* a section's own highlight (Overview: the selected kecamatan) */
    if (md && typeof md.onEscape === 'function' && md.onEscape() === true) return true;
    if (doc.body.classList.contains('is-sheet-away')) { doc.body.classList.remove('is-sheet-away'); return true; }
    return false;
  }

  /**
   * Kunci (A-11): imports that were never written to an encrypted copy are not lost silently. The dialog offers
   * "Simpan dulu" (Data & Privasi › Simpan & kata sandi), "Kunci tanpa menyimpan" and "Batal". The idle lock of
   * MCD.gate is unchanged.
   */
  function lock() {
    if (S.booted && unsavedDatasets().length) {
      choiceModal({ title: T.lockAskTitle, body: T.lockAskBody, buttons: [
        { label: T.cancel, value: 'cancel' },
        { label: T.lockAskLock, value: 'lock', cls: 'btn--secondary' },
        { label: T.lockAskSave, value: 'save', primary: true }
      ] }).then(function (v) {
        if (v === 'save') navigate('data', { view: 'deep', action: 'data:save' });
        else if (v === 'lock') lockNow();
      });
      return;
    }
    lockNow();
  }
  function lockNow() {
    if (MCD.gate && typeof MCD.gate.lock === 'function') MCD.gate.lock();
    else root.location.reload();
  }

  /** Selects the tab with this label in the current section (ctx.tabs); false when there is none. */
  function selectTabByLabel(label) {
    var wants = String(label).split('|').map(norm), host = S.cur && S.cur.host;
    if (!host || !host.querySelectorAll) return false;
    var hit = null, tabs = host.querySelectorAll('[role="tab"]');
    /* "New label|old label": the first label that names a tab wins */
    wants.forEach(function (want) {
      Array.prototype.forEach.call(tabs, function (b) { if (!hit && norm(b.textContent).indexOf(want) === 0) hit = b; });
    });
    if (!hit) return false;
    hit.click();
    try { hit.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    return true;
  }

  /* ======================================================= DRAG & DROP (§C.6) */

  function buildDropzone() {
    var frame = h('div', { class: 'dropframe', hidden: true, 'aria-hidden': 'true' }, [h('p', { class: 'dropframe__line', text: T.dropLine })]);
    doc.body.appendChild(frame);
    var depth = 0;
    function hasFiles(e) { var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; }
    doc.addEventListener('dragenter', function (e) { if (!hasFiles(e)) return; depth++; frame.hidden = false; });
    doc.addEventListener('dragover', function (e) { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    doc.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) frame.hidden = true; });
    doc.addEventListener('drop', function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0; frame.hidden = true;
      var files = Array.prototype.slice.call(e.dataTransfer.files || []);
      if (!files.length) return;
      if (DEMO.on) { demoEnsureOff().then(function (ok) { if (ok) passFiles(files); }); return; }
      passFiles(files);
    });
    function passFiles(files) {
      var dm = MCD.sections && MCD.sections.data;
      var here = !!(S.cur && S.cur.id === 'data' && !mountQ.to && !S.viewPending);
      if (here && dm && typeof dm.onFiles === 'function') { setTimeout(function () { safe(dm.onFiles, dm, [files]); }, 0); return; }
      /* Data & Privasi mounts a frame later (requestMount) or is being rebuilt: its mount takes the files (ctx.takeFiles) */
      S.pendingFiles = S.pendingFiles.concat(files);
      if (!S.cur || S.cur.id !== 'data' || mountQ.to) navigate('data');
      if (!dm) toast(T.dropQueued(files.length));
    }
  }

  /* =========================================================== GLOBAL WIRING */

  function wireGlobal() {
    doc.addEventListener('keydown', onKeyDown);
    doc.addEventListener('pointerdown', function (e) {
      onActivity();
      if (S.pop && !S.pop.el.contains(e.target) && !(S.pop.anchor && S.pop.anchor.contains(e.target))) closePopover();
    }, true);
    doc.addEventListener('keydown', onActivity, true);
    doc.addEventListener('wheel', onActivity, { passive: true, capture: true });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) S.hiddenAt = Date.now();
      else if (S.hiddenAt && Date.now() - S.hiddenAt > REVEAL_HIDDEN_MS && st().privacy.reveal) {
        MCD.state.set({ privacy: { reveal: false } });
        toast(T.revealHidden);
      }
      if (!doc.hidden) S.hiddenAt = 0;
    });
    root.addEventListener('resize', debounce(function () {
      /* an open drawer becomes the phone sheet below 768 px, and the side drawer again above (rotation, window size) */
      if (S.drawer && S.drawer.el.classList.contains('is-open')) sheetLayout(S.drawer, S.sheet ? S.sheet.state : 'peek');
      var Wz = winApi();
      if (Wz && S.cur) safe(Wz.sync, Wz, [S.cur]);                /* item 43: desk ⇄ tablet ⇄ phone, rail per width */
      applyLayout();
      syncNavInk(true);
      if (S.pop && S.pop.anchor) positionPopover(S.pop.el, S.pop.anchor);
      if (S.cur && S.cur.mod && S.cur.mod.onResize) safe(S.cur.mod.onResize, S.cur.mod);
    }, 120));
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { applyLayout(); syncNavInk(true); });
    // Global error toast (coordinator request 2). Resource errors (no e.error) and the
    // browser's benign ResizeObserver notices are not shown.
    root.addEventListener('error', function (e) {
      if (!e || !e.error) return;
      flashReadout(T.internalError, 'error');
      errorToast();
    });
    root.addEventListener('unhandledrejection', function () { flashReadout(T.internalError, 'error'); errorToast(); });
    doc.addEventListener('mcd:gate-locking', teardown);
    // Small screens: one button swaps between the panel and the map (no hidden gestures)
    var toggleB = h('button', { type: 'button', class: 'map-toggle btn btn--secondary btn--lg', 'aria-pressed': 'false' }, [icon('layers'), h('span', { class: 'map-toggle__t', text: T.showMap })]);
    toggleB.addEventListener('click', function () {
      var away = doc.body.classList.toggle('is-sheet-away');
      toggleB.setAttribute('aria-pressed', away ? 'true' : 'false');
      toggleB.querySelector('.map-toggle__t').textContent = away ? T.showPanel : T.showMap;
      applyLayout();
    });
    S.overlay.appendChild(toggleB);
  }

  /** mcd:gate-locking — drop app data before the gate reloads the page (§6). */
  function teardown() {
    clearTimeout(S.revealTimer); clearTimeout(S.toastTimer); clearTimeout(S.flashTimer);
    cancelOuter();
    SESSION = null;
    DEMO.on = false; DEMO.tagged = []; DEMO.guarded = [];
    S.derived = null; S.drawerSel = null;
    if (S.mapOK && MCD.map.clearData) safe(MCD.map.clearData, MCD.map);
    // A-10 / D14: the next sign-in starts clean on Ringkasan. The gate reloads the current URL, and the #hash
    // is the one the app wrote itself (section, view, camera), so it is dropped here. A link someone opens still
    // carries its own #s=. Runs before the gate's reload (the event is dispatched synchronously).
    try {
      if (root.location.hash && root.history && root.history.replaceState) root.history.replaceState(null, '', String(root.location.href).split('#')[0]);
    } catch (e) { /* the hash stays; the filters are still not restored */ }
  }

  /* ============================================================ SELF-TEST hook */

  // Property addendum §2.4: ?selftest=1 injects the self-test runners that exist.
  function selfTest() {
    if (!/[?&]selftest=1\b/.test(root.location.search || '')) return;
    ['assets/js/kpr-selftest.js'].forEach(function (src) {
      var s = doc.createElement('script');
      s.src = src; s.async = false;
      s.onerror = function () { if (root.console) root.console.info('[MCD.app] self-test not available yet:', src); };
      doc.body.appendChild(s);
    });
  }

  /* ============================================================== PUBLIC API */

  // Post-unlock helpers for section modules. Nothing here boots the app or
  // reaches the session key; every call is a no-op before unlock.
  MCD.app = {
    version: VERSION,
    isBooted: function () { return S.booted; },
    navigate: navigate,
    view: function () { return view(); },
    setView: function (v) { if (S.booted) setView(v); },
    theme: function () { return S.theme; },
    setTheme: function (t) { if (S.booted && (t === 'day' || t === 'night')) setThemeChoice(t); },
    derived: function () { return S.derived; },
    hasData: hasData,
    select: function (sel) { if (S.booted) MCD.state.set({ selection: sel || null }, { history: 'none' }); },
    openDrawer: function (m, o) { if (S.booted) openDrawer(m, o); },
    closeDrawer: function (silent, o) { if (S.booted) closeDrawer(silent, o); },
    /** Where the stage starts under the bars (px from the top of the viewport; MCD.windows, item 43). */
    stageTop: function () { return stageTop(); },
    toast: function (m, k) { if (S.booted) toast(m, k); },
    confirm: function (o) { return S.booted ? confirmModal(o) : Promise.resolve(false); },
    mapControls: function (o) { if (S.booted) { S.mcExtra = o || null; renderMapControls(); } },
    dock: function (o) { if (!S.booted) return null; S.mcExtra = o || null; renderMapControls(); return h('span', { class: 'dock-slot', hidden: true }); },
    relayout: function () { if (S.booted) { applyLayout(); fitFurniture(); } },   /* item 43: the controls' words follow the free width */
    requestRender: function (keys) { if (S.booted) schedule(keys || ['ext']); },
    privacyMode: function () { return S.booted ? pmode() : 'masked'; },
    provenance: function (k, x) { return S.booted ? provenance(k, x) : ''; },
    registerCommands: function (key, fn) { if (key && typeof fn === 'function') S.commands[String(key)] = fn; },
    /** registerSearch(id, fn(query) → [{label, sub, run, group?}]): extra "Cari" results (A-17). May be called at load time. */
    registerSearch: function (id, fn) { if (id && typeof fn === 'function') SEARCH[String(id)] = fn; else if (id) delete SEARCH[String(id)]; },
    /** tabs(host, opts): the shared tab strip (A-09) outside a section page (memory key 'app'). */
    tabs: function (host, opts) { return buildTabs(host, opts, S.booted ? S.cur : null); },
    cameFrom: function () { return S.cur ? S.cur.cameFrom || null : null; },
    unsavedDatasets: function () { return S.booted ? unsavedDatasets() : []; },
    runAction: function (a) { return S.booted ? runAction(a, null) : false; },
    /** focus({section, kind, id, view?, lon?, lat?}): open a section on one item (map point + popup). */
    focus: function (o) { return focusItem(o); },
    /** lazy('street-index') → Promise<MCD.geocodeLocal>, lazy('travel-routes') → Promise<MCD.travel>: inject large public
        data once, after sign-in (route lines: call MCD.distance.route, which loads the routes itself). v6: lazy(
        'school-students' | 'institution-tiers' | 'school-contacts' | 'campuses') → Promise<the file's global>. */
    lazy: function (name) { return lazy(name); }
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(window, window.MCD = window.MCD || {});
