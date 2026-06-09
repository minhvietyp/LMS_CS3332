import { NextFunction, Request, Response } from 'express';
import logger from '@config/logger';
import { config } from '@config/index';

export function requestTiming(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    };

    if (durationMs >= config.app.slowRequestThresholdMs) {
      logger.warn('Slow request', payload);
      return;
    }

    logger.info('Request completed', payload);
  });

  next();
}
