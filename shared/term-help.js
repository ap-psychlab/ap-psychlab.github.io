/* "What's this?" term definitions for answered questions: window.APPSYCH_TERM_HELP
 * Needs ../../shared/data/terms.js (window.APPSYCH_TERMS) loaded first.
 *
 * APPSYCH_TERM_HELP.mount(container, q, shown)
 *   q:     the question
 *   shown: the choices on screen, in display order: [{ letter: "A", orig: 2 }, ...]
 *          (or { label: "Answer", orig } to use your own label)
 *          (pass null or [] before the answer is revealed: the list stays hidden, because
 *          naming each choice's term could give the answer away)
 *   Lists the question's topic and the term behind each shown choice (q.choiceRefs),
 *   each as a <details> that opens to the term's definition (and example, if any).
 *   Items that are open stay open when the same question is re-rendered.
 */
window.APPSYCH_TERM_HELP = (function () {
  "use strict";
  var byId = null;
  function lookup(id) {
    if (!byId) {
      byId = {};
      (window.APPSYCH_TERMS || []).forEach(function (t) { byId[t.id] = t; });
    }
    return byId[id] || null;
  }
  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ["B", "D"] -> "Choices B, D"; custom labels are kept as given
  function labelText(list) {
    var letters = list.filter(function (l) { return l.letter; }).map(function (l) { return l.letter; });
    var custom = list.filter(function (l) { return !l.letter; });
    var parts = custom.slice();
    if (letters.length) parts.unshift((letters.length > 1 ? "Choices " : "Choice ") + letters.join(", "));
    return parts.join(", ");
  }

  function mount(container, q, shown) {
    if (!container) return;
    var key = q ? q.id : "";
    var wasOpen = {};
    if (container.__thKey === key) {
      container.querySelectorAll("details[open]").forEach(function (d) { wasOpen[d.getAttribute("data-term")] = true; });
    }
    container.__thKey = key;
    container.textContent = "";
    if (!q || !shown || !shown.length) { container.hidden = true; return; }

    // Group letters by term, in display order; the question's own topic comes first
    var order = [], labels = {};
    function add(id, label) {
      if (!id || !lookup(id)) return;
      if (!labels[id]) { labels[id] = []; order.push(id); }
      if (label) labels[id].push(label);
    }
    add(q.term, null);
    var refs = q.choiceRefs || [];
    shown.forEach(function (s) { add(refs[s.orig], s.label || { letter: s.letter }); });
    if (!order.length) { container.hidden = true; return; }

    container.hidden = false;
    container.appendChild(make("p", "th-title", "What's this? Terms in this question"));
    var ul = make("ul", "th-list");
    order.forEach(function (id) {
      var t = lookup(id);
      var li = make("li");
      var d = make("details", "th-item");
      d.setAttribute("data-term", id);
      if (wasOpen[id]) d.open = true;
      var s = make("summary");
      var tag = labelText(labels[id]) || "Question topic";
      if (id === q.term && labels[id].length) tag = "Topic · " + tag;
      s.appendChild(make("span", "th-tag", tag));
      s.appendChild(make("span", "th-term", t.term));
      d.appendChild(s);
      d.appendChild(make("p", "th-def", t.definition));
      if (t.example) {
        var ex = make("p", "th-ex");
        ex.appendChild(make("strong", null, "Example: "));
        ex.appendChild(document.createTextNode(t.example));
        d.appendChild(ex);
      }
      li.appendChild(d);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  return { mount: mount };
})();
