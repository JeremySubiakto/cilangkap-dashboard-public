/* ==========================================================================
 * MCD.map — map engine · Acquisition Dashboard (Bank Mandiri Jakarta Cilangkap Branch)
 * Two flat basemaps (U6, COPY_STYLE_EN items 10, 23, 25): Sederhana = calm street map
 * (OpenFreeMap positron / dark recoloured at load into a neutral greyscale, never green:
 * calmPaint); Detail = flat Esri satellite in greyscale with a slight contrast boost, with a
 * small "Warna asli" switch (remembered per browser) for natural colour. Every map is
 * north-up with pitch 0: no 2D/3D toggle, no tilt, no rotation, no orbit, no 3D buildings
 * and no extruded columns. Distance rings are neutral grey; gold is Mabes TNI and the branch.
 * MapLibre GL JS 4.7.1 + deck.gl 9.0.41 (MapboxOverlay, interleaved)
 * BUILD_SPEC §E.1–E.13, §J.4 (as narrowed by the branch decisions of 15 Oct 2026)
 *
 * ---------------------------------------------------------------------------
 * LIFECYCLE (called by app.js, only after MCD.gate onUnlock)
 *   MCD.map.init(el, {camera, padding, intro})  → true | false (fallback shown)
 *   MCD.map.setLayout(padding)                  section.layout().padding
 *   MCD.map.setPosture(section, tab, {camera})  on section entry
 *   MCD.map.render(derived)                     after every derive.compute
 *   MCD.map.intro()                             first load without `cam`
 *   MCD.map.setView('overview'|'deep')          street map ⇄ flat satellite (U6)
 *   MCD.map.setTheme('day'|'night')             street style / satellite brightness / palette (U7)
 *   MCD.map.setTrueColour(bool) · trueColour()  "Warna asli" on the satellite (default false = greyscale)
 *
 * The core draws only public, shared furniture: the Mabes TNI outline, distance
 * rings, places (sites), the branch beacon and the selection halo. Every bank or
 * section layer (merchants, schools, KPR projects, the territory hex tiles) is
 * registered by its section through the extension contract below.
 *
 * EXTENSION CONTRACT (section agents never edit this file)
 *   MCD.map.registerLayers(key, fn, opts?) → unregister()
 *     key  section id ('overview' | 'merchants' | 'schools' | 'property') or '*'
 *     fn(derived, mapState) → deck.Layer[]  |  {base:[…], top:[…]}
 *       base layers draw under the sites, top layers above everything (labels).
 *       Ids must be unique and prefixed with the section id. Never set
 *       `extruded: true` or an elevation: the map is flat (COPY_STYLE_EN item 10).
 *       Results are cached; fn re-runs when derived, zoom quantum (0.25),
 *       hover, selection, layer set, veil, radius, view, palette or
 *       MCD.map.requestRender() change. Keep data arrays memoised.
 *     A layer may carry prop `mcd: {kind, id(o), tooltip(o, info), pick(o)}`
 *       so hover tooltips and onPick work without further wiring.
 *   MCD.map.registerPosture(key, posture | fn(tab, mapState) → posture)
 *     posture = { imagery:'full'|'plan'|'merchants'|'wide'|'dimmed'|{brightnessMax,
 *       saturation, contrast, wash}, buildings:'flat'|'off', camera: presetKey |
 *       {center,zoom} | {bounds} | fn(api) | null, layerSet, plan:bool, deck:bool,
 *       markers:bool, ticker:bool, rings: ringSetName|null, attribution:string,
 *       activeRingKm, core:{sites, beacon, rings, boundary}, onRingClick(km), ringHint,
 *       telemetry(derived, mapState) → string }
 *     Merge order: built-in < config.sections posture < registerPosture(section) < layout object.
 *   MCD.map.registerPreset(key, {label, camera|bounds(fn), wide})
 *   MCD.map.registerLegend(key, fn(derived, mapState) → [{title, rows|ramp}])
 *   MCD.map.registerStyle(key, {sources:{}, layers:[], beforeId})   (MapLibre layers; no fill-extrusion)
 *   MCD.map.registerRingSet(name, {center:[lon,lat], radiiKm:[], core, outer, label(km)})
 *   MCD.map.registerTooltip(layerIdPrefix, fn(object, info) → tooltip model)
 *   MCD.map.registerSelectable(kind, fn(id) → [lon, lat] | null)
 *   MCD.map.setLayerSet(name)
 *   MCD.map.kit                  palette, atlas, glyphs, hexbin, helpers (read-only)
 *
 * ZONES (COPY_STYLE_EN item 30) · POINTS AND SYMBOLS (item 34)
 *   MCD.map.setZones({mode:'kecamatan15'} | {mode:'kecamatan', km: 30} | {mode:'radius', km} | {mode:'none'}) → zones in effect
 *     'kecamatan15' (default): the 33 focus kecamatan clear, the 26 outer-ring kecamatan under one soft shade,
 *     everything beyond under a stronger veil (MCD.territory.zones()); 'radius': clear inside a circle around
 *     Mabes TNI, veil beyond (KPR, 30 km). The call belongs to the section on screen; a posture may also carry
 *     `zones`. MCD.map.zones() → {mode, km?}. The 15 km fit keeps every focus chip clear of the panels.
 *     v6 (V6_SPEC §3.3) {mode:'kecamatan', km: 30} (or 'kecamatan30'): the same three zones for the 30 km scope, from
 *     MCD.territory.zones(30): the 103 kecamatan at least half inside 30 km clear, the 15 others of the file under the
 *     shade, the veil beyond; {mode:'kecamatan', km <= 15} is 'kecamatan15'. A change redraws the section layers, and the
 *     map state carries the zones (ms.zones), so MCD.territory.layers() draws the 30 km outlines and chips by itself.
 *     The built-in 'campus' posture (Kampus) opens on these 30 km zones.
 *   MCD.map.focusPoint({lon, lat, zoom?, kind?, id?, drawer?}) flies there (zoom 16) and reports a pick {kind, id, focus:true}
 *     once the camera has arrived, so the registered popup / drawer opens. On a desktop the point lands left of the
 *     drawer; a layout change during the flight re-aims it instead of cancelling it.
 *   MCD.map.symbolSprite({shape:'circle'|'diamond'|'rsq', fill:[r,g,b], ring?, star?, px}) → cached sprite
 *     {id, url, canvas, width, height, anchorX, anchorY, mask:false, px, dpr}: a deck IconLayer icon (getIcon,
 *     getSize = px) and a data URL for legends. spriteAtlas([sprite…]) → {iconAtlas, iconMapping}.
 *     v6 (V6_SPEC D9): shape 'shield' (universitas, institut) and 'triangle' (sekolah tinggi, politeknik, akademi, desain
 *     dan kursus); hollow: true = an empty outline (other campus points of the same PT). Legend glyphs 'shield',
 *     'shieldHollow', 'tri', 'triHollow' (kit.glyphSVG), and legend rows {shape, rgb, hollow?} draw the sprite itself.
 *     V8 (V8_SPEC P1; HEALTH_SPEC §2.1–§2.2, H1–H5): shape 'plus' (rumah sakit, a Greek cross) and 'sparkle' (klinik
 *     kecantikan, a four-point star): unit polygons PLUS_PTS and SPARKLE_PTS (kit.shapes.plus, kit.shapes.sparkle; the same
 *     points as MCD.health.sym), drawn with the stroked keyline of the shield and the triangle. Their hollow form keeps
 *     the filled silhouette: a band of the fill colour along the edge, the keyline colour inside (H5, health-core.js's
 *     look: a hollow hospital is exactly as large as a filled one; the Kampus band between two keylines would leave
 *     nothing inside the arms of an 18 px plus). Legend glyphs 'plus', 'plusHollow', 'sparkle', 'sparkleHollow'; legend rows
 *     {shape, rgb, hollow?, ring?, alpha?} draw the sprite (ring = its keyline colour, alpha = a faint symbol).
 *   Selection kinds of Kesehatan (HEALTH_SPEC H24): 'health' (a facility) and 'hfStack' (rows on one point) are points
 *     and draw their route; 'hfCluster' (a clinic bubble: zooms in) and 'hfKec' (a kecamatan: focus mode) draw no route
 *     (NO_ROUTE_KINDS as it is). BUILTIN_POSTURES.health and .wealth (Calon Prioritas) are fallbacks: the 5 km camera
 *     and the 15 km kecamatan zones; the sections register their own postures.
 *   V8 (V7_SPEC §7.6, V8_SPEC P3), the visit plan on the map: setPlanOverlay({stops: [{seq, lon, lat}], line: true,
 *     returnToStart, start?: {lon, lat}}) → boolean draws a numbered badge per stop (20 px: navy with white numbers on
 *     the light street map, inverted on the dark map and the satellite; KCP keeps its own marker) and one thin dashed
 *     order line (1,5 px, 4–4 px dashes, the badge ink at 70 %) from KCP Cilangkap through the stops in order, back to
 *     KCP when returnToStart; straight segments, never green, never pickable, never a route. Only seq, lon and lat are
 *     read. clearPlanOverlay(); planOverlay() → {stops, line, returnToStart} | null. Legend group "Rencana kunjungan".
 *   V8 phones (MOBILE_UX_PLAN M4, M10 item 3): pickingRadius 14 px on a coarse pointer (4 px with a mouse), updated
 *     when the pointer type changes; on a coarse pointer the map draws at most 2 device pixels per CSS pixel and
 *     without MSAA (antialias off), as gate.js already does for its own map.
 *   MCD.map.tierSprite({level 1-4, basis:'biaya'|'jenis'|'perkiraan', theme:'day'|'night', px}) → the kelas biaya badge
 *     (V6_SPEC D6, §4.3): "signal bars", 4 Premium · 3 Atas · 2 Menengah · 1 Reguler, filled = from the published fee or
 *     the type, empty = perkiraan; one neutral ink (navy + white keyline in Terang, near-white + dark keyline in Gelap);
 *     null for level 0 (no badge). tierAtlas({theme, px}) (byName '1f'…'4e'), tierOffset(symbolPx, sprite) → [dx, dy]
 *     for getPixelOffset (top-right of the symbol), tierSVG({level, basis, theme, size}), tierGeom(spec) (the rectangles).
 *     Legend rows {glyph:'tier', level, basis | 'both', label} (one badge, or a filled and an empty one) and
 *     {tiers:[{level, basis, word}], label} (the four glyphs with their words under them).
 *   Selection kinds of Kampus (V6_SPEC §6.3): 'campus' and 'campusSite' are points (they draw their route); 'cpKec' is a
 *     kecamatan (focus mode, no route), like 'smaKec'. Sections register their positions (registerSelectable).
 *     badgeSprite({matra:'AL'|'AD'|'AU'|'GAB', jenis:'markas'|'perumahan'|'rs', theme, px}): the pangkalan badge.
 *   Pangkalan TNI: every site with MCD.ref.pangkalanOf(site) draws as a round badge (layer 'sites-badges'), a
 *     permanent layer with its own legend group "Pangkalan TNI".
 *
 * mapState (handed to layer, posture and legend functions): section, view, theme, palette,
 *   zoom, zoomQ, veil, reveal, radiusKm, hover, selection, layerSet, layers, fontsReady,
 *   beforeId, kit, … and the flat constants pitch 0, bearing 0, dim '2d', extruded false,
 *   mode 'precise', growT 1 (kept so older section code stays flat without changes).
 *
 * CONFIG READ (single table, MCD.config): sections[].posture, map.presets, map.postures,
 *   map.attribution, map.imageryFailure, rings.center / rings.sets, branch, farSiteKm.
 *
 * DOM / CSS CONTRACT (styled by map.css + components.css; zero-specificity
 *   defaults injected as <style id="mcd-map-base-css">):
 *   tooltip .tip > .tip__eyebrow.t-eyebrow .tip__title .tip__row .tip__meta
 *   markers .mk.mk-mabes(.mk-mabes__name/__meta) · .mk.mk-site[.is-home|.is-approx]
 *           > .mk-plate(.mk-site__kind .mk-site__name) .mk-leader .mk-dot
 *   legend  mountLegend(bodyEl) → .lg > .lg__group(.lg__title .lg__row(.lg__glyph
 *           .lg__label .chip__count) .lg__ramp>i×6 .lg__minmax) .lg__note .lg__foot
 *   telemetry mountTelemetry(el) → .telemetry > .telemetry__line(span .telemetry__sep)
 *           .scalebar(.scalebar__bar .scalebar__label)
 *   failure body.is-map-offline (navy grid) · body.no-map + p.map-unavailable ·
 *           .map-notice (.map-notice__t .map-notice__sub button.map-notice__retry)
 *   loading body.is-map-loading + .map-loading(.is-pill .is-done) > .map-loading__sheen
 *           .map-loading__plate(.map-loading__spin .map-loading__t)
 *   plates  collision-aware: home branch, then the Mabes name, then the others; each
 *           tries 3 leader lengths × 3 horizontal offsets and hides when nothing fits
 *   init() removes the shell's pre-map .stage from #map.
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var W = window;
  var DOC = document;
  var EMPTY = [];

  /* ------------------------------------------------------------ constants */

  var DECK_BEFORE = 'deck-anchor';          // deck layers sit under all map labels (an empty layer just below them)
  var HOME_VIEW = { center: [106.9118, -6.3310], zoom: 13.4, pitch: 0, bearing: 0 };
  var INTRO_FROM = { center: [106.9118, -6.3310], zoom: 12.2, pitch: 0, bearing: 0 };
  /* The whole canvas must stay inside this box. Wide enough that KPR's 30 km circle around Mabes TNI (lat −6.60 …
     −6.06, lon 106.64 … 107.19) fits in the free map area beside the side panel, with some veil around it, on a
     1280 × 720 or 1366 × 768 screen (zoom ≈ 9.4: the canvas then spans ≈ 1,4° of longitude, mostly west of the circle
     because the panel covers the left). MCD.config.map.maxBounds mirrors it. */
  var MAX_BOUNDS = [[105.9, -6.85], [107.9, -5.8]];
  var MABES_CENTROID = [106.91366, -6.32945];
  var MABES_LABEL_AT = [106.91340, -6.31790];
  var SME_CENTER = [106.91329, -6.32818];
    var DEFAULT_BRANCH = { lat: -6.33203, lon: 106.90989 };
  var IMAGERY_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var OFM_TILEJSON = 'https://tiles.openfreemap.org/planet';
  var OFM_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
  var ESRI_ATTRIBUTION = 'Esri, Maxar, Earthstar Geographics';
  var R_EARTH_KM = 6371.0088;
  var FONT_SANS = '"Inter Tight", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var FONT_MONO = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var TICK_MS = 33;                         // shared ticker, 30 fps cap (§L.1)
  /* item 43 (v5): the workspace cards (MCD.windows: callout, cards, tray, bottom drawer, rails) hide labels like panels */
  var DEFAULT_OCCLUDERS = '[data-map-occluder], .rail, .sheet, .guide, .mapctl, .kpi-strip, .dock, .drawer, .legend, .telemetry, .tabbar, #topbar, #navrow, #readout, .demo-banner, .maplibregl-ctrl-attrib, .ws-co, .ws-win, .ws-tray, .ws-drawer, .ws-rail, .ws-slim';
  var MINUS = '\u2212';
  var PLATE_MIN_ZOOM = 14;                  // callout plates of places other than Mabes TNI and KCP Cilangkap

  /* ------------------------------------------- palette (mirrors tokens.css) */

  var C = {
    canvas: [5, 8, 15], text1: [237, 239, 243], text2: [167, 176, 192], text3: [124, 135, 154],
    textOff: [75, 85, 104], gold: [242, 183, 5], goldSoft: [255, 231, 161], goldBrand: [255, 183, 0],
    platinum: [201, 209, 220], signal: [56, 214, 232], pos: [76, 195, 138], neg: [242, 109, 91],
    warn: [232, 161, 58], info: [108, 196, 224], navyWash: [4, 18, 42],
    plat: [[26, 35, 51], [58, 74, 99], [111, 129, 158], [174, 187, 205], [238, 242, 247]],
    bMerchant: [233, 237, 242], bGiro: [167, 180, 198], bPayroll: [126, 151, 186],
    bank: { BSI: [90, 107, 136], BNI: [74, 88, 115], BRI: [61, 73, 95], BTN: [51, 64, 85], BJB: [107, 90, 74], OTHER: [43, 52, 69] }
  };
  var HEAT_RGB = [[42, 27, 61], [90, 42, 78], [142, 59, 71], [194, 87, 58], [230, 138, 46], [242, 183, 5], [255, 231, 161]];
  /* V8 D54: the palette slots of the two products D41 removed are named by colour (AZURE, COPPER; tokens --p-azure,
     --p-copper); their keys never name a product again */
  var PRODUCT_RGB = {
    AZURE: [90, 169, 255], KPR: [63, 193, 165], COPPER: [232, 135, 91], CC: [181, 140, 255],
    MG: [239, 122, 154], PEN: [184, 211, 90], OTH: [143, 153, 171], WS: [242, 183, 5], PR: [143, 153, 171]
  };
  var PRODUCT_GLYPH = {
    AZURE: 'circle', KPR: 'square', COPPER: 'diamond', CC: 'triangle', MG: 'hexagon',
    PEN: 'star4', OTH: 'dash', WS: 'ring', PR: 'diamondHollow'
  };
  var PRODUCT_ORDER = ['KPR', 'CC', 'MG', 'PEN', 'OTH'];
  /* SME groups (addendum A1 §2.4, AM-9): index = MCD_SME_POIS.meta.groups 0–11 */
  var SME_GROUP_RGB = [
    [217, 160, 102], [127, 179, 213], [169, 155, 214], [217, 140, 140], [140, 199, 161], [214, 162, 196],
    [181, 165, 138], [154, 165, 180], [111, 194, 192], [143, 159, 217], [201, 207, 122], [107, 117, 136]
  ];
  var SME_GROUP_CODE = ['KL', 'RT', 'OT', 'KS', 'PD', 'KC', 'BN', 'MF', 'GD', 'JS', 'PW', 'LN'];

  var SITE_KIND_LABEL = {
    hq_complex: 'Kompleks Mabes TNI', hq_navy: 'Markas TNI AL', hq_airforce: 'Markas TNI AU', hq_unit: 'Markas atau satuan',
    gate: 'Gerbang', mandiri_branch: 'Cabang Mandiri', mandiri_atm: 'ATM Mandiri', competitor_branch: 'Bank lain',
    military_housing: 'Perumahan TNI', navy_housing: 'Perumahan TNI AL', hospital: 'Rumah sakit', school: 'Sekolah',
    market: 'Pasar', koperasi: 'Koperasi', other: 'Tempat lain'
  };
  var CONF_LABEL = { high: 'Lokasi tepat', medium: 'Lokasi cukup tepat', low: 'Lokasi perkiraan' };
  var T_FOOT = 'jt = juta · M = miliar · T = triliun';
  var BRANCH_SHORT = 'KCP Cilangkap', BRANCH_FULL = 'Bank Mandiri KCP Jakarta Cilangkap';

  /* §E.3 imagery postures (flat satellite tint). MCD.config.map.postures (same keys) wins when present.
     buildings: 'flat' draws thin building outlines on the satellite; 'off' draws none. Never 3D. */
  var IMAGERY = {
    full:      { brightnessMax: 0.52, saturation: -0.70, contrast: 0.08, wash: 0.38, buildings: 'off', flatOpacity: 0 },
    plan:      { brightnessMax: 0.42, saturation: -0.80, contrast: 0.08, wash: 0.46, buildings: 'flat', flatOpacity: 0.22 },
    merchants: { brightnessMax: 0.46, saturation: -0.78, contrast: 0.08, wash: 0.42, buildings: 'off', flatOpacity: 0 },
    wide:      { brightnessMax: 0.48, saturation: -0.76, contrast: 0.08, wash: 0.40, buildings: 'off', flatOpacity: 0 },
    dimmed:    { brightnessMax: 0.18, saturation: -0.90, contrast: 0.00, wash: 0.60, buildings: 'off', flatOpacity: 0 }
  };
  var IMAGERY_ALIAS = { hero: 'full', dim: 'dimmed', sme: 'merchants', payroll: 'plan' };

  /* U6/U7 map palettes. Satellite (Deep dive) keeps the night overlay palette in both
     themes: light marks with dark halos read best on imagery. The day street map
     (Overview · Day) uses navy ink on the light grey basemap. Distance rings are neutral
     grey (ringStrong) in both themes: gold belongs to Mabes TNI and the branch only (item 25).
     applyPalette() copies the active set into C and HEAT_RGB in place, so kit.palette
     and kit.heatRGB stay current for registered section layers. */
  var PAL = {
    night: { canvas: [5, 8, 15], text1: [237, 239, 243], text2: [167, 176, 192], text3: [124, 135, 154], gold: [242, 183, 5], goldSoft: [255, 231, 161],
      signal: [56, 214, 232], platinum: [201, 209, 220], plat: [[26, 35, 51], [58, 74, 99], [111, 129, 158], [174, 187, 205], [238, 242, 247]],
      bMerchant: [233, 237, 242], bGiro: [167, 180, 198], bPayroll: [126, 151, 186],
      heat: [[42, 27, 61], [90, 42, 78], [142, 59, 71], [194, 87, 58], [230, 138, 46], [242, 183, 5], [255, 231, 161]],
      mabes: '#F2B705', mabesFill: 0.045, ring: '#EDEFF3', ringOp: 0.16, ringStrong: '#AEB7C4', label: '#7C879A',
      road: 'rgba(167,176,192,0.78)', halo: '#05080F', bg: '#0F141C' },
    day: { canvas: [253, 251, 246], text1: [14, 30, 54], text2: [59, 74, 98], text3: [86, 98, 117], gold: [138, 97, 0], goldSoft: [107, 74, 0],
      signal: [0, 114, 127], platinum: [78, 94, 119], plat: [[238, 242, 247], [201, 211, 224], [141, 157, 181], [85, 102, 127], [26, 35, 51]],
      bMerchant: [51, 67, 92], bGiro: [94, 114, 144], bPayroll: [63, 95, 146],
      heat: [[255, 244, 220], [252, 227, 176], [247, 198, 107], [238, 155, 59], [217, 105, 42], [178, 58, 42], [122, 30, 58]],
      mabes: '#8A6100', mabesFill: 0.07, ring: '#4B5563', ringOp: 0.30, ringStrong: '#5F6875', label: '#3B4A62',
      road: 'rgba(59,74,98,0.85)', halo: '#FFFFFF', bg: '#F3F4F6' }
  };
  /* Calm street maps (COPY_STYLE_EN items 23 and 25): both OpenFreeMap styles are recoloured at load into one
     neutral greyscale. Day: very light grey land, light grey roads with white casings, grey labels, water a very
     light grey-blue. Night: the same in dark grey-navy. Parks, woods, grass, golf courses, cemeteries and other
     land use are never green: they are land colour, or a slightly lighter grey with a hairline outline, so large
     areas such as Taman Mini still read as places. The only colours on a map are the branch, Mabes TNI, the
     selected kecamatan outline, the data dots and the small status dots on the kecamatan labels. */
  var CALM = {
    day: {
      land: '#F3F4F6', green: '#F8F9FA', greenLine: '#E2E5E9', water: '#DCE3EA', waterLine: '#D2DAE3',
      building: '#E8EAED', buildingLine: '#DCDFE4', aeroway: '#ECEEF1', aerowayLine: '#E1E4E8',
      path: '#E4E7EA', minor: '#DFE2E6', major: '#D6DADF', majorSubtle: '#DFE2E6', motorway: '#CBD1D8', motorwaySubtle: '#D9DDE2',
      casing: '#FFFFFF', rail: '#D3D7DD', boundary: '#C4C9D0',
      label: '#4B5361', labelSoft: '#6B7280', roadLabel: '#7B838F', waterLabel: '#8591A0', halo: '#FFFFFF'
    },
    night: {
      land: '#0F141C', green: '#121823', greenLine: '#1B2230', water: '#18202B', waterLine: '#1C2531',
      building: '#151B25', buildingLine: '#1C2330', aeroway: '#141A23', aerowayLine: '#1E2531',
      path: '#1A212B', minor: '#1F2732', major: '#29323F', majorSubtle: '#222A35', motorway: '#313B4A', motorwaySubtle: '#252D39',
      casing: '#0B0F15', rail: '#252D39', boundary: '#2E3644',
      label: '#A5AEBC', labelSoft: '#8A94A3', roadLabel: '#7E8898', waterLabel: '#6E7A8B', halo: '#0F141C'
    }
  };
  /** The calm paint for one layer of an OpenFreeMap style (by type, source layer and id), or null to keep it. */
  function calmPaint(theme, l) {
    var P = CALM[theme] || CALM.day, t = l.type, sl = l['source-layer'] || '', id = String(l.id || '');
    if (t === 'background') return { 'background-color': P.land };
    if (t === 'fill') {
      if (sl === 'water') return { 'fill-color': P.water, 'fill-outline-color': P.water };
      if (sl === 'building') return { 'fill-color': P.building, 'fill-outline-color': P.buildingLine };
      if (sl === 'aeroway') return { 'fill-color': P.aeroway };
      if (sl === 'transportation') return { 'fill-color': P.land };
      /* residential blocks and ice: simply land */
      if (/residential|ice|glacier/.test(id)) return { 'fill-color': P.land, 'fill-opacity': 0 };
      /* parks, woods, grass, golf, cemeteries, farmland and the rest of land use: a lighter grey with a hairline */
      if (sl === 'park' || sl === 'landcover' || sl === 'landuse') return { 'fill-color': P.green, 'fill-outline-color': P.greenLine, 'fill-opacity': 1 };
      return { 'fill-color': P.land };
    }
    if (t === 'line') {
      if (sl === 'waterway') return { 'line-color': P.waterLine };
      if (sl === 'boundary') return { 'line-color': P.boundary };
      if (sl === 'aeroway') return { 'line-color': /runway$|taxiway/.test(id) && !/casing/.test(id) ? P.aeroway : P.aerowayLine };
      if (sl === 'transportation') {
        if (/dashline|pier/.test(id)) return { 'line-color': P.land };
        if (/rail/.test(id)) return { 'line-color': P.rail };
        if (/casing/.test(id)) return { 'line-color': P.casing };
        if (/motorway/.test(id)) return { 'line-color': /subtle/.test(id) ? P.motorwaySubtle : (/tunnel/.test(id) ? P.minor : P.motorway) };
        if (/major/.test(id)) return { 'line-color': /subtle/.test(id) ? P.majorSubtle : P.major };
        if (/path/.test(id)) return { 'line-color': P.path };
        return { 'line-color': P.minor };
      }
      return { 'line-color': P.boundary };
    }
    if (t === 'symbol') {
      if (sl === 'water_name' || sl === 'waterway') return { 'text-color': P.waterLabel, 'text-halo-color': P.halo };
      if (sl === 'transportation_name' || sl === 'aerodrome_label') return { 'text-color': P.roadLabel, 'text-halo-color': P.halo };
      return { 'text-color': /other|state|country/.test(id) ? P.labelSoft : P.label, 'text-halo-color': P.halo };
    }
    return null;
  }
  /* Satellite (Detail): greyscale by default with a slight contrast boost; "Warna asli" restores natural colour.
     Remembered per browser (try/catch: private windows and blocked storage simply start in greyscale). */
  var TRUE_COLOUR_KEY = 'mcd.map.trueColour';
  function readTrueColour() {
    try { return !!(W.localStorage && W.localStorage.getItem(TRUE_COLOUR_KEY) === 'true'); } catch (e) { return false; }
  }
  function writeTrueColour(on) {
    try { if (W.localStorage) { if (on) W.localStorage.setItem(TRUE_COLOUR_KEY, 'true'); else W.localStorage.removeItem(TRUE_COLOUR_KEY); } } catch (e) { /* not remembered */ }
  }
  var STREET_URL = { day: 'https://tiles.openfreemap.org/styles/positron', night: 'https://tiles.openfreemap.org/styles/dark' };
  function imageryDef(key) {
    if (key && typeof key === 'object') return Object.assign({}, IMAGERY.full, key);
    key = IMAGERY_ALIAS[key] || key || 'full';
    var c = MCD.config && MCD.config.map && MCD.config.map.postures;
    var base = IMAGERY[key] || IMAGERY.full;
    return c && c[key] ? Object.assign({ contrast: base.contrast }, base, c[key]) : base;
  }

  /* --------------------------------------------------------------- helpers */

  function U() { return MCD.util || {}; }
  function isFn(f) { return typeof f === 'function'; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function finite(v) { return typeof v === 'number' && isFinite(v); }
  function quant(v, q) { return Math.round(v / q) * q; }
  function now() { return (W.performance && W.performance.now) ? W.performance.now() : Date.now(); }
  function raf(fn) { return W.requestAnimationFrame ? W.requestAnimationFrame(fn) : setTimeout(function () { fn(now()); }, 16); }
  function caf(id) { if (W.cancelAnimationFrame) W.cancelAnimationFrame(id); else clearTimeout(id); }
  function warn(msg, e) { if (W.console && W.console.warn) W.console.warn('[MCD.map] ' + msg, e || ''); }
  /* A failing section factory is logged once (as an error) instead of on every frame */
  var FAILED = {};
  function failOnce(key, msg, e) {
    if (FAILED[key]) return;
    FAILED[key] = 1;
    if (W.console && W.console.error) W.console.error('[MCD.map] ' + msg, e || '');
  }
  function rgba(rgb, a) { return [rgb[0], rgb[1], rgb[2], a == null ? 255 : a]; }
  function heatColor(step, a) { return rgba(HEAT_RGB[clamp(step | 0, 1, 6)], a); }
  function cssRgb(rgb, a) { return a == null ? 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')' : 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }
  function flatten(list, out) {
    out = out || [];
    if (!list) return out;
    if (!Array.isArray(list)) { out.push(list); return out; }
    for (var i = 0; i < list.length; i++) {
      if (Array.isArray(list[i])) flatten(list[i], out); else if (list[i]) out.push(list[i]);
    }
    return out;
  }
  function zoomInterp(stops, z) {
    if (!stops.length) return 0;
    if (z <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < stops.length; i++) {
      if (z <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i];
        return lerp(a[1], b[1], (z - a[0]) / (b[0] - a[0]));
      }
    }
    return stops[stops.length - 1][1];
  }
  function stableKey(o) {
    if (o == null) return '';
    if (typeof o !== 'object') return String(o);
    if (Array.isArray(o)) return '[' + o.map(stableKey).join(',') + ']';
    return '{' + Object.keys(o).sort().map(function (k) { return k + ':' + stableKey(o[k]); }).join(',') + '}';
  }

  var mqReduce = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  /** prefers-reduced-motion: MCD.motion.reduced() (shell, item 38) when it is loaded, else the media query. */
  function reduced() {
    var M = motion();
    if (M && isFn(M.reduced)) { try { return !!M.reduced(); } catch (e) { /* the media query below */ } }
    return !!(mqReduce && mqReduce.matches);
  }

  /* motion (COPY_STYLE_EN item 38): one easing family and one set of durations for the whole app. MCD.motion
     (assets/js/motion.js, shell) is the source; the same values stand in until it is loaded. ease-out for entrances
     and camera flights, ease-in-out for exits; camera flights 700–1,000 ms scaled by distance. */
  var MOTION_DEFAULT = { ease: { out: 'cubic-bezier(.22,1,.36,1)', inOut: 'cubic-bezier(.65,0,.35,1)' }, dur: { fast: 180, base: 300, slow: 500 } };
  var BEZIER_FNS = {};
  function motion() { return MCD.motion && typeof MCD.motion === 'object' ? MCD.motion : null; }
  function parseBezier(s) {
    var m = /cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(String(s || ''));
    return m ? [+m[1], +m[2], +m[3], +m[4]] : null;
  }
  /** motionEase('out' | 'inOut') → easing function t → t' (from MCD.motion.ease, a CSS cubic-bezier string). */
  function motionEase(name) {
    var M = motion(), v = M && M.ease ? M.ease[name] : null;
    if (isFn(v)) return v;
    var s = typeof v === 'string' && parseBezier(v) ? v : (MOTION_DEFAULT.ease[name] || MOTION_DEFAULT.ease.out);
    if (!BEZIER_FNS[s]) { var b = parseBezier(s); BEZIER_FNS[s] = bezier(b[0], b[1], b[2], b[3]); }
    return BEZIER_FNS[s];
  }
  /** motionDur('fast' | 'base' | 'slow') → ms (MCD.motion.dur; 180 / 300 / 500 without it). */
  function motionDur(name) {
    var M = motion(), v = M && M.dur ? +M.dur[name] : NaN;
    return finite(v) && v >= 0 ? v : MOTION_DEFAULT.dur[name] || MOTION_DEFAULT.dur.base;
  }
  /** flightMs(km) → a camera flight of 700–1,000 ms, longer for a longer way (MCD.motion.flightMs when present). */
  function flightMs(km) {
    var M = motion();
    if (M && isFn(M.flightMs)) { try { var v = +M.flightMs(km); if (finite(v) && v >= 0) return v; } catch (e) { /* default */ } }
    return Math.round(clamp(700 + (finite(km) && km > 0 ? km : 0) * 30, 700, 1000));
  }

  /* easing ---------------------------------------------------------------- */
  function outExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function inOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function calc(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 6; i++) {
        var s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (calc(t, x1, x2) - x) / s;
      }
      if (t < 0 || t > 1) {                                  // bisection fallback
        var lo = 0, hi = 1; t = x;
        for (var j = 0; j < 24; j++) { var v = calc(t, x1, x2); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      }
      return calc(t, y1, y2);
    };
  }
  var easeCamera = bezier(0.65, 0, 0.35, 1);
  var easeStandard = bezier(0.2, 0, 0, 1);

  /* simple rAF tween (independent of MCD.util.tween signature) */
  function tween(duration, ease, onUpdate, onDone) {
    var t0 = now(), id = 0, dead = false;
    function step() {
      if (dead) return;
      var t = clamp((now() - t0) / duration, 0, 1);
      onUpdate(ease ? ease(t) : t);
      if (t < 1) id = raf(step); else if (onDone) onDone();
    }
    if (duration <= 0 || reduced()) { onUpdate(1); if (onDone) onDone(); return { stop: function () {} }; }
    id = raf(step);
    return { stop: function () { dead = true; caf(id); } };
  }

  /* geo -------------------------------------------------------------------- */
  var D2R = Math.PI / 180;
  function haversineKm(lon1, lat1, lon2, lat2) {
    var dLat = (lat2 - lat1) * D2R, dLon = (lon2 - lon1) * D2R;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function bearingDeg(lon1, lat1, lon2, lat2) {
    var y = Math.sin((lon2 - lon1) * D2R) * Math.cos(lat2 * D2R);
    var x = Math.cos(lat1 * D2R) * Math.sin(lat2 * D2R) - Math.sin(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.cos((lon2 - lon1) * D2R);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  }
  function destination(lon, lat, km, brg) {
    var d = km / R_EARTH_KM, b = brg * D2R, p1 = lat * D2R, l1 = lon * D2R;
    var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    var l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [l2 / D2R, p2 / D2R];
  }
  function circleRing(lon, lat, km, steps) {
    steps = steps || 128;
    var ring = [];
    for (var i = 0; i <= steps; i++) ring.push(destination(lon, lat, km, (i % steps) * 360 / steps));
    return ring;
  }
  function bboxOf(coords) {
    var w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (var i = 0; i < coords.length; i++) {
      var c = coords[i];
      if (!c) continue;
      if (c[0] < w) w = c[0]; if (c[0] > e) e = c[0];
      if (c[1] < s) s = c[1]; if (c[1] > n) n = c[1];
    }
    return isFinite(w) ? [[w, s], [e, n]] : null;
  }
  function metersPerPixel(z, lat) { return 78271.51696 * Math.cos((lat || 0) * D2R) / Math.pow(2, z); }
  function signedArea(ring) {
    var a = 0;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    return a / 2;
  }
  function pointInRing(lon, lat, ring) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function posOf(o) {
    if (!o) return null;
    if (o.position && finite(o.position[0])) return o.position;
    if (finite(o.lon) && finite(o.lat)) return [o.lon, o.lat];
    if (finite(o.lng) && finite(o.lat)) return [o.lng, o.lat];
    return null;
  }

  /* config / reference accessors ------------------------------------------ */
  function cfg() { return MCD.config || {}; }
  function ref() { return MCD.ref || {}; }
  function branchLL() {
    var b = cfg().branch || DEFAULT_BRANCH;
    return [finite(b.lon) ? b.lon : DEFAULT_BRANCH.lon, finite(b.lat) ? b.lat : DEFAULT_BRANCH.lat];
  }
  function branchKey() { var b = branchLL(); return b[0].toFixed(6) + ',' + b[1].toFixed(6); }
  function mabesRing() {
    var p = ref().mabesPolygon;
    if (Array.isArray(p) && p.length > 3 && Array.isArray(p[0])) return p;
    return null;
  }
  /* ------------------------------------------------------------ formatting */

  function fmtInt(n) {
    var f = U().fmt && U().fmt.int;
    if (isFn(f)) { try { var o = f(n); if (typeof o === 'string' && o) return o; } catch (e) { /* fall through */ } }
    n = Math.round(Number(n) || 0);
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? MINUS : '') + s;
  }
  function fmtDec(n, d) {
    n = Number(n) || 0;
    var s = Math.abs(n).toFixed(d).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? MINUS : '') + s.join('.');
  }
  function rpLocal(v) {
    v = Number(v) || 0;
    var a = Math.abs(v), sign = v < 0 ? MINUS : '', s;
    if (a >= 1e12) s = fmtDec(a / 1e12, 1) + ' tn';
    else if (a >= 1e9) s = fmtDec(a / 1e9, 1) + ' bn';
    else if (a >= 1e6) s = (a < 1e7 ? fmtDec(a / 1e6, 1).replace(/\.0$/, '') : fmtInt(a / 1e6)) + ' mn';
    else s = fmtInt(a);
    return sign + 'Rp ' + s;
  }
  function fmtRp(v) {
    var f = U().fmt && U().fmt.rp;
    if (isFn(f)) { try { var s = f(v); if (typeof s === 'string' && s) return s; } catch (e) { /* fall through */ } }
    return rpLocal(v);
  }
  function fmtKm(v) {
    var f = U().fmt && U().fmt.km;
    if (isFn(f)) { try { var s = f(v); if (typeof s === 'string' && s) return s; } catch (e) { /* fall through */ } }
    return fmtDec(v, v < 10 ? 1 : 0) + ' km';
  }
  function fmtPct(v) {
    var d = v > 0 && v * 100 < 0.05 ? 2 : (v < 0.1 ? 1 : 0), f = U().fmt && U().fmt.pct;
    if (isFn(f)) { try { var o = f(v, d); if (typeof o === 'string' && o) return o; } catch (e) { /* fall through */ } }
    return fmtDec(v * 100, d) + '%';
  }
  function fmtCoord(lat, lon, d) {
    d = d == null ? 5 : d;
    return Math.abs(lat).toFixed(d) + '\u00B0 ' + (lat < 0 ? 'S' : 'N') + ' · ' + Math.abs(lon).toFixed(d) + '\u00B0 ' + (lon < 0 ? 'W' : 'E');
  }
  function bandRp(v) {
    var f = U().mask && U().mask.amountBand;
    if (isFn(f)) { try { var r = f(v); if (typeof r === 'string' && r) return r; } catch (e) { /* fall through */ } }
    v = Math.max(0, Number(v) || 0);
    var step = v < 1e7 ? 1e6 : v < 1e8 ? 1e7 : v < 5e8 ? 5e7 : v < 1e9 ? 1e8 : 5e8;
    var lo = Math.floor(v / step) * step, hi = lo + step;
    if (hi >= 1e9) return 'Rp ' + fmtDec(lo / 1e9, 1).replace(/\.0$/, '') + '–' + fmtDec(hi / 1e9, 1).replace(/\.0$/, '') + ' bn';
    return 'Rp ' + fmtInt(lo / 1e6) + '–' + fmtInt(hi / 1e6) + ' mn';
  }
  function hostOf(url) {
    if (!url || typeof url !== 'string') return '';
    var m = /^[a-z]+:\/\/([^/?#]+)/i.exec(url);
    return m ? m[1].replace(/^www\./, '') : url.slice(0, 40);
  }

  /* ---------------------------------------------------------------- glyphs */
  /* Unit geometry (y down, radius 1). Shared by the deck atlas and the legend
     SVGs so the map and the legend always draw the same shapes.            */

  function rectP(hw, hh) { return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]; }
  function ngon(n, r, rot) { var p = []; for (var i = 0; i < n; i++) { var a = (rot + i * 360 / n) * D2R; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }
  /* a rounded rectangle as a polygon (corners in 4 steps) */
  function rrectP(hw, hh, r) {
    var p = [], cs = [[hw - r, -hh + r, -90], [hw - r, hh - r, 0], [-hw + r, hh - r, 90], [-hw + r, -hh + r, 180]];
    cs.forEach(function (c) { for (var k = 0; k <= 4; k++) { var a = (c[2] + k * 22.5) * D2R; p.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } });
    return p;
  }
  function star(n, ro, ri, rot) { var p = []; for (var i = 0; i < n * 2; i++) { var r = i % 2 ? ri : ro, a = (rot + i * 180 / n) * D2R; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }

  var GLYPHS = {
    circle:        [{ c: 0.9 }],
    square:        [{ p: rectP(0.76, 0.76) }],
    diamond:       [{ p: [[0, -1], [1, 0], [0, 1], [-1, 0]] }],
    triangle:      [{ p: [[0, -0.98], [0.98, 0.74], [-0.98, 0.74]] }],
    hexagon:       [{ p: ngon(6, 0.96, -90) }],
    star4:         [{ p: star(4, 1, 0.34, -90) }],
    ring:          [{ c: 0.9 }, { c: 0.54 }],
    diamondHollow: [{ p: [[0, -1], [1, 0], [0, 1], [-1, 0]] }, { p: [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]] }],
    dash:          [{ p: rectP(0.86, 0.22) }],
    frame:         [{ p: rectP(0.84, 0.84) }, { p: rectP(0.52, 0.52) }],
    hexOutline:    [{ p: ngon(6, 0.98, -90) }, { p: ngon(6, 0.64, -90) }],
    hexOutlineDot: [{ p: ngon(6, 0.98, -90) }, { p: ngon(6, 0.64, -90) }, { c: 0.28 }],
    bar:           [{ p: rectP(0.3, 1) }],
    dot:           [{ c: 0.9 }],
    rsquare:       [{ p: rrectP(0.82, 0.82, 0.26) }],
    rsqOutline:    [{ p: rrectP(0.86, 0.86, 0.28) }, { p: rrectP(0.52, 0.52, 0.14) }],
    rsqOutlineDot: [{ p: rrectP(0.86, 0.86, 0.28) }, { p: rrectP(0.56, 0.56, 0.16) }, { c: 0.26 }]
  };
  var GLYPH_ORDER = ['circle', 'square', 'diamond', 'triangle', 'hexagon', 'star4', 'ring', 'diamondHollow',
    'dash', 'frame', 'hexOutline', 'hexOutlineDot', 'bar', 'dot', 'rsquare', 'rsqOutline', 'rsqOutlineDot'];
  var ATLAS_CELL = 64;
  var ATLAS_SCALE = 28;                     // 4 px padding inside each 64 px cell
  var _atlas = null;

  function buildAtlas() {
    if (_atlas) return _atlas;
    var mapping = {};
    var canvas = DOC.createElement('canvas');
    canvas.width = GLYPH_ORDER.length * ATLAS_CELL; canvas.height = ATLAS_CELL;
    var ctx = canvas.getContext && canvas.getContext('2d');
    GLYPH_ORDER.forEach(function (name, i) {
      var ox = i * ATLAS_CELL + ATLAS_CELL / 2, oy = ATLAS_CELL / 2;
      if (ctx) {
        ctx.beginPath();
        GLYPHS[name].forEach(function (part) {
          if (part.c) { ctx.moveTo(ox + part.c * ATLAS_SCALE, oy); ctx.arc(ox, oy, part.c * ATLAS_SCALE, 0, Math.PI * 2); }
          else {
            part.p.forEach(function (pt, k) { var x = ox + pt[0] * ATLAS_SCALE, y = oy + pt[1] * ATLAS_SCALE; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.closePath();
          }
        });
        ctx.fillStyle = '#FFFFFF';
        ctx.fill('evenodd');
      }
      mapping[name] = name === 'bar'
        ? { x: i * ATLAS_CELL + 20, y: 0, width: 24, height: ATLAS_CELL, anchorX: 12, anchorY: 32, mask: true }
        : { x: i * ATLAS_CELL, y: 0, width: ATLAS_CELL, height: ATLAS_CELL, anchorX: 32, anchorY: 32, mask: true };
    });
    /* the canvas itself, never a PNG data URL: deck.gl uploads a canvas at once, while encoding and decoding a PNG
       took ~60 ms of the first Merchant mount (MOTION verifier, 16 Oct 2026) */
    _atlas = { iconAtlas: ctx ? canvas : '', iconMapping: mapping };
    return _atlas;
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function glyphPath(name) {
    var parts = GLYPHS[name] || GLYPHS.circle, d = '';
    parts.forEach(function (part) {
      if (part.c) { var r = part.c; d += 'M' + (-r) + ' 0A' + r + ' ' + r + ' 0 1 0 ' + r + ' 0A' + r + ' ' + r + ' 0 1 0 ' + (-r) + ' 0Z'; }
      else d += 'M' + part.p.map(function (p) { return p[0].toFixed(3) + ' ' + p[1].toFixed(3); }).join('L') + 'Z';
    });
    return d;
  }
  function glyphSVG(name, rgb, size, alpha) {
    var svg = DOC.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '-1.1 -1.1 2.2 2.2');
    svg.setAttribute('width', String(size || 10));
    svg.setAttribute('height', String(size || 10));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'mcd-glyph');
    var path = DOC.createElementNS(SVGNS, 'path');
    path.setAttribute('d', glyphPath(name));
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('fill', cssRgb(rgb || C.text2, alpha == null ? 1 : alpha));
    svg.appendChild(path);
    return svg;
  }
  function lineSVG(rgb, dash, alpha, width) {
    var svg = DOC.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 4'); svg.setAttribute('width', '16'); svg.setAttribute('height', '4');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'mcd-glyph mcd-glyph--line');
    var l = DOC.createElementNS(SVGNS, 'line');
    l.setAttribute('x1', '0'); l.setAttribute('y1', '2'); l.setAttribute('x2', '16'); l.setAttribute('y2', '2');
    l.setAttribute('stroke', cssRgb(rgb, alpha == null ? 1 : alpha)); l.setAttribute('stroke-width', String(finite(width) ? width : 1.25));
    if (dash) l.setAttribute('stroke-dasharray', dash);
    svg.appendChild(l);
    return svg;
  }

  /* --------------------------------------------------- sprites (item 34) */
  /* Canvas sprites for point symbols: drawn once per spec, cached, and usable both as a deck.gl IconLayer
     icon ({id, url, width, height, anchorX, anchorY, mask: false}, or an atlas of several) and as a data URL
     for the legend. Vector paths only: no emoji, no icon fonts. */

  var SPRITES = {};                          // cache key → sprite
  function spriteDpr() { return Math.min(3, Math.max(2, Math.ceil((W.devicePixelRatio || 1)))); }
  function rgbKey(c) { return Array.isArray(c) ? c.slice(0, 3).map(function (v) { return Math.round(+v || 0); }).join(',') : ''; }
  function newCanvas(w, h) {
    try {
      var cv = DOC.createElement('canvas');
      if (!cv || !cv.getContext) return null;
      cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h));
      var ctx = cv.getContext('2d');
      return ctx ? { cv: cv, ctx: ctx } : null;
    } catch (e) { return null; }
  }
  function toUrl(cv) { try { return cv ? cv.toDataURL('image/png') : ''; } catch (e) { return ''; } }
  /** A sprite's `url` (a PNG data URL, for legends and HTML) is encoded the first time it is read, never on the map's
      own path: deck.gl gets the canvas (F8, 16 Oct 2026). */
  function lazyUrl(o, cv) {
    var memo = null;
    Object.defineProperty(o, 'url', { enumerable: true, configurable: true,
      get: function () { if (memo == null) memo = cv ? toUrl(cv) : ''; return memo; } });
    return o;
  }
  function starPath(ctx, cx, cy, ro, ri) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? ri : ro, a = (-90 + i * 36) * D2R;
      if (i) ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); else ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  }
  function shapePath(ctx, shape, cx, cy, r) {
    ctx.beginPath();
    if (POLY_SHAPES[shape]) {
      /* v6 (V6_SPEC D9): the campus shapes, unit polygons shared with the legend glyphs (SHIELD_PTS, TRI_PTS); V8: the
         Kesehatan plus and sparkle (PLUS_PTS, SPARKLE_PTS) */
      var pts = shapePts(shape);
      for (var i = 0; i < pts.length; i++) { var x = cx + pts[i][0] * r, y = cy + pts[i][1] * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath();
    } else if (shape === 'diamond') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); }
    else if (shape === 'rsq') {
      var s = r * 0.86, q = s * 0.34;
      ctx.moveTo(cx - s + q, cy - s); ctx.lineTo(cx + s - q, cy - s); ctx.arcTo(cx + s, cy - s, cx + s, cy - s + q, q);
      ctx.lineTo(cx + s, cy + s - q); ctx.arcTo(cx + s, cy + s, cx + s - q, cy + s, q);
      ctx.lineTo(cx - s + q, cy + s); ctx.arcTo(cx - s, cy + s, cx - s, cy + s - q, q);
      ctx.lineTo(cx - s, cy - s + q); ctx.arcTo(cx - s, cy - s, cx - s + q, cy - s, q); ctx.closePath();
    } else ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  var STAR_NAVY = [0, 61, 121];
  /* v6 (V6_SPEC D9, §6.3): the campus shapes in a unit box (radius 1, y down), centred on the anchor. A shield (universitas,
     institut): flat top, straight sides, curved to a point; a triangle (sekolah tinggi, politeknik, akademi, desain dan
     kursus). The same points draw the map sprite (shapePath) and the legend glyph (GLYPHS). */
  function quadPts(p0, c, p1, n) {
    var out = [];
    for (var i = 1; i <= n; i++) {
      var t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
      out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]);
    }
    return out;
  }
  var SHIELD_PTS = [[-0.84, -0.92], [0.84, -0.92], [0.84, -0.04]]
    .concat(quadPts([0.84, -0.04], [0.82, 0.58], [0, 0.92], 6))
    .concat(quadPts([0, 0.92], [-0.82, 0.58], [-0.84, -0.04], 6))
    .map(function (p) { return [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000]; });
  var TRI_PTS = [[0, -0.9], [0.98, 0.8], [-0.98, 0.8]];
  /* V8 (HEALTH_SPEC §2.1, H1): the Kesehatan shapes in the same unit box, the very points of health-core.js
     (MCD.health.sym.PLUS_PTS, SPARKLE_PTS; tests/map-v8.test.mjs compares them): a Greek cross for rumah sakit (arm
     half-width 0,34, arm length 0,98) and a four-point sparkle for klinik kecantikan (outer radius 1, inner 0,55, points
     up, right, down and left). Klinik kesehatan is the circle. */
  var PLUS_AW = 0.34, PLUS_AL = 0.98;
  var PLUS_PTS = [[-PLUS_AW, -PLUS_AL], [PLUS_AW, -PLUS_AL], [PLUS_AW, -PLUS_AW], [PLUS_AL, -PLUS_AW], [PLUS_AL, PLUS_AW], [PLUS_AW, PLUS_AW],
    [PLUS_AW, PLUS_AL], [-PLUS_AW, PLUS_AL], [-PLUS_AW, PLUS_AW], [-PLUS_AL, PLUS_AW], [-PLUS_AL, -PLUS_AW], [-PLUS_AW, -PLUS_AW]];
  var SPARKLE_PTS = (function () {
    var out = [];
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? 0.55 : 1;
      out.push([Math.round(Math.cos(a) * r * 1e4) / 1e4, Math.round(Math.sin(a) * r * 1e4) / 1e4]);
    }
    return out;
  })();
  /* the plus inset by 0,17 on every side (the hollow legend glyph: an even band along the edge) */
  var PLUS_IN = 0.17;
  var PLUS_INNER_PTS = PLUS_PTS.map(function (p) {
    return [p[0] < 0 ? p[0] + PLUS_IN : p[0] - PLUS_IN, p[1] < 0 ? p[1] + PLUS_IN : p[1] - PLUS_IN];
  });
  var POLY_SHAPES = { shield: 1, triangle: 1, plus: 1, sparkle: 1 };
  function shapePts(shape) { return shape === 'shield' ? SHIELD_PTS : shape === 'plus' ? PLUS_PTS : shape === 'sparkle' ? SPARKLE_PTS : TRI_PTS; }
  var SYMBOL_SHAPES = { circle: 1, diamond: 1, rsq: 1, shield: 1, triangle: 1, plus: 1, sparkle: 1 };
  /* the legend glyphs of the campus shapes (glyphSVG 'shield', 'shieldHollow', 'tri', 'triHollow'): the same points; the
     hollow ones cut the inside out (even-odd), around the shield's middle and the triangle's incentre */
  function scalePts(pts, f, cx, cy) { return pts.map(function (p) { return [cx + (p[0] - cx) * f, cy + (p[1] - cy) * f]; }); }
  GLYPHS.shield = [{ p: SHIELD_PTS }];
  GLYPHS.shieldHollow = [{ p: SHIELD_PTS }, { p: scalePts(SHIELD_PTS, 0.56, 0, -0.06) }];
  GLYPHS.tri = [{ p: TRI_PTS }];
  GLYPHS.triHollow = [{ p: TRI_PTS }, { p: scalePts(TRI_PTS, 0.5, 0, 0.234) }];
  /* V8 (H1, H5): the Kesehatan legend glyphs from the same points; hollow = the plus inset by 0,17 and the sparkle at
     half its size cut out (even-odd) */
  GLYPHS.plus = [{ p: PLUS_PTS }];
  GLYPHS.plusHollow = [{ p: PLUS_PTS }, { p: PLUS_INNER_PTS }];
  GLYPHS.sparkle = [{ p: SPARKLE_PTS }];
  GLYPHS.sparkleHollow = [{ p: SPARKLE_PTS }, { p: scalePts(SPARKLE_PTS, 0.5, 0, 0) }];
  /**
   * symbolSprite({shape:'circle'|'diamond'|'rsq'|'shield'|'triangle', fill:[r,g,b], ring?:[r,g,b], star?:bool, hollow?:bool, px})
   * → cached sprite {id, url, canvas, width, height, anchorX, anchorY, mask:false, px, dpr, shape, hollow} (device pixels;
   * draw it at `px` CSS pixels: IconLayer getSize = px). A thin keyline (white, or `ring`) keeps the symbol readable on any
   * map; `star` adds a small navy star at the top right (SMA yayasan TNI, item 34). v6 (V6_SPEC D9): 'shield' and
   * 'triangle' for Kampus; `hollow` draws the shape as an empty outline (a band in `fill` between two keylines, nothing
   * inside: "Titik kosong = kampus lain dari perguruan tinggi yang sama"). Unknown shapes are circles.
   * V8 (HEALTH_SPEC H1–H5): 'plus' and 'sparkle' (Kesehatan) with the stroked keyline; hollow keeps the filled
   * silhouette with a band of the fill colour along the edge (max(1,5, 0,09 × px) CSS px, the band of health-core.js) and
   * the keyline colour inside, so a hollow hospital is exactly as large as a filled one.
   */
  function symbolSprite(spec) {
    spec = spec || {};
    var shape = SYMBOL_SHAPES[spec.shape] ? spec.shape : 'circle', hollow = !!spec.hollow;
    var px = clamp(finite(+spec.px) ? +spec.px : 12, 4, 64), dpr = spriteDpr();
    var fill = Array.isArray(spec.fill) ? spec.fill : [31, 95, 209], ring = Array.isArray(spec.ring) ? spec.ring : null;
    var key = 'sym|' + shape + '|' + rgbKey(fill) + '|' + rgbKey(ring) + '|' + (spec.star ? 1 : 0) + '|' + px + '|' + dpr + (hollow ? '|h' : '');
    if (SPRITES[key]) return SPRITES[key];
    var size = Math.ceil(px * dpr), c = newCanvas(size, size);
    if (c) {
      var ctx = c.ctx, cx = size / 2, cy = size / 2, lw = Math.max(1, dpr * (px >= 14 ? 1.5 : 1.2));
      var r = size / 2 - lw / 2 - (spec.star ? size * 0.06 : 0.5);
      var keyCss = cssRgb(ring || [255, 255, 255]);
      ctx.lineJoin = 'round';
      if (shape === 'plus' || shape === 'sparkle') {
        /* V8 (H1, H5): one silhouette, the polygon at rp with a stroke of lw around it (the stroked keyline of the shield).
           Filled: the keyline stroke, the fill inside. Hollow (health-core.js's look): that outer stroke in the fill colour,
           the keyline colour inside, and the fill band carried inward (clipped) to max(1,5, 0,09 × px) CSS px in all */
        var rp = size / 2 - lw - 0.5 - (spec.star ? size * 0.06 : 0);
        shapePath(ctx, shape, cx, cy, rp);
        ctx.lineWidth = 2 * lw; ctx.strokeStyle = hollow ? cssRgb(fill) : keyCss; ctx.stroke();
        ctx.fillStyle = hollow ? keyCss : cssRgb(fill); ctx.fill();
        var bandIn = hollow ? Math.max(0, Math.max(1.5, px * 0.09) - (px >= 14 ? 1.5 : 1.2)) * dpr : 0;
        if (bandIn > 0.25 && isFn(ctx.save) && isFn(ctx.clip)) {
          ctx.save();
          shapePath(ctx, shape, cx, cy, rp);
          ctx.clip();
          ctx.lineWidth = 2 * bandIn; ctx.strokeStyle = cssRgb(fill); ctx.stroke();
          ctx.restore();
        }
      } else if (hollow) {
        /* the outline: a band of the fill colour on its centre line, a keyline on both sides of it, nothing inside */
        var band = Math.max(1.5 * dpr, size * 0.15), rc = size / 2 - 0.5 - (spec.star ? size * 0.06 : 0) - lw - band / 2;
        shapePath(ctx, shape, cx, cy, rc);
        ctx.lineWidth = band + 2 * lw; ctx.strokeStyle = keyCss; ctx.stroke();
        ctx.lineWidth = band; ctx.strokeStyle = cssRgb(fill); ctx.stroke();
      } else if (shape === 'shield' || shape === 'triangle') {
        /* the new shapes keep an even keyline along every edge: the keyline is a stroke, the fill covers its inner half */
        var rf = size / 2 - lw - 0.5 - (spec.star ? size * 0.06 : 0);
        shapePath(ctx, shape, cx, cy, rf);
        ctx.lineWidth = 2 * lw; ctx.strokeStyle = keyCss; ctx.stroke();
        ctx.fillStyle = cssRgb(fill); ctx.fill();
      } else {
        shapePath(ctx, shape, cx, cy, r);
        ctx.fillStyle = keyCss; ctx.fill();
        shapePath(ctx, shape, cx, cy, r - lw);
        ctx.fillStyle = cssRgb(fill); ctx.fill();
      }
      if (spec.star) {
        var sr = size * 0.24, sx = size - sr - 0.5, sy = sr + 0.5;
        starPath(ctx, sx, sy, sr, sr * 0.45);
        ctx.fillStyle = cssRgb(STAR_NAVY); ctx.lineJoin = 'round'; ctx.lineWidth = dpr; ctx.strokeStyle = '#FFFFFF';
        ctx.stroke(); ctx.fill();
      }
    }
    SPRITES[key] = lazyUrl({ id: key, canvas: c ? c.cv : null, width: size, height: size, anchorX: size / 2, anchorY: size / 2, mask: false, px: px, dpr: dpr,
      shape: shape, hollow: hollow }, c ? c.cv : null);
    return SPRITES[key];
  }
  /** spriteAtlas([sprite…]) → {iconAtlas: canvas, iconMapping: {id: {x, y, width, height, anchorX, anchorY, mask}}}: one deck atlas. */
  function spriteAtlas(list) {
    list = (list || []).filter(function (s) { return s && s.canvas; });
    var key = 'atlas|' + list.map(function (s) { return s.id; }).join('^');
    if (SPRITES[key]) return SPRITES[key];
    var w = 0, h = 0;
    list.forEach(function (s) { w = Math.max(w, s.width); h += s.height + 2; });
    var c = newCanvas(w || 1, h || 1), map = {}, y = 0;
    list.forEach(function (s) {
      if (c) c.ctx.drawImage(s.canvas, 0, y);
      map[s.id] = { x: 0, y: y, width: s.width, height: s.height, anchorX: s.anchorX, anchorY: s.anchorY, mask: false };
      y += s.height + 2;
    });
    SPRITES[key] = { iconAtlas: c ? c.cv : null, iconMapping: map };
    /* a section that turns this canvas into a data URL (schools-map.js) gets the canvas back on the map (atlasLayer): the
       URL is registered when it is made, not encoded here ahead of time */
    if (c && ATLAS_URL) {
      var cv = c.cv, enc = cv.toDataURL;
      if (isFn(enc)) {
        try {
          cv.toDataURL = function () { var u = enc.apply(cv, arguments); if (u && ATLAS_URL) ATLAS_URL.set(u, cv); return u; };
        } catch (e) { var u0 = toUrl(cv); if (u0) ATLAS_URL.set(u0, cv); }
      }
    }
    return SPRITES[key];
  }

  /* Pangkalan TNI badges (item 34): one round badge per site, the icon inside = matra (anchor TNI AL, tank
     TNI AD, wings TNI AU, star Mabes TNI / gabungan); filled = markas / satuan, outlined = perumahan /
     asrama, a small cross at the corner = rumah sakit. Muted matra colours, never green; a lighter variant
     at night and on the satellite so the badge still reads on a dark map. */
  /* Separated by lightness as well as hue (fix 16 Oct 2026): Mabes TNI / gabungan is a DARK BRONZE, clearly darker
     than the amber of swasta SMA (--status-mid, day #B87300 / night #F0A92E) and of the KCP plate; TNI AD is a light,
     greyish khaki (not beige-on-amber); at night TNI AL stays deep (with the light keyline) and TNI AU is a light sky
     blue, so the two blues in the Mabes complex no longer read as one. Every fill keeps ≥ 3:1 with its icon. */
  var MATRA_RGB = {
    day:   { AL: [27, 54, 99], AD: [146, 124, 92], AU: [58, 128, 181], GAB: [122, 92, 18] },
    night: { AL: [62, 100, 166], AD: [124, 108, 84], AU: [120, 186, 228], GAB: [176, 138, 52] }
  };
  var MATRA_ORDER = ['AL', 'AD', 'AU', 'GAB'];
  var PK_JENIS = ['markas', 'perumahan', 'rs'];
  var BADGE_INK = {
    day:   { key: [255, 255, 255], hollow: [255, 255, 255], icon: [255, 255, 255], iconDark: [17, 24, 37], shadow: 'rgba(15,23,42,0.32)' },
    night: { key: [226, 232, 240], hollow: [17, 24, 37], icon: [255, 255, 255], iconDark: [17, 24, 37], shadow: 'rgba(0,0,0,0.5)' }
  };
  /* the icon on a filled badge: white, or dark ink on a light fill (TNI AU at night) so it keeps ≥ 3:1 */
  function badgeIconInk(ink, col) {
    var lin = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    var L = 0.2126 * lin(col[0]) + 0.7152 * lin(col[1]) + 0.0722 * lin(col[2]);
    return L > 0.3 ? ink.iconDark : ink.icon;
  }
  /* icon paths in a unit box (radius 1, y down), drawn at scale s around (cx, cy) */
  function drawMatraIcon(ctx, icon, cx, cy, s, rgb) {
    var col = cssRgb(rgb), P = function (x, y) { return [cx + x * s, cy + y * s]; };
    ctx.save();
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (icon === 'anchor') {
      ctx.lineWidth = Math.max(1, 0.15 * s);
      var ring = P(0, -0.62);
      ctx.beginPath(); ctx.arc(ring[0], ring[1], 0.16 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); var a = P(0, -0.46), b = P(0, 0.66); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.beginPath(); var c1 = P(-0.34, -0.24), c2 = P(0.34, -0.24); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
      ctx.beginPath(); var o = P(0, 0.06); ctx.arc(o[0], o[1], 0.6 * s, 0.16 * Math.PI, 0.84 * Math.PI); ctx.stroke();
      /* flukes: small barbs at both arc ends */
      [[-1, 0.84], [1, 0.16]].forEach(function (f) {
        var ang = f[1] * Math.PI, ex = o[0] + 0.6 * s * Math.cos(ang), ey = o[1] + 0.6 * s * Math.sin(ang);
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + f[0] * 0.2 * s, ey - 0.22 * s); ctx.stroke();
      });
    } else if (icon === 'tank') {
      var q = 0.12 * s;
      var t0 = P(-0.74, 0.06), t1 = P(0.74, 0.5);
      ctx.beginPath(); ctx.moveTo(t0[0] + q, t0[1]); ctx.arcTo(t1[0], t0[1], t1[0], t1[1], q); ctx.arcTo(t1[0], t1[1], t0[0], t1[1], q);
      ctx.arcTo(t0[0], t1[1], t0[0], t0[1], q); ctx.arcTo(t0[0], t0[1], t1[0], t0[1], q); ctx.closePath(); ctx.fill();
      var u0 = P(-0.42, -0.3), u1 = P(0.22, 0.06);
      ctx.beginPath(); ctx.moveTo(u0[0] + q, u0[1]); ctx.arcTo(u1[0], u0[1], u1[0], u1[1], q); ctx.lineTo(u1[0], u1[1]); ctx.lineTo(u0[0], u1[1]);
      ctx.arcTo(u0[0], u0[1], u1[0], u0[1], q); ctx.closePath(); ctx.fill();
      ctx.lineWidth = Math.max(1, 0.13 * s);
      ctx.beginPath(); var g0 = P(0.18, -0.16), g1 = P(0.8, -0.24); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.stroke();
    } else if (icon === 'wings') {
      /* an aircraft seen from above, nose up: fuselage, swept wings, tail plane */
      var plane = [[0, -0.84], [0.1, -0.7], [0.11, -0.22], [0.8, 0.14], [0.8, 0.28], [0.11, 0.08], [0.1, 0.5], [0.34, 0.68], [0.34, 0.8],
        [0, 0.72], [-0.34, 0.8], [-0.34, 0.68], [-0.1, 0.5], [-0.11, 0.08], [-0.8, 0.28], [-0.8, 0.14], [-0.11, -0.22], [-0.1, -0.7]];
      ctx.beginPath();
      plane.forEach(function (pt, i) { var p = P(pt[0], pt[1]); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.closePath(); ctx.fill();
    } else {
      starPath(ctx, cx, cy + 0.04 * s, 0.7 * s, 0.29 * s); ctx.fill();
    }
    ctx.restore();
  }
  /**
   * badgeSprite({matra:'AL'|'AD'|'AU'|'GAB', jenis:'markas'|'perumahan'|'rs', theme:'day'|'night', px}) → cached sprite
   * (same shape as symbolSprite). The badge is drawn in the middle 84% of the cell; the rest is room for the
   * keyline shadow and the hospital cross.
   */
  function badgeSprite(spec) {
    spec = spec || {};
    var m = MATRA_RGB.day[spec.matra] ? spec.matra : 'GAB', j = PK_JENIS.indexOf(spec.jenis) >= 0 ? spec.jenis : 'markas';
    var th = spec.theme === 'night' ? 'night' : 'day', px = clamp(finite(+spec.px) ? +spec.px : 24, 8, 64), dpr = spriteDpr();
    var key = 'pk|' + m + '|' + j + '|' + th + '|' + px + '|' + dpr;
    if (SPRITES[key]) return SPRITES[key];
    var size = Math.ceil(px * dpr), c = newCanvas(size, size);
    if (c) {
      var ctx = c.ctx, cx = size / 2, cy = size / 2, R = size * 0.42, ink = BADGE_INK[th], col = MATRA_RGB[th][m];
      var key0 = Math.max(1.5, size * 0.05), ringW = Math.max(1.5, size * 0.075);
      /* keyline with a soft shadow */
      ctx.save(); ctx.shadowColor = ink.shadow; ctx.shadowBlur = size * 0.06; ctx.shadowOffsetY = size * 0.02;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = cssRgb(ink.key); ctx.fill(); ctx.restore();
      var r = R - key0, icon = { AL: 'anchor', AD: 'tank', AU: 'wings', GAB: 'star' }[m];
      if (j === 'perumahan') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = cssRgb(col); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r - ringW, 0, Math.PI * 2); ctx.fillStyle = cssRgb(ink.hollow); ctx.fill();
        drawMatraIcon(ctx, icon, cx, cy, (r - ringW) * 0.74, col);
      } else {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = cssRgb(col); ctx.fill();
        drawMatraIcon(ctx, icon, cx, cy, r * 0.66, badgeIconInk(ink, col));
      }
      if (j === 'rs') {
        /* rumah sakit: a small white disc with a cross in the matra colour at the top-right corner (no red:
           red is the "belum" status colour) */
        var cr = size * 0.17, ccx = size - cr - size * 0.02, ccy = cr + size * 0.02, arm = cr * 0.55, bar = Math.max(1, cr * 0.36);
        ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.lineWidth = Math.max(1, size * 0.02); ctx.strokeStyle = cssRgb(col); ctx.stroke();
        ctx.fillStyle = cssRgb(MATRA_RGB.day[m]);
        ctx.fillRect(ccx - arm, ccy - bar / 2, arm * 2, bar); ctx.fillRect(ccx - bar / 2, ccy - arm, bar, arm * 2);
      }
    }
    SPRITES[key] = lazyUrl({ id: key, canvas: c ? c.cv : null, width: size, height: size, anchorX: size / 2, anchorY: size / 2, mask: false, px: px, dpr: dpr,
      matra: m, jenis: j, theme: th }, c ? c.cv : null);
    return SPRITES[key];
  }
  /** The badge atlas of one theme: 4 matra × 3 kinds, keyed 'AL-markas' …; drawn at 32 CSS px (sized down by deck). */
  function badgeAtlas(theme) {
    var list = [], ids = {};
    MATRA_ORDER.forEach(function (m) { PK_JENIS.forEach(function (j) { var s = badgeSprite({ matra: m, jenis: j, theme: theme, px: 32 }); list.push(s); ids[m + '-' + j] = s.id; }); });
    var at = spriteAtlas(list);
    if (!at.byName) { at.byName = ids; }
    return at;
  }

  /* ------------------------------------------------ kelas biaya badge (v6, V6_SPEC D6, §4.3) */
  /* A small "signal bars" badge beside a school or campus symbol: 4 bars Premium, 3 Atas, 2 Menengah, 1 Reguler, none for
     "Belum diketahui". Filled bars = the tier comes from the published fee or the school type (basis 'biaya' / 'jenis');
     empty bars (an outline with the keyline colour inside) = perkiraan. The tier is carried by the NUMBER and the FILL of
     the bars only (colour-blind safe, no clash with the green / red Mandiri status): one neutral ink, Mandiri navy with a
     white keyline in Terang, near-white with a dark keyline in Gelap, so every bar edge keeps >= 3:1 on both base maps.
     Axis-aligned rectangles only (fillRect), so the canvas sprite, the legend SVG and the greyscale test draw the same
     pixels. Geometry in CSS px (u = px / 14): keyline k, gap and outline width bd = 1 px up to 27 px; bars bottom-aligned,
     heights 2/5, 3/5, 4/5 and 5/5 of the inner height (a step of a fifth between levels), so the one-bar Reguler badge —
     the most common one — is a short bar, never a dot. Bar width bw >= 4 with a hole of at least 2 px, widened until the
     empty bar's hole is >= 30 % of the bar, so filled and empty differ by at least that much ink at every level and
     size, also on a 1× screen (at 14 px: 4 px bars, Reguler 4 × 5, Premium 4 × 12, the badge 21 × 14). */
  var TIER_INK = {
    day:   { ink: [0, 61, 121], key: [255, 255, 255] },
    night: { ink: [241, 245, 249], key: [10, 15, 23] }
  };
  function tierTheme(t) { t = String(t || '').toLowerCase(); return t === 'night' || t === 'dark' || t === 'gelap' ? 'night' : 'day'; }
  /**
   * tierGeom({level 0-4, basis, px?, dpr?}) → {level, filled, px, dpr, w, h, wPx, hPx, rects: [{x, y, w, h, role: 'key' | 'ink' |
   * 'hole'}]} in device px (dpr 1 = CSS px); draw 'key' first, then 'ink', then 'hole' (in the keyline colour). Level 0: no rects.
   */
  function tierGeom(spec) {
    spec = spec || {};
    var level = clamp(Math.round(+spec.level || 0), 0, 4);
    var px = clamp(finite(+spec.px) ? Math.round(+spec.px) : 14, 10, 48);
    var dpr = finite(+spec.dpr) && +spec.dpr >= 1 ? Math.round(+spec.dpr) : 1;
    var u = px / 14, k = Math.max(1, Math.round(u)), gap = Math.max(1, Math.round(u)), bd = Math.max(1, Math.round(u * 0.75));
    var H = px, hin = H - 2 * k, filled = spec.basis !== 'perkiraan';
    var hs = [0, 1, 2, 3].map(function (i) { return Math.min(hin, Math.max(2 * bd + 2, Math.round(hin * (2 + i) / 5))); });
    /* the shortest bar sets the width: its hole (bw - 2 bd) × (h - 2 bd) must be >= 30 % of the bar, so empty reads as empty */
    var bw = Math.max(4, Math.round(4 * u), 2 * bd + 2);
    while ((bw - 2 * bd) * (hs[0] - 2 * bd) < 0.3 * bw * hs[0] && bw < 4 * px) bw++;
    var W = 2 * k + 4 * bw + 3 * gap;
    var keys = [], inks = [], holes = [];
    for (var i = 0; i < level; i++) {
      var bh = hs[i], x = k + i * (bw + gap), y = H - k - bh;
      keys.push({ x: x - k, y: y - k, w: bw + 2 * k, h: bh + 2 * k, role: 'key' });
      inks.push({ x: x, y: y, w: bw, h: bh, role: 'ink' });
      if (!filled) holes.push({ x: x + bd, y: y + bd, w: bw - 2 * bd, h: bh - 2 * bd, role: 'hole' });
    }
    var rects = keys.concat(inks, holes).map(function (r) { return { x: r.x * dpr, y: r.y * dpr, w: r.w * dpr, h: r.h * dpr, role: r.role }; });
    return { level: level, filled: filled, px: px, dpr: dpr, w: W * dpr, h: H * dpr, wPx: W, hPx: H, rects: rects };
  }
  /**
   * tierSprite({level 1-4, basis: 'biaya' | 'jenis' | 'perkiraan', theme: 'day' | 'night', px?}) → cached sprite
   * {id, url, canvas, width, height, anchorX, anchorY, mask: false, px, dpr, wPx, hPx, level, basis, filled, theme} (the shape of
   * symbolSprite; draw it at getSize = px, the badge's height in CSS px, default 14), or null for level 0 ("Belum diketahui":
   * no badge). Place it at the symbol's top-right with tierOffset(symbolPx, sprite).
   */
  function tierSprite(spec) {
    spec = spec || {};
    var level = clamp(Math.round(+spec.level || 0), 0, 4);
    if (!level) return null;
    var th = tierTheme(spec.theme), dpr = spriteDpr();
    var g = tierGeom({ level: level, basis: spec.basis, px: spec.px, dpr: dpr });
    var basis = g.filled ? (spec.basis === 'jenis' ? 'jenis' : 'biaya') : 'perkiraan';
    var key = 'tier|' + level + '|' + (g.filled ? 'f' : 'e') + '|' + th + '|' + g.px + '|' + dpr;
    if (SPRITES[key]) return SPRITES[key];
    var c = newCanvas(g.w, g.h), ink = TIER_INK[th];
    if (c) {
      var ctx = c.ctx, css = { key: cssRgb(ink.key), ink: cssRgb(ink.ink), hole: cssRgb(ink.key) };
      g.rects.forEach(function (r) { ctx.fillStyle = css[r.role]; ctx.fillRect(r.x, r.y, r.w, r.h); });
    }
    /* the canvas height is px × dpr, so getSize = px draws it at its own pixels; the width follows the aspect */
    SPRITES[key] = lazyUrl({ id: key, canvas: c ? c.cv : null, width: g.w, height: g.h, anchorX: g.w / 2, anchorY: g.h / 2, mask: false,
      px: g.px, dpr: dpr, wPx: g.wPx, hPx: g.hPx, level: level, basis: basis, filled: g.filled, theme: th }, c ? c.cv : null);
    return SPRITES[key];
  }
  /** tierAtlas({theme, px?}) → one deck atlas of the 8 badges (levels 1–4, filled and empty) with byName {'1f', '1e', …, '4e'} → id. */
  function tierAtlas(spec) {
    spec = spec || {};
    var list = [], ids = {};
    [1, 2, 3, 4].forEach(function (lv) {
      [['f', 'biaya'], ['e', 'perkiraan']].forEach(function (b) {
        var sp = tierSprite({ level: lv, basis: b[1], theme: spec.theme, px: spec.px });
        if (sp) { list.push(sp); ids[lv + b[0]] = sp.id; }
      });
    });
    var at = spriteAtlas(list);
    if (!at.byName) at.byName = ids;
    return at;
  }
  /** tierOffset(symbolPx, badge | badgePx) → [dx, dy] CSS px for getPixelOffset: the badge's lower-left corner on the
      symbol's edge at its top-right (the 45° line, about half the symbol's size from its centre), so it never covers the
      symbol's centre or its status colour. */
  function tierOffset(symbolPx, badge) {
    var sp = finite(+symbolPx) ? +symbolPx : 12;
    var w = badge && typeof badge === 'object' ? badge.wPx : tierGeom({ level: 4, px: badge }).wPx;
    var h = badge && typeof badge === 'object' ? badge.hPx : tierGeom({ level: 4, px: badge }).hPx;
    var c = Math.round(sp * 0.36);
    return [c + w / 2, -(c + h / 2)];
  }
  /** tierSVG({level, basis, theme, size?}) → <svg> of the badge for legends and cards (the same rectangles as the sprite at that
      size; size = height in CSS px, default 14). Drawn at its own pixels (no scaling), so the 1 px outline of an empty bar
      stays one crisp pixel. Level 0 → null. */
  function tierSVG(spec) {
    spec = spec || {};
    var size = finite(+spec.size) ? Math.round(+spec.size) : 14;
    var g = tierGeom({ level: spec.level, basis: spec.basis, px: size, dpr: 1 });
    if (!g.level) return null;
    var ink = TIER_INK[tierTheme(spec.theme)];
    var svg = DOC.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + g.w + ' ' + g.h);
    svg.setAttribute('width', String(g.w));
    svg.setAttribute('height', String(g.h));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('class', 'mcd-glyph mcd-tier');
    var fill = { key: cssRgb(ink.key), ink: cssRgb(ink.ink), hole: cssRgb(ink.key) };
    g.rects.forEach(function (r) {
      var el = DOC.createElementNS(SVGNS, 'rect');
      el.setAttribute('x', String(r.x)); el.setAttribute('y', String(r.y));
      el.setAttribute('width', String(r.w)); el.setAttribute('height', String(r.h));
      el.setAttribute('fill', fill[r.role]);
      svg.appendChild(el);
    });
    return svg;
  }

  /* ---------------------------------------------------------------- hexbin */

  var SQRT3 = Math.sqrt(3);
  /* 6 pointy-top unit vertices [cos(30°+60°k), sin(30°+60°k)] (§E.5.4) */
  var HEX_UNIT_VERTICES = [0, 1, 2, 3, 4, 5].map(function (k) { var a = (30 + 60 * k) * D2R; return [Math.cos(a), Math.sin(a)]; });
  var GLOW_PARAMS = {
    blend: true, blendColorOperation: 'add', blendColorSrcFactor: 'src-alpha', blendColorDstFactor: 'one',
    blendAlphaOperation: 'add', blendAlphaSrcFactor: 'one', blendAlphaDstFactor: 'one-minus-src-alpha',
    depthWriteEnabled: false
  };

  /**
   * hexbin(points, R, opts?) → cells sorted by (r, q)
   *   points: [{position:[lon,lat], os?, id?}]   R: centre-to-vertex metres
   *   opts.origin [lon,lat] (default branch) · opts.getPosition(p,i) · opts.init(cell) · opts.accumulate(cell,p,i)
   *   cell = {id:'q,r', q, r, position, count, os, ids:[], idx:[], radiusM}   (draw it flat: never extrude)
   */
  function hexbin(points, R, opts) {
    opts = opts || {};
    points = points || EMPTY;
    R = R > 0 ? R : 150;
    var o = opts.origin || branchLL();
    var lon0 = o[0], lat0 = o[1];
    var kx = 111320 * Math.cos(lat0 * D2R), ky = 110574;
    var getPos = opts.getPosition || function (p) { return p.position; };
    var index = new Map(), cells = [];
    for (var i = 0; i < points.length; i++) {
      var p = points[i], pos = getPos(p, i);
      if (!pos || !finite(pos[0]) || !finite(pos[1])) continue;
      var x = (pos[0] - lon0) * kx, y = (pos[1] - lat0) * ky;
      var qf = (SQRT3 / 3 * x - y / 3) / R, rf = (2 / 3 * y) / R, sf = -qf - rf;
      var q = Math.round(qf), r = Math.round(rf), s = Math.round(sf);
      var dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
      if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
      var nk = (q + 32768) * 65536 + (r + 32768), c = index.get(nk);
      if (!c) {
        var cx = R * SQRT3 * (q + r / 2), cy = R * 1.5 * r;
        c = { id: q + ',' + r, q: q, r: r, position: [lon0 + cx / kx, lat0 + cy / ky], count: 0, os: 0, ids: [], idx: [], radiusM: R };
        if (opts.init) opts.init(c);
        index.set(nk, c);
        cells.push(c);
      }
      c.count++;
      if (p && p.os > 0) c.os += p.os;
      if (p && p.id != null) c.ids.push(p.id);
      c.idx.push(i);
      if (opts.accumulate) opts.accumulate(c, p, i);
    }
    cells.sort(function (a, b) { return a.r - b.r || a.q - b.q; });
    return cells;
  }

  function quantileThresholds(values, n) {
    var v = values.slice().sort(function (a, b) { return a - b; }), out = [];
    if (!v.length) return out;
    for (var k = 1; k < n; k++) out.push(v[Math.min(v.length - 1, Math.floor(k / n * v.length))]);
    return out;
  }
  function stepOf(v, thresholds) {
    var s = 1;
    for (var i = 0; i < thresholds.length; i++) if (v > thresholds[i]) s++;
    return clamp(s, 1, thresholds.length + 1);
  }
  function percentile(sorted, p) { return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] : 0; }

  /* ------------------------------------------------------------ map style */

  var EMPTY_FC = { type: 'FeatureCollection', features: [] };
  var WORLD_RING = [[-180, -85.05], [180, -85.05], [180, 85.05], [-180, 85.05], [-180, -85.05]];

  function worldRing() {
    var w = ref().worldPolygon;
    if (Array.isArray(w) && w.length > 3 && Array.isArray(w[0]) && finite(w[0][0])) return w;
    if (Array.isArray(w) && Array.isArray(w[0]) && Array.isArray(w[0][0])) return w[0];
    if (w && w.geometry && w.geometry.coordinates) return w.geometry.coordinates[0];
    if (w && w.coordinates) return w.coordinates[0];
    return WORLD_RING;
  }
  function mabesFeature() {
    var ring = mabesRing();
    if (!ring) return EMPTY_FC;
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Mabes TNI Cilangkap' }, geometry: { type: 'Polygon', coordinates: [ring] } }] };
  }

  /** MCD.map.style() — base style JSON, §E.2 layer order (bottom → top). */
  function style() {
    var tr = { duration: 600, delay: 0 };
    return {
      version: 8,
      name: 'cilangkap-command',
      glyphs: OFM_GLYPHS,
      transition: { duration: 300, delay: 0 },
      sources: {
        imagery: { type: 'raster', tiles: [IMAGERY_TILES], tileSize: 256, maxzoom: 19, attribution: ESRI_ATTRIBUTION },
        /* 'ofm' (OpenFreeMap vector tiles) is added after 'load' by addOfm(): its TileJSON is a
           network request, and a source that cannot load would hold back the whole map offline */
        anchor: { type: 'geojson', data: EMPTY_FC },
        world: { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [worldRing()] } }] } },
        mabes: { type: 'geojson', data: mabesFeature() },
        rings: { type: 'geojson', data: EMPTY_FC },
        focusMask: { type: 'geojson', data: EMPTY_FC },
        /* item 30: the soft shade of the outer ring and the veil beyond it (filled by applyZones) */
        zoneRing: { type: 'geojson', data: EMPTY_FC },
        zoneBeyond: { type: 'geojson', data: EMPTY_FC }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': PAL[palKey()].bg } },
        { id: 'imagery', type: 'raster', source: 'imagery', layout: { visibility: isOverview() ? 'none' : 'visible' }, paint: {
          'raster-saturation': -0.70, 'raster-contrast': 0.08, 'raster-brightness-min': 0.0,
          'raster-brightness-max': 0.52, 'raster-hue-rotate': 0, 'raster-fade-duration': 300, 'raster-opacity': 1,
          'raster-saturation-transition': tr, 'raster-contrast-transition': tr, 'raster-brightness-max-transition': tr,
          'raster-opacity-transition': tr } },
        { id: 'wash', type: 'fill', source: 'world', paint: { 'fill-color': '#04122A', 'fill-opacity': 0.38, 'fill-opacity-transition': tr } },
        { id: 'focus-mask', type: 'fill', source: 'focusMask', paint: { 'fill-color': '#05080F', 'fill-opacity': 0, 'fill-opacity-transition': { duration: 400, delay: 0 } } },
        /* item 30: everything outside the 15 km focus gets a soft shade, everything beyond the outer ring a second
           layer on top (a stronger veil); both are single polygons with the area as a hole, so no seams */
        { id: 'zone-ring', type: 'fill', source: 'zoneRing', paint: { 'fill-color': '#FAFAFB', 'fill-opacity': 0,
          'fill-opacity-transition': { duration: 400, delay: 0 }, 'fill-color-transition': { duration: 400, delay: 0 } } },
        { id: 'zone-beyond', type: 'fill', source: 'zoneBeyond', paint: { 'fill-color': '#FAFAFB', 'fill-opacity': 0,
          'fill-opacity-transition': { duration: 400, delay: 0 }, 'fill-color-transition': { duration: 400, delay: 0 } } },
        { id: 'mabes-fill', type: 'fill', source: 'mabes', paint: { 'fill-color': '#F2B705', 'fill-opacity': 0.045 } },
        { id: 'mabes-glow', type: 'line', source: 'mabes', layout: { 'line-join': 'round' }, paint: { 'line-color': '#F2B705', 'line-width': 6, 'line-blur': 5, 'line-opacity': 0.12 } },
        { id: 'mabes-line', type: 'line', source: 'mabes', layout: { 'line-join': 'round' }, paint: { 'line-color': '#F2B705', 'line-width': 1.25, 'line-opacity': 0.85 } },
        { id: 'rings', type: 'line', source: 'rings',
          filter: ['all', ['!=', ['get', 'active'], true], ['!=', ['get', 'core'], true], ['!=', ['get', 'outer'], true]],
          paint: { 'line-color': '#EDEFF3', 'line-opacity': 0.16, 'line-width': 1, 'line-dasharray': [2, 4] } },
        { id: 'rings-outer', type: 'line', source: 'rings',
          filter: ['all', ['!=', ['get', 'active'], true], ['==', ['get', 'outer'], true]],
          paint: { 'line-color': '#AEB7C4', 'line-opacity': 0.4, 'line-width': 1.25, 'line-dasharray': [4, 3] } },
        { id: 'rings-core', type: 'line', source: 'rings',
          filter: ['all', ['!=', ['get', 'active'], true], ['==', ['get', 'core'], true]],
          paint: { 'line-color': '#AEB7C4', 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 12, 1.5], 'line-dasharray': [6, 3] } },
        { id: 'rings-active-glow', type: 'line', source: 'rings', filter: ['==', ['get', 'active'], true],
          paint: { 'line-color': '#AEB7C4', 'line-opacity': 0, 'line-width': 5, 'line-blur': 4 } },
        { id: 'rings-active', type: 'line', source: 'rings', filter: ['==', ['get', 'active'], true],
          paint: { 'line-color': '#AEB7C4', 'line-opacity': 0.85, 'line-width': 1.5 } },
        { id: 'deck-anchor', type: 'line', source: 'anchor' }
      ]
    };
  }


  /** Flat building outlines and place / road labels on the OpenFreeMap vector source (added after 'load'). */
  function ofmLayers() {
    var tr = { duration: 600, delay: 0 };
    return {
      below: [
        { id: 'bld-flat', type: 'line', source: 'ofm', 'source-layer': 'building', minzoom: 14,
          paint: { 'line-color': '#AEBBCD', 'line-opacity': 0, 'line-width': 0.6, 'line-opacity-transition': tr } }
      ],
      top: [
        { id: 'lbl-place', type: 'symbol', source: 'ofm', 'source-layer': 'place', minzoom: 11.5,
          filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter', 'neighbourhood', 'village', 'town']]],
          layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 10,
            'text-letter-spacing': 0.16, 'text-max-width': 8 },
          paint: { 'text-color': '#7C879A', 'text-halo-color': '#05080F', 'text-halo-width': 1.2, 'text-opacity': cutOpacity(1) } },
        { id: 'lbl-road', type: 'symbol', source: 'ofm', 'source-layer': 'transportation_name', minzoom: 14,
          layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'],
            'text-size': 10.5, 'text-letter-spacing': 0.04 },
          paint: { 'text-color': 'rgba(167,176,192,0.78)', 'text-halo-color': '#05080F', 'text-halo-width': 1.2 } }
      ]
    };
  }
  /** Adds the 'ofm' source and its layers once the map has loaded; a failure only drops labels and building outlines. */
  function addOfm() {
    if (!S.map || S.map.getSource('ofm')) return;
    try {
      S.map.addSource('ofm', { type: 'vector', url: OFM_TILEJSON });
      var L = ofmLayers();
      L.below.forEach(function (l) { S.map.addLayer(l, hasLayer('mabes-fill') ? 'mabes-fill' : undefined); });
      /* satellite place and road names sit under the zone shade (item 30), so the busy names beyond fade too */
      L.top.forEach(function (l) { S.map.addLayer(l, hasLayer('zone-ring') ? 'zone-ring' : undefined); });
    } catch (e) { warn('vector tiles', e); S.ofmOK = false; }
  }

  /* ---------------------------------------------------------------- state */

  var CORE_DEFAULT = { sites: true, beacon: true, rings: true, boundary: true };
  var LAYER_DEFAULT = { labels: true, rings: true, sites: true, competitors: true, boundary: true };

  var S = {
    map: null, overlay: null, el: null, ready: false, failed: null, deckOK: true,
    derived: null, derivedSeq: 0,
    section: 'overview', tab: null, postureKey: 'overview', posture: null, postureOpts: null,
    layers: Object.assign({}, LAYER_DEFAULT), layerSet: null,
    view: 'overview', theme: 'night', pal: 'night', palApplied: false, street: { day: null, night: null }, streetIds: { day: [], night: [] }, attributionView: null,
    veil: false, reveal: false, radiusKm: null, hover: null, hoverKey: '',
    selection: null, zoom: HOME_VIEW.zoom,
    beaconAlpha: 1, time: 0, fontsReady: false, wideView: false,
    ticker: { raf: 0, last: 0 },
    imageryOK: true, ofmOK: true, imageryOff: false, trueColour: readTrueColour(), tileErr: [], tiles: { req: 0, done: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    flight: null, flightSeq: 0, reaim: false, starting: false, focusSeq: 0, hoverPick: null, hoverSiteId: null, tipTimer: 0, cursor: null, dragging: false,
    composed: [], flushQueued: false, sectionCache: { key: '', base: EMPTY, top: EMPTY },
    sitesSrc: null, sitesBranch: '', sites: EMPTY, sitesById: new Map(), siteVisKey: '', siteVis: null,
    ringSetName: 'default', ringLabels: EMPTY, ringKey: '',
    markers: { plates: [], mabes: null, built: false }, occluderSel: DEFAULT_OCCLUDERS, plateQueued: false,
    dom: { tip: null, tele: null, legend: null, notice: null, loading: null, loadingText: null, colour: null }, legendKey: '', load: null,
    teleQueued: false, cursorLL: null, fps: { on: false, n: 0, t0: 0, v: 0 },
    pendingReady: [], styleApplied: {}, attributionExtra: '', attribution: null,
    reg: { layers: {}, postures: {}, presets: {}, legends: {}, styles: {}, tooltips: [], selectables: {}, ringSets: {} },
    cb: { pick: [], hover: [], ready: [], camera: [], posture: [], ring: [], view: [], theme: [] },
    sectionVersion: 0
  };

  function emit(name, payload) {
    var list = S.cb[name];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try { list[i](payload); } catch (e) { warn('callback ' + name, e); }
    }
  }
  function on(name, fn) {
    if (!S.cb[name]) S.cb[name] = [];
    if (isFn(fn)) S.cb[name].push(fn);
    return function () { off(name, fn); };
  }
  function off(name, fn) {
    var l = S.cb[name];
    if (!l) return;
    var i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }

  /* ------------------------------------------------------- state syncing */

  function readState() {
    var st = MCD.state;
    if (!st || !isFn(st.get)) return null;
    try { return st.get(); } catch (e) { return null; }
  }

  /* Pull map-relevant values from MCD.state (the source of truth). A value is
     applied only when it changed in state since the last sync, so direct
     setters (setMode, select, …) are never reverted by an unchanged state. */
  var seen = {};
  function stateChanged(name, val) {
    var k = stableKey(val);
    if (seen[name] === k) return false;
    seen[name] = k;
    return true;
  }
  function syncFromState() {
    var st = readState();
    if (!st) return false;
    var changed = false, m = st.map || {}, f = st.filters || {}, pv = st.privacy || {};
    if (stateChanged('layers', m.layers) && m.layers) {
      S.layers = Object.assign({}, LAYER_DEFAULT, m.layers); S.siteVisKey = ''; applyLayerToggles(); changed = true;
    }
    if (stateChanged('veil', !!pv.veil) && !!pv.veil !== S.veil) { S.veil = !!pv.veil; changed = true; queueTelemetry(); }
    if (stateChanged('reveal', !!pv.reveal)) { S.reveal = !!pv.reveal; changed = true; }
    var rk = f.radiusKm == null ? null : Number(f.radiusKm);
    if (stateChanged('radius', rk) && rk !== S.radiusKm) { S.radiusKm = rk; updateRings(); updateFocusMask(); changed = true; }
    if (stateChanged('selection', st.selection || null)) { S.selection = st.selection || null; selectionChanged(S.selection); changed = true; }
    if (stateChanged('hover', st.hover || null)) {
      var hk = stableKey(st.hover || null);
      if (hk !== S.hoverKey) { S.hover = st.hover || null; S.hoverKey = hk; changed = true; }
    }
    return changed;
  }

  /* --------------------------------------------------------------- sites */

  function siteScale() { return isOverview() ? 1.4 : 1; }
  /** MCD.ref.pangkalanOf(site) (item 34), or null when the reference module is older. */
  function pangkalanOf(s) {
    var f = ref().pangkalanOf;
    if (!isFn(f)) return null;
    try { return f(s) || null; } catch (e) { return null; }
  }
  function badgeTheme() { return palKey() === 'day' ? 'day' : 'night'; }
  function siteStyle(s, home) {
    var k = s.kind;
    if (k === 'mandiri_branch') return { glyph: 'diamond', rgb: C.gold, a: 255, size: home ? 13 : 10, key: C.text1, keyA: 230, keySize: home ? 17 : 13 };
    if (k === 'mandiri_atm') return { glyph: 'dot', rgb: C.gold, a: 179, size: 5, key: C.canvas, keyA: 200, keySize: 7 };
    if (k === 'competitor_branch') return { glyph: 'square', rgb: C.text2, a: 235, size: 9, key: C.canvas, keyA: 220, keySize: 12 };
    if (k === 'hq_complex' || k === 'hq_navy' || k === 'hq_airforce' || k === 'hq_unit') return { glyph: 'frame', rgb: C.text1, a: 235, size: 11, key: C.canvas, keyA: 200, keySize: 14 };
    if (k === 'gate') return { glyph: 'bar', rgb: C.text1, a: 235, size: 9, key: C.canvas, keyA: 200, keySize: 12, gate: true };
    if (k === 'navy_housing') return { glyph: 'rsqOutlineDot', rgb: C.plat[3], a: 235, size: 11, key: C.canvas, keyA: 200, keySize: 14 };
    if (k === 'military_housing') return { glyph: 'rsqOutline', rgb: C.plat[3], a: 235, size: 11, key: C.canvas, keyA: 200, keySize: 14 };
    return { glyph: 'dot', rgb: C.text3, a: 235, size: 5, key: C.canvas, keyA: 200, keySize: 7 };
  }
  function monogram(s) {
    var b = s.bank || '';
    if (!b) { var m = /\(B:\s*([^)]+)\)/.exec(s.name || s.label || ''); if (m) b = m[1]; }
    b = String(b).trim();
    if (!b) return '';
    var u = b.toUpperCase();
    return u === 'BJB' ? 'bjb' : u.slice(0, 4);
  }
  function prepareSites() {
    var d = MCD.data && Array.isArray(MCD.data.sites) && MCD.data.sites.length ? MCD.data.sites : null;
    var src = d || ref().sites || EMPTY;
    var bk = branchKey();
    if (src === S.sitesSrc && bk === S.sitesBranch) return false;
    S.sitesSrc = src; S.sitesBranch = bk;
    var b = branchLL(), mc = MABES_CENTROID, out = [], by = new Map();
    for (var i = 0; i < src.length; i++) {
      var s = src[i], pos = posOf(s);
      if (!pos) continue;
      var dist = haversineKm(b[0], b[1], pos[0], pos[1]);
      var home = s.id === 'mdr-cilangkap' || (s.kind === 'mandiri_branch' && dist < 0.05);
      var st = siteStyle(s, home);
      var label = String(s.label || s.name || '').replace(/\s*\(B:[^)]*\)\s*/g, ' ').trim();
      var pk = pangkalanOf(s);
      var rec = {
        id: s.id, src: s, kind: s.kind, tier: s.tier || 3, conf: s.confidence || 'medium', position: pos, distKm: dist, pk: pk,
        far: s.far != null ? !!s.far : dist > (cfg().farSiteKm || 12), home: home, glyph: st.glyph, rgb: st.rgb, a: st.a, size: st.size,
        key: st.key, keyA: st.keyA, keySize: st.keySize, gate: !!st.gate,
        angle: st.gate ? -(bearingDeg(mc[0], mc[1], pos[0], pos[1]) + 90) : 0,
        mono: s.kind === 'competitor_branch' ? monogram(s) : '',
        label: (s.confidence === 'low' ? '\u2248 ' : '') + (home ? BRANCH_SHORT : label)
      };
      out.push(rec);
      by.set(rec.id, rec);
    }
    out.sort(function (a, b2) { return (b2.tier - a.tier) || (a.home ? 1 : 0) - (b2.home ? 1 : 0); });
    S.sites = out; S.sitesById = by; S.siteVisKey = '';
    if (S.markers.built) buildPlates();
    return true;
  }
  /** tier visibility (§E.5.6), memoised by zoom quantum */
  function siteVisibility() {
    var zq = quant(S.zoom, 0.25), wide = S.wideView || S.zoom <= 11.5;
    var key = zq + '|' + wide + '|' + S.hoverSiteId + '|' + S.layers.competitors + '|' + S.layers.sites + '|' + S.sitesBranch + '|' + S.markers.built + '|' + S.view + '|' + S.pal;
    if (key === S.siteVisKey && S.siteVis) return S.siteVis;
    var icons = [], gates = [], labels = [], monos = [], badges = [];
    for (var i = 0; i < S.sites.length; i++) {
      var s = S.sites[i];
      if (!S.layers.competitors && s.kind === 'competitor_branch') continue;
      /* pangkalan TNI (item 34) are a permanent layer; the other places follow the "Tempat penting" switch */
      if (!s.pk && !S.layers.sites) continue;
      var showIcon, showLabel;
      if (s.far) { showIcon = wide; showLabel = wide && (s.tier <= 2 || S.wideView); }
      else if (s.tier === 1) { showIcon = true; showLabel = true; }
      else if (s.tier === 2) { showIcon = zq >= (s.pk ? 11 : 12); showLabel = zq >= 13.5; }
      else { showIcon = zq >= (s.pk ? 12 : 14.5); showLabel = s.pk ? zq >= 14.5 : false; }
      if (s.id === S.hoverSiteId) { showIcon = true; showLabel = true; }
      if (!showIcon) continue;
      if (s.pk) badges.push(s); else if (s.gate) gates.push(s); else icons.push(s);
      if (showLabel && !(s.tier === 1 && !s.far && S.markers.built)) labels.push(s);
      if (s.mono && zq >= 13) monos.push(s);
    }
    badges = declutterBadges(badges, zq);
    var shown = {};
    badges.forEach(function (b) { shown[b.id] = 1; });
    labels = labels.filter(function (l) { return !l.pk || shown[l.id]; });
    S.siteVisKey = key;
    S.siteVis = { icons: icons, gates: gates, labels: labels, monos: monos, badges: badges };
    return S.siteVis;
  }
  /* Pangkalan badges (item 34): size by zoom (TNI AL slightly larger: the branch payroll is mainly TNI AL),
     decluttered in screen space per zoom step so badges never pile up inside the Mabes complex. Priority:
     tier, TNI AL first, markas before rumah sakit before perumahan, then the nearest to the branch. */
  var PK_RANK = { markas: 0, rs: 1, perumahan: 2 };
  function badgePx(s, zq) {
    var base = zq < 10 ? 14 : (zq < 11 ? 17 : (zq < 12.5 ? 20 : (zq < 14 ? 23 : 26)));
    return Math.round(base * (s.pk && s.pk.matra === 'AL' ? 1.15 : 1) * (isOverview() ? 1.08 : 1));
  }
  function declutterBadges(list, zq) {
    if (list.length < 2) return list;
    var W0 = 512 * Math.pow(2, zq), placed = [], out = [];
    var order = list.slice().sort(function (a, b) {
      return (a.id === S.hoverSiteId ? -1 : 0) - (b.id === S.hoverSiteId ? -1 : 0) || (a.tier - b.tier) ||
        ((a.pk.matra === 'AL' ? 0 : 1) - (b.pk.matra === 'AL' ? 0 : 1)) || (PK_RANK[a.pk.jenis] - PK_RANK[b.pk.jenis]) || (a.distKm - b.distKm);
    });
    order.forEach(function (s) {
      var x = (s.position[0] + 180) / 360 * W0, sy = Math.sin(s.position[1] * D2R);
      var y = (0.5 - Math.log((1 + sy) / (1 - sy)) / (4 * Math.PI)) * W0, r = badgePx(s, zq) * 0.42;
      for (var i = 0; i < placed.length; i++) {
        var p = placed[i], dx = p[0] - x, dy = p[1] - y, min = (p[2] + r) * 0.8;
        if (dx * dx + dy * dy < min * min && s.id !== S.hoverSiteId) return;
      }
      placed.push([x, y, r]);
      out.push(s);
    });
    return out;
  }

  /* ------------------------------------------------------ deck builders */

  function D() { return W.deck; }
  function beforeIdFor() { return DECK_BEFORE; }

  function isOverview() { return S.view === 'overview'; }
  function palKey() { return isOverview() && S.theme === 'day' ? 'day' : 'night'; }
  function isPlan() { return !!(S.posture && S.posture.plan); }

  /* mapState handed to registered layer / posture / legend functions */
  function baseState() {
    return {
      section: S.section, tab: S.tab, key: S.postureKey, posture: S.posture,
      zoom: S.zoom, zoomQ: quant(S.zoom, 0.25), pitch: 0, bearing: 0,
      /* flat constants (COPY_STYLE_EN item 10), kept for older section code */
      mode: 'precise', fade: 1, weight: 'count', dim: '2d', plan: isPlan(), extruded: false, growT: 1,
      view: S.view, theme: S.theme, palette: S.pal,
      veil: S.veil, reveal: S.reveal, radiusKm: S.radiusKm, hover: S.hover, hoverKey: S.hoverKey, selection: S.selection,
      layerSet: S.layerSet, layers: S.layers, time: S.time, branch: branchLL(), mabes: MABES_CENTROID,
      beforeId: DECK_BEFORE, fontsReady: S.fontsReady, reducedMotion: reduced(), kit: kit,
      /* v6: the zones in effect ({mode, km?}); MCD.territory.layers() picks its kecamatan set from it */
      zones: zonesNow()
    };
  }
  function mapState() { return baseState(); }

  /* beacon (§E.5.6): a flat gold dot with a slow pulse ring at the branch */
  function beaconLayers(out) {
    var d = D(), b = branchLL(), data = [{ position: b }];
    out.push(new d.ScatterplotLayer({
      id: 'beacon', data: data, getPosition: function (o) { return o.position; },
      radiusUnits: 'pixels', getRadius: 7, filled: true, stroked: true, getFillColor: [255, 183, 0, 150],
      getLineColor: rgba(C.canvas, 220), lineWidthUnits: 'pixels', getLineWidth: 1.5, parameters: GLOW_PARAMS,
      pickable: false, opacity: S.beaconAlpha, beforeId: DECK_BEFORE
    }));
    out.push(function () {
      var animate = tickerAllowed();
      var phase = animate ? ((S.time % 4000) / 4000) : 0.45;
      var r = lerp(40, 140, animate ? outExpo(phase) : phase), a = animate ? 0.5 * (1 - phase) : 0.28;
      return new d.ScatterplotLayer({
        id: 'beacon-pulse', data: data, getPosition: function (o) { return o.position; },
        radiusUnits: 'meters', getRadius: 1, radiusScale: r, stroked: true, filled: false,
        getLineColor: rgba(C.gold, 255), lineWidthUnits: 'pixels', getLineWidth: 1, lineWidthMinPixels: 1,
        pickable: false, opacity: a * S.beaconAlpha, beforeId: DECK_BEFORE
      });
    });
  }

  /* sites (§E.5.6) */
  function siteLayers(out, top) {
    var d = D(), atlas = buildAtlas(), vis = siteVisibility(), vk = S.siteVisKey;
    var getPos = function (s) { return s.position; };
    /* V8 final fix (critic, 24 Oct 2026): a section whose own symbols are small (Kesehatan, Calon Prioritas) sets
       posture.core.sitesDim: the TNI badges and place icons draw at 35 % opacity and 80 % size there, so they stop
       competing with the hospitals (whose plus a badge corner also uses) */
    var pc = (S.posture && S.posture.core) || {}, dim = pc.sitesDim === true, dimA = dim ? 0.35 : 1, dimS = dim ? 0.8 : 1, dk = vk + (dim ? '|dim' : '');
    out.push(new d.IconLayer({
      id: 'sites-keyline', data: vis.icons, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping,
      getIcon: function (s) { return s.glyph; }, getPosition: getPos, getSize: function (s) { return s.keySize * siteScale() * dimS; },
      sizeUnits: 'pixels', getColor: function (s) { return rgba(s.key, s.keyA); }, updateTriggers: { getSize: dk, getColor: vk },
      opacity: dimA, pickable: false, beforeId: DECK_BEFORE
    }));
    out.push(new d.IconLayer({
      id: 'sites-icons', data: vis.icons, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping,
      getIcon: function (s) { return s.glyph; }, getPosition: getPos, getSize: function (s) { return s.size * siteScale() * dimS; },
      sizeUnits: 'pixels', getColor: function (s) { return rgba(s.rgb, s.a); }, updateTriggers: { getSize: dk, getColor: vk },
      opacity: dimA, pickable: true, beforeId: DECK_BEFORE
    }));
    if (vis.badges.length) {
      /* pangkalan TNI (item 34): one round badge per site from the badge atlas of the current theme */
      var bat = badgeAtlas(badgeTheme()), zq = quant(S.zoom, 0.25);
      if (bat.iconAtlas) {
        out.push(new d.IconLayer({
          id: 'sites-badges', data: vis.badges, iconAtlas: bat.iconAtlas, iconMapping: bat.iconMapping,
          getIcon: function (s) { return bat.byName[s.pk.matra + '-' + s.pk.jenis]; }, getPosition: getPos,
          getSize: function (s) { return badgePx(s, zq) / 0.84 * dimS; }, sizeUnits: 'pixels', alphaCutoff: 0.02,
          updateTriggers: { getIcon: vk, getSize: dk }, opacity: dimA, pickable: true, beforeId: DECK_BEFORE
        }));
      }
    }
    if (vis.gates.length) {
      out.push(new d.IconLayer({
        id: 'sites-gates', data: vis.gates, iconAtlas: atlas.iconAtlas, iconMapping: atlas.iconMapping,
        getIcon: function () { return 'bar'; }, getPosition: getPos, getSize: 9 * siteScale(), sizeUnits: 'pixels',
        getAngle: function (s) { return s.angle; }, billboard: false, getColor: rgba(C.text1, 235),
        pickable: true, beforeId: DECK_BEFORE
      }));
    }
    if (!S.fontsReady) return;
    if (vis.monos.length) {
      top.push(new d.TextLayer({
        id: 'sites-mono', data: vis.monos, getPosition: getPos, getText: function (s) { return s.mono; },
        getSize: 12, sizeUnits: 'pixels', getColor: rgba(C.text2, 235), fontFamily: FONT_SANS, fontWeight: 500,
        characterSet: 'auto', fontSettings: { sdf: true }, outlineWidth: 2, outlineColor: rgba(C.canvas, 230),
        getPixelOffset: [0, -12], getTextAnchor: 'middle', getAlignmentBaseline: 'bottom', pickable: false, beforeId: DECK_BEFORE
      }));
    }
    var lab = vis.labels;
    if (lab.length) {
      /* decluttered by layoutLabels() (by tier, below the callouts and kecamatan labels) */
      top.push(new d.TextLayer({
        id: 'sites-labels', data: lab, getPosition: getPos, getText: function (s) { return s.label; },
        getSize: isOverview() ? 13 : 12, sizeUnits: 'pixels', getColor: rgba(C.text2, 235), fontFamily: FONT_SANS, fontWeight: 500,
        characterSet: 'auto', fontSettings: { sdf: true }, outlineWidth: 2, outlineColor: rgba(C.canvas, 230),
        getPixelOffset: function (s) { return [s.pk ? Math.round(badgePx(s, quant(S.zoom, 0.25)) / 2 + 4) : 10, 0]; }, getTextAnchor: 'start', getAlignmentBaseline: 'center',
        updateTriggers: { getPixelOffset: vk },
        pickable: true, beforeId: DECK_BEFORE
      }));
    }
  }

  /* ring labels (§E.4) */
  function ringLabelLayers(top) {
    if (!S.fontsReady || !S.ringLabels.length) return;
    var d = D();
    top.push(new d.TextLayer({
      id: 'ring-labels', data: S.ringLabels, getPosition: function (r) { return r.position; }, getText: function (r) { return r.text; },
      getSize: 12, sizeUnits: 'pixels', fontFamily: FONT_SANS, fontWeight: 500, characterSet: 'auto',
      /* neutral chips (item 25): the active / 15 km ring reads stronger by weight of ink, not by colour */
      getColor: function (r) { return r.active || r.core ? rgba(C.text1, 255) : (r.outer ? rgba(C.text2, 235) : rgba(C.text3, 255)); },
      background: true, getBackgroundColor: rgba(C.canvas, 215), backgroundPadding: [5, 2],
      getBorderColor: function (r) { return r.active || r.core ? rgba(C.text2, 110) : rgba(C.text1, 40); }, getBorderWidth: 1,
      getTextAnchor: 'middle', getAlignmentBaseline: 'center', updateTriggers: { getColor: S.ringKey + S.pal, getBorderColor: S.ringKey + S.pal },
      pickable: true, beforeId: DECK_BEFORE
    }));
  }

  /* selection halo (§E.5.6) */
  function selectionLayer(out) {
    var pos = selectionPosition(S.selection);
    if (!pos) return;
    /* the route's destination ring marks the selected point (item 36) */
    if (RT.key && RT.phase !== 'off' && S.selection && RT.key === S.selection.kind + ':' + S.selection.id) return;
    var d = D(), data = [{ position: pos }];
    out.push(function () {
      var animate = tickerAllowed();
      var ph = animate ? (S.time % 2000) / 2000 : 0.5;
      return new d.ScatterplotLayer({
        id: 'selection-halo', data: data, getPosition: function (o) { return o.position; },
        radiusUnits: 'pixels', getRadius: 1, radiusScale: animate ? lerp(10, 18, ph) : 14,
        stroked: true, filled: false, getLineColor: rgba(C.signal, 255), lineWidthUnits: 'pixels', getLineWidth: 1.5,
        lineWidthMinPixels: 1.5, billboard: true, pickable: false, opacity: animate ? 0.6 * (1 - ph) + 0.08 : 0.6, beforeId: DECK_BEFORE
      });
    });
  }
  function selectionPosition(sel) {
    if (!sel || sel.id == null) return null;
    var k = sel.kind;
    if (k === 'site') { var s = S.sitesById.get(sel.id); return s ? s.position : null; }
    var fn = S.reg.selectables[k];
    if (isFn(fn)) { try { return fn(sel.id) || null; } catch (e) { return null; } }
    return null;
  }

  /* ---------------------------------------------------- the visit plan (V7_SPEC §7.6, V8_SPEC P3)
   * While the Rencana kunjungan card is open on a map tab, plan.js hands the stops in visit order: a numbered badge per
   * stop and one thin dashed order line from KCP Cilangkap through them (back to KCP with returnToStart). Straight
   * segments: the road route is Google Maps' job. Only seq, lon and lat are read (no name, id or kind reaches the map);
   * nothing here is pickable, so a badge never opens a callout or draws a route. The ink is one neutral navy (Mandiri
   * navy with white numbers on the light street map; near-white with navy numbers on the dark map and the satellite,
   * where light marks read best), never green, never the route blue, never gold. */
  var PLAN_INK = {
    day: { fill: [0, 61, 121], num: [255, 255, 255], key: [255, 255, 255], line: [0, 61, 121] },
    night: { fill: [241, 245, 249], num: [0, 61, 121], key: [10, 15, 23], line: [241, 245, 249] }
  };
  var PLAN_BADGE_PX = 20, PLAN_LINE_W = 1.5, PLAN_LINE_A = 0.7, PLAN_DASH = [4, 4], PLAN_DASH_CAP = 3000, PLAN_SPREAD_PX = 22;
  var PLAN = { stops: [], line: true, ret: false, start: null, key: '', dash: null, dashKey: '' };
  function llOf(v) {
    if (!v) return null;
    var lon = Array.isArray(v) ? +v[0] : +v.lon, lat = Array.isArray(v) ? +v[1] : +v.lat;
    return finite(lon) && finite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90 ? [lon, lat] : null;
  }
  /**
   * setPlanOverlay({stops: [{seq, lon, lat}], line = true, returnToStart = false, start?: {lon, lat}}) → true while stops
   * are drawn. Stops without a valid point are skipped; badges are numbered by seq (else their place in the list) and
   * drawn in that order; stops on one point sit side by side. The start is KCP Cilangkap unless one is given.
   */
  function setPlanOverlay(o) {
    o = o || {};
    var list = Array.isArray(o.stops) ? o.stops : [], stops = [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i], ll = llOf(s);
      if (!ll) continue;
      var seq = s && finite(+s.seq) && +s.seq > 0 ? Math.round(+s.seq) : i + 1;
      stops.push({ seq: seq, position: ll, at: i });
    }
    stops.sort(function (a, b) { return a.seq - b.seq || a.at - b.at; });
    /* stops on one point (5 decimals): side by side, 22 px apart, so every number stays readable */
    var groups = {};
    stops.forEach(function (s) { var k = s.position[0].toFixed(5) + ',' + s.position[1].toFixed(5); (groups[k] = groups[k] || []).push(s); });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      g.forEach(function (s, j) { s.off = [Math.round((j - (g.length - 1) / 2) * PLAN_SPREAD_PX), 0]; delete s.at; });
    });
    var line = o.line !== false, ret = !!o.returnToStart, start = llOf(o.start);
    var key = JSON.stringify([stops.map(function (s) { return [s.seq, s.position, s.off]; }), line, ret, start]);
    if (key === PLAN.key) return stops.length > 0;
    PLAN = { stops: stops, line: line, ret: ret, start: start, key: stops.length ? key : '', dash: null, dashKey: '' };
    scheduleCompose();
    queueLegend();
    return stops.length > 0;
  }
  function clearPlanOverlay() {
    if (!PLAN.stops.length && !PLAN.key) return;
    PLAN = { stops: [], line: true, ret: false, start: null, key: '', dash: null, dashKey: '' };
    scheduleCompose();
    queueLegend();
  }
  /** planOverlay() → {stops: [{seq, lon, lat}], line, returnToStart} | null: what the map draws now (QA, tests). */
  function planOverlay() {
    if (!PLAN.stops.length) return null;
    return { stops: PLAN.stops.map(function (s) { return { seq: s.seq, lon: s.position[0], lat: s.position[1] }; }), line: PLAN.line, returnToStart: PLAN.ret };
  }
  /** The order line's points: the start (KCP), the stops in order, the start again with returnToStart. */
  function planPath() {
    var st = PLAN.start || branchLL(), pts = [st];
    PLAN.stops.forEach(function (s) { pts.push(s.position); });
    if (PLAN.ret) pts.push(st);
    return pts;
  }
  /**
   * planDash(points, zoom, on, off, cap) → [{path: [[lon, lat], [lon, lat]]}]: the polyline cut into dashes of `on` px with
   * `off` px gaps at this zoom, the rhythm running on across the corners (a dash that meets a corner bends as two
   * pieces). Long lines at a close zoom keep at most `cap` pieces: the dashes and gaps then grow together.
   */
  function planDash(pts, zoom, on, off, cap) {
    var segs = [], total = 0, i;
    for (i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], len = legM(a, b) / (metersPerPixel(zoom, (a[1] + b[1]) / 2) || 1);
      if (!(len > 0.25)) continue;
      segs.push({ a: a, b: b, len: len });
      total += len;
    }
    var step = on + off, out = [];
    if (!segs.length || !(step > 0)) return out;
    if (cap > 0 && total / step > cap) { var f = total / step / cap; on *= f; off *= f; step = on + off; }
    var phase = 0;                                   /* distance into the current dash period */
    for (i = 0; i < segs.length; i++) {
      var sg = segs[i], t = 0;
      while (t < sg.len - 1e-9) {
        var room = sg.len - t;
        if (phase < on) {
          var take = Math.min(on - phase, room), t0 = t / sg.len, t1 = (t + take) / sg.len;
          out.push({ path: [[lerp(sg.a[0], sg.b[0], t0), lerp(sg.a[1], sg.b[1], t0)], [lerp(sg.a[0], sg.b[0], t1), lerp(sg.a[1], sg.b[1], t1)]] });
          t += take; phase += take;
        } else {
          var gap = Math.min(step - phase, room);
          t += gap; phase += gap;
        }
        if (phase >= step - 1e-9) phase = 0;
      }
    }
    return out;
  }
  /** planBadgeSprite({n, palette: 'day' | 'night', px}) → cached sprite: a 20 px disc with a keyline and its number. */
  function planBadgeSprite(spec) {
    spec = spec || {};
    var n = Math.max(1, Math.min(99, Math.round(+spec.n) || 1)), pk = spec.palette === 'day' ? 'day' : 'night';
    var px = clamp(finite(+spec.px) ? +spec.px : PLAN_BADGE_PX, 12, 40), dpr = spriteDpr();
    /* the number is canvas text: drawn again once the web fonts are in, so it never keeps a fallback face */
    var key = 'plan|' + pk + '|' + n + '|' + px + '|' + dpr + (S.fontsReady ? '|f' : '');
    if (SPRITES[key]) return SPRITES[key];
    var size = Math.ceil(px * dpr), c = newCanvas(size, size), ink = PLAN_INK[pk];
    if (c) {
      var ctx = c.ctx, cx = size / 2, cy = size / 2, r = size / 2 - 0.5, kw = Math.max(1, 1.5 * dpr);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = cssRgb(ink.key); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r - kw, 0, Math.PI * 2); ctx.fillStyle = cssRgb(ink.fill); ctx.fill();
      ctx.fillStyle = cssRgb(ink.num);
      ctx.font = '600 ' + ((n >= 10 ? 10.5 : 12) * dpr) + 'px ' + FONT_SANS;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), cx, cy + 0.5 * dpr);
    }
    SPRITES[key] = lazyUrl({ id: key, canvas: c ? c.cv : null, width: size, height: size, anchorX: size / 2, anchorY: size / 2, mask: false, px: px, dpr: dpr,
      seq: n, palette: pk }, c ? c.cv : null);
    return SPRITES[key];
  }
  /** The plan's deck layers: the dashed order line under the section's points (with the route), the badges on top. */
  function planLayers(out, top) {
    if (!PLAN.stops.length) return;
    var d = D(), pk = palKey(), ink = PLAN_INK[pk];
    if (!d) return;
    if (PLAN.line && d.PathLayer) {
      var zq = quant(S.zoom, 0.25), dk = PLAN.key + '|' + zq + '|' + (PLAN.start ? '' : branchKey());
      if (PLAN.dashKey !== dk) { PLAN.dashKey = dk; PLAN.dash = planDash(planPath(), zq, PLAN_DASH[0], PLAN_DASH[1], PLAN_DASH_CAP); }
      if (PLAN.dash.length) {
        out.push(new d.PathLayer({
          id: 'plan-order-line', data: PLAN.dash, getPath: function (o) { return o.path; }, getColor: rgba(ink.line, Math.round(255 * PLAN_LINE_A)),
          widthUnits: 'pixels', getWidth: PLAN_LINE_W, capRounded: false, jointRounded: false, updateTriggers: { getColor: pk },
          pickable: false, beforeId: DECK_BEFORE
        }));
      }
    }
    if (!d.IconLayer) return;
    var sprites = PLAN.stops.map(function (s) { return planBadgeSprite({ n: s.seq, palette: pk, px: PLAN_BADGE_PX }); });
    var at = spriteAtlas(sprites);
    if (!at || !at.iconAtlas) return;
    var idOf = {};
    sprites.forEach(function (sp) { idOf[sp.seq] = sp.id; });
    top.push(new d.IconLayer({
      id: 'plan-stops', data: PLAN.stops, iconAtlas: at.iconAtlas, iconMapping: at.iconMapping,
      getIcon: function (s) { return idOf[Math.max(1, Math.min(99, s.seq))]; }, getPosition: function (s) { return s.position; },
      getSize: PLAN_BADGE_PX, sizeUnits: 'pixels', getPixelOffset: function (s) { return s.off; }, billboard: true,
      updateTriggers: { getIcon: pk + PLAN.key + (S.fontsReady ? 'f' : ''), getPixelOffset: PLAN.key }, pickable: false, beforeId: DECK_BEFORE
    }));
  }
  /** The legend group while the plan is drawn (V7_SPEC §7.6). */
  function planLegend() {
    if (!PLAN.stops.length) return null;
    var ink = PLAN_INK[palKey()];
    return { id: 'plan', title: 'Rencana kunjungan', rows: [
      { glyph: 'badge', text: '1', label: 'Nomor menunjukkan urutan kunjungan.' },
      PLAN.line ? { line: ink.line, dash: '4 4', width: PLAN_LINE_W, alpha: PLAN_LINE_A, label: 'Garis urutan kunjungan. Rute jalan dari Google Maps.' } : null
    ].filter(Boolean) };
  }

  /* ---------------------------------------------------- section layers */

  function registeredFor(table, key) {
    var e = table[key];
    if (!e) return EMPTY;
    var own = [], builtin = [], keep = false;
    Object.keys(e).forEach(function (id) {
      var r = e[id];
      if (r.builtin) builtin.push(r); else { own.push(r); if (r.withBuiltin) keep = true; }
    });
    return own.length && !keep ? own : builtin.concat(own);
  }
  function sectionKeys() {
    var keys = ['*', S.section];
    if (S.tab) keys.push(S.section + ':' + S.tab);
    return keys;
  }
  function sectionLayers() {
    var ms = mapState();
    var key = [S.derivedSeq, ms.zoomQ, S.hoverKey, stableKey(S.selection), S.layerSet, isPlan(), S.veil, S.postureKey,
      stableKey(S.layers), S.radiusKm, S.fontsReady, S.sectionVersion, S.view, S.pal, ms.zones ? ms.zones.mode + (ms.zones.km || '') : ''].join('|');
    if (key === S.sectionCache.key) return S.sectionCache;
    var base = [], top = [];
    sectionKeys().forEach(function (k) {
      registeredFor(S.reg.layers, k).forEach(function (r) {
        var res;
        try { res = r.fn(S.derived, ms); } catch (e) { failOnce('layers:' + k, 'registerLayers(' + k + ') failed; its layers are skipped, the rest of the map still draws', e); return; }
        if (!res) return;
        if (Array.isArray(res)) flatten(res, base);
        else { flatten(res.base || res.layers, base); flatten(res.top || res.overlay, top); }
      });
    });
    S.sectionCache = { key: key, base: base, top: top };
    return S.sectionCache;
  }

  /* --------------------------------------------------------------- compose */

  function compose() {
    if (!S.ready || !S.overlay || !D()) return;
    var posture = S.posture || { core: CORE_DEFAULT };
    if (posture.deck === false) { S.composed = []; flush(); return; }
    var core = posture.core || CORE_DEFAULT;
    var out = [], top = [];
    try {
      routeLayers(out, top);                                /* item 36: under the section points, origin on top */
      var planTop = [];
      planLayers(out, planTop);                             /* V8 P3: the plan's order line under the points, its badges last */
      var sec = sectionLayers();
      for (var i = 0; i < sec.base.length; i++) out.push(sec.base[i]);
      if (core.beacon !== false) beaconLayers(out);
      if (core.sites !== false) siteLayers(out, top);      /* pangkalan TNI stay on with the "Tempat penting" switch off */
      if (core.rings !== false && S.layers.rings) ringLabelLayers(top);
      selectionLayer(top);
      for (var j = 0; j < sec.top.length; j++) top.push(sec.top[j]);
      for (var q = 0; q < planTop.length; q++) top.push(planTop[q]);
    } catch (e) {
      warn('compose failed', e);
    }
    S.composed = out.concat(top);
    /* fit the labels before the first frame of the new layers, so a hidden label never flashes */
    if (S.map) layoutLabels(true); else flush();
    queueLegend();
    queueTelemetry();
    ensureTicker();
  }
  var composeQueued = false;
  function scheduleCompose() {
    if (composeQueued) return;
    composeQueued = true;
    raf(function () { composeQueued = false; compose(); });
  }
  function flush() {
    if (!S.overlay) return;
    var arr = [], fx = fxOn();
    for (var i = 0; i < S.composed.length; i++) {
      var it = S.composed[i];
      if (isFn(it)) { try { it = it(); } catch (e) { it = null; } }
      if (!it) continue;
      it = atlasLayer(labelFilter(it));
      if (fx) fxSplit(it, arr); else arr.push(it);
    }
    for (var w = 0; w < WARM.layers.length; w++) arr.push(WARM.layers[w]);
    if (WARM.layers.length && S.composed.length && S.posture && S.posture.deck !== false && !WARM.dropT) {
      /* the first map section: its layers take over the warm programs in this update; the warm layers go a moment later
         (left in the list, they shared their pipelines with the route line, which then drew a stray band at street level) */
      WARM.dropT = setTimeout(function () { WARM.dropT = 0; WARM.layers = []; WARM.done = true; flush(); }, 1000);
    }
    deckLoop(true);
    try { S.overlay.setProps({ layers: arr }); } catch (e) { warn('overlay.setProps failed', e); }
    if (S.posture && S.posture.deck === false) deckRest();
    if (fx && FX.dom) fxRoute();                          /* item 43: the trail's route above the frosted layer follows the line */
  }

  /* ------------------------------------------------- idle warm-up (F8, 16 Oct 2026)
   * The first map section after sign-in (Ringkasan is a page without deck layers) used to block the main thread for
   * 300–370 ms inside the animation frame: deck.gl linking every shader program at once (~140 ms), PNG encoding of the
   * sprite atlases (~60 ms), the badge and glyph atlases (~50 ms) and the text font atlases. Here that work runs once,
   * piece by piece, in idle time on whatever page staff look at first: the atlases are built, and one tiny INVISIBLE
   * layer of each deck type the sections use (scatterplot, icon, path, polygon, text with a background, at the font
   * settings of the map labels) is handed to deck.gl, so its programs and font atlases exist (and stay cached: the warm
   * layers stay in the layer list, never drawn) before the first section mount. Never while the camera, the focus veil
   * or a route animates; an office laptop spreads it over a few idle slots. */
  var WARM = { step: 0, layers: [], done: false, armed: false, timer: 0, wait: 0 };
  var WARM_TEXT = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~·’‘“”±…–—×÷°²≈≥≤−€';
  function idleCall(fn, timeout) {
    if (isFn(W.requestIdleCallback)) { try { return W.requestIdleCallback(fn, { timeout: timeout || 3000 }); } catch (e) { /* timer */ } }
    return setTimeout(function () { fn(null); }, 250);
  }
  function warmStart() {
    if (WARM.done || WARM.armed || !S.ready || !S.overlay || !D()) return;
    WARM.armed = true;
    /* after the sign-in flight and the first page's entrance */
    WARM.timer = setTimeout(function () { WARM.timer = 0; idleCall(warmStep); }, 1200);
  }
  function warmBusy() {
    return !!((S.flight && S.map && S.map.isMoving && S.map.isMoving()) || FX.raf || RT.raf || RT.early || DOC.hidden);
  }
  function warmStep(deadline) {
    if (WARM.done || !S.overlay) return;
    /* only while the map is hidden behind a page (Ringkasan): a map section compiles its own programs as it mounts */
    if (S.posture && S.posture.deck !== false) { if (!WARM.layers.length) WARM.done = true; else idleCall(warmStep); return; }
    if (warmBusy() || (deadline && isFn(deadline.timeRemaining) && !deadline.didTimeout && deadline.timeRemaining() < 8)) { idleCall(warmStep); return; }
    var d = D(), k = WARM.step, pt = [{ p: branchLL(), t: WARM_TEXT }], L = null, base = { data: pt, visible: false, pickable: false, beforeId: DECK_BEFORE };
    var pos = function (o) { return o.p; };
    try {
      switch (k) {
        case 0: buildAtlas(); break;
        case 1: badgeAtlas(badgeTheme()); break;
        case 2: badgeAtlas(badgeTheme() === 'day' ? 'night' : 'day'); break;
        case 3: L = new d.ScatterplotLayer(Object.assign({ id: 'warm-scatter', getPosition: pos, radiusUnits: 'pixels', getRadius: 4, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 1 }, base)); break;
        case 4: L = new d.IconLayer(Object.assign({ id: 'warm-icon', getPosition: pos, iconAtlas: buildAtlas().iconAtlas, iconMapping: buildAtlas().iconMapping, getIcon: function () { return 'circle'; }, sizeUnits: 'pixels', getSize: 12 }, base)); break;
        case 5: L = new d.PathLayer(Object.assign({ id: 'warm-path', getPath: function (o) { return [o.p, [o.p[0] + 0.001, o.p[1]]]; }, widthUnits: 'pixels', getWidth: 2 }, base)); break;
        case 6: L = d.PolygonLayer ? new d.PolygonLayer(Object.assign({ id: 'warm-polygon', getPolygon: function (o) { return [o.p, [o.p[0] + 0.001, o.p[1]], [o.p[0], o.p[1] + 0.001]]; }, filled: true, stroked: true, getFillColor: [0, 0, 0, 0], lineWidthUnits: 'pixels', getLineWidth: 1 }, base)) : null; break;
        case 7: case 8:
          /* never a font atlas of the fallback font; fonts that never come (offline) skip the text steps */
          if (!S.fontsReady) { if (WARM.wait++ < 30) { idleCall(warmStep); return; } WARM.step = 9; idleCall(warmStep); return; }
          L = new d.TextLayer(Object.assign({ id: 'warm-text-' + (k === 7 ? 500 : 600), getPosition: pos, getText: function (o) { return o.t; }, getSize: 12, sizeUnits: 'pixels',
            fontFamily: FONT_SANS, fontWeight: k === 7 ? 500 : 600, characterSet: WARM_TEXT, fontSettings: { sdf: true }, outlineWidth: 2, background: true,
            backgroundPadding: [4, 2] }, base));
          break;
        default:
          WARM.done = true;
          if (S.posture && S.posture.deck === false) deckRest();
          return;
      }
    } catch (e) { warn('warm-up step ' + k, e); }
    WARM.step++;
    if (L) { WARM.layers.push(L); flush(); }
    idleCall(warmStep);
  }
  /* item 38 / F15: on a page without deck layers (Ringkasan: the map is hidden) deck.gl's own animation loop stops once
     its layer list is up to date; any flush with the map in use starts it again (layer changes are applied in its frames). */
  function deckLoop(run) {
    var dk = S.overlay && S.overlay._deck, al = dk && dk.animationLoop;
    if (!al || !isFn(al.start) || !isFn(al.stop)) return;
    clearTimeout(S.loopT); S.loopT = 0;
    try { if (run && !al._running) al.start(); } catch (e) { /* it keeps its state */ }
  }
  function deckRest() {
    clearTimeout(S.loopT);
    S.loopT = setTimeout(function () {
      S.loopT = 0;
      if (!S.posture || S.posture.deck !== false || (WARM.armed && !WARM.done)) return;
      var dk = S.overlay && S.overlay._deck, al = dk && dk.animationLoop, lm = dk && dk.layerManager;
      if (!al || !isFn(al.stop) || !al._running) return;
      try {
        if (lm && (lm._nextLayers != null || (isFn(lm.needsUpdate) && lm.needsUpdate()))) { deckRest(); return; }
        al.stop();
      } catch (e) { /* it keeps running */ }
    }, 900);
  }
  /* School and other symbol icons on the first frame (V3_REPORT §4.6): a section that turns MCD.map.spriteAtlas()'s
     canvas into a data URL makes deck.gl decode an image first, so the icons came a moment after the map. The atlas
     canvases are known by their URL here: the layer gets the canvas itself and deck.gl draws it at once. */
  var ATLAS_URL = typeof Map === 'function' ? new Map() : null;
  var ATLAS_MEMO = typeof WeakMap === 'function' ? new WeakMap() : null;
  function atlasLayer(L) {
    if (!L || !ATLAS_URL || !ATLAS_URL.size || !L.props || typeof L.props.iconAtlas !== 'string' || L.props.iconAtlas.indexOf('data:') !== 0) return L;
    var cv = ATLAS_URL.get(L.props.iconAtlas);
    if (!cv) return L;
    var m = ATLAS_MEMO ? ATLAS_MEMO.get(L) : null;
    if (m) return m;
    try { m = L.clone({ iconAtlas: cv }); } catch (e) { return L; }
    if (ATLAS_MEMO) ATLAS_MEMO.set(L, m);
    return m;
  }

  /* ---------------------------------------------------------------- ticker */

  function tickerAllowed() {
    if (reduced() || DOC.hidden) return false;
    return !!(S.posture && S.posture.ticker);
  }
  function tickerWanted() {
    if (!S.ready || DOC.hidden) return false;
    if (!tickerAllowed()) return false;
    var core = (S.posture && S.posture.core) || CORE_DEFAULT;
    return S.posture.deck !== false && (core.beacon !== false || !!S.selection);
  }
  function ensureTicker() {
    if (S.ticker.raf || !tickerWanted()) return;
    S.ticker.raf = raf(tick);
  }
  function tick(ts) {
    S.ticker.raf = 0;
    if (!tickerWanted()) return;
    var t = ts || now();
    if (t - S.ticker.last >= TICK_MS - 1) {
      S.ticker.last = t;
      S.time = t;
      if (tickerAllowed()) flush();
    }
    S.ticker.raf = raf(tick);
  }

  /* ------------------------------------------------------------- picking */

  function layerKind(id) {
    if (!id) return null;
    if (id.indexOf('sites-') === 0) return 'site';
    if (id === 'ring-labels') return 'ring';
    return null;
  }
  function resolvePick(info) {
    if (!info || !info.picked || !info.layer) return null;
    /* a part of a layer under the focus (fxClone): its index counts in the full data again */
    var fxIdx = info.layer.props && info.layer.props.mcdFxIdx;
    if (fxIdx && info.index != null && fxIdx[info.index] != null) info = Object.assign({}, info, { index: fxIdx[info.index] });
    var lid = info.layer.id, o = info.object, meta = info.layer.props && info.layer.props.mcd;
    if (meta && isFn(meta.pick)) { try { var r = meta.pick(o, info); if (r) return Object.assign({ layerId: lid, object: o }, r); } catch (e) { /* ignore */ } }
    var kind = (meta && meta.kind) || layerKind(lid);
    if (!kind) {
      var reg = registeredTooltip(lid);
      if (reg) kind = reg.kind || lid;
    }
    if (!kind || o == null) return null;
    var id;
    if (meta && isFn(meta.id)) id = meta.id(o);
    else if (kind === 'ring') id = o.km;
    else if (o.o && o.o.id != null) id = o.o.id;
    else id = o.id;
    return { kind: kind, id: id, object: o.o || o, layerId: lid, coordinate: info.coordinate, x: info.x, y: info.y, raw: o };
  }
  function registeredTooltip(layerId) {
    for (var i = 0; i < S.reg.tooltips.length; i++) {
      var t = S.reg.tooltips[i];
      if (layerId.indexOf(t.prefix) === 0) return t;
    }
    return null;
  }

  /**
   * chipYield(info) → info: the kecamatan label chips are the top pickable layer (territory.js, fix 16 Oct 2026), and at
   * the starting zoom one chip hides about 20 SMA symbols. A point whose own marker is drawn ABOVE the chip (a status or
   * selection ring: a stroked, non-pickable layer after the chip that holds the same datum) shows through it, and staff
   * click that ring for the point: the click and the hover card go to the point (v5 MAP finding: the red ring of SMAS
   * ANGKASA 1 over "Makasar · 9 SMA" opened the kecamatan). A point hidden under the chip leaves the click to the chip.
   * One extra pick, only over a chip and only while such rings are drawn.
   */
  function chipYield(info) {
    var L0 = info && info.picked && info.layer, ov = S.overlay;
    if (!L0 || !ov || !isFn(ov.pickObject) || !finite(info.x) || !finite(info.y)) return info;
    var lid = String(L0.id || ''), meta = L0.props && L0.props.mcd;
    if (!/-labels(-rank)?(-bars[1-3])?(-chip)?$/.test(lid) || !meta || !isKecKind(meta.kind)) return info;
    var at = -1, above = [], ids = [], i, L, p;
    for (i = 0; i < S.composed.length; i++) {
      L = S.composed[i];
      if (!L || isFn(L) || !L.props) continue;
      p = L.props;
      if (L.id === lid) { at = i; continue; }
      if (at < 0) {
        /* candidates: pickable point layers below the chip (not the territory's own layers, not text) */
        var D0 = D();
        if (p.pickable && p.mcd !== meta && !(D0 && D0.TextLayer && L instanceof D0.TextLayer)) ids.push(L.id);
      } else if (!p.pickable && p.stroked && Array.isArray(p.data) && p.data.length && p.radiusUnits === 'pixels') above.push(L);
    }
    if (!above.length || !ids.length) return info;
    var r = null;
    try { r = ov.pickObject({ x: info.x, y: info.y, radius: 10, layerIds: ids }); } catch (e) { r = null; }
    if (!r || !r.picked || r.object == null) return info;
    for (i = 0; i < above.length; i++) {
      p = above[i].props;
      var k = p.data.indexOf(r.object);
      if (k < 0) continue;
      var acc0 = { index: k, data: p.data, target: [] }, pos = acc(p.getPosition, r.object, k, acc0), rad = +acc(p.getRadius, r.object, k, acc0);
      if (!pos || !finite(rad)) continue;
      var pt;
      try { pt = S.map.project(pos); } catch (e) { continue; }
      var lw = +acc(p.getLineWidth, r.object, k, acc0) || 1, dx = pt.x - info.x, dy = pt.y - info.y;
      var reach = rad * (+p.radiusScale || 1) + lw / 2 + 2;
      if (dx * dx + dy * dy <= reach * reach) return r;
    }
    return info;
  }
  function pickKey(p) { return p ? p.layerId + ':' + p.kind + ':' + p.id : ''; }
  function onDeckHover(info) {
    /* item 38: outside the focused kecamatan nothing answers the pointer */
    var outside = focusOutsideClick(info);
    if (!outside) info = chipYield(info);
    var pick = outside ? null : resolvePick(info);
    var cv = S.map && S.map.getCanvas ? S.map.getCanvas() : null;
    if (cv) cv.style.cursor = pick ? 'pointer' : '';
    if (pickKey(pick) !== pickKey(S.hoverPick)) {
      S.hoverPick = pick;
      emit('hover', pick);
      var sid = pick && pick.kind === 'site' ? pick.id : null;
      if (sid !== S.hoverSiteId) { S.hoverSiteId = sid; scheduleCompose(); }
      hideTip();
      if (pick) {
        S.tipTimer = setTimeout(function () {
          if (S.hoverPick !== pick) return;
          /* item 43: no hover card for the item a callout or card already shows */
          var model = tipSuppressed(pick) ? null : tooltipFor(pick, info);
          if (model) showTip(model, pick.x, pick.y);
        }, 60);
      }
    } else if (pick && S.hoverPick) {
      S.hoverPick.x = info.x; S.hoverPick.y = info.y;
      if (S.dom.tip && S.dom.tip.style.display !== 'none') positionTip(info.x, info.y);
    }
  }

  function onDeckClick(info) {
    /* item 38: a click outside the focused kecamatan closes the focus (and whatever an empty click closes) */
    if (focusOutsideClick(info)) { fxClear('outside'); emit('pick', { kind: null, focusExit: true }); return; }
    var pick = resolvePick(chipYield(info));
    if (!pick) { emit('pick', { kind: null }); return; }
    if (pick.kind === 'ring') { ringClick(pick.id); return; }
    emit('pick', pick);
  }

  function ringClick(km) {
    var p = S.posture || {};
    emit('ring', { km: km, set: S.ringSetName });
    if (isFn(p.onRingClick)) { try { p.onRingClick(km); } catch (e) { warn('onRingClick', e); } return; }
    var next = S.radiusKm === km ? null : km;
    if (MCD.state && isFn(MCD.state.set)) {
      try { MCD.state.set({ filters: { radiusKm: next } }, { source: 'map', history: 'replace' }); return; } catch (e) { warn('state.set radiusKm', e); }
    }
    S.radiusKm = next; updateRings(); updateFocusMask(); compose();
  }

  /* ---------------------------------------------------------------- tooltip */

  function h(tag, cls, text) {
    var e = DOC.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function ensureTip() {
    if (S.dom.tip) return S.dom.tip;
    var root = DOC.getElementById('overlay-root') || DOC.body;
    var t = h('div', 'tip mcd-map-tip');
    t.setAttribute('role', 'tooltip');
    t.style.display = 'none';
    root.appendChild(t);
    S.dom.tip = t;
    return t;
  }
  /* model = {eyebrow, title, lines:[{text, kind:'mono'|'meta'|'body'|'clamp', glyph, rgb, glyphs:[{glyph, rgb, text}]}]} */
  function showTip(model, x, y) {
    var t = ensureTip();
    while (t.firstChild) t.removeChild(t.firstChild);
    if (model.eyebrow) t.appendChild(h('span', 'tip__eyebrow t-eyebrow', model.eyebrow));
    if (model.title) t.appendChild(h('span', 'tip__title', model.title));
    (model.lines || []).forEach(function (ln) {
      if (!ln) return;
      var kind = ln.kind || 'mono';
      var row = h('div', kind === 'meta' ? 'tip__meta' : 'tip__row' + (kind === 'mono' ? '' : ' tip__row--' + kind));
      if (ln.glyphs) {
        ln.glyphs.forEach(function (g) {
          var cell = h('span', 'tip__pair');
          cell.appendChild(glyphSVG(g.glyph, g.rgb, 9));
          cell.appendChild(h('span', null, g.text));
          row.appendChild(cell);
        });
      } else {
        if (ln.glyph) row.appendChild(glyphSVG(ln.glyph, ln.rgb, 9));
        row.appendChild(h('span', null, ln.text));
      }
      t.appendChild(row);
    });
    t.style.display = 'block';
    positionTip(x, y);
  }
  function positionTip(x, y) {
    var t = S.dom.tip;
    if (!t || !S.map) return;
    var rect = S.map.getContainer().getBoundingClientRect();
    var vx = rect.left + x, vy = rect.top + y, w = t.offsetWidth, hh = t.offsetHeight;
    var vw = W.innerWidth, vh = W.innerHeight, off = 14;
    var left = vx + off + w > vw - 8 ? vx - off - w : vx + off;
    var top = vy + off + hh > vh - 8 ? vy - off - hh : vy + off;
    /* item 43: the callout is an occluder for the hover card: another corner of the pointer, or no card at all */
    var co = calloutRect();
    if (co) {
      var spots = [[left, top], [vx + off, vy + off], [vx - off - w, vy + off], [vx + off, vy - off - hh], [vx - off - w, vy - off - hh]], ok = null;
      for (var i = 0; i < spots.length && !ok; i++) {
        var l = Math.max(8, spots[i][0]), tp = Math.max(8, spots[i][1]);
        if (l + w > vw - 4 || tp + hh > vh - 4) continue;
        if (!hit({ left: l, top: tp, right: l + w, bottom: tp + hh }, co)) ok = [l, tp];
      }
      if (!ok) { t.style.display = 'none'; return; }
      left = ok[0]; top = ok[1];
    }
    t.style.left = Math.max(8, left) + 'px';
    t.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() {
    clearTimeout(S.tipTimer);
    if (S.dom.tip) S.dom.tip.style.display = 'none';
  }

  function tooltipFor(pick, info) {
    var meta = info && info.layer && info.layer.props && info.layer.props.mcd;
    if (meta && isFn(meta.tooltip)) { try { return meta.tooltip(pick.raw, info); } catch (e) { return null; } }
    var reg = registeredTooltip(pick.layerId);
    if (reg) { try { return reg.fn(pick.raw, info); } catch (e) { return null; } }
    switch (pick.kind) {
      case 'site': return siteTip(pick.raw);
      case 'ring': return ringTip(pick.raw);
      default: return null;
    }
  }

  function siteTip(s) {
    if (!s) return null;
    var src = s.src || {}, lines = [];
    lines.push({ kind: 'body', text: CONF_LABEL[s.conf] || s.conf });
    if (s.far || s.distKm > 0.05) lines.push({ text: fmtKm(s.distKm) + ' dari cabang' });
    var host = hostOf(src.source);
    if (host) lines.push({ kind: 'meta', text: 'Sumber ' + host });
    if (s.kind === 'hq_complex' || s.id === 'mabesal' || s.id === 'mabesau') lines.push({ kind: 'clamp', text: 'Garis OpenStreetMap ini juga mencakup sebagian perumahan warga di utara dan selatan kompleks.' });
    lines.push({ kind: 'meta', text: 'Klik untuk melihat detail dan tautan Google Maps' });
    /* pangkalan TNI (item 34): "TNI AL · Markas", "TNI AU · Perumahan" */
    var eyebrow = s.pk ? s.pk.label : (SITE_KIND_LABEL[s.kind] || s.kind || 'Tempat').toUpperCase() + (s.mono ? ' · ' + s.mono : '');
    return { eyebrow: eyebrow, title: s.home ? BRANCH_FULL : (src.name || s.label), lines: lines };
  }
  function ringTip(r) {
    var origin = r.origin === 'mabes' ? 'dari Mabes TNI' : 'dari cabang';
    var p = S.posture || {};
    var hint = isFn(p.onRingClick) ? (p.ringHint || 'Klik untuk memilih jarak ini') :
      (r.active ? 'Klik untuk menampilkan semua jarak' : 'Klik untuk menampilkan ' + r.km + ' km dari cabang saja');
    return { eyebrow: 'Lingkar jarak', title: r.km + ' km ' + origin, lines: [{ kind: 'body', text: hint }] };
  }
  /* ------------------------------------------------------------- markers */
  /*
   * Map labels without collisions (15 Oct 2026). One pass, layoutLabels(), fits every label on the
   * map in this priority order and hides a lower-priority label when nothing fits:
   *   0 our branch callout   ("Mandiri branch · Our branch · Jakarta Cilangkap", HTML glass plate)
   *   1 the Mabes TNI name   ("Mabes TNI · Cilangkap", HTML glass plate on the area)
   *   2 kecamatan labels     (deck TextLayer plates registered through MCD.territory.layers)
   *   2b counts in bubbles   (the merchant cluster counts: never hidden; everything below keeps clear of them)
   *   3 other callouts       (tier-1 places: Mabes AL / AU, TNI housing; from zoom 14 only; the BNI branch only
   *                           on the Merchant map) · below zoom 14 they are badges / icons named on hover
   *   4 place names          ('sites-labels', by tier)
   *   5 other section text   (any other deck TextLayer)
   *   6 ring labels and the small bank monograms on other banks' icons
   * Callouts try a vertical leader first, then angled (offset) leaders to the sides and below, so
   * the branch and Mabes plates move clear of each other instead of stacking. Deck labels are
   * measured in screen pixels (canvas text metrics, the layer's own size, anchor, offset and
   * padding) and the hidden ones are filtered out of a memoised clone of their layer at flush().
   * No deck CollisionFilterExtension: in deck.gl 9.0.41 it hides every label that has a background.
   * Labels under a panel, the legend or the map controls are hidden as well.
   */

  /* Touch "ghost" clicks (phones, 17 Oct 2026). After a tap the browser sends a compatibility click to whatever lies under
     the finger at THAT moment. The tap's own pick (a kecamatan) re-lays the labels at once, and a plate that was hidden
     there (.mk.is-hidden has no pointer events) can be shown under the finger: the click then picked KCP Cilangkap, which
     ended the kecamatan focus a few ms after it began (Sekolah › Makasar on a 390 px phone). A click on a plate, the
     Mabes TNI name or "Lihat seluruh rute" counts only when the press that made it began on that element; mouse clicks
     (target = where the button went down and came up) and clicks without a recent press are never ignored. */
  var PRESS = { t: -1e9, el: null, type: '' };
  function notePress(e) { PRESS = { t: now(), el: e ? e.target : null, type: e && e.pointerType ? String(e.pointerType) : '' }; }
  function ghostClick(el) {
    if (!el || !PRESS.el || !PRESS.type || PRESS.type === 'mouse' || now() - PRESS.t > 1000) return false;
    try { return !el.contains(PRESS.el); } catch (e) { return false; }
  }
  function buildMarkers() {
    if (!S.map || !W.maplibregl || S.markers.built) return;
    var ml = W.maplibregl;
    var root = h('div', 'mk mk-mabes');
    root.setAttribute('aria-hidden', 'true');
    var lead = h('div', 'mk-leader'), dot = h('div', 'mk-dot');
    var card = h('div', 'mk-plate mk-mabes__plate');
    card.appendChild(h('div', 'mk-mabes__name', 'Mabes TNI'));
    card.title = 'Mabes TNI Cilangkap · 272,6 ha';
    /* a click opens the Mabes TNI details (with "Buka di Google Maps", item 22) */
    card.addEventListener('click', function (ev) { ev.stopPropagation(); if (ghostClick(card)) return; emit('pick', { kind: 'mabes', id: 'mabes', layerId: 'mabes-plate' }); });
    root.appendChild(lead); root.appendChild(dot); root.appendChild(card);
    var at = (cfg().map && cfg().map.labelAnchor) || MABES_LABEL_AT;
    try {
      S.markers.mabes = new ml.Marker({ element: root, anchor: 'center' }).setLngLat(at).addTo(S.map);
      S.markers.mabesPart = { root: root, card: card, lead: lead, dot: dot, at: at, w: 0, h: 0, spot: '' };
    } catch (e) { warn('mabes label', e); }
    S.markers.built = true;
    buildPlates();
  }
  /* Tier-1 sites as HTML glass plates with a leader line (§E.5.6) */
  function buildPlates() {
    if (!S.map || !W.maplibregl) return;
    S.markers.plates.forEach(function (pl) { try { pl.marker.remove(); } catch (e) { /* ignore */ } });
    S.markers.plates = [];
    var tier1 = S.sites.filter(function (s) { return s.tier === 1; });
    tier1.sort(function (a, b) { return (b.home ? 1 : 0) - (a.home ? 1 : 0) || a.distKm - b.distKm; });
    tier1.forEach(function (s, i) {
      var root = h('div', 'mk mk-site' + (s.home ? ' is-home' : '') + (s.conf === 'low' ? ' is-approx' : ''));
      var card = h('div', 'mk-plate');
      if (!s.home) card.appendChild(h('span', 'mk-site__kind', s.pk ? s.pk.label : (SITE_KIND_LABEL[s.kind] || '')));
      var raw = s.src || {};
      var name = h('span', 'mk-site__name', s.home ? BRANCH_SHORT : String(raw.label || raw.name || s.label).replace(/\s*\(B:[^)]*\)\s*/g, ' ').replace(/^≈\s*/, '').trim());
      if (s.home) card.title = BRANCH_FULL;
      if (s.conf === 'low') name.title = CONF_LABEL.low;
      card.appendChild(name);
      var lead = h('div', 'mk-leader');
      root.appendChild(lead); root.appendChild(card);
      card.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (ghostClick(card)) return;
        emit('pick', { kind: 'site', id: s.id, object: s.src, layerId: 'site-plate' });
      });
      card.addEventListener('mouseenter', function () {
        if (ghostClick(card)) return;                       /* the compatibility mouseover of a tap that began elsewhere */
        var r = card.getBoundingClientRect(), mr = S.map.getContainer().getBoundingClientRect();
        var model = siteTip(s);
        if (model) showTip(model, r.right - mr.left, r.top - mr.top);
      });
      card.addEventListener('mouseleave', hideTip);
      var marker;
      try { marker = new W.maplibregl.Marker({ element: root, anchor: 'center' }).setLngLat(s.position).addTo(S.map); }
      catch (e) { warn('plate', e); return; }
      S.markers.plates.push({ site: s, marker: marker, el: root, lead: lead, card: card, w: 0, h: 0, prio: i, spot: '' });
    });
    queuePlates();
  }
  function queuePlates() {
    if (S.plateQueued) return;
    S.plateQueued = true;
    raf(function () { S.plateQueued = false; layoutLabels(); });
  }
  /* Panels that hide labels. Read at most every 300 ms while the map moves (they do not move with it). */
  var OCC = { t: -1e9, list: [] };
  function occluderRects(fresh) {
    if (!S.occluderSel) return [];
    var t = now();
    if (!fresh && t - OCC.t < 300) return OCC.list;
    var out = [], list;
    try { list = DOC.querySelectorAll(S.occluderSel); } catch (e) { return out; }
    for (var i = 0; i < list.length; i++) {
      if (list[i].classList && list[i].classList.contains('mk')) continue;
      var r = list[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    OCC.t = t; OCC.list = out;
    return out;
  }
  function invalidateOccluders() { OCC.t = -1e9; }
  function hit(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
  function resetPlateSizes() {
    S.markers.plates.forEach(function (p) { p.w = 0; });
    if (S.markers.mabesPart) S.markers.mabesPart.w = 0;
  }
  function clashes(r, list) { for (var i = 0; i < list.length; i++) if (hit(r, list[i])) return true; return false; }

  /** Candidate centres [dx, dy] (px from the point) for a w × hh callout plate, nearest first. */
  function calloutSpots(w, hh, own, home) {
    var hw = w / 2, h2 = hh / 2, slide = Math.max(0, hw - 14), out = [];
    if (own) out.push([0, -h2 - 1, 'own']);                       /* the Mabes name on its area, no leader */
    if (home) out.push([0, -36 - h2], [slide, -36 - h2], [-slide, -36 - h2], [hw + 26, -h2 - 26], [-hw - 26, -h2 - 26]);   /* our branch: a longer leader first */
    out.push([0, -22 - h2], [slide, -22 - h2], [-slide, -22 - h2]);
    out.push([hw + 16, -h2 - 16], [-hw - 16, -h2 - 16]);          /* angled leaders, up-right / up-left */
    out.push([hw + 20, 0], [-hw - 20, 0]);                        /* to the side */
    out.push([0, -44 - h2], [slide, -44 - h2], [-slide, -44 - h2]);
    out.push([hw + 16, h2 + 16], [-hw - 16, h2 + 16], [0, 24 + h2]); /* below */
    out.push([hw + 34, -h2 - 40], [-hw - 34, -h2 - 40], [0, -70 - h2], [slide, -70 - h2], [-slide, -70 - h2]);
    out.push([hw + 38, h2 + 36], [-hw - 38, h2 + 36], [0, 52 + h2]);
    /* our branch: further rings of spots, so the pin finds a gap between the kecamatan labels around it */
    if (home) [60, 90, 120, 160, 200].forEach(function (r) {
      for (var a = 0; a < 360; a += 30) {
        var rad = (a - 90) * Math.PI / 180, cx = Math.cos(rad), cy = Math.sin(rad);
        out.push([Math.round(cx * (r + hw * Math.abs(cx))), Math.round(cy * (r + h2 * Math.abs(cy)))]);
      }
    });
    return out;
  }
  /** Nearest point of the plate rectangle to the anchor: where the leader meets the plate. */
  function attachPoint(cx, cy, hw, h2) {
    return [clamp(0, cx - hw, cx + hw), clamp(0, cy - h2, cy + h2)];
  }
  function leaderRects(x, y, ax, ay, r0) {
    var len = Math.sqrt(ax * ax + ay * ay), out = [];
    if (len <= r0 + 2) return out;
    for (var d = r0; d < len; d += 7) {
      var px = x + ax * d / len, py = y + ay * d / len;
      out.push({ left: px - 2, right: px + 2, top: py - 2, bottom: py + 2 });
    }
    return out;
  }
  /**
   * Place one callout. c = {x, y (viewport px of the point), w, h, own, r0}. Returns the chosen spot
   * {dx, dy (plate top-left from the point), lead: [ax, ay] | null} or null when nothing is free.
   * soft: boxes the callout would rather not cover (the kecamatan labels): the nearest spots that
   * keep them visible are tried first; if none is free, the callout wins and those labels hide.
   */
  function placeCallout(c, placed, avoid, occ, view, soft) {
    var spots = calloutSpots(c.w, c.h, c.own, c.home), hw = c.w / 2, h2 = c.h / 2;
    var order = [];
    if (soft && soft.length) for (var s0 = 0; s0 < Math.min(spots.length, 12); s0++) order.push([s0, true, false]);
    for (var s1 = 0; s1 < spots.length; s1++) order.push([s1, false, false]);
    /* our branch, last resort: a leader that crosses a label (the pin itself still never covers one) */
    if (c.home) for (var s2 = 0; s2 < spots.length; s2++) order.push([s2, false, true]);
    for (var n = 0; n < order.length; n++) {
      var i = order[n][0], useSoft = order[n][1], leadFree = order[n][2];
      var cx = spots[i][0], cy = spots[i][1], own = spots[i][2] === 'own';
      var rect = { left: c.x + cx - hw - 3, right: c.x + cx + hw + 3, top: c.y + cy - h2 - 3, bottom: c.y + cy + h2 + 3 };
      if (rect.top < view.top || rect.left < view.left || rect.right > view.right || rect.bottom > view.bottom) continue;
      if (clashes(rect, placed) || clashes(rect, avoid) || clashes(rect, occ)) continue;
      if (useSoft && clashes(rect, soft)) continue;
      var ap = own ? null : attachPoint(cx, cy, hw, h2);
      var lead = ap ? leaderRects(c.x, c.y, ap[0], ap[1], c.r0) : [];
      /* boxes this callout never covers, not even with its leader (the KCP plate and the cluster counts, V3_REPORT §4.6) */
      if (c.hard && c.hard.length && (clashes(rect, c.hard) || clashes2(lead, c.hard))) continue;
      /* our branch's leader may cross a kecamatan label (a thin gold line); other leaders may not */
      if (lead.length && !leadFree && (clashes2(lead, placed))) continue;
      if (useSoft && lead.length && clashes2(lead, soft)) continue;
      placed.push(rect);
      for (var k = 0; k < lead.length; k++) placed.push(lead[k]);
      return { dx: cx - hw, dy: cy - h2, lead: ap && Math.sqrt(ap[0] * ap[0] + ap[1] * ap[1]) > c.r0 + 2 ? ap : null, key: i };
    }
    return null;
  }
  function clashes2(list, placed) { for (var i = 0; i < list.length; i++) if (clashes(list[i], placed)) return true; return false; }
  function writeCallout(part, spot, r0) {
    var card = part.card, lead = part.lead;
    var tf = 'translate(' + Math.round(spot.dx) + 'px,' + Math.round(spot.dy) + 'px)';
    if (card.style.transform !== tf) card.style.transform = tf;
    if (spot.lead) {
      var ax = spot.lead[0], ay = spot.lead[1], len = Math.sqrt(ax * ax + ay * ay) - r0;
      var ang = Math.atan2(ay, ax), sx = Math.cos(ang) * r0, sy = Math.sin(ang) * r0;
      lead.style.display = 'block';
      lead.style.width = Math.max(0, Math.round(len)) + 'px';
      lead.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) rotate(' + ang.toFixed(4) + 'rad)';
    } else lead.style.display = 'none';
  }
  function showPart(el, on) {
    el.style.visibility = on ? 'visible' : 'hidden';
    el.classList.toggle('is-hidden', !on);
  }

  /* -- deck text labels: screen boxes and filtering -- */

  var LBL = { hide: {}, hideObj: {}, sig: {}, memo: typeof WeakMap === 'function' ? new WeakMap() : null, ctx: null, widths: {}, n: 0 };
  function measureText(font, text) {
    var k = font + '|' + text, w = LBL.widths[k];
    if (w != null) return w;
    if (!LBL.ctx) { try { LBL.ctx = DOC.createElement('canvas').getContext('2d'); } catch (e) { LBL.ctx = null; } }
    if (LBL.ctx) { LBL.ctx.font = font; w = LBL.ctx.measureText(text).width; }
    else w = text.length * 7;
    if (++LBL.n > 4000) { LBL.widths = {}; LBL.n = 0; }
    LBL.widths[k] = w;
    return w;
  }
  function acc(v, d, i, info) {
    if (!isFn(v)) return v;
    info.index = i;
    try { return v(d, info); } catch (e) { return null; }
  }
  /** A count that belongs to a drawn bubble (the merchant cluster counts, 'merchants-cluster-n'; or any TextLayer with
      props.mcd.keep): it is never hidden, because the bubble stays without it ("empty white circles"). */
  function keepsLabels(layer) {
    var id = layer.id || '', p = layer.props || {};
    return !!(p.mcd && p.mcd.keep === true) || /-cluster-n$/.test(id);
  }
  /** A kecamatan chip layer (territory.js: a TextLayer with a background whose data are kecamatan labels). */
  function kecChipLayer(layer) {
    var p = layer && layer.props, data = p && p.data;
    return !!(p && p.background && Array.isArray(data) && data.length && data[0] && data[0].kec != null);
  }
  /**
   * chipKeepOut(mr) → [{left, top, right, bottom}] client px: what a kecamatan chip never covers (v5 MAP finding: the
   * selected merchant and the end of its route sat half under "Pasar Rebo · 548"; the chips are drawn on the canvas, so a
   * DOM check cannot see it). The selected point (±12 px), the route's destination (±14 px) and its line within 72 px of
   * it. A deck chip on one of them is hidden (the callout and the card name the place); the focused kecamatan's own chip
   * takes another spot inside it, or fades.
   */
  function chipKeepOut(mr) {
    var out = [];
    if (!S.map || !mr) return out;
    var at = function (ll) { try { var p = S.map.project(ll); return p && finite(p.x) && finite(p.y) ? p : null; } catch (e) { return null; } };
    var box = function (p, r) { if (p) out.push({ left: mr.left + p.x - r, top: mr.top + p.y - r, right: mr.left + p.x + r, bottom: mr.top + p.y + r }); };
    var sel = S.selection;
    if (sel && sel.kind && !isKecKind(sel.kind) && !selectionKec(sel)) { var sp = positionOf(sel); if (sp) box(at(sp), 12); }
    if (RT.dest && routeShown()) {
      var dp = at(RT.dest);
      box(dp, 14);
      if (dp && RT.route) { var near = routeNearPx(dp, mr, 72); for (var i = 0; i < near.length; i++) out.push(near[i]); }
    }
    return out;
  }
  function labelKind(layer) {
    var id = layer.id || '', p = layer.props || {}, data = p.data;
    if (p.mcdFollow) return -1;                    /* a companion layer (the kecamatan band dots) follows its leader */
    if (keepsLabels(layer)) return 7;
    if (id === 'ring-labels' || id === 'sites-mono') return 6;
    if (id === 'sites-labels') return 4;
    /* the muted chips of the outer ring (item 30) rank with the other section text, below the place names */
    if (p.background && Array.isArray(data) && data.length && data[0] && data[0].kec != null) return data[0].ring ? 5 : 2;
    return 5;
  }
  /** Layers that follow a leader label (props.mcdFollow = the leader's id): any deck layer with array data. */
  function followerLayersNow() {
    var out = [];
    for (var i = 0; i < S.composed.length; i++) {
      var it = S.composed[i];
      if (it && !isFn(it) && it.props && it.props.mcdFollow && Array.isArray(it.props.data)) out.push(it);
    }
    return out;
  }
  function textLayersNow() {
    var d = D(), out = [];
    if (!d || !d.TextLayer) return out;
    for (var i = 0; i < S.composed.length; i++) {
      var it = S.composed[i];
      if (it && !isFn(it) && it instanceof d.TextLayer && Array.isArray(it.props.data)) out.push(it);
    }
    return out;
  }
  function datumKey(text, pos) {
    return text + '@' + (pos ? (+pos[0]).toFixed(5) + ',' + (+pos[1]).toFixed(5) : '');
  }
  /** Screen boxes of a TextLayer's labels: [{key, box, order}] (viewport px); labels far off screen are skipped. */
  function textBoxes(layer, mr, view) {
    var p = layer.props, data = p.data, out = [], info = { index: 0, data: data, target: [] };
    if (!data.length || data.length > 6000 || (p.sizeUnits && p.sizeUnits !== 'pixels')) return out;
    var fam = p.fontFamily || FONT_SANS, wt = p.fontWeight || 400, lh = p.lineHeight || 1, scale = p.sizeScale || 1;
    var pad = p.background ? (p.backgroundPadding || [0, 0]) : [0, 0];
    var pl = pad[0] || 0, pt = pad[1] || 0, pr = pad.length > 2 ? pad[2] : pl, pb = pad.length > 3 ? pad[3] : pt;
    var outline = (p.outlineWidth || 0) > 0 ? 2 : 0, fxOut = fxLive() && !keepsLabels(layer), lead = fxOut && LBL.leaders && LBL.leaders[layer.id];
    for (var i = 0; i < data.length; i++) {
      var dm = data[i], pos = acc(p.getPosition, dm, i, info), outside = false;
      if (!pos) continue;
      /* item 38: labels outside the focus are not drawn; a chip's leader keeps its box (flagged), so a chip that would
         reach into the focused kecamatan can be hidden instead of showing sharp through the hole in the veil */
      if (fxOut && !fxInside(pos)) { if (!lead) continue; outside = true; }
      var pt2 = S.map.project(pos), px = mr.left + pt2.x, py = mr.top + pt2.y;
      if (view && (px < view.left - 320 || px > view.right + 320 || py < view.top - 120 || py > view.bottom + 120)) continue;
      var txt = acc(p.getText, dm, i, info);
      if (txt == null || txt === '') continue;
      txt = String(txt);
      var size = (+acc(p.getSize, dm, i, info) || 12) * scale;
      var font = wt + ' ' + size + 'px ' + fam;
      var lines = txt.split('\n'), w = 0;
      for (var l = 0; l < lines.length; l++) w = Math.max(w, measureText(font, lines[l]));
      var bw = p.background ? (+acc(p.getBorderWidth, dm, i, info) || 0) : 0;
      var bx = w + pl + pr + 2 * bw + outline, by = lines.length * size * lh + pt + pb + 2 * bw + outline;
      var off = acc(p.getPixelOffset, dm, i, info) || [0, 0];
      var anc = acc(p.getTextAnchor, dm, i, info) || 'middle', base = acc(p.getAlignmentBaseline, dm, i, info) || 'center';
      var x = px + (+off[0] || 0), y = py + (+off[1] || 0);
      var x0 = anc === 'start' ? x - pl - bw : (anc === 'end' ? x - bx + pr + bw : x - bx / 2);
      var y0 = base === 'top' ? y - pt - bw : (base === 'bottom' ? y - by + pb + bw : y - by / 2);
      out.push({ key: datumKey(txt, pos), box: { left: x0 - 1, top: y0 - 1, right: x0 + bx + 1, bottom: y0 + by + 1 }, order: i, d: dm,
        pt: { left: px - 4, top: py - 4, right: px + 4, bottom: py + 4 }, out: outside });
    }
    return out;
  }
  /** Memoised clone of a TextLayer without its hidden labels (flush() calls this for every layer). A follower
      (props.mcdFollow: the kecamatan chip sprites) drops the same datum objects as its leader label. */
  function labelFilter(layer) {
    if (!layer || !LBL.memo || isFn(layer)) return layer;
    var follow = layer.props && layer.props.mcdFollow ? (LBL.hideObj || {})[layer.id] : null;
    var hide = follow || LBL.hide[layer.id];
    if (!hide || !hide.size || !layer.props || !Array.isArray(layer.props.data)) return layer;
    var sig = follow ? 'f' + (LBL.sig[layer.props.mcdFollow] || '') : LBL.sig[layer.id], m = LBL.memo.get(layer);
    if (m && m.sig === sig) return m.layer;
    var p = layer.props, data = p.data, info = { index: 0, data: data, target: [] }, kept = [];
    for (var i = 0; i < data.length; i++) {
      if (follow) { if (!follow.has(data[i])) kept.push(data[i]); continue; }
      var txt = acc(p.getText, data[i], i, info), pos = acc(p.getPosition, data[i], i, info);
      if (!hide.has(datumKey(String(txt == null ? '' : txt), pos))) kept.push(data[i]);
    }
    var out;
    try { out = layer.clone({ data: kept }); } catch (e) { out = layer; }
    LBL.memo.set(layer, { sig: sig, layer: out });
    return out;
  }

  /**
   * One pass over every label on the map (see the note above buildMarkers): read positions, place
   * by priority, then write the callouts and, when the hidden set of a deck layer changed, flush.
   */
  function layoutLabels(force) {
    if (!S.map) return;
    wsWatch();                                              /* item 43: MCD.windows may load after the map */
    var p = S.posture || {}, core = p.core || CORE_DEFAULT;
    var allow = p.markers !== false && p.deck !== false && core.sites !== false && S.layers.sites;
    var mp = S.markers.mabesPart;
    var mabesOn = !!mp && p.markers !== false && core.boundary !== false && S.layers.boundary && S.zoom >= 12;
    var plates = S.markers.plates;
    var mr = S.map.getContainer().getBoundingClientRect();
    var vw = W.innerWidth || DOC.documentElement.clientWidth, vh = W.innerHeight || DOC.documentElement.clientHeight;
    var view = { left: Math.max(0, mr.left) + 2, top: Math.max(0, mr.top) + 2, right: Math.min(vw, mr.right) - 2, bottom: Math.min(vh, mr.bottom) - 2 };
    var occ = occluderRects(false);
    var placed = [], plan = [];
    routeChipPlace(mr, view, occ, placed);                  /* item 36: the route chip first, everything else keeps clear */
    var ko = chipKeepOut(mr);                               /* the selection and the route's end: no kecamatan chip on them */
    var fxc = fxLive() ? fxChipData(textLayersNow()) : null;
    fxChipPlace(fxc, mr, placed, ko);                       /* item 38: the focused kecamatan's chip, above the veil */
    /* site points of the callouts: their deck icons are reserved first */
    var cand = [];
    for (var i = 0; i < plates.length; i++) {
      var pl = plates[i], s = pl.site, show = allow;
      if (show && !S.layers.competitors && s.kind === 'competitor_branch') show = false;
      /* other banks, TNI housing and HQ callouts: hidden below zoom 14 and on phones (UX fix plan D11; fix 16 Oct 2026:
         at 12–14 five or six heavy plates crowded Mabes and covered the school symbols). Below zoom 14 only Mabes TNI and
         KCP Cilangkap carry a plate; the others are badges or icons whose name shows on hover. */
      if (show && !s.home && (S.zoom < PLATE_MIN_ZOOM || vw < 600)) show = false;
      /* another bank's plate only on the Merchant map (it means nothing on the school or KPR map) */
      if (show && s.kind === 'competitor_branch' && S.section !== 'merchants') show = false;
      if (show && s.far && !(S.wideView || S.zoom <= 11.5)) show = false;
      var x = 0, y = 0, dotR = null;
      if (show) {
        if (!pl.w) { pl.w = pl.card.offsetWidth || 150; pl.h = pl.card.offsetHeight || 36; }
        var pt = S.map.project(s.position);
        x = mr.left + pt.x; y = mr.top + pt.y;
        dotR = { left: x - 7, right: x + 7, top: y - 7, bottom: y + 7 };
        if (x < view.left - 40 || x > view.right + 40 || y < view.top || y > view.bottom + 40) show = false;
        if (show && clashes(dotR, occ)) show = false;
      }
      cand.push({ pl: pl, show: show, x: x, y: y, dot: dotR, w: pl.w, h: pl.h, r0: s.home ? 9 : 7, home: !!s.home });
    }
    var dots = cand.filter(function (c) { return c.show; }).map(function (c) { return c.dot; });
    /* deck text layers by priority; the kecamatan label boxes are read first so the branch and Mabes
       callouts can keep clear of them when a near spot allows it */
    var layers = textLayersNow(), groups = [[], [], [], [], [], [], [], []], soft = [], followers = followerLayersNow();
    LBL.leaders = {};
    followers.forEach(function (F) { LBL.leaders[F.props.mcdFollow] = 1; });
    layers.forEach(function (L) { var k = labelKind(L); if (k >= 0) groups[k].push(L); });
    /* Kecamatan labels within 5 km of the branch (Cipayung, Ciracas, Pasar Rebo, Makasar, Pondok Gede …) are
       placed first, as hard obstacles: no callout may push them off the map (UX fix plan A-04). The others are
       soft: a callout keeps clear of them when a near spot allows it. */
    var pre = {}, brLL = branchLL();
    groups[2].forEach(function (L) {
      textBoxes(L, mr, view).forEach(function (b) {
        var r = b.box;
        if (b.out || (fxc && b.d === fxc.d)) return;
        if (r.right < view.left || r.left > view.right || r.bottom < view.top || r.top > view.bottom || clashes(r, occ)) return;
        var cut = r.left < view.left - 2 || r.right > view.right + 2 || r.top < view.top - 2 || r.bottom > view.bottom + 2;
        var pos = b.d && b.d.position;
        if (!cut && pos && haversineKm(brLL[0], brLL[1], pos[0], pos[1]) <= 5 && !clashes(r, placed) && !clashes(r, ko)) { placed.push(r); pre[L.id + '|' + b.key] = 1; return; }
        soft.push(r);
      });
    });
    function place(c, useSoft) {
      var others = dots.filter(function (d) { return d !== c.dot; });
      if (c.home && keepBoxes.length) c.hard = keepBoxes;
      var f = placeCallout(c, placed, others, occ, view, useSoft ? soft : null);
      if (f) { placed.push(c.dot); plan.push([c, f]); } else plan.push([c, null]);
    }
    /* counts that belong to a bubble (2b below): read now, so the branch and Mabes plates prefer spots that leave them
       visible (soft, like the kecamatan labels) */
    var keepBoxes = [];
    groups[7].forEach(function (L) {
      textBoxes(L, mr, view).forEach(function (b) {
        var r = b.box, cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        var hw = Math.max(13, (r.right - r.left) / 2), hh = Math.max(13, (r.bottom - r.top) / 2);
        if (cx + hw < view.left || cx - hw > view.right || cy + hh < view.top || cy - hh > view.bottom) return;
        keepBoxes.push({ left: cx - hw, top: cy - hh, right: cx + hw, bottom: cy + hh });
      });
    });
    for (var kb = 0; kb < keepBoxes.length; kb++) soft.push(keepBoxes[kb]);
    /* 0 · our branch */
    cand.forEach(function (c) { if (c.pl.site.home) { if (c.show) place(c, true); else plan.push([c, null]); } });
    /* 1 · Mabes TNI name (on its area first, then on an offset leader) */
    var mabesSpot = null, mabesXY = null;
    if (mabesOn) {
      if (!mp.w) { mp.w = mp.card.offsetWidth || 210; mp.h = mp.card.offsetHeight || 40; }
      var ma = S.map.project(mp.at);
      mabesXY = { x: mr.left + ma.x, y: mr.top + ma.y, w: mp.w, h: mp.h, own: true, r0: 4 };
      mabesSpot = placeCallout(mabesXY, placed, dots, occ, view, soft);
    }
    /* 2–6 · deck text labels */
    var hideNew = {}, bulk = [], fxEdge = fxLive();
    /* A large layer (the merchant cluster counts: up to a few thousand) declutters itself; it only
       yields to the labels above it and is kept in a separate list for the few labels below it. */
    var hiddenData = {};
    function fitLayer(L, sortTier, ownPoint) {
      var boxes = textBoxes(L, mr, view), hid = new Set(), big = boxes.length > 300, hd = new Set();
      var keep = ko.length && kecChipLayer(L) ? ko : null, edge = fxEdge && !kecChipLayer(L);
      hiddenData[L.id] = hd;
      if (sortTier) boxes.sort(function (a, b) { return ((a.d && a.d.tier) || 3) - ((b.d && b.d.tier) || 3) || a.order - b.order; });
      for (var j = 0; j < boxes.length; j++) {
        if (pre[L.id + '|' + boxes[j].key]) continue;
        /* item 38: the focused kecamatan's own chip is an HTML plate above the veil (fxChipPlace); a chip outside the
           focus that reaches into it is hidden, the others stay faint (no place taken) */
        if ((fxc && boxes[j].d === fxc.d) || (boxes[j].out && fxCrosses(boxes[j].box, mr))) { hid.add(boxes[j].key); hd.add(boxes[j].d); continue; }
        if (boxes[j].out) continue;
        var b = boxes[j].box;
        if (b.right < view.left - 3 || b.left > view.right + 3 || b.bottom < view.top - 3 || b.top > view.bottom + 3) continue;
        /* a label cut by the edge of the map, or under a panel or a higher-priority label, is hidden;
           so is a name whose own point sits under a higher-priority label (it would read as one jumble) */
        var cut = b.left < view.left - 2 || b.right > view.right + 2 || b.top < view.top - 2 || b.bottom > view.bottom + 2;
        var pointHidden = ownPoint && !big && boxes[j].pt && clashes(boxes[j].pt, placed);
        /* place names and section text keep 4 px clear of the labels above them, so they never touch */
        var bp = ownPoint && !big ? { left: b.left - 4, top: b.top - 4, right: b.right + 4, bottom: b.bottom + 4 } : b;
        if (cut || pointHidden || clashes(b, occ) || clashes(bp, placed) || (keep && clashes(b, keep)) || (!big && bulk.length && clashes(b, bulk))) { hid.add(boxes[j].key); hd.add(boxes[j].d); continue; }
        /* item 38 (v5 finding): a label anchored inside the focused kecamatan whose text runs over its border would be cut
           mid-word by the frosted layer ("SMAS ANGKASA 2 H PERI"): hidden instead (big layers excepted: cost) */
        if (edge && !big && fxStraddles(b, mr)) { hid.add(boxes[j].key); hd.add(boxes[j].d); continue; }
        if (big) bulk.push(b); else placed.push(b);
      }
      hideNew[L.id] = hid;
    }
    groups[2].forEach(function (L) { fitLayer(L, false); });
    /* 2b · counts that belong to a bubble: always shown; reserved (at least the bubble's size) so the callouts, place
       names and other text below keep clear of them */
    groups[7].forEach(function (L) { hideNew[L.id] = new Set(); });
    for (var kp = 0; kp < keepBoxes.length; kp++) placed.push(keepBoxes[kp]);
    /* 3 · the other callouts */
    cand.forEach(function (c) { if (!c.pl.site.home) { if (c.show) place(c, false); else plan.push([c, null]); } });
    groups[4].forEach(function (L) { fitLayer(L, true, true); });
    groups[5].forEach(function (L) { fitLayer(L, false, true); });
    groups[6].forEach(function (L) { fitLayer(L, false); });
    /* companions (the kecamatan chip sprites): hide the items whose leader label is hidden (same datum objects) */
    var hideObj = {};
    followers.forEach(function (F) { var hd = hiddenData[F.props.mcdFollow]; if (hd && hd.size) hideObj[F.id] = hd; });
    LBL.hideObj = hideObj;
    /* write: callouts */
    var fxl = fxLive();
    if (mp) {
      showPart(mp.root, !!mabesSpot);
      if (mabesSpot) {
        writeCallout(mp, mabesSpot, 4);
        mp.root.classList.toggle('is-offset', !!mabesSpot.lead);
      }
      mp.root.classList.toggle('is-fx-out', fxl && !fxInside(mp.at));
    }
    for (var j = 0; j < plan.length; j++) {
      var c2 = plan[j][0], f2 = plan[j][1];
      showPart(c2.pl.el, !!f2);
      if (f2) writeCallout(c2.pl, f2, c2.r0);
      /* item 38: a plate outside the focused kecamatan recedes with its points */
      c2.pl.el.classList.toggle('is-fx-out', fxl && !fxInside(c2.pl.site.position));
    }
    /* write: deck labels (flush only when a layer's hidden set changed) */
    var changed = false, sig = {};
    Object.keys(hideNew).forEach(function (id) {
      var keys = Array.from(hideNew[id]).sort().join('\u0001');
      sig[id] = keys;
      if (keys !== (LBL.sig[id] || '')) changed = true;
    });
    Object.keys(LBL.sig).forEach(function (id) { if (!(id in sig) && LBL.sig[id]) changed = true; });
    if (changed) { LBL.hide = hideNew; LBL.sig = sig; }
    if (changed || force) flush();
  }

  /* --------------------------------------------------------- rings / mask */

  /* Ring sets: MCD.config.rings.sets ({anchor:'branch'|'center', show, core, outer}) wins over
     these fallbacks; registerRingSet() wins over both. 'center' = Mabes TNI centre. */
  var BUILTIN_RING_SETS = {
    default:  { anchor: 'branch', show: [1, 3, 5, 10, 15, 20, 30], core: null, outer: 30 },
    sme:      { anchor: 'center', show: [3, 5, 10, 15, 30], core: 15, outer: 30 },
    property: { anchor: 'center', show: [5, 10, 15, 20, 30], core: 30, outer: 30 },
    schools:  { anchor: 'center', show: [5, 10, 15, 30], core: 15, outer: 30 }
  };
  var RING_ALIAS = { branch: 'default' };
  function ringCenter() {
    var r = cfg().rings;
    return r && Array.isArray(r.center) ? r.center : SME_CENTER;
  }
  function ringSet(name) {
    name = RING_ALIAS[name] || name || 'default';
    var reg = S.reg.ringSets[name];
    var c = cfg().rings && cfg().rings.sets && cfg().rings.sets[name];
    var def = reg || c || BUILTIN_RING_SETS[name] || BUILTIN_RING_SETS['default'];
    var center = def.center || (def.anchor === 'center' ? ringCenter() : null);
    return {
      center: center, radiiKm: def.radiiKm || def.show || [], core: def.core == null ? null : def.core,
      outer: def.outer == null ? null : def.outer, label: def.label || null, origin: center ? 'mabes' : 'branch'
    };
  }
  function ringText(set, km) {
    if (set.label) { try { return String(set.label(km)); } catch (e) { /* fall through */ } }
    return km + ' KM' + (set.center && km === set.core ? ' · DARI MABES TNI' : '');
  }
  function updateRings() {
    var set = ringSet(S.ringSetName);
    var center = set.center || branchLL(), isBranch = !set.center;
    var feats = [], labels = [];
    var activeKm = S.posture && S.posture.activeRingKm != null ? S.posture.activeRingKm : null;
    var drawnActive = false;
    set.radiiKm.forEach(function (km) {
      var active = isBranch ? S.radiusKm === km : activeKm === km;
      if (active && isBranch) drawnActive = true;
      var props = { km: km, active: !!active, core: set.core === km, outer: set.outer === km && set.core !== km, origin: set.origin };
      feats.push({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: circleRing(center[0], center[1], km, 128) } });
      labels.push(Object.assign({ position: destination(center[0], center[1], km, 0), text: ringText(set, km) }, props));
    });
    /* the active branch radius always gets its own ring, even when the set does not list it */
    if (S.radiusKm != null && !drawnActive) {
      var b = branchLL();
      feats.push({ type: 'Feature', properties: { km: S.radiusKm, active: true, core: false, outer: false, origin: 'branch' },
        geometry: { type: 'LineString', coordinates: circleRing(b[0], b[1], S.radiusKm, 128) } });
      labels.push({ position: destination(b[0], b[1], S.radiusKm, 0), text: S.radiusKm + ' KM' + (isBranch ? '' : ' · DARI CABANG'),
        km: S.radiusKm, active: true, core: false, outer: false, origin: 'branch' });
    }
    S.ringLabels = labels;
    S.ringKey = S.ringSetName + '|' + S.radiusKm + '|' + activeKm + '|' + branchKey();
    var src = S.map && S.ready && S.map.getSource('rings');
    if (src) src.setData({ type: 'FeatureCollection', features: feats });
  }
  var maskTimer = 0;
  function updateFocusMask() {
    if (!S.map || !S.ready) return;
    var src = S.map.getSource('focusMask');
    if (!src) return;
    clearTimeout(maskTimer);
    if (S.radiusKm != null && S.radiusKm > 0) {
      var b = branchLL(), outer = worldRing().slice(), hole = circleRing(b[0], b[1], S.radiusKm, 128);
      if ((signedArea(outer) > 0) === (signedArea(hole) > 0)) hole = hole.slice().reverse();
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [outer, hole] } }] });
      setPaint('focus-mask', 'fill-opacity', 0.35);
    } else {
      setPaint('focus-mask', 'fill-opacity', 0);
      maskTimer = setTimeout(function () { if (S.radiusKm == null && S.map.getSource('focusMask')) S.map.getSource('focusMask').setData(EMPTY_FC); }, 450);
    }
  }

  /* --------------------------------------------------------- zones (item 30) */
  /* Three calm zones around Mabes TNI: the 33 focus kecamatan stay clear; the outer ring of 26 neighbours gets
     one soft neutral shade; everything beyond gets a second, stronger veil so the busy streets fade. The sets
     and their outlines come from MCD.territory.zones() (data/admin-areas.js). setZones({mode:'radius', km})
     clears a circle around Mabes TNI instead (KPR: 30 km) with the veil beyond it. Day, night, street and
     satellite each have their own veil colour; the shade sits above the base map (and the satellite names)
     and under every map line, label and point. */
  /* v6 (V6_SPEC §3.3): {mode: 'kecamatan', km: 30} is the same three zones for the 30 km scope (Sekolah at 30 km, Kampus):
     the 103 kecamatan at least half inside 30 km clear, the 15 others of the file under the soft shade, the veil beyond
     (MCD.territory.zones(30)). {mode: 'kecamatan', km: 15} (or no km) is 'kecamatan15'. */
  var ZONE_MODES = { kecamatan15: 1, kecamatan: 1, radius: 1, none: 1 };
  /* one neutral grey per basemap (never a data colour): a soft shade over the ring, a second layer of the same
     tone beyond it, so the streets fade step by step (total beyond ≈ 0.8 on the street map, ≈ 0.63 on the Day
     satellite). The satellite DIMS in both themes (fix 16 Oct 2026): its place names and site labels are light ink
     on a dark halo (palette 'night' in Detail), which turned hollow on a white veil, and a light veil lit up the
     unimportant area around a dark focus. The light veil stays for the Day street map only. */
  var ZONE_INK = {
    streetDay:   { color: '#E2E4E8', ring: 0.5, beyond: 0.6 },
    streetNight: { color: '#0A0E14', ring: 0.5, beyond: 0.6 },
    satDay:      { color: '#0A0E14', ring: 0.32, beyond: 0.45 },
    satNight:    { color: '#070A10', ring: 0.5, beyond: 0.6 }
  };
  var ZONE = { override: null, applied: '', data: '' };
  function normZones(z) {
    if (z === false || z === 'none') return { mode: 'none' };
    if (z === 'kecamatan30') z = { mode: 'kecamatan', km: 30 };
    if (typeof z === 'string') z = { mode: z };
    if (!z || typeof z !== 'object') return { mode: 'kecamatan15' };
    var mode = ZONE_MODES[z.mode] ? z.mode : 'kecamatan15';
    if (mode === 'radius') {
      var km = +z.km;
      if (!(km > 0)) return { mode: 'kecamatan15' };
      return { mode: 'radius', km: km };
    }
    /* the data holds two kecamatan sets (in15, inCircle = 30 km): anything above 15 km is the 30 km set */
    if (mode === 'kecamatan') return +z.km > 15 ? { mode: 'kecamatan', km: 30 } : { mode: 'kecamatan15' };
    return { mode: mode };
  }
  function isKecZones(z) { return !!z && (z.mode === 'kecamatan15' || z.mode === 'kecamatan'); }
  /** The kecamatan zone set of MCD.territory: 15 km (item 30) or, with km 30, the 30 km set (v6). */
  function zoneData(km) { var T = MCD.territory; try { return T && isFn(T.zones) ? T.zones(km === 30 ? 30 : undefined) : null; } catch (e) { return null; } }
  /** The zones in effect: a setZones() call by the current section, else the posture's `zones`, else 'kecamatan15'. */
  function zoneSpec() {
    var p = S.posture || {};
    if (p.deck === false) return { mode: 'none' };
    if (ZONE.override && ZONE.override.section === S.section) return ZONE.override;
    if (p.zones != null) return normZones(p.zones);
    return { mode: 'kecamatan15' };
  }
  function zoneInk() {
    var day = S.theme === 'day';
    return ZONE_INK[(isOverview() ? 'street' : 'sat') + (day ? 'Day' : 'Night')];
  }
  /** GeoJSON: the world with the outline's outer rings as holes, plus its holes as islands (veiled again). */
  function worldMinus(outl) {
    var world = worldRing().slice(), polys = [], worldCCW = ringSign(world) > 0;
    var holes = (outl.outer || []).map(function (r) { return (ringSign(r) > 0) === worldCCW ? r.slice().reverse() : r; });
    polys.push([world].concat(holes));
    (outl.holes || []).forEach(function (r) { polys.push([(ringSign(r) > 0) === worldCCW ? r : r.slice().reverse()]); });
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polys } }] };
  }
  function ringSign(r) { return signedArea(r); }           /* > 0: counter-clockwise (lon east, lat north) */
  function applyZones() {
    if (!S.map || !S.ready) return;
    var z = zoneSpec(), Z = isKecZones(z) ? zoneData(z.km) : null;
    if (isKecZones(z) && !Z) z = { mode: 'none' };
    var c = ringCenter(), dataKey = z.mode + '|' + (z.km || '') + '|' + (z.mode === 'radius' ? c.join(',') : '');
    var srcR = S.map.getSource('zoneRing'), srcB = S.map.getSource('zoneBeyond');
    if (!srcR || !srcB) return;
    if (dataKey !== ZONE.data) {
      ZONE.data = dataKey;
      try {
        if (isKecZones(z)) {
          srcR.setData(worldMinus(Z.focusOutline()));
          srcB.setData(worldMinus(Z.unionOutline()));
        } else if (z.mode === 'radius') {
          srcR.setData(worldMinus({ outer: [circleRing(c[0], c[1], z.km, 192)], holes: [] }));
          srcB.setData(EMPTY_FC);
        } else { srcR.setData(EMPTY_FC); srcB.setData(EMPTY_FC); }
      } catch (e) { warn('zones', e); }
    }
    var ink = zoneInk(), both = 1 - (1 - ink.ring) * (1 - ink.beyond);
    setPaint('zone-ring', 'fill-color', ink.color); setPaint('zone-beyond', 'fill-color', ink.color);
    setPaint('zone-ring', 'fill-opacity', isKecZones(z) ? ink.ring : (z.mode === 'radius' ? both : 0));
    setPaint('zone-beyond', 'fill-opacity', isKecZones(z) ? ink.beyond : 0);
    var key = stableKey(z);
    if (key !== ZONE.applied) { ZONE.applied = key; queueLegend(); emit('zones', z); }
  }
  /**
   * setZones({mode:'kecamatan15'} | {mode:'kecamatan', km: 30} | {mode:'radius', km} | {mode:'none'}) → the zones in effect.
   * The call belongs to the section on screen (body[data-section] while it mounts, else the map's section) and
   * ends when another section takes the map; that section gets its posture's zones (default 'kecamatan15').
   * A change redraws the section layers: MCD.territory chips and outlines follow the kecamatan set (v6).
   */
  function setZones(spec) {
    var z = normZones(spec), before = stableKey(zonesNow());
    var owner = (spec && spec.section) || (DOC.body && DOC.body.getAttribute && DOC.body.getAttribute('data-section')) || S.section;
    ZONE.override = Object.assign({ section: owner }, z);
    applyZones();
    if (S.ready && stableKey(zonesNow()) !== before) requestRender();
    /* the zones this call put in effect for its owner. While a section mounts (body[data-section] is already the new
       one) the map still shows the previous section, so zoneSpec() would answer with that section's zones and the new
       section would read its mode as "not supported" (Kampus fell back to the 30 km circle, fix round 19 Oct 2026). */
    return owner === S.section ? zonesNow() : zonesOf(Object.assign({}, ZONE.override));
  }
  /** a kecamatan zone set without its data (no MCD.territory, an admin file without inCircle) draws as 'none' */
  function zonesOf(z) { return isKecZones(z) && !zoneData(z.km) ? { mode: 'none' } : z; }
  function zonesNow() { return zonesOf(zoneSpec()); }
  /* Fit padding for the 15 km focus (item 30): the focus chips are about 180 px wide, so the camera keeps half a
     chip of room on both sides, and every focus label point is inside the fit (Pasar Minggu, Cilandak, Cinere,
     Setu and Cileungsi lie at the edge of the circle). */
  var CHIP_FIT_PAD = { top: 32, bottom: 32, left: 92, right: 92 };
  function focusFit(p) {
    if (!p || p.fit !== 'ring' || p.anchor !== 'center' || Math.abs((+p.km || 0) - 15) > 0.01) return null;
    if (zoneSpec().mode !== 'kecamatan15') return null;
    /* only where the chips can fit at all: on a phone the 15 km view keeps its plain fit */
    var box = S.map && S.map.getContainer ? S.map.getContainer().getBoundingClientRect() : null;
    if (!box || box.width - (S.padding.left || 0) - (S.padding.right || 0) < 640) return null;
    var Z = zoneData();
    if (!Z) return null;
    var pts = circleRing(ringCenter()[0], ringCenter()[1], 15, 64);
    Z.labels().forEach(function (l) { if (l.zone === 'focus') pts.push(l.position); });
    return bboxOf(pts);
  }

  /* ------------------------------------------------------- style helpers */

  function hasLayer(id) { try { return !!(S.map && S.map.getLayer(id)); } catch (e) { return false; } }
  function setPaint(id, prop, v) { if (hasLayer(id)) { try { S.map.setPaintProperty(id, prop, v); } catch (e) { warn('paint ' + id + '.' + prop, e); } } }
  function setVis(id, on) { if (hasLayer(id)) { try { S.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); } catch (e) { /* ignore */ } } }

  function applyImagery() {
    var v = imageryDef((S.posture || {}).imagery);
    var street = isOverview(), day = S.theme === 'day', P = PAL[palKey()];
    var bm = v.brightnessMax, sat = v.saturation, con = v.contrast == null ? 0.08 : v.contrast, wash = v.wash, washColor = '#04122A';
    var dimmed = v.wash >= 0.55;
    if (street) {
      /* street basemap: no tint, except the dimmed postures (Leaderboard, Data) that fade the map behind their sheets */
      washColor = P.bg; wash = dimmed ? 0.62 : 0;
    } else if (S.trueColour && !dimmed) {
      /* "Warna asli": natural colour. Day near-natural under a faint veil; Night natural but dimmed */
      if (day) { bm = 1; sat = -0.08; con = 0.02; washColor = '#FFFFFF'; wash = 0.06; }
      else { bm = Math.min(1, bm + 0.08); sat = -0.2; con = 0.06; washColor = '#0A0F17'; wash = Math.max(0, wash - 0.12); }
    } else {
      /* Greyscale by default (item 25): saturation −1 and a slight contrast boost. Day is lifted under a light
         white veil so the labels and dots read calmly; Night stays dim under a neutral dark veil. */
      sat = -1; con = dimmed ? 0 : 0.12;
      if (day) { bm = dimmed ? 0.6 : 0.96; washColor = '#FFFFFF'; wash = dimmed ? 0.5 : 0.16; }
      else { washColor = '#0A0F17'; if (!dimmed) { bm = Math.min(1, bm + 0.1); wash = Math.max(0, wash - 0.12); } }
    }
    setPaint('imagery', 'raster-brightness-max', bm);
    setPaint('imagery', 'raster-saturation', sat);
    setPaint('imagery', 'raster-contrast', con);
    setPaint('wash', 'fill-color', washColor);
    setPaint('wash', 'fill-opacity', wash);
    var offline = !street && (!S.imageryOK || S.imageryOff);
    setPaint('bg', 'background-color', offline ? 'rgba(5,8,15,0)' : (street ? P.bg : (day ? '#E7E9EC' : '#0A0F17')));
    /* satellite labels: light ink with a dark halo in both themes (fix 16 Oct 2026). The zone veil dims the satellite
       by day too now, and dark ink with a white halo turned into hollow, embossed lettering under it; the site labels
       above (palette 'night' in Detail) already use light ink on a dark halo */
    if (!street) {
      /* by day the imagery is lifted (brighter), so the ink is a little lighter than at night */
      var satInk = day ? { label: '#B9C1CD', road: 'rgba(201,209,220,0.82)' } : { label: P.label, road: P.road };
      setPaint('lbl-place', 'text-color', satInk.label); setPaint('lbl-place', 'text-halo-color', P.halo);
      setPaint('lbl-road', 'text-color', satInk.road); setPaint('lbl-road', 'text-halo-color', P.halo);
    }
    syncColourSwitch();
  }

  /* ------------------------------------------------- "Warna asli" switch (satellite only, item 25) */

  function syncColourSwitch() {
    var sw = S.dom.colour;
    if (!sw) return;
    var show = S.ready && !isOverview() && S.imageryOK && !S.imageryOff && (S.posture || {}).deck !== false;
    sw.root.hidden = !show;
    sw.btn.setAttribute('aria-checked', S.trueColour ? 'true' : 'false');
    sw.btn.title = S.trueColour ? 'Kembali ke peta satelit abu-abu.' : 'Tampilkan peta satelit dengan warna aslinya. Bawaan abu-abu agar titik berwarna mudah terlihat.';
  }
  function buildColourSwitch(el) {
    if (!el || S.dom.colour) return;
    var root = h('div', 'map-colour');
    root.setAttribute('data-map-occluder', '');
    var btn = h('button', 'map-colour__btn');
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', 'false');
    var track = h('span', 'map-colour__track');
    track.setAttribute('aria-hidden', 'true');
    track.appendChild(h('span', 'map-colour__knob'));
    btn.appendChild(h('span', 'map-colour__label', 'Warna asli'));
    btn.appendChild(track);
    btn.addEventListener('click', function (ev) { ev.stopPropagation(); setTrueColour(!S.trueColour); });
    root.appendChild(btn);
    el.appendChild(root);
    S.dom.colour = { root: root, btn: btn };
    syncColourSwitch();
  }
  /** setTrueColour(on): natural colour on the satellite (Detail) instead of the default greyscale. Remembered per browser. */
  function setTrueColour(on) {
    on = !!on;
    if (on === S.trueColour) { syncColourSwitch(); return; }
    S.trueColour = on;
    writeTrueColour(on);
    if (S.ready) applyImagery(); else syncColourSwitch();
    queueLegend();                                    /* the Detail legend note says whether the satellite is grey */
    emit('imagery', { trueColour: on });
  }
  /* buildings: flat outlines only ('flat' | 'off'), from posture.buildings or the imagery posture.
     A '3d' value from older code is read as 'flat': the map never extrudes (COPY_STYLE_EN item 10). */
  function buildingsMode() {
    var p = S.posture || {}, im = imageryDef(p.imagery), b = p.buildings;
    var mode = im.buildings || 'off', flat = im.flatOpacity || 0;
    if (typeof b === 'string') mode = b;
    else if (b && typeof b === 'object' && b.mode) mode = b.mode;
    if (mode === '3d') mode = 'flat';
    if (mode === 'flat' && !(flat > 0)) flat = 0.18;
    if (isOverview()) mode = 'off';     /* Overview: the street style draws its own flat buildings */
    return { mode: mode, flat: mode === 'flat' ? flat : 0 };
  }
  var bldTimer = 0;
  function applyBuildings() {
    if (!S.ready) return;
    var b = buildingsMode(), ofm = S.ofmOK && !S.imageryOff;
    var flat = ofm ? b.flat : 0;
    clearTimeout(bldTimer);
    if (flat > 0) setVis('bld-flat', true);
    setPaint('bld-flat', 'line-opacity', flat);
    bldTimer = setTimeout(function () { if (!(flat > 0)) setVis('bld-flat', false); }, reduced() ? 0 : 650);
  }
  function applyLayerToggles() {
    if (!S.ready) return;
    var p = S.posture || {}, core = p.core || CORE_DEFAULT, ofm = S.ofmOK && !S.imageryOff;
    var streetOK = isOverview() && S.street[S.theme] === 'ok';
    setVis('lbl-place', ofm && S.layers.labels && !streetOK);
    setVis('lbl-road', ofm && S.layers.labels && !streetOK);
    var bOn = S.layers.boundary && core.boundary !== false;
    ['mabes-fill', 'mabes-glow', 'mabes-line'].forEach(function (id) { setVis(id, bOn); });
    var rOn = S.layers.rings && core.rings !== false;
    ['rings', 'rings-outer', 'rings-core', 'rings-active-glow', 'rings-active'].forEach(function (id) { setVis(id, rOn); });
    setVis('imagery', !isOverview() && !S.imageryOff && S.imageryOK);
    applyBuildings();
    queuePlates();
  }

  /* registered MapLibre style additions (sources + layers per section key) */
  function installStyles() {
    if (!S.ready) return;
    Object.keys(S.reg.styles).forEach(function (key) {
      var spec = S.reg.styles[key];
      if (spec._installed) return;
      try {
        Object.keys(spec.sources || {}).forEach(function (sid) { if (!S.map.getSource(sid)) S.map.addSource(sid, spec.sources[sid]); });
        (spec.layers || []).forEach(function (l) {
          if (hasLayer(l.id)) return;
          var copy = Object.assign({}, l, { layout: Object.assign({}, l.layout || {}, { visibility: 'none' }) });
          S.map.addLayer(copy, spec.beforeId && hasLayer(spec.beforeId) ? spec.beforeId : DECK_BEFORE);
        });
        spec._installed = true;
      } catch (e) { warn('registerStyle(' + key + ')', e); }
    });
    applyStyleVisibility();
  }
  function applyStyleVisibility() {
    if (!S.ready) return;
    var active = sectionKeys();
    Object.keys(S.reg.styles).forEach(function (key) {
      var spec = S.reg.styles[key], on = active.indexOf(key) >= 0 && (S.posture || {}).deck !== false;
      (spec.layers || []).forEach(function (l) {
        if (!hasLayer(l.id)) return;
        var want = on && !(l.layout && l.layout.visibility === 'none');
        setVis(l.id, want);
      });
    });
  }

  /* ------------------------------------------ views, themes and basemaps (U6, U7) */

  function applyPalette() {
    var key = palKey(), P = PAL[key];
    if (key === S.pal && S.palApplied) return;
    S.pal = key; S.palApplied = true;
    ['canvas', 'text1', 'text2', 'text3', 'gold', 'goldSoft', 'signal', 'platinum', 'bMerchant', 'bGiro', 'bPayroll'].forEach(function (k) { C[k] = P[k].slice(); });
    C.plat = P.plat.map(function (a) { return a.slice(); });
    HEAT_RGB.length = 0;
    P.heat.forEach(function (c) { HEAT_RGB.push(c.slice()); });
    S.sitesSrc = null; S.siteVisKey = ''; S.sectionCache.key = ''; S.legendKey = '';
    if (!S.ready) return;
    prepareSites();
    setPaint('mabes-fill', 'fill-color', P.mabes); setPaint('mabes-fill', 'fill-opacity', P.mabesFill);
    setPaint('mabes-glow', 'line-color', P.mabes); setPaint('mabes-line', 'line-color', P.mabes);
    setPaint('rings', 'line-color', P.ring); setPaint('rings', 'line-opacity', P.ringOp);
    ['rings-outer', 'rings-core', 'rings-active-glow', 'rings-active'].forEach(function (id) { setPaint(id, 'line-color', P.ringStrong); });
    setPaint('lbl-place', 'text-color', P.label); setPaint('lbl-place', 'text-halo-color', P.halo);
    setPaint('lbl-road', 'text-color', P.road); setPaint('lbl-road', 'text-halo-color', P.halo);
    setPaint('focus-mask', 'fill-color', P.bg);
  }
  function streetUrl(theme) {
    var st = cfg().map && cfg().map.street;
    return (st && st[theme]) || STREET_URL[theme];
  }
  /* Fetches the OpenFreeMap style once per theme (connect-src allows tiles.openfreemap.org)
     and merges its layers under the imagery, renamed st-<theme>-*, on our 'ofm' source. */
  function ensureStreet(theme) {
    if (!S.ready || S.street[theme]) return;
    if (!W.fetch) { S.street[theme] = 'failed'; return; }
    S.street[theme] = 'loading';
    W.fetch(streetUrl(theme), { credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) { addStreet(theme, json); S.street[theme] = S.streetIds[theme].length ? 'ok' : 'failed'; })
      .catch(function (e) { warn('street style ' + theme, e && e.message); S.street[theme] = theme === S.theme ? 'failed' : null; })   /* a failed prefetch is tried again on demand */
      .then(function () { applyBasemap(); if (S.street[theme] === 'failed') onIdle(); });
  }
  function addStreet(theme, style) {
    var ids = [], layers = (style && style.layers) || [];
    var before = hasLayer('imagery') ? 'imagery' : undefined;
    layers.forEach(function (l) {
      if (!l || !l.id || l.type === 'fill-extrusion') return;   /* flat map: no 3D buildings from the street style */
      var copy = JSON.parse(JSON.stringify(l));
      if (copy.type !== 'background') {
        if (copy.source !== 'openmaptiles') return;             /* drops the Natural Earth raster (no extra host) */
        copy.source = 'ofm';
      }
      if (copy.type === 'symbol') {
        var lay = copy.layout || {};
        if (lay['icon-image'] != null) {
          if (lay['text-field'] == null) return;                 /* icon-only (shields, airports): no sprite is loaded */
          Object.keys(lay).forEach(function (k) { if (k.indexOf('icon-') === 0) delete lay[k]; });
        }
        if (lay['text-field'] != null) lay['text-field'] = localName(lay['text-field']);
        copy.layout = lay;
        /* place names fade where the focused kecamatan's border would cut them (baseCut) */
        var op0 = copy.paint ? copy.paint['text-opacity'] : undefined;
        if (copy['source-layer'] === 'place' && (op0 == null || finite(op0))) copy.paint = Object.assign({}, copy.paint || {}, { 'text-opacity': cutOpacity(op0 == null ? 1 : op0) });
      }
      if (copy.paint) ['fill-pattern', 'line-pattern', 'background-pattern', 'fill-extrusion-pattern'].forEach(function (k) { delete copy.paint[k]; });   /* no sprite */
      if (copy.filter) copy.filter = nullSafeFilter(copy.filter);
      var over = calmPaint(theme, l);                            /* neutral greyscale, never green (items 23, 25) */
      if (over) copy.paint = Object.assign({}, copy.paint || {}, over);
      copy.id = 'st-' + theme + '-' + l.id;
      copy.layout = Object.assign({}, copy.layout || {}, { visibility: 'none' });
      delete copy.metadata;
      try { S.map.addLayer(copy, before); ids.push(copy.id); } catch (e) { /* a layer this MapLibre cannot parse is skipped */ }
    });
    S.streetIds[theme] = ids;
  }
  /* Place, water and street labels in Indonesian (item 19): the street styles prefer the English name
     ("South Tangerang", "North Tugu"). name:id comes first; the local name stays the fallback. */
  function localName(x) {
    if (typeof x === 'string') return /^\{name(_en|:en|:latin)?\}$/.test(x) ? ['coalesce', ['get', 'name:id'], ['get', 'name']] : x;
    if (!Array.isArray(x)) return x;
    if (x.length === 2 && x[0] === 'get' && (x[1] === 'name_en' || x[1] === 'name:en')) return ['get', 'name:id'];
    return x.map(localName);
  }
  /* The street styles compare feature properties that some tiles lack (rank, admin_level, ref_length):
     MapLibre then drops the feature and logs "Expected value to be of type number, but found null".
     A missing value is given a stand-in that fails the same comparison, so the map draws exactly the
     same features and the console stays clean. */
  function nullSafeFilter(f) {
    if (!Array.isArray(f)) return f;
    var op = f[0];
    if (f.length === 3 && (op === '<' || op === '<=' || op === '>' || op === '>=') && Array.isArray(f[1]) && f[1][0] === 'get' && typeof f[2] === 'number') {
      return [op, ['coalesce', f[1], op.charAt(0) === '<' ? 1e9 : -1e9], f[2]];
    }
    return f.map(nullSafeFilter);
  }
  function applyBasemap() {
    if (!S.ready) return;
    var street = isOverview(), theme = S.theme, other = theme === 'day' ? 'night' : 'day';
    if (street) ensureStreet(theme);
    var ok = street && S.street[theme] === 'ok';
    /* Day ⇄ Night while the other street style is still loading: keep the previous one on
       screen (never a blank map), with the small "Loading map…" note until the new one is in. */
    var keepOther = street && !ok && S.street[theme] === 'loading' && S.street[other] === 'ok';
    ['day', 'night'].forEach(function (t) { S.streetIds[t].forEach(function (id) { setVis(id, !S.imageryOff && ((ok && t === theme) || (keepOther && t === other))); }); });
    applyPalette();
    applyImagery();
    applyLayerToggles();
    applyZones();
    if (DOC.body) DOC.body.classList.toggle('is-map-offline', !street && (!S.imageryOK || S.imageryOff));
    renderNotice();
    if (street && S.street[theme] === 'loading' && !S.dom.loading) buildLoading(S.el, keepOther);
    if (S.dom.loading) onIdle();
    setAttribution((S.posture && S.posture.attribution) || '');
    S.sectionCache.key = ''; S.siteVisKey = '';
    if (FX.dom) { fxStyle(); FX.dirty = true; }            /* item 38: the veil follows the map in use */
    if (RT.chip) RT.chip.card.style.setProperty('--mf-route', cssRgb(routeInk().line));
    compose(); queueLegend(); queuePlates(); queueTelemetry();
  }
  function setView(v) {
    if (v !== 'overview' && v !== 'deep') return;
    if (v === S.view) return;
    S.view = v;
    resetPlateSizes();                         /* Overview plates use a larger font */
    invalidateOccluders();
    if (!S.ready) return;
    enforceFlat(false);
    applyBasemap();
    queuePlates();
    emit('view', v);
  }
  function setTheme(t) {
    if (t !== 'day' && t !== 'night') return;
    if (t === S.theme) return;
    S.theme = t;
    resetPlateSizes();
    if (!S.ready) return;
    applyBasemap();
    queuePlates();
    emit('theme', t);
  }

  /* ---------------------------------------------------------------- camera */

  /** Every camera target is flat and north-up (COPY_STYLE_EN item 10): pitch and bearing are dropped. */
  function viewTarget(t) {
    return { center: t.center, zoom: clamp(t.zoom, 9, 19.5), pitch: 0, bearing: 0 };
  }
  /**
   * Start a camera animation and remember it in S.flight {target, t0, duration, id}, so setLayout() can re-aim it
   * when the panels move during the flight. MapLibre ends the animation it interrupts (its 'moveend') INSIDE
   * flyTo / easeTo, before the new one starts; the moveend handler then clears S.flight. So the record is written
   * after the call returns, never before (a record written first was cleared by the old flight's moveend, and a
   * later setLayout eased the padding and cancelled the new flight: phones, Ringkasan → Sekolah, 16 Oct 2026).
   * reaimId: the id of the flight being re-aimed (setLayout); S.reaim marks the moveend that the re-aim itself causes,
   * so focusPoint() keeps waiting for the real arrival.
   */
  function flightGo(target, dur, ease, reaimId, easing) {
    var id = reaimId || ++S.flightSeq;
    /* item 38: ease-out for entrances and flights, ease-in-out for exits (MCD.motion); a re-aim keeps the flight's own */
    var fn = easing || (reaimId && S.flight && S.flight.easing) || motionEase('out');
    /* S.starting: the moveend MapLibre sends for the move this call interrupts is not an arrival (route, focus) */
    S.reaim = !!reaimId; S.starting = true;
    try {
      if (ease) S.map.easeTo(Object.assign({}, target, { duration: dur, easing: fn }));
      else S.map.flyTo(Object.assign({}, target, { duration: dur, curve: 1.25, easing: fn, essential: true }));
    } finally { S.reaim = false; S.starting = false; }
    S.flight = S.map.isMoving && S.map.isMoving() ? { target: target, t0: now(), duration: dur, id: id, easing: fn, ease: !!ease } : null;
    return id;
  }
  /** The easing of a camera move (item 38, item 41 / LAYOUT_V5C §5): ease-out-quint for entrances and near moves; a long
      move (more than 1.5 zoom steps, or to a target off screen) eases in-out instead, so the camera speeds up rather than
      jumping 10–11% of its zoom path in the first frame (MOTION verifier, 16 Oct 2026). The rule holds for a flyTo and
      for an easeTo alike: the kecamatan focus fit and the route fit are easeTo moves of up to 3 zoom steps (v5 design
      verifier, 17 Oct 2026). Exits ease in-out; nudge and keepInView (flightGo with their own ease-out) never come here. */
  function flightEase(v, ease, exit) {
    if (exit) return motionEase('inOut');
    if (!S.map || !v) return motionEase('out');
    var dz = 0, off = false;
    try {
      dz = Math.abs((finite(v.zoom) ? v.zoom : S.map.getZoom()) - S.map.getZoom());
      var p = S.map.project(v.center), box = S.map.getContainer().getBoundingClientRect();
      off = !(p.x >= 0 && p.y >= 0 && p.x <= box.width && p.y <= box.height);
    } catch (e) { dz = 0; off = false; }
    return dz > 1.5 || off ? motionEase('inOut') : motionEase('out');
  }
  /** How far a camera move goes, in km of ground, plus 1.5 km per zoom step (flightMs scales the duration by it). */
  function cameraKm(v) {
    if (!S.map || !v || !v.center) return 0;
    try {
      var c = S.map.getCenter(), z = S.map.getZoom();
      return haversineKm(c.lng, c.lat, v.center[0], v.center[1]) + Math.abs((finite(v.zoom) ? v.zoom : z) - z) * 1.5;
    } catch (e) { return 0; }
  }
  /** A target within about one screen of the current view eases there (no zoom-out arc); a far one flies. */
  function nearView(center) {
    if (!S.map || !center) return false;
    try {
      var p = S.map.project(center), box = S.map.getContainer().getBoundingClientRect();
      var dx = p.x - box.width / 2, dy = p.y - box.height / 2, lim = Math.max(box.width, box.height) * 1.2;
      return dx * dx + dy * dy <= lim * lim;
    } catch (e) { return false; }
  }
  /** cameraTo(target, {instant, duration, ease, exit, padding}): every camera move of the map goes through here,
      timed and eased by MCD.motion (flights of 700–1,000 ms by distance; flightEase picks the curve). */
  function cameraTo(t, opts) {
    if (!S.map) return;
    opts = opts || {};
    var v = viewTarget(t);
    v.padding = opts.padding || S.padding;
    if (reduced() || opts.instant) { S.flightSeq++; S.map.jumpTo(v); S.flight = null; return; }
    var dur = finite(opts.duration) ? opts.duration : flightMs(cameraKm(v));
    flightGo(v, dur, !!opts.ease, 0, flightEase(v, !!opts.ease, !!opts.exit));
  }
  /**
   * camFor(bounds, extra) → {center:[lon, lat], zoom} | null: the camera that fits bounds in the free map area of
   * S.padding plus `extra` px per side. MapLibre's cameraForBounds sizes the fit with the map's CURRENT padding (the
   * transform's), which lags S.padding while setLayout eases it: the difference is added to extra here (equally on both
   * sides, so the centre does not move), so a fit made in the middle of a layout change is already right for the new one.
   */
  function camFor(bounds, extra) {
    if (!S.map || !bounds) return null;
    var cur = null, p = S.padding, e = extra || {}, cam = null;
    try { cur = isFn(S.map.getPadding) ? S.map.getPadding() : null; } catch (err) { cur = null; }
    var dh = cur ? ((p.left || 0) + (p.right || 0) - (cur.left || 0) - (cur.right || 0)) / 2 : 0;
    var dv = cur ? ((p.top || 0) + (p.bottom || 0) - (cur.top || 0) - (cur.bottom || 0)) / 2 : 0;
    var pad = { top: (e.top || 0) + dv, bottom: (e.bottom || 0) + dv, left: (e.left || 0) + dh, right: (e.right || 0) + dh };
    try { cam = S.map.cameraForBounds(bounds, { padding: pad, bearing: 0 }); } catch (err) { cam = null; }
    if (!cam || !finite(cam.zoom)) return null;
    var c = cam.center, center = Array.isArray(c) ? c : [c.lng, c.lat];
    return finite(center[0]) && finite(center[1]) ? { center: center, zoom: cam.zoom } : null;
  }
  function fitTo(bounds, opts) {
    if (!S.map || !bounds) return;
    var cam;
    try { cam = S.map.cameraForBounds(bounds, { padding: (opts && opts.fitPadding) || 32, bearing: 0 }); } catch (e) { cam = null; }
    if (!cam) return;
    var c = cam.center;
    var center = Array.isArray(c) ? c : [c.lng, c.lat];
    /* a fit of one point (or a few metres) must not dive to maxZoom: cap at street level */
    var zoom = Math.min(cam.zoom, (opts && opts.maxZoom) || 16.4);
    cameraTo({ center: center, zoom: zoom }, opts);
  }
  function ringBBox(center, km) { return bboxOf(circleRing(center[0], center[1], km, 64)); }
  function sitesBBox(ids, extra) {
    var pts = [];
    ids.forEach(function (id) { var s = S.sitesById.get(id); if (s) pts.push(s.position); });
    (extra || []).forEach(function (p) { pts.push(p); });
    return bboxOf(pts);
  }

  /* Camera presets (§E.10), all flat and north-up. MCD.config.map.presets uses the same
     keys and wins over these; registerPreset() wins over both. Kinds understood:
     {center:[lon,lat]|'branch', zoom} · {fit:'ring', anchor:'branch'|'center', km}
     · {fit:'sites', siteIds} · {fit:'kinds', kinds, includeBranch}. Any pitch or bearing is ignored. */
  var BUILTIN_PRESETS = {
    H: { label: 'Sekitar cabang dan Mabes TNI', center: HOME_VIEW.center, zoom: HOME_VIEW.zoom },
    M: { label: 'Ke Mabes TNI', center: MABES_CENTROID, zoom: 15.1 },
    B: { label: 'Ke cabang', center: 'branch', zoom: 16.6 },
    '0': { label: '10 km dari cabang', fit: 'ring', anchor: 'branch', km: 10 },
    sme15: { label: '15 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 15 },
    ring30: { label: '30 km dari Mabes TNI', fit: 'ring', anchor: 'center', km: 30 }
  };
  var PRESET_ALIAS = { '15': 'sme15', merchants15: 'sme15', P: 'ring30', h: 'H', m: 'M', b: 'B' };
  function presetDef(key) {
    key = String(key);
    var k = S.reg.presets[key] ? key : (PRESET_ALIAS[key] || key);
    var c = cfg().map && cfg().map.presets;
    return S.reg.presets[k] || (c && c[k]) || BUILTIN_PRESETS[k] || null;
  }
  function presetCenter(c) { return c === 'branch' ? branchLL() : (c === 'center' || c === 'mabes' ? ringCenter() : c); }
  /** bounds for a {fit:…} preset, or null */
  function presetBounds(p) {
    if (isFn(p.bounds)) return p.bounds();
    if (Array.isArray(p.bounds)) return p.bounds;
    var pts = [];
    switch (p.fit) {
      case 'ring': return ringBBox(presetCenter(p.anchor === 'center' ? 'center' : 'branch'), p.km || 10);
      case 'sites': return sitesBBox(p.siteIds || [], p.includeBranch ? [branchLL()] : []);
      case 'kinds':
        S.sites.forEach(function (s) { if ((p.kinds || []).indexOf(s.kind) >= 0) pts.push(s.position); });
        if (p.includeBranch) pts.push(branchLL());
        return bboxOf(pts);
      default: return null;
    }
  }
  function isWidePreset(p) { return !!(p.wide || p.fit === 'kinds' || (p.fit === 'ring' && p.km >= 15)); }
  function preset(key, opts) {
    var p = presetDef(key);
    if (!p || !S.map) return false;
    if (isFn(p.run)) { try { p.run(api, opts); } catch (e) { warn('preset ' + key, e); } return true; }
    S.wideView = isWidePreset(p);
    S.siteVisKey = '';
    if (p.fit || p.bounds) {
      /* the 15 km focus: every focus chip clear of the panels (item 30) */
      var ff = focusFit(p), bb = ff || presetBounds(p);
      if (!bb) return false;
      fitTo(bb, ff ? Object.assign({}, opts || {}, { fitPadding: CHIP_FIT_PAD }) : opts);
    } else {
      var cam = isFn(p.camera) ? p.camera() : (p.camera || p);
      if (!cam.center) return false;
      cameraTo({ center: presetCenter(cam.center), zoom: cam.zoom }, opts);
    }
    compose();
    return true;
  }
  function presetList() {
    var c = (cfg().map && cfg().map.presets) || {};
    var seen = {}, keys = [];
    [Object.keys(BUILTIN_PRESETS), Object.keys(c), Object.keys(S.reg.presets)].forEach(function (l) {
      l.forEach(function (k) { if (!seen[k]) { seen[k] = 1; keys.push(k); } });
    });
    return keys.filter(function (k) { return !!presetDef(k); })
      .map(function (k) { var p = presetDef(k); return { key: k, label: (p && p.label) || k, wide: !!(p && isWidePreset(p)) }; });
  }

  /* Flat, north-up map (COPY_STYLE_EN item 10): rotation and tilt gestures are off for good and
     any pitch or bearing (an old link, a section call) is levelled at once. */
  function enforceFlat(instant) {
    if (!S.map) return;
    var m = S.map;
    try {
      if (m.dragRotate) m.dragRotate.disable();
      if (m.touchPitch) m.touchPitch.disable();
      if (m.touchZoomRotate && m.touchZoomRotate.disableRotation) m.touchZoomRotate.disableRotation();
      if (m.keyboard && m.keyboard.disableRotation) m.keyboard.disableRotation();
      if (m.getPitch() !== 0 || m.getBearing() !== 0) {
        if (instant || reduced()) m.jumpTo({ pitch: 0, bearing: 0 }); else m.easeTo({ pitch: 0, bearing: 0, duration: motionDur('base'), easing: motionEase('out') });
      }
    } catch (e) { warn('flat map', e); }
    applyBuildings();
  }

  /* ---------------------------------------------------------------- postures */

  /* Built-in fallbacks. MCD.config.sections[].posture (and tabs[].posture) override
     these, and MCD.map.registerPosture() overrides both. */
  var BUILTIN_POSTURES = {
    overview: { imagery: 'full', camera: 'H', rings: 'default', layerSet: 'overview', deck: true, ticker: true },
    merchants: { imagery: 'merchants', camera: 'sme15', rings: 'merchants', layerSet: 'merchants', deck: true },
    /* item 30: KPR keeps its own 30 km circle, clear inside, the veil beyond (a section may still call setZones) */
    property: { imagery: 'full', camera: 'ring30', rings: 'property', layerSet: 'property', deck: true, zones: { mode: 'radius', km: 30 } },
    schools: { imagery: 'full', camera: 'ring30', rings: 'schools', layerSet: 'schools', deck: true },
    /* v6 (V6_SPEC §6.1, §6.3): Kampus opens on its 30 km scope, the 30 km kecamatan zones by default (the section still
       calls setZones: {mode: 'kecamatan15'} at 15 km) */
    campus: { imagery: 'full', camera: 'ring30', rings: 'schools', layerSet: 'campus', deck: true, zones: { mode: 'kecamatan', km: 30 } },
    /* V8 (V8_SPEC §2.1, P2; HEALTH_SPEC §2.6 with H12 at 5 km): Kesehatan and Calon Prioritas open at 5 km on the 15 km
       kecamatan zones; fallbacks only, both sections register their own posture (camera and zones per scope) */
    health: { imagery: 'full', camera: '5', rings: 'schools', layerSet: 'health', deck: true, zones: { mode: 'kecamatan15' }, core: { sitesDim: true } },
    wealth: { imagery: 'full', camera: '5', rings: 'schools', layerSet: 'wealth', deck: true, zones: { mode: 'kecamatan15' }, core: { sitesDim: true } },
    data: { imagery: 'dimmed', camera: null, rings: null, layerSet: null, deck: false }
  };
  /* ticker (beacon pulse, selection halo) runs only in Overview (§E.13) */
  var TICKER_SECTIONS = { overview: true };

  function configPosture(section, tab) {
    var secs = cfg().sections, s = null, i;
    if (!Array.isArray(secs)) return null;
    for (i = 0; i < secs.length; i++) if (secs[i] && secs[i].id === section) { s = secs[i]; break; }
    if (!s) return null;
    if (!tab) return s.posture || null;
    if (Array.isArray(s.tabs)) for (i = 0; i < s.tabs.length; i++) if (s.tabs[i].id === tab) return s.tabs[i].posture || null;
    return null;
  }
  /* derived flags: imagery 'plan' → plan view · deck:false → no markers · rings:null → rings hidden */
  function finishPosture(out, section) {
    var imKey = typeof out.imagery === 'string' ? (IMAGERY_ALIAS[out.imagery] || out.imagery) : null;
    if (out.plan == null) out.plan = imKey === 'plan';
    if (out.deck === false && out.markers == null) out.markers = false;
    if (out.rings === null || out.rings === false) out.core.rings = false;
    if (out.ticker == null) out.ticker = !!TICKER_SECTIONS[section];
    if (out.attribution == null && (out.layerSet === 'merchants' || out.layerSet === 'sme')) {
      var a = cfg().map && cfg().map.attribution;
      out.attribution = (a && (a.merchants || a.sme)) || '© Overture Maps Foundation · Foursquare (Apache-2.0) · © OpenStreetMap';
    }
    return out;
  }
  function resolvePosture(section, tab, extra) {
    var keys = [section];
    if (tab) keys.push(section + ':' + tab);
    var out = { imagery: 'full', camera: null, rings: 'default', layerSet: null, deck: true, core: Object.assign({}, CORE_DEFAULT) };
    var ms = baseState();
    var merge = function (p, label) {
      if (isFn(p)) { try { p = p(tab, ms); } catch (e) { warn('posture ' + label, e); p = null; } }
      if (!p || typeof p !== 'object') return;
      var core = Object.assign({}, out.core, p.core || {});
      Object.assign(out, p);
      out.core = core;
    };
    keys.forEach(function (k) { merge(BUILTIN_POSTURES[k], k); });
    merge(configPosture(section, null), 'config ' + section);
    if (tab) merge(configPosture(section, tab), 'config ' + section + ':' + tab);
    keys.forEach(function (k) { merge(S.reg.postures[k], k); });
    /* section.layout().posture may be the section id (already merged above), another
       registered posture key, or a posture object / function */
    if (typeof extra === 'string') extra = keys.indexOf(extra) >= 0 ? null : (S.reg.postures[extra] || null);
    merge(extra, 'layout');
    return finishPosture(out, section);
  }

  function setPosture(section, tab, opts) {
    opts = opts || {};
    /* another section takes the map: its route and its kecamatan focus end with the old one (items 36, 38) */
    var entering = (section || 'overview') !== S.section;
    if (entering) { SEL.key = ''; routeClear(true); fxClear('section'); }
    S.section = section || 'overview';
    if (entering && S.section === 'merchants') smeFilterOnEntry();
    S.tab = tab || null;
    S.postureKey = S.tab ? S.section + ':' + S.tab : S.section;
    S.posture = resolvePosture(S.section, S.tab, opts.posture);
    if ('layerSet' in S.posture) S.layerSet = S.posture.layerSet;
    S.postureOpts = opts;
    if (!S.ready) return;
    applyPostureNow(opts);
  }
  function applyPostureNow(opts) {
    var p = S.posture;
    hideTip();
    enforceFlat(false);
    applyImagery();
    applyLayerToggles();
    S.ringSetName = p.rings || 'default';
    updateRings();
    setAttribution(p.attribution || '');
    applyStyleVisibility();
    S.sectionCache.key = '';
    S.siteVisKey = '';
    /* a kecamatan focus waiting at the mount (Ringkasan's Sasaran per kecamatan sets the Merchant filter first) flies
       there itself: the section's preset flight would start and be turned 70 ms later (MOTION verifier, 16 Oct 2026) */
    var ft = fxTop(), fxWaiting = !!(ft && focusGeo(ft.id));
    if (opts.camera !== false && p.camera != null && !fxWaiting) {
      var cam = p.camera, co = opts.instant ? { instant: true } : undefined;
      if (typeof cam === 'string') preset(cam, co);
      else if (isFn(cam)) { try { cam(api); } catch (e) { warn('posture camera', e); } }
      else if (cam.bounds) fitTo(isFn(cam.bounds) ? cam.bounds() : cam.bounds, co);
      else if (cam.center) cameraTo(cam, co);
    }
    applyZones();
    compose();
    queuePlates();
    emit('posture', { section: S.section, tab: S.tab, posture: p });
  }

  function setAttribution(extra) {
    if (!S.map || !W.maplibregl) return;
    if (S.attribution && extra === S.attributionExtra && S.attributionView === S.view) return;
    S.attributionExtra = extra;
    S.attributionView = S.view;
    var a = (cfg().map && cfg().map.attribution) || {};
    var street = (cfg().map && cfg().map.street && cfg().map.street.attribution) || 'OpenFreeMap © OpenMapTiles · data dari OpenStreetMap';
    var list = [S.view === 'overview' ? street : (a.base || ESRI_ATTRIBUTION), a.mabes || 'Batas Mabes TNI: OpenStreetMap way 912445334 (ODbL)'];
    if (extra) list.push(extra);
    try {
      if (S.attribution) S.map.removeControl(S.attribution);
      S.attribution = new W.maplibregl.AttributionControl({ compact: true, customAttribution: list });
      S.map.addControl(S.attribution, 'bottom-right');
      /* phones: start collapsed (the (i) button opens it), so the credits never cover the page below the map */
      if (W.matchMedia && W.matchMedia('(max-width: 599px)').matches) {
        var box = S.el && S.el.querySelector('.maplibregl-ctrl-attrib');
        if (box) box.classList.remove('maplibregl-compact-show');
      }
    } catch (e) { warn('attribution', e); }
    fitCredits(true);
  }
  /**
   * The credits sit at the bottom right of the free map area; the legend, the telemetry line and the
   * map controls stack above them through --credits-h on <body> (shell.css). In a free strip narrower
   * than 820 px they fold to the (i) button, so they never run under the map furniture.
   */
  var creditsRO = null;
  function fitCredits(fold) {
    if (!S.map || !S.el) return;
    var box = S.el.querySelector('.maplibregl-ctrl-attrib');
    /* compact (ⓘ) at every width (UX fix plan A-12): the credits open on demand and never run under a panel */
    if (box && fold) box.classList.remove('maplibregl-compact-show');
    var wrap = S.el.querySelector('.maplibregl-ctrl-bottom-right');
    var hgt = wrap ? Math.round(wrap.offsetHeight || 0) : 20;
    try { DOC.body.style.setProperty('--credits-h', Math.max(16, hgt) + 'px'); } catch (e) { /* ignore */ }
    if (wrap && !creditsRO && W.ResizeObserver) {
      try { creditsRO = new W.ResizeObserver(function () { fitCredits(false); }); creditsRO.observe(wrap); } catch (e) { creditsRO = null; }
    }
  }

  function samePadding(a, b) {
    if (!a || !b) return false;
    return Math.abs((a.top || 0) - (b.top || 0)) <= 1 && Math.abs((a.right || 0) - (b.right || 0)) <= 1 &&
      Math.abs((a.bottom || 0) - (b.bottom || 0)) <= 1 && Math.abs((a.left || 0) - (b.left || 0)) <= 1;
  }
  /**
   * setLayout(padding): the panels moved. The same padding (within 1 px) moves no camera at all: the shell measures the
   * layout often, and re-aiming a running flight with an unchanged padding made double flights and a velocity kink
   * (MOTION verifier, 16 Oct 2026). A new padding: a kecamatan focus whose outline would leave the new free area (Sederhana
   * → Detail moves the free area by ~560 px) is fitted again in one move; a running flight is re-aimed with its own kind
   * (an easeTo never turns into a flyTo arc) over its true remaining time; otherwise the padding eases.
   */
  function setLayout(padding, opts) {
    if (!padding) return;
    var pad = { top: padding.top || 0, right: padding.right || 0, bottom: padding.bottom || 0, left: padding.left || 0 };
    var prev = S.padding, same = samePadding(pad, prev);
    S.padding = pad;
    if (!S.map) return;
    /* item 43: {still: true} = the cards were arranged (pin, dock, drag, resize, minimise, Rapikan, rail, drawer): the
       map content keeps its place on screen; no ease, no zoom change, no focus re-fit (MCD.windows keepInView may move
       it afterwards). Without it: a selection's layout, as before (the camera follows the free area). */
    if (!same) { if (opts && opts.still) layoutStill(pad, prev); else layoutCamera(pad); }
    invalidateOccluders();
    fitCredits(true);
    queuePlates();
  }
  /** The padding changed with {still}: the centre is moved by the shift of the padded middle, so every point stays at
      the same screen px. A flight under way keeps its landing place on screen (its target is shifted the same way, at
      its own zoom). */
  function layoutStill(pad, prev) {
    var m = S.map, cur = null;
    try { cur = isFn(m.getPadding) ? m.getPadding() : null; } catch (e) { cur = null; }
    cur = cur || prev || {};
    var dx = (((pad.left || 0) - (pad.right || 0)) - ((cur.left || 0) - (cur.right || 0))) / 2;
    var dy = (((pad.top || 0) - (pad.bottom || 0)) - ((cur.top || 0) - (cur.bottom || 0))) / 2;
    if (!S.ready) { try { m.setPadding(pad); } catch (e) { /* ignore */ } return; }
    if (S.flight && m.isMoving && m.isMoving()) {
      var t = S.flight.target, z = finite(t.zoom) ? t.zoom : m.getZoom(), c0 = llArr(t.center);
      var rem = Math.max(motionDur('fast'), S.flight.duration - (now() - S.flight.t0));
      flightGo(Object.assign({}, t, c0 ? { center: shiftLL(c0, z, dx, dy) } : {}, { padding: pad }), rem, !!S.flight.ease, S.flight.id);
      return;
    }
    var c = null;
    try { var g = m.getCenter(); c = shiftLL([g.lng, g.lat], m.getZoom(), dx, dy); } catch (e) { c = null; }
    /* a jump is not an arrival (focus settle, route fit): S.starting marks its moveend */
    S.starting = true;
    try { m.jumpTo(c ? { center: c, padding: pad } : { padding: pad }); } catch (e) { try { m.setPadding(pad); } catch (e2) { /* ignore */ } } finally { S.starting = false; }
    S.flight = null;
  }
  /** [lon, lat] of a centre given as an array or a LngLat. */
  function llArr(c) {
    if (Array.isArray(c) && finite(+c[0]) && finite(+c[1])) return [+c[0], +c[1]];
    if (c && finite(+c.lng) && finite(+c.lat)) return [+c.lng, +c.lat];
    return null;
  }
  /** The centre that is (dx, dy) screen px away from c at zoom z (512 px tiles, flat north-up Web Mercator). */
  function shiftLL(c, z, dx, dy) {
    var k = 512 * Math.pow(2, z), mx = mercX(c[0]) + dx / k, my = mercY(c[1]) + dy / k;
    var e = Math.exp((0.5 - my) * 4 * Math.PI), s = (e - 1) / (e + 1);
    return [mx * 360 - 180, Math.asin(clamp(s, -1, 1)) / D2R];
  }
  function layoutCamera(pad) {
    var flying = !!(S.flight && S.map.isMoving && S.map.isMoving());
    if (S.ready && fxLive() && !FX.userMoved && FX.geo && (flying ? S.flight.id === FX.flightId : !fxFits(pad, true))) {
      fxFly(FX.geo, fxTop());
      return;
    }
    if (flying) {
      /* a flight is under way (a preset, a focusPoint): re-aim it with the new padding, same id, so it still lands */
      var rem = Math.max(motionDur('fast'), S.flight.duration - (now() - S.flight.t0));
      flightGo(Object.assign({}, S.flight.target, { padding: pad }), rem, !!S.flight.ease, S.flight.id);
    } else if (reduced() || !S.ready) S.map.setPadding(pad);
    else S.map.easeTo({ padding: pad, duration: motionDur('base'), easing: motionEase('out') });
  }

  /* ---------------------------------------------------------- failure (§E.12) */

  function showFallback(msg) {
    var el = S.el || DOC.getElementById('map');
    S.failed = msg;
    if (DOC.body) DOC.body.classList.add('no-map');
    if (!el) return;
    var box = h('p', 'map-unavailable mcd-map-fallback', msg);
    box.setAttribute('role', 'status');
    el.appendChild(box);
  }
  function hasWebGL2() {
    try {
      if (!W.WebGL2RenderingContext) return false;
      var c = DOC.createElement('canvas'), gl = c.getContext('webgl2');
      if (!gl) return false;
      /* the GPU's texture side limit (many phones: 8192): canvas atlases such as the kecamatan chips stay inside it */
      try { if (isFn(gl.getParameter)) S.maxTexture = +gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0; } catch (e) { S.maxTexture = 0; }
      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      return true;
    } catch (e) { return false; }
  }
  function imageryFailed(on) {
    if (S.imageryOK === !on) return;
    S.imageryOK = !on;
    setVis('imagery', !on && !S.imageryOff && !isOverview());
    gridMode(on || S.imageryOff);
    renderNotice();
    queueLegend();
    if (on) onIdle();
  }
  function gridMode(on) {
    if (DOC.body) DOC.body.classList.toggle('is-map-offline', !!on && !isOverview());
    applyImagery();
  }
  /* Offline / failed basemap: one plain notice with a Try again button (Overview: street map,
     Deep dive: satellite imagery). Places, rings and figures keep drawing on the plain background. */
  function renderNotice() {
    if (!S.el) return;
    var street = isOverview(), off = !!(W.navigator && W.navigator.onLine === false);
    var failed = !S.imageryOff && (street ? (S.street[S.theme] === 'failed' || !S.ofmOK) : !S.imageryOK);
    if (!failed) { if (S.dom.notice) S.dom.notice.hidden = true; return; }
    if (!S.dom.notice) {
      var n = h('div', 'map-notice');
      n.setAttribute('role', 'status');
      S.dom.noticeT = h('p', 'map-notice__t');
      S.dom.noticeSub = h('p', 'map-notice__sub');
      var retry = h('button', 'btn btn--secondary map-notice__retry', 'Coba lagi');
      retry.type = 'button';
      retry.addEventListener('click', retryBasemap);
      n.appendChild(S.dom.noticeT); n.appendChild(S.dom.noticeSub); n.appendChild(retry);
      S.el.appendChild(n);
      S.dom.notice = n;
    }
    S.dom.notice.hidden = false;
    S.dom.noticeT.textContent = street ? 'Peta jalan tidak dapat dimuat' : 'Peta satelit tidak dapat dimuat';
    S.dom.noticeSub.textContent = (off ? 'Komputer ini sedang offline. ' : 'Server peta tidak merespons. ') + 'Titik, lingkar jarak dan angka tetap tampil.';
  }
  /** After a failed TileJSON the 'ofm' source never retries: drop it and its layers, then add it again. */
  function resetOfm() {
    if (!S.map) return;
    try {
      (S.map.getStyle().layers || []).forEach(function (l) { if (l.source === 'ofm') S.map.removeLayer(l.id); });
      if (S.map.getSource('ofm')) S.map.removeSource('ofm');
    } catch (e) { warn('reset vector tiles', e); }
    S.streetIds = { day: [], night: [] };
    S.street = { day: null, night: null };
    S.ofmOK = true;
    addOfm();
  }
  function retryBasemap() {
    if (!S.ready) return;
    if (!S.ofmOK) resetOfm();
    if (isOverview()) { if (S.street[S.theme] === 'failed') S.street[S.theme] = null; }
    else {
      S.tileErr = [];
      try { var src = S.map.getSource('imagery'); if (src && src.setTiles) src.setTiles([IMAGERY_TILES]); } catch (e) { /* older MapLibre: the next pan reloads */ }
      imageryFailed(false);
    }
    applyBasemap();
  }

  /* ------------------------------------------- loading state (shell polish) */
  /* A calm skeleton (street-grid sheen, "Loading map…") covers the map until the basemap has
     drawn: Overview waits for the street style and its first tiles, Deep dive for the first
     imagery tiles. Then the canvas fades in. A slow basemap never hides the data for long:
     after LOAD_SLOW_MS the map shows and a small note stays until the street map arrives. */
  var LOAD_SLOW_MS = 9000;
  function buildLoading(el, pill) {
    if (S.dom.loading || !el) return;
    var box = h('div', 'map-loading' + (pill ? ' is-pill' : ''));
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.appendChild(h('div', 'map-loading__sheen'));
    var plate = h('div', 'map-loading__plate');
    plate.appendChild(h('span', 'map-loading__spin'));
    S.dom.loadingText = h('span', 'map-loading__t', 'Memuat peta…');
    plate.appendChild(S.dom.loadingText);
    box.appendChild(plate);
    el.appendChild(box);
    S.dom.loading = box;
    if (!pill && DOC.body) DOC.body.classList.add('is-map-loading');
    if (S.load && S.load.timer) clearTimeout(S.load.timer);
    S.load = { first: !pill && !(S.load && S.load.done), done: !!(S.load && S.load.done), settledAt: 0, chk: 0,
      timer: setTimeout(function () { revealMap(true); }, pill ? LOAD_SLOW_MS * 2 : LOAD_SLOW_MS) };
  }
  function basemapPending() {
    if (!S.ready) return true;
    if (isOverview()) return !S.imageryOff && S.street[S.theme] !== 'ok' && S.street[S.theme] !== 'failed';
    return false;
  }
  /* Reveal once the basemap is settled and its tiles are in. 'idle' alone is not enough: the
     beacon ticker keeps the map repainting, so a short poll also checks areTilesLoaded() and
     gives up waiting 2.5 s after the style itself is in. */
  function onIdle() {
    if (!S.dom.loading || !S.ready || !S.load) return;
    if (basemapPending()) { S.load.settledAt = 0; return; }
    var t = now(), tilesIn = true;
    if (!S.load.settledAt) S.load.settledAt = t;
    try { tilesIn = S.map.areTilesLoaded(); } catch (e) { tilesIn = true; }
    if (tilesIn || t - S.load.settledAt > 2500) { revealMap(false); return; }
    if (!S.load.chk) S.load.chk = setTimeout(function () { if (S.load) S.load.chk = 0; onIdle(); }, 250);
  }
  function revealMap(slow) {
    var box = S.dom.loading;
    if (!box) return;
    if (S.load && S.load.timer) { clearTimeout(S.load.timer); S.load.timer = 0; }
    if (S.load && S.load.chk) { clearTimeout(S.load.chk); S.load.chk = 0; }
    if (DOC.body) DOC.body.classList.remove('is-map-loading');
    if (slow && basemapPending()) {            /* still waiting: show the map, keep a small note */
      box.classList.add('is-pill');
      if (S.dom.loadingText) S.dom.loadingText.textContent = 'Peta jalan masih dimuat…';
      return;
    }
    box.classList.add('is-done');
    S.dom.loading = null;
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 700);
    queuePlates();
    S.load = { first: false, done: true, timer: 0, chk: 0, settledAt: 0 };
    setTimeout(prefetchStreet, 1500);
  }
  /* After the first draw, fetch the other theme's street style (one small JSON, hidden layers on
     the same tiles) so Day ⇄ Night switches without a blank map. */
  function prefetchStreet() {
    if (!S.ready || !isOverview()) return;
    var other = S.theme === 'day' ? 'night' : 'day';
    if (!S.street[other]) ensureStreet(other);
  }
  function onMapError(e) {
    var sid = e && (e.sourceId || (e.source && e.source.id));
    var msg = e && e.error && e.error.message ? String(e.error.message) : '';
    if (sid === 'imagery' || /arcgisonline/.test(msg)) {
      var t = now(), lim = (cfg().map && cfg().map.imageryFailure) || {};
      var win = lim.windowMs || 10000, maxErr = lim.errors || 6;
      S.tileErr.push(t);
      while (S.tileErr.length && t - S.tileErr[0] > win) S.tileErr.shift();
      if (S.tileErr.length > maxErr) imageryFailed(true);
    } else if (sid === 'ofm' || /openfreemap/.test(msg)) {
      if (S.ofmOK) { S.ofmOK = false; applyLayerToggles(); queueLegend(); renderNotice(); onIdle(); }
    }
  }
  function setImagery(onOff) {
    S.imageryOff = !onOff;
    if (!S.ready) return;
    applyBasemap();
  }

  /* --------------------------------------------------- telemetry (§E.11) */

  /** mountTelemetry(el): fills el with the live telemetry line (Deep dive) and the km scale bar.
      The map is always north-up, so there is no compass. */
  function mountTelemetry(el) {
    if (!el) return null;
    while (el.firstChild) el.removeChild(el.firstChild);
    el.classList.add('telemetry');
    el.removeAttribute && el.removeAttribute('aria-hidden');
    var line = h('span', 'telemetry__line');
    line.setAttribute('aria-hidden', 'true');
    el.appendChild(line);
    var sc = mountScale(null);
    el.appendChild(sc.root);
    S.dom.tele = { root: el, line: line, scale: sc, last: '' };
    queueTelemetry();
    return el;
  }
  /** mountScale(el?): a labelled km scale bar ("1 km"); app.js shows one in both views. */
  function mountScale(el) {
    var scale = el || h('span', 'scalebar');
    scale.classList.add('scalebar');
    while (scale.firstChild) scale.removeChild(scale.firstChild);
    scale.setAttribute('role', 'img');
    var bar = h('span', 'scalebar__bar');
    var label = h('span', 'scalebar__label');
    scale.appendChild(bar); scale.appendChild(label);
    var rec = { root: scale, bar: bar, label: label };
    S.dom.scales = (S.dom.scales || []).filter(function (x) { return x.root.isConnected !== false && x.root !== scale; });
    S.dom.scales.push(rec);
    queueTelemetry();
    return rec;
  }
  function renderScales() {
    if (!S.map || !S.dom.scales) return;
    var lat = S.map.getCenter().lat, mpp = metersPerPixel(S.zoom, lat);
    var steps = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], best = steps[0];
    for (var i = 0; i < steps.length; i++) if (steps[i] / mpp <= 120) best = steps[i];
    var w = Math.max(8, Math.round(best / mpp)) + 'px', txt = best >= 1000 ? fmtInt(best / 1000) + ' km' : fmtInt(best) + ' m';
    S.dom.scales.forEach(function (sc) {
      sc.bar.style.width = w;
      sc.label.textContent = txt;
      sc.root.setAttribute('aria-label', 'Skala: panjang garis ' + txt);
    });
  }
  function queueTelemetry() {
    if ((!S.dom.tele && !S.dom.scales) || S.teleQueued) return;
    S.teleQueued = true;
    raf(function () { S.teleQueued = false; renderTelemetry(); });
  }
  function telemetryText() {
    var parts = [];
    if (!S.veil) {
      var ll = S.cursorLL;
      if (!ll && S.map) { var c = S.map.getCenter(); ll = [c.lng, c.lat]; }
      if (ll) parts.push(fmtCoord(ll[1], ll[0], 5));
    }
    parts.push('Zoom ' + fmtDec(S.zoom, 1));
    var p = S.posture || {};
    if (isFn(p.telemetry)) {
      try { var extra = p.telemetry(S.derived, mapState()); if (extra) parts.push(extra); } catch (e) { /* ignore */ }
    }
    if (S.tiles.req > S.tiles.done) parts.push('MEMUAT PETA ' + fmtInt(Math.min(S.tiles.done, S.tiles.req)) + '/' + fmtInt(S.tiles.req));
    if (S.fps.on) parts.push('FPS ' + S.fps.v);
    return parts;
  }
  function renderTelemetry() {
    renderScales();
    var t = S.dom.tele;
    if (!t) return;
    var parts = telemetryText();
    var key = parts.join('');
    if (key !== t.last) {
      t.last = key;
      while (t.line.firstChild) t.line.removeChild(t.line.firstChild);
      parts.forEach(function (txt, i) {
        if (i) t.line.appendChild(h('span', 'telemetry__sep', '·'));
        t.line.appendChild(h('span', null, txt));
      });
    }
  }
  function showFps(onOff) {
    S.fps.on = !!onOff;
    if (!S.fps.on) { queueTelemetry(); return; }
    S.fps.n = 0; S.fps.t0 = now();
    (function loop() {
      if (!S.fps.on) return;
      S.fps.n++;
      var t = now();
      if (t - S.fps.t0 >= 1000) { S.fps.v = Math.round(S.fps.n * 1000 / (t - S.fps.t0)); S.fps.n = 0; S.fps.t0 = t; queueTelemetry(); }
      raf(loop);
    })();
  }

  /* ------------------------------------------------------ legend (§E.11) */

  /** The "Pangkalan TNI" legend group (item 34): the same badge sprites as the map, in plain Indonesian. */
  function pangkalanLegend() {
    var th = badgeTheme(), row = function (m, j, label) {
      var sp = badgeSprite({ matra: m, jenis: j, theme: th, px: 22 });
      /* the sprite's canvas is copied into the legend (drawImage): encoding six PNG data URLs here cost ~80 ms of the first
         Merchant mount (F8, 16 Oct 2026). Not enumerable: a legend model stays plain data. */
      var row = { imgKey: sp.id, size: 20, glyph: sp.canvas ? null : 'circle', rgb: MATRA_RGB[th][m], label: label };
      Object.defineProperty(row, 'canvas', { value: sp.canvas || null, enumerable: false });
      return row;
    };
    return { id: 'pangkalan', title: 'Pangkalan TNI', rows: [
      row('AL', 'markas', 'Jangkar: TNI AL, termasuk Marinir'),
      row('AD', 'markas', 'Tank: TNI AD, termasuk Kopassus dan Kodam'),
      row('AU', 'markas', 'Sayap: TNI AU, termasuk Lanud Halim'),
      row('GAB', 'markas', 'Bintang: Mabes TNI dan gabungan (Kemhan, Akademi TNI)'),
      row('AL', 'perumahan', 'Lingkaran bergaris tepi: perumahan atau asrama'),
      row('AL', 'rs', 'Tanda + di sudut: rumah sakit')
    ], note: 'Lingkaran berwarna penuh: markas atau satuan. Titik TNI AL sedikit lebih besar.' };
  }
  /** The zone group (item 30): what the soft shade and the veil mean. */
  function zoneLegend() {
    var z = zonesNow();
    if (z.mode === 'none') return null;
    var ink = zoneInk(), both = 1 - (1 - ink.ring) * (1 - ink.beyond);
    if (z.mode === 'radius') {
      return { id: 'zones', title: 'Area', rows: [
        { area: { color: ink.color, alpha: 0 }, label: 'Jelas: dalam ' + fmtInt(z.km) + ' km dari Mabes TNI' },
        { area: { color: ink.color, alpha: both }, label: 'Pudar: di luar ' + fmtInt(z.km) + ' km' }
      ] };
    }
    var Z = zoneData(z.km), zkm = z.mode === 'kecamatan' ? 30 : 15;
    return { id: 'zones', title: 'Area', rows: [
      { area: { color: ink.color, alpha: 0 }, label: 'Jelas: ' + fmtInt(Z.focus.length) + ' kecamatan dalam ' + zkm + ' km' },
      { area: { color: ink.color, alpha: ink.ring }, label: 'Agak pudar: ' + fmtInt(Z.ring.length) + ' kecamatan tetangga' },
      { area: { color: ink.color, alpha: both }, label: 'Pudar: lebih jauh' }
    ] };
  }

  function legendModel() {
    var p = S.posture || {}, core = p.core || CORE_DEFAULT, groups = [], notes = [];
    if (p.deck === false) return { groups: groups, notes: notes, foot: T_FOOT };
    var sec = [];
    sectionKeys().forEach(function (k) {
      var fn = S.reg.legends[k];
      if (!fn) return;
      try { flatten(fn(S.derived, mapState()), sec); } catch (e) { failOnce('legend:' + k, 'legend ' + k + ' failed', e); }
    });
    sec.forEach(function (g) { groups.push(g); });
    /* V8 P3: the visit plan while it is drawn */
    var pg = planLegend();
    if (pg) groups.push(pg);
    if (core.sites !== false && S.layers.sites) {
      groups.push({ id: 'sites', title: 'Tempat penting', rows: [
        { glyph: 'diamond', rgb: C.gold, label: 'Bank Mandiri (titik terbesar: KCP Cilangkap)' },
        S.layers.competitors ? { glyph: 'square', rgb: C.text2, label: 'Bank lain (tampil saat peta diperbesar)' } : null,
        { glyph: 'bar', rgb: C.text1, label: 'Gerbang kompleks Mabes TNI' }
      ].filter(Boolean) });
      if (core.boundary !== false && S.layers.boundary) groups[groups.length - 1].rows.unshift({ line: C.gold, label: 'Kawasan Mabes TNI (272,6 ha)' });
    }
    /* item 34: the pangkalan TNI group is always in the legend while the map shows places */
    if (core.sites !== false) groups.push(pangkalanLegend());
    var zg = zoneLegend();
    if (zg) groups.push(zg);
    /* item 36: the route from the branch, while one is drawn */
    if (RT.route && (RT.phase === 'draw' || RT.phase === 'on')) {
      var ri = routeInk();
      groups.push({ id: 'route', title: 'Rute dari KCP', rows: [
        { line: ri.line, width: 3, label: 'Rute berkendara dari KCP Cilangkap (perkiraan)' },
        { line: ri.link, dash: '2 2', label: 'Garis putus-putus: dari jalan terdekat ke titik' }
      ] });
    }
    if (core.rings !== false && S.layers.rings) {
      var set = ringSet(S.ringSetName);
      var origin = set.center ? 'dari Mabes TNI' : 'dari cabang';
      groups.push({ id: 'rings', title: 'Lingkar jarak', rows: [{ line: C.text1, dash: '2 3', label: (set.radiiKm || []).join(' · ') + ' km ' + origin }]
        .concat(S.radiusKm != null ? [{ line: C.text1, label: 'Menampilkan ' + S.radiusKm + ' km dari cabang' }] : []) });
    }
    if (S.view === 'overview') { if (!S.ofmOK || S.street[S.theme] === 'failed') notes.push('Peta jalan tidak dapat dimuat.'); }
    else if (!S.ofmOK) notes.push('Nama jalan tidak dapat dimuat.');
    if (S.view !== 'overview' && (!S.imageryOK || S.imageryOff)) notes.push(S.imageryOff ? 'Peta satelit dimatikan.' : 'Peta satelit tidak dapat dimuat.');
    else if (S.view !== 'overview' && !S.trueColour && (S.posture || {}).deck !== false) notes.push('Peta satelit ditampilkan abu-abu. Nyalakan Warna asli untuk warna aslinya.');
    return { groups: groups, notes: notes, foot: T_FOOT };
  }

  /** mountLegend(el): el is the legend BODY (inside the .legend panel); map.js owns its children. */
  function mountLegend(el) {
    if (!el) return null;
    el.classList.add('lg');
    S.dom.legend = el;
    S.legendKey = '';
    renderLegend();
    return el;
  }
  var legendQueued = false;
  function queueLegend() {
    if (!S.dom.legend || legendQueued) return;
    legendQueued = true;
    raf(function () { legendQueued = false; renderLegend(); });
  }
  /** A sprite canvas shown in the legend at size CSS px (sharp at the device pixel ratio), copied with drawImage. */
  function legendCanvas(src, size) {
    var dpr = spriteDpr(), cv = h('canvas', 'lg__img');
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);       /* shown at the .lg__img size (map.css) */
    cv.setAttribute('aria-hidden', 'true');
    try { var ctx = cv.getContext('2d'); if (ctx) ctx.drawImage(src, 0, 0, cv.width, cv.height); } catch (e) { /* an empty square */ }
    return cv;
  }
  /** A legend row {shape, rgb, hollow?, ring?, alpha?}: the map's own sprite (symbolSprite at 18 px, copied from its canvas;
      ring = its keyline colour, so a dark keyline in Gelap matches the map; alpha = a faint symbol), else the SVG glyph. */
  function shapeLegend(r) {
    var sp = symbolSprite({ shape: r.shape, fill: Array.isArray(r.rgb) ? r.rgb : C.text2, ring: Array.isArray(r.ring) ? r.ring : null, hollow: !!r.hollow, px: 18 });
    if (sp && sp.canvas) {
      var cv = legendCanvas(sp.canvas, 18);
      if (finite(r.alpha) && r.alpha < 1 && cv.style) cv.style.opacity = String(Math.max(0, r.alpha));
      return cv;
    }
    var name = { shield: 'shield', triangle: 'tri', diamond: 'diamond', rsq: 'rsquare', circle: 'circle', plus: 'plus', sparkle: 'sparkle' }[r.shape] || 'circle';
    if (r.hollow) name = { shield: 'shieldHollow', tri: 'triHollow', diamond: 'diamondHollow', rsquare: 'rsqOutline', circle: 'ring', plus: 'plusHollow', sparkle: 'sparkleHollow' }[name];
    return glyphSVG(name, r.rgb, 10, r.alpha);
  }
  /** The kelas biaya scale row {tiers: [{level, basis, word}], label?}: each badge over its word ("Reguler · Menengah · Atas ·
      Premium"); the words are the row's text, so a screen reader reads them in order. */
  function tierScaleRow(r) {
    var row = h('div', 'lg__row lg__row--tiers'), box = h('div', 'lg__tiers');
    r.tiers.forEach(function (t) {
      if (!t) return;
      var cell = h('span', 'lg__tier'), sv = tierSVG({ level: t.level, basis: t.basis, theme: S.theme, size: 16 });
      if (sv) cell.appendChild(sv);
      cell.appendChild(h('span', 'lg__tier-word', String(t.word || '')));
      box.appendChild(cell);
    });
    row.appendChild(box);
    if (r.label) row.setAttribute('title', r.label);
    return row;
  }
  function renderLegend() {
    var el = S.dom.legend;
    if (!el) return;
    var model = legendModel();
    /* colours are part of the key: status swatches read --status-* tokens, which change with the theme */
    var key = stableKey({ g: model.groups.map(function (g) { return [g.title, g.ramp, g.note, (g.rows || []).map(function (r) { return [r.label, r.count, r.glyph, r.rgb, r.line, r.alpha, r.width, r.text, r.imgKey || '', r.area, r.muted,
      r.level, r.basis, r.tiers, r.shape, r.hollow, r.ring, r.bars]; })]; }), n: model.notes, t: S.theme });
    if (key === S.legendKey) return;
    S.legendKey = key;
    while (el.firstChild) el.removeChild(el.firstChild);
    model.groups.forEach(function (g) {
      var grp = h('div', 'lg__group');
      grp.setAttribute('data-group', g.id || '');
      if (g.title) grp.appendChild(h('div', 'lg__title t-eyebrow', g.title));
      (g.rows || []).forEach(function (r) {
        /* v6 (V6_SPEC §4.3): the kelas biaya scale, the four bar glyphs in a line with their words under them */
        if (Array.isArray(r.tiers)) { grp.appendChild(tierScaleRow(r)); return; }
        var row = h('div', 'lg__row');
        var gl = h('span', 'lg__glyph');
        /* glyphs: a line (borders, rings), 'chip' (a kecamatan label), 'badge' (a visit number), 'none', or a dot / shape */
        if (r.line) gl.appendChild(lineSVG(r.line, r.dash, r.alpha, r.width));
        else if (r.canvas) gl.appendChild(legendCanvas(r.canvas, r.size || 18));
        else if (r.img) { var im = h('img', 'lg__img'); im.src = r.img; im.alt = ''; im.width = r.size || 18; im.height = r.size || 18; gl.appendChild(im); }
        else if (r.area) { var ar = h('span', 'lg__area'), veil = h('i', null); veil.style.background = r.area.color; veil.style.opacity = String(r.area.alpha); ar.appendChild(veil); gl.appendChild(ar); }
        else if (r.glyph === 'chip') {
          /* V8 (V7_SPEC §5.1): {glyph: 'chip', bars: 1-3} draws the kecamatan chip with its small bars (territory chipBars) */
          var chipG = h('span', 'lg__chip' + (r.muted ? ' lg__chip--muted' : '')), nb = finite(+r.bars) ? clamp(Math.round(+r.bars), 0, 3) : 0;
          if (nb) { chipG.classList.add('lg__chip--bars'); for (var bi = 0; bi < nb; bi++) chipG.appendChild(h('i', 'lg__chip-bar')); }
          gl.appendChild(chipG);
        }
        else if (r.glyph === 'badge') gl.appendChild(h('span', 'lg__badge', r.text || '1'));
        else if (r.glyph === 'tier') {
          /* one badge, or with basis 'both' a filled and an empty one side by side (the "Batang berisi … Batang kosong" row) */
          (r.basis === 'both' ? ['biaya', 'perkiraan'] : [r.basis]).forEach(function (b) {
            var tv = tierSVG({ level: r.level, basis: b, theme: S.theme, size: 14 });
            if (tv) { gl.classList.add('lg__glyph--tier'); gl.appendChild(tv); }
          });
        }
        else if (r.shape && SYMBOL_SHAPES[r.shape]) gl.appendChild(shapeLegend(r));
        else if (r.glyph !== 'none') gl.appendChild(glyphSVG(r.glyph || 'circle', r.rgb, 10, r.alpha));
        row.appendChild(gl);
        row.appendChild(h('span', 'lg__label', r.label));
        if (r.count != null) row.appendChild(h('span', 'chip__count', fmtInt(r.count)));
        grp.appendChild(row);
      });
      if (g.note) grp.appendChild(h('div', 'lg__hint', g.note));
      if (g.ramp) {
        var ramp = h('div', 'lg__ramp');
        g.ramp.colors.forEach(function (c) {
          var sw = h('i', null);
          sw.style.background = Array.isArray(c) ? cssRgb(c) : String(c);
          ramp.appendChild(sw);
        });
        grp.appendChild(ramp);
        var mm = h('div', 'lg__minmax');
        mm.appendChild(h('span', null, g.ramp.min));
        mm.appendChild(h('span', null, g.ramp.max));
        grp.appendChild(mm);
      }
      el.appendChild(grp);
    });
    model.notes.forEach(function (n) { el.appendChild(h('div', 'lg__note', n)); });
    el.appendChild(h('div', 'lg__foot', model.foot));
  }

  /* ------------------------------------------------- fallback stylesheet */
  /* Zero-specificity defaults (:where) so assets/css/map.css always wins.  */

  function injectBaseCSS() {
    if (DOC.getElementById('mcd-map-base-css')) return;
    /* Only what map.css / components.css do not already cover. :where() keeps
       specificity at zero, so any stylesheet rule overrides these defaults. */
    var css = [
      ':where(.mcd-glyph){flex:none;display:inline-block;vertical-align:middle}',
      ':where(.tip__row){flex-wrap:wrap;font-variant-numeric:tabular-nums;white-space:pre-wrap}',
      ':where(.tip__row--body){font:400 12px/16px var(--font-sans)}',
      ':where(.tip__row--clamp){display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:400 12px/16px var(--font-sans);color:var(--text-3)}',
      ':where(.tip__pair){display:inline-flex;align-items:center;gap:3px;margin-right:6px}',
      ':where(.mk){width:0;height:0;transition:opacity var(--dur-fast,180ms) var(--ease-in-out,cubic-bezier(.65,0,.35,1))}',
      ':where(.mk.is-hidden){opacity:0}',
      ':where(.mk-plate){position:absolute;left:0;top:0;cursor:pointer;white-space:nowrap}',
      ':where(.mk-mabes .mk-plate){cursor:default;pointer-events:none;text-align:center}',
      ':where(.mk-site.is-home .mk-site__name){text-transform:uppercase;letter-spacing:.06em}',
      ':where(.mk-leader){position:absolute;left:0;top:0;height:1.5px;margin-top:-.75px;transform-origin:0 50%;background:var(--text-2)}',
      ':where(.mk-dot){position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;display:none}',
      ':where(.mk-mabes.is-offset .mk-dot){display:block;background:var(--gold)}',
      ':where(.lg__group){display:grid;gap:4px}',
      ':where(.lg__group + .lg__group){padding-top:8px;border-top:1px solid var(--rule)}',
      ':where(.lg__title){margin-bottom:2px}',
      ':where(.lg__glyph){width:16px;display:inline-flex;justify-content:center}',
      ':where(.lg__label){flex:1;min-width:0}',
      ':where(.lg__note){font:400 12px/16px var(--font-sans);color:var(--warn)}',
      ':where(.telemetry__line){display:inline-flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}',
      ':where(.scalebar__label){font-size:12px;line-height:14px}'
    ].join('\n');
    var st = DOC.createElement('style');
    st.id = 'mcd-map-base-css';
    st.textContent = css;
    var head = DOC.head || DOC.documentElement;
    head.insertBefore(st, head.firstChild);
  }

  /* ------------------------------------------------------------------ init */

  /* V8 phones (MOBILE_UX_PLAN M4): a fingertip lands several px beside a small point, and a miss closes the open sheet,
     so a coarse pointer picks within 14 px (deck.gl returns the nearest object); a mouse keeps 4 px */
  function pickRadius() { return W.matchMedia && W.matchMedia('(pointer: coarse)').matches ? 14 : 4; }
  function coarsePointer() { try { return !!(W.matchMedia && W.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } }
  /* M10 item 3: a phone with a device pixel ratio of 3 drew 9 pixels per CSS pixel with MSAA; on a coarse pointer the map
     draws at most 2 per CSS pixel, antialias off (gate.js caps its own map at 2 already). A mouse keeps up to 3. */
  function mapPixelRatio() { return Math.min(W.devicePixelRatio || 1, coarsePointer() ? 2 : 3); }
  var PTR = { bound: false };
  /** A pointer change (a tablet's keyboard cover, a phone joined to a screen): picking radius and pixel ratio follow. */
  function watchPointer() {
    if (PTR.bound || !W.matchMedia) return;
    PTR.bound = true;
    var mq = null;
    try { mq = W.matchMedia('(pointer: coarse)'); } catch (e) { mq = null; }
    if (!mq) return;
    var onChange = function () {
      if (S.overlay && isFn(S.overlay.setProps)) { try { S.overlay.setProps({ pickingRadius: pickRadius() }); } catch (e) { /* the old radius stays */ } }
      if (S.map && isFn(S.map.setPixelRatio)) { try { S.map.setPixelRatio(mapPixelRatio()); } catch (e) { /* the old ratio stays */ } }
    };
    try {
      if (isFn(mq.addEventListener)) mq.addEventListener('change', onChange);
      else if (isFn(mq.addListener)) mq.addListener(onChange);
    } catch (e) { /* older browsers keep the first values */ }
  }

  function init(el, opts) {
    opts = opts || {};
    if (S.map) return true;
    el = typeof el === 'string' ? DOC.getElementById(el) : (el || DOC.getElementById('map'));
    S.el = el;
    injectBaseCSS();
    if (!el) { warn('no #map element'); return false; }
    if (!W.maplibregl || !W.deck || !W.deck.MapboxOverlay) { showFallback('Peta tidak dapat dimuat. Periksa internet, lalu muat ulang halaman.'); return false; }
    if (!hasWebGL2()) { showFallback('Browser ini tidak dapat menampilkan peta. Gunakan Chrome, Edge atau Safari terbaru.'); return false; }
    if (opts.padding) S.padding = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, opts.padding);
    if (opts.view === 'overview' || opts.view === 'deep') S.view = opts.view;
    if (opts.theme === 'day' || opts.theme === 'night') S.theme = opts.theme;
    syncFromState();
    if (opts.posture || opts.section) setPosture(opts.section || S.section, opts.tab || null, { camera: false, posture: opts.posture });
    else if (!S.posture) S.posture = resolvePosture(S.section, S.tab);
    var cam = opts.camera ? normCam(opts.camera) : (opts.intro && !reduced() ? INTRO_FROM : homeView());
    cam = Object.assign({}, cam, { pitch: 0, bearing: 0 });      /* always flat and north-up */
    /* the container must be empty: drop the shell's pre-map stage (map.css .stage) */
    Array.prototype.slice.call(el.children || []).forEach(function (c) {
      if (c.classList && (c.classList.contains('stage') || c.classList.contains('map-unavailable'))) el.removeChild(c);
    });
    var m;
    try {
      m = new W.maplibregl.Map({
        container: el, style: style(),
        center: cam.center, zoom: cam.zoom, pitch: 0, bearing: 0,
        maxPitch: 0, minZoom: 9, maxZoom: 19.5, maxBounds: MAX_BOUNDS,
        /* V8 (M10 item 3): at most 2 device px per CSS px and no MSAA on a coarse pointer */
        pixelRatio: mapPixelRatio(), antialias: !coarsePointer(),
        attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
        fadeDuration: 200, refreshExpiredTiles: false,
        // MapLibre's own screen-reader words (canvas and marker titles) in Indonesian (COPY_STYLE item 19)
        locale: { 'Map.Title': 'Peta', 'Marker.Title': 'Penanda peta', 'Popup.Close': 'Tutup', 'ScrollZoomBlocker.CtrlMessage': 'Tekan Ctrl sambil menggulir untuk memperbesar peta',
          'ScrollZoomBlocker.CmdMessage': 'Tekan ⌘ sambil menggulir untuk memperbesar peta', 'TouchPanBlocker.Message': 'Gunakan dua jari untuk menggeser peta',
          'AttributionControl.ToggleAttribution': 'Tampilkan atau sembunyikan sumber peta', 'AttributionControl.MapFeedback': 'Masukan untuk peta' }
      });
    } catch (e) {
      warn('map construction failed', e);
      showFallback('Browser ini tidak dapat menampilkan peta. Gunakan Chrome, Edge atau Safari terbaru.');
      return false;
    }
    S.map = m;
    buildLoading(el, false);                   /* after construction: MapLibre wants an empty container */
    buildColourSwitch(el);                     /* "Warna asli" (satellite only), hidden until Detail */
    try { m.setPadding(S.padding); } catch (e) { /* ignore */ }
    S.zoom = cam.zoom;
    enforceFlat(true);
    setAttribution(S.posture && S.posture.attribution || '');
    wireMapEvents(m);
    m.on('load', function () { onLoad(opts); });
    return true;
  }
  function homeView() {
    var p = presetDef('H');
    if (p && p.center && finite(p.zoom)) return { center: presetCenter(p.center), zoom: p.zoom, pitch: 0, bearing: 0 };
    return HOME_VIEW;
  }
  function normCam(c) {
    if (Array.isArray(c)) return { center: [c[0], c[1]], zoom: c[2], pitch: 0, bearing: 0 };
    return { center: c.center || [c.lon, c.lat], zoom: c.zoom, pitch: 0, bearing: 0 };
  }

  function onLoad(opts) {
    var m = S.map;
    try {
      S.overlay = new W.deck.MapboxOverlay({
        interleaved: true, layers: [], pickingRadius: pickRadius(),
        onHover: onDeckHover, onClick: onDeckClick,
        getCursor: function (st) { return st.isHovering ? 'pointer' : (st.isDragging ? 'grabbing' : ''); }
      });
      m.addControl(S.overlay);
    } catch (e) {
      warn('deck overlay failed', e);
      S.overlay = null; S.deckOK = false;
    }
    watchPointer();
    S.ready = true;
    warmStart();
    addOfm();
    prepareSites();
    buildMarkers();
    installStyles();
    watchSme();
    loadFonts();
    if (S.imageryOff) setImagery(false);
    /* posture camera on boot only when init() had no explicit camera (hash `cam`) and no intro */
    var po = S.postureOpts || {};
    var bootCam = po.camera === true || (po.camera !== false && !(opts && (opts.camera || opts.intro)));
    applyPostureNow(Object.assign({}, po, { camera: bootCam }));
    enforceFlat(true);
    applyBasemap();
    updateFocusMask();
    readCamera();
    compose();
    var list = S.pendingReady.splice(0);
    list.forEach(function (fn) { try { fn(api); } catch (e) { warn('whenReady', e); } });
    emit('ready', api);
  }

  function loadFonts() {
    if (S.fontsReady) return;
    var done = function () {
      if (S.fontsReady) return;
      S.fontsReady = true;
      S.sectionCache.key = '';
      resetPlateSizes();
      compose();
      queuePlates();
    };
    if (!DOC.fonts || !DOC.fonts.load) { done(); return; }
    var loads = ['500 11px "Inter Tight"', '400 10px "IBM Plex Mono"', '500 10px "IBM Plex Mono"'].map(function (f) {
      try { return DOC.fonts.load(f); } catch (e) { return null; }
    }).filter(Boolean);
    var timer = setTimeout(done, 3000);
    Promise.all(loads).then(function () { return DOC.fonts.ready; }).then(function () { clearTimeout(timer); done(); }, function () { clearTimeout(timer); done(); });
  }

  function readCamera() {
    if (!S.map) return;
    S.zoom = S.map.getZoom();
  }
  function getCamera() {
    if (!S.map) return null;
    var c = S.map.getCenter();
    return { lon: +c.lng.toFixed(5), lat: +c.lat.toFixed(5), zoom: +S.map.getZoom().toFixed(2), pitch: 0, bearing: 0 };
  }
  function setCamera(cam, opts) {
    if (!S.map || !cam) return;
    var c = normCam(cam);
    if (opts && opts.animate) cameraTo(c); else S.map.jumpTo(Object.assign(viewTarget(c), { padding: S.padding }));
  }

  /* Glass while the map moves (COPY_STYLE_EN item 15). Blurred panels are re-composited on every
     map frame; when a drag, zoom or flight runs below 40 fps, html.is-glass-lite swaps in a light
     6 px blur and a firmer tint (brand.css) until the map has stopped. */
  var GL = { on: false, moving: false, raf: 0, t: 0, n: 0, sum: 0, off: 0 };
  function glassLite(on) {
    if (GL.on === on) return;
    GL.on = on;
    try { DOC.documentElement.classList.toggle('is-glass-lite', on); } catch (e) { /* ignore */ }
  }
  function glassSample(ts) {
    GL.raf = 0;
    if (!GL.moving) return;
    var t = ts || now();
    if (GL.t) { var dt = t - GL.t; if (dt > 0 && dt < 1500) { GL.sum += dt; GL.n++; } }
    GL.t = t;
    if (GL.n >= 6) { if (GL.sum / GL.n > 25) glassLite(true); GL.n = 0; GL.sum = 0; }   /* 6 frames: about 0.1 s at 60 fps */
    GL.raf = raf(glassSample);
  }
  function glassMoveStart() {
    clearTimeout(GL.off);
    if (GL.moving) return;
    GL.moving = true; GL.t = 0; GL.n = 0; GL.sum = 0;
    if (!GL.raf) GL.raf = raf(glassSample);
  }
  function glassMoveEnd() {
    GL.moving = false;
    clearTimeout(GL.off);
    GL.off = setTimeout(function () { if (!GL.moving) glassLite(false); }, 220);
  }

  function wireMapEvents(m) {
    var lastZq = quant(S.zoom, 0.25), zoomQueued = false, moveQueued = false;
    m.on('zoom', function () {
      if (zoomQueued) return;
      zoomQueued = true;
      raf(function () {
        zoomQueued = false;
        S.zoom = m.getZoom();
        var zq = quant(S.zoom, 0.25);
        if (zq !== lastZq) { lastZq = zq; compose(); }
      });
    });
    m.on('zoomend', function () {
      S.zoom = m.getZoom();
      if (S.wideView && S.zoom > 12.5) { S.wideView = false; S.siteVisKey = ''; compose(); }
    });
    m.on('move', function () {
      if (FX.dom && FX.id) FX.dirty = true;               /* item 38: the mask follows the camera (written on 'render') */
      if (moveQueued) return;
      moveQueued = true;
      raf(function () {
        moveQueued = false;
        layoutLabels();
        renderTelemetry();
      });
    });
    m.on('movestart', glassMoveStart);
    m.on('moveend', glassMoveEnd);
    /* item 38: the focus mask and outline are rewritten in the same frame as the canvas, after MapLibre drew it */
    m.on('render', function () { if (FX.dirty && FX.id) fxMask(); });
    /* staff moved the map during a focus: closing it then keeps their view instead of flying back */
    m.on('movestart', function (e) { if (e && e.originalEvent && FX.id) FX.userMoved = true; });
    m.on('moveend', function () {
      /* the moveend of a move that a new flight interrupts (sent inside flyTo / easeTo) is not an arrival */
      if (!m.isMoving() && !S.starting) {
        if (FX.id && !FX.settled && FX.phase !== 'exit') { FX.settled = true; emit('focus', fxState()); }
        if (RT.phase === 'wait') routeSettle();
        else if (RT.phase === 'draw') routeChipShow(true);       /* the chip as the camera lands (the line may still draw) */
      }
    });
    m.on('moveend', function () {
      readCamera();
      /* the flight that ended (or was interrupted); a new one writes its record after its flyTo returns (flightGo) */
      if (S.flight && !m.isMoving()) S.flight = null;
      emit('camera', { camera: getCamera() });
      queuePlates();
    });
    m.on('mousemove', function (e) {
      S.cursorLL = e && e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : null;
      queueTelemetry();
    });
    m.on('mouseout', function () { S.cursorLL = null; queueTelemetry(); hideTip(); });
    m.on('error', onMapError);
    m.on('sourcedataloading', function (e) { if (e && e.tile) { S.tiles.req++; queueTelemetry(); } });
    m.on('sourcedata', function (e) { if (e && e.tile) { S.tiles.done++; queueTelemetry(); if (S.dom.loading) onIdle(); } });
    m.on('idle', function () { if (S.tiles.req) { S.tiles.req = 0; S.tiles.done = 0; queueTelemetry(); } onIdle(); baseCut(); });
    m.on('resize', function () { invalidateOccluders(); queuePlates(); if (FX.dom) { fxSize(); FX.dirty = true; } });
    m.on('dragstart', function () { hideTip(); S.dragging = true; });
    m.on('dragend', function () { S.dragging = false; });
    /* a rotate or pitch that slips through (an old link, a section call) is levelled at once */
    m.on('pitchend', function () { if (m.getPitch() !== 0) enforceFlat(true); });
    m.on('rotateend', function () { if (m.getBearing() !== 0) enforceFlat(true); });
    DOC.addEventListener('visibilitychange', function () { if (!DOC.hidden) { S.ticker.last = 0; ensureTicker(); } });
    /* where the last press began (touch ghost clicks, ghostClick above); capture phase, so the map's own handlers and
       stopPropagation never hide it */
    DOC.addEventListener('pointerdown', notePress, true);
    /* item 38: Esc that nothing else used (a popover, the drawer, a selection) leaves the focus */
    W.addEventListener('keydown', function (e) {
      if (e && e.key === 'Escape' && !e.defaultPrevented && FX.id && FX.phase !== 'exit' && FX.phase !== 'off') fxClear('esc');
    });
    /* item 36: "Jam sibuk" / "Motor (tanpa tol)" changed: the route and its chip follow */
    W.addEventListener('mcd:distance', function () { routeRetime(); });
    /* a panel that slid or faded (sheet away / back, drawer, legend, section entrance) changes what
       the labels must avoid: re-fit them once it has settled */
    var panelSettled = function (e) {
      var t = e && e.target, prop = e && e.propertyName;
      if (!t || !t.matches || !S.occluderSel) return;
      if (prop && !/transform|translate|opacity|visibility|width|height|top|right|bottom|left/.test(prop)) return;
      var isPanel = false;
      try { isPanel = t.matches(S.occluderSel) && !t.classList.contains('maplibregl-ctrl-attrib'); } catch (err) { isPanel = false; }
      if (isPanel) { invalidateOccluders(); queuePlates(); }
    };
    DOC.addEventListener('transitionend', panelSettled, true);
    DOC.addEventListener('animationend', panelSettled, true);
    W.addEventListener('offline', function () { imageryFailed(true); renderNotice(); });
    W.addEventListener('online', function () {
      S.tileErr = []; imageryFailed(false);
      if (S.street[S.theme] === 'failed' || !S.ofmOK) retryBasemap(); else renderNotice();
    });
    if (mqReduce) {
      var onChange = function () { compose(); };
      if (mqReduce.addEventListener) mqReduce.addEventListener('change', onChange); else if (mqReduce.addListener) mqReduce.addListener(onChange);
    }
  }

  /* --------------------------------------------------------------- intro */

  /* intro({preset}): the sign-in flight ends on that preset (the Overview lands on 15 km around Mabes) */
  function introTarget(key) {
    var p = key ? presetDef(key) : null;
    if (!p || isFn(p.run)) return homeView();
    S.wideView = isWidePreset(p);
    if (p.fit || p.bounds) {
      var ff = focusFit(p), bb = ff || presetBounds(p), cam = null;
      if (!bb) return homeView();
      try { cam = S.map.cameraForBounds(bb, { padding: ff ? CHIP_FIT_PAD : 32, bearing: 0 }); } catch (e) { cam = null; }
      if (!cam) return homeView();
      var c = cam.center;
      return { center: Array.isArray(c) ? c : [c.lng, c.lat], zoom: Math.min(cam.zoom, 16.4), pitch: 0, bearing: 0 };
    }
    var t = isFn(p.camera) ? p.camera() : (p.camera || p);
    return t && t.center && finite(t.zoom) ? { center: presetCenter(t.center), zoom: t.zoom, pitch: 0, bearing: 0 } : homeView();
  }
  function intro(opts) {
    if (!S.ready) { S.pendingReady.push(function () { intro(opts); }); return; }
    var m = S.map;
    var target = introTarget(opts && opts.preset);
    var homeView = function () { return target; };
    if (reduced()) { m.jumpTo(Object.assign(viewTarget(homeView()), { padding: S.padding })); S.beaconAlpha = 1; compose(); return; }
    var skipped = false, timers = [];
    var finish = function () {
      if (skipped) return;
      skipped = true;
      timers.forEach(clearTimeout);
      DOC.removeEventListener('keydown', finish, true);
      if (S.el) { S.el.removeEventListener('mousedown', finish, true); S.el.removeEventListener('wheel', finish, true); S.el.removeEventListener('touchstart', finish, true); }
      S.beaconAlpha = 1;
      setPaint('imagery', 'raster-opacity-transition', { duration: 300, delay: 0 });
      setPaint('imagery', 'raster-opacity', 1);
      m.jumpTo(Object.assign(viewTarget(homeView()), { padding: S.padding }));
      compose();
    };
    m.jumpTo(Object.assign(viewTarget(INTRO_FROM), { padding: S.padding }));
    /* imagery fades in from --canvas: cut to 0 without transition, then 600 ms up */
    setPaint('imagery', 'raster-opacity-transition', { duration: 0, delay: 0 });
    setPaint('imagery', 'raster-opacity', 0);
    S.beaconAlpha = 0;
    compose();
    timers.push(setTimeout(function () {
      setPaint('imagery', 'raster-opacity-transition', { duration: 600, delay: 0 });
      setPaint('imagery', 'raster-opacity', 1);
    }, 50));
    timers.push(setTimeout(function () {
      var tv = viewTarget(homeView());
      flightGo(Object.assign(tv, { padding: S.padding }), flightMs(cameraKm(tv)), true, 0, motionEase('out'));
    }, 60));
    timers.push(setTimeout(function () {
      tween(900, outExpo, function (v) { S.beaconAlpha = v; scheduleCompose(); });
    }, 900));
    timers.push(setTimeout(function () {
      skipped = true;
      DOC.removeEventListener('keydown', finish, true);
      if (S.el) { S.el.removeEventListener('mousedown', finish, true); S.el.removeEventListener('wheel', finish, true); S.el.removeEventListener('touchstart', finish, true); }
    }, 2400));
    DOC.addEventListener('keydown', finish, true);
    if (S.el) { S.el.addEventListener('mousedown', finish, true); S.el.addEventListener('wheel', finish, { capture: true, passive: true }); S.el.addEventListener('touchstart', finish, { capture: true, passive: true }); }
  }

  /* --------------------------------------------------------------- render */

  function render(derived, opts) {
    opts = opts || {};
    if (derived !== undefined && derived !== S.derived) {
      S.derived = derived;
      S.derivedSeq++;
    }
    syncFromState();
    if (opts.hover !== undefined) setHover(opts.hover);
    if (S.ready) watchSme();
    if (S.ready) {
      if (prepareSites()) S.siteVisKey = '';
      if (S.ringKey.split('|').pop() !== branchKey()) updateRings();
    }
    compose();
  }
  function requestRender() { S.sectionVersion++; scheduleCompose(); queueLegend(); }

  function setLayers(patch) {
    S.layers = Object.assign({}, S.layers, patch || {});
    S.siteVisKey = '';
    applyLayerToggles();
    compose();
  }
  function setLayerSet(name) {
    if (name === S.layerSet) return;
    S.layerSet = name || null;
    if (S.posture) S.posture = resolvePosture(S.section, S.tab, S.postureOpts && S.postureOpts.posture);
    compose();
    queueLegend();
  }
  function setHover(hv) {
    var k = stableKey(hv);
    if (k === S.hoverKey) return;
    S.hover = hv || null; S.hoverKey = k;
    compose();
  }
  function select(sel) {
    /* extra is kept: KPR's price area names its kecamatan there (extra.kecamatanId), and focus mode follows it */
    S.selection = sel && sel.kind ? (sel.extra ? { kind: sel.kind, id: sel.id, extra: sel.extra } : { kind: sel.kind, id: sel.id }) : null;
    selectionChanged(S.selection);
    compose();
  }

  function focusSite(id, opts) {
    var s = S.sitesById.get(id);
    if (!s || !S.map) return false;
    S.selection = { kind: 'site', id: id };
    cameraTo({ center: s.position, zoom: (opts && opts.zoom) || 15 }, opts);
    compose();
    return true;
  }
  /**
   * Room for the section's drawer (side drawer, ≥ 768 px): the drawer slides over the right of the map (--drawer-w,
   * 8 px from the edge) but the map padding does not include it, so a point centred in the free area lands beside
   * its edge, under the map controls. Returns how many px the camera centre moves east of the point, so the point
   * sits in the middle of the map area left of the drawer instead; 0 on phones (the drawer is a bottom sheet there).
   */
  /** The left edge of the section drawer in viewport px (side drawer, ≥ 768 px), whether it is open or not; 0 below
      (phones: a bottom sheet, which the shell adds to the map padding). */
  function drawerLeftPx() {
    var vw = W.innerWidth || 0;
    if (vw < 768) return 0;
    if (wsActive()) return 0;                 /* item 43: the cards are in the map padding already (MCD.windows) */
    var dw = 400;
    try { var v = parseFloat(W.getComputedStyle(DOC.documentElement).getPropertyValue('--drawer-w')); if (v > 0) dw = v; } catch (e) { /* 400 px */ }
    return vw - 8 - Math.min(dw, vw - 16);
  }
  function drawerShiftPx() {
    var vw = W.innerWidth || 0;
    if (vw < 768 || !S.map || !S.map.getContainer) return 0;      /* 768–1023 px: the drawer is a 400 px side panel too */
    if (wsActive()) return 0;                 /* item 43: the docked card is in the map padding already (MCD.windows) */
    var mr = S.map.getContainer().getBoundingClientRect();
    var drawerLeft = drawerLeftPx();
    var room = Math.max(0, Math.min(mr.right, vw) - drawerLeft + 16);   /* map px under the drawer, plus a gap */
    var padL = S.padding.left || 0, padR = S.padding.right || 0;
    if (room <= padR) return 0;
    /* never push the point out of the free area on the left (a wide guide panel on a small laptop) */
    var free = mr.width - padL - room;
    if (free < 160) room = Math.max(padR, mr.width - padL - 160);
    return Math.max(0, (room - padR) / 2);
  }
  /**
   * focusPoint({lon, lat, zoom?, kind?, id?, object?, drawer?}) → true | false. Flies to the point (zoom 16 by default,
   * flat and north-up, inside the free map area) and, with a kind and id, selects it: once the camera has
   * arrived the map reports a pick {kind, id, x, y, focus: true}, exactly like a click on that point, so the
   * section's registered popup or drawer opens (MCD.app.focus → section onAction 'focus:<kind>:<id>').
   * With a kind and id on a desktop screen the point lands left of where the drawer will open (drawer: false: centred).
   * A layout change during the flight (setLayout) re-aims it; a newer focusPoint or another camera move supersedes it.
   */
  function focusPoint(o) {
    if (!o) return false;
    var lon = +o.lon, lat = +o.lat;
    if (!finite(lon) || !finite(lat)) return false;
    if (!S.map || !S.ready) { if (S.map || !S.failed) S.pendingReady.push(function () { focusPoint(o); }); return !S.failed; }
    var pos = [lon, lat], zoom = finite(+o.zoom) ? +o.zoom : 16;
    var sel = o.kind && o.id != null ? { kind: String(o.kind), id: o.id } : null;
    if (sel && o.extra && typeof o.extra === 'object') sel.extra = o.extra;     /* item 43: {trail: kecamatanId} */
    var seq = ++S.focusSeq, done = false, timer = 0, flightId = 0, waits = 0;
    /* every way out removes the listener and the timer first, so a superseded focus leaves nothing behind */
    var stop = function () {
      done = true;
      clearTimeout(timer);
      try { S.map.off('moveend', onEnd); } catch (e) { /* ignore */ }
    };
    var fire = function () {
      if (done) return;
      stop();
      if (seq !== S.focusSeq || !sel) return;
      var pt = null;
      try { pt = S.map.project(pos); } catch (e) { pt = null; }
      emit('pick', { kind: sel.kind, id: sel.id, object: o.object || null, layerId: 'focus-point', coordinate: pos,
        x: pt ? pt.x : null, y: pt ? pt.y : null, focus: true });
    };
    /* the moveend of a re-aim (setLayout during the flight), or of the flight a newer one interrupts, is not the arrival */
    var onEnd = function () {
      if (seq !== S.focusSeq) { stop(); return; }
      if (!S.reaim && !S.starting) fire();
    };
    /* the fallback: a re-aimed flight may end later than planned, so wait a little longer while it is still ours and moving */
    var onTimer = function () {
      if (!done && S.flight && S.flight.id === flightId && S.map.isMoving && S.map.isMoving() && waits++ < 6) { timer = setTimeout(onTimer, 400); return; }
      fire();
    };
    var key = sel ? sel.kind + ':' + sel.id : '';
    /* item 43 trail (§4.2.3): an item of the focused kecamatan (its list, or a point inside it) keeps the focus and the
       camera: no flight to the point and no route frame (MCD.windows keepInView, or trailKeepSoon, clears the point);
       the pick is reported at once, as for a camera that is already there */
    var tk = sel ? trailOf(sel, pos) : null;
    if (sel) { S.selection = sel; LASTPT.key = key; LASTPT.pos = pos; LASTPT.t = now(); }
    hideTip();
    if (tk) {
      SEL.key = key;
      trailHold(tk);
      if (o.route !== false && routeKindOk(sel.kind) && !(RT.key === key && RT.phase !== 'off')) routeStart(key, pos, null, null, { trail: true });
      timer = setTimeout(onTimer, 40);
      compose();
      return true;
    }
    var center = pos, dur, z = zoom;
    var shift = sel && o.drawer !== false ? drawerShiftPx() : 0;
    /* item 36: a point with a route is framed WITH its route from the branch, Google-style, in this one flight, when the
       route data is at hand (at zoom 16 a 22 km route showed its last few hundred metres, the branch 6 km off screen;
       STAFF verifier, 16 Oct 2026); never closer than the asked zoom, never further out than 11 */
    var routed = !!(sel && o.route !== false && routeKindOk(sel.kind));
    var rcam = routed ? routeCamera(pos, zoom, sel && o.drawer !== false) : null;
    if (rcam) { center = rcam.center; z = rcam.zoom; }
    else if (shift > 0) center = [lon + shift * 360 / (512 * Math.pow(2, clamp(zoom, 9, 19.5))), lat];
    dur = flightMs(cameraKm({ center: center, zoom: z }));
    cameraTo({ center: center, zoom: z }, { duration: dur });
    flightId = S.flight ? S.flight.id : 0;
    /* the route starts with the flight (not after it): it draws out over the last part of the flight; the section's own
       selection of this point, when it follows, changes nothing (SEL.key) */
    if (routed) {
      SEL.key = key;
      pointSelected(sel);
      routeStart(key, pos, null, null);
      RT.prefit = rcam ? key : '';
      RT.fitFlight = rcam ? flightId : 0;
    }
    /* listen after the flight started: a flight it interrupted ends (moveend) inside cameraTo; a jump (reduced
       motion) or a camera that is already there sends no later moveend, so a timer is the fallback */
    var moving = !!(S.map.isMoving && S.map.isMoving());
    if (moving) S.map.on('moveend', onEnd);
    timer = setTimeout(onTimer, moving ? dur + 600 : 40);
    compose();
    return true;
  }
  /** flyTo({center, zoom}) — any pitch or bearing in the target is ignored (flat map). */
  function flyTo(target, opts) {
    if (!S.map || !target) return;
    var cur = { zoom: S.map.getZoom() };
    cameraTo(normCam(Object.assign({}, cur, target)), opts);
  }
  /** fitBounds(bounds, {maxZoom}) — flat and north-up whatever opts.pitch / opts.bearing say. */
  function fitBounds(bounds, opts) { fitTo(bounds, opts || {}); }

  function clearData() {
    S.derived = null; S.derivedSeq++; S.selection = null; S.hover = null; S.hoverKey = '';
    SEL.key = '';
    routeClear(true);
    fxClear('section');
    hideTip();
    compose();
  }

  /* ======================================== v4: kecamatan focus mode and route lines (items 36, 38) */

  /* ---- shared geometry (pure; tests/map-v4.test.mjs) ---- */

  function mercX(lon) { return (lon + 180) / 360; }
  function mercY(lat) { var s = Math.sin(clamp(lat, -85.05, 85.05) * D2R); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }
  /**
   * affineOf(project, a, b) → {ax, bx, ay, by} | null: screen x = ax·mercX(lon) + bx, y = ay·mercY(lat) + by. The map is
   * flat and north-up (no pitch, no bearing), so Web Mercator lands on the screen by scale and offset only: two projected
   * points give the whole transform, and every vertex after that costs two multiply-adds instead of a map.project().
   */
  function affineOf(project, a, b) {
    var pa, pb;
    try { pa = project(a); pb = project(b); } catch (e) { return null; }
    if (!pa || !pb) return null;
    var x0 = mercX(a[0]), y0 = mercY(a[1]), x1 = mercX(b[0]), y1 = mercY(b[1]);
    if (x1 === x0 || y1 === y0) return null;
    var ax = (pb.x - pa.x) / (x1 - x0), ay = (pb.y - pa.y) / (y1 - y0);
    if (!finite(ax) || !finite(ay) || !finite(pa.x) || !finite(pa.y)) return null;
    return { ax: ax, bx: pa.x - ax * x0, ay: ay, by: pa.y - ay * y0 };
  }
  /** Rings [[lon, lat], …] → Web-Mercator Float64Arrays [x0, y0, x1, y1, …] (once per kecamatan). */
  function mercRings(rings) {
    return rings.map(function (r) {
      var a = new Float64Array(r.length * 2);
      for (var i = 0; i < r.length; i++) { a[2 * i] = mercX(r[i][0]); a[2 * i + 1] = mercY(r[i][1]); }
      return a;
    });
  }
  var PATH_LIMIT = 1e6;
  function r1(v) { return Math.round(v * 10) / 10; }
  /** SVG path data of the rings on screen. A vertex closer than minPx (default 0.6) to the last one drawn is skipped:
      the outline stays exact to the pixel while a whole kecamatan at zoom 11 needs only a few dozen points. */
  function ringsPathData(mr, aff, minPx) {
    var out = '', m = minPx == null ? 0.6 : minPx;
    for (var k = 0; k < mr.length; k++) {
      var a = mr[k], n = a.length / 2, s = '', lx = 0, ly = 0, emitted = 0;
      if (n < 3) continue;
      for (var i = 0; i < n; i++) {
        var x = clamp(aff.ax * a[2 * i] + aff.bx, -PATH_LIMIT, PATH_LIMIT), y = clamp(aff.ay * a[2 * i + 1] + aff.by, -PATH_LIMIT, PATH_LIMIT);
        if (emitted && i < n - 1 && Math.abs(x - lx) + Math.abs(y - ly) < m) continue;
        s += (emitted ? 'L' : 'M') + r1(x) + ' ' + r1(y);
        lx = x; ly = y; emitted++;
      }
      if (emitted >= 3) out += s + 'Z';
    }
    return out;
  }
  /** The inverse mask: the whole w × h box with the kecamatan cut out (CSS clip-path, fill-rule evenodd). */
  function maskPathData(mr, aff, w, h, minPx) {
    return 'M0 0H' + r1(w) + 'V' + r1(h) + 'H0Z' + ringsPathData(mr, aff, minPx);
  }
  /**
   * makePip(rings) → test(lon, lat): even-odd point-in-polygon over every ring (holes and islands included). The edges
   * are indexed in 64 latitude bands, so a test reads a handful of edges: 35,000 merchant points take a few ms.
   */
  function makePip(rings) {
    var all = [];
    (rings || []).forEach(function (r) { for (var i = 0; i < r.length; i++) all.push(r[i]); });
    var bb = bboxOf(all);
    if (!bb) { var none = function () { return false; }; none.bbox = null; return none; }
    var w = bb[0][0], s = bb[0][1], e = bb[1][0], n = bb[1][1], N = 64, bh = (n - s) / N || 1e-12, bands = [];
    for (var b = 0; b < N; b++) bands.push([]);
    rings.forEach(function (r) {
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
        var ya = r[i][1], yb = r[j][1];
        if (ya === yb) continue;
        var b0 = clamp(Math.floor((Math.min(ya, yb) - s) / bh), 0, N - 1), b1 = clamp(Math.floor((Math.max(ya, yb) - s) / bh), 0, N - 1);
        var edge = [r[i][0], ya, r[j][0], yb];
        for (var k = b0; k <= b1; k++) bands[k].push(edge);
      }
    });
    var test = function (lon, lat) {
      if (!(lon >= w && lon <= e && lat >= s && lat <= n)) return false;
      var list = bands[clamp(Math.floor((lat - s) / bh), 0, N - 1)], inside = false;
      for (var q = 0; q < list.length; q++) {
        var ed = list[q], xi = ed[0], yi = ed[1], xj = ed[2], yj = ed[3];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };
    test.bbox = bb;
    return test;
  }
  /** Approximate metres between two [lon, lat] (equirectangular; good to well under 1% over a route leg). */
  function legM(a, b) {
    var kx = 111320 * Math.cos(((a[1] + b[1]) / 2) * D2R), dx = (b[0] - a[0]) * kx, dy = (b[1] - a[1]) * 110574;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function cumLengths(coords) {
    var c = new Float64Array(coords.length);
    for (var i = 1; i < coords.length; i++) c[i] = c[i - 1] + legM(coords[i - 1], coords[i]);
    return c;
  }
  /** The first share t (0–1) of a line by length, ending on an interpolated point (the line drawing out). */
  function partialPath(coords, cum, t) {
    var n = coords ? coords.length : 0;
    if (n < 2 || t >= 1) return coords || [];
    if (!(t > 0)) return [coords[0], coords[0]];
    var L = cum[n - 1] * t, lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= L) lo = mid; else hi = mid; }
    var seg = cum[hi] - cum[lo], f = seg > 0 ? (L - cum[lo]) / seg : 0;
    var out = coords.slice(0, lo + 1);
    out.push([lerp(coords[lo][0], coords[hi][0], f), lerp(coords[lo][1], coords[hi][1], f)]);
    return out;
  }
  /** A short straight stretch as dash pieces of onPx / offPx at this zoom ([] when it is shorter than one dash). */
  function dashPieces(a, b, zoom, onPx, offPx) {
    var mpp = metersPerPixel(zoom, (a[1] + b[1]) / 2), len = legM(a, b) / (mpp || 1), step = onPx + offPx, out = [];
    if (!(len >= onPx)) return out;
    for (var d0 = 0; d0 < len; d0 += step) {
      var t0 = d0 / len, t1 = Math.min(1, (d0 + onPx) / len);
      out.push({ path: [[lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)]] });
    }
    return out;
  }

  /* ---- kecamatan focus mode (item 38) ----
   * Whenever a kecamatan is opened (a map chip or outline, "Lihat kecamatan", a kecamatan row in a list or chart, search,
   * the Ringkasan drill-down), in every section: the camera fits it in the free map area; everything outside recedes
   * behind a frosted layer (an overlay above the map canvas with backdrop-filter blur + dim + desaturate, clipped by an
   * inverse mask that is exactly the kecamatan projected to the screen, rewritten on every map frame); deck points, chips
   * and badges outside fade to 15% and lose their labels and hover; the outline draws in (a 500 ms stroke reveal).
   * Tutup, Esc, a click outside the kecamatan or another selection animate back.
   *
   * Signals ("holders"), the newest wins: 'selection' (MCD.state selection of a kecamatan kind: territory-kec, smaKec, …),
   * 'popup' (the territory popup), 'filter' (the Merchant kecamatan filter, MCD.sme.view().kec) and 'api'
   * (MCD.map.focusArea). The signals of one interaction are read together after FOCUS_SETTLE_MS, so a selection that a
   * section clears at once while its popup stays open never flickers the focus. */
  var FOCUS_FADE = 0.15;
  var FOCUS_SETTLE_MS = 24;
  var POPUP_ROOM = 352;                       /* the territory popup (320 px) and its gap, beside the kecamatan */
  var FX = { id: null, phase: 'off', p: 0, from: 0, to: 0, t0: 0, dur: 0, ease: null, done: null, raf: 0, timer: 0,
    holders: {}, seq: 0, geo: null, dom: null, dirty: false, cam: null, userMoved: false, back: false, fast: false,
    lite: false, strikes: 0, slow: { n: 0, sum: 0, t: 0, t0: 0 }, flightId: 0, settled: true, aff: null, pause: 0, fitSrc: null, enterT: 0 };
  var FGEO = {};
  var FOCUS_INK = {
    day:   { veil: 'rgba(236,238,242,0.34)', strong: 'rgba(236,238,242,0.8)', filter: 'blur(7px) saturate(0.25) brightness(0.93)' },
    night: { veil: 'rgba(8,11,17,0.38)', strong: 'rgba(8,11,17,0.76)', filter: 'blur(7px) saturate(0.28) brightness(0.78)' }
  };

  function isKecKind(kind) {
    kind = String(kind || '');
    return kind === 'territory-kec' || kind === 'kecamatan' || kind === 'kec' || /[a-z]Kec(amatan)?$/.test(kind);
  }
  /** The geometry of one kecamatan for the focus: rings, Web-Mercator rings, bbox and a point test; null if unknown. */
  function focusGeo(id) {
    id = String(id == null ? '' : id);
    if (FGEO[id]) return FGEO[id];
    if (!/^\d\d\.\d\d\.\d\d$/.test(id)) return null;
    var A = W.MCD_ADMIN_AREAS, rec = null, c = null;
    try { rec = A && isFn(A.byId) ? A.byId(id) : null; } catch (e) { rec = null; }
    if (!rec || !rec.geometry || !isFn(A.coordinates)) return null;
    try { c = A.coordinates(rec); } catch (e) { return null; }
    var type = rec.geometry.type, polys = type === 'Polygon' ? [c] : (type === 'MultiPolygon' ? c : []), rings = [];
    (polys || []).forEach(function (p) { (p || []).forEach(function (r) { if (Array.isArray(r) && r.length >= 4) rings.push(r); }); });
    if (!rings.length) return null;
    var pip = makePip(rings);
    FGEO[id] = { id: id, name: rec.name || '', rings: rings, merc: mercRings(rings), bbox: pip.bbox, pip: pip,
      anchor: [pip.bbox[0], pip.bbox[1]], label: Array.isArray(rec.label) ? rec.label : null };
    return FGEO[id];
  }
  function fxLive() { return !!(FX.id && FX.geo && (FX.phase === 'enter' || FX.phase === 'on')); }
  function fxOn() { return !!(FX.id && FX.geo && FX.phase !== 'off'); }
  function fxInside(pos) { return !!(FX.geo && pos && FX.geo.pip(+pos[0], +pos[1])); }
  function fxState() {
    return { id: FX.id, phase: FX.phase, p: Math.round(FX.p * 1000) / 1000, name: FX.geo ? FX.geo.name : '',
      sources: Object.keys(FX.holders).sort(), lite: !!FX.lite, settled: !!FX.settled };
  }
  /** The newest signal: {id, source, opts} | null. Signals older than FX.pause wait while a point is selected. */
  function fxTop() {
    var best = null, name = null;
    Object.keys(FX.holders).forEach(function (k) { var x = FX.holders[k]; if (x && x.seq > FX.pause && (!best || x.seq > best.seq)) { best = x; name = k; } });
    return best ? { id: best.id, source: name, opts: best.opts || {} } : null;
  }
  function popupOpenId() {
    var T = MCD.territory;
    try { return T && isFn(T.popupOpen) ? T.popupOpen() : null; } catch (e) { return null; }
  }
  /** fxHold(source, id | null, opts): a signal holds (or releases) the focus; read together after FOCUS_SETTLE_MS. */
  function fxHold(source, id, opts) {
    if (id == null || id === '') {
      if (FX.holders[source]) { delete FX.holders[source]; fxSchedule(); }
      return;
    }
    var cur = FX.holders[source], sid = String(id), pop = FX.holders.popup;
    /* a popup that closed without letting go (it has no Tutup any more) never outlives a signal for another kecamatan:
       otherwise closing that one later flies back to the old popup's kecamatan (DATA/STAFF verifiers, 16 Oct 2026) */
    if (source !== 'popup' && pop && pop.id !== sid && popupOpenId() !== pop.id) delete FX.holders.popup;
    /* item 43: a trail (an item opened inside the focused kecamatan) belongs to that kecamatan only */
    if (source !== 'trail' && FX.holders.trail && FX.holders.trail.id !== sid) delete FX.holders.trail;
    FX.holders[source] = { id: sid, seq: ++FX.seq, opts: opts || (cur && cur.id === sid ? cur.opts : {}) || {} };
    fxSchedule();
  }
  /** Every signal released: an explicit close ('esc', 'outside', 'button', 'api') also flies back to the view before the
      focus (unless staff moved the map meanwhile); 'select' (another selection) and 'section' leave the camera alone. */
  function fxClear(reason) {
    FX.holders = {};
    if (reason === 'section') FX.pause = 0;
    if (!FX.id) { clearTimeout(FX.timer); FX.timer = 0; return; }
    FX.back = reason === 'esc' || reason === 'outside' || reason === 'button' || reason === 'api';
    FX.fast = reason === 'section';
    if (reason === 'section' || reason === 'select') { clearTimeout(FX.timer); FX.timer = 0; fxEval(); return; }
    fxSchedule();
  }
  function fxSchedule() {
    clearTimeout(FX.timer);
    FX.timer = setTimeout(fxEval, FOCUS_SETTLE_MS);
  }
  function fxEval() {
    clearTimeout(FX.timer);
    FX.timer = 0;
    var top = fxTop(), want = top ? top.id : null;
    if (want && !focusGeo(want)) want = null;
    if (want) {
      FX.back = false;
      if (want === FX.id && (FX.phase === 'enter' || FX.phase === 'on')) {
        /* the same kecamatan from another source (the popup's action sets the Merchant filter; a drawer takes over from the
           popup): the room it needs may differ, so fit again when it is no longer in the free area. Not for a trail (an SMA
           opened inside the kecamatan: the camera stays) and not with MCD.windows (its keepInView clears the kecamatan) */
        if (top.source === 'trail') return;
        if (!wsActive() && top.source !== FX.fitSrc && !FX.userMoved && !(S.flight && S.map && S.map.isMoving && S.map.isMoving()) && !fxFits(S.padding, false)) fxFly(FX.geo, top);
        FX.fitSrc = top.source;
        return;
      }
      fxEnter(want, top);
    } else if (FX.id && FX.phase !== 'exit' && FX.phase !== 'off') fxExit();
  }
  /** Room to keep free on the right of the fit: the territory popup (measured where it docked: it may sit left of the
      map controls), or the drawer of a selection (desktop only). */
  function fxReserve(top) {
    if ((W.innerWidth || 0) < 1024) return 0;
    /* item 43: with MCD.windows the cards are in the padding and the callout floats beside the shape (it never counts) */
    if (wsActive()) return 0;
    if (top && top.opts && finite(+top.opts.reserveRight)) return Math.max(0, +top.opts.reserveRight);
    var T = MCD.territory;
    var pop = T && isFn(T.popupOpen) ? T.popupOpen() : null;
    if ((top && top.source === 'popup') || (pop && top && pop === top.id)) {
      var el = null, box = null;
      try { el = DOC.querySelector && DOC.querySelector('.tz-pop'); box = S.map ? S.map.getContainer().getBoundingClientRect() : null; } catch (e) { el = null; }
      if (el && box && isFn(el.getBoundingClientRect)) {
        var r = el.getBoundingClientRect();
        if (r && r.width > 0 && r.left > box.left + box.width / 2) return Math.max(0, Math.round(box.right - r.left + 16 - (S.padding.right || 0)));
      }
      return POPUP_ROOM;
    }
    if (top && (top.source === 'selection' || top.source === 'trail')) return Math.round(drawerShiftPx() * 2);
    return 0;
  }
  /** Camera: fit the kecamatan in the free map area (the panels are the map padding) with room for the popup or drawer. */
  function fxFly(geo, top) {
    if (!S.map || !geo || !geo.bbox) return 0;
    var reserve = fxReserve(top), box = null, cam = null;
    try { box = S.map.getContainer().getBoundingClientRect(); } catch (e) { box = null; }
    var pad = { top: 44, bottom: 44, left: 44, right: 44 + reserve };
    if (box && box.width - (S.padding.left || 0) - (S.padding.right || 0) - pad.left - pad.right < 220) pad.right = 44;
    if (box && box.width < 600) pad = { top: 24, bottom: 24, left: 16, right: 16 };
    cam = camFor(geo.bbox, pad);
    if (!cam) return 0;
    /* the map controls column stands in the free area: keep the kecamatan clear of it too when that costs no zoom
       (a tall kecamatan is fitted by its height, so moving it sideways is free) */
    var right = mapctlRight(box);
    if (right > pad.right) {
      var cam2 = camFor(geo.bbox, Object.assign({}, pad, { right: right }));
      if (cam2 && cam2.zoom >= cam.zoom - 0.2) cam = cam2;
    }
    var center = cam.center, zoom = Math.min(cam.zoom, 16);
    if (!finite(zoom)) return 0;
    var v = viewTarget({ center: center, zoom: zoom }), dur = flightMs(cameraKm(v));
    cameraTo({ center: center, zoom: zoom }, { duration: dur, ease: nearView(center) });
    FX.flightId = S.flight ? S.flight.id : 0;
    FX.fitSrc = top ? top.source : null;
    return S.flight ? dur : 0;
  }
  /** px to keep free on the right of S.padding for the map controls column (.mapctl, bottom right of the free area),
      when it stands in the right half of the map; 0 otherwise. With a drawer (open, or about to open: drawer = true)
      the column sits left of it (shell.css body.is-drawer-open .mapctl). */
  function mapctlRight(box, drawer) {
    var mc = null;
    try { mc = DOC.querySelector && DOC.querySelector('.mapctl:not([hidden])'); } catch (e) { mc = null; }
    if (!mc || !box || !isFn(mc.getBoundingClientRect)) return 0;
    var mr = mc.getBoundingClientRect();
    if (!(mr.width > 0) || mr.left <= box.left + box.width / 2) return 0;
    var left = mr.left;
    if (drawer && (W.innerWidth || 0) >= 1024) {
      var dl = drawerLeftPx();
      if (dl > 0 && mr.right > dl - 4) left = Math.min(left, dl - 16 - mr.width);
    }
    return Math.max(0, Math.round(box.right - left + 16 - (S.padding.right || 0)));
  }
  /** Is the focused kecamatan inside the free area of `pad` (and clear of the popup / drawer room)? With shift, where it
      will be once a plain padding ease to `pad` has moved the centre (MapLibre keeps the centre in the padded middle). */
  function fxFits(pad, shift) {
    var g = FX.geo;
    if (!g || !g.bbox || !S.map) return true;
    var box = null, cur = null, a, b;
    try { box = S.map.getContainer().getBoundingClientRect(); } catch (e) { return true; }
    try { cur = shift && isFn(S.map.getPadding) ? S.map.getPadding() : null; } catch (e) { cur = null; }
    var dx = cur ? (((pad.left || 0) - (pad.right || 0)) - ((cur.left || 0) - (cur.right || 0))) / 2 : 0;
    var dy = cur ? (((pad.top || 0) - (pad.bottom || 0)) - ((cur.top || 0) - (cur.bottom || 0))) / 2 : 0;
    try { a = S.map.project([g.bbox[0][0], g.bbox[1][1]]); b = S.map.project([g.bbox[1][0], g.bbox[0][1]]); } catch (e) { return true; }
    var reserve = fxReserve(fxTop());
    var free = { left: (pad.left || 0) + 8, top: (pad.top || 0) + 8, right: box.width - (pad.right || 0) - reserve - 8, bottom: box.height - (pad.bottom || 0) - 8 };
    return a.x + dx >= free.left && b.x + dx <= free.right && a.y + dy >= free.top && b.y + dy <= free.bottom;
  }
  function fxEnter(id, top) {
    var geo = focusGeo(id);
    if (!geo) return;
    var fresh = !FX.id || FX.phase === 'off', switching = !fresh && FX.id !== id;
    if (fresh) { FX.cam = S.map ? getCamera() : null; FX.userMoved = false; }
    FX.id = id; FX.geo = geo; FX.phase = 'enter'; FX.back = false; FX.fast = false; FX.settled = false; FX.aff = null;
    FX.fitSrc = top ? top.source : null; FX.enterT = now();
    if (switching) baseCut();                               /* another kecamatan: its own names are measured when idle */
    routeClear(true);
    var flight = (top && top.opts && top.opts.camera === false) ? 0 : fxFly(geo, top);
    if (!flight) FX.settled = true;
    fxDomShow(true);
    fxReveal(flight, switching);
    fxAnimate(1, switching ? motionDur('fast') : motionDur('base'), 'out', function () {
      if (FX.id !== id || FX.phase !== 'enter') return;
      FX.phase = 'on';
      emit('focus', fxState());
    });
    S.sectionCache.key = '';
    scheduleCompose(); queuePlates(); queueLegend();
    emit('focus', fxState());
    if (FX.settled) emit('focus', fxState());
  }
  function fxExit() {
    if (!FX.id) return;
    var id = FX.id, back = FX.back && FX.cam && !FX.userMoved && S.map, fast = FX.fast;
    FX.phase = 'exit'; FX.back = false; FX.fast = false;
    baseCut();                                              /* the cut place names come back as the veil fades */
    if (back) cameraTo({ center: [FX.cam.lon, FX.cam.lat], zoom: FX.cam.zoom }, { exit: true, ease: nearView([FX.cam.lon, FX.cam.lat]) });
    fxDomShow(false);
    fxAnimate(0, fast ? motionDur('fast') : motionDur('base'), 'inOut', function () {
      if (FX.phase !== 'exit' || FX.id !== id) return;
      FX.phase = 'off'; FX.id = null; FX.geo = null; FX.cam = null; FX.settled = true; FX.aff = null;
      fxDomOff();
      S.sectionCache.key = '';
      compose(); queuePlates(); queueLegend();
      emit('focus', fxState());
    });
    queuePlates();
    emit('focus', fxState());
  }
  /** Drive FX.p (0 = clear map, 1 = focus) with the motion easing; every frame moves the veil and the deck fade. */
  function fxAnimate(to, dur, ease, done) {
    caf(FX.raf); FX.raf = 0;
    FX.from = FX.p; FX.to = to; FX.t0 = now(); FX.dur = dur; FX.ease = motionEase(ease); FX.done = done || null;
    FX.slow = { n: 0, sum: 0, t: 0, t0: FX.t0 };
    if (reduced() || !(dur > 0) || DOC.hidden || !S.overlay) { FX.p = to; fxFrame(true); return; }
    FX.raf = raf(fxStep);
  }
  function fxStep() {
    FX.raf = 0;
    var t = clamp((now() - FX.t0) / (FX.dur || 1), 0, 1);
    FX.p = lerp(FX.from, FX.to, FX.ease ? FX.ease(t) : t);
    fxWatch();
    if (t >= 1) fxJudge();
    fxFrame(t >= 1);
    if (t < 1) FX.raf = raf(fxStep);
  }
  function fxFrame(end) {
    if (FX.dom) FX.dom.veil.style.opacity = String(Math.round(FX.p * 1000) / 1000);
    flush();
    if (end) { var d = FX.done; FX.done = null; if (d) d(); }
  }
  /* The frosted layer is the costly part of a frame. When the veil transitions run slower than about 40 fps, the blur
     gives way to a firm veil without blur for the rest of the session (is-lite). One slow moment is not enough (fix
     16 Oct 2026: a first drawer build or a layer rebuild during one fade switched the blur off for good on a fast
     machine): the first 150 ms of a transition are not counted (its one-off work), and it takes two slow transitions
     in a row (average frame over 25 ms, at least 4 frames); a transition under 20 ms clears the count. */
  var FX_SLOW_MS = 25, FX_OK_MS = 20, FX_SKIP_MS = 150;
  function fxWatch() {
    var t = now(), w = FX.slow;
    if (t - (w.t0 || 0) < FX_SKIP_MS) { w.t = t; return; }
    if (w.t) { var dt = t - w.t; if (dt > 0 && dt < 500) { w.sum += dt; w.n++; } }
    w.t = t;
  }
  function fxJudge() {
    var w = FX.slow;
    if (!w || w.n < 4) return;
    var avg = w.sum / w.n;
    if (avg > FX_SLOW_MS) FX.strikes = (FX.strikes || 0) + 1;
    else if (avg < FX_OK_MS) FX.strikes = 0;
    if (!FX.lite && FX.strikes >= 2) { FX.lite = true; if (FX.dom) FX.dom.root.classList.add('is-lite'); }
  }
  function backdropOK() {
    try { return !!(W.CSS && W.CSS.supports && (W.CSS.supports('backdrop-filter', 'blur(2px)') || W.CSS.supports('-webkit-backdrop-filter', 'blur(2px)'))); } catch (e) { return false; }
  }
  /** The focus overlay inside the map's canvas container, right above the canvas and below the HTML plates. */
  function fxDomEnsure() {
    if (FX.dom) return FX.dom;
    if (!S.map || !isFn(S.map.getCanvasContainer)) return null;
    var host = null;
    try { host = S.map.getCanvasContainer(); } catch (e) { host = null; }
    if (!host || !host.appendChild) return null;
    var root = h('div', 'map-focus' + (backdropOK() ? '' : ' is-lite'));
    root.setAttribute('aria-hidden', 'true');
    var veil = h('div', 'map-focus__veil');
    var svg = DOC.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'map-focus__line');
    var casing = DOC.createElementNS(SVGNS, 'path'), stroke = DOC.createElementNS(SVGNS, 'path');
    casing.setAttribute('class', 'map-focus__casing'); stroke.setAttribute('class', 'map-focus__stroke');
    casing.setAttribute('pathLength', '1'); stroke.setAttribute('pathLength', '1');
    svg.appendChild(casing); svg.appendChild(stroke);
    /* item 43, §4.2.3: the route of a trail above the frosted layer (inside the veil: clipped by its mask; fxRoute) */
    var rsvg = DOC.createElementNS(SVGNS, 'svg'), rp = {};
    rsvg.setAttribute('class', 'map-focus__route');
    rsvg.style.display = 'none';
    ['casing', 'line', 'link', 'origin', 'dest'].forEach(function (k) {
      var p = DOC.createElementNS(SVGNS, 'path');
      p.setAttribute('class', 'map-focus__r' + k);
      rsvg.appendChild(p);
      rp[k] = p;
    });
    veil.appendChild(rsvg);
    root.appendChild(veil); root.appendChild(svg);
    var cv = null;
    try { cv = S.map.getCanvas(); } catch (e) { cv = null; }
    if (cv && cv.parentNode === host && cv.nextSibling) host.insertBefore(root, cv.nextSibling); else host.appendChild(root);
    FX.lite = FX.lite || !backdropOK();
    FX.dom = { root: root, veil: veil, svg: svg, casing: casing, stroke: stroke, w: 0, h: 0, key: '',
      route: { svg: rsvg, casing: rp.casing, line: rp.line, link: rp.link, origin: rp.origin, dest: rp.dest, on: false, key: '' } };
    return FX.dom;
  }
  /** Veil colour and outline colours of the map in use (the Terang street map is light; Gelap and the satellite dark). */
  function fxStyle() {
    var D0 = FX.dom;
    if (!D0) return;
    var key = palKey() + '|' + S.theme + '|' + S.view;
    if (key === D0.key) return;
    D0.key = key;
    var ink = FOCUS_INK[palKey() === 'day' ? 'day' : 'night'], T = MCD.territory, K = null;
    try { K = T && isFn(T.ink) ? T.ink(mapState()) : null; } catch (e) { K = null; }
    var sel = K && K.sel ? K.sel : (palKey() === 'day' ? [0, 61, 121] : [125, 170, 228]);
    var cas = K && K.casing ? K.casing : (palKey() === 'day' ? [255, 255, 255, 210] : [10, 15, 23, 200]);
    var st = D0.root.style;
    st.setProperty('--mf-veil', ink.veil);
    st.setProperty('--mf-veil-strong', ink.strong);
    st.setProperty('--mf-filter', ink.filter);
    st.setProperty('--mf-line', cssRgb(sel));
    st.setProperty('--mf-casing', cssRgb(cas, Math.round(((cas[3] == null ? 255 : cas[3]) / 255) * 100) / 100));
  }
  function fxSize() {
    var D0 = FX.dom;
    if (!D0 || !S.map) return;
    var w = 0, hh = 0;
    try { var c = S.map.getContainer(); w = c.clientWidth; hh = c.clientHeight; } catch (e) { return; }
    if (w === D0.w && hh === D0.h) return;
    D0.w = w; D0.h = hh;
    D0.root.style.width = w + 'px'; D0.root.style.height = hh + 'px';
    D0.svg.setAttribute('width', String(w)); D0.svg.setAttribute('height', String(hh));
    D0.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
    if (D0.route) {
      D0.route.svg.setAttribute('width', String(w)); D0.route.svg.setAttribute('height', String(hh));
      D0.route.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
    }
    FX.dirty = true;
  }
  /** The inverse mask and the outline, projected for the camera of this frame (called from the map's 'render'). */
  function fxMask() {
    FX.dirty = false;
    var D0 = FX.dom;
    if (!D0 || !FX.geo || !S.map) return;
    var g = FX.geo, aff = affineOf(function (p) { return S.map.project(p); }, g.anchor[0], g.anchor[1]);
    if (!aff) return;
    FX.aff = aff;
    var ring = ringsPathData(g.merc, aff, 0.6);
    D0.veil.style.clipPath = 'path(evenodd, "M0 0H' + D0.w + 'V' + D0.h + 'H0Z' + ring + '")';
    D0.casing.setAttribute('d', ring);
    D0.stroke.setAttribute('d', ring);
    fxRoute();
  }
  function fxDomShow(on) {
    var D0 = fxDomEnsure();
    if (!D0) return;
    fxStyle(); fxSize(); fxMask();
    D0.root.classList.add('is-live');
    D0.root.classList.toggle('is-lite', !!FX.lite);
    D0.root.classList.toggle('is-out', !on);
  }
  /* ---- the focused kecamatan's chip (F9, 16 Oct 2026) ----
   * The kecamatan chips are drawn by deck.gl in the map canvas, under the frosted layer: the focused kecamatan's own chip
   * was sliced by the veil wherever it reached past the border (a phone: "acas · 970 merch"). While a focus is on, that
   * chip is an HTML plate above the veil instead (its deck copy is hidden), placed where it fits inside the kecamatan,
   * with the name only when the whole chip is wider than the kecamatan on screen. */
  var FXC = { root: null, card: null, name: null, rest: null, bars: null, mk: null, key: '', w: 0, wn: 0, h: 0, short: false, on: false };
  function fxChipData(layers) {
    if (!FX.id || !FX.geo) return null;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], p = L.props, data = p.data;
      if (!p.background || !Array.isArray(data) || !data.length || !data[0] || data[0].kec == null) continue;
      var info = { index: 0, data: data, target: [] };
      for (var j = 0; j < data.length; j++) {
        if (String(data[j].kec) !== FX.id) continue;
        var txt = acc(p.getText, data[j], j, info), pos = acc(p.getPosition, data[j], j, info);
        if (!Array.isArray(pos) || txt == null || txt === '') return null;
        /* V8: the chip's bars (territory chipBars) ride on its leader layer (props.mcdBars, 1-3) */
        var nb = finite(+p.mcdBars) ? clamp(Math.round(+p.mcdBars), 0, 3) : 0;
        return { d: data[j], text: String(txt), pos: pos, layerId: L.id, bars: nb };
      }
    }
    return null;
  }
  function fxScreenBox() {
    var g = FX.geo, a, b;
    if (!g || !S.map) return null;
    try { a = S.map.project([g.bbox[0][0], g.bbox[1][1]]); b = S.map.project([g.bbox[1][0], g.bbox[0][1]]); } catch (e) { return null; }
    return { left: a.x, top: a.y, right: b.x, bottom: b.y };
  }
  /** Do the given map-container points all lie in the focused kecamatan (some = true: does any)? */
  function fxPointsIn(pts, some) {
    var g = FX.geo;
    if (!g || !S.map || !isFn(S.map.unproject)) return !some;
    for (var i = 0; i < pts.length; i++) {
      var ll = null;
      try { ll = S.map.unproject(pts[i]); } catch (e) { ll = null; }
      var lon = ll ? (ll.lng != null ? ll.lng : ll[0]) : NaN, lat = ll ? (ll.lat != null ? ll.lat : ll[1]) : NaN;
      var ins = finite(lon) && finite(lat) && g.pip(lon, lat);
      if (some && ins) return true;
      if (!some && !ins) return false;
    }
    return !some;
  }
  /** Does a chip box (viewport px) outside the focus reach into the focused kecamatan? */
  function fxCrosses(box, mr) {
    var f = fxScreenBox();
    if (!f) return false;
    var l = box.left - mr.left, t = box.top - mr.top, r = box.right - mr.left, b = box.bottom - mr.top;
    if (r < f.left || l > f.right || b < f.top || t > f.bottom) return false;
    var cx = (l + r) / 2, cy = (t + b) / 2;
    return fxPointsIn([[l, t], [r, t], [r, b], [l, b], [cx, cy], [cx, t], [cx, b], [l, cy], [r, cy]], true);
  }
  /* Basemap place names (OpenFreeMap 'place': the satellite's lbl-place and the street styles) that straddle the focused
     kecamatan's border were cut mid-word by the frosted layer ("KEBON PA", "AKASAR"; v5 design verifier, 17 Oct 2026).
     While a focus is on, such a name fades out (feature-state fxcut → text-opacity 0), measured when the map is idle (its
     labels placed); they come back as the focus exits. The box is estimated from the layer's own size, spacing and wrap. */
  var BCUT = { on: {} };
  function cutOpacity(v) { return ['case', ['boolean', ['feature-state', 'fxcut'], false], 0, finite(+v) ? +v : 1]; }
  function placeLabelLayers() {
    var out = [];
    try {
      (S.map.getStyle().layers || []).forEach(function (l) {
        if (l.type === 'symbol' && l.source === 'ofm' && l['source-layer'] === 'place' && (!l.layout || l.layout.visibility !== 'none')) out.push(l);
      });
    } catch (e) { out = []; }
    return out;
  }
  function placeCutBox(f, lay) {
    var pr = f.properties || {}, text = String(pr['name:id'] || pr.name || '');
    if (!text) return null;
    var tf = lay['text-field'], upper = lay['text-transform'] === 'uppercase' || (Array.isArray(tf) && tf[0] === 'upcase');
    if (upper) text = text.toUpperCase();
    var size = finite(lay['text-size']) ? +lay['text-size'] : 13, ls = finite(lay['text-letter-spacing']) ? +lay['text-letter-spacing'] : 0;
    var maxW = (finite(lay['text-max-width']) ? +lay['text-max-width'] : 10) * size;
    var w = measureText('400 ' + size + 'px "Noto Sans", ' + FONT_SANS, text) + ls * size * text.length, lines = 1;
    if (w > maxW) { lines = Math.ceil(w / maxW); w = Math.min(w, maxW + size); }
    return { hw: w / 2 + 2, hh: lines * size * 0.6 + 2 };
  }
  function baseCut() {
    if (!S.map || !isFn(S.map.setFeatureState) || !isFn(S.map.queryRenderedFeatures)) return;
    var want = {}, layers = (fxLive() && FX.settled && FX.geo) ? placeLabelLayers() : [];
    if (layers.length) {
      var byId = {};
      layers.forEach(function (l) { byId[l.id] = l.layout || {}; });
      var feats = [];
      try { feats = S.map.queryRenderedFeatures({ layers: Object.keys(byId) }) || []; } catch (e) { feats = []; }
      for (var i = 0; i < feats.length; i++) {
        var f = feats[i], g = f.geometry, lid = f.layer && f.layer.id;
        if (f.id == null || !g || g.type !== 'Point' || !byId[lid]) continue;
        var bx = placeCutBox(f, byId[lid]), p;
        if (!bx) continue;
        try { p = S.map.project(g.coordinates); } catch (e) { continue; }
        var pts = [[p.x - bx.hw, p.y - bx.hh], [p.x + bx.hw, p.y - bx.hh], [p.x + bx.hw, p.y + bx.hh], [p.x - bx.hw, p.y + bx.hh],
          [p.x, p.y - bx.hh], [p.x, p.y + bx.hh], [p.x - bx.hw, p.y], [p.x + bx.hw, p.y], [p.x, p.y]];
        if (fxPointsIn(pts, true) && !fxPointsIn(pts, false)) want[String(f.id)] = f.id;
      }
    }
    var set = function (id, on) { try { S.map.setFeatureState({ source: 'ofm', sourceLayer: 'place', id: id }, { fxcut: on }); } catch (e) { /* source gone */ } };
    Object.keys(BCUT.on).forEach(function (k) { if (!(k in want)) set(BCUT.on[k], false); });
    Object.keys(want).forEach(function (k) { if (!(k in BCUT.on)) set(want[k], true); });
    BCUT.on = want;
  }
  /** Does a label box (viewport px) lie partly inside and partly outside the focused kecamatan (its border cuts it)? */
  function fxStraddles(box, mr) {
    var f = fxScreenBox();
    if (!f) return false;
    var l = box.left - mr.left, t = box.top - mr.top, r = box.right - mr.left, b = box.bottom - mr.top;
    if (r < f.left || l > f.right || b < f.top || t > f.bottom) return false;
    var cx = (l + r) / 2, cy = (t + b) / 2, pts = [[l, t], [r, t], [r, b], [l, b], [cx, cy], [cx, t], [cx, b], [l, cy], [r, cy]];
    return fxPointsIn(pts, true) && !fxPointsIn(pts, false);
  }
  function fxChipShow(on) {
    if (!FXC.root || FXC.on === !!on) return;
    FXC.on = !!on;
    FXC.root.classList.toggle('is-in', !!on);
  }
  function fxChipPlace(c, mr, placed, keep) {
    if (!c || !S.map || !W.maplibregl) { fxChipShow(false); return; }
    if (!FXC.root) {
      var root = h('div', 'mk map-focus-chip'), card = h('div', 'map-focus-chip__card'), nm = h('span', 'map-focus-chip__name'), rs = h('span', 'map-focus-chip__rest');
      root.setAttribute('aria-hidden', 'true');
      card.appendChild(nm); card.appendChild(rs); root.appendChild(card);
      var mk = null;
      try { mk = new W.maplibregl.Marker({ element: root, anchor: 'center' }).setLngLat(c.pos).addTo(S.map); } catch (e) { warn('focus chip', e); return; }
      FXC.root = root; FXC.card = card; FXC.name = nm; FXC.rest = rs; FXC.mk = mk;
    }
    var nbars = c.bars > 0 ? c.bars : 0;
    var key = c.text + '@' + c.pos[0] + ',' + c.pos[1] + '#' + nbars;
    if (key !== FXC.key) {
      var i = c.text.indexOf(' · ');
      FXC.key = key;
      FXC.name.textContent = i > 0 ? c.text.slice(0, i) : c.text;
      FXC.rest.textContent = i > 0 ? c.text.slice(i) : '';
      /* V8: the same small bars as the map chip (Calon Prioritas: daya beli area), after the words */
      if (FXC.bars) { if (FXC.bars.parentNode) FXC.bars.parentNode.removeChild(FXC.bars); FXC.bars = null; }
      if (nbars) {
        var bars = h('span', 'map-focus-chip__bars');
        for (var bi = 0; bi < nbars; bi++) bars.appendChild(h('i', null));
        FXC.card.appendChild(bars);
        FXC.bars = bars;
      }
      FXC.rest.hidden = false; FXC.short = false; FXC.w = 0;
      try { FXC.mk.setLngLat(c.pos); } catch (e) { /* ignore */ }
    }
    if (!FXC.w) { FXC.w = FXC.card.offsetWidth || 150; FXC.h = FXC.card.offsetHeight || 28; FXC.wn = Math.max(40, FXC.w - (FXC.rest.offsetWidth || 0)); }
    var f = fxScreenBox(), short = !!FXC.rest.textContent && !!f && FXC.w > (f.right - f.left) * 0.9;
    if (short !== FXC.short) { FXC.short = short; FXC.rest.hidden = short; }
    var w = short ? FXC.wn : FXC.w, hh = FXC.h, pt;
    try { pt = S.map.project(c.pos); } catch (e) { return; }
    /* the first spot whose four corners lie in the kecamatan: on the label point, a little above or below, aside; first
       pass also clear of the selection and the route's end (chipKeepOut) */
    var spots = [[0, 0], [0, -hh * 0.75], [0, hh * 0.75], [-w * 0.3, 0], [w * 0.3, 0], [0, -hh * 1.5], [0, hh * 1.5], [-w * 0.3, -hh], [w * 0.3, -hh], [-w * 0.3, hh], [w * 0.3, hh]];
    var ko = keep && keep.length ? keep : null, pick = null;
    var boxAt = function (sp) { return { left: mr.left + pt.x + sp[0] - w / 2, top: mr.top + pt.y + sp[1] - hh / 2, right: mr.left + pt.x + sp[0] + w / 2, bottom: mr.top + pt.y + sp[1] + hh / 2 }; };
    for (var pass = ko ? 0 : 1; pass < 2 && !pick; pass++) {
      for (var k = 0; k < spots.length; k++) {
        var x0 = pt.x + spots[k][0] - w / 2, y0 = pt.y + spots[k][1] - hh / 2;
        if (!pass && clashes(boxAt(spots[k]), ko)) continue;
        if (fxPointsIn([[x0, y0], [x0 + w, y0], [x0 + w, y0 + hh], [x0, y0 + hh]], false)) { pick = spots[k]; break; }
      }
    }
    if (!pick) pick = spots[0];
    /* no free spot inside the kecamatan: the chip fades over the selection instead of covering it */
    var under = !!ko && clashes(boxAt(pick), ko);
    if (FXC.root.classList.contains('is-under') !== under) FXC.root.classList.toggle('is-under', under);
    var tf = 'translate(' + Math.round(pick[0] - w / 2) + 'px,' + Math.round(pick[1] - hh / 2) + 'px)';
    if (FXC.card.style.transform !== tf) FXC.card.style.transform = tf;
    if (placed) placed.push({ left: mr.left + pt.x + pick[0] - w / 2 - 2, top: mr.top + pt.y + pick[1] - hh / 2 - 2, right: mr.left + pt.x + pick[0] + w / 2 + 2, bottom: mr.top + pt.y + pick[1] + hh / 2 + 2 });
    fxChipShow(true);
  }
  function fxDomOff() {
    var D0 = FX.dom;
    if (!D0) return;
    D0.root.classList.remove('is-live', 'is-drawn', 'is-out');
    D0.veil.style.opacity = '0';
    D0.veil.style.clipPath = '';
    D0.casing.setAttribute('d', ''); D0.stroke.setAttribute('d', '');
    FX.aff = null;
    fxRoute();
  }
  /** The outline draws in (stroke reveal, MCD.motion slow ≈ 500 ms), timed to finish as the camera lands. */
  function fxReveal(flight, switching) {
    var D0 = FX.dom;
    if (!D0) return;
    var delay = reduced() ? 0 : Math.max(0, Math.round(flight - motionDur('slow')) - (switching ? 0 : 60));
    D0.root.classList.remove('is-drawn');
    D0.root.style.setProperty('--mf-reveal-delay', delay + 'ms');
    D0.root.style.setProperty('--mf-reveal-ms', (reduced() ? 0 : motionDur('slow')) + 'ms');
    if (reduced()) { D0.root.classList.add('is-drawn'); return; }
    void D0.svg.getBoundingClientRect();         /* one style flush per focus, so the reveal restarts from 0 */
    D0.root.classList.add('is-drawn');
  }

  /* ---- deck layers under the focus: inside full, outside at 15% without labels or hover ---- */

  var FPART = typeof WeakMap === 'function' ? new WeakMap() : null;
  function fxPart(L) {
    var p = L.props, data = p.data;
    if (!FPART || !FX.geo || !Array.isArray(data)) return null;
    var m = FPART.get(data);
    if (m && m.geo === FX.geo.id) return m;
    var gp = p.getPosition, info = { index: 0, data: data, target: [] }, pip = FX.geo.pip, inD = [], outD = [], inI = [], outI = [];
    for (var i = 0; i < data.length; i++) {
      var pos = gp;
      if (isFn(gp)) { info.index = i; try { pos = gp(data[i], info); } catch (e) { pos = null; } }
      if (pos && pip(+pos[0], +pos[1])) { inD.push(data[i]); inI.push(i); } else { outD.push(data[i]); outI.push(i); }
    }
    m = { geo: FX.geo.id, inside: inD, outside: outD, inI: inI, outI: outI, all: outD.length === 0, wraps: {} };
    FPART.set(data, m);
    return m;
  }
  /** An accessor of the full data called from a part: info.index is mapped back to the full data's index. */
  function fxWrap(m, which, key, fn, full) {
    var k = which + '|' + key, w = m.wraps[k];
    if (w && w.fn === fn) return w.wrapped;
    var idx = which === 'in' ? m.inI : m.outI, o = { index: 0, data: full, target: null };
    var wrapped = function (d, info) { o.index = info && info.index != null ? idx[info.index] : 0; o.target = info ? info.target : null; return fn(d, o); };
    m.wraps[k] = { fn: fn, wrapped: wrapped };
    return wrapped;
  }
  function fxClone(L, m, which, alpha) {
    var p = L.props, props = { data: which === 'in' ? m.inside : m.outside, mcdFxIdx: which === 'in' ? m.inI : m.outI };
    if (which === 'out') { props.id = L.id + '::fx-out'; props.pickable = false; }
    props.opacity = (p.opacity == null ? 1 : p.opacity) * alpha;
    Object.keys(p).forEach(function (k) { if (k.indexOf('get') === 0 && isFn(p[k])) props[k] = fxWrap(m, which, k, p[k], p.data); });
    try { return L.clone(props); } catch (e) { return L; }
  }
  var FX_POINTS = ['ScatterplotLayer', 'IconLayer', 'TextLayer', 'ColumnLayer', 'PointCloudLayer'];
  function fxPointLayer(L, d) {
    for (var i = 0; i < FX_POINTS.length; i++) { var C0 = d[FX_POINTS[i]]; if (C0 && L instanceof C0) return FX_POINTS[i]; }
    return null;
  }
  /** flush() hands every layer through here while a focus is on (FX.p = 0 … 1). */
  function fxSplit(L, out) {
    var d = D(), id = L.id || '';
    if (!d || /^route-/.test(id)) { out.push(L); return; }
    /* the focus draws its own outline: the section's selected and hover outlines would double it */
    if (d.PathLayer && L instanceof d.PathLayer && /-(sel|sel-casing|hover)$/.test(id) && FX.phase !== 'exit') return;
    var kind = fxPointLayer(L, d);
    if (!kind || !Array.isArray(L.props.data) || L.props.getPosition == null) { out.push(L); return; }
    var m = fxPart(L);
    if (!m) { out.push(L); return; }
    if (m.all) { out.push(L); return; }
    var a = FX.p;
    /* the inside part keeps the layer's own id, and it stays even when nothing of the layer lies inside: deck.gl hands the
       layer's textures (an icon atlas made from a canvas) to its clones by reference, still owned by that id, so if the
       id left the layer list deck would delete the texture the outside part draws with (WebGL "bindTexture: attempt to
       use a deleted object", verifiers 16 Oct 2026) */
    out.push(fxClone(L, m, 'in', 1));
    var text = kind === 'TextLayer' && !keepsLabels(L);
    var alpha = text ? Math.max(0, 1 - a * 2) : lerp(1, FOCUS_FADE, a);
    if (m.outside.length && alpha > 0.005) out.push(fxClone(L, m, 'out', alpha));
  }

  /* ---- signals ---- */

  var SEL = { key: '' };
  var LASTPT = { key: '', pos: null, t: 0 };
  /** The kecamatan a selection opens: a kecamatan kind, or an area kind (KPR's price area) that names its kecamatan in
      extra.kecamatanId. A point kind never does, even with extra.kecamatanId: a point draws its route. */
  function selectionKec(sel) {
    if (!sel || !sel.kind) return null;
    if (isKecKind(sel.kind)) return focusGeo(sel.id) ? String(sel.id) : null;
    var kx = sel.extra && sel.extra.kecamatanId;
    return kx != null && !routeKindOk(sel.kind) && focusGeo(kx) ? String(kx) : null;
  }
  /**
   * The selection changed (MCD.state through app.js, or select()):
   *   a kecamatan (or an area of one)  focuses it (switching from another kecamatan without an exit in between);
   *   a point                          draws its route; the focus steps aside at once without flying back. The Merchant
   *                                    kecamatan filter only WAITS (FX.pause) while the point is selected, so working down
   *                                    a kecamatan's list keeps coming back to that kecamatan (STAFF verifier, 16 Oct 2026);
   *   nothing                          the route goes; a waiting filter focus comes back; a kecamatan drawer that held the
   *                                    focus alone closes like Tutup: the camera flies back (item 38).
   */
  function selectionChanged(sel) {
    var key = sel && sel.kind ? sel.kind + ':' + sel.id : '';
    if (key === SEL.key) return;
    SEL.key = key;
    var kid = selectionKec(sel);
    if (kid) { FX.pause = 0; delete FX.holders.trail; fxHold('selection', kid); routeClear(); return; }
    if (!sel || !sel.kind) {
      var resume = FX.pause > 0;
      FX.pause = 0;
      routeClear();
      var h = FX.holders, live = FX.id && FX.phase !== 'exit' && FX.phase !== 'off';
      /* item 43: Tutup / Esc on an item of a trail ends the whole trail: the focus exits and the camera flies back
         (unless the Merchant kecamatan filter still holds that kecamatan: the filter is the section's own state) */
      if (h.trail) {
        if (live && !(h.filter && h.filter.id === FX.id)) { fxClear('button'); return; }
        delete h.trail; delete h.selection;
        if (h.popup && popupOpenId() !== h.popup.id) delete h.popup;
        fxSchedule();
        return;
      }
      var only = h.selection && Object.keys(h).length === 1;
      if (only && FX.id === h.selection.id && live) fxClear('button');
      else { fxHold('selection', null); if (resume) fxSchedule(); }
      return;
    }
    /* item 43 trail: an item inside the focused kecamatan (or one opened from its list, extra.trail) keeps the focus */
    var tk = trailOf(sel);
    if (tk) trailHold(tk);
    else pointSelected(sel);
    routeForSelection(sel, !!tk);
  }
  /** A point (or any other kind that is not a kecamatan) is selected: the focus steps aside at once (no flight back). */
  function pointSelected() {
    delete FX.holders.selection; delete FX.holders.popup; delete FX.holders.api; delete FX.holders.trail;
    FX.pause = FX.seq;
    if (FX.id && FX.phase !== 'exit' && FX.phase !== 'off') { FX.back = false; FX.fast = false; clearTimeout(FX.timer); FX.timer = 0; fxEval(); }
  }
  /**
   * item 43, §4.2.3: the kecamatan a point selection keeps in focus as a trail ("‹ Makasar"), or null. A trail needs a live
   * focus and either extra.trail naming the focused kecamatan (a row of its list) or the point lying inside it (a map
   * pick, any section). pos: the point when the caller knows it (focusPoint), else the selectable's position.
   */
  function trailOf(sel, pos) {
    if (!fxLive() || !sel || !sel.kind || isKecKind(sel.kind)) return null;
    var t = sel.extra && sel.extra.trail;
    if (t != null && String(t) === FX.id) return FX.id;
    var p = pos || selectionPosition(sel);
    if (!p && LASTPT.key === sel.kind + ':' + sel.id) p = LASTPT.pos;
    return p && finite(+p[0]) && finite(+p[1]) && fxInside(p) ? FX.id : null;
  }
  /** The trail holds the focus under its own signal: nothing pauses, nothing re-fits; a stale popup hold goes (so Tutup
      on the item can end the whole trail). */
  function trailHold(id) {
    FX.pause = 0;
    if (FX.holders.popup && popupOpenId() !== FX.holders.popup.id) delete FX.holders.popup;
    fxHold('trail', id);
  }
  var smeWatch = null, SMEK = { kec: null, t: 0 };
  /** Merchant: the kecamatan filter ("Lihat merchant di kecamatan ini", Ringkasan's visit list and Sasaran per kecamatan)
      focuses it. Ringkasan sets the filter just before it opens Merchant: entering Merchant within 3 s picks it up. */
  function watchSme() {
    if (smeWatch || !MCD.sme || !isFn(MCD.sme.onView)) return;
    smeWatch = MCD.sme.onView(function (v, changed) {
      if (!changed || changed.indexOf('kec') < 0) return;
      SMEK = { kec: v && v.kec ? v.kec : null, t: now() };
      if (S.section === 'merchants') fxHold('filter', SMEK.kec);
    });
  }
  function smeFilterOnEntry() {
    if (!SMEK.kec || now() - SMEK.t > 3000 || !MCD.sme || !isFn(MCD.sme.view)) return;
    var v = null;
    try { v = MCD.sme.view(); } catch (e) { v = null; }
    if (v && v.kec === SMEK.kec) fxHold('filter', v.kec);
  }
  function focusOutsideClick(info) {
    if (!fxLive() || !info || !info.coordinate) return false;
    /* a picked item of the inside part of a split layer (fxClone 'in': its point lies in the kecamatan) counts as inside
       even where it overhangs the border, like the focused kecamatan's own chip; the outside part is never pickable */
    var L = info.picked && info.layer, p = L && L.props;
    if (p && !/::fx-out$/.test(L.id || '')) {
      if (p.mcdFxIdx) return false;
      if (info.object && p.getPosition != null) {
        var pos = p.getPosition;
        if (isFn(pos)) { try { pos = pos(info.object, { index: info.index, data: p.data, target: [] }); } catch (e) { pos = null; } }
        if (Array.isArray(pos) && fxInside(pos)) return false;
      }
    }
    return !fxInside(info.coordinate);
  }

  /* ---- route line from the branch (item 36) ----
   * A point selection (merchant, LVM store, school, KPR project: any kind registered with registerSelectable) draws the
   * driving route from KCP Jakarta Cilangkap "ala Google Maps": a blue line with a white casing (never green), the
   * toll-free variant when "Motor (tanpa tol)" is on, a thin light dashed connector from the road to the point, a small
   * branch marker, a destination ring and a chip "6,2 km · ± 18 menit" (jam sibuk when on). The route is the one of the
   * minutes (MCD.distance.route → MCD.travel.route, offline; data/travel-routes.js loads once). After the camera has
   * settled, and once it fits branch and destination when the destination is off screen, the line draws out from the
   * branch (about 700 ms, ease-out). Another selection, no selection or another section clears it. */
  /* Night and the satellite: the same deep brand blue as by day (#1A5FD0), not a light blue: the merchants' blue
     "Potensi" dots (#4C8DF6) drawn over the line merged into a light-blue core (MOTION verifier, 16 Oct 2026). The white
     casing (2 px each side) keeps the deep line readable on the dark imagery. (A third, dark halo PathLayer on the same
     data drew a stray wide band from the route's end at street level in deck.gl 9.0.41, so there is none.) */
  var ROUTE_RGB = {
    day:   { line: [26, 95, 209], casing: [255, 255, 255], link: [26, 95, 209], linkA: 200 },
    night: { line: [26, 95, 209], casing: [255, 255, 255], link: [160, 196, 255], linkA: 210 }
  };
  var ROUTE_DRAW_EARLY = 0.6;            /* the line starts drawing when the flight that frames it is 60% done */
  /* Kinds that never draw a route. v6 (V6_SPEC §6.3): Kampus' 'campus' (a PT's main point) and 'campusSite' (another campus
     point, id '<row id>#<n>') are points and draw their route ('campusSite' is not '^site$'); 'cpKec' ends in "Kec", so it
     is a kecamatan: it focuses (isKecKind) and draws no route. tests/map-v6.test.mjs pins the three. */
  var NO_ROUTE_KINDS = /cluster|area|yay|kec|tile|ring|^site$|mabes|territory/i;
  var RT = { key: '', seq: 0, phase: 'off', dest: null, route: null, cum: null, t: 0, a: 1, t0: 0, raf: 0, full: null,
    text: null, fit: false, chip: null, dash: null, dashKey: '', manual: false, prefit: '', fitFlight: 0, early: 0, approx: '' };
  var ROUTES = { promise: null };

  function routeKindOk(kind) { return !!kind && !NO_ROUTE_KINDS.test(String(kind)); }
  function routeValid(r) { return !!(r && Array.isArray(r.coords) && r.coords.length >= 2 && finite(r.km) && finite(r.min)); }
  function routeInk() { return ROUTE_RGB[palKey() === 'day' ? 'day' : 'night']; }
  /** data/travel-routes.js once: MCD.app.lazy('travel-routes') (shell), else a script of our own (file:// works too). */
  function ensureRoutes() {
    var T = MCD.travel;
    if (!T || !isFn(T.route)) return Promise.resolve(false);
    var ready = function () { try { return !!(isFn(T.routesReady) && T.routesReady()); } catch (e) { return false; } };
    if (W.MCD_TRAVEL_ROUTES && ready()) return Promise.resolve(true);
    if (ROUTES.promise) return ROUTES.promise;
    var own = function () {
      return new Promise(function (resolve) {
        if (W.MCD_TRAVEL_ROUTES) { resolve(); return; }
        var s = DOC.createElement('script');
        s.src = 'data/travel-routes.js';
        s.async = true;
        s.addEventListener('load', function () { resolve(); });
        s.addEventListener('error', function () { resolve(); });
        (DOC.head || DOC.body).appendChild(s);
      });
    };
    var app = MCD.app, p;
    if (app && isFn(app.lazy)) {
      try { p = Promise.resolve(app.lazy('travel-routes')).then(null, own); } catch (e) { p = own(); }
    } else p = own();
    ROUTES.promise = p.then(function () { return ready(); }, function () { return false; });
    ROUTES.promise.then(function (ok) { if (!ok) ROUTES.promise = null; });
    return ROUTES.promise;
  }
  function noTollOn() { var Dm = MCD.distance; try { return !!(Dm && isFn(Dm.noTollOn) && Dm.noTollOn()); } catch (e) { return false; } }
  function peakOn() { var Dm = MCD.distance; try { return !!(Dm && isFn(Dm.peakOn) && Dm.peakOn()); } catch (e) { return false; } }
  function peakFactor() {
    var Dm = MCD.distance, T = MCD.travel, f = NaN;
    try { f = Dm && isFn(Dm.peakFactor) ? +Dm.peakFactor() : (T && isFn(T.peakFactor) ? +T.peakFactor() : NaN); } catch (e) { f = NaN; }
    return finite(f) && f >= 1 ? f : 1.3;
  }
  /** Our own pick when MCD.distance.route is not there yet: the shared toggle, and the grid rule of MCD.distance.of
      (the toll-free route when it is faster, or as fast within 0.05 min and shorter). */
  function localRoute(lon, lat) {
    var T = MCD.travel, nt = noTollOn(), r = null, f = null;
    try { r = T.route(lon, lat, { noToll: nt }); } catch (e) { r = null; }
    if (!nt && routeValid(r) && r.viaToll) {
      try { f = T.route(lon, lat, { noToll: true }); } catch (e) { f = null; }
      if (routeValid(f) && (f.min < r.min - 0.05 || (f.min <= r.min + 0.05 && f.km < r.km))) r = Object.assign({}, f, { noToll: false, viaToll: false });
    }
    return routeValid(r) ? r : null;
  }
  /** MCD.distance.route(lon, lat) (shell; it follows the "Motor (tanpa tol)" switch) → route | null. Never online. */
  function routeRequest(lon, lat) {
    var Dm = MCD.distance;
    if (Dm && isFn(Dm.route)) {
      try { return Promise.resolve(Dm.route(lon, lat)).then(function (r) { return routeValid(r) ? r : null; }, function () { return null; }); } catch (e) { /* ours */ }
    }
    return ensureRoutes().then(function (ok) { return ok ? localRoute(lon, lat) : null; });
  }
  function kmWords(k) {
    if (k < 1) { var m = k < 0.1 ? Math.round(k * 1000) : Math.round(k * 100) * 10; if (m < 1000) return m + ' m'; }
    var p = k.toFixed(1).split('.');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1] + ' km';
  }
  function minWords(m) {
    var t = Math.max(1, Math.round(m));
    if (t < 60) return '± ' + t + ' menit';
    var hr = Math.floor(t / 60), r = t % 60;
    return '± ' + hr + ' jam' + (r ? ' ' + r + ' menit' : '');
  }
  /**
   * routeLabel(r, {route, peak, noToll, factor}) → {text: '6,2 km · ± 18 menit', sub: 'Jam sibuk · tanpa tol' | '', tip} | null.
   * r is a route (its own km and minutes, noToll = which line) or an MCD.distance.of() value (the shared switch picks
   * its toll-free value). Minutes × the jam sibuk factor when that switch is on.
   */
  function routeLabel(r, o) {
    o = o || {};
    if (!r || !finite(r.km) || !finite(r.min)) return null;
    var peak = o.peak == null ? peakOn() : !!o.peak, pf = finite(o.factor) ? o.factor : peakFactor();
    var km = r.km, min = r.min, nt;
    /* "tanpa tol" only while the "Motor (tanpa tol)" switch is on: MCD.distance.route may pick the toll-free line by its
       own tie rule with the switch off, and its own label (and every list and drawer) then says nothing about tolls */
    if (o.route !== false) nt = !!r.noToll && (o.noToll == null ? noTollOn() : !!o.noToll);
    else {
      nt = (o.noToll == null ? noTollOn() : !!o.noToll) && !!(r.noToll && finite(r.noToll.km) && finite(r.noToll.min));
      if (nt) { km = r.noToll.km; min = r.noToll.min; }
    }
    if (peak) min *= pf;
    var Dm = MCD.distance, text = null;
    if (Dm && isFn(Dm.format)) { try { text = Dm.format({ km: km, min: min }, { peak: false, noToll: false }); } catch (e) { text = null; } }
    if (!text || text === '—') text = kmWords(km) + ' · ' + minWords(min);
    var tags = [];
    if (peak) tags.push('jam sibuk');
    if (nt) tags.push('tanpa tol');
    var sub = tags.length ? tags.join(' · ') : '';
    if (sub) sub = sub.charAt(0).toUpperCase() + sub.slice(1);
    var tip = 'Perkiraan jarak jalan dan waktu berkendara dari KCP Jakarta Cilangkap, lalu lintas normal.';
    if (Dm && isFn(Dm.tip)) {
      try {
        tip = Dm.tip({ km: km, min: min, source: r.source || 'grid', basis: r.basis || r.precision || 'exact-grid',
          noToll: nt ? { km: km, min: min } : null, viaToll: !!r.viaToll }, { peak: peak, noToll: nt }) || tip;
      } catch (e) { /* the plain line */ }
    }
    if (o.route !== false) tip += '\nGaris rute: jaringan jalan OpenStreetMap, dihitung di komputer ini.';
    return { text: text, sub: sub, tip: tip };
  }
  function distanceOf(pos) {
    var Dm = MCD.distance;
    if (!Dm || !isFn(Dm.of) || !pos) return null;
    try { return Dm.of(pos[0], pos[1]); } catch (e) { return null; }
  }
  function routeForSelection(sel, trail) {
    if (!sel || !routeKindOk(sel.kind)) { routeClear(); return; }
    var key = sel.kind + ':' + sel.id, pos = selectionPosition(sel);
    if (!pos && LASTPT.key === key) pos = LASTPT.pos;
    if (!pos || !finite(+pos[0]) || !finite(+pos[1])) { routeClear(); return; }
    if (key === RT.key && RT.phase !== 'off') return;
    /* the same point under another kind (MCD.app.focus 'poi' → the section's 'mxPoi'): the route already running is it */
    if (RT.dest && RT.phase !== 'off' && RT.phase !== 'out' && !RT.manual && Math.abs(RT.dest[0] - pos[0]) < 1e-7 && Math.abs(RT.dest[1] - pos[1]) < 1e-7) { RT.key = key; return; }
    routeStart(key, [+pos[0], +pos[1]], null, null, { trail: !!trail });
    /* an area point (an LVM store placed at the kelurahan or kecamatan centre, sme.js sets pos.approx): the chip says so */
    RT.approx = pos.approx ? String(pos.approx) : '';
  }
  function routeStart(key, dest, given, label, o) {
    routeClear(true);
    var seq = ++RT.seq;
    RT.key = key; RT.dest = dest; RT.phase = 'load'; RT.route = null; RT.cum = null; RT.full = null; RT.t = 0; RT.a = 1;
    RT.fit = false; RT.text = null; RT.manual = !!given; RT.label = label || null; RT.prefit = ''; RT.fitFlight = 0; RT.approx = '';
    /* item 43: a route inside a trail never re-frames the camera (it stays on the kecamatan; keepInView clears the point) */
    RT.trail = !!(o && o.trail);
    if (RT.trail) trailKeepSoon(dest);
    var p = given ? Promise.resolve(given) : routeRequest(dest[0], dest[1]);
    p.then(function (r) { routeGot(seq, r); }, function () { routeGot(seq, null); });
  }
  function routeGot(seq, r) {
    if (seq !== RT.seq || RT.phase !== 'load') return;
    r = routeValid(r) ? r : null;
    RT.route = r; RT.merc = null;
    RT.cum = r ? cumLengths(r.coords) : null;
    RT.full = r ? [{ path: r.coords }] : null;
    RT.text = r ? routeLabel(r, { route: true }) : routeLabel(distanceOf(RT.dest), { route: false });
    if (RT.text && RT.label) RT.text.text = String(RT.label);
    RT.phase = 'wait';
    routeChipBuild();
    routeSettle();
  }
  /** After the camera has settled (the moveend handler calls this again while a flight runs); a flight that frames the
      route (focusPoint with the route at hand, or routeFit) lets the line start drawing at 60% of it (routeEarly). */
  function routeSettle() {
    if (RT.phase !== 'wait') return;
    if (S.map && S.map.isMoving && S.map.isMoving()) { routeEarly(); return; }
    if (RT.trail) RT.fit = true;
    if (!RT.fit && RT.route && S.map) {
      RT.fit = true;
      /* the destination is off screen: fit branch and destination. A point opened from a list or Ringkasan whose route
         came only after its flight (the first route of the session loads data/travel-routes.js) is fitted now, so the
         branch is in view. A short route mostly under the panels is fitted too, when that keeps street level (≥ 14.5).
         A map click elsewhere keeps its view: the chip offers "Lihat seluruh rute" while the branch is off screen. */
      var moved = false;
      if (RT.prefit !== RT.key) {
        if (!destVisible(RT.dest)) moved = routeFit(0);
        else if (LASTPT.key === RT.key && now() - LASTPT.t < 5000 && !routePointVisible(RT.route.coords[0])) moved = routeFit(0);
        /* item 43, §4.3: with MCD.windows a map click on a point never moves the camera (the callout keeps off the line) */
        else if (!wsActive() && routeShownShare() < 0.5) moved = routeFit(14.5);
      }
      if (moved && S.map.isMoving && S.map.isMoving()) { routeEarly(); return; }
    }
    routeDraw();
  }
  /** The flight under way frames the route: start the draw when it is 60% done (instead of after it lands). */
  function routeEarly() {
    var f = S.flight;
    if (!f || RT.early || !RT.route || !RT.fitFlight || RT.fitFlight !== f.id) return;
    RT.fit = true;
    var seq = RT.seq, at = Math.max(0, f.t0 + f.duration * ROUTE_DRAW_EARLY - now());
    RT.early = setTimeout(function () {
      RT.early = 0;
      if (seq === RT.seq && RT.phase === 'wait') routeDraw();
    }, at);
  }
  function routeDraw() {
    clearTimeout(RT.early); RT.early = 0;
    RT.phase = 'draw'; RT.t0 = now(); RT.t = 0;
    compose();
    if (!RT.route || reduced() || DOC.hidden || !S.overlay) { routeDone(); return; }
    /* the chip comes as the camera lands, or with the line when nothing moves */
    if (!(S.map && S.map.isMoving && S.map.isMoving())) routeChipShow(true);
    caf(RT.raf);
    RT.raf = raf(routeStep);
  }
  function routeStep() {
    RT.raf = 0;
    if (RT.phase !== 'draw') return;
    var t = clamp((now() - RT.t0) / motionDur('slow'), 0, 1);
    RT.t = motionEase('out')(t);
    flush();
    if (t < 1) RT.raf = raf(routeStep); else routeDone();
  }
  function routeDone() {
    RT.phase = 'on'; RT.t = 1;
    flush();
    routeChipShow(true);
    queueLegend(); queuePlates();
    emit('route', routeState());
  }
  /** routeClear(instant): the line, markers and chip go (a short fade unless instant). */
  function routeClear(instant) {
    if (RT.phase === 'off' && !RT.key) return;
    RT.seq++;
    caf(RT.raf); RT.raf = 0;
    clearTimeout(RT.early); RT.early = 0; RT.prefit = ''; RT.fitFlight = 0;
    var had = RT.phase === 'draw' || RT.phase === 'on' || RT.phase === 'out';
    routeChipShow(false);
    if (!instant && had && RT.route && !reduced() && S.overlay && !DOC.hidden) {
      RT.phase = 'out'; RT.key = ''; RT.t0 = now();
      var seq = RT.seq, fade = function () {
        RT.raf = 0;
        if (seq !== RT.seq || RT.phase !== 'out') return;
        var t = clamp((now() - RT.t0) / motionDur('fast'), 0, 1);
        RT.a = 1 - motionEase('inOut')(t);
        flush();
        if (t < 1) RT.raf = raf(fade); else routeOff();
      };
      RT.raf = raf(fade);
      queueLegend();
      return;
    }
    routeOff();
  }
  function routeOff() {
    RT.phase = 'off'; RT.key = ''; RT.route = null; RT.merc = null; RT.cum = null; RT.full = null; RT.dest = null; RT.text = null; RT.a = 1; RT.t = 0;
    RT.dash = null; RT.dashKey = ''; RT.trail = false;
    routeChipShow(false);
    if (S.ready) compose();
    queueLegend();
    emit('route', routeState());
  }
  function routeState() {
    return { key: RT.key, phase: RT.phase, dest: RT.dest, km: RT.route ? RT.route.km : null, min: RT.route ? RT.route.min : null,
      noToll: RT.route ? !!RT.route.noToll : null, points: RT.route ? RT.route.coords.length : 0, t: Math.round(RT.t * 1000) / 1000,
      text: RT.text ? RT.text.text : null, sub: RT.text ? RT.text.sub : null, line: !!RT.route, approx: RT.approx || null };
  }
  /** The free map area in map-container px (the panels are the padding; on a desktop the drawer covers the right), and
      the map controls column (.mapctl, bottom right) as a box that also hides what is under it. */
  function freeBox() {
    if (!S.map) return null;
    var box;
    try { box = S.map.getContainer().getBoundingClientRect(); } catch (e) { return null; }
    var p = S.padding, right = Math.max(p.right || 0, Math.round(drawerShiftPx() * 2) + (p.right || 0));
    var f = { left: (p.left || 0) + 24, top: (p.top || 0) + 24, right: box.width - right - 24, bottom: box.height - (p.bottom || 0) - 24, ctl: null };
    var mc = null;
    try { mc = DOC.querySelector && DOC.querySelector('.mapctl:not([hidden])'); } catch (e) { mc = null; }
    if (mc && isFn(mc.getBoundingClientRect)) {
      var r = mc.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) f.ctl = { left: r.left - box.left - 12, top: r.top - box.top - 12, right: r.right - box.left + 12, bottom: r.bottom - box.top + 12 };
    }
    return f;
  }
  function inFree(f, pt) {
    if (!(pt.x >= f.left && pt.x <= f.right && pt.y >= f.top && pt.y <= f.bottom)) return false;
    var c = f.ctl;
    return !(c && pt.x >= c.left && pt.x <= c.right && pt.y >= c.top && pt.y <= c.bottom);
  }
  /** Is a point (the destination, the branch) in the free map area, not under a panel or the map controls? */
  function routePointVisible(pos) {
    var f = freeBox(), pt = null;
    if (!f || !pos) return true;
    try { pt = S.map.project(pos); } catch (e) { return true; }
    return inFree(f, pt);
  }
  function destVisible(pos) { return routePointVisible(pos); }
  /** Share of the route's length that lies in the free map area now (0–1). */
  function routeShownShare() {
    var f = freeBox(), c = RT.route && RT.route.coords, tot = 0, vis = 0, prev = null;
    if (!f || !c || c.length < 2) return 1;
    for (var i = 0; i < c.length; i++) {
      var p;
      try { p = S.map.project(c[i]); } catch (e) { return 1; }
      var inside = inFree(f, p);
      if (prev) { var d = Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y); tot += d; if (inside && prev.inside) vis += d; }
      prev = { x: p.x, y: p.y, inside: inside };
    }
    return tot > 0 ? vis / tot : 1;
  }
  /** The camera that fits a route and its destination in the free area: room for the drawer (open, or about to open)
      and, when that costs little zoom, for the map controls column. {center, zoom} | null. */
  function routeFitCam(coords, dest, drawer) {
    var bb = bboxOf(coords.concat([dest])), box = null;
    if (!bb || !S.map) return null;
    try { box = S.map.getContainer().getBoundingClientRect(); } catch (e) { box = null; }
    var room = drawer ? Math.round(drawerShiftPx() * 2) : 0;
    var pad = { top: 56, bottom: 56, left: 56, right: 56 + room };
    if (box && box.width < 600) pad = { top: 40, bottom: 40, left: 24, right: 24 };
    var cam = camFor(bb, pad);
    if (!cam) return null;
    /* the map controls column (phones too: it stands at the top right of the map hero there) must not cover the branch */
    var right = box ? mapctlRight(box, drawer) : 0;
    if (right > pad.right) {
      var cam2 = camFor(bb, Object.assign({}, pad, { right: right }));
      if (cam2 && cam2.zoom >= cam.zoom - 0.35) cam = cam2;
    }
    return cam;
  }
  /** Fit branch, route and destination in the free area (room for the drawer); not when the fit would go below minZoom.
      Zoom 11–16. → true when the camera moves. */
  function routeFit(minZoom) {
    if (!S.map || !RT.route) return false;
    var cam = routeFitCam(RT.route.coords, RT.dest, true);
    if (!cam || cam.zoom < (minZoom || 0)) return false;
    var z = clamp(cam.zoom, 11, 16);
    cameraTo({ center: cam.center, zoom: z }, { ease: nearView(cam.center) });
    RT.fitFlight = S.flight ? S.flight.id : 0;
    return true;
  }
  /** The route of a point now, when data/travel-routes.js is loaded (null otherwise; the load starts). */
  function routeNow(pos) {
    var T = MCD.travel, ok = false;
    try { ok = !!(T && isFn(T.route) && isFn(T.routesReady) && T.routesReady()); } catch (e) { ok = false; }
    if (!ok) { if (T && isFn(T.route)) ensureRoutes(); return null; }
    return localRoute(pos[0], pos[1]);
  }
  /** focusPoint's camera for a point and its route (zoom 11 … maxZoom), or null when the route is not at hand. */
  function routeCamera(pos, maxZoom, drawer) {
    var r = routeNow(pos);
    if (!r) return null;
    var cam = routeFitCam(r.coords, pos, drawer);
    return cam ? { center: cam.center, zoom: clamp(Math.min(cam.zoom, maxZoom), 11, 19) } : null;
  }
  /** Deck layers of the route: the line and its casing, the dashed connector and the destination ring (under the
      section's points), the branch marker on top. Functions: flush() re-reads RT on every frame of the draw. */
  function routeLayers(out, top) {
    if (!RT.dest || (RT.phase !== 'draw' && RT.phase !== 'on' && RT.phase !== 'out')) return;
    var d = D(), ink = routeInk(), r = RT.route;
    if (!d || !d.PathLayer) return;
    var pathData = function () { return !r ? null : (RT.t >= 1 ? RT.full : [{ path: partialPath(r.coords, RT.cum, RT.t) }]); };
    var getPath = function (o) { return o.path; };
    if (r) {
      out.push(function () {
        var data = pathData();
        return data ? new d.PathLayer({ id: 'route-casing', data: data, getPath: getPath, getColor: rgba(ink.casing, 235), widthUnits: 'pixels',
          getWidth: 9, capRounded: true, jointRounded: true, opacity: RT.a, pickable: false, beforeId: DECK_BEFORE }) : null;
      });
      out.push(function () {
        var data = pathData();
        return data ? new d.PathLayer({ id: 'route-line', data: data, getPath: getPath, getColor: rgba(ink.line, 255), widthUnits: 'pixels',
          getWidth: 5, capRounded: true, jointRounded: true, opacity: RT.a, pickable: false, beforeId: DECK_BEFORE }) : null;
      });
      out.push(function () {
        if (RT.t < 1 || !r.connector || r.connector.length < 2) return null;
        var zq = quant(S.zoom, 0.25), key = RT.key + '|' + zq;
        if (RT.dashKey !== key) { RT.dashKey = key; RT.dash = dashPieces(r.connector[0], r.connector[1], zq, 4, 4); }
        return RT.dash && RT.dash.length ? new d.PathLayer({ id: 'route-connector', data: RT.dash, getPath: getPath, getColor: rgba(ink.link, ink.linkA),
          widthUnits: 'pixels', getWidth: 2, capRounded: true, opacity: RT.a, pickable: false, beforeId: DECK_BEFORE }) : null;
      });
    }
    if (d.ScatterplotLayer) {
      out.push(function () {
        if (r && RT.t < 0.98) return null;
        return new d.ScatterplotLayer({ id: 'route-dest', data: [{ position: RT.dest }], getPosition: function (o) { return o.position; },
          radiusUnits: 'pixels', getRadius: 10, filled: true, stroked: true, getFillColor: [255, 255, 255, 235], getLineColor: rgba(ink.line, 255),
          lineWidthUnits: 'pixels', getLineWidth: 3, opacity: RT.a, pickable: false, beforeId: DECK_BEFORE });
      });
      if (r) {
        top.push(function () {
          return new d.ScatterplotLayer({ id: 'route-origin', data: [{ position: r.coords[0] }], getPosition: function (o) { return o.position; },
            radiusUnits: 'pixels', getRadius: 5, filled: true, stroked: true, getFillColor: [255, 255, 255, 255], getLineColor: rgba(ink.line, 255),
            lineWidthUnits: 'pixels', getLineWidth: 2.5, opacity: RT.a, pickable: false, beforeId: DECK_BEFORE });
        });
      }
    }
  }
  /** The label chip at the destination: an HTML plate (crisp text, themed by tokens), placed by layoutLabels(). */
  function routeChipBuild() {
    if (!S.map || !W.maplibregl || !RT.text || !RT.dest) return;
    var c = RT.chip;
    if (!c) {
      var root = h('div', 'mk map-route');
      var card = h('div', 'map-route__chip'), dot = h('span', 'map-route__dot'), txt = h('span', 'map-route__t'), sub = h('span', 'map-route__sub');
      var words = h('span', 'map-route__words');
      /* the words repeat what the drawer says: hidden from screen readers; the button is not */
      dot.setAttribute('aria-hidden', 'true'); words.setAttribute('aria-hidden', 'true');
      words.appendChild(txt); words.appendChild(sub);
      /* "Lihat seluruh rute": while the branch is off screen (a map click at street level), fit branch and point */
      var all = h('button', 'map-route__all', 'Lihat seluruh rute');
      all.type = 'button';
      all.title = 'Tampilkan rute dari KCP Jakarta Cilangkap sampai titik ini';
      all.hidden = true;
      /* the map must not read the press as a click on the map (an empty click closes the drawer and the route) */
      ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'wheel'].forEach(function (ev) { all.addEventListener(ev, function (e) { e.stopPropagation(); }); });
      all.addEventListener('click', function (e) {
        e.stopPropagation();
        if (ghostClick(all)) return;
        if (RT.route && RT.dest) { routeFit(0); queuePlates(); }
      });
      words.appendChild(all);
      card.appendChild(dot); card.appendChild(words);
      root.appendChild(card);
      var mk = null;
      try { mk = new W.maplibregl.Marker({ element: root, anchor: 'center' }).setLngLat(RT.dest).addTo(S.map); } catch (e) { warn('route chip', e); return; }
      c = RT.chip = { root: root, card: card, dot: dot, txt: txt, sub: sub, all: all, marker: mk, w: 0, h: 0, shown: false };
    }
    try { c.marker.setLngLat(RT.dest); } catch (e) { /* ignore */ }
    c.txt.textContent = RT.text.text;
    if (c.all) c.all.hidden = true;
    var sub = RT.text.sub || '', tip = RT.text.tip || '';
    if (RT.approx) {
      sub = sub ? sub + ' · titik perkiraan' : 'Titik perkiraan';
      tip += '\nTitik toko belum diketahui. Rute menuju titik perkiraan di tengah ' + (/kecamatan/i.test(RT.approx) ? 'kecamatan.' : 'kelurahan.');
    }
    c.sub.textContent = sub;
    c.sub.hidden = !sub;
    c.card.title = tip;
    c.card.style.setProperty('--mf-route', cssRgb(routeInk().line));
    c.w = 0;
  }
  /** Place the chip beside the destination (right, left, above, below …): inside the map, clear of the panels; it is the
      first label placed, so callouts and deck labels keep clear of it. */
  function routeChipPlace(mr, view, occ, placed) {
    var c = RT.chip;
    if (!c || !c.shown || !RT.dest || !S.map) return;
    /* item 43, §4.3: while the callout of this very point is open it says "18,3 km · ± 39 menit" itself: the chip waits */
    var hush = routeChipHushed();
    if (c.root.classList.contains('is-hushed') !== hush) c.root.classList.toggle('is-hushed', hush);
    if (hush) return;
    /* the full-route action only while the branch is out of view (decided when the camera rests, so it never flickers
       during a pan) */
    if (c.all && !(S.map.isMoving && S.map.isMoving())) {
      var wantAll = !!(RT.route && RT.phase === 'on' && !routePointVisible(RT.route.coords[0]));
      if (c.all.hidden === wantAll) { c.all.hidden = !wantAll; c.w = 0; }
    }
    if (!c.w) { c.w = c.card.offsetWidth || 150; c.h = c.card.offsetHeight || 36; }
    var pt;
    try { pt = S.map.project(RT.dest); } catch (e) { return; }
    var x = mr.left + pt.x, y = mr.top + pt.y, w = c.w, hh = c.h, g = 16;
    var right = [g, -hh / 2], left = [-g - w, -hh / 2], up = [-w / 2, -g - hh], down = [-w / 2, g];
    var spots = [right, left, up, down];
    /* the side the line does not come from first (Google-style: the label never sits on its own route) */
    var r = RT.route, from = r ? (r.connector && r.connector[0]) || r.coords[Math.max(0, r.coords.length - 2)] : null;
    if (from) {
      try {
        var q = S.map.project(from), dx = q.x - pt.x, dy = q.y - pt.y;
        if (Math.abs(dx) >= Math.abs(dy)) spots = dx > 0 ? [left, up, down, right] : [right, up, down, left];
        else spots = dy > 0 ? [up, right, left, down] : [down, right, left, up];
      } catch (e) { /* default order */ }
    }
    spots = spots.concat([[g, -hh - 8], [-g - w, -hh - 8], [g, 8], [-g - w, 8]]);
    var pick = null, line = routeNearPx(pt, mr, 260);
    for (var pass = 0; pass < 2 && !pick; pass++) {
      for (var i = 0; i < spots.length; i++) {
        var r = { left: x + spots[i][0] - 2, top: y + spots[i][1] - 2, right: x + spots[i][0] + w + 2, bottom: y + spots[i][1] + hh + 2 };
        if (r.left < view.left || r.top < view.top || r.right > view.right || r.bottom > view.bottom) continue;
        if (clashes(r, occ) || clashes(r, placed)) continue;
        /* first pass: never on the route line itself */
        if (!pass && line.length && clashes(r, line)) continue;
        pick = [spots[i][0], spots[i][1], r];
        break;
      }
    }
    if (!pick) pick = [spots[0][0], spots[0][1], null];
    var tf = 'translate(' + Math.round(pick[0]) + 'px,' + Math.round(pick[1]) + 'px)';
    if (c.card.style.transform !== tf) c.card.style.transform = tf;
    if (pick[2]) placed.push(pick[2]);
  }
  /** The drawn route near the destination as small screen boxes (viewport px), so the chip keeps off its own line. */
  function routeNearPx(pt, mr, radius) {
    var r = RT.route, out = [];
    if (!r || !S.map) return out;
    if (!RT.merc) RT.merc = mercRings([r.coords])[0];
    var a = r.coords[0], b = r.coords[r.coords.length - 1];
    var aff = affineOf(function (p) { return S.map.project(p); }, [Math.min(a[0], b[0]) - 0.01, Math.min(a[1], b[1]) - 0.01], [Math.max(a[0], b[0]) + 0.01, Math.max(a[1], b[1]) + 0.01]);
    if (!aff) return out;
    var m = RT.merc, n = m.length / 2, px = null, py = null, R2 = radius * radius;
    for (var i = 0; i < n; i++) {
      var x = aff.ax * m[2 * i] + aff.bx, y = aff.ay * m[2 * i + 1] + aff.by;
      if (px != null) {
        var dx = x - px, dy = y - py, steps = Math.min(200, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 6));
        for (var k = 0; k <= steps; k++) {
          var sx = px + dx * k / (steps || 1), sy = py + dy * k / (steps || 1), ex = sx - pt.x, ey = sy - pt.y;
          if (ex * ex + ey * ey > R2) continue;
          out.push({ left: mr.left + sx - 4, top: mr.top + sy - 4, right: mr.left + sx + 4, bottom: mr.top + sy + 4 });
        }
      }
      px = x; py = y;
    }
    return out;
  }
  function routeChipShow(on) {
    var c = RT.chip;
    if (!c) return;
    c.shown = !!on;
    c.root.classList.toggle('is-in', !!on);
    if (on) { c.w = 0; queuePlates(); }
  }
  /** Re-read the route after "Jam sibuk" / "Motor (tanpa tol)" changed: a new line draws again, a new time only relabels. */
  function routeRetime() {
    if (!RT.key || !RT.dest || (RT.phase !== 'on' && RT.phase !== 'draw') || RT.manual) return;
    var key = RT.key, dest = RT.dest, seq = RT.seq;
    routeRequest(dest[0], dest[1]).then(function (r) {
      if (seq !== RT.seq || key !== RT.key) return;
      r = routeValid(r) ? r : null;
      /* the same line (a route without toll roads is often the same one): only the chip changes */
      var a = r && r.coords, b = RT.route && RT.route.coords;
      var same = !!(a && b && a.length === b.length && r.km === RT.route.km && a[a.length >> 1][0] === b[b.length >> 1][0] && a[a.length >> 1][1] === b[b.length >> 1][1]);
      if (r && same) { RT.route = Object.assign({}, RT.route, { noToll: !!r.noToll, min: r.min, minPeak: r.minPeak, viaToll: !!r.viaToll }); }
      if (r && !same) {
        RT.route = r; RT.merc = null; RT.cum = cumLengths(r.coords); RT.full = [{ path: r.coords }]; RT.dash = null; RT.dashKey = '';
        RT.text = routeLabel(r, { route: true });
        routeChipShow(false); routeChipBuild();
        RT.phase = 'wait'; RT.fit = true;
        routeSettle();
        return;
      }
      RT.text = r ? routeLabel(r, { route: true }) : routeLabel(distanceOf(dest), { route: false });
      routeChipBuild();
      if (RT.phase === 'on') routeChipShow(true);
      queueLegend();
    });
  }

  /* ---- item 43 (v5): the workspace of progressive cards (MCD.windows, SHELL lane) ----
   * MCD.windows owns every callout, card, rail and drawer. It gives the map its padding (the free rectangle, with
   * {still: true} when only the cards were arranged), and asks the map where the things are that must never be covered
   * (keepTargets, routeScreen) and to move a little (nudge). Everything here feature-detects MCD.windows: without it
   * (or when it is not active: phones, pages) the map behaves as in v4. */
  function wsApi() { var w = MCD.windows; return w && typeof w === 'object' ? w : null; }
  function wsActive() { var w = wsApi(); try { return !!(w && isFn(w.active) && w.active()); } catch (e) { return false; } }
  function wsRects() { var w = wsApi(); try { return w && isFn(w.rects) ? w.rects() : null; } catch (e) { return null; } }
  function calloutKeyNow() {
    var w = wsApi(), k = null;
    try { k = w && isFn(w.calloutKey) ? w.calloutKey() : null; } catch (e) { k = null; }
    return k == null || k === '' ? null : String(k);
  }
  /** A rect as {x, y, w, h} (MCD.windows) or DOMRect-like {left, top, right | width, bottom | height} → {left, top, right,
      bottom}, or null when empty. */
  function rectLTRB(r) {
    if (!r) return null;
    if (finite(r.x) && finite(r.y) && finite(r.w) && finite(r.h)) return r.w > 0 && r.h > 0 ? { left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h } : null;
    if (finite(r.left) && finite(r.top)) {
      var right = finite(r.right) ? r.right : r.left + (+r.width || 0), bottom = finite(r.bottom) ? r.bottom : r.top + (+r.height || 0);
      return right > r.left && bottom > r.top ? { left: r.left, top: r.top, right: right, bottom: bottom } : null;
    }
    return null;
  }
  function xywh(r) { return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.right - r.left), h: Math.round(r.bottom - r.top) }; }
  /** The open callout in client px, 4 px larger (the hover card keeps clear of it), or null. */
  function calloutRect() {
    var w = wsApi();
    if (!w) return null;
    var r = null;
    if (isFn(w.rects)) { var rs = wsRects(); r = rs ? rectLTRB(rs.callout) : null; }
    else {
      var el = null;
      try { el = DOC.querySelector && DOC.querySelector('.ws-co:not([hidden])'); } catch (e) { el = null; }
      if (el && isFn(el.getBoundingClientRect)) r = rectLTRB(el.getBoundingClientRect());
    }
    return r ? { left: r.left - 4, top: r.top - 4, right: r.right + 4, bottom: r.bottom + 4 } : null;
  }
  /** §4.3: the route chip waits while the callout of its own point is open (the callout says the time itself). */
  function routeChipHushed() { var k = RT.key ? calloutKeyNow() : null; return !!(k && k === RT.key); }
  /** The callout / card key of a pick: 'kec:<id>' for a kecamatan, '<kind>:<id>' for anything else. */
  function tipKey(p) {
    if (!p || !p.kind) return '';
    if (isKecKind(p.kind)) return 'kec:' + String(p.kecamatanId != null ? p.kecamatanId : p.id);
    return p.kind + ':' + p.id;
  }
  /** §3.1: no map hover card for what a callout or card already shows (MCD.windows.suppressTip, else the keys). */
  function tipSuppressed(pick) {
    var w = wsApi();
    if (!pick || !w) return false;
    try { if (isFn(w.suppressTip) && w.suppressTip(pick)) return true; } catch (e) { /* the keys below */ }
    var k = tipKey(pick), ck = calloutKeyNow();
    if (ck && k === ck) return true;
    if (!wsActive() || !S.selection) return false;
    if (k === S.selection.kind + ':' + S.selection.id) return true;
    var kid = selectionKec(S.selection);
    return !!(kid && k === 'kec:' + kid);
  }
  var WSW = { src: null, off: null };
  /** Follow MCD.windows layout changes (a callout opened or closed, a card moved): labels and the route chip re-fit. */
  function wsWatch() {
    var w = wsApi();
    if (!w || WSW.src === w || !isFn(w.onLayoutChange)) return;
    if (isFn(WSW.off)) { try { WSW.off(); } catch (e) { /* ignore */ } }
    WSW.src = w; WSW.off = null;
    try {
      WSW.off = w.onLayoutChange(function () {
        invalidateOccluders(); queuePlates();
        if (S.hoverPick && tipSuppressed(S.hoverPick)) hideTip();
      });
    } catch (e) { WSW.off = null; }
  }
  function mapBox() { try { return S.map ? S.map.getContainer().getBoundingClientRect() : null; } catch (e) { return null; } }
  /** The free map rectangle in client px {left, top, right, bottom}: MCD.windows rects().free, else the map box minus
      the padding. */
  function freeClient() {
    var rs = wsRects(), f = rs ? rectLTRB(rs.free) : null;
    if (f) return f;
    var b = mapBox(), p = S.padding;
    if (!b) return null;
    return { left: b.left + (p.left || 0), top: b.top + (p.top || 0), right: b.right - (p.right || 0), bottom: b.bottom - (p.bottom || 0) };
  }
  /** The screen transform of the map now (container px; flat and north-up: scale and offset of Web Mercator). */
  function screenAff() {
    if (!S.map) return null;
    var g;
    try { g = S.map.getCenter(); } catch (e) { return null; }
    if (!g || !finite(g.lng) || !finite(g.lat)) return null;
    return affineOf(function (p) { return S.map.project(p); }, [g.lng - 0.05, g.lat - 0.05], [g.lng + 0.05, g.lat + 0.05]);
  }
  function routeMerc() { if (!RT.route) return null; if (!RT.merc) RT.merc = mercRings([RT.route.coords])[0]; return RT.merc; }
  function routeShown() { return !!(RT.dest && (RT.phase === 'wait' || RT.phase === 'draw' || RT.phase === 'on')); }
  /** Walk the route backwards from the point asked (the end of the dashed connector), in container px: fn(x, y, arc)
      per vertex, arc = px along the line from the point; stops when fn returns false. → false without a route. */
  function routeWalkBack(aff, fn) {
    var m = routeMerc(), d = RT.dest;
    if (!m || !d || !aff) return false;
    var x0 = aff.ax * mercX(d[0]) + aff.bx, y0 = aff.ay * mercY(d[1]) + aff.by, arc = 0;
    if (fn(x0, y0, 0) === false) return true;
    for (var i = m.length / 2 - 1; i >= 0; i--) {
      var x = aff.ax * m[2 * i] + aff.bx, y = aff.ay * m[2 * i + 1] + aff.by;
      arc += Math.sqrt((x - x0) * (x - x0) + (y - y0) * (y - y0));
      if (fn(x, y, arc) === false) break;
      x0 = x; y0 = y;
    }
    return true;
  }
  /** The last len px of the drawn route (container px, from the point backwards; the last point interpolated). */
  function routeTailPts(aff, len) {
    var pts = [], px = null, py = null, pa = 0;
    routeWalkBack(aff, function (x, y, arc) {
      if (arc > len && px != null) {
        var f = (len - pa) / ((arc - pa) || 1);
        pts.push([px + (x - px) * f, py + (y - py) * f]);
        return false;
      }
      pts.push([x, y]); px = x; py = y; pa = arc;
      return true;
    });
    return pts;
  }
  /**
   * routeScreen(maxPts = 64) → [[x, y], …] in client px | null: the route near its destination, for the callout's
   * placement (§3.2: it never sits on the route's last stretch). Points at equal steps along the line (the connector
   * included), from the destination backwards, only those within 240 px of it (the first 960 px of line), at most maxPts:
   * each point stands for one step of line, so (points inside a box) × (their spacing) ≈ the line length inside it.
   * Also while the route is still loading its line ('wait'): the callout already keeps its place clear.
   */
  function routeScreen(maxPts) {
    if (!S.map || !RT.route || !routeShown()) return null;
    var n = Math.max(2, Math.min(512, (+maxPts | 0) || 64)), R2 = 240 * 240, CAP = 960;
    var aff = screenAff(), mr = mapBox(), verts = [];
    if (!aff || !mr) return null;
    routeWalkBack(aff, function (x, y, arc) { verts.push(x, y, arc); return arc < CAP; });
    if (verts.length < 6) return null;
    var x0 = verts[0], y0 = verts[1];
    var sample = function (step, out) {
      var count = 0, s = 0;
      for (var j = 0; j + 5 < verts.length; j += 3) {
        var ax = verts[j], ay = verts[j + 1], aa = verts[j + 2], bx = verts[j + 3], by = verts[j + 4], ba = verts[j + 5];
        while (s <= ba && s <= CAP) {
          var f = ba > aa ? (s - aa) / (ba - aa) : 0, x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
          if ((x - x0) * (x - x0) + (y - y0) * (y - y0) <= R2) {
            count++;
            if (out) { if (out.length >= n) return count; out.push([Math.round((mr.left + x) * 10) / 10, Math.round((mr.top + y) * 10) / 10]); }
          }
          s += step;
        }
      }
      return count;
    };
    var len = sample(4, null) * 4, out = [];
    sample(Math.max(2, len / (n - 1)), out);
    return out.length ? out : null;
  }
  /**
   * positionOf(sel) → [lon, lat] | null: the point a selection stands for (the callout's and the card's anchor; the away
   * rule). A point: its registered position (or the point focusPoint flew to); a kecamatan (or an area of one): its
   * label point.
   */
  function positionOf(sel) {
    if (!sel || sel.id == null) return null;
    var p = selectionPosition(sel);
    if (!p && LASTPT.key === sel.kind + ':' + sel.id) p = LASTPT.pos;
    if (!p) {
      var kid = isKecKind(sel.kind) ? String(sel.id) : (sel.extra && sel.extra.kecamatanId != null && !routeKindOk(sel.kind) ? String(sel.extra.kecamatanId) : null);
      var g = kid ? focusGeo(kid) : null;
      if (g && g.label) p = g.label;
    }
    return p && finite(+p[0]) && finite(+p[1]) ? [+p[0], +p[1]] : null;
  }
  /**
   * keepTargets() → [{id, rect: {x, y, w, h}}] in client px: what no card, callout or tray may cover (§4.1 keepInView).
   *   'sel'         the selected point (radius 24)
   *   'route-end'   the route's destination ring (radius 28)
   *   'route-tail'  the route's last 120 px (its box, 6 px around the line)
   *   'route-chip'  the "x,x km · ± y menit" chip, while it shows
   *   'focus'       the focused kecamatan: its box when it fits the free rectangle, else its label chip
   */
  function keepTargets() {
    var out = [];
    if (!S.map || !S.ready) return out;
    var mr = mapBox();
    if (!mr) return out;
    var proj = function (ll) { try { return S.map.project(ll); } catch (e) { return null; } };
    var circ = function (id, p, r) { if (p && finite(p.x) && finite(p.y)) out.push({ id: id, rect: { x: Math.round(mr.left + p.x - r), y: Math.round(mr.top + p.y - r), w: 2 * r, h: 2 * r } }); };
    var sel = S.selection;
    if (sel && sel.kind && !isKecKind(sel.kind) && !selectionKec(sel)) { var sp = positionOf(sel); if (sp) circ('sel', proj(sp), 24); }
    if (routeShown()) {
      circ('route-end', proj(RT.dest), 28);
      var aff = RT.route ? screenAff() : null, tail = aff ? routeTailPts(aff, 120) : [];
      if (tail.length > 1) {
        var b = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
        tail.forEach(function (q) { b.left = Math.min(b.left, q[0]); b.right = Math.max(b.right, q[0]); b.top = Math.min(b.top, q[1]); b.bottom = Math.max(b.bottom, q[1]); });
        out.push({ id: 'route-tail', rect: xywh({ left: mr.left + b.left - 6, top: mr.top + b.top - 6, right: mr.left + b.right + 6, bottom: mr.top + b.bottom + 6 }) });
      }
      var c = RT.chip;
      if (c && c.shown && !routeChipHushed() && c.card && isFn(c.card.getBoundingClientRect)) {
        var cr = rectLTRB(c.card.getBoundingClientRect());
        if (cr) out.push({ id: 'route-chip', rect: xywh(cr) });
      }
    }
    if (fxLive() && FX.geo) {
      var fb = fxScreenBox(), f = freeClient();
      if (fb) {
        var bw = fb.right - fb.left, bh = fb.bottom - fb.top;
        if (f && bw <= f.right - f.left - 16 && bh <= f.bottom - f.top - 16) {
          out.push({ id: 'focus', rect: xywh({ left: mr.left + fb.left, top: mr.top + fb.top, right: mr.left + fb.right, bottom: mr.top + fb.bottom }) });
        } else {
          var kr = FXC.on && FXC.card && isFn(FXC.card.getBoundingClientRect) ? rectLTRB(FXC.card.getBoundingClientRect()) : null;
          if (kr) out.push({ id: 'focus', rect: xywh(kr) });
          else if (FX.geo.label) { var lp = proj(FX.geo.label); if (lp) out.push({ id: 'focus', rect: { x: Math.round(mr.left + lp.x - 70), y: Math.round(mr.top + lp.y - 16), w: 140, h: 32 } }); }
        }
      }
    }
    return out;
  }
  /**
   * nudge(dx, dy, {ms}) → boolean: pan the camera by screen px, the same sign as MapLibre's panBy (the camera moves
   * by (dx, dy), so every point moves by (−dx, −dy) on screen). Ease-out-quint over ms (default MCD.motion base, 300 ms);
   * a jump under reduced motion or ms 0. Ignored while staff drag the map. A camera flight under way is re-aimed (its
   * target moves by the same px at its own zoom; one flight, never a second one).
   */
  function nudge(dx, dy, o) {
    dx = +dx || 0; dy = +dy || 0; o = o || {};
    if (!S.map || !S.ready || S.dragging) return false;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return false;
    var m = S.map;
    if (S.flight && m.isMoving && m.isMoving()) {
      var t = S.flight.target, z = finite(t.zoom) ? t.zoom : m.getZoom(), c0 = llArr(t.center);
      if (!c0) return false;
      var rem = Math.max(motionDur('fast'), S.flight.duration - (now() - S.flight.t0));
      flightGo(Object.assign({}, t, { center: shiftLL(c0, z, dx, dy) }), rem, !!S.flight.ease, S.flight.id);
      return true;
    }
    var g, z0;
    try { g = m.getCenter(); z0 = m.getZoom(); } catch (e) { return false; }
    var c = shiftLL([g.lng, g.lat], z0, dx, dy), ms = finite(+o.ms) ? Math.max(0, +o.ms) : motionDur('base');
    if (reduced() || !(ms > 0)) { m.jumpTo({ center: c }); S.flight = null; return true; }
    flightGo({ center: c, zoom: z0, pitch: 0, bearing: 0, padding: S.padding }, ms, true, 0, motionEase('out'));
    return true;
  }
  /** fitRoute() → boolean: "Lihat seluruh rute" (route chip or card): branch, route and point in the free area; a focus
      (trail) stays on. */
  function fitRoute() { return !!(RT.route && RT.dest && routeFit(0)); }
  var TK = { timer: 0, seq: 0 };
  /** Without MCD.windows (phones, the old layout) a trail item gets what keepInView gives it otherwise: once the camera
      and the panels have settled, the smallest pan that brings the point into the free map area (the bottom sheet on a
      phone is part of the padding). */
  function trailKeepSoon(dest) {
    clearTimeout(TK.timer);
    var seq = ++TK.seq, tries = 0;
    var run = function () {
      TK.timer = 0;
      if (seq !== TK.seq || !S.map || !RT.trail || RT.dest !== dest || wsActive()) return;
      if (S.map.isMoving && S.map.isMoving() && tries++ < 8) { TK.timer = setTimeout(run, 200); return; }
      var f = freeBox(), pt = null;
      if (!f) return;
      try { pt = S.map.project(dest); } catch (e) { return; }
      var mg = 8, dx = 0, dy = 0;
      if (pt.x < f.left + mg) dx = pt.x - (f.left + mg); else if (pt.x > f.right - mg) dx = pt.x - (f.right - mg);
      if (pt.y < f.top + mg) dy = pt.y - (f.top + mg); else if (pt.y > f.bottom - mg) dy = pt.y - (f.bottom - mg);
      if (dx || dy) nudge(dx, dy, { ms: motionDur('base') });
    };
    TK.timer = setTimeout(run, reduced() ? 0 : 160);
  }
  /** SVG path data of the route drawn so far (share t of its length), in container px. */
  function routePathD(aff, t) {
    var m = routeMerc(), cum = RT.cum, n = m ? m.length / 2 : 0;
    if (n < 2 || !cum || !aff) return '';
    var last = n - 1, tail = null;
    if (t < 1) {
      var L = cum[n - 1] * Math.max(0, t), lo = 0, hi = n - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cum[mid] <= L) lo = mid; else hi = mid; }
      var seg = cum[hi] - cum[lo], f = seg > 0 ? clamp((L - cum[lo]) / seg, 0, 1) : 0;
      last = lo;
      tail = [m[2 * lo] + (m[2 * hi] - m[2 * lo]) * f, m[2 * lo + 1] + (m[2 * hi + 1] - m[2 * lo + 1]) * f];
    }
    var s = '', lx = 0, ly = 0, k = 0;
    for (var i = 0; i <= last; i++) {
      var x = clamp(aff.ax * m[2 * i] + aff.bx, -PATH_LIMIT, PATH_LIMIT), y = clamp(aff.ay * m[2 * i + 1] + aff.by, -PATH_LIMIT, PATH_LIMIT);
      if (k && i < last && Math.abs(x - lx) + Math.abs(y - ly) < 0.6) continue;
      s += (k ? 'L' : 'M') + r1(x) + ' ' + r1(y); lx = x; ly = y; k++;
    }
    if (tail) s += (k ? 'L' : 'M') + r1(clamp(aff.ax * tail[0] + aff.bx, -PATH_LIMIT, PATH_LIMIT)) + ' ' + r1(clamp(aff.ay * tail[1] + aff.by, -PATH_LIMIT, PATH_LIMIT));
    return s;
  }
  /** A small circle as path data (cx, cy in container px), or '' without a point. */
  function dotPathD(aff, ll, rad) {
    if (!aff || !ll) return '';
    var x = clamp(aff.ax * mercX(ll[0]) + aff.bx, -PATH_LIMIT, PATH_LIMIT), y = clamp(aff.ay * mercY(ll[1]) + aff.by, -PATH_LIMIT, PATH_LIMIT);
    return 'M' + r1(x - rad) + ' ' + r1(y) + 'a' + rad + ' ' + rad + ' 0 1 0 ' + (2 * rad) + ' 0a' + rad + ' ' + rad + ' 0 1 0 ' + (-2 * rad) + ' 0Z';
  }
  /**
   * §4.2.3: a route that runs out of the focused kecamatan (a trail: an SMA opened inside it, from KCP outside) is drawn
   * above the frosted layer at full colour, with the branch marker: an SVG inside the veil, so the veil's own inverse
   * mask clips it to the outside of the kecamatan (inside, the deck line shows, under the points). Called on every map
   * frame of the focus (fxMask) and on every frame of the line drawing out or fading (flush).
   */
  function fxRoute() {
    var D0 = FX.dom, R = D0 && D0.route;
    if (!R) return;
    var r = RT.route, on = !!(FX.id && FX.aff && r && RT.dest && (RT.phase === 'draw' || RT.phase === 'on' || RT.phase === 'out'));
    if (!on) {
      if (R.on) {
        R.on = false; R.svg.style.display = 'none';
        [R.casing, R.line, R.link, R.origin, R.dest].forEach(function (p) { p.setAttribute('d', ''); });
      }
      return;
    }
    if (!R.on) { R.on = true; R.svg.style.display = ''; }
    var aff = FX.aff, pk = palKey();
    if (R.key !== pk) {
      var ink = routeInk();
      R.key = pk;
      R.svg.style.setProperty('--mf-route', cssRgb(ink.line));
      R.svg.style.setProperty('--mf-route-casing', cssRgb(ink.casing, 0.92));
      R.svg.style.setProperty('--mf-route-fill', cssRgb(ink.casing));
      R.svg.style.setProperty('--mf-route-link', cssRgb(ink.link, Math.round(ink.linkA / 255 * 100) / 100));
    }
    var d = routePathD(aff, RT.t), cn = r.connector, link = '';
    R.casing.setAttribute('d', d);
    R.line.setAttribute('d', d);
    if (RT.t >= 1 && Array.isArray(cn) && cn.length > 1 && cn[0] && cn[1]) {
      link = 'M' + r1(aff.ax * mercX(cn[0][0]) + aff.bx) + ' ' + r1(aff.ay * mercY(cn[0][1]) + aff.by) +
        'L' + r1(aff.ax * mercX(cn[1][0]) + aff.bx) + ' ' + r1(aff.ay * mercY(cn[1][1]) + aff.by);
    }
    R.link.setAttribute('d', link);
    R.origin.setAttribute('d', dotPathD(aff, r.coords[0], 5));
    R.dest.setAttribute('d', RT.t >= 0.98 ? dotPathD(aff, RT.dest, 10) : '');
    var a = String(Math.round(RT.a * 1000) / 1000);
    if (R.svg.style.opacity !== a) R.svg.style.opacity = a;
  }

  /* ---- public: focus and route ---- */

  /** focusArea({kind: 'kecamatan', id, source?, reserveRight?, camera?: false, refit?: true}) → boolean: focus mode on that
      kecamatan. refit: when that kecamatan is in focus already (a "Perbesar ke kecamatan" button), fly to it again with
      the room of the signal that holds it, even after staff moved the map; nothing new holds the focus. */
  function focusArea(o) {
    if (!o || o.id == null) return false;
    var kind = String(o.kind || 'kecamatan');
    if (!isKecKind(kind) || !focusGeo(o.id)) return false;
    if (o.refit && FX.id === String(o.id) && (FX.phase === 'enter' || FX.phase === 'on') && FX.geo) {
      FX.userMoved = false;
      fxFly(FX.geo, fxTop());
      return true;
    }
    var src = o.source === 'popup' || o.source === 'filter' || o.source === 'selection' || o.source === 'trail' ? o.source : 'api';
    fxHold(src, String(o.id), { reserveRight: o.reserveRight, camera: o.camera });
    return true;
  }
  /** clearFocus({reason?, source?}): leave focus mode (Tutup, Esc, a click outside: 'button' | 'esc' | 'outside'). With a
      source, only that signal lets go (the territory popup closed by a section, for example). */
  function clearFocus(o) {
    o = o || {};
    if (o.source) { fxHold(String(o.source), null); return; }
    fxClear(o.reason || 'api');
  }
  /** showRoute(route, {label?}): draw a route object of MCD.travel.route / MCD.distance.route as the selection's route. */
  function showRoute(route, o) {
    if (!routeValid(route)) return false;
    var c = route.connector, dest = Array.isArray(c) && c.length > 1 ? c[c.length - 1] : route.coords[route.coords.length - 1];
    routeStart('manual:' + (++RT.seq), [+dest[0], +dest[1]], route, o && o.label);
    return true;
  }

  /* -------------------------------------------------------- registration */

  function registerLayers(key, fn, opts) {
    if (!key || !isFn(fn)) return function () {};
    opts = opts || {};
    var id = opts.id || 'default';
    var t = S.reg.layers[key] || (S.reg.layers[key] = {});
    t[id] = { fn: fn, builtin: !!opts.builtin, withBuiltin: !!opts.withBuiltin };
    delete FAILED['layers:' + key];
    S.sectionCache.key = '';
    if (S.ready) scheduleCompose();
    return function () { if (S.reg.layers[key] && S.reg.layers[key][id] && S.reg.layers[key][id].fn === fn) { delete S.reg.layers[key][id]; S.sectionCache.key = ''; scheduleCompose(); } };
  }
  function registerPosture(key, posture) {
    if (!key) return;
    S.reg.postures[key] = posture;
    if (S.ready && (S.section === key || S.postureKey === key)) { S.posture = resolvePosture(S.section, S.tab, S.postureOpts && S.postureOpts.posture); applyPostureNow({ camera: false }); }
  }
  function registerPreset(key, def) { if (key && def) S.reg.presets[String(key)] = def; }
  function registerLegend(key, fn) { if (key && isFn(fn)) { S.reg.legends[key] = fn; delete FAILED['legend:' + key]; S.legendKey = ''; queueLegend(); } }
  function registerStyle(key, spec) {
    if (!key || !spec) return;
    S.reg.styles[key] = Object.assign({}, spec, { _installed: false });
    if (S.ready) installStyles();
  }
  function registerRingSet(name, def) {
    if (!name || !def) return;
    S.reg.ringSets[name] = def;
    if (S.ringSetName === name) updateRings();
  }
  function registerTooltip(prefix, fn, kind) {
    if (!prefix || !isFn(fn)) return;
    S.reg.tooltips = S.reg.tooltips.filter(function (t) { return t.prefix !== prefix; });
    S.reg.tooltips.push({ prefix: prefix, fn: fn, kind: kind || null });
    S.reg.tooltips.sort(function (a, b) { return b.prefix.length - a.prefix.length; });
  }
  function registerSelectable(kind, fn) { if (kind && isFn(fn)) S.reg.selectables[kind] = fn; }
  function whenReady(fn) { if (!isFn(fn)) return; if (S.ready) fn(api); else S.pendingReady.push(fn); }

  /* ------------------------------------------------------------------- kit */

  var kit = {
    palette: C, heatRGB: HEAT_RGB, productRGB: PRODUCT_RGB, productGlyph: PRODUCT_GLYPH, productOrder: PRODUCT_ORDER,
    smeGroupRGB: SME_GROUP_RGB, smeGroupCode: SME_GROUP_CODE,
    rgba: rgba, heatColor: heatColor, cssRgb: cssRgb, zoomInterp: zoomInterp, metersPerPixel: metersPerPixel,
    quantileThresholds: quantileThresholds, stepOf: stepOf, hexbin: hexbin,
    HEX_UNIT_VERTICES: HEX_UNIT_VERTICES, GLOW_PARAMS: GLOW_PARAMS, beforeId: DECK_BEFORE,
    fonts: { sans: FONT_SANS, mono: FONT_MONO },
    atlas: buildAtlas, glyphSVG: glyphSVG, glyphNames: GLYPH_ORDER.slice(),
    symbolSprite: symbolSprite, badgeSprite: badgeSprite, spriteAtlas: spriteAtlas, matraRGB: MATRA_RGB,
    tierSprite: tierSprite, tierAtlas: tierAtlas, tierGeom: tierGeom, tierOffset: tierOffset, tierSVG: tierSVG, tierInk: TIER_INK,
    shapes: { shield: SHIELD_PTS, triangle: TRI_PTS, plus: PLUS_PTS, sparkle: SPARKLE_PTS },
    /* V8 P3: the plan overlay's ink, badge and line (QA, tests) */
    plan: { ink: PLAN_INK, badgePx: PLAN_BADGE_PX, lineWidth: PLAN_LINE_W, lineAlpha: PLAN_LINE_A, dash: PLAN_DASH, badgeSprite: planBadgeSprite },
    easing: { outExpo: outExpo, inOutCubic: inOutCubic, camera: easeCamera, standard: easeStandard },
    geo: { haversineKm: haversineKm, bearingDeg: bearingDeg, destination: destination, circle: circleRing, bbox: bboxOf, pointInRing: pointInRing },
    fmt: { int: fmtInt, dec: fmtDec, rp: fmtRp, km: fmtKm, pct: fmtPct, coord: fmtCoord, bandRp: bandRp },
    centers: { branch: branchLL, mabes: MABES_CENTROID, sme: SME_CENTER, home: HOME_VIEW }
  };

  /* -------------------------------------------------------------- public */

  var api = (MCD.map && typeof MCD.map === 'object') ? MCD.map : {};
  Object.assign(api, {
    init: init, style: style, render: render, requestRender: requestRender, clearData: clearData,
    setLayout: setLayout, setPosture: setPosture, preset: preset, presets: presetList,
    setLayers: setLayers, setLayerSet: setLayerSet,
    setHover: setHover, select: select, focusSite: focusSite, focusPoint: focusPoint,
    /** item 30: setZones({mode:'kecamatan15'} | {mode:'radius', km} | {mode:'none'}) · zones() → the zones in effect;
        v6: {mode:'kecamatan', km: 30} (the 30 km kecamatan zones, MCD.territory.zones(30)) */
    setZones: setZones, zones: zonesNow,
    /** item 38: kecamatan focus mode. focusArea({kind:'kecamatan', id, source?, reserveRight?, camera?}) → boolean;
        clearFocus({reason?, source?}); focused() → kecamatan id | null; focusState() → {id, phase, p, name, sources, lite, settled}.
        It also follows the selection (a kecamatan kind), the territory popup and the Merchant kecamatan filter by itself. */
    focusArea: focusArea, clearFocus: clearFocus,
    focused: function () { return fxLive() ? FX.id : null; }, focusState: fxState,
    /** item 36: the route from the branch. It follows a point selection by itself; showRoute(route, {label}) draws a given
        route object, clearRoute() removes it, routeState() → {key, phase, dest, km, min, noToll, points, t, text, sub, line}. */
    showRoute: showRoute, clearRoute: function () { routeClear(); }, routeState: routeState,
    /** item 43 (v5, the MCD.windows contract, LAYOUT_V5C §7.5):
        positionOf(sel) → [lon, lat] | null (a point's position; a kecamatan's label point);
        keepTargets() → [{id: 'sel' | 'route-end' | 'route-tail' | 'route-chip' | 'focus', rect: {x, y, w, h}}] (client px);
        routeScreen(maxPts = 64) → [[x, y], …] client px within 240 px of the destination, at equal steps | null;
        nudge(dx, dy, {ms}) → boolean (panBy sign: the camera moves by dx, dy; ease-out, a jump with reduced motion;
        ignored while staff drag; re-aims a flight); fitRoute() → boolean ("Lihat seluruh rute"; a trail's focus stays).
        setLayout(pad, {still: true}) keeps the map content still on screen. A point inside the focused kecamatan, or with
        extra.trail, keeps the focus (signal 'trail'); the route chip waits while MCD.windows.calloutKey() is its point. */
    positionOf: positionOf, keepTargets: keepTargets, routeScreen: routeScreen, nudge: nudge, fitRoute: fitRoute,
    /** item 34: cached canvas sprites for deck IconLayer and legends (v6: shapes 'shield' and 'triangle', `hollow`;
        V8: 'plus' and 'sparkle' for Kesehatan) */
    symbolSprite: symbolSprite, badgeSprite: badgeSprite, spriteAtlas: spriteAtlas,
    /** V8 (V7_SPEC §7.6, V8_SPEC P3): the visit plan's numbered badges and dashed order line (never pickable).
        setPlanOverlay({stops: [{seq, lon, lat}], line, returnToStart, start?}) → boolean; clearPlanOverlay();
        planOverlay() → {stops, line, returnToStart} | null */
    setPlanOverlay: setPlanOverlay, clearPlanOverlay: clearPlanOverlay, planOverlay: planOverlay,
    /** V8 (MOBILE_UX_PLAN M4, M10 item 3): the picking radius in px (14 on a coarse pointer, else 4) and the map's pixel
        ratio (at most 2 on a coarse pointer, 3 with a mouse) */
    pickRadius: pickRadius, pixelRatio: mapPixelRatio,
    /** fix round 19 Oct 2026: the GPU's MAX_TEXTURE_SIZE as probed at init (0 = not known yet) */
    maxTextureSize: function () { return S.maxTexture || 0; },
    /** v6 (V6_SPEC D6, §4.3): the kelas biaya badge. tierSprite({level 1-4, basis, theme, px}) → sprite | null (level 0);
        tierAtlas({theme, px}) → atlas with byName '1f'…'4e'; tierOffset(symbolPx, sprite) → [dx, dy]; tierSVG({level, basis,
        theme, size}) → <svg> for legends and cards; tierGeom(spec) → the rectangles (QA and tests) */
    tierSprite: tierSprite, tierAtlas: tierAtlas, tierOffset: tierOffset, tierSVG: tierSVG, tierGeom: tierGeom,
    flyTo: flyTo, fitBounds: fitBounds,
    getCamera: getCamera, setCamera: setCamera, intro: intro,
    setView: setView, setTheme: setTheme, getView: function () { return S.view; }, getTheme: function () { return S.theme; },
    hexbin: hexbin,
    onPick: function (fn) { return on('pick', fn); }, onHover: function (fn) { return on('hover', fn); },
    on: on, off: off, whenReady: whenReady, isReady: function () { return S.ready; }, failed: function () { return S.failed; },
    getMap: function () { return S.map; }, getOverlay: function () { return S.overlay; },
    registerLayers: registerLayers, registerPosture: registerPosture, registerPreset: registerPreset,
    registerLegend: registerLegend, registerStyle: registerStyle, registerRingSet: registerRingSet,
    registerTooltip: registerTooltip, registerSelectable: registerSelectable,
    mountTelemetry: mountTelemetry, mountScale: mountScale, mountLegend: mountLegend, legendModel: legendModel,
    posture: function () { return S.posture || null; },
    setOccluders: function (sel) { S.occluderSel = sel || ''; invalidateOccluders(); queuePlates(); },
    /** Re-fit the map labels after panels changed size or place (legend opened, drawer, sheet). */
    relayoutLabels: function () { invalidateOccluders(); queuePlates(); },
    setImagery: setImagery, showFps: showFps,
    /** "Warna asli" on the satellite (Detail): false = calm greyscale (the default), true = natural colour. */
    setTrueColour: setTrueColour, trueColour: function () { return !!S.trueColour; },
    /** calmPaint(theme, styleLayer) → the neutral greyscale paint given to an OpenFreeMap layer (items 23, 25). */
    calmPaint: calmPaint,
    resize: function () { if (S.map) S.map.resize(); invalidateOccluders(); queuePlates(); },
    snapshot: function () {
      var m = S.map;
      return { section: S.section, tab: S.tab, zoom: S.zoom, veil: S.veil, radiusKm: S.radiusKm,
        pitch: m ? m.getPitch() : 0, bearing: m ? m.getBearing() : 0, flat: true,
        imageryOK: S.imageryOK, ofmOK: S.ofmOK, fontsReady: S.fontsReady, ready: S.ready,
        flight: S.flight ? { id: S.flight.id, center: S.flight.target.center, zoom: S.flight.target.zoom } : null,
        view: S.view, theme: S.theme, palette: S.pal, street: { day: S.street.day, night: S.street.night },
        focus: fxState(), route: routeState() };
    },
    /* internal, for tests/map-v4.test.mjs: the pure pieces of items 36 and 38 (not a public API) */
    _v4: { mercX: mercX, mercY: mercY, affineOf: affineOf, mercRings: mercRings, ringsPathData: ringsPathData, maskPathData: maskPathData,
      makePip: makePip, partialPath: partialPath, cumLengths: cumLengths, dashPieces: dashPieces, routeLabel: routeLabel, isKecKind: isKecKind,
      routeKindOk: routeKindOk, focusGeo: focusGeo, fxEval: fxEval, fxHold: fxHold, fxTop: fxTop, fxSplit: fxSplit, localRoute: localRoute,
      routeLayers: routeLayers, selectionChanged: selectionChanged, motionEase: motionEase, flightMs: flightMs, FX: FX, RT: RT,
      atlasCanvasFor: function (url) { return ATLAS_URL ? ATLAS_URL.get(url) || null : null; },
      fxJudge: fxJudge, flightEase: flightEase, WARM: WARM, buildAtlas: buildAtlas, layoutLabels: layoutLabels },
    /* internal, for tests/map-v8.test.mjs (V8 P3, P5): not a public API */
    _v8: { planDash: planDash, planPath: planPath, planLayers: planLayers, planLegend: planLegend, fxChipData: fxChipData,
      PLAN: function () { return PLAN; }, coarsePointer: coarsePointer },
    /* internal, for tests/map-v5.test.mjs (item 43): not a public API */
    _v5: { shiftLL: shiftLL, rectLTRB: rectLTRB, tipKey: tipKey, tipSuppressed: tipSuppressed, trailOf: trailOf, routePathD: routePathD,
      routeTailPts: routeTailPts, screenAff: screenAff, freeClient: freeClient, calloutRect: calloutRect, routeChipHushed: routeChipHushed,
      drawerShiftPx: drawerShiftPx, drawerLeftPx: drawerLeftPx, fxReserve: fxReserve, positionTip: positionTip, S: S,
      notePress: notePress, ghostClick: ghostClick, chipYield: chipYield, chipKeepOut: chipKeepOut, kecChipLayer: kecChipLayer, fxStraddles: fxStraddles, baseCut: baseCut, BCUT: BCUT, cutOpacity: cutOpacity },
    kit: kit
  });
  MCD.map = api;
})(window.MCD = window.MCD || {});
