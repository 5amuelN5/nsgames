/* ============================================================
   BILLS MUST BE PAID — datos del juego
   Todo lo que se puede equilibrar vive aquí.
   ============================================================ */

const W = 1280, H = 720;
const DESK = { x: 36, y: 100, w: 1208, h: 596 };
const RADIUS_UNIT = 21;          // 1 unidad de radio de golpe = 21 px
const BASE_STAMINA = 15;          // segundos de aguante por ronda

/* ---------- Cerditos ----------
   hp y tablas de botín sacadas del juego original.
   loot: [min, max, probabilidad]  (la suerte desplaza el peso hacia los niveles altos) */
const PIGS = [
  { key: 'normalito', name: 'Normalito', hp: 5, r: 21, spd: 26, beh: 'wander', w: 3,
    loot: [[4, 7, .66], [9, 12, .30], [27, 40, .04]],
    desc: 'Un cerdito normal y corriente. Cuantos más rompas, más sube de nivel (+5% de botín por nivel).',
    col: { body: '#f7a8b8', dark: '#e07b93', snout: '#f28aa3' } },
  { key: 'tourist', name: 'El Turista', hp: 20, r: 22, spd: 42, beh: 'wander', w: .8,
    loot: [[17, 29, .65], [32, 45, .32], [182, 264, .03]],
    desc: 'Viene de vacaciones. Romperlo te devuelve segundos de aguante.',
    col: { body: '#ffc4a8', dark: '#e99a7b', snout: '#f5a98a' } },
  { key: 'woody', name: 'Woody', hp: 70, r: 25, spd: 18, beh: 'wander', w: 2,
    loot: [[70, 98, .479], [111, 162, .30], [198, 264, .20], [693, 1040, .021]],
    desc: 'Recubierto de madera: recibe un 30% menos de daño hasta que pierde las tablas.',
    col: { body: '#c08a55', dark: '#8a5a2e', snout: '#a8733f' } },
  { key: 'pinata', name: 'Piñata', hp: 105, r: 25, spd: 36, beh: 'hop', w: .08,
    loot: [[2, 11, .17], [28, 54, .20], [108, 211, .20], [266, 458, .20], [668, 1071, .23]],
    desc: '¡Fiesta! Cada golpe tiene un 10% de romperla al instante. Muy rara. Su botín crece con tu mejor cerdito: vale unas 15 veces lo que él.',
    col: { body: '#ff6fb5', dark: '#d1458a', snout: '#ff92c6' } },
  { key: 'angry', name: 'Cerdito Furioso', hp: 190, r: 25, spd: 30, beh: 'charge', w: 1.5,
    loot: [[406, 647, .638], [734, 1139, .35], [1930, 2895, .012]],
    desc: 'Embiste a otros cerditos y les hace el 70% de tu daño base.',
    col: { body: '#ef5a4f', dark: '#b83228', snout: '#f27a70' } },
  { key: 'brotalito', name: 'Brotalito', hp: 420, r: 31, spd: 20, beh: 'wander', w: 0,
    loot: [[1151, 1541, .665], [1910, 2670, .31], [8898, 12804, .025]],
    desc: 'Le brota algo en la cabeza. 70% de probabilidad de aparecer al romper un Normalito.',
    col: { body: '#f08aa2', dark: '#c95a75', snout: '#e66f8b' } },
  { key: 'gambolito', name: 'Gambolito', hp: 0, r: 23, spd: 38, beh: 'wander', w: .035,
    loot: [[0, 0, 1]],
    desc: 'Rarísimo: como mucho uno por ronda y se marcha enseguida. No se rompe: si lo golpeas, al final de la ronda te reta al juego de los vasos para doblar lo ganado.',
    col: { body: '#9f7ae0', dark: '#6c48b0', snout: '#b597ea' } },
  { key: 'rocky', name: 'Rocky', hp: 840, r: 29, spd: 11, beh: 'wander', w: 2,
    loot: [[2191, 3067, .481], [3614, 4928, .30], [6023, 8323, .20], [8323, 12703, .019]],
    desc: 'Cara de piedra. Duro de pelar y muy lento.',
    col: { body: '#9a9a9f', dark: '#66666d', snout: '#87878d' } },
  { key: 'sgt', name: 'Sgt. Oink', hp: 1680, r: 27, spd: 75, beh: 'march', w: 2,
    loot: [[4620, 6820, .461], [7480, 10670, .33], [12430, 16060, .19], [46200, 74800, .019]],
    desc: 'Marcha en línea recta y gira al chocar con los bordes. ¡Ar!',
    col: { body: '#8fa06a', dark: '#5f6d3f', snout: '#a7b67f' } },
  { key: 'bomb', name: 'Cerdito Bomba', hp: 3000, r: 28, spd: 22, beh: 'wander', w: 1.2,
    loot: [[9946, 16576, .627], [18786, 27626, .36], [121551, 183431, .013]],
    desc: 'Explota al romperse y daña a todos los cerditos cercanos.',
    col: { body: '#3a3a44', dark: '#1d1d24', snout: '#52525e' } },
  { key: 'spiky', name: 'Pinchitos', hp: 3360, r: 28, spd: 30, beh: 'wander', w: 1.5,
    loot: [[11475, 15606, .467], [17213, 25016, .33], [26967, 38442, .19], [135405, 199665, .013]],
    desc: 'Pincha a los cerditos que toca con el 50% de tu daño base.',
    col: { body: '#5cc2b4', dark: '#2f8a7d', snout: '#7fd4c8' } },
  { key: 'rainbow', name: 'Cerdito Arcoíris', hp: 748, r: 22, spd: 70, beh: 'flee', w: .03,
    loot: [[92000, 138000, .349], [149500, 241500, .468], [276000, 368000, .12], [402500, 517500, .06], [2650000, 3800000, .003]],
    desc: 'Rarísimo, frágil y escurridizo. Huye del martillo y suelta una fortuna: unas 50 veces lo que tu mejor cerdito.',
    col: { body: '#ffffff', dark: '#c9c9ff', snout: '#ffd1f0' } },
  { key: 'viking', name: 'Vikingo', hp: 13440, r: 31, spd: 22, beh: 'wander', w: 2,
    loot: [[46301, 64821, .487], [79868, 111121, .30], [135428, 185201, .20], [463001, 631996, .013]],
    desc: 'Duro como el invierno nórdico. Su casco absorbe un 20% del daño.',
    col: { body: '#f2b19a', dark: '#c77f68', snout: '#e99a84' } },
  { key: 'toni', name: 'El Cerdo de Toni', hp: 26880, r: 30, spd: 30, beh: 'wander', w: .06,
    loot: [[104835, 142190, .349], [154240, 248387, .465], [277150, 339810, .12], [371140, 462720, .06], [1860000, 2840000, .006]],
    desc: 'La hucha personal de Big Toni. Romperla reduce su comisión un 10% durante la ronda Muy raro: suelta unas 18 veces lo que tu mejor cerdito.',
    col: { body: '#e8a0ae', dark: '#b46b7c', snout: '#d98597' } },
  { key: 'goldie', name: 'Goldie', hp: 53760, r: 33, spd: 16, beh: 'wander', w: .2,
    loot: [[204068, 297045, .349], [321195, 519122, .465], [598920, 741405, .12], [828345, 1060000, .05], [5560000, 8040000, .006], [16070000, 16070000, .01]],
    desc: 'La reina de las huchas: rarísima, durísima y vale unas 20 veces tu mejor cerdito normal. 1% de SÚPER JACKPOT.',
    col: { body: '#ffd34d', dark: '#c99a12', snout: '#ffe07a' } },
];
const KING = { key: 'king', name: 'El Rey Cerdo', hp: 8000000000, r: 92, spd: 22, beh: 'king', w: 0,
  loot: [[8000000000, 8000000000, 1]],
  desc: 'El jefe final. Su vida no se regenera entre rondas. Invoca a sus súbditos.',
  col: { body: '#f5a2b4', dark: '#c46d82', snout: '#ee8aa2' } };
