import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@config/prisma';
import { config } from '@config/index';
import { signAccessToken } from '@shared/utils/jwt';
import { BadRequestError, UnauthorizedError, ConflictError } from '@shared/errors/AppError';
import { RegisterDto, LoginDto } from '../validators/auth.validator';
import { User, UserRole } from '@prisma/client';
import { EmailService } from './email.service';

function omitPassword(user: User): Omit<User, 'password'> {
  const userWithoutPassword = { ...user } as Partial<User>;
  delete userWithoutPassword.password;
  return userWithoutPassword as Omit<User, 'password'>;
}

export class AuthService {
  private emailService = new EmailService();
  private passwordResetExpiryMinutes = 30;

  /**
   * Register a new user (Student by default)
   */
  async register(
    data: RegisterDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'password'> }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw ConflictError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.rounds);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: UserRole.STUDENT,
      },
    });

    // Generate tokens for the newly created user (auto login)
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: omitPassword(user),
    };
  }

  /**
   * Login user and generate access & refresh tokens
   */
  async login(
    data: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: Omit<User, 'password'> }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.isActive) {
      throw UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw UnauthorizedError('Invalid email or password');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: omitPassword(user),
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(tokenString: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = crypto.createHash('sha256').update(tokenString).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw UnauthorizedError('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive) {
      throw UnauthorizedError('User account is deactivated');
    }

    // Revoke the old token (Refresh Token Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const accessToken = signAccessToken({
      sub: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRefreshTokenString).digest('hex');
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshTokenString,
    };
  }

  /**
   * Logout user by revoking the refresh token
   */
  async logout(tokenString: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(tokenString).digest('hex');

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return;
    }

    const passwordResetTokenRepo = (prisma as any).passwordResetToken;
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.passwordResetExpiryMinutes * 60 * 1000);
    const frontendBaseUrl = config.cors.origins[0] ?? 'http://localhost:5173';
    const resetPath = user.role === UserRole.ADMIN ? '/admin/reset-password' : '/reset-password';
    const resetLink = `${frontendBaseUrl}${resetPath}?token=${rawToken}`;

    await passwordResetTokenRepo.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await passwordResetTokenRepo.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail({
      userId: user.id,
      recipient: user.email,
      userName: user.name,
      resetLink,
      expiresInMinutes: this.passwordResetExpiryMinutes,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const passwordResetTokenRepo = (prisma as any).passwordResetToken;
    const storedToken = await passwordResetTokenRepo.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.usedAt || storedToken.expiresAt < new Date()) {
      throw BadRequestError('Invalid or expired password reset token');
    }

    if (!storedToken.user.isActive) {
      throw UnauthorizedError('User account is deactivated');
    }

    const hashedPassword = await bcrypt.hash(password, config.bcrypt.rounds);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: storedToken.userId },
        data: { password: hashedPassword },
      }),
      passwordResetTokenRepo.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);
  }
}
