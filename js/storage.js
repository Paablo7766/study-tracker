import { showToast } from './ui.js';
import { startOfWeekMonday } from './utils.js';

const STORAGE_KEY = 'study_tracker_data_v1';

const DEFAULT_SETTINGS = {
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreak: false,
  dailyGoal: 4
};

/** Contadores acumulados: O(1) en render; se reconstruyen solo al migrar/importar/borrar. */
export function createEmptyStats() {
  return {
    totalMinutes: 0,
    totalSessions: 0,
    currentStreak: 0,
    bestStreak: 0,
    /** Racha terminando en lastActiveDay (sirve para continuar al primer pomodoro del día). */
    streakAtLastActive: 0,
    lastActiveDay: null,
    todayDate: null,
    todayCount: 0,
    weekStartKey: null,
    weekMinutes: 0,
    weekDayTotals: [0, 0, 0, 0, 0, 0, 0],
    prevWeekMinutes: 0,
    bySubjectMinutes: {},
    weekBySubjectMinutes: {}
  };
}

function dayKey(d) {
  return new Date(d).toDateString();
}

/** Días con al menos una sesión (clave local). */
function buildActiveDaySet() {
  const daySet = new Set();
  for (const s of data.sessions) {
    daySet.add(dayKey(new Date(s.startTime)));
  }
  return daySet;
}

/**
 * Racha actual: si hoy aún no hay sesión pero ayer sí, cuenta desde ayer
 * (el día en curso no rompe la racha hasta que pase la medianoche sin estudiar).
 */
function computeCurrentStreak(daySet, now = new Date()) {
  const todayStr = dayKey(now);
  const todayHasSessions = daySet.has(todayStr);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = dayKey(yesterday);
  const startOffset = todayHasSessions || !daySet.has(yesterdayStr) ? 0 : 1;

  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (daySet.has(dayKey(d))) streak++;
    else break;
  }
  return streak;
}

function refreshCurrentStreak(stats, now = new Date()) {
  stats.currentStreak = computeCurrentStreak(buildActiveDaySet(), now);
}

export function recomputeStats() {
  const stats = createEmptyStats();
  const now = new Date();
  const todayStr = dayKey(now);
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  stats.todayDate = todayStr;
  stats.weekStartKey = weekStart.toISOString();

  const daySet = new Set();

  for (const s of data.sessions) {
    const dt = new Date(s.startTime);
    const dStr = dayKey(dt);
    daySet.add(dStr);

    stats.totalMinutes += s.durationMin;
    stats.totalSessions += 1;
    stats.bySubjectMinutes[s.subjectId] = (stats.bySubjectMinutes[s.subjectId] || 0) + s.durationMin;

    if (dStr === todayStr) stats.todayCount += 1;

    if (dt >= weekStart && dt < weekEnd) {
      const diffDays = Math.floor((dt - weekStart) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        stats.weekDayTotals[diffDays] += s.durationMin;
        stats.weekMinutes += s.durationMin;
        stats.weekBySubjectMinutes[s.subjectId] = (stats.weekBySubjectMinutes[s.subjectId] || 0) + s.durationMin;
      }
    } else if (dt >= prevWeekStart && dt < weekStart) {
      stats.prevWeekMinutes += s.durationMin;
    }
  }

  const uniqueDays = [...daySet].map(d => new Date(d)).sort((a, b) => a - b);

  let bestStreak = 0, currentRun = 0, prevDay = null;
  uniqueDays.forEach(d => {
    if (prevDay && (d - prevDay) / (1000 * 60 * 60 * 24) === 1) currentRun++;
    else currentRun = 1;
    bestStreak = Math.max(bestStreak, currentRun);
    prevDay = d;
  });
  stats.bestStreak = bestStreak;

  stats.currentStreak = computeCurrentStreak(daySet, now);

  if (uniqueDays.length > 0) {
    const last = uniqueDays[uniqueDays.length - 1];
    stats.lastActiveDay = dayKey(last);
    let streakAtLast = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(last);
      d.setDate(d.getDate() - i);
      if (daySet.has(dayKey(d))) streakAtLast++;
      else break;
    }
    stats.streakAtLastActive = streakAtLast;
  }

  data.stats = stats;
  return stats;
}

/**
 * Asegura día/semana actuales sin barrer sesiones salvo cambio de semana
 * (entonces recomputeStats una vez).
 */
export function ensureStatsFresh() {
  if (!data.stats) {
    recomputeStats();
    return data.stats;
  }

  const nowFresh = new Date();
  const todayStr = dayKey(nowFresh);
  if (data.stats.todayDate !== todayStr) {
    data.stats.todayDate = todayStr;
    data.stats.todayCount = 0;
  }

  const weekStart = startOfWeekMonday(nowFresh);
  if (data.stats.weekStartKey !== weekStart.toISOString()) {
    recomputeStats();
    return data.stats;
  }

  // Siempre recalcular racha desde sesiones (corrige caché obsoleta en localStorage).
  const prevStreak = data.stats.currentStreak;
  refreshCurrentStreak(data.stats, nowFresh);
  if (prevStreak !== data.stats.currentStreak) saveData();

  return data.stats;
}

