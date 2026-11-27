// Practice Questions — quiz and endless practice from the shared question bank
// Questions: ../../shared/data/questions.js (through APPSYCH_TOPICS.questions()); topic groups:
// ../../shared/data/topics.js; topic dialog: ../../shared/topic-picker.js (it keeps the chosen
// course's questions); title bar, modals and announcements: ../../shared/ui.js.
// URL options: ?mode=quiz | endless (written when a mode is chosen); ?groups=research-methods,ethics
// (class topic groups), ?ced=2.3,2.4 (CED topics, AP only) and ?all (written by the topic picker).
// No test options (?dev only affects the course menu).
//
// Modes are the title bar's pills. Switching mode goes back to setup in the new mode; if a
// session has answers or results, a modal asks first (the clock is paused while it's open).
//
// Timing rule: a question's time is all the time it was on screen (across visits, not
// counting time while the page is hidden or a dialog is open) up to the student's last
// answer change. In endless mode the first pick is final, so the clock stops there.
//
// Retry missed: replays only the questions still missed, in the same mode, without starting
// over. The score keeps first answers only; a question answered correctly on a retry is
// marked "Correct on Retry". Review shows the first answer and the latest retry answer.
(function () {
  "use strict";

  const TOPICS = window.APPSYCH_TOPICS;
  const PICKER = window.APPSYCH_TOPIC_PICKER;
  const UI = window.APPSYCH_UI;
  // Every active question; the picker keeps the chosen course's (so a course change needs no reload)
  const BANK = TOPICS ? TOPICS.questions() : [];
  const MAX_QUIZ = 75;
  const LETTERS = ["A", "B", "C", "D"];
  const MODE_HINTS = {
    quiz: "Answers are scored when you submit. You can skip questions, jump around with the question list, and change answers until then.",
    endless: "See feedback after every question, with hints if you want them. Keep going until you press Finish or run out of questions."
  };
  const MODE_NAMES = { quiz: "Quiz", endless: "Endless" };

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
  const say = (msg) => { if (UI) UI.announce(msg); };
  const anyDialogOpen = () => !!document.querySelector("dialog[open]");
  const isRight = (it) => it.pick != null && it.pick === it.q.answer;
  const lastRetry = (it) => (it.retries.length ? it.retries[it.retries.length - 1] : null);
  const fixedOnRetry = (it) => !isRight(it) && it.retries.some(isRight);
  const stillMissed = (it) => !isRight(it) && !fixedOnRetry(it);
  function resultOf(it) {
    if (isRight(it)) return "correct";
    if (fixedOnRetry(it)) return "fixed";
    return it.pick == null && !it.retries.length ? "skip" : "wrong";
  }
  const RESULT_TEXT = { correct: "Correct", fixed: "Correct on Retry", wrong: "Incorrect", skip: "Unanswered" };
  const RESULT_ICON = { correct: "✓", fixed: "↻", wrong: "✗", skip: "–" };

  if (!BANK.length || !TOPICS || !PICKER || !UI) {
    const note = $("setupNote");
    note.textContent = "The question bank didn't load. Check that shared/data/questions.js, topics.js, shared/ui.js and shared/topic-picker.js exist.";
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
  const countBtns = Array.from($("countSeg").querySelectorAll("button"));
  const modeBtns = Array.from(document.querySelectorAll(".modes .mode"));
  const startMode = new URLSearchParams(location.search).get("mode");
  let mode = startMode === "endless" ? "endless" : "quiz";
  const chosenMode = () => mode;

  // Returns the requested quiz length, or null if the typed number isn't valid
  function chosenCount() {
    if (countInput.validity.badInput) return null;
    const raw = countInput.value.trim();
    if (raw !== "") {
      const n = Number(raw);
      return Number.isInteger(n) && n >= 1 && n <= MAX_QUIZ ? n : null;
    }
    const b = countBtns.find((x) => x.getAttribute("aria-pressed") === "true");
    return b ? Number(b.getAttribute("data-count")) : 10;
  }

  function updateSetup() {
    const mode = chosenMode();
    const pool = picker.pool().length;
    const note = $("setupNote");
    let text, ok = pool > 0, warn = false;
    $("setupH").textContent = mode === "quiz" ? "Set up a quiz" : "Set up endless practice";
    $("modeHint").textContent = MODE_HINTS[mode];
    $("countField").hidden = mode !== "quiz";
    $("apNote").hidden = UI.course.get() !== "ap";   // the AP exam has 75 multiple-choice questions
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

  function pressCount(btn) {
    countBtns.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
  }
  countBtns.forEach((b) => b.addEventListener("click", () => { countInput.value = ""; pressCount(b); updateSetup(); }));
  countInput.addEventListener("input", () => {
    if (countInput.value !== "" || countInput.validity.badInput) pressCount(null);
    else if (!countBtns.some((b) => b.getAttribute("aria-pressed") === "true")) pressCount(countBtns[0]);
    updateSetup();
  });
  // The picker calls updateSetup on a course change; the AP-only note needs it without a picker change too
  UI.course.onChange(() => { if (!S) updateSetup(); });

  // ---------- Modes (title bar) ----------
  // Keep ?mode= in the address in step with the mode (replaceState: no reload, no Back entry).
  function writeModeParam(m) {
    try {
      const q = new URLSearchParams(location.search);
      q.set("mode", m);
      history.replaceState(history.state, "", location.pathname + "?" + q.toString().replace(/=(?=&|$)/g, "") + location.hash);
    } catch (e) { /* some browsers block this on file://; the mode still changes */ }
  }
  function showMode() {
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", b.getAttribute("data-mode") === mode ? "true" : "false"));
  }
  // Back to setup in mode m (any session is dropped)
  function setMode(m) {
    stopClock();
    S = null;
    mode = m;
    writeModeParam(m);
    showMode();
    show("setup");
    updateSetup();
    say(MODE_NAMES[m] + ". Choose your topics and press Start.");
  }
  // A session with answers or results asks before it's dropped
  const hasProgress = () => !!S && (S.phase !== "play" || !!S.round || S.items.some((it) => it.pick != null));
  let modeWanted = null;
  modeBtns.forEach((b) => b.addEventListener("click", () => {
    const m = b.getAttribute("data-mode");
    if (m === mode) return;   // already in this mode (a session in it keeps going)
    if (!hasProgress()) { setMode(m); return; }
    stopClock();
    modeWanted = null;
    const name = MODE_NAMES[m];
    $("modeDlgH").textContent = "Switch to " + name + "?";
    $("modeYesBtn").textContent = "Switch to " + name;
    const what = S.mode === "quiz" ? "quiz" : "practice session";
    $("modeDlgText").textContent = S.phase === "play"
      ? "This ends your " + what + ". Your answers so far won't be kept."
      : "Your results from this " + what + " won't be kept.";
    $("modeKeepBtn").textContent = S.phase === "play" ? "Keep working" : "Keep my results";
    $("modeYesBtn").onclick = () => { modeWanted = m; UI.closeModal("modeDialog"); };
    UI.openModal("modeDialog", { onClose: () => { if (modeWanted) setMode(modeWanted); else startClock(); } });
    $("modeKeepBtn").focus();
  }));
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
  // S = { mode, phase: "play" | "review" | "results", index, items, queue, round, exhausted }
  //   items: the session's questions (first answers); round: the retry being played, or null
  // item = { q, order, pick, viewMs, timeMs, hintUsed, seen, fbReady, retries, src }
  //   order: original choice indexes in display order; pick: original index of the answer
  //   seen: choices whose feedback is open once answers are shown (the correct answer and a
  //     wrong pick start open; every choice can be opened or closed)
  //   fbReady: seen has its starting set; retries: answered retry items (oldest first)
  //   src: for a retry item, the session item it retries
  let S = null;

  function makeItem(q, src) {
    const order = [0, 1, 2, 3];
    return { q: q, order: q.shuffle === false ? order : shuffle(order), pick: null,
      viewMs: 0, timeMs: null, hintUsed: false, seen: new Set(), fbReady: false,
      retries: [], src: src || null };
  }
  // The questions being played (a retry round) or reviewed (the session)
  const cur = () => (S.phase === "play" && S.round ? S.round : S.items);

  // Starting feedback once answers are shown: the correct answer plus any wrong answer
  // (first try or latest retry). Choices already opened or closed by the student stay that way.
  function readyFeedback(it) {
    if (it.fbReady) return;
    it.fbReady = true;
    it.seen.add(it.q.answer);
    if (it.pick != null) it.seen.add(it.pick);
    const r = lastRetry(it);
    if (r) it.seen.add(r.pick);
  }

  function startSession(mode, questions) {
    stopClock();
    S = { mode: mode, phase: "play", index: 0, items: [], queue: [], round: null, exhausted: false };
    if (mode === "quiz") S.items = questions.map((q) => makeItem(q));
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
    const it = cur()[S.index];
    return !(S.mode === "endless" && it.pick != null);
  }
  function stopClock() {
    if (shownAt != null && S) cur()[S.index].viewMs += performance.now() - shownAt;
    shownAt = null;
  }
  function startClock() {
    if (shownAt == null && clockShouldRun()) shownAt = performance.now();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopClock(); else startClock(); });
  window.addEventListener("pagehide", stopClock);

  // ---------- Question view (play and review) ----------
  function addTag(body, icon, text) {
    const tag = el("span", "tag");
    const i = el("span", "icon", icon);
    i.setAttribute("aria-hidden", "true");
    tag.appendChild(i);
    tag.appendChild(document.createTextNode(text));
    body.appendChild(tag);
  }

  function renderPlay(fresh) {
    const items = cur(), it = items[S.index], q = it.q;
    const review = S.phase === "review";
    const retry = !review && !!S.round;
    const quiz = S.mode === "quiz";
    const answered = it.pick != null;
    const reveal = review || (!quiz && answered);
    const last = S.index === items.length - 1;
    const r = review ? lastRetry(it) : null;   // latest answered retry, shown in review
    if (reveal) readyFeedback(it);

    $("qNum").textContent = (retry ? "Retry: " : "") + (quiz || review || retry
      ? "Question " + (S.index + 1) + " of " + items.length
      : "Question " + (S.index + 1));
    let status = "";
    if (review) {
      status = RESULT_ICON[resultOf(it)] + " " + RESULT_TEXT[resultOf(it)] + " · Time: " + fmtTime(it.timeMs);
      if (r) status += " · Retry time: " + fmtTime(r.timeMs);
    } else if (!quiz && answered) status = "Time: " + fmtTime(it.timeMs);
    $("qStatus").textContent = status;
    $("stem").textContent = q.stem;
    if (window.APPSYCH_FIGURES) APPSYCH_FIGURES.mount($("qFigure"), q.figure);

    // Choices: in a quiz they select an answer; once answers are shown they open and close feedback
    const list = $("choices");
    list.innerHTML = "";
    it.order.forEach((orig, pos) => {
      const li = el("li");
      const isAns = orig === q.answer, isPick = orig === it.pick, isRetry = !!r && orig === r.pick;
      const c = el("button", "choice");
      c.type = "button";
      c.setAttribute("data-orig", orig);
      const letter = el("span", "letter", LETTERS[pos]);
      letter.setAttribute("aria-hidden", "true");
      c.appendChild(letter);
      const body = el("span", "cbody");
      body.appendChild(el("span", "sr-only", "Choice " + LETTERS[pos] + ": "));
      body.appendChild(el("span", "ctext", q.choices[orig]));
      if (reveal) {
        if (isPick) addTag(body, isAns ? "✓" : "✗", (r ? "First answer: " : "Your answer: ") + (isAns ? "correct" : "incorrect"));
        if (isRetry) addTag(body, isAns ? "↻" : "✗", "Retry answer: " + (isAns ? "correct" : "incorrect"));
        if (isAns && !isPick && !isRetry) addTag(body, "✓", "Correct answer");
        if (isAns) c.classList.add("is-answer");
        else if (isPick || isRetry) c.classList.add("is-wrong");
      }
      c.appendChild(body);
      if (quiz && !review) c.setAttribute("aria-pressed", isPick ? "true" : "false");
      li.appendChild(c);

      if (reveal) {
        const open = it.seen.has(orig);
        c.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          const fb = el("p", "fb " + (isAns ? "good" : "bad"), q.feedback[orig]);
          fb.id = "fb-" + pos;
          c.setAttribute("aria-controls", fb.id);
          li.appendChild(fb);
        }
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
      if (review && !answered) {
        ex.appendChild(el("p", null, r ? "This question was not answered the first time, so it counts as wrong in your score."
          : "This question was not answered, so it counts as wrong."));
      }
      const p = el("p");
      p.appendChild(el("strong", null, "Explanation: "));
      p.appendChild(document.createTextNode(q.explanation));
      ex.appendChild(p);
    }
    // "Terms used in this question", only once the answer is shown
    if (window.APPSYCH_TERM_HELP) {
      APPSYCH_TERM_HELP.mount($("termHelp"), q, reveal ? it.order.map((orig, pos) => ({ letter: LETTERS[pos], orig: orig })) : null);
    }

    // Buttons for this phase
    $("listBtn").hidden = !(quiz || review);
    $("submitBtn").hidden = !(quiz && !review);
    $("submitBtn").textContent = retry ? "Submit retry" : "Submit quiz";
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
    else if (quiz) { next.textContent = last ? (retry ? "Submit retry" : "Submit quiz") : "Next"; next.disabled = false; }
    else {
      next.textContent = answered && (retry ? last : !S.queue.length) ? "See results" : "Next question";
      next.disabled = !answered;
    }
    let tip = "";
    if (reveal) tip = "Select a choice to show or hide its feedback.";
    else if (!quiz) tip = "Pick an answer to continue.";
    else tip = "You can skip questions and change answers until you submit.";
    if (retry && !reveal) tip += " Your first score stays the same; questions you get right now are marked Correct on Retry.";
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
  // "2 / 5": questions fixed on a retry out of those missed the first time
  function retrySummary() {
    const missed = S.items.filter((it) => !isRight(it));
    return missed.filter(fixedOnRetry).length + " / " + missed.length;
  }

  function renderPlayStats() {
    const box = $("playStats");
    if (S.phase === "review") {
      const s = summary(S.items);
      const tiles = [["Score", s.correct + " / " + s.total]];
      if (S.items.some((it) => it.retries.length)) tiles.push(["Correct on Retry", retrySummary()]);
      tiles.push(["Avg time", fmtTime(s.avg)]);
      renderStats(box, tiles);
    } else if (S.round) {
      const s = summary(S.round);
      renderStats(box, S.mode === "quiz"
        ? [["Retry question", (S.index + 1) + " / " + s.total], ["Answered", s.answered + " / " + s.total]]
        : [["Retry question", (S.index + 1) + " / " + s.total], ["Correct", String(s.correct)]]);
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
    if (i < 0 || i >= cur().length) return;
    stopClock();
    S.index = i;
    renderPlay(true);
    startClock();
  }

  function choose(orig) {
    if (S.phase !== "play" && S.phase !== "review") return;
    const it = cur()[S.index];
    if (S.phase === "review" || (S.mode === "endless" && it.pick != null)) {
      // Once answers are shown, every choice opens and closes its feedback
      if (it.seen.has(orig)) it.seen.delete(orig); else it.seen.add(orig);
      renderPlay(false);
      if (it.seen.has(orig)) say(it.q.feedback[orig]);
    } else if (S.mode === "quiz") {
      if (it.pick === orig) return;
      stopClock();
      it.pick = orig;
      it.timeMs = it.viewMs;   // time up to the latest answer change
      startClock();
      renderPlay(false);
    } else {
      stopClock();               // first pick is final in endless mode
      it.pick = orig;
      it.timeMs = it.viewMs;
      renderPlay(false);         // opens the feedback for the pick and the correct answer
      say(isRight(it) ? "Correct. " + it.q.feedback[orig]
        : "Incorrect. The correct answer is " + LETTERS[it.order.indexOf(it.q.answer)] + ". " + it.q.feedback[orig]);
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
      if (S.index === cur().length - 1) trySubmit(); else go(S.index + 1);
    } else nextEndless();
  });
  $("hintBtn").addEventListener("click", () => {
    const it = cur()[S.index];
    it.hintUsed = true;
    renderPlay(false);
    say("Hint: " + it.q.hint);
    $("nextBtn").disabled ? $("choices").querySelector("button.choice").focus() : $("nextBtn").focus();
  });

  function nextEndless() {
    const it = cur()[S.index];
    if (it.pick == null) return;
    if (S.round) {   // a retry round has all its questions from the start
      if (S.index === S.round.length - 1) finish(); else go(S.index + 1);
      return;
    }
    if (!S.queue.length) { finish(); return; }
    stopClock();
    S.items.push(makeItem(S.queue.shift()));
    S.index = S.items.length - 1;
    renderPlay(true);
    startClock();
  }

  // ---------- Question list dialog ----------
  function legendItem(cls, text, icon) {
    const li = el("li");
    const box = el("span", "qbox " + cls);
    box.setAttribute("aria-hidden", "true");
    if (icon) box.appendChild(el("span", "qi", icon));
    li.appendChild(box);
    li.appendChild(el("span", null, text));
    return li;
  }
  let listGo = null;   // the question picked in the list, opened once the modal has closed
  function openList() {
    stopClock();
    listGo = null;
    const review = S.phase === "review";
    const items = cur();
    const grid = $("qgrid");
    grid.innerHTML = "";
    items.forEach((it, i) => {
      const state = review ? resultOf(it) : it.pick == null ? "open" : "done";
      const words = { open: "unanswered", done: "answered", correct: "correct", fixed: "correct on retry",
        wrong: "incorrect", skip: "unanswered" }[state];
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
      b.addEventListener("click", () => { listGo = i; UI.closeModal("listDialog"); });
      li.appendChild(b);
      grid.appendChild(li);
    });
    const legend = $("listLegend");
    legend.innerHTML = "";
    const s = summary(items);
    if (review) {
      const n = (st) => items.filter((it) => resultOf(it) === st).length;
      const fixed = n("fixed");
      $("listCount").textContent = n("correct") + " correct, " + (fixed ? fixed + " correct on retry, " : "") +
        n("wrong") + " incorrect, " + n("skip") + " unanswered. Select a number to review that question.";
      legend.appendChild(legendItem("correct", "Correct", "✓"));
      if (fixed) legend.appendChild(legendItem("fixed", "Correct on Retry", "↻"));
      legend.appendChild(legendItem("wrong", "Incorrect", "✗"));
      legend.appendChild(legendItem("skip", "Unanswered", "–"));
    } else {
      $("listCount").textContent = s.answered + " of " + s.total + " answered. Select a number to go to that question.";
      legend.appendChild(legendItem("done", "Answered"));
      legend.appendChild(legendItem("open", "Unanswered"));
    }
    legend.appendChild(legendItem("open cur", "Current question"));
    // onClose runs after ui.js puts focus back on the button, so go() can move it to the question
    UI.openModal("listDialog", { onClose: () => { if (listGo != null) go(listGo); else startClock(); } });
    const curBox = grid.querySelector('[aria-current="true"]');
    if (curBox) curBox.focus();
  }
  $("listBtn").addEventListener("click", openList);

  // ---------- Submitting ----------
  let submitNow = false;
  function trySubmit() {
    const items = cur();
    const unanswered = items.filter((it) => it.pick == null).length;
    if (!unanswered) { finish(); return; }
    stopClock();
    $("subText").textContent = plural(unanswered, "question is", "questions are") + " unanswered out of " +
      items.length + ". " + (S.round ? "Unanswered retry questions stay marked as missed."
        : "Unanswered questions are counted as wrong.");
    submitNow = false;
    UI.openModal("submitDialog", { onClose: () => { if (submitNow) finish(); else startClock(); } });
    $("keepBtn").focus();
  }
  $("submitBtn").addEventListener("click", trySubmit);
  $("submitAnywayBtn").addEventListener("click", () => { submitNow = true; UI.closeModal("submitDialog"); });

  $("finishBtn").addEventListener("click", finish);

  // ---------- Results ----------
  function finish() {
    stopClock();
    if (S.round) {
      // Keep each answered retry with its session question; unanswered ones change nothing
      S.round.forEach((r) => {
        if (r.pick == null) return;
        const src = r.src;
        src.retries.push(r);
        if (src.fbReady) { src.seen.add(src.q.answer); src.seen.add(r.pick); }
      });
      S.round = null;
    } else if (S.mode === "endless") {
      const last = S.items[S.items.length - 1];
      if (last && last.pick == null) S.items.pop();   // the question on screen wasn't answered
      if (!S.items.length) { S = null; show("setup"); updateSetup(); $("startBtn").focus(); return; }
      S.exhausted = !S.queue.length;
    }
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
    const retried = S.items.some((it) => it.retries.length);
    if (retried) tiles.splice(2, 0, ["Correct on Retry", retrySummary()]);
    renderStats($("resStats"), tiles);

    const notes = [];
    if (S.mode === "quiz" && s.answered < s.total) notes.push("Unanswered questions count as wrong and aren't included in the average time.");
    if (S.exhausted) notes.push("You answered every question in the topics you chose.");
    if (retried) notes.push("Score, accuracy, and time count first answers only. Questions you later got right are marked Correct on Retry.");
    $("resNote").textContent = notes.join(" ");

    const missed = S.items.filter(stillMissed).length;
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
  // Retry only the questions still missed; the session and its score are kept
  $("retryBtn").addEventListener("click", () => {
    const missed = S.items.filter(stillMissed);
    if (!missed.length) return;
    S.round = shuffle(missed).map((it) => makeItem(it.q, it));
    S.phase = "play";
    S.index = 0;
    show("play");
    renderPlay(true);
    startClock();
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

  showMode();
  updateSetup();
})();