const PIG_BY_KEY = {}; PIGS.forEach((p, i) => { p.idx = i; p.r = Math.round(p.r * 1.35); PIG_BY_KEY[p.key] = p; }); PIG_BY_KEY.king = KING; KING.idx = 15;

const MASTERY_STEPS = [10, 30, 75, 150, 300, 600, 1200, 2500, 5000, 10000];

/* ---------- Martillos ---------- */
const HAMMERS = [
  { name: 'Martillo viejo', cost: 0, dmg: 3, spd: 1.2, radius: 2.0, crit: .05, critMult: 2, head: '#6b6f78', handle: '#8a5a2e', hw: 22, hh: 44,
    desc: 'El de la caja de herramientas del abuelo. Algo es algo.' },
  { name: 'Martillo de juguete', cost: 1000, dmg: 9, spd: 1.76, radius: 2.3, crit: .05, critMult: 2, head: '#ff5a5a', handle: '#ffd34d', hw: 24, hh: 48,
    desc: 'Chirría al golpear. Rápido y sorprendentemente eficaz.' },
  { name: 'Martillo de carpintero', cost: 25000, dmg: 25, spd: 1.5, radius: 2.3, crit: .10, critMult: 2.5, head: '#3c4048', handle: '#c98b4a', hw: 22, hh: 50,
    desc: 'Equilibrado y preciso. Más críticos.' },
  { name: 'Mazo de goma', cost: 500000, dmg: 60, spd: 1.1, radius: 3.4, crit: .05, critMult: 2, head: '#2b2b2b', handle: '#d9b98c', hw: 34, hh: 58,
    desc: 'Área enorme. Perfecto para mesas llenas.' },
  { name: 'Martillo de bola', cost: 6000000, dmg: 180, spd: 1.7, radius: 2.2, crit: .20, critMult: 4, head: '#5b6470', handle: '#6b3f1f', hw: 22, hh: 46,
    desc: 'Precisión pura: críticos devastadores (x4).' },
  { name: 'Almádena', cost: 80000000, dmg: 600, spd: 0.9, radius: 3.8, crit: .08, critMult: 2.5, head: '#4a4f57', handle: '#a0703e', hw: 38, hh: 64,
    desc: 'Lenta, pesada y brutal.' },
  { name: 'Martillo neumático', cost: 600000000, dmg: 700, spd: 3.0, radius: 2.2, crit: .10, critMult: 2, head: '#e8b400', handle: '#333', hw: 26, hh: 52,
    desc: 'RATATATATÁ. Tres golpes por segundo.' },
  { name: 'Martillo del trueno', cost: 6000000000, dmg: 3000, spd: 1.5, radius: 3.2, crit: .15, critMult: 3, elec: .20, head: '#7fb2ff', handle: '#5a3d8a', hw: 30, hh: 58,
    desc: 'Forjado en una tormenta. +20% de probabilidad de electrocutar.' },
  { name: 'Martillo de oro', cost: 40000000000, dmg: 9000, spd: 1.6, radius: 3.5, crit: .15, critMult: 3, loot: 1.5, head: '#ffd34d', handle: '#7a1f2b', hw: 32, hh: 60,
    desc: 'Todo lo que toca vale más. +50% de botín.' },
];

