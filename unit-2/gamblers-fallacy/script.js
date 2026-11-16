// Outguess the Robot — gambler's fallacy demo
(function () {
  var TRIALS = 40;
  var P_RED = 0.7;        // Chip's real chance of picking red on every round
  var STREAK = 3;         // "after a streak" = the last 3+ picks were all red

  var $ = function (id) { return document.getElementById(id); };
  var bot = $('bot'), roll = $('roll'), say = $('say');
  var wheels = [].slice.call(bot.querySelectorAll('.wheel'));
  var nextBtn = $('nextBtn'), redBtn = $('redBtn'), blueBtn = $('blueBtn');
  var soundBtn = $('soundBtn'), restartBtn = $('restartBtn');
  var talkRow = $('talkRow'), guessRow = $('guessRow');
  var historyEl = $('history'), historyCard = $('historyCard'), results = $('results');

  var state = 'intro';    // intro | play | busy | debrief | done
  var script = [], line = 0;
  var picks = [], guesses = [], correct = 0;
  var token = 0, soundOn = true, ctx = null, restartArmed = 0;
  var lastQuip = { hit: -1, miss: -1 };

  var INTRO = [
    "Greetings, human! I'm Chip. I was built to do exactly one thing: pick colors. I'm extremely good at it.",
    "No secrets here. Each round I pick at random: RED 70% of the time and BLUE 30% of the time. It's in my programming.",
    "Your job: guess what I'll pick, " + TRIALS + " rounds in a row. Get as many right as you can. No pressure. (I don't feel pressure. I checked.)"
  ];
  var HIT = [
    "You got it. I'm logging this as “impressive.”",
    "My circuits are mildly warm with pride.",
    "Great minds compute alike.",
    "Have you been reading my source code?",
    "I'd clap, but these hands are mostly decorative.",
    "Nice one, human.",
    "Ding! That's the happy sound.",
    "Are you sure you're not a robot?"
  ];
  var MISS = [
    "Don't feel bad. I didn't know either until just now.",
    "I'd say sorry, but I wasn't programmed for it.",
    "In fairness, I am very random.",
    "Wrong, but confidently wrong. Very human.",
    "Bzzt. That's the sad sound.",
    "My dice have no feelings about this.",
    "Trust your gut next time. Or don't. I don't have one.",
    "I'm told humans learn from this."
  ];

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function count(arr, v) { return arr.filter(function (x) { return x === v; }).length; }
  function pct(n, d) { return d ? Math.round(100 * n / d) : 0; }

  /* ---------- Sound ---------- */
  function audio() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { ctx = new AC(); } }
    if (ctx && ctx.state === 'suspended') { ctx.resume(); }
  }
  function tone(freq, start, dur, type) {
    if (!soundOn || !ctx) { return; }
    var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + start;
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function sfx(kind) {
    if (kind === 'think') { tone(880, 0, 0.05); tone(1175, 0.08, 0.05); tone(988, 0.16, 0.05); }
    else if (kind === 'hit') { tone(659, 0, 0.1, 'triangle'); tone(988, 0.1, 0.16, 'triangle'); }
    else if (kind === 'miss') { tone(196, 0, 0.22, 'sawtooth'); }
    else { tone(740, 0, 0.06, 'triangle'); }
  }

  /* ---------- Robot ---------- */
  function mood(m) { bot.setAttribute('data-mood', m); }
  function show(pick) { bot.setAttribute('data-pick', pick || ''); }
  function rollTo(x) {
    roll.style.transform = 'translateX(' + x + 'px)';
    var deg = Math.round(x / 18 * 180 / Math.PI);   // wheel radius is 18 units
    wheels.forEach(function (w) { w.style.transform = 'rotate(' + deg + 'deg)'; });
  }
  function speak(text, pick, lead) {
    say.textContent = '';
    if (lead) {
      var s = document.createElement('strong');
      s.appendChild(document.createTextNode(lead + ' I picked '));
      var c = document.createElement('span');
      c.className = pick; c.textContent = pick.toUpperCase();
      s.appendChild(c); s.appendChild(document.createTextNode('.'));
      say.appendChild(s);
    }
    say.appendChild(document.createTextNode(text));
  }
  function quip(kind) {
    var pool = kind === 'hit' ? HIT : MISS, i;
    do { i = Math.floor(Math.random() * pool.length); } while (i === lastQuip[kind]);
    lastQuip[kind] = i;
    return pool[i];
  }
  function runLength() {           // how many of Chip's latest picks match the last one
    var n = picks.length, k = 1;
    while (k < n && picks[n - 1 - k] === picks[n - 1]) { k++; }
    return n ? k : 0;
  }

  /* ---------- Screens ---------- */
  function updateStats() {
    $('roundV').textContent = picks.length + ' / ' + TRIALS;
    $('correctV').textContent = correct;
  }
  function talk(lines, label) {
    script = lines; line = 0;
    talkRow.hidden = false; guessRow.hidden = true;
    nextBtn.textContent = label || 'Next';
    speak(script[0]);
  }
  function intro() {
    token++;
    state = 'intro';
    picks = []; guesses = []; correct = 0;
    historyEl.textContent = '';
    results.hidden = true; historyCard.hidden = false; restartBtn.hidden = true;
    mood('idle'); show(''); rollTo(0); updateStats();
    talk(INTRO);
  }
  function startPlay() {
    state = 'play';
    talkRow.hidden = true; guessRow.hidden = false; restartBtn.hidden = false;
    redBtn.disabled = blueBtn.disabled = false;
    speak("Round 1. Red or blue? I've already decided. (I haven't. I decide when you click.)");
    redBtn.focus();
  }
  function advance() {
    audio(); sfx('blip');
    if (state === 'done') { intro(); return; }
    line++;
    if (line < script.length) {
      speak(script[line]);
      if (line === script.length - 1) {
        nextBtn.textContent = state === 'intro' ? 'Start guessing' : 'Show my results';
      }
      return;
    }
    if (state === 'intro') { startPlay(); }
    else { showResults(); }
  }

  /* ---------- One round ---------- */
  async function guess(g) {
    if (state !== 'play') { return; }
    var my = ++token;
    state = 'busy';
    audio();
    redBtn.disabled = blueBtn.disabled = true;
    show(''); mood('think'); sfx('think');
    speak('Computing…');
    rollTo(Math.round(Math.random() * 70 - 35));
    await sleep(480);
    if (my !== token) { return; }

    var pick = Math.random() < P_RED ? 'red' : 'blue';   // independent on every round
    var hit = pick === g;
    picks.push(pick); guesses.push(g);
    if (hit) { correct++; }
    show(pick); mood(hit ? 'happy' : 'flat'); sfx(hit ? 'hit' : 'miss');
    addCell(pick, hit);
    updateStats();

    var n = picks.length, run = runLength(), text = '';
    if (n === TRIALS / 2) {
      text = "Halfway. You're at " + correct + ' of ' + n + ". I'm at " + n + ' of ' + n + ', but I have an unfair advantage.';
    } else if (pick === 'red' && run === 4) {
      text = "That's four reds in a row. I'm not hinting. I can't hint. I think.";
    } else if (pick === 'blue' && run === 2) {
      text = "Two blues in a row! Even I'm surprised, and I did it.";
    } else if (Math.random() < 0.5) {
      text = quip(hit ? 'hit' : 'miss');
    }
    speak(text, pick, hit ? 'Correct!' : 'Not this time.');

    await sleep(350);
    if (my !== token) { return; }
    if (n >= TRIALS) { debrief(); return; }
    state = 'play';
    redBtn.disabled = blueBtn.disabled = false;
    (g === 'red' ? redBtn : blueBtn).focus();
  }
  function addCell(pick, hit) {
    var cell = document.createElement('span'), chip = document.createElement('span'), mark = document.createElement('span');
    cell.className = 'cell';
    cell.title = 'Round ' + picks.length + ': Chip picked ' + pick + ', you ' + (hit ? 'guessed it' : 'missed');
    chip.className = 'chip'; chip.setAttribute('data-c', pick); chip.textContent = pick === 'red' ? 'R' : 'B';
    mark.textContent = hit ? '✓' : '✗';
    if (!hit) { mark.className = 'miss'; }
    cell.appendChild(chip); cell.appendChild(mark);
    historyEl.appendChild(cell);
  }

  /* ---------- Debrief ---------- */
  function tally() {
    var t = {
      reds: count(picks, 'red'), redGuesses: count(guesses, 'red'),
      blueHits: 0, chances: 0, blueAfterStreak: 0
    };
    t.blueGuesses = TRIALS - t.redGuesses;
    for (var i = 0; i < TRIALS; i++) {
      if (guesses[i] === 'blue' && picks[i] === 'blue') { t.blueHits++; }
      if (i >= STREAK && picks.slice(i - STREAK, i).every(function (p) { return p === 'red'; })) {
        t.chances++;
        if (guesses[i] === 'blue') { t.blueAfterStreak++; }
      }
    }
    return t;
  }
  function debrief() {
    state = 'debrief';
    var t = tally(), lines = [];
    mood('idle'); rollTo(0);
    redBtn.disabled = blueBtn.disabled = true;
    restartBtn.hidden = true;

    lines.push('All ' + TRIALS + ' rounds complete. You got ' + correct + ' right. Let me run the numbers. It’s kind of my whole thing.');
    if (t.blueGuesses === 0) {
      lines.push('You guessed red every single time. That is the best possible strategy. Are you sure you’re not one of us?');
    } else if (t.blueGuesses <= 2) {
      lines.push('You guessed blue only ' + t.blueGuesses + (t.blueGuesses === 1 ? ' time' : ' times') + '. Almost pure red. Suspiciously logical for a human.');
    } else {
      lines.push('You guessed blue ' + t.blueGuesses + ' times, and ' + t.blueHits + ' of those were right. Be honest: did some of them feel like blue was “due”?');
    }
    lines.push('Here’s the thing: I have no memory. Every round is a fresh 70/30 roll. After five reds in a row, the chance of blue is still 30%. Expecting a streak to “even out” is called the gambler’s fallacy.');
    lines.push('So red is the better bet on every single round. Guess red every time and you’d expect about 70% right. Mix in blues to match my 70/30 habit and you’d expect only about 58%.');
    if (correct > t.reds) {
      lines.push('This game, all-red would have scored ' + t.reds + '. You scored ' + correct + '. You beat it! My statistics module calls that luck. Play again and see if it holds up.');
    } else if (correct === t.reds) {
      lines.push('This game, all-red would have scored ' + t.reds + ', exactly what you got.' + (t.blueGuesses ? ' Your hunches broke even. Usually they cost points.' : ' Flawless. I have nothing to teach you.'));
    } else {
      lines.push('This game, all-red would have scored ' + t.reds + '. You scored ' + correct + '. That gap is what the hunches cost. Humans have hunches; I have a random number generator. Yours are more fun at parties.');
    }
    talk(lines);
    nextBtn.focus();
  }
  function bar(label, n, cls) {
    var b = document.createElement('div'), l = document.createElement('div'), a = document.createElement('span'), v = document.createElement('span');
    var tr = document.createElement('div'), f = document.createElement('div');
    b.className = 'bar' + (cls ? ' ' + cls : ''); l.className = 'lbl'; tr.className = 'track'; f.className = 'fill';
    a.textContent = label; v.textContent = n + ' / ' + TRIALS + ' (' + pct(n, TRIALS) + '%)';
    f.style.width = pct(n, TRIALS) + '%';
    l.appendChild(a); l.appendChild(v); tr.appendChild(f); b.appendChild(l); b.appendChild(tr);
    return b;
  }
  function showResults() {
    state = 'done';
    var t = tally(), bars = $('bars'), facts = $('facts');
    bars.textContent = ''; facts.textContent = '';
    bars.appendChild(bar('Your score', correct));
    bars.appendChild(bar('Guessing red every time', t.reds, 'best'));
    var items = [
      'Chip picked red ' + t.reds + ' times (' + pct(t.reds, TRIALS) + '%). It varies from game to game because each pick really is random.',
      'You guessed red ' + t.redGuesses + ' times (' + pct(t.redGuesses, TRIALS) + '%) and blue ' + t.blueGuesses + ' times.'
    ];
    if (t.blueGuesses) {
      items.push('Your blue guesses were right ' + t.blueHits + ' of ' + t.blueGuesses + ' times (' + pct(t.blueHits, t.blueGuesses) + '%).');
    }
    if (t.chances) {
      items.push('After ' + STREAK + ' or more reds in a row, you switched to blue ' + t.blueAfterStreak + ' of ' + t.chances + ' times.');
    }
    items.forEach(function (text) { var li = document.createElement('li'); li.textContent = text; facts.appendChild(li); });
    results.hidden = false;
    mood('happy');
    speak('Your results are on display. Want a rematch? I promise to be exactly as random as last time.');
    nextBtn.textContent = 'Play again';
    results.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Controls ---------- */
  nextBtn.addEventListener('click', advance);
  redBtn.addEventListener('click', function () { guess('red'); });
  blueBtn.addEventListener('click', function () { guess('blue'); });
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.textContent = 'Sound: ' + (soundOn ? 'On' : 'Off');
    if (soundOn) { audio(); sfx('blip'); }
  });
  restartBtn.addEventListener('click', function () {   // second click within 3 s confirms
    if (Date.now() - restartArmed < 3000) { restartArmed = 0; restartBtn.textContent = 'Restart'; intro(); nextBtn.focus(); return; }
    restartArmed = Date.now();
    restartBtn.textContent = 'Click again to restart';
    setTimeout(function () { restartBtn.textContent = 'Restart'; }, 3000);
  });
  document.addEventListener('keydown', function (e) {
    if (state !== 'play' || e.ctrlKey || e.metaKey || e.altKey) { return; }
    var k = e.key.toLowerCase();
    if (k === 'r' || k === 'arrowleft') { e.preventDefault(); guess('red'); }
    else if (k === 'b' || k === 'arrowright') { e.preventDefault(); guess('blue'); }
  });

  intro();
})();
