import { initSidebar, initNavigation } from './ui.js';
import { initStorageUI, initStoragePersistence, initCloudSync } from './storage.js';
import { showDashboard, initDashboard, refreshStatsIfVisible } from './dashboard.js';
import { renderSubjectSelects, renderMaterias, initSubjects } from './subjects.js';
import {
  initTimer,
  updateTimerDisplay,
  updateLiveSessionUI,
  renderSubjectProgress,
  renderSubjectContext,
  renderCycleTrack,
  updateCycleTrackFill,
  resetTimerFromSettings
} from './timer.js';
import { loadSettingsForm, initSettings } from './settings.js';
import { initStreakModal } from './streak-modal.js';

async function bootstrap() {
  await initCloudSync();

  initStoragePersistence();
  initSidebar();
  initStreakModal();

  initNavigation({
    onShowDashboard: showDashboard,
    onShowMaterias: renderMaterias,
    onViewChange: () => updateLiveSessionUI()
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

  renderSubjectSelects();
  renderMaterias();
  loadSettingsForm();
  updateTimerDisplay();
  renderSubjectProgress();
  renderSubjectContext();
  renderCycleTrack();
  updateCycleTrackFill();
  updateLiveSessionUI();
}

bootstrap();
