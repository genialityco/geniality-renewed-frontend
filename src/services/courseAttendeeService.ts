import api from "./api";
import { CourseAttendee } from "./types";

export interface CourseAttendeePayload {
  user_id: string;
  event_id: string;
  status?: string;
  progress?: number;
}

export const fetchAllCourseAttendees = async (): Promise<CourseAttendee[]> => {
  const response = await api.get<CourseAttendee[]>("/course-attendees");
  return response.data;
};

export const fetchCourseAttendeeById = async (
  id: string
): Promise<CourseAttendee> => {
  const response = await api.get<CourseAttendee>(`/course-attendees/${id}`);
  return response.data;
};

export const fetchCourseAttendeesByUser = async (
  userId: string
): Promise<CourseAttendee[]> => {
  const response = await api.get<CourseAttendee[]>(
    `/course-attendees/user/${userId}`
  );
  return response.data;
};

/**
 * Cursos del usuario acotados a UNA organización. A diferencia de
 * fetchCourseAttendeesByUser (devuelve cursos de todas las organizaciones
 * en las que el usuario está inscrito), esta filtra por organizationId.
 */
export const fetchCourseAttendeesByUserAndOrg = async (
  userId: string,
  organizationId: string
): Promise<CourseAttendee[]> => {
  const response = await api.get<CourseAttendee[]>(
    `/course-attendees/user/${userId}/organization/${organizationId}`
  );
  return response.data;
};

export const fetchCourseAttendeeByUserAndEvent = async (
  userId: string,
  eventId: string
): Promise<CourseAttendee | null> => {
  try {
    const attendees = await fetchCourseAttendeesByUser(userId);
    return attendees.find((att) => {
      const attEventId = typeof att.event_id === 'string' ? att.event_id : att.event_id?._id;
      return attEventId === eventId;
    }) || null;
  } catch (error) {
    console.error("Error fetching courseAttendee:", error);
    return null;
  }
};

export const createCourseAttendee = async (
  attendee: Partial<CourseAttendee>
): Promise<CourseAttendee> => {
  const response = await api.post<CourseAttendee>(
    "/course-attendees",
    attendee
  );
  return response.data;
};

export const updateCourseAttendee = async (
  id: string,
  attendee: Partial<CourseAttendee>
): Promise<CourseAttendee> => {
  const response = await api.put<CourseAttendee>(
    `/course-attendees/${id}`,
    attendee
  );
  return response.data;
};

export const deleteCourseAttendee = async (
  id: string
): Promise<CourseAttendee> => {
  const response = await api.delete<CourseAttendee>(`/course-attendees/${id}`);
  return response.data;
};

export const createOrUpdateCourseAttendee = async (
  data: CourseAttendeePayload
): Promise<CourseAttendee> => {
  const response = await api.post<CourseAttendee>(
    "/course-attendees/create-or-update",
    data
  );
  return response.data;
};

/**
 * Calcula el progreso general de un curso basado en los activityAttendees
 * @param activityAttendees Lista de activityAttendees del usuario
 * @param totalActivities Cantidad total de actividades en el curso
 * @returns Porcentaje de progreso (0-100)
 */
export const calculateCourseProgress = (
  activityAttendees: any[],
  totalActivities: number
): number => {
  if (totalActivities === 0) return 0;
  
  const completedActivities = activityAttendees.filter(
    (att) => att.progress === 100
  ).length;
  
  return Math.round((completedActivities / totalActivities) * 100);
};
