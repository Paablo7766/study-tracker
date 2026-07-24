import { data, ensureStatsFresh } from './storage.js';
import { startOfWeekMonday, endOfISOWeek, countISOWeeksBetween } from './utils.js';
import { navigateTo } from './ui.js';
import { openStreakModal } from './streak-modal.js';
import { openSessionModal, removeSessionWithUndo } from './sessions.js';
import { t, getDateLocale, getWeekdayLabelsShort, getWeekdayLabelsFull } from './i18n.js';

let weekOffset = 0;
let weekChartViewStart = null; // 0 = semana actual; navegable hacia atrás, nunca hacia el futuro
let weekCompareMode = false;
let heatmapPage = 0;
let heatmapListenersAttached = false;
let phMode = 'historic';
let diaDoradoResult = null;
let subjectMixResult = null;
let currentSubjectFilter = null;
let dayDetailContext = null;

function getFilteredSessions() {
  const sessions = data.sessions || [];
  if (!currentSubjectFilter) return sessions;
  return sessions.filter(s => s.subjectId === currentSubjectFilter);
}

function getSubjectFilterName() {
  if (!currentSubjectFilter) return null;
  return data.subjects.find(s => s.id === currentSubjectFilter)?.name || t('subject.defaultName');
}

function toggleSubjectFilter(subjectId) {
  currentSubjectFilter = currentSubjectFilter === subjectId ? null : subjectId;
  renderDashboard();
}

function updateSubjectFilterIndicator() {
  const badge = document.getElementById('dashSubjectFilterBadge');
  const filterName = getSubjectFilterName();
  ['weekChartCard', 'heatmapCard', 'peakHoursCard'].forEach(id => {
    document.getElementById(id)?.classList.toggle('dash-card-filtered', !!currentSubjectFilter);
  });
  document.getElementById('subjectMixCard')?.classList.toggle('sm-filter-active', !!currentSubjectFilter);
  if (badge) {
    if (currentSubjectFilter && filterName) {
      badge.textContent = t('dash.filteredBy', { name: filterName });
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

const HEATMAP_CELL = 16;
const HEATMAP_GAP = 4;
const HEATMAP_COL_W = HEATMAP_CELL + HEATMAP_GAP;
const HEATMAP_DAY_LABELS_W = 36;

/** Semana concreta; si hay filtro de materia, siempre recalcula desde sesiones filtradas. */
function computeWeekDayTotals(weekStart, sessions = data.sessions) {
  const dayTotals = new Array(7).fill(0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  for (const s of sessions) {
    const dt = new Date(s.startTime);
    if (dt < weekStart || dt >= weekEnd) continue;
    const diffDays = Math.floor((dt - weekStart) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) dayTotals[diffDays] += s.durationMin;
  }
  return dayTotals;
}

export function renderDashboard({ animateCharts = false } = {}) {
  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

  const emptyWrap = document.getElementById('dashEmptyWrap');
  const contentWrap = document.getElementById('dashContentWrap');
  const hasSubjects = data.subjects.length > 0;

  ensureStatsFresh();
  const stats = data.stats;
  const hasSessions = stats.totalSessions > 0;

  if (!hasSubjects) {
    emptyWrap.classList.remove('hidden');
    contentWrap.classList.add('hidden');
    return;
  }

  emptyWrap.classList.add('hidden');
  contentWrap.classList.remove('hidden');

  if (currentSubjectFilter && !data.subjects.some(s => s.id === currentSubjectFilter)) {
    currentSubjectFilter = null;
  }

  const filteredSessions = getFilteredSessions();
  const now = new Date();
  const currentWeekStart = startOfWeekMonday(now);

  const viewedWeekStart = new Date(currentWeekStart);
  viewedWeekStart.setDate(viewedWeekStart.getDate() + weekOffset * 7);
  const viewedWeekEnd = new Date(viewedWeekStart);
  viewedWeekEnd.setDate(viewedWeekEnd.getDate() + 7);

  const weekRangeLabel = document.getElementById('weekRangeLabel');
  if (weekRangeLabel) {
    if (weekOffset === 0) {
      weekRangeLabel.textContent = t('dash.thisWeek');
    } else if (weekOffset === -1) {
      weekRangeLabel.textContent = t('dash.lastWeek');
    } else {
      const endLabel = new Date(viewedWeekEnd);
      endLabel.setDate(endLabel.getDate() - 1);
      weekRangeLabel.textContent = `${viewedWeekStart.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' })} – ${endLabel.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' })}`;
    }
  }
  const weekNextBtn = document.getElementById('weekNextBtn');
  if (weekNextBtn) weekNextBtn.disabled = weekOffset >= 0;

  // Hero: siempre semana REAL actual (desde stats, O(1)).
  const totalWeekMin = stats.weekMinutes;
  document.getElementById('statWeekHours').textContent = (totalWeekMin / 60).toFixed(1) + 'h';

  const prevWeekMin = stats.prevWeekMinutes;
  const deltaEl = document.getElementById('statWeekDelta');
  if (prevWeekMin === 0 && totalWeekMin === 0) {
    deltaEl.textContent = '—';
    deltaEl.className = 'stat-delta';
    deltaEl.style.color = 'var(--text-dim)';
  } else {
    const pct = prevWeekMin === 0 ? 100 : Math.round(((totalWeekMin - prevWeekMin) / prevWeekMin) * 100);
    deltaEl.textContent = t('dash.vsLastWeek', { sign: pct >= 0 ? '↑' : '↓', pct: Math.abs(pct) });
    deltaEl.className = 'stat-delta ' + (pct >= 0 ? 'up' : 'down');
  }

  document.getElementById('statStreak').textContent = stats.currentStreak;
  document.getElementById('statStreakBest').textContent = stats.bestStreak;
  document.getElementById('streakCardBtn')?.classList.toggle('hero-mini--streak-active', stats.currentStreak > 0);
  document.getElementById('statTotalHours').textContent = (stats.totalMinutes / 60).toFixed(1) + 'h';
  document.getElementById('statSessions').textContent = stats.totalSessions;

  renderWeekChart(getWeekChartPayload(filteredSessions, stats), { animate: animateCharts });

  renderHeatmap();
  renderDiaDorado();
  renderSubjectMix();
  renderPeakHours({ animate: animateCharts });
  updateSubjectFilterIndicator();
  syncWeekCompareToggle();
  syncBottomRowHeights();
}

function getWeekChartPayload(filteredSessions, stats) {
  const dayLabels = getWeekdayLabelsShort();
  const now = new Date();
  const currentWeekStart = startOfWeekMonday(now);
  const viewedWeekStart = new Date(currentWeekStart);
  viewedWeekStart.setDate(viewedWeekStart.getDate() + weekOffset * 7);

  const dayTotals = weekOffset === 0 && !currentSubjectFilter
    ? [...stats.weekDayTotals]
    : computeWeekDayTotals(viewedWeekStart, filteredSessions);

  const prevWeekStart = new Date(viewedWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevDayTotals = weekCompareMode
    ? computeWeekDayTotals(prevWeekStart, filteredSessions)
    : null;

  return {
    wrap: document.getElementById('weekChartWrap'),
    dayTotals,
    viewedWeekStart,
    dayLabels,
    compareMode: weekCompareMode,
    prevDayTotals
  };
}

function syncBottomRowHeights() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const weekCard = document.getElementById('weekChartCard');
      const heatmapCard = document.getElementById('heatmapCard');
      const bottomCards = [
        document.getElementById('diaDoradoCard'),
        document.getElementById('subjectMixCard'),
        document.getElementById('peakHoursCard')
      ];
      const dashView = document.getElementById('view-dashboard');
      if (!weekCard || !dashView || dashView.classList.contains('hidden')) return;

      bottomCards.forEach(card => {
        if (card) card.style.height = 'auto';
      });

      if (window.innerWidth <= 780) return;

      const refHeight = Math.max(
        weekCard.offsetHeight,
        heatmapCard?.offsetHeight || 0
      );
      if (refHeight <= 0) return;

      bottomCards.forEach(card => {
        if (card) card.style.height = `${refHeight}px`;
      });
    });
  });
}

