/* Mandiri KCP Jakarta Cilangkap - property market benchmarks (30 km) & lelang placeholder.
 * Generated 2026-10-12 from published aggregate sources; see meta.sources and meta.caveats.
 * Classic script: exposes window.MCD_PROPERTY_MARKET. Data stays on-device. */
window.MCD_PROPERTY_MARKET = {
 "meta": {
  "generated": "2026-10-12",
  "centre": {
   "name": "Mabes TNI Cilangkap",
   "lat": -6.32818,
   "lon": 106.91329
  },
  "radiusKm": 30,
  "currency": "IDR",
  "note": "Indicative SECONDARY-house price benchmarks for ~30 km around Mabes TNI Cilangkap, compiled from published aggregate sources only (Rumah123 Flash Reports via press, Cushman & Wakefield MarketBeat via press, Bank Indonesia SHPR, one agency article, Okezone 2024). No listing portal was scraped and no individual listing, seller or debtor data is included. Kota-level medians by building size (LB) are the most reliable numbers here; kecamatan land prices are sparse, old (2024) or asking-price samples and are flagged low confidence. Rumah123 medians are listing-based (asking) medians, not transaction prices. 'estPricePerM2LB' is a DERIVED estimate (61-90 m2 band median / 75.5 m2), useful only for colouring the map. Lelang rows are intentionally empty: see meta.lelangAccess for the manual export path.",
  "fieldGuide": {
   "pricePerM2Land": "Area-specific land price per m2 (IDR) when a published figure exists; null otherwise. See pricePerM2LandBasis/AsOf/Source.",
   "pricePerM2Building": "Not available from any published source for these areas (always null).",
   "medianHousePrice": "Overall median resale house price, only where published (Jakarta Timur, Jakarta Selatan).",
   "benchmark.medianByLB": "Rumah123 Flash Report Dec 2025 median resale price by building area band: lb_le60 (<=60 m2), lb_61_90, lb_91_150, lb_151_250, lb_ge251 (>=251 m2). Kota-level; inherited by kecamatan rows.",
   "benchmark.subMarketLandPerM2": "Cushman & Wakefield average land price for landed-residential estates per sub-market (Jakarta / Bekasi / Bogor-Depok / Tangerang), end-2025.",
   "benchmark.estPricePerM2LB": "DERIVED estimate = medianByLB.lb_61_90 / 75.5, rounded to Rp100k. Not a published figure.",
   "yoyGrowth": "Rumah123 Resale Price Index YoY % (Flash Report Aug 2026, data to Jul 2026), city-level market label.",
   "valueLevel": "Granularity of the numbers on the row (kota, kota-inherited, or kecamatan evidence + kota medians).",
   "confidence": "medium = published kota-level report; low = proxy/inherited, small asking-price samples, or unattributed/old press figures."
  },
  "marketContext": {
   "biShprJabodebekBanten": {
    "index2018eq100": 110.49,
    "yoyPct": 0.7,
    "qtqPct": 0.23,
    "period": "Q2 2026",
    "market": "primary (developer survey)",
    "source": "bi-shpr-q2-2026"
   },
   "biShprNational": {
    "index2018eq100": 110.89,
    "yoyPct": 0.69,
    "period": "Q2 2026",
    "kprShareOfPrimaryPurchasesPct": 70.05,
    "source": "bi-shpr-q2-2026"
   },
   "rumah123National": {
    "rpiYoYPct": 0.9,
    "inflationYoYPct": 2.9,
    "period": "Jul 2026",
    "secondarySupplyYoYPct": -16.4,
    "source": "r123-fr-aug2026"
   },
   "cwJabodetabekLandAvgEnd2025": {
    "perM2": 12746152,
    "yoyPct": 1.58,
    "hohPct": 0.84,
    "source": "cw-h2-2025"
   },
   "rumah123SearchShareJul2026": {
    "Tangerang": 14.7,
    "Jakarta Selatan": 12.9,
    "Jakarta Barat": 10.2,
    "source": "r123-fr-aug2026"
   }
  },
  "kprReference": {
   "note": "Reference inputs for the KPR calculator. Verify with the branch's current rate sheet before quoting to customers.",
   "marketSbdkKpr": [
    {
     "value": 9.2,
     "unit": "% p.a.",
     "what": "average KPR base lending rate (SBDK) of large banks, end-May 2026 (down from 9.27%)",
     "source": "r123-fr-jul2026"
    },
    {
     "value": 8.92,
     "unit": "% p.a.",
     "what": "estimated SBDK KPR/KPA cited in Rumah123 Flash Report Aug 2026 summary",
     "source": "r123-fr-aug2026-own",
     "caveat": "Same summary describes BI Rate as 4.75%, which conflicts with the June 2026 BI Rate hike to 5.75% reported elsewhere (Rumah123 Jul 2026 report, Bisnis 18 Jun 2026). Treat as unverified."
    }
   ],
   "mandiriKprLelang": {
    "source": [
     "mandiri-lelang",
     "mandiri-kpr-lelang-prog"
    ],
    "programValidity": "s.d. pencairan 31 Desember 2026 (ACTIVE as of 2026-10-12)",
    "financingLimitPctOfNilaiLimit": {
     "rumahTinggal": 80,
     "apartemen": 80,
     "ruko": 70
    },
    "maxCreditLimit": 15000000000,
    "fixedRates": [
     {
      "fixYears": 1,
      "ratePct": 2.6,
      "minTenorYears": 5
     },
     {
      "fixYears": 2,
      "ratePct": 3.56,
      "minTenorYears": 6
     },
     {
      "fixYears": 3,
      "ratePct": 2.66,
      "minTenorYears": 15
     },
     {
      "fixYears": 3,
      "ratePct": 3.6,
      "minTenorYears": 12
     },
     {
      "fixYears": 5,
      "ratePct": 3.4,
      "minTenorYears": 15
     }
    ],
    "tieredRates": [
     {
      "steps": [
       {
        "years": 3,
        "ratePct": 3.96
       },
       {
        "years": 3,
        "ratePct": 8.66
       },
       {
        "years": 4,
        "ratePct": 9.66
       }
      ],
      "minTenorYears": 15
     },
     {
      "steps": [
       {
        "years": 3,
        "ratePct": 4.86
       },
       {
        "years": 3,
        "ratePct": 8.86
       },
       {
        "years": 4,
        "ratePct": 9.86
       }
      ],
      "minTenorYears": 12
     }
    ],
    "floatingAfterFixPct": 13.0,
    "floatingReference": "Master Rate 739 untuk KPR",
    "caveat": "Rate table was read from the public page as rendered text; row/tenor pairing could not be confirmed visually (the page layout is a table image/HTML grid). Applies to KPR Secondary new booking via KPR Lelang for winners of Bank Mandiri Hak Tanggungan auctions only."
   }
  },
  "lelangAccess": {
   "rowsIncluded": 0,
   "why": "No permitted structured access. lelang.bankmandiri.co.id is a client-rendered Angular app with no documented public API or export (robots.txt returns 404, i.e. no rules published); extracting its internal API would be reverse-engineering, so it was not done. lelang.go.id (DJKN) reset the TLS connection from this environment on 2026-10-12 (robots.txt unreadable) and bidding requires login. The Mandiri e-booklet (bmri.id/bookletasetmandirilelang -> bit.ly/bookletnasionalmandirilelang) was not downloaded. bankmandiri.co.id robots.txt disallows *.pdf.",
   "officialChannels": [
    {
     "name": "Mandiri Lelang website",
     "url": "https://lelang.bankmandiri.co.id"
    },
    {
     "name": "Info page (channels, KPR Lelang rates)",
     "url": "https://www.bankmandiri.co.id/mandiri-lelang"
    },
    {
     "name": "E-booklet aset lelang (nasional)",
     "url": "https://bmri.id/bookletasetmandirilelang"
    },
    {
     "name": "WhatsApp MITA (official), keyword 'Lelang'",
     "url": "https://wa.me/628118414000"
    },
    {
     "name": "DJKN portal lelang (bidding via KPKNL)",
     "url": "https://lelang.go.id"
    },
    {
     "name": "KPR Lelang program terms",
     "url": "https://bmri.id/kprlelang"
    }
   ],
   "manualExportSteps": [
    "1. Open https://lelang.bankmandiri.co.id in a normal browser (no login needed to browse). Filter Provinsi = DKI Jakarta and Jawa Barat (and Banten for Tangerang Selatan); then Kota/Kabupaten = Jakarta Timur, Jakarta Selatan, Kota Depok, Kota Bekasi, Kab. Bekasi, Kab. Bogor, Kota Tangerang Selatan.",
    "2. For each lot of type Rumah/Ruko/Tanah, copy ONLY asset facts into the CSV template below: asset type, kota, kecamatan, kelurahan, LT, LB, sertifikat, nilai limit, uang jaminan, tanggal lelang, KPKNL, link lot. Do not copy debtor/owner names or any personal data.",
    "3. Cross-check each lot on lelang.go.id (search by lot code / penjual 'PT Bank Mandiri (Persero) Tbk') to confirm the auction date and nilai limit are current; drop lots whose auction date is before today.",
    "4. Leave lat/lon blank or put the kelurahan centroid; the dashboard should mark lelang points as 'approximate (kelurahan centroid)', never a house-level pin.",
    "5. Save as data/lelang-manual.csv (or paste into window.MCD_PROPERTY_MARKET.lelang) and refresh weekly; record the export date in meta."
   ],
   "csvTemplateHeader": "id,assetType,kota,kecamatan,kelurahan,lat,lon,geoPrecision,LT,LB,certificate,limitPrice,uangJaminan,auctionDate,kpknl,auctionLotUrl,exportedOn,notes",
   "privacyRule": "Never record debtor/owner names, phone numbers, NIK or full street addresses with house numbers. Kelurahan-level location only."
  },
  "caveats": [
   "No published kecamatan-level SECONDARY house medians were found for 2025-2026; kecamatan rows inherit kota medians unless noted.",
   "Rumah123 figures are medians of listings on Rumah123/99.co (asking prices), not transaction prices.",
   "Okezone Jan 2024 kecamatan land averages do not name their data source and are ~2.7 years old.",
   "Brighton Jun 2026 figures are a handful of asking prices from one agency's own listings; used as indicative medians only.",
   "Brighton's headline claim that Jakarta Timur land averages Rp30-45 juta/m2 was NOT used: it conflicts with C&W's end-2025 Jakarta average (Rp16,2 juta/m2) and with the article's own sample prices (Rp5-24 juta/m2).",
   "C&W land averages describe landed-residential estates (mostly developer projects), not village/kampung plots.",
   "Rumah123 'Bekasi', 'Bogor' and 'Tangerang' market labels may combine Kota and Kabupaten; Tangerang Selatan has no separate figure.",
   "Kota Bekasi kecamatan, Cimanggis, Sukmajaya, Cilodong, Tambun Selatan and Cikarang Barat centroids are means of kelurahan/desa centroids from OSM (no kecamatan polygon in OSM); accurate to ~1-2 km.",
   "BPN Zona Nilai Tanah (bhumi.atrbpn.go.id) and DKI NJOP (Kepgub NJOP via jdih.jakarta.go.id) are official per-zone references the branch can check manually; Bhumi requires accepting terms of use, so it was not queried."
  ],
  "sources": [
   {
    "id": "r123-fr-dec2025",
    "title": "Rumah123 Flash Report Desember 2025 - median harga rumah seken per kota per luas bangunan (via detikProperti, 16 Des 2025)",
    "url": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
    "asOf": "2025-12",
    "type": "listing-portal market report (press)"
   },
   {
    "id": "r123-fr-aug2026",
    "title": "Rumah123 Flash Report Agustus 2026 - Resale Price Index YoY per kota (data s.d. Juli 2026)",
    "url": "https://www.industry.co.id/read/154897/harga-rumah-sekunder-kalah-dari-inflasi-minat-pembeli-mulai-geser-ke-pusat-kota",
    "asOf": "2026-07",
    "type": "listing-portal market report (press)"
   },
   {
    "id": "r123-fr-aug2026-own",
    "title": "Rumah123 panduan-properti: ringkasan Flash Report Agustus 2026",
    "url": "https://www.rumah123.com/panduan-properti/?p=204196",
    "asOf": "2026-07",
    "type": "listing-portal market report"
   },
   {
    "id": "r123-fr-jul2026",
    "title": "Rumah123 Flash Report Juli 2026 (data Juni 2026) - YoY per kota, SBDK KPR bank besar",
    "url": "https://www.industry.co.id/read/153485/harga-rumah-nasional-hanya-naik-11-pasar-properti-sekunder-makin-terbelah-pada-semester-i-2026",
    "asOf": "2026-06",
    "type": "listing-portal market report (press)"
   },
   {
    "id": "r123-jaktim-median-q1-2026",
    "title": "Medcom 11 Mar 2026: data internal Rumah123 - median rumah seken Jakarta Selatan ~Rp9 M, Jakarta Timur ~Rp2,65 M",
    "url": "https://www.medcom.id/properti/news-properti/3NOxn9pb-harga-rumah-jakarta-makin-jomplang-jaksel-tembus-rp9-miliar",
    "asOf": "2026-03",
    "type": "listing-portal data (press)"
   },
   {
    "id": "r123-sub1b-2025",
    "title": "Databoks 7 Agu 2025: riset Rumah123 - rata-rata harga rumah seken < Rp1 M per wilayah Jakarta (2025)",
    "url": "https://databoks.katadata.co.id/en/property/statistics/689427186b145/these-are-jakarta-areas-with-average-house-prices-below-rp1-billion",
    "asOf": "2025-08",
    "type": "listing-portal research (press)"
   },
   {
    "id": "r123-depok-sep2025",
    "title": "IDX Channel 2 Okt 2025: Rumah123 Flash Report Sep 2025 - Depok RPI +3,8% YoY, pangsa minat per kecamatan",
    "url": "https://www.idxchannel.com/economics/harga-rumah-seken-di-depok-naik-38-persen-meski-permintaan-fluktuatif/all",
    "asOf": "2025-09",
    "type": "listing-portal market report (press)"
   },
   {
    "id": "r123-bekasi-hotspot-aug2025",
    "title": "detikProperti 8 Agu 2025: Rumah123 - 10 kecamatan paling dicari di Bekasi; Leads - rata-rata harga per unit",
    "url": "https://www.detik.com/properti/berita/d-8051084/harga-rumah-di-bekasi-lebih-murah-dari-tangerang-ini-lokasi-paling-dilirik",
    "asOf": "2025-08",
    "type": "listing-portal data + consultant (press)"
   },
   {
    "id": "cw-h2-2025",
    "title": "Cushman & Wakefield MarketBeat (akhir 2025) - rata-rata harga tanah rumah tapak per sub-pasar (via detikProperti, 8 Feb 2026)",
    "url": "https://www.detik.com/properti/berita/d-8346219/harga-tanah-di-jakarta-makin-mahal-rata-rata-tembus-rp-16-juta-meter",
    "asOf": "2025-12",
    "type": "consultant report (press)"
   },
   {
    "id": "cw-h2-2024",
    "title": "Cushman & Wakefield MarketBeat Greater Jakarta Landed Residential H2 2024 (via detikProperti, 3 Feb 2025)",
    "url": "https://www.detik.com/properti/berita/d-7761094/tanah-di-jakarta-makin-mahal-nyaris-rp-16-juta-meter",
    "asOf": "2024-12",
    "type": "consultant report (press)"
   },
   {
    "id": "bi-shpr-q2-2026",
    "title": "Bank Indonesia - Survei Harga Properti Residensial Triwulan II 2026 (pasar primer), Lampiran Tabel 2-3 kota Jabodebek-Banten",
    "url": "https://www.bi.go.id/id/publikasi/laporan/Documents/SHPR_Tw_II_2026.pdf",
    "asOf": "2026-06",
    "type": "central bank survey"
   },
   {
    "id": "okezone-bekasi-2024",
    "title": "Okezone 30 Jan 2024: Berapa harga tanah per meter di Bekasi (rata-rata per kecamatan; sumber data tidak disebut)",
    "url": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
    "asOf": "2024-01",
    "type": "press (unattributed data)"
   },
   {
    "id": "okezone-depok-2024",
    "title": "Okezone 30 Jan 2024: Berapa harga tanah per meter di Depok (rata-rata per kecamatan; sumber data tidak disebut)",
    "url": "https://economy.okezone.com/read/2024/01/30/470/2962654/berapa-harga-tanah-per-meter-di-depok?page=all",
    "asOf": "2024-01",
    "type": "press (unattributed data)"
   },
   {
    "id": "brighton-jaktim-jun2026",
    "title": "Brighton (agen properti), artikel 24 Jun 2026: Harga tanah per meter Jakarta Timur - contoh harga tawar per lokasi",
    "url": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
    "asOf": "2026-06",
    "type": "agency article (asking prices)"
   },
   {
    "id": "mandiri-lelang",
    "title": "Bank Mandiri - Mandiri Lelang (kanal informasi aset lelang, tabel bunga KPR Lelang)",
    "url": "https://www.bankmandiri.co.id/mandiri-lelang",
    "asOf": "2026-10-12",
    "type": "bank official"
   },
   {
    "id": "mandiri-kpr-lelang-prog",
    "title": "Bank Mandiri - Program Marketing KPR Lelang Reguler (berlaku s.d. pencairan 31 Des 2026)",
    "url": "https://bankmandiri.co.id/web/guest/program-marketing-kpr-lelang-reguler",
    "asOf": "2026-10-12",
    "type": "bank official"
   },
   {
    "id": "bisnis-bi-rate-jun2026",
    "title": "Bisnis 18 Jun 2026: BI Rate naik ke 5,75% (RDG 17-18 Juni 2026)",
    "url": "https://ekonomi.bisnis.com/read/20260618/47/1981731/bi-rate-naik-greenwoods-jaga-harga-jual-rumah",
    "asOf": "2026-06-18",
    "type": "press"
   },
   {
    "id": "osm-nominatim",
    "title": "OpenStreetMap Nominatim / Overpass - centroid wilayah administrasi (ODbL)",
    "url": "https://nominatim.openstreetmap.org/",
    "asOf": "2026-10-12",
    "type": "geocoding"
   }
  ]
 },
 "areas": [
  {
   "id": "kota-jaktim",
   "name": "Jakarta Timur",
   "level": "kota",
   "kota": "Jakarta Timur",
   "lat": -6.26289,
   "lon": 106.88223,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 8.0,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": 2650000000,
   "medianHousePriceBasis": "Rumah123 internal data, overall median resale house, Q1 2026",
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null,
    "avgPriceResaleUnder1B_2025": 646410256
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025",
    "r123-jaktim-median-q1-2026",
    "r123-sub1b-2025"
   ]
  },
  {
   "id": "kota-jaksel",
   "name": "Jakarta Selatan",
   "level": "kota",
   "kota": "Jakarta Selatan",
   "lat": -6.28387,
   "lon": 106.80483,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.0,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": 9000000000,
   "medianHousePriceBasis": "Rumah123 internal data, overall median resale house, Q1 2026",
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Jakarta Selatan",
    "medianByLB": {
     "lb_le60": 900000000,
     "lb_61_90": 1500000000,
     "lb_91_150": 2500000000,
     "lb_151_250": 4500000000,
     "lb_ge251": 15000000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 19900000,
    "kotaNote": null,
    "avgPriceResaleUnder1B_2025": 680526316
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025",
    "r123-jaktim-median-q1-2026",
    "r123-sub1b-2025"
   ]
  },
  {
   "id": "kota-jakpus",
   "name": "Jakarta Pusat",
   "level": "kota",
   "kota": "Jakarta Pusat",
   "lat": -6.18234,
   "lon": 106.84287,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 18.0,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Jakarta Pusat",
    "medianByLB": {
     "lb_le60": 700000000,
     "lb_61_90": 1500000000,
     "lb_91_150": 2800000000,
     "lb_151_250": 4700000000,
     "lb_ge251": 21000000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 19900000,
    "kotaNote": null,
    "avgPriceResaleUnder1B_2025": 690853659
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025",
    "r123-sub1b-2025"
   ]
  },
  {
   "id": "kota-jakut",
   "name": "Jakarta Utara",
   "level": "kota",
   "kota": "Jakarta Utara",
   "lat": -6.1352,
   "lon": 106.89349,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 21.6,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Jakarta Utara",
    "medianByLB": {
     "lb_le60": 1600000000,
     "lb_61_90": 1800000000,
     "lb_91_150": 2800000000,
     "lb_151_250": 4100000000,
     "lb_ge251": 9500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 23800000,
    "kotaNote": null,
    "avgPriceResaleUnder1B_2025": 757222222
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025",
    "r123-sub1b-2025"
   ]
  },
  {
   "id": "kota-jakbar",
   "name": "Jakarta Barat",
   "level": "kota",
   "kota": "Jakarta Barat",
   "lat": -6.16157,
   "lon": 106.74389,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 26.3,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Jakarta Barat",
    "medianByLB": {
     "lb_le60": 1200000000,
     "lb_61_90": 1600000000,
     "lb_91_150": 2200000000,
     "lb_151_250": 3100000000,
     "lb_ge251": 6900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 21200000,
    "kotaNote": null,
    "avgPriceResaleUnder1B_2025": 759565574
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025",
    "r123-sub1b-2025"
   ]
  },
  {
   "id": "kota-depok",
   "name": "Kota Depok",
   "level": "kota",
   "kota": "Kota Depok",
   "lat": -6.40719,
   "lon": 106.81584,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.9,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kota-bekasi",
   "name": "Kota Bekasi",
   "level": "kota",
   "kota": "Kota Bekasi",
   "lat": -6.23499,
   "lon": 106.99454,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.7,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "medium",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kab-bekasi",
   "name": "Kabupaten Bekasi",
   "level": "kota",
   "kota": "Kabupaten Bekasi",
   "lat": -6.20279,
   "lon": 107.16492,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 31.1,
   "centroidWithin30km": false,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 publishes one 'Bekasi' figure; applied to Kab. Bekasi as proxy (Cikarang/Tambun usually cheaper than Kota Bekasi)."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "Regency centroid lies outside 30 km, but its western part (Tambun-Setu-Cibitung-Cikarang Barat) is inside; use kecamatan rows."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kab-bogor",
   "name": "Kabupaten Bogor",
   "level": "kota",
   "kota": "Kabupaten Bogor",
   "lat": -6.54539,
   "lon": 107.00178,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 26.1,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kota-tangsel",
   "name": "Kota Tangerang Selatan",
   "level": "kota",
   "kota": "Kota Tangerang Selatan",
   "lat": -6.3227,
   "lon": 106.70857,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 22.6,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 1.1,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota",
   "benchmark": {
    "rumah123Market": "Tangerang",
    "medianByLB": {
     "lb_le60": 870000000,
     "lb_61_90": 1400000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3500000000,
     "lb_ge251": 6900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 1.1,
    "yoyGrowthMarket": "Tangerang",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.1,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 14824953,
    "subMarket": "Tangerang",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": -0.96,
    "estPricePerM2LB": 18500000,
    "kotaNote": "No separate Tangerang Selatan figure found; Rumah123 'Tangerang' and C&W 'Tangerang' sub-market used as proxy."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-cipayung",
   "name": "Cipayung",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.3294,
   "lon": 106.90374,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 1.1,
   "centroidWithin30km": true,
   "pricePerM2Land": 7780000,
   "pricePerM2LandBasis": "median of 6 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp6.500.000-13.920.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Jl. Gempol Raya, Ceger",
     "askingPricePerM2Land": 8000000,
     "kecamatanInferred": false
    },
    {
     "location": "Jl. Dalang, Cipayung",
     "askingPricePerM2Land": 7560000,
     "kecamatanInferred": false
    },
    {
     "location": "Munjul, Cipayung",
     "askingPricePerM2Land": 7020000,
     "kecamatanInferred": false
    },
    {
     "location": "Cipayung",
     "askingPricePerM2Land": 9500000,
     "kecamatanInferred": false
    },
    {
     "location": "Jl. Mini Bambu, Bambu Apus",
     "askingPricePerM2Land": 13920000,
     "kecamatanInferred": true
    },
    {
     "location": "Cilangkap",
     "askingPricePerM2Land": 6500000,
     "kecamatanInferred": true
    }
   ],
   "demand": {},
   "notes": [
    "Some sample locations were assigned to this kecamatan by street/kelurahan name (kecamatanInferred=true)."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-ciracas",
   "name": "Ciracas",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.32963,
   "lon": 106.8766,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 4.1,
   "centroidWithin30km": true,
   "pricePerM2Land": 6000000,
   "pricePerM2LandBasis": "median of 3 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp5.000.000-15.000.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Ciracas, Cibubur",
     "askingPricePerM2Land": 6000000,
     "kecamatanInferred": false
    },
    {
     "location": "Ciracas",
     "askingPricePerM2Land": 5000000,
     "kecamatanInferred": false
    },
    {
     "location": "Jl. Raya Jambore, Cibubur",
     "askingPricePerM2Land": 15000000,
     "kecamatanInferred": true
    }
   ],
   "demand": {},
   "notes": [
    "Some sample locations were assigned to this kecamatan by street/kelurahan name (kecamatanInferred=true)."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-pasarrebo",
   "name": "Pasar Rebo",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.32497,
   "lon": 106.85338,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 6.6,
   "centroidWithin30km": true,
   "pricePerM2Land": 7900000,
   "pricePerM2LandBasis": "median of 1 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp7.900.000-7.900.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Kowilhan, Pasar Rebo (hook)",
     "askingPricePerM2Land": 7900000,
     "kecamatanInferred": false
    }
   ],
   "demand": {},
   "notes": [
    "Only 1 sample(s): indicative, not representative."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-kramatjati",
   "name": "Kramat Jati",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.27491,
   "lon": 106.86249,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 8.2,
   "centroidWithin30km": true,
   "pricePerM2Land": 8750000,
   "pricePerM2LandBasis": "median of 1 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp8.750.000-8.750.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Jl. Mayjend Sutoyo, Cawang",
     "askingPricePerM2Land": 8750000,
     "kecamatanInferred": true
    }
   ],
   "demand": {},
   "notes": [
    "Some sample locations were assigned to this kecamatan by street/kelurahan name (kecamatanInferred=true).",
    "Only 1 sample(s): indicative, not representative."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-makasar",
   "name": "Makasar",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.26959,
   "lon": 106.8887,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 7.1,
   "centroidWithin30km": true,
   "pricePerM2Land": 13010000,
   "pricePerM2LandBasis": "median of 1 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp13.010.000-13.010.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Jl. Kerja Bakti, Makasar",
     "askingPricePerM2Land": 13010000,
     "kecamatanInferred": false
    }
   ],
   "demand": {},
   "notes": [
    "Only 1 sample(s): indicative, not representative."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-jatinegara",
   "name": "Jatinegara",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.22915,
   "lon": 106.87742,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 11.7,
   "centroidWithin30km": true,
   "pricePerM2Land": 15780000,
   "pricePerM2LandBasis": "median of 1 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp15.780.000-15.780.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Cawang Baru",
     "askingPricePerM2Land": 15780000,
     "kecamatanInferred": true
    }
   ],
   "demand": {},
   "notes": [
    "Some sample locations were assigned to this kecamatan by street/kelurahan name (kecamatanInferred=true).",
    "Only 1 sample(s): indicative, not representative."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-durensawit",
   "name": "Duren Sawit",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.23414,
   "lon": 106.91925,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 10.5,
   "centroidWithin30km": true,
   "pricePerM2Land": 13000000,
   "pricePerM2LandBasis": "median of 3 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp5.000.000-24.000.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Jl. Rawa Domba, Duren Sawit",
     "askingPricePerM2Land": 13000000,
     "kecamatanInferred": false
    },
    {
     "location": "Duren Sawit",
     "askingPricePerM2Land": 5000000,
     "kecamatanInferred": false
    },
    {
     "location": "Jl. Raden Inten Raya (main-road frontage)",
     "askingPricePerM2Land": 24000000,
     "kecamatanInferred": true
    }
   ],
   "demand": {},
   "notes": [
    "Some sample locations were assigned to this kecamatan by street/kelurahan name (kecamatanInferred=true)."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-cakung",
   "name": "Cakung",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.18556,
   "lon": 106.94011,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 16.1,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-pulogadung",
   "name": "Pulo Gadung",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.19111,
   "lon": 106.89061,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 15.4,
   "centroidWithin30km": true,
   "pricePerM2Land": 18785000,
   "pricePerM2LandBasis": "median of 4 asking-price samples (land per m2) quoted in a Brighton agency article; range Rp12.650.000-20.000.000; not transaction prices",
   "pricePerM2LandAsOf": "2026-06",
   "pricePerM2LandSource": "brighton-jaktim-jun2026",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2026-06",
   "sourceUrl": "https://www.brighton.co.id/about/articles-all/harga-tanah-per-meter-jakarta-timur-mulai-dari-4-juta-rupiah",
   "confidence": "low",
   "valueLevel": "kecamatan (asking-price samples) + kota medians",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [
    {
     "location": "Rawamangun (bangunan tua)",
     "askingPricePerM2Land": 18880000,
     "kecamatanInferred": true
    },
    {
     "location": "Rawamangun (kompleks)",
     "askingPricePerM2Land": 20000000,
     "kecamatanInferred": true
    },
    {
     "location": "Rawamangun (hook)",
     "askingPricePerM2Land": 18690000,
     "kecamatanInferred": true
    },
    {
     "location": "Kayu Jati",
     "askingPricePerM2Land": 12650000,
     "kecamatanInferred": true
    }
   ],
   "demand": {},
   "notes": [
    "Some sample locations were assigned to this kecamatan by street/kelurahan name (kecamatanInferred=true)."
   ],
   "sources": [
    "brighton-jaktim-jun2026",
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "jt-matraman",
   "name": "Matraman",
   "level": "kecamatan",
   "kota": "Jakarta Timur",
   "lat": -6.20362,
   "lon": 106.86458,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 14.9,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Jakarta Timur",
    "medianByLB": {
     "lb_le60": 672000000,
     "lb_61_90": 1300000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3000000000,
     "lb_ge251": 5900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 17200000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "js-jagakarsa",
   "name": "Jagakarsa",
   "level": "kecamatan",
   "kota": "Jakarta Selatan",
   "lat": -6.3301,
   "lon": 106.82224,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 10.1,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Jakarta Selatan",
    "medianByLB": {
     "lb_le60": 900000000,
     "lb_61_90": 1500000000,
     "lb_91_150": 2500000000,
     "lb_151_250": 4500000000,
     "lb_ge251": 15000000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 19900000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average).",
    "Okezone's Jan 2024 Depok article lists 'Cilandak' and 'Jagakarsa' figures, but these are Jakarta Selatan kecamatan; those figures were NOT applied here."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "js-pasarminggu",
   "name": "Pasar Minggu",
   "level": "kecamatan",
   "kota": "Jakarta Selatan",
   "lat": -6.29195,
   "lon": 106.82783,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 10.3,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Jakarta Selatan",
    "medianByLB": {
     "lb_le60": 900000000,
     "lb_61_90": 1500000000,
     "lb_91_150": 2500000000,
     "lb_151_250": 4500000000,
     "lb_ge251": 15000000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 19900000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "js-cilandak",
   "name": "Cilandak",
   "level": "kecamatan",
   "kota": "Jakarta Selatan",
   "lat": -6.2898,
   "lon": 106.79693,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.5,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Jakarta Selatan",
    "medianByLB": {
     "lb_le60": 900000000,
     "lb_61_90": 1500000000,
     "lb_91_150": 2500000000,
     "lb_151_250": 4500000000,
     "lb_ge251": 15000000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 19900000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average).",
    "Okezone's Jan 2024 Depok article lists 'Cilandak' and 'Jagakarsa' figures, but these are Jakarta Selatan kecamatan; those figures were NOT applied here."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "js-tebet",
   "name": "Tebet",
   "level": "kecamatan",
   "kota": "Jakarta Selatan",
   "lat": -6.22554,
   "lon": 106.84953,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.4,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 0.4,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Jakarta Selatan",
    "medianByLB": {
     "lb_le60": 900000000,
     "lb_61_90": 1500000000,
     "lb_91_150": 2500000000,
     "lb_151_250": 4500000000,
     "lb_ge251": 15000000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 0.4,
    "yoyGrowthMarket": "Jakarta",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 0.3,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 16224082,
    "subMarket": "Jakarta",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.6,
    "estPricePerM2LB": 19900000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-beji",
   "name": "Beji",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.37258,
   "lon": 106.81839,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 11.6,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 11.2,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-pancoranmas",
   "name": "Pancoran Mas",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.39697,
   "lon": 106.80146,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 14.5,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 8.6,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "Okezone (Jan 2024) cites a highest observed price of Rp16,3 juta/m2 in Pancoran Mas (a maximum, not an average); not used as a value.",
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-depok-2024",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-cipayung",
   "name": "Cipayung (Depok)",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.43172,
   "lon": 106.80252,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 16.8,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-sukmajaya",
   "name": "Sukmajaya",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.39385,
   "lon": 106.84673,
   "geoMethod": "mean-of-kelurahan-centroids (6/6, OSM Overpass)",
   "distanceKm": 10.4,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 7.2,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-cilodong",
   "name": "Cilodong",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.43172,
   "lon": 106.84197,
   "geoMethod": "mean-of-kelurahan-centroids (4/5, OSM Overpass)",
   "distanceKm": 14.0,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 6.4,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-cimanggis",
   "name": "Cimanggis",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.37001,
   "lon": 106.86344,
   "geoMethod": "mean-of-kelurahan-centroids (6/6, OSM Overpass)",
   "distanceKm": 7.2,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 12.8,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "Okezone (Jan 2024) mentions a 'median Rp12 juta/m2' for Cimanggis but the sentence is ambiguous; not used as a value.",
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-depok-2024",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-tapos",
   "name": "Tapos",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.42139,
   "lon": 106.87831,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 11.1,
   "centroidWithin30km": true,
   "pricePerM2Land": 4361351,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-depok-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962654/berapa-harga-tanah-per-meter-di-depok?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 3.2,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-depok-2024",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-sawangan",
   "name": "Sawangan",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.40019,
   "lon": 106.76372,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 18.4,
   "centroidWithin30km": true,
   "pricePerM2Land": 3755822,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-depok-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962654/berapa-harga-tanah-per-meter-di-depok?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 15.8,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-depok-2024",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-bojongsari",
   "name": "Bojongsari",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.39966,
   "lon": 106.74062,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 20.7,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-limo",
   "name": "Limo",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.36613,
   "lon": 106.78234,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 15.1,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 4.5,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "dp-cinere",
   "name": "Cinere",
   "level": "kecamatan",
   "kota": "Kota Depok",
   "lat": -6.33251,
   "lon": 106.78925,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.7,
   "centroidWithin30km": true,
   "pricePerM2Land": 7560833,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-depok-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962654/berapa-harga-tanah-per-meter-di-depok?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Depok",
    "medianByLB": {
     "lb_le60": 573000000,
     "lb_61_90": 940000000,
     "lb_91_150": 1400000000,
     "lb_151_250": 2600000000,
     "lb_ge251": 5500000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Depok",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.7,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 12500000,
    "kotaNote": null
   },
   "listingSamples": [],
   "demand": {
    "rumah123BuyerInterestSharePct": 16.3,
    "rumah123BuyerInterestAsOf": "2025-09 (share of Depok buyer interest by kecamatan)"
   },
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-depok-2024",
    "r123-depok-sep2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-bekasibarat",
   "name": "Bekasi Barat",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.23942,
   "lon": 106.96535,
   "geoMethod": "mean-of-kelurahan-centroids (4/5)",
   "distanceKm": 11.4,
   "centroidWithin30km": true,
   "pricePerM2Land": 6321771,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-bekasi-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 6,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-bekasi-2024",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-bekasitimur",
   "name": "Bekasi Timur",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.241,
   "lon": 107.02483,
   "geoMethod": "mean-of-kelurahan-centroids (4/4)",
   "distanceKm": 15.7,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 8,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-bekasiutara",
   "name": "Bekasi Utara",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.20289,
   "lon": 107.01217,
   "geoMethod": "mean-of-kelurahan-centroids (5/6)",
   "distanceKm": 17.7,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 3,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-bekasiselatan",
   "name": "Bekasi Selatan",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.24943,
   "lon": 106.98594,
   "geoMethod": "mean-of-kelurahan-centroids (3/5)",
   "distanceKm": 11.9,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 1,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-medansatria",
   "name": "Medan Satria",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.1896,
   "lon": 106.98318,
   "geoMethod": "mean-of-kelurahan-centroids (2/4)",
   "distanceKm": 17.2,
   "centroidWithin30km": true,
   "pricePerM2Land": 7086383,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-bekasi-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 4,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-bekasi-2024",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-rawalumbu",
   "name": "Rawalumbu",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.2794,
   "lon": 106.99683,
   "geoMethod": "mean-of-kelurahan-centroids (4/4)",
   "distanceKm": 10.7,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 9,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-pondokgede",
   "name": "Pondok Gede",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.27009,
   "lon": 106.92257,
   "geoMethod": "mean-of-kelurahan-centroids (4/5)",
   "distanceKm": 6.5,
   "centroidWithin30km": true,
   "pricePerM2Land": 6619811,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-bekasi-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 2,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-bekasi-2024",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-pondokmelati",
   "name": "Pondok Melati",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.3107,
   "lon": 106.92892,
   "geoMethod": "mean-of-kelurahan-centroids (3/4)",
   "distanceKm": 2.6,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 10,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-jatiasih",
   "name": "Jatiasih",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.30545,
   "lon": 106.95099,
   "geoMethod": "mean-of-kelurahan-centroids (6/6)",
   "distanceKm": 4.9,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 5,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-jatisampurna",
   "name": "Jatisampurna",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.3582,
   "lon": 106.92769,
   "geoMethod": "mean-of-kelurahan-centroids (3/5)",
   "distanceKm": 3.7,
   "centroidWithin30km": true,
   "pricePerM2Land": 4035211,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-bekasi-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-bekasi-2024",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-mustikajaya",
   "name": "Mustika Jaya",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.30855,
   "lon": 107.02141,
   "geoMethod": "mean-of-kelurahan-centroids (4/4)",
   "distanceKm": 12.1,
   "centroidWithin30km": true,
   "pricePerM2Land": 3255011,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-bekasi-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-bekasi-2024",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bk-bantargebang",
   "name": "Bantar Gebang",
   "level": "kecamatan",
   "kota": "Kota Bekasi",
   "lat": -6.34036,
   "lon": 106.99009,
   "geoMethod": "mean-of-kelurahan-centroids (4/4)",
   "distanceKm": 8.6,
   "centroidWithin30km": true,
   "pricePerM2Land": 3425074,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-bekasi-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962585/berapa-harga-tanah-per-meter-di-bekasi?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 'Bekasi' market label; may combine Kota & Kab. Bekasi."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value.",
    "Okezone notes much lower plots (Rp107k-308k/m2) near the TPST waste site; average shown."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-bekasi-2024",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kb-tambunselatan",
   "name": "Tambun Selatan",
   "level": "kecamatan",
   "kota": "Kabupaten Bekasi",
   "lat": -6.25575,
   "lon": 107.05532,
   "geoMethod": "mean-of-desa-centroids (7/10)",
   "distanceKm": 17.6,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 publishes one 'Bekasi' figure; applied to Kab. Bekasi as proxy (Cikarang/Tambun usually cheaper than Kota Bekasi)."
   },
   "listingSamples": [],
   "demand": {
    "rumah123BekasiHotspotRank": 7,
    "rumah123BekasiHotspotAsOf": "2025-08 (top-10 most-sought areas in Bekasi)"
   },
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-bekasi-hotspot-aug2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kb-setu",
   "name": "Setu (Kab. Bekasi)",
   "level": "kecamatan",
   "kota": "Kabupaten Bekasi",
   "lat": -6.33657,
   "lon": 107.04214,
   "geoMethod": "nominatim-place-node",
   "distanceKm": 14.3,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 publishes one 'Bekasi' figure; applied to Kab. Bekasi as proxy (Cikarang/Tambun usually cheaper than Kota Bekasi)."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kb-cibitung",
   "name": "Cibitung",
   "level": "kecamatan",
   "kota": "Kabupaten Bekasi",
   "lat": -6.26284,
   "lon": 107.0856,
   "geoMethod": "nominatim-place-node",
   "distanceKm": 20.4,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 publishes one 'Bekasi' figure; applied to Kab. Bekasi as proxy (Cikarang/Tambun usually cheaper than Kota Bekasi)."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "kb-cikarangbarat",
   "name": "Cikarang Barat",
   "level": "kecamatan",
   "kota": "Kabupaten Bekasi",
   "lat": -6.28626,
   "lon": 107.10055,
   "geoMethod": "mean-of-desa-centroids (8/11)",
   "distanceKm": 21.2,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 2.3,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bekasi",
    "medianByLB": {
     "lb_le60": 580000000,
     "lb_61_90": 950000000,
     "lb_91_150": 1300000000,
     "lb_151_250": 2200000000,
     "lb_ge251": 3900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 2.3,
    "yoyGrowthMarket": "Bekasi",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 2.9,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 10985202,
    "subMarket": "Bekasi",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.01,
    "estPricePerM2LB": 12600000,
    "kotaNote": "Rumah123 publishes one 'Bekasi' figure; applied to Kab. Bekasi as proxy (Cikarang/Tambun usually cheaper than Kota Bekasi)."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bg-gunungputri",
   "name": "Gunung Putri",
   "level": "kecamatan",
   "kota": "Kabupaten Bogor",
   "lat": -6.39246,
   "lon": 106.93472,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 7.5,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bg-cileungsi",
   "name": "Cileungsi",
   "level": "kecamatan",
   "kota": "Kabupaten Bogor",
   "lat": -6.40705,
   "lon": 107.00309,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 13.2,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bg-cibinong",
   "name": "Cibinong",
   "level": "kecamatan",
   "kota": "Kabupaten Bogor",
   "lat": -6.48063,
   "lon": 106.83376,
   "geoMethod": "osm-admin-label-node",
   "distanceKm": 19.1,
   "centroidWithin30km": true,
   "pricePerM2Land": 4300000,
   "pricePerM2LandBasis": "average land price per m2 by kecamatan published by Okezone (Jan 2024); underlying data source not named",
   "pricePerM2LandAsOf": "2024-01",
   "pricePerM2LandSource": "okezone-depok-2024",
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2024-01",
   "sourceUrl": "https://economy.okezone.com/read/2024/01/30/470/2962654/berapa-harga-tanah-per-meter-di-depok?page=all",
   "confidence": "low",
   "valueLevel": "kecamatan (press average, 2024) + kota medians",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "2024 figure, ~2.7 years old as of 2026-10-12. For context, C&W sub-market averages moved +1.0% (Bekasi) and +1.7% (Bogor-Depok) from Q4 2024 to end-2025 (derived); not applied to this value.",
    "Figure appears in Okezone's Depok article although Cibinong is in Kab. Bogor; treat with extra caution."
   ],
   "sources": [
    "cw-h2-2025",
    "okezone-depok-2024",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bg-citeureup",
   "name": "Citeureup",
   "level": "kecamatan",
   "kota": "Kabupaten Bogor",
   "lat": -6.51958,
   "lon": 106.89284,
   "geoMethod": "osm-admin-label-node",
   "distanceKm": 21.4,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bg-bojonggede",
   "name": "Bojonggede",
   "level": "kecamatan",
   "kota": "Kabupaten Bogor",
   "lat": -6.4772,
   "lon": 106.78946,
   "geoMethod": "overpass-relation-center",
   "distanceKm": 21.5,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "bg-babakanmadang",
   "name": "Babakan Madang (Sentul)",
   "level": "kecamatan",
   "kota": "Kabupaten Bogor",
   "lat": -6.57943,
   "lon": 106.89262,
   "geoMethod": "osm-admin-label-node",
   "distanceKm": 28.0,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 3.7,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Bogor",
    "medianByLB": {
     "lb_le60": 490000000,
     "lb_61_90": 900000000,
     "lb_91_150": 1600000000,
     "lb_151_250": 2500000000,
     "lb_ge251": 5300000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 3.7,
    "yoyGrowthMarket": "Bogor",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 4.4,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 8950369,
    "subMarket": "Bogor-Depok",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": 1.73,
    "estPricePerM2LB": 11900000,
    "kotaNote": "Rumah123 'Bogor' market label; may combine Kota & Kab. Bogor."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average).",
    "Edge of the 30 km radius (Sentul City area)."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "ts-pamulang",
   "name": "Pamulang",
   "level": "kecamatan",
   "kota": "Kota Tangerang Selatan",
   "lat": -6.3333,
   "lon": 106.72267,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 21.1,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 1.1,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Tangerang",
    "medianByLB": {
     "lb_le60": 870000000,
     "lb_61_90": 1400000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3500000000,
     "lb_ge251": 6900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 1.1,
    "yoyGrowthMarket": "Tangerang",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.1,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 14824953,
    "subMarket": "Tangerang",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": -0.96,
    "estPricePerM2LB": 18500000,
    "kotaNote": "No separate Tangerang Selatan figure found; Rumah123 'Tangerang' and C&W 'Tangerang' sub-market used as proxy."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average).",
    "Tangerang Selatan proxied by Rumah123 'Tangerang' and C&W 'Tangerang' sub-market."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "ts-ciputat",
   "name": "Ciputat",
   "level": "kecamatan",
   "kota": "Kota Tangerang Selatan",
   "lat": -6.31108,
   "lon": 106.71841,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 21.6,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 1.1,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Tangerang",
    "medianByLB": {
     "lb_le60": 870000000,
     "lb_61_90": 1400000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3500000000,
     "lb_ge251": 6900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 1.1,
    "yoyGrowthMarket": "Tangerang",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.1,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 14824953,
    "subMarket": "Tangerang",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": -0.96,
    "estPricePerM2LB": 18500000,
    "kotaNote": "No separate Tangerang Selatan figure found; Rumah123 'Tangerang' and C&W 'Tangerang' sub-market used as proxy."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average).",
    "Tangerang Selatan proxied by Rumah123 'Tangerang' and C&W 'Tangerang' sub-market."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  },
  {
   "id": "ts-pondokaren",
   "name": "Pondok Aren",
   "level": "kecamatan",
   "kota": "Kota Tangerang Selatan",
   "lat": -6.26652,
   "lon": 106.71499,
   "geoMethod": "nominatim-boundary",
   "distanceKm": 23.0,
   "centroidWithin30km": true,
   "pricePerM2Land": null,
   "pricePerM2LandBasis": null,
   "pricePerM2LandAsOf": null,
   "pricePerM2LandSource": null,
   "pricePerM2Building": null,
   "medianHousePrice": null,
   "medianHousePriceBasis": null,
   "yoyGrowth": 1.1,
   "asOf": "2025-12",
   "sourceUrl": "https://www.detik.com/properti/berita/d-8262598/3-wilayah-di-jabodetabek-yang-paling-diincar-pembeli-rumah-bekas",
   "confidence": "low",
   "valueLevel": "kota-inherited",
   "benchmark": {
    "rumah123Market": "Tangerang",
    "medianByLB": {
     "lb_le60": 870000000,
     "lb_61_90": 1400000000,
     "lb_91_150": 2100000000,
     "lb_151_250": 3500000000,
     "lb_ge251": 6900000000
    },
    "medianByLBAsOf": "2025-12",
    "medianByLBSource": "r123-fr-dec2025",
    "yoyGrowth": 1.1,
    "yoyGrowthMarket": "Tangerang",
    "yoyGrowthAsOf": "2026-07",
    "yoyGrowthSource": "r123-fr-aug2026",
    "yoyGrowthPrev": 1.1,
    "yoyGrowthPrevAsOf": "2026-06",
    "subMarketLandPerM2": 14824953,
    "subMarket": "Tangerang",
    "subMarketLandPerM2AsOf": "2025-12",
    "subMarketLandPerM2Source": "cw-h2-2025",
    "subMarketLandYoYDerived": -0.96,
    "estPricePerM2LB": 18500000,
    "kotaNote": "No separate Tangerang Selatan figure found; Rumah123 'Tangerang' and C&W 'Tangerang' sub-market used as proxy."
   },
   "listingSamples": [],
   "demand": {},
   "notes": [
    "No published kecamatan-level price found; use benchmark (kota medians by building size + sub-market land average).",
    "Tangerang Selatan proxied by Rumah123 'Tangerang' and C&W 'Tangerang' sub-market."
   ],
   "sources": [
    "cw-h2-2025",
    "r123-fr-aug2026",
    "r123-fr-dec2025"
   ]
  }
 ],
 "lelang": []
};
