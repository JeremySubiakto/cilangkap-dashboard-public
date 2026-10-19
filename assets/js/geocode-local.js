/* ==========================================================================
 * MCD.geocodeLocal: places an Indonesian shop address on its street, offline, inside the browser.
 *
 * Why (docs/COPY_STYLE_EN.md items 27-28): the branch wants every LVM merchant at its own point,
 * with its own distance and travel time from KCP Jakarta Cilangkap. The Rev LVM file has no
 * coordinates, only a free-text address plus kecamatan, kabupaten and kode_pos. This module reads
 * the address ("Jl. Kenanga II No. 20A RT 01/RW 03, Kel. X", "Kp. Pondok Ranggon RT 02") and finds the
 * street, kampung or perumahan in data/street-index.js (OpenStreetMap, built by
 * tools/build-street-index.py). Nothing is sent anywhere and nothing is stored: the address is read,
 * the point comes back, the address is dropped by the caller (as lvm.js already does).
 *
 * PURE: no DOM, no network. Reads window.MCD_STREET_INDEX and window.MCD_ADMIN_AREAS lazily (or the
 * objects given to init). UMD: MCD.geocodeLocal in the browser, module.exports in Node.
 *
 * API
 *   locate({address, kecamatanId, kelurahanId?, postcode?}, opts?)
 *        → {lon, lat, precision, matched, score, kind, kelurahanId, kecamatanId, kelSrc} | null
 *          precision  'jalan'     on the named street or gang (point on that street inside its kelurahan)
 *                     'kampung'   at a named kampung, perumahan / komplek or pasar
 *                     'kelurahan' label point of the kelurahan (street not found)
 *                     'kecamatan' label point of the kecamatan (kelurahan not known either)
 *          matched    public name that was matched ("Jl. Kenanga 2", "Kp. Pondok Ranggon") or the area name
 *          score      0..1 name similarity of the match (1 for the area fallbacks)
 *          kind       'jalan' | 'gang' | 'alamat' | 'kampung' | 'perumahan' | 'pasar' (index entry), null for fallbacks
 *          kelSrc     where the kelurahan came from: 'input' | 'alamat' | 'kode_pos' | 'jalan' | null
 *          confidence (street/place points only) 'tinggi' (score >= DEFAULTS.sure) or 'perkiraan' → show
 *                     "titik jalan · perkiraan"; a match never leaves a kelurahan stated in the input or the
 *                     address on weak evidence (see weakEvidence), it falls back to that kelurahan's centre
 *          ambiguous  (fallbacks only) the name exists in this many separate places of the kecamatan and
 *                     nothing in the input said which one
 *          why        only with opts.explain: the score factors (numbers only, for tuning)
 *        null when the kecamatan (and kelurahan) is not in the covered area
 *        opts: any of DEFAULTS (accept, otherKel, ...), explain
 *   locateAll(list, opts?) → {results: [...same order], summary: {jalan, kampung, kelurahan, kecamatan, none, total}, ms}
 *   parse(address)         → {components: [{type, words, codes}], kelurahanText: [...], postcode}  (no matching)
 *   normalise(text)        → normalised key, same rules as tools/build-street-index.py
 *   display(key)           → "Jl. Kenanga 2" from "jl kenanga 2"
 *   entries(kelurahanId)   → [{name, names, kind, lon, lat, lines}] decoded street-index entries of one kelurahan
 *   ready() · meta() · init({index, admin}) · reset() · DEFAULTS
 *
 * Search order: the kelurahan (given, or read from the address, or from the postcode), then the
 * whole kecamatan; then the kelurahan / kecamatan label point. Rooftop precision needs coordinates
 * (or the NMID location) from the PIC; this module never claims more than street level.
 * Details and caveats: docs/GEOCODE_LOCAL.md.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.geocodeLocal = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var DEFAULTS = {
    accept: 0.75,        // score needed to place a shop on a street or place
    otherKel: 0.96,      // factor for a match outside the known kelurahan (same kecamatan)
    crossClass: 0.85,    // address says kampung / perumahan, index has a street of that name (or the reverse)
    streetTypes: 0.95,   // "Jl." in the address, "Gang" in the index (or the reverse)
    areaTypes: 0.92,     // "Kp." vs "Perum" / "Komp."
    codeMissing: 0.9,    // address has a number ("Kenanga 2"), index name has none
    codeExtra: 0.88,     // index name has a number, address has none
    codeOther: 0.8,      // both have numbers, different ("Kenanga 2" vs "Kenanga 3": usually the next gang)
    minCover: 0.67,      // share of the address words a match must cover (a one-word hit on "Jl. Mandor Hasan" is not enough)
    leaveScore: 0.95,    // leaving a kelurahan given in the input or the address needs this score AND every word matched,
    leaveKm: 1.5,        // ... unless the street has a point this close to that kelurahan's label point
    sure: 0.85,          // below this a street point is shown as "titik jalan · perkiraan" (confidence 'perkiraan')
    refineKm: 2,         // a matched place within this distance pulls the point along a long street
    tie: 0.02,           // matches this close to the best one count as equally good
    joinKm: 0.25         // pieces closer than this are one street (else the name is ambiguous in the kecamatan)
  };

  /* ================================================== normalisation (mirrors tools/build-street-index.py) */

  var ABBR = {};
  [['jl', 'jl jln jlan jaln jalan'], ['gg', 'gg gang gng'], ['kp', 'kp kmp kampung kampong kpg'],
    ['komp', 'komp kompl komplek kompleks komplex kompleq komplk'], ['perum', 'perum perumahan prm perumh prmhn'],
    ['blok', 'blok blk block'], ['pondok', 'pd pdk pondok'], ['kebon', 'kb kebon'], ['tanjung', 'tj tg tjg tanjung'],
    ['karang', 'kr karang'], ['pasar', 'ps psr pasar'], ['kav', 'kav kv kavling kapling'], ['h', 'h haji'],
    ['hj', 'hj hajjah hajah'], ['jend', 'jend jendral jenderal jen'], ['kol', 'kol kolonel'], ['let', 'let letnan'],
    ['prof', 'prof profesor professor'], ['dr', 'dr dokter'], ['ir', 'ir insinyur'], ['raya', 'raya ry'],
    ['taman', 'taman tmn'], ['masjid', 'masjid mesjid msjd'], ['musholla', 'musholla mushola musholah musala mushalla musalla'],
    ['lapangan', 'lap lapangan'], ['bukit', 'bkt bukit'], ['dalam', 'dlm dalam'], ['gedung', 'gd gdg gedung'],
    ['villa', 'villa vila'], ['residence', 'residence residen']
  ].forEach(function (p) { p[1].split(' ').forEach(function (w) { ABBR[w] = p[0]; }); });
  var ROMAN = {};
  'i ii iii iv v vi vii viii ix x xi xii xiii xiv xv xvi xvii xviii xix xx'.split(' ').forEach(function (r, i) { ROMAN[r] = String(i + 1); });
  var TYPES = { jl: 1, gg: 1, kp: 1, komp: 1, perum: 1, blok: 1, cluster: 1 };
  var STREET_T = { jl: 1, gg: 1 };
  var AREA_T = { kp: 1, komp: 1, perum: 1, cluster: 1, blok: 1 };
  var GLUED = /\b(rt|rw|no|km|kav|blk|blok|gg|jl|kp|nomor)(\d)/g;
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function fold(s) {
    s = String(s == null ? '' : s);
    if (s.normalize) s = s.normalize('NFKD');
    return s.replace(/[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g, '').toLowerCase();
  }
  function tokens(s) {
    s = fold(s).replace(/&/g, ' dan ').replace(/['’`´]/g, '').replace(/[^a-z0-9]+/g, ' ');
    s = s.replace(GLUED, '$1 $2').replace(/([a-z]{3,})(\d)/g, '$1 $2');
    var raw = s.split(' '), out = [];
    for (var i = 0; i < raw.length; i++) {
      var t = raw[i];
      if (!t) continue;
      if (has(ABBR, t)) t = ABBR[t];
      if (has(ROMAN, t)) t = ROMAN[t];
      else if (/^0+\d[0-9a-z]*$/.test(t)) t = t.replace(/^0+(?=\d)/, '');
      out.push(t);
    }
    return out;
  }
  function normalise(s) { return tokens(s).join(' '); }

  var DISP = { jl: 'Jl.', gg: 'Gg.', kp: 'Kp.', komp: 'Komp.', perum: 'Perum', blok: 'Blok', h: 'H.', hj: 'Hj.', kh: 'KH',
    dr: 'Dr.', ir: 'Ir.', prof: 'Prof.', jend: 'Jend.', kol: 'Kol.', let: 'Let.', kav: 'Kav.', rt: 'RT', rw: 'RW',
    sd: 'SD', smp: 'SMP', sma: 'SMA', smk: 'SMK', tni: 'TNI', al: 'AL', au: 'AU', ad: 'AD', dki: 'DKI', pln: 'PLN' };
  function display(key) {
    return String(key || '').split(' ').filter(Boolean).map(function (t) {
      return has(DISP, t) ? DISP[t] : t.charAt(0).toUpperCase() + t.slice(1);
    }).join(' ');
  }

  /* ================================================================ word similarity */

  var LOW = {};
  ('raya h hj kh dr ir prof jend kol let utama baru lama indah permai asri jaya dalam luar timur barat utara selatan ' +
    'tengah besar kecil dan al el di ke').split(' ').forEach(function (w) { LOW[w] = 0.35; });
  var CODE = /^(\d+[a-z]?|[a-z]\d+[a-z]?|[a-gi-z])$/;   // numbers, "2a", "c2", single letters (not "h" = Haji)
  function weight(w) { return has(LOW, w) ? LOW[w] : 1; }

  function lev(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= lb; j++) {
        var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      var t = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }
  function tokSim(a, b) {
    if (a === b) return 1;
    if (a.length >= 4 && b.length >= 4) {
      var max = Math.max(a.length, b.length) >= 7 ? 2 : 1;
      if (a.charAt(0) === b.charAt(0) && lev(a, b, max) <= max) return 0.85;
    }
    return 0;
  }
  /** Weighted, symmetric token alignment of two word lists → 0..1; strong = an informative word matched. */
  function wordSim(A, B) {
    var WA = 0, WB = 0, i, j;
    for (i = 0; i < A.length; i++) WA += weight(A[i]);
    for (j = 0; j < B.length; j++) WB += weight(B[j]);
    if (!WA || !WB) return { s: 0, strong: false, a: 0, b: 0 };
    var ca = A.join(''), cb = B.join('');
    if (ca === cb) return { s: 1, strong: true, a: 1, b: 1 };
    var used = [], m = 0, mA = 0, mB = 0, strong = false;
    var order = A.map(function (w, k) { return k; }).sort(function (x, y) { return weight(A[y]) - weight(A[x]); });
    for (var o = 0; o < order.length; o++) {
      var a = A[order[o]], best = 0, bj = -1;
      for (j = 0; j < B.length; j++) {
        if (used[j]) continue;
        var s = tokSim(a, B[j]);
        if (s > best) { best = s; bj = j; }
      }
      if (bj >= 0) {
        used[bj] = true;
        m += (weight(a) + weight(B[bj])) * best;
        mA += weight(a) * best; mB += weight(B[bj]) * best;
        if (weight(a) === 1 && weight(B[bj]) === 1) strong = true;
      }
    }
    var s2 = m / (WA + WB);
    if (ca.length >= 8 && cb.length >= 8) {            // spelling joined or split differently ("pondokranggon")
      var d = lev(ca, cb, 2);
      if (d <= 2) { var r = 1 - d / Math.max(ca.length, cb.length); if (r > s2) { s2 = r; strong = true; } }
    }
    // one name is the start of the other: "Jl. Mawar Samping Toko" ~ "Jl. Mawar", "Jl. Kenanga" ~ "Jl. Kenanga Ujung"
    var P = prefixOf(A, B, WA, WB);
    if (P > s2) { s2 = P; strong = true; }
    return { s: s2, strong: strong, a: mA / WA, b: mB / WB, prefix: P > 0 };
  }
  var PREFIX_BASE = 0.72, PREFIX_GAIN = 0.2;
  function prefixOf(A, B, WA, WB) {
    var S = A.length < B.length ? A : B, L = S === A ? B : A, WS = S === A ? WA : WB, WL = S === A ? WB : WA;
    if (!S.length || S.length === L.length) return 0;
    var info = false;
    for (var i = 0; i < S.length; i++) {
      if (tokSim(S[i], L[i]) <= 0) return 0;
      if (!has(LOW, S[i]) && S[i].length >= 4) info = true;
    }
    return info ? Math.min(0.9, PREFIX_BASE + PREFIX_GAIN * WS / WL) : 0;
  }
  function codeFactor(A, B, C) {
    if (!A.length && !B.length) return 1;
    if (A.length && !B.length) return C.codeMissing;
    if (!A.length) return C.codeExtra;
    var inter = 0;
    for (var i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) inter++;
    if (inter === A.length && inter === B.length) return 1;
    return inter ? 0.92 : C.codeOther;
  }

  /* ================================================================= index (lazy) */

  var SRC = { index: null, admin: null };
  var IX = null;

  function sources() {
    return { S: SRC.index || (root && root.MCD_STREET_INDEX) || null, A: SRC.admin || (root && root.MCD_ADMIN_AREAS) || null };
  }
  function nameParts(key, ix) {
    var t = key.split(' '), type = has(TYPES, t[0]) && t.length > 1 ? t.shift() : '';
    var words = [], codes = [];
    for (var i = 0; i < t.length; i++) (CODE.test(t[i]) ? codes : words).push(t[i]);
    return { key: key, ix: ix, type: type, words: words, codes: codes };
  }
  function index() {
    var src = sources(), S = src.S, A = src.A;
    if (!S || !S.kel || !S.names || !A || !Array.isArray(A.kelurahan) || !Array.isArray(A.kecamatan)) return null;
    if (IX && IX.S === S && IX.A === A) return IX;
    var kecById = {}, kelById = {}, kotaById = {};
    (A.kota || []).forEach(function (k) { kotaById[k.id] = k; });
    A.kecamatan.forEach(function (k) {
      kecById[k.id] = { id: k.id, name: k.name, label: k.label, kota: k.kota, kel: [], words: tokens(k.name), alt: (k.alt || []).map(tokens) };
    });
    A.kelurahan.forEach(function (l) {
      var toks = [l.name].concat(l.alt || []).map(function (n) { return tokens(String(n).replace(/\([^)]*\)/g, ' ')); });
      String(l.name).replace(/\(([^)]*)\)/g, function (m, inner) { toks.push(tokens(inner)); return m; });
      toks = toks.filter(function (t) { return t.length; });
      var o = { id: l.id, name: l.name, label: l.label, kec: l.kec, toks: toks, names: toks.map(function (t) { return t.join(''); }) };
      kelById[l.id] = o;
      if (kecById[l.kec]) kecById[l.kec].kel.push(o);
    });
    var parts = S.names.map(function (n, i) { return nameParts(n, i); });
    IX = { S: S, A: A, kecById: kecById, kelById: kelById, kotaById: kotaById, parts: parts, q: (S.meta && S.meta.quant) || 1e-4, kel: {} };
    return IX;
  }
  /** Decoded entries of one kelurahan, with a token map for candidate lookup (built once per kelurahan). */
  function kelIndex(X, kid) {
    if (has(X.kel, kid)) return X.kel[kid];
    var rows = X.S.kel[kid], base = X.S.base && X.S.base[kid], out = null;
    if (rows && base) {
      var list = [], byTok = {}, byPre = {};
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], ids = typeof r[0] === 'number' ? [r[0]] : r[0];
        var e = { kel: kid, row: r, kind: r[1], x: base[0] + r[2], y: base[1] + r[3], names: ids, lines: null, npts: 0 };
        for (var p = 4; p < r.length; p++) e.npts += r[p].length / 2;
        e.lon = round6(e.x * X.q); e.lat = round6(e.y * X.q);
        list.push(e);
        for (var n = 0; n < ids.length; n++) {
          var P = X.parts[ids[n]];
          if (!P) continue;
          var ref = { e: e, p: P };
          for (var w = 0; w < P.words.length; w++) {
            var tk = P.words[w];
            (byTok[tk] = byTok[tk] || []).push(ref);
            if (tk.length >= 3) { var pre = tk.slice(0, 3); (byPre[pre] = byPre[pre] || []).push(ref); }
          }
        }
      }
      out = { list: list, byTok: byTok, byPre: byPre };
    }
    X.kel[kid] = out;
    return out;
  }
  function round6(v) { return Math.round(v * 1e6) / 1e6; }
  function linesOf(X, e) {
    if (e.lines) return e.lines;
    var r = e.row, lines = [];
    for (var p = 4; p < r.length; p++) {
      var d = r[p], x = e.x, y = e.y, pts = [];
      for (var k = 0; k + 1 < d.length; k += 2) { x += d[k]; y += d[k + 1]; pts.push([round6(x * X.q), round6(y * X.q)]); }
      lines.push(pts);
    }
    e.lines = lines;
    return lines;
  }

  /* ================================================================ address parsing */

  var KEL_W = { kel: 1, kelurahan: 1, desa: 1, ds: 1, kelurhan: 1, kelurahn: 1 };
  var ADMIN_W = { kec: 1, kecamatan: 1, kecamtan: 1, kota: 1, kab: 1, kabupaten: 1, kabupatan: 1, prov: 1, provinsi: 1, propinsi: 1,
    kode: 1, kodepos: 1, kpos: 1 };
  var SKIP_CODE = { no: 1, nomor: 1, nmr: 1, nmor: 1, nomer: 1, km: 1, kav: 1, lt: 1, lantai: 1, kios: 1, los: 1, unit: 1, ruko: 1, rukan: 1, lot: 1 };
  // "Kota" starts the city only at the start of a piece or before a city name ("Perum Kota Wisata" is a perumahan)
  var CITY_W = { jakarta: 1, jkt: 1, bekasi: 1, depok: 1, bogor: 1, tangerang: 1, adm: 1, administrasi: 1, tangsel: 1 };
  var CUT = { depan: 1, dpn: 1, dekat: 1, dkt: 1, samping: 1, smpng: 1, sebelah: 1, sblh: 1, belakang: 1, blkg: 1, seberang: 1, sbrg: 1,
    pertigaan: 1, perempatan: 1, arah: 1, masuk: 1, sebrang: 1, belakng: 1 };
  var TAIL = {};
  ('dki jakarta jkt jaktim timur barat utara selatan pusat jawa jabar banten indonesia bekasi depok bogor tangerang kab kota ' +
    'kabupaten provinsi daerah khusus ibukota ibu istimewa rt rw').split(' ').forEach(function (w) { TAIL[w] = 1; });
  var BREAK = '\u0000';

  function parse(address) {
    var raw = String(address == null ? '' : address);
    var segs = raw.split(/[,;|\n\r()[\]]+/), comps = [], kelText = [], postcode = null;
    for (var s = 0; s < segs.length; s++) {
      var t = tokens(segs[s]), out = [];
      for (var i = 0; i < t.length;) {
        var w = t[i];
        if (has(KEL_W, w)) {
          var rest = [];
          for (var j = i + 1; j < t.length && !has(ADMIN_W, t[j]) && !has(KEL_W, t[j]); j++) {
            if (/^\d{5}$/.test(t[j])) { postcode = postcode || t[j]; break; }
            rest.push(t[j]);
          }
          if (rest.length) kelText.push(rest);
          i = j;
          out.push(BREAK);
          continue;
        }
        if (has(ADMIN_W, w) && (w !== 'kota' || i === 0 || has(CITY_W, t[i + 1] || ''))) {   // "Kec. Cipayung", "Kota Jakarta Timur": skip the name
          for (i++; i < t.length && !has(KEL_W, t[i]) && !has(TYPES, t[i]); i++) if (/^\d{5}$/.test(t[i])) postcode = postcode || t[i];
          out.push(BREAK);
          continue;
        }
        if (w === 'rt' || w === 'rw') {
          for (i++; i < t.length && (/^\d+[a-z]?$/.test(t[i]) || t[i] === 'rt' || t[i] === 'rw'); i++);
          out.push(BREAK);
          continue;
        }
        if (has(SKIP_CODE, w)) {
          var n = 0;
          for (i++; i < t.length && n < 3 && (/\d/.test(t[i]) || /^[a-z]$/.test(t[i])); i++) n++;
          out.push(BREAK);
          continue;
        }
        if (has(CUT, w)) break;                                         // "depan masjid ...": a landmark, not the address
        if (/^\d{5}$/.test(w)) { postcode = postcode || w; out.push(BREAK); i++; continue; }
        if (/^\d{4,}$/.test(w)) { out.push(BREAK); i++; continue; }      // long numbers are never street numbers
        out.push(w);
        i++;
      }
      var cur = null;
      var flush = function () {
        if (!cur) return;
        var words = [], codes = [];
        cur.toks.forEach(function (x) { (CODE.test(x) ? codes : words).push(x); });
        if (!words.length && codes.length && (cur.type === 'gg' || cur.type === 'jl') && comps.length) {
          var prev = comps[comps.length - 1];                           // "Jl. Mawar Gg. 3" → Gg. Mawar 3
          if (prev.words.length) words = prev.words.slice();
        }
        if (words.length) comps.push({ type: cur.type, words: words.slice(0, 6), codes: codes.slice(0, 3) });
        cur = null;
      };
      for (var k = 0; k < out.length; k++) {
        var x = out[k];
        if (x === BREAK) { flush(); continue; }
        if (has(TYPES, x)) { flush(); cur = { type: x, toks: [] }; continue; }
        if (!cur) cur = { type: '', toks: [] };
        cur.toks.push(x);
      }
      flush();
    }
    return { components: comps, kelurahanText: kelText, postcode: postcode };
  }

  /* ===================================================================== locating */

  function kelFromText(X, kec, texts, comps) {
    var hit = null;
    var keyOf = function (words) { return words.join(''); };
    for (var i = 0; i < texts.length && !hit; i++) {
      for (var L = Math.min(4, texts[i].length); L >= 1 && !hit; L--) {
        var c = keyOf(texts[i].slice(0, L));
        for (var j = 0; j < kec.kel.length && !hit; j++) {
          var kl = kec.kel[j];
          for (var n = 0; n < kl.names.length; n++) {
            var nm = kl.names[n];
            if (nm === c || (c.length >= 6 && nm.length >= 6 && lev(nm, c, 1) <= 1)) { hit = kl; break; }
          }
        }
      }
    }
    if (hit) return { kel: hit, via: 'alamat' };
    // a whole component equal to a kelurahan name ("..., Pondok Ranggon, ..." or "Kp. Pondok Ranggon")
    var kecKey = kec.words.join('');
    for (var c2 = 0; c2 < comps.length; c2++) {
      var cc = comps[c2];
      if (cc.type && !has(AREA_T, cc.type)) continue;
      var key = cc.words.join('');
      if (key === kecKey && cc.type !== 'kp') continue;
      for (var j2 = 0; j2 < kec.kel.length; j2++) if (kec.kel[j2].names.indexOf(key) >= 0) return { kel: kec.kel[j2], via: 'alamat', comp: cc };
    }
    return null;
  }
  function kelFromPostcode(X, kec, pc) {
    var P = X.S.postcodes && pc && X.S.postcodes[pc];
    if (!P) return null;
    var tot = 0, best = null;
    for (var i = 0; i < P.length; i++) {
      var kl = X.kelById[P[i][0]];
      if (!kl || kl.kec !== kec.id) continue;
      tot += P[i][1];
      if (!best || P[i][1] > best[1]) best = P[i];
    }
    return best && best[1] / tot >= 0.5 ? X.kelById[best[0]] : null;
  }
  /** Words that are only area names (the kecamatan, its kelurahan, the kota) or address tails: not a street. */
  function isAreaOnly(X, kec, comp) {
    var key = comp.words.join('');
    if (comp.words.every(function (w) { return has(TAIL, w); })) return true;
    if (comp.type) return false;
    if (key === kec.words.join('')) return true;
    for (var a = 0; a < kec.alt.length; a++) if (key === kec.alt[a].join('')) return true;
    var kota = X.kotaById[kec.kota];
    if (kota && (key === tokens(kota.name).join('') || (kota.short && key === tokens(kota.short).join('')))) return true;
    return false;
  }
  /** Token sequences of area names around a kecamatan (longest first), for stripping them off the end of a street. */
  var KOTA_W = { kota: 1, kabupaten: 1, kab: 1, adm: 1, administrasi: 1 };
  function areaSeqs(X, kec) {
    if (kec.seqs) return kec.seqs;
    var seqs = [{ toks: kec.words }];
    kec.alt.forEach(function (a) { seqs.push({ toks: a }); });
    kec.kel.forEach(function (kl) { kl.toks.forEach(function (t) { seqs.push({ toks: t, kel: kl }); }); });
    var kota = X.kotaById[kec.kota];
    if (kota) [kota.name, kota.short].forEach(function (n) {
      var t = n ? tokens(n).filter(function (w) { return !has(KOTA_W, w); }) : [];
      if (t.length) seqs.push({ toks: t });
    });
    Object.keys(TAIL).forEach(function (w) { seqs.push({ toks: [w] }); });
    seqs.sort(function (a, b) { return b.toks.length - a.toks.length; });
    kec.seqs = seqs;
    return seqs;
  }
  /** "Jl. Mawar Rawa Kembang Jakarta Timur" → shorter word lists ("mawar rawa kembang", "mawar") and the kelurahan. */
  function stripTail(X, kec, words) {
    var seqs = areaSeqs(X, kec), w = words.slice(), kel = null, changed = true, steps = [];
    while (changed && w.length > 1) {
      changed = false;
      for (var i = 0; i < seqs.length; i++) {
        var s = seqs[i].toks, L = s.length, ok = L > 0 && L < w.length;
        for (var j = 0; ok && j < L; j++) if (w[w.length - L + j] !== s[j]) ok = false;
        if (ok) { w = w.slice(0, w.length - L); steps.push(w); if (seqs[i].kel && !kel) kel = seqs[i].kel; changed = true; break; }
      }
    }
    return { steps: steps, kel: kel };
  }
  function classOfKind(k) { return k <= 2 ? 'street' : 'area'; }
  function classOfType(t) { return has(STREET_T, t) ? 'street' : (has(AREA_T, t) ? 'area' : ''); }

  function score(comp, P, e, C) {
    var ws = wordSim(comp.words, P.words);
    if (!ws.strong || ws.s <= 0) return 0;
    var f = codeFactor(comp.codes, P.codes, C);
    var cc = classOfType(comp.type), ec = classOfKind(e.kind);
    if (comp.variant) f *= 0.97;                                      // area names were cut off the end
    if (cc && cc !== ec) f *= C.crossClass;
    else if (cc === 'street' && P.type && has(STREET_T, P.type) && P.type !== comp.type) f *= C.streetTypes;
    else if (cc === 'area' && P.type && has(AREA_T, P.type) && P.type !== comp.type) f *= C.areaTypes;
    return ws.s * f;
  }
  function searchKel(X, kid, comps, C, factor, best, prefer, all) {
    var K = kelIndex(X, kid);
    if (!K) return best;
    for (var c = 0; c < comps.length; c++) {
      var comp = comps[c], seen = new Set();
      for (var w = 0; w < comp.words.length; w++) {
        var word = comp.words[w];
        if (has(LOW, word) && comp.words.length > 1) continue;
        var lists = [K.byTok[word] || [], word.length >= 3 ? (K.byPre[word.slice(0, 3)] || []) : []];
        for (var l = 0; l < 2; l++) {
          var arr = lists[l];
          for (var r = 0; r < arr.length; r++) {
            var ref = arr[r], id = ref.p.key + '|' + ref.e.x + ',' + ref.e.y;
            if (seen.has(id)) continue;
            seen.add(id);
            var s = score(comp, ref.p, ref.e, C) * factor;
            if (s <= 0) continue;
            // too few of the address words found in this name: let a trimmed variant ("Mawar Merah") win instead
            if (s >= C.accept && !coversEnough(comp, ref.p, C)) continue;
            // small tie-breaks: the postcode's kelurahan, then the longer street
            var tb = s + (prefer && kid === prefer ? 0.005 : 0) + Math.min(ref.e.npts, 20) * 0.0001 +
              (classOfKind(ref.e.kind) === 'street' ? 0.01 : 0);
            var m = { tb: tb, s: s, e: ref.e, p: ref.p, comp: comp };
            if (all && s >= C.accept) all.push(m);
            if (!best || tb > best.tb) best = m;
          }
        }
      }
    }
    return best;
  }
  function distKm(a, b) {
    var dx = (a[0] - b[0]) * 111.32 * Math.cos(a[1] * Math.PI / 180), dy = (a[1] - b[1]) * 110.57;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function pointsOf(X, e) {
    var pts = [[e.lon, e.lat]], lines = linesOf(X, e);
    for (var a = 0; a < lines.length; a++) pts = pts.concat(lines[a]);
    return pts;
  }
  /**
   * Equally good matches in several kelurahan: one street running through them (pieces touch, ≤ joinKm)
   * or different places with the same name ("Gang Masjid" in three kelurahan)? → groups of matches.
   */
  function groups(X, list, C) {
    var n = list.length, parent = [], pts = list.map(function (m) { return pointsOf(X, m.e); }), i, j;
    for (i = 0; i < n; i++) parent[i] = i;
    var find = function (x) { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      if (find(i) === find(j)) continue;
      var near = false;
      for (var a = 0; a < pts[i].length && !near; a++) for (var b = 0; b < pts[j].length; b++) {
        if (distKm(pts[i][a], pts[j][b]) <= C.joinKm) { near = true; break; }
      }
      if (near) parent[find(i)] = find(j);
    }
    var by = {};
    for (i = 0; i < n; i++) (by[find(i)] = by[find(i)] || []).push(i);
    return Object.keys(by).map(function (k) { return { items: by[k].map(function (x) { return list[x]; }), pts: [].concat.apply([], by[k].map(function (x) { return pts[x]; })) }; });
  }
  /**
   * A long street with a named kampung / perumahan in the same address ("Jl. Raya X, Kp. Y"): the point of that
   * street (any of its kelurahan pieces in the scope) nearest the place, if within refineKm → [lon, lat, kelurahanId].
   */
  function refine(X, hit, place, kelIds, C) {
    var target = [place.e.lon, place.e.lat], best = null, bestD = Infinity;
    for (var k = 0; k < kelIds.length; k++) {
      var K = kelIndex(X, kelIds[k]);
      if (!K) continue;
      for (var i = 0; i < K.list.length; i++) {
        var e = K.list[i];
        if (e.names.indexOf(hit.p.ix) < 0) continue;
        var pts = pointsOf(X, e);
        for (var j = 0; j < pts.length; j++) {
          var d = distKm(pts[j], target);
          if (d < bestD) { bestD = d; best = [pts[j][0], pts[j][1], e.kel]; }
        }
      }
    }
    return best && bestD <= C.refineKm ? best : null;
  }

  /** Factors behind a score (tuning aid, numbers only): words, numbers, type, outside-kelurahan, trimmed variant. */
  function explain(m, C, kel) {
    var cc = classOfType(m.comp.type), ec = classOfKind(m.e.kind), t = 1;
    if (cc && cc !== ec) t = C.crossClass;
    else if (cc === 'street' && m.p.type && has(STREET_T, m.p.type) && m.p.type !== m.comp.type) t = C.streetTypes;
    else if (cc === 'area' && m.p.type && has(AREA_T, m.p.type) && m.p.type !== m.comp.type) t = C.areaTypes;
    var ws = wordSim(m.comp.words, m.p.words);
    return { words: Math.round(ws.s * 1000) / 1000, coverAddr: Math.round(ws.a * 100) / 100, coverName: Math.round(ws.b * 100) / 100,
      codes: codeFactor(m.comp.codes, m.p.codes, C),
      type: t, variant: m.comp.variant ? 0.97 : 1, otherKel: kel && kel.id !== m.e.kel ? 1 : 0,
      nWords: m.comp.words.length, nCodes: m.comp.codes.length, compType: m.comp.type || '' };
  }

  /**
   * True when an accepted match rests on too little evidence to trust over the kelurahan centre (independent check,
   * docs/GEOCODE_LOCAL.md §8): it covers under minCover of the address words, or it leaves a kelurahan stated in the
   * input or the address without near-full evidence (leaveScore with every word matched) and without a point within
   * leaveKm of that kelurahan. A postcode kelurahan is not binding: postcodes span several kelurahan.
   */
  /** Enough of the address words are found in the name, or a name of 2+ words starts the address
      ("Jl. Mawar Merah Toko Sinar Jaya"); one loose word ("Mandor Hasan" ~ "Gg. Mandiri") is not enough. */
  function coversEnough(comp, p, C) {
    var ws = wordSim(comp.words, p.words);
    return ws.a >= C.minCover || (ws.prefix && p.words.length >= 2);
  }

  function weakEvidence(X, m, kel, kelSrc, C) {
    var ws = wordSim(m.comp.words, m.p.words);
    if (!coversEnough(m.comp, m.p, C)) return true;
    if (!kel || m.e.kel === kel.id || (kelSrc !== 'input' && kelSrc !== 'alamat')) return false;
    if (m.s >= C.leaveScore && ws.a >= 0.999) return false;
    if (!kel.label) return true;
    var pts = pointsOf(X, m.e);
    for (var i = 0; i < pts.length; i++) if (distKm(pts[i], kel.label) <= C.leaveKm) return false;
    return true;
  }

  function locate(input, opts) {
    var X = index();
    if (!X || !input) return null;
    var C = opts ? Object.assign({}, DEFAULTS, opts) : DEFAULTS;
    var kel = input.kelurahanId ? X.kelById[input.kelurahanId] || null : null;
    var kec = input.kecamatanId ? X.kecById[input.kecamatanId] || null : null;
    if (kel && (!kec || kel.kec !== kec.id)) { if (!kec) kec = X.kecById[kel.kec]; else kel = null; }
    if (!kec) return null;
    var parsed = parse(input.address);
    var comps = parsed.components.filter(function (c) { return !isAreaOnly(X, kec, c); });
    var pc = String(input.postcode == null ? '' : input.postcode).replace(/\D/g, '');
    if (pc.length !== 5) pc = parsed.postcode || '';
    var kelSrc = kel ? 'input' : null, pcKel = kelFromPostcode(X, kec, pc), tailKel = null;
    var variants = [];
    comps.forEach(function (c) {
      var r = stripTail(X, kec, c.words), any = false;
      r.steps.forEach(function (w) {
        if (!w.some(function (x) { return !has(LOW, x) && x.length >= 3; })) return;
        variants.push({ type: c.type, words: w, codes: c.codes, variant: true });
        any = true;
      });
      if (any && r.kel && !tailKel) tailKel = r.kel;
    });
    if (!kel) {
      var ft = kelFromText(X, kec, parsed.kelurahanText, comps);
      if (ft) {
        kel = ft.kel; kelSrc = 'alamat';
        if (ft.comp) comps = comps.filter(function (c) { return c !== ft.comp; });   // "Kp. <kelurahan name>": the kelurahan itself
      } else if (tailKel) { kel = tailKel; kelSrc = 'alamat'; }
      else if (pcKel) { kel = pcKel; kelSrc = 'kode_pos'; }
    }
    // ", Kelapa Dua Wetan," or "Kp. <kelurahan>": a kelurahan of this kecamatan, not a street
    var kelKeys = {};
    kec.kel.forEach(function (k) { k.names.forEach(function (n) { kelKeys[n] = 1; }); });
    comps = comps.filter(function (c) { return !(c.type === 'kp' || !c.type) || !has(kelKeys, c.words.join('')); });
    comps = comps.concat(variants);
    var best = null, i, ambiguous = 0, all = null;
    if (comps.length) {
      if (kel) best = searchKel(X, kel.id, comps, C, 1, null, null);
      if (!best || best.s < C.accept) {
        var factor = kel && kelSrc !== 'kode_pos' ? C.otherKel : 1;
        var prefer = pcKel ? pcKel.id : (kel ? kel.id : null);
        all = [];
        for (i = 0; i < kec.kel.length; i++) {
          if (kel && kec.kel[i].id === kel.id) continue;
          best = searchKel(X, kec.kel[i].id, comps, C, factor, best, prefer, all);
        }
        if (best && best.s >= C.accept) {
          var top = all.filter(function (m) { return m.comp === best.comp && m.s >= best.s - C.tie; });
          var gs = top.length > 1 ? groups(X, top, C) : [];
          if (gs.length > 1) {                                             // same name in places that do not touch
            var ref = kel || pcKel;
            if (ref && ref.label) {                                        // the one nearest the kelurahan we know
              var bestG = null, bestD = Infinity;
              gs.forEach(function (g) {
                for (var q = 0; q < g.pts.length; q++) { var d = distKm(g.pts[q], ref.label); if (d < bestD) { bestD = d; bestG = g; } }
              });
              best = bestG.items.reduce(function (a, b) { return b.tb > a.tb ? b : a; });
            } else { ambiguous = gs.length; best = null; }
          }
        }
      }
    }
    if (best && best.s >= C.accept && !weakEvidence(X, best, kel, kelSrc, C)) {
      if (kel && kel.label && best.e.kel !== kel.id && (kelSrc === 'input' || kelSrc === 'alamat') && all && all.length) {
        // a long street found only outside the stated kelurahan: take its stretch nearest that kelurahan
        var nearD = Infinity, nearM = null;
        all.forEach(function (m) {
          if (m.p.key !== best.p.key || m.s < best.s - C.tie) return;
          var ps = pointsOf(X, m.e);
          for (var q = 0; q < ps.length; q++) { var d = distKm(ps[q], kel.label); if (d < nearD) { nearD = d; nearM = m; } }
        });
        if (nearM) best = nearM;
      }
      var e = best.e, lon = e.lon, lat = e.lat, atKel = e.kel;
      var cc = classOfType(best.comp.type), ec = classOfKind(e.kind);
      var precision = (cc || ec) === 'street' && ec === 'street' ? 'jalan' : 'kampung';
      if (ec === 'street' && comps.length > 1) {                          // a kampung / perumahan in the same address
        var scope = kel && kel.id === e.kel && kelSrc === 'input' ? [kel.id] : kec.kel.map(function (x) { return x.id; });
        var others = comps.filter(function (c) { return c !== best.comp && !c.variant && classOfType(c.type) !== 'street'; }), place = null;
        for (i = 0; i < scope.length; i++) {
          var cand = searchKel(X, scope[i], others, C, 1, null, null);
          if (cand && cand.s >= C.accept && classOfKind(cand.e.kind) === 'area' && (!place || cand.s > place.s)) place = cand;
        }
        var pt = place ? refine(X, best, place, scope, C) : null;
        if (pt) { lon = pt[0]; lat = pt[1]; atKel = pt[2]; }
      }
      var res = { lon: lon, lat: lat, precision: precision, matched: display(best.p.key), score: Math.round(best.s * 1000) / 1000,
        kind: (X.S.kinds || [])[e.kind] || null, kelurahanId: atKel, kecamatanId: kec.id,
        kelSrc: kel && kel.id === atKel ? kelSrc : 'jalan', confidence: best.s >= C.sure ? 'tinggi' : 'perkiraan' };
      if (C.explain) res.why = explain(best, C, kel);
      return res;
    }
    var out;
    if (kel && kel.label) {
      out = { lon: kel.label[0], lat: kel.label[1], precision: 'kelurahan', matched: kel.name, score: 1, kind: null,
        kelurahanId: kel.id, kecamatanId: kec.id, kelSrc: kelSrc };
    } else if (kec.label) {
      out = { lon: kec.label[0], lat: kec.label[1], precision: 'kecamatan', matched: kec.name, score: 1, kind: null,
        kelurahanId: null, kecamatanId: kec.id, kelSrc: null };
    } else return null;
    if (ambiguous) out.ambiguous = ambiguous;                             // the street name exists in this many places
    return out;
  }

  function locateAll(list, opts) {
    var t0 = Date.now(), memo = new Map(), results = [];
    var summary = { jalan: 0, kampung: 0, kelurahan: 0, kecamatan: 0, none: 0, total: 0 };
    (list || []).forEach(function (it) {
      var key = it ? [it.address, it.kecamatanId, it.kelurahanId, it.postcode].join('\u0001') : '';
      var r;
      if (memo.has(key)) r = memo.get(key);
      else { r = it ? locate(it, opts) : null; memo.set(key, r); }
      results.push(r ? Object.assign({}, r) : null);
      summary.total++;
      summary[r ? r.precision : 'none']++;
    });
    memo.clear();                                                         // addresses are not kept
    return { results: results, summary: summary, ms: Date.now() - t0 };
  }

  function entries(kelurahanId) {
    var X = index();
    if (!X) return [];
    var K = kelIndex(X, kelurahanId);
    if (!K) return [];
    return K.list.map(function (e) {
      var names = e.names.map(function (n) { return X.S.names[n]; });
      return { name: display(names[0]), names: names, kind: (X.S.kinds || [])[e.kind] || null, lon: e.lon, lat: e.lat,
        lines: linesOf(X, e) };
    });
  }

  return {
    DEFAULTS: DEFAULTS,
    locate: locate,
    locateAll: locateAll,
    parse: parse,
    normalise: normalise,
    tokens: tokens,
    display: display,
    entries: entries,
    ready: function () { return !!index(); },
    meta: function () { var X = index(); return X && X.S.meta ? X.S.meta : null; },
    init: function (o) { SRC.index = (o && o.index) || null; SRC.admin = (o && o.admin) || null; IX = null; },
    reset: function () { IX = null; }
  };
});
