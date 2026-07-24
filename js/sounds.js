/** Presets de sonido generados con Web Audio API (sin archivos externos). */
export const SOUND_PRESETS = {
  none: { category: 'minimal', tones: [] },

  'chime-major': {
    category: 'chimes',
    tones: [
      { freq: 523.25, at: 0, dur: 0.55, type: 'sine', vol: 1 },
      { freq: 659.25, at: 0.1, dur: 0.55, type: 'sine', vol: 0.92 },
      { freq: 783.99, at: 0.2, dur: 0.75, type: 'sine', vol: 0.85 }
    ]
  },
  'chime-soft': {
    category: 'chimes',
    tones: [
      { freq: 392.0, at: 0, dur: 0.6, type: 'sine', vol: 0.85 },
      { freq: 523.25, at: 0.14, dur: 0.75, type: 'triangle', vol: 0.75 }
    ]
  },
  'chime-minor': {
    category: 'chimes',
    tones: [
      { freq: 440.0, at: 0, dur: 0.5, type: 'sine', vol: 1 },
      { freq: 523.25, at: 0.1, dur: 0.5, type: 'sine', vol: 0.9 },
      { freq: 659.25, at: 0.2, dur: 0.8, type: 'triangle', vol: 0.8 }
    ]
  },
  'chime-crystal': {
    category: 'chimes',
    tones: [
      { freq: 1046.5, at: 0, dur: 0.35, type: 'sine', vol: 0.7 },
      { freq: 1318.5, at: 0.08, dur: 0.45, type: 'sine', vol: 0.65 },
      { freq: 1568.0, at: 0.16, dur: 0.55, type: 'triangle', vol: 0.6 }
    ]
  },
  'chime-floating': {
    category: 'chimes',
    tones: [
      { freq: 349.23, at: 0, dur: 0.9, type: 'sine', vol: 0.75 },
      { freq: 440.0, at: 0.35, dur: 1.0, type: 'sine', vol: 0.65 },
      { freq: 523.25, at: 0.7, dur: 1.1, type: 'triangle', vol: 0.55 }
    ]
  },

  bell: {
    category: 'bells',
    tones: [{ freq: 660.0, at: 0, dur: 1.2, type: 'sine', vol: 1 }]
  },
  'bell-double': {
    category: 'bells',
    tones: [
      { freq: 659.25, at: 0, dur: 0.9, type: 'sine', vol: 1 },
      { freq: 523.25, at: 0.45, dur: 1.0, type: 'sine', vol: 0.85 }
    ]
  },
  'bell-temple': {
    category: 'bells',
    tones: [
      { freq: 220.0, at: 0, dur: 1.4, type: 'sine', vol: 1 },
      { freq: 329.63, at: 0.08, dur: 1.1, type: 'triangle', vol: 0.5 }
    ]
  },
  'bell-digital': {
    category: 'bells',
    tones: [
      { freq: 880.0, at: 0, dur: 0.15, type: 'square', vol: 0.35 },
      { freq: 880.0, at: 0.22, dur: 0.15, type: 'square', vol: 0.35 },
      { freq: 880.0, at: 0.44, dur: 0.25, type: 'square', vol: 0.4 }
    ]
  },

  'piano-c': {
    category: 'piano',
    tones: [{ freq: 523.25, at: 0, dur: 0.7, type: 'triangle', vol: 1 }]
  },
  'piano-major': {
    category: 'piano',
    tones: [
      { freq: 523.25, at: 0, dur: 0.45, type: 'triangle', vol: 1 },
      { freq: 659.25, at: 0.09, dur: 0.45, type: 'triangle', vol: 0.9 },
      { freq: 783.99, at: 0.18, dur: 0.55, type: 'triangle', vol: 0.85 },
      { freq: 1046.5, at: 0.27, dur: 0.65, type: 'triangle', vol: 0.8 }
    ]
  },
  'piano-glass': {
    category: 'piano',
    tones: [
      { freq: 1174.7, at: 0, dur: 0.5, type: 'sine', vol: 0.8 },
      { freq: 1396.9, at: 0.12, dur: 0.6, type: 'sine', vol: 0.7 }
    ]
  },

  'beep-classic': {
    category: 'digital',
    tones: [{ freq: 880.0, at: 0, dur: 0.18, type: 'square', vol: 0.45 }]
  },
  'beep-soft': {
    category: 'digital',
    tones: [{ freq: 740.0, at: 0, dur: 0.25, type: 'sine', vol: 0.55 }]
  },
  arcade: {
    category: 'digital',
    tones: [
      { freq: 523.25, at: 0, dur: 0.08, type: 'square', vol: 0.35 },
      { freq: 659.25, at: 0.1, dur: 0.08, type: 'square', vol: 0.35 },
      { freq: 783.99, at: 0.2, dur: 0.08, type: 'square', vol: 0.35 },
      { freq: 1046.5, at: 0.3, dur: 0.14, type: 'square', vol: 0.4 }
    ]
  },
  ping: {
    category: 'digital',
    tones: [{ freq: 1200.0, at: 0, dur: 0.12, type: 'sine', vol: 0.65 }]
  },
  success: {
    category: 'digital',
    tones: [
      { freq: 523.25, at: 0, dur: 0.12, type: 'sine', vol: 0.7 },
      { freq: 659.25, at: 0.1, dur: 0.12, type: 'sine', vol: 0.75 },
      { freq: 783.99, at: 0.2, dur: 0.2, type: 'sine', vol: 0.85 }
    ]
  },

  'soft-tick': {
    category: 'minimal',
    tones: [{ freq: 900.0, at: 0, dur: 0.06, type: 'sine', vol: 0.35 }]
  },
  zen: {
    category: 'minimal',
    tones: [
      { freq: 174.61, at: 0, dur: 1.6, type: 'sine', vol: 0.7 },
      { freq: 261.63, at: 0.5, dur: 1.4, type: 'sine', vol: 0.45 }
    ]
  },
  'water-drop': {
    category: 'minimal',
    tones: [
      { freq: 880.0, at: 0, dur: 0.08, type: 'sine', vol: 0.5 },
      { freq: 660.0, at: 0.06, dur: 0.15, type: 'sine', vol: 0.35 },
      { freq: 440.0, at: 0.12, dur: 0.2, type: 'triangle', vol: 0.25 }
    ]
  }
};

