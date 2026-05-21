import jwt from 'jsonwebtoken';
import { config } from '@config/index';
import { JwtPayload } from '@types';
import { UnauthorizedError } from '@shared/errors/AppError';

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  } catch (err) {
    throw UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
  }
};
