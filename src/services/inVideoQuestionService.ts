import api from "./api";

/** Preguntas dentro del video (backend: ai-evaluations/in-video-questions). */

export type InVideoQuestionType = "single_choice" | "multiple_choice" | "true_false";

export interface InVideoQuestion {
  id: string;
  type: InVideoQuestionType;
  question: string;
  /** Texto de las opciones; la correcta no viene, se califica en el servidor */
  options: string[];
  /** Segundo del video en el que se muestra */
  trigger_at: number;
  /** Segundo donde empieza a explicarse el tema (para "volver a ver") */
  start_time: number;
}

export interface InVideoQuestions {
  enabled: boolean;
  questions: InVideoQuestion[];
}

export interface InVideoAnswerResult {
  correct: boolean;
  score: number;
  skipped: boolean;
  correct_options: number[];
  explanation: string;
  start_time: number | null;
}

const base = (organizationId: string, activityId: string) =>
  `/ai-evaluations/organization/${organizationId}/activities/${activityId}/in-video-questions`;

export const fetchInVideoQuestions = async (
  organizationId: string,
  activityId: string
) => {
  const r = await api.get<InVideoQuestions>(base(organizationId, activityId));
  return r.data;
};

export const answerInVideoQuestion = async (
  organizationId: string,
  activityId: string,
  questionId: string,
  body: { selected?: number[]; skipped?: boolean }
) => {
  const r = await api.post<InVideoAnswerResult>(
    `${base(organizationId, activityId)}/${questionId}/answer`,
    body
  );
  return r.data;
};
