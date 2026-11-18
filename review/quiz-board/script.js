// Classroom Quiz Board — a team review game run from one computer
// Questions: ../../shared/data/questions.js; topic groups: ../../shared/data/topics.js;
// topic dialog: ../../shared/topic-picker.js.
// URL options: ?groups=research-methods,ethics (class topic groups) or ?ced=2.3,2.4 (CED topics).
//
// Board rules: columns are topic groups with at least MIN_Q questions (up to MAX_COLS, chosen
// at random). A question tagged with several groups is dealt to one column only. Rows are
// 100–500 points, matched to difficulty 1–5 where the bank allows; a missing level is filled
// with the nearest question, and columns with fewer than five questions leave blank cells.
(function () {
  "use strict";

  const BANK = (window.APPSYCH_QUESTIONS || []).filter((q) => q.status !== "omitted");
  const TOPICS = window.APPSYCH_TOPICS;
  const PICKER = window.APPSYCH_TOPIC_PICKER;
  const MAX_COLS = 6, ROWS = 5, MIN_Q = 3, MAX_TEAMS = 12, STEP = 100;
  const LETTERS = ["A", "B", "C", "D"];

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
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const fmt = (n) => (n < 0 ? "−" : "") + Math.abs(n);   // true minus sign
  function say(msg) {
    const live = $("live");
    live.textContent = "";
    setTimeout(() => { live.textContent = msg; }, 30);
  }
  function badge(i) {
    const b = el("span", "tb c" + (i % 6) + (i >= 6 ? " sq" : ""), String(i + 1));
    b.setAttribute("aria-hidden", "true");
    return b;
  }

  if (!BANK.length || !TOPICS || !PICKER) {
    const note = $("setupNote");
    note.textContent = "The question bank didn't load. Check that shared/data/questions.js, topics.js, and shared/topic-picker.js exist.";
    note.classList.add("warn");
    $("startBtn").disabled = true;
    $("topicsBtn").disabled = true;
    return;
  }

  // ---------- Sound (Web Audio) ----------
  let actx = null, soundOn = true;
  const SOUNDS = {
    open: [[523, 0, .09]],
    reveal: [[392, 0, .1], [587, .1, .18]],
    right: [[523, 0, .1], [659, .1, .1], [784, .2, .22]],
    wrong: [[196, 0, .16, "sawtooth"], [147, .16, .26, "sawtooth"]],
    end: [[392, 0, .12], [523, .12, .12], [659, .24, .12], [784, .36, .3]]
  };
  function sfx(name) {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === "suspended") actx.resume();
      SOUNDS[name].forEach((n) => {
        const o = actx.createOscillator(), g = actx.createGain();
        const t = actx.currentTime + n[1];
        o.type = n[3] || "triangle";
        o.frequency.value = n[0];
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(n[3] ? .08 : .16, t + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + n[2]);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + n[2] + .02);
      });
    } catch (err) { /* sound is optional */ }
  }
  $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn;
    $("soundBtn").setAttribute("aria-pressed", soundOn ? "true" : "false");
    $("soundBtn").textContent = "Sound: " + (soundOn ? "on" : "off");
  });

  // ---------- Building a board ----------
  // Returns { cols: [{ id, name, cells: [tile|null x ROWS] }], tiles, eligible, skipped }
  function buildBoard(pool, codes, seen) {
    const inSel = (c) => !codes || codes.some((s) => c === s || c.indexOf(s + ".") === 0);
    const groups = [];
    let skipped = 0;
    TOPICS.teachingUnits.forEach((u) => u.groups.forEach((g) => {
      // A question counts for a group only through a code that is also in the selection
      const qs = pool.filter((q) => (q.ced || []).some((c) => inSel(c) && TOPICS.matchesCodes({ ced: [c] }, g.codes)));
      if (qs.length >= MIN_Q) groups.push({ g: g, order: groups.length, qs: qs, own: [] });
      else if (qs.length) skipped++;
    }));

    // Deal each question to one column: the eligible column that has the fewest so far
    function deal(cols) {
      cols.forEach((c) => { c.own = []; });
      const owners = new Map();
      cols.forEach((c) => c.qs.forEach((q) => { if (!owners.has(q)) owners.set(q, []); owners.get(q).push(c); }));
      shuffle(Array.from(owners)).sort((a, b) => a[1].length - b[1].length).forEach((e) => {
        let best = e[1][0];
        e[1].forEach((c) => { if (c.own.length < best.own.length) best = c; });
        best.own.push(e[0]);
      });
    }
    const spare = shuffle(groups);
    const chosen = spare.splice(0, MAX_COLS);
    for (;;) {
      deal(chosen);
      const thin = chosen.filter((c) => c.own.length < MIN_Q).sort((a, b) => a.own.length - b.own.length)[0];
      if (!thin) break;
      chosen.splice(chosen.indexOf(thin), 1);          // sharing left it too short; try another topic
      if (spare.length) chosen.push(spare.shift());
    }
    chosen.sort((a, b) => a.order - b.order);

    const tiles = [];
    const cols = chosen.map((c, ci) => {
      // Up to five questions: one per difficulty level if possible, new questions before repeats
      const left = shuffle(c.own).sort((a, b) => (seen.has(a.id) ? 1 : 0) - (seen.has(b.id) ? 1 : 0));
      const picked = [];
      for (let d = 1; d <= ROWS; d++) {
        const i = left.findIndex((q) => q.difficulty === d);
        if (i >= 0) picked.push(left.splice(i, 1)[0]);
      }
      while (picked.length < ROWS && left.length) picked.push(left.shift());
      picked.sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));

      // Rows: easy to hard, each as close to its difficulty as the column allows
      let rows = null, bestCost = Infinity;
      for (let mask = 0; mask < (1 << ROWS); mask++) {
        const r = [];
        for (let i = 0; i < ROWS; i++) if (mask & (1 << i)) r.push(i);
        if (r.length !== picked.length) continue;
        const cost = r.reduce((sum, row, i) => sum + Math.abs((picked[i].difficulty || 3) - (row + 1)), 0);
        if (cost < bestCost) { bestCost = cost; rows = r; }
      }
      const cells = new Array(ROWS).fill(null);
      picked.forEach((q, i) => {
        const order = [0, 1, 2, 3];
        const t = { q: q, order: q.shuffle === false ? order : shuffle(order), points: (rows[i] + 1) * STEP,
          col: ci, row: rows[i], cat: c.g.name, used: false, winner: null, btn: null };
        cells[rows[i]] = t;
        tiles.push(t);
      });
      return { id: c.g.id, name: c.g.name, cells: cells };
    });
    return { cols: cols, tiles: tiles, eligible: groups.length, skipped: skipped };
  }

  // ---------- Setup ----------
  const names = [];
  for (let i = 0; i < MAX_TEAMS; i++) names.push("");
  let teamCount = 4;
  let pending = null;            // the board Start game will use
  const seen = new Set();        // question ids already dealt this session

  const picker = PICKER.create({
    items: BANK,
    noun: ["question", "questions"],
    openButton: $("topicsBtn"),
    summary: $("topicSummary"),
    intro: "Each topic with at least 3 questions can become a column of the board.",
    onChange: updateSetup
  });
  const newBoard = () => buildBoard(picker.pool(), picker.codes ? picker.codes() : null, seen);

  function renderNames() {
    $("teamCount").textContent = plural(teamCount, "team", "teams");
    $("lessBtn").disabled = teamCount <= 1;
    $("moreBtn").disabled = teamCount >= MAX_TEAMS;
    const list = $("names");
    list.innerHTML = "";
    for (let i = 0; i < teamCount; i++) {
      const li = el("li");
      li.appendChild(badge(i));
      const input = el("input");
      input.type = "text";
      input.maxLength = 20;
      input.value = names[i];
      input.placeholder = "Team " + (i + 1);
      input.setAttribute("aria-label", "Name of team " + (i + 1));
      input.addEventListener("input", () => { names[i] = input.value; });
      li.appendChild(input);
      list.appendChild(li);
    }
  }
  $("lessBtn").addEventListener("click", () => { if (teamCount > 1) { teamCount--; renderNames(); } });
  $("moreBtn").addEventListener("click", () => { if (teamCount < MAX_TEAMS) { teamCount++; renderNames(); } });

  function updateSetup() {
    pending = newBoard();
    const note = $("setupNote");
    const n = pending.cols.length;
    let text;
    if (n < 2) {
      text = "A board needs at least 2 topics with " + MIN_Q + " or more questions each. " +
        (pending.eligible === 1 ? "Only 1 of the chosen topics has enough" : "None of the chosen topics have enough") +
        ". Choose more topics.";
    } else {
      text = "Board: " + n + " topics, " + plural(pending.tiles.length, "question", "questions") + ".";
      if (pending.eligible > n) text += " " + n + " of " + pending.eligible + " topics were chosen at random.";
      if (pending.skipped) text += " " + plural(pending.skipped, "topic", "topics") + " with fewer than " + MIN_Q + " questions " + (pending.skipped === 1 ? "was" : "were") + " left out.";
    }
    note.textContent = text;
    note.classList.toggle("warn", n < 2);
    $("startBtn").disabled = n < 2;
  }

  // ---------- Game state ----------
  // G = { teams: [{ name, score }], opts, board, history, pick, started }
  // history entry = { tile, deltas: [{ team, pts }], prevPick }
  let G = null;
  let V = null;                  // open question: { tile, revealed, hint, choices, miss: Set, fb: Set }
  let focusPos = { col: 0, row: 0 };

  function show(name) {
    ["setup", "game", "final"].forEach((id) => { $(id).hidden = id !== name; });
    $("pageHint").hidden = name !== "setup";
  }

  $("startBtn").addEventListener("click", () => {
    if (!pending || pending.cols.length < 2) return;
    const teams = [];
    for (let i = 0; i < teamCount; i++) teams.push({ name: names[i].trim() || "Team " + (i + 1), score: 0 });
    G = { teams: teams, board: null, history: [], pick: 0,
      opts: { penalty: $("optPenalty").checked, choices: $("optChoices").checked, pick: $("optPick").checked && teamCount > 1 } };
    dealBoard(pending);
    pending = null;
  });

  function dealBoard(board) {
    G.board = board;
    G.history = [];
    G.pick = 0;
    G.teams.forEach((t) => { t.score = 0; });
    board.tiles.forEach((t) => seen.add(t.q.id));
    show("game");
    renderBoard();
    renderScores();
    updateTools();
    const first = board.tiles.find((t) => t.col === 0) || board.tiles[0];
    setFocusTile(first, true);
  }

  // ---------- Scoreboard ----------
  function renderScores() {
    const list = $("scores");
    list.innerHTML = "";
    list.classList.toggle("no-pick", !G.opts.pick);
    G.teams.forEach((t, i) => {
      const hasPick = G.opts.pick && G.pick === i;
      const li = el("li", "team" + (hasPick ? " has-pick" : ""));
      li.appendChild(badge(i));
      li.appendChild(el("span", "tname", t.name));
      const score = el("strong", null, fmt(t.score));
      score.setAttribute("aria-label", t.score + " points");
      li.appendChild(score);
      const pick = el("span", "pick", "▶ Picks next");
      if (!hasPick) pick.setAttribute("aria-hidden", "true");
      li.appendChild(pick);
      const adj = el("div", "adj");
      [-STEP, STEP].forEach((d) => {
        const b = el("button", null, (d < 0 ? "−" : "+") + STEP);
        b.type = "button";
        b.setAttribute("aria-label", (d < 0 ? "Take " + STEP + " from " : "Give " + STEP + " to ") + t.name);
        b.addEventListener("click", () => {
          t.score += d;
          renderScores();
          const again = $("scores").children[i].querySelectorAll(".adj button")[d < 0 ? 0 : 1];
          again.focus({ preventScroll: true });
          say(t.name + ": " + t.score + " points");
        });
        adj.appendChild(b);
      });
      li.appendChild(adj);
      list.appendChild(li);
    });
  }

  function updateTools() {
    const anyUsed = G.board.tiles.some((t) => t.used);
    $("reshuffleBtn").disabled = anyUsed;
    $("undoBtn").disabled = !G.history.length;
  }

  // ---------- Board ----------
  function tileLabel(t) {
    if (!t.used) return t.cat + ", " + t.points + " points";
    return t.cat + ", " + t.points + " points, used, " + (t.winner == null ? "no one scored" : G.teams[t.winner].name + " scored");
  }
  function paintTile(t) {
    const b = t.btn;
    b.innerHTML = "";
    b.classList.toggle("used", t.used);
    if (t.used) {
      b.setAttribute("aria-disabled", "true");
      b.appendChild(el("span", "tused", "Used"));
      b.appendChild(el("span", "twho", t.winner == null ? "No one" : "✓ " + G.teams[t.winner].name));
    } else {
      b.removeAttribute("aria-disabled");
      b.textContent = String(t.points);
    }
    b.setAttribute("aria-label", tileLabel(t));
  }
  function renderBoard() {
    const board = $("board");
    board.innerHTML = "";
    board.style.setProperty("--cols", G.board.cols.length);
    const head = el("div");
    head.setAttribute("role", "row");
    G.board.cols.forEach((c) => {
      const h = el("div", "cat", c.name);
      h.setAttribute("role", "columnheader");
      head.appendChild(h);
    });
    board.appendChild(head);
    for (let r = 0; r < ROWS; r++) {
      const row = el("div");
      row.setAttribute("role", "row");
      G.board.cols.forEach((c) => {
        const t = c.cells[r];
        const cell = el("div", "cell" + (t ? "" : " none"));
        cell.setAttribute("role", "gridcell");
        if (t) {
          const b = el("button", "tile");
          b.type = "button";
          b.tabIndex = -1;
          t.btn = b;
          paintTile(t);
          b.addEventListener("click", () => { setFocusTile(t, false); openTile(t); });
          b.addEventListener("focus", () => setFocusTile(t, false));
          cell.appendChild(b);
        }
        row.appendChild(cell);
      });
      board.appendChild(row);
    }
  }
  function setFocusTile(t, focus) {
    G.board.tiles.forEach((x) => { x.btn.tabIndex = x === t ? 0 : -1; });
    focusPos = { col: t.col, row: t.row };
    if (focus) t.btn.focus({ preventScroll: true });
  }

  // Arrow keys: next tile in that direction, skipping blank cells
  $("board").addEventListener("keydown", (e) => {
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!move || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const cols = G.board.cols;
    let c = focusPos.col + move[0], r = focusPos.row + move[1], target = null;
    if (move[1]) {
      for (; r >= 0 && r < ROWS && !target; r += move[1]) target = cols[c].cells[r];
    } else if (c >= 0 && c < cols.length) {
      // Same row if that column has it, otherwise the nearest row
      for (let d = 0; d < ROWS && !target; d++) target = cols[c].cells[focusPos.row - d] || cols[c].cells[focusPos.row + d];
    }
    if (target) setFocusTile(target, true);
  });

  $("reshuffleBtn").addEventListener("click", () => {
    const b = newBoard();
    if (b.cols.length < 2) return;
    dealBoard(b);
    say("New board dealt.");
  });

  // ---------- Question view ----------
  const dlg = $("qDialog");
  function openTile(t, revealed) {
    if (t.used) { say("That tile has been used."); return; }
    V = { tile: t, revealed: !!revealed, hint: false, choices: G.opts.choices, miss: new Set(), fb: new Set() };
    renderQuestion();
    if (!dlg.open) {
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
    }
    dlg.scrollTop = 0;
    $("qHead").focus({ preventScroll: true });
    sfx("open");
  }

  function renderQuestion() {
    const t = V.tile, q = t.q;
    $("qCat").textContent = t.cat;
    $("qPts").textContent = t.points + " points";
    $("stem").textContent = q.stem;
    if (window.APPSYCH_FIGURES) APPSYCH_FIGURES.mount($("qFigure"), q.figure);

    // Choices: all four, or (open response, after the reveal) only the answer
    const list = $("choices");
    list.innerHTML = "";
    list.hidden = !V.choices && !V.revealed;
    t.order.forEach((orig, pos) => {
      const isAns = orig === q.answer;
      if (!V.choices && !isAns) return;
      const li = el("li");
      const c = el(V.revealed && V.choices ? "button" : "div", "choice");
      if (c.tagName === "BUTTON") {
        c.type = "button";
        c.setAttribute("aria-expanded", V.fb.has(orig) ? "true" : "false");
        c.addEventListener("click", () => {
          if (V.fb.has(orig)) V.fb.delete(orig); else V.fb.add(orig);
          renderQuestion();
          const again = $("choices").querySelectorAll("button.choice")[pos];
          if (again) again.focus({ preventScroll: true });
          if (V.fb.has(orig)) say(q.feedback[orig]);
        });
      }
      if (V.choices) {
        const letter = el("span", "letter", LETTERS[pos]);
        letter.setAttribute("aria-hidden", "true");
        c.appendChild(letter);
      }
      const body = el("span", "cbody");
      if (V.choices) body.appendChild(el("span", "sr-only", "Choice " + LETTERS[pos] + ": "));
      body.appendChild(el("span", null, q.choices[orig]));
      if (V.revealed && isAns) {
        c.classList.add("is-answer");
        body.appendChild(el("span", "tag", "✓ Correct answer"));
      }
      c.appendChild(body);
      li.appendChild(c);
      if (V.revealed && V.fb.has(orig)) li.appendChild(el("p", "fb" + (isAns ? " good" : ""), q.feedback[orig]));
      list.appendChild(li);
    });

    $("hintBox").hidden = !V.hint;
    $("hintBox").textContent = "Hint: " + q.hint;
    $("explain").hidden = !V.revealed;
    $("explain").textContent = V.revealed ? "Explanation: " + q.explanation : "";
    // "What's this?" definitions after the reveal, for the choices on screen
    if (window.APPSYCH_TERM_HELP) {
      const shown = V.revealed ? t.order.map((orig, pos) => ({ letter: LETTERS[pos], orig: orig }))
        .filter((s) => V.choices || s.orig === q.answer) : null;
      if (shown && !V.choices) shown.forEach((s) => { s.label = "Answer"; });
      APPSYCH_TERM_HELP.mount($("termHelp"), q, shown);
    }

    // Before the reveal: hint, choices, reveal. After: award buttons.
    $("closeBtn").hidden = V.revealed;
    $("hintBtn").hidden = V.revealed;
    $("hintBtn").disabled = V.hint;
    $("hintBtn").setAttribute("aria-expanded", V.hint ? "true" : "false");
    $("hintBtn").textContent = V.hint ? "Hint shown" : "Show hint";
    $("choicesBtn").hidden = V.choices;
    $("revealBtn").hidden = V.revealed;
    $("askRow").hidden = V.revealed && V.choices;
    $("awardBox").hidden = !V.revealed;
    if (V.revealed) renderAward();
  }

  function awardButton(i, miss) {
    const team = G.teams[i];
    const b = el("button", "award" + (miss ? " miss" : ""));
    b.type = "button";
    b.appendChild(badge(i));
    b.appendChild(el("span", "tname", team.name));
    b.appendChild(el("span", "sc", fmt(team.score)));
    if (miss) {
      b.setAttribute("aria-pressed", V.miss.has(i) ? "true" : "false");
      b.setAttribute("aria-label", team.name + " answered wrong, lose " + V.tile.points);
      b.addEventListener("click", () => toggleMiss(i));
    } else {
      b.setAttribute("aria-label", team.name + " answered correctly, add " + V.tile.points);
      b.addEventListener("click", () => finishTile(i));
    }
    return b;
  }
  function renderAward() {
    const pts = V.tile.points;
    $("wrongGroup").hidden = !G.opts.penalty;
    $("wrongLabel").textContent = "✗ Answered wrong (−" + pts + " each; select again to take it back)";
    $("rightLabel").textContent = "✓ Answered correctly (+" + pts + ")";
    const wrong = $("wrongRow"), right = $("rightRow");
    wrong.innerHTML = "";
    right.innerHTML = "";
    G.teams.forEach((t, i) => {
      if (G.opts.penalty) wrong.appendChild(awardButton(i, true));
      right.appendChild(awardButton(i, false));
    });
  }

  function reveal() {
    if (!V || V.revealed) return;
    V.revealed = true;
    renderQuestion();
    sfx("reveal");
    const q = V.tile.q;
    say("Correct answer: " + q.choices[q.answer] + ". " + q.explanation);
    const first = $("rightRow").querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  function showHint() {
    if (!V || V.revealed || V.hint) return;
    V.hint = true;
    renderQuestion();
    say("Hint: " + V.tile.q.hint);
    $("revealBtn").focus({ preventScroll: true });
  }
  function showChoices() {
    if (!V || V.choices) return;
    V.choices = true;
    renderQuestion();
    ($("revealBtn").hidden ? $("qHead") : $("revealBtn")).focus({ preventScroll: true });
  }

  // Wrong answers apply at once (so the scores on the buttons stay true) and can be toggled off
  function toggleMiss(i) {
    const pts = V.tile.points;
    if (V.miss.has(i)) { V.miss.delete(i); G.teams[i].score += pts; }
    else { V.miss.add(i); G.teams[i].score -= pts; sfx("wrong"); }
    renderScores();
    renderAward();
    $("wrongRow").children[i].focus({ preventScroll: true });
    say(G.teams[i].name + ": " + G.teams[i].score + " points");
  }

  function closeDialog() {
    V = null;
    if (typeof dlg.close === "function" && dlg.open) dlg.close();
    else dlg.removeAttribute("open");
  }

  // Before the reveal: back to the board with the tile still available
  function backOut() {
    const t = V.tile;
    closeDialog();
    setFocusTile(t, true);
  }

  // winner: team index, or null for "No one"
  function finishTile(winner) {
    const t = V.tile;
    const deltas = Array.from(V.miss).filter((i) => i !== winner).map((i) => ({ team: i, pts: -t.points }));
    if (winner != null) {
      if (V.miss.has(winner)) G.teams[winner].score += t.points;   // marked wrong by mistake
      G.teams[winner].score += t.points;
      deltas.push({ team: winner, pts: t.points });
    }
    G.history.push({ tile: t, deltas: deltas, prevPick: G.pick });
    if (winner != null) G.pick = winner;
    t.used = true;
    t.winner = winner;
    paintTile(t);
    renderScores();
    updateTools();
    closeDialog();
    if (winner != null) { sfx("right"); say(G.teams[winner].name + " gets " + t.points + ". Score: " + G.teams[winner].score + "."); }
    if (G.board.tiles.every((x) => x.used)) showFinal();
    else setFocusTile(t, true);
  }

  $("undoBtn").addEventListener("click", () => {
    const h = G.history.pop();
    if (!h) return;
    h.deltas.forEach((d) => { G.teams[d.team].score -= d.pts; });
    G.pick = h.prevPick;
    h.tile.used = false;
    h.tile.winner = null;
    paintTile(h.tile);
    renderScores();
    updateTools();
    setFocusTile(h.tile, false);
    openTile(h.tile, true);        // reopened with the answer showing, ready to award again
    say("Last score undone. " + tileLabel(h.tile) + " is open again.");
  });

  $("closeBtn").addEventListener("click", backOut);
  $("hintBtn").addEventListener("click", showHint);
  $("choicesBtn").addEventListener("click", showChoices);
  $("revealBtn").addEventListener("click", reveal);
  $("noneBtn").addEventListener("click", () => finishTile(null));

  // Esc: back out before the reveal; after it, the answer has been seen, so it counts as "No one"
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (!V) return;
    if (V.revealed) finishTile(null); else backOut();
  });
  dlg.addEventListener("keydown", (e) => {
    if (!V || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Escape" && typeof dlg.showModal !== "function") { e.preventDefault(); V.revealed ? finishTile(null) : backOut(); return; }
    const k = e.key.toLowerCase();
    const digit = /^Digit[1-9]$/.test(e.code) ? Number(e.code.slice(5)) : /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
    if (k === "r") { e.preventDefault(); reveal(); }
    else if (k === "h") { e.preventDefault(); showHint(); }
    else if (k === "c") { e.preventDefault(); showChoices(); }
    else if (k === "n" && V.revealed) { e.preventDefault(); finishTile(null); }
    else if (digit && V.revealed && digit <= G.teams.length) {
      e.preventDefault();
      if (e.shiftKey) { if (G.opts.penalty) toggleMiss(digit - 1); }
      else finishTile(digit - 1);
    }
  });

  // ---------- Final standings ----------
  function showFinal() {
    const ranked = G.teams.map((t, i) => ({ t: t, i: i })).sort((a, b) => b.t.score - a.t.score || a.i - b.i);
    // Tied teams share a place, and the next place skips ahead (1, 1, 3)
    ranked.forEach((r, n) => { r.place = n > 0 && ranked[n - 1].t.score === r.t.score ? ranked[n - 1].place : n + 1; });
    const tied = (r) => ranked.filter((x) => x.place === r.place).length > 1;
    const top = ranked.filter((r) => r.place === 1);
    const win = $("winner");
    if (ranked.length === 1) win.textContent = "Final score: " + fmt(top[0].t.score);
    else if (top.length === ranked.length) win.textContent = "It's a tie between every team at " + fmt(top[0].t.score) + "!";
    else if (top.length > 1) {
      const n = top.map((r) => r.t.name);
      win.textContent = "It's a tie for first: " + n.slice(0, -1).join(", ") + " and " + n[n.length - 1] + ", with " + fmt(top[0].t.score) + " each!";
    } else win.textContent = top[0].t.name + " wins with " + fmt(top[0].t.score) + "!";

    const list = $("standings");
    list.innerHTML = "";
    const ORD = ["", "1st", "2nd", "3rd"];
    ranked.forEach((r) => {
      const li = el("li", r.place === 1 ? "first" : "");
      li.appendChild(el("span", "place", (tied(r) ? "Tie " : "") + (ORD[r.place] || r.place + "th")));
      li.appendChild(badge(r.i));
      li.appendChild(el("span", "tname", r.t.name));
      const s = el("strong", null, fmt(r.t.score));
      s.setAttribute("aria-label", r.t.score + " points");
      li.appendChild(s);
      list.appendChild(li);
    });
    show("final");
    $("finalH").focus({ preventScroll: true });
    window.scrollTo(0, 0);
    sfx("end");
    say(win.textContent);
  }
  $("endBtn").addEventListener("click", showFinal);
  $("backBtn").addEventListener("click", () => {
    show("game");
    const t = G.board.tiles.find((x) => !x.used) || G.board.tiles[0];
    setFocusTile(t, true);
  });
  $("againBtn").addEventListener("click", () => {
    const b = newBoard();
    if (b.cols.length < 2) return;
    dealBoard(b);
  });
  $("newBtn").addEventListener("click", () => {
    G = null;
    show("setup");
    updateSetup();
    $("startBtn").focus();
  });

  renderNames();
  updateSetup();
})();
