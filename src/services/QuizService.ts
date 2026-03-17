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

export type QuestionType =
  | "single"
  | "multiple"
  | "matching"
  | "sorting"
  | "script-concordance"
  | "open";

/**
 * Opciones fijas del tipo Script Concordance Test (SCT).
 * Tienen IDs estables para que el backend las reconozca siempre igual.
 */
export const SCT_OPTIONS: QuestionOption[] = [
  {
    id: "sct-m2",
    blocks: [
      {
        id: "sct-m2-b",
        type: "paragraph",
        content: "-2 → La descarta fuertemente",
      },
    ],
  },
  {
    id: "sct-m1",
    blocks: [
      {
        id: "sct-m1-b",
        type: "paragraph",
        content: "-1 → La hace menos probable",
      },
    ],
  },
  {
    id: "sct-0",
    blocks: [
      {
        id: "sct-0-b",
        type: "paragraph",
        content: "0 → No cambia la probabilidad",
      },
    ],
  },
  {
    id: "sct-p1",
    blocks: [
      {
        id: "sct-p1-b",
        type: "paragraph",
        content: "+1 → La hace más probable",
      },
    ],
  },
  {
    id: "sct-p2",
    blocks: [
      {
        id: "sct-p2-b",
        type: "paragraph",
        content: "+2 → La confirma fuertemente",
      },
    ],
  },
];

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

// ─────────────────────────────────────────────
// Submission types
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

/**
 * Configuración del examen.
 * Todos los campos admiten null = sin restricción.
 */
export interface QuizConfig {
  /** Duración máxima en minutos. null = sin límite de tiempo. */
  time: number | null;
  /** Número máximo de intentos permitidos. null = intentos ilimitados. */
  attempts: number | null;
  /** Nota mínima en % para aprobar el examen. null = sin nota mínima. */
  nota: number | null;
  /**
   * Modo de visualización de preguntas:
   * - "all"        → todas las preguntas en la misma página (default).
   * - "one-by-one" → una pregunta a la vez, sin posibilidad de retroceder.
   */
  questionDisplay: "all" | "one-by-one";
}

/** Valores que se envían al backend cuando el admin no configura el examen manualmente. */
export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  time: null,
  attempts: null,
  nota: 70,
  questionDisplay: "all",
};

export interface Quiz {
  _id?: string;
  id?: string;
  eventId: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  /** Configuración de reglas del examen. */
  config?: QuizConfig;
}

export interface CreateQuizPayload {
  id?: string;
  eventId: string;
  questions: Question[];
  // Nota: el backend ignora config en POST /quiz. Usar PATCH /quiz/:id/config.
}

export interface UpdateQuizPayload {
  /** Solo questions — el backend ignora config en PUT /quiz/:id. */
  questions: Question[];
}

/** Payload para PATCH /quiz/:id/config (todos los campos opcionales). */
export type UpdateQuizConfigPayload = Partial<QuizConfig>;

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
  return response.data ? restoreQuiz(response.data) : null;
};

/**
 * Normaliza las preguntas para el backend:
 * - "script-concordance" → "single" (el backend solo conoce los 4 tipos base).
 * Las opciones y correctAnswer se conservan intactos.
 */
function normalizeQuestionsForBackend(questions: Question[]): Question[] {
  return questions.map((q) =>
    q.type === "script-concordance" ? { ...q, type: "single" as const } : q,
  );
}

const SCT_OPTION_IDS = new Set(SCT_OPTIONS.map((o) => o.id));

/**
 * Restaura el tipo "script-concordance" en preguntas que vienen del backend como
 * "single" pero cuyos IDs de opciones coinciden en su totalidad con los de SCT_OPTIONS.
 * Solo reemplaza las opciones si vienen vacías (sin bloques). Si el backend ya envió
 * opciones con bloques de texto, las mantiene como están.
 */
function restoreQuestionsFromBackend(questions: Question[]): Question[] {
  return questions.map((q) => {
    if (
      q.type === "single" &&
      (q.options ?? []).length === SCT_OPTIONS.length &&
      (q.options ?? []).every((o) => SCT_OPTION_IDS.has(o.id))
    ) {
      // Es una pregunta SCT: restaurar tipo
      // Si las opciones vienen sin bloques, usar SCT_OPTIONS. Si ya tienen bloques, mantenerlas.
      const optionsToUse = (q.options ?? []).every((o) => (o.blocks ?? []).length === 0)
        ? SCT_OPTIONS
        : q.options;
      return { ...q, type: "script-concordance" as const, options: optionsToUse };
    }
    return q;
  });
}

function restoreQuiz(quiz: Quiz): Quiz {
  return { ...quiz, questions: restoreQuestionsFromBackend(quiz.questions) };
}

/**
 * Get a quiz by its own _id.
 */
export const getQuizById = async (quizId: string): Promise<Quiz> => {
  const response = await api.get<Quiz>(`/quiz/${quizId}`);
  return restoreQuiz(response.data);
};

/**
 * Create a new quiz for an event.
 * Fails if the event already has a quiz — use updateQuiz instead.
 */
export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
  // Generar un id único para evitar E11000 dup key { id: null } en MongoDB.
  // El backend ignora config en POST /quiz; se envía por separado con patchQuizConfig.
  const payloadWithId: CreateQuizPayload = {
    id: crypto.randomUUID(),
    ...payload,
    questions: normalizeQuestionsForBackend(payload.questions),
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
  // PUT solo acepta { questions } — config va por PATCH /:id/config
  const response = await api.put<Quiz>(`/quiz/${quizId}`, {
    questions: normalizeQuestionsForBackend(payload.questions),
  });
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
  config?: QuizConfig,
): Promise<Quiz> => {
  let quiz: Quiz;
  if (quizId) {
    quiz = await updateQuiz(quizId, { questions });
  } else {
    quiz = await createQuiz({ eventId, questions });
  }
  // Siempre sincroniza la config por PATCH (defaults incluidos si no se pasa nada).
  const resolvedId = quiz._id ?? quiz.id;
  if (resolvedId) {
    await patchQuizConfig(resolvedId, config ?? DEFAULT_QUIZ_CONFIG);
  }
  return quiz;
};

/**
 * Guarda únicamente la configuración vía PATCH /quiz/:id/config.
 * Reemplaza saveQuizConfig que antes usaba PUT (incorrecto).
 */
export const saveQuizConfig = async (
  quizId: string,
  config: QuizConfig,
): Promise<Quiz> => {
  return patchQuizConfig(quizId, config);
};

/**
 * Delete a quiz permanently.
 */
export const deleteQuiz = async (quizId: string): Promise<void> => {
  await api.delete(`/quiz/${quizId}`);
};

/**
 * Actualiza (merge) la configuración del quiz.
 * PATCH /quiz/:quizId/config — solo sobreescribe los campos enviados.
 */
export const patchQuizConfig = async (
  quizId: string,
  config: UpdateQuizConfigPayload,
): Promise<Quiz> => {
  const response = await api.patch<Quiz>(`/quiz/${quizId}/config`, config);
  return response.data;
};

// ─────────────────────────────────────────────
// Named export for convenience
// ─────────────────────────────────────────────

/**
 * Expone la función de restauración para usar en otros servicios
 */
export const restoreQuizData = (quiz: Quiz): Quiz => {
  return restoreQuiz(quiz);
};

export const quizService = {
  getByEventId: getQuizByEventId,
  getById: getQuizById,
  create: createQuiz,
  update: updateQuiz,
  save: saveQuiz,
  saveConfig: saveQuizConfig,
  patchConfig: patchQuizConfig,
  delete: deleteQuiz,
};
