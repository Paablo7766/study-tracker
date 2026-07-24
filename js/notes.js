import { t, getDateLocale } from './i18n.js';

const NOTES_KEY = 'st_study_notes';
const SHORT_NOTE_WORDS = 12;
const SHORT_NOTE_CHARS = 80;
const MAX_TITLE_LEN = 42;

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'y', 'o', 'a',
  'que', 'para', 'con', 'por', 'su', 'sus', 'se', 'es', 'son', 'me', 'te', 'lo', 'le', 'como',
  'más', 'mas', 'muy', 'ya', 'si', 'sí', 'no', 'the', 'and', 'or', 'to', 'of', 'in', 'for', 'is',
]);

const DEFAULT_NOTES = [
  {
    id: 1,
    title: 'Fórmulas Clave - Módulo 4',
    content: 'Recordar revisar la fórmula de WACC. \nWACC = (E/V x Re) + ((D/V x Rd) x (1 - T)).\n\nEl profesor mencionó que esto suele caer en el test final.',
    date: '24 Jul 2026',
    pinned: true,
  },
  {
    id: 2,
    title: 'Ideas para refactorizar el Dashboard',
    content: '1. Mover la lógica del gráfico a un custom hook.\n2. Optimizar el re-renderizado del temporizador.\n3. Añadir animaciones a las tarjetas de Materias.',
    date: '23 Jul 2026',
    pinned: false,
  },
  {
    id: 3,
    title: '',
    content: 'Comprar café para las sesiones de estudio nocturnas ☕️',
    date: '22 Jul 2026',
    pinned: false,
  },
  {
    id: 4,
    title: 'Set vs Array',
    content: '¿Cuándo es estrictamente mejor usar un Set sobre un Array en JavaScript para buscar elementos únicos? Buscar benchmarks de rendimiento.',
    date: '20 Jul 2026',
    pinned: true,
  },
];

let notes = [];
let nextId = 5;
let searchQuery = '';
let editingNoteId = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNoteDate(date = new Date()) {
  return date.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function cleanLine(line) {
  return line
    .replace(/^[-*•→▪]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^#+\s+/, '')
    .trim();
}

function truncateAtWord(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen).replace(/\s+\S*$/, '').trim();
  return cut ? `${cut}…` : `${text.slice(0, maxLen)}…`;
}

function capitalizeTitle(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function extractKeywords(text, maxWords = 4) {
  return text
    .replace(/[.!?…,:;()"[\]]+/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, maxWords);
}

function isShortNote(content) {
  const flat = content.replace(/\s+/g, ' ').trim();
  const lines = content.split('\n').map(cleanLine).filter(Boolean);
  const wordCount = flat.split(/\s+/).filter(Boolean).length;
  return wordCount <= SHORT_NOTE_WORDS && flat.length <= SHORT_NOTE_CHARS && lines.length <= 2;
}

export function computeTitle(content) {
  const text = content.trim();
  if (!text || isShortNote(text)) return '';

  const lines = text.split('\n').map(cleanLine).filter(Boolean);
  const flat = text.replace(/\s+/g, ' ').trim();

  if (lines.length >= 2) {
    const keywords = extractKeywords(lines[0], 3);
    if (keywords.length >= 2) return capitalizeTitle(truncateAtWord(keywords.join(' '), MAX_TITLE_LEN));
    return capitalizeTitle(truncateAtWord(cleanLine(lines[0]), MAX_TITLE_LEN));
  }

  const keywords = extractKeywords(flat, 4);
  if (keywords.length >= 2) {
    return capitalizeTitle(truncateAtWord(keywords.join(' '), MAX_TITLE_LEN));
  }

  const sentence = flat.match(/^[^.!?…]+[.!?]?/)?.[0]?.trim() || flat;
  return capitalizeTitle(truncateAtWord(sentence, MAX_TITLE_LEN));
}

function normalizeNote(note) {
  const content = (note.content || '').trim();
  let title = (note.title || '').trim();

  if (!content && title) {
    return { ...note, content: title, title: '' };
  }

  if (!title || title === content || isShortNote(content)) {
    title = computeTitle(content);
  }

  return { ...note, content, title };
}

function noteShowsTitle(note) {
  const title = (note.title || '').trim();
  const content = (note.content || '').trim();
  if (!title || !content) return false;
  if (title === content) return false;
  return title.length < content.length * 0.85;
}

function getNoteAriaLabel(note) {
  return noteShowsTitle(note) ? note.title : (note.content || note.title || t('notes.title'));
}

function loadData() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      notes = JSON.parse(raw).map(({ category, ...note }) => normalizeNote(note));
      nextId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
      saveData();
    } else {
      notes = DEFAULT_NOTES.map(n => normalizeNote({ ...n }));
      saveData();
    }
  } catch {
    notes = [];
    nextId = 1;
  }
}

function saveData() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function getFilteredNotes() {
  const q = searchQuery.toLowerCase();
  if (!q) return notes;
  return notes.filter(note =>
    (note.title || '').toLowerCase().includes(q) ||
    note.content.toLowerCase().includes(q)
  );
}

const PIN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 0 0-6 0z"/></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

function renderNoteCard(note, index = 0) {
  const compact = !noteShowsTitle(note);
  const bodyHtml = compact
    ? `<p class="note-card-text">${escapeHtml(note.content)}</p>`
    : `<h3 class="note-card-title">${escapeHtml(note.title)}</h3>
       <p class="note-card-content">${escapeHtml(note.content)}</p>`;
  const delay = Math.min(index * 40, 320);

  return `
    <article class="note-card${compact ? ' note-card--compact' : ''}${note.pinned ? ' note-card--pinned' : ''}" data-note-id="${note.id}" tabindex="0" role="button" aria-label="${escapeHtml(getNoteAriaLabel(note))}" style="animation-delay:${delay}ms">
      <div class="note-card-glow" aria-hidden="true"></div>
      <div class="note-card-inner">
        <div class="note-card-head">
          <button type="button" class="note-pin-btn${note.pinned ? ' note-pin-btn--active' : ''}" data-note-pin="${note.id}" aria-pressed="${note.pinned}" aria-label="${note.pinned ? t('notes.pinned') : t('notes.pin')}">
            ${PIN_ICON}
          </button>
        </div>
        <div class="note-card-body">
          ${bodyHtml}
        </div>
        <div class="note-card-foot">
          <span class="note-card-date">${escapeHtml(note.date)}</span>
          <button type="button" class="note-delete-btn" data-note-delete="${note.id}" aria-label="${t('notes.delete')}">
            ${TRASH_ICON}
          </button>
        </div>
      </div>
    </article>`;
}

function renderNotesGrid(items) {
  if (!items.length) return '';
  return `<div class="notes-grid">${items.map((n, i) => renderNoteCard(n, i)).join('')}</div>`;
}

export function renderNotes() {
  const board = document.getElementById('notesBoard');
  if (!board) return;

  const filtered = getFilteredNotes();
  const pinned = filtered.filter(n => n.pinned);
  const other = filtered.filter(n => !n.pinned);

  if (!filtered.length) {
    board.innerHTML = `
      <div class="notes-empty">
        <p>${t('notes.empty')}</p>
      </div>`;
  } else {
    board.innerHTML = `
      ${pinned.length ? `
        <section class="notes-section">
          <h2 class="notes-section-title">
            ${PIN_ICON}
            ${t('notes.pinnedSection')}
          </h2>
          ${renderNotesGrid(pinned)}
        </section>` : ''}
      ${other.length ? `
        <section class="notes-section">
          ${pinned.length ? `<h2 class="notes-section-title">${t('notes.otherSection')}</h2>` : ''}
          ${renderNotesGrid(other)}
        </section>` : ''}`;
  }

  bindBoardEvents(board);
}

function bindBoardEvents(board) {
  board.querySelectorAll('.note-card').forEach(card => {
    const open = () => openNoteModal(parseInt(card.dataset.noteId, 10));
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', `${mx}%`);
      card.style.setProperty('--my', `${my}%`);
    });
  });

  board.querySelectorAll('[data-note-pin]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      togglePin(parseInt(btn.dataset.notePin, 10));
    });
  });

  board.querySelectorAll('[data-note-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteNote(parseInt(btn.dataset.noteDelete, 10));
    });
  });
}

