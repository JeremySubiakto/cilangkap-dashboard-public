/* ==========================================================================
 * MCD.tni: the data adapters of "Kredit TNI" (v7, docs/V7_SPEC.md §1.7.4, §3, §4, §10; COPY_STYLE_EN items 48 a, 49).
 *
 * Classic IIFE on window.MCD (also loads in a Node vm sandbox for tests/tni-v7.test.mjs). No DOM except the one
 * 'mcd:gate-locking' listener that clears the calculator memory; no storage, no network, no console output.
 *
 *   sites({km})              the selectable pangkalan TNI: every MCD.ref site whose pangkalanOf() is markas, perumahan
 *                            or rumah sakit (D6); rows {id, label, matra, matraName, jenis, jenisLabel, lon, lat, km,
 *                            approx, finance: [satker abbr], kecamatanId}. km = straight line from the Mabes TNI centre.
 *                            Gates and the "lain" TNI sites stay context only (never returned).
 *   site(id) · isSelectable(id) · counts({km}) · eyebrow(row) · MATRA · JENIS
 *   satkerOf(siteId)         [{id, abbr, name, matra, finance}] ONLY (§3.10): the synthetic satker fields (bpg,
 *                            shareTarget, tukin, w) and the demo coordinates never leave this file. A satker whose id is
 *                            a site id belongs to that site, else its parent: Mabesal → mabesal, Mabes TNI → plaza-mabes,
 *                            Mabesau → mabesau. satkerSearch(q) → [{abbr, name, siteId, siteLabel}] for Cari.
 *   dealers() → Promise      the dealer file through MCD.app.lazy('vehicle-dealers') on first use (D10, D25); rows
 *                            {id, …row}; dealerState(), dealerRows(), dealer(id), dealerId(row, k), adaptDealers(rows),
 *                            nearestDealers(site, {n: 5, maxKm: 3, kinds, includeServis}) → [{row, km}], dealerCsv().
 *   loadPay() → Promise      data/tni-pay.js through MCD.app.lazy('tni-pay') on the first calculator open; payState(),
 *                            payTable(), pangkatOptions(matra) → [{kode, label, group, groupLabel}], rankInfo(kode).
 *   kpiModel() · concentration() → {ksmShare, nplRetail, nplArea, period, periodLabel, limitPct, over} | null (D22) ·
 *   concentrationText(c, {mode: 'full' | 'short' | 'npl'}) · limitText(c) · bookingKsm()
 *   pipeline                 MCD.seal.pipeline('tni.pipeline', {keyRe, products, stages, programs, check}) (⟲ v6), a
 *                            memory list without MCD.seal; the check refuses a note with personal numbers (§3.4 fold 6).
 *   noteCheck(text) → {ok, hits} · NOTE_REFUSED · NOTE_PH · exportPipeline() (notes that fail the check left out)
 *   PRODUCTS · stages() · programs({live}) · validKey(k) · siteKey(id) · dealerKey(id)
 *   calc                     the calculator's memory (§4.6): get(), set(patch), input(k, v), clearInputs(), drop(),
 *                            hold(ms) / held() for the "Buka Kebijakan & leads" round trip (§4.5). Never stored.
 *   on(fn) → off             fn({what: 'dealers' | 'pay' | 'calc'})
 *
 * Data guards (§3.10, D7, D31): no file of this lane reads MCD.ref.competitors or site.bank, no card names a payroll
 * bank, and nothing here compares a lead field with a site, a satker or a kecamatan.
 * ========================================================================== */
