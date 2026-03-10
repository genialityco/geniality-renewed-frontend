import api from "./api";

// ─────────────────────────────────────────────
// DTOs / Types
// ─────────────────────────────────────────────

/**
 * DTO para enviar una respuesta de usuario
 */
export interface UserAnswerDto {
  questionId: string;
  answer: any; // string | string[] | { columnAId, matches } para matching
}

/**
 * DTO para enviar un intento
 */
export interface SubmitAttemptDto {
  userId: string;
  userAnswers: UserAnswerDto[];
  hasOpenQuestions?: boolean; // true si el quiz tiene preguntas abiertas
}

/**
 * DTO para calificación manual del intento
 */
export interface GradeAttemptDto {
  score: number; // 0-100
}

/**
 * DTO para calificar una pregunta abierta
 */
export interface GradeOpenQuestionDto {
  questionId: string;
  score: number; // 1-10
  gradedBy?: string; // ID del admin (opcional)
}

/**
 * Respuesta del intento guardado
 */
export interface ManualScore {
  questionId: string;
  score: number; // 1-10
  gradedAt: string;
  gradedBy: string | null;
}

export interface UserQuizAttempt {
  _id: string;
  quizId: string;
  userId: string;
  attemptedAt: string;
  status: "graded" | "pending" | "review";
  score: number;
  userAnswers: UserAnswerDto[];
  manualScores?: ManualScore[];
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

/**
 * Envía un nuevo intento de quiz del usuario.
 * POST /user-quiz-attempt/:quizId/submit
 */
export const submitQuizAttempt = async (
  quizId: string,
  dto: SubmitAttemptDto,
): Promise<UserQuizAttempt> => {
  const response = await api.post<UserQuizAttempt>(
    `/user-quiz-attempt/${quizId}/submit`,
    dto,
  );
  return response.data;
};

/**
 * Obtiene todos los intentos de un usuario para un quiz específico.
 * GET /user-quiz-attempt/:quizId/user/:userId
 * Devuelve un array vacío si el endpoint no existe aún (404).
 */
export const getUserAttempts = async (
  quizId: string,
  userId: string,
): Promise<UserQuizAttempt[]> => {
  try {
    const response = await api.get<UserQuizAttempt[]>(
      `/user-quiz-attempt/${quizId}/user/${userId}`,
    );
    return response.data;
  } catch (error: any) {
    // Si el endpoint no existe (404), devolver array vacío silenciosamente
    if (error?.response?.status === 404) {
      return [];
    }
    // Para otros errores, relanzar
    throw error;
  }
};

/**
 * Obtiene el mejor score del usuario para un quiz.
 * GET /user-quiz-attempt/:quizId/score/:userId
 * @returns El mejor score (0–100), o false si no tiene intentos
 * Devuelve false si el endpoint no existe aún (404).
 */
export const getBestScore = async (
  quizId: string,
  userId: string,
): Promise<number | false> => {
  try {
    const response = await api.get<number | false>(
      `/user-quiz-attempt/${quizId}/score/${userId}`,
    );
    return response.data;
  } catch (error: any) {
    // Si el endpoint no existe (404), devolver false silenciosamente
    if (error?.response?.status === 404) {
      return false;
    }
    // Para otros errores, relanzar
    throw error;
  }
};

/**
 * Calificación manual de un intento.
 * PATCH /user-quiz-attempt/:attemptId/grade
 */
export const gradeAttempt = async (
  attemptId: string,
  dto: GradeAttemptDto,
): Promise<UserQuizAttempt> => {
  const response = await api.patch<UserQuizAttempt>(
    `/user-quiz-attempt/${attemptId}/grade`,
    dto,
  );
  return response.data;
};

/**
 * Obtiene tipo para resultados de best-scores
 */
export interface BestScoreResult {
  userId: string;
  bestScore: number;
  attemptCount: number;
}

/**
 * Obtiene los mejores scores de todos los usuarios para un quiz.
 * GET /user-quiz-attempt/:quizId/best-scores
 */
export const getAllBestScores = async (
  quizId: string,
): Promise<BestScoreResult[]> => {
  const response = await api.get<BestScoreResult[]>(
    `/user-quiz-attempt/${quizId}/best-scores`,
  );
  return response.data;
};

/**
 * Califica una pregunta abierta específica.
 * POST /user-quiz-attempt/:attemptId/grade-open-question
 * Recalcula el score del intento y actualiza el status según corresponda.
 */
export const gradeOpenQuestion = async (
  attemptId: string,
  dto: GradeOpenQuestionDto,
): Promise<UserQuizAttempt> => {
  const response = await api.post<UserQuizAttempt>(
    `/user-quiz-attempt/${attemptId}/grade-open-question`,
    dto,
  );
  return response.data;
};

/**
 * Obtiene un intento específico por su ID.
 * GET /user-quiz-attempt/:attemptId
 */
export const getAttemptById = async (
  attemptId: string,
): Promise<UserQuizAttempt> => {
  const response = await api.get<UserQuizAttempt>(
    `/user-quiz-attempt/${attemptId}`,
  );
  return response.data;
};

// ─────────────────────────────────────────────
// Named export for convenience
// ─────────────────────────────────────────────

export const userQuizAttemptService = {
  submit: submitQuizAttempt,
  getByUser: getUserAttempts,
  getBestScore,
  getAllBestScores,
  getById: getAttemptById,
  grade: gradeAttempt,
};
