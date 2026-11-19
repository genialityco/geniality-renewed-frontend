// src/utils/pinnedCourse.ts
//
// Organizaciones "de un solo curso": la experiencia del usuario vive siempre
// dentro de la URL de ese curso. La landing de la organización redirige al
// curso, y tras iniciar sesión / registrarse se vuelve al curso.
//
// Mapa organizationId -> eventId (curso).
const PINNED_COURSES: Record<string, string> = {
  "6a4ffdbb5b809f3cf38d425f": "6a50053eb6a98a15088843d6",
};

export function getPinnedCourseId(organizationId?: string): string | null {
  if (!organizationId) return null;
  return PINNED_COURSES[organizationId] ?? null;
}

/** Ruta del curso fijo de la organización, o null si no tiene. */
export function getPinnedCoursePath(organizationId?: string): string | null {
  const eventId = getPinnedCourseId(organizationId);
  return eventId ? `/organization/${organizationId}/course/${eventId}` : null;
}
