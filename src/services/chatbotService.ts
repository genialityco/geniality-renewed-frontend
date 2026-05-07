import axios from 'axios';

const ragApi = axios.create({
  baseURL: import.meta.env.VITE_RAG_URL || '',
  headers: {
    'X-Platform-Id': import.meta.env.VITE_RAG_PLATFORM_ID || 'gencampus',
    'X-API-Key': import.meta.env.VITE_RAG_API_KEY || '',
  },
});

export interface ReindexResponse {
  status: 'pending' | 'already_running';
  message: string;
  platform_id: string;
  org_id?: string;
}

export class ChatbotService {
  static async reindexDocuments(organizationId: string): Promise<ReindexResponse> {
    const r = await ragApi.post<ReindexResponse>('/documents/reindex', null, {
      headers: { 'X-Org-Id': organizationId },
    });
    return r.data;
  }
}
