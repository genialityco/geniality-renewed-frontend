// activityService.ts

import api from "./api"; // Tu instancia de Axios (con baseURL configurada)
import { Activity } from "./types"; // Ajusta la ruta según tu estructura

const BASE_URL = "/activities";

/**
 * Crea una nueva actividad
 * POST /activities
 */
export async function createActivity(
  activityData: Partial<Activity>
): Promise<Activity> {
  const response = await api.post<Activity>(BASE_URL, activityData);
  return response.data;
}

/**
 * Lista las actividades filtrando por ID de organización (opcional)
 * GET /activities/by-organization?organizationId=xxx
 */
export async function getActivitiesByOrganization(
  organizationId?: string
): Promise<Activity[]> {
  const url = `${BASE_URL}/by-organization${
    organizationId ? `?organizationId=${organizationId}` : ""
  }`;
  const response = await api.get<Activity[]>(url);
  return response.data;
}

/**
 * Obtiene una actividad específica por su ID
 * GET /activities/:id
 */
export async function getActivityById(id: string): Promise<Activity> {
  const response = await api.get<Activity>(`${BASE_URL}/${id}`);
  return response.data;
}

/**
 * Actualiza una actividad usando PUT
 * PUT /activities/:id
 */
export async function updateActivityPut(
  id: string,
  activityData: Partial<Activity>
): Promise<Activity> {
  const response = await api.put<Activity>(`${BASE_URL}/${id}`, activityData);
  return response.data;
}

/**
 * Actualiza una actividad usando PATCH
 * PATCH /activities/:id
 */
export async function updateActivityPatch(
  id: string,
  activityData: Partial<Activity>
): Promise<Activity> {
  const response = await api.patch<Activity>(`${BASE_URL}/${id}`, activityData);
  return response.data;
}

/**
 * Elimina una actividad por su ID
 * DELETE /activities/:id
 */
export async function deleteActivity(id: string): Promise<Activity> {
  const response = await api.delete<Activity>(`${BASE_URL}/${id}`);
  return response.data;
}

/**
 * Lista actividades de un evento
 * GET /activities/event/:event_id
 */
export async function getActivitiesByEvent(eventId: string): Promise<Activity[]> {
  const response = await api.get<Activity[]>(`${BASE_URL}/event/${eventId}`);
  return response.data;
}

/**
 * Actualiza el video_progress (campo de la actividad)
 * PUT /activities/:id/video-progress
 */
export async function updateVideoProgress(
  id: string,
  progress: number
): Promise<Activity> {
  const response = await api.put<Activity>(`${BASE_URL}/${id}/video-progress`, {
    progress,
  });
  return response.data;
}

/**
 * Genera la transcripción de la actividad
 * POST /activities/generate-transcript/:activity_id
 */
export async function generateTranscript(activityId: string): Promise<{
  message: string;
  totalSegments: number;
}> {
  const response = await api.post<{
    message: string;
    totalSegments: number;
  }>(`${BASE_URL}/generate-transcript/${activityId}`);
  return response.data;
}
