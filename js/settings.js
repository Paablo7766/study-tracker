import { data, saveData } from './storage.js';
import { showToast } from './ui.js';
import { resetTimerFromSettings } from './timer.js';
import { applyLanguage, t } from './i18n.js';
import {
  populateSoundSelect,
  playSoundPreset,
  getSoundPresetDuration,
  SOUND_PRESETS,
  SOUND_CATEGORIES,
  DEFAULT_SOUND_FOCUS,
  DEFAULT_SOUND_BREAK,
  DEFAULT_SOUND_LONG_BREAK
} from './sounds.js';

const SOUND_SLOTS = [
  { selectId: 'soundFocusSelect', nameId: 'soundFocusName', defaultKey: DEFAULT_SOUND_FOCUS },
  { selectId: 'soundBreakSelect', nameId: 'soundBreakName', defaultKey: DEFAULT_SOUND_BREAK },
  { selectId: 'soundLongBreakSelect', nameId: 'soundLongBreakName', defaultKey: DEFAULT_SOUND_LONG_BREAK }
];

let activePickerSelectId = null;
let playingPreviewBtn = null;
let playingPreviewTimer = null;

function getSoundOptionsFromForm() {
  return {
    volume: Number(document.getElementById('soundVolumeInput')?.value ?? 70) / 100,
    speed: Number(document.getElementById('soundSpeedInput')?.value ?? 100),
    repeat: Number(document.getElementById('soundRepeatSelect')?.value ?? 1) || 1
  };
}

function getSelectValue(selectId) {
  const select = document.getElementById(selectId);
  return select?.value || DEFAULT_SOUND_FOCUS;
}

function setSelectValue(selectId, key) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.value = key;
}

function refreshSoundSelects() {
  SOUND_SLOTS.forEach(({ selectId, defaultKey }) => {
    populateSoundSelect(document.getElementById(selectId), data.settings[getSettingKey(selectId)] || defaultKey, t);
  });
}

function getSettingKey(selectId) {
  if (selectId === 'soundFocusSelect') return 'soundFocus';
  if (selectId === 'soundBreakSelect') return 'soundBreak';
  return 'soundLongBreak';
}

function updateSoundSlotNames() {
  SOUND_SLOTS.forEach(({ selectId, nameId, defaultKey }) => {
    const nameEl = document.getElementById(nameId);
    const select = document.getElementById(selectId);
    if (!nameEl || !select) return;
    const key = select.value || defaultKey;
    nameEl.textContent = t(`sound.preset.${key}`);
  });
}

function syncRepeatButtons() {
  const value = document.getElementById('soundRepeatSelect')?.value || '1';
  document.querySelectorAll('.sound-repeat-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === value);
    btn.setAttribute('aria-pressed', btn.dataset.value === value ? 'true' : 'false');
  });
}

function updateSoundVolumeLabel() {
  const input = document.getElementById('soundVolumeInput');
  const label = document.getElementById('soundVolumeValue');
  if (!input || !label) return;
  label.textContent = t('settings.soundVolumeValue', { value: input.value });
}

function syncSoundSettingsVisibility() {
  const enabled = document.getElementById('soundEnabledInput')?.checked;
  document.getElementById('soundSettingsBody')?.classList.toggle('sound-settings-body--disabled', !enabled);
}

function syncNotifySettingsVisibility() {
  const master = document.getElementById('notifyOnFinishInput')?.checked;
  document.getElementById('notifyOnFocusFinishInput')?.toggleAttribute('disabled', !master);
  document.getElementById('notifyOnBreakFinishInput')?.toggleAttribute('disabled', !master);
  document.getElementById('notifyOnFocusFinishInput')?.closest('.field-toggle')
    ?.classList.toggle('field-toggle--dimmed', !master);
  document.getElementById('notifyOnBreakFinishInput')?.closest('.field-toggle')
    ?.classList.toggle('field-toggle--dimmed', !master);
}

function clearPlayingPreview() {
  if (playingPreviewTimer) clearTimeout(playingPreviewTimer);
  playingPreviewTimer = null;
  playingPreviewBtn?.classList.remove('is-playing', 'is-previewing');
  playingPreviewBtn = null;
}

function setPlayingPreview(btn, key) {
  clearPlayingPreview();
  if (!btn) return;
  btn.classList.add('is-playing');
  playingPreviewBtn = btn;
  playingPreviewTimer = setTimeout(() => {
    btn.classList.remove('is-playing');
    if (playingPreviewBtn === btn) playingPreviewBtn = null;
    playingPreviewTimer = null;
  }, Math.max(400, getSoundPresetDuration(key, getSoundOptionsFromForm())));
}