function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  saveData();
  renderNotes();
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveData();
  renderNotes();
}

function openNoteModal(id = null) {
  const modal = document.getElementById('noteModal');
  const contentInput = document.getElementById('noteContentInput');
  const editedLabel = document.getElementById('noteEditedLabel');
  if (!modal || !contentInput || !editedLabel) return;

  editingNoteId = id;
  const note = id != null ? notes.find(n => n.id === id) : null;

  contentInput.value = note?.content || '';

  editedLabel.textContent = note
    ? t('notes.lastEdited', { date: note.date })
    : t('notes.lastEditedNow');

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => contentInput.focus());
}

function closeNoteModal() {
  const modal = document.getElementById('noteModal');
  modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  editingNoteId = null;
}

function saveNoteFromModal() {
  const contentInput = document.getElementById('noteContentInput');
  if (!contentInput) return;

  const content = contentInput.value.trim();
  if (!content) return;

  const title = computeTitle(content);
  const date = formatNoteDate();

  if (editingNoteId != null) {
    const note = notes.find(n => n.id === editingNoteId);
    if (note) {
      note.title = title;
      note.content = content;
      note.date = date;
    }
  } else {
    notes.unshift({
      id: nextId++,
      title,
      content,
      date,
      pinned: false,
    });
  }

  saveData();
  closeNoteModal();
  renderNotes();
}

export function initNotes() {
  loadData();
  renderNotes();

  document.getElementById('notesSearch')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderNotes();
  });

  document.getElementById('notesNewBtn')?.addEventListener('click', () => openNoteModal());

  document.getElementById('noteModalCloseBtn')?.addEventListener('click', closeNoteModal);
  document.getElementById('noteModalCancelBtn')?.addEventListener('click', closeNoteModal);
  document.getElementById('noteModalSaveBtn')?.addEventListener('click', saveNoteFromModal);

  document.getElementById('noteModal')?.addEventListener('click', e => {
    if (e.target.id === 'noteModal') closeNoteModal();
  });

  document.addEventListener('keydown', e => {
    const modal = document.getElementById('noteModal');
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeNoteModal();
    }
  });
}

export function refreshNotesIfVisible() {
  const view = document.getElementById('view-notas');
  if (view && !view.classList.contains('hidden')) renderNotes();
}
