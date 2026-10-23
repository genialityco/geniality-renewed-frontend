import api from "./api";

/** Gen.ON Adherencia Educación (backend: src/genon). */

export type GenOnMode = "off" | "dry_run" | "live";
export type GenOnFlowSegment = "abandon" | "inactive";
export type GenOnSegment =
  | GenOnFlowSegment
  | "active"
  | "graduated"
  | "waiting";
export type GenOnMechanic =
  | "message"
  | "abandon_question"
  | "social"
  | "challenge_invite"
  | "closing";
export type GenOnMetric =
  | "n_egresados"
  | "n_activos_semana"
  | "n_avanzaron"
  | "pct_terminaron_desde_aqui"
  | "base_desde_aqui"
  | "avance";
/** "challenge" o "reply:<clave de respuesta>" */
export type GenOnAction = string;

export interface GenOnCondition {
  metric: GenOnMetric;
  min: number;
}

export interface GenOnVariant {
  template_key: string;
  conditions: GenOnCondition[];
}

export interface GenOnStep {
  key: string;
  label: string;
  day: number;
  mechanic: GenOnMechanic;
  variants: GenOnVariant[];
  enabled: boolean;
}

export type GenOnReplyEffect = "none" | "support_case" | "feedback" | "opt_out";

export interface GenOnReply {
  key: string;
  label: string;
  text: string;
  buttons: { title: string; action: GenOnAction }[];
  effect: GenOnReplyEffect;
}

export interface GenOnChallengeConfig {
  num_questions: number;
  pass_percent: number;
  retry_after_days: number;
  intro_text: string;
  pass_text: string;
  fail_text: string;
  unavailable_text: string;
  retry_wait_text: string;
}

export interface GenOnCourseConfig {
  challenge_activity_ids: string[];
  activity_minutes: Record<string, number>;
  skippable_activity_ids: string[];
}

export type GenOnTriggerKey =
  | "exam_reminder"
  | "certificate"
  | "streak_risk"
  | "streak_recovery"
  | "video_challenge"
  | "streak_milestone"
  | "weekly_social"
  | "module_completed";

export interface GenOnTriggersConfig {
  priority: GenOnTriggerKey[];
  module_completed: { enabled: boolean; template_key: string };
  weekly_social: {
    enabled: boolean;
    weekday: number;
    above_template_key: string;
    below_template_key: string;
  };
  video_challenge: {
    enabled: boolean;
    template_key: string;
    num_questions: number;
    pass_text: string;
    fail_text: string;
  };
  streak: {
    enabled: boolean;
    milestones: number[];
    milestone_template_key: string;
    risk_enabled: boolean;
    risk_time: string;
    risk_min: number;
    risk_template_key: string;
    recovery_enabled: boolean;
    recovery_min: number;
    recovery_template_key: string;
    recovery_window_days: number;
  };
  review_challenge: { pass_text: string; fail_text: string };
  exam_reminder: {
    enabled: boolean;
    days_after: number;
    template_key: string;
    include_final: boolean;
  };
  certificate: { enabled: boolean; template_key: string };
}

export interface GenOnSegmentRules {
  abandon: {
    rule: "no_activity" | "max_progress";
    max_progress: number;
    min_days_enrolled: number;
  };
  inactive: { min_progress: number; min_days_inactive: number };
  active: { max_days_inactive: number };
}

export interface GenOnProgram {
  _id: string;
  name: string;
  mode: GenOnMode;
  organization_ids: string[];
  event_ids: string[];
  timezone: string;
  send_slots: string[];
  blocked_weekdays: number[];
  weekly_cap: number;
  social_min: number;
  default_activity_minutes: number;
  /** Los enlaces de los mensajes y retos entran con la sesión iniciada */
  auto_login_links?: boolean;
  holdout_percent: Partial<Record<GenOnSegment, number>>;
  segments: GenOnSegmentRules;
  flows: Record<GenOnFlowSegment, GenOnStep[]>;
  replies: GenOnReply[];
  challenge: GenOnChallengeConfig;
  courses: Record<string, GenOnCourseConfig>;
  /** Segmento 3, examen y certificado (null en programas anteriores a la fase 2) */
  triggers: GenOnTriggersConfig | null;
  last_segmented_on: string | null;
  last_run_at: string | null;
}

export type GenOnTemplateStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED";

export interface GenOnTemplateButton {
  type: "QUICK_REPLY" | "URL";
  text: string;
  action?: GenOnAction;
}

