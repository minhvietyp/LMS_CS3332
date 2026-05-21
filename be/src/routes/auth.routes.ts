import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { config } from '@config/index';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

router.post('/register', authRateLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authRateLimiter, validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', validate(refreshSchema), asyncHandler(authController.logout));
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

export { router as authRouter };
