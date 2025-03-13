import api from "./api";
import { Quiz } from "./types";

/**
 * Crea o actualiza el quiz en el backend:
 * POST /quiz
 * Body: { activity_id, quiz_json }
 */
export const createOrUpdateQuiz = async (activityId: string, quizJson: any): Promise<Quiz> => {
  const response = await api.post<Quiz>("/quiz", {
    activity_id: activityId,
    quiz_json: quizJson,
  });
  return response.data;
};

/**
 * Obtiene el quiz de una actividad:
 * GET /quiz/:activityId
 */
export const fetchQuizByActivity = async (activityId: string): Promise<Quiz> => {
  const response = await api.get<Quiz>(`/quiz/${activityId}`);
  return response.data;
};
