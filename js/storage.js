import { showToast } from './ui.js';
import { startOfWeekMonday } from './utils.js';
import {
  isSupabaseConfigured,
  ensureSession,
  pullRemoteData,
  pushRemoteData,
  deleteRemoteData,
  setSyncStatus,
  onSyncStatusChange
} from './supabase.js';

const STORAGE_KEY = 'study_tracker_data_v1';
const UPDATED_AT_KEY = 'study_tracker_updated_at_v1';
const CLOUD_SOURCE_OF_TRUTH_KEY = 'study_tracker_cloud_source_v1';
const CLOUD_SYNC_DEBOUNCE_MS = 1500;

let syncTimer = null;
let pendingCloudSync = false;
let onlineListenerAttached = false;

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

function createEmptyData() {
  return {
    subjects: [],
    sessions: [],
    settings: { ...DEFAULT_SETTINGS },
    stats: createEmptyStats()
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeLoadedData(JSON.parse(raw));
  } catch (err) {
    console.error('[storage] No se pudieron cargar los datos locales:', err);
    showToast('Datos locales dañados; se ha iniciado vacío');
  }
  return createEmptyData();
}

/** Estado mutable compartido por toda la app. */
export let data = createEmptyData();

function getLocalUpdatedAt() {
  const raw = localStorage.getItem(UPDATED_AT_KEY);
  return raw ? new Date(raw).getTime() : 0;
}

function setLocalUpdatedAt(iso = new Date().toISOString()) {
  localStorage.setItem(UPDATED_AT_KEY, iso);
}

function hasRemoteContent(remote) {
  return Boolean(
    remote && (remote.subjects?.length > 0 || remote.sessions?.length > 0)
  );
}

function isCloudSourceOfTruth() {
  return localStorage.getItem(CLOUD_SOURCE_OF_TRUTH_KEY) === '1';
}

function markCloudSourceOfTruth() {
  localStorage.setItem(CLOUD_SOURCE_OF_TRUTH_KEY, '1');
}

function buildSyncPayload(source) {
  return {
    subjects: source.subjects,
    sessions: source.sessions,
    settings: { ...DEFAULT_SETTINGS, ...source.settings }
  };
}

/**
 * Lee todo el estado en localStorage (sesiones, materias, ajustes de tiempos)
 * y hace UPSERT en Supabase. Tras el éxito, la nube pasa a ser la fuente de verdad.
 * @returns {Promise<boolean>}
 */
export async function syncLocalToCloud() {
  if (!isSupabaseConfigured()) return false;
  if (!navigator.onLine) {
    setSyncStatus('offline');
    throw new Error('Sin conexión');
  }

  setSyncStatus('syncing');
  await ensureSession();

  const local = loadData();
  const payload = buildSyncPayload(local);

  await pushRemoteData(payload);

  applyDataPayload(data, payload);
  finalizeDataIntegrity();

  const now = new Date().toISOString();
  setLocalUpdatedAt(now);
  markCloudSourceOfTruth();
  saveData({ skipCloud: true });

  pendingCloudSync = false;
  setSyncStatus('synced');
  return true;
}

/**
 * Carga el estado desde Supabase y lo guarda en memoria + localStorage (caché).
 * @returns {Promise<boolean>}
 */
async function loadFromCloud() {
  const remote = await pullRemoteData();
  if (!remote || !hasRemoteContent(remote)) return false;

  applyDataPayload(data, {
    subjects: remote.subjects,
    sessions: remote.sessions,
    settings: remote.settings
  });
  finalizeDataIntegrity();
  saveData({ skipCloud: true });
  setLocalUpdatedAt(remote.updated_at);
  return true;
}

function applyDataPayload(target, source) {
  target.subjects = source.subjects;
  target.sessions = source.sessions;
  target.settings = { ...DEFAULT_SETTINGS, ...source.settings };
}

function finalizeDataIntegrity() {
  migrateSubjectGoals(data.subjects);
  if (
    !data.stats ||
    typeof data.stats.totalSessions !== 'number' ||
    data.stats.totalSessions !== data.sessions.length
  ) {
    recomputeStats();
  } else {
    ensureStatsFresh();
  }
}

function attachOnlineRetryListener() {
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  window.addEventListener('online', () => {
    if (pendingCloudSync) forceCloudSync();
  });
}

function scheduleCloudSync() {
  if (!isSupabaseConfigured()) return;
  pendingCloudSync = true;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    forceCloudSync();
  }, CLOUD_SYNC_DEBOUNCE_MS);
}

export async function forceCloudSync() {
  if (!isSupabaseConfigured()) return;
  clearTimeout(syncTimer);
  if (!navigator.onLine) {
    setSyncStatus('offline');
    return;
  }

  try {
    setSyncStatus('syncing');
    await ensureSession();

    if (!isCloudSourceOfTruth() && !hasRemoteContent(await pullRemoteData())) {
      await syncLocalToCloud();
      return;
    }

    await pushRemoteData(buildSyncPayload(data));
    pendingCloudSync = false;
    setSyncStatus('synced');
  } catch (err) {
    console.error('[storage] Error al sincronizar con Supabase:', err);
    pendingCloudSync = true;
    setSyncStatus('error');
  }
}

/**
 * Arranque: primera sesión → sube localStorage a la nube;
 * después → Supabase es la fuente de verdad.
 */
