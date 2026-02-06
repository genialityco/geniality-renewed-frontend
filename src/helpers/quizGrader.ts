export type PlainQuestion = {
  pregunta: string;
  opciones: string[];
  respuestacorrecta: number; // índice 0..n-1
  score?: number; // opcional (peso)
};

export type GradeResult = {
  totalScore: number;
  maxScore: number;
  grade: number; // 0..5 (1 decimal)
  correctCount: number;
  totalQuestions: number;
};

/**
 * answersData esperado: { q0: 1, q1: 0, q2: 3 }
 * donde el valor es el índice de la opción seleccionada.
 */
export function gradePlainQuiz(
  questions: PlainQuestion[],
  answersData: Record<string, any>,
  scaleMax = 5,
): GradeResult {
  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  questions.forEach((q, idx) => {
    const weight = typeof q.score === "number" ? q.score : 1;
    maxScore += weight;

    const userAnswer = answersData[`q${idx}`];

    if (userAnswer === q.respuestacorrecta) {
      totalScore += weight;
      correctCount += 1;
    }
  });

  const grade =
    maxScore > 0 ? Math.round((totalScore / maxScore) * scaleMax * 10) / 10 : 0;

  return {
    totalScore,
    maxScore,
    grade,
    correctCount,
    totalQuestions: questions.length,
  };
}
