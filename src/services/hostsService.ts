import api from "./api";
import { Host } from "./types";

export const fetchAllHosts = async (): Promise<Host[]> => {
  const response = await api.get<Host[]>("/hosts");
  return response.data;
};

export const fetchHostById = async (id: string): Promise<Host> => {
  const response = await api.get<Host>(`/hosts/${id}`);
  return response.data;
};

export const createHost = async (host: Partial<Host>): Promise<Host> => {
  const response = await api.post<Host>("/hosts", host);
  return response.data;
};

export const updateHost = async (id: string, host: Partial<Host>): Promise<Host> => {
  const response = await api.put<Host>(`/hosts/${id}`, host);
  return response.data;
};

export const deleteHost = async (id: string): Promise<Host> => {
  const response = await api.delete<Host>(`/hosts/${id}`);
  return response.data;
};

// Consultar hosts por event_id
export const fetchHostsByEventId = async (eventId: string): Promise<Host[]> => {
  const response = await api.get<Host[]>(`/hosts/event/${eventId}`);
  return response.data;
};
