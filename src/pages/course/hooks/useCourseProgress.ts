import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchActivityAttendeesByUserAndEvent,
} from "../../../services/activityAttendeeService";
import {
  createOrUpdateCourseAttendee,
  CourseAttendeePayload,
} from "../../../services/courseAttendeeService";
import { Event, Activity, ActivityAttendee } from "../../../services/types";

interface UseCourseProgressReturn {
  courseProgress: number;
  activityAttendees: ActivityAttendee[];
  completedCount: number;
  reloadProgress: () => Promise<void>;
}

function normalizeProgress(progress: unknown): number {
  const numeric = Number(progress ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

export function useCourseProgress(
  event: Event | null,
  activities: Activity[],
  userId: string | null | undefined,
  eventId: string | undefined,
  selectedActivityId?: string
): UseCourseProgressReturn {
  const [courseProgress, setCourseProgress] = useState(0);
  const [activityAttendees, setActivityAttendees] = useState<ActivityAttendee[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  // Enroll user en el curso
  useEffect(() => {
    if (!event || !userId) return;

    const enroll = async () => {
      try {
        const payload: CourseAttendeePayload = {
          user_id: userId,
          event_id: event._id.toString(),
        };
        await createOrUpdateCourseAttendee(payload);
      } catch (error) {
        console.error("Error inscribiendo al usuario:", error);
      }
    };

    enroll();
  }, [event, userId]);

  // Cargar el progreso desde la BD y recalcular contadores
  const reloadProgress = useCallback(async () => {
    if (!eventId || !userId || activities.length === 0) return;

    try {
      const attendees = await fetchActivityAttendeesByUserAndEvent(
        userId,
        eventId
      );
      setActivityAttendees(attendees);

      const completed = attendees.filter(
        (a: ActivityAttendee) => normalizeProgress(a.progress) >= 100
      ).length;
      setCompletedCount(completed);
      setCourseProgress(Math.round((completed / activities.length) * 100));
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  }, [eventId, userId, activities.length]);

  // Carga inicial
  useEffect(() => {
    reloadProgress();
  }, [reloadProgress]);

  // Recargar progreso cada vez que se entra o se sale de una actividad.
  // Al salir (selectedActivityId vacío) también recargamos, porque la
  // actividad guarda su progreso al desmontarse; usamos un pequeño retraso
  // para que ese guardado alcance a persistirse antes de volver a leer.
  const isFirstSelectionRun = useRef(true);
  useEffect(() => {
    if (isFirstSelectionRun.current) {
      isFirstSelectionRun.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      reloadProgress();
    }, 800);

    return () => clearTimeout(timeout);
  }, [selectedActivityId, reloadProgress]);

  return { courseProgress, activityAttendees, completedCount, reloadProgress };
}
