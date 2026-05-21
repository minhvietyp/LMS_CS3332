import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { assignmentSubmissionUpload } from '@shared/middlewares/upload';
import {
  assignmentIdParamsSchema,
  courseIdParamsSchema,
  createAssignmentSchema,
  gradeSubmissionSchema,
  submissionIdParamsSchema,
  submitAssignmentSchema,
  updateAssignmentSchema,
  listSubmissionsSchema,
} from '../validators/assignment.validator';
import { USER_ROLES } from '@shared/constants';

const router = Router();
const assignmentController = new AssignmentController();

// ─── Assignment Management (Instructor/Admin) ──────────────────────────────

// List assignments for a course
router.get(
  '/courses/:courseId',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(courseIdParamsSchema, 'params'),
  asyncHandler(assignmentController.listByCourse),
);

// Get assignment by ID
router.get(
  '/:id',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(assignmentIdParamsSchema, 'params'),
  asyncHandler(assignmentController.getById),
);

// Get assignment statistics
router.get(
  '/:id/statistics',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(assignmentIdParamsSchema, 'params'),
  asyncHandler(assignmentController.getStatistics),
);

// Create assignment
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(createAssignmentSchema),
  asyncHandler(assignmentController.create),
);

// Update assignment
router.patch(
  '/:id',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(assignmentIdParamsSchema, 'params'),
  validate(updateAssignmentSchema),
  asyncHandler(assignmentController.update),
);

// Delete assignment
router.delete(
  '/:id',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(assignmentIdParamsSchema, 'params'),
  asyncHandler(assignmentController.delete),
);

// ─── Submission Management (Instructor/Admin) ──────────────────────────────

// List all submissions for an assignment
router.get(
  '/:id/submissions',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(assignmentIdParamsSchema, 'params'),
  validate(listSubmissionsSchema, 'query'),
  asyncHandler(assignmentController.listSubmissionsByAssignment),
);

// Get submission statistics
router.get(
  '/:id/submissions/statistics',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(assignmentIdParamsSchema, 'params'),
  asyncHandler(assignmentController.getSubmissionStatistics),
);

// Get specific submission
router.get(
  '/submissions/:submissionId',
  authenticate,
  validate(submissionIdParamsSchema, 'params'),
  asyncHandler(assignmentController.getSubmission),
);

// Grade a submission
router.patch(
  '/submissions/:submissionId/grade',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(submissionIdParamsSchema, 'params'),
  validate(gradeSubmissionSchema),
  asyncHandler(assignmentController.gradeSubmission),
);

router.patch(
  '/submissions/:submissionId/return',
  authenticate,
  authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN),
  validate(submissionIdParamsSchema, 'params'),
  asyncHandler(assignmentController.returnSubmission),
);

// ─── Student Operations ──────────────────────────────────────────────────

router.get(
  '/courses/:courseId/student',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(courseIdParamsSchema, 'params'),
  asyncHandler(assignmentController.listStudentAssignments),
);

router.get(
  '/:id/student',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(assignmentIdParamsSchema, 'params'),
  asyncHandler(assignmentController.getStudentAssignmentById),
);

// Submit assignment
router.post(
  '/:id/upload-file',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(assignmentIdParamsSchema, 'params'),
  assignmentSubmissionUpload.single('file'),
  asyncHandler(assignmentController.uploadSubmissionFile),
);

router.post(
  '/:id/submit',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(assignmentIdParamsSchema, 'params'),
  validate(submitAssignmentSchema),
  asyncHandler(assignmentController.submitAssignment),
);

// List student's submissions for a course
router.get(
  '/courses/:courseId/my-submissions',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  validate(courseIdParamsSchema, 'params'),
  asyncHandler(assignmentController.listStudentSubmissions),
);

export { router as assignmentsRouter };