export async function initCloudSync() {
  attachOnlineRetryListener();

  const local = loadData();
  applyDataPayload(data, local);

  if (!isSupabaseConfigured()) {
    finalizeDataIntegrity();
    saveData({ skipCloud: true });
    setSyncStatus('disabled');
    return;
  }

  if (!navigator.onLine) {
    finalizeDataIntegrity();
    saveData({ skipCloud: true });
    setSyncStatus('offline');
    pendingCloudSync = true;
    return;
  }

  try {
    setSyncStatus('syncing');
    await ensureSession();
    const remote = await pullRemoteData();
    const remoteHas = hasRemoteContent(remote);
    const localHas = hasLocalContent(local);
    const cloudIsSource = isCloudSourceOfTruth();

    if (!cloudIsSource && !remoteHas) {
      // Primera sesión: subir localStorage → Supabase
      if (localHas) {
        await syncLocalToCloud();
      } else {
        markCloudSourceOfTruth();
        finalizeDataIntegrity();
        saveData({ skipCloud: true });
        setSyncStatus('synced');
      }
    } else if (!cloudIsSource && remoteHas) {
      // Ya hay datos en la nube (p. ej. otro dispositivo): la nube manda
      await loadFromCloud();
      markCloudSourceOfTruth();
      setSyncStatus('synced');
    } else if (cloudIsSource) {
      // Supabase es la fuente de verdad
      if (remoteHas) {
        await loadFromCloud();
      } else if (localHas) {
        await syncLocalToCloud();
      } else {
        finalizeDataIntegrity();
        saveData({ skipCloud: true });
      }
      pendingCloudSync = false;
      setSyncStatus('synced');
    }

    pendingCloudSync = false;
  } catch (err) {
    console.error('[storage] Sync inicial fallida:', err);
    finalizeDataIntegrity();
    saveData({ skipCloud: true });
    pendingCloudSync = true;
    const authError = err?.message?.includes('Auth anónima desactivada');
    setSyncStatus(authError ? 'auth' : 'error');
    if (authError) showToast('Activa Anonymous sign-ins en Supabase → Authentication → Providers');
  }
}

function hasLocalContent(payload) {
  return payload.subjects.length > 0 || payload.sessions.length > 0;
}

/** @returns {boolean} */
export function saveData({ skipCloud = false } = {}) {
  try {
    const payload = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, payload);
    const readBack = localStorage.getItem(STORAGE_KEY);
    if (readBack !== payload) {
      throw new Error('Verificación de guardado fallida');
    }
    if (!skipCloud) {
      setLocalUpdatedAt();
      scheduleCloudSync();
    }
    return true;
  } catch (err) {
    console.error('[storage] No se pudieron guardar los datos:', err);
    showToast('No se pudieron guardar los datos en este navegador');
    return false;
  }
}

/** Pide al navegador que no borre localStorage con facilidad (PWA / móvil). */
export async function initStoragePersistence() {
  if (!navigator.storage?.persist) return;
  try {
    await navigator.storage.persist();
  } catch (err) {
    console.warn('[storage] Persistencia no disponible:', err);
  }
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
  reader.onerror = () => {
    showToast('No se pudo leer el archivo');
  };
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions)) {
        showToast('El archivo no tiene un formato válido');
        return;
      }
      const settings =
        parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)
          ? parsed.settings
          : {};
      data.subjects = parsed.subjects;
      data.sessions = parsed.sessions;
      data.settings = { ...DEFAULT_SETTINGS, ...settings };
      migrateSubjectGoals(data.subjects);
      recomputeStats();
      if (!saveData()) {
        showToast('Los datos se leyeron pero no se pudieron guardar');
        return;
      }
      await forceCloudSync();
      onSuccess?.();
      showToast('Datos importados y guardados correctamente');
    } catch (err) {
      console.error('[storage] Importación fallida:', err);
      showToast('No se pudo importar el archivo');
    }
  };
  reader.readAsText(file);
}

/**
 * Borra todo el almacenamiento y reinicia `data`.
 * @param {{ onSuccess?: () => void }} [options]
 */
export async function wipeAllData({ onSuccess } = {}) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(UPDATED_AT_KEY);
  localStorage.removeItem(CLOUD_SOURCE_OF_TRUTH_KEY);
  const fresh = createEmptyData();
  data.subjects = fresh.subjects;
  data.sessions = fresh.sessions;
  data.settings = fresh.settings;
  data.stats = fresh.stats;

  try {
    await deleteRemoteData();
    pendingCloudSync = false;
    setSyncStatus(navigator.onLine && isSupabaseConfigured() ? 'synced' : 'offline');
  } catch (err) {
    console.warn('[storage] No se pudieron borrar los datos remotos:', err);
    setSyncStatus('error');
  }

  onSuccess?.();
}

/**
 * Listeners de exportar / importar / borrar (vista Ajustes).
 * @param {{ onDataMutated?: () => void }} [options]
 */
function updateSyncStatusUI(status) {
  const tooltips = {
    synced: 'Sincronizado',
    syncing: 'Sincronizando…',
    offline: 'Guardando en local, esperando conexión',
    error: 'Error de sincronización',
    auth: 'Activa auth anónima en Supabase',
    disabled: 'Nube no configurada'
  };

  const label = tooltips[status] || status;

  document.querySelectorAll('.sync-dot').forEach((dot) => {
    dot.dataset.status = status;
    dot.setAttribute('aria-label', label);
    if (dot.id === 'navSyncDot') {
      dot.setAttribute('data-tip', label);
    }
  });

  const settingsText = document.getElementById('settingsSyncText');
  if (settingsText) settingsText.textContent = label;
}

export function initStorageUI({ onDataMutated } = {}) {
  onSyncStatusChange(updateSyncStatusUI);

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

  document.getElementById('wipeDataConfirmBtn').addEventListener('click', async () => {
    await wipeAllData({ onSuccess: onDataMutated });
    document.getElementById('wipeDataModal').classList.add('hidden');
    showToast('Todos los datos han sido borrados');
  });
}