export interface GenOnTemplate {
  _id: string;
  key: string;
  label: string;
  language: string;
  category: "UTILITY" | "MARKETING";
  body: string;
  footer: string;
  buttons: GenOnTemplateButton[];
  version: number;
  meta_status: GenOnTemplateStatus;
  meta_name: string | null;
  meta_category: string | null;
  rejected_reason: string | null;
  submitted_at: string | null;
  synced_at: string | null;
  approved: {
    meta_name: string;
    version: number;
    approved_at: string;
    /** Texto y botones de la versión aprobada (la que se envía) */
    body?: string;
    buttons?: GenOnTemplateButton[];
  } | null;
  /** Problemas que harían que Meta la rechace */
  errors: string[];
}

export interface GenOnCatalog {
  variables: { key: string; label: string; example: string }[];
  metrics: { key: GenOnMetric; label: string }[];
  mechanics: { key: GenOnMechanic; label: string }[];
  triggers: { key: GenOnTriggerKey; label: string; step: string }[];
}

export interface GenOnCourse {
  _id: string;
  name: string;
  organization_id: string;
}

export interface GenOnCourseDetail {
  event_id: string;
  event_name: string;
  num_questions: number;
  activities: {
    id: string;
    order: number;
    name: string;
    module_name: string | null;
    challenge_questions: number;
    topic: string | null;
    video_minutes: number | null;
    minutes: number | null;
    challenge_enabled: boolean;
    skippable: boolean;
  }[];
}

export interface GenOnEnrollmentRow {
  _id: string;
  user_id: string;
  name: string;
  email: string;
  event_id: string;
  event_name: string;
  segment: GenOnSegment;
  segment_since: string;
  progress: number;
  completed_activities: number;
  last_activity_at: string | null;
  holdout: boolean;
  slot: string | null;
  last_step_key: string | null;
  next_step_key: string | null;
  next_step_at: string | null;
  paused: boolean;
  exited: boolean;
  exit_reason: string | null;
  abandon_reason: string | null;
  last_error: string | null;
  challenges: {
    activity_id: string;
    at: string;
    passed: boolean;
    correct: number;
    total: number;
    kind?: "advance" | "review" | "video";
  }[];
  streak: { current: number; best: number; last_day: string | null } | null;
  queue: { key: GenOnTriggerKey; due_at: string; expires_at: string }[];
}

export interface GenOnEnrollments {
  by_segment: { segment: GenOnSegment; total: number; holdout: number; paused: number; exited: number }[];
  rows: GenOnEnrollmentRow[];
}

export interface GenOnFeedback {
  _id: string;
  type: "support" | "comment";
  text: string;
  phone: string;
  user_id: string;
  event_id: string;
  status: "open" | "closed";
  created_at: string;
}

export interface GenOnSimulation {
  segment: GenOnSegment;
  holdout: boolean;
  slot: string;
  progress: number;
  completed_activities: number;
  last_activity_at: string | null;
  enrolled_at: string | null;
  contact: { name: string; has_phone: boolean; consent: boolean };
  enrollment: {
    segment: GenOnSegment;
    last_step_key: string | null;
    next_step_key: string | null;
    next_step_at: string | null;
    paused: boolean;
    exited: boolean;
    exit_reason: string | null;
    last_error: string | null;
  } | null;
  next_step: { next_step_key: string | null; next_step_at: string | null };
  challenge_activity: string | null;
  values: Record<string, string | number | null>;
  metrics: Record<GenOnMetric, number>;
}

export interface GenOnPreview {
  step: string;
  skipped: boolean;
  reason?: string;
  variant?: number;
  chosen_variant?: number | null;
  template_key?: string;
  template_status?: GenOnTemplateStatus;
  approved?: boolean;
  text?: string;
  buttons?: string[];
  missing?: string[];
  metrics: Record<GenOnMetric, number>;
}

export interface GenOnRunResult {
  segmentation: { courses: number; counts: Record<string, number> } | null;
  /** Disparadores encolados en esta ejecución, por tipo */
  detected?: Record<string, number>;
  by_result: Record<string, number>;
  outcomes: {
    enrollment_id: string;
    user_id: string;
    event_id: string;
    segment: GenOnSegment;
    step: string | null;
    result: string;
    reason?: string;
  }[];
}

export interface GenOnTriggerSimulation {
  segment: GenOnSegment;
  streak: {
    current: number;
    throughYesterday: number;
    activeToday: boolean;
    broken: { count: number; lastDay: string } | null;
    lastValidDay: string | null;
  } | null;
  weekly_activities: number;
  candidates: {
    key: GenOnTriggerKey;
    step: string;
    template_key: string;
    already_sent: boolean;
    data: Record<string, any>;
  }[];
  queue: { key: GenOnTriggerKey; step: string; due_at: string; expires_at: string }[];
}

