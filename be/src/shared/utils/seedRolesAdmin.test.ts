import { beforeEach, describe, expect, it, vi } from 'vitest';

const { hashMock } = vi.hoisted(() => ({
  hashMock: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: hashMock,
  },
}));

import { seedRolesAndAdmin, type AdminSeedConfig } from '../../../prisma/seed';

function createPrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  } as any;
}

describe('seedRolesAndAdmin', () => {
  const seedConfig: AdminSeedConfig = {
    name: 'System Admin',
    email: 'admin@lms.local',
    password: 'Admin123!@#',
    bcryptRounds: 12,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new admin account when none exists', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'System Admin',
      email: 'admin@lms.local',
      password: 'hashed-password',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    hashMock.mockResolvedValue('hashed-password');

    const result = await seedRolesAndAdmin(prisma, seedConfig);

    expect(hashMock).toHaveBeenCalledWith('Admin123!@#', 12);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'System Admin',
        email: 'admin@lms.local',
        password: 'hashed-password',
        role: 'ADMIN',
        isActive: true,
      },
    });
    expect(result.action).toBe('created');
    expect(result.admin).not.toHaveProperty('password');
  });

  it('restores a soft-deleted admin account without changing its password', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'System Admin',
      email: 'admin@lms.local',
      password: 'existing-hash',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedBy: 'someone',
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'System Admin',
      email: 'admin@lms.local',
      password: 'existing-hash',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await seedRolesAndAdmin(prisma, seedConfig);

    expect(hashMock).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'admin@lms.local' },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
        role: 'ADMIN',
      },
    });
    expect(result.action).toBe('restored');
  });

  it('corrects a seeded account role without overwriting the password', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'System Admin',
      email: 'admin@lms.local',
      password: 'existing-hash',
      role: 'STUDENT',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'System Admin',
      email: 'admin@lms.local',
      password: 'existing-hash',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await seedRolesAndAdmin(prisma, seedConfig);

    expect(hashMock).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'admin@lms.local' },
      data: {
        role: 'ADMIN',
        isActive: true,
      },
    });
    expect(result.action).toBe('updated-role');
  });

  it('leaves an already valid admin account unchanged', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'System Admin',
      email: 'admin@lms.local',
      password: 'existing-hash',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await seedRolesAndAdmin(prisma, seedConfig);

    expect(hashMock).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(result.action).toBe('unchanged');
  });
});