/**
 * Actualiza contadores al añadir una sesión.
 * Sesiones con fecha distinta de hoy → recompute completo (manuales backdated).
 * @returns {{ isFirstSessionToday: boolean }}
 */
export function applySessionToStats(session) {
  ensureStatsFresh();

  const dt = new Date(session.startTime);
  const dayStr = dayKey(dt);
  const todayStr = dayKey(new Date());

  if (dayStr !== todayStr) {
    recomputeStats();
    return { isFirstSessionToday: false };
  }

  const isFirstSessionToday = data.stats.todayCount === 0;
  const stats = data.stats;

  stats.totalMinutes += session.durationMin;
  stats.totalSessions += 1;
  stats.bySubjectMinutes[session.subjectId] = (stats.bySubjectMinutes[session.subjectId] || 0) + session.durationMin;
  stats.todayCount += 1;

  const weekStart = new Date(stats.weekStartKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (dt >= weekStart && dt < weekEnd) {
    const diffDays = Math.floor((dt - weekStart) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      stats.weekDayTotals[diffDays] += session.durationMin;
      stats.weekMinutes += session.durationMin;
      stats.weekBySubjectMinutes[session.subjectId] = (stats.weekBySubjectMinutes[session.subjectId] || 0) + session.durationMin;
    }
  }

  if (isFirstSessionToday) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastActiveDay === dayKey(yesterday)) {
      stats.currentStreak = (stats.streakAtLastActive || 0) + 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.streakAtLastActive = stats.currentStreak;
    stats.lastActiveDay = todayStr;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  }

  return { isFirstSessionToday };
}

import { migrateSubjectGoals } from './subjectGoals.js';

function normalizeLoadedData(raw) {
  if (!raw.settings) raw.settings = { ...DEFAULT_SETTINGS };
  else raw.settings = { ...DEFAULT_SETTINGS, ...raw.settings };
  if (!Array.isArray(raw.subjects)) raw.subjects = [];
  else migrateSubjectGoals(raw.subjects);
  if (!Array.isArray(raw.sessions)) raw.sessions = [];
  if (!raw.stats) raw.stats = createEmptyStats();
  return raw;
}

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = normalizeLoadedData(JSON.parse(raw));
    return parsed;
  }
  return {
    subjects: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
    stats: createEmptyStats()
  };
}

/** Estado mutable compartido por toda la app. */
export let data = loadData();
migrateSubjectGoals(data.subjects);

export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Migración / integridad: si faltan stats o están desfasados, reconstruir una vez.
if (
  !data.stats ||
  typeof data.stats.totalSessions !== 'number' ||
  data.stats.totalSessions !== data.sessions.length
) {
  recomputeStats();
  saveData();
} else {
  ensureStatsFresh();
}

export function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: data.subjects,
    sessions: data.sessions,
    settings: data.settings,
    stats: data.stats
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `study-tracker-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Copia de seguridad exportada');
}

/**
 * Importa un JSON de backup.
 * @param {File} file
 * @param {{ onSuccess?: () => void }} [options]
 */
export function importData(file, { onSuccess } = {}) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions) || typeof parsed.settings !== 'object') {
        showToast('El archivo no tiene un formato válido');
        return;
      }
      data.subjects = parsed.subjects;
      data.sessions = parsed.sessions;
      data.settings = { ...DEFAULT_SETTINGS, ...data.settings, ...parsed.settings };
      recomputeStats();
      saveData();
      onSuccess?.();
      showToast('Datos importados correctamente');
    } catch (err) {
      showToast('No se pudo leer el archivo');
    }
  };
  reader.readAsText(file);
}

/**
 * Borra todo el almacenamiento y reinicia `data`.
 * @param {{ onSuccess?: () => void }} [options]
 */
export function wipeAllData({ onSuccess } = {}) {
  localStorage.removeItem(STORAGE_KEY);
  data = loadData();
  onSuccess?.();
}

/**
 * Listeners de exportar / importar / borrar (vista Ajustes).
 * @param {{ onDataMutated?: () => void }} [options]
 */
export function initStorageUI({ onDataMutated } = {}) {
  document.getElementById('exportDataBtn').addEventListener('click', exportData);

  document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importDataInput').click();
  });

  document.getElementById('importDataInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importData(file, { onSuccess: onDataMutated });
    e.target.value = '';
  });

  document.getElementById('wipeDataBtn').addEventListener('click', () => {
    document.getElementById('wipeDataModal').classList.remove('hidden');
  });

  document.getElementById('wipeDataCancelBtn').addEventListener('click', () => {
    document.getElementById('wipeDataModal').classList.add('hidden');
  });

  document.getElementById('wipeDataModal').addEventListener('click', (e) => {
    if (e.target.id === 'wipeDataModal') document.getElementById('wipeDataModal').classList.add('hidden');
  });

  document.getElementById('wipeDataConfirmBtn').addEventListener('click', () => {
    wipeAllData({ onSuccess: onDataMutated });
    document.getElementById('wipeDataModal').classList.add('hidden');
    showToast('Todos los datos han sido borrados');
  });
}
