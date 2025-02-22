import api from "./api";
import { Module } from "./types";

/**
 * Obtener todos los módulos
 */
export const fetchAllModules = async (): Promise<Module[]> => {
  const response = await api.get<Module[]>("/modules");
  return response.data;
};

/**
 * Obtener un módulo por su ID
 */
export const fetchModuleById = async (id: string): Promise<Module> => {
  const response = await api.get<Module>(`/modules/${id}`);
  return response.data;
};

/**
 * Crear un nuevo módulo
 */
export const createModule = async (module: Omit<Module, "_id" | "created_at" | "updated_at">): Promise<Module> => {
  const response = await api.post<Module>("/modules", module);
  return response.data;
};

/**
 * Actualizar un módulo existente
 */
export const updateModule = async (id: string, module: Partial<Module>): Promise<Module> => {
  const response = await api.put<Module>(`/modules/${id}`, module);
  return response.data;
};

/**
 * Eliminar un módulo por su ID
 */
export const deleteModule = async (id: string): Promise<void> => {
  await api.delete(`/modules/${id}`);
};

/**
 * Obtener módulos por event_id
 */
export const fetchModulesByEventId = async (event_id: string): Promise<Module[]> => {
  const response = await api.get<Module[]>(`/modules/event/${event_id}`);
  return response.data;
};