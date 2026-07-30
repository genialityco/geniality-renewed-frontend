/**
 * Utilidades para CourseDetail
 */

export function getVimeoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(/(?:vimeo\.com\/|video\/)(\d+)/);
  return match ? match[1] : null;
}

export function getThumbnailUrl(vimeoId: string | null): string {
  return vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : "";
}

export function calculateCourseProgress(
  completedCount: number,
  totalActivities: number
): number {
  if (totalActivities === 0) return 0;
  return Math.round((completedCount / totalActivities) * 100);
}

export function getModuleAverageProgress(
  moduleActivities: any[],
  activityAttendees: any[]
): number {
  if (!moduleActivities.length) return 0;
  const total = moduleActivities.reduce((acc, act) => {
    const progress = getActivityProgress(activityAttendees, act._id);
    return acc + progress;
  }, 0);
  return total / moduleActivities.length;
}

export function getActivityProgress(
  activityAttendees: any[],
  activityId: string
): number {
  const attendee = activityAttendees.find((a) => {
    const rawId =
      typeof a?.activity_id === "object"
        ? a?.activity_id?._id || a?.activity_id?.id
        : a?.activity_id;

    return rawId?.toString?.() === activityId?.toString?.();
  });

  const numericProgress = Number(attendee?.progress ?? 0);
  if (!Number.isFinite(numericProgress)) return 0;
  return Math.max(0, Math.min(100, numericProgress));
}

export function getProgressColor(progress: number): string {
  if (progress === 100) return "green";
  if (progress > 0) return "yellow";
  return "gray";
}

export function sortActivitiesByDate(activities: any[]): any[] {
  return [...activities].sort(
    (a, b) =>
      new Date(a.create_at || a.created_at || a.createdAt || 0).getTime() -
      new Date(b.create_at || b.created_at || b.createdAt || 0).getTime()
  );
}