/** Resetea a la semana actual y pinta el dashboard (usado al entrar a la vista). */
export function showDashboard() {
  weekOffset = 0;
  renderDashboard({ animateCharts: true });
}

export function refreshStatsIfVisible() {
  const dashView = document.getElementById('view-dashboard');
  if (dashView && !dashView.classList.contains('hidden')) {
    renderDashboard();
  }
}

/** Primera sesión del día: celebra la racha ya actualizada en data.stats. */
export function showStreakCelebration() {
  openStreakModal({ mode: 'celebrate' });
}

function openDayDetail(weekStart, dayIndex) {
  const weekStartCopy = new Date(weekStart);
  weekStartCopy.setHours(0, 0, 0, 0);
  dayDetailContext = { weekStart: weekStartCopy, dayIndex };

  const dayStart = new Date(weekStartCopy);
  dayStart.setDate(dayStart.getDate() + dayIndex);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Drill-down: necesita las sesiones individuales del día (no hay agregación alternativa).
  const daySessions = data.sessions
    .filter(s => {
      const dt = new Date(s.startTime);
      return dt >= dayStart && dt < dayEnd;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const totalMin = daySessions.reduce((a, b) => a + b.durationMin, 0);
  const avgMin = daySessions.length ? Math.round(totalMin / daySessions.length) : 0;

  const fmt = (m) => {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  };

  document.getElementById('dayDetailTitle').textContent = dayStart.toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('dayDetailHeroTime').textContent = fmt(totalMin);
  document.getElementById('dayDetailCount').textContent = daySessions.length;
  document.getElementById('dayDetailAvg').textContent = fmt(avgMin);

  const rangeEl = document.getElementById('dayDetailRange');
  if (daySessions.length > 0) {
    const first = new Date(daySessions[0].startTime).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' });
    const last = new Date(daySessions[daySessions.length - 1].startTime).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' });
    rangeEl.textContent = `${first} – ${last}`;
  } else {
    rangeEl.textContent = '';
  }

  const timelineEl = document.getElementById('dayDetailTimeline');
  if (daySessions.length === 0) {
    timelineEl.innerHTML = `
      <div class="day-detail-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
        <p>${t('dash.noSessionsDay')}</p>
        <button type="button" class="btn btn-secondary day-detail-add-btn" id="dayDetailAddEmptyBtn">${t('dash.addSession')}</button>
      </div>`;
  } else {
    timelineEl.innerHTML = daySessions.map((s, i) => {
      const subj = data.subjects.find(sub => sub.id === s.subjectId);
      const time = new Date(s.startTime).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' });
      const color = subj ? subj.color : '#5f5f68';
      const name = subj ? subj.name : t('dash.noSubject');
      return `
        <div class="day-detail-item" data-session-id="${s.id}">
          <span class="dot" style="background:${color}"></span>
          <div class="day-detail-item-info">
            <p class="day-detail-item-time">${time} · ${t('dash.sessionN', { n: i + 1 })}</p>
            <p class="day-detail-item-subject">${name}${s.notes ? ` · ${s.notes}` : ''}</p>
          </div>
          <span class="day-detail-item-dur">${fmt(s.durationMin)}</span>
          <div class="day-detail-item-actions">
            <button type="button" class="day-detail-action-btn" data-action="edit" aria-label="${t('dash.editSession')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="day-detail-action-btn day-detail-action-btn--danger" data-action="delete" aria-label="${t('dash.deleteSession')}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
  }

  document.getElementById('dayDetailOverlay').classList.remove('hidden');
  requestAnimationFrame(() => document.getElementById('dayDetailOverlay').classList.add('show'));
}

function getDayDetailDefaultDate() {
  if (!dayDetailContext) return new Date();
  const dayStart = new Date(dayDetailContext.weekStart);
  dayStart.setDate(dayStart.getDate() + dayDetailContext.dayIndex);
  dayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  if (dayStart.toDateString() === now.toDateString()) return now;
  const defaultDate = new Date(dayStart);
  defaultDate.setHours(12, 0, 0, 0);
  return defaultDate;
}

function refreshAfterDayDetailSessionChange() {
  if (dayDetailContext) {
    openDayDetail(dayDetailContext.weekStart, dayDetailContext.dayIndex);
  }
  renderDashboard();
}

function handleDayDetailAddSession() {
  openSessionModal({
    defaultDate: getDayDetailDefaultDate(),
    onSaved: refreshAfterDayDetailSessionChange
  });
}

function handleDayDetailTimelineClick(e) {
  if (e.target.closest('#dayDetailAddEmptyBtn')) {
    handleDayDetailAddSession();
    return;
  }

  const editBtn = e.target.closest('[data-action="edit"]');
  const deleteBtn = e.target.closest('[data-action="delete"]');
  const item = e.target.closest('.day-detail-item');
  if (!item) return;

  const sessionId = item.dataset.sessionId;
  if (!sessionId) return;

  if (editBtn) {
    openSessionModal({
      sessionId,
      onSaved: refreshAfterDayDetailSessionChange
    });
    return;
  }

  if (deleteBtn) {
    removeSessionWithUndo(sessionId, { onRestored: refreshAfterDayDetailSessionChange });
    refreshAfterDayDetailSessionChange();
  }
}

function closeDayDetail() {
  const overlay = document.getElementById('dayDetailOverlay');
  overlay.classList.remove('show');
  dayDetailContext = null;
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

function getDashBarTooltip() {
  let tooltip = document.getElementById('dash-bar-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'dash-bar-tooltip';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function bindDashBarTooltip(barsEl, formatContent) {
  if (!barsEl || barsEl.dataset.tooltipBound) return;
  barsEl.dataset.tooltipBound = '1';
  const tooltip = getDashBarTooltip();
  let currentCol = null;

  function hideTooltip() {
    currentCol = null;
    tooltip.classList.remove('show');
  }

  function positionTooltip(col) {
    const rect = col.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 8) + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';
    requestAnimationFrame(() => {
      const ttRect = tooltip.getBoundingClientRect();
      if (ttRect.top < 8) {
        tooltip.style.top = (rect.bottom + 8) + 'px';
        tooltip.style.transform = 'translate(-50%, 0)';
      }
    });
  }

  function showTooltip(col) {
    currentCol = col;
    tooltip.innerHTML = formatContent(col);
    positionTooltip(col);
    tooltip.classList.add('show');
  }

  barsEl.addEventListener('mouseover', (e) => {
    const col = e.target.closest('.dash-bar-col');
    if (!col || col === currentCol) return;
    showTooltip(col);
  });
  barsEl.addEventListener('mousemove', (e) => {
    const col = e.target.closest('.dash-bar-col');
    if (!col) return;
    if (col !== currentCol) showTooltip(col);
    else positionTooltip(col);
  });
  barsEl.addEventListener('mouseleave', hideTooltip);
}

function formatAxisHours(minutes) {
  const hours = minutes / 60;
  if (hours === 0) return '0h';
  if (Number.isInteger(hours)) return `${hours}h`;
  const rounded = Math.round(hours * 2) / 2;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}

function computeWeekYScale(dataMax, avgMin = 0) {
  const top = Math.max(dataMax, avgMin, 30);
  let scaleMax = 60;
  if (top > 90) scaleMax = Math.ceil(top / 30) * 30;
  else if (top > 60) scaleMax = 90;
  else if (top > 30) scaleMax = 60;

  const halfHours = scaleMax / 30;
  const stepHalfHours = Math.max(1, Math.ceil(halfHours / 3));
  const ticks = [];
  for (let hh = halfHours; hh >= 0; hh -= stepHalfHours) {
    ticks.push(hh * 30);
  }
  if (ticks[ticks.length - 1] !== 0) ticks.push(0);
  return { scaleMax, ticks: [...new Set(ticks)].sort((a, b) => b - a) };
}

function buildWeekChartHtml(dayTotals, viewedWeekStart, dayLabels, options = {}) {
  const { compareMode = false, prevDayTotals = null } = options;
  const showCompare = compareMode && Array.isArray(prevDayTotals);
  weekChartViewStart = viewedWeekStart;

  const dataMax = showCompare
    ? Math.max(...dayTotals, ...prevDayTotals, 0)
    : Math.max(...dayTotals, 0);
  const active = showCompare
    ? [...dayTotals, ...prevDayTotals].filter(m => m > 0)
    : dayTotals.filter(m => m > 0);
  const avgMin = active.length
    ? Math.round(active.reduce((a, b) => a + b, 0) / active.length)
    : 0;
  const { scaleMax, ticks } = computeWeekYScale(dataMax, avgMin);
  const peakIdx = dayTotals.indexOf(Math.max(...dayTotals));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIsoIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const barsHtml = dayTotals.map((min, i) => {
    const prevMin = showCompare ? (prevDayTotals[i] || 0) : 0;
    const heightPct = min > 0
      ? Math.max(4, Math.round((min / scaleMax) * 100))
      : 4;
    const prevHeightPct = prevMin > 0
      ? Math.max(4, Math.round((prevMin / scaleMax) * 100))
      : 4;
    const cls = min > 0 ? 'active' : 'inactive';
    const prevCls = prevMin > 0 ? 'active' : 'inactive';
    const peaked = i === peakIdx && min > 0 ? ' peaked' : '';
    const todayClass = weekOffset === 0 && i === todayIsoIdx ? ' today' : '';
    const colClass = showCompare ? ' dash-bar-col--compare' : '';
    const prevAttr = showCompare ? ` data-prev-minutes="${prevMin}"` : '';

    if (showCompare) {
      return `<div class="dash-bar-col${colClass}" data-day="${i}" data-minutes="${min}"${prevAttr} data-label="${dayLabels[i]}">
        <div class="dash-bar-group">
          <div class="dash-bar dash-bar--prev ${prevCls}" style="height:${prevHeightPct}%"></div>
          <div class="dash-bar dash-bar--current ${cls}${peaked}${todayClass}" style="height:${heightPct}%"></div>
        </div>
      </div>`;
    }

    return `<div class="dash-bar-col" data-day="${i}" data-minutes="${min}" data-label="${dayLabels[i]}">
      <div class="dash-bar ${cls}${peaked}${todayClass}" style="height:${heightPct}%"></div>
    </div>`;
  }).join('');

  const gridHtml = ticks.map(() => '<span class="dash-bar-grid-line"></span>').join('');
  const yAxisHtml = ticks.map(t => `<span>${formatAxisHours(t)}</span>`).join('');
  const avgLineHtml = !showCompare && avgMin > 0
    ? `<div class="dash-bar-avg-line" style="bottom:${Math.round((avgMin / scaleMax) * 100)}%" aria-hidden="true">
         <span class="dash-bar-avg-label">Media · ${formatAxisHours(avgMin)}</span>
       </div>`
    : '';

  let compareFooterHtml = '';
  if (showCompare) {
    const curTotal = dayTotals.reduce((a, b) => a + b, 0);
    const prevTotal = prevDayTotals.reduce((a, b) => a + b, 0);
    const delta = curTotal - prevTotal;
    let deltaLabel = '—';
    let deltaClass = '';
    if (prevTotal === 0 && curTotal === 0) {
      deltaLabel = t('dash.noChange');
    } else if (prevTotal === 0) {
      deltaLabel = '↑ Nueva actividad';
      deltaClass = 'up';
    } else {
      const pct = Math.round((delta / prevTotal) * 100);
      deltaClass = pct >= 0 ? 'up' : 'down';
      deltaLabel = `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}% total`;
    }
    compareFooterHtml = `
      <div class="week-compare-footer">
        <span class="week-compare-legend"><span class="week-compare-dot week-compare-dot--current"></span>${formatAxisHours(curTotal)} actual</span>
        <span class="week-compare-legend"><span class="week-compare-dot week-compare-dot--prev"></span>${formatAxisHours(prevTotal)} anterior</span>
        <span class="week-compare-delta ${deltaClass}">${deltaLabel}</span>
      </div>`;
  }

  return `
    <div class="dash-bar-chart dash-bar-chart--week${showCompare ? ' dash-bar-chart--compare' : ''}">
      <div class="dash-bar-chart-body">
        <div class="dash-bar-y-axis">${yAxisHtml}</div>
        <div class="dash-bar-plot">
          <div class="dash-bar-grid" aria-hidden="true">${gridHtml}</div>
          ${avgLineHtml}
          <div class="dash-bars dash-bars--week" id="weekBars">${barsHtml}</div>
        </div>
        <div class="dash-bar-axis dash-bar-axis--days">${dayLabels.map(l => `<span>${l}</span>`).join('')}</div>
      </div>
      ${compareFooterHtml}
    </div>`;
}

function renderWeekChart(payload, { animate = false } = {}) {
  const {
    wrap,
    dayTotals,
    viewedWeekStart,
    dayLabels,
    compareMode = false,
    prevDayTotals = null
  } = payload;
  if (!wrap) return;

  const html = buildWeekChartHtml(dayTotals, viewedWeekStart, dayLabels, {
    compareMode,
    prevDayTotals
  });

  const existingChart = wrap.querySelector('.dash-bar-chart--week');
  if (animate && existingChart) {
    existingChart.classList.add('week-chart-fading');
    setTimeout(() => {
      wrap.innerHTML = html;
      const chart = wrap.querySelector('.dash-bar-chart--week');
      if (!chart) return;
      requestAnimationFrame(() => {
        chart.classList.add('week-chart-entering');
        setTimeout(() => chart.classList.remove('week-chart-entering'), 620);
      });
    }, 240);
    return;
  }

  wrap.innerHTML = html;

  if (animate) {
    const chart = wrap.querySelector('.dash-bar-chart--week');
    if (chart) {
      requestAnimationFrame(() => {
        chart.classList.add('week-chart-entering');
        setTimeout(() => chart.classList.remove('week-chart-entering'), 620);
      });
    }
  }
}

function refreshWeekChart(animate = false) {
  ensureStatsFresh();
  renderWeekChart(getWeekChartPayload(getFilteredSessions(), data.stats), { animate });
}

function setWeekCompareMode(enabled) {
  if (weekCompareMode === enabled) return;
  weekCompareMode = enabled;
  syncWeekCompareToggle();
  refreshWeekChart(true);
}

function syncWeekCompareToggle() {
  const soloBtn = document.getElementById('weekBtnSolo');
  const compareBtn = document.getElementById('weekBtnCompare');
  soloBtn?.classList.toggle('active', !weekCompareMode);
  compareBtn?.classList.toggle('active', weekCompareMode);
  soloBtn?.setAttribute('aria-pressed', String(!weekCompareMode));
  compareBtn?.setAttribute('aria-pressed', String(weekCompareMode));
}

function initWeekChartInteractions() {
  const wrap = document.getElementById('weekChartWrap');
  if (!wrap || wrap.dataset.weekBound) return;
  wrap.dataset.weekBound = '1';

  document.getElementById('weekBtnSolo')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWeekCompareMode(false);
  });
  document.getElementById('weekBtnCompare')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWeekCompareMode(true);
  });

  bindDashBarTooltip(wrap, (col) => {
    const label = col.dataset.label || '—';
    const minutes = parseInt(col.dataset.minutes, 10) || 0;
    if (weekCompareMode && col.dataset.prevMinutes !== undefined) {
      const prevMinutes = parseInt(col.dataset.prevMinutes, 10) || 0;
      if (minutes === 0 && prevMinutes === 0) {
        return `<p class="tooltip-date">${label}</p><p class="tooltip-empty">${t('dash.noActivityWeek')}</p>`;
      }
      let deltaLine = '';
      if (prevMinutes > 0 || minutes > 0) {
        const delta = minutes - prevMinutes;
        const pct = prevMinutes === 0
          ? (minutes > 0 ? '+100%' : '0%')
          : `${delta >= 0 ? '+' : ''}${Math.round((delta / prevMinutes) * 100)}%`;
        const arrow = delta >= 0 ? '↑' : '↓';
        deltaLine = `<p class="tooltip-minutes">${arrow} ${Math.abs(delta)} min (${pct})</p>`;
      }
      return `<p class="tooltip-date">${label}</p>
        <p class="tooltip-minutes">Actual: ${minutes} min · Anterior: ${prevMinutes} min</p>
        ${deltaLine}`;
    }
    if (minutes === 0) {
      return `<p class="tooltip-date">${label}</p><p class="tooltip-empty">${t('dash.noActivityShort')}</p><p class="tooltip-hint">${t('dash.clickToManage')}</p>`;
    }
    return `<p class="tooltip-date">${label}</p><p class="tooltip-minutes">${minutes} min · ${t('dash.clickToManage')}</p>`;
  });

  wrap.addEventListener('click', (e) => {
    const col = e.target.closest('.dash-bar-col');
    if (!col || !weekChartViewStart) return;
    openDayDetail(weekChartViewStart, parseInt(col.dataset.day, 10));
  });
}

function computeDiaDorado() {
  const sessions = data.sessions;
  if (!sessions || sessions.length === 0) return null;

  const byWeekday = Array.from({ length: 7 }, () => ({
    dayTotals: {},
    totalSessions: 0,
    bySubject: {}
  }));

  for (const s of sessions) {
    const dt = new Date(s.startTime);
    const dow = dt.getDay();
    const isoIdx = dow === 0 ? 6 : dow - 1;
    const dk = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    const wd = byWeekday[isoIdx];
    wd.dayTotals[dk] = (wd.dayTotals[dk] || 0) + s.durationMin;
    wd.totalSessions += 1;
    if (s.subjectId) wd.bySubject[s.subjectId] = (wd.bySubject[s.subjectId] || 0) + s.durationMin;
  }

  let goldenIdx = 0, goldenAvg = 0;
  for (let i = 0; i < 7; i++) {
    const active = Object.keys(byWeekday[i].dayTotals).length;
    if (active === 0) continue;
    const total = Object.values(byWeekday[i].dayTotals).reduce((a, b) => a + b, 0);
    const avg = total / active;
    if (avg > goldenAvg) { goldenAvg = avg; goldenIdx = i; }
  }

  const golden = byWeekday[goldenIdx];
  const activeDayCount = Object.keys(golden.dayTotals).length;
  const totalMin = Object.values(golden.dayTotals).reduce((a, b) => a + b, 0);
  const avgMin = activeDayCount > 0 ? totalMin / activeDayCount : 0;

  const subjectEntries = Object.entries(golden.bySubject);
  const topSubjectId = subjectEntries.length > 0
    ? subjectEntries.sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const topSubject = topSubjectId ? data.subjects.find(s => s.id === topSubjectId) : null;
  const topSubjectName = topSubject
    ? (topSubject.name.length > 7 ? topSubject.name.slice(0, 6) + '…' : topSubject.name)
    : '—';

  let bestDayKey = null;
  let bestDayMin = 0;
  for (const [dk, min] of Object.entries(golden.dayTotals)) {
    if (min > bestDayMin) { bestDayMin = min; bestDayKey = dk; }
  }

  const DAY_NAMES = getWeekdayLabelsFull();
  return {
    dayName: DAY_NAMES[goldenIdx],
    avgHours: (avgMin / 60).toFixed(1) + 'h',
    totalSessions: golden.totalSessions,
    topSubjectName,
    bestDayKey,
    goldenIdx
  };
}

function openGoldenDayDetail(result) {
  if (!result?.bestDayKey) return;
  const [y, m, d] = result.bestDayKey.split('-').map(Number);
  const dayStart = new Date(y, m, d);
  const isoIdx = result.goldenIdx;
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - isoIdx);
  weekStart.setHours(0, 0, 0, 0);
  openDayDetail(weekStart, isoIdx);
}

function shareDiaDorado(result) {
  if (!result) return;
  const text = t('dash.shareGoldenText', { day: result.dayName, avg: result.avgHours, sessions: result.totalSessions, top: result.topSubjectName });
  if (navigator.share) {
    navigator.share({ title: t('dash.shareGolden'), text }).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(text).catch(() => {});
}

function renderDiaDorado() {
  const result = computeDiaDorado();
  diaDoradoResult = result;

  const dayNameEl = document.getElementById('ddDayName');
  if (dayNameEl) dayNameEl.textContent = result ? result.dayName : '—';

  const avgHoursEl = document.getElementById('ddAvgHours');
  if (avgHoursEl) avgHoursEl.textContent = result ? result.avgHours : '—';

  const sessionsEl = document.getElementById('ddTotalSessions');
  if (sessionsEl) sessionsEl.textContent = result ? String(result.totalSessions) : '—';

  const topSubjEl = document.getElementById('ddTopSubject');
  if (topSubjEl) topSubjEl.textContent = result ? result.topSubjectName : '—';

  const analyzeBtn = document.getElementById('ddAnalyzeBtn');
  if (analyzeBtn) analyzeBtn.disabled = !result?.bestDayKey;
}

function initDiaDoradoInteractions() {
  const card = document.getElementById('diaDoradoCard');
  if (!card || card.dataset.ddBound) return;
  card.dataset.ddBound = '1';

  document.getElementById('ddAnalyzeBtn')?.addEventListener('click', () => {
    openGoldenDayDetail(diaDoradoResult);
  });
  document.getElementById('ddShareBtn')?.addEventListener('click', () => {
    shareDiaDorado(diaDoradoResult);
  });
}

function truncateSubjectName(name, max = 8) {
  if (!name) return '—';
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

function computeSubjectMix() {
  const sessions = data.sessions;
  if (!sessions || sessions.length === 0) return null;

  const bySubject = {};
  for (const s of sessions) {
    if (!s.subjectId) continue;
    bySubject[s.subjectId] = (bySubject[s.subjectId] || 0) + s.durationMin;
  }

  const entries = Object.entries(bySubject)
    .map(([id, minutes]) => {
      const subj = data.subjects.find(item => item.id === id);
      return {
        id,
        name: subj?.name || t('dash.noSubject'),
        color: subj?.color || '#5f5f68',
        minutes
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  if (entries.length === 0) return null;

  const totalMin = entries.reduce((sum, e) => sum + e.minutes, 0);
  const top = entries[0];
  return {
    entries,
    totalMin,
    totalHours: (totalMin / 60).toFixed(1) + 'h',
    topName: truncateSubjectName(top.name, 10),
    topPct: totalMin > 0 ? Math.round((top.minutes / totalMin) * 100) : 0
  };
}

function donutSegmentColor(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex || '#5f5f68';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum > 0.72) {
    const f = 0.72;
    return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
  }
  return hex;
}

function renderSubjectDonut(svgEl, entries, totalMin) {
  if (!svgEl) return;
  const cx = 60;
  const cy = 60;
  const r = 42;
  const stroke = 18;
  const circ = 2 * Math.PI * r;

  if (!entries.length || totalMin <= 0) {
    svgEl.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${r + stroke / 2 + 2}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    `;
    return;
  }

  let offset = 0;
  const segments = entries.map((entry) => {
    const dash = (entry.minutes / totalMin) * circ;
    const gap = circ - dash;
    const pct = Math.round((entry.minutes / totalMin) * 100);
    const isActive = currentSubjectFilter === entry.id;
    const isDimmed = currentSubjectFilter && !isActive;
    const stateClass = isActive ? ' sm-donut-seg--active' : isDimmed ? ' sm-donut-seg--dimmed' : '';
    const slice = `<circle class="sm-donut-seg${stateClass}" cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${donutSegmentColor(entry.color)}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${gap}"
      stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})"
      data-subject-id="${entry.id}"
      data-subject="${entry.name.replace(/"/g, '&quot;')}"
      data-minutes="${entry.minutes}"
      data-pct="${pct}"
      style="color:${entry.color}"
      role="button"
      tabindex="0"
      aria-pressed="${isActive}"
      aria-label="${t('dash.filterBy', { name: entry.name.replace(/"/g, '&quot;') })}">
      <title>${entry.name}: ${pct}% · ${(entry.minutes / 60).toFixed(1)}h</title>
    </circle>`;
    offset += dash;
    return slice;
  }).join('');

  const innerRing = `<circle cx="${cx}" cy="${cy}" r="${r - stroke / 2 - 3}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
  const outerRing = `<circle cx="${cx}" cy="${cy}" r="${r + stroke / 2 + 3}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`;

  svgEl.innerHTML = outerRing + segments + innerRing;
}

function renderSubjectMixStats(statsEl, entries, totalMin) {
  if (!statsEl) return;
  if (!entries.length || totalMin <= 0) {
    statsEl.innerHTML = `<div class="sm-legend"><div class="sm-legend-item"><span class="sm-legend-name" style="color:var(--text-faint)">${t('dash.noData')}</span></div></div>`;
    return;
  }

  const top3 = entries.slice(0, 3);
  const items = top3.map(entry => {
    const pct = Math.round((entry.minutes / totalMin) * 100);
    const color = donutSegmentColor(entry.color);
    const isActive = currentSubjectFilter === entry.id;
    const isDimmed = currentSubjectFilter && !isActive;
    const stateClass = isActive ? ' sm-legend-item--active' : isDimmed ? ' sm-legend-item--dimmed' : '';
    return `<div class="sm-legend-item${stateClass}" data-subject-id="${entry.id}" role="button" tabindex="0" aria-pressed="${isActive}" aria-label="${t('dash.filterBy', { name: entry.name.replace(/"/g, '&quot;') })}">
      <span class="sm-stat-dot" style="background:${color};color:${color}"></span>
      <span class="sm-legend-name">${entry.name}</span>
      <span class="sm-legend-pct">${pct}%</span>
    </div>`;
  }).join('');

  statsEl.innerHTML = `<div class="sm-legend">${items}</div>`;
}

function shareSubjectMix(result) {
  if (!result) return;
  const lines = result.entries.slice(0, 4).map(e => {
    const pct = Math.round((e.minutes / result.totalMin) * 100);
    return `${e.name} ${pct}%`;
  }).join(' · ');
  const text = t('dash.shareMixText', { total: result.totalHours, lines });
  if (navigator.share) {
    navigator.share({ title: t('dash.shareMix'), text }).catch(() => {});
    return;
  }
  navigator.clipboard?.writeText(text).catch(() => {});
}

function renderSubjectMix() {
  const result = computeSubjectMix();
  subjectMixResult = result;

  const centerEl = document.getElementById('smCenterValue');
  if (centerEl) {
    centerEl.textContent = result ? result.totalHours : '—';
  }

  renderSubjectDonut(
    document.getElementById('smDonut'),
    result?.entries || [],
    result?.totalMin || 0
  );
  renderSubjectMixStats(
    document.getElementById('smStatsRow'),
    result?.entries || [],
    result?.totalMin || 0
  );
}

function initSubjectMixInteractions() {
  const card = document.getElementById('subjectMixCard');
  if (!card || card.dataset.smBound) return;
  card.dataset.smBound = '1';

  function handleSubjectFilterClick(subjectId, e) {
    e.stopPropagation();
    e.preventDefault();
    toggleSubjectFilter(subjectId);
  }

  document.getElementById('smShareBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    shareSubjectMix(subjectMixResult);
  });

  document.getElementById('smDonutWrap')?.addEventListener('click', (e) => {
    const seg = e.target.closest('.sm-donut-seg');
    if (!seg?.dataset.subjectId) return;
    handleSubjectFilterClick(seg.dataset.subjectId, e);
  });

  document.getElementById('smStatsRow')?.addEventListener('click', (e) => {
    const item = e.target.closest('.sm-legend-item[data-subject-id]');
    if (!item) return;
    handleSubjectFilterClick(item.dataset.subjectId, e);
  });

  document.getElementById('smDonutWrap')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const seg = e.target.closest('.sm-donut-seg');
    if (!seg?.dataset.subjectId) return;
    handleSubjectFilterClick(seg.dataset.subjectId, e);
  });

  document.getElementById('smStatsRow')?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.sm-legend-item[data-subject-id]');
    if (!item) return;
    handleSubjectFilterClick(item.dataset.subjectId, e);
  });

  card.addEventListener('click', (e) => {
    if (e.target.closest('.sm-donut-seg, .sm-legend-item, #smShareBtn')) return;
    if (subjectMixResult) navigateTo('materias');
  });
}

