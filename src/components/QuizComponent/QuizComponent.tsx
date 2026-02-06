import { useState, useEffect, useMemo } from "react";
import { Model, SurveyModel } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import "./styles/quiz.css";

import {
  changeTitle,
  convertToSurveyJson,
  getTextHtml,
} from "../../helpers/surveyHelpers";

import { submitQuizResult } from "../../services/quizService"; // ✅ ESTE
import { useUser } from "../../context/UserContext";
import LoadingSpinner from "../LoadingSpinner";

import { Card, Text, Button, Group } from "@mantine/core";

interface QuizComponentProps {
  quizJson: any; // SurveyJSON o array plano
  quizId: string; // no se usa para enviar nota (se deja por compatibilidad)
  eventId: string; // ✅ necesario
  onFinished?: (payload: {
    grade: number;
    totalScore: number;
    maxScore: number;
  }) => void;
}

export default function QuizComponent({
  quizJson,
  quizId, // eslint-disable-line @typescript-eslint/no-unused-vars
  eventId,
  onFinished,
}: QuizComponentProps) {
  const { userId } = useUser();

  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [reviewSurvey, setReviewSurvey] = useState<Model | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  const [resultSummary, setResultSummary] = useState<{
    totalScore: number;
    maxScore: number;
    grade: number;
  } | null>(null);

  const finalStructure = useMemo(() => {
    if (!quizJson) return null;
    return Array.isArray(quizJson) ? convertToSurveyJson(quizJson) : quizJson;
  }, [quizJson]);

  useEffect(() => {
    setIsLoading(true);

    if (!finalStructure) {
      setSurveyModel(null);
      setIsLoading(false);
      return;
    }

    const model = new Model(finalStructure);

    const handler = (sender: SurveyModel) => {
      onSurveyComplete(sender);
    };

    model.onComplete.add(handler);
    setSurveyModel(model);
    setIsLoading(false);

    return () => {
      model.onComplete.remove(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalStructure]);

  const onSurveyComplete = async (sendSurvey: SurveyModel) => {
    const results = sendSurvey.data;
    setSurveyCompleted(true);

    const totalScore = calculateTotalScore(results, sendSurvey);
    const maxScore = calculateMaxScore(sendSurvey.getAllQuestions());

    // ✅ Resultado (nota 0–5)
    const gradeRaw = maxScore > 0 ? (totalScore / maxScore) * 5 : 0;
    const grade = Math.round(gradeRaw * 10) / 10;

    setResultSummary({ totalScore, maxScore, grade });

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
    setReviewSurvey(reviewModel);

    // ✅ ENVIAR AL BACKEND (solo userId + result)
    try {
      if (!userId) throw new Error("No hay userId en contexto");
      if (!eventId) throw new Error("No hay eventId");

      // 🔥 Body: { userId, result }
      await submitQuizResult(eventId, userId, grade);

      onFinished?.({ grade, totalScore, maxScore });
    } catch (e: any) {
      console.error("Error enviando submitQuizResult:", e);
      console.error("Status:", e?.response?.status);
      console.error("Data:", e?.response?.data);
    }
  };

  if (isLoading) return <LoadingSpinner message="Cargando quiz..." />;

  return (
    <div>
      {surveyCompleted && resultSummary && (
        <Card withBorder radius="md" p="md" mb="md">
          <Text fw={700}>Resultado</Text>
          <Text size="sm">
            Puntaje: {resultSummary.totalScore} / {resultSummary.maxScore}
          </Text>
          <Text size="lg" fw={800}>
            Nota: {resultSummary.grade} / 5.0
          </Text>

          <Group mt="sm">
            {!showReview && reviewSurvey && (
              <Button variant="light" onClick={() => setShowReview(true)}>
                Ver revisión
              </Button>
            )}
          </Group>
        </Card>
      )}

      {!surveyCompleted && surveyModel && <Survey model={surveyModel} />}
      {showReview && reviewSurvey && <Survey model={reviewSurvey} />}
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
