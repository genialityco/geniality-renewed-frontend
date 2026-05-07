import {
  Card,
  Progress,
  Stack,
  Text,
  Group,
  Badge,
  Button,
} from "@mantine/core";
import { FaFire } from "react-icons/fa6";

interface CourseProgressCardProps {
  courseProgress: number;
  completedActivities: number;
  totalActivities: number;
  courseName: string;
  onStartLearning: () => void;
}

export default function CourseProgressCard({
  courseProgress,
  completedActivities,
  totalActivities,
  courseName,
  onStartLearning,
}: CourseProgressCardProps) {
  const hasActivities = totalActivities > 0;
  const isCompleted = courseProgress === 100;
  const hasStarted = hasActivities && courseProgress > 0;

  return (
    <Card
      shadow="md"
      radius="lg"
      p="xl"
      style={{
        background: isCompleted
          ? "linear-gradient(135deg, #d3f9d8 0%, #a3e635 100%)"
          : "linear-gradient(135deg, #e7f5ff 0%, #a5d8ff 100%)",
        color: "#1a1a1a",
        border: `2px solid ${isCompleted ? "#69db7c" : "#74c0fc"}`,
      }}
    >
      <Stack gap="md">
        {/* Encabezado */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={2} style={{ flex: 1 }}>
            <Text fw={800} size="lg" lineClamp={1} c="#1a1a1a">
              {courseName}
            </Text>
            <Group gap="xs">
              <Badge
                size="lg"
                variant="filled"
                color={isCompleted ? "green" : "blue"}
                radius="md"
              >
                {completedActivities}/{totalActivities}
              </Badge>
              {isCompleted && (
                <Badge
                  size="lg"
                  variant="filled"
                  color="green"
                  leftSection={<FaFire size={14} />}
                  radius="md"
                >
                  Completado
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>

        {/* Progreso visual */}
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" c="#1a1a1a" fw={600}>
              Progreso
            </Text>
            <Text fw={800} size="xl" c={isCompleted ? "#2f9e44" : "#1c7ed6"}>
              {Math.round(courseProgress)}%
            </Text>
          </Group>
          <Progress
            value={courseProgress}
            size="lg"
            radius="md"
            striped
            animated={!isCompleted}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.6)",
            }}
            color={isCompleted ? "green" : "blue"}
          />
        </Stack>

        {/* Mensaje motivacional */}
        <Text size="sm" style={{ fontStyle: "italic" }} c="#1a1a1a" fw={500}>
          {!hasActivities
            ? "📚 Este curso aún no tiene actividades disponibles."
            : isCompleted
            ? "🎉 ¡Felicidades! ¡Has completado este curso con éxito!"
            : hasStarted
              ? `✨ ¡Excelente progreso! ${totalActivities - completedActivities} actividad${totalActivities - completedActivities === 1 ? "" : "es"} para terminar.`
              : "🚀 ¡Comienza tu viaje de aprendizaje ahora!"}
        </Text>

        {/* Botón de acción */}
        {!isCompleted && (
          <Button
            onClick={onStartLearning}
            disabled={!hasActivities}
            size="md"
            radius="md"
            color={hasStarted ? "blue" : "blue"}
            fw={700}
            variant={hasStarted ? "default" : "filled"}
          >
            {!hasActivities
              ? "Sin actividades por ahora"
              : hasStarted
                ? "Continuar aprendiendo →"
                : "Comenzar ahora →"}
          </Button>
        )}
      </Stack>
    </Card>
  );
}
