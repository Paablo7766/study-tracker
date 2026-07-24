let currentLang = 'es';

const MESSAGES = {
  es: {
    'brand.tagline': 'Enfócate y mide',
    'nav.timer': 'Timer',
    'nav.dashboard': 'Dashboard',
    'nav.subjects': 'Materias',
    'nav.notes': 'Notas',
    'nav.settings': 'Ajustes',
    'nav.collapse': 'Contraer',
    'nav.collapseMenu': 'Contraer menú lateral',
    'nav.expandMenu': 'Expandir menú lateral',
    'live.backToTimer': 'Volver al temporizador',
    'live.live': 'En vivo',
    'live.paused': 'Pausado',
    'timer.selectSubject': 'Selecciona una materia',
    'timer.focus': 'Enfoque',
    'timer.break': 'Descanso',
    'timer.longBreak': 'Descanso largo',
    'timer.paused': 'Pausado',
    'timer.sessionPaused': 'Sesión en pausa',
    'timer.start': 'Iniciar',
    'timer.pause': 'Pausar',
    'timer.resume': 'Reanudar',
    'timer.reset': 'Reiniciar',
    'timer.takeBreak': 'Descansar',
    'timer.keepStudying': 'Seguir estudiando',
    'timer.endSession': 'Terminar',
    'timer.minus5': 'Atrasar 5 min',
    'timer.minus1': 'Atrasar 1 min',
    'timer.plus1': 'Adelantar 1 min',
    'timer.plus5': 'Adelantar 5 min',
    'timer.cyclePrev': 'Retroceder fase',
    'timer.cycleNext': 'Avanzar fase',
    'timer.cycleReset': 'Reiniciar ciclo',
    'timer.registered': 'registradas',
    'timer.goalExceeded': 'Objetivo diario superado · {current}/{target}',
    'timer.goalMet': 'Objetivo diario cumplido · {current}/{target}',
    'timer.blocksRemainingOne': 'Te falta 1 bloque para el objetivo diario',
    'timer.blocksRemaining': 'Te faltan {count} bloques para el objetivo diario',
    'timer.notifyFocusTitle': 'Pomodoro terminado',
    'timer.notifyBreakTitle': 'Descanso terminado',
    'timer.notifyFocusBody': 'Es hora de un descanso.',
    'timer.notifyBreakBody': 'Es hora de volver al enfoque.',
    'timer.selectSubjectFirst': 'Selecciona una materia antes de empezar',
    'timer.selectSubjectToast': 'Selecciona una materia',
    'timer.invalidDuration': 'Duración inválida',
    'timer.selectDateTime': 'Selecciona fecha y hora',
    'timer.manualAdded': 'Pomodoro añadido: {min} min · {name}',
    'timer.hoursMinutes': '{h} h {m} min',
    'timer.hoursOnly': '{h} h',
    'timer.minutesOnly': '{m} min',
    'sessions.editTitle': 'Editar sesión',
    'sessions.updated': 'Sesión actualizada: {min} min · {name}',
    'sessions.deleted': 'Sesión eliminada (-{min} min)',
    'sessions.lastDeleted': 'Último pomodoro eliminado (-{min} min)',
    'sessions.noneToDelete': 'No hay sesiones que eliminar',
    'sessions.undo': 'Recuperar',
    'sessions.restored': 'Sesión recuperada (+{min} min)',
    'dash.title': 'Dashboard',
    'dash.emptyTitle': 'Aún no hay datos que mostrar',
    'dash.emptyDesc': 'Crea tu primera materia y completa un pomodoro para empezar a ver tu progreso aquí.',
    'dash.emptyBtn': 'Crear mi primera materia',
    'dash.weekHours': 'Horas esta semana',
    'dash.streak': 'Racha',
    'dash.streakBest': 'Récord',
    'dash.total': 'Total',
    'dash.historic': 'histórico',
    'dash.sessions': 'Sesiones',
    'dash.completed': 'completadas',
    'dash.filteredBy': 'Filtrado por: {name}',
    'dash.minutesPerDay': 'Minutos por día',
    'dash.weekSolo': 'Solo',
    'dash.weekCompare': 'vs semanal',
    'dash.weekPrev': 'Semana anterior',
    'dash.weekNext': 'Semana siguiente',
    'dash.thisWeek': 'Esta semana',
    'dash.lastWeek': 'Semana pasada',
    'dash.consistency': 'Consistencia de Estudio',
    'dash.heatmapPrev': 'Periodo anterior',
    'dash.heatmapNext': 'Periodo siguiente',
    'dash.less': 'Menos',
    'dash.more': 'Más',
    'dash.goldenDay': 'Día Dorado',
    'dash.strongestDay': 'Día más fuerte',
    'dash.historicTag': 'Histórico',
    'dash.performanceTag': 'Rendimiento',
    'dash.average': 'Media',
    'dash.topSubject': 'Top Mat.',
    'dash.analyzeDay': 'Analizar día',
    'dash.share': 'Compartir',
    'dash.save': 'Guardar',
    'dash.totalLabel': 'total',
    'dash.peakHours': 'Franja Horaria de Enfoque',
    'dash.peakHistoric': 'Histórico',
    'dash.peakToday': 'Hoy',
    'dash.peakHistoricDist': 'Distribución histórica',
    'dash.peakTodaySessions': 'Sesiones de hoy',
    'dash.noData': 'Sin datos',
    'dash.preference': 'Preferencia',
    'dash.maxFocus': 'Foco Máximo',
    'dash.todayTotal': 'Total hoy: <strong>{min} min</strong>',
    'dash.todaySessions': 'Hoy · {count} ses.',
    'dash.noSessionsToday': 'Sin sesiones hoy',
    'dash.peakTime': 'Hora Punta: {label}',
    'dash.preferenceLabel': 'Preferencia: <strong>{pref}</strong>',
    'dash.vsLastWeek': '{sign} {pct}% vs semana pasada',
    'dash.noChange': 'Sin cambio',
    'dash.dayDetailFocus': 'Tiempo enfocado',
    'dash.pomodoros': 'pomodoros',
    'dash.perSession': '/ sesión',
    'dash.timeline': 'Línea de tiempo',
    'dash.noSessionsDay': 'Sin sesiones este día',
    'dash.addSession': 'Añadir sesión',
    'dash.editSession': 'Editar sesión',
    'dash.deleteSession': 'Eliminar sesión',
    'dash.clickToManage': 'clic para gestionar',
    'dash.sessionN': 'Sesión {n}',
    'dash.noSubject': 'Sin materia',
    'dash.noActivity': 'Sin actividad este día',
    'dash.noActivityWeek': 'Sin actividad en ninguna semana',
    'dash.noActivityShort': 'Sin actividad',
    'dash.todayPrefix': 'Hoy · ',
    'dash.todayTooltip': 'Hoy, {date}: {minutes} minutos, {count} pomodoro{s}',
    'dash.todayTooltipEmpty': 'Hoy, {date}: sin actividad',
    'dash.heatmapEmpty': 'Completa tu primer pomodoro para empezar a ver tu constancia aquí',
    'dash.close': 'Cerrar',
    'dash.morning': 'Madrugador',
    'dash.afternoon': 'Estudiante de Tarde',
    'dash.night': 'Nocturno',
    'dash.shareGolden': 'Study Tracker — Día Dorado',
    'dash.shareGoldenText': 'Mi Día Dorado: {day} · {avg} de media · {sessions} sesiones · Top: {top}',
    'dash.shareMix': 'Study Tracker — Por Materia',
    'dash.shareMixText': 'Mi tiempo de estudio: {total} total · {lines}',
    'dash.filterBy': 'Filtrar por {name}',
    'subjects.title': 'Materias',
    'subjects.tabActive': 'Activas',
    'subjects.tabCompleted': 'Completadas',
    'subjects.tabArchived': 'Archivadas',
    'subjects.emptyTitle': 'Aún no tienes materias',
    'subjects.emptyDesc': 'Crea tu primera materia para empezar a organizar tus sesiones de estudio.',
    'subjects.emptyBtn': 'Crear mi primera materia',
    'subjects.tabEmptyActive': 'Todas tus materias activas han completado su objetivo. Revisa la pestaña Completadas.',
    'subjects.tabEmptyCompleted': 'Ninguna materia ha completado su objetivo todavía.',
    'subjects.tabEmptyArchived': 'No hay materias archivadas.',
    'subjects.addCard': 'Nueva materia',
    'subjects.sessions': 'sesiones',
    'subjects.lastSession': 'Última',
    'subjects.restore': 'Restaurar',
    'subjects.archive': 'Archivar',
    'subjects.edit': 'Editar',
    'subjects.delete': 'Eliminar',
    'subjects.newSubject': 'Nueva materia',
    'subjects.editSubject': 'Editar materia',
    'subjects.nameRequired': 'Ponle un nombre a la materia',
    'subjects.deleteDetail': 'También se eliminarán {sessions} sesiones y {hours} h registradas.',
    'subjects.deleteTitle': '¿Eliminar "{name}"?',
    'subjects.deleteConfirm': 'Eliminar materia',
    'subjects.deleteWarn': 'Esta acción no se puede deshacer.',
    'subjects.goalHintTime': 'Establece cuántos minutos quieres dedicar en el periodo elegido.',
    'subjects.goalHintUnits': 'Marca módulos o unidades completadas para seguir tu progreso.',
    'subjects.goalHintNone': 'Solo registrarás horas y sesiones, sin barra de progreso.',
    'subjects.goalHintDefault': 'Establece cuántos minutos quieres dedicar cada semana.',
    'subjects.name': 'Nombre',
    'subjects.namePlaceholder': 'Ej. FMVA, Programación…',
    'subjects.goal': 'Objetivo',
    'subjects.goalTime': 'Por tiempo',
    'subjects.goalUnits': 'Por unidades / módulos',
    'subjects.goalNone': 'Sin objetivo (solo seguimiento)',
    'subjects.goalTimePill': 'Tiempo',
    'subjects.goalUnitsPill': 'Módulos',
    'subjects.goalNonePill': 'Solo seguimiento',
    'subjects.period': 'Periodo',
    'subjects.periodWeek': 'Semanal',
    'subjects.periodDay': 'Diario',
    'subjects.targetMinutes': 'Meta (minutos)',
    'subjects.unitsTotal': 'Total',
    'subjects.unitsCompleted': 'Completadas',
    'subjects.unitsLabel': 'Etiqueta',
    'subjects.unitsDefault': 'módulos',
    'subjects.appearance': 'Apariencia',
    'subjects.cancel': 'Cancelar',
    'subjects.save': 'Guardar',
    'subjects.unitDown': 'Bajar {unit}',
    'subjects.unitRemove': 'Quitar un {unit}',
    'subjects.unitUp': 'Subir {unit}',
    'subjects.unitComplete': 'Completar un {unit}',
    'subjects.removeModule': 'Quitar un módulo',
    'subjects.completeModule': 'Completar un módulo',
    'settings.title': 'Ajustes',
    'settings.subtitle': 'Personaliza tu experiencia de estudio',
    'settings.timerSection': 'Temporizador',
    'settings.focusMin': 'Enfoque (min)',
    'settings.breakMin': 'Descanso corto (min)',
    'settings.longBreakMin': 'Descanso largo (min)',
    'settings.cycles': 'Ciclos antes del descanso largo',
    'settings.dailyGoal': 'Meta de pomodoros diarios',
    'settings.soundsSection': 'Sonidos y alarmas',
    'settings.soundEnabled': 'Sonido al terminar',
    'settings.soundEnabledDesc': 'Reproduce un tono cuando acaba un bloque',
    'settings.soundVolume': 'Volumen',
    'settings.soundVolumeValue': '{value}%',
    'settings.soundSpeed': 'Velocidad',
    'settings.soundSpeedValue': '{value}%',
    'settings.soundFocus': 'Al terminar pomodoro',
    'settings.soundBreak': 'Al terminar descanso corto',
    'settings.soundLongBreak': 'Al terminar descanso largo',
    'settings.soundRepeat': 'Repeticiones',
    'settings.soundRepeat1': '1 vez',
    'settings.soundRepeat2': '2 veces',
    'settings.soundRepeat3': '3 veces',
    'settings.soundPreview': 'Probar sonido',
    'settings.soundChange': 'Cambiar',
    'settings.soundPickerTitle': 'Elegir sonido',
    'settings.soundSelected': 'Activo',
    'settings.notificationsSection': 'Notificaciones',
    'settings.autoBreak': 'Descanso automático',
    'settings.autoBreakDesc': 'Inicia el descanso al terminar un pomodoro',
    'settings.notifications': 'Notificaciones del sistema',
    'settings.notificationsDesc': 'Avisa al terminar un bloque',
    'settings.notifyFocus': 'Al terminar pomodoro',
    'settings.notifyFocusDesc': 'Notificación cuando acaba el enfoque',
    'settings.notifyBreak': 'Al terminar descanso',
    'settings.notifyBreakDesc': 'Notificación cuando acaba un descanso',
    'sound.category.chimes': 'Campanas suaves',
    'sound.category.bells': 'Campanas',
    'sound.category.piano': 'Piano',
    'sound.category.digital': 'Digital',
    'sound.category.minimal': 'Minimal',
    'sound.preset.none': 'Silencio',
    'sound.preset.chime-major': 'Arpegio mayor',
    'sound.preset.chime-soft': 'Campana suave',
    'sound.preset.chime-minor': 'Arpegio menor',
    'sound.preset.chime-crystal': 'Cristal',
    'sound.preset.chime-floating': 'Flotante',
    'sound.preset.bell': 'Campana clásica',
    'sound.preset.bell-double': 'Doble campana',
    'sound.preset.bell-temple': 'Templo',
    'sound.preset.bell-digital': 'Campana digital',
    'sound.preset.piano-c': 'Nota Do',
    'sound.preset.piano-major': 'Arpegio de piano',
    'sound.preset.piano-glass': 'Cristal de piano',
    'sound.preset.beep-classic': 'Beep clásico',
    'sound.preset.beep-soft': 'Beep suave',
    'sound.preset.arcade': 'Arcade',
    'sound.preset.ping': 'Ping',
    'sound.preset.success': 'Éxito',
    'sound.preset.soft-tick': 'Tick suave',
    'sound.preset.zen': 'Zen',
    'sound.preset.water-drop': 'Gota de agua',
    'settings.languageSection': 'Idioma',
    'settings.languageLabel': 'Idioma de la app',
    'settings.langEs': 'Español',
    'settings.langEn': 'English',
    'settings.dataSection': 'Sesiones y datos',
    'settings.manualSessions': 'Sesiones manuales',
    'settings.manualDesc': 'Añade sesiones pasadas o elimina el último registro si te equivocaste.',
    'settings.addPomodoro': 'Añadir pomodoro',
    'settings.deleteLast': 'Borrar último',
    'settings.dataTitle': 'Datos',
    'settings.dataDesc': 'Tus registros se guardan en este navegador y se sincronizan automáticamente con la nube. Exporta una copia como respaldo extra.',
    'settings.export': 'Exportar',
    'settings.import': 'Importar',
    'settings.wipeAll': 'Borrar todos los datos',
    'settings.save': 'Guardar ajustes',
    'settings.saved': 'Ajustes guardados',
    'settings.wipeTitle': '¿Borrar todos los datos?',
    'settings.wipeText': 'Se eliminarán todas las materias, sesiones y ajustes guardados en este navegador.',
    'settings.wipeWarn': 'Esta acción no se puede deshacer. Considera exportar una copia antes de continuar.',
    'settings.wipeConfirm': 'Borrar todo',
    'settings.cancel': 'Cancelar',
    'settings.manualModalTitle': 'Añadir pomodoro manual',
    'settings.manualSubject': 'Materia',
    'settings.manualDuration': 'Duración (minutos)',
    'settings.manualDateTime': 'Fecha y hora',
    'settings.manualNotes': 'Notas (opcional)',
    'settings.manualNotesPlaceholder': '¿Qué estudiaste?',
    'settings.manualSave': 'Guardar sesión',
    'sync.synced': 'Sincronizado',
    'sync.syncing': 'Sincronizando…',
    'sync.offline': 'Guardando en local, esperando conexión',
    'sync.error': 'Error de sincronización',
    'sync.auth': 'Activa auth anónima en Supabase',
    'sync.disabled': 'Nube no configurada',
    'storage.corrupt': 'Datos locales dañados; se ha iniciado vacío',
    'storage.authHint': 'Activa Anonymous sign-ins en Supabase → Authentication → Providers',
    'storage.saveFailed': 'No se pudieron guardar los datos en este navegador',
    'storage.exported': 'Copia de seguridad exportada',
    'storage.readFailed': 'No se pudo leer el archivo',
    'storage.invalidFormat': 'El archivo no tiene un formato válido',
    'storage.readNotSaved': 'Los datos se leyeron pero no se pudieron guardar',
    'storage.imported': 'Datos importados y guardados correctamente',
    'storage.importFailed': 'No se pudo importar el archivo',
    'storage.wiped': 'Todos los datos han sido borrados',
    'streak.title': 'Racha',
    'streak.newStreak': 'Nueva racha',
    'streak.days': 'Días de Racha',
    'streak.tipEmpty': 'Completa tu primera sesión de hoy para encender la llama de tu racha.',
    'streak.tipRecord': '¡Récord personal! Llevas {days} días seguidos. Sigue así para superarte.',
    'streak.tipGrowing': 'Tu disciplina está creciendo. Cada sesión completada es un paso más cerca de tus metas de estudio.',
    'streak.tipBest': ' Tu récord: {days} días.',
    'goal.hoursToday': '{current} / {target} horas hoy',
    'goal.minToday': '{current} / {target} min hoy',
    'goal.minWeek': '{current} / {target} min esta semana',
    'subject.default': 'Materia',
    'subject.defaultName': 'Materia',
    'notes.title': 'Notas',
    'notes.subtitle': 'Tu espacio para ideas rápidas y recordatorios',
    'notes.searchPlaceholder': 'Buscar notas…',
    'notes.newNote': 'Nueva Nota',
    'notes.pinnedSection': 'Fijadas',
    'notes.otherSection': 'Otras Notas',
    'notes.empty': 'No se encontraron notas.',
    'notes.pin': 'Fijar',
    'notes.pinned': 'Fijada',
    'notes.delete': 'Eliminar nota',
    'notes.modalContentPlaceholder': 'Escribe tu nota…',
    'notes.lastEdited': 'Última edición: {date}',
    'notes.lastEditedNow': 'Última edición: Ahora',
    'notes.cancel': 'Cancelar',
    'notes.save': 'Guardar Nota'
  },
  en: {
    'brand.tagline': 'Focus and track',
    'nav.timer': 'Timer',
    'nav.dashboard': 'Dashboard',
    'nav.subjects': 'Subjects',
    'nav.notes': 'Notes',
    'nav.settings': 'Settings',
    'nav.collapse': 'Collapse',
    'nav.collapseMenu': 'Collapse sidebar',
    'nav.expandMenu': 'Expand sidebar',
    'live.backToTimer': 'Back to timer',
    'live.live': 'Live',
    'live.paused': 'Paused',
    'timer.selectSubject': 'Select a subject',
    'timer.focus': 'Focus',
    'timer.break': 'Break',
    'timer.longBreak': 'Long break',
    'timer.paused': 'Paused',
    'timer.sessionPaused': 'Session paused',
    'timer.start': 'Start',
    'timer.pause': 'Pause',
    'timer.resume': 'Resume',
    'timer.reset': 'Reset',
    'timer.takeBreak': 'Take a break',
    'timer.keepStudying': 'Keep studying',
    'timer.endSession': 'End session',
    'timer.minus5': 'Back 5 min',
    'timer.minus1': 'Back 1 min',
    'timer.plus1': 'Forward 1 min',
    'timer.plus5': 'Forward 5 min',
    'timer.cyclePrev': 'Previous phase',
    'timer.cycleNext': 'Next phase',
    'timer.cycleReset': 'Reset cycle',
    'timer.registered': 'logged',
    'timer.goalExceeded': 'Daily goal exceeded · {current}/{target}',
    'timer.goalMet': 'Daily goal reached · {current}/{target}',
    'timer.blocksRemainingOne': '1 block left to reach your daily goal',
    'timer.blocksRemaining': '{count} blocks left to reach your daily goal',
    'timer.notifyFocusTitle': 'Pomodoro finished',
    'timer.notifyBreakTitle': 'Break finished',
    'timer.notifyFocusBody': 'Time for a break.',
    'timer.notifyBreakBody': 'Time to get back to focus.',
    'timer.selectSubjectFirst': 'Select a subject before starting',
    'timer.selectSubjectToast': 'Select a subject',
    'timer.invalidDuration': 'Invalid duration',
    'timer.selectDateTime': 'Select date and time',
    'timer.manualAdded': 'Pomodoro added: {min} min · {name}',
    'timer.hoursMinutes': '{h} h {m} min',
    'timer.hoursOnly': '{h} h',
    'timer.minutesOnly': '{m} min',
    'sessions.editTitle': 'Edit session',
    'sessions.updated': 'Session updated: {min} min · {name}',
    'sessions.deleted': 'Session deleted (-{min} min)',
    'sessions.lastDeleted': 'Last pomodoro deleted (-{min} min)',
    'sessions.noneToDelete': 'No sessions to delete',
    'sessions.undo': 'Undo',
    'sessions.restored': 'Session restored (+{min} min)',
    'dash.title': 'Dashboard',
    'dash.emptyTitle': 'No data to show yet',
    'dash.emptyDesc': 'Create your first subject and complete a pomodoro to start seeing your progress here.',
    'dash.emptyBtn': 'Create my first subject',
    'dash.weekHours': 'Hours this week',
    'dash.streak': 'Streak',
    'dash.streakBest': 'Best',
    'dash.total': 'Total',
    'dash.historic': 'all time',
    'dash.sessions': 'Sessions',
    'dash.completed': 'completed',
    'dash.filteredBy': 'Filtered by: {name}',
    'dash.minutesPerDay': 'Minutes per day',
    'dash.weekSolo': 'Solo',
    'dash.weekCompare': 'vs weekly',
    'dash.weekPrev': 'Previous week',
    'dash.weekNext': 'Next week',
    'dash.thisWeek': 'This week',
    'dash.lastWeek': 'Last week',
    'dash.consistency': 'Study Consistency',
    'dash.heatmapPrev': 'Previous period',
    'dash.heatmapNext': 'Next period',
    'dash.less': 'Less',
    'dash.more': 'More',
    'dash.goldenDay': 'Golden Day',
    'dash.strongestDay': 'Strongest day',
    'dash.historicTag': 'Historic',
    'dash.performanceTag': 'Performance',
    'dash.average': 'Average',
    'dash.topSubject': 'Top subj.',
    'dash.analyzeDay': 'Analyze day',
    'dash.share': 'Share',
    'dash.save': 'Save',
    'dash.totalLabel': 'total',
    'dash.peakHours': 'Focus Time of Day',
    'dash.peakHistoric': 'Historic',
    'dash.peakToday': 'Today',
    'dash.peakHistoricDist': 'Historical distribution',
    'dash.peakTodaySessions': "Today's sessions",
    'dash.noData': 'No data',
    'dash.preference': 'Preference',
    'dash.maxFocus': 'Peak focus',
    'dash.todayTotal': 'Today total: <strong>{min} min</strong>',
    'dash.todaySessions': 'Today · {count} sess.',
    'dash.noSessionsToday': 'No sessions today',
    'dash.peakTime': 'Peak hour: {label}',
    'dash.preferenceLabel': 'Preference: <strong>{pref}</strong>',
    'dash.vsLastWeek': '{sign} {pct}% vs last week',
    'dash.noChange': 'No change',
    'dash.dayDetailFocus': 'Focused time',
    'dash.pomodoros': 'pomodoros',
    'dash.perSession': '/ session',
    'dash.timeline': 'Timeline',
    'dash.noSessionsDay': 'No sessions this day',
    'dash.addSession': 'Add session',
    'dash.editSession': 'Edit session',
    'dash.deleteSession': 'Delete session',
    'dash.clickToManage': 'click to manage',
    'dash.sessionN': 'Session {n}',
    'dash.noSubject': 'No subject',
    'dash.noActivity': 'No activity this day',
    'dash.noActivityWeek': 'No activity in any week',
    'dash.noActivityShort': 'No activity',
    'dash.todayPrefix': 'Today · ',
    'dash.todayTooltip': 'Today, {date}: {minutes} minutes, {count} pomodoro{s}',
    'dash.todayTooltipEmpty': 'Today, {date}: no activity',
    'dash.heatmapEmpty': 'Complete your first pomodoro to start seeing your consistency here',
    'dash.close': 'Close',
    'dash.morning': 'Early bird',
    'dash.afternoon': 'Afternoon learner',
    'dash.night': 'Night owl',
    'dash.shareGolden': 'Study Tracker — Golden Day',
    'dash.shareGoldenText': 'My Golden Day: {day} · {avg} average · {sessions} sessions · Top: {top}',
    'dash.shareMix': 'Study Tracker — By Subject',
    'dash.shareMixText': 'My study time: {total} total · {lines}',
    'dash.filterBy': 'Filter by {name}',
    'subjects.title': 'Subjects',
    'subjects.tabActive': 'Active',
    'subjects.tabCompleted': 'Completed',
    'subjects.tabArchived': 'Archived',
    'subjects.emptyTitle': 'No subjects yet',
    'subjects.emptyDesc': 'Create your first subject to start organizing your study sessions.',
    'subjects.emptyBtn': 'Create my first subject',
    'subjects.tabEmptyActive': 'All your active subjects have completed their goal. Check the Completed tab.',
    'subjects.tabEmptyCompleted': 'No subject has completed its goal yet.',
    'subjects.tabEmptyArchived': 'No archived subjects.',
    'subjects.addCard': 'New subject',
    'subjects.sessions': 'sessions',
    'subjects.lastSession': 'Last',
    'subjects.restore': 'Restore',
    'subjects.archive': 'Archive',
    'subjects.edit': 'Edit',
    'subjects.delete': 'Delete',
    'subjects.newSubject': 'New subject',
    'subjects.editSubject': 'Edit subject',
    'subjects.nameRequired': 'Give the subject a name',
    'subjects.deleteDetail': '{sessions} sessions and {hours} h logged will also be deleted.',
    'subjects.deleteTitle': 'Delete "{name}"?',
    'subjects.deleteConfirm': 'Delete subject',
    'subjects.deleteWarn': 'This action cannot be undone.',
    'subjects.goalHintTime': 'Set how many minutes you want to dedicate in the chosen period.',
    'subjects.goalHintUnits': 'Track completed modules or units to follow your progress.',
    'subjects.goalHintNone': 'You will only log hours and sessions, without a progress bar.',
    'subjects.goalHintDefault': 'Set how many minutes you want to dedicate each week.',
    'subjects.name': 'Name',
    'subjects.namePlaceholder': 'E.g. Calculus, Programming…',
    'subjects.goal': 'Goal',
    'subjects.goalTime': 'By time',
    'subjects.goalUnits': 'By units / modules',
    'subjects.goalNone': 'No goal (tracking only)',
    'subjects.goalTimePill': 'Time',
    'subjects.goalUnitsPill': 'Modules',
    'subjects.goalNonePill': 'Tracking only',
    'subjects.period': 'Period',
    'subjects.periodWeek': 'Weekly',
    'subjects.periodDay': 'Daily',
    'subjects.targetMinutes': 'Target (minutes)',
    'subjects.unitsTotal': 'Total',
    'subjects.unitsCompleted': 'Completed',
    'subjects.unitsLabel': 'Label',
    'subjects.unitsDefault': 'modules',
    'subjects.appearance': 'Appearance',
    'subjects.cancel': 'Cancel',
    'subjects.save': 'Save',
    'subjects.unitDown': 'Lower {unit}',
    'subjects.unitRemove': 'Remove one {unit}',
    'subjects.unitUp': 'Raise {unit}',
    'subjects.unitComplete': 'Complete one {unit}',
    'subjects.removeModule': 'Remove one module',
    'subjects.completeModule': 'Complete one module',
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your study experience',
    'settings.timerSection': 'Timer',
    'settings.focusMin': 'Focus (min)',
    'settings.breakMin': 'Short break (min)',
    'settings.longBreakMin': 'Long break (min)',
    'settings.cycles': 'Cycles before long break',
    'settings.dailyGoal': 'Daily pomodoro goal',
    'settings.soundsSection': 'Sounds & alarms',
    'settings.soundEnabled': 'Sound on finish',
    'settings.soundEnabledDesc': 'Play a tone when a block ends',
    'settings.soundVolume': 'Volume',
    'settings.soundVolumeValue': '{value}%',
    'settings.soundSpeed': 'Speed',
    'settings.soundSpeedValue': '{value}%',
    'settings.soundFocus': 'When pomodoro ends',
    'settings.soundBreak': 'When short break ends',
    'settings.soundLongBreak': 'When long break ends',
    'settings.soundRepeat': 'Repetitions',
    'settings.soundRepeat1': '1 time',
    'settings.soundRepeat2': '2 times',
    'settings.soundRepeat3': '3 times',
    'settings.soundPreview': 'Preview sound',
    'settings.soundChange': 'Change',
    'settings.soundPickerTitle': 'Choose sound',
    'settings.soundSelected': 'Active',
    'settings.notificationsSection': 'Notifications',
    'settings.autoBreak': 'Auto break',
    'settings.autoBreakDesc': 'Start the break when a pomodoro ends',
    'settings.notifications': 'System notifications',
    'settings.notificationsDesc': 'Notify when a block finishes',
    'settings.notifyFocus': 'When pomodoro ends',
    'settings.notifyFocusDesc': 'Notification when focus ends',
    'settings.notifyBreak': 'When break ends',
    'settings.notifyBreakDesc': 'Notification when a break ends',
    'sound.category.chimes': 'Soft chimes',
    'sound.category.bells': 'Bells',
    'sound.category.piano': 'Piano',
    'sound.category.digital': 'Digital',
    'sound.category.minimal': 'Minimal',
    'sound.preset.none': 'Silent',
    'sound.preset.chime-major': 'Major arpeggio',
    'sound.preset.chime-soft': 'Soft chime',
    'sound.preset.chime-minor': 'Minor arpeggio',
    'sound.preset.chime-crystal': 'Crystal',
    'sound.preset.chime-floating': 'Floating',
    'sound.preset.bell': 'Classic bell',
    'sound.preset.bell-double': 'Double bell',
    'sound.preset.bell-temple': 'Temple',
    'sound.preset.bell-digital': 'Digital bell',
    'sound.preset.piano-c': 'C note',
    'sound.preset.piano-major': 'Piano arpeggio',
    'sound.preset.piano-glass': 'Glass piano',
    'sound.preset.beep-classic': 'Classic beep',
    'sound.preset.beep-soft': 'Soft beep',
    'sound.preset.arcade': 'Arcade',
    'sound.preset.ping': 'Ping',
    'sound.preset.success': 'Success',
    'sound.preset.soft-tick': 'Soft tick',
    'sound.preset.zen': 'Zen',
    'sound.preset.water-drop': 'Water drop',
    'settings.languageSection': 'Language',
    'settings.languageLabel': 'App language',
    'settings.langEs': 'Español',
    'settings.langEn': 'English',
    'settings.dataSection': 'Sessions & data',
    'settings.manualSessions': 'Manual sessions',
    'settings.manualDesc': 'Add past sessions or delete the last entry if you made a mistake.',
    'settings.addPomodoro': 'Add pomodoro',
    'settings.deleteLast': 'Delete last',
    'settings.dataTitle': 'Data',
    'settings.dataDesc': 'Your records are saved in this browser and sync automatically to the cloud. Export a copy as an extra backup.',
    'settings.export': 'Export',
    'settings.import': 'Import',
    'settings.wipeAll': 'Delete all data',
    'settings.save': 'Save settings',
    'settings.saved': 'Settings saved',
    'settings.wipeTitle': 'Delete all data?',
    'settings.wipeText': 'All subjects, sessions and settings saved in this browser will be deleted.',
    'settings.wipeWarn': 'This action cannot be undone. Consider exporting a backup before continuing.',
    'settings.wipeConfirm': 'Delete everything',
    'settings.cancel': 'Cancel',
    'settings.manualModalTitle': 'Add manual pomodoro',
    'settings.manualSubject': 'Subject',
    'settings.manualDuration': 'Duration (minutes)',
    'settings.manualDateTime': 'Date and time',
    'settings.manualNotes': 'Notes (optional)',
    'settings.manualNotesPlaceholder': 'What did you study?',
    'settings.manualSave': 'Save session',
    'sync.synced': 'Synced',
    'sync.syncing': 'Syncing…',
    'sync.offline': 'Saving locally, waiting for connection',
    'sync.error': 'Sync error',
    'sync.auth': 'Enable anonymous auth in Supabase',
    'sync.disabled': 'Cloud not configured',
    'storage.corrupt': 'Local data corrupted; started empty',
    'storage.authHint': 'Enable Anonymous sign-ins in Supabase → Authentication → Providers',
    'storage.saveFailed': 'Could not save data in this browser',
    'storage.exported': 'Backup exported',
    'storage.readFailed': 'Could not read the file',
    'storage.invalidFormat': 'The file is not in a valid format',
    'storage.readNotSaved': 'Data was read but could not be saved',
    'storage.imported': 'Data imported and saved successfully',
    'storage.importFailed': 'Could not import the file',
    'storage.wiped': 'All data has been deleted',
    'streak.title': 'Streak',
    'streak.newStreak': 'New streak',
    'streak.days': 'Streak Days',
    'streak.tipEmpty': 'Complete your first session today to light your streak flame.',
    'streak.tipRecord': 'Personal record! You are on a {days}-day streak. Keep going to beat yourself.',
    'streak.tipGrowing': 'Your discipline is growing. Every completed session brings you closer to your study goals.',
    'streak.tipBest': ' Your best: {days} days.',
    'goal.hoursToday': '{current} / {target} hours today',
    'goal.minToday': '{current} / {target} min today',
    'goal.minWeek': '{current} / {target} min this week',
    'subject.default': 'Subject',
    'subject.defaultName': 'Subject',
    'notes.title': 'Notes',
    'notes.subtitle': 'Your space for quick ideas and reminders',
    'notes.searchPlaceholder': 'Search notes…',
    'notes.newNote': 'New Note',
    'notes.pinnedSection': 'Pinned',
    'notes.otherSection': 'Other Notes',
    'notes.empty': 'No notes found.',
    'notes.pin': 'Pin',
    'notes.pinned': 'Pinned',
    'notes.delete': 'Delete note',
    'notes.modalContentPlaceholder': 'Write your note…',
    'notes.lastEdited': 'Last edited: {date}',
    'notes.lastEditedNow': 'Last edited: Now',
    'notes.cancel': 'Cancel',
    'notes.save': 'Save Note'
  }
};

