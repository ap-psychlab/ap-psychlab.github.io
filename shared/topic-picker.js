/* Shared "Choose topics" dialog: window.APPSYCH_TOPIC_PICKER
 *
 * Lets players check topics from the chosen course's class units (with select-all per unit)
 * or, in AP only, the CED's units, and filters a bank of terms or questions to them.
 *
 * Load after shared/data/topics.js and the banks the game uses (terms.js, questions.js), and
 * after shared/ui.js when the page has it (for the course and saved topics):
 *   <link rel="stylesheet" href="../../shared/topic-picker.css">
 *   <script src="../../shared/topic-picker.js" defer></script>
 *
 * Usage:
 *   var picker = APPSYCH_TOPIC_PICKER.create({
 *     items: bank,                    // terms or questions (anything with ced: [...]); items
 *                                    // built from terms must keep the term's id
 *     kind: "terms",                 // optional: "terms" or "questions" (else worked out:
 *                                    // items with choiceRefs are questions)
 *     noun: ["term", "terms"],       // used in counts: "1 term", "12 terms"
 *     openButton: buttonElement,     // opens the dialog
 *     summary: spanElement,          // optional: shows "All topics · 824 terms"
 *     intro: "Terms are drawn from the topics you check.",
 *     onChange: function (pool) {}   // after the player presses Done, and after the course changes
 *   });
 *   picker.pool()      // items in the selected topics (and the course; Unit Exam Terms if chosen)
 *   picker.label()     // "All topics", "Memory, Thinking", or "5 topics"
 *   picker.codes()     // the content codes of the checked topics, e.g. ["0.1", "2.3"]
 *   picker.unitExam()  // true when the pool is limited to Unit Exam Terms
 *
 * Course: APPSYCH_UI.course (AP on pages without ui.js). Only the course's items are used,
 *   the class units are the course's, and the CED view is offered in AP only. When the course
 *   changes, the selection keeps the topics the new course has and onChange runs.
 * Unit Exam Terms Only: a checkbox, on by default, shown when the course has Unit Exam Terms
 *   marked. If the chosen topics have none, the pool uses every item and the dialog says so.
 * Address: reads ?groups=<group ids> or ?ced=<CED topic codes> (AP only) and ?all (Unit Exam
 *   Terms Only unchecked), and writes them back on Done so a teacher can copy a link.
 * Saving (pages with ui.js): Done saves the selection as "topics" (APPSYCH_UI.store); with no
 *   ?groups=, ?ced= or ?all in the address, the saved one is restored (topics the course or
 *   this game doesn't have are dropped) and written to the address. Shared by every game.
 * Topics with no items show a count of 0 and can't be checked.
 */
