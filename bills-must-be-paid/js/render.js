/* ============================================================
   Dibujo: cerditos de porcelana, martillos, mesa
   ============================================================ */

const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

function fmt(n) {
  n = Math.floor(n);
  const a = Math.abs(n);
  if (a < 100000) return n.toLocaleString('es-ES', { useGrouping: 'always' });
  const u = [[1e15, 'Qa'], [1e12, 'B'], [1e9, 'MM'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, s] of u) if (a >= v) {
    const x = n / v;
    return (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : x.toFixed(0)).replace('.', ',') + s;
  }
  return String(n);
}
const money = n => '$' + fmt(n);
const pct = n => Math.round(n * 100) + '%';

/* PRNG con semilla para que las grietas de cada cerdito sean estables */
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// radios negativos lanzarían una excepción a mitad de dibujo y descuadrarían el lienzo
function ellipsePath(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }

function shade(hex, amt) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/* ------------------------------------------------------------
   drawPig(c, pig)
   pig: { type, x, y, r, dir, t, flash, hpFrac, seed, glow, z, squash, moving, state }
   ------------------------------------------------------------ */
function drawPig(c, p) {
  const T = p.type, col = T.col, r = p.r, key = T.key;
  const t = p.t || 0;
  const walk = p.moving ? Math.sin(t * 14) : 0;
  const z = p.z || 0;
  const sq = p.squash || 0;
  const sx = 1 + sq * .25, sy = 1 - sq * .25;
  const sc = p.spawnScale != null ? p.spawnScale : 1;

  // sombra
  c.save();
  c.fillStyle = 'rgba(30,15,5,.28)';
  ellipsePath(c, p.x, p.y + r * .88, r * 1.15 * sc, r * .3 * sc); c.fill();
  c.restore();

  c.save();
  c.translate(p.x, p.y - z);
  c.scale(sc * sx * (p.dir || 1), sc * sy);
  c.translate(0, sq * r * .2);

  // aura brillante
  if (p.glow) {
    const pulse = .75 + Math.sin(t * 5) * .25;
    const g = c.createRadialGradient(0, 0, r * .5, 0, 0, r * 2);
    g.addColorStop(0, `rgba(255,230,120,${.55 * pulse})`);
    g.addColorStop(1, 'rgba(255,200,60,0)');
    c.fillStyle = g; ellipsePath(c, 0, 0, r * 2, r * 1.8); c.fill();
  }

  // capa del rey (detrás)
  if (key === 'king') {
    c.fillStyle = '#b3122e';
    c.beginPath(); c.moveTo(-r * .5, -r * .6); c.quadraticCurveTo(-r * 1.6, -r * .2, -r * 1.35, r * .95);
    c.lineTo(r * .2, r * .9); c.closePath(); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ellipsePath(c, -r * 1.3 + i * r * .28, r * .9, r * .09, r * .06); c.fill(); }
  }

  // patas
  const legC = col.dark;
  c.fillStyle = legC;
  const legs = [[-.55, .25], [-.2, -.25], [.25, .25], [.6, -.25]];
  legs.forEach(([lx, ph], i) => {
    const off = walk * 3 * (i % 2 ? 1 : -1);
    const lh = r * .38 + (i % 2 ? -1 : 1) * walk * 1.5;
    roundRect(c, lx * r - r * .12 + off * .3, r * .55, r * .24, lh, r * .08); c.fill();
    c.fillStyle = shade(legC, -.25);
    roundRect(c, lx * r - r * .12 + off * .3, r * .55 + lh - r * .08, r * .24, r * .1, r * .05); c.fill();
    c.fillStyle = legC;
  });

  // cola rizada
  c.strokeStyle = col.dark; c.lineWidth = Math.max(2, r * .09); c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-r * 1.1, -r * .1);
  c.bezierCurveTo(-r * 1.45, -r * .45 + walk * 2, -r * 1.55, r * .1, -r * 1.3, -r * .05);
  c.bezierCurveTo(-r * 1.15, -r * .2, -r * 1.35, -r * .4, -r * 1.5, -r * .25);
  c.stroke();

  // cuerpo
  c.save();
  ellipsePath(c, 0, 0, r * 1.15, r * .92);
  c.clip();
  bodyFill(c, p, r, t);
  // brillo de porcelana
  if (key !== 'rocky' && key !== 'woody') {
    const hg = c.createRadialGradient(-r * .35, -r * .5, 0, -r * .35, -r * .5, r * .8);
    hg.addColorStop(0, 'rgba(255,255,255,.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(-r * 1.2, -r, r * 2.4, r * 2);
  }
  // sombra inferior
  const sg = c.createLinearGradient(0, r * .2, 0, r * .95);
  sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.22)');
  c.fillStyle = sg; c.fillRect(-r * 1.2, -r, r * 2.4, r * 2);

  // grietas (dentro del cuerpo)
  if (p.hpFrac < .999 && T.hp > 0) drawCracks(c, p, r);
  c.restore();

  // contorno
  c.strokeStyle = shade(col.dark, -.3); c.lineWidth = Math.max(1.5, r * .06);
  ellipsePath(c, 0, 0, r * 1.15, r * .92); c.stroke();

  // orejas
  c.fillStyle = key === 'rainbow' ? '#ffb3e6' : col.body;
  c.strokeStyle = shade(col.dark, -.3); c.lineWidth = Math.max(1.5, r * .05);
  ear(c, r * .45, -r * .7, r, 1); ear(c, r * .05, -r * .82, r, .85);

  // ranura de monedas
  c.fillStyle = '#2b1a14';
  roundRect(c, -r * .32, -r * .86, r * .5, r * .1, r * .05); c.fill();

  // hocico
  c.fillStyle = col.snout; c.strokeStyle = shade(col.dark, -.3);
  ellipsePath(c, r * 1.08, r * .08, r * .27, r * .33); c.fill(); c.stroke();
  c.fillStyle = shade(col.dark, -.35);
  ellipsePath(c, r * 1.13, -r * .03, r * .05, r * .08); c.fill();
  ellipsePath(c, r * 1.13, r * .19, r * .05, r * .08); c.fill();

  // ojo
  const blink = (Math.sin(t * 1.3 + (p.seed % 7)) > .99) && p.moving !== undefined && t > 2;
  c.fillStyle = '#1b1010';
  if (blink || p.state === 'stun') { c.fillRect(r * .58, -r * .22, r * .18, r * .04); }
  else {
    ellipsePath(c, r * .66, -r * .2, r * .12, r * .155); c.fill();
    c.fillStyle = '#fff'; ellipsePath(c, r * .7, -r * .26, r * .045, r * .055); c.fill();
  }
  // mejilla
  c.fillStyle = 'rgba(255,90,120,.28)'; ellipsePath(c, r * .6, r * .2, r * .17, r * .1); c.fill();

  drawAccessory(c, p, r, t);

  // destello al recibir golpe
  if (p.flash > 0) {
    c.globalAlpha = Math.min(1, p.flash) * .75;
    c.fillStyle = '#fff'; ellipsePath(c, 0, 0, r * 1.2, r * .97); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function ear(c, x, y, r, s) {
  c.beginPath(); c.moveTo(x - r * .2 * s, y + r * .12); c.lineTo(x + r * .02 * s, y - r * .32 * s); c.lineTo(x + r * .25 * s, y + r * .1); c.closePath();
  c.fill(); c.stroke();
}

function bodyFill(c, p, r, t) {
  const col = p.type.col, key = p.type.key;
  if (key === 'rainbow') {
    const g = c.createLinearGradient(-r, -r, r, r);
    const off = (t * .3) % 1;
    ['#ff5a5a', '#ffb347', '#ffe66d', '#7ee081', '#5ab0ff', '#b57bff', '#ff5a5a'].forEach((cc, i) => g.addColorStop(((i / 6) + off) % 1, cc));
    c.fillStyle = g; c.fillRect(-r * 1.2, -r, r * 2.4, r * 2); return;
  }
  if (key === 'goldie' || key === 'king' && false) {
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(.4, '#ffd34d'); g.addColorStop(.7, '#e8a90f'); g.addColorStop(1, '#a67508');
    c.fillStyle = g; c.fillRect(-r * 1.2, -r, r * 2.4, r * 2);
    const s = (t * .8) % 2.5 - 1;
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.moveTo(s * r * 1.5 - r * .2, -r); c.lineTo(s * r * 1.5 + r * .1, -r); c.lineTo(s * r * 1.5 - r * .3, r); c.lineTo(s * r * 1.5 - r * .6, r); c.fill();
    return;
  }
  const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.3);
  g.addColorStop(0, shade(col.body, .25)); g.addColorStop(.6, col.body); g.addColorStop(1, col.dark);
  c.fillStyle = g; c.fillRect(-r * 1.2, -r, r * 2.4, r * 2);

  if (key === 'woody') {
    c.strokeStyle = 'rgba(70,40,15,.55)'; c.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      c.beginPath(); c.moveTo(-r * 1.2, i * r * .28); c.lineTo(r * 1.2, i * r * .28 + 2); c.stroke();
    }
    c.strokeStyle = 'rgba(70,40,15,.25)';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(-r * .5 + i * r * .25, (i % 3 - 1) * r * .28 + 5, r * .12, r * .04, 0, 0, TAU); c.stroke(); }
    if (p.hpFrac > .5) { // tablas extra
      c.fillStyle = '#9b6a38'; c.strokeStyle = '#5a3612';
      roundRect(c, -r * .9, -r * .35, r * 1.8, r * .26, 3); c.fill(); c.stroke();
      roundRect(c, -r * .7, r * .2, r * 1.5, r * .26, 3); c.fill(); c.stroke();
      c.fillStyle = '#ccc';
      [[-r * .8, -r * .22], [r * .8, -r * .22], [-r * .6, r * .33], [r * .7, r * .33]].forEach(([a, b]) => { ellipsePath(c, a, b, 2.2, 2.2); c.fill(); });
    }
  } else if (key === 'pinata') {
    const cs = ['#ff5a8a', '#ffd34d', '#5ad1ff', '#7ee081', '#b57bff'];
    for (let i = -6; i < 7; i++) { c.fillStyle = cs[(i + 20) % 5]; c.fillRect(i * r * .2, -r, r * .2, r * 2); }
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1;
    for (let i = -6; i < 7; i++) for (let j = -4; j < 5; j++) { c.beginPath(); c.moveTo(i * r * .2, j * r * .22); c.lineTo(i * r * .2 + r * .2, j * r * .22 + r * .06); c.stroke(); }
  } else if (key === 'rocky') {
    c.fillStyle = 'rgba(60,60,66,.4)';
    const rr = mulberry(p.seed + 3);
    for (let i = 0; i < 12; i++) { ellipsePath(c, (rr() * 2 - 1) * r, (rr() * 2 - 1) * r * .8, r * (.06 + rr() * .12), r * (.05 + rr() * .1)); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.15)';
    for (let i = 0; i < 6; i++) { ellipsePath(c, (rr() * 2 - 1) * r, (rr() * 2 - 1) * r * .8, r * .07, r * .05); c.fill(); }
  } else if (key === 'tourist') {
    // camisa hawaiana
    c.fillStyle = '#2bb3c0'; c.fillRect(-r * 1.2, r * .05, r * 2.4, r);
    c.fillStyle = '#ffe14d';
    const rr = mulberry(p.seed);
    for (let i = 0; i < 9; i++) { flower(c, (rr() * 2 - 1) * r, r * .25 + rr() * r * .55, r * .1); }
  } else if (key === 'sgt') {
    c.fillStyle = 'rgba(60,75,40,.45)';
    const rr = mulberry(p.seed);
    for (let i = 0; i < 8; i++) { ellipsePath(c, (rr() * 2 - 1) * r, (rr() * 2 - 1) * r * .8, r * .25, r * .14); c.fill(); }
  } else if (key === 'toni') {
    // traje a rayas
    c.fillStyle = '#2d2f3a'; c.fillRect(-r * 1.2, -r * .05, r * 2.4, r * 1.1);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
    for (let i = -8; i < 8; i++) { c.beginPath(); c.moveTo(i * r * .15, -r * .05); c.lineTo(i * r * .15, r); c.stroke(); }
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(r * .55, -r * .05); c.lineTo(r * .85, -r * .05); c.lineTo(r * .7, r * .3); c.fill();
    c.fillStyle = '#c0182c'; c.beginPath(); c.moveTo(r * .66, 0); c.lineTo(r * .74, 0); c.lineTo(r * .78, r * .28); c.lineTo(r * .7, r * .34); c.lineTo(r * .62, r * .28); c.fill();
  } else if (key === 'bomb') {
    c.fillStyle = 'rgba(255,255,255,.08)'; ellipsePath(c, -r * .2, -r * .3, r * .7, r * .4); c.fill();
  } else if (key === 'viking') {
    c.fillStyle = '#7a5230'; c.fillRect(-r * 1.2, r * .35, r * 2.4, r * .7);
    c.fillStyle = '#c8a24a'; c.fillRect(-r * 1.2, r * .35, r * 2.4, r * .08);
  } else if (key === 'king') {
    c.fillStyle = '#7b1fa2'; c.fillRect(-r * 1.2, r * .3, r * 2.4, r * .8);
    c.fillStyle = '#ffd34d'; c.fillRect(-r * 1.2, r * .3, r * 2.4, r * .06);
    c.fillStyle = '#fff';
    for (let i = -5; i < 6; i++) { ellipsePath(c, i * r * .22, r * .5, r * .04, r * .06); c.fill(); }
  }
}

