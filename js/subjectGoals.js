
/** Normaliza el objetivo de una materia (migra weeklyTargetMin legacy). */
export function getSubjectGoal(subject) {
  if (subject.goal && typeof subject.goal === 'object') {
    return subject.goal;
  }
  if (subject.weeklyTargetMin != null && subject.weeklyTargetMin > 0) {
    return { type: 'time', period: 'week', targetMin: subject.weeklyTargetMin };
  }
  return { type: 'none' };
}

/** Progreso de objetivo para tarjetas y contexto del timer. */
export function getSubjectGoalProgress(subject, sessions, weekStart) {
  const goal = getSubjectGoal(subject);
  const subjSessions = sessions.filter(s => s.subjectId === subject.id);

  if (goal.type === 'none') {
    return { hasGoal: false, pct: 0, label: '', pctLabel: '' };
  }

  if (goal.type === 'units') {
    const current = goal.completedUnits || 0;
    const target = Math.max(1, goal.targetUnits || 1);
    const pct = Math.min(100, Math.round((current / target) * 100));
    const unitLabel = goal.unitLabel || 'módulos';
    return {
      hasGoal: true,
      pct,
      label: `${current} / ${target} ${unitLabel}`,
      pctLabel: `${pct}%`
    };
  }

  const targetMin = Math.max(1, goal.targetMin || 300);
  const period = goal.period || 'week';
  let currentMin;

  if (period === 'day') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    currentMin = subjSessions
      .filter(s => new Date(s.startTime) >= todayStart)
      .reduce((a, b) => a + b.durationMin, 0);
    const useHours = targetMin >= 60 && currentMin >= 60;
    const label = useHours
      ? `${Math.floor(currentMin / 60)} / ${Math.floor(targetMin / 60)} horas hoy`
      : `${currentMin} / ${targetMin} min hoy`;
    const pct = Math.min(100, Math.round((currentMin / targetMin) * 100));
    return { hasGoal: true, pct, label, pctLabel: `${pct}%` };
  }

  currentMin = subjSessions
    .filter(s => new Date(s.startTime) >= weekStart)
    .reduce((a, b) => a + b.durationMin, 0);
  const pct = Math.min(100, Math.round((currentMin / targetMin) * 100));
  return {
    hasGoal: true,
    pct,
    label: `${currentMin} / ${targetMin} min esta semana`,
    pctLabel: `${pct}%`
  };
}

export function isSubjectGoalComplete(subject, sessions, weekStart) {
  const progress = getSubjectGoalProgress(subject, sessions, weekStart);
  return progress.hasGoal && progress.pct >= 100;
}

/** Ajusta módulos/unidades completadas. Devuelve false si no cambió. */
export function adjustSubjectCompletedUnits(subject, delta) {
  const goal = getSubjectGoal(subject);
  if (goal.type !== 'units') return false;

  const target = Math.max(1, goal.targetUnits || 1);
  const current = goal.completedUnits || 0;
  const next = Math.max(0, Math.min(target, current + delta));
  if (next === current) return false;

  if (!subject.goal || subject.goal.type !== 'units') {
    subject.goal = {
      type: 'units',
      targetUnits: target,
      completedUnits: next,
      unitLabel: goal.unitLabel || 'módulos'
    };
  } else {
    subject.goal.completedUnits = next;
  }
  return true;
}

/** Migra materias legacy al cargar datos. */
export function migrateSubjectGoals(subjects) {
  for (const s of subjects) {
    if (!s.goal) {
      if (s.weeklyTargetMin != null && s.weeklyTargetMin > 0) {
        s.goal = { type: 'time', period: 'week', targetMin: s.weeklyTargetMin };
      } else {
        s.goal = { type: 'none' };
      }
    }
  }
}
