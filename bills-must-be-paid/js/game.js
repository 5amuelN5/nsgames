/* ============================================================
   Estado, guardado, estadísticas, facturas y motor de la ronda
   ============================================================ */

const SAVE_KEY = 'bmbp_save_v1';
let meta = null;   // permanente (sobrevive a la quiebra)
let cyc = null;    // ciclo actual (se pierde en la quiebra)
let S = null;      // estadísticas derivadas
let R = null;      // ronda en curso
let pigId = 0;

function newMeta() {
  return {
    lp: 0, lpTotal: 0, rings: [], bracelets: {}, coins: {}, mastery: {},
    stats: { smashed: 0, earned: 0, runs: 0, bankrupt: 0, bestRun: 0, bestHit: 0, jackpots: 0, paid: 0, glow: 0, kings: 0, toni: 0, coinsFound: 0 },
    cycle: 1, won: false, sound: true, tutorial: true,
  };
}
function newCycle() {
  const base = computeStats(true);
  const owned = []; for (let i = 0; i <= base.startHammer; i++) owned.push(i);
  return {
    cash: base.startCash, skills: {}, owned, hammer: base.startHammer,
    bills: [], billIdx: 0, paidTotal: 0, round: 1, unl: 1, paidPerks: [], endless: 0,
    loan: null, kingActive: false, kingHp: KING.hp, kingDead: false, earnedTotal: 0,
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, meta, cyc })); } catch (e) { }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !d.meta || !d.cyc) return false;
    meta = Object.assign(newMeta(), d.meta);
    meta.stats = Object.assign(newMeta().stats, d.meta.stats || {});
    cyc = d.cyc;
    S = computeStats();
    return true;
  } catch (e) { return false; }
}
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

/* ---------- Estadísticas derivadas ---------- */
function computeStats(permOnly) {
  const hm = HAMMERS[(!permOnly && cyc) ? cyc.hammer : 0];
  const s = {
    flat: 0, dmgPct: 0, crit: hm.crit, critMult: hm.critMult, spd: 0, radius: hm.radius, stamina: BASE_STAMINA,
    loot: 0, lootMult: hm.loot || 1, luck: 0, dbl: 0, glow: .015, glowMult: 5, midas: 0, jackpot: 0,
    startPigs: 4, maxPigs: 9, spawnRate: 0, collat: 0, rock: 0, rockDmg: 1, elec: hm.elec || 0, chains: 3, elecDmg: .6,
    shock: 0, eff: 0, wind: 0, tourist: 2, dhit: 0, frenzy: 0, toniRed: 0, deadline: 0, loanInt: .5,
    coinMult: 1, gamble: 2, rare: 0, exotic: 0, rainbowTime: 0, lpMult: 1, startCash: 0, startHammer: 0, gambleW: 1,
  };
  if (!permOnly && cyc) {
    for (const sk of SKILLS) { const l = cyc.skills[sk.id] || 0; if (l) sk.f(s, l); }
    cyc.paidPerks.forEach(i => BILLS[i] && BILLS[i].f(s));
    s.loot += .1 * (cyc.endless || 0);
  }
  meta.rings.forEach(i => RINGS[i].f(s));
  BRACELETS.forEach(b => { const l = meta.bracelets[b.id] || 0; if (l) b.f(s, l); });
  Object.keys(meta.coins).forEach(i => COINS[i] && COINS[i].f(s));

  s.dmg = (hm.dmg + s.flat) * (1 + s.dmgPct);
  s.speed = hm.spd * (1 + s.spd);
  s.radiusPx = s.radius * RADIUS_UNIT;
  s.lootTotal = (1 + s.loot) * s.lootMult;
  s.spawnInterval = 1.5 / (1 + s.spawnRate);
  s.rockInterval = s.rock ? Math.max(1.6, 6.5 - .8 * (s.rock - 1)) : 0;
  s.rockCount = s.rock ? s.rock : 0;
  s.stamina = Math.round(s.stamina);
  s.eff = Math.min(.5, s.eff);
  s.drain = 1 - s.eff;           // segundos de aguante que se gastan por segundo
  s.crit = Math.min(1, s.crit);
  s.loanInt = Math.max(.1, s.loanInt);
  return s;
}
function refreshStats() { S = computeStats(); }

function masteryLevel(key) {
  const n = meta.mastery[key] || 0; let l = 0;
  for (const st of MASTERY_STEPS) if (n >= st) l++;
  return l;
}
function skillCost(sk, lvl) { return Math.round(sk.cost * Math.pow(sk.g, lvl)); }
function braceletCost(b, lvl) { return Math.round(b.c * Math.pow(b.g, lvl)); }

/* ---------- Facturas ---------- */
function toniCut() {
  let c = 0;
  for (const b of cyc.bills) if (b.overdue > 0) c += (b.loan ? .35 : .25) + .1 * (b.overdue - 1);
  c -= S.toniRed;
  return clamp(c, 0, .9);
}
function regularBill() { return cyc.bills.find(b => !b.loan); }

function issueNextBill() {
  const idx = cyc.billIdx;
  let def;
  if (idx < BILLS.length) def = BILLS[idx];
  else if (cyc.kingDead) {
    const k = idx - BILLS.length + 1;
    const names = ['Factura sorpresa', 'Derrama de la comunidad', 'Impuesto real porcino', 'Reforma de la cocina', 'Boda de tu primo', 'Multa cósmica'];
    def = { n: names[(k - 1) % names.length] + ' #' + k, i: '📨', a: Math.round(BILLS[BILLS.length - 1].a * Math.pow(2.6, k)), d: 6, perk: '+10% de botín', endless: true };
  } else return null;
  const b = { idx, name: def.n, icon: def.i, amount: def.a, paid: 0, due: def.d + S.deadline, overdue: 0, loan: false, perk: def.perk, endless: !!def.endless };
  cyc.bills.push(b); cyc.billIdx++;
  queueLetter({ kind: 'bill', bill: b });
  return b;
}

function payBill(b, amount) {
  amount = Math.min(amount, cyc.cash, b.amount - b.paid);
  if (amount <= 0) return false;
  cyc.cash -= amount; b.paid += amount;
  if (!b.loan) { cyc.paidTotal += amount; meta.stats.paid += amount; }
  if (b.amount - b.paid < .5) { b.paid = b.amount; billPaid(b); }
  save();
  return true;
}

function billPaid(b) {
  cyc.bills = cyc.bills.filter(x => x !== b);
  SFX.cash(); setTimeout(() => SFX.stamp(), 250);
  if (b.loan) { cyc.loan = null; queueLetter({ kind: 'loanPaid', bill: b }); refreshStats(); return; }
  let newPig = null;
  if (b.endless) cyc.endless++;
  else {
    cyc.paidPerks.push(b.idx);
    if (b.idx < PIGS.length - 1) { cyc.unl = Math.max(cyc.unl, b.idx + 2); newPig = PIGS[b.idx + 1]; }
  }
  refreshStats();
  queueLetter({ kind: 'paid', bill: b, pig: newPig });
  if (!b.endless && b.idx === BILLS.length - 1) {
    cyc.kingActive = true;
    queueLetter({ kind: 'king' });
  } else issueNextBill();
}

function requestLoan() {
  const reg = regularBill();
  const need = reg ? reg.amount - reg.paid - cyc.cash : 0;
  let amount = need > 0 ? need : Math.max(50, (reg ? reg.amount : 1000) * .5);
  amount = Math.ceil(amount);
  const repay = Math.ceil(amount * (1 + S.loanInt));
  return { amount, repay, due: 3 + S.deadline };
}
function takeLoan(offer) {
  const b = { idx: -1, name: 'Préstamo de Big Toni', icon: '🕴️', amount: offer.repay, paid: 0, due: offer.due, overdue: 0, loan: true, perk: 'Que Toni no te visite' };
  cyc.bills.push(b); cyc.loan = true; cyc.cash += offer.amount;
  meta.stats.toni++;
  save();
}

