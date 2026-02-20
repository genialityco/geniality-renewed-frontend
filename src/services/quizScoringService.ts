/**
 * Servicio de scoring y cálculo de calificaciones para quizzes
 * Centraliza toda la lógica de cálculo de puntajes
 */

import { QuestionWithBlocks } from '../components/QuizEditor/types';
import { QUIZ_CONFIG } from '../constants/quizConstants';

export interface ScoringResult {
  totalScore: number;
  maxScore: number;
  grade: number;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
}

export interface QuestionScore {
  questionId: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
}

/**
 * Calcula la puntuación total de un quiz
 */
export function calculateQuizScore(
  questions: QuestionWithBlocks[],
  answers: Record<string, any>,
  scoreWeights?: Record<string, number>
): ScoringResult {
  if (!questions || questions.length === 0) {
    return {
      totalScore: 0,
      maxScore: 0,
      grade: 0,
      correctCount: 0,
      totalQuestions: 0,
      scorePercentage: 0,
    };
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  questions.forEach((question) => {
    const weight = scoreWeights?.[question.id] ?? QUIZ_CONFIG.DEFAULT_QUESTION_SCORE;
    maxScore += weight;

    const isCorrect = isAnswerCorrect(question, answers[question.id]);
    if (isCorrect) {
      totalScore += weight;
      correctCount += 1;
    }
  });

  const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const grade = calculateGrade(totalScore, maxScore);

  return {
    totalScore,
    maxScore,
    grade,
    correctCount,
    totalQuestions: questions.length,
    scorePercentage,
  };
}

/**
 * Verifica si una respuesta es correcta según el tipo de pregunta
 */
export function isAnswerCorrect(
  question: QuestionWithBlocks,
  userAnswer: any
): boolean {
  switch (question.type) {
    case "single-choice":
      return checkSingleChoice(question as any, userAnswer);
    case "multiple-choice":
      return checkMultipleChoice(question as any, userAnswer);
    case "matching":
      return checkMatching(question as any, userAnswer);
    case "ordering":
      return checkOrdering(question as any, userAnswer);
    default:
      return false;
  }
}

/**
 * Verifica respuesta de opción única
 */
function checkSingleChoice(question: any, userAnswer: any): boolean {
  return userAnswer === question.respuestacorrecta;
}

/**
 * Verifica respuesta de opción múltiple
 */
function checkMultipleChoice(question: any, userAnswer: any): boolean {
  if (!Array.isArray(userAnswer) || !Array.isArray(question.respuestascorrectas)) {
    return false;
  }

  const userAnswerSorted = [...userAnswer].sort((a, b) => a - b);
  const correctAnswersSorted = [...question.respuestascorrectas].sort(
    (a, b) => a - b
  );

  return (
    userAnswerSorted.length === correctAnswersSorted.length &&
    userAnswerSorted.every((val, idx) => val === correctAnswersSorted[idx])
  );
}

/**
 * Verifica respuesta de emparejamiento
 * correctPairings es un array donde cada índice corresponde al pair en el mismo orden
 * userAnswer es un objeto con pairId -> rightBlockIndex
 */
function checkMatching(question: any, userAnswer: any): boolean {
  if (!question.correctPairings || !Array.isArray(question.correctPairings)) {
    return false;
  }

  if (!question.pairs || !Array.isArray(question.pairs)) {
    return false;
  }

  if (typeof userAnswer !== "object" || userAnswer === null) {
    return false;
  }

  // Convertir userAnswer a array en el mismo orden de pairs
  const userAnswerArray = question.pairs.map((pair: any) => userAnswer[pair.id]);

  // Comparar con correctPairings
  return (
    userAnswerArray.length === question.correctPairings.length &&
    userAnswerArray.every((val: any, idx: number) => val === question.correctPairings[idx])
  );
}

/**
 * Verifica respuesta de ordenamiento
 */
function checkOrdering(question: any, userAnswer: any): boolean {
  if (!Array.isArray(userAnswer) || !Array.isArray(question.correctOrder)) {
    return false;
  }

  return (
    userAnswer.length === question.correctOrder.length &&
    userAnswer.every((val, idx) => val === question.correctOrder[idx])
  );
}

/**
 * Calcula la calificación en escala 0-5
 */
export function calculateGrade(totalScore: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  
  const rawGrade = (totalScore / maxScore) * QUIZ_CONFIG.GRADE_SCALE_MAX;
  const decimalPlaces = Math.pow(10, QUIZ_CONFIG.GRADE_DECIMAL_PLACES);
  
  return Math.round(rawGrade * decimalPlaces) / decimalPlaces;
}

/**
 * Obtiene información detallada de scoring por pregunta
 */
export function getDetailedQuestionScores(
  questions: QuestionWithBlocks[],
  answers: Record<string, any>
): QuestionScore[] {
  return questions.map((question) => {
    const isCorrect = isAnswerCorrect(question, answers[question.id]);
    return {
      questionId: question.id,
      isCorrect,
      score: isCorrect ? QUIZ_CONFIG.DEFAULT_QUESTION_SCORE : 0,
      maxScore: QUIZ_CONFIG.DEFAULT_QUESTION_SCORE,
    };
  });
}

/**
 * Califica un quiz en escala 0-100
 */
export function getQuizPercentage(totalScore: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((totalScore / maxScore) * 100);
}