/* ---------- Facturas ---------- */
const BILLS = [
  { n: 'Factura de la luz', i: '💡', a: 60, d: 3, perk: '+10% de botín (por fin ves lo que rompes)', f: s => { s.loot += .10; } },
  { n: 'Factura del agua', i: '🚰', a: 500, d: 3, perk: '+3 s de aguante', f: s => { s.stamina += 3; } },
  { n: 'Internet y móvil', i: '📶', a: 2000, d: 3, perk: '+1 cerdito máximo en la mesa', f: s => { s.maxPigs += 1; } },
  { n: 'El alquiler', i: '🏠', a: 9000, d: 4, perk: '+10% de velocidad de ataque', f: s => { s.spd += .10; } },
  { n: 'Seguro del coche', i: '🚗', a: 40000, d: 4, perk: '+15% de botín', f: s => { s.loot += .15; } },
  { n: 'Cuota del gimnasio', i: '🏋️', a: 180000, d: 4, perk: '+10% de daño', f: s => { s.dmgPct += .10; } },
  { n: 'Factura del dentista', i: '🦷', a: 800000, d: 4, perk: '+5 s de aguante', f: s => { s.stamina += 5; } },
  { n: 'Hacienda', i: '🏛️', a: 3500000, d: 4, perk: '+15% de botín', f: s => { s.loot += .15; } },
  { n: 'Tarjeta de crédito', i: '💳', a: 15000000, d: 5, perk: '+5% de probabilidad de crítico', f: s => { s.crit += .05; } },
  { n: 'Factura del hospital', i: '🏥', a: 60000000, d: 5, perk: '+0.3 de radio de golpe', f: s => { s.radius += .3; } },
  { n: 'Matrícula universitaria', i: '🎓', a: 250000000, d: 5, perk: '+20% de botín', f: s => { s.loot += .20; } },
  { n: 'La hipoteca', i: '🏦', a: 1000000000, d: 5, perk: '+15% de daño', f: s => { s.dmgPct += .15; } },
  { n: 'Multas acumuladas', i: '🚓', a: 4000000000, d: 5, perk: '+5 s de aguante', f: s => { s.stamina += 5; } },
  { n: 'Deuda de juego', i: '🎲', a: 15000000000, d: 6, perk: '+25% de botín', f: s => { s.loot += .25; } },
  { n: 'LA FACTURA FINAL', i: '👑', a: 60000000000, d: 6, perk: 'El Rey Cerdo aparecerá en tu mesa', f: s => {} },
];

/* ---------- Árbol de habilidades ----------
   b = rama (ángulo), d = profundidad, l = desplazamiento lateral */
