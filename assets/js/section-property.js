/* ==========================================================================
 * MCD.sections.property — section 4 "KPR" (key 4)
 * Spec: docs/BUILD_SPEC_PROPERTY_LEADERBOARD.md §3–§9, §14–§16, overridden by
 * docs/COPY_STYLE_EN.md (English, product decisions 1–18),
 * docs/DESIGN_DIRECTION_V2.md (exhibits, action titles, source lines) and
 * docs/INTEGRATION_NOTES.md (shell v3 contracts).
 *
 * Overview  The guide column holds a three-input calculator ("Take-home pay",
 *           "Years to repay", "Down payment"), one big answer ("You can
 *           afford a house up to Rp …", MCD.charts.bigNumber), the matching
 *           projects as a status bar in words (MCD.charts.statusBar), a
 *           distance filter, the nearest projects that fit and one primary
 *           button into Deep dive.
 * Deep dive Left rail: the full affordability simulator (personas, income,
 *           DSR, age and rank, tenor, DP, scheme, floating, stress, basis,
 *           FLPP, cash limit). Right rail: Projects · Areas. KPI strip (6).
 *           KPR calculator sheet: forward and reverse, amortisation combo
 *           chart, total-cost donut, instalment heatmap (tenor × rate),
 *           tenor comparison, stress test, rate schemes (ended ones greyed),
 *           upfront costs (BPHTB, PPN DTP), print, CSV, copy.
 * Colours   One code everywhere (COPY_STYLE_EN item 11): green Affordable,
 *           amber Stretch (up to 15% above the budget), red Out of reach,
 *           grey cannot assess, neutral blue before a take-home pay is
 *           entered. Read from the --status-* tokens, legends in words.
 * Data      Public, sourced: data/property-projects.js (150 projects),
 *           data/property-market.js (60 areas), data/kpr-config.js (rate
 *           tables). No bank data: the Demo data switch changes nothing here.
 * Maths     assets/js/kpr-math.js only (pure; tests/kpr-math.test.mjs).
 * Map       MCD.map.registerLayers / registerLegend / registerPosture /
 *           registerSelectable with key 'property'. Flat dots, north-up, rings
 *           5–30 km (no 3D: docs/COPY_STYLE_EN.md item 10). Zones (item 30):
 *           MCD.map.setZones({mode: 'radius', km: 30}) on mount, back to
 *           {mode: 'kecamatan15'} on unmount (feature-detected).
 * Distance  v3 (items 27-28): every project shows "x,x km · ± y menit" from
 *           KCP Jakarta Cilangkap via MCD.distance (lists, map tooltip, drawer,
 *           search, CSV), "perkiraan" beyond the road grid, sort "Terdekat dari
 *           KCP", the shared "Jam sibuk" / "Motor (tanpa tol)" switches. Without
 *           MCD.distance: straight-line km from Mabes TNI, as before.
 * Focus     onAction('focus:project:<id>') (MCD.app.focus): fly to zoom 16 and
 *           open the project's detail.
 * v4        Items 36, 38; V3_REPORT §4.7: "Rute di Google Maps" right under
 *           "Jarak dari KCP" in the project drawer (MCD.distance.directionsUrl,
 *           coordinates only, new tab on a click). Route lines and the
 *           kecamatan focus mode are map.js's: projects are selected as
 *           {kind: 'project', id}; a kecamatan-level area as {kind: 'area', id,
 *           extra: {kecamatanId}} plus MCD.map.focusArea (an area is not a
 *           kecamatan kind in map.js). Motion through MCD.motion: drawer blocks
 *           and list rows 35 ms apart, the pinned price counts up once (CSS
 *           .pp-stg without it). The km bands say "Jarak garis lurus dari Mabes
 *           TNI"; the rows keep the road distance from KCP.
 * Wording   The monthly payment is "angsuran" everywhere (never "cicilan").
 * v5        Item 43 (concept C "Kartu bertahap"; docs/LAYOUT_V5C_SPEC.md §7.4, §9, §10.4): the project and area
 *           drawer models carry kind, key, brief (callout: Harga mulai, Dari KCP and the affordability chip; an
 *           area: median rumah seken and the change per year, main action "Lihat proyek di area ini") and anchor.
 *           workspace() hands the simulator rail and the "Proyek dan area" panel (tabs Proyek | Area) to
 *           MCD.windows; the KPI strip gives way to summary() (Plafond maksimal · Proyek terjangkau · Tenor).
 *           cardFor(sel) rebuilds pinned cards. The calculator stays its own full sheet: MCD.windows.suspend(true)
 *           while it is open. Area circles are neutral (one grey fill) and sized by the chosen measure.
 *           Everything MCD.windows is feature-detected; the older drawer ignores the new fields.
 * Privacy   Income, instalments, cash and birth month live in memory only;
 *           nothing is written to storage or the URL hash.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var ID = 'property';
  var W = window;
  var DOC = document;

  /* ================================================================ constants */

  var CENTER = [106.91329, -6.32818];                 // Mabes TNI centroid (property D1)
  var BANDS = [
    { id: '0-5', label: '0–5 km', hi: 5 }, { id: '5-10', label: '5–10 km', hi: 10 }, { id: '10-15', label: '10–15 km', hi: 15 },
    { id: '15-20', label: '15–20 km', hi: 20 }, { id: '20-30', label: '20–30 km', hi: 30 }
  ];
  /* the km bands and the "within" filter measure a straight line from Mabes TNI; rows show the road distance from KCP */
  var BAND_LABEL = 'Jarak garis lurus dari Mabes TNI';
  var WITHIN = [{ v: 0, label: 'Semua' }, { v: 5, label: '5 km' }, { v: 10, label: '10 km' }, { v: 15, label: '15 km' }, { v: 20, label: '20 km' }, { v: 30, label: '30 km' }];
  /* KPR opens at 5 km (21 Oct 2026): the default "within" filter; "Hapus filter" comes back to it, and it is not counted
     as a filter. The slim rail's "Cakupan" offers 5 / 15 / 30 km on the same filter. */
  var WITHIN_DEFAULT = 5;
  var SCOPES = [5, 15, 30];
  function bandsWithin(km) { return km ? BANDS.filter(function (x) { return x.hi <= km; }).map(function (x) { return x.id; }) : []; }
  // https://www.bankmandiri.co.id/top-developer partner list ∩ developerGroup in the data (51 projects)
  var TOP_DEV = ['Sinar Mas Land', 'Summarecon', 'Ciputra', 'Lippo', 'Metland', 'Alam Sutera', 'Agung Podomoro'];
  // Planned government scheme: what-if only, its rules are simulation assumptions (§5.4)
  var PLANNED = {
    id: 'plan-6pct', tier: 'Planned', name: 'Rencana KPR subsidi 6% (belum berlaku)', fixedRate: 6, fixedYears: 40, floatingRate: 6,
    minTenorYears: 1, maxTenorYears: 30, incomeCapIdr: 17000000, maxPriceIdr: 500000000, validUntil: null, expired: false,
    source: 'https://www.cnnindonesia.com/ekonomi/20260930193829-532-1410168/pemerintah-siapkan-kpr-subsidi-bunga-6-buat-pekerja-bergaji-rp17-juta'
  };
  var REGIONS = ['DKI Jakarta', 'Kota Bekasi', 'Kab. Bekasi', 'Kota Depok', 'Kab. Bogor', 'Kota Bogor', 'Kota Tangerang Selatan', 'Kota Tangerang'];
  var DP_OPTS = [0, 5, 10, 20, 30];
  var LB_BANDS = [['lb_le60', 'Sampai 60 m²'], ['lb_61_90', '61–90 m²'], ['lb_91_150', '91–150 m²'], ['lb_151_250', '151–250 m²'], ['lb_ge251', '251 m² ke atas']];
  var TIER_ORDER = ['Gold', 'Silver', 'Bronze', 'Top Developer', 'Take Over', 'Subsidi', 'Planned', 'Reference', 'Ended'];
  var TIER_LABEL = { Gold: 'Gold', Silver: 'Silver', Bronze: 'Bronze', 'Top Developer': 'Top Developer', 'Take Over': 'Take over / top-up',
    Subsidi: 'Subsidi (FLPP)', Planned: 'Rencana (belum berlaku)', Reference: 'Hanya acuan', Ended: 'Telah berakhir' };

  var SEG = { subsidi: 'Subsidi (FLPP)', menengah: 'Di bawah Rp 1 M', 'menengah-atas': 'Rp 1–3 M', premium: 'Rp 3 M ke atas' };
  var SEG_ORDER = ['subsidi', 'menengah', 'menengah-atas', 'premium'];
  var TYPE = { landed: 'Rumah tapak', townhouse: 'Townhouse', apartment: 'Apartemen' };
  var TYPE_GLYPH = { landed: 'circle', townhouse: 'hexagon', apartment: 'square' };
  var STATUS = { selling: 'Dijual', launching: 'Baru diluncurkan', 'sold-out-unknown': 'Ketersediaan belum jelas' };
  var CONF = { high: 'Lokasi tepat', medium: 'Lokasi cukup tepat', low: 'Lokasi perkiraan' };
  var CONF_RANK = { low: 0, medium: 1, high: 2 };
  // Affordability classes in the shared status colours (tone → --status-* token, MCD.charts status word)
  var CLS = {
    A: { label: 'Terjangkau', plain: 'Sesuai anggaran', tag: 'Terjangkau', tone: 'ok', word: 'acquired', legend: 'Terjangkau (sesuai anggaran)' },
    S: { label: 'Hampir', plain: 'Hingga 15% di atas anggaran', tag: 'Hampir', tone: 'mid', word: 'partly', legend: 'Hampir (hingga 15% di atas)' },
    O: { label: 'Tidak terjangkau', plain: 'Lebih dari 15% di atas anggaran', tag: 'Tidak terjangkau', tone: 'bad', word: 'notYet', legend: 'Tidak terjangkau (lebih dari 15% di atas)' },
    NA: { label: 'Belum dapat dinilai', plain: 'Belum dapat dinilai', tag: 'Belum dapat dinilai', tone: 'none', word: 'noData', legend: 'Belum dapat dinilai' }
  };
  var WORD_CLS = { acquired: 'A', partly: 'S', notYet: 'O', noData: 'NA' };
  var SB_LABELS = { acquired: 'Terjangkau', partly: 'Hampir (hingga 15% di atas)', notYet: 'Tidak terjangkau', noData: 'Belum dapat dinilai', potential: 'Proyek baru (isi penghasilan bersih untuk memeriksa)' };
  var STRETCH = 15;                                    // % above a limit that still counts as "stretch" (amber)
  var PERSONA_SHORT = { 'tamtama-jr': 'Kelasi', 'tamtama-sr': 'Kopka', 'bintara-jr': 'Serda/Sertu', 'bintara-sr': 'Serma/Peltu',
    'pama-jr': 'Letda/Lettu', 'pama-sr': 'Kapten/Mayor', pamen: 'Letkol/Kolonel', 'pns-iii': 'PNS III' };
  var RANKS = [
    { id: 'tamtama', label: 'Tamtama' }, { id: 'bintara', label: 'Bintara' }, { id: 'perwira', label: 'Perwira (sampai Kolonel)' },
    { id: 'pati1', label: 'Pati ★1' }, { id: 'pati2', label: 'Pati ★2' }, { id: 'pati3', label: 'Pati ★3' }, { id: 'pati4', label: 'Pati ★4' },
    { id: 'pns', label: 'PNS' }, { id: 'employee', label: 'Karyawan umum' }, { id: 'professional', label: 'Profesional atau wiraswasta' }
  ];
  // The five delivery-risk notes, translated from the data file's Indonesian source notes
  var RISK_EN = {
    'pp-lrt-city-ciracas-urban-signature': 'Risiko serah terima: proyek LRT City sempat terhenti (Jul 2026).\nPekerjaan di Ciracas berlanjut sejak 1 Okt 2026, target selesai 2028.\nPeriksa kelayakan proyek sebelum KPR inden.',
    'pp-lrt-city-jatibening-gateway-park': 'Dua tower telah diserahterimakan. Grup LRT City sedang restrukturisasi (2026).\nPeriksa status unit dan PPJB.',
    'pp-adhi-city-sentul': 'Salah satu proyek yang pembangunannya berlanjut pada 1 Okt 2026 setelah terhenti.',
    'pp-royal-sentul-park': 'Proyek grup ADCP: periksa progres pembangunan dan status serah terima (masalah likuiditas pada 2026).',
    'pp-meikarta-rusun-subsidi-flpp-apartemen': 'Pematangan lahan proyek apartemen subsidi baru dimulai Jan 2026. Periksa progres sebelum akad.'
  };
  var DISCLAIMER_EN = 'Simulasi indikatif.\nPersetujuan, bunga, tenor, plafond dan biaya akhir mengikuti analisis bank, SP3K dan sistem bank.\nPromo dapat berubah sewaktu-waktu.';
  /** The same text on one line, for CSV comment lines, the clipboard and source lines. */
  function flat(s) { return String(s || '').replace(/\s*\n\s*/g, ' '); }
  var COPY = {
    category: 'Bank menetapkan kategori Gold, Silver atau Bronze menurut profil nasabah atau proyek. Kriterianya tidak dipublikasikan.',
    age: 'Untuk prajurit TNI, jatuh tempo kredit dibatasi usia pensiun (BUP) sesuai UU 3/2025.\nKebijakan kredit bank dapat menetapkan batas usia 55. Konfirmasikan dengan unit kredit.',
    flpp: 'KPR FLPP hanya untuk masyarakat berpenghasilan rendah (MBR).\nSyaratnya belum memiliki rumah dan belum pernah menerima subsidi perumahan.\nBatas penghasilan Jabodetabek Rp12 juta (lajang) dan Rp14 juta (menikah).\nBatas harga rumah tapak Rp185 juta.',
    topdev: 'Kelayakan Top Developer dinilai per grup developer. Konfirmasikan proyeknya dengan bank.',
    prices: 'Harga proyek bersifat indikatif. Periksa dengan developer sebelum disampaikan kepada nasabah.',
    planned: 'Skema rencana pemerintah ini belum memiliki aturan teknis. Tenor dan masa fixed merupakan asumsi simulasi.',
    persona: 'Penghasilan bersih contoh profil hanya perkiraan. Belum termasuk potongan koperasi, TWP dan potongan satuan lain.',
    coverage: 'Hanya proyek pasar primer. Rumah seken tidak ditampilkan satu per satu. Harga pasar ada di tab Area.',
    units: 'Nilai 0 belum tentu berarti proyek telah habis terjual.',
    partnerUnknown: 'Status kerja sama belum diketahui (belum tentu tidak ada kerja sama)',
    fees: 'Sebagian biaya dapat dipotong dari pencairan. Konfirmasikan dengan bank.',
    flppExample: 'Contoh di situs Mandiri: Rp1.195.173 (selisih ±0,5%). Angka sistem bank yang berlaku.'
  };
  var SRC_PROJECTS = 'SiKumbang (Kementerian PKP / BP Tapera), situs developer, berita 2025–2026';

  /* ================================================================== helpers */

  function U() { return MCD.util; }
  function F() { return MCD.util.fmt; }
  function KM() { return MCD.kprMath; }
  function KC() { return W.MCD_KPR_CONFIG || null; }
  function h() { return U().el.apply(null, arguments); }
  function icon(name, cls) { return U().icon(name, cls); }
  function clear(n) { return U().clear(n); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function rp(v) { return isNum(v) ? F().rp(v) : '—'; }
  function rpFull(v) { return isNum(v) ? F().rp(KM().dispRp(v), { full: true }) : '—'; }
  function rpRow(v) { return isNum(v) ? F().rp(Math.round(v), { full: true }) : '—'; }
  function rpLimit(v) { return isNum(v) ? F().rp(KM().floor1000(v), { full: true }) : '—'; }
  function ratePct(p) { return isNum(p) ? F().num(p, 2) + '%' : '—'; }
  /** "13%" for whole rates, "12.25%" otherwise (chart headers). */
  function rateShort(p) { return isNum(p) ? (Math.abs(p - Math.round(p)) < 1e-9 ? F().num(p, 0) : F().num(p, 2)) + '%' : '—'; }
  function yrs(n) { return n === 1 ? '1 th' : n + ' th'; }
  function years(n) { return n === 1 ? '1 tahun' : n + ' tahun'; }
  function priv() { return ctx ? ctx.privacy() : 'masked'; }
  function veil() { return priv() === 'veil'; }
  function reduced() { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function safe(fn) { try { return fn(); } catch (e) { if (W.console) W.console.warn('[property]', e && e.message ? e.message : e); return null; } }
  /* v5 workspace (item 43): MCD.windows belongs to the SHELL lane and may be missing; every use is feature-detected */
  function WS() { var W0 = MCD.windows; return W0 && typeof W0 === 'object' ? W0 : null; }
  /** "Proyek dan area" is the shell's bottom drawer: the shell marks it .ws-drawer. */
  function adopted() { var el = refs && refs.rr; return !!(el && el.classList && el.classList.contains('ws-drawer')); }
  /** Adopted, the panel drops its slide-over attributes (no edge tab, never hidden as a closed slide-over). */
  function syncAdopted() {
    var el = refs && refs.rr;
    if (!el) return;
    var on = adopted();
    if (on === !!el.__ppAdopted) return;
    el.__ppAdopted = on;
    if (on) { el.removeAttribute('data-slideover'); el.removeAttribute('data-slideover-label'); }
    else { el.setAttribute('data-slideover', ''); el.setAttribute('data-slideover-label', 'Buka daftar & grafik'); }
  }
  /** The calculator is a full sheet over the workspace: callouts close, cards and tray step aside (MCD.windows.suspend). */
  function suspendWs(on) { var W0 = WS(); if (W0 && typeof W0.suspend === 'function') safe(function () { W0.suspend(!!on); }); }
  function asOf() {
    var q = /[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(W.location.search || '');
    if (q) return q[1];
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function nextMonths(n) {
    var a = asOf().split('-').map(Number), out = [];
    for (var i = 1; i <= n; i++) {
      var m = a[1] - 1 + i, y = a[0] + Math.floor(m / 12);
      m = m % 12;
      out.push(y + '-' + String(m + 1).padStart(2, '0'));
    }
    return out;
  }
  function monthLabel(ym) { return F().month(ym, { long: true }); }
  function dateLabel(iso) { return iso ? F().date(iso) : '—'; }
  /** "Rp 4,028,000" → "4.03 mn": compact instalments for chart cells (the unit sits in the subtitle). */
  function mn(v) { return isNum(v) ? F().num(v / 1e6, 2) + ' jt' : '—'; }

  /* ------------------------------------------------- status colours (item 11) */

  var TONE_TOKEN = { ok: '--status-ok', mid: '--status-mid', bad: '--status-bad', none: '--status-none', potential: '--status-potential' };
  var tokCache = { key: null, v: {} };
  function parseRGB(s) {
    s = String(s || '').trim();
    var m = /^#([0-9a-f]{6})$/i.exec(s);
    if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return m[1].split('').map(function (c) { return parseInt(c + c, 16); });
    m = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (m) { var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); if (p.length >= 3) return [p[0], p[1], p[2]]; }
    return null;
  }
  /** A status tone ('ok' | 'mid' | 'bad' | 'none' | 'potential') as [r, g, b] for deck.gl, read from the theme's token. */
  function toneRGB(tone, fallback) {
    var key = DOC.documentElement.getAttribute('data-theme') || '';
    if (tokCache.key !== key) tokCache = { key: key, v: {} };
    var name = TONE_TOKEN[tone] || TONE_TOKEN.none;
    if (!(name in tokCache.v)) {
      var v = '';
      try { v = W.getComputedStyle(DOC.documentElement).getPropertyValue(name); } catch (e) { v = ''; }
      tokCache.v[name] = parseRGB(v);
    }
    return tokCache.v[name] || fallback;
  }
  /** Amount against a limit: within → 'ok', up to STRETCH% above → 'mid', more → 'bad'; no limit → null. */
  function fitTone(amount, limit) {
    if (!isNum(amount) || !(limit > 0)) return null;
    if (amount <= limit) return 'ok';
    return amount <= limit * (100 + STRETCH) / 100 ? 'mid' : 'bad';
  }
  var FIT_WORDS = { ok: 'Dalam batas angsuran', mid: 'Hingga 15% di atas batas', bad: 'Lebih dari 15% di atas batas' };
  /** charts-plus.js factories (combo, donut, heatmap, statusBar, bigNumber) are optional until index.html links them. */
  function plus(name) { return MCD.charts && typeof MCD.charts[name] === 'function' && MCD.charts.status ? MCD.charts[name] : null; }
  /** charts-plus heatmap with per-cell status tones (requested in docs/phase3-requests/property.md). */
  function heatTones() { return !!(MCD.charts && MCD.charts.plus && MCD.charts.plus.features && MCD.charts.plus.features.heatmapStatus); }

  /**
   * "Rp 7,4 jt", "Rp 7.4 mn", "7.400.000", "7,400,000", "7,4" or "450" (= Rp 7,4 jt / Rp 450 jt), "1,2 M", "1.2 bn" → rupiah;
   * null when empty, NaN when unreadable. Reads both the Indonesian (decimal comma) and the older en-GB style.
   */
  function rpNum(b) {
    var lc = b.lastIndexOf(','), ld = b.lastIndexOf('.');
    if (/,\d{1,2}$/.test(b) && ld < lc) return parseFloat(b.replace(/\./g, '').replace(',', '.'));   // 1.250,5 · 7,4
    return parseFloat(b.replace(/,/g, ''));                                                          // 1,250.5 · 7.4
  }
  function parseRp(s) {
    var t = String(s == null ? '' : s).trim().toLowerCase().replace(/^rp\.?\s*/, '').replace(/\s+/g, '');
    if (!t) return null;
    var m = /^([\d.,]+)(mn|jt|juta|million|bn|miliar|billion|m|rb|ribu|k)?$/.exec(t);
    if (!m) return NaN;
    var body = m[1], unit = m[2];
    if (unit) {
      var x = rpNum(body);
      var mult = /^(mn|jt|juta|million)$/.test(unit) ? 1e6 : (/^(bn|miliar|billion|m)$/.test(unit) ? 1e9 : 1e3);
      return isNum(x) ? Math.round(x * mult) : NaN;
    }
    if (/^\d{1,3}([.,]\d{3})+$/.test(body)) return parseInt(body.replace(/[.,]/g, ''), 10);
    var v = rpNum(body);
    if (!isNum(v)) return NaN;
    return v < 1000 && v > 0 ? Math.round(v * 1e6) : Math.round(v);
  }

  /* -------------------------------------------------------- DOM controls */

  var uidN = 0;
  function uid(p) { uidN += 1; return 'pp-' + (p || 'x') + '-' + uidN; }

  /** Segmented control (radiogroup) with roving focus. opts [{v, label, title}] → {el, set(v)} */
  function seg(opts, value, onPick, o) {
    o = o || {};
    var el = h('div', { class: 'seg pp-seg' + (o.big ? ' seg--big' : '') + (o.cls ? ' ' + o.cls : ''), role: 'radiogroup', 'aria-label': o.label || null });
    var btns = opts.map(function (x) {
      var b = h('button', { type: 'button', class: 'seg__opt', role: 'radio', 'aria-checked': 'false', title: x.title || null, text: x.label });
      b.addEventListener('click', function () { if (!b.disabled) onPick(x.v); });
      el.appendChild(b);
      return b;
    });
    el.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(e.key) < 0) return;
      var i = btns.indexOf(DOC.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : (e.key === 'End' ? btns.length - 1 : (i + ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1) + btns.length) % btns.length);
      btns[n].focus();
      btns[n].click();
    });
    var api = {
      el: el, btns: btns,
      set: function (v) {
        var hit = false;
        opts.forEach(function (x, i) {
          var on = x.v === v;
          hit = hit || on;
          btns[i].setAttribute('aria-checked', on ? 'true' : 'false');
          btns[i].tabIndex = on ? 0 : -1;
        });
        if (!hit && btns[0]) btns[0].tabIndex = 0;
      }
    };
    api.set(value);
    return api;
  }

  /**
   * Tenor in years as chips (10 · 15 · 20 · 25 · 30) plus an editable number (UX_FIX_PLAN C-08: 27 → 20 years in
   * one click). o {label, onPick(years)} → {el, set(value, min, max)}. Chips above the maximum are disabled.
   * The number applies while it is typed (or stepped with the arrow keys), once it is a whole number within the
   * allowed range, so "Harga rumah tertinggi" follows the field at once (v3 fix: it used to wait for Enter or
   * blur). Enter and blur clamp an out-of-range number and write the tenor in use back into the field.
   */
  var TENOR_CHIPS = [10, 15, 20, 25, 30];
  var TENOR_LIVE_MS = 250;
  function tenorPicker(o) {
    var id = uid('ten');
    var lo = 1, hi = 30, cur = null, liveT = 0;
    var chips = TENOR_CHIPS.map(function (y) {
      var b = h('button', { type: 'button', class: 'chip pp-tchip', 'aria-pressed': 'false', title: y + ' tahun', text: String(y) });
      b.addEventListener('click', function () { if (!b.disabled) o.onPick(y); });
      return b;
    });
    var inp = h('input', { type: 'number', class: 'input input--num pp-tin', id: id, min: '1', max: '30', step: '1', inputMode: 'numeric', 'aria-label': o.label || 'Tenor dalam tahun' });
    /** The typed whole number of years, or null while the field is empty or holds something else. */
    function typed() { var s = String(inp.value == null ? '' : inp.value).trim(); return /^\d{1,2}$/.test(s) ? parseInt(s, 10) : null; }
    function live() {
      clearTimeout(liveT);
      liveT = setTimeout(function () { var v = typed(); if (v != null && v >= lo && v <= hi && v !== cur) o.onPick(v); }, TENOR_LIVE_MS);
    }
    function commit() {
      clearTimeout(liveT);
      var v = typed();
      if (v == null) { if (cur != null) inp.value = String(cur); return; }
      var t = clamp(v, lo, hi);
      inp.value = String(t);
      if (t !== cur) o.onPick(t);
    }
    inp.addEventListener('input', live);
    inp.addEventListener('change', commit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    var el = h('div', { class: 'pp-tpick', role: 'group', 'aria-label': o.label || 'Tenor dalam tahun' }, h('div', { class: 'pp-tpick__chips' }, chips),
      h('label', { class: 'pp-tpick__own', htmlFor: id }, inp, h('span', { text: 'tahun' })));
    return {
      el: el, input: inp,
      set: function (v, a, b) {
        lo = isNum(a) ? a : 1; hi = isNum(b) ? b : 30; cur = isNum(v) && v > 0 ? v : null;
        chips.forEach(function (c, i) {
          var y = TENOR_CHIPS[i];
          c.setAttribute('aria-pressed', y === v ? 'true' : 'false');
          c.disabled = y > hi || y < lo;
          c.title = c.disabled ? 'Di luar tenor yang tersedia untuk profil ini' : y + ' tahun';
        });
        inp.min = String(lo);
        inp.max = String(hi);
        if (DOC.activeElement !== inp) inp.value = cur != null ? String(cur) : '';
      }
    };
  }

  /* ---------------------------------------------- Google Maps (COPY_STYLE item 22) */
  var GM_BASE = 'https://www.google.com/maps/search/?api=1&query=';
  var GM_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  function gmapsUrl(o) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && typeof G.url === 'function') return G.url(o);
    if (!o) return null;
    if (o.q) return GM_BASE + encodeURIComponent(String(o.q));
    var lat = Number(o.lat), lon = Number(o.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return null;
    return GM_BASE + (Math.round(lat * 1e5) / 1e5) + ',' + (Math.round(lon * 1e5) / 1e5);
  }
  function gmapsLink(o, label) {
    var G = MCD.util && MCD.util.gmaps;
    if (G && typeof G.link === 'function') { var a0 = safe(function () { return G.link(o, { label: label }); }); if (a0) return a0; }
    var url = gmapsUrl(o);
    if (!url) return null;
    return h('a', { class: 'btn btn--secondary gmaps-link', href: url, target: '_blank', rel: 'noopener noreferrer', title: GM_TIP }, icon('external'), h('span', { text: label || 'Buka di Google Maps' }));
  }
  /** The shell renders model.gmaps under the drawer title (A-02); until it does, the link goes on top of the body. */
  function ensureDrawerGmaps(target) {
    if (!gmapsUrl(target)) return;
    var d = DOC.querySelector('#overlay-root .drawer') || DOC.querySelector('.drawer');
    if (!d || d.querySelector('a[href^="https://www.google.com/maps/search/"]')) return;
    var body = d.querySelector('.drawer__body'), a = gmapsLink(target, 'Buka di Google Maps');
    if (body && a) body.insertBefore(h('div', { class: 'pp-dgm' }, a), body.firstChild);
  }

  /* --------------------------------------- route from KCP (COPY_STYLE item 36) */
  var ROUTE_LABEL = 'Rute di Google Maps';
  var ROUTE_TIP = 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.';
  /** Google Maps directions from KCP to (lon, lat): MCD.distance.directionsUrl when the shell has it, else the same
      URL built from MCD.config.branch. Coordinates only (5 decimals), never a project or customer name. */
  function routeUrl(lon, lat) {
    var D = MCD.distance;
    if (D && typeof D.directionsUrl === 'function') { var u = safe(function () { return D.directionsUrl(lon, lat); }); if (u) return String(u); }
    lon = Number(lon); lat = Number(lat);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return null;
    var b = (MCD.config && MCD.config.branch) || {}, bl = isNum(b.lat) ? b.lat : -6.33203, bo = isNum(b.lon) ? b.lon : 106.90989;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + bl.toFixed(5) + ',' + bo.toFixed(5) +
      '&destination=' + lat.toFixed(5) + ',' + lon.toFixed(5) + '&travelmode=driving';
  }
  /** "Rute di Google Maps" beside the distance line: a plain link, opened only by a click (new tab). */
  function routeLink(lon, lat) {
    var url = routeUrl(lon, lat);
    if (!url) return null;
    return h('a', { class: 'pp-route', href: url, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', title: ROUTE_TIP }, icon('external'), h('span', { text: ROUTE_LABEL }));
  }

  /* --------------------------------------------- motion (COPY_STYLE item 38) */
  function motion() { var M = MCD.motion; return M && typeof M === 'object' ? M : null; }
  function reducedMotion() {
    var M = motion();
    if (M && typeof M.reduced === 'function') { var r = safe(function () { return !!M.reduced(); }); if (r != null) return r; }
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  var STAGGER_MS = 35, STAGGER_MAX = 10;
  /** Blocks or rows enter one after another, 35 ms apart (MCD.motion.stagger, else the CSS entrance .pp-stg);
      only the first ten get their own step; nothing moves under reduced motion. */
  function stagger(els) {
    var list = Array.prototype.filter.call(els || [], function (n) { return n && n.nodeType === 1; });
    if (!list.length || reducedMotion()) return list.length;
    var M = motion();
    if (M && typeof M.stagger === 'function') { try { M.stagger(list, { stepMs: STAGGER_MS, max: STAGGER_MAX }); return list.length; } catch (e) { /* CSS below */ } }
    list.forEach(function (n, k) {
      n.classList.remove('pp-stg');
      if (n.style && typeof n.style.setProperty === 'function') n.style.setProperty('--pp-stg-d', Math.min(k, STAGGER_MAX) * STAGGER_MS + 'ms');
      n.classList.add('pp-stg');
    });
    return list.length;
  }
  /** The shell staggers every drawer it opens (app.js openDrawer → MCD.motion.stagger) when motion.js is loaded. */
  function shellStaggersDrawer() { var M = motion(); return !!(M && typeof M.stagger === 'function'); }
  /** A big number counts up once, the first time it shows (MCD.motion.countUp); later values are set at once and
      stop a count still running, so the number on screen is always the current one. */
  function countOnce(el, value, format) {
    if (!el) return;
    var text = format(value), M = motion(), anim = el.__ppCount;
    el.__ppLast = text;
    if (anim) {
      if (anim.stop) safe(anim.stop);
      el.__ppCount = { done: true };
      el.textContent = text;
      if (!anim.stop && !anim.done) setTimeout(function () { if (el.__ppLast != null) el.textContent = el.__ppLast; }, (anim.ms || 500) + 200);
      return;
    }
    if (!isNum(value) || value === 0 || !M || typeof M.countUp !== 'function' || reducedMotion()) { el.textContent = text; if (isNum(value)) el.__ppCount = { done: true }; return; }
    var ms = M.dur && isNum(M.dur.slow) ? M.dur.slow : 500, hd = null;
    try { hd = M.countUp(el, value, { format: format, ms: ms }); } catch (e) { hd = null; }
    var stop = typeof hd === 'function' ? hd : (hd && typeof hd.stop === 'function' ? function () { hd.stop(); } : (hd && typeof hd.cancel === 'function' ? function () { hd.cancel(); } : null));
    el.__ppCount = { stop: stop, ms: ms, done: false };
    setTimeout(function () { if (el.__ppCount && !el.__ppCount.stop) el.__ppCount.done = true; }, ms + 60);
  }

  /** On/off switch. → {el, set(on)} */
  function sw(label, on, onChange, o) {
    o = o || {};
    var b = h('button', { type: 'button', class: 'toggle pp-switch' + (o.cls ? ' ' + o.cls : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', title: o.title || null },
      h('span', { class: 'toggle__track', 'aria-hidden': 'true' }), h('span', { class: 'pp-switch__label', text: label }));
    b.addEventListener('click', function () { on = !(b.getAttribute('aria-checked') === 'true'); b.setAttribute('aria-checked', on ? 'true' : 'false'); onChange(on); });
    return { el: b, set: function (v) { b.setAttribute('aria-checked', v ? 'true' : 'false'); } };
  }

  /** Rupiah text field that groups digits as you type without moving the caret. */
  function moneyField(o) {
    var id = o.id || uid('rp');
    var inp = h('input', { class: 'input input--num pp-money__in', type: 'text', id: id, inputMode: 'decimal', autocomplete: 'off', spellcheck: false,
      placeholder: o.placeholder || '0', 'aria-label': o.aria || null });
    var wrap = h('div', { class: 'pp-money' + (o.big ? ' pp-money--big' : '') }, h('span', { class: 'pp-money__rp', 'aria-hidden': 'true', text: 'Rp' }), inp);
    var masked = false;
    function show(v) { inp.value = masked ? '••• (disamarkan)' : (isNum(v) ? F().int(v) : ''); }
    show(o.value);
    inp.addEventListener('input', function () {
      var raw = inp.value;
      var sep = F().int(1000).replace(/\d/g, '') || '.';      // the thousands separator of the number format in use
      for (var q = 0; q < raw.length; q++) { var ch = raw.charAt(q); if (!/\d/.test(ch) && ch !== sep) return; }   // units or decimals: read on Enter / blur
      var pos = inp.selectionStart || 0, before = raw.slice(0, pos).replace(/\D/g, '').length;
      var digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      var v = digits ? parseInt(digits, 10) : null;
      inp.value = v == null ? '' : F().int(v);
      var i = 0, seen = 0;
      while (i < inp.value.length && seen < before) { if (/\d/.test(inp.value.charAt(i))) seen++; i++; }
      try { inp.setSelectionRange(i, i); } catch (e) { /* not focusable */ }
      o.onChange(v, false);
    });
    function commit() {
      if (masked) return;
      var v = parseRp(inp.value);
      if (isNum(v) || v === null) { show(v); o.onChange(v, true); }
      else inp.setAttribute('aria-invalid', 'true');
    }
    inp.addEventListener('change', commit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    inp.addEventListener('input', function () { inp.removeAttribute('aria-invalid'); });
    return {
      el: wrap, input: inp,
      set: function (v) { if (DOC.activeElement !== inp) show(v); },
      mask: function (on, v) { masked = !!on; inp.readOnly = masked; show(v); }
    };
  }

  /** Labelled field wrapper. */
  function field(label, control, o) {
    o = o || {};
    var lab = h('label', { class: 'pp-field__label', htmlFor: o.forId || null, id: o.labelId || null }, label,
      o.sub ? h('span', { class: 'pp-field__sub', text: ' ' + o.sub }) : null);
    return h('div', { class: 'pp-field' + (o.cls ? ' ' + o.cls : '') }, lab, control, o.hint || null);
  }
  function hint(text, cls) { return h('p', { class: 'pp-hint' + (cls ? ' ' + cls : ''), text: text || '' }); }
  function tagEl(text, kind) { return h('span', { class: 'tag pp-tag' + (kind ? ' pp-tag--' + kind : ''), text: text }); }
  function assumptionTag(text) { return h('span', { class: 'tag tag--asumsi pp-tag', title: 'Asumsi yang dapat diubah', text: text || 'asumsi' }); }
  /** Small disclosure: "About this" notes that open in place (no hover-only content). */
  function note(summary, paras) {
    return h('details', { class: 'pp-note' }, h('summary', { class: 'pp-note__s' }, icon('info', 'icon--12'), h('span', { text: summary })),
      h('div', { class: 'pp-note__b' }, (paras || []).filter(Boolean).map(function (p) { return h('p', { text: p }); })));
  }
  function selectEl(opts, value, onChange, label, cls) {
    var s = h('select', { class: 'select pp-select' + (cls ? ' ' + cls : ''), 'aria-label': label || null });
    function fill(list) {
      clear(s);
      list.forEach(function (o) {
        if (o.group) {
          var g = h('optgroup', { label: o.group });
          o.items.forEach(function (x) { g.appendChild(h('option', { value: x.v, text: x.label, disabled: !!x.disabled })); });
          s.appendChild(g);
        } else s.appendChild(h('option', { value: o.v, text: o.label, disabled: !!o.disabled }));
      });
    }
    fill(opts);
    s.value = value == null ? '' : String(value);
    s.addEventListener('change', function () { onChange(s.value); });
    return { el: s, set: function (v) { s.value = v == null ? '' : String(v); }, fill: function (list, v) { fill(list); s.value = v == null ? '' : String(v); } };
  }
  /**
   * Class bar: A · S · O · NA segments with counts (clicks set the class filter). The widths come from flex-grow and
   * change at once (no layout animation); when the counts change, each segment glides from its old box to the new one
   * with a FLIP: measured once per update, then transform only (translateX + scaleX from the left edge), --dur-slow,
   * ease-out (item 38). A class that appears grows from its left edge, one that empties goes at once. The first fill,
   * an unchanged count and reduced motion never move.
   */
  function classBar(onPick) {
    var el = h('div', { class: 'pp-cbar', role: 'group', 'aria-label': 'Proyek menurut keterjangkauan' });
    var segs = {};
    ['A', 'S', 'O', 'NA', 'P'].forEach(function (k) {
      var b = h('button', { type: 'button', class: 'pp-cbar__seg is-' + k.toLowerCase(), title: k === 'P' ? SB_LABELS.potential : CLS[k].legend });
      if (onPick && k !== 'P') b.addEventListener('click', function () { onPick(k); });
      else b.tabIndex = -1;
      b.addEventListener('mouseenter', function () { setHoverCls(k); });
      b.addEventListener('mouseleave', function () { setHoverCls(null); });
      segs[k] = b;
      el.appendChild(b);
    });
    var sig = null;
    /** Boxes of the visible segments in px from the bar's left edge, as on screen (a running glide included). */
    function boxes() {
      var x0 = el.getBoundingClientRect().left, out = {}, any = false;
      Object.keys(segs).forEach(function (k) {
        if (segs[k].hidden) return;
        var r = segs[k].getBoundingClientRect();
        if (r.width > 0) { out[k] = { l: r.left - x0, w: r.width }; any = true; }
      });
      return any ? out : null;
    }
    function glide(first) {
      var M = motion(), ms = M && M.dur && isNum(M.dur.slow) ? M.dur.slow : 500;
      var ease = M && M.ease && M.ease.out ? M.ease.out : 'cubic-bezier(.22,1,.36,1)';
      var x0 = el.getBoundingClientRect().left;
      Object.keys(segs).forEach(function (k) {
        var s = segs[k];
        if (s.hidden) return;
        var r = s.getBoundingClientRect(), f = first[k], from;
        if (!(r.width > 0)) return;
        if (f) {
          var dx = f.l - (r.left - x0), sx = f.w / r.width;
          if (Math.abs(dx) < 0.5 && Math.abs(sx - 1) < 0.005) return;
          from = 'translateX(' + dx.toFixed(2) + 'px) scaleX(' + sx.toFixed(4) + ')';
        } else from = 'scaleX(0)';
        try { s.ppGlide = s.animate([{ transform: from }, { transform: 'none' }], { duration: ms, easing: ease }); } catch (e) { s.ppGlide = null; }
      });
    }
    return {
      el: el,
      set: function (c, active) {
        var tot = (c.A || 0) + (c.S || 0) + (c.O || 0) + (c.NA || 0) + (c.P || 0) || 1;
        var next = ['A', 'S', 'O', 'NA', 'P'].map(function (k) { return c[k] || 0; }).join(',');
        var first = sig !== null && next !== sig && el.isConnected && typeof el.animate === 'function' && !reducedMotion() ? boxes() : null;
        sig = next;
        Object.keys(segs).forEach(function (k) {
          var n = c[k] || 0;
          if (first && segs[k].ppGlide) { try { segs[k].ppGlide.cancel(); } catch (e) { /* ignore */ } segs[k].ppGlide = null; }
          segs[k].style.flexGrow = String(n);
          segs[k].hidden = !n;
          segs[k].setAttribute('aria-label', (k === 'P' ? SB_LABELS.potential : CLS[k].label) + ': ' + n + ' dari ' + tot);
          segs[k].setAttribute('aria-pressed', active && active.indexOf(k) >= 0 ? 'true' : 'false');
        });
        if (first) glide(first);
      }
    };
  }
  function srOnly(text) { return h('span', { class: 'sr-only', text: text }); }

  /* =================================================================== state */

  var PS = MCD.property = MCD.property || {};

  function personaById(id) {
    var c = KC();
    return c ? (c.personas || []).filter(function (p) { return p.id === id; })[0] || null : null;
  }
  function rankFromPersona(g) { return g === 'perwiraSdKolonel' ? 'perwira' : g; }
  function defaultState() {
    var p = personaById('bintara-jr') || { netIncome: 7400000, ageDefault: 28, rankGroup: 'bintara', family: 'menikah' };
    var c = KC() || {};
    return {
      inputs: {
        personaId: 'bintara-jr', personaEdited: false, oldTukin: false, income: p.netIncome, jointOn: false, jointIncome: null, existing: 0,
        dsr: null, age: p.ageDefault, useBirth: false, birthYm: '', rankGroup: rankFromPersona(p.rankGroup), tenorYears: null, tenorTouched: false,
        dpPct: 10, schemeId: c.defaultSchemeId || 'silver-f5-t12', floatingPct: c.floatingDefault || 13, stressBps: 0, basis: 'max',
        useFlpp: true, married: /menikah/.test(p.family || ''), firstHome: true, flppTenorCap: 20,
        cashOn: false, cash: null, cashRegion: 'Kota Bekasi', ktpDki: false, showPlanned: false
      },
      map: { colorBy: 'class', areas: false, labels: true, tni: false, areaMetric: 'land', lbBand: 'lb_61_90' },
      filters: { bands: bandsWithin(WITHIN_DEFAULT), segments: [], types: [], classes: [], mandiriOnly: false, topDevOnly: false, minConfidence: 'low', hideUncertain: false, q: '', area: '' },
      railTab: 'projects', sort: 'distance', moreFilters: false,
      calc: {
        open: false, mode: 'forward', price: 1200000000, listPrice: 1200000000, dpPct: 10, loan: null, loanTouched: false, tenorYears: 20,
        schemeId: null, floatingPct: c.floatingDefault || 13, stressBps: 0, akadYm: nextMonths(1)[0], region: 'Kota Bekasi',
        sourceProjectId: null, priceTouched: false, fromSim: false, isFlpp: false, isSubsidi: false, isApartment: false, incomeForDsr: null, applyAge: false,
        budget: 3000000, opts: { firstAcquisition: true, ktpDki: false, hakBaru: false, devCoversAjb: false, ppnMode: 'unknown', dtpEligible: false },
        printLang: 'id', tab: 'hasil'
      }
    };
  }
  function S() { if (!PS.state) PS.state = defaultState(); return PS.state; }
  function inputs() { return S().inputs; }

  /* -------------------------------------------------------- module refs */

  var ctx = null, host = null, page = null, view = 'overview';
  var R = null;                                        // latest computed model
  var refs = {};                                       // DOM refs of the mounted view
  var charts = {};                                     // chart handles
  var hoverCls = null, lastSel = null, flewTo = null;
  var timers = [];

  /* ================================================================ data index */

  var IDX = null;
  function dataOK() {
    return !!(W.MCD_PROPERTY_PROJECTS && Array.isArray(W.MCD_PROPERTY_PROJECTS.rows) && W.MCD_KPR_CONFIG && MCD.kprMath && !MCD.kprMath.stub);
  }
  function hav(lon1, lat1, lon2, lat2) {
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  /** Derived index built once per data object (§5.7). */
  function index() {
    var pp = W.MCD_PROPERTY_PROJECTS, pm = W.MCD_PROPERTY_MARKET || { meta: {}, areas: [] };
    if (IDX && IDX.src === pp && IDX.msrc === pm) return IDX;
    var rows = (pp.rows || []).slice().sort(function (a, b) { return (a.distanceKm - b.distanceKm) || (a.name < b.name ? -1 : 1); });
    var byId = {}, region = {}, topDev = {}, hay = {}, nearestArea = {};
    var areas = (pm.areas || []), kec = areas.filter(function (a) { return a.level !== 'kota'; }), kota = areas.filter(function (a) { return a.level === 'kota'; });
    var units = { subsidi: 0, komersial: 0, missing: 0 }, maxUnits = 1;
    rows.forEach(function (p) {
      byId[p.id] = p;
      region[p.id] = KM().regionOf(p.kota);
      topDev[p.id] = KM().isTopDevProject(p, TOP_DEV);
      hay[p.id] = norm([p.name, p.developer, p.developerGroup, p.kecamatan, p.kota, p.desa].join(' '));
      var best = null, bd = Infinity;
      kec.forEach(function (a) { var d = hav(p.lon, p.lat, a.lon, a.lat); if (d < bd) { bd = d; best = a; } });
      nearestArea[p.id] = best;
      if (p.unitsAvailable) {
        units.subsidi += p.unitsAvailable.subsidi || 0; units.komersial += p.unitsAvailable.komersial || 0;
        maxUnits = Math.max(maxUnits, (p.unitsAvailable.subsidi || 0) + (p.unitsAvailable.komersial || 0));
      } else units.missing++;
    });
    var own = kec.map(function (a) { return a.pricePerM2Land; }).filter(isNum).sort(function (a, b) { return a - b; });
    var areaById = {};
    areas.forEach(function (a) { areaById[a.id] = a; });
    var srcById = {};
    ((pm.meta || {}).sources || []).forEach(function (s) { srcById[s.id] = s; });
    IDX = {
      src: pp, msrc: pm, rows: rows, byId: byId, region: region, topDev: topDev, hay: hay, nearestArea: nearestArea,
      kec: kec, kota: kota, areaById: areaById, srcById: srcById, units: units, maxUnits: maxUnits,
      landThresholds: [0.2, 0.4, 0.6, 0.8].map(function (q) { return U().math.quantile(own, q); }),
      landMin: own[0], landMax: own[own.length - 1], meta: pp.meta || {}, mmeta: pm.meta || {}
    };
    return IDX;
  }

  /* ------------------------------------------- distance from KCP (items 27-28) */

  /*
   * Road distance and driving time from KCP Jakarta Cilangkap per project, from MCD.distance (shell,
   * assets/js/distance.js): the dashboard's own road grid within about 16 km ('jalan'), beyond it the
   * kelurahan table converted to normal traffic ('perkiraan'), else a straight line ('garis-lurus').
   * Feature-detected: without MCD.distance the rows keep the straight-line km from Mabes TNI.
   * Values are cached per project; the cache is dropped on 'mcd:distance' (shared toggles, peak factor).
   */
  var distCache = {};
  function DST() { return MCD.distance && typeof MCD.distance.of === 'function' ? MCD.distance : null; }
  function distOn(name) { var D = DST(); return !!(D && typeof D[name] === 'function' && safe(function () { return D[name](); })); }
  function distOpts() { return { peak: distOn('peakOn'), noToll: distOn('noTollOn') }; }
  /** MCD.distance.of for a project (cached), or null when there is no value or no MCD.distance. */
  function distOf(p) {
    var D = DST();
    if (!D || !p || !isNum(p.lon) || !isNum(p.lat)) return null;
    if (!Object.prototype.hasOwnProperty.call(distCache, p.id)) {
      var r = safe(function () { return D.of(p.lon, p.lat, { kelurahanId: p.kelurahanId || undefined, kecamatanId: p.kecamatanId || undefined }); });
      distCache[p.id] = r && (isNum(r.km) || isNum(r.min)) ? r : null;
    }
    return distCache[p.id];
  }
  /** True when the value is an estimate (outside the road grid, or a straight line). */
  function distEstimate(r) { return !!(r && r.precision && r.precision !== 'jalan'); }
  /** "4,2 km · ± 14 menit" under the shared toggles; '—' when there is no value. */
  function distText(p) {
    var D = DST(), r = distOf(p);
    if (!D || !r) return '—';
    var t = safe(function () { return typeof D.format === 'function' ? D.format(r, distOpts()) : null; });
    if (t) return t;
    return isNum(r.km) ? F().km(r.km) + (isNum(r.min) ? ' · ± ' + Math.round(r.min) + ' menit' : '') : '—';
  }
  /** Only the km of distText ("18,4 km"), so a card's eyebrow, head number and route chip show one value; null when none. */
  function distKmText(p) {
    var t = distOf(p) ? distText(p) : '—', cut = t.indexOf(' · ');
    return t === '—' ? null : cut > 0 ? t.slice(0, cut) : t;
  }
  var DIST_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  var DIST_SRC = 'Jarak dan waktu dari KCP: perkiraan, lalu lintas normal. Data jalan © OpenStreetMap (ODbL).';
  var DIST_EST = 'Di luar jaringan jalan dashboard (sekitar 16 km dari KCP): perkiraan dari tabel jarak per kelurahan.';
  function distTip(p) {
    var D = DST(), r = distOf(p);
    if (!D) return null;
    if (!r) return 'Jarak belum dapat dihitung untuk titik ini.';
    var t = safe(function () { return typeof D.tip === 'function' ? D.tip(r, distOpts()) : null; });
    return t || (DIST_TIP + (distEstimate(r) ? '\n' + DIST_EST : ''));
  }
  /** The source line under a list that shows distances (MCD.distance.sourceLine when present). */
  function distSrc() {
    var D = DST();
    return (D && typeof D.sourceLine === 'function' && safe(function () { return D.sourceLine(); })) || DIST_SRC;
  }
  /**
   * The distance of a project as a small element: "4,2 km · ± 14 menit" plus a "perkiraan" tag beyond the road grid.
   * Without MCD.distance: the straight-line km from Mabes TNI, as before (o.mabes adds "dari Mabes TNI").
   */
  function distEl(p, o) {
    o = o || {};
    if (!DST()) return h('span', { class: 'pp-dist pp-dist--mabes' + (o.cls ? ' ' + o.cls : ''), title: 'Jarak garis lurus dari Mabes TNI', text: F().km(p.distanceKm) + (o.mabes ? ' dari Mabes TNI' : '') });
    var r = distOf(p);
    return h('span', { class: 'pp-dist' + (o.cls ? ' ' + o.cls : ''), title: distTip(p) },
      h('span', { class: 'pp-dist__v', text: (o.kcp && r ? 'Dari KCP: ' : '') + distText(p) }),
      distEstimate(r) ? h('span', { class: 'pp-dist__est', text: 'perkiraan' }) : null);
  }
  /** One plain line for tooltips and search: "Dari KCP: 4,2 km · ± 14 menit", "· perkiraan" beyond the road grid. */
  function distLine(p) {
    if (!DST()) return F().km(p.distanceKm) + ' dari Mabes TNI';
    var r = distOf(p);
    return r ? 'Dari KCP: ' + distText(p) + (distEstimate(r) ? ' · perkiraan' : '') : 'Jarak dari KCP belum dapat dihitung';
  }
  /** Minutes used to sort "Terdekat dari KCP" (the toll-free route when "Motor (tanpa tol)" is on). */
  function distKey(p) {
    var r = distOf(p);
    if (!r) return null;
    var nt = distOn('noTollOn') && r.noToll && isNum(r.noToll.min) ? r.noToll : null;
    var m = nt ? nt.min : r.min, k = nt ? nt.km : r.km;
    return isNum(m) ? [m, isNum(k) ? k : 0] : (isNum(k) ? [Infinity, k] : null);
  }
  /** Rows ({p}) nearest to KCP first, rows without a value last in their old order; by km from Mabes TNI without MCD.distance. */
  function sortNear(rows) {
    var out = rows.slice();
    if (!DST()) return out.sort(function (a, b) { return (a.p.distanceKm - b.p.distanceKm) || (a.p.name < b.p.name ? -1 : 1); });
    var keyed = out.map(function (x, i) { return { x: x, i: i, k: distKey(x.p) }; });
    keyed.sort(function (a, b) {
      if (!a.k || !b.k) return a.k ? -1 : (b.k ? 1 : a.i - b.i);
      return (a.k[0] - b.k[0]) || (a.k[1] - b.k[1]) || (a.i - b.i);
    });
    return keyed.map(function (e) { return e.x; });
  }
  /** The shared "Jam sibuk" and "Motor (tanpa tol)" switches (MCD.distance, remembered per browser). → element or null */
  function distToggles(cls) {
    var D = DST();
    if (!D || typeof D.setPeak !== 'function') return null;
    /* the one shared "Waktu tempuh" control (MCD.distance.controls); its clicks fire 'mcd:distance' (onDistEvent) */
    if (typeof D.controls === 'function') {
      var c = null;
      try { c = D.controls({ compact: true }); } catch (e) { c = null; }
      if (c) {
        (refs.distSw = refs.distSw || []).push({ sync: function () { if (typeof c.sync === 'function') c.sync(); } });
        return h('div', { class: 'pp-dtog' + (cls ? ' ' + cls : '') }, c);
      }
    }
    var peak = sw('Jam sibuk', distOn('peakOn'), function (on) { safe(function () { D.setPeak(on); }); onDistanceChange(); },
      { title: 'Waktu tempuh saat jam sibuk (asumsi yang dapat diubah di Data & Privasi › Asumsi)', cls: 'pp-switch--sm' });
    var moto = typeof D.setNoToll === 'function' ? sw('Motor (tanpa tol)', distOn('noTollOn'), function (on) { safe(function () { D.setNoToll(on); }); onDistanceChange(); },
      { title: 'Rute tanpa jalan tol, karena motor tidak boleh masuk tol', cls: 'pp-switch--sm' }) : null;
    var el = h('div', { class: 'pp-dtog' + (cls ? ' ' + cls : ''), role: 'group', 'aria-label': 'Waktu tempuh dari KCP' },
      h('span', { class: 'pp-dtog__l', text: 'Waktu tempuh dari KCP' }), peak.el, moto ? moto.el : null);
    (refs.distSw = refs.distSw || []).push({ peak: peak, moto: moto });
    return el;
  }
  function syncDistToggles() {
    (refs.distSw || []).forEach(function (s) { if (s.sync) { s.sync(); return; } s.peak.set(distOn('peakOn')); if (s.moto) s.moto.set(distOn('noTollOn')); });
  }
  /** A toggle, the peak factor or the road data changed: recompute the distances and redraw what shows them. */
  function onDistanceChange() {
    distCache = {};
    if (!ctx) return;
    syncDistToggles();
    changed('ui');
  }

  /* ------------------------------------------------------- display text */

  /** Display names for schemes whose kpr-config.js name needs a plainer label. */
  var SCHEME_ID = {
    'payroll-corp-695': 'Karyawan korporasi tertentu (gaji melalui Mandiri) · 6,95% fixed sepanjang tenor',
    'flpp-tapak': 'KPR Sejahtera FLPP (rumah tapak) · 5% fixed sepanjang tenor',
    'flpp-rusun': 'KPR FLPP (apartemen) · 6% fixed sepanjang tenor',
    'x-gold-f1-260': 'Gold · fixed 1 tahun 2,60% (versi halaman sebelumnya)',
    'x-gold-step-396': 'Gold · Berjenjang 3,96/8,66/9,66% (versi sebelumnya)',
    'x-payroll-pelindo-745': 'Karyawan Pelindo (gaji melalui Mandiri) · 7,45% fixed sepanjang tenor',
    'x-hut-2025-127': 'Promo HUT Mandiri 2025 · mulai 1,27% fixed 1 tahun',
    'x-pegawai-2021': 'KPR Baru Mandiri untuk karyawan 2021 · 3,88% fixed 1 tahun',
    'plan-6pct': 'Rencana KPR subsidi 6% (belum berlaku)'
  };
  function schemeName(s) {
    if (!s) return '—';
    if (SCHEME_ID[s.id]) return SCHEME_ID[s.id];
    return String(s.name || s.id).replace(/tenor ≥(\d+)/g, 'tenor ≥ $1');
  }
  function schemeShort(s) { return schemeName(s).replace(/ \(tenor ≥ \d+\)/, '').replace(/ · \d+([.,]\d+)?%$/, ''); }
  function pathText(path) {
    if (!path || !path.length) return '—';
    return path.map(function (g, i) {
      var len = g.to - g.from + 1, y = len / 12;
      var span = len % 12 === 0 ? years(y) : len + ' bulan';
      if (g.kind === 'float') return (i ? 'lalu ' : '') + ratePct(g.rate) + ' floating';
      return (i ? 'lalu ' : '') + ratePct(g.rate) + ' selama ' + span;
    }).join(', ');
  }
  function devGroup(p) { return p.developerGroup === 'Pengembang rumah subsidi' ? 'Developer rumah subsidi' : (p.developerGroup || ''); }
  function priceRange(p) {
    if (!p || !isNum(p.priceMin)) return '—';
    if (!isNum(p.priceMax) || p.priceMax <= p.priceMin) return (isNum(p.priceMax) ? '' : 'Mulai ') + rp(p.priceMin);
    var a = F().rpParts(p.priceMin), b = F().rpParts(p.priceMax);
    return a.mag === b.mag ? 'Rp ' + a.n + '–' + b.n + (b.mag ? ' ' + b.mag : '') : rp(p.priceMin) + '–' + rp(p.priceMax).replace(/^Rp /, '');
  }
  function sizeText(p) {
    var f = function (r) { return !r ? null : (r[0] === r[1] ? F().num(r[0], 0) : F().num(r[0], 0) + '–' + F().num(r[1], 0)); };
    var lt = f(p.lt), lb = f(p.lb);
    return [lt ? 'Tanah ' + lt + ' m²' : null, lb ? 'Bangunan ' + lb + ' m²' : null].filter(Boolean).join(' · ') || 'Ukuran tidak dipublikasikan';
  }
  function priceSourceEn(s) {
    s = String(s || '');
    if (/^SiKumbang/.test(s)) return 'Data SiKumbang: harga per tipe unit yang didaftarkan developer';
    if (/^Developer\/berita/.test(s)) return 'Situs developer atau berita (lihat tautan sumber)';
    if (/^priceMin: start-from/.test(s)) return 'Harga terendah: harga “mulai dari” di situs developer (12 Okt 2026), harga tertinggi: SiKumbang';
    return s ? 'Lihat tautan sumber' : '—';
  }
  function priceAsOfEn(s) {
    s = String(s || '');
    var m = /^(\d{4}-\d{2})/.exec(s);
    var base = m ? monthLabel(m[1]) : (/^\d{4}/.test(s) ? s.slice(0, 4) : '—');
    if (/tanpa tanggal/.test(s)) return s.slice(0, 4) + ' (sumber tanpa tanggal)';
    if (/start-from/.test(s)) return base + ' (harga “mulai dari” developer)';
    if (/termasuk PPN/.test(s)) return s.slice(0, 4) + ' (situs developer, harga termasuk PPN)';
    if (/early bird/.test(s)) return base + ' (harga early bird)';
    return base;
  }
  function coordSourceEn(s) {
    s = String(s || '');
    var m = /OSM (way|relation)\/(\d+)/.exec(s);
    if (m) return 'OpenStreetMap ' + m[1] + ' ' + m[2] + ' (titik tengah batas)';
    if (/SiKumbang/.test(s)) return 'Koordinat proyek SiKumbang (titik dari developer)';
    return s || '—';
  }
  function coordNoteEn(s) {
    var m = /jatuh di (.+?) menurut batas OSM/.exec(String(s || ''));
    return m ? 'Titik SiKumbang ada di ' + m[1].replace(/\bKab\b/, 'Kab.') + ' menurut batas OpenStreetMap (dekat perbatasan). Alamat mengikuti data developer.' : 'Lokasi perlu diperiksa.';
  }
  function transitText(p) {
    var t = p.transitDetail;
    if (!t) return null;
    var parts = (t.rail || []).slice(0, 2).map(function (r) { return r.mode + ' ' + r.name + ' ' + F().km(r.km); });
    if (t.toll) parts.push(String(t.toll.name || '').replace(/^GT /, '') + ' gerbang tol ' + F().km(t.toll.km));
    return parts.join(' · ');
  }
  function srcLabel(id) {
    var s = index().srcById[id];
    if (!s) return id;
    var when = s.asOf ? (String(s.asOf).length > 7 ? F().date(s.asOf) : monthLabel(String(s.asOf).slice(0, 7))) : '';
    if (/^r123/.test(id)) return 'Rumah123' + (/-fr-/.test(id) ? ' Flash Report' : ' data') + ', ' + when;
    if (/^cw-/.test(id)) return 'Cushman & Wakefield MarketBeat, ' + when;
    if (/^bi-shpr/.test(id)) return 'Survei Harga Properti Residensial Bank Indonesia, triwulan II 2026';
    if (/^okezone/.test(id)) return 'Okezone (sumber data tidak disebutkan), ' + when;
    if (/^brighton/.test(id)) return 'Harga penawaran agen Brighton, ' + when;
    if (/^mandiri/.test(id)) return 'Bank Mandiri, ' + when;
    if (/^osm/.test(id)) return 'OpenStreetMap (ODbL)';
    if (/^bisnis/.test(id)) return 'Bisnis, ' + when;
    return id;
  }

  /* ================================================================== engine */

  function schemeMap() {
    var m = {};
    ((KC() || {}).rateSchemes || []).forEach(function (s) { m[s.id] = s; });
    m[PLANNED.id] = PLANNED;
    return m;
  }
  function schemesList() {
    var list = ((KC() || {}).rateSchemes || []).slice();
    if (inputs().showPlanned) list.push(PLANNED);
    return list;
  }
  function dsrNow() {
    var i = inputs();
    if (isNum(i.dsr)) return i.dsr;
    return isNum(MCD.config && MCD.config.dsrCap) ? MCD.config.dsrCap : 0.4;
  }
  function rankParts(g) {
    var m = /^pati([1-4])$/.exec(String(g || ''));
    return m ? { rankGroup: 'pati', patiStars: +m[1] } : { rankGroup: g || 'employee', patiStars: 1 };
  }
  function engineInputs() {
    var i = inputs(), rk = rankParts(i.rankGroup);
    return {
      income: isNum(i.income) ? i.income : 0, jointIncome: i.jointOn && isNum(i.jointIncome) ? i.jointIncome : 0, dsr: dsrNow(),
      existing: isNum(i.existing) ? i.existing : 0, age: isNum(i.age) ? i.age : 30,
      birthYm: i.useBirth && /^\d{4}-\d{2}$/.test(i.birthYm || '') ? i.birthYm : null, rankGroup: rk.rankGroup, patiStars: rk.patiStars,
      tenorYears: i.tenorYears, tenorTouched: !!i.tenorTouched, dpPct: i.dpPct, schemeId: i.schemeId, floatingPct: i.floatingPct,
      stressBps: i.stressBps, basis: i.basis, useFlpp: i.useFlpp, firstHome: i.firstHome, married: i.married, flppTenorCap: i.flppTenorCap,
      cashOn: i.cashOn && isNum(i.cash), cash: i.cash, cashRegion: i.cashRegion, ktpDki: i.ktpDki, showPlanned: i.showPlanned, ppnMode: 'unknown'
    };
  }
  function envFor() {
    return { asOf: asOf(), schemes: schemesList(), schemeById: schemeMap(), topDevGroups: TOP_DEV, cache: {}, retire: MCD.config && MCD.config.retire };
  }
  function passes(row, f, I) {
    var p = row.p;
    if (f.bands.length && f.bands.indexOf(p.band) < 0) return false;
    if (f.segments.length && f.segments.indexOf(p.segment) < 0) return false;
    if (f.types.length && f.types.indexOf(p.type) < 0) return false;
    if (f.classes.length && f.classes.indexOf(row.cls) < 0) return false;
    if (f.mandiriOnly && p.mandiriPartner !== true) return false;
    if (f.topDevOnly && !I.topDev[p.id]) return false;
    if ((CONF_RANK[p.confidence] || 0) < (CONF_RANK[f.minConfidence] || 0)) return false;
    if (f.hideUncertain && p.status === 'sold-out-unknown') return false;
    if (f.area && !inArea(p, I.areaById[f.area])) return false;
    if (f.q) {
      var hay = I.hay[p.id], toks = norm(f.q).split(/\s+/).filter(Boolean);
      for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return false;
    }
    return true;
  }

  /* v5 "Lihat proyek di area ini": a project lies in a price area when its kota matches and, for a kecamatan area, its
     kecamatan too ("Kab. Bogor" = "Kabupaten Bogor"; "Kota Bekasi" and "Kab. Bekasi" stay apart). */
  function kotaKey(s) { return norm(s).trim().replace(/^(kabupaten|kab\.?)\s+/, 'kab ').replace(/^kota\s+/, '').replace(/[^a-z0-9]+/g, ''); }
  function kecKey(s) { return norm(String(s || '').replace(/\([^)]*\)/g, ' ')).replace(/[^a-z0-9]+/g, ''); }
  function inArea(p, a) {
    if (!a) return true;
    if (kotaKey(p.kota) !== kotaKey(a.kota || a.name)) return false;
    return a.level === 'kota' || kecKey(p.kecamatan) === kecKey(a.name);
  }

  var computeSeq = 0;
  /** The full model for the current inputs and filters (memoised). */
  function compute() {
    if (!dataOK()) return null;
    var st = S(), I = index(), c = KC();
    var key = JSON.stringify([st.inputs, st.filters, asOf(), dsrNow(), MCD.config && MCD.config.retire]);
    if (R && R.key === key) return R;
    var inp = engineInputs(), env = envFor();
    var pan = KM().panel(inp, c, env);
    var run = Object.assign({}, inp, { tenorYears: pan.T, scheme: pan.scheme });
    var live = pan.scheme && pan.T >= 1 && pan.state !== 'retired' && pan.state !== 'noScheme';
    var rows = I.rows.map(function (p) {
      var r = live ? KM().resolveProject(p, run, c, env) : { id: p.id, cls: 'NA', why: pan.state === 'retired' ? 'Telah mencapai usia pensiun' : 'Tidak ada skema aktif' };
      var cls = pan.state === 'noIncome' ? 'NA' : r.cls;
      return { p: p, r: r, cls: cls };
    });
    var byId = {};
    rows.forEach(function (x) { byId[x.p.id] = x; });
    var filtered = rows.filter(function (x) { return passes(x, st.filters, I); });
    // The same filters without the class filter: the status bars count these, so clicking a class never empties its own bar
    var noCls = Object.assign({}, st.filters, { classes: [] });
    var base = st.filters.classes.length ? rows.filter(function (x) { return passes(x, noCls, I); }) : filtered;
    var countsBase = { A: 0, S: 0, O: 0, NA: 0 };
    base.forEach(function (x) { countsBase[x.cls]++; });
    var counts = { A: 0, S: 0, O: 0, NA: 0 }, all = { A: 0, S: 0, O: 0, NA: 0 }, bandCounts = {}, units = 0, unitsNoData = 0, flppA = 0;
    rows.forEach(function (x) { all[x.cls]++; });
    filtered.forEach(function (x) {
      counts[x.cls]++;
      bandCounts[x.p.band] = (bandCounts[x.p.band] || 0) + 1;
      if (x.p.unitsAvailable) units += x.p.unitsAvailable.subsidi || 0; else unitsNoData++;
      if (x.cls === 'A' && x.r.isFlpp) flppA++;
    });
    var prev = R;
    R = {
      key: key, inp: inp, pan: pan, rows: rows, byId: byId, filtered: filtered, counts: counts, countsAll: all, bandCounts: bandCounts,
      base: base, countsBase: countsBase, units: units, unitsNoData: unitsNoData, flppA: flppA, seq: ++computeSeq,
      nearestA: filtered.filter(function (x) { return x.cls === 'A'; })[0] || null
    };
    if (prev && prev.pan && pan.switched && (!prev.pan.switched || prev.pan.scheme !== pan.scheme) && ctx) {
      ctx.toast('Skema diganti menjadi ' + schemeShort(pan.scheme) + '. Tenor paling lama ' + years(pan.T) + ', di bawah tenor terpendek skema sebelumnya.');
    }
    return R;
  }

  /* ===================================================================== map */

  /** Area discs show with the Areas tab open, or always when switched on in Layers. */
  function areasShown() { return !!(S().map.areas || (view === 'deep' && S().railTab === 'areas')); }
  function requestMap() { if (MCD.map && MCD.map.requestRender) safe(function () { MCD.map.requestRender(); }); }
  function setHoverCls(k) {
    if (hoverCls === k) return;
    hoverCls = k;
    requestMap();
  }
  var LOG_LO = Math.log10(1.3e8), LOG_HI = Math.log10(9.3e9);
  function priceT(v) { return clamp((Math.log10(Math.max(1, v)) - LOG_LO) / (LOG_HI - LOG_LO), 0, 1); }
  function priceStep(v) { return clamp(1 + Math.floor(priceT(v) * 6), 1, 6); }
  function rowPrice(row) { return isNum(row.r.price) ? row.r.price : row.p.priceMin; }
  var SEG_STEP = { subsidi: 2, menengah: 3, 'menengah-atas': 4, premium: 5 };
  var CLS_ORDER = { O: 0, NA: 1, S: 2, A: 3 };

  /** Before a take-home pay is entered nothing can be judged: every project is neutral blue, never a fake red. */
  function potentialOnly() { return !!(R && R.pan.state === 'noIncome'); }
  function clsRGB(cls, C) { return toneRGB(CLS[cls] ? CLS[cls].tone : 'none', C.text3); }
  /** Fill colour for a project under the active colour mode; hover on a class dims the rest. */
  function fillOf(row, K) {
    var mode = S().map.colorBy, C = K.palette;
    var dim = (hoverCls && row.cls !== hoverCls) || (hoverId && row.p.id !== hoverId);
    if (mode === 'segment') return K.heatColor(SEG_STEP[row.p.segment] || 1, dim ? 38 : 225);
    if (mode === 'price') return K.heatColor(priceStep(rowPrice(row)), dim ? 38 : 225);
    if (potentialOnly()) return K.rgba(toneRGB('potential', C.signal), dim ? 40 : 230);
    if (dim) return K.rgba(clsRGB(row.cls, C), 40);
    return K.rgba(clsRGB(row.cls, C), { A: 235, S: 225, O: 205, NA: 150 }[row.cls]);
  }
  /** Keyline: light on the satellite (Deep dive), the page colour on the street map (Overview). */
  function lineOf(row, K, ov) {
    var C = K.palette;
    return ov ? K.rgba(C.canvas, 230) : K.rgba(C.text1, 170);
  }
  /* calm points (COPY_STYLE item 23): a little smaller than before, still largest for the projects that fit */
  function radiusPx(row, ov, zoom) {
    var base = ov ? { A: 5.8, S: 5.2, O: 4.2, NA: 3.8 } : { A: 5.4, S: 4.9, O: 4.1, NA: 3.6 };
    var mode = S().map.colorBy;
    var r = mode === 'class' && !potentialOnly() ? base[row.cls] : (ov ? 4.8 : 4);
    return r * clamp(1 + (zoom - 11) * 0.12, 0.85, 1.6);
  }

  function instC(v) { return isNum(v) ? rp(KM().dispRp(v)) : '—'; }
  function instPath(r) {
    if (!r || !r.segments || !r.segments.length) return '—';
    var a = r.segments[0].installment, b = r.max;
    return Math.abs(b - a) < 500 ? instC(a) : instC(a) + ' → ' + instC(b);
  }
  function projectTip(row) {
    var p = row.p, r = row.r, lines = [];
    lines.push({ kind: 'meta', text: [p.kecamatan, p.kota].filter(Boolean).join(', ') });
    lines.push({ kind: 'meta', text: distLine(p) });
    lines.push({ text: TYPE[p.type] + ' · ' + SEG[p.segment] + ' · ' + (r.isFlpp ? rp(r.listPrice) + ' FLPP' : priceRange(p)) });
    if (r.segments) lines.push({ text: (r.isFlpp ? (r.scheme.id === 'flpp-rusun' ? 'FLPP 6%' : 'FLPP 5%') : schemeShort(r.scheme)) + ' · ' + yrs(r.T) + ' · ' + instPath(r) + ' per bulan' });
    else if (r.why) lines.push({ kind: 'meta', text: r.why });
    if (p.riskNote) lines.push({ kind: 'meta', text: 'Risiko serah terima: periksa sebelum KPR inden' });
    var eb = potentialOnly() ? 'PROYEK BARU · ISI PENGHASILAN BERSIH UNTUK MEMERIKSA' : CLS[row.cls].label.toUpperCase() + (r.how === 'auto' ? ' · SKEMA OTOMATIS' : '');
    return { eyebrow: eb, title: p.name, lines: lines };
  }

  function areaValue(a, metric, lb) {
    var b = a.benchmark || {};
    if (metric === 'median') return b.medianByLB ? b.medianByLB[lb] : null;
    if (metric === 'yoy') return isNum(a.yoyGrowth) ? a.yoyGrowth : b.yoyGrowth;
    return isNum(a.pricePerM2Land) ? a.pricePerM2Land : b.subMarketLandPerM2;
  }
  /*
   * Item 41 (v5, §10.4): neutral area circles. One grey fill (no heat colours, item 23); the size says the value of
   * the chosen measure in 5 steps on a square-root scale, 700–1.600 m (the circle's area grows evenly per step). The
   * steps are the fifths of the kecamatan areas' own values for that measure (the land price already used them), so
   * the circles differ even where the published values sit close together. areaStep5(a) → 1–5, or 0 without a value.
   */
  var AREA_R = [700, 1600];
  function areaRadius(step) { var t = Math.max(0, (step || 1) - 1) / 4; return Math.round(Math.sqrt(AREA_R[0] * AREA_R[0] + (AREA_R[1] * AREA_R[1] - AREA_R[0] * AREA_R[0]) * t)); }
  /** The four cut values of the chosen measure (and floor area): the land quintiles, else the quintiles of the areas' values. */
  function areaCuts() {
    var m = S().map, I = index(), key = m.areaMetric + '|' + m.lbBand;
    I.areaCuts = I.areaCuts || {};
    if (I.areaCuts[key]) return I.areaCuts[key];
    var vals = I.kec.map(function (a) { return areaValue(a, m.areaMetric, m.lbBand); }).filter(isNum).sort(function (a, b) { return a - b; });
    var cuts = m.areaMetric === 'land' ? I.landThresholds.slice() : [0.2, 0.4, 0.6, 0.8].map(function (q) { return vals.length ? U().math.quantile(vals, q) : null; });
    I.areaCuts[key] = cuts;
    return cuts;
  }
  function areaStep5(a) {
    var m = S().map, v = areaValue(a, m.areaMetric, m.lbBand);
    if (!isNum(v)) return 0;
    var s = 1;
    areaCuts().forEach(function (t) { if (isNum(t) && v > t) s++; });
    return clamp(s, 1, 5);
  }
  /** The value where step k (2–5) starts, for the legend words. */
  function areaCut(k) { return areaCuts()[k - 2]; }
  function areaCutText(v) {
    var m = S().map;
    if (!isNum(v)) return '—';
    if (m.areaMetric === 'yoy') return '+' + F().num(v, 1) + '%';
    return rp(v) + (m.areaMetric === 'land' ? '/m²' : '');
  }
  /** A circle of the area legend, drawn once per size and theme (a canvas; no data URL under the CSP). */
  var areaGlyphs = {};
  function areaGlyph(px, rgb, theme) {
    var key = px + '|' + theme;
    if (areaGlyphs[key]) return areaGlyphs[key];
    var cv = DOC.createElement && DOC.createElement('canvas');
    if (!cv || typeof cv.getContext !== 'function') return null;
    var S0 = 36, c2 = null;
    cv.width = S0; cv.height = S0;
    try { c2 = cv.getContext('2d'); } catch (e) { c2 = null; }
    if (!c2) return null;
    var rr = px * S0 / 18 / 2;
    c2.beginPath(); c2.arc(S0 / 2, S0 / 2, rr, 0, Math.PI * 2);
    c2.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (theme === 'day' ? 0.28 : 0.34) + ')';
    c2.fill();
    c2.lineWidth = 2; c2.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.75)';
    c2.stroke();
    areaGlyphs[key] = cv;
    return cv;
  }
  function areaClass(a) {
    var b = a.benchmark || {}, v = b.medianByLB ? b.medianByLB[S().map.lbBand] : null;
    if (!R || !isNum(v) || !(R.pan.maxPrice > 0)) return null;
    return KM().affordClass(v, R.pan.maxPrice, 15);
  }
  function areaTip(a) {
    var b = a.benchmark || {}, m = S().map, lines = [];
    var land = isNum(a.pricePerM2Land) ? 'Tanah ' + rp(a.pricePerM2Land) + '/m² (' + (a.pricePerM2LandBasis ? 'sampel sendiri' : 'nilai area') + ')'
      : (isNum(b.subMarketLandPerM2) ? 'Tanah ' + rp(b.subMarketLandPerM2) + '/m² (' + (b.subMarket || 'sub-pasar') + ' rata-rata, data lama)' : null);
    if (land) lines.push({ text: land });
    var lbl = (LB_BANDS.filter(function (x) { return x[0] === m.lbBand; })[0] || [])[1];
    if (b.medianByLB && isNum(b.medianByLB[m.lbBand])) lines.push({ text: 'Rumah seken, bangunan ' + lbl + ': ' + rp(b.medianByLB[m.lbBand]) + ' (' + (b.rumah123Market || a.kota) + ', harga penawaran)' });
    if (isNum(a.yoyGrowth)) lines.push({ text: 'Perubahan harga ' + (a.yoyGrowth >= 0 ? '+' : '') + F().num(a.yoyGrowth, 1) + '% per tahun' });
    var cls = areaClass(a);
    if (cls) lines.push({ kind: 'meta', text: 'Untuk anggaran ini: ' + CLS[cls].label });
    return { eyebrow: (a.level === 'kota' ? 'KOTA' : 'KECAMATAN') + ' · ' + F().km(a.distanceKm) + ' DARI MABES TNI', title: a.name + (a.level === 'kota' ? '' : ' (' + a.kota + ')'), lines: lines };
  }

  var drawCache = { seq: -1, rows: null };
  function drawRows() {
    if (!R) return [];
    if (drawCache.seq === R.seq) return drawCache.rows;
    var rows = R.filtered.slice().sort(function (a, b) { return CLS_ORDER[a.cls] - CLS_ORDER[b.cls]; });
    drawCache = { seq: R.seq, rows: rows };
    return rows;
  }

  /** MCD.map.registerLayers('property', …): areas, projects (flat dots), labels. */
  function layersFn(derived, ms) {
    var d = W.deck;
    if (!d || !dataOK()) return null;
    compute();
    if (!R) return null;
    var K = ms.kit, C = K.palette, ov = ms.view === 'overview', st = S(), base = [], top = [];
    var rows = drawRows(), zoom = ms.zoom || 10;
    var trig = [R.seq, st.map.colorBy, hoverCls, hoverId, ms.palette, ov, ms.theme];
    var meta = { kind: 'project', id: function (o) { return o.p.id; }, tooltip: function (o) { return projectTip(o); } };
    if (!ov && areasShown()) {
      var I = index();
      var amEta = { kind: 'area', id: function (a) { return a.id; }, tooltip: function (a) { return areaTip(a); } };
      base.push(new d.ScatterplotLayer({
        id: 'property-areas', data: I.kec, getPosition: function (a) { return [a.lon, a.lat]; },
        /* only when "Area" is open in Detail (never by default, item 23). Item 41 (v5): one neutral grey fill, the size
           (700–1.600 m, 5 steps, square-root scale) says the value; status colours stay on the edge only */
        radiusUnits: 'meters', getRadius: function (a) { return areaRadius(areaStep5(a)); }, filled: true, stroked: true,
        getFillColor: function (a) {
          var own = st.map.areaMetric !== 'land' || isNum(a.pricePerM2Land), al = ms.theme === 'day' ? 26 : 34;
          return K.rgba(C.text2, areaStep5(a) && own ? al : Math.round(al / 2));
        },
        /* the faint grey fill alone disappears on the satellite: a neutral edge carries the size (QA, 17 Oct 2026);
           in "median" mode the edge is the affordability status, as before */
        getLineColor: function (a) {
          var c = st.map.areaMetric === 'median' ? areaClass(a) : null, own = st.map.areaMetric !== 'land' || isNum(a.pricePerM2Land);
          return c ? K.rgba(clsRGB(c, C), 200) : K.rgba(C.text1, areaStep5(a) && own ? 150 : 70);
        },
        lineWidthUnits: 'pixels', getLineWidth: function (a) { return st.map.areaMetric === 'median' && areaClass(a) ? 1.5 : 1.25; },
        updateTriggers: { getFillColor: [st.map.areaMetric, st.map.lbBand, ms.palette, ms.theme], getRadius: [st.map.areaMetric, st.map.lbBand],
          getLineColor: [R.seq, st.map.lbBand, st.map.areaMetric, ms.palette, ms.theme], getLineWidth: [R.seq, st.map.lbBand, st.map.areaMetric] },
        pickable: true, mcd: amEta, beforeId: ms.beforeId
      }));
    }
    if (rows.length) {
      base.push(new d.ScatterplotLayer({
        id: 'property-projects', data: rows, getPosition: function (o) { return [o.p.lon, o.p.lat]; },
        radiusUnits: 'pixels', getRadius: function (o) { return radiusPx(o, ov, zoom); },
        filled: true, stroked: true, getFillColor: function (o) { return fillOf(o, K); },
        getLineColor: function (o) { return lineOf(o, K, ov); }, lineWidthUnits: 'pixels',
        getLineWidth: function (o) { return ov ? (st.map.colorBy === 'class' && o.cls === 'A' && !potentialOnly() ? 1.25 : 1) : 1; },
        updateTriggers: { getFillColor: trig, getLineColor: trig, getLineWidth: trig, getRadius: [R.seq, ov, st.map.colorBy, Math.round(zoom * 4)] },
        pickable: true, mcd: meta, beforeId: ms.beforeId,
        transitions: reduced() ? null : { getFillColor: 180 }
      }));
      var risk = rows.filter(function (x) { return x.p.riskNote; });
      if (risk.length && !ov) {
        top.push(new d.TextLayer({
          id: 'property-risk', data: risk, getPosition: function (o) { return [o.p.lon, o.p.lat]; }, getText: function () { return '!'; },
          getSize: 12, sizeUnits: 'pixels', getColor: K.rgba(C.warn || C.gold, 255), fontFamily: K.fonts.sans, fontWeight: 700,
          characterSet: '!', fontSettings: { sdf: true }, outlineWidth: 3, outlineColor: K.rgba(C.canvas, 230),
          getPixelOffset: [9, -9], pickable: false, beforeId: ms.beforeId
        }));
      }
    }
    if (st.map.labels && zoom >= (ov ? 11.8 : 12.4)) {
      var sel = lastSel && lastSel.kind === 'project' ? lastSel.id : null;
      var lab = rows.filter(function (x) { return x.cls === 'A' || x.p.id === sel; });
      if (lab.length) {
        var ext = d.CollisionFilterExtension ? [new d.CollisionFilterExtension()] : [];
        top.push(new d.TextLayer({
          id: 'property-labels', data: lab, getPosition: function (o) { return [o.p.lon, o.p.lat]; },
          getText: function (o) { var n = o.p.name.replace(/\s*\(.*\)$/, ''); return n.length > 30 ? n.slice(0, 29) + '…' : n; },
          getSize: ov ? 12.5 : 11.5, sizeUnits: 'pixels', getColor: K.rgba(C.text1, 240), fontFamily: K.fonts.sans, fontWeight: 600,
          characterSet: 'auto', fontSettings: { sdf: true }, outlineWidth: 2.5, outlineColor: K.rgba(C.canvas, 235),
          getPixelOffset: [10, 0], getTextAnchor: 'start', getAlignmentBaseline: 'center',
          extensions: ext, collisionGroup: 'property', getCollisionPriority: function (o) { return o.p.id === sel ? 10 : 1; },
          updateTriggers: { getCollisionPriority: sel, getColor: ms.palette }, pickable: false, beforeId: ms.beforeId
        }));
      }
    }
    return { base: base, top: top };
  }

  /** MCD.map.registerLegend('property', …) */
  function legendFn(derived, ms) {
    if (!dataOK()) return [];
    compute();
    if (!R) return [];
    var C = ms.kit.palette, K = ms.kit, ov = ms.view === 'overview', st = S(), c = R.counts, groups = [];
    var mode = ov ? (st.map.colorBy === 'class' ? 'class' : st.map.colorBy) : st.map.colorBy;
    if (mode === 'class' && potentialOnly()) {
      groups.push({ id: 'pp-class', title: 'Proyek perumahan baru', rows: [
        { glyph: 'circle', rgb: toneRGB('potential', C.signal), label: 'Proyek (isi penghasilan bersih untuk memeriksa)', count: R.filtered.length, key: 'P' }] });
    } else if (mode === 'class') {
      var rows = ['A', 'S', 'O'].map(function (k) { return { glyph: 'circle', rgb: clsRGB(k, C), label: CLS[k].legend, count: c[k], key: k }; });
      if (c.NA) rows.push({ glyph: 'circle', rgb: clsRGB('NA', C), label: CLS.NA.legend, count: c.NA, key: 'NA' });
      groups.push({ id: 'pp-class', title: ov ? 'Proyek perumahan baru menurut anggaran' : 'Proyek menurut keterjangkauan', rows: rows });
    } else if (mode === 'segment') {
      groups.push({ id: 'pp-seg', title: 'Proyek menurut segmen', rows: SEG_ORDER.map(function (k) {
        return { glyph: 'circle', rgb: K.heatRGB[SEG_STEP[k]], label: SEG[k], count: R.filtered.filter(function (x) { return x.p.segment === k; }).length, key: k };
      }) });
    } else {
      groups.push({ id: 'pp-price', title: 'Proyek menurut harga awal', ramp: { colors: K.heatRGB.slice(1), min: 'Rp 130 jt', max: 'Rp 9,3 M' } });
    }
    if (!ov && areasShown()) {
      /* item 41 (v5): no colour ramp; three sized grey circles in words, and the affordability edge in "median" mode */
      var am = st.map.areaMetric, th = ms.theme === 'day' ? 'day' : 'night', grey = C.text2 || [128, 128, 128];
      var aRows = [
        { px: 7, label: 'Sampai ' + areaCutText(areaCut(2)) },
        { px: 11, label: areaCutText(areaCut(3)) + ' sampai ' + areaCutText(areaCut(4)) },
        { px: 16, label: 'Di atas ' + areaCutText(areaCut(5)) }
      ].map(function (x) {
        var cv = areaGlyph(x.px, grey, th);
        return cv ? { canvas: cv, size: 18, imgKey: 'pp-area-' + x.px + '-' + th + '-' + grey.join(','), label: x.label } : { glyph: 'circle', rgb: grey, alpha: 0.5, label: x.label };
      });
      if (am === 'median' && !potentialOnly()) aRows.push({ glyph: 'ring', rgb: clsRGB('O', C), label: 'Tepi lingkaran: keterjangkauan, sama seperti di atas' });
      groups.push({ id: 'pp-areas', title: am === 'median' ? 'Median rumah seken (area)' : (am === 'yoy' ? 'Perubahan harga per tahun (area)' : 'Harga tanah per m² (area)'),
        rows: aRows, note: am === 'yoy' ? 'Lingkaran lebih besar = kenaikan lebih tinggi' : 'Lingkaran lebih besar = harga lebih tinggi' });
    }
    return groups;
  }

  /** MCD.map.registerPosture('property', …): no customer dots, TNI places on request, ring clicks filter distance. */
  function postureFn() {
    var st = S();
    return {
      core: { sites: !!st.map.tni, beacon: true, boundary: true, rings: true },
      attribution: 'Proyek: SiKumbang (Kementerian PKP / BP Tapera), situs developer · Harga area: Rumah123, Cushman & Wakefield',
      camera: withinPreset(),
      onRingClick: function (km) { setWithin(withinNow() === km ? 0 : km); },
      telemetry: function () { return R ? R.filtered.length + ' PROYEK · WARNA ' + String(st.map.colorBy).toUpperCase() : ''; }
    };
  }
  function selectablePos(kind) {
    return function (id) {
      if (!dataOK()) return null;
      var I = index();
      if (kind === 'project') { var p = I.byId[id]; return p ? [p.lon, p.lat] : null; }
      var a = I.areaById[id];
      return a ? [a.lon, a.lat] : null;
    };
  }
  if (MCD.map && typeof MCD.map.registerLayers === 'function') {
    MCD.map.registerLayers(ID, layersFn);
    MCD.map.registerLegend(ID, legendFn);
    MCD.map.registerPosture(ID, postureFn);
    if (typeof MCD.map.registerPreset === 'function') {
      [5, 10, 15, 20].forEach(function (km) { MCD.map.registerPreset('kpr' + km, { label: km + ' km dari Mabes TNI', fit: 'ring', anchor: 'center', km: km }); });
    }
    MCD.map.registerSelectable('project', selectablePos('project'));
    MCD.map.registerSelectable('area', selectablePos('area'));
  }

  /* =============================================================== mutators */

  var dirty = {}, flushRaf = 0, flushTimer = 0;
  function changed(what) {
    dirty[what] = 1;
    if (flushRaf || flushTimer) return;
    flushRaf = W.requestAnimationFrame ? W.requestAnimationFrame(flush) : 0;
    flushTimer = setTimeout(flush, 140);                // rAF stalls in hidden tabs
  }
  function flush() {
    if (flushRaf && W.cancelAnimationFrame) W.cancelAnimationFrame(flushRaf);
    clearTimeout(flushTimer);
    flushRaf = 0; flushTimer = 0;
    var d = dirty;
    dirty = {};
    if (!ctx) return;
    compute();
    safe(function () { renderAll(d); });
    if (d.inputs || d.filters || d.map) requestMap();
    if (d.inputs || d.filters) refreshReadout();
    if (d.posture && MCD.map && MCD.map.registerPosture) safe(function () { MCD.map.registerPosture(ID, postureFn); });
  }
  var readoutDeb = null;
  /** The shell readout is rebuilt on its own render pass; ask for one (debounced) after local changes. */
  function refreshReadout() {
    if (!readoutDeb) readoutDeb = U().debounce(function () { if (ctx) ctx.requestRender(['ext']); }, 220);
    readoutDeb();
  }
  function setInput(patch, o) {
    var i = inputs();
    Object.keys(patch).forEach(function (k) { i[k] = patch[k]; });
    if (o && o.edited && i.personaId) i.personaEdited = true;
    changed('inputs');
  }
  function setFilter(patch) { Object.assign(S().filters, patch); changed('filters'); }
  function setMapOpt(patch) {
    Object.assign(S().map, patch);
    changed('map');
    if ('tni' in patch) changed('posture');
    if (ctx) ctx.relayout();
  }
  function withinNow() {
    var b = S().filters.bands;
    if (!b.length) return 0;
    for (var k = 1; k < WITHIN.length; k++) {
      var want = BANDS.filter(function (x) { return x.hi <= WITHIN[k].v; }).map(function (x) { return x.id; });
      if (want.length === b.length && want.every(function (x) { return b.indexOf(x) >= 0; })) return WITHIN[k].v;
    }
    return -1;
  }
  function setWithin(km) {
    setFilter({ bands: bandsWithin(km) });
    if (MCD.map && typeof MCD.map.preset === 'function') safe(function () { MCD.map.preset(withinPreset()); });
  }
  /** The camera of the "within" filter: its ring ('kpr5' … 'kpr20'), else the 30 km circle. */
  function withinPreset() { var w = withinNow(); return w > 0 && w < 30 ? 'kpr' + w : 'ring30'; }
  function applyPersona(id) {
    var p = personaById(id);
    if (!p) return;
    var i = inputs();
    i.personaId = id; i.personaEdited = false;
    i.income = i.oldTukin && isNum(p.netIncomeOldTukin) ? p.netIncomeOldTukin : p.netIncome;
    i.age = p.ageDefault; i.useBirth = false; i.rankGroup = rankFromPersona(p.rankGroup);
    i.married = /menikah/.test(p.family || ''); i.tenorTouched = false; i.tenorYears = null;
    changed('inputs');
    syncControls();
  }
  function personaLabel() {
    var i = inputs();
    if (!i.personaId) return 'isian manual';
    return (PERSONA_SHORT[i.personaId] || i.personaId) + (i.personaEdited ? ' (diubah)' : ' (perkiraan)');
  }
  /** Sets the tenor in years within what the profile allows (chips and the number field). */
  function pickTenor(y) {
    if (!R || !R.pan) return;
    var cap = R.pan.cap ? R.pan.cap.years : 30, lo = R.pan.tenorMin || 1;
    var t = clamp(Math.round(y), lo, cap);
    setInput({ tenorYears: t, tenorTouched: t !== cap });
    syncControls();
  }
  function stepTenor(d) {
    if (!R || !R.pan) return;
    var cap = R.pan.cap ? R.pan.cap.years : 30, lo = R.pan.tenorMin || 1;
    var t = clamp((R.pan.T || cap) + d, lo, cap);
    setInput({ tenorYears: t, tenorTouched: t !== cap });
    syncControls();
  }

  /* ======================================================== Overview (guide) */

  function stepper(o) {
    var minus = h('button', { type: 'button', class: 'pp-step__btn', title: o.less, 'aria-label': o.less }, icon('minus'));
    var plus = h('button', { type: 'button', class: 'pp-step__btn', title: o.more, 'aria-label': o.more }, icon('plus'));
    var val = h('span', { class: 'pp-step__val', 'aria-live': 'polite' });
    minus.addEventListener('click', function () { o.onStep(-1); });
    plus.addEventListener('click', function () { o.onStep(1); });
    return {
      el: h('div', { class: 'pp-step', role: 'group', 'aria-label': o.label }, minus, val, plus),
      set: function (v, lo, hi) { val.textContent = o.fmt(v); minus.disabled = !(v > lo); plus.disabled = !(v < hi); }
    };
  }

  /* ------------------------------------------- stand-ins without charts-plus */

  /** bigNumber look-alike (same words and status chip) while charts-plus.js is not linked. */
  function bnFallback(el) {
    var lab = h('p', { class: 'pp-bn__label' }), val = h('p', { class: 'pp-bn__value' }), chip = h('span', { class: 'pp-chip' }), note = h('p', { class: 'pp-bn__note' });
    el.appendChild(h('div', { class: 'pp-bn' }, lab, val, h('div', { class: 'pp-bn__meta' }, chip), note));
    return {
      update: function (o) {
        if (!o) return;
        lab.textContent = o.label || '';
        val.textContent = isNum(o.value) ? rp(o.value) : '—';
        chip.className = 'pp-chip is-' + (o.status || 'none');
        chip.textContent = o.statusLabel || '';
        chip.hidden = !o.statusLabel;
        note.textContent = o.note || '';
        note.hidden = !o.note;
      },
      highlight: function () {}, destroy: function () { clear(el); }
    };
  }
  /** statusBar look-alike: the class bar with counts in words underneath. */
  function sbFallback(el) {
    var cb = classBar(function (k) { toggleClassFilter(k); }), list = h('ul', { class: 'pp-sbf' });
    el.appendChild(cb.el);
    el.appendChild(list);
    return {
      update: function (d) {
        if (!d) return;
        var pot = isNum(d.potential);
        cb.set(pot ? { P: d.potential } : { A: d.acquired || 0, S: d.partly || 0, O: d.notYet || 0, NA: d.noData || 0 }, S().filters.classes);
        clear(list);
        (pot ? [['NA', SB_LABELS.potential, d.potential]] : [['A', SB_LABELS.acquired, d.acquired], ['S', SB_LABELS.partly, d.partly], ['O', SB_LABELS.notYet, d.notYet], ['NA', SB_LABELS.noData, d.noData]])
          .filter(function (x) { return isNum(x[2]); })
          .forEach(function (x) { list.appendChild(h('li', { class: 'pp-sbf__li is-' + (pot ? 'p' : x[0].toLowerCase()) }, h('span', { class: 'pp-dot', 'aria-hidden': 'true' }), h('span', { text: x[1] }), h('b', { text: F().int(x[2]) }))); });
      },
      highlight: function () {}, destroy: function () { clear(el); }
    };
  }

  /** The calm note shown while the Demo data switch is on: nothing in KPR is bank data. */
  function demoNoteEl() {
    return h('p', { class: 'pp-demo-note', role: 'note', hidden: true }, icon('info', 'icon--12'),
      h('span', { text: 'Data contoh aktif. KPR hanya menggunakan data proyek publik dan angka isian Anda.\nAngka di sini tidak berubah.' }));
  }
  function renderDemoNote() {
    var on = !!(ctx && ctx.isDemo && ctx.isDemo());
    [refs.demoNote, refs.demoNoteRail].forEach(function (n) { if (n) n.hidden = !on; });
  }

  function buildOverview(body) {
    var i = inputs(), r = refs;
    var payId = uid('pay');
    r.pay = moneyField({ id: payId, value: i.income, big: true, onChange: function (v) { setInput({ income: v }, { edited: true }); } });
    r.payHint = hint('');
    r.years = tenorPicker({ label: 'Lama angsuran dalam tahun', onPick: function (y) { pickTenor(y); } });
    r.yearsHint = hint('');
    r.dp = seg(DP_OPTS.map(function (v) { return { v: v, label: v + '%' }; }), i.dpPct, function (v) { setInput({ dpPct: v }); syncControls(); }, { big: true, label: 'Uang muka (DP)', cls: 'pp-seg--fill' });
    r.dpHint = hint('');
    var form = h('section', { class: 'pp-ov__form', 'aria-label': 'Angka Anda' },
      h('h2', { class: 'pp-ov__h3', text: 'Angka Anda' }),
      field('Penghasilan bersih', r.pay.el, { forId: payId, sub: 'per bulan', hint: r.payHint, cls: 'pp-field--ov' }),
      h('div', { class: 'pp-field pp-field--ov' }, h('span', { class: 'pp-field__label', text: 'Lama angsuran' }), r.years.el, r.yearsHint),
      h('div', { class: 'pp-field pp-field--ov' }, h('span', { class: 'pp-field__label', text: 'Uang muka (DP)' }), r.dp.el, r.dpHint));

    // 1 · The one big answer. It sticks to the bottom of the column while the inputs scroll, so it stays in view.
    r.ansHost = h('div', { class: 'pp-ov__ans' });
    var answer = h('section', { class: 'pp-ov__result', 'aria-label': 'Hasil' }, r.ansHost);

    // 2 · The matching projects, in the same colours as the map
    var fitId = uid('fit');
    r.fitTitle = h('h2', { class: 'exhibit__title pp-ov__fitT', id: fitId });
    r.fitSub = h('p', { class: 'exhibit__sub' });
    r.sbHost = h('div', { class: 'pp-ov__sb' });
    r.within = seg(WITHIN.map(function (x) { return { v: x.v, label: x.label, title: x.v ? 'Proyek dalam ' + x.v + ' km garis lurus dari Mabes TNI' : 'Semua proyek dalam 30 km' }; }),
      withinNow(), function (v) { setWithin(v); }, { big: true, label: BAND_LABEL, cls: 'pp-seg--fill pp-seg--within' });
    r.fitHint = h('p', { class: 'pp-ov__insight' });
    r.nearT = h('h3', { class: 'pp-ov__h3 pp-ov__nearT' });
    r.nearList = h('ul', { class: 'pp-ov__near' });
    r.nearTog = distToggles('pp-dtog--ov');
    r.fitSrc = h('p', { class: 'exhibit__source', text: 'Sumber: SiKumbang (Kementerian PKP / BP Tapera), situs developer, tabel suku bunga Bank Mandiri · harga per ' + dateLabel(index().meta.generated) });
    var fit = h('section', { class: 'exhibit pp-ov__fit', 'aria-labelledby': fitId }, r.fitTitle, r.fitSub, r.sbHost,
      h('div', { class: 'pp-field pp-field--ov' }, h('span', { class: 'pp-field__label', text: BAND_LABEL }), r.within.el),
      r.fitHint, r.nearT, r.nearList, r.nearTog, r.fitSrc, DST() ? h('p', { class: 'exhibit__source pp-ov__dsrc', text: distSrc() }) : null);

    // 3 · How the answer is worked out (folded: one click away, never in the way)
    r.line2 = h('p', { class: 'pp-ov__line' });
    r.basis = h('p', { class: 'pp-ov__basis' });
    r.how = h('details', { class: 'pp-note pp-ov__how' }, h('summary', { class: 'pp-note__s' }, icon('info', 'icon--12'), h('span', { text: 'Cara menghitungnya' })),
      h('div', { class: 'pp-note__b' }, r.line2, r.basis));
    r.demoNote = demoNoteEl();
    r.live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    r.mini = h('p', { class: 'pp-ov__mini', 'aria-hidden': 'true' });
    // The short-screen answer line sticks to the TOP of the column, so it never sits over an input (C-08 accept: the DP control is never covered).
    body.appendChild(h('div', { class: 'pp-ov' }, r.mini, form, answer, fit, r.how, r.demoNote, r.live));

    var BN = plus('bigNumber'), SB = plus('statusBar');
    charts.ovAns = BN ? BN(r.ansHost, answerCfg()) : bnFallback(r.ansHost);
    if (!BN) charts.ovAns.update(answerCfg());
    charts.ovBar = SB
      ? SB(r.sbHost, fitData(), { labels: SB_LABELS, unit: 'proyek', size: 'lg', tableToggle: false, label: 'Proyek perumahan baru menurut keterjangkauan',
        onClick: function (p) { var k = WORD_CLS[p.key]; if (k) toggleClassFilter(k); } })
      : sbFallback(r.sbHost);
    if (!SB) charts.ovBar.update(fitData());
  }

  function toggleClassFilter(k) {
    var c = S().filters.classes;
    setFilter({ classes: c.length === 1 && c[0] === k ? [] : [k] });
  }

  function basisLine() {
    if (!R || !R.pan.scheme) return '';
    return 'Menggunakan ' + F().pct(R.inp.dsr, 0) + ' penghasilan bersih untuk angsuran (asumsi) dan ' + schemeShort(R.pan.scheme) + ' (' + pathText(R.pan.path || KM().ratePath(R.pan.scheme, R.pan.T * 12, R.inp)) + '). Ubah di tampilan Detail.';
  }
  function profileLine() {
    var i = inputs(), cap = R && R.pan.cap;
    var who = i.personaId ? PERSONA_SHORT[i.personaId] + (i.personaEdited ? ' (diubah)' : '') : 'Profil Anda';
    var rk = (RANKS.filter(function (x) { return x.id === i.rankGroup; })[0] || {}).label || '';
    return who + ' · ' + rk + (i.useBirth ? '' : ', usia ' + i.age) + (cap ? ' · pensiun usia ' + cap.bupAge : '');
  }

  /** The big answer as a bigNumber: price, a status chip in words and one plain line. */
  function answerCfg() {
    var o = { label: 'Harga rumah yang terjangkau hingga', value: null, format: 'rp', status: 'none', statusLabel: null, note: '' };
    if (!R) return o;
    var pan = R.pan, c = R.countsBase, fm = F();
    if (pan.state === 'noIncome') {
      o.label = 'Isi penghasilan bersih untuk melihat harga rumah yang terjangkau';
      o.status = 'potential'; o.statusLabel = 'Menunggu penghasilan bersih';
      o.note = 'Sampai penghasilan diisi, setiap proyek di peta berwarna biru.';
    } else if (pan.state === 'retired') {
      o.label = 'KPR tidak dapat disimulasikan'; o.statusLabel = 'Telah mencapai usia pensiun'; o.note = 'Profil ini telah mencapai usia pensiun.';
    } else if (pan.state === 'noScheme') {
      o.statusLabel = 'Tidak ada skema aktif'; o.note = 'Tidak ada skema KPR aktif untuk tenor ' + years(pan.T) + '.';
    } else if (pan.state === 'noBudget') {
      o.status = 'bad'; o.statusLabel = 'Tidak ada ruang untuk KPR';
      o.note = 'Angsuran lain telah menghabiskan seluruh batas ' + fm.pct(R.inp.dsr, 0) + '. Kurangi di tampilan Detail.';
    } else if (isNum(pan.maxPrice)) {
      o.value = pan.maxPrice;
      o.status = c.A ? 'ok' : (c.S ? 'mid' : 'bad');
      o.statusLabel = c.A ? fm.int(c.A) + (c.A === 1 ? ' proyek sesuai' : ' proyek sesuai') : (c.S ? 'Hanya proyek yang hampir sesuai' : 'Belum ada proyek yang sesuai');
      o.note = 'Angsuran sampai ' + rpLimit(pan.budget) + ' per bulan selama ' + years(pan.T) + (pan.binding === 'cash' ? ', dibatasi dana tunai yang tersedia' : '') + '.';
    }
    return o;
  }
  /** Status bar data: blue potential before a take-home pay, then Affordable · Stretch · Out of reach. */
  function fitData() {
    if (!R) return { potential: 0 };
    var c = R.countsBase;
    if (potentialOnly()) return { acquired: null, partly: null, notYet: null, noData: null, potential: R.base.length };
    return { acquired: c.A, partly: c.S, notYet: c.O, noData: c.NA || null, potential: null };
  }

  function renderOverview() {
    var r = refs, i = inputs();
    if (!r.ansHost || !R) return;
    var pan = R.pan, c = R.countsBase, n = R.base.length, fm = F();
    r.pay.set(i.income);
    r.payHint.textContent = i.personaId && !i.personaEdited ? 'Contoh: penghasilan umum ' + PERSONA_SHORT[i.personaId] + ' (perkiraan). Isi angka sendiri.' : 'Penghasilan bersih setelah potongan, misalnya 7400000 atau 7,4 jt.';
    var cap = pan.cap ? pan.cap.years : 30;
    r.years.set(pan.T || 0, pan.tenorMin || 1, cap);
    r.yearsHint.textContent = pan.state === 'retired' ? 'Profil ini telah mencapai usia pensiun.' : 'Paling lama untuk profil ini: ' + years(cap) + (pan.cap && pan.cap.limitedBy === 'usia' ? ' (pensiun usia ' + pan.cap.bupAge + ').' : '.');
    r.dp.set(i.dpPct);
    r.dpHint.textContent = i.dpPct === 0 ? 'DP 0% berlaku sampai 31 Des 2026 (PADG 30/2025), sesuai kebijakan bank.' : (isNum(pan.maxPrice) && pan.maxPrice > 0 ? 'Sekitar ' + rp(pan.maxPrice * i.dpPct / 100) + ' tunai pada harga tertinggi, ditambah biaya.' : 'Dibayar tunai saat akad.');
    // 1 · answer
    if (charts.ovAns) safe(function () { charts.ovAns.update(answerCfg()); });
    var s = pan.sched && pan.sched.segments;
    r.line2.textContent = pan.state === 'ok' && isNum(pan.maxPlafond) ? 'Plafond sampai ' + rp(pan.maxPlafond) + ' selama ' + years(pan.T) + '. ' + (s && s.length > 1 ? 'Angsuran mulai ' + rpFull(s[0].installment) + ' dan dapat naik menjadi ' + rpFull(pan.sched.max) + ' setelah masa fixed berakhir. Batas diperiksa dengan angsuran tertinggi.' : (s ? 'Angsuran tetap ' + rpFull(s[0].installment) + ' sepanjang tenor.' : '')) : '';
    r.basis.textContent = pan.state === 'ok' || pan.state === 'noBudget' ? basisLine() + ' Profil: ' + profileLine() + '.' : '';
    r.how.hidden = !r.line2.textContent && !r.basis.textContent;
    // 2 · matching projects
    var within = withinNow(), km = within > 0 ? within : 30;
    r.fitTitle.textContent = potentialOnly() ? fm.int(n) + ' proyek perumahan baru dalam ' + km + ' km dari Mabes TNI'
      : (c.A ? fm.int(c.A) + ' dari ' + fm.int(n) + ' proyek baru dalam ' + km + ' km sesuai anggaran ini' : 'Belum ada proyek baru dalam ' + km + ' km yang sesuai anggaran ini');
    r.fitSub.textContent = potentialOnly() ? 'Jumlah proyek baru · isi penghasilan bersih untuk mewarnainya menurut keterjangkauan'
      : 'Jumlah proyek baru menurut keterjangkauan · klik satu warna untuk menampilkan proyek itu saja di peta';
    if (charts.ovBar) safe(function () {
      charts.ovBar.update(fitData());
      var f = S().filters.classes;
      if (charts.ovBar.highlight) charts.ovBar.highlight(f.length === 1 && CLS[f[0]] ? CLS[f[0]].word : null);
    });
    r.within.set(within);
    var hintTxt = '';
    if (pan.state === 'ok' && !c.A) hintTxt = 'Coba tenor lebih panjang, DP lebih kecil atau jarak lebih luas.';
    else if (pan.state === 'ok' && R.flppA) hintTxt = fm.int(R.flppA) + (R.flppA === 1 ? ' di antaranya rumah subsidi' : ' di antaranya rumah subsidi') + ' (FLPP, bunga fixed 5%, batas harga Rp185 juta).';
    r.fitHint.textContent = hintTxt;
    r.fitHint.hidden = !hintTxt;
    r.mini.textContent = pan.state === 'ok' && isNum(pan.maxPrice) ? 'Hingga ' + rp(pan.maxPrice) + ' · ' + fm.int(c.A) + ' proyek sesuai' : '';
    r.mini.hidden = !r.mini.textContent;
    renderNearList();
    renderDemoNote();
    announce();
  }

  /**
   * Up to three nearest projects whose price is at or below the maximum shown in the answer (UX_FIX_PLAN C-04);
   * when none fits, the nearest within 15% above it, titled "hampir sesuai" with an amber chip. Each row has a
   * why line: price · instalment a month · distance. FLPP is named only when the project qualifies (kpr-math flppOk).
   * Nearest = shortest driving time from KCP (MCD.distance, v3); straight line from Mabes TNI without it.
   */
  function renderNearList() {
    var r = refs;
    clear(r.nearList);
    var res = potentialOnly() || !R.pan || R.pan.state !== 'ok' ? { fit: false, rows: [] } : KM().fitsList(sortNear(R.base), R.pan.maxPrice, { n: 3, stretchPct: STRETCH });
    var pick = res.rows, kcp = !!DST();
    clear(r.nearT);
    if (pick.length) {
      r.nearT.appendChild(h('span', { text: (res.fit ? 'Proyek terdekat yang sesuai' : 'Proyek terdekat yang hampir sesuai') }));
      if (!res.fit) r.nearT.appendChild(h('span', { class: 'pp-chip is-mid pp-chip--txt', text: 'Hingga 15% di atas batas' }));
    }
    r.nearT.hidden = !pick.length;
    r.nearList.hidden = !pick.length;
    if (r.nearTog) r.nearTog.hidden = !pick.length;
    pick.forEach(function (x) {
      var price = isNum(x.r.price) ? x.r.price : x.p.priceMin;
      var cls = res.fit ? 'a' : 's';
      var b = h('button', { type: 'button', class: 'pp-near is-' + cls, title: 'Tampilkan di peta dan buka detailnya' },
        h('span', { class: 'pp-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'pp-near__t', text: x.p.name + (x.r.isFlpp ? ' · FLPP' : '') }),
        h('span', { class: 'pp-near__m', text: rp(price) + ' · angsuran ' + (isNum(x.r.max) ? rp(KM().dispRp(x.r.max)) : '—') + '/bulan' }),
        distEl(x.p, { kcp: kcp, mabes: !kcp, cls: 'pp-near__d' }),
        icon('chev-r', 'pp-near__go'));
      b.addEventListener('click', function () { selectProject(x.p.id, { fly: true }); });
      r.nearList.appendChild(h('li', null, b));
    });
    var sig = pick.map(function (x) { return x.p.id; }).join(',');
    if (sig !== r.nearSig) { r.nearSig = sig; stagger(r.nearList.children); }
  }

  var lastAnnounce = '';
  var announceT = 0;
  function announce() {
    clearTimeout(announceT);
    announceT = setTimeout(function () {
      if (!R || !refs.live) return;
      var t = R.pan.state === 'ok' ? 'Harga rumah tertinggi ' + F().rp(R.pan.maxPrice).replace(/ (mn|jt)$/, ' juta').replace(/ (bn|M)$/, ' miliar') + '. ' + R.counts.A + ' proyek terjangkau.' : '';
      if (t && t !== lastAnnounce) { refs.live.textContent = t; lastAnnounce = t; }
    }, 800);
  }

  /* ================================================== Deep dive: left rail */

  function grp(title, kids, cls) {
    return h('section', { class: 'pp-grp' + (cls ? ' ' + cls : '') }, h('h3', { class: 'pp-grp__t', text: title }), kids);
  }
  function rangeIn(o) {
    var inp = h('input', { type: 'range', class: 'pp-range', min: String(o.min), max: String(o.max), step: String(o.step || 1), value: String(o.value), 'aria-label': o.label });
    inp.addEventListener('input', function () { o.onInput(parseFloat(inp.value)); });
    return {
      el: inp,
      set: function (v, lo, hi, text) {
        if (lo != null) inp.min = String(lo);
        if (hi != null) inp.max = String(hi);
        if (DOC.activeElement !== inp) inp.value = String(v);
        if (text) inp.setAttribute('aria-valuetext', text);
        var a = parseFloat(inp.min), b = parseFloat(inp.max);
        inp.style.setProperty('--pp-fill', (b > a ? (clamp(v, a, b) - a) / (b - a) * 100 : 0) + '%');
      }
    };
  }
  function familyEn(f) {
    var s = String(f || '');
    var kids = /(\d+) anak/.exec(s);
    return (/menikah/.test(s) ? 'menikah' : 'lajang') + (kids ? ', ' + kids[1] + (kids[1] === '1' ? ' anak' : ' anak') : '');
  }
  function schemeOptions() {
    var c = KC(), i = inputs(), T = R ? R.pan.T : 20, list = schemesList(), groups = {};
    list.forEach(function (s) {
      var st = KM().schemeStatus(s, { asOf: asOf(), T: T, mode: 'panel', income: i.income, jointIncome: i.jointOn ? i.jointIncome : 0, married: i.married, showPlanned: i.showPlanned, cfg: c });
      var g = s.referenceOnly ? 'Reference' : (st.code === 'expired' ? 'Ended' : (TIER_LABEL[s.tier] ? s.tier : 'Ended'));
      (groups[g] = groups[g] || []).push({ v: s.id, label: schemeName(s) + (st.ok ? '' : ' — ' + st.reason), disabled: !st.ok && s.id !== i.schemeId });
    });
    return TIER_ORDER.filter(function (g) { return groups[g]; }).map(function (g) { return { group: TIER_LABEL[g], items: groups[g] }; });
  }

  function buildRail(body) {
    var i = inputs(), r = refs, c = KC() || {};
    r.personaBtns = {};
    var grid = h('div', { class: 'pp-personas', role: 'group', 'aria-label': 'Contoh profil TNI' });
    (c.personas || []).forEach(function (p) {
      var b = h('button', { type: 'button', class: 'pp-persona', 'aria-pressed': 'false',
        title: p.label + ' · usia ' + p.ageDefault + ' · ' + familyEn(p.family) + ' · ' + rp(p.netIncome) + ' per bulan (perkiraan)' },
        h('span', { class: 'pp-persona__n', text: PERSONA_SHORT[p.id] || p.id }), h('span', { class: 'pp-persona__v', text: rp(p.netIncome) }));
      b.addEventListener('click', function () { applyPersona(p.id); });
      r.personaBtns[p.id] = b;
      grid.appendChild(b);
    });
    r.oldTukin = sw('Tunjangan lama (Perpres 102/2018)', i.oldTukin, function (on) { inputs().oldTukin = on; if (inputs().personaId) applyPersona(inputs().personaId); },
      { title: 'Pembayaran tunjangan kinerja Perpres 42/2026 belum dikonfirmasi. Gunakan angka lama agar simulasi lebih aman.' });
    r.personaNote = h('p', { class: 'pp-hint' });
    var who = grp('Calon pembeli', [grid, r.oldTukin.el, r.personaNote,
      note('Tentang contoh profil', [COPY.persona, 'Pangkat, usia dan keluarga mengikuti contoh profil. Ubah isian di bawah jika perlu.\nSumber: tabel tunjangan Perpres 42/2026, skala gaji PP 6/2024, uang lauk pauk dan tunjangan keluarga, setelah potongan ASABRI dan BPJS.'])]);

    var incId = uid('inc');
    r.income = moneyField({ id: incId, value: i.income, onChange: function (v) { setInput({ income: v }, { edited: true }); } });
    r.jointSw = sw('Penghasilan pasangan', i.jointOn, function (on) { setInput({ jointOn: on }); syncControls(); });
    r.joint = moneyField({ value: i.jointIncome, aria: 'Penghasilan bersih pasangan per bulan', placeholder: 'Penghasilan bersih pasangan', onChange: function (v) { setInput({ jointIncome: v }, { edited: true }); } });
    var exId = uid('ex');
    r.existing = moneyField({ id: exId, value: i.existing, onChange: function (v) { setInput({ existing: v || 0 }, { edited: true }); } });
    var income = grp('Penghasilan', [
      field('Penghasilan bersih', r.income.el, { forId: incId, sub: 'per bulan' }),
      r.jointSw.el, r.joint.el,
      field('Angsuran lain', r.existing.el, { forId: exId, sub: 'per bulan', hint: hint('Masukkan semua angsuran: kredit bank lain, KKB, kartu kredit, paylater, koperasi dan potongan gaji TWP.') })
    ]);

    r.dsrSeg = seg([{ v: 0.3, label: '30%' }, { v: 0.4, label: '40%' }, { v: 0.7, label: '70%*', title: 'Hanya untuk program dengan gaji melalui Mandiri. Konfirmasikan dengan kebijakan kredit' }],
      dsrNow(), function (v) { setInput({ dsr: v }); syncControls(); }, { label: 'Porsi penghasilan untuk angsuran (DSR)' });
    r.dsrRange = rangeIn({ min: 30, max: 70, step: 1, value: Math.round(dsrNow() * 100), label: 'Persen DSR', onInput: function (v) { setInput({ dsr: v / 100 }); } });
    r.dsrOut = h('span', { class: 'pp-out' });
    r.ageMode = seg([{ v: false, label: 'Usia' }, { v: true, label: 'Bulan lahir' }], !!i.useBirth, function (v) { setInput({ useBirth: v }); syncControls(); }, { label: 'Usia atau bulan lahir' });
    r.ageInp = h('input', { type: 'number', class: 'input input--num pp-age', min: '18', max: '70', step: '1', value: String(i.age), 'aria-label': 'Usia dalam tahun' });
    r.ageInp.addEventListener('change', function () { var v = parseInt(r.ageInp.value, 10); if (isNum(v)) setInput({ age: clamp(v, 18, 70), tenorTouched: false }, { edited: true }); });
    r.birthInp = h('input', { type: 'month', class: 'input pp-birth', value: i.birthYm || '', 'aria-label': 'Bulan lahir (TTTT-BB)', placeholder: 'TTTT-BB', max: asOf().slice(0, 7) });
    r.birthInp.addEventListener('change', function () { setInput({ birthYm: r.birthInp.value, tenorTouched: false }, { edited: true }); });
    r.rank = selectEl(RANKS.map(function (x) { return { v: x.id, label: x.label }; }), i.rankGroup, function (v) { setInput({ rankGroup: v, tenorTouched: false }, { edited: true }); }, 'Golongan pangkat');
    r.capHint = hint('', 'pp-hint--mono');
    var limits = grp('Batas', [
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label' }, 'Porsi penghasilan untuk angsuran (DSR) ', assumptionTag()),
        h('div', { class: 'pp-row' }, r.dsrSeg.el, r.dsrOut), r.dsrRange.el),
      note('Tentang DSR', ['Mandiri tidak memublikasikan batas DSR untuk KPR reguler.\nBawaan 40%, batas atas yang umum di perbankan (30–40%).\n70% hanya berlaku untuk program dengan gaji melalui Mandiri.', 'Nilai bawaan dari Data & Privasi › Asumsi. Perubahan di sini hanya berlaku sampai dashboard dikunci.']),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Usia dan pangkat' }), r.ageMode.el,
        h('div', { class: 'pp-row pp-row--2' }, r.ageInp, r.birthInp, r.rank.el), r.capHint),
      note('Tentang batas usia', [COPY.age])
    ]);

    r.tenor = tenorPicker({ label: 'Tenor dalam tahun', onPick: function (y) { pickTenor(y); } });
    r.tenorOut = h('span', { class: 'pp-out' });
    r.dpSeg = seg(DP_OPTS.map(function (v) { return { v: v, label: v + '%' }; }), i.dpPct, function (v) { setInput({ dpPct: v }); syncControls(); }, { label: 'Uang muka (DP)' });
    r.dpInp = h('input', { type: 'number', class: 'input input--num pp-dpin', min: '0', max: '90', step: '1', value: String(i.dpPct), 'aria-label': 'Persen uang muka' });
    r.dpInp.addEventListener('change', function () { var v = parseFloat(r.dpInp.value); if (isNum(v)) { setInput({ dpPct: clamp(Math.round(v), 0, 90) }); syncControls(); } });
    r.dpNote = hint('');
    r.scheme = selectEl(schemeOptions(), i.schemeId, function (v) { setInput({ schemeId: v }); }, 'Skema KPR', 'pp-scheme');
    r.schemeInfo = h('p', { class: 'pp-hint pp-hint--mono' });
    r.schemeWarn = h('p', { class: 'pp-warn', hidden: true });
    r.float = rangeIn({ min: 11.75, max: 13.5, step: 0.05, value: i.floatingPct, label: 'Bunga floating setelah masa fixed', onInput: function (v) { setInput({ floatingPct: Math.round(v * 100) / 100 }); } });
    r.floatOut = h('span', { class: 'pp-out' });
    r.floatNote = hint('');
    r.stress = seg([0, 100, 200, 300].map(function (b) { return { v: b, label: '+' + b / 100 + '%' }; }), i.stressBps, function (v) { setInput({ stressBps: v }); }, { label: 'Uji kenaikan bunga' });
    r.basis = seg([{ v: 'max', label: 'Angsuran tertinggi' }, { v: 'first', label: 'Angsuran promo' }], i.basis, function (v) { setInput({ basis: v }); }, { label: 'Plafond dihitung dari' });
    r.basisWarn = h('p', { class: 'pp-warn', text: 'Plafond dihitung dari angsuran promo. Angsuran setelah masa fixed dapat melewati batas DSR.' });
    var loan = grp('Pinjaman', [
      h('div', { class: 'pp-field' }, h('div', { class: 'pp-row pp-row--between' }, h('span', { class: 'pp-field__label', text: 'Tenor' }), r.tenorOut), r.tenor.el),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label' }, 'Uang muka (DP) ', assumptionTag('bawaan 10%: asumsi')), h('div', { class: 'pp-row' }, r.dpSeg.el, r.dpInp), r.dpNote),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Skema' }), r.scheme.el, r.schemeInfo, r.schemeWarn),
      note('Tentang Gold, Silver dan Bronze', [COPY.category, COPY.topdev]),
      h('div', { class: 'pp-field' }, h('div', { class: 'pp-row pp-row--between' }, h('span', { class: 'pp-field__label', text: 'Bunga floating setelah masa fixed' }), r.floatOut), r.float.el, r.floatNote),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Uji kenaikan bunga floating' }), r.stress.el),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Plafond dihitung dari' }), r.basis.el, r.basisWarn)
    ]);

    r.flpp = sw('FLPP untuk unit subsidi', i.useFlpp, function (on) { setInput({ useFlpp: on }); });
    r.married = sw('Menikah (batas FLPP Rp14 juta)', i.married, function (on) { setInput({ married: on }, { edited: true }); });
    r.firstHome = sw('Rumah pertama', i.firstHome, function (on) { setInput({ firstHome: on }); });
    r.flppTenor = seg([{ v: 20, label: '20 th' }, { v: 40, label: '40 th', title: 'Halaman Mandiri menyebut sampai 40 tahun. Kesiapan sistem belum diperiksa.' }], i.flppTenorCap, function (v) { setInput({ flppTenorCap: v }); }, { label: 'Tenor FLPP' });
    r.cashSw = sw('Batasi dengan dana tunai', i.cashOn, function (on) { setInput({ cashOn: on }); syncControls(); });
    r.cash = moneyField({ value: i.cash, aria: 'Dana tunai tersedia', placeholder: 'Dana tunai untuk DP dan biaya', onChange: function (v) { setInput({ cash: v }); } });
    r.cashRegion = selectEl(REGIONS.map(function (x) { return { v: x, label: x }; }), i.cashRegion, function (v) { setInput({ cashRegion: v }); }, 'Wilayah acuan pajak beli rumah (BPHTB)');
    r.cashBox = h('div', { class: 'pp-sub' }, r.cash.el, h('span', { class: 'pp-field__label', text: 'Wilayah acuan (BPHTB)' }), r.cashRegion.el);
    r.planned = sw('Tampilkan skema rencana (belum berlaku)', i.showPlanned, function (on) { setInput({ showPlanned: on }); });
    var opts = grp('Subsidi dan dana tunai', [
      r.flpp.el, r.married.el, r.firstHome.el,
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Tenor FLPP' }), r.flppTenor.el),
      note('Tentang FLPP', [COPY.flpp, 'FLPP: bunga fixed 5% untuk rumah tapak dan 6% untuk apartemen subsidi.\nTenor bawaan 20 tahun. Halaman Mandiri menyebut sampai 40 tahun.']),
      r.cashSw.el, r.cashBox, r.planned.el, note('Tentang skema rencana', [COPY.planned, 'Diumumkan untuk penghasilan sekitar Rp17 juta dan rumah sampai Rp500 juta (CNN Indonesia, 30 Sep 2026).'])
    ]);

    r.openCalc = h('button', { type: 'button', class: 'btn btn--primary btn--lg pp-opencalc', 'aria-keyshortcuts': 'K', title: 'Buka kalkulator KPR (K)' },
      h('span', { text: 'Buka kalkulator KPR' }), icon('chev-r'));
    r.openCalc.addEventListener('click', function () { openCalc({}); });
    var calcCta = h('div', { class: 'pp-cta' }, r.openCalc,
      h('p', { class: 'pp-hint', text: 'Angsuran per tahun, total biaya dan angsuran per tenor.\nUji kenaikan bunga, biaya di muka dan simulasi siap cetak.' }));
    r.demoNoteRail = demoNoteEl();
    r.live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    body.appendChild(h('div', { class: 'pp-rail' }, r.demoNoteRail, calcCta, who, income, limits, loan, opts, r.live));
  }

  function buildPinned() {
    var r = refs;
    r.pinV = h('span', { class: 'pp-pin__v' });
    r.pinK = h('span', { class: 'pp-pin__k', text: 'Harga rumah tertinggi' });
    r.pinL = h('span', { class: 'pp-pin__l' });
    r.pinBar = classBar(function (k) { toggleClassFilter(k); });
    r.pin = h('div', { class: 'pp-pin' }, h('div', { class: 'pp-pin__top' }, r.pinK, r.pinV), r.pinL, r.pinBar.el);
    var foot = page && page.el && page.el.querySelector('.pg-foot');
    if (foot) page.el.insertBefore(r.pin, foot);
  }

  var schemeOptKey = '';
  function renderRail() {
    var r = refs, i = inputs();
    if (!r.income || !R) return;
    var pan = R.pan, fm = F();
    Object.keys(r.personaBtns).forEach(function (id) { r.personaBtns[id].setAttribute('aria-pressed', i.personaId === id ? 'true' : 'false'); });
    var pz = i.personaId ? personaById(i.personaId) : null;
    r.personaNote.textContent = pz ? (i.personaEdited ? 'Diubah dari ' + PERSONA_SHORT[pz.id] + '. ' : '') + pz.label + ' · usia ' + pz.ageDefault + ' · ' + familyEn(pz.family) + ' · penghasilan merupakan perkiraan.' : 'Angka Anda sendiri, tidak disimpan.';
    r.dsrOut.textContent = fm.pct(dsrNow(), 0);
    r.dsrRange.set(Math.round(dsrNow() * 100), 30, 70, Math.round(dsrNow() * 100) + ' persen');
    var cap = pan.cap || { years: 0, bupAge: 0 };
    var rk = (RANKS.filter(function (x) { return x.id === i.rankGroup; })[0] || {}).label || '';
    r.capHint.textContent = pan.state === 'retired' ? 'Profil ini telah mencapai usia pensiun, sehingga KPR tidak dapat disimulasikan.'
      : 'Tenor paling lama ' + years(cap.years) + ': ' + (cap.limitedBy === 'produk' ? 'batas produk 30 tahun.' : 'batas usia pensiun (BUP) ' + cap.bupAge + ' untuk ' + rk + (cap.transition ? ' (masa transisi UU 3/2025).' : '.'))
        + (cap.transitionHint ? ' Usia ini mungkin masuk aturan transisi UU 3/2025 (BUP 53 atau 54). Isi bulan lahir untuk hasil yang tepat.' : '');
    r.tenor.set(pan.T || 0, pan.tenorMin || 1, Math.max(pan.tenorMin || 1, cap.years || 1));
    r.tenorOut.textContent = yrs(pan.T || 0) + ' · paling lama ' + (cap.years || 0) + ' tahun';
    r.dpNote.textContent = i.dpPct === 0 ? 'DP 0% berlaku sampai 31 Des 2026 (PADG 30/2025), tetap sesuai kebijakan bank.' : '';
    r.dpNote.hidden = !r.dpNote.textContent;
    var key = [pan.T, i.income, i.jointOn, i.jointIncome, i.married, i.showPlanned, i.schemeId, asOf()].join('|');
    if (key !== schemeOptKey) { schemeOptKey = key; r.scheme.fill(schemeOptions(), i.schemeId); }
    var sch = pan.scheme;
    r.schemeInfo.textContent = sch ? (pan.switched ? 'Skema untuk tenor ini: ' + schemeShort(sch) + ' (' + pan.switched.reason.toLowerCase() + ' untuk ' + schemeShort(pan.switched.from) + '). ' : '')
      + pathText(pan.path || KM().ratePath(sch, (pan.T || 1) * 12, R.inp)) + (sch.validUntil ? ' · sampai ' + dateLabel(sch.validUntil) : '') : 'Tidak ada skema aktif untuk tenor ini.';
    var sStatus = sch ? KM().schemeStatus(sch, { asOf: asOf(), T: pan.T, mode: 'panel', cfg: KC() }) : null;
    r.schemeWarn.hidden = !(sch && sch.tier === 'Top Developer');
    r.schemeWarn.textContent = 'Hanya untuk proyek mitra Top Developer. Proyek lain menggunakan skema Silver dengan angsuran terendah (bertanda “otomatis”).';
    void sStatus;
    var fixed = pan.fixedForTenor;
    r.float.set(i.floatingPct, 11.75, 13.5, fm.num(i.floatingPct, 2) + ' persen');
    r.float.el.disabled = !!fixed;
    var cfgK = KC() || {};
    r.floatOut.textContent = ratePct(i.floatingPct) + ' · SBDK ' + ratePct((cfgK.sbdk || {}).kprKpaPct);
    r.floatNote.textContent = fixed ? 'Bunga fixed sepanjang tenor, sehingga bunga floating dan uji kenaikan bunga tidak berpengaruh.' : 'Mandiri mencantumkan floating 13% setelah masa fixed (Kontan, 23 Agu 2026). BI Rate ' + ratePct((cfgK.biRate || {}).pct) + '.';
    r.stress.set(i.stressBps);
    r.stress.btns.forEach(function (b) { b.disabled = !!fixed; });
    r.basis.set(i.basis);
    r.basisWarn.hidden = i.basis !== 'first';
    r.flppTenor.set(i.flppTenorCap);
    r.cashBox.hidden = !i.cashOn;
    // pinned outputs
    var big = null, line = '';
    if (pan.state === 'noIncome') line = 'Isi penghasilan bersih untuk menghitung harga rumah tertinggi.';
    else if (pan.state === 'noBudget') line = 'Angsuran lain telah melewati batas DSR.';
    else if (pan.state === 'retired') line = 'Profil ini telah mencapai usia pensiun.';
    else if (pan.state === 'noScheme') line = 'Tidak ada skema aktif untuk tenor ' + pan.T + ' tahun.';
    else if (isNum(pan.maxPrice)) {
      big = pan.maxPrice;
      var s = pan.sched;
      line = (s ? (s.segments.length > 1 ? rpFull(s.first) + ' → ' + rpFull(s.max) : rpFull(s.first)) + ' per bulan · ' : '') + 'dibatasi ' + (pan.binding === 'cash' ? 'dana tunai' : 'DSR');
    }
    countOnce(r.pinV, big, rp);            /* the pinned price counts up once, the first time it shows (item 38) */
    r.pinL.textContent = line;
    r.pinBar.set(potentialOnly() ? { P: R.base.length } : R.countsBase, S().filters.classes);
    renderDemoNote();
    announce();
  }

  /** Writes state back into every control (after persona picks and resets). */
  function syncControls() {
    var r = refs, i = inputs();
    if (r.pay) r.pay.set(i.income);
    if (r.dp) r.dp.set(i.dpPct);
    if (!r.income) return;
    r.income.set(i.income);
    r.oldTukin.set(i.oldTukin);
    r.jointSw.set(i.jointOn);
    r.joint.el.hidden = !i.jointOn;
    r.joint.set(i.jointIncome);
    r.existing.set(i.existing);
    r.dsrSeg.set([0.3, 0.4, 0.7].indexOf(dsrNow()) >= 0 ? dsrNow() : null);
    r.ageMode.set(!!i.useBirth);
    r.ageInp.hidden = !!i.useBirth; r.birthInp.hidden = !i.useBirth;
    if (DOC.activeElement !== r.ageInp) r.ageInp.value = String(i.age);
    if (DOC.activeElement !== r.birthInp) r.birthInp.value = i.birthYm || '';
    r.rank.set(i.rankGroup);
    r.dpSeg.set(i.dpPct);
    if (DOC.activeElement !== r.dpInp) r.dpInp.value = String(i.dpPct);
    r.scheme.set(i.schemeId);
    r.flpp.set(i.useFlpp); r.married.set(i.married); r.firstHome.set(i.firstHome);
    r.cashSw.set(i.cashOn); r.cash.set(i.cash); r.cashRegion.set(i.cashRegion);
    r.planned.set(i.showPlanned);
    var m = veil();
    r.income.mask(m && i.personaEdited, i.income);
    r.joint.mask(m, i.jointIncome);
    r.existing.mask(m && i.personaEdited, i.existing);
    r.cash.mask(m, i.cash);
  }

  /* ============================================ Deep dive: right rail (tabs) */

  var RR_TABS = [{ id: 'projects', label: 'Proyek' }, { id: 'areas', label: 'Area' }];
  var hoverId = null;
  function setHoverId(id) { if (hoverId === id) return; hoverId = id; requestMap(); }

  function buildRightRail() {
    var r = refs;
    r.rrTabs = {}; r.rrPanels = {};
    var tl = h('div', { class: 'pp-tabs', role: 'tablist', 'aria-label': 'Daftar' });
    RR_TABS.forEach(function (t, k) {
      var b = h('button', { type: 'button', role: 'tab', class: 'pp-tab', id: 'pp-tab-' + t.id, 'aria-controls': 'pp-panel-' + t.id, 'aria-selected': 'false', tabIndex: -1 },
        h('span', { text: t.label }), h('span', { class: 'pp-tab__n' }));
      b.addEventListener('click', function () { setRailTab(t.id); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var n = RR_TABS[(k + (e.key === 'ArrowLeft' ? -1 : 1) + RR_TABS.length) % RR_TABS.length].id;
        setRailTab(n); r.rrTabs[n].focus();
      });
      r.rrTabs[t.id] = b;
      tl.appendChild(b);
      r.rrPanels[t.id] = h('div', { class: 'pp-panel', role: 'tabpanel', id: 'pp-panel-' + t.id, 'aria-labelledby': 'pp-tab-' + t.id, hidden: true });
    });
    r.rrClose = h('button', { type: 'button', class: 'btn btn--secondary btn--lg pp-rr__close', title: 'Tutup daftar' }, icon('close'), h('span', { text: 'Tutup' }));
    r.rrClose.addEventListener('click', function () { r.rr.classList.remove('is-open'); });
    r.rrTabList = tl;
    r.rrHead = h('header', { class: 'pp-rr__head' }, tl, r.rrClose);
    r.rr = h('aside', { class: 'rail rail--r panel panel--sheet pp-rr', 'aria-label': 'Proyek dan area', 'data-slideover': '', 'data-slideover-label': 'Buka daftar & grafik' },
      r.rrHead,
      h('div', { class: 'pp-rr__body' }, RR_TABS.map(function (t) { return r.rrPanels[t.id]; })));
    host.appendChild(r.rr);
    r.rrOpen = h('button', { type: 'button', class: 'btn btn--secondary btn--lg pp-rr__open' }, icon('menu'), h('span', { text: 'Buka daftar & grafik' }));
    r.rrOpen.addEventListener('click', function () { r.rr.classList.add('is-open'); });
    r.rrClose.addEventListener('click', function () { try { r.rrOpen.focus({ preventScroll: true }); } catch (e) { /* ignore */ } });
    var railScroll = page && page.el && page.el.querySelector('.pp-rail');
    if (railScroll) railScroll.insertBefore(r.rrOpen, railScroll.firstChild);
    buildProjectsPanel(r.rrPanels.projects);
    buildAreasPanel(r.rrPanels.areas);
    if (RR_TABS.every(function (t) { return t.id !== S().railTab; })) S().railTab = 'projects';
    setRailTab(S().railTab, true);
  }
  function setRailTab(id, quiet) {
    var r = refs;
    var was = S().railTab;
    S().railTab = id;
    if ((was === 'areas') !== (id === 'areas')) requestMap();
    RR_TABS.forEach(function (t) {
      var on = t.id === id;
      r.rrTabs[t.id].setAttribute('aria-selected', on ? 'true' : 'false');
      r.rrTabs[t.id].tabIndex = on ? 0 : -1;
      r.rrPanels[t.id].hidden = !on;
    });
    if (!quiet) renderRightRail();
  }

  function chip(label, onClick, o) {
    o = o || {};
    var b = h('button', { type: 'button', class: 'chip pp-fchip', 'aria-pressed': 'false', title: o.title || null }, h('span', { text: label }), o.count ? h('span', { class: 'chip__count' }) : null);
    b.addEventListener('click', function (e) { onClick(e); });
    return b;
  }
  function toggleIn(list, v, solo) {
    if (solo) return list.length === 1 && list[0] === v ? [] : [v];
    var i = list.indexOf(v);
    return i >= 0 ? list.filter(function (x) { return x !== v; }) : list.concat([v]);
  }

  function buildProjectsPanel(el) {
    var r = refs, st = S();
    r.prTitle = h('h2', { class: 'pp-x__t' });
    r.prSub = h('p', { class: 'pp-x__sub', text: DST() ? 'Proyek baru dalam 30 km dari Mabes TNI.\nHarga awal, angsuran sesuai isian, kelas dan jarak dari KCP.'
      : 'Proyek baru dalam 30 km dari Mabes TNI.\nHarga awal, angsuran sesuai isian, dan kelasnya.' });
    r.bandChips = {};
    /* V3_REPORT §4.7: the km bands are straight-line distances from Mabes TNI (the 30 km circle), while each row
       shows the road distance from KCP; the label says so above the chips */
    var bandChips = h('div', { class: 'pp-chips', role: 'group', 'aria-label': BAND_LABEL });
    BANDS.forEach(function (b) {
      var c = chip(b.label, function (e) { setFilter({ bands: toggleIn(S().filters.bands, b.id, e.altKey) }); },
        { count: true, title: 'Proyek ' + b.label + ' garis lurus dari Mabes TNI.\nJarak di setiap baris: jarak jalan dari KCP.\nAlt-klik untuk menampilkan jarak ini saja.' });
      r.bandChips[b.id] = c;
      bandChips.appendChild(c);
    });
    var bands = h('div', { class: 'pp-bands' }, h('span', { class: 'pp-field__label pp-bands__l', text: BAND_LABEL }), bandChips);
    r.mapColor = seg([{ v: 'class', label: 'Kelas' }, { v: 'segment', label: 'Segmen' }, { v: 'price', label: 'Harga' }], st.map.colorBy,
      function (v) { setMapOpt({ colorBy: v }); }, { label: 'Warna peta (C)' });
    var mapRow = h('div', { class: 'pp-maprows' }, h('div', { class: 'pp-maprow' }, h('span', { class: 'pp-field__label', text: 'Warna peta' }), r.mapColor.el));
    r.search = h('input', { type: 'search', class: 'input pp-search__in', placeholder: 'Cari proyek', 'aria-label': 'Cari nama proyek, developer atau kecamatan', value: st.filters.q || '' });
    var deb = U().debounce(function () { setFilter({ q: r.search.value.trim() }); }, 150);
    r.search.addEventListener('input', deb);
    r.sort = selectEl([{ v: 'distance', label: DST() ? 'Urut: terdekat dari KCP' : 'Urut: jarak' }, { v: 'instalment', label: 'Urut: angsuran' }, { v: 'price', label: 'Urut: harga' },
      { v: 'gap', label: 'Urut: selisih dari batas' }, { v: 'units', label: 'Urut: unit tersedia' }], st.sort, function (v) { S().sort = v; renderProjects(); }, 'Urutkan proyek');
    r.moreBtn = h('button', { type: 'button', class: 'btn btn--secondary pp-more', 'aria-expanded': st.moreFilters ? 'true' : 'false' }, icon('sliders'), h('span', { text: 'Filter' }), h('span', { class: 'chip-count-badge', hidden: true }));
    r.moreBtn.addEventListener('click', function () { S().moreFilters = !S().moreFilters; renderProjects(); });
    r.segChips = {}; r.typeChips = {}; r.clsChips = {};
    var segRow = h('div', { class: 'pp-chips', role: 'group', 'aria-label': 'Segmen' });
    SEG_ORDER.forEach(function (k) { var c = chip(SEG[k], function (e) { setFilter({ segments: toggleIn(S().filters.segments, k, e.altKey) }); }); r.segChips[k] = c; segRow.appendChild(c); });
    var typeRow = h('div', { class: 'pp-chips', role: 'group', 'aria-label': 'Tipe' });
    Object.keys(TYPE).forEach(function (k) { var c = chip(TYPE[k], function (e) { setFilter({ types: toggleIn(S().filters.types, k, e.altKey) }); }); r.typeChips[k] = c; typeRow.appendChild(c); });
    var clsRow = h('div', { class: 'pp-chips', role: 'group', 'aria-label': 'Kelas' });
    ['A', 'S', 'O'].forEach(function (k) { var c = chip(CLS[k].label, function (e) { setFilter({ classes: toggleIn(S().filters.classes, k, e.altKey) }); }); r.clsChips[k] = c; clsRow.appendChild(c); });
    r.fMandiri = sw('Mitra Mandiri saja', st.filters.mandiriOnly, function (on) { setFilter({ mandiriOnly: on }); });
    r.fTop = sw('Top Developer saja', st.filters.topDevOnly, function (on) { setFilter({ topDevOnly: on }); });
    r.fUnc = sw('Sembunyikan status belum jelas', st.filters.hideUncertain, function (on) { setFilter({ hideUncertain: on }); });
    r.fConf = seg([{ v: 'low', label: 'Semua' }, { v: 'medium', label: 'Cukup tepat ke atas' }, { v: 'high', label: 'Tepat' }], st.filters.minConfidence, function (v) { setFilter({ minConfidence: v }); }, { label: 'Ketepatan lokasi terendah' });
    r.fClear = h('button', { type: 'button', class: 'btn btn--ghost pp-clear' }, icon('reset'), h('span', { text: 'Hapus filter' }));
    r.fClear.addEventListener('click', clearFilters);
    r.more = h('div', { class: 'pp-morebox' },
      h('span', { class: 'pp-field__label', text: 'Segmen' }), segRow, h('span', { class: 'pp-field__label', text: 'Tipe' }), typeRow,
      h('span', { class: 'pp-field__label', text: 'Kelas' }), clsRow, r.fMandiri.el, r.fTop.el, r.fUnc.el,
      h('span', { class: 'pp-field__label', text: 'Ketepatan lokasi' }), r.fConf.el, r.fClear);
    r.list = h('ul', { class: 'pp-list', 'aria-label': 'Proyek' });
    r.prEmpty = h('div', { class: 'pp-emptyline', hidden: true });
    /* v5: "Lihat proyek di area ini" filters the list to one price area; the chip says which and clears it */
    r.areaChip = h('div', { class: 'pp-areachip', hidden: true });
    r.exportBtn = h('button', { type: 'button', class: 'btn btn--secondary pp-export' }, icon('download'), h('span', { text: 'Ekspor daftar (CSV)' }));
    r.exportBtn.addEventListener('click', exportProjects);
    r.prFoot = h('div', { class: 'pp-x__foot' }, h('p', { class: 'pp-x__note', text: COPY.coverage + ' ' + COPY.prices }), r.exportBtn,
      h('p', { class: 'exhibit__source pp-x__src', text: 'Sumber: ' + SRC_PROJECTS + ' · ' + F().int(index().rows.length) + ' proyek · data per ' + dateLabel(index().meta.generated) }),
      DST() ? h('p', { class: 'exhibit__source pp-x__src', text: distSrc() }) : null);
    r.prTog = distToggles('pp-dtog--rr');
    r.prSbHost = h('div', { class: 'pp-x__sb' });
    el.appendChild(h('div', { class: 'pp-x' }, r.prTitle, r.prSub, r.prSbHost, bands, mapRow, h('div', { class: 'pp-tools' }, h('div', { class: 'search pp-search' }, icon('search'), r.search), r.moreBtn), r.more,
      h('div', { class: 'pp-tools pp-tools--sort' }, r.sort.el, r.prCount = h('span', { class: 'pp-count' })), r.prTog, r.areaChip, r.prEmpty, r.list, r.prFoot));
    var SB = plus('statusBar');
    charts.prBar = SB
      ? SB(r.prSbHost, fitData(), { labels: SB_LABELS, unit: 'proyek', tableToggle: false, total: false, label: 'Proyek yang tampil menurut keterjangkauan',
        onClick: function (p) { var k = WORD_CLS[p.key]; if (k) toggleClassFilter(k); } })
      : sbFallback(r.prSbHost);
    if (!SB) charts.prBar.update(fitData());
  }

  function activeFilterCount() {
    var f = S().filters;
    return f.segments.length + f.types.length + f.classes.length + (f.mandiriOnly ? 1 : 0) + (f.topDevOnly ? 1 : 0) + (f.hideUncertain ? 1 : 0) + (f.minConfidence !== 'low' ? 1 : 0);
  }
  function clearFilters() {
    S().filters = defaultState().filters;
    if (refs.search) refs.search.value = '';
    changed('filters');
    syncFilterControls();
  }
  function syncFilterControls() {
    var r = refs, f = S().filters;
    if (!r.fMandiri) return;
    r.fMandiri.set(f.mandiriOnly); r.fTop.set(f.topDevOnly); r.fUnc.set(f.hideUncertain); r.fConf.set(f.minConfidence);
  }
  function sortRows(list) {
    var k = S().sort, out = list.slice();
    var num0 = function (v, d) { return isNum(v) ? v : d; };
    if (k === 'distance') return sortNear(out);
    if (k === 'instalment') out.sort(function (a, b) { return num0(a.r.first, 1e15) - num0(b.r.first, 1e15); });
    else if (k === 'price') out.sort(function (a, b) { return num0(rowPrice(a), 1e15) - num0(rowPrice(b), 1e15); });
    else if (k === 'gap') out.sort(function (a, b) { return num0(rowPrice(a) - a.r.maxPrice, 1e15) - num0(rowPrice(b) - b.r.maxPrice, 1e15); });
    else if (k === 'units') out.sort(function (a, b) { var u = function (x) { return x.p.unitsAvailable ? (x.p.unitsAvailable.subsidi || 0) + (x.p.unitsAvailable.komersial || 0) : -1; }; return u(b) - u(a); });
    return out;
  }
  /** Best single filter removal for the empty list (§14.3). */
  function bestRemoval() {
    var f = S().filters, I = index(), best = null;
    var dims = [['bands', 'jarak'], ['segments', 'segmen'], ['types', 'tipe'], ['classes', 'kelas'], ['mandiriOnly', 'Mitra Mandiri saja'], ['topDevOnly', 'Top Developer saja'], ['hideUncertain', 'Sembunyikan status belum jelas'], ['q', 'pencarian'], ['minConfidence', 'ketepatan lokasi'], ['area', 'area']];
    dims.forEach(function (d) {
      var v = f[d[0]];
      if (!(Array.isArray(v) ? v.length : (d[0] === 'minConfidence' ? v !== 'low' : !!v))) return;
      var g = Object.assign({}, f);
      g[d[0]] = Array.isArray(v) ? [] : (d[0] === 'minConfidence' ? 'low' : (d[0] === 'q' || d[0] === 'area' ? '' : false));
      var n = R.rows.filter(function (x) { return passes(x, g, I); }).length;
      if (!best || n > best.n) best = { dim: d[0], label: d[1], n: n, patch: (function () { var p = {}; p[d[0]] = g[d[0]]; return p; })() };
    });
    return best;
  }

  function projectRow(x) {
    var p = x.p, r = x.r, I = index();
    var badges = [];
    if (p.mandiriPartner === true) badges.push(tagEl('Mitra Mandiri', 'gold'));
    if (I.topDev[p.id]) badges.push(tagEl('Top Developer'));
    if (KM().flppOk(p, KC())) badges.push(tagEl('FLPP'));
    if (p.riskNote) badges.push(h('span', { class: 'tag pp-tag pp-tag--warn', title: RISK_EN[p.id] || 'Risiko serah terima' }, icon('warn', 'icon--12'), h('span', { text: 'Risiko' })));
    if (p.status !== 'selling') badges.push(tagEl(STATUS[p.status] || p.status));
    var b = h('button', { type: 'button', class: 'pp-prow is-' + (potentialOnly() ? 'p' : x.cls.toLowerCase()), 'data-id': p.id, 'aria-current': lastSel && lastSel.id === p.id ? 'true' : null },
      h('span', { class: 'pp-prow__band', 'aria-hidden': 'true' }),
      h('span', { class: 'pp-prow__l1' }, h('span', { class: 'pp-prow__name', text: p.name, title: p.name }), distEl(p, { cls: 'pp-prow__km' })),
      h('span', { class: 'pp-prow__l2' }, h('span', { class: 'pp-prow__meta', text: [devGroup(p), p.kecamatan, TYPE[p.type]].filter(Boolean).join(' · '), title: [devGroup(p), p.kecamatan, TYPE[p.type]].filter(Boolean).join(' · ') }), badges),
      h('span', { class: 'pp-prow__l3' },
        h('span', { class: 'pp-prow__price', text: r.isFlpp ? rp(r.listPrice) + ' FLPP' : priceRange(p) }),
        h('span', { class: 'pp-prow__inst', text: r.segments ? instPath(r) + '/bulan' : '—' }),
        r.how === 'auto' ? h('span', { class: 'pp-auto', title: 'Skema dipilih otomatis: ' + schemeName(r.scheme), text: 'otomatis' }) : null,
        potentialOnly() ? tagEl('Belum diperiksa', 'p') : tagEl(CLS[x.cls].tag, x.cls.toLowerCase())));
    b.addEventListener('click', function () { selectProject(p.id, { fly: true }); });
    b.addEventListener('mouseenter', function () { setHoverId(p.id); });
    b.addEventListener('mouseleave', function () { setHoverId(null); });
    b.addEventListener('focus', function () { setHoverId(p.id); });
    b.addEventListener('blur', function () { setHoverId(null); });
    return h('li', { class: 'pp-li' }, b);
  }

  function renderProjects() {
    var r = refs, st = S(), f = st.filters, fm = F();
    if (!r.list || !R) return;
    var c = R.counts, n = R.filtered.length, cb = R.countsBase;
    r.prTitle.textContent = potentialOnly() ? fm.int(n) + ' proyek baru dalam 30 km · isi penghasilan bersih untuk memeriksanya'
      : (cb.A ? fm.int(cb.A) + ' dari ' + fm.int(R.base.length) + ' proyek sesuai anggaran ini' : 'Belum ada proyek yang tampil yang sesuai anggaran ini') + (cb.S ? ' · ' + fm.int(cb.S) + ' hampir' : '');
    if (charts.prBar) safe(function () {
      charts.prBar.update(fitData());
      if (charts.prBar.highlight) charts.prBar.highlight(f.classes.length === 1 && CLS[f.classes[0]] ? CLS[f.classes[0]].word : null);
    });
    BANDS.forEach(function (b) {
      var on = f.bands.indexOf(b.id) >= 0;
      r.bandChips[b.id].setAttribute('aria-pressed', on ? 'true' : 'false');
      var all = R.rows.filter(function (x) { return x.p.band === b.id; }).length;
      r.bandChips[b.id].querySelector('.chip__count').textContent = fm.int(all);
    });
    SEG_ORDER.forEach(function (k) { r.segChips[k].setAttribute('aria-pressed', f.segments.indexOf(k) >= 0 ? 'true' : 'false'); });
    Object.keys(TYPE).forEach(function (k) { r.typeChips[k].setAttribute('aria-pressed', f.types.indexOf(k) >= 0 ? 'true' : 'false'); });
    ['A', 'S', 'O'].forEach(function (k) { r.clsChips[k].setAttribute('aria-pressed', f.classes.indexOf(k) >= 0 ? 'true' : 'false'); });
    var nf = activeFilterCount(), badge = r.moreBtn.querySelector('.chip-count-badge');
    badge.hidden = !nf; badge.textContent = String(nf);
    r.moreBtn.setAttribute('aria-expanded', st.moreFilters ? 'true' : 'false');
    r.more.hidden = !st.moreFilters;
    r.sort.set(st.sort);
    r.mapColor.set(st.map.colorBy);
    r.prCount.textContent = fm.int(n) + (n === 1 ? ' proyek' : ' proyek');
    renderAreaChip();
    clear(r.list);
    clear(r.prEmpty);
    r.prEmpty.hidden = true;
    if (!n) {
      var best = bestRemoval();
      r.prEmpty.hidden = false;
      r.prEmpty.appendChild(h('p', { class: 't-empty', text: 'Tidak ada proyek yang cocok dengan filter ini. Hapus salah satu filter.' }));
      if (best) {
        var fix = h('button', { type: 'button', class: 'btn btn--secondary' }, h('span', { text: 'Hapus ' + best.label + ' · ' + fm.int(best.n) + ' proyek' }));
        fix.addEventListener('click', function () { setFilter(best.patch); if (best.dim === 'q' && refs.search) refs.search.value = ''; syncFilterControls(); });
        r.prEmpty.appendChild(fix);
      }
      return;
    }
    if (!c.A && R.pan.state === 'ok') {
      r.prEmpty.hidden = false;
      r.prEmpty.appendChild(h('p', { class: 't-empty', text: 'Tidak ada proyek yang terjangkau dengan isian ini. Coba tenor lebih panjang atau DP lebih kecil.' }));
      if (st.sort !== 'gap') {
        var g = h('button', { type: 'button', class: 'btn btn--secondary' }, h('span', { text: 'Urutkan menurut selisih dari batas' }));
        g.addEventListener('click', function () { S().sort = 'gap'; renderProjects(); });
        r.prEmpty.appendChild(g);
      }
    }
    var frag = DOC.createDocumentFragment(), sorted = sortRows(R.filtered), lk = R.seq + '|' + st.sort;
    if (r.listKey !== lk) { r.listKey = lk; r.listN = 20; }
    var shown = sorted.slice(0, r.listN);
    shown.forEach(function (x) { frag.appendChild(projectRow(x)); });
    r.list.appendChild(frag);
    staggerRows(r, shown.map(function (x) { return x.p.id; }), r.list.children);
    if (sorted.length > r.listN) {
      var more = h('button', { type: 'button', class: 'btn btn--secondary pp-more20' }, h('span', { text: 'Tampilkan ' + Math.min(20, sorted.length - r.listN) + ' lagi' }),
        h('span', { class: 'pp-more20__n', text: '(' + fm.int(r.listN) + ' dari ' + fm.int(sorted.length) + ')' }));
      more.addEventListener('click', function () { r.listN += 20; renderProjects(); });
      r.list.appendChild(h('li', { class: 'pp-li pp-li--more' }, more));
    }
    r.exportBtn.disabled = veil();
    r.exportBtn.title = veil() ? 'Tidak tersedia saat nama disamarkan' : 'Unduh proyek hasil filter sebagai CSV (data publik saja, tanpa isian)';
  }

  /** "Area: Cipayung · Jakarta Timur ×" above the list while "Lihat proyek di area ini" holds the list to one area. */
  function renderAreaChip() {
    var r = refs, id = S().filters.area, a = id ? index().areaById[id] : null;
    if (!r.areaChip) return;
    clear(r.areaChip);
    r.areaChip.hidden = !a;
    if (!a) return;
    var x = h('button', { type: 'button', class: 'pp-areachip__x', title: 'Tampilkan proyek di semua area', 'aria-label': 'Hapus filter area ' + a.name }, icon('close', 'icon--12'));
    x.addEventListener('click', function () { setFilter({ area: '' }); });
    r.areaChip.appendChild(h('span', { class: 'chip pp-areachip__c' }, h('span', { text: 'Area: ' + a.name + (a.level === 'kota' ? '' : ' · ' + a.kota) }), x));
  }
  /**
   * Rows enter one after another (item 38) when the list shows other projects or another order; after
   * "Tampilkan 20 lagi" only the new rows do. A redraw with the same rows (a typed income, the switches) stays still.
   */
  function staggerRows(holder, ids, els) {
    var prev = holder.stgIds, key = ids.join(','), rows = Array.prototype.slice.call(els || []);
    holder.stgIds = ids;
    if (prev && prev.join(',') === key) return;
    var from = prev && prev.length < ids.length && ids.slice(0, prev.length).join(',') === prev.join(',') ? prev.length : 0;
    stagger(rows.slice(from, ids.length));
  }

  /* ---------------------------------------------------------------- Areas */

  function buildAreasPanel(el) {
    var r = refs, st = S(), I = index();
    r.arTitle = h('h2', { class: 'pp-x__t' });
    r.arSub = h('p', { class: 'pp-x__sub', text: 'Acuan harga rumah seken dan tanah per area.\nAngka berasal dari harga penawaran dan rata-rata yang dipublikasikan, tanpa harga transaksi.' });
    r.arMetric = seg([{ v: 'land', label: 'Tanah per m²' }, { v: 'median', label: 'Rumah seken' }, { v: 'yoy', label: 'Perubahan tahunan' }], st.map.areaMetric,
      function (v) { setMapOpt({ areaMetric: v }); renderAreas(); }, { label: 'Ukuran area' });
    r.arLb = selectEl(LB_BANDS.map(function (x) { return { v: x[0], label: 'Bangunan ' + x[1] }; }), st.map.lbBand, function (v) { setMapOpt({ lbBand: v }); renderAreas(); }, 'Luas bangunan untuk median rumah seken');
    r.arList = h('div', { class: 'pp-areas' });
    var mc = (I.mmeta || {}).marketContext || {};
    var ctxRows = [];
    if (mc.biShprJabodebekBanten) ctxRows.push('Indeks harga rumah baru Bank Indonesia, Jabodebek-Banten: ' + F().num(mc.biShprJabodebekBanten.index2018eq100, 2) + ' (' + (mc.biShprJabodebekBanten.yoyPct >= 0 ? '+' : '') + F().num(mc.biShprJabodebekBanten.yoyPct, 2) + '% per tahun), ' + mc.biShprJabodebekBanten.period + '.');
    if (mc.rumah123National) ctxRows.push('Indeks harga rumah seken nasional Rumah123 ' + (mc.rumah123National.rpiYoYPct >= 0 ? '+' : '') + F().num(mc.rumah123National.rpiYoYPct, 1) + '% per tahun, inflasi ' + F().num(mc.rumah123National.inflationYoYPct, 1) + '% (' + mc.rumah123National.period + ').');
    if (mc.cwJabodetabekLandAvgEnd2025) ctxRows.push('Cushman & Wakefield: rata-rata harga tanah perumahan Jabodetabek ' + rp(mc.cwJabodetabekLandAvgEnd2025.perM2) + ' per m² (akhir 2025).');
    var context = h('section', { class: 'pp-ctx' }, h('h3', { class: 'pp-grp__t', text: 'Konteks pasar' }), ctxRows.map(function (t) { return h('p', { class: 'pp-ctx__p', text: t }); }),
      h('p', { class: 'pp-x__note', text: 'Rumah seken tidak ditampilkan satu per satu. Data portal iklan tidak diambil.\nAngka Rumah123 adalah median harga penawaran di Rumah123/99.co, berbeda dari harga transaksi.' }));
    el.appendChild(h('div', { class: 'pp-x' }, r.arTitle, r.arSub, r.arMetric.el, r.arLb.el, r.arList, context,
      h('p', { class: 'exhibit__source pp-x__src', text: 'Sumber: Rumah123 Flash Report, Cushman & Wakefield, Bank Indonesia, sampel agen dan media · ' + F().int(I.kec.length) + ' kecamatan, ' + F().int(I.kota.length) + ' kota' })));
  }
  function areaValText(a) {
    var m = S().map, v = areaValue(a, m.areaMetric, m.lbBand);
    if (!isNum(v)) return '—';
    if (m.areaMetric === 'yoy') return (v >= 0 ? '+' : '') + F().num(v, 1) + '%';
    if (m.areaMetric === 'median') return rp(v);
    return rp(v) + '/m²';
  }
  var openKota = {};
  function renderAreas() {
    var r = refs, I = index(), m = S().map;
    if (!r.arList) return;
    r.arMetric.set(m.areaMetric);
    r.arLb.set(m.lbBand);
    r.arLb.el.hidden = m.areaMetric !== 'median';
    var own = I.kec.filter(function (a) { return isNum(a.pricePerM2Land); });
    r.arTitle.textContent = m.areaMetric === 'land' ? 'Harga tanah ' + rp(I.landMin) + '–' + rp(I.landMax).replace('Rp ', '') + ' per m² di area yang memiliki sampel sendiri'
      : (m.areaMetric === 'median' ? 'Rumah seken seluas ini ditawarkan mulai ' + rp(Math.min.apply(null, I.kota.map(function (a) { return (a.benchmark.medianByLB || {})[m.lbBand] || Infinity; }))) + ' per kota'
        : 'Harga rumah seken naik 0,4–3,7% per tahun di seluruh area 30 km');
    void own;
    var groups = {};
    I.kec.forEach(function (a) { (groups[a.kota] = groups[a.kota] || []).push(a); });
    var names = Object.keys(groups).sort(function (x, y) { return Math.min.apply(null, groups[x].map(function (a) { return a.distanceKm; })) - Math.min.apply(null, groups[y].map(function (a) { return a.distanceKm; })); });
    clear(r.arList);
    names.forEach(function (kota, gi) {
      var list = groups[kota].slice().sort(function (a, b) { return a.distanceKm - b.distanceKm; });
      var kRow = I.kota.filter(function (a) { return a.kota === kota || a.name === kota; })[0];
      var det = h('details', { class: 'pp-agrp', open: openKota[kota] != null ? openKota[kota] : gi < 2 });
      det.addEventListener('toggle', function () { openKota[kota] = det.open; });
      det.appendChild(h('summary', { class: 'pp-agrp__s' }, h('span', { class: 'pp-agrp__n', text: kota }),
        h('span', { class: 'pp-agrp__v', text: kRow ? areaValText(kRow) : '' }), h('span', { class: 'pp-agrp__c', text: list.length + ' area' })));
      list.forEach(function (a) {
        var cls = areaClass(a);
        var b = h('button', { type: 'button', class: 'pp-arow', 'aria-current': lastSel && lastSel.kind === 'area' && lastSel.id === a.id ? 'true' : null },
          h('span', { class: 'pp-arow__n', text: a.name }), h('span', { class: 'pp-arow__km', text: F().km(a.distanceKm), title: 'Titik tengah area, garis lurus dari Mabes TNI' }),
          h('span', { class: 'pp-arow__v', text: areaValText(a) }),
          h('span', { class: 'pp-arow__tags' }, m.areaMetric === 'land' ? tagEl(isNum(a.pricePerM2Land) ? 'sampel sendiri' : 'nilai kota', isNum(a.pricePerM2Land) ? '' : 'soft') : null,
            m.areaMetric === 'median' && cls ? tagEl(CLS[cls].tag, cls.toLowerCase()) : null,
            a.centroidWithin30km === false ? tagEl('Titik tengah di luar 30 km', 'soft') : null));
        b.addEventListener('click', function () { selectArea(a.id); });
        det.appendChild(b);
      });
      r.arList.appendChild(det);
    });
    staggerRows(r.arStg = r.arStg || {}, names, r.arList.children);
  }

  function kvRow(k, v, strong) { return h('div', { class: 'dd-kv' + (strong ? ' pp-kv--strong' : '') }, h('span', { class: 'dd-kv__k', text: k }), h('span', { class: 'dd-kv__v', text: v })); }

  function renderRightRail() {
    var r = refs;
    if (!r.rr || !R) return;
    r.rrTabs.projects.querySelector('.pp-tab__n').textContent = F().int(R.filtered.length);
    r.rrTabs.areas.querySelector('.pp-tab__n').textContent = F().int(index().kec.length);
    var t = S().railTab;
    if (t === 'areas') renderAreas();
    else renderProjects();
  }

  /* ------------------------------------------------------------ KPI strip */

  var KPI_KEYS = ['price', 'inst', 'plafond', 'classes', 'projects', 'units'];
  function kpiCfgs() {
    var pan = R.pan, fm = F(), c = R.counts, ok = pan.state === 'ok';
    var incomeText = veil() && inputs().personaEdited ? 'Rp ••• (disamarkan)' : rp(R.inp.income + R.inp.jointIncome);
    return {
      price: { eyebrow: 'Harga rumah tertinggi', value: ok ? pan.maxPrice : null, format: 'rp',
        sub: ok ? 'DP ' + inputs().dpPct + '% · ' + yrs(pan.T) + ' · ' + (pan.binding === 'cash' ? 'batas dana tunai' : 'batas DSR') : stateText(pan.state),
        info: 'Harga tertinggi yang angsurannya tetap dalam anggaran sepanjang tenor.\nBunga floating dan uji kenaikan bunga ikut dihitung.\nPinjaman = harga × (1 − DP). Dibulatkan ke bawah ke Rp1.000.' },
      inst: { eyebrow: 'Angsuran tertinggi', value: pan.budget > 0 ? KM().floor1000(pan.budget) : null, format: 'rp',
        sub: 'DSR ' + fm.pct(R.inp.dsr, 0) + ' × ' + incomeText + (R.inp.existing ? ' − angsuran lain' : ''),
        info: '(Penghasilan bersih + penghasilan pasangan) × DSR − angsuran lain. DSR adalah asumsi (Data & Privasi › Asumsi).' },
      plafond: { eyebrow: 'Plafond tertinggi', value: ok ? pan.maxPlafond : null, format: 'rp',
        sub: (R.inp.basis === 'first' ? 'Dasar promo' : 'Angsuran tertinggi') + ' · ' + ratePct(R.inp.floatingPct + R.inp.stressBps / 100),
        info: 'Plafond = anggaran ÷ angsuran per Rp1 pinjaman, untuk skema dan tenor ini. Dibulatkan ke bawah ke Rp1.000.' },
      classes: { eyebrow: 'Proyek yang sesuai', value: potentialOnly() ? null : c.A, format: 'int', unit: 'terjangkau',
        sub: potentialOnly() ? 'Isi penghasilan bersih untuk memeriksa' : c.S + ' hampir · ' + c.O + ' tidak terjangkau' + (c.NA ? ' · ' + c.NA + ' belum dinilai' : ''),
        info: 'Terjangkau: harga sampai harga tertinggi. Hampir: hingga 15% di atasnya. Tidak terjangkau: lebih dari 15% di atasnya.\nUnit subsidi menggunakan FLPP (fixed 5%) jika penghasilan dalam batas.' },
      projects: { eyebrow: 'Proyek yang tampil', value: R.filtered.length, format: 'int', unit: 'dari ' + R.rows.length,
        sub: 'Dalam 30 km, setelah filter', info: 'Proyek pasar primer dalam 30 km dari Mabes TNI setelah filter daftar.' },
      units: { eyebrow: 'Unit subsidi tersedia', value: R.units, format: 'int', sub: 'SiKumbang · 0 belum tentu berarti habis',
        info: 'Unit bertanda tersedia di siteplan SiKumbang proyek yang tampil (diakses 12 Okt 2026). ' + R.unitsNoData + ' proyek tidak memiliki data unit. ' + COPY.units }
    };
  }
  function stateText(s) {
    return { noIncome: 'Isi penghasilan bersih', noBudget: 'Angsuran lain telah mencapai batas', retired: 'Telah mencapai usia pensiun', noScheme: 'Tidak ada skema aktif' }[s] || '';
  }
  function buildKpis() {
    var r = refs;
    if (!MCD.charts || typeof MCD.charts.kpiTile !== 'function') return;
    r.kpiStrip = h('div', { class: 'kpi-strip panel panel--hi pp-kpis', role: 'list', 'aria-label': 'Angka utama' });
    charts.kpi = {};
    var cfgs = R ? kpiCfgs() : {};
    KPI_KEYS.forEach(function (k) {
      var cell = h('div', { class: 'pp-kpi', role: 'listitem' });
      var tile = h('div', { class: 'pp-kpi__tile' });
      cell.appendChild(tile);
      if (k === 'classes') { r.kpiBar = classBar(function (x) { toggleClassFilter(x); }); cell.appendChild(r.kpiBar.el); }
      r.kpiStrip.appendChild(cell);
      var c0 = Object.assign({ from: 0 }, cfgs[k] || { eyebrow: k });
      charts.kpi[k] = MCD.charts.kpiTile(tile, c0);
    });
    host.appendChild(r.kpiStrip);
  }
  function renderKpis() {
    if (!charts.kpi || !R) return;
    var cfgs = kpiCfgs();
    KPI_KEYS.forEach(function (k) { if (charts.kpi[k]) safe(function () { charts.kpi[k].update(cfgs[k]); }); });
    if (refs.kpiBar) refs.kpiBar.set(potentialOnly() ? { P: R.base.length } : R.countsBase, S().filters.classes);
  }

  /* ======================================================= selection, drawer */

  var detailPrice = 'low';
  function flyTo(lon, lat, zoom) {
    if (!MCD.map || !MCD.map.flyTo) return;
    safe(function () { MCD.map.flyTo({ center: [lon, lat], zoom: zoom }); });
    flewTo = true;
  }
  function selectProject(id, o) {
    var p = index().byId[id];
    if (!p || !ctx) return;
    detailPrice = 'low';
    ctx.select({ kind: 'project', id: id });
    if (o && o.fly) flyTo(p.lon, p.lat, 14.2);
  }
  function selectArea(id) {
    var a = index().areaById[id];
    if (!a || !ctx) return;
    var kid = areaKecId(id);
    /* a kecamatan area carries its admin-areas id (selection.extra.kecamatanId; MCD.state keeps kind, id and extra),
       so map.js can open the kecamatan focus mode (item 38) and fly
       there itself; a kota-level area (or a map without the focus mode) keeps the camera flight of before */
    ctx.select(kid ? { kind: 'area', id: id, extra: { kecamatanId: kid } } : { kind: 'area', id: id });
    if (!(kid && mapFocusMode())) flyTo(a.lon, a.lat, 12.6);
  }

  /* ---- kecamatan focus mode for kecamatan-level areas (COPY_STYLE item 38) */

  function normName(x) { return String(x || '').replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  var areaKecCache = null;
  /**
   * The admin-areas kecamatan id (data/admin-areas.js, e.g. '31.75.10') of a kecamatan-level market area, matched
   * by name ("Cipayung (Depok)" → Cipayung); with two kecamatan of that name, the one whose label is nearest the
   * area point. null for a kota-level area or a name that is not in the boundary data.
   */
  function areaKecId(id) {
    var A = W.MCD_ADMIN_AREAS, I = index(), a = I && I.areaById ? I.areaById[id] : null;
    if (!a || a.level !== 'kecamatan' || !A || !A.kecamatan) return null;
    if (!areaKecCache) areaKecCache = {};
    if (Object.prototype.hasOwnProperty.call(areaKecCache, id)) return areaKecCache[id];
    var want = normName(a.name), best = null, bestD = Infinity;
    var list = Array.isArray(A.kecamatan) ? A.kecamatan : Object.keys(A.kecamatan).map(function (k) { return A.kecamatan[k]; });
    list.forEach(function (k) {
      if (!k || normName(k.name) !== want) return;
      var lb = k.label || [0, 0], dx = (lb[0] - a.lon) * 110.64, dy = (lb[1] - a.lat) * 110.574, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = String(k.id); }
    });
    areaKecCache[id] = best;
    return best;
  }
  function mapFocusMode() { return !!(MCD.map && typeof MCD.map.focusArea === 'function'); }
  /** The kecamatan id the map is focused on, when map.js tells (several shapes accepted), else undefined. */
  function focusedKec() {
    var M = MCD.map, f;
    if (!M) return undefined;
    try {
      if (typeof M.focusState === 'function') f = M.focusState();
      else if (typeof M.focused === 'function') f = M.focused();
      else if (typeof M.snapshot === 'function') { var sn = M.snapshot(); f = sn ? (sn.focusArea !== undefined ? sn.focusArea : sn.focus) : undefined; }
      else return undefined;
    } catch (e) { return undefined; }
    if (f === undefined) return undefined;
    if (!f) return null;
    if (typeof f !== 'object') return String(f);
    /* MCD.map.focusState() → {id, phase, …}: a focus on its way out ('exit', 'off') no longer counts */
    return f.id != null && f.phase !== 'exit' && f.phase !== 'off' ? String(f.id) : null;
  }
  var ownFocus = null;
  /**
   * The area drawer is open: focus mode on its kecamatan (asked once). map.js has already handled the selection
   * (synchronously, through MCD.map.select), so this runs after it; an area is not a kecamatan kind there.
   */
  function areaFocus(id) {
    var kid = areaKecId(id);
    if (!kid) { dropAreaFocus(); return; }
    if (!ctx || !lastSel || lastSel.kind !== 'area' || lastSel.id !== id || !mapFocusMode()) return;
    if (focusedKec() === kid) return;
    if (safe(function () { return MCD.map.focusArea({ kind: 'kecamatan', id: kid }) !== false; })) ownFocus = kid;
  }
  /** Leave the focus mode this section asked for (the drawer closed, a project opened or the section left). */
  function dropAreaFocus() {
    if (!ownFocus) return;
    var cur = focusedKec(), mine = ownFocus;
    ownFocus = null;
    /* only the focus this section asked for: never one that staff opened since */
    if (MCD.map && typeof MCD.map.clearFocus === 'function' && (cur === undefined || cur === mine)) safe(function () { MCD.map.clearFocus(); });
  }
  function drawerEl() { return DOC.querySelector('#overlay-root .drawer') || DOC.querySelector('.drawer'); }
  function drawerOpen() { var d = drawerEl(); return !!(d && d.classList.contains('is-open')); }
  var drawerObs = null, openPending = false;
  function watchDrawer() {
    var d = drawerEl();
    if (!d || drawerObs || !W.MutationObserver) return;
    drawerObs = new W.MutationObserver(function () {
      /* the shell closes the drawer silently right after onSelect; that close must not drop the new selection */
      if (openPending) return;
      if (!d.classList.contains('is-open') && lastSel && ctx) {
        var s = ctx.state.get().selection;
        if (s && (s.kind === 'project' || s.kind === 'area') && s.id === lastSel.id) { lastSel = null; ctx.clearSelection(); }
        dropAreaFocus();
      }
    });
    drawerObs.observe(d, { attributes: true, attributeFilter: ['class'] });
  }
  function openDetail(sel, refresh) {
    openPending = false;
    if (!ctx || !R) return;
    var model = sel.kind === 'project' ? projectModel(sel.id) : areaModel(sel.id);
    if (!model) return;
    var body = DOC.querySelector('#overlay-root .drawer .drawer__body');
    var top = refresh && body ? body.scrollTop : 0;
    ctx.openDrawer(model, { keepSelection: true, refresh: !!refresh });
    if (model.gmaps) ensureDrawerGmaps(model.gmaps);
    if (refresh && body) body.scrollTop = top;
    watchDrawer();
    if (refresh) return;
    /* drawer blocks enter 35 ms apart (item 38), never on a refresh. The shell's openDrawer already staggers the title,
       body blocks and source line through MCD.motion.stagger (INTEGRATION_NOTES §15 "Drawer"); the section only does it
       when that path is missing, so no block carries two entrance animations. */
    if (!shellStaggersDrawer()) stagger(model.body);
    if (sel.kind === 'area') areaFocus(sel.id); else dropAreaFocus();
  }
  function blk(title, kids, cls) {
    return h('section', { class: 'dd-blk' + (cls ? ' ' + cls : '') }, h('h3', { class: 't-eyebrow dd-blk__t', text: title }), kids);
  }
  function detailCalc(row) {
    var p = row.p;
    if (detailPrice !== 'high' || !isNum(p.priceMax) || row.r.isFlpp && !isNum(p.priceMax)) return row.r;
    var q = Object.assign({}, p, { subsidiPrice: null, priceMin: p.priceMax });
    var run = Object.assign({}, R.inp, { tenorYears: R.pan.T, scheme: R.pan.scheme });
    return KM().resolveProject(q, run, KC(), envFor());
  }
  function projectModel(id) {
    var row = R.byId[id];
    if (!row) return null;
    var p = row.p, I = index(), fm = F(), c = KC();
    var r = detailCalc(row), cls = r.cls || row.cls;
    if (R.pan.state === 'noIncome') cls = 'NA';
    /* v5 (§3.3.1): at most two chips in the card head (segment, type); the status and the location precision sit
       in "Lokasi", the partner marks in "Mitra KPR" */
    var tags = [tagEl(SEG[p.segment]), tagEl(TYPE[p.type])];
    var locTags = h('div', { class: 'pp-chips pp-dtags' }, tagEl(STATUS[p.status] || p.status, p.status === 'selling' ? '' : 'warn'), tagEl(CONF[p.confidence] || p.confidence, 'soft'));
    var partnerTags = p.mandiriPartner === true || I.topDev[p.id] ? h('div', { class: 'pp-chips pp-dtags' }, p.mandiriPartner === true ? tagEl('Mitra Mandiri', 'gold') : null, I.topDev[p.id] ? tagEl('Top Developer (kemungkinan)') : null) : null;
    var body = [];
    if (p.riskNote) body.push(h('div', { class: 'pp-risk', role: 'note' }, icon('warn'), h('p', { text: RISK_EN[p.id] || 'Sumber mencatat risiko serah terima. Periksa sebelum KPR inden.' })));
    // KPR under the simulator
    var kpr = [];
    if (isNum(p.priceMax) && p.priceMax > p.priceMin) {
      var ps = seg([{ v: 'low', label: 'Harga awal' }, { v: 'high', label: 'Harga tertinggi' }], detailPrice, function (v) { detailPrice = v; openDetail({ kind: 'project', id: id }, true); }, { label: 'Harga yang disimulasikan' });
      kpr.push(ps.el);
    }
    if (r.segments) {
      var segs = r.segments;
      var fig = h('div', { class: 'pp-dfig' },
        h('span', { class: 'pp-dfig__k', text: 'Angsuran ' + segLabel(segs[0]) }), h('span', { class: 'pp-dfig__v', text: rpFull(segs[0].installment) }));
      kpr.push(fig);
      segs.slice(1).forEach(function (s) { kpr.push(kvRow('Angsuran ' + segLabel(s) + ' pada ' + ratePct(s.rate), rpFull(s.installment))); });
      kpr.push(kvRow('Harga yang disimulasikan', rpRow(r.price) + (r.isFlpp ? ' (harga subsidi)' : '')));
      kpr.push(kvRow('Skema', (r.isFlpp ? schemeName(r.scheme) : schemeShort(r.scheme)) + (r.how === 'auto' ? ' (otomatis)' : '')));
      kpr.push(kvRow('Uang muka · tenor', fm.num(r.dp, 0) + '% · ' + years(r.T) + (p.type === 'apartment' && !r.isFlpp ? ' (apartemen: paling lama 15)' : (r.isFlpp ? ' (tenor FLPP)' : ''))));
      if (R.pan.state === 'ok' || R.pan.state === 'noBudget') {
        var gap = r.maxPrice - r.price;
        kpr.push(kvRow(gap >= 0 ? 'Di bawah batas sebesar' : 'Di atas batas sebesar', rp(Math.abs(gap)) + (r.maxPrice > 0 ? ' (' + fm.pct(Math.abs(gap) / r.maxPrice, 0) + ')' : '')));
      }
      var reg = I.region[p.id].region;
      var cost = KM().costs(r.price, r.loan, r.scheme, { region: reg, firstAcquisition: true, ktpDki: inputs().ktpDki, isFlpp: r.isFlpp, listPrice: r.listPrice, isSubsidi: r.isSubsidi }, c);
      kpr.push(kvRow('Dana tunai yang dibutuhkan (DP dan biaya)', rpRow(cost.total), true));
      kpr.push(h('div', { class: 'pp-dclass' }, tagEl(CLS[cls].tag, cls.toLowerCase()), h('span', { class: 'pp-hint', text: cls === 'A' ? 'Dalam harga tertinggi ' + rp(r.maxPrice) + '.' : (cls === 'S' ? 'Hingga 15% di atas harga tertinggi ' + rp(r.maxPrice) + '.' : (cls === 'O' ? 'Lebih dari 15% di atas harga tertinggi' + (r.maxPrice > 0 ? ' dari ' + rp(r.maxPrice) : '') + '.' : 'Isi penghasilan bersih di simulator.')) })));
      var openB = h('button', { type: 'button', class: 'btn btn--primary btn--lg pp-dopen' }, h('span', { text: 'Buka di kalkulator' }), icon('chev-r'));
      openB.addEventListener('click', function () { openCalc({ projectId: id, priceMode: detailPrice }); });
      kpr.push(openB);
    } else kpr.push(h('p', { class: 't-empty', text: r.why || 'KPR tidak dapat disimulasikan dengan isian ini.' }));
    body.push(blk('KPR sesuai isian simulator', kpr));
    // price
    var near = I.nearestArea[p.id], bm = near && near.benchmark, lb = S().map.lbBand;
    var lbl = (LB_BANDS.filter(function (x) { return x[0] === lb; })[0] || [])[1];
    body.push(blk('Harga', [
      kvRow('Rentang harga', priceRange(p)),
      p.subsidiPrice ? kvRow('Harga subsidi (FLPP)', priceRange({ priceMin: p.subsidiPrice[0], priceMax: p.subsidiPrice[1] })) : null,
      kvRow('Harga per', priceAsOfEn(p.priceAsOf)),
      kvRow('Ukuran', sizeText(p)),
      h('p', { class: 'pp-hint', text: priceSourceEn(p.priceSource) + '. ' + COPY.prices }),
      bm && bm.medianByLB && isNum(bm.medianByLB[lb]) ? h('p', { class: 'pp-hint', text: 'Median rumah seken, bangunan ' + lbl + ', ' + (bm.rumah123Market || near.kota) + ': ' + rp(bm.medianByLB[lb]) + ' (Rumah123, ' + monthLabel(bm.medianByLBAsOf || '2025-12') + ', harga penawaran).' }) : null
    ]));
    if (p.unitsAvailable) body.push(blk('Unit tersedia', [kvRow('Subsidi · komersial', fm.int(p.unitsAvailable.subsidi || 0) + ' · ' + fm.int(p.unitsAvailable.komersial || 0)), h('p', { class: 'pp-hint', text: 'Siteplan SiKumbang, diakses 12 Okt 2026. ' + COPY.units })]));
    var tr = transitText(p);
    if (tr) body.push(blk('Transportasi', [h('p', { class: 'pp-dtext', text: tr }), h('p', { class: 'pp-hint', text: 'Jarak garis lurus dari OpenStreetMap.' })]));
    var coordTxt = veil() ? U().mask.coord(p.lat, p.lon, 'veil') : p.lat.toFixed(6) + ', ' + p.lon.toFixed(6);
    var copyB = h('button', { type: 'button', class: 'btn btn--secondary pp-btn-s', disabled: veil() }, icon('copy', 'icon--12'), h('span', { text: 'Salin koordinat' }));
    copyB.addEventListener('click', function () {
      if (!W.navigator.clipboard) return;
      W.navigator.clipboard.writeText(p.lat.toFixed(6) + ', ' + p.lon.toFixed(6)).then(function () { copyB.lastChild.textContent = 'Tersalin'; setTimeout(function () { copyB.lastChild.textContent = 'Salin koordinat'; }, 1200); }, function () { ctx.toast('Koordinat tidak dapat disalin.', 'warn'); });
    });
    var flyB = h('button', { type: 'button', class: 'btn btn--secondary pp-btn-s', disabled: veil() }, icon('target', 'icon--12'), h('span', { text: 'Perbesar ke lokasi' }));
    flyB.addEventListener('click', function () { flyTo(p.lon, p.lat, 16); });
    var dist = distOf(p), distRows = [];
    /* item 36: "Rute di Google Maps" right under the distance from KCP (coordinates only; not while the veil is on) */
    var route = veil() ? null : routeLink(p.lon, p.lat);
    if (DST()) {
      distRows.push(h('div', { class: 'dd-kv pp-kv--strong pp-kv--dist', title: distTip(p) }, h('span', { class: 'dd-kv__k', text: 'Jarak dari KCP' }),
        h('span', { class: 'dd-kv__v' }, distEl(p))));
      if (route) distRows.push(h('div', { class: 'pp-droute' }, route));
      distRows.push(h('p', { class: 'pp-hint', text: distTip(p) }));
    }
    distRows.push(kvRow(DST() ? 'Dari Mabes TNI (garis lurus)' : 'Jarak dari Mabes TNI (garis lurus)', fm.km(p.distanceKm)));
    if (route && !DST()) distRows.push(h('div', { class: 'pp-droute' }, route));
    body.push(blk('Lokasi', [locTags].concat(distRows).concat([kvRow('Alamat', [p.desa, p.kecamatan, p.kota].filter(Boolean).join(', ')), kvRow('Koordinat', coordTxt),
      h('p', { class: 'pp-hint', text: coordSourceEn(p.coordSource) }), p.coordNote ? h('p', { class: 'pp-warn', text: coordNoteEn(p.coordNote) }) : null,
      h('div', { class: 'pp-dact' }, flyB, copyB)])));
    var partners = (p.kprPartners || []);
    body.push(blk('Mitra KPR', [partnerTags, partners.length ? h('div', { class: 'pp-chips' }, partners.map(function (x) { return tagEl(x, x === 'Bank Mandiri' ? 'gold' : ''); })) : null,
      p.mandiriPartner === true ? h('p', { class: 'pp-hint', text: 'Disebut sebagai grup developer mitra di halaman KPR Bank Mandiri (tingkat grup, belum dikonfirmasi per proyek).' }) : h('p', { class: 'pp-hint', text: COPY.partnerUnknown + '.' })]));
    if (p.notes) body.push(h('details', { class: 'pp-note' }, h('summary', { class: 'pp-note__s' }, icon('info', 'icon--12'), h('span', { text: 'Catatan sumber (bahasa asli)' })), h('div', { class: 'pp-note__b' }, h('p', { lang: 'id', text: p.notes }))));
    var srcLink = p.sourceUrl ? h('a', { class: 'pp-src', href: p.sourceUrl, target: '_blank', rel: 'noopener noreferrer', text: p.sourceUrl.replace(/^https?:\/\//, '') }) : null;
    if (srcLink) body.push(blk('Sumber', [srcLink]));
    return {
      kind: 'project', key: 'project:' + id,
      /* the km of the same shown value as the head number (MCD.distance.format: its rounding, "Motor (tanpa tol)") */
      eyebrow: (CLS[cls].label + ' · ' + (dist && isNum(dist.km) && distKmText(p) ? distKmText(p) + ' dari KCP' : fm.km(p.distanceKm) + ' dari Mabes TNI')).toUpperCase(),
      title: p.name, gmaps: veil() ? null : { lat: p.lat, lon: p.lon },
      sub: [h('span', { text: [devGroup(p), p.kecamatan, p.kota].filter(Boolean).join(' · ') })],
      tags: tags.filter(Boolean),
      brief: projectBrief(row, r, cls), anchor: [p.lon, p.lat], hints: [],
      body: body,
      prov: 'Sumber: ' + (/^SiKumbang/.test(p.priceSource || '') ? 'SiKumbang' : 'developer atau berita') + (p.sikumbangId ? ' · ' + p.sikumbangId : '') + (p.registryUpdated ? ' · diperbarui ' + dateLabel(p.registryUpdated) : '') + ' · data publik · ' + flat(DISCLAIMER_EN)
    };
  }
  /**
   * v5 brief of a project (callout, phone peek, §9): Harga mulai (big) and the distance from KCP, the affordability
   * chip against the simulator (blue "Belum diperiksa" before a take-home pay), and its type.
   */
  function projectBrief(row, r, cls) {
    var p = row.p, fm = F(), nums = [], chips = [];
    nums.push({ label: 'Harga mulai', value: r.isFlpp ? rp(r.listPrice) : rp(p.priceMin), big: true, title: r.isFlpp ? 'Harga subsidi (FLPP)' : 'Rentang harga ' + priceRange(p) });
    /* "18,6 km" over "± 41 menit dari KCP": short values keep the numbers on one row of the card head */
    var d = distOf(p), dt = d ? distText(p) : '', cut = dt.indexOf(' · ');
    nums.push(!DST() ? { label: 'Dari Mabes TNI', value: fm.km(p.distanceKm), title: 'Jarak garis lurus dari Mabes TNI' }
      : cut > 0 ? { label: dt.slice(cut + 3) + ' dari KCP', value: dt.slice(0, cut), title: dt + '\n' + (distTip(p) || '') }
      : { label: 'Dari KCP', value: dt || '—', title: distTip(p) });
    chips.push(potentialOnly() ? { text: 'Belum diperiksa', tone: 'potential' } : { text: CLS[cls].label, tone: CLS[cls].tone });
    chips.push({ text: TYPE[p.type] || p.type, tone: 'none' });
    return { numbers: nums, chips: chips, primary: null, note: null };
  }
  /** v5 brief of a price area: the median rumah seken (the chosen floor area) and the change per year; main action
      "Lihat proyek di area ini" (the project list held to that area). */
  function areaBrief(a) {
    var b = a.benchmark || {}, lb = S().map.lbBand, fm = F(), nums = [], chips = [];
    var med = b.medianByLB ? b.medianByLB[lb] : null, lbl = (LB_BANDS.filter(function (x) { return x[0] === lb; })[0] || [])[1] || '';
    var yoy = isNum(a.yoyGrowth) ? a.yoyGrowth : b.yoyGrowth;
    nums.push({ label: 'Median rumah seken', value: isNum(med) ? rp(med) : '—', big: true, title: 'Bangunan ' + lbl + ', harga penawaran (Rumah123)' });
    nums.push({ label: 'Perubahan per tahun', value: isNum(yoy) ? (yoy >= 0 ? '+' : '') + fm.num(yoy, 1) + '%' : '—' });
    if (isNum(a.pricePerM2Land)) nums.push({ label: 'Tanah per m²', value: rp(a.pricePerM2Land) });
    var c = areaClass(a);
    if (c) chips.push({ text: CLS[c].label, tone: CLS[c].tone });
    return { numbers: nums.slice(0, 3), chips: chips, primary: { label: 'Lihat proyek di area ini', run: function () { showAreaProjects(a.id); } }, note: null };
  }
  /** "Lihat proyek di area ini": the Proyek tab, held to the projects of that area (kecamatan and kota), the panel opened. */
  function showAreaProjects(id) {
    var a = index().areaById[id];
    if (!a || !ctx) return false;
    if (refs.search) refs.search.value = '';
    setFilter({ area: id, q: '' });
    if (view === 'deep' && refs.rr) {
      setRailTab('projects');
      openRr();
      /* the held list starts at the area chip: scroll the panel there (the panel only, never the drawer itself) */
      timers.push(setTimeout(function () {
        var chip = refs.areaChip, body = refs.rr && refs.rr.querySelector('.pp-rr__body');
        if (!chip || chip.hidden || !body) return;
        var dy = chip.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
        if (dy > 0) body.scrollTop += dy;
      }, 220));
    }
    return true;
  }
  /** Open "Proyek dan area": the shell drawer to half height when adopted, else the slide-over below 1280 px. */
  function openRr() {
    var el = refs.rr;
    if (!el) return;
    if (adopted()) {
      var W0 = WS();
      safe(function () { if (W0 && typeof W0.drawer === 'function' && typeof W0.setDrawer === 'function' && W0.drawer() === 'peek') W0.setDrawer('half'); });
      return;
    }
    el.classList.add('is-open');
  }
  function segLabel(s) {
    var a = Math.ceil(s.from / 12), b = Math.ceil(s.to / 12);
    if (s.from % 12 === 1 && s.to % 12 === 0) return a === b ? 'tahun ' + a : 'tahun ' + a + '–' + b;
    return 'bulan ' + s.from + '–' + s.to;
  }
  /** Notes copied from the English research file: kept word for word inside a disclosure, so the drawer itself stays Indonesian. */
  function srcNote(texts) {
    return h('details', { class: 'pp-note' }, h('summary', { class: 'pp-note__s' }, icon('info', 'icon--12'), h('span', { text: 'Catatan sumber (bahasa Inggris)' })),
      h('div', { class: 'pp-note__b' }, texts.map(function (t) { return h('p', { lang: 'en', class: 'pp-dtext', text: t }); })));
  }
  function areaModel(id) {
    var I = index(), a = I.areaById[id];
    if (!a) return null;
    var b = a.benchmark || {}, fm = F(), body = [];
    var land = [];
    if (isNum(a.pricePerM2Land)) {
      land.push(kvRow('Tanah per m² (area ini)', rp(a.pricePerM2Land)));
      var landWhen = [a.pricePerM2LandAsOf ? monthLabel(a.pricePerM2LandAsOf) : '', a.pricePerM2LandSource ? srcLabel(a.pricePerM2LandSource) : ''].filter(Boolean).join(' · ');
      if (landWhen) land.push(h('p', { class: 'pp-hint', text: landWhen }));
      if (a.pricePerM2LandBasis) land.push(srcNote([a.pricePerM2LandBasis]));
    }
    if (isNum(b.subMarketLandPerM2)) land.push(kvRow('Rata-rata tanah per m², ' + (b.subMarket || 'sub-pasar'), rp(b.subMarketLandPerM2)));
    if (isNum(b.estPricePerM2LB)) land.push(kvRow('Bangunan per m² (perkiraan turunan)', rp(b.estPricePerM2LB)));
    body.push(blk('Tanah dan bangunan', land.length ? land : [h('p', { class: 't-empty', text: 'Belum ada harga tanah yang dipublikasikan untuk area ini.' })]));
    if (b.medianByLB) {
      var max = R && R.pan.maxPrice;
      body.push(blk('Median rumah seken menurut luas bangunan', LB_BANDS.map(function (x) {
        var v = b.medianByLB[x[0]], c = isNum(v) && max > 0 ? KM().affordClass(v, max, 15) : null;
        return h('div', { class: 'dd-kv' }, h('span', { class: 'dd-kv__k', text: x[1] }), h('span', { class: 'dd-kv__v' }, isNum(v) ? rp(v) : '—', c ? ' ' : null, c ? tagEl(CLS[c].tag, c.toLowerCase()) : null));
      }).concat([h('p', { class: 'pp-hint', text: (b.rumah123Market || a.kota) + ' · Rumah123 · ' + monthLabel(b.medianByLBAsOf || '2025-12') + ' · harga penawaran · kelas dibandingkan dengan harga tertinggi simulator (tanpa FLPP untuk rumah seken).' })])));
    }
    if (isNum(a.yoyGrowth)) body.push(blk('Perubahan harga tahunan', [kvRow(b.yoyGrowthMarket ? b.yoyGrowthMarket + ' indeks rumah seken' : 'Indeks rumah seken', (a.yoyGrowth >= 0 ? '+' : '') + fm.num(a.yoyGrowth, 1) + '%' + (b.yoyGrowthAsOf ? ' · ' + monthLabel(b.yoyGrowthAsOf) : ''))]));
    if ((a.listingSamples || []).length) {
      body.push(blk('Sampel harga penawaran', [h('table', { class: 'tbl pp-tbl' }, h('thead', null, h('tr', null, h('th', { text: 'Lokasi' }), h('th', { class: 'num', text: 'Tanah per m²' }))),
        h('tbody', null, a.listingSamples.map(function (s) { return h('tr', null, h('td', { text: s.location + (s.kecamatanInferred ? ' *' : '') }), h('td', { class: 'num', text: rp(s.askingPricePerM2Land) })); }))),
        h('p', { class: 'pp-hint', text: '* kecamatan diperkirakan dari nama jalan atau kelurahan.' })]));
    }
    var d = a.demand || {};
    if (isNum(d.rumah123BuyerInterestSharePct)) body.push(blk('Permintaan', [kvRow('Porsi minat pembeli (Rumah123)', fm.num(d.rumah123BuyerInterestSharePct, 1) + '%')]));
    if ((a.notes || []).length) body.push(blk('Catatan', [srcNote(a.notes)]));
    var tags = [tagEl(/^kecamatan/.test(a.valueLevel || '') ? 'Nilai area sendiri' : (a.level === 'kota' ? 'Nilai kota' : 'Nilai kota (data lama)'), 'soft'), tagEl(CONF[a.confidence] || a.confidence || '', 'soft'),
      a.centroidWithin30km === false ? tagEl('Titik tengah di luar 30 km', 'warn') : null];
    return {
      kind: 'area', key: 'area:' + id, brief: areaBrief(a), anchor: [a.lon, a.lat], hints: [],
      eyebrow: ((a.level === 'kota' ? 'Kota' : 'Kecamatan') + ' · ' + fm.km(a.distanceKm) + ' dari Mabes TNI').toUpperCase(),
      title: a.name, sub: [h('span', { text: a.level === 'kota' ? 'Acuan tingkat kota' : a.kota })], tags: tags.filter(Boolean), body: body,
      gmaps: { q: a.level === 'kota' ? a.name : 'Kecamatan ' + a.name + (a.kota ? ', ' + a.kota : '') },
      prov: 'Sumber: ' + (a.sources || []).map(srcLabel).join(' · ')
    };
  }

  /* ========================================================= KPR calculator */

  var GRID_TENORS = [5, 10, 15, 20, 25, 30];
  var GRID_RATES = [11, 12, 13, 14, 15, 16];             // floating rate after the fixed period, % a year

  function calcScheme(c) {
    var byId = schemeMap();
    return byId[c.schemeId] || (R && R.pan.scheme) || byId[(KC() || {}).defaultSchemeId];
  }
  function calcTenorCap(c) {
    var cap = c.isFlpp ? inputs().flppTenorCap : (c.isApartment ? 15 : 30);
    if (c.applyAge && R && R.pan.cap) cap = Math.min(cap, Math.max(1, R.pan.cap.years));
    return cap;
  }
  /** Income for the limit check: typed in the calculator, else the simulator's take-home pay (with its other instalments). */
  function calcIncome(c) {
    if (isNum(c.incomeForDsr) && c.incomeForDsr > 0) return { income: c.incomeForDsr, existing: 0, src: 'typed' };
    var i = inputs(), inc = (isNum(i.income) ? i.income : 0) + (i.jointOn && isNum(i.jointIncome) ? i.jointIncome : 0);
    return inc > 0 ? { income: inc, existing: isNum(i.existing) ? i.existing : 0, src: 'sim' } : { income: null, existing: 0, src: null };
  }
  function calcModel() {
    var c = S().calc, kc = KC(), M = KM();
    var isSub = c.isFlpp || c.isSubsidi;
    var list = isNum(c.price) ? Math.max(0, c.price) : 0;
    var ppnMode = isSub ? 'unknown' : c.opts.ppnMode;
    var price = M.effectivePrice(list, { ppnMode: ppnMode, dtpEligible: c.opts.dtpEligible, isSubsidi: isSub }, kc);
    var loan = c.loanTouched && isNum(c.loan) ? Math.max(0, c.loan) : price * (1 - c.dpPct / 100);
    var cap = calcTenorCap(c), T = clamp(Math.round(c.tenorYears || 20), 1, cap), n = T * 12;
    var scheme = calcScheme(c);
    var inc = calcIncome(c), income = inc.income;
    var dsr = dsrNow();
    var limit = income ? Math.max(0, income * dsr - inc.existing) : null;
    var stx = function (y) {
      return { asOf: asOf(), T: y, mode: 'calc', price: price, isApartment: c.isApartment, income: income || 0, married: inputs().married,
        signingYm: c.akadYm, showPlanned: true, cfg: kc };
    };
    var st = M.schemeStatus(scheme, stx(T));
    var opt = { floatingPct: c.floatingPct, stressBps: c.stressBps };
    var path = M.ratePath(scheme, n, opt);
    var sched = M.schedule(loan, path, n, { months: true });
    var cost = M.costs(price, loan, scheme, { region: c.region, firstAcquisition: c.opts.firstAcquisition, ktpDki: c.opts.ktpDki, hakBaru: c.opts.hakBaru,
      devCoversAjb: c.opts.devCoversAjb, isFlpp: c.isFlpp, listPrice: list, ppnMode: ppnMode, dtpEligible: c.opts.dtpEligible, isSubsidi: isSub }, kc);
    var warn = [];
    if (loan > price) warn.push('Pinjaman lebih besar daripada harga.');
    if (loan > 15e9) warn.push('Di atas plafond tertinggi KPR Livin’ Rp15 miliar.');
    if (loan > 0 && loan < 1e6) warn.push('Pinjaman di bawah Rp1 juta.');
    var ltv = MCD.config && MCD.config.programStatus ? MCD.config.programStatus('bi-ltv', asOf()) : null;
    if (ltv && ltv.ended && loan > price * 0.95) warn.push('Relaksasi DP 0% (PADG 30/2025) telah berakhir. Periksa batas LTV.');
    if (st.warn) warn.push(st.warn + '.');
    if (!st.ok) warn.push(schemeShort(scheme) + ': ' + st.reason + '.');
    var tenors = [10, 15, 20, 25, 30].map(function (y) {
      var s2 = M.schemeStatus(scheme, stx(y)), sc = M.schedule(loan, M.ratePath(scheme, y * 12, opt), y * 12);
      return { y: y, ok: s2.ok && y <= cap, why: !s2.ok ? s2.reason : (y > cap ? 'Di atas batas tenor ' + cap + ' tahun' : ''),
        first: sc.first, after: sc.segments.length > 1 ? sc.segments[sc.segments.length - 1].installment : null, max: sc.max, ti: sc.totalInterest, tp: sc.totalPaid };
    });
    var fixed = M.fixedForTenor(scheme, n);
    var stress = fixed ? [] : [0, 100, 200, 300].map(function (b) {
      var sc = M.schedule(loan, M.ratePath(scheme, n, { floatingPct: c.floatingPct, stressBps: b }), n);
      return { b: b, after: sc.max, ti: sc.totalInterest, rate: c.floatingPct + b / 100 };
    });
    // Heatmap: highest monthly instalment by tenor (rows, only tenors this scheme allows) × floating rate (columns)
    var curRate = Math.round((c.floatingPct + c.stressBps / 100) * 100) / 100;
    var gRates = GRID_RATES.indexOf(curRate) >= 0 ? GRID_RATES.slice() : GRID_RATES.concat([curRate]).sort(function (a, b) { return a - b; });
    var gTenors = (GRID_TENORS.indexOf(T) >= 0 ? GRID_TENORS.slice() : GRID_TENORS.concat([T]).sort(function (a, b) { return a - b; }))
      .filter(function (y) { return y <= cap && M.schemeStatus(scheme, stx(y)).ok; });
    var grid = gTenors.map(function (y) {
      return gRates.map(function (rt) { return M.schedule(loan, M.ratePath(scheme, y * 12, { floatingPct: rt, stressBps: 0 }), y * 12).max; });
    });
    var cmp = schemesList().filter(function (s) { return s.id === scheme.id || M.schemeStatus(s, stx(T)).ok; }).map(function (s) {
      var p2 = M.ratePath(s, n, opt), sc = M.schedule(loan, p2, n);
      return { s: s, first: sc.first, max: sc.max, ti: sc.totalInterest, plaf: limit ? M.maxPrincipal(limit, p2, n, 'max') : null, current: s.id === scheme.id };
    }).sort(function (a, b) { return a.max - b.max; });
    var cur = cmp.filter(function (x) { return x.current; })[0];
    cmp = cmp.filter(function (x) { return !x.current; }).slice(0, 7);
    if (cur) cmp.unshift(cur);
    var ended = schemeMapList().filter(function (s) {
      if (s.tier === 'Planned' && !inputs().showPlanned) return false;
      var code = M.schemeStatus(s, stx(T)).code;
      return code === 'expired' || code === 'reference';
    }).map(function (s) { return { s: s, status: M.schemeStatus(s, stx(T)) }; });
    var best = M.bestInTier(schemesList(), scheme.tier, T, { basis: 'max', floatingPct: c.floatingPct, stressBps: c.stressBps, status: stx(T) });
    var rev = null;
    if (c.mode === 'reverse') {
      var bud = isNum(c.budget) ? c.budget : 0, mp = M.maxPrincipal(bud, path, n, inputs().basis);
      rev = { budget: bud, maxLoan: mp, maxPrice: c.dpPct < 100 ? M.floor1000(mp / (1 - c.dpPct / 100)) : 0, sched: M.schedule(mp, path, n) };
    }
    return { c: c, list: list, price: price, loan: loan, dpPct: price > 0 ? (price - loan) / price * 100 : c.dpPct, T: T, cap: cap, n: n, scheme: scheme, status: st,
      path: path, sched: sched, cost: cost, warn: warn, tenors: tenors, stress: stress, fixed: fixed, cmp: cmp, ended: ended, best: best,
      income: income, existing: inc.existing, incomeSrc: inc.src, dsr: dsr, limit: limit, rev: rev, isSub: isSub,
      grid: { tenors: gTenors, rates: gRates, values: grid, curRate: curRate } };
  }
  /** Highest DSR for an instalment: (instalment + other instalments) ÷ income. */
  function dsrOf(inst, m) { return m.income ? (inst + m.existing) / m.income : null; }

  function openCalc(o) {
    o = o || {};
    var c = S().calc;
    if (!ctx || !R) return;
    if (o.projectId && R.byId[o.projectId]) {
      var row = R.byId[o.projectId], p = row.p, r = row.r;
      var high = o.priceMode === 'high' && isNum(p.priceMax);
      c.price = high ? p.priceMax : (r.isFlpp ? r.listPrice : p.priceMin);
      c.listPrice = c.price;
      c.isFlpp = !high && !!r.isFlpp;
      c.isSubsidi = c.isFlpp || p.segment === 'subsidi';
      c.isApartment = p.type === 'apartment';
      c.region = index().region[p.id].region;
      c.schemeId = !high && r.scheme ? r.scheme.id : (R.pan.scheme ? R.pan.scheme.id : null);
      c.tenorYears = r.T || c.tenorYears;
      c.dpPct = isNum(r.dp) ? r.dp : inputs().dpPct;
      c.loanTouched = false;
      c.sourceProjectId = p.id;
      c.fromSim = false;
      c.opts.ktpDki = inputs().ktpDki;
      c.mode = 'forward';
    } else if (!c.sourceProjectId && !c.priceTouched && seedFromSim()) {
      /* untouched: the calculator starts from the simulator's answer */
    } else if (!c.schemeId && R.pan.scheme) c.schemeId = R.pan.scheme.id;
    c.open = true;
    if (ctx.view() !== 'deep') { ctx.setView('deep'); return; }
    if (ctx.closeDrawer) ctx.closeDrawer();
    showCalc(true);
  }
  /** Start the calculator from the simulator's answer, so its charts describe the house this pay can buy. → true when seeded */
  function seedFromSim() {
    var c = S().calc;
    if (!R || R.pan.state !== 'ok' || !(R.pan.maxPrice > 0)) return false;
    c.price = c.listPrice = Math.floor(R.pan.maxPrice / 1e6) * 1e6;
    c.dpPct = inputs().dpPct;
    c.tenorYears = R.pan.T;
    c.schemeId = R.pan.scheme ? R.pan.scheme.id : c.schemeId;
    c.floatingPct = inputs().floatingPct;
    c.loanTouched = false;
    c.isFlpp = false; c.isSubsidi = false; c.isApartment = false;
    c.fromSim = true;
    return true;
  }
  function closeCalc() {
    S().calc.open = false;
    suspendWs(false);
    if (refs.calc) refs.calc.hidden = true;
    DOC.body.classList.remove('pp-calc-open');
    if (ctx) { ctx.relayout(); ctx.requestRender(['ext']); }
    if (refs.openCalc) refs.openCalc.focus();
  }
  function showCalc(focus) {
    if (!refs.calc) return;
    suspendWs(true);
    refs.calc.hidden = false;
    DOC.body.classList.add('pp-calc-open');
    syncCalcInputs();
    renderCalc();
    if (ctx) { ctx.relayout(); ctx.requestRender(['ext']); }
    if (focus) setTimeout(function () { if (refs.cTitle) refs.cTitle.focus(); }, 60);
  }
  function setCalc(patch, opts) {
    var c = S().calc;
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    if (opts) Object.keys(opts).forEach(function (k) { c.opts[k] = opts[k]; });
    changed('calc');
    refreshReadout();
  }

  function calcSchemeOptions(m) {
    var kc = KC(), groups = {}, c = S().calc;
    var T = m ? m.T : c.tenorYears;
    schemeMapList().forEach(function (s) {
      var st = KM().schemeStatus(s, { asOf: asOf(), T: T, mode: 'calc', price: m ? m.price : c.price, isApartment: c.isApartment, income: m && m.income || 0, married: inputs().married, showPlanned: true, cfg: kc });
      var g = s.referenceOnly ? 'Reference' : (st.code === 'expired' ? 'Ended' : (TIER_LABEL[s.tier] ? s.tier : 'Ended'));
      if (g === 'Planned' && !inputs().showPlanned) return;
      (groups[g] = groups[g] || []).push({ v: s.id, label: schemeName(s) + (st.ok ? '' : ' — ' + st.reason), disabled: (st.code === 'expired' || st.code === 'reference') && s.id !== c.schemeId });
    });
    return TIER_ORDER.filter(function (g) { return groups[g]; }).map(function (g) { return { group: TIER_LABEL[g], items: groups[g] }; });
  }
  function schemeMapList() { return ((KC() || {}).rateSchemes || []).concat([PLANNED]); }

  /** An exhibit block of the calculator: action title, unit and period subtitle, body, source line. */
  function exhibitBlk(id, cls, src) {
    var t = h('h3', { class: 'exhibit__title pp-c__t' }), sub = h('p', { class: 'exhibit__sub' }), body = h('div', { class: 'pp-c__body' });
    var el = h('section', { class: 'blk span-12 exhibit pp-cx ' + cls, id: id ? 'pp-c-' + id : null }, t, sub, body, src ? h('p', { class: 'exhibit__source', text: src }) : null);
    return { el: el, title: t, sub: sub, body: body };
  }
  var SRC_RATES = 'Sumber: tabel suku bunga Bank Mandiri (kpr-config.js, 12 Okt 2026) · bunga bulanan nominal, dihitung ulang setiap perubahan bunga · indikatif';

  function buildCalc() {
    var r = refs, c = S().calc;
    var titleId = uid('calc-t');
    r.cClose = h('button', { type: 'button', class: 'btn btn--secondary btn--lg pp-calc__close', title: 'Tutup kalkulator (Esc)', 'aria-keyshortcuts': 'Escape' }, icon('close'), h('span', { text: 'Tutup' }));
    r.cClose.addEventListener('click', closeCalc);
    r.cMode = seg([{ v: 'forward', label: 'Dari harga rumah' }, { v: 'reverse', label: 'Dari anggaran bulanan' }], c.mode, function (v) { setCalc({ mode: v }); syncCalcInputs(); }, { big: true, label: 'Mode kalkulator' });
    r.cSource = h('p', { class: 'pp-hint pp-calc__src' });
    r.cTabHost = h('div', { class: 'pp-ctabs' });
    // inputs
    var pid = uid('cprice');
    r.cPrice = moneyField({ id: pid, value: c.price, onChange: function (v) {
      setCalc({ price: v, listPrice: v, loanTouched: false, priceTouched: true, fromSim: false, sourceProjectId: c.sourceProjectId && v !== S().calc.price ? null : S().calc.sourceProjectId });
    } });
    r.cDpSeg = seg(DP_OPTS.map(function (v) { return { v: v, label: v + '%' }; }), c.dpPct, function (v) { setCalc({ dpPct: v, loanTouched: false }); syncCalcInputs(); }, { label: 'Uang muka (DP)', cls: 'pp-seg--fill' });
    r.cDpInp = h('input', { type: 'number', class: 'input input--num pp-dpin', min: '0', max: '90', step: '0.1', 'aria-label': 'Persen uang muka' });
    r.cDpInp.addEventListener('change', function () { var v = parseFloat(r.cDpInp.value); if (isNum(v)) { setCalc({ dpPct: clamp(v, 0, 90), loanTouched: false }); syncCalcInputs(); } });
    r.cDpRp = h('span', { class: 'pp-out' });
    var lid = uid('cloan');
    r.cLoan = moneyField({ id: lid, value: null, onChange: function (v) { if (isNum(v)) setCalc({ loan: v, loanTouched: true }); } });
    r.cLoanHint = hint('Jika plafond diubah, uang muka dihitung ulang.');
    r.cTenor = tenorPicker({ label: 'Tenor dalam tahun', onPick: function (y) { var m0 = calcModel(); setCalc({ tenorYears: clamp(y, 1, m0.cap) }); } });
    r.cTenorOut = h('span', { class: 'pp-out' });
    r.cAge = sw('Gunakan batas usia dari simulator', c.applyAge, function (on) { setCalc({ applyAge: on }); });
    r.cScheme = selectEl(calcSchemeOptions(null), c.schemeId, function (v) { setCalc({ schemeId: v }); }, 'Skema KPR', 'pp-scheme');
    r.cSchemeInfo = h('p', { class: 'pp-hint pp-hint--mono' });
    r.cFloat = rangeIn({ min: 11.75, max: 13.5, step: 0.05, value: c.floatingPct, label: 'Bunga floating', onInput: function (v) { setCalc({ floatingPct: Math.round(v * 100) / 100 }); } });
    r.cFloatOut = h('span', { class: 'pp-out' });
    r.cStress = seg([0, 100, 200, 300].map(function (b) { return { v: b, label: '+' + b / 100 + '%' }; }), c.stressBps, function (v) { setCalc({ stressBps: v }); }, { label: 'Uji kenaikan bunga' });
    r.cAkad = selectEl(nextMonths(12).map(function (m) { return { v: m, label: monthLabel(m) }; }), c.akadYm, function (v) { setCalc({ akadYm: v }); }, 'Bulan akad');
    r.cRegion = selectEl(REGIONS.map(function (x) { return { v: x, label: x }; }), c.region, function (v) { setCalc({ region: v }); syncCalcInputs(); }, 'Wilayah BPHTB');
    r.cFirst = sw('Pembelian rumah pertama di wilayah ini', c.opts.firstAcquisition, function (on) { setCalc({}, { firstAcquisition: on }); });
    r.cKtp = sw('KTP DKI', c.opts.ktpDki, function (on) { setCalc({}, { ktpDki: on }); });
    r.cHak = sw('Hak baru (periksa dengan PPAT)', c.opts.hakBaru, function (on) { setCalc({}, { hakBaru: on }); });
    r.cAjb = sw('Developer menanggung AJB/BBN', c.opts.devCoversAjb, function (on) { setCalc({}, { devCoversAjb: on }); });
    r.cPpn = seg([{ v: 'unknown', label: 'Belum diketahui' }, { v: 'included', label: 'Termasuk' }, { v: 'excluded', label: 'Tidak termasuk' }], c.opts.ppnMode, function (v) { setCalc({}, { ppnMode: v }); }, { label: 'PPN dalam harga' });
    r.cDtp = sw('Rumah baru siap huni, serah terima sampai 31 Des 2026 (PPN ditanggung pemerintah)', c.opts.dtpEligible, function (on) { setCalc({}, { dtpEligible: on }); });
    r.cPpnBox = h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'PPN dalam harga' }), r.cPpn.el, r.cDtp.el);
    var iid = uid('cinc');
    r.cIncome = moneyField({ id: iid, value: c.incomeForDsr, placeholder: 'Dari simulator', onChange: function (v) { setCalc({ incomeForDsr: v }); } });
    r.cIncHint = hint('');
    var bid = uid('cbud');
    r.cBudget = moneyField({ id: bid, value: c.budget, onChange: function (v) { setCalc({ budget: v }); } });
    r.cUseBud = h('button', { type: 'button', class: 'btn btn--ghost pp-btn-s' }, h('span', { text: 'Gunakan batas dari simulator' }));
    r.cUseBud.addEventListener('click', function () { if (R && R.pan.budget > 0) { setCalc({ budget: KM().floor1000(R.pan.budget) }); syncCalcInputs(); } });
    r.cFwd = h('div', { class: 'pp-cin__fwd' },
      field('Harga rumah', r.cPrice.el, { forId: pid }),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Uang muka (DP)' }), r.cDpSeg.el,
        h('div', { class: 'pp-row' }, r.cDpInp, h('span', { class: 'pp-hint', text: '%' }), r.cDpRp)),
      field('Plafond', r.cLoan.el, { forId: lid, hint: r.cLoanHint }));
    r.cRev = h('div', { class: 'pp-cin__rev' },
      field('Anggaran angsuran per bulan', r.cBudget.el, { forId: bid, hint: r.cUseBud }),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Uang muka (DP)' }), (r.cDpSegRevApi = seg(DP_OPTS.map(function (v) { return { v: v, label: v + '%' }; }), c.dpPct, function (v) { setCalc({ dpPct: v }); syncCalcInputs(); }, { label: 'Uang muka (DP)', cls: 'pp-seg--fill' })).el));
    r.cIn = h('section', { class: 'blk span-4 pp-cin', id: 'pp-c-in', 'aria-label': 'Isian' },
      h('h3', { class: 'pp-grp__t', text: 'Isian' }), r.cFwd, r.cRev,
      h('div', { class: 'pp-field' }, h('div', { class: 'pp-row pp-row--between' }, h('span', { class: 'pp-field__label', text: 'Tenor' }), r.cTenorOut), r.cTenor.el, r.cAge.el),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Skema' }), r.cScheme.el, r.cSchemeInfo),
      field('Bulan akad', r.cAkad.el),
      h('div', { class: 'pp-field' }, h('div', { class: 'pp-row pp-row--between' }, h('span', { class: 'pp-field__label', text: 'Bunga floating' }), r.cFloatOut), r.cFloat.el),
      h('div', { class: 'pp-field' }, h('span', { class: 'pp-field__label', text: 'Uji kenaikan bunga' }), r.cStress.el),
      field('Penghasilan bersih untuk cek batas', r.cIncome.el, { forId: iid, hint: r.cIncHint, sub: 'tidak disimpan' }));
    r.cResOut = h('div', { class: 'pp-cres__out', 'aria-live': 'polite' });
    r.cRes = h('section', { class: 'blk span-8 pp-cres', id: 'pp-c-res', 'aria-label': 'Hasil' }, r.cResOut);
    // exhibits
    r.xAm = exhibitBlk('am', 'pp-cam', SRC_RATES);
    r.xTot = exhibitBlk('tc', 'pp-ctot', 'Sumber: aturan biaya dan pajak kpr-config.js (halaman Bank Mandiri, PMK 90/2025, aturan BPHTB daerah) · simulasi ini · indikatif');
    r.xHm = exhibitBlk('hm', 'pp-chm', SRC_RATES);
    r.xTen = exhibitBlk('ts', 'pp-cten', SRC_RATES);
    r.xStr = exhibitBlk(null, 'pp-cstr', SRC_RATES);
    r.xSch = exhibitBlk('sc', 'pp-csch', 'Sumber: halaman KPR dan promo Bank Mandiri (kpr-config.js, suku bunga per ' + dateLabel((KC() || {}).asOf) + ')');
    r.cAmChart = h('div', { class: 'pp-chart pp-chart--am' });
    r.xAm.body.appendChild(r.cAmChart);
    r.cTotChart = h('div', { class: 'pp-chart pp-chart--donut' });
    r.cTotKv = h('div', { class: 'pp-kvs pp-ctot__kv' });
    r.xTot.body.appendChild(h('div', { class: 'pp-ctot__grid' }, r.cTotChart, r.cTotKv));
    r.cHmChart = h('div', { class: 'pp-chart pp-chart--hm' });
    r.cHmLegend = h('ul', { class: 'pp-hmkey', 'aria-hidden': 'true' });
    r.xHm.body.appendChild(r.cHmChart);
    r.xHm.body.appendChild(r.cHmLegend);
    r.cTenChart = h('div', { class: 'pp-chart pp-chart--ten' });
    r.cTenTbl = h('div');
    r.xTen.body.appendChild(r.cTenChart);
    r.xTen.body.appendChild(r.cTenTbl);
    r.cCostIn = h('div', { class: 'pp-ccost__in' }, h('h3', { class: 'pp-grp__t', text: 'Pajak dan biaya' }), field('Wilayah BPHTB', r.cRegion.el),
      r.cFirst.el, r.cKtp.el, r.cHak.el, r.cAjb.el, r.cPpnBox);
    r.cCostOut = h('div', { class: 'pp-ccost__out' });
    r.cCost = h('section', { class: 'blk span-12 exhibit pp-cx pp-ccost', id: 'pp-c-co' }, r.cCostIn, r.cCostOut);
    r.cAss = h('section', { class: 'blk span-12 pp-cass', id: 'pp-c-as' });
    // footer actions
    r.cPrint = h('button', { type: 'button', class: 'btn btn--primary btn--lg', 'aria-keyshortcuts': 'P' }, icon('download'), h('span', { text: 'Cetak simulasi' }));
    r.cPrint.addEventListener('click', printSim);
    r.cCsv = h('button', { type: 'button', class: 'btn btn--secondary btn--lg' }, icon('download'), h('span', { text: 'Unduh CSV' }));
    r.cCsv.addEventListener('click', exportSchedule);
    r.cCopy = h('button', { type: 'button', class: 'btn btn--secondary btn--lg' }, icon('copy'), h('span', { text: 'Salin ringkasan' }));
    r.cCopy.addEventListener('click', copySummary);
    if (MCD.demo && MCD.demo.guard) [r.cPrint, r.cCsv, r.cCopy].forEach(function (b) { MCD.demo.guard(b); });
    r.cTitle = h('h2', { class: 'pp-calc__title', id: titleId, tabIndex: -1, text: 'Kalkulator KPR' });
    r.calc = h('section', { class: 'sheet panel panel--sheet pp-calc', role: 'region', 'aria-labelledby': titleId, hidden: true },
      h('div', { class: 'sheet__scroll' },
        h('div', { class: 'sheet__head pp-calc__head' },
          h('div', { class: 'pp-row pp-row--between pp-row--top' },
            h('div', null, h('p', { class: 'pg-where', text: 'KPR › Kalkulator KPR' }), r.cTitle,
              h('p', { class: 'pp-hint', text: 'Suku bunga per ' + dateLabel((KC() || {}).asOf) + ' · simulasi indikatif' })), r.cClose),
          r.cMode.el, r.cSource),
        r.cTabHost,
        (r.cGrid = h('div', { class: 'sheet__body grid-12 pp-calc__grid' }, r.cIn, r.cRes, r.xAm.el, r.xHm.el, r.xTen.el, r.xStr.el, r.xTot.el, r.cCost, r.cAss, r.xSch.el))),
      h('footer', { class: 'pg-foot pp-calc__foot' }, h('div', { class: 'pp-row pp-row--wrap' }, r.cPrint, r.cCsv, r.cCopy),
        h('p', { class: 'pp-disc', text: DISCLAIMER_EN })));
    r.calc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCalc(); } });
    host.appendChild(r.calc);
    /* the four tabs (UX_FIX_PLAN C-08): each part of the calculator in its own panel */
    [[r.cIn, 'hasil'], [r.cRes, 'hasil'], [r.xAm.el, 'tahun'], [r.xHm.el, 'tahun'], [r.xTen.el, 'tahun'], [r.xStr.el, 'tahun'],
      [r.xTot.el, 'biaya'], [r.cCost, 'biaya'], [r.cAss, 'biaya'], [r.xSch.el, 'skema']].forEach(function (x) { x[0].setAttribute('data-ctab', x[1]); });
    r.cTabs = calcTabs(r.cTabHost, r.cGrid);
    showCalcTab(S().calc.tab || 'hasil');
  }

  var CALC_TABS = [{ id: 'hasil', label: 'Hasil' }, { id: 'tahun', label: 'Per tahun' }, { id: 'biaya', label: 'Biaya' }, { id: 'skema', label: 'Skema' }];
  /** The shell's ctx.tabs when present (A-09), else an equivalent tablist. */
  function calcTabs(hostEl, panel) {
    var active = S().calc.tab || 'hasil';
    if (ctx && typeof ctx.tabs === 'function') {
      var t = safe(function () { return ctx.tabs(hostEl, { items: CALC_TABS, active: active, panel: panel, label: 'Bagian kalkulator KPR', onChange: function (id) { showCalcTab(id); } }); });
      if (t && t.el) { if (!t.el.parentNode) hostEl.appendChild(t.el); return t; }
    }
    var list = h('div', { class: 'pp-tabs pp-tabs--calc', role: 'tablist', 'aria-label': 'Bagian kalkulator KPR' });
    var btns = CALC_TABS.map(function (x, k) {
      var b = h('button', { type: 'button', role: 'tab', class: 'pp-tab', id: 'pp-ctab-' + x.id, 'aria-selected': 'false', tabIndex: -1 }, h('span', { text: x.label }));
      b.addEventListener('click', function () { showCalcTab(x.id); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var n = CALC_TABS[(k + (e.key === 'ArrowLeft' ? -1 : 1) + CALC_TABS.length) % CALC_TABS.length].id;
        showCalcTab(n); btns[CALC_TABS.map(function (q) { return q.id; }).indexOf(n)].focus();
      });
      list.appendChild(b);
      return b;
    });
    hostEl.appendChild(list);
    return { el: list, set: function (id) { btns.forEach(function (b, k) { var on = CALC_TABS[k].id === id; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }, get: function () { return S().calc.tab; } };
  }
  function showCalcTab(id) {
    var r = refs;
    if (!r.cGrid) return;
    if (!CALC_TABS.some(function (x) { return x.id === id; })) id = 'hasil';
    var changed = S().calc.tab !== id;
    S().calc.tab = id;
    Array.prototype.forEach.call(r.cGrid.querySelectorAll('[data-ctab]'), function (n) { n.hidden = n.getAttribute('data-ctab') !== id; });
    if (r.cTabs && typeof r.cTabs.set === 'function' && (!r.cTabs.get || r.cTabs.get() !== id)) r.cTabs.set(id);
    if (changed && r.calc && !r.calc.hidden) {
      var sc = r.calc.querySelector('.sheet__scroll');
      if (sc) sc.scrollTop = 0;
      renderCalc();
      eachChart(function (ch) { if (ch.resize) ch.resize(); });
    }
  }

  function syncCalcInputs() {
    var r = refs, c = S().calc;
    if (!r.calc) return;
    var m = calcModel();
    r.cMode.set(c.mode);
    r.cFwd.hidden = c.mode !== 'forward';
    r.cRev.hidden = c.mode !== 'reverse';
    r.cPrice.set(c.price);
    r.cDpSeg.set(DP_OPTS.indexOf(Math.round(m.dpPct * 10) / 10) >= 0 ? Math.round(m.dpPct * 10) / 10 : null);
    if (DOC.activeElement !== r.cDpInp) r.cDpInp.value = String(Math.round(m.dpPct * 10) / 10);
    r.cLoan.set(Math.round(m.loan));
    r.cScheme.fill(calcSchemeOptions(m), c.schemeId || (m.scheme && m.scheme.id));
    r.cStress.set(c.stressBps);
    r.cAkad.set(c.akadYm);
    r.cRegion.set(c.region);
    r.cFirst.set(c.opts.firstAcquisition); r.cKtp.set(c.opts.ktpDki); r.cHak.set(c.opts.hakBaru); r.cAjb.set(c.opts.devCoversAjb);
    r.cPpn.set(c.opts.ppnMode); r.cDtp.set(c.opts.dtpEligible);
    r.cIncome.set(c.incomeForDsr);
    r.cIncome.mask(veil(), c.incomeForDsr);
    r.cBudget.set(c.budget);
    if (r.cDpSegRevApi) r.cDpSegRevApi.set(c.dpPct);
    r.cAge.set(c.applyAge);
  }

  function tbl(head, rows, o) {
    o = o || {};
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl tbl--36 pp-tbl' + (o.cls ? ' ' + o.cls : '') },
      o.caption ? h('caption', { class: 'sr-only', text: o.caption }) : null,
      h('thead', null, h('tr', null, head.map(function (x, i) { return h('th', { scope: 'col', class: i ? 'num' : null, text: x }); }))),
      h('tbody', null, rows)));
  }
  function exhibitHead(title, sub) { return [h('h3', { class: 'exhibit__title pp-c__t', text: title }), sub ? h('p', { class: 'exhibit__sub', text: sub }) : null]; }
  /** A status chip in words: the same colours as the map (Affordable / Stretch / Out of reach). */
  function fitChip(tone) {
    var cls = { ok: 'A', mid: 'S', bad: 'O' }[tone];
    return h('span', { class: 'pp-chip is-' + (tone || 'none'), text: cls ? CLS[cls].label : 'Belum ada batas' });
  }
  var TAGS = { dp: '', provisi: 'SUMBER', admin: 'ESTIMASI', layanan: 'SUMBER', appraisal: 'ESTIMASI', notarisKpr: 'ESTIMASI', ppatAjb: 'ESTIMASI', asuransiJiwa: 'ESTIMASI', asuransiKebakaran: 'ASUMSI', bphtb: 'SUMBER' };
  var COST_LABEL = { dp: 'Uang muka (DP)', provisi: 'Biaya provisi', admin: 'Biaya administrasi', layanan: 'Biaya layanan', appraisal: 'Appraisal', notarisKpr: 'Notaris KPR',
    ppatAjb: 'PPAT / AJB', asuransiJiwa: 'Asuransi jiwa (premi tunggal)', asuransiKebakaran: 'Asuransi kebakaran (tahun pertama)', bphtb: 'BPHTB', ppn: 'PPN' };
  function costFormula(k, m) {
    var F2 = (KC() || {}).fees || {}, sf = (m.scheme && m.scheme.fees) || {};
    switch (k) {
      case 'dp': return 'Harga − plafond';
      case 'provisi': return 'Plafond × ' + (isNum(sf.provisiPct) ? sf.provisiPct : F2.provisiPct) + '%' + (sf.provisiMinIdr ? ', paling sedikit ' + rp(sf.provisiMinIdr) : '');
      case 'admin': return 'Nominal tetap' + (isNum(sf.adminIdr) ? ' (skema)' : ' (kisaran industri Rp250.000–500.000)');
      case 'layanan': return 'Plafond × ' + (isNum(sf.biayaLayananPct) ? sf.biayaLayananPct : 0) + '%';
      case 'appraisal': return m.c.isFlpp ? 'Tidak dikenakan untuk FLPP' : 'Nominal tetap (kisaran industri Rp0,5–1,5 juta)';
      case 'notarisKpr': return 'Plafond × 0,75% (praktik 0,7–1%)';
      case 'ppatAjb': return m.c.opts.devCoversAjb ? 'Ditanggung developer' : 'Harga × 0,75% (honor PPAT paling tinggi 1%)';
      case 'asuransiJiwa': return 'Plafond × 1,5% (1–2%, bergantung pada usia)';
      case 'asuransiKebakaran': return 'Nilai bangunan (60% harga, asumsi) × 0,05% per tahun';
      case 'bphtb': return '5% × (harga − NPOPTKP wilayah)' + (m.c.isFlpp ? ' · pembebasan MBR, periksa per wilayah' : '');
      default: return '';
    }
  }

  function renderCalc() {
    var r = refs;
    if (!r.calc || r.calc.hidden || !R) return;
    var m = calcModel(), c = m.c, fm = F();
    // header source line
    var src = c.sourceProjectId && index().byId[c.sourceProjectId];
    clear(r.cSource);
    r.cSource.appendChild(h('span', { text: src ? 'Harga dari proyek ' + src.name + (c.isFlpp ? ' (harga subsidi FLPP)' : '') + '. '
      : (c.fromSim ? 'Harga diisi dengan harga tertinggi simulator untuk penghasilan ini. ' : 'Harga diisi sendiri. ') }));
    if (src || c.fromSim) {
      var clr = h('button', { type: 'button', class: 'btn btn--ghost pp-btn-s', text: 'Isi harga' });
      clr.addEventListener('click', function () {
        setCalc({ sourceProjectId: null, fromSim: false, priceTouched: true, isFlpp: false, isSubsidi: false, isApartment: false });
        syncCalcInputs();
        setTimeout(function () { if (refs.cPrice) { refs.cPrice.input.focus(); refs.cPrice.input.select(); } }, 0);
      });
      r.cSource.appendChild(clr);
    }
    r.cDpRp.textContent = 'DP ' + rpRow(m.price - m.loan) + (c.isFlpp ? ' · DP FLPP paling sedikit 1%' : '');
    r.cTenor.set(m.T, 1, m.cap);
    r.cTenorOut.textContent = yrs(m.T) + ' · paling lama ' + m.cap + ' tahun' + (c.isApartment && !c.isFlpp ? ' (apartemen)' : (c.isFlpp ? ' (FLPP)' : ''));
    r.cSchemeInfo.textContent = pathText(m.path) + (m.scheme.validUntil ? ' · sampai ' + dateLabel(m.scheme.validUntil) : '');
    r.cFloat.set(c.floatingPct, 11.75, 13.5, fm.num(c.floatingPct, 2) + ' persen');
    r.cFloat.el.disabled = m.fixed;
    r.cStress.btns.forEach(function (b) { b.disabled = m.fixed; });
    r.cFloatOut.textContent = m.fixed ? 'fixed sepanjang tenor' : ratePct(c.floatingPct) + ' · SBDK ' + ratePct(((KC() || {}).sbdk || {}).kprKpaPct);
    r.cIncHint.textContent = m.incomeSrc === 'sim' ? 'Menggunakan ' + (veil() ? 'penghasilan bersih simulator' : rp(m.income)) + (m.existing ? ' dikurangi ' + rp(m.existing) + ' angsuran lain' : '') + '. Isi angka untuk menggantinya.'
      : (m.incomeSrc === 'typed' ? 'Diisi di sini. Kosongkan untuk menggunakan angka simulator.' : 'Isi penghasilan bersih untuk memeriksa angsuran terhadap batas ' + fm.pct(m.dsr, 0) + '.');
    r.cKtp.el.hidden = c.region !== 'DKI Jakarta';
    r.cPpnBox.hidden = m.isSub;
    var blocked = veil();
    [r.cPrint, r.cCsv, r.cCopy].forEach(function (b) { if (blocked) { b.disabled = true; b.title = 'Tidak tersedia saat nama disamarkan'; } else if (!(MCD.demo && MCD.demo.isOn())) { b.disabled = false; b.title = ''; } });
    renderCalcResults(m);
    renderCalcChart(m);
    renderCalcTotal(m);
    renderCalcGrid(m);
    renderCalcTables(m);
    renderCalcCosts(m);
    renderCalcAssumptions(m);
  }

  function renderCalcResults(m) {
    var box = refs.cResOut, c = m.c, fm = F();
    clear(box);
    box.appendChild(h('h3', { class: 'pp-grp__t', text: 'Hasil' }));
    if (c.mode === 'reverse' && m.rev) {
      box.appendChild(h('div', { class: 'pp-hero' }, h('span', { class: 'pp-hero__k', text: 'Harga rumah tertinggi' }), h('span', { class: 'pp-hero__v', text: m.rev.maxPrice > 0 ? rpLimit(m.rev.maxPrice) : '—' })));
      box.appendChild(h('div', { class: 'pp-figs' },
        fig('Plafond tertinggi', rpLimit(m.rev.maxLoan)), fig('Uang muka ' + fm.num(c.dpPct, 0) + '%', rpLimit(m.rev.maxPrice - m.rev.maxLoan)),
        fig('Angsuran', m.rev.sched.segments.length ? m.rev.sched.segments.map(function (s) { return rpFull(s.installment); }).join(' → ') : '—')));
      box.appendChild(hint('Dihitung dari angsuran ' + (inputs().basis === 'first' ? 'promo' : 'tertinggi') + ' selama tenor, untuk ' + years(m.T) + ' dengan ' + schemeShort(m.scheme) + '.'));
    } else {
      var segs = m.sched.segments;
      if (!segs.length || !(m.loan > 0)) { box.appendChild(h('p', { class: 't-empty', text: 'Isi harga rumah untuk melihat angsuran.' })); return; }
      box.appendChild(h('div', { class: 'pp-hero' }, h('span', { class: 'pp-hero__k', text: 'Angsuran ' + segLabel(segs[0]) + ' · ' + ratePct(segs[0].rate) }),
        h('span', { class: 'pp-hero__v', text: rpFull(segs[0].installment) })));
      var later = segs.slice(1).map(function (s) { return fig('Angsuran ' + segLabel(s) + ' · ' + ratePct(s.rate), rpFull(s.installment)); });
      if (later.length) box.appendChild(h('div', { class: 'pp-figs' }, later));
      var shock = m.sched.shockPct;
      if (shock > 0.5) {
        var at = segs[1] ? segs[1].from : 0;
        box.appendChild(h('p', { class: 'pp-shock' + (shock > 60 ? ' is-neg' : (shock > 30 ? ' is-warn' : '')), title: 'Angsuran naik ' + fm.num(shock, 1) + '% saat masa fixed berakhir di bulan ke-' + at + '.' },
          '▲ ' + fm.num(shock, 1) + '% setelah masa fixed'));
      }
      box.appendChild(h('div', { class: 'pp-figs' }, fig('Total bunga', rp(m.sched.totalInterest)), fig('Total pembayaran', rp(m.sched.totalPaid)),
        fig('Dana tunai yang dibutuhkan', rpRow(m.cost.total), 'DP dan biaya di muka')));
      if (m.limit != null) {
        var tone = fitTone(m.sched.max, m.limit), d = dsrOf(m.sched.max, m);
        var words = tone === 'ok' ? 'Angsuran tertinggi, ' + rpFull(m.sched.max) + ', masih dalam batas ' + rpLimit(m.limit) + ' per bulan.'
          : (tone === 'mid' ? 'Angsuran tertinggi, ' + rpFull(m.sched.max) + ', hingga 15% di atas batas ' + rpLimit(m.limit) + ' per bulan.'
            : 'Angsuran tertinggi, ' + rpFull(m.sched.max) + ', lebih dari 15% di atas batas ' + rpLimit(m.limit) + ' per bulan.');
        box.appendChild(h('div', { class: 'pp-dsr is-' + (tone || 'none') }, fitChip(tone),
          h('p', { class: 'pp-dsr__t', text: words }),
          h('p', { class: 'pp-dsr__s', text: 'DSR tertinggi ' + fm.pct(d, 1) + ', batas ' + fm.pct(m.dsr, 0) + ' (asumsi)' + (m.existing ? ', termasuk angsuran lain' : '') + '.' })));
      } else box.appendChild(hint('Isi penghasilan bersih (di bawah isian) untuk memeriksa angsuran terhadap batas ' + fm.pct(m.dsr, 0) + '.'));
    }
    m.warn.forEach(function (w) { box.appendChild(h('p', { class: 'pp-warn', text: w })); });
  }
  function fig(k, v, sub) { return h('div', { class: 'pp-fig' }, h('span', { class: 'pp-fig__k', text: k }), h('span', { class: 'pp-fig__v', text: v }), sub ? h('span', { class: 'pp-fig__s', text: sub }) : null); }

  function chartData(m) {
    var rows = [], mo = m.sched.months;
    for (var k = 0; k < m.n; k++) rows.push({ month: k + 1, principal: mo.prin[k], interest: mo.int[k], payment: mo.inst[k], balance: mo.bal[k] });
    var first = nextMonthOf(m.c.akadYm);
    return { schedule: rows, segments: m.sched.segments.map(function (s) { return { from: s.from, to: s.to, rate: s.rate / 100, label: s.kind === 'float' ? 'Floating' : 'Fixed' }; }), start: first + '-01' };
  }
  function nextMonthOf(ym) {
    var a = String(ym || nextMonths(1)[0]).split('-').map(Number), m = a[1] + 1, y = a[0];
    if (m > 12) { m = 1; y += 1; }
    return y + '-' + String(m).padStart(2, '0');
  }
  /** Draw (or update) a charts-plus chart kept in charts[key]; null when the factory is missing. */
  function plusChart(key, kind, el, data, cfg) {
    var fn = plus(kind);
    if (!fn) return null;
    if (charts[key] && charts[key].kind === kind) { safe(function () { charts[key].update(data, cfg); }); return charts[key]; }
    if (charts[key] && charts[key].destroy) safe(function () { charts[key].destroy(); });
    clear(el);
    charts[key] = safe(function () { return fn(el, data, cfg); });
    return charts[key];
  }
  function dropChart(key, el) {
    if (charts[key] && charts[key].destroy) safe(function () { charts[key].destroy(); });
    charts[key] = null;
    if (el) clear(el);
  }

  /** Year by year: stacked principal and interest bars, loan balance line (right axis). */
  function renderCalcChart(m) {
    var r = refs, x = r.xAm, segs = m.sched.segments, fm = F();
    var fixedSegs = segs.filter(function (s) { return s.kind === 'fixed'; });
    var fixedEnd = fixedSegs.length ? Math.round(fixedSegs[fixedSegs.length - 1].to / 12 * 10) / 10 : 0;
    x.title.textContent = !(m.loan > 0) ? 'Isi harga rumah untuk melihat pinjaman per tahun'
      : (segs.length > 1 ? 'Angsuran mulai ' + rpFull(segs[0].installment) + ' per bulan, lalu naik menjadi ' + rpFull(m.sched.max) + ' saat masa fixed berakhir setelah tahun ke-' + fm.num(fixedEnd, fixedEnd % 1 ? 1 : 0)
        : 'Angsuran tetap ' + rpFull(segs[0] ? segs[0].installment : 0) + ' per bulan selama ' + years(m.T));
    x.sub.textContent = 'Pokok dan bunga per tahun (batang, Rp) dan sisa pinjaman akhir tahun (garis, sumbu kanan) · plafond ' + rp(m.loan) + ', ' + years(m.T);
    if (!(m.loan > 0)) { dropChart('amort', r.cAmChart); return; }
    var yr = KM().yearly(m.sched);
    var data = {
      categories: yr.map(function (y) { return { key: 'y' + y.year, label: String(y.year) }; }),
      bars: [{ key: 'principal', label: 'Pokok', values: yr.map(function (y) { return y.principal; }), color: 'chart-4' },
        { key: 'interest', label: 'Bunga', values: yr.map(function (y) { return y.interest; }), color: 'chart-2' }],
      line: { key: 'balance', label: 'Sisa pinjaman akhir tahun', values: yr.map(function (y) { return Math.max(0, y.endBalance); }), axis: 'right', format: 'rp', axisLabel: 'Sisa' }
    };
    var cfg = { stacked: true, format: 'rp', barLabels: false, lineLabels: false, categoryLabel: 'Tahun ke-', leftLabel: 'Dibayar dalam setahun',
      label: 'Pembayaran KPR per tahun', tableToggle: true, height: 300 };
    if (plusChart('amort', 'combo', r.cAmChart, data, cfg)) return;
    // Without charts-plus.js: the yearly area chart of charts.js
    if (!MCD.charts || !MCD.charts.amortizationArea) { clear(r.cAmChart); return; }
    var cd = chartData(m), c0 = { mode: 'yearly', balance: true, principalColor: 'amort-principal', interestColor: 'amort-interest', fixedLabel: 'Masa fixed berakhir', label: 'Grafik angsuran KPR', tableToggle: 'visible', height: 280 };
    if (!charts.amortOld) charts.amortOld = MCD.charts.amortizationArea(r.cAmChart, cd, c0);
    else safe(function () { charts.amortOld.update(cd, c0); });
  }

  /** Total cost of owning the house: down payment, loan principal, interest, fees and taxes. */
  function renderCalcTotal(m) {
    var r = refs, x = r.xTot, fm = F(), cost = m.cost;
    var fees = Math.max(0, cost.total - cost.dp), interest = m.sched.totalInterest;
    var total = cost.dp + m.loan + interest + fees;
    x.title.textContent = !(m.loan > 0) ? 'Isi harga rumah untuk melihat total biaya'
      : 'Selama ' + years(m.T) + ', total biaya rumah ' + rp(total) + '. Bunga ' + fm.pct(total > 0 ? interest / total : 0, 0) + ' dari total.';
    x.sub.textContent = 'Semua pembayaran untuk rumah ini (Rp) · tunai saat akad: DP, biaya dan pajak · angsuran: pokok dan bunga';
    clear(r.cTotKv);
    var parts = [['Uang muka (DP)', cost.dp, 'Tunai saat akad'], ['Pokok pinjaman', m.loan, 'Dilunasi selama ' + years(m.T)], ['Bunga', interest, ratePct(m.sched.segments[0] ? m.sched.segments[0].rate : null) + ' pertama, ' + (m.fixed ? 'fixed' : ratePct(m.c.floatingPct + m.c.stressBps / 100) + ' floating')],
      ['Biaya dan pajak', fees, 'Notaris, asuransi, BPHTB dan lainnya']];
    parts.forEach(function (p) { r.cTotKv.appendChild(h('div', { class: 'dd-kv' }, h('span', { class: 'dd-kv__k' }, p[0], h('span', { class: 'pp-formula', text: p[2] })), h('span', { class: 'dd-kv__v', text: rpRow(p[1]) }))); });
    r.cTotKv.appendChild(h('div', { class: 'dd-kv pp-kv--strong' }, h('span', { class: 'dd-kv__k', text: 'Total biaya' }), h('span', { class: 'dd-kv__v', text: rpRow(total) })));
    if (!(m.loan > 0)) { dropChart('total', r.cTotChart); return; }
    var data = { slices: [
      { key: 'dp', label: 'Uang muka (DP)', value: cost.dp, color: 'chart-1' },
      { key: 'principal', label: 'Pokok pinjaman', value: m.loan, color: 'chart-3' },
      { key: 'interest', label: 'Bunga', value: interest, color: 'chart-hl' },
      { key: 'fees', label: 'Biaya dan pajak', value: fees, color: 'chart-5' }
    ], centerLabel: 'Total biaya', centerValue: total };
    if (!plusChart('total', 'donut', r.cTotChart, data, { format: 'rp', valueLabel: 'Jumlah', categoryLabel: 'Bagian', label: 'Total biaya rumah', tableToggle: true, height: 260 })) clear(r.cTotChart);
  }

  /** Highest monthly instalment by tenor × floating rate, coloured against the instalment limit when one is known. */
  function renderCalcGrid(m) {
    var r = refs, x = r.xHm, g = m.grid, fm = F(), lim = m.limit;
    var tones = lim != null && heatTones();
    var nOk = 0, nAll = 0;
    var values = g.values.map(function (row) {
      return row.map(function (v) {
        var t = lim != null ? fitTone(v, lim) : null;
        nAll++; if (t === 'ok') nOk++;
        return { value: v, tone: t || 'none', note: t ? FIT_WORDS[t] + ' dari ' + rpLimit(lim) + ' per bulan' : null };
      });
    });
    var curRow = g.tenors.indexOf(m.T);
    x.title.textContent = !g.tenors.length ? 'Tidak ada tenor skema ini yang tersedia untuk pinjaman ini'
      : (lim != null ? fm.int(nOk) + ' dari ' + fm.int(nAll) + ' pasangan tenor dan bunga menjaga angsuran dalam ' + rpLimit(lim) + ' per bulan'
        : 'Angsuran berkisar ' + rpFull(Math.min.apply(null, [].concat.apply([], g.values))) + ' sampai ' + rpFull(Math.max.apply(null, [].concat.apply([], g.values))) + ' per bulan');
    x.sub.textContent = 'Angsuran bulanan tertinggi, Rp juta, menurut tenor (baris) dan bunga floating setelah masa fixed (kolom) · plafond ' + rp(m.loan) + ', ' + schemeShort(m.scheme)
      + (m.fixed ? ' · skema ini fixed sepanjang tenor, sehingga bunga floating tidak berpengaruh' : '') + ' · saat ini: ' + years(m.T) + ' pada ' + rateShort(g.curRate);
    clear(r.cHmLegend);
    if (lim != null) {
      [['ok', 'A'], ['mid', 'S'], ['bad', 'O']].forEach(function (p) {
        r.cHmLegend.appendChild(h('li', { class: 'pp-hmkey__li is-' + p[1].toLowerCase() }, h('span', { class: 'pp-dot' }), h('span', { text: FIT_WORDS[p[0]] })));
      });
    }
    r.cHmLegend.hidden = true;
    if (!g.tenors.length) { dropChart('grid', r.cHmChart); return; }
    var data = {
      rows: g.tenors.map(function (y, i) { return { key: 't' + y, label: years(y), sub: i === curRow ? 'saat ini' : null }; }),
      cols: g.rates.map(function (rt) { return { key: 'r' + rt, label: rateShort(rt) + (rt === g.curRate ? ' kini' : '') }; }),
      values: values,
      scale: tones ? 'status' : 'count'
    };
    var cfg = { format: mn, tipFormat: rpFull, valueLabel: 'Angsuran tertinggi', rowLabel: 'Tenor', label: 'Angsuran bulanan tertinggi menurut tenor dan bunga floating', tableToggle: true,
      unit: 'angsuran', legendTitle: tones ? 'Dibandingkan dengan batas angsuran Anda' : 'Angsuran bulanan tertinggi, dari rendah ke tinggi',
      legendItems: tones ? ['ok', 'mid', 'bad'].map(function (t) { return { tone: t, label: FIT_WORDS[t] }; }) : null };
    // With a limit, the status colours matter most: until the charts-plus heatmap takes per-cell tones, draw the coloured table
    var drawn = (tones || lim == null) && plusChart('grid', 'heatmap', r.cHmChart, data, cfg);
    if (!drawn) { dropChart('grid', r.cHmChart); r.cHmChart.appendChild(heatTable(m, values)); r.cHmLegend.hidden = lim == null; }
  }
  /** Without charts-plus.js: the same grid as a coloured table. */
  function heatTable(m, values) {
    var g = m.grid;
    return tbl(['Tenor'].concat(g.rates.map(function (rt) { return rateShort(rt) + (rt === g.curRate ? ' kini' : ''); })), g.tenors.map(function (y, i) {
      return h('tr', null, h('td', { text: years(y) }), values[i].map(function (q) { return h('td', { class: 'num pp-hm is-' + q.tone, title: q.note || null, text: mn(q.value) }); }));
    }), { caption: 'Angsuran bulanan tertinggi menurut tenor dan bunga floating', cls: 'pp-hmtbl' });
  }

  function renderCalcTables(m) {
    var r = refs, fm = F(), c = m.c, lim = m.limit;
    // Tenor comparison: grouped bars (first and later instalment), total interest line, the limit as the target
    var okT = m.tenors.filter(function (t) { return t.ok; });
    var xt = r.xTen;
    xt.title.textContent = okT.length > 1 ? 'Tenor ' + okT[okT.length - 1].y + ' tahun memberi angsuran terendah, tetapi bunganya ' + rp(okT[okT.length - 1].ti - okT[0].ti) + ' lebih besar daripada ' + okT[0].y + ' tahun'
      : 'Perbandingan tenor';
    xt.sub.textContent = 'Angsuran bulanan (batang, Rp) dan total bunga (garis, sumbu kanan) per tenor · skema dan plafond sama · klik baris untuk memilih';
    if (okT.length) {
      var hasAfter = okT.some(function (t) { return t.after != null; });
      var bars = [{ key: 'first', label: hasAfter ? 'Angsuran awal' : 'Angsuran', values: okT.map(function (t) { return t.first; }), color: 'chart-2' }];
      if (hasAfter) bars.push({ key: 'after', label: 'Setelah masa fixed', values: okT.map(function (t) { return t.after; }), color: 'chart-4' });
      var data = { categories: okT.map(function (t) { return { key: 't' + t.y, label: t.y + ' th' }; }), bars: bars,
        line: { key: 'ti', label: 'Total bunga', values: okT.map(function (t) { return t.ti; }), axis: 'right', format: 'rp', axisLabel: 'Bunga' },
        target: lim != null ? { value: lim, label: 'Batas angsuran Anda (' + rpLimit(lim) + ')', axis: 'left', tag: mn(lim) } : null };
      if (!plusChart('tenor', 'combo', r.cTenChart, data, { format: 'rp', barLabels: false, categoryLabel: 'Tenor', leftLabel: 'Angsuran per bulan', label: 'Perbandingan tenor', tableToggle: false, height: 260 })) clear(r.cTenChart);
    } else dropChart('tenor', r.cTenChart);
    clear(r.cTenTbl);
    var ten = m.tenors.map(function (t) {
      var cur = t.y === m.T, tone = lim != null && t.ok ? fitTone(t.max, lim) : null;
      var tr = h('tr', { class: (cur ? 'is-selected ' : '') + (t.ok ? 'pp-click' : 'pp-off'), title: t.ok ? 'Pilih ' + t.y + ' tahun' : t.why, tabIndex: t.ok ? 0 : -1 },
        h('td', { text: t.y + ' th' + (cur ? ' (saat ini)' : '') }), h('td', { class: 'num', text: rpFull(t.first) }), h('td', { class: 'num', text: t.after != null ? rpFull(t.after) : '—' }),
        h('td', { class: 'num', text: rpFull(t.ti) }), h('td', { class: 'num', text: rpFull(t.tp) }),
        m.income ? h('td', { class: 'num', text: fm.pct(dsrOf(t.max, m), 1) }) : null,
        h('td', { class: 'pp-why' }, t.ok ? (tone ? fitChip(tone) : 'Tersedia') : t.why));
      if (t.ok) {
        var pick = function () { setCalc({ tenorYears: t.y }); };
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      }
      return tr;
    });
    var heads = ['Tenor', 'Angsuran awal', 'Setelah fixed', 'Total bunga', 'Total pembayaran'].concat(m.income ? ['DSR tertinggi'] : []).concat([lim != null ? 'Dibanding batas' : 'Status']);
    r.cTenTbl.appendChild(tbl(heads, ten, { caption: 'Perbandingan tenor' }));
    // Stress test
    var xs = r.xStr;
    clear(xs.body);
    if (m.fixed) {
      xs.title.textContent = 'Bunga fixed sepanjang tenor, sehingga kenaikan bunga tidak mengubah angsuran';
      xs.sub.textContent = 'Uji kenaikan bunga floating · ' + schemeShort(m.scheme);
      xs.body.appendChild(h('p', { class: 't-empty', text: 'Tidak ada yang diuji: tidak ada masa floating dalam ' + years(m.T) + '.' }));
    } else {
      var base = m.stress[0], worst = m.stress[m.stress.length - 1];
      xs.title.textContent = 'Jika bunga floating naik 3 poin, angsuran naik ' + rpFull(worst.after - base.after) + ' per bulan';
      xs.sub.textContent = 'Angsuran bulanan tertinggi dan total bunga (Rp) · bunga floating naik 0 sampai 3 poin setelah masa fixed';
      xs.body.appendChild(tbl(['Floating', 'Angsuran tertinggi', 'Perubahan', 'Total bunga'].concat(m.income ? ['DSR tertinggi'] : []).concat(lim != null ? ['Dibanding batas'] : []), m.stress.map(function (s) {
        return h('tr', { class: s.b === c.stressBps ? 'is-selected' : null }, h('td', { text: ratePct(s.rate) + ' (+' + s.b / 100 + ')' }), h('td', { class: 'num', text: rpFull(s.after) }),
          h('td', { class: 'num', text: s.b ? '+' + rpFull(s.after - base.after) : '—' }), h('td', { class: 'num', text: rpFull(s.ti) }),
          m.income ? h('td', { class: 'num', text: fm.pct(dsrOf(s.after, m), 1) }) : null,
          lim != null ? h('td', { class: 'pp-why' }, fitChip(fitTone(s.after, lim))) : null);
      }), { caption: 'Uji kenaikan bunga' }));
    }
    // Schemes: active ones by the highest instalment, then the ended and reference ones greyed out
    var xc = r.xSch;
    clear(xc.body);
    // Suggest only schemes open to any buyer: Top Developer needs a partner project, a planned scheme is not in force
    var srcP = c.sourceProjectId && index().byId[c.sourceProjectId];
    var top = m.cmp.filter(function (q) {
      return !q.current && q.s.tier !== 'Planned' && (q.s.tier !== 'Top Developer' || (srcP && index().topDev[srcP.id]));
    })[0] || null;
    var curS = m.cmp.filter(function (q) { return q.current; })[0];
    xc.title.textContent = curS && top && top.max < curS.max ? schemeShort(top.s) + ' dapat menurunkan angsuran tertinggi sebesar ' + rpFull(curS.max - top.max) + ' per bulan'
      : 'Tidak ada skema umum lain yang menurunkan angsuran tertinggi untuk ' + years(m.T);
    xc.sub.textContent = 'Skema aktif untuk ' + years(m.T) + ', diurutkan menurut angsuran tertinggi (Rp per bulan) · skema saat ini di atas · klik baris untuk memilih';
    xc.body.appendChild(tbl(['Skema', 'Angsuran awal', 'Tertinggi', 'Total bunga'].concat(lim != null ? ['Plafond tertinggi untuk batas ini'] : []), m.cmp.map(function (q) {
      var tr = h('tr', { class: (q.current ? 'is-selected ' : '') + 'pp-click', tabIndex: 0, title: 'Pilih skema ini' },
        h('td', null, schemeShort(q.s), q.current ? h('span', { class: 'pp-tag tag', text: 'saat ini' }) : null, m.best && m.best.id === q.s.id ? h('span', { class: 'pp-tag tag tag--gold', text: 'terendah di kelasnya' }) : null),
        h('td', { class: 'num', text: rpFull(q.first) }), h('td', { class: 'num', text: rpFull(q.max) }), h('td', { class: 'num', text: rpFull(q.ti) }),
        lim != null ? h('td', { class: 'num', text: rpLimit(q.plaf) }) : null);
      var pick = function () { setCalc({ schemeId: q.s.id }); syncCalcInputs(); };
      tr.addEventListener('click', pick);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      return tr;
    }), { caption: 'Perbandingan skema' }));
    if (m.ended.length) {
      xc.body.appendChild(h('details', { class: 'pp-note pp-ended' }, h('summary', { class: 'pp-note__s' }, icon('info', 'icon--12'), h('span', { text: 'Skema yang telah berakhir dan hanya acuan (' + m.ended.length + '), tidak tersedia' })),
        h('ul', { class: 'pp-ended__list' }, m.ended.map(function (q) {
          return h('li', { class: 'pp-ended__li' }, h('span', { class: 'pp-ended__n', text: schemeName(q.s) }), h('span', { class: 'pp-ended__w', text: q.status.reason }));
        }))));
    }
    xc.body.appendChild(h('p', { class: 'pp-hint', text: 'Masa fixed yang panjang dapat memberi angsuran puncak lebih rendah daripada promo singkat. Hal ini berlaku walaupun bunganya lebih tinggi. ' + COPY.category }));
  }
  function renderCalcCosts(m) {
    var box = refs.cCostOut, cost = m.cost, c = m.c;
    clear(box);
    exhibitHead('Dana tunai yang dibutuhkan saat akad: ' + rpRow(cost.total), 'DP serta biaya dan pajak di muka, dalam rupiah penuh · wilayah BPHTB ' + c.region).forEach(function (x) { if (x) box.appendChild(x); });
    var rows = KM().costKeys.map(function (k) {
      var label = COST_LABEL[k];
      if (k === 'bphtb' && cost.bphtbReliefPct) label += ' (' + cost.bphtbReliefPct + '% keringanan, Kepgub DKI 840/2025 & 450/2026)';
      if (k === 'bphtb' && c.isFlpp) label += ' (pembebasan MBR, periksa per wilayah)';
      return h('tr', null, h('td', null, label, ' ', TAGS[k] ? h('span', { class: 'tag pp-tag pp-tag--src', title: costFormula(k, m), text: TAGS[k] }) : null,
        h('span', { class: 'pp-formula', text: costFormula(k, m) })), h('td', { class: 'num', text: rpRow(cost[k]) }));
    });
    var tb = tbl(['Komponen', 'Jumlah'], rows, { caption: 'Biaya di muka', cls: 'pp-costs' });
    tb.querySelector('table').appendChild(h('tfoot', null, h('tr', null, h('td', { text: 'Dana tunai yang dibutuhkan' }), h('td', { class: 'num', text: rpRow(KM().costKeys.reduce(function (a, k) { return a + Math.round(cost[k]); }, 0)) }))));
    box.appendChild(tb);
    if (!m.isSub) {
      box.appendChild(h('div', { class: 'pp-kvs pp-kvs--inline' },
        kvRow('Harga daftar', rpRow(m.list)), kvRow('Pengaruh PPN (' + { unknown: 'belum diketahui', included: 'termasuk', excluded: 'tidak termasuk' }[c.opts.ppnMode] + ')', (cost.ppn >= 0 ? '' : '−') + rpRow(Math.abs(cost.ppn))),
        kvRow('Harga efektif yang digunakan di atas', rpRow(m.price))));
      if (cost.ppnDtpInfo > 0) box.appendChild(h('p', { class: 'pp-hint pp-hint--i', text: 'Potensi hemat dari PPN ditanggung pemerintah (hanya informasi, tidak dikurangkan): ' + rpRow(cost.ppnDtpInfo) + '.' }));
      box.appendChild(hint('PPN termasuk dalam harga efektif, sehingga DP dan plafond telah menghitungnya.'));
    }
    box.appendChild(hint(COPY.fees + ' SUMBER = aturan atau halaman bank yang dipublikasikan · ESTIMASI = kisaran industri · ASUMSI = pilihan simulasi.'));
    box.appendChild(h('p', { class: 'exhibit__source', text: 'Sumber: kpr-config.js (halaman Bank Mandiri, PMK 90/2025 PPN DTP, Kepgub DKI 840/2025 & 450/2026, NPOPTKP daerah) · indikatif' }));
  }
  function renderCalcAssumptions(m) {
    var box = refs.cAss, kc = KC() || {}, fm = F();
    clear(box);
    var items = [
      'Cara hitung bunga: bunga bulanan nominal (bunga tahunan ÷ 12).\nDihitung ulang setiap kali bunga berubah. ' + COPY.flppExample,
      'Bunga floating setelah masa fixed: ' + ratePct(m.c.floatingPct) + ' (Mandiri mencantumkan floating 13% untuk take over, Kontan 23 Agu 2026 · SBDK KPR ' + ratePct((kc.sbdk || {}).kprKpaPct) + '; BI Rate ' + ratePct((kc.biRate || {}).pct) + ').',
      'Arti warna:\nHijau Terjangkau: angsuran tertinggi dalam batas.\nKuning Hampir: hingga 15% di atas batas.\nMerah Tidak terjangkau: lebih dari 15% di atas batas.',
      'Biaya provisi 1% (sumber sekunder).\nAdministrasi Rp500.000 dan appraisal Rp1.000.000 (perkiraan industri).\nNotaris 0,75% dari plafond dan PPAT 0,75% dari harga.\nAsuransi jiwa 1,5% premi tunggal. Asuransi kebakaran 0,05% per tahun atas 60% harga (asumsi).',
      'BPHTB 5% di atas NPOPTKP (DKI Rp250 juta, wilayah lain Rp80 juta) untuk pembelian pertama.\nKeringanan rumah pertama DKI 50% (atau 75% untuk hak baru) bagi pemegang KTP DKI.',
      'Batas angsuran: ' + fm.pct(dsrNow(), 0) + ' dari penghasilan bersih dikurangi angsuran lain (asumsi, Data & Privasi › Asumsi).',
      COPY.category
    ];
    box.appendChild(h('details', { class: 'pp-note pp-note--wide' }, h('summary', { class: 'pp-note__s' }, icon('info', 'icon--12'), h('span', { text: 'Asumsi dan sumber' })),
      h('div', { class: 'pp-note__b' }, items.map(function (t) { return h('p', { text: t }); }),
        h('p', { class: 'exhibit__source', text: 'Sumber: kpr-config.js (halaman Bank Mandiri, PMK 90/2025, PADG 30/2025, peraturan BPHTB daerah) · data per ' + dateLabel(kc.asOf) + ' · hanya di komputer ini' }))));
  }

  /* --------------------------------------------- print, CSV, copy, exports */

  var PRINT_ID = {
    head: 'BANK MANDIRI · KCP JAKARTA CILANGKAP', title: 'SIMULASI KPR (INDIKATIF)', inputs: 'Data simulasi', results: 'Hasil simulasi', costs: 'Rincian dana tunai di muka',
    totalCost: 'Total biaya rumah', tcDp: 'Uang muka', tcPrin: 'Pokok pinjaman', tcInt: 'Bunga', tcFees: 'Biaya dan pajak', tcTotal: 'Total biaya',
    limit: 'Angsuran tertinggi dibanding batas', fit: { ok: 'Dalam batas angsuran', mid: 'Hingga 15% di atas batas', bad: 'Lebih dari 15% di atas batas' },
    chart: 'Angsuran per tahun (pokok dan bunga)', tenor: 'Perbandingan tenor', stress: 'Uji kenaikan bunga floating', assume: 'Asumsi dan sumber',
    price: 'Harga rumah', dp: 'Uang muka', loan: 'Plafond', tenorL: 'Tenor', scheme: 'Skema', floating: 'Bunga floating', stressL: 'Uji kenaikan bunga', akad: 'Bulan akad', region: 'Wilayah BPHTB', income: 'Penghasilan bersih untuk cek DSR',
    inst: 'Angsuran tahun', ti: 'Total bunga', tp: 'Total pembayaran', cash: 'Dana tunai yang dibutuhkan', years: 'tahun', year: 'Tahun', principal: 'Pokok', interest: 'Bunga',
    first: 'Angsuran awal', after: 'Setelah masa fixed', change: 'Perubahan', total: 'Total', item: 'Komponen', amount: 'Jumlah',
    costs_: { dp: 'Uang muka', provisi: 'Provisi', admin: 'Administrasi', layanan: 'Biaya layanan', appraisal: 'Appraisal', notarisKpr: 'Notaris KPR', ppatAjb: 'PPAT/AJB', asuransiJiwa: 'Asuransi jiwa', asuransiKebakaran: 'Asuransi kebakaran', bphtb: 'BPHTB' },
    prepared: 'Disiapkan oleh: ____________________ (petugas)', customer: 'Nasabah: ____________________', printed: 'Dicetak',
    notes: ['Bunga floating setelah masa fixed mengikuti asumsi simulasi. Angka di sistem bank yang berlaku.', 'Biaya provisi, administrasi, appraisal, notaris, PPAT dan asuransi adalah perkiraan kisaran industri.', 'BPHTB dihitung 5% di atas NPOPTKP wilayah untuk pembelian pertama.']
  };
  function blocked() {
    if (veil()) { if (ctx) ctx.toast('Tidak tersedia saat nama disamarkan.'); return true; }
    return !!(MCD.demo && MCD.demo.blocks && MCD.demo.blocks());
  }
  function buildPrint() {
    var m = calcModel(), c = m.c, id = true, L = PRINT_ID;
    var nf = new Intl.NumberFormat(id ? 'id-ID' : 'en-GB', { maximumFractionDigits: 0 });
    var R0 = function (v) { return 'Rp ' + nf.format(Math.round(v)); };
    var RD = function (v) { return 'Rp ' + nf.format(KM().dispRp(v)); };
    var old = DOC.getElementById('prop-print');
    if (old) old.remove();
    var segs = m.sched.segments;
    var instRows = segs.map(function (s) {
      var a = Math.ceil(s.from / 12), b = Math.ceil(s.to / 12);
      return h('tr', null, h('td', { text: L.inst + ' ' + (a === b ? a : a + '–' + b) + ' (' + (id ? String(s.rate.toFixed(2)).replace('.', ',') : s.rate.toFixed(2)) + '%)' }), h('td', { class: 'num', text: RD(s.installment) }));
    });
    var tr = function (k, v) { return h('tr', null, h('td', { text: k }), h('td', { class: 'num', text: v })); };
    var schemeTxt = schemeName(m.scheme);
    var page1 = h('section', { class: 'pp-pr__page' },
      h('header', { class: 'pp-pr__head' }, h('p', { class: 'pp-pr__brand', text: L.head }), h('h1', { class: 'pp-pr__title', text: L.title }),
        h('p', { class: 'pp-pr__date', text: L.printed + ' ' + F().dateTime(new Date()) })),
      h('h2', { text: L.inputs }),
      h('table', { class: 'pp-pr__tbl' }, h('tbody', null,
        tr(L.price, R0(m.price)), tr(L.dp, R0(m.price - m.loan) + ' (' + (Math.round(m.dpPct * 10) / 10) + '%)'), tr(L.loan, R0(m.loan)),
        tr(L.tenorL, m.T + ' ' + L.years), tr(L.scheme, schemeTxt), tr(L.floating, m.fixed ? '—' : c.floatingPct.toFixed(2) + '%'),
        tr(L.stressL, '+' + c.stressBps / 100 + '%'), tr(L.akad, monthLabel(c.akadYm)), tr(L.region, c.region),
        m.income ? tr(L.income, R0(m.income)) : null)),
      h('h2', { text: L.results }),
      h('table', { class: 'pp-pr__tbl' }, h('tbody', null, instRows, tr(L.ti, RD(m.sched.totalInterest)), tr(L.tp, RD(m.sched.totalPaid)),
        m.limit != null && fitTone(m.sched.max, m.limit) ? tr(L.limit, L.fit[fitTone(m.sched.max, m.limit)] + ' (' + R0(m.limit) + ')') : null)),
      h('h2', { text: L.totalCost }),
      h('table', { class: 'pp-pr__tbl' }, h('tbody', null, tr(L.tcDp, R0(m.cost.dp)), tr(L.tcPrin, R0(m.loan)), tr(L.tcInt, R0(m.sched.totalInterest)),
        tr(L.tcFees, R0(Math.max(0, m.cost.total - m.cost.dp))),
        h('tr', { class: 'pp-pr__total' }, h('td', { text: L.tcTotal }), h('td', { class: 'num', text: R0(m.cost.dp + m.loan + m.sched.totalInterest + Math.max(0, m.cost.total - m.cost.dp)) })))),
      h('h2', { text: L.costs }),
      h('table', { class: 'pp-pr__tbl' }, h('tbody', null, KM().costKeys.map(function (k) { return tr(L.costs_[k], R0(m.cost[k])); }),
        h('tr', { class: 'pp-pr__total' }, h('td', { text: L.cash }), h('td', { class: 'num', text: R0(KM().costKeys.reduce(function (a, k) { return a + Math.round(m.cost[k]); }, 0)) })))));
    // page 2: yearly chart in print ink
    var yr = KM().yearly(m.sched), Wd = 640, Ht = 200, maxY = Math.max.apply(null, yr.map(function (y) { return y.paid; }).concat([1]));
    var bw = Wd / Math.max(1, yr.length);
    var svg = U().el.svg('svg', { class: 'pp-pr__chart', viewBox: '0 0 ' + Wd + ' ' + (Ht + 18), width: '100%', role: 'img', 'aria-label': L.chart });
    yr.forEach(function (y, k) {
      var hp = y.principal / maxY * Ht, hi = y.interest / maxY * Ht, x = k * bw + bw * 0.15, w = bw * 0.7;
      svg.appendChild(U().el.svg('rect', { class: 'pp-pr__p', x: x, y: Ht - hp, width: w, height: hp }));
      svg.appendChild(U().el.svg('rect', { class: 'pp-pr__i', x: x, y: Ht - hp - hi, width: w, height: hi }));
      if (y.year === 1 || y.year % 5 === 0) svg.appendChild(U().el.svg('text', { class: 'pp-pr__ax', x: x + w / 2, y: Ht + 14, 'text-anchor': 'middle' }, String(y.year)));
    });
    var page2 = h('section', { class: 'pp-pr__page pp-pr__page--2' },
      h('h2', { text: L.chart }), svg, h('p', { class: 'pp-pr__legend' }, h('span', { class: 'pp-pr__sw pp-pr__sw--p' }), ' ' + L.principal + '   ', h('span', { class: 'pp-pr__sw pp-pr__sw--i' }), ' ' + L.interest + ' · ' + L.year),
      h('h2', { text: L.tenor }),
      h('table', { class: 'pp-pr__tbl' }, h('thead', null, h('tr', null, h('th', { text: L.tenorL }), h('th', { class: 'num', text: L.first }), h('th', { class: 'num', text: L.after }), h('th', { class: 'num', text: L.ti }), h('th', { class: 'num', text: L.tp }))),
        h('tbody', null, m.tenors.filter(function (t) { return t.ok; }).map(function (t) { return h('tr', null, h('td', { text: t.y + ' ' + L.years }), h('td', { class: 'num', text: RD(t.first) }), h('td', { class: 'num', text: t.after != null ? RD(t.after) : '—' }), h('td', { class: 'num', text: RD(t.ti) }), h('td', { class: 'num', text: RD(t.tp) })); }))),
      m.fixed ? null : h('h2', { text: L.stress }),
      m.fixed ? null : h('table', { class: 'pp-pr__tbl' }, h('thead', null, h('tr', null, h('th', { text: L.floating }), h('th', { class: 'num', text: L.after }), h('th', { class: 'num', text: L.ti }))),
        h('tbody', null, m.stress.map(function (s) { return h('tr', null, h('td', { text: s.rate.toFixed(2) + '% (+' + s.b / 100 + ')' }), h('td', { class: 'num', text: RD(s.after) }), h('td', { class: 'num', text: RD(s.ti) })); }))),
      h('h2', { text: L.assume }), h('ul', { class: 'pp-pr__notes' }, L.notes.map(function (t) { return h('li', { text: t }); })),
      h('div', { class: 'pp-pr__disc', text: id ? (KC() || {}).disclaimer : DISCLAIMER_EN }),
      h('div', { class: 'pp-pr__sign' }, h('p', { text: L.prepared }), h('p', { text: L.customer })));
    var node = h('div', { id: 'prop-print', class: 'pp-print', lang: id ? 'id' : 'en', 'aria-hidden': 'true' }, page1, page2);
    DOC.body.appendChild(node);
    return node;
  }
  function printSim() {
    if (!S().calc.open || blocked()) return;
    buildPrint();
    DOC.body.classList.add('pp-printing');
    W.print();
  }
  function onBeforePrint() {
    if (!ctx || !S().calc.open || veil() || (MCD.demo && MCD.demo.isOn())) return;
    if (!DOC.getElementById('prop-print')) buildPrint();
    DOC.body.classList.add('pp-printing');
  }
  function onAfterPrint() {
    DOC.body.classList.remove('pp-printing');
    var n = DOC.getElementById('prop-print');
    if (n) n.remove();
  }
  function download(name, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    var url = W.URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name, hidden: true });
    DOC.body.appendChild(a);
    a.click();
    setTimeout(function () { W.URL.revokeObjectURL(url); a.remove(); }, 0);
  }
  function exportSchedule() {
    if (blocked()) return;
    var m = calcModel(), csv = U().csv, mo = m.sched.months, lines = [];
    lines.push('# ' + flat(DISCLAIMER_EN));
    lines.push(csv.row(['month', 'period', 'rate_pct', 'instalment', 'principal', 'interest', 'outstanding']));
    var a = nextMonthOf(m.c.akadYm).split('-').map(Number);
    for (var k = 0; k < m.n; k++) {
      var mm = a[1] - 1 + k, y = a[0] + Math.floor(mm / 12), seg0 = m.sched.segments.filter(function (s) { return k + 1 >= s.from && k + 1 <= s.to; })[0];
      lines.push(csv.row([k + 1, y + '-' + String(mm % 12 + 1).padStart(2, '0'), seg0 ? seg0.rate.toFixed(2) : '', Math.round(mo.inst[k]), Math.round(mo.prin[k]), Math.round(mo.int[k]), Math.round(mo.bal[k])]));
    }
    download('kpr-simulation_' + asOf() + '.csv', lines.join('\r\n'));
  }
  function copySummary() {
    if (blocked()) return;
    var m = calcModel(), segs = m.sched.segments;
    var text = [
      'Simulasi KPR · ' + schemeName(m.scheme),
      'Harga ' + rpRow(m.price) + ' · DP ' + F().num(m.dpPct, 1) + '% · plafond ' + rpRow(m.loan) + ' · ' + years(m.T),
      'Angsuran: ' + segs.map(function (s) { return segLabel(s) + ' ' + rpFull(s.installment); }).join(' · '),
      'Total bunga ' + rpFull(m.sched.totalInterest) + ' · total pembayaran ' + rpFull(m.sched.totalPaid),
      'Dana tunai yang dibutuhkan ' + rpRow(m.cost.total) + ' (DP dan biaya di muka, wilayah ' + m.c.region + ')',
      DISCLAIMER_EN
    ].join('\n');
    if (!W.navigator.clipboard) { ctx.toast('Fitur salin tidak tersedia di browser ini.', 'warn'); return; }
    W.navigator.clipboard.writeText(text).then(function () {
      refs.cCopy.lastChild.textContent = 'Tersalin';
      setTimeout(function () { if (refs.cCopy) refs.cCopy.lastChild.textContent = 'Salin ringkasan'; }, 1200);
    }, function () { ctx.toast('Ringkasan tidak dapat disalin. Coba lagi.', 'warn'); });
  }
  function exportProjects() {
    if (blocked() || !R) return;
    var csv = U().csv, lines = ['# Proyek pasar primer (sumber publik) · Bank Mandiri KCP Jakarta Cilangkap · dibuat ' + F().dateTime(new Date())];
    lines.push(csv.row(['id', 'nama', 'grup_developer', 'kota', 'kecamatan', 'jarak_km', 'jarak_kcp_km', 'waktu_kcp_menit', 'jarak_kcp_ketepatan', 'segmen', 'tipe', 'harga_min', 'harga_maks', 'skema', 'tenor_th', 'dp_pct', 'angsuran_awal', 'angsuran_tertinggi', 'kelas', 'url_sumber', 'harga_per', 'keyakinan']));
    sortRows(R.filtered).forEach(function (x) {
      var p = x.p, r = x.r, d = distOf(p);
      lines.push(csv.row([p.id, p.name, p.developerGroup, p.kota, p.kecamatan, p.distanceKm, d && isNum(d.km) ? d.km : '', d && isNum(d.min) ? Math.round(d.min) : '', d ? d.precision || '' : '',
        p.segment, p.type, p.priceMin, p.priceMax, r.scheme ? r.scheme.id : '', r.T || '', r.dp != null ? r.dp : '',
        r.first ? Math.round(r.first) : '', r.max ? Math.round(r.max) : '', CLS[x.cls].label, p.sourceUrl || '', p.priceAsOf || '', p.confidence]));
    });
    download('property-projects_' + asOf() + '.csv', lines.join('\r\n'));
  }

  /* ============================================================ the section */

  function renderAll(d) {
    var main = d.inputs || d.filters || d.map || d.ui || d.all;
    if (main) {
      if (view === 'overview') renderOverview();
      else { renderRail(); renderRightRail(); renderKpis(); }
    }
    var calcOn = S().calc.open && refs.calc && !refs.calc.hidden;
    if (calcOn && d.inputs && S().calc.fromSim && seedFromSim()) syncCalcInputs();     // keep following the simulator until a price is typed
    if (calcOn && (d.calc || d.inputs || d.ui || d.all)) renderCalc();
    if (lastSel && drawerOpen() && (d.inputs || d.filters || d.ui)) openDetail(lastSel, true);
  }

  function pageSpec(deep) {
    return {
      lede: deep ? 'Keterjangkauan untuk penghasilan TNI, 150 proyek baru dalam 30 km, harga area dan kalkulator KPR.'
        : 'Isi tiga angka untuk melihat harga rumah yang terjangkau dan proyek yang sesuai.',
      shows: ['Harga rumah tertinggi untuk suatu penghasilan bersih, beserta angsurannya', '150 proyek perumahan baru dalam 30 km, diberi warna menurut keterjangkauan',
        'Harga area untuk tanah dan rumah seken', 'Kalkulator KPR: angsuran per tahun, total biaya dan perbandingan tenor.\nJuga uji kenaikan bunga dan biaya di muka (BPHTB, PPN ditanggung pemerintah), siap dicetak.'],
      needs: [],
      dataKeys: [],
      emptyFirst: false,
      source: 'Sumber: SiKumbang, situs developer, tabel suku bunga Bank Mandiri · ' + dateLabel((KC() || {}).asOf || '2026-10-12') + ' · data publik',
      cards: function () { return []; },
      // Overview: one primary button into the full simulator and calculator
      primary: deep ? null : { label: 'Buka simulator KPR lengkap', run: function () { if (ctx) ctx.setView('deep'); } },
      render: function (body) { if (deep) buildRail(body); else buildOverview(body); }
    };
  }

  function controlsSpec() {
    function item(label, title, key, val) {
      return { label: label, title: title, run: function () { var p = {}; p[key] = val; setMapOpt(p); }, pressed: function () { return S().map[key] === val; } };
    }
    function tog(label, key) {
      return { kind: 'toggle', label: label, get checked() { return !!S().map[key]; }, run: function () { var p = {}; p[key] = !S().map[key]; setMapOpt(p); } };
    }
    void item;
    return {
      extra: view === 'overview' ? [{ label: '', overview: true, items: [{ label: 'Tampilkan 30 km', title: 'Tampilkan lingkar 30 km di sekitar Mabes TNI', run: function () { if (MCD.map) MCD.map.preset('ring30'); }, pressed: function () { return false; } }] }] : [],
      layers: [{ kind: 'sep' }, { kind: 'title', label: 'KPR' }, tog('Lingkaran harga area (selalu)', 'areas'), tog('Nama proyek', 'labels'), tog('Lokasi TNI', 'tni')],
      presets: ['ring30']
    };
  }

  function commands() {
    var out = [{ label: 'Kalkulator KPR', key: 'K', kw: 'kpr calculator simulation instalment angsuran', run: function () { openCalc({}); } }];
    ((KC() || {}).personas || []).forEach(function (p) {
      out.push({ label: 'Contoh profil: ' + (PERSONA_SHORT[p.id] || p.id), kw: 'persona contoh profil ' + p.label, run: function () { applyPersona(p.id); } });
    });
    out.push({ label: 'KPR: tampilkan proyek terjangkau saja', kw: 'affordable filter terjangkau', run: function () { setFilter({ classes: ['A'] }); } });
    out.push({ label: 'KPR: hapus filter daftar', kw: 'reset filters hapus filter', run: clearFilters });
    return out;
  }

  function mountError(root) {
    var retry = h('button', { type: 'button', class: 'btn btn--primary btn--lg' }, icon('reset'), h('span', { text: 'Coba lagi' }));
    root.appendChild(h('section', { class: 'guide panel pp-err', role: 'alert' }, h('div', { class: 'guide__scroll' },
      h('p', { class: 't-empty', text: 'File data KPR (proyek, harga area, tabel suku bunga) tidak dapat dimuat.' }),
      h('p', { class: 'pp-hint pp-hint--mono', text: 'Muat ulang halaman. Jika masih gagal, hubungi pengelola dashboard.' }), retry)));
    retry.addEventListener('click', function () {
      var need = [[!W.MCD_KPR_CONFIG, 'data/kpr-config.js'], [!W.MCD_PROPERTY_PROJECTS, 'data/property-projects.js'], [!W.MCD_PROPERTY_MARKET, 'data/property-market.js']]
        .filter(function (x) { return x[0]; }).map(function (x) { return x[1]; });
      var c = ctx;
      need.reduce(function (p, src) {
        return p.then(function () {
          return new Promise(function (res) { var s = DOC.createElement('script'); s.src = src; s.onload = res; s.onerror = res; DOC.head.appendChild(s); });
        });
      }, Promise.resolve()).then(function () {
        if (!dataOK() || !c) { if (c) c.toast('File data KPR tidak dapat dimuat. Muat ulang halaman.', 'warn'); return; }
        clear(root);
        MCD.sections[ID].mount(root, c);
        if (MCD.app && MCD.app.relayout) MCD.app.relayout();
        requestMap();
      });
    });
  }

  /* ------------------------------------------ map zones (item 30) and focus (v3) */

  /* KPR keeps its own 30 km circle with the veil beyond it; the other sections use the kecamatan zones. */
  var ZONES_KPR = { mode: 'radius', km: 30 }, ZONES_DEFAULT = { mode: 'kecamatan15' };
  function setZones(z) { if (MCD.map && typeof MCD.map.setZones === 'function') safe(function () { MCD.map.setZones(z); }); }
  function onDistEvent() { onDistanceChange(); }
  /**
   * onAction('focus:project:<id>') (MCD.app.focus, v3): the map flies to the project at street level and its
   * detail opens. A list filter that hides the project is cleared first. → true when the project exists.
   */
  function focusProject(id) {
    if (!ctx || !dataOK()) return false;
    var p = index().byId[id];
    if (!p) { ctx.toast('Proyek ini tidak ditemukan di data KPR.', 'warn'); return false; }
    compute();
    if (R && !R.filtered.some(function (x) { return x.p.id === id; })) clearFilters();
    if (MCD.map && typeof MCD.map.focusPoint === 'function') {
      safe(function () { MCD.map.focusPoint({ lon: p.lon, lat: p.lat, zoom: 16, kind: 'project', id: id }); });
      flewTo = true;
    } else flyTo(p.lon, p.lat, 16);
    selectProject(id);
    return true;
  }

  /* ============================================== v5 workspace contract (§7.4) */

  /** "1,2 M" / "457 jt" for the slim rail (76 px); the full rupiah amount is in the title. */
  function rpSlim(v) {
    if (!isNum(v)) return '—';
    return v >= 1e9 ? F().num(v / 1e9, v >= 1e10 ? 0 : 1) + ' M' : F().num(v / 1e6, 0) + ' jt';
  }
  /**
   * summary() → {items, filters}: the slim rail of KPR (the KPI strip gives way to it): Plafond maksimal, Proyek
   * terjangkau and the tenor of the simulator.
   */
  function summary() {
    if (!dataOK()) return { items: [], filters: 0 };
    compute();
    if (!R) return { items: [], filters: 0 };
    var pan = R.pan, fm = F(), ok = pan.state === 'ok', f = S().filters, items = [];
    items.push({ value: ok ? rpSlim(pan.maxPlafond) : '—', label: 'Plafond maksimal', title: ok ? 'Plafond tertinggi ' + rpLimit(pan.maxPlafond) + ' · ' + yrs(pan.T) + ' · DSR ' + fm.pct(R.inp.dsr, 0) : stateText(pan.state) });
    items.push(potentialOnly() ? { value: '—', label: 'Proyek terjangkau', title: 'Isi penghasilan bersih untuk memeriksa' }
      : { value: fm.int(R.counts.A), label: 'Proyek terjangkau', tone: 'ok', title: fm.int(R.counts.A) + ' dari ' + fm.int(R.filtered.length) + ' proyek yang tampil terjangkau' });
    var cap = pan.cap && pan.cap.years ? pan.cap.years : null;
    items.push({ value: pan.T ? yrs(pan.T) : '—', label: 'Tenor', title: pan.T ? 'Tenor ' + years(pan.T) + (cap ? ' · paling lama ' + years(cap) : '') : stateText(pan.state) });
    var w = withinNow();
    var scope = { label: 'Cakupan', value: w > 0 ? w : 30, options: SCOPES.map(function (v) { return { v: v, label: v + ' km' }; }),
      title: 'Proyek perumahan dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.', set: function (v) { setWithin(+v); } };
    /* the switch's own values (5, 15, 30 km) are not filters; other band choices count once each */
    var bandsN = SCOPES.indexOf(w) >= 0 ? 0 : f.bands.length;
    return { items: items, filters: activeFilterCount() + bandsN + (f.q ? 1 : 0) + (f.area ? 1 : 0), scope: scope };
  }
  /**
   * workspace() → {rail, drawer, hide} for MCD.windows.adopt (Detail ≥ 1024 px): the simulator is the summary rail,
   * "Proyek dan area" the bottom drawer with the tabs Proyek | Area. Its header (tabs move to the drawer bar, Tutup
   * goes), the rail's "Buka daftar & grafik" and the KPI strip (its numbers are in summary()) give way.
   */
  function workspace() {
    if (!ctx || view !== 'deep' || !page || !page.el || !refs.rr) return null;
    setTimeout(syncAdopted, 0);
    return {
      rail: { el: page.el, label: 'KPR', icon: 'sec-property', summary: summary },
      drawer: { el: refs.rr, tabs: refs.rrTabList, title: 'Proyek dan area', source: 'Sumber: ' + SRC_PROJECTS + ' · harga area: Rumah123, Cushman & Wakefield, Bank Indonesia' },
      hide: [refs.rrHead, refs.rrOpen, refs.kpiStrip].filter(Boolean)
    };
  }
  /** cardFor(sel) → the project or area card now (live pins after an input, filter, distance or privacy change). */
  function cardFor(sel) {
    if (!sel || (sel.kind !== 'project' && sel.kind !== 'area') || !dataOK()) return null;
    compute();
    if (!R) return null;
    return sel.kind === 'project' ? projectModel(sel.id) : areaModel(sel.id);
  }

  function cycle(list, cur) { return list[(list.indexOf(cur) + 1) % list.length]; }
  /** Every chart handle of the mounted view except the KPI tiles (kept in charts.kpi). */
  function eachChart(fn) {
    Object.keys(charts).forEach(function (k) { var ch = charts[k]; if (k !== 'kpi' && ch && typeof ch === 'object') safe(function () { fn(ch); }); });
  }

  MCD.sections = MCD.sections || {};
  MCD.sections[ID] = {
    mount: function (root, c) {
      ctx = c; host = root; view = c.view(); refs = {}; charts = {}; schemeOptKey = ''; distCache = {};
      if (!dataOK()) { mountError(root); return; }
      compute();
      setZones(ZONES_KPR);
      W.addEventListener('mcd:distance', onDistEvent);
      page = c.page(pageSpec(view === 'deep'));
      if (view === 'deep') { buildPinned(); buildRightRail(); buildKpis(); buildCalc(); }
      c.mapControls(controlsSpec());
      c.registerCommands(commands);
      syncControls();
      renderAll({ all: 1 });
      if (view === 'deep' && S().calc.open) showCalc(false);
      W.addEventListener('beforeprint', onBeforePrint);
      W.addEventListener('afterprint', onAfterPrint);
      requestMap();
    },
    update: function (d, keys) {
      if (!page || !ctx) return;
      page.update(d, keys);
      var k = keys || [], all = k.indexOf('*') >= 0;
      if (all || k.indexOf('settings') >= 0) distCache = {};             // the peak factor is an assumption in Data & Privasi
      if (all || k.indexOf('data') >= 0 || k.indexOf('demo') >= 0 || k.indexOf('settings') >= 0) changed('ui');
      if (k.indexOf('privacy.veil') >= 0 || k.indexOf('privacy.reveal') >= 0) { syncControls(); syncCalcInputs(); changed('ui'); changed('calc'); }
      if (k.indexOf('theme') >= 0) {
        renderKpis();
        eachChart(function (ch) { if (ch.update) ch.update(); });
        // The status colours differ per theme: rebuild the legend swatches (the satellite palette alone does not change)
        if (MCD.map && MCD.map.registerLegend) safe(function () { MCD.map.registerLegend(ID, legendFn); });
        requestMap();
      }
      if (k.indexOf('selection') >= 0) {
        var s = ctx.state.get().selection;
        if (!s || (s.kind !== 'project' && s.kind !== 'area')) {
          if (lastSel) {
            lastSel = null;
            requestMap();
            if (view === 'deep') renderRightRail();
            if (flewTo && !s) { flewTo = false; if (MCD.map) safe(function () { MCD.map.preset('ring30'); }); }
          }
        }
      }
    },
    unmount: function () {
      Object.keys(charts.kpi || {}).forEach(function (k) { var t = charts.kpi[k]; if (t && t.destroy) safe(function () { t.destroy(); }); });
      eachChart(function (ch) { if (ch.destroy) ch.destroy(); });
      charts = {};
      if (drawerObs) { drawerObs.disconnect(); drawerObs = null; }
      dropAreaFocus();
      if (lastSel && ctx) safe(function () { ctx.closeDrawer(); });
      lastSel = null; flewTo = false; hoverCls = null; hoverId = null;
      DOC.body.classList.remove('pp-calc-open', 'pp-printing');
      W.removeEventListener('beforeprint', onBeforePrint);
      W.removeEventListener('afterprint', onAfterPrint);
      W.removeEventListener('mcd:distance', onDistEvent);
      if (S().calc.open && refs.calc && !refs.calc.hidden) suspendWs(false);     /* the calculator leaves with the section */
      setZones(ZONES_DEFAULT);
      var pn = DOC.getElementById('prop-print');
      if (pn) pn.remove();
      clearTimeout(announceT);
      if (flushRaf && W.cancelAnimationFrame) W.cancelAnimationFrame(flushRaf);
      clearTimeout(flushTimer);
      flushRaf = 0; flushTimer = 0; dirty = {};
      timers.forEach(clearTimeout); timers = [];
      page = null; host = null; refs = {}; ctx = null;
    },
    layout: function () {
      syncAdopted();
      /* v5: adopted, the shell's MCD.windows.padding measures the rail and the bottom drawer itself */
      return { posture: ID, padding: page && !adopted() ? page.padding() : undefined };
    },
    /* Esc closes the "Buka daftar & grafik" slide-over below 1280 px, like Sekolah; the shell returns focus to its opener (A-05). */
    onEscape: function () {
      var rr = refs.rr;
      if (rr && !adopted() && rr.classList.contains('is-open') && window.matchMedia && !window.matchMedia('(min-width: 1280px)').matches) { rr.classList.remove('is-open'); return true; }
      return false;
    },
    onAction: function (action) {
      var calcOpen = S().calc.open && refs.calc && !refs.calc.hidden;
      switch (action) {
        case 'property:income': {
          var f = refs.pay ? refs.pay.input : (refs.income && refs.income.input);
          if (f) { f.focus(); f.select(); }
          return true;
        }
        case 'property:calculator': openCalc({}); return true;
        case 'property:tenor-': case 'property:tenor+': {
          var dlt = action === 'property:tenor+' ? 1 : -1;
          if (calcOpen) { var m = calcModel(); setCalc({ tenorYears: clamp(m.T + dlt, 1, m.cap) }); }
          else stepTenor(dlt);
          return true;
        }
        case 'property:stress': {
          if (calcOpen) { setCalc({ stressBps: cycle([0, 100, 200, 300], S().calc.stressBps) }); syncCalcInputs(); ctx.toast('Uji kenaikan bunga +' + S().calc.stressBps / 100 + '%'); }
          else { setInput({ stressBps: cycle([0, 100, 200, 300], inputs().stressBps) }); ctx.toast('Uji kenaikan bunga +' + inputs().stressBps / 100 + '%'); }
          return true;
        }
        case 'property:color': {
          setMapOpt({ colorBy: cycle(['class', 'segment', 'price'], S().map.colorBy) });
          ctx.toast('Warna · ' + { class: 'Kelas', segment: 'Segmen', price: 'Harga' }[S().map.colorBy]);
          return true;
        }
        case 'property:print':
          if (calcOpen) printSim(); else ctx.toast('Buka kalkulator KPR lebih dulu (tombol K).');
          return true;
        default: {
          var fm = /^focus:project:(.+)$/.exec(String(action || ''));
          if (!fm) return false;
          if (calcOpen) closeCalc();
          focusProject(fm[1]);
          return true;
        }
      }
    },
    /* v5 workspace contract (docs/LAYOUT_V5C_SPEC.md §7.4): feature-detected by the shell */
    workspace: workspace,
    summary: summary,
    cardFor: cardFor,
    onSelect: function (sel) {
      if (!sel || (sel.kind !== 'project' && sel.kind !== 'area') || !R) return false;
      lastSel = { kind: sel.kind, id: sel.id };
      openPending = true;
      requestMap();
      timers.push(setTimeout(function () { openPending = false; if (ctx && lastSel) openDetail(lastSel); }, 0));
      if (view === 'deep' && refs.list) {
        renderRightRail();
        var row = refs.list.querySelector('[data-id="' + String(sel.id).replace(/"/g, '') + '"]');
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
      }
      return true;
    },
    /** Readout sentence (Deep dive) for the shell's readout hook. */
    readout: function () {
      if (!R) return null;
      var fm = F(), c = S().calc;
      if (c.open && view === 'deep' && refs.calc && !refs.calc.hidden) {
        var m = calcModel();
        return { text: '› KPR › Kalkulator · ' + rp(m.price) + ' · DP ' + fm.num(m.dpPct, 0) + '% · ' + m.T + ' th · ' + schemeShort(m.scheme) + ' · angsuran ' + m.sched.segments.map(function (s) { return rpFull(s.installment); }).join(' → ') };
      }
      var w = withinNow(), parts = ['KPR', personaLabel(), 'DSR ' + fm.pct(R.inp.dsr, 0), 'harga tertinggi ' + (R.pan.state === 'ok' ? rp(R.pan.maxPrice) : '—')];
      if (w > 0) parts.push('≤ ' + w + ' km');
      if (S().filters.classes.length) parts.push(S().filters.classes.map(function (k) { return CLS[k].label; }).join(' + '));
      return { text: '› ' + parts.join(' · ') + ' — ' + fm.int(R.counts.A) + ' dari ' + fm.int(R.filtered.length) + ' proyek terjangkau', n: R.counts.A, N: R.filtered.length, unit: 'proyek terjangkau' };
    }
  };

  /* ============================================================ search (C-12) */

  /** Housing projects for the shell search ("Cari"): name, developer, kecamatan or kota; opens the project in KPR › Detail. */
  function searchProjects(q) {
    var key = norm(q).trim();
    if (key.length < 3 || !W.MCD_PROPERTY_PROJECTS) return [];
    var I = safe(index);
    if (!I) return [];
    var out = [];
    for (var k = 0; k < I.rows.length && out.length < 6; k++) {
      var p = I.rows[k];
      if ((I.hay[p.id] || '').indexOf(key) < 0) continue;
      out.push({ group: 'Proyek perumahan', label: p.name,
        sub: 'Proyek perumahan · ' + [p.kecamatan, p.kota].filter(Boolean).join(', ') + (isNum(p.distanceKm) ? ' · ' + distLine(p) : ''),
        run: openFromSearch(p.id) });
    }
    return out;
  }
  function openFromSearch(id) {
    return function () {
      if (ctx && view === 'deep') { selectProject(id, { fly: true }); return; }
      /* the shell's focus contract (v3): navigate to KPR, then onAction('focus:project:<id>') */
      if (MCD.app && typeof MCD.app.focus === 'function') { MCD.app.focus({ section: ID, kind: 'project', id: id }); return; }
      if (!(MCD.app && typeof MCD.app.navigate === 'function')) return;
      MCD.app.navigate('property', { view: 'deep' });
      /* the first visit can mount twice (default view, then Detail): select once the page has been ready for two
         polls, and select again if a remount dropped the selection */
      var tries = 0, stable = 0, picks = 0;
      (function wait() {
        stable = ctx && R && view === 'deep' ? stable + 1 : 0;
        if (stable >= 2) {
          selectProject(id, { fly: true });
          if (++picks < 3) setTimeout(function () {
            var s = MCD.state && typeof MCD.state.get === 'function' ? MCD.state.get().selection : null;
            if (!(s && s.kind === 'project' && s.id === id)) { stable = 0; tries = 0; wait(); }
          }, 800);
          return;
        }
        if (++tries < 60) setTimeout(wait, 150);
      })();
    };
  }
  PS.search = searchProjects;
  PS.parseRp = parseRp;           // read-only helper for the tests
  /* registered at load time, so "Cari" finds projects from every section (config.js creates the object first) */
  if (MCD.searchProviders && typeof MCD.searchProviders === 'object') MCD.searchProviders.proyek = searchProjects;
  else if (MCD.app && typeof MCD.app.registerSearch === 'function') MCD.app.registerSearch('proyek', searchProjects);

  // Exposed for checks in the browser console (read-only helpers; no state is written).
  PS.model = function () { return compute(); };
  PS.tags = { TOP_DEV: TOP_DEV.slice(), BANDS: BANDS.map(function (b) { return b.id; }) };
  /* v4 helpers for tests/sections-v4.test.mjs (read-only; no state is written) */
  PS.routeUrl = routeUrl;
  PS.areaKecId = function (id) { return areaKecId(id); };
  PS.BAND_LABEL = BAND_LABEL;
  PS.classBar = classBar;         // the class bar factory (its transform-only glide is checked in the tests)
  /* v5 helpers for tests/sections-v5.test.mjs (read-only, except showAreaProjects, which sets the project search) */
  PS.v5 = { areaRadius: areaRadius, areaStep5: function (a) { return areaStep5(a); }, areaCut: function (k) { return areaCut(k); },
    projectModel: function (id) { compute(); return R ? projectModel(id) : null; }, areaModel: function (id) { compute(); return areaModel(id); },
    summary: function () { return summary(); }, showAreaProjects: function (id) { return showAreaProjects(id); }, rpSlim: rpSlim };
})(window.MCD = window.MCD || {});
