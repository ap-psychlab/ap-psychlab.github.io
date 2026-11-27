/* Term Browser — pick a unit, then a topic, to list its terms, or search them.
 *
 * Search scope: the chosen topic, else the chosen unit, else every term.
 * Unticked "Include definitions" matches term names and aliases only.
 *
 * Courses: terms come from APPSYCH_TOPICS.terms(course), units from unitsFor(course), and the
 * page re-renders on APPSYCH_UI.course.onChange. Class units is the default view; the CED units
 * view and the Codes toggle are AP only (hidden in Regular and Dual Credit). "Unit Exam Terms
 * Only" (off by default) and the Unit Exam badge show only when the course has Unit Exam Terms
 * marked; a group-limited entry counts in its own topic (or a unit holding it), and anywhere when
 * no class topic or unit is chosen (CED view, search across all units).
 * Title bar and ⓘ come from ../../shared/ui.js. No test options (?dev only affects the site bar's
 * course menu).
 */
(function () {
  var TOPICS = window.APPSYCH_TOPICS;
  var UI = window.APPSYCH_UI;
  var $ = function (id) { return document.getElementById(id); };

  var course = UI ? UI.course.get() : "ap";
  var TERMS = [], examAvailable = false;
  var state = { view: "mine", unit: null, topic: null, defs: true, codes: false, q: "", qDefs: false, exam: false };

  function isAP() { return TOPICS.course(course).id === "ap"; }
  function examOn() { return state.exam && examAvailable; }
  function loadCourse() {
    TERMS = TOPICS.terms(course);
    examAvailable = TERMS.some(function (t) { return TOPICS.isUnitTestTerm(t, course); });
    if (!isAP()) { state.view = "mine"; state.codes = false; }
    $("viewSwitch").hidden = !isAP();
    $("codeBtn").hidden = !isAP();
    $("examOpt").hidden = !examAvailable;
    $("viewMine").setAttribute("aria-pressed", state.view === "mine" ? "true" : "false");
    $("viewCed").setAttribute("aria-pressed", state.view === "ced" ? "true" : "false");
    setToggle($("codeBtn"), state.codes, "Codes");
  }

  // Lowercase and straighten curly quotes (Broca’s → broca's). Keeps string length,
  // so match positions line up with the original text for highlighting.
  function norm(s) { return String(s).toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'); }

  function matches(t, q) {
    if (norm(t.term).indexOf(q) !== -1) return true;
    for (var i = 0; i < (t.aliases || []).length; i++) if (norm(t.aliases[i]).indexOf(q) !== -1) return true;
    return state.qDefs && norm(t.definition).indexOf(q) !== -1;
  }

  // Text with every match of q wrapped in <mark>.
  function highlight(parent, text, q) {
    if (!q) { parent.appendChild(document.createTextNode(text)); return parent; }
    var low = norm(text), from = 0, at;
    while ((at = low.indexOf(q, from)) !== -1) {
      if (at > from) parent.appendChild(document.createTextNode(text.slice(from, at)));
      parent.appendChild(el("mark", null, text.slice(at, at + q.length)));
      from = at + q.length;
    }
    if (from < text.length) parent.appendChild(document.createTextNode(text.slice(from)));
    return parent;
  }

  // Build a common shape for both unit systems:
  // { key, title, sub, codes, groupIds, topics: [{ key, title, sub, codes, groupIds }] }
  // groupIds (class units only) decide group-limited Unit Exam Terms; null = anywhere.
  function units() {
    if (state.view === "ced") {
      return TOPICS.cedUnits.map(function (u) {
        var topics = u.topics.map(function (t) {
          return { key: t.code, title: t.code + " " + t.name, sub: "", codes: [t.code], groupIds: null };
        });
        return { key: "ced-" + u.number, title: "Unit " + u.number, sub: u.name,
                 codes: [String(u.number)], groupIds: null, topics: topics };
      });
    }
    return TOPICS.unitsFor(course).map(function (u) {
      var codes = [];
      var topics = u.groups.map(function (g) {
        codes = codes.concat(g.codes);
        return { key: g.id, title: g.name, sub: g.codes.join(", "), codes: g.codes, groupIds: [g.id] };
      });
      return { key: "mine-" + u.id, title: "Unit " + u.letter, sub: u.name, codes: codes,
               groupIds: u.groups.map(function (g) { return g.id; }), topics: topics };
    });
  }

  function isExam(t, groupIds) { return TOPICS.isUnitTestTerm(t, course, groupIds || null); }

  // The course's terms in these codes (all of them when codes is null), only Unit Exam Terms
  // when that box is ticked.
  function termsFor(codes, groupIds) {
    return TERMS.filter(function (t) {
      return (!codes || TOPICS.matchesCodes(t, codes)) && (!examOn() || isExam(t, groupIds));
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function pickButton(key, title, sub, count, pressed, onClick, extraCls) {
    var li = el("li");
    var b = el("button");
    b.type = "button";
    b.setAttribute("data-key", key);
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
    var label = el("span", "label" + (extraCls ? " " + extraCls : ""));
    label.appendChild(el("b", null, title));
    if (sub) label.appendChild(el("span", "sub", sub));
    b.appendChild(label);
    var c = el("span", "count", String(count));
    c.setAttribute("aria-label", count + (count === 1 ? " term" : " terms"));
    b.appendChild(c);
    b.addEventListener("click", onClick);
    li.appendChild(b);
    return li;
  }

  function currentUnit() {
    var list = units();
    for (var i = 0; i < list.length; i++) if (list[i].key === state.unit) return list[i];
    return null;
  }

  function currentTopic(unit) {
    if (!unit || !state.topic) return null;
    if (state.topic === "all") return { key: "all", title: "All topics in " + unit.title, codes: unit.codes, groupIds: unit.groupIds };
    for (var i = 0; i < unit.topics.length; i++) if (unit.topics[i].key === state.topic) return unit.topics[i];
    return null;
  }

  // On stacked (phone) layouts, bring the next column into view after a choice.
  function reveal(id) {
    if (!window.matchMedia || !window.matchMedia("(max-width: 759px)").matches) return;
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $(id).scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }

  function renderUnits() {
    var list = $("unitList");
    list.innerHTML = "";
    units().forEach(function (u) {
      // The unit name always shows; it is not a code.
      var n = termsFor(u.codes, u.groupIds).length;
      list.appendChild(pickButton(u.key, u.title, null, n, u.key === state.unit, function () {
        state.unit = u.key; state.topic = null;
        render(); reveal("topicCol");
        say(u.title + ", " + u.sub + ": " + n + (n === 1 ? " term" : " terms"));
      }));
      list.lastChild.querySelector(".label").appendChild(el("span", "name", u.sub));
    });
  }

  function renderTopics(unit) {
    var list = $("topicList");
    list.innerHTML = "";
    list.classList.toggle("no-codes", !state.codes);
    $("topicEmpty").hidden = !!unit;
    $("topicH").textContent = unit ? "Topic: " + unit.title : "Topic";
    if (!unit) return;
    list.appendChild(pickButton("all", "All topics in this unit", null, termsFor(unit.codes, unit.groupIds).length,
      state.topic === "all", function () { chooseTopic("all"); }, "all"));
    unit.topics.forEach(function (t) {
      list.appendChild(pickButton(t.key, t.title, t.sub, termsFor(t.codes, t.groupIds).length, t.key === state.topic,
        function () { chooseTopic(t.key); }));
    });
  }

  function chooseTopic(key) {
    state.topic = key;
    render(); reveal("termCol");
    var topic = currentTopic(currentUnit());
    if (topic) { var n = termsFor(topic.codes, topic.groupIds).length; say(topic.title + ": " + n + (n === 1 ? " term" : " terms")); }
  }

  // What the term list shows: { items, scope } or null when nothing is chosen or typed.
  function shownTerms(unit, topic) {
    var q = norm(state.q.trim());
    if (!q) return topic ? { items: termsFor(topic.codes, topic.groupIds), scope: null, groupIds: topic.groupIds } : null;
    var scope = topic && topic.key !== "all" ? topic : unit ? { title: unit.title + " (" + unit.sub + ")", codes: unit.codes, groupIds: unit.groupIds } : null;
    var pool = scope ? termsFor(scope.codes, scope.groupIds) : termsFor(null, null);
    return { items: pool.filter(function (t) { return matches(t, q); }), scope: scope, q: q,
             groupIds: scope ? scope.groupIds : null };
  }

  function renderTerms(unit, topic) {
    var list = $("termList");
    var info = $("matchInfo");
    list.innerHTML = "";
    info.innerHTML = "";
    list.classList.toggle("no-defs", !state.defs);
    list.classList.toggle("no-codes", !state.codes);
    var shown = shownTerms(unit, topic);
    $("termEmpty").hidden = !!shown;
    document.querySelector(".browser").classList.toggle("searching", !!(shown && shown.q));
    info.hidden = !(shown && shown.q);
    if (!shown) { $("termH").textContent = "Terms"; return; }
    var items = shown.items;
    $("termH").textContent = "Terms (" + items.length + ")";
    if (shown.q) {
      var where = shown.scope ? " in " + shown.scope.title : " in all units";
      info.appendChild(document.createTextNode(
        (items.length ? items.length + (items.length === 1 ? " match" : " matches") : "No matches") +
        " for \u201C" + state.q.trim() + "\u201D" + where + (state.qDefs ? " (names and definitions" : " (names only") +
        (examOn() ? ", Unit Exam Terms)." : ").")));
      if (shown.scope) {
        info.appendChild(document.createTextNode(" "));
        var all = el("button", "linkish", "Search all units");
        all.type = "button";
        all.addEventListener("click", function () {
          state.unit = null; state.topic = null; render(); $("q").focus(); announce();
        });
        info.appendChild(all);
      }
    }
    var hq = shown.q || "";
    var frag = document.createDocumentFragment();
    items.forEach(function (t) {
      var li = el("li", "term");
      // Matched only in its definition: keep that definition visible even with Definitions off.
      if (hq && state.qDefs && norm(t.term).indexOf(hq) === -1 &&
          !(t.aliases || []).some(function (a) { return norm(a).indexOf(hq) !== -1; })) li.classList.add("def-hit");
      var name = highlight(el("div", "term-name"), t.term, hq);
      if (examAvailable && isExam(t, shown.groupIds)) {
        name.appendChild(document.createTextNode(" "));
        name.appendChild(el("span", "exam-badge", "Unit Exam"));
      }
      li.appendChild(name);
      li.appendChild(highlight(el("p", "def"), t.definition, state.qDefs ? hq : ""));
      if (t.aliases && t.aliases.length) li.appendChild(highlight(el("p", "aka"), "Also: " + t.aliases.join(", "), hq));
      var codes = el("div", "codes");
      t.ced.forEach(function (c) { codes.appendChild(el("span", "chip", "CED " + c)); });
      (t.skills || []).forEach(function (s) { codes.appendChild(el("span", "chip skill", "Skill " + s)); });
      li.appendChild(codes);
      frag.appendChild(li);
    });
    list.appendChild(frag);
  }

  function renderStats(unit, topic) {
    $("totalL").textContent = examOn() ? "Unit Exam Terms" : "All terms";
    $("totalV").textContent = termsFor(null, null).length;
    $("unitV").textContent = unit ? termsFor(unit.codes, unit.groupIds).length : "–";
    $("topicV").textContent = topic ? termsFor(topic.codes, topic.groupIds).length : "–";
  }

  function render() {
    // Re-rendering replaces the buttons, so remember which one had focus.
    var active = document.activeElement;
    var focusKey = active && active.getAttribute && active.getAttribute("data-key");
    var focusList = focusKey && active.closest("ul") ? active.closest("ul").id : null;
    var unit = currentUnit();
    if (!unit) state.unit = state.topic = null;      // e.g. not in the course chosen now
    var topic = currentTopic(unit);
    if (!topic) state.topic = null;
    renderUnits();
    renderTopics(unit);
    renderTerms(unit, topic);
    renderStats(unit, topic);
    if (focusList) {
      var again = $(focusList).querySelector('[data-key="' + focusKey + '"]');
      if (again) again.focus({ preventScroll: true });
    }
  }

  function say(msg) { if (UI) UI.announce(msg); }

  function setToggle(btn, on, name) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = name + ": " + (on ? "On" : "Off");
  }

  function setView(view) {
    if (state.view === view) return;
    state.view = view; state.unit = null; state.topic = null;
    $("viewCed").setAttribute("aria-pressed", view === "ced" ? "true" : "false");
    $("viewMine").setAttribute("aria-pressed", view === "mine" ? "true" : "false");
    render();
    say(view === "ced" ? "Showing CED units" : "Showing class units");
  }

  $("viewCed").addEventListener("click", function () { setView("ced"); });
  $("viewMine").addEventListener("click", function () { setView("mine"); });
  $("defBtn").addEventListener("click", function () {
    state.defs = !state.defs; setToggle(this, state.defs, "Definitions"); render();
  });
  $("codeBtn").addEventListener("click", function () {
    state.codes = !state.codes; setToggle(this, state.codes, "Codes"); render();
  });

  // Search: filter as the player types; announce the count after a short pause.
  var sayTimer = null;
  function announce() {
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var shown = shownTerms(currentUnit(), currentTopic(currentUnit()));
      if (shown && shown.q) say($("matchInfo").firstChild.textContent);
    }, 500);
  }
  $("q").addEventListener("input", function () { state.q = this.value; render(); announce(); });
  $("q").addEventListener("keydown", function (e) {
    if (e.key === "Escape" && this.value) { e.preventDefault(); this.value = ""; state.q = ""; render(); say("Search cleared"); }
  });
  $("qDefs").addEventListener("change", function () { state.qDefs = this.checked; render(); announce(); });
  $("examOnly").addEventListener("change", function () {
    state.exam = this.checked; render();
    say(state.exam ? "Showing Unit Exam Terms only" : "Showing all terms");
  });

  if (UI) UI.course.onChange(function (id) {
    course = id; loadCourse(); render();
  });

  if (!TOPICS || !window.APPSYCH_TERMS || !window.APPSYCH_TERMS.length) {
    $("termEmpty").textContent = "The term bank didn't load. Check that shared/data/terms.js and topics.js exist.";
    $("termEmpty").hidden = false;
    return;
  }
  // A browser may restore the box after a reload; start from what is shown.
  state.q = $("q").value; state.qDefs = $("qDefs").checked; state.exam = $("examOnly").checked;
  loadCourse();
  render();
})();
