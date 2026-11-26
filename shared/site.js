/* AP Psych Lab — the home page: unit sidebar (a menu under 1000px), activity cards and the
 * first-visit course question. Built from shared/data/interactives.js and topics.js for the
 * course chosen in the site bar (APPSYCH_UI.course); everything re-renders when it changes.
 *
 * Views: "All Activities" (every activity, each tagged with its unit), one unit (its activities
 * and "Review this unit"), or "Review Activities". The chosen view is the address hash (#cognition,
 * #review; none for All), so a link can open a unit. A hash the course doesn't have shows All.
 * An activity shows when it is listed (?dev: unlisted too, with an "Unlisted" badge) and is in
 * the chosen course (APPSYCH_TOPICS.interactiveInCourse), under each unit it matches (unitsOf).
 *
 * Loaded by index.html after topics.js, interactives.js and ui.js (all defer).
 */
(function () {
  var T = window.APPSYCH_TOPICS, UI = window.APPSYCH_UI, ITEMS = window.APPSYCH_INTERACTIVES || [];
  var nav = document.querySelector('.units');
  var pickBand = document.querySelector('.unit-pick');
  var pick = document.getElementById('unitPick');
  var main = document.querySelector('.home-main');
  if (!T || !UI || !nav || !pick || !main) return;

  var DEV = /[?&]dev(=|&|$)/.test(location.search);
  var FILE = location.protocol === 'file:';

  // Card badges for interactives.js "type" (tools/check-data.js lists the same ids).
  var TYPES = {
    experiment: 'Experiment', simulation: 'Simulation', game: 'Game', puzzle: 'Puzzle',
    lesson: 'Lesson', quiz: 'Quiz', 'class-game': 'Class game', reference: 'Reference'
  };
  // "Review this unit": topic-picker games, opened with the unit's groups in ?groups=.
  // Add a game here once it reads ?groups= (it shows only while its entry is listed, or with ?dev).
  var REVIEW_GAMES = [
    { id: 'practice-questions', label: 'Practice Questions' },
    { id: 'word-search', label: 'Word Search' },
    { id: 'sky-climb', label: 'Sky Climb' },
    { id: 'quiz-board', label: 'Classroom Quiz Board' }
  ];

  var ICON = {
    all: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>'
  };

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function plural(n) { return n === 1 ? '1 activity' : n + ' activities'; }
  // From a local folder (file://) a folder address shows a file list, so link its index.html.
  function href(item, query) { return item.path + (FILE ? 'index.html' : '') + (query || ''); }
  function byId(id) { return ITEMS.filter(function (it) { return it.id === id; })[0] || null; }
  function shown(it) { return it.status === 'listed' || DEV; }

  /* ---------- What the chosen course shows ---------- */
  var model = null;  // { units: [{ id, letter, name, groups, items }], review: [], all: [] }
  function buildModel() {
    var c = UI.course.get();
    var units = T.unitsFor(c).map(function (u) { u.items = []; return u; });
    var review = [], all = [];
    ITEMS.forEach(function (it) {
      if (!shown(it) || !T.interactiveInCourse(it, c)) return;
      if (it.review) { review.push(it); return; }
      var ids = T.unitsOf(it, c).map(function (u) { return u.id; });
      units.forEach(function (u) { if (ids.indexOf(u.id) >= 0) u.items.push(it); });
      all.push({ it: it, first: ids.length ? units.map(function (u) { return u.id; }).indexOf(ids[0]) : units.length });
    });
    // All: in unit order (then interactives.js order), review games last
    all.sort(function (a, b) { return a.first - b.first; });
    model = { course: c, units: units, review: review, all: all.map(function (x) { return x.it; }).concat(review) };
  }
  function unitLabels(it) {
    if (it.review) return 'Review';
    return T.unitsOf(it, model.course).map(function (u) { return 'Unit ' + u.letter + ' · ' + u.name; }).join('; ');
  }

  /* ---------- Sidebar and its phone menu ---------- */
  function views() {
    return [{ id: 'all', name: 'All Activities', count: model.all.length, icon: ICON.all }]
      .concat(model.units.map(function (u) {
        return { id: u.id, letter: u.letter, name: u.name, count: u.items.length };
      }))
      .concat([{ id: 'review', name: 'Review Activities', count: model.review.length, icon: ICON.review }]);
  }
  function renderNav() {
    nav.innerHTML = views().map(function (v) {
      var mark = v.letter ? '<span class="unit-letter" aria-hidden="true">' + v.letter + '</span>' : v.icon;
      var name = v.letter ? '<span class="sr-only">Unit ' + v.letter + ': </span>' + esc(v.name) : esc(v.name);
      var count = v.count ? '<span aria-hidden="true">' + v.count + '</span><span class="sr-only">, ' + plural(v.count) + '</span>'
        : '<span aria-hidden="true">–</span><span class="sr-only">, no activities yet</span>';
      return '<button type="button" class="unit-btn" data-view="' + v.id + '" aria-pressed="false">' + mark +
        '<span class="unit-name">' + name + '</span><span class="unit-count">' + count + '</span></button>';
    }).join('');
    nav.hidden = false;
    pick.innerHTML = views().map(function (v) {
      return '<option value="' + v.id + '">' + (v.letter ? v.letter + ' · ' : '') + esc(v.name) + ' (' + v.count + ')</option>';
    }).join('');
    pickBand.hidden = false;
  }
  nav.addEventListener('click', function (e) {
    var b = e.target.closest('.unit-btn');
    if (b) show(b.getAttribute('data-view'), true);
  });
  pick.addEventListener('change', function () { show(pick.value, true); });

  /* ---------- Cards and views ---------- */
  function card(it, withUnit) {
    var img = it.image
      ? '<img src="' + esc(it.path + it.image) + '" alt="' + esc(it.alt || '') + '" width="1200" height="750" loading="lazy">'
      : ICON.image;
    var tags = '<span class="badge">' + esc(TYPES[it.type] || it.type || 'Activity') + '</span>' +
      (it.status !== 'listed' ? '<span class="badge unlisted">Unlisted</span>' : '') +
      (withUnit ? '<span class="act-unit">' + esc(unitLabels(it)) + '</span>' : '');
    return '<li><a class="act" href="' + esc(href(it)) + '"><div class="act-img">' + img + '</div>' +
      '<div class="act-body"><h3>' + esc(it.title) + '</h3><div class="act-tags">' + tags + '</div>' +
      '<p>' + esc(it.description) + '</p></div></a></li>';
  }
  function cards(list, withUnit) {
    return '<ul class="cards">' + list.map(function (it) { return card(it, withUnit); }).join('') + '</ul>';
  }
  function head(eyebrow, title, line) {
    return '<div class="view-head">' + (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + '</p>' : '') +
      '<h2>' + esc(title) + '</h2>' + (line ? '<p>' + esc(line) + '</p>' : '') + '</div>';
  }
  function reviewRow(u) {
    var games = REVIEW_GAMES.map(function (g) { return { g: g, it: byId(g.id) }; })
      .filter(function (x) { return x.it && shown(x.it); });
    if (!games.length) return '';
    var q = '?groups=' + u.groups.map(function (g) { return g.id; }).join(',');
    return '<section class="review-row" aria-labelledby="reviewRowTitle"><h3 id="reviewRowTitle">Review this unit</h3>' +
      '<p>These review activities open with this unit’s topics already chosen.</p><ul class="review-links">' +
      games.map(function (x) { return '<li><a href="' + esc(href(x.it, q)) + '">' + esc(x.g.label) + '</a></li>'; }).join('') +
      '</ul></section>';
  }
  function viewHtml(id) {
    if (id === 'all') {
      return head(null, 'All Activities', plural(model.all.length) +
        '. Choose a unit to see just its activities and the review activities for its topics.') + cards(model.all, true);
    }
    if (id === 'review') {
      return head('Any unit · ' + plural(model.review.length), 'Review Activities',
        'Each one lets you choose the topics to practice.') + cards(model.review, false);
    }
    var u = model.units.filter(function (x) { return x.id === id; })[0];
    var body = u.items.length ? cards(u.items, false)
      : '<div class="empty-note"><p>No activities for this unit yet.</p>' +
        '<p>The review activities below already work with its topics.</p></div>';
    return head('Unit ' + u.letter + ' · ' + plural(u.items.length), u.name,
      'Topics: ' + u.groups.map(function (g) { return g.name; }).join(' · ')) + body + reviewRow(u);
  }

  /* ---------- The chosen view (address hash) ---------- */
  var current = 'all';
  function valid(id) {
    if (id === 'review') return id;
    return id && T.unitIn(model.course, id) ? id : 'all';
  }
  function hashView() {
    var h = location.hash.replace(/^#/, '');
    try { h = decodeURIComponent(h); } catch (e) { /* keep as is */ }
    return h;
  }
  function writeHash() {
    var want = current === 'all' ? '' : '#' + current;
    if (location.hash === want || (!want && !location.hash)) return;
    try { history.replaceState(null, '', location.pathname + location.search + want); }
    catch (e) { /* some browsers block this on file:// pages */ }
  }
  function describe(id) {
    if (id === 'all') return 'All Activities: ' + plural(model.all.length) + '.';
    if (id === 'review') return 'Review Activities: ' + plural(model.review.length) + '.';
    var u = T.unitIn(model.course, id);
    var n = model.units.filter(function (x) { return x.id === id; })[0].items.length;
    return 'Unit ' + u.letter + ', ' + u.name + ': ' + plural(n) + '.';
  }
  function show(id, fromUser) {
    current = valid(id);
    Array.prototype.forEach.call(nav.querySelectorAll('.unit-btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === current ? 'true' : 'false');
    });
    pick.value = current;
    main.innerHTML = '<div class="view">' + viewHtml(current) + '</div>';
    writeHash();
    if (fromUser) UI.announce(describe(current));
  }
  window.addEventListener('hashchange', function () { show(hashView(), false); });

  function render() {
    buildModel();
    renderNav();
    show(current, false);
  }
  current = hashView() || 'all';
  render();
  UI.course.onChange(render);  // keeps the unit if the new course has it, otherwise All

  /* ---------- First-visit course question ---------- */
  // Shown while 2+ courses are offered (the menu's rule) until a course is chosen here or in the
  // menu, or it is dismissed (appsych.coursePrompt = "done"). A course already saved, or a
  // ?course= link, counts as chosen.
  (function courseAsk() {
    var list = UI.course.offered();
    var tools = document.querySelector('.sitebar[data-home] .sb-tools');
    if (list.length < 2 || !tools) return;
    if (UI.store.get('coursePrompt', null) === 'done') return;
    if (UI.store.get('course', null) || /[?&]course=/.test(location.search)) return;

    var box = document.createElement('section');
    box.className = 'course-ask';
    box.setAttribute('aria-labelledby', 'courseAskTitle');
    box.innerHTML = '<div class="course-ask-head"><p class="course-ask-title" id="courseAskTitle">Which class are you in?</p>' +
      '<button type="button" class="icon-btn" data-ask="close" aria-label="Close" title="Close">' + UI.icons.close + '</button></div>' +
      '<p class="course-ask-text">The site shows your course’s units. You can change it any time in the Course menu.</p>' +
      '<div class="course-ask-choices">' + list.map(function (c) {
        return '<button type="button" class="btn alt" data-ask="' + esc(c.id) + '">' + esc(c.name) + '</button>';
      }).join('') + '</div>';
    tools.appendChild(box);
    // Point the arrow at the middle of the course menu.
    function aim() {
      var sel = tools.querySelector('.sb-select');
      if (!sel || !box.parentNode) return;
      var t = tools.getBoundingClientRect(), r = sel.getBoundingClientRect();
      box.style.setProperty('--arrow-right', Math.round(t.right - (r.left + r.width / 2) - 7) + 'px');
    }
    aim();
    window.addEventListener('resize', aim);

    var open = true;
    function finish(focusMenu) {
      if (!open) return;
      open = false;
      UI.store.set('coursePrompt', 'done');
      var hadFocus = box.contains(document.activeElement);
      box.parentNode.removeChild(box);
      window.removeEventListener('resize', aim);
      if (focusMenu || hadFocus) UI.course.focusMenu();
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ask]');
      if (!b) return;
      var id = b.getAttribute('data-ask');
      if (id === 'close') { finish(true); return; }
      if (UI.course.set(id)) {
        var c = T.getCourse(id);
        UI.announce('Course: ' + (c ? c.name : id) + '.');
      }
      finish(true);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(true); }
    });
    UI.course.onChange(function () { finish(false); });  // chosen in the menu (or another tab)
  })();
})();
