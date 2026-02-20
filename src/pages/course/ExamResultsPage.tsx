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
  Container,
  Alert,
} from "@mantine/core";
import { AttemptResult } from "../../types/quiz.types";
import { useUser } from "../../context/UserContext";
import { FaArrowLeft } from "react-icons/fa6";
import QuizReview from "../../components/QuizReview";
import { evaluateAttempt } from "../../services/quizService";

export default function ExamResultsPage() {
  const { eventId, organizationId, attemptId } = useParams<{
    eventId: string;
    organizationId: string;
    attemptId: string;
  }>();

  const navigate = useNavigate();
  const { userId } = useUser();

  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any> | null>(null);

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
        
        // Obtener la evaluación del intento (como en el admin)
        const evaluation = await evaluateAttempt(eventId, attemptId);
        
        // Guardar preguntas del quiz
        if (evaluation.quiz?.questions) {
          setQuizQuestions(evaluation.quiz.questions);
        }
        
        // Convertir respuestas del usuario al formato esperado por QuizReview
        const answersMap: Record<string, any> = {};
        
        // Crear correctAnswers transformadas con las respuestas correctas
        const correctAnswersTransformed: any[] = [];
        
        if (Array.isArray(evaluation.evaluation) && evaluation.quiz?.questions) {
          evaluation.evaluation.forEach((item: any) => {
            // Obtener la pregunta original
            const originalQuestion = evaluation.quiz.questions.find((q: any) => q.id === item.questionId);
            
            if (!originalQuestion) {
              return;
            }
            
            // Crear respuesta correcta transformada según el tipo
            let transformedCorrectQuestion: any = { ...originalQuestion };
            
            if (item.type === "single-choice") {
              transformedCorrectQuestion.respuestacorrecta = item.correctAnswer;
            } else if (item.type === "multiple-choice") {
              transformedCorrectQuestion.respuestascorrectas = item.correctAnswer;
            } else if (item.type === "matching") {
              // Para matching, convertir el array de pairings correctos al mismo formato que userAnswer
              // item.correctAnswer es: [{pairId: '...', correctIndex: 0}, {pairId: '...', correctIndex: 1}]
              // Necesitamos: {pairId: 0, pairId: 1}
              const correctPairsMap: Record<string, number> = {};
              if (Array.isArray(item.correctAnswer)) {
                item.correctAnswer.forEach((pair: any) => {
                  if (pair.pairId || pair.id) {
                    correctPairsMap[pair.pairId || pair.id] = pair.correctIndex ?? 0;
                  }
                });
              }
              transformedCorrectQuestion.correctPairings = correctPairsMap;
            } else if (item.type === "ordering") {
              transformedCorrectQuestion.correctOrder = item.correctAnswer;
            }
            
            correctAnswersTransformed.push(transformedCorrectQuestion);
            
            // Procesar respuesta del usuario
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
        
        setUserAnswers(answersMap);
        // Pasar las respuestas correctas transformadas en lugar de las preguntas originales
        setQuizQuestions(correctAnswersTransformed);
        setAttempt(evaluation);
      } catch (err: any) {
        console.error("❌ Error cargando resultados:", err);
        console.error("❌ Status:", err?.status);
        console.error("❌ Response data:", err?.data);
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

  const percentage = Math.round(((attempt.result || 0) / 5) * 100);

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
          {/* Revisión de respuestas */}
          {quizQuestions && userAnswers && (
            <QuizReview
              questions={quizQuestions}
              answers={userAnswers}
              correctAnswers={quizQuestions}
              result={attempt.result}
              statistics={attempt.statistics}
              onClose={() => handleBack()}
            />
          )}
        </Stack>
      </Card>
    </Container>
  );
}
