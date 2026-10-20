/* ==========================================================================
 * MCD.schools.map: school symbols for the map, the legend, popups and lists (COPY_STYLE_EN item 34; v6:
 * docs/V6_SPEC.md §3.2, D5, D6: SMK and MA are full layers).
 *
 *   shape  = jenis   SMA ● circle · MA ◆ diamond · SMK ■ rounded square
 *   colour = status  for all three jenis: negeri = Mandiri blue · swasta (yayasan) = kuning · belum diketahui =
 *          grey; SMA yayasan TNI = kuning + small navy star (the 'ctx' tone of v5 is gone: SMK and MA are counted
 *          layers with their own status colour since v6)
 *   size   every jenis in the same three steps by students (under 300 · 300–799 · 800 or more, "titik lebih besar
 *          = siswa lebih banyak"); no count = the smallest step
 *   kelas biaya (D6): a small "signal bars" badge at the symbol's top right, from MCD.map.tierSprite (MAP lane);
 *          tierAtlas(theme) packs the eight badges (four levels, filled or outline); null without the map's sprite
 *
 * The section draws the points with a deck.gl IconLayer from atlas(theme). Each sprite comes from
 * MCD.map.symbolSprite (the map's shared sprite maker) when it exists, else it is drawn here on a canvas.
 * Canvas sprite drawing is the one place where this section keeps raw colours (style guide); everything
 * on the page itself uses tokens. Pure parts (spec, sizeStep, px, colours, legend model) run in Node.
 *
 * API
 *   spec({jenis: 'sma'|'ma'|'smk', negeri: bool, unknown: bool, tni: bool, students: number|null})
 *        → {jenis, shape, glyph, status: 'negeri'|'swasta'|'unknown', tone (= status), star, step, key}
 *   sizeStep(students) → 0 | 1 | 2 (no count → 0)       px(spec, zoom) → icon size in px
 *   colours(theme) → {negeri, swasta, unknown, star, keyline, edge} as [r, g, b]      rgb(tone, theme)
 *   atlas(theme) → {iconAtlas, iconMapping, key} | null (no canvas, e.g. in Node); iconKey(spec) → its icon name
 *        (symbol + size step: the map's sprites are made per step at 1,5 × the zoom-13 size; own drawing: one cell)
 *   spriteUrl(spec, theme) → data URL | null             chip(spec, theme, {title}) → <span class="sk-sym">
 *   legend(theme, counts) → {rows, note} for MCD.map.registerLegend (glyph names of map.js), v6 §3.2: one row per
 *        jenis shown ("SMK: kotak" + its count), one colour line, the TNI star row, the faded row; the size rule is
 *        the note. counts follow the shared display rule: {jenis: {sma, smk, ma} (counted symbols per jenis shown;
 *        a jenis that is off is left out), tniStar (SMA of TNI foundations), inactive}; the jenis rows add up to the
 *        schools counted on the panel
 *   tierAtlas(theme) → {iconAtlas, iconMapping, key} | null; tierKey(level, basis) → 'tier-<level>-fill|line'
 *   words(spec) → "SMA swasta · yayasan TNI"
 * ========================================================================== */
