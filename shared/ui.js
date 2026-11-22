/* AP Psych Lab — shared title bar, sound, popovers and modals: window.APPSYCH_UI
 *
 * Load after shared/data/topics.js and shared/data/demos.js, before the demo's script.js
 * (all with defer):
 *   <script src="../../shared/data/topics.js" defer></script>
 *   <script src="../../shared/data/demos.js" defer></script>
 *   <script src="../../shared/ui.js" defer></script>
 *   <script src="script.js" defer></script>
 *
 * TITLE BAR — the first thing in <body>. Write this; ui.js fills in the rest.
 *   <header class="topbar wide" data-demo="lights-off">   ("wide" for the Split and Stage templates)
 *     <div class="topbar-inner">
 *       <div class="brand"><h1>Lights Off</h1></div>      ui.js adds the ⓘ button and its popover
 *       <div class="modes" role="group" aria-label="Game mode">   optional, only with 2+ modes;
 *         <button class="mode" type="button" aria-pressed="true">Practice</button>   the demo sets
 *         <button class="mode" type="button" aria-pressed="false">Timed</button>     aria-pressed
 *       </div>
 *       <div class="tools">                                 optional; each button only if used
 *         <button class="icon-btn" type="button" data-ui="sound"></button>
 *         <button class="icon-btn" type="button" data-ui="settings" aria-controls="settings"></button>
 *         <div class="popover" id="settings" role="dialog" aria-label="Settings" hidden>…</div>
 *       </div>
 *     </div>
 *   </header>
 *   - data-demo is the demo's id in demos.js. The ⓘ popover shows its description, howTo,
 *     CED topic(s) and class unit(s), and "All demos". Without a matching entry there is no
 *     ⓘ button.
 *   - ui.js gives data-ui="sound" and data-ui="settings" buttons their icon, label and title.
 *
 * SOUND — off on every page load.
 *   APPSYCH_UI.sound.on                 true or false; check before playing a sound
 *   APPSYCH_UI.sound.set(bool)          turn it on or off from code (updates the button)
 *   APPSYCH_UI.sound.onChange(fn)       fn(on) after every change (e.g. to start Web Audio)
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
 *   APPSYCH_UI.demo                     this page's demos.js entry, or null
 *   APPSYCH_UI.homeUrl                  the home page's address (works from file:// too)
 *   APPSYCH_UI.announce(text)           read text aloud to screen readers (polite)
 *   APPSYCH_UI.icons                    SVG markup: info, sound, settings, restart, close
 *   APPSYCH_UI.refresh()                wire popover buttons and sound/settings icons added later
 *
 * SHARING A LINK — there are no teacher links in the ⓘ. A demo keeps its shareable choices in
 *   the address (e.g. ?mode= when a mode is chosen, ?groups= when topics are chosen), so teachers
 *   copy the address bar.
 */
window.APPSYCH_UI = (function () {
  var ICONS = {
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/>' +
      '<path class="snd-on" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="snd-on" d="M18.5 5.5a9 9 0 0 1 0 13"/>' +
      '<path class="snd-off" d="m16 9 6 6"/><path class="snd-off" d="m22 9-6 6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>'
  };

  // The home page: one folder above shared/, where this script lives.
  var me = document.currentScript || document.querySelector('script[src$="shared/ui.js"]');
  var homeUrl = me ? new URL('../index.html', me.src).href : '/';

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
  function topicLines(demo) {
    var T = window.APPSYCH_TOPICS, lines = [];
    if (demo.review) return ['Review game: works with any unit. Choose topics in the game.'];
    if (!T || !demo.ced || !demo.ced.length) return lines;
    var units = T.teachingUnits.filter(function (u) {
      return u.groups.some(function (g) { return T.matchesCodes(demo, g.codes); });
    }).map(function (u) { return 'Unit ' + u.number + ': ' + u.name; });
    var topics = [];
    T.cedUnits.forEach(function (u) {
      u.topics.forEach(function (t) {
        if (T.matchesCodes(demo, [t.code])) topics.push(t.code + ' ' + t.name);
      });
    });
    if (units.length) lines.push('Class ' + (units.length > 1 ? 'units: ' : 'unit: ') + units.join('; '));
    if (topics.length) lines.push('CED ' + (topics.length > 1 ? 'topics: ' : 'topic: ') + topics.join('; '));
    return lines;
  }
  function buildInfo(bar, demo, n) {
    var brand = bar.querySelector('.brand');
    if (!brand) return;
    var id = 'appsych-info' + (n ? '-' + n : '');
    var btn = el('button', {
      'class': 'icon-btn info', type: 'button', 'aria-controls': id,
      'aria-label': 'About ' + demo.title, title: 'About this ' + (demo.review ? 'game' : 'demo')
    }, ICONS.info);
    var html = '<p>' + esc(demo.description) + '</p>';
    if (demo.howTo && demo.howTo.length) {
      html += '<h3>How to play</h3><ul>' + demo.howTo.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
    }
    var topics = topicLines(demo);
    if (topics.length) html += topics.map(function (l) { return '<p class="info-topic">' + esc(l) + '</p>'; }).join('');
    html += '<a class="info-home" href="' + esc(homeUrl) + '">All demos</a>';
    var pop = el('div', { 'class': 'popover info-pop', id: id, role: 'dialog', 'aria-label': 'About ' + demo.title, hidden: '' }, html);
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
    demo: null
  };
  function init() {
    // Normally one title bar per page (the style guide shows several examples).
    var list = window.APPSYCH_DEMOS || [];
    Array.prototype.forEach.call(document.querySelectorAll('header.topbar[data-demo]'), function (bar, n) {
      var id = bar.getAttribute('data-demo');
      var demo = list.filter(function (d) { return d.id === id; })[0] || null;
      if (n === 0) api.demo = demo;
      if (demo) buildInfo(bar, demo, n);
    });
    wireAll();
  }
  // Deferred scripts run after parsing, so the page is ready; this also covers a plain <script>.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  return api;
})();
