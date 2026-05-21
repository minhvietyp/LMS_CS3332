import type { UserRole } from '../components/context/AuthContext';

export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_RESTORE: 'user:restore',
  COURSE_READ: 'course:read',
  COURSE_CREATE: 'course:create',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',
  COURSE_RESTORE: 'course:restore',
  LESSON_CREATE: 'lesson:create',
} as const;

export const ACCESS_CONTROL_PERMISSION_LABELS: Record<(typeof PERMISSIONS)[keyof typeof PERMISSIONS], string> = {
  [PERMISSIONS.USER_READ]: 'View users',
  [PERMISSIONS.USER_CREATE]: 'Create users',
  [PERMISSIONS.USER_UPDATE]: 'Update users',
  [PERMISSIONS.USER_DELETE]: 'Delete users',
  [PERMISSIONS.USER_RESTORE]: 'Restore users',
  [PERMISSIONS.COURSE_READ]: 'View courses',
  [PERMISSIONS.COURSE_CREATE]: 'Create courses',
  [PERMISSIONS.COURSE_UPDATE]: 'Update courses',
  [PERMISSIONS.COURSE_DELETE]: 'Delete courses',
  [PERMISSIONS.COURSE_RESTORE]: 'Restore courses',
  [PERMISSIONS.LESSON_CREATE]: 'Create and manage lessons',
};

const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  ADMIN: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_RESTORE,
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.COURSE_RESTORE,
    PERMISSIONS.LESSON_CREATE,
  ],
  INSTRUCTOR: [
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.COURSE_RESTORE,
    PERMISSIONS.LESSON_CREATE,
  ],
  STUDENT: [PERMISSIONS.COURSE_READ],
};

export function canAccess(role: UserRole | undefined, permission: string): boolean {
  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
