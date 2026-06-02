import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateContactSchema,
  updateProfileSchema,
  updateUserSchema,
  userIdParamsSchema,
} from '../validators/user.validator';
import { PERMISSIONS } from '@shared/constants';
import { avatarUpload } from '@shared/middlewares/upload';

const router = Router();
const userController = new UserController();

// ─── Public Instructor Directory ───────────────────────────────────────────
router.get('/public/instructors', asyncHandler(userController.listPublicInstructors));
router.get('/public/instructors/:id', validate(userIdParamsSchema, 'params'), asyncHandler(userController.getPublicInstructorById));

// ─── Self Management (Authenticated Users) ──────────────────────────────────
router.get('/me', authenticate, asyncHandler(userController.getMe));
router.get('/me/profile', authenticate, asyncHandler(userController.getMyProfile));
router.patch('/me', authenticate, validate(updateProfileSchema), asyncHandler(userController.updateMe));
router.patch('/me/profile', authenticate, validate(updateProfileSchema), asyncHandler(userController.updateMe));
router.patch('/me/contact', authenticate, validate(updateContactSchema), asyncHandler(userController.updateMyContact));
router.patch('/me/password', authenticate, validate(changePasswordSchema), asyncHandler(userController.changeMyPassword));
router.patch(
	'/me/avatar',
	authenticate,
	avatarUpload.single('avatar'),
	asyncHandler(userController.updateAvatar),
);
router.patch(
	'/me/cover-image',
	authenticate,
	avatarUpload.single('cover'),
	asyncHandler(userController.updateCoverImage),
);

// ─── User Management (Admin Only) ───────────────────────────────────────────
router.get('/', authenticate, authorize(PERMISSIONS.USER_READ), validate(listUsersQuerySchema, 'query'), asyncHandler(userController.list));
router.post('/', authenticate, authorize(PERMISSIONS.USER_CREATE), validate(createUserSchema), asyncHandler(userController.create));
router.get('/:id', authenticate, authorize(PERMISSIONS.USER_READ), validate(userIdParamsSchema, 'params'), asyncHandler(userController.getById));
router.patch('/:id', authenticate, authorize(PERMISSIONS.USER_UPDATE), validate(userIdParamsSchema, 'params'), validate(updateUserSchema), asyncHandler(userController.update));
router.patch('/:id/avatar', authenticate, authorize(PERMISSIONS.USER_UPDATE), validate(userIdParamsSchema, 'params'), avatarUpload.single('avatar'), asyncHandler(userController.updateUserAvatar));
router.delete('/:id', authenticate, authorize(PERMISSIONS.USER_DELETE), validate(userIdParamsSchema, 'params'), asyncHandler(userController.softDelete));
router.post('/:id/restore', authenticate, authorize(PERMISSIONS.USER_RESTORE), validate(userIdParamsSchema, 'params'), asyncHandler(userController.restore));

export { router as usersRouter };