const BRANCH_ANGLE = { dmg: -90, loot: -45, spd: 0, spawn: 45, sta: 90, toni: 135, area: 180, luck: -135 };
const SKILLS = [
  // ---- Daño (arriba)
  { id: 'grip', b: 'dmg', d: 1, l: 0, req: 'root', n: 'Agarre firme', i: '✊', max: 5, cost: 15, g: 2.0, t: '+1 de daño base', f: (s, l) => { s.flat += l; } },
  { id: 'moredmg', b: 'dmg', d: 2, l: 0, req: 'grip', n: 'Más daño', i: '💪', max: 10, cost: 60, g: 2.1, t: '+10% de daño y +1 de daño base', f: (s, l) => { s.dmgPct += .1 * l; s.flat += l; } },
  { id: 'crit', b: 'dmg', d: 3, l: -.55, req: 'moredmg', n: 'Ojo certero', i: '🎯', max: 5, cost: 150, g: 2.3, t: '+4% de probabilidad de crítico', f: (s, l) => { s.crit += .04 * l; } },
  { id: 'critd', b: 'dmg', d: 4, l: -.55, req: 'crit', n: 'Crítico brutal', i: '💥', max: 5, cost: 600, g: 2.4, t: '+50% de daño crítico', f: (s, l) => { s.critMult += .5 * l; } },
  { id: 'shock', b: 'dmg', d: 5, l: -.55, req: 'critd', n: 'Onda expansiva', i: '🌊', max: 5, cost: 1000000, g: 2.6, t: 'Los críticos sueltan una onda que hace un 40% de daño (+15%/nivel) alrededor', f: (s, l) => { if (l) s.shock = .25 + .15 * l; } },
  { id: 'brute', b: 'dmg', d: 3, l: .55, req: 'moredmg', n: 'Fuerza bruta', i: '🦍', max: 10, cost: 30000, g: 2.3, t: '+25% de daño', f: (s, l) => { s.dmgPct += .25 * l; } },
  { id: 'titan', b: 'dmg', d: 4, l: .55, req: 'brute', n: 'Brazo de titán', i: '🗿', max: 10, cost: 20000000, g: 2.5, t: '+50% de daño', f: (s, l) => { s.dmgPct += .5 * l; } },
  { id: 'god', b: 'dmg', d: 5, l: .55, req: 'titan', n: 'Puño divino', i: '☄️', max: 5, cost: 2000000000, g: 2.9, t: '+100% de daño', f: (s, l) => { s.dmgPct += 1 * l; } },
  // ---- Botín (arriba-derecha)
  { id: 'couch', b: 'loot', d: 1, l: 0, req: 'root', n: 'Rebuscar en el sofá', i: '🛋️', max: 1, cost: 12, g: 1.0, t: '+35% de botín de todas las fuentes', f: (s, l) => { s.loot += .35 * l; } },
  { id: 'moreloot', b: 'loot', d: 2, l: 0, req: 'couch', n: 'Más botín', i: '💰', max: 1, cost: 40, g: 1.0, t: '+30% de botín de todas las fuentes', f: (s, l) => { s.loot += .30 * l; } },
  { id: 'loot2', b: 'loot', d: 3, l: 0, req: 'moreloot', n: 'Más botín II', i: '💵', max: 10, cost: 250, g: 2.05, t: '+15% de botín de todas las fuentes', f: (s, l) => { s.loot += .15 * l; } },
  { id: 'double', b: 'loot', d: 4, l: -.55, req: 'loot2', n: 'Botín doble', i: '👯', max: 5, cost: 600, g: 2.4, t: '+7% de probabilidad de que un cerdito suelte el doble', f: (s, l) => { s.dbl += .07 * l; } },
  { id: 'midas', b: 'loot', d: 4, l: .55, req: 'loot2', n: 'Toque de Midas', i: '✨', max: 5, cost: 100000, g: 2.6, t: 'Cada golpe tiene un 8% (+4%/nivel) de soltar monedas aunque no rompa nada', f: (s, l) => { if (l) s.midas = .04 + .04 * l; } },
  { id: 'loot3', b: 'loot', d: 5, l: 0, req: 'loot2', n: 'Bolsillos profundos', i: '👖', max: 10, cost: 2000000, g: 2.4, t: '+40% de botín de todas las fuentes', f: (s, l) => { s.loot += .4 * l; } },
  { id: 'jackpot', b: 'loot', d: 6, l: 0, req: 'loot3', n: 'Súper Jackpot', i: '🎰', max: 1, cost: 500000000, g: 1.0, t: 'Cada cerdito tiene un 0,5% de soltar el doble de su mejor botín posible', f: (s, l) => { s.jackpot += .005 * l; } },
  // ---- Velocidad (derecha)
  { id: 'caff', b: 'spd', d: 1, l: 0, req: 'root', n: 'Adicción a la cafeína', i: '☕', max: 1, cost: 12, g: 1.0, t: '+25% de velocidad de ataque', f: (s, l) => { s.spd += .25 * l; } },
  { id: 'sugar', b: 'spd', d: 2, l: 0, req: 'caff', n: 'Subidón de azúcar', i: '🍬', max: 5, cost: 50, g: 2.2, t: '+10% de velocidad de ataque', f: (s, l) => { s.spd += .1 * l; } },
  { id: 'espresso', b: 'spd', d: 3, l: -.55, req: 'sugar', n: 'Espresso doble', i: '🫖', max: 10, cost: 20000, g: 2.15, t: '+5% de velocidad de ataque', f: (s, l) => { s.spd += .05 * l; } },
  { id: 'dhit', b: 'spd', d: 3, l: .55, req: 'sugar', n: 'Golpe doble', i: '✌️', max: 5, cost: 5000, g: 2.4, t: '5% de probabilidad por nivel de que un golpe cuente dos veces', f: (s, l) => { s.dhit += .05 * l; } },
  { id: 'hyper', b: 'spd', d: 4, l: -.55, req: 'espresso', n: 'Hiperactivo', i: '⚡', max: 10, cost: 10000000, g: 2.4, t: '+8% de velocidad de ataque', f: (s, l) => { s.spd += .08 * l; } },
  { id: 'frenzy', b: 'spd', d: 4, l: .55, req: 'dhit', n: 'Frenesí', i: '🔥', max: 5, cost: 2000000, g: 2.6, t: 'Cada cerdito roto da +1% de velocidad durante la ronda (máx. 20% por nivel)', f: (s, l) => { s.frenzy += .2 * l; } },
  // ---- Cerditos (abajo-derecha)
  { id: 'morepigs', b: 'spawn', d: 1, l: 0, req: 'root', n: 'Más cerditos', i: '🐷', max: 5, cost: 30, g: 2.0, t: '+2 cerditos al empezar la ronda', f: (s, l) => { s.startPigs += 2 * l; } },
  { id: 'breed', b: 'spawn', d: 2, l: 0, req: 'morepigs', n: 'Cría rápida', i: '🥚', max: 8, cost: 90, g: 2.1, t: '+15% de velocidad de aparición', f: (s, l) => { s.spawnRate += .15 * l; } },
  { id: 'farm', b: 'spawn', d: 3, l: -.5, req: 'breed', n: 'Granja', i: '🏡', max: 8, cost: 300, g: 2.3, t: '+1 cerdito máximo en la mesa', f: (s, l) => { s.maxPigs += l; } },
  { id: 'select', b: 'spawn', d: 3, l: .5, req: 'breed', n: 'Cerditos selectos', i: '🧬', max: 5, cost: 10000, g: 2.6, t: 'Los cerditos más valiosos aparecen más a menudo', f: (s, l) => { s.rare += .25 * l; } },
  { id: 'exotic', b: 'spawn', d: 4, l: .8, req: 'select', n: 'Imán de rarezas', i: '🦄', max: 10, cost: 6000, g: 2.2, t: '+40% de probabilidad de que aparezcan cerditos exóticos (Piñata, Gambolito, Arcoíris, Cerdo de Toni y Goldie)', f: (s, l) => { s.exotic += .4 * l; } },
  { id: 'safari', b: 'spawn', d: 5, l: .8, req: 'exotic', n: 'Safari porcino', i: '🧭', max: 5, cost: 2000000, g: 2.6, t: '+100% de probabilidad de cerditos exóticos y el Arcoíris tarda 3 s más en escapar', f: (s, l) => { s.exotic += 1 * l; s.rainbowTime += 3 * l; } },
  { id: 'glow', b: 'spawn', d: 4, l: 0, req: 'farm', n: 'Cerditos brillantes', i: '🌟', max: 5, cost: 8000, g: 2.6, t: '+2% de probabilidad de que un cerdito brille (x5 botín)', f: (s, l) => { s.glow += .02 * l; } },
  { id: 'glowx', b: 'spawn', d: 5, l: 0, req: 'glow', n: 'Brillo cegador', i: '💎', max: 3, cost: 20000000, g: 3.4, t: 'Los cerditos brillantes dan +3x de botín', f: (s, l) => { s.glowMult += 3 * l; } },
  // ---- Aguante (abajo)
  { id: 'gym', b: 'sta', d: 1, l: 0, req: 'root', n: 'Cuota de gimnasio', i: '🏋️', max: 1, cost: 12, g: 1.0, t: '+8 s de aguante', f: (s, l) => { s.stamina += 8 * l; } },
  { id: 'energy', b: 'sta', d: 2, l: 0, req: 'gym', n: 'Bebida energética', i: '🥤', max: 8, cost: 25, g: 2.1, t: '+4 s de aguante', f: (s, l) => { s.stamina += 4 * l; } },
  { id: 'eff', b: 'sta', d: 3, l: -.55, req: 'energy', n: 'Respiración profunda', i: '🍃', max: 5, cost: 400, g: 2.4, t: 'El aguante se gasta un 4% más despacio', f: (s, l) => { s.eff += .04 * l; } },
  { id: 'wind', b: 'sta', d: 3, l: .55, req: 'energy', n: 'Segundo aliento', i: '🌬️', max: 4, cost: 8000, g: 2.6, t: '15% por nivel de recuperar el 25% del aguante al agotarte (1 vez por ronda)', f: (s, l) => { s.wind += .15 * l; } },
  { id: 'guide', b: 'sta', d: 4, l: -.55, req: 'eff', n: 'Guía turístico', i: '🧳', max: 5, cost: 1000, g: 2.3, t: 'Los Turistas restauran +1 s de aguante extra', f: (s, l) => { s.tourist += 2 * l; } },
  { id: 'marathon', b: 'sta', d: 4, l: .55, req: 'wind', n: 'Maratoniano', i: '🏃', max: 10, cost: 3000000, g: 2.4, t: '+3 s de aguante', f: (s, l) => { s.stamina += 3 * l; } },
  // ---- Toni (abajo-izquierda)
  { id: 'nego', b: 'toni', d: 1, l: 0, req: 'root', n: 'Negociar con Toni', i: '🤝', max: 5, cost: 100, g: 2.4, t: '-5% de comisión de Big Toni', f: (s, l) => { s.toniRed += .05 * l; } },
  { id: 'lawyer', b: 'toni', d: 2, l: 0, req: 'nego', n: 'Abogado barato', i: '⚖️', max: 2, cost: 8000, g: 6.4, t: '+1 ronda de plazo en cada factura nueva', f: (s, l) => { s.deadline += l; } },
  { id: 'interest', b: 'toni', d: 3, l: -.5, req: 'lawyer', n: 'Intereses bajos', i: '📉', max: 3, cost: 2000, g: 3.4, t: 'Los préstamos de Toni cobran un 10% menos de interés', f: (s, l) => { s.loanInt -= .1 * l; } },
  { id: 'tahur', b: 'toni', d: 3, l: .5, req: 'lawyer', n: 'Tahúr', i: '🃏', max: 1, cost: 100000, g: 1.0, t: 'Gambolito paga x3 en lugar de x2', f: (s, l) => { if (l) s.gamble = 3; } },
  // ---- Área y habilidades (izquierda)
  { id: 'bigger', b: 'area', d: 1, l: 0, req: 'root', n: 'Martillo más grande', i: '🔨', max: 1, cost: 12, g: 1.0, t: '+0.3 de radio de golpe', f: (s, l) => { s.radius += .3 * l; } },
  { id: 'wrist', b: 'area', d: 2, l: 0, req: 'bigger', n: 'Muñeca de acero', i: '🦾', max: 5, cost: 80, g: 2.3, t: '+0.15 de radio de golpe', f: (s, l) => { s.radius += .15 * l; } },
  { id: 'collat', b: 'area', d: 3, l: -.55, req: 'wrist', n: 'Daño colateral', i: '🎳', max: 5, cost: 70, g: 2.3, t: '+25% de tu daño base si el golpe alcanza a 2+ cerditos', f: (s, l) => { s.collat += .25 * l; } },
  { id: 'reach', b: 'area', d: 3, l: .55, req: 'wrist', n: 'Brazo largo', i: '📏', max: 5, cost: 25000, g: 2.6, t: '+0.2 de radio de golpe', f: (s, l) => { s.radius += .2 * l; } },
  { id: 'rock', b: 'area', d: 4, l: -.55, req: 'collat', n: 'Lluvia de rocas', i: '🪨', max: 5, cost: 15000, g: 3.4, t: 'Caen rocas sobre la mesa cada pocos segundos (+1 roca y más frecuentes por nivel)', f: (s, l) => { s.rock += l; } },
  { id: 'rockdmg', b: 'area', d: 5, l: -.55, req: 'rock', n: 'Rocas pesadas', i: '⛰️', max: 5, cost: 3000000, g: 2.9, t: '+100% de daño de las rocas', f: (s, l) => { s.rockDmg += l; } },
  { id: 'elec', b: 'area', d: 4, l: .55, req: 'reach', n: 'Martillo eléctrico', i: '🔌', max: 5, cost: 500000, g: 2.9, t: '10% (+5%/nivel) de electrocutar a los cerditos cercanos con el 60% del daño', f: (s, l) => { if (l) s.elec += .05 + .05 * l; } },
  { id: 'storm', b: 'area', d: 5, l: .55, req: 'elec', n: 'Tormenta', i: '🌩️', max: 5, cost: 30000000, g: 2.9, t: '+1 salto eléctrico y +30% de daño eléctrico', f: (s, l) => { s.chains += l; s.elecDmg += .3 * l; } },
  // ---- Suerte (arriba-izquierda)
  { id: 'lucky', b: 'luck', d: 1, l: 0, req: 'root', n: 'Nacido con suerte', i: '🍀', max: 5, cost: 35, g: 2.2, t: '+6% de suerte (mejores niveles de botín)', f: (s, l) => { s.luck += .06 * l; } },
  { id: 'hunter', b: 'luck', d: 2, l: 0, req: 'lucky', n: 'Cazamonedas', i: '🔍', max: 5, cost: 500, g: 2.6, t: '+50% de probabilidad de encontrar monedas raras', f: (s, l) => { s.coinMult += .5 * l; } },
  { id: 'clover', b: 'luck', d: 3, l: 0, req: 'hunter', n: 'Trébol de cuatro hojas', i: '☘️', max: 5, cost: 300000, g: 2.6, t: '+10% de suerte', f: (s, l) => { s.luck += .1 * l; } },
  { id: 'horseshoe', b: 'luck', d: 4, l: 0, req: 'clover', n: 'Herradura dorada', i: '🧲', max: 5, cost: 100000000, g: 2.8, t: '+20% de suerte y +5% de botín doble', f: (s, l) => { s.luck += .2 * l; s.dbl += .05 * l; } },
];
/* Cerditos exóticos: los que potencian «Imán de rarezas» y «Safari porcino» */
const EXOTIC = ['pinata', 'gambolito', 'rainbow', 'toni', 'goldie'];
/* Los exóticos nunca quedan desfasados: su botín vale como mínimo N veces la media del
   cerdito normal más valioso que tengas desbloqueado. */
