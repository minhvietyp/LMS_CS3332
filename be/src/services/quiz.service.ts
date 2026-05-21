import prisma from '@config/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '@shared/errors/AppError';
import { Quiz, QuizAttempt, Prisma } from '@prisma/client';
import { pickDefined } from '@shared/utils/helpers';
import { QUESTION_TYPE, USER_ROLES } from '@shared/constants';
import { gradeQuizAttempt } from './quiz-grading';

export class QuizService {
  async listStudentCourseQuizzes(courseId: string, studentId: string) {
    await this.ensureStudentEnrollment(courseId, studentId);

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId,
        isPublished: true,
      },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      quizzes.map(async (quiz) => {
        const attemptsUsed = await prisma.quizAttempt.count({
          where: {
            quizId: quiz.id,
            studentId,
          },
        });

        return {
          id: quiz.id,
          courseId: quiz.courseId,
          title: quiz.title,
          description: quiz.description,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
          isPublished: quiz.isPublished,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt,
          questionCount: quiz.questions.length,
          attemptsUsed,
          attemptsRemaining: this.getAttemptsRemaining(quiz.maxAttempts, attemptsUsed),
        };
      }),
    );
  }

  async getStudentQuizDetail(quizId: string, studentId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!quiz || !quiz.isPublished) throw NotFoundError('Quiz not found');
    if (!quiz.courseId) throw BadRequestError('Quiz is not attached to a course');

    await this.ensureStudentEnrollment(quiz.courseId, studentId);

    const attemptsUsed = await prisma.quizAttempt.count({
      where: {
        quizId,
        studentId,
      },
    });

    return {
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
      description: quiz.description,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      isPublished: quiz.isPublished,
      attemptsUsed,
      attemptsRemaining: this.getAttemptsRemaining(quiz.maxAttempts, attemptsUsed),
      questions: quiz.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type,
        orderIndex: question.orderIndex,
        answerOptions: question.answerOptions.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    };
  }

  async listByCourse(courseId: string, userId: string, userRole: string) {
    await this.checkCourseOwnership(courseId, userId, userRole);

    return prisma.quiz.findMany({
      where: { courseId },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
        attempts: {
          select: {
            id: true,
            score: true,
            isPassed: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(id: string, userId: string, userRole: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
        attempts: {
          select: {
            id: true,
            score: true,
            isPassed: true,
            submittedAt: true,
          },
        },
      },
    });

    if (!quiz) throw NotFoundError('Quiz not found');
    if (quiz.courseId) {
      await this.checkCourseOwnership(quiz.courseId, userId, userRole);
    }

    return quiz;
  }

  async create(data: any, instructorId: string, userRole: string): Promise<Quiz> {
    if (data.courseId) {
      await this.checkCourseOwnership(data.courseId, instructorId, userRole);
    }
    return prisma.quiz.create({ data });
  }

  async update(id: string, data: any, userId: string, userRole: string): Promise<Quiz> {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw NotFoundError('Quiz not found');
    if (quiz.courseId) await this.checkCourseOwnership(quiz.courseId, userId, userRole);

    return prisma.quiz.update({
      where: { id },
      data: pickDefined(data),
    });
  }

  async setPublishedState(id: string, isPublished: boolean, userId: string, userRole: string): Promise<Quiz> {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
        },
      },
    });
    if (!quiz) throw NotFoundError('Quiz not found');
    if (quiz.courseId) await this.checkCourseOwnership(quiz.courseId, userId, userRole);

    if (isPublished) {
      if (quiz.questions.length === 0) {
        throw BadRequestError('Quiz must contain at least one question before publishing');
      }

      for (const question of quiz.questions) {
        const correctOptions = question.answerOptions.filter((option) => option.isCorrect);
        if (correctOptions.length !== 1) {
          throw BadRequestError('Each question must have exactly one correct answer before publishing');
        }

        if (question.type === QUESTION_TYPE.TRUE_FALSE && question.answerOptions.length !== 2) {
          throw BadRequestError('True/false questions must contain exactly two options before publishing');
        }
      }
    }

    return prisma.quiz.update({
      where: { id },
      data: { isPublished },
    });
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw NotFoundError('Quiz not found');
    if (quiz.courseId) await this.checkCourseOwnership(quiz.courseId, userId, userRole);

    await prisma.quiz.delete({ where: { id } });
  }

  async addQuestion(quizId: string, data: any, userId: string, userRole: string) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw NotFoundError('Quiz not found');
    if (quiz.courseId) await this.checkCourseOwnership(quiz.courseId, userId, userRole);
    if (quiz.isPublished) throw BadRequestError('Unpublish the quiz before editing questions');

    const { options, ...questionData } = data;
    const nextOrderIndex = questionData.orderIndex ?? (await prisma.question.count({ where: { quizId } }));

    return prisma.question.create({
      data: {
        ...questionData,
        quizId,
        orderIndex: nextOrderIndex,
        answerOptions: {
          create: options,
        },
      },
      include: { answerOptions: true },
    });
  }

  async updateQuestion(questionId: string, data: any, userId: string, userRole: string) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) throw NotFoundError('Question not found');
    if (question.quiz.courseId) await this.checkCourseOwnership(question.quiz.courseId, userId, userRole);
    if (question.quiz.isPublished) throw BadRequestError('Unpublish the quiz before editing questions');

    const { options, ...questionData } = data;

    return prisma.$transaction(async (tx) => {
      const updatedQuestion = await tx.question.update({
        where: { id: questionId },
        data: pickDefined(questionData),
      });

      if (options) {
        await tx.answerOption.deleteMany({ where: { questionId } });
        await tx.answerOption.createMany({
          data: options.map((option: { text: string; isCorrect: boolean }) => ({
            questionId,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        });
      }

      return tx.question.findUnique({
        where: { id: updatedQuestion.id },
        include: { answerOptions: true },
      });
    });
  }

  async deleteQuestion(questionId: string, userId: string, userRole: string): Promise<void> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) throw NotFoundError('Question not found');
    if (question.quiz.courseId) await this.checkCourseOwnership(question.quiz.courseId, userId, userRole);
    if (question.quiz.isPublished) throw BadRequestError('Unpublish the quiz before removing questions');

    await prisma.question.delete({ where: { id: questionId } });
  }

  // ─── Student Operations ───────────────────────────────────────────────────

  async startAttempt(quizId: string, studentId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz || !quiz.isPublished) throw NotFoundError('Quiz not found');
    if (!quiz.courseId) throw BadRequestError('Quiz is not attached to a course');

    await this.ensureStudentEnrollment(quiz.courseId, studentId);

    const attemptCount = await prisma.quizAttempt.count({ where: { quizId, studentId } });
    if (this.getAttemptsRemaining(quiz.maxAttempts, attemptCount) <= 0) {
      throw BadRequestError('Maximum attempts reached');
    }

    return prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        attemptNumber: attemptCount + 1,
      },
    });
  }

  async listStudentAttempts(quizId: string, studentId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz || !quiz.isPublished) throw NotFoundError('Quiz not found');
    if (!quiz.courseId) throw BadRequestError('Quiz is not attached to a course');

    await this.ensureStudentEnrollment(quiz.courseId, studentId);

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        studentId,
      },
      orderBy: { attemptNumber: 'desc' },
    });

    return attempts.map((attempt) => ({
      ...attempt,
      status: attempt.submittedAt ? (attempt.isPassed ? 'PASSED' : 'FAILED') : 'STARTED',
    }));
  }

  async getAttemptResult(quizId: string, attemptId: string, studentId: string) {
    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        quizId,
        studentId,
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                answerOptions: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) throw NotFoundError('Quiz attempt not found');

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      isPassed: attempt.isPassed,
      submittedAt: attempt.submittedAt,
      correctCount: attempt.answers.filter((answer) => answer.isCorrect).length,
      totalQuestions: attempt.quiz.questions.length,
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        passingScore: attempt.quiz.passingScore,
      },
      answers: attempt.quiz.questions.map((question) => {
        const submittedAnswer = attempt.answers.find((answer) => answer.questionId === question.id);
        const correctOption = question.answerOptions.find((option) => option.isCorrect);
        const selectedOption = question.answerOptions.find((option) => option.id === submittedAnswer?.selectedOptionId);

        return {
          questionId: question.id,
          questionText: question.text,
          selectedOptionId: submittedAnswer?.selectedOptionId ?? null,
          selectedOptionText: selectedOption?.text ?? null,
          correctOptionId: correctOption?.id ?? null,
          correctOptionText: correctOption?.text ?? null,
          isCorrect: submittedAnswer?.isCorrect ?? false,
        };
      }),
    };
  }

  async submit(quizId: string, attemptId: string, studentId: string, answers: any[]): Promise<QuizAttempt> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { answerOptions: true } } },
    });

    if (!quiz || !quiz.isPublished) throw NotFoundError('Quiz not found');

    if (quiz.courseId) {
      await this.ensureStudentEnrollment(quiz.courseId, studentId);
    }

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        quizId,
        studentId,
      },
    });
    if (!attempt) throw NotFoundError('Quiz attempt not found');
    if (attempt.submittedAt) throw BadRequestError('Quiz attempt has already been submitted');
    if (quiz.questions.length === 0) throw BadRequestError('Quiz does not contain any questions');

    const questionMap = new Map(quiz.questions.map((question) => [question.id, question]));
    const submittedQuestionIds = new Set<string>();

    for (const answer of answers) {
      if (submittedQuestionIds.has(answer.questionId)) {
        throw BadRequestError('Duplicate answers for the same question are not allowed');
      }

      submittedQuestionIds.add(answer.questionId);

      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw BadRequestError('Submitted question does not belong to this quiz');
      }

      const selectedOption = question.answerOptions.find((option) => option.id === answer.selectedOptionId);
      if (!selectedOption) {
        throw BadRequestError('Submitted answer option does not belong to the specified question');
      }
    }

    const gradingResult = gradeQuizAttempt({
      questions: quiz.questions,
      submittedAnswers: answers,
      passingScore: quiz.passingScore,
    });

    const attemptAnswersData: Prisma.QuizAttemptAnswerCreateManyAttemptInput[] = gradingResult.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
    }));

    return prisma.quizAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        score: gradingResult.score,
        isPassed: gradingResult.isPassed,
        submittedAt: new Date(),
        answers: {
          create: attemptAnswersData,
        },
      },
    });
  }

  private async checkCourseOwnership(courseId: string, userId: string, userRole: string): Promise<void> {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw NotFoundError('Course not found');
    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('Access denied');
    }
  }

  private async ensureStudentEnrollment(courseId: string, studentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });

    if (!enrollment) {
      throw ForbiddenError('Not enrolled in this course');
    }
  }

  private getAttemptsRemaining(maxAttempts: number, attemptsUsed: number) {
    return Math.max(maxAttempts - attemptsUsed, 0);
  }
}