function lpForBankruptcy() { return Math.floor(cyc.paidTotal / 50 * S.lpMult); }
function declareBankruptcy() {
  const gain = lpForBankruptcy();
  const info = { gain, paid: cyc.paidTotal, rounds: cyc.round - 1, bills: cyc.paidPerks.length, cycle: meta.cycle };
  meta.lp += gain; meta.lpTotal += gain; meta.stats.bankrupt++; meta.cycle++;
  cyc = newCycle(); refreshStats();
  save();
  return info;
}

/* ============================================================
   MOTOR DE LA RONDA
   ============================================================ */
const mouse = { x: W / 2, y: H / 2, down: false, inside: false };
const HUD_CASH = { x: 64, y: 40 };
const HUD_TONI = { x: 760, y: 40 };
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/* Pesos de aparición. live=true tiene en cuenta lo que ya hay en la mesa (solo 1 Gambolito y 1 Arcoíris a la vez). */
function spawnWeights(live) {
  const un = PIGS.slice(0, cyc.unl).filter(p => p.w > 0);
  const special = ['gambolito', 'rainbow', 'toni', 'tourist'];
  const recent = un.filter(p => !special.includes(p.key)).slice(-3).reverse();
  const list = [];
  for (const p of un) {
    let w = p.w;
    if (p.key === 'gambolito') { if (live && R.gambSeen) continue; w *= S.gambleW; }   // como mucho uno por ronda
    if (p.key === 'rainbow' && live && R.pigs.some(q => q.type.key === 'rainbow')) continue;
    const ri = recent.indexOf(p); if (ri >= 0) w *= [1.7, 1.35, 1.15][ri];
    w *= 1 + S.rare * p.idx / 14;
    if (EXOTIC.includes(p.key)) w *= 1 + S.exotic;
    list.push([p, w]);
  }
  return list;
}
/* Probabilidad (0-1) de que cada cerdito sea el siguiente en aparecer */
function spawnOdds(stats) {
  const keep = S; if (stats) S = stats;
  const list = spawnWeights(false); S = keep;
  const tot = list.reduce((a, [, w]) => a + w, 0) || 1;
  const o = {}; list.forEach(([p, w]) => o[p.key] = w / tot);
  return o;
}
function pickType() {
  const list = spawnWeights(true);
  let x = Math.random() * list.reduce((a, [, w]) => a + w, 0);
  for (const [p, w] of list) { x -= w; if (x <= 0) return p; }
  return list[0][0];
}

function makePig(type, x, y) {
  return {
    type, x, y, r: type.r, hp: type.hp, maxHp: type.hp, hpFrac: 1, dir: Math.random() < .5 ? -1 : 1, t: Math.random() * 10,
    flash: 0, squash: 0, seed: (Math.random() * 1e9) | 0,
    glow: type.hp > 0 && type.key !== 'king' && type.key !== 'gambolito' && Math.random() < S.glow,
    vx: 0, vy: 0, kx: 0, ky: 0, tx: null, ty: null, wt: rnd(0, 1.5), z: 0, vz: 0, falling: false, spawnScale: 1,
    state: 'idle', st: rnd(1.5, 3.5), life: 0, contactCd: 0, id: ++pigId, moving: false, dead: false, hop: 0,
  };
}

function spawnPig(type, opts = {}) {
  type = type || pickType();
  const m = type.r * 1.3;
  const x = opts.x != null ? opts.x : rnd(DESK.x + m + 10, DESK.x + DESK.w - m - 10);
  const y = opts.y != null ? opts.y : rnd(DESK.y + m + 20, DESK.y + DESK.h - m - 6);
  const p = makePig(type, x, y);
  if (opts.drop) { p.z = rnd(260, 380); p.falling = true; }
  if (type.key === 'gambolito') { R.gambSeen = true; p.life = 0; text(x, y - 60, '¡Gambolito! 🎩', '#cdb8ff', 22, 1.6); }
  if (opts.pop) { p.spawnScale = 0; }
  if (type.beh === 'march') { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][rndi(0, 3)]; p.mx = d[0]; p.my = d[1]; p.st = rnd(3, 6); }
  if (p.glow) meta.stats.glow++;
  R.pigs.push(p);
  return p;
}

function startRun() {
  refreshStats();
  R = {
    pigs: [], parts: [], texts: [], coinsFx: [], rings: [], bolts: [], rocks: [], banners: [],
    st: S.stamina, maxSt: S.stamina, earned: 0, toni: 0, smashed: 0, best: 0, coins: [], jackpots: 0,
    cd: 0, swingT: 9, pending: [], spawnT: .6, rockT: S.rockInterval || 0, ended: false, endT: 0, windRolled: false,
    frenzy: 0, time: 0, cutRed: 0, shake: 0, paused: false, mini: null, cut: toniCut(), dispCash: cyc.cash,
    hint: meta.tutorial ? 7 : 0, tourists: 0, started: false, kingHit: false, startCash: cyc.cash, levelups: [],
  };
  for (let i = 0; i < S.startPigs; i++) spawnPig(null, { pop: true });
  R.pigs.forEach(p => { p.spawnScale = 0; p.spawnDelay = Math.random() * .5; });
  if (cyc.kingActive && !cyc.kingDead) {
    const k = spawnPig(KING, { x: DESK.x + DESK.w / 2, y: DESK.y + DESK.h / 2, drop: true });
    k.hp = cyc.kingHp; k.maxHp = KING.hp; k.hpFrac = k.hp / k.maxHp; k.st = 3;
    banner('¡EL REY CERDO!', '#ffd34d', 2.6);
  }
  if (R.cut > 0) banner(`Big Toni se queda un ${pct(R.cut)}`, '#ff5a5a', 2.6);
  meta.stats.runs++;
}

/* ---------- efectos ---------- */
function text(x, y, txt, col = '#fff', size = 22, life = 1, vy = -55) {
  R.texts.push({ x: x + rnd(-6, 6), y, txt, col, size, life, max: life, vy });
}
function banner(txt, col = '#fff', life = 2) { R.banners.push({ txt, col, life, max: life }); }
function ring(x, y, r0, r1, col, life = .3, w = 3) { R.rings.push({ x, y, r0, r1, col, life, max: life, w }); }
function dust(x, y, n = 6, col = 'rgba(230,210,180,') {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), sp = rnd(30, 110);
    R.parts.push({ k: 'dust', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .5, life: rnd(.3, .6), max: .6, s: rnd(4, 9), col });
  }
}
function shards(p, n) {
  const col = p.type.col;
  const cols = p.type.key === 'pinata' ? ['#ff5a8a', '#ffd34d', '#5ad1ff', '#7ee081', '#b57bff'] :
    p.type.key === 'rainbow' ? ['#ff5a5a', '#ffb347', '#ffe66d', '#7ee081', '#5ab0ff', '#b57bff'] :
      [col.body, col.dark, shade(col.body, .3)];
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), sp = rnd(80, 320) * (p.r / 25);
    R.parts.push({
      k: 'shard', x: p.x + rnd(-p.r, p.r) * .6, y: p.y + rnd(-p.r, p.r) * .4, z: rnd(5, p.r), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6,
      vz: rnd(120, 420), rot: rnd(0, TAU), vr: rnd(-14, 14), s: rnd(4, 10) * (p.r / 24), col: cols[i % cols.length], life: rnd(1.3, 2.2), max: 2.2,
      pts: [[rnd(-1, -.3), rnd(-1, -.2)], [rnd(.3, 1), rnd(-.8, 0)], [rnd(-.3, .5), rnd(.4, 1)]],
    });
  }
}
function coinBurst(x, y, n, toni) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), sp = rnd(60, 220);
    R.coinsFx.push({ x, y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, vz: rnd(150, 380), t: 0, delay: rnd(.25, .55) + i * .02, toni: !!toni, sp: 0 });
  }
}

