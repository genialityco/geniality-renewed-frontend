import { useEffect, useState } from "react";
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

  // Cargar progreso inicial
  useEffect(() => {
    if (!eventId || !userId || activities.length === 0) return;

    const loadProgress = async () => {
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
        setCourseProgress(
          Math.round((completed / activities.length) * 100)
        );
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };

    loadProgress();
  }, [eventId, userId, activities.length]);

  // Recargar progreso cuando cambia actividad seleccionada
  useEffect(() => {
    if (
      !eventId ||
      !userId ||
      activities.length === 0 ||
      !selectedActivityId
    )
      return;

    const timeout = setTimeout(async () => {
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
        setCourseProgress(
          Math.round((completed / activities.length) * 100)
        );
      } catch (error) {
        console.error("Error reloading progress:", error);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [selectedActivityId, eventId, userId, activities.length]);

  return { courseProgress, activityAttendees, completedCount };
}
