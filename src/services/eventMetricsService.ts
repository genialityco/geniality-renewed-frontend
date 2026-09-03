import api from "./api";

export interface ActivityMetrics {
  activityId: string;
  name: string;
  moduleId: string | null;
  moduleName: string | null;
  moduleOrder: number | null;
  attendees: number;
  completed: number;
  avgProgress: number;
  totalTimeMs: number;
  usersWithTime: number;
}

/** Métricas de UN examen del curso: el general o el de un módulo. */
export interface QuizMetrics {
  quizId: string;
  /** null = examen general del curso */
  moduleId: string | null;
  moduleName: string | null;
  moduleOrder: number | null;
  enabled: boolean;
  passingScore: number | null;
  totalAttempts: number;
  uniqueUsers: number;
  graded: number;
  pending: number;
  review: number;
  avgBestScore: number | null;
  passedUsers: number | null;
  gradedUsers: number;
  /**
   * true cuando el dato viene de un backend anterior a `quizzes`, que
   * devolvía un examen del curso sin decir cuál. No se puede afirmar que sea
   * el general ni que sea el único: la UI debe advertirlo.
   */
  legacy?: boolean;
}

export interface EventMetrics {
  event: {
    id: string;
    name: string;
    datetime_from: string;
    datetime_to: string;
  };
  enrollment: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    avgProgress: number;
    byMonth: { month: string; count: number }[];
  };
  time: {
    totalMs: number;
    usersWithTime: number;
    avgPerUserMs: number;
  };
  activities: ActivityMetrics[];
  /**
   * Todos los exámenes del curso: el general (moduleId null) primero y luego
   * los de cada módulo. Vacío si el curso no tiene exámenes.
   */
  quizzes: QuizMetrics[];
  certificates: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
}

/** Forma antigua de la respuesta: un único examen sin identificar. */
interface LegacyQuizMetrics {
  exists: boolean;
  passingScore: number | null;
  totalAttempts: number;
  uniqueUsers: number;
  graded: number;
  pending: number;
  review: number;
  avgBestScore: number | null;
  passedUsers: number | null;
  gradedUsers: number;
}

/**
 * Normaliza respuestas de un backend anterior a `quizzes`, donde el curso
 * exponía un solo examen sin decir cuál era.
 */
const normalizeQuizzes = (
  data: EventMetrics & { quiz?: LegacyQuizMetrics }
): EventMetrics => {
  if (Array.isArray(data.quizzes)) return data;
  const legacy = data.quiz;
  return {
    ...data,
    quizzes:
      legacy && legacy.exists
        ? [
            {
              quizId: "legacy",
              moduleId: null,
              moduleName: null,
              moduleOrder: null,
              enabled: true,
              passingScore: legacy.passingScore,
              totalAttempts: legacy.totalAttempts,
              uniqueUsers: legacy.uniqueUsers,
              graded: legacy.graded,
              pending: legacy.pending,
              review: legacy.review,
              avgBestScore: legacy.avgBestScore,
              passedUsers: legacy.passedUsers,
              gradedUsers: legacy.gradedUsers,
              legacy: true,
            },
          ]
        : [],
  };
};

/** Métricas agregadas de un curso/evento (dashboard de admin) */
export const fetchEventMetrics = async (
  organizationId: string,
  eventId: string
): Promise<EventMetrics> => {
  const response = await api.get<EventMetrics & { quiz?: LegacyQuizMetrics }>(
    `/event-metrics/organization/${organizationId}/event/${eventId}`
  );
  return normalizeQuizzes(response.data);
};

export interface EventMemberActivityProgress {
  activityId: string;
  progress: number;
  completed: boolean;
  timeSpentMs: number;
}

export type EventMemberCertificateStatus =
  | "COMPLETED"
  | "PENDING"
  | "FAILED"
  | "NOT_GENERATED";

export interface EventMember {
  userId: string;
  name: string;
  email: string;
  courseProgress: number;
  status: "completed" | "in_progress" | "not_started";
  enrolledAt: string | null;
  certificateStatus: EventMemberCertificateStatus;
  activities: EventMemberActivityProgress[];
}

export interface EventMembersMetrics {
  activities: {
    activityId: string;
    name: string;
    moduleName: string | null;
    moduleOrder: number | null;
  }[];
  members: EventMember[];
  total: number;
  page: number;
  pageSize: number;
}

export type EventMembersSortKey = "name" | "courseProgress" | "enrolledAt";

export interface FetchEventMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortKey?: EventMembersSortKey;
  sortDir?: "asc" | "desc";
}

/** Avance de cada miembro inscrito, actividad por actividad (paginado) */
export const fetchEventMembers = async (
  organizationId: string,
  eventId: string,
  params: FetchEventMembersParams = {}
): Promise<EventMembersMetrics> => {
  const response = await api.get<EventMembersMetrics>(
    `/event-metrics/organization/${organizationId}/event/${eventId}/members`,
    { params }
  );
  return response.data;
};
