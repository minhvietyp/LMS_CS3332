import { Router } from 'express';
import { EnrollmentController } from '../controllers/enrollment.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import {
	courseIdParamsSchema,
	enrollmentIdParamsSchema,
	enrollStudentSchema,
	updateEnrollmentStatusSchema,
} from '../validators/enrollment.validator';
import { USER_ROLES } from '@shared/constants';

const router = Router();
const enrollmentController = new EnrollmentController();

// ─── My Enrollments (Students) ──────────────────────────────────────────────
router.get('/my-courses', authenticate, authorize(USER_ROLES.STUDENT), asyncHandler(enrollmentController.listMyCourses));
router.get(
	'/my-courses/:courseId/status',
	authenticate,
	authorize(USER_ROLES.STUDENT),
	validate(courseIdParamsSchema, 'params'),
	asyncHandler(enrollmentController.getMyCourseStatus),
);

// ─── Enrollment Management (Instructor/Admin) ───────────────────────────────
router.use(authenticate, authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN));

router.post('/', validate(enrollStudentSchema), asyncHandler(enrollmentController.enroll));
router.patch('/:id/status', validate(enrollmentIdParamsSchema, 'params'), validate(updateEnrollmentStatusSchema), asyncHandler(enrollmentController.updateStatus));
router.delete('/:id', validate(enrollmentIdParamsSchema, 'params'), asyncHandler(enrollmentController.unenroll));
router.get('/course/:courseId', validate(courseIdParamsSchema, 'params'), asyncHandler(enrollmentController.listByCourse));

export { router as enrollmentsRouter };