(function (root) {
  'use strict';
  var MCD = root.MCD = root.MCD || {};
  var T = MCD.tni && MCD.tni.VERSION ? MCD.tni : (MCD.tni = {});
  if (T.VERSION) return;
  T.VERSION = 1;

  /* ------------------------------------------------------------ constants */

  var SATKER_PARENT_SITE = { 'Mabesal': 'mabesal', 'Mabes TNI': 'plaza-mabes', 'Mabesau': 'mabesau' };
  var FINANCE_RE = /\bkeuangan\b/i;
  var MATRA = [{ id: 'AL', label: 'TNI AL' }, { id: 'AU', label: 'TNI AU' }, { id: 'AD', label: 'TNI AD' }, { id: 'GAB', label: 'Gabungan' }];
  var JENIS = [{ id: 'markas', label: 'Markas' }, { id: 'perumahan', label: 'Perumahan' }, { id: 'rs', label: 'Rumah sakit' }];
  var EYEBROW_JENIS = { markas: 'Pangkalan', perumahan: 'Perumahan', rs: 'Rumah sakit' };
  var KEY_RE = /^(site:[a-z0-9-]{2,40}|dealer:\d{2,3}\.\d{5},-\d{1,2}\.\d{5}(#\d{1,2})?)$/;
  var PRODUCTS = [
    { id: 'KSM', label: 'KSM', short: 'KSM' },
    { id: 'TOPUP', label: 'Top up KSM', short: 'Top up KSM' },
    { id: 'KKB', label: 'KKB', short: 'KKB' },
    { id: 'PAYROLL', label: 'Tabungan dan payroll', short: 'Tabungan dan payroll' },
    { id: 'RUJUKAN', label: 'Kerja sama rujukan dealer', short: 'Rujukan dealer' }
  ];
  /* the nine SMA stages (MCD.schools.config.stages when Sekolah is loaded, ⟲ v6) */
  var STAGES = [
    { id: 'baru', label: 'Belum dihubungi' }, { id: 'kontak', label: 'Telah dihubungi' }, { id: 'presentasi', label: 'Presentasi' },
    { id: 'proposal', label: 'Proposal' }, { id: 'pks', label: 'Negosiasi & PKS' }, { id: 'onboarding', label: 'Onboarding' },
    { id: 'aktif', label: 'Aktif' }, { id: 'ditunda', label: 'Ditunda', side: true }, { id: 'gugur', label: 'Batal', side: true }
  ];
  var GROUPS = { TAMTAMA: 'Tamtama', BINTARA: 'Bintara', PAMA: 'Perwira pertama', PAMEN: 'Perwira menengah', PATI: 'Perwira tinggi' };
  var GROUP_ORDER = ['TAMTAMA', 'BINTARA', 'PAMA', 'PAMEN', 'PATI'];
  var RETIRE_GROUP = { TAMTAMA: 'tamtama', BINTARA: 'bintara', PAMA: 'perwira', PAMEN: 'perwira', PATI: 'pati' };
  var NOTE_REFUSED = 'Catatan memuat angka yang mirip data pribadi. Hapus angka tersebut sebelum menyimpan.';
  var NOTE_PH = 'Tulis langkah kerja. Jangan tulis nama prajurit, NRP, nomor pribadi atau data gaji.';
  var NO_KEY = 'Tempat ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.';
  var CENTRE = { lat: -6.32818, lon: 106.91329 };

  /* ------------------------------------------------------------ helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function ref() { return MCD.ref || null; }
  function centre() { var c = MCD.config && MCD.config.center; return c && isNum(c.lat) && isNum(c.lon) ? c : CENTRE; }
  function haversineKm(lon1, lat1, lon2, lat2) {
    var t = Math.PI / 180, dLat = (lat2 - lat1) * t, dLon = (lon2 - lon1) * t;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  var subs = [];
  function emit(what) { subs.slice().forEach(function (fn) { try { fn({ what: what }); } catch (e) { /* next listener */ } }); }
  T.on = function (fn) {
    if (!isFn(fn)) return function () {};
    subs.push(fn);
    return function () { subs = subs.filter(function (f) { return f !== fn; }); };
  };
  function fmtInt(n) { var F = MCD.util && MCD.util.fmt; if (F && isFn(F.int)) return F.int(n); return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  /** '41,2%' from a fraction (one decimal; two when one would round to zero). */
  function pctOf(fr) {
    if (!isNum(fr)) return '—';
    var v = fr * 100, d = Math.abs(v) > 0 && Math.abs(v) < 0.05 ? 2 : 1, k = Math.pow(10, d);
    return (Math.round(v * k) / k).toFixed(d).replace('.', ',') + '%';
  }
  /** '40%' or '8,25%' from a percent number (as typed by the branch). */
  function pctNum(p) { return isNum(p) ? String(Math.round(p * 100) / 100).replace('.', ',') + '%' : '—'; }
  T.pctOf = pctOf;
  T.pctNum = pctNum;
  function today() { return T._today || isoDay(new Date()); }
  function isoDay(d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; }
  T.today = today;
  function demoOn() {
    try {
      if (MCD.demo && isFn(MCD.demo.isOn) && MCD.demo.isOn()) return true;
      if (MCD.data && isFn(MCD.data.demoActive) && MCD.data.demoActive()) return true;
    } catch (e) { /* not in demo */ }
    return false;
  }
  T.demoOn = demoOn;

  /* ============================================================ pangkalan TNI (D6, D32) */

  var SITES = null;
  function kecOf(lon, lat) {
    var A = root.MCD_ADMIN_AREAS;
    if (!A || !isFn(A.locate)) return null;
    try { var r = A.locate(lon, lat); return r && r.kecamatanId ? String(r.kecamatanId) : null; } catch (e) { return null; }
  }
  function buildSites() {
    var R = ref();
    if (!R || !Array.isArray(R.sites) || !isFn(R.pangkalanOf)) return [];
    var c = centre(), out = [];
    var bySite = satkerIndex();
    R.sites.forEach(function (s) {
      var pk = null;
      try { pk = R.pangkalanOf(s); } catch (e) { pk = null; }
      if (!pk || !has(EYEBROW_JENIS, pk.jenis) || !isNum(s.lon) || !isNum(s.lat)) return;
      var units = bySite[s.id] || [];
      out.push({
        id: String(s.id), label: String(s.label || s.name || s.id), matra: pk.matra, matraName: pk.matraName, jenis: pk.jenis, jenisLabel: pk.jenisLabel,
        lon: s.lon, lat: s.lat, km: Math.round(haversineKm(c.lon, c.lat, s.lon, s.lat) * 100) / 100, approx: s.confidence === 'low',
        finance: units.filter(function (u) { return u.finance; }).map(function (u) { return u.abbr; }),
        nSatker: units.length, kecamatanId: undefined
      });
    });
    return out;
  }
  function allSites() {
    if (!SITES) SITES = buildSites();
    return SITES;
  }
  /** The selectable pangkalan within km of the Mabes TNI centre (all of them without km), in reference order. */
  T.sites = function (o) {
    var km = o && isNum(+o.km) ? +o.km : null;
    return allSites().filter(function (s) { return km == null || s.km <= km; }).map(withKec);
  };
  function withKec(s) { if (s.kecamatanId === undefined) s.kecamatanId = kecOf(s.lon, s.lat); return s; }
  T.site = function (id) {
    var k = String(id == null ? '' : id).replace(/^site:/, '');
    var r = allSites().filter(function (s) { return s.id === k; })[0];
    return r ? withKec(r) : null;
  };
  T.isSelectable = function (id) { return !!T.site(id); };
  /** {total, matra: {AL, AU, AD, GAB}, jenis: {markas, perumahan, rs}} within km. */
  T.counts = function (o) {
    var c = { total: 0, matra: { AL: 0, AU: 0, AD: 0, GAB: 0 }, jenis: { markas: 0, perumahan: 0, rs: 0 } };
    T.sites(o).forEach(function (s) { c.total++; if (has(c.matra, s.matra)) c.matra[s.matra]++; if (has(c.jenis, s.jenis)) c.jenis[s.jenis]++; });
    return c;
  };
  /** "PANGKALAN · TNI AL", "PERUMAHAN · TNI AL", "RUMAH SAKIT · TNI AU" (§3.3). */
  T.eyebrow = function (s) { return s ? (EYEBROW_JENIS[s.jenis] + ' · ' + s.matraName).toUpperCase() : ''; };
  T.matraLabel = function (id) { var m = MATRA.filter(function (x) { return x.id === id; })[0]; return m ? m.label : ''; };
  T.MATRA = MATRA.map(function (x) { return { id: x.id, label: x.label }; });
  T.JENIS = JENIS.map(function (x) { return { id: x.id, label: x.label }; });
  T._resetSites = function () { SITES = null; SATKER = null; };

  /* ============================================================ satuan (satker) under a pangkalan */

  var SATKER = null;
  /** {siteId: [{id, abbr, name, matra, finance}]}: the whitelist is applied here, once. */
  function satkerIndex() {
    if (SATKER) return SATKER;
    var R = ref(), out = {};
    var ids = {};
    ((R && R.sites) || []).forEach(function (s) { ids[s.id] = 1; });
    ((R && R.satker) || []).forEach(function (u) {
      if (!u || !u.id) return;
      var siteId = has(ids, u.id) ? u.id : SATKER_PARENT_SITE[u.parent];
      if (!siteId) return;
      (out[siteId] = out[siteId] || []).push({ id: String(u.id), abbr: String(u.abbr || ''), name: String(u.name || ''), matra: String(u.matra || ''), finance: FINANCE_RE.test(String(u.name || '')) });
    });
    SATKER = out;
    return out;
  }
  T.satkerOf = function (siteId) {
    var k = String(siteId == null ? '' : siteId).replace(/^site:/, '');
    return (satkerIndex()[k] || []).map(function (u) { return { id: u.id, abbr: u.abbr, name: u.name, matra: u.matra, finance: u.finance }; });
  };
  /** Cari: satker names (a satker opens its pangkalan; the row reads "{abbr} · di {pangkalan}"). */
  T.satkerSearch = function (q, n) {
    var s = norm(q);
    if (s.length < 2) return [];
    var idx = satkerIndex(), out = [];
    Object.keys(idx).forEach(function (siteId) {
      var site = T.site(siteId);
      if (!site) return;
      idx[siteId].forEach(function (u) {
        if (norm(u.abbr).indexOf(s) >= 0 || norm(u.name).indexOf(s) >= 0) out.push({ abbr: u.abbr, name: u.name, finance: u.finance, siteId: site.id, siteLabel: site.label });
      });
    });
    return out.slice(0, n || 8);
  };
  T.siteSearch = function (q, n) {
    var s = norm(q);
    if (s.length < 2) return [];
    return allSites().filter(function (r) { return norm(r.label).indexOf(s) >= 0; }).slice(0, n || 8);
  };
  function norm(x) { var t = String(x == null ? '' : x).toLowerCase(); if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); return t.replace(/[^a-z0-9]+/g, ' ').trim(); }

  /* ============================================================ dealers (D10, D25; ids §1.2) */

  var DEAL = { state: 'idle', rows: null, byId: null, p: null };
  function base(row) { return 'dealer:' + row.lon.toFixed(5) + ',' + row.lat.toFixed(5); }
  /** dealer:<lon>,<lat> with "#k" (1-based, file order) when two rows share that point. */
  T.dealerId = function (row, k) { return row && isNum(row.lon) && isNum(row.lat) ? base(row) + (isNum(k) && k > 0 ? '#' + k : '') : null; };
  /** Rows of the file with their ids: [{id, …row}] (new objects; the file stays as it is). */
  T.adaptDealers = function (rows) {
    var list = Array.isArray(rows) ? rows : [], n = {}, seen = {};
    list.forEach(function (r) { var b = base(r); n[b] = (n[b] || 0) + 1; });
    return list.map(function (r) {
      var b = base(r), o = {}, k = 0;
      if (n[b] > 1) { seen[b] = (seen[b] || 0) + 1; k = seen[b]; }
      Object.keys(r).forEach(function (f) { o[f] = r[f]; });
      o.id = T.dealerId(r, k);
      return o;
    });
  };
  T.dealerState = function () { return DEAL.state; };
  T.dealerRows = function () { return DEAL.rows; };
  T.dealer = function (id) { return DEAL.byId ? DEAL.byId[String(id)] || null : null; };
  function useDealers(g) {
    var VD = MCD.vehicleDealers;
    var rows = VD && isFn(VD.rows) ? VD.rows(g) : [];
    if (!rows.length) throw new Error('dealer file not usable');
    DEAL.rows = T.adaptDealers(rows);
    DEAL.byId = {};
    DEAL.rows.forEach(function (r) { DEAL.byId[r.id] = r; });
    DEAL.state = 'ready';
    emit('dealers');
    return DEAL.rows;
  }
  /** The dealer file, loaded once on first use (the "Dealer KKB" chip, the "Dealer terdekat" fold, the drawer tab). */
  T.dealers = function () {
    if (DEAL.rows) return Promise.resolve(DEAL.rows);
    if (DEAL.p) return DEAL.p;
    DEAL.state = 'loading';
    emit('dealers');
    var A = MCD.app, src;
    if (root.MCD_VEHICLE_DEALERS) src = Promise.resolve(root.MCD_VEHICLE_DEALERS);
    else if (A && isFn(A.lazy)) src = Promise.resolve().then(function () { return A.lazy('vehicle-dealers'); });
    else src = Promise.reject(new Error('no loader'));
    var p = src.then(function () { return useDealers(root.MCD_VEHICLE_DEALERS); });
    DEAL.p = p;
    p.then(null, function () { if (DEAL.p === p) { DEAL.p = null; DEAL.state = 'error'; emit('dealers'); } });
    return p;
  };
  /** [{row, km}] nearest first (straight line), resmi and bekas by default; [] while the file is not in. */
  T.nearestDealers = function (site, o) {
    o = o || {};
    var VD = MCD.vehicleDealers;
    if (!DEAL.rows || !VD || !isFn(VD.nearest) || !site) return [];
    return VD.nearest(DEAL.rows, site.lon, site.lat, { n: isNum(o.n) ? o.n : 5, maxKm: isNum(o.maxKm) ? o.maxKm : 3, kinds: o.kinds || null, includeServis: !!o.includeServis });
  };
  /** Pangkalan nearest to a dealer: [{site, km}] (straight line). */
  T.nearestSites = function (pt, n) {
    if (!pt) return [];
    return allSites().map(function (s) { return { site: withKec(s), km: haversineKm(pt.lon, pt.lat, s.lon, s.lat) }; })
      .sort(function (a, b) { return a.km - b.km; }).slice(0, n || 3);
  };
  /** Dealer CSV (§3.6): public rows only; names and websites left out while names are veiled. */
  T.dealerCsv = function (rows, o) {
    o = o || {};
    var VD = MCD.vehicleDealers || {}, U = MCD.util || {};
    var cell = U.csv && isFn(U.csv.cell) ? U.csv.cell : function (v) { var s = v == null ? '' : String(v); if (/^[=+\-@\t]/.test(s)) s = "'" + s; return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var head = ['nama', 'merek', 'jenis', 'tipe', 'jarak_dari_kcp_km', 'menit_dari_kcp', 'kecamatan', 'situs_resmi', 'sumber'];
    var lines = [head.join(',')];
    (rows || []).forEach(function (r) {
      var d = isFn(o.dist) ? o.dist(r) : null;
      var name = o.veiled ? initials(r.name) : r.name;
      var web = o.veiled ? '' : (isFn(VD.safeUrl) ? VD.safeUrl(r.web) || '' : '');
      lines.push([name, r.brand || 'Tanpa merek', isFn(VD.kindLabel) ? VD.kindLabel(r.kind) : r.kind, isFn(VD.typeLabel) ? VD.typeLabel(r.type) : r.type,
        d && isNum(d.km) ? (Math.round(d.km * 10) / 10).toFixed(1).replace('.', ',') : '', d && isNum(d.min) ? Math.round(d.min) : '',
        isFn(o.kecName) ? o.kecName(r.kec) || '' : '', web, isFn(VD.sourceLabel) ? VD.sourceLabel(r.source) : r.source].map(cell).join(','));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  };
  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + '.'; }).join(' ') || '—';
  }
  T._resetDealers = function () { DEAL = { state: 'idle', rows: null, byId: null, p: null }; };

  /* ============================================================ pay table and pangkat (§4.2) */

  var PAY = { state: 'idle', p: null };
  T.payTable = function () { var P = root.MCD_TNI_PAY; return P && Array.isArray(P.pangkat) ? P : null; };
  T.payState = function () { return T.payTable() ? 'ready' : PAY.state; };
  /** data/tni-pay.js on the first calculator open ("Memuat tabel gaji…"). */
  T.loadPay = function () {
    if (T.payTable()) return Promise.resolve(T.payTable());
    if (PAY.p) return PAY.p;
    PAY.state = 'loading';
    emit('pay');
    var A = MCD.app;
    var src = A && isFn(A.lazy) ? Promise.resolve().then(function () { return A.lazy('tni-pay'); }) : Promise.reject(new Error('no loader'));
    var p = src.then(function () {
      var t = T.payTable();
      if (!t) throw new Error('pay table not usable');
      PAY.state = 'ready';
      emit('pay');
      return t;
    });
    PAY.p = p;
    p.then(null, function () { if (PAY.p === p) { PAY.p = null; PAY.state = 'error'; emit('pay'); } });
    return p;
  };
  T._resetPay = function () { PAY = { state: 'idle', p: null }; };
  /**
   * pangkatOptions(matra) → [{kode, label, group, groupLabel}] in pay-table order. With AL, AU or AD the labels hold only
   * that matra's names (from the table's alias and MCD.ref.ranks), and a pangkat without a name in that matra is left
   * out; gabungan or no matra = every pangkat with its combined label.
   */
  T.pangkatOptions = function (matra) {
    var P = T.payTable();
    if (!P) return [];
    var R = ref(), ranks = R && R.rankByCode ? R.rankByCode : null;
    var m = matra === 'AL' || matra === 'AU' || matra === 'AD' ? matra : null;
    return P.pangkat.slice().sort(function (a, b) { return (a.urut || 0) - (b.urut || 0); }).map(function (p) {
      var label = p.label;
      if (m && ranks) {
        var names = [];
        (p.alias || []).forEach(function (a) {
          var r = ranks[String(a).toUpperCase()];
          if (r && Array.isArray(r.matra) && r.matra.indexOf(m) >= 0 && !names.some(function (x) { return x.label === r.label; })) names.push({ label: r.label, only: r.matra.length === 1 });
        });
        if (!names.length) return null;
        names.sort(function (a, b) { return (a.only ? 0 : 1) - (b.only ? 0 : 1); });
        label = names.map(function (x) { return x.label; }).join(' / ');
      }
      return { kode: p.kode, label: label, group: p.kelompok, groupLabel: GROUPS[p.kelompok] || p.kelompok };
    }).filter(Boolean);
  };
  T.GROUP_ORDER = GROUP_ORDER.slice();
  T.groupLabel = function (g) { return GROUPS[g] || g; };
  /** The BUP input of MCD.kprMath.retireTenor for a pangkat code: {rankGroup, patiStars}; tamtama without a pangkat. */
  T.rankInfo = function (kode) {
    var P = T.payTable(), p = P && kode ? P.pangkat.filter(function (x) { return x.kode === kode; })[0] : null;
    if (!p) return { rankGroup: 'tamtama', patiStars: null, known: false };
    return { rankGroup: RETIRE_GROUP[p.kelompok] || 'tamtama', patiStars: p.kelompok === 'PATI' ? Math.min(4, Math.max(1, (p.urut || 19) - 18)) : null, known: true };
  };

  /* ============================================================ KPI file: booking KSM and concentration (D22) */

  T.kpiModel = function () {
    var K = MCD.kpi, D = MCD.data;
    if (!K || !isFn(K.fromRecords) || !D || demoOn()) return null;
    var recs = D.kpi_cabang;
    if (!Array.isArray(recs) || !recs.length) return null;
    try { var m = K.fromRecords(recs); return m && m.ok ? m : null; } catch (e) { return null; }
  };
  function homeOf(m) { var c = m && (m.home || '12903'); return m ? (m.branches || []).filter(function (b) { return b.code === c; })[0] || null : null; }
  function get(o, path) { return String(path).split('.').reduce(function (a, k) { return a != null && typeof a === 'object' ? a[k] : undefined; }, o); }
  /** {capaian, kurang, actual, target, status, period, periodLabel} of booking KSM, or null without a file (or under Data contoh). */
  T.bookingKsm = function () {
    var m = T.kpiModel(), b = homeOf(m);
    if (!b) return null;
    var cap = get(b.capaian, 'booking.ksm');
    if (!isNum(cap)) return null;
    return { capaian: cap, kurang: get(b.kurang, 'booking.ksm'), actual: get(b.kpi, 'booking.ksm'), target: get(b.target, 'booking.ksm'),
      status: statusWord(cap), period: m.period, periodLabel: m.periodLabel || '' };
  };
  function statusWord(cap) { return !isNum(cap) ? '' : cap >= 1 ? 'Tercapai' : cap >= 0.9 ? 'Hampir tercapai' : 'Tertinggal'; }
  T.statusWord = statusWord;
  /**
   * concentration() → {ksmShare (fraction), nplRetail, nplArea, period, periodLabel, limitPct, over} | null. The share is
   * kredit KSM ÷ kredit consumer of the home branch (the file's own consumer total, §18); null without a file, under Data
   * contoh or without both numbers (never "0%").
   */
  T.concentration = function () {
    var m = T.kpiModel(), b = homeOf(m);
    if (!b) return null;
    var ksm = get(b.kpi, 'kredit.ksm'), cons = get(b.kpi, 'kredit.consumer');
    if (!isNum(ksm) || !isNum(cons) || cons <= 0 || ksm < 0) return null;
    var share = ksm / cons, area = m.areaTotal ? get(m.areaTotal.kpi, 'nplRetail') : null, npl = get(b.kpi, 'nplRetail');
    var P = MCD.policy, lim = null;
    if (P && isFn(P.ksmShareMax)) { try { lim = P.ksmShareMax(); } catch (e) { lim = null; } }
    lim = isNum(lim) ? lim : null;
    return { ksmShare: share, nplRetail: isNum(npl) ? npl : null, nplArea: isNum(area) ? area : null, period: m.period || null, periodLabel: m.periodLabel || '',
      limitPct: lim, over: lim != null && share * 100 > lim };
  };
  /**
   * The one string (§10.1): 'full' "KSM {p}% dari kredit consumer cabang. NPL retail {n}% (area {a}%)." · 'short' "Porsi KSM
   * {p}%" · 'npl' "NPL retail {n}% (area {a}%)." (the KKB tab). '' for null.
   */
  T.concentrationText = function (c, o) {
    if (!c) return '';
    var mode = (o && o.mode) || 'full';
    var npl = isNum(c.nplRetail) ? 'NPL retail ' + pctOf(c.nplRetail) + (isNum(c.nplArea) ? ' (area ' + pctOf(c.nplArea) + ').' : '.') : '';
    if (mode === 'short') return 'Porsi KSM ' + pctOf(c.ksmShare);
    if (mode === 'npl') return npl;
    return 'KSM ' + pctOf(c.ksmShare) + ' dari kredit consumer cabang.' + (npl ? ' ' + npl : '');
  };
  T.CONCENTRATION_TITLE = 'Kredit KSM dibagi kredit consumer cabang, dihitung dashboard dari file KPI.';
  /** "Porsi KSM di atas batas yang diisi cabang ({x}%)." when the branch filled a limit and the share is above it. */
  T.limitText = function (c) { return c && c.over ? 'Porsi KSM di atas batas yang diisi cabang (' + pctNum(c.limitPct) + ').' : ''; };

  /* ============================================================ follow-ups (§3.4 fold 6, §3.6) */

  T.KEY_RE = KEY_RE;
  T.PRODUCTS = PRODUCTS.map(function (p) { return { id: p.id, label: p.label, short: p.short }; });
  T.NOTE_REFUSED = NOTE_REFUSED;
  T.NOTE_PH = NOTE_PH;
  T.NO_KEY = NO_KEY;
  T.validKey = function (k) { return typeof k === 'string' && KEY_RE.test(k); };
  T.siteKey = function (id) { var k = 'site:' + String(id == null ? '' : id).replace(/^site:/, ''); return T.validKey(k) ? k : null; };
  T.dealerKey = function (id) { return T.validKey(String(id)) ? String(id) : null; };
  T.stages = function () {
    var S = MCD.schools && MCD.schools.config && MCD.schools.config.stages;
    return Array.isArray(S) && S.length ? S : STAGES;
  };
  T.stageLabel = function (id) { var s = T.stages().filter(function (x) { return x.id === id; })[0]; return s ? s.label : ''; };
  T.productName = function (id) { var p = PRODUCTS.filter(function (x) { return x.id === id; })[0]; return p ? p.short : id; };
  /* the programmes "Produk sasaran" names (§3.4 fold 2); the calculator never reads them */
  var TNI_PROGRAMS = ['ksm-tni', 'ksm-tni-ad', 'livin-kkb'];
  /** "Belum ada" plus the TNI KSM and KKB programmes of MCD.config ({live: true}: only those running today). */
  T.programs = function (o) {
    var C = MCD.config, list = C && Array.isArray(C.programs) ? C.programs : [];
    var out = [{ id: '', label: 'Belum ada' }];
    list.forEach(function (p) {
      if (!p || TNI_PROGRAMS.indexOf(p.id) < 0) return;
      if (o && o.live) {
        var s = C && isFn(C.programStatus) ? C.programStatus(p, today()) : null;
        if (!s || !s.live) return;
      }
      out.push({ id: p.id, label: p.short || p.label, end: p.end, terms: p.terms || '', src: p.src || '', full: p.label });
    });
    return out;
  };

  var DATE_RUN = /\+?\d[\d\s\-().]{0,40}\d|\d/g;
  /**
   * noteCheck(text) → {ok, hits}: the value detectors of MCD.leads on each run of digits and on each word with "@" (NIK,
   * telepon, e-mail, rekening or kartu, NIP), plus any run of 7 or more digits after removing spaces, dots and dashes
   * (NRP, a phone without its prefix). hits names the kinds only, never a value.
   */
  T.noteCheck = function (text) {
    var s = String(text == null ? '' : text), hits = [];
    if (!s.trim()) return { ok: true, hits: [] };
    var L = MCD.leads, cv = L && isFn(L.classifyValue) ? L.classifyValue : null;
    function add(k) { if (k && hits.indexOf(k) < 0) hits.push(k); }
    s.split(/\s+/).forEach(function (w) {
      if (w.indexOf('@') < 0) return;
      var t = w.replace(/^[^A-Za-z0-9+]+|[^A-Za-z0-9]+$/g, '');
      var x = cv ? safeCv(cv, t) : null;
      if (!x && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) x = 'email';
      add(x);
    });
    (s.match(DATE_RUN) || []).forEach(function (run) {
      var x = cv ? safeCv(cv, run) : null;
      if (!x) {
        var d = run.replace(/\D/g, '');
        if (d.length === 16) x = 'nik';
        else if (/^(\+?62|0)8\d{7,12}$/.test(run.replace(/[\s\-().]/g, ''))) x = 'telepon';
        else if (d.length >= 10) x = 'rekening';
      }
      add(x);
    });
    if (/\d{7,}/.test(s.replace(/[\s.\-]/g, ''))) add('nomor');
    return { ok: hits.length === 0, hits: hits };
  };
  function safeCv(cv, v) { try { return cv(v, 'text'); } catch (e) { return null; } }

  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, max); }
  function stageOk(x) { return T.stages().some(function (s) { return s.id === x; }) ? x : 'baru'; }
  function nowIso() { return new Date().toISOString(); }
  /** check(key, patch): the key pattern and the note check, for the sealed list and the memory list alike. */
  function pipeCheck(k, patch) {
    if (!T.validKey(k)) return NO_KEY;
    if (patch && typeof patch === 'object' && 'note' in patch && !T.noteCheck(patch.note).ok) return NOTE_REFUSED;
    return null;
  }
  T.pipeCheck = pipeCheck;
  /** The list without MCD.seal: memory only, never written in plain text; status 'memory' (V6_SPEC §7.3). */
  function memoryPipeline() {
    var mem = {}, subsP = [];
    function fire() { subsP.slice().forEach(function (fn) { try { fn(mem); } catch (e) { /* next */ } }); }
    var api = {
      key: 'tni.pipeline', memory: true,
      all: function () { return mem; },
      get: function (k) { return has(mem, k) ? mem[k] : null; },
      count: function () { return Object.keys(mem).length; },
      persisted: function () { return false; },
      status: function () { return 'memory'; },
      ready: function () { return Promise.resolve(api); },
      orphans: function (known) {
        var f = isFn(known) ? known : function (k) { return known && isFn(known.has) ? known.has(k) : Array.isArray(known) ? known.indexOf(k) >= 0 : false; };
        return Object.keys(mem).filter(function (k) { try { return !f(k); } catch (e) { return true; } });
      },
      set: function (k, patch, meta) {
        var err = pipeCheck(k, patch || {});
        if (err) return { ok: false, error: err };
        var cur = mem[k] || { stage: 'baru', owner: '', products: [], program: '', nextStep: '', nextDate: '', lastContact: '', note: '', history: [], t: '' };
        var next = Object.assign({}, cur);
        patch = patch || {};
        if ('program' in patch) next.program = T.programs().some(function (p) { return p.id === patch.program; }) ? patch.program : '';
        if ('stage' in patch) {
          var s2 = stageOk(patch.stage);
          if (s2 !== cur.stage || !cur.history.length) next.history = (cur.history || []).concat([{ stage: s2, t: nowIso() }]).slice(-20);
          next.stage = s2;
        }
        if ('owner' in patch) next.owner = cleanText(patch.owner, 60);
        if ('nextStep' in patch) next.nextStep = cleanText(patch.nextStep, 120);
        if ('note' in patch) next.note = cleanText(patch.note, 500);
        ['nextDate', 'lastContact'].forEach(function (f) { if (f in patch) next[f] = /^\d{4}-\d{2}-\d{2}$/.test(String(patch[f] || '')) ? patch[f] : ''; });
        if ('products' in patch) next.products = (Array.isArray(patch.products) ? patch.products : []).filter(function (x) { return PRODUCTS.some(function (q) { return q.id === x; }); });
        if (meta && meta.label) next.label = cleanText(meta.label, 160);
        next.t = nowIso();
        mem[k] = next;
        fire();
        return { ok: true, entry: next };
      },
      quickAdd: function (k, label) {
        if (!T.validKey(k)) return { ok: false, error: NO_KEY };
        if (mem[k]) return { ok: true, entry: mem[k], existed: true };
        var res = api.set(k, { stage: 'baru' }, { label: label || '' });
        if (res.ok) res.existed = false;
        return res;
      },
      remove: function (k) { if (mem[k]) { delete mem[k]; fire(); } },
      clear: function () { mem = {}; fire(); },
      exportJson: function () { return JSON.stringify({ v: 1, kind: 'mcd.tni.pipeline', exported: nowIso(), data: mem }, null, 1); },
      importJson: function () { return { ok: false, error: 'Impor tindak lanjut belum tersedia saat penyimpanan terenkripsi belum aktif.' }; },
      on: function (fn) { if (isFn(fn)) subsP.push(fn); return function () { subsP = subsP.filter(function (f) { return f !== fn; }); }; },
      _reset: function () { mem = {}; }
    };
    return api;
  }
  var PIPE = null;
  /** MCD.seal.pipeline('tni.pipeline', …) when the SEAL lane is loaded (encrypted, ⟲ v6), else the memory list. */
  function pipeline() {
    if (PIPE && !(PIPE.memory && MCD.seal && isFn(MCD.seal.pipeline) && !PIPE.count())) return PIPE;
    var S = MCD.seal, p = null;
    if (S && isFn(S.pipeline)) {
      try {
        p = S.pipeline('tni.pipeline', { keyRe: KEY_RE, stages: T.stages(), products: PRODUCTS.map(function (x) { return x.id; }),
          programs: T.programs().map(function (x) { return x.id; }).filter(Boolean), check: function (k, patch) { return pipeCheck(k, patch); },
          messages: { noKey: NO_KEY, noQuickKey: NO_KEY, badKey: NO_KEY, notExport: 'File ini bukan ekspor tindak lanjut Kredit TNI. Pilih file lain.' } });
      } catch (e) { p = null; }
    }
    PIPE = p && isFn(p.get) && isFn(p.set) ? p : memoryPipeline();
    return PIPE;
  }
  try {
    Object.defineProperty(T, 'pipeline', { configurable: true, enumerable: true, get: pipeline, set: function (v) { PIPE = v || null; } });
  } catch (e) { T.pipeline = pipeline(); }
  T._memoryPipeline = memoryPipeline;
  /** The follow-up export (§3.6): the v6 JSON with each note that fails the check of §3.4 left out (older entries). → {text, dropped} */
  T.exportPipeline = function () {
    var P = pipeline(), obj = null, dropped = 0;
    try { obj = JSON.parse(P.exportJson()); } catch (e) { obj = { v: 1, kind: 'mcd.tni.pipeline', exported: nowIso(), data: {} }; }
    var data = obj && obj.data && typeof obj.data === 'object' ? obj.data : {};
    Object.keys(data).forEach(function (k) {
      var e = data[k];
      if (e && e.note && !T.noteCheck(e.note).ok) { e = Object.assign({}, e); e.note = ''; data[k] = e; dropped++; }
    });
    obj.data = data;
    return { text: JSON.stringify(obj, null, 1), dropped: dropped };
  };

  /* ============================================================ calculator memory (§4.6, D9) */

  function blankInputs() {
    return { pangkat: '', mkg: '', usia: '', menikah: false, anak: '', kelas: '', beras: 'natura', slip: '',
      cicilanGaji: '', potLain: '', cicilanLain: '', tenorKsm: '', harga: '', dp: '', tenorKkb: '', combined: true };
  }
  var CALC = null, HOLD = 0, HOLD_T = 0, HOLD_OFF = null;
  function unhold() {
    HOLD = 0;
    if (HOLD_T) { clearTimeout(HOLD_T); HOLD_T = 0; }
    if (HOLD_OFF) { var f = HOLD_OFF; HOLD_OFF = null; try { f(); } catch (e) { /* ignore */ } }
  }
  function calcBlank(matra) { return { tab: 'ksm', route: 'pangkat', matra: matra || null, allRanks: false, moreOpen: false, inputs: blankInputs() }; }
  T.calc = {
    get: function () { if (!CALC) CALC = calcBlank(null); return CALC; },
    set: function (patch) {
      var c = T.calc.get();
      Object.keys(patch || {}).forEach(function (k) { if (k !== 'inputs') c[k] = patch[k]; });
      return c;
    },
    input: function (k, v) { var c = T.calc.get(); if (has(c.inputs, k)) c.inputs[k] = v; return c; },
    /** "Mulai nasabah baru": every customer input cleared, the matra filter (and the open tab) kept. */
    clearInputs: function () { var c = T.calc.get(); c.inputs = blankInputs(); c.moreOpen = false; emit('calc'); return c; },
    /** Tutup, Esc, lock: the whole memory goes. */
    drop: function () { CALC = null; unhold(); emit('calc'); },
    /**
     * The "Buka Kebijakan & leads" round trip keeps the inputs for at most ms (10 minutes); the timer, or a switch to any
     * section other than Data & Privasi and Kredit TNI, drops them (§4.5).
     */
    hold: function (ms) {
      var span = isNum(ms) && ms > 0 ? ms : 600000;
      unhold();
      HOLD = Date.now() + span;
      HOLD_T = setTimeout(function () { HOLD_T = 0; if (HOLD) T.calc.drop(); }, span);
      var St = MCD.state;
      if (St && isFn(St.on)) {
        try {
          var off = St.on('change', function (e) {
            var sec = e && e.state && e.state.section;
            if (HOLD && sec && sec !== 'data' && sec !== 'tni') T.calc.drop();
          });
          HOLD_OFF = isFn(off) ? off : function () { if (isFn(St.off)) St.off('change', off); };
        } catch (e) { HOLD_OFF = null; }
      }
      return HOLD;
    },
    held: function () { return !!(CALC && HOLD && Date.now() < HOLD); },
    release: function () { unhold(); },
    blankInputs: blankInputs
  };
  /* lock (also the idle lock): the calculator memory is dropped at once */
  try {
    var d0 = root.document;
    if (d0 && isFn(d0.addEventListener)) d0.addEventListener('mcd:gate-locking', function () { T.calc.drop(); });
  } catch (e) { /* no document (Node) */ }

  T.fmtInt = fmtInt;
  T.haversineKm = haversineKm;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
