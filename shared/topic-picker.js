/* Shared "Choose topics" dialog: window.APPSYCH_TOPIC_PICKER
 *
 * Lets players check topics from either the CED's units or our class units (with
 * select-all per unit) and filters any bank whose items have a `ced` list.
 *
 * Load after shared/data/topics.js:
 *   <link rel="stylesheet" href="../../shared/topic-picker.css">
 *   <script src="../../shared/topic-picker.js" defer></script>
 *
 * Usage:
 *   var picker = APPSYCH_TOPIC_PICKER.create({
 *     items: bank,                    // terms, questions, ... (anything with ced: [...])
 *     noun: ["term", "terms"],       // used in counts: "1 term", "12 terms"
 *     openButton: buttonElement,     // opens the dialog
 *     summary: spanElement,          // optional: shows "All topics · 824 terms"
 *     intro: "Terms are drawn from the topics you check.",
 *     onChange: function (pool) {}   // called after the player presses Done
 *   });
 *   picker.pool()    // items in the selected topics
 *   picker.label()   // "All topics", "Memory, Thinking", or "5 topics"
 *   picker.codes()   // the content codes of the checked topics, e.g. ["0.1", "2.3"]
 *
 * URL: reads ?groups=<group ids> (class units) or ?ced=<CED topic codes>, and writes
 * the selection back on Done so a teacher can copy a link. Topics with no items show
 * a count of 0 and can't be checked.
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

  function create(opts) {
    var TOPICS = window.APPSYCH_TOPICS;
    var items = opts.items || [];
    var one = (opts.noun && opts.noun[0]) || "item";
    var many = (opts.noun && opts.noun[1]) || "items";
    var countText = function (n) { return n + " " + (n === 1 ? one : many); };
    var matching = function (codes) {
      return items.filter(function (t) { return TOPICS.matchesCodes(t, codes); });
    };
    var n = ++uid;

    // Both unit systems in one shape, with item counts worked out once:
    // [{ title, name, count, items: [{ id, title, codes, count }] }]
    function build(mode) {
      var src = mode === "ced"
        ? TOPICS.cedUnits.map(function (u) {
            return { title: "Unit " + u.number, name: u.name,
              items: u.topics.map(function (t) { return { id: t.code, title: t.code + " " + t.name, codes: [t.code] }; }) };
          })
        : TOPICS.teachingUnits.map(function (u) {
            return { title: "Unit " + u.number, name: u.name,
              items: u.groups.map(function (g) { return { id: g.id, title: g.name, codes: g.codes }; }) };
          });
      src.forEach(function (u) {
        var codes = [];
        u.items.forEach(function (i) { i.count = matching(i.codes).length; codes = codes.concat(i.codes); });
        u.count = matching(codes).length;
      });
      return src;
    }
    var UNITS = { ced: build("ced"), mine: build("mine") };

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
    function isAll(sel) { return sel.ids.size === enabledIds(sel.mode).length; }

    function readSelection() {
      function keep(mode, ids) {
        var ok = enabledIds(mode);
        var kept = ids.filter(function (id) { return ok.indexOf(id) !== -1; });
        return kept.length ? { mode: mode, ids: new Set(kept) } : null;
      }
      var sel = null;
      var groups = TOPICS.groupsFromUrl();
      if (groups.length) sel = keep("mine", groups);
      if (!sel) {
        var m = /[?&]ced=([^&#]*)/.exec(location.search);
        if (m) sel = keep("ced", decodeURIComponent(m[1]).split(",").map(function (s) { return s.trim(); }));
      }
      return sel || { mode: "mine", ids: new Set(enabledIds("mine")) };
    }

    // Keep the address in sync so a teacher can copy a link to a topic set
    function writeSelection() {
      var params = location.search.replace(/^\?/, "").split("&")
        .filter(function (p) { return p && !/^(groups|ced)=/.test(p); });
      if (!isAll(selection)) {
        params.push((selection.mode === "mine" ? "groups=" : "ced=") + Array.from(selection.ids).join(","));
      }
      try {
        history.replaceState(null, "", location.pathname + (params.length ? "?" + params.join("&") : "") + location.hash);
      } catch (err) { /* some browsers block this on file:// pages */ }
    }

    var selection = readSelection();
    var pool = [];
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
      pool = matching(codesFor(selection));
      if (opts.summary) opts.summary.textContent = label() + " · " + countText(pool.length);
    }

    // ---------- Dialog ----------
    var dialog = el("dialog", "tp-dialog");
    dialog.setAttribute("aria-labelledby", "tp-title-" + n);
    dialog.innerHTML =
      '<div class="tp-head">' +
        '<h2 id="tp-title-' + n + '">Choose topics</h2>' +
        '<p class="hint tp-intro"></p>' +
        '<div class="row" role="group" aria-label="Unit system">' +
          '<button class="btn ghost tp-mode" type="button" data-mode="ced" aria-pressed="false">CED units</button>' +
          '<button class="btn ghost tp-mode" type="button" data-mode="mine" aria-pressed="true">Class units</button>' +
        '</div>' +
        '<div class="row">' +
          '<button class="btn ghost" type="button" data-act="all">Select all</button>' +
          '<button class="btn ghost" type="button" data-act="none">Clear all</button>' +
        '</div>' +
      '</div>' +
      '<div class="tp-body"></div>' +
      '<div class="tp-foot">' +
        '<p class="tp-count" aria-live="polite"></p>' +
        '<div class="row">' +
          '<button class="btn ghost" type="button" data-act="cancel">Cancel</button>' +
          '<button class="btn" type="button" data-act="done">Done</button>' +
        '</div>' +
      '</div>';
    var anyEmpty = ["ced", "mine"].some(function (m) {
      return UNITS[m].some(function (u) { return u.items.some(function (i) { return !i.count; }); });
    });
    dialog.querySelector(".tp-intro").textContent = (opts.intro ? opts.intro + " " : "") +
      "Switch between the CED's units and our class units." + (anyEmpty ? " Topics marked 0 have nothing yet." : "");
    document.body.appendChild(dialog);
    var tree = dialog.querySelector(".tp-body");
    var doneBtn = dialog.querySelector('[data-act="done"]');
    var countEl = dialog.querySelector(".tp-count");

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
        var list = el("ul", "tp-topics");
        u.items.forEach(function (i) {
          var row = checkRow("item-" + i.id, i.title, i.count);
          row.input.checked = draft.ids.has(i.id);
          row.input.addEventListener("change", function () {
            if (row.input.checked) draft.ids.add(i.id); else draft.ids.delete(i.id);
            renderTree(); refocus("item-" + i.id);
          });
          var li = el("li");
          li.appendChild(row.label);
          list.appendChild(li);
        });
        box.appendChild(list);
        tree.appendChild(box);
      });
      var total = matching(codesFor(draft)).length;
      countEl.textContent = draft.ids.size === 0 ? "Pick at least one topic." : countText(total) + " selected";
      doneBtn.disabled = total === 0;
    }

    function open() {
      draft = { mode: selection.mode, ids: new Set(selection.ids) };
      renderTree();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      tree.scrollTop = 0;
    }
    function close() {
      if (typeof dialog.close === "function") dialog.close();
      else { dialog.removeAttribute("open"); afterClose(); }
    }
    function afterClose() { if (opts.openButton) opts.openButton.focus(); }

    dialog.addEventListener("close", afterClose);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) { close(); return; }   // clicking the dimmed area cancels
      var b = e.target.closest("button");
      if (!b) return;
      var mode = b.getAttribute("data-mode");
      var act = b.getAttribute("data-act");
      if (mode && mode !== draft.mode) {
        // Switching unit systems starts from everything selected in the new system
        draft = { mode: mode, ids: new Set(enabledIds(mode)) };
        renderTree();
      } else if (act === "all") { draft.ids = new Set(enabledIds(draft.mode)); renderTree(); }
      else if (act === "none") { draft.ids = new Set(); renderTree(); }
      else if (act === "cancel") close();
      else if (act === "done") {
        selection = draft;
        writeSelection();
        update();
        close();
        if (opts.onChange) opts.onChange(pool);
      }
    });
    if (opts.openButton) opts.openButton.addEventListener("click", open);

    update();
    return {
      pool: function () { return pool; },
      label: label,
      codes: function () { return codesFor(selection); },
      open: open
    };
  }

  return { create: create };
})();
