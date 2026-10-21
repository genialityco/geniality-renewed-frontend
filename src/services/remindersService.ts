import api from "./api";

export type ReminderTemplateName =
  | "recordatorio_inactividad_3dias"
  | "reporte_semanal_progreso"
  | "ranking_lider_curso1"
  | "ranking_comparativo_curso1";

export interface TestReminderTemplateResult {
  result: "sent" | "fallback_email";
  templateName: ReminderTemplateName;
  parameters: string[];
  /** Sufijo del enlace del botón tal como se envió */
  buttonUrl?: string;
}

/**
 * Lista los nombres de plantillas de recordatorio disponibles.
 * GET /reminders/organization/:organizationId/templates (solo admins)
 */
export async function fetchReminderTemplateNames(
  organizationId: string
): Promise<ReminderTemplateName[]> {
  const response = await api.get<ReminderTemplateName[]>(
    `/reminders/organization/${organizationId}/templates`
  );
  return response.data;
}

/** Miembro de la organización para probar plantillas con sus datos reales. */
export interface ReminderTestUser {
  user_id: string;
  name: string;
  email: string;
  has_phone: boolean;
  phone_masked: string | null;
  /** Consentimiento efectivo: el envío real le podría escribir */
  whatsapp_consent: boolean;
  opted_out: boolean;
}

export interface ReminderTemplatePreview {
  templateName: ReminderTemplateName;
  contact: ReminderTestUser;
  /** null: el usuario no tiene actividad suficiente para esta plantilla */
  parameters: string[] | null;
  buttonUrl: string | null;
}

/**
 * Busca miembros por nombre, correo, documento o teléfono.
 * GET /reminders/organization/:organizationId/test-users?search= (solo admins)
 */
export async function searchReminderTestUsers(
  organizationId: string,
  search: string
): Promise<ReminderTestUser[]> {
  const response = await api.get<ReminderTestUser[]>(
    `/reminders/organization/${organizationId}/test-users`,
    { params: { search } }
  );
  return response.data;
}

/**
 * Arma la plantilla con los datos reales del usuario, sin enviarla.
 * POST /reminders/organization/:organizationId/test-template/preview
 */
export async function previewReminderTemplate(
  organizationId: string,
  params: { userId: string; templateName: ReminderTemplateName }
): Promise<ReminderTemplatePreview> {
  const response = await api.post<ReminderTemplatePreview>(
    `/reminders/organization/${organizationId}/test-template/preview`,
    params
  );
  return response.data;
}

/**
 * Envía un mensaje de prueba de WhatsApp usando una plantilla de recordatorio,
 * armada con la actividad del usuario en esa organización.
 * POST /reminders/organization/:organizationId/test-template (solo admins)
 */
export async function sendTestReminderTemplate(
  organizationId: string,
  params: {
    userId: string;
    templateName: ReminderTemplateName;
    to: string;
    /** Agrega ?ref=test al enlace para comprobar el seguimiento de clics */
    trackClick?: boolean;
  }
): Promise<TestReminderTemplateResult> {
  const response = await api.post<TestReminderTemplateResult>(
    `/reminders/organization/${organizationId}/test-template`,
    params
  );
  return response.data;
}