const EXOTIC_SCALE = { pinata: 15, rainbow: 50, toni: 18, goldie: 20 };
const SKILL_BY_ID = {}; SKILLS.forEach(s => SKILL_BY_ID[s.id] = s);

/* ---------- Anillos (permanentes, Puntos de Legado) ---------- */
const RINGS = [
  { n: 'Anillo de latón', c: 1, col: '#c9a14a', t: '+10% de botín', f: s => { s.loot += .10; } },
  { n: 'Anillo de cobre', c: 4, col: '#c46a3a', t: '+3 s de aguante', f: s => { s.stamina += 3; } },
  { n: 'Anillo de plata', c: 12, col: '#d7dbe0', t: '+2 cerditos al empezar cada ronda', f: s => { s.startPigs += 2; } },
  { n: 'Anillo de jade', c: 40, col: '#3fae7a', t: '+10% de daño', f: s => { s.dmgPct += .10; } },
  { n: 'Anillo de rubí', c: 120, col: '#e0245e', t: '+10% de velocidad de ataque', f: s => { s.spd += .10; } },
  { n: 'Anillo de zafiro', c: 400, col: '#2f6fe0', t: 'Empiezas cada ciclo con $300', f: s => { s.startCash += 300; } },
  { n: 'Anillo de esmeralda', c: 1200, col: '#1fbf6a', t: '+1 ronda de plazo en todas las facturas', f: s => { s.deadline += 1; } },
  { n: 'Anillo de ópalo', c: 4000, col: '#bfe3ff', t: '-10% de comisión de Toni', f: s => { s.toniRed += .10; } },
  { n: 'Anillo de topacio', c: 12000, col: '#ffb547', t: '+3% de probabilidad de crítico', f: s => { s.crit += .03; } },
  { n: 'Anillo de amatista', c: 40000, col: '#9b5de5', t: '+25% de botín', f: s => { s.loot += .25; } },
  { n: 'Anillo de ónix', c: 120000, col: '#2a2a2a', t: '+20% de Puntos de Legado', f: s => { s.lpMult += .2; } },
  { n: 'Anillo de perla', c: 400000, col: '#f3efe6', t: 'Lluvia de rocas nivel 1 gratis', f: s => { s.rock += 1; } },
  { n: 'Anillo de oro', c: 1200000, col: '#ffd34d', t: '+0.3 de radio de golpe', f: s => { s.radius += .3; } },
  { n: 'Anillo de platino', c: 4000000, col: '#e5e4e2', t: '+10 s de aguante', f: s => { s.stamina += 10; } },
  { n: 'Anillo de diamante', c: 12000000, col: '#b9f2ff', t: '+50% de daño', f: s => { s.dmgPct += .5; } },
  { n: 'Anillo de obsidiana', c: 40000000, col: '#3d2b56', t: 'Empiezas cada ciclo con el Martillo de carpintero', f: s => { s.startHammer = Math.max(s.startHammer, 2); } },
  { n: 'Anillo lunar', c: 120000000, col: '#cfd8ff', t: '+2% de probabilidad de cerdito brillante', f: s => { s.glow += .02; } },
  { n: 'Anillo solar', c: 400000000, col: '#ff9e2c', t: '+50% de botín', f: s => { s.loot += .5; } },
  { n: 'Anillo cósmico', c: 1200000000, col: '#5a2fd1', t: '+50% de Puntos de Legado', f: s => { s.lpMult += .5; } },
  { n: 'Anillo del Rey Cerdo', c: 4000000000, col: '#ff6fb5', t: 'x2 a todo el botín', f: s => { s.lootMult *= 2; } },
];

