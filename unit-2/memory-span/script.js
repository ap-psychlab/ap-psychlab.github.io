/* Memory Span Test — short-term memory span (CED 2.5.A.1, 2.3.A.3)
 *
 * Simon-style: each round adds one random color; the player repeats the whole sequence.
 * The game ends at the first mistake. Score = the longest sequence repeated correctly.
 *
 * Test options (URL): none.
 *
 * Title bar, ⓘ, sound and the restart modal come from ../../shared/ui.js (APPSYCH_UI).
 * Sound is off on every page load; tone() checks APPSYCH_UI.sound.on, and no AudioContext is
 * made until sound is turned on.
 *
 * States: idle (before the first run), watch (sequence playing), input (player's turn),
 * wait (correct; next round starts in 1 s), paused (restart modal open), over.
 * token cancels a playback or a pending next round when it changes.
 */
(function () {
  'use strict';

  var UI = window.APPSYCH_UI || null;
  var NAMES = ['Red', 'Green', 'Yellow', 'Blue'], LET = ['R', 'G', 'Y', 'B'];
  var FREQ = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
  var KEYS = { r: 0, g: 1, y: 2, b: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
  var pads = [].slice.call(document.querySelectorAll('.pad'));
  var $ = function (id) { return document.getElementById(id); };
  var statusEl = $('status'), startBtn = $('startBtn'), restartBtn = $('restartBtn');
  var stacked = window.matchMedia ? window.matchMedia('(max-width: 999px)') : null;  // .split stacks
  var seq = [], pos = 0, score = 0, best = 0, state = 'idle', entered = [], token = 0, ctx = null;

  function say(t) { statusEl.textContent = t; }
  function updateStats() {
    $('roundV').textContent = seq.length; $('scoreV').textContent = score; $('bestV').textContent = best;
  }
  function setPads(enabled) { pads.forEach(function (p) { p.disabled = !enabled; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function inRun() { return state === 'watch' || state === 'input' || state === 'wait'; }

  /* ---------- Sound (Web Audio) ---------- */
  function audio() {
    try {
      if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, vol) {
    if (!UI || !UI.sound.on) return;
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime, d = dur / 1000;
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function buzz() { tone(110, 450, 'sawtooth', 0.18); }

  /* ---------- Playback ---------- */
  function flash(i, ms) {
    pads[i].classList.add('lit'); tone(FREQ[i], ms);
    return sleep(ms).then(function () { pads[i].classList.remove('lit'); });
  }

  // Faster every 5 rounds, down to 350 ms on / 150 ms gap.
  function timing() {
    var step = Math.floor((seq.length - 1) / 5);
    return { on: Math.max(350, 600 - step * 50), gap: Math.max(150, 250 - step * 20) };
  }

  async function playback() {
    var my = ++token, t = timing();
    state = 'watch'; setPads(false);
    say('Watch…');
    await sleep(600);
    for (var k = 0; k < seq.length; k++) {
      if (my !== token) return;
      await flash(seq[k], t.on);
      if (my !== token) return;
      await sleep(t.gap);
    }
    if (my !== token) return;
    state = 'input'; pos = 0; entered = []; setPads(true);
    yourTurn();
  }
  function yourTurn() {
    say(pos ? 'Your turn: keep going from color ' + (pos + 1) + ' of ' + seq.length + '.'
      : 'Your turn: repeat ' + seq.length + ' color' + (seq.length > 1 ? 's' : '') + '.');
  }

  function nextRound() {
    seq.push(Math.floor(Math.random() * 4));
    updateStats(); playback();
  }

  function startGame() {
    if (UI && UI.sound.on) audio();
    token++;
    seq = []; score = 0; pos = 0; entered = [];
    $('over').hidden = true;
    startBtn.hidden = true; restartBtn.disabled = false;
    nextRound();
  }

  /* ---------- Game over ---------- */
  function chips(arr, badIdx) {
    return arr.map(function (c, k) {
      return '<span class="chip' + (k === badIdx ? ' bad' : '') + '" data-c="' + c + '" title="' + NAMES[c] + '">' + LET[c] + '</span>';
    }).join('');
  }

  function gameOver() {
    state = 'over'; setPads(false); token++;
    buzz();
    if (score > best) best = score;
    updateStats();
    say('Game over. Score: ' + score + '.' + (stacked && stacked.matches ? ' Your results are below.' : ''));
    $('finalV').textContent = score;
    $('finalMsg').textContent = score === 0
      ? 'You missed the first color. Press Play again to try another run.'
      : 'You repeated ' + score + ' color' + (score === 1 ? '' : 's') + ' correctly in a row. You missed one in round ' + seq.length + ' (a sequence of ' + seq.length + ').';
    $('correctRow').innerHTML = chips(seq);
    var bad = entered.length - 1;
    $('enteredRow').innerHTML = chips(entered, bad);
    $('missNote').textContent = '(missed at color ' + (bad + 1) + ')';
    $('over').hidden = false;
    startBtn.textContent = 'Play again'; startBtn.hidden = false; restartBtn.disabled = true;
    startBtn.focus();
  }

  /* ---------- Input ---------- */
  function press(i) {
    if (state !== 'input') return;
    entered.push(i);
    if (i !== seq[pos]) {
      pads[i].classList.add('lit');
      setTimeout(function () { pads[i].classList.remove('lit'); }, 250);
      gameOver(); return;
    }
    flash(i, 280);
    pos++;
    if (pos === seq.length) {
      state = 'wait'; setPads(false);
      score = seq.length; if (score > best) best = score;
      updateStats();
      say('Correct! ' + score + ' in a row.');
      var my = token;
      setTimeout(function () { if (my === token && state === 'wait') nextRound(); }, 1000);
    }
  }

  pads.forEach(function (p) { p.addEventListener('click', function () { press(+p.dataset.c); }); });
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || state !== 'input') return;
    if (e.target.closest && e.target.closest('input, select, textarea, dialog')) return;
    var k = KEYS[e.key.toLowerCase()];
    if (k !== undefined) { e.preventDefault(); press(k); }
  });

  startBtn.addEventListener('click', startGame);

  /* ---------- Restart (↺), with a confirmation when there's progress to lose ---------- */
  // While the modal is open the run is paused; "Keep playing" (or Escape) picks it up again:
  // a sequence that was playing replays from the start, a pending next round starts.
  var restarting = false;
  restartBtn.addEventListener('click', function () {
    if (!inRun()) return;
    if (!(score > 0 || seq.length > 1) || !UI) { startGame(); return; }
    var was = state;
    token++; state = 'paused'; setPads(false);
    restarting = false;
    UI.openModal('restartModal', {
      onClose: function () {
        if (restarting) { startGame(); return; }
        if (was === 'watch') playback();
        else if (was === 'wait') nextRound();
        else { state = 'input'; setPads(true); yourTurn(); }
      }
    });
  });
  $('yesBtn').addEventListener('click', function () { restarting = true; UI.closeModal('restartModal'); });

  // Audible feedback when sound is turned on.
  if (UI) UI.sound.onChange(function (on) { if (on) tone(FREQ[2], 160); });

  updateStats();
})();
