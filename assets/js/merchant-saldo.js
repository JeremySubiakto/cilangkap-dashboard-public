/* ==========================================================================
 * MCD.saldo: the merchant balance report (dataset 'saldo', 22 Oct 2026).
 *
 * One row per merchant customer of the branch: name, number of EDC terminals, product (TABU / GIRO), the balance on
 * several dates (one column per date) and the change YtD, MoM, MtD and DtD with Drop / Growth flags. Staff import it
 * in Data & Privasi › Impor like every bank file: it is read in this browser and kept only in memory and in the
 * encrypted copy. CIF, account numbers and the official (legal) name are dropped when the file is read, never stored.
 *
 *   MCD.saldo.rows()     → the imported records (Merchant › Saldo merchant draws them)
 *   MCD.saldo.summary()  → {n, asOf, dates[], drop, growth, total, totalPrev} or null without data
 *   MCD.saldo.schema     the importer schema (type 'saldo')
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var KEY = 'saldo';

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function P() { return (MCD.importer && MCD.importer.parse) || null; }
  /** A number from the sheet (negatives kept: the changes go down as well as up), else null. */
  function num(v) {
    if (v == null || v === '') return null;
    if (isNum(v)) return v;
    var p = P(), n = p && p.num ? p.num(v) : Number(String(v).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
    return isNum(n) ? n : null;
  }
  function flag(v) { var s = str(v).toLowerCase(); return s === 'drop' ? 'drop' : (s === 'growth' ? 'growth' : null); }
  function yes(v) { var s = str(v).toLowerCase(); return s === 'ada' || s === 'ya' || s === 'y' || s === '1' || s === 'true'; }

  var SCHEMA = {
    label: 'Saldo merchant',
    dataKey: KEY,
    description: 'Satu baris per merchant nasabah: saldo per tanggal, perubahan YtD, MoM, MtD dan DtD.\nCIF, nomor rekening dan nama resmi dihapus saat file dibaca.',
    columns: [
      { key: 'nama', req: true, syn: ['commonname', 'common_name', 'nama_merchant', 'merchant_name'] },
      { key: 'nama_dba', syn: ['merchantdbaname', 'merchant_dba_name', 'dba_name', 'nama_usaha'] },
      { key: 'jumlah_edc', type: 'int', syn: ['jml_edc', 'edc_count', 'jumlah_terminal'] },
      { key: 'kode_cabang', syn: ['cd_cbg_perform', 'branch_code', 'kocab'] },
      { key: 'nama_cabang', syn: ['cbg_perform', 'branch_name'] },
      { key: 'area', syn: ['area_perform', 'nama_area'] },
      { key: 'segmen', syn: ['segment'] },
      { key: 'produk', syn: ['code_product', 'kode_produk', 'product'] },
      { key: 'ytd', type: 'number' }, { key: 'mom', type: 'number' }, { key: 'mtd', type: 'number' }, { key: 'dtd', type: 'number' },
      { key: 'flag_mom' }, { key: 'flag_mtd' },
      { key: 'ada_edc', syn: ['flag_ada_edc'] }
    ],
    /* the customer's identity never enters the dashboard */
    deny: ['cifno', 'cif', 'no_cif', 'nocif', 'norekening', 'no_rekening', 'norek', 'rekening', 'account_number', 'merchantofficialname',
      'merchant_official_name', 'nama_resmi', 'nama_nasabah', 'owner_name', 'nama_pemilik', 'pemilik'],
    daily: { saldo: '' },
    /* the balance columns (dates) make it this file; without them it is not */
    detect: function (keys, heads, m) {
      var days = m && m.daily && m.daily.saldo ? Object.keys(m.daily.saldo).length : 0;
      return days >= 2 ? 4 + days : false;
    },
    build: build
  };

  function build(rows, ctx) {
    var out = [], latest = null;
    rows.forEach(function (r, i) {
      var name = str(r.nama) || str(r.nama_dba);
      if (!name) { ctx.issue(r._row, 'nama', null, 'REQUIRED_MISSING', 'error'); return; }
      var days = (r._days && r._days.saldo) || {}, balances = {};
      Object.keys(days).sort().forEach(function (d) {
        var v = num(days[d]);
        if (v != null) { balances[d] = Math.round(v); if (!latest || d > latest) latest = d; }
      });
      var U = MCD.util;
      out.push({
        id: 'S' + (U && U.fnv1a ? U.fnv1a.hex(name + '|' + str(r.nama_dba) + '|' + i) : String(i)),
        name: name, dba: str(r.nama_dba) || null,
        edc: isNum(num(r.jumlah_edc)) ? Math.round(num(r.jumlah_edc)) : null, hasEdc: r.ada_edc == null ? null : yes(r.ada_edc),
        product: str(r.produk) && str(r.produk) !== '0' ? str(r.produk) : null, segment: str(r.segmen) || null,
        branchCode: str(r.kode_cabang).replace(/\.0+$/, '') || null, branch: str(r.nama_cabang) || null, area: str(r.area) || null,
        balances: balances, ytd: num(r.ytd), mom: num(r.mom), mtd: num(r.mtd), dtd: num(r.dtd),
        flagMom: flag(r.flag_mom), flagMtd: flag(r.flag_mtd),
        src: { file: ctx.file || null, sheet: ctx.sheet || null, row: r._row }, _demo: false
      });
    });
    if (latest) ctx.report.asOf = latest;
    return out;
  }

  /* ============================================================== reading */

  function rows() { return (MCD.data && MCD.data[KEY]) || []; }
  function dates(list) {
    var seen = {};
    (list || rows()).forEach(function (r) { Object.keys(r.balances || {}).forEach(function (d) { seen[d] = 1; }); });
    return Object.keys(seen).sort();
  }
  function summary() {
    var list = rows();
    if (!list.length) return null;
    var ds = dates(list), last = ds[ds.length - 1], prev = ds.length > 1 ? ds[ds.length - 2] : null, s = { n: list.length, dates: ds, asOf: last,
      drop: 0, growth: 0, total: 0, totalPrev: prev ? 0 : null, demo: list.some(function (r) { return r._demo; }) };
    list.forEach(function (r) {
      if (r.flagMtd === 'drop') s.drop++;
      else if (r.flagMtd === 'growth') s.growth++;
      if (isNum(r.balances[last])) s.total += r.balances[last];
      if (prev && isNum(r.balances[prev])) s.totalPrev += r.balances[prev];
    });
    return s;
  }

  function register() {
    if (MCD.importer && typeof MCD.importer.registerSchema === 'function') MCD.importer.registerSchema('saldo', SCHEMA);
    if (MCD.data && typeof MCD.data.registerDataset === 'function' && !(MCD.data.keyFor && MCD.data.keyFor(KEY))) {
      MCD.data.registerDataset(KEY, { types: ['saldo_merchant', 'merchant_saldo'], label: 'Saldo merchant nasabah', bank: true });
    }
  }
  register();

  MCD.saldo = { rows: rows, dates: dates, summary: summary, schema: SCHEMA };
})(window.MCD = window.MCD || {});