function flower(c, x, y, s) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ellipsePath(c, x + Math.cos(a) * s, y + Math.sin(a) * s, s * .7, s * .7); c.fill(); }
  const f = c.fillStyle; c.fillStyle = '#ff6a3d'; ellipsePath(c, x, y, s * .5, s * .5); c.fill(); c.fillStyle = f;
}

function drawCracks(c, p, r) {
  const n = Math.floor((1 - p.hpFrac) * 9) + 1;
  const rr = mulberry(p.seed);
  c.strokeStyle = 'rgba(40,15,15,.75)'; c.lineWidth = Math.max(1, r * .045); c.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    let x = (rr() * 2 - 1) * r * .8, y = (rr() * 2 - 1) * r * .6;
    let a = rr() * TAU;
    c.beginPath(); c.moveTo(x, y);
    const segs = 3 + Math.floor(rr() * 3);
    for (let s = 0; s < segs; s++) {
      a += (rr() - .5) * 1.6; const l = r * (.12 + rr() * .18);
      x += Math.cos(a) * l; y += Math.sin(a) * l; c.lineTo(x, y);
      if (rr() < .3) { // rama
        const bx = x + Math.cos(a + 1) * l * .6, by = y + Math.sin(a + 1) * l * .6;
        c.lineTo(bx, by); c.moveTo(x, y);
      }
    }
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
}

