// quizAttemptService.ts
import api from "./api";
import { QuizAttempt } from "./types";

/**
 * Crea un nuevo intento:
 * POST /quiz-attempts
 */
export const createQuizAttempt = async (attemptData: Partial<QuizAttempt>): Promise<QuizAttempt> => {
  const response = await api.post<QuizAttempt>("/quiz-attempts", attemptData);
  return response.data;
};

/**
 * Obtiene los intentos de un usuario en un quiz:
 * GET /quiz-attempts/byUserAndQuiz?quiz_id=xxx&user_id=yyy
 */
export const fetchQuizAttemptsByUserAndQuiz = async (
  quizId: string,
  userId: string
): Promise<QuizAttempt[]> => {
  const response = await api.get<QuizAttempt[]>("/quiz-attempts/byUserAndQuiz", {
    params: { quiz_id: quizId, user_id: userId },
  });
  return response.data;
};

/**
 * Obtiene un attempt por su ID:
 * GET /quiz-attempts/:id
 */
export const fetchQuizAttemptById = async (id: string): Promise<QuizAttempt> => {
  const response = await api.get<QuizAttempt>(`/quiz-attempts/${id}`);
  return response.data;
};

/**
 * Actualiza un attempt existente (opcional):
 * PUT /quiz-attempts/:id
 */
export const updateQuizAttempt = async (
  id: string,
  updateData: Partial<QuizAttempt>
): Promise<QuizAttempt> => {
  const response = await api.put<QuizAttempt>(`/quiz-attempts/${id}`, updateData);
  return response.data;
};
