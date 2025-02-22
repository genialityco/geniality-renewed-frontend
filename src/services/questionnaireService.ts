import api from "./api";

/**
 * Envía la transcripción al backend para generar el cuestionario
 * @param transcript Texto transcrito (ej. de un video)
 * @returns El cuestionario generado (podría ser string o JSON, ajusta según tu respuesta)
 */
export const generateQuestionnaire = async (
  transcript: string
): Promise<any> => {
  const response = await api.post<any>("/questionnaire", { transcript });
  return response.data;
};
