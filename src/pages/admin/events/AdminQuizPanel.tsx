/**
 * Panel de administración de exámenes
 * Permite ver resultados y editar/crear exámenes
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Tabs, Loader, Text, Table, Button, Group, Badge, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconReload } from "@tabler/icons-react";

import { fetchQuizByEventId } from "../../../services/quizService";
import SurveyComponent from "../../QuizTest";
import { Quiz } from "../../../services/types";
import { useUserNameCache } from "../../../hooks/useUserNameCache";
import { ERROR_MESSAGES } from "../../../constants/quizConstants";

interface AdminQuizPanelProps {
  eventId: string;
}

export default function AdminQuizPanel({ eventId }: AdminQuizPanelProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);

  const loadQuiz = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const q = await fetchQuizByEventId(eventId);
      setQuiz(q);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setQuiz(null);
      } else {
        console.error("Error cargando examen:", err);
        notifications.show({
          message: ERROR_MESSAGES.LOAD_ERROR,
          color: "red",
          autoClose: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // IDs únicos de usuarios que realizaron el examen
  const userIds = useMemo(() => {
    if (!quiz?.listUser?.length) return [];
    const ids = quiz.listUser
      .map((u: any) => u?.userId)
      .filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [quiz]);

  // Cargar nombres de usuarios en caché
  const { userNames, isLoading: isLoadingUserNames } = useUserNameCache(userIds);

  // Cargar quiz al montar o cuando cambie eventId
  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  return (
    <Tabs defaultValue="results">
      <Tabs.List>
        <Tabs.Tab value="results">
          Resultados
          {quiz?.listUser && quiz.listUser.length > 0 && (
            <Badge ml="xs" size="sm" variant="filled">
              {quiz.listUser.length}
            </Badge>
          )}
        </Tabs.Tab>
        <Tabs.Tab value="edit">Crear / Editar</Tabs.Tab>
      </Tabs.List>

      {/* TAB: RESULTADOS */}
      <Tabs.Panel value="results" pt="md">
        <QuizResultsSection
          quiz={quiz}
          loading={loading}
          isLoadingUserNames={isLoadingUserNames}
          userNames={userNames}
          onReload={loadQuiz}
        />
      </Tabs.Panel>

      {/* TAB: EDITAR / CREAR */}
      <Tabs.Panel value="edit" pt="md">
        <SurveyComponent eventId={eventId} />
      </Tabs.Panel>
    </Tabs>
  );
}

/**
 * Componente para mostrar sección de resultados
 */
interface QuizResultsSectionProps {
  quiz: Quiz | null;
  loading: boolean;
  isLoadingUserNames: boolean;
  userNames: Record<string, string>;
  onReload: () => void;
}

function QuizResultsSection({
  quiz,
  loading,
  isLoadingUserNames,
  userNames,
  onReload,
}: QuizResultsSectionProps) {
  const hasQuiz = quiz !== null;
  const hasResults = hasQuiz && quiz.listUser && quiz.listUser.length > 0;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={600} size="lg">
            Resultados del Examen
          </Text>
          {hasResults && (
            <Text size="sm" c="dimmed">
              {quiz?.listUser && quiz.listUser.length > 0 && quiz.listUser.length}
            </Text>
          )}
        </div>

        <Button
          variant="light"
          onClick={onReload}
          loading={loading}
          leftSection={<IconReload size={16} />}
        >
          Recargar
        </Button>
      </Group>

      {loading && <Loader />}

      {!loading && !hasQuiz && (
        <Text size="sm" c="dimmed">
          {ERROR_MESSAGES.QUIZ_NOT_FOUND}
        </Text>
      )}

      {!loading && hasQuiz && !hasResults && (
        <Text size="sm" c="dimmed">
          {ERROR_MESSAGES.NO_QUIZ_RESULTS}
        </Text>
      )}

      {!loading && hasResults && (
        <>
          {isLoadingUserNames && (
            <Text size="sm" c="dimmed">
              {ERROR_MESSAGES.LOADING_USERS}
            </Text>
          )}

          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: '50px' }}>#</Table.Th>
                <Table.Th>Nombre</Table.Th>
                <Table.Th style={{ width: '100px' }}>Calificación</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {quiz?.listUser?.map((result: any, idx: number) => {
                const userId = result.userId;
                const userName = userId ? userNames[userId] || "Cargando..." : "N/A";
                const grade = result.result || 0;

                return (
                  <Table.Tr key={`${userId}-${idx}`}>
                    <Table.Td fw={500}>{idx + 1}</Table.Td>
                    <Table.Td>{userName}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={grade >= 4 ? "green" : grade >= 3 ? "yellow" : "red"}
                        variant="filled"
                      >
                        {grade.toFixed(1)}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Stack>
  );
}
