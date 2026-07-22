import { data, saveData } from './storage.js';
import { showToast } from './ui.js';
import { resetTimerFromSettings } from './timer.js';

export function loadSettingsForm() {
  document.getElementById('focusMinInput').value = data.settings.focusMin;
  document.getElementById('breakMinInput').value = data.settings.breakMin;
  document.getElementById('longBreakMinInput').value = data.settings.longBreakMin;
  document.getElementById('cyclesInput').value = data.settings.cyclesBeforeLongBreak;
  document.getElementById('dailyGoalInput').value = data.settings.dailyGoal || 4;
  document.getElementById('autoStartBreakInput').checked = !!data.settings.autoStartBreak;
  document.getElementById('notifyOnFinishInput').checked = !!data.settings.notifyOnFinish;
}

export function initSettings() {
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    data.settings.focusMin = Number(document.getElementById('focusMinInput').value) || 25;
    data.settings.breakMin = Number(document.getElementById('breakMinInput').value) || 5;
    data.settings.longBreakMin = Number(document.getElementById('longBreakMinInput').value) || 15;
    data.settings.cyclesBeforeLongBreak = Math.max(1, Number(document.getElementById('cyclesInput').value) || 4);
    data.settings.dailyGoal = Number(document.getElementById('dailyGoalInput').value) || 4;
    data.settings.autoStartBreak = document.getElementById('autoStartBreakInput').checked;
    data.settings.notifyOnFinish = document.getElementById('notifyOnFinishInput').checked;
    saveData();

    // El timer lee data.settings y actualiza su estado interno vía API pública
    resetTimerFromSettings();
    showToast('Ajustes guardados');
  });

  // Permiso de notificaciones solo al activar el toggle (nunca al cargar).
  document.getElementById('notifyOnFinishInput').addEventListener('change', (e) => {
    if (e.target.checked && 'Notification' in window) {
      if (Notification.permission === 'granted') return;
      Notification.requestPermission().then(permission => {
        if (permission !== 'granted') e.target.checked = false;
      });
    }
  });
}
