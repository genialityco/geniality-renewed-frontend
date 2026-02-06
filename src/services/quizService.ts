import api from "./api";
import { Quiz } from "./types";

/**
 * Crea o actualiza el quiz en el backend:
 * POST /quiz
 * Body: { eventId, questions }
 */
export const createOrUpdateQuiz = async (
  eventId: string,
  questions: any,
): Promise<Quiz> => {
  const response = await api.post<Quiz>("/quiz", {
    eventId,
    questions,
  });
  return response.data;
};

/**
 * Obtiene el quiz (admin/debug):
 * GET /quiz/:eventId
 */
export const fetchQuizByEventId = async (eventId: string): Promise<Quiz> => {
  const response = await api.get<Quiz>(`/quiz/${eventId}`);
  return response.data;
};

/**
 * Obtiene el quiz para que un participante lo realice (safe):
 * GET /quiz/event/:eventId
 */
export const fetchQuizForRun = async (
  eventId: string,
): Promise<Pick<Quiz, "id" | "eventId" | "questions">> => {
  const response = await api.get<Pick<Quiz, "id" | "eventId" | "questions">>(
    `/quiz/event/${eventId}`,
  );
  return response.data;
};

/**
 * Enviar resultado del examen:
 * POST /quiz/:eventId/submit
 * Body: { userId, result }
 */
export const submitQuizResult = async (
  eventId: string,
  userId: string,
  result: number,
): Promise<Quiz> => {
  const response = await api.post<Quiz>(`/quiz/${eventId}/submit`, {
    userId,
    result,
  });
  return response.data;
};

/**
 * Eliminar quiz:
 * DELETE /quiz/:eventId
 */
export const deleteQuizByEventId = async (
  eventId: string,
): Promise<{ deleted: true }> => {
  const response = await api.delete<{ deleted: true }>(`/quiz/${eventId}`);
  return response.data;
};
