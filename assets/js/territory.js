/* ==========================================================================
 * MCD.territory: the territory map per kecamatan (COPY_STYLE_EN items 11, 18, 20, 22, 23, 25).
 *
 * A calm map (item 23, decided by the branch on 16 Oct 2026): the street map or the greyscale satellite
 * stays visible everywhere. Nothing is filled, tinted or heat-coloured:
 *   - every kecamatan is a THIN GREY OUTLINE (1 px, about 40% opacity; 1.5 px from zoom 12), drawn once per
 *     border; thin kelurahan lines from zoom 12.5;
 *   - a small white label chip "Cipayung · 962 merchant" (dark glass at night), decluttered so chips never
 *     overlap; after the LVM import the chip carries a small coloured dot for the kecamatan's coverage
 *     third (green / amber / red, grey = not ranked) and the legend says it in words;
 *   - the top 3 kecamatan to visit get a small navy number badge "1", "2", "3" on their chip;
 *   - hovering a kecamatan darkens its outline; the selected kecamatan gets a 2 px Mandiri-navy outline
 *     on a light casing, and a calm popup (its numbers, the rank in words, the section's actions and
 *     "Buka di Google Maps"), which closes on Esc, a click outside or "Tutup".
 * An invisible shape per kecamatan (id <id>-kec-fill, kept for the click and the tooltip) is never painted.
 * The map stays flat and north-up: nothing here extrudes, tilts or animates beyond a short fade.
 *
 * data/territory-hex.js stays loaded as an INTERNAL spatial index only (UX fix plan D1): its cells
 * count the public listings per kecamatan and kelurahan. They are never drawn and never named.
 *
 * Nothing is registered at load. Sections call it from their own registrations:
 *
 *   var stats = MCD.territory.statsFromRecords(MCD.data.lvm, MCD.data.edc);   // or stats({...})
 *   var off = MCD.map.registerLayers('merchants', function (derived, ms) {
 *     return MCD.territory.layers({ id: 'merchants-territory', ms: ms, stats: stats, selected: kecId });
 *   }, { id: 'territory' });
 *   MCD.map.registerLegend('merchants', function (d, ms) { return MCD.territory.legendGroups({ ms: ms, stats: stats }); });
 *   var unbind = MCD.territory.bind({ stats: function () { return stats; },
 *     actions: function (kecId) { return [{ label: 'Lihat merchant di kecamatan ini', run: fn, primary: true }]; } });
 *
 * API
 *   ready() → bool · ensureData() → Promise<bool>
 *   kecamatan() → [{id, name, kota, kotaName, label, potential, in15, distKm}] (the kecamatan that reach 15 km)
 *   kecamatanIdOf(text, kotaText?) → Kemendagri id | null   (LVM text such as "Kramatjati (Kramat Jati)")
 *   boundsOf(kecamatanId) → [[w, s], [e, n]] | null
 *   stats(input) → Stats · statsFromRecords(lvmRows, edcRows, opts?) → Stats
 *   layers(opts) → {base, top}   opts {id, ms, stats, selected, labels, kelurahan, outside: 'outline' | 'hide',
 *                                 labelText(kec, kecStats) → string, priority: [kecId, …], pickable, dots}
 *                                 ids <id>-kec-fill (invisible, pickable), <id>-kec-border, <id>-kel, <id>-hover,
 *                                 <id>-sel-casing, <id>-sel, <id>-labels (+ <id>-labels-rank, <id>-labels-dot,
 *                                 <id>-labels-rank-dot, <id>-labels-badge, which follow their chips);
 *                                 pick kind 'territory-kec' with id = kecamatanId. The old options tiles, mode,
 *                                 fill, kecFill and glow are accepted and ignored: nothing is ever filled.
 *   hovered() → the kecamatan id under the pointer (sections add it to their layer cache key)
 *   priority(stats, {n}) → [{rank, id, name, kota, potential, notYet, coverage, band, ranked, distKm, why, gmaps}]
 *                                 the ONE "where to go next" ranking (UX fix plan A-06, D4)
 *   popup(kecId, {stats, x, y, title?, rows?, big?, chip?, actions?}) → {el, close} · closePopup()
 *   bind({stats, popup?(kecId, kecStats) → spec, actions?(kecId) → [{label, run, primary?}], onPick?, onClose?}) → off()
 *   Item 43 (LAYOUT_V5C): with MCD.windows the popup is a callout (MCD.windows.callout) on every width: at most 3
 *                                 numbers (spec.brief {numbers, chips, note} or the big value and two rows), the main
 *                                 action, "Detail ›" (an action {id: 'detail', run}; else a generic kecamatan card,
 *                                 MCD.windows.sheet) and "Buka di Google Maps" in words. openBound(kecId) reopens it
 *                                 with the options of the section bound now. Without MCD.windows: the popup, as before.
 *   legendGroups(spec) → map legend groups · legend(spec) → DOM legend
 *   hit(pickOrCoord) → {kecamatanId, kecamatan, kelurahan, kota, coordinate} | null · tooltip(kecId, stats)
 *   relativeWords(rel) · rankOf(stats, id, level?) · thirdText(stats, id, level?) · terciles(values)
 *   gmapsQuery(kecId) → "Kecamatan Ciracas, Kota Jakarta Timur" (item 22, D17)
 *   zones() → {focus, ring, isFocus, isRing, zoneOf, focusOutline(), unionOutline(), labels()} · zoneOf(id) → 'focus' |
 *                                 'ring' | 'beyond' (item 30, from data/admin-areas.js: focus = in15 >= 0.5, ring = the
 *                                 neighbours through shared arcs). layers() draws the ring's quieter outline
 *                                 (<id>-ring-border) and muted name-only chips (<id>-labels-ring) unless outside:'hide' or
 *                                 zones:false; a ring kecamatan is clickable and its popup says
 *                                 "Sebagian besar wilayahnya di luar 15 km" (or "Di luar 15 km" when nothing of it is inside),
 *                                 with "n merchant dalam 15 km" from merchant stats (stats.unit 'merchant').
 *   The popup's "Jarak dari KCP" row uses MCD.distance (normal traffic, the shared Jam sibuk / Motor switches; it
 *                                 updates while the popup is open).
 *   Internal (kept for the statistics, never shown): tiles(), tileAt(), tileOfPoi(), stats().tiles
 *
 * Stats (input → output)
 *   input  {acquired: iterable of MCD_SME_POIS row indices already acquired (LVM matched; null = file not
 *           imported), edc: iterable of row indices with an EDC Mandiri terminal, unlisted: [{lon, lat} |
 *           {kecamatanId} | {kecamatan, kota}] acquired merchants with no public listing, categories:
 *           ['restaurant' | 'grocery' | 'other'], rule: 'known' (default) | 'listed', bands, demo,
 *           bandMode: 'relative' (default) | 'absolute', minInFocus (default 0.5)}
 *   output {hasBank, demo, key, rule, bands, bandMode, relative: {kecamatan, kelurahan}, totals,
 *           kecamatan: {id: AreaStats}, kelurahan: {id: AreaStats}}
 *   AreaStats {potential, acquired, notYet, edc, unlisted, coverage (0-1 | null), band, bandAbs, ranked}
 *   coverage 'known' = (acquired + unlisted) / (potential + unlisted): LVM merchants ÷ (public merchants +
 *   LVM merchants with no public listing) (COPY_STYLE_EN item 18); 'listed' = acquired / potential.
 *   band = 'acquired' | 'partly' | 'notYet' | 'noData', or 'potential' / 'noData' before the import.
 *   Relative bands (default): the kecamatan with at least minInFocus of their area inside 15 km are ranked by
 *   coverage; top third green ('acquired'), middle third amber ('partly'), bottom third red ('notYet'); ties
 *   share the lower band; the rest grey ('noData'). Fewer than 3 different values: the fixed bands apply.
 *
 * Safe DOM only (MCD.util.el / textContent), classic IIFE, CSP-safe, tokens only in the injected CSS.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var KIND = 'territory-kec';
  var CATS = ['restaurant', 'grocery', 'other'];
  var CAT_LABEL = { restaurant: 'Restoran & warung makan', grocery: 'Toko kelontong & ritel', other: 'UMKM lainnya' };
  var BREAKS = [1, 3, 6, 11, 21, 41];                 // kept for older callers (density steps); not drawn here
  var BREAK_LABELS = ['1–2', '3–5', '6–10', '11–20', '21–40', '41+'];
  var DEFAULT_BANDS = { ok: 0.5, mid: 0.2 };
  var BRANCH_KEC = '31.75.10';                        // Cipayung: the kecamatan of KCP Cilangkap (A-04)
  var NEAR_KM = 7;                                    // label priority: the kecamatan around the branch
  var DATA_FILES = [['MCD_ADMIN_AREAS', 'data/admin-areas.js'], ['MCD_TERRITORY_HEX', 'data/territory-hex.js']];
  var FONT_SANS = '"Inter Tight", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var GMAPS_BASE = 'https://www.google.com/maps/search/?api=1&query=';

  /* Status colours as RGB for deck layers. They mirror the --status-* tokens of assets/css/tokens.css
     (tests compare them). 'night' is used on the dark street map and on the satellite (Detail, both
     themes); 'day' on the light street map, like map.js's own palette. */
  var STATUS = {
    night: { ok: [47, 184, 121], mid: [240, 169, 46], bad: [238, 90, 79], none: [111, 123, 144], potential: [76, 141, 246] },
    day: { ok: [18, 118, 74], mid: [184, 115, 0], bad: [194, 57, 46], none: [93, 104, 121], potential: [31, 95, 209] }
  };
  var INK = {
    night: { canvas: [5, 8, 15], text1: [237, 239, 243], text2: [182, 191, 206], text3: [152, 163, 181], gold: [242, 183, 5], white: [255, 255, 255] },
    day: { canvas: [253, 251, 246], text1: [14, 30, 54], text2: [59, 74, 98], text3: [77, 89, 107], gold: [138, 97, 0], white: [255, 255, 255] }
  };

  /* ------------------------------------------------------------- helpers */

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isFn(f) { return typeof f === 'function'; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function admin() { return W.MCD_ADMIN_AREAS || null; }
  function hexData() { return W.MCD_TERRITORY_HEX || null; }
  function pois() { return W.MCD_SME_POIS || null; }
  function doc() { return W.document || null; }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function rgba(rgb, a) { return [rgb[0], rgb[1], rgb[2], a == null ? 255 : a]; }
  function css(rgb, a) { return a == null ? 'rgb(' + rgb.join(',') + ')' : 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }
  function F() { return (MCD.util && MCD.util.fmt) || null; }
  function fmtInt(n) {
    var f = F();
    if (f && isFn(f.int)) return f.int(n);
    return isNum(n) ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '—';
  }
  /* Whole percent, one decimal under 10% (1,7% vs 2,4%), two when one would round a positive share to zero (0,04%). */
  function pctDigits(x) { return x > 0 && x * 100 < 0.05 ? 2 : (x > 0 && x < 0.095 ? 1 : 0); }
  function fmtPct(x) {
    if (!isNum(x)) return '—';
    var d = pctDigits(x), f = F();
    if (f && isFn(f.pct)) return f.pct(x, d);
    return (Math.round(x * 100 * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',') + '%';
  }
  function fmtKm(km) {
    if (!isNum(km)) return '—';
    var f = F();
    if (f && isFn(f.km)) return f.km(km);
    return km.toFixed(1).replace('.', ',') + ' km';
  }
  function bands(b) {
    var c = b || (MCD.config && MCD.config.coverageBands) || DEFAULT_BANDS;
    return { ok: isNum(c.ok) ? c.ok : DEFAULT_BANDS.ok, mid: isNum(c.mid) ? c.mid : DEFAULT_BANDS.mid };
  }
  function pctWord(x) { return Math.round(x * 100) + '%'; }
  function groupCat(g) { g = g | 0; return g === 0 ? 0 : (g === 1 ? 1 : (g >= 2 && g <= 11 ? 2 : -1)); }
  /* "Kota Jakarta Timur", "Kab. Bogor", "Kota Bogor": short, but never ambiguous (two Bogor, two Bekasi, two Tangerang) */
  function kotaLabel(k) {
    if (!k) return '';
    var s = k.short || k.name || '';
    return k.kind === 'kabupaten' ? 'Kab. ' + s : (k.kind === 'kota' ? 'Kota ' + s : s);
  }
  /* the same, spelled out for a search engine: "Kabupaten Bogor" */
  function kotaLong(k) {
    if (!k) return '';
    var s = k.short || k.name || '';
    return k.kind === 'kabupaten' ? 'Kabupaten ' + s : (/^kota/.test(k.kind || '') ? 'Kota ' + s : s);
  }
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/^\s*(kec(amatan)?\.?|kab(upaten)?\.?|kota( administrasi)?|kel(urahan)?\.?)\s+/, '')
      .replace(/[^a-z]/g, '');
  }

  /* ------------------------------------------------------------- "Buka di Google Maps" (item 22, UX fix plan §2.8)
     Coordinates only for a point (exact pin, nothing about a bank customer is sent); a kecamatan by name and
     kota so Google shows its outline. Links are plain navigation in a new tab: no fetch, no connect-src change. */
  var GMAPS_TIP = 'Buka lokasi ini di Google Maps, di tab baru. Perlu internet.';
  var GMAPS_APPROX = 'Titik perkiraan di tengah kelurahan. File LVM tidak memuat koordinat.';
  function coordOf(v) {
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  function r5(v) { var s = String(Math.round(v * 1e5) / 1e5); return s === '-0' ? '0' : s; }
  function gmapsUrl(t) {
    if (!t || typeof t !== 'object') return null;
    if (t.q != null) {
      var q = String(t.q).replace(/\s+/g, ' ').trim();
      return q ? GMAPS_BASE + encodeURIComponent(q) : null;
    }
    var lat = coordOf(t.lat), lon = coordOf(t.lon);
    if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) return null;
    return GMAPS_BASE + r5(lat) + ',' + r5(lon);
  }
  function gmapsLink(t, opts) {
    opts = opts || {};
    var url = gmapsUrl(t), d = doc();
    if (!url || !d) return null;
    var a = d.createElement('a');
    a.className = 'btn btn--secondary gmaps-link' + (opts.compact ? ' gmaps-link--icon' : '') + (opts.className ? ' ' + opts.className : '');
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    var label = opts.label || (t && t.approx || opts.approx ? 'Buka area di Google Maps' : 'Buka di Google Maps');
    a.setAttribute('title', (opts.approx || (t && t.approx) ? GMAPS_APPROX + ' ' : '') + GMAPS_TIP);
    if (opts.compact) a.setAttribute('aria-label', opts.ariaLabel || label);
    if (d.createElementNS) {
      var svg = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'icon');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var use = d.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#i-external');
      svg.appendChild(use);
      a.appendChild(svg);
    }
    if (!opts.compact) {
      var sp = d.createElement('span');
      sp.textContent = label;
      a.appendChild(sp);
    }
    return a;
  }
  var GMAPS = { url: gmapsUrl, link: gmapsLink, TIP: GMAPS_TIP, APPROX_NOTE: GMAPS_APPROX };
  /* The contract lives on MCD.util.gmaps (UX fix plan §4.1). util.js may define it; this keeps it available either way. */
  if (MCD.util && !MCD.util.gmaps) MCD.util.gmaps = GMAPS;

  /* ------------------------------------------------------------- data index */

  var IX = null, PIX = null;

  function ready() {
    var A = admin(), H = hexData();
    return !!(A && A.topology && isFn(A.locate) && H && H.rows && isFn(H.tiles));
  }

  function index() {
    if (IX) return IX;
    if (!ready()) return null;
    var A = admin(), H = hexData(), tiles = H.tiles(), n = tiles.length;
    var CELL = 0.01, grid = {}, byId = {}, bbox = new Float64Array(n * 4), kecTiles = {};
    for (var i = 0; i < n; i++) {
      var t = tiles[i], ring = t.polygon[0], x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (var k = 0; k < ring.length; k++) {
        var p = ring[k];
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      }
      bbox[i * 4] = x0; bbox[i * 4 + 1] = y0; bbox[i * 4 + 2] = x1; bbox[i * 4 + 3] = y1;
      byId[t.id] = i;
      (kecTiles[t.kecamatanId] = kecTiles[t.kecamatanId] || []).push(i);
      for (var gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++)
        for (var gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++) (grid[gx + ':' + gy] = grid[gx + ':' + gy] || []).push(i);
    }
    var kec = [], kecById = {};
    H.kecamatan.forEach(function (r) {
      var rec = A.byId(r.id), kota = A.byId(r.kota);
      var o = { id: r.id, name: r.name, kota: r.kota, kotaName: kotaLabel(kota), label: r.label,
        potential: r.merchants, tiles: r.tiles, in15: r.in15, distKm: rec ? rec.distKm : null };
      kec.push(o); kecById[r.id] = o;
    });
    var kelIndex = {};
    A.kelurahan.forEach(function (r, j) { kelIndex[r.id] = j; });
    var meta = H.meta || {};
    IX = { A: A, H: H, tiles: tiles, n: n, grid: grid, cell: CELL, bbox: bbox, byId: byId, kecTiles: kecTiles,
      kec: kec, kecById: kecById, kelIndex: kelIndex,
      hexKm2: (meta.hex && meta.hex.areaKm2) || 0.1754, kx: (meta.hex && meta.hex.kx) || 110.64, ky: (meta.hex && meta.hex.ky) || 110.574 };
    return IX;
  }

  function inRings(x, y, rings) {
    var c = false;
    for (var q = 0; q < rings.length; q++) {
      var r = rings[q];
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
        var xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
    }
    return c;
  }

  /* Same rule as tools/build-territory-hex.py: first tile of the kecamatan (file order) containing the
     point; a point just outside every tile of its kecamatan (vertices rounded to 1e-5 degree) goes to
     the tile whose edge is nearest. */
  function tileIn(kecId, lon, lat) {
    var ix = index();
    if (!ix || !ix.kecTiles[kecId]) return -1;
    var list = ix.grid[Math.floor(lon / ix.cell) + ':' + Math.floor(lat / ix.cell)] || [];
    for (var k = 0; k < list.length; k++) {
      var i = list[k], b = i * 4;
      if (ix.tiles[i].kecamatanId !== kecId) continue;
      if (lon < ix.bbox[b] || lon > ix.bbox[b + 2] || lat < ix.bbox[b + 1] || lat > ix.bbox[b + 3]) continue;
      if (inRings(lon, lat, ix.tiles[i].polygon)) return i;
    }
    var best = -1, bestD = Infinity, own = ix.kecTiles[kecId], KX = ix.kx, KY = ix.ky;
    for (var m = 0; m < own.length; m++) {
      var rings = ix.tiles[own[m]].polygon;
      for (var q = 0; q < rings.length; q++) {
        var r = rings[q];
        for (var e = 0; e < r.length; e++) {
          var p1 = r[e === 0 ? r.length - 1 : e - 1], p2 = r[e];
          var dx = (p2[0] - p1[0]) * KX, dy = (p2[1] - p1[1]) * KY, px = (lon - p1[0]) * KX, py = (lat - p1[1]) * KY;
          var L = dx * dx + dy * dy, t = L > 0 ? (px * dx + py * dy) / L : 0;
          t = t > 1 ? 1 : (t < 0 ? 0 : t);
          var ex = px - t * dx, ey = py - t * dy, d = ex * ex + ey * ey;
          if (d < bestD) { best = own[m]; bestD = d; }
        }
      }
    }
    return best;
  }

  /* Every public listing of MCD_SME_POIS → tile index and kelurahan index (built once, ~40 ms). */
  function poiIndex() {
    var P = pois(), ix = index();
    if (!P || !P.rows || !ix) return null;
    if (PIX && PIX.src === P.rows) return PIX;
    var rows = P.rows, n = rows.length, tile = new Int32Array(n), kel = new Int32Array(n), cat = new Int8Array(n);
    /* merchants only (the visit-list rule of MCD.lvm, as data/admin-areas.js and data/territory-hex.js count them) */
    var L = MCD.lvm, X = null;
    try { X = L && typeof L.match === 'function' ? L.match().X : null; } catch (e) { X = null; }
    if (X && X.n !== n) X = null;
    for (var i = 0; i < n; i++) {
      var r = rows[i], c = groupCat(r[2]);
      if (X && !X.ok[i]) c = -1;
      tile[i] = -1; kel[i] = -1; cat[i] = c;
      if (c < 0) continue;
      var loc = ix.A.locate(r[0], r[1]);
      if (!loc) continue;
      kel[i] = ix.kelIndex[loc.kelurahanId] != null ? ix.kelIndex[loc.kelurahanId] : -1;
      tile[i] = tileIn(loc.kecamatanId, r[0], r[1]);
    }
    PIX = { src: rows, tile: tile, kel: kel, cat: cat, n: n };
    return PIX;
  }

  function tiles() { var ix = index(); return ix ? ix.tiles : []; }
  function tileIndexOf(x) {
    var ix = index();
    if (!ix || x == null) return -1;
    if (isNum(x)) return x >= 0 && x < ix.n ? x : -1;
    if (typeof x === 'string') return ix.byId[x] != null ? ix.byId[x] : -1;
    if (x.id != null && ix.byId[x.id] != null) return ix.byId[x.id];
    return -1;
  }
  function tile(id) { var i = tileIndexOf(id); return i >= 0 ? index().tiles[i] : null; }
  function tileAt(lon, lat) {
    var ix = index();
    if (!ix || !isNum(lon) || !isNum(lat)) return null;
    var loc = ix.A.locate(lon, lat);
    if (!loc || !ix.kecTiles[loc.kecamatanId]) return null;
    var i = tileIn(loc.kecamatanId, lon, lat);
    return i >= 0 ? ix.tiles[i] : null;
  }
  function tileOfPoi(row) {
    var p = poiIndex();
    if (!p || !isNum(row) || row < 0 || row >= p.n) return null;
    var i = p.tile[row];
    return i >= 0 ? index().tiles[i] : null;
  }
  function kecamatan() { var ix = index(); return ix ? ix.kec.slice() : []; }

  /* LVM text → Kemendagri kecamatan id. Handles "Kramatjati (Kramat Jati)", "Kec. Pasar Rebo", OSM / BPS
     spellings kept in 'alt', and repeated names (two Cipayung): the kota text decides, else the nearer one. */
  var NAME_IX = null;
  function nameIndex() {
    if (NAME_IX) return NAME_IX;
    var A = admin();
    if (!A || !A.kecamatan) return null;
    var map = {};
    A.kecamatan.forEach(function (r) {
      var names = [r.name].concat(r.alt || []);
      names.forEach(function (nm) { var k = norm(nm); if (k) (map[k] = map[k] || []).push(r); });
    });
    NAME_IX = map;
    return map;
  }
  function kecamatanIdOf(text, kotaText) {
    var map = nameIndex(), A = admin();
    if (!map || text == null) return null;
    var s = String(text), parts = [s];
    var m = /^(.*?)\(([^)]*)\)\s*$/.exec(s);
    if (m) parts = [m[1], m[2], s.replace(/[()]/g, ' ')];
    var cand = [];
    for (var i = 0; i < parts.length && !cand.length; i++) { var k = norm(parts[i]); if (k && map[k]) cand = map[k].slice(); }
    if (!cand.length) {
      /* a shortened name ("Mampang" for Mampang Prapatan) when exactly one kecamatan name starts with it */
      var k0 = norm(parts[0]), pre = [];
      if (k0.length >= 5) Object.keys(map).forEach(function (key) { if (key.indexOf(k0) === 0) pre = pre.concat(map[key]); });
      var uniq = {};
      pre.forEach(function (r) { uniq[r.id] = r; });
      cand = Object.keys(uniq).map(function (id) { return uniq[id]; });
      if (cand.length > 1 && !kotaText) return null;
    }
    if (!cand.length) return null;
    if (cand.length > 1 && kotaText) {
      var kt = norm(kotaText);
      var hit = cand.filter(function (r) {
        var ko = A.byId(r.kota);
        if (!ko) return false;
        var a = norm(ko.short || ''), b = norm(ko.name || '');
        return (a && (kt.indexOf(a) >= 0 || a.indexOf(kt) >= 0)) || (b && (kt.indexOf(b) >= 0 || b.indexOf(kt) >= 0));
      });
      if (hit.length) cand = hit;
    }
    cand.sort(function (a, b) { return (a.distKm || 0) - (b.distKm || 0); });
    return cand[0].id;
  }

  function boundsOf(kecId) {
    var A = admin(), rec = A && A.byId(kecId);
    if (!rec) return null;
    var c = A.coordinates(rec), polys = rec.geometry.type === 'Polygon' ? [c] : c;
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    polys.forEach(function (p) { p[0].forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); });
    return [[b[0], b[1]], [b[2], b[3]]];
  }

  /* ------------------------------------------------------------- zones (COPY_STYLE_EN item 30) */

  /* Three zones, per kecamatan, computed from data/admin-areas.js (never hard-coded):
       focus  = the kecamatan with at least half of their area inside 15 km of Mabes TNI (in15 >= 0.5);
       ring   = the kecamatan outside the focus that share a border arc with a focus kecamatan (the first
                adjacency ring: Kebayoran Lama is in it, Pesanggrahan beside it is not);
       beyond = everything else, including the ground outside the 30 km dataset.
     The outlines of the focus and of focus ∪ ring are chained from the border arcs that have the set on one
     side only, each arc used once, so the soft shade and the veil (map.js) are clean polygons with the area
     as a hole: no seams where kecamatan polygons meet. Rings follow GeoJSON winding: exterior rings are
     counter-clockwise (the area on the left), holes clockwise. */
  var ZONES = null;
  function ringArea(r) {
    var a = 0;
    for (var i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    return a / 2;
  }
  /** outline(inSet) → {outer: [ring…], holes: [ring…], arcs: n} of the union of the kecamatan where inSet(id). */
  function outline(A, inSet) {
    var segs = [];
    (A.borders && A.borders.kecamatan || []).forEach(function (b) {
      var l = !!(b[1] && inSet(b[1])), r = !!(b[2] && inSet(b[2]));
      if (l === r) return;
      var pts = A.arc(b[0]);
      if (!pts || pts.length < 2) return;
      segs.push(l ? pts : pts.slice().reverse());          /* the set on the left of every piece */
    });
    var key = function (p) { return p[0].toFixed(6) + ',' + p[1].toFixed(6); };
    var byStart = {};
    segs.forEach(function (s, i) { (byStart[key(s[0])] = byStart[key(s[0])] || []).push(i); });
    var used = [], outer = [], holes = [], open = 0;
    for (var i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      var ring = [], cur = i, start = key(segs[i][0]), closed = false;
      while (cur != null) {
        used[cur] = true;
        var s = segs[cur];
        for (var k = ring.length ? 1 : 0; k < s.length; k++) ring.push(s[k]);
        var end = key(s[s.length - 1]);
        if (end === start) { closed = true; break; }
        var next = (byStart[end] || []).filter(function (j) { return !used[j]; });
        cur = next.length ? next[0] : null;
      }
      if (!closed) open++;
      if (ring.length < 4) continue;
      if (key(ring[0]) !== key(ring[ring.length - 1])) ring.push(ring[0].slice());
      (ringArea(ring) >= 0 ? outer : holes).push(ring);
    }
    return { outer: outer, holes: holes, arcs: segs.length, open: open };
  }
  /** zones() → {focus: [id], ring: [id], zoneOf(id), isFocus(id), isRing(id), focusOutline, unionOutline, labels} | null. */
  function zones() {
    if (ZONES) return ZONES;
    var A = admin();
    if (!A || !Array.isArray(A.kecamatan) || !A.borders || !isFn(A.arc)) return null;
    var focus = {}, ring = {};
    A.kecamatan.forEach(function (k) { if ((k.in15 || 0) >= 0.5) focus[k.id] = 1; });
    (A.borders.kecamatan || []).forEach(function (b) {
      var L = b[1], R = b[2];
      if (!L || !R) return;
      if (focus[L] && !focus[R]) ring[R] = 1;
      else if (focus[R] && !focus[L]) ring[L] = 1;
    });
    var fo = null, uo = null;
    ZONES = {
      focus: Object.keys(focus).sort(), ring: Object.keys(ring).sort(),
      isFocus: function (id) { return !!focus[id]; },
      isRing: function (id) { return !!ring[id]; },
      zoneOf: function (id) { return focus[id] ? 'focus' : (ring[id] ? 'ring' : 'beyond'); },
      /* chained once, on first use */
      focusOutline: function () { return fo || (fo = outline(A, function (id) { return !!focus[id]; })); },
      unionOutline: function () { return uo || (uo = outline(A, function (id) { return !!(focus[id] || ring[id]); })); },
      /** the label point of every focus and ring kecamatan: [{id, name, zone, position, distKm, in15}] */
      labels: function () {
        return Object.keys(focus).concat(Object.keys(ring)).map(function (id) {
          var r = A.byId(id);
          return r && Array.isArray(r.label) ? { id: id, name: r.name, zone: focus[id] ? 'focus' : 'ring', position: r.label, distKm: r.distKm, in15: r.in15 || 0 } : null;
        }).filter(Boolean);
      }
    };
    return ZONES;
  }
  /** A kecamatan of the index (the 50 that reach 15 km) or of the ring, in the index record shape
      {id, name, kota, kotaName, label, potential, in15, distKm}; null for the zone beyond. */
  var ZK = {};
  function zoneKec(kecId) {
    var ix = index(), k = ix && kecId ? ix.kecById[kecId] : null;
    if (k || !kecId) return k || null;
    if (ZK[kecId]) return ZK[kecId];
    var z = zones(), A = admin(), r = A && A.byId(kecId);
    if (!z || !r || !z.isRing(kecId)) return null;
    ZK[kecId] = { id: r.id, name: r.name, kota: r.kota, kotaName: kotaLabel(A.byId(r.kota)), label: r.label, potential: 0, in15: r.in15 || 0, distKm: r.distKm };
    return ZK[kecId];
  }
  function isRingKec(kecId) { var z = zones(); return !!(z && z.isRing(kecId)); }

  /* ------------------------------------------------------------- statistics */

  function toList(x) {
    if (x == null) return [];
    if (Array.isArray(x)) return x;
    if (typeof x.forEach === 'function') { var out = []; x.forEach(function (v) { out.push(v); }); return out; }
    return [];
  }
  function bandOf(cov, b, hasBank, potential) {
    if (!hasBank) return potential > 0 ? 'potential' : 'noData';
    if (!isNum(cov)) return 'noData';
    return cov >= b.ok ? 'acquired' : (cov >= b.mid ? 'partly' : 'notYet');
  }
  function area(potential, acquired, edc, unlisted, hasBank, rule, b) {
    var cov = null;
    if (hasBank) {
      var num = rule === 'listed' ? acquired : acquired + unlisted, den = rule === 'listed' ? potential : potential + unlisted;
      cov = den > 0 ? Math.min(1, num / den) : null;
    }
    var band = bandOf(cov, b, hasBank, potential);
    return { potential: potential, acquired: hasBank ? acquired : null, notYet: hasBank ? Math.max(0, potential - acquired) : null,
      edc: hasBank ? edc : null, unlisted: hasBank ? unlisted : null, coverage: cov, band: band, bandAbs: band, ranked: false };
  }

  /* Relative bands (COPY_STYLE_EN item 18): terciles of the coverage values. Needs 3 or more values with
     3 or more different numbers and a real middle third (lo < hi), else null (the fixed bands apply).
     lo / hi: the highest value of the red and of the amber third; ties share the lower band. */
  function terciles(values) {
    var v = [];
    toList(values).forEach(function (x) { if (isNum(x)) v.push(x); });
    v.sort(function (a, c) { return a - c; });
    var n = v.length, distinct = 0;
    for (var i = 0; i < n; i++) if (!i || v[i] !== v[i - 1]) distinct++;
    if (n < 3 || distinct < 3) return null;
    var lo = v[Math.ceil(n / 3) - 1], hi = v[Math.ceil(2 * n / 3) - 1];
    return lo < hi ? { lo: lo, hi: hi, n: n, min: v[0], max: v[n - 1] } : null;   // ties fill two thirds: no real middle third
  }
  function relBand(c, t) { return c <= t.lo ? 'notYet' : (c <= t.hi ? 'partly' : 'acquired'); }
  /** Ranks entries {id: AreaStats} in place; focusOf(id) → share of the area within 15 km. → {applied, lo, hi, n, minInFocus}. */
  function rankAreas(entries, focusOf, minIn) {
    var ids = Object.keys(entries).filter(function (id) {
      var e = entries[id];
      return e.potential > 0 && isNum(e.coverage) && (focusOf(id) || 0) >= minIn;
    });
    var t = terciles(ids.map(function (id) { return entries[id].coverage; }));
    if (!t) return { applied: false, n: ids.length, minInFocus: minIn };
    var keep = {};
    ids.forEach(function (id) { keep[id] = 1; var e = entries[id]; e.band = relBand(e.coverage, t); e.ranked = true; });
    Object.keys(entries).forEach(function (id) { if (!keep[id] && entries[id].band !== 'noData') entries[id].band = 'noData'; });
    return { applied: true, lo: t.lo, hi: t.hi, n: t.n, minInFocus: minIn };
  }

  /** stats(input) — see the header. Cheap enough to call on every data change (one pass over the inputs). */
  function stats(input) {
    input = input || {};
    var ix = index();
    var b = bands(input.bands), rule = input.rule === 'listed' ? 'listed' : 'known';
    var bandMode = input.bandMode === 'absolute' ? 'absolute' : 'relative';
    var minIn = isNum(input.minInFocus) ? clamp(input.minInFocus, 0, 1) : 0.5;
    var catOn = [true, true, true];
    if (Array.isArray(input.categories) && input.categories.length) catOn = CATS.map(function (c) { return input.categories.indexOf(c) >= 0; });
    var hasBank = input.acquired != null || input.hasBank === true;
    /* unit 'merchant': these counts are public merchants inside 15 km (MCD_SME_POIS), so the outer-ring popup may say
       "n merchant dalam 15 km"; a section's own stats (Sekolah) have no unit and show no count there */
    var out = { unit: 'merchant', hasBank: hasBank, demo: !!input.demo, rule: rule, bands: b, bandMode: bandMode, relative: { kecamatan: null, kelurahan: null, tile: null },
      categories: CATS.filter(function (c, i) { return catOn[i]; }),
      totals: area(0, 0, 0, 0, hasBank, rule, b), kecamatan: {}, kelurahan: {}, key: 'none', tileStats: function () { return null; } };
    if (!ix) return out;
    var n = ix.n, pot = new Int32Array(n), acq = new Int32Array(n), edc = new Int32Array(n), unl = new Int32Array(n);
    for (var i = 0; i < n; i++) {
      var tp = ix.tiles[i].potential;
      pot[i] = (catOn[0] ? tp.restaurant : 0) + (catOn[1] ? tp.grocery : 0) + (catOn[2] ? tp.other : 0);
    }
    var A = ix.A, kelPot = {}, kelAcq = {}, kelEdc = {}, kelUnl = {}, kecUnl = {}, kecAcqX = {};
    var P = pois(), px = (input.acquired != null || input.edc != null) ? poiIndex() : null, sig = 0, unlocated = 0;
    var seen = {};
    function addPoi(list, arr, kelArr, tag) {
      toList(list).forEach(function (row) {
        if (!px || !isNum(row) || row < 0 || row >= px.n) return;
        var key = tag + row;
        if (seen[key]) return;
        seen[key] = 1;
        var c = px.cat[row];
        if (c < 0 || !catOn[c]) return;
        var t = px.tile[row];
        if (t >= 0) arr[t]++;
        var kj = px.kel[row];
        if (kj >= 0) { var kid = A.kelurahan[kj].id; kelArr[kid] = (kelArr[kid] || 0) + 1; }
        sig = (sig * 31 + row + 7) % 2147483647;
      });
    }
    addPoi(input.acquired, acq, kelAcq, 'a');
    addPoi(input.edc, edc, kelEdc, 'e');
    toList(input.unlisted).forEach(function (u) {
      if (!u) return;
      if (isNum(u.lon) && isNum(u.lat)) {
        var loc = A.locate(u.lon, u.lat);
        if (loc) {
          kelUnl[loc.kelurahanId] = (kelUnl[loc.kelurahanId] || 0) + 1;
          var ti = ix.kecTiles[loc.kecamatanId] ? tileIn(loc.kecamatanId, u.lon, u.lat) : -1;
          if (ti >= 0) { unl[ti]++; return; }
          kecUnl[loc.kecamatanId] = (kecUnl[loc.kecamatanId] || 0) + 1;
          return;
        }
      }
      var kid = u.kecamatanId || kecamatanIdOf(u.kecamatan, u.kota);
      if (kid) kecUnl[kid] = (kecUnl[kid] || 0) + 1; else unlocated++;
    });
    /* kelurahan potential: public listings counted where MCD_ADMIN_AREAS.locate puts them */
    var AP = (A.potential && A.potential.kelurahan) || {};
    Object.keys(AP).forEach(function (id) {
      var p = AP[id];
      if (!p) return;
      kelPot[id] = (catOn[0] ? p.restaurant || 0 : 0) + (catOn[1] ? p.grocery || 0 : 0) + (catOn[2] ? p.other || 0 : 0);
    });
    /* kecamatan: sums of their tiles, plus unlisted merchants known only by kecamatan */
    var K = {}, T = { p: 0, a: 0, e: 0, u: 0 };
    ix.kec.forEach(function (k) { K[k.id] = { p: 0, a: 0, e: 0, u: kecUnl[k.id] || 0 }; });
    for (var j = 0; j < n; j++) {
      var kk = K[ix.tiles[j].kecamatanId];
      kk.p += pot[j]; kk.a += acq[j]; kk.e += edc[j]; kk.u += unl[j];
    }
    Object.keys(K).forEach(function (id) {
      var v = K[id];
      out.kecamatan[id] = area(v.p, v.a, v.e, v.u, hasBank, rule, b);
      T.p += v.p; T.a += v.a; T.e += v.e; T.u += v.u;
    });
    Object.keys(kecUnl).forEach(function (id) { if (!K[id]) kecAcqX[id] = kecUnl[id]; });
    Object.keys(kelPot).forEach(function (id) {
      if (!ix.kecById[id.slice(0, 8)]) return;
      out.kelurahan[id] = area(kelPot[id], kelAcq[id] || 0, kelEdc[id] || 0, kelUnl[id] || 0, hasBank, rule, b);
    });
    out.totals = area(T.p, T.a, T.e, T.u, hasBank, rule, b);
    out.totals.unlocated = hasBank ? unlocated : null;
    out.totals.outsideFocus = hasBank ? kecAcqX : null;
    out.tiles = { potential: pot, acquired: acq, edc: edc, unlisted: unl };
    /* relative bands: kecamatan and kelurahan ranked among their peers within 15 km; tiles among the tiles */
    var tileCut = null;
    if (hasBank && bandMode === 'relative') {
      out.relative.kecamatan = rankAreas(out.kecamatan, function (id) { var k = ix.kecById[id]; return k ? k.in15 : 0; }, minIn);
      out.relative.kelurahan = rankAreas(out.kelurahan, function (id) { var j = ix.kelIndex[id]; return j != null ? A.kelurahan[j].in15 : 0; }, minIn);
      var tv = [];
      for (var q = 0; q < n; q++) {
        if (!(pot[q] > 0) || !(ix.tiles[q].f15 >= minIn)) continue;
        var tn = rule === 'listed' ? acq[q] : acq[q] + unl[q], td = rule === 'listed' ? pot[q] : pot[q] + unl[q];
        if (td > 0) tv.push(Math.min(1, tn / td));
      }
      tileCut = terciles(tv);
      out.relative.tile = tileCut ? { applied: true, lo: tileCut.lo, hi: tileCut.hi, n: tileCut.n, minInFocus: minIn } : { applied: false, n: tv.length, minInFocus: minIn };
    }
    out.key = [hasBank ? 1 : 0, out.demo ? 1 : 0, rule, b.ok, b.mid, bandMode, minIn, out.categories.join(','), T.a, T.e, T.u, sig, P && P.rows ? P.rows.length : 0].join('|');
    var cache = {};
    out.tileStats = function (x) {
      var i = tileIndexOf(x);
      if (i < 0) return null;
      if (cache[i]) return cache[i];
      var e = area(pot[i], acq[i], edc[i], unl[i], hasBank, rule, b);
      if (tileCut) {
        if (e.potential > 0 && isNum(e.coverage) && ix.tiles[i].f15 >= minIn) { e.band = relBand(e.coverage, tileCut); e.ranked = true; }
        else e.band = 'noData';
      }
      return (cache[i] = e);
    };
    return out;
  }

  /** statsFromRecords(lvm, edc, opts): normalised importer records (INTEGRATION_NOTES §5). A record with a
      numeric poiIndex (set by the matcher, or on demo rows) counts on its public listing; one with exact
      lat/lon but no listing, or only kecamatan text (also when its position is only a kelurahan-centre
      estimate), counts as an unlisted acquired merchant. No LVM rows = not imported = potential only
      (never a fake red); pass opts.imported = true for a file that was imported but is empty. */
  function statsFromRecords(lvm, edcRows, opts) {
    opts = opts || {};
    var lvmRows = toList(lvm);
    var acquired = lvmRows.length || opts.imported === true ? [] : null, edcIx = [], unlisted = [];
    lvmRows.forEach(function (r) {
      if (!r) return;
      var approx = r.approximate === true || (r.geoPrecision && r.geoPrecision !== 'EXACT');
      if (isNum(r.poiIndex) && r.poiIndex >= 0) acquired.push(r.poiIndex);
      else if (isNum(r.lon) && isNum(r.lat) && !(approx && r.kecamatan)) unlisted.push({ lon: r.lon, lat: r.lat });
      else if (r.kecamatan) unlisted.push({ kecamatan: r.kecamatan, kota: r.kota });
    });
    toList(edcRows).forEach(function (r) {
      if (!r) return;
      if (isNum(r.poiIndex) && r.poiIndex >= 0) {
        edcIx.push(r.poiIndex);
        if (opts.edcCountsAsAcquired && acquired) acquired.push(r.poiIndex);
      }
    });
    var demo = opts.demo != null ? opts.demo : !!(MCD.data && isFn(MCD.data.isDemo) && MCD.data.isDemo('lvm'));
    return stats({ acquired: acquired, edc: edcIx, unlisted: unlisted, categories: opts.categories, rule: opts.rule, bands: opts.bands, demo: demo,
      bandMode: opts.bandMode, minInFocus: opts.minInFocus });
  }

  /* ------------------------------------------------------------- colours */

  function palKey(ms) {
    if (ms && (ms.palette === 'day' || ms.palette === 'night')) return ms.palette;
    if (ms && ms.view === 'overview' && ms.theme === 'day') return 'day';
    return 'night';
  }
  function palette(ms) { var k = palKey(ms); return { key: k, status: STATUS[k], ink: INK[k] }; }

  /* Older density helpers (kept so callers written for the tile map keep running; nothing here draws them). */
  function classOf(v) {
    if (!isNum(v) || v <= 0) return -1;
    for (var i = BREAKS.length - 1; i >= 0; i--) if (v >= BREAKS[i]) return i;
    return 0;
  }
  function ramp(kind, pk) {
    var base = STATUS[pk][kind === 'notYet' ? 'bad' : 'potential'], out = [];
    for (var i = 0; i < 6; i++) {
      var t = i / 5, c;
      if (pk === 'night') c = t < 0.6 ? mix(mix(base, INK.night.canvas, 0.62), base, t / 0.6) : mix(base, INK.night.white, (t - 0.6) / 0.4 * 0.22);
      else c = t < 0.8 ? mix(mix(base, INK.day.white, 0.84), base, t / 0.8) : mix(base, [0, 0, 0], (t - 0.8) / 0.2 * 0.12);
      out.push(c);
    }
    return out;
  }
  function bandRGB(band, pk) {
    var s = STATUS[pk];
    return band === 'acquired' ? s.ok : band === 'partly' ? s.mid : band === 'notYet' ? s.bad : band === 'potential' ? s.potential : s.none;
  }
  /** colour(kind, spec) → [r, g, b, a]; kind 'band' (spec {band, palette, alpha}) or 'potential' | 'notYet' (spec {cls}). */
  function colour(kind, spec) {
    spec = spec || {};
    var pk = spec.palette === 'day' ? 'day' : 'night';
    if (kind === 'band') return rgba(bandRGB(spec.band, pk), spec.alpha == null ? 255 : spec.alpha);
    var cls = clamp(spec.cls | 0, 0, 5);
    return rgba(ramp(kind, pk)[cls], 150 + cls * 16);
  }
  function inFocus(k, minIn) { return !!k && (k.in15 || 0) >= (isNum(minIn) ? minIn : 0.5); }

  /* Calm map ink (COPY_STYLE_EN items 23, 25). The theme decides the ink: dark lines and white chips by day,
     light lines and dark glass chips at night; on the greyscale satellite (Detail) the lines are white hairlines,
     which read best over busy imagery. The only
     colours are the selected outline (Mandiri navy, a lighter navy at night), the visit badges and the status dots. */
  var CALM = {
    day: { line: [71, 85, 105], lineA: 102, lineSatA: 150, lineSat: [255, 255, 255], hover: [30, 41, 59], hoverA: 200,
      kelA: 46, sel: [0, 61, 121], casing: [255, 255, 255], casingA: 210,
      chip: [255, 255, 255], chipA: 236, chipLine: [15, 23, 42], chipLineA: 30, ink: [30, 41, 59],
      badge: [0, 61, 121], badgeInk: [255, 255, 255] },
    night: { line: [203, 213, 225], lineA: 92, lineSatA: 140, lineSat: [255, 255, 255], hover: [241, 245, 249], hoverA: 210,
      kelA: 36, sel: [125, 170, 228], casing: [10, 15, 23], casingA: 200,
      chip: [17, 24, 37], chipA: 226, chipLine: [255, 255, 255], chipLineA: 34, ink: [226, 232, 240],
      badge: [56, 108, 178], badgeInk: [255, 255, 255] }
  };
  function themeOf(ms) {
    if (ms && (ms.theme === 'day' || ms.theme === 'night')) return ms.theme;
    return palKey(ms) === 'day' ? 'day' : 'night';
  }
  /** The ink of the current map: {key, line [r,g,b,a], kel, hover, sel, casing, chip, chipLine, ink, badge, badgeInk, status}. */
  function ink(ms) {
    var t = themeOf(ms), c = CALM[t], sat = !!(ms && ms.view === 'deep');
    return {
      key: t + (sat ? '-sat' : ''), theme: t, satellite: sat,
      line: rgba(sat ? c.lineSat : c.line, sat ? c.lineSatA : c.lineA),
      /* item 30: the outer ring's own outline, about 60% of the focus line */
      ringLine: rgba(sat ? c.lineSat : c.line, Math.round((sat ? c.lineSatA : c.lineA) * 0.6)),
      kel: rgba(sat ? c.lineSat : c.line, sat ? Math.round(c.kelA * 1.4) : c.kelA),
      hover: sat ? [255, 255, 255, 240] : rgba(c.hover, c.hoverA), sel: rgba(c.sel, 255), casing: rgba(c.casing, c.casingA),
      chip: rgba(c.chip, c.chipA), chipSel: rgba(c.chip, 250), chipLine: rgba(c.chipLine, c.chipLineA), text: rgba(c.ink, 255),
      badge: rgba(c.badge, 255), badgeInk: rgba(c.badgeInk, 255), status: STATUS[t]
    };
  }
  /** Outline width: 1 px, 1.5 px from zoom 12 (a calm hairline that still holds when the map is zoomed in). */
  function lineWidth(zoom) { return zoom >= 12 ? 1.5 : (zoom >= 11.5 ? 1.25 : 1); }

  /* ------------------------------------------------------------- geometry */

  var GEO = null;
  function geometry() {
    if (GEO) return GEO;
    var ix = index();
    if (!ix) return null;
    var A = ix.A, Z = zones();
    /* item 30: the focus (in15 >= 0.5) draws as before; the outer ring gets its own quieter outlines and chips.
       Without the zone data (an old admin file) every kecamatan of the index counts as focus, as before. */
    var isF = Z ? Z.isFocus : function (id) { return !!ix.kecById[id]; };
    var isR = Z ? Z.isRing : function () { return false; };
    var kel = [], sides = [], seps = [], ringSeps = [], fills = [];
    A.borderLines('kelurahan').forEach(function (b) {
      var l = b.left || b.right;
      if (l && isF(l.slice(0, 8))) kel.push({ path: b.path });
    });
    A.borderLines('kecamatan').forEach(function (b) {
      var L = b.left && isF(b.left) ? b.left : null, R = b.right && isF(b.right) ? b.right : null;
      if (!L && !R) {
        /* a border of the outer ring only (ring | ring, ring | beyond): a quieter hairline */
        if ((b.left && isR(b.left)) || (b.right && isR(b.right))) ringSeps.push({ path: b.path });
        return;
      }
      seps.push({ path: b.path, both: !!(L && R), side: L ? -1 : 1 });
      if (L) sides.push({ path: b.path, kec: L, side: -1 });
      if (R) sides.push({ path: b.path, kec: R, side: 1 });
    });
    var pickIds = Z ? Z.focus.concat(Z.ring) : ix.kec.map(function (k) { return k.id; });
    pickIds.forEach(function (id) {
      var rec = A.byId(id);
      if (!rec) return;
      var c = A.coordinates(rec), polys = rec.geometry.type === 'Polygon' ? [c] : c;
      polys.forEach(function (rings) { fills.push({ kec: id, polygon: rings, ring: isR(id) }); });
    });
    var labels = ix.kec.filter(function (k) { return !isR(k.id); }).map(function (k) { return { position: k.label, kec: k.id, name: k.name, potential: k.potential, distKm: k.distKm }; });
    var ringLabels = Z ? Z.ring.map(function (id) {
      var r = A.byId(id);
      return r && Array.isArray(r.label) ? { position: r.label, kec: id, name: r.name, potential: 0, distKm: r.distKm, ring: true } : null;
    }).filter(Boolean) : [];
    GEO = { kel: kel, sides: sides, seps: seps, ringSeps: ringSeps, sepsBoth: seps.filter(function (o) { return o.both; }), fills: fills, labels: labels, ringLabels: ringLabels, outlines: {} };
    return GEO;
  }
  function outlineOf(kecId) {
    var g = geometry(), A = admin();
    if (!g || !A) return [];
    if (g.outlines[kecId]) return g.outlines[kecId];
    var rec = A.byId(kecId);
    if (!rec) return [];
    var c = A.coordinates(rec), polys = rec.geometry.type === 'Polygon' ? [c] : c, out = [];
    polys.forEach(function (p) { p.forEach(function (ring) { out.push({ path: ring, side: -1 }); }); });
    g.outlines[kecId] = out;
    return out;
  }

  /* ------------------------------------------------------------- labels */

  function statsOf(opts) {
    var s = opts && opts.stats;
    return s && s.kecamatan && typeof s.kecamatan === 'object' ? s : stats({});
  }
  function hasCoverage(s, ks) { return !!(s && s.hasBank && ks && isNum(ks.coverage)); }
  /** Default chip text (item 23): "Cipayung · 962 merchant", before and after the import (the coverage third is
      the dot; the percentage is in the popup). Below zoom 11 the unit is left out ("Cipayung · 962") so the chips
      around the branch stay on screen at the 15 km view; the legend says the number is merchants. A section can
      pass its own labelText (Sekolah: "Cipayung · 12 SMA"). */
  function labelText(k, ks, s, zoom, opts) {
    if (opts && isFn(opts.labelText)) {
      try { var t = opts.labelText(k, ks, zoom); if (t != null) return String(t); } catch (e) { /* default */ }
    }
    if (!ks || !(ks.potential > 0)) return k.name;
    return k.name + ' · ' + fmtInt(ks.potential) + (zoom >= 11 ? ' merchant' : '');
  }

  /* Width of a label line in px (canvas metrics in the browser; an estimate elsewhere). */
  var MEASURE = { ctx: null, cache: {} };
  function textWidth(txt, size, weight) {
    var key = size + '|' + (weight || 600) + '|' + txt;
    if (MEASURE.cache[key] != null) return MEASURE.cache[key];
    var w = null, d = doc();
    if (d && d.createElement) {
      try {
        if (!MEASURE.ctx) MEASURE.ctx = d.createElement('canvas').getContext('2d');
        if (MEASURE.ctx) { MEASURE.ctx.font = (weight || 600) + ' ' + size + 'px ' + FONT_SANS; w = MEASURE.ctx.measureText(txt).width; }
      } catch (e) { w = null; }
    }
    if (!isNum(w)) w = txt.length * size * 0.56;
    MEASURE.cache[key] = w;
    return w;
  }
  /* The chip: 22 px tall (12 px text), 9 px left and 10 px right; a status dot takes 13 px on the left (after the
     import) and a visit badge 24 px (3 px inset, 16 px badge, 5 px gap). */
  var LABEL_SIZE = 12, LABEL_LH = 4 / 3, PAD_L = 9, PAD_R = 10, PAD_Y = 3, DOT_SLOT = 13, BADGE_W = 16, BADGE_SLOT = 24;
  var CHIP_H = LABEL_SIZE * LABEL_LH + 2 * PAD_Y;
  function padLeft(dot, badge) { return (badge ? BADGE_SLOT : PAD_L) + (dot ? DOT_SLOT : 0); }
  /* a kecamatan is an area, so a label may move a little inside it when its first place is taken */
  var NUDGE = [[0, 0], [0, -14], [0, 14], [-24, 0], [24, 0], [0, -28], [0, 28], [-24, -14], [24, 14], [24, -14], [-24, 14],
    [-40, 0], [40, 0], [-28, -28], [28, 28], [-28, 28], [28, -28], [0, -42], [0, 42]];

  /* Kecamatan chips are decluttered here (deck's CollisionFilterExtension does not handle text with a
     background): greedy in Web Mercator pixels at the current zoom. Order (UX fix plan A-04): the selected
     kecamatan, our branch's kecamatan (Cipayung), the kecamatan within 7 km, the top 3 to visit, then the
     nearest to Mabes TNI, then the largest. A chip that does not fit on its point may move up to 42 px
     inside its kecamatan (NUDGE). Cached per zoom step. */
  var DECL = { key: '', list: null };
  function declutterOrder(list, selected, prio) {
    var pr = {};
    (prio || []).forEach(function (id, i) { pr[id] = i + 1; });
    return list.slice().sort(function (a, b) {
      /* the kecamatan around the branch (≤ 7 km from Mabes TNI) come before the numbered top 3, so the names
         staff know best stay on screen at the 15 km view (open issue 1) */
      function near(l) { return isNum(l.distKm) && l.distKm <= NEAR_KM; }
      /* the muted chips of the outer ring (item 30) come after every chip of the focus */
      function tier(l) { return l.kec === selected ? 0 : (l.ring ? 20 : (l.kec === BRANCH_KEC ? 1 : (near(l) ? 2 : (pr[l.kec] ? 2 + pr[l.kec] : 9)))); }
      var ta = tier(a), tb = tier(b);
      if (ta !== tb) return ta - tb;
      var da = isNum(a.distKm) ? a.distKm : 99, db = isNum(b.distKm) ? b.distKm : 99;
      if (da !== db) return da - db;
      return (b.potential || 0) - (a.potential || 0) || (a.name < b.name ? -1 : 1);
    });
  }
  /** declutter(list, zoom, textOf, selected, key, prio, padOf) → the chips that fit, each {…, off, w, pl, cw}. */
  function declutter(list, zoom, textOf, selected, key, prio, padOf) {
    var zq = Math.round(zoom * 4) / 4, k = key + '#' + zq + '#' + (selected || '') + '#' + (prio || []).join(',');
    if (DECL.key === k) return DECL.list;
    var W0 = 512 * Math.pow(2, zq), boxes = [], out = [];
    var c0 = (MCD.config && MCD.config.rings && MCD.config.rings.center) || [106.91329, -6.32818];
    var cx0 = (c0[0] + 180) / 360 * W0, sc0 = Math.sin(c0[1] * Math.PI / 180), cy0 = (0.5 - Math.log((1 + sc0) / (1 - sc0)) / (4 * Math.PI)) * W0;
    declutterOrder(list, selected, prio).forEach(function (l) {
      var w = textWidth(String(textOf(l)), LABEL_SIZE), pl = padOf ? padOf(l) : PAD_L, cw = pl + w + PAD_R, hh = CHIP_H / 2;
      var x = (l.position[0] + 180) / 360 * W0;
      var sy = Math.sin(l.position[1] * Math.PI / 180), y = (0.5 - Math.log((1 + sy) / (1 - sy)) / (4 * Math.PI)) * W0;
      /* nearest nudges first; at equal distance, the one that moves away from Mabes TNI (out of the crowd) */
      var vx = x - cx0, vy = y - cy0, vl = Math.sqrt(vx * vx + vy * vy) || 1;
      var tries = NUDGE.slice().sort(function (a, b) {
        var la = Math.round(Math.sqrt(a[0] * a[0] + a[1] * a[1]) / 6), lb = Math.round(Math.sqrt(b[0] * b[0] + b[1] * b[1]) / 6);
        if (la !== lb) return la - lb;
        return (b[0] * vx + b[1] * vy) / vl - (a[0] * vx + a[1] * vy) / vl;
      });
      for (var t = 0; t < tries.length; t++) {
        var dx = tries[t][0], dy = tries[t][1];
        /* 4 px of air around every chip */
        var b = [x + dx - cw / 2 - 4, y + dy - hh - 3, x + dx + cw / 2 + 4, y + dy + hh + 3], free = true;
        for (var i = 0; i < boxes.length && free; i++) {
          var o = boxes[i];
          if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) free = false;
        }
        if (!free) continue;
        boxes.push(b);
        out.push({ position: l.position, kec: l.kec, name: l.name, potential: l.potential, distKm: l.distKm, off: [dx, dy], w: w, pl: pl, cw: cw, ring: !!l.ring });
        return;
      }
    });
    DECL = { key: k, list: out };
    return out;
  }

  /* ------------------------------------------------------------- hover (a darker outline, never a tint) */

  var HOV = { id: null, bound: false };
  function trackHover() {
    if (HOV.bound || !MCD.map || !isFn(MCD.map.onHover)) return;
    HOV.bound = true;
    MCD.map.onHover(function (p) {
      var id = p && p.kind === KIND ? String(p.kecamatanId || p.id || '') || null : null;
      if (id === HOV.id) return;
      HOV.id = id;
      if (isFn(MCD.map.requestRender)) { try { MCD.map.requestRender(); } catch (e) { /* ignore */ } }
    });
  }

  /* ------------------------------------------------------------- layers */

  function deckNS() { return W.deck || null; }

  var POP = null;          // the open popup (its kecamatan is highlighted while it is open)

  /** layers(opts) → {base, top}. See the header for the options. */
  function layers(opts) {
    opts = opts || {};
    var d = deckNS(), ix = index(), g = geometry();
    var out = { base: [], top: [] };
    if (!d || !ix || !g) return out;
    trackHover();
    var ms = opts.ms || {}, K = ink(ms);
    var s = statsOf(opts), id = opts.id || 'territory', beforeId = ms.beforeId;
    var zoom = isNum(ms.zoom) ? ms.zoom : 12;
    var selected = opts.selected != null ? opts.selected : (POP ? POP.kecId : null);
    var minIn = s.relative && s.relative.kecamatan && isNum(s.relative.kecamatan.minInFocus) ? s.relative.kecamatan.minInFocus : 0.5;
    var prio = Array.isArray(opts.priority) ? opts.priority.slice(0, 3) : [];
    var lw = lineWidth(zoom);
    var meta = {
      kind: KIND,
      id: function (o) { return o.kec; },
      pick: function (o, info) {
        if (!o || !o.kec) return null;
        return { kind: KIND, id: o.kec, kecamatanId: o.kec, coordinate: info && info.coordinate, x: info && info.x, y: info && info.y, raw: o };
      },
      tooltip: function (o) { return o && o.kec ? tooltip(o.kec, s) : null; }
    };
    /* the click and hover target: one invisible shape per kecamatan (never painted, never highlighted) */
    var fillData = opts.outside === 'hide' ? g.fills.filter(function (f) { var k = ix.kecById[f.kec]; return inFocus(k, minIn); })
      : (opts.zones === false ? g.fills.filter(function (f) { return !f.ring; }) : g.fills);
    if (opts.pickable !== false) {
      out.base.push(new d.PolygonLayer({
        id: id + '-kec-fill', data: fillData, getPolygon: function (f) { return f.polygon; },
        filled: true, stroked: false, getFillColor: [0, 0, 0, 0],
        pickable: true, autoHighlight: false,
        mcd: meta, beforeId: beforeId
      }));
    }
    if (opts.kelurahan !== false && zoom >= 12.5) {
      out.base.push(new d.PathLayer({
        id: id + '-kel', data: g.kel, getPath: function (o) { return o.path; },
        getColor: K.kel, widthUnits: 'pixels', getWidth: 1,
        capRounded: true, jointRounded: true, pickable: false, beforeId: beforeId
      }));
    }
    var ringOn = opts.outside !== 'hide' && opts.zones !== false;
    if (opts.borders !== false && ringOn && g.ringSeps.length) {
      /* item 30: the outer ring keeps its own outlines, quieter than the focus (thinner, fainter) */
      out.base.push(new d.PathLayer({
        id: id + '-ring-border', data: g.ringSeps, getPath: function (o) { return o.path; },
        getColor: K.ringLine, widthUnits: 'pixels', getWidth: 1, jointRounded: true, capRounded: true,
        updateTriggers: { getColor: K.key }, pickable: false, beforeId: beforeId
      }));
    }
    if (opts.borders !== false) {
      /* every kecamatan border once: a thin grey hairline, the same for every kecamatan (no band colours) */
      out.base.push(new d.PathLayer({
        id: id + '-kec-border', data: g.seps, getPath: function (o) { return o.path; },
        getColor: K.line, widthUnits: 'pixels', getWidth: lw, jointRounded: true, capRounded: true,
        updateTriggers: { getColor: K.key, getWidth: lw }, pickable: false, beforeId: beforeId
      }));
    }
    var known = function (kid) { return !!(kid && (ix.kecById[kid] || (ringOn && zoneKec(kid)))); };
    var hov = HOV.id && HOV.id !== selected && known(HOV.id) ? HOV.id : null;
    if (hov && opts.hover !== false) {
      out.base.push(new d.PathLayer({
        id: id + '-hover', data: outlineOf(hov), getPath: function (o) { return o.path; }, getColor: K.hover,
        widthUnits: 'pixels', getWidth: lw + 0.75, jointRounded: true, capRounded: true, pickable: false, beforeId: beforeId
      }));
    }
    if (selected && known(selected)) {
      /* the selected kecamatan: a 2 px Mandiri-navy outline on a soft casing, so it holds on any basemap */
      var selData = outlineOf(selected);
      out.base.push(new d.PathLayer({
        id: id + '-sel-casing', data: selData, getPath: function (o) { return o.path; }, getColor: K.casing,
        widthUnits: 'pixels', getWidth: 5, jointRounded: true, capRounded: true, pickable: false, beforeId: beforeId
      }));
      out.base.push(new d.PathLayer({
        id: id + '-sel', data: selData, getPath: function (o) { return o.path; }, getColor: K.sel,
        widthUnits: 'pixels', getWidth: 2, jointRounded: true, capRounded: true, pickable: false, beforeId: beforeId
      }));
    }
    if (opts.labels !== false && ms.fontsReady !== false) labelLayers(out, opts, { d: d, ix: ix, g: g, s: s, K: K, id: id, zoom: zoom, selected: selected, minIn: minIn, prio: prio, beforeId: beforeId, ring: ringOn,
      meta: meta, pickable: opts.pickable !== false });
    return out;
  }

  /* The chips (item 23): small rounded glass pills, white by day and dark at night, with the kecamatan name in
     semibold and "· 962 merchant" in a quieter grey; after the import a coloured coverage dot; for the top 3 to
     visit a navy number badge. deck.gl 9.0's TextLayer cannot round its background, so each chip is drawn once
     on a canvas (CHIP_ATLAS, rebuilt only when a chip changes) and shown with an IconLayer. An invisible TextLayer
     with the same box leads it: map.js fits it among the other map labels (panels, callouts, place names) and
     hides the chip with it (mcdFollow). Two leaders (with and without a badge) keep the left padding exact. */
  var CHIP_INK = {
    day: { bg: 'rgba(255,255,255,0.95)', bgSel: '#FFFFFF', line: 'rgba(15,23,42,0.13)', sel: '#003D79', shadow: 'rgba(15,23,42,0.18)',
      name: '#1E293B', rest: '#64748B', badge: '#003D79', badgeInk: '#FFFFFF',
      /* item 30: the muted chip of an outer-ring kecamatan (name only, no shadow) */
      mutedBg: 'rgba(255,255,255,0.72)', mutedLine: 'rgba(15,23,42,0.10)', mutedName: '#5B6474' },
    night: { bg: 'rgba(17,24,37,0.90)', bgSel: 'rgba(17,24,37,0.98)', line: 'rgba(255,255,255,0.14)', sel: '#7DAAE4', shadow: 'rgba(0,0,0,0.45)',
      name: '#E8EDF4', rest: '#9AA6B6', badge: '#386CB2', badgeInk: '#FFFFFF',
      mutedBg: 'rgba(17,24,37,0.62)', mutedLine: 'rgba(255,255,255,0.10)', mutedName: '#A3ADBB' }
  };
  var CHIP_M = 4;                                   // margin around a sprite for its soft shadow (px)
  var CHIP_ATLAS = {};                               // per layer id: {sig, canvas, mapping, dpr}
  function splitLabel(t) {
    var s = String(t), i = s.indexOf(' · ');
    return i > 0 ? [s.slice(0, i), s.slice(i)] : [s, ''];
  }
  function rgbCss(rgb) { return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }
  /** chipAtlas(id, items, theme) → {sig, canvas, mapping, dpr} | null. items [{key, text, cw, pl, dot: rgb|null, badge, sel}]. */
  function chipAtlas(id, items, theme) {
    var d = doc();
    if (!d || !d.createElement || !items.length) return null;
    var dpr = Math.min(3, Math.max(2, Math.ceil(W.devicePixelRatio || 1)));
    var sig = theme + '|' + dpr + '|' + items.map(function (it) { return [it.key, it.text, Math.round(it.cw * 10), it.pl, it.dot ? it.dot.join(',') : '', it.badge || '', it.sel ? 1 : 0, it.muted ? 1 : 0].join('~'); }).join('^');
    var hit = CHIP_ATLAS[id];
    if (hit && hit.sig === sig && hit.canvas) return hit;
    var C = CHIP_INK[theme] || CHIP_INK.day, mapping = {}, wMax = 0, y = 0;
    items.forEach(function (it) { wMax = Math.max(wMax, Math.ceil(it.cw + 2 * CHIP_M)); });
    var hS = Math.ceil(CHIP_H + 2 * CHIP_M), cv;
    try {
      cv = d.createElement('canvas');
      cv.width = Math.max(1, wMax * dpr); cv.height = Math.max(1, hS * items.length * dpr);
    } catch (e) { return null; }
    var ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    items.forEach(function (it) {
      var x0 = CHIP_M, y0 = y + CHIP_M, w = it.cw, h = CHIP_H, r = h / 2, cy = y0 + h / 2;
      /* body with a soft shadow, then a hairline (navy and firmer when selected) */
      var muted = it.muted && !it.sel;
      ctx.save();
      if (!muted) { ctx.shadowColor = C.shadow; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1; }
      roundRect(ctx, x0, y0, w, h, r);
      ctx.fillStyle = it.sel ? C.bgSel : (muted ? C.mutedBg : C.bg); ctx.fill();
      ctx.restore();
      roundRect(ctx, x0 + 0.5, y0 + 0.5, w - 1, h - 1, r - 0.5);
      ctx.lineWidth = it.sel ? 1.5 : 1; ctx.strokeStyle = it.sel ? C.sel : (muted ? C.mutedLine : C.line); ctx.stroke();
      var tx = x0 + it.pl;
      if (it.badge) {
        ctx.beginPath(); ctx.arc(x0 + 3 + BADGE_W / 2, cy, BADGE_W / 2, 0, Math.PI * 2); ctx.fillStyle = C.badge; ctx.fill();
        ctx.fillStyle = C.badgeInk; ctx.font = '700 11px ' + FONT_SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(it.badge), x0 + 3 + BADGE_W / 2, cy + 0.5);
      }
      if (it.dot) { ctx.beginPath(); ctx.arc(tx - 8.5, cy, 4, 0, Math.PI * 2); ctx.fillStyle = rgbCss(it.dot); ctx.fill(); }
      var parts = splitLabel(it.text);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = (muted ? '500 ' : '600 ') + LABEL_SIZE + 'px ' + FONT_SANS; ctx.fillStyle = muted ? C.mutedName : C.name; ctx.fillText(parts[0], tx, cy + 0.5);
      if (parts[1]) {
        var nw = ctx.measureText(parts[0]).width;
        ctx.font = '500 ' + LABEL_SIZE + 'px ' + FONT_SANS; ctx.fillStyle = C.rest; ctx.fillText(parts[1], tx + nw, cy + 0.5);
      }
      mapping[it.key] = { x: 0, y: Math.round(y * dpr), width: Math.ceil((w + 2 * CHIP_M) * dpr), height: hS * dpr,
        anchorX: (CHIP_M + w / 2) * dpr, anchorY: (CHIP_M + h / 2) * dpr, mask: false };
      y += hS;
    });
    CHIP_ATLAS[id] = { sig: sig, canvas: cv, mapping: mapping, dpr: dpr };
    return CHIP_ATLAS[id];
  }

  /** chipDot(stats, kecId, theme) → [r, g, b]: the coverage third of a kecamatan as the chip's dot (grey = not ranked). */
  function chipDot(s, kecId, theme) {
    var ks = s && s.kecamatan ? s.kecamatan[kecId] : null, band = ks && ks.potential > 0 ? ks.band : 'noData';
    return bandRGB(band === 'potential' ? 'noData' : band, theme === 'day' ? 'day' : 'night');
  }
  function labelLayers(out, opts, c) {
    var d = c.d, ix = c.ix, s = c.s, K = c.K, id = c.id, selected = c.selected, prio = c.prio, beforeId = c.beforeId;
    var dots = opts.dots != null ? !!opts.dots : !!s.hasBank;
    var rankOfId = {};
    prio.forEach(function (kid, i) { rankOfId[kid] = i + 1; });
    var labelData = c.g.labels.filter(function (l) {
      var k = ix.kecById[l.kec], ks = s.kecamatan[l.kec];
      if (l.kec === selected) return true;
      return inFocus(k, c.minIn) && ks && ks.potential > 0;
    });
    /* item 30: the outer ring's muted chips (name only), placed after every chip of the focus */
    var ringOn = c.ring && opts.ringLabels !== false;
    if (ringOn) labelData = labelData.concat(c.g.ringLabels);
    var textOf = function (l) { return l.ring ? l.name : labelText(ix.kecById[l.kec], s.kecamatan[l.kec], s, c.zoom, opts); };
    var padOf = function (l) { return l.ring ? PAD_L : padLeft(dots, !!rankOfId[l.kec]); };
    var labelKey = [s.key || '', K.key, selected || '', prio.join(','), dots ? 1 : 0, c.zoom >= 11 ? 2 : 1, isFn(opts.labelText) ? (opts.labelKey || '') : '', ringOn ? 'r' : ''].join('#');
    if (opts.collide !== false) labelData = declutter(labelData, c.zoom, textOf, selected, labelKey + '#' + labelData.length, prio, padOf);
    var geomOf = {};
    labelData.forEach(function (l) {
      var w = isNum(l.w) ? l.w : textWidth(String(textOf(l)), LABEL_SIZE), pl = isNum(l.pl) ? l.pl : padOf(l);
      geomOf[l.kec] = { w: w, pl: pl, cw: pl + w + PAD_R, off: l.off || [0, 0] };
    });
    var gOf = function (l) { return geomOf[l.kec] || { w: 60, pl: PAD_L, cw: 60 + PAD_L + PAD_R, off: [0, 0] }; };
    var dotOf = function (l) { return chipDot(s, l.kec, K.theme); };
    var keyOf = function (l) { return l.kec + (l.kec === selected ? '#s' : ''); };
    var atlas = !d.IconLayer ? null : chipAtlas(id, labelData.map(function (l) {
      var gm = gOf(l);
      if (l.ring) return { key: keyOf(l), text: textOf(l), cw: gm.cw, pl: gm.pl, dot: null, badge: null, sel: l.kec === selected, muted: true };
      return { key: keyOf(l), text: textOf(l), cw: gm.cw, pl: gm.pl, dot: dots ? dotOf(l) : null, badge: rankOfId[l.kec] || null, sel: l.kec === selected };
    }), K.theme);
    var ringData = labelData.filter(function (l) { return !!l.ring; });
    labelData = labelData.filter(function (l) { return !l.ring; });
    var plain = labelData.filter(function (l) { return !rankOfId[l.kec]; });
    var ranked = labelData.filter(function (l) { return !!rankOfId[l.kec]; });
    var none = [0, 0, 0, 0];
    /* The chip is its own click and hover target (fix 16 Oct 2026): it is 75–130 px wide and the declutter may shift
       it up to 42 px, so it often lies over a NEIGHBOURING kecamatan; a click on it used to fall through to that
       kecamatan's invisible fill. The chip is the top layer, so its pick (meta.pick → its own kec) wins. */
    var pick = c.pickable !== false && c.meta ? c.meta : null;
    function chips(suffix, data, pl) {
      if (!data.length) return;
      var lid = id + suffix;
      /* the invisible leader: the chip's exact box, for the label layout of map.js */
      out.top.push(new d.TextLayer({
        id: lid, data: data, getPosition: function (l) { return l.position; },
        getText: textOf, getSize: LABEL_SIZE, sizeUnits: 'pixels', lineHeight: LABEL_LH,
        fontFamily: FONT_SANS, fontWeight: 600, characterSet: 'auto', fontSettings: { sdf: true },
        getColor: atlas ? none : K.text, getTextAnchor: 'start', getAlignmentBaseline: 'center',
        getPixelOffset: function (l) { var gm = gOf(l); return [gm.off[0] - gm.cw / 2 + gm.pl, gm.off[1]]; },
        background: true, backgroundPadding: [pl, PAD_Y, PAD_R, PAD_Y],
        getBackgroundColor: atlas ? none : K.chip, getBorderColor: atlas ? none : K.chipLine, getBorderWidth: atlas ? 0 : 1,
        updateTriggers: { getText: labelKey, getPixelOffset: labelKey, getColor: K.key + (atlas ? 1 : 0), getBackgroundColor: K.key + (atlas ? 1 : 0) },
        /* without a chip atlas the leader's own background is the chip: then it takes the clicks */
        pickable: !atlas && !!pick, mcd: !atlas && pick ? pick : undefined, beforeId: beforeId
      }));
      if (!atlas) return;
      /* the chip itself: one canvas-drawn sprite per kecamatan, centred on its label point */
      out.top.push(new d.IconLayer({
        id: lid + '-chip', data: data, getPosition: function (l) { return l.position; },
        iconAtlas: atlas.canvas, iconMapping: atlas.mapping, getIcon: keyOf,
        sizeUnits: 'pixels', getSize: (CHIP_H + 2 * CHIP_M), billboard: true, alphaCutoff: 0.01,
        getPixelOffset: function (l) { return gOf(l).off; },
        updateTriggers: { getIcon: atlas.sig, getPixelOffset: labelKey },
        mcdFollow: lid, pickable: !!pick, mcd: pick || undefined, beforeId: beforeId
      }));
    }
    chips('-labels', plain, padLeft(dots, false));
    chips('-labels-rank', ranked, padLeft(dots, true));
    chips('-labels-ring', ringData, PAD_L);
  }

  /* ------------------------------------------------------------- names, tooltip, hit-testing */

  function kecRec(kecId) { var A = admin(); return A && kecId ? A.byId(kecId) : null; }
  function kotaOf(kecId) { var A = admin(), r = kecRec(kecId); return r && A ? A.byId(r.kota) : null; }
  /** "Kecamatan Ciracas, Kota Jakarta Timur": the Google Maps query of a kecamatan (D17). */
  function gmapsQuery(kecId) {
    var r = kecRec(kecId);
    if (!r) return null;
    var kt = kotaLong(kotaOf(kecId));
    return 'Kecamatan ' + r.name + (kt ? ', ' + kt : '');
  }

  var THIRD_WORDS = { acquired: 'sepertiga tertinggi', partly: 'sepertiga tengah', notYet: 'sepertiga terendah', noData: 'tidak dinilai' };
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  /* item 30: an outer-ring kecamatan is not rated. Most of them reach into the 15 km circle a little (Setiabudi
     42%, Cakung 39%), and Merchant lists the merchants of that part, so the words say "sebagian besar" and give
     that count (fix 16 Oct 2026); only a ring kecamatan with nothing inside 15 km is simply "di luar 15 km". */
  var RING_WORDS = 'Di luar 15 km dari Mabes TNI. Tidak dinilai.';
  var RING_WORDS_PART = 'Sebagian besar wilayahnya di luar 15 km dari Mabes TNI. Tidak dinilai.';
  function ringWords(k) { return k && (k.in15 || 0) > 0 ? RING_WORDS_PART : RING_WORDS; }
  /** "1.054 merchant dalam 15 km" for an outer-ring kecamatan, from merchant stats only (stats.unit 'merchant'); else null. */
  function ringCount(s, kecId) {
    var ks = s && s.unit === 'merchant' && s.kecamatan ? s.kecamatan[kecId] : null;
    return ks && ks.potential > 0 ? ks.potential : null;
  }
  function tooltip(kecId, s) {
    var ix = index(), k = ix && zoneKec(kecId);
    if (!k) return null;
    var ks = s && s.kecamatan ? s.kecamatan[kecId] : null, lines = [];
    var eyebrow = 'Kecamatan · ' + (k.kotaName || '');
    /* item 30: a kecamatan of the outer ring says it is (mostly) outside the 15 km area */
    if (isRingKec(kecId)) {
      var n = ringCount(s, kecId);
      return { eyebrow: eyebrow, title: k.name, lines: [{ kind: 'body', text: ringWords(k) }]
        .concat(n ? [{ kind: 'body', text: fmtInt(n) + ' merchant dalam 15 km' }] : [])
        .concat([{ kind: 'meta', text: 'Klik untuk melihat jaraknya' }]) };
    }
    if (!inFocus(k)) return { eyebrow: eyebrow, title: k.name, lines: [{ kind: 'body', text: 'Sebagian besar wilayahnya di luar 15 km dari Mabes TNI. Tidak dinilai.' }] };
    if (hasCoverage(s, ks)) {
      var r = rankOf(s, kecId);
      lines.push({ kind: 'body', text: fmtPct(ks.coverage) + ' coverage' + (r ? ' · ' + THIRD_WORDS[r.band] : '') });
      lines.push({ kind: 'body', text: fmtInt((ks.acquired || 0) + (ks.unlisted || 0)) + ' telah diakuisisi · ' + fmtInt(ks.notYet) + ' belum ada di LVM' });
    } else if (ks && ks.potential > 0) {
      lines.push({ kind: 'body', text: fmtInt(ks.potential) + ' merchant dalam 15 km' });
      if (!(s && s.hasBank)) lines.push({ kind: 'body', text: 'File LVM belum diimpor.' });
    }
    lines.push({ kind: 'meta', text: 'Klik untuk melihat angkanya' });
    return { eyebrow: eyebrow, title: k.name, lines: lines };
  }

  /** hit(x): x = a pick from MCD.map.onPick, a deck pick info, a kecamatan id or [lon, lat]. */
  function hit(x) {
    var ix = index(), A = admin();
    if (!ix || !A || x == null) return null;
    var kid = null, coord = null;
    if (typeof x === 'string') kid = zoneKec(x) ? x : (tile(x) ? tile(x).kecamatanId : null);
    else if (Array.isArray(x)) coord = x;
    else if (typeof x === 'object') {
      coord = Array.isArray(x.coordinate) ? x.coordinate : (isNum(x.lon) && isNum(x.lat) ? [x.lon, x.lat] : null);
      var o = x.object || x.raw || null;
      if (x.kecamatanId && zoneKec(x.kecamatanId)) kid = x.kecamatanId;
      else if (x.kind === KIND && x.id != null && zoneKec(String(x.id))) kid = String(x.id);
      else if (o && o.kec && zoneKec(o.kec)) kid = o.kec;
      else if (o && o.kecamatanId) kid = o.kecamatanId;
      else if (x.kecamatanId) kid = x.kecamatanId;
    }
    var loc = coord ? A.locate(coord[0], coord[1]) : null;
    if (!kid && loc) kid = loc.kecamatanId;
    if (!kid || !zoneKec(kid)) return null;
    var kec = A.byId(kid), kel = loc && loc.kecamatanId === kid ? A.byId(loc.kelurahanId) : null;
    return { kecamatanId: kid, kecamatan: kec, kelurahan: kel, kota: kec ? A.byId(kec.kota) : null, coordinate: coord };
  }

  /* ------------------------------------------------------------- one "where to go next" ranking (A-06, D4) */

  /** priority(stats, {n}) → [{rank, id, name, kota, potential, notYet, coverage, band, ranked, distKm, why, gmaps}].
      Eligible: kecamatan in the 15 km focus with merchants and a band other than the strongest third (before the
      import: every kecamatan in the focus). Score = merchants not yet in LVM (the potential before the import)
      ÷ (1 + km from Mabes TNI ÷ 3); ties go to the nearer kecamatan. */
  function priority(s, opts) {
    opts = opts || {};
    var ix = index();
    if (!ix) return [];
    s = s && s.kecamatan ? s : stats({});
    var n = isNum(opts.n) ? Math.max(0, opts.n | 0) : 3;
    var minIn = s.relative && s.relative.kecamatan && isNum(s.relative.kecamatan.minInFocus) ? s.relative.kecamatan.minInFocus : 0.5;
    var list = [];
    ix.kec.forEach(function (k) {
      var ks = s.kecamatan[k.id];
      if (!ks || !(ks.potential > 0) || !inFocus(k, minIn)) return;
      if (s.hasBank && ks.band === 'acquired') return;
      var notYet = s.hasBank ? (isNum(ks.notYet) ? ks.notYet : 0) : ks.potential;
      var dist = isNum(k.distKm) ? k.distKm : 99;
      list.push({ k: k, ks: ks, notYet: notYet, dist: dist, score: notYet / (1 + dist / 3) });
    });
    list.sort(function (a, b) { return (b.score - a.score) || (a.dist - b.dist) || (a.k.name < b.k.name ? -1 : 1); });
    return list.slice(0, n).map(function (x, i) {
      var cov = s.hasBank && isNum(x.ks.coverage) ? x.ks.coverage : null;
      var km = Math.round(x.dist * 10) / 10;
      var why = s.hasBank
        ? fmtInt(x.notYet) + ' belum ada di LVM · coverage ' + fmtPct(cov) + ' · ' + fmtKm(km)
        : fmtInt(x.ks.potential) + ' merchant · ' + fmtKm(km);
      return { rank: i + 1, id: x.k.id, name: x.k.name, kota: x.k.kotaName, potential: x.ks.potential, notYet: s.hasBank ? x.notYet : null,
        coverage: cov, band: x.ks.band, ranked: !!x.ks.ranked, distKm: km, why: why, gmaps: { q: gmapsQuery(x.k.id) } };
    });
  }

  /* ------------------------------------------------------------- legend */

  function legendSpec(spec) {
    spec = spec || {};
    var s = spec.stats && spec.stats.kecamatan ? spec.stats : { hasBank: false, bands: bands(spec.bands), kecamatan: {} };
    var pk = palKey(spec.ms || spec);
    var potential = !s.hasBank || spec.mode === 'potential';
    return { s: s, pk: pk, potential: potential, b: s.bands || bands(spec.bands) };
  }
  function bandRows(b, pk, glyph, rel) {
    if (rel && rel.applied) return relativeRows(rel, pk, glyph);
    return [
      { glyph: glyph, rgb: STATUS[pk].ok, label: 'Titik hijau: coverage ' + pctWord(b.ok) + ' atau lebih' },
      { glyph: glyph, rgb: STATUS[pk].mid, label: 'Titik kuning: coverage ' + Math.round(b.mid * 100) + '–' + pctWord(b.ok) },
      { glyph: glyph, rgb: STATUS[pk].bad, label: 'Titik merah: coverage di bawah ' + pctWord(b.mid) },
      { glyph: glyph, rgb: STATUS[pk].none, label: 'Tanpa titik: tidak ada data' }
    ];
  }
  /* Relative legend rows (COPY_STYLE_EN item 18): the words first, the cut points in brackets. */
  function relativeRows(rel, pk, glyph) {
    var w = relativeWords(rel);
    return [
      { glyph: glyph, rgb: STATUS[pk].ok, label: 'Titik hijau: ' + lc(w.ok) },
      { glyph: glyph, rgb: STATUS[pk].mid, label: 'Titik kuning: ' + lc(w.mid) },
      { glyph: glyph, rgb: STATUS[pk].bad, label: 'Titik merah: ' + lc(w.bad) },
      { glyph: glyph, rgb: STATUS[pk].none, label: 'Tanpa titik: tidak dinilai, sebagian besar wilayahnya di luar 15 km' }
    ];
  }
  function lc(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  /** relativeWords(rel) → {ok, mid, bad, none, lo, hi}: the same words for panels, tables and charts beside the map
      (MCD.charts.status.rankWords says it the same way). */
  function relativeWords(rel) {
    if (!rel || !rel.applied) return null;
    var lo = fmtPct(rel.lo), hi = fmtPct(rel.hi);
    /* lo = 0: the weakest third has nothing acquired yet, so the middle third reads "sampai …" */
    return { ok: 'Sepertiga kecamatan dengan coverage tertinggi (di atas ' + hi + ')', mid: 'Sepertiga di tengah (' + (rel.lo > 0 ? lo.replace('%', '') + '–' + hi : 'sampai ' + hi) + ')',
      bad: 'Sepertiga dengan coverage terendah, kunjungi lebih dulu', none: 'Tidak dinilai', lo: lo, hi: hi };
  }
  /** rankOf(stats, id, level?) → {rank, n, band} among the ranked areas of that level (1 = highest coverage;
      ties share the better rank), or null when the area is not ranked. */
  function rankOf(s, id, level) {
    var L = s && s[level || 'kecamatan'], e = L && L[id];
    if (!e || !e.ranked || !isNum(e.coverage)) return null;
    var n = 0, above = 0;
    Object.keys(L).forEach(function (k) { var x = L[k]; if (x && x.ranked && isNum(x.coverage)) { n++; if (x.coverage > e.coverage) above++; } });
    return { rank: above + 1, n: n, band: e.band };
  }
  /** "Sepertiga terendah, peringkat 28 dari 33": the ranked third of an area in words. */
  function thirdText(s, id, level) {
    var r = rankOf(s, id, level);
    if (!r) return null;
    return cap(THIRD_WORDS[r.band] || 'tidak dinilai') + ', peringkat ' + r.rank + ' dari ' + r.n;
  }
  /** legendGroups(spec) → map legend groups in words (item 23): what the chip, the dot and each line mean.
      No fill swatches: dots for the coverage third, lines for the borders. spec {ms, stats, mode, bands, unit}. */
  function legendGroups(spec) {
    spec = spec || {};
    var L = legendSpec(spec), groups = [], rel = L.s.relative || {}, t = themeOf(spec.ms || spec), c = CALM[t];
    var unit = spec.unit || 'merchant';
    /* COPY_DECK_ID §5.1: group "Kecamatan" (what the white chip says), then the dot meaning after the import */
    var kecRows = [{ glyph: 'chip', label: 'Label: nama kecamatan · jumlah ' + unit }];
    /* item 30: the outer ring's muted chip */
    if (spec.zones !== false && zones()) kecRows.push({ glyph: 'chip', muted: true, label: 'Label pucat: kecamatan tetangga, sebagian besar di luar 15 km' });
    groups.push({ id: 'territory-kec', title: 'Kecamatan', rows: kecRows, note: L.potential ? 'Titik kecil pada label muncul setelah file LVM diimpor.' : null });
    if (!L.potential) {
      var ranked = !!(rel.kecamatan && rel.kecamatan.applied);
      groups.push({ id: 'territory-dots', title: ranked ? 'Titik pada label: coverage, dibandingkan antarkecamatan' : 'Titik pada label: coverage (batas tetap)',
        rows: bandRows(L.b, t, 'circle', rel.kecamatan) });
    }
    groups.push({ id: 'territory-lines', title: 'Garis', rows: [
      { line: c.line, alpha: 0.75, label: 'Garis abu-abu: batas kecamatan' },
      { line: c.line, alpha: 0.45, width: 1, label: 'Garis abu-abu tipis: batas kelurahan, tampil saat peta diperbesar' },
      { line: c.sel, width: 2.5, label: 'Garis biru tua tebal: kecamatan yang dipilih' }
    ] });
    return groups;
  }

  function swatch(rgb, kind, alpha, width, muted) {
    var E = MCD.util.el, S = 14;
    if (kind === 'chip') return E('span', { class: 'tz-legend__chip' + (muted ? ' tz-legend__chip--muted' : ''), 'aria-hidden': 'true' });
    var shape = kind === 'line'
      ? E.svg('line', { x1: 1, y1: 7, x2: 13, y2: 7, stroke: css(rgb, alpha == null ? null : alpha), 'stroke-width': isNum(width) ? width : 1.5, 'stroke-linecap': 'round' })
      : E.svg('circle', { cx: 7, cy: 7, r: 4.5, fill: css(rgb, alpha == null ? null : alpha) });
    return E.svg('svg', { class: 'tz-legend__sw', width: S, height: S, viewBox: '0 0 14 14', 'aria-hidden': 'true', focusable: 'false' }, shape);
  }

  /** legend(spec) → DOM: the same content as legendGroups in plain words, plus how to read it and the source. */
  function legend(spec) {
    var E = MCD.util && MCD.util.el;
    if (!E) return null;
    ensureCSS();
    var L = legendSpec(spec), groups = legendGroups(spec), root = E('div', { class: 'lg tz-legend' });
    groups.forEach(function (g) {
      var grp = E('div', { class: 'lg__group', data: { group: g.id } }, E('div', { class: 'lg__title t-eyebrow', text: g.title }));
      (g.rows || []).forEach(function (r) {
        grp.appendChild(E('div', { class: 'lg__row' },
          E('span', { class: 'lg__glyph' }, swatch(r.line || r.rgb, r.line ? 'line' : (r.glyph === 'chip' ? 'chip' : 'dot'), r.alpha, r.width, r.muted)),
          E('span', { class: 'lg__label', text: r.label })));
      });
      if (g.note) grp.appendChild(E('div', { class: 'lg__hint', text: g.note }));
      root.appendChild(grp);
    });
    var notes = [], relK = L.s.relative && L.s.relative.kecamatan;
    if (L.potential) notes.push('Klik kecamatan untuk melihat angkanya.');
    else if (relK && relK.applied) notes.push('Coverage = porsi merchant yang telah terdaftar di Livin’ Merchant.\nWarna titik membandingkan ' +
      relK.n + ' kecamatan yang ' + (relK.minInFocus === 0.5 ? 'separuh' : pctWord(relK.minInFocus)) + ' wilayahnya atau lebih ada dalam 15 km.');
    else notes.push('Coverage = porsi merchant di kecamatan itu yang telah terdaftar di LVM.\nBatas ' + pctWord(L.b.ok) + ' dan ' + pctWord(L.b.mid) + ' merupakan asumsi.');
    notes.forEach(function (n) { root.appendChild(E('div', { class: 'lg__note', text: n })); });
    root.appendChild(E('div', { class: 'lg__foot tz-legend__src', text: 'Sumber: Overture Maps (Sep 2026) · batas wilayah © kontributor OpenStreetMap, BPS' + (L.s.hasBank ? ' · file Livin’ Merchant' + (L.s.demo ? ' (data contoh)' : '') : '') }));
    return root;
  }

  /* ------------------------------------------------------------- the kecamatan popup (item 20: calm, one Close) */

  /* Kecamatan focus mode (COPY_STYLE_EN item 38): an open popup holds the map's focus on its kecamatan
     (MCD.map.focusArea, source 'popup'). How it closes decides what the focus does:
       'button' (Tutup) or 'esc'      the focus ends too, and the camera flies back;
       'outside' or 'pick'            a CLICK on the map itself (pointer up within 4 px of where it went down): the map
                                      decides, it ends the focus on a click outside the kecamatan and a click inside keeps
                                      it; a drag of the map never closes the popup (fix 16 Oct 2026: it used to close on
                                      pointerdown, so a pan left the focus on with no popup and no Tutup);
       'panel'                        a press on a panel, the top bar or anything else that is not the map: the map never
                                      sees it, so the popup lets go of the focus once that click has run (a panel action
                                      that opens the same kecamatan another way, a filter or a selection, takes over
                                      without a flicker); with nothing else holding it the focus ends where the camera is;
       'action' or a section's call   only the popup lets go (an action usually opens the kecamatan another way). */
  function mapFocus(fn, arg) {
    var M = MCD.map;
    if (!M || !isFn(M[fn])) return false;
    try { return M[fn](arg); } catch (e) { return false; }
  }
  function focusAfterClose(reason) {
    if (reason === 'outside' || reason === 'pick') return;
    if (reason === 'panel') { releaseAfterClick(); return; }
    if (reason === 'button' || reason === 'esc') mapFocus('clearFocus', { reason: reason });
    else mapFocus('clearFocus', { source: 'popup' });
  }
  /** The popup's hold on the focus ends after the click that closed it (pointer up, then one task, so the click's own
      handlers run first); a popup opened meanwhile holds the focus itself and is left alone. */
  function releaseAfterClick() {
    var d = doc(), done = false, timer = 0;
    var release = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (d) { d.removeEventListener('pointerup', onUp, true); d.removeEventListener('pointercancel', onUp, true); }
      if (!POP) mapFocus('clearFocus', { source: 'popup' });
    };
    var onUp = function () { setTimeout(release, 0); };
    if (d) { d.addEventListener('pointerup', onUp, true); d.addEventListener('pointercancel', onUp, true); }
    timer = setTimeout(release, 1000);
  }
  /** Where a press outside the popup landed: 'map' (the map canvas, its markers and plates), 'zoom' (the map's own zoom
      buttons: like a wheel zoom, the popup stays) or 'other' (panels, top bar, map menu …). */
  function pressPlace(target) {
    var M = MCD.map, cc = null;
    try { cc = M && isFn(M.getMap) && M.getMap() ? M.getMap().getCanvasContainer() : null; } catch (e) { cc = null; }
    if (cc && target && isFn(cc.contains) && cc.contains(target)) return 'map';
    try { if (target && isFn(target.closest) && target.closest('.mapctl__btn--zoom, .maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out')) return 'zoom'; } catch (e) { /* other */ }
    return 'other';
  }
  function closePopup(restoreFocus, reason) {
    if (SWAP) { clearTimeout(SWAP.timer); SWAP = null; }     /* a kecamatan pick that was to update the open card */
    if (!POP) return;
    var p = POP;
    POP = null;
    reason = reason || (restoreFocus === true ? 'button' : 'api');
    focusAfterClose(reason);
    if (isFn(p.offTravel)) { try { p.offTravel(); } catch (e) { /* ignore */ } }
    var d = doc();
    if (d) {
      /* the callout path listens for Esc in the bubble phase (the shell's Esc order runs first), the popup in capture */
      d.removeEventListener('keydown', p.onKey, !p.ws);
      d.removeEventListener('pointerdown', p.onDown, true);
      if (p.onUp) { d.removeEventListener('pointerup', p.onUp, true); d.removeEventListener('pointercancel', p.onCancel, true); }
    }
    if (p.ws) {
      /* item 43: MCD.windows closes (and fades) its own callout; it calls back onClose, which then finds POP gone */
      if (p.timer) { clearTimeout(p.timer); p.timer = 0; }
      if (!p.closedBy && p.handle && isFn(p.handle.close)) { try { p.handle.close(WS_OUT[reason] || 'replace'); } catch (e) { /* gone */ } }
    } else {
      var node = p.el;
      node.classList.remove('is-in');
      var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
      /* the exit fade is MCD.motion fast (180 ms, ease-in-out; ensureCSS) */
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, reduce ? 0 : 200);
    }
    if (isFn(p.onClose)) { try { p.onClose(); } catch (e) { /* ignore */ } }
    if (MCD.map && isFn(MCD.map.requestRender)) { try { MCD.map.requestRender(); } catch (e) { /* ignore */ } }
    if (!p.ws && restoreFocus === true && p.returnFocus && isFn(p.returnFocus.focus) && p.returnFocus.isConnected) { try { p.returnFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  var TRAVEL_TIP = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
  /** {text: "2,4 km · ± 8 menit", title} from KCP Jakarta Cilangkap to the kecamatan's label point (items 27, 28), or null.
      MCD.distance first (fix 16 Oct 2026): the same text as every list and drawer, normal traffic from every source,
      and it follows the shared "Jam sibuk" / "Motor (tanpa tol)" switches. Without it: MCD.travel (road grid, normal
      traffic), else window.MCD_TRAVEL, whose minutes are FREE-FLOW and are converted to normal traffic (× 1,6). */
  function travelInfo(k) {
    if (!k) return null;
    var p = k.label;
    try {
      var D = MCD.distance;
      if (D && isFn(D.of) && isFn(D.format) && Array.isArray(p)) {
        var d = D.of(p[0], p[1], { kecamatanId: k.id });
        if (d && isNum(d.km)) return { text: D.format(d), title: isFn(D.tip) ? D.tip(d) : TRAVEL_TIP };
      }
      var T = MCD.travel;
      if (T && isFn(T.ready) && isFn(T.at) && isFn(T.format) && Array.isArray(p) && T.ready()) {
        var r = T.at(p[0], p[1]);
        if (r && isNum(r.km) && r.precision !== 'none') return { text: T.format(r), title: TRAVEL_TIP };
      }
      var V = W.MCD_TRAVEL, e = V && isFn(V.of) ? V.of('kecamatan', k.id) : null;
      if (e && isNum(e.km) && isNum(e.min)) {
        var min = Math.round(e.min * FREE_TO_NORMAL);
        return { text: fmtKm(Math.round(e.km * 10) / 10) + ' · ± ' + minutesText(min), title: TRAVEL_TIP };
      }
    } catch (err) { /* no travel row */ }
    return null;
  }
  var FREE_TO_NORMAL = 1.6;            /* TomTom 2025 Jakarta: normal traffic ≈ 1,6 × free flow (as MCD.distance) */
  function minutesText(min) {
    if (min < 60) return Math.max(1, min) + ' menit';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' jam' + (m ? ' ' + m + ' menit' : '');
  }
  function travelText(k) { var t = travelInfo(k); return t ? t.text : null; }
  function travelRow(k) {
    var t = travelInfo(k);
    return t ? { label: 'Jarak dari KCP', value: t.text, title: t.title, travel: true } : null;
  }
  /** The default rows, big value and rank chip for a kecamatan. */
  function popupModel(kecId, s) {
    var ix = index(), k = ix && zoneKec(kecId);
    if (isRingKec(kecId)) return ringModel(k, s);
    var ks = s && s.kecamatan ? s.kecamatan[kecId] : null, hasBank = !!(s && s.hasBank);
    var unknown = 'Belum diketahui', TONE = { acquired: 'ok', partly: 'mid', notYet: 'bad', potential: 'potential', noData: 'none' };
    var focus = inFocus(k);
    var rows = [
      { label: 'Merchant dalam 15 km', value: ks && focus ? fmtInt(ks.potential) : '—' },
      { label: 'Sudah diakuisisi', value: hasBank && ks ? fmtInt((ks.acquired || 0) + (ks.unlisted || 0)) : unknown, tone: 'ok' },
      { label: 'Belum ada di LVM', value: hasBank && ks ? fmtInt(ks.notYet) : unknown, tone: 'bad' }
    ];
    if (hasBank && ks && ks.unlisted) rows.push({ label: 'Toko LVM yang tidak ada di peta publik', value: fmtInt(ks.unlisted), tone: 'ok' });
    rows.push({ label: 'EDC Mandiri', value: hasBank && ks && isNum(ks.edc) ? fmtInt(ks.edc) : unknown });
    rows.push({ label: 'Jarak dari Mabes TNI', value: k && isNum(k.distKm) ? fmtKm(Math.round(k.distKm * 10) / 10) : '—' });
    /* item 27: road distance and driving time from the branch to the kecamatan's label point (MCD.travel, when loaded) */
    var tv = travelRow(k);
    if (tv) rows.push(tv);
    var big, chip = null;
    if (!focus) big = { value: 'Tidak dinilai', caption: 'Sebagian besar wilayahnya di luar 15 km dari Mabes TNI' };
    else if (hasCoverage(s, ks)) big = { value: fmtPct(ks.coverage), caption: 'Coverage' };      /* a glossary term, as on the cards */
    else if (hasBank) big = { value: '—', caption: 'Tidak ada merchant di peta publik di kecamatan ini' };
    else big = { value: fmtInt(ks ? ks.potential : 0), caption: 'merchant dalam 15 km · file LVM belum diimpor' };
    if (hasBank && ks && focus) {
      var t = thirdText(s, kecId);
      var b = s.bands || bands();
      chip = { tone: TONE[ks.band] || 'none', text: t || (ks.band === 'noData' ? 'Tidak dinilai' : 'Batas tetap: ' + ({ acquired: 'hijau, ' + pctWord(b.ok) + ' atau lebih', partly: 'kuning', notYet: 'merah, di bawah ' + pctWord(b.mid) }[ks.band] || 'abu-abu')) };
    } else if (!hasBank && focus) chip = { tone: 'none', text: 'Coverage muncul setelah file LVM diimpor' };
    return { rows: rows, big: big, chip: chip };
  }

  /** The popup of an outer-ring kecamatan (item 30): not rated, so no coverage and no third. It says how much of it
      lies inside 15 km and, with merchant stats, how many merchants that part has (Merchant lists them), then where it
      is and how far it is. */
  function ringModel(k, s) {
    var rows = [], n = k ? ringCount(s, k.id) : null, part = !!(k && k.in15 > 0);
    if (n) rows.push({ label: 'Merchant dalam 15 km', value: fmtInt(n) });
    if (part) rows.push({ label: 'Wilayah dalam 15 km', value: fmtPct(k.in15) });
    if (k && isNum(k.distKm)) rows.push({ label: 'Jarak dari Mabes TNI', value: fmtKm(Math.round(k.distKm * 10) / 10) });
    var tv = travelRow(k);
    if (tv) rows.push(tv);
    return { rows: rows,
      big: part ? { value: 'Tidak dinilai', caption: 'Sebagian besar wilayahnya di luar 15 km dari Mabes TNI' } : { value: 'Di luar 15 km', caption: 'dari Mabes TNI' },
      chip: { tone: 'none', text: 'Kecamatan tetangga area 15 km. Tidak dinilai.' }, ring: true };
  }

  /* The free map area (between the panels, the bars and the legend) intersected with the map box. */
  function freeArea() {
    var d = doc(), vw = W.innerWidth || 1024, vh = W.innerHeight || 768;
    var area = { left: 0, top: 0, right: vw, bottom: vh };
    try {
      var m = d.getElementById('map'), r = m && m.getBoundingClientRect ? m.getBoundingClientRect() : null;
      if (r && r.width > 0) area = { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(vw, r.right), bottom: Math.min(vh, r.bottom) };
      var cs = W.getComputedStyle ? W.getComputedStyle(d.body) : null;
      var px = function (n) { var v = cs ? parseFloat(cs.getPropertyValue(n)) : NaN; return isNum(v) ? v : null; };
      var ft = px('--free-t'), fl = px('--free-l'), fr = px('--free-r'), fb = px('--free-b');
      if (vw >= 600) {
        if (ft != null) area.top = Math.max(area.top, ft);
        if (fl != null) area.left = Math.max(area.left, fl);
        if (fr != null) area.right = Math.min(area.right, vw - fr);
        if (fb != null) area.bottom = Math.min(area.bottom, vh - fb);
      }
      /* keep clear of the map controls column on the right when there is room beside it */
      var mc = d.querySelector && d.querySelector('.mapctl:not([hidden])');
      if (mc && mc.getBoundingClientRect) { var mr = mc.getBoundingClientRect(); if (mr.width > 0 && mr.left - 8 - area.left >= 344 && mr.left < area.right) area.right = mr.left - 8; }
      var lg = d.querySelector && d.querySelector('.legend.is-open');
      if (lg && lg.getBoundingClientRect) { var lr = lg.getBoundingClientRect(); if (lr.width > 0 && lr.left < area.left + 300) area.left = Math.max(area.left, Math.min(lr.right + 8, area.right - 344)); }
    } catch (e) { /* defaults */ }
    if (area.right - area.left < 200 || area.bottom - area.top < 160) area = { left: 0, top: 0, right: vw, bottom: vh };
    return area;
  }
  /* The kecamatan's box on screen (client px), so the popup can sit beside it instead of covering it. */
  function screenBox(kecId) {
    var b = boundsOf(kecId), map = MCD.map && isFn(MCD.map.getMap) ? MCD.map.getMap() : null;
    if (!b || !map || !isFn(map.project) || !map.getContainer) return null;
    try {
      var r = map.getContainer().getBoundingClientRect(), p0 = map.project(b[0]), p1 = map.project(b[1]);
      return { left: r.left + Math.min(p0.x, p1.x), right: r.left + Math.max(p0.x, p1.x), top: r.top + Math.min(p0.y, p1.y), bottom: r.top + Math.max(p0.y, p1.y) };
    } catch (e) { return null; }
  }
  function place(pop, x, y, avoid, dock) {
    var A = freeArea(), m = 12, w = Math.min(pop.offsetWidth || 320, A.right - A.left - 2 * m);
    pop.style.width = Math.round(w) + 'px';
    pop.style.maxHeight = Math.max(160, Math.round(A.bottom - A.top - 24)) + 'px';
    var hh = Math.min(pop.offsetHeight || 360, A.bottom - A.top - 24), off = 16;
    if (dock === 'right') {
      pop.style.left = Math.round(Math.max(A.left + m, A.right - w - m)) + 'px';
      pop.style.top = Math.round(clamp((A.top + A.bottom) / 2 - hh / 2, A.top + m, Math.max(A.top + m, A.bottom - hh - m))) + 'px';
      return;
    }
    if (!isNum(x) || !isNum(y)) { x = (A.left + A.right) / 2; y = (A.top + A.bottom) / 2; }
    var left = x + off + w <= A.right - m ? x + off : x - off - w;
    /* beside the selected kecamatan when there is room, so its navy outline stays in view */
    if (avoid && avoid.right - avoid.left < (A.right - A.left) * 0.6) {
      if (avoid.right + off + w <= A.right - m) left = Math.max(avoid.right + off, A.left + m);
      else if (avoid.left - off - w >= A.left + m) left = avoid.left - off - w;
    }
    if (left < A.left + m) left = (A.left + A.right) / 2 - w / 2;
    var top = y - hh / 2;
    pop.style.left = Math.round(clamp(left, A.left + m, Math.max(A.left + m, A.right - w - m))) + 'px';
    pop.style.top = Math.round(clamp(top, A.top + m, Math.max(A.top + m, A.bottom - hh - m))) + 'px';
  }

  /** popup(kecId, spec) → {el, close}. spec {stats, x, y (map container px) | clientX, clientY, title, rows, big, chip,
      actions [{label, run, primary}], demo, source, onClose}. One at a time; Esc, a click outside and "Tutup" close it. */
  function popup(kecId, spec) {
    var E = MCD.util && MCD.util.el, d = doc(), ix = index();
    spec = spec || {};
    if (!E || !d || !ix) return null;
    if (kecId && typeof kecId === 'object') { var h0 = kecId.kecamatanId ? kecId : hit(kecId); kecId = h0 ? h0.kecamatanId : null; }
    var k = kecId ? zoneKec(kecId) : null;
    if (!k) return null;
    var returnFocus = d.activeElement && d.activeElement !== d.body ? d.activeElement : null;
    closePopup();
    ensureCSS();
    var s = spec.stats && spec.stats.kecamatan ? spec.stats : null;
    var model = popupModel(kecId, s);
    /* an outer-ring kecamatan (item 30) always shows its own calm model: no section counts or actions */
    if (model.ring) spec = { x: spec.x, y: spec.y, clientX: spec.clientX, clientY: spec.clientY, container: spec.container, avoid: spec.avoid, onClose: spec.onClose, demo: false,
      source: 'Sumber: batas wilayah © kontributor OpenStreetMap, BPS' };
    var rows = Array.isArray(spec.rows) ? spec.rows : model.rows, big = spec.big || model.big, chip = spec.chip === undefined ? model.chip : spec.chip;
    var demo = spec.demo != null ? !!spec.demo : !!(s && s.demo);
    var source = spec.source || ('Sumber: Overture Maps (Sep 2026) · batas wilayah © kontributor OpenStreetMap, BPS' + (s && s.hasBank ? ' · file Livin’ Merchant' + (demo ? ' (data contoh, ilustrasi)' : '') : ''));
    /* item 43 (LAYOUT_V5C §3.2, §7.5): with MCD.windows a click first shows its small callout beside the shape, on every
       width (on a phone MCD.windows shows it in the app's bottom sheet); "Detail ›" opens the kecamatan card */
    if (wsOn()) {
      var wsp = popupWs(kecId, k, spec, rows, big, chip, demo, source, returnFocus);
      if (wsp) return wsp;
    }

    var travelCells = [];
    function row(r) {
      var dt = E('dt', { title: r.title || null }, r.tone ? E('span', { class: 'tz-pop__dot tz-pop__dot--' + r.tone, 'aria-hidden': 'true' }) : null, r.label);
      var dd = E('dd', { class: /\d/.test(String(r.value)) ? null : 'tz-pop__dd--text', title: r.title || null, text: String(r.value == null ? '—' : r.value) });
      if (r.travel) travelCells.push({ dt: dt, dd: dd });
      return E('div', { class: 'tz-pop__row' }, dt, dd);
    }
    var closeBtn = E('button', { type: 'button', class: 'btn btn--secondary tz-pop__close', title: 'Tutup (Esc)', aria: { keyshortcuts: 'Escape' } },
      MCD.util.icon ? MCD.util.icon('close') : null, E('span', { text: 'Tutup' }));
    var titleId = 'tz-pop-title-' + Math.floor(Math.random() * 1e9);
    var actions = E('div', { class: 'tz-pop__actions' });
    (spec.actions || []).forEach(function (a) {
      /* {id: 'detail'} belongs to the callout's "Detail ›" (item 43); this popup shows every number already */
      if (!a || !a.label || !isFn(a.run) || a.id === 'detail') return;
      var b = E('button', { type: 'button', class: 'btn ' + (a.primary ? 'btn--primary' : 'btn--secondary') + ' tz-pop__act', text: a.label });
      b.addEventListener('click', function () { closePopup(false, 'action'); try { a.run(kecId); } catch (e) { if (W.console) W.console.error('[MCD.territory] action', e); } });
      actions.appendChild(b);
    });
    var gm = gmapsLink({ q: gmapsQuery(kecId) }, { className: 'tz-pop__gm' });
    if (gm) actions.appendChild(gm);
    var pop = E('div', { class: 'tz-pop', role: 'dialog', aria: { labelledby: titleId, modal: 'false' }, tabindex: '-1', data: { kec: kecId } },
      E('div', { class: 'tz-pop__head' },
        E('div', { class: 'tz-pop__heads' },
          E('span', { class: 'tz-pop__eyebrow t-eyebrow', text: 'Kecamatan · ' + (k.kotaName || '') }),
          E('span', { class: 'tz-pop__title', id: titleId, text: spec.title || k.name })),
        demo ? E('span', { class: 'tz-pop__demo', text: 'CONTOH' }) : null, closeBtn),
      big ? E('div', { class: 'tz-pop__big' },
        E('span', { class: 'tz-pop__value', text: big.value }),
        big.caption ? E('span', { class: 'tz-pop__caption', text: big.caption }) : null) : null,
      chip ? E('p', { class: 'tz-pop__third' }, E('span', { class: 'tz-pop__dot tz-pop__dot--' + (chip.tone || 'none'), 'aria-hidden': 'true' }), E('span', { text: chip.text })) : null,
      E('dl', { class: 'tz-pop__rows' }, rows.map(row)),
      actions.children && actions.children.length ? actions : null,
      E('p', { class: 'tz-pop__src', text: source }));

    var host = d.getElementById('overlay-root') || d.body;
    host.appendChild(pop);
    var x = spec.clientX, y = spec.clientY;
    if (!isNum(x) || !isNum(y)) {
      var c = spec.container || (MCD.map && isFn(MCD.map.getMap) && MCD.map.getMap() && MCD.map.getMap().getContainer()) || d.getElementById('map');
      var r = c && c.getBoundingClientRect ? c.getBoundingClientRect() : null;
      x = r && isNum(spec.x) ? r.left + spec.x : null;
      y = r && isNum(spec.y) ? r.top + spec.y : null;
    }
    /* item 38: the map focuses the kecamatan and, on a desktop, keeps room on the right for this popup; the popup docks
       there at once, so it does not jump when the camera lands */
    var focused = spec.focus !== false && mapFocus('focusArea', { kind: 'kecamatan', id: kecId, source: 'popup' }) === true;
    if (focused) watchFocus();
    /* phones (< 600 px, the map is the hero above the panels): a bottom sheet under the map hero with its main action
       pinned, so the focused kecamatan and "Lihat merchant di kecamatan ini" both stay in view (v4 QA) */
    if ((W.innerWidth || 0) < 600) pop.classList.add('is-sheet');
    else if (focused && (W.innerWidth || 0) >= 1024) place(pop, null, null, null, 'right');
    else place(pop, x, y, spec.avoid === false ? null : screenBox(kecId));
    var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) pop.classList.add('is-in');
    else (W.requestAnimationFrame || setTimeout)(function () { pop.classList.add('is-in'); });

    var rec = { el: pop, kecId: kecId, onClose: spec.onClose, returnFocus: returnFocus, close: closePopup, offTravel: null };
    /* the "Jarak dari KCP" row follows the shared "Jam sibuk" / "Motor (tanpa tol)" switches while the popup is open */
    if (travelCells.length) {
      var retime = function () {
        if (POP !== rec) return;
        var t = travelInfo(k);
        if (!t) return;
        travelCells.forEach(function (c) { c.dd.textContent = t.text; c.dd.title = t.title; c.dt.title = t.title; });
      };
      var D = MCD.distance;
      if (D && isFn(D.on)) rec.offTravel = D.on(retime);
      else if (isFn(W.addEventListener)) { W.addEventListener('mcd:distance', retime); rec.offTravel = function () { W.removeEventListener('mcd:distance', retime); }; }
    }
    rec.onKey = function (e) { if (e.key === 'Escape' && POP === rec) { e.preventDefault(); e.stopPropagation(); closePopup(true, 'esc'); } };
    /* A press outside the popup (see mapFocus above): on the map it waits for the pointer to come up, so a click closes
       and a drag of the map keeps the popup docked; a click on the map that picks another kecamatan reopens the popup
       there (bind handles it). Anywhere else it closes at once and lets go of the focus after that click. */
    rec.press = null;
    rec.onDown = function (e) {
      if (POP !== rec || pop.contains(e.target)) return;
      var where = pressPlace(e.target);
      if (where === 'zoom') return;
      if (where === 'map') { rec.press = { x: +e.clientX || 0, y: +e.clientY || 0 }; return; }
      closePopup(false, 'panel');
    };
    rec.onUp = function (e) {
      var p0 = rec.press;
      rec.press = null;
      if (POP !== rec || !p0) return;
      var dx = (+e.clientX || 0) - p0.x, dy = (+e.clientY || 0) - p0.y;
      if (dx * dx + dy * dy < 16) closePopup(false, 'outside');
    };
    rec.onCancel = function () { rec.press = null; };
    closeBtn.addEventListener('click', function () { closePopup(true, 'button'); });
    d.addEventListener('keydown', rec.onKey, true);
    setTimeout(function () {
      if (POP !== rec) return;
      d.addEventListener('pointerdown', rec.onDown, true);
      d.addEventListener('pointerup', rec.onUp, true);
      d.addEventListener('pointercancel', rec.onCancel, true);
    }, 0);
    POP = rec;
    if (MCD.map && isFn(MCD.map.requestRender)) { try { MCD.map.requestRender(); } catch (e) { /* ignore */ } }
    try { pop.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    return { el: pop, close: closePopup };
  }

  /* Once the focus camera has landed, the popup moves beside the kecamatan if it now covers it (a slide of
     transform only: measured once, then animated by the compositor). */
  var FOCUS_SUB = null;
  function watchFocus() {
    if (FOCUS_SUB || !MCD.map || !isFn(MCD.map.on)) return;
    FOCUS_SUB = MCD.map.on('focus', function (st) {
      if (!st || !st.settled || !POP || POP.kecId !== st.id || st.phase === 'exit' || st.phase === 'off') return;
      replace(POP);
    });
  }
  function overlaps(a, b) { return !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top); }
  function replace(rec) {
    if (!rec || rec.ws) return;                       /* item 43: the callout places itself every frame (MCD.windows) */
    var pop = rec && rec.el;
    if (!pop || !pop.isConnected || !isFn(pop.getBoundingClientRect)) return;
    if (pop.classList && pop.classList.contains('is-sheet')) return;     /* the phone sheet stays under the map hero */
    var box = screenBox(rec.kecId), r0 = pop.getBoundingClientRect();
    if (!box || !overlaps(r0, box)) return;
    var L0 = pop.style.left, T0 = pop.style.top;
    place(pop, box.right, (box.top + box.bottom) / 2, box);
    var r1 = pop.getBoundingClientRect(), dx = Math.round(r0.left - r1.left), dy = Math.round(r0.top - r1.top);
    /* no side is free: it stays docked rather than move onto the kecamatan */
    if (overlaps(r1, box)) { pop.style.left = L0; pop.style.top = T0; return; }
    var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || (!dx && !dy)) return;
    pop.style.transition = 'none';
    pop.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    void pop.offsetWidth;
    pop.style.transition = 'transform var(--dur-base, 300ms) var(--ease-out, cubic-bezier(.22,1,.36,1))';
    pop.style.transform = '';
    setTimeout(function () { if (pop.style) pop.style.transition = ''; }, 360);
  }

  /* ---- item 43 (LAYOUT_V5C, concept C "Kartu bertahap"): the callout first, then the kecamatan card ----------------
   * With MCD.windows (SHELL lane) a kecamatan click shows a small callout beside the shape (its name, at most 3 numbers,
   * the section's main action, "Detail ›" and "Buka di Google Maps" in words); MCD.windows places it every frame, never
   * on the shape, and on a phone shows it in the app's bottom sheet. The callout holds the focus as the 'popup' signal,
   * exactly like the popup. "Detail ›" runs the section's {id: 'detail'} action (its own kecamatan card, numbers first);
   * without one, this file opens a generic kecamatan card (MCD.windows.sheet). */
  /* the edge chip ("‹ Makasar", .ws-edge) recentres the callout's kecamatan: a press on it is not a press outside */
  var WS_KEEP = '.ws-co, .ws-win, .ws-tray, .ws-drawer, .ws-rail, .ws-slim, .ws-edge, .drawer';
  /* MCD.windows close reasons → closePopup reasons (INTEGRATION_NOTES §15), and back. 'replace' lets go of the popup
     signal at once: whatever replaced the callout (an item inside the kecamatan holds the focus as a trail; on a phone
     the app sheet closing) must never leave a focus behind that nothing holds on screen */
  var WS_IN = { button: 'button', esc: 'esc', outside: 'outside', replace: 'api', detail: 'detail', action: 'action', section: 'api', privacy: 'api', lock: 'api', tidy: 'api' };
  var WS_OUT = { button: 'button', esc: 'esc', outside: 'outside', panel: 'outside', action: 'action', detail: 'detail', pick: 'replace', api: 'replace' };
  function wsApi() { var w = MCD.windows; return w && typeof w === 'object' && isFn(w.callout) ? w : null; }
  function wsOn() {
    var w = wsApi();
    if (!w) return false;
    try { return !isFn(w.mode) || w.mode() !== 'off'; } catch (e) { return false; }
  }
  /** "Samarkan nama" is on: no Google links (LAYOUT_V5C §3.12). */
  function veiled() {
    var S0 = MCD.state, st = null;
    try { st = S0 && isFn(S0.get) ? S0.get() : null; } catch (e) { st = null; }
    return !!(st && st.privacy && st.privacy.veil);
  }
  function runAct(a, kecId) { try { a.run(kecId); } catch (e) { if (W.console) W.console.error('[MCD.territory] action', e); } }
  function within(t, sel) { try { return !!(t && isFn(t.closest) && t.closest(sel)); } catch (e) { return false; } }
  /** Is a card open that a map pick should update in place (the active card, not minimised, not pinned; §3.1)? */
  function cardOpen(Wn) {
    try { return isFn(Wn.list) && (Wn.list() || []).some(function (c) { return c && c.id === 'detail' && c.state !== 'min' && !c.pinned; }); }
    catch (e) { return false; }
  }
  var SWAP = null;         // a kecamatan pick waiting to update the open card (§3.1)
  /** The callout's numbers (at most 3): the big value, then the first row and one row that says what to do (17+,
      belum ada di LVM, prospek), never the same number twice and never the travel row. */
  function briefRows(rows, big) {
    var out = [], seen = {};
    if (big && big.value != null) { out.push({ label: big.caption || '', value: String(big.value), big: true }); seen[String(big.value)] = 1; }
    var pick = (rows || []).filter(function (r) { return r && !r.travel && r.label && r.value != null && !seen[String(r.value)]; });
    var first = pick[0];
    var tell = pick.filter(function (r, i) { return i > 0 && /17\+|Belum ada|Prospek/i.test(r.label); })[0] || pick[1];
    [first, tell].forEach(function (r) {
      if (!r || out.length >= 3 || seen[String(r.value)]) return;
      seen[String(r.value)] = 1;
      out.push({ label: String(r.label).replace(/ \(dapat memiliki KTP\)/, ''), value: String(r.value), tone: r.tone && r.tone !== 'potential' ? r.tone : null, title: r.title || null });
    });
    return out;
  }
  function popupWs(kecId, k, spec, rows, big, chip, demo, source, returnFocus) {
    var Wn = wsApi(), d = doc();
    if (!Wn || !d) return null;
    var acts = (spec.actions || []).filter(function (a) { return a && isFn(a.run) && (a.label || a.id === 'detail'); });
    var detailAct = acts.filter(function (a) { return a.id === 'detail'; })[0] || null;
    var rest = acts.filter(function (a) { return a.id !== 'detail' && a.label; });
    var main = rest.filter(function (a) { return a.primary; })[0] || rest[0] || null;
    var phone = false;
    try { phone = isFn(Wn.mode) && Wn.mode() === 'phone'; } catch (e) { phone = false; }
    /* LAYOUT_V5C §3.1: a map pick while a card is open (not minimised, not pinned) updates that card, with no callout (no
       pile-up): the kecamatan's own card, numbers first (the section's {id: 'detail'}, else the generic card). One task
       later, after the section has dropped the kecamatan selection of this click; the section's card holds the focus. */
    if (!phone && cardOpen(Wn)) {
      var go = { timer: 0 };
      SWAP = go;
      go.timer = setTimeout(function () {
        if (SWAP !== go) return;
        SWAP = null;
        /* as the callout's "Detail ›": its onClose first (the section's highlight), then the card */
        if (isFn(spec.onClose)) { try { spec.onClose(); } catch (e) { /* ignore */ } }
        if (detailAct) runAct(detailAct, kecId);
        else kecSheet(kecId, k, spec, rows, big, chip, demo, source, main);
      }, 0);
      return { el: null, swap: true, close: function () { if (SWAP === go) { clearTimeout(go.timer); SWAP = null; } } };
    }
    var rec = { el: null, kecId: kecId, onClose: spec.onClose, returnFocus: returnFocus, close: closePopup, offTravel: null, ws: true, handle: null, press: null, closedBy: null };
    POP = rec;
    if (spec.focus !== false) mapFocus('focusArea', { kind: 'kecamatan', id: kecId, source: 'popup' });
    var brief = spec.brief && typeof spec.brief === 'object' ? spec.brief : {};
    var links = [];
    if (!veiled()) { var url = gmapsUrl({ q: gmapsQuery(kecId) }); if (url) links.push({ label: 'Buka di Google Maps', href: url, title: GMAPS_TIP }); }
    var cspec = {
      key: 'kec:' + kecId, kind: 'kec',
      anchor: { bbox: boundsOf(kecId), label: Array.isArray(k.label) ? k.label.slice() : null },
      eyebrow: 'Kecamatan · ' + (k.kotaName || ''), title: spec.title || k.name, demo: demo, source: source,
      chips: Array.isArray(brief.chips) ? brief.chips.slice(0, 2) : [],
      numbers: Array.isArray(brief.numbers) ? brief.numbers.slice(0, 3) : briefRows(rows, big),
      note: brief.note !== undefined ? brief.note : (chip && chip.text ? { text: chip.text, tone: chip.tone || 'none', hintId: chip.hintId || null } : null),
      actions: main ? [{ id: main.id || 'main', label: main.label, primary: true, run: function () { runAct(main, kecId); } }] : [],
      links: links,
      detail: function () { if (detailAct) runAct(detailAct, kecId); else kecSheet(kecId, k, spec, rows, big, chip, demo, source, main); },
      onClose: function (reason) {
        if (POP !== rec) return;
        rec.closedBy = reason || 'button';
        closePopup(reason === 'button' || reason === 'esc', WS_IN[reason] || 'api');
      }
    };
    var show = function () {
      var h = null;
      try { h = Wn.callout(cspec); } catch (e) { h = null; if (W.console) W.console.error('[MCD.territory] callout', e); }
      if (h) { rec.handle = h; rec.el = h.el || null; }
      return h;
    };
    if (phone) {
      /* a phone shows the callout in the app's bottom sheet: one task later, after the section has dropped the kecamatan
         selection of this click (Sekolah and Merchant clear it in a setTimeout 0, and that closes the app sheet) */
      rec.timer = setTimeout(function () {
        rec.timer = 0;
        if (POP !== rec || show()) return;
        POP = null;
        if (spec.focus !== false) mapFocus('clearFocus', { source: 'popup' });
      }, 0);
    } else if (!show()) {
      /* MCD.windows could not show it: let go and fall back to the popup */
      if (POP === rec) POP = null;
      if (spec.focus !== false) mapFocus('clearFocus', { source: 'popup' });
      return null;
    }
    /* Esc in the bubble phase: the shell's Esc order (a menu first, then the callout) runs before and marks the key used */
    rec.onKey = function (e) { if (e.key === 'Escape' && POP === rec && !e.defaultPrevented) { if (isFn(e.preventDefault)) e.preventDefault(); closePopup(true, 'esc'); } };
    /* a press outside: on the map a click closes it (the map decides about the focus) and a drag keeps it; the cards,
       the rail, the drawer and the tray never close it; any other panel closes it after that click has run */
    rec.onDown = function (e) {
      if (POP !== rec) return;
      var t = e.target;
      if (rec.el && isFn(rec.el.contains) && rec.el.contains(t)) return;
      if (within(t, WS_KEEP)) return;
      var where = pressPlace(t);
      if (where === 'zoom') return;
      if (where === 'map') { rec.press = { x: +e.clientX || 0, y: +e.clientY || 0 }; return; }
      closePopup(false, 'panel');
    };
    rec.onUp = function (e) {
      var p0 = rec.press;
      rec.press = null;
      if (POP !== rec || !p0) return;
      var dx = (+e.clientX || 0) - p0.x, dy = (+e.clientY || 0) - p0.y;
      if (dx * dx + dy * dy < 16) closePopup(false, 'outside');
    };
    rec.onCancel = function () { rec.press = null; };
    d.addEventListener('keydown', rec.onKey, false);
    setTimeout(function () {
      if (POP !== rec) return;
      d.addEventListener('pointerdown', rec.onDown, true);
      d.addEventListener('pointerup', rec.onUp, true);
      d.addEventListener('pointercancel', rec.onCancel, true);
    }, 0);
    if (MCD.map && isFn(MCD.map.requestRender)) { try { MCD.map.requestRender(); } catch (e) { /* ignore */ } }
    return { el: rec.el, close: closePopup };
  }
  /** The generic kecamatan card ("Detail ›" when the section has no {id: 'detail'} action): the numbers and the place
      in folding sections, the section's main action and Google Maps in words; it holds the focus while open ('api'),
      and Tutup / Esc on it end the focus like the callout's Tutup. */
  var KS = null;
  function kecSheet(kecId, k, spec, rows, big, chip, demo, source, main) {
    var Wn = wsApi(), E = MCD.util && MCD.util.el;
    if (!Wn || !isFn(Wn.sheet) || !E) return null;
    var me = { kecId: kecId, handle: null, off: null };
    function kv(r) {
      return E('div', { class: 'tz-pop__row' },
        E('dt', { title: r.title || null }, r.tone ? E('span', { class: 'tz-pop__dot tz-pop__dot--' + r.tone, 'aria-hidden': 'true' }) : null, r.label),
        E('dd', { class: /\d/.test(String(r.value)) ? null : 'tz-pop__dd--text', title: r.title || null, text: String(r.value == null ? '—' : r.value) }));
    }
    function make() {
      var tv = travelInfo(k);
      var rs = rows.filter(Boolean).map(function (r) { return r.travel && tv ? Object.assign({}, r, { value: tv.text, title: tv.title }) : r; });
      var where = rs.filter(function (r) { return r.travel || /^Jarak|Wilayah dalam/.test(r.label); });
      var nums = rs.filter(function (r) { return where.indexOf(r) < 0; });
      var sections = [];
      if (nums.length || chip) {
        sections.push({ id: 'angka', title: 'Angka kecamatan', open: true, nodes: [
          chip && chip.text ? E('p', { class: 'tz-pop__third' }, E('span', { class: 'tz-pop__dot tz-pop__dot--' + (chip.tone || 'none'), 'aria-hidden': 'true' }), E('span', { text: chip.text })) : null,
          nums.length ? E('dl', { class: 'tz-pop__rows' }, nums.map(kv)) : null].filter(Boolean) });
      }
      if (where.length) sections.push({ id: 'lokasi', title: 'Lokasi', preview: where.map(function (r) { return String(r.value); }).join(' · '), open: true, nodes: [E('dl', { class: 'tz-pop__rows' }, where.map(kv))] });
      var actions = [];
      if (main) actions.push({ label: main.label, primary: true, run: function () { runAct(main, kecId); } });
      if (!veiled()) { var url = gmapsUrl({ q: gmapsQuery(kecId) }); if (url) actions.push({ label: 'Buka di Google Maps', href: url, title: GMAPS_TIP }); }
      return { id: 'detail', kind: 'kec', key: 'kec:' + kecId, eyebrow: 'Kecamatan · ' + (k.kotaName || ''), title: spec.title || k.name, demo: demo,
        chips: [], crumb: null, numbers: briefRows(rows, big), quick: [], sections: sections, actions: actions.slice(0, 2), source: source, hints: [],
        anchor: { bbox: boundsOf(kecId), label: Array.isArray(k.label) ? k.label.slice() : null },
        refresh: make, pinnable: true, minimisable: true, closable: true, onClose: onClose };
    }
    function onClose(reason) {
      if (KS !== me) return;
      KS = null;
      if (isFn(me.off)) { try { me.off(); } catch (e) { /* ignore */ } }
      var M = MCD.map, mine = true;
      try { mine = !(M && isFn(M.focused)) || M.focused() === kecId; } catch (e) { mine = true; }
      if ((reason === 'button' || reason === 'esc') && mine) mapFocus('clearFocus', { reason: reason });
      else mapFocus('clearFocus', { source: 'api' });
    }
    if (KS && KS.handle && isFn(KS.handle.close)) { var old = KS; KS = null; if (isFn(old.off)) { try { old.off(); } catch (e) { /* ignore */ } } try { old.handle.close('replace'); } catch (e) { /* gone */ } }
    mapFocus('focusArea', { kind: 'kecamatan', id: kecId, source: 'api', camera: false });
    KS = me;
    try { me.handle = Wn.sheet(make()); } catch (e) { me.handle = null; if (W.console) W.console.error('[MCD.territory] card', e); }
    if (!me.handle) { KS = null; mapFocus('clearFocus', { source: 'api' }); return null; }
    var D = MCD.distance, upd = function () { if (KS === me && me.handle && isFn(me.handle.update)) { try { me.handle.update(make()); } catch (e) { /* keep */ } } };
    if (D && isFn(D.on)) me.off = D.on(upd);
    return me.handle;
  }

  /** bind({stats, popup, actions, onPick, onClose}) → off(). A kecamatan click opens the popup (and highlights the
      kecamatan); it never sets a filter by itself (IA H7). Call in the section's mount and off() in unmount. Item 43:
      actions may include {id: 'detail', run} (the callout's "Detail ›"); bind remembers its options for openBound(). */
  var BOUND = null;
  function bindSpec(opts, kecId, p) {
    var s = isFn(opts.stats) ? opts.stats() : opts.stats;
    var spec = { stats: s, x: p ? p.x : undefined, y: p ? p.y : undefined, onClose: opts.onClose };
    var ringKec = isRingKec(kecId);         /* item 30: the outer ring keeps the calm "di luar 15 km" popup */
    if (!ringKec && isFn(opts.popup)) { try { Object.assign(spec, opts.popup(kecId, s && s.kecamatan ? s.kecamatan[kecId] : null) || {}); } catch (e) { /* defaults */ } }
    if (!ringKec && isFn(opts.actions)) { try { spec.actions = (opts.actions(kecId) || []).concat(spec.actions || []); } catch (e) { /* none */ } }
    return spec;
  }
  function bind(opts) {
    opts = opts || {};
    if (!MCD.map || !isFn(MCD.map.onPick)) return function () {};
    var me = { opts: opts };
    BOUND = me;
    var unsub = MCD.map.onPick(function (p) {
      if (!p || p.kind !== KIND) { if (POP && (!p || !p.kind)) closePopup(false, 'pick'); return; }
      var h = hit(p);
      if (!h) return;
      if (isFn(opts.onPick)) { try { opts.onPick(h, p); } catch (e) { /* ignore */ } }
      if (opts.popup === false) return;
      popup(h.kecamatanId, bindSpec(opts, h.kecamatanId, p));
    });
    return function () { if (BOUND === me) BOUND = null; if (isFn(unsub)) unsub(); closePopup(); };
  }
  /** openBound(kecId) → {el, close} | null (item 43): open the kecamatan's callout (or popup) again with the options of
      the section bound now, as a click on it would (the section's onPick highlights it). */
  function openBound(kecId) {
    var b = BOUND;
    if (!b || kecId == null || !zoneKec(String(kecId))) return null;
    kecId = String(kecId);
    var h = hit(kecId);
    if (h && isFn(b.opts.onPick)) { try { b.opts.onPick(h, { kind: KIND, id: kecId, kecamatanId: kecId }); } catch (e) { /* ignore */ } }
    if (b.opts.popup === false) return null;
    return popup(kecId, bindSpec(b.opts, kecId, null));
  }

  /* ------------------------------------------------------------- data loading */

  function ensureData() {
    if (ready()) return Promise.resolve(true);
    var d = doc();
    if (!d) return Promise.resolve(false);
    return DATA_FILES.reduce(function (chain, f) {
      return chain.then(function () {
        if (W[f[0]]) return true;
        return new Promise(function (resolve) {
          var existing = d.querySelector('script[data-mcd-territory="' + f[1] + '"]');
          var s = existing || d.createElement('script');
          s.addEventListener('load', function () { resolve(true); });
          s.addEventListener('error', function () { resolve(false); });
          if (!existing) { s.src = f[1]; s.async = false; s.setAttribute('data-mcd-territory', f[1]); (d.head || d.body).appendChild(s); }
        });
      });
    }, Promise.resolve(true)).then(function () { IX = null; GEO = null; NAME_IX = null; ZONES = null; ZK = {}; return ready(); });
  }


  /* ------------------------------------------------------------- styles (tokens only; one class per rule, so section CSS can override) */

  function ensureCSS() {
    var d = doc();
    if (!d || d.getElementById('mcd-territory-css')) return;
    var rules = [
      '.tz-pop{position:fixed;z-index:70;width:320px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;padding:16px;',
      'background:var(--glass-bg-pop);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);',
      'border:1px solid var(--glass-border);border-radius:var(--r-glass);box-shadow:var(--glass-hl),var(--glass-shadow);color:var(--text-1);font-family:var(--font-sans);',
      /* MCD.motion (item 38): in over --dur-base with ease-out, out over --dur-fast with ease-in-out, like the drawer */
      'opacity:0;transform:translateY(4px);transition:opacity var(--dur-fast,180ms) var(--ease-in-out,cubic-bezier(.65,0,.35,1)),transform var(--dur-fast,180ms) var(--ease-in-out,cubic-bezier(.65,0,.35,1))}',
      '.tz-pop.is-in{opacity:1;transform:none;transition-duration:var(--dur-base,300ms);transition-timing-function:var(--ease-out,cubic-bezier(.22,1,.36,1))}',
      '.tz-pop:focus{outline:none}',
      '.tz-pop__head{display:flex;align-items:flex-start;gap:8px}',
      '.tz-pop__heads{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}',
      '.tz-pop__eyebrow{color:var(--text-3)}',
      '.tz-pop__title{font:500 20px/26px var(--font-serif);color:var(--text-1)}',
      '.tz-pop__close{flex:none;height:40px;padding:0 12px;margin:-4px -4px 0 0;gap:6px}',
      '.tz-pop__demo{flex:none;align-self:center;padding:2px 6px;border:1px solid var(--demo-tag-rule);border-radius:6px;',
      'color:var(--demo-tag-ink);background:var(--demo-tag-bg);font:600 12px/1.3 var(--font-sans);letter-spacing:0.06em}',
      '.tz-pop__big{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;margin:12px 0 0}',
      '.tz-pop__value{font:400 32px/36px var(--font-serif);color:var(--text-1);font-variant-numeric:tabular-nums}',
      '.tz-pop__caption{font:500 14px/20px var(--font-sans);color:var(--text-2)}',
      '.tz-pop__third{display:flex;align-items:center;gap:8px;margin:10px 0 0;padding:8px 10px;border-radius:8px;background:var(--surface-hover);font:500 13px/18px var(--font-sans);color:var(--text-1)}',
      /* the label column keeps at least 10em, so a long value ("23,9 km · ± 1 jam (jam sibuk, tanpa tol)") wraps instead of
         squeezing the label into one word per line */
      '.tz-pop__rows{display:grid;grid-template-columns:minmax(10em,1fr) auto;gap:6px 12px;margin:12px 0 0;padding:12px 0 0;border-top:1px solid var(--rule)}',
      '.tz-pop__row{display:contents}',
      '.tz-pop__row dt{display:flex;align-items:center;gap:8px;margin:0;font:400 14px/20px var(--font-sans);color:var(--text-2)}',
      '.tz-pop__row dd{margin:0;font:600 14px/20px var(--font-sans);color:var(--text-1);text-align:right;font-variant-numeric:tabular-nums}',
      '.tz-pop__row dd.tz-pop__dd--text{font:400 13px/20px var(--font-sans);color:var(--text-3)}',
      '.tz-pop__dot{width:10px;height:10px;border-radius:3px;flex:none}',
      '.tz-pop__dot--ok{background:var(--status-ok)}',
      '.tz-pop__dot--bad{background:var(--status-bad)}',
      '.tz-pop__dot--mid{background:var(--status-mid)}',
      '.tz-pop__dot--none{background:var(--status-none)}',
      '.tz-pop__dot--potential{background:var(--status-potential)}',
      '.tz-pop__actions{display:grid;gap:8px;margin:14px 0 0}',
      '.tz-pop__actions .btn{width:100%;height:40px;justify-content:center}',
      '.tz-pop__src{margin:12px 0 0;font:400 12px/16px var(--font-sans);color:var(--text-3)}',
      '.tz-legend__sw{display:block}',
      '.tz-legend__chip{display:block;width:16px;height:9px;border-radius:5px;background:var(--surface-raised);border:1px solid var(--rule-strong);box-sizing:border-box}',
      '.tz-legend__chip--muted{opacity:.55;border-color:var(--rule)}',
      '.tz-legend__src{margin-top:6px}',
      '@media (max-width:599px){.tz-pop__actions .btn{height:44px}.tz-pop__close{height:44px}}',
      /* phones: a bottom sheet (42% of the screen, under the map hero) whose actions stay pinned while the rows scroll */
      '.tz-pop.is-sheet{left:0;right:0;top:auto;bottom:0;width:auto;max-width:none;max-height:42vh;padding-bottom:0;border-radius:var(--r-glass) var(--r-glass) 0 0;transform:translateY(24px)}',
      '.tz-pop.is-sheet.is-in{transform:none}',
      '.tz-pop.is-sheet .tz-pop__actions{position:sticky;bottom:0;z-index:1;margin:12px -16px 0;padding:10px 16px calc(10px + env(safe-area-inset-bottom, 0px));background:var(--glass-solid);border-top:1px solid var(--rule)}',
      '.tz-pop.is-sheet .tz-pop__src{padding-bottom:12px}',
      '@media (prefers-reduced-motion: reduce){.tz-pop{transition:none;transform:none}}',
      '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){.tz-pop{background:var(--glass-solid)}}'
    ];
    var st = d.createElement('style');
    st.id = 'mcd-territory-css';
    st.textContent = rules.join('\n');
    (d.head || d.body).appendChild(st);
  }

  MCD.territory = {
    KIND: KIND, CATEGORIES: CATS.slice(), CATEGORY_LABELS: Object.assign({}, CAT_LABEL), BAND_MODES: ['relative', 'absolute'], BRANCH_KECAMATAN: BRANCH_KEC,
    ready: ready, ensureData: ensureData,
    kecamatan: kecamatan, kecamatanIdOf: kecamatanIdOf, boundsOf: boundsOf, gmapsQuery: gmapsQuery,
    /* item 30: focus / outer ring / beyond, computed from data/admin-areas.js */
    zones: zones, zoneOf: function (id) { var z = zones(); return z ? z.zoneOf(id) : null; },
    stats: stats, statsFromRecords: statsFromRecords,
    layers: layers, legendGroups: legendGroups, legend: legend, priority: priority,
    hit: hit, tooltip: tooltip, popup: popup, closePopup: closePopup, bind: bind, openBound: openBound,
    popupOpen: function () { return POP ? POP.kecId : null; },
    hovered: function () { return HOV.id; }, ink: ink, chipDot: chipDot,
    palette: palette, colour: colour, classOf: classOf, ramp: ramp,
    terciles: terciles, relativeBand: relBand, relativeWords: relativeWords, rankOf: rankOf, thirdText: thirdText,
    declutterOrder: function (list, selected, prio) { return declutterOrder(list, selected, prio); },
    /* internal spatial index (UX fix plan D1): used by the statistics, never drawn or named on screen */
    tiles: tiles, tile: tile, tileAt: tileAt, tileOfPoi: tileOfPoi,
    gmaps: GMAPS,
    /* internal, for tests: the default popup model {rows, big, chip, ring?} of a kecamatan */
    _popupModel: function (kecId, s) { return popupModel(kecId, s && s.kecamatan ? s : null); },
    /* internal, for tests/map-v5.test.mjs: the callout's numbers (item 43) */
    _briefRows: briefRows,
    _status: STATUS, _poiIndex: poiIndex
  };
})(window.MCD = window.MCD || {});
