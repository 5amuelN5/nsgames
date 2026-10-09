/* ============================================================
   Interfaz: pantallas, menú principal, árbol, cartas, minijuego
   ============================================================ */
const $ = s => document.querySelector(s);
const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
let screen = 'title', curTab = 'tree', treePan = null, treeZoom = 1, stageScale = 1;

/* ---------- escalado ---------- */
function fitStage() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stageScale = s;
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const k = Math.max(1, s * dpr);
  cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  buildDesk(k);
}

function showScreen(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach(e => e.classList.toggle('hidden', e.dataset.screen !== name));
  cv.classList.toggle('hidden', name !== 'run');
  stage.classList.toggle('playing', name === 'run');
  if (name === 'hub') renderHub();
  if (name === 'title') renderTitle();
}

/* ============================================================
   VENTANAS MODALES (cartas)
   ============================================================ */
const modalQ = []; let modalOpen = false;
function pushModal(m, front) { front ? modalQ.unshift(m) : modalQ.push(m); if (!modalOpen) nextModal(); }
function nextModal() {
  const m = modalQ.shift();
  const wrap = $('#modal');
  if (!m) { modalOpen = false; wrap.classList.add('hidden'); if (screen === 'hub') renderHub(); return; }
  modalOpen = true;
  const box = $('#modalBox');
  box.className = 'mbox ' + (m.cls || '');
  box.innerHTML = m.html;
  const btns = document.createElement('div'); btns.className = 'mbtns';
  (m.buttons || [{ t: 'Continuar' }]).forEach(b => {
    const e = document.createElement('button');
    e.className = 'btn ' + (b.cls || '');
    e.innerHTML = b.t;
    if (b.disabled) e.disabled = true;
    e.onclick = () => { SFX.click(); modalOpen = false; wrap.classList.add('hidden'); if (b.fn) b.fn(); if (!modalOpen) nextModal(); };
    btns.appendChild(e);
  });
  box.appendChild(btns);
  wrap.classList.remove('hidden');
  box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
  if (m.sound) m.sound();
  if (m.onShow) m.onShow(box);
}

function queueLetter(l) { pushModal(letterModal(l)); }

function letterModal(l) {
  switch (l.kind) {
    case 'intro': return {
      cls: 'letter', sound: () => SFX.letter(),
      html: `<div class="lhead"><span class="lic">✉️</span><div><small>Una nota en la nevera</small><h2>Estás sin blanca</h2></div></div>
      <div class="lbody">
        <p>La cuenta está a cero, la nevera vacía y el buzón lleno. Lo único que te queda son <b>tus huchas de cerdito</b>... y un martillo viejo.</p>
        <p>🔨 <b>Mantén pulsado</b> el ratón sobre la mesa para dar martillazos. Tu <b>aguante</b> ✋ se agota con el tiempo: cuando llegue a cero, la mano no da más de sí.</p>
        <p>📨 Llegarán <b>facturas</b> con fecha límite. Págalas para desbloquear cerditos nuevos y ventajas.</p>
        <p>🕴️ Si te retrasas, <b>Big Toni</b> se quedará una parte de todo lo que ganes. Y si te retrasas demasiado... <b>quiebra</b>.</p>
        <p class="sign">— Tú, ayer, muy preocupado</p>
      </div>`, buttons: [{ t: 'Manos a la obra', cls: 'primary' }],
    };
    case 'bill': {
      const b = l.bill, def = BILLS[b.idx];
      const pig = !b.endless && b.idx < PIGS.length - 1 ? PIGS[b.idx + 1] : null;
      return {
        cls: 'letter bill', sound: () => SFX.letter(),
        html: `<div class="lhead"><span class="lic">${b.icon}</span><div><small>FACTURA Nº ${String(b.idx + 1).padStart(4, '0')} · CICLO ${meta.cycle}</small><h2>${b.name}</h2></div></div>
        <div class="lbody">
          <div class="amount">${money(b.amount)}</div>
          <p class="center">Fecha límite: <b>${b.due} ronda${b.due > 1 ? 's' : ''}</b></p>
          <div class="perkbox"><span>Al pagarla</span><b>${b.perk}</b>${pig ? `<div class="unlock">y desbloqueas un cerdito nuevo: <span class="sil"></span></div>` : ''}${b.idx === BILLS.length - 1 ? '<div class="unlock warn">Esta es la última. Algo enorme te espera.</div>' : ''}</div>
          <p class="small">Puedes pagarla poco a poco. Si vence, Big Toni se quedará una parte de todo lo que ganes.</p>
        </div>`,
        buttons: [{ t: 'Entendido', cls: 'primary' }],
        onShow: box => { const s = box.querySelector('.sil'); if (s && pig) s.appendChild(pigPortrait(pig, 64, true)); },
      };
    }
    case 'paid': {
      const b = l.bill;
      return {
        cls: 'letter paid', sound: () => SFX.cash(),
        html: `<div class="lhead"><span class="lic">${b.icon}</span><div><small>RECIBO</small><h2>${b.name}</h2></div></div>
        <div class="lbody">
          <div class="amount">${money(b.amount)}</div>
          <div class="stamp">PAGADO</div>
          <div class="perkbox"><span>Ventaja desbloqueada</span><b>${b.perk}</b></div>
          ${l.pig ? `<div class="newpig"><div class="np-portrait"></div><div><small>¡NUEVO CERDITO!</small><h3>${l.pig.name}</h3><p>${l.pig.desc}</p><p class="small">Vida ${fmt(l.pig.hp)} · Botín ${money(l.pig.loot[0][0])}–${money(Math.max(...l.pig.loot.map(x => x[1])))}</p></div></div>` : ''}
        </div>`,
        buttons: [{ t: '¡Genial!', cls: 'primary' }],
        onShow: box => { const d = box.querySelector('.np-portrait'); if (d && l.pig) d.appendChild(pigPortrait(l.pig, 110)); },
      };
    }
    case 'loanPaid': return {
      cls: 'letter toni', sound: () => SFX.cash(),
      html: `<div class="lhead"><span class="lic">🕴️</span><div><small>Mensaje de Big Toni</small><h2>Estamos en paz</h2></div></div>
      <div class="lbody"><div class="stamp">SALDADO</div><p class="quote">«Así me gusta. Puntual. Si necesitas algo más... ya sabes dónde encontrarme.»</p></div>`,
    };
    case 'king': return {
      cls: 'letter king', sound: () => SFX.bad(),
      html: `<div class="lhead"><span class="lic">👑</span><div><small>Proclama real</small><h2>El Rey Cerdo ha llegado</h2></div></div>
      <div class="lbody"><div class="np-portrait big"></div>
      <p>Has pagado la Factura Final... y eso ha despertado al soberano de todas las huchas. A partir de la próxima ronda, <b>el Rey Cerdo</b> estará en tu mesa.</p>
      <p>Tiene <b>${fmt(KING.hp)}</b> de vida, <b>no se cura entre rondas</b> e invoca súbditos. Rómpelo para ganar la partida.</p></div>`,
      buttons: [{ t: 'Que venga', cls: 'primary' }],
      onShow: box => box.querySelector('.np-portrait').appendChild(pigPortrait(KING, 150)),
    };
    case 'overdue': return {
      cls: 'letter toni', sound: () => SFX.bad(),
      html: `<div class="lhead"><span class="lic">🕴️</span><div><small>Mensaje de Big Toni</small><h2>Has llegado tarde</h2></div></div>
      <div class="lbody"><p class="quote">«${l.bill.name}... vencida. Tranquilo, yo me encargo. A partir de ahora me quedo un <b>${pct(l.bill.loan ? .35 : .25)}</b> de todo lo que ganes. Y sube cada ronda que pase.»</p>
      <p class="small">Paga la factura para que Toni deje de cobrar comisión. Si sigue sin pagarse ${4 - l.bill.overdue} ronda(s) más, te embargan.</p></div>`,
    };
  }
}

