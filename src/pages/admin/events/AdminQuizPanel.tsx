/**
 * Panel de administración de exámenes
 * Permite ver resultados y editar/crear exámenes
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Tabs, Loader, Text, Table, Button, Group, Badge, Stack, Modal } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconReload, IconEye } from "@tabler/icons-react";

import { fetchQuizByEventId, evaluateAttempt } from "../../../services/quizService";
import SurveyComponent from "../../QuizTest";
import QuizReview from "../../../components/QuizReview";
import { Quiz } from "../../../services/types";
import { useUserNameCache } from "../../../hooks/useUserNameCache";
import { ERROR_MESSAGES } from "../../../constants/quizConstants";

interface AdminQuizPanelProps {
  eventId: string;
}

export default function AdminQuizPanel({ eventId }: AdminQuizPanelProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any> | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);

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

  // Cargar respuestas del usuario y evaluación
  const handleViewResponses = useCallback(async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setLoadingAttempt(true);
    try {
      // Obtener evaluación del intento (con respuestas correctas comparadas)
      const evaluation = await evaluateAttempt(eventId, attemptId);
      console.log('📥 Evaluación cargada:', evaluation);
      console.log('🔍 evaluation.quiz:', evaluation.quiz);
      console.log('🔍 evaluation.quiz.questions:', evaluation.quiz?.questions);
      
      // Guardar preguntas del quiz (incluyen respuestas correctas)
      if (evaluation.quiz?.questions) {
        console.log('✅ Guardando preguntas:', evaluation.quiz.questions);
        console.log('📋 ESTRUCTURA primera pregunta:', JSON.stringify(evaluation.quiz.questions[0], null, 2));
        console.log('📋 ESTRUCTURA tercera pregunta (matching):', JSON.stringify(evaluation.quiz.questions[2], null, 2));
        setQuizQuestions(evaluation.quiz.questions);
      } else {
        console.warn('⚠️ No hay preguntas en evaluation.quiz');
      }
      
      // Convertir answersData al formato que QuizReview espera: Record<string, any>
      // QuizReview espera Record<questionId, answer> donde answer es el valor/respuesta
      const answersMap: Record<string, any> = {};
      
      if (Array.isArray(evaluation.evaluation)) {
        evaluation.evaluation.forEach((item: any) => {
          // Pasar la respuesta del usuario
          let response = item.userAnswer?.selectedOptionIndex 
                      ?? item.userAnswer?.selectedOptionIndices 
                      ?? item.userAnswer?.pairs 
                      ?? item.userAnswer?.orderedItemIds;
          
          // Convertir pairs: strings a números para matching
          if (item.userAnswer?.pairs && typeof item.userAnswer.pairs === 'object') {
            const convertedPairs: Record<string, number> = {};
            for (const [key, val] of Object.entries(item.userAnswer.pairs)) {
              convertedPairs[key] = typeof val === 'string' ? parseInt(val, 10) : (val as number);
            }
            response = convertedPairs;
          }
          
          answersMap[item.questionId] = response;
        });
      }
      
      console.log('📦 Respuestas transformadas:', answersMap);
      setUserAnswers(answersMap);
    } catch (err: any) {
      console.error("Error cargando respuestas:", err);
      notifications.show({
        message: "Error al cargar las respuestas",
        color: "red",
        autoClose: 3000,
      });
      setSelectedAttemptId(null);
    } finally {
      setLoadingAttempt(false);
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
    <>
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
            onViewResponses={handleViewResponses}
          />
        </Tabs.Panel>

        {/* TAB: EDITAR / CREAR */}
        <Tabs.Panel value="edit" pt="md">
          <SurveyComponent eventId={eventId} />
        </Tabs.Panel>
      </Tabs>

      {/* MODAL: VER RESPUESTAS */}
      <Modal
        opened={userAnswers !== null && quizQuestions !== null && selectedAttemptId !== null}
        onClose={() => {
          setSelectedAttemptId(null);
          setUserAnswers(null);
          setQuizQuestions(null);
        }}
        title="Respuestas del Usuario"
        size="xl"
      >
        {loadingAttempt ? (
          <Loader />
        ) : userAnswers && quizQuestions ? (
          <QuizReview
            questions={quizQuestions}
            answers={userAnswers}
            correctAnswers={quizQuestions}
            onClose={() => {
              setSelectedAttemptId(null);
              setUserAnswers(null);
              setQuizQuestions(null);
            }}
          />
        ) : (
          <Text c="dimmed">No se pudieron cargar las respuestas.</Text>
        )}
      </Modal>
    </>
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
  onViewResponses: (attemptId: string) => void;
}

function QuizResultsSection({
  quiz,
  loading,
  isLoadingUserNames,
  userNames,
  onReload,
  onViewResponses,
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
                <Table.Th style={{ width: '150px' }}>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {quiz?.listUser?.map((result: any, idx: number) => {
                const userId = result.userId;
                const userName = userId ? userNames[userId] || "Cargando..." : "N/A";
                const grade = result.result || 0;
                // El ID del intento está en quizAttemptId
                const attemptId = result.quizAttemptId;
                
                console.log('🔍 Intento:', { userId, grade, attemptId });

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
                    <Table.Td>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => attemptId && onViewResponses(attemptId)}
                        disabled={!attemptId}
                        leftSection={<IconEye size={14} />}
                      >
                        Ver respuestas
                      </Button>
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
