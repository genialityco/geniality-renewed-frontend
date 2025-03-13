import { Model } from "survey-core";
import { json } from "../components/QuizComponent/json";

const correctStr = "Correct";
const incorrectStr = "Incorrect";

export const fetchSurveyData = async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const survey = new Model(json);
    return survey;
  } catch (error) {
    console.error("Error fetching survey data:", error);
    return null;
  }
};

export const changeTitle = (q: { isAnswerCorrect: () => any; prevTitle: string; title: string; }) => {
  if (!q) return;

  const isCorrect = q.isAnswerCorrect();
  if (!q.prevTitle) {
    q.prevTitle = q.title;
  }
  q.title = q.prevTitle + " - " + (isCorrect ? correctStr : incorrectStr);
};

export function getTextHtml(text: string, str: string, isCorrect: any) {
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