/* ============================================================
   TÍTULO
   ============================================================ */
function renderTitle() {
  const has = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
  $('#btnContinue').classList.toggle('hidden', !has);
  const row = $('#titlePigs');
  if (!row.childElementCount) {
    ['normalito', 'tourist', 'woody', 'pinata', 'angry', 'viking', 'goldie'].forEach((k, i) => {
      const d = document.createElement('div'); d.className = 'tpig'; d.style.animationDelay = (i * .15) + 's';
      d.appendChild(pigPortrait(PIG_BY_KEY[k], 92)); row.appendChild(d);
    });
  }
}
function newGame() {
  wipe();
  meta = newMeta(); cyc = newCycle(); refreshStats();
  showScreen('hub');
  queueLetter({ kind: 'intro' });
  issueNextBill();
  save();
}
function continueGame() {
  if (!load()) { newGame(); return; }
  SFX.enabled = meta.sound;
  showScreen('hub');
  if (!cyc.bills.length && !(cyc.kingActive && !cyc.kingDead)) issueNextBill();
}

/* ============================================================
   HUB (entre rondas)
   ============================================================ */
function renderHub() {
  if (!cyc) return;
  refreshStats();
  $('#hCash').textContent = money(cyc.cash);
  $('#hLp').textContent = fmt(meta.lp);
  $('#hCycle').innerHTML = `Ciclo <b>${meta.cycle}</b> · Ronda <b>${cyc.round}</b>`;
  const cut = toniCut();
  const ht = $('#hToni');
  ht.classList.toggle('hidden', cut <= 0);
  ht.innerHTML = `🕴️ Toni se queda <b>${pct(cut)}</b>`;
  $('#btnSound').textContent = SFX.enabled ? '🔊' : '🔇';
  renderBills();
  renderTab();
  $('#playRound').textContent = 'Ronda ' + cyc.round;
}

function dueLabel(b) {
  if (b.overdue > 0) return `<span class="due bad">VENCIDA · embargo en ${4 - b.overdue}</span>`;
  if (b.due <= 0) return `<span class="due warn">¡Vence antes de la próxima ronda!</span>`;
  return `<span class="due">Quedan ${b.due} ronda${b.due > 1 ? 's' : ''}</span>`;
}

