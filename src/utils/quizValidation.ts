/**
 * Utilidades de validación para quizzes
 * Valida estructura y contenido de preguntas
 */

import { QuestionWithBlocks } from '../components/QuizEditor/types';
import { QUIZ_CONFIG } from '../constants/quizConstants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida un quiz completo
 */
export function validateQuiz(
  questions: QuestionWithBlocks[] | undefined
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones básicas
  if (!questions || !Array.isArray(questions)) {
    errors.push("No hay preguntas definidas");
    return { isValid: false, errors, warnings };
  }

  if (questions.length === 0) {
    errors.push("El quiz debe tener al menos una pregunta");
    return { isValid: false, errors, warnings };
  }

  // Validar cada pregunta
  questions.forEach((question, idx) => {
    const questionNum = idx + 1;
    const questionErrors = validateQuestion(question);

    questionErrors.forEach((err) => {
      errors.push(`Pregunta ${questionNum}: ${err}`);
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida una pregunta individual
 */
function validateQuestion(question: QuestionWithBlocks): string[] {
  const errors: string[] = [];

  // Validar ID
  if (!question.id) {
    errors.push("ID de pregunta faltante");
  }

  // Validar tipo
  if (!QUIZ_CONFIG.SUPPORTED_QUESTION_TYPES.includes(question.type)) {
    errors.push(`Tipo de pregunta inválido: ${question.type}`);
  }

  // Validar bloques
  if (!question.blocks || !Array.isArray(question.blocks) || question.blocks.length === 0) {
    errors.push("La pregunta debe tener al menos un bloque de contenido");
  }

  // Validaciones específicas por tipo
  switch (question.type) {
    case "single-choice":
      errors.push(...validateSingleChoice(question as any));
      break;
    case "multiple-choice":
      errors.push(...validateMultipleChoice(question as any));
      break;
    case "matching":
      errors.push(...validateMatching(question as any));
      break;
    case "ordering":
      errors.push(...validateOrdering(question as any));
      break;
  }

  return errors;
}

/**
 * Valida pregunta de opción única
 */
function validateSingleChoice(question: any): string[] {
  const errors: string[] = [];

  if (!question.opciones || question.opciones.length < QUIZ_CONFIG.MIN_OPTIONS) {
    errors.push(
      `Debe haber al menos ${QUIZ_CONFIG.MIN_OPTIONS} opciones`
    );
  }

  if (typeof question.respuestacorrecta !== "number") {
    errors.push("No hay respuesta correcta definida");
  }

  if (
    question.respuestacorrecta < 0 ||
    question.respuestacorrecta >= question.opciones.length
  ) {
    errors.push("La respuesta correcta no corresponde a ninguna opción");
  }

  return errors;
}

/**
 * Valida pregunta de opción múltiple
 */
function validateMultipleChoice(question: any): string[] {
  const errors: string[] = [];

  if (!question.opciones || question.opciones.length < QUIZ_CONFIG.MIN_OPTIONS) {
    errors.push(
      `Debe haber al menos ${QUIZ_CONFIG.MIN_OPTIONS} opciones`
    );
  }

  if (!Array.isArray(question.respuestascorrectas)) {
    errors.push("No hay respuestas correctas definidas");
  }

  if (question.respuestascorrectas.length === 0) {
    errors.push("Debe marcar al menos una respuesta correcta");
  }

  question.respuestascorrectas.forEach((idx: number) => {
    if (idx < 0 || idx >= question.opciones.length) {
      errors.push(`Índice de respuesta correcta fuera de rango: ${idx}`);
    }
  });

  return errors;
}

/**
 * Valida pregunta de emparejamiento
 */
function validateMatching(question: any): string[] {
  const errors: string[] = [];

  if (!question.pairs || question.pairs.length < QUIZ_CONFIG.MIN_PAIRS) {
    errors.push(
      `Debe haber al menos ${QUIZ_CONFIG.MIN_PAIRS} pares`
    );
  }

  if (!Array.isArray(question.correctPairings)) {
    errors.push("No hay emparejamientos correctos definidos");
  }

  question.pairs.forEach((pair: any, idx: number) => {
    if (!pair.leftBlocks || pair.leftBlocks.length === 0) {
      errors.push(`Par ${idx + 1}: lado izquierdo vacío`);
    }
    if (!pair.rightBlocks || pair.rightBlocks.length === 0) {
      errors.push(`Par ${idx + 1}: lado derecho vacío`);
    }
  });

  return errors;
}

/**
 * Valida pregunta de ordenamiento
 */
function validateOrdering(question: any): string[] {
  const errors: string[] = [];

  if (!question.items || question.items.length < QUIZ_CONFIG.MIN_ITEMS) {
    errors.push(
      `Debe haber al menos ${QUIZ_CONFIG.MIN_ITEMS} elementos para ordenar`
    );
  }

  if (!Array.isArray(question.correctOrder) || question.correctOrder.length === 0) {
    errors.push("No hay orden correcto definido");
  }

  return errors;
}

/**
 * Valida que todas las respuestas requeridas estén presentes
 */
export function validateAnswersComplete(
  questions: QuestionWithBlocks[],
  answers: Record<string, any>
): { isComplete: boolean; missingQuestions: string[] } {
  const missingQuestions: string[] = [];

  questions.forEach((question, idx) => {
    const answer = answers[question.id];
    
    if (answer === undefined || answer === null) {
      missingQuestions.push(`Pregunta ${idx + 1}`);
      return;
    }

    // Validaciones específicas de respuesta vacía
    if (Array.isArray(answer) && answer.length === 0) {
      missingQuestions.push(`Pregunta ${idx + 1}`);
    }

    if (typeof answer === "object" && Object.keys(answer).length === 0) {
      missingQuestions.push(`Pregunta ${idx + 1}`);
    }
  });

  return {
    isComplete: missingQuestions.length === 0,
    missingQuestions,
  };
}