function buildHourlyStats(sessions) {
  const hourly = new Array(24).fill(0);
  for (const s of sessions) {
    const h = new Date(s.startTime).getHours();
    hourly[h] += s.durationMin;
  }
  const peakHour = hourly.indexOf(Math.max(...hourly));
  const peakMin  = hourly[peakHour];
  const pad = n => String(n).padStart(2, '0');
  const peakLabel = peakMin > 0
    ? `${pad(peakHour)}:00 – ${pad(peakHour + 1 < 24 ? peakHour + 1 : 0)}:00`
    : '—';
  return { hourly, peakHour, peakMin, peakLabel };
}

function computePeakHours() {
  const sessions = getFilteredSessions();
  const empty = { hourly: new Array(24).fill(0), peakHour: -1, peakMin: 0, preference: '—', peakLabel: '—' };
  if (!sessions || sessions.length === 0) return empty;

  const stats = buildHourlyStats(sessions);
  const { hourly } = stats;

  const morning   = hourly.slice(5, 12).reduce((a, b) => a + b, 0);
  const afternoon = hourly.slice(12, 18).reduce((a, b) => a + b, 0);
  const evening   = hourly.slice(18, 24).reduce((a, b) => a + b, 0);
  const night     = hourly.slice(0, 5).reduce((a, b) => a + b, 0);
  const buckets = [
    { label: t('dash.morning'),          value: morning },
    { label: t('dash.afternoon'), value: afternoon },
    { label: t('dash.night'),            value: evening + night }
  ];
  const preference = buckets.sort((a, b) => b.value - a.value)[0].label;
  return { ...stats, preference };
}

function computePeakHoursToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todaySessions = getFilteredSessions().filter(s => {
    const dt = new Date(s.startTime);
    return dt >= today && dt < tomorrow;
  });
  if (todaySessions.length === 0) {
    return { hourly: new Array(24).fill(0), peakHour: -1, peakMin: 0, peakLabel: '—', totalMin: 0, sessionCount: 0 };
  }
  const stats = buildHourlyStats(todaySessions);
  const totalMin = todaySessions.reduce((a, s) => a + s.durationMin, 0);
  return { ...stats, totalMin, sessionCount: todaySessions.length };
}

function renderPeakHours({ animate = false } = {}) {
  const barsEl     = document.getElementById('phBars');
  const badgeEl    = document.getElementById('phPeakBadge');
  const detailEl   = document.getElementById('phPeakDetail');
  const subtitleEl = document.getElementById('phSubtitle');
  const footLeftEl = document.getElementById('phFootLeft');
  if (!barsEl) return;

  const padH = n => String(n).padStart(2, '0');
  const modeLabel = phMode === 'today' ? 'hoy' : 'histórico';

  let hourly, peakHour, peakMin;

  if (phMode === 'today') {
    const result = computePeakHoursToday();
    hourly = result.hourly;
    peakHour = result.peakHour;
    peakMin = result.peakMin;
    if (subtitleEl) subtitleEl.textContent = t('dash.peakTodaySessions');
    if (badgeEl) badgeEl.textContent = result.sessionCount > 0 ? t('dash.todaySessions', { count: result.sessionCount }) : t('dash.noSessionsToday');
    if (footLeftEl) footLeftEl.innerHTML = t('dash.todayTotal', { min: result.totalMin });
    if (detailEl) detailEl.textContent = peakMin > 0 ? `${peakMin} min a las ${padH(peakHour)}:00` : '—';
  } else {
    const result = computePeakHours();
    hourly = result.hourly;
    peakHour = result.peakHour;
    peakMin = result.peakMin;
    if (subtitleEl) subtitleEl.textContent = t('dash.peakHistoricDist');
    if (badgeEl) badgeEl.textContent = peakMin > 0 ? t('dash.peakTime', { label: result.peakLabel }) : t('dash.noData');
    if (footLeftEl) footLeftEl.innerHTML = t('dash.preferenceLabel', { pref: result.preference });
    if (detailEl) detailEl.textContent = peakMin > 0 ? `${peakMin} min a las ${padH(peakHour)}:00` : '—';
  }

  const max = Math.max(...hourly, 1);
  barsEl.innerHTML = hourly.map((min, h) => {
    const heightPct = Math.max(4, Math.round((min / max) * 100));
    const cls = min > 0 ? 'active' : 'inactive';
    const peaked = h === peakHour && peakMin > 0 ? ' peaked' : '';
    return `<div class="dash-bar-col" data-hour="${h}" data-minutes="${min}" data-mode="${modeLabel}" style="--bar-i:${h}">
      <div class="dash-bar ${cls}${peaked}" style="height:${heightPct}%"></div>
    </div>`;
  }).join('');

  const chart = barsEl.closest('.dash-bar-chart--peak');
  if (animate && chart) {
    chart.classList.remove('ph-chart-entering');
    requestAnimationFrame(() => {
      chart.classList.add('ph-chart-entering');
      setTimeout(() => chart.classList.remove('ph-chart-entering'), 680);
    });
  }
}