export interface GenOnTriggerPreview {
  step: string;
  /** Hoy no se cumple: se usan datos de ejemplo */
  sample: boolean;
  template_key: string;
  template_status: GenOnTemplateStatus;
  approved: boolean;
  text: string;
  buttons: string[];
  missing: string[];
}

export const TRIGGER_LABELS: Record<GenOnTriggerKey, string> = {
  exam_reminder: "Recordatorio de examen",
  certificate: "Certificado listo",
  streak_risk: "Racha en riesgo",
  streak_recovery: "Recuperación de racha",
  video_challenge: "Reto del video",
  streak_milestone: "Reconocimiento de racha",
  weekly_social: "Comparación social semanal",
  module_completed: "Acompañamiento: módulo terminado",
};

export const SEGMENT_LABELS: Record<GenOnSegment, string> = {
  abandon: "1. Recuperación de abandono",
  inactive: "2. Reactivación de inactivos",
  active: "3. Activos",
  graduated: "Egresados",
  waiting: "En espera (recién inscritos)",
};

export const MODE_LABELS: Record<GenOnMode, string> = {
  off: "Apagado",
  dry_run: "Simulación (no envía)",
  live: "Activo (envía mensajes)",
};

// ─── API ───────────────────────────────────────────────────────────────

export const fetchGenOnCatalog = async () =>
  (await api.get<GenOnCatalog>("/genon/catalog")).data;

export const fetchGenOnPrograms = async () =>
  (await api.get<GenOnProgram[]>("/genon/programs")).data;

export const createGenOnProgram = async (data: Partial<GenOnProgram>) =>
  (await api.post<GenOnProgram>("/genon/programs", data)).data;

export const updateGenOnProgram = async (id: string, data: Partial<GenOnProgram>) =>
  (await api.put<GenOnProgram>(`/genon/programs/${id}`, data)).data;

export const deleteGenOnProgram = async (id: string) =>
  (await api.delete(`/genon/programs/${id}`)).data;

export const fetchGenOnCourses = async (id: string) =>
  (await api.get<GenOnCourse[]>(`/genon/programs/${id}/courses`)).data;

export const fetchGenOnCourseDetail = async (id: string, eventId: string) =>
  (await api.get<GenOnCourseDetail>(`/genon/programs/${id}/courses/${eventId}`)).data;

export const fetchGenOnEnrollments = async (
  id: string,
  filter: { segment?: string; eventId?: string; limit?: number }
) =>
  (await api.get<GenOnEnrollments>(`/genon/programs/${id}/enrollments`, { params: filter }))
    .data;

export type GenOnHistoryItem =
  | {
      type: "message";
      at: string;
      kind: string;
      step: string | null;
      segment: string | null;
      template: string | null;
      status: string;
      text: string | null;
      progress: number | null;
      completed_activities: number | null;
      delivered_at: string | null;
      read_at: string | null;
      clicked_at: string | null;
      replied_at: string | null;
      reply_text: string | null;
      opted_out_at: string | null;
      error: string | null;
    }
  | {
      type: "activity_progress";
      at: string;
      activity_id: string;
      activity_name: string;
      from: number;
      to: number;
    }
  | { type: "course_progress"; at: string; from: number; to: number }
  | { type: "course_completed"; at: string }
  | {
      type: "challenge";
      at: string;
      kind: string;
      activity_name: string;
      passed: boolean;
      correct: number;
      total: number;
    }
  | { type: "feedback"; at: string; feedback_type: string; text: string };

export interface GenOnHistory {
  enrollment_id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  course: string;
  total_activities: number;
  segment: GenOnSegment;
  segment_since: string;
  progress: number;
  completed_activities: number;
  holdout: boolean;
  slot: string | null;
  paused: boolean;
  exited: boolean;
  exit_reason: string | null;
  abandon_reason: string | null;
  streak: { current: number; best: number } | null;
  next_step_key: string | null;
  next_step_at: string | null;
  /** Primer registro de avance (antes no hay historial de avance) */
  progress_since: string | null;
  items: GenOnHistoryItem[];
}

export const fetchGenOnHistory = async (id: string, enrollmentId: string) =>
  (await api.get<GenOnHistory>(`/genon/programs/${id}/enrollments/${enrollmentId}/history`))
    .data;

export interface GenOnClearHistoryResult {
  messages_deleted: number;
  feedback_deleted: number;
  /** Inscripción nueva tras volver a segmentar (null si era de prueba) */
  enrollment: {
    _id: string;
    segment: GenOnSegment;
    next_step_key: string | null;
    next_step_at: string | null;
  } | null;
}

