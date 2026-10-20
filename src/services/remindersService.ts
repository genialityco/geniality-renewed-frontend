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
  }
): Promise<TestReminderTemplateResult> {
  const response = await api.post<TestReminderTemplateResult>(
    `/reminders/organization/${organizationId}/test-template`,
    params
  );
  return response.data;
}