function drawAccessory(c, p, r, t) {
  const key = p.type.key;
  c.lineWidth = Math.max(1.5, r * .05);
  switch (key) {
    case 'tourist': { // sombrero de paja + cámara
      c.fillStyle = '#f2d27a'; c.strokeStyle = '#a8862e';
      ellipsePath(c, r * .15, -r * .95, r * .85, r * .18); c.fill(); c.stroke();
      roundRect(c, -r * .25, -r * 1.4, r * .8, r * .48, r * .2); c.fill(); c.stroke();
      c.fillStyle = '#e04848'; c.fillRect(-r * .25, -r * 1.05, r * .8, r * .1);
      c.fillStyle = '#333'; roundRect(c, r * .3, r * .1, r * .42, r * .3, 3); c.fill();
      c.fillStyle = '#9bd'; ellipsePath(c, r * .51, r * .25, r * .09, r * .09); c.fill();
      c.strokeStyle = '#333'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * .3, r * .1); c.lineTo(r * .1, -r * .5); c.stroke();
      break;
    }
    case 'angry': {
      c.strokeStyle = '#3a0b07'; c.lineWidth = r * .1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(r * .48, -r * .45); c.lineTo(r * .85, -r * .3); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)';
      if (p.state === 'charge' || p.state === 'windup') {
        for (let i = 0; i < 2; i++) { const k = (t * 3 + i * .5) % 1; c.globalAlpha = 1 - k; ellipsePath(c, -r * .2 + i * r * .4, -r * (1.1 + k * .6), r * (.12 + k * .15), r * (.1 + k * .12)); c.fill(); }
        c.globalAlpha = 1;
      }
      break;
    }
    case 'brotalito': { // brote
      c.strokeStyle = '#3c8c2c'; c.lineWidth = r * .07;
      c.beginPath(); c.moveTo(r * .05, -r * .88); c.quadraticCurveTo(r * .1, -r * 1.2, 0, -r * 1.35); c.stroke();
      c.fillStyle = '#5cc24a'; c.strokeStyle = '#2e6e22'; c.lineWidth = 1.5;
      c.save(); c.translate(0, -r * 1.3); c.rotate(-.6 + Math.sin(t * 3) * .1);
      ellipsePath(c, -r * .18, 0, r * .2, r * .09); c.fill(); c.stroke(); c.restore();
      c.save(); c.translate(0, -r * 1.3); c.rotate(.5 + Math.sin(t * 3 + 1) * .1);
      ellipsePath(c, r * .18, 0, r * .2, r * .09); c.fill(); c.stroke(); c.restore();
      break;
    }
    case 'gambolito': { // chistera y pajarita
      c.fillStyle = '#1d1d24'; c.strokeStyle = '#000';
      ellipsePath(c, r * .15, -r * .88, r * .55, r * .12); c.fill();
      c.fillRect(-r * .2, -r * 1.55, r * .7, r * .7);
      c.fillStyle = '#e0245e'; c.fillRect(-r * .2, -r * 1.0, r * .7, r * .1);
      c.fillStyle = '#ffd34d';
      c.beginPath(); c.moveTo(r * .55, r * .5); c.lineTo(r * .3, r * .35); c.lineTo(r * .3, r * .65); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(r * .55, r * .5); c.lineTo(r * .8, r * .35); c.lineTo(r * .8, r * .65); c.closePath(); c.fill();
      // dado
      c.save(); c.translate(-r * .45, r * .25); c.rotate(.3 + Math.sin(t * 2) * .1);
      c.fillStyle = '#fff'; c.strokeStyle = '#555'; c.lineWidth = 1; roundRect(c, -r * .17, -r * .17, r * .34, r * .34, 3); c.fill(); c.stroke();
      c.fillStyle = '#e0245e'; ellipsePath(c, 0, 0, r * .045, r * .045); c.fill();
      ellipsePath(c, -r * .09, -r * .09, r * .04, r * .04); c.fill(); ellipsePath(c, r * .09, r * .09, r * .04, r * .04); c.fill();
      c.restore();
      break;
    }
    case 'rocky': {
      c.strokeStyle = '#3a3a3f'; c.lineWidth = r * .08;
      c.beginPath(); c.moveTo(r * .5, -r * .38); c.lineTo(r * .85, -r * .38); c.stroke();
      break;
    }
    case 'sgt': { // gorra militar + bigote
      c.fillStyle = '#4b5a2c'; c.strokeStyle = '#2a3315';
      c.beginPath(); c.moveTo(-r * .45, -r * .78); c.quadraticCurveTo(r * .1, -r * 1.45, r * .7, -r * .78); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#2a3315'; roundRect(c, r * .3, -r * .85, r * .6, r * .12, 3); c.fill();
      c.fillStyle = '#ffd34d'; star(c, r * .12, -r * 1.02, r * .13); c.fill();
      c.fillStyle = '#4a2e14'; ellipsePath(c, r * .95, r * .4, r * .25, r * .07); c.fill();
      break;
    }
    case 'bomb': { // mecha
      c.strokeStyle = '#a07a4a'; c.lineWidth = r * .08;
      c.beginPath(); c.moveTo(-r * .1, -r * .9); c.quadraticCurveTo(-r * .4, -r * 1.3, -r * .1, -r * 1.45); c.stroke();
      const f = .7 + Math.sin(t * 30) * .3;
      c.fillStyle = `rgba(255,${150 + Math.random() * 100 | 0},40,${f})`;
      star(c, -r * .1, -r * 1.48, r * (.16 + Math.random() * .08)); c.fill();
      c.fillStyle = '#fff'; c.font = `bold ${r * .5}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('💣', -r * .2, r * .15);
      break;
    }
    case 'spiky': {
      c.fillStyle = '#dfe9e7'; c.strokeStyle = '#4a6b66'; c.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) {
        const a = Math.PI + i / 13 * Math.PI; // mitad superior
        const x = Math.cos(a) * r * 1.12, y = Math.sin(a) * r * .9;
        const nx = Math.cos(a) * r * 1.45, ny = Math.sin(a) * r * 1.2;
        const px = -Math.sin(a) * r * .1, py = Math.cos(a) * r * .1;
        c.beginPath(); c.moveTo(x - px, y - py); c.lineTo(nx, ny); c.lineTo(x + px, y + py); c.closePath(); c.fill(); c.stroke();
      }
      break;
    }
    case 'rainbow': {
      c.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; star(c, Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.0, r * .12 * (1 + Math.sin(t * 6 + i) * .3)); c.fill(); }
      break;
    }
    case 'viking': { // casco con cuernos + barba
      c.fillStyle = '#f2ead3'; c.strokeStyle = '#9b8c66';
      c.beginPath(); c.moveTo(-r * .45, -r * .75); c.quadraticCurveTo(-r * .95, -r * 1.05, -r * .85, -r * 1.55); c.quadraticCurveTo(-r * .7, -r * 1.1, -r * .3, -r * .95); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * .55, -r * .75); c.quadraticCurveTo(r * 1.05, -r * 1.05, r * .95, -r * 1.55); c.quadraticCurveTo(r * .8, -r * 1.1, r * .4, -r * .95); c.fill(); c.stroke();
      c.fillStyle = '#8f98a3'; c.strokeStyle = '#4f5660';
      c.beginPath(); c.arc(r * .05, -r * .7, r * .62, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#c8a24a'; c.fillRect(-r * .57, -r * .78, r * 1.24, r * .12);
      c.fillStyle = '#e07a2f';
      c.beginPath(); c.moveTo(r * .75, r * .3); c.quadraticCurveTo(r * .95, r * .95, r * .6, r * 1.05); c.quadraticCurveTo(r * .5, r * .7, r * .45, r * .35); c.fill();
      break;
    }
    case 'toni': { // fedora, bigote, cadena
      c.fillStyle = '#26262e'; c.strokeStyle = '#000';
      ellipsePath(c, r * .15, -r * .9, r * .8, r * .14); c.fill();
      c.beginPath(); c.moveTo(-r * .35, -r * .9); c.quadraticCurveTo(-r * .3, -r * 1.5, r * .15, -r * 1.38); c.quadraticCurveTo(r * .6, -r * 1.5, r * .65, -r * .9); c.fill();
      c.fillStyle = '#7a1f2b'; c.fillRect(-r * .34, -r * 1.05, r * .98, r * .1);
      c.fillStyle = '#1a1a1a';
      c.beginPath(); c.moveTo(r * .82, r * .38); c.quadraticCurveTo(r * .65, r * .55, r * .5, r * .42); c.quadraticCurveTo(r * .7, r * .44, r * .82, r * .3); c.fill();
      c.beginPath(); c.moveTo(r * .9, r * .38); c.quadraticCurveTo(r * 1.1, r * .58, r * 1.25, r * .44); c.quadraticCurveTo(r * 1.05, r * .46, r * .9, r * .3); c.fill();
      c.strokeStyle = '#ffd34d'; c.lineWidth = r * .05;
      c.beginPath(); c.arc(r * .3, r * .05, r * .5, .3, 1.6); c.stroke();
      break;
    }
    case 'goldie': {
      c.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) { const k = (t * .7 + i * .25) % 1; c.globalAlpha = Math.sin(k * Math.PI); star(c, Math.cos(i * 1.7) * r * .9, Math.sin(i * 2.3) * r * .6, r * .14); c.fill(); }
      c.globalAlpha = 1;
      c.fillStyle = '#a67508'; c.font = `bold ${r * .55}px Georgia`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('$', -r * .1, r * .15);
      break;
    }
    case 'king': {
      // corona
      c.fillStyle = '#ffd34d'; c.strokeStyle = '#a67508'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-r * .45, -r * .75);
      c.lineTo(-r * .5, -r * 1.35); c.lineTo(-r * .25, -r * 1.05); c.lineTo(r * .05, -r * 1.5); c.lineTo(r * .3, -r * 1.05); c.lineTo(r * .6, -r * 1.35); c.lineTo(r * .55, -r * .75); c.closePath(); c.fill(); c.stroke();
      [['#e0245e', -r * .2], ['#2f6fe0', r * .05], ['#1fbf6a', r * .3]].forEach(([cc, x]) => { c.fillStyle = cc; ellipsePath(c, x, -r * .88, r * .07, r * .07); c.fill(); });
      // cetro
      c.strokeStyle = '#a67508'; c.lineWidth = r * .07;
      c.beginPath(); c.moveTo(r * .7, r * .55); c.lineTo(r * 1.3, -r * .5); c.stroke();
      c.fillStyle = '#ff6fb5'; ellipsePath(c, r * 1.33, -r * .56, r * .12, r * .12); c.fill();
      // cejas
      c.strokeStyle = '#3a0b07'; c.lineWidth = r * .05;
      c.beginPath(); c.moveTo(r * .5, -r * .4); c.lineTo(r * .8, -r * .35); c.stroke();
      break;
    }
  }
}

function star(c, x, y, s) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? s * .45 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

/* ------------------------------------------------------------
   Martillo. (x,y) = punto de impacto, ang = 0 en el impacto
   ------------------------------------------------------------ */
function drawHammer(c, hm, x, y, ang, scale = 1) {
  const L = 92 * scale;
  const base = Math.atan2(-56, -74); // del puño al punto de impacto
  const px = x - Math.cos(base) * L, py = y - Math.sin(base) * L; // posición de la mano
  c.save();
  c.translate(px, py);
  c.rotate(base + ang);
  // mango
  const hg = c.createLinearGradient(0, -5, 0, 5);
  hg.addColorStop(0, shade(hm.handle, .3)); hg.addColorStop(1, shade(hm.handle, -.3));
  c.fillStyle = hg;
  roundRect(c, -10 * scale, -5 * scale, L + 6 * scale, 10 * scale, 4 * scale); c.fill();
  c.fillStyle = 'rgba(0,0,0,.25)';
  for (let i = 0; i < 4; i++) c.fillRect((-6 + i * 7) * scale, -5 * scale, 3 * scale, 10 * scale);
  // cabeza
  c.translate(L, 0);
  const hw = hm.hw * scale, hh = hm.hh * scale;
  const g = c.createLinearGradient(-hw / 2, 0, hw / 2, 0);
  g.addColorStop(0, shade(hm.head, .45)); g.addColorStop(.5, hm.head); g.addColorStop(1, shade(hm.head, -.35));
  c.fillStyle = g; c.strokeStyle = shade(hm.head, -.55); c.lineWidth = 2;
  roundRect(c, -hw / 2, -hh / 2, hw, hh, 5 * scale); c.fill(); c.stroke();
  c.fillStyle = shade(hm.head, -.2);
  roundRect(c, -hw / 2 - 3 * scale, hh / 2 - 9 * scale, hw + 6 * scale, 9 * scale, 3 * scale); c.fill();
  roundRect(c, -hw / 2 - 3 * scale, -hh / 2, hw + 6 * scale, 9 * scale, 3 * scale); c.fill();
  if (hm.elec) {
    c.strokeStyle = '#e8f3ff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-hw / 3, -hh / 3); c.lineTo(hw / 4, -hh / 10); c.lineTo(-hw / 5, hh / 8); c.lineTo(hw / 3, hh / 3); c.stroke();
  }
  c.restore();
}

/* ------------------------------------------------------------
   Mesa de madera (se pre-renderiza una vez)
   ------------------------------------------------------------ */
let deskCanvas = null, deskK = 1;
/* El navegador puede descartar lienzos fuera de pantalla si se queda sin memoria gráfica */
function deskLost() {
  if (!deskCanvas) return true;
  const c = deskCanvas.getContext('2d');
  return !!(c.isContextLost && c.isContextLost());
}
function buildDesk(k = 1) {
  deskK = k;
  const cv = document.createElement('canvas'); cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  const c = cv.getContext('2d'); c.scale(k, k);
  // pared/fondo
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2b1d16'); bg.addColorStop(1, '#170e0a');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // tablero
  const { x, y, w, h } = DESK;
  c.save();
  roundRect(c, x, y, w, h, 18); c.clip();
  const planks = 7, ph = h / planks;
  const rr = mulberry(42);
  for (let i = 0; i < planks; i++) {
    const base = ['#a8703f', '#9c6636', '#b07743', '#a26b3a'][i % 4];
    c.fillStyle = base; c.fillRect(x, y + i * ph, w, ph);
    // vetas
    for (let k = 0; k < 26; k++) {
      c.strokeStyle = `rgba(${60 + rr() * 30 | 0},${30 + rr() * 20 | 0},10,${.08 + rr() * .14})`;
      c.lineWidth = .8 + rr() * 1.6;
      const yy = y + i * ph + rr() * ph;
      c.beginPath(); c.moveTo(x, yy);
      for (let xx = x; xx <= x + w; xx += 40) c.lineTo(xx, yy + Math.sin(xx * .01 + k) * (2 + rr() * 3));
      c.stroke();
    }
    // nudos
    for (let k = 0; k < 2; k++) {
      const nx = x + rr() * w, ny = y + i * ph + ph * (.3 + rr() * .4);
      for (let q = 5; q > 0; q--) { c.strokeStyle = `rgba(70,35,12,${.12 + q * .03})`; c.lineWidth = 1.2; ellipsePath(c, nx, ny, q * 5, q * 2.2); c.stroke(); }
    }
    // juntas entre tablas
    c.fillStyle = 'rgba(40,20,8,.55)'; c.fillRect(x, y + i * ph, w, 2);
    c.fillStyle = 'rgba(255,220,180,.08)'; c.fillRect(x, y + i * ph + 2, w, 1);
    // clavos
    [x + 30, x + w - 30, x + w / 2].forEach(nx => {
      c.fillStyle = 'rgba(40,30,25,.7)'; ellipsePath(c, nx, y + i * ph + ph / 2, 3, 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,.2)'; ellipsePath(c, nx - 1, y + i * ph + ph / 2 - 1, 1.2, 1.2); c.fill();
    });
  }
  // mancha de café
  c.strokeStyle = 'rgba(70,35,10,.28)'; c.lineWidth = 5;
  c.beginPath(); c.arc(x + w - 140, y + 90, 38, .4, TAU - .2); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.arc(x + w - 136, y + 92, 32, 1, TAU - .9); c.stroke();
  // marcas de martillazos (desgaste)
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(50,25,8,${.05 + rr() * .1})`;
    ellipsePath(c, x + rr() * w, y + rr() * h, 4 + rr() * 10, 2 + rr() * 4); c.fill();
  }
  // luz de lámpara
  const lg = c.createRadialGradient(W / 2, H * .45, 60, W / 2, H * .5, W * .7);
  lg.addColorStop(0, 'rgba(255,220,150,.18)'); lg.addColorStop(.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = lg; c.fillRect(x, y, w, h);
  c.restore();
  // borde de la mesa
  c.strokeStyle = '#5a3418'; c.lineWidth = 8; roundRect(c, x, y, w, h, 18); c.stroke();
  c.strokeStyle = 'rgba(255,200,150,.15)'; c.lineWidth = 2; roundRect(c, x + 5, y + 5, w - 10, h - 10, 14); c.stroke();
  deskCanvas = cv;
}

/* Retrato de cerdito para la interfaz (colección, cartas).
   Se dibuja una sola vez y se reutiliza como <img>: crear cientos de <canvas>
   agotaba la memoria gráfica del navegador en partidas largas. */
const portraitCache = {};
function pigPortrait(type, size = 96, silhouette = false, glow = false) {
  const key = `${type.key}|${size}|${silhouette ? 1 : 0}|${glow ? 1 : 0}`;
  if (!portraitCache[key]) portraitCache[key] = drawPortrait(type, size, silhouette, glow).toDataURL();
  const img = new Image(size, size);
  img.src = portraitCache[key]; img.draggable = false; img.alt = '';
  img.style.width = size + 'px'; img.style.height = size + 'px';
  return img;
}
function drawPortrait(type, size, silhouette, glow) {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const r = size * (type.key === 'king' ? .27 : .27);
  drawPig(c, { type, x: size * .48, y: size * .56, r, dir: 1, t: 1.2, hpFrac: 1, seed: 7 + type.idx * 13, glow, moving: false });
  if (silhouette) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#1a1110'; c.fillRect(0, 0, size, size);
  }
  return cv;
}
