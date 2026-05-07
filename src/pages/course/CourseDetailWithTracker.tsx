import { useEffect, useState } from 'react';
import CourseDetail from './CourseDetail';
import { useVisibleTimeTracker } from '../../hooks/activity/useVisibleTimeTracker';
import { useUser } from '../../context/UserContext';
import { useParams } from 'react-router-dom';
import { fetchEventById } from '../../services/eventService';
import { setCourseNameCache } from '../../services/nameCache';

/**
 * Wrapper de CourseDetail que integra rastreador de tiempo
 * Rastrea el tiempo total que el usuario pasa en el curso
 */
export default function CourseDetailWithTracker() {
  const { userId } = useUser();
  const { organizationId, eventId } = useParams<{ organizationId: string; eventId: string }>();
  const [courseName, setCourseName] = useState<string>();

  // Obtener el nombre del evento (curso)
  useEffect(() => {
    const loadCourseName = async () => {
      try {
        if (eventId) {
          const event = await fetchEventById(eventId);
          const name = event?.name || eventId;
          setCourseName(name);
          setCourseNameCache(eventId, name);
        }
      } catch (error) {
        console.error('Error cargando nombre del curso:', error);
      }
    };

    loadCourseName();
  }, [eventId]);

  // Rastrear el tiempo total del curso(eventId es el ID del curso)
  const timeTracker = useVisibleTimeTracker({
    userId,
    organizationId: organizationId || '',
    courseId: eventId, // Usamos eventId como courseId
    eventId,
    courseName,
  });

  // Log de estado del rastreador (opcional)
  useEffect(() => {
    if (eventId) {
      console.log(`📚 Rastreador de curso activo para evento ${eventId}:`, {
        isActive: timeTracker.isActive,
        isPageVisible: timeTracker.isPageVisible,
        isWindowFocused: timeTracker.isWindowFocused,
        isPaused: timeTracker.isPaused,
        courseName,
      });
    }
  }, [eventId, courseName, timeTracker.isActive, timeTracker.isPageVisible, timeTracker.isWindowFocused, timeTracker.isPaused]);

  return <CourseDetail />;
}
