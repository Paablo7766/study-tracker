import { t } from './i18n.js';

export function showToast(message) {
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

const views = ['timer', 'dashboard', 'materias', 'tareas', 'ajustes'];
const MOBILE_NAV_MQ = window.matchMedia('(max-width: 780px)');
const NAV_TRANSITION_MS = 420;

let pillTrackId = null;
let navTransitionTimer = null;

function syncNavAria(activeBtn) {
  document.querySelectorAll('nav button[data-view]').forEach(btn => {
    const isActive = btn === activeBtn;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

export function updateNavPill() {
  const active = document.querySelector('nav button[data-view].active');
  const pill = document.getElementById('navActivePill');
  const links = document.getElementById('navLinks');
  const nav = document.querySelector('nav');
  if (!active || !pill || !links || !nav) return;

  const linksRect = links.getBoundingClientRect();
  const isMobile = MOBILE_NAV_MQ.matches;
  const isCollapsed = nav.classList.contains('collapsed');

  if (isMobile) {
    const activeRect = active.getBoundingClientRect();
    pill.style.setProperty('--pill-x', `${activeRect.left - linksRect.left}px`);
    pill.style.setProperty('--pill-y', `${activeRect.bottom - linksRect.top - 3}px`);
    pill.style.setProperty('--pill-w', `${activeRect.width}px`);
    pill.style.setProperty('--pill-h', '3px');
  } else if (isCollapsed) {
    const icon = active.querySelector('.nav-icon');
    const targetRect = (icon || active).getBoundingClientRect();
    pill.style.setProperty('--pill-x', `${targetRect.left - linksRect.left}px`);
    pill.style.setProperty('--pill-y', `${targetRect.top - linksRect.top}px`);
    pill.style.setProperty('--pill-w', '32px');
    pill.style.setProperty('--pill-h', '32px');
  } else {
    const activeRect = active.getBoundingClientRect();
    pill.style.setProperty('--pill-x', `${activeRect.left - linksRect.left}px`);
    pill.style.setProperty('--pill-y', `${activeRect.top - linksRect.top}px`);
    pill.style.setProperty('--pill-w', `${activeRect.width}px`);
    pill.style.setProperty('--pill-h', `${activeRect.height}px`);
  }

  nav.classList.add('nav-ready');
}

function playViewTransition(section) {
  if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  section.classList.remove('view-entering');
  void section.offsetWidth;
  section.classList.add('view-entering');
  section.addEventListener('animationend', () => section.classList.remove('view-entering'), { once: true });
}

/**
 * Navegación entre vistas.
 * @param {{ onShowDashboard?: () => void, onShowMaterias?: () => void, onViewChange?: (view: string) => void }} [hooks]
 *   Callbacks inyectados desde app.js para evitar imports circulares.
 */
export function initNavigation({ onShowDashboard, onShowMaterias, onViewChange } = {}) {
  const mainEl = document.querySelector('main');

  document.querySelectorAll('nav button[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;

      syncNavAria(btn);
      views.forEach(v => document.getElementById('view-' + v).classList.add('hidden'));
      const view = btn.dataset.view;
      const section = document.getElementById('view-' + view);
      section.classList.remove('hidden');
      playViewTransition(section);

      if (view === 'dashboard') onShowDashboard?.();
      if (view === 'materias') onShowMaterias?.();
      mainEl.scrollTop = 0;
      window.scrollTo(0, 0);

      onViewChange?.(view);
      requestAnimationFrame(updateNavPill);
    });
  });

  const initialActive = document.querySelector('nav button[data-view].active');
  if (initialActive) syncNavAria(initialActive);
  requestAnimationFrame(updateNavPill);
}

/** Cambia de vista simulando el click del botón de nav correspondiente. */
export function navigateTo(view) {
  const btn = document.querySelector(`nav button[data-view="${view}"]`);
  if (btn && !btn.classList.contains('active')) btn.click();
}

export function initSidebar() {
  const navEl = document.querySelector('nav');
  const navToggleBtn = document.getElementById('navToggleBtn');

  function stopPillTracking() {
    if (pillTrackId) cancelAnimationFrame(pillTrackId);
    pillTrackId = null;
  }

  function trackPillFrame() {
    updateNavPill();
    pillTrackId = requestAnimationFrame(trackPillFrame);
  }

  function finishNavTransition() {
    stopPillTracking();
    navEl.classList.remove('nav-transitioning');
    updateNavPill();
  }

  function startNavTransition() {
    stopPillTracking();
    clearTimeout(navTransitionTimer);
    navEl.classList.add('nav-transitioning');

    const onWidthDone = (event) => {
      if (event.propertyName !== 'width') return;
      navEl.removeEventListener('transitionend', onWidthDone);
      clearTimeout(navTransitionTimer);
      finishNavTransition();
    };

    navEl.addEventListener('transitionend', onWidthDone);
    navTransitionTimer = setTimeout(() => {
      navEl.removeEventListener('transitionend', onWidthDone);
      finishNavTransition();
    }, NAV_TRANSITION_MS + 80);

    requestAnimationFrame(() => {
      updateNavPill();
      pillTrackId = requestAnimationFrame(trackPillFrame);
    });
  }

  function applyNavCollapsedState() {
    const collapsed = localStorage.getItem('navCollapsed') === '1';
    navEl.classList.toggle('collapsed', collapsed);
    navToggleBtn?.setAttribute('aria-label', collapsed ? t('nav.expandMenu') : t('nav.collapseMenu'));
    updateNavPill();
  }

  navToggleBtn?.addEventListener('click', () => {
    startNavTransition();
    const collapsed = navEl.classList.toggle('collapsed');
    localStorage.setItem('navCollapsed', collapsed ? '1' : '0');
    navToggleBtn.setAttribute('aria-label', collapsed ? t('nav.expandMenu') : t('nav.collapseMenu'));
  });

  window.addEventListener('resize', updateNavPill);
  MOBILE_NAV_MQ.addEventListener('change', updateNavPill);

  applyNavCollapsedState();
}
