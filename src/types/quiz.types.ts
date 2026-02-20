/**
 * Quiz Types
 * Definición de interfaces y tipos para manejo de quizzes
 */

export interface QuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface QuestionBase {
  id: string;
  text: string;
  description?: string;
  points?: number;
  score?: number;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: "single-choice";
  options: QuestionOption[];
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice";
  options: QuestionOption[];
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching";
  leftItems: { id: string; label: string }[];
  rightItems: { id: string; label: string }[];
  pairs: { left: string; right: string }[];
}

export interface OrderingQuestion extends QuestionBase {
  type: "ordering";
  items: { id: string; label: string }[];
  correctOrder: string[];
}

export type Question = 
  | SingleChoiceQuestion 
  | MultipleChoiceQuestion 
  | MatchingQuestion 
  | OrderingQuestion;

export interface StudentQuizDTO {
  id: string;
  eventId: string;
  questions: Question[];
  meta?: {
    title?: string;
    description?: string;
  };
}

export interface AdminQuizDTO extends StudentQuizDTO {
  // Admin ve las respuestas correctas
}

export interface AttemptSubmitPayload {
  userId: string;
  userName: string;
  userEmail: string;
  answers: AnswerDto[];
}

export interface AnswerDto {
  questionId: string;
  selectedOptionIndex?: number;
  selectedOptionIndices?: number[];
  pairs?: Record<string, string>;
  orderedItemIds?: string[];
}

export interface AttemptResult {
  id: string;
  eventId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  answers: AnswerDto[];
  quiz?: AdminQuizDTO;
  grade?: number;
  result?: number; // Para compatibilidad con respuestas del backend
  totalScore?: number;
  maxScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizResultsAggregate {
  eventId: string;
  quizId: string;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  attempts: AttemptResult[];
}

export class QuizApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = "QuizApiError";
  }
}