/* ---------- Pulseras (permanentes, mejorables) ---------- */
const BRACELETS = [
  { id: 'str', n: 'Pulsera de fuerza', i: '💪', c: 2, g: 4.5, max: 10, col: '#e0574f', t: '+8% de daño por nivel', f: (s, l) => { s.dmgPct += .08 * l; } },
  { id: 'sta', n: 'Pulsera de resistencia', i: '🫀', c: 2, g: 4.5, max: 10, col: '#47b26b', t: '+2 s de aguante por nivel', f: (s, l) => { s.stamina += 2 * l; } },
  { id: 'fortune', n: 'Pulsera de fortuna', i: '🪙', c: 3, g: 4.5, max: 10, col: '#e3b22b', t: '+8% de botín por nivel', f: (s, l) => { s.loot += .08 * l; } },
  { id: 'speed', n: 'Pulsera de rapidez', i: '💨', c: 4, g: 4.5, max: 10, col: '#4aa3df', t: '+3% de velocidad por nivel', f: (s, l) => { s.spd += .03 * l; } },
  { id: 'luck', n: 'Pulsera de la suerte', i: '🍀', c: 5, g: 4.5, max: 10, col: '#2fbf8f', t: '+3% de suerte por nivel', f: (s, l) => { s.luck += .03 * l; } },
  { id: 'saver', n: 'Pulsera del ahorrador', i: '🐖', c: 3, g: 4.5, max: 10, col: '#d98597', t: 'Empiezas el ciclo con $50 × 2^nivel', f: (s, l) => { if (l) s.startCash += 50 * Math.pow(2, l); } },
];

