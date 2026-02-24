import api from "./api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface EditorBlock {
  id: string;
  type:
    | "paragraph"
    | "h1"
    | "h2"
    | "bullet-list"
    | "numbered-list"
    | "image"
    | "video";
  content: string;
}

export interface QuestionOption {
  id: string;
  blocks: EditorBlock[];
}

export interface MatchingColumn {
  label: string;
  options: QuestionOption[];
}

export interface MatchingAnswer {
  columnAId: string;
  /** Key = column label (B, C, D…), Value = selected option id */
  matches: Record<string, string>;
}

export type QuestionType = "single" | "multiple" | "matching" | "sorting";

export interface Question {
  id: string;
  type: QuestionType;
  /** Statement blocks — rendered by TextEditorBlock */
  blocks: EditorBlock[];

  // single / multiple
  options?: QuestionOption[];
  correctAnswer?: string | null; // single → one id
  correctAnswers?: string[]; // multiple → array of ids

  // matching
  columns?: MatchingColumn[];
  matchingAnswers?: MatchingAnswer[];

  // sorting
  correctOrder?: string[];
}

export interface UserAttempt {
  userId: string;
  attemptedAt: string;
  score: number;
}

// ─────────────────────────────────────────────
// Attempt / submission types
// ─────────────────────────────────────────────

/**
 * answer puede ser:
 *  - string            → single choice (option id)
 *  - string[]          → multiple choice / sorting (array of option ids)
 *  - MatchingAnswer    → una fila de matching ({ columnAId, matches })
 *  - MatchingAnswer[]  → todas las filas de matching
 */
export interface UserAnswer {
  questionId: string;
  answer: string | string[] | MatchingAnswer | MatchingAnswer[];
}

export interface SubmitAttemptPayload {
  userId: string;
  score: number;
  userAnswers: UserAnswer[];
}

export interface AttemptResult {
  userId: string;
  score: number;
  attemptedAt: string;
  userAnswers: UserAnswer[];
}

export interface Quiz {
  _id?: string;
  id?: string;
  eventId: string;
  questions: Question[];
  listUserAttempts?: UserAttempt[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuizPayload {
  id?: string;
  eventId: string;
  questions: Question[];
}

export interface UpdateQuizPayload {
  questions: Question[];
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

/**
 * Get the quiz associated with an event.
 * Returns null if no quiz exists yet (→ creation mode in QuizEditComponent).
 */
export const getQuizByEventId = async (
  eventId: string,
): Promise<Quiz | null> => {
  const response = await api.get<Quiz | null>(`/quiz/event/${eventId}`);
  return response.data;
};

/**
 * Get a quiz by its own _id.
 */
export const getQuizById = async (quizId: string): Promise<Quiz> => {
  const response = await api.get<Quiz>(`/quiz/${quizId}`);
  return response.data;
};

/**
 * Create a new quiz for an event.
 * Fails if the event already has a quiz — use updateQuiz instead.
 */
export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
  // Generar un id único para evitar E11000 dup key { id: null } en MongoDB
  const payloadWithId: CreateQuizPayload = {
    id: crypto.randomUUID(),
    ...payload,
  };
  const response = await api.post<Quiz>("/quiz", payloadWithId);
  return response.data;
};

/**
 * Replace all questions in an existing quiz.
 */
export const updateQuiz = async (
  quizId: string,
  payload: UpdateQuizPayload,
): Promise<Quiz> => {
  const response = await api.put<Quiz>(`/quiz/${quizId}`, payload);
  return response.data;
};

/**
 * Convenience: automatically creates or updates depending on
 * whether quizId is provided. Used by QuizEditComponent.
 */
export const saveQuiz = async (
  eventId: string,
  questions: Question[],
  quizId?: string,
): Promise<Quiz> => {
  if (quizId) {
    return updateQuiz(quizId, { questions });
  }
  return createQuiz({ eventId, questions });
};

/**
 * Delete a quiz permanently.
 */
export const deleteQuiz = async (quizId: string): Promise<void> => {
  await api.delete(`/quiz/${quizId}`);
};

/**
 * Get the score of a specific user for a quiz.
 */
export const getScoreByUserId = async (
  quizId: string,
  userId: string,
): Promise<number> => {
  const response = await api.get<number>(`/quiz/${quizId}/score/${userId}`);
  return response.data;
};

/**
 * Submit a user's answers for a quiz.
 * POST /quiz/:quizId/submit
 */
export const submitAttempt = async (
  quizId: string,
  payload: SubmitAttemptPayload,
): Promise<Quiz> => {
  const response = await api.post<Quiz>(`/quiz/${quizId}/submit`, payload);
  return response.data;
};

/**
 * Get a user's full attempt (answers + score) for a quiz.
 * GET /quiz/:quizId/attempt/:userId
 */
export const getAttempt = async (
  quizId: string,
  userId: string,
): Promise<AttemptResult> => {
  const response = await api.get<AttemptResult>(
    `/quiz/${quizId}/attempt/${userId}`,
  );
  return response.data;
};

// ─────────────────────────────────────────────
// Named export for convenience
// ─────────────────────────────────────────────

export const quizService = {
  getByEventId: getQuizByEventId,
  getById: getQuizById,
  create: createQuiz,
  update: updateQuiz,
  save: saveQuiz,
  delete: deleteQuiz,
  getScoreByUserId,
  submitAttempt,
  getAttempt,
};
