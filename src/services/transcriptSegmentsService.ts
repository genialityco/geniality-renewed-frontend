// transcriptSegments.ts
import api from "./api";

/**
 * Estructura de un segmento en la BD
 */
export interface TranscriptSegment {
  _id: string;
  activity_id: string;
  startTime: number;
  endTime: number;
  text: string;
  embedding?: number[];
}

/**
 * Para la búsqueda con Atlas Search (agrupada por actividad)
 */
export interface TranscriptSearchResult {
  _id: string; // Este es el activity_id
  matchedSegments: {
    segmentId: string;
    text: string;
    startTime: number;
    endTime: number;
    score: number; // Valor de relevancia de Atlas Search
  }[];
  totalMatches: number;
}

/**
 * Obtener TODOS los segmentos de una actividad.
 * Endpoint: GET /transcript-segments/:activityId
 */
export const fetchSegmentsByActivityId = async (
  activityId: string
): Promise<TranscriptSegment[]> => {
  const response = await api.get<TranscriptSegment[]>(
    `/transcript-segments/${activityId}`
  );
  return response.data;
};

/**
 * Crear o sobreescribir segmentos de una actividad.
 * Endpoint: POST /transcript-segments/:activityId
 * - segmentsData: array de { startTime, endTime, text, embedding? }
 */
export const createSegmentsForActivity = async (
  activityId: string,
  segmentsData: Array<{
    startTime: number;
    endTime: number;
    text: string;
    embedding?: number[];
  }>
): Promise<TranscriptSegment[]> => {
  const response = await api.post<TranscriptSegment[]>(
    `/transcript-segments/${activityId}`,
    { segmentsData }
  );
  return response.data;
};

/**
 * Búsqueda de texto en los segmentos (Atlas Search),
 * retornando los resultados agrupados por 'activity_id'.
 * Endpoint: GET /transcript-segments/search?q=...
 */
export const searchSegments = async (
  query: string
): Promise<TranscriptSearchResult[]> => {
  if (!query) {
    // Podrías retornar un array vacío o lanzar un error,
    // depende de cómo manejes la búsqueda sin texto
    return [];
  }

  const response = await api.get<TranscriptSearchResult[]>(
    `/transcript-segments/search?q=${encodeURIComponent(query)}`
  );
  return response.data;
};