function setPeakHoursMode(mode) {
  if (mode !== 'historic' && mode !== 'today') return;
  if (mode === phMode) return;
  phMode = mode;
  document.querySelectorAll('#peakHoursCard .ph-toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  renderPeakHours();
}

function initPeakHoursInteractions() {
  const historicBtn = document.getElementById('phBtnHistoric');
  const todayBtn = document.getElementById('phBtnToday');
  const card = document.getElementById('peakHoursCard');
  const barsEl = document.getElementById('phBars');
  if (!historicBtn || !todayBtn || !card || !barsEl) return;

  historicBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPeakHoursMode('historic');
  });
  todayBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPeakHoursMode('today');
  });

  if (!card.dataset.phBound) {
    card.dataset.phBound = '1';
    bindDashBarTooltip(barsEl, (col) => {
      const hour = parseInt(col.dataset.hour, 10);
      const minutes = parseInt(col.dataset.minutes, 10) || 0;
      const padH = n => String(n).padStart(2, '0');
      const next = hour + 1 < 24 ? hour + 1 : 0;
      const range = `${padH(hour)}:00 – ${padH(next)}:00`;
      if (minutes === 0) {
        return `<p class="tooltip-date">${range}: 0 min</p>`;
      }
      return `<p class="tooltip-date">${range}: ${minutes} min</p>`;
    });
  }
}

