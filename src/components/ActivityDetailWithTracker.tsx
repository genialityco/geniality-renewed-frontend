import { useEffect } from 'react';
import ActivityDetail from './ActivityDetail';
import { useVisibleTimeTracker } from '../hooks/activity/useVisibleTimeTracker';
import { useUser } from '../context/UserContext';
import { useParams } from 'react-router-dom';
import { Activity } from '../services/types';
import { setActivityNameCache } from '../services/nameCache';

interface ActivityDetailWithTrackerProps {
  activity: Activity | null;
  eventId: string;
  shareUrl: string;
  activities: Activity[];
  activityAttendees?: any[];
  videoTime?: number | null;
  fragments?: any[];
  formatTime?: (seconds: number) => string;
  courseId?: string; // ID del curso al que pertenece la actividad
  courseName?: string; // Nombre del curso
  isLinear?: boolean; // Curso lineal: bloquea avanzar sin completar
  /**
   * Ruta del examen del módulo al que debe llevar la flecha "Siguiente" cuando
   * esta es la última actividad del módulo y su examen aún no está aprobado.
   * `null` cuando la navegación debe seguir normal hacia la siguiente actividad.
   */
  moduleExamNextRoute?: string | null;
}

/**
 * Wrapper de ActivityDetail que integra rastreador de tiempo
 * Rastrea el tiempo que el usuario pasa viendo la actividad
 */
export default function ActivityDetailWithTracker({
  activity,
  eventId,
  shareUrl,
  activities,
  activityAttendees,
  videoTime,
  fragments,
  formatTime,
  courseId,
  courseName,
  isLinear,
  moduleExamNextRoute,
}: ActivityDetailWithTrackerProps) {
  const { userId } = useUser();
  const { organizationId } = useParams<{ organizationId: string }>();

  // Guardar el nombre de la actividad en caché
  useEffect(() => {
    if (activity?._id && activity?.name) {
      setActivityNameCache(activity._id, activity.name);
    }
  }, [activity?._id, activity?.name]);

  // Log de videoTime recibido
  useEffect(() => {
    if (videoTime !== null && videoTime !== undefined && videoTime > 0) {
      console.log(`⏱️ ActivityDetailWithTracker recibió videoTime: ${videoTime}s para actividad ${activity?._id}`);
    }
  }, [videoTime, activity?._id]);

  // Rastrear el tiempo de la actividad actual
  // Además de rastrear la actividad, también rastreamos el curso al que pertenece
  const timeTracker = useVisibleTimeTracker({
    userId,
    organizationId: organizationId || '',
    courseId: courseId, // Pasar el courseId
    courseName: courseName, // Pasar el courseName
    eventId,
    activityId: activity?._id,
    activityName: activity?.name,
  });

  // Log de estado del rastreador (opcional)
  useEffect(() => {
    if (activity) {
      console.log(`⏱️ Rastreador activo para actividad ${activity._id}:`, {
        isActive: timeTracker.isActive,
        isPageVisible: timeTracker.isPageVisible,
        isWindowFocused: timeTracker.isWindowFocused,
        isPaused: timeTracker.isPaused,
      });
    }
  }, [activity?._id, timeTracker.isActive, timeTracker.isPageVisible, timeTracker.isWindowFocused, timeTracker.isPaused]);

  return (
    <ActivityDetail
      activity={activity}
      eventId={eventId}
      shareUrl={shareUrl}
      activities={activities}
      activityAttendees={activityAttendees}
      videoTime={videoTime}
      fragments={fragments}
      formatTime={formatTime}
      isLinear={isLinear}
      moduleExamNextRoute={moduleExamNextRoute}
    />
  );
}
