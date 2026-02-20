/**
 * Tarjeta de resultado del quiz
 * Muestra la conclusión del quiz con nota, puntaje y opciones de revisión
 */

import { Card, Text, Button, Group, Stack, Badge } from "@mantine/core";
import { ScoringResult } from "../../services/quizScoringService";

interface QuizResultCardProps {
  result: ScoringResult;
  isNewFormat: boolean;
  onShowReview: () => void;
}

export default function QuizResultCard({
  result,
  isNewFormat,
  onShowReview,
}: QuizResultCardProps) {
  const getGradeColor = (grade: number) => {
    if (grade >= 4) return "green";
    if (grade >= 3) return "yellow";
    return "red";
  };

  const getGradeLabel = (grade: number) => {
    if (grade >= 4.5) return "Excelente";
    if (grade >= 4) return "Muy Bien";
    if (grade >= 3) return "Bien";
    if (grade >= 2) return "Regular";
    return "Insuficiente";
  };

  return (
    <Card withBorder radius="md" p="md" mb="md" bg="gray.0">
      <Stack gap="md">
        <Text fw={700} size="lg">
          ✓ Examen Completado
        </Text>

        <Group justify="space-between" align="flex-end">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              Puntaje:
            </Text>
            <Text fw={600}>
              {result.totalScore} / {result.maxScore}
            </Text>

            <Text size="sm" c="dimmed">
              Porcentaje:
            </Text>
            <Text fw={600}>
              {Math.round(result.scorePercentage)}%
            </Text>
          </Stack>

          <Stack gap="xs" align="center">
            <Text size="sm" c="dimmed">
              Calificación
            </Text>
            <Badge
              size="xl"
              radius="md"
              color={getGradeColor(result.grade)}
              p="md"
            >
              <Text fw={700} size="lg">
                {result.grade} / 5.0
              </Text>
            </Badge>
            <Text size="sm" fw={600}>
              {getGradeLabel(result.grade)}
            </Text>
          </Stack>
        </Group>

        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Respuestas correctas: {result.correctCount} de {result.totalQuestions}
          </Text>
        </Stack>

        {(isNewFormat) && (
          <Group mt="sm">
            <Button
              variant="light"
              onClick={onShowReview}
            >
              Ver revisión
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
