const STORAGE_KEY = 'study_tracker_data_v1';
const COLORS = ['#f4f4f5', '#34d399', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee'];
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwrVrIJtydfGP27uXGwzuMRgj6JVXIRwCOOJQEHjRHpdp2VXJrvQRUr2iGfk3g3_FphnA/exec";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return {
    subjects: [],
    sessions: [],
    settings: { focusMin: 25, breakMin: 5, longBreakMin: 15, cyclesBeforeLongBreak: 4, autoStartBreak: false, dailyGoal: 4 }
  };
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ---------- Copia de seguridad de datos ----------
function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects: data.subjects,
    sessions: data.sessions,
    settings: data.settings
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

function importData(file) {
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
      data.settings = { ...data.settings, ...parsed.settings };
      saveData();
      loadSettingsForm();
      renderSubjectSelects();
      renderMaterias();
      refreshStatsIfVisible();
      showToast('Datos importados correctamente');
    } catch (err) {
      showToast('No se pudo leer el archivo');
    }
  };
  reader.readAsText(file);
}

function wipeAllData() {
  localStorage.removeItem(STORAGE_KEY);
  data = loadData();
  loadSettingsForm();
  renderSubjectSelects();
  renderMaterias();
  refreshStatsIfVisible();
}

let data = loadData();
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

Chart.defaults.color = '#9a9aa2';
Chart.defaults.borderColor = '#26272b';
Chart.defaults.font.family = "'Inter', sans-serif";

// ---------- Navigation ----------
const views = ['timer','dashboard','materias','ajustes'];
const mainEl = document.querySelector('main');
document.querySelectorAll('nav button[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button[data-view]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    views.forEach(v => document.getElementById('view-' + v).classList.add('hidden'));
    const view = btn.dataset.view;
    document.getElementById('view-' + view).classList.remove('hidden');
    if (view === 'dashboard') { weekOffset = 0; renderDashboard(); }
    if (view === 'materias') renderMaterias();
    mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
  });
});

// ---------- Sidebar colapsable ----------
const navEl = document.querySelector('nav');
const navToggleBtn = document.getElementById('navToggleBtn');
function applyNavCollapsedState() {
  const collapsed = localStorage.getItem('navCollapsed') === '1';
  navEl.classList.toggle('collapsed', collapsed);
}
navToggleBtn.addEventListener('click', () => {
  const collapsed = navEl.classList.toggle('collapsed');
  localStorage.setItem('navCollapsed', collapsed ? '1' : '0');
});
applyNavCollapsedState();

// ---------- Subjects ----------
function renderSubjectSelects() {
  const sel = document.getElementById('subjectSelect');
  const currentVal = sel.value;
  const activeSubjects = data.subjects.filter(s => !s.archived);
  sel.innerHTML = `<option value="">Selecciona una materia</option>` +
    activeSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  sel.value = activeSubjects.some(s => s.id === currentVal) ? currentVal : '';
  renderSubjectDropdownPanel();
  updateSubjectDropdownLabel();
}

function renderSubjectDropdownPanel() {
  const panel = document.getElementById('subjectSelectPanel');
  const sel = document.getElementById('subjectSelect');
  const currentVal = sel.value;
  const noneOption = `<div class="subject-select-option${currentVal === '' ? ' selected' : ''}" data-value="">Selecciona una materia</div>`;
  const subjectOptions = data.subjects.filter(s => !s.archived).map(s =>
    `<div class="subject-select-option${currentVal === s.id ? ' selected' : ''}" data-value="${s.id}"><span class="dot" style="background:${s.color}"></span>${s.name}</div>`
  ).join('');
  panel.innerHTML = noneOption + subjectOptions;
  panel.querySelectorAll('.subject-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      sel.value = opt.getAttribute('data-value');
      sel.dispatchEvent(new Event('change'));
      updateSubjectDropdownLabel();
      closeSubjectDropdown();
    });
  });
}

function updateSubjectDropdownLabel() {
  const sel = document.getElementById('subjectSelect');
  const label = document.getElementById('subjectSelectLabel');
  const subject = data.subjects.find(s => s.id === sel.value);
  if (subject) {
    label.innerHTML = `<span class="dot" style="background:${subject.color}"></span>${subject.name}`;
  } else {
    label.textContent = 'Selecciona una materia';
  }
}

function closeSubjectDropdown() {
  document.getElementById('subjectSelectPanel').classList.add('hidden');
  document.getElementById('subjectSelectBtn').classList.remove('open');
}

document.getElementById('subjectSelectBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('subjectSelectPanel');
  const btn = document.getElementById('subjectSelectBtn');
  const willOpen = panel.classList.contains('hidden');
  if (willOpen) renderSubjectDropdownPanel();
  panel.classList.toggle('hidden');
  btn.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('subjectDropdown');
  if (wrap && !wrap.contains(e.target)) closeSubjectDropdown();
});

