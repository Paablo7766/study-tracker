import { data, saveData, applySessionToStats, ensureStatsFresh } from './storage.js';
import { uid, toLocalDatetimeInputValue, startOfWeekMonday } from './utils.js';
import { showToast, navigateTo } from './ui.js';
import { refreshStatsIfVisible, showStreakCelebration } from './dashboard.js';
import { getSubjectGoalProgress } from './subjectGoals.js';

const ORIGINAL_TITLE = document.title;
const CIRCUM = 2 * Math.PI * 54;
const SOUND_LIBRARY = {
  'chime-major': [523.25, 659.25, 784.0],
  'chime-soft': [392.0, 523.25],
  'bell': [660.0],
  'none': []
};

let mode = 'focus';
let secondsLeft = data.settings.focusMin * 60;
let isRunning = false;
let isPaused = false;
let intervalId = null;
let cyclesCompleted = 0;
let sessionStart = null;
let focusSecondsAtStart = secondsLeft;
let modeEndTimestamp = null;
let pendingNextMode = null;
let ring = null;

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function formatHoursMinutes(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function updateTimerDisplay() {
  document.getElementById('timeDisplay').textContent = formatTime(secondsLeft);

  const modeEl = document.getElementById('modeDisplay');
  const circle = document.getElementById('timerCircleWrap');

  if (isPaused && !isRunning) {
    modeEl.textContent = 'Pausado';
    circle.classList.add('paused');
  } else {
    circle.classList.remove('paused');
    modeEl.textContent = mode === 'focus' ? 'Enfoque' : mode === 'break' ? 'Descanso' : 'Descanso largo';
  }

  const totalForMode = mode === 'focus'
    ? data.settings.focusMin * 60
    : mode === 'break'
      ? data.settings.breakMin * 60
      : data.settings.longBreakMin * 60;
  const progress = 1 - secondsLeft / totalForMode;
  if (ring) {
    ring.style.strokeDashoffset = CIRCUM * (1 - progress);
    ring.style.stroke = mode === 'focus' ? '#f4f4f5' : '#34d399';
  }
  updateCycleTrackFill();

  document.getElementById('timeAdjustRow').classList.toggle('hidden', isRunning || isPaused);

  if (isRunning) {
    document.title = `${formatTime(secondsLeft)} · Study Tracker`;
  } else {
    document.title = ORIGINAL_TITLE;
  }

  updateLiveSessionUI();
}

function getModeTotalSeconds() {
  return mode === 'focus'
    ? data.settings.focusMin * 60
    : mode === 'break'
      ? data.settings.breakMin * 60
      : data.settings.longBreakMin * 60;
}

function placeLiveSessionBanner(show) {
  const banner = document.getElementById('liveSessionBanner');
  const main = document.querySelector('main');
  if (!banner || !main) return;

  if (!show) {
    if (banner.parentElement !== main) main.insertBefore(banner, main.firstElementChild);
    return;
  }

  const activeSection = document.querySelector('main > section:not(.hidden)');
  if (!activeSection) return;

  const anchor = activeSection.querySelector('.dash-header, .settings-header')
    || activeSection.querySelector('.materias-tabs');
  if (anchor) {
    if (banner.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', banner);
  } else if (banner.parentElement !== activeSection) {
    activeSection.insertBefore(banner, activeSection.firstElementChild);
  }
}

export function updateLiveSessionUI() {
  const banner = document.getElementById('liveSessionBanner');
  if (!banner) return;

  const active = isRunning || isPaused;
  const timerView = document.getElementById('view-timer');
  const onTimerView = timerView && !timerView.classList.contains('hidden');
  const show = active && !onTimerView;

  banner.classList.toggle('hidden', !show);
  banner.classList.toggle('live-session--running', isRunning);
  banner.classList.toggle('live-session--paused', isPaused && !isRunning);
  banner.classList.toggle('live-session--break', mode !== 'focus');
  banner.classList.toggle('live-session--focus', mode === 'focus');

  placeLiveSessionBanner(show);

  const timerNav = document.querySelector('nav button[data-view="timer"]');
  timerNav?.classList.toggle('nav-live', active && !onTimerView);
  timerNav?.classList.toggle('nav-live--paused', isPaused && !isRunning);
  timerNav?.classList.toggle('nav-live--break', active && !onTimerView && mode !== 'focus');

  if (!show) return;

  const fill = document.getElementById('liveSessionFill');
  const timeEl = document.getElementById('liveSessionTime');
  const labelEl = document.getElementById('liveSessionLabel');
  const eyebrowEl = document.getElementById('liveSessionEyebrow');
  const totalForMode = getModeTotalSeconds();
  const progress = totalForMode > 0
    ? Math.min(100, Math.max(0, (1 - secondsLeft / totalForMode) * 100))
    : 0;

  if (fill) fill.style.width = `${progress}%`;
  if (timeEl) timeEl.textContent = formatTime(secondsLeft);
  if (eyebrowEl) eyebrowEl.textContent = isPaused && !isRunning ? 'Pausado' : 'En vivo';

  const modeLabel = isPaused && !isRunning
    ? 'Sesión en pausa'
    : mode === 'focus'
      ? 'Enfoque'
      : mode === 'break'
        ? 'Descanso'
        : 'Descanso largo';

  let subjectName = '';
  if (mode === 'focus') {
    const subjectId = document.getElementById('subjectSelect')?.value;
    const subject = subjectId ? data.subjects.find(s => s.id === subjectId) : null;
    subjectName = subject?.name || '';
  }

  if (labelEl) {
    labelEl.textContent = subjectName ? `${modeLabel} · ${subjectName}` : modeLabel;
  }
}

function syncFromRealClock() {
  if (!isRunning || modeEndTimestamp === null) return;
  const remainingMs = modeEndTimestamp - Date.now();
  if (remainingMs <= 0) {
    secondsLeft = 0;
    updateTimerDisplay();
    finishCurrentMode();
  } else {
    secondsLeft = Math.ceil(remainingMs / 1000);
  }
}

function tick() {
  syncFromRealClock();
  updateTimerDisplay();
}

function notifyModeFinished(finishedMode) {
  if (!data.settings.notifyOnFinish) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const label = finishedMode === 'focus' ? 'Pomodoro terminado' : 'Descanso terminado';
  const body = finishedMode === 'focus' ? 'Es hora de un descanso.' : 'Es hora de volver al enfoque.';
  new Notification(label, { body, icon: '' });
}

function showNextModeChoices(finishedMode) {
  const continueBtn = document.getElementById('continueFocusBtn');
  const startNextBtn = document.getElementById('startNextBtn');

  if (finishedMode === 'focus') {
    startNextBtn.textContent = 'Descansar';
    continueBtn.classList.remove('hidden');
  } else {
    startNextBtn.textContent = 'Seguir estudiando';
    continueBtn.classList.add('hidden');
  }

  document.getElementById('mainBtnRow').classList.add('hidden');
  document.getElementById('nextModeRow').classList.remove('hidden');
}

function finishCurrentMode() {
  const finishedMode = mode;
  isRunning = false;
  isPaused = false;
  clearInterval(intervalId);
  modeEndTimestamp = null;
  document.title = ORIGINAL_TITLE;

  let nextMode;
  if (finishedMode === 'focus') {
    saveSession();
    cyclesCompleted++;
    nextMode = (cyclesCompleted % data.settings.cyclesBeforeLongBreak === 0) ? 'longBreak' : 'break';
  } else {
    nextMode = 'focus';
    sessionStart = null;
  }
  pendingNextMode = nextMode;
  playBeep();
  notifyModeFinished(finishedMode);

  const circle = document.getElementById('timerCircleWrap');
  circle.classList.remove('running', 'paused');
  circle.classList.add('completed');
  setTimeout(() => circle.classList.remove('completed'), 1000);

  // Solo auto-inicia el descanso tras un pomodoro de enfoque.
  const shouldAutoStart = data.settings.autoStartBreak && finishedMode === 'focus';
  if (shouldAutoStart) {
    const breakMode = pendingNextMode;
    pendingNextMode = null;
    goToMode(breakMode);
    startTicking();
  } else {
    showNextModeChoices(finishedMode);
    updateTimerDisplay();
  }
}

function goToMode(nextMode) {
  mode = nextMode;
  isPaused = false;
  secondsLeft = mode === 'focus'
    ? data.settings.focusMin * 60
    : mode === 'break'
      ? data.settings.breakMin * 60
      : data.settings.longBreakMin * 60;
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.getElementById('timerCircleWrap').classList.remove('paused');
  updateTimerDisplay();
}

/** Deja el timer en enfoque listo para iniciar, sin arrancar. */
function endFlowReadyForFocus() {
  isRunning = false;
  isPaused = false;
  clearInterval(intervalId);
  modeEndTimestamp = null;
  pendingNextMode = null;
  sessionStart = null;
  mode = 'focus';
  secondsLeft = data.settings.focusMin * 60;
  document.getElementById('startBtn').textContent = 'Iniciar';
  document.getElementById('timerCircleWrap').classList.remove('running', 'paused');
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.title = ORIGINAL_TITLE;
  updateTimerDisplay();
}

function playSoundKey(key) {
  if (!key || key === 'none' || !SOUND_LIBRARY[key]) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = SOUND_LIBRARY[key];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + i * 0.12;
      const attackTime = 0.05;
      const releaseTime = 1.1;
      const peakVolume = 0.11;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(peakVolume, startTime + attackTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attackTime + releaseTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + attackTime + releaseTime + 0.05);
    });

    setTimeout(() => ctx.close(), 1600);
  } catch (e) { /* AudioContext no disponible */ }
}

