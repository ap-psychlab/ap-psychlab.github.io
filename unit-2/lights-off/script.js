/* Lights Off — algorithms vs. heuristics (CED 2.2.A.3–2.2.A.5)
 *
 * Test options (URL):
 *   ?dev      debug tools (buttons under the side panel)
 *   ?seed=N   repeatable scrambles (any whole number); the challenge (tutorial step 6)
 *             uses its own seeded stream, so its puzzles repeat whatever came before
 * Public option:
 *   ?mode=tutorial | practice | timed   open in that mode (default: practice)
 *
 * Dev tools (?dev): Turn all off, Time left 10 s, Show fewest-moves solution, Show algorithm
 * steps, Solve one step, Solve all (algorithm), Load mental set board, tutorial Jump to step,
 * auto-play (Heuristic, Algorithm, Heuristic then algorithm), Fill results (challenge), plus an
 * info line (in the challenge it also shows each press: A = algorithm step, h = not).
 *
 * Board cells are numbered 0–24, row by row (cell = row × 5 + column, 0-based).
 * The plan ("Lights Off - Plan.md") lists the remaining build steps.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var DEV = params.has('dev');
  var N = 5, TOTAL = 25, ROUND = 90;
  var LEVELS = {
    easy: { min: 3, max: 4, label: 'Easy' },
    medium: { min: 6, max: 8, label: 'Medium' },
    hard: { min: 11, max: 15, label: 'Hard' }
  };
  // Stuck alert (Practice only): fires once per puzzle when moves reach fewest possible +
  // STUCK_EXTRA_MOVES, or when the lit count hasn't gone below its lowest so far for
  // STUCK_FLAT_PRESSES presses in a row.
  var STUCK_EXTRA_MOVES = 10, STUCK_FLAT_PRESSES = 8;
  // The mental set board (tutorial step 5; dev "Load mental set board" in Practice):
  // from all off, press top row column 2, top row column 5, row 4 column 4.
  var MENTAL_SET_PRESSES = [1, 4, 18];
  // Tutorial boards, defined by the presses that make them (checked with the solver):
  // step 2: the chase alone solves it (5 presses; row 1 has two lights);
  // step 3: the chase leaves row 5 columns 1, 3, 4 lit (both methods: press top-row 5).
  var TUT_BOARD_CHASE = [5, 7, 10, 16, 21];
  var TUT_BOARD_BOTTOM = [4, 8, 12];
  // "Heuristic or algorithm?" challenge (tutorial step 6)
  var CHALLENGE_LEVELS = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium']; // shuffled
  var QUALIFY_GAP = 4;          // use only boards where the algorithm takes ≥ fewest + 4
  var CLASS_RUN_MIN = 6;        // switch point: the rest is a run of at least 6 presses,
  var CLASS_RUN_RATE = 0.75;    //   starting with an algorithm step, ≥ 75% algorithm steps
  var CLASS_SWITCH_AFTER = 3;   // Heuristic, then algorithm: switch after ≥ 3 presses, and
  var CLASS_PREFIX_MAX = 0.5;   //   fewer than half of the presses before it were algorithm steps
  var CLASS_ALGO_RATE = 0.8;    // Algorithm: a switch point and ≥ 80% algorithm steps overall
  var CLASS_HEUR_EXTRA = 2;     // Heuristic: solved within fewest possible + 2 moves

  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var svg = $('board');

  /* ---------- Random numbers (seeded with ?seed=N) ---------- */
  function seeded(seed) { // mulberry32
    seed = seed >>> 0;
    return function () {
      seed = (seed + 0x6D2B79F5) >>> 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = Math.random, chRand = Math.random;
  if (params.has('seed')) {
    var seedN = parseInt(params.get('seed'), 10) || 0;
    rand = seeded(seedN);
    chRand = seeded(seedN + 1000003);
  }

  /* ---------- Board model ---------- */
  function neighbors(i) {
    var r = Math.floor(i / N), c = i % N, out = [i];
    if (r > 0) out.push(i - N);
    if (r < N - 1) out.push(i + N);
    if (c > 0) out.push(i - 1);
    if (c < N - 1) out.push(i + 1);
    return out;
  }
  function applyPress(b, i) { neighbors(i).forEach(function (j) { b[j] = !b[j]; }); }
  function emptyBoard() { var b = []; for (var i = 0; i < TOTAL; i++) b.push(false); return b; }
  function boardFrom(presses) { var b = emptyBoard(); presses.forEach(function (i) { applyPress(b, i); }); return b; }
  function allOff(b) { return b.every(function (x) { return !x; }); }
  function litCount(b) { return b.filter(Boolean).length; }

  // Start from all off and press k different cells, so every puzzle is solvable.
  function scramble(level, rng) {
    var L = LEVELS[level], b, k, idx, i, j, t;
    rng = rng || rand;
    do {
      k = L.min + Math.floor(rng() * (L.max - L.min + 1));
      b = emptyBoard(); idx = [];
      for (i = 0; i < TOTAL; i++) idx.push(i);
      for (i = TOTAL - 1; i > 0; i--) { j = Math.floor(rng() * (i + 1)); t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      for (i = 0; i < k; i++) applyPress(b, idx[i]);
    } while (litCount(b) < 3);
    return b;
  }

  /* ---------- Chase and the bottom-row lookup table ---------- */
  // Chase rows 1–4 down: for each lit light, press the cell below it. Returns the presses.
  function chase(b) {
    var out = [];
    for (var r = 0; r < N - 1; r++) {
      for (var c = 0; c < N; c++) {
        if (b[r * N + c]) { applyPress(b, (r + 1) * N + c); out.push((r + 1) * N + c); }
      }
    }
    return out;
  }
  // Bottom-row pattern (columns 1–5 that are on, e.g. "1,2") → the top-row presses that
  // finish the puzzle in the fewest total presses (top-row presses + the second chase).
  // Each pattern has 4 working top-row sets; ties go to fewer top-row presses.
  function lookupTable() {
    var best = {}, cost = {};
    for (var s = 1; s < 32; s++) {
      var b = emptyBoard(), cols = [], c;
      for (c = 0; c < N; c++) if (s & (1 << c)) { applyPress(b, c); cols.push(c + 1); }
      var total = cols.length + chase(b).length;
      var bottom = [];
      for (c = 0; c < N; c++) if (b[(N - 1) * N + c]) bottom.push(c + 1);
      var key = bottom.join(',');
      if (key && (!best[key] || total < cost[key] || (total === cost[key] && cols.length < best[key].length))) {
        best[key] = cols; cost[key] = total;
      }
    }
    return best;
  }
  var LOOKUP = null;
  // The two ways to fix the bottom row; both return top-row cells (0–4) to press.
  function bottomOf(b) { var out = []; for (var c = 0; c < N; c++) out.push(b[(N - 1) * N + c]); return out; }
  function shortcutPresses(bottom) {
    var rules = [[3, 4], [1, 4], [3]], count = {}, out = [];
    for (var c = 0; c < 3; c++) if (bottom[c]) rules[c].forEach(function (t) { count[t] = (count[t] || 0) + 1; });
    Object.keys(count).forEach(function (t) { if (count[t] % 2) out.push(+t); });
    return out.sort();
  }
  function lookupPresses(bottom) {
    var key = [];
    bottom.forEach(function (on, c) { if (on) key.push(c + 1); });
    return (LOOKUP[key.join(',')] || []).map(function (col) { return col - 1; });
  }

  /* ---------- Solver ---------- */
  // Press order doesn't matter, and once the top-row presses are chosen the chase decides
  // every other press. So try all 32 top-row press sets; exactly 4 solve a solvable board.
  function allSolutions(b) {
    var sols = [];
    for (var s = 0; s < 32; s++) {
      var x = b.slice(), tops = [];
      for (var c = 0; c < N; c++) if (s & (1 << c)) { applyPress(x, c); tops.push(c); }
      var rest = chase(x);
      if (allOff(x)) sols.push(tops.concat(rest));
    }
    return sols.sort(function (p, q) { return p.length - q.length; });
  }
  function fewestSolution(b) { return allSolutions(b)[0] || []; }
  function fewest(b) { return fewestSolution(b).length; }
  // Presses the algorithm makes from board b: chase, fix the bottom row, chase again.
  function algorithmMoves(b, method) {
    var x = b.slice(), n = chase(x).length;
    if (!allOff(x)) {
      var tops = (method === 'lookup' ? lookupPresses : shortcutPresses)(bottomOf(x));
      tops.forEach(function (t) { applyPress(x, t); });
      n += tops.length + chase(x).length;
    }
    return n;
  }

  /* ---------- Stepper: the algorithm's valid presses from any board ---------- */
  // makeStepper(['shortcut']) follows one method; ['shortcut', 'lookup'] accepts either
  // (for analyzing a player's presses later). step(b) returns the valid set, not one cell:
  //   { phase: 'chase', row, cols, cells, from }   row = highest lit row (0–3); press below each light
  //   { phase: 'bottom', cells, bottom, fresh }    top-row presses to fix the bottom row
  //   { phase: 'done', cells: [] }
  // pending (method → top-row cells still to press) is needed because after the first top-row
  // press rows 1–2 light up again, and a stateless rule would jump back to chasing.
  function chaseStep(b) {
    for (var r = 0; r < N - 1; r++) {
      var cols = [];
      for (var c = 0; c < N; c++) if (b[r * N + c]) cols.push(c);
      if (cols.length) {
        return {
          phase: 'chase', row: r, cols: cols,
          cells: cols.map(function (c) { return (r + 1) * N + c; }),
          from: cols.map(function (c) { return r * N + c; })
        };
      }
    }
    return null;
  }
  function makeStepper(methods) {
    var pending = null, afterTop = false;
    function open() { return pending ? methods.filter(function (m) { return pending[m] && pending[m].length; }) : []; }
    function finished() { return pending ? methods.filter(function (m) { return pending[m] && !pending[m].length; }) : []; }
    function step(b) {
      if (allOff(b)) return { phase: 'done', cells: [] };
      var fresh = false;
      if (pending && !open().length) { pending = null; afterTop = true; }
      if (!pending) {
        var ch = chaseStep(b);
        if (ch) { ch.again = afterTop; return ch; }
        // Rows 1–4 are dark and row 5 isn't: fill pending with each method's top-row presses.
        pending = {};
        methods.forEach(function (m) { pending[m] = (m === 'lookup' ? lookupPresses : shortcutPresses)(bottomOf(b)); });
        fresh = true;
      }
      var cells = [];
      open().forEach(function (m) { pending[m].forEach(function (t) { if (cells.indexOf(t) < 0) cells.push(t); }); });
      var res = { phase: 'bottom', cells: cells.sort(function (p, q) { return p - q; }), fresh: fresh, methods: open() };
      // A method whose top-row presses are all made has moved on to the second chase.
      if (finished().length) {
        var ch2 = chaseStep(b);
        if (ch2) { res.chase = ch2; res.cells = res.cells.concat(ch2.cells); }
      }
      return res;
    }
    // Call with the board BEFORE press i. Returns true if i was one of the algorithm's steps.
    function note(b, i) {
      var s = step(b), ok = s.cells.indexOf(i) >= 0;
      if (!ok) { pending = null; afterTop = false; return false; }
      if (s.phase === 'chase') { afterTop = s.again; return true; }
      if (s.chase && s.chase.cells.indexOf(i) >= 0) { pending = null; afterTop = true; return true; }
      methods.forEach(function (m) {
        if (!pending[m] || !pending[m].length || pending[m].indexOf(i) < 0) delete pending[m];
        else pending[m] = pending[m].filter(function (t) { return t !== i; });
      });
      return true;
    }
    function reset() { pending = null; afterTop = false; }
    return { step: step, note: note, reset: reset };
  }

  /* ---------- Classifier: which approach did the player use? (challenge) ---------- */
  // Replay the presses through a stepper that accepts either method and mark each press as an
  // algorithm step (in the valid set at that moment) or not; then apply the rules (constants above).
  var APPROACH = {
    heuristic: 'Heuristic', algorithm: 'Algorithm',
    'switch': 'Heuristic, then algorithm', trial: 'Trial and error / unclear'
  };
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : /s$/.test(word) ? 'es' : 's'); }
  function classify(start, presses, fewestN) {
    var b = start.slice(), st = makeStepper(['shortcut', 'lookup']), flags = [];
    presses.forEach(function (i) { flags.push(st.note(b, i)); applyPress(b, i); });
    var n = presses.length, algo = flags.filter(Boolean).length, sw = -1, k;
    for (k = 0; k + CLASS_RUN_MIN <= n; k++) {
      if (!flags[k]) continue;
      var rest = flags.slice(k), a = rest.filter(Boolean).length;
      if (a / rest.length >= CLASS_RUN_RATE) { sw = k; break; }
    }
    var pre = sw > 0 ? flags.slice(0, sw).filter(Boolean).length : 0;
    var slips = sw >= 0 ? (n - sw) - flags.slice(sw).filter(Boolean).length : 0;
    var label, evidence;
    if (sw >= CLASS_SWITCH_AFTER && pre / sw < CLASS_PREFIX_MAX) {
      label = 'switch';
      evidence = plural(sw, 'press') + ' of your own, then the algorithm for ' + (n - sw) +
        (slips ? ' (' + plural(slips, 'slip') + ')' : '') + '.';
    } else if (sw >= 0 && algo / n >= CLASS_ALGO_RATE) {
      label = 'algorithm';
      evidence = algo + ' of ' + plural(n, 'press') + ' were algorithm steps.';
    } else if (n <= fewestN + CLASS_HEUR_EXTRA) {
      label = 'heuristic';
      evidence = plural(n, 'move') + '; fewest possible was ' + fewestN + '.';
    } else {
      label = 'trial';
      evidence = plural(n, 'move') + ' (fewest possible ' + fewestN + '), and ' + algo + ' of ' + n +
        ' presses were algorithm steps, with no steady run of them.';
    }
    return { label: label, evidence: evidence, flags: flags, algoSteps: algo, switchAt: sw, slips: slips };
  }

  function fillLookupTable() {
    var best = LOOKUP, tb = document.querySelector('#lookup tbody');
    Object.keys(best).sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); })
      .forEach(function (key) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + key.split(',').join(', ') + '</td><td>' + best[key].join(', ') + '</td>';
        tb.appendChild(tr);
      });
  }

  /* ---------- Sound (Web Audio) ---------- */
  var soundOn = true, actx = null;
  function audio() {
    try {
      if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
    return actx;
  }
  function tone(freq, delay, dur, vol) {
    if (!soundOn) return;
    var a = audio(); if (!a) return;
    var t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function clickSound() { tone(440, 0, 0.14, 0.05); }
  function chime() { tone(523, 0, 0.35, 0.06); tone(659, 0.12, 0.35, 0.06); tone(784, 0.24, 0.5, 0.06); }
  function endTone() { tone(392, 0, 0.5, 0.05); tone(294, 0.2, 0.7, 0.05); }

  /* ---------- Drawing ---------- */
  var cells = [], tiles = [], rings = [];
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function buildBoard() {
    for (var i = 0; i < TOTAL; i++) {
      var r = Math.floor(i / N), c = i % N, x = c * 100, y = r * 100;
      var g = el('g', { 'class': 'cell', role: 'button', tabindex: i === 0 ? '0' : '-1' }, svg);
      tiles.push(el('rect', { x: x + 6, y: y + 6, width: 88, height: 88, rx: 12, 'class': 'tile' }, g));
      el('circle', { cx: x + 50, cy: y + 50, r: 46, 'class': 'halo' }, g);
      el('circle', { cx: x + 50, cy: y + 50, r: 28, 'class': 'bulb' }, g);
      el('ellipse', { cx: x + 41, cy: y + 39, rx: 9, ry: 6, 'class': 'shine' }, g);
      rings.push(el('rect', { x: x + 6, y: y + 6, width: 88, height: 88, rx: 12, 'class': 'will-ring' }, g));
      cells.push(g);
      (function (idx) {
        g.addEventListener('click', function () { focusIdx = idx; setRoving(); press(idx); });
        g.addEventListener('mouseenter', function () { preview(idx); });
        g.addEventListener('mouseleave', clearPreview);
        g.addEventListener('focus', function () { preview(idx); });
        g.addEventListener('blur', clearPreview);
        g.addEventListener('keydown', function (e) { keyNav(e, idx); });
      })(i);
    }
    guideLayer = el('g', { 'class': 'guide-layer', 'aria-hidden': 'true' }, svg);
  }

  // Algorithm-step highlight: a pulsing ring on every valid press (any order works), each with
  // an arrow from the light it chases. Drawn on a layer above the cells; ignores the pointer.
  var guideLayer = null;
  function drawGuide(cellsToRing, from) {
    while (guideLayer.firstChild) guideLayer.removeChild(guideLayer.firstChild);
    cellsToRing.forEach(function (i, k) {
      var x = (i % N) * 100, y = Math.floor(i / N) * 100;
      var g = el('g', { 'class': 'guide' }, guideLayer);
      el('rect', { x: x + 13, y: y + 13, width: 74, height: 74, rx: 9, 'class': 'guide-case' }, g);
      el('rect', { x: x + 13, y: y + 13, width: 74, height: 74, rx: 9, 'class': 'guide-ring' }, g);
      var src = from && from[k];
      if (src != null) {
        var cx = x + 50, y0 = Math.floor(src / N) * 100 + 80, tip = y + 12;
        el('line', { x1: cx, y1: y0, x2: cx, y2: tip - 8, 'class': 'guide-case' }, g);
        el('line', { x1: cx, y1: y0, x2: cx, y2: tip - 8, 'class': 'guide-arrow' }, g);
        el('polygon', { points: (cx - 8) + ',' + (tip - 11) + ' ' + (cx + 8) + ',' + (tip - 11) + ' ' + cx + ',' + tip, 'class': 'guide-head' }, g);
      }
    });
  }

  var focusIdx = 0;
  function keyNav(e, i) {
    var r = Math.floor(i / N), c = i % N, t = null;
    if (e.key === 'ArrowUp' && r > 0) t = i - N;
    else if (e.key === 'ArrowDown' && r < N - 1) t = i + N;
    else if (e.key === 'ArrowLeft' && c > 0) t = i - 1;
    else if (e.key === 'ArrowRight' && c < N - 1) t = i + 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(i); return; }
    else return;
    e.preventDefault();
    focusIdx = t; setRoving(); cells[t].focus();
  }
  function setRoving() { cells.forEach(function (g, k) { g.setAttribute('tabindex', k === focusIdx ? '0' : '-1'); }); }

  function preview(i) {
    clearPreview();
    if (locked) return;
    neighbors(i).forEach(function (j) { rings[j].classList.add('will'); });
  }
  function clearPreview() { rings.forEach(function (r) { r.classList.remove('will'); }); }

  /* ---------- Game state ---------- */
  var board = emptyBoard(), startBoard = [], moves = 0, locked = true, puzzleFewest = 0;
  var mode = 'practice', practiceLevel = 'easy';
  var running = false, endTime = 0, timer = null, solved = 0, totalMoves = 0, totalFewest = 0;
  // Guided mode and the stuck alert (Practice)
  var algoMethod = 'shortcut', stepper = makeStepper(['shortcut']), curStep = null, prevStep = null;
  var guiding = false, guideStartMoves = 0, guidedPresses = 0, offScript = 0, devSteps = false;
  var stuckShown = false, lowestLit = 0, flatPresses = 0;
  // Tutorial progress (see the Tutorial section)
  var tut = newTut();

  // Rings + arrows on the algorithm's valid presses: guided Practice, tutorial steps that use
  // them (or "Show next step"), and the dev toggle.
  function ringsWanted() {
    if (locked || !curStep || !curStep.cells.length || mode === 'timed') return false;
    if (devSteps) return true;
    if (mode === 'practice') return guiding;
    return !tut.hold && (tut.rings || tut.peek);
  }
  function render() {
    var showRings = ringsWanted();
    for (var i = 0; i < TOTAL; i++) {
      var on = board[i];
      cells[i].classList.toggle('on', on);
      tiles[i].classList.toggle('lit', on);
      var mark = showRings && curStep.cells.indexOf(i) >= 0;
      cells[i].setAttribute('aria-label', 'Row ' + (Math.floor(i / N) + 1) + ', column ' + (i % N + 1) + ', ' + (on ? 'on' : 'off') + (mark ? ', algorithm step' : ''));
      cells[i].setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
    svg.classList.toggle('locked', locked);
    $('pMoves').textContent = moves;
    $('tMoves').textContent = moves;
    $('tSolved').textContent = solved;
    $('tTotal').textContent = totalMoves;
    $('pFewest').textContent = puzzleFewest;
    $('tFewest').textContent = puzzleFewest;
    $('uMoves').textContent = moves;
    $('uFewest').textContent = tut.hideFewest ? '?' : puzzleFewest;
    drawGuide(showRings ? curStep.cells : [], showRings ? stepFrom(curStep) : null);
    $('legendGuide').classList.toggle('show', showRings);
    if (DEV) devRender();
  }
  // Source light for each valid press (null for top-row presses, which chase nothing).
  function stepFrom(st) {
    if (st.phase === 'chase') return st.from;
    var out = st.cells.map(function () { return null; });
    if (st.chase) st.chase.cells.forEach(function (c, k) { out[st.cells.indexOf(c)] = st.chase.from[k]; });
    return out;
  }

  function say(t) { var l = $('live'); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); }
  function msgBox() { return $({ practice: 'pMsg', tutorial: 'uMsg', timed: 'tMsg' }[mode]); }
  function showMsg(html, warn) { var m = msgBox(); m.innerHTML = html; m.classList.toggle('warn', !!warn); m.hidden = false; }
  function hideMsg() { $('pMsg').hidden = true; $('tMsg').hidden = true; $('uMsg').hidden = true; }
  // Narrow screens (panel below the board): a copy of the current step's text right under the
  // board. Hidden from 1000px wide (style.css) and from screen readers (the live region says it).
  function setBoardNote(t, lead) {
    var n = $('boardNote');
    n.textContent = '';
    if (lead) { var b = document.createElement('strong'); b.textContent = lead + ' '; n.appendChild(b); }
    n.appendChild(document.createTextNode(t || ''));
    n.hidden = !t && !lead;
  }

  function loadBoard(b) {
    board = b; startBoard = b.slice(); moves = 0; locked = false;
    puzzleFewest = fewest(b);
    endGuide(); hideStuck(); devStopAll();
    lowestLit = litCount(b); flatPresses = 0;
    stepper.reset(); prevStep = null; curStep = stepper.step(board);
    clearPreview(); render();
  }
  function loadPuzzle(level) {
    loadBoard(scramble(level));
    $('tLevel').textContent = LEVELS[level].label;
  }

  function press(i) {
    if (locked) return;
    if (mode === 'tutorial' && !tutAllows(i)) return;
    var track = mode !== 'timed';
    var ok = track ? stepper.note(board, i) : true;
    applyPress(board, i); moves++;
    clickSound();
    if (track) {
      prevStep = curStep; curStep = stepper.step(board);
      if (mode === 'practice' && guiding) { if (ok) guidedPresses++; else offScript++; }
      if (mode === 'tutorial') tutLog(i, ok);
    }
    clearPreview(); render();
    if (allOff(board)) { onSolved(); return; }
    preview(i);
    if (mode === 'practice') {
      if (guiding) updateGuideText(!ok);
      else checkStuck();
    } else if (mode === 'tutorial') tutAfterPress(ok);
  }

  function onSolved() {
    if (mode === 'tutorial') { locked = true; tut.peek = false; render(); chime(); tutSolved(); return; }
    var wasGuiding = guiding;
    endGuide(); hideStuck();
    locked = true; render(); chime();
    if (mode === 'practice' && wasGuiding) {
      var pure = guideStartMoves === 0 && offScript === 0;
      showMsg('<h2>Solved in ' + moves + ' move' + (moves === 1 ? '' : 's') + '!</h2>' +
        (pure
          ? '<p class="compare">Algorithm: <strong>' + moves + '</strong> moves · Fewest possible: <strong>' + puzzleFewest + '</strong></p>' +
            '<p>Following the algorithm step by step guaranteed a solution' +
            (moves > puzzleFewest ? ', but it took ' + (moves - puzzleFewest) + ' more press' + (moves - puzzleFewest === 1 ? '' : 'es') + ' than the fewest possible. That\'s the cost of certainty: an algorithm always works, but it isn\'t always the shortest path.</p>' : ', and this time it matched the fewest possible.</p>')
          : '<p class="compare">You: <strong>' + moves + '</strong> moves (' + guidedPresses + ' following the algorithm) · Fewest possible: <strong>' + puzzleFewest + '</strong></p>' +
            '<p>The algorithm picked up from the board as it was and still reached a solution. Press <strong>Restart this puzzle</strong> and then <strong>Guide me</strong> to see the algorithm on its own.</p>'));
      say('Solved in ' + moves + ' moves. The fewest possible was ' + puzzleFewest + '.');
    } else if (mode === 'practice') {
      showMsg('<h2>Solved in ' + moves + ' move' + (moves === 1 ? '' : 's') + '!</h2>' +
        '<p class="compare">You: <strong>' + moves + '</strong> · Fewest possible: <strong>' + puzzleFewest + '</strong>' +
        (moves === puzzleFewest ? ' · You matched it!' : '') + '</p>' +
        '<p>Did you rely on hunches and trial and error (a heuristic) or follow a step-by-step procedure (an algorithm)? Press <strong>Restart this puzzle</strong> to try the other way on the same board.</p>');
      say('Solved in ' + moves + ' moves. The fewest possible was ' + puzzleFewest + '.');
    } else {
      solved++; totalMoves += moves; totalFewest += puzzleFewest; render();
      showMsg('<p><strong>Puzzle ' + solved + ' solved in ' + moves + ' move' + (moves === 1 ? '' : 's') +
        '</strong> (fewest possible: ' + puzzleFewest + '). Next puzzle loading.</p>');
      say('Solved. Next puzzle.');
      setTimeout(function () {
        if (running) { var lv = timedLevel(); hideMsg(); loadPuzzle(lv); say('New ' + LEVELS[lv].label.toLowerCase() + ' puzzle.'); }
      }, 900);
    }
  }

  /* ---------- Practice ---------- */
  function newPractice() {
    stuckShown = false;
    hideMsg(); loadPuzzle(practiceLevel);
    say('New ' + LEVELS[practiceLevel].label.toLowerCase() + ' puzzle. ' + litCount(board) + ' lights on.');
  }
  $('newBtn').addEventListener('click', newPractice);
  $('restartBtn').addEventListener('click', function () {
    if (!startBoard.length) return;
    hideMsg(); loadBoard(startBoard.slice());
    say('Puzzle restarted.');
  });
  var diffBtns = Array.prototype.slice.call(document.querySelectorAll('#diffSeg button'));
  diffBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      practiceLevel = btn.getAttribute('data-level');
      diffBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      newPractice();
    });
  });

  /* ---------- Guided mode (Practice) ---------- */
  // Strict algorithm, never optimal play: guidance follows the chase even when a shortcut exists.
  function colList(cols) {
    var n = cols.map(function (c) { return c + 1; });
    return n.length === 1 ? String(n[0]) : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  }
  function chaseText(st) {
    var r = st.row + 1, one = st.cols.length === 1;
    var t = one
      ? 'Row ' + r + ' has a light in column ' + colList(st.cols) + '. Press the cell directly below it (row ' + (r + 1) + ', column ' + colList(st.cols) + ') to turn it off.'
      : 'Row ' + r + ' has lights in columns ' + colList(st.cols) + '. Press the cell directly below each one (in row ' + (r + 1) + '), in any order. Each press turns off the light above it without touching the rest of row ' + r + '.';
    if (st.again && prevStep && prevStep.phase === 'bottom') t = 'Top-row presses done. Now chase the lights down again. ' + t;
    return t;
  }
  function shortcutText(bottom) {
    var rules = [[3, 4], [1, 4], [3]], parts = [], count = {};
    for (var c = 0; c < 3; c++) {
      if (!bottom[c]) continue;
      parts.push('column ' + (c + 1) + ' is on, so press top-row ' + colList(rules[c]));
      rules[c].forEach(function (t) { count[t] = (count[t] || 0) + 1; });
    }
    var t = 'Shortcut (it looks only at columns 1 to 3 of the bottom row): ' + parts.join('; ') + '.', cancel = false;
    // A top-row cell can come up at most twice (5 in columns 1 and 2, 4 in columns 1 and 3).
    var twice = Object.keys(count).filter(function (k) { return count[k] === 2; }).map(Number);
    if (twice.length) {
      cancel = true;
      t += twice.length === 1
        ? ' Top-row ' + colList(twice) + ' comes up twice, so skip it: two presses cancel.'
        : ' Top-row ' + colList(twice) + ' each come up twice, so skip them: two presses cancel.';
    }
    // One rule and nothing cancels: the rule already names the presses.
    if (parts.length === 1 && !cancel) return t.slice(0, -1) + (Object.keys(count).length > 1 ? ', in any order.' : '.');
    return t + ' ' + pressText(Object.keys(count).filter(function (k) { return count[k] % 2; }).map(Number).sort());
  }
  function pressText(cells) {
    return 'Press top-row ' + colList(cells) + (cells.length > 1 ? ', in any order.' : '.');
  }
  function guideText(st) {
    if (st.phase === 'chase') return chaseText(st);
    if (st.phase !== 'bottom') return '';
    var tops = st.cells.filter(function (c) { return c < N; });
    if (st.fresh) {
      var bottom = bottomOf(board), lit = [];
      bottom.forEach(function (on, c) { if (on) lit.push(c); });
      var t = 'Rows 1 to 4 are dark, but row 5 still has ' + (lit.length === 1 ? 'a light in column ' : 'lights in columns ') + colList(lit) +
        '. The chase can\'t go further, because there\'s no row below, so fix it from the top. ';
      t += algoMethod === 'lookup'
        ? 'Full lookup: the bottom-row pattern ' + lit.map(function (c) { return c + 1; }).join(', ') + ' is in the table. ' + pressText(tops)
        : shortcutText(bottom);
      return t + ' Then chase the lights down again.';
    }
    return 'Keep going with the top row. ' + pressText(tops) + ' Then chase the lights down again.';
  }
  function updateGuideText(off) {
    var note = $('guideNote');
    note.hidden = !off;
    var text = guideText(curStep);
    $('guideText').textContent = text;
    setBoardNote(text, off ? 'That wasn\'t one of the algorithm\'s steps.' : '');
    say((off ? 'That wasn\'t one of the algorithm\'s steps. ' : '') + text);
  }
  function startGuide() {
    if (locked || mode !== 'practice') return;
    hideStuck(); hideMsg();
    guiding = true; guideStartMoves = moves; guidedPresses = 0; offScript = 0;
    stepper.reset(); prevStep = null; curStep = stepper.step(board);
    $('guideBtn').hidden = true;
    $('guideCard').hidden = false;
    render();
    updateGuideText(false);
  }
  function endGuide() {
    if (guiding) setBoardNote('');
    guiding = false;
    $('guideBtn').hidden = false;
    $('guideCard').hidden = true;
    $('guideNote').hidden = true;
  }
  $('guideBtn').addEventListener('click', startGuide);
  $('stopGuide').addEventListener('click', function () { endGuide(); render(); say('Guidance off.'); $('guideBtn').focus(); });
  $('algoSel').addEventListener('change', function () {
    setAlgorithm(this.value);
    if (guiding) { stepper.reset(); prevStep = null; curStep = stepper.step(board); render(); updateGuideText(false); }
  });
  function setAlgorithm(m) {
    algoMethod = m === 'lookup' ? 'lookup' : 'shortcut';
    $('algoSel').value = algoMethod;
    $('tutAlgo').value = algoMethod;
    stepper = makeStepper([algoMethod]);
    curStep = stepper.step(board); prevStep = null;
    render();
  }

  /* ---------- Stuck alert (Practice) ---------- */
  function checkStuck() {
    var n = litCount(board);
    if (n < lowestLit) { lowestLit = n; flatPresses = 0; } else flatPresses++;
    if (stuckShown) return;
    if (moves >= puzzleFewest + STUCK_EXTRA_MOVES || flatPresses >= STUCK_FLAT_PRESSES) {
      stuckShown = true;
      $('stuckMsg').hidden = false;
      $('guideBtn').hidden = true; // the alert has its own Guide me button
      say('Stuck? Hunches are fast but don\'t always work. An algorithm always does.');
    }
  }
  function hideStuck() { $('stuckMsg').hidden = true; if (!guiding) $('guideBtn').hidden = false; }
  $('stuckGuide').addEventListener('click', startGuide);
  $('stuckKeep').addEventListener('click', function () { hideStuck(); say('Keep trying.'); });

  /* ---------- Tutorial (7 steps; the panel drives, the board is on the left) ---------- */
  var TUT_TITLES = ['Two ways to solve a problem', 'The chase', 'The bottom row', 'Practice with less help',
    'Solve this one', 'Heuristic or algorithm?', 'Wrap-up'];
  var STEP4 = [
    { help: 'rings', title: 'Board 1 of 3: rings and directions', intro: 'Follow the rings and the directions, as before.' },
    { help: 'text', title: 'Board 2 of 3: directions only', intro: 'No rings this time. Read the directions and find the cells yourself.' },
    { help: 'none', title: 'Board 3 of 3: on your own', intro: 'No help this time: run the algorithm from memory. If you get stuck, press <strong>Show next step</strong>.' }
  ];
  var NOTE_STRICT = 'That isn\'t one of the algorithm\'s steps. Press one of the ringed cells.';
  var NOTE_OFF = 'That wasn\'t one of the algorithm\'s steps. No problem: the algorithm works from any board.';
  function newTut() {
    return {
      step: 1, done: {},
      hold: false,       // presses ignored (step 3 while choosing an algorithm)
      strict: false,     // only the algorithm's steps count (steps 2–3); other presses are ignored
      rings: false, text: false, peek: false, hideFewest: false,
      good: 0, off: 0,   // algorithm steps / other presses on the current board
      s3: 'chase',       // step 3: 'chase' → 'choose' → 'fix'
      s4: 0,             // step 4: board 0–2
      log: [],           // presses on the current board (steps 5–6)
      mental: null,      // step 5, first solve: { moves, matched, label }
      mentalTries: 0,
      ch: null           // step 6: { order, boards, results, t0 }
    };
  }
  function setBody(html) { $('tutBody').innerHTML = html; }
  function setExtra(html) { $('tutExtra').innerHTML = html; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // The guide card (step text for the current press) and its copy under the board.
  function tutGuideRefresh(note) {
    var show = (tut.text || tut.peek) && !tut.hold && !locked && curStep && curStep.phase !== 'done';
    var noteText = note === 'strict' ? NOTE_STRICT : note === 'off' ? NOTE_OFF : '';
    $('tutGuide').hidden = !show;
    $('tutNote').hidden = !noteText;
    $('tutNote').textContent = noteText;
    if (!show) { if (noteText) say(noteText); return; }
    var t = guideText(curStep);
    $('tutGuideText').textContent = t;
    setBoardNote(t, noteText);
    say((noteText ? noteText + ' ' : '') + t);
  }
  function tutAllows(i) {
    if (tut.hold) { say('Choose an algorithm in the panel first.'); return false; }
    if (tut.strict && curStep && curStep.cells.indexOf(i) < 0) { tutGuideRefresh('strict'); return false; }
    return true;
  }
  function tutLog(i, ok) {
    if (ok) tut.good++; else tut.off++;
    tut.log.push(i);
  }
  function tutAfterPress(ok) {
    if (tut.step === 2) tutGuideRefresh(null);
    else if (tut.step === 3) {
      if (tut.s3 === 'chase' && curStep.phase === 'bottom') tutChoose();
      else tutGuideRefresh(null);
    } else if (tut.step === 4) {
      var wasPeek = tut.peek;
      tut.peek = false;
      if (wasPeek) render();
      if (tut.text) tutGuideRefresh(ok ? null : 'off');
      else { $('tutGuide').hidden = true; setBoardNote(STEP4[tut.s4].title + '. Run the algorithm on your own.'); }
    }
  }
  function compareLine(pure) {
    return pure
      ? '<p class="compare">Algorithm: <strong>' + moves + '</strong> moves · Fewest possible: <strong>' + puzzleFewest + '</strong></p>'
      : '<p class="compare">You: <strong>' + moves + '</strong> moves (' + tut.good + ' following the algorithm) · Fewest possible: <strong>' + puzzleFewest + '</strong></p>';
  }
  function tutLoad(b) {
    tut.good = 0; tut.off = 0; tut.log = []; tut.peek = false;
    loadBoard(b);
  }

  // Reference card for the chosen method (step 3 after the choice, step 4).
  function refHtml(method) {
    var rows;
    if (method === 'lookup') {
      rows = Object.keys(LOOKUP).sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); })
        .map(function (k) { return '<tr><td>' + k.split(',').join(', ') + '</td><td>' + LOOKUP[k].join(', ') + '</td></tr>'; }).join('');
      return '<p><strong>Chase + full lookup.</strong> Find the exact bottom-row pattern and press the listed top-row cells, then chase again.</p>' +
        '<table class="tut-table"><thead><tr><th>Bottom-row lights on</th><th>Press in top row</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    return '<p><strong>Chase + shortcut.</strong> Look only at columns 1, 2 and 3 of the bottom row. For each one that\'s on, press the matching top-row cells, then chase again.</p>' +
      '<table class="tut-table"><thead><tr><th>Bottom-row light on</th><th>Press in top row</th></tr></thead><tbody>' +
      '<tr><td>Column 1</td><td>4, 5</td></tr><tr><td>Column 2</td><td>2, 5</td></tr><tr><td>Column 3</td><td>4</td></tr></tbody></table>' +
      '<p class="hint">If a top-row cell comes up twice, skip it: two presses cancel.</p>';
  }
  function refDetails(method) {
    return '<details class="card strategy ref"><summary>Algorithm reference</summary>' +
      '<p>1. Chase: in the highest row with lights on, press the cell directly below each light. Repeat down to row 4.</p>' +
      '<p>2. Fix the bottom row from the top (below), then 3. chase again.</p>' + refHtml(method) + '</details>';
  }

  /* Step set-ups */
  var STEPS = {
    1: function () {
      setBody('<p>Psychologists describe two broad ways of solving problems.</p>' +
        '<p>An <strong>algorithm</strong> is a step-by-step procedure that works through a problem systematically until it reaches the correct solution. Follow it exactly and it is guaranteed to work, though it can take a long time.</p>' +
        '<p>A <strong>heuristic</strong> is a mental shortcut: a hunch, a rule of thumb, spotting a pattern, or trial and error. Heuristics are often faster, but they can lead to errors and dead ends.</p>' +
        '<p>In Practice you probably used heuristics: you looked for patterns and tried presses to see what happened. Next you\'ll learn an algorithm that solves every Lights Off puzzle.</p>');
      tutLoad(boardFrom(TUT_BOARD_CHASE));
      locked = true; render();
    },
    2: function () {
      setBody('<p>The algorithm starts by <strong>chasing</strong> the lights down the board, one row at a time. A press turns off the light directly above it. So for each light in the highest lit row, press the cell directly below it. Then do the same for the next row, all the way down.</p>' +
        '<p class="hint">Follow the rings. Each arrow shows which light that press turns off.</p>');
      tut.strict = true; tut.rings = true; tut.text = true;
      tutLoad(boardFrom(TUT_BOARD_CHASE));
      tutGuideRefresh(null);
    },
    3: function () {
      setBody('<p>This board needs the second part of the algorithm. Start with the chase, following the rings, and see what happens at the bottom.</p>');
      tut.strict = true; tut.rings = true; tut.text = true; tut.s3 = 'chase';
      tutLoad(boardFrom(TUT_BOARD_BOTTOM));
      tutGuideRefresh(null);
    },
    4: function () { tutLoad4(0); },
    5: function () {
      setBody('<p>Solve this one.</p>');
      tut.hideFewest = true;
      tutLoad(boardFrom(MENTAL_SET_PRESSES));
      setBoardNote('Solve this one.');
    },
    6: function () {
      if (!tut.ch) tut.ch = { order: shuffle(CHALLENGE_LEVELS, chRand), boards: [], results: [], t0: 0 };
      if (tut.ch.results.length >= CHALLENGE_LEVELS.length) chSummary();
      else chLoad(tut.ch.results.length);
    },
    7: function () {
      setBody(wrapHtml());
      setExtra('<div class="row"><button class="btn" type="button" data-act="go-practice">Go to Practice</button>' +
        '<button class="btn alt" type="button" data-act="restart-tut">Restart tutorial</button></div>');
      tutLoad(emptyBoard());
      locked = true; render();
    }
  };
  function tutShow(n) {
    devStopAll(); hideMsg(); setExtra(''); setBoardNote('');
    $('tutGuide').hidden = true; $('tutNote').hidden = true;
    tut.step = n; tut.hold = false; tut.strict = false; tut.rings = false; tut.text = false;
    tut.peek = false; tut.hideFewest = false;
    $('tutCount').textContent = 'Step ' + n + ' of 7';
    $('tutTitle').textContent = TUT_TITLES[n - 1];
    $('tutAlgoRow').hidden = n !== 4;
    stepper = makeStepper(n === 6 ? ['shortcut', 'lookup'] : [algoMethod]);
    STEPS[n]();
    tutNav();
  }
  function tutNav() {
    var n = tut.step, summary = n === 6 && tut.ch && tut.ch.results.length >= CHALLENGE_LEVELS.length;
    $('tutBack').disabled = n === 1;
    $('tutNext').hidden = n === 7;
    $('tutNext').disabled = !(n === 1 || tut.done[n]);
    $('tutNext').textContent = n === 6 ? 'Next: wrap-up' : 'Next step';
    $('tutRestart').hidden = n === 1 || n === 7 || summary;
    $('tutStats').hidden = n === 1 || n === 7 || summary;
  }
  function tutGo(n) {
    tutShow(n);
    say('Step ' + n + ' of 7: ' + TUT_TITLES[n - 1] + '.');
    $('tutTitle').focus({ preventScroll: true });
    // Narrow screens: the panel is below the board. Show the board for steps with one to press,
    // the panel for reading steps.
    if (window.innerWidth < 1000) {
      var reading = n === 1 || n === 7 || (n === 6 && $('tutStats').hidden);
      (reading ? $('tutCount') : svg).scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }
  function reducedMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function finishMsg(html) {
    showMsg(html);
    setBoardNote('Solved! Your result is in the panel below.');
    tutNav();
    var btn = $('uMsg').querySelector('[data-act]') || (!$('tutNext').disabled && !$('tutNext').hidden ? $('tutNext') : null);
    if (btn) btn.focus({ preventScroll: true });
  }

  // Step 3: the chase has stopped; ask which way to fix the bottom row.
  function tutChoose() {
    tut.s3 = 'choose'; tut.hold = true;
    render();
    $('tutGuide').hidden = true;
    setExtra('<div class="card choose-card">' +
      '<p>Rows 1 to 4 are dark, but row 5 still has lights. The chase can\'t continue, because there\'s no row below to press. The algorithm fixes this from the top: press certain top-row cells, then chase again. Which cells depends on the pattern in row 5, and there are two ways to look them up.</p>' +
      '<button class="btn alt choice" type="button" data-act="choose" data-method="shortcut"><span class="choice-name">Chase + shortcut <span class="tag">Recommended</span></span>' +
      '<span class="choice-sub">Three rules for columns 1 to 3. Easier to remember; sometimes takes more presses.</span></button>' +
      '<button class="btn alt choice" type="button" data-act="choose" data-method="lookup"><span class="choice-name">Chase + full lookup</span>' +
      '<span class="choice-sub">Find the exact pattern in a table of 7. More to remember; never more presses, and sometimes fewer.</span></button>' +
      '<p class="hint">Both are algorithms: either one always works. You can change your choice later.</p></div>');
    setBoardNote('Rows 1 to 4 are dark, but row 5 isn\'t. Choose how to fix it in the panel below.');
    say('Rows 1 to 4 are dark, but row 5 still has lights. Choose an algorithm for the bottom row: Chase plus shortcut, recommended, or Chase plus full lookup.');
    var first = $('tutExtra').querySelector('.choice');
    if (first) first.focus({ preventScroll: true });
  }
  function tutChosen(method) {
    setAlgorithm(method);           // also the default for Practice's Guide me
    tut.hold = false; tut.s3 = 'fix';
    setExtra('<div class="card ref-card">' + refHtml(method) + '</div>');
    render();
    tutGuideRefresh(null);
    if (curStep.cells.length) { focusIdx = curStep.cells[0]; focusBoard(); }
  }

  // Step 4: three boards with fading support; each needs the bottom-row fix.
  function needsFix(b) { var x = b.slice(); chase(x); return !allOff(x); }
  function tutLoad4(k) {
    var cfg = STEP4[k], b;
    tut.s4 = k;
    tut.rings = cfg.help === 'rings'; tut.text = cfg.help !== 'none'; tut.strict = false;
    setBody('<p>Three boards, with less help each time. They use the algorithm you chose; you can change it below.</p>' +
      '<p class="tut-sub">' + cfg.title + '</p><p>' + cfg.intro + '</p>');
    setExtra((cfg.help === 'none' ? '<div class="row"><button class="btn alt" type="button" data-act="peek">Show next step</button></div>' : '') +
      refDetails(algoMethod));
    do { b = scramble('medium'); } while (!needsFix(b));
    hideMsg();
    tutLoad(b);
    if (tut.text) tutGuideRefresh(null);
    else { $('tutGuide').hidden = true; setBoardNote(cfg.title + '. Run the algorithm on your own.'); }
  }

  // Step 6: the "Heuristic or algorithm?" challenge.
  function shuffle(a, rng) {
    a = a.slice(); rng = rng || rand;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // Only boards the two approaches can be told apart on (algorithm ≥ fewest + QUALIFY_GAP).
  function qualifyingBoard(level) {
    var b;
    do { b = scramble(level, chRand); } while (algorithmMoves(b, algoMethod) < fewest(b) + QUALIFY_GAP);
    return b;
  }
  function chLoad(k) {
    var ch = tut.ch, level = ch.order[k];
    if (!ch.boards[k]) ch.boards[k] = qualifyingBoard(level);
    setBody('<p>Six puzzles, 3 easy and 3 medium. <strong>Solve each one however you like.</strong> Afterward, the game works out which approach you used.</p>' +
      '<p class="tut-sub">Puzzle ' + (k + 1) + ' of 6 · ' + LEVELS[level].label + '</p>');
    hideMsg();
    tutLoad(ch.boards[k].slice());
    ch.t0 = Date.now();
    setBoardNote('Puzzle ' + (k + 1) + ' of 6 (' + LEVELS[level].label.toLowerCase() + '). Solve it however you like.');
  }
  function chRecord(level, start, presses, seconds) {
    var f = fewest(start), c = classify(start, presses, f);
    return {
      level: level, presses: presses.slice(), moves: presses.length, fewest: f,
      algoMoves: algorithmMoves(start, algoMethod), seconds: seconds, label: c.label, evidence: c.evidence
    };
  }
  function chSolved() {
    var ch = tut.ch, k = ch.results.length, r = chRecord(ch.order[k], startBoard, tut.log, (Date.now() - ch.t0) / 1000);
    ch.results.push(r);
    var last = ch.results.length >= CHALLENGE_LEVELS.length;
    finishMsg('<h2>Puzzle ' + (k + 1) + ': ' + APPROACH[r.label] + '</h2><p>' + esc(r.evidence) + '</p>' +
      '<p class="compare">Moves: <strong>' + r.moves + '</strong> · Fewest possible: <strong>' + r.fewest + '</strong></p>' +
      '<div class="row"><button class="btn alt" type="button" data-act="' + (last ? 'ch-summary' : 'ch-next') + '">' +
      (last ? 'See your results' : 'Next puzzle') + '</button></div>');
    say('Puzzle ' + (k + 1) + ': ' + APPROACH[r.label] + '. ' + r.evidence);
  }
  function fmtNum(x) { return (Math.round(x * 10) / 10).toString(); }
  function avg(list, key) { return list.reduce(function (s, r) { return s + r[key]; }, 0) / list.length; }
  var APPROACH_PHRASE = { heuristic: 'heuristics', algorithm: 'the algorithm', 'switch': 'a heuristic, then the algorithm', trial: 'trial and error' };
  function takeaways(results) {
    var lines = [];
    ['easy', 'medium'].forEach(function (lv) {
      var rs = results.filter(function (r) { return r.level === lv; });
      if (!rs.length) return;
      var counts = {}, top = null;
      rs.forEach(function (r) { counts[r.label] = (counts[r.label] || 0) + 1; });
      Object.keys(counts).forEach(function (k) { if (!top || counts[k] > counts[top]) top = k; });
      var stats = ' and averaged ' + fmtNum(avg(rs, 'moves')) + ' moves (fewest possible ' + fmtNum(avg(rs, 'fewest')) + ') in ' + Math.round(avg(rs, 'seconds')) + ' s.';
      var head = 'On ' + lv + ' puzzles you ';
      if (counts[top] === rs.length) lines.push(head + 'used ' + APPROACH_PHRASE[top] + ' every time' + stats);
      else if (counts[top] > rs.length / 2) lines.push(head + 'mostly used ' + APPROACH_PHRASE[top] + ' (' + counts[top] + ' of ' + rs.length + ')' + stats);
      else lines.push(head + 'mixed approaches (' + Object.keys(counts).map(function (k) { return APPROACH[k] + ' ' + counts[k]; }).join(', ') + ')' + stats);
    });
    var heur = results.filter(function (r) { return r.label === 'heuristic'; });
    var alg = results.filter(function (r) { return r.label === 'algorithm' || r.label === 'switch'; });
    if (heur.length) lines.push('When a heuristic worked, it took ' + fmtNum(avg(heur, 'moves')) + ' moves on average, close to the fewest possible (' + fmtNum(avg(heur, 'fewest')) + ').');
    if (alg.length) lines.push('When you used the algorithm, it took ' + fmtNum(avg(alg, 'moves')) + ' moves on average (fewest possible ' + fmtNum(avg(alg, 'fewest')) + '), but it worked every time.');
    if (!alg.length) lines.push('You never used the algorithm here. Try it in Practice with <strong>Guide me (algorithm)</strong>, on a hard puzzle.');
    if (!heur.length) lines.push('You never solved a puzzle with a heuristic alone. On easy puzzles, look at the shapes first: each plus sign (or part of one at an edge) is a single press.');
    return lines;
  }
  function resultsTable(results) {
    return '<div class="table-wrap"><table class="tut-table"><thead><tr><th>Puzzle</th><th>Level</th><th>Approach</th><th>Moves / Fewest</th><th>Time</th></tr></thead><tbody>' +
      results.map(function (r, k) {
        return '<tr><td>' + (k + 1) + '</td><td>' + LEVELS[r.level].label + '</td><td>' + APPROACH[r.label] + '</td><td>' +
          r.moves + ' / ' + r.fewest + '</td><td>' + Math.round(r.seconds) + ' s</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function chSummary() {
    var rs = tut.ch.results;
    tut.done[6] = true;
    hideMsg();
    setBody('<p>Here\'s how you solved the six puzzles.</p>' + resultsTable(rs) +
      takeaways(rs).map(function (l) { return '<p>' + l + '</p>'; }).join('') +
      '<p><strong>Heuristics shine when the pattern is visible. Algorithms are worth the effort when it isn\'t. Good problem solvers pick the tool that fits the problem.</strong></p>');
    tutLoad(emptyBoard());
    locked = true; render();
    setBoardNote('');
    tutNav();
  }

  // Step 7: wrap-up.
  function wrapHtml() {
    var html = '<div class="table-wrap"><table class="tut-table compare-table"><thead><tr><th></th><th>Algorithm</th><th>Heuristic</th></tr></thead><tbody>' +
      '<tr><th>Guaranteed to work?</th><td>Yes, if you follow every step</td><td>No: it can stall or fail</td></tr>' +
      '<tr><th>Effort</th><td>Many steps to follow and remember</td><td>Little, once you spot the pattern</td></tr>' +
      '<tr><th>Speed</th><td>Often slower, with more moves</td><td>Often faster, with fewer moves</td></tr>' +
      '<tr><th>Watch out for</th><td>Taking the long way around when a shortcut is right there (mental set)</td><td>Dead ends when the pattern is hidden</td></tr>' +
      '</tbody></table></div><h3>Your numbers</h3>';
    var m = tut.mental, algoN = algorithmMoves(boardFrom(MENTAL_SET_PRESSES), algoMethod);
    html += m
      ? '<p>Mental set board: you solved it in ' + plural(m.moves, 'move') + '; the fewest possible was 3, and the algorithm takes ' + algoN + '. ' +
        (m.matched ? 'You spotted the shortcut.' : 'It\'s easy to keep using a method that worked before.') + '</p>'
      : '<p>Mental set board: not solved yet (step 5).</p>';
    var rs = tut.ch ? tut.ch.results : [];
    if (rs.length) {
      var counts = {};
      rs.forEach(function (r) { counts[r.label] = (counts[r.label] || 0) + 1; });
      html += '<p>Challenge: ' + Object.keys(APPROACH).filter(function (k) { return counts[k]; })
        .map(function (k) { return APPROACH[k] + ' ' + counts[k]; }).join(' · ') + ' (' + rs.length + ' puzzles). ';
      var heur = rs.filter(function (r) { return r.label === 'heuristic'; });
      var alg = rs.filter(function (r) { return r.label === 'algorithm' || r.label === 'switch'; });
      if (heur.length) html += 'Heuristic puzzles averaged ' + fmtNum(avg(heur, 'moves')) + ' moves. ';
      if (alg.length) html += 'Algorithm puzzles averaged ' + fmtNum(avg(alg, 'moves')) + ' moves.';
      html += '</p>';
    } else html += '<p>Challenge: not finished yet (step 6).</p>';
    html += '<p>One more algorithm: the <strong>Fewest possible</strong> number comes from the computer trying all 32 ways to press the top row, chasing each one, and keeping the shortest. That\'s an algorithm in the textbook sense, attempting all possible solutions until the correct one is found, but not one a person can run in their head.</p>';
    return html;
  }

  // After a tutorial board is solved.
  function tutSolved() {
    var n = tut.step;
    if (n === 2) {
      tut.done[2] = true;
      finishMsg('<h2>Solved by chasing!</h2>' + compareLine(true) +
        '<p>On this board the chase alone turned every light off. On most boards it leaves lights in the bottom row. The next step shows how to fix that.</p>');
    } else if (n === 3) {
      tut.done[3] = true;
      var extra = moves - puzzleFewest;
      finishMsg('<h2>Solved!</h2>' + compareLine(true) +
        '<p>The algorithm guaranteed a solution, but it took ' + plural(extra, 'more press') + ' than the fewest possible. That\'s the trade-off: an algorithm always works, but it isn\'t always the shortest path.</p>');
    } else if (n === 4) {
      var last = tut.s4 >= 2;
      if (last) tut.done[4] = true;
      finishMsg('<h2>Board ' + (tut.s4 + 1) + ' of 3 solved!</h2>' + compareLine(tut.off === 0) +
        (last ? '<p>That\'s the whole algorithm: chase down, fix the bottom row from the top, chase again. Follow it exactly and it works on every board.</p>'
          : '<div class="row"><button class="btn alt" type="button" data-act="next-board">Next board</button></div>'));
    } else if (n === 5) {
      tut.hideFewest = false; render();
      tut.mentalTries++;
      var matched = moves === puzzleFewest, c = classify(startBoard, tut.log, puzzleFewest);
      var algoN = algorithmMoves(startBoard, algoMethod);
      if (!tut.mental) tut.mental = { moves: moves, matched: matched, label: c.label };
      tut.done[5] = true;
      if (matched) {
        finishMsg('<h2>Solved in 3 moves!</h2><p class="compare">You: <strong>3</strong> · Fewest possible: <strong>3</strong></p>' +
          '<p>' + (tut.mentalTries > 1 ? 'This time you' : 'You') + ' spotted the shapes: a T and a corner along the top row, and a plus sign below. Running the algorithm here takes ' + algoN + ' presses.</p>' +
          '<p>After a method has worked, people tend to keep using it, even when a simpler solution is right in front of them. That\'s called <strong>mental set</strong>. ' +
          (tut.mentalTries > 1 ? 'Looking again before reaching for the algorithm is how to break it.' : 'You avoided it.') + '</p>');
      } else {
        var usedAlgo = c.label === 'algorithm' || c.label === 'switch';
        finishMsg('<h2>Solved in ' + plural(moves, 'move') + '</h2><p class="compare">You: <strong>' + moves + '</strong> · Fewest possible: <strong>3</strong></p>' +
          '<p>' + (usedAlgo ? 'You used the algorithm, and it worked, as it always does. But this board has a 3-press solution.' : 'This board has a 3-press solution.') + '</p>' +
          '<p>The algorithm always works, but it isn\'t always the easiest path. Using a method because it worked before is called <strong>mental set</strong>. Before running an algorithm, look for a shortcut.</p>' +
          '<p class="hint">Hint: look for shapes that a single press makes.</p>' +
          '<div class="row"><button class="btn alt" type="button" data-act="retry">Try this board again</button></div>');
      }
    } else if (n === 6) {
      chSolved();
    }
  }

  $('tutNext').addEventListener('click', function () { if (tut.step < 7) tutGo(tut.step + 1); });
  $('tutBack').addEventListener('click', function () { if (tut.step > 1) tutGo(tut.step - 1); });
  $('tutRestart').addEventListener('click', function () {
    var n = tut.step;
    hideMsg(); setExtra(''); $('tutGuide').hidden = true;
    if (n === 4) { tutRestartBoard(); return; }
    if (n === 6) { chLoad(tut.ch.results.length); tutNav(); say('Puzzle restarted.'); return; }
    tutShow(n);
    say('Board restarted.');
  });
  function tutRestartBoard() {
    // Step 4: same board, same help level.
    var k = tut.s4, b = startBoard.slice();
    tutLoad4(k);
    tutLoad(b);
    if (tut.text) tutGuideRefresh(null);
    say('Board restarted.');
  }
  $('tutAlgo').addEventListener('change', function () {
    setAlgorithm(this.value);
    if (mode === 'tutorial' && tut.step === 4) {
      var d = $('tutExtra').querySelector('details.ref');
      if (d) { var open = d.open; d.outerHTML = refDetails(algoMethod); if (open) $('tutExtra').querySelector('details.ref').open = true; }
      tutGuideRefresh(null);
    }
  });
  $('panelTutorial').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'choose') tutChosen(b.getAttribute('data-method'));
    else if (act === 'next-board') { tutLoad4(tut.s4 + 1); tutNav(); say(STEP4[tut.s4].title + '.'); focusBoard(); }
    else if (act === 'peek') { if (!locked) { tut.peek = true; render(); tutGuideRefresh(null); } }
    else if (act === 'retry') { hideMsg(); tutShow(5); say('Try the board again.'); focusBoard(); }
    else if (act === 'ch-next') { chLoad(tut.ch.results.length); tutNav(); say('Puzzle ' + (tut.ch.results.length + 1) + ' of 6.'); focusBoard(); }
    else if (act === 'ch-summary') { chSummary(); say('Your results.'); $('tutTitle').focus({ preventScroll: true }); }
    else if (act === 'go-practice') { setMode('practice'); say('Practice mode.'); }
    else if (act === 'restart-tut') { tut = newTut(); tutGo(1); }
  });
  // Keyboard users go back to the board for the next one; narrow screens scroll up to it.
  function focusBoard() {
    setRoving(); cells[focusIdx].focus({ preventScroll: true });
    if (window.innerWidth < 1000) svg.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  /* ---------- Timed ---------- */
  function timedLevel() { return solved < 3 ? 'easy' : (solved < 6 ? 'medium' : 'hard'); }
  function secondsLeft() { return Math.max(0, Math.ceil((endTime - Date.now()) / 1000)); }
  function tick() {
    $('tTime').textContent = secondsLeft();
    if (Date.now() >= endTime) endRound();
  }
  $('startBtn').addEventListener('click', function () {
    solved = 0; totalMoves = 0; totalFewest = 0; running = true; hideMsg();
    endTime = Date.now() + ROUND * 1000;
    $('startBtn').hidden = true;
    loadPuzzle(timedLevel()); tick();
    timer = setInterval(tick, 200);
    say('Round started. 90 seconds.');
  });
  function endRound() {
    clearInterval(timer); running = false; locked = true;
    endTone();
    var avg = solved ? (totalMoves / solved).toFixed(1) : 'none';
    render();
    $('tTime').textContent = '0';
    showMsg('<h2>Time is up!</h2><p>Puzzles solved: <strong>' + solved + '</strong>. Moves on solved puzzles: <strong>' + totalMoves +
      '</strong>. Average moves per solved puzzle: <strong>' + avg + '</strong>.</p>' +
      (solved ? '<p class="compare">Your moves: <strong>' + totalMoves + '</strong> · Fewest possible for those puzzles: <strong>' + totalFewest + '</strong></p>' : '') +
      '<p>Which approach did you use under time pressure, and did it change as the clock ran down?</p>');
    $('startBtn').textContent = 'Play again';
    $('startBtn').hidden = false;
    say('Time is up. You solved ' + solved + ' puzzles.');
  }

  /* ---------- Modes ---------- */
  function setMode(m) {
    clearInterval(timer); running = false; devStopAll();
    mode = m;
    hideMsg(); clearPreview(); endGuide(); hideStuck(); stuckShown = false; setBoardNote('');
    tut.hideFewest = false;
    stepper = makeStepper([algoMethod]);
    $('modeTutorial').setAttribute('aria-pressed', m === 'tutorial' ? 'true' : 'false');
    $('modePractice').setAttribute('aria-pressed', m === 'practice' ? 'true' : 'false');
    $('modeTimed').setAttribute('aria-pressed', m === 'timed' ? 'true' : 'false');
    $('panelTutorial').hidden = m !== 'tutorial';
    $('panelPractice').hidden = m !== 'practice';
    $('panelTimed').hidden = m !== 'timed';
    if (m === 'tutorial') {
      tutShow(tut.step);
    } else if (m === 'practice') {
      loadPuzzle(practiceLevel);
    } else {
      solved = 0; totalMoves = 0; totalFewest = 0; moves = 0;
      board = scramble('easy'); startBoard = board.slice(); locked = true; puzzleFewest = fewest(board);
      $('tLevel').textContent = LEVELS.easy.label;
      $('tTime').textContent = ROUND;
      $('startBtn').textContent = 'Start timed round';
      $('startBtn').hidden = false;
      render();
      showMsg('<p>Solve as many puzzles as you can in 90 seconds. The first 3 are easy, the next 3 medium, and the rest hard. Each solved puzzle is replaced by a new one. Press <strong>Start timed round</strong> when ready.</p>');
    }
  }
  $('modeTutorial').addEventListener('click', function () { if (mode !== 'tutorial') { setMode('tutorial'); say('Tutorial.'); } });
  $('modePractice').addEventListener('click', function () { if (mode !== 'practice') { setMode('practice'); say('Practice mode.'); } });
  $('tutLink').addEventListener('click', function () { setMode('tutorial'); say('Tutorial.'); $('tutTitle').focus({ preventScroll: true }); });
  $('modeTimed').addEventListener('click', function () { if (mode !== 'timed') { setMode('timed'); say('Timed mode.'); } });

  /* ---------- Sound toggle ---------- */
  $('soundBtn').addEventListener('click', function () {
    soundOn = !soundOn;
    this.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    this.textContent = 'Sound: ' + (soundOn ? 'On' : 'Off');
    if (soundOn) clickSound();
  });

  /* ---------- Light color ---------- */
  // Presets use the hand-tuned colors in style.css (body.glow-blue swaps them in).
  // A custom color sets the five glow variables inline on <body>, all derived from one color.
  var GLOW_VARS = ['--glow-core', '--glow-mid', '--glow-edge', '--glow-halo', '--tile-lit'];
  var L_MIN = 55, L_MAX = 78; // lit bulbs stay this bright (HSL lightness, %) to stand out from the dark board
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
  }
  function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, rgb;
    if (h < 60) rgb = [c, x, 0]; else if (h < 120) rgb = [x, c, 0]; else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c]; else if (h < 300) rgb = [x, 0, c]; else rgb = [c, 0, x];
    return rgb.map(function (v) { return Math.round((v + m) * 255); });
  }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function css(rgb) { return 'rgb(' + rgb.join(', ') + ')'; }
  function deriveGlow(hex) {
    var hsl = rgbToHsl(hexToRgb(hex));
    var l = Math.min(L_MAX, Math.max(L_MIN, hsl[2]));
    var mid = hslToRgb(hsl[0], hsl[1], l);
    var tileArt = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue('--tile-art'));
    return {
      '--glow-core': css(mix(mid, [255, 255, 255], 0.85)),
      '--glow-mid': css(mid),
      '--glow-edge': css(hslToRgb(hsl[0], hsl[1], l - 18)),
      '--glow-halo': css(mid),
      '--tile-lit': css(mix(tileArt, mid, 0.25))
    };
  }
  function setLightColor(which, hex) {
    var body = document.body;
    GLOW_VARS.forEach(function (v) { body.style.removeProperty(v); });
    body.classList.toggle('glow-blue', which === 'blue');
    if (which === 'custom') {
      var vars = deriveGlow(hex);
      GLOW_VARS.forEach(function (v) { body.style.setProperty(v, vars[v]); });
    }
    $('colorYellow').setAttribute('aria-pressed', which === 'yellow' ? 'true' : 'false');
    $('colorBlue').setAttribute('aria-pressed', which === 'blue' ? 'true' : 'false');
    $('customLabel').classList.toggle('active', which === 'custom');
  }
  $('colorYellow').addEventListener('click', function () { setLightColor('yellow'); say('Light color: yellow.'); });
  $('colorBlue').addEventListener('click', function () { setLightColor('blue'); say('Light color: blue.'); });
  $('colorPick').addEventListener('input', function () { setLightColor('custom', this.value); });
  $('colorPick').addEventListener('change', function () { say('Light color: custom.'); });
  $('colorPick').value = getComputedStyle(document.documentElement).getPropertyValue('--preset-yellow-mid').trim().toLowerCase();

  /* ---------- Debug tools (?dev) ---------- */
  var devMarks = [], devShow = false;
  function devRender() {
    var sols = allSolutions(board), best = sols[0] || [];
    devMarks.forEach(function (m, i) { m.classList.toggle('show', devShow && best.indexOf(i) >= 0); });
    $('devInfo').textContent = allOff(board) ? 'Board is dark.' :
      'From here: fewest ' + best.length + ' · Algorithm 1 (shortcut) ' + algorithmMoves(board, 'shortcut') +
      ' · Algorithm 2 (lookup) ' + algorithmMoves(board, 'lookup') +
      ' · all 4 solutions: ' + sols.map(function (p) { return p.length; }).join(', ') +
      '. Puzzle fewest (from the start): ' + puzzleFewest + '.' +
      (mode !== 'timed' && curStep ? ' Algorithm (' + (mode === 'tutorial' && tut.step === 6 ? 'either' : algoMethod) + ') valid set: ' + curStep.phase + ' [' +
        curStep.cells.map(function (c) { return 'r' + (Math.floor(c / N) + 1) + 'c' + (c % N + 1); }).join(' ') + '].' : '') +
      (mode === 'tutorial' && tut.step >= 5 && tut.log.length ? ' Presses so far (A = algorithm step, h = not): ' + devFlags() + '.' : '');
  }
  function devFlags() {
    var b = startBoard.slice(), st = makeStepper(['shortcut', 'lookup']);
    return tut.log.map(function (i) { var ok = st.note(b, i); applyPress(b, i); return ok ? 'A' : 'h'; }).join(' ');
  }
  // Auto-play the current board: 'h' = the fewest-moves solution in random order,
  // 'a' = the algorithm in random valid order, 'ha' = 3–6 random presses, then the algorithm
  // with 8% random wrong presses.
  function devAutoPlay(kind) {
    devStopAll();
    if (locked) return;
    var R = Math.random, queue = kind === 'h' ? shuffle(fewestSolution(board), R) : [];
    var lead = kind === 'ha' ? 3 + Math.floor(R() * 4) : 0;
    devAllTimer = setInterval(function () {
      if (locked || mode === 'timed' || (mode === 'tutorial' && tut.hold)) { devStopAll(); return; }
      var i;
      if (kind === 'h') { if (!queue.length) { devStopAll(); return; } i = queue.shift(); }
      else if (lead > 0) { lead--; i = Math.floor(R() * TOTAL); }
      else if (!curStep || !curStep.cells.length) { devStopAll(); return; }
      else i = kind === 'ha' && R() < 0.08 ? Math.floor(R() * TOTAL) : curStep.cells[Math.floor(R() * curStep.cells.length)];
      focusIdx = i; setRoving(); press(i);
    }, reducedMotion() ? 30 : 120);
  }
  // Challenge: simulate the remaining puzzles (easy → heuristic; medium → algorithm or
  // heuristic then algorithm, alternating) and show the results.
  function devFill() {
    if (mode !== 'tutorial' || tut.step !== 6 || !tut.ch) return;
    devStopAll();
    var ch = tut.ch, R = Math.random, alt = 0;
    while (ch.results.length < CHALLENGE_LEVELS.length) {
      var k = ch.results.length, lv = ch.order[k];
      if (!ch.boards[k]) ch.boards[k] = qualifyingBoard(lv);
      var b = ch.boards[k], x = b.slice(), p = [], st = makeStepper([algoMethod]), g = 0, i;
      if (lv === 'easy') p = shuffle(fewestSolution(b), R);
      else {
        var lead = alt++ % 2 ? 3 + Math.floor(R() * 4) : 0;
        for (; lead > 0; lead--) { i = Math.floor(R() * TOTAL); p.push(i); st.note(x, i); applyPress(x, i); }
        while (!allOff(x) && g++ < 300) { var c = st.step(x).cells; i = c[Math.floor(R() * c.length)]; st.note(x, i); applyPress(x, i); p.push(i); }
      }
      ch.results.push(chRecord(lv, b, p, lv === 'easy' ? 5 + R() * 10 : 25 + R() * 35));
    }
    chSummary();
  }
  var devAllTimer = null;
  function devStopAll() { clearInterval(devAllTimer); devAllTimer = null; }
  function devOneStep() {
    if (locked || mode === 'timed' || !curStep || !curStep.cells.length || (mode === 'tutorial' && tut.hold)) { devStopAll(); return; }
    var i = curStep.cells[0];
    focusIdx = i; setRoving(); press(i);
    if (locked) devStopAll();
  }
  function initDev() {
    $('devBar').hidden = false;
    $('devInfo').hidden = false;
    cells.forEach(function (g, i) {
      var x = (i % N) * 100, y = Math.floor(i / N) * 100;
      devMarks.push(el('circle', { cx: x + 80, cy: y + 20, r: 8, 'class': 'dev-mark' }, g));
    });
    $('devShowSol').addEventListener('click', function () {
      devShow = !devShow;
      this.setAttribute('aria-pressed', devShow ? 'true' : 'false');
      devRender();
    });
    $('devSolve').addEventListener('click', function () {
      if (locked) return;
      if (mode === 'tutorial') { // run the algorithm, so the tutorial's own checks see real presses
        var g = 0;
        while (!locked && !tut.hold && curStep && curStep.cells.length && g++ < 300) press(curStep.cells[0]);
        return;
      }
      board = emptyBoard(); moves++; render(); onSolved();
    });
    $('devTime').addEventListener('click', function () {
      if (running) endTime = Date.now() + 10000;
    });
    $('devSolve').textContent = 'Turn all off (dev)';
    $('devSteps').addEventListener('click', function () {
      devSteps = !devSteps;
      this.setAttribute('aria-pressed', devSteps ? 'true' : 'false');
      render();
    });
    $('devStep').addEventListener('click', function () { devStopAll(); devOneStep(); });
    $('devAll').addEventListener('click', function () {
      devStopAll();
      devAllTimer = setInterval(devOneStep, matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 160);
    });
    $('devJump').addEventListener('change', function () {
      var n = parseInt(this.value, 10);
      if (!n) return;
      for (var k = 1; k < n; k++) tut.done[k] = true;
      if (mode !== 'tutorial') setMode('tutorial');
      tutGo(n);
      this.value = '';
    });
    $('devPlayH').addEventListener('click', function () { devAutoPlay('h'); });
    $('devPlayA').addEventListener('click', function () { devAutoPlay('a'); });
    $('devPlayHA').addEventListener('click', function () { devAutoPlay('ha'); });
    $('devFill').addEventListener('click', devFill);
    $('devMental').addEventListener('click', function () {
      if (mode !== 'practice') return;
      devStopAll(); stuckShown = false; hideMsg();
      var b = emptyBoard();
      MENTAL_SET_PRESSES.forEach(function (i) { applyPress(b, i); });
      loadBoard(b);
      say('Mental set board loaded.');
    });
  }

  /* ---------- Start ---------- */
  LOOKUP = lookupTable();
  buildBoard();
  fillLookupTable();
  if (DEV) initDev();
  var startMode = params.get('mode');
  setMode(startMode === 'timed' || startMode === 'tutorial' ? startMode : 'practice');
})();
