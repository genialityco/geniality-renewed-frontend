import { useState, useEffect } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import "./styles/quiz.css";
import { fetchSurveyData, changeTitle, getTextHtml } from "../../helpers/surveyHelpers";
import LoadingSpinner from "./../LoadingSpinner";

const correctStr = "Correct";
const incorrectStr = "Incorrect";

function QuizComponent() {
  const [currentSurvey, setCurrentSurvey] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewSurvey, setReviewSurvey] = useState<Model | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const survey = await fetchSurveyData();
      setCurrentSurvey(survey);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const onSurveyComplete = async (sendSurvey, options) => {
    const results = sendSurvey.data;
    console.log("results", sendSurvey);
    const totalScore = calculateTotalScore(sendSurvey.data, sendSurvey);
    const maxScore = calculateMaxScore(sendSurvey.getAllQuestions());

    setSurveyCompleted(true);

    sendSurvey.setValue("maxScore", maxScore);
    sendSurvey.setValue("totalScore", totalScore);

    const reviewSurvey = await fetchSurveyData();
    reviewSurvey.onTextMarkdown.add((_, options) => {
      const text = options.text;
      let html = getTextHtml(text, correctStr, true);
      if (!html) {
        html = getTextHtml(text, incorrectStr, false);
      }
      if (!!html) {
        options.html = html;
      }
    });
    reviewSurvey.data = results;
    reviewSurvey.mode = "display";
    reviewSurvey.questionsOnPageMode = "singlePage";
    reviewSurvey.showProgressBar = "off";

    reviewSurvey.getAllQuestions().forEach((question) => changeTitle(question));

    setReviewSurvey(reviewSurvey);
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
      {isLoading ? <LoadingSpinner /> : <Survey model={currentSurvey} />}

      <div>
        {surveyCompleted && !reviewSurvey ? (
          <LoadingSpinner message="Processing Results" />
        ) : (
          <>{reviewSurvey && !showReview && <button onClick={handleReviewButtonClick}>Review Your Answers</button>}</>
        )}
        {showReview && reviewSurvey && <Survey model={reviewSurvey} />}
      </div>
    </div>
  );
}

export default QuizComponent;

function calculateMaxScore(questions) {
  var maxScore = 0;
  questions.forEach((question) => {
    maxScore += !!question.score ? question.score : 1;
  });
  return maxScore;
}

function calculateTotalScore(answers, survey) {
  var totalScore = 0;
  Object.keys(answers).forEach((qName) => {
    const question = survey.getQuestionByValueName(qName);
    if (question.isAnswerCorrect()) {
      totalScore += !!question.score ? question.score : 1;
    }
  });
  return totalScore;
}