const DOM_BINDINGS = [
  { sel: '.brand-tagline', key: 'brand.tagline' },
  { sel: 'nav button[data-view="timer"] .nav-label', key: 'nav.timer' },
  { sel: 'nav button[data-view="dashboard"] .nav-label', key: 'nav.dashboard' },
  { sel: 'nav button[data-view="materias"] .nav-label', key: 'nav.subjects' },
  { sel: 'nav button[data-view="notas"] .nav-label', key: 'nav.notes' },
  { sel: 'nav button[data-view="ajustes"] .nav-label', key: 'nav.settings' },
  { sel: '#notesTitle', key: 'notes.title' },
  { sel: '#notesSubtitle', key: 'notes.subtitle' },
  { sel: '#notesSearch', key: 'notes.searchPlaceholder', attr: 'placeholder' },
  { sel: '#notesNewBtn span', key: 'notes.newNote' },
  { sel: '#noteContentInput', key: 'notes.modalContentPlaceholder', attr: 'placeholder' },
  { sel: '#noteModalCancelBtn', key: 'notes.cancel' },
  { sel: '#noteModalSaveBtn', key: 'notes.save' },
  { sel: '.nav-toggle-label', key: 'nav.collapse' },
  { sel: '#liveSessionBtn', key: 'live.backToTimer', attr: 'aria-label' },
  { sel: '#subjectSelectLabel', key: 'timer.selectSubject' },
  { sel: '#startBtn', key: 'timer.start' },
  { sel: '#resetBtn', key: 'timer.reset' },
  { sel: '#continueFocusBtn', key: 'timer.keepStudying' },
  { sel: '#endSessionBtn', key: 'timer.endSession' },
  { sel: '#minus5Btn', key: 'timer.minus5', attr: 'title' },
  { sel: '#minus1Btn', key: 'timer.minus1', attr: 'title' },
  { sel: '#plus1Btn', key: 'timer.plus1', attr: 'title' },
  { sel: '#plus5Btn', key: 'timer.plus5', attr: 'title' },
  { sel: '#cyclePrevBtn', key: 'timer.cyclePrev', attr: 'title' },
  { sel: '#cyclePrevBtn', key: 'timer.cyclePrev', attr: 'aria-label' },
  { sel: '#cycleNextBtn', key: 'timer.cycleNext', attr: 'title' },
  { sel: '#cycleNextBtn', key: 'timer.cycleNext', attr: 'aria-label' },
  { sel: '#cycleResetBtn', key: 'timer.cycleReset', attr: 'title' },
  { sel: '#cycleResetBtn', key: 'timer.cycleReset', attr: 'aria-label' },
  { sel: '#view-dashboard .dash-header h2', key: 'dash.title' },
  { sel: '#dashEmptyWrap h3', key: 'dash.emptyTitle' },
  { sel: '#dashEmptyWrap p', key: 'dash.emptyDesc' },
  { sel: '#emptyStateGoSubjects', key: 'dash.emptyBtn' },
  { sel: '#dashContentWrap .hero-stat .stat-label', key: 'dash.weekHours' },
  { sel: '.hero-mini--streak .hero-mini-label', key: 'dash.streak' },
  { sel: '.hero-mini--total .hero-mini-label', key: 'dash.total' },
  { sel: '.hero-mini--total .hero-mini-sub', key: 'dash.historic' },
  { sel: '.hero-mini--sessions .hero-mini-label', key: 'dash.sessions' },
  { sel: '.hero-mini--sessions .hero-mini-sub', key: 'dash.completed' },
  { sel: '#weekChartCard .card-title-text', key: 'dash.minutesPerDay' },
  { sel: '#weekBtnSolo', key: 'dash.weekSolo' },
  { sel: '#weekBtnCompare', key: 'dash.weekCompare' },
  { sel: '#weekPrevBtn', key: 'dash.weekPrev', attr: 'title' },
  { sel: '#weekNextBtn', key: 'dash.weekNext', attr: 'title' },
  { sel: '#heatmapCard > .card-title', key: 'dash.consistency', textOnly: true },
  { sel: '#heatmapPrevBtn', key: 'dash.heatmapPrev', attr: 'title' },
  { sel: '#heatmapPrevBtn', key: 'dash.heatmapPrev', attr: 'aria-label' },
  { sel: '#heatmapNextBtn', key: 'dash.heatmapNext', attr: 'title' },
  { sel: '#heatmapNextBtn', key: 'dash.heatmapNext', attr: 'aria-label' },
  { sel: '.heatmap-legend span:first-child', key: 'dash.less' },
  { sel: '.heatmap-legend span:last-child', key: 'dash.more' },
  { sel: '.dd-subline', key: 'dash.goldenDay', composite: 'goldenDaySubline' },
  { sel: '.dd-tags .dd-tag:first-child', key: 'dash.historicTag' },
  { sel: '.dd-tags .dd-tag:last-child', key: 'dash.performanceTag' },
  { sel: '#diaDoradoCard .dd-stat:nth-child(1) .dd-stat-label', key: 'dash.average' },
  { sel: '#diaDoradoCard .dd-stat:nth-child(3) .dd-stat-label', key: 'dash.sessions' },
  { sel: '#diaDoradoCard .dd-stat:nth-child(5) .dd-stat-label', key: 'dash.topSubject' },
  { sel: '#ddAnalyzeBtn', key: 'dash.analyzeDay', buttonText: true },
  { sel: '#ddShareBtn', key: 'dash.share', attr: 'title' },
  { sel: '#ddShareBtn', key: 'dash.share', attr: 'aria-label' },
  { sel: '#ddBookmarkBtn', key: 'dash.save', attr: 'title' },
  { sel: '#ddBookmarkBtn', key: 'dash.save', attr: 'aria-label' },
  { sel: '#smShareBtn', key: 'dash.share', attr: 'title' },
  { sel: '#smShareBtn', key: 'dash.share', attr: 'aria-label' },
  { sel: '.sm-donut-center-label', key: 'dash.totalLabel' },
  { sel: '.ph-title', key: 'dash.peakHours' },
  { sel: '#phBtnHistoric', key: 'dash.peakHistoric' },
  { sel: '#phBtnToday', key: 'dash.peakToday' },
  { sel: '#view-materias .dash-header h2', key: 'subjects.title' },
  { sel: '.materias-tab[data-tab="activas"]', key: 'subjects.tabActive' },
  { sel: '.materias-tab[data-tab="completadas"]', key: 'subjects.tabCompleted' },
  { sel: '.materias-tab[data-tab="archivadas"]', key: 'subjects.tabArchived' },
  { sel: '#subjectsEmptyWrap h3', key: 'subjects.emptyTitle' },
  { sel: '#subjectsEmptyWrap p', key: 'subjects.emptyDesc' },
  { sel: '#emptyStateAddSubject', key: 'subjects.emptyBtn' },
  { sel: '#view-ajustes .settings-header h2', key: 'settings.title' },
  { sel: '.settings-subtitle', key: 'settings.subtitle' },
  { sel: '#view-ajustes .settings-column:first-child .settings-section:first-child .settings-section-title', key: 'settings.timerSection' },
  { sel: '#view-ajustes .settings-grid .field:nth-child(1) label', key: 'settings.focusMin' },
  { sel: '#view-ajustes .settings-grid .field:nth-child(2) label', key: 'settings.breakMin' },
  { sel: '#view-ajustes .settings-grid .field:nth-child(3) label', key: 'settings.longBreakMin' },
  { sel: '#view-ajustes .settings-grid .field:nth-child(4) label', key: 'settings.cycles' },
  { sel: '#view-ajustes .settings-grid .field:nth-child(5) label', key: 'settings.dailyGoal' },
  { sel: '#view-ajustes .settings-column:first-child .settings-section:nth-child(2) .settings-section-title', key: 'settings.soundsSection' },
  { sel: '#view-ajustes .settings-column:first-child .settings-section:nth-child(3) .settings-section-title', key: 'settings.notificationsSection' },
  { sel: '#languageSectionTitle', key: 'settings.languageSection' },
  { sel: 'label[for="languageSelect"]', key: 'settings.languageLabel' },
  { sel: '#dataSectionTitle', key: 'settings.dataSection' },
  { sel: '.settings-card-subtitle', key: 'settings.manualSessions', first: true },
  { sel: '.settings-card-desc', key: 'settings.manualDesc', first: true },
  { sel: '#addManualBtn', key: 'settings.addPomodoro', buttonText: true },
  { sel: '#exportDataBtn', key: 'settings.export', buttonText: true },
  { sel: '#importDataBtn', key: 'settings.import', buttonText: true },
  { sel: '#wipeDataBtn', key: 'settings.wipeAll', buttonText: true },
  { sel: '#saveSettingsBtn', key: 'settings.save' },
  { sel: '#wipeDataModal h3', key: 'settings.wipeTitle' },
  { sel: '#wipeDataModal .modal-text', key: 'settings.wipeText' },
  { sel: '#wipeDataModal .modal-warn', key: 'settings.wipeWarn' },
  { sel: '#wipeDataConfirmBtn', key: 'settings.wipeConfirm' },
  { sel: '#wipeDataCancelBtn', key: 'settings.cancel' },
  { sel: '#manualModal h3', key: 'settings.manualModalTitle' },
  { sel: '#manualModal .field:nth-child(1) label', key: 'settings.manualSubject' },
  { sel: '#manualModal .field:nth-child(2) label', key: 'settings.manualDuration' },
  { sel: '#manualModal .field:nth-child(3) label', key: 'settings.manualDateTime' },
  { sel: '#manualModal .field:nth-child(4) label', key: 'settings.manualNotes' },
  { sel: '#manualNotes', key: 'settings.manualNotesPlaceholder', attr: 'placeholder' },
  { sel: '#manualSaveBtn', key: 'settings.manualSave' },
  { sel: '#manualCancelBtn', key: 'settings.cancel' },
  { sel: '#subjectModalTitle', key: 'subjects.newSubject' },
  { sel: 'label[for="subjectNameInput"]', key: 'subjects.name' },
  { sel: '#subjectNameInput', key: 'subjects.namePlaceholder', attr: 'placeholder' },
  { sel: '.subject-modal-section-label', key: 'subjects.goal', first: true },
  { sel: '.goal-type-pill[data-goal-type="time"]', key: 'subjects.goalTimePill', buttonText: true },
  { sel: '.goal-type-pill[data-goal-type="units"]', key: 'subjects.goalUnitsPill', buttonText: true },
  { sel: '.goal-type-pill[data-goal-type="none"]', key: 'subjects.goalNonePill', buttonText: true },
  { sel: '#subjectGoalTimeFields label', key: 'subjects.period', first: true },
  { sel: '.period-pill[data-period="week"]', key: 'subjects.periodWeek' },
  { sel: '.period-pill[data-period="day"]', key: 'subjects.periodDay' },
  { sel: 'label[for="subjectTargetInput"]', key: 'subjects.targetMinutes' },
  { sel: 'label[for="subjectUnitsTargetInput"]', key: 'subjects.unitsTotal' },
  { sel: 'label[for="subjectUnitsCompletedInput"]', key: 'subjects.unitsCompleted' },
  { sel: 'label[for="subjectUnitsLabelInput"]', key: 'subjects.unitsLabel' },
  { sel: '.subject-modal-section--last .subject-modal-section-label', key: 'subjects.appearance' },
  { sel: '#subjectCancelBtn', key: 'subjects.cancel' },
  { sel: '#subjectSaveBtn', key: 'subjects.save' },
  { sel: '#deleteSubjectConfirmBtn', key: 'subjects.deleteConfirm' },
  { sel: '#deleteSubjectCancelBtn', key: 'subjects.cancel' },
  { sel: '#deleteSubjectModal p[style*="color:var(--red)"]', key: 'subjects.deleteWarn' },
  { sel: '#dayDetailHero .day-detail-hero-label', key: 'dash.dayDetailFocus' },
  { sel: '#dayDetailChipCount', key: 'dash.pomodoros', suffix: ' suffix' },
  { sel: '#dayDetailChipAvg', key: 'dash.perSession', suffix: ' suffix' },
  { sel: '.day-detail-section-title', key: 'dash.timeline' },
  { sel: '#dayDetailAddBtn', key: 'dash.addSession', attr: 'aria-label' },
  { sel: '#streakDetailHeading', key: 'streak.title' },
  { sel: '.streak-detail-label', key: 'streak.days' }
];

