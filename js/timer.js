import { data, saveData, applySessionToStats, ensureStatsFresh } from './storage.js';
import { uid, startOfWeekMonday } from './utils.js';
import { showToast, navigateTo } from './ui.js';
import { refreshStatsIfVisible, showStreakCelebration } from './dashboard.js';
import { initSessionModal } from './sessions.js';
import { getSubjectGoalProgress } from './subjectGoals.js';
import { t } from './i18n.js';
import {
  playSoundPreset,
  DEFAULT_SOUND_FOCUS,
  DEFAULT_SOUND_BREAK,
  DEFAULT_SOUND_LONG_BREAK
} from './sounds.js';

const ORIGINAL_TITLE = document.title;
const CIRCUM = 2 * Math.PI * 54;

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
  if (h <= 0) return t('timer.minutesOnly', { m });
  if (m === 0) return t('timer.hoursOnly', { h });
  return t('timer.hoursMinutes', { h, m });
}

function getCyclesBeforeLongBreak() {
  return Math.max(1, data.settings.cyclesBeforeLongBreak || 4);
}

function encodeCycleStep(cycles, currentMode) {
  const n = getCyclesBeforeLongBreak();
  if (currentMode === 'longBreak') return 2 * n - 1;
  if (currentMode === 'break') return 2 * cycles - 1;
  const slot = cycles % n;
  return 2 * slot;
}

function decodeCycleStep(step, n) {
  if (step >= 2 * n) return { cycles: 0, mode: 'focus' };
  if (step === 2 * n - 1) return { cycles: n, mode: 'longBreak' };
  if (step % 2 === 0) return { cycles: step / 2, mode: 'focus' };
  return { cycles: (step + 1) / 2, mode: 'break' };
}

function applyCyclePosition(cycles, nextMode) {
  cyclesCompleted = cycles;
  mode = nextMode;
  secondsLeft = getModeTotalSeconds();
  pendingNextMode = null;
  sessionStart = null;
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.getElementById('timerCircleWrap').classList.remove('running', 'paused', 'completed');
  document.getElementById('startBtn').textContent = t('timer.start');
  renderCycleTrack();
  updateTimerDisplay();
}

function stepCycleTrack(delta) {
  if (isRunning || isPaused) return;
  const n = getCyclesBeforeLongBreak();
  const maxStep = 2 * n - 1;
  let step = encodeCycleStep(cyclesCompleted, mode) + delta;
  if (step < 0) step = 0;
  if (step > maxStep) step = 0;
  const { cycles, mode: nextMode } = decodeCycleStep(step, n);
  applyCyclePosition(cycles, nextMode);
}

function resetCycleTrack() {
  if (isRunning || isPaused) return;
  applyCyclePosition(0, 'focus');
}

export function refreshCycleTrackControls() {
  const wrap = document.getElementById('cycleTrackWrap');
  if (!wrap) return;
  wrap.classList.toggle('cycle-track-wrap--locked', isRunning || isPaused);
}

export function refreshTimerLabels() {
  const startBtn = document.getElementById('startBtn');
  const nextModeRow = document.getElementById('nextModeRow');
  const mainBtnRow = document.getElementById('mainBtnRow');

  if (startBtn && mainBtnRow && !mainBtnRow.classList.contains('hidden')) {
    if (isRunning) startBtn.textContent = t('timer.pause');
    else if (isPaused) startBtn.textContent = t('timer.resume');
    else startBtn.textContent = t('timer.start');
  }

  if (nextModeRow && !nextModeRow.classList.contains('hidden')) {
    const startNextBtn = document.getElementById('startNextBtn');
    const continueBtn = document.getElementById('continueFocusBtn');
    if (pendingNextMode === 'break' || pendingNextMode === 'longBreak') {
      if (startNextBtn) startNextBtn.textContent = t('timer.takeBreak');
      continueBtn?.classList.remove('hidden');
    } else if (pendingNextMode === 'focus') {
      if (startNextBtn) startNextBtn.textContent = t('timer.keepStudying');
      continueBtn?.classList.add('hidden');
    }
  }
}