/* ---------- dinero ---------- */
function earn(amount, x, y, n) {
  if (amount <= 0) return 0;
  const cut = Math.max(0, R.cut - R.cutRed);
  const net = amount * (1 - cut), toni = amount - net;
  cyc.cash += net; R.earned += net; R.toni += toni; meta.stats.earned += net; cyc.earnedTotal = (cyc.earnedTotal || 0) + net;
  const big = net >= 1000;
  text(x, y - 18, '+' + money(net), '#ffe066', big ? 26 : 21, 1.1, -60);
  coinBurst(x, y, n != null ? n : clamp(Math.round(Math.log10(amount + 1) * 2.2), 2, 16));
  if (toni > 0) coinBurst(x, y, Math.max(1, Math.round(cut * 6)), true);
  return net;
}

function avgLoot(T) { let a = 0; T.loot.forEach(([mn, mx, p]) => a += (mn + mx) / 2 * p); return a; }
/* Media de botín del cerdito normal (no exótico) más valioso desbloqueado */
function bestRegularLoot() {
  let best = 0;
  for (const p of PIGS.slice(0, cyc.unl)) if (p.hp > 0 && !EXOTIC.includes(p.key)) best = Math.max(best, avgLoot(p));
  return best;
}
/* Multiplicador de botín de un tipo de cerdito (solo afecta a los exóticos con escala) */
function lootScale(T) {
  const k = EXOTIC_SCALE[T.key];
  return k ? Math.max(1, k * bestRegularLoot() / avgLoot(T)) : 1;
}

function rollLoot(p) {
  const T = p.type;
  let v, jackpot = false;
  if (Math.random() < S.jackpot) {
    const best = Math.max(...T.loot.map(l => l[1]));
    v = best * 2; jackpot = true;
  } else {
    const ws = T.loot.map((l, i) => l[2] * (1 + S.luck * i * 1.5));
    const tot = ws.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot, tier = 0;
    for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) { tier = i; break; } }
    const [mn, mx] = T.loot[tier];
    v = rnd(mn, mx);
    if (T.key === 'goldie' && tier === T.loot.length - 1) jackpot = true;
    if (tier === T.loot.length - 1 && T.loot.length > 2 && !jackpot) text(p.x, p.y - p.r - 30, '¡GORDO!', '#7ef0ff', 22, 1.2);
  }
  if (jackpot) {
    R.jackpots++; meta.stats.jackpots++;
    banner('¡SÚPER JACKPOT!', '#ffd34d', 2.5); SFX.jackpot(); R.shake = 14;
  }
  let mult = S.lootTotal * (1 + .05 * masteryLevel(T.key)) * lootScale(T);
  if (p.glow) mult *= S.glowMult;
  if (Math.random() < S.dbl) { mult *= 2; text(p.x + 30, p.y - p.r - 10, 'x2', '#7ef07e', 26, 1); }
  return v * mult;
}

/* ---------- golpes ---------- */
function trySwing() {
  if (!R || R.cd > 0 || R.st <= 0 || R.ended || R.mini || R.paused) return;
  const spd = S.speed * (1 + Math.min(R.frenzy, S.frenzy));
  R.cd = 1 / spd;
  R.started = true;
  R.swingT = 0;
  R.swingDur = Math.min(.09, R.cd * .4);
  R.pending.push({ t: R.swingDur });
  SFX.swing();
  if (R.hint > 0 && R.time > 1.5) R.hint = Math.min(R.hint, 1.5);
}

function impact(x, y) {
  const hits = [];
  for (const p of R.pigs) {
    if (p.dead || (p.falling && p.z > 25)) continue;
    const d = Math.hypot(p.x - x, (p.y - y) * 1.1);
    if (d <= S.radiusPx + p.r * .6) hits.push(p);
  }
  ring(x, y, S.radiusPx * .4, S.radiusPx * 1.1, 'rgba(255,255,255,', .22, 3);
  if (!hits.length) { dust(x, y, 5); SFX.hit(false); R.shake = Math.max(R.shake, 1.5); return; }
  const crit = Math.random() < S.crit;
  const base = S.dmg;
  const dmg = base * (crit ? S.critMult : 1) + (hits.length >= 2 ? S.collat * base : 0);
  const times = Math.random() < S.dhit ? 2 : 1;
  if (times === 2) text(x, y - 60, '¡DOBLE!', '#9fd8ff', 20, .8);
  hits.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  for (const p of hits) {
    for (let k = 0; k < times; k++) damagePig(p, dmg, 'hammer', crit, x, y);
    if (!p.dead && S.midas > 0 && p.type.hp > 0 && p.type.key !== 'king' && Math.random() < S.midas) {
      earn(avgLoot(p.type) * lootScale(p.type) * .05 * S.lootTotal, p.x, p.y - 10, 2);
      R.parts.push({ k: 'spark', x: p.x, y: p.y, life: .4, max: .4, s: p.r * 1.2, col: '#ffd34d' });
    }
  }
  // sonido según material
  const k0 = hits[0].type.key;
  if (crit) SFX.crit(); else if (k0 === 'woody') SFX.wood(); else if (k0 === 'rocky' || k0 === 'viking') SFX.stone(); else SFX.hit(hits.length > 1);
  if (crit) { R.shake = Math.max(R.shake, 7); ring(x, y, 10, S.radiusPx * 1.6, 'rgba(255,220,80,', .3, 5); }
  else R.shake = Math.max(R.shake, 2.5 + hits.length * .7);
  dust(x, y, 4);

  // onda expansiva
  if (crit && S.shock > 0) {
    const R2 = S.radiusPx * 2.4;
    ring(x, y, S.radiusPx, R2, 'rgba(120,200,255,', .45, 6);
    for (const p of R.pigs) if (!p.dead && !hits.includes(p) && Math.hypot(p.x - x, p.y - y) < R2 + p.r) damagePig(p, dmg * S.shock, 'shock', false);
  }
  // electricidad
  if (S.elec > 0 && Math.random() < S.elec) chainLightning(hits[0], hits, base * S.elecDmg);
}

function chainLightning(from, exclude, dmg) {
  const done = new Set(exclude);
  let cur = from; const pts = [[cur.x, cur.y]];
  for (let i = 0; i < S.chains; i++) {
    let best = null, bd = 260;
    for (const p of R.pigs) {
      if (p.dead || done.has(p) || p.type.key === 'gambolito') continue;
      const d = Math.hypot(p.x - cur.x, p.y - cur.y); if (d < bd) { bd = d; best = p; }
    }
    if (!best) break;
    done.add(best); pts.push([best.x, best.y]);
    damagePig(best, dmg, 'elec', false);
    cur = best;
  }
  if (pts.length > 1) { R.bolts.push({ pts, life: .3, max: .3 }); SFX.zap(); }
}

