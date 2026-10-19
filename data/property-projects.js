/* Mandiri KCP Jakarta Cilangkap – primary-market residential projects within 30 km.
 * Generated 2026-10-12. Classic script: exposes window.MCD_PROPERTY_PROJECTS.
 * Prices indicative; verify with developer before quoting. Sources in meta.sources. */
window.MCD_PROPERTY_PROJECTS = {
 "meta": {
  "generated": "2026-10-12",
  "center": [
   106.91329,
   -6.32818
  ],
  "centerLabel": "Mabes TNI Cilangkap (centroid) – Bank Mandiri KCP Jakarta Cilangkap",
  "radiusKm": 30,
  "note": "Primary-market projects compiled from public developer/news sources; prices indicative — verify before quoting.",
  "noteId": "Proyek pasar primer (developer) dari sumber publik: registri SiKumbang (Kementerian PKP/BP Tapera), situs developer, dan berita 2025–2026. Harga bersifat indikatif — wajib verifikasi ke developer sebelum dikutip ke nasabah.",
  "counts": {
   "rows": 150,
   "byBand": {
    "0-5": 13,
    "5-10": 34,
    "10-15": 25,
    "15-20": 31,
    "20-30": 47
   },
   "bySegment": {
    "menengah-atas": 40,
    "menengah": 61,
    "premium": 10,
    "subsidi": 39
   },
   "byType": {
    "townhouse": 8,
    "apartment": 21,
    "landed": 121
   },
   "mandiriPartnerTrue": 42
  },
  "fields": {
   "lon/lat": "WGS84. coordSource menjelaskan asal titik: poligon/titik OSM (centroid klaster) atau koordinatPerumahan SiKumbang (geotag developer). coordNote berisi peringatan bila titik jatuh di luar wilayah administratif yang didaftarkan.",
   "distanceKm": "Haversine (garis lurus) dari center.",
   "segment": "subsidi = proyek yang dominan menjual unit FLPP (rumah tapak ≤Rp185 jt atau rusun subsidi); selain itu berdasarkan priceMin: menengah < Rp1 M; menengah-atas Rp1–<3 M; premium ≥ Rp3 M.",
   "type": "landed | townhouse | apartment",
   "priceMin/priceMax": "IDR. Untuk sumber SiKumbang = harga termurah/termahal tipe yang didaftarkan developer (setelah membuang entri anomali). priceMax null = hanya harga mulai yang dipublikasikan. priceSource menjelaskan asal angka.",
   "subsidiPrice": "[min,max] IDR tipe berstatus subsidi di SiKumbang (null jika tidak ada).",
   "lt/lb": "[min,max] m² luas tanah/bangunan per tipe (null jika tidak diketahui; lt null untuk apartemen).",
   "status": "selling | launching | sold-out-unknown. sold-out-unknown = SiKumbang tidak menampilkan unit tersedia atau data harga lama — ketersediaan tidak dapat dipastikan.",
   "unitsAvailable": "Jumlah unit berstatus tersedia di siteplan digital SiKumbang saat diakses (subsidi/komersial). Developer tidak selalu memperbarui siteplan.",
   "kprPartners": "Bank KPR yang terverifikasi dari sumber publik. \"Bank Mandiri\" = developer grup tercantum sebagai mitra di halaman Livin' KPR Bank Mandiri (tingkat developer, bukan konfirmasi per proyek).",
   "mandiriPartner": "true = grup developer disebut di halaman resmi Bank Mandiri (Sinarmas Land, Ciputra, Summarecon, Jaya Land, Metland, Pakuwon); null = tidak diketahui (BUKAN berarti tidak bekerja sama — Mandiri menyebut \"ratusan developer\").",
   "transit": "Stasiun KRL/LRT/MRT/Whoosh & gerbang tol terdekat dari data OSM, jarak garis lurus.",
   "priceAsOf": "Bulan pembaruan harga (YYYY-MM) atau keterangan tanggal sumber. registryUpdated = tanggal pembaruan terakhir entri SiKumbang.",
   "confidence": "high = data registri ≥ Jun 2025 + titik tervalidasi, atau rilis developer/berita terbaru; medium = sumber pemasaran tanpa tanggal / titik perlu dicek; low = harga lama (< Jun 2024) atau sumber tidak resmi.",
   "riskNote": "Peringatan risiko serah terima/legal yang perlu dicek sebelum KPR inden."
  },
  "kprPolicy": {
   "flppLandedMaxPriceJabodetabek": 185000000,
   "flppLandedMaxPriceBasis": "Kepmen PKP 1722/KPTS/M/2026 (ditandatangani 6 Agu 2026) — batas harga tidak naik; konsisten dengan harga subsidi Rp185 jt di SiKumbang untuk Kab./Kota Bogor, Depok, Bekasi.",
   "flppLanded": {
    "ratePct": 5,
    "fixed": true,
    "maxTenorYears": 20,
    "dpMinPct": 1,
    "ppn": "bebas PPN",
    "source": "https://www.medcom.id/properti/news-properti/4KZQOZ6k-rumah-subsidi-2026-bunga-5-dan-syarat-terbaru-flpp"
   },
   "flppRusun": {
    "ratePct": 6,
    "note": "Rusun subsidi bunga 6% (Detik Okt 2026); Meikarta via Nobu Bank: 6% tetap, tenor s.d. 30 th, DP mulai 1%. Harga rusun subsidi diatur per m² (Kepmen PKP 23/KPTS/M/2026).",
    "sources": [
     "https://www.detik.com/properti/berita/d-8686955/batas-gaji-buat-kpr-subsidi-jadi-rp-17-juta",
     "https://www.medcom.id/properti/news-properti/zNAdJRvK-meikarta-perluas-akses-rumah-subsidi-lewat-kpr-flpp"
    ]
   },
   "mbrIncomeLimitJabodetabek": {
    "single": 12000000,
    "married": 14000000,
    "source": "https://www.medcom.id/properti/news-properti/zNAdJRvK-meikarta-perluas-akses-rumah-subsidi-lewat-kpr-flpp",
    "note": "Dikutip media 2026; sebagian bank masih memakai acuan lama — konfirmasi ke bank penyalur/BP Tapera."
   },
   "planned6pctScheme": {
    "status": "RENCANA (belum ada aturan teknis per 12 Okt 2026)",
    "ratePct": 6,
    "incomeAround": 17000000,
    "maxHousePrice": 500000000,
    "source": "https://www.cnnindonesia.com/ekonomi/20260930193829-532-1410168/pemerintah-siapkan-kpr-subsidi-bunga-6-buat-pekerja-bergaji-rp17-juta"
   },
   "mandiriLivinKpr": {
    "validUntil": "2026-11-30",
    "maxLoan": 15000000000,
    "maxTenorYears": {
     "payrollMandiri": 30,
     "nonPayroll": 25,
     "apartment": 15
    },
    "maxAgeAtMaturity": 55,
    "partnerDevelopersNamed": [
     "Sinarmas Land",
     "Ciputra",
     "Summarecon",
     "Jaya Land",
     "Metland",
     "Pakuwon"
    ],
    "note": "Suku bunga promo hanya tampil sebagai gambar di halaman — tidak dicantumkan di sini.",
    "source": "https://www.bankmandiri.co.id/en/kpr-hut-mandiri-28"
   }
  },
  "expiredOrExpiringPromos": [
   {
    "what": "Bank Mandiri × Metland Blanjaproperti 2025 (fixed mulai 2,66%/3 th)",
    "until": "2025-07-22",
    "status": "EXPIRED",
    "source": "https://www.bankmandiri.co.id/en/kpr-metland"
   },
   {
    "what": "CitraLand Cibubur – promo situs penjualan",
    "until": "2026-03-31",
    "status": "EXPIRED",
    "source": "https://www.citralandcibubur.com/new-cluster-harga-perdana-pre-sale-660-juta/"
   },
   {
    "what": "Bukit Podomoro Jakarta – promo PPN DTP",
    "until": "2026-06-30",
    "status": "EXPIRED",
    "source": "https://www.bukit-podomoro-jakarta.com/"
   },
   {
    "what": "Cimanggis Golf Estate – diskon ready stock",
    "until": "2026-08-31",
    "status": "EXPIRED",
    "source": "https://cimanggisgolfestate.id/"
   },
   {
    "what": "Grand Wisata Dovia – promo \"April 2026\"",
    "until": "2026-04-30",
    "status": "EXPIRED (perkiraan)",
    "source": "https://www.sinarmasland.com/id/news/sinar-mas-land-hadirkan-dovia-di-kawasan-ladoria-grand-wisata-bekasi"
   },
   {
    "what": "CitraIndah Bukit Meranti – harga promo tunai Des 2025",
    "until": "2025-12",
    "status": "KEMUNGKINAN BERAKHIR",
    "source": "https://citraindahciputra.com/about-citra-indah-topmenu-86/harga-cara-bayar-citra-indah/3073-harga-desember-2025-bukti-meranti.html"
   },
   {
    "what": "Grand Kota Bintang Cluster Roma – early bird ±Rp2 M (30 unit pertama, Agu 2025)",
    "until": "kuota 30 unit",
    "status": "KEMUNGKINAN BERAKHIR",
    "source": "https://www.sintesanews.com/bicara-grand-kota-bintang-bekasi-dan-klaster-terintegrasi/"
   },
   {
    "what": "Bank Mandiri Livin' KPR HUT 28",
    "until": "2026-11-30",
    "status": "ACTIVE (49 hari lagi per 12 Okt 2026)",
    "source": "https://www.bankmandiri.co.id/en/kpr-hut-mandiri-28"
   }
  ],
  "riskFlags": [
   "Proyek grup Adhi Commuter Properti (LRT City Ciracas/Jatibening, Royal Sentul Park, Adhi City Sentul) sempat mangkrak; sebagian dilanjutkan sejak 1 Okt 2026 (Detik/Bisnis 2026). Hindari KPR inden tanpa due diligence.",
   "Rusun subsidi Meikarta baru land clearing Jan 2026; akad ditargetkan akhir 2026 setelah progres ≥20%."
  ],
  "method": [
   "Registri SiKumbang (sikumbang.tapera.go.id) diakses 2026-10-12 per kab/kota (Jakarta Timur/Selatan/Pusat/Utara, Kota & Kab. Bekasi, Kota & Kab. Bogor, Kota Depok); 2.083 lokasi, 1.652 dalam radius 30 km. Hanya field tingkat proyek yang disimpan — kontak marketing, NIK/NPWP dan data per-unit TIDAK diambil.",
   "Dikurasi 150 proyek: proyek developer bermerek (cross-check situs developer/berita 2025–2026), proyek aktif dekat pusat, dan 34 proyek rumah subsidi FLPP dengan ≥10 unit subsidi tersedia & update ≥ Jun 2025. Pengembang perorangan (nama orang) dikeluarkan.",
   "Koordinat SiKumbang divalidasi point-in-polygon terhadap batas kab/kota OSM; 4 titik dekat perbatasan diberi coordNote.",
   "Portal listing (Rumah123, 99.co, Rumah.com, Lamudi, OLX, Pinhome, Pashouses) tidak di-scrape."
  ],
  "sources": [
   {
    "title": "SiKumbang – Sistem Informasi Kumbang (Kementerian PKP / BP Tapera): registri publik lokasi perumahan, tipe & harga, koordinat",
    "url": "https://sikumbang.tapera.go.id/",
    "kind": "registry"
   },
   {
    "title": "OpenStreetMap contributors (ODbL) – poligon klaster, stasiun, gerbang tol, batas kecamatan (via Overpass & Nominatim)",
    "url": "https://www.openstreetmap.org/copyright",
    "kind": "geodata"
   },
   {
    "title": "Kompas (13 Agu 2026) – Kepmen PKP 1722/KPTS/M/2026: harga rumah subsidi tidak naik",
    "url": "https://www.kompas.com/properti/read/2026/08/13/180600721/pengumuman-harga-rumah-subsidi-tidak-naik-ini-rinciannya",
    "kind": "policy"
   },
   {
    "title": "Medcom – Rumah subsidi 2026: bunga FLPP 5%, tenor maks. 20 th, DP mulai 1%",
    "url": "https://www.medcom.id/properti/news-properti/4KZQOZ6k-rumah-subsidi-2026-bunga-5-dan-syarat-terbaru-flpp",
    "kind": "policy"
   },
   {
    "title": "medcom.id",
    "url": "https://www.medcom.id/properti/news-properti/zNAdJRvK-meikarta-perluas-akses-rumah-subsidi-lewat-kpr-flpp",
    "kind": "policy"
   },
   {
    "title": "Detik (Okt 2026) – Batas gaji KPR subsidi skema baru Rp17 jt; bunga 5% tapak / 6% rusun",
    "url": "https://www.detik.com/properti/berita/d-8686955/batas-gaji-buat-kpr-subsidi-jadi-rp-17-juta",
    "kind": "policy"
   },
   {
    "title": "CNN Indonesia (30 Sep 2026) – Rencana KPR subsidi bunga 6% untuk penghasilan ±Rp17 jt, rumah s.d. Rp500 jt",
    "url": "https://www.cnnindonesia.com/ekonomi/20260930193829-532-1410168/pemerintah-siapkan-kpr-subsidi-bunga-6-buat-pekerja-bergaji-rp17-juta",
    "kind": "policy"
   },
   {
    "title": "Kompas (18 Mar 2026) – Kepmen PKP 23/KPTS/M/2026 rusun subsidi",
    "url": "https://www.kompas.com/properti/read/2026/03/18/200332221/kepmen-pkp-soal-apartemen-subsidi-bisa-mengubah-nasib-kelas-pekerja?page=all",
    "kind": "policy"
   },
   {
    "title": "Bank Mandiri – Livin' KPR HUT Mandiri 28 (mitra developer; suku bunga berlaku s.d. 30 Nov 2026)",
    "url": "https://www.bankmandiri.co.id/en/kpr-hut-mandiri-28",
    "kind": "policy"
   },
   {
    "title": "Bank Mandiri – KPR Metland Blanjaproperti 2025 (periode 22 Apr–22 Jul 2025, SUDAH BERAKHIR)",
    "url": "https://www.bankmandiri.co.id/en/kpr-metland",
    "kind": "policy"
   },
   {
    "title": "finance.detik.com",
    "url": "https://finance.detik.com/berita-ekonomi-bisnis/d-6281963/rumah-dp-rp-0-cilangkap-dijual-mulai-rp-200-juta-an-bisa-dicicil-20-tahun",
    "kind": "project"
   },
   {
    "title": "ekonomi.bisnis.com",
    "url": "https://ekonomi.bisnis.com/read/20210327/47/1373346/trivo-developer-jepang-garap-sakura-garden-city-mulai-topping-off",
    "kind": "project"
   },
   {
    "title": "urbansignature.co",
    "url": "https://www.urbansignature.co/",
    "kind": "project"
   },
   {
    "title": "detik.com",
    "url": "https://www.detik.com/properti/berita/d-8688338/daftar-4-proyek-lrt-city-yang-mulai-dibangun-lagi-hari-ini",
    "kind": "project"
   },
   {
    "title": "ekonomi.bisnis.com",
    "url": "https://ekonomi.bisnis.com/read/20260721/47/1989900/heboh-proyek-lrt-city-dituding-mangkrak-adhi-commuter-adcp-buka-suara",
    "kind": "project"
   },
   {
    "title": "pp-properti.com",
    "url": "https://pp-properti.com/pers/permata-puri-cibubur-tawarkan-hunian-dengan-konsep-tropical-house",
    "kind": "project"
   },
   {
    "title": "myhomemagz.com",
    "url": "https://www.myhomemagz.com/proyek-the-belton-residence-sudah-tutup-atap/",
    "kind": "project"
   },
   {
    "title": "Sinar Mas Land – Kota Wisata (start-from per klaster)",
    "url": "https://www.sinarmasland.com/development/township/kota-wisata",
    "kind": "project"
   },
   {
    "title": "kfmap.asia",
    "url": "https://kfmap.asia/news/kota-wisata-ecovia-a-strategic-bet-by-japanese-and-indonesian-giants/4452",
    "kind": "project"
   },
   {
    "title": "analisproperti.com",
    "url": "https://www.analisproperti.com/2026/02/launching-soon-citra-homes-halim.html",
    "kind": "project"
   },
   {
    "title": "detik.com",
    "url": "https://www.detik.com/properti/berita/d-8067559/citragran-cibubur-hadirkan-glenview-hunian-modern-klasik-strategis",
    "kind": "project"
   },
   {
    "title": "rumahsaya.bca.co.id",
    "url": "https://rumahsaya.bca.co.id/developer/ciputra/bekasi/citragran-signature-cibubur",
    "kind": "project"
   },
   {
    "title": "kfmap.asia",
    "url": "https://kfmap.asia/news/sinar-mas-land-launches-averon-cluster-in-kota-wisata-cibubur/4107",
    "kind": "project"
   },
   {
    "title": "cimanggisgolfestate.id",
    "url": "https://cimanggisgolfestate.id/",
    "kind": "project"
   },
   {
    "title": "sintesanews.com",
    "url": "https://www.sintesanews.com/bicara-grand-kota-bintang-bekasi-dan-klaster-terintegrasi/",
    "kind": "project"
   },
   {
    "title": "metlandcileungsi.co.id",
    "url": "https://metlandcileungsi.co.id/properti.php",
    "kind": "project"
   },
   {
    "title": "podomoro-river-view.com",
    "url": "https://www.podomoro-river-view.com/",
    "kind": "project"
   },
   {
    "title": "metlandtransyogi.co.id",
    "url": "https://metlandtransyogi.co.id/komparasi.php?cluster_id=7",
    "kind": "project"
   },
   {
    "title": "metlandtransyogi.co",
    "url": "https://www.metlandtransyogi.co/",
    "kind": "project"
   },
   {
    "title": "podomoro-golf-view.com",
    "url": "https://www.podomoro-golf-view.com/",
    "kind": "project"
   },
   {
    "title": "agungpodomoroland.com",
    "url": "https://www.agungpodomoroland.com/id/publications/read/890/podomoro-golf-view-sukses-percepat-serah-terima-cluster-khaya-tahap-kedua",
    "kind": "project"
   },
   {
    "title": "citralandcibubur.com",
    "url": "https://www.citralandcibubur.com/new-cluster-harga-perdana-pre-sale-660-juta/",
    "kind": "project"
   },
   {
    "title": "rumahsaya.bca.co.id",
    "url": "https://rumahsaya.bca.co.id/developer/ciputra/bogor/citraland-cibubur",
    "kind": "project"
   },
   {
    "title": "Sinar Mas Land – Grand Wisata (start-from per klaster)",
    "url": "https://www.sinarmasland.com/development/township/grand-wisata",
    "kind": "project"
   },
   {
    "title": "sinarmasland.com",
    "url": "https://www.sinarmasland.com/id/news/sinar-mas-land-hadirkan-dovia-di-kawasan-ladoria-grand-wisata-bekasi",
    "kind": "project"
   },
   {
    "title": "propertiterkini.com",
    "url": "https://propertiterkini.com/harvest-city-tawarkan-hunian-gaya-american-classic-mulai-rp13-miliar/",
    "kind": "project"
   },
   {
    "title": "suarabantennews.com",
    "url": "https://suarabantennews.com/sinar-mas-land-luncurkan-klaster-ruby-at-the-ridge-di-harvest-city-hunian-american-classic-mulai-rp-13-miliar/",
    "kind": "project"
   },
   {
    "title": "majalahglobalreview.com",
    "url": "https://www.majalahglobalreview.com/hingga-akhir-2026-summarecon-bekasi-targetkan-rp400-miliar-dari-penjualan-30-unit-rumah-mewah-klaster-soultan-island/",
    "kind": "project"
   },
   {
    "title": "gobekasi.id",
    "url": "https://gobekasi.id/2026/02/25/bidik-rp400-miliar-summarecon-bekasi-genjot-penjualan-klaster-supermewah-soultan-island/",
    "kind": "project"
   },
   {
    "title": "sinarmasland.com",
    "url": "https://www.sinarmasland.com/id/news/sinar-mas-land-luncurkan-klaster-altara-di-grand-wisata-bekasi",
    "kind": "project"
   },
   {
    "title": "rumahsaya.bca.co.id",
    "url": "https://rumahsaya.bca.co.id/developer/sinarmas-land/bekasi/grand-wisata/altara-home-_-altara",
    "kind": "project"
   },
   {
    "title": "wartaekonomi.co.id",
    "url": "https://wartaekonomi.co.id/read584986/bidik-pasar-anak-muda-modernland-launching-florence-village-hunian-900-jutaan-di-jakarta",
    "kind": "project"
   },
   {
    "title": "kabarproperti.id",
    "url": "https://kabarproperti.id/modernland-luncurkan-florence-village-hunian-seharga-rp900-jutaan-di-jakarta-garden-city",
    "kind": "project"
   },
   {
    "title": "belirumah.co",
    "url": "https://belirumah.co/berita/2026/6/2/rumah-harapan-indah-jual-kawasan-favorit-di-bekasi",
    "kind": "project"
   },
   {
    "title": "propertiterkini.com",
    "url": "https://propertiterkini.com/kota-harapan-indah-raih-people-choices-2026/",
    "kind": "project"
   },
   {
    "title": "propertynbank.com",
    "url": "https://www.propertynbank.com/lotte-land-sawangan-luncurkan-hunian-mewah/",
    "kind": "project"
   },
   {
    "title": "mediaindonesia.com",
    "url": "https://mediaindonesia.com/ekonomi/718002/citraindah-city-luncurkan-klaster-baru-bukit-freesia-berkonsep-modern-klasik-eropa-",
    "kind": "project"
   },
   {
    "title": "rumahsaya.bca.co.id",
    "url": "https://rumahsaya.bca.co.id/developer/ciputra/bogor/citraindah-city-jonggol",
    "kind": "project"
   },
   {
    "title": "citraindahciputra.com",
    "url": "https://citraindahciputra.com/about-citra-indah-topmenu-86/harga-cara-bayar-citra-indah/3073-harga-desember-2025-bukti-meranti.html",
    "kind": "project"
   },
   {
    "title": "btnproperti.co.id",
    "url": "https://www.btnproperti.co.id/property/tipe/detail/the-alpha-l2-TPR2024121914331917",
    "kind": "project"
   },
   {
    "title": "ekonomi.bisnis.com",
    "url": "https://ekonomi.bisnis.com/read/20221005/47/1584459/lippo-cikarang-lpck-tawarkan-hunian-newville-harga-mulai-rp279-juta",
    "kind": "project"
   },
   {
    "title": "kompas.com",
    "url": "https://www.kompas.com/properti/read/2026/02/03/090000821/ini-perkiraan-harga-rusun-subsidi-meikarta",
    "kind": "project"
   },
   {
    "title": "propertiindonesia.id",
    "url": "https://propertiindonesia.id/post/milirik-citra-city-sentul-proyek-terbaru-lansiran-ciputra-group",
    "kind": "project"
   },
   {
    "title": "cendana-home.com",
    "url": "https://www.cendana-home.com/cendana-spark/",
    "kind": "project"
   },
   {
    "title": "Sinar Mas Land – Kota Deltamas (start-from per klaster)",
    "url": "https://www.sinarmasland.com/development/township/kota-deltamas",
    "kind": "project"
   },
   {
    "title": "metrotvnews.com",
    "url": "https://www.metrotvnews.com/read/NQACYDpo-sentul-city-kolaborasi-garap-hunian-berkonsep-eco-city-smart-home",
    "kind": "project"
   }
  ]
 },
 "rows": [
  {
   "id": "pp-ruma-setu-dua",
   "name": "Ruma Setu Dua",
   "developer": "PT Umawar Kreata Properti (Ruma.id)",
   "developerGroup": "Umawar/Ruma.id",
   "lon": 106.919909,
   "lat": -6.317904,
   "kota": "Jakarta Timur",
   "kecamatan": "Cipayung",
   "desa": "Setu",
   "distanceKm": 1.36,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 1650000000,
   "priceMax": 1795587000,
   "subsidiPrice": null,
   "lt": [
    74,
    84
   ],
   "lb": [
    112,
    118
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 3.7 km · GT Jatiwarna 0.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 3.7
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 8.9
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 9.0
     }
    ],
    "toll": {
     "name": "GT Jatiwarna",
     "km": 0.8
    }
   },
   "priceAsOf": "2026-10",
   "registryUpdated": "2026-10-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG1010052026T001",
   "extraSources": [],
   "sikumbangId": "CKG1010052026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Registrasi SiKumbang Okt 2026; materi pemasaran: mulai ±Rp1,8 M. Unit tersedia belum terpetakan di siteplan SiKumbang.",
   "band": "0-5"
  },
  {
   "id": "pp-paradesa-setu-extension",
   "name": "Paradesa Setu (Extension)",
   "developer": "PT Umawar Karsa Realty (Ruma.id)",
   "developerGroup": "Umawar/Ruma.id",
   "lon": 106.917745,
   "lat": -6.316,
   "kota": "Jakarta Timur",
   "kecamatan": "Cipayung",
   "desa": "Setu",
   "distanceKm": 1.44,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 1610000000,
   "priceMax": 2545000000,
   "subsidiPrice": null,
   "lt": [
    72,
    122
   ],
   "lb": [
    90,
    128
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 3.5 km · GT Jatiwarna 0.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 3.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 8.6
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 8.8
     }
    ],
    "toll": {
     "name": "GT Jatiwarna",
     "km": 0.7
    }
   },
   "priceAsOf": "2025-09",
   "registryUpdated": "2025-09-15",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG1010052025T001",
   "extraSources": [],
   "sikumbangId": "CKG1010052025T001",
   "coordSource": "OSM way/1363794468 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Townhouse ±90-100 m² di Setu, Cipayung; ketersediaan unit belum terpetakan di SiKumbang.",
   "band": "0-5"
  },
  {
   "id": "pp-nuansa-cilangkap-menara-kanaya-hunian-dp0-pempro",
   "name": "Nuansa Cilangkap – Menara Kanaya (hunian DP0 Pemprov DKI)",
   "developer": "Perumda Pembangunan Sarana Jaya",
   "developerGroup": "Sarana Jaya (BUMD DKI)",
   "lon": 106.902579,
   "lat": -6.343173,
   "kota": "Jakarta Timur",
   "kecamatan": "Cipayung",
   "desa": "Cilangkap",
   "distanceKm": 2.04,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 225420000,
   "priceMax": 416583000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    22.1,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 34,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 2.8 km · GT Cibubur 2.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 2.8
     },
     {
      "mode": "KRL",
      "name": "Universitas Pancasila",
      "km": 7.6
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 11.0
     }
    ],
    "toll": {
     "name": "GT Cibubur",
     "km": 2.6
    }
   },
   "priceAsOf": "2025-02",
   "registryUpdated": "2025-02-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG1010022025R001",
   "extraSources": [
    "https://finance.detik.com/berita-ekonomi-bisnis/d-6281963/rumah-dp-rp-0-cilangkap-dijual-mulai-rp-200-juta-an-bisa-dicicil-20-tahun"
   ],
   "sikumbangId": "CKG1010022025R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Rusunami program hunian terjangkau Pemprov DKI (syarat KTP DKI & batas penghasilan). Detik 2022: studio mulai ±Rp200 jt cash, cicilan 5-20 th.",
   "band": "0-5"
  },
  {
   "id": "pp-grand-dhika-city-lifestyle-jatiwarna",
   "name": "Grand Dhika City Lifestyle Jatiwarna",
   "developer": "PT Adhi Persada Properti",
   "developerGroup": "Adhi Persada Properti (ADHI)",
   "lon": 106.924336,
   "lat": -6.311203,
   "kota": "Kota Bekasi",
   "kecamatan": "Pondokmelati",
   "desa": "Jatiwarna",
   "distanceKm": 2.25,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 440640000,
   "priceMax": 858173000,
   "subsidiPrice": [
    440640000,
    480000000
   ],
   "lt": null,
   "lb": [
    21.6,
    49.7
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 2,
    "komersial": 2,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 4.4 km · GT Jatiwarna 0.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 4.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 8.5
     },
     {
      "mode": "KRL",
      "name": "Pasar Minggu",
      "km": 9.3
     }
    ],
    "toll": {
     "name": "GT Jatiwarna",
     "km": 0.3
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-13",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1210022021R001",
   "extraSources": [],
   "sikumbangId": "BKS1210022021R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Apartemen; SiKumbang memuat tipe komersial dan tipe rusun bersubsidi (±32-36 m²).",
   "band": "0-5"
  },
  {
   "id": "pp-lanata-estate",
   "name": "Lanata Estate",
   "developer": "PT Kahar Anekasarana",
   "developerGroup": "Kahar Anekasarana",
   "lon": 106.92964,
   "lat": -6.341308,
   "kota": "Kota Bekasi",
   "kecamatan": "Jatisampurna",
   "desa": "Jatisampurna",
   "distanceKm": 2.32,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 700000000,
   "priceMax": 900000000,
   "subsidiPrice": null,
   "lt": [
    60,
    72
   ],
   "lb": [
    54,
    70
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 83,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 5.1 km · GT Jatiwarna 3.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 5.1
     },
     {
      "mode": "KRL",
      "name": "Universitas Pancasila",
      "km": 10.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 11.8
     }
    ],
    "toll": {
     "name": "GT Jatiwarna",
     "km": 3.4
    }
   },
   "priceAsOf": "2024-07",
   "registryUpdated": "2024-07-18",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1010012024T001",
   "extraSources": [],
   "sikumbangId": "BKS1010012024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "0-5"
  },
  {
   "id": "pp-sakura-garden-city",
   "name": "Sakura Garden City",
   "developer": "PT Trivo Bangun Indonesia & mitra Jepang",
   "developerGroup": "Sakura Garden City JV",
   "lon": 106.890329,
   "lat": -6.324128,
   "kota": "Jakarta Timur",
   "kecamatan": "Cipayung",
   "desa": null,
   "distanceKm": 2.58,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 600000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "sold-out-unknown",
   "unitsAvailable": null,
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 0.4 km · KRL Tanjung Barat 6.0 km · GT Pasar Rebo 1.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 0.4
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 6.0
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 8.8
     }
    ],
    "toll": {
     "name": "GT Pasar Rebo",
     "km": 1.7
    }
   },
   "priceAsOf": "2021-03",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://ekonomi.bisnis.com/read/20210327/47/1373346/trivo-developer-jepang-garap-sakura-garden-city-mulai-topping-off",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/159937196 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": "Superblok 12 menara (±5.000 unit). Harga perdana 2021 mulai ±Rp600 jt; harga primer terkini tidak ditemukan — verifikasi ke marketing gallery.",
   "band": "0-5"
  },
  {
   "id": "pp-reswara-park",
   "name": "Reswara Park",
   "developer": "PT Cahaya Candra Jaya",
   "developerGroup": "Cahaya Candra Jaya",
   "lon": 106.910028,
   "lat": -6.305025,
   "kota": "Jakarta Timur",
   "kecamatan": "Cipayung",
   "desa": "Bambu Apus",
   "distanceKm": 2.6,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1819000000,
   "priceMax": 3693000000,
   "subsidiPrice": null,
   "lt": [
    60,
    85
   ],
   "lb": [
    86,
    187
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 22,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Kampung Rambutan 2.9 km · GT Setu 0.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Kampung Rambutan",
      "km": 2.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 7.2
     },
     {
      "mode": "KRL",
      "name": "Pasar Minggu",
      "km": 7.6
     }
    ],
    "toll": {
     "name": "GT Setu",
     "km": 0.8
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-08",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG1010062026T001",
   "extraSources": [],
   "sikumbangId": "CKG1010062026T001",
   "coordSource": "OSM way/1476920011 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "11 ha, 109 unit (tipe Raksaka/Ragnala/Ranjana) di Bambu Apus; dekat GT Bambu Apus (JORR).",
   "band": "0-5"
  },
  {
   "id": "pp-lrt-city-ciracas-urban-signature",
   "name": "LRT City Ciracas – Urban Signature",
   "developer": "PT Adhi Commuter Properti Tbk (ADCP)",
   "developerGroup": "Adhi Commuter Properti (ADHI)",
   "lon": 106.885225,
   "lat": -6.32414,
   "kota": "Jakarta Timur",
   "kecamatan": "Ciracas",
   "desa": null,
   "distanceKm": 3.13,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 583100000,
   "priceMax": 1451800000,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 0.2 km · KRL Tanjung Barat 5.4 km · GT Pasar Rebo 1.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 0.2
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 5.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 8.7
     }
    ],
    "toll": {
     "name": "GT Pasar Rebo",
     "km": 1.6
    }
   },
   "priceAsOf": "2026 (situs pemasaran, tanpa tanggal)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.urbansignature.co/",
   "extraSources": [
    "https://www.detik.com/properti/berita/d-8688338/daftar-4-proyek-lrt-city-yang-mulai-dibangun-lagi-hari-ini",
    "https://ekonomi.bisnis.com/read/20260721/47/1989900/heboh-proyek-lrt-city-dituding-mangkrak-adhi-commuter-adcp-buka-suara"
   ],
   "sikumbangId": null,
   "coordSource": "OSM way/159950711 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": "RISIKO SERAH TERIMA: proyek LRT City sempat mangkrak (Jul 2026); pekerjaan Ciracas dilanjutkan sejak 1 Okt 2026, target rampung 2028. Lakukan due diligence sebelum KPR inden.",
   "notes": "TOD 28 lantai, 3.668 unit, menempel LRT Ciracas.",
   "band": "0-5"
  },
  {
   "id": "pp-green-park-residence-pondok-melati",
   "name": "Green Park Residence (Pondok Melati)",
   "developer": "PT Buana Global Propertindo",
   "developerGroup": "Buana Global Propertindo",
   "lon": 106.934444,
   "lat": -6.309006,
   "kota": "Kota Bekasi",
   "kecamatan": "Pondokmelati",
   "desa": "Jatimelati",
   "distanceKm": 3.16,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 2770000000,
   "priceMax": 4443700000,
   "subsidiPrice": null,
   "lt": [
    105,
    200
   ],
   "lb": [
    110,
    250
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 12,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 5.5 km · GT Jati Warna 0.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 5.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 9.0
     },
     {
      "mode": "KRL",
      "name": "Klender Baru",
      "km": 10.2
     }
    ],
    "toll": {
     "name": "GT Jati Warna",
     "km": 0.8
    }
   },
   "priceAsOf": "2025-11",
   "registryUpdated": "2025-11-20",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1210032025T001",
   "extraSources": [],
   "sikumbangId": "BKS1210032025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "0-5"
  },
  {
   "id": "pp-premier-estate-3-elana",
   "name": "Premier Estate 3 – Elana",
   "developer": "PT Qualitas Qunci Makmur",
   "developerGroup": "Premier Qualitas",
   "lon": 106.918369,
   "lat": -6.358059,
   "kota": "Kota Bekasi",
   "kecamatan": "Jatisampurna",
   "desa": "Jatiraden",
   "distanceKm": 3.37,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1330000000,
   "priceMax": 1480000000,
   "subsidiPrice": null,
   "lt": [
    68,
    95
   ],
   "lb": [
    54,
    54
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 4,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 3.1 km · GT Cibubur 2.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 3.1
     },
     {
      "mode": "KRL",
      "name": "Universitas Pancasila",
      "km": 9.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 13.0
     }
    ],
    "toll": {
     "name": "GT Cibubur",
     "km": 2.7
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-20",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1010052024T001",
   "extraSources": [],
   "sikumbangId": "BKS1010052024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "0-5"
  },
  {
   "id": "pp-permata-puri-cibubur",
   "name": "Permata Puri Cibubur",
   "developer": "PT PP Properti Tbk",
   "developerGroup": "PP Properti (BUMN)",
   "lon": 106.906047,
   "lat": -6.364,
   "kota": "Kota Depok",
   "kecamatan": "Cimanggis",
   "desa": "Harjamukti",
   "distanceKm": 4.06,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 1150000000,
   "priceMax": 1200000000,
   "subsidiPrice": null,
   "lt": [
    60,
    84
   ],
   "lb": [
    46.5,
    70
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 6,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 1.6 km · GT Cibubur 1.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 1.6
     },
     {
      "mode": "KRL",
      "name": "Pondok Cina",
      "km": 8.2
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 13.4
     }
    ],
    "toll": {
     "name": "GT Cibubur",
     "km": 1.2
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-04",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0210072026T001",
   "extraSources": [
    "https://pp-properti.com/pers/permata-puri-cibubur-tawarkan-hunian-dengan-konsep-tropical-house"
   ],
   "sikumbangId": "DPK0210072026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Desain arsitek Andra Matin; dekat Transpark/TSM Cibubur.",
   "band": "0-5"
  },
  {
   "id": "pp-grand-victoria-1-jatiasih",
   "name": "Grand Victoria 1 (Jatiasih)",
   "developer": "PT Karya Makmur",
   "developerGroup": "Karya Makmur",
   "lon": 106.945219,
   "lat": -6.346923,
   "kota": "Kota Bekasi",
   "kecamatan": "Jatiasih",
   "desa": "Jatisari",
   "distanceKm": 4.1,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 410000000,
   "priceMax": 3159000000,
   "subsidiPrice": null,
   "lt": [
    52,
    363
   ],
   "lb": [
    35,
    152
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 92,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 6.2 km · GT Nagrak 4.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.2
     },
     {
      "mode": "KRL",
      "name": "Universitas Pancasila",
      "km": 12.3
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 13.1
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 4.1
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-30",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0910062021T001",
   "extraSources": [],
   "sikumbangId": "BKS0910062021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "0-5"
  },
  {
   "id": "pp-wovendream-house-ciracas",
   "name": "Wovendream House (Ciracas)",
   "developer": "PT Easton Urban Dharma",
   "developerGroup": "Easton Urban",
   "lon": 106.873558,
   "lat": -6.331546,
   "kota": "Jakarta Timur",
   "kecamatan": "Ciracas",
   "desa": "Ciracas",
   "distanceKm": 4.41,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 2380000000,
   "priceMax": 2850000000,
   "subsidiPrice": null,
   "lt": [
    77,
    91
   ],
   "lb": [
    115,
    135
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 21,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 1.7 km · KRL Lenteng Agung 4.3 km · GT Gedong 2.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 1.7
     },
     {
      "mode": "KRL",
      "name": "Lenteng Agung",
      "km": 4.3
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 9.6
     }
    ],
    "toll": {
     "name": "GT Gedong",
     "km": 2.7
    }
   },
   "priceAsOf": "2026-02",
   "registryUpdated": "2026-02-11",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0910012025T001",
   "extraSources": [],
   "sikumbangId": "CKG0910012025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "0-5"
  },
  {
   "id": "pp-citragrand-cibubur-cbd-achillea-tahap-2",
   "name": "CitraGrand Cibubur CBD – Achillea (tahap 2)",
   "developer": "PT Ciputra Nugraha Internasional",
   "developerGroup": "Ciputra",
   "lon": 106.939853,
   "lat": -6.364781,
   "kota": "Kota Bekasi",
   "kecamatan": "Jatisampurna",
   "desa": "Jatirangga",
   "distanceKm": 5.02,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1433120000,
   "priceMax": 2409486000,
   "subsidiPrice": null,
   "lt": [
    60,
    105
   ],
   "lb": [
    80,
    127
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 3,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 5.0 km · GT Nagrak 2.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 5.0
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 11.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.6
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 2.2
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-13",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1010042026T001",
   "extraSources": [],
   "sikumbangId": "BKS1010042026T001",
   "coordSource": "OSM way/1475038549 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Klaster terbaru CitraGrand CBD (diluncurkan 2025).",
   "band": "5-10"
  },
  {
   "id": "pp-transpark-cibubur-apartemen",
   "name": "Transpark Cibubur (apartemen)",
   "developer": "PT Trans Cibubur Property (CT Corp)",
   "developerGroup": "Trans Property",
   "lon": 106.902911,
   "lat": -6.373691,
   "kota": "Kota Depok",
   "kecamatan": "Cimanggis",
   "desa": "Harjamukti",
   "distanceKm": 5.19,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 645480000,
   "priceMax": 2256150000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    24.4,
    85.5
   ],
   "status": "sold-out-unknown",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 0.8 km · GT Cibubur 1.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 0.8
     },
     {
      "mode": "KRL",
      "name": "Pondok Cina",
      "km": 7.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.4
     }
    ],
    "toll": {
     "name": "GT Cibubur",
     "km": 1.2
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-26",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0210072024R001",
   "extraSources": [],
   "sikumbangId": "DPK0210072024R001",
   "coordSource": "OSM way/1324673389 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-citragrand-cibubur-cbd-brunnera",
   "name": "CitraGrand Cibubur CBD – Brunnera",
   "developer": "PT Ciputra Nugraha Internasional",
   "developerGroup": "Ciputra",
   "lon": 106.941422,
   "lat": -6.365651,
   "kota": "Kota Bekasi",
   "kecamatan": "Jatisampurna",
   "desa": "Jatirangga",
   "distanceKm": 5.2,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1072701000,
   "priceMax": 4565208000,
   "subsidiPrice": null,
   "lt": [
    60,
    200
   ],
   "lb": [
    57,
    279
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 24,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 5.1 km · GT Nagrak 2.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 5.1
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 11.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.8
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 2.1
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-03",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1010042023T002",
   "extraSources": [],
   "sikumbangId": "BKS1010042023T002",
   "coordSource": "OSM way/1475038551 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-the-belton-residence",
   "name": "The Belton Residence",
   "developer": "PT Synthesis Karya Pratama",
   "developerGroup": "Synthesis Development",
   "lon": 106.865067,
   "lat": -6.321247,
   "kota": "Jakarta Timur",
   "kecamatan": "Ciracas",
   "desa": "Susukan",
   "distanceKm": 5.39,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 531000000,
   "priceMax": 1719000000,
   "subsidiPrice": [
    531000000,
    531000000
   ],
   "lt": null,
   "lb": [
    22.2,
    72.0
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 34,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Ciracas 2.4 km · KRL Tanjung Barat 3.2 km · GT Gedong 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 2.4
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 3.2
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 8.6
     }
    ],
    "toll": {
     "name": "GT Gedong",
     "km": 1.5
    }
   },
   "priceAsOf": "2026-01",
   "registryUpdated": "2026-01-27",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0910042026R001",
   "extraSources": [
    "https://www.myhomemagz.com/proyek-the-belton-residence-sudah-tutup-atap/"
   ],
   "sikumbangId": "CKG0910042026R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-raffles-hills-sisi-depok",
   "name": "Raffles Hills (sisi Depok)",
   "developer": "PT Gunungsubur Sentosa (Wings Group)",
   "developerGroup": "Raffles Hills",
   "lon": 106.903694,
   "lat": -6.377082,
   "kota": "Kota Depok",
   "kecamatan": "Cimanggis",
   "desa": "Harjamukti",
   "distanceKm": 5.54,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1028250000,
   "priceMax": 2410281000,
   "subsidiPrice": null,
   "lt": [
    84,
    128
   ],
   "lb": [
    45,
    144
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 61,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 1.0 km · GT Cibubur 1.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 1.0
     },
     {
      "mode": "KRL",
      "name": "Pondok Cina",
      "km": 8.0
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.8
     }
    ],
    "toll": {
     "name": "GT Cibubur",
     "km": 1.6
    }
   },
   "priceAsOf": "2024-08",
   "registryUpdated": "2024-08-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0210072021T001",
   "extraSources": [],
   "sikumbangId": "DPK0210072021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Registrasi sisi Jatisampurna (BKS1010022021T003) mencantumkan tipe s.d. ±Rp8,4 M (data 2021).",
   "band": "5-10"
  },
  {
   "id": "pp-synthesis-huis",
   "name": "Synthesis Huis",
   "developer": "PT Synthesis Karya Pratama",
   "developerGroup": "Synthesis Development",
   "lon": 106.862805,
   "lat": -6.320102,
   "kota": "Jakarta Timur",
   "kecamatan": "Pasar Rebo",
   "desa": "Cijantung",
   "distanceKm": 5.65,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 2100000000,
   "priceMax": 4300000000,
   "subsidiPrice": null,
   "lt": [
    22,
    126
   ],
   "lb": [
    85,
    179
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 130,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Kampung Rambutan 2.7 km · KRL Tanjung Barat 3.0 km · GT Gedong 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Kampung Rambutan",
      "km": 2.7
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 3.0
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 8.4
     }
    ],
    "toll": {
     "name": "GT Gedong",
     "km": 1.5
    }
   },
   "priceAsOf": "2024-03",
   "registryUpdated": "2024-03-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0510032024T001",
   "extraSources": [],
   "sikumbangId": "CKG0510032024T001",
   "coordSource": "OSM way/1243226444 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Situs pemasaran 2026: mulai ±Rp2 M (tipe Safford) s.d. ±Rp4,83 M (Livara).",
   "band": "5-10"
  },
  {
   "id": "pp-kota-wisata-ecovia-orlens",
   "name": "Kota Wisata Ecovia – Orlens",
   "developer": "PT Kurnia Sinergi Mas (Sinar Mas Land × Sumitomo Forestry)",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.960144,
   "lat": -6.349936,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Ciangsana",
   "distanceKm": 5.72,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 2087349000,
   "priceMax": 2936965286,
   "subsidiPrice": null,
   "lt": [
    60,
    174
   ],
   "lb": [
    62,
    89
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 35,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 7.6 km · GT Narogong 3.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 7.6
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 13.1
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.3
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 3.4
    }
   },
   "priceAsOf": "2026-03",
   "registryUpdated": "2026-03-31",
   "priceSource": "priceMin: start-from situs developer (diakses 2026-10-12); priceMax: SiKumbang",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220032026T001",
   "extraSources": [
    "https://www.sinarmasland.com/development/township/kota-wisata",
    "https://kfmap.asia/news/kota-wisata-ecovia-a-strategic-bet-by-japanese-and-indonesian-giants/4452"
   ],
   "sikumbangId": "CBI0220032026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Peluncuran Okt 2025: Rp1,8–3,1 M (tipe 89/72, 122/98, 165/128).",
   "band": "5-10"
  },
  {
   "id": "pp-rivara-at-altea-boulevard",
   "name": "Rivara at Altea Boulevard",
   "developer": "PT Ruby Karya Sejahtera (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.922836,
   "lat": -6.379619,
   "kota": "Kota Bekasi",
   "kecamatan": "Jatisampurna",
   "desa": "Jatisampurna",
   "distanceKm": 5.82,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 2318000000,
   "priceMax": 6182000000,
   "subsidiPrice": null,
   "lt": [
    72,
    231
   ],
   "lb": [
    88,
    192
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 3,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 3.1 km · GT Jatikarya 0.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 3.1
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 9.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 15.5
     }
    ],
    "toll": {
     "name": "GT Jatikarya",
     "km": 0.6
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-02",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1010012026T001",
   "extraSources": [],
   "sikumbangId": "BKS1010012026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-paradesa-cibubur",
   "name": "Paradesa Cibubur",
   "developer": "PT Umawar Supra Realty (Ruma.id)",
   "developerGroup": "Umawar/Ruma.id",
   "lon": 106.886687,
   "lat": -6.376632,
   "kota": "Kota Depok",
   "kecamatan": "Cimanggis",
   "desa": "Harjamukti",
   "distanceKm": 6.14,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 1454517500,
   "priceMax": 2695512500,
   "subsidiPrice": null,
   "lt": [
    81,
    168
   ],
   "lb": [
    77,
    129
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 9,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 1.0 km · GT Cibubur 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 1.0
     },
     {
      "mode": "KRL",
      "name": "Pondok Cina",
      "km": 6.1
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 14.0
     }
    ],
    "toll": {
     "name": "GT Cibubur",
     "km": 1.5
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0210072024T001",
   "extraSources": [],
   "sikumbangId": "DPK0210072024T001",
   "coordSource": "OSM way/1363690829 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-tropical-townhouse-pondok-gede",
   "name": "Tropical Townhouse (Pondok Gede)",
   "developer": "PT Arta Agung Harapan",
   "developerGroup": "Arta Agung Harapan",
   "lon": 106.929802,
   "lat": -6.274695,
   "kota": "Kota Bekasi",
   "kecamatan": "Pondokgede",
   "desa": "Jatimakmur",
   "distanceKm": 6.22,
   "segment": "menengah-atas",
   "type": "townhouse",
   "priceMin": 1297565606,
   "priceMax": 1799032710,
   "subsidiPrice": null,
   "lt": [
    55,
    69
   ],
   "lb": [
    65,
    85
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 12,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatibening Baru 1.9 km · Whoosh Halim 6.0 km · GT Pondok Gede Timur 2.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatibening Baru",
      "km": 1.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 6.0
     },
     {
      "mode": "KRL",
      "name": "Klender Baru",
      "km": 6.4
     }
    ],
    "toll": {
     "name": "GT Pondok Gede Timur",
     "km": 2.5
    }
   },
   "priceAsOf": "2024-10",
   "registryUpdated": "2024-10-19",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0810032024T002",
   "extraSources": [],
   "sikumbangId": "BKS0810032024T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-citra-homes-halim",
   "name": "Citra Homes Halim",
   "developer": "KSO Citra Serasi (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 106.878873,
   "lat": -6.278826,
   "kota": "Jakarta Timur",
   "kecamatan": "Makasar",
   "desa": "Makasar",
   "distanceKm": 6.68,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1500000000,
   "priceMax": 2800000000,
   "subsidiPrice": null,
   "lt": [
    60,
    120
   ],
   "lb": [
    75,
    150
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 143,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Taman Mini 1.6 km · KRL Pasar Minggu Baru 3.5 km · GT Ramp Taman Mini 0.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Taman Mini",
      "km": 1.6
     },
     {
      "mode": "KRL",
      "name": "Pasar Minggu Baru",
      "km": 3.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 3.7
     }
    ],
    "toll": {
     "name": "GT Ramp Taman Mini",
     "km": 0.9
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-20",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0810012026T001",
   "extraSources": [
    "https://www.analisproperti.com/2026/02/launching-soon-citra-homes-halim.html"
   ],
   "sikumbangId": "CKG0810012026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Pre-launch Feb 2026: 1 lantai 6×10 ±Rp1,2 M; 2 lantai Rp1,5–2,8 M (belum PPN). Serah terima target akhir 2026.",
   "band": "5-10"
  },
  {
   "id": "pp-kota-wisata-richmond",
   "name": "Kota Wisata – Richmond",
   "developer": "Sinar Mas Land",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.963731,
   "lat": -6.369678,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": null,
   "distanceKm": 7.24,
   "segment": "premium",
   "type": "landed",
   "priceMin": 8000000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 7.5 km · GT Narogong 1.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 7.5
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 12.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 16.3
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 1.3
    }
   },
   "priceAsOf": "2026-10 (start-from di situs developer)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.sinarmasland.com/development/township/kota-wisata",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/1309877617 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-citragran-cibubur-glenview-mega-cluster-the-sign",
   "name": "CitraGran Cibubur – Glenview (Mega Cluster The Signature)",
   "developer": "PT Ciputra Bahana Mulya",
   "developerGroup": "Ciputra",
   "lon": 106.925443,
   "lat": -6.393352,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Cikeas Udik",
   "distanceKm": 7.37,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1980000000,
   "priceMax": 5773000000,
   "subsidiPrice": null,
   "lt": [
    75,
    170
   ],
   "lb": [
    69,
    238
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 36,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 3.9 km · GT Jatikarya 1.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 3.9
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 8.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.0
     }
    ],
    "toll": {
     "name": "GT Jatikarya",
     "km": 1.4
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220082025T001",
   "extraSources": [
    "https://www.detik.com/properti/berita/d-8067559/citragran-cibubur-hadirkan-glenview-hunian-modern-klasik-strategis",
    "https://rumahsaya.bca.co.id/developer/ciputra/bekasi/citragran-signature-cibubur"
   ],
   "sikumbangId": "CBI0220082025T001",
   "coordSource": "OSM way/1475038584 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-kota-wisata-klaster-aktif-perum-kota-wisata",
   "name": "Kota Wisata – klaster aktif (Perum. Kota Wisata)",
   "developer": "PT Mekanusa Cipta (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.945985,
   "lat": -6.389244,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Ciangsana",
   "distanceKm": 7.69,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1936580350,
   "priceMax": 5530783604,
   "subsidiPrice": null,
   "lt": [
    46,
    126
   ],
   "lb": [
    97,
    274
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 14,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 5.8 km · GT Nagrak 0.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 5.8
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 9.6
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.4
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 0.6
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-22",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220032024T001",
   "extraSources": [],
   "sikumbangId": "CBI0220032024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Situs Sinar Mas juga mencantumkan Morrington mulai Rp2,582 M (lokasi klaster tidak terpetakan terpisah).",
   "band": "5-10"
  },
  {
   "id": "pp-kota-wisata-averon",
   "name": "Kota Wisata – Averon",
   "developer": "Sinar Mas Land",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.95571,
   "lat": -6.383189,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": null,
   "distanceKm": 7.71,
   "segment": "premium",
   "type": "landed",
   "priceMin": 3605996000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": [
    120,
    200
   ],
   "lb": [
    149,
    267
   ],
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 6.7 km · GT Nagrak 1.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.7
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 10.7
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.2
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 1.1
    }
   },
   "priceAsOf": "2026-10 (start-from di situs developer)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.sinarmasland.com/development/township/kota-wisata",
   "extraSources": [
    "https://kfmap.asia/news/sinar-mas-land-launches-averon-cluster-in-kota-wisata-cibubur/4107"
   ],
   "sikumbangId": null,
   "coordSource": "OSM way/1474472966 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Diluncurkan Jun 2025 mulai Rp3,2 M, 19 unit (tipe 149/187/267, opsi private pool).",
   "band": "5-10"
  },
  {
   "id": "pp-legenda-wisata-termasuk-elvara",
   "name": "Legenda Wisata (termasuk Elvara)",
   "developer": "PT Misaya Properindo (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.948121,
   "lat": -6.390026,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Nagrak",
   "distanceKm": 7.88,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 965051436,
   "priceMax": 3398688879,
   "subsidiPrice": null,
   "lt": [
    60,
    232
   ],
   "lb": [
    57,
    195
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 55,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 6.1 km · GT Nagrak 0.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.1
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 9.7
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.5
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 0.7
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-03",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220092022T001",
   "extraSources": [
    "https://www.sinarmasland.com/development/township/kota-wisata"
   ],
   "sikumbangId": "CBI0220092022T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Situs Sinar Mas: Elvara (Legenda Wisata) mulai Rp1,568 M.",
   "band": "5-10"
  },
  {
   "id": "pp-lrt-city-jatibening-gateway-park",
   "name": "LRT City Jatibening – Gateway Park",
   "developer": "PT Adhi Commuter Properti Tbk (ADCP)",
   "developerGroup": "Adhi Commuter Properti (ADHI)",
   "lon": 106.928139,
   "lat": -6.256735,
   "kota": "Kota Bekasi",
   "kecamatan": "Pondokgede",
   "desa": "Jatibening Baru",
   "distanceKm": 8.11,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 496800000,
   "priceMax": 1274120000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    24.5,
    53.7
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 3,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatibening Baru 0.1 km · KRL Klender Baru 4.5 km · GT Pondok Kelapa 1.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatibening Baru",
      "km": 0.1
     },
     {
      "mode": "KRL",
      "name": "Klender Baru",
      "km": 4.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 5.0
     }
    ],
    "toll": {
     "name": "GT Pondok Kelapa",
     "km": 1.1
    }
   },
   "priceAsOf": "2022-04",
   "registryUpdated": "2022-04-05",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0810062021R001",
   "extraSources": [
    "https://ekonomi.bisnis.com/read/20260721/47/1989900/heboh-proyek-lrt-city-dituding-mangkrak-adhi-commuter-adcp-buka-suara"
   ],
   "sikumbangId": "BKS0810062021R001",
   "coordSource": "OSM way/724630021 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": "Dua tower sudah serah terima; namun grup LRT City sedang restrukturisasi (2026). Cek status unit & PPJB.",
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-asana-residence-cibubur-tahap-2",
   "name": "Asana Residence Cibubur Tahap 2",
   "developer": "PT Primajaya Prasarana",
   "developerGroup": "Primajaya Prasarana",
   "lon": 106.92015,
   "lat": -6.402942,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Cikeas Udik",
   "distanceKm": 8.35,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 887837000,
   "priceMax": 2053736000,
   "subsidiPrice": null,
   "lt": [
    72,
    120
   ],
   "lb": [
    38,
    86
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 37,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 4.2 km · GT Jatikarya Utama 2.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 4.2
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 7.2
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.9
     }
    ],
    "toll": {
     "name": "GT Jatikarya Utama",
     "km": 2.3
    }
   },
   "priceAsOf": "2024-07",
   "registryUpdated": "2024-07-23",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220082023T001",
   "extraSources": [],
   "sikumbangId": "CBI0220082023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-vida-bekasi-cluster-kencana",
   "name": "Vida Bekasi – Cluster Kencana",
   "developer": "PT Bina Nusantara Raya (Vida)",
   "developerGroup": "Vida (Gajah Tunggal)",
   "lon": 106.989412,
   "lat": -6.321695,
   "kota": "Kota Bekasi",
   "kecamatan": "Mustikajaya",
   "desa": "Padurenan",
   "distanceKm": 8.44,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 701095000,
   "priceMax": 2817162000,
   "subsidiPrice": null,
   "lt": [
    60,
    154
   ],
   "lb": [
    58,
    135
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 25,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatimulya 7.3 km · GT Jati Asih 4.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 7.3
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 8.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.4
     }
    ],
    "toll": {
     "name": "GT Jati Asih",
     "km": 4.7
    }
   },
   "priceAsOf": "2024-07",
   "registryUpdated": "2024-07-04",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1110012024T001",
   "extraSources": [],
   "sikumbangId": "BKS1110012024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-southgate-residence-tb-simatupang",
   "name": "Southgate Residence (TB Simatupang)",
   "developer": "PT Duta Semesta Mas (Sinar Mas Land × AEON)",
   "developerGroup": "Sinar Mas Land",
   "lon": 106.839167,
   "lat": -6.308333,
   "kota": "Jakarta Selatan",
   "kecamatan": "Jagakarsa",
   "desa": "Tanjung Barat",
   "distanceKm": 8.48,
   "segment": "menengah-atas",
   "type": "apartment",
   "priceMin": 1137164000,
   "priceMax": 4508000000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    24,
    140
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 299,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Tanjung Barat 0.0 km · LRT Taman Mini 4.9 km · GT Lenteng Agung 0.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 0.0
     },
     {
      "mode": "LRT",
      "name": "Taman Mini",
      "km": 4.9
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 5.5
     }
    ],
    "toll": {
     "name": "GT Lenteng Agung",
     "km": 0.8
    }
   },
   "priceAsOf": "2023-11",
   "registryUpdated": "2023-11-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/KYB0910052021R001",
   "extraSources": [],
   "sikumbangId": "KYB0910052021R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-perumnas-mahata-tanjung-barat-tod-krl",
   "name": "Perumnas Mahata Tanjung Barat (TOD KRL)",
   "developer": "Perum Pembangunan Perumahan Nasional (Perumnas)",
   "developerGroup": "Perumnas (BUMN)",
   "lon": 106.838536,
   "lat": -6.30913,
   "kota": "Jakarta Selatan",
   "kecamatan": "Jagakarsa",
   "desa": "Lenteng Agung",
   "distanceKm": 8.53,
   "segment": "subsidi",
   "type": "apartment",
   "priceMin": 185020000,
   "priceMax": 850000000,
   "subsidiPrice": [
    185020000,
    312104000
   ],
   "lt": null,
   "lb": [
    21,
    47
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 204,
    "komersial": 48,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Tanjung Barat 0.1 km · LRT Taman Mini 5.0 km · GT Lenteng Agung 0.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 0.1
     },
     {
      "mode": "LRT",
      "name": "Taman Mini",
      "km": 5.0
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 5.4
     }
    ],
    "toll": {
     "name": "GT Lenteng Agung",
     "km": 0.9
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-29",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/KYB0910042020R001",
   "extraSources": [],
   "sikumbangId": "KYB0910042020R001",
   "coordSource": "OSM way/387293961 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "TOD Stasiun Tanjung Barat; ada unit rusun subsidi FLPP dan unit komersial.",
   "band": "5-10"
  },
  {
   "id": "pp-summarecon-srimaya-residence",
   "name": "Summarecon – Srimaya Residence",
   "developer": "PT Summarecon Agung Tbk",
   "developerGroup": "Summarecon",
   "lon": 106.985439,
   "lat": -6.35773,
   "kota": "Kota Bekasi",
   "kecamatan": "Bantargebang",
   "desa": "Ciketingudik",
   "distanceKm": 8.62,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 375513000,
   "priceMax": 504900000,
   "subsidiPrice": null,
   "lt": [
    50,
    70
   ],
   "lb": [
    30,
    52
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 115,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 10.1 km · GT Narogong 2.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 10.1
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 12.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 16.7
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 2.7
    }
   },
   "priceAsOf": "2024-03",
   "registryUpdated": "2024-03-20",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0710072021T001",
   "extraSources": [],
   "sikumbangId": "BKS0710072021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-beranda-mas-bantargebang",
   "name": "Beranda Mas (Bantargebang)",
   "developer": "PT Permata Graha Nusantara",
   "developerGroup": "Permata Graha Nusantara",
   "lon": 106.990686,
   "lat": -6.316789,
   "kota": "Kota Bekasi",
   "kecamatan": "Bantargebang",
   "desa": "Bantargebang",
   "distanceKm": 8.65,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 881712960,
   "priceMax": 1397730000,
   "subsidiPrice": null,
   "lt": [
    60,
    105
   ],
   "lb": [
    66,
    109
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 26,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatimulya 6.8 km · GT Jati Asih 4.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 6.8
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 8.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 14.2
     }
    ],
    "toll": {
     "name": "GT Jati Asih",
     "km": 4.5
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-04",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0710032022T001",
   "extraSources": [],
   "sikumbangId": "BKS0710032022T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-kemang-pratama-2",
   "name": "Kemang Pratama 2",
   "developer": "PT Inticemerlang Agung",
   "developerGroup": "Kemang Pratama",
   "lon": 106.981239,
   "lat": -6.282674,
   "kota": "Kota Bekasi",
   "kecamatan": "Rawalumbu",
   "desa": "Bojong Rawalumbu",
   "distanceKm": 9.06,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 995850000,
   "priceMax": 2384400000,
   "subsidiPrice": null,
   "lt": [
    76,
    180
   ],
   "lb": [
    47,
    140
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 117,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Bekasi Barat 3.5 km · KRL Bekasi Timur 5.7 km · GT Jati Asih 3.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 3.5
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 5.7
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 11.5
     }
    ],
    "toll": {
     "name": "GT Jati Asih",
     "km": 3.2
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0510012022T001",
   "extraSources": [],
   "sikumbangId": "BKS0510012022T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-cimanggis-golf-estate-uenos",
   "name": "Cimanggis Golf Estate – UENOS",
   "developer": "PT Mitra Bangun Prasada (Artha Graha Network)",
   "developerGroup": "Cimanggis Golf Estate",
   "lon": 106.887656,
   "lat": -6.4064,
   "kota": "Kota Depok",
   "kecamatan": "Tapos",
   "desa": "Cilangkap",
   "distanceKm": 9.15,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1220000000,
   "priceMax": 1810000000,
   "subsidiPrice": null,
   "lt": [
    59.2,
    179.6
   ],
   "lb": [
    56,
    64
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 66,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 3.7 km · GT Cimanggis 1.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 3.7
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 7.0
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 16.5
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 1.8
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK1010062024T001",
   "extraSources": [],
   "sikumbangId": "DPK1010062024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-bukit-golf-cibubur-riverside",
   "name": "Bukit Golf Cibubur Riverside",
   "developer": "PT Karya Cantika Kusuma",
   "developerGroup": "Bukit Golf Cibubur",
   "lon": 106.902778,
   "lat": -6.410203,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Bojong Nangka",
   "distanceKm": 9.19,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1000000000,
   "priceMax": 4000000000,
   "subsidiPrice": null,
   "lt": [
    65,
    175
   ],
   "lb": [
    37,
    156
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 71,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 4.1 km · GT Cimanggis 1.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 4.1
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 6.2
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 17.9
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 1.6
    }
   },
   "priceAsOf": "2025-05",
   "registryUpdated": "2025-05-20",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220052021T004",
   "extraSources": [],
   "sikumbangId": "CBI0220052021T004",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": "Titik SiKumbang jatuh di Tapos, Depok menurut batas OSM (dekat perbatasan) — wilayah administratif mengikuti data developer.",
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-cimanggis-golf-estate-omnia",
   "name": "Cimanggis Golf Estate – OMNIA",
   "developer": "PT Mitra Bangun Prasada (Artha Graha Network)",
   "developerGroup": "Cimanggis Golf Estate",
   "lon": 106.888111,
   "lat": -6.407111,
   "kota": "Kota Depok",
   "kecamatan": "Tapos",
   "desa": "Tapos",
   "distanceKm": 9.21,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 2437450000,
   "priceMax": 3828950000,
   "subsidiPrice": null,
   "lt": [
    120,
    232.5
   ],
   "lb": [
    105,
    155
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 24,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 3.8 km · GT Cimanggis 1.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 3.8
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 6.9
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 16.6
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 1.7
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-25",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK1010012026T001",
   "extraSources": [
    "https://cimanggisgolfestate.id/"
   ],
   "sikumbangId": "DPK1010012026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Klaster baru Omnara diperkenalkan 26 Sep 2026 (mulai ±Rp2 M, tipe 6 & 10). Promo ready stock s.d. 31 Agu 2026 sudah berakhir.",
   "band": "5-10"
  },
  {
   "id": "pp-batik-signature-cibubur",
   "name": "Batik Signature Cibubur",
   "developer": "PT Tetra Artha Perkasa",
   "developerGroup": "Tetra Artha Perkasa",
   "lon": 106.945797,
   "lat": -6.405209,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Wanaherang",
   "distanceKm": 9.29,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 887000000,
   "priceMax": 1750945083,
   "subsidiPrice": null,
   "lt": [
    60,
    95
   ],
   "lb": [
    41,
    90
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 63,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 6.5 km · GT Nagrak 2.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.5
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 8.1
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.0
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 2.4
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-30",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220012023T001",
   "extraSources": [],
   "sikumbangId": "CBI0220012023T001",
   "coordSource": "OSM way/1269080944 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-anantha-homes-bantargebang",
   "name": "Anantha Homes (Bantargebang)",
   "developer": "PT Ardana Nusantara Propertindo",
   "developerGroup": "Ardana Nusantara",
   "lon": 106.990051,
   "lat": -6.363798,
   "kota": "Kota Bekasi",
   "kecamatan": "Bantargebang",
   "desa": "Ciketingudik",
   "distanceKm": 9.36,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 525000000,
   "priceMax": 525000000,
   "subsidiPrice": null,
   "lt": [
    60,
    60
   ],
   "lb": [
    36,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 105,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 10.5 km · GT Narogong 2.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 10.5
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 13.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.6
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 2.6
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0710072026T001",
   "extraSources": [],
   "sikumbangId": "BKS0710072026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": "Titik SiKumbang jatuh di Cileungsi, Kab Bogor menurut batas OSM (dekat perbatasan) — wilayah administratif mengikuti data developer.",
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-puri-safana-gunung-putri",
   "name": "Puri Safana (Gunung Putri)",
   "developer": "Bintang Safana Gajah",
   "developerGroup": "Bintang Safana",
   "lon": 106.929497,
   "lat": -6.410976,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Bojong Nangka",
   "distanceKm": 9.38,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 369000000,
   "priceMax": 829000000,
   "subsidiPrice": null,
   "lt": [
    60,
    120
   ],
   "lb": [
    36,
    73
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 126,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 5.6 km · GT Jatikarya 3.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 5.6
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 6.7
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.0
     }
    ],
    "toll": {
     "name": "GT Jatikarya",
     "km": 3.4
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220052026T001",
   "extraSources": [],
   "sikumbangId": "CBI0220052026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-lodji-residentie-rawalumbu",
   "name": "Lodji Residentie (Rawalumbu)",
   "developer": "PT Loji Cipta Sentosa",
   "developerGroup": "Loji Cipta Sentosa",
   "lon": 106.995,
   "lat": -6.295134,
   "kota": "Kota Bekasi",
   "kecamatan": "Rawalumbu",
   "desa": "Bojong Rawalumbu",
   "distanceKm": 9.75,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 950000000,
   "priceMax": 2500000000,
   "subsidiPrice": null,
   "lt": [
    48,
    60
   ],
   "lb": [
    34,
    96
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 128,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatimulya 4.5 km · KRL Bekasi Timur 6.0 km · GT Bekasi Timur 4.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 4.5
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 6.0
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 13.4
     }
    ],
    "toll": {
     "name": "GT Bekasi Timur",
     "km": 4.2
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-20",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0510012024T001",
   "extraSources": [],
   "sikumbangId": "BKS0510012024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-bothanica-cibubur",
   "name": "Bothanica Cibubur",
   "developer": "PT Perdana Gapuraprima Tbk",
   "developerGroup": "Perdana Gapuraprima",
   "lon": 106.979294,
   "lat": -6.388207,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Pasirangin",
   "distanceKm": 9.89,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 900000000,
   "priceMax": 900000000,
   "subsidiPrice": null,
   "lt": [
    90,
    90
   ],
   "lb": [
    33,
    33
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 4,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 9.4 km · GT Narogong 1.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 9.4
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 11.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.0
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 1.4
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-07",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720012026T001",
   "extraSources": [],
   "sikumbangId": "CBI0720012026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-grand-kota-bintang-cluster-roma",
   "name": "Grand Kota Bintang – Cluster Roma",
   "developer": "PT Kota Bintang Rayatri (Agra Nusa Group)",
   "developerGroup": "Grand Kota Bintang",
   "lon": 106.956767,
   "lat": -6.249481,
   "kota": "Kota Bekasi",
   "kecamatan": "Bekasi Barat",
   "desa": "Jakasampurna",
   "distanceKm": 9.98,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 2000000000,
   "priceMax": 5199000000,
   "subsidiPrice": null,
   "lt": [
    60,
    105
   ],
   "lb": null,
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Cikunir 2 0.9 km · KRL Cakung 3.4 km · GT Kalimalang 0.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Cikunir 2",
      "km": 0.9
     },
     {
      "mode": "KRL",
      "name": "Cakung",
      "km": 3.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 8.0
     }
    ],
    "toll": {
     "name": "GT Kalimalang",
     "km": 0.4
    }
   },
   "priceAsOf": "2025-08 (early bird) / SiKumbang 2026-02 (maks.)",
   "registryUpdated": "2026-02-09",
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.sintesanews.com/bicara-grand-kota-bintang-bekasi-dan-klaster-terintegrasi/",
   "extraSources": [
    "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0210052026T001"
   ],
   "sikumbangId": "BKS0210052026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Diluncurkan Agu 2025; 316 unit tipe 6×10, 6×15, 7×15; early-bird ±Rp2 M hanya 30 unit pertama. SiKumbang Feb 2026 mencatat tipe Rp4,2–5,2 M.",
   "band": "5-10"
  },
  {
   "id": "pp-citaville-cibubur",
   "name": "CitaVille Cibubur",
   "developer": "KSO CitaVille Cibubur",
   "developerGroup": "CitaVille",
   "lon": 106.979568,
   "lat": -6.389275,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Pasirangin",
   "distanceKm": 9.99,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 850000000,
   "priceMax": 1300000000,
   "subsidiPrice": null,
   "lt": [
    60,
    80
   ],
   "lb": [
    71,
    90
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 41,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Harjamukti 9.4 km · GT Narogong 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 9.4
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 11.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.1
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 1.5
    }
   },
   "priceAsOf": "2026-03",
   "registryUpdated": "2026-03-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720012025T001",
   "extraSources": [],
   "sikumbangId": "CBI0720012025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "5-10"
  },
  {
   "id": "pp-samesta-mahata-margonda",
   "name": "Samesta Mahata Margonda",
   "developer": "Perum Pembangunan Perumahan Nasional (Perumnas)",
   "developerGroup": "Perumnas (BUMN)",
   "lon": 106.832858,
   "lat": -6.371958,
   "kota": "Kota Depok",
   "kecamatan": "Beji",
   "desa": "Kemiri Muka",
   "distanceKm": 10.13,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 650000000,
   "priceMax": 990000000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    23.1,
    50.8
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 14,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Pondok Cina 0.3 km · GT Margonda 1.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Pondok Cina",
      "km": 0.3
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.9
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 9.9
     }
    ],
    "toll": {
     "name": "GT Margonda",
     "km": 1.1
    }
   },
   "priceAsOf": "2023-12",
   "registryUpdated": "2023-12-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0610042023R001",
   "extraSources": [],
   "sikumbangId": "DPK0610042023R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-kemang-pratama-5",
   "name": "Kemang Pratama 5",
   "developer": "PT Kemang Pratama",
   "developerGroup": "Kemang Pratama",
   "lon": 106.986877,
   "lat": -6.269737,
   "kota": "Kota Bekasi",
   "kecamatan": "Rawalumbu",
   "desa": "Sepanjangjaya",
   "distanceKm": 10.41,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 874570000,
   "priceMax": 2697000000,
   "subsidiPrice": null,
   "lt": [
    67,
    90
   ],
   "lb": [
    47,
    96
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 10,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Bekasi Barat 1.9 km · KRL Bekasi Timur 4.3 km · GT Bekasi Barat 1.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 1.9
     },
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 4.3
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 11.6
     }
    ],
    "toll": {
     "name": "GT Bekasi Barat",
     "km": 1.9
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0510032024T001",
   "extraSources": [],
   "sikumbangId": "BKS0510032024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-amazing-cikeas",
   "name": "Amazing Cikeas",
   "developer": "PT Suryagajah Maspertiwi",
   "developerGroup": "Suryagajah",
   "lon": 106.921538,
   "lat": -6.421852,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Bojong Nangka",
   "distanceKm": 10.46,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 388000000,
   "priceMax": 588000000,
   "subsidiPrice": null,
   "lt": [
    60,
    120
   ],
   "lb": [
    36,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 166,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 5.2 km · GT Cimanggis 3.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 5.2
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.1
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 20.0
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 3.1
    }
   },
   "priceAsOf": "2026-10",
   "registryUpdated": "2026-10-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220052026T003",
   "extraSources": [],
   "sikumbangId": "CBI0220052026T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-metland-cileungsi-sektor-vi-the-colony-adenia",
   "name": "Metland Cileungsi (Sektor VI – The Colony/Adenia)",
   "developer": "PT Metropolitan Land Tbk",
   "developerGroup": "Metland",
   "lon": 106.98735,
   "lat": -6.38905,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Cipenjo",
   "distanceKm": 10.62,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 695000000,
   "priceMax": 772727273,
   "subsidiPrice": null,
   "lt": [
    60,
    198
   ],
   "lb": [
    25,
    48
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 47,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 10.3 km · GT Narogong 2.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 10.3
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 12.4
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.6
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 2.1
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-01",
   "priceSource": "priceMin: start-from situs developer (diakses 2026-10-12); priceMax: SiKumbang",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720102022T001",
   "extraSources": [
    "https://metlandcileungsi.co.id/properti.php"
   ],
   "sikumbangId": "CBI0720102022T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Situs developer: The Colony mulai Rp695 jt, Adenia mulai Rp730 jt.",
   "band": "10-15"
  },
  {
   "id": "pp-podomoro-river-view",
   "name": "Podomoro River View",
   "developer": "PT Graha Tunas Selaras (Agung Podomoro Land)",
   "developerGroup": "Agung Podomoro",
   "lon": 106.89278,
   "lat": -6.42213,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Bojong Nangka",
   "distanceKm": 10.69,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1278000000,
   "priceMax": 3459279000,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 208,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 5.1 km · LRT Harjamukti 5.4 km · GT Cimanggis 0.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 5.1
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 5.4
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 18.2
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 0.2
    }
   },
   "priceAsOf": "2026 (situs developer, tanpa tanggal)",
   "registryUpdated": "2026-07-14",
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.podomoro-river-view.com/",
   "extraSources": [
    "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220052021T002"
   ],
   "sikumbangId": "CBI0220052021T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": "Titik SiKumbang jatuh di Tapos, Depok menurut batas OSM (dekat perbatasan) — wilayah administratif mengikuti data developer.",
   "confidence": "medium",
   "riskNote": null,
   "notes": "SiKumbang (2026-07) mencatat 208 unit komersial tersedia.",
   "band": "10-15"
  },
  {
   "id": "pp-grand-kamala-lagoon",
   "name": "Grand Kamala Lagoon",
   "developer": "PT PP Properti Tbk",
   "developerGroup": "PP Properti (BUMN)",
   "lon": 106.978923,
   "lat": -6.253563,
   "kota": "Kota Bekasi",
   "kecamatan": "Bekasi Selatan",
   "desa": "Pekayonjaya",
   "distanceKm": 11.02,
   "segment": "subsidi",
   "type": "apartment",
   "priceMin": 160000000,
   "priceMax": 340819418,
   "subsidiPrice": [
    178500000,
    340819418
   ],
   "lt": null,
   "lb": [
    21.2,
    31.9
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 64,
    "komersial": 5,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Bekasi Barat 1.3 km · KRL Kranji 3.2 km · GT Bekasi Barat 1.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 1.3
     },
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 3.2
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 10.5
     }
    ],
    "toll": {
     "name": "GT Bekasi Barat",
     "km": 1.0
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-22",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0410012021R001",
   "extraSources": [],
   "sikumbangId": "BKS0410012021R001",
   "coordSource": "OSM way/487677807 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Superblok PP Properti; banyak unit rusun subsidi (FLPP) masih tersedia.",
   "band": "10-15"
  },
  {
   "id": "pp-apartemen-podomoro-golf-view",
   "name": "Apartemen Podomoro Golf View",
   "developer": "PT Graha Tunas Selaras (Agung Podomoro Land)",
   "developerGroup": "Agung Podomoro",
   "lon": 106.89434,
   "lat": -6.42597,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Bojong Nangka",
   "distanceKm": 11.07,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 213027000,
   "priceMax": 867162281,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    21,
    52
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 711,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 4.7 km · LRT Harjamukti 5.8 km · GT Cimanggis 0.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 4.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 5.8
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 18.6
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 0.6
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220052021R001",
   "extraSources": [],
   "sikumbangId": "CBI0220052021R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": "Titik SiKumbang jatuh di Tapos, Depok menurut batas OSM (dekat perbatasan) — wilayah administratif mengikuti data developer.",
   "confidence": "medium",
   "riskNote": null,
   "notes": "Apartemen menempel exit Tol Cimanggis–Cibitung / Jagorawi.",
   "band": "10-15"
  },
  {
   "id": "pp-metland-transyogi-walden",
   "name": "Metland Transyogi – Walden",
   "developer": "PT Metropolitan Land Tbk",
   "developerGroup": "Metland",
   "lon": 106.980458,
   "lat": -6.402402,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": null,
   "distanceKm": 11.1,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1700000000,
   "priceMax": 3400000000,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 9.9 km · GT Narogong 2.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 9.9
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 10.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 20.4
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 2.9
    }
   },
   "priceAsOf": "2026 (situs developer; harga termasuk PPN per FAQ)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://metlandtransyogi.co.id/komparasi.php?cluster_id=7",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/1488611292 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Klaster American Classic diluncurkan Feb 2025 (tahap I 51 unit, 2-3 lantai). Promo PPN gratis hanya Phase 1.",
   "band": "10-15"
  },
  {
   "id": "pp-metland-transyogi-auckland",
   "name": "Metland Transyogi – Auckland",
   "developer": "PT Metropolitan Land Tbk",
   "developerGroup": "Metland",
   "lon": 106.979117,
   "lat": -6.405274,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": null,
   "distanceKm": 11.24,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1100000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 9.9 km · GT Narogong 3.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 9.9
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 10.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 20.6
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 3.1
    }
   },
   "priceAsOf": "2026 (start-from di situs developer)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.metlandtransyogi.co/",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/1488611289 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-gunung-putri-square-apartemen",
   "name": "Gunung Putri Square (apartemen)",
   "developer": "PT PP Properti Tbk",
   "developerGroup": "PP Properti (BUMN)",
   "lon": 106.929689,
   "lat": -6.427919,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Putri",
   "desa": "Cicadas",
   "distanceKm": 11.24,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 385495183,
   "priceMax": 449744380,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    21.2,
    24.7
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 28,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 5.0 km · GT Cimanggis 4.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 5.0
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 7.1
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 20.9
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 4.1
    }
   },
   "priceAsOf": "2024-05",
   "registryUpdated": "2024-05-22",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0220072024R001",
   "extraSources": [],
   "sikumbangId": "CBI0220072024R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-podomoro-golf-view-cluster-khaya-rumah-tapak",
   "name": "Podomoro Golf View – Cluster Khaya (rumah tapak)",
   "developer": "PT Graha Tunas Selaras (Agung Podomoro Land)",
   "developerGroup": "Agung Podomoro",
   "lon": 106.890869,
   "lat": -6.432743,
   "kota": "Kota Depok",
   "kecamatan": "Tapos",
   "desa": null,
   "distanceKm": 11.89,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 961000000,
   "priceMax": 2870000000,
   "subsidiPrice": null,
   "lt": [
    60,
    119
   ],
   "lb": [
    31,
    145
   ],
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 4.1 km · GT Cimanggis 1.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 4.1
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 6.6
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 19.0
     }
    ],
    "toll": {
     "name": "GT Cimanggis",
     "km": 1.3
    }
   },
   "priceAsOf": "2025-12 (situs developer; serah terima tahap 2 Des 2025)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.podomoro-golf-view.com/",
   "extraSources": [
    "https://www.agungpodomoroland.com/id/publications/read/890/podomoro-golf-view-sukses-percepat-serah-terima-cluster-khaya-tahap-kedua"
   ],
   "sikumbangId": null,
   "coordSource": "OSM relation/9733731 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "303 unit; tipe Ivory/Amethyst/Emerald/Sapphire.",
   "band": "10-15"
  },
  {
   "id": "pp-awani-square-ii-setu",
   "name": "Awani Square II (Setu)",
   "developer": "PT Sungai Madu Mas",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.011368,
   "lat": -6.372419,
   "kota": "Kab. Bekasi",
   "kecamatan": "Setu",
   "desa": "Cikarageman",
   "distanceKm": 11.9,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 165000000,
   "priceMax": 295000000,
   "subsidiPrice": [
    165000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 195,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatimulya 12.1 km · GT Burangkeng 3.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 12.1
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 13.6
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.9
     }
    ],
    "toll": {
     "name": "GT Burangkeng",
     "km": 3.0
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-08",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1820092022T002",
   "extraSources": [],
   "sikumbangId": "CKR1820092022T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "10-15"
  },
  {
   "id": "pp-bukit-podomoro-jakarta",
   "name": "Bukit Podomoro Jakarta",
   "developer": "PT Graha Cipta Kharisma (Agung Podomoro Land)",
   "developerGroup": "Agung Podomoro",
   "lon": 106.915601,
   "lat": -6.216171,
   "kota": "Jakarta Timur",
   "kecamatan": "Duren Sawit",
   "desa": "Klender",
   "distanceKm": 12.46,
   "segment": "premium",
   "type": "landed",
   "priceMin": 3439149599,
   "priceMax": 4995329284,
   "subsidiPrice": null,
   "lt": [
    50,
    180
   ],
   "lb": [
    50,
    196
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 30,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Buaran 0.8 km · LRT Jakarta Velodrome 3.8 km · GT Jatiwaringin 3.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Buaran",
      "km": 0.8
     },
     {
      "mode": "LRT Jakarta",
      "name": "Velodrome",
      "km": 3.8
     },
     {
      "mode": "LRT",
      "name": "Halim",
      "km": 4.5
     }
    ],
    "toll": {
     "name": "GT Jatiwaringin",
     "km": 3.6
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-18",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0710032024T001",
   "extraSources": [],
   "sikumbangId": "CKG0710032024T001",
   "coordSource": "OSM way/155951066 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "9,6 ha di Klender; promo PPN DTP di situs pemasaran berlaku s.d. 30 Jun 2026 (sudah berakhir).",
   "band": "10-15"
  },
  {
   "id": "pp-ruma-cilandak",
   "name": "Ruma Cilandak",
   "developer": "PT Umawar Baraka Realty (Ruma.id)",
   "developerGroup": "Umawar/Ruma.id",
   "lon": 106.80262,
   "lat": -6.291415,
   "kota": "Jakarta Selatan",
   "kecamatan": "Cilandak",
   "desa": "Cilandak Barat",
   "distanceKm": 12.9,
   "segment": "premium",
   "type": "townhouse",
   "priceMin": 3456000000,
   "priceMax": 7190000000,
   "subsidiPrice": null,
   "lt": [
    72,
    160
   ],
   "lb": [
    152,
    260
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 12,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "MRT Fatmawati Indomaret 1.1 km · KRL Tanjung Barat 4.4 km · GT Cilandak Utama 1.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 1.1
     },
     {
      "mode": "KRL",
      "name": "Tanjung Barat",
      "km": 4.4
     },
     {
      "mode": "LRT",
      "name": "Pancoran",
      "km": 6.8
     }
    ],
    "toll": {
     "name": "GT Cilandak Utama",
     "km": 1.0
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-22",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/KYB0610012025T001",
   "extraSources": [],
   "sikumbangId": "KYB0610012025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-gardenia-2-cileungsi",
   "name": "Gardenia 2 Cileungsi",
   "developer": "PT Cileungsi Graha Raya",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.96003,
   "lat": -6.43453,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Dayeuh",
   "distanceKm": 12.9,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 130000000,
   "priceMax": 222000000,
   "subsidiPrice": [
    130000000,
    180500000
   ],
   "lt": [
    60,
    123
   ],
   "lb": [
    22,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 28,
    "komersial": 7,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 6.9 km · GT Nagrak 5.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 6.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 9.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 22.6
     }
    ],
    "toll": {
     "name": "GT Nagrak",
     "km": 5.9
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720042022T001",
   "extraSources": [],
   "sikumbangId": "CBI0720042022T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "10-15"
  },
  {
   "id": "pp-citraland-cibubur-modbury",
   "name": "CitraLand Cibubur – Modbury",
   "developer": "PT Panasia Griya Mekaras (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 107.010517,
   "lat": -6.403089,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Gandoang",
   "distanceKm": 13.6,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 647252088,
   "priceMax": 2107036790,
   "subsidiPrice": null,
   "lt": [
    60,
    193
   ],
   "lb": [
    42,
    105
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 114,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "LRT Harjamukti 13.1 km · GT Narogong 5.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 13.1
     },
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 13.5
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 22.4
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 5.1
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-13",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720052025T001",
   "extraSources": [
    "https://www.citralandcibubur.com/new-cluster-harga-perdana-pre-sale-660-juta/",
    "https://rumahsaya.bca.co.id/developer/ciputra/bogor/citraland-cibubur"
   ],
   "sikumbangId": "CBI0720052025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Klaster 2025 berstandar EDGE (IFC); pre-sale 1 lantai mulai ±Rp660 jt, 2 lantai ±Rp900 jt-an. Promo situs s.d. 31 Mar 2026 sudah berakhir.",
   "band": "10-15"
  },
  {
   "id": "pp-citraland-cibubur-montana-monterrey-klaster-lain",
   "name": "CitraLand Cibubur (Montana, Monterrey & klaster lain)",
   "developer": "PT Panasia Griya Mekaras (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 107.00615,
   "lat": -6.409914,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Mekarsari",
   "distanceKm": 13.71,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 539237687,
   "priceMax": 2760982463,
   "subsidiPrice": null,
   "lt": [
    60,
    289
   ],
   "lb": [
    16,
    139
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 104,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "KRL Nambo 12.7 km · GT Narogong 5.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 12.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 12.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 22.7
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 5.2
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720022023T002",
   "extraSources": [
    "https://rumahsaya.bca.co.id/developer/ciputra/bogor/citraland-cibubur"
   ],
   "sikumbangId": "CBI0720022023T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-grand-wisata-levante-at-klasika",
   "name": "Grand Wisata – Levante at Klasika",
   "developer": "PT Putra Alvita Pratama (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.03513,
   "lat": -6.296825,
   "kota": "Kota Bekasi",
   "kecamatan": "Mustikajaya",
   "desa": "Mustikajaya",
   "distanceKm": 13.91,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1500000000,
   "priceMax": 2800000000,
   "subsidiPrice": null,
   "lt": [
    72,
    195
   ],
   "lb": [
    77,
    154
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 16,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Jatimulya 3.9 km · KRL Tambun 4.8 km · GT Tambun 2.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 3.9
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 4.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.6
     }
    ],
    "toll": {
     "name": "GT Tambun",
     "km": 2.7
    }
   },
   "priceAsOf": "2025-02",
   "registryUpdated": "2025-02-20",
   "priceSource": "priceMin: start-from situs developer (diakses 2026-10-12); priceMax: SiKumbang",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1110032024T001",
   "extraSources": [
    "https://www.sinarmasland.com/development/township/grand-wisata"
   ],
   "sikumbangId": "BKS1110032024T001",
   "coordSource": "OSM way/1375022542 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-grand-wisata-dovia-at-ladoria",
   "name": "Grand Wisata – Dovia at Ladoria",
   "developer": "PT Putra Alvita Pratama (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.037139,
   "lat": -6.297022,
   "kota": "Kota Bekasi",
   "kecamatan": "Mustikajaya",
   "desa": "Mustikajaya",
   "distanceKm": 14.12,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1778000000,
   "priceMax": 3177000000,
   "subsidiPrice": null,
   "lt": [
    70,
    126
   ],
   "lb": [
    84,
    157
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 129,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Jatimulya 4.0 km · KRL Tambun 4.7 km · GT Tambun 2.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 4.0
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 4.7
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 17.8
     }
    ],
    "toll": {
     "name": "GT Tambun",
     "km": 2.6
    }
   },
   "priceAsOf": "2026-03",
   "registryUpdated": "2026-03-03",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS1110032026T001",
   "extraSources": [
    "https://www.sinarmasland.com/id/news/sinar-mas-land-hadirkan-dovia-di-kawasan-ladoria-grand-wisata-bekasi"
   ],
   "sikumbangId": "BKS1110032026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "152 unit, klaster perdana kawasan Ladoria; harga resmi mulai Rp1,7 M (Dovia 7 7×10 Rp1,76 M s.d. Dovia 9 Rp3,1 M).",
   "band": "10-15"
  },
  {
   "id": "pp-samesta-east-point-cakung",
   "name": "Samesta East Point (Cakung)",
   "developer": "Perum Pembangunan Perumahan Nasional (Perumnas)",
   "developerGroup": "Perumnas (BUMN)",
   "lon": 106.94897,
   "lat": -6.205351,
   "kota": "Jakarta Timur",
   "kecamatan": "Cakung",
   "desa": "Pulo Gebang",
   "distanceKm": 14.22,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 513705000,
   "priceMax": 996890000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    18.9,
    46.4
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 27,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cakung 1.6 km · LRT Cikunir 2 5.7 km · GT Bintara 1.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cakung",
      "km": 1.6
     },
     {
      "mode": "LRT",
      "name": "Cikunir 2",
      "km": 5.7
     },
     {
      "mode": "LRT Jakarta",
      "name": "Velodrome",
      "km": 6.6
     }
    ],
    "toll": {
     "name": "GT Bintara",
     "km": 1.8
    }
   },
   "priceAsOf": "2024-08",
   "registryUpdated": "2024-08-08",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0610052024R001",
   "extraSources": [],
   "sikumbangId": "CKG0610052024R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-pesona-prima-9-cikahuripan",
   "name": "Pesona Prima 9 Cikahuripan",
   "developer": "PT Kreasi Prima Nusantara",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.978303,
   "lat": -6.441715,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Dayeuh",
   "distanceKm": 14.53,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 262,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 8.4 km · GT Narogong 7.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 8.4
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 11.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 24.1
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 7.1
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720042026T001",
   "extraSources": [],
   "sikumbangId": "CBI0720042026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "10-15"
  },
  {
   "id": "pp-harvest-city-ruby-at-the-ridge",
   "name": "Harvest City – Ruby at The Ridge",
   "developer": "Sinar Mas Land (Harvest City)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.029986,
   "lat": -6.388742,
   "kota": "Kab. Bekasi",
   "kecamatan": "Setu",
   "desa": "Ragemanunggal",
   "distanceKm": 14.55,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1300000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": [
    78,
    105
   ],
   "lb": [
    91,
    106
   ],
   "status": "launching",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Jatimulya 13.9 km · GT Burangkeng 4.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 13.9
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 14.8
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 21.1
     }
    ],
    "toll": {
     "name": "GT Burangkeng",
     "km": 4.3
    }
   },
   "priceAsOf": "2026-09 (peluncuran)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://propertiterkini.com/harvest-city-tawarkan-hunian-gaya-american-classic-mulai-rp13-miliar/",
   "extraSources": [
    "https://suarabantennews.com/sinar-mas-land-luncurkan-klaster-ruby-at-the-ridge-di-harvest-city-hunian-american-classic-mulai-rp-13-miliar/"
   ],
   "sikumbangId": null,
   "coordSource": "OSM way/1379009335 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "147 unit di 3,1 ha; Tipe 6 (78/91) & Tipe 7 (105/106). Harvest City resmi bagian Sinar Mas Land sejak awal 2025.",
   "band": "10-15"
  },
  {
   "id": "pp-summarecon-bekasi-soultan-island",
   "name": "Summarecon Bekasi – Soultan Island",
   "developer": "PT Summarecon Agung Tbk",
   "developerGroup": "Summarecon",
   "lon": 106.99123,
   "lat": -6.22195,
   "kota": "Kota Bekasi",
   "kecamatan": "Medan Satria",
   "desa": "Harapan Mulya",
   "distanceKm": 14.62,
   "segment": "premium",
   "type": "landed",
   "priceMin": 9300000000,
   "priceMax": 29500000000,
   "subsidiPrice": null,
   "lt": [
    300,
    600
   ],
   "lb": [
    374,
    498
   ],
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Kranji 1.3 km · LRT Bekasi Barat 3.4 km · GT Margajaya 2.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 1.3
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 3.4
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 11.1
     }
    ],
    "toll": {
     "name": "GT Margajaya",
     "km": 2.9
    }
   },
   "priceAsOf": "2026-02",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.majalahglobalreview.com/hingga-akhir-2026-summarecon-bekasi-targetkan-rp400-miliar-dari-penjualan-30-unit-rumah-mewah-klaster-soultan-island/",
   "extraSources": [
    "https://gobekasi.id/2026/02/25/bidik-rp400-miliar-summarecon-bekasi-genjot-penjualan-klaster-supermewah-soultan-island/"
   ],
   "sikumbangId": null,
   "coordSource": "OSM way/1483885924 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "110 rumah super mewah di 8 ha dikelilingi danau; 20 unit konstruksi, serah terima Sep 2027.",
   "band": "10-15"
  },
  {
   "id": "pp-villa-setu-permai-1",
   "name": "Villa Setu Permai 1",
   "developer": "PT Ikat Progressive Partner",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.044283,
   "lat": -6.351027,
   "kota": "Kab. Bekasi",
   "kecamatan": "Setu",
   "desa": "Ciledug",
   "distanceKm": 14.7,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 367797500,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    72
   ],
   "lb": [
    30,
    40
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 55,
    "komersial": 16,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatimulya 10.0 km · GT Burangkeng 2.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 10.0
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 10.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.4
     }
    ],
    "toll": {
     "name": "GT Burangkeng",
     "km": 2.0
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-29",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1820042020T001",
   "extraSources": [],
   "sikumbangId": "CKR1820042020T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "10-15"
  },
  {
   "id": "pp-harvest-city-rosaline",
   "name": "Harvest City – Rosaline",
   "developer": "PT Dwigunatama Rintisprima (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.032331,
   "lat": -6.387555,
   "kota": "Kab. Bekasi",
   "kecamatan": "Setu",
   "desa": "Cikarageman",
   "distanceKm": 14.72,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 771411150,
   "priceMax": 1215017100,
   "subsidiPrice": null,
   "lt": [
    50,
    120
   ],
   "lb": [
    50,
    146
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 27,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Jatimulya 13.8 km · GT Burangkeng 4.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 13.8
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 14.6
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 20.8
     }
    ],
    "toll": {
     "name": "GT Burangkeng",
     "km": 4.2
    }
   },
   "priceAsOf": "2025-04",
   "registryUpdated": "2025-04-07",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1820082025T001",
   "extraSources": [],
   "sikumbangId": "CKR1820082025T001",
   "coordSource": "OSM way/1379009336 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "10-15"
  },
  {
   "id": "pp-grand-nusa-indah-adhigana-cileungsi",
   "name": "Grand Nusa Indah Adhigana (Cileungsi)",
   "developer": "PT Kentanix Supra International",
   "developerGroup": "Kentanix",
   "lon": 107.013878,
   "lat": -6.424297,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Gandoang",
   "distanceKm": 15.42,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 420200000,
   "priceMax": 1663690000,
   "subsidiPrice": null,
   "lt": [
    60,
    95
   ],
   "lb": [
    31,
    86
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 278,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 12.8 km · GT Narogong 7.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 12.8
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 14.2
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 23.6
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 7.0
    }
   },
   "priceAsOf": "2024-09",
   "registryUpdated": "2024-09-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720052021T001",
   "extraSources": [],
   "sikumbangId": "CBI0720052021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-grand-wisata-yara-giva-at-the-kaia",
   "name": "Grand Wisata – Yara/Giva at The Kaia",
   "developer": "PT Putra Alvita Pratama (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.048193,
   "lat": -6.286431,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tambun Selatan",
   "desa": "Lambangjaya",
   "distanceKm": 15.62,
   "segment": "premium",
   "type": "landed",
   "priceMin": 3400000000,
   "priceMax": 4950000000,
   "subsidiPrice": null,
   "lt": [
    128,
    220
   ],
   "lb": [
    182,
    294
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 35,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Tambun 3.2 km · LRT Jatimulya 3.8 km · GT Tambun 1.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 3.2
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 3.8
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 18.7
     }
    ],
    "toll": {
     "name": "GT Tambun",
     "km": 1.0
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0620032025T002",
   "extraSources": [
    "https://www.sinarmasland.com/development/township/grand-wisata"
   ],
   "sikumbangId": "CKR0620032025T002",
   "coordSource": "OSM way/1375022537 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Situs Sinar Mas: Giva at The Kaia mulai Rp4,0 M.",
   "band": "15-20"
  },
  {
   "id": "pp-harvest-city-sakura-indica",
   "name": "Harvest City – Sakura Indica",
   "developer": "PT Dwigunatama Rintisprima (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.042237,
   "lat": -6.38774,
   "kota": "Kab. Bekasi",
   "kecamatan": "Setu",
   "desa": "Muktijaya",
   "distanceKm": 15.71,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 406000000,
   "priceMax": 850000000,
   "subsidiPrice": null,
   "lt": [
    60,
    119
   ],
   "lb": [
    20,
    37
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 57,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "LRT Jatimulya 13.9 km · GT Burangkeng 4.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 13.9
     },
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 14.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.7
     }
    ],
    "toll": {
     "name": "GT Burangkeng",
     "km": 4.6
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-02",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1820102024T002",
   "extraSources": [],
   "sikumbangId": "CKR1820102024T002",
   "coordSource": "OSM way/1379009342 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-griya-cileungsi-8",
   "name": "Griya Cileungsi 8",
   "developer": "PT Bina Griya Sarana",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.003111,
   "lat": -6.438189,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Mampir",
   "distanceKm": 15.75,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 179000000,
   "priceMax": 262900000,
   "subsidiPrice": [
    179000000,
    185000000
   ],
   "lt": [
    60,
    90
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 47,
    "komersial": 56,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 11.1 km · GT Narogong 7.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 11.1
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 13.9
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 25.1
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 7.5
    }
   },
   "priceAsOf": "2026-01",
   "registryUpdated": "2026-01-08",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720032022T001",
   "extraSources": [],
   "sikumbangId": "CBI0720032022T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-pesona-kahuripan-1-tahap-13",
   "name": "Pesona Kahuripan 1 Tahap 13",
   "developer": "PT Hikmah Alam Sentosa",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.983378,
   "lat": -6.451937,
   "kota": "Kab. Bogor",
   "kecamatan": "Klapanunggal",
   "desa": "Cikahuripan",
   "distanceKm": 15.79,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 209,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 8.7 km · GT Narogong 8.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 8.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 13.0
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 25.4
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 8.3
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-03",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI3220052026T001",
   "extraSources": [],
   "sikumbangId": "CBI3220052026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-grand-wisata-water-terrace",
   "name": "Grand Wisata – Water Terrace",
   "developer": "Sinar Mas Land",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.052211,
   "lat": -6.292008,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tambun Selatan",
   "desa": "Lambangjaya",
   "distanceKm": 15.87,
   "segment": "premium",
   "type": "landed",
   "priceMin": 3200000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Tambun 3.7 km · LRT Jatimulya 4.6 km · GT Tambun 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 3.7
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 4.6
     },
     {
      "mode": "Whoosh",
      "name": "Halim",
      "km": 19.2
     }
    ],
    "toll": {
     "name": "GT Tambun",
     "km": 1.5
    }
   },
   "priceAsOf": "2026-10 (start-from di situs developer)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.sinarmasland.com/development/township/grand-wisata",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/1271655075 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-the-newton-2-ciputra-world-2",
   "name": "The Newton 2 (Ciputra World 2)",
   "developer": "PT Ciputra Adibuana",
   "developerGroup": "Ciputra",
   "lon": 106.817671,
   "lat": -6.220588,
   "kota": "Jakarta Selatan",
   "kecamatan": "Setiabudi",
   "desa": "Karet Semanggi",
   "distanceKm": 15.96,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 999000000,
   "priceMax": 3558105000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    23.4,
    60.5
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 155,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "MRT Bendungan Hilir 0.6 km · LRT Rasuna Said 1.6 km · GT Semanggi 0.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "MRT",
      "name": "Bendungan Hilir",
      "km": 0.6
     },
     {
      "mode": "LRT",
      "name": "Rasuna Said",
      "km": 1.6
     },
     {
      "mode": "KRL",
      "name": "Sudirman",
      "km": 2.1
     }
    ],
    "toll": {
     "name": "GT Semanggi",
     "km": 0.4
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-15",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/KYB0210022023R001",
   "extraSources": [],
   "sikumbangId": "KYB0210022023R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-capitol-park-residence-salemba",
   "name": "Capitol Park Residence (Salemba)",
   "developer": "PT Wikaraga Sapta Utama",
   "developerGroup": "Capitol Park",
   "lon": 106.850939,
   "lat": -6.196984,
   "kota": "Jakarta Pusat",
   "kecamatan": "Senen",
   "desa": "Kenari",
   "distanceKm": 16.13,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 968000000,
   "priceMax": 5376210000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    22.5,
    188
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 281,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jakarta Proklamasi 0.6 km · KRL Kramat 0.7 km · GT Rawamangun 2.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT Jakarta",
      "name": "Proklamasi",
      "km": 0.6
     },
     {
      "mode": "KRL",
      "name": "Kramat",
      "km": 0.7
     },
     {
      "mode": "LRT",
      "name": "Setiabudi",
      "km": 2.7
     }
    ],
    "toll": {
     "name": "GT Rawamangun",
     "km": 2.5
    }
   },
   "priceAsOf": "2025-02",
   "registryUpdated": "2025-02-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/TNA0410022021R001",
   "extraSources": [],
   "sikumbangId": "TNA0410022021R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-grand-wisata-tanamas",
   "name": "Grand Wisata – Tanamas",
   "developer": "Sinar Mas Land",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.056087,
   "lat": -6.296751,
   "kota": "Kab. Bekasi",
   "kecamatan": null,
   "desa": "Rawa Banteng",
   "distanceKm": 16.16,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1600000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Tambun 4.2 km · LRT Jatimulya 5.3 km · GT Tambun 2.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 4.2
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 5.3
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.5
     }
    ],
    "toll": {
     "name": "GT Tambun",
     "km": 2.1
    }
   },
   "priceAsOf": "2026-10 (start-from di situs developer)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.sinarmasland.com/development/township/grand-wisata",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/1375022540 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-primavera-residence",
   "name": "Primavera Residence",
   "developer": "PT Vista Bangun Cemerlang",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.001308,
   "lat": -6.445569,
   "kota": "Kab. Bogor",
   "kecamatan": "Klapanunggal",
   "desa": "Bojong",
   "distanceKm": 16.28,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 300000000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    27,
    84
   ],
   "lb": [
    27,
    72
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 219,
    "komersial": 270,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 10.8 km · GT Narogong 8.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 10.8
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 14.1
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 25.7
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 8.2
    }
   },
   "priceAsOf": "2026-05",
   "registryUpdated": "2026-05-11",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI3220022020T005",
   "extraSources": [],
   "sikumbangId": "CBI3220022020T005",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-permata-puri-harmoni-2-tahap-3",
   "name": "Permata Puri Harmoni 2 Tahap 3",
   "developer": "PT Bangun Cipta Multiguna",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.024833,
   "lat": -6.424844,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Situsari",
   "distanceKm": 16.35,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 844040500,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    40,
    130
   ],
   "lb": [
    29,
    84
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 62,
    "komersial": 62,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 13.9 km · GT Narogong 7.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 13.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 15.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 22.5
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 7.9
    }
   },
   "priceAsOf": "2026-10",
   "registryUpdated": "2026-10-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720092024T003",
   "extraSources": [],
   "sikumbangId": "CBI0720092024T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-pesona-kahuripan-14",
   "name": "Pesona Kahuripan 14",
   "developer": "PT Hikmah Alam Sentosa",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.037253,
   "lat": -6.417376,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Cipeucang",
   "distanceKm": 16.91,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 402919408,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    98
   ],
   "lb": [
    30,
    45
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 224,
    "komersial": 66,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 15.5 km · GT Sukaragam 7.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 15.5
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 16.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 20.9
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 7.3
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-27",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720082026T001",
   "extraSources": [],
   "sikumbangId": "CBI0720082026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-griya-alam-nusantara",
   "name": "Griya Alam Nusantara",
   "developer": "PT Akbar Inti Gemilang",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.018203,
   "lat": -6.438883,
   "kota": "Kab. Bogor",
   "kecamatan": "Klapanunggal",
   "desa": "Bojong",
   "distanceKm": 16.91,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 576000000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    108
   ],
   "lb": [
    30,
    45
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 138,
    "komersial": 67,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 12.7 km · GT Narogong 8.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 12.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 15.3
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 23.7
     }
    ],
    "toll": {
     "name": "GT Narogong",
     "km": 8.5
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI3220022021T005",
   "extraSources": [],
   "sikumbangId": "CBI3220022021T005",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-grand-wisata-altara",
   "name": "Grand Wisata – Altara",
   "developer": "PT Putra Alvita Pratama (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.064858,
   "lat": -6.298819,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Cibuntu",
   "distanceKm": 17.07,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1300000000,
   "priceMax": 1500000000,
   "subsidiPrice": null,
   "lt": [
    60,
    85
   ],
   "lb": [
    60,
    85
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 128,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "KRL Tambun 4.6 km · GT Setu Utara 1.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 4.6
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 6.1
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 18.5
     }
    ],
    "toll": {
     "name": "GT Setu Utara",
     "km": 1.4
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720072026T001",
   "extraSources": [
    "https://www.sinarmasland.com/id/news/sinar-mas-land-luncurkan-klaster-altara-di-grand-wisata-bekasi",
    "https://rumahsaya.bca.co.id/developer/sinarmas-land/bekasi/grand-wisata/altara-home-_-altara"
   ],
   "sikumbangId": "CKR0720072026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Altara Home 250 unit mulai Rp1,49 M (rilis Sinar Mas).",
   "band": "15-20"
  },
  {
   "id": "pp-maison-de-wisteria-metland-menteng",
   "name": "Maison de Wisteria (Metland Menteng)",
   "developer": "Keppel Land × Metland Menteng",
   "developerGroup": "Metland",
   "lon": 106.966293,
   "lat": -6.184012,
   "kota": "Jakarta Timur",
   "kecamatan": "Cakung",
   "desa": "Ujung Menteng",
   "distanceKm": 17.07,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1829000000,
   "priceMax": 3559000000,
   "subsidiPrice": null,
   "lt": [
    70,
    120
   ],
   "lb": [
    88,
    170
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 115,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Cakung 4.2 km · GT Bekasi Raya 2.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cakung",
      "km": 4.2
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 6.5
     },
     {
      "mode": "LRT",
      "name": "Cikunir 2",
      "km": 7.9
     }
    ],
    "toll": {
     "name": "GT Bekasi Raya",
     "km": 2.8
    }
   },
   "priceAsOf": "2023-12",
   "registryUpdated": "2023-12-29",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0610062023T001",
   "extraSources": [],
   "sikumbangId": "CKG0610062023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-prima-harapan-regency-bekasi-utara",
   "name": "Prima Harapan Regency (Bekasi Utara)",
   "developer": "PT Bumi Sarana Semesta",
   "developerGroup": "Bumi Sarana Semesta",
   "lon": 107.015228,
   "lat": -6.211456,
   "kota": "Kota Bekasi",
   "kecamatan": "Bekasi Utara",
   "desa": "Harapanbaru",
   "distanceKm": 17.19,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 997010000,
   "priceMax": 4657763000,
   "subsidiPrice": null,
   "lt": [
    36,
    150
   ],
   "lb": [
    45,
    169
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 25,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Bekasi Timur 3.9 km · LRT Bekasi Barat 5.4 km · GT Margajaya 4.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 3.9
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 5.4
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 12.7
     }
    ],
    "toll": {
     "name": "GT Margajaya",
     "km": 4.5
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-07",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/BKS0310032024T001",
   "extraSources": [],
   "sikumbangId": "BKS0310032024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-metland-menteng-cakung",
   "name": "Metland Menteng (Cakung)",
   "developer": "PT Metropolitan Land Tbk",
   "developerGroup": "Metland",
   "lon": 106.967102,
   "lat": -6.181648,
   "kota": "Jakarta Timur",
   "kecamatan": "Cakung",
   "desa": "Ujung Menteng",
   "distanceKm": 17.35,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1075590000,
   "priceMax": 4998435623,
   "subsidiPrice": null,
   "lt": [
    55,
    222
   ],
   "lb": [
    52,
    205
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 107,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Cakung 4.5 km · GT Bekasi Raya 2.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cakung",
      "km": 4.5
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 6.4
     },
     {
      "mode": "LRT",
      "name": "Cikunir 2",
      "km": 8.1
     }
    ],
    "toll": {
     "name": "GT Bekasi Raya",
     "km": 2.9
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-25",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0610062021T001",
   "extraSources": [],
   "sikumbangId": "CKG0610062021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-pesona-kahuripan-15",
   "name": "Pesona Kahuripan 15",
   "developer": "PT Hikmah Alam Sentosa",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.034703,
   "lat": -6.431247,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Situsari",
   "distanceKm": 17.65,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 504,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 14.7 km · GT Sukaragam 8.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 14.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 16.6
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 21.7
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 8.3
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720092026T001",
   "extraSources": [],
   "sikumbangId": "CBI0720092026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-fontana-lake-tahap-2",
   "name": "Fontana Lake Tahap 2",
   "developer": "PT Central Bangun Cemerlang",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.032997,
   "lat": -6.437222,
   "kota": "Kab. Bogor",
   "kecamatan": "Cileungsi",
   "desa": "Situsari",
   "distanceKm": 17.94,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 183000000,
   "priceMax": 360000000,
   "subsidiPrice": [
    183000000,
    185000000
   ],
   "lt": [
    60,
    84
   ],
   "lb": [
    30,
    38
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 31,
    "komersial": 6,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 14.4 km · GT Sukaragam 8.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 14.4
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 16.7
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 22.1
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 8.8
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0720092024T004",
   "extraSources": [],
   "sikumbangId": "CBI0720092024T004",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-sva-casa-sawangan",
   "name": "Sva Casa Sawangan",
   "developer": "PT Sva Casa Sawangan",
   "developerGroup": "Sva Casa",
   "lon": 106.769031,
   "lat": -6.404127,
   "kota": "Kota Depok",
   "kecamatan": "Sawangan",
   "desa": "Bedahan",
   "distanceKm": 18.04,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 971000000,
   "priceMax": 2416000000,
   "subsidiPrice": null,
   "lt": [
    72,
    150
   ],
   "lb": [
    70,
    160
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 182,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Depok 5.3 km · GT Sawangan 2.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Depok",
      "km": 5.3
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 12.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 14.4
     }
    ],
    "toll": {
     "name": "GT Sawangan",
     "km": 2.0
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-28",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0310022023T001",
   "extraSources": [],
   "sikumbangId": "DPK0310022023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-permata-nusa-indah-jayamulya",
   "name": "Permata Nusa Indah Jayamulya",
   "developer": "PT Panca Muara Jaya",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.057865,
   "lat": -6.403973,
   "kota": "Kab. Bekasi",
   "kecamatan": "Serang Baru",
   "desa": "Jayamulya",
   "distanceKm": 18.06,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 511710000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    96
   ],
   "lb": [
    25,
    33
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 224,
    "komersial": 133,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jatimulya 16.1 km · GT Sukaragam 4.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 16.1
     },
     {
      "mode": "KRL",
      "name": "Cibitung",
      "km": 16.1
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 18.3
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 4.6
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR2120042022T003",
   "extraSources": [],
   "sikumbangId": "CKR2120042022T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-jakarta-garden-city-florence-village",
   "name": "Jakarta Garden City – Florence Village",
   "developer": "PT Modernland Realty Tbk",
   "developerGroup": "Modernland",
   "lon": 106.961066,
   "lat": -6.165608,
   "kota": "Jakarta Timur",
   "kecamatan": "Cakung",
   "desa": null,
   "distanceKm": 18.83,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 900000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": [
    50,
    50
   ],
   "lb": [
    57,
    57
   ],
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jakarta Kelapa Gading 5.3 km · GT Bekasi Raya 3.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 5.3
     },
     {
      "mode": "KRL",
      "name": "Cakung",
      "km": 6.0
     },
     {
      "mode": "LRT",
      "name": "Cikunir 2",
      "km": 9.9
     }
    ],
    "toll": {
     "name": "GT Bekasi Raya",
     "km": 3.0
    }
   },
   "priceAsOf": "2025-09 (peluncuran; tahap 2 naik 11–15%)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://wartaekonomi.co.id/read584986/bidik-pasar-anak-muda-modernland-launching-florence-village-hunian-900-jutaan-di-jakarta",
   "extraSources": [
    "https://kabarproperti.id/modernland-luncurkan-florence-village-hunian-seharga-rp900-jutaan-di-jakarta-garden-city"
   ],
   "sikumbangId": null,
   "coordSource": "OSM way/1558732258 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Tahap 1 (150 unit) terjual habis; tahap 2 diluncurkan 27 Sep 2025 dengan harga naik 11–15%.",
   "band": "15-20"
  },
  {
   "id": "pp-metland-tambun",
   "name": "Metland Tambun",
   "developer": "PT Metropolitan Permata (Metland)",
   "developerGroup": "Metland",
   "lon": 107.0725,
   "lat": -6.267222,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tambun Selatan",
   "desa": "Tambun",
   "distanceKm": 18.86,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 662683810,
   "priceMax": 2545000000,
   "subsidiPrice": null,
   "lt": [
    85,
    138
   ],
   "lb": [
    55,
    140
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 8,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Cibitung 1.4 km · LRT Jatimulya 5.6 km · GT Cibitung 1.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cibitung",
      "km": 1.4
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 5.6
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.5
     }
    ],
    "toll": {
     "name": "GT Cibitung",
     "km": 1.8
    }
   },
   "priceAsOf": "2025-09",
   "registryUpdated": "2025-09-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0620042021T001",
   "extraSources": [],
   "sikumbangId": "CKR0620042021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-kota-harapan-indah-kana-vasana",
   "name": "Kota Harapan Indah – Kana & Vasana",
   "developer": "PT Hasana Damai Putra (Damai Putra Group)",
   "developerGroup": "Damai Putra",
   "lon": 106.977849,
   "lat": -6.169197,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tarumajaya",
   "desa": "Pusakarakyat",
   "distanceKm": 19.06,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1000000000,
   "priceMax": 2000000000,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Kranji 6.2 km · GT Bekasi Raya 4.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 6.2
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 7.2
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 9.4
     }
    ],
    "toll": {
     "name": "GT Bekasi Raya",
     "km": 4.4
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://belirumah.co/berita/2026/6/2/rumah-harapan-indah-jual-kawasan-favorit-di-bekasi",
   "extraSources": [
    "https://propertiterkini.com/kota-harapan-indah-raih-people-choices-2026/"
   ],
   "sikumbangId": null,
   "coordSource": "OSM way/1378236712 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": "Klaster CRESTA (tepi danau, mulai ±Rp900 jt, LT70/LB75) direncanakan dipasarkan Sep 2026 — titik lokasinya belum terpetakan.",
   "band": "15-20"
  },
  {
   "id": "pp-grand-cikarang-village-cluster-citra-residence",
   "name": "Grand Cikarang Village – Cluster Citra Residence",
   "developer": "PT Purnama Karya Bersama",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.073103,
   "lat": -6.395719,
   "kota": "Kab. Bekasi",
   "kecamatan": "Serang Baru",
   "desa": "Jayasampurna",
   "distanceKm": 19.19,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    29,
    29
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 42,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cibitung 14.9 km · GT Sukaragam 2.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cibitung",
      "km": 14.9
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 15.7
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 16.5
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 2.7
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR2120082026T002",
   "extraSources": [],
   "sikumbangId": "CKR2120082026T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-citralake-sawangan",
   "name": "CitraLake Sawangan",
   "developer": "KSO Citra Bangun Cemerlang (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 106.746583,
   "lat": -6.381463,
   "kota": "Kota Depok",
   "kecamatan": "Sawangan",
   "desa": "Kedaung",
   "distanceKm": 19.35,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 904845000,
   "priceMax": 5024000000,
   "subsidiPrice": null,
   "lt": [
    82,
    556
   ],
   "lb": [
    36,
    222
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 22,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Depok 8.2 km · GT Limo Utama 3.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Depok",
      "km": 8.2
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 10.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 16.5
     }
    ],
    "toll": {
     "name": "GT Limo Utama",
     "km": 3.5
    }
   },
   "priceAsOf": "2023-11",
   "registryUpdated": "2023-11-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK0310122021T001",
   "extraSources": [],
   "sikumbangId": "DPK0310122021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "low",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-sutera-sawangan",
   "name": "Sutera Sawangan",
   "developer": "PT Alfa Goldland Realty (Alam Sutera group)",
   "developerGroup": "Alam Sutera",
   "lon": 106.746494,
   "lat": -6.382064,
   "kota": "Kota Depok",
   "kecamatan": "Bojongsari",
   "desa": "Serua",
   "distanceKm": 19.38,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1178400000,
   "priceMax": 2482000000,
   "subsidiPrice": null,
   "lt": [
    84,
    158
   ],
   "lb": [
    75,
    134
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 11,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Depok 8.2 km · GT Limo Utama 3.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Depok",
      "km": 8.2
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 10.8
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 16.5
     }
    ],
    "toll": {
     "name": "GT Limo Utama",
     "km": 3.6
    }
   },
   "priceAsOf": "2026-05",
   "registryUpdated": "2026-05-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK1110032025T001",
   "extraSources": [],
   "sikumbangId": "DPK1110032025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-puri-harmoni-pasirmukti-perluasan",
   "name": "Puri Harmoni Pasirmukti (Perluasan)",
   "developer": "PT Harmoni Bangun Multiguna",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.907639,
   "lat": -6.503292,
   "kota": "Kab. Bogor",
   "kecamatan": "Citeureup",
   "desa": "Pasirmukti",
   "distanceKm": 19.48,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 889800000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    48,
    141
   ],
   "lb": [
    28,
    67
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 129,
    "komersial": 53,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 4.1 km · GT Citeureup I 4.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 4.1
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 14.4
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 26.7
     }
    ],
    "toll": {
     "name": "GT Citeureup I",
     "km": 4.3
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-29",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0320142023T001",
   "extraSources": [],
   "sikumbangId": "CBI0320142023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-citraindah-city-bukit-permai",
   "name": "CitraIndah City – Bukit Permai",
   "developer": "PT Anekaindah Mitraperkasa (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 107.044128,
   "lat": -6.446553,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Sukamaju",
   "distanceKm": 19.55,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 596936390,
   "priceMax": 1652058086,
   "subsidiPrice": null,
   "lt": [
    90,
    150
   ],
   "lb": [
    39,
    135
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 41,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "KRL Nambo 15.4 km · GT Sukaragam 8.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 15.4
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 18.3
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 21.4
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 8.5
    }
   },
   "priceAsOf": "2025-10",
   "registryUpdated": "2025-10-14",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620012024T001",
   "extraSources": [],
   "sikumbangId": "CBI0620012024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-jakarta-garden-city-mahakam-the-signature",
   "name": "Jakarta Garden City – Mahakam The Signature",
   "developer": "PT Modern Land Realty Tbk",
   "developerGroup": "Modernland",
   "lon": 106.964737,
   "lat": -6.157838,
   "kota": "Jakarta Timur",
   "kecamatan": "Cakung",
   "desa": "Cakung Timur",
   "distanceKm": 19.78,
   "segment": "premium",
   "type": "landed",
   "priceMin": 5049000000,
   "priceMax": 5049000000,
   "subsidiPrice": null,
   "lt": [
    187,
    187
   ],
   "lb": [
    144,
    144
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 46,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "LRT Jakarta Kelapa Gading 5.6 km · GT Rorotan 3.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 5.6
     },
     {
      "mode": "KRL",
      "name": "Cakung",
      "km": 6.9
     },
     {
      "mode": "LRT",
      "name": "Cikunir 2",
      "km": 10.8
     }
    ],
    "toll": {
     "name": "GT Rorotan",
     "km": 3.0
    }
   },
   "priceAsOf": "2025-06",
   "registryUpdated": "2025-06-18",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKG0610042024T002",
   "extraSources": [],
   "sikumbangId": "CKG0610042024T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "15-20"
  },
  {
   "id": "pp-grand-premier-tahap-3",
   "name": "Grand Premier Tahap 3",
   "developer": "PT Kurnia Astaguna Santana",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.08068,
   "lat": -6.395718,
   "kota": "Kab. Bekasi",
   "kecamatan": "Serang Baru",
   "desa": "Jayamulya",
   "distanceKm": 19.96,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 197,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cibitung 14.9 km · GT Sukaragam 1.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cibitung",
      "km": 14.9
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 15.7
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 16.0
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 1.9
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-23",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR2120042025T001",
   "extraSources": [],
   "sikumbangId": "CKR2120042025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "15-20"
  },
  {
   "id": "pp-hannam-eco-town-sawangan",
   "name": "Hannam – Eco Town Sawangan",
   "developer": "Lotte Land Sawangan (Lotte Land × Vasanta Group)",
   "developerGroup": "Lotte Land/Vasanta",
   "lon": 106.747766,
   "lat": -6.401551,
   "kota": "Kota Depok",
   "kecamatan": "Bojongsari",
   "desa": "Bojongsari",
   "distanceKm": 20.03,
   "segment": "premium",
   "type": "landed",
   "priceMin": 3600000000,
   "priceMax": 3700000000,
   "subsidiPrice": null,
   "lt": [
    100,
    100
   ],
   "lb": [
    255,
    255
   ],
   "status": "sold-out-unknown",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Depok 7.7 km · GT Sawangan 4.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Depok",
      "km": 7.7
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 12.8
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 16.6
     }
    ],
    "toll": {
     "name": "GT Sawangan",
     "km": 4.0
    }
   },
   "priceAsOf": "2026-01",
   "registryUpdated": "2026-01-26",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK1110012026T001",
   "extraSources": [
    "https://www.propertynbank.com/lotte-land-sawangan-luncurkan-hunian-mewah/"
   ],
   "sikumbangId": "DPK1110012026T001",
   "coordSource": "OSM way/1460104998 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah 3 lantai + lift pribadi; diluncurkan Feb 2024 mulai ±Rp3,8 M, target serah terima 2026.",
   "band": "20-30"
  },
  {
   "id": "pp-grand-harmoni-indah-tahap-ii",
   "name": "Grand Harmoni Indah Tahap II",
   "developer": "PT Prima Bangun Propertindo",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.064009,
   "lat": -6.437291,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Sukamanah",
   "distanceKm": 20.61,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 414800000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    36,
    115
   ],
   "lb": [
    28,
    103
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 115,
    "komersial": 41,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 17.7 km · GT Sukaragam 6.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 17.7
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 18.9
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 19.8
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 6.4
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-14",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620062024T001",
   "extraSources": [],
   "sikumbangId": "CBI0620062024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-grand-royal-park-desa-sukasari",
   "name": "Grand Royal Park (Desa Sukasari)",
   "developer": "PT Deltakirana Perdana",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.092148,
   "lat": -6.388831,
   "kota": "Kab. Bekasi",
   "kecamatan": "Serang Baru",
   "desa": "Sukasari",
   "distanceKm": 20.88,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 650000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    52,
    80
   ],
   "lb": [
    28,
    90
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 117,
    "komersial": 12,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cibitung 14.2 km · GT Sukaragam 0.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cibitung",
      "km": 14.2
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 14.3
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 15.9
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 0.6
    }
   },
   "priceAsOf": "2026-05",
   "registryUpdated": "2026-05-21",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR2120032020T001",
   "extraSources": [],
   "sikumbangId": "CKR2120032020T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-citraindah-city-bukit-freesia",
   "name": "CitraIndah City – Bukit Freesia",
   "developer": "PT Mitrakusuma Erasemesta (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 107.041108,
   "lat": -6.468871,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Singajaya",
   "distanceKm": 21.08,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 363360000,
   "priceMax": 1295271119,
   "subsidiPrice": null,
   "lt": [
    60,
    120
   ],
   "lb": [
    36,
    71
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 61,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "KRL Nambo 14.9 km · GT Sukaragam 10.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 14.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 19.2
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 22.8
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 10.7
    }
   },
   "priceAsOf": "2025-09",
   "registryUpdated": "2025-09-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620032025T001",
   "extraSources": [
    "https://mediaindonesia.com/ekonomi/718002/citraindah-city-luncurkan-klaster-baru-bukit-freesia-berkonsep-modern-klasik-eropa-",
    "https://rumahsaya.bca.co.id/developer/ciputra/bogor/citraindah-city-jonggol"
   ],
   "sikumbangId": "CBI0620032025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Soft launching Nov 2024 mulai ±Rp400 jt-an; 299 rumah + 40 ruko di 5 ha.",
   "band": "20-30"
  },
  {
   "id": "pp-summarecon-crown-gading-viola-residence",
   "name": "Summarecon Crown Gading – Viola Residence",
   "developer": "PT Duta Sumara Abadi (Summarecon)",
   "developerGroup": "Summarecon",
   "lon": 107.000217,
   "lat": -6.159036,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tarumajaya",
   "desa": "Setia Asih",
   "distanceKm": 21.12,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1115550000,
   "priceMax": 3163500000,
   "subsidiPrice": null,
   "lt": [
    55,
    151
   ],
   "lb": [
    54,
    178
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 42,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Kranji 7.6 km · GT Marunda 5.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 7.6
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 9.5
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 10.5
     }
    ],
    "toll": {
     "name": "GT Marunda",
     "km": 5.4
    }
   },
   "priceAsOf": "2025-06",
   "registryUpdated": "2025-06-25",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0120072023T003",
   "extraSources": [],
   "sikumbangId": "CKR0120072023T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-h-city-sawangan",
   "name": "H City Sawangan",
   "developer": "PT HK Realtindo (Hutama Karya)",
   "developerGroup": "HK Realtindo (BUMN)",
   "lon": 106.738598,
   "lat": -6.408328,
   "kota": "Kota Depok",
   "kecamatan": "Bojongsari",
   "desa": "Bojongsari",
   "distanceKm": 21.26,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 750000000,
   "priceMax": 2060240296,
   "subsidiPrice": null,
   "lt": [
    60,
    120
   ],
   "lb": [
    38,
    100
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 375,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Citayam 8.4 km · GT Sawangan 5.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Citayam",
      "km": 8.4
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 13.8
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 17.8
     }
    ],
    "toll": {
     "name": "GT Sawangan",
     "km": 5.2
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-23",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/DPK1110012023T002",
   "extraSources": [],
   "sikumbangId": "DPK1110012023T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-mutiara-gading-city-monaco-paris",
   "name": "Mutiara Gading City – Monaco & Paris",
   "developer": "PT Ispi Pratamalestari Propertindo",
   "developerGroup": "Mutiara Gading City",
   "lon": 107.009167,
   "lat": -6.160278,
   "kota": "Kab. Bekasi",
   "kecamatan": "Babelan",
   "desa": "Kedungjaya",
   "distanceKm": 21.47,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 198000000,
   "priceMax": 997000000,
   "subsidiPrice": null,
   "lt": [
    40,
    164
   ],
   "lb": [
    24,
    60
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 105,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Kranji 7.8 km · GT Marunda 6.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 7.8
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 10.5
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 10.5
     }
    ],
    "toll": {
     "name": "GT Marunda",
     "km": 6.0
    }
   },
   "priceAsOf": "2026-10",
   "registryUpdated": "2026-10-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0220092023T003",
   "extraSources": [],
   "sikumbangId": "CKR0220092023T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-puri-harmoni-jonggol",
   "name": "Puri Harmoni Jonggol",
   "developer": "PT Bangun Cipta Multiguna",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.063202,
   "lat": -6.454219,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Sukamaju",
   "distanceKm": 21.7,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 671000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    50,
    135
   ],
   "lb": [
    28,
    63
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 37,
    "komersial": 39,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 17.4 km · GT Sukaragam 8.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 17.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 20.6
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 8.0
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-28",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620012024T002",
   "extraSources": [],
   "sikumbangId": "CBI0620012024T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-sayap-emas-residence-2",
   "name": "Sayap Emas Residence 2",
   "developer": "PT Platindo Inti Jaya Putra",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.045717,
   "lat": -6.183689,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tambun Utara",
   "desa": "Sriamur",
   "distanceKm": 21.73,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    72
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 144,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Bekasi Timur 7.7 km · GT Gabus 2.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bekasi Timur",
      "km": 7.7
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 9.3
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 14.8
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 2.5
    }
   },
   "priceAsOf": "2026-03",
   "registryUpdated": "2026-03-05",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0520042026T001",
   "extraSources": [],
   "sikumbangId": "CKR0520042026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-grand-nirwana-estate-tajurhalang",
   "name": "Grand Nirwana Estate (Tajurhalang)",
   "developer": "PT Bina Citra Kreasindo",
   "developerGroup": "Bina Citra Kreasindo",
   "lon": 106.756781,
   "lat": -6.447953,
   "kota": "Kab. Bogor",
   "kecamatan": "Tajurhalang",
   "desa": "Citayam",
   "distanceKm": 21.83,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 300000000,
   "priceMax": 300000000,
   "subsidiPrice": null,
   "lt": [
    66,
    72
   ],
   "lb": [
    38,
    38
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 105,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Citayam 5.0 km · GT Sawangan 6.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Citayam",
      "km": 5.0
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 17.4
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 17.7
     }
    ],
    "toll": {
     "name": "GT Sawangan",
     "km": 6.8
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-10",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI3720022026T001",
   "extraSources": [],
   "sikumbangId": "CBI3720022026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-sukma-indah-residence",
   "name": "Sukma Indah Residence",
   "developer": "PT Maju Mars Abadi",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.064196,
   "lat": -6.455133,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Sukamaju",
   "distanceKm": 21.85,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 137000000,
   "priceMax": 318292000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    47,
    90
   ],
   "lb": [
    27,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 94,
    "komersial": 1,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 17.5 km · GT Sukaragam 8.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 17.5
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.8
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 20.7
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 8.0
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-08",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620012020T001",
   "extraSources": [],
   "sikumbangId": "CBI0620012020T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-trevista-hills-cluster-kebayoran",
   "name": "Trevista Hills – Cluster Kebayoran",
   "developer": "PT Sahid Putra Harapan",
   "developerGroup": "Trevista",
   "lon": 106.721523,
   "lat": -6.376894,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Sindur",
   "desa": "Rawakalong",
   "distanceKm": 21.87,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 967506000,
   "priceMax": 2012033000,
   "subsidiPrice": null,
   "lt": [
    60,
    84
   ],
   "lb": [
    40,
    92
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 280,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Rawa Buntu 8.5 km · GT Pamulang 5.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Rawa Buntu",
      "km": 8.5
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 11.4
     },
     {
      "mode": "LRT",
      "name": "Ciracas",
      "km": 19.2
     }
    ],
    "toll": {
     "name": "GT Pamulang",
     "km": 5.2
    }
   },
   "priceAsOf": "2026-02",
   "registryUpdated": "2026-02-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI1120092026T001",
   "extraSources": [],
   "sikumbangId": "CBI1120092026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-h-residence-kemayoran-amethyst-tower-rusun-subsi",
   "name": "H Residence Kemayoran – Amethyst Tower (rusun subsidi)",
   "developer": "PT HK Realtindo (Hutama Karya)",
   "developerGroup": "HK Realtindo (BUMN)",
   "lon": 106.839144,
   "lat": -6.145236,
   "kota": "Jakarta Pusat",
   "kecamatan": "Sawah Besar",
   "desa": "Gunung Sahari Utara",
   "distanceKm": 21.93,
   "segment": "subsidi",
   "type": "apartment",
   "priceMin": 396000000,
   "priceMax": 455000000,
   "subsidiPrice": [
    396000000,
    455000000
   ],
   "lt": null,
   "lb": [
    30,
    35
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 522,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Rajawali 0.3 km · MRT Bundaran HI Bank Jakarta 5.5 km · GT Kemayoran 1.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Rajawali",
      "km": 0.3
     },
     {
      "mode": "MRT",
      "name": "Bundaran HI Bank Jakarta",
      "km": 5.5
     },
     {
      "mode": "LRT Jakarta",
      "name": "Matraman",
      "km": 6.0
     }
    ],
    "toll": {
     "name": "GT Kemayoran",
     "km": 1.8
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-18",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/TNA0210042026R001",
   "extraSources": [
    "https://www.kompas.com/properti/read/2026/03/18/200332221/kepmen-pkp-soal-apartemen-subsidi-bisa-mengubah-nasib-kelas-pekerja?page=all"
   ],
   "sikumbangId": "TNA0210042026R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rusun subsidi skema Kepmen PKP 23/KPTS/M/2026 (harga per m²).",
   "band": "20-30"
  },
  {
   "id": "pp-suropati-residence-2023",
   "name": "Suropati Residence 2023",
   "developer": "PT Mitra Tata Griya",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.056807,
   "lat": -6.191079,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tambun Utara",
   "desa": "Srimukti",
   "distanceKm": 22.0,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 453000000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    137
   ],
   "lb": [
    17,
    25
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 125,
    "komersial": 12,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Tambun 7.5 km · GT Gabus 1.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Tambun",
      "km": 7.5
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 9.0
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 16.2
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 1.4
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-28",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0520052023T001",
   "extraSources": [],
   "sikumbangId": "CKR0520052023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-grand-duta-city-bekasi-3",
   "name": "Grand Duta City Bekasi 3",
   "developer": "PT Graha Duta Putra Jaya",
   "developerGroup": "Duta Putra",
   "lon": 107.023382,
   "lat": -6.161358,
   "kota": "Kab. Bekasi",
   "kecamatan": "Babelan",
   "desa": "Bahagia",
   "distanceKm": 22.19,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 850000000,
   "priceMax": 2400000000,
   "subsidiPrice": null,
   "lt": [
    59,
    90
   ],
   "lb": [
    39,
    149
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 148,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Kranji 8.5 km · GT Gabus 5.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 8.5
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 10.8
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 12.1
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 5.7
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-30",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0210062024T001",
   "extraSources": [],
   "sikumbangId": "CKR0210062024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-wahana-babelan",
   "name": "Wahana Babelan",
   "developer": "PT Graha Suka Damai",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.025036,
   "lat": -6.160867,
   "kota": "Kab. Bekasi",
   "kecamatan": "Babelan",
   "desa": "Babelankota",
   "distanceKm": 22.33,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    36,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 75,
    "komersial": 40,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Kranji 8.7 km · GT Gabus 5.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 8.7
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 10.9
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 12.3
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 5.6
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-23",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0220082020T001",
   "extraSources": [],
   "sikumbangId": "CKR0220082020T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-graha-citra-village",
   "name": "Graha Citra Village",
   "developer": "PT Kerta Galuh Persada",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.045703,
   "lat": -6.480081,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Singajaya",
   "distanceKm": 22.35,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 211,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Nambo 15.5 km · GT Sukaragam 11.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 15.5
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 20.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 23.1
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 11.5
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-19",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620032026T001",
   "extraSources": [],
   "sikumbangId": "CBI0620032026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-citraindah-city-bukit-meranti",
   "name": "CitraIndah City – Bukit Meranti",
   "developer": "PT Ciputra Indah (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 107.03405,
   "lat": -6.490619,
   "kota": "Kab. Bogor",
   "kecamatan": "Jonggol",
   "desa": "Cibodas",
   "distanceKm": 22.46,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 240180520,
   "priceMax": 611643007,
   "subsidiPrice": null,
   "lt": [
    60,
    150
   ],
   "lb": [
    22,
    38
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 303,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri",
    "BCA"
   ],
   "mandiriPartner": true,
   "transit": "KRL Nambo 14.4 km · GT Sukaragam 13.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Nambo",
      "km": 14.4
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 20.1
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 24.8
     }
    ],
    "toll": {
     "name": "GT Sukaragam",
     "km": 13.1
    }
   },
   "priceAsOf": "2024-06",
   "registryUpdated": "2024-06-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0620082023T001",
   "extraSources": [
    "https://citraindahciputra.com/about-citra-indah-topmenu-86/harga-cara-bayar-citra-indah/3073-harga-desember-2025-bukti-meranti.html"
   ],
   "sikumbangId": "CBI0620082023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Price list Des 2025: Meranti 1 Rp252,7 jt (normal), promo tunai Rp228,6 jt (promo kemungkinan sudah berakhir).",
   "band": "20-30"
  },
  {
   "id": "pp-mutiara-sentul",
   "name": "Mutiara Sentul",
   "developer": "PT Nuansa Pesona Asri",
   "developerGroup": "Nuansa Pesona Asri",
   "lon": 106.844278,
   "lat": -6.520501,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Sentul",
   "distanceKm": 22.7,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 360000000,
   "priceMax": 1184000000,
   "subsidiPrice": null,
   "lt": [
    36,
    310
   ],
   "lb": [
    36,
    344
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 15,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cilebut 4.9 km · GT Sentul 1.4 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cilebut",
      "km": 4.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 17.3
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 26.0
     }
    ],
    "toll": {
     "name": "GT Sentul",
     "km": 1.4
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-15",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520032021T001",
   "extraSources": [],
   "sikumbangId": "CBI0520032021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-mutiara-muktiwari-residence",
   "name": "Mutiara Muktiwari Residence",
   "developer": "PT Pajar Putri Pratama",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.095799,
   "lat": -6.220494,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Muktiwari",
   "distanceKm": 23.46,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    25,
    25
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 473,
    "komersial": 1,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Metland Telagamurni 4.5 km · GT Gabus 4.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 4.5
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 9.5
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 21.0
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 4.8
    }
   },
   "priceAsOf": "2025-12",
   "registryUpdated": "2025-12-08",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720042025T004",
   "extraSources": [],
   "sikumbangId": "CKR0720042025T004",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-adhi-city-sentul",
   "name": "Adhi City Sentul",
   "developer": "PT Adhi Commuter Properti Tbk (ADCP)",
   "developerGroup": "Adhi Commuter Properti (ADHI)",
   "lon": 106.851578,
   "lat": -6.531197,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Kadumanggu",
   "distanceKm": 23.58,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1380000000,
   "priceMax": 1742400000,
   "subsidiPrice": null,
   "lt": [
    90,
    129
   ],
   "lb": [
    40,
    70
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 3,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cilebut 5.6 km · GT Sentul 0.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cilebut",
      "km": 5.6
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 18.2
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 27.3
     }
    ],
    "toll": {
     "name": "GT Sentul",
     "km": 0.5
    }
   },
   "priceAsOf": "2025-06",
   "registryUpdated": "2025-06-30",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520062021T001",
   "extraSources": [
    "https://www.detik.com/properti/berita/d-8688338/daftar-4-proyek-lrt-city-yang-mulai-dibangun-lagi-hari-ini"
   ],
   "sikumbangId": "CBI0520062021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": "Termasuk proyek yang dilanjutkan pembangunannya sejak 1 Okt 2026 setelah sempat terhenti.",
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-citra-sentul-raya-tiber-highland",
   "name": "Citra Sentul Raya – Tiber Highland",
   "developer": "PT Citra Semesta Raya",
   "developerGroup": "Citra Sentul Raya",
   "lon": 106.861396,
   "lat": -6.535402,
   "kota": "Kab. Bogor",
   "kecamatan": "Citeureup",
   "desa": "Tangkil",
   "distanceKm": 23.74,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 848580695,
   "priceMax": 4201979195,
   "subsidiPrice": null,
   "lt": [
    60,
    207
   ],
   "lb": [
    28,
    181
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 22,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cilebut 6.7 km · GT Sentul 1.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cilebut",
      "km": 6.7
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 18.4
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 28.1
     }
    ],
    "toll": {
     "name": "GT Sentul",
     "km": 1.2
    }
   },
   "priceAsOf": "2025-08",
   "registryUpdated": "2025-08-04",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0320112025T001",
   "extraSources": [],
   "sikumbangId": "CBI0320112025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-griya-family-4-tahap-7",
   "name": "Griya Family 4 Tahap 7",
   "developer": "PT Bangun Famili Sejahtera",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.090569,
   "lat": -6.202103,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Muktiwari",
   "distanceKm": 24.09,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    36,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 231,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Metland Telagamurni 6.6 km · GT Gabus 3.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 6.6
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 10.3
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 20.1
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 3.0
    }
   },
   "priceAsOf": "2025-11",
   "registryUpdated": "2025-11-15",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720042025T003",
   "extraSources": [],
   "sikumbangId": "CKR0720042025T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-kirana-cikarang",
   "name": "Kirana Cikarang",
   "developer": "PT Argosubur Sentosa",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.118056,
   "lat": -6.248333,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Wanajaya",
   "distanceKm": 24.31,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 650000000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    156
   ],
   "lb": [
    22,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 103,
    "komersial": 163,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Metland Telagamurni 1.3 km · GT Telaga Asih 3.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 1.3
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 10.8
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 17.1
     }
    ],
    "toll": {
     "name": "GT Telaga Asih",
     "km": 3.3
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-29",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720022020T002",
   "extraSources": [],
   "sikumbangId": "CKR0720022020T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-grand-harmoni-park-perluasan",
   "name": "Grand Harmoni Park (Perluasan)",
   "developer": "PT Harmoni Panca Propertindo",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.098227,
   "lat": -6.205423,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Muktiwari",
   "distanceKm": 24.58,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 201485296,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    28,
    28
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 129,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Metland Telagamurni 6.0 km · GT Gabus 3.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 6.0
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 10.7
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 21.0
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 3.9
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-17",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720042026T002",
   "extraSources": [],
   "sikumbangId": "CKR0720042026T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-royal-sentul-park",
   "name": "Royal Sentul Park",
   "developer": "PT Adhi Commuter Properti Tbk (ADCP)",
   "developerGroup": "Adhi Commuter Properti (ADHI)",
   "lon": 106.853795,
   "lat": -6.543434,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Kadumanggu",
   "distanceKm": 24.82,
   "segment": "subsidi",
   "type": "apartment",
   "priceMin": 352657658,
   "priceMax": 1350100000,
   "subsidiPrice": [
    352657658,
    352657658
   ],
   "lt": null,
   "lb": [
    22.7,
    62
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 96,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cilebut 6.0 km · GT Sentul 1.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cilebut",
      "km": 6.0
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 19.4
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 28.7
     }
    ],
    "toll": {
     "name": "GT Sentul",
     "km": 1.8
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-14",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520062021R001",
   "extraSources": [],
   "sikumbangId": "CBI0520062021R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": "Proyek grup ADCP — cek progres konstruksi & status serah terima (isu likuiditas 2026).",
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-metland-cibitung-cluster-lisse",
   "name": "Metland Cibitung – Cluster Lisse",
   "developer": "PT Fajarputera Dinasti (Metland)",
   "developerGroup": "Metland",
   "lon": 107.12725,
   "lat": -6.252425,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Barat",
   "desa": "Telagamurni",
   "distanceKm": 25.1,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 530000000,
   "priceMax": 1903666509,
   "subsidiPrice": null,
   "lt": [
    30,
    154
   ],
   "lb": [
    31,
    117
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 23,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Metland Telagamurni 1.9 km · GT Telaga Asih 3.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 1.9
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 11.7
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 16.1
     }
    ],
    "toll": {
     "name": "GT Telaga Asih",
     "km": 3.8
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-03",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0820012024T001",
   "extraSources": [],
   "sikumbangId": "CKR0820012024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-cibinong-bogor-residence-iii",
   "name": "Cibinong Bogor Residence III",
   "developer": "PT Jaya Protindo",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.695248,
   "lat": -6.394246,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Sindur",
   "desa": "Cibinong",
   "distanceKm": 25.19,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    27,
    27
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 166,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Serpong 8.9 km · GT Pamulang 8.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Serpong",
      "km": 8.9
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 14.6
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 22.3
     }
    ],
    "toll": {
     "name": "GT Pamulang",
     "km": 8.5
    }
   },
   "priceAsOf": "2025-06",
   "registryUpdated": "2025-06-25",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI1120082025T001",
   "extraSources": [],
   "sikumbangId": "CBI1120082025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-grand-anandara-residence",
   "name": "Grand Anandara Residence",
   "developer": "PT Anandara Mitra Kurnia",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.028738,
   "lat": -6.1304,
   "kota": "Kab. Bekasi",
   "kecamatan": "Babelan",
   "desa": "Kedungjaya",
   "distanceKm": 25.43,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 175000000,
   "priceMax": 409000000,
   "subsidiPrice": [
    175000000,
    185000000
   ],
   "lt": [
    60,
    114
   ],
   "lb": [
    22,
    36
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 91,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Kranji 11.8 km · GT Tarumajaya 4.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Kranji",
      "km": 11.8
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 13.0
     },
     {
      "mode": "LRT",
      "name": "Bekasi Barat",
      "km": 14.3
     }
    ],
    "toll": {
     "name": "GT Tarumajaya",
     "km": 4.9
    }
   },
   "priceAsOf": "2026-09",
   "registryUpdated": "2026-09-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0220012023T001",
   "extraSources": [],
   "sikumbangId": "CKR0220012023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-emerald-cilebut-cluster-2-ext",
   "name": "Emerald Cilebut Cluster 2 Ext.",
   "developer": "PT Anugerah Griya Adhitama",
   "developerGroup": "Anugerah Griya",
   "lon": 106.795613,
   "lat": -6.524781,
   "kota": "Kab. Bogor",
   "kecamatan": "Sukaraja",
   "desa": "Cilebut Barat",
   "distanceKm": 25.44,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 430000000,
   "priceMax": 1444000000,
   "subsidiPrice": null,
   "lt": [
    60,
    75
   ],
   "lb": [
    33,
    100
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 62,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cilebut 0.9 km · GT Kayu Manis 3.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cilebut",
      "km": 0.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 20.1
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 25.8
     }
    ],
    "toll": {
     "name": "GT Kayu Manis",
     "km": 3.3
    }
   },
   "priceAsOf": "2025-03",
   "registryUpdated": "2025-03-24",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0420032023T001",
   "extraSources": [],
   "sikumbangId": "CBI0420032023T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-mahkota-village-tahap-2",
   "name": "Mahkota Village Tahap 2",
   "developer": "PT Agung Putri Mahkota",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.117311,
   "lat": -6.218935,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Kertamukti",
   "distanceKm": 25.61,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    32
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 241,
    "komersial": 25,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Metland Telagamurni 4.3 km · GT Telaga Asih 6.0 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 4.3
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 11.7
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 19.7
     }
    ],
    "toll": {
     "name": "GT Telaga Asih",
     "km": 6.0
    }
   },
   "priceAsOf": "2026-02",
   "registryUpdated": "2026-02-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720032024T003",
   "extraSources": [],
   "sikumbangId": "CKR0720032024T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-metland-cikarang",
   "name": "Metland Cikarang",
   "developer": "PT Fajarputera Dinasti (Metland)",
   "developerGroup": "Metland",
   "lon": 107.128163,
   "lat": -6.238159,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cibitung",
   "desa": "Wanajaya",
   "distanceKm": 25.77,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 475000000,
   "priceMax": 1690000000,
   "subsidiPrice": null,
   "lt": [
    45,
    168
   ],
   "lb": [
    22,
    118
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 214,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Metland Telagamurni 2.8 km · GT Telaga Asih 4.9 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 2.8
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 12.1
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 17.3
     }
    ],
    "toll": {
     "name": "GT Telaga Asih",
     "km": 4.9
    }
   },
   "priceAsOf": "2026-08",
   "registryUpdated": "2026-08-28",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0720022024T002",
   "extraSources": [],
   "sikumbangId": "CKR0720022024T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-lippo-cikarang-waterfront-estate",
   "name": "Lippo Cikarang – Waterfront Estate",
   "developer": "PT Lippo Cikarang Tbk",
   "developerGroup": "Lippo",
   "lon": 107.148444,
   "lat": -6.337673,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Selatan",
   "desa": "Cibatu",
   "distanceKm": 26.01,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 750000000,
   "priceMax": 1970000000,
   "subsidiPrice": null,
   "lt": [
    50,
    140.8
   ],
   "lb": [
    35,
    129
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 156,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Lemahabang 8.2 km · GT Cibatu 1.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 8.2
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 8.4
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 16.2
     }
    ],
    "toll": {
     "name": "GT Cibatu",
     "km": 1.6
    }
   },
   "priceAsOf": "2026-05",
   "registryUpdated": "2026-05-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1920012024T001",
   "extraSources": [],
   "sikumbangId": "CKR1920012024T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-griya-srimahi-indah",
   "name": "Griya Srimahi Indah",
   "developer": "PT Prima Tossa Perkasa",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 107.088082,
   "lat": -6.170328,
   "kota": "Kab. Bekasi",
   "kecamatan": "Tambun Utara",
   "desa": "Srimahi",
   "distanceKm": 26.1,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 308040000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    29,
    90
   ],
   "lb": [
    22,
    60
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 131,
    "komersial": 15,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Metland Telagamurni 10.0 km · GT Gabus 2.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Metland Telagamurni",
      "km": 10.0
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 12.8
     },
     {
      "mode": "LRT Jakarta",
      "name": "Kelapa Gading",
      "km": 19.3
     }
    ],
    "toll": {
     "name": "GT Gabus",
     "km": 2.8
    }
   },
   "priceAsOf": "2026-10",
   "registryUpdated": "2026-10-06",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR0520072020T003",
   "extraSources": [],
   "sikumbangId": "CKR0520072020T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-lippo-cikarang-newville-apartemen-low-rise",
   "name": "Lippo Cikarang – Newville (apartemen low-rise)",
   "developer": "PT Lippo Cikarang Tbk",
   "developerGroup": "Lippo",
   "lon": 107.154709,
   "lat": -6.332702,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Selatan",
   "desa": "Cibatu",
   "distanceKm": 26.69,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 279000000,
   "priceMax": 467000000,
   "subsidiPrice": [
    279000000,
    333000000
   ],
   "lt": null,
   "lb": [
    17.9,
    40.8
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 15,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "BTN"
   ],
   "mandiriPartner": null,
   "transit": "KRL Lemahabang 7.4 km · GT Cibatu 0.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 7.4
     },
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 7.9
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 16.6
     }
    ],
    "toll": {
     "name": "GT Cibatu",
     "km": 0.8
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-21",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1920012026R002",
   "extraSources": [
    "https://www.btnproperti.co.id/property/tipe/detail/the-alpha-l2-TPR2024121914331917",
    "https://ekonomi.bisnis.com/read/20221005/47/1584459/lippo-cikarang-lpck-tawarkan-hunian-newville-harga-mulai-rp279-juta"
   ],
   "sikumbangId": "CKR1920012026R002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-sentul-city-saffron-noble-apartment",
   "name": "Sentul City – Saffron Noble Apartment",
   "developer": "PT Sentul City Tbk",
   "developerGroup": "Sentul City",
   "lon": 106.855687,
   "lat": -6.565704,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Citaringgul",
   "distanceKm": 27.17,
   "segment": "menengah",
   "type": "apartment",
   "priceMin": 933000000,
   "priceMax": 2324000000,
   "subsidiPrice": null,
   "lt": null,
   "lb": [
    34.5,
    74.7
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 58,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cilebut 7.2 km · GT Sentul Selatan 1.2 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cilebut",
      "km": 7.2
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 21.8
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 31.2
     }
    ],
    "toll": {
     "name": "GT Sentul Selatan",
     "km": 1.2
    }
   },
   "priceAsOf": "2025-09",
   "registryUpdated": "2025-09-23",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520072025R001",
   "extraSources": [],
   "sikumbangId": "CBI0520072025R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-meikarta-rusun-subsidi-flpp-apartemen",
   "name": "Meikarta – Rusun Subsidi FLPP & apartemen",
   "developer": "PT Mahkota Sentosa Utama (Lippo Group)",
   "developerGroup": "Lippo",
   "lon": 107.16574,
   "lat": -6.336919,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Selatan",
   "desa": "Cibatu",
   "distanceKm": 27.92,
   "segment": "subsidi",
   "type": "apartment",
   "priceMin": 303940000,
   "priceMax": 902030802,
   "subsidiPrice": [
    303940000,
    538006800
   ],
   "lt": null,
   "lb": [
    21.9,
    98.3
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 220,
    "komersial": 59,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Nobu Bank (penyalur FLPP)"
   ],
   "mandiriPartner": null,
   "transit": "Whoosh Karawang 6.6 km · GT Cibatu 0.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 6.6
     },
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 7.5
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 17.9
     }
    ],
    "toll": {
     "name": "GT Cibatu",
     "km": 0.7
    }
   },
   "priceAsOf": "2026-10",
   "registryUpdated": "2026-10-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1920012026R001",
   "extraSources": [
    "https://www.kompas.com/properti/read/2026/02/03/090000821/ini-perkiraan-harga-rusun-subsidi-meikarta",
    "https://www.medcom.id/properti/news-properti/zNAdJRvK-meikarta-perluas-akses-rumah-subsidi-lewat-kpr-flpp"
   ],
   "sikumbangId": "CKR1920012026R001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": "Proyek rusun subsidi baru mulai land clearing Jan 2026; pastikan progres konstruksi sebelum akad.",
   "notes": "Skema FLPP rusun: bunga tetap 6%, tenor s.d. 30 th, DP mulai 1% (Medcom 2026). Akad ditargetkan akhir 2026 setelah progres ≥20%.",
   "band": "20-30"
  },
  {
   "id": "pp-sentul-city-centronia-residence",
   "name": "Sentul City – Centronia Residence",
   "developer": "PT Sentul City Tbk",
   "developerGroup": "Sentul City",
   "lon": 106.853304,
   "lat": -6.574208,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Citaringgul",
   "distanceKm": 28.15,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 2257100000,
   "priceMax": 3026500000,
   "subsidiPrice": null,
   "lt": [
    96,
    144
   ],
   "lb": [
    127,
    159
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Bogor 7.3 km · GT Sentul Selatan 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bogor",
      "km": 7.3
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 22.8
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 32.0
     }
    ],
    "toll": {
     "name": "GT Sentul Selatan",
     "km": 1.5
    }
   },
   "priceAsOf": "2026-05",
   "registryUpdated": "2026-05-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520072026T001",
   "extraSources": [],
   "sikumbangId": "CBI0520072026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-panorama-kemang",
   "name": "Panorama Kemang",
   "developer": "PT Multi Griya Propertindo",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.713841,
   "lat": -6.487808,
   "kota": "Kab. Bogor",
   "kecamatan": "Kemang",
   "desa": "Tegal",
   "distanceKm": 28.3,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 168000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    168000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    26,
    27
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 169,
    "komersial": 1,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Bojonggede 9.0 km · GT Kayu Manis 7.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bojonggede",
      "km": 9.0
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 23.1
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 23.8
     }
    ],
    "toll": {
     "name": "GT Kayu Manis",
     "km": 7.3
    }
   },
   "priceAsOf": "2026-02",
   "registryUpdated": "2026-02-12",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI1220092020T003",
   "extraSources": [],
   "sikumbangId": "CBI1220092020T003",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  },
  {
   "id": "pp-citracity-sentul-kawasan-premium",
   "name": "CitraCity Sentul – Kawasan Premium",
   "developer": "PT Citra Gelora Raya (Ciputra Group)",
   "developerGroup": "Ciputra",
   "lon": 106.882317,
   "lat": -6.583294,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Bojong Koneng",
   "distanceKm": 28.57,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1614057757,
   "priceMax": 5901282249,
   "subsidiPrice": null,
   "lt": [
    90,
    300
   ],
   "lb": [
    69,
    208
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 29,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "KRL Bogor 10.2 km · GT Sentul Selatan 4.7 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bogor",
      "km": 10.2
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 23.3
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 33.8
     }
    ],
    "toll": {
     "name": "GT Sentul Selatan",
     "km": 4.7
    }
   },
   "priceAsOf": "2026-07",
   "registryUpdated": "2026-07-21",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520092025T001",
   "extraSources": [
    "https://propertiindonesia.id/post/milirik-citra-city-sentul-proyek-terbaru-lansiran-ciputra-group"
   ],
   "sikumbangId": "CBI0520092025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-lippo-cikarang-cendana-homes-cbd-cendana-spark",
   "name": "Lippo Cikarang – Cendana Homes CBD (Cendana Spark)",
   "developer": "PT Lippo Cikarang Tbk",
   "developerGroup": "Lippo",
   "lon": 107.172945,
   "lat": -6.346062,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Selatan",
   "desa": "Cibatu",
   "distanceKm": 28.76,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 780000000,
   "priceMax": 1262000000,
   "subsidiPrice": null,
   "lt": [
    60,
    97.5
   ],
   "lb": [
    55,
    88
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 15,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "Whoosh Karawang 5.5 km · GT Cikarang Timur 1.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 5.5
     },
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 8.4
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 19.0
     }
    ],
    "toll": {
     "name": "GT Cikarang Timur",
     "km": 1.5
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-01",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR1920012026T001",
   "extraSources": [
    "https://www.cendana-home.com/cendana-spark/"
   ],
   "sikumbangId": "CKR1920012026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Situs developer: Cendana Spark Rp718 jt – Rp1,16 M.",
   "band": "20-30"
  },
  {
   "id": "pp-sentul-alaya",
   "name": "Sentul Alaya",
   "developer": "PT Karya Bintang Gemilang",
   "developerGroup": "Alaya",
   "lon": 106.872703,
   "lat": -6.588586,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Cijayanti",
   "distanceKm": 29.3,
   "segment": "menengah-atas",
   "type": "landed",
   "priceMin": 1304325038,
   "priceMax": 8630943676,
   "subsidiPrice": null,
   "lt": [
    62,
    462
   ],
   "lb": [
    53,
    615
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 28,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Bogor 9.1 km · GT Sentul Selatan 4.1 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bogor",
      "km": 9.1
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 24.0
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 34.1
     }
    ],
    "toll": {
     "name": "GT Sentul Selatan",
     "km": 4.1
    }
   },
   "priceAsOf": "2026-03",
   "registryUpdated": "2026-03-09",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520012021T001",
   "extraSources": [],
   "sikumbangId": "CBI0520012021T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-kota-deltamas-de-silva",
   "name": "Kota Deltamas – De Silva",
   "developer": "PT Pembangunan Deltamas (Puradelta Lestari / Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.175667,
   "lat": -6.372183,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Pusat",
   "desa": "Sukamahi",
   "distanceKm": 29.41,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 683124000,
   "priceMax": 2901705000,
   "subsidiPrice": null,
   "lt": [
    60,
    77
   ],
   "lb": [
    41,
    159
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 2,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "Whoosh Karawang 4.9 km · GT Cikarang Timur 3.6 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 4.9
     },
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 11.3
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 20.8
     }
    ],
    "toll": {
     "name": "GT Cikarang Timur",
     "km": 3.6
    }
   },
   "priceAsOf": "2025-05",
   "registryUpdated": "2025-05-02",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR2020022024T002",
   "extraSources": [],
   "sikumbangId": "CKR2020022024T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-kota-deltamas-almandine",
   "name": "Kota Deltamas – Almandine",
   "developer": "PT Puradelta Lestari Tbk (Sinar Mas Land)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.176829,
   "lat": -6.371674,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Pusat",
   "desa": "Sukamahi",
   "distanceKm": 29.52,
   "segment": "premium",
   "type": "landed",
   "priceMin": 3236710000,
   "priceMax": 4482020000,
   "subsidiPrice": null,
   "lt": [
    66.5,
    80.5
   ],
   "lb": [
    166.5,
    275
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 9,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "Whoosh Karawang 4.7 km · GT Cikarang Timur 3.5 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 4.7
     },
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 11.2
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 20.9
     }
    ],
    "toll": {
     "name": "GT Cikarang Timur",
     "km": 3.5
    }
   },
   "priceAsOf": "2025-05",
   "registryUpdated": "2025-05-26",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CKR2020022025T001",
   "extraSources": [],
   "sikumbangId": "CKR2020022025T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": null,
   "band": "20-30"
  },
  {
   "id": "pp-kota-deltamas-savasa",
   "name": "Kota Deltamas – Savasa",
   "developer": "Kota Deltamas (Sinar Mas Land; JV)",
   "developerGroup": "Sinar Mas Land",
   "lon": 107.178608,
   "lat": -6.365744,
   "kota": "Kab. Bekasi",
   "kecamatan": "Cikarang Pusat",
   "desa": "Sukamahi",
   "distanceKm": 29.62,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 978000000,
   "priceMax": null,
   "subsidiPrice": null,
   "lt": null,
   "lb": null,
   "status": "selling",
   "unitsAvailable": null,
   "kprPartners": [
    "Bank Mandiri"
   ],
   "mandiriPartner": true,
   "transit": "Whoosh Karawang 4.5 km · GT Cikarang Timur 2.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "Whoosh",
      "name": "Karawang",
      "km": 4.5
     },
     {
      "mode": "KRL",
      "name": "Lemahabang",
      "km": 10.6
     },
     {
      "mode": "LRT",
      "name": "Jatimulya",
      "km": 20.7
     }
    ],
    "toll": {
     "name": "GT Cikarang Timur",
     "km": 2.8
    }
   },
   "priceAsOf": "2026-10 (start-from di situs developer)",
   "registryUpdated": null,
   "priceSource": "Developer/berita (lihat sourceUrl)",
   "sourceUrl": "https://www.sinarmasland.com/development/township/kota-deltamas",
   "extraSources": [],
   "sikumbangId": null,
   "coordSource": "OSM way/1006815847 (centroid poligon/titik)",
   "coordNote": null,
   "confidence": "medium",
   "riskNote": null,
   "notes": "Titik = marketing gallery Savasa (perkiraan lokasi kawasan).",
   "band": "20-30"
  },
  {
   "id": "pp-sentul-city-spring-residence",
   "name": "Sentul City – Spring Residence",
   "developer": "PT Sentul City Tbk",
   "developerGroup": "Sentul City",
   "lon": 106.893015,
   "lat": -6.593905,
   "kota": "Kab. Bogor",
   "kecamatan": "Babakan Madang",
   "desa": "Bojong Koneng",
   "distanceKm": 29.63,
   "segment": "menengah",
   "type": "landed",
   "priceMin": 812960000,
   "priceMax": 3825000000,
   "subsidiPrice": null,
   "lt": [
    54,
    272
   ],
   "lb": [
    38,
    120
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 0,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Bogor 11.3 km · GT Sentul Selatan 6.3 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Bogor",
      "km": 11.3
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 24.5
     },
     {
      "mode": "MRT",
      "name": "Fatmawati Indomaret",
      "km": 35.3
     }
    ],
    "toll": {
     "name": "GT Sentul Selatan",
     "km": 6.3
    }
   },
   "priceAsOf": "2026-06",
   "registryUpdated": "2026-06-04",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI0520092026T001",
   "extraSources": [
    "https://www.metrotvnews.com/read/NQACYDpo-sentul-city-kolaborasi-garap-hunian-berkonsep-eco-city-smart-home"
   ],
   "sikumbangId": "CBI0520092026T001",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Jan 2025: mulai Rp765 jt-an (tipe 38/60 s.d. 133/196).",
   "band": "20-30"
  },
  {
   "id": "pp-grha-aryana",
   "name": "Grha Aryana",
   "developer": "PT Langit Membangun Indonesia",
   "developerGroup": "Pengembang rumah subsidi",
   "lon": 106.656136,
   "lat": -6.411924,
   "kota": "Kab. Bogor",
   "kecamatan": "Gunung Sindur",
   "desa": "Jampang",
   "distanceKm": 29.9,
   "segment": "subsidi",
   "type": "landed",
   "priceMin": 185000000,
   "priceMax": 185000000,
   "subsidiPrice": [
    185000000,
    185000000
   ],
   "lt": [
    60,
    60
   ],
   "lb": [
    30,
    30
   ],
   "status": "selling",
   "unitsAvailable": {
    "subsidi": 126,
    "komersial": 0,
    "source": "SiKumbang – unit berstatus tersedia (diakses 2026-10-12)"
   },
   "kprPartners": [],
   "mandiriPartner": null,
   "transit": "KRL Cisauk 9.9 km · GT Industri 10.8 km (jarak garis lurus)",
   "transitDetail": {
    "rail": [
     {
      "mode": "KRL",
      "name": "Cisauk",
      "km": 9.9
     },
     {
      "mode": "MRT",
      "name": "Lebak Bulus Bank Syariah Indonesia",
      "km": 18.9
     },
     {
      "mode": "LRT",
      "name": "Harjamukti",
      "km": 26.8
     }
    ],
    "toll": {
     "name": "GT Industri",
     "km": 10.8
    }
   },
   "priceAsOf": "2026-04",
   "registryUpdated": "2026-04-05",
   "priceSource": "SiKumbang – harga per tipe yang didaftarkan developer",
   "sourceUrl": "https://sikumbang.tapera.go.id/lokasi-perumahan/CBI1120062026T002",
   "extraSources": [],
   "sikumbangId": "CBI1120062026T002",
   "coordSource": "SiKumbang koordinatPerumahan (geotag developer)",
   "coordNote": null,
   "confidence": "high",
   "riskNote": null,
   "notes": "Rumah umum tapak FLPP; batas harga jual Jabodetabek Rp185 jt (Kepmen PKP 1722/KPTS/M/2026). Cek kelayakan MBR & bank penyalur di SiKasep.",
   "band": "20-30"
  }
 ]
};
