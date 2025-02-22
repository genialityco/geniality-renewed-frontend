import api from "./api";
import { Activity } from "./types";

export const fetchAllActivities = async (): Promise<Activity[]> => {
  const response = await api.get<Activity[]>("/activities");
  return response.data;
};

export const fetchActivityById = async (id: string): Promise<Activity> => {
  const response = await api.get<Activity>(`/activities/${id}`);
  return response.data;
};

export const findByEventId = async (eventId: string): Promise<Activity[]> => {
  const response = await api.get<Activity[]>(`/activities/event/${eventId}`);
  return response.data;
};

export const createActivity = async (activity: Activity): Promise<Activity> => {
  const response = await api.post<Activity>("/activities", activity);
  return response.data;
};

export const updateActivity = async (
  id: string,
  activity: Partial<Activity>
): Promise<Activity> => {
  const response = await api.put<Activity>(`/activities/${id}`, activity);
  return response.data;
};

export const deleteActivity = async (id: string): Promise<Activity> => {
  const response = await api.delete<Activity>(`/activities/${id}`);
  return response.data;
};

export const updateVideoProgress = async (
  id: string,
  progress: number
): Promise<Activity> => {
  const response = await api.put<Activity>(`/activities/${id}/video-progress`, {
    progress,
  });
  return response.data;
};
