/* ==========================================================================
 * MCD.leadsUi: the screens of the masked lead list (docs/V7_SPEC.md §8.3, §9, D17, D21, D27–D29, D31, D32,
 * D37, D38; docs/LEADS_MASKED.md; COPY_STYLE_EN items 48 and 49). v7 lane LEADS UI. The logic of the list
 * (masking, allowlist, bands, rules, the k = 5 rule) lives in MCD.leads (assets/js/leads.js); this file only
 * draws what that module returns.
 *
 *   available() → boolean        switch on, key set, a list loaded and younger than 90 days (D29), width ≥ 1024,
 *                                not veiled ("Samarkan nama"), Data contoh off
 *   open({rule?, by?}) → boolean the Leads panel: a modal sheet (880 px). open() without a rule returns to the last
 *                                rule, grouping and row page of this session (memory only, D17)
 *   close(reason) → boolean · isOpen()
 *   LABELS                       UI rule labels (D32); the module's rule label and text are never shown
 *   railLine(rules) → Element | null   one line per rule whose summary count is shown (D17, §9.6)
 *   chip(rule) → Element | null        the Posisi cabang lead chip, same rule
 *   importFlow(container, ctx) → {destroy}     the Impor card "Impor daftar leads" (§9.2); Data & Privasi mounts it
 *   settingsCard(container, ctx) → {destroy}   the switch card "Daftar leads (CIF disamarkan)" (§8.3)
 *   Additions for the shell and the Data & Privasi lanes (Phase B):
 *   on(fn) → off                  fn({reason}) after any change; also the document event 'mcd:leads'
 *   retention(asOf, today?) → {asOf, days, notice, expired}   D29: notice from 45 days, expired from 90 (a list
 *                                without a data date counts as expired)
 *   vaultLoad(payloadLeads, {list, asOf}) → Promise<{on, keep, expired}>   at sign-in, BEFORE applyVault: sets the
 *                                masking key and the switch; keep false = leave the 'leads' dataset out (D29)
 *   vaultExport() → {v: 1, on: true, key, onSince, onBy, stale?} | {v: 1, on: false}   payload.leads for the next save
 *   dirty() → boolean            a switch change or an expiry not yet in a saved copy · markSaved()
 *   ctx (both mounts, all optional): saveEncrypted() · toast(msg) · onSwitch(on) (Data & Privasi shows the
 *   thresholds card and moves focus to it, D37) · openThresholds() (the "Isi ambang dulu" target)
 *
 * Safeguards (item 49, §9.3, §9.7, §11.4): a count the module hides never reaches the DOM (no text, title,
 * aria-label, data-* attribute, width or sort position); only the module's own marks ("<5", "–", "disembunyikan",
 * "—") are shown. No export, print, link, map, "+ Rencana kunjungan" or "+ Tindak lanjut". No cell value of the
 * user's file in the mapping table or the report. A column the module denies on the first read (by header or by its
 * values) keeps a disabled select; a pick the module denies for the field chosen is undone (W9). Under Data contoh the
 * switch and "Matikan dan hapus daftar leads" do nothing (MCD.policy neither logs nor clears then, D27). When the page is hidden the panel body leaves the DOM for a
 * cover; the panel closes on lock, section switch, "Samarkan nama", Data contoh and after 5 minutes without input.
 * A rule stays off while the branch has not filled its threshold (D31); a rule the UI shows as off never gets a
 * table, row list, rail line or chip, also when it was the remembered rule. No browser storage, no
 * network, no console output, no join between a unit code and any place on the map (D31). Plain Indonesian
 * (COPY_DECK_ID §1–4). Safe DOM only (createElement, textContent, setAttribute). No bank policy number in this file.
 *
 * D39, D41 (22 and 23 Oct 2026; docs/V8_SPEC.md §3.5, §4.7, D51): the former TNI credit section and its two
 * products left the UI and the logic. Two rules remain, Calon KPR and Mendekati Prioritas; groupings Kode satuan ·
 * Saldo · Penghasilan. This file reads only MCD.leads, MCD.data, MCD.state, MCD.policy (forLeads, missing, actor,
 * setActor, log, clear, on), MCD.nav, MCD.back and MCD.app. Count lines go to the Calon Prioritas full rail
 * (Mendekati Prioritas) and the Posisi cabang DPK and KPR rows, each through railLine / chip. On coarse pointers
 * (tablets ≥ 1024 px) the panel registers the MCD.back layer 'leads', so Back closes it first (V8 §2.7, M2).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.leadsUi = api; api._wire(); }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  /* ============================================================== constants */

  var IDLE_MS = 300000;                 // D17: 5 minutes without input in the panel
  var NOTICE_DAYS = 45, EXPIRE_DAYS = 90;   // D29 (a product rule the user may change, §18)
  var MIN_WIDTH = 1024;                 // D17: the panel, rail lines and chips exist at 1024 px and wider only
  var PAGE = 200;                       // row list page
  var ISSUES_SHOWN = 50;                // §9.2 step 4

  var RULE_IDS = ['calonKpr', 'calonPrioritas'];
  /** D32: the UI's own labels. "Calon Prioritas" names the tab of public places only. */
  var LABELS = { calonKpr: 'Calon KPR', calonPrioritas: 'Mendekati Prioritas' };
  // what each rule means, in the UI's words
  var RULE_TITLES = {
    calonKpr: 'Belum memiliki KPR, penghasilan dari batas yang diisi cabang, kolektibilitas lancar.',
    calonPrioritas: 'Nasabah bukan Prioritas dengan saldo 80 sampai 100% dari ambang Prioritas.'
  };
  var OFF_WHY = {
    calonKpr: 'Penghasilan minimal Calon KPR belum diisi.',
    calonPrioritas: 'Ambang saldo Mandiri Prioritas belum diisi.'
  };
  var BY_IDS = ['kodeSatuan', 'saldoBand', 'penghasilanBand'];
  var BY_LABELS = { kodeSatuan: 'Kode satuan', saldoBand: 'Saldo', penghasilanBand: 'Penghasilan' };
  var THRESHOLD_KEYS = ['leads.prioritasThreshold', 'leads.kprMinIncome'];
  var THRESHOLD_LABELS = {
    'leads.prioritasThreshold': 'Ambang saldo Mandiri Prioritas', 'leads.kprMinIncome': 'Penghasilan minimal Calon KPR'
  };
  // threshold keys that change the bands of an import (k does not)
  var CUT_KEYS = { 'leads.prioritasThreshold': 1, 'leads.kprMinIncome': 1 };
  // short field names for the mapping select and the row issues (the module's FIELDS, in its order)
  var FIELD_NAMES = {
    cif: 'CIF (disamarkan)', kodeSatuan: 'Kode satuan', tabungan: 'Tabungan', giro: 'Giro', deposito: 'Deposito',
    kpr: 'KPR', kartuKredit: 'Kartu Kredit', livin: 'Livin’ by Mandiri', prioritas: 'Prioritas',
    saldo: 'Saldo (kelompok)', penghasilan: 'Penghasilan (kelompok)', kolektibilitas: 'Kolektibilitas (lancar ya/tidak)'
  };
  var STATUS_WORDS = { dipakai: 'digunakan', ditolak: 'ditolak', diabaikan: 'diabaikan' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /* Every string of this lane (COPY_DECK_ID §1–4; V7_SPEC §14 "Leads" and the risk and UX review rows). */
  var T = {
    title: 'Daftar leads (CIF disamarkan)',
    close: 'Tutup',
    fileLine: '{file} · {m} nasabah · data per {tanggal} · kode file {fp}',
    activeSince: 'Daftar leads aktif sejak {tanggal} · dinyalakan oleh {inisial}.',
    old45: 'Data leads berumur lebih dari 45 hari. Impor laporan terbaru.',
    stale: 'Setelah ambang diubah, impor ulang file leads.',
    rulesGroup: 'Aturan leads',
    offSome: '{n} aturan belum aktif karena angkanya belum diisi.',
    offAll: 'Semua aturan belum aktif. Isi ambang di Kebijakan & leads.',
    openPolicy: 'Buka Kebijakan & leads',
    headline: '{total} nasabah di daftar ini · {aturan}: {n}',
    groupBy: 'Kelompokkan menurut',
    markLt: 'Kelompok di bawah {k} nasabah disembunyikan.',
    markDash: 'Disembunyikan agar kelompok kecil tidak dapat dihitung.',
    srLt: 'kurang dari {k}',
    srDash: 'disembunyikan',
    colRows: 'Nomor baris',
    seeRows: 'Lihat nomor baris ›',
    rowsHead: 'Nomor baris · {aturan} · {kelompok}',
    rowLine: 'Baris {n}',
    rowKey: 'kode {key}',
    more: 'Tampilkan 200 berikutnya',
    rowsFind: 'Cari nasabah ini di file Anda dan di sistem bank menggunakan nomor baris.',
    rowsOffer: 'Penawaran produk dan persetujuan kredit tetap mengikuti ketentuan bank.',
    backTable: '‹ Kembali ke tabel',
    foot1: 'Daftar ini tidak dapat diekspor dan hanya untuk mencari baris di file Anda.',
    foot2: 'Jangan memotret atau membagikan layar ini.',
    cover: 'Daftar leads ditutupi saat halaman tidak tampil.',
    showAgain: 'Tampilkan lagi',
    toastVeil: 'Leads disembunyikan saat nama disamarkan.',
    toastIdle: 'Daftar leads ditutup. Buka lagi melalui tombol Leads.',
    print: 'Halaman ini memuat data bank dan tidak dicetak dari dashboard.',
    openLeads: 'Buka Leads',
    leadIn: '{aturan} di Leads: {n}',
    railHead: 'Leads: ',
    // settings card (§8.3)
    switchLabel: 'Impor daftar leads',
    off: 'Mati', on: 'Nyala',
    cardLines: [
      'Daftar leads menyimpan kode samaran CIF, nomor baris di file Anda, kode satuan, tanda produk, kelompok saldo dan penghasilan, serta status kolektibilitas.',
      'Nama, NIK, nomor rekening, telepon, alamat, usia dan kecamatan tidak disimpan.',
      'Daftar leads tetap data nasabah yang dilindungi rahasia bank.',
      'Kelompok di bawah 5 nasabah disembunyikan.',
      'Daftar leads tidak memiliki ekspor, titik peta atau tautan.',
      'Jangan memotret, mencetak atau membagikan layar daftar leads.',
      'Nyalakan hanya di laptop cabang.'
    ],
    approval: 'Persetujuan Kepala cabang dicatat sendiri oleh pemilik dashboard. Dashboard tidak menyimpan catatan persetujuan.',
    noList: 'Belum ada daftar leads. Impor file di Data & Privasi.',
    demo: 'Daftar leads tidak tampil saat Data contoh menyala.',
    onBanner: 'Daftar leads berlaku sampai dashboard dikunci. Simpan salinan terenkripsi agar terbuka lagi.',
    offBanner: 'Daftar leads masih ada di salinan terenkripsi yang terpasang. Simpan dan pasang salinan baru.',
    expired1: 'Daftar leads lama (data per {tanggal}) tidak dibuka karena berumur lebih dari 90 hari.',
    expired2: 'Simpan salinan terenkripsi agar daftar ini terhapus dari salinan.',
    save: 'Simpan salinan terenkripsi',
    offBtn: 'Matikan dan hapus daftar leads',
    onTitle: 'Nyalakan daftar leads',
    onBody: [
      'Daftar leads hanya menyimpan kode samaran dan nomor baris di file Anda. Nama, NIK, nomor rekening, telepon dan alamat tidak disimpan.',
      'Daftar leads tetap data nasabah yang dilindungi rahasia bank.'
    ],
    initials: 'Inisial petugas',
    initialsHint: 'Isi 2 sampai 4 huruf, misalnya AB.',
    initialsErr: 'Isi inisial petugas untuk riwayat.',
    approvalCheck: 'Persetujuan Kepala cabang telah saya catat.',
    onOk: 'Nyalakan',
    cancel: 'Batal',
    offTitle: 'Matikan dan hapus daftar leads',
    offBody: [
      'Daftar leads akan dihapus dari dashboard. Impor berikutnya menghasilkan kode samaran baru.',
      'Salinan terenkripsi yang terpasang masih memuat daftar ini sampai salinan baru disimpan dan dipasang.',
      'Hapus juga salinan lama yang memuat daftar leads.'
    ],
    offOk: 'Matikan dan hapus',
    // import card (§9.2)
    importTitle: 'Impor daftar leads',
    steps: ['Baca file', 'Periksa kolom', 'Impor', 'Laporan'],
    gateLine: 'Ambang yang belum diisi: {daftar}. Aturan ini akan kosong.',
    gateFill: 'Isi ambang dulu',
    gateGo: 'Lanjutkan impor',
    pick: 'Pilih file laporan nasabah (XLSX atau CSV).',
    local: 'File dibaca di browser ini dan tidak dikirim ke mana pun.',
    reading: 'Membaca file…',
    pickSheet: 'Pilih sheet',
    colFile: 'Kolom di file',
    colUse: 'Digunakan untuk',
    colStatus: 'Status',
    colWhy: 'Alasan',
    notUsed: 'Tidak digunakan',
    cifMissing: 'Kolom CIF wajib ada.',
    mapRefused: 'Kolom {kolom} tidak dapat digunakan untuk {data}.',
    mapKept: 'Pilihan sebelumnya tetap berlaku.',
    headerless: 'Tambahkan baris judul kolom di file, lalu pilih file lagi.',
    asOf: 'Tanggal data',
    asOfEmpty: 'Isi tanggal data.',
    asOfFuture: 'Tanggal data tidak dapat setelah hari ini.',
    asOfOld: 'Data leads berumur lebih dari 90 hari. Impor laporan terbaru.',
    doImport: 'Impor',
    progress: 'Menyamarkan {x} dari {n} baris…',
    progressStart: 'Menyamarkan baris…',
    cancelled: 'Impor dibatalkan. Tidak ada data yang disimpan.',
    rep1: '{n} baris dibaca · {m} nasabah · {g} baris CIF ganda digabung',
    rep2: '{d} kolom ditolak · {i} kolom diabaikan',
    repCols: 'Rincian kolom',
    issue: 'Baris {r} · {field}: {reason}',
    issueMore: 'dan {k} baris lain',
    noKol1: 'Kolom kolektibilitas tidak ada di file ini.',
    noKol2: 'Calon KPR akan kosong.',
    use: 'Gunakan data ini',
    ready: 'Daftar leads siap. Simpan salinan terenkripsi agar terbuka lagi.',
    fileGone: 'Isi file tidak disimpan. Untuk impor ulang, pilih file lagi.',
    again: 'Impor file lain',
    pickAgain: 'Pilih file lagi',
    readFail: 'File tidak dapat dibaca. Periksa formatnya, lalu pilih file lagi.'
  };

  /* ================================================================ helpers */

  function M() { return (root && root.MCD) || {}; }
  function L() { var x = M().leads; return x && typeof x.summary === 'function' ? x : null; }
  function D() { var x = M().data; return x && typeof x.replace === 'function' ? x : null; }
  function P() { var x = M().policy; return x && typeof x.forLeads === 'function' ? x : null; }
  function doc() { return root && root.document ? root.document : null; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return has(o, k) ? String(o[k]) : m; }); }
  function fmtInt(n) { var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return n < 0 ? '−' + s : s; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function safe(fn) { try { return fn(); } catch (e) { return undefined; } }

  /** Safe DOM builder: text through textContent, attributes through setAttribute, no HTML strings. */
  function h(tag, o, kids) {
    var d = doc(), n = d.createElement(tag);
    o = o || {};
    if (o.cls) n.setAttribute('class', o.cls);
    if (o.attrs) Object.keys(o.attrs).forEach(function (k) { var v = o.attrs[k]; if (v != null && v !== false) n.setAttribute(k, v === true ? '' : String(v)); });
    if (o.props) Object.keys(o.props).forEach(function (k) { n[k] = o.props[k]; });
    if (o.text != null) n.textContent = String(o.text);
    if (o.on) Object.keys(o.on).forEach(function (k) { if (typeof o.on[k] === 'function') n.addEventListener(k, o.on[k]); });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' ? d.createTextNode(c) : c);
    });
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function detach(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }
  function btn(label, cls, onClick, attrs) {
    return h('button', { cls: 'btn ' + (cls || 'btn--secondary'), attrs: Object.assign({ type: 'button' }, attrs || {}), text: label, on: { click: onClick } });
  }
  function line(text, cls) { return h('p', { cls: 'lu-note' + (cls ? ' ' + cls : ''), text: text }); }

  /* Clock: tests replace api._now; nothing else reads the time. */
  function nowMs() { return typeof api._now === 'function' ? api._now() : Date.now(); }
  function ymdLocal(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayYmd() { return ymdLocal(nowMs()); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d), x = new Date(t);
    return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === d ? t : null;
  }
  function fmtDate(s) {
    var t = parseYmd(s);
    if (t == null) return '—';
    var d = new Date(t);
    return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function fmtIsoDate(iso) { var t = Date.parse(iso); return isNaN(t) ? '—' : fmtDate(ymdLocal(t)); }

  /**
   * retention(asOf, today?) → {asOf, days, notice, expired} (D29). asOf and today are 'YYYY-MM-DD'; today defaults to
   * the local date. A list without a valid data date counts as older than 90 days.
   */
  function retention(asOf, today) {
    var a = parseYmd(asOf), b = parseYmd(today || todayYmd());
    if (a == null || b == null) return { asOf: null, days: null, notice: true, expired: true };
    var days = Math.round((b - a) / 86400000);
    return { asOf: String(asOf), days: days, notice: days >= NOTICE_DAYS, expired: days >= EXPIRE_DAYS };
  }

  function b64(bytes) {
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', out = '', i;
    for (i = 0; i + 2 < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + A[n & 63];
    }
    var r = bytes.length - i;
    if (r === 1) { var p = bytes[i] << 16; out += A[(p >> 18) & 63] + A[(p >> 12) & 63] + '=='; }
    else if (r === 2) { var q = (bytes[i] << 16) | (bytes[i + 1] << 8); out += A[(q >> 18) & 63] + A[(q >> 12) & 63] + A[(q >> 6) & 63] + '='; }
    return out;
  }
  function unb64(s) {
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    s = String(s == null ? '' : s).replace(/=+$/, '');
    if (!/^[A-Za-z0-9+/]*$/.test(s) || s.length % 4 === 1) return null;
    var out = [], buf = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      buf = (buf << 6) | A.indexOf(s[i]); bits += 6;
      if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
    }
    return new Uint8Array(out);
  }
  function initialsOk(s) { return /^[A-Za-z]{2,4}$/.test(String(s == null ? '' : s).trim()); }

  /* ================================================================== state */

  function freshSession() { return { on: false, keyB64: null, onSince: null, onBy: null, stale: false }; }
  var S = {
    wired: { doc: false, state: false, policy: null, win: false },
    session: freshSession(),
    dirty: false,          // a switch change or an expiry that no saved copy holds yet
    offPending: false,     // switched off; the installed copy still holds the list (§8.3)
    expired: null,         // {asOf}: a list left out at sign-in (D29)
    cuts: null,            // report.cuts of this session's import
    memory: null,          // D17: {rule, by, where: {key, label} | null, pages}; memory only
    panel: null,
    listeners: [],
    mounts: [],
    cache: { sig: null, val: null }
  };

  function emit(reason) {
    S.cache.sig = null;
    // the open panel follows a threshold or list change: redrawn from the module, or closed when the list is gone
    if (S.panel && (reason === 'policy' || reason === 'data')) {
      if (!available()) close('off'); else render();
    }
    S.listeners.slice().forEach(function (fn) { safe(function () { fn({ reason: reason }); }); });
    S.mounts.slice().forEach(function (m) { safe(function () { m.update(reason); }); });
    var d = doc();
    if (d && typeof d.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      safe(function () { d.dispatchEvent(new root.CustomEvent('mcd:leads', { detail: { reason: reason } })); });
    }
  }
  function on(fn) {
    if (typeof fn !== 'function') return function () {};
    S.listeners.push(fn);
    return function () { var i = S.listeners.indexOf(fn); if (i >= 0) S.listeners.splice(i, 1); };
  }
  function toast(msg, ctx) {
    if (ctx && typeof ctx.toast === 'function') { safe(function () { ctx.toast(msg); }); return; }
    var A = M().app;
    if (A && typeof A.toast === 'function') safe(function () { A.toast(msg); });
  }
  function plog(act, detail) {
    var p = P();
    if (p && typeof p.log === 'function') safe(function () { p.log(act, detail || {}); });
  }

  function records() { var d = D(); return d && Array.isArray(d.leads) ? d.leads : []; }
  function listMeta() { var d = D(); return (d && d.meta && d.meta.leads) || null; }
  function demoOn() { var d = D(); return !!(d && typeof d.demoActive === 'function' && safe(function () { return d.demoActive(); })); }
  function veiled() {
    var St = M().state;
    var s = St && typeof St.get === 'function' ? safe(function () { return St.get(); }) : null;
    return !!(s && s.privacy && s.privacy.veil);
  }
  function wide() {
    if (root && typeof root.innerWidth === 'number') return root.innerWidth >= MIN_WIDTH;
    return !!safe(function () { return root.matchMedia('(min-width: ' + MIN_WIDTH + 'px)').matches; });
  }
  function policyLeads() { var p = P(); return p ? safe(function () { return p.forLeads(); }) || null : null; }
  /** MCD.leads.configure from the policy numbers (§1.7.1 "Feeds"). */
  function feedPolicy() {
    var l = L(), pl = policyLeads();
    if (!l || !pl) return;
    var patch = {};
    ['prioritasThreshold', 'kprMinIncome', 'k'].forEach(function (k) { if (has(pl, k)) patch[k] = pl[k]; });
    safe(function () { l.configure(patch); });
  }

  /**
   * The summary as the screens may show it: {k, total: {text}, rules: {<id>: {id, off, offWhy, text, suppressed, shown,
   * n}}}. n is set only for a count that is shown (not hidden, not off, at least k); a rule that is off (its threshold
   * is empty, D31) reads "—". Memoised per data version and settings.
   */
  function view() {
    var l = L(), d = D();
    if (!l || !d) return null;
    var recs = records(), set = l.settings();
    var sig = [d.version, recs.length, JSON.stringify(set)].join('|');
    if (S.cache.sig === sig && S.cache.val) return S.cache.val;
    var sm = l.summary(recs), out = { k: sm.k, total: { text: sm.total.text, suppressed: !!sm.total.suppressed }, rules: {} };
    sm.rules.forEach(function (r) {
      if (RULE_IDS.indexOf(r.id) < 0) return;
      var isOff = !r.active;
      var shown = !isOff && !r.suppressed && isNum(r.n) && r.n >= sm.k;
      out.rules[r.id] = { id: r.id, off: isOff, offWhy: isOff ? OFF_WHY[r.id] : null, text: isOff ? '—' : r.text,
        suppressed: isOff || !!r.suppressed, shown: shown, n: shown ? r.n : null };
    });
    RULE_IDS.forEach(function (id) { if (!out.rules[id]) out.rules[id] = { id: id, off: true, offWhy: OFF_WHY[id], text: '—', suppressed: true, shown: false, n: null }; });
    S.cache = { sig: sig, val: out };
    return out;
  }
  function markTitle(text, k) {
    if (text === '<' + k) return fill(T.markLt, { k: k });
    if (text === '–' || text === 'disembunyikan') return T.markDash;
    return null;
  }
  function markSr(text, k) {
    if (text === '<' + k) return fill(T.srLt, { k: k });
    if (text === '–' || text === 'disembunyikan') return T.srDash;
    return null;
  }

  /** D17: switch on, key set, a list loaded and not expired, ≥ 1024 px, not veiled, Data contoh off. */
  function available() {
    ensureWired();
    var l = L();
    if (!l || !D()) return false;
    if (!safe(function () { return l.enabled() && l.hasKey(); })) return false;
    if (demoOn() || !records().length) return false;
    var meta = listMeta();
    if (retention(meta && meta.asOf).expired) return false;
    return wide() && !veiled();
  }
  function stale() {
    if (S.session.stale) return true;
    var l = L();
    if (!S.cuts || !l) return false;
    var s = l.settings();
    var cur = { prioritas: isNum(s.prioritasThreshold), penghasilan: l.edgesFor('penghasilanBand', s) };
    return JSON.stringify(cur) !== JSON.stringify({ prioritas: S.cuts.prioritas, penghasilan: S.cuts.penghasilan });
  }

  /* ============================================== count lines outside the panel */

  function leadButton(id, r, cls) {
    return h('button', {
      cls: cls, attrs: { type: 'button', title: T.openLeads, 'data-rule': id },
      on: { click: function () { open({ rule: id }); } }
    }, [fill(T.leadIn, { aturan: LABELS[id], n: r.text })]);
  }
  /**
   * railLine(rules) → one line "Leads: Mendekati Prioritas {n} · Buka Leads" (V7 §5.3, V8 §4.5) with the rules whose
   * count is shown, as one button that opens the panel at the first of them; null when none (D17, §9.6).
   */
  function railLine(rules) {
    ensureWired();
    if (!available()) return null;
    var v = view();
    var ids = (Array.isArray(rules) ? rules : [rules]).filter(function (id, i, a) {
      return RULE_IDS.indexOf(id) >= 0 && a.indexOf(id) === i && v.rules[id].shown;
    });
    if (!ids.length) return null;
    var box = h('div', { cls: 'lu-rail', attrs: { translate: 'no' } });
    var text = T.railHead + ids.map(function (id) { return LABELS[id] + ' ' + v.rules[id].text; }).join(' · ') + ' · ' + T.openLeads;
    box.appendChild(h('button', {
      cls: 'lu-rail__line', attrs: { type: 'button', title: T.openLeads, 'data-rule': ids[0] },
      on: { click: function () { open({ rule: ids[0] }); } }
    }, [text]));
    return box;
  }
  /** chip(rule) → the Posisi cabang lead chip "Mendekati Prioritas di Leads: n", or null (same rule as railLine). */
  function chip(rule) {
    ensureWired();
    if (RULE_IDS.indexOf(rule) < 0 || !available()) return null;
    var r = view().rules[rule];
    if (!r.shown) return null;
    var b = leadButton(rule, r, 'chip lu-chip');
    b.setAttribute('translate', 'no');
    return b;
  }

  /* ============================================================ navigation */

  function goData(action, from, ctx) {
    var target = { section: 'data', view: 'deep', action: action, label: 'Kebijakan & leads' };
    var N = M().nav, A = M().app;
    if (N && typeof N.go === 'function' && safe(function () { return N.go(target, { from: from }); })) return true;
    if (A && typeof A.navigate === 'function') { safe(function () { A.navigate('data', { view: 'deep', action: action }); }); return true; }
    return false;
  }

  /* ================================================================ the panel */

  function overlayHost() { var d = doc(); return (d.getElementById && d.getElementById('overlay-root')) || d.body; }
  function focusables(box) {
    var out = [];
    (function walk(n) {
      (n.childNodes || []).forEach(function (c) {
        if (c.nodeType !== 1 || c.hidden) return;
        var t = c.tagName;
        if ((t === 'BUTTON' || t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA' || t === 'SUMMARY') && !c.disabled) out.push(c);
        else if (c.getAttribute('tabindex') === '0') out.push(c);
        walk(c);
      });
    })(box);
    return out;
  }
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    var f = focusables(box), d = doc();
    if (!f.length) { e.preventDefault(); return; }
    var i = f.indexOf(d.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  }
  function setInert(p) {
    var d = doc(), host = overlayHost(), keep = host === d.body ? null : host;
    p.inert = [];
    Array.prototype.slice.call(d.body.childNodes || []).forEach(function (c) {
      if (c.nodeType !== 1 || c === keep || c === p.scrim || c === p.box || c === p.printNote) return;
      if (c.getAttribute('aria-live') || /(^|\s)toast(\s|$)/.test(c.getAttribute('class') || '')) return;
      if (c.hasAttribute('inert')) return;
      c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true');
      p.inert.push(c);
    });
  }
  function unsetInert(p) { (p.inert || []).forEach(function (c) { c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); }); p.inert = []; }

  function pickRule(v, want) {
    if (want && v.rules[want] && !v.rules[want].off) return want;
    var shown = RULE_IDS.filter(function (id) { return v.rules[id].shown; })[0];
    if (shown) return shown;
    return RULE_IDS.filter(function (id) { return !v.rules[id].off; })[0] || null;
  }

  /**
   * open({rule?, by?}) → boolean. With a rule: that rule, grouped by `by` (default the remembered grouping, else Kode
   * satuan). Without: the remembered rule, grouping and row page (D17), else the first rule whose count is shown.
   */
  function open(opts) {
    ensureWired();
    if (!available()) return false;
    opts = opts || {};
    var v = view(), mem = S.memory, byOk = BY_IDS.indexOf(opts.by) >= 0;
    var next;
    if (opts.rule && v.rules[opts.rule] && !v.rules[opts.rule].off) {
      next = { rule: opts.rule, by: byOk ? opts.by : (mem ? mem.by : 'kodeSatuan'), where: null, pages: 1 };
    } else if (mem && mem.rule && v.rules[mem.rule] && !v.rules[mem.rule].off && !opts.rule) {
      next = { rule: mem.rule, by: byOk ? opts.by : mem.by, where: byOk && opts.by !== mem.by ? null : mem.where, pages: mem.pages };
    } else {
      next = { rule: pickRule(v, null), by: byOk ? opts.by : 'kodeSatuan', where: null, pages: 1 };
    }
    S.memory = next;
    if (S.panel) { render(); return true; }
    var d = doc();
    var p = { opener: d.activeElement || null, covered: false, timer: null, inert: [] };
    p.scrim = h('div', { cls: 'lu-scrim', attrs: { 'aria-hidden': 'true' }, on: { click: function () { close('user'); } } });
    p.closeBtn = btn(T.close, 'btn--secondary lu-panel__close', function () { close('user'); });
    p.body = h('div', { cls: 'lu-panel__body' });
    p.box = h('section', {
      cls: 'lu-panel', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lu-panel-title', translate: 'no', tabindex: '-1' }
    }, [
      h('header', { cls: 'lu-panel__head' }, [h('h2', { cls: 'lu-panel__title', attrs: { id: 'lu-panel-title' }, text: T.title }), p.closeBtn]),
      p.body
    ]);
    p.onKey = function (e) {
      if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); if (e.stopPropagation) e.stopPropagation(); close('esc'); return; }
      trap(p.box, e);
    };
    p.onInput = function () { armIdle(); };
    p.box.addEventListener('keydown', p.onKey);
    ['pointerdown', 'keydown', 'wheel', 'input', 'touchstart'].forEach(function (t) { p.box.addEventListener(t, p.onInput); });
    p.box.addEventListener('scroll', p.onInput, true);
    // D28: printing while the panel is open gives one line; translate="no" on the panel root
    p.printNote = h('div', { cls: 'lu-print-note', attrs: { 'aria-hidden': 'true' }, text: T.print });
    d.body.appendChild(p.printNote);
    if (d.body.classList) d.body.classList.add('lu-noprint');
    var host = overlayHost();
    host.appendChild(p.scrim);
    host.appendChild(p.box);
    S.panel = p;
    setInert(p);
    /* V8 §2.7 (M2): on coarse pointers Back closes the panel first; MCD.back decides whether it is active */
    var B = M().back;
    if (B && typeof B.open === 'function') safe(function () { B.open('leads', function (o) { close(o && o.via === 'back' ? 'back' : (o && o.via === 'lock' ? 'lock' : 'section')); }); });
    render();
    armIdle();
    var first = p.box.querySelector ? p.box.querySelector('.lu-rule[aria-pressed="true"]') : null;
    (first || p.box).focus();
    emit('open');
    return true;
  }
  function armIdle() {
    var p = S.panel;
    if (!p) return;
    if (p.timer != null) clearTimeout(p.timer);
    p.timer = setTimeout(function () { p.timer = null; if (S.panel === p) close('idle'); }, IDLE_MS);
  }
  /**
   * close(reason) → boolean. reason: 'user' | 'esc' | 'back' | 'lock' | 'section' | 'veil' | 'idle' | 'demo' | 'width' | 'off'.
   * The remembered view survives every reason except lock, veil and off (D17).
   */
  function close(reason) {
    var p = S.panel;
    if (reason === 'lock' || reason === 'veil' || reason === 'off') S.memory = null;
    if (!p) return false;
    S.panel = null;
    if (p.timer != null) clearTimeout(p.timer);
    p.box.removeEventListener('keydown', p.onKey);
    unsetInert(p);
    clear(p.body);
    detach(p.scrim); detach(p.box); detach(p.printNote);
    var d = doc();
    if (d.body.classList) d.body.classList.remove('lu-noprint');
    /* the panel closed itself: its Back entry is given back (a close by Back or a section change has none left) */
    var B = M().back;
    if (B && typeof B.closed === 'function' && reason !== 'back') safe(function () { B.closed('leads'); });
    if (reason !== 'lock' && p.opener && typeof p.opener.focus === 'function' && p.opener.isConnected !== false) safe(function () { p.opener.focus(); });
    if (reason === 'veil') toast(T.toastVeil);
    else if (reason === 'idle') toast(T.toastIdle);
    emit('close');
    return true;
  }
  function isOpen() { return !!S.panel; }

  /** D17: when the page is hidden the panel body leaves the DOM; only the cover and its button stay. */
  function cover() {
    var p = S.panel;
    if (!p || p.covered) return;
    p.covered = true;
    clear(p.body);
    var again = btn(T.showAgain, 'btn--primary', function () { uncover(); });
    p.body.appendChild(h('div', { cls: 'lu-cover' }, [line(T.cover, 'lu-cover__t'), again]));
    if (p.box.contains(doc().activeElement) || doc().activeElement == null) again.focus();
  }
  function uncover() {
    var p = S.panel;
    if (!p) return;
    p.covered = false;
    if (!available()) { close('user'); return; }
    render();
    var first = p.box.querySelector ? p.box.querySelector('.lu-rule[aria-pressed="true"]') : null;
    (first || p.box).focus();
  }
  function pageHidden() { var d = doc(); return !!(d && (d.hidden === true || d.visibilityState === 'hidden')); }

  /* ---- panel content (rebuilt from the module and S.memory on every change) ---- */

  function render() {
    var p = S.panel;
    if (!p || p.covered) return;
    var l = L(), v = view(), mem = S.memory, k = v.k, recs = records(), meta = listMeta() || {};
    // D31: a remembered rule that is off now (its threshold was emptied) gives way to the first usable rule
    if (mem && mem.rule && (!v.rules[mem.rule] || v.rules[mem.rule].off)) {
      mem = S.memory = { rule: pickRule(v, null), by: mem.by, where: null, pages: 1 };
    }
    clear(p.body);
    var fp = recs.length && recs[0] && recs[0].fp ? recs[0].fp : '—';
    p.body.appendChild(h('p', { cls: 'lu-file', text: fill(T.fileLine, { file: meta.file || '—', m: v.total.text, tanggal: fmtDate(meta.asOf), fp: fp }) }));
    if (S.session.on && S.session.onSince) {
      p.body.appendChild(line(fill(T.activeSince, { tanggal: fmtIsoDate(S.session.onSince), inisial: S.session.onBy || '—' })));
    }
    if (retention(meta.asOf).notice) p.body.appendChild(line(T.old45, 'lu-warn'));
    if (stale()) p.body.appendChild(line(T.stale, 'lu-warn'));

    // rule chips (D32 labels; "—" with the reason for a rule that is off)
    var chips = h('div', { cls: 'lu-rules', attrs: { role: 'group', 'aria-label': T.rulesGroup } });
    RULE_IDS.forEach(function (id) {
      var r = v.rules[id], sel = mem && mem.rule === id;
      var title = r.off ? r.offWhy : (markTitle(r.text, k) ? RULE_TITLES[id] + ' ' + markTitle(r.text, k) : RULE_TITLES[id]);
      var count = h('span', { cls: 'lu-rule__n', text: r.text, attrs: { 'aria-label': r.off ? null : markSr(r.text, k) } });
      var b = h('button', {
        cls: 'chip lu-rule' + (r.off ? ' is-off' : ''),
        attrs: { type: 'button', 'aria-pressed': sel ? 'true' : 'false', 'aria-disabled': r.off ? 'true' : null, title: title },
        on: { click: function () { if (r.off) return; S.memory = { rule: id, by: mem ? mem.by : 'kodeSatuan', where: null, pages: 1 }; render(); focusRule(id); } }
      }, [h('span', { cls: 'lu-rule__l', text: LABELS[id] }), count]);
      chips.appendChild(b);
    });
    p.body.appendChild(chips);

    var offN = RULE_IDS.filter(function (id) { return v.rules[id].off; }).length;
    var go = function () { close('user'); goData('data:leads', 'leads'); };
    if (offN === RULE_IDS.length) {
      p.body.appendChild(h('div', { cls: 'lu-off' }, [line(T.offAll), btn(T.openPolicy, 'btn--secondary', go)]));
      footer(p.body);
      return;
    }
    if (offN) p.body.appendChild(h('div', { cls: 'lu-off' }, [line(fill(T.offSome, { n: offN })), btn(T.openPolicy, 'btn--secondary', go)]));
    if (!mem || !mem.rule) { footer(p.body); return; }

    var rv = v.rules[mem.rule];
    p.body.appendChild(h('p', { cls: 'lu-headline', text: fill(T.headline, { total: v.total.text, aturan: LABELS[mem.rule], n: rv.text }) }));

    if (mem.where) renderRows(p.body, l, recs, mem, k);
    else renderTable(p.body, l, recs, mem, k);
    footer(p.body);
  }
  function focusRule(id) {
    var p = S.panel;
    if (!p) return;
    var bs = p.box.querySelectorAll ? p.box.querySelectorAll('.lu-rule') : [];
    var b = bs[RULE_IDS.indexOf(id)];
    if (b) b.focus();
  }
  function footer(body) {
    body.appendChild(h('div', { cls: 'lu-foot' }, [line(T.foot1), line(T.foot2)]));
  }
  function renderTable(body, l, recs, mem, k) {
    var seg = h('div', { cls: 'lu-by', attrs: { role: 'group', 'aria-label': T.groupBy } }, [h('span', { cls: 'lu-by__l', text: T.groupBy + ':' })]);
    BY_IDS.forEach(function (by) {
      seg.appendChild(h('button', {
        cls: 'lu-by__opt', attrs: { type: 'button', 'aria-pressed': mem.by === by ? 'true' : 'false' }, text: BY_LABELS[by],
        on: { click: function () { S.memory = { rule: mem.rule, by: by, where: null, pages: 1 }; render(); } }
      }));
    });
    body.appendChild(seg);
    var res = l.aggregate(recs, mem.by, { rule: mem.rule });
    if (res.withheld || !res.groups.length) {
      body.appendChild(line(res.note || T.markDash, 'lu-withheld'));
      return;
    }
    var tbody = h('tbody');
    res.groups.forEach(function (g) {
      var mark = g.suppressed ? g.text : null;
      var cnt = h('span', { cls: 'lu-cnt', text: g.text, attrs: { title: mark ? markTitle(mark, k) : null, 'aria-label': mark ? markSr(mark, k) : null } });
      var act = null;
      if (!g.suppressed && !g.pooled && isNum(g.n) && g.n > 0) {
        act = h('button', {
          cls: 'lu-link', attrs: { type: 'button' }, text: T.seeRows,
          on: { click: function () { S.memory = { rule: mem.rule, by: mem.by, where: { key: g.key, label: g.label }, pages: 1 }; render(); } }
        });
      }
      tbody.appendChild(h('tr', { cls: g.pooled ? 'is-pooled' : null }, [
        h('th', { attrs: { scope: 'row' }, text: g.label }),
        h('td', { cls: 'num' }, [cnt]),
        h('td', { cls: 'lu-tbl__act' }, [act])
      ]));
    });
    body.appendChild(h('div', { cls: 'tbl-wrap lu-tbl-wrap' }, [h('table', { cls: 'tbl lu-tbl' }, [
      h('thead', null, [h('tr', null, [
        h('th', { attrs: { scope: 'col' }, text: BY_LABELS[mem.by] }),
        h('th', { cls: 'num', attrs: { scope: 'col' }, text: LABELS[mem.rule] }),
        h('th', { attrs: { scope: 'col' } }, [h('span', { cls: 'sr-only', text: T.colRows })])
      ])]),
      tbody
    ])]));
    if (res.note) body.appendChild(line(res.note, 'lu-tnote'));
  }
  function renderRows(body, l, recs, mem, k) {
    var where = {};
    where[mem.by] = mem.where.key;
    body.appendChild(h('button', {
      cls: 'lu-back', attrs: { type: 'button' }, text: T.backTable,
      on: { click: function () { S.memory = { rule: mem.rule, by: mem.by, where: null, pages: 1 }; render(); } }
    }));
    body.appendChild(h('h3', { cls: 'lu-rows__h', text: fill(T.rowsHead, { aturan: LABELS[mem.rule], kelompok: mem.where.label }) }));
    body.appendChild(line(T.rowsFind));
    body.appendChild(line(T.rowsOffer));
    var res = safe(function () { return l.list(recs, { rule: mem.rule, where: where }); });
    if (!res || res.suppressed) { body.appendChild(line((res && res.why) || T.markDash, 'lu-withheld')); return; }
    var ol = h('ol', { cls: 'lu-rows' }), more = null;
    var shown = 0;
    function addPage(upto) {
      var end = Math.min(res.rows.length, upto);
      for (; shown < end; shown++) {
        var r = res.rows[shown];
        ol.appendChild(h('li', { cls: 'lu-row' }, [
          h('span', { cls: 'lu-row__n', text: fill(T.rowLine, { n: fmtInt(r.sourceRow) }) }),
          h('span', { cls: 'lu-mono', text: fill(T.rowKey, { key: r.key }) })
        ]));
      }
      if (more && shown >= res.rows.length) { detach(more); more = null; }
    }
    addPage(mem.pages * PAGE);
    body.appendChild(ol);
    if (shown < res.rows.length) {
      more = btn(T.more, 'btn--secondary lu-more', function () {
        mem.pages += 1;
        if (S.memory) S.memory.pages = mem.pages;
        addPage(mem.pages * PAGE);
      });
      body.appendChild(more);
    }
  }

  /* ============================================================ the switch */

  function dialog(o) {
    // a small modal of this lane (title, lines, fields, two buttons); returns {close}
    var d = doc(), host = overlayHost(), opener = d.activeElement || null;
    var scrim = h('div', { cls: 'lu-scrim', attrs: { 'aria-hidden': 'true' } });
    var box = h('div', { cls: 'lu-dialog', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lu-dlg-t', translate: 'no' } });
    var api2 = { box: box, close: function () { detach(scrim); detach(box); if (opener && opener.focus && opener.isConnected !== false) safe(function () { opener.focus(); }); } };
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); api2.close(); return; }
      trap(box, e);
    });
    scrim.addEventListener('click', function () { api2.close(); });
    box.appendChild(h('h2', { cls: 'lu-dialog__t', attrs: { id: 'lu-dlg-t' }, text: o.title }));
    o.lines.forEach(function (t) { box.appendChild(line(t)); });
    host.appendChild(scrim);
    host.appendChild(box);
    return api2;
  }
  function initialsField(err) {
    var p = P(), pre = p && typeof p.actor === 'function' ? safe(function () { return p.actor(); }) : null;
    var input = h('input', {
      cls: 'input lu-initials', attrs: { type: 'text', id: 'lu-ini-' + (++initialsField.n), autocomplete: 'off', spellcheck: 'false', maxlength: '4',
        autocapitalize: 'characters', 'aria-describedby': 'lu-ini-h-' + initialsField.n + ' lu-ini-e-' + initialsField.n }
    });
    input.value = pre ? String(pre) : '';
    var errEl = h('p', { cls: 'lu-err', attrs: { id: 'lu-ini-e-' + initialsField.n, role: 'alert' }, text: err || '' });
    errEl.hidden = !err;
    var wrap = h('div', { cls: 'field lu-field' }, [
      h('label', { cls: 'field__label', attrs: { for: input.getAttribute('id') }, text: T.initials }),
      input,
      h('p', { cls: 'field__hint', attrs: { id: 'lu-ini-h-' + initialsField.n }, text: T.initialsHint }),
      errEl
    ]);
    return { el: wrap, input: input, value: function () { return String(input.value == null ? '' : input.value).trim().toUpperCase(); },
      error: function (t) { errEl.textContent = t || ''; errEl.hidden = !t; } };
  }
  initialsField.n = 0;
  /** Sets the session initials through MCD.policy (memory only); false with the error shown when refused. */
  function takeActor(field) {
    var v = field.value();
    if (!initialsOk(v)) { field.error(T.initialsErr); return null; }
    var p = P();
    if (p && typeof p.setActor === 'function') {
      var r = safe(function () { return p.setActor(v); });
      if (r && r.ok === false) { field.error(r.pesan || T.initialsErr); return null; }
    }
    field.error('');
    return v;
  }

  /**
   * Turning leads on (§8.3): a fresh masking key, the switch, the thresholds, payload.leads pending, Riwayat.
   * Refused under Data contoh: MCD.policy logs nothing then (§8.5), so the D27 Riwayat would miss the entry.
   */
  function turnOn(initials) {
    var l = L();
    if (demoOn()) return Promise.reject(new Error(T.demo));
    if (!l) return Promise.reject(new Error(T.readFail));
    var bytes;
    try { bytes = l.newKeyBytes(); } catch (e) { return Promise.reject(e); }
    var keyB64 = b64(bytes);
    return l.setKey(bytes).then(function () {
      for (var i = 0; i < bytes.length; i++) bytes[i] = 0;
      l.setEnabled(true);
      feedPolicy();
      S.session = { on: true, keyB64: keyB64, onSince: new Date(nowMs()).toISOString(), onBy: initials, stale: false };
      S.dirty = true; S.offPending = false; S.expired = null; S.cuts = null;
      plog('leads-on', {});
      emit('on');
      return true;
    });
  }
  /**
   * "Matikan dan hapus daftar leads" (§8.3): list and key gone, module defaults, payload.leads {on: false} pending.
   * → false and nothing changed under Data contoh (MCD.policy neither logs nor clears leads.k then, §8.2, §8.5).
   */
  function turnOff() {
    if (demoOn()) return false;
    close('off');
    var l = L(), p = P();
    if (l) { safe(function () { l.clear(); }); safe(function () { l.reset(); }); }
    // the smallest group size can be lowered only here (§8.2): back to the module's minimum
    if (p && typeof p.clear === 'function') safe(function () { p.clear(['leads.k']); });
    S.session = freshSession();
    S.dirty = true; S.offPending = true; S.cuts = null; S.memory = null; S.expired = null;
    plog('leads-off', {});
    emit('off');
    return true;
  }

  function openOnDialog(ctx, after) {
    var dlg = dialog({ title: T.onTitle, lines: T.onBody });
    var f = initialsField();
    var check = h('input', { attrs: { type: 'checkbox', id: 'lu-approval' } });
    var ok = btn(T.onOk, 'btn--primary', null);
    var err = h('p', { cls: 'lu-err', attrs: { role: 'alert' } });
    err.hidden = true;
    function sync() { ok.disabled = !(initialsOk(f.value()) && check.checked); }
    f.input.addEventListener('input', function () { f.error(''); sync(); });
    check.addEventListener('change', sync);
    ok.addEventListener('click', function () {
      if (ok.disabled) return;
      if (demoOn()) { err.textContent = T.demo; err.hidden = false; return; }
      var who = takeActor(f);
      if (!who || !check.checked) { sync(); return; }
      ok.disabled = true;
      turnOn(who).then(function () {
        dlg.close();
        if (ctx && typeof ctx.onSwitch === 'function') safe(function () { ctx.onSwitch(true); });
        else if (after) after();
      }, function (e) { err.textContent = (e && e.message) || T.readFail; err.hidden = false; sync(); });
    });
    dlg.box.appendChild(f.el);
    dlg.box.appendChild(h('label', { cls: 'lu-check', attrs: { for: 'lu-approval' } }, [check, h('span', { text: T.approvalCheck })]));
    dlg.box.appendChild(err);
    dlg.box.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.cancel, 'btn--secondary', function () { dlg.close(); }), ok]));
    sync();
    f.input.focus();
    return dlg;
  }
  function openOffDialog(ctx, after) {
    var dlg = dialog({ title: T.offTitle, lines: T.offBody });
    var f = initialsField();
    var ok = btn(T.offOk, 'btn--danger', null);
    var err = h('p', { cls: 'lu-err', attrs: { role: 'alert' } });
    err.hidden = true;
    function sync() { ok.disabled = !initialsOk(f.value()); }
    f.input.addEventListener('input', function () { f.error(''); sync(); });
    ok.addEventListener('click', function () {
      if (ok.disabled) return;
      // Data contoh switched on while this dialog was open: nothing is cleared and nothing logged (§8.5)
      if (demoOn()) { err.textContent = T.demo; err.hidden = false; return; }
      if (!takeActor(f)) { sync(); return; }
      dlg.close();
      turnOff();
      if (ctx && typeof ctx.onSwitch === 'function') safe(function () { ctx.onSwitch(false); });
      else if (after) after();
    });
    dlg.box.appendChild(f.el);
    dlg.box.appendChild(err);
    dlg.box.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.cancel, 'btn--secondary', function () { dlg.close(); }), ok]));
    sync();
    f.input.focus();
    return dlg;
  }

  /** settingsCard(container, ctx) → {destroy}: the card "Daftar leads (CIF disamarkan)" of Kebijakan & leads (§8.3). */
  function settingsCard(container, ctx) {
    ensureWired();
    ctx = ctx || {};
    var m = { container: container, root: null };
    function saveBtn() { return typeof ctx.saveEncrypted === 'function' ? btn(T.save, 'btn--primary', function () { ctx.saveEncrypted(); }) : null; }
    function focusSwitch() { var s = m.root && m.root.querySelector ? m.root.querySelector('.lu-switch') : null; if (s) s.focus(); }
    m.update = function () {
      var l = L(), isOn = !!(l && safe(function () { return l.enabled(); })), meta = listMeta(), recs = records();
      var hadFocus = m.root && m.root.contains(doc().activeElement) && doc().activeElement.classList && doc().activeElement.classList.contains('lu-switch');
      // Data contoh: the switch and "Matikan" stay focusable but do nothing; the demo line says why (§9.5).
      // MCD.policy neither logs nor clears under Data contoh, so a change here would miss the D27 Riwayat.
      var demo = demoOn();
      var lock = demo ? { 'aria-disabled': 'true', 'aria-describedby': 'lu-set-demo' } : {};
      var sw = h('button', {
        cls: 'lu-switch', attrs: Object.assign({ type: 'button', role: 'switch', 'aria-checked': isOn ? 'true' : 'false' }, lock),
        on: { click: function () { if (demoOn()) return; if (isOn) openOffDialog(ctx, focusSwitch); else openOnDialog(ctx, focusSwitch); } }
      }, [h('span', { cls: 'lu-switch__l', text: T.switchLabel }), h('span', { cls: 'lu-switch__v', text: isOn ? T.on : T.off })]);
      var card = h('section', { cls: 'lu-card lu-settings', attrs: { translate: 'no', 'aria-labelledby': 'lu-set-t' } }, [
        h('div', { cls: 'lu-card__head' }, [h('h3', { cls: 'lu-card__t', attrs: { id: 'lu-set-t' }, text: T.title }), sw])
      ]);
      var ul = h('ul', { cls: 'lu-lines' });
      T.cardLines.forEach(function (t) { ul.appendChild(h('li', { text: t })); });
      card.appendChild(ul);
      card.appendChild(line(T.approval, 'lu-approval'));
      if (isOn && S.session.onSince) card.appendChild(line(fill(T.activeSince, { tanggal: fmtIsoDate(S.session.onSince), inisial: S.session.onBy || '—' }), 'is-strong'));
      if (demo) card.appendChild(h('p', { cls: 'lu-note', attrs: { id: 'lu-set-demo' }, text: T.demo }));
      else if (isOn && !recs.length && !S.expired) card.appendChild(line(T.noList));
      else if (isOn && recs.length && retention(meta && meta.asOf).notice) card.appendChild(line(T.old45, 'lu-warn'));
      if (S.expired) {
        card.appendChild(h('div', { cls: 'lu-banner' }, [line(fill(T.expired1, { tanggal: fmtDate(S.expired.asOf) })), line(T.expired2), saveBtn()]));
      }
      if (isOn && S.dirty && !S.expired) card.appendChild(h('div', { cls: 'lu-banner' }, [line(T.onBanner), saveBtn()]));
      if (!isOn && S.offPending) card.appendChild(h('div', { cls: 'lu-banner' }, [line(T.offBanner), saveBtn()]));
      if (isOn) card.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.offBtn, 'btn--danger', function () { if (!demoOn()) openOffDialog(ctx, focusSwitch); }, lock)]));
      if (m.root) detach(m.root);
      m.root = card;
      clear(container).appendChild(card);
      if (hadFocus) focusSwitch();
    };
    m.lock = function () {};
    m.destroy = function () {
      var i = S.mounts.indexOf(m);
      if (i >= 0) S.mounts.splice(i, 1);
      clear(container);
      m.root = null;
    };
    S.mounts.push(m);
    m.update('mount');
    return { destroy: m.destroy };
  }

  /* ========================================================== the import card */

  function missingThresholds() {
    var p = P();
    if (p && typeof p.missing === 'function') {
      var r = safe(function () { return p.missing(THRESHOLD_KEYS); });
      if (Array.isArray(r)) return THRESHOLD_KEYS.filter(function (k) { return r.indexOf(k) >= 0; });
    }
    var pl = policyLeads();
    if (!pl) return THRESHOLD_KEYS.slice();
    return THRESHOLD_KEYS.filter(function (k) { return pl[k.slice(6)] == null; });
  }
  function wipeSheet(sh) {
    if (!sh) return;
    if (Array.isArray(sh.rows)) { sh.rows.forEach(function (r) { if (Array.isArray(r)) for (var j = 0; j < r.length; j++) r[j] = null; }); sh.rows.length = 0; }
    if (Array.isArray(sh.headers)) sh.headers.length = 0;
    if (Array.isArray(sh.rowNos)) sh.rowNos.length = 0;
  }
  function dropResult(res) { if (res && Array.isArray(res.records)) res.records.length = 0; }
  /** A WebCrypto wrapper whose sign() refuses after Batal, so importSheet stops between chunks and stores nothing. */
  function cancellableCrypto(run) {
    var c = root && root.crypto;
    if (!c || !c.subtle) return null;
    var s = c.subtle;
    return {
      getRandomValues: function (a) { return c.getRandomValues(a); },
      subtle: {
        sign: function () { if (run.cancelled) { var e = new Error(T.cancelled); e.code = 'BATAL'; return Promise.reject(e); } return s.sign.apply(s, arguments); },
        digest: function () { return s.digest.apply(s, arguments); },
        importKey: function () { return s.importKey.apply(s, arguments); }
      }
    };
  }
  function asOfError(v) {
    if (parseYmd(v) == null) return T.asOfEmpty;
    var r = retention(v);
    if (r.days < 0) return T.asOfFuture;
    if (r.expired) return T.asOfOld;
    return null;
  }

  /** importFlow(container, ctx) → {destroy}: "Impor daftar leads", steps 0–4 of §9.2 (only while the switch is on). */
  function importFlow(container, ctx) {
    ensureWired();
    ctx = ctx || {};
    var m = { container: container, st: 'gate', gatePassed: false, sheets: null, sheet: null, file: null, userMap: null, chk: null,
      asOf: todayYmd(), result: null, run: null, msg: null, progressEl: null, mapMsg: null, sels: null, locked: null };
    function reset(st) {
      (m.sheets || []).forEach(wipeSheet);
      wipeSheet(m.sheet);
      dropResult(m.result);
      if (m.run) m.run.cancelled = true;
      m.sheets = null; m.sheet = null; m.file = null; m.userMap = null; m.chk = null; m.result = null; m.run = null; m.mapMsg = null; m.sels = null; m.locked = null;
      m.st = st || 'gate';
    }
    function go(st, msg) { m.st = st; m.msg = msg || null; draw(); }
    function steps(cur) {
      var ol = h('ol', { cls: 'lu-steps' });
      T.steps.forEach(function (t, i) {
        ol.appendChild(h('li', { cls: 'lu-step' + (i === cur ? ' is-on' : '') + (i < cur ? ' is-done' : ''), attrs: { 'aria-current': i === cur ? 'step' : null }, text: (i + 1) + ' ' + t }));
      });
      return ol;
    }
    function draw() {
      var l = L();
      clear(container);
      m.progressEl = null;
      if (!l || !safe(function () { return l.enabled(); })) { reset('gate'); m.gatePassed = false; return; }
      var card = h('section', { cls: 'lu-card lu-import', attrs: { translate: 'no', 'aria-labelledby': 'lu-imp-t' } }, [
        h('div', { cls: 'lu-card__head' }, [h('h3', { cls: 'lu-card__t', attrs: { id: 'lu-imp-t' }, text: T.importTitle })])
      ]);
      container.appendChild(card);
      if (demoOn()) { card.appendChild(line(T.demo)); return; }
      if (m.st === 'gate') {
        var miss = missingThresholds();
        if (miss.length && !m.gatePassed) {
          card.appendChild(line(fill(T.gateLine, { daftar: miss.map(function (k) { return THRESHOLD_LABELS[k]; }).join(', ') }), 'lu-warn'));
          card.appendChild(h('div', { cls: 'lu-actions' }, [
            btn(T.gateFill, 'btn--secondary', function () {
              if (typeof ctx.openThresholds === 'function') ctx.openThresholds(); else goData('data:leads', 'import', ctx);
            }),
            btn(T.gateGo, 'btn--primary', function () { m.gatePassed = true; go('file'); })
          ]));
          return;
        }
        m.st = 'file';
      }
      if (m.st === 'file' || m.st === 'reading') {
        card.appendChild(steps(0));
        if (m.msg) card.appendChild(line(m.msg, 'lu-warn'));
        card.appendChild(line(T.pick));
        card.appendChild(line(T.local));
        if (m.st === 'reading') { card.appendChild(h('p', { cls: 'lu-note', attrs: { 'aria-live': 'polite' }, text: T.reading })); return; }
        var inp = h('input', { cls: 'lu-filein', attrs: { type: 'file', accept: '.xlsx,.xlsm,.xls,.csv,text/csv', 'aria-label': T.pick } });
        inp.addEventListener('change', function () {
          var f = inp.files && inp.files[0];
          inp.value = '';
          if (f) readChosen(f);
        });
        card.appendChild(h('div', { cls: 'lu-actions' }, [inp]));
        return;
      }
      if (m.st === 'sheet') {
        card.appendChild(steps(0));
        card.appendChild(h('p', { cls: 'lu-note is-strong', text: T.pickSheet }));
        var row = h('div', { cls: 'lu-actions' });
        m.sheets.forEach(function (sh, i) { row.appendChild(btn(String(sh.name || ('Sheet ' + (i + 1))), 'btn--secondary', function () { pickSheet(i); })); });
        row.appendChild(btn(T.cancel, 'btn--ghost', function () { reset('file'); go('file'); }));
        card.appendChild(row);
        return;
      }
      if (m.st === 'map') { card.appendChild(steps(1)); drawMapping(card); return; }
      if (m.st === 'run') {
        card.appendChild(steps(2));
        m.progressEl = h('p', { cls: 'lu-progress', attrs: { 'aria-live': 'polite' }, text: T.progressStart });
        card.appendChild(m.progressEl);
        card.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.cancel, 'btn--secondary', function () { if (m.run) m.run.cancelled = true; })]));
        return;
      }
      if (m.st === 'report') { card.appendChild(steps(3)); drawReport(card); return; }
      if (m.st === 'done') {
        card.appendChild(steps(3));
        card.appendChild(line(T.ready, 'is-strong'));
        var sv = typeof ctx.saveEncrypted === 'function' ? btn(T.save, 'btn--primary', function () { ctx.saveEncrypted(); }) : null;
        card.appendChild(line(T.fileGone));
        card.appendChild(h('div', { cls: 'lu-actions' }, [sv, btn(T.again, 'btn--secondary', function () { m.gatePassed = false; go('gate'); })]));
        return;
      }
      if (m.st === 'error') {
        card.appendChild(steps(0));
        card.appendChild(line(m.msg || T.readFail, 'lu-err'));
        card.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.pickAgain, 'btn--secondary', function () { go('file'); })]));
      }
    }
    function readChosen(f) {
      var l = L();
      reset('reading');
      m.file = { name: String(f.name == null ? '' : f.name), size: isNum(f.size) ? f.size : null };
      draw();
      l.readFile(f).then(function (sheets) {
        if (m.st !== 'reading') { (sheets || []).forEach(wipeSheet); return; }
        sheets = (sheets || []).filter(function (s) { return s && Array.isArray(s.headers); });
        if (!sheets.length) { go('error', T.readFail); return; }
        m.sheets = sheets;
        if (sheets.length === 1) pickSheet(0); else go('sheet');
      }, function (e) { go('error', e && e.name === 'LeadsError' ? e.message : T.readFail); });
    }
    function pickSheet(i) {
      var l = L();
      m.sheet = m.sheets[i];
      m.sheets.forEach(function (s, j) { if (j !== i) wipeSheet(s); });
      m.sheets = null;
      var chk = safe(function () { return l.suggestMapping(m.sheet); });
      if (!chk) { wipeSheet(m.sheet); m.sheet = null; go('error', T.readFail); return; }
      m.chk = chk;
      m.userMap = Object.assign({}, chk.mapping);
      // W9: a column the module denies on the first read (by header or by its values) stays denied, its select locked
      m.locked = {};
      chk.columns.forEach(function (c) { if (c.status === 'ditolak') m.locked[c.col] = true; });
      m.mapMsg = null;
      m.asOf = todayYmd();
      go('map');
    }
    /**
     * A pick in the "Digunakan untuk" select (W9). Columns denied on the first read are locked (drawMapping), so no
     * pick can take a field away from its column for a column that stays denied. checkMapping scans a column by the
     * kind of its field (an unmapped column as text), so a usable column can still be denied for the field picked
     * (the CIF column as Segmen reads as account numbers): that pick is undone, the field stays on its previous
     * column and one line says so. "Tidak digunakan" is always taken.
     */
    function remap(col, field) {
      var l = L(), next = {};
      if (m.locked && m.locked[col]) return;
      Object.keys(m.userMap).forEach(function (f) { if (m.userMap[f] !== col && f !== field) next[f] = m.userMap[f]; });
      if (field) next[field] = col;
      var chk = l.checkMapping(m.sheet, next);
      var got = field ? chk.columns.filter(function (c) { return c.col === col; })[0] : null;
      if (field && (!got || got.status !== 'dipakai')) {
        var was = m.chk.columns.filter(function (c) { return c.col === col; })[0] || got || { header: '' };
        m.mapMsg = [fill(T.mapRefused, { kolom: was.header, data: FIELD_NAMES[field] || field }), got && got.why, T.mapKept]
          .filter(Boolean).join(' ');
      } else {
        m.userMap = next;
        m.chk = chk;
        m.mapMsg = null;
      }
      draw();
      var back = m.sels && m.sels[col];
      if (back && typeof back.focus === 'function') back.focus();
    }
    function drawMapping(card) {
      var l = L(), chk = m.chk, fields = l.FIELDS || Object.keys(FIELD_NAMES);
      var tbody = h('tbody');
      m.sels = {};
      chk.columns.forEach(function (c) {
        // locked: a header that names personal data, a file without a header row, or a column denied on the first read
        var locked = chk.headerless || !!(m.locked && m.locked[c.col]) || !!safe(function () { return l.headerDenied(c.header); });
        var sel = h('select', { cls: 'select lu-select', attrs: { 'aria-label': T.colUse + ' · ' + c.header } });
        sel.appendChild(h('option', { attrs: { value: '' }, text: T.notUsed }));
        fields.forEach(function (f) { sel.appendChild(h('option', { attrs: { value: f }, text: FIELD_NAMES[f] || f })); });
        sel.value = c.field || '';
        if (locked) sel.disabled = true;
        else m.sels[c.col] = sel;
        sel.addEventListener('change', function () { if (!sel.disabled) remap(c.col, sel.value || null); });
        tbody.appendChild(h('tr', { cls: 'is-' + c.status }, [
          h('th', { attrs: { scope: 'row' }, text: c.header }),
          h('td', null, [sel]),
          h('td', { cls: 'lu-st', text: STATUS_WORDS[c.status] || c.status }),
          h('td', { cls: 'lu-why', text: c.why || '' })
        ]));
      });
      card.appendChild(h('div', { cls: 'tbl-wrap lu-map' }, [h('table', { cls: 'tbl lu-tbl' }, [
        h('thead', null, [h('tr', null, [T.colFile, T.colUse, T.colStatus, T.colWhy].map(function (t) { return h('th', { attrs: { scope: 'col' }, text: t }); }))]),
        tbody
      ])]));
      if (m.mapMsg) card.appendChild(h('p', { cls: 'lu-note lu-warn', attrs: { role: 'alert' }, text: m.mapMsg }));
      if (chk.headerless) card.appendChild(line(T.headerless, 'lu-err'));
      else if (!chk.ok) card.appendChild(line(T.cifMissing, 'lu-err'));
      var date = h('input', { cls: 'input lu-date', attrs: { type: 'date', id: 'lu-asof', required: true, max: todayYmd(), autocomplete: 'off', 'aria-describedby': 'lu-asof-e' } });
      date.value = m.asOf;
      var dErr = h('p', { cls: 'lu-err', attrs: { id: 'lu-asof-e', role: 'alert' }, text: asOfError(m.asOf) || '' });
      dErr.hidden = !asOfError(m.asOf);
      var go2 = btn(T.doImport, 'btn--primary', function () { if (!go2.disabled) runImport(); });
      function sync() {
        var e = asOfError(m.asOf);
        dErr.textContent = e || ''; dErr.hidden = !e;
        go2.disabled = !!e || !chk.ok || !!chk.headerless;
      }
      date.addEventListener('input', function () { m.asOf = String(date.value == null ? '' : date.value); sync(); });
      date.addEventListener('change', function () { m.asOf = String(date.value == null ? '' : date.value); sync(); });
      card.appendChild(h('div', { cls: 'field lu-field' }, [h('label', { cls: 'field__label', attrs: { for: 'lu-asof' }, text: T.asOf }), date, dErr]));
      card.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.cancel, 'btn--ghost', function () { reset('file'); go('file'); }), go2]));
      sync();
    }
    function runImport() {
      var l = L(), run = { cancelled: false };
      m.run = run;
      var c = cancellableCrypto(run), sheet = m.sheet, k = l.settings().k;
      go('run');
      var opts = { mapping: m.userMap, file: m.file, asOf: m.asOf, onProgress: function (pg) {
        if (m.run !== run || !m.progressEl || !pg) return;
        m.progressEl.textContent = isNum(pg.total) && pg.total >= k ? fill(T.progress, { x: fmtInt(pg.done), n: fmtInt(pg.total) }) : T.progressStart;
      } };
      if (c) opts.crypto = c;
      l.importSheet(sheet, opts).then(function (res) {
        wipeSheet(sheet);
        if (m.run !== run || run.cancelled) { dropResult(res); if (m.run === run) { m.run = null; m.sheet = null; go('file', T.cancelled); } return; }
        m.run = null; m.sheet = null; m.result = res;
        go('report');
      }, function (e) {
        wipeSheet(sheet);
        if (m.run !== run) return;
        m.run = null; m.sheet = null;
        if (run.cancelled || (e && e.code === 'BATAL')) go('file', T.cancelled);
        else go('error', e && e.name === 'LeadsError' ? e.message : T.readFail);
      });
    }
    function drawReport(card) {
      var res = m.result, rep = res.report, k = L().settings().k;
      var count = function (n) { return n > 0 && n < k ? '<' + k : fmtInt(n); };
      if (rep.fatal) {
        card.appendChild(line(rep.notes[0] || T.readFail, 'lu-err'));
        card.appendChild(line(T.fileGone));
        card.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.pickAgain, 'btn--secondary', function () { dropResult(m.result); m.result = null; go('file'); })]));
        return;
      }
      card.appendChild(h('p', { cls: 'lu-note is-strong', text: fill(T.rep1, { n: fmtInt(rep.totalRows), m: count(res.records.length), g: fmtInt(rep.merged) }) }));
      card.appendChild(line(fill(T.rep2, { d: fmtInt(rep.denied.length), i: fmtInt(rep.ignored.length) })));
      var det = h('details', { cls: 'lu-fold' }, [h('summary', { text: T.repCols })]);
      var ul = h('ul', { cls: 'lu-cols' });
      rep.columns.forEach(function (c) {
        ul.appendChild(h('li', null, [h('b', { text: c.header }), ' · ' + (STATUS_WORDS[c.status] || c.status) + (c.why ? ' · ' + c.why : '')]));
      });
      det.appendChild(ul);
      card.appendChild(det);
      (rep.notes || []).forEach(function (n) { if (!/^\d[\d.]* (kolom|baris)/.test(n)) card.appendChild(line(n)); });
      if (!rep.used.some(function (c) { return c.field === 'kolektibilitas'; })) {
        card.appendChild(h('div', { cls: 'lu-banner' }, [line(T.noKol1, 'is-strong'), line(T.noKol2)]));
      }
      if (retention(rep.asOf).notice) card.appendChild(line(T.old45, 'lu-warn'));
      if (rep.issues.length) {
        var total = 0;
        Object.keys(rep.codes || {}).forEach(function (c) { total += rep.codes[c]; });
        if (total < rep.issues.length) total = rep.issues.length;
        var iss = h('ul', { cls: 'lu-issues' });
        rep.issues.slice(0, ISSUES_SHOWN).forEach(function (x) {
          iss.appendChild(h('li', { text: fill(T.issue, { r: fmtInt(x.row), field: FIELD_NAMES[x.field] || x.field || '—', reason: x.reason }) }));
        });
        if (total > ISSUES_SHOWN) iss.appendChild(h('li', { text: fill(T.issueMore, { k: fmtInt(total - ISSUES_SHOWN) }) }));
        card.appendChild(iss);
      }
      card.appendChild(line(T.fileGone));
      var f = initialsField(m.msg);
      var useB = btn(T.use, 'btn--primary', function () {
        var who = takeActor(f);
        if (!who) return;
        var l = L(), r = m.result;
        try { l.apply(r); } catch (e) { f.error(e && e.message ? e.message : T.readFail); return; }
        var n = r.records.length;
        plog('leads-import', { fp: r.file && r.file.fp, m: n >= k ? n : '<' + k, asOf: r.report.asOf });
        S.cuts = r.report.cuts || null;
        S.session.stale = false;
        // row numbers belong to the file they came from: a new list keeps the rule and grouping, not the row list
        if (S.memory) S.memory = { rule: S.memory.rule, by: S.memory.by, where: null, pages: 1 };
        dropResult(r);
        m.result = null; m.msg = null;
        go('done');
        emit('import');
      });
      card.appendChild(f.el);
      card.appendChild(h('div', { cls: 'lu-actions' }, [btn(T.cancel, 'btn--ghost', function () { dropResult(m.result); m.result = null; go('file'); }), useB]));
    }
    m.update = function (reason) {
      if (reason === 'on' || reason === 'off' || reason === 'lock' || reason === 'demo' || reason === 'policy' || reason === 'mount') {
        if (reason === 'off' || reason === 'lock') { reset('gate'); m.gatePassed = false; }
        if (m.st === 'gate' || m.st === 'file' || m.st === 'done' || m.st === 'error' || reason !== 'policy') draw();
      }
    };
    m.lock = function () { reset('gate'); m.gatePassed = false; };
    m.destroy = function () {
      var i = S.mounts.indexOf(m);
      if (i >= 0) S.mounts.splice(i, 1);
      reset('gate');
      clear(container);
    };
    S.mounts.push(m);
    draw();
    return { destroy: m.destroy };
  }

  /* ============================================================ vault seams */

  /**
   * vaultLoad(payloadLeads, {list, asOf}) → Promise<{on, keep, expired}>. app.js calls it at sign-in BEFORE applyVault
   * (§8.3). list: the copy holds a 'leads' dataset; asOf: its data date. keep false: leave that dataset out of
   * applyVault and out of the next save (D29), recorded in the Riwayat.
   */
  function vaultLoad(obj, opts) {
    ensureWired();
    opts = opts || {};
    var l = L();
    S.session = freshSession(); S.dirty = false; S.offPending = false; S.expired = null; S.cuts = null; S.memory = null;
    if (!l || !obj || obj.on !== true || !obj.key) { emit('vault'); return Promise.resolve({ on: false, keep: false, expired: false }); }
    var bytes = unb64(obj.key);
    if (!bytes || bytes.length < 16) { emit('vault'); return Promise.resolve({ on: false, keep: false, expired: false }); }
    return l.setKey(bytes).then(function () {
      for (var i = 0; i < bytes.length; i++) bytes[i] = 0;
      l.setEnabled(true);
      feedPolicy();
      S.session = { on: true, keyB64: String(obj.key), onSince: typeof obj.onSince === 'string' ? obj.onSince : null,
        onBy: typeof obj.onBy === 'string' && initialsOk(obj.onBy) ? obj.onBy.toUpperCase() : null, stale: obj.stale === true };
      var exp = opts.list === true && retention(opts.asOf).expired;
      if (exp) {
        S.expired = { asOf: parseYmd(opts.asOf) == null ? null : String(opts.asOf) };
        S.dirty = true;
        plog('leads-expired', { asOf: S.expired.asOf });
      }
      emit('vault');
      return { on: true, keep: opts.list === true && !exp, expired: exp };
    }, function () {
      emit('vault');
      return { on: false, keep: false, expired: false };
    });
  }
  /** vaultExport() → payload.leads for the next "Simpan salinan terenkripsi". */
  function vaultExport() {
    var l = L();
    var isOn = !!(l && safe(function () { return l.enabled() && l.hasKey(); }));
    if (!isOn || !S.session.on || !S.session.keyB64) return { v: 1, on: false };
    var o = { v: 1, on: true, key: S.session.keyB64, onSince: S.session.onSince, onBy: S.session.onBy };
    if (stale()) o.stale = true;
    return o;
  }
  function dirty() { return S.dirty; }
  function markSaved() { S.dirty = false; S.offPending = false; S.expired = null; emit('saved'); }

  /* ================================================================ wiring */

  function onLock() {
    close('lock');
    S.memory = null; S.session = freshSession(); S.dirty = false; S.offPending = false; S.expired = null; S.cuts = null;
    S.cache = { sig: null, val: null };
    S.mounts.slice().forEach(function (m) { safe(function () { m.lock(); }); });
    emit('lock');
  }
  function onPolicy(ev) {
    var keys = (ev && Array.isArray(ev.keys)) ? ev.keys : [];
    var lead = keys.filter(function (k) { return /^leads\./.test(String(k)); });
    if (!lead.length) return;
    var l = L();
    if (l && safe(function () { return l.enabled(); })) feedPolicy();
    if (ev.source !== 'vault' && records().length && lead.some(function (k) { return has(CUT_KEYS, k); })) S.session.stale = true;
    emit('policy');
  }
  /** Listeners on the document, the window, MCD.state and MCD.policy; each attached once, whenever it exists. */
  function ensureWired() {
    var d = doc(), St = M().state, p = P();
    if (!S.wired.doc && d && typeof d.addEventListener === 'function') {
      S.wired.doc = true;
      d.addEventListener('mcd:gate-locking', onLock);
      d.addEventListener('visibilitychange', function () { if (S.panel && pageHidden()) cover(); });
    }
    if (!S.wired.win && root && typeof root.addEventListener === 'function') {
      S.wired.win = true;
      root.addEventListener('resize', function () { if (S.panel && !wide()) close('width'); });
    }
    if (!S.wired.state && St && typeof St.on === 'function') {
      S.wired.state = true;
      St.on('change', function (e) {
        var keys = (e && e.keys) || [];
        if (keys.indexOf('section') >= 0 && S.panel) close('section');
        if (keys.indexOf('privacy.veil') >= 0) {
          var v = !!(e.state && e.state.privacy && e.state.privacy.veil);
          if (v) { if (S.panel) close('veil'); else S.memory = null; }
          emit('veil');
        }
      });
      St.on('demo', function (e) { if (e && e.on && S.panel) close('demo'); emit('demo'); });
      St.on('data', function (e) { var t = (e && e.types) || []; if (t.indexOf('leads') >= 0) emit('data'); });
    }
    if (p && S.wired.policy !== p && typeof p.on === 'function') {
      S.wired.policy = p;
      safe(function () { p.on(onPolicy); });
    }
  }

  var api = {
    VERSION: 1,
    LABELS: LABELS,
    RULE_TITLES: RULE_TITLES,
    IDLE_MS: IDLE_MS, NOTICE_DAYS: NOTICE_DAYS, EXPIRE_DAYS: EXPIRE_DAYS,
    available: available,
    open: open, close: close, isOpen: isOpen,
    railLine: railLine, chip: chip,
    importFlow: importFlow, settingsCard: settingsCard,
    on: on, retention: retention,
    vaultLoad: vaultLoad, vaultExport: vaultExport, dirty: dirty, markSaved: markSaved,
    _now: null,
    _wire: function () { safe(ensureWired); }
  };
  return api;
});
