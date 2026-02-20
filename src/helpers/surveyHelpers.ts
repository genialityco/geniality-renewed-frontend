import { Model, Question } from "survey-core";
import { quizConfig, quizResults } from "../data/json";
import { generateQuestionnaire } from "../services/questionnaireService";
import { ContentBlock, TextBlock } from "../components/QuizEditor/types";

const correctStr = "Correct";
const incorrectStr = "Incorrect";

export const fetchSurveyData = async (transcript: string | undefined) => {
  try {
    if (!transcript) return
    // 1. Llamamos a la IA para obtener las preguntas
    const response = await generateQuestionnaire(transcript);

    // 2. Intentamos parsear como JSON; si falla, asumimos que ya es un array
    let questions;
    try {
      questions = JSON.parse(response);
    } catch {
      questions = response;
    }

    // 3. Convertimos ese array en la estructura SurveyJS
    const surveyJson = convertToSurveyJson(questions);

    // 4. Creamos el Model de SurveyJS
    const survey = new Model(surveyJson);

    return survey;
  } catch (error) {
    console.error("Error fetching survey data:", error);
    return null;
  }
};

export const changeTitle = (q: Question) => {
  if (!q) return;

  const isCorrect = q.isAnswerCorrect();
  if (!q.prevTitle) {
    q.prevTitle = q.title;
  }
  q.title = q.prevTitle + " - " + (isCorrect ? correctStr : incorrectStr);
};

export function getTextHtml(text: string, str: string, isCorrect: boolean) {
  if (text.indexOf(str) < 0) return undefined;

  return (
    text.substring(0, text.indexOf(str)) +
    "<span class='" +
    (isCorrect ? "correctAnswer" : "incorrectAnswer") +
    "'>" +
    str +
    "</span>"
  );
}

/**
 * Extrae texto de un array de bloques de contenido
 */
function extractTextFromBlocks(blocks: ContentBlock[]): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  
  return blocks
    .filter((block) => block.type === "text")
    .map((block) => (block as TextBlock).content)
    .join("\n");
}

/**
 * Obtiene el título de una pregunta (soporta tanto estructura antigua como nueva)
 */
function getQuestionTitle(q: any): string {
  // Nueva estructura con bloques
  if (q.blocks && Array.isArray(q.blocks)) {
    return extractTextFromBlocks(q.blocks);
  }
  
  // Estructura antigua con pregunta string
  if (q.pregunta && typeof q.pregunta === "string") {
    return q.pregunta;
  }
  
  return "";
}

/**
 * Obtiene el texto de una opción (soporta tanto estructura antigua como nueva)
 */
function getOptionText(option: any): string {
  // Nueva estructura con bloques
  if (option.blocks && Array.isArray(option.blocks)) {
    return extractTextFromBlocks(option.blocks);
  }
  
  // Estructura antigua simple (string)
  if (typeof option === "string") {
    return option;
  }
  
  // Si la opción tiene propiedades como { text: "", blocks: [] }
  if (option.text && typeof option.text === "string") {
    return option.text;
  }
  
  return "";
}

/**
 * Convierte el arreglo de preguntas que devuelve `generateQuestionnaire` en
 * un objeto JSON que entiende SurveyJS.
 * Soporta ambas estructuras: antigua (q.pregunta) y nueva (q.blocks)
 */
export function convertToSurveyJson(questions: any[]) {
  return {
    // Puedes fusionar la config de tu quizConfig si lo deseas:
    ...quizConfig,
    completedHtmlOnCondition: quizResults,
    // Armamos las páginas
    pages: [
      {
        elements: questions.map((q: any, index: number) => {
          const title = getQuestionTitle(q);
          
          // Procesar opciones (pueden ser strings o objetos con bloques)
          let choices: any[] = [];
          if (q.opciones && Array.isArray(q.opciones)) {
            choices = q.opciones.map((opt: any) => getOptionText(opt));
          }
          
          // Obtener respuesta correcta
          let correctAnswer: any = undefined;
          if (q.opciones && q.respuestacorrecta !== undefined) {
            correctAnswer = getOptionText(q.opciones[q.respuestacorrecta]);
          }
          
          return {
            type: "radiogroup",
            // Nombre único por pregunta
            name: `question${index + 1}`,
            // Título tomado de la estructura nueva o antigua
            title: title || `Pregunta ${index + 1}`,
            // Arreglo con las opciones (ahora solo texto)
            choices,
            // Respuesta correcta
            correctAnswer,
          };
        }),
      },
    ],
  };
}
