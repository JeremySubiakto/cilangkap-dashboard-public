/* ==========================================================================
 * MCD.wealth: the engine of section 7 "Calon Prioritas" (docs/V7_SPEC.md §1.7.5 and §5, D11; COPY_STYLE_EN item 48 b).
 *
 * Places where affluent people can be met, from PUBLIC data only. Four kinds of place, each with the way in:
 *   sekolah    schools of kelas biaya Premium or Atas (data/school-students.js + data/institution-tiers.js through
 *              MCD.inst.tierOf; the V6 display rule: duplicate points and probably closed schools left out)
 *   kampus     campuses of kelas biaya Premium or Atas (data/campuses.js, main point, same tier rule)
 *   perumahan  housing projects of segment premium or menengah-atas (data/property-projects.js, eager)
 *   merchant   large-ticket merchants that are Sasaran EDC (MCD.sme: nilai belanja besar, tier 'edc' or 'naik-edc',
 *              never a national chain); public listings within 15 km only (data/sme-pois.js)
 * plus the daya beli area of each kecamatan (data/area-wealth.js: rendah 1, sedang 2, tinggi 3 bars on the kecamatan
 * chips, never a fill). No lead, no customer value and no income claim: a tier is about the fee, not the parents
 * (INSTITUTION_TIERS §1), and the area level is an aggregate estimate (AREA_WEALTH).
 *
 *   places({km, kinds})  → [{kind, id, name, lon, lat, km, kecamatanId, kelurahanId, tier?, tierLabel?, tierLevel?,
 *                          basis?, basisWords?, segment?, segmentLabel?, ticketWhy?, area: {level, score, why, of, name},
 *                          wayIn, key: {label, value, title}, rank, sub}] nearest to Mabes TNI first. id = the home id of
 *                          V7_SPEC §1.7.3: 'npsn:…' / 'app:…' (sekolah), 'pt:…' / 'osm:…' / 'ovt:…' (kampus),
 *                          'project:<id>' (perumahan), 'poi:<row>' (merchant)
 *   kecRank({km})        → [{kecamatanId, name, kota, level, score, why, bars, counts: {sekolah, kampus, perumahan,
 *                          merchant}, total}] for the kecamatan in scope (15 km: at least half inside 15 km; 30 km: at
 *                          least half inside 30 km), daya beli score first (no area row: last), then name
 *   kec(id, {km, kinds}) → one kecamatan: the same fields plus places (in chip order, nearest first) and inScope
 *   counts({km, kinds})  → {sekolah, kampus, perumahan, merchant, total, kec, tinggi, byTier}
 *   homeAction(place)    → {section, kind, id, action: 'focus:<kind>:<id>', tab, label: 'Lihat di Sekolah ›', title, run}
 *   stopOf(place)        → a fresh plan stop {id, kind, label, lon, lat} (V7_SPEC §1.7.3; no other field)
 *   byId(id, {km})       → the place with that id (any scope up to 30 km), or null
 *   areaOf(kelId, kecId) → {level, score, why, of: 'kelurahan' | 'kecamatan', name} | null · bars(kecId) → 0..3
 *   sort(list, 'near' | 'kelas', {dist}) · rankOf(place) · labelOf(place, privacyMode) · kindOf(id)
 *   state(name) · ensure(kinds) → Promise · on(fn) → off · ready(kind) · KINDS · TEXT · WAY_IN · SCOPES · version
 *
 * Rules kept here (tests/wealth-v7.test.mjs pins them):
 * - Public data only. No bank dataset of MCD.data, nothing of the masked lead list and no customer field is read. A
 *   place never carries a count of customers, an income or a lead; stopOf() passes MCD.visitPlan.checkStop.
 * - Merchants: never tier 'nasional' (item 42), never beyond 15 km (the public file stops there).
 * - Tiers come from MCD.inst.tierOf when it is loaded (its refusal rules apply); without MCD.inst a reduced reader of
 *   the tier file keeps the two rules that matter here (Premium only from a published fee, an estimate never above Atas).
 * - No storage, no network, no DOM. Data files are injected by MCD.inst.data.load or MCD.app.lazy (classic <script>,
 *   works from file://). Classic IIFE with a UMD tail (MCD.wealth in the browser, module.exports in Node).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.wealth = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var VERSION = '7.0.0';
  var HAS = Object.prototype.hasOwnProperty;
  var CENTER = [106.91329, -6.32818];                   // Mabes TNI Cilangkap, the centre of every scope ring
  var SCOPES = [15, 30];
  var MERCHANT_KM = 15;                                // data/sme-pois.js stops at 15 km
  var MERCHANT_TIERS = ['edc', 'naik-edc'];            // Sasaran EDC (and Naik ke EDC after an LVM import); never 'nasional'

  /* ------------------------------------------------------------ copy (Indonesian, COPY_DECK_ID §1–4) */

  var KINDS = [
    { id: 'sekolah', label: 'Sekolah', word: 'sekolah', on: true, section: 'schools', tab: 'Sekolah', focusKind: 'sma', planKind: 'sekolah',
      eyebrow: 'Sekolah', title: 'Sekolah dengan kelas biaya Premium atau Atas.' },
    { id: 'kampus', label: 'Kampus', word: 'kampus', on: true, section: 'campus', tab: 'Kampus', focusKind: 'pt', planKind: 'kampus',
      eyebrow: 'Kampus', title: 'Kampus dengan kelas biaya Premium atau Atas.' },
    { id: 'perumahan', label: 'Perumahan atas', word: 'perumahan', on: true, section: 'property', tab: 'KPR', focusKind: 'project', planKind: 'kpr',
      eyebrow: 'Perumahan', title: 'Proyek perumahan segmen premium dan menengah atas.' },
    { id: 'merchant', label: 'Merchant belanja besar', word: 'merchant', on: false, section: 'merchants', tab: 'Merchant', focusKind: 'poi', planKind: 'merchant',
      eyebrow: 'Merchant', title: 'Usaha dengan nilai belanja besar yang menjadi Sasaran EDC. Hanya dalam 15 km.' }
  ];
  var KIND_IDS = KINDS.map(function (k) { return k.id; });
  var KIND_BY = {};
  KINDS.forEach(function (k) { KIND_BY[k.id] = k; });

  var WAY_IN = {
    sekolah: 'Melalui yayasan dan komite sekolah, misalnya pada acara orang tua.',
    kampus: 'Melalui yayasan kampus dan acara orang tua mahasiswa.',
    perumahan: 'Melalui kantor pemasaran developer dan pengelola perumahan.',
    merchant: 'Melalui pemilik usaha, misalnya saat menawarkan EDC atau Giro.',
    kecamatan: 'Cocok untuk acara cabang di area ini.'
  };
  var TEXT = {
    title: 'Calon Prioritas',
    lede: 'Tempat dengan biaya sekolah tinggi, perumahan atas dan usaha belanja besar.',
    publicLine: 'Semua angka perkiraan dari data publik dan tidak memuat data penghasilan perorangan.',
    publicCard: 'Angka ini dari data publik agregat dan tidak memuat data penghasilan perorangan.',
    kindHead: 'Jenis tempat',
    kindLine: 'Sekolah dan kampus dengan kelas biaya Premium atau Atas.',
    merchant15: 'Merchant hanya tersedia dalam 15 km.',
    legendBars: 'Batang pada label kecamatan menunjukkan daya beli area (perkiraan): satu rendah, dua sedang, tiga tinggi.',
    empty: 'Tidak ada tempat yang cocok dengan pilihan ini. Nyalakan jenis tempat lain.',
    kecNone: 'Tidak ada tempat sasaran dalam {km} km di kecamatan ini.',
    kecNoArea: 'Daya beli area belum tersedia untuk kecamatan ini.',
    tiersLoading: 'Memuat kelas biaya…',
    tiersFailed: 'Kelas biaya tidak dapat dimuat. Coba lagi.',
    why: 'Mengapa calon Prioritas',
    wayIn: 'Cara masuk',
    route: 'Jarak & rute',
    list: 'Daftar tempat',
    kec: 'Kecamatan',
    seeList: 'Lihat daftar tempat',
    seeKec: 'Lihat tempat di kecamatan ini',
    tinggi: 'Daya beli tinggi',
    tinggiCard: 'Kecamatan daya beli tinggi',
    targets: 'Tempat sasaran',
    nearest: 'Tempat terdekat',
    sortNear: 'Terdekat dari KCP',
    sortKelas: 'Kelas tertinggi',
    sortKelasTitle: 'Premium sebelum Atas, perumahan premium sebelum menengah atas, merchant terakhir. Dalam kelas yang sama, terdekat dari KCP lebih dulu.',
    tinggiTitle: 'Kecamatan dengan daya beli tinggi (perkiraan) dalam {km} km'
  };
  var LEVEL_BARS = { rendah: 1, sedang: 2, tinggi: 3 };
  var LEVEL_WORD = { rendah: 'rendah', sedang: 'sedang', tinggi: 'tinggi' };
  var TIER_OK = { premium: { label: 'Premium', level: 4 }, atas: { label: 'Atas', level: 3 } };
  var SEGMENTS = { premium: { label: 'Premium', word: 'premium', level: 2 }, 'menengah-atas': { label: 'Menengah atas', word: 'menengah atas', level: 1 } };
  var ID_RE = {
    sekolah: /^(npsn:\d{8}|app:-?\d{1,3}\.\d{5},-?\d{1,2}\.\d{5})$/,
    kampus: /^(pt:\d{6}|osm:(node|way|relation)\/\d+|ovt:[0-9a-f]{8,40})$/,
    perumahan: /^project:[A-Za-z0-9_.-]{1,80}$/,
    merchant: /^poi:\d{1,7}$/
  };

  /* ------------------------------------------------------------ small helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function isStr(s) { return typeof s === 'string' && s.length > 0; }
  function own(o, k) { return o != null && HAS.call(o, k); }
  function mcd() { return (root && root.MCD) || {}; }
  function safe(fn, self, args) { try { return fn.apply(self || null, args || []); } catch (e) { return undefined; } }
  function g(name) { return root ? root[name] : undefined; }
  function rowsOf(name) { var G = g(name); return G && Array.isArray(G.rows) ? G : null; }
  function fmtInt(n) {
    if (!isNum(n)) return '—';
    var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? '−' + s : s;
  }
  function fmtRp(v) {
    var U = mcd().util;
    if (U && U.fmt && isFn(U.fmt.rp)) { var t = safe(U.fmt.rp, U.fmt, [v]); if (isStr(t)) return t; }
    if (!isNum(v)) return '—';
    if (v >= 1e9) return 'Rp ' + (Math.round(v / 1e8) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' M';
    if (v >= 1e6) return 'Rp ' + Math.round(v / 1e6) + ' jt';
    return 'Rp ' + fmtInt(v);
  }
  function hav(lon1, lat1, lon2, lat2) {
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function center() {
    var A = g('MCD_ADMIN_AREAS'), c = A && A.meta && A.meta.center;
    return Array.isArray(c) && isNum(c[0]) && isNum(c[1]) ? c : CENTER;
  }
  function kmOf(lon, lat) { var c = center(); return Math.round(hav(c[0], c[1], lon, lat) * 100) / 100; }
  function normKm(km) { km = +km; return km === 15 ? 15 : 30; }
  function normKinds(kinds) {
    if (kinds == null) return KIND_IDS.slice();
    var out = [];
    if (Array.isArray(kinds)) kinds.forEach(function (k) { if (own(KIND_BY, k) && out.indexOf(k) < 0) out.push(k); });
    else if (typeof kinds === 'object') KIND_IDS.forEach(function (k) { if (kinds[k]) out.push(k); });
    else if (own(KIND_BY, kinds)) out.push(kinds);
    return KIND_IDS.filter(function (k) { return out.indexOf(k) >= 0; });
  }
  function admin() { var A = g('MCD_ADMIN_AREAS'); return A && isFn(A.byId) ? A : null; }
  function kecName(id) { var A = admin(), k = A && id ? A.byId(id) : null; return k ? k.name : ''; }
  function kotaWord(kecId) {
    var A = admin(), k = A && kecId ? A.byId(kecId) : null, kota = k && A ? A.byId(k.kota) : null;
    if (!kota) return '';
    return kota.short || String(kota.name || '').replace(/^(Kota Administrasi|Kota|Kabupaten)\s+/, '');
  }

  /* ------------------------------------------------------------ daya beli area */

  function wealthFile() { var W = g('MCD_AREA_WEALTH'); return W && W.kecamatan && typeof W.kecamatan === 'object' ? W : null; }
  function areaRow(id) {
    var W = wealthFile();
    if (!W || !id) return null;
    if (isFn(W.at)) return safe(W.at, W, [id]) || null;
    return (W.kelurahan && W.kelurahan[id]) || W.kecamatan[id] || null;
  }
  /** areaOf(kelurahanId, kecamatanId) → {level, score, why, of, name} | null: the kelurahan when the file has it, else the kecamatan. */
  function areaOf(kelId, kecId) {
    var r = kelId ? areaRow(kelId) : null, of = 'kelurahan', id = kelId;
    if (!r || !own(LEVEL_BARS, r.level)) { r = kecId ? areaRow(kecId) : null; of = 'kecamatan'; id = kecId; }
    if (!r || !own(LEVEL_BARS, r.level)) return null;
    var A = admin(), rec = A && id ? A.byId(id) : null;
    return { level: r.level, score: isNum(r.score) ? r.score : null, why: isStr(r.why) ? r.why : '', of: of, name: rec ? rec.name : '' };
  }
  /** bars(kecamatanId) → 0..3 for the kecamatan chip (MAP lane: territory chip option chipBars); 0 = no area row. */
  function bars(kecId) {
    var r = kecId ? areaRow(kecId) : null;
    var W = wealthFile();
    if (!r || !W || !W.kecamatan[kecId]) return 0;
    return LEVEL_BARS[r.level] || 0;
  }

  /* ------------------------------------------------------------ the lazy files (MCD.inst.data, else MCD.app.lazy) */

  var FILES = {
    'school-students': { global: 'MCD_SCHOOL_STUDENTS', inst: 'students' },
    campuses: { global: 'MCD_CAMPUSES', inst: 'campuses' },
    'institution-tiers': { global: 'MCD_INSTITUTION_TIERS', inst: 'tiers' }
  };
  var NEEDS = { sekolah: ['institution-tiers', 'school-students'], kampus: ['institution-tiers', 'campuses'], perumahan: [], merchant: [] };
  var LOAD = {};
  var LISTENERS = [];
  function present(name) { var f = FILES[name], G = f ? g(f.global) : null; return !!(G && Array.isArray(G.rows) && G.meta); }
  function instData() { var I = mcd().inst; return I && I.data && isFn(I.data.load) && isFn(I.data.state) ? I.data : null; }
  /** state(name) → 'idle' | 'loading' | 'ready' | 'error' for 'school-students', 'campuses' and 'institution-tiers'. */
  function state(name) {
    if (!own(FILES, name)) return 'error';
    if (present(name)) return 'ready';
    var D = instData();
    if (D) { var s = safe(D.state, D, [FILES[name].inst]); if (s === 'loading' || s === 'error') return s; }
    return LOAD[name] ? LOAD[name].state : 'idle';
  }
  function emit(ev) { LISTENERS.slice().forEach(function (fn) { try { fn(ev); } catch (e) { /* a listener must not break another */ } }); }
  /** load(name) → Promise<boolean>; never rejects; one request at a time; retried after a failure. */
  function load(name) {
    if (!own(FILES, name)) return Promise.resolve(false);
    if (present(name)) return Promise.resolve(true);
    var l = LOAD[name];
    if (l && l.state === 'loading') return l.promise;
    l = LOAD[name] = { state: 'loading', promise: null };
    var D = instData(), A = mcd().app, p;
    if (D) p = Promise.resolve(safe(D.load, D, [FILES[name].inst]));
    else if (A && isFn(A.lazy)) { try { p = Promise.resolve(A.lazy(name)); } catch (e) { p = Promise.reject(e); } }
    else p = Promise.reject(new Error('no loader'));
    l.promise = p.then(function () { return present(name); }, function () { return false; }).then(function (ok) {
      l.state = ok ? 'ready' : 'error';
      IDX.sig = '';
      emit({ name: name, state: l.state });
      return ok;
    });
    emit({ name: name, state: 'loading' });
    return l.promise;
  }
  /** ensure(kinds) → Promise<{sekolah, kampus, perumahan, merchant}> (true = the kind can be listed). */
  function ensure(kinds) {
    var ks = normKinds(kinds), names = [];
    ks.forEach(function (k) { (NEEDS[k] || []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); }); });
    return Promise.all(names.map(load)).then(function () {
      var out = {};
      ks.forEach(function (k) { out[k] = ready(k); });
      return out;
    });
  }
  /** ready(kind) → true when the files of that kind are in (merchants: MCD.sme with the public listings). */
  function ready(kind) {
    if (kind === 'perumahan') return !!rowsOf('MCD_PROPERTY_PROJECTS');
    if (kind === 'merchant') return !!(smeApi() && rowsOf('MCD_SME_POIS'));
    if (kind === 'sekolah' || kind === 'kampus') return (NEEDS[kind] || []).every(present);
    return false;
  }
  /** kindState(kind) → 'ready' | 'loading' | 'error' | 'idle' (the worst of its files). */
  function kindState(kind) {
    if (kind === 'perumahan' || kind === 'merchant') return ready(kind) ? 'ready' : 'error';
    var s = (NEEDS[kind] || []).map(state);
    if (s.indexOf('error') >= 0) return 'error';
    if (s.indexOf('loading') >= 0) return 'loading';
    if (s.every(function (x) { return x === 'ready'; })) return 'ready';
    return 'idle';
  }
  function on(fn) {
    if (!isFn(fn)) return function () {};
    LISTENERS.push(fn);
    return function () { LISTENERS = LISTENERS.filter(function (f) { return f !== fn; }); };
  }

  /* ------------------------------------------------------------ kelas biaya (MCD.inst.tierOf, else a reduced reader) */

  function tierFile() { var T = g('MCD_INSTITUTION_TIERS'); return T && Array.isArray(T.rows) && T.meta ? T : null; }
  var TIX = { src: null, map: null };
  function tierRowOf(id) {
    var T = tierFile();
    if (!T) return undefined;
    if (isFn(T.byId)) { var r = safe(T.byId, T, [id]); if (r !== undefined) return r || null; }
    if (TIX.src !== T) { TIX.src = T; TIX.map = Object.create(null); T.rows.forEach(function (x) { if (x && x.id && !(x.id in TIX.map)) TIX.map[x.id] = x; }); }
    return TIX.map[id] || null;
  }
  function basisWordsOf(kind, row) {
    var camp = kind === 'kampus';
    if (row.basis === 'biaya') return (camp ? 'Dari biaya kuliah resmi' : 'Dari biaya resmi') + (isStr(row.year) ? ', ' + row.year : ' (tahun tidak disebut)');
    if (row.basis === 'jenis') return camp ? 'Dari jenis kampus' : 'Dari jenis sekolah';
    return (camp ? 'Perkiraan dari jenis kampus dan daya beli area' : 'Perkiraan dari jenis sekolah dan daya beli area');
  }
  /** tierFor(id, kind) → undefined (file not in) | {tier: 'premium'|'atas'|…|null, label, level, basis, basisWords}. */
  function tierFor(id, kind) {
    var I = mcd().inst;
    if (I && isFn(I.tierOf)) {
      var t = safe(I.tierOf, I, [id, { kind: kind }]);
      if (t !== undefined) return t ? { tier: t.tier || null, label: t.label, level: t.level || 0, basis: t.basis || null, basisWords: t.basisWords || '' } : null;
      if (!tierFile()) return undefined;
    }
    var row = tierRowOf(id);
    if (row === undefined) return undefined;
    var none = { tier: null, label: 'Belum diketahui', level: 0, basis: null, basisWords: '' };
    if (!row) return none;
    var tid = String(row.tier || '').toLowerCase();
    if (!own(TIER_OK, tid) && tid !== 'menengah' && tid !== 'reguler') return none;
    if (['biaya', 'jenis', 'perkiraan'].indexOf(row.basis) < 0) return none;
    if (tid === 'premium' && row.basis !== 'biaya') return none;            // Premium only from a published fee
    if (row.basis === 'perkiraan' && tid === 'premium') return none;        // an estimate never above Atas
    if (row.basis === 'biaya' && !(row.fee && isStr(row.fee.text))) return none;
    var lv = own(TIER_OK, tid) ? TIER_OK[tid].level : (tid === 'menengah' ? 2 : 1);
    return { tier: tid, label: own(TIER_OK, tid) ? TIER_OK[tid].label : (tid === 'menengah' ? 'Menengah' : 'Reguler'), level: lv, basis: row.basis, basisWords: basisWordsOf(kind, row) };
  }

  /* ------------------------------------------------------------ the places (one index per data signature) */

  var IDX = { sig: '', all: null, byId: null };
  function fileSig(name) { var G = g(name); return G && Array.isArray(G.rows) ? name + ':' + G.rows.length + ':' + ((G.meta && G.meta.generated) || '') : name + ':-'; }
  function signature() {
    var I = mcd().inst;
    return [fileSig('MCD_SCHOOL_STUDENTS'), fileSig('MCD_CAMPUSES'), fileSig('MCD_INSTITUTION_TIERS'), fileSig('MCD_PROPERTY_PROJECTS'),
      wealthFile() ? 'w' + ((wealthFile().meta && wealthFile().meta.generated) || 1) : 'w-', I && isFn(I.tierOf) ? 'i' : 'f'].join('|');
  }
  function locate(lon, lat) {
    var A = g('MCD_ADMIN_AREAS');
    return A && isFn(A.locate) ? safe(A.locate, A, [lon, lat]) || null : null;
  }
  function areaFields(p) {
    p.area = areaOf(p.kelurahanId, p.kecamatanId);
    return p;
  }
  function schoolPlaces(out) {
    var S = rowsOf('MCD_SCHOOL_STUDENTS');
    if (!S || !tierFile()) return;
    S.rows.forEach(function (r) {
      if (!r || !isStr(r.id) || !isNum(r.lon) || !isNum(r.lat)) return;
      if (r.duplicateOf || r.closedLikely) return;                         // V6 display rule: hidden or not counted
      var km = isNum(r.km) ? r.km : kmOf(r.lon, r.lat);
      if (km > 30) return;
      var t = tierFor(r.id, 'sekolah');
      if (!t || !own(TIER_OK, t.tier)) return;
      var a17 = isNum(r.age17) ? r.age17 : null;
      out.push(areaFields({
        kind: 'sekolah', id: r.id, name: String(r.name || '').trim() || 'Sekolah tanpa nama', lon: r.lon, lat: r.lat, km: km,
        kecamatanId: r.kecamatanId || null, kelurahanId: r.kelurahanId || null,
        tier: t.tier, tierLabel: t.label, tierLevel: t.level, basis: t.basis, basisWords: t.basisWords,
        npsn: r.npsn || null, level: r.level || null, status: r.status || null,
        sub: [r.level || 'Sekolah', r.status === 'negeri' ? 'negeri' : r.status === 'swasta' ? 'swasta' : null].filter(Boolean).join(' '),
        key: {
          label: 'Siswa 17+', value: a17 != null ? fmtInt(a17) : '—',
          approx: r.age17Source === 'perkiraan',
          title: a17 != null ? (r.age17Source === 'perkiraan' ? 'Siswa berusia 17 tahun atau lebih (perkiraan dari jumlah siswa per kelas).' : 'Siswa berusia 17 tahun atau lebih, dari Dapodik.')
            : 'Jumlah siswa 17+ belum tersedia untuk sekolah ini.'
        },
        rank: 10 - t.level, wayIn: WAY_IN.sekolah
      }));
    });
  }
  function campusWord(r) {
    var J = { universitas: 'Universitas', institut: 'Institut', 'sekolah tinggi': 'Sekolah tinggi', politeknik: 'Politeknik', akademi: 'Akademi',
      'akademi komunitas': 'Akademi komunitas', 'desain/kursus': 'Sekolah desain dan kursus' };
    return J[r.jenis] || 'Kampus';
  }
  function campusPlaces(out) {
    var C = rowsOf('MCD_CAMPUSES');
    if (!C || !tierFile()) return;
    C.rows.forEach(function (r) {
      if (!r || !isStr(r.id) || !isNum(r.lon) || !isNum(r.lat)) return;
      var km = isNum(r.km) ? r.km : kmOf(r.lon, r.lat);
      if (km > 30) return;
      var t = tierFor(r.id, 'kampus');
      if (!t || !own(TIER_OK, t.tier)) return;
      var st = r.status === 'negeri' ? 'negeri' : r.status === 'kedinasan' ? 'kedinasan' : r.status === 'swasta' ? 'swasta' : null;
      out.push(areaFields({
        kind: 'kampus', id: r.id, name: String(r.name || '').trim() + (r.short ? ' (' + r.short + ')' : ''), lon: r.lon, lat: r.lat, km: km,
        kecamatanId: r.kecamatanId || null, kelurahanId: r.kelurahanId || null,
        tier: t.tier, tierLabel: t.label, tierLevel: t.level, basis: t.basis, basisWords: t.basisWords,
        kode: r.kode || null, jenis: r.jenis || null, status: st,
        shape: r.jenis === 'universitas' || r.jenis === 'institut' ? 'shield' : 'triangle',
        sub: [campusWord(r), st].filter(Boolean).join(' '),
        key: { label: 'Mahasiswa', value: isNum(r.students) ? fmtInt(r.students) : '—',
          title: isNum(r.students) ? 'Mahasiswa per perguruan tinggi dari PDDikti, untuk seluruh kampusnya.' : 'Jumlah mahasiswa belum dilaporkan ke PDDikti.' },
        rank: 10 - t.level, wayIn: WAY_IN.kampus
      }));
    });
  }
  function projectPlaces(out) {
    var P = rowsOf('MCD_PROPERTY_PROJECTS');
    if (!P) return;
    P.rows.forEach(function (r) {
      if (!r || !isStr(r.id) || !isNum(r.lon) || !isNum(r.lat) || !own(SEGMENTS, r.segment)) return;
      var km = isNum(r.distanceKm) ? r.distanceKm : kmOf(r.lon, r.lat);
      if (km > 30) return;
      var L = locate(r.lon, r.lat), seg = SEGMENTS[r.segment];
      out.push(areaFields({
        kind: 'perumahan', id: 'project:' + r.id, projectId: r.id, name: String(r.name || '').trim() || 'Proyek tanpa nama', lon: r.lon, lat: r.lat, km: km,
        kecamatanId: L ? L.kecamatanId : null, kelurahanId: L ? L.kelurahanId : null,
        segment: r.segment, segmentLabel: seg.label, segmentWord: seg.word, priceMin: isNum(r.priceMin) ? r.priceMin : null,
        developer: isStr(r.developer) ? r.developer : null, approx: r.confidence === 'low',
        sub: 'Perumahan ' + seg.word + (r.type === 'apartment' ? ' · apartemen' : r.type === 'townhouse' ? ' · townhouse' : ''),
        key: { label: 'Harga mulai', value: isNum(r.priceMin) ? fmtRp(r.priceMin) : '—',
          title: isNum(r.priceMin) ? 'Harga indikatif dari sumber publik' + (isStr(r.priceAsOf) ? ' (' + r.priceAsOf + ')' : '') + '. Periksa ke developer sebelum dikutip.' : 'Harga belum tersedia.' },
        rank: 10 - seg.level - 2, wayIn: WAY_IN.perumahan
      }));
    });
  }
  function build() {
    var sig = signature();
    if (IDX.sig === sig && IDX.all) return IDX;
    var all = [];
    schoolPlaces(all);
    campusPlaces(all);
    projectPlaces(all);
    all.sort(function (a, b) { return a.km - b.km || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    var by = Object.create(null);
    all.forEach(function (p) { by[p.id] = p; });
    IDX = { sig: sig, all: all, byId: by };
    return IDX;
  }

  /* ---- merchants: MCD.sme's own list, read once per data version */
  function smeApi() { var S = mcd().sme; return S && isFn(S.edcCandidates) ? S : null; }
  var MIX = { key: '', list: null, byId: null };
  function merchantKey() {
    var D = mcd().data, P = rowsOf('MCD_SME_POIS');
    return [D && D.version != null ? D.version : 0, P ? P.rows.length : 0, wealthFile() ? 'w' : '-'].join('|');
  }
  function merchants() {
    var S = smeApi(), P = rowsOf('MCD_SME_POIS');
    if (!S || !P) return [];
    var key = merchantKey();
    if (MIX.key === key && MIX.list) return MIX.list;
    var list = safe(S.edcCandidates, S, [{ limit: 0, tiers: MERCHANT_TIERS }]) || [];
    var out = [], by = Object.create(null);
    list.forEach(function (c) {
      if (!c || !isNum(c.idx) || c.largeChain || MERCHANT_TIERS.indexOf(c.tier) < 0) return;    // never a national chain
      var f = c.factors || {}, tk = f.ticket || {};
      if (tk.level !== 'besar') return;
      var row = P.rows[c.idx], lon = isNum(c.lon) ? c.lon : (row && row[0]), lat = isNum(c.lat) ? c.lat : (row && row[1]);
      if (!isNum(lon) || !isNum(lat)) return;
      var km = kmOf(lon, lat);
      if (km > MERCHANT_KM + 0.05) return;
      var p = areaFields({
        kind: 'merchant', id: 'poi:' + c.idx, idx: c.idx, name: String((row && row[3]) || '').trim() || 'Usaha tanpa nama', lon: lon, lat: lat, km: km,
        kecamatanId: c.kecamatanId || null, kelurahanId: c.kelurahanId || null,
        ticketWhy: isStr(tk.why) ? tk.why : '', onLvm: c.tier === 'naik-edc',
        sub: 'Nilai belanja besar' + (isStr(tk.why) ? ' · ' + tk.why : ''),
        key: { label: 'Nilai belanja', value: 'Besar', title: 'Nilai belanja: besar' + (isStr(tk.why) ? ', ' + tk.why : '') + '. Perkiraan dari kategori usaha di peta publik.' },
        rank: 9, wayIn: WAY_IN.merchant, release: P.meta && P.meta.release ? String(P.meta.release) : null
      });
      out.push(p);
      by[p.id] = p;
    });
    out.sort(function (a, b) { return a.km - b.km || a.idx - b.idx; });
    MIX = { key: key, list: out, byId: by };
    return out;
  }

  /* ------------------------------------------------------------ public views */

  /** places({km, kinds}) → the places of those kinds within km of Mabes TNI, nearest first (km from Mabes TNI). */
  function places(o) {
    o = o || {};
    var km = normKm(o.km), ks = normKinds(o.kinds), out = [];
    if (ks.some(function (k) { return k !== 'merchant'; })) {
      build().all.forEach(function (p) { if (p.km <= km && ks.indexOf(p.kind) >= 0) out.push(p); });
    }
    if (ks.indexOf('merchant') >= 0) {
      var m = merchants().filter(function (p) { return p.km <= km; });
      if (m.length) {
        out = out.concat(m);
        out.sort(function (a, b) { return a.km - b.km || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
      }
    }
    return out;
  }
  function emptyCounts() { return { sekolah: 0, kampus: 0, perumahan: 0, merchant: 0 }; }
  /** counts({km, kinds}) → {sekolah, kampus, perumahan, merchant, total (kinds asked), kec, tinggi, byTier}. Every kind is counted
      (a chip shows its count while off); total adds only the kinds asked for. */
  function counts(o) {
    o = o || {};
    var km = normKm(o.km), ks = normKinds(o.kinds), c = emptyCounts();
    var byTier = { sekolah: { premium: 0, atas: 0 }, kampus: { premium: 0, atas: 0 }, perumahan: { premium: 0, 'menengah-atas': 0 } };
    var withM = o.merchants !== false;
    places({ km: km, kinds: withM ? KIND_IDS : ['sekolah', 'kampus', 'perumahan'] }).forEach(function (p) {
      c[p.kind] += 1;
      if (p.kind === 'perumahan') byTier.perumahan[p.segment] += 1;
      else if (p.tier && byTier[p.kind]) byTier[p.kind][p.tier] += 1;
    });
    var total = 0;
    ks.forEach(function (k) { total += c[k]; });
    var kr = kecList(km);
    c.total = total;
    c.kec = kr.length;
    c.tinggi = kr.filter(function (k) { return k.level === 'tinggi'; }).length;
    c.byTier = byTier;
    return c;
  }
  /** The kecamatan in scope: at least half of the area inside 15 km (or 30 km), as the territory zones count them. */
  function kecList(km) {
    var A = g('MCD_ADMIN_AREAS');
    if (!A || !Array.isArray(A.kecamatan)) return [];
    var share = km === 30 ? function (k) { return k.inCircle || 0; } : function (k) { return k.in15 || 0; };
    return A.kecamatan.filter(function (k) { return k && share(k) >= 0.5; }).map(function (k) {
      var W = wealthFile(), r = W && W.kecamatan[k.id];
      return { id: k.id, rec: k, level: r && own(LEVEL_BARS, r.level) ? r.level : null, score: r && isNum(r.score) ? r.score : null, why: r && isStr(r.why) ? r.why : '' };
    });
  }
  function rankCmp(a, b) {
    var x = isNum(a.score), y = isNum(b.score);
    if (x !== y) return x ? -1 : 1;
    if (x && a.score !== b.score) return b.score - a.score;
    return String(a.name).localeCompare(String(b.name), 'id');
  }
  /** kecRank({km}) → the kecamatan in scope, daya beli score first, with the place counts per kind. */
  function kecRank(o) {
    o = o || {};
    var km = normKm(o.km), per = {};
    places({ km: km, kinds: o.merchants === false ? ['sekolah', 'kampus', 'perumahan'] : KIND_IDS }).forEach(function (p) {
      if (!p.kecamatanId) return;
      (per[p.kecamatanId] = per[p.kecamatanId] || emptyCounts())[p.kind] += 1;
    });
    var ks = normKinds(o.kinds);
    return kecList(km).map(function (k) {
      var c = per[k.id] || emptyCounts(), total = 0;
      ks.forEach(function (x) { total += c[x]; });
      return { kecamatanId: k.id, name: k.rec.name, kota: kotaWord(k.id), level: k.level, score: k.score, why: k.why, bars: k.level ? LEVEL_BARS[k.level] : 0,
        counts: c, total: total };
    }).sort(rankCmp);
  }
  /** kec(id, {km, kinds}) → one kecamatan (in scope or not) with its places in chip order, nearest first, or null. */
  function kec(id, o) {
    o = o || {};
    var A = admin(), rec = A && id ? A.byId(String(id)) : null;
    if (!rec || !rec.kota || rec.kec) return null;
    var km = normKm(o.km), ks = normKinds(o.kinds), W = wealthFile(), r = W && W.kecamatan[rec.id];
    var list = places({ km: km, kinds: ks }).filter(function (p) { return p.kecamatanId === rec.id; });
    var c = emptyCounts();
    list.forEach(function (p) { c[p.kind] += 1; });
    list.sort(function (a, b) { return KIND_IDS.indexOf(a.kind) - KIND_IDS.indexOf(b.kind) || a.km - b.km; });
    var share = km === 30 ? (rec.inCircle || 0) : (rec.in15 || 0);
    var level = r && own(LEVEL_BARS, r.level) ? r.level : null;
    return { kecamatanId: rec.id, name: rec.name, kota: kotaWord(rec.id), level: level, score: r && isNum(r.score) ? r.score : null,
      why: r && isStr(r.why) ? r.why : '', bars: level ? LEVEL_BARS[level] : 0, counts: c, total: list.length, places: list, inScope: share >= 0.5,
      label: Array.isArray(rec.label) ? rec.label.slice() : null };
  }
  /** byId(id) → the place (any scope up to 30 km) or null. */
  function byId(id) {
    var s = String(id == null ? '' : id), k = kindOf(s);
    if (!k) return null;
    if (k === 'merchant') { merchants(); return (MIX.byId && MIX.byId[s]) || null; }
    return build().byId[s] || null;
  }
  /** kindOf(id) → 'sekolah' | 'kampus' | 'perumahan' | 'merchant' | null, from the home id's form. */
  function kindOf(id) {
    var s = String(id == null ? '' : id);
    for (var i = 0; i < KIND_IDS.length; i++) if (ID_RE[KIND_IDS[i]].test(s)) return KIND_IDS[i];
    return null;
  }
  /** rankOf(place) → the "Kelas tertinggi" order: Premium (6), Atas (7), perumahan premium (6), menengah atas (7), merchant (9). */
  function rankOf(p) { return p && isNum(p.rank) ? p.rank : 99; }
  /**
   * sort(list, by, {dist}) → a new array. 'near' (default): by o.dist(place) (minutes from KCP; MCD.distance in the
   * section), else km from Mabes TNI. 'kelas': rankOf first, then the same nearest order.
   */
  function sort(list, by, o) {
    o = o || {};
    var d = isFn(o.dist) ? o.dist : function (p) { return p.km; };
    var val = new Map();
    (list || []).forEach(function (p) { var v = safe(d, null, [p]); val.set(p, isNum(v) ? v : Infinity); });
    var near = function (a, b) { return val.get(a) - val.get(b) || a.km - b.km || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); };
    return (list || []).slice().sort(by === 'kelas' ? function (a, b) { return rankOf(a) - rankOf(b) || near(a, b); } : near);
  }
  /** labelOf(place, mode) → the name to show: merchants follow "Samarkan nama" like every merchant list (MCD.sme.maskName). */
  function labelOf(p, mode) {
    if (!p) return '';
    if (p.kind !== 'merchant') return p.name;
    var S = mcd().sme;
    if (S && isFn(S.maskName)) { var t = safe(S.maskName, S, [p.name, mode || 'masked']); if (isStr(t)) return t; }
    if (mode === 'veil') return p.name.split(/\s+/).filter(function (w) { return /[A-Za-z0-9]/.test(w); }).slice(0, 3).map(function (w) { return w.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() + '.'; }).join(' ') || 'Usaha';
    return p.name;
  }
  /** The tier or segment chip word: "Premium", "Atas", "Premium" (perumahan), "Menengah atas", "Belanja besar". */
  function classWord(p) {
    if (!p) return '';
    if (p.kind === 'perumahan') return p.segmentLabel;
    if (p.kind === 'merchant') return 'Belanja besar';
    return p.tierLabel || '';
  }
  /** eyebrow(place) → "SEKOLAH · PREMIUM", "KAMPUS · ATAS", "PERUMAHAN · PREMIUM", "MERCHANT · BELANJA BESAR" (as words; the UI sets the case). */
  function eyebrow(p) { return p ? KIND_BY[p.kind].eyebrow + ' · ' + classWord(p) : ''; }
  /**
   * whyLines(place) → the fold "Mengapa calon Prioritas": the class line, the area line, the public-data line.
   */
  function whyLines(p) {
    if (!p) return [];
    var out = [];
    if (p.kind === 'sekolah' || p.kind === 'kampus') {
      var bw = String(p.basisWords || '');
      out.push('Kelas biaya: ' + p.tierLabel + (bw ? ', ' + bw.charAt(0).toLowerCase() + bw.slice(1) : '') + '.');
    } else if (p.kind === 'perumahan') {
      out.push('Segmen proyek: ' + p.segmentWord + (isNum(p.priceMin) ? ', harga mulai ' + fmtRp(p.priceMin) : '') + '.');
    } else {
      out.push('Nilai belanja: besar' + (p.ticketWhy ? ', ' + p.ticketWhy : '') + '.');
    }
    out.push(p.area ? 'Daya beli area: ' + LEVEL_WORD[p.area.level] + ' (perkiraan).' : 'Daya beli area belum tersedia untuk tempat ini.');
    out.push(TEXT.publicCard);
    return out;
  }
  /** homeAction(place) → the cross-link to the place's home tab, where its full card and Tindak lanjut live (D11). */
  function homeAction(p) {
    if (!p || !own(KIND_BY, p.kind)) return null;
    var K = KIND_BY[p.kind], id;
    if (p.kind === 'sekolah') id = p.npsn || p.id;
    else if (p.kind === 'kampus') id = p.kode || p.id;
    else if (p.kind === 'perumahan') id = p.projectId;
    else id = String(p.idx);
    if (!isStr(String(id))) return null;
    var spec = { section: K.section, kind: K.focusKind, id: String(id), lon: p.lon, lat: p.lat, view: 'deep' };
    return {
      section: K.section, kind: K.focusKind, id: String(id), action: 'focus:' + K.focusKind + ':' + id, tab: K.tab,
      label: 'Lihat di ' + K.tab + ' ›', title: 'Buka tempat ini di tab ' + K.tab + '. Tindak lanjut dicatat di sana.',
      spec: spec,
      run: function () {
        var A = mcd().app;
        if (!A || !isFn(A.focus)) return false;
        return !!safe(A.focus, A, [{ section: spec.section, kind: spec.kind, id: spec.id, lon: spec.lon, lat: spec.lat, view: spec.view }]);
      }
    };
  }
  /** stopOf(place) → a fresh plan stop with no field beyond {id, kind, label, lon, lat} (MCD.visitPlan.checkStop passes it). */
  function stopOf(p) {
    if (!p || !own(KIND_BY, p.kind) || !isNum(p.lon) || !isNum(p.lat)) return null;
    return { id: p.id, kind: KIND_BY[p.kind].planKind, label: labelOf(p, 'masked'), lon: Math.round(p.lon * 1e5) / 1e5, lat: Math.round(p.lat * 1e5) / 1e5 };
  }

  return {
    version: VERSION, KINDS: KINDS, KIND_IDS: KIND_IDS, TEXT: TEXT, WAY_IN: WAY_IN, SCOPES: SCOPES, MERCHANT_KM: MERCHANT_KM, LEVEL_BARS: LEVEL_BARS,
    places: places, counts: counts, kecRank: kecRank, kec: kec, byId: byId, kindOf: kindOf, homeAction: homeAction, stopOf: stopOf,
    areaOf: areaOf, bars: bars, sort: sort, rankOf: rankOf, labelOf: labelOf, classWord: classWord, eyebrow: eyebrow, whyLines: whyLines,
    kecName: kecName, kotaWord: kotaWord, fmtRp: fmtRp, fmtInt: fmtInt,
    state: state, kindState: kindState, load: load, ensure: ensure, ready: ready, on: on,
    _pure: { hav: hav, kmOf: kmOf, tierFor: tierFor, signature: signature, reset: function () { IDX = { sig: '', all: null, byId: null }; MIX = { key: '', list: null, byId: null }; LOAD = {}; TIX = { src: null, map: null }; } }
  };
});
