/* ============================================================
   Sonido sintetizado con WebAudio (sin archivos externos)
   ============================================================ */
const SFX = (() => {
  let ac = null, master = null, noiseBuf = null, enabled = true;
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function ok(name, gap) {
    if (!enabled || !ac) return false;
    const t = ac.currentTime;
    if (gap && last[name] && t - last[name] < gap) return false;
    last[name] = t; return true;
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, f0, f1, dur, vol, delay = 0) {
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, .005, vol, dur); o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, vol, ftype, freq, q = 1, delay = 0, fEnd) {
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (fEnd) f.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    const g = ac.createGain(); env(g, t, .003, vol, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  const r = (a, b) => a + Math.random() * (b - a);

  return {
    init,
    // pausa automática: congela y reanuda todo el sonido
    suspend() { if (ac && ac.state === 'running') ac.suspend(); },
    resume() { if (ac && ac.state === 'suspended') ac.resume(); },
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    swing() { if (!ok('swing', .05)) return; noise(.09, .05, 'bandpass', r(900, 1300), 2, 0, 400); },
    hit(heavy) {
      if (!ok('hit', .03)) return;
      tone('sine', r(150, 190), 60, .12, heavy ? .5 : .32);
      noise(.06, .25, 'lowpass', 1800, 1);
      tone('triangle', r(900, 1200), 700, .05, .08);
    },
    crit() { if (!ok('crit', .05)) return; tone('square', 1400, 2400, .08, .07); tone('sine', 120, 50, .2, .5); noise(.12, .3, 'highpass', 2500); },
    wood() { if (!ok('wood', .04)) return; tone('triangle', r(320, 380), 200, .08, .3); noise(.05, .2, 'bandpass', 900, 4); },
    stone() { if (!ok('stone', .04)) return; noise(.08, .3, 'bandpass', 600, 3); tone('sine', 90, 50, .1, .35); },
    smash() {
      if (!ok('smash', .03)) return;
      noise(.28, .35, 'highpass', 2200);
      noise(.15, .3, 'bandpass', 1200, 1.5);
      for (let i = 0; i < 4; i++) tone('sine', r(2500, 4500), r(2000, 4000), .07, .05, r(.03, .2));
    },
    coin() { if (!ok('coin', .045)) return; const f = r(1500, 1900); tone('sine', f, f, .06, .06); tone('sine', f * 1.5, f * 1.5, .1, .05, .05); },
    cash() {
      if (!ok('cash', .1)) return;
      noise(.08, .3, 'bandpass', 3000, 2);
      tone('triangle', 2093, 2093, .35, .18, .06); tone('triangle', 2637, 2637, .45, .14, .1);
      tone('sine', 4186, 4186, .3, .05, .1);
    },
    boom() { if (!ok('boom', .05)) return; noise(.6, .6, 'lowpass', 1200, 1, 0, 80); tone('sine', 110, 30, .5, .6); },
    zap() { if (!ok('zap', .05)) return; tone('sawtooth', r(600, 900), r(150, 300), .18, .09); noise(.15, .12, 'highpass', 4000); },
    rock() { if (!ok('rock', .05)) return; tone('sine', 100, 40, .2, .45); noise(.2, .35, 'lowpass', 700); },
    click() { if (!ok('click', .02)) return; tone('triangle', 900, 700, .04, .12); },
    buy() { if (!ok('buy', .05)) return; tone('triangle', 660, 660, .08, .15); tone('triangle', 990, 990, .12, .15, .07); },
    deny() { if (!ok('deny', .1)) return; tone('square', 180, 140, .15, .08); },
    stamp() { if (!ok('stamp', .1)) return; tone('sine', 140, 50, .18, .7); noise(.12, .4, 'lowpass', 900); },
    letter() { if (!ok('letter', .2)) return; noise(.25, .15, 'bandpass', 2400, .8, 0, 900); tone('triangle', 880, 880, .1, .1, .2); tone('triangle', 1175, 1175, .14, .1, .3); },
    bad() { if (!ok('bad', .3)) return; tone('sawtooth', 220, 110, .5, .12); tone('sawtooth', 233, 116, .5, .1); },
    heal() { if (!ok('heal', .1)) return; tone('sine', 660, 1320, .2, .12); tone('sine', 990, 1980, .25, .08, .08); },
    jackpot() {
      if (!enabled || !ac) return;
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone('square', f, f, .18, .07, i * .08));
      for (let i = 0; i < 12; i++) tone('sine', r(1800, 3000), r(1800, 3000), .08, .05, .5 + i * .05);
    },
    levelup() { if (!enabled || !ac) return; [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, .15, .12, i * .07)); },
    tired() { if (!ok('tired', .5)) return; tone('sine', 400, 180, .6, .15); },
    shuffle() { if (!ok('shuffle', .08)) return; noise(.1, .15, 'bandpass', 1500, 2); },
  };
})();
