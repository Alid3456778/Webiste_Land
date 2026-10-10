/*!
 * Halloween Offer Popup v1.0   (pairs with halloween-popup.css, same folder)
 * Add ONE tag per page:   <script src="/assets/halloween/halloween-popup.js?v=1" defer></script>
 * The script builds the popup HTML itself - nothing else to paste.
 *
 * SET THE TIMER (put BEFORE the script tag):
 *   <script>window.HALLOWEEN_POPUP_CONFIG = { intervalMinutes: 0 };</script>
 *     intervalMinutes: 30  -> shows at most once every 30 min (default)
 *     intervalMinutes: 5   -> once every 5 min
 *     intervalMinutes: 0   -> TEST MODE: shows on every page load, no waiting
 * Quick test without editing code:  add ?hwpopup=on to any page URL  (?hwpopup=off hides it)
 */
(function () {
  'use strict';
  if (window.__hwpLoaded) return;
  window.__hwpLoaded = true;

  var SCRIPT = document.currentScript; // read synchronously

  var cfg = {
    intervalMinutes: 0,                        // 0 = test mode (every page load)
    delaySeconds: 0.3,                          // wait after page load before showing
    startMonthDay: [10, 1],                     // active from Oct 1 ...
    endMonthDay: [11, 2],                       // ... until Nov 2
    siteName: null,                             // e.g. 'TrueMeds'. null = use the page <title>
    discount: 15,
    title: 'Happy Halloween!',
    message: 'Treat yourself to spooky-good savings on your order!',
    fineprint: 'Limited time offer',
    buttonText: 'Get Discount',
    buttonUrl: '/categories.html?catogeries_ID=1',
    excludePaths: ['checkout', 'employee', 'invoice'], // pages where it never shows
    storageKey: 'hwp_last_shown',
    cssPath: null
  };
  var user = window.HALLOWEEN_POPUP_CONFIG || {};
  for (var k in user) if (Object.prototype.hasOwnProperty.call(user, k)) cfg[k] = user[k];

  /* ---------------------------------------------------------- gate */
  var q = /[?&]hwpopup=(on|off)\b/.exec(location.search);
  var force = q && q[1] === 'on';
  if (q && q[1] === 'off') return;

  function inDateWindow() {
    var n = new Date(), md = (n.getMonth() + 1) * 100 + n.getDate();
    return md >= cfg.startMonthDay[0] * 100 + cfg.startMonthDay[1] &&
           md <= cfg.endMonthDay[0] * 100 + cfg.endMonthDay[1];
  }
  function excluded() {
    var p = location.pathname.toLowerCase();
    return cfg.excludePaths.some(function (x) { return p.indexOf(String(x).toLowerCase()) !== -1; });
  }
  if (!force && (!inDateWindow() || excluded())) return;

  /* ---------------------------------------------------------- storage (never throws) */
  var mem = null;
  function readLast() {
    try { var v = window.localStorage.getItem(cfg.storageKey); return v ? parseInt(v, 10) || 0 : 0; }
    catch (e) { return mem || 0; }
  }
  function writeLast() {
    var now = Date.now();
    try { window.localStorage.setItem(cfg.storageKey, String(now)); } catch (e) { mem = now; }
  }
  var intervalMs = Math.max(0, Number(cfg.intervalMinutes) || 0) * 60000;
  function msUntilDue() {
    if (force || intervalMs === 0) return 0;
    var last = readLast();
    return last ? Math.max(0, last + intervalMs - Date.now()) : 0;
  }

  /* ---------------------------------------------------------- art */
  function cobweb() {
    var sp = 7, rings = [20, 40, 60, 82, 104], L = 110, step = (Math.PI / 2) / (sp - 1), dS = '', dR = '', i;
    function P(r, a) { return [(Math.cos(a) * r).toFixed(1), (Math.sin(a) * r).toFixed(1)]; }
    for (i = 0; i < sp; i++) { var p = P(L, i * step); dS += 'M0 0L' + p[0] + ' ' + p[1]; }
    rings.forEach(function (r, ri) {
      var p0 = P(r, 0), j; dR += 'M' + p0[0] + ' ' + p0[1];
      for (j = 1; j < sp; j++) { var c = P(r * (0.82 - ri * 0.01), (j - 0.5) * step), pe = P(r, j * step); dR += 'Q' + c[0] + ' ' + c[1] + ' ' + pe[0] + ' ' + pe[1]; }
    });
    return '<svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="' + dS +
      '" fill="none" stroke="#e9e2ff" stroke-opacity=".75" stroke-width="1.1"/><path d="' + dR +
      '" fill="none" stroke="#e9e2ff" stroke-opacity=".75" stroke-width=".8"/></svg>';
  }

  function bat() {
    var wing = '<path d="M48 28C38 14 20 10 2 16C8 20 10 26 8 34C14 30 18 32 20 40C26 34 32 36 36 44C40 38 44 38 48 40Z" fill="#0f0a18" stroke="#8a62c2" stroke-width="1" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      '<g class="hwp-wing">' + wing + '</g><g transform="translate(100 0) scale(-1 1)"><g class="hwp-wing">' + wing + '</g></g>' +
      '<ellipse cx="50" cy="35" rx="5.2" ry="10" fill="#0f0a18" stroke="#8a62c2" stroke-width=".9"/>' +
      '<circle cx="50" cy="24" r="5.4" fill="#0f0a18" stroke="#8a62c2" stroke-width=".9"/>' +
      '<path d="M45.6 21L44.4 13.5L49 19.2ZM54.4 21L55.6 13.5L51 19.2Z" fill="#0f0a18" stroke="#8a62c2" stroke-width=".9" stroke-linejoin="round"/>' +
      '<circle cx="48" cy="24" r="1" fill="#ff4a4a"/><circle cx="52" cy="24" r="1" fill="#ff4a4a"/></svg>';
  }

  function pumpkin() {
    var o = '#7a2c05';
    return '<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" focusable="false"><defs>' +
      '<radialGradient id="hwpB" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#ffb552"/><stop offset=".55" stop-color="#ff7d1c"/><stop offset="1" stop-color="#d4520a"/></radialGradient>' +
      '<radialGradient id="hwpS" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f58b27"/><stop offset="1" stop-color="#b93f06"/></radialGradient>' +
      '<radialGradient id="hwpF" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff7b0"/><stop offset=".55" stop-color="#ffd23d"/><stop offset="1" stop-color="#ff9a1a"/></radialGradient></defs>' +
      '<ellipse cx="62" cy="116" rx="46" ry="55" fill="url(#hwpS)" stroke="' + o + '" stroke-width="2.2"/>' +
      '<ellipse cx="138" cy="116" rx="46" ry="55" fill="url(#hwpS)" stroke="' + o + '" stroke-width="2.2"/>' +
      '<ellipse cx="100" cy="114" rx="50" ry="62" fill="url(#hwpB)" stroke="' + o + '" stroke-width="2.2"/>' +
      '<g fill="none" stroke="#b83f06" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M80 58C66 90 68 150 84 173"/><path d="M120 58C134 90 132 150 116 173"/></g>' +
      '<ellipse cx="76" cy="74" rx="13" ry="6.5" transform="rotate(-24 76 74)" fill="#fff" fill-opacity=".2"/>' +
      '<path d="M91 56C91 40 98 30 108 25L117 32C111 37 109 45 109 56Z" fill="#5b6b25" stroke="#37431a" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M112 33C127 22 142 29 139 42C137 36 129 34 121 40" fill="none" stroke="#5b6b25" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="hwp-glow" stroke="' + o + '" stroke-width="2.4" stroke-linejoin="round" fill="url(#hwpF)">' +
      '<polygon points="64,106 88,106 76,80"/><polygon points="112,106 136,106 124,80"/><polygon points="100,112 92,125 108,125"/>' +
      '<path d="M56 130L71 138L80 129L92 143L100 135L108 143L120 129L129 138L144 130Q100 178 56 130Z"/></g></svg>';
  }

  /* ---------------------------------------------------------- popup */
  var timers = [], opened = false, cssReady = false, cssFailed = false, cssWaiters = [], root = null, lastFocus = null;
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  function ensureCss(cb) {
    if (cssReady) return cb();
    if (cssFailed) return;
    cssWaiters.push(cb);
    if (cssWaiters.length > 1) return;
    var base = cfg.cssPath || (SCRIPT && SCRIPT.src
      ? SCRIPT.src.replace(/halloween-popup\.js(\?.*)?$/i, 'halloween-popup.css$1')
      : '/assets/halloween/halloween-popup.css');
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Henny+Penny&display=swap';
    document.head.appendChild(font);
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base;
    link.onload = function () { cssReady = true; var w = cssWaiters.slice(); cssWaiters = []; w.forEach(function (f) { f(); }); };
    link.onerror = function () { cssFailed = true; cssWaiters = []; if (window.console) console.warn('[halloween-popup] CSS not found: ' + link.href); };
    document.head.appendChild(link);
  }

  function siteName() {
    if (cfg.siteName) return cfg.siteName;
    var t = (document.title || '').split(/\s[|\-–—]\s/)[0].trim();
    return t || location.hostname.replace(/^www\./, '');
  }

  function build() {
    var o = document.createElement('div');
    o.className = 'hwp-overlay';
    o.innerHTML =
      '<div class="hwp-card" role="dialog" aria-modal="true" aria-labelledby="hwp-title" tabindex="-1">' +
        '<button class="hwp-close" type="button" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>' +
        '<div class="hwp-web" aria-hidden="true">' + cobweb() + '</div>' +
        '<div class="hwp-bat hwp-bat-1" aria-hidden="true">' + bat() + '</div>' +
        '<div class="hwp-bat hwp-bat-2" aria-hidden="true">' + bat() + '</div>' +
        '<div class="hwp-pumpkin" aria-hidden="true">' + pumpkin() + '</div>' +
        '<h2 class="hwp-title" id="hwp-title"></h2>' +
        '<p class="hwp-site"></p>' +
        '<div class="hwp-offer"><span class="hwp-big"></span><span class="hwp-off">OFF</span></div>' +
        '<p class="hwp-text"></p>' +
        '<div class="hwp-foot"><a class="hwp-btn"></a><span class="hwp-fine"></span></div>' +
      '</div>';
    // user-supplied text goes in as text (never as HTML)
    o.querySelector('.hwp-title').textContent = cfg.title;
    o.querySelector('.hwp-site').textContent = 'from ' + siteName();
    o.querySelector('.hwp-big').textContent = cfg.discount + '%';
    o.querySelector('.hwp-text').textContent = cfg.message;
    o.querySelector('.hwp-fine').textContent = cfg.fineprint;
    var btn = o.querySelector('.hwp-btn');
    btn.textContent = cfg.buttonText;
    btn.setAttribute('href', cfg.buttonUrl);
    return o;
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape' || e.key === 'Esc') { close(); return; }
    if (e.key === 'Tab') {
      var f = root.querySelectorAll('.hwp-close, .hwp-btn');
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || a === root.querySelector('.hwp-card'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    }
  }

  function open() {
    if (opened) return;
    if (document.hidden) { // wait until the tab is visible again
      var h = function () { if (!document.hidden) { document.removeEventListener('visibilitychange', h); open(); } };
      document.addEventListener('visibilitychange', h);
      return;
    }
    opened = true;
    writeLast();
    lastFocus = document.activeElement;
    root = build();
    root.addEventListener('click', function (e) { if (e.target === root) close(); });          // click on dark background
    root.querySelector('.hwp-close').addEventListener('click', close);                          // X button
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('hwp-lock');
    document.body.appendChild(root);
    var card = root.querySelector('.hwp-card');
    if (card && card.focus) card.focus({ preventScroll: true });
  }

  function close() {
    if (!root) return;
    var r = root; root = null;
    r.classList.add('hwp-closing');
    document.removeEventListener('keydown', onKey);
    later(function () {
      if (r.parentNode) r.parentNode.removeChild(r);
      document.documentElement.classList.remove('hwp-lock');
      opened = false;
      try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) {}
      if (intervalMs > 0) later(show, intervalMs); // come back after the interval, even on the same page
    }, 240);
  }

  function show() { ensureCss(open); }

  /* ---------------------------------------------------------- start */
  function start() {
    var wait = msUntilDue();
    if (wait > 0) later(show, wait);                                  // not due yet: schedule it
    else later(show, Math.max(0, Number(cfg.delaySeconds) || 0) * 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.HalloweenPopup = { show: show, close: close, config: cfg };
})();