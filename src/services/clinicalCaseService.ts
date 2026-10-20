import api from "./api";

/** Casos clínicos con tutor socrático (backend: clinical-cases). */

export type CaseItemCategory = "diagnosis" | "action";
export type CaseItemStatus = "missing" | "partial" | "covered";

/** Cómo responde el estudiante en una etapa. */
export type CaseResponseType = "open" | "single_choice" | "multiple_choice";

export interface CaseOption {
  id?: string;
  text: string;
  /** Paso esperado que cubre; null = distractor */
  item_id: string | null;
  /** Distractor riesgoso para el paciente */
  unsafe: boolean;
  /** Por qué no es adecuado (solo lo usa el tutor) */
  why_not: string;
}

/** Dónde estudiar un paso: actividad del curso + segundo del video. */
export interface CaseResource {
  activity_id: string;
  activity_name: string;
  start_time: number;
}

export interface CaseFeedback {
  grade?: number | null;
  comment?: string;
  well_done?: string[];
  could_improve?: string[];
  to_strengthen?: string[];
  topics?: { topic: string; resources: CaseResource[] }[];
  /** Seguimiento: lo que le pasó al paciente por lo omitido */
  consequences?: { time_label: string; text: string }[];
  /** Decisiones de riesgo y propuestas sin indicación */
  risks?: string[];
  unnecessary?: string[];
  penalty?: number;
  cap?: number | null;
  reviewed?: boolean;
  strengths: string[];
  to_review: string[];
}

export interface CaseExpectedItem {
  id?: string;
  text: string;
  category: CaseItemCategory;
  critical: boolean;
  rationale: string;
  resources?: CaseResource[];
  /** Seguimiento: qué le pasa al paciente en el siguiente control si se omite */
  if_missed?: string;
  /** Paso condicional: solo se espera si antes se omitió el paso con este id */
  only_if_missed?: string | null;
}

export interface CaseStage {
  id?: string;
  title: string;
  /** Seguimiento: momento del control ("6 meses después"…) */
  time_label?: string;
  reveal: string;
  question: string;
  response_type?: CaseResponseType;
  options?: CaseOption[];
  expected: CaseExpectedItem[];
  common_errors: string[];
  max_turns: number;
}

export interface ClinicalCase {
  _id: string;
  event_id: string;
  activity_id: string | null;
  title: string;
  summary: string;
  presentation: string;
  stages: CaseStage[];
  /** Parte 2: seguimiento a largo plazo */
  followup_stages?: CaseStage[];
  followup_horizon?: string;
  enabled: boolean;
  source: "ai" | "manual";
  reviewed: boolean;
  reviewed_by: string;
  created_at: string;
  updated_at: string;
  sessions?: number;
  completed_sessions?: number;
}

export type CaseInput = Partial<
  Pick<
    ClinicalCase,
    | "title"
    | "summary"
    | "presentation"
    | "stages"
    | "followup_stages"
    | "followup_horizon"
    | "enabled"
    | "reviewed"
    | "reviewed_by"
  >
>;

export interface CaseScores {
  diagnosis: number | null;
  actions: number | null;
  overall: number | null;
  /** Parte de seguimiento */
  followup?: number | null;
  /** Pasos cubiertos antes de penalizaciones */
  coverage?: number | null;
  precision?: number | null;
  unsafe_count?: number;
  unnecessary_count?: number;
  /** Puntos restados por propuestas sin indicación */
  penalty?: number;
  /** Nota máxima (0-100) por decisiones de riesgo */
  cap?: number | null;
}

export interface CaseSessionView {
  session_id: string;
  case_id: string;
  title: string;
  /** acute: el caso · followup: seguimiento a largo plazo */
  part: "acute" | "followup";
  /** Revisado por un docente */
  reviewed?: boolean;
  review_note?: string;
  followup_horizon: string;
  /** Terminó la parte aguda y el caso tiene seguimiento */
  followup_available: boolean;
  status: "in_progress" | "completed" | "abandoned";
  stage: number;
  total_stages: number;
  /** Etapa actual de selección: opciones a mostrar (sin indicar la correcta) */
  choice: {
    type: "single_choice" | "multiple_choice";
    options: { id: string; text: string }[];
  } | null;
  messages: {
    role: "tutor" | "student";
    content: string;
    created_at: string;
    /** summary: cierre con la retroalimentación */
    kind?: "summary";
    feedback?: CaseFeedback | null;
  }[];
  result: {
    scores: CaseScores;
    feedback: CaseFeedback | null;
    stages: {
      title: string;
      time_label?: string;
      question: string;
      items: (CaseExpectedItem & {
        status: "missing" | "partial" | "covered";
        with_help: boolean;
      })[];
    }[];
  } | null;
}

interface SessionBrief {
  _id: string;
  status: CaseSessionView["status"];
  stage: number;
  scores: CaseScores | null;
}

export interface AvailableCase {
  _id: string;
  title: string;
  summary: string;
  total_stages: number;
  last_session: SessionBrief | null;
  followup: {
    horizon: string;
    total_stages: number;
    /** Se desbloquea al terminar la parte aguda */
    unlocked: boolean;
    last_session: SessionBrief | null;
  } | null;
}

export interface CaseSessionSummary {
  _id: string;
  user_name: string;
  email: string;
  status: CaseSessionView["status"];
  part?: "acute" | "followup";
  reviewed?: boolean;
  stage: number;
  total_stages: number;
  turns: number;
  scores: CaseScores | null;
  started_at: string;
  finished_at?: string;
}

export interface CaseReview {
  reviewer_name: string;
  reviewed_at: string;
  note: string;
  items_checked: number;
  changes: {
    stage: number;
    kind: "item" | "unsafe" | "unnecessary";
    item_id?: string;
    text: string;
    from: string;
    to: string;
    evidence?: string;
  }[];
}

