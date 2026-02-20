import { Card, Stack, Text, Box, Badge, Group, Button } from "@mantine/core";
import { AttemptResult } from "../types/quiz.types";
import BlocksRenderer from "./BlocksRenderer";

interface QuizResponseReviewProps {
  attempt: AttemptResult;
  onClose?: () => void;
}

/**
 * Componente para revisar las respuestas de un intento de quiz
 * Compara las respuestas del usuario con las respuestas correctas
 */
export default function QuizResponseReview({
  attempt,
  onClose,
}: QuizResponseReviewProps) {
  if (!attempt?.quiz?.questions || !Array.isArray(attempt.answers)) {
    return (
      <Card p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Text c="dimmed" fw={600}>⚠️ No hay detalles disponibles</Text>
          {onClose && (
            <Group mt="md">
              <Button variant="light" onClick={onClose}>
                Cerrar
              </Button>
            </Group>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {attempt.quiz.questions.map((question: any, index: number) => {
        const userAnswer = attempt.answers.find(
          (a: any) => a.questionId === question.id
        );
        
        const isCorrect = evaluateAnswer(question, userAnswer);

        return (
          <Card key={question.id} p="md" radius="md" withBorder>
            {/* Número de pregunta y resultado */}
            <Group justify="space-between" mb="md">
              <Text fw={600}>Pregunta {index + 1}</Text>
              <Badge color={isCorrect ? "green" : "red"} variant="light">
                {isCorrect ? "✓ Correcta" : "✗ Incorrecta"}
              </Badge>
            </Group>

            {/* Contenido de la pregunta */}
            {question.blocks && (
              <Box mb="md">
                <BlocksRenderer blocks={question.blocks} />
              </Box>
            )}

            {/* Respuesta del usuario */}
            <Box mb={!isCorrect ? "md" : 0}>
              <Text size="sm" c="dimmed" mb="xs">
                Tu respuesta:
              </Text>
              <Text fw={500} pl="md">
                {formatUserAnswer(question, userAnswer) || "(Sin responder)"}
              </Text>
            </Box>

            {/* Respuesta correcta (si fue incorrecta) */}
            {!isCorrect && (
              <Box>
                <Text size="sm" c="green" mb="xs" fw={500}>
                  ✓ Respuesta correcta:
                </Text>
                <Text fw={500} pl="md" c="green">
                  {formatCorrectAnswer(question)}
                </Text>
              </Box>
            )}
          </Card>
        );
      })}

      {onClose && (
        <Group mt="md">
          <Button variant="light" onClick={onClose}>
            Cerrar revisión
          </Button>
        </Group>
      )}
    </Stack>
  );
}

/**
 * Evalúa si la respuesta del usuario es correcta
 */
function evaluateAnswer(question: any, userAnswer: any): boolean {
  if (!userAnswer) return false;

  switch (question.type) {
    case "single-choice":
      return (
        question.options?.[userAnswer.selectedOptionIndex]?.isCorrect || false
      );

    case "multiple-choice":
      if (!userAnswer.selectedOptionIndices?.length) return false;
      const selectedOptions = userAnswer.selectedOptionIndices.map(
        (idx: number) => question.options?.[idx]
      );
      const correctOptions = question.options?.filter(
        (opt: any) => opt.isCorrect
      );
      return (
        selectedOptions.length === correctOptions.length &&
        selectedOptions.every((opt: any) => opt?.isCorrect)
      );

    case "matching":
      if (!userAnswer.pairs) return false;
      const correctPairs = buildCorrectPairs(question);
      return (
        JSON.stringify(userAnswer.pairs) ===
        JSON.stringify(correctPairs)
      );

    case "ordering":
      if (!userAnswer.orderedItemIds?.length) return false;
      return (
        JSON.stringify(userAnswer.orderedItemIds) ===
        JSON.stringify(question.correctOrder)
      );

    default:
      return false;
  }
}

/**
 * Formatea la respuesta del usuario para mostrar
 */
function formatUserAnswer(question: any, userAnswer: any): string {
  if (!userAnswer) return "(Sin responder)";

  switch (question.type) {
    case "single-choice":
      return (
        question.options?.[userAnswer.selectedOptionIndex]?.label ||
        "(Sin seleccionar)"
      );

    case "multiple-choice":
      if (!userAnswer.selectedOptionIndices?.length) return "(Sin seleccionar)";
      return userAnswer.selectedOptionIndices
        .map((idx: number) => question.options?.[idx]?.label)
        .filter(Boolean)
        .join(", ");

    case "matching":
      if (!userAnswer.pairs) return "(Sin responder)";
      return Object.entries(userAnswer.pairs)
        .map(
          ([leftId, rightId]: any[]) =>
            `${
              question.leftItems?.find((item: any) => item.id === leftId)
                ?.label || leftId
            } → ${
              question.rightItems?.find((item: any) => item.id === rightId)
                ?.label || rightId
            }`
        )
        .join("; ");

    case "ordering":
      if (!userAnswer.orderedItemIds?.length) return "(Sin responder)";
      return userAnswer.orderedItemIds
        .map(
          (itemId: string) =>
            question.items?.find((item: any) => item.id === itemId)?.label ||
            itemId
        )
        .join(" → ");

    default:
      return JSON.stringify(userAnswer);
  }
}

/**
 * Formatea la respuesta correcta para mostrar
 */
function formatCorrectAnswer(question: any): string {
  switch (question.type) {
    case "single-choice":
      return (
        question.options?.find((opt: any) => opt.isCorrect)?.label ||
        "(No especificada)"
      );

    case "multiple-choice":
      const correctOptions = question.options
        ?.filter((opt: any) => opt.isCorrect)
        .map((opt: any) => opt.label)
        .join(", ");
      return correctOptions || "(No especificada)";

    case "matching":
      const pairs = buildCorrectPairs(question);
      return Object.entries(pairs)
        .map(
          ([leftId, rightId]: any[]) =>
            `${
              question.leftItems?.find((item: any) => item.id === leftId)
                ?.label || leftId
            } → ${
              question.rightItems?.find((item: any) => item.id === rightId)
                ?.label || rightId
            }`
        )
        .join("; ");

    case "ordering":
      return question.correctOrder
        ?.map(
          (itemId: string) =>
            question.items?.find((item: any) => item.id === itemId)?.label ||
            itemId
        )
        .join(" → ");

    default:
      return "(No especificada)";
  }
}

/**
 * Construye el objeto de pares correctos para preguntas de matching
 */
function buildCorrectPairs(question: any): Record<string, string> {
  const pairs: Record<string, string> = {};
  if (question.pairs) {
    question.pairs.forEach((pair: any) => {
      pairs[String(pair.left)] = String(pair.right);
    });
  }
  return pairs;
}
