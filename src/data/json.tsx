// Quiz configuration
export const quizConfig = {
  title: "History Quiz",
  showQuestionNumbers: "off",
  showTimer: true,
  timeLimitPerPage: 10,
  timeLimit: 25
};

// Quiz results
export const quizResults = [
  {
    expression: "{totalScore} > 14",
    html: "You got {totalScore} out of {maxScore} points.</br></br>Congratulation! You did great!"
  },
  {
    expression: "{totalScore} > 7",
    html: "You got {totalScore} out of {maxScore} points.</br></br>Well Done! <i>Your focus determines your reality.</i> And this is the way you passed the quiz."
  },
  {
    expression: "{totalScore} <= 7",
    html: "You got {totalScore} out of {maxScore} points.</br></br><i>In my experience</i>, as Obi-Wan Kenobi said, <i>there's no such thing as luck.</i>"
  }
];

// Quiz questions
export const quizQuestions = [
  {
    elements: [
      {
        type: "radiogroup",
        name: "presidents",
        title: "Who was the first US President?",
        correctAnswer: "George Washington",
        choices: [
          "Thomas Jefferson",
          "George Washington",
          "John Adams",
          "Benjamin Franklin"
        ]
      },
      {
        type: "radiogroup",
        name: "independence",
        title: "In which year was the Declaration of Independence signed?",
        correctAnswer: "1776",
        choices: [
          "1774",
          "1775",
          "1776",
          "1777"
        ]
      },
      {
        type: "radiogroup",
        name: "constitution",
        title: "When was the US Constitution ratified?",
        correctAnswer: "1788",
        choices: [
          "1785",
          "1786",
          "1787",
          "1788"
        ]
      }
    ]
  }
];

// Export the complete quiz
export const json = {
  ...quizConfig,
  completedHtmlOnCondition: quizResults,
  pages: quizQuestions
};
