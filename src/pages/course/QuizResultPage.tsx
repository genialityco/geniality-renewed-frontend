import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Loader,
  Text,
  Button,
  Group,
  Title,
  Card,
  Center,
  RingProgress,
  Stack,
} from "@mantine/core";
import { FaArrowLeft, FaTrophy } from "react-icons/fa6";
import { getScoreByUserId } from "../../services/quizService";
import { useUser } from "../../context/UserContext";

function scoreColor(score: number): string {
  if (score >= 80) return "teal";
  if (score >= 50) return "yellow";
  return "red";
}

export default function QuizResultPage() {
  const { organizationId, eventId, quizId } = useParams<{
    organizationId: string;
    eventId: string;
    quizId: string;
  }>();
  const navigate = useNavigate();
  const { userId } = useUser();

  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId || !userId) return;
    (async () => {
      try {
        const data = await getScoreByUserId(quizId, userId);
        setScore(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.message ?? "Error al cargar tu resultado.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, userId]);

  const handleBack = () => {
    navigate(`/organization/${organizationId}/course/${eventId}`);
  };

  if (loading)
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );

  if (error)
    return (
      <Container mt="xl">
        <Text c="red">{error}</Text>
        <Button mt="md" variant="subtle" onClick={handleBack}>
          Volver al curso
        </Button>
      </Container>
    );

  const numScore = score ?? 0;
  const color = scoreColor(numScore);

  return (
    <Container size="sm" py="xl">
      <Group mb="lg">
        <Button
          variant="subtle"
          leftSection={<FaArrowLeft size={14} />}
          onClick={handleBack}
        >
          Volver al curso
        </Button>
      </Group>

      <Title order={2} mb="xl" ta="center">
        Resultado del examen
      </Title>

      <Card shadow="md" radius="lg" withBorder p="xl">
        <Stack align="center" gap="md">
          <FaTrophy size={40} color={color === "teal" ? "#38d9a9" : color === "yellow" ? "#ffa94d" : "#ff6b6b"} />

          <RingProgress
            size={160}
            thickness={14}
            roundCaps
            sections={[{ value: numScore, color }]}
            label={
              <Center>
                <Text fw={700} size="xl">
                  {numScore}%
                </Text>
              </Center>
            }
          />

          <Text size="lg" fw={600} ta="center">
            {numScore >= 80
              ? "¡Excelente resultado!"
              : numScore >= 50
              ? "Buen intento, puedes mejorar."
              : "Sigue practicando."}
          </Text>

          <Text size="sm" c="dimmed" ta="center">
            Tu puntaje en este examen fue de{" "}
            <strong>{numScore}%</strong>.
          </Text>
        </Stack>
      </Card>
    </Container>
  );
}
