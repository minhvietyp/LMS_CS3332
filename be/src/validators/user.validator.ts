import { z } from 'zod';
import { USER_ROLES } from '@shared/constants';

const roleEnum = z.enum([USER_ROLES.ADMIN, USER_ROLES.INSTRUCTOR, USER_ROLES.STUDENT]);

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  age: z.number().int().min(1).max(120).optional(),
  occupation: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  facebookUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  role: roleEnum.optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  age: z.number().int().min(1).max(120).optional(),
  occupation: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
});

export const updateContactSchema = z.object({
  phone: z.string().trim().max(50).optional(),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  avatarUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  role: roleEnum.default(USER_ROLES.STUDENT),
});

export const listUsersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().trim().max(200).optional(),
  role: roleEnum.optional(),
  isActive: z.string().transform(v => v === 'true').optional(),
  includeDeleted: z.string().transform(v => v === 'true').optional(),
  deleted: z.string().transform(v => v === 'true').optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateContactDto = z.infer<typeof updateContactSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
