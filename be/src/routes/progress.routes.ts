import { Router } from 'express';
import { ProgressController } from '../controllers/progress.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import {
  markLessonCompleteSchema,
  lessonRouteParamsSchema,
  lessonStateSchema,
  timelineQuerySchema,
  courseProgressParamsSchema,
  instructorProgressQuerySchema,
  instructorStudentProgressParamsSchema,
  adminCourseProgressQuerySchema,
  progressHistoryQuerySchema,
} from '../validators/progress.validator';
import { USER_ROLES } from '@shared/constants';

const router = Router();
const progressController = new ProgressController();

// ─── Student Progress ──────────────────────────────────────────────────────
router.patch(
  '/lessons/:lessonId/complete',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(lessonRouteParamsSchema, 'params'),
  validate(markLessonCompleteSchema),
  asyncHandler(progressController.markComplete),
);

router.patch(
  '/lessons/:lessonId/state',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(lessonRouteParamsSchema, 'params'),
  validate(lessonStateSchema),
  asyncHandler(progressController.setState),
);

router.get(
  '/courses/:courseId/my-progress',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(courseProgressParamsSchema, 'params'),
  asyncHandler(progressController.getMyProgress),
);

// ─── Instructor/Admin View ──────────────────────────────────────────────────
router.get(
  '/courses/:courseId/students-progress',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(courseProgressParamsSchema, 'params'),
  validate(instructorProgressQuerySchema, 'query'),
  asyncHandler(progressController.getStudentProgress),
);

router.get(
  '/courses/:courseId/students/:studentId',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(instructorStudentProgressParamsSchema, 'params'),
  asyncHandler(progressController.getStudentCourseProgressDetail),
);

router.get(
  '/courses/:courseId/history',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(courseProgressParamsSchema, 'params'),
  validate(progressHistoryQuerySchema, 'query'),
  asyncHandler(progressController.getCourseHistory),
);

router.get(
  '/courses/:courseId/students/:studentId/history',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(instructorStudentProgressParamsSchema, 'params'),
  validate(progressHistoryQuerySchema, 'query'),
  asyncHandler(progressController.getStudentCourseHistory),
);

// ─── Admin Progress Monitoring ──────────────────────────────────────────────
router.get(
  '/admin/overview',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  asyncHandler(progressController.getAdminOverview),
);

router.get(
  '/admin/courses',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validate(adminCourseProgressQuerySchema, 'query'),
  asyncHandler(progressController.getAdminCourseProgressList),
);

// ─── Student Dashboard / Overview ───────────────────────────────────────────
router.get(
  '/overview',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  asyncHandler(progressController.getOverview),
);

router.get(
  '/overview/summary',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  asyncHandler(progressController.getOverviewSummary),
);

router.get(
  '/overview/timeline',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(timelineQuerySchema, 'query'),
  asyncHandler(progressController.getActivityTimeline),
);

router.get(
  '/history/me',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(progressHistoryQuerySchema, 'query'),
  asyncHandler(progressController.getMyHistory),
);

export { router as progressRouter };