function startOfWeekMondayTimer(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function renderSubjectProgress() {
  const wrap = document.getElementById('subjectProgress');
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayCount = data.sessions.filter(s => new Date(s.startTime) >= todayStart).length;
  const target = data.settings.dailyGoal || 4;
  const rawPct = Math.round((todayCount / target) * 100);
  const goalMet = todayCount >= target;
  const barPct = Math.min(100, rawPct);

  const labelEl = document.getElementById('subjectProgressLabel');
  const pctEl = document.getElementById('subjectProgressPct');
  const fillEl = document.getElementById('subjectProgressFill');

  if (goalMet) {
    labelEl.textContent = `¡Objetivo superado! (${todayCount}/${target})`;
    pctEl.textContent = `${rawPct}%`;
    fillEl.style.background = '#fbbf24';
  } else {
    labelEl.textContent = `${todayCount} / ${target} pomodoros hoy`;
    pctEl.textContent = `${rawPct}%`;
    fillEl.style.background = '#f4f4f5';
  }
  fillEl.style.width = barPct + '%';
  wrap.classList.remove('hidden');
}

function renderCycleTrack() {
  const container = document.getElementById('cycleTrack');
  const totalFocus = data.settings.cyclesBeforeLongBreak;
  let html = '';
  for (let i = 0; i < totalFocus; i++) {
    html += `<div class="cycle-seg seg-focus" data-kind="focus" data-index="${i}" title="Enfoque ${i + 1}"><div class="cycle-seg-fill"></div></div>`;
    if (i < totalFocus - 1) {
      html += `<div class="cycle-seg seg-break" data-kind="break" data-index="${i}" title="Descanso ${i + 1}"><div class="cycle-seg-fill"></div></div>`;
    }
  }
  html += `<div class="cycle-seg seg-longbreak" data-kind="longBreak" data-index="0" title="Descanso largo"><div class="cycle-seg-fill"></div></div>`;
  container.innerHTML = html;
  container.dataset.builtFor = totalFocus;
}

function updateCycleTrackFill() {
  const container = document.getElementById('cycleTrack');
  const totalFocus = data.settings.cyclesBeforeLongBreak;
  if (Number(container.dataset.builtFor) !== totalFocus) renderCycleTrack();

  const focusIndex = cyclesCompleted % totalFocus;

  container.querySelectorAll('.cycle-seg').forEach(seg => {
    const kind = seg.dataset.kind;
    const index = Number(seg.dataset.index);
    const fill = seg.querySelector('.cycle-seg-fill');
    let isPast = false, isActive = false;

    if (kind === 'focus') {
      isPast = index < focusIndex;
      isActive = mode === 'focus' && index === focusIndex;
    } else if (kind === 'break') {
      isPast = index < focusIndex;
      isActive = mode === 'break' && index === focusIndex;
    } else if (kind === 'longBreak') {
      isActive = mode === 'longBreak';
    }

    if (isActive) {
      const totalForMode = mode === 'focus' ? data.settings.focusMin*60 : mode === 'break' ? data.settings.breakMin*60 : data.settings.longBreakMin*60;
      const progress = Math.min(100, Math.max(0, (1 - secondsLeft/totalForMode) * 100));
      seg.classList.remove('done');
      fill.style.width = progress + '%';
    } else if (isPast) {
      seg.classList.add('done');
    } else {
      seg.classList.remove('done');
      fill.style.width = '0%';
    }
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<span class="toast-check"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>${message}`;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 250);
  }, 3000);
}

document.getElementById('subjectSelect').addEventListener('change', () => {
  renderSubjectProgress();
  document.getElementById('subjectSelect').classList.remove('select-warning');
});

function hexToRgba(hex, alpha) {
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function startOfWeekMondayLocal(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function renderMaterias() {
  const list = document.getElementById('subjectList');
  const emptyWrap = document.getElementById('subjectsEmptyWrap');
  const archivedWrap = document.getElementById('archivedSubjectsWrap');
  const archivedList = document.getElementById('archivedSubjectList');

  const activeSubjects = data.subjects.filter(s => !s.archived);
  const archivedSubjects = data.subjects.filter(s => s.archived);

  if (data.subjects.length === 0) {
    emptyWrap.classList.remove('hidden');
    list.innerHTML = '';
    archivedWrap.classList.add('hidden');
    return;
  }
  emptyWrap.classList.add('hidden');

  const weekStart = startOfWeekMondayLocal(new Date());

  function buildCard(s) {
    const subjSessions = data.sessions.filter(sess => sess.subjectId === s.id);
    const totalMin = subjSessions.reduce((a,b) => a + b.durationMin, 0);
    const weekMin = subjSessions.filter(sess => new Date(sess.startTime) >= weekStart).reduce((a,b) => a + b.durationMin, 0);
    const target = s.weeklyTargetMin || 300;
    const pct = Math.min(100, Math.round((weekMin / target) * 100));
    const sessionCount = subjSessions.length;
    const lastSession = subjSessions.slice().sort((a,b) => new Date(b.startTime) - new Date(a.startTime))[0];
    const lastStr = lastSession ? new Date(lastSession.startTime).toLocaleDateString('es-ES', { day:'2-digit', month:'short' }) : '—';
    const totalHours = (totalMin / 60).toFixed(1);
    const archiveIcon = s.archived
      ? '<path d="M3 7v13h18V7"/><path d="M1 3h22v4H1z"/><path d="M10 12h4"/>'
      : '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>';
    const archiveTitle = s.archived ? 'Restaurar' : 'Archivar';
    const archiveAction = s.archived ? `unarchiveSubject('${s.id}')` : `archiveSubject('${s.id}')`;

    return `<div class="subject-card${s.archived ? ' archived' : ''}">
      <div class="glow" style="background: radial-gradient(ellipse at bottom, ${hexToRgba(s.color, 0.55)}, transparent 70%)"></div>
      <div class="card-top">
        <div>
          <div class="big-number">${totalHours}h</div>
          <div class="sub-label" style="margin-top:6px">${s.name}</div>
        </div>
        <div class="badge" style="background:${s.color}22;border:1px solid ${s.color}55;color:${s.color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
      </div>
      <div class="meta-row">
        <span>${sessionCount} sessions</span>
        <span>Última: ${lastStr}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%;background:${s.color}"></div>
      </div>
      <div class="meta-row" style="margin-top:-8px">
        <span>${weekMin} / ${target} min esta semana</span>
        <span>${pct}%</span>
      </div>
      <div class="card-actions">
        <button class="icon-btn" title="${archiveTitle}" aria-label="${archiveTitle} ${s.name}" onclick="${archiveAction}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${archiveIcon}</svg></button>
        ${s.archived ? '' : `<button class="icon-btn" title="Editar" aria-label="Editar ${s.name}" onclick="openEditSubjectModal('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>`}
        <button class="icon-btn danger" title="Eliminar" aria-label="Eliminar ${s.name}" onclick="openDeleteSubjectModal('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </div>
    </div>`;
  }

  const addCardHtml = `<div class="add-subject-card" id="inlineAddSubjectCard">
    <div class="plus-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div>
    <span>Nueva materia</span>
  </div>`;

  list.innerHTML = activeSubjects.map(buildCard).join('') + addCardHtml;
  document.getElementById('inlineAddSubjectCard').addEventListener('click', () => openAddSubjectModal());

  if (archivedSubjects.length > 0) {
    archivedWrap.classList.remove('hidden');
    document.getElementById('archivedCount').textContent = archivedSubjects.length;
    archivedList.innerHTML = archivedSubjects.map(buildCard).join('');
  } else {
    archivedWrap.classList.add('hidden');
  }
}

let editingSubjectId = null;
let selectedSubjectColor = COLORS[0];

function renderColorPicker() {
  const picker = document.getElementById('subjectColorPicker');
  picker.innerHTML = COLORS.map(c =>
    `<div class="color-swatch${c === selectedSubjectColor ? ' selected' : ''}" style="background:${c}" data-color="${c}"></div>`
  ).join('');
  picker.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedSubjectColor = sw.dataset.color;
      renderColorPicker();
    });
  });
}

function openAddSubjectModal() {
  editingSubjectId = null;
  document.getElementById('subjectModalTitle').textContent = 'Nueva materia';
  document.getElementById('subjectNameInput').value = '';
  document.getElementById('subjectTargetInput').value = 300;
  selectedSubjectColor = COLORS[data.subjects.length % COLORS.length];
  renderColorPicker();
  document.getElementById('subjectModal').classList.remove('hidden');
  document.getElementById('subjectNameInput').focus();
}

function openEditSubjectModal(id) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return;
  editingSubjectId = id;
  document.getElementById('subjectModalTitle').textContent = 'Editar materia';
  document.getElementById('subjectNameInput').value = subject.name;
  document.getElementById('subjectTargetInput').value = subject.weeklyTargetMin || 300;
  selectedSubjectColor = subject.color;
  renderColorPicker();
  document.getElementById('subjectModal').classList.remove('hidden');
}

function closeSubjectModal() {
  document.getElementById('subjectModal').classList.add('hidden');
}

function saveSubject() {
  const name = document.getElementById('subjectNameInput').value.trim();
  if (!name) { showToast('Ponle un nombre a la materia'); return; }
  const target = Number(document.getElementById('subjectTargetInput').value) || 300;

  if (editingSubjectId) {
    const subject = data.subjects.find(s => s.id === editingSubjectId);
    subject.name = name;
    subject.weeklyTargetMin = target;
    subject.color = selectedSubjectColor;
  } else {
    data.subjects.push({ id: uid(), name, color: selectedSubjectColor, weeklyTargetMin: target, createdAt: new Date().toISOString() });
  }
  saveData();
  closeSubjectModal();
  renderSubjectSelects();
  renderMaterias();
}

document.getElementById('emptyStateAddSubject').addEventListener('click', () => openAddSubjectModal());
document.getElementById('subjectSaveBtn').addEventListener('click', saveSubject);
document.getElementById('subjectCancelBtn').addEventListener('click', closeSubjectModal);
document.getElementById('subjectModal').addEventListener('click', (e) => {
  if (e.target.id === 'subjectModal') closeSubjectModal();
});

document.getElementById('deleteSubjectConfirmBtn').addEventListener('click', confirmDeleteSubject);
document.getElementById('deleteSubjectCancelBtn').addEventListener('click', closeDeleteSubjectModal);
document.getElementById('deleteSubjectModal').addEventListener('click', (e) => {
  if (e.target.id === 'deleteSubjectModal') closeDeleteSubjectModal();
});

document.getElementById('archivedToggleBtn').addEventListener('click', () => {
  const btn = document.getElementById('archivedToggleBtn');
  const listEl = document.getElementById('archivedSubjectList');
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  listEl.classList.toggle('hidden');
});
document.getElementById('exportDataBtn').addEventListener('click', exportData);

document.getElementById('importDataBtn').addEventListener('click', () => {
  document.getElementById('importDataInput').click();
});

document.getElementById('importDataInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importData(file);
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
  wipeAllData();
  document.getElementById('wipeDataModal').classList.add('hidden');
  showToast('Todos los datos han sido borrados');
});

let pendingDeleteSubjectId = null;

function openDeleteSubjectModal(id) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return;
  pendingDeleteSubjectId = id;

  const subjSessions = data.sessions.filter(s => s.subjectId === id);
  const totalMin = subjSessions.reduce((a,b) => a + b.durationMin, 0);
  const totalHours = (totalMin / 60).toFixed(1);

  document.getElementById('deleteSubjectName').textContent = subject.name;
  document.getElementById('deleteSubjectDetail').textContent =
    `También se eliminarán ${subjSessions.length} sesiones y ${totalHours} h registradas.`;
  document.getElementById('deleteSubjectModal').classList.remove('hidden');
  document.getElementById('deleteSubjectConfirmBtn').focus();
}

function closeDeleteSubjectModal() {
  pendingDeleteSubjectId = null;
  document.getElementById('deleteSubjectModal').classList.add('hidden');
}

function confirmDeleteSubject() {
  if (!pendingDeleteSubjectId) return;
  data.subjects = data.subjects.filter(s => s.id !== pendingDeleteSubjectId);
  data.sessions = data.sessions.filter(s => s.subjectId !== pendingDeleteSubjectId);
  saveData();
  closeDeleteSubjectModal();
  renderSubjectSelects();
  renderMaterias();
  refreshStatsIfVisible();
}

function archiveSubject(id) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return;
  subject.archived = true;
  saveData();
  renderSubjectSelects();
  renderMaterias();
}

function unarchiveSubject(id) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return;
  subject.archived = false;
  saveData();
  renderSubjectSelects();
  renderMaterias();
}

// ---------- Pomodoro Timer ----------
const ORIGINAL_TITLE = document.title;
let mode = 'focus';
let secondsLeft = data.settings.focusMin * 60;
let isRunning = false;
let intervalId = null;
let cyclesCompleted = 0;
let sessionStart = null;
let focusSecondsAtStart = secondsLeft;
let modeEndTimestamp = null; 
let pendingNextMode = null;

const CIRCUM = 2 * Math.PI * 54;
const ring = document.getElementById('timerRing');
ring.setAttribute('stroke-dasharray', CIRCUM);

function formatTime(s) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = (s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

function updateTimerDisplay() {
  document.getElementById('timeDisplay').textContent = formatTime(secondsLeft);
  const modeLabel = mode === 'focus' ? 'Enfoque' : mode === 'break' ? 'Descanso' : 'Descanso largo';
  const modeDisplayEl = document.getElementById('modeDisplay');
  modeDisplayEl.textContent = modeLabel;
  if (mode === 'focus') {
    const subjectId = document.getElementById('subjectSelect').value;
    const subject = data.subjects.find(s => s.id === subjectId);
    modeDisplayEl.style.color = subject ? subject.color : '#d4a0a0';
  } else {
    modeDisplayEl.style.color = '#34d399';
  }
  const totalForMode = mode === 'focus' ? data.settings.focusMin*60 : mode === 'break' ? data.settings.breakMin*60 : data.settings.longBreakMin*60;
  const progress = 1 - secondsLeft/totalForMode;
  ring.style.strokeDashoffset = CIRCUM * (1 - progress);
  ring.style.stroke = '';
  document.getElementById('timerCircleWrap').classList.toggle('break', mode !== 'focus');
  updateCycleTrackFill();

  document.getElementById('timeAdjustRow').classList.toggle('hidden', isRunning);

  if (isRunning) {
    const modeIcon = mode === 'focus' ? '🎯' : '☕';
    document.title = `${modeIcon} ${formatTime(secondsLeft)} · Study Tracker`;
  } else {
    document.title = ORIGINAL_TITLE;
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

function finishCurrentMode() {
  isRunning = false;
  clearInterval(intervalId);
  modeEndTimestamp = null;
  document.title = ORIGINAL_TITLE;

  let nextMode, nextLabel;
  if (mode === 'focus') {
    saveSession();
    cyclesCompleted++;
    if (cyclesCompleted % data.settings.cyclesBeforeLongBreak === 0) {
      nextMode = 'longBreak';
      nextLabel = 'Empezar descanso largo';
    } else {
      nextMode = 'break';
      nextLabel = 'Empezar descanso';
    }
  } else {
    nextMode = 'focus';
    nextLabel = 'Empezar enfoque';
    sessionStart = null;
  }
  pendingNextMode = nextMode;
  document.getElementById('startNextBtn').textContent = nextLabel;
  playBeep();
  notifyModeFinished(mode);

  const circle = document.getElementById('timerCircleWrap');
  circle.classList.remove('running');
  circle.classList.add('completed');
  setTimeout(() => circle.classList.remove('completed'), 1000);

  const shouldAutoStart = data.settings.autoStartBreak && mode === 'focus';
  if (shouldAutoStart) {
    goToMode(nextMode);
    pendingNextMode = null;
    startTicking();
  } else {
    document.getElementById('mainBtnRow').classList.add('hidden');
    document.getElementById('nextModeRow').classList.remove('hidden');
    updateTimerDisplay();
  }
}

function goToMode(nextMode) {
  mode = nextMode;
  secondsLeft = mode === 'focus' ? data.settings.focusMin * 60
    : mode === 'break' ? data.settings.breakMin * 60
    : data.settings.longBreakMin * 60;
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  updateTimerDisplay();
}

const SOUND_LIBRARY = {
  'chime-major': [523.25, 659.25, 784.0],
  'chime-soft':  [392.0, 523.25],
  'bell':        [660.0],
  'none':        []
};

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
  } catch(e) {}
}

function playBeep() {
  const key = mode === 'focus' ? 'chime-major' : 'chime-soft';
  playSoundKey(key);
}

function saveSession() {
  const subjectId = document.getElementById('subjectSelect').value;
  if (!subjectId || !sessionStart) return;
  const durationMin = Math.round(focusSecondsAtStart / 60);
  const subject = data.subjects.find(s => s.id === subjectId);

  const todayStr = new Date().toDateString();
  const isFirstSessionToday = !data.sessions.some(s => new Date(s.startTime).toDateString() === todayStr);

  data.sessions.push({
    id: uid(),
    subjectId,
    startTime: sessionStart.toISOString(),
    endTime: new Date().toISOString(),
    durationMin,
    type: 'pomodoro',
    notes: null,
    createdAt: new Date().toISOString()
  });
  
  saveData();

  const nombreMateria = subject ? subject.name : 'Materia General';
  enviarDatosAGoogleSheets(nombreMateria, durationMin, "Estudio");

  renderSubjectProgress();
  refreshStatsIfVisible();
  if (isFirstSessionToday) showStreakCelebration();
}

function showStreakCelebration() {
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const has = data.sessions.some(s => new Date(s.startTime).toDateString() === dayStr);
    if (has) streak++;
    else break;
  }
  const overlay = document.createElement('div');
  overlay.className = 'streak-celebration';
  overlay.innerHTML = `
    <div class="streak-celebration-card">
      <div class="streak-flame">🔥</div>
      <div class="streak-number">${streak}</div>
      <div class="streak-label">${streak === 1 ? 'día de racha' : 'días de racha'}</div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }, 2200);
}

function refreshStatsIfVisible() {
  const dashView = document.getElementById('view-dashboard');
  if (dashView && !dashView.classList.contains('hidden')) {
    renderDashboard();
  }
}

function toLocalDatetimeInputValue(d) {
  const pad = n => n.toString().padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  data.sessions.push({
    id: uid(),
    subjectId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMin,
    type: 'manual',
    notes: notes || null,
    createdAt: new Date().toISOString()
  });
  saveData();
  closeManualModal();
  renderSubjectProgress();
  refreshStatsIfVisible();
  
  // Enviar pomodoro manual a Google Sheets
  const nombreMateria = subject ? subject.name : 'Materia General';
  enviarDatosAGoogleSheets(nombreMateria, durationMin, "Manual");

  showToast(`Pomodoro añadido: ${durationMin} min · ${subject ? subject.name : ''}`);
});

