/* ==========================================================================
 * MCD.importer: CSV / XLSX import, column mapping, validation report and the
 * offline geocoder (BUILD_SPEC §F.5–F.6). Every file is read in this browser;
 * nothing is uploaded and no geocoder or other service is ever called (§K.1).
 *
 * Dataset types (branch scope of 15 Oct 2026, docs/COPY_STYLE_EN.md item 14):
 *   lvm      Livin' Merchant stores (template sheet 1_lvm, or the monthly "Rev LVM" report as it is)
 *   edc      EDC Mandiri terminals (template sheet 2_edc)
 *   sekolah  SMA customers and prospects (template sheet 3_sekolah)
 *   situs    extra map sites (manual)
 * Sections may register more types, or a fuller parser for one of these, with registerSchema().
 * Owner personal data in merchant files (names, phones, e-mail, accounts, CIF) is dropped at
 * parse time by the schema deny lists and never stored.
 *
 *   MCD.importer.read(file)                     → Promise<Sheet[]>  (CSV via Papa Parse, XLSX via lazy SheetJS)
 *   MCD.importer.readText(text, name)           → Sheet[]           (CSV text; tests, paste)
 *   MCD.importer.ensureXlsx()                   → Promise<XLSX>     (pinned 0.18.5 + SRI, mirror fallback)
 *   MCD.importer.detect(sheet)                  → {type, score, mapping, candidates, tie}
 *   MCD.importer.mapHeaders(headers, type)      → {mapping, unmatched, dropped, monthly}
 *   MCD.importer.parse(sheet, type, mapping?, opts?)       → {records, report}
 *   MCD.importer.parseAsync(sheet, type, mapping?, opts?)  → Promise<{records, report}> (yields every 5,000 rows)
 *   MCD.importer.apply(type, records, meta)     → MCD.data.replace(...)  ("Use this data")
 *   MCD.importer.applyDataset(key, records, meta)  vault path (gate addendum §4): same as a file import
 *   MCD.importer.exportImportedDatasets()       → {lvm, edc, sekolah, sites} imported/vault datasets, runtime fields stripped
 *   MCD.importer.registerSchema(type, schema)   sections add dataset types
 *   MCD.importer.schemas() · reasons · reportCsv(report) · templateCsv(type) · geocode(rec, opts) · parse.* · reset()
 *   V8 (docs/V8_SPEC.md §3.2, §3.3, D45): a schema may carry via ('funding': read only through the one import row
 *   "Funding merchant (cabang)", never offered alone) and vaultOnly (the vault path only); registerSchema keeps both and
 *   schemas() lists them, so Data & Privasi leaves such types out of its generic type list.
 *   lookupSchema(type) → {type, label, dataKey, via, vaultOnly} | null (no throw for an unknown type)
 *
 * Sheet = {name, file, kind:'csv'|'xlsx', headers[], rows[][], rowNos[]}; rowNos are the
 * 1-based spreadsheet row numbers (header = row 1 for a plain CSV).
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = typeof window !== 'undefined' ? window : {};
  var DAY = 86400000;
  var CHUNK = 5000;
  var MAX_ISSUES = 5000;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function U() { return MCD.util; }
  function REF() { return MCD.ref; }
  function CFG() { return MCD.config; }
  function empty(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function lower(v) { return str(v).toLowerCase(); }

  /* ======================================================= header handling */

  /** §F.5 header normalisation: lowercase, strip diacritics, non-alphanumerics → '_', trim '_'. */
  function normHeader(h) {
    var s = String(h == null ? '' : h).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  // §F.5 sensitive deny-list (+ obvious spelling variants). Dropped at parse time, never stored.
  var DENY = ['nik', 'no_ktp', 'ktp', 'no_kk', 'no_hp', 'hp', 'telepon', 'phone', 'email', 'nama_ibu', 'ibu_kandung', 'npwp', 'password', 'pin'];
  var DENY_RE = [/^(no|nomor)_(ktp|kk|hp|handphone|telp|telepon|wa|whatsapp|npwp|nik)$/, /^(nik|nik_ktp|no_nik)$/, /^(e_?mail|alamat_email|email_address)$/,
    /^nama_ibu(_kandung)?$/, /^(telp|telepon|handphone|phone_number|mobile|mobile_phone|whatsapp|wa)$/, /^(kata_sandi|password|pin)$/];
  function denied(norm, extra) {
    if (DENY.indexOf(norm) >= 0 || (extra && extra.indexOf(norm) >= 0)) return true;
    for (var i = 0; i < DENY_RE.length; i++) if (DENY_RE[i].test(norm)) return true;
    return false;
  }

  /* ============================================================ value parsing */

  var MULT = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6, m: 1e9, miliar: 1e9, milyar: 1e9, mlyr: 1e9, t: 1e12, triliun: 1e12, bn: 1e9, mn: 1e6 };

  /** Rupiah: 'Rp 312.000.000', '312jt', '1,2M', '1.2 M', 312000000 → integer Rp; negatives → {neg:true}. */
  function parseRp(v) {
    if (v == null || v === '') return null;
    if (isNum(v)) return v < 0 ? { neg: true, value: v } : Math.round(v);
    var s = str(v).toLowerCase().replace(/ /g, ' ');
    if (!s || s === '-' || s === '—') return null;
    var neg = /^\(.*\)$/.test(s) || /^-|^−/.test(s.replace(/^rp\.?\s*/, ''));
    s = s.replace(/[()]/g, '').replace(/^rp\.?\s*/, '').replace(/^[-−]\s*/, '').replace(/rp\.?/g, '').trim();
    var m = /^([\d.,\s]+?)\s*([a-z]+)?\.?$/.exec(s);
    if (!m) return undefined;
    var num = m[1].replace(/\s+/g, ''), unit = m[2] || '', mult = 1;
    if (unit) { if (!has(MULT, unit)) return undefined; mult = MULT[unit]; }
    var x = numberLocale(num, !!unit);
    if (x == null) return undefined;
    x *= mult;
    return neg ? { neg: true, value: -x } : Math.round(x);
  }
  /** Indonesian-first number: '.' thousands and ',' decimal; English thousands only when unambiguous. */
  function numberLocale(s, hasUnit) {
    if (!s) return null;
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
    if (dots && commas) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,5
      else s = s.replace(/,/g, '');                                                               // 1,234.5
    } else if (commas) {
      if (commas > 1) s = s.replace(/,/g, '');                                                    // 1,234,567
      else s = s.replace(',', '.');                                                               // ',' is decimal (§F.5)
    } else if (dots) {
      if (dots > 1 || (/^\d{1,3}\.\d{3}$/.test(s) && !hasUnit)) s = s.replace(/\./g, '');          // 312.000.000 · 1.500
      // else a single '.' with ≠ 3 decimals (or with a unit) is a decimal point: '1.2 M', '1234.56'
    }
    var x = Number(s);
    return isFinite(x) ? x : null;
  }
  function parseNum(v) {
    if (v == null || v === '') return null;
    if (isNum(v)) return v;
    var s = str(v).replace(/\s+/g, '');
    if (!s) return null;
    return numberLocale(s.replace(/^[-−]/, '-'), false);
  }
  function parseInt2(v) { var x = parseNum(v); return x == null ? null : Math.round(x); }
  /** Percent: '8,25' · '8.25%' · 0.0825 → 0.0825 (values > 1 are percent). */
  function parsePct(v) {
    if (v == null || v === '') return null;
    var x = isNum(v) ? v : parseNum(str(v).replace('%', ''));
    if (x == null || !isFinite(x)) return undefined;
    return x > 1 ? x / 100 : x;
  }
  /** Date → 'YYYY-MM-DD' | null (empty) | undefined (invalid). Never assumes MM/DD. */
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (v && typeof v.getTime === 'function') {
      if (isNaN(v.getTime())) return undefined;
      // SheetJS cellDates gives local-midnight dates: take the local calendar day.
      var t = v.getTime() - v.getTimezoneOffset() * 60000;
      return new Date(Math.round(t / DAY) * DAY).toISOString().slice(0, 10);
    }
    var d = U().date.parse(isNum(v) ? v : str(v));
    return d ? U().date.ymd(d) : undefined;
  }
  var TRUE_RE = /^(y|ya|yes|1|true|benar|aktif|active|✓|✔|v|ok)$/i, FALSE_RE = /^(n|no|tidak|tdk|t|0|false|salah|nonaktif|non aktif|tidak aktif|inactive|✗|✘|-)$/i;
  function parseBool(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'boolean') return v;
    if (isNum(v)) return v !== 0;
    var s = str(v);
    if (TRUE_RE.test(s)) return true;
    if (FALSE_RE.test(s)) return false;
    return undefined;
  }
  function parseMatra(v) {
    var s = ' ' + lower(v) + ' ';
    if (!s.trim()) return null;
    if (/\bal\b|laut|navy|tnial|marinir|kormar/.test(s)) return 'AL';
    if (/\bau\b|udara|air ?force|tniau/.test(s)) return 'AU';
    if (/\bad\b|darat|army|tniad/.test(s)) return 'AD';
    if (/pns|asn|sipil|p3k|pppk/.test(s)) return 'PNS';
    if (/\btni\b|gabungan|mabes tni/.test(s)) return 'TNI';
    if (/umum|sipil|swasta/.test(s)) return 'UMUM';
    return undefined;
  }
  var BANKS = [[/mandiri|mdr|bmri/, 'MANDIRI'], [/bsi|syariah indonesia/, 'BSI'], [/bni/, 'BNI'], [/bri\b|rakyat/, 'BRI'], [/btn|tabungan negara/, 'BTN'],
    [/bjb|jabar/, 'BJB'], [/koperasi|primkop|puskop|inkop|kop\b/, 'KOPERASI']];
  function parseBank(v, allowKop) {
    var s = lower(v);
    if (!s) return null;
    for (var i = 0; i < BANKS.length; i++) {
      if (BANKS[i][0].test(s)) return BANKS[i][1] === 'KOPERASI' && !allowKop ? 'OTHER' : BANKS[i][1];
    }
    return allowKop ? 'LAINNYA' : 'OTHER';
  }
  /** One coordinate number with comma or point decimals. */
  function parseCoordNum(v) {
    if (v == null || v === '') return null;
    if (isNum(v)) return v;
    var s = str(v).replace(/\s+/g, '').replace('−', '-');
    if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
    var x = Number(s);
    return isFinite(x) ? x : undefined;
  }
  /** 'lat, lon' (also '-6,33203; 106,90989') → [lat, lon] | undefined. */
  function parseKoordinat(v) {
    var s = str(v);
    if (!s) return null;
    var parts = s.indexOf(';') >= 0 ? s.split(';') : null;
    if (!parts) {
      var m = s.match(/[-−]?\d+(?:[.,]\d+)?/g);
      parts = m && m.length === 2 ? m : null;
    }
    if (!parts || parts.length !== 2) return undefined;
    var a = parseCoordNum(parts[0]), b = parseCoordNum(parts[1]);
    return isNum(a) && isNum(b) ? [a, b] : undefined;
  }
  function normKey(s) {
    var t = lower(s);
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t.replace(/[^a-z0-9]+/g, '');
  }
  function parsePeriod(v) {
    if (v == null || v === '') return null;
    if (v && typeof v.getTime === 'function') { var d0 = parseDate(v); return d0 ? d0.slice(0, 7) : undefined; }
    var s = str(v), m;
    if ((m = /^(\d{4})[-\/.](\d{1,2})$/.exec(s))) return valid(+m[1], +m[2]);
    if ((m = /^(\d{1,2})[-\/.](\d{4})$/.exec(s))) return valid(+m[2], +m[1]);
    if ((m = /^(\d{4})(\d{2})$/.exec(s))) return valid(+m[1], +m[2]);
    var d = U().date.parse('1 ' + s);
    if (d) return U().date.ym(d);
    d = U().date.parse(s);
    return d ? U().date.ym(d) : undefined;
    function valid(y, mo) { return mo >= 1 && mo <= 12 && y >= 1990 && y <= 2100 ? y + '-' + (mo < 10 ? '0' : '') + mo : undefined; }
  }

  /** Merchant / terminal status: 'aktif', 'ACTIVE', 'USAK' → 'active'; 'nonaktif', 'INACTIVE' → 'inactive'. */
  var ACTIVE_RE = /^(aktif|active|usak|usak ideal|y|ya|yes|1|true|on|beroperasi|operasional)$/i;
  var INACTIVE_RE = /^(nonaktif|non aktif|non-aktif|tidak aktif|inactive|not active|nonusak|ureg = 0|n|no|tidak|0|false|off|tutup|closed|dicabut)$/i;
  function parseStatus(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'boolean') return v ? 'active' : 'inactive';
    var s2 = str(v);
    if (ACTIVE_RE.test(s2)) return 'active';
    if (INACTIVE_RE.test(s2)) return 'inactive';
    return undefined;
  }
  /** Indonesian postcode: 5 digits ('13870', 13870, '13870.0') → '13870'. */
  function parsePostcode(v) {
    if (v == null || v === '') return null;
    var d = str(isNum(v) ? Math.round(v) : v).replace(/\.0+$/, '').replace(/\D/g, '');
    return /^\d{5}$/.test(d) ? d : undefined;
  }

  var parse = {
    header: normHeader, rp: parseRp, num: parseNum, int: parseInt2, pct: parsePct, date: parseDate, bool: parseBool,
    matra: parseMatra, bank: parseBank, status: parseStatus, postcode: parsePostcode,
    coord: parseCoordNum, koordinat: parseKoordinat, period: parsePeriod, key: normKey
  };

  /* ======================================================== reason codes (§F.6) */

  var REASONS = {
    REQUIRED_MISSING: 'Kolom wajib kosong',
    MERCHANT_KEY_MISSING: 'MID, ID toko dan nama merchant kosong',
    NEG_VALUE: 'Nilai negatif',
    VALUE_INVALID: 'Nilai tidak terbaca',
    DATE_INVALID: 'Tanggal tidak terbaca',
    DATE_FUTURE: 'Tanggal lebih baru daripada tanggal data',
    DUP_ACCOUNT: 'ID ganda di file ini. Hanya baris pertama yang disimpan.',
    STATUS_UNKNOWN: 'Status tidak dikenali, dikosongkan',
    POSTCODE_INVALID: 'Kode pos tidak 5 angka, dikosongkan',
    GEO_NONE: 'Lokasi kosong: tampil di tabel, tidak di peta',
    COORD_OUT_OF_RANGE: 'Koordinat di luar Jabodetabek. Tidak dihitung dalam filter jarak di atas 20 km.',
    COORD_SWAPPED_FIXED: 'Lintang dan bujur tertukar, telah diperbaiki',
    KELURAHAN_AMBIGUOUS: 'Nama kelurahan ganda, dipilih yang terdekat dengan cabang',
    KELURAHAN_NOT_FOUND: 'Kelurahan tidak ditemukan di daftar wilayah',
    SCHOOL_ID_MISSING: 'NPSN dan nama sekolah kosong',
    NOT_SMA: 'Jenjang selain SMA: disimpan, tetapi tidak tampil di bagian Sekolah'
  };


  /* ======================================================== report helpers */

  function newReport(type, sheet, schema) {
    return {
      type: type, label: schema.label, file: sheet.file || null, sheet: sheet.name || null,
      totalRows: sheet.rows.length, accepted: 0, rejected: 0, warnings: 0, infos: 0,
      records: 0,
      geo: { EXACT: 0, KELURAHAN_APPROX: 0, SATKER_APPROX: 0, NONE: 0 },
      dropped: [], unmatched: [], issues: [], codes: {}, truncated: false, asOf: null, notes: []
    };
  }
  function maskValue(v) {
    var s = str(v);
    if (!s) return '';
    return s.charAt(0) + '•••';
  }
  function makeIssue(report, schema, rejectedRows) {
    return function issue(rowNo, col, value, code, level) {
      level = level || 'warn';
      report.codes[code] = (report.codes[code] || 0) + 1;
      if (level === 'error') rejectedRows[rowNo] = true;
      else if (level === 'warn') report.warnings++;
      else report.infos++;
      if (report.issues.length >= MAX_ISSUES) { report.truncated = true; return; }
      var c = col ? schema.colByKey[col] : null, personal = c ? !!c.personal : false;
      var v = value == null ? '' : (personal ? maskValue(value) : str(value).slice(0, 60));
      report.issues.push({ row: rowNo, col: col || null, value: v, code: code, level: level, reason: REASONS[code] || code });
    };
  }

  /* ================================================================ geocoder */

  function branch() { var b = CFG() && CFG().branch; return b ? { lat: b.lat, lon: b.lon } : { lat: -6.33203, lon: 106.90989 }; }
  function jitter(lat, lon, key, radiusM) {
    if (!(radiusM > 0)) return [lat, lon];
    var R = U().prng(U().fnv1a(String(key)) || 1), d = R.disk(radiusM);
    var ll = U().geo.fromLocalXY(d[0], d[1], { lat: lat, lon: lon });
    return [Math.round(ll[1] * 1e6) / 1e6, Math.round(ll[0] * 1e6) / 1e6];
  }
  function findKel(name, kota) {
    var ref = REF(), hit = ref.findKelurahan(name, kota);
    if (hit) return { hit: hit, ambiguous: false };
    var list = ref.kelurahanByName[ref.normPlace(name)];
    if (list && list.length > 1 && (!kota || !ref.normPlace(kota))) {
      var b = branch(), best = null, bd = Infinity;
      list.forEach(function (k) { var d = U().geo.haversineKm(b.lat, b.lon, k.lat, k.lon); if (d < bd) { bd = d; best = k; } });
      return { hit: best, ambiguous: true };
    }
    if (list && list.length > 1) {
      var nk = ref.normPlace(kota), alt = list.filter(function (k) { return ref.normPlace(k.kota).indexOf(nk) >= 0 || nk.indexOf(ref.normPlace(k.kota)) >= 0; });
      if (alt.length === 1) return { hit: alt[0], ambiguous: false };
    }
    return { hit: null, ambiguous: false };
  }

  /**
   * §F.6 geo resolution: coordinates → kelurahan centroid ± jitter → NONE.
   * rec: {lat, lon, koordinat, kelurahan, kota}; opts: {key, jitter:true}.
   * → {lat, lon, geoPrecision, approximate, outOfRange, codes:[…], kelurahan, kecamatan, kota}
   */
  function geocode(rec, opts) {
    opts = opts || {};
    var cfg = CFG(), codes = [], out = { lat: null, lon: null, geoPrecision: 'NONE', approximate: false, outOfRange: false, codes: codes,
      kelurahan: rec.kelurahan || null, kecamatan: rec.kecamatan || null, kota: rec.kota || null };
    var lat = rec.lat, lon = rec.lon;
    if ((!isNum(lat) || !isNum(lon)) && rec.koordinat) { var kk = parseKoordinat(rec.koordinat); if (kk) { lat = kk[0]; lon = kk[1]; } }
    if (isNum(lat) && isNum(lon)) {
      if (lat >= 100 && lat <= 110 && lon >= -8 && lon <= -5) { var t = lat; lat = lon; lon = t; codes.push('COORD_SWAPPED_FIXED'); }
      if (!(lat >= -6.75 && lat <= -5.95 && lon >= 106.45 && lon <= 107.25)) { codes.push('COORD_OUT_OF_RANGE'); out.outOfRange = true; }
      out.lat = lat; out.lon = lon; out.geoPrecision = 'EXACT';
      return out;
    }
    if (!empty(rec.kelurahan)) {
      var f = findKel(rec.kelurahan, rec.kota);
      if (f.hit) {
        if (f.ambiguous) codes.push('KELURAHAN_AMBIGUOUS');
        var jm = opts.jitter === false ? 0 : ((cfg.geocode && cfg.geocode.kelurahanJitterM) || 350);
        var p = jitter(f.hit.lat, f.hit.lon, opts.key || rec.kelurahan, jm);
        out.lat = p[0]; out.lon = p[1]; out.geoPrecision = 'KELURAHAN_APPROX'; out.approximate = true;
        out.kelurahan = f.hit.name; out.kecamatan = f.hit.kecamatan; out.kota = f.hit.kota; out.lowPrecision = f.hit.lowPrecision;
        return out;
      }
      codes.push('KELURAHAN_NOT_FOUND');
    }
    return out;
  }

  /* ===================================================== SHA-256 / HMAC (§10.4) */

  var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70,
    0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(s));
    var out = [], e = unescape(encodeURIComponent(s));
    for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }
  function sha256(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length, msg = bytes.slice();
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    var bits = l * 8;
    for (var s = 7; s >= 0; s--) msg.push(s >= 4 ? Math.floor(bits / Math.pow(2, 8 * s)) & 0xff : (bits >>> (8 * s)) & 0xff);
    var w = new Array(64);
    for (var o = 0; o < msg.length; o += 64) {
      for (var i = 0; i < 16; i++) w[i] = (msg[o + 4 * i] << 24) | (msg[o + 4 * i + 1] << 16) | (msg[o + 4 * i + 2] << 8) | msg[o + 4 * i + 3];
      for (i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var t1 = (h + S1 + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = [];
    H.forEach(function (v) { out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff); });
    return out;
  }
  function hmacSha256(keyBytes, msgBytes) {
    var k = keyBytes.length > 64 ? sha256(keyBytes) : keyBytes.slice();
    while (k.length < 64) k.push(0);
    var ip = k.map(function (b) { return b ^ 0x36; }), op = k.map(function (b) { return b ^ 0x5c; });
    return sha256(op.concat(sha256(ip.concat(msgBytes))));
  }
  function hex(bytes) { return bytes.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }

  /* ========================================================= schema registry */

  var SCHEMAS = {}, ORDER = [];

  /**
   * registerSchema(type, {label, dataKey, columns:[{key, type, req, syn[], personal}], required[],
   *   detect(matchedKeys, normalisedHeaders) → number|false, deny[], monthly:{canonicalKey: prefix},
   *   daily:{canonicalKey: prefix} (columns named <prefix>YYYY-MM-DD, or a date cell as header), build(rows, ctx) → records})
   * req: true (✓ required) · 'any:<group>' (at least one per group) · false.
   */
  function registerSchema(type, schema) {
    if (!type || !schema || !Array.isArray(schema.columns)) throw new Error('MCD.importer.registerSchema: invalid schema');
    var s = {
      type: type, label: schema.label || type, dataKey: schema.dataKey || type, columns: schema.columns.map(function (c) {
        return { key: c.key, type: c.type || 'string', req: c.req || false, syn: c.syn || [], personal: !!c.personal, note: c.note || null };
      }),
      detect: schema.detect || null, deny: (schema.deny || []).map(normHeader), monthly: schema.monthly || {}, daily: schema.daily || {},
      build: schema.build, minScore: schema.minScore || 1, description: schema.description || null,
      /* V8 D45 (docs/V8_SPEC.md §3.2, §3.3): via 'funding' = read only through the one import row "Funding merchant
         (cabang)" of Data & Privasi, never offered on its own; vaultOnly = the vault path only, never a file */
      via: schema.via ? String(schema.via) : null, vaultOnly: schema.vaultOnly === true
    };
    s.colByKey = {};
    s.lookup = {};
    s.columns.forEach(function (c) {
      s.colByKey[c.key] = c;
      [c.key].concat(c.syn).forEach(function (n) { var k = normHeader(n); if (!has(s.lookup, k)) s.lookup[k] = c.key; });
    });
    s.required = s.columns.filter(function (c) { return c.req === true; }).map(function (c) { return c.key; });
    s.anyGroups = {};
    s.columns.forEach(function (c) {
      if (typeof c.req === 'string' && c.req.indexOf('any:') === 0) (s.anyGroups[c.req.slice(4)] = s.anyGroups[c.req.slice(4)] || []).push(c.key);
    });
    SCHEMAS[type] = s;
    if (ORDER.indexOf(type) < 0) ORDER.push(type);
    return s;
  }
  function schemaOf(type) {
    var s = SCHEMAS[type];
    if (!s) throw new Error('MCD.importer: unknown dataset type: ' + type);
    return s;
  }

  /** An Excel date serial of 2010–2059 (40179 … 58439) → 'YYYY-MM-DD', else null (a count or a code is not a date). */
  function serialYmd(n) {
    if (!isNum(n) || n < 40179 || n > 58439 || Math.round(n) !== n) return null;
    return new Date((n - 25569) * DAY).toISOString().slice(0, 10);
  }

  /** Header row → {mapping:{canonical: colIndex}, unmatched:[names], dropped:[names], monthly:{canonical:{ 'YYYY-MM': colIndex }},
      daily:{canonical:{ 'YYYY-MM-DD': colIndex }}}. */
  function mapHeaders(headers, type) {
    var s = schemaOf(type), mapping = {}, unmatched = [], dropped = [], monthly = {}, daily = {};
    (headers || []).forEach(function (h, i) {
      var raw = str(h), n = normHeader(raw);
      if (!n) return;
      if (denied(n, s.deny)) { dropped.push(raw); return; }
      var hitMonth = false;
      Object.keys(s.monthly).forEach(function (canon) {
        var re = new RegExp('^' + s.monthly[canon] + '_?(\\d{4})_?(\\d{2})$'), m = re.exec(n);
        if (m && +m[2] >= 1 && +m[2] <= 12) { (monthly[canon] = monthly[canon] || {})[m[1] + '-' + m[2]] = i; hitMonth = true; }
      });
      if (hitMonth) return;
      var hitDay = false;
      Object.keys(s.daily).forEach(function (canon) {
        var re = new RegExp('^' + s.daily[canon] + '_?(\\d{4})_(\\d{2})_(\\d{2})$'), m = re.exec(n), ymd = null;
        if (m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) ymd = m[1] + '-' + m[2] + '-' + m[3];
        /* merge 23 Oct 2026: a date cell read without its date format arrives as its Excel serial ("46313", as the
           branch's balance reports and tests/fixtures/funding-synthetic.json carry it); only for an empty prefix */
        else if (!s.daily[canon] && /^\d{5}$/.test(n)) ymd = serialYmd(+n);
        if (ymd) { (daily[canon] = daily[canon] || {})[ymd] = i; hitDay = true; }
      });
      if (hitDay) return;
      var k = s.lookup[n];
      if (k && !has(mapping, k)) mapping[k] = i;
      else unmatched.push(raw);
    });
    return { mapping: mapping, unmatched: unmatched, dropped: dropped, monthly: monthly, daily: daily };
  }

  /** Scores a sheet against every registered schema (§F.5 auto-detection + AM-6 §3.4.3). */
  function detect(sheet) {
    var heads = (sheet.headers || []).map(normHeader);
    var cands = ORDER.map(function (type) {
      var s = SCHEMAS[type], m = mapHeaders(sheet.headers, type), keys = Object.keys(m.mapping);
      var score = keys.length + Object.keys(m.monthly).length + Object.keys(m.daily).length;
      var missing = s.required.filter(function (k) { return keys.indexOf(k) < 0; });
      var groups = Object.keys(s.anyGroups).filter(function (g) { return !s.anyGroups[g].some(function (k) { return keys.indexOf(k) >= 0; }); });
      var ok = !missing.length && score >= s.minScore;
      if (s.detect) {
        var d = s.detect(keys, heads, m);
        if (d === false) ok = false;
        else if (isNum(d)) score += d;
      }
      return { type: type, label: s.label, score: score, ok: ok, missing: missing, missingGroups: groups, mapping: m.mapping, monthly: m.monthly, unmatched: m.unmatched, dropped: m.dropped };
    });
    cands.sort(function (a, b) { return (b.ok - a.ok) || (b.score - a.score) || (ORDER.indexOf(a.type) - ORDER.indexOf(b.type)); });
    var best = cands[0] && cands[0].ok ? cands[0] : null;
    var tie = !!(best && cands[1] && cands[1].ok && cands[1].score === best.score);
    return { type: best ? best.type : null, score: best ? best.score : 0, mapping: best ? best.mapping : {}, monthly: best ? best.monthly : {},
      tie: tie, ties: tie ? cands.filter(function (c) { return c.ok && c.score === best.score; }).map(function (c) { return c.type; }) : [],
      candidates: cands };
  }

  /* ============================================================ reading files */

  function trimRows(rows) {
    var out = [], nos = [], header = null, headerNo = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || [], blank = true;
      for (var j = 0; j < r.length; j++) if (!empty(r[j])) { blank = false; break; }
      if (blank) continue;
      if (!header) { header = r.map(function (x) { return x && typeof x.getTime === 'function' ? (parseDate(x) || str(x)) : str(x); }); headerNo = i + 1; continue; }
      out.push(r); nos.push(i + 1);
    }
    return { headers: header || [], rows: out, rowNos: nos, headerRow: headerNo };
  }

  /** Minimal RFC 4180 parser with delimiter detection (',' ';' tab) for when Papa Parse is absent. */
  function csvToRows(text) {
    text = String(text || '').replace(/^﻿/, '');
    var firstLine = text.slice(0, Math.min(text.length, 4000)).split(/\r?\n/)[0] || '';
    var cand = [',', ';', '\t'], delim = ',', best = -1;
    cand.forEach(function (d) { var n = firstLine.split(d).length; if (n > best) { best = n; delim = d; } });
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  /** CSV text → [Sheet]. Uses Papa Parse when loaded, else the built-in parser. */
  function readText(text, name) {
    var rows;
    if (W.Papa && W.Papa.parse) rows = W.Papa.parse(String(text || '').replace(/^﻿/, ''), { skipEmptyLines: false }).data;
    else rows = csvToRows(text);
    var t = trimRows(rows);
    return [{ name: name || 'CSV', file: name || null, kind: 'csv', headers: t.headers, rows: t.rows, rowNos: t.rowNos, headerRow: t.headerRow }];
  }

  var xlsxPromise = null;
  function loadScript(url, integrity, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var doc = W.document;
      if (!doc) { reject(new Error('No document to load SheetJS into')); return; }
      var s = doc.createElement('script'), done = false;
      var timer = setTimeout(function () { if (!done) { done = true; reject(new Error('Loading timed out: ' + url)); } }, timeoutMs || 8000);
      s.src = url;
      if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.referrerPolicy = 'no-referrer';
      s.addEventListener('load', function () { if (done) return; done = true; clearTimeout(timer); resolve(); });
      s.addEventListener('error', function () { if (done) return; done = true; clearTimeout(timer); reject(new Error('Could not load ' + url)); });
      doc.head.appendChild(s);
    });
  }
  /** Lazy SheetJS 0.18.5 with SRI (§J.3), mirror on failure. Cached promise. */
  function ensureXlsx() {
    if (W.XLSX && W.XLSX.read) return Promise.resolve(W.XLSX);
    if (xlsxPromise) return xlsxPromise;
    var c = (CFG() && CFG().cdn && CFG().cdn.xlsx) || {}, t = (CFG() && CFG().cdn && CFG().cdn.loadTimeoutMs) || 8000;
    xlsxPromise = loadScript(c.primary, c.integrity, t)
      .catch(function () { return loadScript(c.mirror, c.integrity, t); })
      .then(function () {
        if (!W.XLSX) throw new Error('Pembaca file Excel tidak dapat dimuat. Periksa internet, lalu coba lagi.');
        return W.XLSX;
      })
      .catch(function (e) { xlsxPromise = null; throw e; });
    return xlsxPromise;
  }

  function readArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      if (file && typeof file.arrayBuffer === 'function') { file.arrayBuffer().then(resolve, reject); return; }
      var fr = new W.FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('File tidak dapat dibaca. Pastikan formatnya CSV atau XLSX.')); };
      fr.readAsArrayBuffer(file);
    });
  }
  function readTextFile(file) {
    return new Promise(function (resolve, reject) {
      if (file && typeof file.text === 'function') { file.text().then(resolve, reject); return; }
      var fr = new W.FileReader();
      fr.onload = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { reject(fr.error || new Error('File tidak dapat dibaca. Pastikan formatnya CSV atau XLSX.')); };
      fr.readAsText(file, 'utf-8');
    });
  }

  /** read(file) → Promise<Sheet[]>. CSV streams through Papa Parse in 5.000-row chunks (never worker mode). */
  function read(file, opts) {
    opts = opts || {};
    var name = (file && file.name) || 'file';
    var isX = /\.(xlsx|xlsm|xls)$/i.test(name) || /spreadsheetml|ms-excel/.test((file && file.type) || '');
    if (isX) {
      return ensureXlsx().then(function (X) { return readArrayBuffer(file).then(function (buf) {
        var wb = X.read(buf, { type: 'array', cellDates: true, dense: true });
        return wb.SheetNames.map(function (sn) {
          var ws = wb.Sheets[sn];
          var rows = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
          var start = 0;
          try { start = ws['!ref'] ? X.utils.decode_range(ws['!ref']).s.r : 0; } catch (e) { start = 0; }
          var t = trimRows(rows);
          return { name: sn, file: name, kind: 'xlsx', headers: t.headers, rows: t.rows, rowNos: t.rowNos.map(function (r) { return r + start; }), headerRow: t.headerRow + start };
        }).filter(function (s) { return s.headers.length; });
      }); });
    }
    if (W.Papa && W.Papa.parse && file && typeof file.slice === 'function') {
      return new Promise(function (resolve, reject) {
        var all = [], seen = 0;
        W.Papa.parse(file, {
          skipEmptyLines: false, worker: false, chunkSize: 1024 * 512,
          chunk: function (res, parser) {
            for (var i = 0; i < res.data.length; i++) all.push(res.data[i]);
            seen += res.data.length;
            if (opts.onProgress) { try { opts.onProgress({ phase: 'read', rows: seen }); } catch (e) { /* ignore */ } }
            if (seen >= CHUNK) { parser.pause(); setTimeout(function () { parser.resume(); }, 0); seen = 0; }
          },
          complete: function () {
            var t = trimRows(all);
            resolve([{ name: 'CSV', file: name, kind: 'csv', headers: t.headers, rows: t.rows, rowNos: t.rowNos, headerRow: t.headerRow }]);
          },
          error: function (err) { reject(err instanceof Error ? err : new Error(String(err && err.message || err))); }
        });
      });
    }
    return readTextFile(file).then(function (text) { return readText(text, name); });
  }

  /* =============================================================== parsing */

  /** Rows → canonical objects {key: raw, _row, _months:{canon:{ym: raw}}}. */
  function canonRows(sheet, s, m, from, to) {
    var out = [], mapping = m.mapping, monthly = m.monthly || {}, daily = m.daily || {}, keys = Object.keys(mapping), mk = Object.keys(monthly), dk = Object.keys(daily);
    for (var i = from; i < to; i++) {
      var r = sheet.rows[i], o = { _row: sheet.rowNos ? sheet.rowNos[i] : i + 2 };
      for (var k = 0; k < keys.length; k++) { var v = r[mapping[keys[k]]]; o[keys[k]] = typeof v === 'string' ? v.trim() : v; }
      if (mk.length) {
        o._months = {};
        mk.forEach(function (canon) {
          var cols = monthly[canon], mm = o._months[canon] = {};
          Object.keys(cols).forEach(function (ym) { mm[ym] = r[cols[ym]]; });
        });
      }
      if (dk.length) {
        o._days = {};
        dk.forEach(function (canon) {
          var cols = daily[canon], dd = o._days[canon] = {};
          Object.keys(cols).forEach(function (ymd) { dd[ymd] = r[cols[ymd]]; });
        });
      }
      out.push(o);
    }
    return out;
  }

  function prepare(sheet, type, mapping, opts) {
    var s = schemaOf(type), auto = mapHeaders(sheet.headers, type);
    var m = { mapping: mapping || auto.mapping, monthly: auto.monthly, daily: auto.daily, unmatched: auto.unmatched, dropped: auto.dropped };
    if (mapping) {
      // A user-edited mapping: canonical → column index or header name. Denied columns stay dropped.
      var fixed = {};
      Object.keys(mapping).forEach(function (k) {
        var v = mapping[k], idx = typeof v === 'number' ? v : sheet.headers.indexOf(v);
        if (idx >= 0 && s.colByKey[k] && !denied(normHeader(sheet.headers[idx]), s.deny)) fixed[k] = idx;
      });
      m.mapping = fixed;
      var used = {};
      Object.keys(fixed).forEach(function (k) { used[fixed[k]] = 1; });
      Object.keys(m.monthly).forEach(function (c) { Object.keys(m.monthly[c]).forEach(function (ym) { used[m.monthly[c][ym]] = 1; }); });
      Object.keys(m.daily).forEach(function (c) { Object.keys(m.daily[c]).forEach(function (d) { used[m.daily[c][d]] = 1; }); });
      m.unmatched = sheet.headers.filter(function (h, i) { return !used[i] && str(h) && !denied(normHeader(h), s.deny); });
    }
    var report = newReport(type, sheet, s);
    report.dropped = m.dropped.slice();
    report.unmatched = m.unmatched.slice();
    report.mapping = m.mapping;
    return { s: s, m: m, report: report };
  }

  function finish(prep, rows, opts) {
    var s = prep.s, report = prep.report, rejectedRows = {};
    var ctx = {
      report: report, issue: makeIssue(report, s, rejectedRows), opts: opts || {}, file: report.file, sheet: report.sheet,
      asOf: (opts && opts.asOf) ? parseDate(opts.asOf) : null, mapping: prep.m.mapping, parse: parse, geocode: geocode
    };
    var missing = s.required.filter(function (k) { return !has(prep.m.mapping, k); });
    if (missing.length) {
      report.notes.push('Kolom wajib tidak ditemukan: ' + missing.join(', '));
      report.rejected = rows.length; report.accepted = 0; report.records = 0; report.fatal = true;
      return { records: [], report: report };
    }
    var records = s.build(rows, ctx) || [];
    report.rejected = Object.keys(rejectedRows).length;
    report.accepted = Math.max(0, rows.length - report.rejected);
    report.records = records.length;
    if (!report.asOf) report.asOf = ctx.asOf || null;
    lastReport = report;
    return { records: records, report: report };
  }

  /** parse(sheet, type, mapping?, opts?) → {records, report}. opts.asOf = "Tanggal posisi data". */
  function parseSheet(sheet, type, mapping, opts) {
    var prep = prepare(sheet, type, mapping, opts);
    return finish(prep, canonRows(sheet, prep.s, prep.m, 0, sheet.rows.length), opts);
  }

  /** As parse(), normalising in 5.000-row chunks with setTimeout(0) between them (§F.6 performance). */
  function parseAsync(sheet, type, mapping, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var prep;
      try { prep = prepare(sheet, type, mapping, opts); } catch (e) { reject(e); return; }
      var rows = [], i = 0, n = sheet.rows.length;
      (function step() {
        try {
          var to = Math.min(n, i + CHUNK);
          rows = rows.concat(canonRows(sheet, prep.s, prep.m, i, to));
          i = to;
          if (opts.onProgress) { try { opts.onProgress({ phase: 'parse', done: i, total: n }); } catch (e) { /* ignore */ } }
          if (i < n) { setTimeout(step, 0); return; }
          resolve(finish(prep, rows, opts));
        } catch (e) { reject(e); }
      })();
    });
  }

  /* -------------------------------------------------------- shared helpers */

  function rpField(ctx, row, key, opts) {
    var v = parseRp(row[key]);
    if (v === undefined) { ctx.issue(row._row, key, row[key], 'VALUE_INVALID', (opts && opts.level) || 'warn'); return null; }
    if (v && v.neg) { ctx.issue(row._row, key, row[key], 'NEG_VALUE', (opts && opts.negLevel) || 'error'); return { neg: true }; }
    return v;
  }
  function dateField(ctx, row, key, level) {
    var v = parseDate(row[key]);
    if (v === undefined) { ctx.issue(row._row, key, row[key], 'DATE_INVALID', level || 'warn'); return { bad: true }; }
    return v;
  }
  function geoFor(ctx, rec, row, key, opts) {
    var g = geocode({ lat: parseCoordNum(row.lat), lon: parseCoordNum(row.lon), koordinat: row.koordinat, kelurahan: row.kelurahan,
      kecamatan: row.kecamatan, kota: row.kota }, { key: key, jitter: !(opts && opts.noJitter) });
    g.codes.forEach(function (c) {
      var col = /COORD/.test(c) ? (has(ctx.mapping, 'lat') ? 'lat' : 'koordinat') : 'kelurahan';
      ctx.issue(row._row, col, null, c, 'warn');
    });
    ctx.report.geo[g.geoPrecision] = (ctx.report.geo[g.geoPrecision] || 0) + 1;
    return g;
  }
  function src(ctx, row) { return { file: ctx.file, sheet: ctx.sheet, row: row._row }; }
  function defaultAsOf(ctx, rows, key) {
    if (ctx.asOf) return ctx.asOf;
    var max = null;
    if (key) rows.forEach(function (r) { var d = parseDate(r[key]); if (d && (!max || d > max)) max = d; });
    ctx.asOf = max || U().date.ymd(U().date.today());
    return ctx.asOf;
  }

  /* ================================================================ §F.5.5 situs */

  var KIND_RE = [[/mandiri.*(atm)|atm.*mandiri/, 'mandiri_atm'], [/mandiri/, 'mandiri_branch'], [/bank|pesaing|bni|bri|bsi|btn|bjb/, 'competitor_branch'],
    [/gerbang|pintu|gate|pos/, 'gate'], [/asrama|komplek|kompleks|perumahan|rumdin|mess|mes\b/, 'military_housing'], [/rumah sakit|\brs\b|klinik/, 'hospital'],
    [/sekolah|school|tk\b|sd\b|smp|sma|smk/, 'school'], [/pasar|market/, 'market'], [/koperasi/, 'koperasi'], [/markas|mabes|satker|mako/, 'hq_unit']];
  function buildSitus(rows, ctx) {
    var out = [];
    rows.forEach(function (r, i) {
      var name = str(r.nama);
      if (!name) { ctx.issue(r._row, 'nama', null, 'REQUIRED_MISSING', 'error'); return; }
      var lat = parseCoordNum(r.lat), lon = parseCoordNum(r.lon);
      if (!isNum(lat) || !isNum(lon)) { ctx.issue(r._row, 'lat', r.lat, 'VALUE_INVALID', 'error'); return; }
      var g = geocode({ lat: lat, lon: lon });
      g.codes.forEach(function (c) { ctx.issue(r._row, 'lat', null, c, 'warn'); });
      var jenis = lower(r.jenis), kind = 'other';
      for (var k = 0; k < KIND_RE.length; k++) if (KIND_RE[k][0].test(jenis || name.toLowerCase())) { kind = KIND_RE[k][1]; break; }
      var conf = lower(r.keyakinan);
      out.push({ id: 'imp-' + U().fnv1a.hex(name + '|' + g.lat + '|' + g.lon), label: name.length > 40 ? name.slice(0, 39) + '…' : name, name: name, kind: kind,
        bank: kind === 'mandiri_branch' || kind === 'mandiri_atm' ? 'MANDIRI' : (kind === 'competitor_branch' ? parseBank(name) : null),
        lat: g.lat, lon: g.lon, confidence: /tinggi|high/.test(conf) ? 'high' : (/rendah|low/.test(conf) ? 'low' : 'medium'),
        tier: [1, 2, 3].indexOf(parseInt2(r.tier)) >= 0 ? parseInt2(r.tier) : 3, source: ctx.file || 'impor', notes: null, imported: true, src: src(ctx, r), _demo: false });
    });
    return out;
  }

  /* ====================================================== Schools & yayasan */

  var SCHOOL_PRODUCTS = [[/giro|operasional|kopra|cms/, 'GIRO'], [/payroll|gaji guru|gaji/, 'PAYROLL'], [/\bva\b|virtual|spp|biaya sekolah/, 'VA_SPP'],
    [/simpel|simpanan pelajar/, 'SIMPEL'], [/tabungan|tabunganku|siswa/, 'TABUNGAN'], [/edc|qris|merchant|livin.*merchant|kantin/, 'LVM'], [/kredit|ksm|kpr|kur|pinjaman/, 'KREDIT']];   // D41: reads the bank's own product wording and maps it to KREDIT; no screen names that product
  function schoolProduct(v) {
    var s = lower(v);
    if (!s) return null;
    for (var i = 0; i < SCHOOL_PRODUCTS.length; i++) if (SCHOOL_PRODUCTS[i][0].test(s)) return SCHOOL_PRODUCTS[i][1];
    return 'LAINNYA';
  }
  function buildSekolah(rows, ctx) {
    var map = {}, out = [], notSma = {};
    rows.forEach(function (r) {
      var npsn = str(r.npsn).replace(/\D/g, ''), name = str(r.nama_sekolah);
      if (!npsn && !name) { ctx.issue(r._row, 'npsn', null, 'SCHOOL_ID_MISSING', 'error'); return; }
      var key = npsn ? 'n:' + npsn : 's:' + normKey(name), rec = map[key];
      var bal = parseRp(r.saldo);
      if (bal && bal.neg) { ctx.issue(r._row, 'saldo', null, 'NEG_VALUE', 'error'); return; }
      if (!rec) {
        rec = map[key] = { id: 'S' + (npsn || U().fnv1a.hex(key)), npsn: npsn || null, name: name || null, foundation: str(r.yayasan) || null,
          jenjang: str(r.jenjang).toUpperCase() || null, matra: (function (m) { return m || null; })(parseMatra(r.matra)), products: [],
          status: 'nasabah', balance: 0, accounts: 0, students: parseInt2(r.jumlah_siswa), teachers: parseInt2(r.jumlah_guru),
          startDate: null, competitorBank: r.bank_pesaing ? parseBank(r.bank_pesaing) : null, lat: null, lon: null, geoPrecision: 'NONE',
          src: src(ctx, r), _demo: false };
        var g = geoFor(ctx, rec, r, key);
        rec.lat = g.lat; rec.lon = g.lon; rec.geoPrecision = g.geoPrecision; rec.kelurahan = g.kelurahan; rec.kota = g.kota;
        out.push(rec);
      }
      if (rec.jenjang && rec.jenjang !== 'SMA' && !notSma[key]) { notSma[key] = 1; ctx.issue(r._row, 'jenjang', rec.jenjang, 'NOT_SMA', 'info'); }
      var p = schoolProduct(r.produk);
      if (p && rec.products.indexOf(p) < 0) rec.products.push(p);
      if (isNum(bal)) rec.balance += bal;
      rec.accounts += parseInt2(r.jumlah_rekening) || (p ? 1 : 0);
      var st = lower(r.status_nasabah);
      if (/prospek|prospect|belum/.test(st)) rec.status = rec.products.length && isNum(bal) && bal > 0 ? 'nasabah' : 'prospek';
      var d = parseDate(r.tgl_mulai);
      if (d && (!rec.startDate || d < rec.startDate)) rec.startDate = d;
    });
    return out;
  }


  /* ============================================ Merchants: Livin' Merchant (LVM) and EDC */

  /*
   * Normalised merchant records (contract in docs/INTEGRATION_NOTES.md §5; demo rows in
   * assets/js/data-synthetic.js use the same shape):
   *   lvm {id, storeId, mid, name, category, groupIndex, mcc, address, kelurahan, kecamatan, kota, postcode,
   *        lat, lon, geoPrecision, branchCode, branchName, area, createdDate, status, grading,
   *        freqMtd, svMtd, freq30, sv30, dongle, src, _demo}
   *   edc {id, mid, tid, name, address, kelurahan, kecamatan, postcode, lat, lon, geoPrecision, status,
   *        installedDate, volumeMonth, trxMonth, branchCode, src, _demo}
   * Owner names, phone numbers, e-mail, account numbers and CIFs are dropped at parse time
   * (schema deny lists): they are never needed to tell whether a shop is already acquired.
   * The 'lvm' schema here is a baseline for the template sheet 1_lvm and the monthly "Rev LVM"
   * report's detail sheet; the Merchants section may register a fuller parser under the same type.
   */
  function statusField(ctx, row, key) {
    var v = parseStatus(row[key]);
    if (v === undefined) { ctx.issue(row._row, key, row[key], 'STATUS_UNKNOWN', 'warn'); return null; }
    return v;
  }
  function postcodeField(ctx, row, key) {
    var v = parsePostcode(row[key]);
    if (v === undefined) { ctx.issue(row._row, key, row[key], 'POSTCODE_INVALID', 'info'); return null; }
    return v;
  }
  function intField(ctx, row, key) {
    if (empty(row[key])) return null;
    var v = parseInt2(row[key]);
    if (v == null || !isFinite(v)) { ctx.issue(row._row, key, row[key], 'VALUE_INVALID', 'warn'); return null; }
    if (v < 0) { ctx.issue(row._row, key, row[key], 'NEG_VALUE', 'warn'); return null; }
    return v;
  }
  function amountField(ctx, row, key) {
    if (empty(row[key])) return null;
    var v = rpField(ctx, row, key, { negLevel: 'warn' });
    return isNum(v) ? v : null;
  }
  function hasLocCols(ctx) { return ['lat', 'lon', 'koordinat', 'kelurahan'].some(function (k) { return has(ctx.mapping, k); }); }
  function placeOf(ctx, rec, r, key) {
    if (!hasLocCols(ctx)) { ctx.report.geo.NONE = (ctx.report.geo.NONE || 0) + 1; return; }
    var g = geoFor(ctx, rec, r, key);
    rec.lat = g.lat; rec.lon = g.lon; rec.geoPrecision = g.geoPrecision;
    if (g.kelurahan) rec.kelurahan = g.kelurahan;
    if (!rec.kecamatan && g.kecamatan) rec.kecamatan = g.kecamatan;
    if (!rec.kota && g.kota) rec.kota = g.kota;
  }

  function buildLvm(rows, ctx) {
    var asOf = defaultAsOf(ctx, rows, null), out = [], seen = {};
    ctx.report.asOf = asOf;
    rows.forEach(function (r) {
      var mid = str(r.mid).replace(/\.0+$/, ''), sid = str(r.store_id), name = str(r.nama_merchant);
      var key = mid ? 'm:' + mid : (sid ? 's:' + sid : (name ? 'n:' + normKey(name) + '|' + normKey(r.alamat) : null));
      if (!key) { ctx.issue(r._row, 'mid', null, 'MERCHANT_KEY_MISSING', 'error'); return; }
      if (!name) { ctx.issue(r._row, 'nama_merchant', null, 'REQUIRED_MISSING', 'error'); return; }
      if (seen[key]) { ctx.issue(r._row, mid ? 'mid' : 'store_id', null, 'DUP_ACCOUNT', 'error'); return; }
      seen[key] = 1;
      var created = dateField(ctx, r, 'tgl_registrasi');
      if (created && !created.bad && created > asOf) ctx.issue(r._row, 'tgl_registrasi', null, 'DATE_FUTURE', 'info');
      var rec = {
        id: 'L' + U().fnv1a.hex(key), storeId: sid || null, mid: mid || null, name: name,
        category: str(r.kategori) || null, groupIndex: null, mcc: str(r.mcc).replace(/\.0+$/, '') || null,
        address: str(r.alamat) || null, kelurahan: str(r.kelurahan) || null, kecamatan: str(r.kecamatan) || null, kota: str(r.kota) || null,
        postcode: postcodeField(ctx, r, 'kode_pos'), lat: null, lon: null, geoPrecision: 'NONE',
        branchCode: str(r.kode_cabang).replace(/\.0+$/, '') || null, branchName: str(r.nama_cabang) || null, area: str(r.area) || null,
        createdDate: created && !created.bad ? created : null, status: statusField(ctx, r, 'status'), grading: str(r.grading) || null,
        freqMtd: intField(ctx, r, 'freq_mtd'), svMtd: amountField(ctx, r, 'sv_mtd'), freq30: intField(ctx, r, 'freq_30'), sv30: amountField(ctx, r, 'sv_30'),
        dongle: parseBool(r.dongle) === true, src: src(ctx, r), _demo: false
      };
      placeOf(ctx, rec, r, 'lvm:' + key);
      out.push(rec);
    });
    return out;
  }

  function buildEdc(rows, ctx) {
    var asOf = defaultAsOf(ctx, rows, null), out = [], seen = {};
    ctx.report.asOf = asOf;
    rows.forEach(function (r) {
      var mid = str(r.mid).replace(/\.0+$/, ''), tid = str(r.tid).replace(/\.0+$/, ''), name = str(r.nama_merchant);
      if (!mid) { ctx.issue(r._row, 'mid', null, 'REQUIRED_MISSING', 'error'); return; }
      if (!name) { ctx.issue(r._row, 'nama_merchant', null, 'REQUIRED_MISSING', 'error'); return; }
      var key = mid + '|' + tid;
      if (seen[key]) { ctx.issue(r._row, tid ? 'tid' : 'mid', null, 'DUP_ACCOUNT', 'error'); return; }
      seen[key] = 1;
      var inst = dateField(ctx, r, 'tgl_pasang');
      if (inst && !inst.bad && inst > asOf) ctx.issue(r._row, 'tgl_pasang', null, 'DATE_FUTURE', 'info');
      var rec = {
        id: 'E' + U().fnv1a.hex(key), mid: mid, tid: tid || null, name: name,
        address: str(r.alamat) || null, kelurahan: str(r.kelurahan) || null, kecamatan: str(r.kecamatan) || null, kota: str(r.kota) || null,
        postcode: postcodeField(ctx, r, 'kode_pos'), lat: null, lon: null, geoPrecision: 'NONE',
        status: statusField(ctx, r, 'status'), installedDate: inst && !inst.bad ? inst : null,
        volumeMonth: amountField(ctx, r, 'volume_bulan'), trxMonth: intField(ctx, r, 'frekuensi_bulan'),
        branchCode: str(r.kode_cabang).replace(/\.0+$/, '') || null, src: src(ctx, r), _demo: false
      };
      placeOf(ctx, rec, r, 'edc:' + key);
      out.push(rec);
    });
    return out;
  }

  /* =================================================== schema registrations */

  var GEO_COLS = [
    { key: 'lat', type: 'number', req: 'any:geo', personal: true, syn: ['latitude', 'lintang', 'y', 'koordinat_lat'] },
    { key: 'lon', type: 'number', req: 'any:geo', personal: true, syn: ['lng', 'long', 'longitude', 'bujur', 'x', 'koordinat_lon', 'koordinat_lng'] },
    { key: 'koordinat', type: 'string', req: 'any:geo', personal: true, syn: ['coordinates', 'latlon', 'lat_lon', 'lokasi_gps'] },
    { key: 'alamat', type: 'string', personal: true, syn: ['address', 'alamat_rumah', 'alamat_domisili'], note: 'hanya untuk tampilan, tidak pernah dikirim ke layanan peta' },
    { key: 'kelurahan', type: 'string', req: 'any:geo', syn: ['kel', 'desa', 'village', 'kel_desa'] },
    { key: 'kecamatan', type: 'string', syn: ['kec', 'district'] },
    { key: 'kota', type: 'string', syn: ['kabupaten', 'kab_kota', 'city', 'kota_kab'] }
  ];
  function geoCols(opts) {
    return GEO_COLS.filter(function (c) { return !(opts && opts.noAlamat && c.key === 'alamat'); }).map(function (c) { var o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; }); return o; });
  }

  // Personal fields of merchant owners: dropped at parse time, never stored (never needed for acquisition status).
  var OWNER_DENY = ['owner_name', 'nama_pemilik', 'pemilik', 'nama_nasabah', 'owner_phone', 'no_telp_pemilik', 'account_number', 'no_rekening',
    'norek', 'rekening', 'cif', 'no_cif', 'ownerid', 'owner_id', 'referal_code', 'referral_code', 'kode_referal', 'tgl_lahir', 'nik_pemilik'];
  var MERCHANT_LOC = [
    { key: 'alamat', type: 'string', req: 'any:loc', personal: true, syn: ['address', 'alamat_usaha', 'alamat_toko', 'alamat_merchant'], note: 'alamat toko, tampil disamarkan, tidak pernah dikirim' },
    { key: 'kelurahan', type: 'string', req: 'any:loc', syn: ['kel', 'desa', 'village', 'kel_desa'] },
    { key: 'kecamatan', type: 'string', req: 'any:loc', syn: ['kec', 'district'] },
    { key: 'kota', type: 'string', syn: ['kabupaten', 'kab_kota', 'city', 'kota_kab'] },
    { key: 'kode_pos', type: 'string', req: 'any:loc', syn: ['postcode', 'postal_code', 'kodepos', 'zip'] },
    { key: 'lat', type: 'number', req: 'any:loc', syn: ['latitude', 'lintang', 'koordinat_lat'] },
    { key: 'lon', type: 'number', req: 'any:loc', syn: ['lng', 'long', 'longitude', 'bujur', 'koordinat_lon', 'koordinat_lng'] },
    { key: 'koordinat', type: 'string', syn: ['coordinates', 'latlon', 'lat_lon', 'lokasi_gps'] }
  ];
  function merchantLoc() { return MERCHANT_LOC.map(function (c) { var o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; }); return o; }); }

  registerSchema('lvm', {
    label: 'Livin’ Merchant (LVM)', dataKey: 'lvm',
    description: 'Satu baris per toko Livin’ Merchant di cabang atau area.\nLaporan bulanan “Rev LVM” dapat diimpor apa adanya. Data pribadi pemilik dihapus.',
    columns: [
      { key: 'mid', req: 'any:key', syn: ['mid_static', 'nmid', 'merchant_id', 'id_merchant', 'mid_qris', 'mid_dynamic'] },
      { key: 'store_id', req: 'any:key', syn: ['id_toko', 'storeid', 'store_code', 'kode_toko'] },
      { key: 'nama_merchant', req: true, syn: ['store_name', 'nama_toko', 'nama_usaha', 'merchant_name', 'nama'] },
      { key: 'kategori', syn: ['lob_lm', 'category', 'jenis_usaha', 'kategori_usaha', 'lob'] },
      { key: 'mcc', syn: ['mcc_code', 'kode_mcc'] }
    ].concat(merchantLoc()).concat([
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
    ]),
    deny: OWNER_DENY.concat(['email', 'provinsi']),
    detect: function (keys, heads) {
      var lvmish = heads.indexOf('mid_static') >= 0 || heads.indexOf('lob_lm') >= 0 || heads.indexOf('store_name') >= 0 || heads.indexOf('status_trx') >= 0;
      if (heads.indexOf('tid') >= 0 && !lvmish) return false;       // a terminal list: EDC, not LVM
      // the report's detail sheet ("Rincian") has store_id; its summary sheets (top lists, monthly acquisitions) do not
      return (lvmish ? 3 : 0) + (keys.indexOf('store_id') >= 0 ? 2 : 0) + (keys.indexOf('kategori') >= 0 || keys.indexOf('tgl_registrasi') >= 0 ? 1 : 0);
    },
    build: buildLvm
  });

  registerSchema('edc', {
    label: 'Terminal EDC Mandiri', dataKey: 'edc',
    description: 'Satu baris per terminal EDC Mandiri (MID dan TID).\nHanya data merchant, tanpa data pribadi pemilik.',
    columns: [
      { key: 'mid', req: true, syn: ['merchant_id', 'id_merchant', 'mid_edc'] },
      { key: 'tid', syn: ['terminal_id', 'id_terminal', 'tid_edc'] },
      { key: 'nama_merchant', req: true, syn: ['merchant_name', 'nama_toko', 'nama_usaha', 'store_name', 'nama'] }
    ].concat(merchantLoc()).concat([
      { key: 'status', req: true, syn: ['status_edc', 'status_terminal', 'status_aktif'] },
      { key: 'tgl_pasang', type: 'date', syn: ['tanggal_pasang', 'install_date', 'tgl_instalasi', 'tgl_aktivasi'] },
      { key: 'volume_bulan', type: 'rp', syn: ['sales_volume', 'volume', 'nominal_bulan', 'volume_transaksi'] },
      { key: 'frekuensi_bulan', type: 'int', syn: ['jumlah_trx', 'frekuensi', 'trx_bulan', 'jumlah_transaksi'] },
      { key: 'kode_cabang', syn: ['branch_code', 'kocab', 'kode_cabang_final'] }
    ]),
    deny: OWNER_DENY,
    detect: function (keys) { return keys.indexOf('tid') >= 0 || keys.indexOf('tgl_pasang') >= 0 ? 3 : 1; },
    build: buildEdc
  });

  registerSchema('situs', {
    label: 'Lokasi tambahan di peta', dataKey: 'sites',
    columns: [
      { key: 'nama', req: true, syn: ['name'] }, { key: 'jenis', syn: ['kind', 'tipe'] },
      { key: 'lat', type: 'number', req: true, syn: ['latitude', 'lintang'] }, { key: 'lon', type: 'number', req: true, syn: ['lng', 'longitude', 'bujur'] },
      { key: 'keyakinan', syn: ['confidence'] }, { key: 'tier' }
    ],
    detect: function (keys) { return keys.length <= 6 ? 0 : -2; },
    build: buildSitus
  });

  registerSchema('sekolah', {
    label: 'Nasabah SMA', dataKey: 'sekolah',
    description: 'Satu baris per SMA dan produk, nasabah maupun prospek.\nHanya data sekolah, tanpa data pribadi guru atau siswa.',
    columns: [
      { key: 'npsn', req: 'any:school', syn: ['no_npsn', 'kode_sekolah'] },
      { key: 'nama_sekolah', req: 'any:school', syn: ['sekolah', 'school_name', 'nama_satuan_pendidikan'] },
      { key: 'yayasan', syn: ['nama_yayasan', 'foundation', 'npyp'] },
      { key: 'jenjang', syn: ['level', 'bentuk_pendidikan'] },
      { key: 'matra', syn: ['afiliasi'] },
      { key: 'produk', syn: ['product', 'layanan', 'fasilitas'] },
      { key: 'status_nasabah', syn: ['status', 'relasi'] },
      { key: 'saldo', type: 'rp', syn: ['balance', 'saldo_akhir'] },
      { key: 'jumlah_rekening', type: 'int', syn: ['noa', 'jml_rekening'] },
      { key: 'jumlah_siswa', type: 'int', syn: ['siswa', 'peserta_didik'] },
      { key: 'jumlah_guru', type: 'int', syn: ['guru', 'ptk'] },
      { key: 'tgl_mulai', type: 'date', syn: ['tanggal_mulai', 'sejak'] },
      { key: 'bank_pesaing', syn: ['competitor_bank', 'bank_lain'] }
    ].concat(geoCols({ noAlamat: true })),
    deny: ['nama_siswa', 'nama_guru', 'nama_kepala_sekolah', 'nama_operator'],
    detect: function (keys) { return keys.indexOf('npsn') >= 0 || keys.indexOf('nama_sekolah') >= 0 ? 2 : false; },
    build: buildSekolah
  });

  /* ============================================================ apply & export */

  var lastReport = null;

  /** "Use this data": replaces the dataset in memory. meta: {file, sheet, asOf, report}. */
  function apply(type, records, meta) {
    meta = meta || {};
    var s = SCHEMAS[type], key = s ? s.dataKey : MCD.data.keyFor(type);
    if (!key) throw new Error('MCD.importer.apply: unknown dataset type: ' + type);
    var list = records || [];
    if (key === 'sites' && !meta.replaceSites) list = ((MCD.ref && MCD.ref.sites) || []).map(function (x) { return JSON.parse(JSON.stringify(x)); }).concat(list);
    var r = meta.report || lastReport;
    return MCD.data.replace(key, list, { source: meta.source || 'import', file: meta.file || (r && r.file) || null, sheet: meta.sheet || (r && r.sheet) || null,
      asOf: meta.asOf || (r && r.asOf) || null, report: r ? { rows: r.totalRows, accepted: r.accepted, rejected: r.rejected, warnings: r.warnings } : null });
  }

  // Runtime-only fields, stripped before export (Save encrypted copy) and recomputed on load.
  var DERIVED = { sites: ['far'], lvm: ['match', 'poiIndex', 'distanceKm'], edc: ['match', 'poiIndex', 'distanceKm'], sekolah: [] };
  function stripRecord(key, r) {
    var o = JSON.parse(JSON.stringify(r));
    (DERIVED[key] || []).forEach(function (k) { delete o[k]; });
    return o;
  }

  /**
   * Vault path (gate addendum §4): datasets of runtime records (F.1 shape) are applied like
   * a completed import. A table of raw rows (canonical/synonym column names) is parsed first.
   */
  function applyDataset(key, records, meta) {
    meta = meta || {};
    var dk = MCD.data.keyFor(key) || (SCHEMAS[key] && SCHEMAS[key].dataKey);
    if (!dk) { if (W.console) W.console.warn('[MCD.importer] unknown vault dataset: ' + key); return null; }
    var list = Array.isArray(records) ? records : [];
    var type = null;
    ORDER.forEach(function (t) { if (!type && SCHEMAS[t].dataKey === dk) type = t; });
    if (list.length && type && looksRaw(dk, list[0])) {
      var headers = [], seen = {};
      list.forEach(function (r) { Object.keys(r).forEach(function (h) { if (!seen[h]) { seen[h] = 1; headers.push(h); } }); });
      var sheet = { name: meta.sheet || key, file: meta.file || 'vault', kind: 'vault', headers: headers,
        rows: list.map(function (r) { return headers.map(function (h) { return r[h]; }); }), rowNos: list.map(function (r, i) { return i + 1; }) };
      var res = parseSheet(sheet, type, null, { asOf: meta.asOf });
      return apply(type, res.records, { source: meta.source || 'vault', file: meta.file || 'vault', asOf: meta.asOf || res.report.asOf, report: res.report });
    }
    var clean = list.map(function (r, i) {
      var o = stripRecord(dk, r);
      if (!o.src) o.src = { file: meta.file || 'vault', sheet: null, row: i + 1 };
      o._demo = false;
      return o;
    });
    return MCD.data.replace(dk, clean, { source: meta.source || (meta.file === 'vault' ? 'vault' : 'import'), file: meta.file || 'vault', sheet: meta.sheet || null, asOf: meta.asOf || null });
  }
  function looksRaw(dk, r) {
    if (!r || typeof r !== 'object') return false;
    var probes = { lvm: ['storeId', 'createdDate', 'freqMtd'], edc: ['installedDate', 'trxMonth', 'volumeMonth'],
      sekolah: ['products', 'foundation'], sites: ['kind'], saldo: ['balances'] }[dk] || [];
    return !probes.some(function (k) { return has(r, k); });
  }

  /** Imported/vault datasets only, runtime fields stripped (for "Save encrypted copy", gate addendum §5). */
  function exportImportedDatasets() {
    var out = {};
    // MCD.data.real(): while demo data is on, the real datasets are the ones set aside (never the demo rows)
    var real = typeof MCD.data.real === 'function' ? MCD.data.real() : null;
    MCD.data.summary().forEach(function (s) {
      var src = real ? (real[s.key] && real[s.key].meta.source) : s.source;
      if (src !== 'import' && src !== 'vault') return;
      var list = (real ? real[s.key].rows : MCD.data[s.key]) || [];
      if (s.key === 'sites') list = list.filter(function (x) { return x.imported; });
      out[s.key] = list.map(function (r) { return stripRecord(s.key, r); });
    });
    return out;
  }

  /** Validation report → CSV of row numbers, column names and reasons (never values, §F.6). */
  function reportCsv(report) {
    var csv = U().csv, lines = [csv.row(['Baris', 'Kolom', 'Kode', 'Jenis', 'Alasan'])];
    ((report && report.issues) || []).forEach(function (i) {
      lines.push(csv.row([i.row == null ? '' : i.row, i.col || '', i.code, i.level === 'error' ? 'ditolak' : (i.level === 'warn' ? 'peringatan' : 'catatan'), i.reason]));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }
  /** Header-only CSV template for a dataset type (canonical names). */
  function templateCsv(type) {
    var s = schemaOf(type);
    return '﻿' + U().csv.row(s.columns.map(function (c) { return c.key; })) + '\r\n';
  }
  /** Schema listing for Data & Privacy (column guide). */
  function schemas() {
    return ORDER.map(function (t) {
      var s = SCHEMAS[t];
      return { type: t, label: s.label, dataKey: s.dataKey, description: s.description, via: s.via || null, vaultOnly: !!s.vaultOnly,
        columns: s.columns.map(function (c) { return { key: c.key, type: c.type, req: c.req, syn: c.syn.slice(), personal: c.personal, note: c.note }; }),
        monthly: Object.keys(s.monthly).map(function (k) { return { key: k, pattern: s.monthly[k] + '_YYYY_MM' }; }),
        deny: DENY.concat(s.deny) };
    });
  }
  /** V8: the routing facts of one schema, or null for a type nobody registered (never throws). */
  function lookupSchema(type) {
    var s = SCHEMAS[type];
    return s ? { type: s.type, label: s.label, dataKey: s.dataKey, via: s.via || null, vaultOnly: !!s.vaultOnly } : null;
  }
  /** Drops importer buffers (§K.1 "Remove all data from memory"). */
  function reset() { lastReport = null; }

  MCD.importer = {
    read: read, readText: readText, ensureXlsx: ensureXlsx, detect: detect, mapHeaders: mapHeaders,
    parse: parseSheet, parseAsync: parseAsync, apply: apply, applyDataset: applyDataset,
    exportImportedDatasets: exportImportedDatasets, registerSchema: registerSchema, schemas: schemas, lookupSchema: lookupSchema,
    reportCsv: reportCsv, templateCsv: templateCsv, geocode: geocode, reset: reset, reasons: REASONS,
    lastReport: function () { return lastReport; }, normHeader: normHeader, denyList: DENY.slice(),
    sha256Hex: function (s) { return hex(sha256(utf8(String(s)))); }, hmacHex: function (k, m) { return hex(hmacSha256(utf8(String(k)), utf8(String(m)))); }
  };
  // value parsers, available as MCD.importer.parse.rp(...) etc.
  Object.keys(parse).forEach(function (k) { MCD.importer.parse[k] = parse[k]; });
})(window.MCD = window.MCD || {});