let refreshCallback = null;

export function getLocale() {
  return currentLang;
}

export function getDateLocale() {
  return getLocale() === 'en' ? 'en-US' : 'es-ES';
}

export function t(key, params = {}) {
  const locale = getLocale();
  let str = MESSAGES[locale]?.[key] ?? MESSAGES.es[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return str;
}

export function getSyncLabel(status) {
  const key = `sync.${status}`;
  return MESSAGES[getLocale()]?.[key] ?? MESSAGES.es[key] ?? status;
}

export function getWeekdayLabelsShort() {
  return getLocale() === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
}

export function getWeekdayLabelsFull() {
  return getLocale() === 'en'
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
}

export function getStreakWeekdayLabels() {
  return getLocale() === 'en'
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
}

function setButtonText(el, text) {
  const textNodes = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (textNodes.length) {
    textNodes[0].textContent = text;
    for (let i = 1; i < textNodes.length; i++) textNodes[i].remove();
    return;
  }
  let tail = el.querySelector(':scope > .i18n-text');
  if (!tail && el.querySelector('svg')) {
    tail = document.createElement('span');
    tail.className = 'i18n-text';
    el.appendChild(tail);
  }
  if (tail) tail.textContent = text;
  else el.textContent = text;
}

function applyBinding(binding) {
  let el = document.querySelector(binding.sel);
  if (!el) return;

  if (binding.first) {
    const all = document.querySelectorAll(binding.sel);
    el = binding.first === true ? all[0] : all[binding.first];
    if (!el) return;
  }

  if (binding.parent) {
    el = document.querySelector(binding.parent)?.querySelector(binding.labelSibling || binding.sel);
    if (!el) return;
  } else if (binding.labelSibling) {
    el = document.getElementById(binding.sel.replace('#', ''))?.closest('.field-toggle')?.querySelector(binding.labelSibling);
    if (!el && binding.sel.startsWith('#')) {
      const input = document.querySelector(binding.sel);
      el = input?.closest('.field-toggle')?.querySelector(binding.labelSibling);
    }
    if (!el) return;
  }

  let text = t(binding.key);

  if (binding.composite === 'goldenDaySubline') {
    el.innerHTML = `${t('dash.goldenDay')} <span class="dd-dot">•</span> ${t('dash.strongestDay')}`;
    return;
  }

  if (binding.suffix === ' suffix') {
    const chip = document.querySelector(binding.sel);
    if (chip) {
      const span = chip.querySelector('span[id]');
      if (span) chip.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
      chip.appendChild(document.createTextNode(' ' + text));
    }
    return;
  }

  if (binding.suffix) {
    const bestEl = document.getElementById('statStreakBest');
    if (bestEl) el.innerHTML = text + '<span id="statStreakBest">' + bestEl.textContent + '</span>';
    else el.textContent = text;
    return;
  }

  if (binding.attr === 'placeholder') {
    el.placeholder = text;
  } else if (binding.attr === 'aria-label') {
    el.setAttribute('aria-label', text);
  } else if (binding.attr === 'title') {
    el.title = text;
  } else if (binding.buttonText) {
    setButtonText(el, text);
  } else if (binding.textOnly && el.childNodes.length > 1) {
    const nav = el.querySelector('.week-nav');
    el.childNodes[0].textContent = text + ' ';
    if (nav && el.lastElementChild !== nav) el.appendChild(nav);
  } else {
    el.textContent = text;
  }
}

function updateToggleLabels() {
  const autoToggle = document.getElementById('autoStartBreakInput')?.closest('.field-toggle');
  if (autoToggle) {
    autoToggle.querySelector('.field-toggle-label').textContent = t('settings.autoBreak');
    autoToggle.querySelector('.field-toggle-desc').textContent = t('settings.autoBreakDesc');
  }
  const notifyAllToggle = document.getElementById('notifyOnFinishInput')?.closest('.field-toggle');
  if (notifyAllToggle) {
    notifyAllToggle.querySelector('.field-toggle-label').textContent = t('settings.notifications');
    notifyAllToggle.querySelector('.field-toggle-desc').textContent = t('settings.notificationsDesc');
  }
  const notifyFocusToggle = document.getElementById('notifyOnFocusFinishInput')?.closest('.field-toggle');
  if (notifyFocusToggle) {
    notifyFocusToggle.querySelector('.field-toggle-label').textContent = t('settings.notifyFocus');
    notifyFocusToggle.querySelector('.field-toggle-desc').textContent = t('settings.notifyFocusDesc');
  }
  const notifyBreakToggle = document.getElementById('notifyOnBreakFinishInput')?.closest('.field-toggle');
  if (notifyBreakToggle) {
    notifyBreakToggle.querySelector('.field-toggle-label').textContent = t('settings.notifyBreak');
    notifyBreakToggle.querySelector('.field-toggle-desc').textContent = t('settings.notifyBreakDesc');
  }
  const soundToggle = document.getElementById('soundEnabledInput')?.closest('.field-toggle');
  if (soundToggle) {
    soundToggle.querySelector('.field-toggle-label').textContent = t('settings.soundEnabled');
    soundToggle.querySelector('.field-toggle-desc').textContent = t('settings.soundEnabledDesc');
  }
}

function updateSoundSettingsLabels() {
  const map = [
    ['soundVolumeLabel', 'settings.soundVolume'],
    ['soundSpeedLabel', 'settings.soundSpeed'],
    ['soundFocusLabel', 'settings.soundFocus'],
    ['soundBreakLabel', 'settings.soundBreak'],
    ['soundLongBreakLabel', 'settings.soundLongBreak'],
    ['soundRepeatLabel', 'settings.soundRepeat']
  ];
  map.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  const volumeValue = document.getElementById('soundVolumeValue');
  const volumeInput = document.getElementById('soundVolumeInput');
  if (volumeValue && volumeInput) {
    volumeValue.textContent = t('settings.soundVolumeValue', { value: volumeInput.value });
  }

  const speedValue = document.getElementById('soundSpeedValue');
  const speedInput = document.getElementById('soundSpeedInput');
  if (speedValue && speedInput) {
    speedValue.textContent = t('settings.soundSpeedValue', { value: speedInput.value });
  }

  ['soundFocusAction', 'soundBreakAction', 'soundLongBreakAction'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t('settings.soundChange');
  });

  const pickerTitle = document.getElementById('soundPickerTitle');
  if (pickerTitle && !document.getElementById('soundPickerPanel')?.classList.contains('hidden')) {
    pickerTitle.textContent = t('settings.soundPickerTitle');
  }

  document.querySelectorAll('.sound-slot-play').forEach((btn) => {
    btn.setAttribute('aria-label', t('settings.soundPreview'));
    btn.title = t('settings.soundPreview');
  });

  const closeBtn = document.getElementById('soundPickerClose');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('settings.cancel'));
}

