// modulesService.ts

import api from "./api"; // tu instancia de Axios
import { Module } from "./types";

const BASE_URL = "/modules";

// Crear módulo
export async function createModule(
eventId: string, moduleData: Partial<Module>): Promise<Module> {
  const response = await api.post<Module>(`${BASE_URL}`, moduleData);
  return response.data;
}

// Obtener todos los módulos
export async function getModules(): Promise<Module[]> {
  const response = await api.get<Module[]>(`${BASE_URL}`);
  return response.data;
}

// Obtener un módulo por id
export async function getModuleById(id: string): Promise<Module> {
  const response = await api.get<Module>(`${BASE_URL}/${id}`);
  return response.data;
}

// Actualizar un módulo (con PUT o PATCH)
export async function updateModule(
  id: string,
  moduleData: Partial<Module>,
  usePatch = true
): Promise<Module> {
  if (usePatch) {
    // PATCH
    const response = await api.patch<Module>(`${BASE_URL}/${id}`, moduleData);
    return response.data;
  } else {
    // PUT
    const response = await api.put<Module>(`${BASE_URL}/${id}`, moduleData);
    return response.data;
  }
}

// Eliminar un módulo
export async function deleteModule(id: string, moduleId: string): Promise<Module> {
  const response = await api.delete<Module>(`${BASE_URL}/${id}`);
  return response.data;
}

// Obtener módulos por event_id
export async function getModulesByEventId(event_id: string): Promise<Module[]> {
  const response = await api.get<Module[]>(`${BASE_URL}/event/${event_id}`);
  return response.data;
}
