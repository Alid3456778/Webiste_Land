/*!
 * Halloween Theme Overlay v1.0
 * One <script> tag per page. Loads halloween.css (same folder) by itself.
 * Cobweb + spider (top corners), jack-o'-lanterns (bottom), flying bats,
 * and a skeleton that pops up from the bottom and waves.
 *
 * Safe by design:
 *  - everything lives in ONE fixed, pointer-events:none layer (clicks pass straight through)
 *  - never touches your HTML, CSS, forms, links or buttons
 *  - no inline <style>/style="" strings, no external requests, no libraries (CSP friendly)
 *  - auto-disables itself if its CSS fails to load, and after the date window ends
 *  - respects "reduce motion", pauses when the tab is hidden, hidden in print
 *
 * Test switches:  ?halloween=on  /  ?halloween=off   (works on any page)
 * Optional config (put BEFORE the script tag):
 *   <script>window.HALLOWEEN_CONFIG = { pumpkinBottom: 56, skeletonMode: 'fly' };</script>
 */
(function () {
  'use strict';
  if (window.__hwLoaded) return;
  window.__hwLoaded = true;

  var SCRIPT = document.currentScript; // must be read synchronously

  var cfg = {
    startMonthDay: [10, 1],        // theme turns on  Oct 1
    endMonthDay: [11, 2],          // ...and off after Nov 2
    zIndex: 9990,                  // lower than most modals/popups; raise if a header covers it
    cobwebs: true,
    spider: true,
    pumpkins: false,
    bats: true,
    skeleton: false,
    skeletonMode: 'peek',          // 'peek' = rises from bottom & waves | 'fly' = floats across the screen
    maxBats: 10,
    batEveryMs: [3500, 8000],
    skeletonFirstMs: 7000,
    skeletonEveryMs: [22000, 45000],
    pumpkinBottom: 0,              // px; raise (e.g. 60) if you have a fixed bottom bar/chat button
    cssPath: null                  // override only if halloween.css is somewhere else
  };
  var user = window.HALLOWEEN_CONFIG || {};
  for (var k in user) if (Object.prototype.hasOwnProperty.call(user, k)) cfg[k] = user[k];

  /* ------------------------------------------------------------ gate */
  function isActive() {
    var q = /[?&]halloween=(on|off)\b/.exec(location.search);
    if (q) return q[1] === 'on';
    var n = new Date(), md = (n.getMonth() + 1) * 100 + n.getDate();
    return md >= cfg.startMonthDay[0] * 100 + cfg.startMonthDay[1] &&
           md <= cfg.endMonthDay[0] * 100 + cfg.endMonthDay[1];
  }
  if (!isActive()) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ------------------------------------------------------------ art (inline SVG) */
  var uid = 0;
  var INK = '#2b2418', BONE = '#f1e9d4';

  function bone(d, w) {
    return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="' + (w + 3) +
      '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + BONE + '" stroke-width="' + w +
      '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function joint(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + BONE + '" stroke="' + INK + '" stroke-width="1.6"/>';
  }

  function cobweb() {
    var spokes = 7, rings = [26, 50, 76, 104, 134, 166], L = 170, step = (Math.PI / 2) / (spokes - 1);
    function P(r, a) { return [(Math.cos(a) * r).toFixed(1), (Math.sin(a) * r).toFixed(1)]; }
    var dS = '', dR = '', i, p;
    for (i = 0; i < spokes; i++) { p = P(L, i * step); dS += 'M0 0L' + p[0] + ' ' + p[1]; }
    rings.forEach(function (r, ri) {
      var p0 = P(r, 0), j, c, pe;
      dR += 'M' + p0[0] + ' ' + p0[1];
      for (j = 1; j < spokes; j++) {
        c = P(r * (0.82 - ri * 0.01), (j - 0.5) * step);
        pe = P(r, j * step);
        dR += 'Q' + c[0] + ' ' + c[1] + ' ' + pe[0] + ' ' + pe[1];
      }
    });
    var dew = '';
    [[76, 2], [104, 4], [134, 1], [50, 5]].forEach(function (d) {
      var q = P(d[0], d[1] * step);
      dew += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1.7" fill="#ffffff" fill-opacity=".85"/>';
    });
    return '<svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      '<path d="' + dS + '" fill="none" stroke="#f3f3f3" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="' + dR + '" fill="none" stroke="#f3f3f3" stroke-width=".9" stroke-linecap="round"/>' + dew + '</svg>';
  }

  function spider() {
    var id = 'hws' + (++uid);
    var leg = '<path d="M28 277Q16 262 5 268"/><path d="M27 280Q11 274 2 286"/>' +
              '<path d="M27 284Q10 288 4 302"/><path d="M28 288Q15 298 11 314"/>';
    return '<svg viewBox="0 0 60 340" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      '<defs><radialGradient id="' + id + '" cx=".38" cy=".3" r=".8">' +
      '<stop offset="0" stop-color="#4a4a58"/><stop offset=".6" stop-color="#17171d"/><stop offset="1" stop-color="#08080b"/></radialGradient></defs>' +
      '<line x1="30" y1="0" x2="30" y2="268" stroke="#ececec" stroke-width="1"/>' +
      '<g class="hw-legs" fill="none" stroke="#121216" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
        '<g>' + leg + '</g><g transform="translate(60 0) scale(-1 1)">' + leg + '</g></g>' +
      '<ellipse cx="30" cy="294" rx="11" ry="13" fill="url(#' + id + ')"/>' +
      '<polygon points="25.5,289 34.5,289 31.2,294.5 34.5,300 25.5,300 28.8,294.5" fill="#e0261f"/>' +
      '<ellipse cx="26" cy="288" rx="3" ry="2" fill="#fff" fill-opacity=".16"/>' +
      '<circle cx="30" cy="276" r="6.6" fill="url(#' + id + ')"/>' +
      '<circle cx="27.3" cy="274.6" r="1.6" fill="#ffe3e3"/><circle cx="32.7" cy="274.6" r="1.6" fill="#ffe3e3"/>' +
      '<circle cx="27.3" cy="274.9" r=".7" fill="#d11"/><circle cx="32.7" cy="274.9" r=".7" fill="#d11"/></svg>';
  }

  function pumpkin() {
    var n = ++uid, B = 'hwb' + n, S = 'hws' + n, F = 'hwf' + n, H = 'hwh' + n;
    var outline = '#7a2c05';
    return '<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      '<defs>' +
      '<radialGradient id="' + B + '" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#ffb552"/><stop offset=".55" stop-color="#ff7d1c"/><stop offset="1" stop-color="#d4520a"/></radialGradient>' +
      '<radialGradient id="' + S + '" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f58b27"/><stop offset="1" stop-color="#b93f06"/></radialGradient>' +
      '<radialGradient id="' + F + '" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff7b0"/><stop offset=".55" stop-color="#ffd23d"/><stop offset="1" stop-color="#ff9a1a"/></radialGradient>' +
      '<radialGradient id="' + H + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a2a" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<ellipse class="hw-halo" cx="100" cy="112" rx="100" ry="80" fill="url(#' + H + ')"/>' +
      '<ellipse cx="62" cy="116" rx="46" ry="55" fill="url(#' + S + ')" stroke="' + outline + '" stroke-width="2.2"/>' +
      '<ellipse cx="138" cy="116" rx="46" ry="55" fill="url(#' + S + ')" stroke="' + outline + '" stroke-width="2.2"/>' +
      '<ellipse cx="100" cy="114" rx="50" ry="62" fill="url(#' + B + ')" stroke="' + outline + '" stroke-width="2.2"/>' +
      '<g fill="none" stroke="#b83f06" stroke-width="2" stroke-linecap="round" opacity=".55">' +
        '<path d="M80 58C66 90 68 150 84 173"/><path d="M120 58C134 90 132 150 116 173"/>' +
        '<path d="M44 80C36 104 40 140 56 160"/><path d="M156 80C164 104 160 140 144 160"/></g>' +
      '<ellipse cx="76" cy="74" rx="13" ry="6.5" transform="rotate(-24 76 74)" fill="#fff" fill-opacity=".2"/>' +
      '<path d="M91 56C91 40 98 30 108 25L117 32C111 37 109 45 109 56Z" fill="#5b6b25" stroke="#37431a" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M112 33C127 22 142 29 139 42C137 36 129 34 121 40" fill="none" stroke="#5b6b25" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="hw-glow" stroke="' + outline + '" stroke-width="2.4" stroke-linejoin="round" fill="url(#' + F + ')">' +
        '<polygon points="64,106 88,106 76,80"/><polygon points="112,106 136,106 124,80"/>' +
        '<polygon points="100,112 92,125 108,125"/>' +
        '<path d="M56 130L71 138L80 129L92 143L100 135L108 143L120 129L129 138L144 130Q100 178 56 130Z"/></g></svg>';
  }

  function skeleton() {
    var s = '', y, i;
    var leg = bone('M57 160L52 190', 6) + joint(52, 190, 5) + bone('M52 190L50 222', 5) +
      '<ellipse cx="49" cy="229" rx="9" ry="4.2" fill="' + BONE + '" stroke="' + INK + '" stroke-width="1.6"/>';
    s += '<g class="hw-leg"><g>' + leg + '</g></g>';
    s += '<g transform="translate(140 0) scale(-1 1)"><g class="hw-leg hw-leg-r">' + leg + '</g></g>';
    s += '<path d="M52 138Q70 130 88 138L90 150Q84 164 74 160L70 154L66 160Q56 164 50 150Z" fill="#efe6cf" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>';
    s += joint(57, 160, 5) + joint(83, 160, 5);
    s += '<ellipse cx="70" cy="110" rx="25" ry="25" fill="#1e1912" fill-opacity=".9"/>';
    for (y = 82; y <= 138; y += 8) {
      s += '<ellipse cx="70" cy="' + y + '" rx="6.5" ry="3.6" fill="#e6dcc2" stroke="' + INK + '" stroke-width="1.4"/>';
    }
    var ribL = '', ribs = [[96, 26], [106, 30], [116, 28], [126, 22]];
    ribs.forEach(function (r) {
      var yy = r[0], e = r[1];
      ribL += bone('M65 ' + yy + 'C' + (65 - e * .55) + ' ' + (yy - 6) + ' ' + (64 - e) + ' ' + (yy + 2) + ' ' + (68 - e) + ' ' + (yy + 11), 4);
    });
    ribL += bone('M70 90L47 93', 4);
    s += ribL + '<g transform="translate(140 0) scale(-1 1)">' + ribL + '</g>';
    s += bone('M70 88L70 126', 5);
    // arms: left hangs, right waves
    s += joint(46, 94, 5) + bone('M46 94L35 123', 5) + joint(35, 123, 4.2) + bone('M35 123L33 150', 4.5) +
         joint(33, 153, 4) + bone('M31 156L29 163', 2) + bone('M33 157L33 165', 2) + bone('M35 156L37 163', 2);
    s += joint(94, 94, 5) + bone('M94 94L112 108', 5) + joint(112, 108, 4.2);
    s += '<g class="hw-wave">' + bone('M112 108L116 80', 4.5) + joint(116, 76, 4) +
         bone('M114 73L111 66', 2) + bone('M116 72L116 64', 2) + bone('M118 73L121 66', 2) + bone('M119 76L124 72', 2) + '</g>';
    // neck + skull
    s += '<ellipse cx="70" cy="76" rx="5" ry="3" fill="#e6dcc2" stroke="' + INK + '" stroke-width="1.3"/>';
    s += '<path d="M70 12C47 12 38 30 41 46C42 53 46 57 50 59L50 62L90 62L90 59C94 57 98 53 99 46C102 30 93 12 70 12Z" fill="' + BONE + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
    s += '<path d="M76 14L72 23L76 28" fill="none" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round"/>';
    s += '<ellipse cx="58" cy="40" rx="8.5" ry="10" fill="#17120d"/><ellipse cx="82" cy="40" rx="8.5" ry="10" fill="#17120d"/>';
    s += '<circle cx="58.5" cy="41" r="2.2" fill="#ff9a2e"/><circle cx="82.5" cy="41" r="2.2" fill="#ff9a2e"/>';
    s += '<path d="M70 48L64.5 59L70 55.5L75.5 59Z" fill="#17120d"/>';
    s += '<g class="hw-jaw"><path d="M52 62L88 62L86 77Q70 86 54 77Z" fill="' + BONE + '" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
         '<path d="M58 62V72M64 62V74M70 62V75M76 62V74M82 62V72" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round"/></g>';
    return '<svg class="hw-sk-svg" viewBox="0 0 140 240" xmlns="http://www.w3.org/2000/svg" focusable="false">' + s + '</svg>';
  }

  function bat() {
    var wing = '<path d="M48 28C38 14 20 10 2 16C8 20 10 26 8 34C14 30 18 32 20 40C26 34 32 36 36 44C40 38 44 38 48 40Z" fill="#17111f" stroke="#6a4691" stroke-width=".9" stroke-linejoin="round"/>' +
               '<path d="M47 29C34 22 18 17 4 17M30 24C28 30 22 36 20 40M22 21C20 26 14 30 8 34" fill="none" stroke="#3a2858" stroke-width=".9" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      '<g transform="translate(0 0)"><g class="hw-wing">' + wing + '</g></g>' +
      '<g transform="translate(100 0) scale(-1 1)"><g class="hw-wing">' + wing + '</g></g>' +
      '<ellipse cx="50" cy="35" rx="5.2" ry="10" fill="#120d19" stroke="#6a4691" stroke-width=".8"/>' +
      '<circle cx="50" cy="24" r="5.4" fill="#120d19" stroke="#6a4691" stroke-width=".8"/>' +
      '<path d="M45.6 21L44.4 13.5L49 19.2ZM54.4 21L55.6 13.5L51 19.2Z" fill="#120d19" stroke="#6a4691" stroke-width=".8" stroke-linejoin="round"/>' +
      '<circle cx="48" cy="24" r="1" fill="#ff4a4a"/><circle cx="52" cy="24" r="1" fill="#ff4a4a"/></svg>';
  }

  /* ------------------------------------------------------------ build */
  var root, timers = [], batCount = 0, skEl = null, skBusy = false, dead = false;

  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  function destroy() {
    dead = true;
    timers.forEach(clearTimeout);
    if (root && root.parentNode) root.parentNode.removeChild(root);
  }

  function build() {
    root = document.createElement('div');
    root.className = 'hw-root';
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
    // critical safety styles set directly, so the layer can never affect page layout or clicks,
    // even if the stylesheet is slow or missing
    var st = root.style;
    st.setProperty('position', 'fixed', 'important');
    ['top', 'left', 'right', 'bottom'].forEach(function (p) { st.setProperty(p, '0', 'important'); });
    st.setProperty('pointer-events', 'none', 'important');
    st.setProperty('overflow', 'hidden', 'important');
    st.setProperty('z-index', String(cfg.zIndex), 'important');
    st.setProperty('visibility', 'hidden');
    if (cfg.pumpkinBottom) st.setProperty('--hw-pb', cfg.pumpkinBottom + 'px');

    var h = '';
    if (cfg.cobwebs) h += '<div class="hw-web hw-web-l">' + cobweb() + '</div><div class="hw-web hw-web-r">' + cobweb() + '</div>';
    if (cfg.spider) h += '<div class="hw-spider hw-spider-l">' + spider() + '</div>';
    if (cfg.spider && cfg.cobwebs) h += '<div class="hw-spider hw-spider-r">' + spider() + '</div>';
    if (cfg.skeleton && !reduce) h += '<div class="hw-skeleton">' + skeleton() + '</div>';
    if (cfg.pumpkins) h += '<div class="hw-pump hw-pump-a">' + pumpkin() + '</div>' +
                           '<div class="hw-pump hw-pump-b">' + pumpkin() + '</div>' +
                           '<div class="hw-pump hw-pump-c">' + pumpkin() + '</div>';
    root.innerHTML = h;
    skEl = root.querySelector('.hw-skeleton');
    document.body.appendChild(root);

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cfg.cssPath || (SCRIPT && SCRIPT.src
      ? SCRIPT.src.replace(/halloween\.js(\?.*)?$/i, 'halloween.css$1')
      : '/halloween/halloween.css');
    link.onload = function () { if (dead) return; root.style.setProperty('visibility', 'visible'); start(); };
    link.onerror = function () { destroy(); if (window.console) console.warn('[halloween] halloween.css not found: ' + link.href); };
    document.head.appendChild(link);

    document.addEventListener('visibilitychange', function () {
      if (root) root.classList[document.hidden ? 'add' : 'remove']('hw-paused');
    });
  }

  /* ------------------------------------------------------------ motion */
  function spawnBat() {
    if (dead || document.hidden || batCount >= cfg.maxBats) return;
    var small = window.innerWidth < 640;
    var w = rand(small ? 46 : 62, small ? 74 : 124);
    var dur = rand(7, 13), ltr = Math.random() < 0.5;
    var el = document.createElement('div');
    el.className = 'hw-bat';
    el.style.setProperty('--hw-w', w + 'px');
    el.style.setProperty('--hw-y', rand(6, 58) + 'vh');
    el.style.setProperty('--hw-dur', dur + 's');
    el.style.setProperty('--hw-swoop', rand(2.2, 4) + 's');
    el.style.setProperty('--hw-flap', rand(0.3, 0.46) + 's');
    el.style.setProperty('--hw-from', ltr ? '-160px' : 'calc(100vw + 160px)');
    el.style.setProperty('--hw-to', ltr ? 'calc(100vw + 160px)' : '-160px');
    el.innerHTML = '<div class="hw-bat-in">' + bat() + '</div>';
    var gone = false;
    function rm() { if (gone) return; gone = true; batCount--; if (el.parentNode) el.parentNode.removeChild(el); }
    el.addEventListener('animationend', function (e) { if (e.target === el) rm(); });
    later(rm, dur * 1000 + 1500);
    batCount++;
    root.appendChild(el);
  }

  function batLoop() {
    spawnBat();
    later(batLoop, rand(cfg.batEveryMs[0], cfg.batEveryMs[1]));
  }

  function skeletonCycle() {
    if (dead || !skEl) return;
    if (document.hidden || skBusy) { later(skeletonCycle, 4000); return; }
    skBusy = true;
    var fly = cfg.skeletonMode === 'fly', ltr = Math.random() < 0.5;
    if (fly) {
      skEl.style.setProperty('--hw-y', rand(14, 40) + 'vh');
      skEl.style.setProperty('--hw-dur', '20s');
      skEl.style.setProperty('--hw-from', ltr ? '-220px' : 'calc(100vw + 220px)');
      skEl.style.setProperty('--hw-to', ltr ? 'calc(100vw + 220px)' : '-220px');
    } else {
      skEl.style.setProperty('--hw-x', rand(16, 62) + '%');
      skEl.style.setProperty('--hw-dur', '9s');
    }
    function done(e) {
      if (e.target !== skEl) return;
      skEl.removeEventListener('animationend', done);
      skEl.className = 'hw-skeleton';
      skBusy = false;
      later(skeletonCycle, rand(cfg.skeletonEveryMs[0], cfg.skeletonEveryMs[1]));
    }
    skEl.addEventListener('animationend', done);
    skEl.className = 'hw-skeleton ' + (fly ? 'hw-fly' : 'hw-up');
  }

  function start() {
    if (reduce) return; // static decorations only
    if (cfg.bats) { later(spawnBat, 900); later(spawnBat, 3200); later(batLoop, 6000); }
    if (cfg.skeleton && skEl) later(skeletonCycle, cfg.skeletonFirstMs);
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    try { if (document.body) build(); }
    catch (err) { destroy(); if (window.console) console.warn('[halloween] disabled:', err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Halloween = { destroy: destroy, config: cfg };
})();