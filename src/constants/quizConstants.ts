/**
 * Constantes relacionadas con el sistema de quiz/exámenes
 * Centraliza todos los valores mágicos del código para facilitar mantenimiento
 */

export const QUIZ_CONFIG = {
  // Escala de calificación
  GRADE_SCALE_MAX: 5,
  GRADE_DECIMAL_PLACES: 1,
  
  // Puntuación
  DEFAULT_QUESTION_SCORE: 1,
  
  // Límites mínimos
  MIN_OPTIONS: 2,
  MIN_PAIRS: 2,
  MIN_ITEMS: 2,
  
  // Formatos soportados
  SUPPORTED_TEXT_FORMATS: ["plain", "h1", "h2", "h3", "quote", "code"] as const,
  SUPPORTED_LIST_TYPES: ["none", "bullet", "ordered"] as const,
  SUPPORTED_QUESTION_TYPES: ["single-choice", "multiple-choice", "matching", "ordering"] as const,
  
  // Estados
  QUIZ_STATES: {
    EDITING: "editing",
    SUBMITTED: "submitted",
    REVIEWING: "reviewing",
  },
} as const;

export const UI_CONFIG = {
  // Colores y estilos
  CORRECT_ANSWER_COLOR: "#e6ffe6",
  CORRECT_ANSWER_BORDER: "2px solid green",
  INCORRECT_ANSWER_COLOR: "#ffe6e6",
  INCORRECT_ANSWER_BORDER: "2px solid red",
  
  // Espacios
  CARD_PADDING: "md",
  STACK_GAP: "md",
  
  // Tiempos
  TRANSITION_DURATION: "0.2s",
} as const;

export const ERROR_MESSAGES = {
  QUIZ_NOT_FOUND: "El examen no fue encontrado",
  NO_QUIZ_RESULTS: "Aún no existen resultados para este examen",
  LOADING_USERS: "Cargando nombres de usuarios...",
  USER_NOT_FOUND: "Usuario no encontrado",
  NO_QUESTIONS: "No hay preguntas para mostrar",
  MISSING_USER_ID: "No hay userId en contexto",
  MISSING_EVENT_ID: "No hay eventId",
  SUBMIT_ERROR: "Error al enviar el examen",
  LOAD_ERROR: "Error cargando examen",
} as const;

export const SUCCESS_MESSAGES = {
  QUIZ_SUBMITTED: "Examen enviado correctamente",
  QUIZ_CREATED: "Examen creado correctamente",
  QUIZ_UPDATED: "Examen actualizado correctamente",
} as const;
