import api from "./api";
import { Event } from "./types";

/** Obtener todos los eventos */
export const fetchAllEvents = async (): Promise<Event[]> => {
  const response = await api.get<Event[]>("/events");
  return response.data;
};

/** Obtener un evento por su ID */
export const fetchEventById = async (id: string): Promise<Event> => {
  const response = await api.get<Event>(`/events/${id}`);
  return response.data;
};

/** Obtener todos los eventos de un organizador */
export const fetchEventsByOrganizer = async (
  organizerId: string
): Promise<Event[]> => {
  const response = await api.get<Event[]>(`/events/organizer/${organizerId}`);
  return response.data;
};

/** Crear un nuevo evento */
export const createEvent = async (
  _organizationId: string,
  data: Partial<Event>
): Promise<Event> => {
  const response = await api.post<Event>("/events", data);
  return response.data;
};

/** Actualizar un evento existente (id) */
export const updateEvent = async (eventId: string, data: Partial<Event>) => {
  const response = await api.patch<Event>(`/events/${eventId}`, data);
  return response.data;
};

/** Eliminar un evento (id) */
export const deleteEvent = async (id: string): Promise<Event> => {
  const response = await api.delete<Event>(`/events/${id}`);
  return response.data;
};

/** Buscar un evento por su nombre */
export const fetchEventByName = async (name: string): Promise<Event | null> => {
  const response = await api.get<Event | null>(
    `/events/search/by-name/${encodeURIComponent(name)}`
  );
  return response.data;
};
