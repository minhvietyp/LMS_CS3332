import { describe, expect, it } from 'vitest';
import { COURSE_STATUS } from '@shared/constants';
import {
  courseIdParamsSchema,
  createCourseSchema,
  listCoursesQuerySchema,
  updateCourseSchema,
} from './course.validator';

describe('course.validator', () => {
  it('accepts a valid create payload and trims the title', () => {
    const result = createCourseSchema.parse({
      title: '  Intro to Testing  ',
      description: '  Learn how to test LMS features.  ',
    });

    expect(result).toEqual({
      title: 'Intro to Testing',
      description: 'Learn how to test LMS features.',
    });
  });

  it('rejects a create payload with a short title', () => {
    expect(() =>
      createCourseSchema.parse({
        title: 'ab',
        description: 'Valid description',
      }),
    ).toThrow();
  });

  it('requires at least one field for update', () => {
    expect(() => updateCourseSchema.parse({})).toThrow('At least one field must be provided');
  });

  it('accepts a valid course id param', () => {
    const result = courseIdParamsSchema.parse({ id: '11111111-1111-1111-1111-111111111111' });

    expect(result.id).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('rejects an invalid course id param', () => {
    expect(() => courseIdParamsSchema.parse({ id: 'not-a-uuid' })).toThrow();
  });

  it('accepts a valid list query with status and pagination', () => {
    const result = listCoursesQuerySchema.parse({
      page: '2',
      limit: '25',
      search: 'react',
      status: COURSE_STATUS.PUBLISHED,
      instructorId: '11111111-1111-1111-1111-111111111111',
      includeDeleted: 'false',
    });

    expect(result).toEqual({
      page: '2',
      limit: '25',
      search: 'react',
      status: COURSE_STATUS.PUBLISHED,
      instructorId: '11111111-1111-1111-1111-111111111111',
      includeDeleted: false,
    });
  });

  it('parses includeDeleted true correctly from a string query value', () => {
    const result = listCoursesQuerySchema.parse({ includeDeleted: 'true' });

    expect(result.includeDeleted).toBe(true);
  });

  it('rejects an invalid list query page value', () => {
    expect(() => listCoursesQuerySchema.parse({ page: 'abc' })).toThrow();
  });
});
