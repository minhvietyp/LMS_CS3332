import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import {
  courseIdParamsSchema,
  createQuizSchema,
  createQuestionSchema,
  questionIdParamsSchema,
  quizAttemptResultParamsSchema,
  quizIdParamsSchema,
  submitQuizSchema,
  updateQuestionSchema,
  updateQuizSchema,
} from '../validators/quiz.validator';
import { USER_ROLES } from '@shared/constants';

const router = Router();
const quizController = new QuizController();

// ─── Instructor Management ────────────────────────────────────────────────
router.get(
  '/courses/:courseId',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(courseIdParamsSchema, 'params'),
  asyncHandler(quizController.listByCourse),
);

router.get(
  '/:id',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.getById),
);

router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(createQuizSchema),
  asyncHandler(quizController.create),
);

router.patch(
  '/:id',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(quizIdParamsSchema, 'params'),
  validate(updateQuizSchema),
  asyncHandler(quizController.update),
);

router.post(
  '/:id/publish',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.publish),
);

router.post(
  '/:id/unpublish',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.unpublish),
);

router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.delete),
);

router.post(
  '/:id/questions',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(quizIdParamsSchema, 'params'),
  validate(createQuestionSchema),
  asyncHandler(quizController.addQuestion),
);

router.patch(
  '/questions/:questionId',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(questionIdParamsSchema, 'params'),
  validate(updateQuestionSchema),
  asyncHandler(quizController.updateQuestion),
);

router.delete(
  '/questions/:questionId',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(questionIdParamsSchema, 'params'),
  asyncHandler(quizController.deleteQuestion),
);

// ─── Student Operations ───────────────────────────────────────────────────
router.get(
  '/courses/:courseId/student',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(courseIdParamsSchema, 'params'),
  asyncHandler(quizController.listStudentCourseQuizzes),
);

router.get(
  '/:id/student',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.getStudentQuizDetail),
);

router.get(
  '/:id/attempts/me',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.listStudentAttempts),
);

router.get(
  '/:id/results/:attemptId',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(quizAttemptResultParamsSchema, 'params'),
  asyncHandler(quizController.getAttemptResult),
);

router.post(
  '/:id/attempts/start',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(quizIdParamsSchema, 'params'),
  asyncHandler(quizController.startAttempt),
);

router.post(
  '/:id/submit',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(quizIdParamsSchema, 'params'),
  validate(submitQuizSchema),
  asyncHandler(quizController.submit),
);

export { router as quizzesRouter };
