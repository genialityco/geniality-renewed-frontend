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
  quiz: {
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
  };
  certificates: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
}

/** Métricas agregadas de un curso/evento (dashboard de admin) */
export const fetchEventMetrics = async (
  organizationId: string,
  eventId: string
): Promise<EventMetrics> => {
  const response = await api.get<EventMetrics>(
    `/event-metrics/organization/${organizationId}/event/${eventId}`
  );
  return response.data;
};