function damagePig(p, dmg, src, crit, hx, hy) {
  if (p.dead) return;
  const T = p.type, key = T.key;
  if (key === 'gambolito') {
    if (src !== 'hammer' || R.gambBet) return;
    // no se rompe: acepta el reto y te espera al final de la ronda
    R.gambBet = true; p.dead = true;
    for (let i = 0; i < 10; i++) R.parts.push({ k: 'spark', x: p.x + rnd(-25, 25), y: p.y + rnd(-20, 20), life: rnd(.4, .8), max: .8, s: rnd(8, 16), col: ['#cdb8ff', '#ffd34d', '#ff92c6'][i % 3] });
    banner('🎩 Gambolito te reta al final de la ronda', '#cdb8ff', 2.4); SFX.levelup();
    return;
  }
  if (p.falling && p.z > 25) return;
  let d = dmg;
  if (key === 'woody' && p.hpFrac > .5) d *= .7;
  if (key === 'viking') d *= .8;
  if (key === 'pinata' && src === 'hammer' && Math.random() < .1) { d = Math.max(d, p.hp); text(p.x, p.y - p.r - 26, '¡PIÑATAZO!', '#ff92c6', 24, 1); }
  p.hp -= d; p.hpFrac = Math.max(0, p.hp / p.maxHp);
  p.flash = 1; p.squash = .55;
  if (hx != null) { const a = Math.atan2(p.y - hy, p.x - hx); const kb = key === 'king' ? 20 : 140; p.kx += Math.cos(a) * kb; p.ky += Math.sin(a) * kb; }
  const col = src === 'elec' ? '#9fd8ff' : src === 'rock' ? '#d6c2a3' : src === 'bomb' ? '#ff9a3c' : src === 'angry' ? '#ff6a5a' : src === 'spiky' ? '#7fd4c8' : crit ? '#ffdf3d' : '#ffffff';
  text(p.x + rnd(-10, 10), p.y - p.r - 6, (crit ? '¡' : '') + fmt(Math.max(1, d)) + (crit ? '!' : ''), col, crit ? 30 : src === 'hammer' ? 22 : 17, crit ? 1 : .8);
  if (d > R.best) R.best = d;
  if (d > meta.stats.bestHit) meta.stats.bestHit = d;
  if (key === 'king') {
    cyc.kingHp = Math.max(0, p.hp);
    if (src === 'hammer' && Math.random() < .5) earn(d * .4 * S.lootTotal, p.x + rnd(-40, 40), p.y - 30, 2);
  }
  if (p.hp <= 0) breakPig(p, src);
}

function breakPig(p, src) {
  p.dead = true;
  const T = p.type, key = T.key;
  R.smashed++; meta.stats.smashed++;
  const before = masteryLevel(key);
  meta.mastery[key] = (meta.mastery[key] || 0) + 1;
  const after = masteryLevel(key);
  if (after > before) { text(p.x, p.y - p.r - 50, `${T.name} nivel ${after}!`, '#b8ff8a', 20, 1.6, -30); SFX.levelup(); }
  R.frenzy += .01;

  if (key === 'king') return kingDefeated(p);

  const loot = rollLoot(p);
  earn(loot, p.x, p.y);
  shards(p, 12 + Math.round(p.r / 3));
  ring(p.x, p.y, p.r * .5, p.r * 2, 'rgba(255,240,220,', .3, 3);
  SFX.smash(); setTimeout(() => SFX.coin(), 120);
  R.shake = Math.max(R.shake, 4 + p.r / 10);
  if (p.glow) { R.parts.push({ k: 'spark', x: p.x, y: p.y, life: .6, max: .6, s: p.r * 3, col: '#ffe680' }); }

  // romper un exótico es un acontecimiento
  if (EXOTIC_SCALE[key] && key !== 'rainbow') {
    banner(`¡${T.name.toUpperCase()}!`, key === 'goldie' ? '#ffd34d' : key === 'toni' ? '#ff9a9a' : '#ff92c6', 1.8);
    for (let i = 0; i < 16; i++) { const a = rnd(0, TAU); R.parts.push({ k: 'spark', x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30, life: rnd(.4, .9), max: .9, s: rnd(10, 22), col: ['#ffd34d', '#ff92c6', '#ffffff'][i % 3] }); }
    SFX.jackpot();
  }
  switch (key) {
    case 'tourist': {
      // cada Turista de la ronda devuelve un poco menos (si no, la ronda sería infinita)
      const g = S.tourist * Math.pow(.8, R.tourists++);
      R.st = Math.min(R.maxSt, R.st + g);
      text(p.x, p.y - p.r - 40, `+${g.toFixed(1).replace('.', ',')} s`, '#7ef07e', 24, 1.3); SFX.heal();
      break;
    }
    case 'bomb': {
      const BR = 130;
      ring(p.x, p.y, 10, BR, 'rgba(255,150,40,', .45, 10);
      ring(p.x, p.y, 10, BR * .7, 'rgba(255,240,150,', .3, 16);
      for (let i = 0; i < 18; i++) { const a = rnd(0, TAU), sp = rnd(80, 260); R.parts.push({ k: 'fire', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(.3, .7), max: .7, s: rnd(10, 22) }); }
      SFX.boom(); R.shake = 16;
      for (const o of R.pigs) if (!o.dead && o !== p && Math.hypot(o.x - p.x, o.y - p.y) < BR + o.r) damagePig(o, S.dmg * 3, 'bomb', false, p.x, p.y);
      break;
    }
    case 'toni': {
      R.cutRed += .1;
      text(p.x, p.y - p.r - 40, 'Comisión de Toni -10%', '#ff9a9a', 20, 1.6);
      break;
    }
    case 'normalito': {
      if (cyc.unl > 5 && Math.random() < .7) {
        const b = spawnPig(PIG_BY_KEY.brotalito, { x: p.x, y: p.y, pop: true });
        b.spawnDelay = .25;
        text(p.x, p.y - 60, '¡Brotalito!', '#8fe07a', 18, 1);
      }
      break;
    }
    case 'rainbow': {
      banner('¡ARCOÍRIS!', '#ffffff', 1.8);
      for (let i = 0; i < 20; i++) { const a = rnd(0, TAU); R.parts.push({ k: 'spark', x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30, life: rnd(.4, .9), max: .9, s: rnd(10, 24), col: ['#ff5a5a', '#ffe66d', '#7ee081', '#5ab0ff', '#b57bff'][i % 5] }); }
      break;
    }
  }
  // monedas raras
  if (Math.random() < COIN_CHANCE * S.coinMult * (1 + S.luck)) {
    const i = rndi(0, COINS.length - 1);
    if (!meta.coins[i]) {
      meta.coins[i] = 1; R.coins.push(i); meta.stats.coinsFound++;
      banner('¡MONEDA RARA: ' + COINS[i].n.toUpperCase() + '!', '#ffd34d', 2.6); SFX.jackpot();
      refreshStats();
    } else {
      meta.coins[i]++;
      const reg = regularBill();
      const v = reg ? reg.amount * .05 : 100;
      text(p.x, p.y - p.r - 60, 'Moneda repetida (vendida)', '#ffd34d', 16, 1.4);
      earn(v, p.x, p.y, 3);
    }
  }
}

function kingDefeated(p) {
  cyc.kingHp = 0; cyc.kingDead = true; meta.won = true; meta.stats.kings++;
  shards(p, 80);
  for (let i = 0; i < 6; i++) setTimeout(() => { if (R) { ring(p.x + rnd(-80, 80), p.y + rnd(-60, 60), 10, 160, 'rgba(255,220,80,', .5, 10); SFX.boom(); } }, i * 180);
  banner('¡HAS DERROTADO AL REY CERDO!', '#ffd34d', 4);
  R.shake = 22;
  earn(KING.loot[0][0] * S.lootTotal, p.x, p.y, 30);
  SFX.jackpot();
  R.kingKilled = true;
  R.st = Math.max(R.st, 0);
}

/* ---------- comportamiento de los cerditos ---------- */
function wander(p, dt, sp) {
  p.wt -= dt;
  if (p.wt <= 0) {
    if (Math.random() < .35) { p.tx = null; p.wt = rnd(.6, 1.8); }
    else { p.tx = rnd(DESK.x + 50, DESK.x + DESK.w - 50); p.ty = rnd(DESK.y + 50, DESK.y + DESK.h - 40); p.wt = rnd(2, 5); }
  }
  if (p.tx != null) {
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d < 6) p.tx = null; else { p.vx = dx / d * sp; p.vy = dy / d * sp; return; }
  }
  p.vx *= .8; p.vy *= .8;
}