let heatmapInitialized = false;
let heatmapLastPage = -1;

function getHeatmapWeeksPerPage(cardEl) {
  const cardWidth = cardEl ? cardEl.clientWidth : 320;
  const available = cardWidth - HEATMAP_DAY_LABELS_W - 52;
  return Math.max(5, Math.floor(available / HEATMAP_COL_W));
}

const HEATMAP_MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatHeatmapPillRange(monthIndices) {
  if (monthIndices.length === 0) return '—';
  const first = HEATMAP_MONTH_NAMES[monthIndices[0]];
  const last = HEATMAP_MONTH_NAMES[monthIndices.length - 1];
  return first === last ? first : `${first} – ${last}`;
}

/** Etiquetas al borde izquierdo de la columna ISO (estilo GitHub). */
function buildHeatmapMonthLabels(cellsByCol, pageStart, pageEnd) {
  const monthLabels = [];

  for (let w = pageStart; w < pageEnd; w++) {
    const col = w - pageStart;

    for (let d = 0; d < 7; d++) {
      const cell = cellsByCol[w][d];
      if (!cell.isVisible || cell.date.getDate() !== 1) continue;
      monthLabels.push({ col, name: HEATMAP_MONTH_NAMES[cell.date.getMonth()] });
      break;
    }
  }

  if (!monthLabels.some(m => m.col === 0)) {
    const firstWeek = cellsByCol[pageStart];
    const firstVisible = firstWeek?.find(c => c.isVisible);
    if (firstVisible) {
      monthLabels.unshift({
        col: 0,
        name: HEATMAP_MONTH_NAMES[firstVisible.date.getMonth()]
      });
    }
  }

  return monthLabels;
}

