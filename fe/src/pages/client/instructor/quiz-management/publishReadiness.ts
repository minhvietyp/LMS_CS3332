import type { QuizListItem, QuizQuestion } from '../../../../services/api/quizApi';

export type QuizPublishReadiness = {
  canPublish: boolean;
  label: 'Missing questions' | 'Question validation required' | 'Ready to publish';
  color: 'default' | 'gold' | 'green';
  issues: string[];
};

export function getQuestionPublishIssues(question: QuizQuestion): string[] {
  const issues: string[] = [];
  const correctOptions = question.answerOptions.filter((option) => option.isCorrect);

  if (correctOptions.length !== 1) {
    issues.push('requires exactly one correct answer');
  }

  if (question.type === 'TRUE_FALSE' && question.answerOptions.length !== 2) {
    issues.push('true/false questions need exactly two options');
  }

  return issues;
}

export function getQuizPublishReadiness(quiz: QuizListItem): QuizPublishReadiness {
  if (quiz.questions.length === 0) {
    return {
      canPublish: false,
      label: 'Missing questions',
      color: 'default',
      issues: ['Add at least one question before publishing.'],
    };
  }

  const questionIssues = quiz.questions.flatMap((question, index) =>
    getQuestionPublishIssues(question).map((issue) => `Question ${index + 1} ${issue}.`),
  );

  if (questionIssues.length > 0) {
    return {
      canPublish: false,
      label: 'Question validation required',
      color: 'gold',
      issues: questionIssues,
    };
  }

  return {
    canPublish: true,
    label: 'Ready to publish',
    color: 'green',
    issues: [],
  };
}

