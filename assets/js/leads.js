/* ==========================================================================
 * MCD.leads: the masked lead list (docs/COPY_STYLE_EN.md items 48 and 49,
 * docs/LEADS_MASKED.md). Pure logic, no DOM. Loaded after importer.js (index.html, V8 §3.7).
 *
 * D39, D41 (docs/V7_SPEC.md; docs/V8_SPEC.md §3.5, D51): the two credit products of the former TNI section left
 * the UI and the logic. Two rules remain (Calon KPR, Mendekati Prioritas). Their fields (the payroll segment, the
 * remaining tenor and the two product flags) are not on the allowlist any more: a column that names one is
 * reported "diabaikan" ("Kolom ini tidak digunakan oleh aturan daftar leads.") and never read, and older stored
 * records drop them (sanitizeStored). Groupings: Kode satuan · Saldo · Penghasilan.
 *
 * The feature ships SWITCHED OFF. The user turns it on in Data & Privasi and
 * imports the branch's own customer report on the branch laptop. Only an
 * ALLOWLIST of fields survives the import, each reduced to the least it needs.
 * Item 48 approved: masked CIF, product flags, balance and income bands, unit code, collectibility flag.
 *
 *   cif            → key: HMAC-SHA-256(session key, CIF), 12 hex. The raw CIF is never kept.
 *   (row number)   → sourceRow, plus fp: the file fingerprint (name + size + row count),
 *                    so staff look the customer up in their own file and the bank's own system
 *   kodeSatuan     → the unit code as written (short code only; a column that reads like names, plates or
 *                    one value per customer is denied)
 *   product flags  → tabungan, giro, deposito, kpr, kartuKredit, livin, prioritas: true | false | null
 *   saldo          → saldoBand: 'lt50' | '50to80' | '80to100' | 'gte100' of the Prioritas threshold (a setting)
 *   penghasilan    → penghasilanBand '<lo>-<hi>' (Rp a month, lower bound included)
 *   kolektibilitas → lancar: true (Kol 1) | false (Kol 2-5) | null
 * NOT APPROVED, never read or kept: age (usia, umur, date of birth) and kecamatan or any other part of the
 * customer's address. Such columns are ignored at import, dropped on the vault path and offer no grouping.
 * Every other column is dropped before anything is stored. A column is DENIED (reported, dropped,
 * never stored, and the user's mapping cannot bring it back) when its header names personal data
 * (nama, NIK, KTP, alamat, telepon, HP, email, rekening, norek, account, tanggal lahir, ibu kandung,
 * NRP/NIP, nomor polisi, koordinat, ahli waris, ... in any spelling: "NamaNasabah", "N.I.K", "HP1")
 * or when its values look like NIKs, Indonesian phone numbers, e-mail addresses, 10-16 digit account
 * numbers (allowed in the CIF column only), longer ID numbers, number plates or coordinates.
 * A file whose first row looks like customer data (no header row) is refused, and its first row
 * never appears in a report ("Kolom 1", "Kolom 2", ...).
 *
 *   Switch and session
 *     enabled() · setEnabled(on) · settings() · configure(patch) · normSettings(patch, base) · DEFAULTS
 *     setKey(key, crypto?) → Promise<true> · hasKey() · newKeyBytes(crypto?) → Uint8Array(32) · reset()
 *   Mapping (the user confirms it at import time; no cell values in any result)
 *     FIELDS · FIELD_LABELS · FIELD_KIND · PRODUCTS · STORED_FIELDS · DETECTORS · REMOVED_WHY
 *     normHeader(h) · headerDenied(h) → {why, label} | null · fieldForHeader(h) → field | null
 *     classifyValue(v, kind) → null | 'nik' | 'telepon' | 'email' | 'rekening' | 'nomor' | 'nopol' | 'lokasi'
 *     scanColumn(values, kind) → {filled, hits, total, denied, detector}
 *     codeColumnCheck(values) → {denied, detector: 'nama' | 'unik' | null, total} (kode satuan only)
 *     suggestMapping(sheet) / checkMapping(sheet, mapping) → {mapping: {field: col}, columns, missing, ok, headerless}
 *   Import (async: WebCrypto HMAC-SHA-256; the key comes from the vault session)
 *     readFile(file) → Promise<Sheet[]> (MCD.importer.read, only while switched on)
 *     importSheet(sheet, {key?, mapping?, file: {name, size}, asOf?, settings?, crypto?, wipe?, onProgress?})
 *       → Promise<{records, report, file}>   (wipe, default true, empties sheet.rows and sheet.headers after
 *       the import, also when it stops with report.fatal)
 *     mask(cif, key, crypto?) → Promise<12 hex | null> · normCif(v) → string | null
 *     fingerprint(file, rows, crypto?) → Promise<{name, size, rows, fp}>
 *     apply(result) → MCD.data.replace('leads', …) (switched on only) · clear()
 *     sanitizeStored(obj) → record | null (vault path; also used by the importer schema 'leads')
 *     reader: {TYPE, label, what, read, suggest, check, import, apply}
 *   Bands (every threshold is a setting; no bank policy in this file)
 *     nearPrioritas(saldo, threshold) · bandOf(field, value, settings) · edgesFor(field, settings)
 *     bandBounds(id) → {lo, hi} | null · bandLabel(field, id)
 *   Rules (pure): RULES · rules.{calonKpr, calonPrioritas}(record, settings)
 *     ruleStatus(settings) → [{id, label, what, active, why}]
 *   Aggregates with the k = 5 rule (groups of 1-4 show "<5" and are left out of the totals; complementary
 *   hiding, always on, marks more groups "–" until no hidden count can be worked out from the headline)
 *     aggregate(records, by, {rule?, settings?}) → {by, k, rule, groups, total, totalText, hidden, withheld, note}
 *       by: kodeSatuan | saldoBand | penghasilanBand (any other → error NO_GROUPING)
 *     summary(records, settings?) → {k, total, rules}
 *     list(records, {rule, where?: {<by>: value}, settings?}) → {rule, where, n, text, suppressed, why, rows: [{key, sourceRow}]}
 *       (a rule is required; where names one group that the rule's table shows)
 *   Registers the importer type 'leads' for the vault path only (stored columns; raw files and raw CIFs are
 *   refused there, and it never auto-detects a file) and the bank dataset 'leads' in MCD.data.
 *
 * Never: an export or CSV, coordinates, map points, URL or link builders, network calls, or
 * a cell value in a report. Groups smaller than 5 are hidden (item 48).
 * User-facing strings are plain Indonesian (COPY_STYLE_EN items 19 and 24).
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.leads = api; api._register(root.MCD); }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var MSG_PREFIX = 'mcd-leads|v1|';          // domain separation: the session key masks CIFs for this list only
  var FILE_PREFIX = 'mcd-leads-file|v1|';
  var MASK_HEX = 12;                         // 48 bits: < 1 in 50,000 chance of any clash among 100,000 CIFs
  var MIN_K = 5;                             // item 48: aggregated views hide groups smaller than 5
  var VALUE_SHARE = 0.2;                     // number columns: denied when ≥ 20% of the filled cells look personal
  var MAX_ISSUES = 2000;
  var CHUNK = 500;
  var NULL_KEY = '\u0000';

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function isDateObj(v) { return !!v && typeof v === 'object' && typeof v.getTime === 'function' && typeof v.getFullYear === 'function'; }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function fold(s) {
    var t = String(s == null ? '' : s).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t;
  }
  function err(code, message) { var e = new Error(message); e.code = code; e.name = 'LeadsError'; return e; }
  function copy(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; }); return r; }

  /* ================================================================ fields */

  var PRODUCTS = ['tabungan', 'giro', 'deposito', 'kpr', 'kartuKredit', 'livin', 'prioritas'];
  // Item 48 allowlist, as trimmed by D41 (no payroll segment, no remaining tenor, no flags of the two removed products).
  // Age and kecamatan are NOT approved: never add them back without a new decision recorded in item 49.
  var FIELDS = ['cif', 'kodeSatuan'].concat(PRODUCTS, ['saldo', 'penghasilan', 'kolektibilitas']);
  var STORED_FIELDS = ['key', 'sourceRow', 'fp', 'kodeSatuan'].concat(PRODUCTS, ['saldoBand', 'penghasilanBand', 'lancar']);
  var BAND_FIELDS = { saldoBand: 'saldo', penghasilanBand: 'penghasilan' };

  // Detector kinds: 'id' (the CIF), 'text' (short words and codes: strict), 'flag' / 'amount' / 'number'.
  var FIELD_KIND = { cif: 'id', kodeSatuan: 'text', kolektibilitas: 'text', saldo: 'amount', penghasilan: 'amount' };
  PRODUCTS.forEach(function (p) { FIELD_KIND[p] = 'flag'; });

  var FIELD_LABELS = {
    cif: 'CIF (disamarkan)', kodeSatuan: 'Kode satuan',
    tabungan: 'Tabungan', giro: 'Giro', deposito: 'Deposito', kpr: 'KPR',
    kartuKredit: 'Kartu Kredit', livin: 'Livin’ by Mandiri', prioritas: 'Prioritas',
    saldo: 'Saldo (disimpan sebagai kelompok)', penghasilan: 'Penghasilan atau gaji (disimpan sebagai kelompok)',
    kolektibilitas: 'Kolektibilitas (disimpan sebagai lancar ya/tidak)'
  };

  var FLAG_ALIASES = {
    tabungan: ['tabungan', 'tab', 'savings', 'saving', 'tabungan_mandiri'],
    giro: ['giro', 'current_account', 'ca', 'giro_mandiri'],
    deposito: ['deposito', 'depo', 'deposit', 'time_deposit', 'td'],
    kpr: ['kpr', 'kredit_pemilikan_rumah', 'kredit_rumah', 'mortgage', 'home_loan'],
    kartuKredit: ['kartu_kredit', 'kartukredit', 'credit_card', 'cc'],
    livin: ['livin', 'livin_by_mandiri', 'livin_mandiri', 'mobile_banking', 'mbanking', 'm_banking'],
    prioritas: ['prioritas', 'priority', 'mandiri_prioritas', 'nasabah_prioritas', 'priority_banking']
  };
  var SYN = {
    cif: ['cif', 'no_cif', 'nomor_cif', 'kode_cif', 'cif_no', 'cif_number', 'cif_nasabah', 'id_cif', 'nocif', 'cifno',
      'customer_id', 'cust_id', 'id_nasabah', 'nomor_nasabah', 'no_nasabah', 'customer_number', 'customer_no'],
    kodeSatuan: ['kode_satuan', 'kd_satuan', 'kodesatuan', 'kode_satker', 'kd_satker', 'satker', 'kode_kesatuan', 'kesatuan', 'satuan',
      'satuan_kerja', 'kode_unit', 'unit_kerja', 'kode_instansi', 'instansi', 'nama_satuan', 'nama_satker', 'nama_kesatuan', 'nama_instansi',
      'kode_korporasi', 'kode_payroll', 'kode_perusahaan', 'perusahaan', 'corporate_code', 'company_code'],
    saldo: ['saldo', 'saldo_akhir', 'saldo_total', 'total_saldo', 'saldo_dpk', 'dpk', 'total_dpk', 'total_dana', 'dana', 'dana_pihak_ketiga',
      'aum', 'balance', 'total_balance', 'ending_balance', 'saldo_rata_rata', 'saldo_rata2', 'avg_balance', 'average_balance', 'ratas',
      'ratas_saldo', 'rata_rata_saldo', 'saldo_rekening', 'account_balance', 'saldo_posisi', 'posisi_saldo'],
    penghasilan: ['penghasilan', 'penghasilan_bulanan', 'penghasilan_per_bulan', 'pendapatan', 'pendapatan_bulanan', 'income', 'monthly_income',
      'gaji', 'gaji_pokok', 'gaji_bersih', 'gaji_bulanan', 'gaji_kotor', 'salary', 'take_home_pay', 'thp', 'net_salary'],
    kolektibilitas: ['kolektibilitas', 'kolektabilitas', 'kol', 'kolek', 'kol_cif', 'kolektibilitas_cif', 'kol_terburuk', 'kol_tertinggi',
      'worst_kol', 'collectibility', 'collectability', 'coll', 'kualitas_kredit']
  };
  // Headers of fields item 48 did not approve (age, kecamatan). Not on the allowlist, so a file's column is ignored;
  // on the vault path they are on the deny list too (SCHEMA_DENY), so a stored row that carries one shows it removed.
  var NOT_APPROVED = ['usia', 'umur', 'age', 'usia_tahun', 'umur_tahun', 'usia_nasabah', 'umur_nasabah', 'usia_band', 'usiaband',
    'kecamatan', 'kec', 'nama_kecamatan', 'kecamatan_nasabah', 'district', 'subdistrict'];
  function flagForms(list) {
    var out = [];
    list.forEach(function (a) {
      out.push(a, 'flag_' + a, a + '_flag', 'punya_' + a, 'memiliki_' + a, 'has_' + a, 'produk_' + a, 'status_' + a, a + '_aktif', 'ada_' + a);
    });
    return out;
  }
  Object.keys(FLAG_ALIASES).forEach(function (f) { SYN[f] = flagForms(FLAG_ALIASES[f]); });
  var LOOKUP = {};
  FIELDS.forEach(function (f) { (SYN[f] || [f]).forEach(function (n) { if (!has(LOOKUP, n)) LOOKUP[n] = f; }); });
  // Headers of the fields D41 removed: such a column is reported "diabaikan" with REMOVED_WHY, never read or stored.
  var REMOVED_WHY = 'Kolom ini tidak digunakan oleh aturan daftar leads.';
  var REMOVED_SYN = {
    segmen: ['segmen', 'segment', 'segmentasi', 'segmen_nasabah', 'kategori_nasabah', 'jenis_nasabah', 'tipe_nasabah', 'kelompok_nasabah',
      'golongan_nasabah', 'jenis_payroll', 'status_payroll', 'segmen_payroll', 'kategori_payroll', 'tipe_payroll', 'customer_segment'],
    sisaTenor: ['sisa_tenor', 'sisa_tenor_ksm', 'tenor_sisa', 'sisa_tenor_bulan', 'sisa_jangka_waktu', 'sisa_jw', 'remaining_tenor',   // D41: header only
      'sisa_bulan', 'jatuh_tempo', 'jatuh_tempo_ksm', 'tgl_jatuh_tempo', 'tanggal_jatuh_tempo', 'maturity', 'maturity_date'],           // D41: header only
    serbaguna: flagForms(['ksm', 'kredit_serbaguna_mandiri', 'kredit_serba_guna_mandiri', 'kredit_serbaguna']),   // D41: removed product, header only
    kendaraan: flagForms(['kkb', 'kredit_kendaraan', 'kredit_kendaraan_bermotor', 'auto_loan', 'car_loan'])            // D41: removed product, header only
  };
  // Keys a mapping may still name from an older screen (D41): their column is reported with REMOVED_WHY.
  var REMOVED_FIELDS = { segmen: 1, sisaTenorKsm: 1, ksm: 1, kkb: 1 };   // D41: the four removed field names
  var REMOVED_LOOKUP = {};
  Object.keys(REMOVED_SYN).forEach(function (f) { REMOVED_SYN[f].forEach(function (n) { if (!has(LOOKUP, n) && !has(REMOVED_LOOKUP, n)) REMOVED_LOOKUP[n] = f; }); });

  /** Same normalisation as MCD.importer: lowercase, no diacritics, non-alphanumerics → '_', trimmed. */
  function normHeader(h) {
    return fold(h).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  /* --------------------------------------------------- deny by header name */

  var DENY_LABEL = {
    nama: 'nama', identitas: 'NIK, KTP, KK, NPWP atau paspor', alamat: 'alamat atau lokasi rinci', telepon: 'nomor telepon',
    email: 'alamat email', rekening: 'nomor rekening atau kartu', lahir: 'tanggal atau tempat lahir', ibu: 'nama ibu kandung',
    pegawai: 'nomor pegawai (NRP atau NIP)', rahasia: 'kata sandi, PIN atau token', biometrik: 'foto, tanda tangan atau sidik jari',
    kendaraan: 'nomor polisi atau data kendaraan', lokasi: 'koordinat atau lokasi', keluarga: 'data keluarga atau ahli waris',
    perangkat: 'nomor perangkat (IMEI atau ID perangkat)'
  };
  var NAMA_OK = 'satuan|kesatuan|satker|unit|kantor|cabang|produk|segmen|kecamatan|kelurahan|kota|instansi|perusahaan|program|korporasi|company';
  // [why, pattern, exception]: matched on the normalised header, token by token ('_' boundaries).
  var HEADER_DENY = [
    ['nama', /(^|_)(nama|name|nm|fullname|full_name)(_|$)/, new RegExp('(^|_)(nama|name|nm)_(' + NAMA_OK + ')(_|$)')],
    ['nama', /^(nasabah|debitur|debitor|pemilik|customer|penerima|pemohon|atas_nama|an)$/],
    ['identitas', /(^|_)(nik|ktp|e_ktp|ektp|no_kk|nomor_kk|kartu_keluarga|paspor|passport|npwp|sim|kitas|identitas|id_card|identity|kependudukan)(_|$)/],
    ['email', /(^|_)(email|e_mail|surel|mail)(_|$)/],
    ['alamat', /(^|_)(alamat|address|addr|domisili|jalan|jl|rt|rw|rt_rw|kode_pos|kodepos|postcode|postal|zip|kelurahan|desa|kel|blok|gang)(_|$)/],
    ['telepon', /(^|_)(telp|tlp|telpon|telepon|telephone|tel|phone|hp|handphone|ponsel|wa|whatsapp|fax|faks|kontak|contact|msisdn|seluler|cellular|cell)(_|$)/],
    ['telepon', /^(no_|nomor_)?mobile(_no|_number|_phone)?$/],
    ['telepon', /(^|_)mobile_(phone|no|number)(_|$)/],
    ['rekening', /^(rek|rekening|norek|no_rek|nomor_rekening|norekening|account|acct|akun|no_akun|nomor_akun|account_no|account_number|acct_no)$/],
    ['rekening', /(^|_)(no|nomor|nmr|number|num|nr)_(rek|rekening|account|acct|akun|kartu|card|cc|atm|debit|va)(_|$)/],
    ['rekening', /(^|_)(rek|rekening|account|acct|kartu|card)_(no|nomor|number|num|nr)(_|$)/],
    ['rekening', /(^|_)(norek|noacc|pan|cvv|cvc|card_number|cardno|virtual_account|iban)(_|$)/],
    ['lahir', /(^|_)(lahir|ttl|dob|birth|birthday|birthdate|born)(_|$)/],
    ['ibu', /(^|_)(ibu|mother|gadis|maiden)(_|$)/],
    ['pegawai', /(^|_)(nrp|nip|nipp|npp|nopeg|no_pegawai|nomor_pegawai|nomor_induk|nik_pegawai|id_pegawai|employee_id|employee_no|nopers|no_personel|nomor_personel)(_|$)/],
    ['rahasia', /(^|_)(password|passwd|pass|pwd|pin|kata_sandi|sandi|otp|token|user_id|userid|username|user_name|login)(_|$)/],
    ['biometrik', /(^|_)(foto|photo|ttd|tanda_tangan|signature|sidik_jari|fingerprint|biometrik|biometric|selfie)(_|$)/],
    ['rekening', /(^|_)(rek|rekening|norek)(_|$)/, /(^|_)(saldo|balance)(_|$)/],
    ['nama', /(^|_)(pemilik|penanggung_jawab|inisial|initial|initials|panggilan|nickname)(_|$)/],
    ['pegawai', /(^|_)(registrasi_pokok|nomor_registrasi|no_registrasi|no_reg_pokok)(_|$)/],
    ['kendaraan', /(^|_)(nopol|no_pol|nomor_pol|plat|plat_nomor|nomor_plat|no_plat|tnkb|bpkb|stnk|license_plate|plate_number)(_|$)/],
    ['kendaraan', /(^|_)(no|nomor|nmr)_(polisi|kendaraan|rangka|mesin)(_|$)/],
    ['lokasi', /(^|_)(koordinat|coordinate|coordinates|coord|latitude|longitude|lat|lon|lng|latlon|latlng|lat_lon|lat_lng|gps|geotag|geolocation|geo|lokasi|location|titik)(_|$)/],
    ['keluarga', /(^|_)(ahli_waris|waris|pasangan|istri|isteri|suami|wali|keluarga|spouse|anak)(_|$)/],
    ['perangkat', /(^|_)(imei|device|device_id|perangkat|mac_address|android_id|ip)(_|$)/]
  ];
  // Joined spellings ("NAMANASABAH", "NOHP", "NIKNASABAH", "REKENINGTABUNGAN"): long words anywhere, short ones at the
  // start (after an optional no / nomor) or at the end. Joined forms of allowlisted synonyms are exempt.
  var JOINED_LONG = [['nama', 'nama'], ['alamat', 'alamat'], ['email', 'email'], ['lahir', 'lahir'], ['rekening', 'rekening'],
    ['norek', 'rekening'], ['npwp', 'identitas'], ['kependudukan', 'identitas'], ['koordinat', 'lokasi'], ['latitude', 'lokasi'],
    ['longitude', 'lokasi'], ['nopol', 'kendaraan'], ['ahliwaris', 'keluarga'], ['handphone', 'telepon'], ['telepon', 'telepon']];
  var JOINED_START = /^(?:no|nomor|nmr|nr)?(hp|nik|ktp|telp|tlp)/, JOINED_END = /(hp|nik|ktp|telp|tlp)$/;
  var JOINED_NM = /^nm(lengkap|nasabah|debitur|debitor|pemilik|cust|customer|ibu)/;
  var SHORT_WHY = { hp: 'telepon', telp: 'telepon', tlp: 'telepon', nik: 'identitas', ktp: 'identitas' };
  var JOINED_OK = {}, JOINED_FIELD = {}, JOINED_REMOVED = {};
  Object.keys(LOOKUP).forEach(function (n) {
    var j = n.replace(/_/g, '');
    JOINED_OK[j] = 1;
    if (!has(JOINED_FIELD, j)) JOINED_FIELD[j] = LOOKUP[n];
  });
  Object.keys(REMOVED_LOOKUP).forEach(function (n) {
    var j = n.replace(/_/g, '');
    JOINED_OK[j] = 1;
    if (!has(JOINED_FIELD, j) && !has(JOINED_REMOVED, j)) JOINED_REMOVED[j] = REMOVED_LOOKUP[n];
  });
  ['nama', 'name', 'nm'].forEach(function (p) { NAMA_OK.split('|').forEach(function (w) { JOINED_OK[p + w] = 1; }); });
  /** The spellings a header is checked under: as written, camelCase and digits split, dotted acronyms joined, digit suffix gone. */
  function headerForms(h) {
    var raw = String(h == null ? '' : h);
    var split = raw.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .replace(/([A-Za-z])(\d)/g, '$1_$2').replace(/(\d)([A-Za-z])/g, '$1_$2');
    var toks = normHeader(split).split('_'), out = [], run = '';
    toks.forEach(function (t) {                         // n_i_k → nik, k_t_p → ktp, a_n → an
      if (/^[a-z]$/.test(t)) { run += t; return; }
      if (run) { out.push(run); run = ''; }
      if (t) out.push(t);
    });
    if (run) out.push(run);
    var s = out.join('_'), t = s.replace(/(_\d+)+$/, '');
    var forms = [normHeader(raw)];
    [s, t].forEach(function (f) { if (f && forms.indexOf(f) < 0) forms.push(f); });
    return { forms: forms.filter(Boolean), joined: t.replace(/_/g, '') };
  }
  /** headerDenied(header) → {why, label} | null. Deny always wins over the allowlist and over the user's mapping. */
  function headerDenied(h) {
    var f = headerForms(h), why = null;
    if (!f.forms.length) return null;
    for (var j = 0; j < f.forms.length && !why; j++) {
      var n = f.forms[j];
      for (var i = 0; i < HEADER_DENY.length; i++) {
        var r = HEADER_DENY[i];
        if (r[1].test(n) && !(r[2] && r[2].test(n))) { why = r[0]; break; }
      }
    }
    var x = f.joined;
    if (!why && x && !has(JOINED_OK, x)) {
      for (var k = 0; k < JOINED_LONG.length && !why; k++) if (x.indexOf(JOINED_LONG[k][0]) >= 0) why = JOINED_LONG[k][1];
      var m = !why && (JOINED_START.exec(x) || (!/thp$/.test(x) && JOINED_END.exec(x)));
      if (m) why = SHORT_WHY[m[1]];
      if (!why && JOINED_NM.test(x)) why = 'nama';
    }
    return why ? { why: why, label: DENY_LABEL[why] } : null;
  }
  function lookupHeader(h, table, joined) {
    var f = headerForms(h), forms = f.forms;
    for (var i = 0; i < forms.length; i++) {
      var n = forms[i];
      if (has(table, n)) return table[n];
      var t = n.replace(/_(y_n|yn|ya_tidak|1_0|flag|rp|idr|rupiah|th|thn|tahun|bln|bulan)$/, '');
      if (t !== n && has(table, t)) return table[t];
    }
    return f.joined && has(joined, f.joined) ? joined[f.joined] : null;
  }
  /** fieldForHeader(header) → allowlisted field | null (exact synonyms; "KPR (Y/N)", "Saldo (Rp)", "SaldoAkhir", "NAMASATKER" too). */
  function fieldForHeader(h) {
    if (headerDenied(h)) return null;
    return lookupHeader(h, LOOKUP, JOINED_FIELD);
  }
  /** removedForHeader(header) → the name of a field D41 removed when the header names one, else null. */
  function removedForHeader(h) {
    if (headerDenied(h)) return null;
    return lookupHeader(h, REMOVED_LOOKUP, JOINED_REMOVED);
  }

  /* ---------------------------------------------------- deny by cell value */

  var DETECTORS = { nik: 'NIK', telepon: 'nomor telepon', email: 'alamat email', rekening: 'nomor rekening atau kartu',
    nomor: 'nomor induk atau nomor identitas panjang', nopol: 'nomor polisi kendaraan', lokasi: 'koordinat',
    nama: 'nama orang', unik: 'isi yang berbeda untuk hampir setiap nasabah' };
  var PLATE_RE = /^[A-Z]{1,2}[ \-]?\d{1,4}[ \-]?[A-Z]{1,3}$/;          // B 1234 XYZ, B-1234-XY, AB1234C
  var COORD_RE = /^-?\d{1,3}\.\d{3,}\s*[,; ]\s*-?\d{1,3}\.\d{3,}$|^-?\d{1,3}\.\d{4,}$/;
  var EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  var MOBILE_RE = /^(?:62|0)8[1-9]\d{6,10}$/;          // 08xx / 628xx mobile numbers
  var BARE_MOBILE_RE = /^8[1-9]\d{7,10}$/;             // a mobile number that lost its leading 0 in Excel
  var BARE_MOBILE_NUM_RE = /^8[1-9]\d{8,10}$/;         // the same in number columns: 10-12 digits only (Rp 850 jt is not a phone)
  var LAND_RE = /^(?:62|0)(?:2[1-9]|[3-9]\d)\d{6,9}$/; // 021-xxxx, 0251-xxxx …
  /** 16 digits shaped like an NIK (or a KK number): province 11-94, day 01-31 or 41-71, month 01-12. */
  function nikShape(d) {
    if (d.length !== 16) return false;
    var p = +d.slice(0, 2), dd = +d.slice(6, 8), mm = +d.slice(8, 10);
    return p >= 11 && p <= 94 && ((dd >= 1 && dd <= 31) || (dd >= 41 && dd <= 71)) && mm >= 1 && mm <= 12;
  }
  function digitsVerdict(d, plus, formatted, kind) {
    var n = d.length, lead0 = d.charAt(0) === '0';
    if (n === 16 && nikShape(d)) return 'nik';
    if (kind === 'id') return (plus || formatted) && (MOBILE_RE.test(d) || LAND_RE.test(d)) ? 'telepon' : null;
    if (MOBILE_RE.test(d)) return 'telepon';
    if ((lead0 || plus) && LAND_RE.test(d)) return 'telepon';
    if (kind === 'text') {
      if (BARE_MOBILE_RE.test(d)) return 'telepon';
      if (n >= 17) return 'nomor';                   // NIP (18 digits) and other long ID numbers
      return n >= 10 ? 'rekening' : null;
    }
    // flag / amount / number columns: amounts of Rp 1 M - 999 M have 10-12 digits and are fine
    if (n >= 17) return 'nomor';
    if (lead0 && n >= 9) return 'rekening';          // an amount never starts with 0
    if (n >= 13 && n <= 16) return 'rekening';       // ≥ Rp 1 T: an account or card number
    if (BARE_MOBILE_NUM_RE.test(d)) return 'telepon'; // counts toward the 20% share only
    return null;
  }
  var DATE_TIME_RE = /\b\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?)?|\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
  /**
   * classifyValue(v, kind) → null | 'nik' | 'telepon' | 'email' | 'rekening' | 'nomor' | 'nopol' | 'lokasi'.
   * kind: 'id' (CIF: NIK, e-mail and formatted phone numbers only), 'text' (strict: any run of 10 or more digits,
   * number plates, coordinates), 'flag' | 'amount' | 'number'.
   */
  function classifyValue(v, kind) {
    if (v == null || typeof v === 'boolean' || isDateObj(v)) return null;
    if (typeof v === 'number') {
      if (!isFinite(v)) return null;
      if (Math.floor(v) !== v) return kind === 'text' && COORD_RE.test(String(v)) ? 'lokasi' : null;
      return digitsVerdict(Math.abs(v).toFixed(0), false, false, kind);
    }
    var s = String(v).trim();
    if (!s) return null;
    if (EMAIL_RE.test(s)) return 'email';
    var p = s.replace(/[\s\-()]/g, ''), plus = p.charAt(0) === '+', d = plus ? p.slice(1) : p;
    if (/^\d+$/.test(d)) return digitsVerdict(d, plus, p !== s, kind);
    if (kind !== 'text') return null;
    if (PLATE_RE.test(s.toUpperCase().replace(/\s+/g, ' '))) return 'nopol';
    if (COORD_RE.test(s)) return 'lokasi';
    var runs = s.replace(DATE_TIME_RE, ' ').match(/\+?\d[\d\s\-().]{7,}\d/g) || [];
    for (var i = 0; i < runs.length; i++) {
      var rd = runs[i].replace(/\D/g, '');
      if (rd.length < 9) continue;
      var x = digitsVerdict(rd, runs[i].charAt(0) === '+', true, 'text');
      if (x) return x;
    }
    return null;
  }
  /**
   * scanColumn(values, kind) → {filled, hits: {nik, telepon, email, rekening}, total, denied, detector}.
   * Denied: any e-mail; in 'text' columns any hit; in the CIF and number columns ≥ 20% of the filled cells.
   */
  function scanColumn(values, kind) {
    var hits = { nik: 0, telepon: 0, email: 0, rekening: 0, nomor: 0, nopol: 0, lokasi: 0 }, filled = 0, total = 0;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v == null || (typeof v === 'string' && !v.trim())) continue;
      filled++;
      var x = classifyValue(v, kind);
      if (x) { hits[x]++; total++; }
    }
    var denied = hits.email > 0 || (kind === 'text' || !kind ? total > 0 : total > 0 && total >= Math.ceil(VALUE_SHARE * filled));
    var det = null;
    Object.keys(hits).forEach(function (k) { if (hits[k] && (!det || hits[k] > hits[det])) det = k; });
    return { filled: filled, hits: hits, total: total, denied: denied, detector: denied ? det : null };
  }

  /* ================================================================= mapping */

  function sheetOk(sheet) { return !!sheet && Array.isArray(sheet.headers) && Array.isArray(sheet.rows); }
  function colValues(sheet, c) { var out = new Array(sheet.rows.length); for (var i = 0; i < sheet.rows.length; i++) out[i] = (sheet.rows[i] || [])[c]; return out; }
  function deniedWhy(d) { return 'Judul kolom menunjukkan data pribadi (' + d.label + ').'; }
  function valueWhy(scan) {
    if (scan.detector === 'unik') return 'Isi kolom berbeda untuk hampir setiap nasabah, jadi bukan kode satuan (' + fmtInt(scan.total) + ' nilai).';
    return 'Isi kolom terlihat seperti ' + DETECTORS[scan.detector] + ' (' + fmtInt(scan.total) + (scan.detector === 'nama' ? ' nilai).' : ' sel).');
  }
  var IGNORED_WHY = 'Tidak termasuk data yang boleh disimpan.';
  var HEADERLESS_WHY = 'Baris pertama terlihat seperti data nasabah, bukan judul kolom.';

  function columnEntry(i, header, field, status, why, scan) {
    var o = { col: i, header: str(header), field: field || null, status: status, why: why || null, detector: null, hits: 0 };
    if (scan && scan.denied) { o.detector = scan.detector; o.hits = scan.total; }
    return o;
  }
  /** A header that is really a cell value: an NIK, phone, e-mail, account, plate, coordinate, date or plain number. */
  function valueLikeHeader(h) {
    var s = str(h);
    if (!s) return false;
    if (classifyValue(s, 'text')) return true;
    return /\d/.test(s) && /^[\d\s.,:\/\-+()]+$/.test(s);
  }

  /* -------------------------------------------- kode satuan: column checks */

  // Words that mark a unit, office or company name (not a person's name). Roman numerals count too (LANTAMAL III).
  var ORG_WORDS = ('TNI AD AL AU POLRI POLDA POLRES POLSEK KODAM KODIM KOREM KORAMIL KOSTRAD KOPASSUS KORMAR MARINIR PASMAR ' +
    'YON YONIF YONKAV YONARMED YONZIPUR BRIGIF DEN DENMA DENPOM POM PUSPOM SAT SATKER SATUAN LANTAMAL LANAL LANUD KOARMADA ' +
    'KOOPSUD KOOPSAU KOHANUDNAS KOGABWILHAN MABES MABESAD MABESAL MABESAU PUSKES RS RSPAD RSAL RSAU RUMKIT BAIS BAKAMLA KEMHAN ' +
    'KEMENHAN DITJEN DIT DINAS DIS PUS PUSAT BADAN BALAI KANTOR KANWIL KEMENTERIAN SEKRETARIAT SETJEN BIRO BAGIAN UNIT CABANG ' +
    'WILAYAH PERWAKILAN PT CV TBK PERSERO PERUM PERUMDA BUMN BUMD KOPERASI YAYASAN SEKOLAH SD SMP SMA SMK MTS UNIVERSITAS INSTITUT ' +
    'POLITEKNIK AKADEMI AKMIL SESKO SESKOAD KODIKLAT PUSDIK RINDAM KESDAM ZIDAM HUBDAM PALDAM BEKANG AJENDAM KUDAM TOPDAM PENDAM ' +
    'ARMED KAVALERI ZENI ARHANUD BANK GROUP GRUP HOLDING INDONESIA NUSANTARA KOMANDO PANGKALAN KOMPI BATALYON BRIGADE RESIMEN ' +
    'DETASEMEN SKUADRON WING DIVISI KORPS ARMADA GUGUS PANGKOSTRAD INSPEKTORAT STAF PUSPEN PUSINFOLAHTA').split(' ');
  var ORG = {};
  ORG_WORDS.forEach(function (w) { ORG[w] = 1; });
  /** A unit code that reads like a person's name: 2-4 plain words, at least two of 3+ letters, no unit word or numeral. */
  function nameLike(code) {
    var w = str(code).split(' '), longW = 0;
    if (w.length < 2 || w.length > 4) return false;
    for (var i = 0; i < w.length; i++) {
      if (!/^[A-Z]+$/.test(w[i]) || has(ORG, w[i]) || /^[IVXL]+$/.test(w[i])) return false;
      if (w[i].length >= 3) longW++;
    }
    return longW >= 2;
  }
  /**
   * codeColumnCheck(values) → {denied, detector, total}: a kode satuan column is denied when at least half of its
   * different values read like names (and values rarely repeat), or when nearly every customer has a value of their
   * own (more than 20 values for more than half of the rows, or 10 or more rows all different). Unit codes repeat.
   */
  function codeColumnCheck(values) {
    var filled = 0, seen = {}, distinct = 0, names = 0;
    for (var i = 0; i < values.length; i++) {
      var c = cleanCode(values[i]);
      if (!c) continue;
      filled++;
      if (has(seen, c)) continue;
      seen[c] = 1; distinct++;
      if (nameLike(c)) names++;
    }
    if (distinct >= 3 && names * 2 >= distinct && distinct * 10 >= filled * 3) return { denied: true, detector: 'nama', total: names };
    if ((distinct > 20 && distinct * 2 > filled) || (filled >= 10 && distinct === filled)) return { denied: true, detector: 'unik', total: distinct };
    return { denied: false, detector: null, total: 0 };
  }

  /**
   * checkMapping(sheet, mapping) → {mapping: {field: colIndex}, columns: [{col, header, field, status, why, detector, hits}],
   * missing, ok, headerless}. mapping: {field: colIndex | header text}; null → the suggestion. Status 'dipakai' (kept),
   * 'ditolak' (personal data, dropped) or 'diabaikan' (not on the allowlist, dropped). A denied column stays denied whatever
   * the mapping says. When two or more headers look like cell values (a file without a header row), nothing is mapped,
   * ok is false and every column is reported as "Kolom N" only; a single such header is reported as "Kolom N" too.
   */
  function checkMapping(sheet, mapping) {
    if (!sheetOk(sheet)) throw err('BAD_SHEET', MESSAGES.BAD_SHEET);
    var looks = sheet.headers.map(valueLikeHeader), nLooks = looks.filter(Boolean).length;
    var label = function (h, i) { return looks[i] || nLooks >= 2 ? 'Kolom ' + (i + 1) : h; };
    if (nLooks >= 2) {
      return { mapping: {}, missing: ['cif'], ok: false, headerless: true, columns: sheet.headers.map(function (h, i) {
        return columnEntry(i, label(h, i), null, 'diabaikan', HEADERLESS_WHY);
      }) };
    }
    var auto = !mapping, want = {}, taken = {}, gone = {};
    if (auto) {
      sheet.headers.forEach(function (h, i) { var f = looks[i] ? null : fieldForHeader(h); if (f && !has(want, f)) want[f] = i; });
    } else {
      Object.keys(mapping).forEach(function (f) {
        var v = mapping[f], idx = typeof v === 'number' ? v : sheet.headers.indexOf(v);
        if (!(idx >= 0 && idx < sheet.headers.length) || Math.floor(idx) !== idx) return;
        if (has(REMOVED_FIELDS, f)) { gone[idx] = 1; return; }          // D41: a mapping from an older screen
        if (FIELDS.indexOf(f) < 0 || has(taken, idx)) return;
        want[f] = idx; taken[idx] = f;
      });
    }
    var byCol = {};
    Object.keys(want).forEach(function (f) { byCol[want[f]] = f; });
    var out = {}, columns = [];
    sheet.headers.forEach(function (h, i) {
      if (!str(h) && !has(byCol, i)) return;
      var f = has(byCol, i) ? byCol[i] : null, d = headerDenied(h), lab = label(h, i);
      if (d) { columns.push(columnEntry(i, lab, f, 'ditolak', deniedWhy(d))); return; }
      var vals = colValues(sheet, i), scan = scanColumn(vals, f ? FIELD_KIND[f] : 'text');
      if (!scan.denied && f === 'kodeSatuan') scan = codeColumnCheck(vals);
      if (scan.denied) { columns.push(columnEntry(i, lab, f, 'ditolak', valueWhy(scan), scan)); return; }
      if (f) { out[f] = i; columns.push(columnEntry(i, lab, f, 'dipakai', FIELD_LABELS[f])); return; }
      var removed = has(gone, i) || (!looks[i] && nLooks < 2 && !!removedForHeader(h));
      columns.push(columnEntry(i, lab, null, 'diabaikan', removed ? REMOVED_WHY : IGNORED_WHY));
    });
    var missing = has(out, 'cif') ? [] : ['cif'];
    return { mapping: out, columns: columns, missing: missing, ok: !missing.length, headerless: false };
  }
  /** suggestMapping(sheet) → as checkMapping with the automatic header match (the user confirms or edits it). */
  function suggestMapping(sheet) { return checkMapping(sheet, null); }

  /* ========================================================== value parsing */

  function localeNumber(s, hasUnit) {
    if (!s) return null;
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
    if (dots && commas) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (commas) {
      s = commas > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (dots) {
      if (dots > 1 || (/^\d{1,3}\.\d{3}$/.test(s) && !hasUnit)) s = s.replace(/\./g, '');
    }
    var x = Number(s);
    return isFinite(x) ? x : null;
  }
  var UNIT = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6, m: 1e9, miliar: 1e9, milyar: 1e9, t: 1e12, triliun: 1e12 };
  /** Rupiah amount: 'Rp 12.500.000', '850jt', '1,2 M', 15000000 → number; '' → null; unreadable → undefined; negatives stay negative. */
  function parseAmount(v) {
    if (v == null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : undefined;
    if (typeof v === 'boolean' || isDateObj(v)) return undefined;
    var s = String(v).trim().toLowerCase().replace(/ /g, ' ');
    if (!s || s === '-' || s === '—') return null;
    var neg = /^\(.*\)$/.test(s) || /^[-−]/.test(s.replace(/^rp\.?\s*/, ''));
    s = s.replace(/[()]/g, '').replace(/rp\.?/g, '').replace(/^[-−]\s*/, '').replace(/[,.]-$/, '').trim();
    var m = /^([\d.,\s]+?)\s*([a-z]+)?\.?$/.exec(s);
    if (!m) return undefined;
    var unit = m[2] || '', mult = 1;
    if (unit) { if (!has(UNIT, unit)) return undefined; mult = UNIT[unit]; }
    var x = localeNumber(m[1].replace(/\s+/g, ''), !!unit);
    if (x == null) return undefined;
    x *= mult;
    return neg ? -x : x;
  }
  var FLAG_TRUE = /^(y|ya|yes|1|true|benar|aktif|active|ada|punya|memiliki|ok|v|✓|✔)$/i;
  var FLAG_FALSE = /^(n|no|tidak|tdk|t|0|false|salah|nonaktif|non aktif|non-aktif|tidak aktif|inactive|tidak ada|belum|belum ada|belum punya|lunas|tutup|closed|-|—)$/i;
  /** Product flag: Y/N, Ya/Tidak, 1/0, Aktif/Lunas, an amount (> 0 = yes) → true | false; '' → null; unreadable → undefined. */
  function parseFlag(v) {
    if (v == null) return null;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return isFinite(v) ? v > 0 : undefined;
    var s = String(v).trim().replace(/\s+/g, ' ');
    if (!s) return null;
    if (FLAG_TRUE.test(s)) return true;
    if (FLAG_FALSE.test(s)) return false;
    var x = parseAmount(s);
    return isNum(x) ? x > 0 : undefined;
  }
  /** Kolektibilitas → true (Kol 1, Lancar) | false (Kol 2-5, DPK, Kurang Lancar, Diragukan, Macet); '' or 0 → null; unknown → undefined. */
  function parseKol(v) {
    if (v == null || typeof v === 'boolean' || isDateObj(v)) return v == null ? null : undefined;
    if (typeof v === 'number') {
      if (v === 0) return null;
      if (v === 1) return true;
      return v >= 2 && v <= 5 && Math.floor(v) === v ? false : undefined;
    }
    var s = fold(v).replace(/\s+/g, ' ').trim();
    if (!s || s === '-') return null;
    var s2 = s.replace(/^(kolektibilitas|kolektabilitas|kolek|kol|coll)\.?\s*/, '');
    if (/^[1-5]$/.test(s2)) return s2 === '1';
    if (s2 === '0') return null;
    if (/kurang ?lancar|tidak ?lancar|perhatian khusus|^dpk$|diragukan|macet|(^| )npl( |$)|special mention|sub ?standard|doubtful|(^| )loss( |$)|bermasalah/.test(s)) return false;
    if (/^(l|lancar|current|pass|performing|baik)$/.test(s2)) return true;
    return undefined;
  }
  function ymdOf(v) {
    if (isDateObj(v)) return isNaN(v.getTime()) ? null : [v.getFullYear(), v.getMonth() + 1, v.getDate()];
    var s = str(v), m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return [+m[1], +m[2], +m[3]];
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);            // Indonesian day-month-year, never MM/DD
    if (m) return [+m[3], +m[2], +m[1]];
    return null;
  }
  function validYmd(p) { return !!p && p[1] >= 1 && p[1] <= 12 && p[2] >= 1 && p[2] <= 31 && p[0] >= 1990 && p[0] <= 2100; }
  /**
   * Kode satuan: a short code or unit name as written (≤ 40 characters, letters, digits, space . / - & ( )).
   * Dates, decimal numbers (coordinates), number plates and personal numbers are not unit codes (undefined).
   */
  function cleanCode(v) {
    if (v == null) return null;
    if (typeof v === 'boolean' || isDateObj(v)) return undefined;
    var s = typeof v === 'number' ? (isFinite(v) && Math.floor(v) === v ? v.toFixed(0) : '') : fold(v).toUpperCase();
    s = s.trim().replace(/\s+/g, ' ');
    if (!s || s === '-') return null;
    if (s.length > 40 || !/^[A-Z0-9][A-Z0-9 .\/\-&()]*$/.test(s)) return undefined;
    if (/^\d+[.,]\d+$/.test(s) || /^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(s)) return undefined;
    return classifyValue(s, 'text') ? undefined : s;
  }
  /** CIF → {cif} (upper case, no spaces, dashes or dots; leading zeros dropped from all-digit CIFs) | {code}. */
  function cifOf(v) {
    if (v == null) return { code: 'CIF_KOSONG' };
    var s;
    if (typeof v === 'number') {
      if (!isFinite(v) || v < 0 || Math.floor(v) !== v) return { code: 'CIF_TIDAK_VALID' };
      s = v.toFixed(0);
    } else {
      s = String(v).trim();
      if (/^\d+(?:[.,]\d+)?e\+?\d+$/i.test(s)) return { code: 'CIF_NOTASI_ILMIAH' };
    }
    s = s.toUpperCase().replace(/[\s\-.]/g, '');
    if (!s) return { code: 'CIF_KOSONG' };
    if (!/^[A-Z0-9]{3,32}$/.test(s)) return { code: 'CIF_TIDAK_VALID' };
    if (/^\d+$/.test(s)) s = s.replace(/^0+(?=\d)/, '');
    return { cif: s };
  }
  function normCif(v) { var c = cifOf(v); return c.cif || null; }

  /* ============================================================== settings */

  // Display bands are descriptive, not bank policy. Policy numbers (the Prioritas threshold and the
  // minimum income for KPR) start as null: the branch enters them, and they live in the vault.
  // D41: the minimum income of the removed vehicle loan and the top-up tenor are gone; older settings that carry
  // them load without them (normSettings ignores unknown keys).
  var DEFAULTS = {
    enabled: false,                // the switch in Data & Privasi; ships OFF (item 49)
    prioritasThreshold: null,      // Rp: saldo for Mandiri Prioritas (branch setting)
    kprMinIncome: null,            // Rp a month: calonKpr needs an income band at or above this (branch setting)
    incomeEdges: [5e6, 10e6, 20e6, 50e6],
    kolUnknownOk: false,           // true: a blank kolektibilitas counts as lancar for calonKpr (V7 D31: off by default)
    k: MIN_K                       // smallest group shown; never below 5 (complementary hiding is always on)
  };
  var NUM_OR_NULL = { prioritasThreshold: 1, kprMinIncome: 1 };
  var EDGE_KEYS = { incomeEdges: 1 };
  var BOOL_KEYS = { enabled: 1, kolUnknownOk: 1 };
  function edges(a) {
    if (!Array.isArray(a)) return null;
    var out = [];
    a.forEach(function (x) { if (isNum(x) && x > 0 && out.indexOf(x) < 0) out.push(x); });
    out.sort(function (p, q) { return p - q; });
    return out.length <= 12 ? out : null;
  }
  /** normSettings(patch, base?) → a full, valid settings object (unknown keys and bad values ignored). */
  function normSettings(patch, base) {
    var o = copy(base || DEFAULTS);
    if (!patch) return o;
    Object.keys(patch).forEach(function (k) {
      if (!has(DEFAULTS, k)) return;
      var v = patch[k];
      if (has(BOOL_KEYS, k)) { if (typeof v === 'boolean') o[k] = v; return; }
      if (has(NUM_OR_NULL, k)) { if (v === null || (isNum(v) && v > 0)) o[k] = v; return; }
      if (has(EDGE_KEYS, k)) { var e = edges(v); if (e) o[k] = e; return; }
      if (k === 'k') { if (isNum(v)) o[k] = Math.max(MIN_K, Math.round(v)); }
    });
    return o;
  }
  var CFG = normSettings(null);
  var SESSION = { key: null };
  function settings() { return copy(CFG); }
  /** configure(patch) → settings; configure() resets to the defaults (switch off). */
  function configure(patch) { CFG = patch ? normSettings(patch, CFG) : normSettings(null); return settings(); }
  function enabled() { return CFG.enabled === true; }
  function setEnabled(on) { CFG.enabled = on === true; return CFG.enabled; }
  function S(s) { return s ? normSettings(s, CFG) : CFG; }
  function kOf(s) { return Math.max(MIN_K, (s && isNum(s.k)) ? Math.round(s.k) : MIN_K); }

  /* ================================================================= bands */

  var NEAR = ['lt50', '50to80', '80to100', 'gte100'];
  var NEAR_LABEL = { lt50: '< 50% ambang Prioritas', '50to80': '50–80% ambang Prioritas', '80to100': '80–100% ambang Prioritas', gte100: '≥ ambang Prioritas' };
  /** nearPrioritas(saldo, threshold) → 'lt50' | '50to80' | '80to100' | 'gte100' | null (no threshold or no saldo). */
  function nearPrioritas(saldo, threshold) {
    if (!isNum(saldo) || saldo < 0 || !isNum(threshold) || threshold <= 0) return null;
    var a = saldo * 100;                                  // integer comparison: no rounding at the edges
    if (a < threshold * 50) return 'lt50';
    if (a < threshold * 80) return '50to80';
    if (a < threshold * 100) return '80to100';
    return 'gte100';
  }
  /** edgesFor(field, settings) → the cut points used at import (policy minimums are merged in, so rules stay exact). */
  function edgesFor(field, s) {
    s = S(s);
    if (field === 'penghasilanBand') return edges(s.incomeEdges.concat([s.kprMinIncome].filter(isNum))) || [];
    return [];
  }
  function idOf(lo, hi) { return (lo == null ? '' : lo.toFixed(0)) + '-' + (hi == null ? '' : hi.toFixed(0)); }
  /** bandOf(field, value, settings) → band id ('5000000-10000000', '-5000000', '50000000-', 'lt50' …) | null (unknown field → null). */
  function bandOf(field, v, s) {
    s = S(s);
    if (field === 'saldoBand') return nearPrioritas(v, s.prioritasThreshold);
    if (!isNum(v) || v < 0) return null;
    var e = edgesFor(field, s), lo = null, hi = null;
    if (!e.length) return null;
    for (var i = 0; i < e.length; i++) {
      if (v < e[i]) { hi = e[i]; break; }
      lo = e[i];
    }
    return idOf(lo, hi);
  }
  /** bandBounds('5000000-10000000') → {lo: 5000000, hi: 10000000}; open ends are null; invalid → null. */
  function bandBounds(id) {
    var m = /^(\d+)?-(\d+)?$/.exec(str(id));
    if (!m || (m[1] == null && m[2] == null)) return null;
    var lo = m[1] == null ? null : +m[1], hi = m[2] == null ? null : +m[2];
    return lo != null && hi != null && lo >= hi ? null : { lo: lo, hi: hi };
  }
  function validBand(field, id) {
    if (id == null) return null;
    if (field === 'saldoBand') return NEAR.indexOf(id) >= 0 ? id : null;
    return typeof id === 'string' && bandBounds(id) ? id : null;
  }
  function numId(x, d) { var r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d); return String(r).replace('.', ','); }
  function rpShort(x) {
    if (x >= 1e12) return { n: numId(x / 1e12, 1), u: 'T' };
    if (x >= 1e9) return { n: numId(x / 1e9, 1), u: 'M' };
    if (x >= 1e6) return { n: numId(x / 1e6, 1), u: 'jt' };
    if (x >= 1e3) return { n: numId(x / 1e3, 0), u: 'rb' };
    return { n: fmtInt(x), u: '' };
  }
  function rpText(x) { var p = rpShort(x); return 'Rp ' + p.n + (p.u ? ' ' + p.u : ''); }
  /** bandLabel(field, id) → plain Indonesian ('Rp 5–10 jt', '80–100% ambang Prioritas'). */
  function bandLabel(field, id) {
    if (id == null) return 'Tidak diketahui';
    if (field === 'saldoBand') return NEAR_LABEL[id] || 'Tidak diketahui';
    var b = bandBounds(id);
    if (!b) return 'Tidak diketahui';
    if (field === 'penghasilanBand') {
      if (b.lo == null) return '< ' + rpText(b.hi);
      if (b.hi == null) return '≥ ' + rpText(b.lo);
      var a = rpShort(b.lo), z = rpShort(b.hi);
      return a.u === z.u ? 'Rp ' + a.n + '–' + z.n + (a.u ? ' ' + a.u : '') : rpText(b.lo) + '–' + z.n + (z.u ? ' ' + z.u : '');
    }
    return 'Tidak diketahui';
  }

  /* ========================================================= stored records */

  function blankRecord() { var o = {}; STORED_FIELDS.forEach(function (k) { o[k] = null; }); return o; }
  function bool3(v) { return v === true ? true : (v === false ? false : null); }
  /**
   * sanitizeStored(obj) → a record with exactly STORED_FIELDS, or null when the masked key or the row number is
   * not valid. Anything else in obj (an age band, a kecamatan, and the four fields D41 removed) is dropped; values are re-checked one by
   * one: a unit code that is a personal number, a number plate, a date or a decimal number is dropped. Checks that
   * need the whole column (unit codes that read like names, or one per customer: codeColumnCheck) run in apply()
   * and on the vault path (importer type 'leads').
   */
  function sanitizeStored(o) {
    if (!o || typeof o !== 'object') return null;
    var key = str(o.key).toLowerCase(), row = typeof o.sourceRow === 'string' ? Number(o.sourceRow) : o.sourceRow;
    if (!/^[0-9a-f]{12}$/.test(key) || !isNum(row) || row < 1 || Math.floor(row) !== row) return null;
    var r = blankRecord();
    r.key = key;
    r.sourceRow = row;
    r.fp = /^[0-9a-f]{12}$/.test(str(o.fp).toLowerCase()) ? str(o.fp).toLowerCase() : null;
    var code = o.kodeSatuan == null ? null : cleanCode(o.kodeSatuan);
    r.kodeSatuan = code && !classifyValue(code, 'text') ? code : null;
    PRODUCTS.forEach(function (p) { var f = parseFlag(o[p]); r[p] = f === true || f === false ? f : null; });
    Object.keys(BAND_FIELDS).forEach(function (b) { r[b] = validBand(b, o[b]); });
    r.lancar = bool3(typeof o.lancar === 'string' ? parseFlag(o.lancar) : o.lancar);
    return r;
  }

  /* ================================================================ crypto */

  function cryptoOf(c) {
    var x = c || (root && root.crypto) || null;
    return x && x.subtle && typeof x.subtle.sign === 'function' ? x : null;
  }
  function utf8(s) {
    if (root && typeof root.TextEncoder === 'function') return new root.TextEncoder().encode(s);
    var out = [], i, c;
    s = unescape(encodeURIComponent(s));
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); out.push(c); }
    return new Uint8Array(out);
  }
  function hex(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }
  function isBytes(x) { return !!x && (ArrayBuffer.isView(x) || Object.prototype.toString.call(x) === '[object ArrayBuffer]'); }
  function isHmacKey(x) {
    return !!x && typeof x === 'object' && x.type === 'secret' && x.algorithm && x.algorithm.name === 'HMAC' &&
      Array.isArray(x.usages) && x.usages.indexOf('sign') >= 0;
  }
  /** Raw key bytes (≥ 16) or an HMAC CryptoKey → Promise<CryptoKey> (imported non-extractable). Text is refused. */
  function resolveKey(key, c) {
    if (key == null) key = SESSION.key;
    if (key == null) return Promise.reject(err('NO_KEY', MESSAGES.NO_KEY));
    if (isHmacKey(key)) return Promise.resolve(key);
    if (isBytes(key) && key.byteLength >= 16) {
      return Promise.resolve(c.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']));
    }
    return Promise.reject(err('BAD_KEY', MESSAGES.BAD_KEY));
  }
  function sign(c, ck, cif) { return c.subtle.sign('HMAC', ck, utf8(MSG_PREFIX + cif)).then(function (b) { return hex(b).slice(0, MASK_HEX); }); }
  /** mask(cif, key, crypto?) → Promise<12 hex chars> (null for an empty or invalid CIF). */
  function mask(cif, key, crypto) {
    var c = cryptoOf(crypto);
    if (!c) return Promise.reject(err('NO_WEBCRYPTO', MESSAGES.NO_WEBCRYPTO));
    var n = normCif(cif);
    return resolveKey(key, c).then(function (ck) { return n ? sign(c, ck, n) : null; });
  }
  /** setKey(key, crypto?) → Promise<true>: keeps the session's HMAC key in memory only (dropped by reset and on lock). */
  function setKey(key, crypto) {
    var c = cryptoOf(crypto);
    if (!c) return Promise.reject(err('NO_WEBCRYPTO', MESSAGES.NO_WEBCRYPTO));
    if (key == null) return Promise.reject(err('NO_KEY', MESSAGES.NO_KEY));
    return resolveKey(key, c).then(function (ck) { SESSION.key = ck; return true; });
  }
  function hasKey() { return !!SESSION.key; }
  /** newKeyBytes(crypto?) → 32 random bytes for the vault to keep (inside the encrypted payload only). */
  function newKeyBytes(crypto) {
    var c = crypto || (root && root.crypto);
    if (!c || typeof c.getRandomValues !== 'function') throw err('NO_WEBCRYPTO', MESSAGES.NO_WEBCRYPTO);
    return c.getRandomValues(new Uint8Array(32));
  }
  /** fingerprint({name, size}, rows, crypto?) → Promise<{name, size, rows, fp}>: fp = SHA-256(name|size|rows), 12 hex. */
  function fingerprint(file, rows, crypto) {
    var c = cryptoOf(crypto);
    if (!c) return Promise.reject(err('NO_WEBCRYPTO', MESSAGES.NO_WEBCRYPTO));
    var name = str(file && file.name) || 'file', size = file && isNum(file.size) ? file.size : null, n = isNum(rows) ? rows : 0;
    return c.subtle.digest('SHA-256', utf8(FILE_PREFIX + name + '|' + (size == null ? '' : size) + '|' + n)).then(function (b) {
      return { name: name, size: size, rows: n, fp: hex(b).slice(0, MASK_HEX) };
    });
  }

  /* ================================================================ import */

  var MESSAGES = {
    LEADS_OFF: 'Impor daftar leads belum aktif. Aktifkan dahulu di Data & Privasi.',
    NO_KEY: 'Kunci penyamaran CIF belum tersedia. Buka kunci dashboard, lalu coba lagi.',
    BAD_KEY: 'Kunci penyamaran CIF tidak valid. Kunci harus berupa byte acak dari brankas, minimal 16 byte.',
    NO_WEBCRYPTO: 'Browser ini tidak mendukung penyamaran CIF. Gunakan Chrome atau Edge versi terbaru.',
    BAD_SHEET: 'File tidak dapat dibaca sebagai tabel. Pastikan formatnya CSV atau XLSX.',
    NO_DATA: 'Data dashboard belum siap. Muat ulang halaman, lalu coba lagi.',
    NO_RULE: 'Pilih aturan dahulu: daftar baris hanya tersedia per aturan (misalnya Calon KPR).',
    BAD_WHERE: 'Daftar hanya dapat dipersempit dengan satu kelompok: kode satuan atau satu kelompok angka.',
    NO_GROUPING: 'Pengelompokan ini tidak tersedia. Pilih kode satuan, saldo atau penghasilan.',
    NO_SUBGROUP: 'Rincian kelompok di dalam kelompok lain tidak tersedia, karena dapat membuka kelompok di bawah 5.'
  };
  var REASONS = {
    CIF_KOSONG: 'CIF kosong: baris dilewati.',
    CIF_TIDAK_VALID: 'Format CIF tidak dikenali: baris dilewati.',
    CIF_NOTASI_ILMIAH: 'CIF tertulis sebagai notasi ilmiah (misalnya 1,23E+12): simpan kolom CIF sebagai teks, lalu impor ulang.',
    CIF_GANDA: 'CIF muncul lebih dari sekali: digabung dengan baris pertama.',
    PRODUK_TIDAK_DIKENAL: 'Isi kolom produk tidak dikenali (gunakan Y/N atau 1/0): dibiarkan kosong.',
    ANGKA_TIDAK_VALID: 'Angka tidak dapat dibaca: dibiarkan kosong.',
    NILAI_NEGATIF: 'Nilai negatif: dibiarkan kosong.',
    KOL_TIDAK_DIKENAL: 'Kolektibilitas tidak dikenali (gunakan 1–5 atau Lancar): dibiarkan kosong.',
    KODE_SATUAN_TIDAK_VALID: 'Kode satuan terlalu panjang, berisi tanda yang tidak dikenali, atau terlihat seperti tanggal, angka desimal atau nomor pribadi: dibiarkan kosong.',
    KUNCI_BENTROK: 'Dua CIF berbeda menghasilkan kunci samaran yang sama: keduanya tetap disimpan terpisah.'
  };
  var CODE_FOR = { kodeSatuan: 'KODE_SATUAN_TIDAK_VALID', kolektibilitas: 'KOL_TIDAK_DIKENAL' };
  PRODUCTS.forEach(function (p) { CODE_FOR[p] = 'PRODUK_TIDAK_DIKENAL'; });

  function todayYmd() { var d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; }
  function newReport(sheet) {
    return { type: 'leads', sheet: str(sheet.name) || null, totalRows: sheet.rows.length, empty: 0, accepted: 0, rejected: 0, merged: 0,
      records: 0, columns: [], used: [], denied: [], ignored: [], missing: [], codes: {}, issues: [], truncated: false, notes: [], fatal: false,
      headerless: false, asOf: null };
  }
  function issuer(report) {
    return function (row, field, code) {
      report.codes[code] = (report.codes[code] || 0) + 1;
      if (report.issues.length >= MAX_ISSUES) { report.truncated = true; return; }
      report.issues.push({ row: row, field: field || null, code: code, reason: REASONS[code] || code });   // never the cell value
    };
  }
  function blankRow(r) {
    if (!r) return true;
    for (var j = 0; j < r.length; j++) { var v = r[j]; if (v != null && !(typeof v === 'string' && !v.trim())) return false; }
    return true;
  }
  // Reads one row of the confirmed columns into plain values. Raw cells are not kept beyond this call.
  function readRow(r, map, asOf, row, issue) {
    var o = {};
    Object.keys(map).forEach(function (f) {
      if (f === 'cif') return;
      var v = r[map[f]], x;
      if (typeof v === 'string') v = v.trim();
      if (v === '' || v == null) { o[f] = null; return; }
      if (f === 'kodeSatuan') x = cleanCode(v);
      else if (f === 'kolektibilitas') x = parseKol(v);
      else if (f === 'saldo' || f === 'penghasilan') {
        x = parseAmount(v);
        if (x === undefined) { issue(row, f, 'ANGKA_TIDAK_VALID'); x = null; }
        else if (isNum(x) && x < 0) { issue(row, f, 'NILAI_NEGATIF'); x = null; }
      } else x = parseFlag(v);
      if (x === undefined) { issue(row, f, CODE_FOR[f] || 'ANGKA_TIDAK_VALID'); x = null; }
      o[f] = x;
    });
    return o;
  }
  // Duplicate CIFs (one row per account in some reports): flags yes > no > blank, the highest saldo and income,
  // the worst kolektibilitas (any Kol 2-5 → not lancar), else the first value.
  function merge(e, o) {
    PRODUCTS.forEach(function (p) { if (o[p] === true || (o[p] === false && e[p] == null)) e[p] = o[p]; });
    ['saldo', 'penghasilan'].forEach(function (f) { if (isNum(o[f]) && (!isNum(e[f]) || o[f] > e[f])) e[f] = o[f]; });
    if (o.kolektibilitas === false || (o.kolektibilitas === true && e.kolektibilitas == null)) e.kolektibilitas = o.kolektibilitas;
    if (e.kodeSatuan == null && o.kodeSatuan != null) e.kodeSatuan = o.kodeSatuan;
  }
  function toRecord(key, e, fp, s) {
    var r = blankRecord();
    r.key = key;
    r.sourceRow = e.row;
    r.fp = fp;
    r.kodeSatuan = e.kodeSatuan || null;
    PRODUCTS.forEach(function (p) { r[p] = bool3(e[p]); });
    r.saldoBand = bandOf('saldoBand', e.saldo, s);
    r.penghasilanBand = bandOf('penghasilanBand', e.penghasilan, s);
    r.lancar = bool3(e.kolektibilitas);
    return r;
  }
  // Empties the sheet in memory: every cell, the header row (it can hold a customer when the file has no header
  // row) and the row numbers. Read the file again to import it again.
  function wipe(sheet) {
    for (var i = 0; i < sheet.rows.length; i++) { var r = sheet.rows[i]; if (r) for (var j = 0; j < r.length; j++) r[j] = null; }
    sheet.rows.length = 0;
    if (Array.isArray(sheet.headers)) { for (var h = 0; h < sheet.headers.length; h++) sheet.headers[h] = null; sheet.headers.length = 0; }
    if (Array.isArray(sheet.rowNos)) sheet.rowNos.length = 0;
    sheet.wiped = true;
  }
  function parseAsOf(v) {
    var p = v ? ymdOf(v) : null;
    return validYmd(p) ? p : todayYmd();
  }
  function ymdText(p) { return p[0] + '-' + (p[1] < 10 ? '0' : '') + p[1] + '-' + (p[2] < 10 ? '0' : '') + p[2]; }

  /**
   * importSheet(sheet, opts) → Promise<{records, report, file}>. Switched on only. opts: {key (bytes or CryptoKey;
   * default the session key), mapping (confirmed by the user; default the suggestion), file: {name, size},
   * asOf 'YYYY-MM-DD', settings (patch), crypto, wipe (default true), onProgress}. A data problem (no header row,
   * no CIF column, an empty file) resolves with report.fatal and no records, and the sheet is wiped as after a
   * successful import (read the file again to retry); the switch, the key or WebCrypto missing rejects untouched.
   */
  function importSheet(sheet, opts) {
    opts = opts || {};
    if (!enabled()) return Promise.reject(err('LEADS_OFF', MESSAGES.LEADS_OFF));
    var c = cryptoOf(opts.crypto);
    if (!c) return Promise.reject(err('NO_WEBCRYPTO', MESSAGES.NO_WEBCRYPTO));
    if (!sheetOk(sheet)) return Promise.reject(err('BAD_SHEET', MESSAGES.BAD_SHEET));
    var s = S(opts.settings), asOf = parseAsOf(opts.asOf), progress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    return resolveKey(opts.key, c).then(function (ck) {
      var chk = checkMapping(sheet, opts.mapping || null), map = chk.mapping, report = newReport(sheet), issue = issuer(report);
      var stop = function (note) {
        report.fatal = true;
        report.notes.unshift(note);
        if (opts.wipe !== false) wipe(sheet);
        return { records: [], report: report, file: null };
      };
      report.asOf = opts.asOf ? ymdText(asOf) : null;
      // the cut points of this import: after a settings change the UI can ask for a fresh import
      report.cuts = { prioritas: isNum(s.prioritasThreshold), penghasilan: edgesFor('penghasilanBand', s) };
      report.columns = chk.columns;
      chk.columns.forEach(function (col) {
        var o = { col: col.col, header: col.header, field: col.field, why: col.why };
        if (col.status === 'dipakai') report.used.push(o);
        else if (col.status === 'ditolak') { o.detector = col.detector; o.hits = col.hits; report.denied.push(o); }
        else report.ignored.push(o);
      });
      report.missing = chk.missing.slice();
      if (chk.headerless) {
        report.headerless = true;
        return stop('Baris pertama terlihat seperti data nasabah. Tambahkan baris judul kolom (CIF, Kode satuan, KPR, …), lalu baca dan impor ulang file.');
      }
      if (report.denied.length) report.notes.push(fmtInt(report.denied.length) + ' kolom berisi data pribadi dan tidak disimpan.');
      if (report.ignored.length) report.notes.push(fmtInt(report.ignored.length) + ' kolom lain tidak termasuk data yang boleh disimpan dan dilewati.');
      if (!chk.ok) return stop('Kolom CIF belum dipilih atau berisi data pribadi lain. Pilih kolom CIF yang benar, lalu baca dan impor ulang file.');
      if (has(map, 'saldo') && !isNum(s.prioritasThreshold)) {
        report.notes.push('Ambang saldo Prioritas belum diisi, jadi saldo tidak disimpan. Isi ambang di Data & Privasi, lalu impor ulang.');
      }
      var acc = new Map(), order = [], cifCol = map.cif;
      for (var i = 0; i < sheet.rows.length; i++) {
        var r = sheet.rows[i], row = Array.isArray(sheet.rowNos) && isNum(sheet.rowNos[i]) ? sheet.rowNos[i] : i + 2;
        if (blankRow(r)) { report.empty++; continue; }
        var id = cifOf(typeof r[cifCol] === 'string' ? r[cifCol].trim() : r[cifCol]);
        if (!id.cif) { issue(row, 'cif', id.code); report.rejected++; continue; }
        var o = readRow(r, map, asOf, row, issue);
        report.accepted++;
        var e = acc.get(id.cif);
        if (e) { merge(e, o); report.merged++; issue(row, 'cif', 'CIF_GANDA'); continue; }
        o.row = row;
        acc.set(id.cif, o);
        order.push(id.cif);
      }
      if (report.merged) report.notes.push(fmtInt(report.merged) + ' baris dengan CIF yang sama digabung.');
      if (!order.length) return stop('Tidak ada baris dengan CIF yang dapat dibaca.');
      var fileIn = opts.file || {};
      return fingerprint({ name: fileIn.name || sheet.file || sheet.name, size: fileIn.size }, sheet.rows.length, c).then(function (fp) {
        fp.sheet = str(sheet.name) || null;
        var records = [], seen = {};
        function step(from) {
          var part = order.slice(from, from + CHUNK);
          return Promise.all(part.map(function (cif) { return sign(c, ck, cif); })).then(function (keys) {
            keys.forEach(function (key, j) {
              if (has(seen, key)) issue(acc.get(part[j]).row, 'cif', 'KUNCI_BENTROK');
              seen[key] = 1;
              records.push(toRecord(key, acc.get(part[j]), fp.fp, s));
            });
            if (progress) { try { progress({ phase: 'mask', done: Math.min(order.length, from + CHUNK), total: order.length }); } catch (e) { /* ignore */ } }
            return from + CHUNK < order.length ? step(from + CHUNK) : null;
          });
        }
        return step(0).then(function () {
          acc.clear();
          order.length = 0;
          records.sort(function (a, b) { return a.sourceRow - b.sourceRow; });
          report.records = records.length;
          if (opts.wipe !== false) wipe(sheet);
          return { records: records, report: report, file: fp };
        });
      });
    });
  }

  /** readFile(file) → Promise<Sheet[]> through MCD.importer.read (in this browser; nothing is uploaded). Switched on only. */
  function readFile(file) {
    if (!enabled()) return Promise.reject(err('LEADS_OFF', MESSAGES.LEADS_OFF));
    var I = root && root.MCD && root.MCD.importer;
    if (!I || typeof I.read !== 'function') return Promise.reject(err('NO_DATA', MESSAGES.NO_DATA));
    return I.read(file);
  }
  /**
   * apply(result) → MCD.data meta: stores the masked records as the bank dataset 'leads'. Switched on only. Every record
   * is re-checked (sanitizeStored), and so is the kode satuan column as a whole (codeColumnCheck), as on the vault path.
   */
  function apply(result) {
    if (!enabled()) throw err('LEADS_OFF', MESSAGES.LEADS_OFF);
    var D = root && root.MCD && root.MCD.data;
    if (!D || typeof D.replace !== 'function' || !D.keyFor || !D.keyFor('leads')) throw err('NO_DATA', MESSAGES.NO_DATA);
    var rec = ((result && result.records) || []).map(sanitizeStored).filter(Boolean), rep = (result && result.report) || {}, f = (result && result.file) || {};
    if (codeColumnCheck(rec.map(function (r) { return r.kodeSatuan; })).denied) rec.forEach(function (r) { r.kodeSatuan = null; });
    return D.replace('leads', rec, { source: 'import', file: f.name || null, sheet: f.sheet || null, asOf: rep.asOf || null,
      report: { rows: rep.totalRows || 0, accepted: rep.accepted || 0, rejected: rep.rejected || 0, warnings: (rep.issues || []).length } });
  }
  /** clear() → removes the lead list from memory (MCD.data.revert('leads')); the vault copy changes on the next save. */
  function clear() {
    var D = root && root.MCD && root.MCD.data;
    return D && typeof D.revert === 'function' && D.keyFor && D.keyFor('leads') ? D.revert('leads') : null;
  }
  /** reset() → switch off, default settings, session key dropped (also on 'mcd:gate-locking'). */
  function reset() { CFG = normSettings(null); SESSION.key = null; }

  /* ================================================================= rules */

  function lancarOk(r, s) { return r.lancar === true || (s.kolUnknownOk === true && r.lancar == null); }
  var rules = {
    /** No KPR, income band at or above kprMinIncome (a branch setting), kolektibilitas known lancar (V7 D31: a blank is not lancar). */
    calonKpr: function (r, s) {
      s = S(s);
      var b = r ? bandBounds(r.penghasilanBand) : null;
      return !!r && isNum(s.kprMinIncome) && r.kpr === false && !!b && b.lo != null && b.lo >= s.kprMinIncome && lancarOk(r, s);
    },
    /** Not Prioritas yet, saldo 80-100% of the Prioritas threshold (band from the import; off while the threshold is empty). */
    calonPrioritas: function (r, s) { s = S(s); return !!r && isNum(s.prioritasThreshold) && r.prioritas !== true && r.saldoBand === '80to100'; }
  };
  var RULES = [
    { id: 'calonKpr', label: 'Calon KPR', what: 'Belum memiliki KPR, penghasilan di atas batas KPR, tanpa kredit bermasalah.', needs: 'kprMinIncome',
      off: 'Isi batas penghasilan KPR di Data & Privasi.' },
    { id: 'calonPrioritas', label: 'Mendekati Prioritas', what: 'Belum Prioritas, saldo 80–100% dari ambang Prioritas.', needs: 'prioritasThreshold',
      off: 'Isi ambang saldo Prioritas di Data & Privasi, lalu impor ulang.' }
  ];
  /** ruleStatus(settings?) → [{id, label, what, active, why}] (a rule that needs a branch setting is off until it is entered). */
  function ruleStatus(s) {
    s = S(s);
    return RULES.map(function (d) {
      var on = !d.needs || isNum(s[d.needs]);
      return { id: d.id, label: d.label, what: d.what, active: on, why: on ? null : d.off };
    });
  }

  /* ================================================== aggregates and lists */

  var BY = { kodeSatuan: 1, saldoBand: 1, penghasilanBand: 1 };   // no area or age grouping (item 48); D41: no segment or tenor
  var INF = Infinity;
  var POOL = '\u0000pool';
  var POOL_LABEL = 'Kelompok kecil lainnya';
  function fmtInt(n) {
    var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? '−' + s : s;
  }
  function ruleOf(id) {
    if (!id) return null;
    if (!has(rules, id)) throw err('BAD_RULE', 'Aturan tidak dikenal: ' + id);
    return rules[id];
  }
  /**
   * The rules guarded together with this one. D41 removed the only pair of rules that never shared a customer, so
   * each rule is guarded alone; the pair logic of rulePlans() and headPlan() stays general (a family of one).
   */
  function familyOf(id) { return [id]; }
  function groupKey(v) { return v == null ? NULL_KEY : String(v); }
  function groupLabel(by, key) {
    if (key == null) return 'Tidak diketahui';
    if (has(BAND_FIELDS, by)) return bandLabel(by, key);
    return String(key);
  }
  function bandOrder(by, key) {
    if (key == null) return Infinity;
    if (by === 'saldoBand') return NEAR.indexOf(key);
    var b = bandBounds(key);
    return b ? (b.lo == null ? -1 : b.lo) : Infinity;
  }
  function cell(n, k) {
    if (n > 0 && n < k) return { n: null, text: '<' + k, suppressed: true };
    return { n: n, text: fmtInt(n), suppressed: false };
  }

  /*
   * Hidden counts and what a reader can work out. Every table is read next to its headline (summary(): all
   * customers, or the rule's count), so the hidden counts add up to H = headline − shown total. Each hidden count x
   * has a box [lo, hi] the reader knows from its mark: "<k" is 1..k-1, "–" is k..∞ (in a rule table k..the group's
   * all-customer count less what the other rule of its pair holds there). With one sum and boxes, the exact range a
   * reader can work out for x is [max(lo, H − Σ other hi), min(hi, H − Σ other lo)].
   */
  function sums(hidden) {
    var o = { H: 0, lo: 0, hi: 0, inf: 0 };
    hidden.forEach(function (x) { o.H += x.n; o.lo += x.lo; if (x.hi === INF) o.inf++; else o.hi += x.hi; });
    return o;
  }
  function floorOf(x, t) {                              // the lowest value a reader can rule in for x
    if (t.inf - (x.hi === INF ? 1 : 0) > 0) return x.lo;
    return Math.max(x.lo, t.H - (t.hi - (x.hi === INF ? 0 : x.hi)));
  }
  function ceilOf(x, t) { return Math.min(x.hi, t.H - (t.lo - x.lo)); }
  /**
   * guarded(hidden, k): safe to show? Only counts that need protection matter: a "<k" count, a small count that is
   * never shown (maxLo 0: "neither rule" or "outside the rule" with 1 to k-1 customers) and a "–" hiding a small
   * difference (comp). When any is present: (1) at least two counts are hidden; (2) H is at least k-1 above the
   * smallest total the marks allow, so every "<k" could be k-1 and every "–" spans k values or more; (3) no count's
   * lowest possible value is pushed above maxLo (1 for "<k": every "<k" could be 1; 0 for a small count never shown:
   * it could be 0); (4) a "–" that hides a small difference could still be as large as its box allows, so the
   * difference could be 0.
   */
  function guarded(hidden, k) {
    var need = hidden.some(function (x) { return x.hide === 'primer' || x.comp || x.maxLo < INF; });
    if (!need) return true;
    if (hidden.length < 2) return false;
    var t = sums(hidden);
    if (t.H - t.lo < k - 1) return false;
    for (var i = 0; i < hidden.length; i++) {
      var x = hidden[i];
      if (floorOf(x, t) > x.maxLo) return false;
      if (x.comp && ceilOf(x, t) < x.hi) return false;
    }
    return true;
  }
  function hidePrimary(x, k) { x.hide = 'primer'; x.lo = 1; x.hi = k - 1; x.maxLo = 1; }
  function hideFill(x, k, hi) { x.hide = 'pelengkap'; x.lo = k; x.hi = hi; x.maxLo = INF; }
  /** Adds the smallest shown counts to `hidden` until guarded(); false when even hiding all of them is not enough. */
  function fill(hidden, shown, k, hiOf) {
    var rest = shown.filter(function (x) { return !x.hide && x.n > 0; }).sort(function (a, b) { return a.n - b.n || (a.g < b.g ? -1 : 1); });
    while (!guarded(hidden, k) && rest.length) { var y = rest.shift(); hideFill(y, k, hiOf(y)); hidden.push(y); }
    return guarded(hidden, k);
  }

  /*
   * basePlan(records, by, s): the all-customer table. Groups of 1 to k-1 are hidden ("<k"), then the smallest shown
   * groups ("–") until guarded(). Fewer than k customers, or no safe pattern even with every group hidden → withheld.
   */
  function basePlan(records, by, s) {
    var k = kOf(s), counts = {}, order = [], N = 0;
    (records || []).forEach(function (r) {
      if (!r) return;
      var g = groupKey(r[by]);
      if (!has(counts, g)) { counts[g] = 0; order.push(g); }
      counts[g]++; N++;
    });
    var items = order.map(function (g) { return { g: g, n: counts[g], hide: null, lo: 0, hi: INF, maxLo: INF, comp: false }; });
    var out = { k: k, n: N, items: items, byKey: {}, withheld: false, why: null };
    items.forEach(function (x) { out.byKey[x.g] = x; });
    if (N > 0 && N < k) { out.withheld = true; out.why = 'kecil'; return out; }
    items.forEach(function (x) { if (x.n < k) hidePrimary(x, k); });
    var hidden = items.filter(function (x) { return x.hide; });
    if (!fill(hidden, items, k, function () { return INF; })) { out.withheld = true; out.why = 'terbuka'; }
    return out;
  }

  /*
   * rulePlans(records, by, family, s) → {ruleId: plan}: the tables of one rule, or of a pair of rules that never
   * share a customer, by one grouping. Built on the all-customer table of the same grouping:
   *  - the groups it hides are pooled into one row ("Kelompok kecil lainnya"), so a rule table never tells more about
   *    any of them than the all-customer table does;
   *  - a group whose customers outside the rule (outside both rules of a pair) number 1 to k-1 is hidden ("–");
   *  - in a pair, a group where one rule's "<k" could be pinned by the other rule's count (all − other < k-1) is
   *    pooled too; if the pool itself would be pinned, both tables are withheld;
   *  - then the usual "<k" and complementary "–" hiding against the rule's headline count;
   *  - a rule whose count summary() hides gets no table at all (a table with nothing hidden would add up to it).
   */
  function rulePlans(records, by, fam, s) {
    var k = kOf(s), base = basePlan(records, by, s), cnt = {}, tot = {}, out = {};
    fam.forEach(function (id) { cnt[id] = {}; tot[id] = 0; });
    (records || []).forEach(function (r) {
      if (!r) return;
      var g = groupKey(r[by]);
      fam.forEach(function (id) { if (rules[id](r, s)) { cnt[id][g] = (cnt[id][g] || 0) + 1; tot[id]++; } });
    });
    var stop = function (why) {
      fam.forEach(function (id) { out[id] = { k: k, n: tot[id], items: [], byKey: {}, withheld: true, why: why }; });
      return out;
    };
    if (base.withheld) return stop('induk');
    var head = headPlan((records || []).filter(Boolean), fam, s), pooled = {};
    base.items.forEach(function (b) { if (b.hide) pooled[b.g] = 1; });
    var cells;
    for (;;) {
      cells = [];
      var pool = { g: POOL, all: 0, n: {}, members: [] };
      fam.forEach(function (id) { pool.n[id] = 0; });
      base.items.forEach(function (b) {
        if (has(pooled, b.g)) { pool.all += b.n; pool.members.push(b.g); fam.forEach(function (id) { pool.n[id] += cnt[id][b.g] || 0; }); return; }
        var c = { g: b.g, all: b.n, n: {}, members: [b.g] };
        fam.forEach(function (id) { c.n[id] = cnt[id][b.g] || 0; });
        cells.push(c);
      });
      if (pool.members.length) cells.push(pool);
      var moved = false, pinned = false;
      if (fam.length > 1) {
        cells.forEach(function (c) {
          fam.forEach(function (id) {
            var n = c.n[id], other = 0;
            if (!(n > 0 && n < k)) return;
            fam.forEach(function (j) { if (j !== id) other += c.n[j]; });
            if (c.all - other >= k - 1) return;
            if (c.g === POOL) pinned = true;
            else if (!has(pooled, c.g)) { pooled[c.g] = 1; moved = true; }
          });
        });
      }
      if (pinned) return stop('terbuka');
      if (!moved) break;
    }
    fam.forEach(function (id) {
      var p = { k: k, n: tot[id], items: [], byKey: {}, withheld: false, why: null };
      out[id] = p;
      cells.forEach(function (c) {
        var n = c.n[id], other = 0;
        fam.forEach(function (j) { if (j !== id) other += c.n[j]; });
        c.members.forEach(function (g) { p.byKey[g] = c.g === POOL ? { pooled: true, hide: 'pool' } : null; });
        if (!n) return;
        var x = { g: c.g, n: n, hide: null, lo: 0, hi: INF, maxLo: INF, comp: false, pooled: c.g === POOL, cap: c.all - other };
        var outside = c.all - n - other;
        if (n < k) hidePrimary(x, k);
        else if (outside > 0 && outside < k) { hideFill(x, k, x.cap); x.comp = true; }
        p.items.push(x);
        if (c.g !== POOL) p.byKey[c.g] = x;
      });
      if (p.n > 0 && p.n < k) { p.withheld = true; p.why = 'kecil'; return; }
      if (head[id].withheld || head[id].hide) { p.withheld = true; p.why = 'ringkasan'; return; }
      var hidden = p.items.filter(function (x) { return x.hide; });
      if (!fill(hidden, p.items, k, function (y) { return y.cap; })) { p.withheld = true; p.why = 'terbuka'; }
    });
    return out;
  }
  function rulePlan(records, by, id, s) { return rulePlans(records, by, familyOf(id, s), s)[id]; }

  /**
   * aggregate(records, by, {rule, settings}) → {by, k, rule, groups: [{key, label, n, text, suppressed, why, pooled}],
   * total, totalText, hidden, withheld, note}. by: kodeSatuan | saldoBand | penghasilanBand (any other: NO_GROUPING).
   * A group of 1-4 shows "<5" (n: null) and is left out of the total. Groups marked "–" are hidden
   * too, so that no "<5", and no small difference with the all-customer table, can be worked out from the headline
   * (summary()) or from the other tables; this complementary hiding is always on. With a rule, the groups that the
   * all-customer table hides are one row, "Kelompok kecil lainnya" (key null, pooled true). withheld: true → no groups
   * at all, and note says why. Only groups with at least one customer are listed. There is no filter on another
   * grouping (a unit × band breakdown could open hidden cells): `where` is refused (NO_SUBGROUP).
   */
  function aggregate(records, by, opts) {
    opts = opts || {};
    if (!has(BY, by)) throw err('NO_GROUPING', MESSAGES.NO_GROUPING);
    if (opts.where != null) throw err('NO_SUBGROUP', MESSAGES.NO_SUBGROUP);
    var s = S(opts.settings), k = kOf(s);
    ruleOf(opts.rule || null);
    var p = opts.rule ? rulePlan(records, by, opts.rule, s) : basePlan(records, by, s);
    var res = { by: by, k: k, rule: opts.rule || null, groups: [], total: 0, totalText: '0', hidden: 0, withheld: p.withheld, note: null };
    if (p.withheld) {
      res.note = p.why === 'kecil' ? 'Kurang dari ' + k + ' nasabah, jadi rincian per kelompok tidak ditampilkan.'
        : 'Rincian per kelompok tidak ditampilkan, karena kelompok kecil dapat dihitung dari angka lain.';
      return res;
    }
    var band = has(BAND_FIELDS, by), items = p.items.slice();
    var keyOf = function (x) { return x.g === NULL_KEY || x.g === POOL ? null : x.g; };
    items.sort(function (a, b) {
      if (a.g === POOL || b.g === POOL) return a.g === POOL ? 1 : -1;
      if (band) return bandOrder(by, keyOf(a)) - bandOrder(by, keyOf(b));
      if (!!a.hide !== !!b.hide) return a.hide ? 1 : -1;
      if (!a.hide && a.n !== b.n) return b.n - a.n;
      return groupLabel(by, keyOf(a)).localeCompare(groupLabel(by, keyOf(b)), 'id');
    });
    var nPrim = 0, nSec = 0;
    res.groups = items.map(function (x) {
      var key = keyOf(x), pooled = x.g === POOL;
      var o = { key: key, label: pooled ? POOL_LABEL : groupLabel(by, key), n: null, text: '', suppressed: !!x.hide, why: null, pooled: pooled };
      if (x.hide === 'primer') { o.text = '<' + k; o.why = 'kurang dari ' + k; nPrim++; }
      else if (x.hide) { o.text = '–'; o.why = 'pelengkap'; nSec++; }
      else { o.n = x.n; o.text = fmtInt(x.n); res.total += x.n; }
      return o;
    });
    res.totalText = fmtInt(res.total);
    res.hidden = nPrim + nSec;
    var notes = [];
    if (nPrim) notes.push('Kelompok dengan kurang dari ' + k + ' nasabah ditampilkan sebagai "<' + k + '" dan tidak dihitung dalam total.');
    if (nSec) notes.push('Kelompok bertanda "–" juga disembunyikan agar angka kecil tidak dapat dihitung dari total atau dari tabel lain.');
    if (items.some(function (x) { return x.g === POOL; })) notes.push('"' + POOL_LABEL + '" menggabungkan kelompok yang disembunyikan di tabel semua nasabah.');
    res.note = notes.length ? notes.join(' ') : null;
    return res;
  }

  var HIDDEN_TEXT = 'disembunyikan';
  var OUTSIDE_WHY = 'Disembunyikan agar kelompok kecil di luar aturan ini tidak dapat dihitung dari total.';
  /*
   * The headline counts of one rule (or of a pair that never shares a customer) against the total N, as a small table:
   * the rule counts plus "outside" (N − their sum), which is never shown. Same guarded() hiding as the tables.
   */
  function headPlan(all, fam, s) {
    var k = kOf(s), N = all.length, out = {}, items = [], sum = 0;
    fam.forEach(function (id) {
      var n = all.filter(function (r) { return rules[id](r, s); }).length;
      var x = { g: id, n: n, hide: null, lo: 0, hi: INF, maxLo: INF, comp: false };
      if (n > 0 && n < k) hidePrimary(x, k);
      items.push(x); out[id] = x; sum += n;
    });
    var rest = N - sum, outside = { g: '', n: rest, hide: 'luar', lo: 0, hi: INF, maxLo: rest > 0 && rest < k ? 0 : INF, comp: false };
    var hidden = items.filter(function (x) { return x.hide; }).concat([outside]);
    var ok = N === 0 || (N >= k && fill(hidden, items, k, function () { return INF; }));
    fam.forEach(function (id) { out[id].withheld = !ok; });
    return out;
  }
  /**
   * summary(records, settings?) → {k, total: {n, text, suppressed}, rules: [{id, label, what, active, why, n, text, suppressed}]}.
   * A count of 1-4 shows "<5". A count that would let a small group be worked out (all customers but 1-4 meet the
   * rule) shows "–". When no safe
   * pattern exists (a file of fewer than 5 customers, for one) the rule shows "disembunyikan". A rule that is off
   * shows "—" with why.
   */
  function summary(records, s) {
    s = S(s);
    var k = kOf(s), all = (records || []).filter(Boolean), N = all.length, st = ruleStatus(s), done = {};
    var out = { k: k, total: cell(N, k), rules: [] };
    st.forEach(function (d) {
      var o = { id: d.id, label: d.label, what: d.what, active: d.active, why: d.why, n: null, text: '—', suppressed: false };
      out.rules.push(o);
      if (!d.active) return;
      if (!has(done, d.id)) { var hp = headPlan(all, familyOf(d.id, s), s); Object.keys(hp).forEach(function (id) { done[id] = hp[id]; }); }
      var x = done[d.id];
      if (x.withheld) { o.text = HIDDEN_TEXT; o.suppressed = true; o.why = N > 0 && N < k ? 'Kurang dari ' + k + ' nasabah di daftar ini.' : OUTSIDE_WHY; }
      else if (x.hide === 'primer') { o.text = '<' + k; o.suppressed = true; }
      else if (x.hide) { o.text = '–'; o.suppressed = true; o.why = OUTSIDE_WHY; }
      else { o.n = x.n; o.text = fmtInt(x.n); }
    });
    return out;
  }
  function whereOf(where) {
    if (where == null) return null;
    var keys = typeof where === 'object' ? Object.keys(where) : [];
    if (keys.length !== 1 || !has(BY, keys[0])) throw err('BAD_WHERE', MESSAGES.BAD_WHERE);
    var by = keys[0], v = where[by] == null ? null : String(where[by]), o = {};
    o[by] = v;
    return { by: by, g: groupKey(v), where: o };
  }
  /**
   * list(records, {rule, where, settings}) → {rule, where, n, text, suppressed, why, rows: [{key, sourceRow}]}: the masked
   * key and the row number in the user's own file only, sorted by row. A rule is required (NO_RULE). Without where, the
   * rows come only when summary() shows the rule's count. where (optional) names one group of one grouping,
   * {kodeSatuan: 'SAT-A01'}: the rows come only when aggregate(records, 'kodeSatuan', {rule}) shows that group with its
   * count (not hidden, not pooled). So a list never tells a count that the summary or a table hides. Lists are
   * row-level by design: two lists can still be compared row by row (docs/LEADS_MASKED.md §8).
   */
  function list(records, opts) {
    opts = opts || {};
    if (!opts.rule) throw err('NO_RULE', MESSAGES.NO_RULE);
    var rule = ruleOf(opts.rule), s = S(opts.settings), k = kOf(s), w = whereOf(opts.where);
    var all = (records || []).filter(Boolean);
    var sel = all.filter(function (r) { return rule(r, s) && (!w || groupKey(r[w.by]) === w.g); });
    var out = { rule: opts.rule, where: w ? w.where : null, n: null, text: '', suppressed: true, why: null, rows: [] };
    if (w) {
      var p = rulePlan(all, w.by, opts.rule, s), x = p.byKey[w.g];
      if (p.withheld) { out.text = HIDDEN_TEXT; out.why = 'Rincian aturan ini per kelompok tidak ditampilkan, jadi daftar per kelompok juga tidak.'; return out; }
      if (x && x.hide) {
        out.text = x.hide === 'primer' ? '<' + k : (x.hide === 'pool' ? HIDDEN_TEXT : '–');
        out.why = 'Kelompok ini disembunyikan di tabel, jadi daftarnya juga.';
        return out;
      }
    } else {
      var h = headPlan(all, familyOf(opts.rule, s), s)[opts.rule];
      if (h.withheld || h.hide) { out.text = h.withheld ? HIDDEN_TEXT : (h.hide === 'primer' ? '<' + k : '–'); out.why = 'Jumlah aturan ini disembunyikan di ringkasan, jadi daftarnya juga.'; return out; }
    }
    out.n = sel.length; out.text = fmtInt(sel.length); out.suppressed = false;
    out.rows = sel.slice().sort(function (a, b) { return a.sourceRow - b.sourceRow; }).map(function (r) { return { key: r.key, sourceRow: r.sourceRow }; });
    return out;
  }

  /* ======================================================= importer schema */

  // The generic importer knows the type 'leads' for the VAULT PATH only (MCD.importer.applyDataset('leads', rows)):
  // its columns are the stored fields, every one marked personal (no sample is ever shown unmasked), it never
  // auto-detects a file, and the raw columns (CIF, saldo, penghasilan, kolektibilitas), the headers of
  // fields that are not approved (usia, kecamatan: NOT_APPROVED) and the personal headers are on its deny list, so a
  // raw file chosen by hand shows them as removed. Raw customer files only ever go through MCD.leads.importSheet
  // (masking needs WebCrypto, which is async).
  var RAW_ONLY = ['cif', 'saldo', 'penghasilan', 'kolektibilitas'];
  var CIF_HEADS = {};
  (SYN.cif || []).concat(['cif']).forEach(function (n) { CIF_HEADS[n] = 1; });
  function cifHeader(h) {
    var forms = headerForms(h).forms;
    for (var i = 0; i < forms.length; i++) if (has(CIF_HEADS, forms[i]) || /(^|_)cif(_|$)/.test(forms[i])) return true;
    return false;
  }
  function buildSync(rows, ctx) {
    var m = ctx.mapping || {}, rep = ctx.report, out = [];
    var heads = [].concat(rep.dropped || [], rep.unmatched || [], Object.keys(m));
    if (heads.some(cifHeader)) {                          // fail closed: a raw CIF never enters through this path
      rep.fatal = true;
      rep.notes.push(has(m, 'key') ? 'Daftar leads tersimpan berisi kolom CIF, jadi tidak dimuat. Impor ulang file nasabah melalui "Impor daftar leads".' :
        'Daftar leads diimpor melalui tombol khusus agar CIF disamarkan sebelum disimpan. Gunakan "Impor daftar leads" di Data & Privasi.');
      return out;
    }
    if (!has(m, 'key') || !has(m, 'sourceRow')) {
      rep.fatal = true;
      rep.notes.push('Daftar leads hanya dimuat dari brankas. Gunakan "Impor daftar leads" di Data & Privasi untuk file nasabah.');
      return out;
    }
    rows.forEach(function (r) {
      var c = sanitizeStored(r);
      if (c) out.push(c);
      else ctx.issue(r._row, 'key', null, 'TERSIMPAN_TIDAK_VALID', 'error');
    });
    // the same column check as at import: unit codes that read like names, or one per customer, are not loaded
    var chk = codeColumnCheck(out.map(function (r) { return r.kodeSatuan; }));
    if (chk.denied) {
      out.forEach(function (r) { r.kodeSatuan = null; });
      rep.notes.push('Kode satuan tersimpan terlihat seperti ' + DETECTORS[chk.detector] + ', jadi tidak dimuat.');
    }
    return out;
  }
  var SCHEMA_DENY = ['nama', 'nama_nasabah', 'nama_lengkap', 'alamat', 'rekening', 'no_rekening', 'nomor_rekening', 'norek', 'account',
    'account_number', 'tanggal_lahir', 'tgl_lahir', 'tempat_lahir', 'ibu_kandung', 'nama_ibu_kandung', 'nrp', 'nip', 'koordinat', 'latitude',
    'longitude', 'lat', 'lon', 'lng', 'plat_nomor', 'nomor_polisi', 'no_polisi', 'nopol'];
  RAW_ONLY.forEach(function (f) { (SYN[f] || []).concat([f]).forEach(function (n) { var k = normHeader(n); if (SCHEMA_DENY.indexOf(k) < 0) SCHEMA_DENY.push(k); }); });
  NOT_APPROVED.forEach(function (n) { var k = normHeader(n); if (SCHEMA_DENY.indexOf(k) < 0) SCHEMA_DENY.push(k); });
  // D41: a raw remaining-tenor column (a date or a number per customer) shows removed too, as the raw amounts do
  REMOVED_SYN.sisaTenor.forEach(function (n) { var k = normHeader(n); if (SCHEMA_DENY.indexOf(k) < 0) SCHEMA_DENY.push(k); });
  var SCHEMA = {
    label: 'Daftar leads (CIF disamarkan)', dataKey: 'leads',
    description: 'Daftar leads tersimpan di brankas (CIF sudah disamarkan). File nasabah diimpor hanya melalui "Impor daftar leads" di Data & Privasi.\n' +
      'Nama, NIK, nomor rekening, telepon, email, alamat (termasuk kecamatan) dan usia tidak disimpan. Saldo dan penghasilan hanya disimpan sebagai kelompok.',
    columns: STORED_FIELDS.map(function (k) {
      return { key: k, type: 'tersimpan', req: k === 'key' ? 'any:id' : false, syn: [], personal: true, note: 'Kolom daftar leads tersimpan (brankas)' };
    }),
    deny: SCHEMA_DENY,
    detect: function () { return false; },                // never picked for a file: raw lead files go through importSheet
    build: buildSync
  };

  var reader = {
    TYPE: 'leads', label: 'Daftar leads (CIF disamarkan)',
    what: 'Laporan nasabah dari sistem bank. CIF disamarkan; nama, NIK, nomor rekening, telepon, email dan alamat tidak disimpan.',
    read: readFile, suggest: suggestMapping, check: checkMapping, import: importSheet, apply: apply
  };

  var registered = false;
  function register(MCD) {
    if (!MCD || registered) return;
    if (MCD.importer && typeof MCD.importer.registerSchema === 'function') { MCD.importer.registerSchema('leads', SCHEMA); registered = true; }
    if (MCD.data && typeof MCD.data.registerDataset === 'function' && !(MCD.data.keyFor && MCD.data.keyFor('leads'))) {
      MCD.data.registerDataset('leads', { types: ['lead_list'], label: 'Daftar leads (CIF disamarkan)', bank: true });
      registered = true;
    }
    // The gate dispatches 'mcd:gate-locking' on document (no bubbling): drop the session key and the switch.
    try { if (root && root.document && root.document.addEventListener) root.document.addEventListener('mcd:gate-locking', reset); } catch (e) { /* no document */ }
  }

  return {
    VERSION: 1, MIN_K: MIN_K, MASK_HEX: MASK_HEX,
    FIELDS: FIELDS.slice(), PRODUCTS: PRODUCTS.slice(), STORED_FIELDS: STORED_FIELDS.slice(), FIELD_LABELS: FIELD_LABELS, FIELD_KIND: FIELD_KIND,
    DETECTORS: DETECTORS, DEFAULTS: copy(DEFAULTS), REASONS: REASONS, MESSAGES: MESSAGES, RULES: RULES, REMOVED_WHY: REMOVED_WHY,
    // switch and session
    enabled: enabled, setEnabled: setEnabled, settings: settings, configure: configure, normSettings: normSettings,
    setKey: setKey, hasKey: hasKey, newKeyBytes: newKeyBytes, reset: reset,
    // mapping
    normHeader: normHeader, headerDenied: headerDenied, fieldForHeader: fieldForHeader, removedForHeader: removedForHeader, classifyValue: classifyValue,
    scanColumn: scanColumn, codeColumnCheck: codeColumnCheck, suggestMapping: suggestMapping, checkMapping: checkMapping,
    // values
    parse: { amount: parseAmount, flag: parseFlag, kol: parseKol, kodeSatuan: cleanCode },
    // import
    readFile: readFile, importSheet: importSheet, mask: mask, normCif: normCif, fingerprint: fingerprint, apply: apply, clear: clear,
    sanitizeStored: sanitizeStored, reader: reader, schema: SCHEMA,
    // bands
    nearPrioritas: nearPrioritas, bandOf: bandOf, edgesFor: edgesFor, bandBounds: bandBounds, bandLabel: bandLabel,
    // rules and aggregates
    rules: rules, ruleStatus: ruleStatus, aggregate: aggregate, summary: summary, list: list,
    _register: register
  };
});
