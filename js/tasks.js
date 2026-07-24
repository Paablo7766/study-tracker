const TASKS_KEY = 'st_braindump_tasks';

const DEFAULT_TASKS = [
  { id: 1, title: 'Repasar apuntes del último tema', priority: 'high',   done: false, createdAt: new Date().toISOString() },
  { id: 2, title: 'Completar ejercicios de práctica', priority: 'high',  done: false, createdAt: new Date().toISOString() },
  { id: 3, title: 'Revisar flashcards pendientes',    priority: 'medium', done: false, createdAt: new Date().toISOString() },
  { id: 4, title: 'Organizar el horario de la semana', priority: 'medium', done: false, createdAt: new Date().toISOString() },
  { id: 5, title: 'Buscar recursos extra del tema',   priority: 'low',   done: false, createdAt: new Date().toISOString() },
];

let tasks = [];
let searchQuery = '';
let nextId = 6;

// ─── Storage ───────────────────────────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      tasks = JSON.parse(raw);
      nextId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    } else {
      tasks = DEFAULT_TASKS.map(t => ({ ...t }));
      saveData();
    }
  } catch {
    tasks = [];
  }
}

function saveData() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

function addTask(title) {
  if (!title.trim()) return;
  tasks.unshift({
    id: nextId++,
    title: title.trim(),
    priority: 'low',
    done: false,
    createdAt: new Date().toISOString(),
  });
  saveData();
  renderBoard();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveData();
  renderBoard();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveData();
  renderBoard();
}

function cyclePriority(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const cycle = ['low', 'medium', 'high'];
  task.priority = cycle[(cycle.indexOf(task.priority) + 1) % cycle.length];
  saveData();
  renderBoard();
}

// ─── Rendering ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRIORITY_ICON = {
  high: `<svg class="tpi tpi--high" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  medium: `<svg class="tpi tpi--medium" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  low: `<svg class="tpi tpi--low" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="14" y2="18"/></svg>`,
};

const PRIORITY_LABEL = { high: 'Prioridad Alta', medium: 'Prioridad Media', low: 'Backlog' };
const DONE_LABEL = 'Completadas';

function renderTask(task) {
  const doneClass = task.done ? ' task-row--done' : '';
  const checkIcon = task.done
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`;

  return `
    <div class="task-row${doneClass}" data-id="${task.id}">
      <div class="task-row-left">
        <button class="task-check-btn${task.done ? ' task-check-btn--done' : ''}"
          data-task-toggle="${task.id}" title="${task.done ? 'Reabrir tarea' : 'Marcar como hecha'}">
          ${checkIcon}
        </button>
        <span class="task-title">${escapeHtml(task.title)}</span>
      </div>
      <div class="task-row-right">
        <button class="task-priority-btn task-priority-btn--${task.priority}"
          data-task-priority="${task.id}" title="Cambiar prioridad (${PRIORITY_LABEL[task.priority]})">
          <span class="task-priority-dot"></span>
        </button>
        <button class="task-delete-btn" data-task-delete="${task.id}" title="Eliminar tarea">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>`;
}

function renderGroup(groupTasks, key, label, iconHtml) {
  return `
    <div class="tasks-group">
      <div class="tasks-group-header">
        ${iconHtml}
        <span class="tasks-group-title tasks-group-title--${key}">${label}</span>
        <span class="tasks-group-count">${groupTasks.length}</span>
      </div>
      <div class="tasks-list tasks-list--${key}">
        ${groupTasks.map(renderTask).join('')}
      </div>
    </div>`;
}

const DONE_ICON = `<svg class="tpi tpi--done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

export function renderBoard() {
  const board = document.getElementById('tasksBoard');
  if (!board) return;

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? tasks.filter(t => t.title.toLowerCase().includes(q))
    : tasks;

  const pending = filtered.filter(t => !t.done);
  const done = filtered.filter(t => t.done);

  const groups = [
    { key: 'high', tasks: pending.filter(t => t.priority === 'high'), label: PRIORITY_LABEL.high, icon: PRIORITY_ICON.high },
    { key: 'medium', tasks: pending.filter(t => t.priority === 'medium'), label: PRIORITY_LABEL.medium, icon: PRIORITY_ICON.medium },
    { key: 'low', tasks: pending.filter(t => t.priority === 'low'), label: PRIORITY_LABEL.low, icon: PRIORITY_ICON.low },
    { key: 'done', tasks: done, label: DONE_LABEL, icon: DONE_ICON },
  ];

  const hasContent = groups.some(g => g.tasks.length > 0);

  if (!hasContent) {
    board.innerHTML = `
      <div class="tasks-empty">
        <div class="tasks-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="2"/>
            <line x1="9" y1="12" x2="15" y2="12"/>
            <line x1="9" y1="16" x2="12" y2="16"/>
          </svg>
        </div>
        <p class="tasks-empty-title">Todo despejado</p>
        <p class="tasks-empty-sub">Escribe algo arriba y pulsa <kbd class="tasks-kbd">Enter</kbd> para empezar.</p>
      </div>`;
    return;
  }

  board.innerHTML = groups
    .filter(g => g.tasks.length > 0)
    .map(g => renderGroup(g.tasks, g.key, g.label, g.icon))
    .join('');

  // Event delegation
  board.querySelectorAll('[data-task-toggle]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleTask(parseInt(btn.dataset.taskToggle));
    });
  });

  board.querySelectorAll('[data-task-priority]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      cyclePriority(parseInt(btn.dataset.taskPriority));
    });
  });

  board.querySelectorAll('[data-task-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteTask(parseInt(btn.dataset.taskDelete));
    });
  });
}

// ─── Init ──────────────────────────────────────────────────────────────────

export function initTasks() {
  loadData();
  renderBoard();

  const quickAdd = document.getElementById('tasksQuickAdd');
  const search = document.getElementById('tasksSearch');

  quickAdd?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    addTask(quickAdd.value);
    quickAdd.value = '';
  });

  search?.addEventListener('input', () => {
    searchQuery = search.value;
    renderBoard();
  });

  // Press "/" inside the tasks view to focus quick-add
  document.addEventListener('keydown', e => {
    const view = document.getElementById('view-tareas');
    if (!view || view.classList.contains('hidden')) return;
    if (e.key === '/' && document.activeElement !== quickAdd && document.activeElement !== search) {
      e.preventDefault();
      quickAdd?.focus();
    }
  });
}
