import api from "./api";
import { ActivityAttendee } from "./types";

export interface ActivityAttendeePayload {
  user_id: string;
  activity_id: string;
  progress: number;
}

export const fetchAllActivityAttendees = async (): Promise<
  ActivityAttendee[]
> => {
  const response = await api.get<ActivityAttendee[]>("/activity-attendees");
  return response.data;
};

export const fetchActivityAttendeeById = async (
  id: string
): Promise<ActivityAttendee> => {
  const response = await api.get<ActivityAttendee>(`/activity-attendees/${id}`);
  return response.data;
};

export const fetchActivityAttendeesByUserAndEvent = async (
  userId: string,
  eventId: string
): Promise<ActivityAttendee[]> => {
  const response = await api.get<ActivityAttendee[]>(
    `/activity-attendees/user/${userId}/event/${eventId}`
  );
  return response.data;
};

export const createActivityAttendee = async (
  attendee: Partial<ActivityAttendee>
): Promise<ActivityAttendee> => {
  const response = await api.post<ActivityAttendee>(
    "/activity-attendees",
    attendee
  );
  return response.data;
};

export const updateActivityAttendee = async (
  id: string,
  attendee: Partial<ActivityAttendee>
): Promise<ActivityAttendee> => {
  const response = await api.put<ActivityAttendee>(
    `/activity-attendees/${id}`,
    attendee
  );
  return response.data;
};

export const deleteActivityAttendee = async (
  id: string
): Promise<ActivityAttendee> => {
  const response = await api.delete<ActivityAttendee>(
    `/activity-attendees/${id}`
  );
  return response.data;
};

export const createOrUpdateActivityAttendee = async (
  data: ActivityAttendeePayload
): Promise<ActivityAttendee> => {
  const response = await api.post<ActivityAttendee>(
    "/activity-attendees/create-or-update",
    data
  );
  return response.data;
};

/**
 * Obtiene el progreso de una actividad específica desde la lista de attendees
 * @param attendees Lista de activityAttendees
 * @param activityId ID de la actividad
 * @returns Progreso (0-100) o 0 si no existe
 */
export const getActivityProgress = (
  attendees: ActivityAttendee[],
  activityId: string
): number => {
  const attendee = attendees.find((att) => {
    const attActivityId = typeof att.activity_id === 'object' 
      ? (att.activity_id as any)._id || (att.activity_id as any).id
      : att.activity_id;
    return attActivityId === activityId;
  });
  return attendee?.progress || 0;
};