/* ---------- Monedas raras (permanentes, se encuentran rompiendo cerditos) ---------- */
const COINS = [
  { n: 'Céntimo de la suerte', col: '#c46a3a', t: '+3% de suerte', f: s => { s.luck += .03; } },
  { n: 'Moneda de chocolate', col: '#7a4a22', t: '+3 s de aguante', f: s => { s.stamina += 3; } },
  { n: 'Ficha de recreativa', col: '#3aa0ff', t: '+5% de velocidad de ataque', f: s => { s.spd += .05; } },
  { n: 'Doblón pirata', col: '#e3b22b', t: '+10% de botín', f: s => { s.loot += .10; } },
  { n: 'Moneda romana', col: '#b08d57', t: '+5% de daño', f: s => { s.dmgPct += .05; } },
  { n: 'Dracma de plata', col: '#cfd3d8', t: '+3% de probabilidad de crítico', f: s => { s.crit += .03; } },
  { n: 'Real de a ocho', col: '#d9d2c3', t: '+15% de botín', f: s => { s.loot += .15; } },
  { n: 'Ficha de casino', col: '#e0245e', t: 'Gambolito aparece el doble de a menudo', f: s => { s.gambleW = 2; } },
  { n: 'Moneda de dos caras', col: '#ffd34d', t: '+5% de botín doble', f: s => { s.dbl += .05; } },
  { n: 'Moneda lunar', col: '#cfd8ff', t: '+1% de cerditos brillantes', f: s => { s.glow += .01; } },
  { n: 'Moneda de oro macizo', col: '#ffbf1f', t: '+25% de botín', f: s => { s.loot += .25; } },
  { n: 'Moneda del Rey Cerdo', col: '#ff6fb5', t: '+10% de Puntos de Legado', f: s => { s.lpMult += .1; } },
];
const COIN_CHANCE = 0.0035;
