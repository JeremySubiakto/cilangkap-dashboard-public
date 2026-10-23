/* ==========================================================================
 * MCD.sme — the merchant map engine of section 2 "Merchant (LVM & EDC)".
 * Dashboard Akuisisi · Bank Mandiri KCP Jakarta Cilangkap (12903).
 *
 * Branch scope (docs/COPY_STYLE_EN.md items 10-22): every grocery, restaurant, SME and
 * MSME within 15 km of Mabes TNI (public Overture listings, data/sme-pois.js), marked
 * "Sudah diakuisisi" (matched to the Livin' Merchant file by MCD.lvm) or "Belum ada di LVM",
 * per kecamatan on the calm territory map (MCD.territory, items 20 and 23: thin grey kecamatan outlines, no
 * fills, a label chip "Cipayung · 962 merchant" with a coverage dot after the import; no tiles are drawn or
 * named). Before the LVM file is imported the merchant dots are potential only, in blue.
 *
 * This module owns the map side and the list maths; section-merchants.js owns the panels.
 *
 *   View state (memory only; mcd.sme.view.v1 keeps ONLY the map mode, plan B-03 / D14):
 *     view() → {mode: 'territory'|'merchants', cats: [], status: 'all'|'notYet'|'acquired'|'inactive',
 *               kec: Kemendagri id | null, km: 1|3|5|10|15|null, tier: 'all'|'edc'|'lvm'|'naik-edc'|'nasional' ("Sasaran", items 35, 42)}
 *     setView(patch, {temporary}?) · onView(fn) → off() · resetFilters()
 *     temporary mode (v5 fixer): setView({mode}, {temporary: true}) shows a mode for one task (the kecamatan card's
 *       points) without storing it; endTempMode() goes back to the stored mode, keepMode() stores the shown one,
 *       tempMode() → the mode to go back to, or null. A mode change without {temporary} stores it as before.
 *     highlight() / setHighlight(kecId)   a map click highlights a kecamatan; it never filters (IA H7)
 *   Model:  model() → {R (MCD.lvm.match()), hasLvm, hasEdc, demo, asOf, terr (MCD.territory stats of the
 *           type filter), terrAll (all types), agg (MCD.lvm.aggregate('kecamatan')), totals, kec: [...]}
 *   Lists:  leads() (public merchants "Belum ada di LVM", by priority) · leadCounts() (per type, kecamatan and
 *           distance filters applied) · leadsCsv(list) · inactive({own}) · inactiveCsv(x, mode) · edc() · kpi()
 *   Priority: priorityKec(n) → MCD.territory.priority(terrAll, {n}) when the shell has it (plan A-06, the one
 *           ranking for Ringkasan, Merchant and the map numbers), else the same rule computed here
 *   Google Maps (item 22, plan §2.8): gmapsUrl({lat, lon} | {q}) · gmapsFor(kind, id) → {lat, lon, approx} ·
 *           kecQuery(kecId) → {q: 'Kecamatan Ciracas, Kota Jakarta Timur'}. LVM stores: coordinates only.
 *   Search: searchMerchants(q) (public listings only, never LVM-only names), registered with
 *           MCD.app.registerSearch when the shell provides it (plan B-11)
 *   Lookups: poiInfo(i) · kecName(id) · kelName(id) · lvmStore(id) · maskName(name, mode) · pctAuto(x)
 *   Not a merchant: notMerchant(i) → 0 | 1 school | 2 address-only name | 3 not a business (worship, government, park,
 *           cemetery, golf, hall, bank, estate, whole market or mall); notMerchantWhy(i); nonMerchantCount() → {sekolah,
 *           alamat, lain, all, byWhy}. One rule in MCD.lvm (v4): such rows are never matched, counted, listed or drawn.
 *   Distance from KCP (items 27-28, through MCD.distance): poiDist(i) · lvmDist(id) (cached per row / store) ·
 *           distText(r) "4,2 km · ± 14 menit" · distTip(r) · leadsNear() ("Terdekat dari KCP") · nearestFirst(list, fn)
 *   Sasaran EDC / LVM (item 37, open data only): factors(i) → {ticket, crowd, wealth, tier} (nilai belanja × keramaian ×
 *           daya beli area, each a level with one plain reason) · edcCandidates({kecamatanId, limit, tiers}) (tiers 'edc' |
 *           'lvm' | 'naik-edc' | 'nasional': the national chains of item 42, "Jaringan nasional (lewat kantor pusat)", no
 *           branch target; who counts: chainOf(i), docs/EDC_SCORE.md §7.5) · edcTierCounts() · edcOf(i) · edcShare() ·
 *           directionsUrl(lon, lat) ("Rute di Google Maps") ·
 *           googleRank(items, liveResults) (item 33: reviews × ticket weight, the caller keeps nothing)
 *   LVM stores not on the public map: layer 'merchants-lvm' "Sudah pakai Livin' Merchant", each at its own point from
 *           its address (MCD.lvm, item 28), precision words placeWords(o) / PREC_LABEL
 *   Focus:  revealPoi(i) · revealLvm(id) clear the filters that would hide the point and switch to the dot view
 *
 * REGISTRATIONS AT LOAD (declarations only)
 *   MCD.map.registerLayers / registerLegend / registerPosture('merchants'),
 *   registerSelectable('mxPoi' | 'mxLvm' | 'mxCluster'), MCD.data.setDemo('lvm_kpi') (opt-in demo only).
 *   'area:merchants' belongs to MCD.lvm (keyed by Kemendagri id); MCD.sme.areaAggregates is an alias.
 *
 * Flat map only (no extrusion, elevation, pitch or bearing). Safe DOM only.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = window;
  var EMPTY = [];
  var D2R = Math.PI / 180;
  var CENTER = [106.91329, -6.32818];                 // Mabes TNI centre used by the data files
  var HOME = '12903';
  var VIEW_KEY = 'mcd.sme.view.v1';
  var CLUSTER_Z = 13.5;                                // below this zoom, merchants are grouped
  var GMAPS = 'https://www.google.com/maps/search/?api=1&query=';

  function U() { return MCD.util; }
  function F() { return MCD.util.fmt; }
  function T() { return MCD.territory && MCD.territory.ready && MCD.territory.ready() ? MCD.territory : null; }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function warn(msg, e) { try { console.warn('[MCD.sme] ' + msg, e || ''); } catch (x) { /* ignore */ } }
  function safe(fn, dflt) { try { return fn(); } catch (e) { warn('', e); return dflt === undefined ? null : dflt; } }

  /* ================================================================ copy (Bahasa Indonesia, COPY_STYLE item 19) */

  var CATS = ['grocery', 'restaurant', 'other'];
  var LCATS = ['restaurant', 'grocery', 'other'];      // MCD.lvm category codes (typed arrays)
  var CAT = {
    grocery: { label: 'Toko kelontong & ritel', short: 'Toko kelontong', weight: 1, color: 'chart-1' },
    restaurant: { label: 'Restoran & warung makan', short: 'Restoran', weight: 0.9, color: 'chart-3' },
    other: { label: 'UMKM lainnya', short: 'UMKM lainnya', weight: 0.6, color: 'chart-5' }
  };
  var DIST = [1, 3, 5, 10, 15];
  var BANDS = [
    { key: '0-1', label: 'Kurang dari 1 km', lo: 0, hi: 1 }, { key: '1-3', label: '1–3 km', lo: 1, hi: 3 },
    { key: '3-5', label: '3–5 km', lo: 3, hi: 5 }, { key: '5-10', label: '5–10 km', lo: 5, hi: 10 },
    { key: '10-15', label: '10–15 km', lo: 10, hi: 15.01 }
  ];
  var STATUS_FILTER = [
    { id: 'all', label: 'Semua' }, { id: 'notYet', label: 'Belum ada di LVM' },
    { id: 'acquired', label: 'Sudah diakuisisi' }, { id: 'inactive', label: 'Tidak aktif bulan ini' }
  ];
  /* map and list filter "Sasaran" (item 35): 'edc' = Sasaran EDC and Naik ke EDC; 'nasional' = the national chains of
     item 42, shown apart (no branch target) */
  var TIER_FILTER = [
    { id: 'all', label: 'Semua' }, { id: 'edc', label: 'Sasaran EDC' }, { id: 'lvm', label: 'Sasaran LVM' }, { id: 'naik-edc', label: 'Naik ke EDC' },
    { id: 'nasional', label: 'Jaringan nasional' }
  ];
  var MODES = [
    { id: 'territory', label: 'Per kecamatan', title: 'Batas kecamatan dan jumlah merchant per kecamatan' },
    { id: 'merchants', label: 'Titik merchant', title: 'Satu titik per merchant. Titik dikelompokkan saat peta diperkecil.' }
  ];
  /* Overture group labels (MCD_SME_POIS.meta.groups 0-11) for the "jenis usaha" line */
  var GROUP_LABEL = ['Makanan dan minuman', 'Toko dan kelontong', 'Bengkel dan jasa kendaraan', 'Klinik dan apotek', 'Sekolah dan kursus',
    'Salon dan kecantikan', 'Bahan bangunan', 'Pabrik dan bengkel kerja', 'Grosir', 'Kantor dan jasa', 'Hotel dan perjalanan', 'Usaha lainnya'];
  var WORDS = {
    potential: 'Potensi (file LVM belum diimpor)',
    notYet: 'Belum ada di LVM, kemungkinan besar belum diakuisisi',
    notYetNote: 'Merchant ini mungkin terdaftar di LVM dengan nama lain. Periksa sebelum menawarkan.',
    acquired: 'Sudah diakuisisi (ada di file Livin’ Merchant)',
    inactive: 'Sudah diakuisisi, tidak aktif bulan ini',
    lvmOnly: 'Toko LVM yang tidak ada di peta publik',
    lvmBadge: 'Sudah pakai Livin’ Merchant',
    noName: '(tanpa nama)'
  };
  var SRC_POI = 'Overture Maps, rilis';
  var ATTRIBUTION = '© Overture Maps Foundation · Foursquare (Apache-2.0) · © OpenStreetMap contributors (ODbL) · BPS via OCHA/HDX (CC BY 3.0 IGO)';

  /** Percent for shares: two decimals when one would round a positive share to zero, one decimal under 10%. */
  function pctAuto(x) {
    if (!isNum(x)) return '—';
    return F().pct(x, x > 0 && x < 0.00095 ? 2 : (x > 0 && x < 0.095 ? 1 : 0));
  }

  /* ================================================================ data access */

  function pois() { return W.MCD_SME_POIS && W.MCD_SME_POIS.rows ? W.MCD_SME_POIS : null; }
  function meta() { var p = pois(); return (p && p.meta) || {}; }
  function release() { return meta().release || '2026-09-23.1'; }
  function center() { var c = meta().center; return Array.isArray(c) && c.length === 2 ? c : CENTER; }
  function hav(lon1, lat1, lon2, lat2) {
    var p1 = lat1 * D2R, p2 = lat2 * D2R, dp = p2 - p1, dl = (lon2 - lon1) * D2R;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function kmFromCentre(lon, lat) { var c = center(); return hav(c[0], c[1], lon, lat); }
  function bandIndex(km) { for (var b = 0; b < BANDS.length; b++) if (km < BANDS[b].hi) return b; return -1; }
  function rowName(i) { var P = pois(); return P && P.rows[i] ? String(P.rows[i][3] || '') : ''; }
  function rowGroup(i) { var P = pois(); return P && P.rows[i] ? (P.rows[i][2] | 0) : -1; }

  /* ================================================================ not a merchant (MCD.lvm, v4) */

  /* Who counts as a merchant is one rule in MCD.lvm (docs/EDC_SCORE.md §6): schools, names that are only an address and
     places that do not sell to walk-in buyers (worship, government / TNI / police, parks, cemeteries, golf, community
     halls, banks and finance, housing estates, a whole market or mall) are never matched, counted or drawn (X.ok = 0).
     The area totals, the KPI, the visit lists, the map dots, the Sasaran lists and the search therefore agree. */
  var NONM_CODE = { sekolah: 1, alamat: 2, 'bukan-usaha': 3 };
  /** notMerchant(i) → 0 (a merchant), 1 (a school), 2 (a name that is only an address) or 3 (not a business). */
  function notMerchant(i) {
    var L = MCD.lvm, o = L && typeof L.nonMerchant === 'function' ? safe(function () { return L.nonMerchant(i); }) : null;
    return o ? (NONM_CODE[o.kind] || 3) : 0;
  }
  /** notMerchantWhy(i) → {kind, why, words} | null: why a listing is left out ("tempat ibadah", "sekolah atau kampus"). */
  function notMerchantWhy(i) { var L = MCD.lvm; return L && typeof L.nonMerchant === 'function' ? safe(function () { return L.nonMerchant(i); }) : null; }
  /** nonMerchantCount() → {sekolah, alamat, lain, all, byWhy}: the public listings within 15 km left out of every list. */
  function nonMerchantCount() {
    var L = MCD.lvm, m = model(), c = m && L && typeof L.nonMerchantCount === 'function' ? safe(function () { return L.nonMerchantCount(m.R); }) : null;
    return c || { sekolah: 0, alamat: 0, lain: 0, all: 0, byWhy: {} };
  }

  /* Public business names are shown in full; practitioners (dr, bidan, …) are masked, and every name is
     masked in presentation mode (veil). LVM store names follow MCD.util.mask (masked by default). */
  var PRACT = /\b(dr|drg|dokter|bidan|bd|ns|mua|praktik|praktek|psikolog)\b\.?/i;
  function maskName(name, mode, forExport) {
    var s = String(name || '').trim();
    if (!s) return WORDS.noName;
    var words = s.split(/\s+/);
    if (mode === 'veil') return words.filter(function (w) { return /[A-Za-z0-9]/.test(w); }).slice(0, 3).map(function (w) { return w.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() + '.'; }).join(' ') || WORDS.noName;
    if (!PRACT.test(s) || (mode === 'reveal' && !forExport)) return s;
    var m = PRACT.exec(s), title = m[0].replace(/\.$/, '');
    var rest = s.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean);
    return (title.charAt(0).toUpperCase() + title.slice(1)) + (rest.length ? ' ' + rest.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase() + '***'; }).join(' ') : '');
  }
  function storeName(name, mode) {
    var M = U() && U().mask;
    if (M && M.name) return M.name({ name: name }, mode || 'masked');
    return mode === 'reveal' ? String(name || '') : '—';
  }
  function privacyMode() { try { return MCD.app && MCD.app.privacyMode ? MCD.app.privacyMode() : 'masked'; } catch (e) { return 'masked'; } }

  /* ================================================================ distance from KCP (items 27-28) */

  /* Every public business and every LVM store has its own "x,x km · ± y menit" from KCP Jakarta Cilangkap, read from
     MCD.distance (the shell: the road grid inside ±16 km, else the kelurahan table at normal traffic, else a straight
     line). A value is computed when a row, popup or drawer needs it and is cached per listing row or store; the shared
     toggles "Jam sibuk" and "Motor (tanpa tol)" only change which value is read, so the cache stays valid. Without
     MCD.distance the travel grid (MCD.travel) or a straight line is used, so the lists never break. */
  var DIST_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  var DIST_NONE_TIP = 'Jarak belum dapat dihitung untuk titik ini.';
  var DC = { key: '', poi: [], lvm: {}, near: { key: '', val: null } };
  function DI() { var D = MCD.distance; return D && typeof D.of === 'function' ? D : null; }
  function branchPt() { var b = MCD.config && MCD.config.branch; return b && isNum(b.lat) && isNum(b.lon) ? b : { lat: -6.33203, lon: 106.90989 }; }
  function travelOK() { var G = MCD.travel; return !!(G && typeof G.ready === 'function' && typeof G.at === 'function' && safe(function () { return G.ready(); }, false)); }
  function distSig() { var b = branchPt(); return b.lon + ',' + b.lat + '|' + (DI() ? 'd' : (travelOK() ? 't' : 'g')); }
  function distFresh() { var k = distSig(); if (DC.key !== k) DC = { key: k, poi: [], lvm: {}, near: { key: '', val: null } }; }
  /** distanceAt(lon, lat, {kelurahanId, kecamatanId}?) → {km, min, minPeak, precision, source, noToll} | null. */
  function distanceAt(lon, lat, area) {
    if (!isNum(lon) || !isNum(lat)) return null;
    var D = DI();
    if (D) return safe(function () { return D.of(lon, lat, area || {}); }) || null;
    if (travelOK()) {
      var g = safe(function () { return MCD.travel.at(lon, lat); });
      if (g && isNum(g.km)) {
        return { km: g.km, min: g.min, minPeak: g.minPeak, precision: 'jalan', source: 'grid',
          noToll: g.noToll && isNum(g.noToll.km) ? { km: g.noToll.km, min: g.noToll.min, minPeak: g.noToll.minPeak } : null };
      }
    }
    var b = branchPt();
    return { km: hav(b.lon, b.lat, lon, lat), min: null, minPeak: null, precision: 'garis-lurus', source: 'garis', noToll: null };
  }
  /** poiDist(i) → the distance of public listing row i (cached). */
  function poiDist(i) {
    var m = model();
    if (!m) return null;
    var X = m.R.X;
    if (!(i >= 0 && i < X.n)) return null;
    distFresh();
    if (DC.poi[i] !== undefined) return DC.poi[i];
    var r = distanceAt(X.lon[i], X.lat[i], { kelurahanId: m.ids.kel[X.kel[i]] || undefined, kecamatanId: m.ids.kec[X.kec[i]] || undefined });
    DC.poi[i] = r;
    return r;
  }
  /** lvmDist(id) → the distance of an LVM store from its point (its listing, its street, else its area; cached). */
  function lvmDist(id) {
    var L = MCD.lvm, l = L && L.locationOf ? safe(function () { return L.locationOf(id); }) : null;
    if (!l || !isNum(l.lon) || !isNum(l.lat)) return null;
    if (l.poi >= 0) return poiDist(l.poi);
    distFresh();
    var c = DC.lvm[id];
    if (c && c.lon === l.lon && c.lat === l.lat) return c.r;
    var mm = L.merchantMatch ? safe(function () { return L.merchantMatch(id); }) : null;
    var r = distanceAt(l.lon, l.lat, mm ? { kelurahanId: mm.kelurahanId || undefined, kecamatanId: mm.kecamatanId || undefined } : {});
    DC.lvm[id] = { lon: l.lon, lat: l.lat, r: r };
    return r;
  }
  function peakOn() { var D = MCD.distance; return !!(D && typeof D.peakOn === 'function' && safe(function () { return D.peakOn(); }, false)); }
  function noTollOn() { var D = MCD.distance; return !!(D && typeof D.noTollOn === 'function' && safe(function () { return D.noTollOn(); }, false)); }
  function minutesText(min) {
    var n = Math.max(1, Math.round(min));
    return '± ' + (n < 60 ? n + ' menit' : Math.floor(n / 60) + ' jam' + (n % 60 ? ' ' + (n % 60) + ' menit' : ''));
  }
  /** distText(r) → "4,2 km · ± 14 menit" (MCD.distance.format with the shared toggles), "—" without a value. */
  function distText(r) {
    if (!r || !isNum(r.km)) return '—';
    var D = MCD.distance;
    if (D && typeof D.format === 'function') {
      var s = safe(function () { return D.format(r, { peak: peakOn(), noToll: noTollOn() }); });
      if (typeof s === 'string' && s) return s;
    }
    var nt = noTollOn() && r.noToll && isNum(r.noToll.km) ? r.noToll : null, km = nt ? nt.km : r.km, min = nt ? nt.min : r.min, peak = peakOn() && isNum(min);
    var factor = isNum(r.minPeak) && isNum(r.min) && r.min > 0 ? r.minPeak / r.min : 1.3;
    return F().km(km) + (isNum(min) ? ' · ' + minutesText(peak ? min * factor : min) : '') + (peak ? ' (jam sibuk)' : '');
  }
  /** distTip(r) → the plain tooltip ("perkiraan, lalu lintas normal" and the source). */
  function distTip(r) {
    if (!r) return DIST_NONE_TIP;
    var D = MCD.distance;
    if (D && typeof D.tip === 'function') { var s = safe(function () { return D.tip(r); }); if (typeof s === 'string' && s) return s; }
    return r.source === 'garis' ? 'Jarak garis lurus dari KCP Jakarta Cilangkap. Waktu tempuh belum tersedia.' : DIST_TIP;
  }
  /** travelMin(r) → the sort key in minutes (the "Motor (tanpa tol)" route when that toggle is on); null last. The
      "Jam sibuk" factor multiplies every time alike, so it never changes the order. */
  function travelMin(r) {
    if (!r) return null;
    if (noTollOn() && r.noToll && isNum(r.noToll.min)) return r.noToll.min;
    if (isNum(r.min)) return r.min;
    return isNum(r.km) ? r.km * 2.5 : null;            // straight line only: about 24 km/h
  }
  /** nearestFirst(list, distFn) → a new array, nearest by travel time first; no value last; ties keep their order. */
  function nearestFirst(list, distFn) {
    var keyed = list.map(function (x, k) { return { x: x, v: travelMin(distFn(x)), k: k }; });
    keyed.sort(function (a, b) {
      if (a.v == null || b.v == null) return a.v == null ? (b.v == null ? a.k - b.k : 1) : -1;
      return a.v - b.v || a.k - b.k;
    });
    return keyed.map(function (o) { return o.x; });
  }

  /* ================================================================ view state */

  /* Filters (cats, status, kec, km) live in memory only, so a new session starts clean (plan B-03, D14).
     Only the map mode is remembered per browser. Locking reloads the page, which clears the memory. */
  var V = { mode: 'territory', cats: [], status: 'all', kec: null, km: 5, tier: 'all', rev: 0 };
  var listeners = [];
  /* The "Cakupan 5 km | 15 km" switch (MCD.inst.scope 'merchants', 21 Oct 2026): 5 km is V.km = 5, 15 km is V.km = null
     (the whole file). It moves the map and the list only; the cards and charts keep the whole 15 km. The other
     distances of the "Jarak" filter (1, 3, 10, 15 km) stay filters and leave the switch where it is. */
  var SCOPE_ID = 'merchants';
  function scopeApi() { var I = MCD.inst; return I && I.scope && typeof I.scope.get === 'function' && typeof I.scope.set === 'function' ? I.scope : null; }
  function scopeKm() { var A = scopeApi(), v = 5; if (A) { try { v = +A.get(SCOPE_ID, 5); } catch (e) { v = 5; } } return v === 15 ? 15 : 5; }
  function scopeView() { return scopeKm() === 5 ? 5 : null; }
  function syncScope() {
    var A = scopeApi();
    if (!A || (V.km !== 5 && V.km !== null)) return;
    try { A.set(SCOPE_ID, V.km === 5 ? 5 : 15); } catch (e) { /* the view still changes */ }
  }
  function cleanView(o, base) {
    var v = Object.assign({}, base);
    if (!o || typeof o !== 'object') return v;
    if (o.mode === 'territory' || o.mode === 'merchants') v.mode = o.mode;
    if (Array.isArray(o.cats)) { var c = o.cats.filter(function (x, k, a) { return CATS.indexOf(x) >= 0 && a.indexOf(x) === k; }); v.cats = c.length === CATS.length ? [] : c; }
    if (STATUS_FILTER.some(function (s) { return s.id === o.status; })) v.status = o.status;
    if (TIER_FILTER.some(function (s) { return s.id === o.tier; })) v.tier = o.tier;
    if (has(o, 'kec')) v.kec = typeof o.kec === 'string' && /^\d\d\.\d\d\.\d\d$/.test(o.kec) ? o.kec : null;
    if (has(o, 'km')) v.km = DIST.indexOf(+o.km) >= 0 ? +o.km : null;
    return v;
  }
  /* read once, on first use after unlock (nothing touches storage at load time); an older stored value that
     still carries cats / status / km / kec is cut back to {mode} on this first read */
  var viewLoaded = false;
  function loadView() {
    if (viewLoaded) return;
    viewLoaded = true;
    V.km = scopeView();
    var A = scopeApi();
    if (A && typeof A.on === 'function') {
      try {
        A.on(function (ev) {
          if (!ev || ev.section !== SCOPE_ID) return;
          setView({ km: ev.value === 5 ? 5 : null });
          if (MCD.map && typeof MCD.map.preset === 'function') { try { MCD.map.preset(ev.value === 5 ? '5' : 'sme15'); } catch (e) { /* the map keeps its view */ } }
        });
      } catch (e) { /* the filter still works */ }
    }
    var st = U() && U().storage, saved = st ? st.get(VIEW_KEY, null) : null;
    if (saved && typeof saved === 'object') {
      if (saved.mode === 'territory' || saved.mode === 'merchants') V.mode = saved.mode;
      var keys = Object.keys(saved);
      if (keys.length !== 1 || keys[0] !== 'mode') st.set(VIEW_KEY, { mode: V.mode });
    }
  }
  function view() { loadView(); return { mode: V.mode, cats: V.cats.slice(), status: V.status, kec: V.kec, km: V.km, tier: V.tier, rev: V.rev }; }
  /* v5 fixer: the mode to go back to while a temporary mode shows (the kecamatan card's points, item 43), else null.
     Memory only: the stored mode never holds a temporary one, so a section switch, a reload or a lock cannot leave
     the map in the point view that only one task asked for. */
  var MODE_BACK = null;
  function storeMode() { var st = U() && U().storage; if (st) st.set(VIEW_KEY, { mode: V.mode }); }
  function setView(patch, opts) {
    loadView();
    var next = cleanView(patch, V), changed = [], temp = !!(opts && opts.temporary);
    ['mode', 'status', 'kec', 'km', 'tier'].forEach(function (k) { if (next[k] !== V[k]) changed.push(k); });
    if (next.cats.join() !== V.cats.join()) changed.push('cats');
    if (!changed.length) return false;
    next.rev = V.rev + 1;
    var modeChanged = next.mode !== V.mode, before = V.mode;
    V = next;
    if (changed.indexOf('km') >= 0) syncScope();
    if (modeChanged) {
      if (temp) { if (MODE_BACK == null) MODE_BACK = before; if (MODE_BACK === V.mode) MODE_BACK = null; }
      else { MODE_BACK = null; storeMode(); }
    }
    listeners.slice().forEach(function (fn) { try { fn(view(), changed); } catch (e) { warn('view listener', e); } });
    requestMap();
    refreshPosture();
    return true;
  }
  /** tempMode() → the stored mode a temporary mode will go back to, or null when none shows. */
  function tempMode() { return MODE_BACK; }
  /** endTempMode() → back to the stored mode after a temporary one (true when the mode changed). */
  function endTempMode() {
    if (MODE_BACK == null) return false;
    var back = MODE_BACK;
    MODE_BACK = null;
    return setView({ mode: back });
  }
  /** keepMode() → the temporary mode becomes the stored one (staff chose that view, e.g. "Lihat semua di daftar"). */
  function keepMode() {
    if (MODE_BACK == null) return false;
    MODE_BACK = null;
    storeMode();
    return true;
  }
  /** Clears the filters; the distance goes back to the switch (5 km, or the whole 15 km). */
  function resetFilters() { loadView(); return setView({ cats: [], status: 'all', kec: null, km: scopeView(), tier: 'all' }); }
  /** Number of active filters (type counts as one), for "Filter (n)". 5 km is the switch, not a filter. */
  function filterCount() { loadView(); return (V.cats.length ? 1 : 0) + (V.kec ? 1 : 0) + (V.km && V.km !== 5 ? 1 : 0) + (V.status !== 'all' ? 1 : 0) + (V.tier !== 'all' ? 1 : 0); }
  /** tierShows(i) → whether listing row i passes the "Sasaran" filter (one row; loops use tierTest()). */
  function tierShows(i) {
    if (V.tier === 'all') return true;
    var t = tierOfRow(i);
    return !!t && (V.tier === 'edc' ? isEdcTier(t) : t === V.tier);
  }
  /** tierTest() → null without a "Sasaran" filter, else a test of row i that reads the candidate list once (the
      loops over 40.000 rows no longer rebuild the model key per row). */
  function tierTest() {
    if (V.tier === 'all') return null;
    var list = allCandidates(), pos = EC.pos, want = V.tier;
    return function (i) {
      var k = pos && i >= 0 && i < pos.length ? pos[i] : -1, t = k >= 0 ? list[k].tier : null;
      return !!t && (want === 'edc' ? isEdcTier(t) : t === want);
    };
  }
  /** The candidate list's key when a "Sasaran" filter is on (the tiers change with the data files), else ''. */
  function tierKey(m) { return V.tier === 'all' ? '' : ecKey(m); }
  function onView(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  /* ================================================================ model */

  var M = { R: null, cats: null, val: null, ver: 0, terrAll: null, terrR: null };
  function lvmResult() { return MCD.lvm && MCD.lvm.match ? safe(function () { return MCD.lvm.match(); }) : null; }

  /** Kecamatan and kelurahan ids of the matcher's area indexes (it keeps them as numbers). */
  function areaIds(R) {
    if (R.areaIds) return R.areaIds;
    var X = R.X, kec = {}, kel = {};
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i]) continue;
      var a = X.kec[i], b = X.kel[i];
      if ((a >= 0 && kec[a] == null) || (b >= 0 && kel[b] == null)) {
        var ps = MCD.lvm.poiStatus(i, R);
        if (ps) { if (a >= 0 && kec[a] == null) kec[a] = ps.kecamatanId; if (b >= 0 && kel[b] == null) kel[b] = ps.kelurahanId; }
      }
    }
    R.areaIds = { kec: kec, kel: kel };
    return R.areaIds;
  }
  function kecList(agg) {
    var A = W.MCD_ADMIN_AREAS, ks = T() ? T().kecamatan() : [], byName = {}, out = [];
    ks.forEach(function (k) { byName[k.name] = (byName[k.name] || 0) + 1; });
    ks.forEach(function (k) {
      var a = agg && agg.areas ? agg.areas[k.id] : null;
      out.push({ id: k.id, name: k.name, kota: k.kotaName, label: byName[k.name] > 1 ? k.name + ' (' + kotaShort(k.kotaName) + ')' : k.name,
        in15: k.in15, potential: k.potential, area: a, rec: A && A.byId ? A.byId(k.id) : null });
    });
    return out;
  }
  function kotaShort(k) { return String(k || '').replace(/^Kota Administrasi /, '').replace(/^Kota /, '').replace(/^Kabupaten /, 'Kab. '); }

  /** model() → the shared numbers for the map and the panels (rebuilt when the data or the type filter changes). */
  function model() {
    if (!pois()) return null;
    loadView();
    var R = lvmResult();
    if (!R || !R.X) return null;
    var catsKey = V.cats.join(',');
    if (M.val && M.R === R && M.cats === catsKey) return M.val;
    var agg = safe(function () { return MCD.lvm.aggregate('kecamatan'); });
    var t = T(), terrAll = null, terr = null;
    if (t) {
      if (M.terrR === R && M.terrAll) terrAll = M.terrAll;
      else { terrAll = safe(function () { return t.stats(MCD.lvm.territoryInput()); }); M.terrAll = terrAll; M.terrR = R; }
      terr = V.cats.length ? safe(function () { return t.stats(Object.assign({}, MCD.lvm.territoryInput(), { categories: V.cats })); }) : terrAll;
    }
    var kec = kecList(agg), byId = {};
    kec.forEach(function (k) { byId[k.id] = k; });
    M.ver++;
    M.R = R; M.cats = catsKey;
    M.val = { ver: M.ver, R: R, hasLvm: !!R.hasLvm, hasEdc: !!R.hasEdc, demo: !!R.demo, asOf: R.asOf, terr: terr, terrAll: terrAll, agg: agg,
      totals: agg ? agg.totals : null, bands: agg ? agg.bands : null, kec: kec, kecById: byId, ids: areaIds(R) };
    return M.val;
  }
  function kecName(id, withKota) {
    var m = M.val, k = m && m.kecById[id];
    if (k) return withKota ? k.name + ' (' + kotaShort(k.kota) + ')' : k.label;
    var A = W.MCD_ADMIN_AREAS, r = A && A.byId ? A.byId(id) : null;
    return r ? r.name : (id || '—');
  }
  function kelName(id) { var A = W.MCD_ADMIN_AREAS, r = id && A && A.byId ? A.byId(id) : null; return r ? r.name : '—'; }

  /** Status code of a public listing: 0 not a merchant, 1 potential, 2 belum ada di LVM, 3 acquired, 4 acquired but not active. */
  function code(R, i) { var s = R.pois.status[i]; return s === 3 ? (R.pois.active[i] === 0 ? 4 : 3) : s; }
  function poiInfo(i) {
    var m = model();
    if (!m || !(i >= 0 && i < m.R.X.n) || !m.R.X.ok[i]) return null;
    var R = m.R, X = R.X, c = code(R, i), ps = MCD.lvm.poiStatus(i, R) || {};
    var lvm = ps.merchantId && R.byId[ps.merchantId] ? (MCD.data.lvm || [])[R.byId[ps.merchantId].ix] : null;
    return { i: i, name: rowName(i), group: rowGroup(i), category: LCATS[X.cat[i]], km: X.dist[i], pos: [X.lon[i], X.lat[i]],
      code: c, status: c === 1 ? 'potential' : (c === 2 ? 'notYet' : (c === 4 ? 'inactive' : 'acquired')),
      kecamatanId: ps.kecamatanId, kelurahanId: ps.kelurahanId, score: ps.score, branchCode: ps.branchCode, ownBranch: ps.ownBranch,
      active: ps.active, edc: ps.edc, store: lvm };
  }
  function lvmStore(id) {
    var m = model();
    if (!m) return null;
    var x = m.R.byId[id];
    if (!x) return null;
    var rec = x.kind === 'lvm' ? (MCD.data.lvm || [])[x.ix] : (m.R.edcMerchants || [])[x.ix];
    var loc = MCD.lvm.locationOf(id);
    return { id: id, kind: x.kind, rec: rec || null, match: x, loc: loc };
  }

  /* ================================================================ highlight (a click, never a filter) */

  var UI = { hl: null, clusters: null };
  function highlight() { return UI.hl; }
  function setHighlight(id) {
    var v = typeof id === 'string' && /^\d\d\.\d\d\.\d\d$/.test(id) ? id : null;
    if (v === UI.hl) return false;
    UI.hl = v;
    requestMap();
    return true;
  }

  /* ================================================================ filtered points */

  var PT = { key: '', val: null };
  function catOn(c) { return !V.cats.length || V.cats.indexOf(c) >= 0; }
  function points(m) {
    var key = [m.ver, V.cats.join(), V.status, V.kec, V.km, V.tier, tierKey(m)].join('|');
    if (PT.key === key) return PT.val;
    var R = m.R, X = R.X, ids = m.ids.kec, list = [], codes = [], tt = tierTest();
    var want = V.status;
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i]) continue;
      var c = code(R, i);
      if (want === 'notYet' && c !== 2) continue;
      if (want === 'acquired' && c !== 3 && c !== 4) continue;
      if (want === 'inactive' && c !== 4) continue;
      if (!catOn(LCATS[X.cat[i]])) continue;
      if (V.kec && ids[X.kec[i]] !== V.kec) continue;
      if (V.km && X.dist[i] > V.km) continue;
      if (tt && !tt(i)) continue;
      list.push(i); codes.push(c);
    }
    var off = [];
    if (m.hasLvm && want !== 'notYet' && V.tier === 'all') {
      (MCD.lvm.offMap() || EMPTY).forEach(function (o) {
        if (o.kind !== 'lvm') return;
        if (want === 'inactive' && o.active !== false) return;
        if (!catOn(o.category)) return;
        if (V.kec && o.kecamatanId !== V.kec) return;
        if (V.km && kmFromCentre(o.lon, o.lat) > V.km) return;
        off.push(o);
      });
    }
    PT = { key: key, val: { idx: list, codes: codes, off: off } };
    return PT.val;
  }

  /* ================================================================ lead list */

  var LD = { key: '', val: null };
  /** Public merchants "Belum ada di LVM" (or, before the import, every public merchant), by priority:
      type weight × closeness to Mabes TNI (1,0 at the centre, 0,2 at 15 km). The filters (type, kecamatan,
      distance) apply; the status filter does not. */
  function leads() {
    var m = model();
    if (!m) return { idx: [], score: [], n: 0 };
    var key = [m.ver, V.cats.join(), V.kec, V.km, V.tier, tierKey(m)].join('|');
    if (LD.key === key) return LD.val;
    var R = m.R, X = R.X, ids = m.ids.kec, want = m.hasLvm ? 2 : 1, rows = [], tt = tierTest();
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i] || R.pois.status[i] !== want) continue;
      var c = LCATS[X.cat[i]];
      if (!catOn(c)) continue;
      if (V.kec && ids[X.kec[i]] !== V.kec) continue;
      if (V.km && X.dist[i] > V.km) continue;
      if (tt && !tt(i)) continue;
      rows.push({ i: i, s: priority(c, X.dist[i]), d: X.dist[i] });
    }
    rows.sort(function (a, b) { return b.s - a.s || a.d - b.d || a.i - b.i; });
    LD = { key: key, val: { idx: rows.map(function (r) { return r.i; }), score: rows.map(function (r) { return r.s; }), n: rows.length, potentialOnly: !m.hasLvm } };
    return LD.val;
  }
  function priority(cat, km) { return Math.round(100 * (CAT[cat] ? CAT[cat].weight : 0.6) * (1 - 0.8 * clamp(km / 15, 0, 1))); }
  /** leadsNear() → the same filtered list as leads(), nearest to KCP by travel time first ("Terdekat dari KCP", the
      default of the visit lists, item 27). Sorted only within the filtered set; cached per filter, data and route. */
  function leadsNear() {
    var L = leads();
    distFresh();
    var key = LD.key + '#' + DC.key + '#' + (noTollOn() ? 1 : 0);
    if (DC.near.key === key && DC.near.val) return DC.near.val;
    var at = {};
    L.idx.forEach(function (i, k) { at[i] = k; });
    var order = nearestFirst(L.idx, poiDist);
    var val = { idx: order, score: order.map(function (i) { return L.score[at[i]]; }), n: order.length, potentialOnly: L.potentialOnly, sort: 'near' };
    DC.near = { key: key, val: val };
    return val;
  }

  /** leadCounts() → {grocery, restaurant, other, all}: the merchants of the lead list per type with the kecamatan
      and distance filters applied (the type filter itself is ignored), so the type chips count what they would show. */
  var LCN = { key: '', val: null };
  function leadCounts() {
    var m = model();
    if (!m) return { grocery: 0, restaurant: 0, other: 0, all: 0 };
    var key = [m.R.key, m.hasLvm, V.kec, V.km, V.tier, m.ver, tierKey(m)].join('|');
    if (LCN.key === key && LCN.R === m.R) return LCN.val;
    var R = m.R, X = R.X, ids = m.ids.kec, want = m.hasLvm ? 2 : 1, out = { grocery: 0, restaurant: 0, other: 0, all: 0 }, tt = tierTest();
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i] || R.pois.status[i] !== want) continue;
      if (V.kec && ids[X.kec[i]] !== V.kec) continue;
      if (V.km && X.dist[i] > V.km) continue;
      if (tt && !tt(i)) continue;
      out[LCATS[X.cat[i]]]++; out.all++;
    }
    LCN = { key: key, R: m.R, val: out };
    return out;
  }

  function leadsCsv(list) {
    var m = model(), fm = F(), csv = U().csv, X = m.R.X, ids = m.ids;
    var head = ['peringkat', 'nama_merchant', 'jenis', 'jenis_usaha', 'jarak_dari_mabes_tni_km', 'kecamatan', 'kota', 'kelurahan', 'status', 'sasaran', 'prioritas', 'lat', 'lon', 'sumber',
      'jarak_dari_kcp_km', 'menit_dari_kcp'];
    var stamp = fm.dateTime ? fm.dateTime(new Date()) : new Date().toISOString();
    var lines = ['# Daftar kerja internal Bank Mandiri. Merchant di peta publik dalam 15 km dari Mabes TNI, dibuat ' + stamp +
      '. Nama perorangan disamarkan.', csv.row(head)];
    var status = list.potentialOnly ? 'Potensi (file LVM belum diimpor)' : 'Belum ada di LVM (kemungkinan besar belum diakuisisi)';
    list.idx.forEach(function (i, r) {
      var kid = ids.kec[X.kec[i]], k = m.kecById[kid], g = rowGroup(i);
      var tr = tierOfRow(i);
      lines.push(csv.row([r + 1, maskName(rowName(i), 'masked', true), CAT[LCATS[X.cat[i]]].short, GROUP_LABEL[g] || '',
        X.dist[i].toFixed(2), k ? k.name : '', k ? k.kota : '', kelName(ids.kel[X.kel[i]]), status, tr && TIERS[tr] ? TIERS[tr].label : '', list.score[r],
        X.lat[i].toFixed(5), X.lon[i].toFixed(5), SRC_POI + ' ' + release()].concat(csvDist(poiDist(i)))));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }
  /** [km, minutes] of a distance for the CSV (perkiraan, lalu lintas normal; empty without a value). */
  function csvDist(r) { return r && isNum(r.km) ? [r.km.toFixed(2), isNum(r.min) ? String(Math.round(r.min)) : ''] : ['', '']; }
  function download(text, filename, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.hidden = true;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
  }

  /* ================================================================ re-activation */

  /** LVM merchants within 15 km that are not active this month (the report's status, the USAK definition).
      opts.own: only KCP Jakarta Cilangkap (12903). The type and kecamatan filters apply. */
  function inactive(opts) {
    var m = model();
    if (!m || !m.hasLvm) return null;
    opts = opts || {};
    var rows = MCD.data.lvm || [], items = [], byKec = {}, zero = 0, ownAll = 0, ownActive = 0;
    m.R.merchants.forEach(function (x) {
      if (!x.inFocus) return;
      if (x.branchCode === HOME) { ownAll++; if (x.active === true) ownActive++; }
      if (x.active !== false) return;
      if (opts.own && x.branchCode !== HOME) return;
      if (!catOn(x.category)) return;
      if (V.kec && x.kecamatanId !== V.kec) return;
      var rec = rows[x.ix] || {};
      if (rec.freqMtd === 0) zero++;
      items.push({ id: x.id, ix: x.ix, kec: x.kecamatanId, kel: x.kelurahanId, category: x.category, listed: x.poi >= 0, branchCode: x.branchCode,
        name: rec.name || '', freq: isNum(rec.freqMtd) ? rec.freqMtd : null, created: rec.createdDate || null, branchName: rec.branchName || null });
      if (x.kecamatanId) byKec[x.kecamatanId] = (byKec[x.kecamatanId] || 0) + 1;
    });
    items.sort(function (a, b) { return (byKec[b.kec] || 0) - (byKec[a.kec] || 0) || String(b.created || '').localeCompare(String(a.created || '')) || a.ix - b.ix; });
    var kecs = Object.keys(byKec).map(function (id) { return { id: id, n: byKec[id] }; }).sort(function (a, b) { return b.n - a.n; });
    return { items: items, n: items.length, zero: zero, byKec: kecs, ownAll: ownAll, ownActive: ownActive };
  }
  /** inactiveCsv(x, mode) → CSV of the re-activation list. Store names follow the masking state (plan B-10):
      masked unless the user chose "Tampilkan nama"; no owner data exists in the records. */
  function inactiveCsv(x, mode) {
    var fm = F(), csv = U().csv;
    var head = ['nama_toko', 'kecamatan', 'kelurahan', 'terdaftar', 'transaksi_bulan_ini', 'kode_cabang', 'ada_di_peta_publik'];
    var stamp = fm.dateTime ? fm.dateTime(new Date()) : new Date().toISOString();
    var lines = ['# Daftar kerja internal Bank Mandiri. Toko LVM dalam 15 km yang tidak aktif bulan ini, dibuat ' + stamp + '. ' +
      (mode === 'reveal' ? 'Nama toko ditampilkan atas pilihan pengguna.' : 'Nama toko disamarkan.'), csv.row(head)];
    ((x && x.items) || []).forEach(function (it) {
      lines.push(csv.row([storeName(it.name, mode === 'reveal' ? 'reveal' : 'masked'), it.kec ? kecName(it.kec) : '', kelName(it.kel),
        it.created || '', it.freq == null ? '' : it.freq, it.branchCode || '', it.listed ? 'ya' : 'tidak']));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  /* ================================================================ EDC and KPIs */

  function edc() {
    var m = model();
    if (!m || !m.hasEdc) return null;
    var byKec = {}, T0 = { merchants: 0, active: 0, matched: 0, inFocus: 0, terminals: 0, activeTerminals: 0 };
    (MCD.data.edc || []).forEach(function (r) { T0.terminals++; if (r && r.status === 'active') T0.activeTerminals++; });
    m.R.edc.forEach(function (x) {
      T0.merchants++;
      if (x.active === true) T0.active++;
      if (x.poi >= 0) T0.matched++;
      if (!x.inFocus || !x.kecamatanId) return;
      T0.inFocus++;
      var e = byKec[x.kecamatanId] || (byKec[x.kecamatanId] = { id: x.kecamatanId, installed: 0, active: 0 });
      e.installed++;
      if (x.active === true) e.active++;
    });
    var list = Object.keys(byKec).map(function (k) { return byKec[k]; }).sort(function (a, b) { return b.installed - a.installed; });
    return { totals: T0, byKec: list, demo: m.demo };
  }
  function kpi() {
    var rows = (MCD.data && MCD.data.lvm_kpi) || [];
    if (!rows.length) return null;
    var list = rows.filter(function (r) { return r && !r.isTotal; });
    var home = list.filter(function (r) { return r.home || r.code === HOME; })[0] || null;
    var meta0 = (MCD.data.meta && MCD.data.meta.lvm_kpi) || {};
    return { rows: list, home: home, asOf: (home && home.asOf) || meta0.asOf || null, demo: meta0.source === 'demo', file: meta0.file || null };
  }

  /* Opt-in demo only (COPY_STYLE_EN item 7): branch KPIs consistent with the demo stores of 12903, other
     branches are named "Cabang contoh …". Never used for real data. */
  function demoKpi() {
    var lvm = (MCD.data && MCD.data.lvm) || [], ureg = 0, usak = 0;
    lvm.forEach(function (r) { if (r && r.branchCode === HOME) { ureg++; if (r.status === 'active') usak++; } });
    var rnd = U() && U().prng ? U().prng(20261015) : Math.random, asOf = (MCD.data.meta && MCD.data.meta.lvm && MCD.data.meta.lvm.asOf) || null;
    var rows = [{ code: HOME, name: 'KCP Jakarta Cilangkap', home: true, isTotal: false, ureg: ureg, uregTarget: Math.round(ureg / 1.06), usak: usak, usakTarget: Math.round(usak / 0.96) }];
    for (var k = 1; k <= 12; k++) {
      var u = Math.round(500 + rnd() * 1500), a = Math.round(u * (0.22 + rnd() * 0.2));
      rows.push({ code: 'D' + (k < 10 ? '0' : '') + k, name: 'Cabang contoh ' + String.fromCharCode(64 + k), home: false, isTotal: false,
        ureg: u, uregTarget: Math.round(u / (0.82 + rnd() * 0.36)), usak: a, usakTarget: Math.round(a / (0.8 + rnd() * 0.4)) });
    }
    return rows.map(function (r) {
      r.uregPct = r.uregTarget ? r.ureg / r.uregTarget : null; r.usakPct = r.usakTarget ? r.usak / r.usakTarget : null;
      r.asOf = asOf; r._demo = true;
      return r;
    });
  }

  /* ================================================================ Sasaran EDC / LVM: three factors (item 37) */

  /*
   * Why a merchant is "Sasaran EDC" (COPY_STYLE_EN item 37, refining items 32 and 35). What the bank earns from an EDC
   * follows the card volume per month ≈ buyers (keramaian) × average payment (nilai belanja) × share paid by card (daya
   * beli area). The three multiply, so one weak factor keeps the volume small. Every factor is computed offline per
   * public listing, from open data only (Google ratings are never downloaded or stored), and shown as a level with one
   * plain reason, never as a bare score:
   *   NILAI BELANJA  kecil | sedang | besar: the ticket class of the business category (MCD_SME_EXTRA, docs/EDC_SCORE.md
   *                  §2; class 0-1 kecil, 2 sedang, 3 besar); the reason names the category ("toko furnitur").
   *   KERAMAIAN      rendah | sedang | tinggi: points from open signals (CROWD_PTS): brand or chain 2, several sources 1,
   *                  website and telephone 1 (website alone 0,5), Overture confidence 0,9 or more 0,5, a busy business
   *                  strip (22 or more public listings within 100 m 1,5; 11 or more 0,75), near a market, mall, campus or
   *                  a research cluster of data/sme-clusters.js 1, on a main road 1 (only when a data file carries that
   *                  bit); tinggi from 2,5 points, sedang from 1. The reason names the strongest signal. Without the
   *                  signals file (data/sme-pois-extra.js) a confidence of 0,9 or more counts 1 and a known chain name 2.
   *   DAYA BELI AREA rendah | sedang | tinggi: MCD_AREA_WEALTH of the listing's kelurahan (else its kecamatan), with
   *                  its own reason ("banyak perumahan"). Without that file the level is unknown and counts as sedang.
   * Tiers (ids of the v4 contract; labels of item 35):
   *   'edc'      "Sasaran EDC"  nilai belanja besar with keramaian at least sedang and daya beli at least sedang, or
   *                             nilai belanja sedang with keramaian tinggi and daya beli at least sedang;
   *   'lvm'      "Sasaran LVM"  every other merchant (QRIS through Livin' Merchant fits any size);
   *   'naik-edc' "Naik ke EDC"  already on LVM and qualifying for EDC (upsell);
   *   'nasional' "Jaringan nasional (lewat kantor pusat)" (COPY_STYLE_EN item 42, v5): a national chain (sig bit 32) that
   *                             is not on LVM, whatever its three factors say (NASIONAL_ALL; false keeps only the chains
   *                             that would otherwise be Sasaran EDC). Head office usually signs their payment terminals, so
   *                             they stay visible but are no branch target: not in Sasaran EDC, Sasaran LVM or the share.
   *                             A chain already on LVM keeps "Sudah diakuisisi" and gets no tier (no "Naik ke EDC").
   * Merchants with an EDC Mandiri in the EDC file are left out, and so is every listing that is not a merchant
   * (MCD.lvm.nonMerchant: schools, worship, government, parks, cemeteries, golf, halls, banks, estates, whole markets).
   * Order (deterministic, ties by row): the EDC tiers, then Sasaran LVM, then Jaringan nasional; inside a tier EDC tiers
   * 100 × ticket weight × (0,5 + crowd) × (0,5 + daya beli) ÷ (1 + km from KCP ÷ 8); LVM 100 × QRIS fit (walk-in groups 1,
   * offices and B2B 0,4) × (0,5 + crowd) ÷ (1 + km ÷ 8); a national chain (sig bit 32) scores half, because such outlets
   * usually sign with banks at head office.
   */
  var TICKET_LEVELS = ['kecil', 'sedang', 'besar'];
  var TICKET_LEVEL_OF = [0, 0, 1, 2];                          // ticket class 0-3 → level
  var TICKET_WORDS = ['Kecil', 'Kecil', 'Sedang', 'Besar'];     // per class, for the list column
  var LEVEL3 = ['rendah', 'sedang', 'tinggi'];
  var TICKET_W = [0.2, 0.35, 0.7, 1];                          // EDC order: weight per ticket class
  /* LVM order: how well QRIS on the phone fits, by Overture group (walk-in buyers first; offices, B2B and courses later) */
  var QRIS_FIT_GROUP = [1, 1, 0.9, 0.9, 0.6, 1, 0.8, 0.5, 0.6, 0.4, 0.8, 0.5];
  var RX_B2B_CAT = /^(freight|home_developer|real_estate|corporate_or_business_office|professional_service|manufacturer|contractor|building_or_construction|industrial|b2b|party_and_event|commercial_|engineering|advertising|marketing|information_technology|software|telecommunications|attorney|legal|insurance|employment)|_company$|_manufacturer$|_service$/;
  function qrisFit(i) { var g = rowGroup(i), c = catName(i), f = QRIS_FIT_GROUP[g] != null ? QRIS_FIT_GROUP[g] : 0.5; return c && RX_B2B_CAT.test(c) ? Math.min(f, 0.4) : f; }
  var TICKET_WEIGHT = [0.5, 1, 1.5, 2];                        // the Google re-rank: reviews × this weight
  var TICKET_GROUP = [1, 1, 2, 2, 1, 2, 3, 1, 2, 1, 3, 1];     // Overture groups 0-11 (meta.groups), without the extra file
  var EDC_RULE = { crowdTinggi: 2.5, crowdSedang: 1, dense: 22, denseSome: 11, denseKm: 0.1 };
  var CROWD_PTS = { chain: 2, multi: 1, webPhone: 1, web: 0.5, conf: 0.5, confAlone: 1, dense: 1.5, denseSome: 0.75, anchor: 1, mainRoad: 1 };
  var BUSY_MIN = EDC_RULE.crowdTinggi / 4, BIG_MIN = 3;        // busyOf().b ≥ BUSY_MIN ⇔ keramaian tinggi
  var RULE_ID = 'tiga-faktor';
  var EDC_RULES = { 'tiga-faktor': 'Sasaran EDC: nilai belanja besar, keramaian dan daya beli minimal sedang. ' +
    'Atau nilai belanja sedang, keramaian tinggi dan daya beli minimal sedang.' };
  /** v3 kept a 'luas' / 'ketat' switch; item 37 replaces both with one rule (edcRule() is always 'tiga-faktor'). */
  function edcRule() { return RULE_ID; }
  function setEdcRule() { return false; }
  var RX_SMALL = /\b(warung|warteg|kedai|angkringan|gorengan|bakso|mie ayam|mi ayam|pecel|nasi uduk|soto|sate|seblak|cilok|lapak|kios|kelontong|pulsa|tambal ban|pangkas rambut|cukur)\b/i;
  var RX_BIG = /\b(restoran|restaurant|resto|rumah makan|cafe|café|coffee|steak|sushi|seafood|grill|bbq|shabu|hotpot|minimarket|supermarket|swalayan|alfamart|alfamidi|indomaret|elektronik|electronic|furniture|mebel|meubel|ponsel|handphone|komputer|laptop|perhiasan|optik|apotek|apotik|klinik|clinic|salon|spa)\b/i;
  var RX_HUGE = /\b(hotel|rumah sakit|hospital|dealer|showroom|superindo|hypermart|transmart|lotte|bahan bangunan|material)\b/i;
  var RX_CHAIN = /\b(alfamart|alfamidi|indomaret|superindo|hypermart|transmart|lotte|giant|hero|kfc|mcdonald'?s?|pizza hut|starbucks|hokben|solaria|chatime|guardian|watsons|kimia farma|century|k-?24|janji jiwa|kopi kenangan|mixue|richeese|ace hardware|informa|erafone|planet ban|ahass|auto ?2000)\b/i;
  /* tier ids of the v4 contract; the labels of item 35. 'edc+lvm' (v3) stays readable as a hidden alias. */
  var TIERS = {
    edc: { id: 'edc', sasaran: 'edc', label: 'Sasaran EDC', short: 'Sasaran EDC', title: 'Usaha menengah atau besar. Tawarkan EDC Mandiri untuk pembayaran kartu. EDC juga menerima QRIS.' },
    'naik-edc': { id: 'naik-edc', sasaran: 'edc', label: 'Naik ke EDC', short: 'Naik ke EDC', title: 'Telah terdaftar di Livin’ Merchant dan termasuk usaha menengah atau besar. Tawarkan EDC Mandiri.' },
    lvm: { id: 'lvm', sasaran: 'lvm', label: 'Sasaran LVM', short: 'Sasaran LVM', title: 'Usaha kecil atau mikro. Tawarkan Livin’ Merchant untuk QRIS di HP.' },
    /* item 42 (v5): the user's own label; "lewat" stays as the accepted exception of the wording rules */
    nasional: { id: 'nasional', sasaran: 'pusat', label: 'Jaringan nasional (lewat kantor pusat)', short: 'Jaringan nasional',
      title: 'Jaringan nasional biasanya bekerja sama dengan bank di kantor pusat. Tetap tampil, tetapi tidak dihitung sebagai sasaran cabang.' }
  };
  Object.defineProperty(TIERS, 'edc+lvm', { value: TIERS.edc, enumerable: false });
  var TIER_ALIAS = { 'edc+lvm': 'edc', 'sasaran-edc': 'edc', 'sasaran-lvm': 'lvm', 'naik': 'naik-edc', 'jaringan-nasional': 'nasional', 'pusat': 'nasional' };
  function tierId(t) { return has(TIERS, t) && t !== 'edc+lvm' ? t : (TIER_ALIAS[t] || null); }
  /* item 42 scope (docs/EDC_SCORE.md §7): true = every national chain that is not on LVM is "Jaringan nasional"; false =
     only the chains that would otherwise be Sasaran EDC (the others stay Sasaran LVM). The coordinator records the choice. */
  var NASIONAL_ALL = true;
  /** tierOf(qualifies, onLvm, largeChain) → 'edc' | 'naik-edc' | 'lvm' | 'nasional' | null: the one tier rule (items 37, 42). */
  function tierOf(qualifies, onLvm, largeChain) {
    if (largeChain) return onLvm ? null : (NASIONAL_ALL || qualifies ? 'nasional' : 'lvm');
    return onLvm ? (qualifies ? 'naik-edc' : null) : (qualifies ? 'edc' : 'lvm');
  }
  function isEdcTier(t) { return t === 'edc' || t === 'naik-edc'; }

  var XF = { file: null, pois: null, ok: false };
  /** MCD_SME_EXTRA when it belongs to this listing file (same length; the file's own alignment check when present). */
  function extraFile() {
    var E = W.MCD_SME_EXTRA, P = pois();
    if (!E || !P || !E.cat || !E.ticketOfCat || !E.sig || E.cat.length !== P.rows.length) return null;
    if (XF.file !== E || XF.pois !== P) {
      XF.file = E; XF.pois = P;
      XF.ok = typeof E.alignedWith === 'function' ? !!safe(function () { return E.alignedWith(P); }, false) : true;
    }
    return XF.ok ? E : null;
  }
  function catName(i) { var E = extraFile(), c = E ? E.cat[i] : -1; return c >= 0 && E.catNames ? String(E.catNames[c] || '') : null; }
  /** ticketOf(i) → {cls: 0-3, src: 'kategori' | 'kelompok'}: the ticket-size class of public listing row i. */
  function ticketOf(i) {
    var E = extraFile(), g = rowGroup(i);
    if (E) {
      var c = E.cat[i], v = typeof E.ticketOf === 'function' ? safe(function () { return E.ticketOf(i, g); }) : (c >= 0 ? E.ticketOfCat[c] : null);
      if (isNum(v)) return { cls: clamp(Math.round(v), 0, 3), src: c >= 0 ? 'kategori' : 'kelompok' };
    }
    var cls = g >= 0 && g < TICKET_GROUP.length ? TICKET_GROUP[g] : 1, n = rowName(i);
    if (RX_HUGE.test(n)) cls = 3;
    else if (RX_BIG.test(n)) cls = Math.max(cls, 2);
    else if (RX_SMALL.test(n)) cls = 0;
    return { cls: cls, src: 'kelompok' };
  }

  /* ---------------------------------------------------------------- nilai belanja: the category in plain words */

  var CAT_ID = {
    'nama:warung_kaki_lima': 'warung atau pedagang kaki lima', 'nama:minimarket': 'minimarket', 'nama:supermarket': 'supermarket',
    'nama:toko_bangunan': 'toko bangunan', 'nama:optik': 'optik', 'nama:apotek': 'apotek', 'kelompok:bank': 'kantor bank',
    restaurant: 'restoran', indonesian_restaurant: 'rumah makan', diner: 'rumah makan', coffee_shop: 'kedai kopi', cafe: 'kafe', bakery: 'toko roti',
    fast_food_restaurant: 'restoran cepat saji', chicken_restaurant: 'restoran ayam', japanese_restaurant: 'restoran Jepang', chinese_restaurant: 'restoran Tionghoa',
    korean_restaurant: 'restoran Korea', seafood_restaurant: 'restoran seafood', steakhouse: 'restoran steak', pizza_restaurant: 'restoran pizza',
    ramen_restaurant: 'restoran ramen', sushi_restaurant: 'restoran sushi', bar: 'bar', lounge: 'lounge', food_truck_stand: 'gerobak makanan', caterer: 'katering',
    food_and_drink: 'usaha makanan dan minuman', dessert_shop: 'toko makanan penutup', ice_cream_shop: 'kedai es krim', bubble_tea_shop: 'kedai minuman',
    convenience_store: 'minimarket', grocery_store: 'toko kelontong', department_store: 'toserba', warehouse_club_store: 'toko grosir besar',
    superstore: 'pasar swalayan besar', shopping_mall: 'toko di pusat belanja', shopping: 'toko', organic_grocery_store: 'toko bahan makanan organik',
    hospital: 'rumah sakit', health_care: 'klinik', outpatient_care_facility: 'klinik rawat jalan', dental_clinic: 'klinik gigi', doctors_office: 'praktik dokter',
    laboratory_testing: 'laboratorium klinik', pharmacy: 'apotek', drugstore: 'apotek', veterinarian: 'dokter hewan', physical_therapy: 'fisioterapi',
    maternity_center: 'klinik bersalin', medical_service_organization: 'layanan kesehatan', skin_care_and_makeup: 'klinik kecantikan',
    hotel: 'hotel', lodging: 'penginapan', resort: 'resor', cottage: 'vila', service_apartment: 'apartemen sewa', lodge: 'penginapan',
    auto_dealer: 'dealer mobil', used_auto_dealer: 'dealer mobil bekas', motorcycle_dealer: 'dealer motor', truck_dealer: 'dealer truk', auto_company: 'perusahaan otomotif',
    automotive_repair: 'bengkel mobil', automotive_service: 'jasa otomotif', auto_detailing: 'salon mobil', auto_parts_store: 'toko suku cadang',
    tire_dealer_and_repair: 'toko ban', motorcycle_repair: 'bengkel motor', car_wash: 'cuci mobil', car_rental_service: 'rental mobil', gas_station: 'SPBU',
    auto_body_shop: 'bengkel bodi mobil', oil_change_station: 'ganti oli',
    furniture_store: 'toko furnitur', mattress_store: 'toko kasur', home_improvement_store: 'toko perlengkapan rumah', home_goods_store: 'toko perabot',
    building_supply_store: 'toko bahan bangunan', hardware_store: 'toko perkakas', carpet_store: 'toko karpet', paint_store: 'toko cat', lumber_store: 'toko kayu',
    electronics_store: 'toko elektronik', mobile_phone_store: 'toko HP', computer_store: 'toko komputer', appliance_store: 'toko alat rumah tangga',
    camera_and_photography_store: 'toko kamera', audio_visual_equipment_store: 'toko audio video', jewelry_store: 'toko perhiasan', watch_store: 'toko jam',
    clothing_store: 'toko pakaian', fashion_and_apparel_store: 'toko pakaian', fashion_boutique: 'butik', shoe_store: 'toko sepatu', bridal_shop: 'toko pengantin',
    cosmetics_and_fragrance_store: 'toko kosmetik', beauty_supply_store: 'toko perlengkapan kecantikan', eyewear_store: 'optik', bookstore: 'toko buku',
    sporting_goods_store: 'toko olahraga', bike_store: 'toko sepeda', toy_store: 'toko mainan', musical_instrument_store: 'toko alat musik',
    beauty_salon: 'salon kecantikan', hair_salon: 'salon rambut', barber: 'pangkas rambut', spa: 'spa', nail_salon: 'salon kuku', gym: 'pusat kebugaran',
    yoga_studio: 'studio yoga', pilates_studio: 'studio pilates', karaoke_venue: 'karaoke', movie_theater: 'bioskop', amusement_park: 'taman hiburan',
    water_park: 'taman air', travel_service: 'agen perjalanan', travel_company: 'agen perjalanan', travel_agent: 'agen perjalanan', tour_operator: 'agen wisata',
    laundromat: 'laundry', printing_service: 'percetakan', professional_service: 'jasa profesional', real_estate_service: 'jasa properti',
    home_developer: 'pengembang perumahan', freight_and_cargo_service: 'jasa kirim barang', party_and_event_planning: 'jasa acara', contractor: 'kontraktor',
    manufacturer: 'pabrik', corporate_or_business_office: 'kantor perusahaan', interior_design: 'desain interior', education: 'lembaga pendidikan',
    educational_service: 'lembaga kursus', language_school: 'kursus bahasa', music_school: 'kursus musik', pet_store: 'toko hewan peliharaan',
    flowers_and_gifts_store: 'toko bunga dan hadiah', arts_and_entertainment: 'tempat hiburan', music_venue: 'tempat hiburan musik',
    swimming_pool: 'kolam renang', sports_and_recreation: 'tempat olahraga'
  };
  var CAT_RX = [[/_restaurant$/, 'restoran'], [/_dealer$/, 'dealer'], [/clinic|dentistry|_care$|medicine|surgery|dermatology|orthodont|gynecology|pediatric/, 'klinik'],
    [/_repair$|_service_and_repair$/, 'jasa perbaikan'], [/_store$|_shop$/, 'toko'], [/_salon$|beauty/, 'salon'], [/_school$|tutoring/, 'kursus'],
    [/manufacturer|company$/, 'perusahaan'], [/_service$/, 'jasa']];
  var GROUP_WORDS = ['usaha makanan dan minuman', 'toko', 'usaha otomotif', 'usaha kesehatan', 'lembaga pendidikan', 'usaha kecantikan', 'usaha bahan bangunan',
    'pabrik atau bengkel kerja', 'grosir', 'kantor atau jasa', 'hotel atau perjalanan', 'usaha lain'];
  /** catWords(i) → the business category in plain Indonesian ("toko furnitur"), the reason of nilai belanja. */
  function catWords(i) {
    var c = catName(i);
    if (c) {
      if (has(CAT_ID, c)) return CAT_ID[c];
      for (var k = 0; k < CAT_RX.length; k++) if (CAT_RX[k][0].test(c)) return CAT_RX[k][1];
    }
    var n = rowName(i);
    if (RX_SMALL.test(n)) return 'warung atau kios';
    var g = rowGroup(i);
    return GROUP_WORDS[g] || 'usaha lain';
  }

  /* ---------------------------------------------------------------- keramaian: open signals, computed once per file */

  var ANCHOR_WORDS = ['', 'di dalam atau dekat mal', 'dekat pasar', 'dekat kampus', 'di sentra kuliner', 'dekat kampus dan rumah sakit',
    'di koridor usaha yang ramai', 'di sentra otomotif', 'dekat pusat belanja'];
  /* research clusters of data/sme-clusters.js that bring buyers: [anchor code, radius km] per type */
  var CLUSTER_ANCHOR = { pasar: [2, 0.4], mall_retail: [8, 0.5], food_culinary: [4, 0.6], education_health: [5, 0.6], commercial_corridor: [6, 0.6], automotive: [7, 0.5] };
  var MALL_CAT = { shopping_mall: 1, department_store: 1, superstore: 1, warehouse_club_store: 1 };
  var MARKET_CAT = { public_market: 1, farmers_market: 1, flea_market: 1, night_market: 1 };
  var CW = { key: '', dens: null, anc: null, roadBit: 0 };
  function clustersFile() { var C = W.MCD_SME_CLUSTERS; return C && Array.isArray(C.clusters) ? C : null; }
  function crowdKey() { var P = pois(), E = extraFile(), C = clustersFile(); return [P ? P.rows.length : 0, E ? 'x' + E.cat.length : '-', C ? C.clusters.length : 0, lvmRuleKey()].join('|'); }
  function lvmRuleKey() { var R = lvmResult(); return R && R.X ? R.X.sig : ''; }
  /** {dens: listings within 100 m per row, anc: anchor code per row}: one pass over the public file (about 60 ms). */
  function crowdBase() {
    var key = crowdKey();
    if (CW.key === key && CW.dens) return CW;
    var P = pois(), E = extraFile(), rows = P ? P.rows : EMPTY, n = rows.length, c = center();
    var KX = 111.32 * Math.cos(c[1] * D2R), KY = 110.57, CELL = EDC_RULE.denseKm, grid = new Map();
    var dens = new Uint16Array(n), anc = new Uint8Array(n);
    function cellKey(x, y) { return Math.floor(x / CELL) + ':' + Math.floor(y / CELL); }
    for (var i = 0; i < n; i++) {
      var r = rows[i];
      if (!r || (r[2] | 0) > 11 || !isNum(r[0]) || !isNum(r[1])) continue;
      var k0 = cellKey(r[0] * KX, r[1] * KY), l = grid.get(k0);
      if (l) l.push(i); else grid.set(k0, [i]);
    }
    /* each point: the scan of the cells within `km`, calling fn(j) for every listing j within that distance */
    function around(lon, lat, km, fn) {
      var x = lon * KX, y = lat * KY, gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), R = Math.ceil(km / CELL), km2 = km * km;
      for (var a = -R; a <= R; a++) for (var b = -R; b <= R; b++) {
        var l2 = grid.get((gx + a) + ':' + (gy + b));
        if (!l2) continue;
        for (var q = 0; q < l2.length; q++) {
          var s = rows[l2[q]], dx = s[0] * KX - x, dy = s[1] * KY - y;
          if (dx * dx + dy * dy <= km2) fn(l2[q]);
        }
      }
    }
    grid.forEach(function (list) {
      list.forEach(function (i2) { var cnt = -1; around(rows[i2][0], rows[i2][1], CELL, function () { cnt++; }); dens[i2] = Math.min(65535, cnt); });
    });
    /* anchors: malls and markets of the public file (named or by category), campuses, then the research clusters */
    var L = MCD.lvm, anchors = [];
    for (var j = 0; j < n; j++) {
      var rj = rows[j];
      if (!rj || (rj[2] | 0) > 11) continue;
      var cn = E && E.cat[j] >= 0 ? String(E.catNames[E.cat[j]] || '') : '', nm = String(rj[3] || '').toLowerCase();
      var nmo = L && L.nonMerchant ? safe(function () { return L.nonMerchant(j); }) : null;
      if (MARKET_CAT[cn] || (nmo && nmo.why === 'kawasan' && /^(pasar|ps)\b/.test(nm))) anchors.push([2, rj[0], rj[1], 0.2]);
      else if (MALL_CAT[cn] || (nmo && nmo.why === 'kawasan')) anchors.push([1, rj[0], rj[1], 0.15]);
      else if (cn === 'college_university' && /\b(universitas|university|institut|politeknik|akademi|sekolah tinggi|kampus|stie|stikes|stmik)\b/.test(nm)) anchors.push([3, rj[0], rj[1], 0.2]);
    }
    var C = clustersFile();
    (C ? C.clusters : EMPTY).forEach(function (cl) {
      var a = cl && CLUSTER_ANCHOR[cl.type];
      if (a && isNum(cl.lon) && isNum(cl.lat)) anchors.push([a[0], cl.lon, cl.lat, a[1]]);
    });
    /* the first anchor that reaches a listing names its reason (fixed order: mal, pasar, kampus, clusters) */
    anchors.forEach(function (a) { around(a[1], a[2], a[3], function (j2) { if (!anc[j2]) anc[j2] = a[0]; }); });
    var bits = E && E.meta && E.meta.sigBits, roadBit = 0;
    if (bits) Object.keys(bits).forEach(function (b) { if (/^(main[_ ]?road|jalan[_ ]?utama)$/i.test(String(bits[b]))) roadBit = +b; });
    CW = { key: key, dens: dens, anc: anc, roadBit: roadBit, anchors: anchors.length };
    return CW;
  }
  /* v5 fixer (item 42; MERCHANT finding "who counts as a national chain depends on word order"): the data file's bit 32
     comes from brands that must START the name (tools/build-sme-extra.py KNOWN_CHAIN_RE), so "Kalibata XXI" and
     "Rumah Sakit Hermina Depok" stayed Sasaran EDC while "Hermina …" was a national chain. Two corrections at run time:
     - BRAND_ANY: brands whose outlets are named "<place> <brand>" or "<type> <brand> <place>" count anywhere in the name,
       but only with a category (or a type word) of that brand's business, so a tenant named after the store it sits in
       ("… Gramedia Metropolitan Mall", "Relx Store Superindo …") stays local; parking, buildings and offices never count;
     - SHORT_BRAND: a short brand token at the start counts only with the brand's own business ("BP Lawyers" is a law
       firm, not the fuel brand BP).
     Vehicle brands are left as the file has them: whether brand dealers and franchisees belong to "lewat kantor pusat" is
     the coordinator's decision (docs/EDC_SCORE.md §7.5). */
  var BRAND_ANY = [
    [/\b(xxi|cgv|cinepolis)\b/, /movie|theat|cinema|drive_in/, /\b(bioskop|cinema|cineplex)\b/],
    [/\b(hermina|siloam|mitra keluarga|mayapada|primaya|eka hospital)\b/, /hospital|clinic|medical|health|outpatient|doctor|laborator|dental|care_facility|pharma/, /\b(rs|rsia|rsu|rsud|rumah sakit|hospitals?|klinik|poli)\b/],
    [/\b(kimia farma|prodia|k 24)\b/, /pharma|laborator|health|clinic|medical|outpatient|hospital|doctor|dental|apotek/, /\b(apotek|apotik|laboratorium|klinik)\b/],
    [/\b(pizza hut|kfc|mcdonald s|starbucks|hokben|hoka hoka bento|bakmi gm|solaria|richeese|burger king|domino s|yoshinoya|marugame|sushi tei|ichiban sushi|kopi kenangan|janji jiwa|fore coffee|holland bakery|breadtalk|dunkin)\b/,
      /restaurant|food|cafe|coffee|bakery|tea_room|bubble_tea|pizza|burger|chicken|donut|dessert|diner|ice_cream|steak|sushi|ramen|noodle/, null],
    [/\b(indomaret|alfamart|alfamidi|alfa midi|circle k|lawson|familymart|family mart)\b/, /convenience|minimarket|grocery|supermarket/, null],
    [/\b(ramayana)\b/, /department_store|clothing|fashion|supermarket/, null],
    [/\b(erafone)\b/, /phone|electronics|telecom/, null]
  ];
  var BRAND_ANY_RX = new RegExp(BRAND_ANY.map(function (b) { return b[0].source; }).join('|'));
  var BRAND_NOT = /^(parkir|parkiran|gedung|ruko|kantor|head quarters?|headquarters?|pengadaan|kolam renang)\b/;
  var SHORT_BRAND = [[/^(?:(?:spbu|pt)\s)?bp\b/, /gas_station|fuel|ev_charging|automotive|car_|convenience/, /\b(spbu|bbm|akr)\b/], [/^a w\b/, /restaurant|food|burger|chicken|diner|cafe/, null], [/^kia\b/, /auto|car_|motor/, /\b(motors?|mobil|dealer|showroom)\b/]];
  function normName(s) {
    s = String(s || '').toLowerCase();
    if (typeof s.normalize === 'function') s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function fits(rule, nm, cat) { return !!((cat && rule[1].test(cat)) || (rule[2] && rule[2].test(nm))); }
  /** chainOf(i) → {largeChain, src: 'data' | 'nama' | null, overruled?: 'nama'}: the national-chain flag of listing row i
      (the data file's bit 32 with the two corrections above). */
  function chainOf(i, sig, name) {
    if (sig === undefined) { var E = extraFile(); sig = E && isNum(E.sig[i]) ? E.sig[i] | 0 : -1; }
    var nm = normName(name === undefined ? rowName(i) : name), cat = catName(i) || '', k;
    if (sig >= 0 && (sig & 32)) {
      for (k = 0; k < SHORT_BRAND.length; k++) if (SHORT_BRAND[k][0].test(nm) && !fits(SHORT_BRAND[k], nm, cat)) return { largeChain: false, src: null, overruled: 'nama' };
      return { largeChain: true, src: 'data' };
    }
    if (sig >= 0 && nm && BRAND_ANY_RX.test(nm) && !BRAND_NOT.test(nm)) {            // with the data file only, like bit 32
      for (k = 0; k < BRAND_ANY.length; k++) if (BRAND_ANY[k][0].test(nm) && fits(BRAND_ANY[k], nm, cat)) return { largeChain: true, src: 'nama' };
    }
    return { largeChain: false, src: null };
  }
  /** crowdOf(i, base?) → {pts, level 0-2, why, chain, largeChain}: keramaian of listing row i from open data (never Google). */
  function crowdOf(i, base) {
    var P = pois(), row = P && P.rows[i], E = extraFile(), sig = E && isNum(E.sig[i]) ? E.sig[i] | 0 : -1, cb = base || crowdBase();
    var name = rowName(i), chain = (sig >= 0 && !!(sig & 8)) || RX_CHAIN.test(name), largeChain = chainOf(i, sig, name).largeChain;
    var parts = [];                                             // [points, reason]; the first of equal points wins
    if (chain) parts.push([CROWD_PTS.chain, largeChain ? 'jaringan nasional' : 'bagian dari jaringan atau merek']);
    if (cb.roadBit && sig >= 0 && (sig & cb.roadBit)) parts.push([CROWD_PTS.mainRoad, 'di jalan utama']);
    if (cb.anc[i]) parts.push([CROWD_PTS.anchor, ANCHOR_WORDS[cb.anc[i]]]);
    var d = cb.dens[i];
    if (d >= EDC_RULE.dense) parts.push([CROWD_PTS.dense, 'di kawasan usaha yang padat']);
    else if (d >= EDC_RULE.denseSome) parts.push([CROWD_PTS.denseSome, 'di kawasan usaha yang cukup padat']);
    if (sig >= 0 && (sig & 16)) parts.push([CROWD_PTS.multi, 'tercatat di beberapa sumber']);
    if (sig >= 0 && (sig & 1)) parts.push((sig & 2) ? [CROWD_PTS.webPhone, 'memiliki situs web dan telepon'] : [CROWD_PTS.web, 'memiliki situs web']);
    /* without data/sme-pois-extra.js the Overture confidence is the only listing signal, so it weighs as one signal */
    if (row && isNum(row[4]) && row[4] >= 0.9) parts.push([sig >= 0 ? CROWD_PTS.conf : CROWD_PTS.confAlone, 'tercatat lengkap di peta publik']);
    var pts = 0, best = null;
    parts.forEach(function (p) { pts += p[0]; if (!best || p[0] > best[0]) best = p; });
    pts = Math.round(pts * 100) / 100;
    var level = pts >= EDC_RULE.crowdTinggi ? 2 : (pts >= EDC_RULE.crowdSedang ? 1 : 0);
    return { pts: pts, level: level, why: level && best ? best[1] : 'sedikit tanda keramaian di data publik', chain: chain, largeChain: largeChain };
  }
  /** busyOf(i) → {b: 0-1, chain, largeChain, est, level}: the v3 name of crowdOf; b ≥ BUSY_MIN means keramaian tinggi. */
  function busyOf(i) {
    var c = crowdOf(i);
    return { b: Math.round(Math.min(1, c.pts / 4) * 1000) / 1000, chain: c.chain, largeChain: c.largeChain, est: c.level >= 1, level: c.level, why: c.why };
  }

  /* ---------------------------------------------------------------- daya beli area (data/area-wealth.js) */

  function wealthFile() { var A = W.MCD_AREA_WEALTH; return A && typeof A.at === 'function' ? A : null; }
  /** wealthAt(kelurahanId, kecamatanId) → {level: 0-2 | null, word, why, score, id}; null level without the file or the area. */
  function wealthAt(kelId, kecId) {
    var A = wealthFile(), e = null, id = null;
    if (A) {
      if (kelId) { e = safe(function () { return A.at(kelId); }); id = e ? kelId : null; }
      if (!e && kecId) { e = safe(function () { return A.at(kecId); }); id = e ? kecId : null; }
    }
    var lv = e ? LEVEL3.indexOf(e.level) : -1;
    if (lv < 0) return { level: null, word: null, why: A ? 'daerah ini belum dinilai' : 'data daya beli belum dimuat', score: null, id: null };
    return { level: lv, word: LEVEL3[lv], why: String(e.why || ''), score: isNum(e.score) ? e.score : null, id: id };
  }
  /** wealthOfRow(i) → the daya beli of listing row i (its kelurahan from MCD.lvm, else MCD_ADMIN_AREAS.locate). */
  function wealthOfRow(i) {
    var m = model(), X = m && m.R.X, kel = null, kec = null;
    if (X && i >= 0 && i < X.n && X.kel[i] >= 0) { kel = m.ids.kel[X.kel[i]] || null; kec = m.ids.kec[X.kec[i]] || null; }
    if (!kel && !kec) {
      var P = pois(), r = P && P.rows[i], A = W.MCD_ADMIN_AREAS, L = r && A && typeof A.locate === 'function' ? safe(function () { return A.locate(r[0], r[1]); }) : null;
      if (L) { kel = L.kelurahanId || null; kec = L.kecamatanId || null; }
    }
    return wealthAt(kel, kec);
  }
  /* ---------------------------------------------------------------- the rule, the factors and the lists */

  /** qualifiesEdc(ticketLevel 0-2, crowdLevel 0-2, wealthLevel 0-2 | null) → item 37: all three reasonably high. */
  function qualifiesEdc(t, c, w) {
    var wl = w == null ? 1 : w;                                // no daya beli data: counts as sedang
    if (wl < 1) return false;
    return (t === 2 && c >= 1) || (t === 1 && c === 2);
  }
  function tierRank(t) { return t === 'nasional' ? 2 : (t === 'lvm' ? 1 : 0); }
  function cap1(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  /** One summary line for lists: "Nilai belanja besar, keramaian sedang, daya beli tinggi" (+ LVM, national chain). */
  function whyOf(c) {
    var parts = [];
    if (c.tier === 'naik-edc') parts.push('telah terdaftar di LVM');
    parts.push('nilai belanja ' + TICKET_LEVELS[c.tl], 'keramaian ' + LEVEL3[c.cl], 'daya beli ' + (c.wl == null ? 'belum diketahui' : LEVEL3[c.wl]));
    if (c.largeChain) parts.push('jaringan nasional');
    return cap1(parts.join(', '));
  }
  var FACTOR_LABEL = { ticket: 'Nilai belanja', crowd: 'Keramaian', wealth: 'Daya beli area' };
  function factorObj(key, level, why) {
    var lv = level == null ? 'belum diketahui' : level;
    return { label: FACTOR_LABEL[key], level: level, why: why, text: FACTOR_LABEL[key] + ': ' + lv + ' — ' + why };
  }
  var EC = { key: '', list: null, pos: null };
  function ecKey(m) {
    var E = extraFile(), b = branchPt(), A = wealthFile();
    return [m.ver, E ? 'x' + E.cat.length + (E.meta && E.meta.generated) : 'g', b.lon, b.lat, RULE_ID, NASIONAL_ALL ? 'nA' : 'nE', A ? 'w' + ((A.meta && A.meta.generated) || 1) : '-', crowdKey()].join('|');
  }
  /** Every merchant within 15 km with its three factors, tier and score, once per data version (about 0,2 s for 34.000). */
  function allCandidates() {
    var m = model();
    if (!m) return [];
    var key = ecKey(m);
    if (EC.key === key && EC.list) return EC.list;
    var R = m.R, X = R.X, P = R.pois, out = [], b = branchPt(), ids = m.ids, wcache = {}, cb = crowdBase();
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i] || (P.edc && P.edc[i] >= 0)) continue;           // only merchants (MCD.lvm), none with an EDC Mandiri yet
      var c = code(R, i), onLvm = c === 3 || c === 4;
      var t = ticketOf(i), tl = TICKET_LEVEL_OF[t.cls], cr = crowdOf(i, cb);
      var kel = ids.kel[X.kel[i]] || null, kec = ids.kec[X.kec[i]] || null, wk = (kel || '') + '|' + (kec || '');
      var w = wcache[wk] || (wcache[wk] = wealthAt(kel, kec));
      var qualifies = qualifiesEdc(tl, cr.level, w.level);
      var tier = tierOf(qualifies, onLvm, cr.largeChain);              // item 42: national chains apart
      if (!tier) continue;
      var km = hav(b.lon, b.lat, X.lon[i], X.lat[i]), c01 = Math.min(1, cr.pts / 4), ws = isNum(w.score) ? w.score : 0.5;
      var score = tier === 'lvm' ? 100 * qrisFit(i) * (0.5 + c01) / (1 + km / 8) : 100 * TICKET_W[t.cls] * (0.5 + c01) * (0.5 + ws) / (1 + km / 8);
      out.push({ idx: i, kecamatanId: kec, kelurahanId: kel, lon: X.lon[i], lat: X.lat[i], score: Math.round(score * (cr.largeChain ? 0.5 : 1)), tier: tier,
        ticketClass: t.cls, ticketSrc: t.src, tl: tl, cl: cr.level, cpts: cr.pts, cwhy: cr.why, wl: w.level, wwhy: w.why, wid: w.id,
        busy: Math.round(c01 * 1000) / 1000, est: cr.level >= 1, chain: cr.chain, largeChain: cr.largeChain, onLvm: onLvm, category: LCATS[X.cat[i]], group: rowGroup(i),
        q: qualifies });
    }
    out.sort(function (a, c2) { return tierRank(a.tier) - tierRank(c2.tier) || c2.score - a.score || a.idx - c2.idx; });
    var pos = new Int32Array(X.n).fill(-1);
    out.forEach(function (c2, k) { pos[c2.idx] = k; });
    EC = { key: key, list: out, pos: pos };
    return out;
  }
  function factorsOfCand(c) {
    return { ticket: factorObj('ticket', TICKET_LEVELS[c.tl], catWords(c.idx)), crowd: factorObj('crowd', LEVEL3[c.cl], c.cwhy),
      wealth: factorObj('wealth', c.wl == null ? null : LEVEL3[c.wl], c.wwhy), tier: c.tier };
  }
  /**
   * factors(idx) → {ticket: {level: 'kecil'|'sedang'|'besar', why, label, text}, crowd: {level: 'rendah'|'sedang'|'tinggi', why, …},
   *   wealth: {level: 'rendah'|'sedang'|'tinggi' | null, why, …}, tier: 'edc'|'lvm'|'naik-edc' | null, notMerchant?: {kind, why, words}}
   * for any row of MCD_SME_POIS (v4 contract). tier is null for a listing outside the lists (not a merchant, an EDC
   * Mandiri already there, or on LVM and not qualifying). text: "Nilai belanja: besar — toko furnitur".
   */
  function factors(idx) {
    var P = pois(), i = +idx;
    if (!P || !(i >= 0 && i < P.rows.length)) return null;
    var list = allCandidates(), k = EC.pos && i < EC.pos.length ? EC.pos[i] : -1;
    if (k >= 0) return factorsOfCand(list[k]);
    var t = ticketOf(i), cr = crowdOf(i), w = wealthOfRow(i);
    var out = { ticket: factorObj('ticket', TICKET_LEVELS[TICKET_LEVEL_OF[t.cls]], catWords(i)), crowd: factorObj('crowd', LEVEL3[cr.level], cr.why),
      wealth: factorObj('wealth', w.level == null ? null : LEVEL3[w.level], w.why), tier: null };
    var nm = MCD.lvm && MCD.lvm.nonMerchant ? safe(function () { return MCD.lvm.nonMerchant(i); }) : null;
    if (nm) out.notMerchant = nm;
    return out;
  }
  /**
   * edcCandidates({kecamatanId?, limit?, tiers?}) → [{idx, name, kecamatanId, lon, lat, score, tier, ticketClass, why,
   *   kelurahanId, tierLabel, ticketLabel, sasaran: 'edc'|'lvm'|'pusat', factors, busy, established, largeChain, onLvm, category}]
   *   (tier ids 'edc' | 'lvm' | 'naik-edc' | 'nasional'; tiers also takes 'edc+lvm' for 'edc'). Default limit 50; limit 0 =
   *   all. Without tiers every tier is listed (Jaringan nasional last); the Sasaran lists pass their tiers.
   * name is the public listing name, masked like every list (practitioners, Samarkan nama).
   */
  function edcCandidates(opts) {
    opts = opts || {};
    var list = allCandidates(), kec = opts.kecamatanId || null, tiers = opts.tiers ? [].concat(opts.tiers).map(tierId).filter(Boolean) : null;
    var lim = opts.limit == null ? 50 : (opts.limit > 0 ? opts.limit : Infinity), mode = privacyMode(), out = [];
    for (var k = 0; k < list.length && out.length < lim; k++) {
      var c = list[k];
      if (kec && c.kecamatanId !== kec) continue;
      if (tiers && tiers.indexOf(c.tier) < 0) continue;
      out.push({ idx: c.idx, name: maskName(rowName(c.idx), mode), kecamatanId: c.kecamatanId, lon: c.lon, lat: c.lat, score: c.score, tier: c.tier,
        ticketClass: c.ticketClass, why: whyOf(c), kelurahanId: c.kelurahanId, tierLabel: TIERS[c.tier].label, ticketLabel: TICKET_WORDS[c.ticketClass],
        sasaran: TIERS[c.tier].sasaran, factors: factorsOfCand(c), busy: c.busy, established: c.est, largeChain: c.largeChain, onLvm: c.onLvm, category: c.category });
    }
    return out;
  }
  /**
   * edcTierCounts({kecamatanId?}) → {edc, 'naik-edc', lvm, nasional, nasionalEdc, edcAll (both EDC tiers, local only),
   *   'edc+lvm' (= edc, the v3 key), edcChain (= nasional, the v4 key of the chain count), edcLocal (= edcAll)}.
   *   Item 42 (v5): national chains are their own group "Jaringan nasional (lewat kantor pusat)", outside every branch
   *   target (head office usually decides their payment terminals, docs/EDC_SCORE.md §7). nasionalEdc counts the chains
   *   among them whose three factors would make them Sasaran EDC (the v4 edcChain, for the branch's records).
   *   Before an LVM import: edc + lvm + nasional = every merchant within 15 km.
   */
  function edcTierCounts(opts) {
    var kec = opts && opts.kecamatanId, out = { edc: 0, 'naik-edc': 0, lvm: 0, nasional: 0 }, natEdc = 0;
    allCandidates().forEach(function (c) {
      if (kec && c.kecamatanId !== kec) return;
      out[c.tier]++;
      if (c.tier === 'nasional' && c.q) natEdc++;
    });
    out.nasionalEdc = natEdc;
    out.edcAll = out.edc + out['naik-edc'];
    out['edc+lvm'] = out.edc;
    out.edcChain = out.nasional;
    out.edcLocal = out.edcAll;
    return out;
  }
  /** edcOf(i) → the candidate entry of listing row i (tier, ticket, factors, why) or null (not in the lists). */
  function edcOf(i) {
    var list = allCandidates(), k = EC.pos && i >= 0 && i < EC.pos.length ? EC.pos[i] : -1, c = k >= 0 ? list[k] : null;
    return c ? { tier: c.tier, tierLabel: TIERS[c.tier].label, ticketClass: c.ticketClass, ticketLabel: TICKET_WORDS[c.ticketClass], why: whyOf(c), score: c.score,
      rank: k + 1, factors: factorsOfCand(c) } : null;
  }
  /** tierOfRow(i) → the tier of listing row i or null (for the map filter "Sasaran"). */
  function tierOfRow(i) { var list = allCandidates(), k = EC.pos && i >= 0 && i < EC.pos.length ? EC.pos[i] : -1; return k >= 0 ? list[k].tier : null; }
  /** v6 integration (22 Oct 2026, Kampus request): true when the tiers are already scored for the current data, so
      tierOfRow() costs nothing. Never scores: false before the first scoring or after the data changed. */
  function tiersReady() { if (!EC.list || !M.val) return false; var m = model(); return !!(m && EC.key === ecKey(m)); }
  /** edcShare() → {edc, lvm, nasional, share}: Sasaran EDC among the local merchants that are not on LVM yet (item 37 aimed
      at 15-25% of all merchants; without the national chains of item 42 it is about 14%, docs/EDC_SCORE.md §7). */
  function edcShare() { var c = edcTierCounts(); return { edc: c.edc, lvm: c.lvm, nasional: c.nasional, share: c.edc + c.lvm ? c.edc / (c.edc + c.lvm) : null }; }
  /**
   * googleRank(items, results) → items re-ranked by the number of Google reviews × the ticket weight (item 33):
   * each item gets .google = {rating, userRatingCount, googleMapsUri} from the matched live result (memory only,
   * never stored); items without a match keep their order at the end. Pure: the caller keeps nothing.
   */
  function googleRank(items, results) {
    var by = {};
    (results || []).forEach(function (r) { if (r && r.id != null && r.matched !== false) by[String(r.id)] = r; });
    var keyed = (items || []).map(function (it, k) {
      var g = by[String(it.idx != null ? it.idx : it.id)] || null, n = g && isNum(g.userRatingCount) ? g.userRatingCount : null;
      var w = TICKET_WEIGHT[clamp(isNum(it.ticketClass) ? it.ticketClass : 1, 0, 3)];
      return { it: it, g: g, v: n == null ? null : n * w, k: k };
    });
    keyed.sort(function (a, b) { if (a.v == null || b.v == null) return a.v == null ? (b.v == null ? a.k - b.k : 1) : -1; return b.v - a.v || a.k - b.k; });
    return keyed.map(function (o) {
      var c = {};
      Object.keys(o.it).forEach(function (key) { c[key] = o.it[key]; });
      c.google = o.g ? { rating: o.g.rating, userRatingCount: o.g.userRatingCount, googleMapsUri: o.g.googleMapsUri, displayName: o.g.displayName } : null;
      c.googleRank = o.v;
      return c;
    });
  }
  /** directionsUrl(lon, lat) → Google Maps directions from KCP Jakarta Cilangkap to the point (item 36; coordinates only,
      5 decimals; MCD.distance.directionsUrl when the shell has it). Opened only by a click, in a new tab. */
  function directionsUrl(lon, lat) {
    if (!isNum(lon) || !isNum(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    var D = MCD.distance;
    if (D && typeof D.directionsUrl === 'function') {
      var u = safe(function () { return D.directionsUrl(lon, lat); });
      if (typeof u === 'string' && /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&/.test(u)) return u;
    }
    var b = branchPt();
    return 'https://www.google.com/maps/dir/?api=1&origin=' + b.lat.toFixed(5) + ',' + b.lon.toFixed(5) + '&destination=' + lat.toFixed(5) + ',' + lon.toFixed(5) + '&travelmode=driving';
  }

  /* ================================================================ priority (where to go next, plan A-06 / D4) */

  /**
   * priorityKec(n) → [{rank, id, name, kota, potential, notYet, coverage, band, ranked, distKm, why}].
   * The shell's MCD.territory.priority(stats, {n}) is the one ranking (Ringkasan top 3, Merchant top 10, map
   * numbers 1-3); it is used whenever it exists. Until then the same rule runs here on MCD.lvm.aggregate:
   * kecamatan inside the 15 km focus (at least half their area) with potential > 0, after the import without the
   * strongest third; score = belum ada di LVM ÷ (1 + jarak / 3 km), before the import the potential; ties go to
   * the nearer kecamatan. Always computed on all types (the type filter does not change the ranking).
   */
  var PR = { R: null, list: null };
  function priorityKec(n) {
    n = n || 10;
    var m = model();
    if (!m) return [];
    var t = T();
    if (t && typeof t.priority === 'function' && m.terrAll) {
      var r = safe(function () { return t.priority(m.terrAll, { n: n }); });
      if (Array.isArray(r)) return r.slice(0, n);
    }
    if (PR.R !== m.R || !PR.list) { PR.R = m.R; PR.list = fallbackPriority(m); }
    return PR.list.slice(0, n);
  }
  function fallbackPriority(m) {
    var agg = m.agg, A = W.MCD_ADMIN_AREAS, fm = F(), out = [];
    if (!agg || !agg.areas) return out;
    var minIn = (agg.bands && isNum(agg.bands.minInFocus)) ? agg.bands.minInFocus : 0.5;
    Object.keys(agg.areas).forEach(function (id) {
      var a = agg.areas[id], rec = A && A.byId ? A.byId(id) : null;
      if (!(a && a.potential > 0) || !(isNum(a.in15) && a.in15 >= minIn)) return;
      if (m.hasLvm && a.band === 'acquired') return;
      var dist = rec && isNum(rec.distKm) ? rec.distKm : (Array.isArray(a.label) ? kmFromCentre(a.label[0], a.label[1]) : null);
      var notYet = m.hasLvm ? a.notYet : a.potential;
      var kota = rec && A.byId(rec.kota) ? A.byId(rec.kota).name : (a.kota || '');
      out.push({ id: id, name: a.name, kota: kota, potential: a.potential, notYet: notYet, coverage: m.hasLvm ? a.coverageKnown : null,
        band: m.hasLvm ? a.band : 'potential', ranked: !!a.ranked, distKm: dist, score: notYet / (1 + (isNum(dist) ? dist : 0) / 3) });
    });
    out.sort(function (a, b) { return b.score - a.score || (a.distKm || 0) - (b.distKm || 0) || (a.id < b.id ? -1 : 1); });
    out.forEach(function (p, k) {
      p.rank = k + 1;
      p.why = m.hasLvm ? fm.int(p.notYet) + ' belum ada di LVM · coverage ' + pctAuto(p.coverage) + (isNum(p.distKm) ? ' · ' + fm.km(p.distKm) : '')
        : fm.int(p.potential) + ' merchant' + (isNum(p.distKm) ? ' · ' + fm.km(p.distKm) : '');
    });
    return out;
  }
  function prioIds(n) { return safe(function () { return priorityKec(n || 3).map(function (p) { return p.id; }); }, []); }

  /* ================================================================ Google Maps (item 22, plan §2.8, D17) */

  function r5(x) { return String(Math.round(x * 1e5) / 1e5); }
  /** gmapsUrl({lat, lon} | {q}) → https://www.google.com/maps/search/?api=1&query=… | null (no valid point). */
  function gmapsUrl(t) {
    var G = U() && U().gmaps;
    if (G && typeof G.url === 'function') return safe(function () { return G.url(t); });
    if (!t) return null;
    if (t.q != null) { var q = String(t.q).trim(); return q ? GMAPS + encodeURIComponent(q) : null; }
    var lat = typeof t.lat === 'number' ? t.lat : NaN, lon = typeof t.lon === 'number' ? t.lon : NaN;
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return null;
    return GMAPS + r5(lat) + ',' + r5(lon);
  }
  /** gmapsFor(kind, id) → {lat, lon, approx} for a public listing (mxPoi) or an LVM store (mxLvm); null otherwise
      (clusters get no link). An LVM store matched to a listing uses the listing's point; an LVM-only store its
      approximate kelurahan point (approx: true). Never a name: bank customer data stays out of the URL. */
  function gmapsFor(kind, id) {
    var m = model();
    if (!m) return null;
    if (kind === 'mxPoi') {
      var i = +id, X = m.R.X;
      if (!(i >= 0 && i < X.n) || !X.ok[i]) return null;
      return { lat: X.lat[i], lon: X.lon[i], approx: false };
    }
    if (kind === 'mxLvm') {
      var l = MCD.lvm.locationOf(id);
      if (!l || !isNum(l.lat) || !isNum(l.lon)) return null;
      /* a street point from the address (item 28) is no area point: no "area" link label, the panel says "titik jalan" */
      return { lat: l.lat, lon: l.lon, approx: !(l.precision === 'listing' || l.precision === 'exact' || l.precision === 'jalan' || l.precision === 'kampung'), precision: l.precision };
    }
    return null;
  }
  /** kecQuery(id) → {q: 'Kecamatan <name>, <kota>'} so Google shows the area outline (D17). */
  function kecQuery(id) {
    var t = T();
    if (t && typeof t.gmapsQuery === 'function') { var q = safe(function () { return t.gmapsQuery(id); }); if (q) return { q: q }; }
    var A = W.MCD_ADMIN_AREAS, r = A && A.byId ? A.byId(id) : null;
    if (!r) return null;
    var k = A.byId(r.kota), kota = k ? String(k.name || '').replace(/^Kota Administrasi /, 'Kota ') : '';
    return { q: 'Kecamatan ' + r.name + (kota ? ', ' + kota : '') };
  }

  /* ================================================================ search (plan B-11: public listings only) */

  var NAMES = { file: null, low: null };
  function lowNames() {
    var P = pois();
    if (!P) return null;
    if (NAMES.file !== P) { NAMES.file = P; NAMES.low = P.rows.map(function (r) { return String((r && r[3]) || '').toLowerCase(); }); }
    return NAMES.low;
  }
  /** searchMerchants(q, limit) → [{label, sub, run}] public merchants within 15 km whose name contains q. */
  function searchMerchants(q, limit) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 3) return [];
    var m = model(), low = lowNames();
    if (!m || !low) return [];
    var X = m.R.X, hits = [];
    for (var i = 0; i < X.n && i < low.length; i++) {
      if (!X.ok[i]) continue;
      var at = low[i].indexOf(q);
      if (at < 0) continue;
      hits.push({ i: i, s: (at === 0 ? 0 : 1) + X.dist[i] / 100 });
    }
    hits.sort(function (a, b) { return a.s - b.s || a.i - b.i; });
    var mode = privacyMode();
    return hits.slice(0, limit || 8).map(function (h) {
      var i = h.i, kid = m.ids.kec[X.kec[i]], cat = LCATS[X.cat[i]], d = distText(poiDist(i));
      return {
        label: maskName(rowName(i), mode),
        /* the distance from KCP, like every list (item 27): "Restoran · Kec. Cipayung · 1,6 km · ± 7 menit dari KCP" */
        sub: CAT[cat].short + (kid ? ' · Kec. ' + kecName(kid) : '') + (d && d !== '—' ? ' · ' + d + ' dari KCP' : ''),
        run: function () { openMerchant(i); }
      };
    });
  }
  function openMerchant(i) {
    var A = MCD.app;
    if (!A || !A.navigate) return;
    A.navigate('merchants', { view: 'deep', action: 'merchants:poi:' + i });
  }
  /* The shell reads MCD.searchProviders (created by config.js, so this file can register at load time) or takes
     MCD.app.registerSearch after boot. Results are grouped under "Merchant". */
  var searchOn = false;
  function provider(q) { return searchMerchants(q, 8).map(function (r) { r.group = 'Merchant'; return r; }); }
  function registerSearch() {
    if (searchOn) return true;
    if (MCD.searchProviders && typeof MCD.searchProviders === 'object') { MCD.searchProviders.merchants = provider; searchOn = true; return true; }
    var A = MCD.app;
    if (!A || typeof A.registerSearch !== 'function') return false;
    safe(function () { A.registerSearch('merchants', provider); searchOn = true; });
    return searchOn;
  }

  /* ================================================================ map: colours and helpers */

  function pal(ms) { var t = T(); return t ? t.palette(ms) : { key: ms.palette === 'day' ? 'day' : 'night', status: null, ink: null }; }
  function statusRGB(ms) {
    var p = pal(ms), s = p.status || { ok: [47, 184, 121], mid: [240, 169, 46], bad: [238, 90, 79], none: [111, 123, 144], potential: [76, 141, 246] };
    return { 1: s.potential, 2: s.bad, 3: s.ok, 4: s.mid, lvm: s.ok, none: s.none };
  }
  function zi(stops, z) {
    if (z <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < stops.length; i++) {
      if (z <= stops[i][0]) { var a = stops[i - 1], b = stops[i], t = (z - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; }
    }
    return stops[stops.length - 1][1];
  }
  function compact(n) {
    if (n >= 10000) return Math.round(n / 1000) + 'rb';
    if (n >= 1000) return (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'rb';
    return String(n);
  }

  /* ================================================================ map: per kecamatan (item 20) */

  /* The calm kecamatan map (COPY_STYLE_EN item 23): thin grey outlines, no fill, and a white chip
     "Cipayung · 962 merchant" per kecamatan (a coloured coverage dot after the LVM import); the top 3 of
     priorityKec() carry a navy number badge. The shell draws it (MCD.territory.layers, plan A-01).
     selected null: the open popup's kecamatan. */
  function territoryLayers(out, m, ms) {
    var t = T(), z = isNum(ms.zoom) ? ms.zoom : 11;
    var r = t.layers({ id: 'merchants-territory', ms: ms, stats: m.terr, selected: UI.hl || V.kec || null, labels: true,
      kelurahan: z >= 12.5, outside: 'outline', priority: prioIds(3) });
    (r.base || EMPTY).forEach(function (l) { out.base.push(l); });
    (r.top || EMPTY).forEach(function (l) { out.top.push(l); });
  }

  /* ================================================================ map: merchants (dots + clusters) */

  var CLUSTER_CELL = 58;                               // grid cell of the count bubbles, px at the quantised zoom
  /** Web Mercator world px of [lon, lat] for a world of w px, and back. */
  function mercXY(lon, lat, w) { var sy = Math.sin(lat * D2R); return [(lon + 180) / 360 * w, (0.5 - Math.log((1 + sy) / (1 - sy)) / (4 * Math.PI)) * w]; }
  function mercLL(x, y, w) { return [x / w * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y / w))) / D2R]; }
  function cellKey(lon, lat, zq) { var p = mercXY(lon, lat, 512 * Math.pow(2, zq)); return Math.floor(p[0] / CLUSTER_CELL) + ':' + Math.floor(p[1] / CLUSTER_CELL); }
  function dominantOf(c) {
    var best = null;
    ['2', '3', 'lvm', '4', '1'].forEach(function (s) { if (c.by[s] > 0 && (!best || c.by[s] > c.by[best])) best = s; });
    return best;
  }
  function clusterize(m, pts, zq) {
    var key = PT.key + '#' + zq;
    if (UI.clusters && UI.clusters.key === key) return UI.clusters.list;
    var X = m.R.X, cells = new Map();
    function add(lon, lat, kind) {
      var k = cellKey(lon, lat, zq), c = cells.get(k);
      if (!c) { c = { id: k, n: 0, lon: 0, lat: 0, by: { 1: 0, 2: 0, 3: 0, 4: 0, lvm: 0 } }; cells.set(k, c); }
      c.n++; c.lon += lon; c.lat += lat; c.by[kind]++;
    }
    for (var k = 0; k < pts.idx.length; k++) { var i = pts.idx[k]; add(X.lon[i], X.lat[i], pts.codes[k]); }
    pts.off.forEach(function (o) { add(o.lon, o.lat, 'lvm'); });
    var list = [];
    cells.forEach(function (c) {
      c.position = [c.lon / c.n, c.lat / c.n];
      c.dominant = dominantOf(c);
      list.push(c);
    });
    list.sort(function (a, b) { return a.n - b.n; });
    UI.clusters = { key: key, list: list, byId: {} };
    list.forEach(function (c) { UI.clusters.byId[c.id] = c; });
    return list;
  }
  function sortedIndex(arr, v) { var lo = 0, hi = arr.length - 1; while (lo <= hi) { var mid = (lo + hi) >> 1; if (arr[mid] === v) return mid; if (arr[mid] < v) lo = mid + 1; else hi = mid - 1; } return -1; }
  /** The selected merchant or LVM store among the drawn points: {pos (the map's point), lon, lat (as clustered), kind
      (its bubble key: 1-4 or 'lvm'; null when the filters hide it)}, or null for any other selection. */
  function selectedMember(m, pts, sel) {
    if (!sel || (sel.kind !== 'mxPoi' && sel.kind !== 'mxLvm')) return null;
    var pos = selectable(sel.kind)(sel.id);
    if (!pos) return null;
    var X = m.R.X, i = sel.kind === 'mxPoi' ? +sel.id : -1, out = { pos: [pos[0], pos[1]], lon: pos[0], lat: pos[1], kind: null };
    if (sel.kind === 'mxLvm') {
      var l = MCD.lvm && MCD.lvm.locationOf ? safe(function () { return MCD.lvm.locationOf(sel.id); }) : null;
      if (l && l.poi >= 0) i = l.poi;
    }
    if (i >= 0) {
      var k = sortedIndex(pts.idx, i);
      if (k >= 0) { out.kind = pts.codes[k]; out.lon = X.lon[i]; out.lat = X.lat[i]; }
      return out;
    }
    pts.off.some(function (o) { if (String(o.id) !== String(sel.id)) return false; out.kind = 'lvm'; out.lon = o.lon; out.lat = o.lat; return true; });
    return out;
  }
  /* v5 fixer (MERCHANT finding: the selected merchant hid under a count bubble in the trail kecamatan › merchant, at the
     kecamatan's zoom below CLUSTER_Z): the selection leaves its bubble (one less in the count, a bubble of one becomes a
     plain dot) and is drawn on its own above the bubbles (selectedLayers); a bubble that would still cover the selection
     or the route's end ring (radius 10 + 3 px line, map.js) moves out by the smallest distance along its own direction,
     so its edge clears SEL_KEEP px around the point. The count and the click target (MCD.sme.clusterAt) are unchanged. */
  var SEL_KEEP = 18;
  function bubbleRadius(n) { return n > 1 ? 9 + 3.2 * Math.log10(n + 1) : 3.5; }
  function clearOfSelection(list, one, zq, z) {
    var home = one.kind != null ? cellKey(one.lon, one.lat, zq) : null, w = 512 * Math.pow(2, z), sp = mercXY(one.pos[0], one.pos[1], w), out = [];
    list.forEach(function (c) {
      var d = c;
      if (home && c.id === home) {
        d = { id: c.id, n: c.n - 1, lon: c.lon - one.lon, lat: c.lat - one.lat, by: Object.assign({}, c.by) };
        d.by[one.kind] = Math.max(0, (d.by[one.kind] || 0) - 1);
        if (d.n <= 0) return;
        d.position = [d.lon / d.n, d.lat / d.n];
        d.dominant = dominantOf(d);
      }
      if (d.n > 1) {
        var p = mercXY(d.position[0], d.position[1], w), dx = p[0] - sp[0], dy = p[1] - sp[1], dist = Math.sqrt(dx * dx + dy * dy);
        var need = bubbleRadius(d.n) + 1 + SEL_KEEP;
        if (dist < need) {
          var ux = dist > 0.5 ? dx / dist : 0, uy = dist > 0.5 ? dy / dist : -1;
          var ll = mercLL(sp[0] + ux * need, sp[1] + uy * need, w);
          d = { id: d.id, n: d.n, lon: d.lon, lat: d.lat, by: d.by, dominant: d.dominant, position: ll, moved: true };
        }
      }
      out.push(d);
    });
    return out;
  }
  /** The selected point in the bubble view: its own status dot (an LVM-only store: the ring of its layer) and the gold
      selection ring of the dot view, both above the bubbles. */
  function selectedLayers(out, one, ms, RGB, keyline, day) {
    var dk = W.deck, gold = (ms.kit && ms.kit.palette && ms.kit.palette.gold) || [242, 183, 5], lvm = one.kind === 'lvm';
    var c = lvm ? RGB.lvm : (RGB[one.kind] || RGB.none);
    out.top.push(new dk.ScatterplotLayer({
      id: 'merchants-selected-dot', data: [one.pos], getPosition: function (q) { return q; }, radiusUnits: 'pixels', getRadius: lvm ? 4.5 : 4,
      filled: true, getFillColor: lvm ? (day ? [255, 255, 255, 230] : [5, 8, 15, 210]) : [c[0], c[1], c[2], 240],
      stroked: true, lineWidthUnits: 'pixels', getLineWidth: lvm ? 2.25 : 1, getLineColor: lvm ? [c[0], c[1], c[2], 250] : keyline, pickable: false, beforeId: ms.beforeId
    }));
    out.top.push(new dk.ScatterplotLayer({
      id: 'merchants-selected', data: [one.pos], getPosition: function (q) { return q; }, radiusUnits: 'pixels', getRadius: 10,
      filled: false, stroked: true, getLineColor: [gold[0], gold[1], gold[2], 255], lineWidthUnits: 'pixels', getLineWidth: 2.5, pickable: false, beforeId: ms.beforeId
    }));
  }
  function clusterTip(c, m) {
    var fm = F(), parts = [];
    if (m.hasLvm) {
      var acq = c.by[3] + c.by[4] + c.by.lvm;
      parts.push({ kind: 'body', text: fm.int(acq) + ' sudah diakuisisi · ' + fm.int(c.by[2]) + ' belum ada di LVM' });
      if (c.by[4]) parts.push({ text: fm.int(c.by[4]) + ' sudah diakuisisi, tidak aktif bulan ini' });
      if (c.by.lvm) parts.push({ text: fm.int(c.by.lvm) + ' toko LVM yang tidak ada di peta publik (titik perkiraan)' });
    } else parts.push({ kind: 'body', text: WORDS.potential });
    parts.push({ kind: 'meta', text: 'Klik untuk memperbesar peta' });
    return { eyebrow: 'KELOMPOK MERCHANT', title: fm.int(c.n) + ' merchant', lines: parts };
  }
  function poiTip(i) {
    var info = poiInfo(i), fm = F();
    if (!info) return null;
    var lines = [{ kind: 'body', text: WORDS[info.status] }];
    if (info.status === 'notYet') lines.push({ text: WORDS.notYetNote });
    if (info.status === 'acquired' || info.status === 'inactive') {
      lines.push({ text: WORDS.lvmBadge });
      lines.push({ text: info.ownBranch ? 'KCP Cilangkap (12903)' : 'Cabang lain di area' + (info.branchCode ? ' (' + info.branchCode + ')' : '') });
    }
    if (info.edc) lines.push({ text: 'EDC Mandiri terpasang' + (info.edc.active === false ? ' (tidak aktif)' : '') });
    /* item 37: the tier and the three factors, one plain reason each (hover text only; the drawer has the links) */
    var ec = edcOf(i);
    if (ec) {
      lines.push({ text: ec.tier === 'nasional' ? ec.tierLabel : ec.tierLabel + ' (perkiraan)' });
      ['ticket', 'crowd', 'wealth'].forEach(function (k) { lines.push({ text: ec.factors[k].text }); });
    }
    lines.push({ text: 'Jarak dari KCP · ' + distText(poiDist(i)) });
    lines.push({ text: (info.kecamatanId ? 'Kec. ' + kecName(info.kecamatanId) + ' · ' : '') + fm.km(info.km) + ' dari Mabes TNI' });
    lines.push({ kind: 'meta', text: 'Klik untuk melihat detail' });
    return { eyebrow: (CAT[info.category].short + ' · ' + (GROUP_LABEL[info.group] || '')).toUpperCase(), title: maskName(info.name, privacyMode()), lines: lines };
  }
  function precise(o) { return !!o && (o.precision === 'jalan' || o.precision === 'kampung' || o.precision === 'exact'); }
  function lvmTip(o) {
    var st = lvmStore(o.id), rec = st && st.rec;
    return { eyebrow: WORDS.lvmBadge.toUpperCase(), title: storeName(rec ? rec.name : '', privacyMode()),
      lines: [{ kind: 'body', text: o.active === false ? 'Tidak aktif bulan ini' : (o.active === true ? 'Aktif bulan ini' : 'Status aktif belum diketahui') },
        { text: WORDS.lvmOnly },
        { text: placeWords(o) },
        { text: 'Jarak dari KCP · ' + distText(lvmDist(o.id)) },
        { text: o.branchCode === HOME ? 'KCP Cilangkap (12903)' : 'Cabang ' + (o.branchCode || '—') },
        { kind: 'meta', text: 'Klik untuk melihat detail' }] };
  }
  /* Where an LVM store sits (item 28): labels "titik jalan", "pusat kelurahan", "pusat kecamatan". */
  var PREC_LABEL = { listing: 'titik peta publik', exact: 'titik tepat', jalan: 'titik jalan', kampung: 'titik jalan', kelurahan: 'pusat kelurahan', kecamatan: 'pusat kecamatan' };
  /** placeWords({precision, kelurahanId, kecamatanId}) → one plain line for popups and drawers. */
  function placeWords(o) {
    var p = o && o.precision;
    if (p === 'listing') return 'Titik merchant di peta publik';
    if (p === 'exact') return 'Titik tepat dari file';
    if (p === 'jalan' || p === 'kampung') return 'Titik jalan, perkiraan dari alamat toko';
    if (p === 'kelurahan' && o.kelurahanId) return 'Pusat Kel. ' + kelName(o.kelurahanId) + ', perkiraan';
    if (p === 'kecamatan' && o.kecamatanId) return 'Pusat Kec. ' + kecName(o.kecamatanId) + ', perkiraan';
    return p && PREC_LABEL[p] ? PREC_LABEL[p].charAt(0).toUpperCase() + PREC_LABEL[p].slice(1) + ', perkiraan' : 'Lokasi belum diketahui';
  }

  /* "Sasaran" counts per kecamatan for the chips (cached per filtered point set) */
  var TKC = { key: '', val: null };
  var TIER_UNIT = { edc: 'sasaran EDC', lvm: 'sasaran LVM', 'naik-edc': 'naik ke EDC', nasional: 'jaringan nasional' };
  function tierKecCounts(m, pts) {
    if (TKC.key === PT.key && TKC.val) return TKC.val;
    var X = m.R.X, ids = m.ids.kec, by = {};
    pts.idx.forEach(function (i) { var id = ids[X.kec[i]]; if (id) by[id] = (by[id] || 0) + 1; });
    TKC = { key: PT.key, val: by };
    return by;
  }
  /** "Cipayung · 412 sasaran EDC" (below zoom 11 without the unit, like the default chips; the legend says it); a
      kecamatan without any keeps its name only, so the map never fills with zeros. */
  function tierChipText(k, by, zoom) {
    var n = (by && k && by[k.id]) || 0;
    if (!n) return k.name;
    return k.name + ' · ' + F().int(n) + (zoom >= 11 ? ' ' + (TIER_UNIT[V.tier] || 'merchant') : '');
  }
  function merchantLayers(out, m, ms) {
    var dk = W.deck, t = T(), z = ms.zoom || 11, pk = pal(ms).key, day = pk === 'day', RGB = statusRGB(ms);
    /* calm points (item 23): small dots with a thin keyline, a little translucent, so the map stays quiet */
    var keyline = day ? [255, 255, 255, 210] : [5, 8, 15, 190];
    var pts = points(m), X = m.R.X;
    /* a "Sasaran" filter below CLUSTER_Z (finding: the grid of count bubbles hid the zones, the chips and the KCP
       plate): no grid clusters, the count sits on the calm kecamatan chips instead ("Cipayung · 412 sasaran EDC");
       the single dots show from CLUSTER_Z */
    var tierChips = V.tier !== 'all' && z < CLUSTER_Z && !!(t && m.terr);
    /* context: the thin grey kecamatan outlines (no fill under the dots); name-only chips once the single dots show
       (13.5–14.5), so they never sit on the cluster counts */
    if (t && m.terr) {
      var tc = tierChips ? tierKecCounts(m, pts) : null;
      var ctxL = t.layers({ id: 'merchants-ctx', ms: ms, stats: m.terr, selected: UI.hl || V.kec || null, kelurahan: z >= 13, labels: tierChips || (z >= CLUSTER_Z && z < 14.5),
        outside: 'outline', priority: tierChips ? [] : prioIds(3), dots: tierChips ? false : undefined,
        labelText: tierChips ? function (k, ks, zoom) { return tierChipText(k, tc, zoom); } : function (k) { return k.name; },
        labelKey: tierChips ? 'tier#' + V.tier + '#' + PT.key : 'name' });
      ctxL.base.forEach(function (l) { out.base.push(l); });
      ctxL.top.forEach(function (l) { out.top.push(l); });
    }
    var sel = ms.selection, one = z < CLUSTER_Z ? selectedMember(m, pts, sel) : null;
    if (tierChips) { if (one) selectedLayers(out, one, ms, RGB, keyline, day); return; }
    if (z < CLUSTER_Z) {
      var zq = Math.round(z * 2) / 2, cl = clusterize(m, pts, zq);
      if (one) cl = clearOfSelection(cl, one, zq, z);
      /* calm clusters (item 23): a neutral glass bubble with a status-coloured ring (the majority) and the count,
         instead of a field of solid red discs; a single merchant stays a small status dot */
      var th = ms.theme === 'day' ? 'day' : (ms.theme === 'night' ? 'night' : pk), RGBT = statusRGB({ palette: th });
      var bubble = th === 'day' ? [255, 255, 255, 236] : [17, 24, 37, 226], bubbleInk = th === 'day' ? [30, 41, 59, 255] : [226, 232, 240, 255];
      out.base.push(new dk.ScatterplotLayer({
        id: 'merchants-clusters', data: cl, getPosition: function (c) { return c.position; },
        radiusUnits: 'pixels', getRadius: function (c) { return bubbleRadius(c.n); },
        getFillColor: function (c) { if (c.n > 1) return bubble; var col = RGB[c.dominant] || RGB.none; return [col[0], col[1], col[2], 225]; },
        stroked: true, lineWidthUnits: 'pixels', getLineWidth: function (c) { return c.n > 1 ? 2 : 0.75; },
        getLineColor: function (c) { if (c.n <= 1) return keyline; var col = RGBT[c.dominant] || RGBT.none; return [col[0], col[1], col[2], 235]; },
        pickable: true, autoHighlight: true, highlightColor: day ? [14, 30, 54, 40] : [255, 255, 255, 40],
        updateTriggers: { getFillColor: [pk, th, PT.key], getLineColor: [pk, th, PT.key] }, beforeId: ms.beforeId,
        mcd: { kind: 'mxCluster', id: function (c) { return c.id; }, tooltip: function (c) { return clusterTip(c, m); } }
      }));
      if (ms.fontsReady !== false) {
        out.top.push(new dk.TextLayer({
          id: 'merchants-cluster-n', data: cl.filter(function (c) { return c.n > 1; }), getPosition: function (c) { return c.position; },
          getText: function (c) { return compact(c.n); }, getSize: 12, sizeUnits: 'pixels', fontWeight: 600, characterSet: 'auto',
          fontFamily: (ms.kit && ms.kit.fonts && ms.kit.fonts.sans) || 'Inter Tight, system-ui, sans-serif',
          getColor: bubbleInk, getTextAnchor: 'middle', getAlignmentBaseline: 'center',
          fontSettings: { sdf: true }, pickable: false, updateTriggers: { getText: PT.key, getColor: th }, beforeId: ms.beforeId
        }));
      }
      if (one) selectedLayers(out, one, ms, RGB, keyline, day);
      return;
    }
    var rad = zi([[13.5, 2.6], [15, 3.6], [17, 5.2]], z);
    var col = [0, 0, 0, 0];
    out.base.push(new dk.ScatterplotLayer({
      id: 'merchants-dots', data: pts.idx, getPosition: function (i) { return [X.lon[i], X.lat[i]]; },
      getFillColor: function (i, info) { var c = RGB[pts.codes[info.index]] || RGB.none; col[0] = c[0]; col[1] = c[1]; col[2] = c[2]; col[3] = 225; return col; },
      radiusUnits: 'pixels', getRadius: rad, stroked: true, getLineColor: keyline, lineWidthUnits: 'pixels', getLineWidth: 0.75,
      pickable: true, autoHighlight: true, highlightColor: day ? [14, 30, 54, 160] : [255, 255, 255, 190],
      updateTriggers: { getFillColor: [pk, PT.key], getPosition: PT.key }, beforeId: ms.beforeId,
      mcd: { kind: 'mxPoi', id: function (i) { return i; }, tooltip: function (i) { return poiTip(i); } }
    }));
    if (pts.off.length) {
      /* "Sudah pakai Livin' Merchant" (items 28-29): the LVM stores that are not on the public map, each at its own
         point from its address. A thick ring = on its street ("titik jalan"); a thin, lighter ring = the centre of its
         kelurahan or kecamatan ("pusat kelurahan / kecamatan"). Amber ring = not active this month. */
      out.base.push(new dk.ScatterplotLayer({
        id: 'merchants-lvm', data: pts.off, getPosition: function (o) { return [o.lon, o.lat]; },
        radiusUnits: 'pixels', getRadius: function (o) { return precise(o) ? rad + 1 : rad + 0.4; }, filled: true, getFillColor: day ? [255, 255, 255, 200] : [5, 8, 15, 170],
        stroked: true, lineWidthUnits: 'pixels', getLineWidth: function (o) { return precise(o) ? 2.25 : 1.25; },
        getLineColor: function (o) { var c = o.active === false ? RGB[4] : RGB.lvm; return [c[0], c[1], c[2], precise(o) ? 250 : 165]; },
        pickable: true, autoHighlight: true, highlightColor: day ? [14, 30, 54, 120] : [255, 255, 255, 120],
        updateTriggers: { getLineColor: [pk, PT.key], getLineWidth: PT.key, getRadius: [PT.key, rad] }, beforeId: ms.beforeId,
        mcd: { kind: 'mxLvm', id: function (o) { return o.id; }, tooltip: function (o) { return lvmTip(o); } }
      }));
    }
    if (sel && (sel.kind === 'mxPoi' || sel.kind === 'mxLvm')) {
      var p = selectable(sel.kind)(sel.id);
      var gold = (ms.kit && ms.kit.palette && ms.kit.palette.gold) || [242, 183, 5];
      if (p) out.top.push(new dk.ScatterplotLayer({
        id: 'merchants-selected', data: [p], getPosition: function (q) { return q; }, radiusUnits: 'pixels', getRadius: rad + 6,
        filled: false, stroked: true, getLineColor: [gold[0], gold[1], gold[2], 255], lineWidthUnits: 'pixels', getLineWidth: 2.5, pickable: false, beforeId: ms.beforeId
      }));
    }
  }

  /* ================================================================ map: registration functions */

  var LC = { key: '', res: null };
  function layersFn(derived, ms) {
    if (!W.deck) return EMPTY;
    var m = model();
    if (!m) return EMPTY;
    var ov = ms.view === 'overview', mode = ov ? 'territory' : V.mode;
    var sel = ms.selection ? ms.selection.kind + ':' + ms.selection.id : '';
    var hov = T() && typeof T().hovered === 'function' ? T().hovered() : '';
    var key = [m.ver, V.rev, mode, ms.view, ms.palette, ms.theme, ms.zoomQ, ms.fontsReady, sel, UI.hl, hov, m.terr ? m.terr.key : ''].join('|');
    if (key === LC.key) return LC.res;
    var out = { base: [], top: [] };
    try {
      if (mode === 'territory' && T() && m.terr) territoryLayers(out, m, ms);
      else merchantLayers(out, m, ms);
    } catch (e) { warn('layers', e); }
    LC = { key: key, res: out };
    return out;
  }

  /* Legend glyphs (item 23): dots for the coverage third on the chips, lines for the borders. No fill swatches. */
  var SWATCH = 'circle';
  function lineGroup(pk) {
    var t = T(), ink = t && typeof t.ink === 'function' ? t.ink({ theme: pk === 'day' ? 'day' : 'night' }) : null;
    var grey = ink ? ink.line.slice(0, 3) : (pk === 'night' ? [203, 213, 225] : [71, 85, 105]), navy = ink ? ink.sel.slice(0, 3) : [0, 61, 121];
    return { id: 'mx-lines', title: 'Garis', rows: [
      { line: grey, alpha: 0.75, label: 'Garis abu-abu: batas kecamatan' },
      { line: navy, width: 2.5, label: 'Garis biru tua tebal: kecamatan yang dipilih' },
      { line: grey, alpha: 0.45, width: 1, label: 'Garis abu-abu tipis: batas kelurahan, tampil saat peta diperbesar' }] };
  }
  /** The ranked-thirds legend in words (COPY_STYLE items 18-23, plan §2.5); the fixed bands until the thirds apply. */
  function rankedRows(rel, pk) {
    var t = T(), S = t ? t.palette({ palette: pk }).status : null;
    if (!S) return EMPTY;
    if (!(rel && rel.applied)) {
      var b = (MCD.config && MCD.config.coverageBands) || { ok: 0.5, mid: 0.2 };
      return [{ glyph: SWATCH, rgb: S.ok, label: 'Titik hijau: coverage ' + Math.round(b.ok * 100) + '% atau lebih' },
        { glyph: SWATCH, rgb: S.mid, label: 'Titik kuning: coverage ' + Math.round(b.mid * 100) + '–' + Math.round(b.ok * 100) + '%' },
        { glyph: SWATCH, rgb: S.bad, label: 'Titik merah: coverage di bawah ' + Math.round(b.mid * 100) + '%' },
        { glyph: SWATCH, rgb: S.none, label: 'Tanpa titik: tidak ada data' }];
    }
    return [{ glyph: SWATCH, rgb: S.ok, label: 'Titik hijau: sepertiga kecamatan dengan coverage tertinggi' },
      { glyph: SWATCH, rgb: S.mid, label: 'Titik kuning: sepertiga di tengah' },
      { glyph: SWATCH, rgb: S.bad, label: 'Titik merah: sepertiga dengan coverage terendah, kunjungi lebih dulu' },
      { glyph: SWATCH, rgb: S.none, label: 'Tanpa titik: tidak dinilai, sebagian besar wilayahnya di luar 15 km' }];
  }
  function legendFn(derived, ms) {
    var m = model(), t = T();
    if (!m) return EMPTY;
    var ov = ms.view === 'overview', mode = ov ? 'territory' : V.mode, pk = ms.theme === 'day' ? 'day' : (ms.theme === 'night' ? 'night' : pal(ms).key), out = [];
    var RGB = statusRGB(ms);
    var prioNote = { id: 'mx-prio-note', title: null, rows: [{ glyph: 'badge', text: '1', label: 'Angka 1–3 pada label: urutan kunjungan' }] };
    if (mode === 'territory' && t && m.terr) {
      /* the shell's legend for the kecamatan map, the same words in every section (plan A-01) */
      var groups = typeof t.legendGroups === 'function' ? safe(function () { return t.legendGroups({ ms: ms, stats: m.terr }); }) : null;
      if (Array.isArray(groups) && groups.length) {
        groups.forEach(function (g, k) { out.push(g); if (k === 0) out.push(prioNote); });
        return out;
      }
      if (m.hasLvm) {
        var relK = m.terr.relative && m.terr.relative.kecamatan;
        /* "dibandingkan antarkecamatan" only while the thirds apply; a file too small to rank uses the fixed bands */
        out.push({ id: 'mx-area', title: relK && relK.applied ? 'Titik pada label: coverage, dibandingkan antarkecamatan' : 'Titik pada label: coverage (batas tetap)', rows: rankedRows(relK, pk) });
      } else {
        out.push({ id: 'mx-area', title: 'Kecamatan', rows: [{ glyph: 'chip', label: 'Label: nama kecamatan · jumlah merchant' }],
          note: 'Setelah file LVM diimpor, setiap label mendapat titik warna coverage.' });
      }
      out.push(prioNote);
      out.push(lineGroup(pk));
      return out;
    }
    var rows = m.hasLvm ? [
      { glyph: 'circle', rgb: RGB[3], label: 'Hijau: sudah diakuisisi (ada di LVM)' },
      { glyph: 'circle', rgb: RGB[4], label: 'Kuning: sudah diakuisisi, tidak aktif bulan ini' },
      { glyph: 'circle', rgb: RGB[2], label: 'Merah: belum ada di LVM' }
    ] : [{ glyph: 'circle', rgb: RGB[1], label: 'Biru: merchant (file LVM belum diimpor)' }];
    out.push({ id: 'mx-dots', title: 'Merchant dalam 15 km', rows: rows,
      note: m.hasLvm ? 'Merah: kemungkinan besar belum diakuisisi. Mungkin terdaftar di LVM dengan nama lain.' : null });
    if (m.hasLvm) {
      /* the LVM stores that are not on the public map, at their own point (item 28), with the counts per precision */
      var loc = MCD.lvm && MCD.lvm.locationSummary ? safe(function () { return MCD.lvm.locationSummary(); }) : null;
      var lrows = [];
      if (!loc || loc.street + loc.exact > 0) lrows.push({ glyph: 'ring', rgb: RGB.lvm, label: 'Cincin tebal: toko LVM yang tidak ada di peta publik, di ' + (loc && loc.exact && !loc.street ? 'titik tepat' : 'titik jalan'), count: loc ? loc.street + loc.exact : null });
      if (!loc || loc.area > 0) lrows.push({ glyph: 'ring', rgb: RGB.lvm, alpha: 0.6, label: (lrows.length ? 'Cincin tipis: di' : 'Cincin tipis: toko LVM yang tidak ada di peta publik, di') + ' pusat kelurahan atau kecamatan, perkiraan', count: loc ? loc.area : null });
      lrows.push({ glyph: 'ring', rgb: RGB[4], label: 'Cincin kuning: tidak aktif bulan ini' });
      out.push({ id: 'mx-lvm', title: WORDS.lvmBadge, rows: lrows,
        note: m.demo ? 'Data contoh: titik buatan untuk mencoba dashboard.' : (loc && loc.fromAddress ? 'Lokasi dihitung dari alamat toko, di browser ini. Alamat tidak disimpan.' : 'File LVM tidak memuat koordinat. Titik perkiraan di tengah kelurahan.') });
    }
    if ((ms.zoom || 0) < CLUSTER_Z && V.tier !== 'all' && t && m.terr) out.push({ id: 'mx-tier-chips', title: null, rows: [{ glyph: 'chip', label: 'Label: nama kecamatan · jumlah ' + (TIER_UNIT[V.tier] || 'merchant') }],
      note: 'Perbesar peta untuk melihat setiap merchant.' });
    else if ((ms.zoom || 0) < CLUSTER_Z) out.push({ id: 'mx-cluster', title: null, rows: [{ glyph: 'ring', rgb: RGB.none, label: 'Lingkaran berangka: kelompok merchant, warnanya mengikuti status terbanyak.' }],
      note: 'Perbesar peta untuk melihat setiap titik.' });
    out.push(lineGroup(pk));
    return out;
  }

  function postureFn() {
    loadView();
    return {
      camera: V.km === 5 ? '5' : 'sme15',                       /* the "Cakupan" switch: 5 km by default */
      onRingClick: function (km) { if (DIST.indexOf(km) >= 0) setView({ km: V.km === km ? null : km }); },
      ringHint: 'Klik untuk menampilkan merchant sampai jarak ini dari Mabes TNI',
      activeRingKm: V.km || 15,
      attribution: ATTRIBUTION,
      telemetry: function () {
        var mm = model();
        if (!mm) return 'Memuat data merchant';
        if (V.mode === 'merchants') { var p = points(mm); return F().int(p.idx.length + p.off.length) + ' merchant di peta'; }
        return mm.hasLvm ? 'Coverage per kecamatan' : F().int(mm.totals ? mm.totals.potential : 0) + ' merchant dalam 15 km';
      }
    };
  }
  function selectable(kind) {
    return function (id) {
      var m = model();
      if (!m) return null;
      if (kind === 'mxPoi') { var i = +id, X = m.R.X; return i >= 0 && i < X.n && X.ok[i] ? [X.lon[i], X.lat[i]] : null; }
      if (kind === 'mxLvm') {
        var l = MCD.lvm.locationOf(id);
        if (!l) return null;
        /* an area point (pusat kelurahan or kecamatan, not the shop): the position carries approx = its precision, so the
           map's route chip can say "Titik perkiraan" (a hint for MCD.map; [lon, lat] reads as before) */
        var pos = [l.lon, l.lat];
        if (!(l.precision === 'listing' || l.precision === 'exact' || l.precision === 'jalan' || l.precision === 'kampung')) pos.approx = String(l.precision || 'area');
        return pos;
      }
      if (kind === 'mxCluster') { var c = UI.clusters && UI.clusters.byId[id]; return c ? c.position : null; }
      return null;
    };
  }
  function clusterAt(id) { return UI.clusters && UI.clusters.byId[id] || null; }

  /* ================================================================ focus (Ringkasan → a merchant, item 31) */

  function statusShows(want, c) { return want === 'all' || (want === 'notYet' ? c === 2 : (want === 'acquired' ? c === 3 || c === 4 : (want === 'inactive' ? c === 4 : true))); }
  /** revealPoi(i) → the dot view, with the filters that would hide public listing row i cleared (true when changed). */
  function revealPoi(i) {
    var m = model();
    if (!m || !(i >= 0 && i < m.R.X.n)) return false;
    loadView();
    var X = m.R.X, patch = { mode: 'merchants' }, kid = m.ids.kec[X.kec[i]];
    if (V.kec && V.kec !== kid) patch.kec = null;
    if (V.km && X.dist[i] > V.km) patch.km = null;
    if (V.cats.length && V.cats.indexOf(LCATS[X.cat[i]]) < 0) patch.cats = [];
    if (!statusShows(V.status, code(m.R, i))) patch.status = 'all';
    if (!tierShows(i)) patch.tier = 'all';
    return setView(patch);
  }
  /** revealLvm(id) → the same for an LVM store (its listing when matched, else its own point). */
  function revealLvm(id) {
    var l = MCD.lvm && MCD.lvm.locationOf ? safe(function () { return MCD.lvm.locationOf(id); }) : null;
    if (!l) return false;
    if (l.poi >= 0) return revealPoi(l.poi);
    loadView();
    var mm = safe(function () { return MCD.lvm.merchantMatch(id); }), patch = { mode: 'merchants' };
    if (V.kec && mm && V.kec !== mm.kecamatanId) patch.kec = null;
    if (V.km && kmFromCentre(l.lon, l.lat) > V.km) patch.km = null;
    if (V.cats.length && mm && V.cats.indexOf(mm.category) < 0) patch.cats = [];
    if (V.status === 'notYet' || (V.status === 'inactive' && mm && mm.active !== false)) patch.status = 'all';
    if (V.tier !== 'all') patch.tier = 'all';
    return setView(patch);
  }

  function requestMap() { LC.key = ''; if (MCD.map && MCD.map.requestRender) MCD.map.requestRender(); }
  function refreshPosture() { if (MCD.map && MCD.map.registerPosture) MCD.map.registerPosture('merchants', postureFn); }

  /* ================================================================ register */

  function register() {
    if (MCD.map && MCD.map.registerLayers) {
      MCD.map.registerLayers('merchants', layersFn);
      MCD.map.registerLegend('merchants', legendFn);
      MCD.map.registerPosture('merchants', postureFn);
      ['mxPoi', 'mxLvm', 'mxCluster'].forEach(function (k) { MCD.map.registerSelectable(k, selectable(k)); });
    }
    if (MCD.data && MCD.data.setDemo && MCD.data.keyFor && MCD.data.keyFor('lvm_kpi')) MCD.data.setDemo('lvm_kpi', demoKpi);
    /* the search provider: at load through MCD.searchProviders, else once app.js has loaded (and again at mount) */
    if (!registerSearch() && typeof W.setTimeout === 'function') W.setTimeout(registerSearch, 0);
  }
  register();

  MCD.sme = {
    HOME: HOME, CATS: CATS, CAT: CAT, DIST: DIST, BANDS: BANDS, STATUS_FILTER: STATUS_FILTER, MODES: MODES,
    GROUP_LABEL: GROUP_LABEL, WORDS: WORDS, CLUSTER_Z: CLUSTER_Z, SRC_POI: SRC_POI,
    ready: function () { return !!pois(); }, meta: meta, release: release, center: center,
    view: view, setView: setView, onView: onView, resetFilters: resetFilters, filterCount: filterCount,
    tempMode: tempMode, endTempMode: endTempMode, keepMode: keepMode,
    highlight: highlight, setHighlight: setHighlight,
    model: model, points: function () { var m = model(); return m ? points(m) : null; },
    leads: leads, leadCounts: leadCounts, leadsCsv: leadsCsv, priority: priority, priorityKec: priorityKec,
    inactive: inactive, inactiveCsv: inactiveCsv, edc: edc, kpi: kpi, demoKpi: demoKpi,
    gmapsUrl: gmapsUrl, gmapsFor: gmapsFor, kecQuery: kecQuery,
    searchMerchants: searchMerchants, registerSearch: registerSearch,
    poiInfo: poiInfo, lvmStore: lvmStore, kecName: kecName, kelName: kelName, kotaShort: kotaShort, bandIndex: bandIndex, kmFromCentre: kmFromCentre,
    maskName: maskName, storeName: storeName, pctAuto: pctAuto, download: download, clusterAt: clusterAt,
    // not a merchant (MCD.lvm's one rule): left out of the totals, lists, dots, Sasaran lists and search
    notMerchant: notMerchant, notMerchantWhy: notMerchantWhy, nonMerchantCount: nonMerchantCount,
    // distance from KCP (items 27-28)
    DIST_TIP: DIST_TIP, distanceAt: distanceAt, poiDist: poiDist, lvmDist: lvmDist, distText: distText, distTip: distTip, travelMin: travelMin,
    nearestFirst: nearestFirst, leadsNear: leadsNear, peakOn: peakOn, noTollOn: noTollOn, PREC_LABEL: PREC_LABEL, placeWords: placeWords,
    // Sasaran EDC / LVM from three factors (item 37) and the live Google re-rank (item 33, memory only)
    EDC_RULES: EDC_RULES, EDC_RULE: EDC_RULE, CROWD_PTS: CROWD_PTS, edcRule: edcRule, setEdcRule: setEdcRule, edcRuleText: function () { return EDC_RULES[RULE_ID]; },
    TIERS: TIERS, TIER_FILTER: TIER_FILTER, TICKET_WORDS: TICKET_WORDS, TICKET_LEVELS: TICKET_LEVELS, LEVEL3: LEVEL3, TICKET_GROUP: TICKET_GROUP,
    BUSY_MIN: BUSY_MIN, BIG_MIN: BIG_MIN, qualifiesEdc: qualifiesEdc, tierOfRow: tierOfRow, tiersReady: tiersReady, tierId: tierId, tierOf: tierOf, isEdcTier: isEdcTier,
    /** item 42 scope switch (read only; docs/EDC_SCORE.md §7) */
    nasionalAll: function () { return NASIONAL_ALL; },
    edcCandidates: edcCandidates, edcTierCounts: edcTierCounts, edcOf: edcOf, edcShare: edcShare, factors: factors, ticketOf: ticketOf, catWords: catWords,
    crowdOf: crowdOf, chainOf: function (i) { return chainOf(+i); }, busyOf: busyOf, wealthAt: wealthAt, wealthOfRow: wealthOfRow, googleRank: googleRank, directionsUrl: directionsUrl,
    // focus (MCD.app.focus → onAction 'focus:poi:<i>' / 'focus:lvm:<id>')
    revealPoi: revealPoi, revealLvm: revealLvm,
    /** 'area:merchants' is registered by MCD.lvm (keyed by Kemendagri id); this alias keeps older callers working. */
    areaAggregates: function (st) { return MCD.lvm && MCD.lvm.areaMerchants ? MCD.lvm.areaMerchants(st) : { level: 'kecamatan', areas: {}, ready: false }; },
    requestMap: requestMap, refreshPosture: refreshPosture
  };
})(window.MCD = window.MCD || {});