export function sortModulesByOrder(modules: any[]): any[] {
  return [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Devuelve las actividades en el orden de aprendizaje del curso:
 * primero las actividades agrupadas por módulos (ordenados por `order`),
 * y al final las actividades sin módulo. Si no hay módulos, se ordenan por fecha.
 */
export function getOrderedActivities(modules: any[], activities: any[]): any[] {
  const orderedModules = sortModulesByOrder(modules);
  if (orderedModules.length === 0) {
    return sortActivitiesByDate(activities);
  }

  const moduleIds = new Set(orderedModules.map((module) => module._id));

  return [
    ...orderedModules.flatMap((module) =>
      sortActivitiesByDate(
        activities.filter((activity) => activity.module_id === module._id)
      )
    ),
    ...sortActivitiesByDate(
      activities.filter(
        (activity) => !activity.module_id || !moduleIds.has(activity.module_id)
      )
    ),
  ];
}

/**
 * Una actividad se considera "superada" para efectos de avance lineal si su
 * progreso llega al 100% o si es de solo información (no bloquea el avance).
 */
function isActivityCleared(
  activity: any,
  activityAttendees: any[]
): boolean {
  if (activity?.is_info_only) return true;
  return getActivityProgress(activityAttendees, activity._id) >= 100;
}

/**
 * Calcula qué actividades están bloqueadas cuando el curso es lineal.
 * En un curso lineal solo se puede acceder a una actividad si todas las
 * anteriores (en el orden de aprendizaje) están superadas. La primera
 * actividad pendiente queda desbloqueada; todo lo que va después se bloquea.
 *
 * Si `isLinear` es false, no se bloquea nada (Set vacío).
 */
export function getLockedActivityIds(
  orderedActivities: any[],
  activityAttendees: any[],
  isLinear: boolean
): Set<string> {
  const locked = new Set<string>();
  if (!isLinear) return locked;

  let previousCleared = true;
  for (const activity of orderedActivities) {
    if (!previousCleared) {
      locked.add(String(activity._id));
    }
    // La siguiente actividad solo se desbloquea si esta quedó superada.
    previousCleared = previousCleared && isActivityCleared(activity, activityAttendees);
  }

  return locked;
}

/**
 * Determina si el examen está desbloqueado según la configuración del curso.
 * Por defecto (sin configuración) el examen permanece bloqueado.
 */
export function isExamUnlocked(
  event: { exam_gating_enabled?: boolean; exam_min_progress?: number } | null,
  courseProgress: number
): boolean {
  if (!event?.exam_gating_enabled) return false;
  const required = Number.isFinite(event?.exam_min_progress)
    ? Number(event?.exam_min_progress)
    : 100;
  return courseProgress >= required;
}

/**
 * Porcentaje de actividades de un módulo que el usuario ha completado (100%).
 * Se usa para la compuerta del examen de módulo.
 */
export function getModuleCompletionPercent(
  moduleActivities: any[],
  activityAttendees: any[]
): number {
  if (!moduleActivities.length) return 0;
  const completed = moduleActivities.filter(
    (a) => getActivityProgress(activityAttendees, a._id) >= 100
  ).length;
  return Math.round((completed / moduleActivities.length) * 100);
}

/**
 * ¿Está desbloqueado el examen de un módulo?
 * Por defecto (sin compuerta) permanece bloqueado. Si el admin activó la
 * compuerta, se exige que el avance de actividades del módulo alcance el mínimo.
 */
export function isModuleExamUnlocked(
  event: {
    module_exam_gating_enabled?: boolean;
    module_exam_min_progress?: number;
  } | null,
  moduleCompletionPercent: number
): boolean {
  if (!event?.module_exam_gating_enabled) return false;
  const required = Number.isFinite(event?.module_exam_min_progress)
    ? Number(event?.module_exam_min_progress)
    : 100;
  return moduleCompletionPercent >= required;
}

// ─────────────────────────────────────────────
// Exámenes por módulo y certificado
// ─────────────────────────────────────────────

/** Nota mínima por defecto cuando el examen no define `config.nota`. */
const DEFAULT_PASS_MARK = 60;

/** Id string de un quiz (tolera _id o id). */
export function quizIdOf(quiz: any): string {
  return String(quiz?._id ?? quiz?.id ?? "");
}

/**
 * Un examen está aprobado si el mejor score supera su nota mínima
 * (o 60 como fallback cuando no hay nota configurada).
 */
export function isExamPassed(quiz: any, bestScore: number | false): boolean {
  if (!quiz || bestScore === false || bestScore == null) return false;
  const nota = quiz?.config?.nota ?? null;
  return nota != null ? bestScore >= nota : bestScore >= DEFAULT_PASS_MARK;
}

/** Examen general del curso (sin módulo asociado). */
export function getGeneralQuiz<T extends { moduleId?: any }>(
  quizzes: T[]
): T | null {
  return quizzes.find((q) => !q.moduleId) ?? null;
}

/** Examen asociado a un módulo específico. */
export function getModuleQuiz<T extends { moduleId?: any }>(
  quizzes: T[],
  moduleId: string
): T | null {
  return (
    quizzes.find(
      (q) => q.moduleId && String(q.moduleId) === String(moduleId)
    ) ?? null
  );
}

/** Cuenta cuántos exámenes están aprobados por el usuario. */
export function countPassedExams(
  quizzes: any[],
  bestScoreByQuiz: Record<string, number | false>
): number {
  return quizzes.reduce((acc, q) => {
    const id = quizIdOf(q);
    return acc + (isExamPassed(q, bestScoreByQuiz[id] ?? false) ? 1 : 0);
  }, 0);
}

export interface CertificateGate {
  unlocked: boolean;
  message: string;
  pending: string[];
}

/**
 * Evalúa las reglas de desbloqueo del certificado configuradas por el admin.
 * Si el gating está desactivado, el certificado permanece bloqueado.
 */
export function getCertificateGate(params: {
  event: {
    certificate_gating_enabled?: boolean;
    certificate_required_activities?: number | null;
    certificate_required_exams?: number | null;
    certificate_locked_message?: string;
  } | null;
  quizzes: any[];
  bestScoreByQuiz: Record<string, number | false>;
  completedActivities: number;
}): CertificateGate {
  const { event, quizzes, bestScoreByQuiz, completedActivities } = params;

  if (!event?.certificate_gating_enabled) {
    return {
      unlocked: false,
      message:
        "El certificado está bloqueado hasta que el administrador configure sus requisitos.",
      pending: [],
    };
  }

  const pending: string[] = [];

  const reqActivities = event.certificate_required_activities;
  if (reqActivities != null && completedActivities < reqActivities) {
    pending.push(
      `Completa al menos ${reqActivities} actividad(es) del curso (llevas ${completedActivities}).`
    );
  }

  const reqExams = event.certificate_required_exams;
  if (reqExams != null) {
    const passed = countPassedExams(quizzes, bestScoreByQuiz);
    if (passed < reqExams) {
      pending.push(
        `Aprueba al menos ${reqExams} examen(es) (llevas ${passed}).`
      );
    }
  }

  const unlocked = pending.length === 0;
  const custom = (event.certificate_locked_message || "").trim();
  const message = unlocked ? "" : custom || pending.join(" ");
  return { unlocked, message, pending };
}
