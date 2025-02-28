// Configuración del cuestionario
export const quizConfig = {
  title: "Quiz",
  showQuestionNumbers: "off",
  showTimer: true,
  timeLimitPerPage: 60,
  timeLimit: 60
};

// Mensajes tras completar el cuestionario
export const quizResults = [
  {
    // Si el puntaje total > 14...
    expression: "{totalScore} > 14",
    html: "Obtuviste {totalScore} de {maxScore} puntos.</br></br>¡Felicidades! ¡Lo hiciste excelente!"
  },
  {
    // Si el puntaje total > 7...
    expression: "{totalScore} > 7",
    html: "Obtuviste {totalScore} de {maxScore} puntos.</br></br>¡Bien hecho! <i>Tu constancia determina tu éxito.</i> Continúa así."
  },
  {
    // Si el puntaje total <= 7...
    expression: "{totalScore} <= 7",
    html: "Obtuviste {totalScore} de {maxScore} puntos.</br></br><i>En mi experiencia</i>, como diría Obi-Wan Kenobi, <i>“la suerte no existe”.</i> ¡Sigue practicando!"
  }
];

// Preguntas del cuestionario
export const quizQuestions = [
  {
    elements: [
      {
        type: "radiogroup",
        name: "presidents",
        title: "¿Quién fue el primer presidente de los Estados Unidos?",
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
        title: "¿En qué año se firmó la Declaración de Independencia de Estados Unidos?",
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
        title: "¿En qué año se ratificó la Constitución de los Estados Unidos?",
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

// Exportar el cuestionario completo
export const json = {
  ...quizConfig,
  completedHtmlOnCondition: quizResults,
  pages: quizQuestions
};
