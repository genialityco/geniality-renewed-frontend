// src/utils/previewUrl.ts
// Construye la URL de vista previa (solo admin) de un curso/evento.
// Si se pasa `activityId`, abre directamente la actividad con su video.
export function coursePreviewUrl(
  organizationId: string,
  eventId: string,
  activityId?: string,
): string {
  const base = `/organization/${organizationId}/admin/preview/${eventId}`;
  return activityId ? `${base}?activity=${activityId}` : base;
}

/** Abre la vista previa en una pestaña nueva. */
export function openCoursePreview(
  organizationId: string,
  eventId: string,
  activityId?: string,
): void {
  window.open(
    coursePreviewUrl(organizationId, eventId, activityId),
    "_blank",
    "noopener,noreferrer",
  );
}
