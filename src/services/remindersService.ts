import api from "./api";

export type ReminderTemplateName =
  | "recordatorio_inactividad_3dias"
  | "reporte_semanal_progreso"
  | "ranking_lider_curso"
  | "ranking_comparativo_curso";

export interface TestReminderTemplateResult {
  result: "sent" | "fallback_email";
  templateName: ReminderTemplateName;
  parameters: string[];
}

/**
 * Lista los nombres de plantillas de recordatorio disponibles.
 * GET /reminders/templates
 */
export async function fetchReminderTemplateNames(): Promise<
  ReminderTemplateName[]
> {
  const response = await api.get<ReminderTemplateName[]>(
    "/reminders/templates"
  );
  return response.data;
}

/**
 * Envía un mensaje de prueba de WhatsApp usando una plantilla de recordatorio.
 * POST /reminders/test-template
 */
export async function sendTestReminderTemplate(params: {
  userId: string;
  templateName: ReminderTemplateName;
  to: string;
}): Promise<TestReminderTemplateResult> {
  const response = await api.post<TestReminderTemplateResult>(
    "/reminders/test-template",
    params
  );
  return response.data;
}
