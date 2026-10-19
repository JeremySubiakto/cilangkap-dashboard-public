/* ==========================================================================
 * MCD.synth: deterministic DEMO data for the opt-in "Demo data" switch
 * (docs/COPY_STYLE_EN.md product decision 7). NOT REAL DATA.
 *
 * index.html never loads this file. MCD.demo injects it when the switch is turned
 * on; the tests load it directly. It only produces what the five sections need:
 *
 *   MCD.synth.generate(seed = 20261012, asOf = '2026-10-12')
 *     → { lvm, edc, sekolah, meta: {seed, asOf, counts, checksum, poiRows} }
 *
 *   lvm      Livin' Merchant stores registered at the branch / area: about a fifth of the
 *            public merchants within 15 km (data/sme-pois.js, Overture Maps) are marked
 *            "already acquired", with a rate that falls with distance from the branch and
 *            varies by kecamatan so the coverage map shows green, amber and red areas.
 *            A few stores have no public listing (home businesses).
 *   edc      EDC Mandiri terminals: a share of the LVM stores plus a few EDC-only shops.
 *   sekolah  SMA customers and prospects (TNI-foundation SMA from data/tni-schools.js, plus
 *            nearby SMA from data/schools.js when that list is loaded).
 *
 * Nothing about personnel, loans, giro, payroll or staff is generated. No owner names,
 * phone numbers, account numbers or CIFs exist in these rows: store names are the public
 * business names of the listing or plainly invented ("Demo store 0123"); MIDs and TIDs
 * are invented and start with "DEMO". Every UI that shows them carries the DEMO mark.
 *
 * Record shapes (the contract shared with the importer, docs/INTEGRATION_NOTES.md §5):
 *   lvm  {id, storeId, mid, name, category, groupIndex, mcc, address, kelurahan, kecamatan,
 *         kota, postcode, lat, lon, geoPrecision, branchCode, branchName, area, createdDate,
 *         status: 'active'|'inactive', grading, freqMtd, svMtd, freq30, sv30, dongle,
 *         poiIndex (demo only: row of MCD_SME_POIS.rows), src, _demo}
 *   edc  {id, mid, tid, name, address, kelurahan, kecamatan, postcode, lat, lon, geoPrecision,
 *         status: 'active'|'inactive', installedDate, volumeMonth, trxMonth, branchCode,
 *         poiIndex (demo only), src, _demo}
 *   sekolah  the importer's `sekolah` shape (assets/js/importer.js buildSekolah), jenjang 'SMA'.
 *
 * Pure and lazy: nothing runs at load time except the registration below. Randomness
 * comes only from MCD.util.prng (never Math.random), one sub-stream per dataset, so
 * the same seed gives identical rows in every browser.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = typeof window !== 'undefined' ? window : {};
  var DAY = 86400000;
  var CENTER = [106.91329, -6.32818];               // Mabes TNI centre (lon, lat) used by every data file
  var BRANCH_CODE = '12903';
  var BRANCH_NAME = 'Jakarta Cilangkap';
  var AREA = 'Area Jakarta Pasar Rebo';
  var RADIUS_KM = 15;
  // Public POI groups (data/sme-pois.js meta.groups 0–11). Acquisition propensity per group.
  var GROUPS = ['Food & Beverage', 'Retail & Grocery', 'Automotive', 'Health & Pharmacy', 'Education', 'Beauty & Personal Care',
    'Construction & Building Materials', 'Manufacturing & Industrial', 'Wholesale & Distribution', 'Professional Services',
    'Hospitality & Tourism', 'Other'];
  var GROUP_RATE = [1.15, 1.25, 0.7, 0.9, 0.35, 0.95, 0.75, 0.3, 0.8, 0.45, 0.6, 0.5];
  var GROUP_EDC = [1.2, 1.3, 0.8, 1.2, 0.3, 0.6, 0.9, 0.4, 0.9, 0.5, 1.1, 0.4];
  var GROUP_MCC = ['5812', '5411', '7538', '5912', '8299', '7230', '5211', '5999', '5099', '8999', '7011', '5999'];

  function U() { return MCD.util; }
  function REF() { return MCD.ref || {}; }
  function pad(n, w) { var s = String(n); while (s.length < (w || 2)) s = '0' + s; return s; }
  function parseIso(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) throw new Error('MCD.synth: asOf must be YYYY-MM-DD');
    return Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY;
  }
  function iso(dn) { var d = new Date(dn * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function hav(lon1, lat1, lon2, lat2) {
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function branchLL() {
    var b = MCD.config && MCD.config.branch;
    return b && isFinite(b.lon) && isFinite(b.lat) ? [b.lon, b.lat] : [106.90989, -6.33203];
  }

  /* ----------------------------------------------- kelurahan / kecamatan lookup */

  /** Nearest kelurahan centroid (MCD.ref.kelurahan rows: [name, kecamatan, kota, lat, lon, lowPrecision]). */
  function kelIndex() {
    var rows = REF().kelurahan || [], grid = {};
    rows.forEach(function (r) {
      var key = Math.floor(r[4] / 0.02) + ':' + Math.floor(r[3] / 0.02);
      (grid[key] = grid[key] || []).push(r);
    });
    return function nearest(lon, lat) {
      var gx = Math.floor(lon / 0.02), gy = Math.floor(lat / 0.02), best = null, bd = Infinity;
      for (var ring = 0; ring <= 6 && !best; ring++) {
        for (var dx = -ring; dx <= ring; dx++) {
          for (var dy = -ring; dy <= ring; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            var cell = grid[(gx + dx) + ':' + (gy + dy)];
            if (!cell) continue;
            for (var i = 0; i < cell.length; i++) {
              var d = hav(lon, lat, cell[i][4], cell[i][3]);
              if (d < bd) { bd = d; best = cell[i]; }
            }
          }
        }
      }
      return best ? { kelurahan: best[0], kecamatan: best[1], kota: best[2] } : { kelurahan: null, kecamatan: null, kota: null };
    };
  }

  /* --------------------------------------------------------------- merchants */

  function baseRate(kmBranch) {
    if (kmBranch <= 3) return 0.62;
    if (kmBranch <= 6) return 0.42;
    if (kmBranch <= 10) return 0.2;
    return 0.07;
  }
  function demoMid(R) { return 'DEMO' + pad(R.int(0, 99999999), 8); }
  function lvmRow(R, o, asOfDn, n) {
    var active = R.chance(o.activeRate);
    var freq = active ? Math.round(Math.exp(R.n(Math.log(60), 0.9))) : (R.chance(0.3) ? R.int(1, 4) : 0);
    var ticket = Math.round(Math.exp(R.n(Math.log(38000), 0.7)) / 500) * 500;
    var created = asOfDn - Math.round(Math.max(3, Math.exp(R.n(Math.log(420), 0.9))));
    var mid = demoMid(R);
    return {
      id: 'L' + U().fnv1a.hex('lvm|' + n + '|' + mid), storeId: 'DEMO-S' + pad(n, 5), mid: mid,
      name: o.name, category: GROUPS[o.group] || 'Other', groupIndex: o.group, mcc: GROUP_MCC[o.group] || '5999',
      address: null, kelurahan: o.area.kelurahan, kecamatan: o.area.kecamatan, kota: o.area.kota, postcode: null,
      lat: Math.round(o.lat * 1e6) / 1e6, lon: Math.round(o.lon * 1e6) / 1e6, geoPrecision: 'EXACT',
      branchCode: BRANCH_CODE, branchName: BRANCH_NAME, area: AREA,
      createdDate: iso(created), status: active ? 'active' : 'inactive', grading: active ? (freq >= 60 ? 'USAK IDEAL' : 'USAK') : 'UREG = 0',
      freqMtd: freq, svMtd: freq * ticket, freq30: Math.round(freq * 1.1), sv30: Math.round(freq * 1.1) * ticket,
      dongle: R.chance(0.12), poiIndex: o.poiIndex == null ? null : o.poiIndex,
      src: { file: 'demo', sheet: '1_lvm', row: n + 2 }, _demo: true
    };
  }
  function edcRow(R, o, asOfDn, n) {
    var active = R.chance(0.82);
    var trx = active ? Math.round(Math.exp(R.n(Math.log(140), 0.8))) : 0;
    var ticket = Math.round(Math.exp(R.n(Math.log(95000), 0.6)) / 1000) * 1000;
    var mid = o.mid || demoMid(R);
    return {
      id: 'E' + U().fnv1a.hex('edc|' + n + '|' + mid), mid: mid, tid: 'DEMO' + pad(R.int(0, 9999999), 7),
      name: o.name, address: null, kelurahan: o.area.kelurahan, kecamatan: o.area.kecamatan, postcode: null,
      lat: Math.round(o.lat * 1e6) / 1e6, lon: Math.round(o.lon * 1e6) / 1e6, geoPrecision: 'EXACT',
      status: active ? 'active' : 'inactive', installedDate: iso(asOfDn - R.int(20, 1500)),
      volumeMonth: trx * ticket, trxMonth: trx, branchCode: BRANCH_CODE, poiIndex: o.poiIndex == null ? null : o.poiIndex,
      src: { file: 'demo', sheet: '2_edc', row: n + 2 }, _demo: true
    };
  }

  /** Synthetic points around the Mabes centre when the public listing is not loaded (tests, fallbacks). */
  function fallbackPois(seed) {
    var R = U().prng((seed ^ 0x51ed27) >>> 0), out = [];
    for (var i = 0; i < 1200; i++) {
      var km = Math.sqrt(R()) * RADIUS_KM, a = R() * Math.PI * 2;
      var dx = km * Math.cos(a), dy = km * Math.sin(a);
      out.push([CENTER[0] + dx / (111.32 * Math.cos(CENTER[1] * Math.PI / 180)), CENTER[1] + dy / 110.574, R.int(0, 11), 'Demo place ' + pad(i, 4), 0.8, null]);
    }
    return out;
  }

  function genMerchants(seed, asOfDn) {
    var P = W.MCD_SME_POIS && Array.isArray(W.MCD_SME_POIS.rows) ? W.MCD_SME_POIS.rows : null;
    var rows = P || fallbackPois(seed);
    var near = kelIndex(), br = branchLL();
    var Rk = U().prng((seed + 31) >>> 0), Rl = U().prng((seed + 32) >>> 0), Re = U().prng((seed + 33) >>> 0);
    var kecFactor = {};
    function factor(kec) {
      if (!kec) return 1;
      if (kecFactor[kec] == null) kecFactor[kec] = 0.45 + 1.4 * Rk() * Rk();   // skewed: a few strong areas, many weak ones
      return kecFactor[kec];
    }
    var lvm = [], edc = [], n = 0, e = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], lon = +r[0], lat = +r[1], g = r[2] | 0;
      if (!(g >= 0 && g <= 11) || !isFinite(lon) || !isFinite(lat)) continue;          // groups 12–13 are banks
      if (hav(CENTER[0], CENTER[1], lon, lat) > RADIUS_KM) continue;
      var area = near(lon, lat);
      var kmB = hav(br[0], br[1], lon, lat);
      var p = Math.min(0.85, baseRate(kmB) * factor(area.kecamatan) * (GROUP_RATE[g] || 0.5));
      var name = String(r[3] || '').trim() || 'Demo store ' + pad(i, 5);
      var o = { name: name, group: g, lat: lat, lon: lon, area: area, poiIndex: P ? i : null, activeRate: 0.55 + 0.3 * Math.min(1, p * 2) };
      if (Rl() < p) {
        var row = lvmRow(Rl, o, asOfDn, n++);
        lvm.push(row);
        if (Re() < 0.11 * (GROUP_EDC[g] || 0.5)) { o.mid = row.mid; edc.push(edcRow(Re, o, asOfDn, e++)); }
      } else if (Re() < 0.012 * (GROUP_EDC[g] || 0.5)) {
        edc.push(edcRow(Re, o, asOfDn, e++));
      }
    }
    // Stores without a public listing (home businesses, market stalls): about 6% extra.
    var extra = Math.round(lvm.length * 0.06), Rx = U().prng((seed + 34) >>> 0);
    for (var k = 0; k < extra; k++) {
      var km = Math.sqrt(Rx()) * 8, ang = Rx() * Math.PI * 2;
      var lo = br[0] + km * Math.cos(ang) / (111.32 * Math.cos(br[1] * Math.PI / 180)), la = br[1] + km * Math.sin(ang) / 110.574;
      var gx = Rx.wpick([0, 1, 5, 3], [4, 4, 1, 1]);
      lvm.push(lvmRow(Rx, { name: 'Demo store ' + pad(k, 4), group: gx, lat: la, lon: lo, area: near(lo, la), poiIndex: null, activeRate: 0.6 }, asOfDn, n++));
    }
    return { lvm: lvm, edc: edc, poiRows: rows.length, fromListing: !!P };
  }

  /* ---------------------------------------------------------------- schools */

  // School products only (operating account, fee collection, pupils' savings, Tabungan SimPel, canteen QRIS); no payroll.
  var SCHOOL_PRODUCTS = ['GIRO', 'VA_SPP', 'TABUNGAN', 'SIMPEL', 'LVM'];
  function schoolRow(R, o) {
    var products = o.products || [];
    var bal = o.status === 'nasabah' && products.indexOf('GIRO') >= 0 ? Math.round(R.range(40e6, 1.6e9) / 1e5) * 1e5 : 0;
    return {
      id: 'S' + (o.npsn || U().fnv1a.hex(o.name || 'x')), npsn: o.npsn || null, name: o.name || null, foundation: o.foundation || null,
      jenjang: 'SMA', matra: o.matra || null, products: products, status: o.status, balance: bal, accounts: products.length,
      students: null, teachers: null,
      startDate: o.status === 'nasabah' ? '20' + (19 + R.int(0, 6)) + '-0' + R.int(1, 9) + '-1' + R.int(0, 9) : null,
      competitorBank: o.status === 'nasabah' ? null : R.pick(['BJB', 'BSI', 'BRI', 'BNI', null, null]),
      lat: isFinite(o.lat) ? o.lat : null, lon: isFinite(o.lon) ? o.lon : null, geoPrecision: isFinite(o.lat) ? 'EXACT' : 'NONE',
      src: { file: 'demo', sheet: '3_sekolah', row: null }, _demo: true
    };
  }
  function pickProducts(R, n) {
    var out = ['GIRO'];
    R.shuffle(SCHOOL_PRODUCTS.slice(1)).slice(0, n).forEach(function (p) { out.push(p); });
    return out;
  }
  function genSchools(seed) {
    var R = U().prng((seed ^ 0x5c4001) >>> 0), out = [], seen = {};
    var T = W.MCD_TNI_SCHOOLS;
    var tni = T && Array.isArray(T.rows) ? T.rows.filter(function (r) { return r.category === 'school' && r.npsn && String(r.jenjang).toUpperCase() === 'SMA'; }) : [];
    tni.forEach(function (t, i) {
      seen[String(t.npsn)] = 1;
      out.push(schoolRow(R, { npsn: String(t.npsn), name: t.name, matra: t.matra, lat: t.lat, lon: t.lon,
        status: i % 3 === 2 ? 'prospek' : 'nasabah', products: i % 3 === 2 ? [] : pickProducts(R, R.int(0, 2)) }));
    });
    // SMA near the branch from data/schools.js, when the school list is loaded (MCD.schools.idx).
    var I = MCD.schools && MCD.schools.idx;
    if (I && I.jen && I.n) {
      var near = [];
      for (var k = 0; k < I.n && near.length < 400; k++) {
        var j = I.order ? I.order[k] : k;
        if (I.jen[j] !== 3 || !I.npsn[j] || seen[String(I.npsn[j])] || !(I.dist[j] <= 12)) continue;
        /* SMA only: madrasah aliyah rows of the same level are left out (Schools request 3) */
        if (MCD.schools && typeof MCD.schools.smaClass === 'function' && MCD.schools.smaClass(I.name[j], true) !== 1) continue;
        near.push(j);
      }
      R.shuffle(near).slice(0, 26).forEach(function (j, i) {
        out.push(schoolRow(R, { npsn: String(I.npsn[j]), name: I.name[j], lat: I.lat ? I.lat[j] : null, lon: I.lon ? I.lon[j] : null,
          status: i % 4 === 3 ? 'prospek' : 'nasabah', products: i % 4 === 3 ? [] : pickProducts(R, R.int(0, 3)) }));
      });
    }
    return out;
  }

  /* ----------------------------------------------------------------- public */

  function checksum(list) {
    var h = 0;
    for (var i = 0; i < list.length; i++) h = (h * 31 + U().fnv1a(list[i].id)) >>> 0;
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function generate(seed, asOf) {
    if (!MCD.util || !MCD.util.prng) throw new Error('MCD.synth: load util.js first');
    seed = seed == null ? ((MCD.config && MCD.config.seed) || 20261012) : seed;
    asOf = asOf || (MCD.config && MCD.config.asOfDemo) || '2026-10-12';
    var asOfDn = parseIso(asOf);
    var m = genMerchants(seed >>> 0, asOfDn), schools = genSchools(seed >>> 0);
    return {
      lvm: m.lvm, edc: m.edc, sekolah: schools,
      meta: { seed: seed, asOf: asOf, counts: { lvm: m.lvm.length, edc: m.edc.length, sekolah: schools.length },
        poiRows: m.poiRows, fromListing: m.fromListing, checksum: checksum(m.lvm.concat(m.edc)) }
    };
  }

  MCD.synth = { generate: generate, checksum: checksum, groups: GROUPS.slice() };

  // Late fill: switched on before data/schools.js was loaded (it loads lazily with the Schools
  // section). Add the nearby SMA once the list is in, if demo data is still on.
  if (MCD.schools && typeof MCD.schools.on === 'function' && !MCD.schools.idx && MCD.data && typeof MCD.data.setDemo === 'function') {
    var offReady = MCD.schools.on('ready', function () {
      if (typeof offReady === 'function') offReady();
      var on = typeof MCD.data.demoActive === 'function' && MCD.data.demoActive();
      var meta = MCD.data.meta && MCD.data.meta.sekolah;
      if (on && meta && meta.source === 'demo') MCD.data.setDemo('sekolah', function () { return genSchools((MCD.config && MCD.config.seed) || 20261012); });
    });
  }
})(window.MCD = window.MCD || {});