function collectHeatmapPageMonths(cellsByCol, pageStart, pageEnd) {
  const pageMonths = [];
  const seen = new Set();
  for (let w = pageStart; w < pageEnd; w++) {
    for (let d = 0; d < 7; d++) {
      const cell = cellsByCol[w][d];
      if (!cell.isVisible) continue;
      const monthIdx = cell.date.getMonth();
      if (seen.has(monthIdx)) continue;
      seen.add(monthIdx);
      pageMonths.push(monthIdx);
    }
  }
  return pageMonths;
}

function heatmapMonthLabelLeftPx(label) {
  // Los spans son position:absolute y no heredan padding-left de #heatmap-months;
  // hay que compensar el ancho de #heatmap-day-labels para alinear con las columnas.
  return HEATMAP_DAY_LABELS_W + label.col * HEATMAP_COL_W;
}

function findTodayWeekIndex(cellsByCol, todayKey) {
  for (let w = 0; w < cellsByCol.length; w++) {
    for (let d = 0; d < 7; d++) {
      if (cellsByCol[w][d].key === todayKey) return w;
    }
  }
  return 0;
}

function formatCellAria(cell, todayKey) {
  const dateFormatted = cell.date.toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  if (cell.key === todayKey) {
    if (cell.sessionCount === 0 || cell.minutes === 0) return t('dash.todayTooltipEmpty', { date: dateFormatted });
    return t('dash.todayTooltip', { date: dateFormatted, minutes: cell.minutes, count: cell.sessionCount, s: cell.sessionCount === 1 ? '' : 's' });
  }
  if (cell.sessionCount === 0 || cell.minutes === 0) return `${dateFormatted}: ${t('dash.noActivity')}`;
  return `${dateFormatted}: ${cell.minutes} min, ${cell.sessionCount} pomodoro${cell.sessionCount === 1 ? '' : 's'}`;
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-container');
  const monthsEl = document.getElementById('heatmap-months');
  const dayLabelsEl = document.getElementById('heatmap-day-labels');
  const bodyEl = document.getElementById('heatmap-body');
  const contentEl = document.getElementById('heatmap-content');
  const pillEl = document.getElementById('heatmapPill');
  const prevBtn = document.getElementById('heatmapPrevBtn');
  const nextBtn = document.getElementById('heatmapNextBtn');
  const wrapper = document.getElementById('heatmap-wrapper');
  const cardEl = wrapper?.closest('.card');
  if (!container || !monthsEl || !dayLabelsEl) return;

  const oldTooltip = document.getElementById('heatmap-tooltip');
  if (oldTooltip) oldTooltip.classList.remove('show');

  if (!data.sessions || data.sessions.length === 0) {
    if (contentEl) {
      contentEl.innerHTML = `<div class="chart-empty-msg">${t('dash.heatmapEmpty')}</div>`;
    }
    wrapper?.classList.add('heatmap-empty');
    if (pillEl) pillEl.textContent = t('dash.noData');
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    heatmapLastPage = -1;
    return;
  }

  if (contentEl && !document.getElementById('heatmap-body')) {
    contentEl.innerHTML = `
      <div id="heatmap-months"></div>
      <div id="heatmap-body">
        <div id="heatmap-day-labels"></div>
        <div id="heatmap-container"></div>
      </div>`;
    return renderHeatmap();
  }

  wrapper?.classList.remove('heatmap-empty');

  const dashboardSessions = getFilteredSessions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getDayStats(dayDate) {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const daySessions = dashboardSessions.filter(s => {
      const dt = new Date(s.startTime);
      return dt >= dayStart && dt < dayEnd;
    });
    return {
      minutes: daySessions.reduce((sum, s) => sum + s.durationMin, 0),
      sessionCount: daySessions.length
    };
  }

  function getLevel(minutes, sessionCount) {
    if (sessionCount === 0 || minutes <= 0) return 'level-0';
    if (minutes <= 25) return 'level-1';
    if (minutes <= 60) return 'level-2';
    if (minutes <= 120) return 'level-3';
    return 'level-4';
  }

  function toLocalKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const year = today.getFullYear();
  const rangeStart = new Date(year, 6, 1);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(year, 11, 31);
  rangeEnd.setHours(0, 0, 0, 0);

  const gridStart = startOfWeekMonday(rangeStart);
  const gridEnd = endOfISOWeek(rangeEnd);
  const totalWeeks = countISOWeeksBetween(gridStart, gridEnd);

  const todayKey = toLocalKey(today);
  const cellsByCol = [];
  for (let w = 0; w < totalWeeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const key = toLocalKey(cellDate);
      const { minutes, sessionCount } = getDayStats(cellDate);
      const level = getLevel(minutes, sessionCount);
      const isVisible = cellDate >= rangeStart && cellDate <= rangeEnd;
      const isPastOrToday = isVisible && cellDate <= today;
      col.push({ date: cellDate, key, minutes, sessionCount, level, isVisible, isPastOrToday });
    }
    cellsByCol.push(col);
  }

  const weeksPerPage = getHeatmapWeeksPerPage(cardEl);
  const totalPages = Math.ceil(totalWeeks / weeksPerPage);

  if (!heatmapInitialized) {
    const todayWeekIdx = findTodayWeekIndex(cellsByCol, todayKey);
    heatmapPage = Math.floor(todayWeekIdx / weeksPerPage);
    heatmapInitialized = true;
  }
  heatmapPage = Math.max(0, Math.min(heatmapPage, totalPages - 1));

  const pageStart = heatmapPage * weeksPerPage;
  const pageEnd = Math.min(pageStart + weeksPerPage, totalWeeks);
  const visibleWeeks = pageEnd - pageStart;

  const monthLabels = buildHeatmapMonthLabels(cellsByCol, pageStart, pageEnd);
  const pageMonths = collectHeatmapPageMonths(cellsByCol, pageStart, pageEnd);

  const shouldFade = heatmapLastPage !== -1 && heatmapLastPage !== heatmapPage;
  heatmapLastPage = heatmapPage;

  function paintHeatmap() {
    const dayNames = getWeekdayLabelsShort();
    dayLabelsEl.innerHTML = dayNames.map(d => `<span>${d}</span>`).join('');

    monthsEl.innerHTML = monthLabels.map(m => {
      const leftPx = heatmapMonthLabelLeftPx(m);
      return `<span style="left:${leftPx}px">${m.name}</span>`;
    }).join('');
    monthsEl.style.width = (visibleWeeks * HEATMAP_COL_W - HEATMAP_GAP) + 'px';

    let html = '';
    for (let w = pageStart; w < pageEnd; w++) {
      for (let d = 0; d < 7; d++) {
        const cell = cellsByCol[w][d];
        if (!cell.isVisible) {
          html += `<div class="heatmap-cell heatmap-placeholder"></div>`;
        } else if (cell.isPastOrToday) {
          const todayClass = cell.key === todayKey ? ' cell-today' : '';
          const aria = formatCellAria(cell, todayKey);
          html += `<div class="heatmap-cell ${cell.level}${todayClass}" data-date="${cell.key}" data-minutes="${cell.minutes}" data-sessions="${cell.sessionCount}" aria-label="${aria}"></div>`;
        } else {
          html += `<div class="heatmap-cell level-future"></div>`;
        }
      }
    }
    container.innerHTML = html;
    container.style.width = (visibleWeeks * HEATMAP_COL_W - HEATMAP_GAP) + 'px';

    const monthLabel = formatHeatmapPillRange(pageMonths);
    if (pillEl) {
      pillEl.textContent = totalPages > 1 ? `${monthLabel} · ${heatmapPage + 1}/${totalPages}` : monthLabel;
    }
    if (prevBtn) prevBtn.disabled = heatmapPage <= 0;
    if (nextBtn) nextBtn.disabled = heatmapPage >= totalPages - 1;
  }

  if (shouldFade && bodyEl) {
    bodyEl.classList.add('heatmap-fading');
    setTimeout(() => {
      paintHeatmap();
      bodyEl.classList.remove('heatmap-fading');
    }, 150);
  } else {
    paintHeatmap();
  }
}