function startTicking() {
  isRunning = true;
  document.getElementById('startBtn').textContent = 'Pausar';
  document.getElementById('timerCircleWrap').classList.add('running');
  if (mode === 'focus' && !sessionStart) {
    sessionStart = new Date();
    focusSecondsAtStart = secondsLeft;
  }
  modeEndTimestamp = Date.now() + secondsLeft * 1000;
  intervalId = setInterval(tick, 250); 
  updateTimerDisplay();
}

document.getElementById('startBtn').onclick = () => {
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
    document.getElementById('startBtn').textContent = 'Iniciar';
    document.getElementById('timerCircleWrap').classList.remove('running');
    clearInterval(intervalId);
    modeEndTimestamp = null;
    document.title = ORIGINAL_TITLE;
    updateTimerDisplay();
  }
};

document.getElementById('startNextBtn').addEventListener('click', () => {
  if (pendingNextMode) {
    goToMode(pendingNextMode);
    pendingNextMode = null;
    startTicking();
  }
});

document.getElementById('skipNextBtn').addEventListener('click', () => {
  if (pendingNextMode) {
    goToMode(pendingNextMode);
    pendingNextMode = null;
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  isRunning = false;
  clearInterval(intervalId);
  mode = 'focus';
  secondsLeft = data.settings.focusMin * 60;
  sessionStart = null;
  modeEndTimestamp = null;
  pendingNextMode = null;
  document.getElementById('startBtn').textContent = 'Iniciar';
  document.getElementById('timerCircleWrap').classList.remove('running');
  document.getElementById('mainBtnRow').classList.remove('hidden');
  document.getElementById('nextModeRow').classList.add('hidden');
  document.title = ORIGINAL_TITLE;
  updateTimerDisplay();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isRunning) {
    syncFromRealClock();
    updateTimerDisplay();
  }
});