function updateStreakBestLabel() {
  const streakSub = document.querySelector('.hero-mini--streak .hero-mini-sub');
  if (streakSub) {
    const best = document.getElementById('statStreakBest')?.textContent || '0';
    streakSub.innerHTML = `${t('dash.streakBest')} <span id="statStreakBest">${best}</span>`;
  }
}

function updateDataSectionSecondGroup() {
  const groups = document.querySelectorAll('.settings-card-group');
  if (groups.length >= 2) {
    const dataGroup = groups[1];
    const subtitle = dataGroup.querySelector('.settings-card-subtitle');
    const desc = dataGroup.querySelector('.settings-card-desc');
    if (subtitle) subtitle.textContent = t('settings.dataTitle');
    if (desc) desc.textContent = t('settings.dataDesc');
  }
  const deleteLastBtn = document.getElementById('deleteLastBtn');
  if (deleteLastBtn) setButtonText(deleteLastBtn, t('settings.deleteLast'));
}

function updateNavToggleAria() {
  const nav = document.querySelector('nav');
  const btn = document.getElementById('navToggleBtn');
  if (!nav || !btn) return;
  const collapsed = nav.classList.contains('collapsed');
  btn.setAttribute('aria-label', t(collapsed ? 'nav.expandMenu' : 'nav.collapseMenu'));
  btn.title = btn.getAttribute('aria-label');
}