window.APPSYCH_TOPIC_PICKER = (function () {
  "use strict";

  var uid = 0;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function param(name) {
    var m = new RegExp("[?&]" + name + "(=([^&#]*))?(&|#|$)").exec(location.search);
    return m ? decodeURIComponent(m[2] || "") : null;
  }
  function list(text) {
    return String(text).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function codeOverlap(a, b) {
    return a === b || a.indexOf(b + ".") === 0 || b.indexOf(a + ".") === 0;
  }

  function create(opts) {
    var TOPICS = window.APPSYCH_TOPICS;
    var UI = window.APPSYCH_UI || null;
    var items = opts.items || [];
    var one = (opts.noun && opts.noun[0]) || "item";
    var many = (opts.noun && opts.noun[1]) || "items";
    var countText = function (n) { return n + " " + (n === 1 ? one : many); };
    var n = ++uid;

    var isQuestion = function (x) {
      return opts.kind ? opts.kind === "questions" : Array.isArray(x.choiceRefs);
    };
    var termOf = function (x) { return TOPICS.getTerm(x.id) || x; };

    var course = UI && UI.course ? UI.course.get() : TOPICS.defaultCourse;
    var hasCed = function () { return course === "ap"; };
    function inCourse(x) {
      if (isQuestion(x)) return TOPICS.questionInCourse(x, course);
      var t = termOf(x);
      return t.courses ? TOPICS.termInCourse(t, course) : true;
    }
    function isUnitExam(x, groupIds) {
      return isQuestion(x) ? TOPICS.isUnitTestQuestion(x, course) : TOPICS.isUnitTestTerm(termOf(x), course, groupIds);
    }

    var courseItems = [], examAvailable = false, UNITS = {};
    var matching = function (codes) {
      return courseItems.filter(function (t) { return TOPICS.matchesCodes(t, codes); });
    };

    // Both unit systems in one shape, with item counts worked out once:
    // [{ title, name, count, items: [{ id, title, codes, count }] }]
    function build(mode) {
      var src = mode === "ced"
        ? TOPICS.cedUnits.map(function (u) {
            return { title: "Unit " + u.number, name: u.name,
              items: u.topics.map(function (t) { return { id: t.code, title: t.code + " " + t.name, codes: [t.code] }; }) };
          })
        : TOPICS.unitsFor(course).map(function (u) {
            return { title: "Unit " + u.letter, name: u.name,
              items: u.groups.map(function (g) { return { id: g.id, title: g.name, codes: g.codes }; }) };
          });
      src.forEach(function (u) {
        var codes = [];
        u.items.forEach(function (i) { i.count = matching(i.codes).length; codes = codes.concat(i.codes); });
        u.count = matching(codes).length;
      });
      return src;
    }
    function setup() {
      courseItems = items.filter(inCourse);
      examAvailable = courseItems.some(function (x) { return isUnitExam(x, null); });
      UNITS = { mine: build("mine"), ced: hasCed() ? build("ced") : [] };
    }
    setup();

    function enabledIds(mode) {
      var out = [];
      UNITS[mode].forEach(function (u) { u.items.forEach(function (i) { if (i.count > 0) out.push(i.id); }); });
      return out;
    }
    function codesFor(sel) {
      var out = [];
      UNITS[sel.mode].forEach(function (u) {
        u.items.forEach(function (i) { if (sel.ids.has(i.id)) out = out.concat(i.codes); });
      });
      return out;
    }
    // The group ids a selection covers (for group-limited Unit Exam Terms)
    function groupIdsFor(sel) {
      if (sel.mode === "mine") return Array.from(sel.ids);
      var codes = codesFor(sel);
      return TOPICS.allGroups().filter(function (g) {
        return g.codes.some(function (gc) { return codes.some(function (c) { return codeOverlap(gc, c); }); });
      }).map(function (g) { return g.id; });
    }
    function isAll(sel) { return sel.ids.size === enabledIds(sel.mode).length; }
    function allSel(exam) { return { mode: "mine", ids: new Set(enabledIds("mine")), exam: exam }; }

    // What the selection gives: { base: items in the topics, pool, examUsed, examEmpty }
    function resolve(sel) {
      var base = matching(codesFor(sel));
      if (!sel.exam || !examAvailable) return { base: base, pool: base, examUsed: false, examEmpty: false };
      var ids = groupIdsFor(sel);
      var ex = base.filter(function (x) { return isUnitExam(x, ids); });
      return ex.length ? { base: base, pool: ex, examUsed: true, examEmpty: false }
                       : { base: base, pool: base, examUsed: false, examEmpty: base.length > 0 };
    }

    // Keep only topics this course and this game have; none left means every topic.
    function keep(mode, ids, exam) {
      if (mode === "ced" && !hasCed()) return null;
      var ok = enabledIds(mode);
      var kept = ids.filter(function (id) { return ok.indexOf(id) !== -1; });
      return kept.length ? { mode: mode, ids: new Set(kept), exam: exam } : null;
    }

    function readSelection() {
      var groups = param("groups"), ced = param("ced"), all = param("all");
      if (groups !== null || ced !== null || all !== null) {
        // The address wins over anything saved
        var exam = all === null;
        var sel = groups !== null ? keep("mine", list(groups), exam) : null;
        if (!sel && ced !== null) sel = keep("ced", list(ced), exam);
        return { sel: sel || allSel(exam), restored: false };
      }
      var saved = UI && UI.store ? UI.store.get("topics", null) : null;
      if (saved && typeof saved === "object") {
        var ex = saved.unitExam !== false;
        var s = Array.isArray(saved.groups) ? keep("mine", saved.groups, ex)
              : Array.isArray(saved.ced) ? keep("ced", saved.ced, ex) : null;
        return { sel: s || allSel(ex), restored: true };
      }
      return { sel: allSel(true), restored: false };
    }

    // Keep the address in sync so a teacher can copy a link to a topic set
    function writeSelection() {
      var params = location.search.replace(/^\?/, "").split("&")
        .filter(function (p) { return p && !/^(groups|ced|all)(=|$)/.test(p); });
      if (!isAll(selection)) {
        params.push((selection.mode === "mine" ? "groups=" : "ced=") + Array.from(selection.ids).join(","));
      }
      if (examAvailable && !selection.exam) params.push("all");
      try {
        history.replaceState(null, "", location.pathname + (params.length ? "?" + params.join("&") : "") + location.hash);
      } catch (err) { /* some browsers block this on file:// pages */ }
    }
    function saveSelection() {
      if (!UI || !UI.store) return;
      var data = { unitExam: selection.exam };
      if (!isAll(selection)) data[selection.mode === "mine" ? "groups" : "ced"] = Array.from(selection.ids);
      UI.store.set("topics", data);
    }

    var first = readSelection();
    var selection = first.sel;
    var result = null;
    var draft = null;

    function label() {
      if (isAll(selection)) return "All topics";
      var names = [];
      UNITS[selection.mode].forEach(function (u) {
        u.items.forEach(function (i) { if (selection.ids.has(i.id)) names.push(i.title); });
      });
      return names.length <= 2 ? names.join(", ") : names.length + " topics";
    }

    function update() {
      result = resolve(selection);
      if (opts.summary) {
        opts.summary.textContent = label() + " · " + countText(result.pool.length) +
          (result.examUsed ? " (Unit Exam Terms)" : "");
      }
    }

    // ---------- Dialog ----------
    var dialog = el("dialog", "tp-dialog");
    dialog.setAttribute("aria-labelledby", "tp-title-" + n);
    dialog.innerHTML =
      '<div class="tp-head">' +
        '<h2 id="tp-title-' + n + '">Choose topics</h2>' +
        '<p class="tp-course" hidden>Course: <strong class="tp-course-name"></strong> · ' +
          '<button class="tp-link" type="button" data-act="course">change</button></p>' +
        '<p class="hint tp-intro"></p>' +
        '<div class="row tp-modes" role="group" aria-label="Unit system">' +
          '<button class="btn ghost tp-mode" type="button" data-mode="ced" aria-pressed="false">CED units</button>' +
          '<button class="btn ghost tp-mode" type="button" data-mode="mine" aria-pressed="true">Class units</button>' +
        '</div>' +
        '<div class="row">' +
          '<button class="btn ghost" type="button" data-act="all">Select all</button>' +
          '<button class="btn ghost" type="button" data-act="none">Clear all</button>' +
        '</div>' +
        '<label class="tp-check tp-exam" hidden><input type="checkbox" data-act="exam">' +
          '<span class="tp-label">Unit Exam Terms Only</span></label>' +
      '</div>' +
      '<div class="tp-body"></div>' +
      '<div class="tp-foot">' +
        '<p class="tp-count" aria-live="polite"></p>' +
        '<div class="row">' +
          '<button class="btn ghost" type="button" data-act="cancel">Cancel</button>' +
          '<button class="btn" type="button" data-act="done">Done</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    var tree = dialog.querySelector(".tp-body");
    var doneBtn = dialog.querySelector('[data-act="done"]');
    var countEl = dialog.querySelector(".tp-count");
    var examBox = dialog.querySelector('[data-act="exam"]');

    // The parts that depend on the course
    function renderHead() {
      var menu = UI && UI.course && UI.course.offered().length > 1;
      dialog.querySelector(".tp-course").hidden = !menu;
      if (menu) {
        var c = TOPICS.getCourse(course);
        dialog.querySelector(".tp-course-name").textContent = c ? c.name : course;
      }
      dialog.querySelector(".tp-modes").hidden = !hasCed();
      dialog.querySelector(".tp-exam").hidden = !examAvailable;
      var anyEmpty = ["ced", "mine"].some(function (m) {
        return UNITS[m].some(function (u) { return u.items.some(function (i) { return !i.count; }); });
      });
      dialog.querySelector(".tp-intro").textContent = (opts.intro ? opts.intro + " " : "") +
        (hasCed() ? "Switch between the CED's units and our class units. " : "") +
        (anyEmpty ? "Topics marked 0 have nothing yet." : "");
    }

    function checkRow(key, title, count, extraCls) {
      var lab = el("label", "tp-check" + (extraCls ? " " + extraCls : ""));
      var input = el("input");
      input.type = "checkbox";
      input.setAttribute("data-key", key);
      var c = el("span", "tp-num", String(count));
      c.setAttribute("aria-label", countText(count));
      lab.appendChild(input);
      lab.appendChild(el("span", "tp-label", title));
      lab.appendChild(c);
      if (!count) { input.disabled = true; lab.classList.add("tp-empty"); }
      return { label: lab, input: input };
    }

    function refocus(key) {
      var again = tree.querySelector('input[data-key="' + key + '"]');
      if (again) again.focus({ preventScroll: true });
    }

    function renderTree() {
      tree.innerHTML = "";
      Array.prototype.forEach.call(dialog.querySelectorAll(".tp-mode"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-mode") === draft.mode ? "true" : "false");
      });
      examBox.checked = draft.exam;
      UNITS[draft.mode].forEach(function (u, ui) {
        var box = el("div", "tp-unit");
        var usable = u.items.filter(function (i) { return i.count > 0; });
        var head = checkRow("unit-" + ui, u.title + ": " + u.name, u.count, "tp-unit-check");
        var chosen = usable.filter(function (i) { return draft.ids.has(i.id); }).length;
        head.input.checked = usable.length > 0 && chosen === usable.length;
        head.input.indeterminate = chosen > 0 && chosen < usable.length;
        head.input.setAttribute("aria-label", "Select all topics in " + u.title + ": " + u.name);
        head.input.addEventListener("change", function () {
          usable.forEach(function (i) { if (head.input.checked) draft.ids.add(i.id); else draft.ids.delete(i.id); });
          renderTree(); refocus("unit-" + ui);
        });
        box.appendChild(head.label);
        var ul = el("ul", "tp-topics");
        u.items.forEach(function (i) {
          var row = checkRow("item-" + i.id, i.title, i.count);
          row.input.checked = draft.ids.has(i.id);
          row.input.addEventListener("change", function () {
            if (row.input.checked) draft.ids.add(i.id); else draft.ids.delete(i.id);
            renderTree(); refocus("item-" + i.id);
          });
          var li = el("li");
          li.appendChild(row.label);
          ul.appendChild(li);
        });
        box.appendChild(ul);
        tree.appendChild(box);
      });
      var r = resolve(draft);
      if (draft.ids.size === 0) countEl.textContent = "Pick at least one topic.";
      else if (r.examUsed) countEl.textContent = r.pool.length + " of " + countText(r.base.length) + " selected (Unit Exam Terms)";
      else if (r.examEmpty) countEl.textContent = countText(r.base.length) + " selected. These topics have no Unit Exam Terms marked, so all of them are used.";
      else countEl.textContent = countText(r.base.length) + " selected";
      doneBtn.disabled = r.base.length === 0;
    }

    var keepFocus = false;  // closing to focus the course menu instead of the open button
    function open() {
      draft = { mode: selection.mode, ids: new Set(selection.ids), exam: selection.exam };
      renderHead();
      renderTree();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      tree.scrollTop = 0;
    }
    function close() {
      if (typeof dialog.close === "function") dialog.close();
      else { dialog.removeAttribute("open"); afterClose(); }
    }
    function afterClose() {
      if (keepFocus) {
        // After the dialog has put focus back where it was
        keepFocus = false;
        setTimeout(function () { if (!UI.course.focusMenu() && opts.openButton) opts.openButton.focus(); }, 0);
        return;
      }
      if (opts.openButton) opts.openButton.focus();
    }

    dialog.addEventListener("close", afterClose);
    examBox.addEventListener("change", function () { draft.exam = examBox.checked; renderTree(); });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) { close(); return; }   // clicking the dimmed area cancels
      var b = e.target.closest("button");
      if (!b) return;
      var mode = b.getAttribute("data-mode");
      var act = b.getAttribute("data-act");
      if (mode && mode !== draft.mode) {
        // Switching unit systems starts from everything selected in the new system
        draft = { mode: mode, ids: new Set(enabledIds(mode)), exam: draft.exam };
        renderTree();
      } else if (act === "all") { draft.ids = new Set(enabledIds(draft.mode)); renderTree(); }
      else if (act === "none") { draft.ids = new Set(); renderTree(); }
      else if (act === "cancel") close();
      else if (act === "course") { keepFocus = true; close(); }
      else if (act === "done") {
        selection = draft;
        writeSelection();
        saveSelection();
        update();
        close();
        if (opts.onChange) opts.onChange(result.pool);
      }
    });
    if (opts.openButton) opts.openButton.addEventListener("click", open);

    // A new course: its units and items; keep the topics it has (or every topic)
    if (UI && UI.course) {
      UI.course.onChange(function (id) {
        // "All topics" stays all topics; otherwise keep the topics the new course has
        var wasAll = { sel: isAll(selection), draft: draft && isAll(draft) };
        course = id;
        setup();
        var adjust = function (sel, all) {
          return (!all && keep(sel.mode, Array.from(sel.ids), sel.exam)) || allSel(sel.exam);
        };
        selection = adjust(selection, wasAll.sel);
        writeSelection();
        update();
        if (dialog.open) { draft = adjust(draft, wasAll.draft); renderHead(); renderTree(); }
        if (opts.onChange) opts.onChange(result.pool);
      });
    }

    if (first.restored) writeSelection();
    update();
    return {
      pool: function () { return result.pool; },
      label: label,
      codes: function () { return codesFor(selection); },
      unitExam: function () { return result.examUsed; },
      open: open
    };
  }

  return { create: create };
})();
