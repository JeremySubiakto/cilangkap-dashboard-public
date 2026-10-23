/* ==========================================================================
 * MCD gate — password lock screen, rendered as its own full-viewport section
 * (#gate) BEFORE the dashboard landing page.
 * Bank Mandiri KCP Jakarta Cilangkap · Acquisition Dashboard.
 *
 * ---------------------------------------------------------------------------
 * CONTRACT FOR THE APP SHELL — read before wiring index.html / app.js
 * ---------------------------------------------------------------------------
 * 1. Load order (classic scripts; docs/BUILD_SPEC.md §J.3 plus three files):
 *        CDN libraries (maplibre-gl, deck.gl, d3, papaparse)
 *        -> assets/js/vault.js -> assets/js/gate.js -> data/vault.js
 *        -> assets/js/config.js ... assets/js/app.js
 *    Link assets/css/gate.css after tokens.css and put class="mcd-locked" on
 *    <html>. While that class is present, gate.css hides every <body> child
 *    except #gate, so the shell markup never flashes before the password.
 *
 * 2. The app shell MUST NOT be initialised or rendered (no map, no charts, no
 *    data processing) until onUnlock fires. In app.js, replace the direct
 *    DOMContentLoaded -> MCD.boot() call with exactly one mount:
 *
 *        MCD.gate.mount({
 *          vault: window.MCD_VAULT,
 *          onUnlock: function (session) {  // { payload, key, salt, iter }
 *            MCD.boot(session);             // the app's single entry point
 *          }
 *        });
 *
 *    onUnlock runs after the gate section has been removed from the DOM and
 *    html.mcd-locked has been cleared (820 ms after a correct password:
 *    220 ms success state + 600 ms exit, < 900 ms measured; immediately under
 *    prefers-reduced-motion). While html.mcd-entering is set (400 ms), the
 *    shell fades in; the app needs to do nothing for this.
 *
 * 3. session.key is a NON-extractable AES-GCM CryptoKey. Keep key, salt and
 *    iter inside the app's closure only (never on window, never in storage).
 *    Use them solely with MCD.vault.encryptWithKey(obj, key, salt, iter) for
 *    the in-app "Save encrypted copy" re-save (fresh IV on every call;
 *    any other salt/iter is refused).
 *
 * 4. MCD.gate.lock() locks by removing every <body> child (the app's DOM)
 *    and reloading the page, which is the only reliable way to drop decrypted
 *    data from memory. Listen for "mcd:gate-locking" to drop app data too.
 *    The app must not block unload (no beforeunload prompt) while
 *    MCD.gate.isLocking() is true. If the reload is cancelled anyway, the gate
 *    retries after 1 s, 2 s, 4 s ... (max 30 s) with location.replace().
 *
 * 5. Idle auto-lock: default 15 minutes, set MCD.config.gate.idleMinutes
 *    before mount(). Active only after unlock; pointer, wheel, touch and
 *    keyboard activity reset it. A warning appears 60 s before locking.
 *
 * Events dispatched on document (no secrets in any detail):
 *    "mcd:gate-unlocked"     detail { iter }
 *    "mcd:gate-idle-warning" detail { secondsLeft }
 *    "mcd:gate-locking"      detail { reason: "idle" | "manual" | "restore" }
 *
 * Security hygiene: the password is read once from the input, the input is
 * cleared immediately, and neither the password nor the key is ever written
 * to storage, cookies, the URL, the console or any DOM attribute. All text is
 * set with textContent; no innerHTML, no inline handlers. The only verifier
 * is the AES-GCM authentication tag inside data/vault.js.
 * ========================================================================== */