function updateSoundSpeedLabel() {
  const input = document.getElementById('soundSpeedInput');
  const label = document.getElementById('soundSpeedValue');
  if (!input || !label) return;
  label.textContent = t('settings.soundSpeedValue', { value: input.value });
}

function setPickerPreview(item, key) {
  clearPlayingPreview();
  if (!item) return;
  item.classList.add('is-previewing');
  playingPreviewBtn = item;
  playingPreviewTimer = setTimeout(() => {
    item.classList.remove('is-previewing');
    if (playingPreviewBtn === item) playingPreviewBtn = null;
    playingPreviewTimer = null;
  }, Math.max(400, getSoundPresetDuration(key, getSoundOptionsFromForm())));
}

function previewSound(selectId, playBtn) {
  const key = getSelectValue(selectId);
  playSoundPreset(key, getSoundOptionsFromForm());
  setPlayingPreview(playBtn, key);
}

function renderSoundPickerList(selectId) {
  const list = document.getElementById('soundPickerList');
  if (!list) return;
  const current = getSelectValue(selectId);
  list.innerHTML = '';

  SOUND_CATEGORIES.forEach((category) => {
    const ids = Object.keys(SOUND_PRESETS).filter((id) => SOUND_PRESETS[id].category === category);
    if (!ids.length) return;

    const section = document.createElement('div');
    section.className = 'sound-picker-section';

    const heading = document.createElement('p');
    heading.className = 'sound-picker-section-title';
    heading.textContent = t(`sound.category.${category}`);
    section.appendChild(heading);

    ids.forEach((id) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sound-picker-item';
      btn.dataset.id = id;
      if (id === current) btn.classList.add('is-selected');

      btn.innerHTML = `
        <span class="sound-picker-item-main">
          <span class="sound-picker-item-name">${t(`sound.preset.${id}`)}</span>
          ${id === current ? `<span class="sound-picker-item-badge">${t('settings.soundSelected')}</span>` : ''}
        </span>
        <span class="sound-picker-item-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      `;

      btn.addEventListener('click', () => {
        setSelectValue(selectId, id);
        updateSoundSlotNames();
        list.querySelectorAll('.sound-picker-item').forEach((item) => {
          const selected = item.dataset.id === id;
          item.classList.toggle('is-selected', selected);
          const badge = item.querySelector('.sound-picker-item-badge');
          if (selected && !badge) {
            item.querySelector('.sound-picker-item-main')?.insertAdjacentHTML(
              'beforeend',
              `<span class="sound-picker-item-badge">${t('settings.soundSelected')}</span>`
            );
          } else if (!selected && badge) {
            badge.remove();
          }
        });
        playSoundPreset(id, getSoundOptionsFromForm());
        setPickerPreview(btn, id);
      });

      section.appendChild(btn);
    });

    list.appendChild(section);
  });
}

function openSoundPicker(selectId) {
  activePickerSelectId = selectId;
  const panel = document.getElementById('soundPickerPanel');
  const card = document.getElementById('soundsSettingsCard');
  if (!panel || !card) return;

  document.getElementById('soundPickerTitle').textContent = t('settings.soundPickerTitle');
  renderSoundPickerList(selectId);
  panel.classList.remove('hidden');
  card.classList.add('sound-picker-open');
  document.getElementById('soundPickerClose')?.focus();
}

function closeSoundPicker() {
  activePickerSelectId = null;
  document.getElementById('soundPickerPanel')?.classList.add('hidden');
  document.getElementById('soundsSettingsCard')?.classList.remove('sound-picker-open');
  clearPlayingPreview();
}

export function loadSettingsForm() {
  document.getElementById('focusMinInput').value = data.settings.focusMin;
  document.getElementById('breakMinInput').value = data.settings.breakMin;
  document.getElementById('longBreakMinInput').value = data.settings.longBreakMin;
  document.getElementById('cyclesInput').value = data.settings.cyclesBeforeLongBreak;
  document.getElementById('dailyGoalInput').value = data.settings.dailyGoal || 4;
  document.getElementById('autoStartBreakInput').checked = !!data.settings.autoStartBreak;
  document.getElementById('notifyOnFinishInput').checked = !!data.settings.notifyOnFinish;
  document.getElementById('notifyOnFocusFinishInput').checked = data.settings.notifyOnFocusFinish !== false;
  document.getElementById('notifyOnBreakFinishInput').checked = data.settings.notifyOnBreakFinish !== false;
  document.getElementById('soundEnabledInput').checked = data.settings.soundEnabled !== false;
  document.getElementById('soundVolumeInput').value = data.settings.soundVolume ?? 70;
  document.getElementById('soundSpeedInput').value = data.settings.soundSpeed ?? 100;
  document.getElementById('soundRepeatSelect').value = String(data.settings.soundRepeat ?? 1);

  refreshSoundSelects();
  document.getElementById('soundFocusSelect').value = data.settings.soundFocus || DEFAULT_SOUND_FOCUS;
  document.getElementById('soundBreakSelect').value = data.settings.soundBreak || DEFAULT_SOUND_BREAK;
  document.getElementById('soundLongBreakSelect').value = data.settings.soundLongBreak || DEFAULT_SOUND_LONG_BREAK;

  const langSelect = document.getElementById('languageSelect');
  if (langSelect) langSelect.value = data.settings.language === 'en' ? 'en' : 'es';

  updateSoundVolumeLabel();
  updateSoundSpeedLabel();
  updateSoundSlotNames();
  syncRepeatButtons();
  syncSoundSettingsVisibility();
  syncNotifySettingsVisibility();
  if (activePickerSelectId) renderSoundPickerList(activePickerSelectId);
}

