import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
    },
    bcrypt: {
      rounds: 12,
    },
    jwt: {
      accessSecret: 'test-secret',
      accessExpiresIn: '15m',
      refreshTokenDays: 7,
      refreshCookieName: 'refresh_token',
    },
    cloudinary: {
      cloudName: '',
      apiKey: '',
      apiSecret: '',
    },
    upload: {
      materialMaxSizeMb: 100,
    },
  },
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@config/prisma', () => ({
  default: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'instructor-token') {
      return {
        sub: 'instructor-1',
        email: 'instructor@lms.local',
        role: 'INSTRUCTOR',
      };
    }

    if (token === 'student-token') {
      return {
        sub: 'student-1',
        email: 'student@lms.local',
        role: 'STUDENT',
      };
    }

    return {
      sub: 'admin-1',
      email: 'admin@lms.local',
      role: 'ADMIN',
    };
  }),
  signAccessToken: vi.fn(() => 'mock-access-token'),
}));

vi.mock('@shared/utils/cloudinary', () => ({
  uploadImageBuffer: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import prisma from '@config/prisma';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { uploadImageBuffer } from '@shared/utils/cloudinary';
import bcrypt from 'bcryptjs';
import { usersRouter } from './user.routes';

const mockedPrisma = prisma as any;
const mockedUploadImageBuffer = vi.mocked(uploadImageBuffer);
const mockedBcrypt = bcrypt as any;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', usersRouter);
  app.use(errorHandler);
  return app;
}

describe('user routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current profile from /me', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      role: 'ADMIN',
      avatarUrl: null,
      coverImageUrl: null,
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Admin User',
      phone: null,
      age: null,
      occupation: null,
      bio: null,
      facebookUrl: null,
      twitterUrl: null,
      linkedinUrl: null,
      websiteUrl: null,
      githubUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('admin@lms.local');
  });

  it('returns the current profile from /me/profile', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      role: 'ADMIN',
      avatarUrl: null,
      coverImageUrl: null,
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Admin User',
      phone: null,
      age: null,
      occupation: null,
      bio: null,
      facebookUrl: null,
      twitterUrl: null,
      linkedinUrl: null,
      websiteUrl: null,
      githubUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .get('/api/v1/users/me/profile')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Admin User');
  });

  it('allows admin users to list users', async () => {
    mockedPrisma.user.count.mockResolvedValue(1);
    mockedPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'student@example.com',
        name: 'Student One',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        deletedBy: null,
      },
    ]);

    const response = await request(createApp())
      .get('/api/v1/users?includeDeleted=true')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(mockedPrisma.user.count).toHaveBeenCalled();
  });

  it('returns admin user detail for a managed account', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      avatarUrl: null,
      coverImageUrl: null,
      firstName: null,
      lastName: null,
      displayName: null,
      phone: null,
      age: null,
      occupation: null,
      bio: null,
      facebookUrl: null,
      twitterUrl: null,
      linkedinUrl: null,
      websiteUrl: null,
      githubUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .get('/api/v1/users/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('creates a managed user', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    mockedPrisma.user.create.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'new-instructor@example.com',
      name: 'New Instructor',
      password: 'hashed-password',
      role: 'INSTRUCTOR',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .post('/api/v1/users')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'New Instructor',
        email: 'new-instructor@example.com',
        password: 'Password123',
        role: 'INSTRUCTOR',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        isActive: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe('new-instructor@example.com');
    expect(mockedPrisma.user.create).toHaveBeenCalled();
  });

  it('updates a managed user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      email: 'student@example.com',
      name: 'Student One',
      password: 'hashed',
      role: 'STUDENT',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      email: 'student.one@example.com',
      name: 'Student One Updated',
      password: 'hashed',
      role: 'INSTRUCTOR',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .patch('/api/v1/users/33333333-3333-3333-3333-333333333333')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Student One Updated',
        email: 'student.one@example.com',
        role: 'INSTRUCTOR',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        isActive: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('INSTRUCTOR');
    expect(response.body.data.isActive).toBe(false);
  });

  it('rejects instructors from creating managed users', async () => {
    const response = await request(createApp())
      .post('/api/v1/users')
      .set('Authorization', 'Bearer instructor-token')
      .send({
        name: 'New Instructor',
        email: 'new-instructor@example.com',
        password: 'Password123',
        role: 'INSTRUCTOR',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects instructors from updating managed users', async () => {
    const response = await request(createApp())
      .patch('/api/v1/users/33333333-3333-3333-3333-333333333333')
      .set('Authorization', 'Bearer instructor-token')
      .send({
        name: 'Student One Updated',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it('soft deletes a managed user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      isActive: true,
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.user.update.mockResolvedValue({});

    const response = await request(createApp())
      .delete('/api/v1/users/44444444-4444-4444-4444-444444444444')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User deleted successfully');
  });

  it('rejects instructors from deleting managed users', async () => {
    const response = await request(createApp())
      .delete('/api/v1/users/44444444-4444-4444-4444-444444444444')
      .set('Authorization', 'Bearer instructor-token');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it('restores a soft-deleted user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: '55555555-5555-5555-5555-555555555555',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      isActive: false,
      deletedAt: new Date('2026-01-05T00:00:00.000Z'),
      deletedBy: 'admin-1',
    });
    mockedPrisma.user.update.mockResolvedValue({});

    const response = await request(createApp())
      .post('/api/v1/users/55555555-5555-5555-5555-555555555555/restore')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User restored successfully');
  });

  it('rejects instructors from restoring managed users', async () => {
    const response = await request(createApp())
      .post('/api/v1/users/55555555-5555-5555-5555-555555555555/restore')
      .set('Authorization', 'Bearer instructor-token');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated profile requests', async () => {
    const response = await request(createApp()).get('/api/v1/users/me');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Missing or invalid Authorization header');
  });

  it('rejects invalid user ids on admin detail routes', async () => {
    const response = await request(createApp())
      .get('/api/v1/users/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
  });

  it('uploads an avatar for a managed user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
      password: 'hashed',
    });
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/avatar.png',
      publicId: 'lms/avatars/avatar-1',
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
      password: 'hashed',
    });

    const response = await request(createApp())
      .patch('/api/v1/users/11111111-1111-1111-1111-111111111111/avatar')
      .set('Authorization', 'Bearer valid-token')
      .attach('avatar', Buffer.from('avatar-bytes'), 'avatar.png');

    expect(response.status).toBe(200);
    expect(response.body.data.avatarUrl).toBe('https://cdn.example.com/avatar.png');
  });

  it('updates contact information for the current user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      password: 'hashed',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      password: 'hashed',
      role: 'ADMIN',
      avatarUrl: null,
      phone: '+1-202-555-0147',
      websiteUrl: 'https://example.com',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .patch('/api/v1/users/me/contact')
      .set('Authorization', 'Bearer valid-token')
      .send({
        phone: '+1-202-555-0147',
        websiteUrl: 'https://example.com',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.phone).toBe('+1-202-555-0147');
  });

  it('updates profile information for the current user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      password: 'hashed',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      password: 'hashed',
      role: 'ADMIN',
      avatarUrl: null,
      firstName: 'Admin',
      lastName: 'Leader',
      occupation: 'Platform Owner',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({
        firstName: 'Admin',
        lastName: 'Leader',
        occupation: 'Platform Owner',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.occupation).toBe('Platform Owner');
  });

  it('changes the current user password', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@lms.local',
      name: 'Admin User',
      password: 'hashed-password',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedBcrypt.hash.mockResolvedValue('new-hash');
    mockedPrisma.user.update.mockResolvedValue({});
    mockedPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(createApp())
      .patch('/api/v1/users/me/password')
      .set('Authorization', 'Bearer valid-token')
      .send({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password updated successfully');
  });
});