(function (root) {
  'use strict';

  var MCD = (root.MCD = root.MCD || {});

  /* ---------------------------------------------------------- constants */

  var SITE = { lat: -6.32818, lon: 106.91329 }; // Mabes TNI Cilangkap (centroid)
  var ESRI_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  // Flat, north-up and still (COPY_STYLE_EN items 10 and 17): no pitch, no bearing, no orbit.
  var CAMERA = { zoom: 15, pitch: 0, bearing: 0 };
  var UNLOCK_ZOOM_IN = 0.6;       // gentle flat push-in during the unlock exit
  var MIN_VERIFY_MS = 520;        // keep the busy face ("Memeriksa…") visible long enough to read
  var SUCCESS_HOLD_MS = 220;      // success state (check face "Berhasil", gold edge) before the exit starts
  var UNLOCK_MS = 600;            // exit transition; 220 + 600 = 820 ms leaves ~80 ms for timer jitter under the 900 ms contract
  var ENTER_MS = 400;             // html.mcd-entering: the app shell fades in after the gate
  var WARN_BEFORE_LOCK_MS = 60000;
  var LOCK_RETRY_MS = 1000;       // first lock retry if the reload was cancelled (then x2, max 30 s)
  var STORE_THROTTLE = 'mcd.gate.throttle'; // non-secret: failed-attempt count + retry time
  var STORE_NOTICE = 'mcd.gate.notice';     // non-secret: why the last session was locked

  // On-screen copy (COPY_STYLE_EN items 19 and 24; docs/COPY_DECK_ID.md is canonical):
  // plain, short Indonesian for pelaksana. One word for locking: "dikunci", the same
  // word as the Kunci button. Lines joined by "\n" show as separate lines.
  var T = {
    eyebrow: 'KCP JAKARTA CILANGKAP (12903)',
    title: 'Dashboard Akuisisi',
    lede: 'Pantau peluang merchant, sekolah, kampus dan kesehatan di sekitar cabang.',
    cardTitle: 'Selamat datang',
    cardTitleBack: 'Masuk kembali',
    label: 'Kata sandi',
    help: 'Kata sandi diberikan oleh pengelola dashboard.',
    reveal: 'Tampilkan kata sandi',
    conceal: 'Sembunyikan kata sandi',
    caps: 'Caps Lock menyala',
    submit: 'Masuk',
    busy: 'Memeriksa…',
    done: 'Berhasil',
    verifying: 'Memeriksa kata sandi…',
    success: 'Berhasil masuk. Membuka dashboard…',
    wrong: 'Kata sandi salah. Periksa Caps Lock, lalu coba lagi.',
    wrongShort: 'Kata sandi salah.',
    empty: 'Kata sandi masih kosong. Isi kata sandi, lalu tekan Masuk.',
    wait: 'Tunggu sebentar',
    lockout: function (s) { return 'Terlalu banyak percobaan. Tunggu ' + secs(s) + ', lalu coba lagi.'; },
    restricted: 'Khusus pegawai yang berwenang',
    local: 'Data dibuka hanya di perangkat ini',
    autolock: function (m) { return 'Dikunci otomatis setelah ' + dur(m) + ' tanpa aktivitas'; },
    noticeIdle: function (m) { return 'Dashboard dikunci setelah ' + dur(m) + ' tanpa aktivitas.\nMasukkan kata sandi untuk melanjutkan.'; },
    noticeManual: 'Dashboard dikunci.\nMasukkan kata sandi untuk melanjutkan.',
    unexpected: 'Data tidak dapat dibuka. Muat ulang halaman, lalu coba lagi.',
    reload: 'Muat ulang halaman',
    admin: 'Untuk pengelola dashboard',
    copy: 'Salin perintah',
    copied: 'Perintah disalin',
    copyManual: 'Perintah dipilih. Tekan Ctrl+C untuk menyalin.',
    noCryptoTitle: 'Browser ini belum didukung',
    noCryptoBody: 'Gunakan Chrome, Edge atau Safari versi terbaru.',
    noCryptoAdmin: 'Buka file index.html langsung atau melalui http://localhost. Alamat http:// lain tidak didukung.',
    noCoreTitle: 'Komponen keamanan tidak termuat',
    noCoreBody: 'Muat ulang halaman. Jika pesan ini masih muncul, hubungi pengelola dashboard.',
    noCoreAdmin: 'File assets/js/vault.js tidak termuat. File ini harus dimuat sebelum assets/js/gate.js.',
    noVaultTitle: 'File data belum tersedia',
    noVaultBody: 'Dashboard belum dapat dibuka. Hubungi pengelola dashboard.',
    noVaultAdmin: 'File data/vault.js tidak ditemukan. Jalankan perintah ini di folder dashboard, lalu muat ulang halaman.',
    badFormatTitle: 'File data tidak dapat dibaca',
    badFormatBody: 'Dashboard belum dapat dibuka. Hubungi pengelola dashboard.',
    badFormatAdmin: 'File data/vault.js rusak atau versinya tidak didukung. Jalankan perintah ini untuk membuatnya kembali, lalu muat ulang halaman.',
    vaultCommand: 'node tools/make-vault.mjs --out data/vault.js',
    cryptoSpec: function (iterLabel) { return 'AES-256-GCM · PBKDF2 ' + iterLabel; },
    place: 'KCP Jakarta Cilangkap · Jakarta Timur',
    imagery: 'Citra satelit: Esri, Maxar, Earthstar Geographics',
    plan: 'Peta: © OpenStreetMap, Overture Maps',
    partOf: 'Bagian dari',
    warnTitle: function (s) { return 'Dashboard akan dikunci dalam ' + secs(s); },
    warnBody: 'Gerakkan mouse atau tekan tombol apa saja untuk tetap masuk.',
    warnStay: 'Tetap masuk'
  };

  /** "15 minutes" -> "15 menit", "1 hour" -> "1 jam", "1.5 minutes" -> "1,5 menit" (display only). */
  function dur(m) {
    return String(m).replace(/(\d)\.(\d)/, '$1,$2')
      .replace(/ minutes?$/, ' menit').replace(/ hours?$/, ' jam').replace(/ seconds?$/, ' detik');
  }

  /** 3 -> "3 detik", 60 -> "1 menit", 75 -> "1 menit 15 detik" (display only). */
  function secs(s) {
    s = Math.max(0, Math.ceil(Number(s) || 0));
    if (s < 60) return s + ' detik';
    var m = Math.floor(s / 60), r = s % 60;
    return m + ' menit' + (r ? ' ' + r + ' detik' : '');
  }

  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Display names for the on-screen clock (item 19: "Jumat, 16 Okt 2026 · 07.42 WIB").
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /* ------------------------------------------------------ pure helpers */

  /**
   * Progressive delay after repeated failures.
   * Default: 0 ms for attempts 1-4, then 2^(n-4) s (5th: 2 s, 6th: 4 s, ...), capped at 60 s.
   * @param {number} failedAttempts consecutive failed attempts so far (1-based)
   * @param {{freeAttempts?: number, maxSeconds?: number}} [opts]
   */
  function lockoutDelayMs(failedAttempts, opts) {
    var free = opts && isFinite(opts.freeAttempts) && opts.freeAttempts >= 0 ? Math.floor(opts.freeAttempts) : 4;
    var maxS = opts && isFinite(opts.maxSeconds) && opts.maxSeconds > 0 ? opts.maxSeconds : 60;
    var n = Number(failedAttempts);
    if (!isFinite(n) || n <= free) return 0;
    var exp = Math.floor(n) - free;
    if (exp >= 31) return maxS * 1000;
    return Math.min(Math.pow(2, exp), maxS) * 1000;
  }

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  /** A loggable error name: an identifier only, never the message (it may carry payload text). */
  function errorName(e) {
    var n = e && e.name;
    return typeof n === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(n) ? n : 'an exception';
  }

  /** -6.32818, 106.91329 -> "6°19′41″S 106°54′48″E" */
  function formatDMS(lat, lon) {
    function part(v, pos, neg) {
      var total = Math.round(Math.abs(v) * 3600);
      var d = Math.floor(total / 3600);
      var m = Math.floor((total % 3600) / 60);
      var s = total % 60;
      return d + '°' + pad(m) + '′' + pad(s) + '″' + (v < 0 ? neg : pos);
    }
    return part(lat, 'N', 'S') + ' ' + part(lon, 'E', 'W');
  }

  /** Western Indonesia Time (UTC+7, no DST) -> { date: "Mon, 12 Oct 2026", time: "14:32:05" } */
  function formatWIB(ms) {
    var d = new Date(ms + 7 * 3600 * 1000);
    return {
      date: DAYS[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(),
      time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds())
    };
  }

  /** Same clock in Indonesian for the screen -> { date: "Jumat, 16 Okt 2026", time: "07.42" } */
  function formatWIBid(ms) {
    var d = new Date(ms + 7 * 3600 * 1000);
    return {
      date: HARI[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + BULAN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(),
      time: pad(d.getUTCHours()) + '.' + pad(d.getUTCMinutes())
    };
  }

  function formatIter(iter) {
    if (iter % 1000000 === 0) return (iter / 1000000) + 'M';
    if (iter % 1000 === 0) return (iter / 1000) + 'k';
    return String(iter);
  }

  function formatMinutes(min) {
    if (min >= 60 && min % 60 === 0) return (min / 60) + (min === 60 ? ' hour' : ' hours');
    if (min < 1) return Math.round(min * 60) + ' seconds';
    var m = Math.round(min * 10) / 10;
    return m + (m === 1 ? ' minute' : ' minutes');
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function readConfig(opts) {
    var c = (MCD.config && MCD.config.gate) || {};
    function pick(k) { return opts && opts[k] !== undefined ? opts[k] : c[k]; }
    var idle = Number(pick('idleMinutes'));
    var lockout = pick('lockout') || {};
    return {
      idleMinutes: isFinite(idle) && idle > 0 ? clamp(idle, 0.25, 480) : 15,
      map: pick('map') !== false,
      lockout: { freeAttempts: lockout.freeAttempts, maxSeconds: lockout.maxSeconds }
    };
  }

  /* ------------------------------------------------- safe sessionStorage */

  function store(key, value) {
    try {
      if (value === null) root.sessionStorage.removeItem(key);
      else root.sessionStorage.setItem(key, value);
    } catch (e) { /* storage blocked: degrade silently */ }
  }

  function load(key) {
    try { return root.sessionStorage.getItem(key); } catch (e) { return null; }
  }

  /* ------------------------------------------------------- DOM helpers */

  var SVGNS = 'http://www.w3.org/2000/svg';

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  var ICONS = {
    eye: [['path', { d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    eyeOff: [['path', { d: 'M4 4l16 16' }], ['path', { d: 'M10.6 5.6c.46-.07.93-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.7 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1' }], ['path', { d: 'M9.9 9.9a3 3 0 0 0 4.2 4.2' }]],
    arrow: [['path', { d: 'M5 12h13' }], ['path', { d: 'M13 6.5L18.5 12 13 17.5' }]],
    lock: [['rect', { x: 5, y: 10.5, width: 14, height: 10, rx: 2.2 }], ['path', { d: 'M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3' }]],
    caps: [['path', { d: 'M12 4.5l7 7.5h-4v5H9v-5H5z' }], ['path', { d: 'M9 20h6' }]],
    alert: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7.5v5.5' }], ['path', { d: 'M12 16.4v.1' }]],
    clock: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 7.5V12l3 2' }]],
    shield: [['path', { d: 'M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z' }], ['path', { d: 'M12 8v4.5' }], ['path', { d: 'M12 15.6v.1' }]],
    check: [['path', { d: 'M5.5 12.5l4.2 4.2L18.5 8' }]],
    shieldCheck: [['path', { d: 'M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z' }], ['path', { d: 'M8.8 12.2l2.2 2.2 4.2-4.4' }]],
    spinner: [['circle', { cx: 12, cy: 12, r: 8.5, class: 'gate-spin__track' }], ['path', { d: 'M20.5 12A8.5 8.5 0 0 0 12 3.5', class: 'gate-spin__arc' }]],
    pin: [['path', { d: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z' }], ['circle', { cx: 12, cy: 10, r: 2.3 }]],
    device: [['rect', { x: 4.5, y: 5.5, width: 15, height: 10.5, rx: 1.6 }], ['path', { d: 'M2.5 19h19' }]],
    browser: [['rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2.2 }], ['path', { d: 'M3.5 9h17' }], ['path', { d: 'M6.6 6.8v.1' }], ['path', { d: 'M9.2 6.8v.1' }]],
    file: [['path', { d: 'M6.5 3.5h7L18 8v12.5H6.5z' }], ['path', { d: 'M13.5 3.5V8H18' }], ['path', { d: 'M9.5 13h5.5' }], ['path', { d: 'M9.5 16.5h3.5' }]],
    fileAlert: [['path', { d: 'M6.5 3.5h7L18 8v12.5H6.5z' }], ['path', { d: 'M13.5 3.5V8H18' }], ['path', { d: 'M12.2 11v3.6' }], ['path', { d: 'M12.2 17.4v.1' }]],
    copy: [['rect', { x: 8.5, y: 8.5, width: 11, height: 11, rx: 2 }], ['path', { d: 'M15.5 8.5V6.2c0-.95-.75-1.7-1.7-1.7H6.2c-.95 0-1.7.75-1.7 1.7v7.6c0 .95.75 1.7 1.7 1.7h2.3' }]],
    chevron: [['path', { d: 'M9.5 6.5l5.5 5.5-5.5 5.5' }]]
  };

  function icon(name, cls) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'gate-icon' + (cls ? ' ' + cls : ''));
    (ICONS[name] || []).forEach(function (spec) {
      var node = document.createElementNS(SVGNS, spec[0]);
      Object.keys(spec[1]).forEach(function (k) { node.setAttribute(k, String(spec[1][k])); });
      svg.appendChild(node);
    });
    return svg;
  }

  function reducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* -------------------------------------------- theme (Terang / Gelap) */

  // The dashboard's theme rule (app.js, U7) is "the stored choice, else the system".
  // The gate keeps no storage of any kind, so it follows the system setting, and
  // honours <html data-theme="day|night"> when the page has already set it before
  // mount (the hook for the stored choice). Item 5: both themes everywhere.
  function systemQuery() {
    try { return root.matchMedia ? root.matchMedia('(prefers-color-scheme: light)') : null; } catch (e) { return null; }
  }
  function gateTheme() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set === 'day' || set === 'night') return set;
    var q = systemQuery();
    return q && q.matches ? 'day' : 'night';
  }

  // Satellite paint per theme: greyscale always (item 25: no green); dark and calm at
  // night, light and soft by day. gate.css adds the navy duotone and the shade on top.
  var IMAGERY = {
    night: { bg: '#04122A', paint: { 'raster-saturation': -1, 'raster-contrast': 0.12, 'raster-brightness-min': 0.02, 'raster-brightness-max': 0.86 } },
    day: { bg: '#EEF0F2', paint: { 'raster-saturation': -1, 'raster-contrast': -0.12, 'raster-brightness-min': 0.34, 'raster-brightness-max': 0.98 } }
  };

  function applyTheme() {
    var day = gateTheme() === 'day';
    S.day = day;
    if (S.el.section) S.el.section.classList.toggle('is-day', day);
    // The exit fades over the dashboard's own canvas colour (gate.css), never a flash.
    document.documentElement.classList.toggle('mcd-gate-day', day);
    if (S.map) {
      var look = IMAGERY[day ? 'day' : 'night'];
      try {
        S.map.setPaintProperty('base', 'background-color', look.bg);
        Object.keys(look.paint).forEach(function (k) { S.map.setPaintProperty('imagery', k, look.paint[k]); });
      } catch (e) { /* style not ready: the next load uses the right look */ }
    }
  }

  function followSystemTheme() {
    var q = systemQuery();
    if (!q) return;
    if (q.addEventListener) listen(q, 'change', applyTheme);
    else if (q.addListener) { q.addListener(applyTheme); S.themeQuery = q; }
  }

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { /* old browsers */ }
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Resolves after the next paint. rAF is paused in hidden/background tabs, so a
  // timer fallback guarantees the gate never waits on visibility to show the form.
  function nextPaint() {
    return new Promise(function (r) {
      var done = false;
      function go() { if (!done) { done = true; r(); } }
      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(function () { setTimeout(go, 0); });
      }
      setTimeout(go, 120);
    });
  }

  /* ------------------------------------------------------------- state */

  var S = {
    mounted: false,
    unlocked: false,
    locking: false,
    busy: false,
    failures: 0,
    lockedUntil: 0,
    vault: null,
    iter: 600000,
    onUnlock: null,
    cfg: null,
    el: {},
    timers: { clock: 0, countdown: 0, idle: 0, lockWatch: 0, entering: 0 },
    map: null,
    lastActivity: 0,
    warnEl: null,
    warnTotal: 60,
    countdownTotal: 0,
    day: false,
    themeQuery: null,
    errFlip: false,
    listeners: []
  };

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts || false);
    S.listeners.push([target, type, fn, opts || false]);
  }

  function unlistenAll() {
    S.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    S.listeners = [];
    if (S.themeQuery) { try { S.themeQuery.removeListener(applyTheme); } catch (e) { /* ignore */ } S.themeQuery = null; }
  }

  /* ------------------------------------------------------------ render */

  // Decorative layers, bottom to top: base (navy mesh, or warm paper by day), the
  // offline line plan (assets/img/gate-plan.svg, same frame as the map), the flat
  // satellite map (greyscale), the navy duotone (colour blend), the readability
  // shade, a slow ambient light and a film grain.
  function buildBackground() {
    var bg = h('div', { class: 'gate-bg', 'aria-hidden': 'true' }, [
      h('div', { class: 'gate-bg__base' }),
      h('div', { class: 'gate-bg__plan' }),
      h('div', { class: 'gate-bg__map' }),
      h('div', { class: 'gate-bg__tone' }),
      h('div', { class: 'gate-bg__shade' }),
      h('div', { class: 'gate-bg__light' }),
      h('div', { class: 'gate-bg__grain' })
    ]);
    S.el.bg = bg;
    S.el.map = bg.querySelector('.gate-bg__map');
    return bg;
  }

  // Brand block: logo, branch line, product name and one plain line on its purpose.
  function buildBrand() {
    return h('header', { class: 'gate-brand' }, [
      h('img', { class: 'gate-logo', src: 'assets/brand/mandiri-logo-reverse.png', alt: 'Bank Mandiri', width: '479', height: '140', decoding: 'async' }),
      h('div', { class: 'gate-brand__body' }, [
        h('p', { class: 'gate-eyebrow' }, [h('span', { class: 'gate-eyebrow__rule', 'aria-hidden': 'true' }), T.eyebrow]),
        h('h1', { class: 'gate-title', id: 'gate-title', text: T.title }),
        h('p', { class: 'gate-lede', text: T.lede })
      ])
    ]);
  }

  function buildForm() {
    var input = h('input', {
      id: 'gate-password', class: 'gate-input', type: 'password',
      autocomplete: 'current-password', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      enterkeyhint: 'go', required: true, 'aria-describedby': 'gate-help gate-caps gate-error gate-status',
      'aria-invalid': 'false'
    });
    var reveal = h('button', {
      type: 'button', class: 'gate-reveal', 'aria-pressed': 'false', 'aria-label': T.reveal,
      'aria-controls': 'gate-password', title: T.reveal
    }, [icon('eye', 'gate-reveal__show'), icon('eyeOff', 'gate-reveal__hide')]);
    var caps = h('p', { class: 'gate-caps', id: 'gate-caps', hidden: true }, [icon('caps'), T.caps]);
    // Decorative stand-in while verifying (the field itself is already cleared).
    // Fixed length, never the real one; hidden from assistive technology.
    var mask = h('span', { class: 'gate-input-mask', 'aria-hidden': 'true', text: '••••••••' });
    // Shown inside the (disabled, empty) field during a lockout; the countdown says why.
    var waitFace = h('span', { class: 'gate-input-wait', 'aria-hidden': 'true' }, [icon('lock'), T.wait]);
    var waitFill = h('span', { class: 'gate-wait-bar__fill' });
    var waitBar = h('span', { class: 'gate-wait-bar', 'aria-hidden': 'true' }, [waitFill]);
    // The button keeps one accessible name ("Masuk"); the busy and success faces are visual only.
    var submit = h('button', { type: 'submit', class: 'gate-submit' }, [
      h('span', { class: 'gate-submit__face' }, [h('span', { class: 'gate-submit__label', text: T.submit }), icon('arrow', 'gate-submit__arrow')]),
      h('span', { class: 'gate-submit__state gate-submit__state--busy', 'aria-hidden': 'true' }, [icon('spinner', 'gate-spin'), h('span', { text: T.busy })]),
      h('span', { class: 'gate-submit__state gate-submit__state--done', 'aria-hidden': 'true' }, [icon('check'), h('span', { text: T.done })])
    ]);
    // Lock notice from the previous session (and the live status line) above the field.
    var status = h('p', { class: 'gate-status', id: 'gate-status', role: 'status', 'aria-live': 'polite' });
    // One fixed slot under the field (two lines high, so the card never changes size):
    // the help line, replaced by an error or by the lockout countdown.
    var help = h('p', { class: 'gate-help', id: 'gate-help', text: T.help });
    var errorText = h('span');
    var error = h('p', { class: 'gate-error', id: 'gate-error', role: 'alert', hidden: true }, [icon('alert'), errorText]);
    var countdownText = h('span');
    // Focus moves here during a lockout (the field is disabled), so it is never lost.
    var countdown = h('p', { class: 'gate-countdown', id: 'gate-countdown', tabindex: '-1', hidden: true }, [icon('clock'), countdownText]);
    // Quiet fine print under the button.
    var hint = h('li', { class: 'gate-fine__item gate-fine__item--auto' }, [icon('clock'), T.autolock(formatMinutes(S.cfg.idleMinutes))]);
    var fine = h('ul', { class: 'gate-fine' }, [
      h('li', { class: 'gate-fine__item gate-fine__item--key' }, [icon('shieldCheck'), T.restricted]),
      h('li', { class: 'gate-fine__item', title: T.cryptoSpec(formatIter(S.iter)) }, [icon('device'), T.local]),
      hint
    ]);

    // Hidden username so password managers can associate the entry; not secret.
    var user = h('input', {
      type: 'text', class: 'gate-username', autocomplete: 'username', value: 'mcd-kcp-cilangkap',
      tabindex: '-1', 'aria-hidden': 'true', readonly: true, hidden: true
    });

    var form = h('form', { class: 'gate-form', novalidate: true, 'aria-labelledby': 'gate-card-title' }, [
      user,
      status,
      h('div', { class: 'gate-field' }, [
        h('div', { class: 'gate-field__row' }, [h('label', { class: 'gate-label', for: 'gate-password', text: T.label }), caps]),
        h('div', { class: 'gate-input-wrap' }, [input, mask, waitFace, reveal, waitBar]),
        h('div', { class: 'gate-msg' }, [help, error, countdown])
      ]),
      submit,
      fine
    ]);

    S.el.form = form; S.el.input = input; S.el.reveal = reveal; S.el.caps = caps;
    S.el.submit = submit; S.el.status = status; S.el.hint = hint; S.el.help = help;
    S.el.countdown = countdown; S.el.countdownText = countdownText; S.el.waitFill = waitFill;
    S.el.error = error; S.el.errorText = errorText;

    listen(form, 'submit', onSubmit);
    listen(reveal, 'click', onReveal);
    listen(input, 'keydown', onCapsProbe);
    listen(input, 'keyup', onCapsProbe);
    listen(input, 'blur', function () { S.el.caps.hidden = true; });
    listen(input, 'input', function () {
      if (S.el.input.getAttribute('aria-invalid') === 'true') S.el.input.setAttribute('aria-invalid', 'false');
      // A stale error clears on the first keystroke (not during a lockout).
      if (!(S.lockedUntil > Date.now()) && !S.el.error.hidden) setError('');
    });
    return form;
  }

  // Error screens: one plain line for staff, the technical step folded away for the
  // dashboard administrator (docs/COPY_DECK_ID.md §4.4).
  function buildNotice(kind) {
    var map = {
      nocrypto: { title: T.noCryptoTitle, body: T.noCryptoBody, admin: T.noCryptoAdmin, cmd: null, icon: 'browser' },
      nocore: { title: T.noCoreTitle, body: T.noCoreBody, admin: T.noCoreAdmin, cmd: null, icon: 'alert' },
      novault: { title: T.noVaultTitle, body: T.noVaultBody, admin: T.noVaultAdmin, cmd: T.vaultCommand, icon: 'file' },
      badformat: { title: T.badFormatTitle, body: T.badFormatBody, admin: T.badFormatAdmin, cmd: T.vaultCommand, icon: 'fileAlert' }
    };
    var n = map[kind];
    var heading = h('h2', { class: 'gate-notice__title', id: 'gate-notice-title', tabindex: '-1', text: n.title });
    var reload = h('button', { type: 'button', class: 'gate-secondary', text: T.reload });
    listen(reload, 'click', function () { root.location.reload(); });
    S.el.noticeHeading = heading;

    var adminBody = [h('p', { class: 'gate-admin__text', text: n.admin })];
    if (n.cmd) {
      var code = h('code', { text: n.cmd });
      var copyLabel = h('span', { text: T.copy });
      var copyBtn = h('button', { type: 'button', class: 'gate-copy' }, [icon('copy'), copyLabel]);
      var copyNote = h('p', { class: 'gate-admin__note', role: 'status' });
      listen(copyBtn, 'click', function () { copyCommand(n.cmd, code, copyLabel, copyNote); });
      adminBody.push(h('pre', { class: 'gate-code', tabindex: '0' }, [code]), copyBtn, copyNote);
    }
    return h('div', { class: 'gate-notice gate-notice--' + kind, role: 'region', 'aria-labelledby': 'gate-notice-title' }, [
      h('div', { class: 'gate-notice__icon' }, [icon(n.icon)]),
      heading,
      h('p', { class: 'gate-notice__body', text: n.body }),
      reload,
      h('details', { class: 'gate-admin' }, [
        h('summary', { class: 'gate-admin__summary' }, [icon('chevron', 'gate-admin__chevron'), T.admin]),
        h('div', { class: 'gate-admin__body' }, adminBody)
      ])
    ]);
  }

  // Copies the (public, non-secret) setup command. Falls back to selecting it.
  function copyCommand(text, codeEl, labelEl, noteEl) {
    function done() {
      labelEl.textContent = T.copied;
      noteEl.className = 'gate-admin__note gate-sr'; // the button already says it; read aloud only
      noteEl.textContent = T.copied;
      setTimeout(function () { labelEl.textContent = T.copy; noteEl.textContent = ''; }, 2400);
    }
    function manual() {
      noteEl.className = 'gate-admin__note';
      var copied = false;
      try {
        var range = document.createRange();
        range.selectNodeContents(codeEl);
        var sel = root.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copied = !!(document.execCommand && document.execCommand('copy'));
      } catch (e) { copied = false; }
      if (copied) done();
      else noteEl.textContent = T.copyManual;
    }
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(text).then(done, manual);
        return;
      }
    } catch (e) { /* fall through */ }
    manual();
  }

  // Footer: place and clock (on the brand side), and the map credit (shown with the map).
  function buildFooter() {
    var time = h('span', { class: 'gate-foot__time' });
    var attr = h('p', { class: 'gate-foot__attr', text: T.plan });
    S.el.tTime = time; S.el.tAttr = attr;
    return h('footer', { class: 'gate-foot' }, [
      h('p', { class: 'gate-foot__where' }, [
        h('span', { class: 'gate-foot__place' }, [icon('pin'), T.place]),
        time
      ]),
      attr
    ]);
  }

  function render(mode) {
    var existing = document.getElementById('gate');
    var section = existing || h('section', { id: 'gate' });
    section.className = 'mcd-gate';
    section.setAttribute('aria-labelledby', 'gate-title');
    while (section.firstChild) section.removeChild(section.firstChild);

    var cardChildren = [];
    if (mode === 'form') {
      var cardTitle = h('h2', { class: 'gate-card__title', id: 'gate-card-title', text: T.cardTitle });
      S.el.cardTitle = cardTitle;
      cardChildren.push(h('div', { class: 'gate-card__head' }, [cardTitle]));
      cardChildren.push(buildForm());
    } else {
      cardChildren.push(buildNotice(mode));
    }
    var card = h('div', { class: 'gate-card' + (mode === 'form' ? '' : ' gate-card--notice') }, cardChildren);
    S.el.card = card;

    section.appendChild(buildBackground());
    // Two prints of the Danantara mark: white on navy and on night glass, colour on the
    // light (Terang) map on tablets and phones. gate.css shows exactly one of them.
    var partOf = h('p', { class: 'gate-partof' }, [
      h('span', { class: 'gate-partof__label', text: T.partOf }),
      h('img', { class: 'gate-partof__logo gate-partof__logo--rev', src: 'assets/brand/danantara-logo-reverse.png', alt: 'Danantara Indonesia', width: '531', height: '140', decoding: 'async' }),
      h('img', { class: 'gate-partof__logo gate-partof__logo--color', src: 'assets/brand/danantara-logo.png', alt: 'Danantara Indonesia', width: '531', height: '140', decoding: 'async' })
    ]);
    var panel = h('div', { class: 'gate-panel' }, [buildBrand(), card]);
    section.appendChild(h('main', { class: 'gate-stage' }, [panel, partOf]));
    section.appendChild(buildFooter());

    if (!existing) document.body.insertBefore(section, document.body.firstChild);
    section.hidden = false;
    S.el.section = section;
    S.el.panel = panel;
    applyTheme();
    if (reducedMotion()) section.classList.add('is-static');
    // Next frame: trigger entrance transition.
    nextPaint().then(function () { section.classList.add('is-ready'); });
  }

  /* ---------------------------------------------------------- feedback */

  // The live status is read aloud only, except for a lock notice from the previous
  // session, which shows as a banner above the field; the card then says "Masuk
  // kembali" and the fine-print line on auto-lock steps aside (the banner says it).
  // The help line under the field gives way to an error or the lockout countdown.
  function syncHint() {
    if (!S.el.hint) return;
    var notice = !!S.el.status.textContent && !S.busy && !S.unlocked && !(S.lockedUntil > Date.now());
    S.el.section.classList.toggle('has-notice', notice);
    S.el.hint.hidden = notice;
    if (S.el.cardTitle) S.el.cardTitle.textContent = notice ? T.cardTitleBack : T.cardTitle;
    S.el.help.hidden = !S.el.error.hidden || !S.el.countdown.hidden;
  }

  function setStatus(text) {
    S.el.status.textContent = text || '';
    syncHint();
  }

  function setError(text) {
    var box = S.el.error, el = S.el.errorText;
    if (!text) {
      el.textContent = '';
      box.hidden = true;
    } else {
      // Set at once (icon and text appear together). A trailing no-break space on
      // every other call changes the content, so an identical repeat is announced again.
      S.errFlip = !S.errFlip;
      el.textContent = text + (S.errFlip ? '\u00A0' : '');
      box.hidden = false;
    }
    syncHint();
  }

  function setBusy(on) {
    S.busy = on;
    S.el.section.classList.toggle('is-busy', on);
    S.el.input.readOnly = on;
    S.el.submit.disabled = on || S.lockedUntil > Date.now();
    S.el.reveal.disabled = on;
    S.el.form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function shake() {
    // Shake the visible glass: the card on wide screens, the whole panel on phones.
    var panel = S.el.panel;
    var card = panel && root.getComputedStyle && root.getComputedStyle(panel).display !== 'contents' ? panel : S.el.card;
    if (reducedMotion()) return;
    card.classList.remove('is-shaking');
    void card.offsetWidth; // restart the animation
    card.classList.add('is-shaking');
  }

  function focusInput() {
    if (S.el.input && !S.el.input.disabled) {
      try { S.el.input.focus({ preventScroll: true }); } catch (e) { S.el.input.focus(); }
    }
  }

  function setRevealed(on) {
    S.el.input.type = on ? 'text' : 'password';
    S.el.reveal.setAttribute('aria-pressed', on ? 'true' : 'false');
    // The accessible name stays "Tampilkan kata sandi" (aria-pressed carries the state);
    // only the pointer tooltip says what the next click does.
    S.el.reveal.title = on ? T.conceal : T.reveal;
    S.el.section.classList.toggle('is-revealed', on);
  }

  function onReveal() {
    setRevealed(S.el.input.type === 'password');
    focusInput();
  }

  function onCapsProbe(e) {
    if (typeof e.getModifierState !== 'function') return;
    S.el.caps.hidden = !e.getModifierState('CapsLock');
  }

  /* ---------------------------------------------------------- throttle */

  function saveThrottle() {
    store(STORE_THROTTLE, S.failures > 0 ? JSON.stringify({ f: S.failures, u: S.lockedUntil }) : null);
  }

  function restoreThrottle() {
    var raw = load(STORE_THROTTLE);
    if (!raw) return;
    try {
      var t = JSON.parse(raw);
      S.failures = Math.max(0, Math.floor(Number(t.f)) || 0);
      var until = Number(t.u) || 0;
      // Ignore absurd values (clock changes / manual edits): never more than the policy maximum.
      var maxMs = lockoutDelayMs(1e6, S.cfg.lockout);
      S.lockedUntil = until > Date.now() ? Math.min(until, Date.now() + maxMs) : 0;
    } catch (e) { S.failures = 0; S.lockedUntil = 0; }
  }

  /**
   * Disable the form until S.lockedUntil. The slot under the field says, in plain
   * words, how long to wait ("Terlalu banyak percobaan. Tunggu 3 detik, lalu coba
   * lagi."), a thin bar under the field empties, and the field shows "Tunggu
   * sebentar". Focus moves to that line (the field is disabled, so focus would
   * otherwise drop to the page); right after a failure the status also says
   * "Kata sandi salah.". Timing and policy are unchanged (lockoutDelayMs).
   */
  function startCountdown(afterFailure) {
    clearInterval(S.timers.countdown);
    var el = S.el.countdown, text = S.el.countdownText, fill = S.el.waitFill;
    S.countdownTotal = Math.max(1, S.lockedUntil - Date.now());
    S.el.input.disabled = true;
    S.el.submit.disabled = true;
    S.el.section.classList.add('is-throttled');
    function tick() {
      var leftMs = S.lockedUntil - Date.now();
      var left = Math.ceil(leftMs / 1000);
      if (left <= 0) {
        clearInterval(S.timers.countdown);
        el.hidden = true; text.textContent = '';
        fill.style.transform = '';
        S.lockedUntil = 0;
        saveThrottle();
        S.el.input.disabled = false;
        S.el.submit.disabled = S.busy;
        S.el.section.classList.remove('is-throttled');
        setStatus('');
        focusInput();
        return;
      }
      el.hidden = false;
      text.textContent = T.lockout(left);
      fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, leftMs / S.countdownTotal)).toFixed(4) + ')';
      syncHint();
    }
    setStatus(afterFailure ? T.wrongShort : '');
    tick();
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    S.timers.countdown = setInterval(tick, 250);
  }

  /* ------------------------------------------------------------ submit */

  function onSubmit(e) {
    e.preventDefault();
    if (S.busy || S.unlocked || S.lockedUntil > Date.now()) return;
    var password = S.el.input.value;
    S.el.input.value = '';
    setRevealed(false);
    setStatus(''); // drop a lock notice from the previous session
    if (!password) {
      setError(T.empty);
      S.el.input.setAttribute('aria-invalid', 'true');
      focusInput();
      return;
    }
    attempt(password);
    password = null;
  }

  function attempt(password) {
    var started = Date.now();
    setError('');
    setBusy(true);
    setStatus(T.verifying);
    S.el.input.setAttribute('aria-invalid', 'false');

    nextPaint()
      .then(function () {
        var p = MCD.vault.decryptVault(S.vault, password);
        password = null;
        return p;
      })
      .then(function (session) {
        return wait(Math.max(0, MIN_VERIFY_MS - (Date.now() - started))).then(function () { succeed(session); });
      }, function (err) {
        return wait(Math.max(0, MIN_VERIFY_MS - (Date.now() - started))).then(function () { failed(err); });
      });
  }

  function failed(err) {
    var code = err && err.code;
    setBusy(false);
    setStatus('');
    if (code === 'BAD_PASSWORD_OR_TAMPERED') {
      S.failures += 1;
      var delay = lockoutDelayMs(S.failures, S.cfg.lockout);
      S.lockedUntil = delay > 0 ? Date.now() + delay : 0;
      saveThrottle();
      S.el.input.setAttribute('aria-invalid', 'true');
      shake();
      if (delay > 0) {
        // One line, not two: the countdown carries the message; the status announces
        // "Incorrect password. Too many attempts. Try again in N seconds." once.
        setError('');
        startCountdown(true);
      } else {
        setError(T.wrong);
        focusInput();
      }
      return;
    }
    if (code === 'UNSUPPORTED_FORMAT') { remount('badformat'); return; }
    if (code === 'NO_WEBCRYPTO') { remount('nocrypto'); return; }
    setError(T.unexpected);
    focusInput();
  }

  function succeed(session) {
    S.unlocked = true;
    S.failures = 0;
    S.lockedUntil = 0;
    saveThrottle();
    setStatus(T.success);
    S.el.section.classList.remove('is-busy');
    S.el.section.classList.add('is-success');
    playUnlock().then(function () {
      teardown();
      startIdle();
      emit('mcd:gate-unlocked', { iter: session.iter });
      var cb = S.onUnlock;
      S.onUnlock = null; // one-shot
      S.vault = null;
      if (cb) {
        try { cb({ payload: session.payload, key: session.key, salt: session.salt, iter: session.iter }); }
        // Log the error's name only: its message or stack can quote decrypted payload text.
        catch (e) { if (root.console) root.console.error('[MCD.gate] onUnlock handler threw ' + errorName(e)); }
      }
      session = null;
    });
  }

  // 220 ms success state (the button shows a check, the glass a gold edge), then a
  // 600 ms exit: the glass lifts away, the flat map pushes in gently, the section fades.
  function playUnlock() {
    var section = S.el.section;
    if (reducedMotion()) return Promise.resolve();
    return wait(SUCCESS_HOLD_MS).then(function () {
      section.classList.add('is-unlocking');
      if (S.map) {
        try {
          S.map.easeTo({
            zoom: CAMERA.zoom + UNLOCK_ZOOM_IN,
            duration: UNLOCK_MS, easing: function (t) { return t * t * (3 - 2 * t); }, essential: true
          });
        } catch (e) { /* ignore */ }
      }
      return wait(UNLOCK_MS);
    });
  }

  function remount(mode) {
    stopMap();
    clearInterval(S.timers.clock);
    unlistenAll();
    S.el = {};
    render(mode);
    followSystemTheme();
    startBackground();
    startClock();
    focusNotice();
  }

  function focusNotice() {
    if (S.el.noticeHeading) {
      try { S.el.noticeHeading.focus({ preventScroll: true }); } catch (e) { S.el.noticeHeading.focus(); }
    }
  }

  /* -------------------------------------------------------- background */

  function mapAllowed() {
    if (!S.cfg.map) return false;
    if (!root.maplibregl || typeof root.maplibregl.Map !== 'function') return false;
    if (root.navigator && root.navigator.onLine === false) return false;
    var conn = root.navigator && root.navigator.connection;
    if (conn && conn.saveData) return false;
    return true;
  }

  // The credit names what is on screen: the line plan (offline) or the satellite imagery.
  function setCredit(hasMap) {
    if (S.el.tAttr) S.el.tAttr.textContent = hasMap ? T.imagery : T.plan;
  }

  function startBackground() {
    if (!mapAllowed()) return;
    var section = S.el.section;
    var look = IMAGERY[S.day ? 'day' : 'night'];
    var paint = { 'raster-fade-duration': 400 };
    Object.keys(look.paint).forEach(function (k) { paint[k] = look.paint[k]; });
    var map;
    try {
      map = new root.maplibregl.Map({
        container: S.el.map,
        style: {
          version: 8,
          sources: {
            imagery: { type: 'raster', tiles: [ESRI_TILES], tileSize: 256, maxzoom: 19 }
          },
          layers: [
            { id: 'base', type: 'background', paint: { 'background-color': look.bg } },
            // Greyscale imagery (item 25: no green); gate.css adds the navy duotone on top.
            { id: 'imagery', type: 'raster', source: 'imagery', paint: paint }
          ]
        },
        center: [SITE.lon, SITE.lat],
        zoom: CAMERA.zoom,
        pitch: CAMERA.pitch,
        bearing: CAMERA.bearing,
        maxPitch: 0,
        interactive: false,
        attributionControl: false,
        renderWorldCopies: false,
        pixelRatio: Math.min(root.devicePixelRatio || 1, 2),
        fadeDuration: 0
      });
    } catch (e) {
      return; // WebGL unavailable: the gradient fallback stays
    }
    S.map = map;
    var tileSeen = false;
    map.on('error', function () { /* tile/network errors: keep the fallback, no console noise */ });
    map.on('sourcedata', function (e) { if (e && e.tile) tileSeen = true; });
    // GPU reset / too many WebGL contexts: fall back to the gradient mesh instead of a blank canvas.
    map.on('webglcontextlost', function () { setTimeout(function () { if (S.map === map) stopMap(); }, 0); });
    map.once('idle', function () {
      if (S.map !== map) return;
      if (tileSeen) {
        section.classList.add('has-map');
        setCredit(true);
      } else {
        stopMap(); // offline or blocked: release the WebGL context
      }
    });
  }

  function stopMap() {
    if (S.map) {
      var m = S.map;
      S.map = null;
      try { m.remove(); } catch (e) { /* ignore */ }
    }
    if (S.el.section) S.el.section.classList.remove('has-map');
    setCredit(false);
  }

  /* ------------------------------------------------------------- clock */

  function startClock() {
    function tick() {
      var now = formatWIBid(Date.now());
      if (S.el.tTime) S.el.tTime.textContent = now.date + ' · ' + now.time + ' WIB';
    }
    tick();
    clearInterval(S.timers.clock);
    S.timers.clock = setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------- teardown */

  function teardown() {
    stopMap();
    clearInterval(S.timers.clock);
    clearInterval(S.timers.countdown);
    unlistenAll();
    if (S.el.input) S.el.input.value = '';
    if (S.el.section && S.el.section.parentNode) S.el.section.parentNode.removeChild(S.el.section);
    S.el = {};
    var html = document.documentElement;
    if (!reducedMotion()) {
      // The shell fades in instead of cutting in (gate.css: html.mcd-entering).
      html.classList.add('mcd-entering');
      clearTimeout(S.timers.entering);
      S.timers.entering = setTimeout(function () { html.classList.remove('mcd-entering'); }, ENTER_MS);
    }
    html.classList.remove('mcd-locked');
    html.classList.remove('mcd-gate-day');
  }

  /* -------------------------------------------------------- idle / lock */

  var ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
  var lastPointer = { x: NaN, y: NaN };

  function onActivity(e) {
    // Browsers synthesise "fake" pointer/mouse moves under a resting cursor when
    // content animates or reflows. Only real movement counts as activity, so an
    // animated dashboard cannot keep an unattended session open.
    if (e && e.type === 'pointermove') {
      if (e.screenX === lastPointer.x && e.screenY === lastPointer.y) return;
      lastPointer.x = e.screenX; lastPointer.y = e.screenY;
    }
    S.lastActivity = Date.now();
    if (S.warnEl) hideWarning();
  }

  function startIdle() {
    var idleMs = S.cfg.idleMinutes * 60000;
    var warnMs = Math.min(WARN_BEFORE_LOCK_MS, idleMs / 4);
    S.warnTotal = Math.max(1, Math.ceil(warnMs / 1000)); // display only: the draining line
    S.lastActivity = Date.now();
    ACTIVITY_EVENTS.forEach(function (t) {
      document.addEventListener(t, onActivity, { capture: true, passive: true });
    });
    function check() {
      if (S.locking) return;
      var idle = Date.now() - S.lastActivity;
      if (idle >= idleMs) { lock('idle'); return; }
      if (idle >= idleMs - warnMs) showWarning(Math.ceil((idleMs - idle) / 1000));
    }
    S.idleCheck = check;
    S.timers.idle = setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    root.addEventListener('focus', check);
  }

  // Non-modal warning shown before the idle lock (WCAG 2.2.1: the user can extend
  // the session with a single action). Any real activity dismisses it and resets
  // the timer; focus moves to the button so keyboard and screen-reader users are
  // told, and returns to where it was afterwards. A thin line drains with the time
  // left, in the same style as the sign-in lockout.
  function showWarning(secondsLeft) {
    var frac = Math.max(0, Math.min(1, secondsLeft / (S.warnTotal || 60)));
    if (!S.warnEl) {
      var stay = h('button', { type: 'button', class: 'mcd-idle__btn mcd-idle__btn--primary', text: T.warnStay });
      stay.addEventListener('click', function () { onActivity(); });
      var title = h('p', { class: 'mcd-idle__title', id: 'mcd-idle-title' });
      var fill = h('span', { class: 'mcd-idle__fill' });
      var el = h('div', {
        class: 'mcd-idle', role: 'alertdialog', 'aria-modal': 'false',
        'aria-labelledby': 'mcd-idle-title', 'aria-describedby': 'mcd-idle-body'
      }, [
        h('span', { class: 'mcd-idle__icon' }, [icon('clock')]),
        h('div', { class: 'mcd-idle__text' }, [
          title,
          h('p', { class: 'mcd-idle__body', id: 'mcd-idle-body', text: T.warnBody })
        ]),
        h('div', { class: 'mcd-idle__actions' }, [stay]),
        h('span', { class: 'mcd-idle__bar', 'aria-hidden': 'true' }, [fill])
      ]);
      S.warnEl = el; S.warnTitle = title; S.warnFill = fill;
      S.warnReturnFocus = document.activeElement;
      title.textContent = T.warnTitle(secondsLeft);
      fill.style.transform = 'scaleX(' + frac.toFixed(4) + ')';
      document.body.appendChild(el);
      try { stay.focus({ preventScroll: true }); } catch (e) { stay.focus(); }
      emit('mcd:gate-idle-warning', { secondsLeft: secondsLeft });
      return;
    }
    S.warnTitle.textContent = T.warnTitle(secondsLeft);
    S.warnFill.style.transform = 'scaleX(' + frac.toFixed(4) + ')';
  }

  function hideWarning() {
    var el = S.warnEl;
    var back = S.warnReturnFocus;
    S.warnEl = null;
    S.warnReturnFocus = null;
    if (!el) return;
    var hadFocus = el.contains(document.activeElement);
    if (el.parentNode) el.parentNode.removeChild(el);
    if (hadFocus && back && back.focus && document.contains(back)) {
      try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); }
    }
  }

  /** Remove every <body> child: the app's DOM (decrypted text, canvases, tables). */
  function purgeDom() {
    var body = document.body;
    if (!body) return;
    while (body.lastChild) body.removeChild(body.lastChild);
  }

  /**
   * Lock the dashboard: hide everything immediately, drop the app's DOM, then
   * reload the page so all decrypted data and the key are dropped from memory.
   * If the page is still alive afterwards (a beforeunload prompt or the browser
   * cancelled the navigation), a watchdog resets S.locking and tries again with
   * location.replace() after 1 s, 2 s, 4 s ... (max 30 s), so the idle lock can
   * never get stuck with decrypted data in memory.
   * @param {"idle"|"manual"|"restore"} [reason]
   * @param {number} [retry] internal: retry count
   */
  function lock(reason, retry) {
    if (S.locking) return;
    S.locking = true;
    retry = retry > 0 ? retry : 0;
    reason = reason === 'idle' || reason === 'restore' ? reason : 'manual';
    store(STORE_NOTICE, reason === 'idle' ? 'idle:' + (S.cfg ? S.cfg.idleMinutes : 15) : reason);
    emit('mcd:gate-locking', { reason: reason });
    document.documentElement.classList.add('mcd-locking');
    hideWarning();
    purgeDom();
    clearTimeout(S.timers.lockWatch);
    S.timers.lockWatch = setTimeout(function () {
      S.locking = false;
      lock(reason, retry + 1);
    }, Math.min(LOCK_RETRY_MS * Math.pow(2, retry), 30000));
    try {
      // Without the #fragment: replacing "page#x" by "page#x" would not reload.
      if (retry === 0) root.location.reload();
      else root.location.replace(String(root.location.href).split('#')[0]);
    } catch (e) { /* the watchdog retries */ }
  }

  function onPageHide() {
    // Keep decrypted content out of the back/forward-cache snapshot.
    if (S.unlocked) document.documentElement.classList.add('mcd-locking');
  }

  function onPageShow(e) {
    if (e && e.persisted && S.unlocked) { S.locking = false; lock('restore'); }
  }

  function showStoredNotice() {
    var raw = load(STORE_NOTICE);
    if (!raw) return;
    store(STORE_NOTICE, null);
    if (!S.el.status) return;
    if (raw.indexOf('idle:') === 0) {
      var m = Number(raw.slice(5));
      setStatus(T.noticeIdle(formatMinutes(isFinite(m) && m > 0 ? m : S.cfg.idleMinutes)));
    } else if (raw === 'manual') {
      setStatus(T.noticeManual);
    }
  }

  /* ------------------------------------------------------------- mount */

  /**
   * Render the gate section and wait for the password.
   * @param {{vault?: object, onUnlock: function, idleMinutes?: number, map?: boolean}} opts
   */
  function mount(opts) {
    if (S.mounted) return api;
    S.mounted = true;
    opts = opts || {};
    S.onUnlock = typeof opts.onUnlock === 'function' ? opts.onUnlock : null;
    S.vault = Object.prototype.hasOwnProperty.call(opts, 'vault') ? opts.vault : root.MCD_VAULT;
    S.cfg = readConfig(opts);

    function start() {
      document.documentElement.classList.add('mcd-locked');
      root.addEventListener('pagehide', onPageHide);
      root.addEventListener('pageshow', onPageShow);

      var mode = 'form';
      var core = MCD.vault;
      if (!core || typeof core.decryptVault !== 'function') mode = 'nocore';
      else if (!core.hasWebCrypto()) mode = 'nocrypto';
      else if (!S.vault) mode = 'novault';
      else {
        try { S.iter = core.validate(S.vault).iter; } catch (e) { mode = 'badformat'; }
      }

      render(mode);
      followSystemTheme();
      startBackground();
      startClock();

      if (mode === 'form') {
        restoreThrottle();
        showStoredNotice();
        if (S.lockedUntil > Date.now()) startCountdown(false);
        else focusInput();
      } else {
        focusNotice();
      }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
    return api;
  }

  /**
   * Optional helper for "Save encrypted copy": download a vault object as data/vault.js.
   * Throws (UNSUPPORTED_FORMAT) for an invalid vault. Only a canonical ISO
   * timestamp is ever written into the header comment, so no field can close it.
   */
  function downloadVault(vaultObj, filename) {
    var body = MCD.vault.toScript(vaultObj); // validates first
    var created = vaultObj && MCD.vault.isIsoTimestamp && MCD.vault.isIsoTimestamp(vaultObj.created) ? vaultObj.created : null;
    var text = '/* MCD encrypted data vault (AES-256-GCM, PBKDF2-SHA-256).\n' +
      ' * Saved from the dashboard' + (created ? ' on ' + created : '') + '. Contains no password or verifier.\n' +
      ' * Classic script: exposes window.MCD_VAULT. Replace data/vault.js with this file. */\n' +
      body;
    var blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: filename || 'vault.js', hidden: true });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
  }

  var api = {
    mount: mount,
    lock: function () { lock('manual'); },
    isUnlocked: function () { return S.unlocked; },
    isLocking: function () { return S.locking; },
    resetIdle: function () { onActivity(); },
    downloadVault: downloadVault,
    policy: { lockoutDelayMs: lockoutDelayMs },
    format: { dms: formatDMS, wib: formatWIB, iter: formatIter },
    site: { lat: SITE.lat, lon: SITE.lon }
  };

  MCD.gate = api;
})(typeof window !== 'undefined' ? window : globalThis);