function updatePig(p, dt) {
  p.t += dt;
  p.flash = Math.max(0, p.flash - dt * 6);
  p.squash = Math.max(0, p.squash - dt * 4);
  if (p.spawnDelay > 0) { p.spawnDelay -= dt; return; }
  if (p.spawnScale < 1) { p.spawnScale = Math.min(1, p.spawnScale + dt * 4); if (p.spawnScale >= 1) p.squash = .5; }
  if (p.falling) {
    p.vz -= 1700 * dt; p.z += p.vz * dt;
    if (p.z <= 0) {
      p.z = 0;
      if (p.vz < -260) { p.vz = -p.vz * .28; p.squash = .7; dust(p.x, p.y + p.r * .8, 7); if (p.type.key === 'king') { R.shake = 18; SFX.boom(); } }
      else { p.vz = 0; p.falling = false; }
    }
    if (p.z > 30) return;
  }
  p.contactCd -= dt;
  const T = p.type, sp = T.spd;
  switch (T.beh) {
    case 'wander': wander(p, dt, sp); break;
    case 'hop': {
      p.hop += dt * 2.2;
      const ph = p.hop % 1;
      wander(p, dt, sp * 1.7);
      if (ph > .55) { p.vx *= 0; p.vy *= 0; p.z = 0; }
      else { p.z = Math.sin(ph / .55 * Math.PI) * 16; if (ph + dt * 2.2 > .55) p.squash = .4; }
      break;
    }
    case 'charge': {
      p.st -= dt;
      if (p.state === 'idle') {
        wander(p, dt, sp);
        if (p.st <= 0) {
          let best = null, bd = 420;
          for (const o of R.pigs) if (o !== p && !o.dead && o.type.key !== 'gambolito' && !o.falling) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < bd) { bd = d; best = o; } }
          if (best) { p.state = 'windup'; p.st = .55; p.target = best; } else p.st = 1.5;
        }
      } else if (p.state === 'windup') {
        p.vx = 0; p.vy = 0;
        if (p.target && !p.target.dead) p.dir = p.target.x > p.x ? 1 : -1;
        p.x += rnd(-1.5, 1.5);
        if (p.st <= 0) {
          const tg = p.target;
          if (!tg || tg.dead) { p.state = 'idle'; p.st = 1; break; }
          const a = Math.atan2(tg.y - p.y, tg.x - p.x);
          p.cvx = Math.cos(a) * 330; p.cvy = Math.sin(a) * 330; p.state = 'charge'; p.st = .9;
        }
      } else if (p.state === 'charge') {
        p.vx = p.cvx; p.vy = p.cvy;
        if (Math.random() < .5) R.parts.push({ k: 'dust', x: p.x - p.dir * p.r, y: p.y + p.r * .7, vx: 0, vy: 0, life: .4, max: .4, s: rnd(4, 8), col: 'rgba(230,210,180,' });
        for (const o of R.pigs) {
          if (o === p || o.dead || o.falling || o.type.key === 'gambolito') continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) < p.r + o.r) {
            damagePig(o, S.dmg * .7, 'angry', false, p.x, p.y);
            o.kx += p.cvx * .5; o.ky += p.cvy * .5;
            p.kx -= p.cvx * .4; p.ky -= p.cvy * .4;
            SFX.hit(true); R.shake = Math.max(R.shake, 4);
            p.state = 'idle'; p.st = rnd(2.5, 4.5); break;
          }
        }
        if (p.st <= 0 && p.state === 'charge') { p.state = 'idle'; p.st = rnd(2, 4); }
      }
      break;
    }
    case 'march': {
      p.st -= dt;
      p.vx = p.mx * sp; p.vy = p.my * sp * .8;
      const m = p.r * 1.2;
      const hitWall = (p.x < DESK.x + m && p.mx < 0) || (p.x > DESK.x + DESK.w - m && p.mx > 0) || (p.y < DESK.y + m && p.my < 0) || (p.y > DESK.y + DESK.h - p.r && p.my > 0);
      if (hitWall || p.st <= 0) {
        if (p.mx !== 0) { p.mx = 0; p.my = Math.random() < .5 ? 1 : -1; } else { p.my = 0; p.mx = Math.random() < .5 ? 1 : -1; }
        if (hitWall) { const tx = p.x + p.mx * 10, ty = p.y + p.my * 10; if (tx < DESK.x + m || tx > DESK.x + DESK.w - m) p.mx *= -1; if (ty < DESK.y + m || ty > DESK.y + DESK.h - p.r) p.my *= -1; }
        p.st = rnd(2.5, 5);
      }
      break;
    }
    case 'flee': {
      p.life += dt;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 190 && mouse.inside) { p.vx = dx / d * 240; p.vy = dy / d * 240; p.tx = null; }
      else wander(p, dt, sp);
      if (p.life > 14 + S.rainbowTime) {
        p.spawnScale -= dt * 3;
        if (!p.leaving) { p.leaving = true; text(p.x, p.y - 40, '¡Se escapó!', '#fff', 18, 1.2); }
        if (p.spawnScale <= 0) { p.dead = true; p.escaped = true; }
      }
      break;
    }
    case 'king': {
      wander(p, dt, sp);
      p.st -= dt;
      if (p.st <= 0) {
        p.st = rnd(4.5, 6.5);
        const pool = PIGS.slice(0, cyc.unl).filter(t => t.w > 0 && !EXOTIC.includes(t.key));   // el Rey no invoca exóticos
        for (let i = 0; i < 3; i++) {
          const t = pool[Math.max(0, pool.length - 1 - rndi(0, 3))];
          const a = rnd(0, TAU);
          spawnPig(t, { x: clamp(p.x + Math.cos(a) * 130, DESK.x + 50, DESK.x + DESK.w - 50), y: clamp(p.y + Math.sin(a) * 100, DESK.y + 50, DESK.y + DESK.h - 40), drop: true });
        }
        text(p.x, p.y - p.r - 30, '¡A MÍ, SÚBDITOS!', '#ffd34d', 22, 1.5);
      }
      break;
    }
  }
  // Gambolito se aburre y se va a los 9 s
  if (T.key === 'gambolito') {
    p.life += dt;
    if (p.life > 9) {
      p.spawnScale -= dt * 3;
      if (!p.leaving) { p.leaving = true; text(p.x, p.y - 40, 'Gambolito se aburrió...', '#cdb8ff', 18, 1.4); }
      if (p.spawnScale <= 0) p.dead = true;
    }
  }
  // pinchitos
  if (T.key === 'spiky' && p.contactCd <= 0) {
    for (const o of R.pigs) {
      if (o === p || o.dead || o.falling || o.type.key === 'spiky' || o.type.key === 'gambolito') continue;
      if (Math.hypot(o.x - p.x, o.y - p.y) < p.r * 1.3 + o.r) {
        damagePig(o, S.dmg * .5, 'spiky', false, p.x, p.y); p.contactCd = .6; break;
      }
    }
  }
  // movimiento
  p.x += (p.vx + p.kx) * dt; p.y += (p.vy + p.ky) * dt;
  const kd = Math.pow(.004, dt); p.kx *= kd; p.ky *= kd;
  const mx = p.r * 1.2, myT = p.r * 1.0, myB = p.r * .95;
  if (p.x < DESK.x + mx) { p.x = DESK.x + mx; p.kx = Math.abs(p.kx); if (T.beh !== 'march') p.tx = null; }
  if (p.x > DESK.x + DESK.w - mx) { p.x = DESK.x + DESK.w - mx; p.kx = -Math.abs(p.kx); if (T.beh !== 'march') p.tx = null; }
  if (p.y < DESK.y + myT) { p.y = DESK.y + myT; p.ky = Math.abs(p.ky); if (T.beh !== 'march') p.tx = null; }
  if (p.y > DESK.y + DESK.h - myB) { p.y = DESK.y + DESK.h - myB; p.ky = -Math.abs(p.ky); if (T.beh !== 'march') p.tx = null; }
  const v = Math.hypot(p.vx, p.vy);
  p.moving = v > 4;
  if (Math.abs(p.vx) > 3 && p.state !== 'windup') p.dir = p.vx > 0 ? 1 : -1;
}