export interface GenOnAccessLink {
  /** A su actividad pendiente (o al curso si no tiene) */
  url: string;
  course_url: string;
  expires_days: number;
}

/** Enlace de acceso directo de una persona, para entrar como ella a probar. */
export const createGenOnAccessLink = async (id: string, enrollmentId: string) =>
  (
    await api.post<GenOnAccessLink>(
      `/genon/programs/${id}/enrollments/${enrollmentId}/access-link`
    )
  ).data;

/** Borra el historial de Gen.ON de una persona y la vuelve a segmentar. */
export const clearGenOnHistory = async (id: string, enrollmentId: string) =>
  (
    await api.delete<GenOnClearHistoryResult>(
      `/genon/programs/${id}/enrollments/${enrollmentId}/history`
    )
  ).data;

export const fetchGenOnFeedback = async (id: string) =>
  (await api.get<GenOnFeedback[]>(`/genon/programs/${id}/feedback`)).data;

export const updateGenOnFeedback = async (
  id: string,
  feedbackId: string,
  status: "open" | "closed"
) => (await api.put(`/genon/programs/${id}/feedback/${feedbackId}`, { status })).data;

export const simulateGenOn = async (id: string, userId: string, eventId: string) =>
  (await api.post<GenOnSimulation>(`/genon/programs/${id}/test/simulate`, { userId, eventId }))
    .data;

export const previewGenOnStep = async (
  id: string,
  data: { userId: string; eventId: string; stepKey: string; variant?: number }
) => (await api.post<GenOnPreview>(`/genon/programs/${id}/test/preview`, data)).data;

export const sendGenOnTest = async (
  id: string,
  data: { userId: string; eventId: string; stepKey: string; to: string }
) =>
  (
    await api.post<{ sent: boolean; message_id: string | null; template: string; text: string }>(
      `/genon/programs/${id}/test/send`,
      data
    )
  ).data;

export const simulateGenOnTriggers = async (id: string, userId: string, eventId: string) =>
  (
    await api.post<GenOnTriggerSimulation>(`/genon/programs/${id}/test/triggers`, {
      userId,
      eventId,
    })
  ).data;

export const previewGenOnTrigger = async (
  id: string,
  data: { userId: string; eventId: string; key: GenOnTriggerKey }
) =>
  (await api.post<GenOnTriggerPreview>(`/genon/programs/${id}/test/triggers/preview`, data))
    .data;

export const sendGenOnTriggerTest = async (
  id: string,
  data: { userId: string; eventId: string; key: GenOnTriggerKey; to: string }
) =>
  (
    await api.post<{ sent: boolean; template: string; text: string; sample: boolean }>(
      `/genon/programs/${id}/test/triggers/send`,
      data
    )
  ).data;

export const runGenOnNow = async (id: string) =>
  (await api.post<GenOnRunResult>(`/genon/programs/${id}/run`)).data;

/** Con el programa activo: envía ya el próximo mensaje programado de cada persona. */
export const sendGenOnScheduledNow = async (id: string) => {
  const data = (
    await api.post<Pick<GenOnRunResult, "by_result" | "outcomes">>(
      `/genon/programs/${id}/send-now`
    )
  ).data;
  return { ...data, segmentation: null } as GenOnRunResult;
};

export interface GenOnReassignResult {
  enrollments: number;
  people: number;
  by_slot: Record<string, number>;
  variants_cleared: number;
}

export const reassignGenOn = async (id: string) =>
  (await api.post<GenOnReassignResult>(`/genon/programs/${id}/reassign`)).data;

export const fetchGenOnTemplates = async () =>
  (await api.get<GenOnTemplate[]>("/genon/templates")).data;

export const createGenOnTemplate = async (data: Partial<GenOnTemplate>) =>
  (await api.post<GenOnTemplate>("/genon/templates", data)).data;

export const updateGenOnTemplate = async (id: string, data: Partial<GenOnTemplate>) =>
  (await api.put<GenOnTemplate>(`/genon/templates/${id}`, data)).data;

export const deleteGenOnTemplate = async (id: string) =>
  (await api.delete(`/genon/templates/${id}`)).data;

export const submitGenOnTemplate = async (id: string) =>
  (await api.post<GenOnTemplate>(`/genon/templates/${id}/submit`)).data;

export const syncGenOnTemplates = async () =>
  (await api.post<{ updated: number; total: number }>("/genon/templates/sync")).data;

/** Mensaje de error legible de una respuesta de la API. */
export const apiError = (e: any, fallback: string) => {
  const msg = e?.response?.data?.message;
  return (Array.isArray(msg) ? msg.join(" ") : msg) || e?.message || fallback;
};