function initHeatmapInteractions() {
  if (heatmapListenersAttached) return;
  const wrapper = document.getElementById('heatmap-wrapper');
  if (!wrapper) return;
  heatmapListenersAttached = true;

  let tooltip = document.getElementById('heatmap-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'heatmap-tooltip';
    document.body.appendChild(tooltip);
  }

  let currentHoveredCell = null;

  function hideTooltip() {
    currentHoveredCell = null;
    tooltip.classList.remove('show');
  }

  function positionTooltip(cell) {
    const rect = cell.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 8) + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';

    requestAnimationFrame(() => {
      const ttRect = tooltip.getBoundingClientRect();
      if (ttRect.top < 8) {
        tooltip.style.top = (rect.bottom + 8) + 'px';
        tooltip.style.transform = 'translate(-50%, 0)';
      }
    });
  }

  function showTooltip(cell) {
    if (!cell.dataset.date) return;
    currentHoveredCell = cell;
    const dateStr = cell.dataset.date;
    const minutes = parseInt(cell.dataset.minutes, 10) || 0;
    const sessions = parseInt(cell.dataset.sessions, 10) || 0;
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dateFormatted = date.toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });

    const isToday = cell.classList.contains('cell-today');
    const prefix = isToday ? t('dash.todayPrefix') : '';

    if (sessions === 0 || minutes === 0) {
      tooltip.innerHTML = `<p class="tooltip-date">${prefix}${dateFormatted}</p><p class="tooltip-empty">${t('dash.noActivity')}</p>`;
    } else {
      const label = sessions === 1 ? 'pomodoro' : 'pomodoros';
      tooltip.innerHTML = `<p class="tooltip-date">${prefix}${dateFormatted}</p><p class="tooltip-minutes">${minutes} min · ${sessions} ${label}</p>`;
    }

    positionTooltip(cell);
    tooltip.classList.add('show');
  }

  wrapper.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (!cell || cell.classList.contains('heatmap-placeholder') || cell.classList.contains('level-future')) return;
    showTooltip(cell);
  });

  wrapper.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.heatmap-cell');
    if (!cell || cell.classList.contains('heatmap-placeholder') || cell.classList.contains('level-future')) return;
    if (cell !== currentHoveredCell) showTooltip(cell);
    else positionTooltip(cell);
  });

  wrapper.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}

export function initDashboard() {
  document.getElementById('streakCardBtn')?.addEventListener('click', () => {
    openStreakModal({ mode: 'default' });
  });

  document.getElementById('dayDetailCloseBtn')?.addEventListener('click', closeDayDetail);
  document.getElementById('dayDetailOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'dayDetailOverlay') closeDayDetail();
  });
  document.getElementById('dayDetailAddBtn')?.addEventListener('click', handleDayDetailAddSession);
  document.getElementById('dayDetailTimeline')?.addEventListener('click', handleDayDetailTimelineClick);

  document.getElementById('emptyStateGoSubjects')?.addEventListener('click', () => {
    navigateTo('materias');
  });

  document.getElementById('weekPrevBtn')?.addEventListener('click', () => {
    weekOffset -= 1;
    renderDashboard();
  });

  document.getElementById('weekNextBtn')?.addEventListener('click', () => {
    if (weekOffset < 0) {
      weekOffset += 1;
      renderDashboard();
    }
  });

  initHeatmapInteractions();
  initWeekChartInteractions();
  initPeakHoursInteractions();
  initDiaDoradoInteractions();
  initSubjectMixInteractions();

  document.getElementById('heatmapPrevBtn')?.addEventListener('click', () => {
    if (heatmapPage > 0) {
      heatmapPage -= 1;
      renderHeatmap();
    }
  });

  document.getElementById('heatmapNextBtn')?.addEventListener('click', () => {
    heatmapPage += 1;
    renderHeatmap();
  });

  window.addEventListener('resize', syncBottomRowHeights);
}