import { describe, expect, it } from 'vitest';
import {
  assignmentIdParamsSchema,
  courseIdParamsSchema,
  createAssignmentSchema,
  gradeSubmissionSchema,
  listSubmissionsSchema,
  submitAssignmentSchema,
  submissionIdParamsSchema,
  updateAssignmentSchema,
} from './assignment.validator';

describe('assignment.validator', () => {
  it('accepts a valid create payload and trims text fields', () => {
    const result = createAssignmentSchema.parse({
      courseId: '11111111-1111-1111-1111-111111111111',
      title: '  Week 1 assignment  ',
      description: '  Build a simple component  ',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
    });

    expect(result).toEqual({
      courseId: '11111111-1111-1111-1111-111111111111',
      title: 'Week 1 assignment',
      description: 'Build a simple component',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
    });
  });

  it('accepts a create payload without a due date', () => {
    const result = createAssignmentSchema.parse({
      courseId: '11111111-1111-1111-1111-111111111111',
      title: 'Week 1 assignment',
      allowLateSubmission: false,
    });

    expect(result).toEqual({
      courseId: '11111111-1111-1111-1111-111111111111',
      title: 'Week 1 assignment',
      allowLateSubmission: false,
    });
  });

  it('requires at least one field for update', () => {
    expect(() => updateAssignmentSchema.parse({})).toThrow('At least one field must be provided');
  });

  it('accepts text-only, file-only, and mixed submissions', () => {
    expect(submitAssignmentSchema.parse({ textContent: 'My answer' }).textContent).toBe(
      'My answer',
    );
    expect(
      submitAssignmentSchema.parse({
        fileUrl: 'https://files.local/report.pdf',
        fileName: 'report.pdf',
      }).fileName,
    ).toBe('report.pdf');
    expect(
      submitAssignmentSchema.parse({
        textContent: 'My answer',
        fileUrl: 'https://files.local/report.pdf',
        fileName: 'report.pdf',
      }).fileName,
    ).toBe('report.pdf');
  });

  it('rejects file submissions without a file name', () => {
    expect(() =>
      submitAssignmentSchema.parse({
        fileUrl: 'https://files.local/report.pdf',
      }),
    ).toThrow('File name is required when a file URL is provided');
  });

  it('accepts grade payloads and trims feedback', () => {
    const result = gradeSubmissionSchema.parse({
      grade: 92,
      feedback: '  Clear structure  ',
    });

    expect(result).toEqual({
      grade: 92,
      feedback: 'Clear structure',
    });
  });

  it('coerces submission list query flags', () => {
    const result = listSubmissionsSchema.parse({
      status: 'LATE',
      isLate: 'true',
    });

    expect(result).toEqual({
      status: 'LATE',
      isLate: true,
    });
  });

  it('accepts valid route params', () => {
    expect(
      courseIdParamsSchema.parse({ courseId: '11111111-1111-1111-1111-111111111111' }).courseId,
    ).toBe('11111111-1111-1111-1111-111111111111');
    expect(assignmentIdParamsSchema.parse({ id: '22222222-2222-2222-2222-222222222222' }).id).toBe(
      '22222222-2222-2222-2222-222222222222',
    );
    expect(
      submissionIdParamsSchema.parse({ submissionId: '33333333-3333-3333-3333-333333333333' })
        .submissionId,
    ).toBe('33333333-3333-3333-3333-333333333333');
  });

  it('rejects invalid route params', () => {
    expect(() => courseIdParamsSchema.parse({ courseId: 'bad-id' })).toThrow();
    expect(() => assignmentIdParamsSchema.parse({ id: 'bad-id' })).toThrow();
    expect(() => submissionIdParamsSchema.parse({ submissionId: 'bad-id' })).toThrow();
  });
});
