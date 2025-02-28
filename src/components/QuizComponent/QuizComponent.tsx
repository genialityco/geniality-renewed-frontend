import { useState, useEffect } from "react";
import { Model, SurveyModel } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import "./styles/quiz.css";
import {
  fetchSurveyData,
  changeTitle,
  getTextHtml,
} from "../../helpers/surveyHelpers";
import LoadingSpinner from "./../LoadingSpinner";

function QuizComponent({ transcript }: {transcript: string | undefined}) {
  const [currentSurvey, setCurrentSurvey] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewSurvey, setReviewSurvey] = useState<Model | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetchSurveyData(transcript);
      setCurrentSurvey(response as Model);
      setIsLoading(false);
    };
    fetchData();
  }, [transcript]);

  const onSurveyComplete = (sendSurvey: SurveyModel) => {
    const results = sendSurvey.data;
    const totalScore = calculateTotalScore(sendSurvey.data, sendSurvey);
    const maxScore = calculateMaxScore(sendSurvey.getAllQuestions());
  
    setSurveyCompleted(true);
    sendSurvey.setValue("maxScore", maxScore);
    sendSurvey.setValue("totalScore", totalScore);
  
    // Clonamos el JSON del survey actual para no volver a llamar a la IA
    const reviewSurveyJson = sendSurvey.toJSON();
    const reviewModel = new Model(reviewSurveyJson);
  
    reviewModel.data = results;
    reviewModel.mode = "display";
    reviewModel.questionsOnPageMode = "singlePage";
    reviewModel.showProgressBar = "off";
  
    // Opción 1: usar onTextMarkdown (si quieres resaltar palabras específicas en el texto)
    reviewModel.onTextMarkdown.add((_, opt) => {
      const text = opt.text;
      let html = getTextHtml(text, "Correct", true);
      if (!html) {
        html = getTextHtml(text, "Incorrect", false);
      }
      if (html) {
        opt.html = html;
      }
    });
  
    // Opción 2: usar onAfterRenderQuestion para marcar visualmente la respuesta correcta
    reviewModel.onAfterRenderQuestion.add(( opt) => {
      const question = opt.question;
      // Sólo si el usuario se equivocó
      if (!question.isAnswerCorrect()) {
        // Encuentra el valor correcto
        const correctValue = question.correctAnswer;
  
        // Asumiendo que la pregunta es type "radiogroup" (o "checkbox")
        // y que en la interfaz generada el <input> tiene `value="{opcion}"`.
        const inputs = opt.htmlElement.querySelectorAll("input[type='radio']");
        inputs.forEach((input: { value: any; closest: (arg0: string) => any; }) => {
          if (input.value === correctValue) {
            // Tomamos el label contenedor y le aplicamos algún estilo
            const label = input.closest("label");
            if (label) {
              label.style.backgroundColor = "#e6ffe6";
              label.style.border = "2px solid green";
              // Puedes añadir o remover clases CSS según tu preferencia
              // label.classList.add("highlight-correct-answer");
            }
          }
        });
      }
    });
  
    // (Opcional) Ajustar el título para poner “Correct/Incorrect”
    reviewModel.getAllQuestions().forEach((question) => changeTitle(question));
  
    setReviewSurvey(reviewModel);
  };
  

  useEffect(() => {
    if (currentSurvey) {
      currentSurvey.onComplete.add(onSurveyComplete);
    }
  }, [currentSurvey]);

  const handleReviewButtonClick = () => {
    setShowReview(true);
  };

  return (
    <div>
      <h1>Quiz: {surveyCompleted ? "completada" : "aun sin completar"}</h1>
      {isLoading ? <LoadingSpinner message="Generando quiz" /> : <Survey model={currentSurvey} />}

      <div>
        {surveyCompleted && !reviewSurvey ? (
          <LoadingSpinner message="Processing Results" />
        ) : (
          <>
            {reviewSurvey && !showReview && (
              <button onClick={handleReviewButtonClick}>
                Review Your Answers
              </button>
            )}
          </>
        )}
        {showReview && reviewSurvey && <Survey model={reviewSurvey} />}
      </div>
    </div>
  );
}

export default QuizComponent;

function calculateMaxScore(questions: any[]) {
  var maxScore = 0;
  questions.forEach((question: { score: any; }) => {
    maxScore += !!question.score ? question.score : 1;
  });
  return maxScore;
}

function calculateTotalScore(answers: {}, survey: Model) {
  var totalScore = 0;
  Object.keys(answers).forEach((qName) => {
    const question = survey.getQuestionByValueName(qName);
    if (question.isAnswerCorrect()) {
      totalScore += !!question.score ? question.score : 1;
    }
  });
  return totalScore;
}
