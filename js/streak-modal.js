import { data, ensureStatsFresh } from './storage.js';
import { startOfWeekMonday } from './utils.js';

const FLAME_SVG = `<svg viewBox="0 0 24 24" class="streak-flame-svg" fill="url(#streakFireGrad)" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="streakFireGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFD166"/>
      <stop offset="0.4" stop-color="#FB9A9A"/>
      <stop offset="1" stop-color="#F87171"/>
    </linearGradient>
  </defs>
  <path d="M12 2C12 2 6 7 6 13C6 16.3137 8.68629 19 12 19C15.3137 19 18 16.3137 18 13C18 7 12 2 12 2ZM12 17.5C10.6193 17.5 9.5 16.3807 9.5 15C9.5 14.1627 9.91494 13.4215 10.5694 13.0031C11.4552 12.4369 12.5539 12.0298 12.5539 12.0298C12.5539 12.0298 12.0526 13.1257 12.0526 14.2857C12.0526 14.6802 12.3724 15 12.7669 15C13.1614 15 13.4812 14.6802 13.4812 14.2857C13.4812 13.7915 13.3857 13.3283 13.2188 12.9157C13.8821 13.3514 14.3464 14.1132 14.3464 15C14.3464 16.3807 13.3807 17.5 12 17.5Z"/>
</svg>`;

const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

const WEEKDAY_FULL = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

let sparksFrameId = null;
let sparks = [];
let sparksCanvas = null;
let sparksCtx = null;

function dayKey(d) {
  return new Date(d).toDateString();
}

function buildActiveDaySet() {
  const set = new Set();
  for (const s of data.sessions) {
    set.add(dayKey(new Date(s.startTime)));
  }
  return set;
}

function getStreakDays(daySet, now = new Date()) {
  const todayStr = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOffset = daySet.has(todayStr) || !daySet.has(dayKey(yesterday)) ? 0 : 1;

  const days = [];
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (daySet.has(dayKey(d))) days.push(d);
    else break;
  }
  return days;
}

function buildMiniStreakRow(streakDays) {
  const mini = [...streakDays.slice(0, 4)].reverse();
  if (mini.length === 0) {
    return `<div class="streak-mini-empty">Estudia hoy para empezar tu racha</div>`;
  }

  const slots = 4;
  const padded = [...Array(slots - mini.length).fill(null), ...mini];

  const labels = padded.map(d =>
    d ? d.toLocaleDateString('es-ES', { weekday: 'narrow' }).replace('.', '').toUpperCase() : ''
  );

  const nodes = padded.map((d, i) => {
    if (!d) return `<div class="streak-mini-dot streak-mini-dot--empty" aria-hidden="true"></div>`;
    const isToday = i === padded.length - 1;
    const cls = isToday ? 'streak-mini-dot streak-mini-dot--today' : 'streak-mini-dot';
    return `<div class="${cls}">${CHECK_SVG}</div>`;
  }).join('');

  return `
    <div class="streak-mini-labels">${labels.map(l => `<span>${l}</span>`).join('')}</div>
    <div class="streak-mini-track">
      <div class="streak-mini-line" aria-hidden="true"></div>
      ${nodes}
    </div>`;
}

function buildWeekGrid(daySet, streakDayKeys, now = new Date()) {
  const weekStart = startOfWeekMonday(now);
  const todayKey = dayKey(now);
  const cells = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    d.setHours(12, 0, 0, 0);
    const key = dayKey(d);
    const hasSession = daySet.has(key);
    const inStreak = streakDayKeys.has(key);
    const isToday = key === todayKey;
    const isFuture = d > now && !isToday;

    let cls = 'streak-week-cell';
    if (isToday && hasSession) cls += ' streak-week-cell--today streak-week-cell--done';
    else if (isToday) cls += ' streak-week-cell--today';
    else if (inStreak && hasSession) cls += ' streak-week-cell--done';
    else if (isFuture) cls += ' streak-week-cell--future';
    else cls += ' streak-week-cell--idle';

    const inner = isToday
      ? `<span>${d.getDate()}</span>`
      : (inStreak && hasSession)
        ? CHECK_SVG
        : `<span>${d.getDate()}</span>`;

    cells.push(`<div class="${cls}">${inner}</div>`);
  }

  let connectorStyle = '';
  let firstDone = -1;
  let lastDone = -1;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    if (streakDayKeys.has(dayKey(d))) {
      if (firstDone === -1) firstDone = i;
      lastDone = i;
    }
  }
  if (firstDone >= 0 && lastDone > firstDone) {
    const cellPct = 100 / 7;
    const left = firstDone * cellPct + cellPct / 2;
    const width = (lastDone - firstDone) * cellPct;
    connectorStyle = `style="left:calc(${left}% - 1px);width:calc(${width}% - 4px)"`;
  }

  const connectorHtml = connectorStyle
    ? `<div class="streak-week-connector" ${connectorStyle} aria-hidden="true"></div>`
    : '';

  return `
    <div class="streak-week-calendar">
      <div class="streak-week-labels">${WEEKDAY_FULL.map(l => `<span>${l}</span>`).join('')}</div>
      <div class="streak-week-cells-wrap">
        ${connectorHtml}
        <div class="streak-week-cells">${cells.join('')}</div>
      </div>
    </div>`;
}

