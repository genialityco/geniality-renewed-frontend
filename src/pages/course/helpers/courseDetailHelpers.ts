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
 * Por defecto (sin configuración) el examen siempre está disponible.
 */
export function isExamUnlocked(
  event: { exam_gating_enabled?: boolean; exam_min_progress?: number } | null,
  courseProgress: number
): boolean {
  if (!event?.exam_gating_enabled) return true;
  const required = Number.isFinite(event?.exam_min_progress)
    ? Number(event?.exam_min_progress)
    : 100;
  return courseProgress >= required;
}
