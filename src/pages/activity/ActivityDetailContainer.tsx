// src/pages/ActivityDetailContainer/ActivityDetailContainer.tsx

import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Container, Text } from "@mantine/core";

import { Activity } from "../../services/types";
import { fetchActivityById } from "../../services/activityService";

// Importa tu componente “completo” (la ActivityDetail)
import ActivityDetail from "../../components/ActivityDetail";

// Importa tu componente QuizDrawer
import QuizDrawer from "../../components/QuizDrawer";

// (Opcional) función para formatear el tiempo
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const secsString = secs < 10 ? `0${secs}` : secs.toString();
  return `${mins}:${secsString}`;
}

export default function ActivityDetailContainer() {
  // 1. Leer activityId de la URL y demás parámetros
  const { activityId } = useParams<{ activityId: string }>();
  const [searchParams] = useSearchParams();

  // 2. Definir estados
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Tiempo de inicio en el video
  const [videoTime, setVideoTime] = useState<number | null>(null);

  // Fragmentos de texto
  const [fragments, setFragments] = useState<{ startTime: number; text: string }[]>([]);

  // **Estado para el Drawer del Cuestionario**
  const [drawerQuestionnaireOpen, setDrawerQuestionnaireOpen] = useState(false);

  // 3. Hacer fetch de la actividad
  useEffect(() => {
    const loadActivity = async () => {
      if (!activityId) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetchActivityById(activityId);
        setActivity(response);
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        setLoading(false);
      }
    };
    loadActivity();
  }, [activityId]);

  // 4. Leer los query params “t” y “fragments”
  useEffect(() => {
    const timeParam = searchParams.get("t");
    if (timeParam) {
      setVideoTime(parseFloat(timeParam)); // Ejemplo: ?t=120
    }
    const fragmentsParam = searchParams.get("fragments");
    if (fragmentsParam) {
      try {
        const decoded = decodeURIComponent(fragmentsParam);
        setFragments(JSON.parse(decoded));
      } catch (error) {
        console.error("Error parsing fragments:", error);
      }
    }
  }, [searchParams]);

  function getShareUrl(activity: Activity) {
    return `${window.location.origin}/activitydetail/${activity._id}`;
  }

  // 5. Mostrar carga o error si no hay actividad
  if (loading) {
    return (
      <Text ta="center" size="md" color="gray">
        Cargando actividad...
      </Text>
    );
  }
  if (!activity) {
    return (
      <Text ta="center" size="md" color="red">
        Actividad no encontrada.
      </Text>
    );
  }

  // 6. Handler para abrir el Drawer
  const handleStartQuestionnaire = () => {
    setDrawerQuestionnaireOpen(true);
  };

  // 7. Renderizar el componente “completo” pasándole la actividad y otras props
  return (
    <Container id="main-container" fluid style={{overflow: "auto", maxHeight: "100vh"}}>
      <ActivityDetail
        activity={activity}
        eventId=""
        shareUrl={getShareUrl(activity)} 
        onStartQuestionnaire={handleStartQuestionnaire}
        videoTime={videoTime}
        fragments={fragments}
        formatTime={formatTime}
      />

      {/* 8. Renderiza aquí tu QuizDrawer con transcript, que se abre/cierra por el estado */}
      <QuizDrawer
        opened={drawerQuestionnaireOpen}
        onClose={() => setDrawerQuestionnaireOpen(false)}
        transcript={activity.description || ""}
      />
    </ Container>
  );
}