function renderModalContent({ mode = 'default' } = {}) {
  ensureStatsFresh();
  const now = new Date();
  const daySet = buildActiveDaySet();
  const streakDays = getStreakDays(daySet, now);
  const streak = data.stats.currentStreak;
  const best = data.stats.bestStreak;
  const streakDayKeys = new Set(streakDays.map(dayKey));

  const title = mode === 'celebrate' ? 'Nueva racha' : 'Tu racha';

  document.getElementById('streakHeroNumber').textContent = streak;
  document.getElementById('streakView1Title').textContent = title;
  document.getElementById('streakDetailNumber').textContent = streak;
  document.getElementById('streakMiniWrap').innerHTML = buildMiniStreakRow(streakDays);
  document.getElementById('streakWeekWrap').innerHTML = buildWeekGrid(daySet, streakDayKeys, now);

  const tip = streak === 0
    ? 'Completa tu primera sesión de hoy para encender la llama de tu racha.'
    : streak >= best && streak > 1
      ? `¡Récord personal! Llevas ${streak} días seguidos. Sigue así para superarte.`
      : `Tu disciplina está creciendo. Cada sesión completada es un paso más cerca de tus metas de estudio.${best > streak ? ` Tu récord: ${best} días.` : ''}`;

  document.getElementById('streakTipText').textContent = tip;

  document.querySelectorAll('.streak-flame-wrap').forEach((el, i) => {
    el.innerHTML = FLAME_SVG.replace(/streakFireGrad/g, `streakFireGrad${i}`);
  });
}

function resetViews() {
  const view1 = document.getElementById('streakView1');
  const view2 = document.getElementById('streakView2');

  view1.classList.remove('hidden', 'view-exit', 'view-enter');
  view1.classList.add('fade-in-up');
  view2.classList.add('hidden');
  view2.classList.remove('view-enter', 'view-exit');
  view2.classList.add('is-hidden');
}

function goToStreakDetail() {
  const view1 = document.getElementById('streakView1');
  const view2 = document.getElementById('streakView2');

  view1.classList.remove('fade-in-up');
  view1.classList.add('view-exit');

  setTimeout(() => {
    view1.classList.add('hidden');
    view2.classList.remove('hidden', 'is-hidden');
    view2.classList.add('view-enter');
  }, 500);
}

function resizeSparksCanvas() {
  if (!sparksCanvas) return;
  sparksCanvas.width = window.innerWidth;
  sparksCanvas.height = window.innerHeight;
}

class Spark {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = (Math.random() * sparksCanvas.width * 0.8) + (sparksCanvas.width * 0.1);
    this.y = initial
      ? Math.random() * sparksCanvas.height
      : sparksCanvas.height + Math.random() * 50;
    this.size = Math.random() * 1.5 + 0.5;
    this.speedY = Math.random() * 1.5 + 0.3;
    this.speedX = (Math.random() - 0.5) * 0.8;
    const colors = ['rgba(248, 113, 113, ', 'rgba(251, 146, 60, ', 'rgba(253, 186, 116, '];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.opacity = Math.random() * 0.8 + 0.2;
  }

  update() {
    this.y -= this.speedY;
    this.x += this.speedX;
    if (this.y < sparksCanvas.height * 0.6) this.opacity -= 0.005;
  }

  draw() {
    sparksCtx.beginPath();
    sparksCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    sparksCtx.fillStyle = this.color + Math.max(0, this.opacity) + ')';
    sparksCtx.fill();
  }
}

function startSparks() {
  sparksCanvas = document.getElementById('streakSparksCanvas');
  if (!sparksCanvas) return;
  sparksCtx = sparksCanvas.getContext('2d');
  resizeSparksCanvas();
  sparks = Array.from({ length: 35 }, () => new Spark());

  function animate() {
    if (!sparksCtx || document.getElementById('streakModal')?.classList.contains('hidden')) return;
    sparksCtx.clearRect(0, 0, sparksCanvas.width, sparksCanvas.height);
    for (let i = 0; i < sparks.length; i++) {
      sparks[i].update();
      sparks[i].draw();
      if (sparks[i].opacity <= 0 || sparks[i].y < 0) sparks[i].reset();
    }
    sparksFrameId = requestAnimationFrame(animate);
  }

  stopSparks();
  sparksFrameId = requestAnimationFrame(animate);
}

function stopSparks() {
  if (sparksFrameId) cancelAnimationFrame(sparksFrameId);
  sparksFrameId = null;
}

export function closeStreakModal() {
  const overlay = document.getElementById('streakModal');
  if (!overlay || overlay.classList.contains('hidden')) return;
  overlay.classList.remove('show');
  stopSparks();
  setTimeout(() => {
    overlay.classList.add('hidden');
    resetViews();
    document.body.style.overflow = '';
  }, 280);
}

export function openStreakModal({ mode = 'default' } = {}) {
  const overlay = document.getElementById('streakModal');
  if (!overlay) return;

  renderModalContent({ mode });
  resetViews();
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('show'));
  startSparks();
}

export function initStreakModal() {
  document.getElementById('streakBtnContinue')?.addEventListener('click', goToStreakDetail);
  document.getElementById('streakBtnBack')?.addEventListener('click', closeStreakModal);

  document.getElementById('streakModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'streakModal') closeStreakModal();
  });

  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('streakModal');
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeStreakModal();
    }
  });

  window.addEventListener('resize', resizeSparksCanvas);
}
