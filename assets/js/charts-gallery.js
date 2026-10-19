/* ==========================================================================
 * charts-gallery.js: dev-only wiring for charts-gallery.html (visual QA of
 * MCD.charts). Every number here is generated from a fixed seed; the page
 * loads no data files, no vault and no app modules.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var C = MCD.charts;
    var grid = document.getElementById('g-grid');
    if (!C || !window.d3) {
      grid.textContent = '';
      var p = document.createElement('p');
      p.className = 'g-err';
      p.textContent = 'Galeri belum dapat dimuat: D3 atau assets/js/charts.js belum tersedia.';
      grid.appendChild(p);
      return;
    }
    var $ = function (id) { return document.getElementById(id); };
    var F = C.format;
    var readout = $('g-readout');
    function say(kind, text) {
      readout.textContent = '› ';
      var b = document.createElement('b');
      b.textContent = kind;
      readout.appendChild(b);
      readout.appendChild(document.createTextNode(' ' + text));
    }
    function onHover(name) { return function (p) { if (p) say('hover', name + ' · ' + (p.key != null ? p.key : (p.row ? p.row : ''))); }; }
    function onClick(name) { return function (p) { say('klik', name + ' · ' + (p && p.key != null ? p.key : (p && p.name) || '')); }; }

    /* deterministic PRNG (mulberry32) */
    var seed = 20261012, R;
    function prng(s) {
      var a = s >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function rnd(a, b) { return a + (b - a) * R(); }
    function gauss() { var u = 1 - R(), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function pick(arr) { return arr[Math.floor(R() * arr.length)]; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    var PRODUCTS = ['KSM', 'KPR', 'KKB', 'CC', 'MG', 'PEN', 'OTH'];
    var MONTHS = [];
    (function () { for (var i = 0; i < 24; i++) { var d = new Date(2024, 10 + i, 1); MONTHS.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); } })();
    var PACE = 12 / 31;
    var STAFF = [
      ['Andika P.', 'SOC'], ['Rina K.', 'SOC'], ['Yusuf A.', 'Mikro'], ['Dewi S.', 'CSO'], ['Bayu R.', 'SME RM'],
      ['Sari M.', 'SOC'], ['Gilang R.', 'CSO'], ['Fitri N.', 'Mikro'], ['Hendra W.', 'SOC'], ['Maya L.', 'Teller']
    ];
    var SATKER = [
      ['Denma Mabes TNI', 'Detasemen Markas Mabes TNI', 'PNS'], ['Denma Mabesal', 'Detasemen Markas Mabes TNI AL', 'AL'],
      ['Denma Mabesau', 'Detasemen Markas Mabes TNI AU', 'AU'], ['Disinfolahtal', 'Dinas Informasi dan Pengolahan Data TNI AL', 'AL'],
      ['Dispamal', 'Dinas Pengamanan dan Persandian TNI AL', 'AL'], ['Diskualal', 'Dinas Keuangan TNI AL', 'AL'],
      ['Puskes TNI', 'Pusat Kesehatan TNI', 'PNS'], ['Babek TNI', 'Badan Perbekalan TNI', 'AD'],
      ['Puspen TNI', 'Pusat Penerangan TNI', 'AD'], ['Satkomlek TNI', 'Satuan Komunikasi dan Elektronika TNI', 'AU'],
      ['Puspom TNI', 'Pusat Polisi Militer TNI', 'AD'], ['Koopssus TNI', 'Komando Operasi Khusus TNI', 'AD'],
      ['Akademi TNI', 'Akademi TNI', 'AL'], ['Disminpersal', 'Dinas Administrasi Personel TNI AL', 'AL'],
      ['Dislambair', 'Dinas Pengembangan Material TNI AL', 'AL'], ['Pusinfolahta', 'Pusat Informasi dan Pengolahan Data TNI', 'AU'],
      ['Spersal', 'Staf Personel TNI AL', 'AL'], ['Slogal', 'Staf Logistik TNI AL', 'AL']
    ];
    var RANKS = ['Pratu', 'Praka', 'Kopda', 'Koptu', 'Serda', 'Sertu', 'Serka', 'Serma', 'Pelda', 'Peltu', 'Letda', 'Lettu', 'Kapten', 'Mayor', 'Letkol', 'Kolonel', 'PNS'];
    var LETTERS = 'ABDEFGHIJKLMNPRSTUWY';

    function makeData() {
      R = prng(seed);
      var d = {};
      /* booking 24 months */
      var share = { KSM: 0.52, KPR: 0.2, KKB: 0.12, CC: 0.04, MG: 0.05, PEN: 0.05, OTH: 0.02 };
      var ticket = { KSM: 2.2e8, KPR: 4.5e8, KKB: 2.4e8, CC: 1.5e7, MG: 3.2e8, PEN: 1.8e8, OTH: 4e7 };
      d.booking = MONTHS.map(function (m, i) {
        var season = 1 + 0.1 * Math.sin((i / 12) * 2 * Math.PI + 1.2);
        var total = 7.9e9 * season * rnd(0.9, 1.1) * (1 + i * 0.006);
        var last = i === MONTHS.length - 1;
        if (last) total *= 0.36;
        var bp = {}, bn = {};
        PRODUCTS.forEach(function (p) { var v = total * share[p] * rnd(0.82, 1.18); bp[p] = v; bn[p] = Math.max(0, Math.round(v / ticket[p])); });
        var tgt = 9.5e9 * (1 + i * 0.003);
        var row = { month: m, byProduct: bp, byProductNoa: bn, target: tgt, targetNoa: Math.round(tgt / 2.3e8) };
        if (last) { var s = 0; PRODUCTS.forEach(function (p) { s += bp[p]; }); row.ghost = s / PACE; row.ghostNoa = 0; PRODUCTS.forEach(function (p) { row.ghostNoa += bn[p]; }); row.ghostNoa = Math.round(row.ghostNoa / PACE); }
        return row;
      });
      /* matrix */
      var groups = [['Tamtama', 540], ['Bintara', 1120], ['Pama', 410], ['Pamen', 260], ['Pati', 38], ['PNS', 632]];
      var base = { KSM: 0.46, KPR: 0.12, KKB: 0.15, CC: 0.11, MG: 0.02, PEN: 0.14 };
      var mult = {
        Tamtama: { KSM: 1.18, KPR: 0.45, KKB: 0.7, CC: 0.35, MG: 0.4, PEN: 0.6 },
        Bintara: { KSM: 1.28, KPR: 0.95, KKB: 0.95, CC: 0.6, MG: 0.8, PEN: 1.1 },
        Pama: { KSM: 0.95, KPR: 1.35, KKB: 1.2, CC: 1.4, MG: 1.1, PEN: 0.7 },
        Pamen: { KSM: 0.72, KPR: 1.7, KKB: 1.55, CC: 2.1, MG: 2.4, PEN: 1.3 },
        Pati: { KSM: 0.38, KPR: 1.9, KKB: 1.7, CC: 3.6, MG: 3.2, PEN: 1.6 },
        PNS: { KSM: 1.05, KPR: 1.05, KKB: 0.85, CC: 0.9, MG: 0.9, PEN: 1.25 }
      };
      var cols = ['KSM', 'KPR', 'KKB', 'CC', 'MG', 'PEN'];
      var colTot = {};
      cols.forEach(function (c) { colTot[c] = { d: 0, n: 0 }; });
      var mrows = groups.map(function (g) {
        var cells = {};
        var any = 0;
        cols.forEach(function (c) {
          var v = clamp(base[c] * mult[g[0]][c] * rnd(0.86, 1.14), 0, 0.86);
          cells[c] = { value: v, sub: 'W ' + F.int(Math.round(g[1] * (1 - v) * rnd(0.22, 0.4))) };
          colTot[c].d += v * g[1]; colTot[c].n += g[1];
          any = Math.max(any, v);
        });
        var rowTot = clamp(any + rnd(0.12, 0.24), 0, 0.92);
        return { key: g[0], label: g[0], sub: 'n ' + F.int(g[1]), cells: cells, total: { value: rowTot } };
      });
      var totCells = {};
      cols.forEach(function (c) { totCells[c] = { value: colTot[c].d / colTot[c].n }; });
      mrows.push({ key: 'total', label: 'Total', sub: 'n ' + F.int(groups.reduce(function (a, g) { return a + g[1]; }, 0)), kind: 'total', cells: totCells, total: { value: 0.729 } });
      d.matrix = { columns: cols.map(function (c) { return { key: c, label: c === 'CC' ? 'KK' : c, glyph: c }; }), rows: mrows };
      /* whitespace per pangkat */
      d.ws = groups.map(function (g) {
        var v = Math.round(g[1] * rnd(0.08, 0.24));
        var a = Math.round(v * rnd(0.18, 0.42));
        var sc = Math.round(rnd(58, 79));
        return { key: g[0], label: g[0], value: v, value2: a, note: F.int(v) + ' · skor rata ' + sc };
      });
      /* runway scatter, 1.800 facilities */
      var w = [['KSM', 0.55], ['KPR', 0.17], ['KKB', 0.12], ['MG', 0.06], ['PEN', 0.1]];
      d.runway = [];
      for (var i = 0; i < 1800; i++) {
        var u = R(), code = 'KSM', acc = 0;
        for (var k = 0; k < w.length; k++) { acc += w[k][1]; if (u <= acc) { code = w[k][0]; break; } }
        var runway = clamp(Math.abs(110 + gauss() * 62), 2, 275);
        var cap = code === 'KPR' ? 240 : code === 'KKB' ? 60 : 180;
        var tenor = Math.min(runway * rnd(0.12, 0.97), cap * rnd(0.08, 1));
        if (R() < 0.026) tenor = Math.min(240, runway + rnd(3, 42));
        d.runway.push({ x: runway, y: Math.max(1, tenor), code: code, id: 'f' + i });
      }
      /* top-up funnel */
      var n0 = 1204;
      var s1 = Math.round(n0 * rnd(0.78, 0.84)), s2 = Math.round(s1 * rnd(0.9, 0.95)), s3 = Math.round(s2 * rnd(0.91, 0.96)), s4 = Math.round(s3 * rnd(0.78, 0.86)), s5 = Math.round(s4 * rnd(0.55, 0.64));
      d.topup = [
        { key: 'aktif', label: 'KSM aktif', n: n0 }, { key: 'mob', label: 'MoB ≥ 12', n: s1 }, { key: 'kol', label: 'Kol 1 (12 bln)', n: s2 },
        { key: 'gaji', label: 'Gaji masuk ≤ 1 bln', n: s3 }, { key: 'runway', label: 'Runway ≥ 24 bln', n: s4 }, { key: 'eligible', label: 'Tambahan ≥ Rp 25 jt', n: s5 }
      ];
      d.topupPotensi = s5 * rnd(8.6e7, 9.8e7);
      /* SME funnel with plan */
      var visit = Math.round(rnd(380, 440));
      d.sme = [
        { key: 'map', label: 'Listing terpetakan', n: 4143, plan: 4143 },
        { key: 'qual', label: 'Terkualifikasi', n: Math.round(rnd(1500, 1900)), plan: 1864 },
        { key: 'visit', label: 'Dikunjungi', n: visit, plan: 660 },
        { key: 'onb', label: 'Onboarding', n: Math.round(visit * rnd(0.2, 0.26)), kind: 'side' },
        { key: 'sub', label: 'Diajukan', n: Math.round(visit * rnd(0.035, 0.07)), plan: 79 },
        { key: 'book', label: 'Booked', n: 0, plan: 51, auto: 0 }
      ];
      d.sme[5].n = Math.round(d.sme[4].n * rnd(0.6, 0.8));
      d.sme[5].auto = Math.max(1, Math.round(d.sme[5].n * 0.3));
      d.smeWarn = d.sme[4].n / visit < 0.05;
      /* DSR histogram */
      var bins = [];
      for (var b = 0; b <= 80; b += 5) bins.push({ bin: b, n: 0 });
      for (var j = 0; j < 2100; j++) { var v = clamp(31 + gauss() * 11.5, 0, 84.9); bins[Math.min(16, Math.floor(v / 5))].n++; }
      d.dsr = bins;
      var above = bins.filter(function (q) { return q.bin >= 40; }).reduce(function (a, q) { return a + q.n; }, 0);
      d.dsrFigs = [['Median DSR', F.pct(rnd(0.3, 0.33), 1)], ['Di atas batas', F.pct(above / 2100, 1)], ['Σ headroom/bln', F.rp(rnd(4.4e9, 5.1e9))], ['Σ potensi plafond', F.rp(rnd(2.0e11, 2.3e11))]];
      /* QRIS 12 months */
      var qm = MONTHS.slice(12);
      d.qris = { x: qm, vol: qm.map(function (m, i) { return 1.35e9 * (1 + i * 0.055) * rnd(0.9, 1.1); }), rate: qm.map(function (m, i) { return clamp(0.58 + i * 0.011 + rnd(-0.015, 0.015), 0, 1); }) };
      /* retention D0..D30 */
      d.retX = []; d.ret = [];
      for (var dd = 0; dd <= 30; dd++) { d.retX.push(dd); d.ret.push(clamp(0.21 + 0.79 * Math.exp(-dd / rnd(6.2, 6.8)) + rnd(-0.008, 0.008), 0, 1)); }
      d.ret[0] = 1;
      /* product mix and status */
      var os = { KSM: 184.6e9, KPR: 96.1e9, KKB: 41.3e9, CC: 2.9e9, MG: 27.8e9, PEN: 6.2e9, OTH: 0.3e9 };
      d.mix = PRODUCTS.map(function (p) { return { key: p, value: os[p] * rnd(0.94, 1.06) }; });
      d.status = [{ key: 'DEBITUR', label: 'Debitur', value: Math.round(rnd(1760, 1860)) }, { key: 'WHITESPACE', label: 'Whitespace', value: Math.round(rnd(570, 620)) }, { key: 'PROSPECT', label: 'Prospek', value: Math.round(rnd(560, 610)) }];
      d.sparks = [0, 1, 2].map(function (q) { var v = [120, 1700, 0.7][q]; return Array.from({ length: 13 }, function () { v *= rnd(0.985, 1.025); return v; }); });
      /* payroll share */
      d.share = SATKER.slice(0, 8).map(function (s) {
        var strength = Math.round(rnd(180, 760));
        var mdr = clamp(rnd(0.3, 0.88), 0, 1);
        var rest = 1 - mdr;
        var a = rnd(0.25, 0.45), b2 = rnd(0.15, 0.3), c = rnd(0.1, 0.2), e = rnd(0.03, 0.08);
        var tot = a + b2 + c + e + 0.05;
        var hc = Math.round(strength * mdr);
        return {
          key: s[0], label: s[0], sub: s[2], flag: mdr < 0.5,
          valueText: F.pct(mdr, 1) + ' · ' + F.int(hc) + ' / ' + F.int(strength),
          segments: [
            { key: 'MANDIRI', label: 'Mandiri', value: hc },
            { key: 'BSI', label: 'BSI', value: strength * rest * a / tot },
            { key: 'BNI', label: 'BNI', value: strength * rest * b2 / tot },
            { key: 'BRI', label: 'BRI', value: strength * rest * c / tot },
            { key: 'BTN', label: 'BTN', value: strength * rest * e / tot },
            { key: 'LAINNYA', label: 'Lainnya', value: strength * rest * 0.05 / tot }
          ]
        };
      }).sort(function (x, y) { return x.segments[0].value / (x.segments.reduce(function (a, s) { return a + s.value; }, 0)) - y.segments[0].value / (y.segments.reduce(function (a, s) { return a + s.value; }, 0)); });
      /* satker board */
      d.satker = SATKER.map(function (s, i) {
        var payroll = Math.round(rnd(140, 820));
        var pen = clamp(rnd(0.42, 0.88), 0, 1);
        var deb = Math.round(payroll * pen);
        var sp = [];
        var p0 = pen - rnd(0.02, 0.08);
        for (var q = 0; q < 12; q++) { p0 += rnd(-0.01, 0.014); sp.push(p0); }
        sp[11] = pen;
        return { id: 's' + i, abbr: s[0], name: s[1], matra: s[2], payroll: payroll, debitur: deb, pen: pen, os: deb * rnd(1.6e8, 2.3e8), kol2: rnd(0.004, 0.04), ws: Math.round(payroll * (1 - pen) * rnd(0.5, 0.8)), score: Math.round(rnd(54, 82)), trend: sp, dpen: rnd(-0.012, 0.018) };
      });
      /* prospects (3.000, masked) */
      d.prospek = [];
      for (var pi = 0; pi < 3000; pi++) {
        var rk = pick(RANKS);
        var sc = Math.round(clamp(62 + gauss() * 14, 18, 99));
        var st = SATKER[Math.floor(R() * SATKER.length)];
        d.prospek.push({
          id: 'p' + pi, score: sc, band: sc >= 80 ? 'A' : sc >= 65 ? 'B' : sc >= 50 ? 'C' : 'D',
          name: (rk === 'PNS' ? '' : rk + ' ') + pick(LETTERS) + '*** ' + pick(LETTERS) + '***', rank: rk, satker: st[0], matra: st[2],
          status: R() < 0.52 ? 'Whitespace' : 'Prospek', rec: pick(['KSM', 'KSM', 'KSM', 'KPR', 'KKB', 'CC', 'PEN']),
          potensi: Math.round(rnd(25, 420)) * 1e6, runway: Math.round(rnd(14, 260)), dist: rnd(0.3, 14.5)
        });
      }
      /* staff */
      d.staff = STAFF.map(function (s, i) {
        var v = Math.round(rnd(60, 420));
        return { key: 'st' + i, label: s[0], name: s[0], role: s[1], value: v, prev: Math.round(v * rnd(0.7, 1.25)), achievement: v / rnd(260, 360) };
      });
      var byNow = d.staff.slice().sort(function (a, b2) { return b2.value - a.value; });
      var byPrev = d.staff.slice().sort(function (a, b2) { return b2.prev - a.prev; });
      d.slope = d.staff.map(function (s) { return { key: s.key, label: s.label, from: byPrev.indexOf(s) + 1, to: byNow.indexOf(s) + 1 }; });
      d.podium = byNow.slice(0, 3).map(function (s) {
        return {
          key: s.key, name: s.name, role: s.role, value: s.value, achievement: s.achievement,
          movement: (byPrev.indexOf(s) + 1) - (byNow.indexOf(s) + 1),
          mix: [{ key: 'KSM', value: rnd(40, 70) }, { key: 'KPR', value: rnd(10, 30) }, { key: 'KKB', value: rnd(5, 20) }, { key: 'CC', value: rnd(2, 10) }]
        };
      });
      d.avg = d.staff.reduce(function (a, s) { return a + s.value; }, 0) / d.staff.length;
      /* bullet */
      d.bullet = [
        { key: 'KSM', label: 'KSM', actual: rnd(3.6e9, 4.6e9), target: 6.0e9, pace: PACE },
        { key: 'KPR', label: 'KPR', actual: rnd(0.7e9, 1.2e9), target: 2.5e9, pace: PACE },
        { key: 'KKB', label: 'KKB', actual: rnd(0.32e9, 0.55e9), target: 0.8e9, pace: PACE },
        { key: 'CC', label: 'Kartu Kredit', actual: Math.round(rnd(18, 34)), target: 60, pace: PACE, format: 'int' },
        { key: 'MG', label: 'Multiguna', actual: rnd(0.08e9, 0.2e9), target: 0.5e9, pace: PACE },
        { key: 'PEN', label: 'Pensiun', actual: rnd(0.3e9, 0.46e9), target: 0.35e9, pace: PACE }
      ];
      /* funnel */
      var pipe = Math.round(rnd(42, 54)), appr = Math.round(pipe * rnd(0.58, 0.7)), booked = Math.round(appr * rnd(0.66, 0.78));
      d.funnel = [{ key: 'pipe', label: 'Pipeline', n: pipe, value: pipe * 2.05e8 }, { key: 'appr', label: 'Disetujui', n: appr, value: appr * 2.2e8 }, { key: 'book', label: 'Booked', n: booked, value: booked * 2.1e8 }];
      d.ditolak = Math.round((pipe - appr) * rnd(0.4, 0.6));
      /* calendar 26 weeks */
      var holidays = { '2026-05-01': 'Hari Buruh', '2026-05-14': 'Kenaikan Isa Almasih', '2026-05-15': 'Cuti bersama', '2026-05-27': 'Iduladha', '2026-05-28': 'Cuti bersama', '2026-06-01': 'Hari Lahir Pancasila', '2026-06-16': 'Tahun Baru Islam', '2026-08-17': 'HUT Kemerdekaan RI', '2026-08-25': 'Maulid Nabi' };
      d.cal = [];
      var end = new Date(2026, 9, 12);
      for (var cd = 0; cd < 182; cd++) {
        var dt = new Date(end.getFullYear(), end.getMonth(), end.getDate() - cd);
        var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        if (dt.getDay() === 0) continue;
        if (holidays[key]) { d.cal.push({ date: key, value: 0, holiday: holidays[key] }); continue; }
        var payday = dt.getDate() <= 3 ? 1.6 : 1;
        var sat = dt.getDay() === 6 ? 0.35 : 1;
        var val = R() < 0.18 ? 0 : Math.round(rnd(1, 13) * payday * sat);
        d.cal.push({ date: key, value: val, deals: Math.round(val / rnd(4, 7)) });
      }
      /* team trend: 30 working days */
      d.trendX = []; d.trend = []; d.trendT = [];
      var cnt = 0, cur = new Date(2026, 9, 12);
      while (cnt < 30) {
        var dk = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
        if (cur.getDay() !== 0 && cur.getDay() !== 6) {
          d.trendX.unshift(dk);
          var pd = cur.getDate() <= 3 ? 1.5 : 1;
          d.trend.unshift(Math.round(rnd(40, 95) * pd));
          d.trendT.unshift(72);
          cnt++;
        }
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 1);
      }
      d.trend[d.trend.length - 1] = Math.round(d.trend[d.trend.length - 1] * 0.45);
      return d;
    }

    var D = makeData();
    var H = {};
    var bookingMode = 'rp';

    /* ── KPI strip ── */
    function kpiCfg() {
      var lastB = D.booking[D.booking.length - 1];
      var mtd = PRODUCTS.reduce(function (a, p) { return a + lastB.byProduct[p]; }, 0);
      var att = mtd / lastB.target;
      return [
        { eyebrow: 'Outstanding Konsumtif', product: 'KSM', info: 'Σ outstanding fasilitas konsumtif aktif pada filter populasi dan produk yang berlaku. Sumber: data sintetis.', value: 359.2e9 * (0.97 + R() * 0.06), format: 'rp', delta: { value: 0.018 + (R() - 0.5) * 0.01, label: 'MoM' }, spark: D.sparks[0].map(function (v) { return v * 3e9; }), sparkLabels: MONTHS.slice(11).map(F.monthLong), onClick: onClick('KPI Outstanding') },
        { eyebrow: 'Debitur · NOA', value: 1812, format: 'int', value2: { value: 2376, format: 'int', unit: 'NOA' }, delta: { value: 22, kind: 'int', label: 'MoM' }, spark: D.sparks[1], sparkFormat: 'int' },
        { eyebrow: 'Booking MTD vs Target', value: mtd, format: 'rp', value2: { value: att, format: 'pct0', sep: false }, target: { attainment: att, pace: PACE, month: 'Okt' }, info: 'Booking bulan berjalan dibandingkan target bulan, dengan pace = porsi hari kalender yang telah berlalu (12/31).' },
        { eyebrow: 'Penetrasi Payroll', value: 0.729, format: 'pct', delta: { value: 0.006, kind: 'pp', label: 'MoM' }, spark: D.sparks[2], sparkFormat: 'pct' },
        { eyebrow: 'Whitespace', product: 'WHITESPACE', value: D.status[1].value, format: 'int', unit: 'nasabah', sub: 'Potensi Rp 96,4 M' },
        { eyebrow: 'Kol 2+ / NPL', value: 0.019, format: 'pct', value2: { value: 0.007, format: 'pct' }, delta: { value: -0.001, kind: 'pp', label: 'MoM', invert: true }, spark: [2.3, 2.2, 2.2, 2.1, 2.1, 2.0, 2.1, 2.0, 2.0, 1.9, 2.0, 1.9, 1.9].map(function (v) { return v / 100; }), sparkFormat: 'pct' }
      ];
    }
    var kc = kpiCfg();
    ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].forEach(function (id, i) { H[id] = C.kpiTile($(id), Object.assign({ from: 0 }, kc[i])); });

    /* ── booking ── */
    C.legend($('lg-booking'), PRODUCTS.map(function (k) { return { key: k }; }));
    function bookingData() {
      return D.booking.map(function (r) {
        return bookingMode === 'rp'
          ? { month: r.month, values: r.byProduct, target: r.target, ghost: r.ghost }
          : { month: r.month, values: r.byProductNoa, target: r.targetNoa, ghost: r.ghostNoa };
      });
    }
    function bookingNote() {
      var ytd = D.booking.slice(-10).reduce(function (a, r) { return a + PRODUCTS.reduce(function (s, p) { return s + r.byProduct[p]; }, 0); }, 0);
      var tgt = D.booking.slice(-10).reduce(function (a, r) { return a + r.target; }, 0);
      $('n-booking').textContent = 'YTD ' + F.rp(ytd) + ' · ' + F.pct(ytd / tgt, 0) + ' target YTD · Avg ticket ' + F.rp(2.38e8) + ' · Rate rata-rata 8,41%';
    }
    H.booking = C.stackedColumns($('c-booking'), bookingData(), { label: 'Booking 24 bulan', format: 'rp', onHover: onHover('Booking'), onClick: onClick('Booking') });
    bookingNote();

    /* ── matrix ── */
    H.matrix = C.matrix($('c-matrix'), D.matrix, { label: 'Matriks penetrasi pangkat × produk', format: 'pct', domain: [0, 0.7], corner: 'Pangkat', totalLabel: 'Total', onClick: onClick('Matriks'), onHover: function (p) { if (p) say('hover', 'Matriks · ' + p.row + ' × ' + p.col + ' · ' + F.pct(p.value)); } });

    /* ── whitespace hbars ── */
    H.ws = C.hbars($('c-ws'), D.ws, { label: 'Whitespace per pangkat', format: 'int', valueLabel: 'Whitespace', secondary: { label: 'Lead band A', color: 'gold' }, onHover: onHover('Whitespace'), onClick: onClick('Whitespace') });

    /* ── runway scatter ── */
    C.legend($('lg-runway'), ['KSM', 'KPR', 'KKB', 'MG', 'PEN'].map(function (k) { return { key: k }; }).concat([{ key: 'past', label: 'Melewati pensiun', glyph: 'ring', color: 'neg' }]));
    function runwayNote() {
      var past = D.runway.filter(function (p) { return p.y > p.x; });
      var r24 = D.runway.filter(function (p) { return p.x <= 24; }).length;
      $('n-runway').textContent = 'Melewati pensiun: ' + F.int(past.length) + ' fasilitas · OS ' + F.rp(past.length * 9.4e7) + '   ·   Runway ≤ 24 bln: ' + F.int(r24) + ' debitur';
    }
    H.runway = C.scatterCanvas($('c-runway'), D.runway, {
      label: 'Runway pensiun terhadap sisa tenor', xDomain: [0, 240], yDomain: [0, 240], xClampLabel: '240+',
      xLabel: 'Runway pensiun (bln)', yLabel: 'Sisa tenor (bln)', xName: 'Runway', yName: 'Sisa tenor',
      xFormat: function (v) { return F.num(v, 0); }, yFormat: function (v) { return F.num(v, 0); },
      diagonal: { label: 'Jatuh tempo = tanggal pensiun', above: { label: 'Melewati pensiun', color: 'neg', alpha: 0.06 } },
      onHover: function (p) { if (p) say('hover', 'Runway · ' + p.code + ' · ' + F.num(p.x, 0) + ' / ' + F.num(p.y, 0) + ' bln'); },
      onClick: onClick('Runway')
    });
    runwayNote();

    /* ── top-up stepBars ── */
    H.topup = C.stepBars($('c-topup'), D.topup, { label: 'Eligibilitas top-up KSM', format: 'int', footer: 'Potensi top-up ' + F.rp(D.topupPotensi), onHover: onHover('Top-up'), onClick: onClick('Top-up') });

    /* ── DSR histogram + figures ── */
    function dsrFigs() {
      var dl = $('f-dsr');
      dl.textContent = '';
      D.dsrFigs.forEach(function (f) {
        var dv = document.createElement('div');
        var dt = document.createElement('dt'); dt.textContent = f[0];
        var dd = document.createElement('dd'); dd.textContent = f[1];
        dv.appendChild(dt); dv.appendChild(dd); dl.appendChild(dv);
      });
    }
    H.dsr = C.histogram($('c-dsr'), D.dsr, { label: 'Sebaran DSR', binWidth: 5, xFormat: function (v) { return F.num(v, 0) + '%'; }, overflowLabel: '80%+', unitLabel: 'nasabah', threshold: { value: 40, label: 'Batas DSR 40% (asumsi)', above: 'neg', alpha: 0.7 }, onHover: onHover('DSR') });
    dsrFigs();

    /* ── SME funnel (plan overlay) ── */
    function smeCfg() {
      return {
        label: 'Corong akuisisi UMKM', format: 'int', planLabel: 'rencana', autoLabel: 'Otomatis (cocok impor)',
        side: { label: 'Gugur', n: Math.round(D.sme[1].n - D.sme[2].n + D.sme[2].n * 0.4) },
        footer: 'Booked otomatis (arsir): ' + F.int(D.sme[5].auto),
        note: D.smeWarn ? { text: 'Konversi kunjungan ke pengajuan di bawah 5%. Perbaiki penargetan sebelum menambah tenaga.', tone: 'warn' } : null,
        onHover: onHover('UMKM')
      };
    }
    H.sme = C.stepBars($('c-sme'), D.sme, smeCfg());

    /* ── QRIS combo ── */
    C.legend($('lg-qris'), [{ key: 'vol', label: 'Volume', glyph: 'square', color: 'plat-3' }, { key: 'rate', label: 'Aktif 30 hari', line: true, color: 'text-1' }]);
    function qrisSeries() {
      return [
        { key: 'vol', label: 'Volume QRIS', type: 'bar', color: 'plat-3', values: D.qris.vol, format: 'rp' },
        { key: 'rate', label: 'Merchant aktif 30 hari', type: 'line', color: 'text-1', axis: 'right', values: D.qris.rate, format: 'pct', area: false }
      ];
    }
    H.qris = C.line($('c-qris'), qrisSeries(), { label: 'Volume QRIS 12 bulan', x: D.qris.x, format: 'rp', rightFormat: 'pct0', onHover: onHover('QRIS') });

    /* ── retention ── */
    H.ret = C.line($('c-ret'), [{ key: 'ret', label: 'Saldo tersisa (median)', color: 'b-payroll', values: D.ret, format: 'pct' }], {
      label: 'Retensi saldo hari gajian', x: D.retX, xType: 'linear', xFormat: function (v) { return 'D' + v; }, format: 'pct0', yDomain: [0, 1], curve: 'monotone',
      markers: [{ x: 3, label: 'D+3' }, { x: 10, label: 'D+10' }, { x: 25, label: 'D+25' }], onHover: onHover('Retensi')
    });

    /* ── mix + status + sparklines ── */
    function mixLabels() {
      var tot = D.mix.reduce(function (a, s) { return a + s.value; }, 0);
      $('v-mix').textContent = F.rp(tot);
      $('v-status').textContent = D.status.map(function (s) { return s.label + ' ' + F.int(s.value); }).join(' · ');
    }
    H.mix = C.shareBars($('c-mix'), D.mix, { single: true, barHeight: 12, format: 'rp', label: 'Mix produk berdasarkan outstanding', onSegmentClick: function (p) { say('klik', 'Mix · toggle produk ' + p.key); }, onHover: onHover('Mix') });
    H.status = C.shareBars($('c-status'), D.status, { single: true, barHeight: 8, format: 'int', label: 'Status nasabah', onHover: onHover('Status') });
    mixLabels();
    H.s1 = C.sparkline($('s1'), D.sparks[0].map(function (v) { return v * 1e9; }), { color: 'KSM', format: 'rp', labels: MONTHS.slice(11).map(F.monthLong), label: 'Outstanding KSM' });
    H.s2 = C.sparkline($('s2'), D.sparks[1], { color: 'text-2', format: 'int', labels: MONTHS.slice(11).map(F.monthLong), label: 'Debitur' });
    H.s3 = C.sparkline($('s3'), D.sparks[2], { color: 'gold', format: 'pct', labels: MONTHS.slice(11).map(F.monthLong), label: 'Penetrasi' });

    /* ── payroll share rows ── */
    C.legend($('lg-share'), [{ key: 'MANDIRI', label: 'Mandiri', glyph: 'square', color: 'plat-4' }, { key: 'BSI', glyph: 'square', color: 'bank-bsi' }, { key: 'BNI', glyph: 'square', color: 'bank-bni' }, { key: 'BRI', glyph: 'square', color: 'bank-bri' }, { key: 'BTN', glyph: 'square', color: 'bank-btn' }, { key: 'LAINNYA', label: 'Lainnya', glyph: 'square', color: 'bank-oth' }]);
    H.share = C.shareBars($('c-share'), D.share, { label: 'Share payroll per satker', format: 'int', rowHeight: 36, barHeight: 8, onHover: function (p) { if (p) say('hover', 'Share · ' + p.rowKey + ' · ' + p.key); }, onClick: function (p) { say('klik', 'Share · ' + p.rowKey + ' · ' + p.key); } });

    /* ── satker table ── */
    var satkerCols = [
      { key: 'idx', label: '#', width: 40, type: 'int', sortable: false, value: function (r) { return r._rank; } },
      { key: 'abbr', label: 'Satker', width: 168, tip: function (r) { return { eyebrow: 'Satker', body: r.name }; } },
      { key: 'matra', label: 'Matra', width: 64, type: 'monogram', align: 'center', active: function (r) { return r.matra === 'AL'; } },
      { key: 'payroll', label: 'Payroll', type: 'int', width: 84 },
      { key: 'debitur', label: 'Debitur', type: 'int', width: 84 },
      { key: 'pen', label: 'Penetrasi', type: 'bar', width: 128 },
      { key: 'os', label: 'OS', type: 'rp', width: 104 },
      { key: 'kol2', label: 'Kol 2+', type: 'pct', width: 76 },
      { key: 'ws', label: 'Whitespace', type: 'int', width: 104 },
      { key: 'score', label: 'Skor', type: 'int', width: 64 },
      { key: 'trend', label: 'Tren 12 bln', type: 'spark', width: 104, color: 'text-2', sortable: false },
      { key: 'dpen', label: 'Δ MoM', type: 'delta', kind: 'pp', width: 96 }
    ];
    function rankSatker() { D.satker.slice().sort(function (a, b) { return b.pen - a.pen; }).forEach(function (r, i) { r._rank = i + 1; }); }
    rankSatker();
    H.satker = C.table($('c-satker'), {
      label: 'Papan satker', columns: satkerCols, rows: D.satker, rowHeight: 32, sort: { key: 'pen', dir: 'desc' },
      rowKey: function (r) { return r.id; }, flip: true,
      footer: 'SRC galeri_demo · ' + D.satker.length + ' satker · lokal saja · 12 Okt 2026 08.00 WIB',
      onRow: function (r) { H.satker.select(r.id); say('klik', 'Satker · ' + r.abbr); },
      onHover: function (r) { if (r) say('hover', 'Satker · ' + r.abbr); }
    });

    /* ── prospect table (virtual) ── */
    var bandColor = { A: 'gold', B: 'gold-soft', C: 'text-3', D: 'text-off' };
    var prospekCols = [
      {
        key: 'score', label: 'Skor', width: 76, type: 'int',
        render: function (td, r) {
          var bar = document.createElement('span');
          bar.style.cssText = 'display:inline-block;width:3px;height:18px;margin-right:10px;vertical-align:-3px;background:' + C.color(bandColor[r.band]) + ';opacity:' + (r.band === 'B' ? 0.6 : 1);
          var n = document.createElement('span');
          n.textContent = String(r.score);
          n.style.cssText = 'font:400 20px/24px var(--font-serif);';
          td.appendChild(bar); td.appendChild(n);
          td.style.textAlign = 'left';
        }
      },
      { key: 'name', label: 'Nama', width: 168 },
      { key: 'rank', label: 'Pangkat', width: 84, type: 'mono' },
      { key: 'satker', label: 'Satker', width: 148 },
      { key: 'matra', label: 'Matra', width: 64, type: 'monogram', align: 'center' },
      { key: 'status', label: 'Status', width: 104 },
      { key: 'rec', label: 'Rekomendasi', width: 136, type: 'glyph' },
      { key: 'potensi', label: 'Potensi plafond', type: 'rp', width: 132 },
      { key: 'runway', label: 'Runway', width: 84, type: 'int', format: function (v) { return F.int(v) + ' bln'; } },
      { key: 'dist', label: 'Jarak', width: 84, type: 'num', format: function (v) { return v < 1 ? F.int(v * 1000) + ' m' : F.num(v, 1) + ' km'; } }
    ];
    H.prospek = C.table($('c-prospek'), {
      label: 'Prospek dengan lead score', columns: prospekCols, rows: D.prospek, rowHeight: 36, virtual: true, sort: { key: 'score', dir: 'desc' },
      rowKey: function (r) { return r.id; }, footer: 'Nama tersamar · 3.000 baris · virtualisasi aktif · Export CSV (tersamar) tersedia di aplikasi',
      onRow: function (r) { H.prospek.select(r.id); say('klik', 'Prospek · ' + r.name + ' · skor ' + r.score); }
    });

    /* ── bullet, lollipop, slope ── */
    H.bullet = C.bulletChart($('c-bullet'), D.bullet, { label: 'Produk terhadap target bulan berjalan', format: 'rp', onHover: onHover('Target') });
    H.lolli = C.lollipop($('c-lolli'), D.staff, { label: 'Peringkat poin staf', format: 'int', valueLabel: 'Poin', avg: { value: D.avg, label: 'Rata-rata' }, onHover: onHover('Peringkat'), onClick: onClick('Peringkat') });
    H.slope = C.slope($('c-slope'), D.slope, { label: 'Pergerakan peringkat staf', leftLabel: 'Sep 2026', rightLabel: 'Okt 2026', onHover: onHover('Slope') });

    /* ── rings ── */
    H.ringHero = C.progressRing($('r-hero'), { value: 0.82, pace: PACE, label: 'poin vs target' }, { size: 160, label: 'Poin tim terhadap target' });
    var ringItems = [
      { k: 'r40', v: 0.64, label: 'Booking KSM', size: 40 }, { k: 'r40', v: 1.18, label: 'Kartu Kredit (NOA)', size: 40 },
      { k: 'r20', v: 0.48, label: 'KPR · 20 px (tabel)', size: 20 }, { k: 'r20', v: 0.93, label: 'KKB · 20 px (tabel)', size: 20 }
    ];
    H.rings = ringItems.map(function (it) {
      var li = document.createElement('li');
      var box = document.createElement('div'); box.className = it.k;
      var lab = document.createElement('span'); lab.textContent = it.label;
      var val = document.createElement('b'); val.textContent = F.pct(it.v, 0);
      li.appendChild(box); li.appendChild(lab); li.appendChild(val);
      $('r-list').appendChild(li);
      return { h: C.progressRing(box, { value: it.v, pace: PACE }, { size: it.size, thresholds: true, label: it.label }), it: it, val: val };
    });

    /* ── funnel, calendar ── */
    H.funnel = C.funnel($('c-funnel'), D.funnel, { label: 'Funnel deal 90 hari', format: 'int', valueFormat: 'rp', side: { label: 'Ditolak', n: D.ditolak }, onHover: onHover('Funnel') });
    H.cal = C.calendarHeatmap($('c-cal'), D.cal, {
      label: 'Kalender aktivitas 26 minggu', end: '2026-10-12', weeks: 26, days: [1, 2, 3, 4, 5, 6], unit: 'poin', range: ['2026-10-01', '2026-10-12'],
      tipRows: function (d) { return [{ label: 'Poin', value: F.int(d.value || 0), strong: true }, { label: 'Deal booked', value: F.int(d.deals || 0) }]; },
      onHover: onHover('Kalender'), onClick: onClick('Kalender')
    });

    /* ── amortisation ── */
    C.legend($('lg-amort'), [{ key: 'p', label: 'Pokok', glyph: 'square', color: 'prop-principal' }, { key: 'i', label: 'Bunga', glyph: 'square', color: 'prop-interest' }, { key: 'b', label: 'Sisa pokok', line: 'dashed', color: 'prop-balance' }]);
    var loan = { amount: 380e6, segments: [{ months: 60, rate: 0.0466, label: 'Fixed' }, { months: 180, rate: 0.13, label: 'Floating' }] };
    var am = C.amortize(loan);
    var shock = am.schedule[60].payment / am.schedule[59].payment - 1;
    var halfIdx = am.schedule.findIndex(function (r) { return r.balance <= loan.amount / 2; });
    var amMarker = { month: halfIdx + 1, label: 'Sisa pokok 50% · bln ' + (halfIdx + 1) };
    H.amort = C.amortizationArea($('c-amort'), { loan: loan, start: '2026-11' }, { label: 'Simulasi amortisasi KPR', marker: amMarker, fixedLabel: 'Fixed berakhir · angsuran ▲' + F.pct(shock, 1), onHover: onHover('Amortisasi') });

    /* ── podium + trend ── */
    H.podium = C.podium($('c-podium'), D.podium, { format: 'int', unit: 'poin', onClick: onClick('Podium') });
    function trendSeries() {
      return [{ key: 'poin', label: 'Poin tim', type: 'bar', color: 'plat-3', values: D.trend, format: 'int', hatch: D.trend.length - 1 }];
    }
    function trendLabels() { return D.trendX.map(function (k) { var p = k.split('-'); return +p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+p[1] - 1]; }); }
    H.trend = C.line($('c-trend'), trendSeries(), { label: 'Tren poin tim 30 hari kerja', x: D.trendX, xLabels: trendLabels(), xLabelsLong: D.trendX.map(F.day), format: 'int', target: D.trendT, targetLabel: 'Target harian 72 poin', onHover: onHover('Tren'), onClick: onClick('Tren') });

    /* ── controls ── */
    function updateAll() {
      kc = kpiCfg();
      ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].forEach(function (id, i) { H[id].update(kc[i]); });
      H.booking.update(bookingData());
      bookingNote();
      H.matrix.update(D.matrix);
      H.ws.update(D.ws);
      H.runway.update(D.runway);
      runwayNote();
      H.topup.update(D.topup, { footer: 'Potensi top-up ' + F.rp(D.topupPotensi) });
      H.dsr.update(D.dsr);
      dsrFigs();
      H.sme.update(D.sme, smeCfg());
      H.qris.update(qrisSeries(), { x: D.qris.x });
      H.ret.update([{ key: 'ret', label: 'Saldo tersisa (median)', color: 'b-payroll', values: D.ret, format: 'pct' }]);
      H.mix.update(D.mix);
      H.status.update(D.status);
      mixLabels();
      H.s1.update(D.sparks[0].map(function (v) { return v * 1e9; }));
      H.s2.update(D.sparks[1]);
      H.s3.update(D.sparks[2]);
      H.share.update(D.share);
      rankSatker();
      H.satker.update(D.satker);
      H.prospek.update(D.prospek);
      H.bullet.update(D.bullet);
      H.lolli.update(D.staff, { avg: { value: D.avg, label: 'Rata-rata' } });
      H.slope.update(D.slope);
      var hv = 0.6 + R() * 0.55;
      H.ringHero.update({ value: hv, pace: PACE, label: 'poin vs target' });
      H.rings.forEach(function (r) { var v = Math.max(0.2, r.it.v * (0.75 + R() * 0.5)); r.h.update({ value: v, pace: PACE }); r.val.textContent = F.pct(v, 0); });
      H.funnel.update(D.funnel, { side: { label: 'Ditolak', n: D.ditolak } });
      H.cal.update(D.cal);
      H.podium.update(D.podium);
      H.trend.update(trendSeries(), { target: D.trendT });
    }
    $('g-shuffle').addEventListener('click', function () {
      seed += 1;
      D = makeData();
      updateAll();
      say('data', 'diacak ulang dengan seed ' + seed);
    });
    var hlOn = false;
    $('g-hl').addEventListener('click', function () {
      hlOn = !hlOn;
      this.setAttribute('aria-pressed', hlOn ? 'true' : 'false');
      var k = hlOn ? 'KSM' : null;
      [H.booking, H.runway, H.mix, H.bullet].forEach(function (h) { h.highlight(k); });
      H.matrix.highlight(hlOn ? { col: 'KSM' } : null);
      say('sorot', hlOn ? 'KSM (seri lain 30%)' : 'dimatikan');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-metal]'), function (b) {
      b.addEventListener('click', function () {
        document.body.setAttribute('data-section', b.getAttribute('data-metal'));
        Array.prototype.forEach.call(document.querySelectorAll('[data-metal]'), function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        C.tokens.refresh();
        Object.keys(H).forEach(function (k) { var h = H[k]; if (h && typeof h.resize === 'function') h.resize(); });
        ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].forEach(function (id, i) { H[id].update({}); });
        H.podium.update(D.podium);
        say('logam', b.textContent);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bk]'), function (b) {
      b.addEventListener('click', function () {
        bookingMode = b.getAttribute('data-bk');
        Array.prototype.forEach.call(document.querySelectorAll('[data-bk]'), function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        H.booking.update(bookingData(), { format: bookingMode === 'rp' ? 'rp' : 'int', targetName: 'Target', ghostLabel: 'Proyeksi sebulan' });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-am]'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('[data-am]'), function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        H.amort.update(undefined, { mode: b.getAttribute('data-am'), marker: b.getAttribute('data-am') === 'yearly' ? null : H.amortMarker });
      });
    });
    H.amortMarker = amMarker;
    Array.prototype.forEach.call(document.querySelectorAll('[data-table]'), function (b) {
      b.addEventListener('click', function () {
        var h = H[b.getAttribute('data-table')];
        if (!h) return;
        var on = b.getAttribute('aria-pressed') !== 'true';
        h.showTable(on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = on ? 'Tutup tabel' : 'Lihat tabel';
      });
    });
    MCD.gallery = { handles: H, data: function () { return D; } };
  });
})(window.MCD = window.MCD || {});

