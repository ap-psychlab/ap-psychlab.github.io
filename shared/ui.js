/* AP Psych Lab — site bar, title bar, light/dark, saved settings, sound, full screen, popovers
 * and modals: window.APPSYCH_UI
 *
 * <head> of an interactive page, in this order:
 *   <meta charset="utf-8">
 *   <meta name="viewport" content="width=device-width, initial-scale=1">
 *   <title>Lights Off · AP Psych Lab</title>
 *   <script src="../../shared/theme-init.js"></script>                 not deferred
 *   <link rel="icon" href="../../shared/favicon.svg" type="image/svg+xml">
 *   <link rel="apple-touch-icon" href="../../shared/apple-touch-icon.png">
 *   <link rel="stylesheet" href="../../shared/theme.css">              fonts come with it
 *   <link rel="stylesheet" href="style.css">
 *   <script src="../../shared/data/topics.js" defer></script>
 *   <script src="../../shared/data/interactives.js" defer></script>
 *   <script src="../../shared/ui.js" defer></script>
 *   <script src="script.js" defer></script>
 *
 * SITE BAR — the first thing in <body>. Write the empty placeholder; ui.js fills it.
 *   <nav class="sitebar wide" aria-label="Site"></nav>     ("wide" when <main> is wide)
 *   - Contents: a "Skip to activity" link (to <main>; shown only when focused), the home link
 *     (Ψ + site name), and on the right the light/dark switch (the course menu joins it later).
 *   - The home page marks its placeholder with data-home: no home link, "Skip to activities".
 *     data-skip="…" changes the skip link's words on any other page.
 *
 * TITLE BAR — right after the site bar. Write this; ui.js fills in the rest.
 *   <header class="topbar wide" data-interactive="lights-off">   ("wide" for the Split and Stage templates)
 *     <div class="topbar-inner">
 *       <div class="brand"><h1>Lights Off</h1></div>      ui.js adds the ⓘ button and its popover
 *       <div class="modes" role="group" aria-label="Game mode">   optional, only with 2+ modes;
 *         <button class="mode" type="button" aria-pressed="true">Practice</button>   the page sets
 *         <button class="mode" type="button" aria-pressed="false">Timed</button>     aria-pressed
 *       </div>
 *       <div class="tools">                                 optional; each button only if used
 *         <button class="icon-btn" type="button" data-ui="sound"></button>
 *         <button class="icon-btn" type="button" data-ui="settings" aria-controls="settings"></button>
 *         <div class="popover" id="settings" role="dialog" aria-label="Settings" hidden>…</div>
 *         <button class="icon-btn" type="button" data-ui="fullscreen"></button>   Stage/Column only
 *       </div>
 *     </div>
 *   </header>
 *   - data-interactive is the interactive's id in interactives.js. The ⓘ popover shows its
 *     description, howTo, and CED topic(s) and class unit(s). Without a matching entry there
 *     is no ⓘ button.
 *   - ui.js gives data-ui="sound", "settings" and "fullscreen" buttons their icon, label and title.
 *
 * SOUND — off on every page load.
 *   APPSYCH_UI.sound.on                 true or false; check before playing a sound
 *   APPSYCH_UI.sound.set(bool)          turn it on or off from code (updates the button)
 *   APPSYCH_UI.sound.onChange(fn)       fn(on) after every change (e.g. to start Web Audio)
 *
 * LIGHT AND DARK — follows the device until the player uses the switch; the choice is then saved.
 *   Switching to the mode the device is already in removes the saved choice (follow the device).
 *   APPSYCH_UI.theme.get()              "light" or "dark" (what the page shows now)
 *   APPSYCH_UI.theme.set("dark")        what the switch does: show it, and save or clear the choice
 *   APPSYCH_UI.theme.onChange(fn)       fn(theme) after every change, including one from another
 *                                       tab, the device or printing; redraw canvases here
 *   Printing always uses light (the page switches for the print and back afterward).
 *
 * SAVED SETTINGS — on this device only, in localStorage under "appsych.<key>", each value saved
 *   as { v: 1, data }. Every call is safe when storage is blocked (get returns the fallback).
 *   APPSYCH_UI.store.get(key, fallback), .set(key, value) (true if saved), .remove(key)
 *   Keys: "theme"; later "course", "topics", "coursePrompt", and "<interactive-id>.<name>".
 *
 * FULL SCREEN — <button class="icon-btn" data-ui="fullscreen"> in the title bar's tools.
 *   Without data-target the whole page goes full screen (title bar kept, the --w-wide limit
 *   lifted). With data-target="<id>" that element does (card mode): ui.js gives it class
 *   "fs-target" and a corner "Exit full screen" button; its own :fullscreen CSS decides how it
 *   grows. Escape exits either. The button is hidden where full screen isn't possible.
 *   APPSYCH_UI.fullscreen.active()      the element that is full screen, or null
 *   APPSYCH_UI.fullscreen.onChange(fn)  fn(element or null) after entering or leaving
 *
 * POPOVERS — any button with aria-controls="<id>" where #<id> has class "popover" toggles it.
 *   Escape or a click outside closes it; Escape returns focus to its button. One open at a time.
 *   APPSYCH_UI.openPopover(id), APPSYCH_UI.closePopovers()
 *
 * MODALS — native <dialog class="modal"> (markup in theme.css). Focus stays inside and Escape
 *   closes it (both built into <dialog>); focus returns to whatever opened it.
 *   APPSYCH_UI.openModal(id, { backdropClose: true, onClose: fn })
 *   APPSYCH_UI.closeModal(id)
 *   A button with data-modal="<id>" opens it; a button inside with data-ui="close" closes it.
 *
 * OTHER
 *   APPSYCH_UI.interactive              this page's interactives.js entry, or null
 *   APPSYCH_UI.homeUrl                  the home page's address (works from file:// too)
 *   APPSYCH_UI.announce(text)           read text aloud to screen readers (polite)
 *   APPSYCH_UI.icons                    SVG markup: info, sound, settings, restart, close, psi,
 *                                       moon, sun, fullscreen, fullscreenExit
 *   APPSYCH_UI.refresh()                wire popover buttons and sound/settings icons added later
 *
 * SHARING A LINK — there are no teacher links in the ⓘ. An interactive keeps its shareable
 *   choices in the address (e.g. ?mode= when a mode is chosen, ?groups= when topics are chosen),
 *   so teachers copy the address bar.
 */
