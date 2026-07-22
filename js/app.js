import { initSidebar, initNavigation } from './ui.js';
import { initStorageUI } from './storage.js';
import { showDashboard, initDashboard, refreshStatsIfVisible } from './dashboard.js';
import { renderSubjectSelects, renderMaterias, initSubjects } from './subjects.js';
import {
  initTimer,
  updateTimerDisplay,
  renderSubjectProgress,
  renderSubjectContext,
  renderCycleTrack,
  updateCycleTrackFill,
  resetTimerFromSettings
} from './timer.js';
import { loadSettingsForm, initSettings } from './settings.js';
import { initStreakModal } from './streak-modal.js';

// ---------- Listeners ----------
initSidebar();
initStreakModal();

initNavigation({
  onShowDashboard: showDashboard,
  onShowMaterias: renderMaterias
});

initSubjects();
initTimer();
initSettings();
initDashboard();

initStorageUI({
  onDataMutated: () => {
    loadSettingsForm();
    renderSubjectSelects();
    renderMaterias();
    resetTimerFromSettings();
    refreshStatsIfVisible();
  }
});

// ---------- Primer paint ----------
renderSubjectSelects();
renderMaterias();
loadSettingsForm();
updateTimerDisplay();
renderSubjectProgress();
renderSubjectContext();
renderCycleTrack();
updateCycleTrackFill();
