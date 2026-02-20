/**
 * Hook personalizado para manejo de submisión y scoring de quizzes
 */

import { useState } from "react";
import { QuestionWithBlocks } from "../components/QuizEditor/types";
import {
  calculateQuizScore,
  ScoringResult,
} from "../services/quizScoringService";
import { submitQuizAttempt } from "../services/quizService";
import { AnswerDto, SubmitQuizPayload } from "../services/types";
import { notifications } from "@mantine/notifications";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/quizConstants";

interface UseQuizSubmitOptions {
  onSuccess?: (
    result: ScoringResult & { correctAnswers: QuestionWithBlocks[] },
  ) => void;
  onError?: (error: Error) => void;
}

/**
 * Transforma respuestas del formato del frontend al formato esperado por backend
 * Frontend: { questionId: optionIndex | [indices] | {pairs} | [itemIds] }
 * Backend: { answers: [{ questionId, selectedOptionIndex?, selectedOptionIndices?, pairs?, orderedItemIds? }] }
 */
function transformAnswersForBackend(
  flatAnswers: Record<string, any>,
  questions: QuestionWithBlocks[],
): AnswerDto[] {
  return questions
    .map((question) => {
      const answer = flatAnswers[question.id];
      const baseAnswer: any = { questionId: question.id };

      if (answer === undefined || answer === null) {
        return baseAnswer;
      }

      if (question.type === "single-choice") {
        if (typeof answer === "number") {
          baseAnswer.selectedOptionIndex = answer;
        }
      } else if (question.type === "multiple-choice") {
        if (Array.isArray(answer)) {
          baseAnswer.selectedOptionIndices = answer;
        }
      } else if (question.type === "matching") {
        if (typeof answer === "object" && answer !== null) {
          // Convertir índices a string keys si es necesario
          baseAnswer.pairs = Object.entries(answer).reduce(
            (acc, [key, val]) => {
              acc[String(key)] = String(val);
              return acc;
            },
            {} as Record<string, string>,
          );
        }
      } else if (question.type === "ordering") {
        if (Array.isArray(answer)) {
          baseAnswer.orderedItemIds = answer;
        }
      }

      return baseAnswer;
    })
    .filter((answer) => {
      // Filtrar respuestas vacías (sin ningún campo específico)
      return (
        answer.selectedOptionIndex !== undefined ||
        answer.selectedOptionIndices !== undefined ||
        answer.pairs !== undefined ||
        answer.orderedItemIds !== undefined
      );
    });
}

/**
 * Hook para manejar la submisión de un quiz
 */
export function useQuizSubmit(options?: UseQuizSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<
    (ScoringResult & { correctAnswers: QuestionWithBlocks[] }) | null
  >(null);
  const [error, setError] = useState<Error | null>(null);

  const submit = async (
    eventId: string,
    userId: string,
    userName: string,
    userEmail: string,
    answers: Record<string, any>,
    questions?: QuestionWithBlocks[],
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error(ERROR_MESSAGES.MISSING_USER_ID);
      }

      if (!eventId) {
        throw new Error(ERROR_MESSAGES.MISSING_EVENT_ID);
      }

      // Paso 1: Transformar respuestas al formato esperado por backend
      const answersDto = questions
        ? transformAnswersForBackend(answers, questions)
        : [];

      // Paso 2: Preparar payload para submit (SIN resultado - backend lo calcula)
      const payload: SubmitQuizPayload = {
        userId,
        userName,
        userEmail,
        answers: answersDto,
      };

      console.log("📤 PAYLOAD ENVIADO AL BACKEND:", payload);

      // Paso 3: Enviar respuestas al servidor
      // Backend calcula el resultado basado en validación de respuestas
      const submitResponse = await submitQuizAttempt(eventId, payload);

      console.log("📥 RESPUESTA DEL BACKEND:", submitResponse);
      console.log("📥 Questions en response:", submitResponse.quiz?.questions);

      // Paso 4: El backend devuelve el resultado calculado y preguntas con respuestas correctas
      // Usar las preguntas del backend (con respuestas correctas) para calcular resultado local para mostrar
      const questionsFromBackend = (submitResponse as any).quiz?.questions || [];
      console.log("🧮 Calculando score con questions:", questionsFromBackend.length);

      const calculatedResult = calculateQuizScore(
        questionsFromBackend,
        answers
      );

      console.log("✅ Resultado calculado:", calculatedResult);

      const completeResult = {
        ...calculatedResult,
        correctAnswers: questionsFromBackend,
      };

      console.log("🎯 CompleteResult con correctAnswers:", completeResult);

      setResult(completeResult);
      console.log("✅ setResult() llamado");

      notifications.show({
        message: SUCCESS_MESSAGES.QUIZ_SUBMITTED,
        color: "green",
        autoClose: 3000,
      });

      options?.onSuccess?.(completeResult);
    } catch (err: any) {
      const error = new Error(err.message || ERROR_MESSAGES.SUBMIT_ERROR);
      setError(error);

      notifications.show({
        message: error.message,
        color: "red",
        autoClose: 3000,
      });

      options?.onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
    result,
    error,
  };
}

/**
 * Hook para manejo de respuestas en quiz
 */
export function useQuizAnswers() {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const removeAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
  };

  const clearAllAnswers = () => {
    setAnswers({});
  };

  return {
    answers,
    setAnswer,
    removeAnswer,
    clearAllAnswers,
  };
}

/**
 * Hook para manejo de estado del quiz (edición, revisión, etc.)
 */
export function useQuizState(
  initialState: "editing" | "submitted" | "reviewing" = "editing",
) {
  const [state, setState] = useState<"editing" | "submitted" | "reviewing">(
    initialState,
  );

  const isEditing = state === "editing";
  const isSubmitted = state === "submitted";
  const isReviewing = state === "reviewing";

  const setEditing = () => setState("editing");
  const setSubmitted = () => setState("submitted");
  const setReviewing = () => setState("reviewing");

  return {
    state,
    setState,
    isEditing,
    isSubmitted,
    isReviewing,
    setEditing,
    setSubmitted,
    setReviewing,
  };
}

/**
 * Hook para cargar quiz desde el servidor
 */
export function useQuizLoader() {
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = async (loadFn: () => Promise<any>) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await loadFn();
      setQuiz(data);
    } catch (err: any) {
      const error = new Error(err.message || ERROR_MESSAGES.LOAD_ERROR);
      setError(error);
      notifications.show({
        message: error.message,
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    quiz,
    isLoading,
    error,
    load,
    reset: () => setQuiz(null),
  };
}
