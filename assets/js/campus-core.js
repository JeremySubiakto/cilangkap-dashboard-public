/* ==========================================================================
 * MCD.campus: the Kampus engine (section 4, docs/V6_SPEC.md §6; COPY_STYLE_EN item 45 b and d).
 *
 * Reads data/campuses.js (window.MCD_CAMPUSES, loaded lazily after sign-in: MCD.app.lazy('campuses'), or one
 * <script> injection of the same file when the shell has no such loader yet; never fetch, so file:// works) and
 * keeps every rule of the Kampus screens in one place, without DOM, so Node tests run it on the real file:
 *
 *   data and index   data(), ready(), state(), ensure() → Promise<boolean>, index() {rows, byId, byKode, sites,
 *                    siteById}, row(id), site(id) ('<row id>#<n>', n 1-based in row.campuses), unplaced(),
 *                    semLabel('20252') → '2025/2026 Genap', meta()
 *   words            group(row) 'univ' | 'st' | 'desain', jenisWord(row), statusWord(row), kotaWord(kecId),
 *                    kecName(kecId), GROUPS, STATUSES, TOTAL_TITLE, TENDIK_LINE
 *   D11 – D13, D20   counted(row): a PT counts once, at its main point; rows marked nationwide (distance learning)
 *                    or mainOutside (main campus outside 30 km) and the design and course schools (no register,
 *                    no count) are listed but never summed. Payroll = dosenTetap only; tendik is never a number.
 *   view(opts)       the view model of a scope and its filters: rows, sites, counts, chip counts, kecamatan
 *   summary(km)      the Ringkasan door: {n, k, students, dosen, unplaced} after the D12 rule (985.102 at 30 km)
 *   sort(rows, by)   'mhs' (default; D12 rows last, Universitas Terbuka first among them) · 'dosen' · 'near' ·
 *                    'merchant' (kantinAll.total − kantinAll.chain: never the main point's kantin alone)
 *   kantin           kantinLead(k), kantinGroups(k), chainLine(k), near(k, max) with the poi guard (§1.3: the
 *                    Merchant row exists, its name equals the listing name, its point lies within 5 m)
 *   sym              map symbols (D9): shield = universitas, institut; triangle = sekolah tinggi, politeknik,
 *                    akademi, desain dan kursus; negeri blue, swasta kuning, kedinasan abu-abu; four sizes by
 *                    mahasiswa (unknown = smallest); other campus points and mainOutside rows as empty outlines.
 *                    MCD.map.symbolSprite when it draws these shapes, else an own canvas atlas.
 *   tierOf(id)       MCD.inst.tierOf when present, else the same shape from data/institution-tiers.js
 *   contactOf(id)    MCD.inst.contactOf when present, else §5.1 for one campus row (phone string split, D17, D18,
 *                    official sources only, http(s) only, no credentials)
 *   pipeline         MCD.seal.pipeline('campus.pipeline', …) (encrypted, §6.9); without MCD.seal a list kept in
 *                    memory only (never written in plain text). Keys = the row id (pt:, osm:, ovt:).
 *   csv(rows, o)     "Ekspor daftar kampus (CSV)" (§6.7; contacts empty while names are veiled)
 *   search(q)        names and short names (UI, UNJ, IKJ)
 *
 * Classic IIFE on window.MCD, safe in Node (vm sandbox). No network: links are built, never opened.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var C = MCD.campus = MCD.campus || {};

  /* ------------------------------------------------------------ constants */

  var SRC = { campuses: 'data/campuses.js', 'institution-tiers': 'data/institution-tiers.js' };
  var GLOBAL = { campuses: 'MCD_CAMPUSES', 'institution-tiers': 'MCD_INSTITUTION_TIERS' };
  var GROUPS = [
    { id: 'univ', label: 'Universitas dan institut', jenis: ['universitas', 'institut'], title: 'Universitas dan institut yang terdaftar di PDDikti.' },
    { id: 'st', label: 'Sekolah tinggi, politeknik dan akademi', jenis: ['sekolah tinggi', 'politeknik', 'akademi', 'akademi komunitas'], title: 'Sekolah tinggi, politeknik dan akademi yang terdaftar di PDDikti.' },
    { id: 'desain', label: 'Desain dan kursus', jenis: ['desain/kursus'], title: 'Sekolah desain, seni dan kursus yang tidak terdaftar di PDDikti.' }
  ];
  var STATUSES = [
    { id: 'negeri', label: 'Negeri', title: 'Perguruan tinggi negeri.' },
    { id: 'swasta', label: 'Swasta', title: 'Perguruan tinggi swasta, dikelola yayasan.' },
    { id: 'kedinasan', label: 'Kedinasan', title: 'Kampus kedinasan dikelola kementerian atau lembaga di luar Kemdiktisaintek.' }
  ];
  var TIERS = [
    { id: 'premium', label: 'Premium', level: 4 }, { id: 'atas', label: 'Atas', level: 3 },
    { id: 'menengah', label: 'Menengah', level: 2 }, { id: 'reguler', label: 'Reguler', level: 1 },
    { id: 'unknown', label: 'Belum diketahui', level: 0 }
  ];
  var JENIS_WORD = { universitas: 'Universitas', institut: 'Institut', 'sekolah tinggi': 'Sekolah tinggi', politeknik: 'Politeknik',
    akademi: 'Akademi', 'akademi komunitas': 'Akademi komunitas', 'desain/kursus': 'Sekolah desain dan kursus' };
  var STATUS_WORD = { negeri: 'Negeri', swasta: 'Swasta', kedinasan: 'Kedinasan' };
  var KANTIN_ORDER = ['makan', 'fotokopi', 'atk', 'laundry', 'minimarket'];
  var KANTIN_WORDS = { makan: 'makan & minum', fotokopi: 'fotokopi & percetakan', atk: 'alat tulis & toko buku', laundry: 'laundry', minimarket: 'minimarket & toko kelontong' };
  var NEAR_M = 400;
  var TOTAL_TITLE = 'Jumlah mahasiswa per perguruan tinggi dari PDDikti, untuk seluruh kampusnya. Kampus pendidikan jarak jauh dan kampus dengan kampus utama di luar 30 km tidak dihitung.';
  var TENDIK_LINE = 'Jumlah tendik tidak diterbitkan PDDikti.';
  var KEY_RE = /^(pt:\d{6}|osm:(node|way|relation)\/\d+|ovt:[0-9a-f]{8,40})$/;
  var SITE_RE = /^(.+)#(\d{1,3})$/;
  var PDDIKTI_SEARCH = 'https://pddikti.kemdiktisaintek.go.id/search/{q}';

  /* Tindak lanjut (§6.6): the nine stages of Sekolah (read from MCD.schools.config.stages when present), the
     campus products and programmes. GEMPITA 2026 is a KOL referral for campus and SMA; Referral Biller is not offered. */
  var STAGES = [
    { id: 'baru', label: 'Belum dihubungi' }, { id: 'kontak', label: 'Telah dihubungi' }, { id: 'presentasi', label: 'Presentasi' },
    { id: 'proposal', label: 'Proposal' }, { id: 'pks', label: 'Negosiasi & PKS' }, { id: 'onboarding', label: 'Onboarding' },
    { id: 'aktif', label: 'Aktif' }, { id: 'ditunda', label: 'Ditunda', side: true }, { id: 'gugur', label: 'Batal', side: true }
  ];
  var PRODUCTS = [
    { id: 'PAYROLL', label: 'Payroll dosen dan tendik', short: 'Payroll' },
    { id: 'TAB', label: 'Tabungan mahasiswa (Livin’ by Mandiri)', short: 'Tabungan mahasiswa' },
    { id: 'LVM', label: 'Livin’ Merchant kantin dan koperasi', short: 'QRIS kantin' },
    { id: 'EDC', label: 'EDC Mandiri', short: 'EDC' },
    { id: 'COLL', label: 'Penagihan biaya kuliah', short: 'Penagihan biaya kuliah' }
  ];
  var PROGRAMS = [{ id: '', label: 'Belum ada' }, { id: 'GEMPITA', label: 'GEMPITA 2026' }];

  /* ------------------------------------------------------------ small helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function fmtInt(n) {
    var F = MCD.util && MCD.util.fmt;
    if (F && isFn(F.int)) return F.int(n);
    if (!isNum(n)) return '—';
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fold(s) {
    var t = String(s == null ? '' : s);
    if (isFn(t.normalize)) t = t.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return t.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function searchKey(s) { return fold(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function cap(t) { t = String(t || ''); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function sentence(t) { t = cap(String(t || '').trim()); return t && !/[.!?…]$/.test(t) ? t + '.' : t; }
  function admin() { var A = root.MCD_ADMIN_AREAS; return A && isFn(A.byId) ? A : null; }
  var KX = 110.64, KY = 110.574;
  function metres(lon1, lat1, lon2, lat2) { var dx = (lon2 - lon1) * KX, dy = (lat2 - lat1) * KY; return Math.sqrt(dx * dx + dy * dy) * 1000; }
  function today() { try { return new Date(); } catch (e) { return null; } }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  /* ------------------------------------------------------------ data and loading */

  function data() { var D = root.MCD_CAMPUSES; return D && Array.isArray(D.rows) && D.meta ? D : null; }
  var LOADS = {}, FAILED = {}, LISTENERS = [];
  function present(name) { var g = root[GLOBAL[name]]; return !!(g && Array.isArray(g.rows) && g.meta); }
  function booted() { var A = MCD.app; try { return !A || !isFn(A.isBooted) || !!A.isBooted(); } catch (e) { return false; } }
  function inject(src) {
    return new Promise(function (resolve, reject) {
      var d = root.document;
      if (!d || !isFn(d.createElement) || !d.body) { reject(new Error('no document')); return; }
      var s = d.createElement('script');
      s.src = src; s.async = false;
      s.addEventListener('load', function () { resolve(); });
      s.addEventListener('error', function () { if (s.parentNode) s.parentNode.removeChild(s); reject(new Error('Could not load ' + src)); });
      d.body.appendChild(s);
    });
  }
  /**
   * load(name) → Promise<boolean>: 'campuses' or 'institution-tiers' through MCD.app.lazy (SHELL lane, V6_SPEC §9.1);
   * while the shell has no such loader (an unknown name) the same file is injected here once, only after sign-in.
   * Never rejects: false = could not load (a later call tries again).
   */
  function load(name) {
    if (!has(SRC, name)) return Promise.resolve(false);
    if (present(name)) { FAILED[name] = false; return Promise.resolve(true); }
    if (LOADS[name]) return LOADS[name];
    var A = MCD.app, p;
    if (A && isFn(A.lazy)) {
      p = Promise.resolve().then(function () { return A.lazy(name); }).then(function () { return present(name); }, function (e) {
        var msg = String((e && e.message) || e || '');
        if (/unknown lazy/i.test(msg) && booted()) return inject(SRC[name]).then(function () { return present(name); });
        throw e;
      });
    } else if (booted()) {
      p = inject(SRC[name]).then(function () { return present(name); });
    } else p = Promise.reject(new Error('locked'));
    var out = p.then(function (ok) {
      FAILED[name] = !ok;
      if (!ok) delete LOADS[name];
      emit(name, ok);
      return !!ok;
    }, function () { FAILED[name] = true; delete LOADS[name]; emit(name, false); return false; });
    LOADS[name] = out;
    return out;
  }
  function emit(name, ok) { LISTENERS.slice().forEach(function (fn) { try { fn({ name: name, ok: !!ok }); } catch (e) { /* ignore */ } }); }
  C.load = load;
  C.ensure = function () { return load('campuses'); };
  C.ensureTiers = function () { return load('institution-tiers'); };
  /** state(name?) → 'ready' | 'loading' | 'error' | 'idle' */
  C.state = function (name) {
    name = name || 'campuses';
    if (present(name)) return 'ready';
    if (LOADS[name]) return 'loading';
    return FAILED[name] ? 'error' : 'idle';
  };
  C.on = function (fn) { if (isFn(fn)) LISTENERS.push(fn); return function () { LISTENERS = LISTENERS.filter(function (f) { return f !== fn; }); }; };
  C.data = data;
  C.meta = function () { var D = data(); return D ? D.meta : null; };

  var IX = null;
  /** index() → {D, rows, byId, byKode, sites, siteById} or null before the file is in. */
  function index() {
    var D = data();
    if (!D) return null;
    if (IX && IX.D === D) return IX;
    var byId = new Map(), byKode = new Map(), sites = [], siteById = new Map();
    D.rows.forEach(function (r, i) {
      if (!r || !r.id) return;
      byId.set(String(r.id), r);
      if (r.kode) byKode.set(String(r.kode), r);
      (Array.isArray(r.campuses) ? r.campuses : []).forEach(function (c, k) {
        if (!c || !isNum(c.lon) || !isNum(c.lat)) return;
        var s = { id: r.id + '#' + (k + 1), n: k + 1, row: r, name: c.name || ('Kampus ' + (k + 2)), lon: c.lon, lat: c.lat, km: c.km,
          coord: c.coord || null, kecamatanId: c.kecamatanId || null, kelurahanId: c.kelurahanId || null, kantin: c.kantin || null, order: i };
        sites.push(s);
        siteById.set(s.id, s);
      });
    });
    IX = { D: D, rows: D.rows, byId: byId, byKode: byKode, sites: sites, siteById: siteById };
    return IX;
  }
  C.index = index;
  C.ready = function () { return !!index(); };
  /** row(id) → the campus row for 'pt:001002', '001002' (kode), 'osm:…', 'ovt:…', or the row of a site id. */
  C.row = function (id) {
    var I = index();
    if (!I || id == null) return null;
    var s = String(id).trim();
    if (I.byId.has(s)) return I.byId.get(s);
    if (/^\d{6}$/.test(s) && I.byKode.has(s)) return I.byKode.get(s);
    var m = SITE_RE.exec(s);
    if (m && I.siteById.has(s)) return I.siteById.get(s).row;
    return null;
  };
  /** site(id) → {id, n, row, name, lon, lat, km, coord, kecamatanId, kelurahanId, kantin} for '<row id>#<n>'. */
  C.site = function (id) { var I = index(); return I && id != null ? I.siteById.get(String(id)) || null : null; };
  C.unplaced = function () { var D = data(); var u = D && D.meta && D.meta.universe && D.meta.universe.unplaced; return Array.isArray(u) ? u.slice() : []; };
  C.semLabel = function (code) { var D = data(), s = D && D.meta && D.meta.semesters; return code != null && s && s[code] ? s[code] : null; };
  C.pddiktiUrl = function (name) {
    var D = data(), t = (D && D.meta && typeof D.meta.pddiktiSearchUrl === 'string') ? D.meta.pddiktiSearchUrl : PDDIKTI_SEARCH;
    if (!/^https:\/\/pddikti\.kemdiktisaintek\.go\.id\//.test(t) || t.indexOf('{q}') < 0) t = PDDIKTI_SEARCH;
    return t.replace('{q}', encodeURIComponent(String(name || '').trim()));
  };

  /* ------------------------------------------------------------ words */

  function group(r) { var j = r && r.jenis; return j === 'universitas' || j === 'institut' ? 'univ' : j === 'desain/kursus' ? 'desain' : 'st'; }
  function isDesain(r) { return !!r && r.jenis === 'desain/kursus'; }
  /** D12 / D13: a PT is summed only when it is not distance learning, its main campus is inside 30 km and it is in PDDikti. */
  function counted(r) { return !!r && !isDesain(r) && !r.nationwide && !r.mainOutside; }
  function excludedWhy(r) { return !r ? null : isDesain(r) ? 'desain' : r.nationwide ? 'nationwide' : r.mainOutside ? 'mainOutside' : null; }
  C.GROUPS = GROUPS.map(function (g) { return Object.assign({}, g, { jenis: g.jenis.slice() }); });
  C.STATUSES = STATUSES.map(function (s) { return Object.assign({}, s); });
  C.TIERS = TIERS.map(function (t) { return Object.assign({}, t); });
  C.TOTAL_TITLE = TOTAL_TITLE;
  C.TENDIK_LINE = TENDIK_LINE;
  C.KEY_RE = KEY_RE;
  C.NEAR_M = NEAR_M;
  C.group = group;
  C.isDesain = isDesain;
  C.counted = counted;
  C.excludedWhy = excludedWhy;
  C.jenisWord = function (r) { return r ? (JENIS_WORD[r.jenis] || cap(r.jenis)) : ''; };
  C.statusWord = function (r) { return r ? (STATUS_WORD[r.status] || cap(r.status)) + (r.statusInferred ? ' (perkiraan)' : '') : ''; };
  C.kecName = function (id) { var A = admin(), r = id && A ? A.byId(id) : null; return r ? r.name : (id || ''); };
  C.kelName = function (id) { var A = admin(), r = id && A ? A.byId(id) : null; return r ? r.name : null; };
  /** 'Kota Depok', 'Jakarta Timur', 'Kab. Bogor' for a kecamatan id. */
  C.kotaWord = function (kecId) {
    var A = admin(), k = kecId && A ? A.byId(kecId) : null, kota = k && A ? A.byId(k.kota) : null;
    if (!kota) return '';
    var short = kota.short || String(kota.name || '').replace(/^(Kota Administrasi|Kota|Kabupaten)\s+/, '');
    return kota.kind === 'kabupaten' ? 'Kab. ' + short : kota.kind === 'kota' ? 'Kota ' + short : short;
  };
  /** 'Universitas · Negeri · Kota Depok' (callout and card eyebrow, upper-cased by the caller). */
  C.eyebrow = function (r) {
    if (!r) return '';
    var j = isDesain(r) ? 'Desain dan kursus' : C.jenisWord(r);
    return [j, C.statusWord(r), C.kotaWord(r.kecamatanId)].filter(Boolean).join(' · ');
  };

  /* ------------------------------------------------------------ kantin and merchants around a campus */

  function kantinWords() { var D = data(), g = D && D.meta && D.meta.kantinGroups; return g && typeof g === 'object' ? g : KANTIN_WORDS; }
  C.kantinWord = function (key) { var w = kantinWords(); return w[key] || KANTIN_WORDS[key] || key; };
  /** The opening words follow kantin.scope (§6.5): inside an OSM campus outline, or 400 m around the point. */
  C.kantinLead = function (k) { return k && k.scope === 'kampus' ? 'Di dalam kampus dan 400 m di sekitarnya:' : 'Dalam 400 m dari titik kampus:'; };
  /** [{key, n, word}] for the groups above 0, in the order of meta.kantinGroups. */
  C.kantinGroups = function (k) {
    if (!k) return [];
    return KANTIN_ORDER.filter(function (g) { return isNum(k[g]) && k[g] > 0; }).map(function (g) { return { key: g, n: k[g], word: C.kantinWord(g) }; });
  };
  C.kantinText = function (k) { return C.kantinGroups(k).map(function (g) { return fmtInt(g.n) + ' ' + g.word; }).join(' · '); };
  C.chainLine = function (k) { return k && isNum(k.chain) && k.chain > 0 ? fmtInt(k.chain) + ' di antaranya jaringan nasional (lewat kantor pusat).' : ''; };
  /** Ranking value of "Merchant sekitar" (meta.notes.kantinRank): businesses around every point of the PT, without chains. */
  C.kantinRank = function (r) { var a = r && r.kantinAll; return a && isNum(a.total) ? Math.max(0, a.total - (isNum(a.chain) ? a.chain : 0)) : 0; };
  /**
   * poiGuard(tuple) → the MCD_SME_POIS row index, or null (§1.3): the index points into release 2026-09-23.1 of
   * data/sme-pois.js; it links only when that row exists, its name (index 3) equals the listing name after trimming
   * and case-folding, and its point lies within 5 m. A rebuilt Merchant file without a rebuilt campus file hides the link.
   */
  function poiGuard(t) {
    if (!Array.isArray(t) || t.length < 8 || !isNum(t[7])) return null;
    var P = root.MCD_SME_POIS, rows = P && P.rows, i = t[7];
    if (!rows || i < 0 || i >= rows.length || (i | 0) !== i) return null;
    var row = rows[i];
    if (!Array.isArray(row) || !isNum(row[0]) || !isNum(row[1])) return null;
    if (fold(row[3]) !== fold(t[0]) || !fold(t[0])) return null;
    if (metres(row[0], row[1], t[1], t[2]) > 5) return null;
    return i;
  }
  C.poiGuard = poiGuard;
  /** near(kantin, max) → [{name, lon, lat, cat, group, groupWord, m, chain, poi}] (poi only when the guard passes). */
  C.near = function (k, max) {
    var list = k && Array.isArray(k.near) ? k.near : [];
    return list.slice(0, isNum(max) ? max : 5).filter(function (t) { return Array.isArray(t) && t[0] && isNum(t[1]) && isNum(t[2]); }).map(function (t) {
      return { name: String(t[0]), lon: t[1], lat: t[2], cat: t[3] || null, group: t[4] || null, groupWord: t[4] ? C.kantinWord(t[4]) : '',
        m: isNum(t[5]) ? t[5] : null, chain: t[6] === 1, poi: poiGuard(t) };
    });
  };

  /* ------------------------------------------------------------ tiers (kelas biaya, §4.1) */

  function tiersData() { var T = root.MCD_INSTITUTION_TIERS; return T && Array.isArray(T.rows) && T.meta ? T : null; }
  var TIER_IX = { T: null, m: null };
  function tierRow(id) {
    var T = tiersData();
    if (!T || id == null) return null;
    if (isFn(T.byId)) { try { return T.byId(String(id)) || null; } catch (e) { /* own index below */ } }
    if (TIER_IX.T !== T) { var m = new Map(); T.rows.forEach(function (r) { if (r && r.id) m.set(String(r.id), r); }); TIER_IX = { T: T, m: m }; }
    return TIER_IX.m.get(String(id)) || null;
  }
  function tierMeta(label) {
    var T = tiersData(), list = T && Array.isArray(T.meta.tiers) ? T.meta.tiers : null, lab = String(label || '').toLowerCase();
    var hit = list ? list.filter(function (t) { return String(t.label || '').toLowerCase() === lab || t.id === lab; })[0] : null;
    if (hit) return { id: hit.id, label: hit.label, level: hit.level };
    var own = TIERS.filter(function (t) { return t.id === lab || t.label.toLowerCase() === lab; })[0];
    return own && own.id !== 'unknown' ? { id: own.id, label: own.label, level: own.level } : null;
  }
  /** The campus words of §4.1 for one tier row. */
  function basisWords(r) {
    if (!r) return '';
    var T = tiersData(), types = T && T.meta && T.meta.types && T.meta.types.kampus;
    if (r.basis === 'biaya') return r.year ? 'Dari biaya kuliah resmi, ' + r.year : 'Dari biaya resmi (tahun tidak disebut)';
    if (r.basis === 'jenis') return 'Dari jenis kampus: ' + ((types && types[r.type]) || r.type || 'kampus');
    if (r.basis === 'perkiraan') return 'Perkiraan dari jenis kampus dan daya beli area' + (r.area ? ' (' + r.area + ')' : '');
    return '';
  }
  /**
   * tierOf(id) → {tier, label, level, basis, basisWords, check, checkWords, fee, year, url, quote, fetched, note, source}
   * (§4.1). MCD.inst.tierOf when the INSTITUSI lane is loaded; otherwise the same shape from the tiers file.
   * undefined while data/institution-tiers.js is not in (the caller shows its loading state).
   */
  C.tierOf = function (id) {
    var I = MCD.inst;
    if (I && isFn(I.tierOf)) { try { var t0 = I.tierOf(id); if (t0 !== undefined) return t0; } catch (e) { /* own below */ } }
    var T = tiersData();
    if (!T) return undefined;
    var r = tierRow(id), tm = r ? tierMeta(r.tier) : null;
    if (!r || !tm) return { tier: null, label: 'Belum diketahui', level: 0, basis: null, basisWords: '', check: null, checkWords: '', fee: null, year: null, url: null, quote: null, fetched: null, note: null, source: null };
    var cw = r.check && T.meta.checkWords ? T.meta.checkWords[r.check] : null;
    return { tier: tm.id, label: tm.label, level: tm.level, basis: r.basis || null, basisWords: basisWords(r), check: r.check || null,
      checkWords: cw ? sentence(cw) : '', fee: r.fee || null, year: r.year == null ? null : r.year, url: typeof r.url === 'string' && /^https?:\/\//.test(r.url) ? r.url : null,
      quote: r.quote ? String(r.quote).slice(0, 160) : null, fetched: r.fetched || null, note: r.note || null, source: r.url ? 'situs resmi kampus' : null };
  };
  /** tierId(id) → 'premium' | 'atas' | 'menengah' | 'reguler' | 'unknown', or undefined while the tiers are not in. */
  C.tierId = function (id) { var t = C.tierOf(id); return t === undefined ? undefined : (t && t.tier) || 'unknown'; };
  C.tierText = function (kind) {
    var T = tiersData(), list = T && Array.isArray(T.meta.tiers) ? T.meta.tiers : [];
    return list.map(function (t) { return { id: t.id, label: t.label, level: t.level, text: t.text ? (kind === 'sekolah' ? t.text.sekolah : t.text.kampus) : '' }; });
  };
  /** How many campuses in this list have a published fee (basis 'biaya', duplicate points not counted). */
  C.feeCount = function (rows) {
    var n = 0;
    (rows || []).forEach(function (r) { var t = tierRow(r.id); if (t && t.basis === 'biaya' && !t.duplicateOf) n++; });
    return n;
  };

  /* ------------------------------------------------------------ contacts (§5.1, fallback without MCD.inst) */

  var SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|blogspot\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|linktr\.ee|wordpress\.com|sites\.google\.com|wixsite\.com)$/i;
  /** safeUrl(v) → {url, host, https, social} for an http(s) address with a dotted host and no credentials, else null. */
  function safeUrl(v) {
    if (typeof v !== 'string' || !v.trim()) return null;
    var U = root.URL;
    if (!isFn(U)) return null;
    var u;
    try { u = new U(v.trim()); } catch (e) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    var host = String(u.hostname || '').toLowerCase();
    if (!host || host.indexOf('.') < 0 || /[^a-z0-9.-]/.test(host)) return null;
    return { url: u.href, host: host.replace(/^www\./, ''), https: u.protocol === 'https:', social: SOCIAL.test(host) };
  }
  /** phonesOf(string, {mobile}) → [{display, tel, mobile, noArea}] (§5.1; D18: no tel: without an area code). */
  function phonesOf(value, o) {
    o = o || {};
    /* integration 22 Oct 2026: one rule for every screen. MCD.inst.phonesOf when it is loaded; this copy keeps its
       tel rule (62 counts as the country code only with '+' or at 10 digits or more, then dials as tel:+62…) */
    var I = root.MCD && root.MCD.inst;
    if (!o.keepMobile && I && typeof I.phonesOf === 'function') {
      try { return I.phonesOf(value, { mobile: !!o.mobile }).map(function (x) { return { display: x.display, tel: x.tel, mobile: x.mobile, noArea: x.noArea }; }); } catch (e) { /* own rule below */ }
    }
    if (Array.isArray(value)) {
      return value.map(function (p) { return p && typeof p === 'object' ? phonesOf(String(p.number || ''), { mobile: !!p.mobile, keepMobile: true })[0] : null; }).filter(Boolean);
    }
    if (typeof value !== 'string' || !value.trim()) return [];
    var parts = value.split(/\s*(?:[,;\/\\]|\batau\b|\bdan\b)\s*/i).map(function (s) { return s.trim(); }).filter(Boolean), out = [];
    parts.forEach(function (p) {
      /* "021-5772275 ext 7733" keeps the main number; "021-71004870-71" (a range) keeps the first one */
      p = p.replace(/\s*\b(ext|psw|pes)\b\.?.*$/i, '').replace(/^(telp?|tel|hp|fax)\.?\s*:?\s*/i, '').replace(/(\d{6,})\s*-\s*\d{1,3}$/, '$1').trim();
      if (!p || /[^0-9+()\-.\s]/.test(p)) return;
      var digits = p.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return;
      var plus = /^\s*\+/.test(p);
      var tel = plus ? (/^0/.test(digits) ? 'tel:' + digits : 'tel:+' + digits)
        : /^0/.test(digits) ? 'tel:' + digits : (/^62/.test(digits) && digits.length >= 10 ? 'tel:+' + digits : null);
      var noArea = !tel;
      var mob = o.keepMobile ? !!o.mobile : !!(o.mobile && /^(08|628)/.test(digits));
      if (out.some(function (x) { return x.digits === digits; })) return;
      out.push({ display: p.replace(/\s+/g, ' '), tel: tel, mobile: mob, noArea: noArea, digits: digits });
    });
    return out.map(function (x) { return { display: x.display, tel: x.tel, mobile: x.mobile, noArea: x.noArea }; });
  }
  function mailOf(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim().toLowerCase();
    if (!s || /[\s<>"'`]/.test(s) || s.split('@').length !== 2) return null;
    var p = s.split('@');
    if (!p[0] || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(p[1])) return null;
    return s;
  }
  /* sites the data marks 'ok' that a later check found parked; shown as 'dibuang' until data/campuses.js is rebuilt */
  C.WEB_PARKED = { 'ovt:78704605978f': 'Italian Fashion School' };
  C.safeUrl = safeUrl;
  C.phonesOf = phonesOf;
  C.mailOf = mailOf;
  /**
   * contactOf(id) → the §5.1 shape for a campus row: {id: {kind: 'Kode PT', value} | null, phones, email, emailDropped,
   * website: {url, host, https, social, checked, link, src} | null, websiteDropped, akreditasi, address, officialName,
   * refUrl, refLabel}. Phone and e-mail only from PDDikti (src 'pddikti'); a website only as the data lane kept it,
   * a link only after webCheck ok, dialihkan or belum (D17).
   */
  C.contactOf = function (id) {
    var I = MCD.inst;
    if (I && isFn(I.contactOf)) { try { var c0 = I.contactOf(id); if (c0) return c0; } catch (e) { /* own below */ } }
    var r = C.row(id);
    if (!r) return null;
    var src = r.src || {}, D = data(), gen = (D && D.meta && D.meta.generated) || null;
    var phones = src.phone === 'pddikti' ? phonesOf(r.phone, { mobile: !!r.mobile }).map(function (p) { p.src = 'pddikti'; return p; }) : [];
    var em = src.email === 'pddikti' ? mailOf(r.email) : null;
    /* integration 22 Oct 2026: a parked domain the data still marks 'ok' (same list as MCD.inst, V6_SPEC §14.4) */
    var parked = Object.prototype.hasOwnProperty.call(C.WEB_PARKED, r.id);
    var w = parked ? null : safeUrl(r.website), ok = /^(ok|dialihkan|belum)$/.test(String(r.webCheck || ''));
    var srcW = src.website;
    if (w && (srcW === 'osm' || srcW === 'overture' || srcW === 'pddikti-email') && !/^(ok|dialihkan)$/.test(String(r.webCheck || ''))) w = null;
    var website = w ? { url: w.url, host: w.host, https: w.https, social: w.social, checked: r.webCheck || null, link: ok, src: srcW || null } : null;
    return {
      id: r.kode ? { kind: 'Kode PT', value: String(r.kode) } : null,
      phones: phones, email: em ? { value: em, src: 'pddikti' } : null, emailDropped: false,
      website: website, websiteDropped: parked || r.webCheck === 'dibuang',
      websiteDroppedText: parked ? 'Alamat situs lembaga ini tidak ditampilkan karena tidak lagi aktif sebagai situs lembaga.' : null,
      akreditasi: r.akreditasi || null, address: r.address ? String(r.address) + (r.postcode ? ' ' + r.postcode : '') : null,
      officialName: null, fetched: gen,
      refUrl: r.kode ? C.pddiktiUrl(r.name) : null, refLabel: r.kode ? 'Cari di PDDikti' : null
    };
  };
  /** The words of a website source (§5.1). */
  C.srcWords = function (code) {
    return code === 'pddikti' ? 'PDDikti · 18 Okt 2026' : code === 'pddikti-email' ? 'Domain e-mail resmi di PDDikti'
      : code === 'osm' ? 'OpenStreetMap, diperiksa 18 Okt 2026' : code === 'overture' ? 'Overture Maps, diperiksa 18 Okt 2026' : '';
  };

  /* ------------------------------------------------------------ the view model */

  function allOn(o, ids) { return !o || ids.every(function (k) { return o[k] !== false; }); }
  /**
   * view(o) → the Kampus screens' numbers for one scope and its filters.
   *   o: {km: 5 | 15 | 30, show: {univ, st, desain}, status: {negeri, swasta, kedinasan}, tiers: {premium, atas, menengah,
   *       reguler, unknown}, tierId: fn(id) → tier id or undefined (tiers not in: the kelas biaya filter waits)}
   *   → {km, rows, sites, n (PT), k (design and course schools), students, dosen, stuN, dosenN, noStudents, noDosen,
   *      excluded {nationwide, mainOutside}, byStatus, chips {group, status, tier} (each counted without its own
   *      filter), kec {id: {id, name, kota, n, k, students, dosen, rows}}, kecList, tierReady}
   */
  C.view = function (o) {
    o = o || {};
    var I = index();
    if (!I) return null;
    var km = o.km === 5 || o.km === 15 ? o.km : 30;
    var show = o.show || {}, status = o.status || {}, tiers = o.tiers || null;
    var tierFn = isFn(o.tierId) ? o.tierId : C.tierId;
    var tierOn = !!tiers && !allOn(tiers, ['premium', 'atas', 'menengah', 'reguler', 'unknown']);
    var tierReady = false;
    var v = { km: km, rows: [], sites: [], n: 0, k: 0, students: 0, dosen: 0, stuN: 0, dosenN: 0, noStudents: 0, noDosen: 0,
      excluded: { nationwide: 0, mainOutside: 0 }, byStatus: { negeri: 0, swasta: 0, kedinasan: 0 },
      chips: { group: { univ: 0, st: 0, desain: 0 }, status: { negeri: 0, swasta: 0, kedinasan: 0 }, tier: { premium: 0, atas: 0, menengah: 0, reguler: 0, unknown: 0 } },
      kec: {}, kecList: [], tierFilter: tierOn, tierReady: false };
    var tierCache = {};
    function tierOfRow(r) {
      if (has(tierCache, r.id)) return tierCache[r.id];
      var t = tierFn(r.id);
      if (t !== undefined) tierReady = true;
      tierCache[r.id] = t;
      return t;
    }
    function passGroup(r) { return show[group(r)] !== false; }
    function passStatus(r) { return status[r.status] !== false; }
    function passTier(r) {
      if (!tierOn) return true;
      var t = tierOfRow(r);
      if (t === undefined) return true;
      return tiers[t || 'unknown'] !== false;
    }
    I.rows.forEach(function (r) {
      if (!r || !isNum(r.km) || r.km > km) return;
      var g = passGroup(r), s = passStatus(r), t = passTier(r);
      if (s && t) v.chips.group[group(r)]++;
      if (g && t) v.chips.status[r.status] = (v.chips.status[r.status] || 0) + 1;
      if (g && s) { var tt = tierOfRow(r); if (tt !== undefined) v.chips.tier[tt || 'unknown']++; }
      if (!(g && s && t)) return;
      v.rows.push(r);
      if (isDesain(r)) v.k++;
      else { v.n++; v.byStatus[r.status] = (v.byStatus[r.status] || 0) + 1; }
      if (r.nationwide) v.excluded.nationwide++;
      else if (r.mainOutside) v.excluded.mainOutside++;
      if (!isDesain(r) && r.students == null) v.noStudents++;
      if (!isDesain(r) && r.dosenTetap == null) v.noDosen++;
      var c = counted(r);
      if (c && isNum(r.students)) { v.students += r.students; v.stuN++; }
      if (c && isNum(r.dosenTetap)) { v.dosen += r.dosenTetap; v.dosenN++; }
      var kid = r.kecamatanId;
      if (kid) {
        var a = v.kec[kid] || (v.kec[kid] = { id: kid, name: C.kecName(kid), kota: C.kotaWord(kid), n: 0, k: 0, students: 0, dosen: 0, stuN: 0, rows: [] });
        a.rows.push(r);
        if (isDesain(r)) a.k++; else a.n++;
        if (c && isNum(r.students)) { a.students += r.students; a.stuN++; }
        if (c && isNum(r.dosenTetap)) a.dosen += r.dosenTetap;
      }
    });
    /* other campus points of a PT: drawn when the point itself lies in the scope and its PT passes the filters */
    I.sites.forEach(function (s) { if (isNum(s.km) && s.km <= km && passGroup(s.row) && passStatus(s.row) && passTier(s.row)) v.sites.push(s); });
    v.kecList = Object.keys(v.kec).map(function (id) { return v.kec[id]; })
      .sort(function (a, b) { return (b.students - a.students) || (b.n + b.k - a.n - a.k) || (a.name < b.name ? -1 : 1); });
    v.tierReady = tierReady;
    v.sig = [km, JSON.stringify(show), JSON.stringify(status), JSON.stringify(tiers || {}), tierReady ? 1 : 0, v.rows.length, v.sites.length].join('|');
    return v;
  };

  /** summary(km) → {n, k, students, dosen, unplaced} for the Ringkasan door (no filters; D12 totals). */
  C.summary = function (km) {
    var v = C.view({ km: km === 5 || km === 15 ? km : 30, tierId: function () { return undefined; } });
    if (!v) return null;
    return { km: v.km, n: v.n, k: v.k, students: v.students, dosen: v.dosen, unplaced: C.unplaced().length, title: TOTAL_TITLE };
  };

  /* ------------------------------------------------------------ sorting */

  function d12Rank(r) { return r.nationwide ? 2 : r.mainOutside ? 3 : 0; }
  function numDesc(a, b) { var x = isNum(a), y = isNum(b); if (x !== y) return x ? -1 : 1; return x ? b - a : 0; }
  /**
   * sort(rows, by, {dist: fn(row) → minutes | Infinity}) → a new array.
   *   'mhs'   mahasiswa terbanyak; rows without a count after them; then the nationwide rows (Universitas Terbuka first
   *           among them, by students) and the mainOutside rows last (D12)
   *   'dosen' dosen tetap terbanyak, D12 rows last as well
   *   'near'  terdekat dari KCP (minutes from o.dist, ties by km from the Mabes TNI centre)
   *   'merchant' merchant sekitar terbanyak (kantinRank)
   */
  C.sort = function (rows, by, o) {
    o = o || {};
    var list = (rows || []).slice(), dist = isFn(o.dist) ? o.dist : function (r) { return isNum(r.km) ? r.km : Infinity; };
    var pos = new Map();
    list.forEach(function (r, i) { pos.set(r, i); });
    function tie(a, b) { return (a.km - b.km) || (pos.get(a) - pos.get(b)); }
    if (by === 'near') {
      var dv = new Map();
      list.forEach(function (r) { var d = dist(r); dv.set(r, isNum(d) ? d : Infinity); });
      return list.sort(function (a, b) { return (dv.get(a) - dv.get(b)) || tie(a, b); });
    }
    if (by === 'merchant') return list.sort(function (a, b) { return (C.kantinRank(b) - C.kantinRank(a)) || tie(a, b); });
    var key = by === 'dosen' ? 'dosenTetap' : 'students';
    var alt = by === 'dosen' ? 'students' : 'dosenTetap';
    return list.sort(function (a, b) {
      var ra = d12Rank(a), rb = d12Rank(b);
      if (ra !== rb) return ra - rb;
      return numDesc(a[key], b[key]) || numDesc(a[alt], b[alt]) || tie(a, b);
    });
  };
  C.SORTS = [
    { v: 'mhs', label: 'Mahasiswa terbanyak' }, { v: 'dosen', label: 'Dosen terbanyak' },
    { v: 'near', label: 'Terdekat dari KCP' }, { v: 'merchant', label: 'Merchant sekitar terbanyak' }
  ];

  /* ------------------------------------------------------------ symbols (D9) */

  var SYM = C.sym = C.sym || {};
  var SIZE_STEPS = [2000, 10000, 30000];
  var BASE_PX = [12, 15, 19, 24];        // icon size at zoom 13 per step (under 2.000 · 2.000–9.999 · 10.000–29.999 · 30.000+)
  var HOLLOW_PX = 11;
  var ZOOM_F = [[9, 0.72], [11, 0.86], [13, 1], [15, 1.22], [17, 1.45]];
  /* canvas sprite colours (the one place with raw colours, as schools-map.js): negeri Mandiri blue, swasta amber,
     kedinasan grey; a keyline that separates the symbol from the base map and a faint outer edge */
  var COLOURS = {
    day: { negeri: [11, 95, 176], swasta: [226, 150, 12], kedinasan: [104, 116, 134], keyline: [255, 255, 255], edge: [24, 34, 52], edgeA: 0.42 },
    night: { negeri: [84, 152, 238], swasta: [242, 178, 52], kedinasan: [158, 168, 184], keyline: [9, 14, 26], edge: [9, 14, 26], edgeA: 0.9 }
  };
  var SHAPES = ['shield', 'triangle'], TONES = ['negeri', 'swasta', 'kedinasan'];
  var CELL = 64;
  function themeOf(t) { return t === 'day' ? 'day' : 'night'; }
  SYM.STEPS = SIZE_STEPS.slice();
  SYM.sizeStep = function (n) { return !isNum(n) || n < SIZE_STEPS[0] ? 0 : n < SIZE_STEPS[1] ? 1 : n < SIZE_STEPS[2] ? 2 : 3; };
  /** spec(row, {hollow}) → {shape, tone, hollow, step, key, glyph}. hollow: another campus point of the PT, or a row
      whose main campus lies outside 30 km (both at the smallest size). */
  SYM.spec = function (r, o) {
    o = o || {};
    var shape = r && (r.jenis === 'universitas' || r.jenis === 'institut') ? 'shield' : 'triangle';
    var tone = r && (r.status === 'negeri' || r.status === 'kedinasan') ? r.status : 'swasta';
    var hollow = !!(o.hollow || (r && r.mainOutside));
    var step = hollow ? 0 : SYM.sizeStep(r ? r.students : null);
    return { shape: shape, tone: tone, hollow: hollow, step: step, key: shape + '-' + tone + (hollow ? '-h' : ''), glyph: shape === 'shield' ? 'shield' : 'triangle' };
  };
  function zoomF(z) {
    if (!isNum(z)) return 1;
    if (z <= ZOOM_F[0][0]) return ZOOM_F[0][1];
    for (var i = 1; i < ZOOM_F.length; i++) { var a = ZOOM_F[i - 1], b = ZOOM_F[i]; if (z <= b[0]) return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); }
    return ZOOM_F[ZOOM_F.length - 1][1];
  }
  SYM.px = function (spec, zoom) { var base = spec && spec.hollow ? HOLLOW_PX : BASE_PX[(spec && spec.step) || 0]; return Math.round(base * zoomF(zoom) * 10) / 10; };
  SYM.colours = function (theme) { var c = COLOURS[themeOf(theme)], out = {}; Object.keys(c).forEach(function (k) { out[k] = Array.isArray(c[k]) ? c[k].slice() : c[k]; }); return out; };
  SYM.rgb = function (tone, theme) { var c = COLOURS[themeOf(theme)]; return (c[tone] || c.swasta).slice(); };
  SYM.KEYS = [];
  SHAPES.forEach(function (s) { TONES.forEach(function (t) { SYM.KEYS.push(s + '-' + t); SYM.KEYS.push(s + '-' + t + '-h'); }); });
  function specOfKey(k) { var p = String(k).split('-'); return { shape: p[0], tone: p[1], hollow: p[2] === 'h', step: 0, key: k }; }
  SYM.words = function (r) {
    if (!r) return '';
    var j = isDesain(r) ? 'Sekolah desain dan kursus' : C.jenisWord(r);
    return j + ' ' + String(C.statusWord(r)).toLowerCase();
  };
  function css(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }
  /** The two shapes as paths in a box of radius r around (cx, cy): a shield and a triangle pointing up. */
  function shapePath(ctx, shape, cx, cy, r) {
    ctx.beginPath();
    if (shape === 'shield') {
      var w = r * 0.86, top = cy - r * 0.88;
      ctx.moveTo(cx - w, top);
      ctx.lineTo(cx + w, top);
      ctx.lineTo(cx + w, cy - r * 0.02);
      ctx.quadraticCurveTo(cx + w, cy + r * 0.62, cx, cy + r);
      ctx.quadraticCurveTo(cx - w, cy + r * 0.62, cx - w, cy - r * 0.02);
      ctx.closePath();
    } else {
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.96, cy + r * 0.74);
      ctx.lineTo(cx - r * 0.96, cy + r * 0.74);
      ctx.closePath();
    }
  }
  /** One sprite in a CELL × CELL box at (ox, oy): faint edge, keyline, the fill (or a coloured outline when hollow). */
  function drawSprite(ctx, ox, oy, spec, theme) {
    var c = COLOURS[themeOf(theme)], cx = ox + CELL / 2, cy = oy + CELL / 2 + (spec.shape === 'triangle' ? 3 : 0), R = CELL / 2 - 4;
    ctx.lineJoin = 'round';
    if (spec.hollow) {
      shapePath(ctx, spec.shape, cx, cy, R - 3); ctx.lineWidth = 13; ctx.strokeStyle = css(c.edge, c.edgeA * 0.8); ctx.stroke();
      ctx.lineWidth = 10; ctx.strokeStyle = css(c.keyline); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = css(c[spec.tone]); ctx.stroke();
      return;
    }
    shapePath(ctx, spec.shape, cx, cy, R); ctx.fillStyle = css(c.edge, c.edgeA); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = css(c.edge, c.edgeA); ctx.stroke();
    shapePath(ctx, spec.shape, cx, cy, R - 2); ctx.fillStyle = css(c.keyline); ctx.fill();
    shapePath(ctx, spec.shape, cx, cy, R - 7); ctx.fillStyle = css(c[spec.tone]); ctx.fill();
  }
  function canvas(w, h) {
    var d = root.document;
    if (!d || !isFn(d.createElement)) return null;
    var cv = d.createElement('canvas');
    if (!cv || !isFn(cv.getContext)) return null;
    cv.width = w; cv.height = h;
    return cv;
  }
  function isCanvas(x) { return !!x && isFn(x.getContext) && x.width > 0 && x.height > 0; }
  /**
   * The map's shared sprite maker when it draws these shapes (MAP lane, V6_SPEC §6.3): detected by asking for a
   * shield and checking that the sprite's id names the shield (today's symbolSprite draws a circle for any other
   * shape). Hollow sprites are used only when the map tells them apart from the filled ones.
   */
  var MAPSYM = { checked: false, ok: false, hollow: false };
  function mapSprites() {
    var M = MCD.map;
    if (!M || !isFn(M.symbolSprite)) return false;
    if (MAPSYM.checked) return MAPSYM.ok;
    MAPSYM.checked = true;
    try {
      var a = M.symbolSprite({ shape: 'shield', fill: [1, 2, 3], px: 16 }), b = M.symbolSprite({ shape: 'shield', fill: [1, 2, 3], hollow: true, px: 16 });
      MAPSYM.ok = !!(a && isCanvas(a.canvas) && /shield/.test(String(a.id)));
      MAPSYM.hollow = MAPSYM.ok && !!(b && isCanvas(b.canvas) && b.id !== a.id);
    } catch (e) { MAPSYM.ok = false; }
    return MAPSYM.ok;
  }
  function mapSprite(spec, theme, px) {
    if (!mapSprites() || (spec.hollow && !MAPSYM.hollow)) return null;
    try {
      var c = COLOURS[themeOf(theme)];
      var r = MCD.map.symbolSprite({ shape: spec.shape, fill: c[spec.tone].slice(), ring: c.keyline.slice(), hollow: !!spec.hollow, px: px });
      return r && isCanvas(r.canvas) ? r : null;
    } catch (e) { return null; }
  }
  var ATL = {};
  /** atlas(theme) → {iconAtlas, iconMapping, key} for a deck.gl IconLayer (mask off: real colours), or null without a canvas. */
  SYM.atlas = function (theme) {
    theme = themeOf(theme);
    var viaMap = mapSprites(), key = theme + (viaMap ? ':map' : ':own');
    if (ATL[key]) return ATL[key];
    var mapping = {}, cv = null;
    var list = viaMap ? SYM.KEYS.map(function (k) { return mapSprite(specOfKey(k), theme, 36); }) : null;
    if (list && list.every(Boolean) && isFn(MCD.map.spriteAtlas)) {
      var src = null;
      try { src = MCD.map.spriteAtlas(list); } catch (e) { src = null; }
      if (src && src.iconAtlas && src.iconMapping) {
        cv = src.iconAtlas;
        SYM.KEYS.forEach(function (k, n) { var m = src.iconMapping[list[n].id]; if (m) mapping[k] = Object.assign({}, m, { mask: false }); });
      }
    }
    if (!cv || Object.keys(mapping).length !== SYM.KEYS.length) {
      mapping = {};
      cv = canvas(SYM.KEYS.length * CELL, CELL);
      var ctx = cv && cv.getContext('2d');
      if (!ctx) return null;
      SYM.KEYS.forEach(function (k, n) {
        drawSprite(ctx, n * CELL, 0, specOfKey(k), theme);
        mapping[k] = { x: n * CELL, y: 0, width: CELL, height: CELL, anchorX: CELL / 2, anchorY: CELL / 2, mask: false };
      });
      key = theme + ':own';
    }
    ATL[key] = { iconAtlas: cv, iconMapping: mapping, key: key };
    return ATL[key];
  };
  /* the same two shapes as small vector paths (16 × 16), for chips beside names and legend rows: no canvas and no PNG
     encoding, so a list of rows costs nothing; chip colours come from the stylesheet tokens (negeri, swasta, kedinasan) */
  var CHIP_PATH = {
    shield: 'M2.6 2.2h10.8v5.4c0 3.3-2.5 5.4-5.4 6.3-2.9-0.9-5.4-3-5.4-6.3z',
    triangle: 'M8 2.1l6.3 11.1H1.7z'
  };
  var SPR = {};
  function rgbHex(c) { return '#' + c.slice(0, 3).map(function (v) { var h = Math.max(0, Math.min(255, Math.round(v))).toString(16); return h.length < 2 ? '0' + h : h; }).join(''); }
  /**
   * spriteUrl(spec, theme) → an SVG data URL of one symbol (legend rows): the same shape and colours as the map sprite,
   * built as text (no canvas, no PNG encoding: the legend appears without a long frame).
   */
  SYM.spriteUrl = function (spec, theme) {
    if (!spec) return null;
    theme = themeOf(theme);
    var k = theme + '|' + spec.key;
    if (has(SPR, k)) return SPR[k];
    var c = COLOURS[themeOf(theme)], fill = rgbHex(c[spec.tone] || c.swasta), key = rgbHex(c.keyline);
    var d = spec.shape === 'shield' ? CHIP_PATH.shield : CHIP_PATH.triangle;
    var body = spec.hollow
      ? '<path d="' + d + '" fill="none" stroke="' + key + '" stroke-width="3.2" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + fill + '" stroke-width="1.8" stroke-linejoin="round"/>'
      : '<path d="' + d + '" fill="' + fill + '" stroke="' + key + '" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32">' + body + '</svg>';
    SPR[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return SPR[k];
  };
  /** chip(spec, theme, {title, cls}) → <span class="cp-sym"> with the symbol as an inline SVG (CSS stand-in without SVG). */
  SYM.chip = function (spec, theme, o) {
    var d = root.document;
    if (!d || !spec) return null;
    o = o || {};
    var wrap = d.createElement('span');
    wrap.className = 'cp-sym cp-sym--' + spec.shape + ' is-' + spec.tone + (spec.hollow ? ' is-hollow' : '') + (o.cls ? ' ' + o.cls : '');
    wrap.setAttribute('aria-hidden', 'true');
    if (o.title) wrap.title = o.title;
    if (isFn(d.createElementNS)) {
      var NS = 'http://www.w3.org/2000/svg', svg = d.createElementNS(NS, 'svg'), path = d.createElementNS(NS, 'path');
      svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.setAttribute('focusable', 'false');
      path.setAttribute('d', CHIP_PATH[spec.shape] || CHIP_PATH.triangle);
      path.setAttribute('class', 'cp-sym__p');
      svg.appendChild(path);
      wrap.appendChild(svg);
    } else wrap.appendChild(d.createElement('i'));
    return wrap;
  };
  /** Legend group "Kampus dalam {km} km" (§6.3): five rows in words, the pictures from the same sprites. */
  SYM.legend = function (theme, km, counts) {
    var c = COLOURS[themeOf(theme)], n = counts || {};
    function img(key) { return SYM.spriteUrl(specOfKey(key), theme); }
    function ik(key) { return 'cp|' + themeOf(theme) + '|' + key + (mapSprites() ? ':map' : ':own'); }
    return {
      id: 'campus-sym', title: 'Kampus dalam ' + (km === 5 || km === 15 ? km : 30) + ' km',
      rows: [
        { glyph: 'shield', rgb: c.negeri.slice(), img: img('shield-negeri'), imgKey: ik('shield-negeri'), label: 'Universitas dan institut: perisai', count: isNum(n.univ) ? n.univ : null },
        { glyph: 'triangle', rgb: c.swasta.slice(), img: img('triangle-swasta'), imgKey: ik('triangle-swasta'), label: 'Sekolah tinggi, politeknik, akademi, desain dan kursus: segitiga', count: isNum(n.st) ? n.st : null },
        { glyph: 'none', label: 'Biru = negeri. Kuning = swasta. Abu-abu = kedinasan.' },
        { glyph: 'none', label: 'Titik lebih besar = mahasiswa lebih banyak (terkecil: di bawah 2.000 atau belum diketahui)' },
        { glyph: 'triangle', rgb: c.swasta.slice(), img: img('triangle-swasta-h'), imgKey: ik('triangle-swasta-h'), label: 'Titik kosong = kampus lain dari perguruan tinggi yang sama' }
      ]
    };
  };

  /* ------------------------------------------------------------ Tindak lanjut (§6.9) */

  function stages() {
    var S = MCD.schools && MCD.schools.config && MCD.schools.config.stages;
    return Array.isArray(S) && S.length ? S : STAGES;
  }
  C.STAGES = STAGES.map(function (s) { return Object.assign({}, s); });
  C.PRODUCTS = PRODUCTS.map(function (p) { return Object.assign({}, p); });
  C.PROGRAMS = PROGRAMS.map(function (p) { return Object.assign({}, p); });
  C.stages = stages;
  C.stageLabel = function (id) { var s = stages().filter(function (x) { return x.id === id; })[0]; return s ? s.label : ''; };
  C.productName = function (id) { var p = PRODUCTS.filter(function (x) { return x.id === id; })[0]; return p ? p.short : id; };
  C.validKey = function (k) { return typeof k === 'string' && KEY_RE.test(k); };

  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, max); }
  function validStage(s) { return stages().some(function (x) { return x.id === s; }) ? s : 'baru'; }
  /**
   * The memory-only list (no MCD.seal): the same API as MCD.schools.pipeline, never written to storage in plain
   * text (V6_SPEC §7.3). status() 'memory', persisted() false, so the screens say the list lives while the page is open.
   */
  function memoryPipeline() {
    var mem = {}, gone = {}, subs = [];
    function fire() { subs.slice().forEach(function (fn) { try { fn(mem); } catch (e) { /* ignore */ } }); if (MCD.campus && isFn(MCD.campus.emit)) MCD.campus.emit('pipeline', mem); }
    var api = {
      key: 'campus.pipeline', memory: true,
      all: function () { return mem; },
      get: function (k) { return mem[k] || null; },
      count: function () { return Object.keys(mem).length; },
      persisted: function () { return false; },
      status: function () { return 'memory'; },
      ready: function () { return Promise.resolve(api); },
      orphans: function (known) { var s = known instanceof Set ? known : new Set(known || []); return Object.keys(mem).filter(function (k) { return !s.has(k); }); },
      set: function (k, patch, meta) {
        if (!C.validKey(k)) return { ok: false, error: 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.' };
        var cur = mem[k] || { stage: 'baru', owner: '', products: [], program: '', nextStep: '', nextDate: '', lastContact: '', note: '', history: [], t: '' };
        var next = Object.assign({}, cur);
        patch = patch || {};
        if ('program' in patch) next.program = patch.program === 'GEMPITA' ? 'GEMPITA' : '';
        if ('stage' in patch) {
          var s2 = validStage(patch.stage);
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
        delete gone[k];
        fire();
        return { ok: true, entry: next };
      },
      quickAdd: function (k, label) {
        if (!C.validKey(k)) return { ok: false, error: 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.' };
        if (mem[k]) return { ok: true, entry: mem[k], existed: true };
        var res = api.set(k, { stage: 'baru' }, { label: label || '' });
        if (res.ok) res.existed = false;
        return res;
      },
      remove: function (k) { if (mem[k]) { delete mem[k]; gone[k] = nowIso(); fire(); } },
      clear: function () { Object.keys(mem).forEach(function (k) { gone[k] = nowIso(); }); mem = {}; fire(); },
      exportJson: function () { return JSON.stringify({ v: 1, kind: 'mcd.campus.pipeline', exported: nowIso(), data: mem }, null, 1); },
      importJson: function (text) {
        var obj;
        try { obj = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, error: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).' }; }
        if (!obj || obj.v !== 1 || !obj.data || typeof obj.data !== 'object') return { ok: false, error: 'File ini bukan ekspor tindak lanjut kampus. Pilih file lain.' };
        var added = 0, updated = 0, kept = 0;
        Object.keys(obj.data).forEach(function (k) {
          var inc = obj.data[k];
          if (!inc || typeof inc !== 'object' || !C.validKey(k)) return;
          var clean = { stage: validStage(inc.stage), owner: cleanText(inc.owner, 60), products: Array.isArray(inc.products) ? inc.products.filter(function (x) { return PRODUCTS.some(function (q) { return q.id === x; }); }) : [],
            program: inc.program === 'GEMPITA' ? 'GEMPITA' : '', nextStep: cleanText(inc.nextStep, 120),
            nextDate: /^\d{4}-\d{2}-\d{2}$/.test(String(inc.nextDate || '')) ? inc.nextDate : '', lastContact: /^\d{4}-\d{2}-\d{2}$/.test(String(inc.lastContact || '')) ? inc.lastContact : '',
            note: cleanText(inc.note, 500), history: Array.isArray(inc.history) ? inc.history.slice(-20).map(function (h) { return { stage: validStage(h && h.stage), t: String((h && h.t) || '') }; }) : [],
            t: String(inc.t || ''), label: cleanText(inc.label, 160) };
          if (!mem[k]) { mem[k] = clean; added++; } else if (clean.t > (mem[k].t || '')) { mem[k] = clean; updated++; } else kept++;
        });
        fire();
        return { ok: true, added: added, updated: updated, kept: kept };
      },
      on: function (fn) { if (isFn(fn)) subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
      _reset: function () { mem = {}; gone = {}; }
    };
    return api;
  }
  var PIPE = null;
  /** The campus follow-up list: MCD.seal.pipeline when the SEAL lane is loaded (encrypted), else memory only. */
  function pipeline() {
    if (PIPE && !(PIPE.memory && MCD.seal && isFn(MCD.seal.pipeline) && !PIPE.count())) return PIPE;
    var S = MCD.seal, p = null;
    if (S && isFn(S.pipeline)) {
      try {
        p = S.pipeline('campus.pipeline', { keyRe: KEY_RE, stages: stages(), products: PRODUCTS.map(function (x) { return x.id; }),
          programs: PROGRAMS.map(function (x) { return x.id; }).filter(Boolean),
          check: function (key) { return C.validKey(key) ? null : 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.'; } });
      } catch (e) { p = null; }
    }
    PIPE = p || memoryPipeline();
    return PIPE;
  }
  try {
    Object.defineProperty(C, 'pipeline', { configurable: true, enumerable: true, get: pipeline, set: function (v) { PIPE = v || null; } });
  } catch (e) { C.pipeline = pipeline(); }
  C._memoryPipeline = memoryPipeline;

  var SUBS = {};
  C.emit = function (ev, d) { (SUBS[ev] || []).slice().forEach(function (fn) { try { fn(d); } catch (e) { /* ignore */ } }); };
  C.onEvent = function (ev, fn) { (SUBS[ev] = SUBS[ev] || []).push(fn); return function () { SUBS[ev] = (SUBS[ev] || []).filter(function (f) { return f !== fn; }); }; };

  /* ------------------------------------------------------------ CSV (§6.7) */

  function csvCell(v) {
    var c = MCD.util && MCD.util.csv;
    if (c && isFn(c.cell)) return c.cell(v);
    if (v == null) return '';
    var s = String(v);
    if (/^[=+\-@\t]/.test(s)) s = "'" + s;
    return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  C.CSV_COLUMNS = ['id', 'kode_pt', 'nama', 'jenis', 'status', 'akreditasi', 'mahasiswa', 'semester', 'dosen_tetap', 'kelas_biaya', 'dasar_kelas_biaya',
    'telepon', 'telepon_seluler_resmi', 'email', 'situs_resmi', 'jarak_dari_kcp_km', 'menit_dari_kcp', 'kecamatan', 'catatan', 'sumber'];
  /**
   * csv(rows, {veiled, dist: fn(row) → {km, min} | null}) → CSV text (UTF-8 BOM first). Contacts come only from the
   * official register; a website only when it may be a link (D17); while names are veiled the contact columns are empty.
   */
  C.csv = function (rows, o) {
    o = o || {};
    var lines = [C.CSV_COLUMNS.join(',')];
    (rows || []).forEach(function (r) {
      var t = C.tierOf(r.id), c = o.veiled ? null : C.contactOf(r.id), d = isFn(o.dist) ? o.dist(r) : null;
      var why = excludedWhy(r);
      var note = why === 'nationwide' ? 'pendidikan jarak jauh, tidak dihitung' : why === 'mainOutside' ? 'kampus utama di luar 30 km, tidak dihitung' : why === 'desain' ? 'tidak terdaftar di PDDikti' : '';
      if (r.coordConf === 'rendah') note = (note ? note + '; ' : '') + 'titik perkiraan dari alamat resmi';
      lines.push([
        r.id, r.kode || '', r.name, C.jenisWord(r), C.statusWord(r), r.akreditasi || '',
        isNum(r.students) ? r.students : '', r.studentsSem ? (C.semLabel(r.studentsSem) || r.studentsSem) : (r.studentsBasis === 'halaman' ? 'halaman PDDikti' : ''),
        isNum(r.dosenTetap) ? r.dosenTetap : '',
        t && t.tier ? t.label : (t === undefined ? '' : 'Belum diketahui'), t && t.basisWords ? t.basisWords : '',
        c ? c.phones.map(function (p) { return p.display; }).join(' / ') : '', c ? (c.phones.some(function (p) { return p.mobile; }) ? 'ya' : '') : '',
        c && c.email ? c.email.value : '', c && c.website && c.website.link ? c.website.url : '',
        d && isNum(d.km) ? d.km.toFixed(1) : '', d && isNum(d.min) ? Math.round(d.min) : '',
        r.kecamatanId ? C.kecName(r.kecamatanId) : '', note,
        r.kode ? 'PDDikti (Kemdiktisaintek), 18 Okt 2026' : 'OpenStreetMap / Overture Maps, 18 Okt 2026'
      ].map(csvCell).join(','));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  };

  /* ------------------------------------------------------------ search (Cari) */

  /** search(q, max) → rows whose name or short name matches (2-letter short names exactly: "UI"); a whole short name
      or a whole name comes first ("Universitas Indonesia" before "Universitas Indonesia Maju"; final fix round). */
  C.search = function (q, max) {
    var I = index(), key = searchKey(q);
    if (!I || key.length < 2) return [];
    var out = [], lim = isNum(max) ? max : 8;
    var exact = I.rows.filter(function (r) { return (r.short && searchKey(r.short) === key) || searchKey(r.name) === key; });
    exact.forEach(function (r) { if (out.length < lim) out.push(r); });
    if (key.length >= 3) {
      I.rows.forEach(function (r) {
        if (out.length >= lim || out.indexOf(r) >= 0) return;
        if (searchKey(r.name).indexOf(key) >= 0 || (r.short && searchKey(r.short).indexOf(key) >= 0)) out.push(r);
      });
    }
    return out;
  };
  C.searchKey = searchKey;
  C._fold = fold;
  C._today = today;
})(window.MCD = window.MCD || {});
