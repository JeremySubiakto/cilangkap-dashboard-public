/* ==========================================================================
 * MCD.motion: one motion language for the whole dashboard (COPY_STYLE_EN item 38, 16 Oct 2026).
 *
 * The branch asked for "top-tier motion" that stays calm: one easing family, short durations, no bounce,
 * no parallax, transforms and opacity only, 60 fps on a normal office laptop, and instant cuts for people who
 * ask their system for less motion (prefers-reduced-motion). This module holds the numbers every lane uses,
 * so the map flights, the drawers, the section switches and the counting numbers feel like one product.
 * The same numbers are CSS custom properties in assets/css/tokens.css (--ease-out, --ease-in-out,
 * --dur-fast, --dur-base, --dur-slow); keep both in step.
 *
 *   ease.out     'cubic-bezier(.22,1,.36,1)'   ease-out-quint: entrances, camera flights, numbers
 *   ease.inOut   'cubic-bezier(.65,0,.35,1)'   ease-in-out-cubic: exits, things that leave
 *   dur.fast     180 ms   exits, menus, small fades
 *   dur.base     300 ms   entrances: section switch, drawer, toast, veil and fades (250-350 ms)
 *   dur.slow     500 ms   numbers counting up, larger reveals
 *
 * API (contract: docs/INTEGRATION_NOTES.md §15)
 *   ease, dur, easing.out(t) / easing.inOut(t)   the same curves as functions of t in [0, 1]
 *   flightMs(distanceKm) → 700..1000             camera flight time, longer for longer flights (√ scale, 15 km = 1000);
 *                                                 an unknown distance gives 850. Callers jump instead when reduced().
 *   reduced() → boolean                          the system asks for less motion: cut, never animate, never blur-animate
 *   countUp(el, to, {format?, ms?, from?, again?}) → {cancel(), done: Promise}
 *                                                 writes format(value) into el.textContent while counting up to `to`,
 *                                                 once per element (later calls write the value at once unless
 *                                                 again: true); reduced, hidden tab or no rAF: the final text at once
 *   stagger(elements, {stepMs?: 35, delayMs?: 0, ms?: 300, y?: 6, max?: 12}) → {count, cancel(), done: Promise}
 *                                                 each element fades in and rises y px (Web Animations, opacity and
 *                                                 translate only), element i starting i × stepMs later (capped at
 *                                                 max steps, so a long list never waits); reduced: nothing moves
 *   afterPaint(fn) → cancel()                    fn after the next frame is on screen (two rAF; a timer covers a
 *                                                 background tab, where rAF pauses)
 *   probe(ms?) → Promise<{frames, ms, fps, p50, p95, worst, over20}>
 *                                                 frame times over ms (default 1000) from requestAnimationFrame: the
 *                                                 QA check that a transition holds ~60 fps (MCD.motion.probe(600))
 *
 * No network, no storage, no DOM at load time. UMD: MCD.motion in the browser, module.exports in Node.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.motion = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var EASE = Object.freeze({ out: 'cubic-bezier(.22,1,.36,1)', inOut: 'cubic-bezier(.65,0,.35,1)' });
  var DUR = Object.freeze({ fast: 180, base: 300, slow: 500 });
  var FLIGHT_MIN = 700, FLIGHT_MAX = 1000, FLIGHT_FULL_KM = 15;
  var STEP_MS = 35, STAGGER_MAX = 12, RISE_PX = 6;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function now() { return root && root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now(); }
  function doc() { return root && root.document ? root.document : null; }

  /* ------------------------------------------------------------ curves as functions */

  /** CSS cubic-bezier(x1, y1, x2, y2) as a function of t in [0, 1] (Newton, then bisection). */
  function bezier(x1, y1, x2, y2) {
    function bx(t) { return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t; }
    function by(t) { return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t; }
    function dx(t) { return 3 * (1 - 3 * x2 + 3 * x1) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1; }
    return function (x) {
      if (!(x > 0)) return 0;
      if (x >= 1) return 1;
      var t = x, i;
      for (i = 0; i < 8; i++) {
        var e = bx(t) - x;
        if (Math.abs(e) < 1e-6) return by(t);
        var d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      var lo = 0, hi = 1;
      t = x;
      for (i = 0; i < 30; i++) {
        var v = bx(t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return by(t);
    };
  }
  var easing = Object.freeze({ out: bezier(0.22, 1, 0.36, 1), inOut: bezier(0.65, 0, 0.35, 1) });

  /* ------------------------------------------------------------ system preference */

  function reduced() {
    try {
      var mm = root && root.matchMedia;
      return typeof mm === 'function' ? !!mm.call(root, '(prefers-reduced-motion: reduce)').matches : false;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------ camera */

  /** 700 ms for a short hop up to 1000 ms from 15 km on, on a square-root scale (a 4 km hop is about 855 ms). */
  function flightMs(distanceKm) {
    var d = distanceKm == null || distanceKm === '' ? NaN : Number(distanceKm);
    if (!isNum(d) || d < 0) return Math.round((FLIGHT_MIN + FLIGHT_MAX) / 2);
    return Math.round(FLIGHT_MIN + (FLIGHT_MAX - FLIGHT_MIN) * clamp01(Math.sqrt(d / FLIGHT_FULL_KM)));
  }

  /* ------------------------------------------------------------ frames */

  function rafFn() { return root && typeof root.requestAnimationFrame === 'function' ? root.requestAnimationFrame.bind(root) : null; }
  function cafFn() { return root && typeof root.cancelAnimationFrame === 'function' ? root.cancelAnimationFrame.bind(root) : null; }
  function hidden() { var d = doc(); return !!(d && d.hidden); }

  /** fn after the next frame has been painted; a timer covers a stalled rAF. Returns cancel(). */
  function afterPaint(fn) {
    var done = false, ids = [], raf = rafFn(), caf = cafFn();
    function run() { if (done) return; done = true; clearTimeout(timer); try { fn(); } catch (e) { if (root && root.console) root.console.error('[MCD.motion]', e); } }
    var timer = setTimeout(run, 100);
    if (raf) ids.push(raf(function () { ids.push(raf(run)); }));
    return function cancel() { done = true; clearTimeout(timer); if (caf) ids.forEach(function (id) { caf(id); }); };
  }

  /* ------------------------------------------------------------ numbers */

  var counted = typeof WeakMap === 'function' ? new WeakMap() : null;   // el → true once it has counted up
  var running = typeof WeakMap === 'function' ? new WeakMap() : null;   // el → the count in progress

  function thousands(n) {
    var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 && Math.round(Math.abs(n)) !== 0 ? '−' : '') + s;
  }
  function defaultFormat(v) {
    var U = root && root.MCD && root.MCD.util && root.MCD.util.fmt;
    if (U && typeof U.int === 'function') { try { return U.int(v); } catch (e) { /* below */ } }
    return isNum(v) ? thousands(v) : '—';
  }
  function setText(el, s) { if (el) el.textContent = String(s); }

  /**
   * countUp(el, to, {format?, ms?, from?, again?}): counts el's number up to `to` once, with ease.out.
   * The final text is always exactly format(to). Returns {cancel(), done: Promise<void>}.
   */
  function countUp(el, to, opts) {
    opts = opts || {};
    var format = typeof opts.format === 'function' ? opts.format : defaultFormat;
    var ms = isNum(opts.ms) ? opts.ms : DUR.slow;
    var from = isNum(opts.from) ? opts.from : 0;
    var prev = running && el ? running.get(el) : null;
    if (prev) prev.cancel();
    var finalText;
    try { finalText = format(to); } catch (e) { finalText = isNum(to) ? thousands(to) : '—'; }
    var resolve, done = new Promise(function (r) { resolve = r; });
    var handle = { cancel: function () { stop(false); }, done: done };
    var raf = rafFn(), caf = cafFn(), id = null, timer = null, over = false;
    function stop(writeFinal) {
      if (over) return;
      over = true;
      if (id != null && caf) caf(id);
      clearTimeout(timer);
      if (writeFinal) setText(el, finalText);
      if (running && el && running.get(el) === handle) running.delete(el);
      resolve();
    }
    var seen = !!(counted && el && counted.get(el));
    if (!el || !isNum(to) || ms <= 0 || !raf || reduced() || hidden() || (seen && !opts.again)) {
      if (counted && el) counted.set(el, true);
      setText(el, finalText);
      over = true;
      resolve();
      return handle;
    }
    if (counted) counted.set(el, true);
    if (running) running.set(el, handle);
    var start = null;
    function frame(ts) {
      if (over) return;
      var t = isNum(ts) ? ts : now();
      if (start == null) start = t;
      var p = clamp01((t - start) / ms);
      if (p >= 1) { stop(true); return; }
      var v = from + (to - from) * easing.out(p);
      var txt;
      try { txt = format(v); } catch (e) { txt = thousands(v); }
      setText(el, txt);
      id = raf(frame);
    }
    try { setText(el, format(from)); } catch (e) { setText(el, thousands(from)); }
    id = raf(frame);
    timer = setTimeout(function () { stop(true); }, ms + 150);   // rAF paused (background tab): never stuck halfway
    return handle;
  }

  /* ------------------------------------------------------------ staggered entrance */

  function listOf(elements) {
    if (!elements) return [];
    if (typeof elements.length !== 'number') return [elements];
    var out = [];
    for (var i = 0; i < elements.length; i++) if (elements[i]) out.push(elements[i]);
    return out;
  }

  /**
   * stagger(elements, {stepMs, delayMs, ms, y, max}): each element fades in from opacity 0 and rises from y px,
   * element i delayed by delayMs + min(i, max) × stepMs. Opacity and translate only (composited), fill
   * 'backwards' so nothing flashes before its turn, and the element's own end state is kept (implicit end
   * keyframe), so a dimmed row stays dimmed. Reduced motion or no Web Animations: nothing moves.
   */
  function stagger(elements, opts) {
    opts = opts || {};
    var list = listOf(elements).filter(function (el) { return typeof el.animate === 'function'; });
    var anims = [];
    var result = { count: 0, cancel: function () { anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* gone */ } }); }, done: Promise.resolve() };
    if (!list.length || reduced()) return result;
    var step = isNum(opts.stepMs) ? Math.max(0, opts.stepMs) : STEP_MS;
    var delay = isNum(opts.delayMs) ? Math.max(0, opts.delayMs) : 0;
    var ms = isNum(opts.ms) ? Math.max(1, opts.ms) : DUR.base;
    var y = isNum(opts.y) ? opts.y : RISE_PX;
    var max = isNum(opts.max) ? Math.max(0, opts.max) : STAGGER_MAX;
    list.forEach(function (el, i) {
      var timing = { duration: ms, delay: delay + Math.min(i, max) * step, easing: EASE.out, fill: 'backwards' };
      var a = null;
      try { a = el.animate([{ opacity: 0, translate: '0 ' + y + 'px', offset: 0 }], timing); }
      catch (e) {
        try { a = el.animate([{ opacity: 0, translate: '0 ' + y + 'px' }, { opacity: 1, translate: '0 0' }], timing); } catch (e2) { a = null; }
      }
      if (a) anims.push(a);
    });
    result.count = anims.length;
    result.done = Promise.all(anims.map(function (a) {
      return a.finished && typeof a.finished.then === 'function' ? a.finished.then(null, function () { /* cancelled */ }) : null;
    })).then(function () {});
    return result;
  }

  /* ------------------------------------------------------------ frame-time probe (QA) */

  function pct(sorted, q) {
    if (!sorted.length) return 0;
    var i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
    return sorted[i];
  }

  /** Frame times from requestAnimationFrame over `ms`: {frames, ms, fps, p50, p95, worst, over20}. */
  function probe(ms) {
    ms = isNum(ms) && ms > 0 ? ms : 1000;
    var raf = rafFn();
    if (!raf) return Promise.resolve({ frames: 0, ms: 0, fps: 0, p50: 0, p95: 0, worst: 0, over20: 0 });
    return new Promise(function (resolve) {
      var gaps = [], first = null, last = null;
      function tick(ts) {
        var t = isNum(ts) ? ts : now();
        if (first == null) first = t;
        if (last != null) gaps.push(t - last);
        last = t;
        if (t - first < ms) raf(tick);
        else {
          var s = gaps.slice().sort(function (a, b) { return a - b; });
          var span = last - first;
          resolve({
            frames: gaps.length, ms: Math.round(span),
            fps: span > 0 ? Math.round(gaps.length / span * 1000 * 10) / 10 : 0,
            p50: Math.round(pct(s, 0.5) * 10) / 10, p95: Math.round(pct(s, 0.95) * 10) / 10,
            worst: Math.round((s[s.length - 1] || 0) * 10) / 10,
            over20: gaps.filter(function (g) { return g > 20; }).length
          });
        }
      }
      raf(tick);
    });
  }

  return {
    ease: EASE,
    dur: DUR,
    easing: easing,
    flightMs: flightMs,
    reduced: reduced,
    countUp: countUp,
    stagger: stagger,
    afterPaint: afterPaint,
    probe: probe
  };
});
