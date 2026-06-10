/**
 * Application-wide constants.
 */

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
} as const;

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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const COURSE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  DROPPED: 'DROPPED',
} as const;

export const PROGRESS_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export const SUBMISSION_STATUS = {
  ON_TIME: 'ON_TIME',
  LATE: 'LATE',
  GRADED: 'GRADED',
  RETURNED: 'RETURNED',
} as const;

export const NOTIFICATION_TYPE = {
  COURSE: 'COURSE',
  QUIZ: 'QUIZ',
  ASSIGNMENT: 'ASSIGNMENT',
  CHAT: 'CHAT',
  SYSTEM: 'SYSTEM',
} as const;

export const CHATROOM_TYPE = {
  DIRECT: 'DIRECT',
  COURSE: 'COURSE',
} as const;

export const QUESTION_TYPE = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
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
  ],
  [USER_ROLES.INSTRUCTOR]: [
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.COURSE_RESTORE,
  ],
  [USER_ROLES.STUDENT]: [PERMISSIONS.COURSE_READ],
} as const satisfies Record<string, readonly Permission[]>;

// Default pagination
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Max quiz attempts
export const DEFAULT_MAX_QUIZ_ATTEMPTS = 3;
