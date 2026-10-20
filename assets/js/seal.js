/* ==========================================================================
 * MCD.seal — encrypted follow-up lists ("Tindak lanjut") in localStorage.
 * Bank Mandiri KCP Jakarta Cilangkap · Dashboard Akuisisi · v6 (V6_SPEC §7).
 * Threat model, format, states and recovery: docs/FOLLOWUP_STORAGE.md.
 *
 * Classic script, no dependencies, attaches window.MCD.seal. Loaded after
 * vault.js and before institutions.js, the engines (schools-core.js,
 * campus-core.js) and app.js, so the engines can build their pipelines at
 * load time; nothing is read or written before MCD.seal.init().
 *
 * KEY   The gate's session key (PBKDF2-SHA-256 → AES-GCM-256, extractable:
 *       false), handed over once by app.js right after sign-in:
 *         MCD.seal.init({key, salt, iter, payload})
 *       key, salt and iter stay in this closure; nothing returns or exposes
 *       them. A second init is refused. "mcd:gate-locking" drops the key and
 *       every decrypted list at once (state 'locked').
 * BLOB  localStorage['mcd.seal.v1.<name>'] =
 *         {"v":1,"alg":"AES-GCM","kdf":{"salt":b64(16),"iter":n},"iv":b64(12),"ct":b64}
 *       no count, no time, no key name in clear; fresh IV on every write.
 * AAD   UTF-8("mcd-seal|v1|" + name + "|" + kdf.salt + "|" + kdf.iter): a blob
 *       opens only as its own store with its own vault salt, never as a vault
 *       (the vault's AAD starts with "mcd-vault|") or as another store.
 * PLAIN JSON {v:1, data:{<key>: entry}, gone:{<key>: ISO}, vaultSeen, saved},
 *       padded with spaces to a multiple of 256 bytes (the size of the blob
 *       does not give the number of entries away).
 * SIDE  '<blob key>.old' = array of ≤ 3 blobs set aside, each with its own kdf:
 *       lists sealed with another password ("Buka dengan kata sandi lama"), and
 *       the list of a tab that stepped aside for another password (sealed with
 *       its own key; it opens by itself at the next sign-in with that key);
 *       '<blob key>.bad' = the last blob that failed its tag. A main blob is
 *       removed only once its side copy is stored (else it is held in place).
 *
 * MCD.seal = {
 *   init(session) → Promise<state>, state(), reason(),
 *   store(name) → {ready, data(), gone(), write(data?), status(), persisted(), count(), oldCount(),
 *                  migrated(), openOld(pw), dropOld(), clear(), on(fn)},
 *   pipeline(name, {keyRe, stages, products, programs?, check?, onChange?, messages?}) → Pipeline,
 *   vaultExport(), vaultSaved(saved), hasFollowups(), summary(), openOld(pw), dropOld(),
 *   purge(), on(fn), timings()
 * }
 * Pipeline = the v5 MCD.schools.pipeline API (key, get, set, quickAdd, remove, all, clear,
 *   count, exportJson, importJson, persisted, _reset) + ready(), status(), orphans(known),
 *   on(fn), migrated(). Without init (Node tests, an old shell) a pipeline keeps its list
 *   in memory only and never writes plain text.
 *
 * Safe by construction: no innerHTML, no eval, no network, no logging of
 * data or secrets; every storage call is wrapped in try/catch.
 * ========================================================================== */
