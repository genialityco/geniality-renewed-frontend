// src/pages/admin/events/eventMetricsSample.ts
// Métricas ficticias para previsualizar el tablero cuando el curso aún no
// tiene inscritos. Los números son deterministas (mismo resultado en cada
// render) y se apoyan en la estructura real del curso: si ya hay módulos y
// actividades creados se usan sus nombres; si no, se muestra un temario de
// ejemplo.
import {
  ActivityMetrics,
  EventMetrics,
} from "../../../services/eventMetricsService";

const TOTAL_ENROLLED = 128;

// Pseudo-aleatorio determinista en [0, 1): evita que el ejemplo cambie
// entre renders pero da variación orgánica entre actividades.
function jitter(i: number): number {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function lastMonths(n: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${d.getFullYear()}-${mm}`);
  }
  return months;
}

function buildByMonth(): { month: string; count: number }[] {
  // Rampa de inscripciones: arranque lento, pico y estabilización.
  const weights = [0.06, 0.1, 0.17, 0.24, 0.23, 0.2];
  const months = lastMonths(weights.length);
  const counts = weights.map((w) => Math.round(TOTAL_ENROLLED * w));
  const diff = TOTAL_ENROLLED - counts.reduce((a, b) => a + b, 0);
  counts[counts.length - 1] += diff;
  return months.map((month, i) => ({ month, count: counts[i] }));
}

const FALLBACK_ACTIVITIES: Pick<
  ActivityMetrics,
  "activityId" | "name" | "moduleId" | "moduleName" | "moduleOrder"
>[] = [
  { moduleId: "sample-mod-1", moduleName: "Fundamentos", moduleOrder: 1 },
  { moduleId: "sample-mod-1", moduleName: "Fundamentos", moduleOrder: 1 },
  { moduleId: "sample-mod-1", moduleName: "Fundamentos", moduleOrder: 1 },
  { moduleId: "sample-mod-2", moduleName: "Profundización", moduleOrder: 2 },
  { moduleId: "sample-mod-2", moduleName: "Profundización", moduleOrder: 2 },
  { moduleId: "sample-mod-2", moduleName: "Profundización", moduleOrder: 2 },
].map((base, i) => ({
  ...base,
  activityId: `sample-activity-${i + 1}`,
  name: [
    "Bienvenida al curso",
    "Conceptos básicos",
    "Lectura guiada",
    "Casos prácticos",
    "Video: aplicación real",
    "Taller de cierre",
  ][i],
}));

function buildActivityFunnel(real: ActivityMetrics[]): ActivityMetrics[] {
  const skeleton =
    real.length > 0
      ? real.map((a) => ({
          activityId: a.activityId,
          name: a.name,
          moduleId: a.moduleId,
          moduleName: a.moduleName,
          moduleOrder: a.moduleOrder,
        }))
      : FALLBACK_ACTIVITIES;

  // Embudo decreciente: cada actividad la inicia un poco menos de gente que
  // la anterior, y la tasa de finalización también baja levemente.
  let attendees = Math.round(TOTAL_ENROLLED * 0.92);
  return skeleton.map((base, i) => {
    if (i > 0) {
      attendees = Math.max(
        Math.round(attendees * (0.86 + jitter(i) * 0.08)),
        5
      );
    }
    const completionRatio = Math.min(
      Math.max(0.92 - i * 0.04 - jitter(i + 20) * 0.06, 0.35),
      1
    );
    const completed = Math.round(attendees * completionRatio);
    const usersWithTime = Math.round(attendees * 0.9);
    const avgMinutes = 10 + jitter(i + 40) * 18;
    return {
      ...base,
      attendees,
      completed,
      avgProgress:
        Math.round(Math.max(96 - i * 4 - jitter(i + 60) * 8, 40) * 10) / 10,
      totalTimeMs: Math.round(usersWithTime * avgMinutes) * 60_000,
      usersWithTime,
    };
  });
}

/** Construye un EventMetrics ficticio a partir de la respuesta real del curso. */
export function buildSampleMetrics(real: EventMetrics): EventMetrics {
  const completed = 74;
  const notStarted = 16;
  const usersWithTime = 112;
  const avgPerUserMs = 111 * 60_000; // ~1 h 51 min por usuario

  return {
    event: real.event,
    enrollment: {
      total: TOTAL_ENROLLED,
      completed,
      notStarted,
      inProgress: TOTAL_ENROLLED - completed - notStarted,
      avgProgress: 68.4,
      byMonth: buildByMonth(),
    },
    time: {
      usersWithTime,
      avgPerUserMs,
      totalMs: usersWithTime * avgPerUserMs,
    },
    activities: buildActivityFunnel(real.activities),
    quiz: {
      exists: true,
      passingScore: real.quiz.passingScore ?? 70,
      totalAttempts: 143,
      uniqueUsers: 98,
      graded: 131,
      pending: 8,
      review: 4,
      avgBestScore: 78.4,
      passedUsers: 81,
      gradedUsers: 96,
    },
    certificates: {
      total: 74,
      completed: 69,
      pending: 3,
      failed: 2,
    },
  };
}
