import api from "./api";

/** Indicadores congelados de un curso (ver CourseSnapshotsService del backend). */
export interface CourseSnapshotMetrics {
  enrolled: number;
  completed: number;
  completion_rate: number;
  in_progress: number;
  not_started: number;
  active_7d: number;
  active_15d: number;
  active_30d: number;
  inactive_15d: number;
  never_active: number;
  avg_course_progress: number;
  avg_activity_progress: number;
  total_time_ms: number;
  users_with_time: number;
  completed_tracked: number;
  completed_estimated: number;
  completed_unknown_date: number;
  completions_last_30d: number;
  completions_by_month: { month: string; count: number }[];
  days_to_complete_avg: number | null;
  days_to_complete_median: number | null;
  days_to_complete_sample: number;
  with_phone: number;
  /** No graduados con teléfono (no existe en líneas base anteriores) */
  not_completed_with_phone?: number;
  /** Con consentimiento efectivo de WhatsApp */
  with_whatsapp_opt_in: number;
  reachable_not_completed: number;
}

export interface CourseSnapshot {
  _id: string;
  organization_id: string;
  event_id: string;
  event_name: string;
  kind: "baseline" | "daily";
  snapshot_date: string;
  batch_id: string | null;
  label: string | null;
  taken_at: string;
  inactive_days: number;
  metrics: CourseSnapshotMetrics;
}

export interface BaselineSummary {
  batch_id: string;
  label: string | null;
  snapshot_date: string;
  taken_at: string;
  courses: number;
  enrolled: number;
  completed: number;
}

export type CourseUserStatus =
  | "completed"
  | "active"
  | "inactive"
  | "never_active";

export interface BaselineUserRow {
  user_id: string;
  name: string;
  email: string;
  enrolled_at: string | null;
  course_progress: number;
  activity_progress: number;
  status: CourseUserStatus;
  last_activity_at: string | null;
  days_inactive: number | null;
  time_spent_ms: number;
  completed_at: string | null;
  completed_at_source: "tracked" | "estimated" | null;
  has_phone: boolean;
  whatsapp_opt_in: boolean;
}

const base = (organizationId: string) =>
  `/course-snapshots/organization/${organizationId}`;

/**
 * Congela la línea base de los cursos de la organización (todos los que
 * tienen inscritos, o solo eventIds).
 * POST /course-snapshots/organization/:organizationId/baselines
 */
export async function createBaseline(
  organizationId: string,
  params: { label?: string; eventIds?: string[] }
): Promise<BaselineSummary> {
  const { data } = await api.post<BaselineSummary>(
    `${base(organizationId)}/baselines`,
    params
  );
  return data;
}

export async function fetchBaselines(
  organizationId: string
): Promise<BaselineSummary[]> {
  const { data } = await api.get<BaselineSummary[]>(
    `${base(organizationId)}/baselines`
  );
  return data;
}

export async function fetchBaseline(
  organizationId: string,
  batchId: string
): Promise<CourseSnapshot[]> {
  const { data } = await api.get<CourseSnapshot[]>(
    `${base(organizationId)}/baselines/${batchId}`
  );
  return data;
}

export async function fetchBaselineUsers(
  organizationId: string,
  batchId: string,
  eventId: string
): Promise<BaselineUserRow[]> {
  const { data } = await api.get<BaselineUserRow[]>(
    `${base(organizationId)}/baselines/${batchId}/events/${eventId}/users`
  );
  return data;
}

export async function deleteBaseline(
  organizationId: string,
  batchId: string
): Promise<void> {
  await api.delete(`${base(organizationId)}/baselines/${batchId}`);
}

/** Snapshots diarios de un curso, opcionalmente entre fechas YYYY-MM-DD. */
export async function fetchDailySnapshots(
  organizationId: string,
  eventId: string,
  range?: { from?: string; to?: string }
): Promise<CourseSnapshot[]> {
  const { data } = await api.get<CourseSnapshot[]>(
    `${base(organizationId)}/daily/events/${eventId}`,
    { params: range }
  );
  return data;
}

export async function runDailySnapshots(
  organizationId: string
): Promise<{ courses: number }> {
  const { data } = await api.post<{ courses: number }>(
    `${base(organizationId)}/daily/run`
  );
  return data;
}
