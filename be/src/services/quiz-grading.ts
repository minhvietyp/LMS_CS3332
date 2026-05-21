type QuizAnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuizQuestionForGrading = {
  id: string;
  text: string;
  answerOptions: QuizAnswerOption[];
};

type SubmittedQuizAnswer = {
  questionId: string;
  selectedOptionId?: string | null;
};

export type GradedQuizAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
};

export type QuizGradingResult = {
  score: number;
  isPassed: boolean;
  correctCount: number;
  totalQuestions: number;
  answers: GradedQuizAnswer[];
};

export function gradeQuizAttempt(args: {
  questions: QuizQuestionForGrading[];
  submittedAnswers: SubmittedQuizAnswer[];
  passingScore: number;
}): QuizGradingResult {
  const { questions, submittedAnswers, passingScore } = args;

  const answers = questions.map((question) => {
    const submittedAnswer = submittedAnswers.find((answer) => answer.questionId === question.id);
    const correctOption = question.answerOptions.find((option) => option.isCorrect);
    const selectedOptionId = submittedAnswer?.selectedOptionId ?? null;
    const isCorrect = Boolean(correctOption && selectedOptionId === correctOption.id);

    return {
      questionId: question.id,
      selectedOptionId,
      isCorrect,
    };
  });

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const totalQuestions = questions.length;
  const score = totalQuestions === 0 ? 0 : Number(((correctCount / totalQuestions) * 100).toFixed(2));

  return {
    score,
    isPassed: score >= passingScore,
    correctCount,
    totalQuestions,
    answers,
  };
}