export function updateTimerDisplay() {
  document.getElementById('timeDisplay').textContent = formatTime(secondsLeft);

  const modeEl = document.getElementById('modeDisplay');
  const circle = document.getElementById('timerCircleWrap');

  if (isPaused && !isRunning) {
    modeEl.textContent = t('timer.paused');
    circle.classList.add('paused');
  } else {
    circle.classList.remove('paused');
    modeEl.textContent = mode === 'focus' ? t('timer.focus') : mode === 'break' ? t('timer.break') : t('timer.longBreak');
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
  refreshTimerLabels();
  refreshCycleTrackControls();
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
  if (eyebrowEl) eyebrowEl.textContent = isPaused && !isRunning ? t('live.paused') : t('live.live');

  const modeLabel = isPaused && !isRunning
    ? t('timer.sessionPaused')
    : mode === 'focus'
      ? t('timer.focus')
      : mode === 'break'
        ? t('timer.break')
        : t('timer.longBreak');

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
  if (finishedMode === 'focus' && data.settings.notifyOnFocusFinish === false) return;
  if (finishedMode !== 'focus' && data.settings.notifyOnBreakFinish === false) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const label = finishedMode === 'focus' ? t('timer.notifyFocusTitle') : t('timer.notifyBreakTitle');
  const body = finishedMode === 'focus' ? t('timer.notifyFocusBody') : t('timer.notifyBreakBody');
  new Notification(label, { body, icon: '' });
}

function showNextModeChoices(finishedMode) {
  const continueBtn = document.getElementById('continueFocusBtn');
  const startNextBtn = document.getElementById('startNextBtn');

  if (finishedMode === 'focus') {
    startNextBtn.textContent = t('timer.takeBreak');
    continueBtn.classList.remove('hidden');
  } else {
    startNextBtn.textContent = t('timer.keepStudying');
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
    nextMode = (cyclesCompleted % getCyclesBeforeLongBreak() === 0) ? 'longBreak' : 'break';
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
  document.getElementById('startBtn').textContent = t('timer.start');
  document.getElementById('timerCircleWrap').classList.remove('running', 'paused');
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.title = ORIGINAL_TITLE;
  updateTimerDisplay();
}

function playBeep() {
  if (data.settings.soundEnabled === false) return;

  let key;
  if (mode === 'focus') key = data.settings.soundFocus || DEFAULT_SOUND_FOCUS;
  else if (mode === 'break') key = data.settings.soundBreak || DEFAULT_SOUND_BREAK;
  else key = data.settings.soundLongBreak || DEFAULT_SOUND_LONG_BREAK;

  playSoundPreset(key, {
    volume: (data.settings.soundVolume ?? 70) / 100,
    repeat: data.settings.soundRepeat ?? 1,
    speed: data.settings.soundSpeed ?? 100
  });
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
    el.innerHTML = `<span class="dot" style="background:${subject.color}"></span>${subject.name} · ${formatHoursMinutes(totalMin)} ${t('timer.registered')}`;
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
      ? t('timer.goalExceeded', { current: todayCount, target })
      : t('timer.goalMet', { current: todayCount, target });
  } else {
    labelEl.textContent = remaining === 1
      ? t('timer.blocksRemainingOne')
      : t('timer.blocksRemaining', { count: remaining });
  }
  pctEl.textContent = `${rawPct}%`;
  fillEl.style.width = barPct + '%';
  wrap.classList.remove('hidden');
}

export function renderCycleTrack() {
  const container = document.getElementById('cycleTrack');
  const totalFocus = getCyclesBeforeLongBreak();
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
  const totalFocus = getCyclesBeforeLongBreak();
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

  document.getElementById('startBtn').textContent = t('timer.start');
  document.getElementById('timerCircleWrap').classList.remove('running', 'paused');
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.title = ORIGINAL_TITLE;

  updateTimerDisplay();
  renderSubjectProgress();
  renderSubjectContext();
  renderCycleTrack();
  updateCycleTrackFill();
  refreshCycleTrackControls();
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
  document.getElementById('startBtn').textContent = t('timer.pause');
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
      showToast(t('timer.selectSubjectFirst'));
      return;
    }
    startTicking();
  } else {
    isRunning = false;
    isPaused = true;
    document.getElementById('startBtn').textContent = t('timer.resume');
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
  document.getElementById('startBtn').textContent = t('timer.start');
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

  initSessionModal({
    onSaved: () => {
      renderSubjectProgress();
      renderSubjectContext();
      refreshStatsIfVisible();
    }
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

  document.getElementById('cyclePrevBtn')?.addEventListener('click', () => stepCycleTrack(-1));
  document.getElementById('cycleNextBtn')?.addEventListener('click', () => stepCycleTrack(1));
  document.getElementById('cycleResetBtn')?.addEventListener('click', resetCycleTrack);

  document.getElementById('liveSessionBtn')?.addEventListener('click', () => navigateTo('timer'));

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isRunning) {
      syncFromRealClock();
      updateTimerDisplay();
    }
  });

  renderSubjectContext();
}