function separate() {
  const ps = R.pigs;
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i]; if (a.dead || a.falling || a.spawnDelay > 0) continue;
    for (let j = i + 1; j < ps.length; j++) {
      const b = ps[j]; if (b.dead || b.falling || b.spawnDelay > 0) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy), min = (a.r + b.r) * .95;
      if (d < min && d > .01) {
        const o = (min - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.type.key === 'king' ? .05 : 1, wb = b.type.key === 'king' ? .05 : 1;
        a.x -= nx * o * wa; a.y -= ny * o * wa * .77; b.x += nx * o * wb; b.y += ny * o * wb * .77;
      }
    }
  }
}

/* ---------- rocas ---------- */
function dropRocks() {
  const alive = R.pigs.filter(p => !p.dead && !p.falling && p.type.key !== 'gambolito');
  for (let i = 0; i < S.rockCount; i++) {
    const tg = alive.length ? alive[rndi(0, alive.length - 1)] : null;
    const x = tg ? tg.x + rnd(-20, 20) : rnd(DESK.x + 80, DESK.x + DESK.w - 80);
    const y = tg ? tg.y + rnd(-15, 15) : rnd(DESK.y + 80, DESK.y + DESK.h - 60);
    R.rocks.push({ x, y, z: 520 + i * 90, vz: 0, r: rnd(14, 20), rot: rnd(0, TAU), seed: rndi(0, 1e6) });
  }
}

/* ---------- bucle de actualización ---------- */
function updateRun(dt) {
  if (!R || R.paused || R.mini) return;
  R.time += dt;
  R.cd -= dt; R.swingT += dt;
  if (R.hint > 0) R.hint -= dt;
  // el aguante es un temporizador: empieza a correr al primer golpe (o a los 2 s)
  if (!R.ended && (R.started || R.time > 2)) R.st = Math.max(0, R.st - dt * S.drain);
  if ((mouse.down || keyDown) && !R.ended) trySwing();
  for (let i = R.pending.length - 1; i >= 0; i--) {
    R.pending[i].t -= dt;
    if (R.pending[i].t <= 0) { R.pending.splice(i, 1); impact(mouse.x, mouse.y); }
  }
  // aparición
  if (!R.ended) {
    R.spawnT -= dt;
    const count = R.pigs.filter(p => !p.dead && p.type.key !== 'king' && p.type.key !== 'brotalito').length;
    if (R.spawnT <= 0) {
      if (count < S.maxPigs) spawnPig(null, { drop: true });
      R.spawnT = S.spawnInterval * rnd(.7, 1.3);
    }
    if (S.rockCount) {
      R.rockT -= dt;
      if (R.rockT <= 0) { dropRocks(); R.rockT = S.rockInterval; }
    }
  }
  for (const p of R.pigs) if (!p.dead) updatePig(p, dt);
  separate();
  R.pigs = R.pigs.filter(p => !p.dead);

  // rocas
  for (let i = R.rocks.length - 1; i >= 0; i--) {
    const k = R.rocks[i];
    k.vz -= 2200 * dt; k.z += k.vz * dt; k.rot += dt * 3;
    if (k.z <= 0) {
      R.rocks.splice(i, 1);
      SFX.rock(); R.shake = Math.max(R.shake, 5); dust(k.x, k.y, 8, 'rgba(200,190,170,');
      ring(k.x, k.y, 8, 55, 'rgba(210,200,180,', .3, 4);
      for (let q = 0; q < 6; q++) { const a = rnd(0, TAU), sp = rnd(60, 180); R.parts.push({ k: 'shard', x: k.x, y: k.y, z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, vz: rnd(80, 220), rot: 0, vr: rnd(-8, 8), s: rnd(3, 6), col: '#8d877e', life: 1.2, max: 1.2, pts: [[-1, -.6], [1, -.3], [0, 1]] }); }
      for (const p of R.pigs) if (!p.dead && Math.hypot(p.x - k.x, p.y - k.y) < 50 + p.r * .5) damagePig(p, S.dmg * 2 * S.rockDmg, 'rock', false, k.x, k.y);
    }
  }
  // partículas
  for (let i = R.parts.length - 1; i >= 0; i--) {
    const q = R.parts[i]; q.life -= dt;
    if (q.life <= 0) { R.parts.splice(i, 1); continue; }
    if (q.k === 'shard') {
      q.vz -= 1100 * dt; q.z += q.vz * dt;
      if (q.z <= 0) { q.z = 0; q.vz = -q.vz * .3; q.vx *= .55; q.vy *= .55; q.vr *= .5; if (Math.abs(q.vz) < 40) q.vz = 0; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.z === 0) { q.vx *= Math.pow(.05, dt); q.vy *= Math.pow(.05, dt); }
    } else if (q.k === 'dust' || q.k === 'fire') {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .9; q.vy *= .9;
    }
  }
  // monedas volando
  for (let i = R.coinsFx.length - 1; i >= 0; i--) {
    const c = R.coinsFx[i]; c.t += dt;
    if (c.t < c.delay) {
      c.vz -= 1200 * dt; c.z += c.vz * dt; if (c.z < 0) { c.z = 0; c.vz = -c.vz * .4; c.vx *= .6; c.vy *= .6; }
      c.x += c.vx * dt; c.y += c.vy * dt;
    } else {
      const tg = c.toni ? HUD_TONI : HUD_CASH;
      c.sp += 2600 * dt;
      const dx = tg.x - c.x, dy = tg.y - (c.y - c.z), d = Math.hypot(dx, dy);
      if (d < 20) { R.coinsFx.splice(i, 1); if (!c.toni) SFX.coin(); continue; }
      const st = Math.min(d, c.sp * dt);
      c.x += dx / d * st; c.y += dy / d * st;
    }
  }
  for (let i = R.texts.length - 1; i >= 0; i--) { const t = R.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= .96; if (t.life <= 0) R.texts.splice(i, 1); }
  for (let i = R.rings.length - 1; i >= 0; i--) { R.rings[i].life -= dt; if (R.rings[i].life <= 0) R.rings.splice(i, 1); }
  for (let i = R.bolts.length - 1; i >= 0; i--) { R.bolts[i].life -= dt; if (R.bolts[i].life <= 0) R.bolts.splice(i, 1); }
  for (let i = R.banners.length - 1; i >= 0; i--) { R.banners[i].life -= dt; if (R.banners[i].life <= 0) R.banners.splice(i, 1); }
  R.shake *= Math.pow(.002, dt);
  R.dispCash = lerp(R.dispCash, cyc.cash, Math.min(1, dt * 8));

  // fin de la ronda
  if (R.st <= 0 && !R.ended && R.pending.length === 0) {
    if (!R.windRolled && S.wind > 0) {
      R.windRolled = true;
      if (Math.random() < S.wind) { R.st = Math.ceil(R.maxSt * .25); banner('¡SEGUNDO ALIENTO!', '#7ef07e', 2); SFX.heal(); }
    }
    if (R.st <= 0) { R.ended = true; R.endT = 2.2; SFX.tired(); banner('Tu mano no puede más...', '#ffffff', 2.2); }
  }
  if (R.kingKilled && !R.ended) { R.ended = true; R.endT = 4.5; }
  if (R.ended) {
    R.endT -= dt;
    if (R.endT <= 0 && (R.coinsFx.length === 0 || R.endT < -1.5)) {
      if (R.gambBet && !R.gambDone) { R.gambDone = true; openGamble(); }
      else finishRun();
    }
  }
}
let keyDown = false;