export interface CaseAdminSession {
  _id: string;
  part?: "acute" | "followup";
  user_name: string;
  email: string;
  status: CaseSessionView["status"];
  scores: CaseScores | null;
  case_snapshot: { title: string; presentation: string; stages: CaseStage[] };
  /** Avance oculto por etapa (para la revisión docente) */
  stages?: {
    items: {
      item_id: string;
      status: CaseItemStatus;
      hint_level: number | null;
      active?: boolean;
      evidence?: string;
      reviewed?: boolean;
    }[];
    unsafe?: string[];
    unnecessary?: string[];
  }[];
  review?: CaseReview | null;
  messages: {
    role: "tutor" | "student";
    content: string;
    stage: number;
    created_at: string;
    move?: string;
    eval?: {
      covered: string[];
      partial: string[];
      misconceptions: string[];
      unsafe: string[];
      asked_for_data: boolean;
      unnecessary?: string[];
      evidence?: Record<string, string>;
    };
  }[];
}

export interface CaseCalibration {
  reviewed_sessions: number;
  items_checked: number;
  item_changes: number;
  /** % de pasos revisados en los que el docente coincidió con la IA */
  agreement: number | null;
  false_positive: number;
  false_negative: number;
  dismissed_unsafe: number;
  dismissed_unnecessary: number;
}

// ─── Admin ────────────────────────────────────────────────────────────────

const admin = (organizationId: string) =>
  `/clinical-cases/admin/organization/${organizationId}`;

export const fetchClinicalCases = async (organizationId: string, eventId: string) =>
  (await api.get<ClinicalCase[]>(`${admin(organizationId)}/event/${eventId}/cases`)).data;

export const generateClinicalCase = async (
  organizationId: string,
  eventId: string,
  body: { activity_id?: string | null; num_stages?: number; instructions?: string }
) =>
  (
    await api.post<ClinicalCase>(
      `${admin(organizationId)}/event/${eventId}/cases/generate`,
      body,
      { timeout: 180000 }
    )
  ).data;

export const updateClinicalCase = async (
  organizationId: string,
  caseId: string,
  body: CaseInput
) => (await api.put<ClinicalCase>(`${admin(organizationId)}/cases/${caseId}`, body)).data;

/** Revisión docente de un intento: corrige al evaluador y recalcula la nota. */
export const reviewClinicalCaseSession = async (
  organizationId: string,
  sessionId: string,
  body: {
    items: { stage: number; item_id: string; status: CaseItemStatus }[];
    dismiss_unsafe?: string[];
    dismiss_unnecessary?: string[];
    note?: string;
  }
) =>
  (await api.put<CaseAdminSession>(`${admin(organizationId)}/sessions/${sessionId}/review`, body))
    .data;

/** Concordancia IA–docente en un caso (calibración del evaluador). */
export const fetchClinicalCaseCalibration = async (organizationId: string, caseId: string) =>
  (await api.get<CaseCalibration>(`${admin(organizationId)}/cases/${caseId}/calibration`)).data;

/** Genera con IA (o regenera) el seguimiento a largo plazo del caso. */
export const generateClinicalCaseFollowup = async (
  organizationId: string,
  caseId: string,
  body: { years?: number; num_stages?: number; instructions?: string }
) =>
  (
    await api.post<ClinicalCase>(
      `${admin(organizationId)}/cases/${caseId}/followup/generate`,
      body,
      { timeout: 180000 }
    )
  ).data;

/** Vuelve a buscar en los videos del curso "dónde estudiar" cada paso. */
export const refreshClinicalCaseResources = async (organizationId: string, caseId: string) =>
  (
    await api.post<ClinicalCase>(`${admin(organizationId)}/cases/${caseId}/resources`, undefined, {
      timeout: 180000,
    })
  ).data;

export const deleteClinicalCase = async (organizationId: string, caseId: string) => {
  await api.delete(`${admin(organizationId)}/cases/${caseId}`);
};

export const fetchClinicalCaseSessions = async (organizationId: string, caseId: string) =>
  (await api.get<CaseSessionSummary[]>(`${admin(organizationId)}/cases/${caseId}/sessions`))
    .data;

export const fetchClinicalCaseAdminSession = async (
  organizationId: string,
  sessionId: string
) => (await api.get<CaseAdminSession>(`${admin(organizationId)}/sessions/${sessionId}`)).data;

// ─── Estudiante ───────────────────────────────────────────────────────────

const student = (organizationId: string) => `/clinical-cases/organization/${organizationId}`;

export const fetchAvailableCases = async (organizationId: string, eventId: string) =>
  (await api.get<AvailableCase[]>(`${student(organizationId)}/event/${eventId}/available`))
    .data;

/** Retoma el intento en curso o crea uno nuevo (parte aguda o seguimiento). */
export const startClinicalCase = async (
  organizationId: string,
  caseId: string,
  part: "acute" | "followup" = "acute"
) =>
  (
    await api.post<CaseSessionView>(`${student(organizationId)}/cases/${caseId}/sessions`, {
      part,
    })
  ).data;

export const fetchCaseSession = async (organizationId: string, sessionId: string) =>
  (await api.get<CaseSessionView>(`${student(organizationId)}/sessions/${sessionId}`)).data;

export const sendCaseMessage = async (
  organizationId: string,
  sessionId: string,
  text: string,
  selected: string[] = []
) =>
  (
    await api.post<CaseSessionView>(
      `${student(organizationId)}/sessions/${sessionId}/messages`,
      { text, selected },
      { timeout: 120000 }
    )
  ).data;
