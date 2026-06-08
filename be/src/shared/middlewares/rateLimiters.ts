import rateLimit from 'express-rate-limit';
import { config } from '@config/index';

const rateLimitResponse = (message: string) => ({
  success: false,
  message,
});

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many requests, please slow down.'),
});

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many authentication attempts, please try again later.'),
});

export const publicRateLimiter = rateLimit({
  windowMs: config.rateLimit.publicWindowMs,
  max: config.rateLimit.publicMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many public requests, please try again later.'),
});
