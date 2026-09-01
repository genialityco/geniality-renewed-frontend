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

export interface EventMemberActivityProgress {
  activityId: string;
  progress: number;
  completed: boolean;
  timeSpentMs: number;
}

export interface EventMember {
  userId: string;
  name: string;
  email: string;
  courseProgress: number;
  status: "completed" | "in_progress" | "not_started";
  enrolledAt: string | null;
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
