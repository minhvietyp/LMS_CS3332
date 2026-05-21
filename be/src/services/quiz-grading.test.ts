import { describe, expect, it } from 'vitest';
import { gradeQuizAttempt } from './quiz-grading';

describe('gradeQuizAttempt', () => {
  const questions = [
    {
      id: 'question-1',
      text: 'What is React?',
      answerOptions: [
        { id: 'option-1', text: 'A library', isCorrect: true },
        { id: 'option-2', text: 'A database', isCorrect: false },
      ],
    },
    {
      id: 'question-2',
      text: 'JSX is JavaScript syntax?',
      answerOptions: [
        { id: 'option-3', text: 'True', isCorrect: true },
        { id: 'option-4', text: 'False', isCorrect: false },
      ],
    },
  ];

  it('returns full score when every answer is correct', () => {
    const result = gradeQuizAttempt({
      questions,
      passingScore: 70,
      submittedAnswers: [
        { questionId: 'question-1', selectedOptionId: 'option-1' },
        { questionId: 'question-2', selectedOptionId: 'option-3' },
      ],
    });

    expect(result.score).toBe(100);
    expect(result.isPassed).toBe(true);
    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(2);
  });

  it('returns partial score and fail state when some answers are wrong', () => {
    const result = gradeQuizAttempt({
      questions,
      passingScore: 70,
      submittedAnswers: [
        { questionId: 'question-1', selectedOptionId: 'option-1' },
        { questionId: 'question-2', selectedOptionId: 'option-4' },
      ],
    });

    expect(result.score).toBe(50);
    expect(result.isPassed).toBe(false);
    expect(result.correctCount).toBe(1);
  });

  it('treats unanswered questions as incorrect', () => {
    const result = gradeQuizAttempt({
      questions,
      passingScore: 50,
      submittedAnswers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    });

    expect(result.score).toBe(50);
    expect(result.answers[1]).toEqual({
      questionId: 'question-2',
      selectedOptionId: null,
      isCorrect: false,
    });
  });

  it('marks the attempt as passed when the score matches the passing threshold exactly', () => {
    const result = gradeQuizAttempt({
      questions,
      passingScore: 50,
      submittedAnswers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    });

    expect(result.score).toBe(50);
    expect(result.isPassed).toBe(true);
  });
});