// ---------- Settings ----------
function loadSettingsForm() {
  document.getElementById('focusMinInput').value = data.settings.focusMin;
  document.getElementById('breakMinInput').value = data.settings.breakMin;
  document.getElementById('longBreakMinInput').value = data.settings.longBreakMin;
  document.getElementById('cyclesInput').value = data.settings.cyclesBeforeLongBreak;
  document.getElementById('dailyGoalInput').value = data.settings.dailyGoal || 4;
  document.getElementById('autoStartBreakInput').checked = !!data.settings.autoStartBreak;
  document.getElementById('notifyOnFinishInput').checked = !!data.settings.notifyOnFinish;
}

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  data.settings.focusMin = Number(document.getElementById('focusMinInput').value) || 25;
  data.settings.breakMin = Number(document.getElementById('breakMinInput').value) || 5;
  data.settings.longBreakMin = Number(document.getElementById('longBreakMinInput').value) || 15;
  data.settings.cyclesBeforeLongBreak = Math.max(1, Number(document.getElementById('cyclesInput').value) || 4);
  data.settings.dailyGoal = Number(document.getElementById('dailyGoalInput').value) || 4;
  data.settings.autoStartBreak = document.getElementById('autoStartBreakInput').checked;
  data.settings.notifyOnFinish = document.getElementById('notifyOnFinishInput').checked;
  saveData();
  mode = 'focus';
  secondsLeft = data.settings.focusMin * 60;
  cyclesCompleted = 0;
  updateTimerDisplay();
  renderSubjectProgress();
  renderCycleTrack();
  updateCycleTrackFill();
  showToast('Ajustes guardados');
});

