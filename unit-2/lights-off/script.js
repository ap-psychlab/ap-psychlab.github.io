/* Lights Off — algorithms vs. heuristics (CED 2.2.A.3–2.2.A.5)
 *
 * Test options (URL):
 *   ?dev      debug tools (buttons under the side panel)
 *   ?seed=N   repeatable scrambles (any whole number)
 * Public option:
 *   ?mode=practice | timed   open in that mode (default: practice)
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

  function render() {
    for (var i = 0; i < TOTAL; i++) {
      var on = board[i];
      cells[i].classList.toggle('on', on);
      tiles[i].classList.toggle('lit', on);
      cells[i].setAttribute('aria-label', 'Row ' + (Math.floor(i / N) + 1) + ', column ' + (i % N + 1) + ', ' + (on ? 'on' : 'off'));
      cells[i].setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
    svg.classList.toggle('locked', locked);
    $('pMoves').textContent = moves;
    $('tMoves').textContent = moves;
    $('tSolved').textContent = solved;
    $('tTotal').textContent = totalMoves;
    $('pFewest').textContent = puzzleFewest;
    $('tFewest').textContent = puzzleFewest;
    if (DEV) devRender();
  }

  function say(t) { var l = $('live'); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); }
  function msgBox() { return mode === 'practice' ? $('pMsg') : $('tMsg'); }
  function showMsg(html, warn) { var m = msgBox(); m.innerHTML = html; m.classList.toggle('warn', !!warn); m.hidden = false; }
  function hideMsg() { $('pMsg').hidden = true; $('tMsg').hidden = true; }

  function loadBoard(b) {
    board = b; startBoard = b.slice(); moves = 0; locked = false;
    puzzleFewest = fewest(b);
    clearPreview(); render();
  }
  function loadPuzzle(level) {
    loadBoard(scramble(level));
    $('tLevel').textContent = LEVELS[level].label;
  }

  function press(i) {
    if (locked) return;
    applyPress(board, i); moves++;
    clickSound();
    clearPreview(); render();
    if (allOff(board)) onSolved(); else preview(i);
  }

  function onSolved() {
    locked = true; render(); chime();
    if (mode === 'practice') {
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
    clearInterval(timer); running = false;
    mode = m;
    hideMsg(); clearPreview();
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

  /* ---------- Debug tools (?dev) ---------- */
  var devMarks = [], devShow = false;
  function devRender() {
    var sols = allSolutions(board), best = sols[0] || [];
    devMarks.forEach(function (m, i) { m.classList.toggle('show', devShow && best.indexOf(i) >= 0); });
    $('devInfo').textContent = allOff(board) ? 'Board is dark.' :
      'From here: fewest ' + best.length + ' · Algorithm 1 (shortcut) ' + algorithmMoves(board, 'shortcut') +
      ' · Algorithm 2 (lookup) ' + algorithmMoves(board, 'lookup') +
      ' · all 4 solutions: ' + sols.map(function (p) { return p.length; }).join(', ') +
      '. Puzzle fewest (from the start): ' + puzzleFewest + '.';
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
  }

  /* ---------- Start ---------- */
  LOOKUP = lookupTable();
  buildBoard();
  fillLookupTable();
  if (DEV) initDev();
  setMode(params.get('mode') === 'timed' ? 'timed' : 'practice');
})();
