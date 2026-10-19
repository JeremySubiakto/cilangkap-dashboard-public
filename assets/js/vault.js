/* ==========================================================================
 * MCD vault — crypto core for the Acquisition Dashboard password gate.
 * Bank Mandiri KCP Jakarta Cilangkap.
 *
 * Shared by the browser (classic <script>, attaches to window.MCD.vault) and
 * Node (CommonJS: module.exports; used by tools/make-vault.mjs and tests).
 * Uses WebCrypto only (globalThis.crypto.subtle). No dependencies.
 *
 * Vault format v2 (written by this file; all binary fields are standard base64):
 *   {
 *     format: "mcd-vault", v: 2, created: "YYYY-MM-DDTHH:MM:SS.mmmZ",
 *     kdf:    { alg: "PBKDF2", hash: "SHA-256", iter: 600000, salt: b64(16 bytes) },
 *     cipher: { alg: "AES-GCM", keyBits: 256, iv: b64(12 bytes) },
 *     ct:     b64(ciphertext || 16-byte GCM tag)
 *   }
 *   AAD v2  = UTF-8("mcd-vault|v2|" + created + "|PBKDF2|SHA-256|" + kdf.iter + "|" + kdf.salt + "|AES-GCM|256")
 *   Every header field is authenticated (the IV is bound by GCM itself), and
 *   v2 accepts no other keys at any level, so ANY change to the file fails.
 *
 * Format v1 (read-only, for files made before v2): same layout with v: 1,
 *   AAD v1 = UTF-8("mcd-vault|v1|" + kdf.iter + "|" + kdf.salt). Its `created`
 *   and any extra fields are NOT authenticated; they are never returned or used.
 *
 *   Payload = UTF-8(JSON.stringify(obj)) in both versions.
 *
 * The AES-GCM authentication tag is the ONLY password verifier. Nothing in
 * this file (or anywhere in the project) stores a password, a hash of it,
 * or any other verifier. A wrong password and a tampered vault are
 * deliberately indistinguishable: both raise BAD_PASSWORD_OR_TAMPERED.
 *
 * Keys from deriveKey() remember the salt and iteration count they were
 * derived with; encryptWithKey() refuses any other salt/iter, so a re-save
 * can never produce a file that the password cannot open.
 *
 * Errors are VaultError instances with a stable .code:
 *   "BAD_PASSWORD_OR_TAMPERED" | "UNSUPPORTED_FORMAT" | "NO_WEBCRYPTO"
 *   (plus "INVALID_ARGUMENT" for programmer errors such as a non-string password).
 * Error messages never contain secrets. This module never logs.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  var isCommonJS = typeof module === 'object' && module !== null && typeof module.exports === 'object';
  if (isCommonJS) module.exports = api;
  // Browsers (and any non-CommonJS host, e.g. ESM evaluation): attach to MCD namespace.
  if (!isCommonJS || typeof window !== 'undefined') {
    root.MCD = root.MCD || {};
    root.MCD.vault = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (root) {
  'use strict';

  var FORMAT = 'mcd-vault';
  var VERSION = 2;                 // version written by encryptPayload / encryptWithKey
  var READ_VERSIONS = [1, 2];      // versions decryptVault / validate accept
  var DEFAULT_ITER = 600000;
  var MIN_ITER = 100000;
  var MAX_ITER = 5000000;
  var SALT_BYTES = 16;
  var IV_BYTES = 12;
  var TAG_BYTES = 16;
  var KEY_BITS = 256;
  var SCRIPT_MARKER = 'window.MCD_VAULT =';
  var ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  var CODES = Object.freeze({
    BAD_PASSWORD_OR_TAMPERED: 'BAD_PASSWORD_OR_TAMPERED',
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    NO_WEBCRYPTO: 'NO_WEBCRYPTO',
    INVALID_ARGUMENT: 'INVALID_ARGUMENT'
  });

  var MESSAGES = {
    BAD_PASSWORD_OR_TAMPERED: 'Vault could not be decrypted: wrong password or the vault was modified.',
    UNSUPPORTED_FORMAT: 'Vault format is not recognised or not supported.',
    NO_WEBCRYPTO: 'WebCrypto (crypto.subtle) is not available in this context.',
    INVALID_ARGUMENT: 'Invalid argument.'
  };

  // CryptoKey -> { salt: canonical base64, iter } for keys made by deriveKey().
  var KEY_PARAMS = new WeakMap();

  /* ---------------------------------------------------------------- errors */

  function VaultError(code, detail) {
    var message = MESSAGES[code] || 'Vault error.';
    if (detail) message += ' (' + detail + ')';
    var err = new Error(message);
    err.name = 'VaultError';
    err.code = code;
    if (Object.setPrototypeOf) Object.setPrototypeOf(err, VaultError.prototype);
    return err;
  }
  VaultError.prototype = Object.create(Error.prototype, {
    constructor: { value: VaultError, writable: true, configurable: true },
    name: { value: 'VaultError', writable: true, configurable: true }
  });

  function fail(code, detail) { throw VaultError(code, detail); }

  /* ------------------------------------------------------------- platform */

  function getCrypto() {
    var c = root && root.crypto;
    if (!c || !c.subtle || typeof c.getRandomValues !== 'function') return null;
    return c;
  }

  function hasWebCrypto() { return getCrypto() !== null; }

  function requireCrypto() {
    var c = getCrypto();
    if (!c) fail(CODES.NO_WEBCRYPTO);
    return c;
  }

  function randomBytes(n) {
    var out = new Uint8Array(n);
    requireCrypto().getRandomValues(out);
    return out;
  }

  /* --------------------------------------------------------------- base64 */

  // Strict standard-base64 check without a regex (a grouped regex overflows the
  // stack on multi-megabyte vaults).
  function isB64(s) {
    if (typeof s !== 'string' || s.length % 4 !== 0) return false;
    var n = s.length;
    var pad = n > 0 && s.charCodeAt(n - 1) === 61 ? (n > 1 && s.charCodeAt(n - 2) === 61 ? 2 : 1) : 0;
    for (var i = 0; i < n - pad; i++) {
      var c = s.charCodeAt(i);
      var ok = (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47;
      if (!ok) return false;
    }
    return true;
  }

  function bytesToB64(bytes) {
    var CHUNK = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    }
    return root.btoa(parts.join(''));
  }

  function b64ToBytes(b64, field) {
    if (!isB64(b64)) fail(CODES.UNSUPPORTED_FORMAT, field + ' is not valid base64');
    var bin;
    try { bin = root.atob(b64); } catch (e) { fail(CODES.UNSUPPORTED_FORMAT, field + ' is not valid base64'); }
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ------------------------------------------------------------ utilities */

  function utf8(str) { return new TextEncoder().encode(str); }

  function normalizePassword(password) {
    if (typeof password !== 'string') fail(CODES.INVALID_ARGUMENT, 'password must be a string');
    // NFC so the same password typed on different OSes / keyboards derives the same key.
    return typeof password.normalize === 'function' ? password.normalize('NFC') : password;
  }

  function checkIter(iter) {
    if (typeof iter !== 'number' || !Number.isInteger(iter)) return false;
    return iter >= MIN_ITER && iter <= MAX_ITER;
  }

  function requireIter(iter) {
    if (!checkIter(iter)) fail(CODES.INVALID_ARGUMENT, 'iter must be an integer between ' + MIN_ITER + ' and ' + MAX_ITER);
    return iter;
  }

  function toSaltBytes(salt) {
    if (salt instanceof Uint8Array) {
      if (salt.length !== SALT_BYTES) fail(CODES.INVALID_ARGUMENT, 'salt must be ' + SALT_BYTES + ' bytes');
      return salt;
    }
    if (typeof salt === 'string') {
      var bytes;
      try { bytes = b64ToBytes(salt, 'salt'); } catch (e) { fail(CODES.INVALID_ARGUMENT, 'salt must be base64'); }
      if (bytes.length !== SALT_BYTES) fail(CODES.INVALID_ARGUMENT, 'salt must be ' + SALT_BYTES + ' bytes');
      return bytes;
    }
    return fail(CODES.INVALID_ARGUMENT, 'salt must be a Uint8Array or base64 string');
  }

  /** True for a canonical UTC timestamp as written by Date#toISOString (e.g. 2026-10-12T02:28:58.746Z). */
  function isIsoTimestamp(s) {
    if (typeof s !== 'string' || !ISO_UTC_MS.test(s)) return false;
    var t = Date.parse(s);
    return !isNaN(t) && new Date(t).toISOString() === s;
  }

  function aadFor(params) {
    if (params.v === 1) return utf8(FORMAT + '|v1|' + params.iter + '|' + params.saltB64);
    return utf8(FORMAT + '|v2|' + params.created + '|PBKDF2|SHA-256|' + params.iter + '|' + params.saltB64 + '|AES-GCM|' + KEY_BITS);
  }

  function isPlainObject(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
  }

  function hasExactKeys(obj, keys) {
    var own = Object.keys(obj);
    if (own.length !== keys.length) return false;
    for (var i = 0; i < keys.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(obj, keys[i])) return false;
    }
    return true;
  }

  /* ----------------------------------------------------------- validation */

  /**
   * Structural validation without a password. Returns normalised parameters
   * { v, iter, saltB64, salt, iv, ct, created } or throws UNSUPPORTED_FORMAT.
   * v2 is strict: exactly the documented keys, and `created` must be a
   * canonical ISO-8601 UTC timestamp. v1 (legacy) ignores extra keys; its
   * `created` is returned as null because it is not authenticated.
   */
  function validate(vault) {
    var U = CODES.UNSUPPORTED_FORMAT;
    if (!isPlainObject(vault)) fail(U, 'vault is not an object');
    if (vault.format !== FORMAT) fail(U, 'format');
    var v = vault.v;
    if (READ_VERSIONS.indexOf(v) < 0) fail(U, 'version');
    var kdf = vault.kdf, cipher = vault.cipher;
    if (!isPlainObject(kdf) || kdf.alg !== 'PBKDF2' || kdf.hash !== 'SHA-256') fail(U, 'kdf');
    if (!checkIter(kdf.iter)) fail(U, 'kdf.iter out of bounds');
    if (!isPlainObject(cipher) || cipher.alg !== 'AES-GCM' || cipher.keyBits !== KEY_BITS) fail(U, 'cipher');
    if (v === 2) {
      if (!hasExactKeys(vault, ['format', 'v', 'created', 'kdf', 'cipher', 'ct'])) fail(U, 'unexpected or missing fields');
      if (!hasExactKeys(kdf, ['alg', 'hash', 'iter', 'salt'])) fail(U, 'unexpected or missing kdf fields');
      if (!hasExactKeys(cipher, ['alg', 'keyBits', 'iv'])) fail(U, 'unexpected or missing cipher fields');
      if (!isIsoTimestamp(vault.created)) fail(U, 'created is not an ISO-8601 UTC timestamp');
    }
    var salt = b64ToBytes(kdf.salt, 'kdf.salt');
    if (salt.length !== SALT_BYTES) fail(U, 'kdf.salt length');
    var iv = b64ToBytes(cipher.iv, 'cipher.iv');
    if (iv.length !== IV_BYTES) fail(U, 'cipher.iv length');
    var ct = b64ToBytes(vault.ct, 'ct');
    if (ct.length < TAG_BYTES) fail(U, 'ct too short');
    return { v: v, iter: kdf.iter, saltB64: kdf.salt, salt: salt, iv: iv, ct: ct, created: v === 2 ? vault.created : null };
  }

  /* ------------------------------------------------------------------ API */

  /**
   * PBKDF2-SHA-256 → non-extractable AES-GCM-256 key (encrypt + decrypt).
   * The key remembers its salt and iteration count (see encryptWithKey).
   * @param {string} password
   * @param {Uint8Array|string} salt 16 bytes, or base64 of 16 bytes
   * @param {number} [iter=600000]
   * @returns {Promise<CryptoKey>}
   */
  function deriveKey(password, salt, iter) {
    return Promise.resolve().then(function () {
      var c = requireCrypto();
      var pw = normalizePassword(password);
      var saltBytes = toSaltBytes(salt);
      var rounds = requireIter(iter === undefined ? DEFAULT_ITER : iter);
      return c.subtle.importKey('raw', utf8(pw), { name: 'PBKDF2' }, false, ['deriveKey'])
        .then(function (baseKey) {
          return c.subtle.deriveKey(
            { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: rounds },
            baseKey,
            { name: 'AES-GCM', length: KEY_BITS },
            false,
            ['encrypt', 'decrypt']
          );
        })
        .then(function (key) {
          KEY_PARAMS.set(key, { salt: bytesToB64(saltBytes), iter: rounds });
          return key;
        });
    });
  }

  /**
   * Encrypt with a key from deriveKey()/decryptVault(). salt and iter MUST be
   * the ones the key was derived with (INVALID_ARGUMENT otherwise), so the
   * output always opens with the password. A fresh random IV is used on every
   * call, so this is safe for repeated in-app re-saves after unlock.
   * @returns {Promise<object>} vault v2
   */
  function encryptWithKey(obj, key, salt, iter) {
    return Promise.resolve().then(function () {
      var c = requireCrypto();
      if (!key || typeof key !== 'object' || key.type !== 'secret') fail(CODES.INVALID_ARGUMENT, 'key must be an AES-GCM CryptoKey');
      var saltBytes = toSaltBytes(salt);
      var rounds = requireIter(iter);
      var bound = KEY_PARAMS.get(key);
      if (!bound) fail(CODES.INVALID_ARGUMENT, 'key was not derived by MCD.vault.deriveKey');
      var saltB64 = bytesToB64(saltBytes);
      if (bound.salt !== saltB64 || bound.iter !== rounds) fail(CODES.INVALID_ARGUMENT, 'salt and iter must be the ones the key was derived with');
      var json = JSON.stringify(obj);
      if (typeof json !== 'string') fail(CODES.INVALID_ARGUMENT, 'payload is not JSON-serialisable');
      var iv = randomBytes(IV_BYTES);
      var header = {
        format: FORMAT,
        v: VERSION,
        created: new Date().toISOString(),
        kdf: { alg: 'PBKDF2', hash: 'SHA-256', iter: rounds, salt: saltB64 },
        cipher: { alg: 'AES-GCM', keyBits: KEY_BITS, iv: bytesToB64(iv) }
      };
      var aad = aadFor({ v: VERSION, created: header.created, iter: rounds, saltB64: saltB64 });
      return c.subtle.encrypt(
        { name: 'AES-GCM', iv: iv, additionalData: aad, tagLength: TAG_BYTES * 8 },
        key,
        utf8(json)
      ).then(function (ctBuf) {
        header.ct = bytesToB64(new Uint8Array(ctBuf));
        return header;
      });
    });
  }

  /**
   * Derive a key from a password (fresh random salt) and encrypt.
   * @param {*} obj JSON-serialisable payload
   * @param {string} password
   * @param {{iter?: number}} [opts]
   * @returns {Promise<object>} vault v2
   */
  function encryptPayload(obj, password, opts) {
    return Promise.resolve().then(function () {
      requireCrypto();
      var rounds = requireIter(opts && opts.iter !== undefined ? opts.iter : DEFAULT_ITER);
      var salt = randomBytes(SALT_BYTES);
      return deriveKey(password, salt, rounds).then(function (key) {
        return encryptWithKey(obj, key, salt, rounds);
      });
    });
  }

  function openWithKey(params, key) {
    var c = requireCrypto();
    return c.subtle.decrypt(
      { name: 'AES-GCM', iv: params.iv, additionalData: aadFor(params), tagLength: TAG_BYTES * 8 },
      key,
      params.ct
    ).then(function (ptBuf) {
      var text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(ptBuf); } catch (e) { fail(CODES.UNSUPPORTED_FORMAT, 'payload is not UTF-8'); }
      try { return JSON.parse(text); } catch (e2) { return fail(CODES.UNSUPPORTED_FORMAT, 'payload is not JSON'); }
    }, function () {
      // OperationError: GCM tag mismatch (wrong key, or any modified byte / parameter).
      fail(CODES.BAD_PASSWORD_OR_TAMPERED);
    });
  }

  /**
   * Decrypt a vault with a password.
   * @returns {Promise<{payload:*, key:CryptoKey, salt:Uint8Array, iter:number}>}
   * @throws VaultError BAD_PASSWORD_OR_TAMPERED | UNSUPPORTED_FORMAT | NO_WEBCRYPTO
   */
  function decryptVault(vault, password) {
    return Promise.resolve().then(function () {
      requireCrypto();
      if (typeof password !== 'string') fail(CODES.INVALID_ARGUMENT, 'password must be a string');
      var params = validate(vault);
      return deriveKey(password, params.salt, params.iter).then(function (key) {
        return openWithKey(params, key).then(function (payload) {
          return { payload: payload, key: key, salt: params.salt, iter: params.iter };
        });
      });
    });
  }

  /**
   * Decrypt a vault with an already-derived key (e.g. to verify a re-saved vault).
   * @returns {Promise<*>} payload
   */
  function decryptWithKey(vault, key) {
    return Promise.resolve().then(function () {
      requireCrypto();
      var params = validate(vault);
      return openWithKey(params, key);
    });
  }

  /**
   * Serialise a vault as a classic-script data file: 'window.MCD_VAULT = {...};\n'.
   * Output is pure JSON on the right-hand side (no code), with "<" and line
   * separators escaped so it is also safe to inline inside a <script> element.
   */
  function toScript(vault) {
    validate(vault);
    var json = JSON.stringify(vault, null, 2)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    return SCRIPT_MARKER + ' ' + json + ';\n';
  }

  /**
   * Parse the text of a data/vault.js file produced by toScript (optionally
   * preceded by comments and whitespace) back into a vault object WITHOUT
   * executing it. The assignment must be the first statement after the
   * leading comments, so text inside a header comment can never be mistaken
   * for it, and nothing but whitespace may follow the closing ";".
   */
  function parseScript(text) {
    var U = CODES.UNSUPPORTED_FORMAT;
    if (typeof text !== 'string') fail(U, 'not text');
    var i = 0, n = text.length;
    if (text.charCodeAt(0) === 0xFEFF) i = 1;
    for (;;) {
      while (i < n && /\s/.test(text[i])) i++;
      if (text.startsWith('/*', i)) {
        var close = text.indexOf('*/', i + 2);
        if (close < 0) fail(U, 'unterminated comment');
        i = close + 2;
      } else if (text.startsWith('//', i)) {
        var nl = text.indexOf('\n', i);
        i = nl < 0 ? n : nl + 1;
      } else {
        break;
      }
    }
    if (!text.startsWith(SCRIPT_MARKER, i)) fail(U, 'no window.MCD_VAULT assignment');
    var end = text.lastIndexOf(';');
    if (end < i || /\S/.test(text.slice(end + 1))) fail(U, 'no window.MCD_VAULT assignment');
    var obj;
    try { obj = JSON.parse(text.slice(i + SCRIPT_MARKER.length, end)); } catch (e) { fail(U, 'assignment is not JSON'); }
    validate(obj);
    return obj;
  }

  return Object.freeze({
    FORMAT: FORMAT,
    VERSION: VERSION,
    READ_VERSIONS: Object.freeze(READ_VERSIONS.slice()),
    DEFAULT_ITER: DEFAULT_ITER,
    MIN_ITER: MIN_ITER,
    MAX_ITER: MAX_ITER,
    CODES: CODES,
    VaultError: VaultError,
    hasWebCrypto: hasWebCrypto,
    isIsoTimestamp: isIsoTimestamp,
    validate: validate,
    deriveKey: deriveKey,
    encryptPayload: encryptPayload,
    encryptWithKey: encryptWithKey,
    decryptVault: decryptVault,
    decryptWithKey: decryptWithKey,
    toScript: toScript,
    parseScript: parseScript,
    // exposed for tests / tooling
    _b64: { encode: bytesToB64, decode: function (s) { return b64ToBytes(s, 'value'); } }
  });
});
