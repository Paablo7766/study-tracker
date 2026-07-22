export const COLORS = ['#f4f4f5', '#34d399', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee'];

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') hex = '#888888';
  const h = hex.replace('#', '');
  if (h.length < 6) return `rgba(136,136,136,${alpha})`;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const MS_PER_DAY = 86400000;

/** Lunes 00:00 local de la semana ISO que contiene `d`. */
export function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Domingo 00:00 local de la semana ISO que contiene `d`. */
export function endOfISOWeek(d) {
  const sunday = startOfWeekMonday(d);
  sunday.setDate(sunday.getDate() + 6);
  return sunday;
}

/** Semanas ISO completas (lunes→domingo) entre dos fechas, ambos inclusive. */
export function countISOWeeksBetween(weekStartMonday, weekEndSunday) {
  return Math.floor((weekEndSunday - weekStartMonday) / (7 * MS_PER_DAY)) + 1;
}

/** Índice de columna (0 = lunes) del día dentro de su semana ISO. */
export function isoWeekdayIndex(d) {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

/** Valor compatible con <input type="datetime-local">. */
export function toLocalDatetimeInputValue(d) {
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
