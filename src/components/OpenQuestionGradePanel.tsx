// @ts-nocheck
import React, { useState } from "react";
import { Card, Button, Group, Stack, TextInput, Text, Badge, Alert } from "@mantine/core";
import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { Question, UserAnswer } from "../services/QuizService";
import { 
  UserQuizAttempt, 
  gradeOpenQuestion,
  GradeOpenQuestionDto 
} from "../services/userQuizAttemptService";

interface OpenQuestionGradePanelProps {
  attempt: UserQuizAttempt;
  questions: Question[];
  onGraded?: (updatedAttempt: UserQuizAttempt) => void;
  onError?: (error: string) => void;
}

/**
 * Panel para que el admin califique preguntas abiertas de un intento.
 * Muestra todas las preguntas abiertas sin calificar y permite asignar
 * una puntuación de 1-10 a cada una.
 */
export default function OpenQuestionGradePanel({
  attempt,
  questions,
  onGraded,
  onError,
}: OpenQuestionGradePanelProps) {
  // Obtener preguntas abiertas del quiz
  const openQuestions = questions.filter((q) => q.type === "open");
  
  // Preguntas abiertas ya calificadas
  const gradedQuestionIds = new Set(attempt.manualScores?.map((ms) => ms.questionId) ?? []);
  
  // Preguntas abiertas sin calificar
  const ungradedQuestions = openQuestions.filter(
    (q) => !gradedQuestionIds.has(q.id),
  );

  // State para cada pregunta sin calificar
  const [scores, setScores] = useState<Record<string, number>>({});
  const [grading, setGrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (openQuestions.length === 0) {
    return null; // No hay preguntas abiertas
  }

  if (ungradedQuestions.length === 0 && attempt.status === "graded") {
    return (
      <Alert color="green" title="Completado" icon={<FaCircleCheck />}>
        Todas las preguntas abiertas han sido calificadas.
      </Alert>
    );
  }

  const handleGradeQuestion = async (questionId: string) => {
    const score = scores[questionId];
    if (!score || score < 1 || score > 10) {
      onError?.("La calificación debe estar entre 1 y 10.");
      return;
    }

    setGrading(true);
    try {
      const dto: GradeOpenQuestionDto = {
        questionId,
        score,
      };
      const updatedAttempt = await gradeOpenQuestion(attempt._id, dto);
      setSuccessMessage(`Pregunta calificada con ${score}/10`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Limpiar el score del input
      setScores((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });

      onGraded?.(updatedAttempt);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? "Error al calificar la pregunta.";
      onError?.(message);
    } finally {
      setGrading(false);
    }
  };

  const questionTextMap: Record<string, string> = {};
  questions.forEach((q) => {
    questionTextMap[q.id] = (q.blocks?.[0]?.content ?? `Pregunta ${q.id}`).substring(0, 60);
  });

  // Obtener la respuesta del usuario para cada pregunta
  const userAnswerMap: Record<string, string> = {};
  (attempt.userAnswers ?? []).forEach((ua) => {
    userAnswerMap[ua.questionId] = ua.answer || "";
  });

  return (
    <Card style={{ borderTop: "2px solid #F59E0B" }}>
      <Stack gap="md">
        <div>
          <Text fw={700} size="lg">
            Calificación de Preguntas Abiertas
          </Text>
          <Text size="sm" c="dimmed">
            {ungradedQuestions.length} de {openQuestions.length} preguntas por calificar
          </Text>
        </div>

        {successMessage && (
          <Alert color="green" title="Éxito">
            {successMessage}
          </Alert>
        )}

        {/* Preguntas calificadas */}
        {gradedQuestionIds.size > 0 && (
          <div>
            <Text size="sm" fw={600} c="dimmed" mb={8}>
              ✓ Calificadas ({gradedQuestionIds.size})
            </Text>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {openQuestions
                .filter((q) => gradedQuestionIds.has(q.id))
                .map((q) => {
                  const manualScore = attempt.manualScores?.find(
                    (ms) => ms.questionId === q.id,
                  );
                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: "#0F4C3A",
                        border: "1px solid #059669",
                        fontSize: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{questionTextMap[q.id]}</span>
                      <Badge color="green">
                        {manualScore?.score}/10
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Preguntas por calificar */}
        {ungradedQuestions.length > 0 && (
          <div>
            <Text size="sm" fw={600} mb={12}>
              Por Calificar
            </Text>
            <Stack gap="lg">
              {ungradedQuestions.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "#1F2937",
                    border: "1px solid #374151",
                  }}
                >
                  {/* Pregunta */}
                  <Text size="sm" fw={600} mb={8}>
                    {questionTextMap[q.id]}
                  </Text>

                  {/* Respuesta del usuario */}
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: "#111827",
                      marginBottom: 12,
                      borderLeft: "3px solid #3B82F6",
                    }}
                  >
                    <Text size="xs" c="dimmed" mb={4}>
                      Respuesta del usuario:
                    </Text>
                    <Text
                      size="sm"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#E5E7EB",
                      }}
                    >
                      {userAnswerMap[q.id] || "(sin respuesta)"}
                    </Text>
                  </div>

                  {/* Input de calificación */}
                  <Group gap="sm" grow>
                    <TextInput
                      label="Calificación (1-10)"
                      type="number"
                      min={1}
                      max={10}
                      placeholder="Ej: 8"
                      value={scores[q.id] ?? ""}
                      onChange={(e) => {
                        const val = parseInt(e.currentTarget.value, 10);
                        if (!isNaN(val)) {
                          setScores((prev) => ({ ...prev, [q.id]: val }));
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleGradeQuestion(q.id)}
                      disabled={!scores[q.id] || grading}
                      loading={grading}
                      size="sm"
                    >
                      Calificar
                    </Button>
                  </Group>
                </div>
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}
