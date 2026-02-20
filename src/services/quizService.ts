/**
 * Quiz Service
 * API calls for quiz management, student attempts, and results
 */

import api from "./api";
import {
  AdminQuizDTO,
  AttemptResult,
  QuizApiError,
  QuizResultsAggregate,
  StudentQuizDTO,
} from "../types/quiz.types";

/**
 * Get quiz for student (without correct answers)
 * GET /quiz/event/:eventId
 */
export const fetchStudentQuiz = async (
  eventId: string
): Promise<StudentQuizDTO | null> => {
  try {
    const response = await api.get<StudentQuizDTO>(
      `/quiz/event/${eventId}`
    );
    // Backend devuelve el quiz directamente, no envuelto en {data: ...}
    return response.data;
  } catch (error: any) {
    // Si es 404, significa que no hay quiz creado aún (estado válido)
    if (error.response?.status === 404) {
      return null;
    }
    // Para otros errores, sí lanzar la excepción
    handleQuizError(error);
  }
};

/**
 * Get quiz for admin with correct answers
 * GET /quiz/:eventId
 */
export const fetchAdminQuiz = async (
  eventId: string
): Promise<AdminQuizDTO | null> => {
  try {
    const response = await api.get<AdminQuizDTO>(
      `/quiz/${eventId}`
    );
    // Backend devuelve el quiz directamente, no envuelto en {data: ...}
    return response.data;
  } catch (error: any) {
    // Si es 404, significa que no hay quiz creado aún (estado válido)
    if (error.response?.status === 404) {
      return null;
    }
    // Para otros errores, sí lanzar la excepción
    handleQuizError(error);
  }
};

/**
 * Get quiz by event ID (alias for fetchAdminQuiz for compatibility)
 */
export const fetchQuizByEventId = fetchAdminQuiz;

/**
 * Fetch quiz for student to run (without correct answers)
 * Alias for fetchStudentQuiz for compatibility
 */
export const fetchQuizForRun = fetchStudentQuiz;

/**
 * Create or update quiz
 * POST /quiz
 */
export const createOrUpdateQuiz = async (
  eventId: string,
  quiz: AdminQuizDTO
): Promise<AdminQuizDTO> => {
  return saveQuiz(eventId, quiz);
};

/**
 * Save or update quiz
 * POST /quiz
 */
export const saveQuiz = async (
  eventId: string,
  quiz: AdminQuizDTO | any
): Promise<AdminQuizDTO> => {
  try {
    // Crear un payload limpio sin campos backend
    const { id: _id, _id: _mongoId, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = quiz;

    // El payload debe tener solo eventId y questions
    // Sin intentar agregar 'points' o 'meta' que no están en los DTOs
    const transformedPayload = {
      eventId,
      questions: payload.questions || [],
    };

    console.log("📤 Enviando quiz:", {
      url: "/quiz",
      payload: transformedPayload,
      questionsCount: transformedPayload.questions?.length || 0,
    });

    const response = await api.post<AdminQuizDTO>(
      `/quiz`,
      transformedPayload
    );
    console.log("✅ Quiz guardado exitosamente:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error guardando quiz:", {
      status: error.response?.status,
      message: error.response?.data?.message,
      error: error.message,
    });
    handleQuizError(error);
  }
};

/**
 * Submit quiz attempt - Step 1
 * POST /quiz/:eventId/submit
 * 
 * Takes userId, returns questions with correct answers for scoring
 * Does NOT save result to database
 *
 * Error codes:
 * - 404: Quiz not available
 */
export const submitQuizAttempt = async (
  eventId: string,
  payload: { userId: string }
): Promise<{ id: string; eventId: string; userId: string; questions: any[] }> => {
  try {
    const response = await api.post(
      `/quiz/${eventId}/submit`,
      payload
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Save quiz result - Step 2
 * POST /quiz/:eventId/save-result
 * 
 * Saves the calculated result to database after client-side scoring
 */
export const saveQuizResult = async (
  eventId: string,
  payload: { userId: string; result: number }
): Promise<{ id: string; eventId: string; attempt: { userId: string; result: number } }> => {
  try {
    const response = await api.post(
      `/quiz/${eventId}/save-result`,
      payload
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Get quiz results for admin
 * GET /quiz/:eventId
 */
export const fetchQuizResults = async (
  eventId: string
): Promise<QuizResultsAggregate | null> => {
  try {
    const response = await api.get<QuizResultsAggregate>(
      `/quiz/${eventId}`
    );
    return response.data;
  } catch (error: any) {
    // Si es 404, significa que no hay quiz o resultados aún (estado válido)
    if (error.response?.status === 404) {
      return null;
    }
    // Para otros errores, sí lanzar la excepción
    handleQuizError(error);
  }
};

/**
 * Get single attempt result by ID
 * GET /quiz/:eventId
 */
export const fetchAttemptResult = async (
  eventId: string,
  _attemptId: string
): Promise<AttemptResult> => {
  try {
    const response = await api.get<AttemptResult>(
      `/quiz/${eventId}`
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Get user's quiz attempts
 * GET /quiz/:eventId
 */
export const fetchUserQuizAttempts = async (
  eventId: string,
  _userId: string
): Promise<AttemptResult[]> => {
  try {
    const response = await api.get<AttemptResult[]>(
      `/quiz/${eventId}`
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Error handler for quiz API calls
 */
function handleQuizError(error: any): never {
  if (error.response?.status === 409) {
    throw new QuizApiError(
      409,
      "MAX_ATTEMPTS_EXCEEDED",
      "Ya alcanzaste el máximo de intentos para este examen.",
      error.response?.data
    );
  }

  if (error.response?.status === 404) {
    throw new QuizApiError(
      404,
      "QUIZ_NOT_FOUND",
      "El examen no está disponible.",
      error.response?.data
    );
  }

  if (error.response?.status === 403) {
    throw new QuizApiError(
      403,
      "FORBIDDEN",
      "No tienes permiso para acceder a este examen.",
      error.response?.data
    );
  }

  if (error.response?.status === 400) {
    throw new QuizApiError(
      400,
      "VALIDATION_ERROR",
      error.response?.data?.message || "Error de validación",
      error.response?.data
    );
  }

  throw new QuizApiError(
    error.response?.status || 500,
    error.response?.data?.code || "UNKNOWN_ERROR",
    error.response?.data?.message || "Error desconocido",
    error.response?.data
  );
}
