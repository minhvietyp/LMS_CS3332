import { Router } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { PERMISSIONS } from '@shared/constants';
import { ApiResponse } from '@shared/utils/ApiResponse';
import { getRoleAccessMatrix } from '@shared/utils/accessControl';

const router = Router();

router.get(
  '/roles',
  authenticate,
  authorize(PERMISSIONS.USER_READ),
  asyncHandler(async (_req, res) => {
    return ApiResponse.success(res, getRoleAccessMatrix(), 'Role matrix retrieved successfully');
  }),
);

export { router as accessControlRouter };
