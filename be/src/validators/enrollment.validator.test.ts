import { describe, expect, it } from 'vitest';
import {
  courseIdParamsSchema,
  enrollmentIdParamsSchema,
  enrollStudentSchema,
  updateEnrollmentStatusSchema,
} from './enrollment.validator';

describe('enrollment.validator', () => {
  it('accepts valid enrollment payloads', () => {
    const result = enrollStudentSchema.parse({
      studentId: '11111111-1111-1111-1111-111111111111',
      courseId: '22222222-2222-2222-2222-222222222222',
    });

    expect(result).toEqual({
      studentId: '11111111-1111-1111-1111-111111111111',
      courseId: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('rejects invalid enrollment payloads', () => {
    expect(() =>
      enrollStudentSchema.parse({
        studentId: 'not-a-uuid',
        courseId: '22222222-2222-2222-2222-222222222222',
      }),
    ).toThrow();
  });

  it('accepts valid route params', () => {
    expect(courseIdParamsSchema.parse({ courseId: '11111111-1111-1111-1111-111111111111' })).toEqual({
      courseId: '11111111-1111-1111-1111-111111111111',
    });
    expect(enrollmentIdParamsSchema.parse({ id: '22222222-2222-2222-2222-222222222222' })).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('rejects invalid enrollment status values', () => {
    expect(() => updateEnrollmentStatusSchema.parse({ status: 'FINISHED' })).toThrow();
  });
});