function playBeep() {
  const key = mode === 'focus' ? 'chime-major' : 'chime-soft';
  playSoundKey(key);
}

function saveSession() {
  const subjectId = document.getElementById('subjectSelect').value;
  if (!subjectId || !sessionStart) return;
  const durationMin = Math.round(focusSecondsAtStart / 60);

  const session = {
    id: uid(),
    subjectId,
    startTime: sessionStart.toISOString(),
    endTime: new Date().toISOString(),
    durationMin,
    type: 'pomodoro',
    notes: null,
    createdAt: new Date().toISOString()
  };
  data.sessions.push(session);
  const { isFirstSessionToday } = applySessionToStats(session);
  saveData();
  renderSubjectProgress();
  renderSubjectContext();
  refreshStatsIfVisible();
  if (isFirstSessionToday) showStreakCelebration();
}

export function renderSubjectContext() {
  const el = document.getElementById('subjectContext');
  if (!el) return;
  ensureStatsFresh();
  const subjectId = document.getElementById('subjectSelect').value;
  const subject = subjectId ? data.subjects.find(s => s.id === subjectId) : null;
  if (!subject) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  const weekStart = startOfWeekMonday(new Date());
  const progress = getSubjectGoalProgress(subject, data.sessions, weekStart);
  el.classList.remove('hidden');
  if (!progress.hasGoal) {
    const totalMin = data.stats.bySubjectMinutes[subjectId] || 0;
    el.innerHTML = `<span class="dot" style="background:${subject.color}"></span>${subject.name} · ${formatHoursMinutes(totalMin)} registradas`;
    return;
  }
  el.innerHTML = `<span class="dot" style="background:${subject.color}"></span>${subject.name} · ${progress.label}`;
}

