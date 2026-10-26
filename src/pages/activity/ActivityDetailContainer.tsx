// src/pages/ActivityDetailContainer/ActivityDetailContainer.tsx

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Container, Text } from "@mantine/core";

import { Activity } from "../../services/types";
import { getActivityById } from "../../services/activityService";

// Importa tu componente “completo” (la ActivityDetail)
import ActivityDetailWithTracker from "../../components/ActivityDetailWithTracker";

// (Opcional) función para formatear el tiempo
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const secsString = secs < 10 ? `0${secs}` : secs.toString();
  return `${mins}:${secsString}`;
}

/** Id del curso de la actividad (event_id puede venir poblado o como id). */
function courseIdOf(activity: Activity): string | null {
  const raw: any = activity.event_id;
  const id = raw && typeof raw === "object" ? raw._id || raw.id : raw;
  return id ? String(id) : null;
}

/** Primera página de la plataforma en esta pestaña (se llegó desde un enlace externo). */
const isEntryPage = () => (window.history.state?.idx ?? 0) === 0;

export default function ActivityDetailContainer() {
  // 1. Leer activityId de la URL y demás parámetros
  const { activityId, organizationId } = useParams<{ activityId: string; organizationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirected = useRef(false);

  // 2. Definir estados
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Tiempo de inicio en el video
  const [videoTime, setVideoTime] = useState<number | null>(null);

  // Fragmentos de texto
  const [_fragments, setFragments] = useState<{ startTime: number; text: string }[]>([]);

  // 3. Hacer fetch de la actividad
  useEffect(() => {
    const loadActivity = async () => {
      if (!activityId) {
        setLoading(false);
        return;
      }
      try {
        const response = await getActivityById(activityId);
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

  // Abierta desde un enlace externo (WhatsApp, correo): sola, la página no
  // tiene el temario del curso, así que "Siguiente" y "Anterior" no funcionan
  // y "atrás" saca de la plataforma. Se lleva al curso con la actividad
  // abierta (conserva ?t= y ?fragments=) y debajo queda la portada del curso
  // para que el "atrás" del navegador vuelva a ella.
  const courseUrl =
    activity && organizationId && courseIdOf(activity) && isEntryPage()
      ? `/organization/${organizationId}/course/${courseIdOf(activity)}`
      : null;
  useEffect(() => {
    if (!courseUrl || !activity || redirected.current) return;
    redirected.current = true;
    const params = new URLSearchParams(searchParams);
    params.set("activity", activity._id);
    navigate(courseUrl, { replace: true });
    navigate(`${courseUrl}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseUrl]);

  function getShareUrl(activity: Activity) {
    return `${window.location.origin}/activitydetail/${activity._id}`;
  }

  // 5. Mostrar carga o error si no hay actividad
  if (loading || courseUrl) {
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

  // 6. Renderizar el componente "completo" pasandole la actividad y otras props
  return (
    <Container id="main-container" fluid style={{overflow: "auto", maxHeight: "100vh"}}>
      <ActivityDetailWithTracker
        activity={activity}
        eventId=""
        shareUrl={getShareUrl(activity)} 
        
        videoTime={videoTime}
        formatTime={formatTime}
        activities={[]}
      />
    </Container>
  );
}

