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
 * De qué motor salió el match: 'text' (Atlas Search/fuzzy), 'vector'
 * (Atlas Vector Search/semántico), o 'hybrid' (apareció en ambos).
 */
export type SearchMatchSource = "text" | "vector" | "hybrid";

/**
 * Para la búsqueda híbrida (texto + vector, agrupada por actividad)
 */
export interface TranscriptSearchResult {
  _id: string; // Este es el activity_id
  matchedSegments: {
    segmentId: string;
    text: string;
    startTime: number;
    endTime: number;
    score: number; // Score fusionado (Reciprocal Rank Fusion)
    source: SearchMatchSource;
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
export interface PagedTranscriptSearchResult {
  data: TranscriptSearchResult[];
  total: number;
}

export const searchSegments = async (
  query: string,
  page: number = 1,
  pageSize: number = 10,
  organizationId?: string
): Promise<PagedTranscriptSearchResult> => {
  if (!query) {
    return { data: [], total: 0 };
  }

  const orgParam = organizationId
    ? `&organizationId=${encodeURIComponent(organizationId)}`
    : "";

  const response = await api.get<PagedTranscriptSearchResult>(
    `/transcript-segments/search?q=${encodeURIComponent(
      query
    )}&page=${page}&pageSize=${pageSize}${orgParam}`
  );
  return response.data;
};

/**
 * Genera y guarda el embedding de UN segmento puntual.
 * Endpoint: POST /transcript-segments/:id/generate-embedding
 * Requiere sesión (x-uid / x-session-token, los agrega el interceptor de `api`).
 */
export const generateEmbeddingForSegment = async (
  segmentId: string
): Promise<TranscriptSegment> => {
  const response = await api.post<TranscriptSegment>(
    `/transcript-segments/${segmentId}/generate-embedding`
  );
  return response.data;
};

export interface GenerateEmbeddingsResult {
  total: number;
  updated: number;
}

/**
 * Genera embeddings para todos los segmentos de una actividad.
 * `force` regenera incluso los que ya tienen embedding.
 * Endpoint: POST /transcript-segments/:activityId/embeddings
 */
export const generateEmbeddingsForActivity = async (
  activityId: string,
  force: boolean = false
): Promise<GenerateEmbeddingsResult> => {
  const response = await api.post<GenerateEmbeddingsResult>(
    `/transcript-segments/${activityId}/embeddings${force ? "?force=true" : ""}`
  );
  return response.data;
};

export interface BackfillEmbeddingsResult {
  updated: number;
  remaining: number;
}

/**
 * Backfill global: vectoriza hasta `limit` segmentos sin embedding (de
 * cualquier actividad). Si `remaining > 0` hay que volver a llamarlo.
 * Endpoint: POST /transcript-segments/embeddings/backfill
 */
export const backfillMissingEmbeddings = async (
  limit: number = 200
): Promise<BackfillEmbeddingsResult> => {
  const response = await api.post<BackfillEmbeddingsResult>(
    `/transcript-segments/embeddings/backfill?limit=${limit}`
  );
  return response.data;
};

export interface RegenerateAllEmbeddingsResult {
  updated: number;
  nextCursor: string | null;
}

/**
 * Regenera TODOS los embeddings (de cualquier actividad), incluso los que ya
 * tienen uno. Paginado por cursor: llamar primero sin `afterId`; mientras la
 * respuesta traiga `nextCursor`, repetir pasando ese valor.
 * Endpoint: POST /transcript-segments/embeddings/regenerate-all
 */
export const regenerateAllEmbeddings = async (
  limit: number = 200,
  afterId?: string | null
): Promise<RegenerateAllEmbeddingsResult> => {
  const afterParam = afterId ? `&after=${encodeURIComponent(afterId)}` : "";
  const response = await api.post<RegenerateAllEmbeddingsResult>(
    `/transcript-segments/embeddings/regenerate-all?limit=${limit}${afterParam}`
  );
  return response.data;
};
