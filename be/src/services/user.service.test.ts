import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    bcrypt: {
      rounds: 12,
    },
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

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('@shared/utils/cloudinary', () => ({
  uploadImageBuffer: vi.fn(),
}));

import prisma from '@config/prisma';
import { uploadImageBuffer } from '@shared/utils/cloudinary';
import { UserService } from './user.service';

const userService = new UserService();
const mockedPrisma = prisma as any;
const mockedBcrypt = bcrypt as any;
const mockedUploadImageBuffer = vi.mocked(uploadImageBuffer);

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists users with pagination and filters', async () => {
    mockedPrisma.user.count.mockResolvedValue(2);
    mockedPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        deletedBy: null,
      },
    ]);

    const result = await userService.list({
      page: '1',
      limit: '10',
      search: 'admin',
      role: 'ADMIN',
    });

    expect(mockedPrisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        role: 'ADMIN',
        OR: expect.any(Array),
      }),
    });
    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(result.data).toHaveLength(1);
  });

  it('lists deleted users when includeDeleted is true', async () => {
    mockedPrisma.user.count.mockResolvedValue(1);
    mockedPrisma.user.findMany.mockResolvedValue([]);

    await userService.list({ includeDeleted: 'true' });

    expect(mockedPrisma.user.count).toHaveBeenCalled();
    const countArgs = mockedPrisma.user.count.mock.calls[0][0];
    expect(countArgs.where.deletedAt).toBeUndefined();
  });

  it('lists only deleted users when deleted filter is true', async () => {
    mockedPrisma.user.count.mockResolvedValue(1);
    mockedPrisma.user.findMany.mockResolvedValue([]);

    await userService.list({ deleted: true, includeDeleted: true });

    expect(mockedPrisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: { not: null },
      }),
    });
  });

  it('returns a user profile by id', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      avatarUrl: null,
      coverImageUrl: null,
      firstName: 'Student',
      lastName: 'One',
      displayName: 'Student One',
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

    const result = await userService.getById('user-1');

    expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', deletedAt: null },
      select: expect.any(Object),
    });
    expect(result.email).toBe('student@example.com');
    expect(result).not.toHaveProperty('password');
  });

  it('returns a deleted user profile when includeDeleted is enabled', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'deleted@example.com',
      name: 'Deleted User',
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
      isActive: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: new Date('2026-01-03T00:00:00.000Z'),
      deletedBy: 'admin-1',
    });

    const result = await userService.getById('user-1', { includeDeleted: true });

    expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: expect.any(Object),
    });
    expect(result.deletedBy).toBe('admin-1');
  });

  it('creates a user with a hashed password', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-2',
      email: 'new@example.com',
      name: 'New User',
      role: 'INSTRUCTOR',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await userService.create({
      name: 'New User',
      email: 'new@example.com',
      password: 'password123',
      role: 'INSTRUCTOR',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: false,
    } as any);

    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(mockedPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'New User',
        email: 'new@example.com',
        password: 'hashed-password',
        role: 'INSTRUCTOR',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        isActive: false,
      },
    });
    expect(result.email).toBe('new@example.com');
    expect(result).not.toHaveProperty('password');
  });

  it('updates a user and checks email conflicts', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'old@example.com',
      name: 'Old Name',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      name: 'Updated Name',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await userService.update('user-1', {
      name: 'Updated Name',
      email: 'new@example.com',
    } as any);

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Updated Name', email: 'new@example.com' },
    });
    expect(result.name).toBe('Updated Name');
  });

  it('soft deletes and restores users', async () => {
    mockedPrisma.user.findFirst.mockResolvedValueOnce({
      id: 'user-1',
      deletedAt: null,
    });
    mockedPrisma.user.update.mockResolvedValueOnce({});
    mockedPrisma.user.findFirst.mockResolvedValueOnce({
      id: 'user-1',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    mockedPrisma.user.update.mockResolvedValueOnce({});

    await userService.softDelete('user-1', 'admin-1');
    await userService.restore('user-1');

    expect(mockedPrisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1' },
      data: expect.objectContaining({
        isActive: false,
        deletedBy: 'admin-1',
        deletedAt: expect.any(Date),
      }),
    });
    expect(mockedPrisma.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
      },
    });
  });

  it('rejects deleting an already soft deleted user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);

    await expect(userService.softDelete('user-1', 'admin-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });

    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects restoring an active user', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);

    await expect(userService.restore('user-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Deleted user not found',
    });

    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it('uploads an avatar and stores the cloudinary url', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/avatar.png',
      publicId: 'avatars/avatar-1',
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await userService.updateAvatar('user-1', {
      buffer: Buffer.from('avatar-bytes'),
    } as any);

    expect(mockedUploadImageBuffer).toHaveBeenCalledWith(
      Buffer.from('avatar-bytes'),
      'lms/avatars',
    );
    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        avatarUrl: 'https://cdn.example.com/avatar.png',
      },
    });
    expect(result.avatarUrl).toBe('https://cdn.example.com/avatar.png');
  });

  it('updates my contact details', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      phone: '+1-202-555-0147',
      linkedinUrl: 'https://linkedin.com/in/student',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await userService.updateMyContact('user-1', {
      phone: '+1-202-555-0147',
      linkedinUrl: 'https://linkedin.com/in/student',
    });

    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        phone: '+1-202-555-0147',
        facebookUrl: undefined,
        twitterUrl: undefined,
        linkedinUrl: 'https://linkedin.com/in/student',
        websiteUrl: undefined,
        githubUrl: undefined,
      },
    });
    expect(result.phone).toBe('+1-202-555-0147');
  });

  it('changes the current password and revokes refresh tokens', async () => {
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      password: 'old-hash',
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
    mockedPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await userService.changePassword('user-1', {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    });

    expect(mockedBcrypt.compare).toHaveBeenCalledWith('OldPassword123', 'old-hash');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 12);
    expect(mockedPrisma.$transaction).toHaveBeenCalled();
  });
});
