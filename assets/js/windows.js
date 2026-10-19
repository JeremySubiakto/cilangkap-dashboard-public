/* ==========================================================================
 * MCD.windows — progressive cards ("Kartu bertahap", COPY_STYLE_EN items 39 and 43, build spec LAYOUT_V5C §3–§8).
 * Classic IIFE on window.MCD, CSP-safe (no innerHTML, no inline handlers, no string timers); tokens only in
 * assets/css/windows.css. Load after google-places.js and before sme.js (INTEGRATION_NOTES §2).
 *
 * What it owns (only while the dashboard is unlocked, on a section with a map):
 *   callout   a small card beside the clicked point or kecamatan: name, ≤ 2 chips, ≤ 3 numbers, one main action,
 *             "Detail ›" and the Google links in words. Smart placement (never on the anchor, a card, the map
 *             controls, the legend or the last stretch of the route), follows the camera, an edge chip when the
 *             anchor leaves the free map.
 *   sheet     the app's detail drawer becomes the active "detail card": docked in a side column (away from the
 *             selection), drag, resize, minimise to the tray, pin (≤ 2, rebuilt live from section.cardFor), close.
 *   workspace in Detail ≥ 1024 px a section that offers workspace() gets the slim summary rail (76 px; the full rail
 *             at ≥ 1441 px, an overlay below) and the bottom drawer "Daftar & grafik" (peek / half / full) with the
 *             tray, "Rapikan" and the legend in its bar.
 *   layout    rects() / padding(): the free map rectangle = stage − rail − docked columns − visible drawer; the shell
 *             merges it into the map padding (MCD.map.setLayout(pad, {still})). keepInView() eases the selection,
 *             the route end and the focused kecamatan clear of every card after any arrangement change.
 *   phones    one sheet system: the app's bottom sheet with a brief and a sticky action row (decorate, phone mode).
 *
 * Storage: localStorage 'mcd.ui.windows.v1' (MCD.config.storageKeys.windows) = {v: 1, s: {'<section>:<view>':
 *   {rail, side, col: {right, left}, drawer: {state, h}, float: {<kind>: {x, y, w, h}}}}, folds: {'<kind>|<block>':
 *   bool}, hints: {<hintId>: 1}}: layout only, never an id, a name, a number or a place.
 *
 * Pure maths (no DOM) are exported as MCD.windows._pure for tests/windows-v5.test.mjs.
 * ========================================================================== */
