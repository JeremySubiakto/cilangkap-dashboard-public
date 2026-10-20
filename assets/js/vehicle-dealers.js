/* ==========================================================================
 * MCD.vehicleDealers: car and motorbike dealers within 30 km, for KKB referrals
 * (COPY_STYLE_EN item 48 a; data and method: docs/VEHICLE_DEALERS.md)
 *
 * PURE: no DOM, no storage, no network, no globals read. The data comes in as an
 * argument (data = window.MCD_VEHICLE_DEALERS, built by tools/build-vehicle-dealers.py).
 * UMD wrapper: MCD.vehicleDealers in the browser, module.exports in Node
 * (tests/vehicle-dealers.test.mjs). Not linked in index.html yet (v7 groundwork).
 *
 * This layer is separate from merchant targeting (Sasaran EDC, Sasaran LVM, Jaringan
 * nasional; COPY_STYLE_EN item 44, docs/EDC_SCORE.md §7.5): nothing here changes a
 * merchant count, and a merchant count never reads this file.
 *
 * Row (one public business listing)
 *   {name, brand|null, kind 'mobil'|'motor', type 'resmi'|'bekas'|'servis', lon, lat,
 *    km (straight line from the Mabes TNI centre), source 'overture'|'osm'|'overture+osm',
 *    confidence 0-1, kec (kecamatan id)|null, web? (official site, http/https), typeInferred?}
 *
 * API
 *   TYPES · KINDS · DEFAULT_TYPES (['resmi', 'bekas']: servis is hidden by default) · RINGS
 *   rows(data)                      → the valid rows of the file ([] when the file is missing)
 *   validRow(r)                     → true when a row has the shape above
 *   validate(data)                  → [problem text, ...] (empty when the file is sound)
 *   ringOf(km)                      → '0-15' | '15-30' | null
 *   filter(rows, opts)              → rows; opts {types (default DEFAULT_TYPES), includeServis, kinds,
 *                                     brands (null = tanpa merek), maxKm, minKm, kec, minConfidence}
 *   counts(rows)                    → {total, type, kind, ring, brand: [{brand, label, n}]}
 *   brands(rows, kind?)             → [{brand, label, n}] most listings first ('Tanpa merek' last)
 *   haversineKm(lon1, lat1, lon2, lat2)
 *   nearest(rows, lon, lat, opts)   → [{row, km}] nearest first; opts {n (10), maxKm, kinds, types, brands}
 *   typeLabel(t) · kindLabel(k) · brandLabel(b) · sourceLabel(s)
 *   confidenceLevel(c)              → 'tinggi' (>= 0,8) | 'sedang' (>= 0,6) | 'rendah'
 *   label(row)                      → 'Dealer resmi Toyota · Mobil'
 *   describe(row)                   → 'Dealer resmi Toyota (mobil), 12,3 km dari pusat Mabes TNI'
 *   summary(rows)                   → '1.404 dealer resmi dan 917 showroom bekas dalam 30 km (725 bengkel dan
 *                                     toko suku cadang tidak ditampilkan)'
 *   safeUrl(u)                      → u when it is a plain http(s) link, else null (for a link that opens in a new tab)
 *   fmtInt(n) · fmtKm(km)           → '1.404' · '850 m' / '12,3 km' (id-ID, like MCD.util.fmt)
 * Strings are plain Indonesian for branch staff (COPY_STYLE_EN item 19).
 * ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.vehicleDealers = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  var TYPES = { resmi: 'Dealer resmi', bekas: 'Showroom bekas', servis: 'Bengkel & suku cadang' };
  var KINDS = { mobil: 'Mobil', motor: 'Motor' };
  var SOURCES = { overture: 'Overture', osm: 'OpenStreetMap', 'overture+osm': 'Overture + OpenStreetMap' };
  var DEFAULT_TYPES = ['resmi', 'bekas'];
  var RINGS = [{ id: '0-15', from: 0, to: 15, label: '0–15 km' }, { id: '15-30', from: 15, to: 30, label: '15–30 km' }];
  var RADIUS_KM = 30;
  var NO_BRAND = 'Tanpa merek';

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function arr(x) { return x == null ? null : (Array.isArray(x) ? x : [x]); }

  /* ------------------------------------------------------------ format (id-ID) */

  function group(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  /** fmtInt(1530) → '1.530'. */
  function fmtInt(n) {
    if (!isNum(n)) return '—';
    var r = Math.round(n);
    return (r < 0 ? '−' : '') + group(String(Math.abs(r)));
  }
  /** fmtKm(0.85) → '850 m'; fmtKm(12.34) → '12,3 km' (same steps as MCD.util.fmt.km). */
  function fmtKm(km) {
    if (!isNum(km)) return '—';
    var a = Math.abs(km);
    if (a < 1) {
      var m = a < 0.1 ? Math.round(a * 1000) : Math.round(a * 100) * 10;
      if (m < 1000) return fmtInt(m) + ' m';
    }
    var t = (Math.round(a * 10) / 10).toFixed(1).split('.');
    return group(t[0]) + ',' + t[1] + ' km';
  }

  /* ------------------------------------------------------------ rows */

  function validRow(r) {
    return !!r && typeof r === 'object' &&
      typeof r.name === 'string' && r.name.length > 0 &&
      (r.brand === null || (typeof r.brand === 'string' && r.brand.length > 0)) &&
      has(KINDS, r.kind) && has(TYPES, r.type) &&
      isNum(r.lon) && isNum(r.lat) && isNum(r.km) && r.km >= 0 && r.km <= RADIUS_KM &&
      has(SOURCES, r.source) && isNum(r.confidence) && r.confidence >= 0 && r.confidence <= 1 &&
      (r.kec == null || typeof r.kec === 'string') &&
      (r.web == null || safeUrl(r.web) === r.web);
  }

  /** The valid rows of the data file; [] when it is missing or broken. */
  function rows(data) {
    if (!data || !Array.isArray(data.rows)) return [];
    return data.rows.filter(validRow);
  }

  /** Problems of the data file as plain text (empty array when sound). */
  function validate(data) {
    var out = [];
    if (!data || typeof data !== 'object') return ['Data dealer tidak ada.'];
    if (!data.meta || typeof data.meta !== 'object') out.push('Bagian meta tidak ada.');
    if (!Array.isArray(data.rows)) { out.push('Daftar baris tidak ada.'); return out; }
    var bad = 0;
    for (var i = 0; i < data.rows.length; i++) if (!validRow(data.rows[i])) bad++;
    if (bad) out.push(fmtInt(bad) + ' baris tidak sesuai bentuk data.');
    if (data.meta && data.meta.counts && isNum(data.meta.counts.total) && data.meta.counts.total !== data.rows.length) {
      out.push('Jumlah di meta (' + fmtInt(data.meta.counts.total) + ') tidak sama dengan jumlah baris (' +
        fmtInt(data.rows.length) + ').');
    }
    return out;
  }

  function ringOf(km) {
    if (!isNum(km) || km < 0 || km > RADIUS_KM) return null;
    return km <= 15 ? '0-15' : '15-30';
  }

  /**
   * filter(rows, opts): types defaults to DEFAULT_TYPES (servis hidden) unless opts.types is given or
   * opts.includeServis is true; brands may hold null for listings without a brand.
   */
  function filter(list, opts) {
    opts = opts || {};
    var types = arr(opts.types) || (opts.includeServis ? ['resmi', 'bekas', 'servis'] : DEFAULT_TYPES);
    var kinds = arr(opts.kinds);
    var brands = arr(opts.brands);
    var kec = arr(opts.kec);
    var out = [];
    for (var i = 0; i < (list || []).length; i++) {
      var r = list[i];
      if (types.indexOf(r.type) < 0) continue;
      if (kinds && kinds.indexOf(r.kind) < 0) continue;
      if (brands && brands.indexOf(r.brand === undefined ? null : r.brand) < 0) continue;
      if (isNum(opts.maxKm) && !(r.km <= opts.maxKm)) continue;
      if (isNum(opts.minKm) && !(r.km > opts.minKm)) continue;
      if (kec && kec.indexOf(r.kec) < 0) continue;
      if (isNum(opts.minConfidence) && !(r.confidence >= opts.minConfidence)) continue;
      out.push(r);
    }
    return out;
  }

  function brandLabel(b) { return b == null ? NO_BRAND : String(b); }

  /** [{brand, label, n}] most listings first, then A-Z; listings without a brand last. */
  function brands(list, kind) {
    var n = {}, keys = [];
    for (var i = 0; i < (list || []).length; i++) {
      var r = list[i];
      if (kind && r.kind !== kind) continue;
      var k = r.brand == null ? '\u0000' : r.brand;
      if (!has(n, k)) { n[k] = 0; keys.push(k); }
      n[k]++;
    }
    return keys.map(function (k) {
      var b = k === '\u0000' ? null : k;
      return { brand: b, label: brandLabel(b), n: n[k] };
    }).sort(function (a, b) {
      if ((a.brand === null) !== (b.brand === null)) return a.brand === null ? 1 : -1;
      return b.n - a.n || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
    });
  }

  function counts(list) {
    var c = { total: 0, type: { resmi: 0, bekas: 0, servis: 0 }, kind: { mobil: 0, motor: 0 }, ring: { '0-15': 0, '15-30': 0 } };
    for (var i = 0; i < (list || []).length; i++) {
      var r = list[i];
      c.total++;
      if (has(c.type, r.type)) c.type[r.type]++;
      if (has(c.kind, r.kind)) c.kind[r.kind]++;
      var g = ringOf(r.km);
      if (g) c.ring[g]++;
    }
    c.brand = brands(list);
    return c;
  }

  /* ------------------------------------------------------------ distance */

  function haversineKm(lon1, lat1, lon2, lat2) {
    var t = Math.PI / 180;
    var dLat = (lat2 - lat1) * t, dLon = (lon2 - lon1) * t;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** nearest(rows, lon, lat, {n, maxKm, kinds, types, brands}) → [{row, km}] nearest first (straight line). */
  function nearest(list, lon, lat, opts) {
    opts = opts || {};
    if (!isNum(lon) || !isNum(lat)) return [];
    var n = isNum(opts.n) && opts.n > 0 ? Math.floor(opts.n) : 10;
    var pool = filter(list, { types: opts.types, includeServis: opts.includeServis, kinds: opts.kinds, brands: opts.brands });
    var out = [];
    for (var i = 0; i < pool.length; i++) {
      var d = haversineKm(lon, lat, pool[i].lon, pool[i].lat);
      if (isNum(opts.maxKm) && d > opts.maxKm) continue;
      out.push({ row: pool[i], km: d });
    }
    out.sort(function (a, b) { return a.km - b.km || (a.row.name < b.row.name ? -1 : a.row.name > b.row.name ? 1 : 0); });
    return out.slice(0, n);
  }

  /* ------------------------------------------------------------ words */

  function typeLabel(t) { return has(TYPES, t) ? TYPES[t] : ''; }
  function kindLabel(k) { return has(KINDS, k) ? KINDS[k] : ''; }
  function sourceLabel(s) { return has(SOURCES, s) ? SOURCES[s] : ''; }
  function confidenceLevel(c) {
    if (!isNum(c)) return 'rendah';
    return c >= 0.8 ? 'tinggi' : c >= 0.6 ? 'sedang' : 'rendah';
  }

  /** 'Dealer resmi Toyota · Mobil', 'Showroom bekas · Motor', 'Bengkel & suku cadang Honda · Motor'. */
  function label(r) {
    if (!r) return '';
    return typeLabel(r.type) + (r.brand ? ' ' + r.brand : '') + ' · ' + kindLabel(r.kind);
  }

  /** 'Dealer resmi Toyota (mobil), 12,3 km dari pusat Mabes TNI'. */
  function describe(r) {
    if (!r) return '';
    return typeLabel(r.type) + (r.brand ? ' ' + r.brand : '') + ' (' + kindLabel(r.kind).toLowerCase() + '), ' +
      fmtKm(r.km) + ' dari pusat Mabes TNI';
  }

  /** One line for a panel head; servis is counted apart because the map hides it by default. */
  function summary(list) {
    var c = counts(list);
    var s = fmtInt(c.type.resmi) + ' dealer resmi dan ' + fmtInt(c.type.bekas) + ' showroom bekas dalam 30 km';
    if (c.type.servis) s += ' (' + fmtInt(c.type.servis) + ' bengkel dan toko suku cadang tidak ditampilkan)';
    return s;
  }

  /** u when it is a plain http(s) link without spaces, quotes or angle brackets; else null. */
  function safeUrl(u) {
    if (typeof u !== 'string') return null;
    if (!/^https?:\/\/[^\s"'<>\\@]+$/i.test(u)) return null;
    var host = u.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0];
    if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host) || host.indexOf('.') < 0) return null;
    return u;
  }

  return {
    TYPES: TYPES, KINDS: KINDS, SOURCES: SOURCES, DEFAULT_TYPES: DEFAULT_TYPES, RINGS: RINGS, RADIUS_KM: RADIUS_KM,
    rows: rows, validRow: validRow, validate: validate, ringOf: ringOf, filter: filter, counts: counts, brands: brands,
    haversineKm: haversineKm, nearest: nearest,
    typeLabel: typeLabel, kindLabel: kindLabel, brandLabel: brandLabel, sourceLabel: sourceLabel,
    confidenceLevel: confidenceLevel, label: label, describe: describe, summary: summary,
    safeUrl: safeUrl, fmtInt: fmtInt, fmtKm: fmtKm
  };
});
