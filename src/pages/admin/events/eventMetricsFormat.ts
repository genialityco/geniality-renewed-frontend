// src/pages/admin/events/eventMetricsFormat.ts
// Formateadores compartidos por las vistas de métricas de un curso
// (pestaña, panel de miembros e informe PDF).

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "2025-03" → "mar 2025" */
export function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const idx = Number(month) - 1;
  const name = MONTHS_ES[idx] ?? month;
  return `${name} ${year}`;
}

/** Milisegundos → "2 h 15 min" */
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0 min";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("es-CO");
}

/** ISO → "12 mar 2025" (o "—" si no hay fecha válida) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/** Porcentaje entero de `part` sobre `total` (0 si no hay total) */
export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/**
 * El informe solo reporta los exámenes habilitados: un examen deshabilitado
 * no se le muestra al alumno, así que sus intentos son historia y mezclarlos
 * con los vigentes distorsiona las notas y la aprobación. Se devuelve también
 * cuántos quedaron fuera para poder advertirlo.
 */
export function splitEnabledQuizzes<T extends { enabled: boolean }>(
  quizzes: T[]
): { enabled: T[]; hiddenCount: number } {
  const enabled = quizzes.filter((quiz) => quiz.enabled);
  return { enabled, hiddenCount: quizzes.length - enabled.length };
}

/** "1 examen deshabilitado" / "3 exámenes deshabilitados" */
export function hiddenQuizzesNote(hiddenCount: number): string {
  return hiddenCount === 1
    ? "1 examen deshabilitado no se incluye en el informe."
    : `${hiddenCount} exámenes deshabilitados no se incluyen en el informe.`;
}
