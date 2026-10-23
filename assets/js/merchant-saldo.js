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
 *   MCD.saldo.schema     the importer schema (type 'saldo'; schema.via = 'funding': V8 D45, read through the one import
 *                        row "Funding merchant (cabang)", never offered alone)
 *
 * Merged into the private repository on 23 Oct 2026 (private/merge-public/MERGE_NOTES.md), with three guards of the
 * private funding module (docs/MERCHANT_FUNDING.md §2, §5): only rows of KCP Jakarta Cilangkap (12903) are kept, the
 * others are counted in the import note and dropped; the address, actype and sccode columns are dropped with CIF,
 * account number and official name; and the MID table of the region report (one row per terminal) is not this file.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var KEY = 'saldo';
  /* our branch (as MCD.funding.HOME / HOME_NAME): the code decides, the name only for a row without a code */
  var HOME = '12903', HOME_NAME = 'JAKARTA CILANGKAP';

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
  /** A branch code as digits without leading zeros ('12903', 12903, '12903.0'); '', 0, '-' → null. */
  function codeOf(v) { var d = str(v).replace(/\.0+$/, ''); return /^\d+$/.test(d) && +d !== 0 ? String(+d) : null; }
  /** "KCP JAKARTA CILANGKAP", "Kcp  Jakarta Cilangkap" → 'JAKARTA CILANGKAP'; '', '0', '-' → ''. */
  function branchKey(v) { var k = str(v).toUpperCase().replace(/\s+/g, ' ').replace(/^(KCP|KC)\s+/, '').trim(); return k === '0' || k === '-' ? '' : k; }
  /** 'ours' | 'other' | 'none' (a row without code and name) for one row. */
  function branchOf(r) {
    var c = codeOf(r.kode_cabang);
    if (c) return c === HOME ? 'ours' : 'other';
    var n = branchKey(r.nama_cabang);
    if (n) return n === HOME_NAME ? 'ours' : 'other';
    return 'none';
  }

  var SCHEMA = {
    label: 'Saldo merchant',
    dataKey: KEY,
    description: 'Satu baris per merchant nasabah: saldo per tanggal, perubahan YtD, MoM, MtD dan DtD.\nCIF, nomor rekening, nama resmi dan alamat dihapus saat file dibaca.\nHanya merchant KCP Jakarta Cilangkap (12903) yang disimpan.',
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
      'merchant_official_name', 'nama_resmi', 'nama_nasabah', 'owner_name', 'nama_pemilik', 'pemilik',
      /* merge 23 Oct 2026: never kept either (MERCHANT_FUNDING §5) */
      'alamat', 'alamat_merchant', 'alamat_usaha', 'address', 'actype', 'sccode'],
    daily: { saldo: '' },
    /* V8 D45 (docs/V8_SPEC.md §3.2, §3.3): one import row "Funding merchant (cabang)" reads this file with the funding
       report; importer.js never offers this schema on its own and hands such a file to that row */
    via: 'funding',
    /* the balance columns (dates) make it this file; without them it is not */
    detect: function (keys, heads, m) {
      /* the region report's MID table (one row per EDC terminal, two blocks of the same dates) is not this file */
      if ((heads || []).indexOf('mid') >= 0) return false;
      var days = m && m.daily && m.daily.saldo ? Object.keys(m.daily.saldo).length : 0;
      return days >= 2 ? 4 + days : false;
    },
    build: build
  };

  function build(rows, ctx) {
    var out = [], latest = null, other = 0, none = 0;
    /* a file without branch columns is the branch's own extract; with them, only our rows stay */
    var map = ctx.mapping || {}, byBranch = Object.prototype.hasOwnProperty.call(map, 'kode_cabang') || Object.prototype.hasOwnProperty.call(map, 'nama_cabang');
    rows.forEach(function (r, i) {
      if (byBranch) {
        var b = branchOf(r);
        if (b === 'other') { other++; return; }
        if (b === 'none') { none++; return; }
      }
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
        branchCode: codeOf(r.kode_cabang), branch: branchKey(r.nama_cabang) ? str(r.nama_cabang) : null, area: str(r.area) || null,
        balances: balances, ytd: num(r.ytd), mom: num(r.mom), mtd: num(r.mtd), dtd: num(r.dtd),
        flagMom: flag(r.flag_mom), flagMtd: flag(r.flag_mtd),
        src: { file: ctx.file || null, sheet: ctx.sheet || null, row: r._row }, _demo: false
      });
    });
    if (latest) ctx.report.asOf = latest;
    /* counts only: no other branch's code, name or amount is kept */
    if (other) ctx.report.notes.push(other + ' baris milik cabang lain tidak disimpan. Hanya merchant KCP Jakarta Cilangkap (12903) yang dibaca.');
    if (none) ctx.report.notes.push(none + ' baris tanpa kode dan nama cabang tidak disimpan.');
    ctx.report.branchRows = { kept: out.length, otherBranch: other, noBranch: none };
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

  MCD.saldo = { rows: rows, dates: dates, summary: summary, schema: SCHEMA, HOME: HOME };
})(window.MCD = window.MCD || {});