function renderBills() {
  const list = $('#billList');
  list.innerHTML = '';
  if (!cyc.bills.length) {
    list.innerHTML = cyc.kingActive && !cyc.kingDead
      ? `<div class="nobill">👑<p>No hay facturas... solo el <b>Rey Cerdo</b>.<br>Vida restante: <b>${fmt(cyc.kingHp)}</b></p></div>`
      : `<div class="nobill">📭<p>El buzón está vacío. Por ahora.</p></div>`;
  }
  cyc.bills.forEach(b => {
    const rem = b.amount - b.paid;
    const can = Math.min(cyc.cash, rem);
    const d = document.createElement('div');
    d.className = 'billcard' + (b.overdue ? ' overdue' : '') + (b.loan ? ' loan' : '') + (b.due <= 0 && !b.overdue ? ' urgent' : '');
    d.innerHTML = `<div class="bc-top"><span class="ic">${b.icon}</span><div class="nm">${b.name}<small>${b.loan ? 'Préstamo con intereses' : 'Al pagar: ' + b.perk}</small></div></div>
      <div class="bc-bar"><i style="width:${b.paid / b.amount * 100}%"></i><em style="width:${Math.min(1, (b.paid + can) / b.amount) * 100}%"></em></div>
      <div class="bc-row"><span>${money(b.paid)} / <b>${money(b.amount)}</b></span>${dueLabel(b)}</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn pay' + (can >= rem ? ' full' : '');
    btn.disabled = can < 1;
    btn.innerHTML = can >= rem ? `Pagar ${money(rem)}` : can >= 1 ? `Abonar ${money(can)}` : 'Sin dinero';
    btn.onclick = () => { if (payBill(b, can)) renderHub(); };
    d.appendChild(btn);
    list.appendChild(d);
  });
  // próximo cerdito
  const np = $('#nextPig');
  np.innerHTML = '';
  if (cyc.unl < PIGS.length) {
    const pig = PIGS[cyc.unl];
    const bill = cyc.bills.find(b => !b.loan && b.idx === cyc.unl - 1);
    const p = bill ? bill.paid / bill.amount : 0;
    np.appendChild(pigPortrait(pig, 54, true));
    const t = document.createElement('div');
    t.innerHTML = `<small>Próximo cerdito</small><b>???</b><div class="mini"><i style="width:${p * 100}%"></i></div><span>${Math.floor(p * 100)}%</span>`;
    np.appendChild(t);
  } else np.innerHTML = `<div><small>Colección</small><b>¡Todos los cerditos desbloqueados!</b></div>`;
  $('#btnPhone').disabled = !!cyc.loan;
  $('#btnPhone').title = cyc.loan ? 'Ya le debes dinero a Toni' : '';
}

/* ---------- pestañas ---------- */
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { SFX.click(); curTab = b.dataset.tab; renderTab(); });
function renderTab() {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === curTab));
  const body = $('#tabBody');
  ({ tree: renderTree, hammers: renderHammers, pigs: renderPigs, coins: renderCoins, legacy: renderLegacy, stats: renderStats })[curTab](body);
}

/* ---------- Árbol de habilidades ---------- */
const TREE_SIZE = 1900, TREE_C = TREE_SIZE / 2, TREE_R = 112;
const TREE_ZOOM_MIN = .4, TREE_ZOOM_MAX = 1.6;
function nodePos(sk) {
  if (sk === 'root') return [TREE_C, TREE_C];
  const a = BRANCH_ANGLE[sk.b] * Math.PI / 180;
  return [TREE_C + Math.cos(a) * sk.d * TREE_R - Math.sin(a) * sk.l * TREE_R, TREE_C + Math.sin(a) * sk.d * TREE_R + Math.cos(a) * sk.l * TREE_R];
}
function skillState(sk) {
  const lvl = cyc.skills[sk.id] || 0;
  const reqOk = sk.req === 'root' || (cyc.skills[sk.req] || 0) > 0;
  if (lvl >= sk.max) return 'max';
  if (!reqOk) {
    const parent = SKILL_BY_ID[sk.req];
    const parentVisible = parent && (parent.req === 'root' || (cyc.skills[parent.req] || 0) > 0);
    return parentVisible ? 'locked' : 'hidden';
  }
  const cost = skillCost(sk, lvl);
  if (lvl > 0) return cyc.cash >= cost ? 'owned can' : 'owned';
  return cyc.cash >= cost ? 'avail can' : 'avail';
}
function renderTree(body) {
  const view = document.createElement('div'); view.className = 'tree';
  const inner = document.createElement('div'); inner.className = 'treeInner';
  inner.style.width = inner.style.height = TREE_SIZE + 'px';
  let svg = `<svg width="${TREE_SIZE}" height="${TREE_SIZE}" class="treeSvg">`;
  // anillos decorativos
  for (let i = 1; i <= 6; i++) svg += `<circle cx="${TREE_C}" cy="${TREE_C}" r="${i * TREE_R}" class="guide"/>`;
  let nodes = '';
  for (const sk of SKILLS) {
    const st = skillState(sk);
    if (st === 'hidden') continue;
    const [x, y] = nodePos(sk);
    const [px, py] = nodePos(sk.req === 'root' ? 'root' : SKILL_BY_ID[sk.req]);
    const lvl = cyc.skills[sk.id] || 0;
    svg += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" class="${lvl > 0 ? 'on' : st === 'locked' ? 'off' : 'av'}"/>`;
    const cost = lvl < sk.max ? money(skillCost(sk, lvl)) : 'MÁX';
    nodes += `<div class="node ${st} br-${sk.b}" data-id="${sk.id}" style="left:${x}px;top:${y}px">
      <span class="ni">${st === 'locked' ? '?' : sk.i}</span>
      ${st !== 'locked' ? `<span class="nl">${lvl}/${sk.max}</span><span class="nc">${cost}</span>` : ''}</div>`;
  }
  svg += '</svg>';
  inner.innerHTML = svg + `<div class="node root" style="left:${TREE_C}px;top:${TREE_C}px"><span class="ni">🐷</span></div>` + nodes;
  view.appendChild(inner);
  const tip = document.createElement('div'); tip.className = 'tip hidden'; view.appendChild(tip);
  const help = document.createElement('div'); help.className = 'treeHelp'; help.innerHTML = 'Arrastra para moverte · Rueda o + / − para el zoom · Clic en un nodo para comprarlo · Las mejoras se pierden en la quiebra';
  view.appendChild(help);
  const zoomUi = document.createElement('div'); zoomUi.className = 'treeZoom';
  zoomUi.innerHTML = `<button data-z="in" title="Ampliar">+</button><span class="zv"></span><button data-z="out" title="Alejar">−</button><button data-z="fit" title="Centrar">⌖</button>`;
  view.appendChild(zoomUi);
  const summ = document.createElement('div'); summ.className = 'treeStats';
  summ.innerHTML = statLine();
  view.appendChild(summ);
  body.innerHTML = ''; body.appendChild(view);

  const vw = body.clientWidth || 900, vh = body.clientHeight || 560;
  const center = () => { treePan = { x: vw / 2 - TREE_C * treeZoom, y: vh / 2 - TREE_C * treeZoom + 20 }; };
  if (!treePan) center();
  // límites de arrastre según el zoom (si el mapa cabe entero, se queda centrado)
  const clampPan = () => {
    const size = TREE_SIZE * treeZoom;
    const lim = (v, view) => size + 200 <= view ? (view - size) / 2 : clamp(v, view - size - 100, 100);
    treePan.x = lim(treePan.x, vw); treePan.y = lim(treePan.y, vh);
  };
  const apply = () => {
    clampPan();
    inner.style.transform = `translate(${treePan.x}px,${treePan.y}px) scale(${treeZoom})`;
    zoomUi.querySelector('.zv').textContent = Math.round(treeZoom * 100) + '%';
    zoomUi.querySelector('[data-z="in"]').disabled = treeZoom >= TREE_ZOOM_MAX - 1e-6;
    zoomUi.querySelector('[data-z="out"]').disabled = treeZoom <= TREE_ZOOM_MIN + 1e-6;
  };
  // hace zoom manteniendo fijo el punto (cx, cy) de la vista
  const zoomAt = (factor, cx = vw / 2, cy = vh / 2) => {
    const nz = clamp(treeZoom * factor, TREE_ZOOM_MIN, TREE_ZOOM_MAX);
    const wx = (cx - treePan.x) / treeZoom, wy = (cy - treePan.y) / treeZoom;
    treeZoom = nz; treePan.x = cx - wx * nz; treePan.y = cy - wy * nz;
    apply();
  };
  apply();
  zoomUi.onpointerdown = e => e.stopPropagation();
  zoomUi.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    SFX.click();
    if (b.dataset.z === 'in') zoomAt(1.25);
    else if (b.dataset.z === 'out') zoomAt(1 / 1.25);
    else { treeZoom = 1; center(); apply(); }
  };
  view.onwheel = e => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, (e.clientX - r.left) / stageScale, (e.clientY - r.top) / stageScale);
  };

  let drag = null;
  view.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, px: treePan.x, py: treePan.y, moved: false, target: e.target.closest('.node') }; view.setPointerCapture(e.pointerId); };
  view.onpointermove = e => {
    if (drag) {
      const dx = (e.clientX - drag.x) / stageScale, dy = (e.clientY - drag.y) / stageScale;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) { treePan.x = drag.px + dx; treePan.y = drag.py + dy; apply(); }
    }
    const n = drag ? null : e.target.closest('.node');
    if (n && n.dataset.id) showTip(tip, SKILL_BY_ID[n.dataset.id]); else if (!drag) tip.classList.add('hidden');
  };
  view.onpointerup = e => {
    if (drag && !drag.moved && drag.target && drag.target.dataset.id) buySkill(drag.target.dataset.id);
    drag = null;
  };
  view.onpointerleave = () => tip.classList.add('hidden');
}
function statLine() {
  return `<span>⚔️ Daño <b>${fmt(S.dmg)}</b></span><span>⚡ ${S.speed.toFixed(2)}/s</span><span>🎯 Crít <b>${pct(S.crit)}</b> x${S.critMult.toFixed(1)}</span><span>⭕ Radio <b>${S.radius.toFixed(2)}</b></span><span>✋ Aguante <b>${S.stamina} s</b></span><span>💰 Botín <b>x${S.lootTotal.toFixed(2)}</b></span><span>🍀 Suerte <b>${pct(S.luck)}</b></span>`;
}
function showTip(tip, sk) {
  const st = skillState(sk);
  const lvl = cyc.skills[sk.id] || 0;
  if (st === 'locked') {
    tip.innerHTML = `<h4>???</h4><p>Compra antes <b>${SKILL_BY_ID[sk.req].n}</b> para descubrir esta mejora.</p>`;
  } else {
    const cost = lvl < sk.max ? skillCost(sk, lvl) : 0;
    tip.innerHTML = `<h4>${sk.i} ${sk.n} <em>${lvl}/${sk.max}</em></h4><p>${sk.t}${sk.max > 1 ? ' <span class="per">(por nivel)</span>' : ''}</p>
      ${exoticOddsHtml(sk, lvl)}
      ${lvl < sk.max ? `<div class="tcost ${cyc.cash >= cost ? 'ok' : ''}">${money(cost)}</div>` : '<div class="tcost max">NIVEL MÁXIMO</div>'}`;
  }
  tip.classList.remove('hidden');
}
/* En las mejoras de cerditos exóticos, enseña la probabilidad real ahora y con el siguiente nivel */
function exoticOddsHtml(sk, lvl) {
  if (sk.id !== 'exotic' && sk.id !== 'safari' && sk.id !== 'select') return '';
  const now = spawnOdds();
  let next = null;
  if (lvl < sk.max) {
    cyc.skills[sk.id] = lvl + 1; next = spawnOdds(computeStats()); cyc.skills[sk.id] = lvl;
    if (!lvl) delete cyc.skills[sk.id];
  }
  const keys = sk.id === 'select' ? PIGS.slice(0, cyc.unl).filter(p => p.w > 0).slice(-4).map(p => p.key) : EXOTIC;
  const rows = keys.filter(k => now[k] != null).map(k => {
    const f = v => (v * 100).toFixed(v < .1 ? 2 : 1).replace('.', ',') + '%';
    return `<div><span>${PIG_BY_KEY[k].name}</span><b>${f(now[k])}${next ? ` → <i>${f(next[k])}</i>` : ''}</b></div>`;
  });
  return `<div class="odds"><small>Probabilidad de aparecer${next ? ' (ahora → siguiente nivel)' : ''}</small>${rows.length ? rows.join('') : '<div><span>Aún no has desbloqueado ningún cerdito exótico</span></div>'}</div>`;
}
function buySkill(id) {
  const sk = SKILL_BY_ID[id];
  const st = skillState(sk);
  const lvl = cyc.skills[id] || 0;
  if (st === 'locked' || st === 'max') { SFX.deny(); return; }
  const cost = skillCost(sk, lvl);
  if (cyc.cash < cost) { SFX.deny(); flashCash(); return; }
  cyc.cash -= cost; cyc.skills[id] = lvl + 1;
  SFX.buy(); refreshStats(); save();
  renderHub();
  const n = document.querySelector(`.node[data-id="${id}"]`);
  if (n) { n.classList.add('pop'); const tip = document.querySelector('.tip'); if (tip) showTip(tip, sk); }
}
function flashCash() { const e = $('#hCashBox'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }

/* ---------- Martillos ---------- */
const hammerCache = {};
function hammerIcon(i) {
  if (!hammerCache[i]) {
    const c = document.createElement('canvas'); c.width = 240; c.height = 150;
    const cc = c.getContext('2d'); cc.scale(2, 2);
    drawHammer(cc, HAMMERS[i], 38, 30, 0, .62);
    hammerCache[i] = c.toDataURL();
  }
  const img = new Image(120, 75); img.src = hammerCache[i]; img.draggable = false; img.alt = '';
  img.style.width = '120px'; img.style.height = '75px'; img.style.alignSelf = 'center';
  return img;
}
function renderHammers(body) {
  body.innerHTML = `<div class="grid hammers"></div><p class="foot">Los martillos se pierden en la quiebra. Cada uno necesita haber comprado el anterior.</p>`;
  const g = body.querySelector('.grid');
  HAMMERS.forEach((h, i) => {
    const owned = cyc.owned.includes(i), eq = cyc.hammer === i;
    const prevOwned = i === 0 || cyc.owned.includes(i - 1);
    const d = document.createElement('div');
    d.className = 'card hammer' + (eq ? ' eq' : '') + (!prevOwned && !owned ? ' locked' : '');
    d.appendChild(hammerIcon(i));
    const info = document.createElement('div'); info.className = 'hinfo';
    info.innerHTML = `<h4>${prevOwned || owned ? h.name : '???'}</h4><p class="hdesc">${prevOwned || owned ? h.desc : 'Compra el martillo anterior.'}</p>
      <div class="hstats"><span>Daño <b>${fmt(h.dmg)}</b></span><span>Vel. <b>${h.spd}/s</b></span><span>Radio <b>${h.radius}</b></span><span>Crít. <b>${pct(h.crit)} x${h.critMult}</b></span>${h.elec ? `<span>⚡ <b>${pct(h.elec)}</b></span>` : ''}${h.loot ? `<span>💰 <b>x${h.loot}</b></span>` : ''}</div>`;
    d.appendChild(info);
    const btn = document.createElement('button'); btn.className = 'btn';
    if (eq) { btn.textContent = 'Equipado'; btn.disabled = true; btn.classList.add('ghost'); }
    else if (owned) { btn.textContent = 'Equipar'; btn.onclick = () => { cyc.hammer = i; SFX.click(); save(); renderHub(); }; }
    else { btn.textContent = money(h.cost); btn.classList.add('primary'); btn.disabled = !prevOwned || cyc.cash < h.cost; btn.onclick = () => { if (cyc.cash < h.cost) return; cyc.cash -= h.cost; cyc.owned.push(i); cyc.hammer = i; SFX.buy(); save(); renderHub(); }; }
    d.appendChild(btn);
    g.appendChild(d);
  });
}

/* ---------- Cerditos ---------- */
function unlockedScale(p, i) { return p.key === 'king' || i >= cyc.unl ? 1 : lootScale(p); }
function renderPigs(body) {
  const odds = spawnOdds();
  body.innerHTML = `<div class="grid pigs"></div>`;
  const g = body.querySelector('.grid');
  [...PIGS, KING].forEach((p, i) => {
    const unlocked = p.key === 'king' ? (cyc.kingActive || meta.won) : i < cyc.unl;
    const d = document.createElement('div'); d.className = 'card pig' + (unlocked ? '' : ' locked');
    const port = document.createElement('div'); port.className = 'pport';
    port.appendChild(pigPortrait(p, 84, !unlocked));
    d.appendChild(port);
    const lvl = masteryLevel(p.key), n = meta.mastery[p.key] || 0;
    const next = MASTERY_STEPS[lvl];
    const ls = unlockedScale(p, i);
    const maxLoot = Math.max(...p.loot.map(x => x[1])) * ls;
    if (unlocked) {
      d.insertAdjacentHTML('beforeend', `<h4>${p.name}</h4>
        <p class="pdesc">${p.desc}</p>
        <div class="pstats">${p.hp ? `<span>❤️ ${fmt(p.hp)}</span><span>💰 ${money(p.loot[0][0] * ls)}–${money(maxLoot)}</span>` : '<span>🎲 Minijuego</span>'}</div>${ls > 1.01 ? `<div class="podds exo">📈 Botín x${ls < 10 ? ls.toFixed(1).replace('.', ',') : fmt(ls)} por tu mejor cerdito</div>` : ''}
        ${odds[p.key] != null ? `<div class="podds${EXOTIC.includes(p.key) ? ' exo' : ''}">${EXOTIC.includes(p.key) ? '🦄 Exótico · ' : ''}Aparece: <b>${(odds[p.key] * 100).toFixed(odds[p.key] < .1 ? 2 : 1).replace('.', ',')}%</b></div>` : p.key === 'brotalito' ? '<div class="podds">Aparece al romper Normalitos</div>' : ''}
        <div class="pmast"><span>Nivel ${lvl}${lvl ? ` (+${lvl * 5}% botín)` : ''}</span><span>${fmt(n)}${next ? ' / ' + fmt(next) : ''} rotos</span></div>`);
    } else {
      const billName = p.key === 'king' ? 'La Factura Final' : (BILLS[i - 1] ? BILLS[i - 1].n : '');
      const bill = cyc.bills.find(b => !b.loan && b.idx === i - 1);
      const pr = bill ? Math.floor(bill.paid / bill.amount * 100) : 0;
      d.insertAdjacentHTML('beforeend', `<h4>???</h4><p class="pdesc">Se desbloquea al pagar <b>${billName}</b>.</p>${bill ? `<div class="mini"><i style="width:${pr}%"></i></div><p class="pdesc">${pr}% pagado</p>` : ''}`);
    }
    g.appendChild(d);
  });
}

/* ---------- Monedas ---------- */
function renderCoins(body) {
  const found = Object.keys(meta.coins).length;
  body.innerHTML = `<div class="coinhead"><b>${found} / ${COINS.length}</b> monedas raras · Se encuentran al romper cerditos (≈${(COIN_CHANCE * S.coinMult * (1 + S.luck) * 100).toFixed(2)}% por cerdito). Son permanentes: sobreviven a la quiebra. Las repetidas se venden solas.</div><div class="grid coins"></div>`;
  const g = body.querySelector('.grid');
  COINS.forEach((c, i) => {
    const has = meta.coins[i];
    const d = document.createElement('div'); d.className = 'card coin' + (has ? '' : ' locked');
    d.innerHTML = `<div class="cface" style="--cc:${has ? c.col : '#3a2a20'}">${has ? '★' : '?'}</div>
      <h4>${has ? c.n : '???'}</h4><p>${has ? c.t : 'Sin descubrir'}</p>${has > 1 ? `<small>x${has} encontradas</small>` : ''}`;
    g.appendChild(d);
  });
}

/* ---------- Legado: anillos y pulseras ---------- */
function renderLegacy(body) {
  body.innerHTML = `<div class="lphead"><div class="lpbig">⭐ <b>${fmt(meta.lp)}</b> <span>Puntos de Legado</span></div>
    <p>Se ganan al declararse en quiebra: <b>1 punto por cada $50</b> pagados en facturas durante el ciclo. Ahora mismo ganarías <b>${fmt(lpForBankruptcy())}</b>. Anillos y pulseras son <b>permanentes</b>.</p></div>
    <h3 class="sect">Anillos</h3><div class="grid rings"></div>
    <h3 class="sect">Pulseras</h3><div class="grid bracelets"></div>`;
  const g = body.querySelector('.rings');
  RINGS.forEach((r, i) => {
    const has = meta.rings.includes(i);
    const d = document.createElement('div'); d.className = 'card ring' + (has ? ' has' : '');
    d.innerHTML = `<div class="ringv" style="--rc:${r.col}"><i></i></div><h4>${r.n}</h4><p>${r.t}</p>`;
    const b = document.createElement('button'); b.className = 'btn ' + (has ? 'ghost' : 'primary');
    b.innerHTML = has ? 'Equipado' : `⭐ ${fmt(r.c)}`;
    b.disabled = has || meta.lp < r.c;
    b.onclick = () => { if (meta.lp < r.c) return; meta.lp -= r.c; meta.rings.push(i); SFX.levelup(); refreshStats(); save(); renderHub(); };
    d.appendChild(b); g.appendChild(d);
  });
  const gb = body.querySelector('.bracelets');
  BRACELETS.forEach(br => {
    const l = meta.bracelets[br.id] || 0, cost = braceletCost(br, l);
    const d = document.createElement('div'); d.className = 'card brace';
    d.innerHTML = `<div class="bv" style="--bc:${br.col}">${br.i}</div><h4>${br.n}</h4><p>${br.t}</p><div class="pips">${Array.from({ length: br.max }, (_, k) => `<i class="${k < l ? 'on' : ''}"></i>`).join('')}</div>`;
    const b = document.createElement('button'); b.className = 'btn primary';
    b.innerHTML = l >= br.max ? 'MÁX' : `⭐ ${fmt(cost)}`;
    b.disabled = l >= br.max || meta.lp < cost;
    b.onclick = () => { if (meta.lp < cost) return; meta.lp -= cost; meta.bracelets[br.id] = l + 1; SFX.levelup(); refreshStats(); save(); renderHub(); };
    d.appendChild(b); gb.appendChild(d);
  });
}

/* ---------- Estadísticas ---------- */
function renderStats(body) {
  const s = meta.stats;
  const rows = [
    ['Ciclo actual', meta.cycle], ['Rondas jugadas (total)', fmt(s.runs)], ['Cerditos rotos', fmt(s.smashed)], ['Dinero ganado (total)', money(s.earned)],
    ['Pagado en facturas (total)', money(s.paid)], ['Pagado este ciclo', money(cyc.paidTotal)], ['Mejor ronda', money(s.bestRun)], ['Golpe más fuerte', fmt(s.bestHit)],
    ['Súper Jackpots', s.jackpots], ['Cerditos brillantes vistos', s.glow], ['Préstamos de Toni', s.toni], ['Quiebras', s.bankrupt],
    ['Monedas raras', `${Object.keys(meta.coins).length} / ${COINS.length}`], ['Puntos de Legado (total)', fmt(meta.lpTotal)], ['Reyes Cerdo derrotados', s.kings],
  ];
  body.innerHTML = `<div class="stats"><div class="srows">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
    <div class="scur"><h3>Tu mano ahora mismo</h3>${statLine().replace(/<span>/g, '<div>').replace(/<\/span>/g, '</div>')}
    <div>🔁 Golpe doble <b>${pct(S.dhit)}</b></div><div>👯 Botín doble <b>${pct(S.dbl)}</b></div><div>🌟 Brillantes <b>${pct(S.glow)}</b> (x${S.glowMult})</div>
    <div>🐷 Cerditos al empezar <b>${S.startPigs}</b> · máx. <b>${S.maxPigs}</b></div>${S.rock ? `<div>🪨 Rocas: ${S.rockCount} cada ${S.rockInterval.toFixed(1)}s</div>` : ''}${S.elec ? `<div>⚡ Electricidad <b>${pct(S.elec)}</b> · ${S.chains} saltos</div>` : ''}
    </div></div>`;
}

/* ============================================================
   BOTONES DEL HUB
   ============================================================ */
$('#btnPlay').onclick = () => {
  SFX.init(); SFX.click();
  const due = cyc.bills.filter(b => b.due <= 0);
  if (!due.length) return goRun([]);
  const embargo = due.some(b => b.overdue + 1 >= 4);
  const b = due[0];
  pushModal({
    cls: 'letter toni', sound: () => SFX.bad(),
    html: embargo
      ? `<div class="lhead"><span class="lic">⚠️</span><div><small>Último aviso</small><h2>Riesgo de embargo</h2></div></div>
         <div class="lbody"><p>Llevas demasiado tiempo sin pagar <b>${b.name}</b>. Si empiezas otra ronda sin pagarla, <b>te embargan todo</b> y entras en <b>quiebra</b>.</p></div>`
      : `<div class="lhead"><span class="lic">⏰</span><div><small>Fecha límite</small><h2>${b.name}</h2></div></div>
         <div class="lbody"><p>${b.overdue ? 'Esta factura sigue <b>vencida</b>. La comisión de Toni subirá un 10% más.' : `Si juegas sin pagarla, <b>Big Toni</b> empezará a quedarse un <b>${pct(b.loan ? .35 : .25)}</b> de todo lo que ganes.`}</p>
         <p>Te faltan <b>${money(b.amount - b.paid - Math.min(cyc.cash, b.amount - b.paid))}</b>.</p></div>`,
    buttons: [{ t: 'Volver', cls: 'ghost' }, { t: embargo ? 'Me arriesgo (quiebra)' : 'Jugar igualmente', cls: 'danger', fn: () => embargo ? doBankruptcy(true) : goRun(due) }],
  });
};
function goRun(due) {
  let first = null;
  due.forEach(b => { b.overdue++; if (b.overdue === 1 && !first) first = b; });
  save();
  if (first) pushModal(Object.assign(letterModal({ kind: 'overdue', bill: first }), { buttons: [{ t: 'Vale...', cls: 'primary', fn: startPlaying }] }));
  else startPlaying();
}
function startPlaying() {
  startRun();
  showScreen('run');
}

$('#btnPhone').onclick = () => {
  SFX.init(); SFX.click();
  if (cyc.loan) return;
  const o = requestLoan();
  pushModal({
    cls: 'letter phone',
    html: `<div class="phoneui"><div class="ph-top">📱 Llamando a <b>Big Toni</b>...</div>
      <div class="ph-avatar">🕴️</div>
      <p class="quote">«¿Problemas de liquidez, amigo? Te dejo <b>${money(o.amount)}</b> ahora mismo. Me devuelves <b>${money(o.repay)}</b> en <b>${o.due} rondas</b>. Si no... bueno, ya sabes cómo funciona esto.»</p>
      <p class="small">El préstamo aparece como factura. Si vence, Toni cobra un 35% de comisión. Solo puedes tener un préstamo a la vez.</p></div>`,
    buttons: [{ t: 'Colgar', cls: 'ghost' }, { t: `Aceptar ${money(o.amount)}`, cls: 'danger', fn: () => { takeLoan(o); SFX.cash(); renderHub(); } }],
  });
};

$('#btnBankrupt').onclick = () => {
  SFX.click();
  const gain = lpForBankruptcy();
  pushModal({
    cls: 'letter', html: `<div class="lhead"><span class="lic">📉</span><div><small>Declaración voluntaria</small><h2>¿Declararte en quiebra?</h2></div></div>
      <div class="lbody"><p>Perderás <b>todo el dinero, mejoras, martillos y cerditos desbloqueados</b> y empezarás un nuevo ciclo desde la primera factura.</p>
      <p>A cambio ganarás <b>⭐ ${fmt(gain)} Puntos de Legado</b> (1 por cada $50 pagados este ciclo: ${money(cyc.paidTotal)}) para comprar anillos y pulseras permanentes.</p></div>`,
    buttons: [{ t: 'Mejor no', cls: 'ghost' }, { t: 'Declarar quiebra', cls: 'danger', fn: () => doBankruptcy(false) }],
  });
};

function doBankruptcy(forced) {
  const info = declareBankruptcy();
  SFX.stamp();
  pushModal({
    cls: 'letter bankrupt', sound: () => { SFX.bad(); setTimeout(() => SFX.stamp(), 300); },
    html: `<div class="lhead"><span class="lic">${forced ? '🚨' : '📉'}</span><div><small>${forced ? 'AVISO DE EMBARGO' : 'Juzgado de lo mercantil'}</small><h2>Ciclo ${info.cycle} terminado</h2></div></div>
      <div class="lbody"><div class="stamp big">QUIEBRA</div>
      <div class="sumgrid"><div><span>Facturas pagadas</span><b>${info.bills}</b></div><div><span>Total pagado</span><b>${money(info.paid)}</b></div><div><span>Rondas</span><b>${info.rounds}</b></div><div class="hl"><span>Puntos de Legado</span><b>⭐ +${fmt(info.gain)}</b></div></div>
      <p class="center">Gástalos en <b>anillos y pulseras</b> antes de empezar el ciclo ${meta.cycle}.</p></div>`,
    buttons: [{ t: 'Ir a Legado', cls: 'primary', fn: () => { curTab = 'legacy'; showScreen('hub'); issueNextBill(); } }],
  }, true);
}

// Guarda (si hay partida) y vuelve a la galería de NSgames: relativa en la web, absoluta si se juega en local
function exitToNS() {
  if (meta && cyc) save();
  const url = location.pathname.includes('/nsgames/') ? '../' : 'https://5amueln5.github.io/nsgames/';
  document.body.style.transition = 'opacity .35s'; document.body.style.opacity = '0';
  setTimeout(() => { location.href = url; }, 350);
}
$('#btnNS').onclick = () => { SFX.click(); exitToNS(); };
$('#btnSound').onclick = () => { SFX.init(); SFX.enabled = !SFX.enabled; meta.sound = SFX.enabled; save(); renderHub(); };
$('#btnMenu').onclick = () => {
  SFX.click();
  pushModal({
    cls: 'letter', html: `<div class="lhead"><span class="lic">☰</span><div><small>Menú</small><h2>Pausa</h2></div></div><div class="lbody"><p>La partida se guarda automáticamente en este navegador.</p></div>`,
    buttons: [{ t: '← Volver a NSgames', cls: 'ghost', fn: exitToNS },
      { t: 'Volver al título', cls: 'ghost', fn: () => { save(); showScreen('title'); } },
      { t: 'Borrar partida', cls: 'danger', fn: () => pushModal({ cls: 'letter', html: `<div class="lbody"><h2>¿Seguro?</h2><p>Se borrará todo, incluido el Legado.</p></div>`, buttons: [{ t: 'No', cls: 'ghost' }, { t: 'Borrar todo', cls: 'danger', fn: () => { wipe(); meta = null; cyc = null; showScreen('title'); } }] }) },
      { t: 'Seguir', cls: 'primary' }],
  });
};

/* ============================================================
   FIN DE RONDA
   ============================================================ */
function finishRun() {
  if (!R || R.finishing) return;
  R.finishing = true;
  const sum = { round: cyc.round, earned: R.earned, toni: R.toni, smashed: R.smashed, best: R.best, coins: R.coins.slice(), jackpots: R.jackpots, king: R.kingKilled, cash: cyc.cash };
  meta.stats.bestRun = Math.max(meta.stats.bestRun, R.earned);
  meta.tutorial = false;
  cyc.round++;
  cyc.bills.forEach(b => { if (b.due > 0) b.due--; });
  R = null;
  save();
  showScreen('hub');
  const reg = regularBill();
  pushModal({
    cls: 'letter summary', sound: () => SFX.cash(),
    html: `<div class="lhead"><span class="lic">🧾</span><div><small>Resumen</small><h2>Fin de la ronda ${sum.round}</h2></div></div>
      <div class="lbody"><div class="sumgrid">
        <div class="hl"><span>Ganado</span><b>+${money(sum.earned)}</b></div>
        ${sum.toni > 0 ? `<div class="bad"><span>Se quedó Big Toni</span><b>-${money(sum.toni)}</b></div>` : ''}
        <div><span>Cerditos rotos</span><b>${sum.smashed}</b></div>
        <div><span>Golpe más fuerte</span><b>${fmt(sum.best)}</b></div>
        ${sum.jackpots ? `<div><span>Súper Jackpots</span><b>${sum.jackpots}</b></div>` : ''}
        <div><span>Dinero total</span><b>${money(sum.cash)}</b></div>
      </div>
      ${sum.coins.length ? `<p class="center">🪙 Nuevas monedas raras: <b>${sum.coins.map(i => COINS[i].n).join(', ')}</b></p>` : ''}
      ${reg ? `<p class="center small">${reg.icon} ${reg.name}: ${cyc.cash >= reg.amount - reg.paid ? '<b class="ok">¡ya puedes pagarla!</b>' : `te faltan <b>${money(reg.amount - reg.paid - cyc.cash)}</b>`}</p>` : ''}
      </div>`,
    buttons: [{ t: 'Continuar', cls: 'primary' }],
  }, true);
  if (sum.king) {
    pushModal({
      cls: 'letter victory', sound: () => SFX.jackpot(),
      html: `<div class="lhead"><span class="lic">🏆</span><div><small>Fin... ¿o no?</small><h2>¡Has derrotado al Rey Cerdo!</h2></div></div>
      <div class="lbody"><div class="stamp big gold">LIBRE DE DEUDAS</div>
      <p>Tras ${meta.stats.runs} rondas y ${fmt(meta.stats.smashed)} cerditos rotos, por fin has saldado tus cuentas. El reino porcino es tuyo.</p>
      <p>Pero, como todo el mundo sabe, <b>las facturas nunca dejan de llegar</b>. Puedes seguir jugando con facturas infinitas o declararte en quiebra para empezar un ciclo más fuerte.</p></div>`,
      buttons: [{ t: 'Seguir rompiendo', cls: 'primary', fn: () => issueNextBill() }],
    });
  }
}

/* ============================================================
   GAMBOLITO: juego de los vasos
   ============================================================ */
function openGamble() {
  R.mini = { end: true };
  mouse.down = false; keyDown = false;
  const ov = $('#gamble'); ov.classList.remove('hidden');
  const base = R.earned;
  const bets = base >= 5 ? [[.25, Math.floor(base * .25)], [.5, Math.floor(base * .5)], [1, Math.floor(base)]] : [];
  const free = Math.max(20, Math.round(avgLoot(PIGS[Math.max(0, cyc.unl - 2)]) * S.lootTotal));
  $('#gMsg').innerHTML = base >= 5
    ? `«Se acabó la ronda, colega. ¿Te atreves? Encuentra la bolita y te pago <b>x${S.gamble}</b>.» Lo ganado esta ronda: <b>${money(base)}</b>`
    : `«No llevas nada encima... Venga, la primera va de regalo: si aciertas te llevas <b>${money(free)}</b>.»`;
  const bb = $('#gBets'); bb.innerHTML = '';
  (bets.length ? bets : [[0, 0]]).forEach(([f, v]) => {
    const b = document.createElement('button'); b.className = 'btn primary';
    b.innerHTML = f ? `Apostar ${pct(f)} <small>${money(v)}</small>` : 'Jugar gratis';
    b.onclick = () => { SFX.click(); runCups(v, f ? 0 : free); };
    bb.appendChild(b);
  });
  const no = document.createElement('button'); no.className = 'btn ghost'; no.textContent = 'Paso'; no.onclick = () => closeGamble(false);
  bb.appendChild(no);
  const cups = $('#gCups'); cups.innerHTML = '';
  cupState = { order: [0, 1, 2], ball: 1, busy: true };
  for (let i = 0; i < 3; i++) {
    const c = document.createElement('div'); c.className = 'cup'; c.dataset.i = i; c.style.left = (40 + i * 170) + 'px';
    c.innerHTML = '<div class="cupbody"></div>';
    cups.appendChild(c);
  }
  const ball = document.createElement('div'); ball.className = 'ball'; ball.style.left = (40 + 170 + 50) + 'px'; cups.appendChild(ball);
  cups.querySelectorAll('.cup')[1].classList.add('up');
}
let cupState = null;
function runCups(bet, free) {
  $('#gBets').innerHTML = '';
  $('#gMsg').innerHTML = '«Mira bien... no le quites ojo a la bolita...»';
  const cups = [...document.querySelectorAll('#gCups .cup')];
  const ball = document.querySelector('#gCups .ball');
  setTimeout(() => {
    cups[1].classList.remove('up'); ball.classList.add('hide');
    // slot[i] = cup que hay en la posición i
    const slot = [0, 1, 2];
    let n = 0; const total = 9 + Math.floor(Math.random() * 4);
    const step = () => {
      if (n++ >= total) return pick();
      const a = rndi(0, 2); let b = rndi(0, 1); if (b >= a) b++;
      [slot[a], slot[b]] = [slot[b], slot[a]];
      slot.forEach((ci, pos) => { cups[ci].style.left = (40 + pos * 170) + 'px'; });
      SFX.shuffle();
      setTimeout(step, Math.max(150, 330 - n * 18));
    };
    setTimeout(step, 500);
    const pick = () => {
      $('#gMsg').innerHTML = '«Venga... ¿dónde está?» <b>Elige un vaso.</b>';
      cups.forEach(c => c.classList.add('pickable'));
      cups.forEach((c, ci) => c.onclick = () => {
        cups.forEach(x => { x.onclick = null; x.classList.remove('pickable'); });
        const pos = slot.indexOf(1);
        ball.style.left = (40 + pos * 170 + 50) + 'px'; ball.classList.remove('hide');
        c.classList.add('up');
        const win = ci === 1;
        setTimeout(() => { if (!win) cups[1].classList.add('up'); }, 500);
        let delta = 0;
        if (win) delta = free ? free : bet * (S.gamble - 1);
        else delta = free ? 0 : -bet;
        cyc.cash = Math.max(0, cyc.cash + delta); R.earned += delta;
        if (win) { SFX.jackpot(); $('#gMsg').innerHTML = `«¡Vaya ojo! Toma, <b>+${money(delta)}</b>. Me has desplumado...»`; }
        else { SFX.bad(); $('#gMsg').innerHTML = free ? '«¡Ja! La próxima vez será.»' : `«Mala suerte, colega. Me quedo tus <b>${money(bet)}</b>.»`; }
        const bb = $('#gBets');
        const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Seguir rompiendo';
        b.onclick = () => closeGamble(true); bb.appendChild(b);
      });
    };
  }, 450);
}
function closeGamble() {
  $('#gamble').classList.add('hidden');
  if (!R || !R.mini) return;
  R.mini = null;
  finishRun();   // el minijuego cierra la ronda
}

/* ============================================================
   PAUSA
   ============================================================ */
function togglePause(force) {
  if (!R || R.mini) return;
  R.paused = force != null ? force : !R.paused;
  $('#pause').classList.toggle('hidden', !R.paused);
}
$('#pResume').onclick = () => togglePause(false);
$('#pEnd').onclick = () => { togglePause(false); if (R) { R.st = 0; R.ended = true; R.endT = .3; } };

/* ============================================================
   ENTRADA
   ============================================================ */
function toStage(e) {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width * W;
  mouse.y = (e.clientY - r.top) / r.height * H;
  mouse.inside = mouse.x >= 0 && mouse.x <= W && mouse.y >= 0 && mouse.y <= H;
}
cv.addEventListener('pointerdown', e => { SFX.init(); toStage(e); mouse.down = true; cv.setPointerCapture(e.pointerId); if (R) trySwing(); });
cv.addEventListener('pointermove', e => toStage(e));
cv.addEventListener('pointerup', () => { mouse.down = false; });
cv.addEventListener('pointercancel', () => { mouse.down = false; });
cv.addEventListener('pointerleave', () => { mouse.inside = false; });
cv.addEventListener('pointerenter', e => { toStage(e); });
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (screen !== 'run') return;
  if (e.code === 'Space') { keyDown = true; e.preventDefault(); }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});
window.addEventListener('keyup', e => { if (e.code === 'Space') keyDown = false; });
window.addEventListener('blur', () => { mouse.down = false; keyDown = false; if (R && !R.ended) togglePause(true); });
window.addEventListener('resize', fitStage);

$('#btnNew').onclick = () => {
  SFX.init(); SFX.click();
  const has = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
  if (has) pushModal({ cls: 'letter', html: `<div class="lbody"><h2>¿Empezar de cero?</h2><p>Se borrará la partida guardada, incluido el Legado.</p></div>`, buttons: [{ t: 'Cancelar', cls: 'ghost' }, { t: 'Nueva partida', cls: 'danger', fn: newGame }] });
  else newGame();
};
$('#btnContinue').onclick = () => { SFX.init(); SFX.click(); continueGame(); };

/* ============================================================
   BUCLE PRINCIPAL
   ============================================================ */
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (screen === 'run' && R) {
    // un error puntual no debe congelar ni ensuciar la partida
    try { updateRun(dt); if (R) drawRun(ctx); } catch (e) { console.error(e); }
  }
  requestAnimationFrame(frame);
}

fitStage();
showScreen('title');
requestAnimationFrame(frame);
