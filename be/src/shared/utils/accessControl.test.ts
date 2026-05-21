import { describe, expect, it } from 'vitest';
import { getRoleAccessMatrix } from './accessControl';
import { PERMISSIONS, USER_ROLES } from '@shared/constants';

describe('accessControl helper', () => {
  it('returns the expected role matrix', () => {
    const matrix = getRoleAccessMatrix();

    expect(matrix).toHaveLength(3);
    expect(matrix.find((item) => item.role === USER_ROLES.ADMIN)?.permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_RESTORE,
      ]),
    );
    expect(matrix.find((item) => item.role === USER_ROLES.STUDENT)?.permissions).toEqual([
      PERMISSIONS.COURSE_READ,
    ]);
  });
});
