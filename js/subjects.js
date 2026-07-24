import { data, saveData, recomputeStats } from './storage.js';
import { COLORS, uid, hexToRgba, startOfWeekMonday, escapeAttr } from './utils.js';
import { showToast } from './ui.js';
import { refreshStatsIfVisible } from './dashboard.js';
import { renderSubjectContext } from './timer.js';
import { getSubjectGoal, getSubjectGoalProgress, isSubjectGoalComplete, adjustSubjectCompletedUnits } from './subjectGoals.js';
import { t, getDateLocale } from './i18n.js';

let editingSubjectId = null;
let selectedSubjectColor = COLORS[0];
let pendingDeleteSubjectId = null;
let materiasTab = 'activas';

export function renderSubjectSelects() {
  const sel = document.getElementById('subjectSelect');
  if (!sel) return;
  const currentVal = sel.value;
  const activeSubjects = data.subjects.filter(s => !s.archived);
  sel.innerHTML = `<option value="">${t('timer.selectSubject')}</option>` +
    activeSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  sel.value = activeSubjects.some(s => s.id === currentVal) ? currentVal : '';
  renderSubjectDropdownPanel();
  updateSubjectDropdownLabel();
  renderSubjectContext();
}

function renderSubjectDropdownPanel() {
  const panel = document.getElementById('subjectSelectPanel');
  const sel = document.getElementById('subjectSelect');
  if (!panel || !sel) return;
  const currentVal = sel.value;
  const noneIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12h6"/></svg>`;
  const noneOption = `<div class="subject-select-option${currentVal === '' ? ' selected' : ''}" data-value="">
    <span class="subject-select-option-icon">${noneIcon}</span>
    <span class="subject-select-option-label">${t('timer.selectSubject')}</span>
  </div>`;
  const subjectOptions = data.subjects.filter(s => !s.archived).map(s => {
    const bookIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    return `<div class="subject-select-option${currentVal === s.id ? ' selected' : ''}" data-value="${s.id}" style="--subject-color:${s.color}">
      <span class="subject-select-option-icon" style="color:${s.color}">${bookIcon}</span>
      <span class="subject-select-option-label">${s.name}</span>
    </div>`;
  }).join('');
  panel.innerHTML = noneOption + subjectOptions;
}

function updateSubjectDropdownLabel() {
  const sel = document.getElementById('subjectSelect');
  const label = document.getElementById('subjectSelectLabel');
  const btn = document.getElementById('subjectSelectBtn');
  if (!sel || !label || !btn) return;
  const subject = data.subjects.find(s => s.id === sel.value);
  label.textContent = subject ? subject.name : t('timer.selectSubject');
  if (subject) {
    btn.style.setProperty('--subject-color', subject.color || COLORS[0]);
    btn.classList.add('has-subject');
  } else {
    btn.style.removeProperty('--subject-color');
    btn.classList.remove('has-subject');
  }
}

function closeSubjectDropdown() {
  document.getElementById('subjectSelectPanel').classList.add('hidden');
  document.getElementById('subjectSelectBtn').classList.remove('open');
}

function buildUnitsActionButtons(s) {
  const goal = getSubjectGoal(s);
  if (goal.type !== 'units' || s.archived) return '';

  const current = goal.completedUnits || 0;
  const target = Math.max(1, goal.targetUnits || 1);
  const unitSingular = (goal.unitLabel || t('subjects.unitsDefault')).replace(/s$/, '') || t('subjects.unitsDefault').replace(/s$/, '');
  const atMin = current <= 0;
  const atMax = current >= target;

  return `<div class="card-actions-units">
      <button type="button" class="icon-btn"${atMin ? ' disabled' : ''} title="${t('subjects.unitDown', { unit: unitSingular })}" aria-label="${t('subjects.unitRemove', { unit: unitSingular })}" data-action="unit-minus" data-id="${s.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
      <button type="button" class="icon-btn"${atMax ? ' disabled' : ''} title="${t('subjects.unitUp', { unit: unitSingular })}" aria-label="${t('subjects.unitComplete', { unit: unitSingular })}" data-action="unit-plus" data-id="${s.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg></button>
    </div>`;
}

