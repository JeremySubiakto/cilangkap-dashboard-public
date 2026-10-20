/* ==========================================================================
 * MCD TNI PAY: pay tables for TNI soldiers (prajurit), from official regulations only.
 * Classic script (no modules), loads from file:// and in Node (vm). Data stays on the device.
 * Exposes: window.MCD_TNI_PAY (read by assets/js/loan-capacity.js, MCD.loanCap).
 *
 * Checked 18 Oct 2026. Every number below is copied from the regulation named in its `sumber`
 * (key of `sources`): article or lampiran, date and URL are in `sources`. Nothing is estimated
 * here; where a value depends on the posting (kelas jabatan, golongan jabatan) the table holds
 * the official range and the item is marked `perkiraan: true`. Method, limits and the open
 * items: docs/LOAN_CAPACITY.md.
 *
 *   sources                 one entry per regulation: nomor, judul, pasal, tanggal, url, status
 *   golongan · pangkat      PP 6/2024 Lampiran: golongan I-IV and the 22 pangkat columns (a-g),
 *                           with the AL / AU names and the MCD.ref rank codes as aliases
 *   gajiPokok.tabel         {<KODE>: {mkg: [...], gaji: [...]}} Rp per month, PP 6/2024 Lampiran
 *   tunjanganKeluarga       spouse 10%, child 2% each, at most 2 children (PP 28/2001 Pasal 12)
 *   tunjanganBeras          18 kg (prajurit) / 10 kg (each family member), Rp per kg in cash
 *   uangLaukPauk            Rp per person per calendar day (SBM TA 2026)
 *   tunjanganUmum           Rp per month, only without a tunjangan jabatan
 *   tunjanganJabatanStruktural   by golongan jabatan I-IX (posting-dependent: perkiraan)
 *   tunjanganKinerja        per kelas jabatan; table in force vs Perpres 42/2026 (text not yet available)
 *   iuran                   ASABRI pension 4,75% + THT 3,25%; BPJS Kesehatan 1% (base capped)
 *   pph21                   borne by the government (net effect 0)
 *   tidakTermasuk           deductions this file cannot know (per person, per unit)
 *
 * Bank policy numbers (rates, caps, tenors, DP) are NOT here: they are inputs (COPY_STYLE_EN item 48).
 * ========================================================================== */
