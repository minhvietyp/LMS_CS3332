import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { createCourseSchema, updateCourseSchema, listCoursesQuerySchema, courseIdParamsSchema } from '../validators/course.validator';
import { PERMISSIONS } from '@shared/constants';
import { courseThumbnailUpload } from '@shared/middlewares/upload';

const router = Router();
const courseController = new CourseController();

// ─── Public Catalog Access ────────────────────────────────────────────────
router.get('/public', validate(listCoursesQuerySchema, 'query'), asyncHandler(courseController.listPublic));
router.get('/public/:id', validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.getPublicById));

// ─── Authenticated Access ─────────────────────────────────────────────────
router.get('/', authenticate, validate(listCoursesQuerySchema, 'query'), asyncHandler(courseController.list));
router.get('/:id', authenticate, validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.getById));
router.get('/:id/modules', authenticate, validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.listPublishedModules));
router.get('/:id/resources', authenticate, validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.listResources));

// ─── Instructor/Admin Management ──────────────────────────────────────────
router.post('/', authenticate, authorize(PERMISSIONS.COURSE_CREATE), courseThumbnailUpload.single('thumbnail'), validate(createCourseSchema), asyncHandler(courseController.create));
router.patch('/:id', authenticate, authorize(PERMISSIONS.COURSE_UPDATE), validate(courseIdParamsSchema, 'params'), validate(updateCourseSchema), asyncHandler(courseController.update));
router.post('/:id/publish', authenticate, authorize(PERMISSIONS.COURSE_UPDATE), validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.publish));
router.post('/:id/archive', authenticate, authorize(PERMISSIONS.COURSE_UPDATE), validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.archive));
router.patch('/:id/thumbnail', authenticate, authorize(PERMISSIONS.COURSE_UPDATE), validate(courseIdParamsSchema, 'params'), courseThumbnailUpload.single('thumbnail'), asyncHandler(courseController.updateThumbnail));
router.delete('/:id', authenticate, authorize(PERMISSIONS.COURSE_DELETE), validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.delete));
router.post('/:id/restore', authenticate, authorize(PERMISSIONS.COURSE_RESTORE), validate(courseIdParamsSchema, 'params'), asyncHandler(courseController.restore));

export { router as coursesRouter };
