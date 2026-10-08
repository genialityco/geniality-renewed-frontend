import api from "./api";

/** Banco de preguntas por actividad generado con IA (backend: ai-evaluations/activity-questions). */

export type ActivityQuestionDifficulty = "basic" | "intermediate" | "advanced";

export type ActivityQuestionType =
  | "open" // abierta
  | "single_choice" // opción única
  | "multiple_choice" // selección múltiple
  | "true_false" // verdadero/falso
  | "fill_blank" // completar el espacio (____)
  | "ordering" // ordenar (options en el orden correcto)
  | "matching"; // relacionar parejas

/** Marca del espacio a completar en fill_blank */
export const BLANK = "____";

export interface QuestionOption {
  text: string;
  correct: boolean;
}

export interface QuestionPair {
  left: string;
  right: string;
}

export interface ActivityQuestion {
  _id: string;
  activity_id: string;
  event_id: string;
  module_id: string | null;
  type: ActivityQuestionType;
  question: string;
  /** Abierta: respuesta modelo. Otros tipos: respuesta correcta en texto */
  answer: string;
  /** single/multiple_choice, true_false, ordering (en el orden correcto) */
  options: QuestionOption[];
  /** matching */
  pairs: QuestionPair[];
  /** fill_blank: otras respuestas válidas */
  accepted_answers: string[];
  explanation: string;
  key_points: string[];
  difficulty: ActivityQuestionDifficulty;
  topic: string;
  /** Segundo del video donde se explica el tema */
  start_time: number | null;
  source: "ai" | "manual";
  /** Pregunta de IA modificada por el admin (no se borra al regenerar) */
  edited: boolean;
  enabled: boolean;
  order: number;
  updated_at: string;
}

export type ActivityQuestionInput = Partial<
  Pick<
    ActivityQuestion,
    | "type"
    | "question"
    | "options"
    | "pairs"
    | "accepted_answers"
    | "explanation"
    | "key_points"
    | "difficulty"
    | "topic"
    | "start_time"
    | "enabled"
    | "order"
  >
> & {
  /** true_false: true/false; abierta y completar: texto */
  answer?: string | boolean;
};

export interface GenerateActivityQuestionsInput {
  num_questions?: number;
  /** Tipos a generar (por defecto todos); se reparten de forma pareja */
  types?: ActivityQuestionType[];
  difficulty?: ActivityQuestionDifficulty | "mixed";
  instructions?: string;
  /** replace: reemplaza las generadas por IA sin editar; append: agrega nuevas */
  mode?: "replace" | "append";
}

export interface GenerateActivityQuestionsResponse {
  generated: number;
  transcript_chars: number;
  truncated: boolean;
  questions: ActivityQuestion[];
}

export type ActivityQuestionCounts = Record<
  string,
  { total: number; enabled: number }
>;

// La generación con un video de 2 h puede tardar ~1 min
const GENERATION_TIMEOUT_MS = 200000;

const base = (organizationId: string, activityId: string) =>
  `/ai-evaluations/organization/${organizationId}/activities/${activityId}/questions`;

export const fetchActivityQuestionCounts = async (
  organizationId: string,
  eventId: string
) => {
  const r = await api.get<ActivityQuestionCounts>(
    `/ai-evaluations/organization/${organizationId}/event/${eventId}/activity-questions/counts`
  );
  return r.data;
};

export const fetchActivityQuestions = async (
  organizationId: string,
  activityId: string
) => {
  const r = await api.get<ActivityQuestion[]>(base(organizationId, activityId));
  return r.data;
};

export const generateActivityQuestions = async (
  organizationId: string,
  activityId: string,
  data: GenerateActivityQuestionsInput
) => {
  const r = await api.post<GenerateActivityQuestionsResponse>(
    `${base(organizationId, activityId)}/generate`,
    data,
    { timeout: GENERATION_TIMEOUT_MS }
  );
  return r.data;
};

export const createActivityQuestion = async (
  organizationId: string,
  activityId: string,
  data: ActivityQuestionInput
) => {
  const r = await api.post<ActivityQuestion>(base(organizationId, activityId), data);
  return r.data;
};

export const updateActivityQuestion = async (
  organizationId: string,
  activityId: string,
  questionId: string,
  data: ActivityQuestionInput
) => {
  const r = await api.put<ActivityQuestion>(
    `${base(organizationId, activityId)}/${questionId}`,
    data
  );
  return r.data;
};

export const deleteActivityQuestion = async (
  organizationId: string,
  activityId: string,
  questionId: string
) => {
  await api.delete(`${base(organizationId, activityId)}/${questionId}`);
};

export const deleteAllActivityQuestions = async (
  organizationId: string,
  activityId: string
) => {
  await api.delete(base(organizationId, activityId));
};