(function () {
  'use strict';

  var CHECKED = '2026-10-18';

  /* ------------------------------------------------------------- sources */
  var SOURCES = {
    pp6_2024: {
      nomor: 'PP 6/2024',
      judul: 'Perubahan Ketiga Belas atas PP 28/2001 tentang Peraturan Gaji Anggota TNI',
      pasal: 'Pasal I angka 1 dan Lampiran (Daftar Gaji Pokok Anggota TNI); Pasal I angka 2 (berlaku 1 Januari 2024)',
      ditetapkan: '2024-01-26', diundangkan: '2024-01-26', berlakuMulai: '2024-01-01',
      url: 'https://peraturan.go.id/files/pp-no-6-tahun-2024.pdf',
      halaman: 'https://peraturan.go.id/id/pp-no-6-tahun-2024',
      status: 'Berlaku. Perubahan terakhir PP 28/2001: daftar "Diubah oleh" di peraturan.go.id dan pencarian JDIH Setneg (18 Okt 2026) tidak memuat perubahan sesudah PP 6/2024.'
    },
    pp28_2001: {
      nomor: 'PP 28/2001',
      judul: 'Peraturan Gaji Anggota Tentara Nasional Indonesia',
      pasal: 'Pasal 3-4 (gaji pokok permulaan pangkat), Pasal 8 (kenaikan gaji berkala), Pasal 12 ayat (1)-(5) (tunjangan istri/suami dan anak), Pasal 16 (masa kerja golongan)',
      ditetapkan: '2001-05-18', diundangkan: '2001-05-18',
      url: 'https://jdih.kemenkeu.go.id/api/download/fulltext/2001/28TAHUN2001PP.htm',
      halaman: 'https://peraturan.go.id/id/pp-no-28-tahun-2001',
      status: 'Berlaku (peraturan.go.id). Lampiran gaji terakhir diganti PP 6/2024; pasal tunjangan keluarga tidak diubah.'
    },
    permenhan33_2017: {
      nomor: 'Permenhan 33/2017',
      judul: 'Penghasilan Prajurit TNI di Lingkungan Kementerian Pertahanan dan TNI',
      pasal: 'Pasal 14 (komponen gaji dan potongan), 16 (tunjangan istri/suami), 17 (tunjangan anak), 18 (tunjangan pangan/beras), 20 (uang lauk pauk), 21 (tunjangan umum), 27 (pembulatan), 28 (tunjangan PPh Pasal 21)',
      ditetapkan: '2017-12-28', diundangkan: '2018-01-10',
      url: 'https://www.kemhan.go.id/renhan/wp-content/uploads/2018/02/PERMENHAN-NO.-33-THN-2017-TTG-PENGHASILAN-PRAJURIT-TNI.pdf',
      status: 'Berlaku menurut JDIH BPK (dicek lewat pencarian 18 Okt 2026); tidak ditemukan Permenhan pengganti.'
    },
    per3pb_2015: {
      nomor: 'Perdirjen Perbendaharaan PER-3/PB/2015',
      judul: 'Perubahan Kelima atas PER-67/PB/2010 tentang Tunjangan Beras dalam Bentuk Natura dan Uang',
      pasal: 'Pasal 3 ayat (1) harga beli beras Bulog Rp8.047/kg; Pasal 3 ayat (2) tunjangan beras dalam bentuk uang Rp7.242/kg; Pasal 4 dan Pasal II (berlaku surut 1 Januari 2014)',
      ditetapkan: '2015-02-10', berlakuMulai: '2014-01-01',
      url: 'https://djpb.kemenkeu.go.id/portal/sjdih/index.php?page=9&kat=&p=&h=&t=1995',
      salinanDibaca: 'https://itjen.kemenag.go.id/sirandang/files/download/4142-42d4cf3e629b436c9de26d2b1941dca8',
      status: 'Daftar JDIH DJPb memuatnya; salinan bertanda tangan dibaca dari JDIH Itjen Kemenag (berkas DJPb hanya lewat FTP yang tidak terjangkau). Tidak ditemukan perubahan sesudah 2015 (dicek 18 Okt 2026).'
    },
    pmk32_2025: {
      nomor: 'PMK 32/2025',
      judul: 'Standar Biaya Masukan Tahun Anggaran 2026',
      pasal: 'Lampiran I butir 22.2 Uang Lauk Pauk bagi Prajurit TNI/Anggota Polri: OH (orang/hari) Rp60.000; penjelasan butir 22.2: dihitung berdasarkan jumlah hari kalender dalam bulan berkenaan',
      ditetapkan: '2025-05-14', tahunAnggaran: 2026,
      url: 'https://jdih.kemenkeu.go.id/api/download/ccce2e9f-11fe-41ee-9da3-c7d42609b484/2025pmkeuangan032.pdf',
      status: 'Berlaku untuk TA 2026. SBM TA 2027 (PMK 54/2026) tidak lagi memuat besaran; nilainya akan diatur dengan KMK.'
    },
    pp102_2015: {
      nomor: 'PP 102/2015 jo. PP 54/2020',
      judul: 'Asuransi Sosial Prajurit TNI, Anggota Polri, dan Pegawai ASN di Lingkungan Kemhan dan Polri',
      pasal: 'Pasal 1 angka 13 (angka 15 sesudah PP 54/2020): Penghasilan = gaji pokok, tunjangan istri/suami dan tunjangan anak; Pasal 11 ayat (2) iuran THT 3,25%; Pasal 39 ayat (2) iuran pensiun 4,75% dari Penghasilan',
      ditetapkan: '2015-12-22', perubahan: 'PP 54/2020, ditetapkan 2020-09-29 (Pasal 11 dan 39 tidak diubah)',
      url: 'https://peraturan.go.id/files/pp102-2015bt.pdf',
      urlPerubahan: 'https://peraturan.go.id/files/pp54-2020bt.pdf',
      status: 'Berlaku (peraturan.go.id).'
    },
    perpres82_2018: {
      nomor: 'Perpres 82/2018 jo. Perpres 75/2019, 64/2020 dan 59/2024',
      judul: 'Jaminan Kesehatan',
      pasal: 'Pasal 30 ayat (1) (Perpres 64/2020): iuran PPU 5%, 4% pemberi kerja dan 1% peserta; Pasal 32 ayat (1) (Perpres 64/2020, diulang Perpres 59/2024): batas atas dasar iuran Rp12.000.000; Pasal 33 ayat (1) (Perpres 75/2019): dasar iuran Prajurit = gaji pokok, tunjangan keluarga, tunjangan jabatan atau tunjangan umum, tunjangan profesi dan tunjangan kinerja',
      ditetapkan: '2018-09-18', perubahan: 'Perpres 75/2019 (2019-10-24), Perpres 64/2020 (2020-05-05), Perpres 59/2024 (2024-05-08)',
      url: 'https://peraturan.go.id/files/ps82-2018.pdf',
      urlPerubahan: ['https://peraturan.go.id/files/ps75-2019.pdf', 'https://peraturan.go.id/files/ps64-2020.pdf', 'https://peraturan.go.id/files/perpres-no-59-tahun-2024.pdf'],
      status: 'Berlaku (peraturan.go.id).'
    },
    perpres14_2006: {
      nomor: 'Perpres 14/2006',
      judul: 'Tunjangan Umum bagi Anggota TNI di Lingkungan TNI',
      pasal: 'Pasal 2 (hanya bagi yang tidak menerima tunjangan jabatan struktural atau fungsional); Pasal 3 ayat (1) Rp75.000 per bulan',
      ditetapkan: '2006-05-11',
      url: 'https://peraturan.go.id/files/ps14-2006.pdf',
      halaman: 'https://peraturan.go.id/id/perpres-no-14-tahun-2006',
      status: 'Berlaku (peraturan.go.id; tidak ada perubahan tercatat).'
    },
    perpres15_2006: {
      nomor: 'Perpres 15/2006',
      judul: 'Tunjangan Jabatan Struktural di Lingkungan Organisasi TNI',
      pasal: 'Lampiran (golongan jabatan I-IX); Pasal 6 ayat (2) Kepala Staf Angkatan Rp7.500.000',
      ditetapkan: '2006-05-11',
      url: 'https://peraturan.go.id/files/ps15-2006.pdf',
      halaman: 'https://peraturan.go.id/id/perpres-no-15-tahun-2006',
      status: 'Berlaku (peraturan.go.id; tidak ada perubahan tercatat).'
    },
    perpres102_2018: {
      nomor: 'Perpres 102/2018',
      judul: 'Tunjangan Kinerja Pegawai di Lingkungan TNI',
      pasal: 'Lampiran (tunjangan kinerja per kelas jabatan); Pasal 5 (mulai Juli 2018, dibayar dengan memperhitungkan capaian kinerja); Pasal 6 (Panglima 150% kelas 17); Pasal 7 (PPh atas tunjangan kinerja dibebankan pada APBN); Pasal 8 (kelas jabatan ditetapkan Panglima)',
      ditetapkan: '2018-10-30', diundangkan: '2018-11-01',
      url: 'https://peraturan.go.id/files/ps102-2018.pdf',
      halaman: 'https://peraturan.go.id/id/perpres-no-102-tahun-2018',
      status: 'Diganti Perpres 42/2026 (Juli 2026). Dipakai di sini sebagai tabel terakhir yang teks resminya dapat dibaca.'
    },
    perpres42_2026: {
      nomor: 'Perpres 42/2026',
      judul: 'Tunjangan Kinerja Pegawai di Lingkungan Tentara Nasional Indonesia',
      pasal: 'Lampiran (belum dibaca)',
      ditetapkan: null,
      url: null,
      pengumuman: 'https://rsgmau-lakesgilut.tni-au.mil.id/tukin-tni-naik/',
      status: 'Terbit Juli 2026 (diumumkan situs resmi TNI AU, 30 Jul 2026). Teks resmi belum ada di peraturan.go.id dan JDIH Setneg (Perpres terbaru di sana: 40/2026) dan peraturan.bpk.go.id sedang pemeliharaan (HTTP 503) pada 18 Okt 2026. Besaran baru BELUM diisi; angka di media tidak dipakai.'
    }
  };

  /* ------------------------------------------------- golongan and pangkat */
  // PP 6/2024 Lampiran column heads. kelompok uses the MCD.ref rank-group codes.
  var GOLONGAN = [
    { kode: 'I', label: 'Golongan I', kelompok: ['TAMTAMA'], keterangan: 'Tamtama' },
    { kode: 'II', label: 'Golongan II', kelompok: ['BINTARA'], keterangan: 'Bintara' },
    { kode: 'III', label: 'Golongan III', kelompok: ['PAMA'], keterangan: 'Perwira Pertama' },
    { kode: 'IV', label: 'Golongan IV', kelompok: ['PAMEN', 'PATI'], keterangan: 'Perwira Menengah dan Perwira Tinggi' }
  ];

  function P(kode, label, golongan, ruang, kelompok, urut, alias) {
    return { kode: kode, label: label, golongan: golongan, ruang: ruang, kelompok: kelompok, urut: urut, alias: alias };
  }
  // alias: MCD.ref rank codes and the AL / AU names printed in the same Lampiran column.
  var PANGKAT = [
    P('PRADA', 'Prajurit Dua / Kelasi Dua', 'I', 'a', 'TAMTAMA', 1, ['PRADA', 'KLD', 'Prajurit Dua', 'Kelasi Dua']),
    P('PRATU', 'Prajurit Satu / Kelasi Satu', 'I', 'b', 'TAMTAMA', 2, ['PRATU', 'KLS', 'Prajurit Satu', 'Kelasi Satu']),
    P('PRAKA', 'Prajurit Kepala / Kelasi Kepala', 'I', 'c', 'TAMTAMA', 3, ['PRAKA', 'KLK', 'Prajurit Kepala', 'Kelasi Kepala']),
    P('KOPDA', 'Kopral Dua', 'I', 'd', 'TAMTAMA', 4, ['KOPDA', 'Kopral Dua']),
    P('KOPTU', 'Kopral Satu', 'I', 'e', 'TAMTAMA', 5, ['KOPTU', 'Kopral Satu']),
    P('KOPKA', 'Kopral Kepala', 'I', 'f', 'TAMTAMA', 6, ['KOPKA', 'Kopral Kepala']),
    P('SERDA', 'Sersan Dua', 'II', 'a', 'BINTARA', 7, ['SERDA', 'Sersan Dua']),
    P('SERTU', 'Sersan Satu', 'II', 'b', 'BINTARA', 8, ['SERTU', 'Sersan Satu']),
    P('SERKA', 'Sersan Kepala', 'II', 'c', 'BINTARA', 9, ['SERKA', 'Sersan Kepala']),
    P('SERMA', 'Sersan Mayor', 'II', 'd', 'BINTARA', 10, ['SERMA', 'Sersan Mayor']),
    P('PELDA', 'Pembantu Letnan Dua', 'II', 'e', 'BINTARA', 11, ['PELDA', 'Pembantu Letnan Dua']),
    P('PELTU', 'Pembantu Letnan Satu', 'II', 'f', 'BINTARA', 12, ['PELTU', 'Pembantu Letnan Satu']),
    P('LETDA', 'Letnan Dua', 'III', 'a', 'PAMA', 13, ['LETDA', 'Letnan Dua']),
    P('LETTU', 'Letnan Satu', 'III', 'b', 'PAMA', 14, ['LETTU', 'Letnan Satu']),
    P('KAPTEN', 'Kapten', 'III', 'c', 'PAMA', 15, ['KAPTEN', 'Kapten']),
    P('MAYOR', 'Mayor', 'IV', 'a', 'PAMEN', 16, ['MAYOR', 'Mayor']),
    P('LETKOL', 'Letnan Kolonel', 'IV', 'b', 'PAMEN', 17, ['LETKOL', 'Letnan Kolonel']),
    P('KOLONEL', 'Kolonel', 'IV', 'c', 'PAMEN', 18, ['KOLONEL', 'Kolonel']),
    P('BRIGJEN', 'Brigadir Jenderal / Laksamana Pertama / Marsekal Pertama', 'IV', 'd', 'PATI', 19, ['BRIGJEN', 'LAKSMA', 'MARSMA', 'Brigadir Jenderal', 'Laksamana Pertama', 'Marsekal Pertama']),
    P('MAYJEN', 'Mayor Jenderal / Laksamana Muda / Marsekal Muda', 'IV', 'e', 'PATI', 20, ['MAYJEN', 'LAKSDA', 'MARSDA', 'Mayor Jenderal', 'Laksamana Muda', 'Marsekal Muda']),
    P('LETJEN', 'Letnan Jenderal / Laksamana Madya / Marsekal Madya', 'IV', 'f', 'PATI', 21, ['LETJEN', 'LAKSDYA', 'MARSDYA', 'Letnan Jenderal', 'Laksamana Madya', 'Marsekal Madya']),
    P('JENDERAL', 'Jenderal / Laksamana / Marsekal', 'IV', 'g', 'PATI', 22, ['JENDERAL', 'LAKSAMANA', 'MARSEKAL', 'Jenderal', 'Laksamana', 'Marsekal'])
  ];

  /* ------------------------------------------------ gaji pokok (PP 6/2024) */
  // Transcribed from the scanned Lampiran (peraturan.go.id PDF, page 5), read twice; tests check the
  // steps (about 3,15% per 2 years of MKG and about 3,13% per pangkat). Rows the Lampiran leaves blank are
  // not stored: the gaji pokok of a blank MKG is that of the nearest lower MKG with a value (gaji berkala
  // rises every 2 years, PP 28/2001 Pasal 8).
  var MKG_TAMTAMA = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
  var MKG_EVEN32 = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
  var MKG_LETDA = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];
  var MKG_PATI_ATAS = [24, 26, 28, 30, 32];
  function T(mkg, gaji) { return { mkg: mkg.slice(), gaji: gaji }; }

  var GAJI = {
    PRADA: T(MKG_TAMTAMA, [1775000, 1830900, 1888700, 1948200, 2009700, 2073000, 2138400, 2205800, 2275400, 2347100, 2421100, 2497500, 2576200, 2657500, 2741300]),
    PRATU: T(MKG_TAMTAMA, [1830500, 1888200, 1947800, 2009200, 2072500, 2137900, 2205300, 2274800, 2346600, 2420600, 2496900, 2575600, 2656800, 2740600, 2827000]),
    PRAKA: T(MKG_TAMTAMA, [1887800, 1947300, 2008700, 2072000, 2137400, 2204800, 2274300, 2346000, 2420000, 2496300, 2575000, 2656200, 2739900, 2826300, 2915400]),
    KOPDA: T(MKG_TAMTAMA, [1946800, 2008200, 2071500, 2136800, 2204200, 2273700, 2345400, 2419400, 2495700, 2574400, 2655500, 2739300, 2825600, 2914700, 3006600]),
    KOPTU: T(MKG_TAMTAMA, [2007700, 2071000, 2136300, 2203700, 2273200, 2344800, 2418800, 2495000, 2573700, 2654900, 2738600, 2824900, 2914000, 3005900, 3100700]),
    KOPKA: T(MKG_TAMTAMA, [2070500, 2135800, 2203100, 2272600, 2344300, 2418200, 2494400, 2573100, 2654200, 2737900, 2824300, 2913300, 3005200, 3099900, 3197700]),
    SERDA: T(MKG_EVEN32, [2272100, 2343700, 2417600, 2493800, 2572500, 2653600, 2737300, 2823600, 2912600, 3004400, 3099200, 3196900, 3297700, 3401700, 3508900, 3619600, 3733700]),
    SERTU: T(MKG_EVEN32, [2343100, 2417000, 2493200, 2571800, 2652900, 2736600, 2822900, 2911900, 3003700, 3098400, 3196100, 3296900, 3400900, 3508100, 3618700, 3732800, 3850500]),
    SERKA: T(MKG_EVEN32, [2416400, 2492600, 2571200, 2652300, 2735900, 2822200, 2911200, 3003000, 3097700, 3195300, 3296100, 3400000, 3507200, 3617800, 3731900, 3849600, 3971000]),
    SERMA: T(MKG_EVEN32, [2492000, 2570600, 2651600, 2735200, 2821500, 2910500, 3002200, 3096900, 3194600, 3295300, 3399200, 3506400, 3616900, 3731000, 3848600, 3970000, 4095200]),
    PELDA: T(MKG_EVEN32, [2570000, 2651000, 2734600, 2820800, 2909700, 3001500, 3096100, 3193800, 3294500, 3398400, 3505500, 3616100, 3730100, 3847700, 3969000, 4094200, 4223300]),
    PELTU: T(MKG_EVEN32, [2650300, 2733900, 2820100, 2909000, 3000800, 3095400, 3193000, 3293700, 3397500, 3504700, 3615200, 3729200, 3846700, 3968000, 4093200, 4222200, 4355400]),
    LETDA: T(MKG_LETDA, [2954200, 3000000, 3094600, 3192200, 3292900, 3396700, 3503800, 3614300, 3728300, 3845800, 3967100, 4092200, 4221200, 4354300, 4491600, 4633200, 4779300]),
    LETTU: T(MKG_EVEN32, [3046600, 3142700, 3241700, 3344000, 3449400, 3558200, 3670400, 3786100, 3905500, 4028600, 4155700, 4286700, 4421900, 4561300, 4705100, 4853500, 5006500]),
    KAPTEN: T(MKG_EVEN32, [3141900, 3241000, 3343100, 3448600, 3557300, 3669500, 3785200, 3904500, 4027700, 4154700, 4285700, 4420800, 4560200, 4704000, 4852300, 5005300, 5163100]),
    MAYOR: T(MKG_EVEN32, [3240200, 3342300, 3447700, 3556400, 3668600, 3784300, 3903600, 4026700, 4153600, 4284600, 4419700, 4559100, 4702800, 4851100, 5004100, 5161900, 5324600]),
    LETKOL: T(MKG_EVEN32, [3341500, 3446900, 3555600, 3667700, 3783300, 3902600, 4025700, 4152600, 4283600, 4418600, 4558000, 4701700, 4849900, 5002900, 5160600, 5323300, 5491200]),
    KOLONEL: T(MKG_EVEN32, [3446000, 3554700, 3666800, 3782400, 3901700, 4024700, 4151600, 4282500, 4417600, 4556800, 4700500, 4848800, 5001600, 5159400, 5322000, 5489900, 5663000]),
    BRIGJEN: T(MKG_EVEN32, [3553800, 3665900, 3781500, 3900700, 4023700, 4150600, 4281500, 4416500, 4555700, 4699400, 4847600, 5000400, 5158100, 5320700, 5488500, 5661600, 5840100]),
    MAYJEN: T(MKG_EVEN32, [3665000, 3780600, 3899800, 4022700, 4149600, 4280400, 4415400, 4554600, 4698200, 4846400, 4999200, 5156800, 5319400, 5487200, 5660200, 5838700, 6022800]),
    LETJEN: T(MKG_PATI_ATAS, [5485800, 5658800, 5837200, 6021300, 6211200]),
    JENDERAL: T(MKG_PATI_ATAS, [5657400, 5835800, 6019800, 6209600, 6405500])
  };

  /* -------------------------------------------------------------- the file */
  window.MCD_TNI_PAY = {
    meta: {
      judul: 'Tabel penghasilan prajurit TNI dari peraturan resmi',
      dicek: CHECKED,
      satuan: 'Rupiah per bulan, kecuali disebut lain',
      catatan: 'Hanya angka dari peraturan resmi. Potongan yang berbeda per orang atau per satuan tidak ada di sini dan harus diisi sendiri: cicilan pinjaman sebagai cicilan potong gaji, lalu koperasi, TWP dan sewa rumah dinas sebagai potongan lain. Kebijakan bank (bunga, batas angsuran, tenor, uang muka) tidak disimpan di file ini.',
      doc: 'docs/LOAN_CAPACITY.md'
    },
    sources: SOURCES,
    golongan: GOLONGAN,
    pangkat: PANGKAT,

    gajiPokok: {
      sumber: 'pp6_2024',
      berlakuMulai: '2024-01-01',
      aturanMkg: 'Gaji pokok untuk MKG tanpa angka di Lampiran = angka MKG terdekat di bawahnya (kenaikan gaji berkala tiap 2 tahun, PP 28/2001 Pasal 8). Di atas MKG terakhir: angka terakhir. Di bawah MKG pertama (Letjen dan Jenderal mulai MKG 24): gaji pokok permulaan pangkat itu (PP 28/2001 Pasal 3-4).',
      tabel: GAJI
    },

    tunjanganKeluarga: {
      sumber: ['pp28_2001', 'permenhan33_2017'],
      pasanganPct: 10,                 // PP 28/2001 Pasal 12 ayat (1); Permenhan 33/2017 Pasal 16 ayat (1): 10% gaji pokok, satu istri/suami sah
      anakPctPerAnak: 2,               // PP 28/2001 Pasal 12 ayat (2); Permenhan 33/2017 Pasal 17 ayat (1): 2% gaji pokok per anak
      anakMaks: 2,                     // PP 28/2001 Pasal 12 ayat (4); Permenhan 33/2017 Pasal 17 ayat (5)
      anakUsiaMaks: 21,                // PP 28/2001 Pasal 12 ayat (2); Permenhan 33/2017 Pasal 17 ayat (3): belum menikah, belum berpenghasilan
      anakUsiaMaksSekolah: 25,         // PP 28/2001 Pasal 12 ayat (3); Permenhan 33/2017 Pasal 17 ayat (4): masih sekolah/kuliah
      anakAngkatMaks: 1,               // Permenhan 33/2017 Pasal 17 ayat (10)
      catatan: 'Bila suami dan istri sama-sama prajurit TNI, anggota Polri atau PNS, tunjangan istri/suami hanya diberikan kepada salah satu (PP 28/2001 Pasal 12 ayat (5); Permenhan 33/2017 Pasal 16 ayat (5)). Prajurit yang pada 1 Maret 1994 sudah menerima tunjangan untuk 3 anak tetap menerimanya (Pasal 17 ayat (6)).'
    },

    tunjanganBeras: {
      sumber: ['permenhan33_2017', 'per3pb_2015'],
      kgPrajurit: 18,                  // Permenhan 33/2017 Pasal 18 ayat (2)-(3): 18 kg/jiwa/bulan untuk prajurit
      kgPerAnggotaKeluarga: 10,        // ... dan 10 kg/jiwa/bulan untuk anggota keluarga yang berhak (istri/suami, anak dalam tunjangan)
      hargaUangPerKg: 7242,            // PER-3/PB/2015 Pasal 3 ayat (2): tunjangan beras dalam bentuk uang kepada Pegawai Negeri
      hargaBeliBulogPerKg: 8047,       // PER-3/PB/2015 Pasal 3 ayat (1): untuk tunjangan dalam bentuk beras (natura), dibayar ke Bulog
      bentuk: ['uang', 'natura'],
      catatan: 'Diberikan dalam bentuk uang atau beras (natura) (Permenhan 33/2017 Pasal 18 ayat (1)). Bila natura, nilainya juga dipotong sebagai "perhitungan pihak ketiga beras Bulog" (Pasal 14 ayat (2) huruf r angka 2), jadi tidak menambah uang tunai. Harga per kg sejak 2015 (berlaku surut 1 Januari 2014).'
    },

    uangLaukPauk: {
      sumber: ['pmk32_2025', 'permenhan33_2017'],
      perHari: 60000,                  // PMK 32/2025 Lampiran I butir 22.2 (OH)
      tahunAnggaran: 2026,
      dasarHari: 'hari kalender',      // PMK 32/2025 penjelasan butir 22.2; Permenhan 33/2017 Pasal 20
      hanyaPrajurit: true,             // Permenhan 33/2017 Pasal 20: tidak termasuk anggota keluarga
      catatan: 'Angka SBM adalah standar biaya untuk anggaran TA 2026. Dihitung per hari kalender bulan berkenaan (28-31 hari).'
    },

    tunjanganUmum: {
      sumber: 'perpres14_2006',
      perBulan: 75000,                 // Perpres 14/2006 Pasal 3 ayat (1)
      syarat: 'Hanya bagi prajurit yang tidak menerima tunjangan jabatan struktural atau fungsional (Perpres 14/2006 Pasal 2; Permenhan 33/2017 Pasal 21).'
    },

    tunjanganJabatanStruktural: {
      sumber: 'perpres15_2006',
      perkiraan: true,
      perGolonganJabatan: { I: 4500000, II: 3500000, III: 2500000, IV: 1500000, V: 900000, VI: 675000, VII: 360000, VIII: 315000, IX: 225000 },
      kepalaStafAngkatan: 7500000,     // Perpres 15/2006 Pasal 6 ayat (2)
      rentang: [225000, 4500000],
      catatan: 'Golongan jabatan tergantung jabatan yang diduduki (ditetapkan pejabat berwenang), bukan pangkat. Menggantikan tunjangan umum. Tunjangan jabatan fungsional tidak dimuat (besarannya per jenis jabatan).'
    },

    tunjanganKinerja: {
      perkiraan: true,
      tabelBerlaku: 'perpres102_2018',
      catatan: 'Kelas jabatan ditetapkan Panglima per jabatan (Perpres 102/2018 Pasal 8), jadi tergantung penempatan, bukan pangkat. Dibayar dengan memperhitungkan capaian kinerja bulanan (Pasal 5 ayat (3)). Perpres 42/2026 sudah menggantikan tabel ini, tetapi teks resminya belum dapat dibaca: angka di sini bisa lebih rendah dari yang dibayar sekarang (perkiraan konservatif).',
      tabel: {
        perpres102_2018: {
          sumber: 'perpres102_2018',
          terverifikasi: true,
          berlakuMulai: '2018-07-01',
          kelas: { 1: 1968000, 2: 2089000, 3: 2216000, 4: 2350000, 5: 2493000, 6: 2702000, 7: 2928000, 8: 3319000, 9: 3781000, 10: 4551000,
            11: 5183000, 12: 7271000, 13: 8562000, 14: 11670000, 15: 14721000, 16: 20695000, 17: 29085000 },
          khusus: { kasumWakasad: 34902000, ksadKsalKsau: 37810500 },
          panglimaPctKelas17: 150
        },
        perpres42_2026: {
          sumber: 'perpres42_2026',
          terverifikasi: false,
          berlakuMulai: null,
          kelas: null,
          khusus: null,
          catatan: 'Belum diisi: teks resmi dan Lampirannya belum tersedia di basis data resmi pada 18 Okt 2026.'
        }
      }
    },

    iuran: {
      sumber: ['pp102_2015', 'perpres82_2018'],
      asabriPensiunPct: 4.75,          // PP 102/2015 Pasal 39 ayat (2)
      asabriThtPct: 3.25,              // PP 102/2015 Pasal 11 ayat (2)
      dasarAsabri: ['gajiPokok', 'tunjanganPasangan', 'tunjanganAnak'],   // "Penghasilan", PP 102/2015 Pasal 1
      bpjsPesertaPct: 1,               // Perpres 82/2018 Pasal 30 ayat (1) huruf b (Perpres 64/2020)
      dasarBpjs: ['gajiPokok', 'tunjanganPasangan', 'tunjanganAnak', 'tunjanganJabatanAtauUmum', 'tunjanganKinerja'],   // Pasal 33 ayat (1) (Perpres 75/2019)
      bpjsBatasAtasDasar: 12000000,    // Pasal 32 ayat (1) (Perpres 64/2020; Perpres 59/2024)
      catatan: 'Permenhan 33/2017 Pasal 14 ayat (2) huruf r angka 1 masih menyebut iuran wajib 10% (pensiun, tabungan hari tua dan asuransi kesehatan). Bagian kesehatan sekarang diatur Perpres Jaminan Kesehatan: 1% dari dasar yang lebih luas, paling tinggi dari Rp12 juta. Dashboard memakai 8% ASABRI + 1% BPJS Kesehatan.'
    },

    pph21: {
      sumber: ['permenhan33_2017', 'perpres102_2018'],
      metode: 'ditanggung-pemerintah',
      catatan: 'PPh Pasal 21 atas gaji dan tunjangan dibayar lewat tunjangan PPh sebesar pajak terutang (Permenhan 33/2017 Pasal 28); PPh atas tunjangan kinerja dibebankan pada APBN (Perpres 102/2018 Pasal 7). Tunjangan PPh dan potongan PPh sama besar, jadi tidak mengubah penghasilan bersih. Prajurit tanpa NPWP bisa menanggung selisih tarif 20% (Pasal 28 ayat (4)). PPh atas uang lauk pauk tidak dihitung (belum diverifikasi).'
    },

    pembulatan: {
      sumber: 'permenhan33_2017',
      catatan: 'Gaji bersih dibulatkan ke atas menjadi ratusan rupiah lewat tunjangan pembulatan (Permenhan 33/2017 Pasal 27). Selisihnya di bawah Rp100 dan tidak dihitung.'
    },

    tidakTermasuk: [
      'Simpanan koperasi, Tabungan Wajib Perumahan (TWP) dan iuran organisasi di satuan (isi sebagai potongan lain)',
      'Sewa rumah dinas dan utang kepada negara (Permenhan 33/2017 Pasal 14 ayat (2) huruf r angka 4-5) (isi sebagai potongan lain)',
      'Cicilan pinjaman yang dipotong dari gaji, misalnya KPR, KSM atau pinjaman koperasi (isi sebagai cicilan potong gaji, bukan potongan lain)',
      'Tunjangan khusus penempatan (Papua, wilayah terpencil, pulau terluar, Kowan, Babinsa), tunjangan jabatan fungsional dan tunjangan kompensasi/risiko',
      'Gaji ketiga belas dan tunjangan hari raya (bukan penghasilan bulanan)'
    ]
  };
})();