document.getElementById('notifyOnFinishInput').addEventListener('change', (e) => {
  if (e.target.checked && 'Notification' in window) {
    if (Notification.permission === 'granted') return;
    Notification.requestPermission().then(permission => {
      if (permission !== 'granted') e.target.checked = false;
    });
  }
});

// ---------- Dashboard ----------
let weekChartInstance = null;
let subjectChartInstance = null;
let weekOffset = 0; 

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-container');
  const monthsEl = document.getElementById('heatmap-months');
  const dayLabelsEl = document.getElementById('heatmap-day-labels');
  const infoEl = document.getElementById('heatmap-info');
  const pillEl = document.getElementById('heatmapPill');
  if (!container || !monthsEl || !dayLabelsEl) return;

  // Remove any old tooltip
  const oldTooltip = document.getElementById('heatmap-tooltip');
  if (oldTooltip) oldTooltip.remove();

  // PASO 2 — Empty state when no sessions
  if (!data.sessions || data.sessions.length === 0) {
    container.innerHTML = '';
    monthsEl.innerHTML = '';
    dayLabelsEl.innerHTML = '';
    const wrapper = document.getElementById('heatmap-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '<div class="chart-empty-msg" style="min-height:80px;padding:40px 20px;font-size:13px;color:var(--text-dim);text-align:center;border:1px dashed var(--border-soft);border-radius:12px">Completa tu primer pomodoro para empezar a ver tu constancia aquí</div>';
    }
    if (infoEl) infoEl.innerHTML = '';
    if (pillEl) pillEl.textContent = 'Sin datos';
    return;
  }

  // PASO 2 — Find oldest session date (local time, no time component)
  let firstSessionDate = null;
  data.sessions.forEach(s => {
    const d = new Date(s.startTime);
    d.setHours(0, 0, 0, 0);
    if (!firstSessionDate || d < firstSessionDate) firstSessionDate = d;
  });

  // Today in local time, no time component
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate real day count
  const realDayCount = Math.ceil((today - firstSessionDate) / (1000 * 60 * 60 * 24)) + 1;

  // PASO 2 — Update pill dynamically
  if (pillEl) {
    pillEl.textContent = realDayCount === 1 ? 'Último día' : `Últimos ${realDayCount} días`;
  }

  // PASO 3 — Build day map from data.sessions ONLY (no random, no fake)
  // Use the EXACT same filtering logic as openDayDetail:
  //   const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
  //   const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);
  //   const daySessions = data.sessions.filter(s => {
  //     const dt = new Date(s.startTime);
  //     return dt >= dayStart && dt < dayEnd;
  //   });
  const dayMap = {};
  data.sessions.forEach(s => {
    const dt = new Date(s.startTime);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (!dayMap[key]) dayMap[key] = { minutes: 0, sessions: [] };
    dayMap[key].minutes += s.durationMin;
    dayMap[key].sessions.push(s);
  });

  function getLevel(minutes) {
    if (minutes <= 0) return 'level-0';
    if (minutes <= 25) return 'level-1';
    if (minutes <= 60) return 'level-2';
    if (minutes <= 120) return 'level-3';
    return 'level-4';
  }

  function toLocalKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Align grid start to the Monday of firstSessionDate's week
  const startDayOfWeek = firstSessionDate.getDay(); // 0=Sun
  const daysToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
  const gridStart = new Date(firstSessionDate);
  gridStart.setDate(gridStart.getDate() + daysToMonday);

  // Calculate total weeks needed from gridStart to today
  const totalDays = Math.ceil((today - gridStart) / (1000 * 60 * 60 * 24)) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  // Day labels
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  dayLabelsEl.innerHTML = dayNames.map(d => `<span>${d}</span>`).join('');

  // Month labels
  const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthLabels = [];
  let lastMonth = -1;

  // Build cells
  const cellsByCol = [];

  for (let w = 0; w < totalWeeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = toLocalKey(cellDate);
      const dayData = dayMap[key];
      const minutes = dayData ? dayData.minutes : 0;
      const sessionCount = dayData ? dayData.sessions.length : 0;
      const level = getLevel(minutes);

      // Cell is in range if >= firstSessionDate AND <= today
      const isInRange = cellDate >= firstSessionDate && cellDate <= today;

      col.push({ date: cellDate, key, minutes, sessionCount, level, isInRange });

      // Track month for labels (only on first row of a new month)
      const monthIdx = cellDate.getMonth();
      if (monthIdx !== lastMonth && isInRange && d === 0) {
        monthLabels.push({ col: w, name: MONTH_NAMES[monthIdx] });
        lastMonth = monthIdx;
      }
    }
    cellsByCol.push(col);
  }

  // Render month labels
  if (monthLabels.length > 0) {
    monthsEl.innerHTML = monthLabels.map(m => {
      const leftPx = m.col * (14 + 4); // cell width + gap
      return `<span style="position:absolute;left:${leftPx}px">${m.name}</span>`;
    }).join('');
    monthsEl.style.position = 'relative';
    monthsEl.style.width = (totalWeeks * 18 - 4) + 'px';
    monthsEl.style.marginLeft = '32px';
  } else {
    monthsEl.innerHTML = '';
  }

  // Render cells
  let html = '';
  let totalCells = 0;
  let activeCells = 0;

  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cell = cellsByCol[w][d];
      if (cell.isInRange) {
        totalCells++;
        if (cell.minutes > 0) activeCells++;
        html += `<div class="heatmap-cell ${cell.level}" data-date="${cell.key}" data-minutes="${cell.minutes}" data-sessions="${cell.sessionCount}"></div>`;
      } else {
        html += `<div class="heatmap-cell heatmap-placeholder" style="background:transparent;border-color:transparent;cursor:default;pointer-events:none"></div>`;
      }
    }
  }
  container.innerHTML = html;

  // PASO 5 — Verification
  console.log(`[Heatmap] Total celdas visibles: ${totalCells} | Celdas con actividad (>0 min): ${activeCells} | Días reales en data.sessions: ${Object.keys(dayMap).length}`);

  // PASO 4 — Floating tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'heatmap-tooltip';
  document.body.appendChild(tooltip);

  let currentHoveredCell = null;

  function showTooltip(e, cell) {
    currentHoveredCell = cell;
    const dateStr = cell.dataset.date;
    const minutes = parseInt(cell.dataset.minutes, 10);
    const sessions = parseInt(cell.dataset.sessions, 10);
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dateFormatted = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    if (minutes === 0) {
      tooltip.innerHTML = `<p class="tooltip-date">${dateFormatted}</p><p class="tooltip-empty">Sin actividad este día</p>`;
    } else {
      const label = sessions === 1 ? 'pomodoro' : 'pomodoros';
      tooltip.innerHTML = `<p class="tooltip-date">${dateFormatted}</p><p class="tooltip-minutes">${minutes} min · ${sessions} ${label}</p>`;
    }

    const rect = cell.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    let top = rect.top - 8;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';

    requestAnimationFrame(() => {
      // Check if tooltip goes above viewport
      const ttRect = tooltip.getBoundingClientRect();
      if (ttRect.top < 8) {
        tooltip.style.top = (rect.bottom + 8) + 'px';
        tooltip.style.transform = 'translate(-50%, 0)';
      }
      tooltip.classList.add('show');
    });
  }

  function hideTooltip() {
    currentHoveredCell = null;
    tooltip.classList.remove('show');
  }

  // Attach hover handler using event delegation on the container
  container.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (!cell || cell.classList.contains('heatmap-placeholder')) return;
    if (cell !== currentHoveredCell) {
      showTooltip(e, cell);
    }
  });

  container.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (!cell || cell.classList.contains('heatmap-placeholder')) return;
    const rect = cell.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    let top = rect.top - 8;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';
    const ttRect = tooltip.getBoundingClientRect();
    if (ttRect.top < 8) {
      tooltip.style.top = (rect.bottom + 8) + 'px';
      tooltip.style.transform = 'translate(-50%, 0)';
    }
  });

  container.addEventListener('mouseout', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (cell && cell.classList.contains('heatmap-placeholder')) return;
    hideTooltip();
  });

  // Click handler on container (event delegation)
  container.addEventListener('click', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (!cell || cell.classList.contains('heatmap-placeholder')) return;

    const dateStr = cell.dataset.date;
    const minutes = parseInt(cell.dataset.minutes, 10);
    const sessions = parseInt(cell.dataset.sessions, 10);
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dateFormatted = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const dayData = dayMap[dateStr];

    console.log(`[Heatmap] Click en ${dateFormatted} — ${minutes} min, ${sessions} sesiones`);

    if (infoEl) {
      if (minutes === 0) {
        infoEl.innerHTML = `<span style="color:var(--text-faint)">Sin actividad el ${dateFormatted}</span>`;
      } else {
        const breakdown = {};
        dayData.sessions.forEach(s => {
          const subj = data.subjects.find(sub => sub.id === s.subjectId);
          const name = subj ? subj.name : 'Sin materia';
          breakdown[name] = (breakdown[name] || 0) + s.durationMin;
        });
        const breakdownStr = Object.entries(breakdown)
          .map(([name, mins]) => `${name}: ${mins} min`)
          .join(' · ');
        const label = sessions === 1 ? 'pomodoro' : 'pomodoros';
        infoEl.innerHTML = `<strong>${dateFormatted}</strong> — ${minutes} min · ${sessions} ${label} · ${breakdownStr}`;
      }
    }
  });

  // Clear info text
  if (infoEl) infoEl.innerHTML = '';

  // Hide tooltip on scroll
  document.addEventListener('scroll', hideTooltip, { once: true });
}

