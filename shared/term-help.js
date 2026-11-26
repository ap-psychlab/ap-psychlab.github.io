/* "Terms used in this question" definitions for answered questions: window.APPSYCH_TERM_HELP
 * Needs ../../shared/data/topics.js and terms.js loaded first (terms are looked up with
 * APPSYCH_TOPICS.getTerm, so retired terms are left out).
 *
 * APPSYCH_TERM_HELP.mount(container, q, shown)
 *   q:     the question
 *   shown: the choices on screen, in display order: [{ letter: "A", orig: 2 }, ...]
 *          (or { label: "Answer", orig } to use your own label)
 *          (pass null or [] before the answer is revealed: the list stays hidden, because
 *          naming each choice's term could give the answer away)
 *   Lists the question's own term and the term behind each shown choice (q.choiceRefs) as
 *   "Term (Question Stem, Choice A)", each a <details> that opens to the definition (and
 *   examples, if any). "Question Stem" (the scenario, any graph, and the question) is added
 *   for the question's own term when no shown choice holds it, and for any listed term whose
 *   name or alias appears in the stem text.
 *   Items that are open stay open when the same question is re-rendered.
 */
window.APPSYCH_TERM_HELP = (function () {
  "use strict";
  function lookup(id) {
    var T = window.APPSYCH_TOPICS;
    return T ? T.getTerm(id) : null;
  }
  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // [stem, "B", "D"] -> "Question Stem, Choices B, D"; custom labels are kept as given
  function labelText(list, stem) {
    var letters = list.filter(function (l) { return l.letter; }).map(function (l) { return l.letter; });
    var parts = list.filter(function (l) { return !l.letter; });
    if (letters.length) parts.unshift((letters.length > 1 ? "Choices " : "Choice ") + letters.join(", "));
    if (stem) parts.unshift("Question Stem");
    return parts.join(", ");
  }

  // Does the stem name this term (its name or an alias, with or without a plural s)?
  function named(t, text) {
    var names = [t.term].concat(t.aliases || []);
    return names.some(function (n) {
      var bare = n.replace(/\s*\(.*?\)\s*/g, " ").trim().replace(/(es|s)$/i, "");
      if (bare.length < 3) return false;
      var re = new RegExp("\\b" + bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(s|es)?\\b", "i");
      return re.test(text);
    });
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
    container.appendChild(make("p", "th-title", "Terms used in this question:"));
    var ul = make("ul", "th-list");
    order.forEach(function (id) {
      var t = lookup(id);
      var li = make("li");
      var d = make("details", "th-item");
      d.setAttribute("data-term", id);
      if (wasOpen[id]) d.open = true;
      var s = make("summary");
      var inStem = (id === q.term && !labels[id].length) || named(t, q.stem || "");
      s.appendChild(make("strong", "th-term", t.term));
      s.appendChild(document.createTextNode(" "));
      s.appendChild(make("span", "th-where", "(" + labelText(labels[id], inStem) + ")"));
      d.appendChild(s);
      d.appendChild(make("p", "th-def", t.definition));
      (t.examples || []).forEach(function (text) {
        if (!text) return;
        var ex = make("p", "th-ex");
        ex.appendChild(make("strong", null, "Example: "));
        ex.appendChild(document.createTextNode(text));
        d.appendChild(ex);
      });
      li.appendChild(d);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  return { mount: mount };
})();