function updateLanguageSelectOptions() {
  const sel = document.getElementById('languageSelect');
  if (!sel) return;
  const esOpt = sel.querySelector('option[value="es"]');
  const enOpt = sel.querySelector('option[value="en"]');
  if (esOpt) esOpt.textContent = t('settings.langEs');
  if (enOpt) enOpt.textContent = t('settings.langEn');
}

export function applyStaticTranslations() {
  document.documentElement.lang = getLocale();
  document.title = 'Study Tracker';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.hasAttribute('data-i18n-placeholder')) el.placeholder = t(key);
    else if (el.hasAttribute('data-i18n-aria')) el.setAttribute('aria-label', t(key));
    else el.textContent = t(key);
  });

  DOM_BINDINGS.forEach(applyBinding);
  updateToggleLabels();
  updateSoundSettingsLabels();
  updateStreakBestLabel();
  updateDataSectionSecondGroup();
  updateNavToggleAria();
  updateLanguageSelectOptions();

  const pomChip = document.getElementById('dayDetailChipCount');
  if (pomChip) {
    const countSpan = document.getElementById('dayDetailCount');
    pomChip.innerHTML = pomChip.querySelector('svg')?.outerHTML || '';
    if (countSpan) {
      pomChip.insertAdjacentHTML('beforeend', `<span id="dayDetailCount">${countSpan.textContent}</span> ${t('dash.pomodoros')}`);
    }
  }
  const avgChip = document.getElementById('dayDetailChipAvg');
  if (avgChip) {
    const avgSpan = document.getElementById('dayDetailAvg');
    const avgVal = avgSpan?.textContent || '0m';
    avgChip.innerHTML = avgChip.querySelector('svg')?.outerHTML || '';
    avgChip.insertAdjacentHTML('beforeend', `<span id="dayDetailAvg">${avgVal}</span> ${t('dash.perSession')}`);
  }

  const phFoot = document.querySelector('.ph-footer .ph-foot-item:last-child');
  if (phFoot) {
    const peakDetail = document.getElementById('phPeakDetail');
    phFoot.innerHTML = `${t('dash.maxFocus')}: <strong id="phPeakDetail">${peakDetail?.textContent || '—'}</strong>`;
  }
}

export function initI18n({ onRefresh } = {}) {
  refreshCallback = onRefresh;
  applyStaticTranslations();
}

export function applyLanguage(lang) {
  if (lang) currentLang = lang === 'en' ? 'en' : 'es';
  applyStaticTranslations();
  refreshCallback?.();
}

export function onLanguageChange(callback) {
  refreshCallback = callback;
}
