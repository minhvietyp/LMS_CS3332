import bcrypt from 'bcryptjs';
import prisma from '@config/prisma';
import { config } from '@config/index';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError,
} from '@shared/errors/AppError';
import { uploadImageBuffer } from '@shared/utils/cloudinary';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateContactDto,
  UpdateProfileDto,
  UpdateUserDto,
} from '../validators/user.validator';
import { Prisma } from '@prisma/client';
import { parsePagination, pickDefined } from '@shared/utils/helpers';
import { PaginatedResult } from '@types';
import { COURSE_STATUS, ENROLLMENT_STATUS, USER_ROLES } from '@shared/constants';

export interface AccountProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  phone?: string | null;
  age?: number | null;
  occupation?: string | null;
  bio?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  githubUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

const accountProfileSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  coverImageUrl: true,
  firstName: true,
  lastName: true,
  displayName: true,
  phone: true,
  age: true,
  occupation: true,
  bio: true,
  facebookUrl: true,
  twitterUrl: true,
  linkedinUrl: true,
  websiteUrl: true,
  githubUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
} as const;

function toAccountProfile<T extends { password?: string }>(user: T): AccountProfile {
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.password;
  return userWithoutPassword as unknown as AccountProfile;
}

export class UserService {
  async listPublicInstructors(): Promise<any[]> {
    const instructors = await prisma.user.findMany({
      where: {
        role: USER_ROLES.INSTRUCTOR,
        isActive: true,
        deletedAt: null,
        taughtCourses: {
          some: {
            deletedAt: null,
            status: COURSE_STATUS.PUBLISHED,
          },
        },
      },
      select: {
        ...accountProfileSelect,
        taughtCourses: {
          where: {
            deletedAt: null,
            status: COURSE_STATUS.PUBLISHED,
          },
          select: {
            id: true,
            enrollments: {
              where: {
                status: ENROLLMENT_STATUS.ACTIVE,
              },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return instructors.map((instructor) => ({
      ...instructor,
      courseCount: instructor.taughtCourses.length,
      studentCount: instructor.taughtCourses.reduce(
        (count, course) => count + course.enrollments.length,
        0,
      ),
    }));
  }

  async getPublicInstructorById(id: string): Promise<any> {
    const instructor = await prisma.user.findFirst({
      where: {
        id,
        role: USER_ROLES.INSTRUCTOR,
        isActive: true,
        deletedAt: null,
      },
      select: {
        ...accountProfileSelect,
        taughtCourses: {
          where: {
            deletedAt: null,
            status: COURSE_STATUS.PUBLISHED,
          },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            status: true,
            enrollments: {
              where: {
                status: ENROLLMENT_STATUS.ACTIVE,
              },
              select: { id: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!instructor) {
      throw NotFoundError('Instructor not found');
    }

    return {
      ...instructor,
      courseCount: instructor.taughtCourses.length,
      studentCount: instructor.taughtCourses.reduce(
        (count, course) => count + course.enrollments.length,
        0,
      ),
      publishedCourses: instructor.taughtCourses.map((course) => {
        const courseWithoutEnrollments = { ...course };
        delete (courseWithoutEnrollments as Partial<typeof course>).enrollments;
        return courseWithoutEnrollments;
      }),
    };
  }

  /**
   * List users with pagination, search, and filters
   */
  async list(query: any): Promise<PaginatedResult<AccountProfile>> {
    const { page, limit, skip } = parsePagination(query);
    const { search, role, isActive, includeDeleted, deleted } = query;

    const where: Prisma.UserWhereInput = {
      ...(deleted ? { deletedAt: { not: null } } : includeDeleted ? {} : { deletedAt: null }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          deletedBy: true,
        },
      }),
    ]);

    return {
      data: users as any[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getById(id: string, options?: { includeDeleted?: boolean }): Promise<AccountProfile> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        ...(options?.includeDeleted ? {} : { deletedAt: null }),
      },
      select: accountProfileSelect as any,
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    return user as unknown as AccountProfile;
  }

  /**
   * Create user (Admin only flow)
   */
  async create(data: CreateUserDto): Promise<AccountProfile> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw ConflictError('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.rounds);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        avatarUrl: data.avatarUrl,
        isActive: data.isActive ?? true,
      },
    });

    return toAccountProfile(user);
  }

  /**
   * Update user details
   */
  async update(id: string, data: UpdateUserDto): Promise<AccountProfile> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw ConflictError('Email already in use');
    }

    const updatedUser = await (prisma.user as any).update({
      where: { id },
      data: pickDefined(data),
    });

    return toAccountProfile(updatedUser);
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string, deletedBy: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
    });
  }

  /**
   * Restore soft-deleted user
   */
  async restore(id: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!user || !user.deletedAt) {
      throw NotFoundError('Deleted user not found');
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        isActive: true,
      },
    });
  }

  /**
   * Upload and persist the current user's avatar
   */
  async updateAvatar(id: string, file: Express.Multer.File): Promise<AccountProfile> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    const uploaded = await uploadImageBuffer(file.buffer, 'lms/avatars');

    const updatedUser = await (prisma.user as any).update({
      where: { id },
      data: {
        avatarUrl: uploaded.secureUrl,
      },
    });

    return toAccountProfile(updatedUser);
  }

  async updateCoverImage(id: string, file: Express.Multer.File): Promise<AccountProfile> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    const uploaded = await uploadImageBuffer(file.buffer, 'lms/covers');

    const updatedUser = await (prisma.user as any).update({
      where: { id },
      data: {
        coverImageUrl: uploaded.secureUrl,
      },
    });

    return toAccountProfile(updatedUser);
  }

  async updateMyProfile(id: string, data: UpdateProfileDto): Promise<AccountProfile> {
    return this.update(id, data);
  }

  async updateMyContact(id: string, data: UpdateContactDto): Promise<AccountProfile> {
    return this.update(id, {
      phone: data.phone,
      facebookUrl: data.facebookUrl || undefined,
      twitterUrl: data.twitterUrl || undefined,
      linkedinUrl: data.linkedinUrl || undefined,
      websiteUrl: data.websiteUrl || undefined,
      githubUrl: data.githubUrl || undefined,
    });
  }

  async changePassword(id: string, data: ChangePasswordDto): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      (user as any).password,
    );
    if (!isCurrentPasswordValid) {
      throw UnauthorizedError('Current password is incorrect');
    }

    if (data.currentPassword === data.newPassword) {
      throw BadRequestError('New password must be different from the current password');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, config.bcrypt.rounds);

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      }),
    ]);
  }
}