export function initSettings() {
  document.getElementById('languageSelect')?.addEventListener('change', (e) => {
    data.settings.language = e.target.value === 'en' ? 'en' : 'es';
    applyLanguage(data.settings.language);
    refreshSoundSelects();
    updateSoundSlotNames();
    if (activePickerSelectId) renderSoundPickerList(activePickerSelectId);
    saveData();
  });

  document.getElementById('soundEnabledInput')?.addEventListener('change', syncSoundSettingsVisibility);
  document.getElementById('soundVolumeInput')?.addEventListener('input', updateSoundVolumeLabel);
  document.getElementById('soundSpeedInput')?.addEventListener('input', updateSoundSpeedLabel);
  document.getElementById('notifyOnFinishInput')?.addEventListener('change', syncNotifySettingsVisibility);

  document.querySelectorAll('.sound-slot-play').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      previewSound(btn.dataset.select, btn);
    });
  });

  document.querySelectorAll('.sound-slot-trigger').forEach((btn) => {
    btn.addEventListener('click', () => openSoundPicker(btn.dataset.select));
  });

  document.getElementById('soundPickerClose')?.addEventListener('click', closeSoundPicker);

  document.getElementById('soundRepeatGroup')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sound-repeat-btn');
    if (!btn) return;
    document.getElementById('soundRepeatSelect').value = btn.dataset.value;
    syncRepeatButtons();
  });

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('soundPickerPanel');
    const card = document.getElementById('soundsSettingsCard');
    if (!panel || panel.classList.contains('hidden')) return;
    if (card?.contains(e.target)) return;
    closeSoundPicker();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSoundPicker();
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    data.settings.focusMin = Number(document.getElementById('focusMinInput').value) || 25;
    data.settings.breakMin = Number(document.getElementById('breakMinInput').value) || 5;
    data.settings.longBreakMin = Number(document.getElementById('longBreakMinInput').value) || 15;
    data.settings.cyclesBeforeLongBreak = Math.max(1, Number(document.getElementById('cyclesInput').value) || 4);
    data.settings.dailyGoal = Number(document.getElementById('dailyGoalInput').value) || 4;
    data.settings.autoStartBreak = document.getElementById('autoStartBreakInput').checked;
    data.settings.notifyOnFinish = document.getElementById('notifyOnFinishInput').checked;
    data.settings.notifyOnFocusFinish = document.getElementById('notifyOnFocusFinishInput').checked;
    data.settings.notifyOnBreakFinish = document.getElementById('notifyOnBreakFinishInput').checked;
    data.settings.soundEnabled = document.getElementById('soundEnabledInput').checked;
    data.settings.soundVolume = Number(document.getElementById('soundVolumeInput').value);
    data.settings.soundSpeed = Math.max(50, Math.min(200, Number(document.getElementById('soundSpeedInput').value) || 100));
    data.settings.soundFocus = document.getElementById('soundFocusSelect').value || DEFAULT_SOUND_FOCUS;
    data.settings.soundBreak = document.getElementById('soundBreakSelect').value || DEFAULT_SOUND_BREAK;
    data.settings.soundLongBreak = document.getElementById('soundLongBreakSelect').value || DEFAULT_SOUND_LONG_BREAK;
    data.settings.soundRepeat = Math.max(1, Math.min(3, Number(document.getElementById('soundRepeatSelect').value) || 1));
    data.settings.language = document.getElementById('languageSelect')?.value === 'en' ? 'en' : 'es';
    applyLanguage(data.settings.language);
    saveData();

    closeSoundPicker();
    resetTimerFromSettings();
    showToast(t('settings.saved'));
  });

  document.getElementById('notifyOnFinishInput').addEventListener('change', (e) => {
    if (e.target.checked && 'Notification' in window) {
      if (Notification.permission === 'granted') return;
      Notification.requestPermission().then(permission => {
        if (permission !== 'granted') e.target.checked = false;
        syncNotifySettingsVisibility();
      });
    }
  });
}