export function renderSubjectProgress() {
  const wrap = document.getElementById('subjectProgress');
  ensureStatsFresh();
  const todayCount = data.stats.todayCount;
  const target = data.settings.dailyGoal || 4;
  const rawPct = Math.round((todayCount / target) * 100);
  const goalMet = todayCount >= target;
  const barPct = Math.min(100, rawPct);
  const remaining = Math.max(0, target - todayCount);

  const labelEl = document.getElementById('subjectProgressLabel');
  const pctEl = document.getElementById('subjectProgressPct');
  const fillEl = document.getElementById('subjectProgressFill');

  if (goalMet) {
    labelEl.textContent = todayCount > target
      ? `Objetivo diario superado · ${todayCount}/${target}`
      : `Objetivo diario cumplido · ${todayCount}/${target}`;
  } else {
    labelEl.textContent = remaining === 1
      ? 'Te falta 1 bloque para el objetivo diario'
      : `Te faltan ${remaining} bloques para el objetivo diario`;
  }
  pctEl.textContent = `${rawPct}%`;
  fillEl.style.width = barPct + '%';
  wrap.classList.remove('hidden');
}

export function renderCycleTrack() {
  const container = document.getElementById('cycleTrack');
  const totalFocus = data.settings.cyclesBeforeLongBreak;
  let html = '';
  for (let i = 0; i < totalFocus; i++) {
    html += `<div class="cycle-seg seg-focus" data-kind="focus" data-index="${i}"><div class="cycle-seg-fill"></div></div>`;
    if (i < totalFocus - 1) {
      html += `<div class="cycle-seg seg-break" data-kind="break" data-index="${i}"><div class="cycle-seg-fill"></div></div>`;
    }
  }
  html += `<div class="cycle-seg seg-longbreak" data-kind="longBreak" data-index="0"><div class="cycle-seg-fill"></div></div>`;
  container.innerHTML = html;
  container.dataset.builtFor = totalFocus;
}