function renderDashboard() {
  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });

  const emptyWrap = document.getElementById('dashEmptyWrap');
  const contentWrap = document.getElementById('dashContentWrap');
  const hasSubjects = data.subjects.length > 0;
  const hasSessions = data.sessions.length > 0;

  if (!hasSubjects) {
    emptyWrap.classList.remove('hidden');
    contentWrap.classList.add('hidden');
    return;
  } else {
    emptyWrap.classList.add('hidden');
    contentWrap.classList.remove('hidden');
  }

  const now = new Date();
  const currentWeekStart = startOfWeekMonday(now);
  const dayLabels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  const viewedWeekStart = new Date(currentWeekStart);
  viewedWeekStart.setDate(viewedWeekStart.getDate() + weekOffset * 7);
  const viewedWeekEnd = new Date(viewedWeekStart);
  viewedWeekEnd.setDate(viewedWeekEnd.getDate() + 7);

  const dayTotals = new Array(7).fill(0);
  data.sessions.forEach(s => {
    const dt = new Date(s.startTime);
    const diffDays = Math.floor((dt - viewedWeekStart) / (1000*60*60*24));
    if (diffDays >= 0 && diffDays < 7) dayTotals[diffDays] += s.durationMin;
  });
  const viewedWeekMin = dayTotals.reduce((a,b) => a+b, 0);

  const weekRangeLabel = document.getElementById('weekRangeLabel');
  if (weekOffset === 0) {
    weekRangeLabel.textContent = 'Esta semana';
  } else if (weekOffset === -1) {
    weekRangeLabel.textContent = 'Semana pasada';
  } else {
    const endLabel = new Date(viewedWeekEnd);
    endLabel.setDate(endLabel.getDate() - 1);
    weekRangeLabel.textContent = `${viewedWeekStart.toLocaleDateString('es-ES', {day:'numeric', month:'short'})} – ${endLabel.toLocaleDateString('es-ES', {day:'numeric', month:'short'})}`;
  }
  document.getElementById('weekNextBtn').disabled = weekOffset >= 0;

  const dayTotalsCurrentWeek = new Array(7).fill(0);
  data.sessions.forEach(s => {
    const dt = new Date(s.startTime);
    const diffDays = Math.floor((dt - currentWeekStart) / (1000*60*60*24));
    if (diffDays >= 0 && diffDays < 7) dayTotalsCurrentWeek[diffDays] += s.durationMin;
  });
  const totalWeekMin = dayTotalsCurrentWeek.reduce((a,b) => a+b, 0);
  document.getElementById('statWeekHours').textContent = (totalWeekMin/60).toFixed(1) + 'h';

  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  let prevWeekMin = 0;
  data.sessions.forEach(s => {
    const dt = new Date(s.startTime);
    if (dt >= prevWeekStart && dt < currentWeekStart) prevWeekMin += s.durationMin;
  });
  const deltaEl = document.getElementById('statWeekDelta');
  if (prevWeekMin === 0 && totalWeekMin === 0) {
    deltaEl.textContent = '—';
    deltaEl.className = 'stat-delta';
    deltaEl.style.color = 'var(--text-dim)';
  } else {
    const pct = prevWeekMin === 0 ? 100 : Math.round(((totalWeekMin - prevWeekMin) / prevWeekMin) * 100);
    deltaEl.textContent = (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct) + '% vs semana pasada';
    deltaEl.className = 'stat-delta ' + (pct >= 0 ? 'up' : 'down');
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const has = data.sessions.some(s => new Date(s.startTime).toDateString() === dayStr);
    if (has) streak++;
    else break;
  }
  document.getElementById('statStreak').textContent = streak;

  const uniqueDayStrings = [...new Set(data.sessions.map(s => new Date(s.startTime).toDateString()))]
    .map(d => new Date(d))
    .sort((a,b) => a - b);
  let bestStreak = 0, currentRun = 0, prevDay = null;
  uniqueDayStrings.forEach(d => {
    if (prevDay && (d - prevDay) / (1000*60*60*24) === 1) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    bestStreak = Math.max(bestStreak, currentRun);
    prevDay = d;
  });
  document.getElementById('statStreakBest').textContent = bestStreak;

  const totalMin = data.sessions.reduce((a,b) => a + b.durationMin, 0);
  document.getElementById('statTotalHours').textContent = (totalMin/60).toFixed(1) + 'h';
  document.getElementById('statSessions').textContent = data.sessions.length;

  const bySubject = {};
  data.sessions.forEach(s => {
    const subj = data.subjects.find(sub => sub.id === s.subjectId);
    const name = subj ? subj.name : 'Sin materia';
    const color = subj ? subj.color : '#5f5f68';
    if (!bySubject[name]) bySubject[name] = { minutes: 0, color };
    bySubject[name].minutes += s.durationMin;
  });

  const weekChartWrap = document.getElementById('weekChartWrap');
  const subjectChartWrap = document.getElementById('subjectChartWrap');
  const hasViewedWeekSessions = viewedWeekMin > 0;

  if (!hasViewedWeekSessions) {
    weekChartWrap.innerHTML = '<div class="chart-empty-msg">Sin sesiones en esta semana</div>';
  } else {
    if (!document.getElementById('weekChart')) {
      weekChartWrap.innerHTML = '<canvas id="weekChart"></canvas>';
    }
    const weekCtx = document.getElementById('weekChart');
    if (weekChartInstance) weekChartInstance.destroy();
    weekChartInstance = new Chart(weekCtx, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{ label: 'Minutos', data: dayTotals, backgroundColor: '#f4f4f5', borderRadius: 6, maxBarThickness: 28, hoverBackgroundColor: '#fbbf24' }]
      },
      options: {
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            openDayDetail(viewedWeekStart, elements[0].index);
          }
        },
        onHover: (evt, elements) => {
          weekCtx.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#1f2024' }, ticks: { color: '#5f5f68' } },
          x: { grid: { display: false }, ticks: { color: '#9a9aa2' } }
        }
      }
    });
  }

  if (!hasSessions) {
    subjectChartWrap.innerHTML = '<div class="chart-empty-msg">Completa una sesión para ver esta gráfica</div>';
  } else {
    if (!document.getElementById('subjectChart')) {
      subjectChartWrap.innerHTML = '<canvas id="subjectChart"></canvas>';
    }
    const subjectCtx = document.getElementById('subjectChart');
    if (subjectChartInstance) subjectChartInstance.destroy();
    const subjectNames = Object.keys(bySubject);
    subjectChartInstance = new Chart(subjectCtx, {
      type: 'doughnut',
      data: {
        labels: subjectNames,
        datasets: [{
          data: subjectNames.map(n => bySubject[n].minutes),
          backgroundColor: subjectNames.map(n => bySubject[n].color),
          borderWidth: 0
        }]
      },
      options: {
        cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { color: '#9a9aa2', boxWidth: 8, font: { size: 11 } } } }
      }
    });
  }

  renderWeeklyGoals(currentWeekStart);
  renderHeatmap();
}

