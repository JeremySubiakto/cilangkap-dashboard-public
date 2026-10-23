/* ==========================================================================
 * MCD.inst: the pieces Sekolah and Kampus share (docs/V6_SPEC.md §3.1, §4, §5; INTEGRATION_NOTES §18).
 *
 *   scope            the 5 / 15 / 30 km view setting per section, per browser tab (sessionStorage 'mcd.scope.v1',
 *                    numbers only, memory fallback): get(section, fallback), set(section, v), on(fn) → off,
 *                    options(section), values(section), KEY, DEFAULTS. A scope is not a filter (D4).
 *                    Every section opens at 5 km (21 Oct 2026); Merchant offers 5 / 15 only (its data ends at 15 km).
 *   scopeSwitch(o)   the one "Cakupan 5 km | 15 km | 30 km" control: div.scope[role=radiogroup] on the shared .seg look,
 *                    roving tabindex, arrows / Home / End, live announcement, status line, once-per-browser hint.
 *                    o.value is painted, never stored; every switch follows scope.on; el.set(v) / el.mcdScope.
 *   scopeSummary(s)  {label, value, options, set(v)} for a section's summary().scope (§3.6).
 *   tierOf(id)       kelas biaya of a school or campus row id (§4.1); undefined while the tier file is not in.
 *   tierChip, tierBars, tierBlock, tierFilter, tierCounts, tierKey, tierFilterLabel, tierCsv
 *   tierLegendRows   the map legend group "Kelas biaya" as MCD.map legend rows (data, no DOM); tierLegendNodes = DOM
 *   contactOf(id)    institutional contacts of a school or campus row id (§5.1); schools join on the row's npsn.
 *   contactBlock     the "Kontak & identitas" fold (§5.2): the source most rows share is said once ("Sumber kontak: …"),
 *                    a row from another source keeps its own note; contactCsv; phonesOf, telOf, mailOf, safeUrl
 *   logo(name)       a source or product logo on its white tile (COPY_STYLE_EN items 46-47, D22)
 *   data             state(name), load(name) → Promise (never rejects), on(fn) → off: the four lazy v6 files, by short
 *                    name (tiers, contacts, campuses, students) or lazy name (institution-tiers, school-contacts, …)
 *   adapters         QA hooks: the row look-ups behind the functions above
 *
 * Rules kept here (tests/institutions-v6.test.mjs pins them):
 * - DOM by createElement / textContent / setAttribute only; never innerHTML. No fetch, no network: the data files
 *   come through MCD.app.lazy (one script injection each, works from file://).
 * - Contacts are institutional only. Phone and e-mail only from an official register (Sekolah Kita / Dapodik,
 *   Data Referensi, PDDikti); a value whose source is OpenStreetMap or Overture is never shown.
 * - D17: a website is a link only after the check opened it (schools: the file's webLink(row); campuses: the
 *   same rule). 'gagal' = host as text, 'dibuang' = one line and no address.
 * - D18: a number without an area code has no tel: link; it shows as published with the tag "tanpa kode area".
 *   "62…" written without "+" dials as +62… when 10 or more digits follow from 62; a shorter one is a local number.
 * - D7: while "Samarkan nama" is on, phone, e-mail, website, address and every outside link leave the DOM;
 *   NPSN and kode PT stay.
 * - A tier row that breaks the rules of §1.4 is refused (shown as "Belum diketahui", never as a guess).
 *
 * Classic IIFE with a UMD tail (MCD.inst in the browser, module.exports in Node). No DOM access at load time.
 * ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.MCD = root.MCD || {}; root.MCD.inst = api; }
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
  'use strict';

  var VERSION = '6.0.0';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HAS = Object.prototype.hasOwnProperty;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isStr(x) { return typeof x === 'string' && x.length > 0; }
  function mcd() { return (root && root.MCD) || {}; }
  function doc() { return root && root.document; }
  function own(o, k) { return o != null && HAS.call(o, k); }

  /* ================================================================ text */

  function fmtInt(n) {
    if (!isNum(n)) return '—';
    var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? '−' + s : s;
  }
  /** '2026-10-18' → '18 Okt 2026' (UTC parts; null when the value is not a date). */
  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v == null ? '' : v));
    if (!m) return null;
    var mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return d + ' ' + MONTHS[mo - 1] + ' ' + m[1];
  }
  function cap(s) { s = String(s == null ? '' : s).trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  /** First letter capital, one full stop at the end (D21: "Situs dibuka, biaya tidak dipublikasikan."). */
  function sentence(s) { s = cap(s); if (!s) return ''; return /[.!?…]$/.test(s) ? s : s + '.'; }
  function plainText(v, max) {
    if (typeof v !== 'string') return null;
    var s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (!s) return null;
    if (max && s.length > max) s = s.slice(0, max - 1).trim() + '…';
    return s;
  }

  /* ========================================================== validators */

  var SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|blogspot\.com|blogspot\.co\.id|wordpress\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|linktr\.ee|linkedin\.com|wixsite\.com|weebly\.com|sites\.google\.com|google\.com)$/;

  /**
   * safeUrl(v) → {url, host, https, social, path} | null. Only http(s) with a real host name (a dot, a letter
   * TLD), no credentials, no spaces or control characters. Everything else (javascript:, data:, vbscript:, ftp:,
   * protocol-relative, mailto:, an IP or localhost) is refused.
   */
  function safeUrl(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    if (!s || s.length > 2048) return null;
    if (/[\s\u0000-\u001F\u007F<>"`\\]/.test(s)) return null;
    if (!/^https?:\/\/[^/]/i.test(s)) return null;
    var U = root && root.URL;
    if (typeof U !== 'function') return null;
    var u;
    try { u = new U(s); } catch (e) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    var hostName = String(u.hostname || '').toLowerCase().replace(/\.$/, '');
    if (!/^[a-z0-9.-]+$/.test(hostName) || hostName.indexOf('.') < 0) return null;
    if (/^[\d.]+$/.test(hostName)) return null;
    if (!/\.([a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(hostName)) return null;
    if (/(^|\.)(localhost|local|internal|test|example|invalid)$/.test(hostName)) return null;
    if (/(^|\.)-|-(\.|$)|\.\./.test(hostName)) return null;
    var host = hostName.replace(/^www\./, '');
    var path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '';
    return { url: u.href, host: host, https: u.protocol === 'https:', social: SOCIAL.test(hostName), path: path };
  }
  /** The host part of a malformed address, for plain text only ('' when nothing readable is left). */
  function looseHost(raw) {
    var t = String(raw == null ? '' : raw).trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[\/?#\s]/)[0].toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9][a-z0-9.-]{1,78}[a-z0-9]$/.test(t) ? t : '';
  }
  /** Text for a site: the host; a social page adds its first path part ("facebook.com/smakatolik"). */
  function siteText(w) {
    if (!w) return '';
    if (w.social && w.path) {
      var seg = w.path.split('/').filter(Boolean)[0] || '';
      var t = w.host + (seg ? '/' + seg : '');
      return t.length > 44 ? t.slice(0, 43) + '…' : t;
    }
    return w.host;
  }

  /** A trailing extension ("ext 7733", "psw. 12", "pes 3"): shown as published, never dialled. */
  var TEL_EXT = /\s*\(?\s*(?:ext|extension|psw|pes|pesawat)(?![a-z])\.?\s*:?\s*\d[\d\s\-]*\)?$/i;
  /** A leading "(+62-21)" / "(+62)" / "(62 21)" → "+62 21 " (the country code written in brackets). */
  var TEL_CC_BRACKET = /^\(\s*\+?\s*62\s*[-.\s]?\s*(\d{0,4})\s*\)\s*/;

  /**
   * telOf(v) → {display, digits, tel, noArea} | null for one number as published. 7–15 digits after cleaning
   * (an optional leading +; a trailing short range such as "-71" or an extension such as "ext 7733" is shown but
   * not dialled; a leading "(+62-21)" reads as "+62 21").
   * Area code (D18): digits that start with 0 are a full national number (tel:0…). The country code 62 counts only
   * with a "+" or when at least 10 digits follow from it ("622182410830" → tel:+622182410830, so a phone does not
   * dial it as a local number); a shorter number that happens to start with 62 ("6254126") is a local number.
   * noArea: neither of the above; then tel is null and the card shows the tag "tanpa kode area".
   */
  function telOf(v) {
    if (typeof v !== 'string' && !isNum(v)) return null;
    var display = String(v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[,;.\-\s]+|[,;.\-\s]+$/g, '');
    if (!display || display.length > 40) return null;
    var core = display.replace(TEL_EXT, '');
    if (!core) return null;
    var cc = TEL_CC_BRACKET.exec(core);
    if (cc) core = '+62 ' + (cc[1] ? cc[1] + ' ' : '') + core.slice(cc[0].length);
    if (/[^0-9+()\-.\s]/.test(core)) return null;               // letters, slashes, other words: not one number
    var range = /^(.*\d{6,})\s*-\s*\d{1,3}$/.exec(core);        // "021-71004870-71": the range ending is not dialled
    if (range) core = range[1];
    var plus = /^\+/.test(core);
    if (core.indexOf('+') > 0) return null;
    var digits = core.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    var tel = null;
    if (plus) tel = /^0/.test(digits) ? 'tel:' + digits : 'tel:+' + digits;   // "+021…" written by mistake: the 0 number
    else if (/^0/.test(digits)) tel = 'tel:' + digits;
    else if (/^62/.test(digits) && digits.length >= 10) tel = 'tel:+' + digits;
    return { display: display, digits: digits, tel: tel, noArea: !tel };
  }
  function telOk(href) { return typeof href === 'string' && /^tel:\+?\d{7,15}$/.test(href); }

  /**
   * phonesOf(value, {mobile, src}) → [{display, tel, mobile, noArea, src}]. value: a campus phone string with several
   * numbers ("021 70970651, 845172"), split on , ; / \ "atau" "dan"; or an array of school entries {number, mobile}.
   * A part that is not 7–15 digits is dropped. A campus part is mobile only when the row's mobile flag is set and its
   * digits start with 08 or 628.
   */
  function phonesOf(value, o) {
    o = o || {};
    var out = [], seen = {};
    function add(raw, mob) {
      var t = telOf(raw);
      if (!t || seen[t.digits]) return;
      seen[t.digits] = 1;
      out.push({ display: t.display, tel: t.tel, mobile: !!mob, noArea: t.noArea, src: o.src || null });
    }
    if (Array.isArray(value)) {
      value.forEach(function (p) {
        if (!p) return;
        if (typeof p === 'string') { add(p, false); return; }
        add(p.number, p.mobile === true);
      });
      return out;
    }
    if (typeof value !== 'string' && !isNum(value)) return out;
    String(value).split(/[,;\/\\]|\batau\b|\bdan\b/i).forEach(function (part) {
      var t = telOf(part);
      if (!t) return;
      add(part, !!o.mobile && /^(08|628)/.test(t.digits));
    });
    return out;
  }

  /** mailOf(v) → {value, href} | null: one @, a dotted domain, no spaces, quotes, angle brackets or URL parts. */
  function mailOf(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim().toLowerCase();
    if (!s || s.length > 254) return null;
    if (!/^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9_])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/.test(s)) return null;
    if (/\.\./.test(s)) return null;
    return { value: s, href: 'mailto:' + s };
  }

  /* ================================================================= DOM */

  /** h('a', {class, text, attr: value, on: {click: fn}}, kids…): setAttribute and text nodes only. */
  function h(tag, attrs) {
    var d = doc();
    var n = d.createElement(tag);
    setAttrs(n, attrs);
    for (var i = 2; i < arguments.length; i++) append(n, arguments[i]);
    return n;
  }
  function s(tag, attrs) {
    var d = doc();
    var n = d.createElementNS ? d.createElementNS(SVG_NS, tag) : d.createElement(tag);
    setAttrs(n, attrs);
    for (var i = 2; i < arguments.length; i++) append(n, arguments[i]);
    return n;
  }
  function setAttrs(n, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') { n.textContent = String(v); return; }
      if (k === 'on') { Object.keys(v).forEach(function (ev) { n.addEventListener(ev, v[ev]); }); return; }
      if (k === 'class') { v = Array.isArray(v) ? v.filter(Boolean).join(' ') : String(v); if (!v) return; }
      n.setAttribute(k, v === true ? '' : String(v));
    });
  }
  function append(n, c) {
    if (c == null || c === false || c === true) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(n, x); }); return; }
    if (typeof c === 'string' || typeof c === 'number') { n.appendChild(doc().createTextNode(String(c))); return; }
    n.appendChild(c);
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function icon(name, cls) {
    var U = mcd().util;
    if (U && typeof U.icon === 'function') { try { var ic = U.icon(name, cls); if (ic) return ic; } catch (e) { /* own below */ } }
    var use = s('use', { href: '#i-' + name });
    return s('svg', { class: ['icon', 'i', 'i-' + name, cls], width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false' }, use);
  }
  var uidN = 0;
  function uid(p) { uidN += 1; return (p || 'inst') + '-' + uidN; }
  function now() { return Date.now(); }
  /** A listener of a built node may stop once the node left the page: seen on the page before, or older than 2 s off it. */
  function gone(n) {
    if (!n || n.isConnected !== false) { if (n && n.isConnected) n.__mcdSeen = true; return false; }
    return !!n.__mcdSeen || (n.__mcdBorn && now() - n.__mcdBorn > 2000);
  }
  function srOnly(text) { return h('span', { class: 'sr-only', text: text }); }
  function note(text, cls) { return h('p', { class: ['inst-note', cls], text: text }); }
  /** One "label: value" line (.dd-kv, as every card) with an optional small source note under it. */
  function kv(k, v, src, cls) {
    var row = h('div', { class: ['dd-kv', 'inst-kv', cls] }, h('span', { class: 'dd-kv__k', text: k }), h('span', { class: 'dd-kv__v' }, v));
    if (!src) return row;
    return h('div', { class: 'inst-row' }, row, h('p', { class: 'inst-src', text: src }));
  }
  /** An outside link: opens only on a click, in a new tab, without referrer or opener (§5.2). srName: words read before the text. */
  function extLink(href, text, title, cls, srName) {
    return h('a', { class: ['inst-ext', cls], href: href, target: '_blank', rel: 'noopener noreferrer', referrerpolicy: 'no-referrer', title: title || null },
      srName ? srOnly(srName + ' ') : null, h('span', { class: 'inst-ext__t', text: text }), icon('external', 'inst-ext__i'), srOnly(', terbuka di tab baru'));
  }
  function toastOf(o) {
    if (o && typeof o.toast === 'function') return o.toast;
    return function (m, k) { var A = mcd().app; if (A && typeof A.toast === 'function') A.toast(m, k); };
  }
  function veiled(o) {
    if (o && typeof o.veiled === 'boolean') return o.veiled;
    var A = mcd().app;
    try { return !!(A && typeof A.privacyMode === 'function' && A.privacyMode() === 'veil'); } catch (e) { return false; }
  }

  /** Copy text to the clipboard → Promise<boolean> (never rejects): the async API, else a hidden textarea. */
  function copyText(text) {
    var nav = root && root.navigator;
    function legacy() {
      var d = doc();
      if (!d || !d.body || typeof d.execCommand !== 'function') return false;
      var ta = h('textarea', { class: 'sr-only', readonly: true, 'aria-hidden': 'true', tabindex: '-1' });
      ta.value = text;
      d.body.appendChild(ta);
      var ok = false;
      try { ta.select(); ok = !!d.execCommand('copy'); } catch (e) { ok = false; }
      if (ta.parentNode) ta.parentNode.removeChild(ta);
      return ok;
    }
    try {
      if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        return Promise.resolve(nav.clipboard.writeText(String(text))).then(function () { return true; }, function () { return legacy(); });
      }
    } catch (e) { /* legacy below */ }
    return Promise.resolve(legacy());
  }
  /** "Salin" button: copies value, toasts done (or the shared "not available" line). */
  function copyBtn(value, ariaLabel, doneText, o) {
    var b = h('button', { type: 'button', class: 'btn btn--ghost btn--xs inst-copy', 'aria-label': ariaLabel, title: ariaLabel }, icon('copy'), h('span', { text: 'Salin' }));
    b.addEventListener('click', function () {
      var t = toastOf(o);
      copyText(value).then(function (ok) { t(ok ? doneText : 'Fitur salin tidak tersedia di browser ini', ok ? null : 'warn'); });
    });
    return b;
  }

  /* ============================================================ the files */

  var FILES = {
    tiers: { lazy: 'institution-tiers', global: 'MCD_INSTITUTION_TIERS' },
    contacts: { lazy: 'school-contacts', global: 'MCD_SCHOOL_CONTACTS' },
    campuses: { lazy: 'campuses', global: 'MCD_CAMPUSES' },
    students: { lazy: 'school-students', global: 'MCD_SCHOOL_STUDENTS' }
  };
  var LOAD = {};
  var dataFns = [];
  function dataOf(name) {
    var f = FILES[name], g = f && root ? root[f.global] : null;
    return g && Array.isArray(g.rows) && g.meta && typeof g.meta === 'object' ? g : null;
  }
  /** 'tiers' | 'contacts' | 'campuses' | 'students', or the lazy name of the same file ('institution-tiers', …). */
  function fileKey(name) {
    if (own(FILES, name)) return name;
    for (var k in FILES) if (own(FILES, k) && FILES[k].lazy === name) return k;
    return null;
  }
  function dataState(name) {
    name = fileKey(name);
    if (!name) return 'error';
    if (dataOf(name)) return 'ready';
    if (LOAD[name]) return LOAD[name].state;
    /* integration 22 Oct 2026: a load a section started itself (Sekolah's SC.lazy, Kampus) has its state in the shell */
    var A = mcd().app;
    if (A && typeof A.lazyState === 'function') {
      try { var s = A.lazyState(FILES[name].lazy); if (s === 'loading' || s === 'error') return s; } catch (e) { /* idle */ }
    }
    return 'idle';
  }
  function emitData(name) {
    var st = dataState(name);
    var ev = { name: name, lazy: FILES[name].lazy, state: st };
    dataFns.slice().forEach(function (fn) { try { fn(ev); } catch (e) { /* a listener must not break another */ } });
  }
  /** load(name) → Promise<global | null>; never rejects; one request at a time; retried after a failure. */
  function dataLoad(name) {
    name = fileKey(name);
    if (!name) return Promise.resolve(null);
    var g = dataOf(name);
    if (g) return Promise.resolve(g);
    var l = LOAD[name];
    if (l && l.state === 'loading') return l.promise;
    var A = mcd().app;
    l = LOAD[name] = { state: 'loading', promise: null };
    if (!A || typeof A.lazy !== 'function') {
      l.state = 'error';
      l.promise = Promise.resolve(null);
      emitData(name);
      return l.promise;
    }
    var p;
    try { p = Promise.resolve(A.lazy(FILES[name].lazy)); } catch (e) { p = Promise.reject(e); }
    l.promise = p.then(function () {
      l.state = dataOf(name) ? 'ready' : 'error';
      emitData(name);
      return dataOf(name);
    }, function () {
      l.state = 'error';
      emitData(name);
      return null;
    });
    emitData(name);
    return l.promise;
  }
  function dataOn(fn) {
    if (typeof fn !== 'function') return function () {};
    dataFns.push(fn);
    return function () { dataFns = dataFns.filter(function (f) { return f !== fn; }); };
  }

  var IDX = {};
  function index(name, keyOf) {
    var g = dataOf(name);
    if (!g) return null;
    var c = IDX[name];
    if (!c || c.src !== g || c.n !== g.rows.length) {
      var m = Object.create(null);
      g.rows.forEach(function (r) { if (!r) return; var k = keyOf(r); if (k != null && !(k in m)) m[k] = r; });
      c = IDX[name] = { src: g, n: g.rows.length, map: m };
    }
    return c.map;
  }
  function tierRow(id) { var m = index('tiers', function (r) { return r.id; }); return m ? m[id] || null : null; }
  function contactRow(npsn) { var m = index('contacts', function (r) { return r.npsn; }); return m && npsn ? m[String(npsn)] || null : null; }
  function campusRow(id) {
    var C = mcd().campus;
    if (C && typeof C.byId === 'function') { try { var r = C.byId(id); if (r) return r; } catch (e) { /* own index below */ } }
    var m = index('campuses', function (r) { return r.id; });
    return m ? m[id] || null : null;
  }
  function studentRow(id) {
    var S = mcd().schools && mcd().schools.students;
    if (S && typeof S.byId === 'function') { try { var r = S.byId(id); if (r) return r; } catch (e) { /* own index below */ } }
    var m = index('students', function (r) { return r.id; });
    return m ? m[id] || null : null;
  }

  /* ======================================================== ids and kinds */

  var KEY_RE = /^(npsn:\d{8}|app:-?\d{1,3}\.\d{5},-?\d{1,2}\.\d{5}|pt:\d{6}|osm:(node|way|relation)\/\d+|ovt:[0-9a-f]{8,40})$/;
  /** 'sekolah' for npsn:/app: ids, 'kampus' for pt:/osm:/ovt:, null for anything else. */
  function kindOf(id) {
    var k = String(id == null ? '' : id);
    if (!KEY_RE.test(k)) return null;
    return /^(npsn|app):/.test(k) ? 'sekolah' : 'kampus';
  }

  /* ================================================================ scope */

  var SCOPE_KEY = 'mcd.scope.v1';
  var SCOPE_VALUES = [5, 15, 30];
  /* merge of the public prototype (23 Oct 2026): the two sections that came after the teammates' base, Kesehatan
     ('health') and Calon Prioritas ('wealth'), open at 5 km as well */
  var SCOPE_DEFAULTS = { schools: 5, campus: 5, merchants: 5, property: 5, health: 5, wealth: 5 };
  /* the merchant file (data/sme-pois.js) ends at 15 km, so Merchant has no 30 km */
  var SCOPE_LIMITS = { merchants: [5, 15] };
  var SCOPE_SECTION = /^[a-z][a-z0-9-]{0,23}$/;
  var scopeMem = null;
  var scopeFns = [];
  function ss() {
    try { var x = root && root.sessionStorage; if (x) { x.getItem(SCOPE_KEY); return x; } } catch (e) { /* blocked */ }
    return null;
  }
  function scopeRead() {
    if (scopeMem) return scopeMem;
    var out = {}, st = ss();
    if (st) {
      try {
        var raw = st.getItem(SCOPE_KEY), o = raw ? JSON.parse(raw) : null;
        if (o && typeof o === 'object' && o.v === 1) {
          Object.keys(o).forEach(function (k) { if (k !== 'v' && SCOPE_SECTION.test(k) && scopeValues(k).indexOf(o[k]) >= 0) out[k] = o[k]; });
        }
      } catch (e) { /* a damaged value starts over */ }
    }
    scopeMem = out;
    return out;
  }
  function scopeWrite() {
    var st = ss();
    if (!st) return false;
    var o = { v: 1 };
    Object.keys(scopeMem || {}).forEach(function (k) { if (scopeValues(k).indexOf(scopeMem[k]) >= 0) o[k] = scopeMem[k]; });
    try { st.setItem(SCOPE_KEY, JSON.stringify(o)); return true; } catch (e) { return false; }
  }
  /** The values a section offers: 5 / 15 / 30 km, or fewer where its data ends sooner (SCOPE_LIMITS). */
  function scopeValues(section) { return own(SCOPE_LIMITS, section) ? SCOPE_LIMITS[section] : SCOPE_VALUES; }
  function scopeGet(section, fallback) {
    var m = scopeRead(), vals = scopeValues(section);
    if (SCOPE_SECTION.test(String(section)) && own(m, section) && vals.indexOf(m[section]) >= 0) return m[section];
    if (vals.indexOf(fallback) >= 0) return fallback;
    return own(SCOPE_DEFAULTS, section) ? SCOPE_DEFAULTS[section] : 5;
  }
  /** set(section, 5 | 15 | 30) → the value, or null when refused. Listeners hear only a real change. */
  function scopeNum(v) { return typeof v === 'string' && /^\s*\d{1,3}\s*$/.test(v) ? parseInt(v, 10) : v; }
  function scopeSet(section, v) {
    v = scopeNum(v);
    if (!SCOPE_SECTION.test(String(section)) || scopeValues(section).indexOf(v) < 0) return null;
    var m = scopeRead(), prev = scopeGet(section);
    m[section] = v;
    scopeWrite();
    if (prev !== v) {
      var ev = { section: section, value: v, previous: prev };
      scopeFns.slice().forEach(function (fn) { try { fn(ev); } catch (e) { /* next listener */ } });
      var d = doc(), CE = root && root.CustomEvent;
      if (d && typeof d.dispatchEvent === 'function' && typeof CE === 'function') {
        try { d.dispatchEvent(new CE('mcd:scope', { detail: ev })); } catch (e) { /* ignore */ }
      }
    }
    return v;
  }
  function scopeOn(fn) {
    if (typeof fn !== 'function') return function () {};
    scopeFns.push(fn);
    return function () { scopeFns = scopeFns.filter(function (f) { return f !== fn; }); };
  }
  function scopeOptions(section) { return scopeValues(section).map(function (v) { return { v: v, label: v + ' km' }; }); }

  var SCOPE_TIP = {
    schools: 'Sekolah dalam radius 5 km, 15 km atau 30 km dari Mabes TNI. 15 km adalah cakupan pilot.',
    campus: 'Kampus dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.',
    merchants: 'Merchant dalam radius 5 km atau 15 km dari Mabes TNI. Data merchant hanya sampai 15 km.',
    property: 'Proyek perumahan dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.',
    health: 'Fasilitas kesehatan dalam radius 5 km, 15 km atau 30 km dari Mabes TNI. 15 km adalah cakupan pilot.',
    wealth: 'Tempat dalam radius 5 km, 15 km atau 30 km dari Mabes TNI.'
  };

  /**
   * scopeSwitch({section, value?, onChange?(v), vertical?, wide?, label?, tip?, announce?(v) → string, hint?: {id, text, at}})
   * → div.scope-field holding div.scope[role=radiogroup] with a button[role=radio] per value (5 km, 15 km, 30 km). Every switch on
   * the page follows MCD.inst.scope. el.mcdScope = {get(), set(v), status(text | null, {retry, busy}), say(text), destroy()}.
   */
  function scopeSwitch(o) {
    o = o || {};
    var section = SCOPE_SECTION.test(String(o.section)) ? o.section : 'schools';
    var vertical = !!o.vertical;
    var tip = o.tip || SCOPE_TIP[section] || SCOPE_TIP.schools;
    var showLabel = o.label !== false && !vertical;
    var group = h('div', {
      class: ['scope', 'seg', vertical ? 'scope--v' : null], role: 'radiogroup', 'aria-label': 'Cakupan jarak dari Mabes TNI',
      'aria-orientation': vertical ? 'vertical' : 'horizontal', title: vertical ? 'Cakupan. ' + tip : tip
    });
    var VALS = scopeValues(section);
    var btns = VALS.map(function (v) {
      var b = h('button', { type: 'button', role: 'radio', class: 'seg__opt scope__opt', 'data-v': v, 'aria-checked': 'false', tabindex: '-1', text: v + ' km' });
      b.addEventListener('click', function () { choose(v, true); });
      group.appendChild(b);
      return b;
    });
    var live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    var status = h('p', { class: 'scope-field__status', 'aria-live': 'polite', hidden: true });
    var hintSlot = h('div', { class: 'scope-field__hint' });
    var wrap = h('div', { class: ['scope-field', vertical ? 'scope-field--v' : null, o.wide ? 'scope-field--wide' : null], 'data-section': section },
      showLabel ? h('span', { class: 'scope-field__l', 'aria-hidden': 'true', text: 'Cakupan' }) : null, group, live, vertical ? null : status, vertical ? null : hintSlot);
    var cur = null;

    function paint(v) {
      cur = v;
      btns.forEach(function (b, i) {
        var on = VALS[i] === v;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
        b.classList.toggle('is-active', on);
      });
      paintHint(v);
    }
    var hintAt = null;
    function paintHint(v) {
      if (!o.hint || vertical || v === hintAt) return;
      hintAt = v;
      clear(hintSlot);
      if (v !== (o.hint.at || 30) || !o.hint.text) return;
      var n = note(o.hint.text, 'scope-field__hintp');
      var W = mcd().windows;
      if (o.hint.id && W && typeof W.hint === 'function') { try { n = W.hint(o.hint.id, n); } catch (e) { /* show it */ } }
      if (n) hintSlot.appendChild(n);
    }
    function say(text) {
      if (!text) return;
      live.textContent = '';
      var st = root && root.setTimeout;
      if (typeof st === 'function') st(function () { live.textContent = text; }, 30);
      else live.textContent = text;
    }
    function choose(v, user) {
      var was = cur;                                 /* what this switch shows (the section's own scope) */
      var got = scopeSet(section, v);
      if (got == null) return;
      paint(got);
      if (!user || got === was) return;
      wrap.__mcdSeen = true;
      if (typeof o.onChange === 'function') { try { o.onChange(got); } catch (e) { /* the section reports its own errors */ } }
      var text = 'Cakupan ' + got + ' km.';
      if (typeof o.announce === 'function') { try { text = o.announce(got) || text; } catch (e) { /* default words */ } }
      say(text);
    }
    group.addEventListener('keydown', function (e) {
      var k = e.key, i = VALS.indexOf(cur), n = VALS.length, j = -1;
      if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = n - 1;
      if (j < 0) return;
      if (e.preventDefault) e.preventDefault();
      choose(VALS[j], true);
      if (btns[j] && typeof btns[j].focus === 'function') btns[j].focus();
    });
    wrap.__mcdBorn = now();
    var off = scopeOn(function (ev) {
      if (ev.section !== section) return;
      if (gone(wrap)) { off(); return; }
      paint(ev.value);
    });
    /* o.value: what the section shows now (painted, not stored: the section stores what it applies) */
    paint(VALS.indexOf(scopeNum(o.value)) >= 0 ? scopeNum(o.value) : scopeGet(section));

    wrap.mcdScope = {
      get: function () { return cur; },
      set: function (v) { choose(scopeNum(v), false); },
      say: say,
      /** status('Memuat jumlah siswa dalam 30 km…', {busy: true}) · status(text, {retry: fn}) · status(null) hides it. */
      status: function (text, so) {
        so = so || {};
        clear(status);
        if (!text) { status.hidden = true; status.setAttribute('hidden', ''); wrap.removeAttribute('aria-busy'); return; }
        status.hidden = false;
        status.removeAttribute('hidden');
        /* "… tidak dapat dimuat. Coba lagi." with a "Coba lagi" button: the button says it, once */
        status.appendChild(doc().createTextNode(typeof so.retry === 'function' ? String(text).replace(/\s*Coba lagi\.?\s*$/, '') : text));
        if (typeof so.retry === 'function') {
          var rb = h('button', { type: 'button', class: 'inst-linkbtn', text: 'Coba lagi' });
          rb.addEventListener('click', function () { so.retry(); });
          status.appendChild(doc().createTextNode(' '));
          status.appendChild(rb);
        }
        if (so.busy) wrap.setAttribute('aria-busy', 'true'); else wrap.removeAttribute('aria-busy');
      },
      destroy: function () { off(); }
    };
    wrap.set = wrap.mcdScope.set;                    /* the sections' own switch API: el.set(v) */
    return wrap;
  }
  /** summary().scope for a section (§3.6): {label, value, options, set(v)}. */
  function scopeSummary(section) {
    return {
      label: 'Cakupan', value: scopeGet(section), options: scopeOptions(section),
      title: SCOPE_TIP[section] || SCOPE_TIP.schools,
      set: function (v) { return scopeSet(section, v); }
    };
  }

  /* ================================================================ tiers */

  var TIER_LEVEL = { premium: 4, atas: 3, menengah: 2, reguler: 1 };
  var TIER_LABEL = { premium: 'Premium', atas: 'Atas', menengah: 'Menengah', reguler: 'Reguler', unknown: 'Belum diketahui' };
  var FILTER_IDS = ['premium', 'atas', 'menengah', 'reguler', 'unknown'];
  var BASES = { biaya: 1, jenis: 1, perkiraan: 1 };
  var AREAS = { tinggi: 1, sedang: 1, rendah: 1 };
  var TYPES = { sekolah: { spk: 1, negeri: 1, swasta: 1 }, kampus: { ptn: 1, kedinasan: 1, ptln: 1, swasta: 1, desain: 1 } };
  var FREE_TYPES = { negeri: 1, ptn: 1, kedinasan: 1 };        // without a published fee: Reguler, basis jenis
  var CAPPED_TYPES = { spk: 1, ptln: 1 };                      // without a published fee: at most Atas, basis jenis
  var TYPE_WORDS = {
    sekolah: { spk: 'SPK (Satuan Pendidikan Kerja Sama)', negeri: 'sekolah negeri', swasta: 'sekolah swasta' },
    kampus: { ptn: 'perguruan tinggi negeri', kedinasan: 'kampus kedinasan', ptln: 'cabang perguruan tinggi luar negeri', swasta: 'kampus swasta', desain: 'sekolah desain, seni atau kursus' }
  };

  function tierMetaOf(meta, tier) {
    var t = String(tier == null ? '' : tier).toLowerCase();
    var list = meta && Array.isArray(meta.tiers) ? meta.tiers : [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m && (String(m.id).toLowerCase() === t || String(m.label).toLowerCase() === t)) {
        var id = String(m.id).toLowerCase();
        if (!own(TIER_LEVEL, id)) return null;
        return { id: id, label: isStr(m.label) ? m.label : TIER_LABEL[id], level: isNum(m.level) ? m.level : TIER_LEVEL[id], text: m.text || {} };
      }
    }
    return null;
  }
  /** Why a tier row cannot be shown (V6_SPEC §1.4), or null when it keeps the rules. */
  function refuse(row, kind, meta) {
    if (!row || typeof row !== 'object') return 'no-row';
    var tm = tierMetaOf(meta, row.tier);
    if (!tm) return 'tier';
    if (tm.level !== TIER_LEVEL[tm.id]) return 'level';
    if (!own(BASES, row.basis)) return 'basis';
    var types = TYPES[kind] || {};
    if (!own(types, row.type)) return 'type';
    if (tm.id === 'premium' && row.basis !== 'biaya') return 'premium-needs-fee';
    if (row.basis === 'perkiraan' && tm.level > 3) return 'perkiraan-above-atas';
    if (row.basis === 'perkiraan' && !own(AREAS, row.area)) return 'area';
    if (row.basis !== 'biaya' && own(FREE_TYPES, row.type) && (tm.id !== 'reguler' || row.basis !== 'jenis')) return 'negeri-reguler';
    if (row.basis !== 'biaya' && own(CAPPED_TYPES, row.type) && (tm.level > 3 || row.basis !== 'jenis')) return 'spk-at-most-atas';
    if (row.basis === 'biaya' && !(row.fee && isStr(row.fee.text))) return 'fee';
    /* campuses by estimate: never above the calibrated cell of meta.perkiraanRule (at most Menengah in the 18 Oct data) */
    var cell = row.basis === 'perkiraan' && kind === 'kampus' && meta && meta.perkiraanRule && meta.perkiraanRule.table && meta.perkiraanRule.table.kampus
      ? tierMetaOf(meta, meta.perkiraanRule.table.kampus[row.area]) : null;
    if (cell && tm.level > cell.level) return 'perkiraan-above-cell';
    return null;
  }
  function typeWordsOf(kind, type, meta) {
    var m = meta && meta.types && meta.types[kind];
    return (m && isStr(m[type]) ? m[type] : (TYPE_WORDS[kind] && TYPE_WORDS[kind][type])) || '';
  }
  function basisWordsOf(kind, basis, type, area, year, meta) {
    var camp = kind === 'kampus';
    if (basis === 'biaya') {
      var head = camp ? 'Dari biaya kuliah resmi' : 'Dari biaya resmi';
      return year ? head + ', ' + year : head + ' (tahun tidak disebut)';
    }
    if (basis === 'jenis') return (camp ? 'Dari jenis kampus: ' : 'Dari jenis sekolah: ') + typeWordsOf(kind, type, meta);
    if (basis === 'perkiraan') {
      return (camp ? 'Perkiraan dari jenis kampus dan daya beli area' : 'Perkiraan dari jenis sekolah dan daya beli area') + (own(AREAS, area) ? ' (' + area + ')' : '');
    }
    return '';
  }
  function basisShortOf(kind, basis) {
    if (basis === 'biaya') return 'dari biaya resmi';
    if (basis === 'jenis') return kind === 'kampus' ? 'dari jenis kampus' : 'dari jenis sekolah';
    if (basis === 'perkiraan') return 'perkiraan';
    return '';
  }

  /**
   * tierOf(id) → undefined while data/institution-tiers.js is not in; else
   * {id, kind, tier, label, level, basis, basisWords, basisShort, preview, check, checkWords, type, typeWords, area,
   *  fee, year, url, quote, fetched, note, source, duplicateOf, invalid}. No row (or a refused row) = "Belum diketahui".
   */
  var TIER_CACHE = { src: null, map: null };
  function tierOf(id, o) {
    var T = dataOf('tiers');
    if (!T) return undefined;
    var key = String(id == null ? '' : id);
    var kind = (o && (o.kind === 'kampus' || o.kind === 'sekolah')) ? o.kind : (kindOf(key) || 'sekolah');
    /* lists ask for every row at each render: one frozen description per id and file */
    if (TIER_CACHE.src !== T) { TIER_CACHE.src = T; TIER_CACHE.map = Object.create(null); }
    var ck = kind + '|' + key;
    var t = TIER_CACHE.map[ck];
    if (!t) {
      t = describeTier(key, tierRow(key), kind, T.meta);
      if (t.fee) Object.freeze(t.fee);
      if (t.url) Object.freeze(t.url);
      t = TIER_CACHE.map[ck] = Object.freeze(t);
    }
    return t;
  }
  function describeTier(key, row, kind, meta) {
    var t = {
      id: key, kind: kind, tier: null, label: TIER_LABEL.unknown, level: 0, basis: null, basisWords: '', basisShort: '',
      preview: TIER_LABEL.unknown, check: null, checkWords: '', type: null, typeWords: '', area: null, fee: null, year: null,
      url: null, quote: null, fetched: null, note: null, source: null, duplicateOf: null, invalid: null
    };
    if (!row) return t;
    var bad = refuse(row, kind, meta);
    if (bad) { t.invalid = bad; return t; }
    var tm = tierMetaOf(meta, row.tier);
    var cw = meta && meta.checkWords && isStr(meta.checkWords[row.check]) ? meta.checkWords[row.check] : '';
    t.tier = tm.id;
    t.label = tm.label;
    t.level = tm.level;
    t.basis = row.basis;
    t.type = row.type;
    t.typeWords = typeWordsOf(kind, row.type, meta);
    t.area = own(AREAS, row.area) ? row.area : null;
    t.year = isStr(row.year) ? row.year : null;
    t.check = isStr(row.check) ? row.check : null;
    t.checkWords = sentence(cw);
    t.basisWords = basisWordsOf(kind, row.basis, row.type, t.area, t.year, meta);
    t.basisShort = basisShortOf(kind, row.basis);
    t.note = plainText(row.note, 600);
    t.duplicateOf = isStr(row.duplicateOf) ? row.duplicateOf : null;
    t.fetched = fmtDate(row.fetched) ? row.fetched : null;
    if (row.basis === 'biaya') {
      var f = row.fee;
      t.fee = {
        amount: isNum(f.amount) ? f.amount : null, kind: isStr(f.kind) ? f.kind : null, period: isStr(f.period) ? f.period : null,
        text: plainText(f.text, 400), computed: f.computed === true, min: f.min === true
      };
      t.url = safeUrl(row.url);
      t.quote = plainText(row.quote, 160);
      if (t.fetched) t.source = 'Sumber: situs resmi ' + (kind === 'kampus' ? 'kampus' : 'sekolah') + ', dibaca ' + fmtDate(t.fetched);
      t.preview = t.label + ' · dari biaya resmi, ' + (t.year || 'tahun tidak disebut');
    } else {
      t.preview = t.label + ' · ' + t.basisShort;
    }
    return t;
  }
  /** 'premium' | 'atas' | 'menengah' | 'reguler' | 'unknown' (also while the file is not in). */
  function tierKey(id) { var t = tierOf(id); return t && t.tier ? t.tier : 'unknown'; }
  /** Counts of ids per filter chip, plus biaya = rows from a published fee (duplicate points left out). */
  function tierCounts(ids) {
    var c = { premium: 0, atas: 0, menengah: 0, reguler: 0, unknown: 0, biaya: 0, total: 0 };
    (ids || []).forEach(function (id) {
      var t = tierOf(id);
      c.total += 1;
      c[t && t.tier ? t.tier : 'unknown'] += 1;
      if (t && t.basis === 'biaya' && !t.duplicateOf) c.biaya += 1;
    });
    return c;
  }
  function normValue(v) {
    var out = [];
    if (Array.isArray(v)) v.forEach(function (x) { if (FILTER_IDS.indexOf(x) >= 0 && out.indexOf(x) < 0) out.push(x); });
    else if (v && typeof v === 'object') FILTER_IDS.forEach(function (x) { if (v[x]) out.push(x); });
    else return FILTER_IDS.slice();
    return FILTER_IDS.filter(function (x) { return out.indexOf(x) >= 0; });
  }
  /** "Kelas biaya: Premium, Atas" for the header filter chip, or null when every chip is on. */
  function tierFilterLabel(value) {
    var v = normValue(value);
    if (v.length === FILTER_IDS.length) return null;
    return 'Kelas biaya: ' + (v.length ? v.map(function (x) { return TIER_LABEL[x]; }).join(', ') : 'tidak ada');
  }
  function tierMatch(id, value) { return normValue(value).indexOf(tierKey(id)) >= 0; }

  /** The "signal bars" glyph: 4 ascending bars, level of them drawn; filled = biaya or jenis, outline = perkiraan. */
  function tierBars(level, basis, o) {
    o = o || {};
    var lv = Math.max(0, Math.min(4, level | 0));
    var hollow = basis === 'perkiraan';
    var px = isNum(o.px) ? o.px : 12;
    var g = s('svg', {
      class: ['inst-bars', hollow ? 'inst-bars--hollow' : 'inst-bars--solid', o.cls], viewBox: '0 0 15 12', width: Math.round(px * 1.25), height: px,
      'aria-hidden': 'true', focusable: 'false', 'data-level': lv, 'data-basis': basis || 'none'
    });
    for (var i = 0; i < 4; i++) {
      var hh = 3 * (i + 1), on = i < lv;
      if (on && hollow) g.appendChild(s('rect', { class: 'inst-bars__on inst-bars__hollow', x: i * 4 + 0.5, y: 12 - hh + 0.5, width: 2, height: hh - 1, rx: 0.5 }));
      else g.appendChild(s('rect', { class: on ? 'inst-bars__on' : 'inst-bars__off', x: i * 4, y: 12 - hh, width: 3, height: hh, rx: 0.6 }));
    }
    return g;
  }
  /** Chip "▂▄▆ Atas" (bars + word) with the basis in its title; screen readers hear "Kelas biaya Atas, dari biaya resmi". */
  function tierChip(t) {
    if (typeof t === 'string') t = tierOf(t);
    if (!t) return null;
    if (!t.tier) {
      return h('span', { class: 'inst-tier inst-tier--none', 'data-tier': 'unknown', title: 'Kelas biaya belum diketahui' },
        srOnly('Kelas biaya '), h('span', { class: 'inst-tier__w', text: TIER_LABEL.unknown }));
    }
    return h('span', { class: 'inst-tier', 'data-tier': t.tier, 'data-basis': t.basis, title: t.basisWords },
      tierBars(t.level, t.basis), srOnly('Kelas biaya '), h('span', { class: 'inst-tier__w', text: t.label }), srOnly(', ' + t.basisShort));
  }
  function entryLine(kind) {
    return kind === 'kampus'
      ? 'Kelas biaya menunjukkan besar biaya kuliah. Kemudahan kerja sama tetap perlu ditanyakan ke kampus atau yayasan.'
      : 'Kelas biaya menunjukkan besar biaya sekolah. Sekolah negeri umumnya tanpa SPP. Kemudahan kerja sama tetap perlu ditanyakan ke sekolah atau yayasan.';
  }

  /** A card fold (.dd-blk, read by MCD.windows.fold): title, data-fold, data-preview, data-open; body in one div. */
  function foldShell(title, foldId, o) {
    var body = h('div', { class: 'inst-dd__body' });
    var sec = h('section', { class: ['dd-blk', 'inst-dd', 'inst-dd--' + foldId, o && o.cls], 'data-fold': foldId, 'data-open': o && o.open ? '1' : '0' },
      h('h3', { class: 't-eyebrow dd-blk__t', text: title }), body);
    return { el: sec, body: body };
  }
  function setPreview(sec, text) {
    if (!text) return;
    sec.setAttribute('data-preview', text);
    var pv = sec.querySelector ? sec.querySelector('.ws-fold__pv') : null;
    if (pv) pv.textContent = ' · ' + text;
  }
  /** Re-render a block when its file lands (or fails); the listener goes once the block left the page. */
  function whenData(names, sec, render) {
    sec.__mcdBorn = now();
    var off = dataOn(function (ev) {
      if (names.indexOf(ev.name) < 0 || ev.state === 'loading') return;
      if (gone(sec)) { off(); return; }
      render();
      if (names.every(function (n) { return dataState(n) === 'ready'; })) off();
    });
    return off;
  }

  /**
   * The highest class an estimate (basis perkiraan) can reach, from meta.perkiraanRule.table (final fix round, 23 Oct
   * 2026): kampus → 'Menengah'; sekolah by jenjang 'SMA' | 'SMK' | 'MA' → 'Atas' | 'Reguler' | 'Menengah' in the 18 Oct
   * data. null when the file or the row of the table is missing.
   */
  var CAP_JENIS = ['SMA', 'SMK', 'MA'];
  function perkiraanCap(kind, jenis) {
    var T = dataOf('tiers'), meta = T && T.meta, tab = meta && meta.perkiraanRule && meta.perkiraanRule.table;
    var row = tab ? tab[kind === 'kampus' ? 'kampus' : String(jenis || '').toUpperCase()] : null;
    if (!row || typeof row !== 'object') return null;
    var best = null;
    Object.keys(row).forEach(function (a) { var tm = tierMetaOf(meta, row[a]); if (tm && (!best || tm.level > best.level)) best = tm; });
    return best;
  }
  /**
   * capLine(kind, jenis?) → the honest line about estimates (final fix round): "Perkiraan untuk kampus paling tinggi
   * Menengah. Kampus dengan biaya tinggi yang tidak mempublikasikan biaya dapat tampil lebih rendah." For a school with
   * its jenjang: "Perkiraan untuk SMA swasta paling tinggi Atas. …"; without one, every jenjang in one line. '' when
   * the tier file is not in.
   */
  function capLine(kind, jenis) {
    if (kind === 'kampus') {
      var c = perkiraanCap('kampus');
      return c ? 'Perkiraan untuk kampus paling tinggi ' + c.label + '. Kampus dengan biaya tinggi yang tidak mempublikasikan biaya dapat tampil lebih rendah.' : '';
    }
    var tail = ' Sekolah dengan biaya tinggi yang tidak mempublikasikan biaya dapat tampil lebih rendah.';
    var j = String(jenis || '').toUpperCase();
    if (CAP_JENIS.indexOf(j) >= 0) {
      var cj = perkiraanCap('sekolah', j);
      return cj ? 'Perkiraan untuk ' + j + ' swasta paling tinggi ' + cj.label + '.' + tail : '';
    }
    var parts = [];
    CAP_JENIS.forEach(function (x) { var cx = perkiraanCap('sekolah', x); if (cx) parts.push(cx.label + ' untuk ' + x + ' swasta'); });
    if (!parts.length) return '';
    var said = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' dan ' + parts[parts.length - 1] : parts[0];
    return 'Perkiraan paling tinggi ' + said + '.' + tail;
  }

  /**
   * tierBlock(id, {kind?, veiled?, cls?, open?}) → the "Kelas biaya" fold (§4.4): chip, basis words, fee text, quote,
   * "Sumber: situs resmi …, dibaca …", "Buka sumber biaya" (new tab; not while veiled), the no-fee line from the row's
   * check (D21), the row note, then the entry line. Loads the tier file when needed and refreshes in place.
   * An estimate also says how high an estimate can go (capLine; o.jenis 'SMA' | 'SMK' | 'MA' for a school).
   */
  function tierBlock(id, o) {
    o = o || {};
    var key = String(id == null ? '' : id);
    var kind = o.kind === 'kampus' || o.kind === 'sekolah' ? o.kind : (kindOf(key) || 'sekolah');
    var f = foldShell('Kelas biaya', 'biaya', o);
    function render() {
      var b = clear(f.body), st = dataState('tiers');
      if (st !== 'ready') {
        if (st === 'error') { b.appendChild(note('Kelas biaya belum tersedia.')); setPreview(f.el, 'belum tersedia'); }
        else { b.appendChild(note('Memuat kelas biaya…', 'inst-note--busy')); setPreview(f.el, 'memuat…'); }
        return;
      }
      var t = tierOf(key, { kind: kind });
      setPreview(f.el, t.preview);
      if (!t.tier) {
        b.appendChild(h('p', { class: 'inst-tier-head' }, tierChip(t)));
        b.appendChild(note(kind === 'kampus' ? 'Kelas biaya belum diketahui. Data biaya dan jenis kampus belum cukup.' : 'Kelas biaya belum diketahui. Data biaya dan jenis sekolah belum cukup.'));
        b.appendChild(note(entryLine(kind), 'inst-note--entry'));
        return;
      }
      b.appendChild(h('p', { class: 'inst-tier-head' }, tierChip(t), h('span', { class: 'inst-tier-head__basis', text: t.basisWords })));
      if (t.basis === 'biaya') {
        if (t.fee && t.fee.text) b.appendChild(h('p', { class: 'inst-fee', text: t.fee.text }));
        if (t.quote) b.appendChild(h('p', { class: 'inst-quote', text: '“' + t.quote + '”' }));
        var srcLine = h('p', { class: 'inst-src inst-src--fee' }, t.source || 'Sumber: situs resmi ' + (kind === 'kampus' ? 'kampus' : 'sekolah'));
        b.appendChild(srcLine);
        if (t.url && !veiled(o)) {
          b.appendChild(h('p', { class: 'inst-linkline' },
            extLink(t.url.url, 'Buka sumber biaya', 'Buka sumber biaya di tab baru: ' + t.url.host + '. Perlu internet.'),
            h('span', { class: 'inst-host', text: t.url.host })));
        }
      } else if (t.checkWords) {
        b.appendChild(note(t.checkWords, 'inst-note--check'));
      }
      if (t.basis === 'perkiraan') { var cl = capLine(kind, o.jenis); if (cl) b.appendChild(note(cl, 'inst-note--cap')); }
      if (t.note) b.appendChild(note(t.note));
      b.appendChild(note(entryLine(kind), 'inst-note--entry'));
    }
    render();
    if (dataState('tiers') !== 'ready') { whenData(['tiers'], f.el, render); dataLoad('tiers'); }
    f.el.mcdRefresh = render;
    return f.el;
  }

  /** The "?" tip of the filter: bands from meta.tiers[].text, the three bases, the share of published fees. */
  function tierTipLines(kind, counts) {
    var T = dataOf('tiers'), lines = [];
    var camp = kind === 'kampus';
    (T && Array.isArray(T.meta.tiers) ? T.meta.tiers : []).slice().sort(function (a, b) { return (b.level || 0) - (a.level || 0); }).forEach(function (m) {
      var tx = m && m.text && m.text[camp ? 'kampus' : 'sekolah'];
      if (isStr(tx) && isStr(m.label)) lines.push(m.label + ': ' + tx + '.');
    });
    lines.push(camp ? 'Dari biaya resmi: biaya kuliah yang dipublikasikan di situs resmi kampus.' : 'Dari biaya resmi: biaya yang dipublikasikan di situs resmi sekolah.');
    lines.push(camp ? 'Dari jenis kampus: perguruan tinggi negeri dan kampus kedinasan masuk Reguler. Cabang perguruan tinggi luar negeri tanpa biaya resmi paling tinggi Atas.'
      : 'Dari jenis sekolah: sekolah negeri masuk Reguler. SPK (Satuan Pendidikan Kerja Sama) tanpa biaya resmi paling tinggi Atas.');
    lines.push(camp ? 'Perkiraan berarti kelas biaya dihitung dari jenis kampus dan daya beli area karena biaya resmi tidak dipublikasikan.'
      : 'Perkiraan berarti kelas biaya dihitung dari jenis sekolah dan daya beli area karena biaya resmi tidak dipublikasikan.');
    var cap = capLine(kind);
    if (cap) lines.push(cap);
    if (counts && isNum(counts.biaya)) {
      lines.push(camp ? 'Biaya resmi ditemukan untuk ' + fmtInt(counts.biaya) + ' kampus. Selebihnya dari jenis kampus atau perkiraan.'
        : 'Biaya resmi ditemukan untuk ' + fmtInt(counts.biaya) + ' sekolah. Selebihnya dari jenis sekolah atau perkiraan.');
    }
    return lines;
  }

  /**
   * tierFilter({kind, counts, value, onChange(value), state?, onRetry?, onLoad?}) → div.inst-tierf with
   * div[role=group][aria-label="Kelas biaya"] of five button.chip[aria-pressed] (Premium · Atas · Menengah · Reguler ·
   * Belum diketahui, each with its count), the entry line and a "?" tip. state: 'ready' | 'loading' | 'error'
   * (default: the tier file's own state; the file is loaded when missing and onLoad() runs when it lands).
   * el.mcdTier = {update({counts, value, state}), value()}.
   */
  function tierFilter(o) {
    o = o || {};
    var kind = o.kind === 'kampus' ? 'kampus' : 'sekolah';
    var value = normValue(o.value);
    var counts = o.counts || null;
    var stateOverride = o.state || null;
    var tipId = uid('tierf-tip');
    var tipBtn = h('button', { type: 'button', class: 'tipbtn inst-tipbtn', 'aria-expanded': 'false', 'aria-controls': tipId, 'aria-label': 'Apa itu kelas biaya', title: 'Apa itu kelas biaya' },
      h('span', { 'aria-hidden': 'true', text: '?' }));
    var tip = h('div', { class: 'inst-tip', id: tipId, hidden: true, role: 'note' });
    var group = h('div', { class: 'inst-tierf__chips', role: 'group', 'aria-label': 'Kelas biaya' });
    var line = note(entryLine(kind), 'inst-tierf__line');
    var stLine = h('p', { class: 'inst-note inst-tierf__state', 'aria-live': 'polite', hidden: true });
    var wrap = h('div', { class: 'inst-tierf', 'data-kind': kind },
      h('div', { class: 'inst-tierf__head' }, h('span', { class: 'inst-tierf__l', text: 'Kelas biaya' }), tipBtn), group, line, stLine, tip);
    var chips = {};
    FILTER_IDS.forEach(function (id) {
      var lv = TIER_LEVEL[id] || 0;
      var b = h('button', { type: 'button', class: 'chip inst-tierf__chip', 'data-tier': id, 'aria-pressed': 'true' },
        lv ? tierBars(lv, 'biaya', { cls: 'inst-tierf__bars' }) : null, h('span', { class: 'inst-tierf__w', text: TIER_LABEL[id] }), h('span', { class: 'chip__count' }));
      b.addEventListener('click', function () {
        var on = value.indexOf(id) >= 0;
        value = on ? value.filter(function (x) { return x !== id; }) : normValue(value.concat([id]));
        paint();
        if (typeof o.onChange === 'function') { try { o.onChange(value.slice()); } catch (e) { /* the section reports */ } }
      });
      chips[id] = b;
      group.appendChild(b);
    });
    tipBtn.addEventListener('click', function () {
      var open = tipBtn.getAttribute('aria-expanded') !== 'true';
      tipBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      tip.hidden = !open;
      if (open) tip.removeAttribute('hidden'); else tip.setAttribute('hidden', '');
      if (open) paintTip();
    });
    function paintTip() {
      clear(tip);
      tip.appendChild(h('p', { class: 'inst-tip__t', text: 'Kelas biaya' }));
      tierTipLines(kind, counts).forEach(function (l) { tip.appendChild(h('p', { class: 'inst-tip__p', text: l })); });
    }
    function state() { return stateOverride || dataState('tiers'); }
    function paint() {
      var st = state();
      var ready = st === 'ready';
      FILTER_IDS.forEach(function (id) {
        var b = chips[id], on = value.indexOf(id) >= 0;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        var n = counts && isNum(counts[id]) ? counts[id] : null;
        b.querySelector('.chip__count').textContent = n == null ? '' : fmtInt(n);
        b.setAttribute('title', (on ? 'Sembunyikan ' : 'Tampilkan ') + TIER_LABEL[id] + (n == null ? '' : ' (' + fmtInt(n) + ')'));
        b.disabled = !ready;
        if (ready) b.removeAttribute('disabled'); else b.setAttribute('disabled', '');
      });
      clear(stLine);
      if (st === 'error') {
        group.hidden = true; group.setAttribute('hidden', '');
        line.hidden = true; line.setAttribute('hidden', '');
        tipBtn.hidden = true; tipBtn.setAttribute('hidden', '');
        stLine.hidden = false; stLine.removeAttribute('hidden');
        stLine.appendChild(doc().createTextNode('Kelas biaya tidak dapat dimuat.'));
        var rb = h('button', { type: 'button', class: 'inst-linkbtn', text: 'Coba lagi' });
        rb.addEventListener('click', function () {
          if (typeof o.onRetry === 'function') o.onRetry();
          else { stateOverride = null; dataLoad('tiers'); paint(); }
        });
        stLine.appendChild(doc().createTextNode(' '));
        stLine.appendChild(rb);
        wrap.removeAttribute('aria-busy');
        return;
      }
      group.hidden = false; group.removeAttribute('hidden');
      line.hidden = false; line.removeAttribute('hidden');
      tipBtn.hidden = false; tipBtn.removeAttribute('hidden');
      if (!ready) {
        stLine.hidden = false; stLine.removeAttribute('hidden');
        stLine.appendChild(doc().createTextNode('Memuat kelas biaya…'));
        wrap.setAttribute('aria-busy', 'true');
      } else {
        stLine.hidden = true; stLine.setAttribute('hidden', '');
        wrap.removeAttribute('aria-busy');
      }
      if (tipBtn.getAttribute('aria-expanded') === 'true') paintTip();
    }
    paint();
    if (!stateOverride && dataState('tiers') !== 'ready') {
      whenData(['tiers'], wrap, function () { paint(); if (dataState('tiers') === 'ready' && typeof o.onLoad === 'function') { try { o.onLoad(); } catch (e) { /* ignore */ } } });
      dataLoad('tiers');
    }
    wrap.mcdTier = {
      value: function () { return value.slice(); },
      update: function (u) {
        u = u || {};
        if (u.counts) counts = u.counts;
        if (u.value) value = normValue(u.value);
        if (own(u, 'state')) stateOverride = u.state || null;
        paint();
      }
    };
    return wrap;
  }

  var TIER_SCALE = ['reguler', 'menengah', 'atas', 'premium'];
  function tierLegendNote(o) {
    return 'Batang berisi = dari biaya resmi atau jenis ' + (o && o.kind === 'kampus' ? 'kampus' : 'sekolah') + '. Batang kosong = perkiraan. Tanpa tanda = belum diketahui.';
  }
  /**
   * tierLegendRows(theme?, {kind: 'sekolah' | 'kampus'}) → the two rows of the map legend group "Kelas biaya" (§4.3) as
   * data in MCD.map's legend row contract (map.js header): [{tiers: [{level, basis: 'biaya', word}] ×4, label:
   * 'Reguler · Menengah · Atas · Premium'}, {glyph: 'tier', level: 2, basis: 'both', label: 'Batang berisi = … Batang
   * kosong = perkiraan. Tanpa tanda = belum diketahui.'}]. The map draws the bars itself in its own theme, so theme
   * is accepted for the call shape only. Plain objects, no DOM: a group's rows go to MCD.map as they are.
   */
  function tierLegendRows(theme, o) {
    return [
      {
        tiers: TIER_SCALE.map(function (id) { return { level: TIER_LEVEL[id], basis: 'biaya', word: TIER_LABEL[id] }; }),
        label: TIER_SCALE.map(function (id) { return TIER_LABEL[id]; }).join(' · ')
      },
      { glyph: 'tier', level: 2, basis: 'both', label: tierLegendNote(o) }
    ];
  }
  /**
   * tierLegendNodes(theme?, {kind}) → the same two rows as DOM for a legend outside the map (a fold or a panel):
   * [div.inst-leg__bars with the four bar glyphs over their words, p.inst-leg__note].
   */
  function tierLegendNodes(theme, o) {
    var t = theme === 'day' || theme === 'night' ? theme : null;
    var r1 = h('div', { class: ['inst-leg', 'inst-leg__bars', t ? 'inst-leg--' + t : null], role: 'list' });
    TIER_SCALE.forEach(function (id) {
      r1.appendChild(h('span', { class: 'inst-leg__item', role: 'listitem' }, tierBars(TIER_LEVEL[id], 'biaya', { px: 12 }), h('span', { class: 'inst-leg__w', text: TIER_LABEL[id] })));
    });
    var r2 = h('p', { class: ['inst-leg', 'inst-leg__note', t ? 'inst-leg--' + t : null], text: tierLegendNote(o) });
    return [r1, r2];
  }

  /** CSV columns of §4.2: kelas_biaya, dasar_kelas_biaya, biaya_resmi, tahun_biaya, sumber_biaya. */
  function tierCsv(id) {
    var t = tierOf(id);
    if (!t) return { kelas_biaya: '', dasar_kelas_biaya: '', biaya_resmi: '', tahun_biaya: '', sumber_biaya: '' };
    return {
      kelas_biaya: t.label,
      dasar_kelas_biaya: t.basisWords || '',
      biaya_resmi: t.basis === 'biaya' && t.fee && t.fee.text ? t.fee.text : '',
      tahun_biaya: t.basis === 'biaya' ? (t.year || 'tahun tidak disebut') : '',
      sumber_biaya: t.url ? t.url.url : ''
    };
  }

  /* ============================================================= contacts */

  var SCHOOL_SRC = { sekolahkita: 'Sekolah Kita (Dapodik)', referensi: 'Data Referensi Kemendikdasmen' };
  var CAMPUS_SRC = { pddikti: 'PDDikti' };
  var CAMPUS_WEB_DERIVED = { 'pddikti-email': 'Domain e-mail resmi di PDDikti', osm: 'OpenStreetMap', overture: 'Overture Maps' };
  var LINK_CHECKS = { ok: 1, dialihkan: 1, belum: 1 };
  /* integration 22 Oct 2026 (V6_SPEC §14.4, data follow-up): rows whose site the data marks 'ok' although a later check
     found a parked domain. The screen treats them as 'dibuang' (no address, its own line) until data/campuses.js is
     rebuilt with the stricter check; tests/final-v6.test.mjs flags this list once the data agrees. */
  var WEB_PARKED = { 'ovt:78704605978f': 'Italian Fashion School' };
  var PARKED_LINE = 'Alamat situs lembaga ini tidak ditampilkan karena tidak lagi aktif sebagai situs lembaga.';
  var DROPPED_LINE = 'Alamat situs di daftar resmi tidak ditampilkan karena tidak aktif atau tidak aman.';
  var REF_URL = 'https://referensi.data.kemendikdasmen.go.id/pendidikan/npsn/';
  var PDDIKTI_SEARCH = 'https://pddikti.kemdiktisaintek.go.id/search/{q}';

  /** 'sekolahkita' | 'referensi' | 'sekolahkita, referensi' → words, or null when any part is not an official register. */
  function schoolSrcWords(src, date) {
    if (!isStr(src)) return null;
    var parts = src.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!parts.length || parts.some(function (p) { return !own(SCHOOL_SRC, p); })) return null;
    return parts.map(function (p) { return SCHOOL_SRC[p]; }).join(', ') + (date ? ' · ' + date : '');
  }
  function campusSrcWords(src, date) {
    if (!own(CAMPUS_SRC, src)) return null;
    return CAMPUS_SRC[src] + (date ? ' · ' + date : '');
  }
  function emptyContact(key, kind) {
    return {
      key: key, kind: kind, state: 'ready', id: null, phones: [], email: null, emailDropped: false, website: null, websiteDropped: false,
      akreditasi: null, address: null, officialName: null, refUrl: null, refLabel: null, noNpsn: false, name: null
    };
  }
  /** The website of a row through the D17 rule → {url, host, https, social, checked, link, text, src} | null. */
  function websiteOf(raw, check, linkOk, srcWords) {
    var w = safeUrl(raw);
    if (!w) {
      /* a registered address that is not even a valid URL ("http://www.example") cannot open: its host as plain text */
      if (linkOk || check !== 'gagal') return null;
      var lh = looseHost(raw);
      return { url: null, host: lh, https: false, social: false, path: '', text: lh, checked: check, link: false, src: srcWords || null };
    }
    return {
      url: w.url, host: w.host, https: w.https, social: w.social, path: w.path, text: siteText(w),
      checked: isStr(check) ? check : null, link: !!linkOk, src: srcWords || null
    };
  }

  /**
   * contactOf(id, {npsn?}) → null for an id that is not a school or campus row id; else
   * {key, kind: 'sekolah' | 'kampus' | 'kursus', state: 'ready' | 'loading' | 'error', id: {kind: 'NPSN' | 'Kode PT', value} | null,
   *  phones: [{display, tel, mobile, noArea, src}], email: {value, href, src} | null, emailDropped,
   *  website: {url, host, https, social, path, text, checked, link, src} | null, websiteDropped,
   *  akreditasi: {value, src} | null, address: {value, src} | null, officialName, refUrl, refLabel, noNpsn, name}.
   * Schools join on the row's npsn (opts.npsn, the npsn: id, or the student row of an app: id).
   */
  function contactOf(id, o) {
    o = o || {};
    var key = String(id == null ? '' : id);
    var kind = kindOf(key);
    if (!kind) return null;
    return kind === 'sekolah' ? schoolContact(key, o) : campusContact(key);
  }
  function schoolContact(key, o) {
    var c = emptyContact(key, 'sekolah');
    var npsn = /^\d{8}$/.test(String(o.npsn || '')) ? String(o.npsn) : (key.indexOf('npsn:') === 0 ? key.slice(5) : null);
    if (!npsn && key.indexOf('app:') === 0) {
      /* 8 app: rows carry an npsn (npsnMatched): it lives in the student row, which needs data/school-students.js */
      var sr = studentRow(key);
      if (sr) { if (/^\d{8}$/.test(String(sr.npsn || ''))) npsn = String(sr.npsn); }
      else if (dataState('students') !== 'ready') {
        c.state = dataState('students') === 'error' ? 'error' : 'loading';
        c.need = 'students';
        return c;
      }
    }
    if (!npsn) { c.noNpsn = true; return c; }
    c.id = { kind: 'NPSN', value: npsn };
    c.refUrl = REF_URL + npsn;
    c.refLabel = 'Lihat di Data Referensi Kemendikdasmen';
    var C = dataOf('contacts');
    if (!C) { c.state = dataState('contacts') === 'error' ? 'error' : 'loading'; c.need = 'contacts'; return c; }
    var r = contactRow(npsn);
    if (!r) return c;
    var src = r.src || {};
    var date = fmtDate(r.fetched) || fmtDate(C.meta.generated);
    c.name = plainText(r.name, 200);
    c.officialName = plainText(r.officialName, 200);
    var pSrc = schoolSrcWords(src.phone, date);
    if (pSrc) {
      c.phones = phonesOf(Array.isArray(r.phone) ? r.phone : [], { src: pSrc });
      c.phones.forEach(function (p) {
        /* The file's telHref() is used only when it dials the same number as the shared rule: it would also link a
           number without an area code (D18), dial "62…" without the "+" as a local number, and dial a "-71" range ending. */
        var t = null;
        if (!p.noArea) {
          try { t = typeof C.telHref === 'function' ? C.telHref({ number: p.display }) : p.tel; } catch (e) { t = p.tel; }
          if (!telOk(t) || t !== p.tel) t = p.tel;
        }
        p.tel = p.noArea || !telOk(t) ? null : t;
      });
    }
    var eSrc = schoolSrcWords(src.email, date);
    var m = eSrc ? mailOf(r.email) : null;
    if (m) c.email = { value: m.value, href: m.href, src: eSrc };
    c.emailDropped = !c.email && isStr(r.emailWhy);
    var wSrc = schoolSrcWords(src.website, date);
    if (r.webCheck === 'dibuang') c.websiteDropped = true;
    else if (wSrc && r.website) {
      var linkOk = false;
      try { linkOk = typeof C.webLink === 'function' ? !!C.webLink(r) : own(LINK_CHECKS, r.webCheck); } catch (e) { linkOk = false; }
      c.website = websiteOf(r.website, r.webCheck, linkOk && own(LINK_CHECKS, r.webCheck), wSrc);
    }
    var aSrc = schoolSrcWords(src.akreditasi, date);
    if (isStr(r.akreditasi) && aSrc) c.akreditasi = { value: r.akreditasi, body: 'BAN-PDM', src: aSrc };
    var adSrc = schoolSrcWords(src.address, date);
    var ad = plainText(r.address, 300);
    if (ad && adSrc) c.address = { value: ad, src: adSrc };
    return c;
  }
  function campusContact(key) {
    var isPt = key.indexOf('pt:') === 0;
    var c = emptyContact(key, isPt ? 'kampus' : 'kursus');
    if (isPt) c.id = { kind: 'Kode PT', value: key.slice(3) };
    var K = dataOf('campuses');
    if (!K) { c.state = dataState('campuses') === 'error' ? 'error' : 'loading'; c.need = 'campuses'; return c; }
    var r = campusRow(key);
    if (!r) return c;
    var src = r.src || {};
    var date = fmtDate(K.meta.generated);
    c.name = plainText(r.name, 200);
    if (isPt && isStr(r.kode) && /^\d{6}$/.test(r.kode)) c.id = { kind: 'Kode PT', value: r.kode };
    var pSrc = campusSrcWords(src.phone, date);
    if (pSrc) c.phones = phonesOf(r.phone, { mobile: r.mobile === true, src: pSrc });
    var eSrc = campusSrcWords(src.email, date);
    var m = eSrc ? mailOf(r.email) : null;
    if (m) c.email = { value: m.value, href: m.href, src: eSrc };
    if (own(WEB_PARKED, key)) { c.websiteDropped = true; c.websiteDroppedText = PARKED_LINE; }
    else if (r.webCheck === 'dibuang') c.websiteDropped = true;
    else if (r.website) {
      var ws = src.website, wSrc = null;
      if (own(CAMPUS_SRC, ws)) wSrc = campusSrcWords(ws, date);
      else if (own(CAMPUS_WEB_DERIVED, ws) && (r.webCheck === 'ok' || r.webCheck === 'dialihkan')) {
        wSrc = ws === 'pddikti-email' ? CAMPUS_WEB_DERIVED[ws] : CAMPUS_WEB_DERIVED[ws] + ', diperiksa ' + date;
      }
      var w = wSrc ? websiteOf(r.website, r.webCheck, own(LINK_CHECKS, r.webCheck), wSrc) : null;
      /* a derived address (OpenStreetMap, Overture, the e-mail domain) is shown only as the site root */
      if (w && ws !== 'pddikti' && w.path) w = null;
      c.website = w;
    }
    if (isStr(r.akreditasi) && isPt) c.akreditasi = { value: r.akreditasi, body: null, src: 'PDDikti · ' + date };
    var ad = plainText(r.address, 300);
    if (ad && isPt) {
      var pc = isStr(r.postcode) && /^\d{5}$/.test(r.postcode) && ad.indexOf(r.postcode) < 0 ? ' ' + r.postcode : '';
      c.address = { value: ad + pc, src: 'PDDikti · ' + date };
    }
    if (isPt && c.name) {
      var tpl = isStr(K.meta.pddiktiSearchUrl) && K.meta.pddiktiSearchUrl.indexOf('{q}') > 0 ? K.meta.pddiktiSearchUrl : PDDIKTI_SEARCH;
      var u = safeUrl(tpl.replace('{q}', encodeURIComponent(c.name)));
      if (u && /(^|\.)pddikti\.kemdiktisaintek\.go\.id$/.test(u.host)) { c.refUrl = u.url; c.refLabel = 'Cari di PDDikti'; }
    }
    return c;
  }

  /** CSV columns of §5.2: telepon, telepon_seluler_resmi, email, situs_resmi, sumber_kontak (empty while veiled). */
  function contactCsv(id, o) {
    o = o || {};
    var out = { telepon: '', telepon_seluler_resmi: '', email: '', situs_resmi: '', sumber_kontak: '' };
    if (veiled(o)) return out;
    var c = contactOf(id, o);
    if (!c || c.state !== 'ready') return out;
    out.telepon = c.phones.map(function (p) { return p.display; }).join(' / ');
    out.telepon_seluler_resmi = c.phones.some(function (p) { return p.mobile; }) ? 'ya' : '';
    out.email = c.email ? c.email.value : '';
    out.situs_resmi = c.website && c.website.link ? c.website.url : '';
    var srcs = [];
    [c.phones[0] && c.phones[0].src, c.email && c.email.src, out.situs_resmi && c.website.src].forEach(function (x) {
      if (x) { var w = x.split(' · ')[0]; if (srcs.indexOf(w) < 0) srcs.push(w); }
    });
    out.sumber_kontak = srcs.join(' · ');
    return out;
  }

  /* ================================================================ logos */

  var LOGOS = {
    dapodik: { src: 'assets/brand/dapodik-logo.png', alt: 'Dapodik (Data Pokok Pendidikan)', w: 480, h: 227 },
    pddikti: { src: 'assets/brand/pddikti-logo.webp', alt: 'PDDikti (Pangkalan Data Pendidikan Tinggi)', w: 480, h: 206 },
    kopra: { src: 'assets/brand/kopra-logo.webp', alt: 'Kopra by Mandiri', w: 480, h: 245 },
    qris: { src: 'assets/brand/qris-logo.png', alt: 'QRIS', w: 360, h: 145 }
  };
  var LOGO_PX = [18, 20, 22, 24, 28, 32, 40];   /* item 46: 24–28 px in cards, up to 40 px in Data & Privasi; item 47: Kopra 22–24, QRIS 18–20 */
  /** logo('dapodik' | 'pddikti' | 'kopra' | 'qris', {px}) → span.inst-logo (white rounded tile, never recoloured). */
  function logo(name, o) {
    var L = LOGOS[name];
    if (!L) return null;
    var want = o && isNum(o.px) ? o.px : 24;
    var px = LOGO_PX.reduce(function (best, x) { return Math.abs(x - want) < Math.abs(best - want) ? x : best; }, 24);
    var w = Math.round(px * L.w / L.h);
    return h('span', { class: ['inst-logo', 'inst-logo--' + name, 'inst-logo--h' + px] },
      h('img', { src: L.src, alt: L.alt, width: w, height: px, decoding: 'async', loading: 'lazy' }));
  }

  /* ======================================================== contact block */

  function phoneRow(c, o, src) {
    var items = c.phones.map(function (p) {
      var num = p.tel
        ? h('a', { class: 'inst-tel', href: p.tel, title: 'Hubungi melalui aplikasi telepon di perangkat ini.', text: p.display })
        : h('span', { class: 'inst-tel inst-tel--plain', text: p.display });
      return h('span', { class: 'inst-phone' }, num,
        p.noArea ? h('span', { class: 'tag inst-tag', title: 'Nomor ini tercatat tanpa kode area. Tambahkan kode area saat menelepon dari ponsel.', text: 'tanpa kode area' }) : null,
        p.mobile ? h('span', { class: 'tag inst-tag', title: c.kind === 'sekolah' ? 'Nomor seluler yang tercatat sebagai kontak lembaga di Dapodik.' : 'Nomor seluler yang tercatat sebagai kontak lembaga di PDDikti.', text: 'seluler' }) : null,
        copyBtn(p.display, 'Salin nomor telepon ' + p.display, 'Nomor telepon disalin', o));
    });
    return kv('Telepon', h('span', { class: 'inst-list' }, items), src);
  }
  function webRow(c, src) {
    var w = c.website, label = w.social ? 'Halaman resmi' : 'Situs resmi';
    if (!w.link) {
      /* D17: 'gagal' = the host as plain text and one line; an address never checked = the host as plain text */
      var dead = w.checked === 'gagal';
      if (!w.text) return kv(label, h('span', { class: 'inst-miss', text: dead ? 'Situs resmi tidak dapat dibuka saat diperiksa.' : 'Situs resmi belum tercatat.' }));
      return h('div', { class: 'inst-row' }, kv(label, h('span', { class: 'inst-host inst-host--dead', text: w.text })),
        dead ? note('Situs resmi tidak dapat dibuka saat diperiksa.', 'inst-note--tight') : null, src ? h('p', { class: 'inst-src', text: src }) : null);
    }
    var title = 'Buka situs resmi di tab baru. Perlu internet.';
    if (w.checked === 'dialihkan') title += ' Situs ini terbuka di alamat lain milik lembaga yang sama.';
    if (w.checked === 'belum') title += ' Alamat dari daftar resmi, belum diperiksa.';
    return h('div', { class: 'inst-row' }, kv(label, extLink(w.url, w.text, title, 'inst-site', label)),
      w.https ? null : note('Situs ini tidak menggunakan HTTPS.', 'inst-note--tight'), src ? h('p', { class: 'inst-src', text: src }) : null);
  }
  /**
   * The source most rows share is said once, under the rows ("Sumber kontak: …"); a row from another source keeps its
   * own small note (calm fold, item 39). Candidates: the rows on screen only.
   */
  function commonSrc(list) {
    var n = {}, best = null;
    list.forEach(function (x) { if (!x) return; n[x] = (n[x] || 0) + 1; if (best == null || n[x] > n[best]) best = x; });
    return best;
  }
  function contactPreview(c, hide) {
    var idText = c.id ? c.id.kind + ' ' + c.id.value : (c.kind === 'kursus' ? 'lembaga kursus' : c.noNpsn ? 'tanpa NPSN' : '');
    if (hide || c.state !== 'ready') return idText;
    var p = c.phones[0];
    return p ? p.display + (idText ? ' · ' + idText : '') : idText;
  }

  /**
   * contactBlock(id, {veiled?, toast?, identity?, npsn?, cls?, open?, badge?}) → the "Kontak & identitas" fold (§5.2):
   * Telepon, E-mail, NPSN / Kode PT, Situs resmi, Akreditasi, Alamat, the identity rows ([label, value] pairs or nodes,
   * from the section), "Nama di Dapodik", the source badge (Dapodik / PDDikti), the register link. Missing data gets
   * its plain line; while veiled only NPSN / kode PT, akreditasi and identity stay (D7). Refreshes in place when the
   * contact file lands.
   */
  function contactBlock(id, o) {
    o = o || {};
    var key = String(id == null ? '' : id);
    var f = foldShell('Kontak & identitas', 'kontak', o);
    function render() {
      var b = clear(f.body);
      var c = contactOf(key, o);
      var hide = veiled(o);
      if (!c) { b.appendChild(note('Kontak lembaga ini belum tercatat.')); setPreview(f.el, ''); return; }
      setPreview(f.el, contactPreview(c, hide));
      var ready = c.state === 'ready' && !c.noNpsn;
      var common = ready ? commonSrc([
        hide ? null : c.phones[0] && c.phones[0].src, hide ? null : c.email && c.email.src, hide ? null : c.website && c.website.src,
        c.akreditasi && c.akreditasi.src, hide ? null : c.address && c.address.src
      ]) : null;
      function rowSrc(x) { return x && x !== common ? x : null; }
      if (c.state === 'loading') {
        b.appendChild(note('Memuat kontak…', 'inst-note--busy'));
      } else if (c.state === 'error') {
        var rb = h('button', { type: 'button', class: 'inst-linkbtn', text: 'Coba lagi' });
        rb.addEventListener('click', function () { dataLoad(c.need || 'contacts'); if (c.need === 'students') dataLoad('contacts'); render(); });
        b.appendChild(h('p', { class: 'inst-note inst-note--err' }, 'Kontak tidak dapat dimuat. ', rb));
      } else if (c.noNpsn) {
        b.appendChild(note('Sekolah ini tidak memiliki NPSN, sehingga kontaknya tidak dapat dicari.'));
      } else if (hide) {
        b.appendChild(note('Kontak disembunyikan saat nama disamarkan.', 'inst-note--veil'));
      } else {
        var none = !c.phones.length && !c.email && !c.website;
        if (none) {
          b.appendChild(note(c.kind === 'sekolah' ? 'Kontak sekolah belum tercatat di daftar resmi. Lihat Data Referensi Kemendikdasmen.'
            : c.kind === 'kampus' ? 'Kontak kampus belum tercatat di PDDikti.' : 'Kontak lembaga ini belum tercatat.', 'inst-note--none'));
          if (c.emailDropped) b.appendChild(note('E-mail di daftar resmi tampak milik pribadi, sehingga tidak ditampilkan.'));
          if (c.websiteDropped) b.appendChild(note(c.websiteDroppedText || DROPPED_LINE));
        } else {
          b.appendChild(c.phones.length ? phoneRow(c, o, rowSrc(c.phones[0].src)) : kv('Telepon', h('span', { class: 'inst-miss', text: 'Telepon belum tercatat.' })));
          if (c.email) {
            b.appendChild(kv('E-mail', h('span', { class: 'inst-list' }, h('span', { class: 'inst-phone' },
              h('a', { class: 'inst-mail', href: c.email.href, title: 'Tulis e-mail dengan aplikasi e-mail di perangkat ini.', text: c.email.value }),
              copyBtn(c.email.value, 'Salin alamat e-mail ' + c.email.value, 'Alamat e-mail disalin', o))), rowSrc(c.email.src)));
          } else if (c.emailDropped) {
            b.appendChild(kv('E-mail', h('span', { class: 'inst-miss', text: 'E-mail di daftar resmi tampak milik pribadi, sehingga tidak ditampilkan.' })));
          } else {
            b.appendChild(kv('E-mail', h('span', { class: 'inst-miss', text: 'E-mail belum tercatat.' })));
          }
        }
      }
      /* the identifier stays in every state, veiled too */
      if (c.id) {
        var idWord = c.id.kind;
        b.appendChild(kv(idWord, h('span', { class: 'inst-list' }, h('span', { class: 'inst-phone' },
          h('span', { class: 'inst-mono', text: c.id.value }),
          copyBtn(c.id.value, 'Salin ' + idWord + ' ' + c.id.value, idWord === 'NPSN' ? 'NPSN disalin' : 'Kode PT disalin', o)))));
      } else if (c.kind === 'kursus') {
        b.appendChild(kv('Kode PT', h('span', { class: 'inst-miss', text: 'Tidak terdaftar di PDDikti (lembaga kursus)' })));
      }
      if (c.state === 'ready' && !c.noNpsn && !hide) {
        var noneAll = !c.phones.length && !c.email && !c.website;
        if (c.website) b.appendChild(webRow(c, rowSrc(c.website.src)));
        else if (c.websiteDropped && !noneAll) b.appendChild(kv('Situs resmi', h('span', { class: 'inst-miss', text: c.websiteDroppedText || DROPPED_LINE })));
        else if (!noneAll) b.appendChild(kv('Situs resmi', h('span', { class: 'inst-miss', text: 'Situs resmi belum tercatat.' })));
      }
      if (ready && c.akreditasi) {
        b.appendChild(kv('Akreditasi', [h('span', { text: c.akreditasi.value }), c.akreditasi.body ? h('span', { class: 'inst-muted', text: ' · ' + c.akreditasi.body }) : null], rowSrc(c.akreditasi.src)));
      }
      if (ready && c.address && !hide) b.appendChild(kv('Alamat', c.address.value, rowSrc(c.address.src), 'inst-kv--long'));
      if (common) b.appendChild(h('p', { class: 'inst-src inst-src--all', text: 'Sumber kontak: ' + common }));
      /* identity: the section's own rows, the register name, the source badge */
      (Array.isArray(o.identity) ? o.identity : []).forEach(function (r) {
        if (!r) return;
        if (Array.isArray(r)) { if (r[1] != null && r[1] !== '') b.appendChild(kv(String(r[0]), r[1], r[2] || null)); }
        else if (r.nodeType) b.appendChild(r);
      });
      if (c.officialName && c.officialName !== c.name) b.appendChild(kv('Nama di Dapodik', c.officialName));
      var badge = o.badge === false ? null : (c.kind === 'sekolah' && c.id) ? 'dapodik' : c.kind === 'kampus' ? 'pddikti' : null;
      if (badge) {
        b.appendChild(h('p', { class: 'inst-badge' }, logo(badge, { px: 24 }),
          h('span', { class: 'inst-badge__t', text: badge === 'dapodik' ? 'Data siswa: Dapodik' : 'Data mahasiswa dan dosen: PDDikti' })));
      }
      if (c.refUrl && !hide && c.state === 'ready') {
        b.appendChild(h('p', { class: 'inst-linkline inst-linkline--ref' }, extLink(c.refUrl, c.refLabel,
          c.kind === 'sekolah' ? 'Buka profil sekolah di Data Referensi Kemendikdasmen di tab baru. Perlu internet.' : 'Buka pencarian PDDikti dengan nama kampus ini di tab baru. Perlu internet.')));
      }
    }
    render();
    var c0 = contactOf(key, o);
    if (c0 && c0.state !== 'ready' && c0.need) {
      var names = c0.need === 'students' ? ['students', 'contacts'] : [c0.need];
      whenData(names, f.el, render);
      dataLoad(c0.need);
      if (c0.need === 'students') dataLoad('contacts');
    }
    f.el.mcdRefresh = render;
    return f.el;
  }

  /* ============================================================ list drawer */

  /**
   * listDrawerState() → 'full' | 'half': how high "Lihat daftar …" (Sekolah, Kampus) opens the shell's bottom drawer.
   * On screens up to 900 px tall the half drawer shows the list's tools and only two or three rows (1366×768: 2,
   * 1440×900: 3), so the list opens to full height there (final fix round, 23 Oct 2026). A tab click keeps the shell's
   * half height.
   */
  var LIST_FULL_MAX_H = 900;
  function listDrawerState() {
    var h = root && typeof root.innerHeight === 'number' ? root.innerHeight : 0;
    return h > 0 && h <= LIST_FULL_MAX_H ? 'full' : 'half';
  }

  /* ================================================================== API */

  return {
    version: VERSION,
    scope: { KEY: SCOPE_KEY, VALUES: SCOPE_VALUES.slice(), DEFAULTS: Object.assign({}, SCOPE_DEFAULTS), get: scopeGet, set: scopeSet, on: scopeOn, options: scopeOptions, values: scopeValues },
    scopeSwitch: scopeSwitch,
    scopeSummary: scopeSummary,
    tierOf: tierOf,
    tierKey: tierKey,
    tierCounts: tierCounts,
    tierMatch: tierMatch,
    tierFilterLabel: tierFilterLabel,
    tierChip: tierChip,
    tierBars: tierBars,
    tierBlock: tierBlock,
    tierFilter: tierFilter,
    tierLegendRows: tierLegendRows,
    tierLegendNodes: tierLegendNodes,
    tierTipLines: tierTipLines,
    capLine: capLine,
    listDrawerState: listDrawerState,
    tierCsv: tierCsv,
    TIERS: FILTER_IDS.slice(),
    contactOf: contactOf,
    contactBlock: contactBlock,
    contactCsv: contactCsv,
    phonesOf: phonesOf,
    telOf: telOf,
    mailOf: mailOf,
    safeUrl: safeUrl,
    kindOf: kindOf,
    logo: logo,
    copyText: copyText,
    data: { state: dataState, load: dataLoad, on: dataOn, FILES: Object.keys(FILES).map(function (k) { return { name: k, lazy: FILES[k].lazy, global: FILES[k].global }; }) },
    adapters: {
      tierRow: tierRow, contactRow: contactRow, campusRow: campusRow, studentRow: studentRow, refuse: function (row, kind) { var T = dataOf('tiers'); return refuse(row, kind || 'sekolah', T ? T.meta : null); },
      describeTier: function (row, kind) { var T = dataOf('tiers'); return describeTier(row && row.id ? row.id : '', row, kind || 'sekolah', T ? T.meta : null); },
      _resetScope: function () { scopeMem = null; },
      _resetData: function () { Object.keys(LOAD).forEach(function (k) { delete LOAD[k]; }); IDX = {}; }
    }
  };
});