export function updateCycleTrackFill() {
  const container = document.getElementById('cycleTrack');
  if (!container) return;
  const totalFocus = data.settings.cyclesBeforeLongBreak;
  if (Number(container.dataset.builtFor) !== totalFocus) renderCycleTrack();

  const slotInCycle = cyclesCompleted % totalFocus;

  container.querySelectorAll('.cycle-seg').forEach(seg => {
    const kind = seg.dataset.kind;
    const index = Number(seg.dataset.index);
    const fill = seg.querySelector('.cycle-seg-fill');
    let isPast = false;
    let isActive = false;

    if (kind === 'focus') {
      if (mode === 'longBreak') {
        isPast = true;
      } else {
        isPast = index < slotInCycle;
        isActive = mode === 'focus' && index === slotInCycle;
      }
    } else if (kind === 'break') {
      if (mode === 'longBreak') {
        isPast = true;
      } else if (mode === 'break') {
        isPast = index < slotInCycle - 1;
        isActive = index === slotInCycle - 1;
      } else {
        isPast = index < slotInCycle;
      }
    } else if (kind === 'longBreak') {
      isActive = mode === 'longBreak';
      isPast = mode === 'focus' && slotInCycle === 0 && cyclesCompleted > 0;
    }

    if (isActive) {
      const totalForMode = mode === 'focus'
        ? data.settings.focusMin * 60
        : mode === 'break'
          ? data.settings.breakMin * 60
          : data.settings.longBreakMin * 60;
      const progress = Math.min(100, Math.max(0, (1 - secondsLeft / totalForMode) * 100));
      seg.classList.remove('done');
      fill.style.width = progress + '%';
    } else if (isPast) {
      seg.classList.add('done');
      fill.style.width = '0%';
    } else {
      seg.classList.remove('done');
      fill.style.width = '0%';
    }
  });
}

export function resetTimerFromSettings() {
  isRunning = false;
  isPaused = false;
  clearInterval(intervalId);
  modeEndTimestamp = null;
  pendingNextMode = null;
  sessionStart = null;

  mode = 'focus';
  secondsLeft = data.settings.focusMin * 60;
  cyclesCompleted = 0;
  focusSecondsAtStart = secondsLeft;

  document.getElementById('startBtn').textContent = 'Iniciar';
  document.getElementById('timerCircleWrap').classList.remove('running', 'paused');
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.title = ORIGINAL_TITLE;

  updateTimerDisplay();
  renderSubjectProgress();
  renderSubjectContext();
  renderCycleTrack();
  updateCycleTrackFill();
}

function openManualModal() {
  const sel = document.getElementById('manualSubject');
  sel.innerHTML = data.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('manualDuration').value = data.settings.focusMin;
  document.getElementById('manualDatetime').value = toLocalDatetimeInputValue(new Date());
  document.getElementById('manualNotes').value = '';
  document.getElementById('manualModal').classList.remove('hidden');
}

function closeManualModal() {
  document.getElementById('manualModal').classList.add('hidden');
}

function adjustClock(deltaSeconds) {
  secondsLeft = Math.max(0, secondsLeft + deltaSeconds);

  if (isRunning) {
    modeEndTimestamp = Date.now() + secondsLeft * 1000;
    if (secondsLeft === 0) {
      finishCurrentMode();
      return;
    }
  }
  updateTimerDisplay();
}

function startTicking() {
  isRunning = true;
  isPaused = false;
  document.getElementById('startBtn').textContent = 'Pausar';
  document.getElementById('timerCircleWrap').classList.add('running');
  document.getElementById('timerCircleWrap').classList.remove('paused');
  if (mode === 'focus' && !sessionStart) {
    sessionStart = new Date();
    focusSecondsAtStart = secondsLeft;
  }
  modeEndTimestamp = Date.now() + secondsLeft * 1000;
  intervalId = setInterval(tick, 250);
  updateTimerDisplay();
}

