import { useState, useEffect, useMemo, useCallback } from "react";
import { Model, SurveyModel } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import "./styles/quiz.css";

import {
  changeTitle,
  convertToSurveyJson,
  getTextHtml,
} from "../../helpers/surveyHelpers";

import { useUser } from "../../context/UserContext";
import LoadingSpinner from "../LoadingSpinner";
import QuizRenderer from "../QuizRenderer";
import QuizReview from "../QuizReview";
import QuizResultCard from "./QuizResultCard";

import { QuestionWithBlocks } from "../QuizEditor/types";
import { useQuizSubmit, useQuizState } from "../../hooks/useQuiz";
import { notifications } from "@mantine/notifications";
import { ERROR_MESSAGES } from "../../constants/quizConstants";

interface QuizComponentProps {
  quizJson: any; // SurveyJSON o array plano
  _quizId?: string; // no se usa para enviar nota (se deja por compatibilidad)
  eventId: string;
  onFinished?: (payload: {
    grade: number;
    totalScore: number;
    maxScore: number;
  }) => void;
}

export default function QuizComponent({
  quizJson,
  eventId,
  onFinished,
}: QuizComponentProps) {
  const { userId, name: userName, email: userEmail } = useUser();

  // Estado del quiz
  const { setSubmitted, setReviewing, isEditing, isSubmitted } = useQuizState('editing');

  // Submisión del quiz
  const { submit, result, isSubmitting } = useQuizSubmit({
    onSuccess: (scoringResult) => {
      onFinished?.({
        grade: scoringResult.grade,
        totalScore: scoringResult.totalScore,
        maxScore: scoringResult.maxScore,
      });
      setSubmitted();
    },
  });

  // Estado del survey
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});

  // Detectar si es nuevo formato
  const isNewFormat = useMemo(() => {
    if (!quizJson) return false;
    const questions = quizJson.questions || quizJson;
    if (!Array.isArray(questions) || questions.length === 0) return false;
    
    // Si las preguntas tienen "type" y sus valores son nuestros tipos de preguntas, es nuevo formato
    return questions.some((q: any) => 
      ["single-choice", "multiple-choice", "matching", "ordering"].includes(q.type)
    );
  }, [quizJson]);

  const questions: QuestionWithBlocks[] = useMemo(() => {
    if (!isNewFormat || !quizJson) return [];
    const qs = quizJson.questions || quizJson;
    return qs;
  }, [quizJson, isNewFormat]);

  const finalStructure = useMemo(() => {
    if (!quizJson || isNewFormat) return null;
    return Array.isArray(quizJson) ? convertToSurveyJson(quizJson) : quizJson;
  }, [quizJson, isNewFormat]);

  // Para formato antiguo: preparar SurveyModel
  useEffect(() => {
    if (isNewFormat) {
      setIsLoading(false);
      setSurveyModel(null);
      return;
    }

    setIsLoading(true);

    if (!finalStructure) {
      setSurveyModel(null);
      setIsLoading(false);
      return;
    }

    const model = new Model(finalStructure);

    const handler = (sender: SurveyModel) => {
      onSurveyCompleteOld(sender);
    };

    model.onComplete.add(handler);
    setSurveyModel(model);
    setIsLoading(false);

    return () => {
      model.onComplete.remove(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalStructure, isNewFormat]);

  const onSurveyCompleteOld = async (sendSurvey: SurveyModel) => {
    const results = sendSurvey.data;

    const totalScore = calculateTotalScore(results, sendSurvey);
    const maxScore = calculateMaxScore(sendSurvey.getAllQuestions());

    // ✅ Resultado (nota 0–5)
    const gradeRaw = maxScore > 0 ? (totalScore / maxScore) * 5 : 0;
    const grade = Math.round(gradeRaw * 10) / 10;

    // ✅ Review model
    const reviewSurveyJson = sendSurvey.toJSON();
    const reviewModel = new Model(reviewSurveyJson);

    reviewModel.data = results;
    reviewModel.mode = "display";
    reviewModel.questionsOnPageMode = "singlePage";
    reviewModel.showProgressBar = "off";

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
        "input[type='radio']",
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

    reviewModel.getAllQuestions().forEach((q) => changeTitle(q));

    // ✅ ENVIAR AL BACKEND (solo userId + result)
    try {
      if (!userId) throw new Error("No hay userId en contexto");
      if (!eventId) throw new Error("No hay eventId");

      onFinished?.({ grade, totalScore, maxScore });
    } catch (e: any) {
      console.error("Error enviando submitQuizResult:", e);
      console.error("Status:", e?.response?.status);
      console.error("Data:", e?.response?.data);
    }
  };

  // Manejar envío de respuestas para nuevo formato
  const handleNewFormatSubmit = useCallback(
    async (answers: Record<string, any>) => {
      if (!userId) {
        notifications.show({
          message: ERROR_MESSAGES.MISSING_USER_ID,
          color: 'red',
          autoClose: 3000,
        });
        return;
      }

      setUserAnswers(answers);
      await submit(
        eventId,
        userId,
        userName || 'Usuario',
        userEmail || userId,
        answers,
        questions
      );
    },
    [userId, userName, userEmail, eventId, questions, submit]
  );

  if (isLoading) return <LoadingSpinner message="Cargando quiz..." />;

  return (
    <div>
      {/* Después de enviar: mostrar resultado y NO permitir reenvío */}
      {isSubmitted && result && (
        <>
          <QuizResultCard
            result={result}
            isNewFormat={isNewFormat}
            onShowReview={() => setReviewing()}
          />
          
          {/* Revisión: mostrar respuestas - Nuevo formato */}
          {isNewFormat && (
            <QuizReview
              questions={result.correctAnswers}
              answers={userAnswers}
              correctAnswers={result.correctAnswers || []}
              onClose={() => setSubmitted()}
            />
          )}
        </>
      )}

      {/* Mostrar formulario SOLO si no se ha enviado */}
      {!isSubmitted && (
        <>
          {/* Nuevo formato: QuizRenderer */}
          {isNewFormat && isEditing && (
            <QuizRenderer 
              questions={questions} 
              onSubmit={handleNewFormatSubmit}
              isLoading={isSubmitting}
            />
          )}

          {/* Formato antiguo: SurveyJS */}
          {!isNewFormat && isEditing && surveyModel && (
            <Survey model={surveyModel} />
          )}
        </>
      )}
    </div>
  );
}

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