export const SOUND_CATEGORIES = ['chimes', 'bells', 'piano', 'digital', 'minimal'];

export const DEFAULT_SOUND_FOCUS = 'chime-major';
export const DEFAULT_SOUND_BREAK = 'chime-soft';
export const DEFAULT_SOUND_LONG_BREAK = 'bell-temple';

function getPresetDuration(preset, speed = 1) {
  if (!preset?.tones?.length) return 0;
  const rate = normalizeSpeed(speed);
  return preset.tones.reduce((max, tone) => Math.max(max, (tone.at + tone.dur) / rate), 0);
}

function normalizeSpeed(speed) {
  const value = Number(speed);
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (value <= 2) return Math.max(0.5, Math.min(2, value));
  return Math.max(0.5, Math.min(2, value / 100));
}

function playPresetOnce(preset, volume, speed = 1) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  const peak = Math.max(0.01, Math.min(1, volume)) * 0.14;
  const rate = normalizeSpeed(speed);

  preset.tones.forEach((tone) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type || 'sine';
    osc.frequency.value = tone.freq;

    const dur = tone.dur / rate;
    const start = now + tone.at / rate;
    const attack = Math.min(0.04, dur * 0.2);
    const release = Math.max(0.08, dur * 0.85);
    const toneVol = peak * (tone.vol ?? 1);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(toneVol, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + attack + release + 0.05);
  });

  const closeAfter = Math.ceil((getPresetDuration(preset, rate) + 0.4 / rate) * 1000);
  setTimeout(() => ctx.close(), closeAfter);
}

export function getSoundPresetDuration(key, { repeat = 1, speed = 1 } = {}) {
  if (!key || key === 'none') return 0;
  const preset = SOUND_PRESETS[key];
  if (!preset?.tones?.length) return 0;
  const rate = normalizeSpeed(speed);
  const times = Math.max(1, Math.min(3, Number(repeat) || 1));
  const single = getPresetDuration(preset, rate);
  const gap = single + 0.25 / rate;
  return Math.ceil((single + (times - 1) * gap + 0.2 / rate) * 1000);
}

export function playSoundPreset(key, { volume = 0.7, repeat = 1, speed = 1 } = {}) {
  if (!key || key === 'none') return;
  const preset = SOUND_PRESETS[key];
  if (!preset?.tones?.length) return;

  const rate = normalizeSpeed(speed);
  const times = Math.max(1, Math.min(3, Number(repeat) || 1));
  const single = getPresetDuration(preset, rate);
  const gap = single + 0.25 / rate;

  for (let i = 0; i < times; i++) {
    setTimeout(() => playPresetOnce(preset, volume, rate), i * gap * 1000);
  }
}

export function populateSoundSelect(selectEl, selectedKey, labelForKey) {
  if (!selectEl) return;
  selectEl.innerHTML = '';

  SOUND_CATEGORIES.forEach((category) => {
    const ids = Object.keys(SOUND_PRESETS).filter((id) => SOUND_PRESETS[id].category === category);
    if (!ids.length) return;

    const group = document.createElement('optgroup');
    group.label = labelForKey(`sound.category.${category}`);
    ids.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = labelForKey(`sound.preset.${id}`);
      group.appendChild(opt);
    });
    selectEl.appendChild(group);
  });

  if (SOUND_PRESETS[selectedKey]) selectEl.value = selectedKey;
  else selectEl.value = DEFAULT_SOUND_FOCUS;
}
