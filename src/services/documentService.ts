import api from './api';
import { ChatbotService } from './chatbotService';

export interface Document {
  _id: string;
  name: string;
  originalName: string;
  mimetype: string;
  size: number;
  organizationId: string;
  eventId?: string;
  moduleId?: string;
  activityId?: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
  content: string;
  extractedAt?: string;
  url: string;
  tags: string[];
  active: boolean;
}

export interface UploadDocumentResponse extends Document {}

export class DocumentService {
  // Subir un documento
  static uploadDocument(
    organizationId: string,
    file: File,
    options?: {
      eventId?: string;
      moduleId?: string;
      activityId?: string;
      tags?: string[];
    }
  ): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);

    if (options?.eventId) {
      formData.append('eventId', options.eventId);
    }
    if (options?.moduleId) {
      formData.append('moduleId', options.moduleId);
    }
    if (options?.activityId) {
      formData.append('activityId', options.activityId);
    }
    if (options?.tags && options.tags.length > 0) {
      formData.append('tags', JSON.stringify(options.tags));
    }

    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(async (r) => {
      const document = r.data as UploadDocumentResponse;
      ChatbotService.reindexDocuments(organizationId).catch(() => {});
      return document;
    });
  }

  // Obtener documentos por organización
  static getDocumentsByOrganization(
    organizationId: string,
    filters?: {
      eventId?: string;
      moduleId?: string;
      activityId?: string;
    }
  ): Promise<Document[]> {
    const params = new URLSearchParams();
    if (filters?.eventId) {
      params.append('eventId', filters.eventId);
    }
    if (filters?.moduleId) {
      params.append('moduleId', filters.moduleId);
    }
    if (filters?.activityId) {
      params.append('activityId', filters.activityId);
    }

    const queryString = params.toString();
    const url = `/documents/organization/${organizationId}${
      queryString ? `?${queryString}` : ''
    }`;

    return api.get(url).then(r => r.data);
  }

  // Obtener un documento por ID
  static getDocumentById(documentId: string): Promise<Document> {
    return api.get(`/documents/${documentId}`).then(r => r.data);
  }

  // Obtener contenido de un documento
  static getDocumentContent(
    documentId: string
  ): Promise<{ content: string }> {
    return api.get(`/documents/${documentId}/content`).then(r => r.data);
  }

  // Buscar documentos
  static searchDocuments(
    organizationId: string,
    searchTerm: string
  ): Promise<Document[]> {
    return api.get(
      `/documents/search/${organizationId}?q=${encodeURIComponent(searchTerm)}`
    ).then(r => r.data);
  }

  // Asociar documento a evento/módulo/actividad
  static associateDocument(
    documentId: string,
    options: {
      eventId?: string;
      moduleId?: string;
      activityId?: string;
    }
  ): Promise<Document> {
    return api.patch(`/documents/${documentId}/associate`, options).then(r => r.data);
  }

  // Eliminar documento
  static deleteDocument(documentId: string): Promise<void> {
    return api.delete(`/documents/${documentId}`).then(r => r.data);
  }

  // Obtener documentos de un evento
  static getEventDocuments(eventId: string): Promise<Document[]> {
    return api.get(`/events/${eventId}/documents`).then(r => r.data);
  }

  // Obtener documentos de una actividad
  static getActivityDocuments(activityId: string): Promise<Document[]> {
    return api.get(`/activities/${activityId}/documents`).then(r => r.data);
  }
}
