/* ==========================================================================
 * MCD.back: the Back button and the Back gesture close the top layer first (docs/MOBILE_UX_PLAN.md M2;
 * docs/V8_SPEC.md §2.7, SHELL lane). Bank Mandiri KCP Jakarta Cilangkap · Dashboard Akuisisi.
 *
 * On phones and tablets ((max-width: 1023px), (pointer: coarse)) Android users expect Back to close the open sheet,
 * Cari, Bantuan, the Lainnya sheet or a menu before it changes the page; on iPhone the edge swipe does the same. Each
 * layer that opens pushes one history entry with the same URL ({mcdLayer: id}); Back pops the top layer and calls its
 * close function. A layer that closes itself (Tutup, Esc, a tap outside) gives its entry back with history.back(),
 * a moment later, so a layer that opens right after (another point tapped, Cari opening Bantuan) reuses that entry
 * instead of stacking a new one.
 *
 * Load order: before state.js (index.html), so this popstate listener runs first and can stop the event
 * (stopImmediatePropagation); state.js also ignores popstate events whose state carries mcdLayer.
 *
 * Navigation while layers are open: app.js calls reset('section') on a section change (every layer closes, the stack
 * empties); state.js asks release() before it pushes a section or view entry, and when the current entry is a layer
 * entry it replaces that entry instead of pushing, so Back never lands on a closed layer of another section. Entries
 * left below (two layers were open) are skipped by the next Back.
 *
 * guard(onFirstBack) after sign-in: one extra entry, so the first Back stays on the dashboard and onFirstBack shows the
 * toast; a second Back within 3 s leaves (the default of docs/V8_SPEC.md §0.3).
 *
 * MCD.back = {
 *   open(id, close) → boolean       a layer opened (close({via: 'back' | 'section' | 'lock'}) is called to close it)
 *   closed(id) → boolean            the layer closed itself; its entry is given back
 *   guard(onFirstBack) → boolean    after sign-in (phones and tablets only)
 *   depth() → n · active() → boolean · reset(reason) → n · release() → boolean (state.js)
 * }
 * No storage, no network, no data: history entries carry {mcdLayer: id} | {mcdBase: 1} | {mcdHome: 1} only.
 * Classic IIFE on window.MCD; CSP-safe (no string timers).
 * ========================================================================== */
