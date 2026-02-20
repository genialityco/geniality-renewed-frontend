/**
 * Quiz Service
 * API calls for quiz management, student attempts, and results
 */

import api from "./api";
import {
  AdminQuizDTO,
  AttemptResult,
  AttemptSubmitPayload,
  QuizApiError,
  QuizResultsAggregate,
  StudentQuizDTO,
} from "../types/quiz.types";

/**
 * Get quiz for student (without correct answers)
 * GET /events/:eventId/quiz
 */
export const fetchStudentQuiz = async (
  eventId: string
): Promise<StudentQuizDTO | null> => {
  try {
    const response = await api.get<StudentQuizDTO>(
      `/events/${eventId}/quiz`
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
 * GET /events/:eventId/quiz/admin
 */
export const fetchAdminQuiz = async (
  eventId: string
): Promise<AdminQuizDTO | null> => {
  try {
    const response = await api.get<AdminQuizDTO>(
      `/events/${eventId}/quiz/admin`
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
 * POST/PUT /events/:eventId/quiz
 */
export const createOrUpdateQuiz = async (
  eventId: string,
  quiz: AdminQuizDTO
): Promise<AdminQuizDTO> => {
  return saveQuiz(eventId, quiz);
};

/**
 * Save or update quiz
 * PUT /events/:eventId/quiz
 */
export const saveQuiz = async (
  eventId: string,
  quiz: AdminQuizDTO | any
): Promise<AdminQuizDTO> => {
  try {
    // Crear un payload limpio sin campos backend
    const { id: _id, _id: _mongoId, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = quiz;

    // El payload ya tiene la estructura correcta con 'meta'
    // Solo aseguramos que eventId esté incluido
    const transformedPayload = {
      ...payload,
      eventId, // Asegurar que eventId esté en el payload
      questions: payload.questions.map((q: any) => ({
        ...q,
        points: q.points || 1, // Asegurar que points siempre tenga un valor
      })),
    };

    const response = await api.put<AdminQuizDTO>(
      `/events/${eventId}/quiz`,
      transformedPayload
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Submit quiz attempt
 * POST /events/:eventId/quiz/attempts/submit
 *
 * Error codes:
 * - 409: Max attempts exceeded
 * - 404: Quiz not available
 */
export const submitQuizAttempt = async (
  eventId: string,
  payload: AttemptSubmitPayload
): Promise<AttemptResult> => {
  try {
    const response = await api.post<AttemptResult>(
      `/events/${eventId}/quiz/attempts/submit`,
      payload
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Get quiz results for admin
 * GET /events/:eventId/quiz/results
 */
export const fetchQuizResults = async (
  eventId: string
): Promise<QuizResultsAggregate | null> => {
  try {
    const response = await api.get<QuizResultsAggregate>(
      `/events/${eventId}/quiz/results`
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
 * GET /events/:eventId/quiz/attempts/:attemptId
 */
export const fetchAttemptResult = async (
  eventId: string,
  attemptId: string
): Promise<AttemptResult> => {
  try {
    const response = await api.get<AttemptResult>(
      `/events/${eventId}/quiz/attempts/${attemptId}`
    );
    return response.data;
  } catch (error: any) {
    handleQuizError(error);
  }
};

/**
 * Get user's quiz attempts
 * GET /events/:eventId/quiz/attempts/user/:userId
 */
export const fetchUserQuizAttempts = async (
  eventId: string,
  userId: string
): Promise<AttemptResult[]> => {
  try {
    const response = await api.get<AttemptResult[]>(
      `/events/${eventId}/quiz/attempts/user/${userId}`
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
