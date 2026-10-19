/* ==========================================================================
 * MCD.lvm: the Livin' Merchant (LVM) and EDC Mandiri engine. Pure logic, no DOM.
 *
 * Main goal of the branch (docs/COPY_STYLE_EN.md items 11-14): map every grocery,
 * restaurant and SME within 15 km of Mabes TNI (public Overture listings,
 * data/sme-pois.js) and mark each one "Already acquired" (matched to the branch /
 * area Livin' Merchant file) or "Not yet", per kecamatan, kelurahan and territory tile.
 *
 *   Parsing (the monthly "Rev LVM" workbook, or the template sheet 1_lvm)
 *     registers the importer type 'lvm' (fuller parser than the baseline in importer.js)
 *     MCD.lvm.parseWorkbook(sheets, opts)  → {asOf, period, area, merchants, branchKpi, areaTotal, report, checks, sheets}
 *     MCD.lvm.parseKpiSheet(sheet)         → UREG / USAK per-branch KPIs vs target (or null)
 *     MCD.lvm.workbookReader               → whole-workbook reader for Data & Privacy
 *                                            {TYPE, HOME, label, detect, read, toRecords, apply, periodLabel, summary}
 *     MCD.lvm.edc.merchants(rows)          → EDC terminals grouped into merchants (by MID)
 *   Categories
 *     categoryOfLob(lob, mcc) · categoryOfGroup(g) · categoryOfName(name) · groupsForLob(lob, mcc)
 *   Areas
 *     resolveKecamatan(name, kota) · resolveKelurahan(text, kecamatanId) · locate(lon, lat)
 *   Who counts as a merchant (v4, docs/EDC_SCORE.md §6): schools, address-only names and places that do not sell
 *     to walk-in buyers (worship, government / TNI / police, parks, cemeteries, golf, community halls, banks and finance,
 *     housing estates, a whole market or mall) are left out of the matcher, the aggregates and every list (X.ok = 0).
 *     nonMerchant(i) → {kind, why, words} | null · nonMerchantCount() → {sekolah, alamat, lain, all, byWhy}
 *   Matching (public listings ↔ LVM stores, then ↔ EDC merchants)
 *     MCD.lvm.match(opts?) → result (cached; < 2 s for 62k listings × 12k stores). Also sets the runtime
 *       fields poiIndex and match on the LVM / EDC records (stripped on export; read by MCD.territory)
 *     MCD.lvm.matchAsync(opts?) → Promise<result>
 *     poiStatus(i) · merchantMatch(id) · offMap() · locationOf(id) · normName(s) · similarity(a, b)
 *   Offline street points (COPY_STYLE_EN item 28, docs/GEOCODE_LOCAL.md)
 *     buildLvm places each store from its address with MCD.geocodeLocal (street index loaded through
 *     MCD.app.lazy('street-index') once an LVM file is read): lat, lon, geoPrecision 'JALAN'|'KAMPUNG'|'KELURAHAN'|
 *     'KECAMATAN' on the record; the address and the matched street name are never kept.
 *     locationSummary() → counts per precision of the stores in the 15 km focus · geocodeStatus() · ensureGeocoder()
 *   Aggregates
 *     MCD.lvm.aggregate('kecamatan' | 'kelurahan' | 'tile') → {level, hasLvm, totals, bands, areas: {<id>: {...}}}
 *       each area: coverage (public listings), coverageKnown (all merchants we know of), status / statusKnown
 *       (fixed bands) and band / bandRel: the relative tercile band (default bandMode, COPY_STYLE_EN item 18)
 *     MCD.lvm.territoryInput() → input for MCD.territory.stats() · MCD.lvm.summary() → totals only
 *     MCD.derive hooks 'area:merchants' and 'lvm'
 *
 * Privacy: owner names, phone numbers, e-mail, account numbers, CIF, balances and the
 * referral code are never read (importer deny lists). The shop address is read only to
 * find the kelurahan and is not stored. Records keep the store name, MID / store id, the
 * area, the branch and the transaction figures. Nothing leaves the browser.
 * Matching rules and thresholds: docs/LVM_MATCHING.md.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = typeof window !== 'undefined' ? window : {};
  var HOME = '12903';
  var DEG = Math.PI / 180;
  var CATS = ['restaurant', 'grocery', 'other'];            // index = category code in typed arrays
  var CAT_CODE = { restaurant: 0, grocery: 1, other: 2 };
  var CAT_LABEL = {
    grocery: 'Toko kelontong & ritel',
    restaurant: 'Restoran & warung makan',
    other: 'UMKM lainnya'
  };
  // Map status codes of result.pois.status (map layers read these).
  var STATUS = { SKIP: 0, POTENTIAL: 1, NOT_YET: 2, ACQUIRED: 3 };

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isInt(x) { return isNum(x) && Math.floor(x) === x; }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function U() { return MCD.util; }
  function admin() { var a = W.MCD_ADMIN_AREAS; return a && Array.isArray(a.kecamatan) && typeof a.locate === 'function' ? a : null; }
  function poisFile() { var p = W.MCD_SME_POIS; return p && Array.isArray(p.rows) ? p : null; }
  function hexFile() { var h = W.MCD_TERRITORY_HEX; return h && typeof h.tiles === 'function' && h.meta && h.meta.hex ? h : null; }
  function set(words) { var o = {}; words.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }
  function hash(s) {
    if (U() && U().fnv1a) return U().fnv1a(String(s));
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function hex8(s) { return ('0000000' + hash(s).toString(16)).slice(-8); }
  function warn(msg, e) { if (W.console && W.console.warn) W.console.warn('[MCD.lvm] ' + msg, e && e.message ? e.message : (e || '')); }

  /* =============================================================== settings */

  var DEFAULTS = {
    accept: 0.8,           // adjusted name score needed to call a listing "Already acquired"
    acceptLowInfo: 0.95,   // ... when the store name carries little information (one common word): also needs the same kelurahan
    lowInfo: 0.6,          // information of a name: IDF weights of its core words / ln(1 + N); one rare word ≈ 1, one common word ≈ 0.4
    margin: 0.05,          // the best listing must beat the runner-up by this much, else ambiguous (no match)
    kelBonus: 0.05,        // same kelurahan (store address / postcode vs listing location)
    kelPenalty: 0.1,       // different kelurahan (halved when the store's kelurahan comes from its postcode)
    catPenalty: 0.08,      // the store's business type does not fit the listing's group
    coreEqual: 0.9,        // score when the core words (no shop-type words, no place names) are the same
    joinedEqual: 0.95,     // score when the names are equal once spaces are removed ("Berkahjaya")
    cap: 400,              // blocking: skip a word found in more listings than this in one kecamatan
    nearM: 250,            // stores with exact coordinates: listings this close are candidates too
    jitterM: 220,          // approximate placement of stores with no public listing (deterministic)
    radiusKm: null,        // listings counted: within this distance of the Mabes TNI centre (null = config, 15 km)
    bandMode: 'relative',  // colour bands of the areas: 'relative' terciles (COPY_STYLE_EN item 18) | 'absolute' (config.coverageBands)
    minInFocus: 0.5        // relative bands rank areas with at least this share of their area within 15 km
  };
  var BAND_MODES = { relative: 1, absolute: 1 };
  var CFG = {};
  Object.keys(DEFAULTS).forEach(function (k) { CFG[k] = DEFAULTS[k]; });
  function cfgSig() { return Object.keys(CFG).map(function (k) { return CFG[k]; }).join(','); }
  function radiusKm() {
    if (isNum(CFG.radiusKm)) return CFG.radiusKm;
    var c = MCD.config && MCD.config.merchantRadiusKm;
    return isNum(c) ? c : 15;
  }
  function centre() {
    var p = poisFile(), c = p && p.meta && p.meta.center;
    if (c && isNum(c[0])) return { lon: c[0], lat: c[1] };
    var k = MCD.config && MCD.config.center;
    return k && isNum(k.lon) ? { lon: k.lon, lat: k.lat } : { lon: 106.91329, lat: -6.32818 };
  }

  /* ========================================================= text helpers */

  function fold(s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t;
  }
  function compact(s) { return fold(s).replace(/[^a-z0-9]+/g, ''); }
  function words(s) { return fold(s).replace(/&/g, ' dan ').replace(/['’`´]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

  // Shop-type words and legal forms: dropped from names (docs/LVM_MATCHING.md §2).
  var DROP = set('toko tk tko tok warung warong waroeng wr wrg rm wm kedai kios depot lapak gerai outlet cabang ud cv pt tbk persero ' +
    'store shop official olshop the and dan di of by');
  // Honorifics and kinship words around an owner's first name ("Warung Bu Ani" = "Warung Ani").
  var HON = set('bu ibu bpk bapak pak mas mbak mba bang abang cak teh mpok mak om tante kak ka haji hj hajjah ny nyonya sdr mama papa ' +
    'uda uni koh ko cik ci mang kang ceu akang engkong babe ncang encang');
  // Descriptive words that say what a shop sells, not who it is: kept, with a low weight.
  var DESC = set('sembako kelontong klontong grosir agen minimarket supermarket swalayan market mart mini frozen sayur sayuran buah warteg warkop');
  var PHRASES = [
    [/\brumah makan\b/g, ' rm '], [/\bwarung makan\b/g, ' wm '], [/\bwarung nasi\b/g, ' wm '], [/\bwarung kopi\b/g, ' warkop '],
    [/\bwarung tegal\b/g, ' warteg '], [/\bmini ?market\b/g, ' minimarket '], [/\bsuper ?market\b/g, ' supermarket '],
    [/\btoko kelontong\b/g, ' kelontong '], [/\btoko sembako\b/g, ' sembako ']
  ];
  // Place words that are also everyday words: never treated as a place name on their own.
  var GENERIC_PLACE = set('baru tengah dukuh gedong setu tugu curug jaya indah mulya mulia sari makmur raya timur barat utara selatan pusat ' +
    'lama asri permai harapan mekar sentosa abadi kelapa pondok pasar kampung rawa bambu gunung bukit tanjung pulo pulau kebon sawah ' +
    'bojong cipta karya duren jati sukamaju sukatani tapos limo beji setia budi melati gede pinang ranti mekarsari');
  var CITY = ['jakarta', 'jkt', 'jaktim', 'jaksel', 'jakbar', 'jakut', 'jakpus', 'bekasi', 'depok', 'bogor', 'tangerang', 'tangsel', 'cibubur'];

  var placeIx = null;
  /** Place names for the core-word rule: single words (not everyday words) and multi-word names indexed by their first word. */
  function placeIndex() {
    if (placeIx && placeIx.admin === !!admin()) return placeIx;
    var single = {}, multi = {}, A = admin();
    CITY.forEach(function (c) { single[c] = 1; });
    function addName(n) {
      var t = words(n).split(' ').filter(Boolean);
      if (!t.length) return;
      if (t.length === 1) { if (!GENERIC_PLACE[t[0]] && t[0].length >= 4) single[t[0]] = 1; return; }
      var key = t.join(' ');
      (multi[t[0]] = multi[t[0]] || {})[key] = t;
    }
    if (A) {
      ['kota', 'kecamatan', 'kelurahan'].forEach(function (lv) {
        (A[lv] || []).forEach(function (r) { addName(r.short || r.name); if (lv !== 'kota') addName(r.name); (r.alt || []).forEach(addName); });
      });
    } else if (MCD.ref && Array.isArray(MCD.ref.kelurahan)) {
      MCD.ref.kelurahan.forEach(function (r) { addName(r[0]); addName(r[1]); });
    }
    var byFirst = {};
    Object.keys(multi).forEach(function (f) { byFirst[f] = Object.keys(multi[f]).map(function (k) { return multi[f][k]; }); });
    placeIx = { single: single, byFirst: byFirst, admin: !!A };
    return placeIx;
  }
  function placeFlags(toks) {
    var px = placeIndex(), out = new Array(toks.length);
    for (var i = 0; i < toks.length; i++) out[i] = !!px.single[toks[i]];
    for (var s = 0; s < toks.length; s++) {
      var list = px.byFirst[toks[s]];
      if (!list) continue;
      for (var m = 0; m < list.length; m++) {
        var ph = list[m], L = ph.length, ok = s + L <= toks.length;
        for (var j = 1; ok && j < L; j++) if (toks[s + j] !== ph[j]) ok = false;
        if (ok) for (j = 0; j < L; j++) out[s + j] = true;
      }
    }
    return out;
  }

  /** normName(name) → {norm, tokens, core, coreKey, joined, sorted, place[]} (docs/LVM_MATCHING.md §2). */
  function normName(name) {
    var s = ' ' + words(name) + ' ';
    for (var i = 0; i < PHRASES.length; i++) s = s.replace(PHRASES[i][0], PHRASES[i][1]);
    var raw = s.split(' ').filter(Boolean);
    var toks = raw.filter(function (t) { return !DROP[t] && !HON[t] && (t.length > 1 || /\d/.test(t)); });
    if (!toks.length) toks = raw.filter(function (t) { return !HON[t] && t.length > 1; });
    if (!toks.length) toks = raw.slice();
    var seen = {}, uniq = [];
    toks.forEach(function (t) { if (!seen[t]) { seen[t] = 1; uniq.push(t); } });
    toks = uniq.slice(0, 24);
    var place = placeFlags(toks);
    var core = toks.filter(function (t, k) { return !DESC[t] && !place[k]; });
    if (!core.length) core = toks.filter(function (t) { return !DESC[t]; });
    if (!core.length) core = toks.slice();
    return { norm: toks.join(' '), tokens: toks, place: place, core: core, coreKey: core.slice().sort().join(' '),
      joined: toks.join(''), sorted: toks.slice().sort().join(' ') };
  }

  /** Character trigrams of the sorted words ('#' separated): sorted, unique 24-bit codes. */
  function trigrams(sorted) {
    var s = '#' + sorted.replace(/ /g, '#') + '#', out = [];
    for (var i = 0; i + 3 <= s.length; i++) out.push((s.charCodeAt(i) << 16) | (s.charCodeAt(i + 1) << 8) | s.charCodeAt(i + 2));
    out.sort(function (a, b) { return a - b; });
    var u = [];
    for (i = 0; i < out.length; i++) if (!i || out[i] !== out[i - 1]) u.push(out[i]);
    return u;
  }
  /** Two words of 5+ letters that differ by one typo (one letter changed, added or missing) or by a short ending. */
  function fuzzyEq(a, b) {
    var la = a.length, lb = b.length;
    if (la < 5 || lb < 5) return false;
    if (Math.abs(la - lb) <= 2 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)) return true;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a.charCodeAt(i) === b.charCodeAt(j)) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return edits + (la - i) + (lb - j) <= 1;
  }

  /* ============================================================ categories */

  // Business type (lob_lm) of the LVM report → dashboard category and the Overture groups it fits.
  // Groups (data/sme-pois.js meta.groups): 0 Food & Beverage, 1 Retail & Grocery, 2 Automotive, 3 Health & Pharmacy,
  // 4 Education, 5 Beauty & Personal Care, 6 Construction & Building Materials, 7 Manufacturing & Industrial,
  // 8 Wholesale & Distribution, 9 Professional Services, 10 Hospitality & Tourism, 11 Other (12-13 banks: not merchants).
  var LOB_RULES = [
    [/salon|kecantikan|pijat|terapi|\bspa\b|barber|pangkas|kosmetik/, 'other', [5, 3, 1]],
    [/apotek|apotik|klinik|medis|dokter|farmasi|obat|kesehatan|rumah sakit|bidan/, 'other', [3, 8]],
    [/kelontong|sembako|kios makanan|minimarket|supermarket|swalayan|\bpasar\b|grosir|serba murah|produk susu|freezer|frozen|rokok|sayur|buah|beras/, 'grocery', [1, 0, 8]],
    [/kedai|rumah makan|restoran|\bresto|cafe|kafe|kopi|katering|catering|\broti\b|bakery|\bkue\b|minum|kuliner|food|makanan/, 'restaurant', [0, 10, 1]],
    [/bahan bangunan|material|\bcat\b|perkakas|kelistrikan|kontraktor|arsitektur|alat berat|perlengkapan industri|peralatan kebun|taman/, 'other', [6, 1, 7]],
    [/bengkel|otomotif|motor|mobil|\bban\b|spbu|bensin|dealer|derek|parkir|kendaraan/, 'other', [2]],
    [/properti|konsultan|hukum|akuntansi|pajak|periklanan|pemasaran|telekomunikasi|internet|jaringan|keuangan|money changer|gadai|asuransi|sosial|amal/, 'other', [9, 11]],
    [/^\s*toko\b|pusat belanja/, 'grocery', [1]],
    [/pendidikan|kursus|sekolah|daycare|penitipan anak|bimbel|studio tari/, 'other', [4]],
    [/percetakan|printing|fotografi|cetak|fotokopi/, 'other', [9, 7, 1]],
    [/laundry|binatu|cuci|penjahit|jahit|servis|service|kebersihan|reparasi|perbaikan/, 'other', [9, 11, 2]],
    [/hotel|motel|resor|wisata|rekreasi|perjalanan|hiburan|bioskop|billiard|arkade|permainan|kebugaran|olahraga|fitness/, 'other', [10, 11]],
    [/transportasi|kurir|ekspedisi|sewa kendaraan|pergudangan|penyimpanan|logistik/, 'other', [9, 11, 8]],
    [/distributor|pabrik|produksi|konveksi/, 'other', [8, 7]]
  ];
  var MCC_GROCERY = set('5411 5499 5422 5441 5451 5993 5300 5310 5311 5331 5399 5651 5691 5699 5661 5641 5732 5734 5945 5943 5942 5944 5992 5995 5719 5722 5948 5970 5971 5931 5932 5937 4812 5712 5714 5949 5950 5977 5947 5946 5940 5941');
  var MCC_FOOD = set('5812 5813 5814 5811 5462');
  function lobRule(lob) {
    var s = ' ' + words(lob) + ' ';
    if (!s.trim()) return null;
    for (var i = 0; i < LOB_RULES.length; i++) if (LOB_RULES[i][0].test(s)) return LOB_RULES[i];
    return null;
  }
  /** lob_lm text and / or MCC → 'grocery' | 'restaurant' | 'other'. */
  function categoryOfLob(lob, mcc) {
    var r = lobRule(lob);
    if (r) return r[1];
    var m = str(mcc).replace(/\.0+$/, '');
    if (MCC_FOOD[m]) return 'restaurant';
    if (MCC_GROCERY[m]) return 'grocery';
    return 'other';
  }
  /** Overture groups a store of this business type is expected in (null = no opinion). */
  function groupsForLob(lob, mcc) {
    var r = lobRule(lob);
    if (r) return r[2].slice();
    var m = str(mcc).replace(/\.0+$/, '');
    if (MCC_FOOD[m]) return [0, 10, 1];
    if (MCC_GROCERY[m]) return [1, 0, 8];
    return null;
  }
  /** Overture group index → category (same buckets as MCD_ADMIN_AREAS.meta.potential); null for banks. */
  function categoryOfGroup(g) {
    if (g === 0) return 'restaurant';
    if (g === 1) return 'grocery';
    return g >= 2 && g <= 11 ? 'other' : null;
  }
  var NAME_FOOD = /\b(rm|wm|warteg|warkop|resto|restoran|restaurant|cafe|kafe|coffee|kopi|bakso|mie|mi|ayam|sate|soto|nasi|martabak|bakery|roti|kue|pecel|seafood|pizza|burger|catering|katering|bakmi|bubur|kuliner|steak|sushi)\b/;
  var NAME_GROCERY = /\b(kelontong|sembako|grosir|agen|minimarket|supermarket|swalayan|mart|market|sayur|buah|beras|frozen|toko)\b/;
  /** Category from a name alone (EDC merchants, stores without a business type) → category or null. */
  function categoryOfName(name) {
    var s = ' ' + words(name) + ' ';
    var t = s.replace(/\brumah makan\b/g, ' rm ').replace(/\bwarung makan\b/g, ' wm ');
    if (NAME_FOOD.test(t)) return 'restaurant';
    if (NAME_GROCERY.test(t) || /\bwarung\b/.test(t)) return 'grocery';
    return null;
  }

  /* ========================================================== admin areas */

  var areaIx = null;
  function kotaKey(s) {
    var f = ' ' + words(s) + ' ';
    var kind = /\b(kabupaten|kab)\b/.test(f) ? 'kab' : (/\bkota\b/.test(f) ? 'kota' : '');
    var core = f.replace(/\b(kota administrasi|kota adm|kabupaten|kab|kota|adm|administrasi)\b/g, ' ').replace(/[^a-z0-9]+/g, '');
    return { kind: kind, core: core };
  }
  function placeKey(s) {
    return fold(s).replace(/\b(kecamatan|kec|kelurahan|kel|desa|ds)\b\.?/g, ' ').replace(/[^a-z0-9]+/g, '');
  }
  /** Name variants of an area name: 'Kramatjati (Kramat Jati)' → ['kramatjati'] (both spellings fold the same). */
  function nameVariants(s) {
    var out = [], t = str(s);
    if (!t) return out;
    var m = /^(.*?)\(([^)]*)\)(.*)$/.exec(t);
    var parts = m ? [m[1] + m[3], m[2]] : [t];
    parts.forEach(function (p) { var k = placeKey(p); if (k && out.indexOf(k) < 0) out.push(k); });
    return out;
  }
  /** Area index: kecamatan / kelurahan lists (admin areas, else the 150 reference kelurahan), name lookups. */
  function areas() {
    var A = admin();
    var sig = A ? 'admin:' + A.kecamatan.length + ':' + A.kelurahan.length : 'ref:' + ((MCD.ref && MCD.ref.kelurahan && MCD.ref.kelurahan.length) || 0);
    if (areaIx && areaIx.sig === sig) return areaIx;
    var kec = [], kel = [], kecById = {}, kelById = {}, kecByName = {}, kelByKec = {}, kotaBy = {}, kotaName = {};
    if (A) {
      (A.kota || []).forEach(function (k) {
        var kind = /kabupaten/i.test(k.kind || k.name) ? 'kab' : 'kota';
        kotaBy[kind + ':' + placeKey(k.short || k.name)] = k.id;
        kotaName[k.id] = k.name;
      });
      A.kecamatan.forEach(function (k) {
        var o = { id: k.id, name: k.name, kotaId: k.kota, kota: kotaName[k.kota] || null, label: k.label || null, in15: isNum(k.in15) ? k.in15 : 1, ix: kec.length, kel: [] };
        kec.push(o); kecById[k.id] = o;
        [k.name].concat(k.alt || []).forEach(function (n) { var key = placeKey(n); if (key) (kecByName[key] = kecByName[key] || []).push(o); });
      });
      A.kelurahan.forEach(function (l) {
        var kc = kecById[l.kec];
        var o = { id: l.id, name: l.name, kecId: l.kec, kecIx: kc ? kc.ix : -1, label: l.label || null, in15: isNum(l.in15) ? l.in15 : 1, ix: kel.length,
          names: [l.name].concat(l.alt || []) };
        kel.push(o); kelById[l.id] = o;
        if (kc) kc.kel.push(o);
      });
    } else if (MCD.ref && Array.isArray(MCD.ref.kelurahan)) {
      MCD.ref.kelurahan.forEach(function (r) {
        var kid = 'ref:' + placeKey(r[1]) + '|' + placeKey(r[2]), kc = kecById[kid];
        if (!kc) {
          kc = { id: kid, name: r[1], kotaId: 'ref:' + kotaKey(r[2]).core, kota: r[2], label: null, in15: 1, ix: kec.length, kel: [], sum: [0, 0, 0] };
          kec.push(kc); kecById[kid] = kc;
          var key = placeKey(r[1]);
          (kecByName[key] = kecByName[key] || []).push(kc);
          kotaBy[(kotaKey(r[2]).kind || 'kota') + ':' + kotaKey(r[2]).core] = kc.kotaId;
        }
        var o = { id: 'ref:' + placeKey(r[0]) + '|' + kid, name: r[0], kecId: kid, kecIx: kc.ix, label: [r[4], r[3]], in15: 1, ix: kel.length, names: [r[0]] };
        kel.push(o); kelById[o.id] = o; kc.kel.push(o);
        kc.sum[0] += r[4]; kc.sum[1] += r[3]; kc.sum[2]++;
      });
      kec.forEach(function (k) { if (k.sum) k.label = [k.sum[0] / k.sum[2], k.sum[1] / k.sum[2]]; });
    }
    kec.forEach(function (k) {
      k.kelKeys = [];
      k.kel.forEach(function (l) {
        l.names.forEach(function (n) {
          var w = words(n);
          if (w) k.kelKeys.push({ l: l, toks: w.split(' '), generic: w.indexOf(' ') < 0 && (GENERIC_PLACE[w] || w.length <= 4),
            sameAsKec: placeKey(n) === placeKey(k.name) });
        });
      });
      k.kelKeys.sort(function (a, b) { return b.toks.length - a.toks.length; });
    });
    areaIx = { sig: sig, admin: !!A, kec: kec, kel: kel, kecById: kecById, kelById: kelById, kecByName: kecByName, kotaBy: kotaBy };
    return areaIx;
  }
  function kotaIdOf(raw, AX) {
    var k = kotaKey(raw);
    if (!k.core) return null;
    if (k.kind) return AX.kotaBy[k.kind + ':' + k.core] || null;
    return AX.kotaBy['kota:' + k.core] || AX.kotaBy['kab:' + k.core] || null;
  }
  /**
   * resolveKecamatan(name, kota) → {id, name, kotaId, kota, ix, ambiguous} | null.
   * 'Kramatjati (Kramat Jati)' + 'Kota Jakarta Timur' → Kramatjati (31.75.04). Names repeat (two Cipayung, two Setu):
   * the kota decides; a kecamatan outside the covered kota (Bandung, …) → null.
   */
  function resolveKecamatan(name, kota) {
    var AX = areas(), vars = nameVariants(name), cand = [];
    vars.forEach(function (v) { (AX.kecByName[v] || []).forEach(function (k) { if (cand.indexOf(k) < 0) cand.push(k); }); });
    if (!cand.length) return null;
    var kotaRaw = str(kota), kid = kotaRaw ? kotaIdOf(kotaRaw, AX) : null;
    var pick = null, ambiguous = false;
    if (kid) {
      var inK = cand.filter(function (k) { return k.kotaId === kid; });
      if (!inK.length) return null;
      pick = inK[0];
    } else if (kotaRaw && AX.admin) {
      return null;                                     // a kota outside the covered area
    } else {
      cand.sort(function (a, b) { return b.in15 - a.in15; });
      pick = cand[0];
      ambiguous = cand.length > 1;
    }
    return { id: pick.id, name: pick.name, kotaId: pick.kotaId, kota: pick.kota, ix: pick.ix, ambiguous: ambiguous };
  }
  /** Finds a kecamatan named in free text (an address), optionally within one kota. */
  function kecamatanInText(text, kota) {
    var AX = areas(), t = ' ' + words(text) + ' ', kid = str(kota) ? kotaIdOf(kota, AX) : null, best = null, bestPos = -1;
    AX.kec.forEach(function (k) {
      if (kid && k.kotaId !== kid) return;
      [k.name].forEach(function (n) {
        var w = ' ' + words(n) + ' ', p = t.lastIndexOf(w);
        if (p < 0) return;
        var before = t.slice(Math.max(0, p - 12), p);
        var score = p + (/\b(kec|kecamatan)\s*$/.test(before) ? 10000 : 0);
        if (score > bestPos) { bestPos = score; best = k; }
      });
    });
    return best ? { id: best.id, name: best.name, kotaId: best.kotaId, kota: best.kota, ix: best.ix, ambiguous: false } : null;
  }
  var STREET_BEFORE = /\b(jl|jln|jalan|gg|gang|raya|komplek|kompleks|komp|perum|perumahan|blok|cluster|griya|villa|taman)\s*$/;
  /**
   * resolveKelurahan(text, kecamatanId) → {id, name, ix} | null: a kelurahan of that kecamatan named in the text.
   * Prefers a name after "Kel." / "Kelurahan" / "Desa"; skips names used as street names ("Jl. Raya Ceger");
   * one-word everyday names ("Baru", "Tengah") need the "Kel." prefix.
   */
  function resolveKelurahan(text, kecamatanId) {
    var AX = areas(), k = AX.kecById[kecamatanId];
    if (!k || !text) return null;
    var toks = words(text).split(' ').filter(Boolean);
    if (!toks.length) return null;
    var best = null, bestScore = -Infinity;
    for (var a = 0; a < k.kelKeys.length; a++) {
      var key = k.kelKeys[a], L = key.toks.length;
      for (var s = 0; s + L <= toks.length; s++) {
        var ok = true;
        for (var j = 0; j < L; j++) if (toks[s + j] !== key.toks[j]) { ok = false; break; }
        if (!ok) continue;
        var prev = toks.slice(Math.max(0, s - 2), s).join(' '), next = toks[s + L] || '';
        var kelPrefix = /\b(kel|kelurahan|desa|ds)$/.test(prev);
        if (key.generic && !kelPrefix) continue;
        if (key.sameAsKec && !kelPrefix) continue;                                     // "…, Ciracas": most likely the kecamatan
        if (!kelPrefix && STREET_BEFORE.test(prev)) continue;
        if (!kelPrefix && /^(kec|kecamatan)$/.test(toks[s - 1] || '')) continue;      // "Kec. Cipayung": the kecamatan
        if (next === 'raya' || next === 'no') continue;
        var score = s + (kelPrefix ? 1000 : 0) + L * 0.5;
        if (score > bestScore) { bestScore = score; best = key.l; }
      }
    }
    return best ? { id: best.id, name: best.name, ix: best.ix } : null;
  }
  /** Point → {kecIx, kelIx} with the admin areas (point in polygon), else the nearest reference kelurahan. */
  function locate(lon, lat) {
    var AX = areas(), A = admin();
    if (!isNum(lon) || !isNum(lat)) return null;
    if (A) {
      var r = A.locate(lon, lat);
      if (!r) return null;
      var kl = AX.kelById[r.kelurahanId], kc = AX.kecById[r.kecamatanId];
      return { kecIx: kc ? kc.ix : -1, kelIx: kl ? kl.ix : -1, kecamatanId: r.kecamatanId, kelurahanId: r.kelurahanId };
    }
    var best = -1, bd = Infinity, cos = Math.cos(lat * DEG);
    for (var i = 0; i < AX.kel.length; i++) {
      var l = AX.kel[i].label, dx = (l[0] - lon) * cos, dy = l[1] - lat, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return null;
    var o = AX.kel[best];
    return { kecIx: o.kecIx, kelIx: o.ix, kecamatanId: o.kecId, kelurahanId: o.id };
  }

  /* ============================================== importer schema: 'lvm' */

  var OWNER_DENY = ['owner_name', 'nama_pemilik', 'pemilik', 'nama_nasabah', 'owner_phone', 'no_telp_pemilik', 'account_number', 'no_rekening',
    'norek', 'rekening', 'cif', 'no_cif', 'open_cif', 'tgl_buka_cif', 'ownerid', 'owner_id', 'referal_code', 'referral_code', 'kode_referal',
    'tgl_lahir', 'nik_pemilik', 'email', 'store_code', 'end', 'avg', 'endbal', 'avgbal', 'saldo', 'branch_manager'];
  var LVM_COLUMNS = [
    { key: 'mid', req: 'any:key', syn: ['mid_static', 'nmid', 'merchant_id', 'id_merchant', 'mid_qris'] },
    { key: 'store_id', req: 'any:key', syn: ['id_toko', 'storeid', 'kode_toko'] },
    { key: 'nama_merchant', req: true, syn: ['store_name', 'nama_toko', 'nama_usaha', 'merchant_name', 'nama'] },
    { key: 'kategori', syn: ['lob_lm', 'category', 'jenis_usaha', 'kategori_usaha', 'lob'] },
    { key: 'mcc', syn: ['mcc_code', 'kode_mcc'] },
    { key: 'alamat', type: 'string', req: 'any:loc', personal: true, syn: ['address', 'alamat_usaha', 'alamat_toko', 'alamat_merchant'],
      note: 'hanya dibaca untuk menemukan titik jalan atau kelurahan, lalu tidak disimpan' },
    { key: 'kelurahan', type: 'string', req: 'any:loc', syn: ['kel', 'desa', 'village', 'kel_desa'] },
    { key: 'kecamatan', type: 'string', req: 'any:loc', syn: ['kec', 'district'] },
    { key: 'kota', type: 'string', syn: ['kabupaten', 'kab_kota', 'city', 'kota_kab'] },
    { key: 'kode_pos', type: 'string', req: 'any:loc', syn: ['postcode', 'postal_code', 'kodepos', 'zip'] },
    { key: 'lat', type: 'number', req: 'any:loc', syn: ['latitude', 'lintang', 'koordinat_lat'] },
    { key: 'lon', type: 'number', req: 'any:loc', syn: ['lng', 'long', 'longitude', 'bujur', 'koordinat_lon', 'koordinat_lng'] },
    { key: 'koordinat', type: 'string', syn: ['coordinates', 'latlon', 'lat_lon', 'lokasi_gps'] },
    { key: 'tgl_registrasi', type: 'date', syn: ['createddate', 'created_date', 'tgl_daftar', 'tanggal_registrasi', 'registered_date'] },
    { key: 'status', syn: ['status_trx', 'status_merchant', 'status_aktif'] },
    { key: 'grading', syn: ['grading_trx', 'grade'] },
    { key: 'kode_cabang', syn: ['kode_cabang_final', 'branch_code', 'kocab'] },
    { key: 'nama_cabang', syn: ['nama_cabang_final', 'branch_name', 'cabang'] },
    { key: 'area', syn: ['nama_area_final', 'nama_area'] },
    { key: 'freq_mtd', type: 'int', syn: ['frekuensi_mtd', 'trx_mtd'] },
    { key: 'sv_mtd', type: 'rp', syn: ['sales_volume_mtd', 'volume_mtd'] },
    { key: 'freq_30', type: 'int', syn: ['freq_30_days', 'frekuensi_30_hari'] },
    { key: 'sv_30', type: 'rp', syn: ['sv_30_days', 'volume_30_hari'] },
    { key: 'dongle', type: 'bool', syn: ['flag_card_dongle', 'card_dongle'] }
  ];
  function lvmDetect(keys, heads) {
    var lvmish = heads.indexOf('mid_static') >= 0 || heads.indexOf('lob_lm') >= 0 || heads.indexOf('store_name') >= 0 || heads.indexOf('status_trx') >= 0;
    if (heads.indexOf('tid') >= 0 && !lvmish) return false;            // a terminal list: EDC, not LVM
    // the report's detail sheet ("Rincian") has store_id, kecamatan and the branch; its summary tabs do not
    return (lvmish ? 3 : 0) + (keys.indexOf('store_id') >= 0 ? 2 : 0) + (keys.indexOf('kategori') >= 0 || keys.indexOf('tgl_registrasi') >= 0 ? 1 : 0) +
      (keys.indexOf('kecamatan') >= 0 && keys.indexOf('kode_cabang') >= 0 ? 1 : 0);
  }
  function cleanId(v) {
    var s = str(v).replace(/\.0+$/, '');
    return !s || /^(null|none|nan|-|0)$/i.test(s) ? '' : s;
  }
  /** Calendar day of a Date cell. SheetJS gives local-midnight dates that can be a few minutes early (historical
      time-zone offsets), so the day is rounded, as MCD.importer.parse.date does. */
  function localYmd(d) {
    var t = d.getTime() - d.getTimezoneOffset() * 60000;
    return new Date(Math.round(t / 86400000) * 86400000).toISOString().slice(0, 10);
  }
  function ymdOf(v, P) { return P.date(v); }
  function coordOf(v, P) { var x = P.coord(v); return isNum(x) ? x : null; }

  /** Area fields of one store: kecamatan (official name and id), kelurahan, kota. The address is read, never kept. */
  function areaOf(fields, P) {
    var out = { kecamatan: null, kecamatanId: null, kelurahan: null, kelurahanId: null, kelSrc: null, kota: str(fields.kota) || null, kotaId: null,
      lat: null, lon: null, geoPrecision: 'NONE', areaNote: null };
    var lat = fields.lat, lon = fields.lon;
    if ((!isNum(lat) || !isNum(lon)) && fields.koordinat) { var kk = P.koordinat(fields.koordinat); if (kk) { lat = kk[0]; lon = kk[1]; } }
    if (isNum(lat) && isNum(lon) && lat >= 100 && lat <= 110 && lon >= -8 && lon <= -5) { var t = lat; lat = lon; lon = t; }
    if (isNum(lat) && isNum(lon) && lat >= -6.75 && lat <= -5.95 && lon >= 106.45 && lon <= 107.25) {
      out.lat = lat; out.lon = lon; out.geoPrecision = 'EXACT';
      var L = locate(lon, lat);
      if (L && L.kecIx >= 0) {
        var AX = areas(), kc = AX.kec[L.kecIx], kl = L.kelIx >= 0 ? AX.kel[L.kelIx] : null;
        out.kecamatan = kc.name; out.kecamatanId = kc.id; out.kotaId = kc.kotaId; out.kota = kc.kota || out.kota;
        if (kl) { out.kelurahan = kl.name; out.kelurahanId = kl.id; out.kelSrc = 'coords'; }
        return out;
      }
    }
    var kecRaw = str(fields.kecamatan), r = kecRaw ? resolveKecamatan(kecRaw, fields.kota) : null;
    if (!r && !kecRaw && fields.address) { r = kecamatanInText(fields.address, fields.kota); if (r) out.areaNote = 'kecamatan from address'; }
    if (r) {
      out.kecamatan = r.name; out.kecamatanId = r.id; out.kotaId = r.kotaId; out.kota = r.kota || out.kota;
      if (r.ambiguous) out.areaNote = 'kecamatan name repeats; kota missing';
      var kl2 = null;
      if (fields.kelurahan) { kl2 = resolveKelurahan('kel ' + fields.kelurahan, r.id); if (kl2) out.kelSrc = 'column'; }
      if (!kl2 && fields.address) { kl2 = resolveKelurahan(fields.address, r.id); if (kl2) out.kelSrc = 'address'; }
      if (kl2) { out.kelurahan = kl2.name; out.kelurahanId = kl2.id; }
    } else {
      out.kecamatan = kecRaw ? kecRaw.replace(/\s*\([^)]*\)\s*/g, ' ').trim() : null;
      if (fields.kelurahan) out.kelurahan = str(fields.kelurahan);
    }
    return out;
  }

  /** Kelurahan from the postcode where the address did not name one: majority of the file's stores with the same postcode. */
  function fillKelurahanFromPostcode(list) {
    var votes = {};
    list.forEach(function (r) {
      if (!r.postcode || !r.kelurahanId || (r.kelSrc !== 'address' && r.kelSrc !== 'column' && r.kelSrc !== 'coords')) return;
      var v = votes[r.postcode] = votes[r.postcode] || { n: 0, by: {} };
      v.n++; v.by[r.kelurahanId] = (v.by[r.kelurahanId] || 0) + 1;
    });
    var AX = areas(), filled = 0;
    list.forEach(function (r) {
      if (r.kelurahanId || !r.postcode || !r.kecamatanId) return;
      var v = votes[r.postcode];
      if (!v || v.n < 3) return;
      var best = null, bn = 0;
      Object.keys(v.by).forEach(function (id) { if (v.by[id] > bn) { bn = v.by[id]; best = id; } });
      var kl = best && AX.kelById[best];
      if (!kl || kl.kecId !== r.kecamatanId || bn / v.n < 0.6) return;
      r.kelurahan = kl.name; r.kelurahanId = kl.id; r.kelSrc = 'postcode'; filled++;
    });
    return filled;
  }

  function buildLvm(rows, ctx) {
    var P = ctx.parse, out = [], seen = {}, mapping = ctx.mapping || {};
    var hasAddr = has(mapping, 'alamat'), kecFromAddr = 0, kelFromAddr = 0, outside = 0, noKec = 0;
    var addrs = [];                 // the shop addresses, parallel to out, for the street point only (dropped below)
    var maxCreated = null;
    rows.forEach(function (r) {
      var sid = cleanId(r.store_id), mid = cleanId(r.mid), name = str(r.nama_merchant);
      if (!sid && !mid && !name) { ctx.issue(r._row, 'mid', null, 'MERCHANT_KEY_MISSING', 'error'); return; }
      if (!name) { ctx.issue(r._row, 'nama_merchant', null, 'REQUIRED_MISSING', 'error'); return; }
      var postcode = P.postcode(r.kode_pos);
      if (postcode === undefined) { ctx.issue(r._row, 'kode_pos', r.kode_pos, 'POSTCODE_INVALID', 'info'); postcode = null; }
      var key = sid ? 's:' + sid : (mid ? 'm:' + mid : 'n:' + compact(name) + '|' + compact(r.kecamatan) + '|' + (postcode || ''));
      if (seen[key]) { ctx.issue(r._row, sid ? 'store_id' : (mid ? 'mid' : 'nama_merchant'), null, 'DUP_ACCOUNT', 'error'); return; }
      seen[key] = 1;
      var created = ymdOf(r.tgl_registrasi, P);
      if (created === undefined) { ctx.issue(r._row, 'tgl_registrasi', r.tgl_registrasi, 'DATE_INVALID', 'warn'); created = null; }
      if (created && (!maxCreated || created > maxCreated)) maxCreated = created;
      var status = P.status(r.status);
      if (status === undefined) { ctx.issue(r._row, 'status', r.status, 'STATUS_UNKNOWN', 'warn'); status = null; }
      var lob = str(r.kategori) || null, mcc = cleanId(r.mcc) || null;
      var area = areaOf({ kecamatan: r.kecamatan, kota: r.kota, kelurahan: str(r.kelurahan), address: hasAddr ? str(r.alamat) : '',
        lat: coordOf(r.lat, P), lon: coordOf(r.lon, P), koordinat: r.koordinat }, P);
      if (area.areaNote === 'kecamatan from address') kecFromAddr++;
      if (area.kelSrc === 'address') kelFromAddr++;
      if (!area.kecamatanId) { if (str(r.kecamatan) || str(r.kota)) outside++; else noKec++; }
      var groups = groupsForLob(lob, mcc);
      var nn = normName(name);
      out.push({
        id: 'L' + hex8(key), storeId: sid || null, mid: mid || null, name: name, nameNorm: nn.norm,
        category: categoryOfLob(lob, mcc), lob: lob, groupIndex: groups ? groups[0] : null, mcc: mcc,
        kelurahan: area.kelurahan, kelurahanId: area.kelurahanId, kelSrc: area.kelSrc,
        kecamatan: area.kecamatan, kecamatanId: area.kecamatanId, kota: area.kota, kotaId: area.kotaId, postcode: postcode,
        lat: area.lat, lon: area.lon, geoPrecision: area.geoPrecision,
        branchCode: cleanId(r.kode_cabang) || null, branchName: str(r.nama_cabang) || null, area: str(r.area) || null,
        createdDate: created || null, status: status, active: status === 'active' ? true : (status === 'inactive' ? false : null),
        grading: str(r.grading) || null,
        freqMtd: intOrNull(ctx, r, 'freq_mtd'), svMtd: rpOrNull(ctx, r, 'sv_mtd'), freq30: intOrNull(ctx, r, 'freq_30'), sv30: rpOrNull(ctx, r, 'sv_30'),
        dongle: P.bool(r.dongle) === true, src: { file: ctx.file || null, sheet: ctx.sheet || null, row: r._row }, _demo: false
      });
      addrs.push(hasAddr ? str(r.alamat) : '');
    });
    var byPost = fillKelurahanFromPostcode(out);
    /* item 28: each store on its own street, offline (MCD.geocodeLocal). The addresses live only in this step, or in
       the short queue while the street index loads; only lat, lon and geoPrecision are kept on the record. */
    var geo = geocodeStores(out, addrs);
    addrs = null;
    var asOf = ctx.asOf || (maxCreated && (!U() || maxCreated <= U().date.ymd(U().date.today())) ? maxCreated : null) ||
      (U() ? U().date.ymd(U().date.today()) : null);
    ctx.asOf = asOf;
    ctx.report.asOf = asOf;
    if (hasAddr) ctx.report.notes.push('Alamat toko hanya dibaca untuk menemukan titik jalan atau kelurahan, lalu tidak disimpan.');
    ctx.report.lvm = { stores: out.length, kecamatanFromAddress: kecFromAddr, kelurahanFromAddress: kelFromAddr, kelurahanFromPostcode: byPost,
      outsideCoveredArea: outside, noKecamatan: noKec, geo: geo };
    return out;
  }

  /* ============================================ offline street points (COPY_STYLE_EN item 28, docs/GEOCODE_LOCAL.md)

     The Rev LVM file has no coordinates, only a free-text address. MCD.geocodeLocal places the shop on its street
     (or at its kampung / perumahan, else the kelurahan or kecamatan label point) inside the browser, with no network
     call. The address is in hand only while the file is parsed: when the street index (data/street-index.js, 3.57 MB,
     loaded through MCD.app.lazy('street-index') only once an LVM file is read) is not ready yet, the addresses wait in
     GEO.pending (memory only, at most GEO_WAIT_MS) and are dropped once placed. The record keeps lat, lon and
     geoPrecision 'JALAN' | 'KAMPUNG' | 'KELURAHAN' | 'KECAMATAN', which the encrypted copy keeps like any other field;
     the matched street name is never kept (it is part of the address). Records with real coordinates ('EXACT') and
     demo rows are never touched. */
  var GEO_WAIT_MS = 120000;
  var GEO_CODE = { jalan: 'JALAN', kampung: 'KAMPUNG', kelurahan: 'KELURAHAN', kecamatan: 'KECAMATAN' };
  var GEO_PREC = { JALAN: 'jalan', KAMPUNG: 'kampung', KELURAHAN: 'kelurahan', KECAMATAN: 'kecamatan' };
  var GEO = { pending: null, timer: null, byId: {}, last: null, busy: false };
  function geocoder() {
    var G = MCD.geocodeLocal;
    if (!G || typeof G.locate !== 'function') return null;
    try { return typeof G.ready !== 'function' || G.ready() ? G : null; } catch (e) { return null; }
  }
  /** ensureGeocoder() → Promise<boolean>: the street index through the shell's lazy loader (never fetch). */
  function ensureGeocoder() {
    if (geocoder()) return Promise.resolve(true);
    var A = MCD.app;
    if (!A || typeof A.lazy !== 'function') return Promise.resolve(false);
    try { return Promise.resolve(A.lazy('street-index')).then(function () { return !!geocoder(); }, function () { return false; }); } catch (e) { return Promise.resolve(false); }
  }
  function geoCounts(n) { return { jalan: 0, kampung: 0, kelurahan: 0, kecamatan: 0, none: 0, total: n || 0 }; }
  function geocodeSlice(todo, from, to, counts) {
    var G = geocoder();
    for (var k = from; k < to; k++) {
      var x = todo[k], r = x && x.rec, res = null;
      if (!r) continue;
      if (G && x.address) {
        try { res = G.locate({ address: x.address, kecamatanId: r.kecamatanId, kelurahanId: r.kelurahanId || undefined, postcode: r.postcode || undefined }); } catch (e) { res = null; }
      }
      x.address = null;                                      // read once, then dropped
      var code = res && GEO_CODE[res.precision];
      if (code && isNum(res.lon) && isNum(res.lat) && r.geoPrecision !== 'EXACT' && !r._demo) {
        r.lon = round6(res.lon); r.lat = round6(res.lat); r.geoPrecision = code;
        GEO.byId[r.id] = { lon: r.lon, lat: r.lat, geoPrecision: code };
        counts[res.precision]++;
      } else counts.none++;
    }
    return counts;
  }
  /** Stores of one parse that can be placed from their address: {rec, address}. */
  function geocodeStores(list, addrs) {
    var todo = [];
    list.forEach(function (r, k) {
      if (!r || r.geoPrecision === 'EXACT' || !r.kecamatanId || !addrs[k]) return;
      todo.push({ rec: r, address: addrs[k] });
    });
    dropPending();
    if (!todo.length) return null;
    if (geocoder()) return geocodeSlice(todo, 0, todo.length, geoCounts(todo.length));
    GEO.pending = todo;
    if (typeof W.setTimeout === 'function') {
      GEO.timer = W.setTimeout(dropPending, GEO_WAIT_MS);       // the addresses never wait longer than this
      if (GEO.timer && typeof GEO.timer.unref === 'function') GEO.timer.unref();
    }
    ensureGeocoder().then(function (ok) { if (GEO.pending === todo) runPending(ok); }, function () { if (GEO.pending === todo) dropPending(); });
    return { pending: todo.length };
  }
  function dropPending() {
    if (GEO.timer && typeof W.clearTimeout === 'function') W.clearTimeout(GEO.timer);
    GEO.timer = null;
    if (GEO.pending) GEO.pending.forEach(function (x) { if (x) { x.address = null; x.rec = null; } });
    GEO.pending = null;
    GEO.busy = false;
  }
  /** Places the queued stores in slices (the browser stays responsive), then refreshes the match and the panels. */
  function runPending(ok) {
    var todo = GEO.pending;
    if (!todo) return;
    if (!ok || !geocoder()) { dropPending(); return; }
    var k = 0, counts = geoCounts(todo.length);
    GEO.busy = true;
    (function step() {
      if (GEO.pending !== todo) return;                    // a newer file replaced this one
      var end = Math.min(todo.length, k + 1500);
      geocodeSlice(todo, k, end, counts);
      k = end;
      if (k < todo.length && typeof W.setTimeout === 'function') { W.setTimeout(step, 0); return; }
      if (k < todo.length) { geocodeSlice(todo, k, todo.length, counts); }
      dropPending();
      GEO.last = counts;
      applyGeoToData();
      last = null; aggMemo = {};
      try { if (MCD.derive && MCD.derive.invalidate) MCD.derive.invalidate(); } catch (e) { /* ignore */ }
      try { if (MCD.app && typeof MCD.app.requestRender === 'function') MCD.app.requestRender(['data']); } catch (e) { /* ignore */ }
    })();
  }
  /** The points of this session's import on the records in MCD.data.lvm (when a copy of the records was applied). */
  function applyGeoToData() {
    var n = 0;
    dataRows('lvm').forEach(function (r) {
      var g = r && GEO.byId[r.id];
      if (!g || r._demo || r.geoPrecision === 'EXACT' || r.geoPrecision === g.geoPrecision) return;
      r.lon = g.lon; r.lat = g.lat; r.geoPrecision = g.geoPrecision; n++;
    });
    return n;
  }
  /** geocodeStatus() → {ready, busy, pending, last: counts | null}: the panel says "sedang dihitung" while busy. */
  function geocodeStatus() {
    return { ready: !!geocoder(), busy: !!(GEO.pending && GEO.pending.length), pending: GEO.pending ? GEO.pending.length : 0, last: GEO.last };
  }
  function intOrNull(ctx, r, key) {
    var v = r[key];
    if (v == null || v === '') return null;
    var x = ctx.parse.int(v);
    if (x == null || !isFinite(x)) { ctx.issue(r._row, key, v, 'VALUE_INVALID', 'warn'); return null; }
    if (x < 0) { ctx.issue(r._row, key, v, 'NEG_VALUE', 'warn'); return null; }
    return x;
  }
  function rpOrNull(ctx, r, key) {
    var v = r[key];
    if (v == null || v === '') return null;
    var x = ctx.parse.rp(v);
    if (x === undefined) { ctx.issue(r._row, key, v, 'VALUE_INVALID', 'warn'); return null; }
    if (x && x.neg) { ctx.issue(r._row, key, v, 'NEG_VALUE', 'warn'); return null; }
    return isNum(x) ? x : null;
  }

  var LVM_SCHEMA = {
    label: 'Livin’ Merchant (LVM)', dataKey: 'lvm',
    description: 'Satu baris untuk setiap toko Livin’ Merchant di cabang atau area.\nLaporan bulanan “Rev LVM” dapat diimpor apa adanya.\n' +
      'Sheet Rincian dibaca. Data pribadi pemilik dihapus.\nAlamat toko hanya dibaca untuk menemukan titik jalan atau kelurahan, lalu tidak disimpan.',
    columns: LVM_COLUMNS, deny: OWNER_DENY, detect: lvmDetect, build: buildLvm
  };

  /* ================================================= KPI sheets (UREG / USAK) */

  var MONTHS = [['jan', 'januari', 'january'], ['feb', 'februari', 'february'], ['mar', 'maret', 'march'], ['apr', 'april'], ['mei', 'may'],
    ['jun', 'juni', 'june'], ['jul', 'juli', 'july'], ['agu', 'agt', 'ags', 'agustus', 'aug', 'august'], ['sep', 'sept', 'september'],
    ['okt', 'oktober', 'oct', 'october'], ['nov', 'nopember', 'november'], ['des', 'desember', 'dec', 'december']];
  var MONTH_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /** A date cell (SheetJS gives Date objects for date-formatted cells) or an ISO text date → 'YYYY-MM-DD'; numbers are never dates. */
  function cellDate(v) {
    if (v && typeof v.getTime === 'function') return isNaN(v.getTime()) ? null : localYmd(v);
    var s = str(v), m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(s);
    return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }
  function codeOf(v) {
    var s = isNum(v) ? String(Math.round(v)) : str(v).replace(/\.0+$/, '');
    return /^\d{3,6}$/.test(s) ? s : null;
  }
  function numOf(v) {
    if (isNum(v)) return v;
    if (MCD.importer && MCD.importer.parse && typeof v === 'string') { var x = MCD.importer.parse.num(v.replace(/%$/, '')); return isNum(x) ? x : null; }
    return null;
  }
  function label(v) { var d = cellDate(v); return d || (v == null ? '' : fold(String(v)).replace(/\s+/g, ' ').trim()); }

  /**
   * parseKpiSheet(sheet) → {kind: 'ureg'|'usak'|'kpi', asOf, title, rows:[{code, name, kc, isTotal, values}], columns} | null.
   * Finds the header row by its 'KOCAB' cell; two more header rows (merged groups) follow; data rows have a
   * numeric branch code; the table ends at the first row without one. Branch manager names are never read.
   */
  function parseKpiSheet(sheet) {
    if (!sheet || !Array.isArray(sheet.rows)) return null;
    var all = [sheet.headers || []].concat(sheet.rows), nos = [sheet.headerRow || 1].concat(sheet.rowNos || sheet.rows.map(function (r, i) { return i + 2; }));
    var h = -1, codeCol = -1, i, c;
    for (i = 0; i < all.length && h < 0; i++) {
      var hr = all[i] || [];
      for (c = 0; c < hr.length; c++) if (/^(kocab|kode cabang|kode_cabang|kode cab)$/i.test(str(hr[c]))) { h = i; codeCol = c; break; }
    }
    if (h < 0) return null;
    var asOf = null, title = null;
    for (i = 0; i < h; i++) (all[i] || []).forEach(function (v) {
      var d = cellDate(v);
      if (d && !asOf) asOf = d;
      else if (!title && typeof v === 'string' && /monitoring|performance|kinerja/i.test(v)) title = v.trim();
    });
    var levels = [all[h]];
    for (i = h + 1; i < all.length && levels.length < 3; i++) {
      if (nos[i] !== nos[i - 1] + 1 || codeOf((all[i] || [])[codeCol])) break;
      levels.push(all[i]);
    }
    var width = 0;
    levels.forEach(function (r) { width = Math.max(width, r.length); });
    var cols = [], g = '', s1 = '';
    for (c = 0; c < width; c++) {
      var l0 = label(levels[0][c]), l1 = levels[1] ? label(levels[1][c]) : '', l2 = levels[2] ? label(levels[2][c]) : '';
      if (l0) { g = l0; s1 = ''; }
      if (l1) s1 = l1;
      var d = cellDate(levels[2] ? levels[2][c] : null) || cellDate(levels[1] ? levels[1][c] : null);
      cols.push({ c: c, g: g, s: s1, l: l2, d: d, path: [g, s1, l2].filter(Boolean).join(' / ') });
    }
    var nameCol = -1, kcCol = -1;
    cols.forEach(function (x) {
      if (nameCol < 0 && /^nama cabang|^branch name|^cabang$/.test(x.g)) nameCol = x.c;
      if (kcCol < 0 && /^kc$/.test(x.g)) kcCol = x.c;
    });
    var body = [];
    for (i = h + levels.length; i < all.length; i++) {
      var row = all[i] || [], code = codeOf(row[codeCol]);
      if (!code) { if (body.length) break; continue; }
      body.push(row);
    }
    var kind = /usak/i.test(sheet.name || '') ? 'usak' : (/ureg/i.test(sheet.name || '') ? 'ureg' : 'kpi');
    var month = asOf ? MONTHS[+asOf.slice(5, 7) - 1] : null;
    function inGroup(re) { return cols.filter(function (x) { return re.test(x.g); }); }
    function latest(list) {
      var best = null;
      list.forEach(function (x) { if (x.d && (!best || x.d > best.d)) best = x; });
      return best;
    }
    function target(list) {
      var t = list.filter(function (x) { var lab = (x.s + ' ' + x.l).trim(); return /^(target|tgt)\b/.test(x.s) || /^(target|tgt)\b/.test(x.l) ? !/\bfy\b|\bdes\b|desember|project|full year/.test(lab) : false; });
      if (month) {
        var mt = t.filter(function (x) { var lab = ' ' + x.s + ' ' + x.l + ' '; return month.some(function (m) { return lab.indexOf(' ' + m + ' ') >= 0 || lab.indexOf(' ' + m + ')') >= 0 || lab.indexOf(' ' + m + ' (') >= 0; }); });
        if (mt.length) return mt[0];
      }
      return t[0] || null;
    }
    function one(re) { return cols.filter(function (x) { return re.test(x.g) && !x.s && !x.l; })[0] || cols.filter(function (x) { return re.test(x.g); })[0] || null; }
    function sub(list, reS, reL) { return list.filter(function (x) { return reS.test(x.s) && (!reL || reL.test(x.l)); })[0] || null; }
    var pick = {};
    var ureg = inGroup(/user registrasi|^ureg\b|\(ureg\)/), usak = inGroup(/user aktif/), freq = inGroup(/^freq/), sv = inGroup(/^sales volume|^sv\b/);
    if (kind !== 'usak' && ureg.length) {
      pick.ureg = latest(ureg); pick.uregTarget = target(ureg); pick.uregGrowthMtd = sub(ureg, /^growth/, /^mtd$/); pick.uregYtd = sub(ureg, /^total ureg/);
    }
    if (kind !== 'usak') {
      if (freq.length) { pick.freq = latest(freq); pick.freqTarget = target(freq); }
      if (sv.length) { pick.sv = latest(sv); pick.svTarget = target(sv); }
      pick.rankUreg = one(/^rank ureg/);
    }
    if (usak.length) { pick.usak = latest(usak); pick.usakTarget = target(usak); }
    if (kind !== 'ureg') {
      pick.rankUsak = one(/^rank usak/); pick.uregMtd = one(/^ureg mtd$/); pick.usakMtd = one(/^usak mtd$/);
      pick.uregAll = one(/^ureg all$/); pick.usakAll = one(/^usak all$/); pick.usakShare = one(/^% usak$/);
    }
    var columns = {};
    Object.keys(pick).forEach(function (k) { if (pick[k]) columns[k] = pick[k].path; else delete pick[k]; });
    var rows = body.map(function (r) {
      var code = codeOf(r[codeCol]), vals = {};
      Object.keys(pick).forEach(function (k) { var v = numOf(r[pick[k].c]); if (v != null) vals[k] = v; });
      return { code: code, name: nameCol >= 0 ? (str(r[nameCol]) || null) : null, kc: kcCol >= 0 ? (str(r[kcCol]) || null) : null,
        isTotal: code.length < 5, values: vals };
    });
    return { kind: kind, sheet: sheet.name || null, asOf: asOf, title: title, rows: rows, columns: columns, headerRow: nos[h] };
  }

  function ratio(a, b) { return isNum(a) && isNum(b) && b > 0 ? a / b : null; }
  /** UREG + USAK tables → one row per branch code (+ the area total, isTotal). */
  function mergeKpi(tables, asOf) {
    var by = {}, order = [];
    tables.forEach(function (t) {
      t.rows.forEach(function (r) {
        var o = by[r.code];
        if (!o) { o = by[r.code] = { code: r.code, name: r.name, kc: r.kc, isTotal: r.isTotal, home: r.code === HOME, asOf: asOf || t.asOf || null }; order.push(r.code); }
        if (!o.name && r.name) o.name = r.name;
        if (!o.kc && r.kc) o.kc = r.kc;
        Object.keys(r.values).forEach(function (k) { if (o[k] == null) o[k] = r.values[k]; });
      });
    });
    return order.map(function (code) {
      var o = by[code];
      o.uregPct = ratio(o.ureg, o.uregTarget); o.usakPct = ratio(o.usak, o.usakTarget);
      o.freqPct = ratio(o.freq, o.freqTarget); o.svPct = ratio(o.sv, o.svTarget);
      if (o.usakShare == null) o.usakShare = ratio(o.usakAll, o.uregAll);
      return o;
    });
  }

  function asOfFromName(name) {
    var s = fold(name), m = /(\d{1,2})\s+([a-z]+)\s+(20\d\d)/.exec(s);
    if (!m) return null;
    for (var i = 0; i < MONTHS.length; i++) if (MONTHS[i].indexOf(m[2]) >= 0) {
      var d = +m[1];
      return d >= 1 && d <= 31 ? m[3] + '-' + (i < 9 ? '0' : '') + (i + 1) + '-' + (d < 10 ? '0' : '') + d : null;
    }
    return null;
  }
  function periodLabel(p) {
    var m = /^(\d{4})-(\d{2})/.exec(str(p));
    return m ? MONTH_ID[+m[2] - 1] + ' ' + m[1] : '';
  }
  function fmtInt(n) { return U() && U().fmt && U().fmt.int ? U().fmt.int(n) : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function count(n, noun) { return fmtInt(n) + ' ' + noun; }
  function pctText(x) { return isNum(x) ? Math.round(x * 100) + '%' : '—'; }

  /**
   * parseWorkbook(sheets, opts) — the whole "Rev LVM" workbook (sheets as MCD.importer.read gives them).
   * opts: {file, asOf}. → {asOf, period, area, merchants, branchKpi, areaTotal, report, checks:[{level, text}], sheets:{used, ignored}, kpis}
   */
  function parseWorkbook(sheets, opts) {
    opts = opts || {};
    var I = MCD.importer, list = (sheets || []).filter(Boolean), used = [], ignored = [], checks = [];
    var file = opts.file || (list[0] && list[0].file) || null;
    var tables = [];
    list.forEach(function (s) {
      if (/^(ureg|usak)$/i.test(str(s.name))) { var t = parseKpiSheet(s); if (t && t.rows.length) { tables.push(t); used.push(s.name); return; } }
    });
    var detail = null, best = -1;
    list.forEach(function (s) {
      if (used.indexOf(s.name) >= 0) return;
      var d = null;
      try { d = I.detect(s); } catch (e) { d = null; }
      var sc = d && d.type === 'lvm' ? d.score : -1;
      if (/^rincian$/i.test(str(s.name)) && d && d.candidates) {
        var lv = d.candidates.filter(function (x) { return x.type === 'lvm' && x.ok; })[0];
        if (lv) sc = Math.max(sc, lv.score + 1);
      }
      if (sc > best) { best = sc; detail = s; }
    });
    var kpiAsOf = null;
    tables.forEach(function (t) { if (t.asOf && (!kpiAsOf || t.asOf > kpiAsOf)) kpiAsOf = t.asOf; });
    var asOf = opts.asOf || kpiAsOf || asOfFromName(file || '') || null;
    var merchants = [], report = null;
    if (detail) {
      var res = I.parse(detail, 'lvm', null, { asOf: asOf || undefined });
      merchants = res.records; report = res.report;
      if (!asOf) asOf = report.asOf;
      used.push(detail.name);
      var ownN = merchants.filter(function (m) { return m && String(m.branchCode || '') === HOME; }).length;
      checks.push({ level: 'ok', text: 'Sheet rincian “' + detail.name + '”: ' + count(merchants.length, 'toko') + ' · ' + fmtInt(ownN) + ' milik KCP Cilangkap' +
        (report.rejected ? ' · ' + count(report.rejected, 'baris') + ' dilewati' : '') });
      if (report.dropped.length) checks.push({ level: 'info', text: 'Kolom data pribadi yang dihapus, tidak pernah disimpan: ' + report.dropped.join(', ') + '.' });
      if (report.notes.length) report.notes.forEach(function (n) { if (/alamat|address/i.test(n)) checks.push({ level: 'info', text: n }); });
      var ex = report.lvm || {};
      if (ex.outsideCoveredArea) checks.push({ level: 'info', text: count(ex.outsideCoveredArea, 'toko') + ' berada di luar area peta (30 km dari Mabes TNI). Toko ini tetap dihitung, tetapi tidak tampil di peta.' });
      /* counts only (item 28): never a street name, which is part of the address */
      if (ex.geo && ex.geo.pending) checks.push({ level: 'info', text: 'Lokasi ' + count(ex.geo.pending, 'toko') + ' sedang dihitung dari alamat, di browser ini.\nAlamat tidak disimpan.' });
      else if (ex.geo && ex.geo.total) {
        checks.push({ level: 'info', text: 'Lokasi toko dari alamat: ' + fmtInt(ex.geo.jalan + ex.geo.kampung) + ' titik jalan · ' + fmtInt(ex.geo.kelurahan) + ' pusat kelurahan · ' +
          fmtInt(ex.geo.kecamatan) + ' pusat kecamatan.\nAlamat tidak disimpan.' });
      }
    } else {
      checks.push({ level: 'warn', text: 'Sheet Rincian tidak ditemukan, sehingga tidak ada toko yang terbaca.\nImpor laporan Rev LVM yang lengkap.' });
    }
    list.forEach(function (s) { if (used.indexOf(s.name) < 0) ignored.push(s.name); });
    if (ignored.length) checks.push({ level: 'info', text: 'Sheet yang tidak diimpor karena hanya ringkasan: ' + ignored.join(', ') + '.' });
    var branchKpi = mergeKpi(tables, asOf);
    var areaTotal = branchKpi.filter(function (r) { return r.isTotal; })[0] || null;
    branchKpi = branchKpi.filter(function (r) { return !r.isTotal; });
    var home = branchKpi.filter(function (r) { return r.home; })[0];
    if (tables.length && home) {
      var bits = [];
      if (isNum(home.ureg)) bits.push('UREG ' + fmtInt(home.ureg) + (isNum(home.uregTarget) ? ' dari target ' + fmtInt(home.uregTarget) + ' (' + pctText(home.uregPct) + ')' : ''));
      if (isNum(home.usak)) bits.push('USAK ' + fmtInt(home.usak) + (isNum(home.usakTarget) ? ' dari target ' + fmtInt(home.usakTarget) + ' (' + pctText(home.usakPct) + ')' : ''));
      checks.push({ level: 'ok', text: 'KCP Jakarta Cilangkap (' + HOME + '): ' + (bits.join(' · ') || 'ada di sheet KPI') + '.' });
    } else if (tables.length) {
      checks.push({ level: 'warn', text: 'KCP Jakarta Cilangkap (' + HOME + ') tidak ada di sheet UREG atau USAK.' });
    }
    if (tables.length) checks.push({ level: 'info', text: 'Nama kepala cabang di sheet KPI tidak dibaca.' });
    var areaCount = {};
    merchants.forEach(function (m) { if (m.area) areaCount[m.area] = (areaCount[m.area] || 0) + 1; });
    var area = Object.keys(areaCount).sort(function (a, b) { return areaCount[b] - areaCount[a]; })[0] || null;
    var kpis = [
      { key: 'ureg', label: 'UREG (pengguna terdaftar)' }, { key: 'usak', label: 'USAK (pengguna aktif)' },
      { key: 'freq', label: 'Transaksi bulan ini' }, { key: 'sv', label: 'Sales volume bulan ini' }
    ].map(function (k) { k.noData = !branchKpi.some(function (r) { return isNum(r[k.key]); }); return k; });
    return {
      asOf: asOf || null, period: asOf ? asOf.slice(0, 7) : null, area: area ? area.replace(/^area\s+/i, '').replace(/\b\w/g, function (x) { return x.toUpperCase(); }).replace(/\B\w+/g, function (x) { return x.toLowerCase(); }) : null,
      file: file, merchants: merchants, branchKpi: branchKpi, areaTotal: areaTotal, report: report, checks: checks,
      sheets: { used: used, ignored: ignored, detail: detail ? detail.name : null, kpi: tables.map(function (t) { return { sheet: t.sheet, kind: t.kind, asOf: t.asOf, columns: t.columns }; }) },
      branches: branchKpi, kpis: kpis
    };
  }

  /** Applies a parsed workbook: stores → dataset 'lvm', branch KPIs → dataset 'lvm_kpi'. */
  function applyWorkbook(sc, meta) {
    meta = meta || {};
    var file = meta.file || sc.file || null;
    MCD.importer.apply('lvm', sc.merchants || [], { file: file, sheet: (sc.sheets && sc.sheets.detail) || 'Rincian', asOf: sc.asOf, report: sc.report });
    if (sc.branchKpi && sc.branchKpi.length && MCD.data && MCD.data.keyFor && MCD.data.keyFor('lvm_kpi')) {
      MCD.data.replace('lvm_kpi', sc.branchKpi.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); o._demo = false; return o; }),
        { source: meta.source || 'import', file: file, sheet: ((sc.sheets && sc.sheets.kpi) || []).map(function (t) { return t.sheet; }).join(' + ') || null, asOf: sc.asOf });
    }
    return true;
  }

  var workbookReader = {
    TYPE: 'lvm', HOME: HOME, label: 'Laporan Livin’ Merchant (Rev LVM)',
    what: 'File Excel bulanan “Rev LVM”: semua toko di area dan UREG/USAK setiap cabang terhadap target.',
    /** detect(sheetNames) → {ok, use}: a detail sheet (Rincian) and at least one KPI tab (UREG / USAK). */
    detect: function (names) {
      var n = (names || []).map(str);
      var detail = n.filter(function (x) { return /^rincian$/i.test(x); }), kpi = n.filter(function (x) { return /^(ureg|usak)$/i.test(x); });
      /* an LVM file is coming: start loading the street index now, so the parse can place the stores at once */
      if (detail.length) ensureGeocoder();
      return { ok: detail.length > 0 && kpi.length > 0, use: detail.concat(kpi) };
    },
    read: function (file) {
      /* waits up to 8 s for the street index; a slower load leaves the stores in the short queue (geocodeStores) */
      var wait = new Promise(function (resolve) {
        ensureGeocoder().then(resolve, function () { resolve(false); });
        if (typeof W.setTimeout === 'function') { var t = W.setTimeout(function () { resolve(false); }, 8000); if (t && typeof t.unref === 'function') t.unref(); }
      });
      return Promise.all([MCD.importer.read(file), wait]).then(function (r) { return parseWorkbook(r[0], { file: file && file.name }); });
    },
    toRecords: function (sc) { return (sc && sc.merchants) || []; },
    apply: applyWorkbook,
    periodLabel: periodLabel,
    summary: function (sc) {
      var rows = (sc && sc.branchKpi) || [], home = rows.filter(function (r) { return r.home; })[0] || null;
      return { branch: home ? { code: home.code, name: home.name, rank: isNum(home.rankUsak) ? home.rankUsak : (isNum(home.rankUreg) ? home.rankUreg : null) } : null, of: rows.length };
    }
  };

  /* ===================================================================== EDC */

  /** EDC terminals (importer type 'edc') → one merchant per MID: {id, mid, name, nameNorm, terminals, activeTerminals, active, …}. */
  function edcMerchants(rows) {
    var by = {}, out = [];
    (rows || []).forEach(function (r, ix) {
      if (!r) return;
      var mid = cleanId(r.mid), name = str(r.name);
      var key = mid ? 'm:' + mid : 'n:' + compact(name) + '|' + compact(r.kecamatan) + '|' + (r.postcode || '');
      var e = by[key];
      if (!e) {
        e = by[key] = { id: 'EM' + hex8(key), kind: 'edc', mid: mid || null, name: name, nameNorm: normName(name).norm, category: categoryOfName(name),
          kecamatan: r.kecamatan || null, kecamatanId: r.kecamatanId || null, kelurahan: r.kelurahan || null, kelurahanId: r.kelurahanId || null,
          kota: r.kota || null, postcode: r.postcode || null, lat: null, lon: null, geoPrecision: 'NONE',
          terminals: 0, activeTerminals: 0, active: null, installedDate: null, volumeMonth: 0, trxMonth: 0,
          branchCode: r.branchCode || null, poiIndex: null, _demo: !!r._demo };
        out.push(e);
      }
      if (!e._rows) Object.defineProperty(e, '_rows', { value: [], enumerable: false });
      e._rows.push(ix);
      e.terminals++;
      if (r.status === 'active') e.activeTerminals++;
      e.active = e.activeTerminals > 0 ? true : (r.status === 'inactive' ? false : e.active);
      if (e.geoPrecision !== 'EXACT' && isNum(r.lat) && isNum(r.lon) && r.geoPrecision === 'EXACT') { e.lat = r.lat; e.lon = r.lon; e.geoPrecision = 'EXACT'; }
      if (!e.kelurahan && r.kelurahan) e.kelurahan = r.kelurahan;
      if (!e.kecamatan && r.kecamatan) e.kecamatan = r.kecamatan;
      if (r.installedDate && (!e.installedDate || r.installedDate < e.installedDate)) e.installedDate = r.installedDate;
      if (isNum(r.volumeMonth)) e.volumeMonth += r.volumeMonth;
      if (isNum(r.trxMonth)) e.trxMonth += r.trxMonth;
      if (e.poiIndex == null && r._demo && isInt(r.poiIndex)) e.poiIndex = r.poiIndex;
    });
    return out;
  }

  /* ================================================ who counts as a merchant (v4, item 37) */

  /*
   * One rule for every merchant number (docs/EDC_SCORE.md §6): the area totals and the KPI of aggregate(), the matcher,
   * the visit lists, the map dots, the Sasaran EDC / LVM lists and the search all count a public listing only when it
   * is a merchant. A listing that is not gets X.ok = 0 here, so it is never matched, counted or drawn:
   *   1 'sekolah'      a formal school or campus (Overture category or name); courses (bimbel, kursus, LPK …) stay
   *                    merchants. Schools have their own section (Sekolah).
   *   2 'alamat'       a name that is only an address (kelurahan, kecamatan and kota names and admin words, no digit).
   *   3 'bukan usaha'  a place that does not sell to walk-in buyers, one reason each (NONM_WHY): a place of worship,
   *                    a government, TNI or police office, a public park or field, a cemetery, a golf course, a
   *                    community hall (balai, pendopo, posko), a bank or finance office (pawn, leasing, money transfer),
   *                    a housing estate or barracks, or a whole market or mall (each shop in it is the merchant; MCD.sme
   *                    uses the market or mall as a crowd anchor).
   * Inputs: the normalised public name (lower case, accents folded, every other character a space), the Overture
   * category of data/sme-pois-extra.js when that file is loaded and aligned (else names only), the names of
   * data/admin-areas.js. A data file may carry the rule itself: MCD_SME_EXTRA.nonMerchant (a kind per row) or a
   * meta.sigBits bit named 'not_merchant'; such rows are left out too (reason 'data').
   */
  var NONM_KIND = ['', 'sekolah', 'alamat', 'bukan-usaha'];
  var NONM_WHY = ['', 'ibadah', 'pemerintah', 'taman', 'makam', 'golf', 'balai', 'bank', 'hunian', 'kawasan', 'data'];
  var NONM_WORDS = { sekolah: 'sekolah atau kampus', alamat: 'nama hanya alamat', ibadah: 'tempat ibadah', pemerintah: 'kantor pemerintah, TNI atau polisi',
    taman: 'taman atau lapangan umum', makam: 'pemakaman', golf: 'lapangan golf', balai: 'balai warga atau pendopo', bank: 'bank atau lembaga keuangan',
    hunian: 'perumahan atau asrama', kawasan: 'kawasan pasar atau mal', data: 'ditandai di file data' };
  var SCHOOL_CATS = set('school elementary_school preschool high_school middle_school religious_school college_university private_school public_school ' +
    'vocational_and_technical_school day_care_preschool child_care_and_day_care specialty_school medical_school nursing_school engineering_school');
  var RX_COURSE = /\b(bimbel|bimba|bimbingan|kursus|course|les|lpk|lkp|kumon|primagama|english|bahasa|language|music|musik|piano|vokal|vocal|training|pelatihan|learning cent(er|re)|education cent(er|re)|eye level|tutor|tutoring|driving|mengemudi|setir|stir|menjahit|barber|komputer|computer|coding|robotik|robotic|renang|swimming|dance|tari|balet|ballet|lukis|sempoa|aritmatika|calculus)\b/;
  var RX_SCHOOL_EDU = /^(sd|sdn|sds|sdit|sdi|smp|smpn|smps|smpit|sma|sman|smas|smait|smk|smkn|smks|mi|min|mis|mts|mtsn|mtss|ma|man|mas|tk|tkit|tki|paud|kb|ra|pg|pkbm|slb|tpa|tpq|kuttab|sekolah|madrasah|pondok pesantren|ponpes|pesantren|universitas|institut|politeknik|akademi|stie|stikes|stmik|stik|stt|kampus|fakultas)\b|\b(school|preschool|kindergarten|daycare|day care|playgroup|childcare|pesantren|universitas|university|college)\b/;
  var RX_SCHOOL_ANY = /^(sdn|sds|sdit|smp|smpn|smpit|sma|sman|smait|smk|smkn|mtsn|sekolah dasar|sekolah menengah|sekolah tinggi|madrasah|pondok pesantren|ponpes|universitas|politeknik|tkit|paud|pkbm|taman kanak)\b|^(sd|mts) (negeri|swasta|islam|it|kristen|katolik|muhammadiyah|\d)|^(tk|ra|mi|sd|sdit) (al|an|ar|as|at|nurul|islam|islamic|global|negeri|swasta|it|kristen|katolik|muhammadiyah|bina|tunas|insan|\d)\b/;
  /* kind 3 by Overture category (code = NONM_WHY index) */
  var CAT3 = {
    christian_place_of_worship: 1, place_of_worship: 1, mosque: 1, church: 1, buddhist_temple: 1, hindu_temple: 1, religious_organization: 1,
    government_office: 2, town_hall: 2, post_office: 2, library: 2, embassy: 2, police_department: 2, fire_department: 2, courthouse: 2,
    park: 3, playground: 3, campground: 3, public_plaza: 3, national_park: 3, nature_reserve: 3, cemetery: 4, golf_course: 5,
    bank: 7, bank_or_credit_union: 7, credit_union: 7, atm: 7, 'kelompok:bank': 7, financial_service: 7, installment_loans: 7, investing: 7,
    trusts: 7, financial_advising: 7, money_transfer_service: 7, currency_exchange: 7, pawn_shop: 7, social_or_community_service: 7
  };
  /* kind 3 by name: [code, pattern, gate]. gate 'cat': not when the category is a shop, food, lodging, health or car
     business (the name then is a brand, "Pendopo Kemang" is a restaurant); 'word': not when the name holds a shop word
     ("Alfamart … Kopassus"); 'both': both gates; 'none': always. */
  var RX_COMMERCIAL_CAT = /restaurant|cafe|coffee|bakery|^bar$|_bar$|pub$|beer|diner|food|shop|store|dealer|hotel|lodg|resort|motel|^inn$|hostel|clinic|hospital|health|medical|doctor|dentist|dental|care_facility|pharmacy|salon|spa$|repair|automotive|^car_|gas_station|laundr|gym|fitness|karaoke|caterer|market|mart$|apparel|amusement|zoo|aquarium|water_park|^nama:/;
  var RX_SHOP_WORD = /\b(alfamart|alfamidi|indomaret|kopi|coffee|cafe|kafe|resto|restoran|restaurant|rumah makan|warung|kedai|shop|toko|kantin|koperasi|mart|bakery|laundry|salon|bengkel|hoka|bento|kfc|mcdonald|pizza|burger|sushi|solaria|chatime|starbucks)\b/;
  /* bank, credit union, financial service or a savings-and-loan name: "koperasi" there is the lender itself, not a shop */
  var RX_SHOP_WORD_FIN = /\b(alfamart|alfamidi|indomaret|kopi|coffee|cafe|kafe|resto|restoran|restaurant|rumah makan|warung|kedai|shop|toko|kantin|mart|bakery|laundry|salon|bengkel|hoka|bento|kfc|mcdonald|pizza|burger|sushi|solaria|chatime|starbucks)\b/;
  var RX_LENDER = /\b(simpan pinjam|kredit|kopdit|ksp|ksu|credit union|cu)\b/;
  /* a housing estate tagged as a bar by its source (Meta): these categories do not make an estate a business */
  var RX_NIGHT_CAT = /^bar$|_bar$|pub$|beer|wine|diner|lounge|night_?club/;
  var RX_PARK_BIZ = /\b(futsal|badminton|bulu ?tangkis|tenis|tennis|basket|mini soccer|padel|sepak bola|biliar|billiard|wisata|rekreasi|waterpark|water park|kolam|pancing|pemancingan|outbound|kuliner|jajan)\b/;
  var RX3 = [
    [1, /^(mt )?(dkm )?(masjid|mesjid|musholl?a|mushall?a|musala|mushola|surau|langgar|gereja|gbi|gki|gpib|gkj|gkp|hkbp|gbis|gmim|gpdi|paroki|kapel|vihara|wihara|klenteng|kelenteng|pura|majelis taklim|majlis taklim|majelis ta lim|aula masjid|yayasan masjid)\b/, 'none'],
    [2, /^(kantor )?(kelurahan|kecamatan|kel|kec|desa|walikota|wali kota|bupati|camat|lurah|dprd|dinas|sudin|suku dinas|kementerian|kemenhan|kantor pajak|kpp|imigrasi|samsat|dukcapil|kua|bpn|polsek|polres|polda|polresta|koramil|kodim|kodam|korem|satpol pp|damkar|pemadam kebakaran|rutan|lapas|kejaksaan|pengadilan|puskesmas|posyandu|kopassus|kostrad|lanud|lantamal|yonif|brimob|denpom|puspom|denma|satkes|markas komando|mako|makodam|mabes tni|mabes polri)\b/, 'both'],
    [3, /\brptra\b/, 'none'],
    [3, /^(taman|hutan kota|alun alun|ruang terbuka|bumi perkemahan|lapangan|kebun raya)\b/, 'cat'],
    [4, /^(makam|pemakaman|tpu|kuburan|taman makam|area pemakaman)\b/, 'none'],
    [5, /\b(padang golf|lapangan golf|golf course|golf club|country club)\b/, 'cat'],
    [6, /^(balai|pendopo|pendapa|sekretariat|sekret|posko|pos rw|pos rt|pos ronda|pos kamling|karang taruna)\b/, 'cat'],
    [7, /^(bank|atm|bpr|ksp)\b|\b(permata|bca|bri|bni|btn|mandiri|danamon|cimb|ocbc|panin|mega|uob|maybank|sinarmas|muamalat) bank\b|\bbank (bri|bni|bca|btn|mandiri|dki|bjb|bsi|syariah|permata|mega|danamon|cimb|ocbc|maybank|panin|btpn|muamalat|sinarmas|uob|jago|neo|hsbc|woori|kb)\b|\b(bri unit|brilink|bri link|pegadaian|koperasi simpan pinjam|kantor cabang pembantu)\b/, 'word'],
    [8, /^(komplek|kompleks|komp|perumahan|perumahaan|perum|perumnas|cluster|klaster|asrama|rumdis|rumah dinas|rusun|rusunawa|rusunami|apartemen|apartment|apartement)\b/, 'cat'],
    [9, /^(mal|mall|plaza|pasar|ps|itc|pusat perbelanjaan|trade cent(er|re))\b/, 'none']
  ];
  var MALL_CATS = set('shopping_mall department_store superstore public_market farmers_market flea_market night_market');
  var RX_MALL_END = /\b(mall|mal|plaza|square|junction|trade cent(er|re)|town square)$/;
  var ADMIN_WORDS = ['kota', 'kab', 'kabupaten', 'kec', 'kecamatan', 'kel', 'kelurahan', 'desa', 'dki', 'indonesia', 'provinsi', 'prov', 'jawa', 'jabar',
    'jakarta', 'timur', 'barat', 'selatan', 'utara', 'pusat', 'administrasi', 'adm'];
  /** The normalised name of the merchant rule: lower case, accents folded, every other character a space. */
  function nmWords(s) { return fold(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  var VOC = { A: null, voc: null };
  /** {names: area names (whole), words: admin words (kota names included)} from data/admin-areas.js; once per file. */
  function adminVocab() {
    var A = admin();
    if (!A) return null;
    if (VOC.A === A) return VOC.voc;
    var names = new Set(), wds = new Set(ADMIN_WORDS);
    function add(r, isKota) {
      [r.name].concat(r.alt || []).forEach(function (nm) {
        var n = nmWords(nm);
        if (!n) return;
        names.add(n);
        if (isKota) n.split(' ').forEach(function (w) { if (w.length > 2) wds.add(w); });
      });
    }
    (A.kota || []).forEach(function (r) { add(r, true); });
    (A.kecamatan || []).forEach(function (r) { add(r, false); });
    (A.kelurahan || []).forEach(function (r) { add(r, false); });
    VOC = { A: A, voc: { names: names, words: wds } };
    return VOC.voc;
  }
  function addressOnly(raw, voc, noCat) {
    if (/\d/.test(raw)) return false;
    var parts = String(raw).split(/\s*(?:,|\s-\s|_|\(|\)|\/)\s*/).map(nmWords).filter(Boolean);
    if (!parts.length) return false;
    var adm = false;
    var ok = parts.every(function (p) {
      if (voc.names.has(p)) { if (voc.words.has(p)) adm = true; return true; }
      return p.split(' ').every(function (w) {
        if (voc.words.has(w)) { adm = true; return true; }
        return voc.names.has(w);
      });
    });
    return ok && (parts.length >= 2 || adm || noCat);
  }
  /** MCD_SME_EXTRA when it belongs to this listing file (same length and, when it can tell, the same rows). */
  var XF = { E: null, file: null, ok: false, ver: 0 };
  function extraFor(file) {
    var E = W.MCD_SME_EXTRA || null;
    if (!E || !file || !E.cat || !E.catNames || E.cat.length !== file.rows.length) return null;
    if (XF.E !== E || XF.file !== file) {
      var ok = true;
      if (typeof E.alignedWith === 'function') { try { ok = !!E.alignedWith(file); } catch (e) { ok = false; } }
      XF = { E: E, file: file, ok: ok, ver: XF.ver + 1 };
    }
    return XF.ok ? E : null;
  }
  /** A per-row rule shipped with the data (MCD_SME_EXTRA.nonMerchant, or a sigBits bit named 'not_merchant'). */
  function dataRule(E, n) {
    if (!E) return null;
    if (E.nonMerchant && E.nonMerchant.length === n) return { arr: E.nonMerchant, bit: 0 };
    var bits = E.meta && E.meta.sigBits, bit = 0;
    if (bits && E.sig) Object.keys(bits).forEach(function (b) { if (/^(not|non|bukan)[_ -]?merchant$/i.test(String(bits[b]))) bit = +b; });
    return bit ? { arr: null, bit: bit } : null;
  }
  /** kind3(category, normalised name) → NONM_WHY code (0 = a merchant as far as this kind goes). */
  function kind3(cat, nm) {
    if (cat && CAT3[cat]) return CAT3[cat] === 7 && !RX_LENDER.test(nm) && RX_SHOP_WORD_FIN.test(nm) ? 0 : CAT3[cat];
    for (var k = 0; k < RX3.length; k++) {
      var w = RX3[k][0], gate = RX3[k][2];
      if (!RX3[k][1].test(nm)) continue;
      if ((gate === 'cat' || gate === 'both') && cat && RX_COMMERCIAL_CAT.test(cat) && !(w === 8 && RX_NIGHT_CAT.test(cat))) continue;
      if ((gate === 'word' || gate === 'both') && (w === 7 ? !RX_LENDER.test(nm) && RX_SHOP_WORD_FIN.test(nm) : RX_SHOP_WORD.test(nm))) continue;
      if (w === 3 && RX_PARK_BIZ.test(nm)) continue;
      return w;
    }
    if (cat && MALL_CATS[cat] && RX_MALL_END.test(nm) && !RX_SHOP_WORD.test(nm)) return 9;
    return 0;
  }
  /**
   * merchantKind(row, i, E, voc, dr) → 0 (a merchant) or kind * 16 + why: kind 1 sekolah, 2 alamat, 3 bukan usaha with
   * its NONM_WHY code. row = [lon, lat, group, name, confidence]; E = the aligned MCD_SME_EXTRA or null.
   */
  function merchantKind(row, i, E, voc, dr) {
    var g = row[2] | 0, raw = String(row[3] == null ? '' : row[3]).trim();
    if (!raw || g < 0 || g > 11) return 0;
    var ci = E ? E.cat[i] : -1, cat = ci >= 0 && E.catNames[ci] ? String(E.catNames[ci]) : null, nm = nmWords(raw);
    var school = g === 4 ? (cat && SCHOOL_CATS[cat] ? !RX_COURSE.test(nm) || RX_SCHOOL_ANY.test(nm) : RX_SCHOOL_EDU.test(nm) && !RX_COURSE.test(nm)) : RX_SCHOOL_ANY.test(nm);
    if (school) return 16;
    if (voc && addressOnly(raw, voc, g === 11 && !(ci >= 0))) return 32;
    var w = kind3(cat, nm);
    if (w) return 48 + w;
    if (dr && (dr.arr ? +dr.arr[i] > 0 : ((E.sig[i] | 0) & dr.bit))) return 48 + 10;
    return 0;
  }

  /* ======================================================= public listings */

  var tokDict = new Map(), TOK = [], TOKDESC = [];
  function tokId(t) {
    var id = tokDict.get(t);
    if (id === undefined) { id = TOK.length; tokDict.set(t, id); TOK.push(t); TOKDESC.push(DESC[t] ? 1 : 0); }
    return id;
  }

  var poiCache = null;
  /** The signature of the merchant rule's inputs for a listing file (the aligned extra file, the admin names). */
  function ruleSig(file) { var E = file ? extraFor(file) : null; return (E ? 'x' + XF.ver : '-') + (admin() ? 'a' : ''); }
  /**
   * Public listings: position, area (point in polygon), category; cached per file. Names are prepared on demand (prepNames).
   * X.ok[i] = 1: a merchant (group 0-11) within the radius, inside a kecamatan. X.nm[i]: why a listing within the radius
   * is not a merchant (merchantKind: kind * 16 + reason, 0 = a merchant); such a listing has X.ok[i] = 0.
   */
  function prepPois(file) {
    var AX = areas(), rows = file.rows, n = rows.length, R = radiusKm(), C = centre();
    var sig = n + '|' + (rows[0] ? rows[0][0] + ',' + rows[0][1] : '') + '|' + R + '|' + AX.sig + '|' + ruleSig(file);
    if (poiCache && poiCache.rows === rows && poiCache.sig === sig) return poiCache;
    var t0 = now(), E = extraFor(file), voc = adminVocab(), dr = dataRule(E, n);
    var X = {
      rows: rows, sig: sig, n: n, lon: new Float64Array(n), lat: new Float64Array(n), g: new Int8Array(n), ok: new Uint8Array(n),
      kec: new Int16Array(n), kel: new Int16Array(n), cat: new Int8Array(n), dist: new Float32Array(n), nm: new Uint8Array(n), count: 0, inRange: 0,
      tile: null, names: false
    };
    for (var i = 0; i < n; i++) {
      var r = rows[i], lon = +r[0], lat = +r[1], g = r[2] | 0;
      X.lon[i] = lon; X.lat[i] = lat; X.g[i] = g; X.kec[i] = -1; X.kel[i] = -1; X.cat[i] = -1;
      var d = havKm(C.lat, C.lon, lat, lon);
      X.dist[i] = d;
      if (!(g >= 0 && g <= 11) || !isFinite(lon) || !isFinite(lat) || d > R + 0.005) continue;
      var L = locate(lon, lat);
      if (!L || L.kecIx < 0) continue;
      X.inRange++; X.kec[i] = L.kecIx; X.kel[i] = L.kelIx; X.cat[i] = CAT_CODE[categoryOfGroup(g)];
      var k = merchantKind(r, i, E, voc, dr);
      if (k) { X.nm[i] = k; continue; }
      X.ok[i] = 1; X.count++;
    }
    X.ms = Math.round(now() - t0);
    poiCache = X;
    return X;
  }
  /** nonMerchant(i) → {kind: 'sekolah'|'alamat'|'bukan-usaha', why, words} for a listing within the radius that is no
      merchant, else null (a merchant, or outside the radius). */
  function nonMerchant(i, R) {
    R = R || last || match();
    var X = R && R.X, k = X && i >= 0 && i < X.n ? X.nm[i] : 0;
    if (!k) return null;
    var kind = NONM_KIND[k >> 4], why = (k & 15) ? NONM_WHY[k & 15] : kind;
    return { kind: kind, why: why, words: NONM_WORDS[why] || NONM_WORDS[kind] || kind };
  }
  /** nonMerchantCount() → {sekolah, alamat, lain, all, byWhy: {ibadah, pemerintah, …}}: the listings within the radius
      that are left out of every merchant number. */
  function nonMerchantCount(R) {
    R = R || last || match();
    var X = R && R.X, by = {}, out = { sekolah: 0, alamat: 0, lain: 0, all: 0, byWhy: by };
    if (!X) return out;
    for (var i = 0; i < X.n; i++) {
      var k = X.nm[i];
      if (!k) continue;
      var kind = k >> 4;
      if (kind === 1) out.sekolah++; else if (kind === 2) out.alamat++; else { out.lain++; by[NONM_WHY[k & 15]] = (by[NONM_WHY[k & 15]] || 0) + 1; }
      out.all++;
    }
    return out;
  }
  /** Normalised names, trigram codes and the blocking indexes (word per kecamatan, name prefix, 200 m grid). Once per file. */
  function prepNames(X) {
    if (X.names) return X;
    var t0 = now(), n = X.n, rows = X.rows, tokIds = [], tokFlag = [], tri = [];
    X.tokStart = new Int32Array(n + 1); X.triStart = new Int32Array(n + 1); X.coreKey = new Array(n); X.joined = new Array(n);
    X.inv = new Map(); X.pre = new Map(); X.grid = new Map(); X.df = [];
    for (var i = 0; i < n; i++) {
      X.tokStart[i] = tokIds.length; X.triStart[i] = tri.length; X.coreKey[i] = ''; X.joined[i] = '';
      if (!X.ok[i]) continue;
      var nm = normName(rows[i][3]), kc = X.kec[i];
      X.coreKey[i] = nm.coreKey; X.joined[i] = nm.joined;
      for (var k = 0; k < nm.tokens.length; k++) {
        var id = tokId(nm.tokens[k]);
        tokIds.push(id); tokFlag.push((TOKDESC[id] ? 1 : 0) | (nm.place[k] ? 2 : 0));
        X.df[id] = (X.df[id] || 0) + 1;
        var key = kc * 1048576 + id, lst = X.inv.get(key);
        if (lst) lst.push(i); else X.inv.set(key, [i]);
      }
      var tg = trigrams(nm.sorted);
      for (k = 0; k < tg.length; k++) tri.push(tg[k]);
      if (nm.joined.length >= 3) {
        var pk = kc + ':' + nm.joined.slice(0, 4), pl = X.pre.get(pk);
        if (pl) pl.push(i); else X.pre.set(pk, [i]);
      }
      var gk = Math.floor(X.lon[i] / 0.002) + ':' + Math.floor(X.lat[i] / 0.002), gl = X.grid.get(gk);
      if (gl) gl.push(i); else X.grid.set(gk, [i]);
    }
    X.tokStart[n] = tokIds.length; X.triStart[n] = tri.length;
    X.tokIds = Int32Array.from(tokIds); X.tokFlag = Uint8Array.from(tokFlag); X.tri = Int32Array.from(tri);
    X.names = true; X.msNames = Math.round(now() - t0);
    return X;
  }
  function now() { return W.performance && W.performance.now ? W.performance.now() : Date.now(); }

  /* ============================================================== matching */

  /** One LVM store or EDC merchant prepared for matching. */
  function entityOf(r, kind, ix, AX, X) {
    var nm = normName(r.name);
    var e = { kind: kind, ix: ix, id: r.id, nm: nm, kec: -1, kel: -1, kelSrc: null, exact: false, lon: null, lat: null,
      cat: -1, groups: null, active: null, branchCode: r.branchCode ? String(r.branchCode) : null, link: -1, inFocus: false, reason: null };
    if (isNum(r.lat) && isNum(r.lon) && (r.geoPrecision === 'EXACT' || r._demo)) {
      var L = locate(r.lon, r.lat);
      e.exact = true; e.lon = r.lon; e.lat = r.lat;
      if (L) { e.kec = L.kecIx; e.kel = L.kelIx; e.kelSrc = 'coords'; }
    }
    if (e.kec < 0) {
      var kc = r.kecamatanId && AX.kecById[r.kecamatanId];
      if (kc) e.kec = kc.ix;
      else if (r.kecamatan) { var rk = resolveKecamatan(r.kecamatan, r.kota); if (rk) e.kec = rk.ix; }
    }
    if (e.kel < 0 && e.kec >= 0) {
      var kl = r.kelurahanId && AX.kelById[r.kelurahanId];
      if (kl && kl.kecIx === e.kec) { e.kel = kl.ix; e.kelSrc = r.kelSrc || 'column'; }
      else if (r.kelurahan) { var rl = resolveKelurahan('kel ' + r.kelurahan, AX.kec[e.kec].id); if (rl) { e.kel = rl.ix; e.kelSrc = 'column'; } }
    }
    // business type: this parser's lob; records of the baseline parser keep the raw type in category
    var lobText = r.lob || (typeof r.category === 'string' && CAT_CODE[r.category] == null ? r.category : null);
    var cat = CAT_CODE[r.category];
    if (cat == null && isInt(r.groupIndex) && categoryOfGroup(r.groupIndex)) cat = CAT_CODE[categoryOfGroup(r.groupIndex)];
    if (cat == null && (lobText || r.mcc)) cat = CAT_CODE[categoryOfLob(lobText, r.mcc)];
    if (cat == null) { var cn = categoryOfName(r.name); cat = cn ? CAT_CODE[cn] : CAT_CODE.other; }
    e.cat = cat;
    e.groups = r._demo && isInt(r.groupIndex) ? [r.groupIndex] : (lobText || r.mcc ? groupsForLob(lobText, r.mcc) : null);
    e.active = r.active === true || r.active === false ? r.active : (r.status === 'active' ? true : (r.status === 'inactive' ? false : null));
    if (r._demo && isInt(r.poiIndex) && r.poiIndex >= 0 && r.poiIndex < X.n && X.ok[r.poiIndex]) e.link = r.poiIndex;
    if (e.kec >= 0) {
      var kk = AX.kec[e.kec];
      e.inFocus = !AX.admin || kk.in15 > 0 || (e.exact && distKm(e.lon, e.lat) <= radiusKm());
    } else if (e.exact) {
      e.inFocus = distKm(e.lon, e.lat) <= radiusKm();
    }
    return e;
  }
  function havKm(lat1, lon1, lat2, lon2) {
    var a = Math.sin((lat2 - lat1) * DEG / 2), b = Math.sin((lon2 - lon1) * DEG / 2);
    var h = a * a + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * b * b;
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function distKm(lon, lat) { var C = centre(); return havKm(C.lat, C.lon, lat, lon); }

  function idfTable(X, ents) {
    var dfM = [], nM = 0;
    ents.forEach(function (e) { nM++; e.ids.forEach(function (id) { dfM[id] = (dfM[id] || 0) + 1; }); });
    var N = X.count + nM, idf = new Float64Array(TOK.length);
    for (var id = 0; id < TOK.length; id++) idf[id] = Math.log(1 + N / (1 + (X.df[id] || 0) + (dfM[id] || 0)));
    idf.N = N;
    return idf;
  }
  function wOf(idf, id, flag) { return idf[id] * (flag & 1 ? 0.35 : 1) * (flag & 2 ? 0.5 : 1); }

  /** Name similarity of entity e and listing i, 0–1 (docs/LVM_MATCHING.md §3). */
  function simEP(e, i, X, idf, wpCache) {
    var a = e.tri, b0 = X.triStart[i], b1 = X.triStart[i + 1], inter = 0, ia = 0, ib = b0;
    while (ia < a.length && ib < b1) {
      var x = a[ia], y = X.tri[ib];
      if (x === y) { inter++; ia++; ib++; } else if (x < y) ia++; else ib++;
    }
    var nt = a.length + (b1 - b0), tri = nt ? 2 * inter / nt : 0;
    var p0 = X.tokStart[i], p1 = X.tokStart[i + 1], q, wp = wpCache[i];
    if (!(wp >= 0)) { wp = 0; for (q = p0; q < p1; q++) wp += wOf(idf, X.tokIds[q], X.tokFlag[q]); wpCache[i] = wp; }
    var used = 0, shared = 0;
    for (var k = 0; k < e.ids.length; k++) {
      var id = e.ids[k], wm = e.w[k], hit = -1;
      for (q = p0; q < p1; q++) if (!(used & (1 << (q - p0))) && X.tokIds[q] === id) { hit = q; break; }
      if (hit >= 0) { used |= 1 << (hit - p0); shared += Math.min(wm, wOf(idf, id, X.tokFlag[hit])); continue; }
      var s = TOK[id];
      if (s.length < 5) continue;
      for (q = p0; q < p1; q++) {
        if (used & (1 << (q - p0))) continue;
        if (fuzzyEq(s, TOK[X.tokIds[q]])) { used |= 1 << (q - p0); shared += 0.8 * Math.min(wm, wOf(idf, X.tokIds[q], X.tokFlag[q])); break; }
      }
    }
    var tok = (e.wsum + wp) > 0 ? 2 * shared / (e.wsum + wp) : 0;
    var sc = 0.5 * tri + 0.5 * tok;
    if (e.nm.joined.length >= 4 && e.nm.joined === X.joined[i]) sc = Math.max(sc, CFG.joinedEqual);
    if (e.nm.coreKey && e.nm.coreKey === X.coreKey[i]) sc = Math.max(sc, CFG.coreEqual);
    return sc;
  }
  function adjust(e, i, X, sc) {
    var a = sc;
    if (e.kel >= 0 && X.kel[i] >= 0) {
      if (e.kel === X.kel[i]) a += CFG.kelBonus;
      else a -= e.kelSrc === 'postcode' ? CFG.kelPenalty / 2 : CFG.kelPenalty;
    }
    if (e.groups && X.g[i] !== 11 && e.groups.indexOf(X.g[i]) < 0) a -= CFG.catPenalty;
    if (e.exact) {
      var kx = 111.32 * Math.cos(e.lat * DEG), dx = (X.lon[i] - e.lon) * kx, dy = (X.lat[i] - e.lat) * 110.574, dm = Math.sqrt(dx * dx + dy * dy) * 1000;
      a += dm <= 60 ? 0.08 : (dm <= 150 ? 0.04 : (dm > 600 ? -0.2 : 0));
    }
    return a;
  }

  /** Matches entities (LVM stores or EDC merchants) to listings, one-to-one. Fills e.poi, e.score, e.second, e.reason. */
  function runMatch(ents, X, idf) {
    var stamp = new Int32Array(X.n), run = 0, wpCache = new Float64Array(X.n).fill(-1), cap = CFG.cap;
    var cand = [];
    function add(list) { for (var j = 0; j < list.length; j++) { var p = list[j]; if (stamp[p] !== run) { stamp[p] = run; cand.push(p); } } }
    ents.forEach(function (e) {
      e.poi = -1; e.score = 0; e.second = 0; e.method = null;
      if (e.link >= 0) { e.best = e.link; e.bestAdj = 1; e.secondAdj = 0; e.method = 'link'; return; }
      if (e.kec < 0 && !e.exact) { e.reason = e.reason || 'no-kecamatan'; e.best = -1; return; }
      if (!e.inFocus) { e.reason = 'outside'; e.best = -1; return; }
      run++; cand.length = 0;
      if (e.kec >= 0) {
        for (var k = 0; k < e.ids.length; k++) { var lst = X.inv.get(e.kec * 1048576 + e.ids[k]); if (lst && lst.length <= cap) add(lst); }
        if (e.nm.joined.length >= 3) { var pl = X.pre.get(e.kec + ':' + e.nm.joined.slice(0, 4)); if (pl && pl.length <= cap) add(pl); }
      }
      if (e.exact) {
        var gx = Math.floor(e.lon / 0.002), gy = Math.floor(e.lat / 0.002), rr = Math.ceil(CFG.nearM / 200);
        for (var ax = -rr; ax <= rr; ax++) for (var ay = -rr; ay <= rr; ay++) { var gl = X.grid.get((gx + ax) + ':' + (gy + ay)); if (gl) add(gl); }
      }
      var best = -1, bA = -Infinity, sA = -Infinity, bRaw = 0;
      for (var c = 0; c < cand.length; c++) {
        var i = cand[c];
        if (e.exact && e.kec >= 0 && X.kec[i] !== e.kec) {
          var kx = 111.32 * Math.cos(e.lat * DEG), dx = (X.lon[i] - e.lon) * kx, dy = (X.lat[i] - e.lat) * 110.574;
          if (Math.sqrt(dx * dx + dy * dy) * 1000 > CFG.nearM) continue;
        }
        var raw = simEP(e, i, X, idf, wpCache);
        if (raw < 0.45) continue;
        var adj = adjust(e, i, X, raw);
        if (adj > bA) { sA = bA; bA = adj; best = i; bRaw = raw; } else if (adj > sA) sA = adj;
      }
      e.best = best; e.bestAdj = bA; e.secondAdj = sA > -Infinity ? sA : 0; e.bestRaw = bRaw;
      if (best < 0) { e.reason = cand.length ? 'below-threshold' : 'no-candidate'; return; }
      var low = e.info < CFG.lowInfo, need = low ? CFG.acceptLowInfo : CFG.accept;
      if (bA < need) { e.reason = 'below-threshold'; e.best = -1; return; }
      if (low && !e.exact && !(e.kel >= 0 && X.kel[best] === e.kel)) { e.reason = 'low-information'; e.best = -1; return; }
      var kelOff = e.kel >= 0 && X.kel[best] >= 0 && X.kel[best] !== e.kel && e.kelSrc !== 'postcode';
      var typeOff = e.groups && X.g[best] !== 11 && e.groups.indexOf(X.g[best]) < 0;
      if (kelOff && typeOff && !e.exact) { e.reason = 'conflict'; e.best = -1; return; }   // other kelurahan and other business type
      if (bA - e.secondAdj < CFG.margin) { e.reason = 'ambiguous'; e.best = -1; return; }
      e.method = e.exact ? 'name+place' : (e.kel >= 0 && X.kel[best] === e.kel ? 'name+kelurahan' : 'name');
    });
    var order = ents.filter(function (e) { return e.best >= 0; }).sort(function (a, b) { return b.bestAdj - a.bestAdj || a.ix - b.ix; });
    var owner = new Int32Array(X.n).fill(-1);
    order.forEach(function (e) {
      if (owner[e.best] >= 0) { e.reason = 'taken'; e.method = null; return; }
      owner[e.best] = e.ix; e.poi = e.best; e.score = Math.round(Math.min(1, e.bestAdj) * 1000) / 1000; e.second = Math.round(Math.max(0, e.secondAdj) * 1000) / 1000; e.reason = 'matched';
    });
    return owner;
  }

  function prepEntities(list, kind, X, AX) {
    var ents = list.map(function (r, ix) { return entityOf(r, kind, ix, AX, X); });
    ents.forEach(function (e) {
      e.ids = e.nm.tokens.map(tokId);
      e.flags = e.nm.tokens.map(function (t, k) { return (DESC[t] ? 1 : 0) | (e.nm.place[k] ? 2 : 0); });
      e.tri = trigrams(e.nm.sorted);
    });
    return ents;
  }
  function weigh(ents, idf) {
    ents.forEach(function (e) {
      e.w = e.ids.map(function (id, k) { return wOf(idf, id, e.flags[k]); });
      e.wsum = e.w.reduce(function (s, x) { return s + x; }, 0);
      var info = 0, seen = {}, top = Math.log(1 + (idf.N || 1));
      e.nm.core.forEach(function (t) { var id = tokId(t); if (!seen[id]) { seen[id] = 1; info += idf[id] || top; } });
      e.info = top > 0 ? info / top : 0;
    });
  }

  function approxPoint(e, AX) {
    if (e.exact) return { lon: e.lon, lat: e.lat, precision: 'exact', approximate: false };
    var base = null, precision = null, rM = CFG.jitterM, area = null;
    if (e.kel >= 0 && AX.kel[e.kel].label) { base = AX.kel[e.kel].label; precision = 'kelurahan'; area = AX.kel[e.kel].id; }
    else if (e.kec >= 0 && AX.kec[e.kec].label) { base = AX.kec[e.kec].label; precision = 'kecamatan'; rM *= 1.8; area = AX.kec[e.kec].id; }
    if (!base) return null;
    var h = hash('approx|' + e.id), A = admin();
    for (var t = 0; t < 4; t++) {
      var ang = ((h >>> (t * 4)) % 360) * DEG, frac = 0.35 + ((h >>> 9) % 1000) / 1000 * 0.65, rr = rM * frac / (t + 1);
      var lon = base[0] + Math.cos(ang) * rr / (111320 * Math.cos(base[1] * DEG)), lat = base[1] + Math.sin(ang) * rr / 110574;
      if (!A) return { lon: lon, lat: lat, precision: precision, approximate: true };
      var L = A.locate(lon, lat);
      if (L && (precision === 'kelurahan' ? L.kelurahanId === area : L.kecamatanId === area)) return { lon: round6(lon), lat: round6(lat), precision: precision, approximate: true };
    }
    return { lon: base[0], lat: base[1], precision: precision, approximate: true };
  }
  function round6(x) { return Math.round(x * 1e6) / 1e6; }

  var last = null, aggMemo = {};
  function dataRows(key) { var d = MCD.data; return d && Array.isArray(d[key]) ? d[key] : []; }
  function resultKey(lvm, edc, file) {
    return [lvm.length, edc.length, file ? file.rows.length : 0, cfgSig(), areas().sig, !!hexFile(), ruleSig(file)].join('|');
  }

  /**
   * match(opts?) → result. opts: {lvm, edc, pois (an MCD_SME_POIS-like object), force}. Defaults: MCD.data.lvm,
   * MCD.data.edc and window.MCD_SME_POIS. Cached until the datasets, the listing file or the settings change.
   */
  function match(opts) {
    opts = opts || {};
    var lvm = opts.lvm || dataRows('lvm'), edcRows = opts.edc || dataRows('edc'), file = opts.pois || poisFile();
    var key = resultKey(lvm, edcRows, file);
    if (!opts.force && last && last.key === key && last.lvmRef === lvm && last.edcRef === edcRows && last.fileRef === file) return last;
    var t0 = now(), AX = areas();
    var X = file ? prepPois(file) : null;
    var t1 = now();
    var res = { key: key, lvmRef: lvm, edcRef: edcRows, fileRef: file, X: X, ready: !!X, hasLvm: lvm.length > 0, hasEdc: edcRows.length > 0,
      demo: !!(MCD.data && MCD.data.meta && MCD.data.meta.lvm && MCD.data.meta.lvm.source === 'demo'),
      asOf: (MCD.data && MCD.data.meta && MCD.data.meta.lvm && MCD.data.meta.lvm.asOf) || null,
      merchants: [], edc: [], edcMerchants: [], pois: null, offMapList: null, ms: {}, byId: {} };
    if (!X) { res.ms = { pois: 0, match: 0, total: Math.round(now() - t0) }; last = res; aggMemo = {}; return res; }
    var n = X.n, st = new Uint8Array(n), act = new Int8Array(n).fill(-1), mIx = new Int32Array(n).fill(-1), score = new Float32Array(n),
      eIx = new Int32Array(n).fill(-1), eAct = new Int8Array(n).fill(-1), own = new Int8Array(n).fill(-1);
    for (var i = 0; i < n; i++) if (X.ok[i]) st[i] = lvm.length ? STATUS.NOT_YET : STATUS.POTENTIAL;
    if (lvm.length || edcRows.length) prepNames(X);
    var ents = prepEntities(lvm, 'lvm', X, AX);
    var edcList = edcMerchants(edcRows), eEnts = prepEntities(edcList, 'edc', X, AX);
    var idf = idfTable(X, ents.concat(eEnts));
    weigh(ents, idf); weigh(eEnts, idf);
    runMatch(ents, X, idf);
    runMatch(eEnts, X, idf);
    ents.forEach(function (e) {
      if (e.poi < 0) return;
      st[e.poi] = STATUS.ACQUIRED; mIx[e.poi] = e.ix; score[e.poi] = e.score;
      act[e.poi] = e.active === true ? 1 : (e.active === false ? 0 : -1);
      own[e.poi] = e.branchCode ? (e.branchCode === HOME ? 1 : 0) : -1;
    });
    eEnts.forEach(function (e) { if (e.poi < 0) return; eIx[e.poi] = e.ix; eAct[e.poi] = e.active === true ? 1 : (e.active === false ? 0 : -1); });
    res.pois = { n: n, status: st, active: act, merchant: mIx, score: score, edc: eIx, edcActive: eAct, ownBranch: own, kec: X.kec, kel: X.kel, cat: X.cat, ok: X.ok };
    res.merchants = ents.map(function (e) { return slim(e, lvm[e.ix], AX); });
    res.edcMerchants = edcList;
    res.edc = eEnts.map(function (e) { return slim(e, edcList[e.ix], AX); });
    if (opts.annotate !== false) annotate(lvm, ents, edcRows, eEnts, edcList);
    res.merchants.forEach(function (m) { res.byId[m.id] = m; });
    res.edc.forEach(function (m) { res.byId[m.id] = m; });
    var t2 = now();
    res.ms = { pois: Math.round(t1 - t0), poisPrep: X.ms, names: X.msNames || 0, match: Math.round(t2 - t1), total: Math.round(t2 - t0) };
    last = res; aggMemo = {};
    return res;
  }
  function slim(e, r, AX) {
    var o = { id: e.id, kind: e.kind, ix: e.ix, poi: e.poi, score: e.score, second: e.second, method: e.method, reason: e.reason,
      kecamatanId: e.kec >= 0 ? AX.kec[e.kec].id : null, kelurahanId: e.kel >= 0 ? AX.kel[e.kel].id : null, kelSrc: e.kelSrc,
      kec: e.kec, kel: e.kel, category: CATS[e.cat], active: e.active, branchCode: e.branchCode, inFocus: e.inFocus, info: Math.round(e.info * 100) / 100,
      exact: e.exact, place: null, best: isNum(e.bestAdj) && e.bestAdj > -Infinity ? Math.round(e.bestAdj * 1000) / 1000 : null };
    if (o.poi < 0 && o.inFocus) o.place = geoPlace(r, approxPoint(e, AX));
    if (r && r._demo) o.demo = true;
    return o;
  }
  /* A street point from the address (item 28) wins over the approximate area point; an area point of the geocoder
     only where lvm.js knew less (no kelurahan). Kelurahan points keep the small deterministic spread of approxPoint,
     so the stores of one kelurahan do not sit on one dot. */
  var PREC_RANK = { exact: 4, jalan: 3, kampung: 3, kelurahan: 2, kecamatan: 1 };
  function geoPlace(r, approx) {
    var p = r && GEO_PREC[r.geoPrecision];
    if (!p || !isNum(r.lon) || !isNum(r.lat)) {
      var g = r && GEO.byId[r.id];                           // placed after this record was copied (applyGeoToData)
      if (!g || r._demo || r.geoPrecision === 'EXACT') return approx;
      p = GEO_PREC[g.geoPrecision];
      r = { lon: g.lon, lat: g.lat };
    }
    if (approx && (PREC_RANK[approx.precision] || 0) >= (PREC_RANK[p] || 0)) return approx;
    return { lon: r.lon, lat: r.lat, precision: p, approximate: true, geocoded: true };
  }
  /**
   * locationSummary() → where the LVM stores in the 15 km focus sit on the map, counts only (item 28):
   * {total, listing (at their public listing), exact (coordinates in the file), jalan, kampung, kelurahan, kecamatan,
   *  none, street (jalan + kampung), area (kelurahan + kecamatan), geocoded (drawn at the point from the address),
   *  fromAddress (stores whose address was read for a point; 0 after an encrypted copy saved before item 28)}.
   */
  function locationSummary() {
    var R = last || match(), rows = R.lvmRef || dataRows('lvm');
    var out = { total: 0, listing: 0, exact: 0, jalan: 0, kampung: 0, kelurahan: 0, kecamatan: 0, none: 0, street: 0, area: 0, geocoded: 0, fromAddress: 0 };
    R.merchants.forEach(function (m) {
      if (!m.inFocus) return;
      out.total++;
      var rec = m.kind === 'lvm' ? rows[m.ix] : null;
      if (rec && (GEO_PREC[rec.geoPrecision] || GEO.byId[rec.id])) out.fromAddress++;   // this import read the address
      if (m.poi >= 0) { out.listing++; return; }
      var p = m.place;
      if (!p) { out.none++; return; }
      out[p.precision] = (out[p.precision] || 0) + 1;
      if (p.geocoded) out.geocoded++;
    });
    out.street = out.jalan + out.kampung;
    out.area = out.kelurahan + out.kecamatan;
    return out;
  }

  /**
   * Runtime fields on the records themselves (stripped by MCD.importer.exportImportedDatasets, never saved):
   * poiIndex = row of MCD_SME_POIS.rows (or null) and match = {score, method} | {reason}. MCD.territory.statsFromRecords
   * reads poiIndex. EDC terminals get the poiIndex of their merchant.
   */
  function annotate(lvm, ents, edcRows, eEnts, edcList) {
    ents.forEach(function (e) {
      var r = lvm[e.ix];
      if (!r || typeof r !== 'object') return;
      r.poiIndex = e.poi >= 0 ? e.poi : null;
      r.match = e.poi >= 0 ? { score: e.score, method: e.method } : { reason: e.reason };
    });
    eEnts.forEach(function (e) {
      var m = edcList[e.ix];
      (m && m._rows || []).forEach(function (k) {
        var r = edcRows[k];
        if (!r || typeof r !== 'object') return;
        r.poiIndex = e.poi >= 0 ? e.poi : null;
        r.match = e.poi >= 0 ? { score: e.score, method: e.method, merchant: m.id } : { reason: e.reason, merchant: m.id };
      });
    });
  }

  /**
   * territoryInput(opts?) → the input of MCD.territory.stats(): {acquired: [listing rows], edc: [listing rows],
   * unlisted: [{kecamatanId} | {lon, lat}], demo}. acquired is null before the LVM file is imported (potential only).
   * Unlisted = LVM stores in the 15 km focus with no public listing, by their kecamatan (exact point when known).
   */
  function territoryInput(opts) {
    var R = match(opts), acquired = R.hasLvm ? [] : null, edc = [], unlisted = [];
    R.merchants.forEach(function (m) {
      if (m.poi >= 0) acquired.push(m.poi);
      else if (m.inFocus && m.exact && m.place) unlisted.push({ lon: m.place.lon, lat: m.place.lat });
      else if (m.inFocus && m.kecamatanId) unlisted.push({ kecamatanId: m.kecamatanId });
    });
    R.edc.forEach(function (m) { if (m.poi >= 0) edc.push(m.poi); });
    /* the configured colour rule travels with the input, so configure({bandMode}) also recolours the territory maps */
    return { acquired: acquired, edc: edc, unlisted: unlisted, demo: R.demo,
      bandMode: CFG.bandMode === 'absolute' ? 'absolute' : 'relative', minInFocus: isNum(CFG.minInFocus) ? CFG.minInFocus : 0.5 };
  }

  /** matchAsync(opts?) → Promise<result>; yields to the browser before the heavy step. */
  function matchAsync(opts) {
    return new Promise(function (resolve, reject) {
      var go = function () { try { resolve(match(opts)); } catch (e) { reject(e); } };
      if (typeof W.setTimeout === 'function') W.setTimeout(go, 0); else go();
    });
  }

  /* ========================================================= lookups */

  function result() { return last; }
  /** poiStatus(i) → {status: 'potential'|'not_yet'|'acquired', score, merchantId, branchCode, active, edc, kecamatanId, kelurahanId, category} | null. */
  function poiStatus(i, R) {
    R = R || last || match();
    var X = R.X, P = R.pois;
    if (!X || !P || !(i >= 0 && i < P.n) || !X.ok[i]) return null;
    var AX = areas(), s = P.status[i], m = P.merchant[i] >= 0 ? R.merchants[P.merchant[i]] : null, e = P.edc[i] >= 0 ? R.edc[P.edc[i]] : null;
    return {
      status: s === STATUS.ACQUIRED ? 'acquired' : (s === STATUS.NOT_YET ? 'not_yet' : 'potential'),
      score: m ? m.score : null, merchantId: m ? m.id : null, branchCode: m ? m.branchCode : null,
      ownBranch: m ? m.branchCode === HOME : null, active: m ? m.active : null,
      edc: e ? { merchantId: e.id, active: e.active, score: e.score } : null,
      kecamatanId: X.kec[i] >= 0 ? AX.kec[X.kec[i]].id : null, kelurahanId: X.kel[i] >= 0 ? AX.kel[X.kel[i]].id : null,
      category: CATS[X.cat[i]]
    };
  }
  /** merchantMatch(id) → the match record of an LVM store or EDC merchant (poi index, score, method, reason, place). */
  function merchantMatch(id) { var R = last || match(); return R.byId[id] || null; }
  /** offMap() → stores (and EDC merchants) in the 15 km focus with no public listing, each with an approximate place. */
  function offMap() {
    var R = last || match();
    if (R.offMapList) return R.offMapList;
    R.offMapList = R.merchants.concat(R.edc).filter(function (m) { return m.poi < 0 && m.inFocus && m.place; }).map(function (m) {
      return { id: m.id, kind: m.kind, kecamatanId: m.kecamatanId, kelurahanId: m.kelurahanId, lon: m.place.lon, lat: m.place.lat,
        precision: m.place.precision, approximate: m.place.approximate, geocoded: !!m.place.geocoded, category: m.category, active: m.active, branchCode: m.branchCode, reason: m.reason };
    });
    return R.offMapList;
  }
  /** locationOf(id) → {lon, lat, precision: 'listing'|'exact'|'jalan'|'kampung'|'kelurahan'|'kecamatan', approximate, geocoded, poi} | null. */
  function locationOf(id) {
    var R = last || match(), m = R.byId[id];
    if (!m) return null;
    if (m.poi >= 0) return { lon: R.X.lon[m.poi], lat: R.X.lat[m.poi], precision: 'listing', approximate: false, poi: m.poi };
    return m.place ? { lon: m.place.lon, lat: m.place.lat, precision: m.place.precision, approximate: m.place.approximate, geocoded: !!m.place.geocoded, poi: -1 } : null;
  }
  /** similarity(a, b) → 0–1 name score with flat word weights (tests, debugging; the matcher uses IDF weights). */
  function similarity(a, b) {
    var na = normName(a), nb = normName(b);
    var ta = trigrams(na.sorted), tb = trigrams(nb.sorted), inter = 0, i = 0, j = 0;
    while (i < ta.length && j < tb.length) { if (ta[i] === tb[j]) { inter++; i++; j++; } else if (ta[i] < tb[j]) i++; else j++; }
    var tri = (ta.length + tb.length) ? 2 * inter / (ta.length + tb.length) : 0;
    var wa = 0, wb = 0, shared = 0, used = {};
    function w(t, k, n) { return (DESC[t] ? 0.35 : 1) * (n.place[k] ? 0.5 : 1); }
    na.tokens.forEach(function (t, k) { wa += w(t, k, na); });
    nb.tokens.forEach(function (t, k) { wb += w(t, k, nb); });
    na.tokens.forEach(function (t, k) {
      for (var q = 0; q < nb.tokens.length; q++) {
        if (used[q]) continue;
        var u = nb.tokens[q];
        if (u === t) { used[q] = 1; shared += Math.min(w(t, k, na), w(u, q, nb)); return; }
      }
      for (q = 0; q < nb.tokens.length; q++) if (!used[q] && fuzzyEq(t, nb.tokens[q])) { used[q] = 1; shared += 0.8 * Math.min(w(t, k, na), w(nb.tokens[q], q, nb)); return; }
    });
    var sc = 0.5 * tri + 0.5 * ((wa + wb) ? 2 * shared / (wa + wb) : 0);
    if (na.joined.length >= 4 && na.joined === nb.joined) sc = Math.max(sc, CFG.joinedEqual);
    if (na.coreKey && na.coreKey === nb.coreKey) sc = Math.max(sc, CFG.coreEqual);
    return Math.round(sc * 1000) / 1000;
  }

  /* ============================================================ aggregates */

  function bands() { var b = MCD.config && MCD.config.coverageBands; return b && isNum(b.ok) ? b : { ok: 0.5, mid: 0.2 }; }
  function emptyCats() { return { potential: 0, acquired: 0, notYet: 0, active: 0, inactive: 0 }; }
  function newEntry(id, name, extra) {
    var e = { id: id, name: name, potential: 0, acquired: 0, notYet: 0, coverage: null, status: 'noData', banked: 0, penetration: null,
      active: 0, inactive: 0, ownBranch: 0, otherBranch: 0,
      byCategory: { grocery: emptyCats(), restaurant: emptyCats(), other: emptyCats() },
      offMap: { all: 0, grocery: 0, restaurant: 0, other: 0, active: 0, inactive: 0 },
      edc: { acquired: 0, active: 0, offMap: 0 }, lvmStores: 0 };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }

  function tileIndex(X) {
    var Hx = hexFile();
    if (!Hx) return null;
    if (X.tile && X.tile.H === Hx) return X.tile;
    var tiles = Hx.tiles(), m = Hx.meta.hex, c0 = Hx.meta.center, Rk = m.sideKm, KX = m.kx, KY = m.ky, S3 = Math.sqrt(3);
    var byKey = new Map(), AX = areas();
    tiles.forEach(function (t, ix) { var k = t.q + ',' + t.r + '|' + t.kecamatanId, l = byKey.get(k); if (l) l.push(ix); else byKey.set(k, [ix]); });
    function inPoly(x, y, poly) {
      var inside = false;
      for (var p = 0; p < poly.length; p++) {
        var rg = poly[p];
        for (var a = 0, b = rg.length - 1; a < rg.length; b = a++) {
          var xi = rg[a][0], yi = rg[a][1], xj = rg[b][0], yj = rg[b][1];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
      }
      return inside;
    }
    function axial(lon, lat) {
      var x = (lon - c0[0]) * KX, y = (lat - c0[1]) * KY;
      var q = x / (1.5 * Rk), r = y / (S3 * Rk) - q / 2, s = -q - r;
      var rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
      var dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
      if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
      return [rq, rr];
    }
    var NB = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    // Same rule as tools/build-territory-hex.py: the first tile (file order) of the place's kecamatan whose polygon
    // contains it; a place just outside every tile goes to the nearest one. Only the hexagon and its neighbours are tested.
    function tileOf(lon, lat, kecId) {
      var qr = axial(lon, lat), cand = [], best = -1, bd = Infinity;
      for (var k = 0; k < NB.length; k++) {
        var lst = byKey.get((qr[0] + NB[k][0]) + ',' + (qr[1] + NB[k][1]) + '|' + kecId);
        if (lst) for (var j = 0; j < lst.length; j++) cand.push(lst[j]);
      }
      cand.sort(function (a, b) { return a - b; });
      for (k = 0; k < cand.length; k++) if (inPoly(lon, lat, tiles[cand[k]].polygon)) return cand[k];
      for (k = 0; k < cand.length; k++) {
        var d = edgeDist(lon, lat, tiles[cand[k]].polygon);
        if (d < bd) { bd = d; best = cand[k]; }
      }
      return best;
    }
    function edgeDist(lon, lat, poly) {
      var best = Infinity, x = lon * KX, y = lat * KY;
      for (var p = 0; p < poly.length; p++) {
        var rg = poly[p];
        for (var a = 0; a + 1 < rg.length; a++) {
          var x1 = rg[a][0] * KX, y1 = rg[a][1] * KY, x2 = rg[a + 1][0] * KX, y2 = rg[a + 1][1] * KY, dx = x2 - x1, dy = y2 - y1;
          var L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0;
          var ex = x1 + t * dx - x, ey = y1 + t * dy - y, d = ex * ex + ey * ey;
          if (d < best) best = d;
        }
      }
      return best;
    }
    var of = new Int32Array(X.n).fill(-1), mismatch = 0;
    for (var i = 0; i < X.n; i++) if (X.ok[i] && X.kec[i] >= 0) of[i] = tileOf(X.lon[i], X.lat[i], AX.kec[X.kec[i]].id);
    var cnt = new Int32Array(tiles.length);
    for (i = 0; i < X.n; i++) if (of[i] >= 0) cnt[of[i]]++;
    tiles.forEach(function (t, ix) { if (t.potential && t.potential.merchants !== cnt[ix]) mismatch++; });
    X.tile = { H: Hx, tiles: tiles, of: of, tileOf: tileOf, mismatch: mismatch };
    return X.tile;
  }

  /**
   * aggregate(level, opts?) → {level, ready, hasLvm, hasEdc, demo, asOf, totals, areas: {<id>: entry}}.
   * level: 'kecamatan' (default) | 'kelurahan' | 'tile'. Areas are keyed by Kemendagri code (tile id for tiles);
   * entry: {id, name, potential, acquired, notYet, coverage, status, banked, penetration, active, inactive, ownBranch,
   * otherBranch, byCategory{grocery, restaurant, other}, offMap{…}, edc{…}, lvmStores, …}.
   */
  function aggregate(level, opts) {
    level = level === 'kelurahan' ? 'kelurahan' : (level === 'tile' ? 'tile' : 'kecamatan');
    var R = match(opts);                                   // cached while the datasets and settings are unchanged
    var mk = R.key + '|' + level;
    if (aggMemo[mk]) return aggMemo[mk];
    var AX = areas(), X = R.X, B = bands(), out = { level: level, ready: !!X, hasLvm: R.hasLvm, hasEdc: R.hasEdc, demo: R.demo, asOf: R.asOf,
      source: 'Overture Maps places' + (poisFile() && poisFile().meta && poisFile().meta.release ? ' ' + poisFile().meta.release : '') + (R.hasLvm ? ' · file Livin’ Merchant' : ''),
      areas: {}, totals: null, unplaced: 0 };
    var T = newEntry('total', 'Dalam ' + radiusKm() + ' km');
    T.merchants = R.merchants.length; T.inFocus = 0; T.matched = 0; T.outside = 0; T.noKecamatan = 0; T.ambiguous = 0;
    if (!X) { out.totals = finish(T, R, B); aggMemo[mk] = out; return out; }
    var tix = level === 'tile' ? tileIndex(X) : null;
    if (level === 'tile' && !tix) out.ready = false;
    function areaOfPoi(i) {
      if (level === 'kecamatan') return X.kec[i] >= 0 ? AX.kec[X.kec[i]] : null;
      if (level === 'kelurahan') return X.kel[i] >= 0 ? AX.kel[X.kel[i]] : null;
      return tix && tix.of[i] >= 0 ? tix.tiles[tix.of[i]] : null;
    }
    function entryFor(a) {
      var e = out.areas[a.id];
      if (e) return e;
      if (level === 'kecamatan') e = newEntry(a.id, a.name, { kota: a.kota, kotaId: a.kotaId, in15: a.in15, label: a.label });
      else if (level === 'kelurahan') e = newEntry(a.id, a.name, { kecamatanId: a.kecId, kecamatan: AX.kecById[a.kecId] ? AX.kecById[a.kecId].name : null, in15: a.in15, label: a.label });
      else e = newEntry(a.id, null, { kecamatanId: a.kecamatanId, kelurahanId: a.kelurahanId, centre: a.centre, f15: a.f15, q: a.q, r: a.r });
      out.areas[a.id] = e;
      return e;
    }
    var P = R.pois;
    for (var i = 0; i < X.n; i++) {
      if (!X.ok[i]) continue;
      var cat = CATS[X.cat[i]], acq = P.status[i] === STATUS.ACQUIRED;
      var a = areaOfPoi(i), list = a ? [T, entryFor(a)] : [T];
      if (!a) out.unplaced++;
      for (var k = 0; k < list.length; k++) {
        var e = list[k], bc = e.byCategory[cat];
        e.potential++; bc.potential++;
        if (R.hasLvm) {
          if (acq) {
            e.acquired++; bc.acquired++; e.lvmStores++;
            if (P.active[i] === 1) { e.active++; bc.active++; } else if (P.active[i] === 0) { e.inactive++; bc.inactive++; }
            if (P.ownBranch[i] === 1) e.ownBranch++; else if (P.ownBranch[i] === 0) e.otherBranch++;
          } else { e.notYet++; bc.notYet++; }
        }
        if (P.edc[i] >= 0) { e.edc.acquired++; if (P.edcActive[i] === 1) e.edc.active++; }
      }
    }
    function addOff(m, isEdc) {
      var a = null;
      if (level === 'kecamatan') a = m.kec >= 0 ? AX.kec[m.kec] : null;
      else if (level === 'kelurahan') a = m.kel >= 0 ? AX.kel[m.kel] : null;
      else if (tix && m.exact && m.place && m.kecamatanId) { var ti = tix.tileOf(m.place.lon, m.place.lat, m.kecamatanId); a = ti >= 0 ? tix.tiles[ti] : null; }
      var targets = a ? [T, entryFor(a)] : [T];
      targets.forEach(function (e) {
        if (isEdc) { e.edc.offMap++; return; }
        e.offMap.all++; e.offMap[m.category]++; e.lvmStores++;
        if (m.active === true) e.offMap.active++; else if (m.active === false) e.offMap.inactive++;
      });
    }
    R.merchants.forEach(function (m) {
      if (m.reason === 'outside') T.outside++;
      else if (m.reason === 'no-kecamatan') T.noKecamatan++;
      if (m.reason === 'ambiguous') T.ambiguous++;
      if (m.inFocus) T.inFocus++;
      if (m.poi >= 0) T.matched++;
      else if (m.inFocus) addOff(m, false);
    });
    R.edc.forEach(function (m) { if (m.poi < 0 && m.inFocus) addOff(m, true); });
    Object.keys(out.areas).forEach(function (id) { finish(out.areas[id], R, B); });
    out.totals = finish(T, R, B);
    out.totals.matchRate = T.inFocus ? T.matched / T.inFocus : null;
    out.bands = rankAreas(out.areas, level, R.hasLvm);
    out.totals.band = out.totals.statusKnown;               // one total: the fixed bands (nothing to rank it against)
    if (tix) out.tileCheck = { tiles: tix.tiles.length, potentialMismatch: tix.mismatch };
    aggMemo[mk] = out;
    return out;
  }
  /* Relative bands (COPY_STYLE_EN item 18, decided 15 Oct 2026). The areas within 15 km (at least minInFocus of
     their area inside the circle, with public merchants there) are ranked by coverageKnown: top third 'acquired'
     (green), middle third 'partly' (amber), bottom third 'notYet' (red); ties share the lower band. Every area
     gets band (the colour in the configured mode) and bandRel (relative band or null); areas that are not
     ranked get band 'noData'. With fewer than 3 different values (nothing acquired yet) the fixed bands
     (statusKnown) apply. status / statusKnown keep the fixed bands of MCD.config.coverageBands. */
  function terciles(values) {
    var v = values.filter(isNum).sort(function (a, b) { return a - b; }), n = v.length, distinct = 0;
    for (var i = 0; i < n; i++) if (!i || v[i] !== v[i - 1]) distinct++;
    if (n < 3 || distinct < 3) return null;
    var lo = v[Math.ceil(n / 3) - 1], hi = v[Math.ceil(2 * n / 3) - 1];
    return lo < hi ? { lo: lo, hi: hi, n: n } : null;       // ties fill two thirds: no real middle third
  }
  function relBand(c, t) { return c <= t.lo ? 'notYet' : (c <= t.hi ? 'partly' : 'acquired'); }
  function rankAreas(areasById, level, hasLvm) {
    var mode = CFG.bandMode === 'absolute' ? 'absolute' : 'relative', minIn = isNum(CFG.minInFocus) ? CFG.minInFocus : 0.5;
    var info = { mode: mode, rule: 'known', applied: false, lo: null, hi: null, n: 0, minInFocus: minIn };
    var ids = Object.keys(areasById);
    ids.forEach(function (id) { var e = areasById[id]; e.band = e.statusKnown; e.bandRel = null; e.ranked = false; });
    if (!hasLvm || mode !== 'relative') return info;
    var focusOf = function (e) { return level === 'tile' ? (isNum(e.f15) ? e.f15 : 0) : (isNum(e.in15) ? e.in15 : 0); };
    var ranked = ids.filter(function (id) { var e = areasById[id]; return e.potential > 0 && isNum(e.coverageKnown) && focusOf(e) >= minIn; });
    var t = terciles(ranked.map(function (id) { return areasById[id].coverageKnown; }));
    info.n = ranked.length;
    if (!t) return info;
    var keep = {};
    ranked.forEach(function (id) { var e = areasById[id]; keep[id] = 1; e.bandRel = relBand(e.coverageKnown, t); e.band = e.bandRel; e.ranked = true; });
    ids.forEach(function (id) { if (!keep[id]) areasById[id].band = 'noData'; });
    info.applied = true; info.lo = t.lo; info.hi = t.hi;
    return info;
  }
  /** coverage ('listed') = acquired / public listings; coverageKnown = (acquired + LVM stores with no listing) /
      (public listings + LVM stores with no listing), the rule of MCD.territory ('known'). status / statusKnown:
      MCD.config.coverageBands ('acquired' ≥ 50%, 'partly' ≥ 20%, else 'notYet'); 'potential' before the import. */
  function band(c, B) { return c >= B.ok ? 'acquired' : (c >= B.mid ? 'partly' : 'notYet'); }
  function finish(e, R, B) {
    var off = e.offMap.all;
    e.coverage = R.hasLvm && e.potential ? e.acquired / e.potential : null;
    e.coverageKnown = R.hasLvm && (e.potential + off) ? (e.acquired + off) / (e.potential + off) : null;
    e.banked = R.hasLvm ? e.acquired : 0;
    e.penetration = e.coverage;
    e.status = !e.potential ? 'noData' : (!R.hasLvm ? 'potential' : band(e.coverage, B));
    e.statusKnown = !(e.potential + off) ? 'noData' : (!R.hasLvm ? (e.potential ? 'potential' : 'noData') : band(e.coverageKnown, B));
    return e;
  }
  /**
   * summary() → the totals of aggregate('kecamatan') plus timing, and the store counts that the panels label
   * (plan B-06, one meaning per number): storesInFile (store rows in the LVM file), storesWithin15 (of them in
   * the 15 km focus), storesOwnBranch (rows of KCP Jakarta Cilangkap 12903 in the file) and activeOwnBranch (of
   * them active this month, the "Toko LVM aktif (KCP Cilangkap)" figure). USAK is the bank-reported KPI and
   * comes from the KPI tabs (dataset lvm_kpi), never from these rows.
   */
  function storeCounts(R) {
    var c = { storesInFile: 0, storesWithin15: 0, storesOwnBranch: 0, activeOwnBranch: 0, ownWithin15: 0 };
    ((R && R.merchants) || []).forEach(function (m) {
      c.storesInFile++;
      if (m.inFocus) c.storesWithin15++;
      if (m.branchCode === HOME) {
        c.storesOwnBranch++;
        if (m.active === true) c.activeOwnBranch++;
        if (m.inFocus) c.ownWithin15++;
      }
    });
    return c;
  }
  function summary() {
    var a = aggregate('kecamatan'), R = last, c = storeCounts(R);
    return { ready: a.ready, hasLvm: a.hasLvm, hasEdc: a.hasEdc, demo: a.demo, asOf: a.asOf, totals: a.totals, bands: a.bands, ms: R ? R.ms : null,
      storesInFile: c.storesInFile, storesWithin15: c.storesWithin15, storesOwnBranch: c.storesOwnBranch, activeOwnBranch: c.activeOwnBranch,
      ownWithin15: c.ownWithin15 };
  }

  /* ========================================================= registration */

  function deriveDeps(st) {
    return [MCD.data ? MCD.data.version : 0, (st && st.areaLevel) || '', cfgSig(), areas().sig, hexFile() ? 1 : 0, poisFile() ? poisFile().rows.length : 0].join('|');
  }
  function deriveWhen(st) { return !st || st.section === 'merchants' || st.section === 'overview'; }
  /** The 'area:merchants' contract (COPY_STYLE_EN item 9): {level, areas: {<Kemendagri code>: {potential, banked, penetration, …}}}. */
  function areaMerchants(st) {
    var lv = st && st.areaLevel === 'kelurahan' ? 'kelurahan' : (st && st.areaLevel === 'tile' ? 'tile' : 'kecamatan');
    try { return aggregate(lv); } catch (e) { warn('aggregate failed', e); return { level: lv, areas: {}, ready: false }; }
  }

  function register() {
    if (MCD.importer && typeof MCD.importer.registerSchema === 'function') MCD.importer.registerSchema('lvm', LVM_SCHEMA);
    if (MCD.data && typeof MCD.data.registerDataset === 'function' && !(MCD.data.keyFor && MCD.data.keyFor('lvm_kpi'))) {
      MCD.data.registerDataset('lvm_kpi', { types: ['lvm_kpi', 'lvm_branch_kpi'], label: 'KPI cabang Livin’ Merchant (UREG dan USAK)', bank: true });
    }
    if (MCD.derive && typeof MCD.derive.register === 'function') {
      MCD.derive.register('area:merchants', function (st) { return areaMerchants(st); }, { when: deriveWhen, deps: deriveDeps });
      MCD.derive.register('lvm', function () { try { return summary(); } catch (e) { warn('summary failed', e); return null; } }, { when: deriveWhen, deps: deriveDeps });
    }
  }
  register();

  /** configure(patch) → settings (unknown keys ignored); clears the cached match. configure() resets to the defaults. */
  function configure(patch) {
    if (!patch) Object.keys(DEFAULTS).forEach(function (k) { CFG[k] = DEFAULTS[k]; });
    else Object.keys(patch).forEach(function (k) {
      if (!has(DEFAULTS, k)) return;
      if (k === 'bandMode') { if (has(BAND_MODES, patch[k])) CFG[k] = patch[k]; return; }
      if (isNum(patch[k]) || patch[k] === null) CFG[k] = patch[k];
    });
    last = null; aggMemo = {};
    if (MCD.derive && MCD.derive.invalidate) MCD.derive.invalidate();
    var o = {};
    Object.keys(CFG).forEach(function (k) { o[k] = CFG[k]; });
    return o;
  }

  MCD.lvm = {
    HOME: HOME, CATEGORIES: ['grocery', 'restaurant', 'other'], CATEGORY_LABELS: CAT_LABEL, STATUS: STATUS, DEFAULTS: DEFAULTS,
    terciles: terciles, relativeBand: relBand,
    config: function () { var o = {}; Object.keys(CFG).forEach(function (k) { o[k] = CFG[k]; }); return o; },
    configure: configure,
    // text and categories
    normName: normName, similarity: similarity, categoryOfLob: categoryOfLob, categoryOfGroup: categoryOfGroup,
    categoryOfName: categoryOfName, groupsForLob: groupsForLob,
    // areas
    resolveKecamatan: resolveKecamatan, resolveKelurahan: resolveKelurahan,
    locate: function (lon, lat) { var L = locate(lon, lat); return L ? { kecamatanId: L.kecamatanId, kelurahanId: L.kelurahanId } : null; },
    // parsing
    schema: LVM_SCHEMA, parseWorkbook: parseWorkbook, parseKpiSheet: parseKpiSheet, applyWorkbook: applyWorkbook,
    workbookReader: workbookReader, periodLabel: periodLabel, edc: { merchants: edcMerchants },
    // matching and aggregates
    match: match, matchAsync: matchAsync, result: result, poiStatus: poiStatus, merchantMatch: merchantMatch, offMap: offMap,
    locationOf: locationOf, aggregate: aggregate, summary: summary, areaMerchants: areaMerchants, territoryInput: territoryInput,
    // who counts as a merchant (v4): one rule for the potential, the matcher, the lists and the Sasaran lists
    nonMerchant: nonMerchant, nonMerchantCount: nonMerchantCount, merchantKind: merchantKind, NONM_WHY: NONM_WHY, NONM_WORDS: NONM_WORDS,
    nameWords: nmWords, extraFor: extraFor,
    // offline street points (item 28)
    locationSummary: locationSummary, geocodeStatus: geocodeStatus, ensureGeocoder: ensureGeocoder,
    reset: function () { last = null; aggMemo = {}; poiCache = null; areaIx = null; placeIx = null; VOC = { A: null, voc: null }; dropPending(); GEO.byId = {}; GEO.last = null; }
  };
})(window.MCD = window.MCD || {});
