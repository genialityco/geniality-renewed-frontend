// src/services/assistantService.ts
import api from "./api";

/** Configuración del asistente de WhatsApp (Gemini) de una organización. */
export interface AssistantConfig {
  enabled: boolean;
  /** Indicaciones extra de la organización para el asistente */
  instructions: string;
  /** Mensajes por persona al día */
  daily_limit: number;
  /** Los enlaces de las respuestas entran con la sesión iniciada */
  auto_login_links: boolean;
}

export const fetchAssistantConfig = async (organizationId: string) =>
  (await api.get<AssistantConfig>(`/assistant/organization/${organizationId}/config`)).data;

export const updateAssistantConfig = async (organizationId: string, config: AssistantConfig) =>
  (await api.put<AssistantConfig>(`/assistant/organization/${organizationId}/config`, config))
    .data;