window.APPSYCH_UI = (function () {
  var ICONS = {
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
      '<path class="snd-on" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="snd-on" d="M18.5 5.5a9 9 0 0 1 0 13"/>' +
      '<path class="snd-off" d="m16 9 6 6"/><path class="snd-off" d="m22 9-6 6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>',
    // Ψ: Google's fonts have no Greek letters, so it's drawn. Color it with CSS color (--psi).
    psi: '<svg viewBox="0 0 100 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="11"><path d="M50 0V120M14 16V44C14 68 30 82 50 82C70 82 86 68 86 44V16"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>',
    fullscreenExit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/></svg>'
  };

  // The home page: one folder above shared/, where this script lives. On the web, the folder
  // address (…/); from a local folder (file://), its index.html.
  var me = document.currentScript || document.querySelector('script[src$="shared/ui.js"]');
  var homeUrl = me ? new URL(location.protocol === 'file:' ? '../index.html' : '../', me.src).href : '/';

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ---------- Screen reader announcements ---------- */
  var live = null;
  function announce(text) {
    if (!live) { live = el('div', { 'class': 'sr-only', 'aria-live': 'polite' }); document.body.appendChild(live); }
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 30);
  }

  /* ---------- Saved settings (this device only) ---------- */
  var PREFIX = 'appsych.';
  function fullKey(k) { k = String(k); return k.indexOf(PREFIX) === 0 ? k : PREFIX + k; }
  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(fullKey(key));
        if (raw == null) return fallback;
        var o = JSON.parse(raw);
        return o && o.v === 1 && 'data' in o ? o.data : fallback;  // other versions: ignored
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(fullKey(key), JSON.stringify({ v: 1, data: value })); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem(fullKey(key)); } catch (e) { /* blocked: nothing saved anyway */ }
    }
  };

  /* ---------- Light and dark ---------- */
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var themeFns = [], themeBtns = [], printing = false;
  function deviceTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function savedTheme() { var t = store.get('theme', null); return t === 'light' || t === 'dark' ? t : null; }
  function preferredTheme() { return savedTheme() || deviceTheme(); }
  function currentTheme() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function applyTheme(t) { if (root.getAttribute('data-theme') !== t) root.setAttribute('data-theme', t); }
  var theme = {
    get: currentTheme,
    set: function (t) {
      t = t === 'dark' ? 'dark' : 'light';
      // Choosing what the device already shows means "follow the device" again.
      if (t === deviceTheme()) store.remove('theme'); else store.set('theme', t);
      applyTheme(t);
    },
    onChange: function (fn) { themeFns.push(fn); }
  };
  // The phone browser's bar matches the site bar (read from the CSS, so no colors live here).
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function themeChanged() {
    var t = currentTheme();
    themeBtns.forEach(function (b) {
      var label = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      b.innerHTML = t === 'dark' ? ICONS.sun : ICONS.moon;
      b.setAttribute('aria-label', label);
      b.title = label;
    });
    if (!themeMeta) { themeMeta = el('meta', { name: 'theme-color' }); document.head.appendChild(themeMeta); }
    var c = getComputedStyle(root).getPropertyValue('--sitebar').trim();
    if (c) themeMeta.setAttribute('content', c);
    themeFns.forEach(function (fn) { fn(t); });
  }
  // Every change goes through the data-theme attribute, whoever makes it.
  if (window.MutationObserver) {
    new MutationObserver(themeChanged).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (!root.hasAttribute('data-theme')) applyTheme(preferredTheme());  // theme-init.js missing
  function followDevice() { if (!printing && !savedTheme()) applyTheme(deviceTheme()); }
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', followDevice); else if (mq.addListener) mq.addListener(followDevice); }
  // The switch in another tab of this site
  window.addEventListener('storage', function (e) {
    if (!printing && (e.key === null || e.key === PREFIX + 'theme')) applyTheme(preferredTheme());
  });
  // Paper is white: print in light colors, then put the mode back.
  window.addEventListener('beforeprint', function () { printing = true; applyTheme('light'); });
  window.addEventListener('afterprint', function () { printing = false; applyTheme(preferredTheme()); });

  /* ---------- Site bar ---------- */
  function buildSitebar(nav) {
    if (nav.dataset.uiBuilt) return;
    nav.dataset.uiBuilt = '1';
    var isHome = nav.hasAttribute('data-home');
    var main = document.querySelector('main');
    var inner = el('div', { 'class': 'sitebar-inner' });
    if (main) {
      if (!main.id) main.id = 'main';
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      var skip = el('a', { 'class': 'sb-skip', href: '#' + main.id });
      skip.textContent = nav.getAttribute('data-skip') || (isHome ? 'Skip to activities' : 'Skip to activity');
      skip.addEventListener('click', function (e) { e.preventDefault(); main.focus(); main.scrollIntoView(); });
      inner.appendChild(skip);
    }
    if (!isHome) {
      inner.appendChild(el('a', { 'class': 'sb-home', href: homeUrl },
        ICONS.psi.replace('<svg ', '<svg class="sb-psi" ') + '<span class="sb-name">AP Psych Lab</span>'));
    }
    var tools = el('div', { 'class': 'sb-tools' });
    // (The course menu goes here, before the switch: Site Redesign step 4c.)
    var btn = el('button', { 'class': 'icon-btn sb-theme', type: 'button' });
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      theme.set(next);
      announce(next === 'dark' ? 'Dark mode.' : 'Light mode.');
    });
    themeBtns.push(btn);
    tools.appendChild(btn);
    inner.appendChild(tools);
    nav.appendChild(inner);
  }

  /* ---------- Full screen ---------- */
  var fsFns = [], fsBtns = [];
  function fsCan() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
  function fsActive() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function fsTarget(b) {
    var id = b.getAttribute('data-target');
    return id ? document.getElementById(id) : root;
  }
  function fsEnter(target) {
    try {
      var p = target.requestFullscreen ? target.requestFullscreen() : target.webkitRequestFullscreen && target.webkitRequestFullscreen();
      if (p && p.catch) p.catch(function () { /* refused (e.g. not from a click): stay as is */ });
    } catch (e) { /* not possible here */ }
  }
  function fsExit() {
    try {
      var p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* already out */ }
  }
  var fsExitBtn = null, fsCard = null;
  function fsLabel(b, on) {
    var label = on ? 'Exit full screen' : 'Full screen';
    b.innerHTML = on ? ICONS.fullscreenExit : ICONS.fullscreen;
    b.setAttribute('aria-label', label);
    b.title = label;
  }
  function fsChanged() {
    var active = fsActive();
    fsBtns.forEach(function (b) { fsLabel(b, active && active === fsTarget(b)); });
    // Card mode: the title bar is out of view, so the card gets its own exit button.
    if (fsCard && fsCard !== active) {
      fsCard.classList.remove('fs-target');
      if (fsExitBtn && fsExitBtn.parentNode) fsExitBtn.parentNode.removeChild(fsExitBtn);
      fsCard = null;
    }
    if (active && active !== root && fsBtns.some(function (b) { return fsTarget(b) === active; })) {
      fsCard = active;
      active.classList.add('fs-target');
      if (!fsExitBtn) {
        fsExitBtn = el('button', { 'class': 'icon-btn fs-exit', type: 'button' });
        fsLabel(fsExitBtn, true);
        fsExitBtn.addEventListener('click', fsExit);
      }
      active.appendChild(fsExitBtn);
    }
    if (active) closePopovers();
    fsFns.forEach(function (fn) { fn(active); });
  }
  document.addEventListener('fullscreenchange', fsChanged);
  document.addEventListener('webkitfullscreenchange', fsChanged);
  function initFullscreen(b) {
    if (!fsCan() || !fsTarget(b)) { b.hidden = true; return; }  // e.g. iPhone Safari
    fsBtns.push(b);
    fsLabel(b, fsActive() === fsTarget(b));
    b.addEventListener('click', function () {
      if (fsActive()) fsExit(); else fsEnter(fsTarget(b));
    });
  }
  var fullscreen = {
    active: fsActive,
    onChange: function (fn) { fsFns.push(fn); }
  };

  /* ---------- Sound (off by default) ---------- */
  var soundFns = [], soundBtns = [];
  var sound = {
    on: false,
    set: function (v) {
      sound.on = !!v;
      soundBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', sound.on ? 'true' : 'false');
        b.title = sound.on ? 'Sound on' : 'Sound off';
      });
      soundFns.forEach(function (fn) { fn(sound.on); });
    },
    onChange: function (fn) { soundFns.push(fn); }
  };
  function initSound(b) {
    soundBtns.push(b);
    if (!b.innerHTML.trim()) b.innerHTML = ICONS.sound;
    b.setAttribute('aria-label', 'Sound');
    b.setAttribute('aria-pressed', 'false');
    b.title = 'Sound off';
    b.addEventListener('click', function () {
      sound.set(!sound.on);
      announce(sound.on ? 'Sound on.' : 'Sound off.');
    });
  }

  /* ---------- Popovers ---------- */
  var openPop = null;  // { pop, btn }
  function popButton(pop) { return document.querySelector('[aria-controls="' + pop.id + '"]'); }
  function openPopover(id) {
    var pop = document.getElementById(id);
    if (!pop) return;
    closePopovers();
    var btn = popButton(pop);
    pop.hidden = false;
    // Keep it on screen: shift sideways if it would cross either edge of the window.
    pop.style.transform = '';
    var r = pop.getBoundingClientRect(), vw = document.documentElement.clientWidth, dx = 0;
    if (r.right > vw - 8) dx = vw - 8 - r.right;
    if (r.left + dx < 8) dx = 8 - r.left;
    if (dx) pop.style.transform = 'translateX(' + Math.round(dx) + 'px)';
    if (btn) btn.setAttribute('aria-expanded', 'true');
    openPop = { pop: pop, btn: btn };
    var first = pop.querySelector('[aria-pressed="true"], button, a[href], input, select, [tabindex]');
    if (first) first.focus(); else { pop.setAttribute('tabindex', '-1'); pop.focus(); }
  }
  function closePopovers(returnFocus) {
    if (!openPop) return;
    openPop.pop.hidden = true;
    if (openPop.btn) {
      openPop.btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) openPop.btn.focus();
    }
    openPop = null;
  }
  function wirePopoverButton(btn) {
    var pop = document.getElementById(btn.getAttribute('aria-controls'));
    if (!pop || !pop.classList.contains('popover') || btn.dataset.uiWired) return;
    btn.dataset.uiWired = '1';
    btn.setAttribute('aria-expanded', 'false');
    pop.hidden = true;
    btn.addEventListener('click', function () {
      if (openPop && openPop.pop === pop) closePopovers(); else openPopover(pop.id);
    });
  }
  document.addEventListener('click', function (e) {
    if (!openPop) return;
    if (openPop.pop.contains(e.target) || (openPop.btn && openPop.btn.contains(e.target))) return;
    closePopovers();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openPop) { e.preventDefault(); closePopovers(true); }
  });

  /* ---------- Modals (<dialog>) ---------- */
  function openModal(id, opts) {
    var d = document.getElementById(id);
    if (!d || typeof d.showModal !== 'function') return;
    opts = opts || {};
    closePopovers();
    var opener = document.activeElement;
    if (d.open) return;
    d.showModal();
    function onClose() {
      d.removeEventListener('close', onClose);
      d.removeEventListener('click', onBackdrop);
      if (opener && opener.focus && document.contains(opener)) opener.focus();
      if (opts.onClose) opts.onClose();
    }
    // A click on the dialog element itself (not its contents) is a click on the backdrop.
    function onBackdrop(e) { if (opts.backdropClose !== false && e.target === d) d.close(); }
    d.addEventListener('close', onClose);
    d.addEventListener('click', onBackdrop);
  }
  function closeModal(id) {
    var d = document.getElementById(id);
    if (d && d.open) d.close();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-modal], dialog [data-ui="close"]') : null;
    if (!t) return;
    if (t.hasAttribute('data-modal')) openModal(t.getAttribute('data-modal'));
    else { var d = t.closest('dialog'); if (d) d.close(); }
  });

  /* ---------- The ⓘ popover ---------- */
  function topicLines(item) {
    var T = window.APPSYCH_TOPICS, lines = [];
    if (item.review) return ['Review game: works with any unit. Choose topics in the game.'];
    if (!T || !item.ced || !item.ced.length) return lines;
    var units = T.teachingUnits.filter(function (u) {
      return u.groups.some(function (g) { return T.matchesCodes(item, g.codes); });
    }).map(function (u) { return 'Unit ' + u.number + ': ' + u.name; });
    var topics = [];
    T.cedUnits.forEach(function (u) {
      u.topics.forEach(function (t) {
        if (T.matchesCodes(item, [t.code])) topics.push(t.code + ' ' + t.name);
      });
    });
    if (units.length) lines.push('Class ' + (units.length > 1 ? 'units: ' : 'unit: ') + units.join('; '));
    if (topics.length) lines.push('CED ' + (topics.length > 1 ? 'topics: ' : 'topic: ') + topics.join('; '));
    return lines;
  }
  function buildInfo(bar, item, n) {
    var brand = bar.querySelector('.brand');
    if (!brand) return;
    var id = 'appsych-info' + (n ? '-' + n : '');
    var btn = el('button', {
      'class': 'icon-btn info', type: 'button', 'aria-controls': id,
      'aria-label': 'About ' + item.title, title: 'About this ' + (item.review ? 'game' : 'activity')
    }, ICONS.info);
    var html = '<p>' + esc(item.description) + '</p>';
    if (item.howTo && item.howTo.length) {
      html += '<h3>How to play</h3><ul>' + item.howTo.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
    }
    var topics = topicLines(item);
    if (topics.length) html += topics.map(function (l) { return '<p class="info-topic">' + esc(l) + '</p>'; }).join('');
    var pop = el('div', { 'class': 'popover info-pop', id: id, role: 'dialog', 'aria-label': 'About ' + item.title, hidden: '' }, html);
    brand.appendChild(btn);
    brand.appendChild(pop);
    wirePopoverButton(btn);
  }

  function wireAll() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ui="sound"]'), function (b) {
      if (!b.dataset.uiSound) { b.dataset.uiSound = '1'; initSound(b); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ui="settings"]'), function (b) {
      if (!b.innerHTML.trim()) b.innerHTML = ICONS.settings;
      b.setAttribute('aria-label', 'Settings');
      b.title = 'Settings';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ui="fullscreen"]'), function (b) {
      if (!b.dataset.uiFs) { b.dataset.uiFs = '1'; initFullscreen(b); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[aria-controls]'), wirePopoverButton);
  }

  /* ---------- Start ---------- */
  var api = {
    sound: sound,
    openPopover: openPopover,
    closePopovers: function () { closePopovers(); },
    openModal: openModal,
    closeModal: closeModal,
    announce: announce,
    icons: ICONS,
    homeUrl: homeUrl,
    refresh: wireAll,
    store: store,
    theme: theme,
    fullscreen: fullscreen,
    interactive: null
  };
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('nav.sitebar'), buildSitebar);
    // Normally one title bar per page (the style guide shows several examples).
    var entries = window.APPSYCH_INTERACTIVES || [];
    Array.prototype.forEach.call(document.querySelectorAll('header.topbar[data-interactive]'), function (bar, n) {
      var id = bar.getAttribute('data-interactive');
      var item = entries.filter(function (d) { return d.id === id; })[0] || null;
      if (n === 0) api.interactive = item;
      if (item) buildInfo(bar, item, n);
    });
    wireAll();
    themeChanged();  // switch icon and label, the browser bar color, and any onChange listeners
  }
  // Deferred scripts run after parsing, so the page is ready; this also covers a plain <script>.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  return api;
})();
