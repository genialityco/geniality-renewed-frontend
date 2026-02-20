import {
  Stack,
  Card,
  Text,
  Box,
  Badge,
  Grid,
  Button,
  Group,
  Alert,
} from "@mantine/core";
import { QuestionWithBlocks } from "./QuizEditor/types";
import BlocksRenderer from "./BlocksRenderer";

interface QuizReviewProps {
  questions: QuestionWithBlocks[];
  answers: Record<string, any>;
  correctAnswers?: QuestionWithBlocks[];
  onClose?: () => void;
  result?: number;
  statistics?: {
    correctCount: number;
    totalCount: number;
    percentage: number;
  };
}

export default function QuizReview({
  questions,
  answers,
  correctAnswers = [],
  onClose,
  result,
  statistics,
}: QuizReviewProps) {
  if (!questions || questions.length === 0) {
    return <Text>No hay preguntas para mostrar.</Text>;
  }

  const getOptionLabel = (option: any): string => {
    if (!option) return "";

    // Caso 1: opción es directamente un bloque de texto
    if (option.type === "text" && option.content) {
      return option.content;
    }

    // Caso 2: opción contiene un array de bloques
    if (option.blocks && Array.isArray(option.blocks)) {
      const textBlock = option.blocks.find((b: any) => b.type === "text");
      return textBlock?.content || "";
    }

    return "";
  };

  const getItemLabel = (item: any): string => {
    if (!item) return "";

    // Caso 1: item es directamente un bloque de texto (para matching)
    if (item.type === "text" && item.content) {
      return item.content;
    }

    // Caso 2: item contiene un array de bloques (para opciones)
    if (item.blocks && Array.isArray(item.blocks)) {
      const textBlock = item.blocks.find((b: any) => b.type === "text");
      return textBlock?.content || "";
    }

    return "";
  };

  // Obtener respuesta correcta del array correctAnswers
  const getCorrectAnswerForQuestion = (questionId: string) => {
    return correctAnswers.find((q: any) => q.id === questionId);
  };

  return (
    <Stack gap="lg">
      {(result !== undefined || statistics) && (
        <Card withBorder p="md" radius="md" style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600} size="lg">Calificación</Text>
                <Text size="sm" c="dimmed">Revisión del examen</Text>
              </div>
              <div style={{ textAlign: "right" }}>
                <Text fw={700} size="xl" c="blue">{result}/5</Text>
              </div>
            </Group>
          </Stack>
        </Card>
      )}
      {questions.map((question, qIdx) => {
        const userAnswer = answers[question.id];
        let isCorrect = false;
        let correctAnswerDisplay: React.ReactNode = null;
        let userAnswerDisplay: React.ReactNode = null;

        try {
          if (question.type === "single-choice") {
            const q = question as any;
            const opciones = Array.isArray(q.opciones) ? q.opciones : [];

            // Obtener respuesta correcta del array correctAnswers
            const correctQData = getCorrectAnswerForQuestion(
              question.id,
            ) as any;
            const respuestaCorrecta =
              typeof correctQData?.respuestacorrecta === "number"
                ? correctQData.respuestacorrecta
                : -1;

            isCorrect = userAnswer === respuestaCorrecta;

            correctAnswerDisplay = (
              <Text>
                Respuesta correcta:{" "}
                <strong>
                  {respuestaCorrecta >= 0 && opciones[respuestaCorrecta]
                    ? getOptionLabel(opciones[respuestaCorrecta])
                    : "N/A"}
                </strong>
              </Text>
            );

            userAnswerDisplay = (
              <Text>
                Tu respuesta:{" "}
                <strong>
                  {typeof userAnswer === "number" && opciones[userAnswer]
                    ? getOptionLabel(opciones[userAnswer])
                    : "No respondiste"}
                </strong>
              </Text>
            );
          } else if (question.type === "multiple-choice") {
            const q = question as any;
            const opciones = Array.isArray(q.opciones) ? q.opciones : [];

            // Obtener respuestas correctas del array correctAnswers
            const correctQData = getCorrectAnswerForQuestion(
              question.id,
            ) as any;
            const respuestasCorrectas = Array.isArray(
              correctQData?.respuestascorrectas,
            )
              ? correctQData.respuestascorrectas
              : [];
            const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];

            const userAnswerSorted = [...userAnswerArray].sort();
            const correctAnswersSorted = [...respuestasCorrectas].sort();

            isCorrect =
              userAnswerSorted.length === correctAnswersSorted.length &&
              userAnswerSorted.every(
                (val, idx) => val === correctAnswersSorted[idx],
              );

            correctAnswerDisplay = (
              <Box>
                <Text fw={600}>Respuestas correctas:</Text>
                <Stack gap={4} mt={6}>
                  {respuestasCorrectas.length > 0 ? (
                    respuestasCorrectas.map((idx: number) => (
                      <Text key={idx}>
                        •{" "}
                        {opciones[idx] ? getOptionLabel(opciones[idx]) : "N/A"}
                      </Text>
                    ))
                  ) : (
                    <Text c="dimmed">Sin respuestas correctas</Text>
                  )}
                </Stack>
              </Box>
            );

            userAnswerDisplay = (
              <Box>
                <Text fw={600}>Tus respuestas:</Text>
                <Stack gap={4} mt={6}>
                  {userAnswerArray.length > 0 ? (
                    userAnswerArray.map((idx: number) => (
                      <Text key={idx}>
                        •{" "}
                        {opciones[idx] ? getOptionLabel(opciones[idx]) : "N/A"}
                      </Text>
                    ))
                  ) : (
                    <Text c="dimmed">No respondiste</Text>
                  )}
                </Stack>
              </Box>
            );
          } else if (question.type === "matching") {
            const q = question as any;
            const pairs = Array.isArray(q.pairs) ? q.pairs : [];

            // Obtener emparejamientos correctos del objeto correctAnswers
            const correctQData = getCorrectAnswerForQuestion(
              question.id,
            ) as any;
            const correctPairingMap = correctQData?.correctPairings || {};

            const userAnswerObj =
              typeof userAnswer === "object" ? userAnswer : {};

            let allCorrect = true;

            if (pairs.length > 0) {
              for (let i = 0; i < pairs.length; i++) {
                const pairId = pairs[i].id;
                const userRightIdx = userAnswerObj[pairId];
                const correctRightIdx = correctPairingMap[pairId];
                if (userRightIdx !== correctRightIdx) {
                  allCorrect = false;
                  break;
                }
              }
            } else {
              allCorrect = false;
            }

            isCorrect = allCorrect;

            correctAnswerDisplay = (
              <Box>
                <Text fw={600}>Emparejamientos correctos:</Text>
                <Stack gap={8} mt={8}>
                  {pairs.length > 0 ? (
                    pairs.map((pair: any) => {
                      const correctRightIdx = correctPairingMap[pair.id];
                      const rightBlock =
                        correctRightIdx >= 0 && pair.rightBlocks
                          ? pair.rightBlocks[correctRightIdx]
                          : null;
                      return (
                        <Box
                          key={pair.id}
                          pl="md"
                          style={{ borderLeft: "2px solid green" }}
                        >
                          <Text size="sm">{getItemLabel(pair.leftBlocks)}</Text>
                          <Text size="sm" c="green" fw={600}>
                            ↔ {rightBlock ? getItemLabel(rightBlock) : "N/A"}
                          </Text>
                        </Box>
                      );
                    })
                  ) : (
                    <Text c="dimmed">Sin emparejamientos</Text>
                  )}
                </Stack>
              </Box>
            );

            userAnswerDisplay = (
              <Box>
                <Text fw={600}>Tus emparejamientos:</Text>
                <Stack gap={8} mt={8}>
                  {pairs.length > 0 ? (
                    pairs.map((pair: any) => {
                      const userRightIdx = userAnswerObj[pair.id];
                      const correctRightIdx = correctPairingMap[pair.id];
                      const isMatchCorrect = userRightIdx === correctRightIdx;
                      const borderColor = isMatchCorrect ? "green" : "red";
                      const textColor = isMatchCorrect ? "green" : "red";
                      const rightBlock =
                        userRightIdx >= 0 && pair.rightBlocks
                          ? pair.rightBlocks[userRightIdx]
                          : null;

                      return (
                        <Box
                          key={pair.id}
                          pl="md"
                          style={{ borderLeft: `2px solid ${borderColor}` }}
                        >
                          <Text size="sm">{getItemLabel(pair.leftBlocks)}</Text>
                          <Text size="sm" c={textColor} fw={600}>
                            ↔{" "}
                            {rightBlock
                              ? getItemLabel(rightBlock)
                              : "No respondiste"}
                          </Text>
                        </Box>
                      );
                    })
                  ) : (
                    <Text c="dimmed">Sin emparejamientos</Text>
                  )}
                </Stack>
              </Box>
            );
          } else if (question.type === "ordering") {
            const q = question as any;
            const items = Array.isArray(q.items) ? q.items : [];

            // Obtener orden correcto del array correctAnswers
            const correctQData = getCorrectAnswerForQuestion(
              question.id,
            ) as any;
            const correctOrder = Array.isArray(correctQData?.correctOrder)
              ? correctQData.correctOrder
              : [];

            const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];

            isCorrect =
              userAnswerArray.length === correctOrder.length &&
              userAnswerArray.every(
                (id: string, idx: number) => id === correctOrder[idx],
              );

            correctAnswerDisplay = (
              <Box>
                <Text fw={600}>Orden correcto:</Text>
                <Stack gap={4} mt={6}>
                  {correctOrder.length > 0 ? (
                    correctOrder.map((itemId: string, idx: number) => {
                      const item = items.find((i: any) => i.id === itemId);
                      return (
                        <Text key={itemId}>
                          {idx + 1}. {item ? getItemLabel(item) : "N/A"}
                        </Text>
                      );
                    })
                  ) : (
                    <Text c="dimmed">Sin orden definido</Text>
                  )}
                </Stack>
              </Box>
            );

            userAnswerDisplay = (
              <Box>
                <Text fw={600}>Tu orden:</Text>
                <Stack gap={4} mt={6}>
                  {userAnswerArray.length > 0 ? (
                    userAnswerArray.map((itemId: string, idx: number) => {
                      const item = items.find((i: any) => i.id === itemId);
                      return (
                        <Text key={itemId}>
                          {idx + 1}. {item ? getItemLabel(item) : "N/A"}
                        </Text>
                      );
                    })
                  ) : (
                    <Text c="dimmed">No respondiste</Text>
                  )}
                </Stack>
              </Box>
            );
          }
        } catch (error) {
          console.error("Error rendering question review:", error, question);
          return (
            <Alert key={question.id} color="red" title="Error">
              No se pudo mostrar la revisión de esta pregunta
            </Alert>
          );
        }

        return (
          <Card
            key={question.id}
            withBorder
            p="md"
            radius="md"
            style={{
              backgroundColor: isCorrect ? "#f0fdf4" : "#fef2f2",
              borderColor: isCorrect ? "#22c55e" : "#ef4444",
              borderWidth: 2,
            }}
          >
            {/* Encabezado */}
            <Group justify="space-between" mb="md">
              <Text fw={700} size="lg">
                Pregunta {qIdx + 1}
              </Text>
              <Badge color={isCorrect ? "green" : "red"} size="lg">
                {isCorrect ? "✓ Correcto" : "✗ Incorrecto"}
              </Badge>
            </Group>

            {/* Pregunta */}
            <Box mb="md">
              <BlocksRenderer blocks={question.blocks} />
            </Box>

            {/* Grid: Tu respuesta | Respuesta correcta */}
            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Box
                  p="md"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.02)",
                    borderRadius: "8px",
                  }}
                >
                  {userAnswerDisplay}
                </Box>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Box
                  p="md"
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.05)",
                    borderRadius: "8px",
                  }}
                >
                  {correctAnswerDisplay}
                </Box>
              </Grid.Col>
            </Grid>
          </Card>
        );
      })}

      {onClose && (
        <Group justify="center" mt="lg">
          <Button onClick={onClose} variant="light">
            Cerrar revisión
          </Button>
        </Group>
      )}
    </Stack>
  );
}
