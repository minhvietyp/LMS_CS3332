import { Permission, PERMISSIONS, ROLE_PERMISSIONS, USER_ROLES } from '@shared/constants';

export interface RoleAccessSummary {
  role: keyof typeof USER_ROLES;
  label: string;
  description: string;
  permissions: Permission[];
}

export function getRoleAccessMatrix(): RoleAccessSummary[] {
  return [
    {
      role: USER_ROLES.ADMIN,
      label: 'Administrator',
      description: 'Full access to user and content management.',
      permissions: [...ROLE_PERMISSIONS[USER_ROLES.ADMIN]],
    },
    {
      role: USER_ROLES.INSTRUCTOR,
      label: 'Instructor',
      description: 'Manage own courses and instructional content.',
      permissions: [...ROLE_PERMISSIONS[USER_ROLES.INSTRUCTOR]],
    },
    {
      role: USER_ROLES.STUDENT,
      label: 'Student',
      description: 'Self-service and course read access only.',
      permissions: [...ROLE_PERMISSIONS[USER_ROLES.STUDENT]],
    },
  ];
}

export const ACCESS_CONTROL_PERMISSION_LABELS: Record<Permission, string> = {
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
};
