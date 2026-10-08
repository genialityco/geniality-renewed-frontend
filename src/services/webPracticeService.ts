import api from "./api";

/** "Evaluar mis conocimientos" por actividad (backend: ai-evaluations/.../practice). */

export type WebPracticeQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "fill_blank"
  | "open";

export interface WebPracticeResult {
  correct: boolean;
  score: number;
  skipped: boolean;
  answer: string;
  /** Retroalimentación de la IA (abiertas) */
  feedback: string;
  /** Índices de las opciones correctas (opción única/múltiple, V/F) */
  correct_options: number[];
  /** Respuesta esperada (completar) */
  correct_answer: string;
  explanation: string;
  start_time: number | null;
}

export interface WebPracticeQuestion {
  index: number;
  type: WebPracticeQuestionType;
  question: string;
  options: string[];
  result: WebPracticeResult | null;
}

export interface WebPractice {
  session_id: string;
  status: "in_progress" | "completed";
  current_question: number;
  total: number;
  questions: WebPracticeQuestion[];
  summary: {
    score: number | null;
    correct_count: number;
    answered_count: number;
    total: number;
  } | null;
}

export interface WebPracticeAnswerResponse extends WebPractice {
  result: WebPracticeResult | null;
  /** La IA detectó una duda en vez de una respuesta: aclaración para reintentar */
  doubt?: string;
}

export interface WebPracticeAvailability {
  available: number;
  active_session_id: string | null;
}

const base = (organizationId: string, activityId: string) =>
  `/ai-evaluations/organization/${organizationId}/activities/${activityId}/practice`;

export const fetchWebPracticeAvailability = async (
  organizationId: string,
  activityId: string
) => {
  const r = await api.get<WebPracticeAvailability>(
    `${base(organizationId, activityId)}/availability`
  );
  return r.data;
};

/** Retoma la práctica en curso de la actividad o crea una nueva. */
export const startWebPractice = async (organizationId: string, activityId: string) => {
  const r = await api.post<WebPractice>(base(organizationId, activityId));
  return r.data;
};

export const answerWebPractice = async (
  organizationId: string,
  activityId: string,
  sessionId: string,
  body: { index: number; selected?: number[]; text?: string; skipped?: boolean }
) => {
  const r = await api.post<WebPracticeAnswerResponse>(
    `${base(organizationId, activityId)}/${sessionId}/answer`,
    body
  );
  return r.data;
};