/* ==========================================================================
 * Merchant acquisition chart kit (assets/js/charts-plus.js): demos for the
 * #g-plus section of charts-gallery.html. English labels, illustrative
 * numbers from a fixed seed. No bank data, no names, no identifiers.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var root = document.getElementById('g-plus');
    if (!root) return;
    var C = MCD.charts;
    var $ = function (id) { return document.getElementById(id); };
    if (!C || typeof C.combo !== 'function' || !window.d3) {
      var err = document.createElement('p');
      err.className = 'g-err';
      err.textContent = 'The chart kit could not load: D3 or assets/js/charts-plus.js is missing.';
      root.appendChild(err);
      return;
    }
    var U = MCD.util && MCD.util.fmt;
    function fInt(v) { return U ? U.int(v) : String(Math.round(v)); }
    function fPct(v, d) { return U ? U.pct(v, d == null ? 0 : d) : (v * 100).toFixed(d || 0) + '%'; }

    var readout = $('p-readout');
    function say(kind, text) {
      readout.textContent = '› ';
      var b = document.createElement('b');
      b.textContent = kind;
      readout.appendChild(b);
      readout.appendChild(document.createTextNode(' ' + text));
    }

    /* kecamatan within 15 km of Mabes TNI Cilangkap (public names) and merchant types */
    var KEC = ['Cipayung', 'Ciracas', 'Pasar Rebo', 'Makasar', 'Kramat Jati', 'Duren Sawit', 'Cimanggis', 'Tapos', 'Jatisampurna', 'Pondok Gede', 'Pondok Melati', 'Jatiasih'];
    var KOTA = { Cipayung: 'Jakarta Timur', Ciracas: 'Jakarta Timur', 'Pasar Rebo': 'Jakarta Timur', Makasar: 'Jakarta Timur', 'Kramat Jati': 'Jakarta Timur', 'Duren Sawit': 'Jakarta Timur', Cimanggis: 'Depok', Tapos: 'Depok', Jatisampurna: 'Bekasi', 'Pondok Gede': 'Bekasi', 'Pondok Melati': 'Bekasi', Jatiasih: 'Bekasi' };
    var TYPES = [
      { key: 'food', label: 'Food & drink' }, { key: 'grocery', label: 'Grocery & retail' }, { key: 'services', label: 'Services' },
      { key: 'beauty', label: 'Beauty & care' }, { key: 'health', label: 'Health & pharmacy' }, { key: 'auto', label: 'Automotive' }
    ];
    var POT = { Cipayung: 1520, Ciracas: 1880, 'Pasar Rebo': 1360, Makasar: 1240, 'Kramat Jati': 1710, 'Duren Sawit': 1580, Cimanggis: 1290, Tapos: 980, Jatisampurna: 760, 'Pondok Gede': 1120, 'Pondok Melati': 640, Jatiasih: 820 };
    var WEIGHT = { food: 0.36, grocery: 0.29, services: 0.12, beauty: 0.08, health: 0.06, auto: 0.09 };
    var COV = { Cipayung: 0.5, Ciracas: 0.32, 'Pasar Rebo': 0.26, Makasar: 0.2, 'Kramat Jati': 0.17, 'Duren Sawit': 0.11, Cimanggis: 0.13, Tapos: 0.04, Jatisampurna: 0.08, 'Pondok Gede': 0.12, 'Pondok Melati': 0.07, Jatiasih: 0.06 };
    var TYPE_COV = { food: 0.72, grocery: 1.3, services: 0.9, beauty: 1.1, health: 1.55, auto: 0.8 };
    var NO_DATA = { 'Tapos|auto': 1, 'Jatiasih|health': 1, 'Pondok Melati|beauty': 1 };
    var TARGET = 0.25;

    var seed = 20261015, R;
    function prng(s) {
      var a = s >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function jitter(a, b) { return a + (b - a) * R(); }

    function makeData() {
      R = prng(seed);
      var d = { pot: [], acq: [], cov: [], grid: [], count: [], typeTot: {}, noData: 0 };
      TYPES.forEach(function (t) { d.typeTot[t.key] = { n: 0, a: 0 }; });
      KEC.forEach(function (k) {
        var row = [], crow = [], pot = 0, acq = 0;
        var kc = COV[k] * jitter(0.85, 1.15);
        TYPES.forEach(function (t) {
          var n = Math.max(6, Math.round(POT[k] * WEIGHT[t.key] * jitter(0.8, 1.2)));
          pot += n;
          crow.push(n);
          d.typeTot[t.key].n += n;
          if (NO_DATA[k + '|' + t.key]) { row.push(null); d.noData += n; return; }
          var a = Math.round(n * Math.min(0.9, kc * TYPE_COV[t.key] * jitter(0.8, 1.2)));
          acq += a;
          d.typeTot[t.key].a += a;
          row.push({ value: a / n, n: a, of: n });
        });
        d.pot.push(pot);
        d.acq.push(acq);
        d.cov.push(acq / pot);
        d.grid.push(row);
        d.count.push(crow);
      });
      d.potTot = d.pot.reduce(function (a, b) { return a + b; }, 0);
      d.acqTot = d.acq.reduce(function (a, b) { return a + b; }, 0);
      d.partly = Math.round(d.acqTot * jitter(0.15, 0.2));
      d.notYet = d.potTot - d.acqTot - d.noData;
      d.coverage = d.acqTot / d.potTot;
      d.newThisMonth = Math.round(jitter(120, 190));
      d.lvmOnly = Math.round(d.acqTot * jitter(0.7, 0.76));
      d.both = Math.round(d.acqTot * jitter(0.15, 0.19));
      d.edcOnly = d.acqTot - d.lvmOnly - d.both;
      return d;
    }

    var D = makeData();
    var state = 'imported';   // 'imported' | 'potential' (before the LVM file is imported)
    var barMode = 'grouped';
    var H = {};
    function imported() { return state === 'imported'; }
    function argMax(arr) { var i = 0; arr.forEach(function (v, k) { if (v > arr[i]) i = k; }); return i; }
    function argMin(arr) { var i = 0; arr.forEach(function (v, k) { if (v < arr[i]) i = k; }); return i; }
    function setText(id, t) { var n = $(id); if (n) n.textContent = t; }
    function hov(name) { return function (p) { if (p) say('hover', name + ' · ' + (p.category || p.label || (p.row ? p.row + ' × ' + p.col : p.key))); }; }

    /* ── bigNumber ── */
    function bnData() {
      if (!imported()) {
        return [
          { label: 'Merchants within 15 km', value: D.potTot, status: 'potential', note: 'Grocery stores, restaurants and SMEs on public maps.' },
          { label: 'Already acquired', value: null, status: 'noData', note: 'Shows after the LVM file is imported.' },
          { label: 'Coverage', value: null, format: 'pct', status: 'noData', note: 'Share of mapped merchants already acquired.' },
          { label: 'Still to acquire', value: D.potTot, status: 'potential', unit: 'merchants', note: 'All mapped merchants until the LVM file is matched.' }
        ];
      }
      var covTone = C.status.coverageTone(D.coverage);
      return [
        { label: 'Merchants within 15 km', value: D.potTot, status: null, note: 'Grocery stores, restaurants and SMEs on public maps.' },
        { label: 'Already acquired', value: D.acqTot, status: 'acquired', delta: D.newThisMonth, deltaLabel: 'new since Sep 2026', note: 'Matched to the branch Livin’ Merchant file.' },
        { label: 'Coverage', value: D.coverage, format: 'pct', status: covTone, delta: D.newThisMonth / D.potTot, deltaLabel: 'vs Sep 2026', note: 'Target ' + fPct(TARGET) + ' of mapped merchants (assumption).' },
        { label: 'Still to acquire', value: D.notYet, status: 'notYet', unit: 'merchants', note: 'No Livin’ Merchant or EDC Mandiri yet.' }
      ];
    }
    function drawBigNumbers() {
      bnData().forEach(function (cfg, i) {
        var full = { label: cfg.label, value: cfg.value, status: cfg.status, delta: cfg.delta == null ? null : cfg.delta, deltaLabel: cfg.deltaLabel || null, note: cfg.note, format: cfg.format || 'int', unit: cfg.unit || null };
        if (H['bn' + i]) H['bn' + i].update(full);
        else H['bn' + i] = C.bigNumber($('p-bn' + (i + 1)), full, { onClick: function (p) { say('click', 'bigNumber · ' + p.key); } });
      });
    }

    /* ── statusBar ── */
    function drawStatus() {
      var data = imported()
        ? { acquired: D.acqTot - D.partly, partly: D.partly, notYet: D.notYet, noData: D.noData, potential: null }
        : { acquired: null, partly: null, notYet: null, noData: null, potential: D.potTot };
      setText('pt-status', imported()
        ? fPct(D.coverage, 1) + ' of the ' + fInt(D.potTot) + ' merchants within 15 km are already acquired'
        : fInt(D.potTot) + ' merchants within 15 km are there to acquire');
      setText('ps-status', imported()
        ? 'Merchants within 15 km of Mabes TNI, count. Partly = in the LVM file with no transaction in the last 30 days.'
        : 'Merchants within 15 km of Mabes TNI, count. Import the LVM file to see which are already acquired.');
      var cfg = {
        label: 'Merchants within 15 km by acquisition status', unit: 'merchants', size: 'lg',
        labels: { partly: 'Partly (no transaction in 30 days)', noData: 'No data (address not matched)' },
        onClick: function (p) { say('click', 'statusBar · ' + p.label + ' · ' + fInt(p.value)); }, onHover: hov('statusBar')
      };
      if (H.status) H.status.update(data, cfg);
      else H.status = C.statusBar($('p-status'), data, cfg);
    }

    /* ── combo ── */
    function comboData() {
      var cats = KEC.map(function (k) { return { key: k, label: k, sub: KOTA[k] }; });
      if (!imported()) {
        return { categories: cats, bars: [{ key: 'potential', label: 'Merchants within 15 km (potential)', values: D.pot, color: 'potential' }], line: null, target: null };
      }
      var line = { label: 'Coverage', values: D.cov, axis: 'right', format: 'pct', status: 'coverage' };
      var target = { value: TARGET, label: 'Target ' + fPct(TARGET), axis: 'right' };
      if (barMode === 'stacked') {
        return {
          categories: cats,
          bars: [
            { key: 'acquired', label: 'Already acquired', values: D.acq, color: 'acquired' },
            { key: 'notYet', label: 'Not yet', values: D.pot.map(function (p, i) { return p - D.acq[i]; }), color: 'notYet' }
          ],
          line: line, target: target
        };
      }
      return {
        categories: cats,
        bars: [
          { key: 'total', label: 'Merchants within 15 km', values: D.pot, color: 'chart-3' },
          { key: 'acquired', label: 'Already acquired', values: D.acq, color: 'acquired' }
        ],
        line: line, target: target
      };
    }
    function drawCombo() {
      var hi = argMax(D.cov), lo = argMin(D.cov), big = argMax(D.pot);
      setText('pt-combo', imported()
        ? KEC[hi] + ' leads at ' + fPct(D.cov[hi], 1) + ' coverage; ' + KEC[lo] + ' trails at ' + fPct(D.cov[lo], 1)
        : KEC[big] + ' has the most merchants to acquire: ' + fInt(D.pot[big]));
      setText('ps-combo', imported()
        ? 'Merchants per kecamatan, count (bars, left axis) and coverage, % (line, right axis); dots coloured by coverage band'
        : 'Merchants per kecamatan, count. Coverage shows after the LVM file is imported.');
      var cfg = {
        label: 'Merchants and coverage by kecamatan', categoryLabel: 'Kecamatan', stacked: barMode === 'stacked',
        onClick: function (p) { say('click', 'combo · ' + p.category + (p.line != null ? ' · coverage ' + fPct(p.line, 1) : '')); H.heat.highlight({ row: p.key }); H.count.highlight({ row: p.key }); },
        onHover: hov('combo')
      };
      if (H.combo) H.combo.update(comboData(), cfg);
      else H.combo = C.combo($('p-combo'), comboData(), cfg);
    }

    /* ── heatmaps ── */
    function drawHeat() {
      var values = imported() ? D.grid : D.grid.map(function (r) { return r.map(function () { return null; }); });
      var worst = null;
      TYPES.forEach(function (t) { var tt = D.typeTot[t.key], c = tt.a / tt.n; if (!worst || c < worst.c) worst = { t: t, c: c }; });
      setText('pt-heat', imported()
        ? worst.t.label + ' is the widest gap: ' + fPct(worst.c, 1) + ' acquired across ' + KEC.length + ' kecamatan'
        : 'Coverage by type shows after the LVM file is imported');
      setText('ps-heat', 'Coverage, % of mapped merchants already acquired, by kecamatan and type');
      var data = { rows: KEC.map(function (k) { return { key: k, label: k }; }), cols: TYPES, values: values };
      var cfg = {
        scale: 'coverage', cellLabel: true, label: 'Coverage by kecamatan and merchant type', rowLabel: 'Kecamatan', valueLabel: 'Coverage', countLabel: 'Already acquired',
        onClick: function (p) { say('click', 'heatmap · ' + p.row + ' × ' + p.col + (p.value != null ? ' · ' + fPct(p.value, 1) : ' · no data')); },
        onHover: hov('heatmap')
      };
      if (H.heat) H.heat.update(data, cfg);
      else H.heat = C.heatmap($('p-heat'), data, cfg);

      var big = null;
      KEC.forEach(function (k, r) { D.count[r].forEach(function (n, c) { if (!big || n > big.n) big = { n: n, k: k, t: TYPES[c] }; }); });
      setText('pt-count', big.t.label + ' in ' + big.k + ' is the largest pool: ' + fInt(big.n) + ' merchants');
      var cdata = { rows: KEC.map(function (k) { return { key: k, label: k, sub: KOTA[k] }; }), cols: TYPES, values: D.count };
      var ccfg = { scale: 'count', unit: 'merchants', format: 'int', label: 'Merchants within 15 km by kecamatan and type', rowLabel: 'Kecamatan', onHover: hov('count'), onClick: function (p) { say('click', 'count · ' + p.row + ' × ' + p.col + ' · ' + fInt(p.value)); } };
      if (H.count) H.count.update(cdata, ccfg);
      else H.count = C.heatmap($('p-count'), cdata, ccfg);
    }

    /* ── donut and pie ── */
    var DONUT_COL = { food: 'chart-hl', grocery: 'chart-2', services: 'chart-3', beauty: 'chart-4', health: 'chart-1', auto: 'chart-5' };
    function drawDonut() {
      var slices = TYPES.map(function (t) { return { key: t.key, label: t.label, value: D.typeTot[t.key].n, color: DONUT_COL[t.key] }; });
      var top2 = (D.typeTot.food.n + D.typeTot.grocery.n) / D.potTot;
      setText('pt-donut', 'Food & drink and grocery make up ' + fPct(top2) + ' of the merchants');
      var data = { slices: slices, centerLabel: 'Merchants', centerValue: D.potTot };
      var cfg = {
        label: 'Merchants within 15 km by type', valueLabel: 'Merchants', categoryLabel: 'Type',
        onClick: function (p) {
          say('click', 'donut · ' + (p.selected ? 'filter on ' + p.label : 'filter cleared'));
          var key = p.selected ? p.key : null;
          H.heat.highlight(key ? { col: key } : null);
          H.count.highlight(key ? { col: key } : null);
        },
        onHover: hov('donut')
      };
      if (H.donut) H.donut.update(data, cfg);
      else H.donut = C.donut($('p-donut'), data, cfg);
    }
    function drawPie() {
      var data = imported()
        ? { slices: [
            { key: 'lvm', label: 'Livin’ Merchant only', value: D.lvmOnly, color: 'chart-2' },
            { key: 'both', label: 'Livin’ Merchant and EDC', value: D.both, color: 'chart-hl' },
            { key: 'edc', label: 'EDC Mandiri only', value: D.edcOnly, color: 'chart-4' }
          ] }
        : { slices: [] };
      setText('pt-pie', imported()
        ? fPct(D.lvmOnly / D.acqTot) + ' of acquired merchants use Livin’ Merchant only'
        : 'Products per merchant show after the LVM and EDC files are imported');
      setText('ps-pie', 'Acquired merchants, count, by Mandiri product');
      var cfg = {
        label: 'Acquired merchants by product', valueLabel: 'Merchants', categoryLabel: 'Product', emptyText: 'No data yet',
        onClick: function (p) { say('click', 'pie · ' + p.label + ' · ' + fInt(p.value)); }, onHover: hov('pie')
      };
      if (H.pie) H.pie.update(data, cfg);
      else H.pie = C.pie($('p-pie'), data, cfg);
    }

    function drawAll() { drawBigNumbers(); drawStatus(); drawHeat(); drawCombo(); drawDonut(); drawPie(); }
    drawAll();

    /* ── controls ── */
    function radio(attr, fn) {
      Array.prototype.forEach.call(root.querySelectorAll('[' + attr + ']'), function (b) {
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(root.querySelectorAll('[' + attr + ']'), function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
          fn(b.getAttribute(attr), b);
        });
      });
    }
    radio('data-ptheme', function (v) {
      document.documentElement.setAttribute('data-theme', v);
      if (C.tokens && typeof C.tokens.refresh === 'function') C.tokens.refresh();
      var G = MCD.gallery && MCD.gallery.handles;
      if (G) Object.keys(G).forEach(function (k) { var h = G[k]; if (h && typeof h.resize === 'function') { try { h.resize(); } catch (e) { /* older chart */ } } });
      say('theme', v === 'day' ? 'Day' : 'Night');
    });
    radio('data-pstate', function (v) {
      state = v;
      if (H.donut && typeof H.donut.select === 'function') H.donut.select(null);
      H.heat.highlight(null);
      H.count.highlight(null);
      drawAll();
      say('state', v === 'imported' ? 'LVM file imported' : 'Before import: potential only, in blue');
    });
    radio('data-pbars', function (v) {
      barMode = v;
      drawCombo();
      say('combo', v === 'stacked' ? 'Stacked bars' : 'Grouped bars');
    });
    $('p-shuffle').addEventListener('click', function () {
      seed = (seed * 1103515245 + 12345) >>> 0;
      D = makeData();
      drawAll();
      say('data', 'New illustrative numbers');
    });
    var cur = document.documentElement.getAttribute('data-theme');
    if (cur === 'day') Array.prototype.forEach.call(root.querySelectorAll('[data-ptheme]'), function (x) { x.setAttribute('aria-checked', x.getAttribute('data-ptheme') === 'day' ? 'true' : 'false'); });

    MCD.galleryPlus = { handles: H, data: function () { return D; } };
  });
})(window.MCD = window.MCD || {});