function openDayDetail(weekStart, dayIndex) {
  const dayStart = new Date(weekStart);
  dayStart.setDate(dayStart.getDate() + dayIndex);
  dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const daySessions = data.sessions
    .filter(s => { const dt = new Date(s.startTime); return dt >= dayStart && dt < dayEnd; })
    .sort((a,b) => new Date(a.startTime) - new Date(b.startTime));

  const totalMin = daySessions.reduce((a,b) => a + b.durationMin, 0);
  const avgMin = daySessions.length ? Math.round(totalMin / daySessions.length) : 0;

  const fmt = (m) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  };

  document.getElementById('dayDetailTitle').textContent = dayStart.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('dayDetailHeroTime').textContent = fmt(totalMin);
  document.getElementById('dayDetailCount').textContent = daySessions.length;
  document.getElementById('dayDetailAvg').textContent = fmt(avgMin);

  const rangeEl = document.getElementById('dayDetailRange');
  if (daySessions.length > 0) {
    const first = new Date(daySessions[0].startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const last = new Date(daySessions[daySessions.length - 1].startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    rangeEl.textContent = `${first} – ${last}`;
  } else {
    rangeEl.textContent = '';
  }

  const timelineEl = document.getElementById('dayDetailTimeline');
  if (daySessions.length === 0) {
    timelineEl.innerHTML = `
      <div class="day-detail-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
        <p>No hay sesiones registradas este día.</p>
      </div>`;
  } else {
    timelineEl.innerHTML = daySessions.map((s, i) => {
      const subj = data.subjects.find(sub => sub.id === s.subjectId);
      const time = new Date(s.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const color = subj ? subj.color : '#5f5f68';
      const name = subj ? subj.name : 'Sin materia';
      return `
        <div class="day-detail-item">
          <span class="dot" style="background:${color}"></span>
          <div class="day-detail-item-info">
            <p class="day-detail-item-time">${time} · Sesión ${i + 1}</p>
            <p class="day-detail-item-subject">${name}</p>
          </div>
          <span class="day-detail-item-dur">${fmt(s.durationMin)}</span>
        </div>`;
    }).join('');
  }

  document.getElementById('dayDetailOverlay').classList.remove('hidden');
  requestAnimationFrame(() => document.getElementById('dayDetailOverlay').classList.add('show'));
}

function closeDayDetail() {
  const overlay = document.getElementById('dayDetailOverlay');
  overlay.classList.remove('show');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}
document.getElementById('dayDetailCloseBtn').addEventListener('click', closeDayDetail);
document.getElementById('dayDetailOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'dayDetailOverlay') closeDayDetail();
});

function renderWeeklyGoals(currentWeekStart) {
  const wrap = document.getElementById('weeklyGoalsWrap');
  if (data.subjects.length === 0) {
    wrap.innerHTML = '<p class="weekly-goal-empty">Crea una materia con un objetivo semanal para verlo aquí.</p>';
    return;
  }
  wrap.innerHTML = data.subjects.map(subject => {
    const weekMin = data.sessions
      .filter(s => s.subjectId === subject.id && new Date(s.startTime) >= currentWeekStart)
      .reduce((a,b) => a + b.durationMin, 0);
    const target = subject.weeklyTargetMin || 300;
    const pct = Math.min(100, Math.round((weekMin / target) * 100));
    return `
      <div class="weekly-goal-row">
        <div class="weekly-goal-info">
          <div class="weekly-goal-name"><span class="dot" style="background:${subject.color}"></span>${subject.name}</div>
          <div class="weekly-goal-track"><div class="weekly-goal-fill" style="width:${pct}%;background:${subject.color}"></div></div>
        </div>
        <div class="weekly-goal-pct">${weekMin} / ${target} min</div>
      </div>`;
  }).join('');
}

document.getElementById('emptyStateGoSubjects').addEventListener('click', () => {
  document.querySelector('nav button[data-view="materias"]').click();
});

document.getElementById('weekPrevBtn').addEventListener('click', () => {
  weekOffset -= 1;
  renderDashboard();
});

document.getElementById('weekNextBtn').addEventListener('click', () => {
  if (weekOffset < 0) {
    weekOffset += 1;
    renderDashboard();
  }
});


// ============================================================================
// CONEXIÓN CON GOOGLE SHEETS
// ============================================================================
function enviarDatosAGoogleSheets(materia, duracionMinutos, etiqueta) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("AQUÍ_PEGA")) return;

  fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materia, duracion: duracionMinutos, etiqueta })
  })
  .then(() => console.log("¡Datos sincronizados en directo con Google Sheets!"))
  .catch(error => console.error("Error al sincronizar con Google Sheets:", error));
}