function buildSubjectCard(s, weekStart) {
  const safeName = escapeAttr(s.name);
  const color = s.color || COLORS[0];
  const subjSessions = data.sessions.filter(sess => sess.subjectId === s.id);
  const totalMin = subjSessions.reduce((a, b) => a + b.durationMin, 0);
  const sessionCount = subjSessions.length;
  const lastSession = subjSessions.slice().sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
  const lastStr = lastSession ? new Date(lastSession.startTime).toLocaleDateString(getDateLocale(), { day: '2-digit', month: 'short' }) : '—';
  const totalHours = (totalMin / 60).toFixed(1);
  const progress = getSubjectGoalProgress(s, data.sessions, weekStart);

  const archiveIcon = s.archived
    ? '<path d="M3 7v13h18V7"/><path d="M1 3h22v4H1z"/><path d="M10 12h4"/>'
    : '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>';
  const archiveTitle = s.archived ? t('subjects.restore') : t('subjects.archive');
  const archiveAction = s.archived ? 'unarchive' : 'archive';

  const progressHtml = progress.hasGoal
    ? `<div class="meta-row meta-row--progress">
        <span>${progress.label}</span>
        <span>${progress.pctLabel}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${progress.pct}%;background:${color}"></div>
      </div>`
    : '';

  return `<div class="subject-card${s.archived ? ' archived' : ''}" data-subject-id="${s.id}">
    <div class="glow" style="background: radial-gradient(ellipse at bottom, ${hexToRgba(color, 0.55)}, transparent 70%)"></div>
    <div class="card-top">
      <div>
        <div class="big-number">${totalHours}h</div>
        <div class="sub-label">${s.name}</div>
      </div>
    </div>
    <div class="meta-row">
      <span>${sessionCount} ${t('subjects.sessions')}</span>
      <span>${t('subjects.lastSession')}: ${lastStr}</span>
    </div>
    ${progressHtml}
    <div class="card-actions">
      ${buildUnitsActionButtons(s)}
      <div class="card-actions-admin">
        <button type="button" class="icon-btn" title="${archiveTitle}" aria-label="${archiveTitle} ${safeName}" data-action="${archiveAction}" data-id="${s.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${archiveIcon}</svg></button>
        ${s.archived ? '' : `<button type="button" class="icon-btn" title="${t('subjects.edit')}" aria-label="${t('subjects.edit')} ${safeName}" data-action="edit" data-id="${s.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>`}
        <button type="button" class="icon-btn danger" title="${t('subjects.delete')}" aria-label="${t('subjects.delete')} ${safeName}" data-action="delete" data-id="${s.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </div>
    </div>
  </div>`;
}

function getFilteredSubjects(weekStart) {
  if (materiasTab === 'archivadas') {
    return data.subjects.filter(s => s.archived);
  }
  const active = data.subjects.filter(s => !s.archived);
  if (materiasTab === 'completadas') {
    return active.filter(s => isSubjectGoalComplete(s, data.sessions, weekStart));
  }
  return active.filter(s => !isSubjectGoalComplete(s, data.sessions, weekStart));
}

function updateMateriasTabs() {
  document.querySelectorAll('.materias-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === materiasTab);
  });
}

export function renderMaterias() {
  const list = document.getElementById('subjectList');
  const emptyWrap = document.getElementById('subjectsEmptyWrap');
  const tabEmptyWrap = document.getElementById('subjectsTabEmptyWrap');
  if (!list || !emptyWrap) return;

  if (data.subjects.length === 0) {
    emptyWrap.classList.remove('hidden');
    tabEmptyWrap?.classList.add('hidden');
    list.innerHTML = '';
    updateMateriasTabs();
    return;
  }
  emptyWrap.classList.add('hidden');

  const weekStart = startOfWeekMonday(new Date());
  const filtered = getFilteredSubjects(weekStart);
  updateMateriasTabs();

  const addCardHtml = materiasTab === 'activas'
    ? `<div class="add-subject-card" data-action="add-subject" role="button" tabindex="0">
        <div class="plus-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div>
        <span>${t('subjects.addCard')}</span>
      </div>`
    : '';

  const tabEmptyMessages = {
    activas: t('subjects.tabEmptyActive'),
    completadas: t('subjects.tabEmptyCompleted'),
    archivadas: t('subjects.tabEmptyArchived')
  };

  if (filtered.length === 0 && !addCardHtml) {
    if (tabEmptyWrap) {
      tabEmptyWrap.classList.remove('hidden');
      tabEmptyWrap.querySelector('p').textContent = tabEmptyMessages[materiasTab];
    }
    list.innerHTML = '';
    return;
  }
  tabEmptyWrap?.classList.add('hidden');

  try {
    list.innerHTML = filtered.map(s => buildSubjectCard(s, weekStart)).join('') + addCardHtml;
  } catch (err) {
    console.error('Error renderizando materias:', err);
    list.innerHTML = addCardHtml;
  }
}

function renderColorPicker() {
  const picker = document.getElementById('subjectColorPicker');
  if (!picker) return;
  picker.innerHTML = COLORS.map(c =>
    `<div class="color-swatch${c === selectedSubjectColor ? ' selected' : ''}" style="background:${c}" data-color="${c}"></div>`
  ).join('');
}

function getGoalHints() {
  return {
    time: t('subjects.goalHintTime'),
    units: t('subjects.goalHintUnits'),
    none: t('subjects.goalHintNone')
  };
}

function updateGoalTypePills() {
  const type = document.getElementById('subjectGoalTypeSelect')?.value || 'time';
  document.querySelectorAll('.goal-type-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.goalType === type);
  });
  const hint = document.getElementById('subjectGoalHint');
  const GOAL_HINTS = getGoalHints();
  if (!hint) return;
  const text = GOAL_HINTS[type] || '';
  hint.textContent = text;
  hint.classList.toggle('hidden', !text);
}

function updatePeriodPills() {
  const period = document.getElementById('subjectGoalPeriodSelect')?.value || 'week';
  document.querySelectorAll('.period-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });
}

function setGoalType(type) {
  const select = document.getElementById('subjectGoalTypeSelect');
  if (!select) return;
  select.value = type;
  updateGoalFieldsVisibility();
}

function setGoalPeriod(period) {
  const select = document.getElementById('subjectGoalPeriodSelect');
  if (!select) return;
  select.value = period;
  updatePeriodPills();
}

function updateGoalFieldsVisibility() {
  const type = document.getElementById('subjectGoalTypeSelect')?.value || 'time';
  document.getElementById('subjectGoalTimeFields')?.classList.toggle('hidden', type !== 'time');
  document.getElementById('subjectGoalUnitsFields')?.classList.toggle('hidden', type !== 'units');
  updateGoalTypePills();
}

function readGoalFromForm() {
  const type = document.getElementById('subjectGoalTypeSelect').value;
  if (type === 'none') return { type: 'none' };
  if (type === 'units') {
    return {
      type: 'units',
      targetUnits: Math.max(1, Number(document.getElementById('subjectUnitsTargetInput').value) || 1),
      completedUnits: Math.max(0, Number(document.getElementById('subjectUnitsCompletedInput').value) || 0),
      unitLabel: document.getElementById('subjectUnitsLabelInput').value.trim() || t('subjects.unitsDefault')
    };
  }
  return {
    type: 'time',
    period: document.getElementById('subjectGoalPeriodSelect').value || 'week',
    targetMin: Math.max(1, Number(document.getElementById('subjectTargetInput').value) || 300)
  };
}

function populateGoalForm(subject) {
  const goal = getSubjectGoal(subject || {});
  const typeSelect = document.getElementById('subjectGoalTypeSelect');
  if (!typeSelect) return;

  const goalType = ['time', 'units', 'none'].includes(goal.type) ? goal.type : 'none';
  typeSelect.value = goalType;

  if (goalType === 'time') {
    const periodSelect = document.getElementById('subjectGoalPeriodSelect');
    const targetInput = document.getElementById('subjectTargetInput');
    if (periodSelect) periodSelect.value = goal.period || 'week';
    if (targetInput) targetInput.value = goal.targetMin || 300;
  } else if (goalType === 'units') {
    const targetInput = document.getElementById('subjectUnitsTargetInput');
    const completedInput = document.getElementById('subjectUnitsCompletedInput');
    const labelInput = document.getElementById('subjectUnitsLabelInput');
    if (targetInput) targetInput.value = goal.targetUnits || 15;
    if (completedInput) completedInput.value = goal.completedUnits || 0;
    if (labelInput) labelInput.value = goal.unitLabel || t('subjects.unitsDefault');
  } else {
    const periodSelect = document.getElementById('subjectGoalPeriodSelect');
    const targetInput = document.getElementById('subjectTargetInput');
    const unitsTargetInput = document.getElementById('subjectUnitsTargetInput');
    const completedInput = document.getElementById('subjectUnitsCompletedInput');
    const labelInput = document.getElementById('subjectUnitsLabelInput');
    if (periodSelect) periodSelect.value = 'week';
    if (targetInput) targetInput.value = 300;
    if (unitsTargetInput) unitsTargetInput.value = 15;
    if (completedInput) completedInput.value = 0;
    if (labelInput) labelInput.value = t('subjects.unitsDefault');
  }
  updateGoalFieldsVisibility();
  updatePeriodPills();
}

function setModalOpen(isOpen) {
  document.body.classList.toggle('modal-open', isOpen);
}

function showSubjectModal() {
  document.getElementById('subjectModal').classList.remove('hidden');
  setModalOpen(true);
}

function openAddSubjectModal() {
  editingSubjectId = null;
  document.getElementById('subjectModalTitle').textContent = t('subjects.newSubject');
  document.getElementById('subjectNameInput').value = '';
  document.getElementById('subjectGoalTypeSelect').value = 'time';
  document.getElementById('subjectGoalPeriodSelect').value = 'week';
  document.getElementById('subjectTargetInput').value = 300;
  document.getElementById('subjectUnitsTargetInput').value = 15;
  document.getElementById('subjectUnitsCompletedInput').value = 0;
  document.getElementById('subjectUnitsLabelInput').value = t('subjects.unitsDefault');
  updateGoalFieldsVisibility();
  updatePeriodPills();
  selectedSubjectColor = COLORS[data.subjects.length % COLORS.length];
  renderColorPicker();
  showSubjectModal();
  document.getElementById('subjectNameInput').focus();
}

function openEditSubjectModal(id) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return;

  editingSubjectId = id;
  const titleEl = document.getElementById('subjectModalTitle');
  const nameInput = document.getElementById('subjectNameInput');
  if (!titleEl || !nameInput) return;

  titleEl.textContent = t('subjects.editSubject');
  nameInput.value = subject.name;
  selectedSubjectColor = subject.color || COLORS[0];
  populateGoalForm(subject);
  renderColorPicker();
  showSubjectModal();
}

function closeSubjectModal() {
  document.getElementById('subjectModal').classList.add('hidden');
  if (document.getElementById('deleteSubjectModal')?.classList.contains('hidden')) {
    setModalOpen(false);
  }
}

function saveSubject() {
  const name = document.getElementById('subjectNameInput').value.trim();
  if (!name) { showToast(t('subjects.nameRequired')); return; }
  const goal = readGoalFromForm();

  if (editingSubjectId) {
    const subject = data.subjects.find(s => s.id === editingSubjectId);
    subject.name = name;
    subject.goal = goal;
    subject.color = selectedSubjectColor;
    if (goal.type === 'time') subject.weeklyTargetMin = goal.targetMin;
    else delete subject.weeklyTargetMin;
  } else {
    const subject = {
      id: uid(),
      name,
      color: selectedSubjectColor,
      goal,
      createdAt: new Date().toISOString()
    };
    if (goal.type === 'time') subject.weeklyTargetMin = goal.targetMin;
    data.subjects.push(subject);
  }
  saveData();
  closeSubjectModal();
  renderSubjectSelects();
  renderMaterias();
}

function openDeleteSubjectModal(id) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return;
  pendingDeleteSubjectId = id;

  const subjSessions = data.sessions.filter(s => s.subjectId === id);
  const totalMin = subjSessions.reduce((a, b) => a + b.durationMin, 0);
  const totalHours = (totalMin / 60).toFixed(1);

  document.getElementById('deleteSubjectName').textContent = subject.name;
  document.querySelector('#deleteSubjectModal h3').textContent = t('subjects.deleteTitle', { name: subject.name });
  document.getElementById('deleteSubjectDetail').textContent =
    t('subjects.deleteDetail', { sessions: subjSessions.length, hours: totalHours });
  document.getElementById('deleteSubjectModal').classList.remove('hidden');
  setModalOpen(true);
  document.getElementById('deleteSubjectConfirmBtn').focus();
}

function closeDeleteSubjectModal() {
  pendingDeleteSubjectId = null;
  document.getElementById('deleteSubjectModal').classList.add('hidden');
  if (document.getElementById('subjectModal')?.classList.contains('hidden')) {
    setModalOpen(false);
  }
}

function confirmDeleteSubject() {
  if (!pendingDeleteSubjectId) return;
  data.subjects = data.subjects.filter(s => s.id !== pendingDeleteSubjectId);
  data.sessions = data.sessions.filter(s => s.subjectId !== pendingDeleteSubjectId);
  recomputeStats();
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

function adjustSubjectUnits(id, delta) {
  const subject = data.subjects.find(s => s.id === id);
  if (!subject || !adjustSubjectCompletedUnits(subject, delta)) return;

  const goal = getSubjectGoal(subject);
  const unitLabel = goal.unitLabel || 'módulos';
  saveData();
  renderMaterias();
  renderSubjectContext();

  if (delta !== 0) {
    showToast(`${goal.completedUnits} / ${goal.targetUnits} ${unitLabel}`);
  }
}

function setModalUnitsCompleted(value) {
  const input = document.getElementById('subjectUnitsCompletedInput');
  if (!input) return;
  const target = Math.max(1, Number(document.getElementById('subjectUnitsTargetInput')?.value) || 1);
  const next = Math.max(0, Math.min(target, value));
  input.value = next;
}

function handleMateriasTabsClick(e) {
  const tabBtn = e.target.closest('.materias-tab');
  if (!tabBtn) return;
  materiasTab = tabBtn.dataset.tab;
  renderMaterias();
}

function handleSubjectListClick(e) {
  const actionEl = e.target.closest('[data-action]');
  const list = document.getElementById('subjectList');
  if (!actionEl || !list?.contains(actionEl)) return;

  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;

  switch (action) {
    case 'add-subject':
      openAddSubjectModal();
      break;
    case 'archive':
      archiveSubject(id);
      break;
    case 'unarchive':
      unarchiveSubject(id);
      break;
    case 'edit':
      openEditSubjectModal(id);
      break;
    case 'delete':
      openDeleteSubjectModal(id);
      break;
    case 'unit-plus':
      adjustSubjectUnits(id, 1);
      break;
    case 'unit-minus':
      adjustSubjectUnits(id, -1);
      break;
  }
}

export function initSubjects() {
  document.getElementById('view-materias')?.addEventListener('click', handleMateriasTabsClick);
  document.getElementById('subjectList')?.addEventListener('click', handleSubjectListClick);

  const panel = document.getElementById('subjectSelectPanel');
  panel?.addEventListener('click', (e) => {
    const opt = e.target.closest('.subject-select-option');
    if (!opt || !panel.contains(opt)) return;
    const sel = document.getElementById('subjectSelect');
    if (!sel) return;
    sel.value = opt.getAttribute('data-value');
    sel.dispatchEvent(new Event('change'));
    updateSubjectDropdownLabel();
    closeSubjectDropdown();
    renderSubjectContext();
  });

  document.getElementById('subjectSelectBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = document.getElementById('subjectSelectBtn');
    if (!btn || !panel) return;
    const willOpen = panel.classList.contains('hidden');
    if (willOpen) renderSubjectDropdownPanel();
    panel.classList.toggle('hidden');
    btn.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('subjectDropdown');
    if (wrap && !wrap.contains(e.target)) closeSubjectDropdown();
  });

  document.getElementById('subjectColorPicker')?.addEventListener('click', (e) => {
    const sw = e.target.closest('.color-swatch');
    if (!sw) return;
    selectedSubjectColor = sw.dataset.color;
    renderColorPicker();
  });

  document.querySelectorAll('.goal-type-pill').forEach(btn => {
    btn.addEventListener('click', () => setGoalType(btn.dataset.goalType));
  });

  document.querySelectorAll('.period-pill').forEach(btn => {
    btn.addEventListener('click', () => setGoalPeriod(btn.dataset.period));
  });

  document.getElementById('subjectUnitsMinusBtn')?.addEventListener('click', () => {
    const current = Number(document.getElementById('subjectUnitsCompletedInput').value) || 0;
    setModalUnitsCompleted(current - 1);
  });
  document.getElementById('subjectUnitsPlusBtn')?.addEventListener('click', () => {
    const current = Number(document.getElementById('subjectUnitsCompletedInput').value) || 0;
    setModalUnitsCompleted(current + 1);
  });

  document.getElementById('subjectModalCloseBtn')?.addEventListener('click', closeSubjectModal);

  document.getElementById('emptyStateAddSubject')?.addEventListener('click', () => openAddSubjectModal());
  document.getElementById('subjectSaveBtn')?.addEventListener('click', saveSubject);
  document.getElementById('subjectCancelBtn')?.addEventListener('click', closeSubjectModal);
  document.getElementById('subjectModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'subjectModal') closeSubjectModal();
  });

  document.getElementById('deleteSubjectConfirmBtn')?.addEventListener('click', confirmDeleteSubject);
  document.getElementById('deleteSubjectCancelBtn')?.addEventListener('click', closeDeleteSubjectModal);
  document.getElementById('deleteSubjectModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'deleteSubjectModal') closeDeleteSubjectModal();
  });
}
