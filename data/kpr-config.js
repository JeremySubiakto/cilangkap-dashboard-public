/* ==========================================================================
 * MCD KPR CONFIG — Bank Mandiri KCP Jakarta Cilangkap (Mabes TNI)
 * Classic script (no modules). Loads from file://. Data stays on-device.
 * Exposes: window.MCD_KPR_CONFIG
 *
 * As of 2026-10-12. Every number below is either:
 *   (a) copied from a cited public source (URL in `source`), or
 *   (b) explicitly labelled "ASSUMPTION" / "ESTIMATE" with the reasoning.
 * Promos are flagged `expired:true` when their published deadline is before
 * 2026-10-12. Bank system / SP3K figures always prevail over this file.
 *
 * Units: rates in % p.a. (nominal, effective-annual as published by Mandiri);
 *        money in IDR; tenor in years; pct fields are percentages (1 = 1%).
 * ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * SOURCE REGISTRY (short keys used in `source` fields)
   * ------------------------------------------------------------------- */
  var SRC = {
    mandiriSpesial: "https://www.bankmandiri.co.id/kpr-bunga-spesial (live page read 2026-10-12: 'Suku bunga ini berlaku sampai dengan batas pencairan kredit 30 November 2026')",
    mandiriTopDev: "https://www.bankmandiri.co.id/top-developer (Program 1 Agustus – 30 November 2026)",
    mandiriKpr: "https://www.bankmandiri.co.id/kpr + RIPLAY Mandiri KPR ver. Februari 2026 (https://bankmandiri.co.id/documents/20143/576636849/Mandiri+KPR.pdf)",
    mandiriTakeOver: "https://www.bankmandiri.co.id/program-penawaran-mandiri-kpr-take-over-mandiri-kpr-multiguna-take-over",
    mandiriFlpp: "https://www.bankmandiri.co.id/kredit-pemilikan-rumah-bersubsidi",
    mandiriSbdk: "https://www.bankmandiri.co.id/suku-bunga-dasar-kredit (Terakhir diperbarui 31 Agu 2026; periode data 31 Mei 2026)",
    mandiriInfoKpr: "https://www.bankmandiri.co.id/info-kpr (notice: rate increase for selected existing KPR/Multiguna debtors, Nov 2026)",
    mandiriPertamina: "https://www.bankmandiri.co.id/kpr-pertamina",
    mandiriPelindo: "https://www.bankmandiri.co.id/kpr-hop-pelindo",
    mandiriPelni: "https://www.bankmandiri.co.id/kpr-pelni-group",
    mandiriPegawai2021: "https://www.bankmandiri.co.id/mandiri-new-kpr-multiguna-pegawai (archived 2021 program)",
    kontanFloating: "https://keuangan.kontan.co.id/news/likuiditas-bank-ketat-begini-bunga-floating-kpr (23 Aug 2026)",
    biRate: "https://finansial.bisnis.com/read/20260923/11/2006538/alasan-bank-indonesia-tahan-bi-rate-september-2026-di-575 (RDG 22–23 Sep 2026)",
    padg30: "https://www.bi.go.id/id/publikasi/peraturan/Pages/PADG_302025.aspx (PADG No. 30/2025, berlaku 1 Jan 2026, diperpanjang s.d. 31 Des 2026)",
    kontanLtv: "https://keuangan.kontan.co.id/news/kebijakan-dp-rumah-0-diperpanjang-hingga-2026-apakah-dongkrak-kredit-properti (2 Dec 2025)",
    ortaxPmk90: "https://ortax.org/tahun-anggaran-2026-pemerintah-kembali-berikan-diskon-ppn-rumah (PMK 90/2025)",
    ddtcPpn2027: "https://news.ddtc.co.id/berita/nasional/1814451/ppn-rumah-dtp-berlaku-hingga-2027-kemenkeu-segera-terbitkan-pmk (14 Oct 2025)",
    ddtcDkiNpoptkp: "https://news.ddtc.co.id/berita/daerah/1801148/npoptkp-di-dki-jakarta-rp-250-juta-khusus-waris-jadi-rp1-miliar (Pengumuman Bapenda DKI 499/UD.02.01, Perda DKI 1/2024)",
    ddtcDkiKepgub450: "https://news.ddtc.co.id/berita/daerah/1819793/dukung-kepemilikan-rumah-pertama-dki-jakarta-beri-keringanan-bphtb (Kepgub DKI 450/2026, 2 Jun 2026)",
    ddtcDkiKepgub840: "https://news.ddtc.co.id/berita/daerah/1813997/diskon-bphtb-untuk-pembelian-rumah-pertama-di-dki-ini-perinciannya (Kepgub DKI 840/2025, berlaku surut 27 Aug 2025)",
    perdaDepok: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-daerah/perda-kota-depok-1-tahun-2024 (Perda Kota Depok 1/2024 Pasal 15)",
    perdaKotaBekasi: "https://peraturan.bpk.go.id/Download/354539/2024pd32231.pdf (Perda Kota Bekasi 1/2024 Pasal 16–17)",
    perdaKabBogor: "https://jdih.bogorkab.go.id/peraturan/perda/download/1233 (Perda Kab. Bogor 11/2023 Pasal 13–14)",
    perdaKabBekasi: "https://peraturan.bpk.go.id/Download/357413/2023pd3216008.pdf (Perda Kab. Bekasi 8/2023 Pasal 14–15; amended by Perda 1/2025 — BPHTB articles not touched in pages checked)",
    perdaKotaBogor: "https://layanan-bapenda.kotabogor.go.id/e-sppt/vendor/peraturan/PERDA%20NO%2011%20TH%202023.pdf (Perda Kota Bogor 11/2023 Pasal 12–13; amended by Perda 4/2025 — amendment not checked)",
    perdaTangsel: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan-daerah/perda-kota-tangerang-selatan-10-tahun-2023 (Perda Kota Tangsel 10/2023 Pasal 12–13)",
    perdaKotaTangerang: "https://perpajakan.ddtc.co.id/id/sumber-hukum/peraturan-daerah/perda-kota-tangerang-10-tahun-2023 (Perda Kota Tangerang 10/2023 Pasal 14–15)",
    uuTni: "https://peraturan.bpk.go.id/Download/380719/UU%20Nomor%203%20Tahun%202025.pdf (UU 3/2025 Pasal 53 & Pasal II)",
    pnsBup: "https://www.hukumonline.com/klinik/a/batas-usia-pensiun-bagi-pns-lt59db3cad2b57f (PP 11/2017 Pasal 239; UU ASN 20/2023 Pasal 55)",
    tniGapok: "https://nasional.kontan.co.id/news/prabowo-naikkan-tunjangan-kinerja-tni-cek-tukin-tentara-tamtama-bintara (1 Aug 2026: gaji TNI 2026 = PP 6/2024 table; tukin Perpres 42/2026 by kelas jabatan)",
    tniTukinKatadata: "https://katadata.co.id/berita/nasional/6a69f6fd81d5f/prabowo-naikkan-tukin-prajurit-tni-berlaku-untuk-seluruh-jenjang-jabatan (29 Jul 2026)",
    tniDealls: "https://dealls.com/pengembangan-karir/gaji-tentara (30 Dec 2025: old tukin table Perpres 102/2018; rank→kelas examples; tunjangan keluarga)",
    pnsGapok: "https://www.metrotvnews.com/read/bD2CwWjq-benarkah-gaji-pns-2026-naik-cek-fakta-dan-rincian-besaran-gaji-golongan-i-iv (PP 5/2024 still applies in 2026)",
    ulpTni: "https://fahum.umsu.ac.id/info/nilainya-mencapai-rp60-000-per-hari-tni-dan-polri-dikabarkan-akan-terima-tunjangan-tambahan-seperti-pns (ULP TNI/Polri Rp60.000/hari — secondary source, verify vs PMK SBM)",
    flpp40: "https://ekonomi.bisnis.com/read/20260625/47/1983246/resmi-tenor-kpr-rumah-subsidi-rusun-diperpanjang-sampai-40-tahun ; https://www.investortrust.id/financial/107431/tenor-kpr-subsidi-diperpanjang-jadi-40-tahun-bunga-kredit-rusun-dipatok-6",
    flppRusun2026: "https://www.investortrust.id/business/101113/pemerintah-tetapkan-harga-maksimal-rusun-subsidi-2026-simak-rinciannya (Kepmen PKP 23/2026)",
    flppNoRaise: "https://www.investortrust.id/business/107446/bp-tapera-belum-memungkinkan-harga-rumah-subsidi-dinaikkan (24 Jun 2026)",
    flppMandiriRealisasi: "https://investortrust.id/business/110570/bp-tapera-salurkan-111537-kpr-flpp-buruh-jadi-penerima-terbesar (Mandiri 3.364 unit FLPP s.d. 23 Jul 2026)",
    feesIndustry: "https://www.industry.co.id/read/152959/perbandingan-kpr-bri-vs-mandiri-vs-bca-vs-btn-2026-mana-cicilan-paling-ringan (Jul 2026: provisi 0,5–1%, admin Rp250–500rb, appraisal Rp0,5–1,5jt, asuransi jiwa 1–2% plafon, properti 0,1–0,3%/th)",
    feesDetik: "https://www.detik.com/properti/tips-dan-panduan/d-7695560/berapa-biaya-akad-kpr-simak-rincian-dan-sistem-angsurannya-berikut (notaris KPR ~0,7–1%; PPAT AJB maks 1%)",
    feesOlxProvisi: "https://www.olx.co.id/news?p=34046 (provisi Bank Mandiri 1% dari plafon — secondary)",
    fireTariff: "https://www.chubb.com/content/dam/chubb-sites/chubb/id-id/documents/riplay-chubb-general/riplay-versi-umum-fire-insurance-hsbc.pdf (SEOJK 6/2017: rumah tinggal kelas konstruksi 1 = 0,294–0,328 permil/th, basic fire only)",
    dsrNorm: "https://www.cermati.com/artikel/debt-service-ratio ; https://finansial.bisnis.com/read/20250626/55/1888474/perhatian-slik-tak-jadi-satu-satunya-faktor-penilaian-kpr-bank (bank practice 30–40%)",
    twpAl: "No verified 2026 BP TWP AL down-payment figure found (searches 2026-10-12). See https://pkp.go.id/berita/detail/kementerian-pkp-akan-bangun-rumah-susun-di-jawa-timur-untuk-tni-al"
  };

  /* ---------------------------------------------------------------------
   * RATE SCHEMES
   * Mandiri "KPR Bunga Spesial 2026" tables (live page, batas pencairan
   * 30 Nov 2026). Category labels Gold / Gold Selected KPR Primary / Silver /
   * Bronze are NOT defined publicly by Mandiri — category assignment is the
   * bank's (customer / project profile). Treat Gold as best case.
   * `steps` (when present) = sequential fixed blocks; after the last block
   * the floating rate applies.
   * ------------------------------------------------------------------- */
  var FLOAT = 13.0; // see floatingDefault below

  function S(o) { // fill defaults
    if (o.floatingRate == null) o.floatingRate = FLOAT;
    if (o.maxTenorYears == null) o.maxTenorYears = 30;
    if (o.expired == null) o.expired = false;
    return o;
  }

  var rateSchemes = [
    /* ---- GOLD (also shown as "Gold Selected KPR Primary" except the two *-gold-only rows) ---- */
    S({ id: "gold-f1", tier: "Gold", name: "Gold · Fixed 1 th", fixedRate: 2.70, fixedYears: 1, minTenorYears: 5, eligible: "Kategori Gold (penetapan oleh Bank; kriteria tidak dipublikasikan)", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-f2", tier: "Gold", name: "Gold · Fixed 2 th", fixedRate: 3.66, fixedYears: 2, minTenorYears: 6, eligible: "Kategori Gold", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-f3-t15", tier: "Gold", name: "Gold · Fixed 3 th (tenor ≥15)", fixedRate: 2.76, fixedYears: 3, minTenorYears: 15, eligible: "Kategori Gold", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-f3-t12", tier: "Gold", name: "Gold · Fixed 3 th (tenor ≥12)", fixedRate: 3.70, fixedYears: 3, minTenorYears: 12, eligible: "Kategori Gold", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-f5-t15", tier: "Gold", name: "Gold · Fixed 5 th (tenor ≥15)", fixedRate: 3.50, fixedYears: 5, minTenorYears: 15, eligible: "Kategori Gold", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-f5-t10", tier: "Gold", name: "Gold · Fixed 5 th (tenor ≥10)", fixedRate: 5.18, fixedYears: 5, minTenorYears: 10, eligible: "Kategori Gold (tidak ada di tabel Gold Selected KPR Primary)", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-f5-t5", tier: "Gold", name: "Gold · Fixed 5 th (tenor ≥5)", fixedRate: 6.18, fixedYears: 5, minTenorYears: 5, eligible: "Kategori Gold (tidak ada di tabel Gold Selected KPR Primary)", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-step10-t15", tier: "Gold", name: "Gold · Berjenjang 10 th (tenor ≥15)", fixedRate: 4.06, fixedYears: 10, steps: [{ rate: 4.06, years: 3 }, { rate: 8.76, years: 3 }, { rate: 9.76, years: 4 }], minTenorYears: 15, eligible: "Kategori Gold", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "gold-step10-t12", tier: "Gold", name: "Gold · Berjenjang 10 th (tenor ≥12)", fixedRate: 4.96, fixedYears: 10, steps: [{ rate: 4.96, years: 3 }, { rate: 8.96, years: 3 }, { rate: 9.96, years: 4 }], minTenorYears: 12, eligible: "Kategori Gold", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),

    /* ---- SILVER ---- */
    S({ id: "silver-f1", tier: "Silver", name: "Silver · Fixed 1 th", fixedRate: 8.00, fixedYears: 1, minTenorYears: 3, eligible: "Kategori Silver", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-f3", tier: "Silver", name: "Silver · Fixed 3 th", fixedRate: 4.70, fixedYears: 3, minTenorYears: 10, eligible: "Kategori Silver", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-f5-t12", tier: "Silver", name: "Silver · Fixed 5 th (tenor ≥12)", fixedRate: 4.66, fixedYears: 5, minTenorYears: 12, eligible: "Kategori Silver", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-f5-t11", tier: "Silver", name: "Silver · Fixed 5 th (tenor ≥11)", fixedRate: 5.76, fixedYears: 5, minTenorYears: 11, eligible: "Kategori Silver", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    // NOTE: page prints a second "Fixed 5 tahun" row-group (6,18% / 7,18%). Label reproduced as published; may be a typo for another period — verify at branch.
    S({ id: "silver-f5b-t10", tier: "Silver", name: "Silver · Fixed 5 th* (tenor ≥10)", fixedRate: 6.18, fixedYears: 5, minTenorYears: 10, eligible: "Kategori Silver — label 'Fixed 5 tahun' muncul dua kali di halaman, verifikasi", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-f5b-t5", tier: "Silver", name: "Silver · Fixed 5 th* (tenor ≥5)", fixedRate: 7.18, fixedYears: 5, minTenorYears: 5, eligible: "Kategori Silver — label duplikat, verifikasi", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-f10-t15", tier: "Silver", name: "Silver · Fixed 10 th (tenor ≥15)", fixedRate: 8.06, fixedYears: 10, minTenorYears: 15, eligible: "Kategori Silver", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-f10-t10", tier: "Silver", name: "Silver · Fixed 10 th (tenor ≥10)", fixedRate: 8.00, fixedYears: 10, minTenorYears: 10, eligible: "Kategori Silver", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "silver-step10", tier: "Silver", name: "Silver · Berjenjang 10 th", fixedRate: 6.88, fixedYears: 10, steps: [{ rate: 6.88, years: 3 }, { rate: 8.88, years: 3 }, { rate: 9.88, years: 4 }], minTenorYears: 10, eligible: "Kategori Silver (dulu dipasarkan sbg 'KPR Bunga Fixed Berjenjang 2026')", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),

    /* ---- BRONZE ---- */
    S({ id: "bronze-f1", tier: "Bronze", name: "Bronze · Fixed 1 th", fixedRate: 14.25, fixedYears: 1, minTenorYears: 1, eligible: "Kategori Bronze", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "bronze-f2", tier: "Bronze", name: "Bronze · Fixed 2 th", fixedRate: 11.00, fixedYears: 2, minTenorYears: 2, eligible: "Kategori Bronze", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "bronze-f3-t5", tier: "Bronze", name: "Bronze · Fixed 3 th (tenor ≥5)", fixedRate: 8.40, fixedYears: 3, minTenorYears: 5, eligible: "Kategori Bronze", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "bronze-f3-t3", tier: "Bronze", name: "Bronze · Fixed 3 th (tenor ≥3)", fixedRate: 9.75, fixedYears: 3, minTenorYears: 3, eligible: "Kategori Bronze", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),
    S({ id: "bronze-f10", tier: "Bronze", name: "Bronze · Fixed 10 th", fixedRate: 8.86, fixedYears: 10, minTenorYears: 5, eligible: "Kategori Bronze", validUntil: "2026-11-30", source: SRC.mandiriSpesial }),

    /* ---- TAKE OVER / TOP-UP ---- */
    S({ id: "takeover-f10", tier: "Take Over", name: "Take Over / Top-up · Fixed 10 th", fixedRate: 7.77, fixedYears: 10, minTenorYears: 10, maxTenorYears: 20, eligible: "KPR/Multiguna Take Over & Top-up; kredit asal ≥12 bln, lancar 6 bln terakhir, tidak pernah direstrukturisasi; tenor maks 20 th (rumah) / 15 th (apartemen)", validUntil: "2026-11-30", source: SRC.mandiriSpesial + " ; " + SRC.mandiriTakeOver }),

    /* ---- TOP DEVELOPER (partner projects only) ---- */
    // Partner developers: Agung Sedayu, Paramount Land, Sinar Mas Land, Summarecon Agung, Ciputra, Lippo, Jaya, Metland, Alam Sutera, Agung Podomoro.
    S({ id: "topdev-f1-t5", tier: "Top Developer", name: "Top Developer · Fixed 1 th 1,28%", fixedRate: 1.28, fixedYears: 1, minTenorYears: 5, eligible: "Hanya proyek developer mitra (lihat daftar); via Livin' KPR. Provisi/admin/layanan gratis; penalti pelunasan 5% selama 3 th", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-f1-t3", tier: "Top Developer", name: "Top Developer · Fixed 1 th 1,98%", fixedRate: 1.98, fixedYears: 1, minTenorYears: 3, eligible: "Proyek developer mitra; biaya layanan 0,5%", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0.5 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-f2-t5", tier: "Top Developer", name: "Top Developer · Fixed 2 th 2,48%", fixedRate: 2.48, fixedYears: 2, minTenorYears: 5, eligible: "Proyek developer mitra; provisi 0,1%, biaya layanan 0,5%", validUntil: "2026-11-30", fees: { provisiPct: 0.1, adminIdr: 0, biayaLayananPct: 0.5 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-f2-t6", tier: "Top Developer", name: "Top Developer · Fixed 2 th 3,56%", fixedRate: 3.56, fixedYears: 2, minTenorYears: 6, eligible: "Proyek developer mitra; biaya layanan 0,25%", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0.25 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-f3-t10", tier: "Top Developer", name: "Top Developer · Fixed 3 th 2,80%", fixedRate: 2.80, fixedYears: 3, minTenorYears: 10, eligible: "Proyek developer mitra; biaya gratis; penalti 5% selama 5 th", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-f5-t15", tier: "Top Developer", name: "Top Developer · Fixed 5 th 3,20%", fixedRate: 3.20, fixedYears: 5, minTenorYears: 15, eligible: "Proyek developer mitra; biaya gratis; penalti 5% selama 7 th", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-step15", tier: "Top Developer", name: "Top Developer · Berjenjang 15 th", fixedRate: 2.85, fixedYears: 15, steps: [{ rate: 2.85, years: 3 }, { rate: 6.65, years: 3 }, { rate: 9.45, years: 9 }], minTenorYears: 15, eligible: "Proyek developer mitra; biaya layanan 0,25%; penalti 5% selama 10 th", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0.25 }, source: SRC.mandiriTopDev }),
    S({ id: "topdev-step20", tier: "Top Developer", name: "Top Developer · Berjenjang 20 th (fixed sepanjang tenor)", fixedRate: 2.85, fixedYears: 20, steps: [{ rate: 2.85, years: 3 }, { rate: 6.99, years: 3 }, { rate: 8.99, years: 14 }], minTenorYears: 20, eligible: "Proyek developer mitra; biaya gratis; penalti 5% selama 12 th", validUntil: "2026-11-30", fees: { provisiPct: 0, adminIdr: 0, biayaLayananPct: 0 }, source: SRC.mandiriTopDev }),

    /* ---- CORPORATE PAYROLL (reference only — NOT open to TNI) ---- */
    S({ id: "payroll-corp-695", tier: "Payroll Korporasi", name: "Payroll korporasi tertentu · 6,95% fixed sepanjang tenor", fixedRate: 6.95, fixedYears: 30, minTenorYears: 3, maxTenorYears: 30, eligible: "HANYA pegawai grup tertentu (Pertamina, Pelindo, Pelni, Triputra, MMS, dll). Tidak ditemukan program setara untuk TNI/Kemhan per 2026-10-12. Pelindo: provisi 0,10% (min Rp500rb), admin gratis, biaya layanan 1,50%; Pelni: angsuran s.d. 70% penghasilan", validUntil: "2026-12-31", fees: { provisiPct: 0.10, provisiMinIdr: 500000, adminIdr: 0, biayaLayananPct: 1.50 }, referenceOnly: true, source: SRC.mandiriPertamina + " ; " + SRC.mandiriPelindo + " ; " + SRC.mandiriPelni }),

    /* ---- GOVERNMENT SUBSIDY ---- */
    S({ id: "flpp-tapak", tier: "Subsidi", name: "KPR Sejahtera FLPP (rumah tapak) · 5% fixed sepanjang tenor", fixedRate: 5.00, fixedYears: 40, floatingRate: 5.00, minTenorYears: 1, maxTenorYears: 40, eligible: "MBR, rumah pertama, belum pernah menerima subsidi; penghasilan Zona 4 Jabodetabek maks Rp12 jt (lajang) / Rp14 jt (menikah, gabungan); harga rumah tapak Jabodetabek maks Rp185 jt; developer terdaftar Kemen PKP (SiKumbang)", validUntil: "2026-12-31", fees: { provisiPct: 0.50, adminIdr: 500000, biayaLayananPct: 0 }, source: SRC.mandiriFlpp + " ; " + SRC.flpp40 }),
    S({ id: "flpp-rusun", tier: "Subsidi", name: "KPR FLPP rusun · 6% fixed (Komite Tapera Jun 2026)", fixedRate: 6.00, fixedYears: 40, floatingRate: 6.00, minTenorYears: 1, maxTenorYears: 40, eligible: "MBR; unit rusun FLPP tipe 21–45 m²; batas harga 2026 per Kepmen PKP 23/2026 (lihat flpp.priceCaps.rusun2026). Penyaluran via Mandiri untuk rusun belum dikonfirmasi di halaman Mandiri", validUntil: "2026-12-31", fees: { provisiPct: 0.50, adminIdr: 500000, biayaLayananPct: 0 }, source: SRC.flpp40 + " ; " + SRC.flppRusun2026 }),

    /* ---- EXPIRED (kept for audit trail; do not offer) ---- */
    S({ id: "x-gold-f1-260", tier: "Gold", name: "Gold · Fixed 1 th 2,60% (versi halaman sebelumnya)", fixedRate: 2.60, fixedYears: 1, minTenorYears: 5, eligible: "Versi lama halaman KPR Bunga Spesial", validUntil: "2026-09-30", expired: true, source: "Earlier version of " + SRC.mandiriSpesial + " (ID page showed batas pencairan 31 Jul 2026; EN page 30 Sep 2026)" }),
    S({ id: "x-gold-step-396", tier: "Gold", name: "Gold · Berjenjang 3,96/8,66/9,66 (versi sebelumnya)", fixedRate: 3.96, fixedYears: 10, steps: [{ rate: 3.96, years: 3 }, { rate: 8.66, years: 3 }, { rate: 9.66, years: 4 }], minTenorYears: 15, eligible: "Versi lama", validUntil: "2026-09-30", expired: true, source: "Earlier version of " + SRC.mandiriSpesial }),
    S({ id: "x-payroll-pelindo-745", tier: "Payroll Korporasi", name: "Payroll Pelindo 7,45% fixed sepanjang tenor", fixedRate: 7.45, fixedYears: 30, minTenorYears: 3, eligible: "Pegawai Pelindo, periode 1 Jun – 31 Jul 2026", validUntil: "2026-07-31", expired: true, referenceOnly: true, source: "https://www.bankmandiri.co.id/payroll-pelindo" }),
    S({ id: "x-hut-2025-127", tier: "Promo", name: "Promo HUT Mandiri 2025 · mulai 1,27% fixed 1 th", fixedRate: 1.27, fixedYears: 1, minTenorYears: null, eligible: "Promo HUT Oktober 2025", validUntil: "2025-12-31", expired: true, source: "https://finansial.bisnis.com/read/20251002/90/1916911/bank-mandiri-bmri-tawarkan-promo-bunga-kpr-mulai-127 (validity date not verified; promo year 2025)" }),
    S({ id: "x-pegawai-2021", tier: "Pegawai", name: "Mandiri New KPR Pegawai 2021 (3,88% fixed 1 th)", fixedRate: 3.88, fixedYears: 1, minTenorYears: null, maxTenorYears: 25, eligible: "Payroll & non-payroll ASN/TNI/POLRI; DBR s.d. 70% — program 2021", validUntil: "2021-10-31", expired: true, source: SRC.mandiriPegawai2021 })
  ];

  /* ---------------------------------------------------------------------
   * MAIN CONFIG
   * ------------------------------------------------------------------- */
  var CFG = {
    asOf: "2026-10-12",
    currency: "IDR",
    bank: "PT Bank Mandiri (Persero) Tbk",
    branch: "KCP Jakarta Cilangkap",
    disclaimer: "Simulasi indikatif. Persetujuan, suku bunga, tenor, limit dan biaya final mengikuti analisis Bank Mandiri, SP3K dan sistem Bank. Promo dapat berubah sewaktu-waktu.",

    rateSchemes: rateSchemes,
    // Suggested UI presets (ASSUMPTION — category eligibility is set by the bank):
    presets: {
      optimistic: "gold-f3-t15",
      base: "silver-f5-t12",
      conservative: "silver-step10",
      subsidi: "flpp-tapak"
    },
    defaultSchemeId: "silver-f5-t12",

    /* Floating after fixed period */
    floatingDefault: 13.0,
    floatingRange: [11.75, 13.5],
    floatingNote: "Mandiri listed 13% floating after the fixed period for KPR Take Over (Kontan, 23 Aug 2026). Mandiri notice (info-kpr): selected existing debtors get +0,4–0,5 pp from Nov 2026 (illustration 13,00% → 13,40–13,50%). SBDK KPR 11,75% is the floating base reference (not a floor guarantee). Peers: BCA floating 11%, CIMB Niaga 13,5%, Danamon 12,5%.",
    floatingSource: SRC.kontanFloating + " ; " + SRC.mandiriInfoKpr,

    sbdk: { kprKpaPct: 11.75, hpdkPct: 3.19, overheadPct: 5.69, marginPct: 2.87, dataPeriod: "2026-05-31", pageUpdated: "2026-08-31", previousPct: 12.00, note: "SBDK KPR = suku bunga floating normal (di luar program pemerintah/promo). Turun dari 12% (31 Mar–29 Jun 2026) ke 11,75%.", source: SRC.mandiriSbdk + " ; " + SRC.kontanFloating },
    biRate: { pct: 5.75, asOf: "2026-09-23", note: "Ditahan sejak Juni 2026 setelah naik 100 bps dalam dua bulan; DF 4,75%, LF 6,50%. Kenaikan lanjutan masih dibuka akhir 2026/awal 2027.", source: SRC.biRate },
    stressTestBps: [100, 200, 300],

    /* Debt service ratio (installment / net take-home) */
    dsr: {
      default: 0.40,
      min: 0.30,
      max: 0.70,
      presets: { konservatif: 0.30, standar: 0.40, payrollMandiri: 0.70 },
      note: "Mandiri does not publish a DSR cap for regular KPR. ASSUMPTION default 40% = upper end of common bank practice (30–40%). Mandiri corporate-payroll program pages state installments may reach up to 70% of income per Mandiri analysis (Pelni Group page), and the 2021 Mandiri KPR Pegawai program (incl. non-payroll ASN/TNI/POLRI) cited 'DBR hingga 70%'. Include ALL existing installments (KKB, kartu kredit, KTA, paylater, koperasi/TWP potong gaji) in the numerator.",
      source: SRC.dsrNorm + " ; " + SRC.mandiriPelni + " ; " + SRC.mandiriPegawai2021
    },

    /* Income eligibility */
    minIncome: {
      payroll: { "Jakarta/Bekasi/Kab. Karawang": 5000000, "Bogor/Depok/Tangerang/Surabaya": 4500000, "Wilayah lain": 4000000 },
      nonPayrollProfesional: 5000000,
      note: "Payroll = gaji disalurkan via Bank Mandiri. Non-payroll pegawai & wiraswasta cells are blank on the live page (only 'Profesional Rp5 juta' visible, region unclear). Joint income allowed ('Bisa diajukan secara joint income').",
      jointIncomeAllowed: true,
      source: SRC.mandiriKpr + " ; " + SRC.mandiriTakeOver
    },

    tenor: {
      minYears: 1,
      maxYears: 30,
      maxYearsByProduct: { rumahTapak: 30, apartemenRukoRukan: 15, takeOverRumah: 20, takeOverApartemen: 15, flpp: 40, payrollKorporasi: 30 },
      maxAgeAtMaturity: {
        employee: 55,
        professional: 60,
        selfEmployed: 60,
        tni: {
          tamtama: 55,
          bintara: 55,
          perwiraSdKolonel: 58,
          pati1: 60,
          pati2: 61,
          pati3: 62,
          pati4: 63,
          transitional: { note: "UU 3/2025 Pasal II: bintara/tamtama yang saat UU berlaku (26 Mar 2025) berusia 52 th → BUP 53; usia 51 th → 54; <51 th → 55. Pati bintang 1 berusia 57 → 58 (dst. bertahap).", tamtamaBintaraAge52: 53, tamtamaBintaraAge51: 54 }
        },
        pns: { pelaksanaAdministrasi: 58, pimpinanTinggiFungsionalMadya: 60, fungsionalAhliUtama: 65 }
      },
      minAgeAtApplication: { general: 21, flppTni: 18, note: "Min 21 th atau sudah (pernah) menikah. FLPP: TNI/POLRI min 18 th." },
      note: "Mandiri: maks 55 th (pegawai) / 60 th (profesional/wiraswasta) saat kredit lunas. For TNI the dashboard caps maturity at the statutory retirement age (BUP) of the rank group — ASSUMPTION based on Mandiri FLPP wording 'maksimal 55 tahun saat kredit lunas atau sesuai ketentuan pensiun perusahaan' and payroll-deduction practice (potong gaji stops at retirement). A perwira (BUP 58) may therefore get up to 3 more years than a generic employee — confirm with branch credit policy. maxTenor = min(productMax, maxAge − currentAge).",
      source: SRC.mandiriKpr + " ; " + SRC.mandiriFlpp + " ; " + SRC.uuTni + " ; " + SRC.pnsBup
    },

    ltv: {
      regulation: "PADG No. 30/2025 (Perubahan Ketujuh PADG 21/25/PADG/2019) — berlaku 1 Jan 2026, masa berlaku pelonggaran s.d. 31 Des 2026",
      validUntil: "2026-12-31",
      bankMeetsNplCriteria: true,
      firstHouse: { minDpPct: 0, maxLtvPct: 100 },
      secondHouse: { minDpPct: 0, maxLtvPct: 100 },
      thirdPlus: { minDpPct: 0, maxLtvPct: 100 },
      ifBankNotMeetingNpl: {
        rumahTapak: { gt70: { first: 95, secondPlus: 90 }, t21to70: { first: 95, secondPlus: 95 }, le21: { first: 100, secondPlus: 95 } },
        rusun: { gt70: { first: 95, secondPlus: 90 }, t21to70: { first: 95, secondPlus: 95 }, le21: { first: 100, secondPlus: 95 } },
        rukoRukan: { first: 95, secondPlus: 90 }
      },
      practicalDefaultDpPct: 10,
      note: "BI allows LTV up to 100% (DP 0%) for ALL facilities (1st, 2nd, 3rd+) on rumah tapak/rusun/ruko for banks meeting the NPL/NPF criteria; gradual-disbursement (inden) restriction removed since 2021. Mandiri advertises 'Uang muka mulai dari 0%'. 0% DP remains the BANK'S discretion per applicant — practicalDefaultDpPct 10% is an ASSUMPTION for the UI default. Relaxation expires 31 Dec 2026 unless BI extends (no 2027 extension found as of 2026-10-12). FLPP DP from 1%.",
      source: SRC.padg30 + " ; " + SRC.kontanLtv + " ; " + SRC.mandiriKpr
    },

    fees: {
      provisiPct: 1.0,
      provisiRangePct: [0.5, 1.0],
      adminIdr: 500000,
      adminRangeIdr: [250000, 500000],
      appraisalIdr: 1000000,
      appraisalRangeIdr: [500000, 1500000],
      biayaLayananPct: 0,
      notarisPctOrIdr: { kprNotarisPctOfLoan: 0.75, kprNotarisRangePct: [0.7, 1.0], ppatAjbPctOfPrice: 0.75, ppatAjbRangePct: [0.5, 1.0], note: "Notaris KPR (PK, SKMHT/APHT, cek sertifikat) ~0,7–1% dari plafon (estimate). Honor PPAT untuk AJB maks 1% nilai transaksi (aturan ATR/BPN), praktik 0,5–1%; sering ditanggung/di-bundle developer untuk rumah baru." },
      insuranceLifeSinglePremiumPctOfLoan: 1.5,
      insuranceLifeRangePct: [1.0, 2.0],
      insuranceLifePctPerYear: 0.10,
      insuranceFirePctPerYear: 0.05,
      insuranceFireRangePctPerYear: [0.0294, 0.3],
      flpp: { provisiPct: 0.5, adminIdr: 500000 },
      payrollKorporasi: { provisiPct: 0.10, provisiMinIdr: 500000, adminIdr: 0, biayaLayananPct: 1.5 },
      note: "Mandiri lists fee ITEMS (provisi, administrasi, premi asuransi jiwa & kerugian, pengikatan agunan, taksasi, notaris, balik nama) but publishes no amounts for regular KPR. Defaults: provisi 1% (secondary source citing Mandiri); admin/appraisal = industry ranges Jul 2026 (ESTIMATE). Life insurance is usually a SINGLE premium ~1–2% of plafon for the whole tenor (age-dependent) — insuranceLifePctPerYear 0,10 is a DERIVED estimate (~1,5% spread over ~15 yrs), prefer the single-premium field. Fire: SEOJK 6/2017 basic tariff rumah tinggal kelas konstruksi 1 = 0,0294–0,0328%/yr of building value; 0,05% default is an ESTIMATE incl. typical extensions; 0,1–0,3%/yr quoted by media likely includes broader perils. Top Developer & payroll programs override via scheme.fees.",
      source: SRC.mandiriKpr + " ; " + SRC.feesOlxProvisi + " ; " + SRC.feesIndustry + " ; " + SRC.feesDetik + " ; " + SRC.fireTariff + " ; " + SRC.mandiriFlpp + " ; " + SRC.mandiriPelindo
    },

    bphtb: {
      ratePct: 5,
      formula: "BPHTB = 5% × max(0, NPOP − NPOPTKP); NPOP = harga transaksi, atau NJOP PBB bila NPOP tidak diketahui / lebih rendah. NPOPTKP hanya untuk perolehan hak PERTAMA wajib pajak di daerah tsb (Kota Bekasi: 1x seumur hidup).",
      npoptkpByRegion: {
        "DKI Jakarta": 250000000,
        "Kota Depok": 80000000,
        "Kota Bekasi": 80000000,
        "Kab. Bogor": 80000000,
        "Kab. Bekasi": 80000000,
        "Kota Bogor": 80000000,
        "Kota Tangerang Selatan": 80000000,
        "Kota Tangerang": 80000000
      },
      npoptkpWarisByRegion: {
        "DKI Jakarta": 1000000000, "Kota Depok": 500000000, "Kota Bekasi": 300000000, "Kab. Bogor": 400000000,
        "Kab. Bekasi": 300000000, "Kota Bogor": 300000000, "Kota Tangerang Selatan": 300000000, "Kota Tangerang": 300000000
      },
      secondAcquisitionNpoptkp: 0,
      dkiFirstHouseExemptUpTo: null,
      dkiFirstHouseRelief: {
        basis: "Kepgub DKI 840/2025 (berlaku surut 27 Agu 2025), diteruskan Kepgub DKI 450/2026",
        jualBeliTapakAtauRusun: { reductionPct: 50, maxNpop: 500000000 },
        hakBaruTapakAtauTanah: { reductionPct: 75, maxNpop: 1000000000 },
        eligibility: "WP orang pribadi ber-KTP DKI, ≥18 th atau sudah kawin, perolehan hak pertama di DKI (termasuk pasangan), tercatat di sistem Bapenda; diberikan secara jabatan saat pelaporan BPHTB.",
        validUntil: null,
        note: "No full BPHTB exemption threshold for first houses exists in DKI as of 2026-10-12 — the often-quoted 'NJOP ≤ Rp2 miliar' rule is a PBB-P2 exemption (Pergub 16/2024), not BPHTB. Kepgub 840/2025 also gives 75% reduction for TNI/PNS/veteran receiving rumah dinas. Validity end date not stated in sources — verify.",
        source: SRC.ddtcDkiKepgub450 + " ; " + SRC.ddtcDkiKepgub840
      },
      mbrExemption: "Perolehan rumah MBR (FLPP/subsidi) dikecualikan dari BPHTB di daerah yang sudah menerbitkan Perkada (mis. Perbup Kab. Bogor 57/2024, Perwal Kota Bekasi 53/2024, DKI Perda 1/2024 + Kepgub 808/2024). Model as 0 for FLPP but verify per daerah.",
      regionOverrides: {
        "Kota Tangerang Selatan": { warisRatePct: 2.5 },
        "Kota Tangerang": { warisRatePct: 0 }
      },
      source: [SRC.ddtcDkiNpoptkp, SRC.perdaDepok, SRC.perdaKotaBekasi, SRC.perdaKabBogor, SRC.perdaKabBekasi, SRC.perdaKotaBogor, SRC.perdaTangsel, SRC.perdaKotaTangerang].join(" ; ")
    },

    ppnDtp: {
      active: true,
      regulation: "PMK 90/2025 (ditetapkan 18 Des 2025, berlaku 1 Jan 2026)",
      priceCap: 5000000000,
      dtpPortionCap: 2000000000,
      coveredPct: 100,
      effectivePpnPct: 11,
      from: "2026-01-01",
      until: "2026-12-31",
      conditions: "Rumah tapak/satuan rusun BARU siap huni, diserahkan pertama kali oleh PKP penjual, punya kode identitas rumah; AJB/PPJB lunas + BAST dalam 1 Jan–31 Des 2026; 1 unit per orang pribadi (penerima 2024/2025 boleh lagi). Tidak berlaku untuk rumah second/inden.",
      extension2027: { announced: true, announcedOn: "2025-10-14", pmkIssued: false, note: "Menkeu announced extension to 31 Dec 2027 (same Rp5 M cap / Rp2 M DTP portion); no 2027 PMK found as of 2026-10-12." },
      note: "PPN saved = 11% × min(price, Rp2 M) when price ≤ Rp5 M and conditions met; above Rp2 M the buyer pays PPN on the excess. effectivePpnPct 11 = 12% × DPP 11/12 (PMK 131/2024) — not re-verified in this run.",
      source: SRC.ortaxPmk90 + " ; " + SRC.ddtcPpn2027
    },

    flpp: {
      mandiriChannels: true,
      product: "Mandiri KPR Sejahtera FLPP (dikelola BP Tapera, disalurkan Bank Mandiri)",
      rate: 5.0,
      rateRusun: 6.0,
      maxTenorYears: 40,
      tenorNote: "Mandiri page: 'hingga 40 tahun'. Komite Tapera approved 40-yr max (24 Jun 2026); Kepmen PKP 1721 & 1722/KPTS/M/2026 (7 Aug 2026); BP Tapera targeted live transactions from 3rd week Sep 2026 — bank IT readiness varies. Older rule = 20 yrs.",
      dpMinPct: 1,
      sbumIdr: 4000000,
      incomeCap: { zone: "Zona 4 (Jakarta, Bogor, Depok, Tangerang, Bekasi)", singleIdr: 12000000, marriedCombinedIdr: 14000000, minIdr: null },
      priceCaps: {
        tapakJabodetabek: 185000000,
        tapakBasisYear: 2025,
        tapakNote: "Mandiri page shows the 2025 table; BP Tapera (24 Jun 2026) said no landed-house price increase decided yet.",
        rusun2026PerUnit: { "Jakarta Pusat": 652500000, "Jakarta Barat": 630000000, "Jakarta Selatan": 630000000, "Jakarta Timur": 607500000, "Jakarta Utara": 607500000, "Kota/Kab. Bekasi": 607500000, "Kota Depok": 585000000, "Kota/Kab. Bogor": 585000000, "Kota/Kab. Tangerang & Tangsel": 585000000 },
        rusun2026PerM2: { "Jakarta Pusat": 14500000, "Jakarta Barat": 14000000, "Jakarta Selatan": 14000000, "Jakarta Timur": 13500000, "Jakarta Utara": 13500000, "Kota/Kab. Bekasi": 13500000, "Kota Depok": 13000000, "Kota/Kab. Bogor": 13000000, "Kota/Kab. Tangerang & Tangsel": 13000000 },
        rusunAreaM2: [21, 45]
      },
      eligibility: "WNI; pemohon & pasangan belum memiliki rumah dan belum pernah menerima subsidi; pegawai tetap min 3 bln / kontrak min 2 th; usia min 21 (TNI/POLRI min 18), maks 55 th saat lunas atau sesuai ketentuan pensiun; agunan rumah tapak dari developer terdaftar Kemen PKP; registrasi via aplikasi SiKasep/Tapera Mobile.",
      fees: { provisiPct: 0.5, adminIdr: 500000 },
      applicationDeadline: "2026-12-31",
      mandiriExampleInstallment: { loanIdr: 182000000, months: 240, ratePct: 5, installmentIdr: 1195173, note: "Mandiri's own example; a standard nominal-annuity formula gives ≈Rp1.201.119 (+0,5%) — bank system prevails." },
      mandiriVolume2026: "Mandiri disbursed 3.364 FLPP units Jan–23 Jul 2026 (BTN dominant).",
      source: SRC.mandiriFlpp + " ; " + SRC.flpp40 + " ; " + SRC.flppRusun2026 + " ; " + SRC.flppNoRaise + " ; " + SRC.flppMandiriRealisasi
    },

    tniHousingSupport: {
      bpTwpAl: { verified: false, downPaymentAidIdr: null, note: "No verified 2026 BP TWP AL down-payment / housing-aid amount found. (TWP AD figures — e.g. Rp20 jt DP support reported Mar 2025 — must NOT be applied to TNI AL.) Ask Disaal/BP TWP AL directly.", source: SRC.twpAl },
      asabriUangMuka: { verified: false, note: "ASABRI historically offered interest-free DP loans for active TNI/Polri/ASN; current 2026 terms not verified." },
      kemenPkp: "Kemen PKP (Feb 2026) encourages active bintara/tamtama to use KPR subsidi 5% / DP 1%; Rusun Wisma Arunika for TNI AL (Surabaya, ~Rp43 M) — not in Jabodetabek."
    },

    /* -------------------------------------------------------------------
     * PERSONAS — TNI AL payroll base (INDICATIVE take-home ESTIMATES)
     * Method (ESTIMATE): gaji pokok interpolated within PP 6/2024 min–max
     * range for the assumed MKG; + tunjangan istri 10% & anak 2%/anak
     * (maks 2); + tukin per Perpres 42/2026 kelas jabatan (Kontan table;
     * rank→kelas: Prada–Praka k1, Kopda–Kopka k2, Serda–Serka k3,
     * Serma–Peltu k4 per Kontan; Letda k6–7, Kapten k8 per Dealls; Mayor+
     * mapping is an ASSUMPTION); + uang lauk pauk Rp60.000 × 22 hari
     * (conservative; some sources use 30 days); − ASABRI 8% of (gapok +
     * tunj. keluarga) − BPJS Kesehatan 1% (cap Rp12 jt base). PPh 21 on
     * gaji/tunjangan TNI is borne by the government. Excludes koperasi,
     * TWP, Taplin and other unit-level deductions → real net can be LOWER.
     * netIncomeOldTukin = same method with pre-Perpres-42/2026 tukin
     * (Perpres 102/2018 table) in case new tukin is not yet paid.
     * ------------------------------------------------------------------- */
    personas: [
      { id: "tamtama-jr", label: "Kelasi Satu / Kelasi Kepala (Tamtama)", rankGroup: "tamtama", netIncome: 5600000, netIncomeOldTukin: 5000000, ageDefault: 24, family: "lajang", assumedMkg: 4, gapokEst: 1950000, tukinKelas: 1, indicative: true },
      { id: "tamtama-sr", label: "Kopral Kepala (Tamtama senior)", rankGroup: "tamtama", netIncome: 7000000, netIncomeOldTukin: 6100000, ageDefault: 38, family: "menikah, 2 anak", assumedMkg: 16, gapokEst: 2650000, tukinKelas: 2, indicative: true },
      { id: "bintara-jr", label: "Serda / Sertu (Bintara)", rankGroup: "bintara", netIncome: 7400000, netIncomeOldTukin: 6100000, ageDefault: 28, family: "menikah, 1 anak", assumedMkg: 6, gapokEst: 2530000, tukinKelas: 3, indicative: true },
      { id: "bintara-sr", label: "Serma / Peltu (Bintara senior)", rankGroup: "bintara", netIncome: 9000000, netIncomeOldTukin: 7600000, ageDefault: 46, family: "menikah, 2 anak", assumedMkg: 24, gapokEst: 3810000, tukinKelas: 4, indicative: true },
      { id: "pama-jr", label: "Letda / Lettu (Perwira Pertama)", rankGroup: "perwiraSdKolonel", netIncome: 9400000, netIncomeOldTukin: 7200000, ageDefault: 27, family: "menikah", assumedMkg: 4, gapokEst: 3140000, tukinKelas: "6–7", indicative: true },
      { id: "pama-sr", label: "Kapten / Mayor", rankGroup: "perwiraSdKolonel", netIncome: 11200000, netIncomeOldTukin: 8900000, ageDefault: 37, family: "menikah, 2 anak", assumedMkg: 14, gapokEst: 3900000, tukinKelas: "8–9 (ASSUMPTION for Mayor)", indicative: true },
      { id: "pamen", label: "Letkol / Kolonel (Perwira Menengah)", rankGroup: "perwiraSdKolonel", netIncome: 16800000, netIncomeOldTukin: 12500000, ageDefault: 47, family: "menikah, 2 anak", assumedMkg: 24, gapokEst: 4850000, tukinKelas: "11–12 (ASSUMPTION; jabatan-dependent, can be higher)", indicative: true },
      { id: "pns-iii", label: "PNS Gol. III (TNI AL / Kemhan)", rankGroup: "pns", netIncome: 9400000, netIncomeOldTukin: 7200000, ageDefault: 35, family: "menikah, 1 anak", assumedMkg: 10, gapokEst: 3390000, tukinKelas: "6–7 (ASSUMPTION; whether PNS TNI follow Perpres 42/2026 not confirmed)", indicative: true, extraNote: "Gol. III/b PP 5/2024 range Rp2.903.600–4.768.800; uang makan ESTIMATE Rp37.000×22 hari and tunjangan umum Gol. III Rp185.000 not re-verified; IWP 8% + BPJS 1%." }
    ],
    personaSources: [SRC.tniGapok, SRC.tniTukinKatadata, SRC.tniDealls, SRC.pnsGapok, SRC.ulpTni],
    tukinTable2026: { 1: 2553100, 2: 2931100, 3: 3545600, 4: 3760000, 5: 4607300, 6: 4837800, 7: 5079200, 8: 5472100, 9: 6276600, 10: 7183600, 11: 9852300, 12: 11133000, 13: 13977300, 14: 19485000, 15: 21690000, 16: 30058800, 17: 37395000, source: SRC.tniGapok, note: "Perpres 42/2026 (Jul 2026). Kemhan/Mabes TNI implementing rules still being prepared at publication — first payment month not confirmed." },

    sources: SRC
  };

  /* ---------------------------------------------------------------------
   * PURE CALC HELPERS (optional — the dashboard may use or ignore)
   * ------------------------------------------------------------------- */
  function pmt(principal, annualRatePct, months) {
    if (months <= 0) return 0;
    var r = annualRatePct / 100 / 12;
    if (r === 0) return principal / months;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }

  // Rate path for a scheme over tenorYears: array of {fromMonth, toMonth, rate}
  function ratePath(scheme, tenorYears, floatingRate) {
    var fl = floatingRate != null ? floatingRate : (scheme.floatingRate != null ? scheme.floatingRate : CFG.floatingDefault);
    var total = Math.round(tenorYears * 12), m = 0, out = [];
    var steps = scheme.steps && scheme.steps.length ? scheme.steps : [{ rate: scheme.fixedRate, years: scheme.fixedYears }];
    for (var i = 0; i < steps.length && m < total; i++) {
      var len = Math.min(Math.round(steps[i].years * 12), total - m);
      out.push({ fromMonth: m + 1, toMonth: m + len, rate: steps[i].rate, fixed: true });
      m += len;
    }
    if (m < total) out.push({ fromMonth: m + 1, toMonth: total, rate: fl, fixed: false });
    return out;
  }

  // Annuity re-amortised at every rate change (how Indonesian KPR resets work)
  function schedule(principal, scheme, tenorYears, floatingRate) {
    var path = ratePath(scheme, tenorYears, floatingRate);
    var total = Math.round(tenorYears * 12), bal = principal, rows = [], interestTotal = 0;
    path.forEach(function (seg) {
      var remaining = total - seg.fromMonth + 1;
      var inst = pmt(bal, seg.rate, remaining);
      for (var k = seg.fromMonth; k <= seg.toMonth; k++) {
        var interest = bal * seg.rate / 100 / 12;
        var princ = Math.min(inst - interest, bal);
        bal = Math.max(0, bal - princ);
        interestTotal += interest;
      }
      rows.push({ fromMonth: seg.fromMonth, toMonth: seg.toMonth, rate: seg.rate, fixed: seg.fixed, installment: Math.round(inst), balanceAfter: Math.round(bal) });
    });
    return { segments: rows, totalInterest: Math.round(interestTotal), firstInstallment: rows.length ? rows[0].installment : 0, maxInstallment: rows.reduce(function (a, r) { return Math.max(a, r.installment); }, 0) };
  }

  function maxAgeAtMaturity(rankGroup) {
    var t = CFG.tenor.maxAgeAtMaturity;
    if (t.tni[rankGroup] != null) return t.tni[rankGroup];
    if (rankGroup === "pns") return t.pns.pelaksanaAdministrasi;
    if (rankGroup === "professional" || rankGroup === "selfEmployed") return t.professional;
    return t.employee;
  }

  function maxTenorYears(age, rankGroup, productKey) {
    var byAge = maxAgeAtMaturity(rankGroup) - age;
    var prod = CFG.tenor.maxYearsByProduct[productKey || "rumahTapak"] || CFG.tenor.maxYears;
    return Math.max(0, Math.min(prod, Math.floor(byAge)));
  }

  // Max loan such that the chosen installment basis fits the DSR budget.
  // basis "max" (default, prudent): worst installment incl. floating + stress bps.
  // basis "first": promo-period installment only (what marketing usually quotes — riskier).
  function maxLoanFromIncome(netIncome, existingInstallments, dsr, scheme, tenorYears, stressBps, basis) {
    var budget = Math.max(0, netIncome * (dsr != null ? dsr : CFG.dsr.default) - (existingInstallments || 0));
    var fl = (scheme.floatingRate != null ? scheme.floatingRate : CFG.floatingDefault) + (stressBps || 0) / 100;
    var sch = schedule(1e9, scheme, tenorYears, fl);
    var unit = (basis === "first" ? sch.firstInstallment : sch.maxInstallment) / 1e9; // linear in principal
    return unit > 0 ? Math.floor(budget / unit) : 0;
  }

  function bphtb(npop, region, opts) {
    opts = opts || {};
    var B = CFG.bphtb;
    var nptkp = opts.firstAcquisition === false ? 0 : (B.npoptkpByRegion[region] != null ? B.npoptkpByRegion[region] : 80000000);
    if (opts.mbr) return 0;
    var tax = Math.max(0, npop - nptkp) * B.ratePct / 100;
    if (region === "DKI Jakarta" && opts.firstAcquisition !== false && opts.ktpDki) {
      var R = B.dkiFirstHouseRelief;
      if (opts.hakBaru && npop <= R.hakBaruTapakAtauTanah.maxNpop) tax *= (1 - R.hakBaruTapakAtauTanah.reductionPct / 100);
      else if (!opts.hakBaru && npop <= R.jualBeliTapakAtauRusun.maxNpop) tax *= (1 - R.jualBeliTapakAtauRusun.reductionPct / 100);
    }
    return Math.round(tax);
  }

  function ppnDtpSaving(price, isNewReadyFromPkp, deliveryDateIso) {
    var P = CFG.ppnDtp;
    if (!P.active || !isNewReadyFromPkp || price > P.priceCap) return 0;
    if (deliveryDateIso && (deliveryDateIso < P.from || deliveryDateIso > P.until)) return 0;
    return Math.round(Math.min(price, P.dtpPortionCap) * P.effectivePpnPct / 100 * P.coveredPct / 100);
  }

  function upfrontCosts(price, loan, scheme, opts) {
    opts = opts || {};
    var F = CFG.fees, sf = (scheme && scheme.fees) || {};
    var provisiPct = sf.provisiPct != null ? sf.provisiPct : F.provisiPct;
    var provisi = Math.max(loan * provisiPct / 100, sf.provisiMinIdr || 0);
    var admin = sf.adminIdr != null ? sf.adminIdr : F.adminIdr;
    var layanan = loan * (sf.biayaLayananPct != null ? sf.biayaLayananPct : F.biayaLayananPct) / 100;
    var appraisal = opts.isFlpp ? 0 : F.appraisalIdr;
    var notaris = loan * F.notarisPctOrIdr.kprNotarisPctOfLoan / 100;
    var ajb = opts.developerCoversAjb ? 0 : price * F.notarisPctOrIdr.ppatAjbPctOfPrice / 100;
    var life = loan * F.insuranceLifeSinglePremiumPctOfLoan / 100;
    var fire = (opts.buildingValue || price * 0.6) * F.insuranceFirePctPerYear / 100 * (opts.fireYearsUpfront || 1);
    var tax = bphtb(price, opts.region || "DKI Jakarta", opts);
    var dp = Math.max(0, price - loan);
    var items = { dp: dp, provisi: provisi, admin: admin, biayaLayanan: layanan, appraisal: appraisal, notarisKpr: notaris, ppatAjb: ajb, asuransiJiwa: life, asuransiKebakaran: fire, bphtb: tax };
    var total = 0; for (var k in items) total += items[k];
    items.total = Math.round(total);
    items.ppnDtpSaving = ppnDtpSaving(price, !!opts.isNewReadyFromPkp, opts.deliveryDateIso);
    items.note = "fire assumes building value = 60% of price unless given (ASSUMPTION)";
    return items;
  }

  CFG.calc = {
    pmt: pmt,
    ratePath: ratePath,
    schedule: schedule,
    maxAgeAtMaturity: maxAgeAtMaturity,
    maxTenorYears: maxTenorYears,
    maxLoanFromIncome: maxLoanFromIncome,
    bphtb: bphtb,
    ppnDtpSaving: ppnDtpSaving,
    upfrontCosts: upfrontCosts,
    activeSchemes: function (todayIso) {
      var d = todayIso || CFG.asOf;
      return CFG.rateSchemes.filter(function (s) { return !s.expired && !s.referenceOnly && (!s.validUntil || s.validUntil >= d); });
    }
  };

  window.MCD_KPR_CONFIG = CFG;
  if (window.MCD && typeof window.MCD === "object") { window.MCD.kprConfig = CFG; }
})();