// ============================================================================
// FUNCIONES PARA AÑADIR O QUITAR POMODOROS (MANUAL/CONSOLA)
// ============================================================================

// 1. ELIMINAR EL ÚLTIMO POMODORO: Muy útil si se guardó uno por error.
function eliminarUltimoPomodoro() {
  if (data.sessions.length === 0) {
      showToast('No hay pomodoros registrados para eliminar.');
      return;
  }
  // Se ordena por fecha y se extrae el más reciente
  data.sessions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const sesionEliminada = data.sessions.pop();
  
  saveData();
  renderSubjectProgress();
  refreshStatsIfVisible();
  renderMaterias();
  
  console.log("Pomodoro eliminado:", sesionEliminada);
  showToast(`Último pomodoro eliminado (-${sesionEliminada.durationMin} min)`);
}

// 2. AGREGAR POMODORO RÁPIDO: Añade minutos a la materia que tengas seleccionada en el menú desplegable.
function agregarPomodoroRapido(minutos) {
  const subjectId = document.getElementById('subjectSelect').value;
  if (!subjectId) {
      showToast('Por favor, selecciona una materia en el desplegable superior primero.');
      return;
  }
  
  const subject = data.subjects.find(s => s.id === subjectId);
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - minutos); // Restamos los minutos para simular que empezó antes
  
  data.sessions.push({
      id: uid(),
      subjectId: subjectId,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      durationMin: minutos,
      type: 'manual',
      notes: null,
      createdAt: new Date().toISOString()
  });
  
  saveData();
  
  // Lo mandamos a tu Google Sheets también
  enviarDatosAGoogleSheets(subject.name, minutos, "Rápido");

  renderSubjectProgress();
  refreshStatsIfVisible();
  renderMaterias();
  showToast(`Añadidos ${minutos} min a ${subject.name}`);
}

// ---------- Init ----------
renderSubjectSelects();
loadSettingsForm();
updateTimerDisplay();
renderSubjectProgress();
renderCycleTrack();
updateCycleTrackFill();