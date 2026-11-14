// Memory Span Test — game logic
(function(){
  var NAMES=['Red','Green','Yellow','Blue'], LET=['R','G','Y','B'];
  var FREQ=[261.63,329.63,392.00,493.88]; // C4, E4, G4, B4
  var KEYS={r:0,g:1,y:2,b:3,'1':0,'2':1,'3':2,'4':3};
  var pads=[].slice.call(document.querySelectorAll('.pad'));
  var $=function(id){return document.getElementById(id)};
  var statusEl=$('status'), startBtn=$('startBtn'), resetBtn=$('resetBtn'), soundBtn=$('soundBtn'), confirmBox=$('confirm');
  var seq=[], pos=0, score=0, best=0, state='idle', entered=[], token=0, soundOn=true, ctx=null;

  function say(t){statusEl.textContent=t}
  function updateStats(){
    $('roundV').textContent=seq.length; $('scoreV').textContent=score; $('bestV').textContent=best;
  }
  function setPads(enabled){pads.forEach(function(p){p.disabled=!enabled})}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}

  function audio(){
    if(!ctx){var AC=window.AudioContext||window.webkitAudioContext; if(AC){ctx=new AC()}}
    if(ctx&&ctx.state==='suspended'){ctx.resume()}
  }
  function tone(freq,dur,type,vol){
    if(!soundOn||!ctx) return;
    var o=ctx.createOscillator(), g=ctx.createGain(), t=ctx.currentTime, d=dur/1000;
    o.type=type||'triangle'; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol||0.25,t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+d+0.02);
  }
  function buzz(){tone(110,450,'sawtooth',0.18)}

  function flash(i,ms){
    pads[i].classList.add('lit'); tone(FREQ[i],ms);
    return sleep(ms).then(function(){pads[i].classList.remove('lit')});
  }

  function timing(){
    var step=Math.floor((seq.length-1)/5);
    return {on:Math.max(350,600-step*50), gap:Math.max(150,250-step*20)};
  }

  async function playback(){
    var my=++token, t=timing();
    state='watch'; setPads(false);
    say('Watch…');
    await sleep(600);
    for(var k=0;k<seq.length;k++){
      if(my!==token) return;
      await flash(seq[k],t.on);
      if(my!==token) return;
      await sleep(t.gap);
    }
    if(my!==token) return;
    state='input'; pos=0; entered=[]; setPads(true);
    say('Your turn: repeat '+seq.length+' color'+(seq.length>1?'s':'')+'.');
  }

  function nextRound(){
    seq.push(Math.floor(Math.random()*4));
    updateStats(); playback();
  }

  function startGame(){
    audio(); token++;
    seq=[]; score=0; pos=0; entered=[];
    $('over').hidden=true; confirmBox.hidden=true;
    startBtn.hidden=true; resetBtn.hidden=false;
    nextRound();
  }

  function chips(arr,badIdx){
    return arr.map(function(c,k){
      return '<span class="chip'+(k===badIdx?' bad':'')+'" data-c="'+c+'" title="'+NAMES[c]+'">'+LET[c]+'</span>';
    }).join('');
  }

  function gameOver(){
    state='over'; setPads(false); token++;
    buzz();
    if(score>best) best=score;
    updateStats();
    say('Game over. Score: '+score+'.');
    $('finalV').textContent=score;
    $('finalMsg').textContent=score===0
      ? 'You missed the first color. Press Play again to try another run.'
      : 'You repeated '+score+' color'+(score===1?'':'s')+' correctly in a row. You missed one in round '+seq.length+' (a sequence of '+seq.length+').';
    $('correctRow').innerHTML=chips(seq);
    var bad=entered.length-1;
    $('enteredRow').innerHTML=chips(entered,bad);
    $('missNote').textContent='(missed at color '+(bad+1)+')';
    $('over').hidden=false;
    startBtn.textContent='Play again'; startBtn.hidden=false; resetBtn.hidden=true;
    startBtn.focus();
  }

  function press(i){
    if(state!=='input') return;
    entered.push(i);
    if(i!==seq[pos]){
      pads[i].classList.add('lit');
      setTimeout(function(){pads[i].classList.remove('lit')},250);
      gameOver(); return;
    }
    flash(i,280);
    pos++;
    if(pos===seq.length){
      state='wait'; setPads(false);
      score=seq.length; if(score>best) best=score;
      updateStats();
      say('Correct! '+score+' in a row.');
      var my=token;
      setTimeout(function(){ if(my===token&&state==='wait') nextRound(); },1000);
    }
  }

  pads.forEach(function(p){p.addEventListener('click',function(){press(+p.dataset.c)})});
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    var k=KEYS[e.key.toLowerCase()];
    if(k!==undefined&&state==='input'){e.preventDefault();press(k)}
  });

  startBtn.addEventListener('click',startGame);
  soundBtn.addEventListener('click',function(){
    soundOn=!soundOn;
    soundBtn.textContent='Sound: '+(soundOn?'On':'Off');
    soundBtn.setAttribute('aria-pressed',String(soundOn));
    if(soundOn){audio()}
  });

  resetBtn.addEventListener('click',function(){
    // Ask first only if a run is in progress with progress to lose
    if(score>0||seq.length>1){confirmBox.hidden=false; $('yesBtn').focus()}
    else{startGame()}
  });
  $('yesBtn').addEventListener('click',startGame);
  $('noBtn').addEventListener('click',function(){confirmBox.hidden=true; resetBtn.focus()});

  updateStats();
})();
