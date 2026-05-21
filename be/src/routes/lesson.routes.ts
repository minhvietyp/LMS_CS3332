import { Router } from 'express';
import { LessonController } from '../controllers/lesson.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { lessonMaterialUpload } from '@shared/middlewares/upload';
import {
  courseIdParamsSchema,
  createModuleSchema,
  lessonRouteParamsSchema,
  lessonIdParamsSchema,
  materialIdParamsSchema,
  moduleRouteParamsSchema,
  moduleIdParamsSchema,
  reorderModulesSchema,
  reorderLessonsSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  createMaterialSchema,
  createUploadedMaterialSchema,
} from '../validators/lesson.validator';
import { USER_ROLES } from '@shared/constants';

const router = Router();
const lessonController = new LessonController();

router.use(authenticate, authorize(USER_ROLES.INSTRUCTOR, USER_ROLES.ADMIN));

// ─── Modules ──────────────────────────────────────────────────────────────
router.get('/courses/:courseId/modules', validate(courseIdParamsSchema, 'params'), asyncHandler(lessonController.listCourseModules));
router.post('/courses/:courseId/modules', validate(courseIdParamsSchema, 'params'), validate(createModuleSchema), asyncHandler(lessonController.createModule));
router.patch('/courses/:courseId/modules/reorder', validate(courseIdParamsSchema, 'params'), validate(reorderModulesSchema), asyncHandler(lessonController.reorderModules));
router.patch('/modules/:id', validate(moduleIdParamsSchema, 'params'), validate(updateModuleSchema), asyncHandler(lessonController.updateModule));
router.delete('/modules/:id', validate(moduleIdParamsSchema, 'params'), asyncHandler(lessonController.deleteModule));

// ─── Lessons ──────────────────────────────────────────────────────────────
router.post('/modules/:moduleId/lessons', validate(moduleRouteParamsSchema, 'params'), validate(createLessonSchema), asyncHandler(lessonController.createLesson));
router.patch('/modules/:moduleId/lessons/reorder', validate(moduleRouteParamsSchema, 'params'), validate(reorderLessonsSchema), asyncHandler(lessonController.reorderLessons));
router.get('/lessons/:id', validate(lessonIdParamsSchema, 'params'), asyncHandler(lessonController.getLessonById));
router.patch('/lessons/:id', validate(lessonIdParamsSchema, 'params'), validate(updateLessonSchema), asyncHandler(lessonController.updateLesson));
router.delete('/lessons/:id', validate(lessonIdParamsSchema, 'params'), asyncHandler(lessonController.deleteLesson));

// ─── Materials ────────────────────────────────────────────────────────────
router.get('/lessons/:lessonId/materials', validate(lessonRouteParamsSchema, 'params'), asyncHandler(lessonController.listMaterials));
router.post('/lessons/:lessonId/materials', validate(lessonRouteParamsSchema, 'params'), validate(createMaterialSchema), asyncHandler(lessonController.addMaterial));
router.post('/lessons/:lessonId/materials/upload', validate(lessonRouteParamsSchema, 'params'), lessonMaterialUpload.single('file'), validate(createUploadedMaterialSchema), asyncHandler(lessonController.uploadMaterial));
router.delete('/materials/:id', validate(materialIdParamsSchema, 'params'), asyncHandler(lessonController.deleteMaterial));

export { router as lessonsRouter };
