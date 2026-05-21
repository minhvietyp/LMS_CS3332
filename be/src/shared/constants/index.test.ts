import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS, USER_ROLES } from './index';

describe('RBAC constants', () => {
  it('grants admin every core permission', () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.ADMIN]).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('limits students to read-only course access', () => {
    expect(ROLE_PERMISSIONS[USER_ROLES.STUDENT]).toEqual([PERMISSIONS.COURSE_READ]);
  });
});
