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
