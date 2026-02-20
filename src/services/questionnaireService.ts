/**
 * Questionnaire Service
 * Servicio para generar cuestionarios mediante IA
 */

import api from "./api";

/**
 * Genera un cuestionario basado en un transcript
 */
export const generateQuestionnaire = async (
  transcript: string
): Promise<any> => {
  try {
    const response = await api.post("/generate-questionnaire", {
      transcript,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error generating questionnaire:", error);
    throw error;
  }
};
