import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  Text,
  Loader,
  Button,
  Group,
  Stack,
  Title,
  Badge,
  Progress,
  Alert,
  Container,
} from "@mantine/core";
import { AttemptResult } from "../../types/quiz.types";
import { useUser } from "../../context/UserContext";
import { FaArrowLeft } from "react-icons/fa6";

export default function ExamResultsPage() {
  const { eventId, organizationId, attemptId } = useParams<{
    eventId: string;
    organizationId: string;
    attemptId: string;
  }>();

  const navigate = useNavigate();
  const { userId } = useUser();

  const [attempt, _setAttempt] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !organizationId || !attemptId) {
      setError("Parámetros inválidos");
      setLoading(false);
      return;
    }

    const loadAttemptResult = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Implementar endpoint para obtener un intento específico
        // Por ahora, usaremos datos ficticios
        // const response = await fetchAttemptResult(eventId, attemptId);
        // setAttempt(response);

        // NOTA: Cuando se implemente el endpoint en el backend, usar:
        // const response = await api.get(`/quiz/${eventId}/attempt/${attemptId}`);
        
        setError("Endpoint de resultados aún no implementado en el backend");
      } catch (err: any) {
        console.error("Error cargando resultados:", err);
        setError(err?.message || "Error cargando los resultados del examen");
      } finally {
        setLoading(false);
      }
    };

    loadAttemptResult();
  }, [eventId, organizationId, attemptId, userId]);

  const handleBack = () => {
    if (organizationId && eventId) {
      navigate(`/organization/${organizationId}/course/${eventId}`);
    }
  };

  if (loading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Resultados del Examen</Title>
            <FaArrowLeft
              size={24}
              style={{ cursor: "pointer" }}
              onClick={handleBack}
            />
          </Group>
          <Alert color="red" title="Error">
            {error}
          </Alert>
          <Group mt="md">
            <Button variant="light" onClick={handleBack}>
              Volver al curso
            </Button>
          </Group>
        </Card>
      </Container>
    );
  }

  if (!attempt) {
    return (
      <Container>
        <Card p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Resultados del Examen</Title>
            <FaArrowLeft
              size={24}
              style={{ cursor: "pointer" }}
              onClick={handleBack}
            />
          </Group>
          <Text c="dimmed">No se encontraron resultados.</Text>
          <Group mt="md">
            <Button variant="light" onClick={handleBack}>
              Volver al curso
            </Button>
          </Group>
        </Card>
      </Container>
    );
  }

  const percentage = Math.round((attempt.grade / attempt.maxScore) * 100);
  const isPassed = percentage >= 60;

  return (
    <Container>
      <Card p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md" align="center">
          <Title order={3}>Resultados del Examen</Title>
          <FaArrowLeft
            size={24}
            style={{ cursor: "pointer" }}
            onClick={handleBack}
          />
        </Group>

        <Stack gap="md">
          {/* Resumen de puntaje */}
          <Card withBorder p="md" bg={isPassed ? "green.0" : "red.0"}>
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">
                  Calificación
                </Text>
                <Title order={2}>
                  {attempt.grade.toFixed(1)} / {attempt.maxScore}
                </Title>
                <Text size="sm" fw={500}>
                  {percentage}%
                </Text>
              </div>
              <Badge
                color={isPassed ? "green" : "red"}
                size="lg"
                variant="light"
              >
                {isPassed ? "Aprobado" : "No aprobado"}
              </Badge>
            </Group>
            <Progress value={percentage} mb="md" color={isPassed ? "green" : "red"} />
            <Text size="xs" c="dimmed">
              Fecha: {new Date(attempt.createdAt).toLocaleDateString("es-ES")} -{" "}
              {new Date(attempt.createdAt).toLocaleTimeString("es-ES")}
            </Text>
          </Card>

          {/* Información del usuario */}
          <Card withBorder p="md">
            <Text fw={600} mb="xs">
              Información del Estudiante
            </Text>
            <Stack gap="xs">
              <div>
                <Text size="sm" c="dimmed">
                  Nombre
                </Text>
                <Text size="sm">{attempt.userName}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Email
                </Text>
                <Text size="sm">{attempt.userEmail}</Text>
              </div>
            </Stack>
          </Card>

          {/* Nota: Detalles de respuestas cuando el endpoint esté disponible */}
          <Alert color="blue" title="Información">
            Los detalles de las preguntas y respuestas se mostrarán cuando el
            endpoint de resultados esté completamente implementado en el backend.
          </Alert>
        </Stack>

        <Group mt="md">
          <Button variant="light" onClick={handleBack}>
            Volver al curso
          </Button>
        </Group>
      </Card>
    </Container>
  );
}
