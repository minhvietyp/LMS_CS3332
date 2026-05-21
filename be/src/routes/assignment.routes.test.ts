import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
    },
  },
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@config/prisma', () => ({
  default: {
    course: {
      findUnique: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    submission: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(() => ({
    sub: 'instructor-1',
    email: 'instructor@lms.local',
    role: 'INSTRUCTOR',
  })),
}));

vi.mock('@shared/utils/cloudinary', () => ({
  uploadRawBuffer: vi.fn(),
}));

import prisma from '@config/prisma';
import { verifyAccessToken } from '@shared/utils/jwt';
import { uploadRawBuffer } from '@shared/utils/cloudinary';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { assignmentsRouter } from './assignment.routes';

const mockedPrisma = prisma as any;
const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockedUploadRawBuffer = vi.mocked(uploadRawBuffer);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/assignments', assignmentsRouter);
  app.use(errorHandler);
  return app;
}

describe('assignment routes', () => {
  const courseId = '11111111-1111-1111-1111-111111111111';
  const assignmentId = '22222222-2222-2222-2222-222222222222';
  const submissionId = '33333333-3333-3333-3333-333333333333';
  const studentAssignment = {
    id: assignmentId,
    courseId,
    title: 'Week 1 assignment',
    description: 'Build a simple component',
    dueDate: new Date('2026-01-10T08:00:00.000Z'),
    allowLateSubmission: true,
    deletedAt: null,
    submissions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'instructor-1',
      email: 'instructor@lms.local',
      role: 'INSTRUCTOR',
    } as any);
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
  });

  it('lists assignments for an owned course', async () => {
    mockedPrisma.assignment.findMany.mockResolvedValue([
      {
        id: assignmentId,
        courseId,
        title: 'Week 1 assignment',
        description: 'Build a simple component',
        dueDate: null,
        allowLateSubmission: true,
      },
    ]);

    const response = await request(createApp())
      .get(`/api/v1/assignments/courses/${courseId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].title).toBe('Week 1 assignment');
  });

  it('creates an assignment for an owned course', async () => {
    mockedPrisma.assignment.create.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Week 1 assignment',
      description: 'Build a simple component',
      dueDate: null,
      allowLateSubmission: true,
    });

    const response = await request(createApp())
      .post('/api/v1/assignments')
      .set('Authorization', 'Bearer valid-token')
      .send({
        courseId,
        title: 'Week 1 assignment',
        description: 'Build a simple component',
        dueDate: '2026-01-10T08:00:00.000Z',
        allowLateSubmission: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Week 1 assignment');
  });

  it('creates an assignment without a due date', async () => {
    mockedPrisma.assignment.create.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Reflection assignment',
      description: 'Optional reflection',
      dueDate: null,
      allowLateSubmission: false,
    });

    const response = await request(createApp())
      .post('/api/v1/assignments')
      .set('Authorization', 'Bearer valid-token')
      .send({
        courseId,
        title: 'Reflection assignment',
        description: 'Optional reflection',
        allowLateSubmission: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.dueDate).toBeNull();
  });

  it('updates an assignment', async () => {
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Week 1 assignment',
      description: 'Initial description',
      dueDate: null,
      allowLateSubmission: true,
    });
    mockedPrisma.assignment.update.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Updated assignment',
      description: 'Updated description',
      dueDate: null,
      allowLateSubmission: false,
    });

    const response = await request(createApp())
      .patch(`/api/v1/assignments/${assignmentId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Updated assignment',
        description: 'Updated description',
        allowLateSubmission: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Updated assignment');
  });

  it('deletes an assignment', async () => {
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Week 1 assignment',
    });
    mockedPrisma.assignment.delete.mockResolvedValue({ id: assignmentId });

    const response = await request(createApp())
      .delete(`/api/v1/assignments/${assignmentId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(204);
  });

  it('rejects invalid assignment params', async () => {
    const response = await request(createApp())
      .get('/api/v1/assignments/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('rejects invalid submission params on the shared submission route', async () => {
    const response = await request(createApp())
      .get('/api/v1/assignments/submissions/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('rejects invalid create assignment payloads', async () => {
    const response = await request(createApp())
      .post('/api/v1/assignments')
      .set('Authorization', 'Bearer valid-token')
      .send({
        courseId,
        title: '',
        dueDate: '2026-01-10T08:00:00.000Z',
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('rejects invalid submission list query filters', async () => {
    const response = await request(createApp())
      .get(`/api/v1/assignments/${assignmentId}/submissions`)
      .query({ status: 'INVALID_STATUS' })
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('lists student assignments for an enrolled student', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.assignment.findMany.mockResolvedValue([
      {
        ...studentAssignment,
        submissions: [
          {
            id: submissionId,
            assignmentId,
            studentId: 'student-1',
            textContent: 'Initial answer',
            fileUrl: null,
            fileName: null,
            status: 'ON_TIME',
            isLate: false,
          },
        ],
      },
    ]);

    const response = await request(createApp())
      .get(`/api/v1/assignments/courses/${courseId}/student`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].submissions[0].textContent).toBe('Initial answer');
  });

  it('fetches a student assignment detail with the current submission only', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      ...studentAssignment,
      submissions: [
        {
          id: submissionId,
          assignmentId,
          studentId: 'student-1',
          textContent: 'Initial answer',
          fileUrl: null,
          fileName: null,
          status: 'ON_TIME',
          isLate: false,
        },
      ],
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });

    const response = await request(createApp())
      .get(`/api/v1/assignments/${assignmentId}/student`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(assignmentId);
    expect(response.body.data.submissions).toHaveLength(1);
  });

  it('marks a submission as on time when it is submitted before the deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T07:30:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Week 1 assignment',
      dueDate: new Date('2026-01-10T08:00:00.000Z'),
      allowLateSubmission: false,
      assignment: { courseId },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.submission.findUnique.mockResolvedValue(null);
    mockedPrisma.submission.create.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'ON_TIME',
      isLate: false,
      submittedAt: new Date('2026-01-10T07:30:00.000Z'),
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        textContent: 'My answer',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ON_TIME');
    expect(response.body.data.isLate).toBe(false);
  });

  it('marks a submission as late when the deadline has passed and late submissions are allowed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T09:00:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Week 1 assignment',
      dueDate: new Date('2026-01-10T08:00:00.000Z'),
      allowLateSubmission: true,
      assignment: { courseId },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.submission.findUnique.mockResolvedValue(null);
    mockedPrisma.submission.create.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'LATE',
      isLate: true,
      submittedAt: new Date('2026-01-10T09:00:00.000Z'),
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        textContent: 'My answer',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('LATE');
    expect(response.body.data.isLate).toBe(true);
  });

  it('rejects a submission after the deadline when late submissions are blocked', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T09:00:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Week 1 assignment',
      dueDate: new Date('2026-01-10T08:00:00.000Z'),
      allowLateSubmission: false,
      assignment: { courseId },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        textContent: 'My answer',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Submission deadline has passed');
  });

  it('treats a submission as on time when the assignment has no due date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T09:00:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
      title: 'Open assignment',
      dueDate: null,
      allowLateSubmission: false,
      assignment: { courseId },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.submission.findUnique.mockResolvedValue(null);
    mockedPrisma.submission.create.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'ON_TIME',
      isLate: false,
      submittedAt: new Date('2026-01-10T09:00:00.000Z'),
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        textContent: 'My answer',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ON_TIME');
    expect(response.body.data.isLate).toBe(false);
  });

  it('accepts a file-only submission when a file name is present', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T07:30:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      ...studentAssignment,
      course: { id: courseId },
      instructor: { id: 'instructor-1' },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.submission.findUnique.mockResolvedValue(null);
    mockedPrisma.submission.create.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      textContent: null,
      fileUrl: 'https://files.local/report.pdf',
      fileName: 'report.pdf',
      status: 'ON_TIME',
      isLate: false,
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        fileUrl: 'https://files.local/report.pdf',
        fileName: 'report.pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.fileName).toBe('report.pdf');
  });

  it('accepts a text and file submission together', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T07:30:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      ...studentAssignment,
      course: { id: courseId },
      instructor: { id: 'instructor-1' },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.submission.findUnique.mockResolvedValue(null);
    mockedPrisma.submission.create.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      textContent: 'My answer',
      fileUrl: 'https://files.local/report.pdf',
      fileName: 'report.pdf',
      status: 'ON_TIME',
      isLate: false,
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        textContent: 'My answer',
        fileUrl: 'https://files.local/report.pdf',
        fileName: 'report.pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.textContent).toBe('My answer');
    expect(response.body.data.fileName).toBe('report.pdf');
  });

  it('rejects file submissions without a file name', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        fileUrl: 'https://files.local/report.pdf',
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('replaces prior file data when a student resubmits text only', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T07:45:00.000Z'));
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      ...studentAssignment,
      course: { id: courseId },
      instructor: { id: 'instructor-1' },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.submission.findUnique.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      textContent: 'Old answer',
      fileUrl: 'https://files.local/old.pdf',
      fileName: 'old.pdf',
      status: 'ON_TIME',
      isLate: false,
    });
    mockedPrisma.submission.update.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      textContent: 'Updated answer',
      fileUrl: null,
      fileName: null,
      status: 'ON_TIME',
      isLate: false,
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        textContent: 'Updated answer',
      });

    expect(response.status).toBe(200);
    expect(mockedPrisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          textContent: 'Updated answer',
          fileUrl: null,
          fileName: null,
        }),
      }),
    );
  });

  it('uploads a submission file to Cloudinary for an enrolled student', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.assignment.findUnique.mockResolvedValue({
      id: assignmentId,
      courseId,
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      studentId: 'student-1',
      courseId,
    });
    mockedUploadRawBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/report.pdf',
      publicId: 'lms/assignment-submissions/report-1',
    });

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/upload-file`)
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from('pdf-content'), {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      fileUrl: 'https://cdn.example.com/report.pdf',
      fileName: 'report.pdf',
      publicId: 'lms/assignment-submissions/report-1',
    });
  });

  it('grades a submission and marks it as graded', async () => {
    mockedPrisma.submission.findUnique.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'ON_TIME',
      assignment: {
        courseId,
        instructor: { id: 'instructor-1' },
      },
    });
    mockedPrisma.submission.update.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'GRADED',
      grade: 92,
      feedback: 'Clear structure',
      assignment: {
        courseId,
      },
    });

    const response = await request(createApp())
      .patch(`/api/v1/assignments/submissions/${submissionId}/grade`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        grade: 92,
        feedback: 'Clear structure',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('GRADED');
    expect(response.body.data.grade).toBe(92);
  });

  it('rejects invalid grade payloads', async () => {
    const response = await request(createApp())
      .patch(`/api/v1/assignments/submissions/${submissionId}/grade`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        grade: 101,
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('returns a graded submission', async () => {
    mockedPrisma.submission.findUnique.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'GRADED',
      assignment: {
        courseId,
        instructor: { id: 'instructor-1' },
      },
    });
    mockedPrisma.submission.update.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'RETURNED',
      assignment: {
        courseId,
      },
    });

    const response = await request(createApp())
      .patch(`/api/v1/assignments/submissions/${submissionId}/return`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('RETURNED');
  });

  it('rejects returning a submission before it is graded', async () => {
    mockedPrisma.submission.findUnique.mockResolvedValue({
      id: submissionId,
      assignmentId,
      studentId: 'student-1',
      status: 'ON_TIME',
      assignment: {
        courseId,
        instructor: { id: 'instructor-1' },
      },
    });

    const response = await request(createApp())
      .patch(`/api/v1/assignments/submissions/${submissionId}/return`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Submission must be graded before it can be returned');
  });

  it('rejects unsupported submission file types', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .post(`/api/v1/assignments/${assignmentId}/upload-file`)
      .set('Authorization', 'Bearer valid-token')
      .attach('file', Buffer.from('binary'), {
        filename: 'app.exe',
        contentType: 'application/octet-stream',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Only image uploads are allowed');
  });
});
