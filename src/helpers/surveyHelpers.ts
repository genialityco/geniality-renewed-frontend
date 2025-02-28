import { Model, Question } from "survey-core";
import { quizConfig, quizResults } from "../data/json";
import { generateQuestionnaire } from "../services/questionnaireService";

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
 * Convierte el arreglo de preguntas que devuelve `generateQuestionnaire` en
 * un objeto JSON que entiende SurveyJS.
 */
function convertToSurveyJson(questions: any[]) {
  return {
    // Puedes fusionar la config de tu quizConfig si lo deseas:
    ...quizConfig,
    completedHtmlOnCondition: quizResults,
    // Armamos las páginas
    pages: [
      {
        elements: questions.map((q: { pregunta: any; opciones: { [x: string]: any; }; respuestacorrecta: string | number; }, index: number) => {
          return {
            type: "radiogroup",
            // Nombre único por pregunta
            name: `question${index + 1}`,
            // Título tomado de tu propiedad `pregunta`
            title: q.pregunta,
            // Arreglo con las 4 opciones
            choices: q.opciones,
            // En SurveyJS la respuesta correcta debe ser el *texto* de la opción correcta,
            // es decir `opciones[respuestacorrecta]`
            correctAnswer: q.opciones[q.respuestacorrecta],
          };
        }),
      },
    ],
  };
}
