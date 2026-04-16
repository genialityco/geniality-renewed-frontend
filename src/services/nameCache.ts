/**
 * Helper para obtener nombres de cursos y actividades
 * Usa memoización para evitar llamadas duplicadas
 */

const courseCache = new Map<string, Promise<string>>();
const activityCache = new Map<string, Promise<string>>();

/**
 * Obtiene el nombre del evento (curso) por su ID
 */
export async function getCourseName(courseId: string): Promise<string> {
  if (!courseId) return 'Desconocido';

  // Si ya está en caché, retornar
  if (courseCache.has(courseId)) {
    return courseCache.get(courseId)!;
  }

  // Cargar desde backend
  const promise = (async () => {
    try {
      // Intentar obtener del localStorage primero (si existe)
      const stored = sessionStorage.getItem(`course_${courseId}`);
      if (stored) return stored;

      // Si no, retornar ID como fallback
      return courseId;
    } catch (error) {
      console.error(`Error obteniendo nombre del curso ${courseId}:`, error);
      return courseId;
    }
  })();

  courseCache.set(courseId, promise);
  return promise;
}

/**
 * Obtiene el nombre de la actividad por su ID
 */
export async function getActivityName(activityId: string): Promise<string> {
  if (!activityId) return 'Desconocido';

  // Si ya está en caché, retornar
  if (activityCache.has(activityId)) {
    return activityCache.get(activityId)!;
  }

  // Cargar desde backend
  const promise = (async () => {
    try {
      // Intentar obtener del localStorage primero (si existe)
      const stored = sessionStorage.getItem(`activity_${activityId}`);
      if (stored) return stored;

      // Si no, retornar ID como fallback
      return activityId;
    } catch (error) {
      console.error(`Error obteniendo nombre de la actividad ${activityId}:`, error);
      return activityId;
    }
  })();

  activityCache.set(activityId, promise);
  return promise;
}

/**
 * Guardar nombre de curso en caché (para ser llamado desde CourseDetail)
 */
export function setCourseNameCache(courseId: string, name: string): void {
  sessionStorage.setItem(`course_${courseId}`, name);
  courseCache.set(courseId, Promise.resolve(name));
}

/**
 * Guardar nombre de actividad en caché (para ser llamado desde ActivityDetail)
 */
export function setActivityNameCache(activityId: string, name: string): void {
  sessionStorage.setItem(`activity_${activityId}`, name);
  activityCache.set(activityId, Promise.resolve(name));
}

/**
 * Limpiar caché
 */
export function clearNameCache(): void {
  courseCache.clear();
  activityCache.clear();
  sessionStorage.removeItem('courseName');
  sessionStorage.removeItem('activityName');
}
