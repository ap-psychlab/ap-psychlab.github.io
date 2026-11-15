// Practice Questions — quiz and endless practice from the shared question bank
// Questions: ../../shared/data/questions.js; topic groups: ../../shared/data/topics.js;
// topic dialog: ../../shared/topic-picker.js.
// URL options: ?groups=research-methods,ethics (class topic groups) or ?ced=2.3,2.4 (CED topics).
//
// Timing rule: a question's time is all the time it was on screen (across visits, not
// counting time while the page is hidden or a dialog is open) up to the student's last
// answer change. In endless mode the first pick is final, so the clock stops there.
(function () {
  "use strict";

  const BANK = window.APPSYCH_QUESTIONS || [];
  const TOPICS = window.APPSYCH_TOPICS;
  const PICKER = window.APPSYCH_TOPIC_PICKER;
  const MAX_QUIZ = 75;
  const LETTERS = ["A", "B", "C", "D"];
  const MODE_HINTS = {
    quiz: "Answers are scored when you submit. You can skip questions, jump around with the question list, and change answers until then.",
    endless: "See feedback after every question, with hints if you want them. Keep going until you press Finish or run out of questions."
  };

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function fmtTime(ms) {
    if (ms == null) return "–";
    const s = ms / 1000;
    if (s < 10) return s.toFixed(1) + " s";
    if (s < 59.5) return Math.round(s) + " s";
    const r = Math.round(s);
    return Math.floor(r / 60) + ":" + String(r % 60).padStart(2, "0");
  }
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  function say(msg) {
    const live = $("live");
    live.textContent = "";
    setTimeout(() => { live.textContent = msg; }, 30);
  }
  function showDlg(d) {
    if (typeof d.showModal === "function") d.showModal();
    else d.setAttribute("open", "");
  }
  function closeDlg(d) {
    if (typeof d.close === "function") d.close();
    else { d.removeAttribute("open"); d.dispatchEvent(new Event("close")); }
  }
  const anyDialogOpen = () => !!document.querySelector("dialog[open]");
  const isRight = (it) => it.pick != null && it.pick === it.q.answer;
  const resultOf = (it) => (it.pick == null ? "skip" : isRight(it) ? "correct" : "wrong");
  const RESULT_TEXT = { correct: "Correct", wrong: "Incorrect", skip: "Unanswered" };
  const RESULT_ICON = { correct: "✓", wrong: "✗", skip: "–" };

  if (!BANK.length || !TOPICS || !PICKER) {
    const note = $("setupNote");
    note.textContent = "The question bank didn't load. Check that shared/data/questions.js, topics.js, and shared/topic-picker.js exist.";
    note.classList.add("warn");
    $("startBtn").disabled = true;
    $("topicsBtn").disabled = true;
    return;
  }

  // ---------- Setup ----------
  const picker = PICKER.create({
    items: BANK,
    noun: ["question", "questions"],
    openButton: $("topicsBtn"),
    summary: $("topicSummary"),
    intro: "Questions are drawn from the topics you check.",
    onChange: updateSetup
  });
  const countInput = $("countInput");
  const countRadios = Array.from(document.querySelectorAll('input[name="count"]'));
  const chosenMode = () => document.querySelector('input[name="mode"]:checked').value;

  // Returns the requested quiz length, or null if the typed number isn't valid
  function chosenCount() {
    if (countInput.validity.badInput) return null;
    const raw = countInput.value.trim();
    if (raw !== "") {
      const n = Number(raw);
      return Number.isInteger(n) && n >= 1 && n <= MAX_QUIZ ? n : null;
    }
    const r = countRadios.find((x) => x.checked);
    return r ? Number(r.value) : 10;
  }

  function updateSetup() {
    const mode = chosenMode();
    const pool = picker.pool().length;
    const note = $("setupNote");
    let text, ok = pool > 0, warn = false;
    $("modeHint").textContent = MODE_HINTS[mode];
    $("countField").hidden = mode !== "quiz";
    if (!pool) { text = "There are no questions in these topics yet. Choose other topics."; warn = true; }
    else if (mode === "quiz") {
      const n = chosenCount();
      if (n == null) { text = "Type a whole number from 1 to 75."; ok = false; warn = true; }
      else if (n > pool) text = "These topics have only " + plural(pool, "question", "questions") + ", so the quiz will use all of them.";
      else text = plural(n, "question", "questions") + " will be drawn at random from the " + pool + " in these topics.";
    } else {
      text = "Questions are drawn at random from the " + pool + " in these topics, with no repeats.";
    }
    note.textContent = text;
    note.classList.toggle("warn", warn);
    $("startBtn").disabled = !ok;
  }

  document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", updateSetup));
  countRadios.forEach((r) => r.addEventListener("change", () => { countInput.value = ""; updateSetup(); }));
  countInput.addEventListener("input", () => {
    if (countInput.value !== "" || countInput.validity.badInput) countRadios.forEach((r) => { r.checked = false; });
    else if (!countRadios.some((r) => r.checked)) countRadios[0].checked = true;
    updateSetup();
  });
  countInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !$("startBtn").disabled) $("startBtn").click(); });

  $("startBtn").addEventListener("click", () => {
    const mode = chosenMode();
    const pool = shuffle(picker.pool());
    if (!pool.length) return;
    if (mode === "quiz") {
      const n = chosenCount();
      if (n == null) return;
      startSession("quiz", pool.slice(0, Math.min(n, pool.length)));
    } else {
      startSession("endless", pool);
    }
  });

  // ---------- Session ----------
  // S = { mode, phase: "play" | "review" | "results", index, items, queue }
  // item = { q, order, pick, viewMs, timeMs, hintUsed, seen }
  //   order: original choice indexes in display order; pick: original index of the answer
  //   seen: choices whose feedback is open (endless mode, after answering)
  let S = null;

  function makeItem(q) {
    const order = [0, 1, 2, 3];
    return { q: q, order: q.shuffle === false ? order : shuffle(order), pick: null,
      viewMs: 0, timeMs: null, hintUsed: false, seen: new Set() };
  }

  function startSession(mode, questions) {
    stopClock();
    S = { mode: mode, phase: "play", index: 0, items: [], queue: [] };
    if (mode === "quiz") S.items = questions.map(makeItem);
    else { S.queue = questions.slice(); S.items.push(makeItem(S.queue.shift())); }
    show("play");
    renderPlay(true);
    startClock();
  }

  function show(name) {
    $("setup").hidden = name !== "setup";
    $("play").hidden = name !== "play";
    $("results").hidden = name !== "results";
  }

  // ---------- Clock ----------
  let shownAt = null;
  function clockShouldRun() {
    if (!S || S.phase !== "play" || document.hidden || anyDialogOpen()) return false;
    const it = S.items[S.index];
    return !(S.mode === "endless" && it.pick != null);
  }
  function stopClock() {
    if (shownAt != null && S) S.items[S.index].viewMs += performance.now() - shownAt;
    shownAt = null;
  }
  function startClock() {
    if (shownAt == null && clockShouldRun()) shownAt = performance.now();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopClock(); else startClock(); });
  window.addEventListener("pagehide", stopClock);

  // ---------- Question view (play and review) ----------
  function renderPlay(fresh) {
    const it = S.items[S.index], q = it.q;
    const review = S.phase === "review";
    const quiz = S.mode === "quiz";
    const answered = it.pick != null;
    const reveal = review || (!quiz && answered);
    const last = S.index === S.items.length - 1;

    $("qNum").textContent = quiz || review
      ? "Question " + (S.index + 1) + " of " + S.items.length
      : "Question " + (S.index + 1);
    let status = "";
    if (review) status = RESULT_ICON[resultOf(it)] + " " + RESULT_TEXT[resultOf(it)] + " · Time: " + fmtTime(it.timeMs);
    else if (!quiz && answered) status = "Time: " + fmtTime(it.timeMs);
    $("qStatus").textContent = status;
    $("stem").textContent = q.stem;

    // Choices
    const list = $("choices");
    list.innerHTML = "";
    it.order.forEach((orig, pos) => {
      const li = el("li");
      const isAns = orig === q.answer, isPick = orig === it.pick;
      const c = el(review ? "div" : "button", "choice");
      if (!review) { c.type = "button"; c.setAttribute("data-orig", orig); }
      const letter = el("span", "letter", LETTERS[pos]);
      letter.setAttribute("aria-hidden", "true");
      c.appendChild(letter);
      const body = el("span", "cbody");
      body.appendChild(el("span", "sr-only", "Choice " + LETTERS[pos] + ": "));
      body.appendChild(el("span", "ctext", q.choices[orig]));
      if (reveal && (isAns || isPick)) {
        const tag = el("span", "tag");
        const icon = el("span", "icon", isAns ? "✓" : "✗");
        icon.setAttribute("aria-hidden", "true");
        tag.appendChild(icon);
        tag.appendChild(document.createTextNode(isAns ? (isPick ? "Your answer: correct" : "Correct answer") : "Your answer: incorrect"));
        body.appendChild(tag);
        c.classList.add(isAns ? "is-answer" : "is-wrong");
      }
      c.appendChild(body);
      if (quiz && !review) c.setAttribute("aria-pressed", isPick ? "true" : "false");
      li.appendChild(c);

      const open = review || (!quiz && answered && it.seen.has(orig));
      if (!quiz && answered && !review) c.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        const fb = el("p", "fb " + (isAns ? "good" : "bad"), q.feedback[orig]);
        fb.id = "fb-" + pos;
        if (!review) c.setAttribute("aria-controls", fb.id);
        li.appendChild(fb);
      }
      list.appendChild(li);
    });

    // Hint (endless only) and explanation
    const hintBox = $("hintBox");
    hintBox.hidden = !(!quiz && !review && it.hintUsed);
    hintBox.textContent = "Hint: " + q.hint;
    const ex = $("explain");
    ex.hidden = !reveal;
    ex.innerHTML = "";
    if (reveal) {
      if (review && !answered) ex.appendChild(el("p", null, "This question was not answered, so it counts as wrong."));
      const p = el("p");
      p.appendChild(el("strong", null, "Explanation: "));
      p.appendChild(document.createTextNode(q.explanation));
      ex.appendChild(p);
    }

    // Buttons for this phase
    $("listBtn").hidden = !(quiz || review);
    $("submitBtn").hidden = !(quiz && !review);
    $("finishBtn").hidden = !(!quiz && !review);
    $("backBtn").hidden = !review;
    const prev = $("prevBtn"), next = $("nextBtn"), hint = $("hintBtn");
    prev.hidden = !(quiz || review);
    prev.disabled = S.index === 0;
    hint.hidden = quiz || review;
    hint.disabled = answered || it.hintUsed;
    hint.setAttribute("aria-expanded", it.hintUsed ? "true" : "false");
    hint.textContent = it.hintUsed ? "Hint shown" : "Show hint";
    if (review) { next.textContent = "Next"; next.disabled = last; }
    else if (quiz) { next.textContent = last ? "Submit quiz" : "Next"; next.disabled = false; }
    else {
      next.textContent = answered && !S.queue.length ? "See results" : "Next question";
      next.disabled = !answered;
    }
    let tip = "";
    if (!quiz && !review && !answered) tip = "Pick an answer to continue.";
    else if (!quiz && !review) tip = "Select the other choices to read their feedback.";
    else if (quiz && !review) tip = "You can skip questions and change answers until you submit.";
    $("playHint").textContent = tip;

    renderPlayStats();

    if (fresh) {
      const card = document.querySelector(".qcard");
      if (card.getBoundingClientRect().top < 0) $("play").scrollIntoView({ block: "start" });
      $("qNum").focus({ preventScroll: true });
    }
  }

  function renderStats(container, tiles) {
    container.innerHTML = "";
    tiles.forEach((t) => {
      const d = el("div", "stat");
      d.appendChild(el("span", null, t[0]));
      d.appendChild(el("strong", null, t[1]));
      container.appendChild(d);
    });
  }

  function summary(items) {
    const answered = items.filter((it) => it.pick != null);
    const correct = items.filter(isRight).length;
    const times = answered.map((it) => it.timeMs).filter((t) => t != null);
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
    return { total: items.length, answered: answered.length, correct: correct, avg: avg };
  }

  function renderPlayStats() {
    const box = $("playStats");
    if (S.phase === "review") {
      const s = summary(S.items);
      renderStats(box, [["Score", s.correct + " / " + s.total], ["Avg time", fmtTime(s.avg)]]);
    } else if (S.mode === "quiz") {
      const s = summary(S.items);
      renderStats(box, [["Question", (S.index + 1) + " / " + s.total], ["Answered", s.answered + " / " + s.total]]);
    } else {
      const s = summary(S.items.filter((it) => it.pick != null));
      renderStats(box, [
        ["Answered", String(s.total)],
        ["Correct", String(s.correct)],
        ["Accuracy", s.total ? Math.round(100 * s.correct / s.total) + "%" : "–"],
        ["Avg time", fmtTime(s.avg)]
      ]);
    }
  }

  function go(i) {
    if (i < 0 || i >= S.items.length) return;
    stopClock();
    S.index = i;
    renderPlay(true);
    startClock();
  }

  function choose(orig) {
    const it = S.items[S.index];
    if (S.phase !== "play") return;
    if (S.mode === "quiz") {
      if (it.pick === orig) return;
      stopClock();
      it.pick = orig;
      it.timeMs = it.viewMs;   // time up to the latest answer change
      startClock();
      renderPlay(false);
    } else if (it.pick == null) {
      stopClock();               // first pick is final in endless mode
      it.pick = orig;
      it.timeMs = it.viewMs;
      it.seen.add(orig);
      renderPlay(false);
      say(isRight(it) ? "Correct. " + it.q.feedback[orig]
        : "Incorrect. The correct answer is " + LETTERS[it.order.indexOf(it.q.answer)] + ". " + it.q.feedback[orig]);
    } else {
      // After answering, choices open and close their feedback
      if (it.seen.has(orig) && orig !== it.pick) it.seen.delete(orig); else it.seen.add(orig);
      renderPlay(false);
      if (it.seen.has(orig)) say(it.q.feedback[orig]);
    }
    const again = $("choices").querySelector('[data-orig="' + orig + '"]');
    if (again) again.focus({ preventScroll: true });
  }

  $("choices").addEventListener("click", (e) => {
    const b = e.target.closest("button.choice");
    if (b) choose(Number(b.getAttribute("data-orig")));
  });

  $("prevBtn").addEventListener("click", () => go(S.index - 1));
  $("nextBtn").addEventListener("click", () => {
    if (S.phase === "review") go(S.index + 1);
    else if (S.mode === "quiz") {
      if (S.index === S.items.length - 1) trySubmit(); else go(S.index + 1);
    } else nextEndless();
  });
  $("hintBtn").addEventListener("click", () => {
    const it = S.items[S.index];
    it.hintUsed = true;
    renderPlay(false);
    say("Hint: " + it.q.hint);
    $("nextBtn").disabled ? $("choices").querySelector("button.choice").focus() : $("nextBtn").focus();
  });

  function nextEndless() {
    const it = S.items[S.index];
    if (it.pick == null) return;
    if (!S.queue.length) { finish(); return; }
    stopClock();
    S.items.push(makeItem(S.queue.shift()));
    S.index = S.items.length - 1;
    renderPlay(true);
    startClock();
  }

  // ---------- Question list dialog ----------
  const listDialog = $("listDialog");
  function legendItem(cls, text, icon) {
    const li = el("li");
    const box = el("span", "qbox " + cls);
    box.setAttribute("aria-hidden", "true");
    if (icon) box.appendChild(el("span", "qi", icon));
    li.appendChild(box);
    li.appendChild(el("span", null, text));
    return li;
  }
  function openList() {
    stopClock();
    const review = S.phase === "review";
    const grid = $("qgrid");
    grid.innerHTML = "";
    S.items.forEach((it, i) => {
      const state = review ? resultOf(it) : it.pick == null ? "open" : "done";
      const words = { open: "unanswered", done: "answered", correct: "correct", wrong: "incorrect", skip: "unanswered" }[state];
      const li = el("li");
      const b = el("button", "qbox " + state);
      b.type = "button";
      b.appendChild(el("span", "qn", String(i + 1)));
      if (review) {
        const ic = el("span", "qi", RESULT_ICON[state]);
        ic.setAttribute("aria-hidden", "true");
        b.appendChild(ic);
      }
      b.setAttribute("aria-label", "Question " + (i + 1) + ", " + words + (i === S.index ? ", current" : ""));
      if (i === S.index) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => { closeDlg(listDialog); go(i); });
      li.appendChild(b);
      grid.appendChild(li);
    });
    const legend = $("listLegend");
    legend.innerHTML = "";
    const s = summary(S.items);
    if (review) {
      const wrong = S.items.filter((it) => resultOf(it) === "wrong").length;
      $("listCount").textContent = s.correct + " correct, " + wrong + " incorrect, " + (s.total - s.answered) + " unanswered. Select a number to review that question.";
      legend.appendChild(legendItem("correct", "Correct", "✓"));
      legend.appendChild(legendItem("wrong", "Incorrect", "✗"));
      legend.appendChild(legendItem("skip", "Unanswered", "–"));
    } else {
      $("listCount").textContent = s.answered + " of " + s.total + " answered. Select a number to go to that question.";
      legend.appendChild(legendItem("done", "Answered"));
      legend.appendChild(legendItem("open", "Unanswered"));
    }
    legend.appendChild(legendItem("open cur", "Current question"));
    showDlg(listDialog);
    const cur = grid.querySelector('[aria-current="true"]');
    if (cur) cur.focus();
  }
  $("listBtn").addEventListener("click", openList);
  $("listCloseBtn").addEventListener("click", () => closeDlg(listDialog));
  listDialog.addEventListener("click", (e) => { if (e.target === listDialog) closeDlg(listDialog); });
  listDialog.addEventListener("close", startClock);

  // ---------- Submitting ----------
  const submitDialog = $("submitDialog");
  function trySubmit() {
    const unanswered = S.items.filter((it) => it.pick == null).length;
    if (!unanswered) { finish(); return; }
    stopClock();
    $("subText").textContent = plural(unanswered, "question is", "questions are") + " unanswered out of " +
      S.items.length + ". Unanswered questions are counted as wrong.";
    showDlg(submitDialog);
    $("keepBtn").focus();
  }
  $("submitBtn").addEventListener("click", trySubmit);
  $("keepBtn").addEventListener("click", () => closeDlg(submitDialog));
  $("submitAnywayBtn").addEventListener("click", () => { closeDlg(submitDialog); finish(); });
  submitDialog.addEventListener("click", (e) => { if (e.target === submitDialog) closeDlg(submitDialog); });
  submitDialog.addEventListener("close", startClock);

  $("finishBtn").addEventListener("click", finish);

  // ---------- Results ----------
  function finish() {
    stopClock();
    if (S.mode === "endless") {
      const last = S.items[S.items.length - 1];
      if (last && last.pick == null) S.items.pop();   // the question on screen wasn't answered
      if (!S.items.length) { S = null; show("setup"); updateSetup(); $("startBtn").focus(); return; }
    }
    S.exhausted = S.mode === "endless" && !S.queue.length;
    S.phase = "results";
    renderResults();
    show("results");
    $("resH").focus({ preventScroll: true });
    window.scrollTo(0, $("results").offsetTop - 16);
  }

  function renderResults() {
    const s = summary(S.items);
    const tiles = [
      ["Score", s.correct + " / " + s.total],
      ["Accuracy", s.total ? Math.round(100 * s.correct / s.total) + "%" : "–"],
      ["Avg time", fmtTime(s.avg)]
    ];
    if (S.mode === "quiz" && s.answered < s.total) tiles.push(["Unanswered", String(s.total - s.answered)]);
    renderStats($("resStats"), tiles);

    const notes = [];
    if (S.mode === "quiz" && s.answered < s.total) notes.push("Unanswered questions count as wrong and aren't included in the average time.");
    if (S.exhausted) notes.push("You answered every question in the topics you chose.");
    $("resNote").textContent = notes.join(" ");

    const missed = S.items.filter((it) => !isRight(it)).length;
    $("retryBtn").hidden = missed === 0;
    $("retryBtn").textContent = "Retry missed (" + missed + ")";

    const list = $("resList");
    list.innerHTML = "";
    S.items.forEach((it, i) => {
      const r = resultOf(it);
      const li = el("li");
      const b = el("button", "res-row");
      b.type = "button";
      b.appendChild(el("span", "res-n", String(i + 1)));
      b.appendChild(el("span", "res-stem", it.q.stem.replace(/\n/g, " ")));
      const badge = el("span", "badge " + r);
      const icon = el("span", null, RESULT_ICON[r]);
      icon.setAttribute("aria-hidden", "true");
      badge.appendChild(icon);
      badge.appendChild(document.createTextNode(RESULT_TEXT[r]));
      b.appendChild(badge);
      const t = el("span", "res-time", fmtTime(it.timeMs));
      t.setAttribute("aria-label", it.timeMs == null ? "no time" : "time " + fmtTime(it.timeMs));
      b.appendChild(t);
      b.setAttribute("aria-label", "Question " + (i + 1) + ", " + RESULT_TEXT[r] + ", " +
        (it.timeMs == null ? "no time" : fmtTime(it.timeMs)) + ". Review.");
      b.addEventListener("click", () => startReview(i));
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function startReview(i) {
    S.phase = "review";
    S.index = i;
    show("play");
    renderPlay(true);
  }
  $("reviewBtn").addEventListener("click", () => startReview(0));
  $("backBtn").addEventListener("click", () => {
    S.phase = "results";
    show("results");
    $("resH").focus({ preventScroll: true });
  });
  $("retryBtn").addEventListener("click", () => {
    const missed = S.items.filter((it) => !isRight(it)).map((it) => it.q);
    startSession(S.mode, shuffle(missed));
  });
  $("newBtn").addEventListener("click", () => {
    S = null;
    show("setup");
    updateSetup();
    $("startBtn").focus();
  });

  // ---------- Keyboard shortcuts ----------
  // 1–4 or A–D pick a choice; Up/Down move between choices.
  document.addEventListener("keydown", (e) => {
    if (!S || (S.phase !== "play" && S.phase !== "review") || anyDialogOpen()) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.matches && e.target.matches("input, textarea, select")) return;
    const buttons = Array.from($("choices").querySelectorAll("button.choice"));
    const k = e.key.length === 1 ? e.key.toLowerCase() : "";
    const pos = k ? ("1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k)) : -1;
    if (pos >= 0 && buttons[pos]) {
      e.preventDefault();
      buttons[pos].click();
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && buttons.length) {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      buttons[(i + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length].focus();
    }
  });

  updateSetup();
})();
