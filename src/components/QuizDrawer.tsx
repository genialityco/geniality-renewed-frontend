import { useEffect, useState } from "react";
import { Drawer, Loader, Text } from "@mantine/core";
import QuizComponent from "./quiz/QuizComponent";

// IMPORTA tus servicios para Quiz
import {
  createOrUpdateQuiz,
} from "../services/quizService";
import { generateQuestionnaire } from "../services/questionnaireService";

interface QuizDrawerProps {
  opened: boolean;
  onClose: () => void;
  transcript: string; // Texto base para generar el quiz (por IA)
  activityId: string; // ID de la actividad
}

export default function QuizDrawer({
  opened,
  onClose,
  transcript,
  activityId,
}: QuizDrawerProps) {
  const [quizJson, setQuizJson] = useState<any | null>(null);
  const [quizId, setQuizId] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Efecto: cada vez que se abra el Drawer, intenta obtener o crear el quiz
  useEffect(() => {
    const loadQuiz = async () => {
      if (!opened) return; // Solo cargamos si el Drawer se abre
      if (!activityId) return;

      setLoading(true);
      setError(null);
      setQuizJson(null);

      try {
        // Generar con IA si no existe
        const generatedSurveyJson = await generateQuestionnaire(transcript);
        // Guardar quiz en backend
        const newQuiz = await createOrUpdateQuiz(
          activityId,
          generatedSurveyJson
        );
        setQuizJson(newQuiz.questions || newQuiz);
        setQuizId(activityId);
      } catch (genError: any) {
        console.error("Error generando quiz con IA:", genError);
        setError("Error generando quiz");
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [opened, activityId, transcript]);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Cuestionario"
      padding="md"
      size="xl"
      position="right"
    >
      {loading ? (
        <Loader />
      ) : error ? (
        <Text color="red">{error}</Text>
      ) : quizJson ? (
        // Pasamos quizJson en lugar de transcript
        <QuizComponent _quizId={quizId} quizJson={quizJson} eventId={activityId} />
      ) : (
        <Text size="sm" c="dimmed">
          No hay quiz disponible.
        </Text>
      )}
    </Drawer>
  );
}