(function (root) {
  'use strict';

  var MCD = root.MCD = root.MCD || {};
  if (MCD.seal && MCD.seal.VERSION) return; // loaded twice: keep the first instance (and its key)

  /* ------------------------------------------------------------ constants */

  var VERSION = 1;
  var PREFIX = 'mcd.seal.v1.';
  var NAME_RE = /^[a-z][a-z0-9-]{0,30}(\.[a-z][a-z0-9-]{0,30}){0,3}$/;
  var SIDE_RE = /\.(old|bad)$/;
  var GENERIC_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9_.:\/,#@+-]{0,199}$/;
  // Stores the dashboard knows: their key pattern when no pipeline has registered yet, and the v5 plain key to migrate.
  var KNOWN = {
    'schools.pipeline': { keyRe: /^(npyp|tni|y|npsn|f|p|e):/, legacy: 'mcd.schools.pipeline.v1' },
    'campus.pipeline': { keyRe: /^(pt:\d{6}|osm:(node|way|relation)\/\d+|ovt:[0-9a-f]{8,40})$/ }
  };
  var SALT_BYTES = 16, IV_BYTES = 12, TAG_BYTES = 16;
  var MIN_ITER = 100000, MAX_ITER = 5000000;   // the vault's bounds (vault.js)
  var PAD = 256;
  var OLD_MAX = 3;
  var GONE_MS = 365 * 864e5;                    // tombstones are kept 365 days
  var MAX_ENTRIES = 5000;                       // per store, from any outside source
  var MAX_ENTRY_CHARS = 8000;
  var MAX_BLOB_CHARS = 8 * 1024 * 1024;
  var MAX_STORES = 16;
  var MAX_OPS = 2000;

  var MSG = {
    locked: 'Dashboard dikunci. Masukkan kata sandi untuk melanjutkan.',
    base: {
      noKey: 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.',
      noQuickKey: 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.',
      badKey: 'Lembaga ini tidak memiliki kode yang tetap, sehingga tidak dapat dilacak.',
      unreadable: 'File tidak dapat dibaca. Pilih file ekspor tindak lanjut (JSON).',
      notExport: 'File ini bukan ekspor tindak lanjut. Pilih file lain.'
    },
    'schools.pipeline': {
      noKey: 'Belum ada yayasan yang dipilih.',
      noQuickKey: 'SMA ini tidak memiliki NPSN. Tambahkan yayasannya ke tindak lanjut.',
      badKey: 'SMA ini tidak memiliki NPSN. Tambahkan yayasannya ke tindak lanjut.',
      notExport: 'File ini bukan ekspor tindak lanjut sekolah. Pilih file lain.'
    },
    'campus.pipeline': {
      notExport: 'File ini bukan ekspor tindak lanjut kampus. Pilih file lain.'
    }
  };

  /* -------------------------------------------------------------- helpers */

  function noop() {}
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function isRe(x) { return Object.prototype.toString.call(x) === '[object RegExp]'; }
  function keys(o) { return o ? Object.keys(o) : []; }
  function nowMs() { return Date.now(); }
  function nowIso() { return new Date().toISOString(); }
  function perf() { return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now(); }
  function tm(s) { if (typeof s !== 'string' || !s) return 0; var t = Date.parse(s); return t === t ? t : 0; }
  /** The later of two ISO times (null-safe); equal times pick the larger string so every tab decides the same. */
  function later(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    var ta = tm(a), tb = tm(b);
    if (ta !== tb) return tb > ta ? b : a;
    return b > a ? b : a;
  }
  /** ISO time at least `base` (ms or ISO) and strictly after `prev`, so an edit or a removal always wins over what it replaces. */
  function isoAfter(base, prev) {
    var b = typeof base === 'number' ? base : (tm(base) || nowMs());
    return new Date(Math.max(b, tm(prev) + 1)).toISOString();
  }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  /** Stable JSON (sorted keys), to compare two states. */
  function canon(x) {
    if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
    if (isObj(x)) return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}';
    return JSON.stringify(x === undefined ? null : x);
  }
  function defer() { var d = {}; d.p = new Promise(function (res) { d.resolve = res; }); return d; }
  function cleanText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').slice(0, max); }
  function ids(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      var id = isObj(x) ? x.id : x;
      if (typeof id === 'string' && out.indexOf(id) < 0) out.push(id);
    });
    return out;
  }

  /* -------------------------------------------------------------- storage */

  function lsObj() {
    try { var s = root.localStorage; if (s) { s.getItem(PREFIX + 'probe'); return s; } } catch (e) { /* blocked */ }
    return null;
  }
  function lsGet(k) { var s = lsObj(); if (!s) return null; try { return s.getItem(k); } catch (e) { return null; } }
  function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014); }
  /** → null when stored, else 'quota' | 'no-storage'. */
  function lsSet(k, v) {
    var s = lsObj();
    if (!s) return 'no-storage';
    try { s.setItem(k, v); return null; } catch (e) { return isQuota(e) ? 'quota' : 'no-storage'; }
  }
  function lsDel(k) { var s = lsObj(); if (!s) return; try { s.removeItem(k); } catch (e) { /* ignore */ } }
  function lsKeys(prefix) {
    var s = lsObj(), out = [];
    if (!s) return out;
    try {
      var n = s.length;
      for (var i = 0; i < n; i++) { var k = s.key(i); if (typeof k === 'string' && k.indexOf(prefix) === 0) out.push(k); }
    } catch (e) { /* ignore */ }
    return out;
  }

  /* --------------------------------------------------------------- base64 */

  function isB64(s) {
    if (typeof s !== 'string' || s.length % 4 !== 0) return false;
    var n = s.length;
    var pad = n > 0 && s.charCodeAt(n - 1) === 61 ? (n > 1 && s.charCodeAt(n - 2) === 61 ? 2 : 1) : 0;
    for (var i = 0; i < n - pad; i++) {
      var c = s.charCodeAt(i);
      if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47)) return false;
    }
    return true;
  }
  function b64enc(bytes) {
    var parts = [];
    for (var i = 0; i < bytes.length; i += 0x8000) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
    return root.btoa(parts.join(''));
  }
  function b64dec(s) {
    if (!isB64(s)) return null;
    var bin;
    try { bin = root.atob(s); } catch (e) { return null; }
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* --------------------------------------------------------------- crypto */

  function cryptoOk() {
    var c = root.crypto;
    return !!(c && c.subtle && typeof c.getRandomValues === 'function' && typeof root.TextEncoder === 'function' &&
      typeof root.TextDecoder === 'function' && typeof root.btoa === 'function' && typeof root.atob === 'function');
  }
  function utf8(s) { return new root.TextEncoder().encode(s); }
  function aad(name, salt, iter) { return utf8('mcd-seal|v1|' + name + '|' + salt + '|' + iter); }

  /** Seal a JSON text for store `name` with key record k → Promise<blob text>. */
  function encryptJson(name, json, k) {
    return Promise.resolve().then(function () {
      var body = utf8(json), padLen = (PAD - body.length % PAD) % PAD;
      var pt = new Uint8Array(body.length + padLen);
      pt.fill(32);
      pt.set(body, 0);
      var iv = new Uint8Array(IV_BYTES);
      root.crypto.getRandomValues(iv);
      return root.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad(name, k.salt, k.iter), tagLength: TAG_BYTES * 8 }, k.key, pt)
        .then(function (ct) {
          return JSON.stringify({ v: 1, alg: 'AES-GCM', kdf: { salt: k.salt, iter: k.iter }, iv: b64enc(iv), ct: b64enc(new Uint8Array(ct)) });
        });
    });
  }

  function exactKeys(o, list) {
    var own = Object.keys(o);
    if (own.length !== list.length) return false;
    for (var i = 0; i < list.length; i++) if (!has(o, list[i])) return false;
    return true;
  }
  /** Structural check of a blob object → {obj, kdf, iv, ct} or null. */
  function parseBlobObj(o) {
    if (!isObj(o) || !exactKeys(o, ['v', 'alg', 'kdf', 'iv', 'ct']) || o.v !== 1 || o.alg !== 'AES-GCM') return null;
    var kdf = o.kdf;
    if (!isObj(kdf) || !exactKeys(kdf, ['salt', 'iter'])) return null;
    if (typeof kdf.iter !== 'number' || kdf.iter % 1 !== 0 || kdf.iter < MIN_ITER || kdf.iter > MAX_ITER) return null;
    var salt = b64dec(kdf.salt), iv = b64dec(o.iv), ct = b64dec(o.ct);
    if (!salt || salt.length !== SALT_BYTES || !iv || iv.length !== IV_BYTES || !ct || ct.length < TAG_BYTES) return null;
    return { obj: o, kdf: { salt: kdf.salt, iter: kdf.iter }, iv: iv, ct: ct };
  }
  function parseBlob(raw) {
    if (typeof raw !== 'string' || raw.length > MAX_BLOB_CHARS) return null;
    var o;
    try { o = JSON.parse(raw); } catch (e) { return null; }
    return parseBlobObj(o);
  }
  function validDoc(x) {
    if (!isObj(x) || x.v !== 1 || !isObj(x.data) || (x.gone !== undefined && !isObj(x.gone))) return null;
    return { data: x.data, gone: x.gone || {}, vaultSeen: typeof x.vaultSeen === 'string' ? x.vaultSeen : null };
  }
  /** → Promise<doc>; rejects 'tag' (wrong key or a changed byte) or 'format'. */
  function openBlob(name, p, key) {
    return Promise.resolve().then(function () {
      if (!key) throw 'tag';
      return root.crypto.subtle.decrypt({ name: 'AES-GCM', iv: p.iv, additionalData: aad(name, p.kdf.salt, p.kdf.iter), tagLength: TAG_BYTES * 8 }, key, p.ct);
    }).then(function (buf) {
      var doc;
      try { doc = validDoc(JSON.parse(new root.TextDecoder('utf-8', { fatal: true }).decode(buf))); } catch (e) { doc = null; }
      if (!doc) throw 'format';
      return doc;
    }, function (e) { throw e === 'format' ? e : 'tag'; });
  }

  /* ------------------------------------------------------------- doc math */

  /**
   * Merge `inc` ({data, gone}) into `cur` in place. Per key the newest of entry `t` and tombstone time wins;
   * a tombstone wins a tie; two entries with the same time are decided by their JSON (same answer in every tab).
   * → {changed: keys whose entry appeared, changed or disappeared, touched: changed + tombstone-only changes}
   */
  function mergeInto(cur, inc) {
    var out = { changed: 0, touched: 0 }, all = {};
    [cur.data, cur.gone, inc.data, inc.gone].forEach(function (o) { keys(o).forEach(function (k) { all[k] = 1; }); });
    Object.keys(all).forEach(function (k) {
      var le = has(cur.data, k) ? cur.data[k] : null, lg = has(cur.gone, k) ? cur.gone[k] : null;
      var ie = has(inc.data, k) ? inc.data[k] : null, ig = has(inc.gone, k) ? inc.gone[k] : null;
      var g = later(lg, ig), e = le;
      if (ie && ie !== le) {
        if (!le) e = ie;
        else {
          var ti = tm(ie.t), tl = tm(le.t);
          if (ti > tl || (ti === tl && canon(ie) > canon(le))) e = ie;
        }
      }
      if (g && (!e || tm(g) >= tm(e.t))) {
        if (le) { delete cur.data[k]; out.changed++; }
        if (lg !== g) { cur.gone[k] = g; out.touched++; }
      } else if (e) {
        if (e !== le) { cur.data[k] = e; out.changed++; }
        if (lg) { delete cur.gone[k]; out.touched++; }
      }
    });
    out.touched += out.changed;
    return out;
  }
  function prune(doc, now) {
    var lim = now - GONE_MS;
    keys(doc.gone).forEach(function (k) { if (tm(doc.gone[k]) < lim) delete doc.gone[k]; });
  }

  /* ------------------------------------------------------- generic schema */

  function genericClean(e) {
    if (!isObj(e)) return null;
    var j;
    try { j = JSON.stringify(e); } catch (x) { return null; }
    if (typeof j !== 'string' || j.length > MAX_ENTRY_CHARS) return null;
    var c = JSON.parse(j);
    c.t = typeof c.t === 'string' ? c.t.slice(0, 40) : '';
    return c;
  }
  function keyTester(re) {
    return function (k) { return typeof k === 'string' && k.length > 0 && k.length <= 200 && k !== '__proto__' && re.test(k); };
  }
  /** Ops recorded before a list is open, replayed on top of it (remove, clear, put = import, replace = store.write). */
  function genericApply(doc, op) {
    if (op.op === 'remove') {
      var e = has(doc.data, op.k) ? doc.data[op.k] : null;
      if (e) delete doc.data[op.k];
      doc.gone[op.k] = later(has(doc.gone, op.k) ? doc.gone[op.k] : null, isoAfter(op.t, e && e.t));
    } else if (op.op === 'clear') {
      keys(doc.data).forEach(function (k) { doc.gone[k] = later(has(doc.gone, k) ? doc.gone[k] : null, isoAfter(op.t, doc.data[k].t)); });
      doc.data = {};
    } else if (op.op === 'put') {
      importRule(doc, op.k, op.e);
    } else if (op.op === 'replace') {
      keys(doc.data).forEach(function (k) {
        if (!has(op.data, k)) { doc.gone[k] = isoAfter(op.t, doc.data[k].t); delete doc.data[k]; }
      });
      keys(op.data).forEach(function (k) { doc.data[k] = op.data[k]; if (has(doc.gone, k)) delete doc.gone[k]; });
    }
  }
  /** Import rule of v5: a missing key is added (a removed one comes back, newer than its removal); a newer `t` updates. */
  function importRule(doc, k, e) {
    var cur = has(doc.data, k) ? doc.data[k] : null;
    if (!cur) {
      if (has(doc.gone, k)) {
        if (tm(doc.gone[k]) >= tm(e.t)) e = Object.assign({}, e, { t: isoAfter(nowMs(), doc.gone[k]) });
        delete doc.gone[k];
      }
      doc.data[k] = e;
      return 'added';
    }
    if (tm(e.t) > tm(cur.t)) { doc.data[k] = e; return 'updated'; }
    return 'kept';
  }

  /* ---------------------------------------------------------------- state */

  var K = null;               // {key, salt (base64), iter}: this closure only
  var initCalled = false, closed = false, opening = false, hooked = false;
  var base = 'locked';        // 'locked' | 'ready' | 'memory'
  var baseReason = null;      // 'no-key' | 'no-crypto' | 'no-storage'
  var vaultIn = null;         // payload.followups (sanitised copy) until every store has merged it
  var stores = {}, order = [], listeners = [];
  var timings = { init: null, write: null };

  /** A held list of another password counts as an old list: "Buka dengan kata sandi lama" opens it where it is. */
  function heldOld(s) { return !!(s.hold && s.hold.kind === 'old'); }
  function oldCountOf(s) { return s.oldN + (heldOld(s) ? 1 : 0); }
  function statusOf(s) {
    if (closed || !s.loaded) return 'loading';
    if (base !== 'ready') return 'memory';
    if (heldOld(s)) return 'old-password';
    if (s.mem || s.hold) return 'memory';
    if (s.oldN > 0) return 'old-password';
    if (s.damaged) return 'damaged';
    return 'ready';
  }
  function persistedOf(s) { return !closed && s.loaded && base === 'ready' && !!K && !s.mem && !s.foreign && !s.hold; }
  function state() {
    if (closed) return 'locked';
    if (opening) return 'opening';
    if (base === 'ready' && order.some(function (n) { return !!(stores[n].mem || stores[n].hold); })) return 'memory';
    return base;
  }
  function reason() {
    if (closed || base === 'locked') return null;
    if (base === 'memory') return baseReason;
    for (var i = 0; i < order.length; i++) {
      var s = stores[order[i]];
      if (s.hold) return s.hold.err;
      if (s.mem) return s.mem;
    }
    return null;
  }

  /* --------------------------------------------------------------- events */

  function emit(detail) {
    listeners.slice().forEach(function (fn) { try { fn(detail); } catch (e) { /* a listener's error is its own */ } });
    var d = root.document;
    if (d && typeof d.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      try { d.dispatchEvent(new root.CustomEvent('mcd:seal', { detail: detail })); } catch (e) { /* ignore */ }
    }
  }
  function emitGlobal(change) { emit({ state: state(), reason: reason(), change: change || 'state' }); }
  /** Tell the store's pipeline and every listener; the detail carries no entry, key or count. */
  function changed(s, why) {
    var status = statusOf(s);
    s.subs.slice().forEach(function (fn) { try { fn(s.data, { name: s.name, change: why, status: status }); } catch (e) { /* ignore */ } });
    emit({ state: state(), reason: reason(), name: s.name, status: status, change: why });
  }
  function subscribe(list, fn) {
    if (typeof fn !== 'function') return noop;
    list.push(fn);
    return function () { var i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
  }

  /* --------------------------------------------------------------- stores */

  function getStore(name) {
    if (typeof name !== 'string' || !NAME_RE.test(name) || SIDE_RE.test(name) || name === 'probe') throw new TypeError('MCD.seal: invalid store name');
    if (stores[name]) return stores[name];
    if (order.length >= MAX_STORES) throw new TypeError('MCD.seal: too many stores');
    var known = KNOWN[name] || {};
    var s = {
      name: name, key: PREFIX + name,
      data: {}, gone: {}, vaultSeen: null,
      loaded: false, opened: false, ops: [], opsOverflow: false,
      mem: null, damaged: false, migrated: false, foreign: false, oldN: 0,
      hold: null, retired: {}, lastRaw: null,
      chain: Promise.resolve(), pending: null, ready: defer(), subs: [], pipe: null,
      keyOk: keyTester(known.keyRe || GENERIC_KEY_RE), clean: genericClean, apply: genericApply
    };
    s.api = storeApi(s);
    stores[name] = s;
    order.push(name);
    if (initCalled && !closed) openStore(s);
    return s;
  }

  /** Run fn after every earlier task of this store (load, merge, write); one chain per store. */
  function enqueue(s, fn) {
    var p = s.chain.then(function () { return fn(); });
    s.chain = p.then(noop, noop);
    return p;
  }

  function cleanDoc(s, d) {
    var out = { data: {}, gone: {} }, n = 0;
    keys(d && d.data).forEach(function (k) {
      if (n >= MAX_ENTRIES || !s.keyOk(k)) return;
      var c = s.clean(d.data[k]);
      if (c) { out.data[k] = c; n++; }
    });
    keys(d && d.gone).forEach(function (k) {
      var t = d.gone[k];
      if (s.keyOk(k) && typeof t === 'string' && tm(t) > 0) out.gone[k] = t.slice(0, 40);
    });
    return out;
  }

  /* Side copies. '.old' holds blobs set aside: lists sealed with another password (another vault salt), and the list of
     a tab that stepped aside for another password (sealed with that tab's own key, §6 of FOLLOWUP_STORAGE). Every change
     to '.old' starts from a fresh read, so a blob another tab added meanwhile is never dropped; the main blob is removed
     only once its copy is stored. A blob under this tab's own key opens by itself (absorbOwn); the others need
     "Buka dengan kata sandi lama". */
  function sameKdf(a, b) { return !!(a && b && a.salt === b.salt && a.iter === b.iter); }
  function kdfId(kdf) { return kdf.salt + '|' + kdf.iter; }
  /** Cheap test for a blob under key record k (our writer always puts kdf first, in this order). */
  function ownPrefix(raw, k) { return raw.slice(0, 160).indexOf('"kdf":{"salt":"' + k.salt + '","iter":' + k.iter + '}') >= 0; }
  function readOldRaw(s) {
    var raw = lsGet(s.key + '.old'), arr;
    if (raw == null) return [];
    try { arr = JSON.parse(raw); } catch (e) { return []; }
    return Array.isArray(arr) ? arr.filter(function (o) { return !!parseBlobObj(o); }) : [];
  }
  /** Blobs in '.old' that need another password (blobs under this tab's key open without one). */
  function countOld(s) { var k = K; return readOldRaw(s).filter(function (o) { return !sameKdf(o.kdf, k); }).length; }
  /** At most OLD_MAX: an older blob of a password that has a newer one goes first, then the oldest. */
  function trimOld(arr) {
    arr = arr.slice();
    while (arr.length > OLD_MAX) {
      var drop = 0;
      search: for (var i = 0; i < arr.length; i++) {
        for (var j = i + 1; j < arr.length; j++) if (sameKdf(arr[i].kdf, arr[j].kdf)) { drop = i; break search; }
      }
      arr.splice(drop, 1);
    }
    return arr;
  }
  /** Rewrite '.old' as fn(fresh read) → null when stored, else 'quota' | 'no-storage'. */
  function oldEdit(s, fn) {
    var next = trimOld(fn(readOldRaw(s))), err = null;
    if (next.length) err = lsSet(s.key + '.old', JSON.stringify(next));
    else lsDel(s.key + '.old');
    s.oldN = countOld(s);
    return err;
  }
  function oldAdd(s, obj) { return oldEdit(s, function (arr) { return arr.some(function (o) { return o.ct === obj.ct; }) ? arr : arr.concat([obj]); }); }
  function oldDrop(s, cts) {
    if (!cts.length) return null;
    return oldEdit(s, function (arr) { return arr.filter(function (o) { return cts.indexOf(o.ct) < 0; }); });
  }
  /**
   * Move the main blob aside: p (another password) → '.old', no p (it will not open) → '.bad'. The main blob is removed
   * only once its copy is stored; if the copy does not fit, it stays in place as s.hold and no write replaces it until
   * the copy lands (releaseHold). → true when moved.
   */
  function setAside(s, raw, p) {
    if (!p) s.damaged = true;
    var err = p ? oldAdd(s, p.obj) : lsSet(s.key + '.bad', raw);
    if (err) { s.hold = { raw: raw, p: p || null, kind: p ? 'old' : 'bad', err: err }; return false; }
    if (p) s.retired[kdfId(p.kdf)] = 1;
    s.hold = null;
    if (lsGet(s.key) === raw) lsDel(s.key);
    return true;
  }
  /** → true when nothing is held any more (moved now, or replaced or removed by another tab meanwhile). */
  function releaseHold(s) {
    var h = s.hold;
    if (!h) return true;
    if (lsGet(s.key) !== h.raw) { s.hold = null; return true; }
    return setAside(s, h.raw, h.p);
  }
  /**
   * Right before this tab writes the main blob: never replace a list sealed with another password unless its copy is
   * in '.old'. → 'ok' | 'hold' (a copy did not fit) | 'foreign' (a password this tab has not set aside holds the list).
   */
  function guardMain(s, k) {
    if (!releaseHold(s)) return 'hold';
    var cur = lsGet(s.key);
    if (cur == null || cur === s.lastRaw || ownPrefix(cur, k)) return 'ok';
    var p = parseBlob(cur);
    if (!p || sameKdf(p.kdf, k)) return 'ok';            // unreadable: replaced, as before
    if (!s.retired[kdfId(p.kdf)]) return 'foreign';
    return setAside(s, cur, p) ? 'ok' : 'hold';
  }
  /** Merge every '.old' blob sealed with key record k into target ({data, gone, vaultSeen}) → {cts, n}. */
  function absorbOwn(s, k, target) {
    var out = { cts: [], n: 0 };
    return readOldRaw(s).filter(function (o) { return sameKdf(o.kdf, k); }).reduce(function (c, o) {
      return c.then(function () {
        if (closed) return null;
        return openBlob(s.name, parseBlobObj(o), k.key).then(function (d) {
          if (closed) return;
          out.n += mergeInto(target, cleanDoc(s, d)).changed;
          target.vaultSeen = later(target.vaultSeen, d.vaultSeen);
          out.cts.push(o.ct);
        }, noop);
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  function readLegacy(s) {
    var lk = KNOWN[s.name] && KNOWN[s.name].legacy;
    if (!lk) return null;
    var raw = lsGet(lk), obj;
    if (raw == null) return null;
    try { obj = JSON.parse(raw); } catch (e) { return null; }
    if (!isObj(obj) || obj.v !== 1 || !isObj(obj.data)) return null;  // not a v5 list: left as it is (purge removes it)
    return cleanDoc(s, { data: obj.data, gone: {} });
  }

  function openStore(s) {
    if (s.opened) return s.ready.p;
    s.opened = true;
    enqueue(s, function () { return load(s); }).then(null, function () { finishLoad(s); });
    return s.ready.p;
  }

  /**
   * §7.4: sealed copy (another password → '.old', will not open → '.bad') → blobs in '.old' under this key (they open
   * by themselves) → v5 plain list (once) → the copy in the encrypted file (once per save) → edits made before.
   */
  function load(s) {
    var doc = { data: {}, gone: {}, vaultSeen: null }, need = false, legacyKeys = null, absorbed = [];
    var step = Promise.resolve();
    if (base === 'ready' && K) {
      var k = K, raw = lsGet(s.key);
      if (raw != null) {
        var p = parseBlob(raw);
        if (!p) setAside(s, raw, null);
        else if (!sameKdf(p.kdf, k)) setAside(s, raw, p);
        else {
          step = openBlob(s.name, p, k.key).then(function (d) {
            var c = cleanDoc(s, d);
            doc.data = c.data; doc.gone = c.gone; doc.vaultSeen = d.vaultSeen;
            s.lastRaw = raw;
          }, function () { setAside(s, raw, null); });
        }
      }
      step = step.then(function () {
        if (closed) return null;
        return absorbOwn(s, k, doc).then(function (got) { absorbed = got.cts; if (absorbed.length) need = true; });
      });
    }
    return step.then(function () {
      if (closed) return null;
      if (base === 'ready' && K) s.oldN = countOld(s);
      var leg = readLegacy(s);
      if (leg && (keys(leg.data).length || base === 'ready')) { mergeInto(doc, leg); legacyKeys = keys(leg.data); need = true; }
      if (vaultIn && vaultIn.saved !== doc.vaultSeen) {
        var vs = vaultIn.stores[s.name];
        if (vs) mergeInto(doc, cleanDoc(s, vs));
        doc.vaultSeen = vaultIn.saved;
        need = true;
      }
      if (s.ops.length || s.opsOverflow) { replay(s, doc); need = true; }
      prune(doc, nowMs());
      s.data = doc.data; s.gone = doc.gone; s.vaultSeen = doc.vaultSeen;
      s.loaded = true;
      if (base !== 'ready') { s.mem = baseReason; return null; }
      if (!need) return null;
      return doWrite(s).then(function (r) {
        if (r.ok && !closed) oldDrop(s, absorbed);   // the blobs opened from '.old' go once the list holding them is sealed
        if (!r.ok || !legacyKeys) return null;
        return verify(s, legacyKeys).then(function (ok) {
          if (ok && !closed) { lsDel(KNOWN[s.name].legacy); s.migrated = true; }
        });
      });
    }).then(function () { finishLoad(s); });
  }
  function finishLoad(s) {
    if (closed) return;
    s.loaded = true;
    s.ops = []; s.opsOverflow = false;
    s.ready.resolve(statusOf(s));
    changed(s, s.migrated ? 'migrated' : 'load');
  }
  function replay(s, doc) {
    if (s.opsOverflow) mergeInto(doc, { data: s.data, gone: s.gone });
    else s.ops.forEach(function (op) { try { s.apply(doc, op); } catch (e) { /* skip a bad op */ } });
    s.ops = []; s.opsOverflow = false;
  }
  function recordOp(s, op) {
    if (s.loaded) return;
    if (s.opsOverflow) return;
    if (s.ops.length >= MAX_OPS) { s.opsOverflow = true; s.ops = []; return; }
    s.ops.push(op);
  }
  /** After a migration: read the blob back and open it; only then is the plain key removed. */
  function verify(s, ks) {
    var p = parseBlob(lsGet(s.key));
    if (!p || !K) return Promise.resolve(false);
    return openBlob(s.name, p, K.key).then(function (d) {
      return ks.every(function (k) { return has(d.data, k) || has(d.gone, k); });
    }, function () { return false; });
  }

  /** One sealed write of the store's current state (call only from inside the store's chain). */
  function doWrite(s) {
    if (closed || !K || base !== 'ready') return Promise.resolve({ ok: false, persisted: false, error: closed ? 'locked' : (baseReason || 'no-key') });
    if (s.foreign) return sealAside(s);
    var t0 = perf(), k = K;
    prune(s, nowMs());
    var json = JSON.stringify({ v: 1, data: s.data, gone: s.gone, vaultSeen: s.vaultSeen, saved: nowIso() });
    return encryptJson(s.name, json, k).then(function (blob) {
      if (s.foreign) return sealAside(s);
      // checked right before the write (not before the encryption), so a blob another tab wrote meanwhile is seen
      var st0 = statusOf(s), g = guardMain(s, k);
      if (g === 'foreign') return goForeign(s);
      if (g === 'hold') {
        if (statusOf(s) !== st0) changed(s, 'status');
        return { ok: false, persisted: false, error: s.hold.err };
      }
      if (statusOf(s) !== st0) changed(s, 'old');
      var err = lsSet(s.key, blob), before = s.mem;
      timings.write = Math.round((perf() - t0) * 10) / 10;
      if (!err) s.lastRaw = blob;
      s.mem = err || null;
      if (before !== s.mem) changed(s, 'status');
      return err ? { ok: false, persisted: false, error: err } : { ok: true, persisted: true };
    }, function () {
      var before = s.mem;
      s.mem = 'no-key';
      if (before !== s.mem) changed(s, 'status');
      return { ok: false, persisted: false, error: 'crypto' };
    });
  }
  function result(s) {
    return persistedOf(s) ? { ok: true, persisted: true } : { ok: false, persisted: false, error: closed ? 'locked' : (s.mem || baseReason || 'no-key') };
  }
  /** Ask for a write of the latest state: one in flight, the next one right after (coalesced). */
  function schedule(s) {
    if (closed) return Promise.resolve({ ok: false, persisted: false, error: 'locked' });
    if (!s.loaded) return s.ready.p.then(function () { return result(s); });
    if (s.pending) return s.pending.p;
    var d = defer();
    s.pending = d;
    enqueue(s, function () {
      s.pending = null;
      return doWrite(s).then(function (r) { d.resolve(r); });
    }).then(null, function () { d.resolve({ ok: false, persisted: false, error: 'crypto' }); });
    return d.p;
  }

  /* ------------------------------------------------------ other tabs (§7.3) */

  function onStorage(e) {
    if (closed || base !== 'ready' || !e) return;
    try { if (e.storageArea && root.localStorage && e.storageArea !== root.localStorage) return; } catch (x) { return; }
    if (e.key === null) { // localStorage.clear() in another tab
      order.forEach(function (n) { var s = stores[n]; enqueue(s, function () { resetStore(s, 'purge'); }); });
      return;
    }
    if (typeof e.key !== 'string' || e.key.indexOf(PREFIX) !== 0) return;
    var rest = e.key.slice(PREFIX.length), side = rest.match(SIDE_RE);
    var name = side ? rest.slice(0, -4) : rest;
    if (!NAME_RE.test(name) || name === 'probe') return;
    if (!stores[name]) { // a list this tab has not opened yet (another tab made it): open it from storage
      if (side || e.newValue == null || order.length >= MAX_STORES) return;
      try { getStore(name); } catch (x) { /* ignore */ }
      return;
    }
    var s = stores[name];
    if (side) {
      if (side[1] === 'old') enqueue(s, function () { if (closed) return; var n0 = s.oldN; s.oldN = countOld(s); if (n0 !== s.oldN) changed(s, 'old'); });
      return;
    }
    var raw = e.newValue;
    if (raw == null) { var ov = typeof e.oldValue === 'string' ? e.oldValue : null; enqueue(s, function () { return onRemoved(s, ov); }); return; }
    enqueue(s, function () { return mergeIncoming(s, raw); });
  }
  function resetStore(s, why) {
    s.data = {}; s.gone = {}; s.vaultSeen = null; s.damaged = false; s.migrated = false; s.hold = null; s.lastRaw = null;
    s.oldN = countOld(s);
    changed(s, why);
  }
  /**
   * The main blob was removed in another tab, `ov` its last value. A purge removes '.old' and '.bad' first, so with all
   * three gone this list empties too. If this tab's blob went into '.old' (a tab signed in with another password set it
   * aside), or what happened is not clear, this tab keeps its list and steps aside (goForeign): nothing is lost.
   */
  function onRemoved(s, ov) {
    if (closed || !K || !s.loaded) return null;
    var k = K;
    if (s.hold && s.hold.raw === ov) { s.hold = null; changed(s, 'status'); }
    var p = ov == null ? null : parseBlob(ov), cur = lsGet(s.key);
    var purged = cur == null && lsGet(s.key + '.old') == null && lsGet(s.key + '.bad') == null;
    if (!p || !sameKdf(p.kdf, k)) { if (purged) resetStore(s, 'purge'); return null; }   // not this password's list
    if (readOldRaw(s).some(function (o) { return o.ct === p.obj.ct; })) return s.foreign ? null : goForeign(s);
    if (lsGet(s.key + '.bad') === ov) return s.foreign || cur != null ? null : doWrite(s);  // found damaged elsewhere: write this list again
    var cp = cur == null ? null : parseBlob(cur);
    if (purged || (cp && sameKdf(cp.kdf, k))) { resetStore(s, 'purge'); return null; }   // a purge (then maybe a new list with this password)
    return s.foreign ? null : goForeign(s);
  }
  function mergeIncoming(s, raw) {
    if (closed || !K || !s.loaded || s.foreign) return null;
    var k = K, p = parseBlob(raw);
    if (s.hold) {
      // the held list of another password was saved again by its own tab: hold the newer value
      if (s.hold.kind === 'old' && p && !sameKdf(p.kdf, k)) { s.hold.raw = raw; s.hold.p = p; return null; }
      s.hold = null;
      changed(s, 'status');
    }
    if (!p) return null; // unreadable: our next write replaces it
    if (!sameKdf(p.kdf, k)) {
      if (lsGet(s.key) !== raw) return null;   // replaced already: the next event carries the newer value
      // a password this tab set aside at sign-in (a tab still open with it): set this copy aside too and keep the list;
      // any other password: this tab steps aside
      return s.retired[kdfId(p.kdf)] ? doWrite(s) : goForeign(s);
    }
    return openBlob(s.name, p, k.key).then(function (d) {
      if (closed) return null;
      var now = nowMs(), inc = cleanDoc(s, d);
      prune(inc, now); prune(s, now);
      var r = mergeInto(s, inc);
      s.vaultSeen = later(s.vaultSeen, d.vaultSeen);
      if (r.changed) changed(s, 'merge');
      var mine = canon({ data: s.data, gone: s.gone, vs: s.vaultSeen || null });
      var theirs = canon({ data: inc.data, gone: inc.gone, vs: d.vaultSeen || null });
      return mine !== theirs ? doWrite(s) : null; // this tab holds something the other lacks: write the merged list
    }, noop);
  }
  /**
   * Another password holds the list now (another tab signed in with it): this tab steps aside. It never writes the main
   * blob again; its list stays sealed with its own key in '.old' (sealAside, after every change), so it opens by itself
   * at the next sign-in with this tab's password, or with "Buka dengan kata sandi lama". State 'memory', 'no-key'.
   */
  function goForeign(s) {
    if (s.foreign || !K) return Promise.resolve({ ok: false, persisted: false, error: s.mem || 'no-key' });
    s.foreign = true;
    s.hold = null;
    s.mem = 'no-key';
    changed(s, 'status');
    return sealAside(s);
  }
  /** One blob per key in '.old': this tab's list merged with the blobs already there under its key, which it replaces. */
  function sealAside(s) {
    var k = K;
    if (closed || !k) return Promise.resolve({ ok: false, persisted: false, error: 'locked' });
    return absorbOwn(s, k, s).then(function (got) {
      if (closed) return { ok: false, persisted: false, error: 'locked' };
      if (got.n) changed(s, 'merge');
      prune(s, nowMs());
      if (!keys(s.data).length && !keys(s.gone).length && !got.cts.length) return { ok: false, persisted: false, error: s.mem };
      var json = JSON.stringify({ v: 1, data: s.data, gone: s.gone, vaultSeen: s.vaultSeen, saved: nowIso() });
      return encryptJson(s.name, json, k).then(function (blob) {
        var obj = JSON.parse(blob);
        var err = oldEdit(s, function (arr) { return arr.filter(function (o) { return got.cts.indexOf(o.ct) < 0; }).concat([obj]); });
        var before = s.mem;
        s.mem = err === 'quota' ? 'quota' : 'no-key';
        if (before !== s.mem) changed(s, 'status');
        return { ok: false, persisted: false, error: s.mem };
      });
    }).then(null, function () { return { ok: false, persisted: false, error: 'crypto' }; });
  }
  function hookStorage() {
    if (hooked || typeof root.addEventListener !== 'function') return;
    root.addEventListener('storage', onStorage);
    hooked = true;
  }
  function unhookStorage() {
    if (!hooked) return;
    try { root.removeEventListener('storage', onStorage); } catch (e) { /* ignore */ }
    hooked = false;
  }

  /* -------------------------------------------------- old password (§7.6) */

  /**
   * "Buka dengan kata sandi lama": every blob in '.old' (and a held one, s.hold) that opens with pw is merged into the
   * list, which is then sealed with the current key; only then do the opened blobs leave '.old' (a fresh read: a blob
   * another tab added meanwhile stays). A lock at any point stops it: nothing decrypted reaches a list after the lock.
   * → {ok, merged, error?}; ok with error 'quota' | 'no-storage' when the merged list could not be sealed yet (the old
   * blobs then stay and the list shows the memory line).
   */
  function openOld(list, pw) {
    if (typeof pw !== 'string' || !pw) return Promise.resolve({ ok: false, merged: 0, error: 'wrong-password' });
    if (closed) return Promise.resolve({ ok: false, merged: 0, error: 'locked' });
    if (base !== 'ready' || !K) return Promise.resolve({ ok: false, merged: 0, error: 'not-ready' });
    var V = MCD.vault;
    if (!V || typeof V.deriveKey !== 'function') return Promise.resolve({ ok: false, merged: 0, error: 'no-crypto' });
    var cache = {}, merged = 0, opened = 0, tried = 0, writeErr = null;
    function keyFor(kdf) {
      if (closed || !cache) return Promise.resolve(null);
      var id = kdfId(kdf);
      if (!cache[id]) cache[id] = V.deriveKey(pw, kdf.salt, kdf.iter).then(null, function () { return null; });
      return cache[id];
    }
    var targets = list.filter(function (s) { return s.loaded && !s.foreign; });
    return targets.reduce(function (chain, s) {
      return chain.then(function () {
        if (closed) return null;
        return enqueue(s, function () {
          if (closed) return null;
          var cands = readOldRaw(s).map(function (o) { return { o: o, held: false }; });
          var h = heldOld(s) && s.hold.p ? s.hold : null, hRaw = h && h.raw, hKdf = h && h.p.kdf;
          if (h) cands.push({ o: h.p.obj, held: true });
          var done = [], heldOpen = false, gain = 0;
          return cands.reduce(function (c, x) {
            return c.then(function () {
              if (closed) return null;
              var p = parseBlobObj(x.o);
              if (!p) return null;
              tried++;
              return keyFor(p.kdf).then(function (key) {
                if (closed || !key) throw 'tag';
                return openBlob(s.name, p, key);
              }).then(function (d) {
                if (closed) return;
                gain += mergeInto(s, cleanDoc(s, d)).changed;
                if (x.held) heldOpen = true; else done.push(x.o.ct);
              }, noop);
            });
          }, Promise.resolve()).then(function () {
            if (closed || (!done.length && !heldOpen)) return null;
            opened += done.length + (heldOpen ? 1 : 0);
            merged += gain;
            if (heldOpen) {
              // its entries are in this list now: the next write may replace that value (lastRaw), and a later copy
              // from a tab still open with that password is set aside, not followed (retired)
              s.retired[kdfId(hKdf)] = 1;
              s.lastRaw = hRaw;
              if (s.hold === h) s.hold = null;
            }
            changed(s, 'old');
            return doWrite(s).then(function (r) {
              if (closed) return;
              if (r.ok) oldDrop(s, done);   // the old blobs go only once the merged list is sealed with the current key
              else writeErr = writeErr || r.error || 'quota';
              changed(s, 'old');
            });
          });
        });
      });
    }, Promise.resolve()).then(function () {
      cache = null;
      if (closed) return { ok: false, merged: 0, error: 'locked' };
      if (!opened) return { ok: false, merged: 0, error: tried ? 'wrong-password' : 'none' };
      return writeErr ? { ok: true, merged: merged, error: writeErr } : { ok: true, merged: merged };
    }, function () { cache = null; return { ok: false, merged: 0, error: closed ? 'locked' : 'wrong-password' }; });
  }
  /** "Hapus daftar lama": the blobs of other passwords (and a held one) go; blobs under this tab's key stay (they open by themselves). */
  function dropOld(s) {
    if (closed) return;
    var k = K, h = heldOld(s) ? s.hold : null;
    if (h) { if (lsGet(s.key) === h.raw) lsDel(s.key); s.hold = null; }
    var n0 = oldCountOf(s) + (h ? 1 : 0);
    oldEdit(s, function (arr) { return arr.filter(function (o) { return sameKdf(o.kdf, k); }); });
    if (n0 !== oldCountOf(s)) changed(s, 'old');
    if (h) schedule(s);   // this tab's list takes the place of the dropped one
  }

  /* ------------------------------------------------------------ store API */

  function clearStore(s) {
    if (closed) return Promise.resolve({ ok: false, persisted: false, error: 'locked' });
    var t = nowMs();
    keys(s.data).forEach(function (k) { s.gone[k] = later(has(s.gone, k) ? s.gone[k] : null, isoAfter(t, s.data[k].t)); });
    s.data = {};
    recordOp(s, { op: 'clear', t: new Date(t).toISOString() });
    changed(s, 'clear');
    return schedule(s);
  }

  function storeApi(s) {
    return Object.freeze({
      name: s.name,
      get ready() { return s.ready.p; },
      data: function () { return s.data; },
      gone: function () { return s.gone; },
      /** write(next?) → Promise<{ok, persisted, error?}>: next replaces the entries (removed keys get tombstones). */
      write: function (next) {
        if (closed) return Promise.resolve({ ok: false, persisted: false, error: 'locked' });
        if (next !== undefined) {
          if (!isObj(next)) return Promise.resolve({ ok: false, persisted: false, error: 'invalid' });
          var c = cleanDoc(s, { data: next, gone: {} }).data, t = nowIso();
          keys(c).forEach(function (k) { if (!c[k].t) c[k].t = t; });
          var op = { op: 'replace', data: c, t: t };
          genericApply(s, op);
          recordOp(s, clone(op));
          changed(s, 'write');
        }
        return schedule(s);
      },
      status: function () { return statusOf(s); },
      persisted: function () { return persistedOf(s); },
      count: function () { return keys(s.data).length; },
      oldCount: function () { return oldCountOf(s); },
      migrated: function () { return s.migrated; },
      openOld: function (pw) { return openOld([s], pw); },
      dropOld: function () { dropOld(s); },
      clear: function () { return clearStore(s); },
      on: function (fn) { return subscribe(s.subs, fn); }
    });
  }

  /* ------------------------------------------------------------- pipeline */

  /**
   * pipeline(name, opts) → the v5 pipeline API on a sealed store (one per store; a second call returns the first).
   * opts: keyRe, stages, products, programs ([{id}] or ids), check(key, patch, all, meta) → error | null,
   * onChange(all, info), messages {noKey, noQuickKey, badKey, unreadable, notExport}.
   */
  function pipeline(name, opts) {
    var s = getStore(name);
    if (s.pipe) return s.pipe;
    opts = opts || {};
    var known = KNOWN[name] || {};
    var re = isRe(opts.keyRe) ? new RegExp(opts.keyRe.source, String(opts.keyRe.flags || '').replace(/[gy]/g, '')) : (known.keyRe || GENERIC_KEY_RE);
    var stageIds = ids(opts.stages);
    if (!stageIds.length) stageIds = ['baru'];
    var first = stageIds.indexOf('baru') >= 0 ? 'baru' : stageIds[0];
    var productIds = ids(opts.products);
    var programIds = ids(opts.programs);
    if (programIds.indexOf('') < 0) programIds.unshift('');
    var check = typeof opts.check === 'function' ? opts.check : null;
    var msgs = Object.assign({}, MSG.base, MSG[name] || {}, isObj(opts.messages) ? opts.messages : {});
    var kind = 'mcd.' + name;
    var keyOk = keyTester(re);

    function stageOk(x) { return typeof x === 'string' && stageIds.indexOf(x) >= 0 ? x : first; }
    function programOk(x) { return typeof x === 'string' && programIds.indexOf(x) >= 0 ? x : ''; }
    function productsOk(a) { return (Array.isArray(a) ? a : []).filter(function (x) { return typeof x === 'string' && productIds.indexOf(x) >= 0; }); }
    function dateOk(x) { var v = String(x == null ? '' : x); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; }
    function clean(inc) {
      if (!isObj(inc)) return null;
      return {
        stage: stageOk(inc.stage), owner: cleanText(inc.owner, 60), products: productsOk(inc.products), program: programOk(inc.program),
        nextStep: cleanText(inc.nextStep, 120), nextDate: dateOk(inc.nextDate), lastContact: dateOk(inc.lastContact), note: cleanText(inc.note, 500),
        history: Array.isArray(inc.history) ? inc.history.slice(-20).map(function (h) { return { stage: stageOk(h && h.stage), t: cleanText(h && h.t, 40) }; }) : [],
        t: cleanText(inc.t, 40), label: cleanText(inc.label, 160)
      };
    }
    function blank() { return { stage: first, owner: '', products: [], program: '', nextStep: '', nextDate: '', lastContact: '', note: '', history: [], t: '' }; }
    /** The v5 set rule on doc ({data, gone}); `at` = the edit time (ms or ISO). */
    function applySet(doc, k, patch, meta, at) {
      var cur = has(doc.data, k) ? doc.data[k] : blank();
      var next = Object.assign({}, cur), t = isoAfter(at, cur.t);
      patch = isObj(patch) ? patch : {};
      if ('program' in patch) next.program = programOk(patch.program);
      if ('stage' in patch) {
        var s2 = stageOk(patch.stage), hist = Array.isArray(cur.history) ? cur.history : [];
        if (s2 !== cur.stage || !hist.length) next.history = hist.concat([{ stage: s2, t: t }]).slice(-20);
        next.stage = s2;
      }
      if ('owner' in patch) next.owner = cleanText(patch.owner, 60);
      if ('nextStep' in patch) next.nextStep = cleanText(patch.nextStep, 120);
      if ('note' in patch) next.note = cleanText(patch.note, 500);
      ['nextDate', 'lastContact'].forEach(function (f) { if (f in patch) next[f] = dateOk(patch[f]); });
      if ('products' in patch) next.products = productsOk(patch.products);
      if (meta && meta.label) next.label = cleanText(meta.label, 160);
      next.t = t;
      doc.data[k] = next;
      if (has(doc.gone, k)) delete doc.gone[k];
      return next;
    }
    function apply(doc, op) {
      if (op.op === 'set') {
        if (check) { var err = null; try { err = check(op.k, op.patch || {}, doc.data, op.meta || {}); } catch (e) { err = 'check'; } if (err) return; }
        applySet(doc, op.k, op.patch, op.meta, op.t);
      } else genericApply(doc, op);
    }

    s.keyOk = keyOk; s.clean = clean; s.apply = apply;
    if (s.loaded) { var c0 = cleanDoc(s, s); s.data = c0.data; s.gone = c0.gone; }
    if (typeof opts.onChange === 'function') s.subs.push(function (all, info) { opts.onChange(all, info); });

    var P = {
      key: s.key,
      name: name,
      kind: kind,
      all: function () { return s.data; },
      get: function (k) { return has(s.data, k) ? s.data[k] : null; },
      persisted: function () { return persistedOf(s); },
      /** set(key, patch, meta {label, relatedKeys}) → {ok, entry, error}; memory at once, then a sealed write. */
      set: function (k, patch, meta) {
        if (closed) return { ok: false, error: MSG.locked };
        if (!k) return { ok: false, error: msgs.noKey };
        if (!keyOk(k)) return { ok: false, error: msgs.badKey };
        if (check) {
          var err = null;
          try { err = check(k, patch || {}, s.data, meta || {}); } catch (e) { err = msgs.badKey; }
          if (err) return { ok: false, error: String(err) };
        }
        var at = nowMs();
        var entry = applySet(s, k, patch, meta, at);
        recordOp(s, { op: 'set', k: k, patch: clone(isObj(patch) ? patch : {}), meta: meta ? { label: meta.label || '', relatedKeys: Array.isArray(meta.relatedKeys) ? meta.relatedKeys.slice() : [] } : null, t: entry.t });
        changed(s, 'set');
        schedule(s);
        return { ok: true, entry: entry };
      },
      /** quickAdd(key, label) → {ok, entry, existed, error}: "+ Tindak lanjut"; an entry already in the list stays as it is. */
      quickAdd: function (k, label) {
        if (closed) return { ok: false, error: MSG.locked };
        if (!k) return { ok: false, error: msgs.noQuickKey };
        if (!keyOk(k)) return { ok: false, error: msgs.badKey };
        if (has(s.data, k)) return { ok: true, entry: s.data[k], existed: true };
        var res = P.set(k, { stage: first }, { label: label || '' });
        if (res && res.ok) res.existed = false;
        return res;
      },
      remove: function (k) {
        if (closed || !has(s.data, k)) return;
        var op = { op: 'remove', k: k, t: nowIso() };
        genericApply(s, op);
        recordOp(s, op);
        changed(s, 'remove');
        schedule(s);
      },
      clear: function () { clearStore(s); },
      count: function () { return keys(s.data).length; },
      /** Entries only: tombstones and vaultSeen never leave the sealed copy. */
      exportJson: function () { return JSON.stringify({ v: 1, kind: kind, exported: nowIso(), data: s.data }, null, 1); },
      /** Merges by key; the newer `t` wins. → {ok, added, updated, kept} */
      importJson: function (text) {
        if (closed) return { ok: false, error: MSG.locked };
        var obj;
        try { obj = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, error: msgs.unreadable }; }
        if (!obj || obj.v !== 1 || !isObj(obj.data) || (typeof obj.kind === 'string' && obj.kind !== kind)) return { ok: false, error: msgs.notExport };
        var added = 0, updated = 0, kept = 0, n = 0;
        keys(obj.data).forEach(function (k) {
          if (n >= MAX_ENTRIES || !keyOk(k)) return;
          var c = clean(obj.data[k]);
          if (!c) return;
          n++;
          var r = importRule(s, k, c);
          recordOp(s, { op: 'put', k: k, e: c });
          if (r === 'added') added++; else if (r === 'updated') updated++; else kept++;
        });
        changed(s, 'import');
        schedule(s);
        return { ok: true, added: added, updated: updated, kept: kept };
      },
      ready: function () { return s.ready.p; },
      status: function () { return statusOf(s); },
      migrated: function () { return s.migrated; },
      /** orphans(known) → keys in the list that are no longer in the data (array, Set, map object or predicate). */
      orphans: function (known) {
        var isKnown;
        if (typeof known === 'function') isKnown = known;
        else if (known && typeof known.has === 'function') isKnown = function (k) { return known.has(k); };
        else if (Array.isArray(known)) { var m = {}; known.forEach(function (k) { m[k] = 1; }); isKnown = function (k) { return has(m, k); }; }
        else if (isObj(known)) isKnown = function (k) { return has(known, k); };
        else isKnown = function () { return false; };
        return keys(s.data).filter(function (k) { try { return !isKnown(k); } catch (e) { return true; } });
      },
      on: function (fn) { return subscribe(s.subs, fn); },
      /** Test hook (tests/schools*.test.mjs): drop the list in memory; an open sealed store reads its copy again. */
      _reset: function () {
        s.ops = []; s.opsOverflow = false;
        s.data = {}; s.gone = {};
        if (!(s.loaded && base === 'ready' && K && !closed)) return Promise.resolve();
        return enqueue(s, function () {
          if (closed || !K) return null;
          var p = parseBlob(lsGet(s.key));
          if (!p || !sameKdf(p.kdf, K)) return null;
          return openBlob(s.name, p, K.key).then(function (d) {
            if (closed) return;
            mergeInto(s, cleanDoc(s, d));
            s.vaultSeen = later(s.vaultSeen, d.vaultSeen);
            changed(s, 'load');
          }, noop);
        });
      }
    };
    s.pipe = P;
    return P;
  }

  /* ----------------------------------------------------- vault copy (§7.5) */

  function cleanVault(fu) {
    if (!isObj(fu) || fu.v !== 1 || typeof fu.saved !== 'string' || !tm(fu.saved) || !isObj(fu.stores)) return null;
    var out = { saved: fu.saved.slice(0, 40), stores: {} }, n = 0;
    keys(fu.stores).forEach(function (name) {
      if (n >= MAX_STORES || !NAME_RE.test(name) || SIDE_RE.test(name) || name === 'probe') return;
      var st = fu.stores[name];
      if (!isObj(st)) return;
      try { out.stores[name] = clone({ data: isObj(st.data) ? st.data : {}, gone: isObj(st.gone) ? st.gone : {} }); n++; } catch (e) { /* skip */ }
    });
    return out;
  }
  /**
   * payload.followups for "Simpan salinan terenkripsi": every list with its tombstones. Once the lists are open it always
   * returns an export (stores {} when there is nothing to carry), so a save after a purge replaces the block the old
   * payload carried; null only before sign-in or after a lock (the shell then keeps the block it has).
   */
  function vaultExport() {
    if (closed || base === 'locked') return null;
    var out = { v: 1, saved: nowIso(), stores: {} }, now = nowMs();
    order.forEach(function (n) {
      var s = stores[n], d = { data: s.data, gone: s.gone };
      if (!s.loaded && vaultIn && vaultIn.stores[n]) { var tmp = cleanDoc(s, vaultIn.stores[n]); mergeInto(tmp, d); d = tmp; }
      d = clone(d);
      prune(d, now);
      if (keys(d.data).length || keys(d.gone).length) out.stores[n] = d;
    });
    return out;
  }
  /** After the encrypted copy with followups.saved = `saved` is written: that copy is never merged again on this computer. */
  function vaultSaved(saved) {
    if (closed || typeof saved !== 'string' || !tm(saved)) return Promise.resolve(false);
    return Promise.all(order.map(function (n) {
      var s = stores[n];
      if (!s.loaded) return null;
      s.vaultSeen = saved.slice(0, 40);
      return schedule(s);
    })).then(function () { return true; }, function () { return false; });
  }

  /* ----------------------------------------------------------- init, lock */

  function saltB64(x) {
    if (x && typeof x === 'object' && typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(x)) {
      if (x.byteLength !== SALT_BYTES) return null;
      return b64enc(new Uint8Array(x.buffer, x.byteOffset, x.byteLength));
    }
    if (typeof x === 'string') { var b = b64dec(x); return b && b.length === SALT_BYTES ? b64enc(b) : null; }
    return null;
  }
  function checkEnv(session) {
    if (!cryptoOk()) return 'no-crypto';
    if (!lsObj()) return 'no-storage';
    var k = session && session.key;
    if (!k || typeof k !== 'object' || k.type !== 'secret' || k.extractable !== false || !k.algorithm || k.algorithm.name !== 'AES-GCM') return 'no-key';
    var u = k.usages;
    if (!u || typeof u.indexOf !== 'function' || u.indexOf('encrypt') < 0 || u.indexOf('decrypt') < 0) return 'no-key';
    var salt = saltB64(session.salt), iter = session.iter;
    if (!salt || typeof iter !== 'number' || iter % 1 !== 0 || iter < MIN_ITER || iter > MAX_ITER) return 'no-key';
    K = { key: k, salt: salt, iter: iter };
    return null;
  }
  function scanNames() {
    var out = [];
    lsKeys(PREFIX).forEach(function (k) {
      var n = k.slice(PREFIX.length).replace(SIDE_RE, '');
      if (NAME_RE.test(n) && n !== 'probe' && out.indexOf(n) < 0) out.push(n);
    });
    Object.keys(KNOWN).forEach(function (n) { if (KNOWN[n].legacy && lsGet(KNOWN[n].legacy) != null && out.indexOf(n) < 0) out.push(n); });
    return out;
  }

  /** init(session) → Promise<state>. Once, from app.js right after sign-in; never rejects; a second call is refused. */
  function init(session) {
    if (initCalled || closed) return Promise.resolve(state());
    initCalled = true;
    opening = true;
    var t0 = perf(), fu = null;
    try { fu = session && isObj(session.payload) ? session.payload.followups : null; } catch (e) { fu = null; }
    vaultIn = cleanVault(fu);
    fu = null;
    baseReason = checkEnv(session);
    base = baseReason ? 'memory' : 'ready';
    session = null;
    emitGlobal('opening');
    var names = order.slice();
    scanNames().concat(vaultIn ? keys(vaultIn.stores) : []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    if (base === 'ready') hookStorage();
    var opens = [];
    names.forEach(function (n) {
      var s;
      try { s = getStore(n); } catch (e) { return; }
      opens.push(openStore(s));
    });
    function done() {
      if (closed) return state();
      opening = false;
      vaultIn = null;
      timings.init = Math.round((perf() - t0) * 10) / 10;
      emitGlobal('ready');
      return state();
    }
    return Promise.all(opens).then(done, done);
  }

  /** mcd:gate-locking (dispatched before the reload): drop the key and every decrypted list at once. */
  function onLocking() {
    if (closed) return;
    closed = true;
    opening = false;
    K = null;
    vaultIn = null;
    unhookStorage();
    order.forEach(function (n) {
      var s = stores[n];
      s.data = {}; s.gone = {}; s.vaultSeen = null; s.ops = []; s.opsOverflow = false; s.pending = null;
      s.hold = null; s.lastRaw = null; s.retired = {};
      s.ready.resolve('loading');   // a lock during the opening settles init() instead of leaving it pending
    });
    emitGlobal('locked');
  }
  if (root.document && typeof root.document.addEventListener === 'function') root.document.addEventListener('mcd:gate-locking', onLocking);

  /**
   * "Hapus tindak lanjut dari komputer ini": every mcd.seal.v1.* key (with .old and .bad), and a left-over plain key.
   * The side copies go first, so another tab that sees the main key go finds them gone too and empties its list
   * (onRemoved) instead of keeping it aside. This tab starts afresh (also after it had stepped aside).
   */
  function purge() {
    var list = order.map(function (n) { return stores[n]; });
    list.forEach(function (s) {
      s.data = {}; s.gone = {}; s.vaultSeen = null; s.ops = []; s.opsOverflow = false; s.damaged = false; s.migrated = false;
    });
    vaultIn = null;
    return Promise.all(list.map(function (s) { return enqueue(s, noop); })).then(function () {
      var ks = lsKeys(PREFIX);
      ks.filter(function (k) { return SIDE_RE.test(k); }).concat(ks.filter(function (k) { return !SIDE_RE.test(k); })).forEach(lsDel);
      Object.keys(KNOWN).forEach(function (n) { if (KNOWN[n].legacy) lsDel(KNOWN[n].legacy); });
      list.forEach(function (s) {
        s.oldN = 0; s.hold = null; s.foreign = false; s.retired = {}; s.lastRaw = null;
        s.mem = base === 'ready' ? null : baseReason;
        changed(s, 'purge');
      });
      emitGlobal('purge');
      return { ok: true, removed: ks.length };
    });
  }

  function summary() {
    var out = { state: state(), reason: reason(), stores: {} };
    order.forEach(function (n) {
      var s = stores[n];
      out.stores[n] = { status: statusOf(s), count: keys(s.data).length, old: oldCountOf(s), persisted: persistedOf(s), migrated: s.migrated };
    });
    return out;
  }

  MCD.seal = Object.freeze({
    VERSION: VERSION,
    PREFIX: PREFIX,
    init: init,
    state: state,
    reason: reason,
    store: function (name) { return getStore(name).api; },
    pipeline: pipeline,
    vaultExport: vaultExport,
    vaultSaved: vaultSaved,
    /** true while any list holds entries or removals the encrypted copy should carry ("keepAny" in Data & Privasi). */
    hasFollowups: function () {
      if (closed || base === 'locked') return false;
      return order.some(function (n) { return keys(stores[n].data).length > 0 || keys(stores[n].gone).length > 0; });
    },
    summary: summary,
    /** "Buka dengan kata sandi lama": every list with old blobs; one key derivation per old salt. */
    openOld: function (pw) { return openOld(order.map(function (n) { return stores[n]; }).filter(function (s) { return oldCountOf(s) > 0; }), pw); },
    dropOld: function () { order.forEach(function (n) { dropOld(stores[n]); }); },
    purge: purge,
    on: function (fn) { return subscribe(listeners, fn); },
    timings: function () { return { init: timings.init, write: timings.write }; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
