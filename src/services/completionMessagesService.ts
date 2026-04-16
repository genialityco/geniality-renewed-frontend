import api from './api';

interface Block {
  id: string;
  type: 'paragraph' | 'heading' | 'title';
  content: string;
}

export enum CompletionMessageType {
  MODULO_INICIO = 'MODULO_INICIO',
  MODULO_PROGRESO = 'MODULO_PROGRESO',
  MODULO_FINAL = 'MODULO_FINAL',
}

export interface CompletionMessage {
  _id?: string;
  organization_id: string;
  type: CompletionMessageType;
  blocks: Block[];
  active: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const fetchCompletionMessages = async (
  organizationId: string
): Promise<CompletionMessage[]> => {
  const response = await api.get<CompletionMessage[]>(
    `/completion-messages/organization/${organizationId}`
  );
  return response.data;
};

export const fetchCompletionMessagesByType = async (
  organizationId: string,
  type: CompletionMessageType
): Promise<CompletionMessage[]> => {
  const response = await api.get<CompletionMessage[]>(
    `/completion-messages/organization/${organizationId}/type/${type}`
  );
  return response.data;
};

export const createCompletionMessage = async (
  data: Partial<CompletionMessage>
): Promise<CompletionMessage> => {
  const response = await api.post<CompletionMessage>(
    '/completion-messages',
    data
  );
  return response.data;
};

export const updateCompletionMessage = async (
  id: string,
  data: Partial<CompletionMessage>
): Promise<CompletionMessage> => {
  const response = await api.patch<CompletionMessage>(
    `/completion-messages/${id}`,
    data
  );
  return response.data;
};

export const deleteCompletionMessage = async (id: string): Promise<void> => {
  await api.delete(`/completion-messages/${id}`);
};
