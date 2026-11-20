/* Lights Off — algorithms vs. heuristics (CED 2.2.A.3–2.2.A.5)
 *
 * Test options (URL):
 *   ?dev      debug tools (buttons under the side panel)
 *   ?seed=N   repeatable scrambles (any whole number)
 * Public option:
 *   ?mode=practice | timed   open in that mode (default: practice)
 *
 * Dev tools (?dev): Turn all off, Time left 10 s, Show fewest-moves solution, Show algorithm
 * steps, Solve one step, Solve all (algorithm), Load mental set board, plus an info line.
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

  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var svg = $('board');

  /* ---------- Random numbers (seeded with ?seed=N) ---------- */
  var rand = Math.random;
  if (params.has('seed')) {
    var seed = (parseInt(params.get('seed'), 10) || 0) >>> 0;
    rand = function () { // mulberry32
      seed = (seed + 0x6D2B79F5) >>> 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
  function allOff(b) { return b.every(function (x) { return !x; }); }
  function litCount(b) { return b.filter(Boolean).length; }

  // Start from all off and press k different cells, so every puzzle is solvable.
  function scramble(level) {
    var L = LEVELS[level], b, k, idx, i, j, t;
    do {
      k = L.min + Math.floor(rand() * (L.max - L.min + 1));
      b = emptyBoard(); idx = [];
      for (i = 0; i < TOTAL; i++) idx.push(i);
      for (i = TOTAL - 1; i > 0; i--) { j = Math.floor(rand() * (i + 1)); t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
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

  function render() {
    for (var i = 0; i < TOTAL; i++) {
      var on = board[i];
      cells[i].classList.toggle('on', on);
      tiles[i].classList.toggle('lit', on);
      var mark = guiding && !locked && curStep && curStep.cells.indexOf(i) >= 0;
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
    var showRings = mode === 'practice' && !locked && curStep && (guiding || devSteps);
    drawGuide(showRings ? curStep.cells : [], showRings ? stepFrom(curStep) : null);
    $('legendGuide').classList.toggle('show', !!(showRings && guiding));
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
  function msgBox() { return mode === 'practice' ? $('pMsg') : $('tMsg'); }
  function showMsg(html, warn) { var m = msgBox(); m.innerHTML = html; m.classList.toggle('warn', !!warn); m.hidden = false; }
  function hideMsg() { $('pMsg').hidden = true; $('tMsg').hidden = true; }

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
    var ok = mode === 'practice' ? stepper.note(board, i) : true;
    applyPress(board, i); moves++;
    clickSound();
    if (mode === 'practice') {
      prevStep = curStep; curStep = stepper.step(board);
      if (guiding) { if (ok) guidedPresses++; else offScript++; }
    }
    clearPreview(); render();
    if (allOff(board)) { onSolved(); return; }
    preview(i);
    if (mode === 'practice') {
      if (guiding) updateGuideText(!ok);
      else checkStuck();
    }
  }

  function onSolved() {
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
    hideMsg(); clearPreview(); endGuide(); hideStuck(); stuckShown = false;
    $('modePractice').setAttribute('aria-pressed', m === 'practice' ? 'true' : 'false');
    $('modeTimed').setAttribute('aria-pressed', m === 'timed' ? 'true' : 'false');
    $('panelPractice').hidden = m !== 'practice';
    $('panelTimed').hidden = m !== 'timed';
    if (m === 'practice') {
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
  $('modePractice').addEventListener('click', function () { if (mode !== 'practice') { setMode('practice'); say('Practice mode.'); } });
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
      (mode === 'practice' && curStep ? ' Algorithm (' + algoMethod + ') valid set: ' + curStep.phase + ' [' +
        curStep.cells.map(function (c) { return 'r' + (Math.floor(c / N) + 1) + 'c' + (c % N + 1); }).join(' ') + '].' : '');
  }
  var devAllTimer = null;
  function devStopAll() { clearInterval(devAllTimer); devAllTimer = null; }
  function devOneStep() {
    if (locked || mode !== 'practice' || !curStep || !curStep.cells.length) { devStopAll(); return; }
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
  setMode(params.get('mode') === 'timed' ? 'timed' : 'practice');
})();
