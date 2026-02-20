import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Text, Loader, Button, Group } from "@mantine/core";

import { fetchQuizForRun } from "../../services/quizService";
import QuizComponent from "../../components/quiz/QuizComponent";

export default function ExamPage() {
  const { eventId, organizationId } = useParams<{
    eventId: string;
    organizationId: string;
  }>();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<{
    id: string;
    eventId: string;
    questions: any[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError("Falta eventId.");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Trae el examen "safe" para rendir
        const data = await fetchQuizForRun(eventId);
        // data: { id, eventId, questions }
        if (data) {
          setQuiz({
            id: data.id,
            eventId: data.eventId,
            questions: data.questions || [],
          });
        } else {
          setError("No se pudo cargar el examen.");
        }
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 404) setError("Este curso no tiene examen.");
        else setError(e?.message || "Error cargando el examen.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const handleBack = () => {
    if (!organizationId || !eventId) return;
    navigate(`/organization/${organizationId}/course/${eventId}`);
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <Card p="md" radius="md" withBorder>
        <Text c="red" fw={700}>
          {error}
        </Text>
        <Group mt="md">
          <Button variant="light" onClick={handleBack}>
            Volver al curso
          </Button>
        </Group>
      </Card>
    );
  }

  if (!quiz || !quiz.questions?.length) {
    return (
      <Card p="md" radius="md" withBorder>
        <Text c="dimmed">No hay preguntas para mostrar.</Text>
        <Group mt="md">
          <Button variant="light" onClick={handleBack}>
            Volver al curso
          </Button>
        </Group>
      </Card>
    );
  }

  return (
    <Card p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Text fw={800} size="lg">
          Examen del curso
        </Text>

        <Button variant="light" onClick={handleBack}>
          Volver
        </Button>
      </Group>

      {/* userId lo toma el QuizComponent desde el contexto */}
      <QuizComponent
        quizJson={quiz.questions}
        _quizId={quiz.id}
        eventId={eventId!}
      />
    </Card>
  );
}
