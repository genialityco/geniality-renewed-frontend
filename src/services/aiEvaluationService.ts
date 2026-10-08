import api from "./api";

/** Evaluación de conocimientos por WhatsApp con IA (módulo ai-evaluations del backend). */

export type AiEvaluationDifficulty = "basic" | "intermediate" | "advanced" | "mixed";

export interface AiEvaluationContext {
  _id: string;
  event_id: string;
  /** null = contexto de todo el curso */
  module_id: string | null;
  enabled: boolean;
  content: string;
  learning_objectives: string[];
  instructions: string;
  document_ids: string[];
  fixed_questions: string[];
  num_questions: number | null;
  passing_score: number | null;
  difficulty: AiEvaluationDifficulty;
  updated_at: string;
}

export type AiEvaluationContextInput = Partial<
  Pick<
    AiEvaluationContext,
    | "enabled"
    | "content"
    | "learning_objectives"
    | "instructions"
    | "document_ids"
    | "fixed_questions"
    | "num_questions"
    | "passing_score"
    | "difficulty"
  >
>;

export interface AiEvaluationContextsResponse {
  /** Evaluación habilitada en el curso */
  enabled: boolean;
  defaults: { num_questions: number; passing_score: number };
  course: AiEvaluationContext | null;
  modules: { id: string; name: string; context: AiEvaluationContext | null }[];
}

export interface AiEvaluationResult {
  _id: string;
  session_id: string;
  user_id: string;
  user_name?: string;
  event_name: string;
  module_id: string | null;
  module_name: string;
  score: number;
  passed: boolean;
  passing_score: number;
  total_questions: number;
  correct_answers: number;
  questions: {
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }[];
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendation: string;
  created_at: string;
}

export interface StartAiEvaluationResponse {
  session_id: string;
  code: string;
  whatsapp_url: string;
  expires_at: string;
  event_name: string;
  modules: { id: string; name: string }[];
}

/** "course" en la ruta = contexto de todo el curso */
export const COURSE_KEY = "course";

const adminBase = (organizationId: string, eventId: string) =>
  `/ai-evaluations/organization/${organizationId}/event/${eventId}`;

// ─── Estudiante ──────────────────────────────────────────────────────────

export const getAiEvaluationAvailability = async (eventId: string) => {
  const r = await api.get<{ enabled: boolean; modules: { id: string; name: string }[] }>(
    `/ai-evaluations/event/${eventId}/availability`
  );
  return r.data;
};

export const startAiEvaluation = async (eventId: string, moduleId?: string) => {
  const r = await api.post<StartAiEvaluationResponse>("/ai-evaluations/start", {
    event_id: eventId,
    module_id: moduleId,
  });
  return r.data;
};

export const fetchMyAiEvaluationResults = async (eventId: string) => {
  const r = await api.get<AiEvaluationResult[]>(
    `/ai-evaluations/me/event/${eventId}/results`
  );
  return r.data;
};

// ─── Admin ───────────────────────────────────────────────────────────────

export const fetchAiEvaluationContexts = async (
  organizationId: string,
  eventId: string
) => {
  const r = await api.get<AiEvaluationContextsResponse>(
    `${adminBase(organizationId, eventId)}/contexts`
  );
  return r.data;
};

export const saveAiEvaluationContext = async (
  organizationId: string,
  eventId: string,
  moduleKey: string,
  data: AiEvaluationContextInput
) => {
  const r = await api.put<AiEvaluationContext>(
    `${adminBase(organizationId, eventId)}/contexts/${moduleKey}`,
    data
  );
  return r.data;
};

export const deleteAiEvaluationContext = async (
  organizationId: string,
  eventId: string,
  moduleKey: string
) => {
  await api.delete(`${adminBase(organizationId, eventId)}/contexts/${moduleKey}`);
};

export const generateAiEvaluationDraft = async (
  organizationId: string,
  eventId: string,
  moduleKey: string
) => {
  const r = await api.post<{
    content: string;
    learning_objectives: string[];
    source_chars: number;
  }>(`${adminBase(organizationId, eventId)}/contexts/${moduleKey}/draft`);
  return r.data;
};

export const fetchAiEvaluationEventResults = async (
  organizationId: string,
  eventId: string
) => {
  const r = await api.get<AiEvaluationResult[]>(
    `${adminBase(organizationId, eventId)}/results`
  );
  return r.data;
};
