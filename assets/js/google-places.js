/* ==========================================================================
 * MCD.places — the live "Cek rating Google" (COPY_STYLE_EN items 32 and 33, 16 Oct 2026).
 *
 * Inactive until the branch pastes ITS OWN Places API key in Data & Privasi › Detail. Nothing is
 * called at load time and nothing is called without a key.
 *
 *   hasKey() → bool · keyState() → {has, saved: 'vault'|'session'|null, hint: '…ab12'|null, looksValid}
 *   setKey(key) → {ok, code?, text?, warn?} · clearKey() → bool
 *   usage() → {month: 'YYYY-MM', used, free: 1000, left}
 *   canRun() → {ok: true} | {ok: false, code, text}
 *   checkShortlist(items:[{id, name, lon, lat}], opts?) → Promise<[{id, placeId, rating, userRatingCount,
 *       googleMapsUri, displayName, matched, similarity, via: 'text'|'details'|'memory'}]>
 *     opts: {allowBilled: bool (run past the 1.000 free checks of the month), signal: AbortSignal,
 *            onProgress: fn({done, total})}. Rejects with Error {code, text, results (partial)}.
 *   testKey() → Promise<{ok, found}> (one check for the branch's own public listing; nothing shown or stored)
 *   attribution() → <span translate="no">Google Maps</span> (Google's text attribution)
 *   errorText(code) → plain Indonesian text · storedIds() → number of place IDs kept · forgetIds()
 *
 * Google rules (docs/GOOGLE_PLACES.md):
 *   - Places API (New) Text Search, POST https://places.googleapis.com/v1/places:searchText with
 *     X-Goog-Api-Key and X-Goog-FieldMask places.id,places.displayName,places.rating,places.userRatingCount,
 *     places.googleMapsUri; body {textQuery, locationBias: 50 m circle, maxResultCount: 1, languageCode: 'id'}.
 *     A merchant whose place ID is already known is read with Place Details (GET /v1/places/{id}, same fields).
 *   - Results (rating, number of reviews, Google name, link) live in memory for this session only and are
 *     never written anywhere. ONLY place IDs are kept (allowed without time limit by the Places API
 *     policies), per merchant id, inside the encrypted copy (dataset 'places', saved with "Simpan salinan
 *     terenkripsi"). No lat/lng from Google is requested or kept.
 *   - A stored place ID is trusted only for the same public listing: each one carries a fingerprint of the
 *     listing name and point (fp, FNV-1a of our own Overture data, never Google's) and the sme-pois release.
 *     When data/sme-pois.js is rebuilt and row N becomes another business, the fingerprint no longer
 *     matches and the place ID is dropped. Place Details answers must also pass the name check (similarity
 *     >= 0.5), or the ID is dropped and the merchant is searched by name again.
 *   - For an id that is a row of MCD_SME_POIS at the same point, the PUBLIC listing name of that row is sent
 *     (callers may pass a masked name for the screen; a masked name is never sent to Google).
 *   - Google content is shown only in a list WITHOUT our map next to it, always with attribution().
 *   - The key lives only in the encrypted copy and in memory: never in localStorage, the URL, the console
 *     or an error message. Only the monthly COUNT of checks is kept in localStorage ('mcd.places.usage').
 *   - Only public listing names (peta publik, Overture) are sent to Google, never names from bank files.
 *
 * Classic IIFE on window.MCD; no DOM at load time except registering the dataset.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = typeof window !== 'undefined' ? window : this;
  var TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
  var DETAILS_URL = 'https://places.googleapis.com/v1/places/';
  var TEXT_MASK = 'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri';
  var DETAILS_MASK = 'id,displayName,rating,userRatingCount,googleMapsUri';
  var USAGE_KEY = 'mcd.places.usage';
  var DATASET = 'places';
  var FREE = 1000;
  var CONCURRENCY = 4;
  var BIAS_M = 50;
  var TIMEOUT_MS = 12000;
  var ACCEPT = 0.5;               // name similarity needed to accept Google's answer as the same business
  var LOCAL_URL = 'http://127.0.0.1:5173';

  /* ------------------------------------------------------------ texts (Indonesian, plain) */

  var TEXT = {
    'no-key': 'Kunci Google belum diisi. Isi kunci di Data & Privasi › Detail › Pengaturan & sumber.',
    'file': 'Buka dashboard melalui server lokal (' + LOCAL_URL + ') agar kunci Google dapat digunakan.',
    'offline': 'Tidak ada koneksi internet. Periksa jaringan, lalu coba lagi.',
    'invalid-key': 'Google menolak kunci ini karena tidak valid. Periksa kunci di Google Cloud, lalu simpan ulang.',
    'referrer': 'Kunci Google tidak mengizinkan alamat halaman ini. Buka dashboard melalui ' + LOCAL_URL + ', atau tambahkan alamat ini di pembatasan kunci.',
    'api-blocked': 'Kunci ini belum diizinkan untuk Places API (New). Tambahkan Places API (New) di pembatasan API kunci.',
    'api-disabled': 'Places API (New) belum aktif di proyek Google Cloud ini. Aktifkan, lalu coba lagi beberapa menit kemudian.',
    'billing': 'Penagihan belum aktif di proyek Google Cloud ini. Google mewajibkan akun penagihan, juga untuk cek tanpa biaya.',
    'quota': 'Batas kuota kunci Google telah tercapai. Coba lagi besok, atau naikkan batas kuota di Google Cloud.',
    'denied': 'Google menolak permintaan ini. Periksa pembatasan kunci di Google Cloud.',
    'server': 'Layanan Google sedang bermasalah. Coba lagi beberapa saat lagi.',
    'timeout': 'Google tidak menjawab tepat waktu. Periksa internet, lalu coba lagi.',
    'blocked': 'Google tidak dapat dihubungi dari halaman ini. Periksa internet, lalu muat ulang halaman.\nPengelola: pastikan https://places.googleapis.com ada di connect-src pada index.html.',
    'free-limit': 'Cek tanpa biaya bulan ini hampir atau telah habis (1.000 cek). Cek berikutnya ditagih Google ke akun penagihan kunci ini.',
    'aborted': 'Cek rating Google dihentikan.',
    'bad-input': 'Tidak ada merchant dengan nama dan titik lokasi untuk diperiksa.',
    'private': 'Nama dari file bank tidak dikirim ke Google. Hanya nama dari peta publik yang dapat diperiksa.',
    'unknown': 'Cek rating Google gagal. Coba lagi beberapa saat lagi.'
  };
  var FATAL = { 'invalid-key': 1, 'referrer': 1, 'api-blocked': 1, 'api-disabled': 1, 'billing': 1, 'quota': 1, 'denied': 1, 'blocked': 1, 'offline': 1, 'aborted': 1 };

  function errorText(code) { return TEXT[code] || TEXT.unknown; }
  function fail(code, extra) {
    var e = new Error(errorText(code));
    e.code = code; e.text = errorText(code);
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }

  /* ------------------------------------------------------------ the key and the place IDs (vault dataset) */

  // Session memory: Google results of this session only (never written anywhere), keyed by merchant id.
  var MEM = {};
  var fetchImpl = null;          // tests replace fetch through _test.setFetch

  function data() { return MCD.data || null; }
  function registerDataset() {
    var D = data();
    if (!D || typeof D.registerDataset !== 'function') return false;
    // bank: false keeps it out of "has bank data", data dates and demo rows; it is still saved with the encrypted copy.
    D.registerDataset(DATASET, { types: ['google_places'], label: 'Kunci Google dan ID tempat Google', bank: false });
    return true;
  }
  registerDataset();

  /* ------------------------------------------------------------ which public listing is this? */

  function poiData() { var P = W.MCD_SME_POIS; return P && Array.isArray(P.rows) ? P : null; }
  function poiRelease() { var P = poiData(); return (P && P.meta && P.meta.release) ? String(P.meta.release) : null; }
  /** Row of MCD_SME_POIS for an id that is a row index ('123'), else null. */
  function poiRow(id) {
    var P = poiData(), s = String(id == null ? '' : id);
    if (!P || !/^\d{1,7}$/.test(s)) return null;
    var r = P.rows[+s];
    return Array.isArray(r) && isFinite(+r[0]) && isFinite(+r[1]) ? r : null;
  }
  /** true when the item's point is within ~60 m of the row (the id really is this public listing). */
  function samePoint(r, item) {
    var lat = +item.lat, lon = +item.lon;
    if (!isFinite(lat) || !isFinite(lon)) return false;
    var dx = (+r[0] - lon) * 111320 * Math.cos(lat * Math.PI / 180), dy = (+r[1] - lat) * 110574;
    return dx * dx + dy * dy <= 3600;
  }
  /** Fingerprint of a public listing: FNV-1a 32-bit of the normalised name and the point (about 11 m). */
  function fpOf(name, lon, lat) {
    var s = norm(name) + '|' + Math.round(+lon * 1e4) + ',' + Math.round(+lat * 1e4), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function isMasked(name) { return /\*{2,}/.test(String(name || '')); }
  /**
   * {name, fp} that identify the item: the public row (name and point of MCD_SME_POIS) when the id is a row
   * at the same point, else the item itself. null when only a masked name is known (never sent to Google).
   */
  function identify(item) {
    var r = poiRow(item.id);
    if (r && samePoint(r, item) && typeof r[3] === 'string' && r[3].trim()) return { name: r[3].trim(), fp: fpOf(r[3], r[0], r[1]) };
    var n = String(item.name || '').trim();
    if (!n || isMasked(n)) return null;
    return { name: n, fp: fpOf(n, item.lon, item.lat) };
  }
  /** The fingerprint the current data gives a stored id, or null when the id is not a public row. */
  function fpNow(id) { var r = poiRow(id); return r && typeof r[3] === 'string' ? fpOf(r[3], r[0], r[1]) : null; }

  /** {rows, meta} of the real dataset (also while Data contoh is on). */
  function realSet() {
    var D = data();
    if (!D) return { rows: [], meta: {} };
    try {
      if (typeof D.real === 'function') { var r = D.real()[DATASET]; if (r) return { rows: r.rows || [], meta: r.meta || {} }; }
    } catch (e) { /* fall through */ }
    return { rows: Array.isArray(D[DATASET]) ? D[DATASET] : [], meta: (D.meta && D.meta[DATASET]) || {} };
  }
  function keyRow() {
    var rows = realSet().rows;
    for (var i = rows.length - 1; i >= 0; i--) if (rows[i] && rows[i].kind === 'key' && typeof rows[i].key === 'string' && rows[i].key) return rows[i];
    return null;
  }
  function apiKey() { var r = keyRow(); return r ? r.key : null; }
  /** id → {placeId, fp, rel} of the stored place IDs (fp/rel null on rows written before the fingerprint). */
  function idMap() {
    var out = {};
    realSet().rows.forEach(function (r) {
      if (r && r.kind === 'pid' && r.id != null && typeof r.placeId === 'string' && r.placeId) {
        out[String(r.id)] = { placeId: r.placeId, fp: typeof r.fp === 'string' ? r.fp : null, rel: typeof r.rel === 'string' ? r.rel : null };
      }
    });
    return out;
  }
  /**
   * Drops the stored place IDs that can no longer be trusted: no fingerprint (older rows), or a row of
   * MCD_SME_POIS whose name or point changed since the ID was stored. Returns the number dropped.
   */
  function prune(ids) {
    var n = 0;
    Object.keys(ids).forEach(function (id) {
      var e = ids[id], now = fpNow(id);
      if (!e.fp || (now && now !== e.fp)) { delete ids[id]; n++; }
    });
    return n;
  }
  /** Writes the dataset (key row + place-id rows) through MCD.data, so "Data belum disimpan" and Save work as for imports. */
  function writeSet(key, ids, opts) {
    var D = data();
    if (!D || typeof D.replace !== 'function') return false;
    if (!D.keyFor || !D.keyFor(DATASET)) registerDataset();
    var rows = [];
    var now = new Date().toISOString();
    var prevKey = keyRow();
    if (key) rows.push({ kind: 'key', key: key, savedAt: prevKey && prevKey.key === key ? (prevKey.savedAt || now) : now });
    Object.keys(ids || {}).sort().forEach(function (id) {
      var e = ids[id], row = { kind: 'pid', id: id, placeId: e.placeId };
      if (e.fp) row.fp = e.fp;
      if (e.rel) row.rel = e.rel;
      rows.push(row);
    });
    // A removal leaves a marker row, so the change still counts as "belum disimpan" and the next save drops the key.
    if (!rows.length || (opts && opts.removed)) rows.push({ kind: 'removed', at: now });
    try {
      D.replace(DATASET, rows, { source: 'import', file: 'Kunci Google (diisi di dashboard)', sheet: null, asOf: now.slice(0, 10) });
      return true;
    } catch (e) { return false; }
  }

  var KEY_RE = /^[A-Za-z0-9_\-]{8,128}$/;
  var GOOGLE_KEY_RE = /^AIza[0-9A-Za-z_\-]{35}$/;

  function hasKey() { return !!apiKey(); }
  function keyState() {
    var r = keyRow(), m = realSet().meta;
    if (!r) return { has: false, saved: null, hint: null, looksValid: false };
    return { has: true, saved: m.source === 'vault' ? 'vault' : 'session', hint: '…' + r.key.slice(-4), looksValid: GOOGLE_KEY_RE.test(r.key) };
  }
  /** Saves the key in the dataset of the encrypted copy (memory until "Simpan salinan terenkripsi"). */
  function setKey(key) {
    var k = String(key == null ? '' : key).trim();
    if (!k) return { ok: false, code: 'empty', text: 'Tempel kunci Google lebih dulu.' };
    if (!KEY_RE.test(k)) return { ok: false, code: 'format', text: 'Kunci hanya berisi huruf, angka, tanda - dan _, tanpa spasi. Salin ulang dari Google Cloud.' };
    if (!writeSet(k, idMap())) return { ok: false, code: 'store', text: 'Kunci tidak dapat disimpan. Muat ulang halaman, lalu coba lagi.' };
    MEM = {};
    return { ok: true, warn: GOOGLE_KEY_RE.test(k) ? null : 'Kunci Google biasanya diawali AIza dan terdiri dari 39 karakter. Periksa kembali kunci ini.' };
  }
  function clearKey() {
    if (!keyRow()) return false;
    MEM = {};
    return writeSet(null, idMap(), { removed: true });
  }
  function storedIds() { return Object.keys(idMap()).length; }
  function forgetIds() {
    var n = storedIds();
    if (!n) return 0;
    writeSet(apiKey(), {}, { removed: !apiKey() });
    return n;
  }

  /* ------------------------------------------------------------ usage count (localStorage, count only) */

  function monthNow() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function store() { return MCD.util && MCD.util.storage ? MCD.util.storage : null; }
  var memUsage = null;
  function readUsage() {
    var m = monthNow(), v = null;
    try { var s = store(); v = s ? s.get(USAGE_KEY, null) : (W.localStorage ? JSON.parse(W.localStorage.getItem(USAGE_KEY) || 'null') : null); } catch (e) { v = null; }
    if (!v && memUsage) v = memUsage;
    if (!v || typeof v !== 'object' || v.month !== m) return { month: m, used: 0, text: 0, details: 0 };
    return { month: m, used: +v.used || 0, text: +v.text || 0, details: +v.details || 0 };
  }
  function addUsage(kind) {
    var u = readUsage();
    u.used++; if (kind === 'details') u.details++; else u.text++;
    memUsage = u;
    try { var s = store(); if (s) s.set(USAGE_KEY, u); else if (W.localStorage) W.localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch (e) { /* the count stays in memory */ }
    return u;
  }
  function usage() { var u = readUsage(); return { month: u.month, used: u.used, free: FREE, left: Math.max(0, FREE - u.used), text: u.text, details: u.details }; }

  /* ------------------------------------------------------------ can it run here? */

  function protocol() { try { return (W.location && W.location.protocol) || ''; } catch (e) { return ''; } }
  function offline() { try { return !!(W.navigator && W.navigator.onLine === false); } catch (e) { return false; } }
  function canRun() {
    if (!hasKey()) return { ok: false, code: 'no-key', text: errorText('no-key') };
    if (protocol() === 'file:') return { ok: false, code: 'file', text: errorText('file') };
    if (offline()) return { ok: false, code: 'offline', text: errorText('offline') };
    if (!getFetch()) return { ok: false, code: 'blocked', text: errorText('blocked') };
    return { ok: true };
  }
  function getFetch() { return fetchImpl || (typeof W.fetch === 'function' ? W.fetch.bind(W) : null); }

  /* ------------------------------------------------------------ name similarity */

  var STOP = { jl: 1, jln: 1, jalan: 1, no: 1, pt: 1, cv: 1, tbk: 1, ud: 1, the: 1, dan: 1, and: 1, di: 1, of: 1, cabang: 1, branch: 1, outlet: 1 };
  function norm(s) {
    var t = String(s == null ? '' : s).toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* old engine */ }
    return t.replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function toks(s) { return norm(s).split(' ').filter(function (w) { return w && !STOP[w]; }); }
  function bigrams(s) { var t = s.replace(/ /g, ''), o = {}, n = 0; for (var i = 0; i < t.length - 1; i++) { var g = t.substr(i, 2); o[g] = (o[g] || 0) + 1; n++; } return { o: o, n: n }; }
  /** 0..1: how likely two business names are the same business. */
  function similarity(a, b) {
    var na = norm(a), nb = norm(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    var ta = toks(a), tb = toks(b);
    var ja = ta.join(' '), jb = tb.join(' ');
    if (ja && jb && (ja === jb)) return 1;
    if (ja && jb && (jb.indexOf(ja) >= 0 || ja.indexOf(jb) >= 0) && Math.min(ja.length, jb.length) >= 3) return 0.9;
    var sa = {}, inter = 0, uni = 0;
    ta.forEach(function (w) { sa[w] = 1; });
    var sb = {};
    tb.forEach(function (w) { sb[w] = 1; });
    Object.keys(sa).forEach(function (w) { uni++; if (sb[w]) inter++; });
    Object.keys(sb).forEach(function (w) { if (!sa[w]) uni++; });
    var jac = uni ? inter / uni : 0;
    var ba = bigrams(ja || na), bb = bigrams(jb || nb), common = 0;
    Object.keys(ba.o).forEach(function (g) { if (bb.o[g]) common += Math.min(ba.o[g], bb.o[g]); });
    var dice = ba.n + bb.n ? (2 * common) / (ba.n + bb.n) : 0;
    return Math.round(Math.max(jac, dice * 0.95) * 1000) / 1000;
  }

  /* ------------------------------------------------------------ requests */

  function reasonOf(body) {
    var e = body && body.error, out = { status: e && e.status, reason: null, msg: e && typeof e.message === 'string' ? e.message : '' };
    ((e && e.details) || []).forEach(function (d) { if (d && d.reason && !out.reason) out.reason = d.reason; });
    return out;
  }
  /** Google's HTTP answer → our error code (never the raw message: it is not shown or logged). */
  function codeOf(status, body) {
    var r = reasonOf(body), reason = r.reason || '', msg = r.msg || '';
    if (reason === 'API_KEY_INVALID' || /api key not valid/i.test(msg)) return 'invalid-key';
    if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED' || /referer|referrer/i.test(msg)) return 'referrer';
    if (reason === 'API_KEY_SERVICE_BLOCKED' || /are blocked/i.test(msg)) return 'api-blocked';
    if (reason === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(msg)) return 'api-disabled';
    if (reason === 'BILLING_DISABLED' || /billing/i.test(msg)) return 'billing';
    if (status === 429 || r.status === 'RESOURCE_EXHAUSTED' || reason === 'RATE_LIMIT_EXCEEDED') return 'quota';
    if (status === 404 || r.status === 'NOT_FOUND') return 'not-found';
    if (status === 403 || r.status === 'PERMISSION_DENIED') return 'denied';
    if (status === 400) return 'bad-request';
    if (status >= 500) return 'server';
    return 'unknown';
  }

  function call(url, init, signal) {
    var f = getFetch();
    if (!f) return Promise.reject(fail('blocked'));
    var ctl = typeof W.AbortController === 'function' ? new W.AbortController() : null;
    var timer = null, timedOut = false, onAbort = null;
    if (ctl) {
      init.signal = ctl.signal;
      timer = setTimeout(function () { timedOut = true; ctl.abort(); }, TIMEOUT_MS);
      if (signal) {
        if (signal.aborted) ctl.abort();
        else { onAbort = function () { ctl.abort(); }; signal.addEventListener('abort', onAbort); }
      }
    }
    var done = function () { if (timer) clearTimeout(timer); if (signal && onAbort) signal.removeEventListener('abort', onAbort); };
    return Promise.resolve().then(function () { return f(url, init); }).then(function (res) {
      done();
      return Promise.resolve(res.json ? res.json().catch(function () { return null; }) : null).then(function (body) {
        if (res.ok) return body || {};
        throw fail(codeOf(res.status, body), { status: res.status });
      });
    }, function (err) {
      done();
      if (err && err.code && TEXT[err.code]) throw err;
      if (signal && signal.aborted) throw fail('aborted');
      if (timedOut) throw fail('timeout');
      throw fail(offline() ? 'offline' : 'blocked');
    });
  }
  function headers(key, mask) {
    return { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': mask };
  }
  // The page sends no Referer (index.html: no-referrer). A key restricted to http://127.0.0.1:5173/* needs one,
  // so these requests send the page ORIGIN only (never the path or the hash).
  function baseInit(method, key, mask) {
    return { method: method, headers: headers(key, mask), credentials: 'omit', cache: 'no-store', mode: 'cors', referrerPolicy: 'origin' };
  }
  function textSearch(key, item, signal) {
    var init = baseInit('POST', key, TEXT_MASK);
    init.body = JSON.stringify({
      textQuery: String(item.name),
      locationBias: { circle: { center: { latitude: +item.lat, longitude: +item.lon }, radius: BIAS_M } },
      maxResultCount: 1,
      languageCode: 'id'
    });
    return call(TEXT_URL, init, signal).then(function (body) {
      addUsage('text');
      return (body && Array.isArray(body.places) && body.places[0]) || null;
    });
  }
  function details(key, placeId, signal) {
    var url = DETAILS_URL + encodeURIComponent(placeId) + '?languageCode=id';
    return call(url, baseInit('GET', key, DETAILS_MASK), signal).then(function (body) { addUsage('details'); return body && body.id ? body : null; });
  }

  /** One result row. The Google name must match the public name (similarity >= ACCEPT), also for Place Details. */
  function shape(item, qname, p, how) {
    var name = p && p.displayName ? (typeof p.displayName === 'string' ? p.displayName : p.displayName.text) : null;
    var sim = p ? similarity(qname, name) : 0;
    var ok = !!p && sim >= ACCEPT;
    return {
      id: item.id,
      placeId: ok ? (p.id || null) : null,
      rating: ok && typeof p.rating === 'number' ? p.rating : null,
      userRatingCount: ok && typeof p.userRatingCount === 'number' ? p.userRatingCount : (ok ? 0 : null),
      googleMapsUri: ok && typeof p.googleMapsUri === 'string' ? p.googleMapsUri : null,
      displayName: name || null,
      matched: ok,
      similarity: sim,
      via: how
    };
  }

  function memKey(id, who) { return id + '|' + who.fp; }
  /**
   * One merchant: memory → Place Details for a known place ID of the SAME listing (fingerprint) → Text Search.
   * A Place Details answer whose name does not match is not shown: the ID is dropped and the name is searched.
   */
  function checkOne(key, item, who, ids, changed, signal) {
    var id = String(item.id), mk = memKey(id, who);
    if (MEM[mk]) { var m = Object.assign({}, MEM[mk]); m.via = 'memory'; return Promise.resolve(m); }
    var known = ids[id] && ids[id].fp === who.fp ? ids[id].placeId : null;
    if (ids[id] && !known) { delete ids[id]; changed.n++; }          // stored for another listing: not used
    var drop = function () { if (ids[id]) { delete ids[id]; changed.n++; } };
    var viaText = function () {
      return textSearch(key, { name: who.name, lon: item.lon, lat: item.lat }, signal).then(function (p) {
        var r = shape(item, who.name, p, 'text');
        if (r.matched && r.placeId) {
          var cur = ids[id];
          if (!cur || cur.placeId !== r.placeId || cur.fp !== who.fp) { ids[id] = { placeId: r.placeId, fp: who.fp, rel: poiRelease() }; changed.n++; }
        }
        return r;
      });
    };
    var run = known
      ? details(key, known, signal).then(function (p) {
        var r = p ? shape(item, who.name, p, 'details') : null;
        if (r && r.matched) return r;
        drop();                                                     // another business behind this ID now
        return viaText();
      }, function (err) {
        if (err && err.code === 'not-found') { drop(); return viaText(); }   // place ID out of date
        throw err;
      })
      : viaText();
    return run.then(function (r) { MEM[mk] = r; return r; });
  }

  function isPrivate(it) { return !!(it && (it.bank === true || (it.kind === 'lvm' && it.poi == null))); }

  /**
   * checkShortlist(items, opts) — live Google check of a shortlist (default top 20 of the open-data score).
   * Resolves with one result per usable item, in the input order.
   */
  function checkShortlist(items, opts) {
    opts = opts || {};
    var gate = canRun();
    if (!gate.ok) return Promise.reject(fail(gate.code));
    var list = [], whos = [];
    (Array.isArray(items) ? items : []).forEach(function (it) {
      if (!it || it.id == null || typeof it.name !== 'string' || !isFinite(+it.lon) || !isFinite(+it.lat) || isPrivate(it)) return;
      var who = identify(it);
      if (!who) return;
      list.push(it); whos.push(who);
    });
    if (!list.length) return Promise.reject(fail(Array.isArray(items) && items.some(isPrivate) ? 'private' : 'bad-input'));
    var need = list.filter(function (it, k) { return !MEM[memKey(String(it.id), whos[k])]; }).length;
    var u = usage();
    if (!opts.allowBilled && u.used + need > FREE) return Promise.reject(fail('free-limit', { usage: u, need: need }));
    var key = apiKey();
    var ids = idMap(), before = JSON.stringify(ids), changed = { n: prune(ids) };
    var out = new Array(list.length), next = 0, done = 0, stop = null;
    var signal = opts.signal || null;
    function worker() {
      if (stop) return Promise.resolve();
      if (signal && signal.aborted) { stop = stop || fail('aborted'); return Promise.resolve(); }
      var k = next++;
      if (k >= list.length) return Promise.resolve();
      return checkOne(key, list[k], whos[k], ids, changed, signal).then(function (r) {
        out[k] = r;
      }, function (err) {
        if (err && FATAL[err.code]) { stop = stop || err; return; }
        out[k] = { id: list[k].id, placeId: null, rating: null, userRatingCount: null, googleMapsUri: null, displayName: null, matched: false, similarity: 0, via: 'text', error: (err && err.code) || 'unknown' };
      }).then(function () {
        done++;
        if (typeof opts.onProgress === 'function') { try { opts.onProgress({ done: done, total: list.length }); } catch (e) { /* ignore */ } }
        return worker();
      });
    }
    var pool = [];
    for (var w = 0; w < Math.min(CONCURRENCY, list.length); w++) pool.push(worker());
    return Promise.all(pool).then(function () {
      // Only place IDs are written (into the encrypted-copy dataset), and only when they changed.
      if (changed.n && JSON.stringify(ids) !== before && apiKey() === key) writeSet(key, ids);
      var results = out.filter(Boolean);
      if (stop) throw fail(stop.code, { results: results, status: stop.status });
      return results;
    });
  }

  /**
   * testKey() — one Text Search for the branch's own public listing (Bank Mandiri KCP Jakarta Cilangkap) to see
   * whether Google accepts the key from this address. Counts as one check; nothing is shown or stored.
   * Resolves {ok: true, found: bool}; rejects with Error {code, text}.
   */
  function testKey() {
    var gate = canRun();
    if (!gate.ok) return Promise.reject(fail(gate.code));
    var b = (MCD.config && MCD.config.branch) || { lat: -6.33203, lon: 106.90989 };
    return textSearch(apiKey(), { name: 'Bank Mandiri KCP Jakarta Cilangkap', lon: b.lon, lat: b.lat }, null)
      .then(function (p) { return { ok: true, found: !!p }; });
  }

  /* ------------------------------------------------------------ attribution */

  /**
   * Google's text attribution for Places content shown without a Google map: "Google Maps", not translated,
   * not wrapped, sans-serif (Roboto preferred), weight 400, 12-16 px, black #1F1F1F / grey #5E5E5E / white
   * (the token --gm-attr-ink carries the colour per theme). Place it at the top or bottom of the list container.
   */
  function attribution(opts) {
    var doc = W.document;
    if (!doc) return null;
    var el = doc.createElement('span');
    el.className = 'gm-attr' + (opts && opts.className ? ' ' + opts.className : '');
    el.setAttribute('translate', 'no');
    el.setAttribute('lang', 'en');
    el.textContent = 'Google Maps';
    var s = el.style;
    s.fontFamily = "Roboto, 'Inter Tight', Arial, sans-serif";
    s.fontWeight = '400';
    s.fontStyle = 'normal';
    s.letterSpacing = 'normal';
    s.fontSize = (opts && opts.size >= 12 && opts.size <= 16 ? opts.size : 12) + 'px';
    s.lineHeight = '16px';
    s.whiteSpace = 'nowrap';
    s.color = 'var(--gm-attr-ink, var(--text-1))';
    return el;
  }

  /* ------------------------------------------------------------ session hygiene */

  // The gate dispatches 'mcd:gate-locking' on document WITHOUT bubbling (gate.js emit), so listen there,
  // like app.js. The lock then reloads the page, which clears memory anyway; this does not rely on it.
  function forget() { MEM = {}; memUsage = null; }
  try { if (W.document && W.document.addEventListener) W.document.addEventListener('mcd:gate-locking', forget); } catch (e) { /* no document */ }

  MCD.places = {
    hasKey: hasKey,
    keyState: keyState,
    setKey: setKey,
    clearKey: clearKey,
    usage: usage,
    canRun: canRun,
    checkShortlist: checkShortlist,
    testKey: testKey,
    attribution: attribution,
    errorText: errorText,
    storedIds: storedIds,
    forgetIds: forgetIds,
    similarity: similarity,
    FREE: FREE,
    DATASET: DATASET,
    LOCAL_URL: LOCAL_URL,
    _test: {
      setFetch: function (f) { fetchImpl = typeof f === 'function' ? f : null; },
      reset: function () { MEM = {}; memUsage = null; fetchImpl = null; },
      codeOf: codeOf,
      fp: fpOf,
      identify: identify,
      TEXT_MASK: TEXT_MASK,
      DETAILS_MASK: DETAILS_MASK,
      TEXT_URL: TEXT_URL
    }
  };
})(window.MCD = window.MCD || {});
