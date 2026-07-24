import { data, saveData, applySessionToStats, recomputeStats } from './storage.js';
import { uid, toLocalDatetimeInputValue } from './utils.js';
import { showToast, showUndoToast } from './ui.js';
import { t } from './i18n.js';

let editingSessionId = null;
let onSavedCallback = null;
let defaultOnSaved = null;

function setModalTitle(key) {
  const titleEl = document.querySelector('#manualModal h3');
  if (titleEl) titleEl.textContent = t(key);
}

function cloneSession(session) {
  return { ...session };
}

export function openSessionModal({ sessionId = null, defaultDate = null, onSaved = null } = {}) {
  if (!data.subjects.length) {
    showToast(t('timer.selectSubjectToast'));
    return;
  }

  editingSessionId = sessionId;
  onSavedCallback = onSaved;

  const sel = document.getElementById('manualSubject');
  sel.innerHTML = data.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  if (sessionId) {
    const session = data.sessions.find(s => s.id === sessionId);
    if (!session) return;
    sel.value = session.subjectId;
    document.getElementById('manualDuration').value = session.durationMin;
    document.getElementById('manualDatetime').value = toLocalDatetimeInputValue(new Date(session.startTime));
    document.getElementById('manualNotes').value = session.notes || '';
    setModalTitle('sessions.editTitle');
  } else {
    sel.value = data.subjects[0].id;
    document.getElementById('manualDuration').value = data.settings.focusMin;
    document.getElementById('manualDatetime').value = toLocalDatetimeInputValue(defaultDate || new Date());
    document.getElementById('manualNotes').value = '';
    setModalTitle('settings.manualModalTitle');
  }

  document.getElementById('manualModal').classList.remove('hidden');
}

export function closeSessionModal() {
  document.getElementById('manualModal').classList.add('hidden');
  editingSessionId = null;
  onSavedCallback = null;
}

export function restoreSession(session, index = null) {
  if (!session) return null;
  const copy = cloneSession(session);
  if (index != null && index >= 0 && index <= data.sessions.length) {
    data.sessions.splice(index, 0, copy);
  } else {
    data.sessions.push(copy);
  }
  recomputeStats();
  saveData();
  return copy;
}

export function removeSession(sessionId) {
  const idx = data.sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return null;
  const removed = data.sessions.splice(idx, 1)[0];
  recomputeStats();
  saveData();
  return { session: removed, index: idx };
}

export function removeSessionWithUndo(sessionId, { onRestored } = {}) {
  const result = removeSession(sessionId);
  if (!result) return null;

  showUndoToast({
    message: t('sessions.deleted', { min: result.session.durationMin }),
    undoLabel: t('sessions.undo'),
    onUndo: () => {
      restoreSession(result.session, result.index);
      onRestored?.();
      showToast(t('sessions.restored', { min: result.session.durationMin }));
    }
  });
  return result;
}

export function deleteLastSession() {
  if (data.sessions.length === 0) {
    showToast(t('sessions.noneToDelete'));
    return null;
  }
  data.sessions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const index = data.sessions.length - 1;
  const removed = data.sessions.pop();
  recomputeStats();
  saveData();
  return { session: removed, index };
}

export function deleteLastSessionWithUndo({ onRestored } = {}) {
  const result = deleteLastSession();
  if (!result) return null;

  showUndoToast({
    message: t('sessions.lastDeleted', { min: result.session.durationMin }),
    undoLabel: t('sessions.undo'),
    onUndo: () => {
      restoreSession(result.session, result.index);
      onRestored?.();
      showToast(t('sessions.restored', { min: result.session.durationMin }));
    }
  });
  return result;
}

function notifySaved() {
  const cb = onSavedCallback || defaultOnSaved;
  cb?.();
}

function saveSessionFromModal() {
  const subjectId = document.getElementById('manualSubject').value;
  const durationMin = parseInt(document.getElementById('manualDuration').value, 10);
  const dtValue = document.getElementById('manualDatetime').value;
  const notes = document.getElementById('manualNotes').value.trim();

  if (!subjectId) { showToast(t('timer.selectSubjectToast')); return; }
  if (!durationMin || durationMin <= 0) { showToast(t('timer.invalidDuration')); return; }
  if (!dtValue) { showToast(t('timer.selectDateTime')); return; }

  const startTime = new Date(dtValue);
  const endTime = new Date(startTime.getTime() + durationMin * 60000);
  const subject = data.subjects.find(s => s.id === subjectId);

  if (editingSessionId) {
    const session = data.sessions.find(s => s.id === editingSessionId);
    if (!session) return;
    session.subjectId = subjectId;
    session.startTime = startTime.toISOString();
    session.endTime = endTime.toISOString();
    session.durationMin = durationMin;
    session.notes = notes || null;
    recomputeStats();
    saveData();
    closeSessionModal();
    notifySaved();
    showToast(t('sessions.updated', { min: durationMin, name: subject ? subject.name : '' }));
    return;
  }

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
  closeSessionModal();
  notifySaved();
  showToast(t('timer.manualAdded', { min: durationMin, name: subject ? subject.name : '' }));
}

export function initSessionModal({ onSaved } = {}) {
  defaultOnSaved = onSaved;

  document.getElementById('addManualBtn')?.addEventListener('click', () => openSessionModal());
  document.getElementById('manualCancelBtn')?.addEventListener('click', closeSessionModal);
  document.getElementById('manualModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'manualModal') closeSessionModal();
  });
  document.getElementById('manualSaveBtn')?.addEventListener('click', saveSessionFromModal);

  document.getElementById('deleteLastBtn')?.addEventListener('click', () => {
    deleteLastSessionWithUndo({ onRestored: notifySaved });
  });
}
