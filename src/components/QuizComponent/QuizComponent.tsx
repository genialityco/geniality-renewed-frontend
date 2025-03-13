import { useState, useEffect } from "react";
import { Model, SurveyModel } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import "./styles/quiz.css";
import {
  changeTitle,
  convertToSurveyJson,
  getTextHtml,
} from "../../helpers/surveyHelpers";
import LoadingSpinner from "./../LoadingSpinner";
import { createQuizAttempt } from "../../services/quizAttemptService";
import { useUser } from "../../context/UserContext";

interface QuizComponentProps {
  quizJson: any; // Puede ser el objeto con { pages: [...], ... } o un array plano
  activityId: string;
  quizId: string;
}

export default function QuizComponent({
  quizJson,
  // activityId,
  quizId,
}: QuizComponentProps) {
  const { userId } = useUser(); // tu hook de usuario
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewSurvey, setReviewSurvey] = useState<Model | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  // Construye el surveyModel cada vez que cambie quizJson
  useEffect(() => {
    if (quizJson) {
      // Si quizJson es un array de { pregunta, opciones, respuestacorrecta },
      // convértelo a la estructura SurveyJS
      const finalStructure = Array.isArray(quizJson)
        ? convertToSurveyJson(quizJson)
        : quizJson;

      const model = new Model(finalStructure);
      model.onComplete.add(onSurveyComplete);

      setSurveyModel(model);
      setIsLoading(false);
    } else {
      setSurveyModel(null);
      setIsLoading(false);
    }
  }, [quizJson]);

  // Callback cuando el usuario completa el cuestionario
  const onSurveyComplete = (sendSurvey: SurveyModel) => {
    const results = sendSurvey.data;
    const totalScore = calculateTotalScore(results, sendSurvey);
    const maxScore = calculateMaxScore(sendSurvey.getAllQuestions());

    setSurveyCompleted(true);
    sendSurvey.setValue("maxScore", maxScore);
    sendSurvey.setValue("totalScore", totalScore);

    // Genera la versión “review” en modo display
    const reviewSurveyJson = sendSurvey.toJSON();
    const reviewModel = new Model(reviewSurveyJson);

    reviewModel.data = results;
    reviewModel.mode = "display";
    reviewModel.questionsOnPageMode = "singlePage";
    reviewModel.showProgressBar = "off";

    // Resaltar correctas/incorrectas
    reviewModel.onTextMarkdown.add((_, opt) => {
      const text = opt.text;
      let html = getTextHtml(text, "Correct", true);
      if (!html) html = getTextHtml(text, "Incorrect", false);
      if (html) opt.html = html;
    });

    reviewModel.onAfterRenderQuestion.add((_, options) => {
      const question = options.question;
      if (!question) return;
      const userAnswer = question.value;
      const correctAnswer = question.correctAnswer;
      const inputs = options.htmlElement.querySelectorAll<HTMLInputElement>(
        "input[type='radio']"
      );

      inputs.forEach((input) => {
        const label = input.closest("label");
        if (!label) return;
        if (question.isAnswerCorrect()) {
          if (input.value === userAnswer) {
            label.style.backgroundColor = "#e6ffe6";
            label.style.border = "2px solid green";
          }
        } else {
          if (input.value === correctAnswer) {
            label.style.backgroundColor = "#e6ffe6";
            label.style.border = "2px solid green";
          }
          if (input.value === userAnswer && userAnswer !== correctAnswer) {
            label.style.backgroundColor = "#ffe6e6";
            label.style.border = "2px solid red";
          }
        }
      });
    });

    // Ajusta título con “Correct” / “Incorrect”
    reviewModel.getAllQuestions().forEach((question) => changeTitle(question));
    setReviewSurvey(reviewModel);

    // Crear el intento en backend (QuizAttempt)
    // Solo si tienes userId y quizId (asumiendo quizJson._id es el ID del quiz en BD)
    if (userId && quizJson && quizId) {
      const attemptData = {
        quiz_id: quizId,
        user_id: userId,
        answers_data: results,
        total_score: totalScore,
        max_score: maxScore,
      };
      createQuizAttempt(attemptData)
        .then((res) => {
          console.log("QuizAttempt creado:", res);
        })
        .catch((err) => {
          console.error("Error al crear QuizAttempt:", err);
        });
    }
  };

  const handleReviewButtonClick = () => {
    setShowReview(true);
  };

  // Render
  if (isLoading) {
    return <LoadingSpinner message="Cargando quiz..." />;
  }

  return (
    <div>
      <h1>Quiz: {surveyCompleted ? "completada" : "aún sin completar"}</h1>
      {surveyModel && <Survey model={surveyModel} />}

      <div style={{ marginTop: 16 }}>
        {surveyCompleted && !reviewSurvey ? (
          <LoadingSpinner message="Procesando resultados..." />
        ) : (
          reviewSurvey &&
          !showReview && (
            <button onClick={handleReviewButtonClick}>
              Review Your Answers
            </button>
          )
        )}
      </div>

      {showReview && reviewSurvey && <Survey model={reviewSurvey} />}
    </div>
  );
}

// Funciones auxiliares
function calculateMaxScore(questions: any[]) {
  let max = 0;
  questions.forEach((q: any) => {
    max += q.score ? q.score : 1;
  });
  return max;
}

function calculateTotalScore(answers: any, survey: SurveyModel) {
  let total = 0;
  for (const qName in answers) {
    const question = survey.getQuestionByValueName(qName);
    if (!question) continue;
    if (question.isAnswerCorrect()) {
      total += question.score ? question.score : 1;
    }
  }
  return total;
}