(function (MCD) {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var SC = MCD.schools = MCD.schools || {};
  var M = SC.map = SC.map || {};

  var STEPS = [300, 800];                          // students: under 300 · 300–799 · 800 or more
  var BASE_PX = { sma: [12, 16, 21] };            // icon size in px at zoom 13, every jenis (v6)
  var ZOOM_F = [[9, 0.7], [11, 0.85], [13, 1], [15, 1.25], [17, 1.5]];
  var SHAPE = { sma: 'circle', ma: 'diamond', smk: 'rsq' };
  var GLYPH = { circle: 'circle', diamond: 'diamond', rsq: 'rsquare' };   // legend / tooltip glyphs of map.js
  var JENIS = { sma: 'SMA', ma: 'MA', smk: 'SMK' };
  /* canvas sprite colours: Mandiri blue, kuning, Mandiri navy for the star, grey for a school whose status is not
     known, a keyline that separates the symbol from the grey base map (white by day, near-black by night) and a
     faint outer edge */
  var COLOURS = {
    day: { negeri: [11, 95, 176], swasta: [226, 150, 12], unknown: [104, 116, 134], star: [0, 36, 74], keyline: [255, 255, 255], edge: [24, 34, 52], edgeA: 0.42 },
    night: { negeri: [84, 152, 238], swasta: [242, 178, 52], unknown: [158, 168, 184], star: [0, 36, 74], keyline: [9, 14, 26], edge: [9, 14, 26], edgeA: 0.9 }
  };
  var KEYS = ['circle-negeri', 'circle-swasta', 'circle-swasta-star', 'circle-negeri-star', 'circle-unknown',
    'diamond-negeri', 'diamond-swasta', 'diamond-unknown', 'rsq-negeri', 'rsq-swasta', 'rsq-unknown'];
  var STATUS_WORD = { negeri: 'negeri', swasta: 'swasta', unknown: 'jenis belum diketahui' };
  var SHAPE_WORD = { sma: 'lingkaran', smk: 'kotak', ma: 'belah ketupat' };
  var CELL = 64;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function themeOf(t) { return t === 'day' ? 'day' : 'night'; }

  /* ------------------------------------------------------------ pure model */

  M.STEPS = STEPS.slice();
  M.KEYS = KEYS.slice();
  M.sizeStep = function (n) { return !isNum(n) || n < STEPS[0] ? 0 : n < STEPS[1] ? 1 : 2; };
  /* status = negeri / swasta / unknown (a TNI foundation school is always swasta or negeri); tone = the colour =
     the status, for every jenis (v6); the star only on SMA yayasan TNI */
  M.spec = function (o) {
    o = o || {};
    var jenis = SHAPE[o.jenis] ? o.jenis : 'sma', shape = SHAPE[jenis], star = jenis === 'sma' && !!o.tni;
    var status = o.negeri ? 'negeri' : (o.unknown && !o.tni) ? 'unknown' : 'swasta';
    return { jenis: jenis, shape: shape, glyph: GLYPH[shape], status: status, tone: status, star: star,
      step: M.sizeStep(o.students), key: shape + '-' + status + (star ? '-star' : '') };
  };
  function specOfKey(k) {
    var p = String(k).split('-');
    var jenis = p[0] === 'diamond' ? 'ma' : p[0] === 'rsq' ? 'smk' : 'sma';
    return M.spec({ jenis: jenis, negeri: p[1] === 'negeri', unknown: p[1] === 'unknown', tni: p[2] === 'star' });
  }
  M.specOfKey = specOfKey;
  function zoomF(z) {
    if (!isNum(z)) return 1;
    if (z <= ZOOM_F[0][0]) return ZOOM_F[0][1];
    for (var i = 1; i < ZOOM_F.length; i++) {
      var a = ZOOM_F[i - 1], b = ZOOM_F[i];
      if (z <= b[0]) return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]);
    }
    return ZOOM_F[ZOOM_F.length - 1][1];
  }
  M.px = function (spec, zoom) {
    var base = BASE_PX.sma[(spec && spec.step) || 0];
    /* a diamond fills less of its box than a circle: a little larger, so the three jenis read the same size */
    if (spec && spec.shape === 'diamond') base *= 1.12;
    return Math.round(base * zoomF(zoom) * 10) / 10;
  };
  M.colours = function (theme) {
    var C = COLOURS[themeOf(theme)], out = {};
    Object.keys(C).forEach(function (k) { out[k] = Array.isArray(C[k]) ? C[k].slice() : C[k]; });
    return out;
  };
  M.rgb = function (tone, theme) { var C = M.colours(theme); return /^(negeri|swasta|unknown)$/.test(tone) ? C[tone] : C.swasta; };
  M.words = function (spec) {
    if (!spec) return '';
    var s = spec.status || (spec.tone === 'negeri' ? 'negeri' : 'swasta');
    return JENIS[spec.jenis] + (s === 'unknown' ? ' · ' : ' ') + (STATUS_WORD[s] || 'swasta') + (spec.star ? ' · yayasan TNI' : '');
  };

  /* ------------------------------------------------------------ drawing */

  function css(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }
  function shapePath(ctx, shape, cx, cy, r) {
    ctx.beginPath();
    if (shape === 'diamond') {
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath();
    } else if (shape === 'rsq') {
      var h = r * 0.84, rr = Math.max(1, r * 0.3), x = cx - h, y = cy - h, w = 2 * h;
      ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr);
      ctx.lineTo(x + w, y + w - rr); ctx.arcTo(x + w, y + w, x + w - rr, y + w, rr);
      ctx.lineTo(x + rr, y + w); ctx.arcTo(x, y + w, x, y + w - rr, rr);
      ctx.lineTo(x, y + rr); ctx.arcTo(x, y, x + rr, y, rr); ctx.closePath();
    } else {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  function starPath(ctx, cx, cy, ro, ri) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? ri : ro, a = (-90 + i * 36) * Math.PI / 180;
      if (i) ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); else ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  }
  /** One sprite in a CELL × CELL box at (ox, oy): faint edge, keyline, the fill, and the TNI star. */
  function drawSprite(ctx, ox, oy, spec, theme) {
    var C = COLOURS[themeOf(theme)], cx = ox + CELL / 2, cy = oy + CELL / 2;
    var R = spec.shape === 'diamond' ? CELL / 2 - 2 : CELL / 2 - 4;
    var key = spec.shape === 'diamond' ? 7 : 5;
    shapePath(ctx, spec.shape, cx, cy, R); ctx.fillStyle = css(C.edge, C.edgeA); ctx.fill();
    shapePath(ctx, spec.shape, cx, cy, R - 2); ctx.fillStyle = css(C.keyline); ctx.fill();
    shapePath(ctx, spec.shape, cx, cy, R - 2 - key); ctx.fillStyle = css(C[spec.tone]); ctx.fill();
    if (spec.star) {
      var ri = R - 2 - key;
      starPath(ctx, cx, cy, ri * 0.66, ri * 0.28); ctx.fillStyle = css(C.star); ctx.fill();
    }
  }
  function isCanvas(x) { return !!x && typeof x.getContext === 'function' && x.width > 0 && x.height > 0; }
  function hasMapSprite() { return !!(MCD.map && typeof MCD.map.symbolSprite === 'function'); }
  /** The map's shared sprite (MCD.map.symbolSprite → {id, url, canvas, …}) at px CSS pixels, when the map provides one. */
  function mapSprite(spec, theme, px) {
    if (!hasMapSprite()) return null;
    try {
      var C = COLOURS[themeOf(theme)];
      var r = MCD.map.symbolSprite({ shape: spec.shape, fill: C[spec.tone].slice(), ring: C.keyline.slice(), star: spec.star, px: px });
      if (isCanvas(r)) return { id: 'c' + px + spec.key, canvas: r, url: null };
      return r && isCanvas(r.canvas) ? r : null;
    } catch (e) { return null; }
  }
  function canvas(w, h) {
    var doc = root.document;
    if (!doc || typeof doc.createElement !== 'function') return null;
    var c = doc.createElement('canvas');
    if (!c || typeof c.getContext !== 'function') return null;
    c.width = w; c.height = h;
    return c;
  }
  function toUrl(cv) { try { return cv && cv.toDataURL ? cv.toDataURL('image/png') : ''; } catch (e) { return ''; } }

  /* icon keys of the deck layer: the symbol plus its size step ('circle-swasta-star|s2', 'rsq-negeri|s0') */
  var SPRITE_SCALE = 1.5;          // map sprites are made 1,5 × the zoom-13 size, so they only ever scale down
  function basePx(spec) { return M.px(spec, 13); }
  M.iconKey = function (spec) { return spec ? spec.key + '|s' + (spec.step || 0) : ''; };
  var ICONS = [];
  KEYS.forEach(function (k) { [0, 1, 2].forEach(function (st) { ICONS.push(k + '|s' + st); }); });
  M.ICONS = ICONS.slice();
  function specOfIcon(ik) {
    var p = ik.split('|'), sp = specOfKey(p[0]);
    sp.step = +(p[1] || 's0').slice(1) || 0;
    return sp;
  }

  var ATL = {};
  /** The map's sprites packed into one atlas (MCD.map.spriteAtlas when present), keyed by icon key; null if any is missing. */
  function mapAtlas(theme) {
    var list = [], ids = {};
    for (var n = 0; n < ICONS.length; n++) {
      var sp = specOfIcon(ICONS[n]), r = mapSprite(sp, theme, Math.ceil(basePx(sp) * SPRITE_SCALE));
      if (!r) return null;
      list.push(r); ids[ICONS[n]] = r.id;
    }
    var mapping = {}, atlasCv = null, src = null;
    if (MCD.map && typeof MCD.map.spriteAtlas === 'function') {
      try { src = MCD.map.spriteAtlas(list); } catch (e) { src = null; }
    }
    if (src && src.iconAtlas && src.iconMapping) {
      atlasCv = src.iconAtlas;
      ICONS.forEach(function (ik) { var m = src.iconMapping[ids[ik]]; if (m) mapping[ik] = Object.assign({}, m, { mask: false }); });
    } else {
      var w = 0, h = 0;
      list.forEach(function (r) { w = Math.max(w, r.canvas.width); h += r.canvas.height + 2; });
      atlasCv = canvas(w || 1, h || 1);
      var ctx = atlasCv && atlasCv.getContext('2d'), y = 0;
      if (!ctx) return null;
      list.forEach(function (r, k) {
        ctx.drawImage(r.canvas, 0, y);
        mapping[ICONS[k]] = { x: 0, y: y, width: r.canvas.width, height: r.canvas.height, anchorX: r.canvas.width / 2, anchorY: r.canvas.height / 2, mask: false };
        y += r.canvas.height + 2;
      });
    }
    if (Object.keys(mapping).length !== ICONS.length) return null;
    var url = typeof atlasCv === 'string' ? atlasCv : toUrl(atlasCv);
    return url ? { iconAtlas: url, iconMapping: mapping } : null;
  }
  /** Own drawing: one CELL per symbol; every size step points at the same cell. */
  function ownAtlas(theme) {
    var cv = canvas(KEYS.length * CELL, CELL), ctx = cv && cv.getContext('2d');
    if (!ctx) return null;
    var cell = {}, mapping = {};
    KEYS.forEach(function (k, n) {
      drawSprite(ctx, n * CELL, 0, specOfKey(k), theme);
      cell[k] = { x: n * CELL, y: 0, width: CELL, height: CELL, anchorX: CELL / 2, anchorY: CELL / 2, mask: false };
    });
    ICONS.forEach(function (ik) { mapping[ik] = cell[ik.split('|')[0]]; });
    var url = toUrl(cv);
    return url ? { iconAtlas: url, iconMapping: mapping } : null;
  }
  /** One atlas per theme with every symbol and size, for the deck.gl IconLayer (mask off: real colours). */
  M.atlas = function (theme) {
    theme = themeOf(theme);
    var key = theme + (hasMapSprite() ? ':map' : ':own');
    if (ATL[key]) return ATL[key];
    var A = (hasMapSprite() ? mapAtlas(theme) : null) || ownAtlas(theme);
    if (!A) return null;
    A.key = key;
    ATL[key] = A;
    return A;
  };

  var SPR = {};
  /** A single symbol as a data URL (legend rows, list chips and popups use the same picture as the map). */
  M.spriteUrl = function (spec, theme) {
    if (!spec) return null;
    theme = themeOf(theme);
    var k = theme + '|' + spec.key + (hasMapSprite() ? ':map' : ':own');
    if (Object.prototype.hasOwnProperty.call(SPR, k)) return SPR[k];
    var url = null, r = mapSprite(spec, theme, 16);
    if (r) url = r.url || toUrl(r.canvas) || null;
    if (!url) {
      var cv = canvas(CELL, CELL), ctx = cv && cv.getContext('2d');
      if (ctx) { drawSprite(ctx, 0, 0, spec, theme); url = toUrl(cv) || null; }
    }
    SPR[k] = url;
    return url;
  };

  /** <span class="sk-sym"> with the symbol picture (or a token-coloured CSS shape when no canvas exists). */
  M.chip = function (spec, theme, opts) {
    var doc = root.document;
    if (!doc || !spec) return null;
    opts = opts || {};
    var wrap = doc.createElement('span');
    wrap.className = 'sk-sym sk-sym--' + spec.shape + ' is-' + spec.tone + (spec.star ? ' has-star' : '') + (opts.cls ? ' ' + opts.cls : '');
    wrap.setAttribute('aria-hidden', 'true');
    if (opts.title) wrap.title = opts.title;
    var url = M.spriteUrl(spec, theme);
    if (url) {
      var img = doc.createElement('img');
      img.src = url; img.alt = ''; img.width = 16; img.height = 16; img.decoding = 'async';
      wrap.appendChild(img);
    } else {
      wrap.appendChild(doc.createElement('i'));
    }
    return wrap;
  };

  /**
   * Legend group "Sekolah dalam {km} km" (v6 §3.2, kept short: at most six rows). counts = {jenis: {sma, smk, ma},
   * tni, inactive}: one row per jenis shown (its shape in kuning, "SMK: kotak", the count of its counted symbols), the
   * colour line in words, the TNI star row, the faded "kemungkinan tidak aktif" row; the size rule is the note. The
   * split by status lives in the lists and in each row's title, not in more rows.
   */
  var LEGEND_JENIS = [['sma', 'circle-swasta', 'circle', 'SMA'], ['smk', 'rsq-swasta', 'rsquare', 'SMK'], ['ma', 'diamond-swasta', 'diamond', 'MA']];
  M.COLOUR_LINE = 'Biru = negeri. Kuning = swasta. Abu-abu = belum diketahui.';
  M.SIZE_LINE = 'Titik lebih besar = siswa lebih banyak: di bawah 300, 300–799, 800 atau lebih.';
  M.legend = function (theme, counts) {
    var c = counts || {}, C = COLOURS[themeOf(theme)], rows = [], J = c.jenis || {};
    function img(key) { return M.spriteUrl(specOfKey(key), theme); }
    /* imgKey: the map's legend cache key for picture rows (the picture changes with the theme) */
    function ik(key) { return 'sk|' + themeOf(theme) + '|' + key + (hasMapSprite() ? ':map' : ':own'); }
    LEGEND_JENIS.forEach(function (d) {
      if (!isNum(J[d[0]])) return;
      rows.push({ glyph: d[2], rgb: C.swasta.slice(), img: img(d[1]), imgKey: ik(d[1]), label: d[3] + ': ' + SHAPE_WORD[d[0]], count: J[d[0]],
        title: c.split && c.split[d[0]] ? c.split[d[0]] : null });
    });
    rows.push({ glyph: 'none', label: M.COLOUR_LINE });
    /* the star is on SMA only: its row counts the SMA of TNI foundations (tniStar), not their SMK */
    var stars = isNum(c.tniStar) ? c.tniStar : c.tni;
    if (stars) rows.push({ glyph: 'circle', rgb: C.swasta.slice(), img: img('circle-swasta-star'), imgKey: ik('circle-swasta-star'), label: 'SMA yayasan TNI: bintang biru tua', count: stars });
    if (c.inactive) rows.push({ glyph: 'circle', rgb: C.swasta.slice(), alpha: 0.45, label: 'Pudar: kemungkinan tidak aktif, tidak dihitung', count: c.inactive });
    return { rows: rows, note: M.SIZE_LINE + ' Tanpa data siswa: ukuran terkecil.' };
  };

  /* ------------------------------------------------------------ kelas biaya badges (D6, §4.3) */

  var TIER_PX = 18;                // badge sprites at 18 px; drawn at about 12 px, so they only ever scale down
  M.TIER_PX = TIER_PX;
  /** 'tier-3-fill' (from the published fee or the school type) or 'tier-3-line' (perkiraan: outline only). */
  M.tierKey = function (level, basis) {
    var lv = Math.max(0, Math.min(4, Math.round(+level || 0)));
    return lv ? 'tier-' + lv + '-' + (basis === 'perkiraan' ? 'line' : 'fill') : '';
  };
  function tierSprite(level, basis, theme, px) {
    if (!(MCD.map && typeof MCD.map.tierSprite === 'function')) return null;
    try {
      var r = MCD.map.tierSprite({ level: level, basis: basis, theme: themeOf(theme), px: px });
      if (isCanvas(r)) return { id: 'tier|' + themeOf(theme) + '|' + level + '|' + basis + '|' + px, canvas: r, url: null, width: r.width, height: r.height, anchorX: r.width / 2, anchorY: r.height / 2 };
      return r && isCanvas(r.canvas) ? r : null;
    } catch (e) { return null; }
  }
  var TATL = {};
  /** The eight badges in one atlas for a deck IconLayer, keyed by tierKey; null without MCD.map.tierSprite or a canvas. */
  M.tierAtlas = function (theme) {
    theme = themeOf(theme);
    if (Object.prototype.hasOwnProperty.call(TATL, theme)) return TATL[theme];
    var list = [], keys = [];
    [1, 2, 3, 4].forEach(function (lv) {
      ['biaya', 'perkiraan'].forEach(function (b) {
        var r = tierSprite(lv, b, theme, TIER_PX);
        if (r) { list.push(r); keys.push(M.tierKey(lv, b)); }
      });
    });
    if (list.length !== 8) return null;          /* not cached: the map's sprite may come later */
    var mapping = {}, atlasCv = null, src = null;
    if (MCD.map && typeof MCD.map.spriteAtlas === 'function') { try { src = MCD.map.spriteAtlas(list); } catch (e) { src = null; } }
    if (src && src.iconAtlas && src.iconMapping) {
      atlasCv = src.iconAtlas;
      keys.forEach(function (k, n) { var m = src.iconMapping[list[n].id]; if (m) mapping[k] = Object.assign({}, m, { mask: false }); });
    } else {
      var w = 0, h = 0;
      list.forEach(function (r) { w = Math.max(w, r.canvas.width); h += r.canvas.height + 2; });
      atlasCv = canvas(w || 1, h || 1);
      var ctx = atlasCv && atlasCv.getContext('2d'), y = 0;
      if (!ctx) return null;
      list.forEach(function (r, n) {
        ctx.drawImage(r.canvas, 0, y);
        mapping[keys[n]] = { x: 0, y: y, width: r.canvas.width, height: r.canvas.height, anchorX: r.canvas.width / 2, anchorY: r.canvas.height / 2, mask: false };
        y += r.canvas.height + 2;
      });
    }
    if (Object.keys(mapping).length !== 8) return null;
    var url = typeof atlasCv === 'string' ? atlasCv : toUrl(atlasCv);
    if (!url) return null;
    TATL[theme] = { iconAtlas: url, iconMapping: mapping, key: 'tier:' + theme };
    return TATL[theme];
  };
  /** One picture of the four filled badges side by side (Reguler · Menengah · Atas · Premium) for the legend, or null. */
  M.tierStrip = function (theme) {
    var list = [1, 2, 3, 4].map(function (lv) { return tierSprite(lv, 'biaya', theme, TIER_PX); });
    if (list.some(function (r) { return !r; })) return null;
    var w = 0, h = 0, gap = 6;
    list.forEach(function (r) { w += r.canvas.width + gap; h = Math.max(h, r.canvas.height); });
    var cv = canvas(w, h), ctx = cv && cv.getContext('2d'), x = 0;
    if (!ctx) return null;
    list.forEach(function (r) { ctx.drawImage(r.canvas, x, (h - r.canvas.height) / 2); x += r.canvas.width + gap; });
    return toUrl(cv) || null;
  };
})(window.MCD = window.MCD || {});