/* ---------- dibujo de la ronda ---------- */
function drawRun(c) {
  // cada fotograma parte de un lienzo limpio y con el estado reiniciado
  c.setTransform(deskK, 0, 0, deskK, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.setLineDash([]);
  c.fillStyle = '#170e0a'; c.fillRect(0, 0, W, H);
  if (deskLost()) buildDesk(deskK);
  const sh = R.shake;
  c.save();
  if (sh > .3) c.translate(rnd(-sh, sh), rnd(-sh, sh));
  c.drawImage(deskCanvas, 0, 0, W, H);

  // sombras de rocas
  for (const k of R.rocks) {
    const s = clamp(1 - k.z / 700, .2, 1);
    c.fillStyle = `rgba(0,0,0,${.35 * s})`; ellipsePath(c, k.x, k.y + 6, k.r * 1.3 * s + 6, k.r * .45 * s + 2); c.fill();
  }
  // fragmentos en el suelo (debajo de los cerditos)
  for (const q of R.parts) if (q.k === 'shard' && q.z === 0) drawShard(c, q);

  // cerditos ordenados por profundidad
  const ps = R.pigs.slice().sort((a, b) => a.y - b.y);
  for (const p of ps) {
    if (p.spawnDelay > 0) continue;
    drawPig(c, p);
    if (p.type.hp > 0 && p.hpFrac < 1 && (p.maxHp >= 70 || p.type.key === 'king')) drawHpBar(c, p);
  }
  // fragmentos en el aire
  for (const q of R.parts) if (q.k === 'shard' && q.z > 0) drawShard(c, q);
  for (const q of R.parts) {
    const a = q.life / q.max;
    if (q.k === 'dust') { c.fillStyle = q.col + (a * .5) + ')'; ellipsePath(c, q.x, q.y, q.s * (2 - a), q.s * (2 - a) * .7); c.fill(); }
    else if (q.k === 'fire') { c.fillStyle = `rgba(255,${120 + 120 * a | 0},40,${a})`; ellipsePath(c, q.x, q.y, q.s * a, q.s * a); c.fill(); }
    else if (q.k === 'spark') { c.globalAlpha = a; c.fillStyle = q.col; star(c, q.x, q.y, q.s * (1.3 - a * .5)); c.fill(); c.globalAlpha = 1; }
  }
  // rocas cayendo
  for (const k of R.rocks) {
    c.save(); c.translate(k.x, k.y - k.z); c.rotate(k.rot);
    const rr = mulberry(k.seed);
    c.fillStyle = '#8d877e'; c.strokeStyle = '#4e4a44'; c.lineWidth = 2;
    c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = k.r * (.75 + rr() * .3); c.lineTo(Math.cos(a) * d, Math.sin(a) * d); } c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.2)'; ellipsePath(c, -k.r * .3, -k.r * .3, k.r * .3, k.r * .2); c.fill();
    c.restore();
  }
  // anillos de impacto
  for (const g of R.rings) {
    const a = g.life / g.max, rad = lerp(g.r1, g.r0, a);
    c.strokeStyle = g.col + (a * .8) + ')'; c.lineWidth = g.w * a + .5;
    ellipsePath(c, g.x, g.y, rad, rad * .75); c.stroke();
  }
  // rayos
  for (const b of R.bolts) {
    const a = b.life / b.max;
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? `rgba(255,255,255,${a})` : `rgba(120,190,255,${a * .7})`;
      c.lineWidth = pass ? 2 : 7;
      c.beginPath(); c.moveTo(b.pts[0][0], b.pts[0][1]);
      for (let i = 1; i < b.pts.length; i++) {
        const [x0, y0] = b.pts[i - 1], [x1, y1] = b.pts[i];
        for (let s = 1; s <= 5; s++) { const t = s / 5; c.lineTo(lerp(x0, x1, t) + (s < 5 ? rnd(-12, 12) : 0), lerp(y0, y1, t) + (s < 5 ? rnd(-12, 12) : 0)); }
      }
      c.stroke();
    }
  }
  // monedas
  for (const m of R.coinsFx) drawCoin(c, m.x, m.y - m.z, m.toni ? 7 : 8, m.toni, m.t);
  // textos
  for (const t of R.texts) {
    const a = Math.min(1, t.life / t.max * 2.5);
    const sc = t.life > t.max - .12 ? 1 + (t.life - (t.max - .12)) * 4 : 1;
    c.globalAlpha = a;
    c.font = `${t.size * sc | 0}px "Lilita One", "Arial Black", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 5; c.strokeStyle = 'rgba(40,20,10,.9)'; c.lineJoin = 'round';
    c.strokeText(t.txt, t.x, t.y); c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y);
    c.globalAlpha = 1;
  }
  c.restore();

  drawHud(c);
  // banners
  R.banners.forEach((b, i) => {
    const a = Math.min(1, b.life * 2, (b.max - b.life) * 6);
    const s = 1 + Math.max(0, .25 - (b.max - b.life)) * 2;
    c.globalAlpha = a;
    c.font = `${Math.round(46 * s)}px "Lilita One", "Arial Black", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const y = H * .42 + i * 58;
    c.lineWidth = 10; c.strokeStyle = 'rgba(30,12,6,.85)'; c.strokeText(b.txt, W / 2, y);
    c.fillStyle = b.col; c.fillText(b.txt, W / 2, y);
    c.globalAlpha = 1;
  });
  // aguante bajo: viñeta roja
  const f = R.st / R.maxSt;
  if (f < .25 && !R.ended) {
    const pulse = .5 + Math.sin(R.time * 8) * .5;
    const g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .65);
    g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${(.25 - f) * 1.4 * (.6 + pulse * .4)})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  // tutorial
  if (R.hint > 0) {
    c.globalAlpha = Math.min(1, R.hint);
    c.font = '26px "Lilita One", sans-serif'; c.textAlign = 'center';
    c.lineWidth = 6; c.strokeStyle = 'rgba(30,12,6,.9)';
    const t1 = 'Mantén pulsado el ratón para dar martillazos';
    const t2 = 'Tu aguante ✋ se agota con el tiempo — cuando llegue a cero, se acaba la ronda';
    c.strokeText(t1, W / 2, H - 70); c.fillStyle = '#fff'; c.fillText(t1, W / 2, H - 70);
    c.font = '19px "Nunito", sans-serif';
    c.strokeText(t2, W / 2, H - 40); c.fillStyle = '#ffe9c7'; c.fillText(t2, W / 2, H - 40);
    c.globalAlpha = 1;
  }
  // martillo (cursor)
  if (mouse.inside && !R.mini) {
    c.save();
    c.setLineDash([6, 6]); c.lineDashOffset = -R.time * 20;
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
    ellipsePath(c, mouse.x, mouse.y, S.radiusPx, S.radiusPx * .8); c.stroke();
    c.restore();
    const sd = R.swingDur || .08;
    let ang, sc;
    if (R.swingT < sd) { const t = R.swingT / sd; ang = lerp(.85, 0, t * t); sc = lerp(1.18, 1, t); }
    else { const t = clamp((R.swingT - sd) / .16, 0, 1); ang = lerp(0, .85, 1 - Math.pow(1 - t, 3)); sc = lerp(1, 1.18, t); }
    if (R.st <= 0) { ang = .85 + Math.sin(R.time * 2) * .05; }
    drawHammer(c, HAMMERS[cyc.hammer], mouse.x, mouse.y, ang, sc);
  }
}

