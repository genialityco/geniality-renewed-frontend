import api from "./api";
import { Event } from "./types";

export const fetchAllEvents = async (): Promise<Event[]> => {
  const response = await api.get<Event[]>("/events");
  return response.data;
};

export const fetchEventById = async (id: string): Promise<Event> => {
  const response = await api.get<Event>(`/events/${id}`);
  return response.data;
};

export const fetchEventsByOrganizer = async (
  organizerId: string
): Promise<Event[]> => {
  const response = await api.get<Event[]>(`/events/organizer/${organizerId}`);
  return response.data;
};
