import { initSidebar, initNavigation } from './ui.js';
import { initStorageUI, initStoragePersistence, initCloudSync, data } from './storage.js';
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
  refreshCycleTrackControls,
  refreshTimerLabels,
  resetTimerFromSettings
} from './timer.js';
import { loadSettingsForm, initSettings } from './settings.js';
import { initStreakModal } from './streak-modal.js';
import { initI18n, applyLanguage } from './i18n.js';
import { initNotes, refreshNotesIfVisible, renderNotes } from './notes.js';

function refreshUIAfterLanguageChange() {
  loadSettingsForm();
  renderSubjectSelects();
  renderMaterias();
  refreshStatsIfVisible();
  refreshNotesIfVisible();
  updateTimerDisplay();
  renderSubjectProgress();
  renderSubjectContext();
  updateCycleTrackFill();
  refreshCycleTrackControls();
  updateLiveSessionUI();
  refreshTimerLabels();
}

async function bootstrap() {
  initStorageUI({
    onDataMutated: () => {
      loadSettingsForm();
      renderSubjectSelects();
      renderMaterias();
      resetTimerFromSettings();
      refreshStatsIfVisible();
      refreshNotesIfVisible();
    }
  });

  await initCloudSync();

  initStoragePersistence();
  initI18n({ onRefresh: refreshUIAfterLanguageChange });
  applyLanguage(data.settings.language === 'en' ? 'en' : 'es');

  initSidebar();
  initStreakModal();

  initNavigation({
    onShowDashboard: showDashboard,
    onShowMaterias: renderMaterias,
    onShowNotes: () => renderNotes(),
    onViewChange: () => updateLiveSessionUI()
  });

  initSubjects();
  initTimer();
  initSettings();
  initNotes();
  initDashboard();

  renderSubjectSelects();
  renderMaterias();
  loadSettingsForm();
  updateTimerDisplay();
  renderSubjectProgress();
  renderSubjectContext();
  renderCycleTrack();
  updateCycleTrackFill();
  refreshCycleTrackControls();
  updateLiveSessionUI();
}

bootstrap();