function toggleStartPause() {
  if (!isRunning) {
    const subjectSelect = document.getElementById('subjectSelect');
    if (mode === 'focus' && !sessionStart && !subjectSelect.value) {
      document.getElementById('subjectSelectBtn').classList.add('select-warning');
      setTimeout(() => document.getElementById('subjectSelectBtn').classList.remove('select-warning'), 1200);
      showToast('Selecciona una materia antes de empezar');
      return;
    }
    startTicking();
  } else {
    isRunning = false;
    isPaused = true;
    document.getElementById('startBtn').textContent = 'Reanudar';
    document.getElementById('timerCircleWrap').classList.remove('running');
    document.getElementById('timerCircleWrap').classList.add('paused');
    clearInterval(intervalId);
    modeEndTimestamp = null;
    document.title = ORIGINAL_TITLE;
    updateTimerDisplay();
  }
}

function resetTimer() {
  isRunning = false;
  isPaused = false;
  clearInterval(intervalId);
  mode = 'focus';
  secondsLeft = data.settings.focusMin * 60;
  sessionStart = null;
  modeEndTimestamp = null;
  pendingNextMode = null;
  document.getElementById('startBtn').textContent = 'Iniciar';
  document.getElementById('timerCircleWrap').classList.remove('running', 'paused');
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.title = ORIGINAL_TITLE;
  updateTimerDisplay();
}

export function initTimer() {
  ring = document.getElementById('timerRing');
  ring.setAttribute('stroke-dasharray', CIRCUM);

  document.getElementById('subjectSelect').addEventListener('change', () => {
    renderSubjectProgress();
    renderSubjectContext();
    document.getElementById('subjectSelect').classList.remove('select-warning');
  });

  document.getElementById('minus5Btn').addEventListener('click', () => adjustClock(-5 * 60));
  document.getElementById('minus1Btn').addEventListener('click', () => adjustClock(-1 * 60));
  document.getElementById('plus1Btn').addEventListener('click', () => adjustClock(1 * 60));
  document.getElementById('plus5Btn').addEventListener('click', () => adjustClock(5 * 60));

  document.getElementById('addManualBtn').addEventListener('click', openManualModal);
  document.getElementById('manualCancelBtn').addEventListener('click', closeManualModal);
  document.getElementById('manualModal').addEventListener('click', (e) => {
    if (e.target.id === 'manualModal') closeManualModal();
  });

  document.getElementById('manualSaveBtn').addEventListener('click', () => {
    const subjectId = document.getElementById('manualSubject').value;
    const durationMin = parseInt(document.getElementById('manualDuration').value, 10);
    const dtValue = document.getElementById('manualDatetime').value;
    const notes = document.getElementById('manualNotes').value.trim();

    if (!subjectId) { showToast('Selecciona una materia'); return; }
    if (!durationMin || durationMin <= 0) { showToast('Duración inválida'); return; }
    if (!dtValue) { showToast('Selecciona fecha y hora'); return; }

    const startTime = new Date(dtValue);
    const endTime = new Date(startTime.getTime() + durationMin * 60000);
    const subject = data.subjects.find(s => s.id === subjectId);

    const session = {
      id: uid(),
      subjectId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMin,
      type: 'manual',
      notes: notes || null,
      createdAt: new Date().toISOString()
    };
    data.sessions.push(session);
    applySessionToStats(session);
    saveData();
    closeManualModal();
    renderSubjectProgress();
    renderSubjectContext();
    refreshStatsIfVisible();
    showToast(`Pomodoro añadido: ${durationMin} min · ${subject ? subject.name : ''}`);
  });

  document.getElementById('startBtn').addEventListener('click', toggleStartPause);

  // Descansar (tras foco) o Seguir estudiando (tras descanso): una sola arrancada.
  document.getElementById('startNextBtn').addEventListener('click', () => {
    if (!pendingNextMode) return;
    const next = pendingNextMode;
    pendingNextMode = null;
    goToMode(next);
    startTicking();
  });

  document.getElementById('continueFocusBtn').addEventListener('click', () => {
    pendingNextMode = null;
    sessionStart = null;
    goToMode('focus');
    startTicking();
  });

  document.getElementById('endSessionBtn').addEventListener('click', () => {
    endFlowReadyForFocus();
  });

  document.getElementById('resetBtn').addEventListener('click', resetTimer);

  document.getElementById('liveSessionBtn')?.addEventListener('click', () => navigateTo('timer'));

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isRunning) {
      syncFromRealClock();
      updateTimerDisplay();
    }
  });

  renderSubjectContext();
}