function drawShard(c, q) {
  const a = Math.min(1, q.life / .5);
  c.save(); c.globalAlpha = a; c.translate(q.x, q.y - q.z); c.rotate(q.rot);
  c.fillStyle = q.col; c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
  c.beginPath(); q.pts.forEach(([x, y], i) => i ? c.lineTo(x * q.s, y * q.s) : c.moveTo(x * q.s, y * q.s)); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(q.pts[0][0] * q.s, q.pts[0][1] * q.s); c.lineTo(q.pts[1][0] * q.s * .6, q.pts[1][1] * q.s * .6); c.lineTo(0, 0); c.fill();
  c.restore();
}

function drawCoin(c, x, y, r, toni, t) {
  const w = Math.abs(Math.cos(t * 9)) * .7 + .3;
  c.fillStyle = toni ? '#b33' : '#c99a12';
  ellipsePath(c, x, y + 1.5, r * w, r); c.fill();
  c.fillStyle = toni ? '#ff6a6a' : '#ffd34d';
  ellipsePath(c, x, y, r * w, r); c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)'; ellipsePath(c, x - r * .3 * w, y - r * .3, r * .3 * w, r * .3); c.fill();
}

function drawHpBar(c, p) {
  const w = p.type.key === 'king' ? 220 : p.r * 2, h = p.type.key === 'king' ? 12 : 6;
  const x = p.x - w / 2, y = p.y - p.z - p.r * (p.type.key === 'king' ? 1.75 : 1.45) - h;
  c.fillStyle = 'rgba(20,10,5,.7)'; roundRect(c, x - 2, y - 2, w + 4, h + 4, 4); c.fill();
  c.fillStyle = p.hpFrac > .5 ? '#7ee081' : p.hpFrac > .25 ? '#ffd34d' : '#ff5a5a';
  roundRect(c, x, y, Math.max(2, w * p.hpFrac), h, 3); c.fill();
  if (p.type.key === 'king') {
    c.font = '15px "Lilita One", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff';
    c.fillText(fmt(p.hp) + ' / ' + fmt(p.maxHp), p.x, y - 10);
  }
}

function drawHud(c) {
  // barra superior
  const g = c.createLinearGradient(0, 0, 0, 92);
  g.addColorStop(0, 'rgba(25,14,9,.96)'); g.addColorStop(1, 'rgba(25,14,9,.75)');
  c.fillStyle = g; c.fillRect(0, 0, W, 90);
  c.fillStyle = 'rgba(255,200,120,.12)'; c.fillRect(0, 89, W, 2);

  // dinero
  drawCoin(c, HUD_CASH.x, HUD_CASH.y, 20, false, 0);
  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.font = '38px "Lilita One", "Arial Black", sans-serif';
  c.fillStyle = '#ffe066'; c.fillText(money(R.dispCash), 96, 36);
  c.font = '17px "Nunito", sans-serif'; c.fillStyle = '#d8c3a5';
  c.fillText('Esta ronda: +' + money(R.earned), 98, 68);

  // aguante
  const sx = 380, sy = 26, sw = 300, shh = 24;
  c.font = '30px ' + EMOJI_FONT; c.textAlign = 'center'; c.fillText('✋', sx - 24, sy + 13);
  c.fillStyle = 'rgba(0,0,0,.5)'; roundRect(c, sx, sy, sw, shh, 12); c.fill();
  const f = clamp(R.st / R.maxSt, 0, 1);
  const sg = c.createLinearGradient(sx, 0, sx + sw, 0);
  sg.addColorStop(0, '#ff5a4f'); sg.addColorStop(.35, '#ffc94d'); sg.addColorStop(1, '#7ee081');
  c.save(); roundRect(c, sx, sy, sw, shh, 12); c.clip();
  c.fillStyle = sg; c.fillRect(sx, sy, sw * f, shh);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(sx, sy, sw * f, shh * .4);
  c.restore();
  c.strokeStyle = 'rgba(255,230,200,.4)'; c.lineWidth = 2; roundRect(c, sx, sy, sw, shh, 12); c.stroke();
  c.font = '17px "Lilita One", sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center';
  c.fillText(Math.max(0, Math.ceil(R.st)) + ' s', sx + sw / 2, sy + 13);
  c.font = '14px "Nunito", sans-serif'; c.fillStyle = '#d8c3a5'; c.textAlign = 'left';
  c.fillText(`Ronda ${cyc.round}  ·  Rotos: ${R.smashed}  ·  Daño ${fmt(S.dmg)}`, sx, 68);
  if (R.gambBet) { c.fillStyle = '#cdb8ff'; c.font = '14px "Lilita One", ' + EMOJI_FONT; c.textAlign = 'right'; c.fillText('🎩 Apuesta al final', sx + sw, 68); c.textAlign = 'left'; }

  // Toni
  const cut = Math.max(0, R.cut - R.cutRed);
  if (cut > 0) {
    c.fillStyle = 'rgba(160,20,30,.85)'; roundRect(c, HUD_TONI.x - 34, 18, 150, 44, 22); c.fill();
    c.font = '28px ' + EMOJI_FONT; c.textAlign = 'center'; c.fillText('🕴️', HUD_TONI.x - 8, 41);
    c.font = '20px "Lilita One", sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left';
    c.fillText('-' + pct(cut), HUD_TONI.x + 16, 34);
    c.font = '12px "Nunito", sans-serif'; c.fillStyle = '#ffd0d0';
    c.fillText('Toni: ' + money(R.toni), HUD_TONI.x + 16, 52);
  }

  // factura actual
  const b = cyc.bills.slice().sort((a, b) => a.due - b.due)[0];
  if (b) {
    const bx = 930, by = 10, bw = 330, bh = 70;
    c.save(); c.translate(bx + bw / 2, by + bh / 2); c.rotate(-.012); c.translate(-bx - bw / 2, -by - bh / 2);
    c.fillStyle = '#f3ead6'; roundRect(c, bx, by, bw, bh, 6); c.fill();
    c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 4; i++) c.fillRect(bx + 60, by + 20 + i * 12, bw - 75, 1);
    c.font = '30px ' + EMOJI_FONT; c.textAlign = 'center'; c.fillStyle = '#000'; c.fillText(b.icon, bx + 30, by + bh / 2 + 2);
    c.textAlign = 'left'; c.fillStyle = '#3a2618'; c.font = '17px "Lilita One", sans-serif';
    c.fillText(b.name, bx + 58, by + 20);
    const rem = b.amount - b.paid;
    const prog = clamp((cyc.cash) / rem, 0, 1);
    c.fillStyle = 'rgba(0,0,0,.15)'; roundRect(c, bx + 58, by + 32, bw - 72, 12, 6); c.fill();
    c.fillStyle = prog >= 1 ? '#3fae5a' : '#d98a2b'; roundRect(c, bx + 58, by + 32, Math.max(6, (bw - 72) * prog), 12, 6); c.fill();
    c.font = '13px "Nunito", sans-serif'; c.fillStyle = '#3a2618';
    c.fillText(`${money(Math.min(cyc.cash, rem))} / ${money(rem)}`, bx + 58, by + 58);
    c.textAlign = 'right';
    c.fillStyle = b.overdue ? '#c0182c' : b.due <= 1 ? '#b8641a' : '#5a4630';
    c.font = '13px "Lilita One", sans-serif';
    c.fillText(b.overdue ? 'VENCIDA' : b.due === 0 ? '¡VENCE YA!' : `${b.due} ronda${b.due > 1 ? 's' : ''}`, bx + bw - 12, by + 58);
    c.restore();
  }
}