(function (W) {
  'use strict';
  if (!W) return;
  var MCD = W.MCD = W.MCD || {};
  var MQ = '(max-width: 1023px), (pointer: coarse)';
  var GAP_MS = 3000;          // a second Back within 3 s leaves (V8 §0.3)
  var FLUSH_MS = 40;          // a layer that opens right after another closed reuses its entry

  var stack = [];             // [{id, close}] bottom → top
  var owed = 0;               // layer entries we still sit on whose layers have closed
  var skip = 0;               // popstate events caused by our own history.back() / go()
  var flushT = 0;
  var guardFn = null, guardT = null;      // the time of the last warned Back (null: none yet)

  function now() { return Date.now(); }
  function hist() { return W.history || null; }
  function href() { try { return String(W.location.href); } catch (e) { return ''; } }
  function active() {
    try { return !!(W.matchMedia && W.matchMedia(MQ).matches); } catch (e) { return false; }
  }
  function indexOf(id) {
    for (var i = stack.length - 1; i >= 0; i--) if (stack[i].id === id) return i;
    return -1;
  }
  function push(state) {
    var H = hist();
    if (!H || typeof H.pushState !== 'function') return false;
    try { H.pushState(state, '', href()); return true; } catch (e) { return false; }
  }
  function replace(state) {
    var H = hist();
    if (!H || typeof H.replaceState !== 'function') return false;
    try { H.replaceState(state, '', href()); return true; } catch (e) { return false; }
  }
  function cancelFlush() { if (flushT) { W.clearTimeout(flushT); flushT = 0; } }
  function scheduleFlush() {
    cancelFlush();
    flushT = W.setTimeout(flush, FLUSH_MS);
  }
  /** Gives back the entries of layers that closed by themselves: one history step for all of them. */
  function flush() {
    flushT = 0;
    var n = owed;
    if (n <= 0) return;
    owed = 0;
    var H = hist();
    if (!H) return;
    skip += 1;
    try {
      if (n === 1 && typeof H.back === 'function') H.back();
      else if (typeof H.go === 'function') H.go(-n);
      else skip -= 1;
    } catch (e) { skip -= 1; }
  }

  /** open(id, close): a layer opened. Phones and tablets only; the same id twice keeps its one entry. */
  function open(id, close) {
    id = String(id || '');
    if (!id || typeof close !== 'function') return false;
    var i = indexOf(id);
    if (i >= 0) { stack[i].close = close; return true; }
    if (!active()) return false;
    if (owed > 0) {                       // the entry of a layer that just closed: this layer takes it over
      owed -= 1;
      if (!owed) cancelFlush();
      replace({ mcdLayer: id });
    } else if (!push({ mcdLayer: id })) return false;
    stack.push({ id: id, close: close });
    return true;
  }
  /** closed(id): the layer closed itself (Tutup, Esc, a tap outside); its entry is given back a moment later. */
  function closed(id) {
    var i = indexOf(String(id || ''));
    if (i < 0) return false;
    stack.splice(i, 1);
    owed += 1;
    scheduleFlush();
    return true;
  }
  /** reset(reason): every layer closes (a section change, the lock); their entries are given back unless a navigation
      entry replaces them first (release). Returns the number of layers closed. */
  function reset(reason) {
    var list = stack.splice(0);
    owed += list.length;
    list.reverse().forEach(function (l) { try { l.close({ via: reason || 'section' }); } catch (e) { /* the layer is gone anyway */ } });
    if (owed > 0 && reason !== 'lock') scheduleFlush();
    if (reason === 'lock') { owed = 0; cancelFlush(); }
    return list.length;
  }
  /** release() → true when the current history entry is a layer entry: state.js then replaces it instead of pushing a
      section or view entry. The layers still open are forgotten (Back no longer closes them; they register again if
      they open again). */
  function release() {
    var n = owed + stack.length;
    if (n <= 0) return false;
    stack = [];
    owed = 0;
    cancelFlush();
    return true;
  }
  /** guard(onFirstBack): after sign-in, the first Back stays here and calls onFirstBack (the toast). */
  function guard(onFirstBack) {
    if (typeof onFirstBack !== 'function' || !active()) return false;
    if (!replace({ mcdBase: 1 }) || !push({ mcdHome: 1 })) return false;
    guardFn = onFirstBack;
    guardT = null;
    return true;
  }

  function onPop(e) {
    var stop = function () { if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation(); };
    if (skip > 0) { skip -= 1; stop(); return; }
    var st = e && e.state;
    if (owed > 0) {                       // Back pressed before the closed layer gave its entry back
      owed -= 1;
      if (!owed) cancelFlush();
      stop();
      return;
    }
    var top = stack.pop();
    if (top) {
      stop();
      try { top.close({ via: 'back' }); } catch (x) { /* the layer is gone anyway */ }
      return;
    }
    if (st && st.mcdLayer) {              // a layer entry left behind by a navigation: skip it
      stop();
      var H = hist();
      try { if (H && typeof H.back === 'function') H.back(); } catch (x) { /* stays */ }
      return;
    }
    if (st && st.mcdBase && guardFn) {
      stop();
      var t = now();
      if (guardT == null || t - guardT > GAP_MS) {
        guardT = t;
        try { guardFn(); } catch (x) { /* the toast is optional */ }
        push({ mcdHome: 1 });
      } else {
        var H2 = hist();
        try { if (H2 && typeof H2.back === 'function') H2.back(); } catch (x) { /* stays */ }
      }
    }
  }
  if (typeof W.addEventListener === 'function') W.addEventListener('popstate', onPop);
  try {
    if (W.document && typeof W.document.addEventListener === 'function') {
      W.document.addEventListener('mcd:gate-locking', function () { reset('lock'); guardFn = null; });
    }
  } catch (e) { /* no document */ }

  MCD.back = {
    open: open, closed: closed, guard: guard, reset: reset, release: release, active: active,
    depth: function () { return stack.length; },
    has: function (id) { return indexOf(String(id || '')) >= 0; },
    /* tests */
    _state: function () { return { depth: stack.length, ids: stack.map(function (x) { return x.id; }), owed: owed, skip: skip, guarded: !!guardFn }; },
    _flush: function () { cancelFlush(); flush(); },
    _reset: function () { stack = []; owed = 0; skip = 0; cancelFlush(); guardFn = null; guardT = null; },
    GAP_MS: GAP_MS, MQ: MQ
  };
})(typeof window !== 'undefined' ? window : null);