(function (W, MCD) {
  'use strict';

  var DOC = W.document;
  var KEY = 'mcd.ui.windows.v1';
  var INSET = 16, GAP = 12, RAIL_SLIM = 76, RAIL_FULL = 360, BAR_H = 56, CO_W = 300, CO_MAX_H = 260;
  var MIN_W = 300, MIN_H = 200, CARD_MIN_H = 240, SNAP_PX = 40, MAX_PINS = 2, KEEP_R = 24, CO_OFF = 32, CO_FREE_IN = 10;
  var FREE_MIN = 560, COL_MIN = 300, WIDE = 1441, PIN_MIN = 1280, TABLET_COL = 360, NUDGE_MAX = 160, EDGE_IN = 8;
  var NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ words (COPY_DECK_ID §10.3) */
  var T = {
    detail: 'Detail', allDetail: 'Semua detail', source: 'Sumber', notes: 'Catatan',
    sourceOf: function (n) { return 'Sumber data ' + n; },
    pin: 'Sematkan', unpin: 'Lepas sematan', pinTip: 'Sematkan agar tetap terbuka saat memilih tempat lain',
    pinMax: 'Maksimal 2 kartu disematkan. Tutup salah satu dulu.',
    gone: 'Data ini tidak tersedia lagi.', veiled: 'Kartu yang disematkan ditutup agar nama tetap tersamar.',
    min: 'Kecilkan', minTip: 'Kecilkan ke baki', close: 'Tutup', closeTip: 'Tutup (Esc)',
    reopen: function (n) { return 'Buka lagi kartu ' + n; }, closeCard: function (n) { return 'Tutup kartu ' + n; },
    tidy: 'Rapikan', tidyTip: 'Rapikan kartu dan panel', tidyDone: 'Kartu dan panel dirapikan.',
    tray: 'Kartu yang dikecilkan', trayN: function (n) { return n + ' kartu'; },
    tabsPrev: 'Tab sebelumnya', tabsNext: 'Tab berikutnya',
    grip: function (n) { return 'Pindahkan atau ubah ukuran kartu ' + n; },
    gripHelp: 'Panah: geser. Shift dan panah: geser lebih jauh. Alt dan panah: ubah ukuran. Enter: tempel atau lepas. Home atau End: tempel di kiri atau kanan. Minus: kecilkan. Esc: tutup.',
    pinned: function (n) { return 'Kartu ' + n + ' disematkan.'; },
    minimised: function (n) { return 'Kartu ' + n + ' dikecilkan.'; },
    restored: function (n) { return 'Kartu ' + n + ' dibuka lagi.'; },
    closed: function (n) { return 'Kartu ' + n + ' ditutup.'; },
    size: function (w, h) { return 'Ukuran ' + w + ' × ' + h + ' piksel.'; },
    dockR: 'Ditempel di kanan.', dockL: 'Ditempel di kiri.', undocked: 'Kartu dilepas. Seret judulnya untuk memindahkan.',
    drawerHalf: 'Daftar setengah layar.', drawerPeek: 'Daftar diperkecil.', drawerFull: 'Daftar setinggi layar.',
    railOpen: 'Ringkasan dibuka.', railSlim: 'Ringkasan diperkecil.',
    crumb: function (n) { return 'Kembali ke Kecamatan ' + n; },
    edge: function (n) { return n + ' di luar peta. Klik untuk menampilkan.'; },
    openPanel: 'Buka panel', openPanelOf: function (s) { return 'Buka panel ' + s; }, shrinkPanel: 'Perkecil panel',
    railRegion: function (s) { return 'Panel ringkasan ' + s; },
    drawerTitle: 'Daftar & grafik', drawerGrab: 'Ubah tinggi daftar & grafik', drawerUp: 'Perbesar daftar', drawerDown: 'Perkecil daftar',
    guideFold: 'Panel dilipat agar peta lebih luas.', resetDone: 'Tata letak kartu kembali ke awal.',
    gmaps: 'Buka di Google Maps', route: 'Rute di Google Maps',
    calloutMore: 'Tekan Detail untuk semua angka.', filters: function (n) { return n + ' filter'; },
    sheetAria: 'Detail pilihan', quickDone: '✓ Di tindak lanjut', edit: 'Ubah'
  };

  /* ------------------------------------------------------------------ small helpers */
  function isFn(f) { return typeof f === 'function'; }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function now() { return W.performance && W.performance.now ? W.performance.now() : Date.now(); }
  function mq(q) { try { return !!(W.matchMedia && W.matchMedia(q).matches); } catch (e) { return false; } }
  function reduced() { var M = MCD.motion; try { return M && isFn(M.reduced) ? !!M.reduced() : mq('(prefers-reduced-motion: reduce)'); } catch (e) { return false; } }
  function dur(k) { var M = MCD.motion; return (M && M.dur && M.dur[k]) || ({ fast: 180, base: 300, slow: 500 })[k]; }
  function ease(k) { var M = MCD.motion; return (M && M.ease && M.ease[k]) || (k === 'out' ? 'cubic-bezier(.22,1,.36,1)' : 'cubic-bezier(.65,0,.35,1)'); }
  function raf(fn) { return (W.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(fn); }
  function caf(id) { if (id && W.cancelAnimationFrame) W.cancelAnimationFrame(id); }
  function safe(fn, ctx, args) { try { return fn.apply(ctx || null, args || []); } catch (e) { if (W.console) W.console.error('[MCD.windows]', e); return undefined; } }
  var uidN = 0;
  function uid(p) { uidN += 1; return (p || 'ws') + '-' + uidN; }
  function h(tag, attrs, kids) {
    var el = DOC.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'hidden') el.hidden = !!v;
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    (Array.isArray(kids) ? kids : (kids == null ? [] : [kids])).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? DOC.createTextNode(c) : c);
    });
    return el;
  }
  function icon(name, cls) {
    var s = DOC.createElementNS(NS, 'svg');
    s.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var u = DOC.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }
  function tool(name, label, extra, title) {
    return h('button', { type: 'button', class: 'ws-tool' + (extra ? ' ' + extra : ''), title: title || label, 'aria-label': label }, [icon(name)]);
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }
  function textOf(n) { return n ? String(n.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function kids(el) { return el ? Array.prototype.slice.call(el.children || []) : []; }
  function hasClass(el, c) { return !!(el && el.classList && el.classList.contains(c)); }
  function overlayRoot() { return DOC.getElementById('overlay-root') || DOC.body; }
  function body() { return DOC.body; }
  function toast(msg, kind) { if (MCD.app && isFn(MCD.app.toast)) MCD.app.toast(msg, kind); }
  function st() { try { return MCD.state && isFn(MCD.state.get) ? MCD.state.get() : null; } catch (e) { return null; } }
  function selKey(sel) { return sel && sel.kind != null && sel.id != null ? String(sel.kind) + ':' + String(sel.id) : ''; }
  function booted() { return !!(MCD.app && isFn(MCD.app.isBooted) && MCD.app.isBooted()); }
  function deepView() { var s = st(); return !!(s && s.view === 'deep'); }
  function section() { return (body() && body().getAttribute('data-section')) || ''; }
  function veiled() { var s = st(); return !!(s && s.privacy && s.privacy.veil); }
  function demoOn() { return !!(MCD.demo && isFn(MCD.demo.isOn) && MCD.demo.isOn()); }
  function rectOf(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  /* ======================================================================= PURE MATHS (no DOM; tests) */

  function R(x, y, w, hh) { return { x: x, y: y, w: Math.max(0, w), h: Math.max(0, hh) }; }
  function rr(r) { return r.x + r.w; }
  function rb(r) { return r.y + r.h; }
  /** Do a and b overlap (m: margin px added around b)? */
  function hit(a, b, m) {
    if (!a || !b) return false;
    m = m || 0;
    return a.x < rr(b) + m && rr(a) > b.x - m && a.y < rb(b) + m && rb(a) > b.y - m;
  }
  function insetR(r, d) { return R(r.x + d, r.y + d, r.w - 2 * d, r.h - 2 * d); }
  function inside(p, r, m) { m = m || 0; return p.x >= r.x - m && p.x <= rr(r) + m && p.y >= r.y - m && p.y <= rb(r) + m; }
  function circleHitsRect(c, r, m) {
    var nx = clamp(c.x, r.x, rr(r)), ny = clamp(c.y, r.y, rb(r));
    var dx = c.x - nx, dy = c.y - ny;
    return dx * dx + dy * dy < (c.r + (m || 0)) * (c.r + (m || 0));
  }
  function distToRect(p, r) {
    var dx = Math.max(r.x - p.x, 0, p.x - rr(r)), dy = Math.max(r.y - p.y, 0, p.y - rb(r));
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Default width of a docked column: clamp(320, 26vw, 420). */
  function colDefault(vw) { return clamp(Math.round(vw * 0.26), 320, 420); }

  /**
   * colWidths({vw, adopted, rail, left: bool, right: bool, pref: {left, right}, tablet}) → {left, right} (0 = none).
   * Both columns in use at ≤ 1440 px: 320 each. The free map keeps ≥ 560 px when it can (columns shrink to 300).
   */
  function colWidths(o) {
    var vw = o.vw, pref = o.pref || {};
    if (o.tablet) return { left: 0, right: o.right ? Math.min(TABLET_COL, vw - 2 * INSET) : 0 };
    var maxW = Math.max(COL_MIN, Math.min(560, Math.round(vw * 0.4)));
    var def = colDefault(vw);
    var r = o.right ? clamp(Math.round(pref.right || def), COL_MIN, maxW) : 0;
    var l = o.left ? clamp(Math.round(pref.left || def), COL_MIN, maxW) : 0;
    if (o.left && o.right && vw < WIDE) { l = 320; r = 320; }
    var railR = o.adopted ? INSET + (o.rail === 'full' ? RAIL_FULL : RAIL_SLIM) : INSET - GAP;
    var free = function () { return vw - (railR + GAP) - (l ? l + GAP : 0) - (r ? r + GAP + INSET : INSET); };
    var need = FREE_MIN - free();
    if (need > 0 && r > COL_MIN) { var d1 = Math.min(need, r - COL_MIN); r -= d1; need -= d1; }
    if (need > 0 && l > COL_MIN) { var d2 = Math.min(need, l - COL_MIN); l -= d2; }
    return { left: l, right: r };
  }

  /**
   * geometry({vw, vh, top, base: {left, right, bottom}, adopted, rail: 'slim'|'full'|'overlay', drawer: {state, bar,
   * half} | null, cols: {left, right}}) → {stage, rail, left, right, drawer, pad, free}. All in client px.
   * pad = px from the viewport edges (the shell's padding meaning); free = the rectangle the camera frames.
   * The rail as an overlay does not count; the full drawer counts its half height (it covers the map anyway).
   */
  function geometry(o) {
    var vw = o.vw, vh = o.vh, top = o.top, base = o.base || {};
    var stage = R(INSET, top, vw - 2 * INSET, Math.max(120, vh - INSET - top));
    var cols = o.cols || {};
    var out = { stage: stage, rail: null, left: null, right: null, drawer: null, railEdge: INSET };
    var railEdge = INSET - GAP;     // x of the rail's right edge (no rail: the left column starts at the inset)
    if (o.adopted) {
      var full = o.rail === 'full', w = full ? RAIL_FULL : RAIL_SLIM;
      out.rail = R(INSET, top, o.rail === 'overlay' ? RAIL_FULL : w, stage.h);
      railEdge = INSET + w;
      out.railEdge = railEdge;
    }
    if (cols.left) out.left = R(railEdge + GAP, top, cols.left, stage.h);
    if (cols.right) out.right = R(vw - INSET - cols.right, top, cols.right, stage.h);
    var pad = { top: top };
    if (o.adopted) {
      pad.left = (out.left ? rr(out.left) : railEdge) + GAP;
      pad.right = out.right ? vw - out.right.x + GAP : INSET;
      var d = o.drawer;
      var vis = d ? (d.state === 'peek' ? d.bar : d.half) : 0;
      pad.bottom = d ? vis + GAP + INSET : INSET;
      if (d) {
        var dl = pad.left, dr = out.right ? out.right.x - GAP : vw - INSET;
        var shown = d.state === 'full' ? stage.h : vis;
        out.drawer = R(dl, vh - INSET - shown, dr - dl, shown);
        out.drawerFull = R(dl, vh - INSET - (d.state === 'full' ? stage.h : d.half), dr - dl, d.state === 'full' ? stage.h : d.half);
      }
    } else {
      pad.left = Math.max(base.left || INSET, out.left ? rr(out.left) + GAP : 0);
      pad.right = Math.max(base.right || INSET, out.right ? vw - out.right.x + GAP : 0);
      pad.bottom = Math.max(base.bottom || INSET, INSET);
    }
    out.pad = pad;
    out.free = R(pad.left, top, vw - pad.left - pad.right, vh - pad.bottom - top);
    return out;
  }

  /** Length (px) of the polyline pts [[x, y], …] inside rect r (Liang–Barsky clipping per segment). */
  function routeInside(r, pts) {
    if (!r || !pts || pts.length < 2) return 0;
    var x0 = r.x, x1 = rr(r), y0 = r.y, y1 = rb(r), sum = 0;
    for (var i = 1; i < pts.length; i++) {
      var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
      var dx = bx - ax, dy = by - ay, t0 = 0, t1 = 1, ok = true;
      var P = [-dx, dx, -dy, dy], Q = [ax - x0, x1 - ax, ay - y0, y1 - ay];
      for (var k = 0; k < 4 && ok; k++) {
        if (P[k] === 0) { if (Q[k] < 0) ok = false; }
        else {
          var t = Q[k] / P[k];
          if (P[k] < 0) { if (t > t1) ok = false; else if (t > t0) t0 = t; }
          else { if (t < t0) ok = false; else if (t < t1) t1 = t; }
        }
      }
      if (ok && t1 > t0) sum += (t1 - t0) * Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
  }

  var SIDES_PT = ['right', 'left', 'bottom', 'top', 'bottom-right', 'top-right', 'bottom-left', 'top-left'];
  /** The candidate boxes beside a keep-out box B (point: the circle's box; shape: its bbox or label chip). */
  function candidates(B, w, hh, ay, ax, off) {
    var d = off * 0.7;
    var midY = ay - hh / 2, midX = ax - w / 2;
    return SIDES_PT.map(function (side) {
      var x, y;
      switch (side) {
        case 'right': x = rr(B) + off; y = midY; break;
        case 'left': x = B.x - off - w; y = midY; break;
        case 'bottom': x = midX; y = rb(B) + off; break;
        case 'top': x = midX; y = B.y - off - hh; break;
        case 'bottom-right': x = rr(B) + d; y = rb(B) + d; break;
        case 'top-right': x = rr(B) + d; y = B.y - d - hh; break;
        case 'bottom-left': x = B.x - d - w; y = rb(B) + d; break;
        default: x = B.x - d - w; y = B.y - d - hh;
      }
      return { side: side, x: x, y: y };
    });
  }
  /** Still on its own side of the anchor after clamping (it never slides across the anchor). */
  function sideOk(side, box, B) {
    var ok = true;
    if (side.indexOf('right') >= 0) ok = ok && box.x >= rr(B) - 1;
    if (side.indexOf('left') >= 0) ok = ok && rr(box) <= B.x + 1;
    if (side === 'bottom' || side.indexOf('bottom') === 0) ok = ok && box.y >= rb(B) - 1;
    if (side === 'top' || side.indexOf('top') === 0) ok = ok && rb(box) <= B.y + 1;
    return ok;
  }

  /**
   * placeBox({anchor: {x, y} | {bbox: {x0, y0, x1, y1}, label: {x, y}} | {rect}, size: {w, h}, free: rect (already
   * inset), obstacles: [rect], route: [[x, y]] | null, prev: side | null, labelChip: {w, h}, sides: [side] | null})
   *   → {x, y, side, parked, outside, nudge: {dx, dy} | null, score}
   * §3.2: hard reject a box on the keep-out, on an obstacle (4 px margin) or pushed across the anchor; score = 1000 ×
   * route length inside + 2 × distance + 120 × side change + 40 × candidate index; nothing fits: the smallest pan
   * (≤ 160 px) that frees a candidate, else park in the free corner farthest from the anchor.
   */
  function placeBox(o) {
    var F = o.free, w = o.size.w, hh = o.size.h, O = o.obstacles || [], a = o.anchor || {};
    var K, B, ax, ay;
    if (a.bbox || a.rect) {
      var bx = a.rect ? { x0: a.rect.x, y0: a.rect.y, x1: rr(a.rect), y1: rb(a.rect) } : a.bbox;
      var L = a.label || { x: (bx.x0 + bx.x1) / 2, y: (bx.y0 + bx.y1) / 2 };
      var area = (bx.x1 - bx.x0) * (bx.y1 - bx.y0);
      if (a.rect || area <= 0.6 * F.w * F.h) {
        B = R(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0);
        ax = (bx.x0 + bx.x1) / 2;
        ay = clamp(L.y, bx.y0 + 20, bx.y1 - 20);
      } else {
        var cw = (o.labelChip && o.labelChip.w) || 150, ch = (o.labelChip && o.labelChip.h) || 30;
        B = R(L.x - cw / 2, L.y - ch / 2, cw, ch);
        ax = L.x; ay = L.y;
      }
      K = { rect: B };
    } else {
      ax = a.x; ay = a.y;
      K = { circle: { x: ax, y: ay, r: KEEP_R } };
      B = R(ax - KEEP_R, ay - KEEP_R, 2 * KEEP_R, 2 * KEEP_R);
    }
    var anchorPt = { x: ax, y: ay };
    var out = { x: 0, y: 0, side: null, parked: false, outside: false, nudge: null, score: Infinity };
    /* a shape counts as in view while its label point is (a sliver at the edge gets the edge chip, not a far park) */
    var anchorIn = a.rect ? hit(K.rect, F) : (K.rect ? inside(a.label || anchorPt, F) : inside(anchorPt, F));
    if (!anchorIn) { out.outside = true; return out; }
    var off = K.rect ? 12 : (CO_OFF - KEEP_R);
    if (K.circle) B = R(ax - KEEP_R, ay - KEEP_R, 2 * KEEP_R, 2 * KEEP_R);
    var list = candidates(B, w, hh, ay, ax, off);
    /* place(…, {sides}): only those sides, in that order (final integration; the Ringkasan factor card asks left first) */
    if (o.sides && o.sides.length) {
      var bySide = {};
      list.forEach(function (c) { bySide[c.side] = c; });
      var chosen = o.sides.map(function (s) { return bySide[s]; }).filter(Boolean);
      if (chosen.length) list = chosen;
    }
    function blocked(box) {
      if (K.circle ? circleHitsRect(K.circle, box, 4) : hit(box, K.rect, 4)) return true;
      for (var i = 0; i < O.length; i++) if (O[i] && hit(box, O[i], 4)) return true;
      return false;
    }
    var best = null;
    var fits = w <= F.w && hh <= F.h;
    function consider(c, i, box) {
      if (!sideOk(c.side, box, B) || blocked(box)) return;
      /* with {sides} the order is a strict preference: the first side that fits wins */
      var score = 1000 * routeInside(box, o.route) + 2 * distToRect(anchorPt, box) + (o.prev && o.prev !== c.side ? 120 : 0) + (o.sides ? 1e5 : 40) * i;
      if (!best || score < best.score) best = { x: box.x, y: box.y, side: c.side, score: score };
    }
    list.forEach(function (c, i) {
      if (!fits) return;
      consider(c, i, R(clamp(c.x, F.x, rr(F) - w), clamp(c.y, F.y, rb(F) - hh), w, hh));
    });
    /* no side fits as it is: slide each side along the anchor's edge (24 px steps) before any pan or park. A box
       beside a point or a shape stays beside it while it slides (right / left vertically, top / bottom sideways). */
    if (!best && fits) {
      list.slice(0, 4).forEach(function (c, i) {
        var vert = c.side === 'right' || c.side === 'left';
        var x0 = clamp(c.x, F.x, rr(F) - w), y0 = clamp(c.y, F.y, rb(F) - hh);
        var lo = vert ? F.y : F.x, hi = vert ? rb(F) - hh : rr(F) - w, base = vert ? y0 : x0;
        for (var s = 24; s <= Math.max(base - lo, hi - base) + 24; s += 24) {
          [base - s, base + s].forEach(function (v) {
            var vv = clamp(v, lo, hi);
            if (Math.abs(vv - base) < 1) return;
            consider(c, i + 8 + s / 24, vert ? R(x0, vv, w, hh) : R(vv, y0, w, hh));
          });
        }
      });
    }
    if (best) { out.x = best.x; out.y = best.y; out.side = best.side; out.score = best.score; return out; }
    /* nothing fits: the smallest pan (≤ 160 px) that frees a candidate (the box moves with the map, the panels do not) */
    var pan = null;
    list.forEach(function (c) {
      if (!fits || o.noNudge) return;
      var box = R(c.x, c.y, w, hh);
      var dx = box.x < F.x ? F.x - box.x : (rr(box) > rr(F) ? rr(F) - rr(box) : 0);
      var dy = box.y < F.y ? F.y - box.y : (rb(box) > rb(F) ? rb(F) - rb(box) : 0);
      var m = Math.sqrt(dx * dx + dy * dy);
      if (m > NUDGE_MAX || m < 0.5) return;
      var moved = R(box.x + dx, box.y + dy, w, hh);
      for (var i = 0; i < O.length; i++) if (O[i] && hit(moved, O[i], 4)) return;
      if (!inside({ x: ax + dx, y: ay + dy }, F)) return;
      if (!pan || m < pan.m) pan = { m: m, dx: dx, dy: dy, x: moved.x, y: moved.y, side: c.side };
    });
    if (pan) { out.nudge = { dx: pan.dx, dy: pan.dy }; out.x = pan.x; out.y = pan.y; out.side = pan.side; return out; }
    /* park: the free corner (off the anchor and every obstacle) nearest the anchor; when every corner is taken, the one
       farthest from the anchor. Close to the anchor the tail still points at it. */
    var corners = [[F.x, F.y], [rr(F) - w, F.y], [F.x, rb(F) - hh], [rr(F) - w, rb(F) - hh]].map(function (c) {
      var box = R(c[0], c[1], w, hh);
      return { box: box, d: distToRect(anchorPt, box), free: !blocked(box) };
    });
    var open = corners.filter(function (c) { return c.free; });
    var pick = open.length ? open.reduce(function (a, b) { return b.d < a.d ? b : a; })
      : corners.reduce(function (a, b) { return b.d > a.d ? b : a; });
    out.x = pick.box.x; out.y = pick.box.y; out.parked = true; out.side = 'parked';
    out.parkFree = !!open.length;
    /* the side the parked box sits on, for its tail (only when it is near: ≤ 80 px from the anchor) */
    var pb = pick.box;
    out.parkSide = pb.x >= ax ? 'right' : (rr(pb) <= ax ? 'left' : (pb.y >= ay ? 'bottom' : 'top'));
    out.parkNear = pick.d <= 80;
    return out;
  }

  /** The edge chip for an anchor outside F: {x, y, edge} on the nearest edge of F, chip size {w, h}. */
  function edgeChip(p, F, size) {
    var w = size.w, hh = size.h;
    var x = clamp(p.x - w / 2, F.x + EDGE_IN, rr(F) - w - EDGE_IN), y = clamp(p.y - hh / 2, F.y + EDGE_IN, rb(F) - hh - EDGE_IN);
    var edge = p.x < F.x ? 'left' : (p.x > rr(F) ? 'right' : (p.y < F.y ? 'top' : 'bottom'));
    if (edge === 'left') x = F.x + EDGE_IN;
    else if (edge === 'right') x = rr(F) - w - EDGE_IN;
    else if (edge === 'top') y = F.y + EDGE_IN;
    else y = rb(F) - hh - EDGE_IN;
    return { x: x, y: y, edge: edge };
  }

  /**
   * awaySide({anchor: {x, y} | null, preferred, colRect: {left, right}, freeWidthIfOther, allowLeft}) → 'left' | 'right'.
   * §3.3.2: a sheet opened for a map pick docks away from the selection when the point lies in the preferred
   * column (+ 24 px) and the free map stays ≥ 560 px wide; otherwise the preferred side.
   */
  function awaySide(o) {
    var pref = o.preferred === 'left' && o.allowLeft ? 'left' : 'right';
    if (!o.anchor || !o.allowLeft) return pref;
    var c = o.colRect && o.colRect[pref];
    if (!c || !inside(o.anchor, c, 24)) return pref;
    if (isNum(o.freeWidthIfOther) && o.freeWidthIfOther < FREE_MIN) return pref;
    return pref === 'right' ? 'left' : 'right';
  }

  /**
   * keepOffset({targets: [rect], blockers: [rect], free: rect, maxFrac}) → {dx, dy} | null.
   * The smallest camera offset (px the content moves on screen) that brings every target inside the free rectangle
   * and off every blocker; null when nothing has to move or no pan up to maxFrac (0.5) of the free area clears them.
   */
  function keepOffset(o) {
    var F = o.free, T0 = (o.targets || []).filter(Boolean), Bk = (o.blockers || []).filter(Boolean);
    if (!F || !T0.length) return null;
    var maxDx = F.w * (o.maxFrac || 0.5), maxDy = F.h * (o.maxFrac || 0.5);
    function ok(dx, dy) {
      for (var i = 0; i < T0.length; i++) {
        var t = R(T0[i].x + dx, T0[i].y + dy, T0[i].w, T0[i].h);
        if (t.x < F.x || t.y < F.y || rr(t) > rr(F) || rb(t) > rb(F)) return false;
        for (var j = 0; j < Bk.length; j++) if (hit(t, Bk[j], 2)) return false;
      }
      return true;
    }
    if (ok(0, 0)) return null;
    var xs = [0], ys = [0];
    T0.forEach(function (t) {
      xs.push(F.x - t.x, rr(F) - rr(t));
      ys.push(F.y - t.y, rb(F) - rb(t));
      Bk.forEach(function (b) { xs.push(b.x - rr(t) - 8, rr(b) - t.x + 8); ys.push(b.y - rb(t) - 8, rb(b) - t.y + 8); });
    });
    var best = null;
    xs.forEach(function (dx) {
      if (Math.abs(dx) > maxDx) return;
      ys.forEach(function (dy) {
        if (Math.abs(dy) > maxDy) return;
        var m = Math.sqrt(dx * dx + dy * dy);
        if (best && m >= best.m) return;
        if (ok(dx, dy)) best = { m: m, dx: Math.round(dx), dy: Math.round(dy) };
      });
    });
    return best ? { dx: best.dx, dy: best.dy } : null;
  }

  /**
   * keepPlan({targets: [{id, rect}], blockers, free, maxFrac}) → {dx, dy, ids} | null. keepOffset over every target;
   * when no pan clears them all (a large focused kecamatan), the selection and the route end alone (sel, route-end,
   * route-tail), then the selection alone. null when nothing must move or nothing helps.
   */
  var KEEP_TIERS = [null, ['sel', 'route-end', 'route-tail'], ['sel']];
  function keepPlan(o) {
    var all = (o.targets || []).filter(function (t) { return t && (t.rect || isNum(t.x)); });
    for (var i = 0; i < KEEP_TIERS.length; i++) {
      var tier = KEEP_TIERS[i];
      var list = tier ? all.filter(function (t) { return tier.indexOf(t.id) >= 0; }) : all;
      if (!list.length) continue;
      var rects = list.map(function (t) { return t.rect || t; });
      if (keepClear(rects, o.blockers, o.free)) return null;          /* this tier is already clear: nothing to move */
      var off = keepOffset({ targets: rects, blockers: o.blockers, free: o.free, maxFrac: o.maxFrac });
      if (off) return { dx: off.dx, dy: off.dy, ids: list.map(function (t) { return t.id || ''; }) };
    }
    return null;
  }
  function keepClear(rects, blockers, F) {
    return rects.every(function (t) {
      if (t.x < F.x || t.y < F.y || rr(t) > rr(F) || rb(t) > rb(F)) return false;
      return !(blockers || []).some(function (b) { return b && hit(t, b, 2); });
    });
  }

  /** Largest axis-aligned rectangle of F not covered by any obstacle, on a `step` px grid (histogram method). */
  function largestRect(F, obstacles, step) {
    step = step || 8;
    var cols = Math.max(0, Math.floor(F.w / step)), rows = Math.max(0, Math.floor(F.h / step));
    var hh = new Array(cols).fill(0), best = { a: 0, x: F.x, y: F.y, w: 0, h: 0 };
    var O = (obstacles || []).filter(Boolean);
    for (var r = 0; r < rows; r++) {
      var cy = F.y + r * step + step / 2;
      for (var c = 0; c < cols; c++) {
        var cx = F.x + c * step + step / 2, free = true;
        for (var k = 0; k < O.length && free; k++) if (cx >= O[k].x && cx <= rr(O[k]) && cy >= O[k].y && cy <= rb(O[k])) free = false;
        hh[c] = free ? hh[c] + 1 : 0;
      }
      var stack = [];
      for (c = 0; c <= cols; c++) {
        var cur = c < cols ? hh[c] : 0;
        while (stack.length && hh[stack[stack.length - 1]] >= cur) {
          var hi = hh[stack.pop()], l = stack.length ? stack[stack.length - 1] + 1 : 0, wd = c - l;
          if (hi * wd > best.a) best = { a: hi * wd, x: F.x + l * step, y: F.y + (r - hi + 1) * step, w: wd * step, h: hi * step };
        }
        stack.push(c);
      }
    }
    return R(best.x, best.y, best.w, best.h);
  }

  /** Drawer heights for a stage height: peek = its bar, half = 46 % (or the dragged height), full = the stage. */
  function drawerHeights(stageH, bar, savedH) {
    var full = stageH;
    var half = savedH > 0 ? savedH : Math.round(stageH * 0.46);
    half = clamp(half, Math.min(full, bar + 160), Math.max(bar + 160, full - 40));
    return { peek: bar, half: half, full: full };
  }

  /* ======================================================================= STORAGE */

  function fresh() { return { v: 1, s: {}, folds: {}, hints: {} }; }
  var PREF = null;
  function storageKey() { var c = MCD.config; return (c && c.storageKeys && c.storageKeys.windows) || KEY; }
  function pref() {
    if (PREF) return PREF;
    PREF = fresh();
    try {
      var v = JSON.parse(W.localStorage.getItem(storageKey()) || 'null');
      if (v && v.v === 1 && typeof v === 'object') {
        if (v.s && typeof v.s === 'object') PREF.s = v.s;
        if (v.folds && typeof v.folds === 'object') PREF.folds = v.folds;
        if (v.hints && typeof v.hints === 'object') PREF.hints = v.hints;
      }
    } catch (e) { /* private window or blocked storage: memory only */ }
    return PREF;
  }
  var saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { W.localStorage.setItem(storageKey(), JSON.stringify(pref())); } catch (e) { /* kept in memory only */ }
    }, 120);
  }
  function saveNow() { clearTimeout(saveT); try { W.localStorage.setItem(storageKey(), JSON.stringify(pref())); } catch (e) { /* memory */ } }
  /** The layout record of this section and view ('schools:deep'). */
  function secPref() {
    var P = pref(), k = (section() || 'x') + ':' + (deepView() ? 'deep' : 'overview');
    var s = P.s[k];
    if (!s || typeof s !== 'object') s = P.s[k] = {};
    return s;
  }
  function num(v) { return isNum(v) ? Math.round(v) : undefined; }

  /* ======================================================================= LIVE REGION */

  var LIVE = null, liveT = 0;
  function say(msg) {
    if (!DOC || !DOC.body || !msg) return;
    if (!LIVE || !LIVE.isConnected) { LIVE = h('div', { class: 'sr-only ws-live', 'aria-live': 'polite', role: 'status' }); DOC.body.appendChild(LIVE); }
    LIVE.textContent = '';
    clearTimeout(liveT);
    liveT = setTimeout(function () { LIVE.textContent = msg; }, 40);
  }

  /* ======================================================================= MODE */

  var SUSPENDED = false;
  /** 'desk' ≥ 1024 · 'tablet' 768–1023 · 'phone' < 768 · 'off' on pages without a map and before the sign-in. */
  function mode() {
    if (!DOC || !DOC.body || !booted()) return 'off';
    if (body().getAttribute('data-layout') === 'page') return 'off';
    var vw = W.innerWidth || 0;
    return vw >= 1024 ? 'desk' : (vw >= 768 ? 'tablet' : 'phone');
  }
  function active() { var m = mode(); return m === 'desk' || m === 'tablet'; }
  /** What the arrangement allows at this width and view (build spec §2). */
  function caps() {
    var m = mode(), vw = W.innerWidth || 0, deep = deepView();
    var desk = m === 'desk';
    return {
      desk: desk, tablet: m === 'tablet', deep: deep,
      adopt: desk && deep,
      pins: desk && deep && vw >= PIN_MIN,
      float: desk && deep && vw >= PIN_MIN,
      leftCol: desk && deep && vw >= PIN_MIN && !!AD,
      minimise: desk,
      resizeCol: desk,
      wide: vw >= WIDE
    };
  }

  /* ======================================================================= STATE OF THE ARRANGEMENT */

  var AD = null;          // the adopted workspace: {cur, id, spec, railEl, drawerEl, slim, bar, rail, drawer, …}
  var CARDS = [];         // cards: the active sheet (the app drawer, id 'detail') and pins ('pin-1', 'pin-2')
  var CO = null;          // the callout on screen
  var EDGE = null;        // the edge chip
  var BASE = null;        // the shell's own padding before the cards (px from the viewport edges)
  var ORDER = 0, ZTOP = 0;
  var DRAG = null;        // a drag or resize in progress
  var STILL_NEXT = false; // the next padding the shell sends is arrangement-driven (map: still)
  var LAYOUT_FNS = [];
  var DCARD = null;       // the record of the app drawer (the active sheet)
  var APPD = null;        // the app drawer refs {el, grab, head, title, body, foot, close}

  function visibleCards() { return CARDS.filter(function (c) { return c.open && !c.min; }); }
  function pinCount() { return CARDS.filter(function (c) { return c.open && c.pinned; }).length; }
  function cardState(c) { return c.min ? 'min' : (c.side ? 'docked-' + c.side : 'float'); }
  function cardById(id) { for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i]; return null; }
  function stageTop() { var a = MCD.app; var t = a && isFn(a.stageTop) ? a.stageTop() : 152; return isNum(t) ? t : 152; }

  /** The arrangement model now: {geometry, cols, H (drawer heights)}. Never measured from the DOM mid-animation. */
  function model() {
    var vw = W.innerWidth || 1280, vh = W.innerHeight || 800, top = stageTop();
    var vis = visibleCards();
    var hasL = vis.some(function (c) { return c.side === 'left'; }), hasR = vis.some(function (c) { return c.side === 'right'; });
    var sp = secPref();
    var cw = colWidths({ vw: vw, adopted: !!AD, rail: AD ? AD.rail : null, left: hasL, right: hasR, pref: sp.col || {}, tablet: mode() === 'tablet' });
    var stageH = Math.max(120, vh - INSET - top);
    var H = AD ? drawerHeights(stageH, AD.barH || BAR_H, (sp.drawer && sp.drawer.h) || 0) : null;
    var g = geometry({ vw: vw, vh: vh, top: top, base: BASE, adopted: !!AD, rail: AD ? AD.rail : null,
      drawer: AD ? { state: AD.drawer, bar: H.peek, half: H.half } : null, cols: { left: cw.left, right: cw.right } });
    g.cols = cw; g.H = H; g.vw = vw; g.vh = vh;
    return g;
  }

  /** padding(pad) → pad: the shell's measured padding merged with the rail, the docked columns and the drawer. */
  function padding(pad) {
    pad = Object.assign({}, pad || {});
    BASE = Object.assign({}, pad);
    if (!active() || SUSPENDED) return pad;
    var g = model();
    var p = g.pad;
    var gk = [g.vw, g.vh, g.stage.y].join(',');
    if (gk !== LAST_GEO && !relayoutBusy) { LAST_GEO = gk; raf(function () { if (!relayoutBusy) { placeAll(model()); if (CO) placeCallout(true); } }); }
    if (AD) return { top: Math.max(pad.top || 0, p.top), left: p.left, right: p.right, bottom: p.bottom };
    pad.left = Math.max(pad.left || 0, p.left);
    pad.right = Math.max(pad.right || 0, p.right);
    if (GUIDE_FOLD) pad.left = INSET + RAIL_SLIM + GAP;
    return pad;
  }
  var LAST_GEO = '';
  function still() { return !!(DRAG || STILL_NEXT); }

  /* ======================================================================= PLACEMENT OF EVERYTHING */

  function setBox(el, r, important) {
    if (!el || !r) return;
    var s = el.style, p = important ? 'important' : '';
    if (isFn(s.setProperty)) {
      s.setProperty('left', Math.round(r.x) + 'px', p); s.setProperty('top', Math.round(r.y) + 'px', p);
      s.setProperty('width', Math.round(r.w) + 'px', p); s.setProperty('height', Math.round(r.h) + 'px', p);
      s.setProperty('right', 'auto', p); s.setProperty('bottom', 'auto', p);
    }
  }
  function unBox(el) {
    if (!el) return;
    ['left', 'top', 'width', 'height', 'right', 'bottom', 'transform', 'clip-path', 'z-index', 'max-width'].forEach(function (k) { if (isFn(el.style.removeProperty)) el.style.removeProperty(k); });
  }
  /** The natural height of a card's content: bar + head + body content + foot (measured once per content change). */
  function natural(c) {
    if (c.natH && !c.dirty) return c.natH;
    var el = c.el, n = 0;
    kids(el).forEach(function (ch) {
      if (ch.hidden || hasClass(ch, 'ws-rz') || hasClass(ch, 'drawer__grab')) return;
      if (hasClass(ch, 'drawer__body')) {
        var f0 = ch.style.flex, h0 = ch.style.height;
        ch.style.flex = '0 0 auto'; ch.style.height = 'auto';
        n += ch.scrollHeight || ch.offsetHeight || 0;
        ch.style.flex = f0; ch.style.height = h0;
      } else n += ch.offsetHeight || 0;
    });
    c.natH = n + 2;
    /* measured while hidden (display: none, a closed drawer): do not keep it, measure again next time (final integration) */
    c.dirty = !el.offsetHeight || n < 8;
    return c.natH;
  }
  /** A float let go settles fully on screen and, when it fits, above the drawer bar (it never hides Rapikan or Sumber). */
  function settle(r, g) {
    var S0 = g.stage, x = clamp(r.x, INSET, g.vw - INSET - r.w), y = clamp(r.y, S0.y, rb(S0) - r.h);
    if (g.drawer && r.h <= g.drawer.y - GAP - S0.y && hit(R(x, y, r.w, r.h), g.drawer, GAP)) y = Math.min(y, g.drawer.y - GAP - r.h);
    return R(x, y, r.w, r.h);
  }
  /** While a card is dragged, a transparent sheet over everything carries the cursor (no style recalc of the page). */
  var SHIELD = null;
  function dragShield(on, cursor) {
    if (on) {
      if (!SHIELD || !SHIELD.isConnected) { SHIELD = h('div', { class: 'ws-shield', 'aria-hidden': 'true' }); overlayRoot().appendChild(SHIELD); }
      SHIELD.style.cursor = cursor || '';
      SHIELD.hidden = false;
    } else if (SHIELD) SHIELD.hidden = true;
  }
  var RZ_CURSOR = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
  function floatClamp(r, g) {
    var S0 = g.stage, w = clamp(Math.round(r.w), MIN_W, S0.w), hh = clamp(Math.round(r.h), MIN_H, S0.h);
    /* at least 48 px of the bar stays on screen */
    return R(clamp(Math.round(r.x), INSET - w + 48, g.vw - INSET - 48), clamp(Math.round(r.y), S0.y, rb(S0) - 48), w, hh);
  }

  /** Place the cards, the adopted rail and drawer and the tray from the model (no measuring of positions). */
  function placeAll(g) {
    var desk = active();
    ['left', 'right'].forEach(function (side) {
      var col = g[side];
      var list = visibleCards().filter(function (c) { return c.side === side && c !== (DRAG && DRAG.card); })
        .sort(function (a, b) { return a.order - b.order; });
      if (!col || !list.length) return;
      if (list.length > 2) {
        /* a column holds two cards: the oldest unpinned one moves to the tray (nothing closes) */
        list.slice(0, list.length - 2).forEach(function (c) { if (!c.pinned) setMin(c, true, { quiet: true }); else { c.side = null; c.float = defaultFloat(c, g); } });
        list = list.slice(-2);
      }
      if (list.length === 1) { list[0].geo = R(col.x, col.y, col.w, clamp(natural(list[0]), CARD_MIN_H, col.h)); return; }
      var h1 = clamp(natural(list[0]), CARD_MIN_H, Math.round((col.h - GAP) * 0.5));
      list[0].geo = R(col.x, col.y, col.w, h1);
      list[1].geo = R(col.x, col.y + h1 + GAP, col.w, clamp(natural(list[1]), CARD_MIN_H, col.h - h1 - GAP));
    });
    visibleCards().forEach(function (c) {
      if (c.side || (DRAG && DRAG.card === c)) return;
      if (!c.float) c.float = defaultFloat(c, g);
      c.float = floatClamp(c.float, g);
      c.geo = c.float;
    });
    CARDS.forEach(function (c) {
      var el = c.el;
      if (!desk) { if (c.geo && c.isDrawer) { unBox(el); c.geo = null; } return; }
      if (DRAG && DRAG.card === c) return;              /* under the pointer: its place is decided on the drop */
      if (c.open && !c.min && c.geo) setBox(el, c.geo);
      el.setAttribute('data-dock', c.side || 'float');
      el.classList.toggle('is-docked', !!c.side);
      el.classList.toggle('is-float', !c.side);
    });
    zOrder();
    if (AD) placeAdopted(g);
    var b = body();
    if (b && b.style && isFn(b.style.setProperty)) b.style.setProperty('--drawer-w', (g.right ? Math.round(g.right.w) : 400) + 'px');
    placeTray(g);
  }
  function zOrder() {
    var ranked = CARDS.slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); });
    var zf = 31;
    ranked.forEach(function (c) {
      if (!c.el || !c.el.style || !isFn(c.el.style.setProperty)) return;
      if (!active()) { if (c.isDrawer) c.el.style.removeProperty('z-index'); return; }
      c.el.style.setProperty('z-index', String(c.side && !(DRAG && DRAG.card === c) ? 30 : Math.min(37, zf++)));
    });
  }

  var relayoutBusy = false, SPLIT = { raf: 0 };
  /**
   * relayout(reason, {still, keep, instant}): place everything, then tell the shell (map padding; arrangement-driven
   * changes keep the map still), the callout and the onLayoutChange listeners. The map controls glide (FLIP).
   */
  function relayout(reason, o) {
    o = o || {};
    if (relayoutBusy || !DOC || !DOC.body) return;
    if (o.split) {
      /* a drop: the cards take their places in this frame (they glide), the map padding, the furniture and the
         listeners follow in the next one, so no single frame carries both */
      placeAll(model());
      var o2 = Object.assign({}, o, { split: false });
      caf(SPLIT.raf);
      /* two frames: an animation frame asked for inside an input handler runs in that same frame */
      SPLIT.raf = raf(function () { SPLIT.raf = raf(function () { SPLIT.raf = 0; relayout(reason, o2); }); });
      return;
    }
    relayoutBusy = true;
    try {
      var g = model();
      /* read where the furniture is before anything moves (the legend follows --ws-drawer-vis, written by placeAll) */
      var furn = o.instant ? null : furnitureBefore(reason);
      placeAll(g);
      STILL_NEXT = o.still !== false && reason !== 'open-list';
      if (MCD.app && isFn(MCD.app.relayout)) safe(MCD.app.relayout, MCD.app);
      STILL_NEXT = false;
      furnitureAfter(furn);
      if (CO) placeCallout(true);
      emitLayout(reason || 'move');
      if (o.keep) keepInViewSoon();
      checkHintsSoon();
    } finally { relayoutBusy = false; }
  }
  /** The map furniture that glides with an arrangement change (FLIP, 300 ms): the map controls, the attribution, the
      legend pill in the drawer bar, "Warna asli"; on a rail change (≥ 1441 px) the drawer's left edge too. */
  function furnitureBefore(reason) {
    if (reduced() || !DOC.querySelector) return null;
    var els = [DOC.querySelector('.mapctl'), DOC.querySelector('#map .maplibregl-ctrl-bottom-right'), DOC.querySelector('.map-colour'),
      AD ? DOC.querySelector('.section-host--furniture .legend') : null, reason === 'rail' && AD ? AD.drawerEl : null].filter(function (el) {
      return el && !el.hidden && el.offsetWidth > 0 && isFn(el.animate);
    });
    return els.map(function (el) { var r = el.getBoundingClientRect(); return { el: el, x: r.left, y: r.top }; });
  }
  function furnitureAfter(list) {
    if (!list) return;
    var n = 0;
    list.forEach(function (it) {
      var r = it.el.getBoundingClientRect(), dx = it.x - r.left, dy = it.y - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      n++;
      try {
        var a = it.el.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }], { duration: dur('base'), easing: ease('out'), composite: 'add' });
        /* the callout measured the furniture mid-glide: measure again once it has landed */
        if (a && a.finished && isFn(a.finished.then)) a.finished.then(function () { OBST.key = ''; if (CO && !CO.held) placeCallout(false); }, function () {});
      } catch (e) { /* in place */ }
    });
    return n;
  }
  var layoutQ = { raf: 0, reasons: [] };
  function emitLayout(reason) {
    if (!LAYOUT_FNS.length) return;
    layoutQ.reasons.push(reason);
    if (layoutQ.raf) return;
    layoutQ.raf = raf(function () {
      layoutQ.raf = 0;
      var rs = layoutQ.reasons.splice(0), r = rects();
      LAYOUT_FNS.slice().forEach(function (fn) { safe(fn, null, [r, rs[rs.length - 1]]); });
    });
  }

  /** rects(): the target geometry (§7.2.5), in client px. */
  function rects() {
    var g = model();
    var floats = visibleCards().filter(function (c) { return !c.side && c.geo; }).map(function (c) {
      return { id: c.id, kind: c.kind, x: c.geo.x, y: c.geo.y, w: c.geo.w, h: c.geo.h };
    });
    var co = CO && CO.box ? R(CO.box.x, CO.box.y, CO.box.w, CO.box.h) : null;
    var tray = TRAY && !TRAY.hidden ? rectOf(TRAY) : null;
    var out = {
      stage: g.stage, rail: g.rail, left: g.left, right: g.right, drawer: g.drawer,
      floats: floats, callout: co, tray: tray, free: g.free, still: still()
    };
    /* the largest empty rectangle is computed only when read (the map asks for rects() often) */
    var big = null;
    Object.defineProperty(out, 'largest', { enumerable: true, get: function () {
      if (!big) big = largestRect(g.free, floats.map(function (f) { return R(f.x, f.y, f.w, f.h); }).concat([co, tray]).concat(furnitureRects()), 8);
      return big;
    } });
    return out;
  }
  /** Map furniture inside the free area (map controls, legend pill, "Warna asli", route chip, edge chip). */
  var FURN_FIXED = ['.mapctl', '.map-colour', '.ws-tray--float'];
  var FURN_MOVING = ['.legend', '.map-route__chip', '.ws-edge'];   /* follow the map or open upward: measured every placement */
  function furnitureRects(which) {
    if (!DOC.querySelectorAll) return [];
    var out = [];
    var list = which === 'fixed' ? FURN_FIXED : (which === 'moving' ? FURN_MOVING : FURN_FIXED.concat(FURN_MOVING));
    list.forEach(function (s) {
      var el = DOC.querySelector(s);
      if (!el || el.hidden) return;
      if (AD && s === '.legend') return;          /* the legend sits in the drawer bar */
      /* the route chip waits (transparent) while the callout of its point is open: no obstacle then */
      if (s === '.map-route__chip' && el.closest && el.closest('.map-route.is-hushed, .map-route:not(.is-in)')) return;
      if (s === '.ws-edge' && CO && !CO.el.classList.contains('is-out')) return;
      var r = rectOf(el);
      if (r && r.w > 0 && r.h > 0) out.push(r);
    });
    return out;
  }

  /* ======================================================================= ADOPTED WORKSPACE (rail + drawer) */

  function railDefault() {
    var vw = W.innerWidth || 0;
    if (vw < WIDE) return 'slim';
    var s = secPref().rail;
    return s === 'slim' ? 'slim' : 'full';
  }
  function slimFmt(v) {
    if (typeof v === 'string') return v;
    if (!isNum(v)) return '—';
    var F = MCD.util && MCD.util.fmt;
    if (Math.abs(v) >= 100000) return (F && F.int ? F.int(Math.round(v / 1000)) : String(Math.round(v / 1000))) + ' rb';
    if (Math.abs(v) >= 10000) return String((v / 1000).toFixed(1)).replace('.', ',').replace(/,0$/, '') + ' rb';
    return F && F.int ? F.int(v) : String(Math.round(v));
  }
  function summaryOf(modIn) {
    var mod = modIn || (AD && AD.cur && AD.cur.mod);
    var s = null;
    try { if (mod && isFn(mod.summary)) s = mod.summary(); } catch (e) { s = null; }
    if (Array.isArray(s)) s = { items: s };
    s = s || {};
    return { items: (s.items || []).slice(0, 3), filters: isNum(s.filters) ? s.filters : 0 };
  }
  function buildSlim(cfg, onOpen) {
    onOpen = onOpen || toggleRail;
    var open = h('button', { type: 'button', class: 'ws-slim__open', title: T.openPanelOf(cfg.label) + ' ( [ )', 'aria-label': T.openPanelOf(cfg.label), 'aria-keyshortcuts': '[' }, [icon('chev-r'), h('span', { class: 'ws-slim__open-t', text: T.openPanel })]);
    var kpis = h('div', { class: 'ws-slim__kpis', role: 'list' });
    var badge = h('span', { class: 'ws-slim__badge', hidden: true });
    var el = h('aside', { class: 'ws-slim panel', role: 'region', 'aria-label': T.railRegion(cfg.label), 'data-map-occluder': '' }, [
      open,
      h('span', { class: 'ws-slim__sec', 'aria-hidden': 'true' }, [icon(cfg.icon || 'layers')]),
      h('span', { class: 'ws-slim__lbl', text: cfg.short || cfg.label }),
      badge, kpis
    ]);
    open.addEventListener('click', function (e) { e.stopPropagation(); onOpen(); });
    el.addEventListener('click', function (e) { if (e.target === el || (e.target.closest && e.target.closest('.ws-slim__kpi, .ws-slim__sec, .ws-slim__lbl'))) onOpen(); });
    return { el: el, kpis: kpis, open: open, badge: badge };
  }
  function paintSlim() {
    if (AD && AD.slim) paintSlimEl(AD.slim, summaryOf());
    if (GUIDE_SLIM) paintSlimEl(GUIDE_SLIM, summaryOf(curMod()));
  }
  function paintSlimEl(slim, s) {
    var sig = JSON.stringify([s.filters].concat(s.items.map(function (x) { return [x.value, x.label, x.tone, x.title]; })));
    if (sig === slim.sig) return;
    slim.sig = sig;
    clear(slim.kpis);
    s.items.forEach(function (it) {
      var v = slimFmt(it.value);
      slim.kpis.appendChild(h('div', { class: 'ws-slim__kpi' + (it.tone ? ' is-' + it.tone : ''), role: 'listitem', title: it.title || (v + ' ' + (it.label || '')) }, [
        h('span', { class: 'ws-slim__v', text: v }), h('span', { class: 'ws-slim__k', text: it.label || '' })
      ]));
    });
    slim.badge.hidden = !(s.filters > 0);
    slim.badge.textContent = s.filters > 0 ? T.filters(s.filters) : '';
  }
  function buildBar(cfg) {
    var grab = h('button', { type: 'button', class: 'ws-drawer__grab', 'aria-label': T.drawerGrab, title: T.drawerGrab + ' ( ] )', 'aria-keyshortcuts': ']', 'aria-expanded': 'false' }, [h('span', { class: 'ws-drawer__grip', 'aria-hidden': 'true' })]);
    var title = h('span', { class: 'ws-drawer__title', text: cfg.title || T.drawerTitle });
    var legendSlot = h('span', { class: 'ws-drawer__legend', 'aria-hidden': 'true' });
    var tabsSlot = h('div', { class: 'ws-drawer__tabs' });
    /* ‹ › for a mouse without sideways scrolling (the keyboard moves along the tabs with the arrows) */
    var tabPrev = h('button', { type: 'button', class: 'ws-tabscroll ws-tabscroll--prev', tabindex: '-1', 'aria-hidden': 'true', title: T.tabsPrev, hidden: true }, [icon('chev-l')]);
    var tabNext = h('button', { type: 'button', class: 'ws-tabscroll ws-tabscroll--next', tabindex: '-1', 'aria-hidden': 'true', title: T.tabsNext, hidden: true }, [icon('chev-r')]);
    tabPrev.addEventListener('click', function () { scrollTabs(AD, -1); });
    tabNext.addEventListener('click', function () { scrollTabs(AD, 1); });
    var traySlot = h('div', { class: 'ws-drawer__tray ws-tray', role: 'toolbar', 'aria-label': T.tray });
    traySlot.addEventListener('keydown', trayKeys);
    var tidyB = h('button', { type: 'button', class: 'ws-tool ws-tool--text ws-tidy', title: T.tidyTip + ' (T)', 'aria-keyshortcuts': 'T' }, [icon('layers'), h('span', { text: T.tidy })]);
    tidyB.addEventListener('click', function () { tidy(); });
    var srcB = h('button', { type: 'button', class: 'ws-tool ws-tool--text ws-drawer__src', title: T.source, 'aria-expanded': 'false' }, [icon('info'), h('span', { text: T.source })]);
    var srcP = h('p', { class: 'ws-drawer__srcline', hidden: true });
    srcB.addEventListener('click', function () {
      if (isFn(cfg.source)) { safe(cfg.source); return; }
      var text = typeof cfg.source === 'string' ? cfg.source : '';
      if (!text) return;
      srcP.textContent = text;
      srcP.hidden = !srcP.hidden;
      srcB.setAttribute('aria-expanded', srcP.hidden ? 'false' : 'true');
    });
    var down = tool('chev-d', T.drawerDown, 'ws-drawer__down'), up = tool('chev-u', T.drawerUp, 'ws-drawer__up');
    down.addEventListener('click', function () { stepDrawer(-1); });
    up.addEventListener('click', function () { stepDrawer(1); });
    var tabsWrap = h('div', { class: 'ws-drawer__tabwrap' }, [tabsSlot, tabPrev, tabNext]);
    var row = h('div', { class: 'ws-drawer__row' }, [legendSlot, title, tabsWrap, traySlot, h('div', { class: 'ws-drawer__tools' }, [tidyB, srcB, down, up])]);
    var el = h('div', { class: 'ws-drawer__bar' }, [grab, row, srcP]);
    return { el: el, grab: grab, tabsSlot: tabsSlot, traySlot: traySlot, up: up, down: down, tidy: tidyB, src: srcB, srcP: srcP, legendSlot: legendSlot, tabPrev: tabPrev, tabNext: tabNext };
  }

  /**
   * adopt(cur, {rail: {el, label, icon, short?}, drawer: {el, tabs?, title?, source?}, hide: [el]}) → boolean.
   * The section points at its own DOM; nothing here knows section class names. Desktop Detail ≥ 1024 px only.
   */
  function adopt(cur, spec) {
    if (!cur || !spec || !caps().adopt) return false;
    var railEl = spec.rail && spec.rail.el, drawerEl = spec.drawer && spec.drawer.el;
    if (!railEl && !drawerEl) return false;
    if (AD) unadopt();
    var A = AD = { cur: cur, id: cur.id, spec: spec, railEl: railEl || null, drawerEl: drawerEl || null, hidden: [], moved: [], created: [],
      attrs: [], rail: 'slim', drawer: 'peek', barH: BAR_H };
    var b = body();
    b.classList.add('ws-adopted');
    var label = (spec.rail && spec.rail.label) || (cur.entry && cur.entry.label) || '';
    if (railEl) {
      railEl.classList.add('ws-rail');
      railEl.setAttribute('data-map-occluder', '');
      var fold = tool('chev-l', T.shrinkPanel, 'ws-rail__fold', T.shrinkPanel + ' ( [ )');
      fold.setAttribute('aria-keyshortcuts', '[');
      fold.addEventListener('click', function () { toggleRail(); });
      railEl.appendChild(fold);
      A.created.push(fold);
      A.slim = buildSlim({ label: label, short: spec.rail.short, icon: spec.rail.icon });
      cur.host.appendChild(A.slim.el);
      A.created.push(A.slim.el);
    }
    if (drawerEl) {
      drawerEl.classList.add('ws-drawer');
      drawerEl.setAttribute('data-map-occluder', '');
      ['data-slideover', 'data-slideover-label', 'role', 'aria-label'].forEach(function (k) {
        A.attrs.push({ k: k, v: drawerEl.getAttribute(k) });
      });
      drawerEl.removeAttribute('data-slideover');
      drawerEl.removeAttribute('data-slideover-label');
      drawerEl.setAttribute('role', 'region');
      drawerEl.setAttribute('aria-label', spec.drawer.title || T.drawerTitle);
      A.bar = buildBar({ title: spec.drawer.title || T.drawerTitle, source: spec.drawer.source });
      drawerEl.insertBefore(A.bar.el, drawerEl.firstChild);
      A.created.push(A.bar.el);
      var tabs = spec.drawer.tabs;
      if (tabs && tabs.parentNode) { A.moved.push({ node: tabs, parent: tabs.parentNode, next: tabs.nextSibling }); A.bar.tabsSlot.appendChild(tabs); }
      A.onTab = function (e) {
        var t = e.target && e.target.closest ? e.target.closest('[role="tab"]') : null;
        if (t && A.drawer === 'peek') setDrawer('half');
      };
      A.bar.el.addEventListener('click', A.onTab);
      wireDrawerDrag(A);
      if (isFn(W.MutationObserver)) {
        /* a section action that opens its list ("Lihat daftar …") opens the drawer to half */
        A.wasOpen = drawerEl.classList.contains('is-open');
        A.obs = new W.MutationObserver(function () {
          var o = drawerEl.classList.contains('is-open');
          if (o && !A.wasOpen && A.drawer === 'peek') setDrawer('half');
          A.wasOpen = o;
        });
        A.obs.observe(drawerEl, { attributes: true, attributeFilter: ['class'] });
      }
    }
    (spec.hide || []).forEach(function (n) { if (n) { A.hidden.push({ node: n, was: n.hidden }); n.hidden = true; } });
    var sp = secPref();
    A.rail = railEl ? railDefault() : 'slim';
    A.drawer = drawerEl && sp.drawer && (sp.drawer.state === 'half' || sp.drawer.state === 'full') ? sp.drawer.state : 'peek';
    paintRail(true);
    renderTray();
    relayout('section', { instant: true });
    return true;
  }
  function unadopt() {
    var A = AD;
    if (!A) return;
    AD = null;
    if (A.obs) A.obs.disconnect();
    if (A.bar && A.onTab) A.bar.el.removeEventListener('click', A.onTab);
    if (A.tabSc && A.onTabScroll) A.tabSc.removeEventListener('scroll', A.onTabScroll);
    caf(A.cueRaf);
    trayPop(false);
    A.moved.slice().reverse().forEach(function (m) {
      try { if (m.parent && m.parent.isConnected) m.parent.insertBefore(m.node, m.next && m.next.parentNode === m.parent ? m.next : null); } catch (e) { /* host gone */ }
    });
    A.hidden.forEach(function (x) { x.node.hidden = x.was; });
    A.created.forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    if (A.drawerEl) {
      A.attrs.forEach(function (a) { if (a.v == null) A.drawerEl.removeAttribute(a.k); else A.drawerEl.setAttribute(a.k, a.v); });
      if (A.collapseAnim) { try { A.collapseAnim.cancel(); } catch (e) { /* gone */ } A.collapseAnim = null; }
      A.drawerEl.classList.remove('ws-drawer', 'is-peek', 'is-half', 'is-full', 'is-dragging', 'is-wide', 'is-narrow', 'is-tight', 'is-collapsing');
      unBox(A.drawerEl);
      kids(A.drawerEl).forEach(function (ch) { ch.removeAttribute('inert'); });
    }
    if (A.railEl) {
      A.railEl.classList.remove('ws-rail', 'is-slimmed', 'is-overlay');
      unBox(A.railEl);
      A.railEl.removeAttribute('inert'); A.railEl.removeAttribute('aria-hidden');
    }
    var b = body();
    b.classList.remove('ws-adopted', 'ws-rail-slim', 'ws-rail-full', 'ws-rail-overlay', 'ws-legend-on', 'ws-bar-narrow');
    if (isFn(b.style.removeProperty)) { b.style.removeProperty('--ws-drawer-vis'); b.style.removeProperty('--ws-drawer-l'); }
    /* the section puts its own moved nodes back (Merchant's rail split) */
    if (A.spec && isFn(A.spec.restore)) safe(A.spec.restore);
    renderTray();
  }
  /** The rail element and the slim rail for the current rail state. */
  function paintRail(instant) {
    var A = AD;
    if (!A) return;
    var b = body();
    b.classList.toggle('ws-rail-slim', A.rail === 'slim');
    b.classList.toggle('ws-rail-full', A.rail === 'full');
    b.classList.toggle('ws-rail-overlay', A.rail === 'overlay');
    if (A.railEl) {
      var hide = A.rail === 'slim';
      A.railEl.classList.toggle('is-slimmed', hide);
      A.railEl.classList.toggle('is-overlay', A.rail === 'overlay');
      if (hide) { A.railEl.setAttribute('inert', ''); A.railEl.setAttribute('aria-hidden', 'true'); }
      else { A.railEl.removeAttribute('inert'); A.railEl.removeAttribute('aria-hidden'); }
    }
    if (A.slim) {
      A.slim.el.classList.toggle('is-away', A.rail !== 'slim' && A.rail !== 'overlay');
      A.slim.open.setAttribute('aria-expanded', A.rail === 'slim' ? 'false' : 'true');
      paintSlim();
    }
    if (instant) return;
  }
  /** [ / "Buka panel": ≥ 1441 px slim ⇄ full (remembered, still); below: slim ⇄ overlay (not remembered, no camera move). */
  function toggleRail() {
    if (!AD || !AD.railEl) return false;
    var vw = W.innerWidth || 0;
    if (vw >= WIDE) setRail(AD.rail === 'full' ? 'slim' : 'full', true);
    else setRail(AD.rail === 'overlay' ? 'slim' : 'overlay', true);
    return true;
  }
  function setRail(state, byUser) {
    if (!AD || ['slim', 'full', 'overlay'].indexOf(state) < 0) return;
    var vw = W.innerWidth || 0;
    if (state === 'full' && vw < WIDE) state = 'overlay';
    var was = AD.rail;
    if (was === state) return;
    AD.rail = state;
    if (byUser && vw >= WIDE && state !== 'overlay') { secPref().rail = state; save(); }
    paintRail();
    relayout('rail', { still: true, keep: state !== 'overlay' && was !== 'overlay' });
    say(state === 'slim' ? T.railSlim : T.railOpen);
    if (byUser) {
      var target = state === 'slim' ? (AD.slim && AD.slim.open) : (AD.railEl && AD.railEl.querySelector('.ws-rail__fold'));
      if (target) setTimeout(function () { try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 40);
    }
  }
  /** Rail and drawer geometry (inline, beats the section's slide-over rules). */
  function placeAdopted(g) {
    var A = AD, b = body();
    var lg = DOC.querySelector ? DOC.querySelector('.section-host--furniture .legend') : null;
    b.classList.toggle('ws-legend-on', !!(lg && !lg.hidden && A.drawerEl));
    if (A.railEl) {
      var r = g.rail;
      var rs = A.railEl.style;
      if (isFn(rs.setProperty)) {
        rs.setProperty('top', r.y + 'px', 'important');
        rs.setProperty('bottom', INSET + 'px', 'important');
        rs.setProperty('left', INSET + 'px', 'important');
        rs.setProperty('width', RAIL_FULL + 'px', 'important');
        rs.setProperty('height', 'auto', 'important');
        rs.setProperty('transform', A.rail === 'slim' ? 'translateX(calc(-100% - ' + (INSET + 8) + 'px))' : 'none', 'important');
      }
    }
    if (A.slim && isFn(A.slim.el.style.setProperty)) {
      A.slim.el.style.setProperty('top', g.stage.y + 'px');
      A.slim.el.style.setProperty('height', g.stage.h + 'px');
    }
    if (A.drawerEl && g.drawerFull) {
      var H = g.H, d = A.drawerEl, ds = d.style, full = g.drawerFull;
      /* collapsing to peek: the whole drawer slides down first; the clip and the hidden content come when it lands */
      var peekNow = A.drawer === 'peek' && !A.collapsing;
      if (!A.dragging && isFn(ds.setProperty)) {
        ds.setProperty('left', Math.round(full.x) + 'px', 'important');
        ds.setProperty('width', Math.round(full.w) + 'px', 'important');
        ds.setProperty('right', 'auto', 'important');
        ds.setProperty('bottom', INSET + 'px', 'important');
        ds.setProperty('top', 'auto', 'important');
        ds.setProperty('height', Math.round(full.h) + 'px', 'important');
        ds.setProperty('max-width', 'none', 'important');
        ds.setProperty('transform', A.drawer === 'peek' ? 'translateY(' + (full.h - H.peek) + 'px)' : 'none', 'important');
        if (peekNow) ds.setProperty('clip-path', 'inset(0 0 ' + (full.h - H.peek) + 'px 0 round var(--r-glass))');
        else ds.removeProperty('clip-path');
      }
      kids(d).forEach(function (ch) { if (A.bar && ch !== A.bar.el) { if (A.drawer === 'peek') ch.setAttribute('inert', ''); else ch.removeAttribute('inert'); } });
      d.classList.toggle('is-peek', peekNow);
      d.classList.toggle('is-collapsing', A.drawer === 'peek' && !!A.collapsing);
      d.classList.toggle('is-half', A.drawer === 'half');
      d.classList.toggle('is-full', A.drawer === 'full');
      d.classList.toggle('is-wide', full.w >= 820);
      d.classList.toggle('is-narrow', full.w < 760);
      d.classList.toggle('is-tight', full.w < 960);   /* the bar's title and the words of Rapikan / Sumber give their room to the tabs */
      /* the tray folds into "{n} kartu" in a narrow bar, or once its chips would cut the tabs at this width */
      if (A.trayFold && Math.abs(full.w - A.trayFoldW) > 1) A.trayFold = false;
      A.barW = full.w;
      var tc = full.w < 700 || !!A.trayFold;
      b.classList.toggle('ws-bar-narrow', full.w < 700);
      if (tc !== !!A.trayCompact) { A.trayCompact = tc; renderTray(); }
      if (!A.cueRaf) A.cueRaf = raf(function () { A.cueRaf = 0; if (AD === A) tabCue(); });
      if (A.bar) {
        A.bar.up.disabled = A.drawer === 'full';
        A.bar.down.disabled = A.drawer === 'peek';
        A.bar.grab.setAttribute('aria-expanded', A.drawer === 'peek' ? 'false' : 'true');
      }
      if (isFn(b.style.setProperty)) {
        b.style.setProperty('--ws-drawer-vis', Math.round(A.drawer === 'peek' ? H.peek : (A.drawer === 'full' ? g.stage.h : H.half)) + 'px');
        b.style.setProperty('--ws-drawer-l', Math.round(full.x) + 'px');
      }
    }
  }
  function setDrawer(state, o) {
    var A = AD;
    o = o || {};
    if (!A || !A.drawerEl || ['peek', 'half', 'full'].indexOf(state) < 0 || state === A.drawer) return;
    var from = A.drawerEl.getBoundingClientRect ? A.drawerEl.getBoundingClientRect().top : 0;
    var animate = !reduced() && isFn(A.drawerEl.animate) && !o.instant;
    if (A.collapseAnim) { try { A.collapseAnim.cancel(); } catch (e) { /* gone */ } A.collapseAnim = null; }
    A.collapsing = animate && state === 'peek';
    A.drawer = state;
    var sp = secPref();
    sp.drawer = Object.assign({}, sp.drawer || {}, { state: state });
    save();
    relayout('drawer', { still: true, keep: true });
    if (animate) {
      var to = A.drawerEl.getBoundingClientRect().top, dy = from - to;
      var anim = null;
      if (Math.abs(dy) > 1) { try { anim = A.drawerEl.animate([{ translate: '0 ' + dy + 'px' }, { translate: '0 0' }], { duration: dur('base'), easing: ease('out') }); } catch (e) { anim = null; } }
      if (A.collapsing) {
        var land = function () { if (A.collapseAnim !== anim) return; A.collapseAnim = null; A.collapsing = false; if (AD === A) placeAdopted(model()); };
        A.collapseAnim = anim;
        if (anim && anim.finished && isFn(anim.finished.then)) anim.finished.then(land, function () {}); else land();
      }
    }
    say(state === 'peek' ? T.drawerPeek : (state === 'half' ? T.drawerHalf : T.drawerFull));
  }
  function stepDrawer(d) {
    if (!AD) return;
    var order = ['peek', 'half', 'full'], i = order.indexOf(AD.drawer);
    setDrawer(order[clamp(i + d, 0, 2)]);
  }
  function toggleDrawer() { if (!AD || !AD.drawerEl) return false; setDrawer(AD.drawer === 'peek' ? 'half' : 'peek'); return true; }
  function wireDrawerDrag(A) {
    var g0 = null;
    function down(e) {
      if (!active() || (e.button != null && e.button > 0)) return;
      var t = e.target;
      var onGrab = t && t.closest && t.closest('.ws-drawer__grab');
      var onBar = t === A.bar.el || hasClass(t, 'ws-drawer__row') || hasClass(t, 'ws-drawer__title');
      if (!onGrab && !onBar) return;
      var m = model(), H = m.H;
      g0 = { id: e.pointerId, y0: e.clientY, vis0: A.drawer === 'full' ? H.full : (A.drawer === 'half' ? H.half : H.peek), H: H, moved: false, last: 0, lastT: now(), v: 0 };
      try { if (e.currentTarget && e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* inside only */ }
    }
    function move(e) {
      if (!g0 || e.pointerId !== g0.id) return;
      var dy = e.clientY - g0.y0;
      if (!g0.moved && Math.abs(dy) < 5) return;
      var ds = A.drawerEl.style;
      if (!g0.moved) {
        g0.moved = true; A.dragging = true;
        A.drawerEl.classList.add('is-dragging');
        ds.setProperty('height', g0.H.full + 'px', 'important');
        ds.setProperty('top', 'auto', 'important');
        ds.removeProperty('clip-path');
        kids(A.drawerEl).forEach(function (ch) { ch.removeAttribute('inert'); });
      }
      var vis = clamp(g0.vis0 - dy, g0.H.peek, g0.H.full), t = now();
      if (t > g0.lastT) g0.v = (vis - g0.last) / (t - g0.lastT);
      g0.last = vis; g0.lastT = t;
      ds.setProperty('transform', 'translateY(' + Math.round(g0.H.full - vis) + 'px)', 'important');
      if (e.cancelable) e.preventDefault();
    }
    function up(e) {
      if (!g0 || e.pointerId !== g0.id) return;
      var G = g0;
      g0 = null;
      if (!G.moved) return;
      A.dragging = false;
      A.dragEnd = now();
      A.drawerEl.classList.remove('is-dragging');
      var vis = G.last, H = G.H;
      var snaps = [['peek', H.peek], ['half', H.half], ['full', H.full]];
      var pick = snaps.reduce(function (a, b) { return Math.abs(b[1] - vis) < Math.abs(a[1] - vis) ? b : a; });
      if (Math.abs(G.v) > 0.6) pick = G.v > 0 ? (vis > H.half ? snaps[2] : snaps[1]) : (vis < H.half ? snaps[0] : snaps[1]);
      else if (Math.abs(pick[1] - vis) > 48 && vis > H.peek + 120 && vis < H.full - 60) {
        var sp = secPref(); sp.drawer = Object.assign({}, sp.drawer || {}, { h: Math.round(vis) }); pick = ['half', vis];
      }
      var was = A.drawer;
      A.drawer = 'none';
      setDrawer(pick[0], { instant: true });
      if (was === pick[0]) relayout('drawer', { still: true });
    }
    A.bar.el.addEventListener('pointerdown', down);
    A.bar.el.addEventListener('pointermove', move);
    A.bar.el.addEventListener('pointerup', up);
    A.bar.el.addEventListener('pointercancel', up);
    A.bar.grab.addEventListener('click', function () { if (A.dragEnd && now() - A.dragEnd < 300) return; toggleDrawer(); });
    A.bar.grab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); stepDrawer(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); stepDrawer(-1); }
    });
  }

  /* ======================================================================= TRAY */

  var TRAY = null;
  function trayHost() {
    if (AD && AD.bar) { if (TRAY) TRAY.hidden = true; return AD.bar.traySlot; }
    if (!TRAY || !TRAY.isConnected) {
      TRAY = h('div', { class: 'ws-tray ws-tray--float', role: 'toolbar', 'aria-label': T.tray, 'data-map-occluder': '', hidden: true });
      overlayRoot().appendChild(TRAY);
      TRAY.addEventListener('keydown', trayKeys);
    }
    return TRAY;
  }
  function trayKeys(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var host = e.currentTarget, list = Array.prototype.slice.call(host.querySelectorAll('button')).filter(function (b) { return !b.disabled; });
    var i = list.indexOf(DOC.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    try { n.focus({ preventScroll: true }); } catch (x) { /* ignore */ }
  }
  function chipFor(c, onPick) {
    var t = c.title || T.sheetAria;
    var chipLabel = (c.chipKind ? c.chipKind + ' ' : '') + t;
    var chip = h('button', { type: 'button', class: 'ws-chip' + (c.pinned ? ' is-pinned' : ''), title: T.reopen(t), 'aria-label': T.reopen(t) },
      [icon(c.pinned ? 'tack' : (c.kind === 'kec' ? 'map' : 'pin')), h('span', { class: 'ws-chip__t', text: chipLabel })]);
    chip.addEventListener('click', function () { if (onPick) onPick(); restore(c); });
    var x = h('button', { type: 'button', class: 'ws-chip__x', title: T.closeCard(t), 'aria-label': T.closeCard(t) }, [icon('close')]);
    x.addEventListener('click', function () { if (onPick) onPick(); closeCard(c, 'button'); });
    return { wrap: h('span', { class: 'ws-chipwrap' }, [chip, x]), chip: chip };
  }
  /**
   * The tray: a chip per card made small. In a narrow drawer bar (< 700 px: a card and two pins at 1366) the chips
   * fold into one "{n} kartu" button with their list above it, so the section's tabs keep their room.
   */
  function renderTray() {
    if (!DOC || !DOC.body) return;
    var host = trayHost();
    clear(host);
    trayPop(false);
    var mins = CARDS.filter(function (c) { return c.open && c.min; });
    var compact = !!(AD && AD.bar && host === AD.bar.traySlot && AD.trayCompact && mins.length);
    if (compact) {
      var more = h('button', { type: 'button', class: 'ws-chip ws-traymore', 'aria-haspopup': 'true', 'aria-expanded': 'false',
        title: T.tray + ': ' + mins.map(function (c) { return c.title || T.sheetAria; }).join(', '), 'aria-label': T.tray + ' (' + mins.length + ')' },
        [icon('layers'), h('span', { class: 'ws-chip__t', text: T.trayN(mins.length) })]);
      more.addEventListener('click', function () { trayPop(!TRAYPOP, more, mins); });
      mins.forEach(function (c) { c.chip = more; });
      host.appendChild(h('span', { class: 'ws-chipwrap ws-chipwrap--more' }, [more]));
    } else {
      mins.forEach(function (c) { var x = chipFor(c); c.chip = x.chip; host.appendChild(x.wrap); });
    }
    if (host === TRAY) {
      TRAY.hidden = !mins.length || !active();
      placeTray();
    }
    if (AD && AD.bar) AD.bar.el.classList.toggle('has-tray', mins.length > 0);
  }
  /** The list of the folded tray: above its button, closes on a pick, Esc or a press outside. */
  var TRAYPOP = null;
  function trayPop(on, btn, mins) {
    if (!on) {
      if (TRAYPOP) {
        var p = TRAYPOP; TRAYPOP = null;
        DOC.removeEventListener('pointerdown', p.outside, true);
        if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
        if (p.btn) p.btn.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    trayPop(false);
    var el = h('div', { class: 'ws-traypop ws-tray panel', role: 'toolbar', 'aria-label': T.tray, 'data-map-occluder': '' });
    var close = function () { trayPop(false); };
    mins.forEach(function (c) { el.appendChild(chipFor(c, close).wrap); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); trayPop(false); try { btn.focus({ preventScroll: true }); } catch (x) { /* ignore */ } return; }
      trayKeys(e);
    });
    overlayRoot().appendChild(el);
    var r = rectOf(btn) || { x: 0, y: 0, w: 0, h: 0 };
    if (isFn(el.style.setProperty)) {
      el.style.setProperty('left', Math.round(Math.max(INSET, Math.min(r.x, (W.innerWidth || 0) - INSET - (el.offsetWidth || 240)))) + 'px');
      el.style.setProperty('bottom', Math.round((W.innerHeight || 0) - r.y + 6) + 'px');
    }
    var outside = function (e) { if (!el.contains(e.target) && e.target !== btn && !(btn.contains && btn.contains(e.target))) trayPop(false); };
    DOC.addEventListener('pointerdown', outside, true);
    TRAYPOP = { el: el, btn: btn, outside: outside };
    btn.setAttribute('aria-expanded', 'true');
    var first = el.querySelector('.ws-chip');
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) { /* ignore */ } }
  }
  /** The tab strip of the drawer bar: an edge fade and ‹ › buttons whenever its tabs run past the bar. */
  function tabCue() {
    var A = AD;
    if (!A || !A.bar) return;
    var slot = A.bar.tabsSlot, sc = slot.querySelector('[role="tablist"]') || slot;
    if (A.tabSc !== sc) {
      if (A.tabSc && A.onTabScroll) A.tabSc.removeEventListener('scroll', A.onTabScroll);
      A.tabSc = sc;
      A.onTabScroll = function () { paintTabCue(A); };
      sc.addEventListener('scroll', A.onTabScroll, { passive: true });
    }
    paintTabCue(A);
  }
  function paintTabCue(A) {
    var sc = A.tabSc, slot = A.bar.tabsSlot;
    if (!sc) return;
    var over = sc.scrollWidth > sc.clientWidth + 1;
    var atStart = !over || sc.scrollLeft <= 1, atEnd = !over || sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1;
    slot.classList.toggle('is-over', over);
    slot.classList.toggle('at-start', atStart);
    slot.classList.toggle('at-end', atEnd);
    A.bar.tabPrev.hidden = atStart;
    A.bar.tabNext.hidden = atEnd;
    /* chips in the tray while the tabs are cut: the tray folds (the tabs keep the room) */
    if (over && !A.trayCompact && A.bar.traySlot.querySelector('.ws-chip')) {
      A.trayFold = true; A.trayFoldW = A.barW || 0; A.trayCompact = true;
      renderTray();
      if (!A.cueRaf) A.cueRaf = raf(function () { A.cueRaf = 0; if (AD === A) paintTabCue(A); });
    }
  }
  function scrollTabs(A, dir) {
    var sc = A && A.tabSc;
    if (!sc) return;
    var by = Math.max(80, Math.round(sc.clientWidth * 0.7)) * dir;
    try { if (isFn(sc.scrollBy)) sc.scrollBy({ left: by, behavior: reduced() ? 'auto' : 'smooth' }); else sc.scrollLeft += by; } catch (e) { sc.scrollLeft += by; }
  }
  function placeTray(g) {
    if (!TRAY || TRAY.hidden || (AD && AD.bar)) return;
    g = g || model();
    if (isFn(TRAY.style.setProperty)) {
      TRAY.style.setProperty('left', Math.round(g.free.x + g.free.w / 2) + 'px');
      TRAY.style.setProperty('top', Math.round(rb(g.free) - 52) + 'px');
    }
  }

  /* ======================================================================= CARDS: chrome, drag, resize, dock */

  /** The bar of a card: grip, eyebrow, CONTOH, tools (Sematkan, Kecilkan, Tutup) and the hidden grip help. */
  function buildCardBar(c) {
    var helpId = uid('ws-help');
    var help = h('span', { class: 'sr-only', id: helpId, text: T.gripHelp });
    var grip = h('button', { type: 'button', class: 'ws-grip', 'aria-describedby': helpId, title: T.gripHelp }, [icon('grip')]);
    var eyebrow = h('span', { class: 'ws-bar__eyebrow t-eyebrow' });
    var demo = h('span', { class: 'ws-demo', text: 'CONTOH', hidden: true });
    var pinB = tool('tack', T.pin, 'ws-tool--pin', T.pinTip);
    pinB.setAttribute('aria-pressed', 'false');
    var minB = tool('minus', T.min, 'ws-tool--min', T.minTip);
    var closeB = tool('close', T.close, 'ws-tool--close', T.closeTip);
    pinB.addEventListener('click', function () { pin(c.id, !c.pinned); });
    minB.addEventListener('click', function () { setMin(c, true); });
    closeB.addEventListener('click', function () { closeCard(c, 'button'); });
    var bar = h('div', { class: 'ws-bar' }, [grip, eyebrow, demo, h('div', { class: 'ws-bar__tools' }, [pinB, minB, closeB]), help]);
    bar.addEventListener('pointerdown', function (e) { startDrag(c, e); });
    bar.addEventListener('dblclick', function (e) {
      if (e.target.closest && e.target.closest('button, a, input, select, textarea')) return;
      toggleDock(c);
    });
    grip.addEventListener('keydown', function (e) { gripKey(c, e); });
    c.bar = { el: bar, grip: grip, eyebrow: eyebrow, demo: demo, pin: pinB, min: minB, close: closeB };
    return bar;
  }
  function addResizers(c) {
    ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (d) {
      var z = h('span', { class: 'ws-rz ws-rz--' + d, 'data-dir': d, 'aria-hidden': 'true' });
      c.el.appendChild(z);
      z.addEventListener('pointerdown', function (e) { startResize(c, d, e); });
    });
  }
  function paintCard(c) {
    var b = c.bar;
    if (!b) return;
    var cp = caps();
    b.pin.setAttribute('aria-pressed', c.pinned ? 'true' : 'false');
    b.pin.classList.toggle('is-on', !!c.pinned);
    var pl = c.pinned ? T.unpin : T.pin;
    b.pin.setAttribute('aria-label', pl);
    b.pin.title = c.pinned ? T.unpin : (pinCount() >= MAX_PINS ? T.pinMax : T.pinTip);
    b.pin.hidden = !cp.pins;
    /* a third pin is refused with the message (pin()): the button stays focusable and clickable, it only looks off */
    var full = !c.pinned && pinCount() >= MAX_PINS;
    if (full) b.pin.setAttribute('aria-disabled', 'true'); else b.pin.removeAttribute('aria-disabled');
    b.pin.classList.toggle('is-disabled', full);
    b.min.hidden = !cp.minimise;
    b.grip.hidden = !cp.float;
    b.grip.setAttribute('aria-label', T.grip(c.title || ''));
    c.el.classList.toggle('is-pinned', !!c.pinned);
  }
  function paintAllCards() { CARDS.forEach(paintCard); }
  function raise(c) {
    ZTOP += 1;
    c.z = ZTOP;
    zOrder();
  }
  function defaultFloat(c, g) {
    g = g || model();
    var saved = secPref().float && secPref().float[c.kind];
    var w = clamp((saved && saved.w) || 380, MIN_W, 520), hh = clamp((saved && saved.h) || Math.min(natural(c) || 480, g.stage.h * 0.72), MIN_H, g.stage.h);
    var n = visibleCards().filter(function (x) { return x !== c && !x.side; }).length;
    var r = saved && isNum(saved.x) ? R(saved.x, saved.y, w, hh) : R(rr(g.free) - w - 24 - n * 28, g.free.y + 24 + n * 28, w, hh);
    return avoidTargets(r, g);
  }
  /** A new or restored card never lands on the selection, the route end or the focused kecamatan. */
  function avoidTargets(r, g) {
    var tg = targets();
    if (!tg.length) return r;
    var hitAny = tg.some(function (t) { return hit(r, t.rect, 8); });
    if (!hitAny) return r;
    var F = g.free, alt = [R(F.x + 24, r.y, r.w, r.h), R(rr(F) - r.w - 24, r.y, r.w, r.h), R(r.x, rb(F) - r.h - 24, r.w, r.h), R(r.x, F.y + 24, r.w, r.h)];
    for (var i = 0; i < alt.length; i++) if (!tg.some(function (t) { return hit(alt[i], t.rect, 8); })) return alt[i];
    return r;
  }
  function rememberFloat(c) {
    if (!c.float) return;
    var sp = secPref();
    sp.float = sp.float || {};
    sp.float[c.kind || 'x'] = { x: num(c.float.x), y: num(c.float.y), w: num(c.float.w), h: num(c.float.h) };
    save();
  }
  function setSide(c, side, o) {
    o = o || {};
    var from = o.from || rectOf(c.el);
    if (side === 'left' && !caps().leftCol) side = 'right';
    c.side = side || null;
    if (!side && !c.float) c.float = defaultFloat(c);
    if (c.isDrawer && side && o.remember !== false) { secPref().side = side; save(); }
    relayout('dock', { still: true, keep: true, split: !!o.split });
    flip(c, from);
    paintCard(c);
    say(side === 'right' ? T.dockR : (side === 'left' ? T.dockL : T.undocked));
  }
  function toggleDock(c) {
    if (!caps().float) return;
    if (c.side) { var r = rectOf(c.el); c.float = c.float || (r ? R(r.x - 24, r.y, Math.max(MIN_W, r.w), Math.min(r.h, model().stage.h * 0.72)) : null); setSide(c, null); rememberFloat(c); }
    else setSide(c, c.isDrawer ? (secPref().side || 'right') : 'right');
  }
  /**
   * FLIP: the card glides from where it was to its new place by translate only (never a scale: text is not stretched).
   * When its size changed too, the box takes the new size at once and its content fades in (180 ms).
   */
  function flip(c, from) {
    if (reduced() || !from || !c.el || !isFn(c.el.animate)) return;
    var to = rectOf(c.el);
    if (!to || !to.w || !to.h) return;
    var dx = from.x - to.x, dy = from.y - to.y;
    var resized = Math.abs(from.w - to.w) > 8 || Math.abs(from.h - to.h) > 8;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && !resized) return;
    try {
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) c.el.animate([{ transform: 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px)' }, { transform: 'none' }], { duration: dur('base'), easing: ease('out') });
      if (resized) kids(c.el).forEach(function (k) {
        if (hasClass(k, 'ws-rz') || !isFn(k.animate)) return;
        k.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur('fast'), delay: 60, easing: ease('out'), fill: 'backwards' });
      });
    } catch (e) { /* lands in place */ }
  }
  /** FLIP many cards from the rects they had (a pin arriving moves the active card into its half of the column). */
  function flipAll(froms, skip) {
    (froms || []).forEach(function (x) { if (x.c !== skip && x.c.open && !x.c.min && x.r && x.r.w) flip(x.c, x.r); });
  }

  var GHOST = null;
  function ghost(side) {
    if (!GHOST || !GHOST.isConnected) { GHOST = h('div', { class: 'ws-ghost', 'aria-hidden': 'true', hidden: true }); overlayRoot().appendChild(GHOST); }
    if (!side) { GHOST.hidden = true; return; }
    var g = model(), cw = colWidths({ vw: g.vw, adopted: !!AD, rail: AD ? AD.rail : null, left: side === 'left', right: side === 'right', pref: secPref().col || {} });
    var x = side === 'right' ? g.vw - INSET - cw.right : g.railEdge + GAP;
    setBox(GHOST, R(x, g.stage.y, side === 'right' ? cw.right : cw.left, g.stage.h));
    GHOST.hidden = false;
  }
  function startDrag(c, e) {
    if (!caps().float || (e.button != null && e.button > 0) || !c.open || c.min) return;
    var t = e.target;
    if (t.closest && t.closest('.ws-bar__tools, .ws-tool, a, input, select, textarea, .ws-rz')) return;
    if (t.closest && t.closest('button') && !t.closest('.ws-grip')) return;
    var r = rectOf(c.el), g0 = model();
    /* everything pointermove needs is read once here: no layout read follows a style write inside the handler (§12.4) */
    var D = { card: null, id: e.pointerId, x0: e.clientX, y0: e.clientY, r: r, moved: false, snap: null, relX: (e.clientX - r.x) / Math.max(1, r.w), relY: e.clientY - r.y,
      target: e.currentTarget, railEdge: g0.railEdge, vw: g0.vw, leftCol: caps().leftCol, rf: 0, dx: 0, dy: 0, wasSide: c.side, float0: null };
    try { D.target.setPointerCapture(e.pointerId); } catch (x) { /* inside only */ }
    function paint() {
      D.rf = 0;
      c.el.style.transform = 'translate(' + Math.round(D.dx) + 'px,' + Math.round(D.dy) + 'px)';
    }
    function mv(ev) {
      if (ev.pointerId !== D.id) return;
      var dx = ev.clientX - D.x0, dy = ev.clientY - D.y0;
      if (!D.moved && dx * dx + dy * dy < 25) return;
      if (!D.moved) {
        D.moved = true;
        DRAG = D; D.card = c;
        raise(c);
        c.el.classList.add('is-dragging');
        dragShield(true);
        if (c.side) {
          /* undock under the pointer at the floating size; the column, the map padding and the map controls stay as
             they are until the drop (nothing rearranges under the pointer) */
          var f = c.float || defaultFloat(c, g0);
          D.float0 = R(Math.round(ev.clientX - D.relX * f.w), Math.round(ev.clientY - Math.min(D.relY, 24)), f.w, f.h);
          c.geo = D.float0;
          setBox(c.el, D.float0);
          c.el.setAttribute('data-dock', 'float');
          D.r = D.float0; D.x0 = ev.clientX; D.y0 = ev.clientY; dx = 0; dy = 0;
        }
      }
      D.dx = dx; D.dy = dy;
      if (!D.rf) D.rf = raf(paint);
      var snap = null;
      if (ev.clientX <= D.railEdge + SNAP_PX && D.leftCol) snap = 'left';
      else if (ev.clientX >= D.vw - INSET - SNAP_PX) snap = 'right';
      if (snap !== D.snap) { D.snap = snap; ghost(snap); }
      if (ev.cancelable) ev.preventDefault();
    }
    function up(ev) {
      if (ev.pointerId !== D.id) return;
      D.target.removeEventListener('pointermove', mv);
      D.target.removeEventListener('pointerup', up);
      D.target.removeEventListener('pointercancel', up);
      ghost(null);
      if (!D.moved) return;
      caf(D.rf); D.rf = 0;
      var dx = ev.clientX - D.x0, dy = ev.clientY - D.y0;
      c.el.style.transform = 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px)';
      var from = rectOf(c.el);
      DRAG = null;
      c.el.classList.remove('is-dragging');
      dragShield(false);
      c.el.style.transform = '';
      if (D.snap) { setSide(c, D.snap, { from: from, split: true }); return; }
      var g = model();
      c.side = null;
      var nf = floatClamp(R(D.r.x + dx, D.r.y + dy, D.r.w, D.r.h), g);
      /* let go partly off screen, or over the drawer bar: it settles fully on screen, above the drawer */
      c.float = settle(nf, g);
      rememberFloat(c);
      relayout(D.wasSide ? 'dock' : 'move', { still: true, keep: true, split: true });
      paintCard(c);
      flip(c, from);
      if (D.wasSide) say(T.undocked);
    }
    D.target.addEventListener('pointermove', mv);
    D.target.addEventListener('pointerup', up);
    D.target.addEventListener('pointercancel', up);
  }
  function startResize(c, dir, e) {
    if (!active() || (e.button != null && e.button > 0)) return;
    if (!c.side && !caps().float) return;
    e.preventDefault(); e.stopPropagation();
    var r = rectOf(c.el), g0 = model();
    var D = { card: c, id: e.pointerId, x0: e.clientX, y0: e.clientY, r: r, colW: c.side ? (g0[c.side] ? g0[c.side].w : r.w) : 0, target: e.currentTarget, resize: true };
    try { D.target.setPointerCapture(e.pointerId); } catch (x) { /* inside only */ }
    DRAG = D;
    raise(c);
    c.el.classList.add('is-resizing');
    dragShield(true, RZ_CURSOR[dir] || 'ew-resize');
    var rf = 0, last = null;
    function mv(ev) {
      if (ev.pointerId !== D.id) return;
      last = ev;
      if (rf) return;
      rf = raf(function () {
        rf = 0;
        var dx = last.clientX - D.x0, dy = last.clientY - D.y0, g = model();
        if (c.side) {   /* a docked card: its inner edge sets the column width */
          var cw = c.side === 'right' ? D.colW - dx : D.colW + dx;
          var sp = secPref(); sp.col = sp.col || {};
          sp.col[c.side] = clamp(Math.round(cw), COL_MIN, Math.max(COL_MIN, Math.min(560, Math.round(g.vw * 0.4))));
          placeAll(model());
          return;
        }
        var q = R(D.r.x, D.r.y, D.r.w, D.r.h);
        if (dir.indexOf('e') >= 0) q.w = D.r.w + dx;
        if (dir.indexOf('s') >= 0) q.h = D.r.h + dy;
        if (dir.indexOf('w') >= 0) { q.w = D.r.w - dx; q.x = D.r.x + dx; }
        if (dir.indexOf('n') >= 0) { q.h = D.r.h - dy; q.y = D.r.y + dy; }
        if (q.w < MIN_W) { if (dir.indexOf('w') >= 0) q.x -= MIN_W - q.w; q.w = MIN_W; }
        if (q.h < MIN_H) { if (dir.indexOf('n') >= 0) q.y -= MIN_H - q.h; q.h = MIN_H; }
        c.float = floatClamp(q, g);
        c.geo = c.float;
        setBox(c.el, c.float);
      });
    }
    function up(ev) {
      if (ev.pointerId !== D.id) return;
      D.target.removeEventListener('pointermove', mv);
      D.target.removeEventListener('pointerup', up);
      D.target.removeEventListener('pointercancel', up);
      caf(rf); rf = 0;
      DRAG = null;
      c.el.classList.remove('is-resizing');
      dragShield(false);
      if (c.side) save(); else rememberFloat(c);
      c.dirty = true;
      relayout('resize', { still: true, keep: true });
      var rr0 = rectOf(c.el);
      if (rr0) say(T.size(Math.round(rr0.w), Math.round(rr0.h)));
      remeasureTables(c);
    }
    D.target.addEventListener('pointermove', mv);
    D.target.addEventListener('pointerup', up);
    D.target.addEventListener('pointercancel', up);
  }
  function remeasureTables(c) {
    if (!c.el || !isFn(W.dispatchEvent)) return;
    try { W.dispatchEvent(new W.CustomEvent('mcd:ws-resize', { detail: { id: c.id } })); } catch (e) { /* none */ }
  }
  /** Keys on a card's grip (§6): arrows move, Shift ×4, Alt resize, Enter dock ⇄ float, Home / End dock, - minimise, Esc close. */
  function gripKey(c, e) {
    var k = e.key, step = e.shiftKey ? 64 : 16;
    var arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (k === 'Enter' || k === ' ') { e.preventDefault(); toggleDock(c); return; }
    if (k === 'Home') { e.preventDefault(); if (caps().leftCol) setSide(c, 'left'); return; }
    if (k === 'End') { e.preventDefault(); setSide(c, 'right'); return; }
    if (k === '-' || k === 'Subtract') { e.preventDefault(); setMin(c, true); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCard(c, 'esc'); return; }
    if (!arrows[k]) return;
    e.preventDefault();
    e.stopPropagation();
    var a = arrows[k], g = model();
    if (c.side && e.altKey && a[0] !== 0) {
      var sp = secPref(); sp.col = sp.col || {};
      var cw = (g[c.side] ? g[c.side].w : colDefault(g.vw)) + (c.side === 'right' ? -a[0] : a[0]) * step;
      sp.col[c.side] = clamp(Math.round(cw), COL_MIN, Math.max(COL_MIN, Math.min(560, Math.round(g.vw * 0.4))));
      save();
      relayout('resize', { still: true, keep: true });
      say(T.size(sp.col[c.side], Math.round(g.stage.h)));
      return;
    }
    if (!caps().float) return;
    if (c.side) { var r = rectOf(c.el); c.side = null; c.float = r ? R(r.x, r.y, r.w, Math.min(r.h, g.stage.h * 0.72)) : defaultFloat(c, g); }
    var q = Object.assign({}, c.float || defaultFloat(c, g));
    if (e.altKey) { q.w += a[0] * step; q.h += a[1] * step; } else { q.x += a[0] * step; q.y += a[1] * step; }
    c.float = floatClamp(q, g);
    rememberFloat(c);
    relayout('move', { still: true, keep: true });
    paintCard(c);
    say(e.altKey ? T.size(Math.round(c.float.w), Math.round(c.float.h)) : T.undocked);
  }

  /* ---------------------------------------------------------- minimise, restore, close, pin, tidy */

  /**
   * Kecilkan: the card shrinks into its chip in the tray (FLIP, 300 ms) and only then becomes .is-min (hidden). While
   * it flies it is inert and lets clicks through (.is-minning), so nothing under it is blocked.
   */
  function setMin(c, on, o) {
    o = o || {};
    if (!c || !c.open || !!c.min === !!on) return;
    if (on && !caps().minimise && !o.force) return;
    var from = rectOf(c.el);
    stopMin(c);
    c.min = !!on;
    if (c.min) { c.el.setAttribute('inert', ''); c.el.setAttribute('aria-hidden', 'true'); }
    else { c.el.classList.remove('is-min'); c.el.removeAttribute('inert'); c.el.removeAttribute('aria-hidden'); }
    renderTray();
    if (o.quiet) { c.el.classList.toggle('is-min', c.min); return; }
    relayout(c.min ? 'min' : 'restore', { still: true, keep: true });
    if (c.min) {
      var chip = c.chip, anim = null;
      var cr = chip ? rectOf(chip) : null;
      if (cr && cr.w && from && from.w && !reduced() && isFn(c.el.animate)) {
        var dx = cr.x + cr.w / 2 - (from.x + from.w / 2), dy = cr.y + cr.h / 2 - (from.y + from.h / 2), s = Math.max(0.08, cr.w / Math.max(1, from.w));
        c.el.classList.add('is-minning');
        try {
          anim = c.el.animate([{ transformOrigin: '50% 50%', transform: 'none', opacity: 1 }, { transformOrigin: '50% 50%', transform: 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px) scale(' + s + ')', opacity: 0 }],
            { duration: dur('base'), easing: ease('inOut'), fill: 'forwards' });
        } catch (e) { anim = null; }
      }
      if (anim) {
        c.minAnim = anim;
        var done = function () {
          if (c.minAnim !== anim) return;
          c.minAnim = null;
          c.el.classList.remove('is-minning');
          if (c.min) c.el.classList.add('is-min');
          try { anim.cancel(); } catch (e) { /* gone */ }
        };
        if (anim.finished && isFn(anim.finished.then)) anim.finished.then(done, done); else setTimeout(done, dur('base'));
      } else c.el.classList.add('is-min');
      if (chip) { try { chip.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      say(T.minimised(c.title || ''));
    }
  }
  /** A minimise still flying is dropped (restore, close, a section switch). */
  function stopMin(c) {
    if (!c || !c.minAnim) return;
    var a = c.minAnim;
    c.minAnim = null;
    c.el.classList.remove('is-minning');
    try { a.cancel(); } catch (e) { /* gone */ }
  }
  function restore(c, o) {
    o = o || {};
    if (!c || !c.min) return;
    var chip = c.chip, cr = chip ? rectOf(chip) : null;
    if (c.float) c.float = avoidTargets(c.float, model());
    setMin(c, false);
    raise(c);
    if (cr && !reduced() && isFn(c.el.animate)) {
      var to = rectOf(c.el);
      if (to && to.w) {
        var dx = cr.x + cr.w / 2 - (to.x + to.w / 2), dy = cr.y + cr.h / 2 - (to.y + to.h / 2), s = Math.max(0.08, cr.w / to.w);
        try { c.el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: dur('base'), easing: ease('out') }); } catch (e) { /* in place */ }
      }
    }
    if (o.focus !== false) focusTitle(c);
    say(T.restored(c.title || ''));
  }
  function focusTitle(c) {
    setTimeout(function () {
      var t = c.el && c.el.querySelector('.dd-title');
      if (!t) return;
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      try { t.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }, 30);
  }
  /** Close a card: the drawer through the shell (Tutup semantics), a pin by removing it. Focus goes back. */
  function closeCard(c, reason) {
    if (!c || !c.open) return;
    var back = c.opener;
    var title = c.title || '';
    if (c.isDrawer) {
      c.pinned = false;
      if (MCD.app && isFn(MCD.app.closeDrawer)) MCD.app.closeDrawer(reason === 'button' || reason === 'esc' ? false : true);
    } else {
      c.open = false;
      CARDS.splice(CARDS.indexOf(c), 1);
      var el = c.el;
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduced() ? 0 : dur('fast') + 40);
      renderTray();
      relayout('close', { still: true });
      paintAllCards();
    }
    if (reason === 'button' || reason === 'esc') {
      var next = back && back.isConnected && back.offsetWidth > 0 ? back : null;
      if (!next) { var v = visibleCards().sort(function (a, b) { return (b.z || 0) - (a.z || 0); })[0]; next = v ? (v.bar && v.bar.grip) : null; }
      if (!next) next = DOC.getElementById('map');
      if (next) { try { next.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      say(T.closed(title));
    }
  }

  /**
   * pin(id, on) → boolean. Sematkan: the active sheet stays while the next selection opens a new one (≤ 2 pins; a
   * third press is refused with the message and nothing closes). Pins rebuild live from section.cardFor(sel).
   */
  function pin(id, on) {
    var c = typeof id === 'object' ? id : cardById(id || 'detail');
    if (!c || !c.open) return false;
    on = on !== false;
    if (on === !!c.pinned) return true;
    if (on) {
      if (!caps().pins) return false;
      if (pinCount() >= MAX_PINS) {
        toast(T.pinMax, 'warn');
        say(T.pinMax);
        paintAllCards();
        return false;
      }
      c.pinned = true;
      paintAllCards();
      say(T.pinned(c.title || ''));
      if (LAST_INPUT === 'key') focusTitle(c);
      return true;
    }
    c.pinned = false;
    paintAllCards();
    if (!c.isDrawer) closeCard(c, 'unpin');
    return true;
  }

  /** Rapikan (T): every card back to a column, floats re-docked, the drawer to peek, the rail to its default; nothing closes. */
  function tidy() {
    if (!active()) return false;
    var sp = secPref();
    delete sp.float; delete sp.col; delete sp.drawer;
    if ((W.innerWidth || 0) >= WIDE) delete sp.rail;
    var pref0 = sp.side === 'left' && caps().leftCol ? 'left' : 'right';
    var other = pref0 === 'right' ? 'left' : 'right';
    var froms = CARDS.map(function (c) { return { c: c, r: rectOf(c.el) }; });
    CARDS.forEach(function (c) {
      if (!c.open) return;
      if (c.isDrawer) c.side = pref0;
      else c.side = caps().leftCol ? other : 'right';
      c.float = null;
    });
    save();
    if (AD) { AD.drawer = 'peek'; AD.rail = railDefault(); paintRail(); }
    relayout('tidy', { still: true, keep: true });
    froms.forEach(function (x) { if (x.c.open && !x.c.min) flip(x.c, x.r); });
    paintAllCards();
    say(T.tidyDone);
    return true;
  }

  /* ======================================================================= THE ACTIVE SHEET (the app drawer) */

  /** Shell hook 1: the app's drawer gets the card chrome once (bar, resize handles); CSS shows it on desktops only. */
  function adoptDrawer(d) {
    if (!d || !d.el || DCARD) return DCARD;
    APPD = d;
    var c = DCARD = { id: 'detail', el: d.el, isDrawer: true, open: false, min: false, pinned: false, side: null, float: null, order: 0, z: 0, kind: 'point', title: '' };
    var bar = buildCardBar(c);
    d.el.insertBefore(bar, d.el.firstChild);
    addResizers(c);
    d.el.addEventListener('pointerdown', function () { if (active()) raise(c); }, true);
    d.el.addEventListener('focusin', function () { if (active()) raise(c); });
    CARDS.push(c);
    return c;
  }
  function drawerOpen() { return !!(APPD && APPD.el && !APPD.el.hidden && APPD.el.classList.contains('is-open')); }
  function sheetShown() { return !!(DCARD && drawerOpen() && !DCARD.min && !DCARD.pinned); }

  /* origin of the next selection (§3.1): set by the shell before state.set */
  var ORIGIN = { pending: null, at: 0, ttl: 0, sel: '', of: '' };
  function origin(o) {
    if (o !== 'map' && o !== 'focus' && o !== 'list') return;
    ORIGIN.pending = o;
    ORIGIN.at = now();
    ORIGIN.ttl = o === 'focus' ? 3000 : 250;   /* a focus flight lands later (MCD.app.focus); a map pick selects at once */
  }
  var LAND = { at: 0 };
  function onSelect(e) {
    var sel = e && e.selection;
    LAND.at = sel ? now() : 0;
    var key = selKey(sel);
    var o = ORIGIN.pending && now() - ORIGIN.at < ORIGIN.ttl ? ORIGIN.pending : (e && e.source === 'map' ? 'map' : 'list');
    ORIGIN.pending = null;
    ORIGIN.sel = key; ORIGIN.of = key ? o : '';
    if (CO) {
      if (!sel) { if (CO.selKey) closeCallout('outside'); }
      else if (!sameItem(sel, CO)) closeCallout('replace');
    }
  }
  function originOf(sel) { return selKey(sel) && selKey(sel) === ORIGIN.sel ? ORIGIN.of : 'list'; }
  function sameItem(sel, co) {
    if (!sel || !co) return false;
    var k = selKey(sel);
    if (co.selKey && k === co.selKey) return true;
    if (co.spec && co.spec.kind === 'kec') {
      var kid = String((co.spec.key || '').replace(/^kec:/, ''));
      var sid = sel.extra && sel.extra.kecamatanId != null ? String(sel.extra.kecamatanId) : String(sel.id);
      return /kec/i.test(String(sel.kind)) && sid === kid;
    }
    return false;
  }

  /**
   * Shell hook 2a: route(model, opts, drawerSel) → 'callout' | 'sheet'. A map pick with no sheet on screen shows a
   * callout first; a list, chart, search or focus pick (or opts.explicit) opens the sheet; an open sheet updates in place.
   */
  function route(model, opts, drawerSel) {
    opts = opts || {};
    if (!active() || SUSPENDED || !model) return 'sheet';
    var sel = drawerSel || (st() && st().selection) || null;
    if (opts.refresh) {
      if (CO && CO.fromModel && !sheetShown() && (!sel || sameItem(sel, CO))) { CO.handle.update(calloutSpec(model, sel, CO.anchorLL, opts)); return 'callout'; }
      return 'sheet';
    }
    var o = opts.explicit || opts.direct ? 'list' : originOf(sel);
    if (o === 'map' && !sheetShown()) {
      var anchor = model.anchor || positionOf(sel);
      if (anchor && projectable()) {
        if (DCARD && DCARD.min && !DCARD.pinned && drawerOpen()) { DCARD.min = false; DCARD.el.classList.remove('is-min'); if (MCD.app && isFn(MCD.app.closeDrawer)) MCD.app.closeDrawer(true); renderTray(); }
        var spec = calloutSpec(model, sel, anchor, opts);
        spec.fromModel = true;
        callout(spec);
        return 'callout';
      }
    }
    /* a pinned sheet keeps its item: it moves into a card of its own before the drawer takes the new one */
    if (DCARD && DCARD.pinned && drawerOpen() && selKey(DCARD.sel) !== selKey(sel)) detachPinned();
    if (CO) closeCallout('detail');
    return 'sheet';
  }
  function projectable() { var m = mapObj(); return !!(m && isFn(m.project)); }
  function mapObj() { var M = MCD.map; try { return M && isFn(M.getMap) ? M.getMap() : null; } catch (e) { return null; } }
  function positionOf(sel) {
    if (!sel) return null;
    var M = MCD.map, p = null;
    try { if (M && isFn(M.positionOf)) p = M.positionOf(sel); } catch (e) { p = null; }
    return p && isNum(+p[0]) && isNum(+p[1]) ? [+p[0], +p[1]] : null;
  }
  function brief(model) {
    var b = (model && model.brief) || {};
    var nums = (b.numbers || []).filter(function (s) { return s && s.value != null && s.value !== ''; });
    if (!nums.length && model && model.body) {
      var rows = [];
      model.body.forEach(function (n) { if (n && n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('.dd-kv'), function (r) { rows.push(r); }); });
      rows.slice(0, 3).forEach(function (r) {
        var k = r.querySelector('.dd-kv__k'), v = r.querySelector('.dd-kv__v'), vt = textOf(v);
        if (k && vt) nums.push({ label: textOf(k), value: vt.length > 32 ? vt.slice(0, 30) + '…' : vt });
      });
    }
    return { numbers: nums.slice(0, 3), chips: (b.chips || []).slice(0, 2), primary: b.primary || null, note: b.note || null };
  }
  function gmapsLinks(model, sel, ll) {
    if (veiled()) return [];
    var out = [], G = MCD.util && MCD.util.gmaps;
    var g = model && model.gmaps;
    if (g && G && isFn(G.url)) { var u = G.url(g); if (u) out.push({ label: g.approx ? 'Buka area di Google Maps' : T.gmaps, href: u, title: (g.approx ? (G.APPROX_NOTE || '') + ' ' : '') + (G.TIP || '') }); }
    var D = MCD.distance;
    var pt = ll || (g && isNum(+g.lon) && isNum(+g.lat) ? [+g.lon, +g.lat] : null);
    if (pt && D && isFn(D.directionsUrl) && pointKind(model, sel)) {
      var r = D.directionsUrl(pt[0], pt[1]);
      if (r) out.push({ label: T.route, href: r, title: 'Petunjuk arah dari KCP Jakarta Cilangkap ke titik ini di Google Maps, di tab baru.\nHanya koordinat yang dikirim. Perlu internet.' });
    }
    return out;
  }
  function pointKind(model, sel) {
    var k = String((model && model.kind) || (sel && sel.kind) || '');
    return !/kec|area|yay|cluster|tile|ring|territory|site|mabes/i.test(k) && !!k;
  }
  function calloutSpec(model, sel, anchor, opts) {
    var b = brief(model);
    var key = selKey(sel);
    var chips = b.chips.length ? b.chips : [].concat(model.sub || [], model.tags || []).filter(function (n) { return n && n.cloneNode && textOf(n); }).slice(0, 2).map(function (n) { return n.cloneNode(true); });
    var ll = Array.isArray(anchor) ? anchor : null;
    return {
      key: key, selKey: key, kind: model.kind || (sel && sel.kind) || 'point', anchor: anchor, anchorLL: anchor,
      eyebrow: model.eyebrow, title: model.title, demo: !!(model.demo || (model.brief && model.brief.demo)),
      source: model.prov || '', chips: chips, numbers: b.numbers, note: b.note,
      actions: b.primary && b.primary.label ? [{ id: 'main', label: b.primary.label, run: b.primary.run, primary: true }] : [],
      links: gmapsLinks(model, sel, ll),
      detail: function () { if (MCD.app && isFn(MCD.app.openDrawer)) MCD.app.openDrawer(model, Object.assign({}, opts || {}, { explicit: true })); },
      onClose: function (reason) {
        var s = st() && st().selection;
        if ((reason === 'button' || reason === 'esc') && s && selKey(s) === key) MCD.state.set({ selection: null }, { history: 'none' });
      }
    };
  }

  /** Detach: the pinned drawer's item moves into a pin card of its own (live from cardFor, else its own nodes). */
  function detachPinned() {
    var c = DCARD, d = APPD;
    if (!c || !d || !c.pinned) return null;
    var geo = c.geo ? R(c.geo.x, c.geo.y, c.geo.w, c.geo.h) : rectOf(d.el);
    var mod = curMod(), m = null;
    if (mod && isFn(mod.cardFor) && c.sel) { try { m = mod.cardFor(c.sel); } catch (e) { m = null; } }
    /* a column holds two cards: when the pins fill this one, the new active card takes the other column */
    var pinSide = c.side, nextSide = c.side;
    if (c.side && caps().leftCol) {
      var inCol = visibleCards().filter(function (x) { return x !== c && x.side === c.side; }).length + 1;
      if (inCol >= 2) nextSide = c.side === 'right' ? 'left' : 'right';
    }
    c.side = nextSide;
    var pc = makePin({ model: m, live: !!m, sel: c.sel, kind: c.kind, title: c.title, side: pinSide, float: pinSide ? null : geo, order: c.order, z: c.z,
      nodes: m ? null : { title: kids(d.title), body: kids(d.body), prov: c.prov || '' } });
    void pinSide;
    c.pinned = false;
    c.order = ++ORDER;
    paintAllCards();
    return pc;
  }
  function curMod() { var a = MCD.app; var cur = a && isFn(a.current) ? a.current() : null; return cur && cur.mod ? cur.mod : (MCD.sections ? MCD.sections[section()] : null); }

  /**
   * Shell hook 2b: decorate(d, model, opts) after the shell filled the drawer. Desktop / tablet: the card head
   * (crumb, numbers, quick actions), folding sections, the Sumber footer, the dock side (away rule) and keepInView.
   * Phones: the brief with a sticky action row; the sections fold until "Semua detail".
   */
  function decorate(d, model, opts) {
    opts = opts || {};
    if (!d || !model) return;
    if (!DCARD) adoptDrawer(d);
    if (PHONE_CO && !opts.phone) { var pc = PHONE_CO; PHONE_CO = null; safe(pc.spec.onClose, null, ['replace']); }
    var c = DCARD, m = mode();
    var sel = (st() && st().selection) || null;
    var refresh = !!opts.refresh;
    var wasOpen = !!c.open && drawerOpen();
    c.title = model.title || '';
    c.kind = model.kind || (sel && sel.kind) || 'point';
    c.chipKind = c.kind === 'kec' || /kec/i.test(String(sel && sel.kind)) ? 'KEC.' : '';
    c.prov = model.prov || '';
    c.model = model;
    if (!refresh) { c.sel = sel; c.trail = !!(model.crumb || (sel && sel.extra && sel.extra.trail)); }
    d.el.setAttribute('aria-label', model.title || T.sheetAria);
    c.dirty = true;
    if (m === 'phone') {
      body().classList.remove('ws-on');
      phoneDecorate(d, model, opts);
      var pcr = crumbEl(model.crumb);                       /* the trail "‹ Makasar" above the title */
      if (pcr && d.title) d.title.insertBefore(pcr, d.title.firstChild);
      if (!opts.phone) footInto(d.foot, model, sel, c);
      c.open = true;
      return;
    }
    if (!active()) return;
    fillHead(d.title, model, c);
    if (model.blocks && model.blocks.length) { clear(d.body); blocksInto(d.body, model.blocks, model); }
    fold(d.body, c.kind, { listFirst: !!model.listFirst, blocks: model.blocks });
    hintsInto(d.body, model.hints);
    footInto(d.foot, model, sel, c);
    if (c.bar) {
      c.bar.eyebrow.textContent = model.eyebrow || '';
      c.bar.demo.hidden = !(model.demo || (model.brief && model.brief.demo));
    }
    d.el.classList.add('ws-win');
    if (!refresh) {
      var was = wasOpen && !c.min;
      if (c.min) { c.min = false; d.el.classList.remove('is-min'); d.el.removeAttribute('inert'); d.el.removeAttribute('aria-hidden'); }
      c.open = true;
      var fromCo = !!(FROM_CO && now() - FROM_CO < 2000);
      FROM_CO = 0;
      if (!was) {
        c.opener = DOC.activeElement && DOC.activeElement !== DOC.body && !d.el.contains(DOC.activeElement) ? DOC.activeElement : null;
        c.order = ++ORDER;
        c.side = sideFor(c, sel, model, fromCo);
        if (!c.side && !c.float) c.float = defaultFloat(c);
      }
      raise(c);
      paintAllCards();
      renderTray();
      var o = originOf(sel);
      var stillOpen = o === 'map' || !!opts.explicit || was || fromCo;
      /* placed once the shell has shown the drawer (its natural height is measured then), and again when late
         content (a list that renders a moment later, fonts) changed its height */
      afterOpen(c, function () { relayout(was ? 'swap' : 'open', { still: stillOpen, keep: true }); guideFold(true); });
      if (LAST_INPUT === 'key' && !was) focusTitle(c);
      if (!was) say(T.restored(c.title).replace('dibuka lagi', 'dibuka'));
    } else {
      c.open = true;
      afterOpen(c, function () { relayout('swap', { still: true }); });
    }
  }
  var AFTER = { seq: 0, t: [] };
  var FROM_CO = 0;   /* a card opened from a callout's main action or "Detail ›": the map stays (§4.2.2), the away rule applies */
  function afterOpen(c, fn) {
    var seq = ++AFTER.seq;
    AFTER.t.forEach(clearTimeout);
    AFTER.t = [];
    c.dirty = true;
    Promise.resolve().then(function () { if (seq === AFTER.seq && c.open) fn(); });
    [140, 480].forEach(function (ms) {
      AFTER.t.push(setTimeout(function () {
        if (seq !== AFTER.seq || !c.open || c.min || DRAG) return;
        var before = c.natH;
        c.dirty = true;
        if (Math.abs(natural(c) - (before || 0)) > 2) relayout('swap', { still: true });
      }, ms));
    });
  }
  /** The dock side of a new sheet: the remembered side, away from a map-picked selection (§3.3.2). */
  function sideFor(c, sel, model, fromCo) {
    var cp = caps(), sp = secPref();
    var pref0 = sp.side === 'left' && cp.leftCol ? 'left' : 'right';
    /* the preferred column is full (two cards): the other column */
    var g = model0WithSheet(pref0);
    if (cp.leftCol) {
      var inPref = visibleCards().filter(function (x) { return x !== c && x.side === pref0; }).length;
      if (inPref >= 2) return pref0 === 'right' ? 'left' : 'right';
    }
    if (!cp.leftCol || (originOf(sel) !== 'map' && !fromCo)) return pref0;
    var ll = (model && Array.isArray(model.anchor) ? model.anchor : null) || positionOf(sel);
    var p = ll ? project(ll) : null;
    var other = pref0 === 'right' ? 'left' : 'right';
    var go = model0WithSheet(other);
    return awaySide({ anchor: p, preferred: pref0, colRect: { left: g.left, right: g.right }, freeWidthIfOther: go.free.w, allowLeft: true });
  }
  function model0WithSheet(side) {
    var keep = DCARD.side, keepOpen = DCARD.open, keepMin = DCARD.min;
    DCARD.side = side; DCARD.open = true; DCARD.min = false;
    var g = model();
    DCARD.side = keep; DCARD.open = keepOpen; DCARD.min = keepMin;
    return g;
  }

  /** Shell hook 3: beforeClose(silent) → 'pinned' keeps a pinned sheet when the selection goes. Tutup / Esc end the trail. */
  function beforeClose(silent, o) {
    o = o || {};
    var c = DCARD;
    if (PHONE_CO) { var pc = PHONE_CO; PHONE_CO = null; safe(pc.spec.onClose, null, [silent ? 'replace' : 'button']); }
    if (!c) return undefined;
    if (silent && c.pinned && drawerOpen() && !o.force) return 'pinned';
    var endTrail = !silent && (c.trail || /kec/i.test(String(c.kind)));
    var wasOpen = c.open;
    c.open = false; c.min = false; c.pinned = false;
    c.el.classList.remove('is-min', 'is-pinned');
    c.el.removeAttribute('inert'); c.el.removeAttribute('aria-hidden');
    if (wasOpen) {
      renderTray();
      setTimeout(function () { if (!c.open) { relayout('close', { still: true }); guideFold(false); } }, 0);
    }
    if (endTrail && MCD.map && isFn(MCD.map.clearFocus)) {
      setTimeout(function () { safe(MCD.map.clearFocus, MCD.map, [{ reason: 'button' }]); }, 0);
    }
    c.trail = false;
    return undefined;
  }

  /* ---------------------------------------------------------- card content: head, folds, footer */

  function numbersEl(list, cls) {
    var nums = (list || []).slice(0, 3);
    if (!nums.length) return null;
    var longest = nums.reduce(function (m0, s) { return Math.max(m0, String(s.value).length); }, 0);
    /* as many columns as numbers (two numbers never leave a third of the row empty); values stay on one line */
    var dl = h('dl', { class: (cls || 'ws-nums') + (longest > 24 ? ' is-list' : ''), 'data-n': String(nums.length) });
    nums.forEach(function (s, i) {
      var val = String(s.value);
      var big = (s.big || i === 0) && /^[±~\s]*[\d.,]+\s*(%|rb|km|m)?$/.test(val.trim());
      /* a short value never breaks ("18,3 km"); a longer phrase may take two lines, but only at its "·" ("5,8 km ·" /
         "± 19 menit"): a number keeps its unit and "±" its number */
      var long = val.length > 12;
      var shown = val.replace(/([±~])\s+/g, '$1\u00a0').replace(/(\d)\s+(km|m|menit|siswa|%|rb|jt|M)\b/g, '$1\u00a0$2');
      dl.appendChild(h('div', { class: 'ws-num' + (big ? ' is-big' : '') + (long ? ' is-long' : '') + (s.tone ? ' is-' + s.tone : ''), title: s.title || ((s.label ? s.label + ': ' : '') + val) }, [
        h('dt', { class: 'ws-num__k', text: s.label || '' }),
        h('dd', { class: 'ws-num__v', text: shown })
      ]));
    });
    return dl;
  }
  /**
   * quickEl([{label, run, done}], {compact, noteHost}): the quick action of a card head ("+ Tindak lanjut"). Done, it
   * reads "✓ Di tindak lanjut", "Tersimpan di komputer ini · {tahap}" and "Ubah". compact (the phone's sticky row): one
   * line "✓ Di tindak lanjut · Ubah"; the note goes to noteEl (a line under the row) so the row never grows or moves.
   */
  function quickEl(list, o) {
    var q = (list || []).filter(Boolean)[0];
    if (!q) return null;
    o = o || {};
    var wrap = h('div', { class: 'ws-quick' + (o.compact ? ' is-compact' : '') });
    function paintDone(done) {
      clear(wrap);
      var label = (done && done.label) || T.quickDone;
      wrap.appendChild(h('span', { class: 'ws-quick__done' }, [icon('check'), h('span', { text: label.replace(/^✓\s*/, '') })]));
      var note = done && done.text ? h('span', { class: 'ws-quick__note', text: done.text }) : null;
      if (o.compact && o.noteEl) { o.noteEl.textContent = (done && done.text) || ''; o.noteEl.hidden = !(done && done.text); }
      else if (note) wrap.appendChild(note);
      if (done && isFn(done.edit)) {
        if (o.compact) wrap.appendChild(h('span', { class: 'ws-quick__sep', 'aria-hidden': 'true', text: '·' }));
        var ed = h('button', { type: 'button', class: 'ws-link', text: T.edit });
        ed.addEventListener('click', function () { safe(done.edit); });
        wrap.appendChild(ed);
      }
    }
    if (q.done) { paintDone(q.done); return wrap; }
    var b = h('button', { type: 'button', class: 'btn btn--secondary ws-quick__btn', title: q.title || null, disabled: q.disabled ? true : null }, [h('span', { text: q.label })]);
    var err = h('p', { class: 'ws-quick__err', role: 'status', hidden: true });
    b.addEventListener('click', function () {
      if (!isFn(q.run)) return;
      var res = safe(q.run) || {};
      if (res.ok === false) { err.textContent = res.text || ''; err.hidden = !res.text; return; }
      paintDone(res.done || q.doneAfter || { label: T.quickDone, text: res.text || '', edit: res.edit || (q.done && q.done.edit) || q.edit });
      if (res.text) say(res.text);
    });
    wrap.appendChild(b);
    wrap.appendChild(err);
    return wrap;
  }
  function crumbEl(crumb) {
    if (!crumb || !crumb.label) return null;
    var b = h('button', { type: 'button', class: 'ws-crumb', 'aria-label': T.crumb(crumb.label) }, [icon('chev-l'), h('span', { text: crumb.label })]);
    b.addEventListener('click', function () { safe(crumb.run); });
    return b;
  }
  /** The card head under the title: crumb above, numbers and the quick action below (once per fill). */
  function fillHead(titleEl, model, c) {
    if (!titleEl) return;
    kids(titleEl).forEach(function (n) { if (hasClass(n, 'ws-crumb') || hasClass(n, 'ws-nums') || hasClass(n, 'ws-quick')) titleEl.removeChild(n); });
    var h2 = titleEl.querySelector('.dd-title');
    if (h2) { if (!h2.id) h2.id = uid('ws-t'); h2.setAttribute('tabindex', '-1'); if (c && c.el) c.el.setAttribute('aria-labelledby', h2.id); }
    var cr = crumbEl(model.crumb);
    if (cr && c && c.bar) {
      /* the trail sits in the bar, in place of the eyebrow: "‹ Makasar" */
      kids(c.bar.el).forEach(function (n) { if (hasClass(n, 'ws-crumb')) c.bar.el.removeChild(n); });
      c.bar.el.insertBefore(cr, c.bar.eyebrow);
    } else if (cr) titleEl.insertBefore(cr, titleEl.firstChild);
    if (c && c.bar && !cr) kids(c.bar.el).forEach(function (n) { if (hasClass(n, 'ws-crumb')) c.bar.el.removeChild(n); });
    if (c && c.bar) c.bar.el.classList.toggle('has-crumb', !!cr);
    var nums = numbersEl(brief(model).numbers);
    var gm = titleEl.querySelector('.dd-gmaps');
    if (nums) titleEl.insertBefore(nums, gm || null);
    var q = quickEl(model.quick);
    if (q) titleEl.insertBefore(q, gm || null);
  }
  function blocksInto(bodyEl, blocks, model) {
    blocks.forEach(function (b, i) {
      if (!b) return;
      var sec = h('section', { class: 'dd-blk', 'data-fold': b.id || ('b' + i) }, [h('h3', { class: 't-eyebrow dd-blk__t', text: b.title || '' })]);
      if (b.preview) sec.setAttribute('data-preview', b.preview);
      if (typeof b.open === 'boolean') sec.setAttribute('data-open', b.open ? '1' : '0');
      (b.nodes || []).forEach(function (n) { if (n) sec.appendChild(n); });
      if (isFn(b.render)) safe(b.render, null, [sec]);
      bodyEl.appendChild(sec);
    });
    void model;
  }

  /**
   * fold(container, kind, {listFirst, allClosed}): every .dd-blk with a .dd-blk__t heading becomes a folding section
   * (a button inside the heading, aria-expanded / aria-controls; folded it shows a one-line preview). Open folds are
   * remembered per card kind; by default the first two are open.
   */
  function fold(container, kind, o) {
    if (!container) return;
    o = o || {};
    var P = pref(), i = 0;
    kids(container).forEach(function (blk) {
      if (!hasClass(blk, 'dd-blk') || blk.__wsFold) return;
      var t = null;
      kids(blk).forEach(function (ch) { if (!t && hasClass(ch, 'dd-blk__t')) t = ch; });
      if (!t) return;
      blk.__wsFold = true;
      var label = textOf(t);
      var id = uid('ws-fold');
      var bodyEl = h('div', { class: 'ws-fold__body', id: id });
      kids(blk).forEach(function (n) { if (n !== t) bodyEl.appendChild(n); });
      blk.appendChild(bodyEl);
      var preview = blk.getAttribute('data-preview') || previewOf(bodyEl);
      var pv = h('span', { class: 'ws-fold__pv', text: preview ? ' · ' + preview : '' });
      /* the heading's own nodes (a CONTOH tag) go into the button; buttons and links in it (a "?" tip) stay beside it */
      var tl = h('span', { class: 'ws-fold__t' }), keep = [];
      Array.prototype.slice.call(t.childNodes).forEach(function (n) {
        if (n.nodeType === 1 && (n.matches ? n.matches('button, a, input, select') : /^(BUTTON|A|INPUT|SELECT)$/.test(n.tagName))) keep.push(n);
        else tl.appendChild(n);
      });
      if (!tl.firstChild) tl.textContent = label;
      var btn = h('button', { type: 'button', class: 'ws-fold__btn', 'aria-expanded': 'true', 'aria-controls': id }, [tl, pv, icon('chev-d', 'ws-fold__chev')]);
      clear(t);
      t.appendChild(btn);
      keep.forEach(function (n) { t.appendChild(n); });
      if (keep.length) t.classList.add('has-tools');
      blk.classList.add('ws-fold');
      var key = (kind || 'x') + '|' + (blk.getAttribute('data-fold') || ('i' + i));
      blk.setAttribute('data-fold-key', key);
      var explicit = blk.getAttribute('data-open');
      var open;
      if (o.allClosed) open = false;
      else if (o.listFirst && explicit != null) open = explicit === '1';
      else if (P.folds[key] != null) open = !!P.folds[key];
      else if (explicit != null) open = explicit === '1';
      else open = i < 2;
      setFold(blk, btn, bodyEl, open);
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-expanded') !== 'true';
        setFold(blk, btn, bodyEl, on);
        pref().folds[key] = on;             /* the preferences now (a reset since the fold was built made a new record) */
        save();
        if (mode() === 'phone') PH.keys[key] = on;
        checkHintsSoon();
        var c = blk.closest ? CARDS.filter(function (x) { return x.el && x.el.contains(blk); })[0] : null;
        if (c) { c.dirty = true; relayout('swap', { still: true }); }
      });
      i++;
    });
  }
  function previewOf(bodyEl) {
    var v = bodyEl.querySelector('.dd-kv__v') || bodyEl.querySelector('.dd-mono') || bodyEl.querySelector('p');
    var t = textOf(v);
    return t.length > 40 ? t.slice(0, 38) + '…' : t;
  }
  function setFold(blk, btn, bodyEl, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    bodyEl.hidden = !open;
    blk.classList.toggle('is-folded', !open);
  }
  function unfoldFirst(container, n) {
    var k = 0;
    kids(container).forEach(function (blk) {
      if (!hasClass(blk, 'ws-fold') || k >= n) return;
      var btn = blk.querySelector('.ws-fold__btn'), bodyEl = blk.querySelector('.ws-fold__body');
      if (btn && bodyEl) setFold(blk, btn, bodyEl, true);
      k++;
    });
  }
  /**
   * hint(id, node) → node until this browser has actually shown it, then null (it lives in Sumber › Catatan after).
   * A hint counts as seen only once its node is on screen: connected, in an open card or callout, not in a folded
   * section, a minimised card or the drawer while it peeks (a model built for a callout or a pin uses up nothing).
   */
  function hint(id, node) {
    if (!id) return node || null;
    var P = pref();
    if (P.hints[id]) { SEEN[id] = node ? textOf(node) : (SEEN[id] || ''); return null; }
    if (node) { PENDING[id] = node; SEEN[id] = textOf(node); checkHintsSoon(); }
    return node || null;
  }
  var SEEN = {}, PENDING = {}, hintT = 0;
  function onScreen(n) {
    if (!n || !n.isConnected) return false;
    for (var e = n; e && e.nodeType === 1; e = e.parentNode) {
      if (e.hidden || (isFn(e.hasAttribute) && e.hasAttribute('inert'))) return false;
      if (hasClass(e, 'is-min') || hasClass(e, 'is-held') || hasClass(e, 'is-out') || hasClass(e, 'is-leaving')) return false;
      if (hasClass(e, 'drawer') && !hasClass(e, 'is-open')) return false;
    }
    return true;
  }
  /** Hints handed out and now on screen are seen (once per browser). */
  function checkHints() {
    var ids = Object.keys(PENDING);
    if (!ids.length) return;
    var P = pref(), changed = false;
    ids.forEach(function (id) {
      var n = PENDING[id];
      if (P.hints[id]) { delete PENDING[id]; return; }
      if (onScreen(n)) { P.hints[id] = 1; SEEN[id] = textOf(n); delete PENDING[id]; changed = true; }
    });
    if (changed) save();
  }
  function checkHintsSoon() { if (!Object.keys(PENDING).length) return; clearTimeout(hintT); hintT = setTimeout(checkHints, 600); }
  function hintsInto(bodyEl, list) {
    (list || []).forEach(function (x) {
      if (!x || !x.node) return;
      var n = hint(x.id, x.node);
      if (n && !n.parentNode) bodyEl.insertBefore(h('div', { class: 'ws-hint' }, [n]), bodyEl.firstChild);
    });
  }
  /** One "ⓘ Sumber" per card: the source line and the hints already seen open on demand. */
  function sourceButton(text, notes) {
    var id = uid('ws-src');
    var lines = h('div', { class: 'ws-src__text', id: id, hidden: true }, [text ? h('p', { text: text }) : null]);
    var n = (notes || []).filter(Boolean);
    if (n.length) {
      lines.appendChild(h('p', { class: 'ws-src__h t-eyebrow', text: T.notes }));
      lines.appendChild(h('ul', { class: 'ws-src__notes' }, n.map(function (x) { return h('li', { text: x }); })));
    }
    var b = h('button', { type: 'button', class: 'ws-src__btn', 'aria-expanded': 'false', 'aria-controls': id }, [icon('info'), h('span', { text: T.source })]);
    b.addEventListener('click', function () {
      var open = lines.hidden;
      lines.hidden = !open;
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      var c = CARDS.filter(function (x) { return x.el && x.el.contains(b); })[0];
      if (c) { c.dirty = true; relayout('swap', { still: true }); }
    });
    return h('div', { class: 'ws-src' }, [b, lines]);
  }
  function seenNotes(model) {
    return (model.hints || []).filter(function (x) { return x && pref().hints[x.id] && SEEN[x.id] && !(x.node && x.node.isConnected); }).map(function (x) { return SEEN[x.id]; });
  }
  /** The sticky footer: the Google links in words, then ⓘ Sumber. */
  function footInto(foot, model, sel, c) {
    if (!foot) return;
    var ll = model.anchor && Array.isArray(model.anchor) ? model.anchor : null;
    var links = gmapsLinks(model, sel, ll);
    var body0 = c && c.el ? c.el.querySelector('.drawer__body') : null;
    /* sections that already put "Rute di Google Maps" in the body: it moves into the footer row (one link, not two) */
    var moved = body0 ? Array.prototype.slice.call(body0.querySelectorAll('a')).filter(function (a) {
      return hasClass(a, 'gmaps-link--route') || textOf(a) === T.route;
    }) : [];
    var gm = c && c.el ? c.el.querySelector('.drawer__titles .dd-gmaps') : null;
    if (gm) gm.hidden = true;
    clear(foot);
    foot.classList.add('ws-foot');
    var acts = h('div', { class: 'ws-foot__acts' });
    foot.appendChild(acts);
    links.forEach(function (l) {
      if (l.label === T.route && moved.length) return;
      acts.appendChild(h('a', { class: 'btn btn--secondary ws-link-btn', href: l.href, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', title: l.title || null }, [icon('external'), h('span', { text: l.label })]));
    });
    moved.forEach(function (a, i) { if (i === 0 && !veiled()) { a.className = 'btn btn--secondary ws-link-btn gmaps-link gmaps-link--route'; acts.appendChild(a); } else if (a.parentNode) a.parentNode.removeChild(a); });
    var prov = model.prov || '';
    if (prov || seenNotes(model).length) acts.appendChild(sourceButton(prov, seenNotes(model)));
    foot.hidden = !acts.firstChild;
  }

  /* ---------------------------------------------------------- phones: the brief and the sticky action row */

  var PHONE_CO = null;
  /* the phone sheet's folds staff opened (and "Semua detail"): a refresh of the same item keeps them */
  var PH = { sel: '', keys: {}, all: false };
  function phoneDecorate(d, model, opts) {
    var bodyEl = d.body;
    kids(bodyEl).forEach(function (n) { if (hasClass(n, 'ws-brief') || hasClass(n, 'ws-sticky') || hasClass(n, 'ws-sticky__note')) bodyEl.removeChild(n); });
    /* a refresh (data, Jam sibuk, Motor, privacy, the territory sheet's update) rebuilds the brief and the sticky row
       like a first open; only the "everything folded" default is skipped for the folds staff opened */
    var who = selKey(st() && st().selection) || String(model.title || '');
    if (!opts.refresh || PH.sel !== who) PH = { sel: who, keys: {}, all: false };
    var b = brief(model);
    var q = (model.quick || []).filter(Boolean)[0];
    var primary = b.primary;
    var actRow = h('div', { class: 'ws-sticky' });
    /* "Tersimpan di komputer ini · {tahap}" after "+ Tindak lanjut": a line under the row, so the row stays put */
    var stageNote = h('p', { class: 'ws-quick__note ws-sticky__note', hidden: true });
    if (primary && primary.label) {
      var pb = h('button', { type: 'button', class: 'btn btn--primary btn--lg ws-sticky__main' }, [h('span', { text: primary.label })]);
      pb.addEventListener('click', function () { safe(primary.run); });
      actRow.appendChild(pb);
    } else if (q) {
      var qe = quickEl([q], { compact: true, noteEl: stageNote });
      if (qe) actRow.appendChild(qe);
    }
    var hasMore = kids(bodyEl).some(function (n) { return hasClass(n, 'dd-blk'); }) || (opts.phone && PHONE_DETAIL);
    var more = null;
    if (hasMore) {
      more = h('button', { type: 'button', class: 'btn btn--secondary btn--lg ws-sticky__more' }, [h('span', { text: T.allDetail }), icon('chev-u')]);
      more.addEventListener('click', function () {
        if (opts.phone && PHONE_DETAIL) { var fn = PHONE_DETAIL; PHONE_DETAIL = null; safe(fn); return; }
        if (!hasClass(d.el, 'is-expanded') && d.grab) d.grab.click();
        unfoldFirst(bodyEl, 3);
        more.hidden = true;
        PH.all = true;
        checkHintsSoon();
      });
      actRow.appendChild(more);
    }
    /* a list-first card (the SMA of a kecamatan): the list itself is the brief, so row 1 shows in the peek */
    var nums = model.listFirst ? null : numbersEl(b.numbers, 'ws-nums ws-brief__nums');
    if (model.blocks && model.blocks.length && !opts.phone) { clear(bodyEl); blocksInto(bodyEl, model.blocks, model); }
    if (model.listFirst && !(primary && primary.label) && !q) actRow = h('div', { class: 'ws-sticky' });
    /* the row is a direct child of the scrolling body (sticky top and bottom), right under the brief */
    if (actRow.firstChild) { bodyEl.insertBefore(stageNote, bodyEl.firstChild); bodyEl.insertBefore(actRow, stageNote); }
    if (nums) bodyEl.insertBefore(h('section', { class: 'ws-brief' }, [nums]), bodyEl.firstChild);
    /* the peek shows the brief; a list-first card (a kecamatan's SMA) shows its list open, the rest folds */
    if (model.listFirst) {
      fold(bodyEl, model.kind || 'point', { listFirst: true });
      var firstFold = kids(bodyEl).filter(function (n) { return hasClass(n, 'ws-fold'); })[0];
      if (firstFold && firstFold.getAttribute('data-open') == null) unfoldFirst(bodyEl, 1);
    } else fold(bodyEl, model.kind || 'point', { allClosed: true });
    /* the same item refreshed: the folds staff opened (or "Semua detail") stay open */
    if (PH.all) { unfoldFirst(bodyEl, 3); if (more) more.hidden = true; }
    kids(bodyEl).forEach(function (blk) {
      var k = blk.getAttribute && blk.getAttribute('data-fold-key');
      if (!k || PH.keys[k] == null) return;
      var btn = blk.querySelector('.ws-fold__btn'), fb = blk.querySelector('.ws-fold__body');
      if (btn && fb) setFold(blk, btn, fb, !!PH.keys[k]);
    });
    checkHintsSoon();
  }
  var PHONE_DETAIL = null;

  /* ======================================================================= CALLOUT */

  /**
   * callout(spec) → {el, update(partial), close(reason), isOpen()} (§7.2.1). Phones: the app's bottom sheet with the
   * same brief (MCD.app.openDrawer(briefModel, {phone: true})).
   */
  function callout(spec) {
    spec = spec || {};
    if (mode() === 'phone') return phoneCallout(spec);
    closeCallout('replace');
    if (!active()) return { el: null, update: function () {}, close: function () {}, isOpen: function () { return false; } };
    var titleId = uid('ws-co-t');
    var el = h('div', { class: 'ws-co panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': titleId, tabindex: '-1', 'data-map-occluder': '' });
    var tail = h('span', { class: 'ws-co__tail', 'aria-hidden': 'true' });
    var c = { el: el, spec: spec, tail: tail, titleId: titleId, selKey: spec.selKey || '', anchorLL: spec.anchor, side: null, box: null, fromModel: !!spec.fromModel, sized: false,
      openedAt: now(), held: false, shownOnce: false, selfMove: 0 };
    CO = c;
    paintCallout(c);
    el.appendChild(tail);
    overlayRoot().appendChild(el);
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCallout('esc'); } });
    var m = mapObj();
    /* a camera move the app starts itself right after the callout opens (no pointer down, not our own nudge). The
       kecamatan focus fit starts about 60 ms after a real click, when the callout may already be on its way in. */
    function appFlight() { return !POINTER_DOWN && now() - c.openedAt < 400 && !(c.selfMove && now() - c.selfMove < 400); }
    if (m && isFn(m.on)) {
      c.onMove = function () {
        if (appFlight() && (!c.held || !c.longHold)) holdCallout(c);
        if (c.rf) return;
        c.rf = raf(function () { c.rf = 0; if (CO === c) placeCallout(false); });
      };
      c.onEnd = function () { if (c.held && CO === c) releaseCallout(c); };
      try { m.on('move', c.onMove); m.on('moveend', c.onEnd); } catch (e) { c.onMove = null; }
    }
    if (mapBusy() && appFlight()) holdCallout(c);
    /* a kecamatan (shape anchor): its focus fit follows the click by a frame or two, so the callout waits a moment
       (≤ 160 ms) and stays held for the whole flight when one starts; it never shows on one side and jumps to the
       other when the camera lands (final integration: the real map click, not only openBound) */
    else if (spec.anchor && spec.anchor.bbox) holdCallout(c, 160);
    c.handle = {
      el: el,
      update: function (s) { if (CO !== c) return; c.spec = Object.assign({}, c.spec, s || {}); paintCallout(c); c.sized = false; placeCallout(true); },
      close: function (r) { if (CO === c) closeCallout(r || 'api'); },
      isOpen: function () { return CO === c; }
    };
    placeCallout(true);
    if (reduced()) { el.classList.add('is-in'); c.shownOnce = true; }
    else raf(function () { raf(function () { if (CO === c && !c.held) { el.classList.add('is-in'); c.shownOnce = true; } }); });
    if (LAST_INPUT === 'key' || spec.focus === true) setTimeout(function () { if (CO === c) { var t = DOC.getElementById(titleId); try { (t || el).focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }, 30);
    say(calloutLine(spec));
    checkHintsSoon();
    return c.handle;
  }
  function calloutLine(spec) {
    var nums = (spec.numbers || []).map(function (s) { return (s.label || '') + ' ' + s.value; }).join(', ');
    return (spec.eyebrow ? spec.eyebrow + ': ' : '') + (spec.title || '') + '. ' + (nums ? nums + '. ' : '') + (spec.detail ? T.calloutMore : '');
  }
  function paintCallout(c) {
    var el = c.el, spec = c.spec;
    kids(el).forEach(function (n) { if (n !== c.tail) el.removeChild(n); });
    var srcP = spec.source ? h('p', { class: 'ws-co__srcline', hidden: true, text: spec.source }) : null;
    var srcB = null;
    if (srcP) {
      srcB = h('button', { type: 'button', class: 'ws-co__icon', 'aria-label': T.sourceOf(spec.title || ''), title: T.source, 'aria-expanded': 'false' }, [icon('info')]);
      srcB.addEventListener('click', function () { srcP.hidden = !srcP.hidden; srcB.setAttribute('aria-expanded', srcP.hidden ? 'false' : 'true'); c.sized = false; placeCallout(true); });
    }
    var x = h('button', { type: 'button', class: 'ws-co__icon ws-co__x', 'aria-label': T.close, title: T.closeTip }, [icon('close')]);
    x.addEventListener('click', function () { closeCallout('button'); });
    /* the head: the eyebrow (with its kota) beside ⓘ and ×; CONTOH leads the chips row so the eyebrow keeps its room */
    var head = h('div', { class: 'ws-co__head' }, [
      h('span', { class: 'ws-co__eyebrow t-eyebrow', text: spec.eyebrow || '' }),
      srcB, x
    ]);
    var title = h('p', { class: 'ws-co__title', id: c.titleId, text: spec.title || '—' });
    var chips = (spec.chips || []).filter(Boolean).slice(0, 2).map(function (ch) {
      if (ch && ch.nodeType) return ch;
      return h('span', { class: 'tag ws-chiptag' + (ch.tone ? ' is-' + ch.tone : ''), text: ch.text || '' });
    });
    if (spec.demo) chips.unshift(h('span', { class: 'ws-demo', text: 'CONTOH' }));
    var chipRow = chips.length ? h('div', { class: 'ws-co__chips' }, chips) : null;
    var nums = numbersEl(spec.numbers, 'ws-nums ws-co__nums');
    var note = null;
    if (spec.note && spec.note.text) {
      var nn = h('p', { class: 'ws-co__note' }, [h('span', { class: 'ws-co__dot is-' + (spec.note.tone || 'none'), 'aria-hidden': 'true' }), h('span', { text: spec.note.text })]);
      note = spec.note.hintId ? hint(spec.note.hintId, nn) : nn;
    }
    var acts = h('div', { class: 'ws-co__acts' });
    var main = (spec.actions || []).filter(function (a) { return a && a.label; })[0];
    if (main) {
      var mb = h('button', { type: 'button', class: 'btn btn--primary ws-co__main' }, [h('span', { text: main.label })]);
      mb.addEventListener('click', function () { var fn = main.run; FROM_CO = now(); closeCallout('action'); safe(fn); });
      acts.appendChild(mb);
    }
    if (isFn(spec.detail)) {
      var db = h('button', { type: 'button', class: 'btn ' + (main ? 'btn--secondary' : 'btn--primary') + ' ws-co__detail', 'aria-label': T.detail + ' ' + (spec.title || '') }, [h('span', { text: T.detail }), icon('chev-r')]);
      db.addEventListener('click', function () { var fn = spec.detail; FROM_CO = now(); closeCallout('detail'); safe(fn); });
      acts.appendChild(db);
    }
    var links = veiled() ? [] : (spec.links || []);
    var linkRow = links.length ? h('div', { class: 'ws-co__links' }, links.map(function (l) {
      return h('a', { class: 'ws-co__link', href: l.href, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', title: l.title || null }, [icon('external'), h('span', { text: l.label })]);
    })) : null;
    [head, title, chipRow, nums, note, acts.firstChild ? acts : null, linkRow, srcP].forEach(function (n) { if (n) el.insertBefore(n, c.tail.parentNode === el ? c.tail : null); });
  }
  /** The anchor on screen: {x, y} for a point, {bbox, label} for a shape, or null. */
  function anchorScreen(a) {
    if (!a) return null;
    if (a.nodeType === 1) { var r = rectOf(a); return r ? { rect: r } : null; }
    if (Array.isArray(a)) { var p = project(a); return p; }
    if (a.bbox) {
      var b0 = project(a.bbox[0]), b1 = project(a.bbox[1]);
      if (!b0 || !b1) return null;
      var lab = a.label ? project(a.label) : null;
      return { bbox: { x0: Math.min(b0.x, b1.x), y0: Math.min(b0.y, b1.y), x1: Math.max(b0.x, b1.x), y1: Math.max(b0.y, b1.y) }, label: lab };
    }
    if (isNum(a.x) && isNum(a.y)) return { x: a.x, y: a.y };
    return null;
  }
  function project(ll) {
    var m = mapObj();
    if (!m || !isFn(m.project) || !ll) return null;
    try {
      var q = m.project(ll), r = m.getContainer ? m.getContainer().getBoundingClientRect() : { left: 0, top: 0 };
      return isNum(q.x) && isNum(q.y) ? { x: r.left + q.x, y: r.top + q.y } : null;
    } catch (e) { return null; }
  }
  var OBST = { key: '', list: [] };
  /** Floating cards and the fixed furniture (cached per layout change), plus the moving furniture (the route chip that
      follows the map, the legend that opens upward), measured every placement. */
  function obstacles(force) {
    var key = layoutSig();
    if (force || OBST.key !== key) {
      OBST = { key: key, list: visibleCards().filter(function (c) { return !c.side && c.geo; }).map(function (c) { return c.geo; }).concat(furnitureRects('fixed')) };
    }
    return OBST.list.concat(furnitureRects('moving'));
  }
  function layoutSig() { return [W.innerWidth, W.innerHeight, AD ? AD.rail + AD.drawer : '', CARDS.map(function (c) { return c.id + (c.open ? 1 : 0) + (c.min ? 1 : 0) + (c.side || 'f') + (c.geo ? Math.round(c.geo.x) + ',' + Math.round(c.geo.y) : ''); }).join('|')].join(';'); }
  function routeSamples() {
    var M = MCD.map;
    try { if (M && isFn(M.routeScreen)) return M.routeScreen(64) || null; } catch (e) { /* none */ }
    return null;
  }
  /** Place the callout (§3.2): a point beside the anchor, never on it, the panels, the furniture or the route tail. */
  var PLACE_MS = [];
  function placeCallout(force) {
    var t0 = now();
    placeCallout1(force);
    PLACE_MS.push(now() - t0);
    if (PLACE_MS.length > 600) PLACE_MS.shift();
  }
  function placeCallout1(force) {
    var c = CO;
    if (!c || mode() === 'phone') return;
    var el = c.el;
    if (!c.sized || force) { c.size = { w: el.offsetWidth || CO_W, h: el.offsetHeight || CO_MAX_H }; c.sized = true; }
    if (c.held) return;                 /* the app's own camera flight is landing: placed once, on its final side */
    var g = model();
    var F = insetR(g.free, CO_FREE_IN);
    var a = anchorScreen(c.spec.anchor);
    if (!a) { setOut(c, true); showEdge(null); return; }
    var ax = a.x != null ? a.x : (a.label ? a.label.x : (a.bbox ? (a.bbox.x0 + a.bbox.x1) / 2 : (a.rect ? a.rect.x + a.rect.w / 2 : 0)));
    var ay = a.y != null ? a.y : (a.label ? a.label.y : (a.bbox ? (a.bbox.y0 + a.bbox.y1) / 2 : (a.rect ? a.rect.y + a.rect.h / 2 : 0)));
    /* our own nudge is easing the map: the callout rides along with its anchor (placed for where the pan ends) */
    if (c.ride && now() < c.ride.until && c.box && !force) {
      c.box = R(c.box.x + ax - c.ride.ax, c.box.y + ay - c.ride.ay, c.size.w, c.size.h);
      c.ride.ax = ax; c.ride.ay = ay;
      el.style.transform = 'translate(' + Math.round(c.box.x) + 'px,' + Math.round(c.box.y) + 'px)';
      paintTail(c, el.getAttribute('data-side') || c.side, ax, ay, c.box);
      return;
    }
    c.ride = null;
    var res = placeBox({ anchor: a, size: c.size, free: F, obstacles: obstacles(force), route: c.selKey && routeKeyMatch(c) ? routeSamples() : null, prev: c.side, noNudge: mapBusy() });
    if (res.outside) {
      setOut(c, true);
      c.box = null;
      showEdge(a, F);
      return;
    }
    showEdge(null);
    setOut(c, false);
    var bx = res.x, by = res.y;
    if (res.nudge) {
      /* the box is placed for where the pan ends; until then it starts beside the anchor and rides with it */
      var M = MCD.map, dx = res.nudge.dx, dy = res.nudge.dy;
      c.selfMove = now();
      var ok0 = false;
      if (M && isFn(M.nudge)) ok0 = safe(M.nudge, M, [-dx, -dy, { ms: 300 }]) !== false;
      else { var m = mapObj(); if (m && isFn(m.panBy)) { safe(m.panBy, m, [[-dx, -dy], { duration: reduced() ? 0 : 300 }]); ok0 = true; } }
      if (ok0 && !reduced()) { bx = res.x - dx; by = res.y - dy; c.ride = { until: now() + 420, ax: ax, ay: ay }; }
    }
    var side = res.parked ? (res.parkNear ? res.parkSide : 'parked') : res.side;
    var flipSide = c.side && res.side !== c.side && !reduced() && c.shownOnce;
    c.side = res.side;
    c.box = R(bx, by, c.size.w, c.size.h);
    el.style.transform = 'translate(' + Math.round(bx) + 'px,' + Math.round(by) + 'px)';
    el.setAttribute('data-side', side);
    paintTail(c, side, ax, ay, c.box);
    if (flipSide && isFn(el.animate)) { try { el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 120, easing: ease('out') }); } catch (e) { /* static */ } }
  }
  function paintTail(c, side, ax, ay, box) {
    var horiz = /left|right/.test(side) && !/top|bottom/.test(side);
    c.tail.hidden = side === 'parked' || /-/.test(side || '');
    if (horiz) { c.tail.style.top = Math.round(clamp(ay - box.y, 14, c.size.h - 14)) + 'px'; c.tail.style.left = ''; }
    else { c.tail.style.left = Math.round(clamp(ax - box.x, 14, c.size.w - 14)) + 'px'; c.tail.style.top = ''; }
  }
  /** A callout whose anchor left the free map fades out and leaves the Tab order (the edge chip stands in for it). */
  function setOut(c, on) {
    if (c.el.classList.contains('is-out') === !!on) return;
    c.el.classList.toggle('is-out', !!on);
    if (on) c.el.setAttribute('inert', ''); else c.el.removeAttribute('inert');
  }
  /**
   * The camera the app flies itself right after a callout opens (a kecamatan's focus fit): the callout waits at
   * opacity 0 and is placed once the camera lands (≤ 1,2 s), so it never jumps across the shape mid-flight.
   */
  function holdCallout(c, ms) {
    if (reduced()) return;
    if (c.held) {
      /* a short wait (a shape's callout) turns into the flight's hold once the camera moves */
      if (!ms && !c.longHold) { c.longHold = true; clearTimeout(c.holdT); c.holdT = setTimeout(function () { releaseCallout(c); }, 1200); }
      return;
    }
    if (c.shownOnce && now() - c.openedAt >= 400) return;
    c.held = true;
    c.longHold = !ms;
    c.el.classList.remove('is-in');
    c.el.classList.add('is-held');
    clearTimeout(c.holdT);
    c.holdT = setTimeout(function () { releaseCallout(c); }, ms || 1200);
  }
  function releaseCallout(c) {
    if (!c.held) return;
    c.held = false;
    clearTimeout(c.holdT);
    c.el.classList.remove('is-held');
    if (CO !== c) return;
    c.sized = false;
    placeCallout(true);
    raf(function () { if (CO === c) { c.el.classList.add('is-in'); c.shownOnce = true; checkHintsSoon(); } });
  }
  function routeKeyMatch(c) {
    var M = MCD.map;
    try { var rs = M && isFn(M.routeState) ? M.routeState() : null; return !!(rs && rs.key && rs.key === c.selKey && rs.line); } catch (e) { return false; }
  }
  var POINTER_DOWN = false;
  function mapBusy() {
    if (POINTER_DOWN) return true;
    var m = mapObj();
    try { return !!(m && isFn(m.isMoving) && m.isMoving()); } catch (e) { return false; }
  }
  /** The edge chip "‹ Makasar" when the anchor left the free map; a click eases it back to the centre. */
  function showEdge(a, F) {
    if (!a || !CO) { if (EDGE) EDGE.hidden = true; return; }
    if (!EDGE || !EDGE.isConnected) {
      EDGE = h('button', { type: 'button', class: 'ws-edge', 'data-map-occluder': '' }, [icon('chev-l', 'ws-edge__arrow'), h('span', { class: 'ws-edge__t' })]);
      EDGE.addEventListener('click', function () {
        var c = CO; if (!c) return;
        var p = anchorScreen(c.spec.anchor), g = model();
        if (!p) return;
        var px = p.x != null ? p.x : (p.label ? p.label.x : (p.bbox.x0 + p.bbox.x1) / 2), py = p.y != null ? p.y : (p.label ? p.label.y : (p.bbox.y0 + p.bbox.y1) / 2);
        var dx = g.free.x + g.free.w / 2 - px, dy = g.free.y + g.free.h / 2 - py;
        var M = MCD.map;
        if (M && isFn(M.nudge)) safe(M.nudge, M, [-dx, -dy, { ms: 300 }]);
        else { var m = mapObj(); if (m && isFn(m.panBy)) safe(m.panBy, m, [[-dx, -dy], { duration: reduced() ? 0 : 300 }]); }
      });
      overlayRoot().appendChild(EDGE);
    }
    var name = CO.spec.title || '';
    EDGE.querySelector('.ws-edge__t').textContent = name;
    EDGE.setAttribute('aria-label', T.edge(name));
    EDGE.title = T.edge(name);
    var p0 = a.x != null ? a : (a.label || { x: (a.bbox.x0 + a.bbox.x1) / 2, y: (a.bbox.y0 + a.bbox.y1) / 2 });
    EDGE.hidden = false;
    var size = { w: EDGE.offsetWidth || 140, h: EDGE.offsetHeight || 32 };
    var pos = edgeChip(p0, F, size);
    EDGE.style.transform = 'translate(' + Math.round(pos.x) + 'px,' + Math.round(pos.y) + 'px)';
    EDGE.setAttribute('data-edge', pos.edge);
  }
  function closeCallout(reason, o) {
    var c = CO;
    if (!c) return false;
    o = o || {};
    CO = null;
    var m = mapObj();
    if (m && c.onMove && isFn(m.off)) { try { m.off('move', c.onMove); m.off('moveend', c.onEnd); } catch (e) { /* ignore */ } }
    caf(c.rf);
    clearTimeout(c.holdT);
    showEdge(null);
    var el = c.el;
    el.classList.remove('is-in');
    el.classList.add('is-leaving');
    el.setAttribute('inert', '');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduced() ? 0 : dur('fast') + 30);
    if (isFn(c.spec.onClose) && !o.silent) safe(c.spec.onClose, null, [reason]);
    if (reason === 'esc' || reason === 'button') { var mp = DOC.getElementById('map'); if (mp && el.contains(DOC.activeElement)) { try { mp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } }
    return true;
  }
  /** Phones: the callout is the app's bottom sheet with the brief; "Semua detail" runs spec.detail. */
  function phoneCallout(spec) {
    var A = MCD.app;
    if (!A || !isFn(A.openDrawer)) return { el: null, update: function () {}, close: function () {}, isOpen: function () { return false; } };
    var main = (spec.actions || []).filter(function (a) { return a && a.label; })[0];
    function modelOf(s) {
      return {
        eyebrow: s.eyebrow, title: s.title, kind: s.kind || 'kec', demo: s.demo,
        sub: (s.chips || []).filter(Boolean).slice(0, 2).map(function (ch) { return ch.nodeType ? ch : h('span', { class: 'tag', text: ch.text || '' }); }),
        body: [], prov: s.source || '',
        brief: { numbers: s.numbers || [], primary: main ? { label: main.label, run: function () { var fn = main.run; closeIt('action'); safe(fn); } } : null, note: s.note || null }
      };
    }
    var handle = null;
    function closeIt(reason) { if (PHONE_CO && PHONE_CO.handle === handle) { var pc = PHONE_CO; PHONE_CO = null; if (A.closeDrawer) A.closeDrawer(true); safe(pc.spec.onClose, null, [reason || 'api']); } }
    handle = {
      el: null,
      update: function (s) { if (PHONE_CO && PHONE_CO.handle === handle) { spec = Object.assign({}, spec, s || {}); PHONE_CO.spec = spec; A.openDrawer(modelOf(spec), { refresh: true, phone: true }); } },
      close: function (r) { closeIt(r); },
      isOpen: function () { return !!(PHONE_CO && PHONE_CO.handle === handle); }
    };
    PHONE_DETAIL = isFn(spec.detail) ? function () { var fn = spec.detail; if (PHONE_CO && PHONE_CO.handle === handle) { var pc = PHONE_CO; PHONE_CO = null; safe(pc.spec.onClose, null, ['detail']); } safe(fn); } : null;
    if (PHONE_CO) { var old = PHONE_CO; PHONE_CO = null; safe(old.spec.onClose, null, ['replace']); }
    A.openDrawer(modelOf(spec), { phone: true });
    PHONE_CO = { spec: spec, handle: handle };
    handle.el = APPD ? APPD.el : null;
    return handle;
  }

  /* ======================================================================= KEEP IN VIEW */

  /** The map's targets (selection, route end and tail, route chip, focused kecamatan) in client px. */
  function targets() {
    var M = MCD.map, out = [];
    try { if (M && isFn(M.keepTargets)) out = (M.keepTargets() || []).filter(function (t) { return t && t.rect; }); }
    catch (e) { out = []; }
    if (!out.length) {
      var s = st() && st().selection;
      var p = s ? project(positionOf(s)) : null;
      if (p) out.push({ id: 'sel', rect: R(p.x - KEEP_R, p.y - KEEP_R, 2 * KEEP_R, 2 * KEEP_R) });
    }
    return out;
  }
  var kivT = 0;
  function keepInViewSoon() { clearTimeout(kivT); kivT = setTimeout(function () { keepInView(); }, reduced() ? 20 : 60); }
  /** keepInView(targets?): ease the camera by the smallest offset that clears every target (≤ 50 % of the free area). */
  function keepInView(tg) {
    if (!active() || SUSPENDED || mapBusy()) return false;
    var list = Array.isArray(tg) ? tg : targets();
    if (!list.length) return false;
    var g = model();
    var blockers = visibleCards().filter(function (c) { return c.geo && !c.side; }).map(function (c) { return c.geo; });
    /* the callout places itself off the point, the route end and the line's last stretch (exact, not the tail's box):
       it is not a blocker here, so the camera never chases its own callout */
    if (TRAY && !TRAY.hidden) { var tr = rectOf(TRAY); if (tr) blockers.push(tr); }
    var off = keepPlan({ targets: list, blockers: blockers, free: insetR(g.free, 8), maxFrac: 0.5 });
    if (!off) return false;
    var M = MCD.map;
    if (M && isFn(M.nudge)) safe(M.nudge, M, [-off.dx, -off.dy, { ms: 300 }]);
    else {
      var m = mapObj();
      if (m && isFn(m.panBy)) safe(m.panBy, m, [[-off.dx, -off.dy], { duration: reduced() ? 0 : 300, easing: MCD.motion && MCD.motion.easing ? MCD.motion.easing.out : undefined }]);
    }
    return true;
  }

  /* ======================================================================= PINS (own cards) */

  /** A pin card of its own: built from a section model (live) or the drawer's own nodes (a static snapshot). */
  function makePin(o) {
    var id = !cardById('pin-1') ? 'pin-1' : (!cardById('pin-2') ? 'pin-2' : uid('pin'));
    var el = h('section', { class: 'ws-win ws-pin panel', role: 'dialog', 'aria-modal': 'false', 'data-map-occluder': '' });
    var c = { id: id, el: el, isDrawer: false, open: true, min: false, pinned: true, side: o.side || null, float: o.float || null,
      order: o.order || ++ORDER, z: o.z || 0, kind: o.kind || 'point', title: o.title || '', sel: o.sel || null, live: !!o.live };
    el.appendChild(buildCardBar(c));
    var titles = h('div', { class: 'drawer__titles' });
    var head = h('header', { class: 'drawer__head' }, [titles]);
    var bodyEl = h('div', { class: 'drawer__body' });
    var foot = h('footer', { class: 'prov drawer__prov' });
    el.appendChild(head); el.appendChild(bodyEl); el.appendChild(foot);
    c.parts = { titles: titles, body: bodyEl, foot: foot };
    addResizers(c);
    el.addEventListener('pointerdown', function () { raise(c); }, true);
    el.addEventListener('focusin', function () { raise(c); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); closeCard(c, 'esc'); } });
    if (o.model) fillPin(c, o.model);
    else if (o.nodes) {
      o.nodes.title.forEach(function (n) { titles.appendChild(n); });
      o.nodes.body.forEach(function (n) { bodyEl.appendChild(n); });
      if (o.nodes.prov) foot.appendChild(sourceButton(o.nodes.prov, []));
      if (c.bar) c.bar.eyebrow.textContent = textOf(titles.querySelector('.t-eyebrow'));
      var t = titles.querySelector('.dd-title');
      if (t) { if (!t.id) t.id = uid('ws-t'); el.setAttribute('aria-labelledby', t.id); }
    }
    overlayRoot().appendChild(el);
    var froms = CARDS.map(function (x) { return { c: x, r: x.open && !x.min ? rectOf(x.el) : null }; });
    CARDS.push(c);
    paintAllCards();
    relayout('pin', { still: true, keep: true });
    flipAll(froms, c);          /* the active card glides into its half of the column */
    if (!reduced()) { el.classList.add('is-entering'); raf(function () { raf(function () { el.classList.remove('is-entering'); }); }); }
    return c;
  }
  function fillPin(c, model) {
    var p = c.parts;
    clear(p.titles); clear(p.body);
    p.titles.appendChild(h('span', { class: 't-eyebrow', text: model.eyebrow || '' }));
    var h2 = h('h2', { class: 'dd-title', text: model.title || '—', tabindex: '-1', title: model.title || null });   /* one line in a pin */
    p.titles.appendChild(h2);
    if (model.sub) p.titles.appendChild(h('div', { class: 'dd-sub' }, model.sub));
    if (model.tags) p.titles.appendChild(h('div', { class: 'dd-tags' }, model.tags));
    fillHead(p.titles, model, c);
    if (model.blocks && model.blocks.length) blocksInto(p.body, model.blocks, model);
    else (model.body || []).forEach(function (n) { if (n) p.body.appendChild(n); });
    fold(p.body, c.kind, { listFirst: !!model.listFirst });
    footInto(p.foot, model, c.sel, c);
    if (c.bar) { c.bar.eyebrow.textContent = model.eyebrow || ''; c.bar.demo.hidden = !(model.demo || (model.brief && model.brief.demo)); }
    c.title = model.title || c.title;
    c.dirty = true;
  }
  /** Live pins: rebuilt from section.cardFor(sel) after data, demo, filter, distance and privacy changes. */
  function refreshPins(keys) {
    var mod = curMod();
    CARDS.slice().forEach(function (c) {
      if (c.isDrawer || !c.open) return;
      if (!c.live) {
        if (keys.indexOf('privacy.veil') >= 0 || keys.indexOf('privacy.reveal') >= 0) { closeCard(c, 'privacy'); toast(T.veiled); }
        return;
      }
      var m = null;
      try { m = mod && isFn(mod.cardFor) ? mod.cardFor(c.sel) : null; } catch (e) { m = null; }
      if (!m) {
        clear(c.parts.body);
        var x = h('button', { type: 'button', class: 'btn btn--secondary', text: T.close });
        x.addEventListener('click', function () { closeCard(c, 'button'); });
        c.parts.body.appendChild(h('div', { class: 'ws-gone' }, [h('p', { text: T.gone }), x]));
        return;
      }
      fillPin(c, m);
    });
    relayout('swap', { still: true });
  }

  /* ======================================================================= SEDERHANA: guide folds at ≤ 1440 */

  var GUIDE_FOLD = false, GUIDE_SLIM = null, GUIDE_OPEN = false;
  function guideFold(on) {
    var vw = W.innerWidth || 0;
    if (!on) GUIDE_OPEN = on === false && GUIDE_OPEN && sheetShown();
    if (GUIDE_SLIM && !GUIDE_SLIM.el.isConnected) GUIDE_SLIM = null;   /* its host went with a section switch */
    var want = !!on && !GUIDE_OPEN && active() && !deepView() && !AD && vw < WIDE && mode() === 'desk' && sheetShown();
    if (want === GUIDE_FOLD && (!want || GUIDE_SLIM)) return;
    GUIDE_FOLD = want;
    body().classList.toggle('ws-guide-fold', want);
    if (want) {
      var P = pref();
      if (!P.hints['ws-guide-fold']) { P.hints['ws-guide-fold'] = 1; save(); toast(T.guideFold); }
    }
    if (GUIDE_SLIM && !want) { if (GUIDE_SLIM.el.parentNode) GUIDE_SLIM.el.parentNode.removeChild(GUIDE_SLIM.el); GUIDE_SLIM = null; }
    if (want && !GUIDE_SLIM) {
      /* the guide's slim rail: the section's key numbers and "Buka panel" (the guide comes back until the card closes) */
      var host = DOC.querySelector ? DOC.querySelector('.section-host[data-host="' + section() + '"]') : null;
      var entry = MCD.config && MCD.config.sectionById ? MCD.config.sectionById[section()] : null;
      if (host) {
        GUIDE_SLIM = buildSlim({ label: (entry && entry.label) || '', icon: 'sec-' + section() }, function () { GUIDE_OPEN = true; guideFold(false); });
        host.appendChild(GUIDE_SLIM.el);
        var g = model();
        if (isFn(GUIDE_SLIM.el.style.setProperty)) { GUIDE_SLIM.el.style.setProperty('top', g.stage.y + 'px'); GUIDE_SLIM.el.style.setProperty('height', g.stage.h + 'px'); }
        paintSlimEl(GUIDE_SLIM, summaryOf(curMod()));
      }
    }
    setTimeout(function () { if (MCD.app && isFn(MCD.app.relayout)) { STILL_NEXT = true; MCD.app.relayout(); STILL_NEXT = false; } }, 0);
  }

  /* ======================================================================= KEYBOARD: F6, Esc */

  var LAST_INPUT = 'pointer';
  function regions() {
    var out = [];
    var nav = DOC.getElementById('navrow');
    if (nav) out.push(nav);
    if (AD) out.push(AD.rail === 'slim' && AD.slim ? AD.slim.el : AD.railEl);
    var mp = DOC.getElementById('map');
    if (mp) out.push(mp);
    if (CO) out.push(CO.el);
    visibleCards().sort(function (a, b) { return (b.z || 0) - (a.z || 0); }).forEach(function (c) { out.push(c.el); });
    if (AD && AD.drawerEl) out.push(AD.drawerEl);
    var tr = AD && AD.bar ? AD.bar.traySlot : TRAY;
    if (tr && tr.firstChild && !tr.hidden) out.push(tr);
    return out.filter(Boolean);
  }
  function firstFocusable(t) {
    var list = t.querySelectorAll ? t.querySelectorAll('button, [href], input, select, textarea, [tabindex]') : [];
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (n.disabled || n.getAttribute('tabindex') === '-1' || n.hidden) continue;
      if (n.offsetWidth > 0 || n.offsetHeight > 0) return n;
    }
    return null;
  }
  /** F6 / Shift+F6: section row → rail → map → callout → cards (front to back) → drawer → tray. */
  function cycle(dir) {
    var list = regions();
    if (!list.length) return false;
    /* the innermost region that holds the focus (the tray sits inside the drawer bar: it wins over the drawer) */
    var a = DOC.activeElement, i = -1;
    list.forEach(function (r, k) { if (r.contains && r.contains(a) && (i < 0 || list[i].contains(r))) i = k; });
    var n = list[(i + (dir < 0 ? list.length - 1 : 1) + list.length) % list.length];
    if (i < 0) n = list[dir < 0 ? list.length - 1 : 0];
    var f = firstFocusable(n) || n;
    if (f === n && !n.hasAttribute('tabindex')) n.setAttribute('tabindex', '-1');
    try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    return true;
  }
  /** Shell hook 5 (after the popover): rail overlay → callout → the card that holds the focus → the active sheet. */
  function escape() {
    if (!active()) return false;
    if (AD && AD.rail === 'overlay') { setRail('slim'); return true; }
    if (CO) { closeCallout('esc'); return true; }
    var a = DOC.activeElement;
    var holder = CARDS.filter(function (c) { return c.open && !c.min && c.el && c.el.contains(a) && !c.isDrawer; })[0];
    if (holder) { closeCard(holder, 'esc'); return true; }
    if (DCARD && DCARD.open && drawerOpen() && !DCARD.min) { closeCard(DCARD, 'esc'); return true; }
    return false;
  }
  /** Shell hook 7: windows:tidy, windows:next / prev, and [ / ] while a workspace is adopted. */
  function action(name) {
    switch (name) {
      case 'windows:tidy': return tidy();
      case 'windows:next': return cycle(1);
      case 'windows:prev': return cycle(-1);
      case 'rail:left': return AD ? toggleRail() : false;
      case 'rail:right': return AD ? toggleDrawer() : false;
      default: return false;
    }
  }

  /* ======================================================================= SYNC, SECTION, PRIVACY, LOCK */

  var PICK_OFF = null, MOVE_MAP = null;
  /** Shell hook 6: after a mount, a resize or a view change. Adopts the section's workspace in Detail ≥ 1024 px. */
  function sync(cur) {
    if (!DOC || !DOC.body) return;
    var b = body(), m = mode();
    /* one card system per width (§3.10): a desktop callout left on screen by a resize to a phone becomes the phone's
       bottom sheet with the same brief; on a page it goes */
    if (CO && (m === 'phone' || m === 'off')) {
      var spec0 = CO.spec;
      closeCallout(m === 'phone' ? 'replace' : 'section', { silent: m === 'phone' });
      if (m === 'phone') phoneCallout(spec0);
    }
    b.classList.toggle('ws-on', m === 'desk' || m === 'tablet');
    b.classList.toggle('ws-tablet', m === 'tablet');
    b.classList.toggle('ws-wide', (W.innerWidth || 0) >= WIDE);
    var mod = cur && cur.mod;
    var want = !!(cur && cur.host && !cur.broken && caps().adopt && mod && isFn(mod.workspace));
    if (AD && (!want || AD.cur !== cur || AD.cur.host !== cur.host)) unadopt();
    if (want && !AD) {
      var spec = null;
      try { spec = mod.workspace(); } catch (e) { spec = null; if (W.console) W.console.error('[MCD.windows] workspace()', e); }
      if (spec) adopt(cur, spec);
    }
    if (AD && AD.rail === 'full' && (W.innerWidth || 0) < WIDE) { AD.rail = 'slim'; paintRail(); }
    if (AD && AD.rail === 'slim' && (W.innerWidth || 0) >= WIDE && secPref().rail !== 'slim') { AD.rail = 'full'; paintRail(); }
    /* phones and pages: no pins and no tray (one sheet system) */
    if (!caps().pins) {
      CARDS.slice().forEach(function (c) { if (!c.isDrawer && c.open) { c.open = false; CARDS.splice(CARDS.indexOf(c), 1); if (c.el.parentNode) c.el.parentNode.removeChild(c.el); } });
      if (DCARD) DCARD.pinned = false;
    }
    if (DCARD && !caps().minimise && DCARD.min) setMin(DCARD, false, { quiet: true, force: true });
    if (DCARD) {
      if (m === 'phone' || m === 'off') { DCARD.el.classList.remove('ws-win'); unBox(DCARD.el); }
      else if (drawerOpen()) DCARD.el.classList.add('ws-win');
      if (DCARD.side === 'left' && !caps().leftCol) DCARD.side = 'right';
      if (!DCARD.side && !caps().float && DCARD.open) DCARD.side = 'right';
    }
    /* a selection's flight landed (or any camera move the app made): the cards keep clear of it (§4.1) */
    var mo = mapObj();
    if (mo && mo !== MOVE_MAP && isFn(mo.on)) {
      MOVE_MAP = mo;
      try {
        mo.on('moveend', function (e) {
          if ((e && e.originalEvent) || POINTER_DOWN || DRAG || !active()) return;   /* staff moved the map themselves */
          if (!LAND.at || now() - LAND.at > 4000) return;                              /* only the flight of a new selection */
          LAND.at = 0;
          if (visibleCards().length || CO) keepInViewSoon();
        });
      } catch (e) { /* no move events */ }
    }
    if (!PICK_OFF && MCD.map && isFn(MCD.map.on)) {
      try { PICK_OFF = MCD.map.on('pick', onMapPick) || true; } catch (e) { PICK_OFF = true; }
      /* the route of the callout's point is drawn a moment after the pick: place the callout again, off its tail */
      var rsig = '';
      try {
        MCD.map.on('route', function (rs) {
          var r0 = rs && rs.key ? rs : (MCD.map.routeState ? MCD.map.routeState() : null);
          var sg = r0 ? [r0.key, r0.line, r0.phase === 'on' ? 1 : 0].join('|') : '';
          if (sg === rsig) return;
          rsig = sg;
          if (CO && CO.selKey) placeCallout(false);
        });
      } catch (e) { /* no route events */ }
    }
    paintAllCards();
    renderTray();
    relayout('viewport', { still: true, instant: true });
  }
  function onMapPick(p) {
    if (!CO) return;
    if (!p || !p.kind) { closeCallout('outside'); return; }
    if (/cluster/i.test(String(p.kind))) closeCallout('outside');
  }
  /** closeAll('section' | 'lock' | 'privacy'): callouts, sheets, pins and chips go (lock and a section switch: the active card too). */
  function closeAll(reason) {
    reason = reason || 'section';
    closeCallout(reason);
    var drawerUp = false;
    CARDS.slice().forEach(function (c) {
      if (c.isDrawer) {
        c.pinned = false; c.min = false;
        stopMin(c);
        c.el.classList.remove('is-min', 'is-pinned');
        c.el.removeAttribute('inert'); c.el.removeAttribute('aria-hidden');
        drawerUp = c.open && drawerOpen();
        return;
      }
      c.open = false;
      CARDS.splice(CARDS.indexOf(c), 1);
      if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
    });
    if (PHONE_CO) { var pc = PHONE_CO; PHONE_CO = null; safe(pc.spec.onClose, null, [reason]); }
    /* §3.12: lock closes every sheet; a section switch too (the shell's own switch closes it silently as well) */
    if ((reason === 'lock' || reason === 'section') && drawerUp && MCD.app && isFn(MCD.app.closeDrawer)) safe(MCD.app.closeDrawer, MCD.app, [true, { force: true }]);
    if (reason === 'section' || reason === 'lock') { if (AD) unadopt(); }
    GUIDE_FOLD = false;
    GUIDE_OPEN = false;
    if (GUIDE_SLIM) { if (GUIDE_SLIM.el.parentNode) GUIDE_SLIM.el.parentNode.removeChild(GUIDE_SLIM.el); GUIDE_SLIM = null; }
    if (DOC && DOC.body) body().classList.remove('ws-guide-fold');
    renderTray();
  }
  /** suspend(on): the KPR calculator is open (its own full sheet): callouts close, cards and the tray hide. */
  function suspend(on) {
    SUSPENDED = !!on;
    if (SUSPENDED) closeCallout('section');
    if (DOC && DOC.body) body().classList.toggle('ws-suspended', SUSPENDED);
    relayout('section', { still: true, instant: true });
  }
  /** Data & Privasi "Atur ulang tata letak kartu": forget every saved size and position. */
  /* The key goes as a whole (INTEGRATION_NOTES §6, build spec §8): sizes, sides, folds and the hints already seen, so
     every once-per-browser hint shows once more. Nothing else is stored under it. */
  function resetLayout() {
    clearTimeout(saveT);
    try { W.localStorage.removeItem(storageKey()); } catch (e) { /* nothing stored */ }
    PREF = fresh();
    SEEN = {};
    PENDING = {};
    if (DOC && DOC.body && active()) relayout('tidy', { still: true });
    return true;
  }
  function calloutKey() { return CO ? (CO.spec.key || CO.selKey || null) : null; }
  /** The map's hover tooltip stays away from the item the callout or the sheet already shows. */
  function suppressTip(pick) {
    if (!pick || pick.id == null) return false;
    var k = String(pick.kind) + ':' + String(pick.id);
    /* a kecamatan pick ('territory-kec:<id>', 'smaKec:<id>', …) matches the callout key 'kec:<id>' (final integration) */
    var kk = /(^|-)kec(amatan)?$|Kec(amatan)?$/.test(String(pick.kind)) ? 'kec:' + String(pick.id) : null;
    if (CO && (CO.selKey === k || CO.spec.key === k || (kk && CO.spec.key === kk))) return true;
    if (DCARD && DCARD.open && !DCARD.min && DCARD.sel && selKey(DCARD.sel) === k) return true;
    return false;
  }

  /* ======================================================================= CONTENT HELPERS (pages) */

  /** card(spec) → a static card with the callout's markup (Ringkasan, Data & Privasi). */
  function card(spec) {
    spec = spec || {};
    var el = h('section', { class: 'ws-card' + (spec.className ? ' ' + spec.className : '') });
    var head = h('div', { class: 'ws-co__head' }, [h('span', { class: 'ws-co__eyebrow t-eyebrow', text: spec.eyebrow || '' }), spec.demo ? h('span', { class: 'ws-demo', text: 'CONTOH' }) : null]);
    el.appendChild(head);
    if (spec.title) el.appendChild(h(spec.titleTag || 'h3', { class: 'ws-co__title', text: spec.title }));
    var chips = (spec.chips || []).filter(Boolean).slice(0, 2).map(function (ch) { return ch.nodeType ? ch : h('span', { class: 'tag ws-chiptag' + (ch.tone ? ' is-' + ch.tone : ''), text: ch.text || '' }); });
    if (chips.length) el.appendChild(h('div', { class: 'ws-co__chips' }, chips));
    var nums = numbersEl(spec.numbers, 'ws-nums ws-co__nums');
    if (nums) el.appendChild(nums);
    if (spec.note && spec.note.text) {
      var nn = h('p', { class: 'ws-co__note', text: spec.note.text });
      var n2 = spec.note.hintId ? hint(spec.note.hintId, nn) : nn;
      if (n2) el.appendChild(n2);
    }
    (spec.nodes || []).forEach(function (n) { if (n) el.appendChild(n); });
    var acts = (spec.actions || []).filter(function (a) { return a && a.label; });
    if (acts.length) el.appendChild(h('div', { class: 'ws-co__acts' }, acts.map(function (a) {
      var b = h('button', { type: 'button', class: 'btn ' + (a.primary ? 'btn--primary' : 'btn--secondary') }, [h('span', { text: a.label })]);
      b.addEventListener('click', function () { safe(a.run); });
      return b;
    })));
    if (spec.source) el.appendChild(sourceButton(spec.source, []));
    return el;
  }
  /** place(el, anchorRect, {avoid, sides}): smart placement of a popover or hover card beside a rect (fixed position). */
  function place(el, anchorRect, o) {
    if (!el || !anchorRect) return null;
    o = o || {};
    var vw = W.innerWidth || 1280, vh = W.innerHeight || 800;
    var size = { w: el.offsetWidth || 280, h: el.offsetHeight || 160 };
    var a = { x: anchorRect.left != null ? anchorRect.left : anchorRect.x, y: anchorRect.top != null ? anchorRect.top : anchorRect.y, w: anchorRect.width != null ? anchorRect.width : anchorRect.w, h: anchorRect.height != null ? anchorRect.height : anchorRect.h };
    var res = placeBox({ anchor: { rect: R(a.x, a.y, a.w, a.h) }, size: size, free: R(8, 8, vw - 16, vh - 16), sides: o.sides || null,
      obstacles: (o.avoid || []).map(function (r) { return r.left != null ? R(r.left, r.top, r.width, r.height) : r; }) });
    if (res.outside) return null;
    el.style.position = 'fixed';
    el.style.left = Math.round(res.x) + 'px';
    el.style.top = Math.round(res.y) + 'px';
    el.setAttribute('data-side', res.side || '');
    return res;
  }

  /* ======================================================================= QA: §12.1 measurement */

  /** _measure({step, pt}) → {visiblePct, largest, selInside, covered}: "map" = elementFromPoint inside #map. */
  function measure(o) {
    o = o || {};
    var step = o.step || 8, pt = o.pt || null;
    var nav = DOC.getElementById('navrow'), mp = DOC.getElementById('map');
    if (!mp || !isFn(DOC.elementFromPoint)) return null;
    var top = Math.round(nav ? nav.getBoundingClientRect().bottom : 0);
    var vw = W.innerWidth, vh = W.innerHeight;
    var cols = Math.floor(vw / step), rows = Math.floor((vh - top) / step), g = [], vis = 0, n = 0;
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        var e = DOC.elementFromPoint(c * step + step / 2, top + r * step + step / 2), ok = !!(e && mp.contains(e));
        row.push(ok ? 1 : 0); vis += ok ? 1 : 0; n++;
      }
      g.push(row);
    }
    var best = { a: 0 }, hh = new Array(cols).fill(0);
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) hh[c] = g[r][c] ? hh[c] + 1 : 0;
      var stack = [];
      for (c = 0; c <= cols; c++) {
        var cur = c < cols ? hh[c] : 0;
        while (stack.length && hh[stack[stack.length - 1]] >= cur) {
          var hi = hh[stack.pop()], l = stack.length ? stack[stack.length - 1] + 1 : 0, w = c - l;
          if (hi * w > best.a) best = { a: hi * w, x: l * step, y: top + (r - hi + 1) * step, w: w * step, h: hi * step };
        }
        stack.push(c);
      }
    }
    var covered = targets().filter(function (t) {
      var r0 = t.rect, cx = r0.x + r0.w / 2, cy = r0.y + r0.h / 2;
      var e = DOC.elementFromPoint(cx, cy);
      return !(e && mp.contains(e));
    }).map(function (t) { return t.id; });
    return { visiblePct: Math.round(vis / Math.max(1, n) * 1000) / 10, largest: { x: best.x, y: best.y, w: best.w, h: best.h },
      selInside: pt ? (pt.x >= best.x && pt.x <= best.x + best.w && pt.y >= best.y && pt.y <= best.y + best.h) : null, covered: covered };
  }

  /* ======================================================================= WATCHERS (registrations only at load) */

  if (MCD.state && isFn(MCD.state.on)) {
    MCD.state.on('select', onSelect);
    var refQ = { raf: 0, keys: [] };
    var queue = function (keys) {
      refQ.keys = refQ.keys.concat(keys || []);
      if (refQ.raf) return;
      refQ.raf = raf(function () {
        refQ.raf = 0;
        var ks = refQ.keys.splice(0);
        if (!booted()) return;
        if (AD) paintSlim();
        if (ks.indexOf('privacy.veil') >= 0 || ks.indexOf('privacy.reveal') >= 0) closeCallout('privacy');
        if (CARDS.some(function (c) { return !c.isDrawer && c.open; })) refreshPins(ks);
      });
    };
    MCD.state.on('change', function (e) {
      var ks = (e && e.keys) || [];
      /* pins rebuild on data, demo, filter, settings and privacy changes (distance: mcd:distance); never on a selection,
         so a pin keeps its scroll position and an unsaved Tindak lanjut note while staff pick other places */
      if (ks.some(function (k) { return /^(data|demo|filters|sme|privacy|settings)/.test(k); })) queue(ks);
    });
    MCD.state.on('data', function () { queue(['data']); });
  }
  if (W && isFn(W.addEventListener)) {
    W.addEventListener('mcd:distance', function () { if (booted()) { if (AD) paintSlim(); if (CARDS.some(function (c) { return !c.isDrawer && c.open; })) refreshPins(['distance']); } });
    var rz = 0;
    W.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (booted()) { obstacles(true); relayout('viewport', { still: true, instant: true }); } }, 140); });
  }
  if (DOC && isFn(DOC.addEventListener)) {
    DOC.addEventListener('mcd:gate-locking', function () { closeAll('lock'); });
    DOC.addEventListener('keydown', function (e) { LAST_INPUT = 'key'; if (e.key === 'Tab') body().classList.add('ws-kbd'); }, true);
    DOC.addEventListener('pointerdown', function (e) {
      LAST_INPUT = 'pointer';
      POINTER_DOWN = true;
      /* a press on the map closes the rail overlay; never a press inside the panels */
      if (AD && AD.rail === 'overlay' && e.target && e.target.closest && e.target.closest('#map') && !e.target.closest('.ws-rail')) setRail('slim');
    }, true);
    DOC.addEventListener('pointerup', function () { POINTER_DOWN = false; }, true);
    DOC.addEventListener('pointercancel', function () { POINTER_DOWN = false; }, true);
  }

  /* ======================================================================= EXPORT */

  MCD.windows = {
    version: '5.0.0',
    mode: mode, active: active,
    // 1 callout
    callout: callout,
    // 2 sheet (the active one is the app drawer; pins are own cards)
    sheet: function (spec) {
      spec = spec || {};
      if (!spec.id || spec.id === 'detail') {
        if (MCD.app && isFn(MCD.app.openDrawer)) MCD.app.openDrawer({
          eyebrow: spec.eyebrow, title: spec.title, kind: spec.kind, demo: spec.demo, sub: spec.chips && spec.chips.filter(function (x) { return x && x.nodeType; }),
          crumb: spec.crumb, quick: spec.quick, brief: { numbers: spec.numbers || [] }, prov: spec.source || '', hints: spec.hints, anchor: spec.anchor,
          blocks: (spec.sections || []).map(function (s) { return { id: s.id, title: s.title, preview: s.preview, open: s.open, nodes: s.nodes, render: s.render }; }),
          body: []
        }, { explicit: true });
        return DCARD ? cardHandle(DCARD) : null;
      }
      if (!caps().pins) return null;
      var model0 = isFn(spec.refresh) ? safe(spec.refresh) : null;
      var pc = makePin({ model: model0 || { eyebrow: spec.eyebrow, title: spec.title, kind: spec.kind, crumb: spec.crumb, quick: spec.quick, brief: { numbers: spec.numbers || [] }, prov: spec.source || '',
        blocks: (spec.sections || []).map(function (s) { return { id: s.id, title: s.title, preview: s.preview, open: s.open, nodes: s.nodes, render: s.render }; }) },
        live: false, kind: spec.kind, title: spec.title, side: caps().leftCol ? 'left' : 'right' });
      return cardHandle(pc);
    },
    // 3 workspace adoption
    adopt: adopt, unadopt: unadopt,
    setRail: function (s) { setRail(s, true); }, rail: function () { return AD ? AD.rail : null; },
    setDrawer: function (s) { setDrawer(s); }, drawer: function () { return AD ? AD.drawer : null; },
    // 4 housekeeping
    tidy: tidy, pin: pin,
    minimise: function (id) { var c = cardById(id || 'detail'); if (c) setMin(c, true); },
    restore: function (id) { var c = cardById(id || 'detail'); if (c) restore(c); },
    close: function (id, reason) { var c = cardById(id || 'detail'); if (c) closeCard(c, reason || 'api'); },
    front: function (id) { var c = cardById(id || 'detail'); if (c) raise(c); },
    closeAll: closeAll,
    list: function () { return CARDS.filter(function (c) { return c.open; }).map(function (c) { return { id: c.id, kind: c.kind, state: cardState(c), pinned: !!c.pinned, rect: c.geo ? R(c.geo.x, c.geo.y, c.geo.w, c.geo.h) : null }; }); },
    tray: function () { return CARDS.filter(function (c) { return c.open && c.min; }).map(function (c) { return { id: c.id, title: c.title }; }); },
    suspend: suspend, resetLayout: resetLayout,
    // 5 layout contract
    rects: rects, onLayoutChange: function (fn) { if (!isFn(fn)) return function () {}; LAYOUT_FNS.push(fn); return function () { LAYOUT_FNS = LAYOUT_FNS.filter(function (f) { return f !== fn; }); }; },
    padding: padding, still: still, keepInView: keepInView, calloutKey: calloutKey, suppressTip: suppressTip, origin: origin,
    // shell hooks (app.js, §7.3)
    adoptDrawer: adoptDrawer, route: route, decorate: decorate, beforeClose: beforeClose, escape: escape, sync: sync, action: action,
    // 6 content helpers
    fold: fold, hint: hint, sourceButton: function (text) { return sourceButton(text, []); }, card: card, place: place,
    // 7 QA
    _measure: measure,
    _pure: { geometry: geometry, colWidths: colWidths, colDefault: colDefault, placeCallout: placeBox, routeInside: routeInside, awaySide: awaySide,
      keepOffset: keepOffset, keepPlan: keepPlan, largestRect: largestRect, drawerHeights: drawerHeights, edgeChip: edgeChip, hit: hit },
    _pref: function () { return JSON.parse(JSON.stringify(pref())); },
    /** QA: the callout placement cost (ms) of the last ≤ 600 placements → {n, p95, worst}. */
    _placeStats: function () {
      var a = PLACE_MS.slice().sort(function (x, y) { return x - y; });
      return { n: a.length, p95: a.length ? Math.round(a[Math.floor(a.length * 0.95)] * 100) / 100 : 0, worst: a.length ? Math.round(a[a.length - 1] * 100) / 100 : 0 };
    },
    KEY: KEY, T: T
  };
  function cardHandle(c) {
    return {
      id: c.id, el: c.el,
      update: function (spec) { if (!c.isDrawer && spec) fillPin(c, spec); },
      refresh: function () { refreshPins(['data']); },
      close: function (r) { closeCard(c, r || 'api'); },
      minimise: function () { setMin(c, true); }, restore: function () { restore(c); },
      pin: function (on) { return pin(c, on); }, front: function () { raise(c); },
      rect: function () { return c.geo ? R(c.geo.x, c.geo.y, c.geo.w, c.geo.h) : null; },
      get state() { return cardState(c); }
    };
  }
})(window, window.MCD = window.MCD || {});
