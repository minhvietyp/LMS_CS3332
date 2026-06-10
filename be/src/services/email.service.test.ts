import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn(() => ({
    sendMail: sendMailMock,
  }));

  return {
    prismaMock: {
      emailLog: {
        create: vi.fn(),
      },
    },
    sendMailMock,
    createTransportMock,
  };
});

vi.mock('@config/index', () => ({
  config: {
    email: {
      host: 'smtp.example.com',
      port: 587,
      user: 'smtp-user',
      pass: 'smtp-pass',
      from: 'noreply@lms.local',
    },
  },
}));

vi.mock('@config/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import prisma from '@config/prisma';
import { EmailService } from './email.service';

const mockedPrisma = prisma as any;

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends and logs an enrollment email', async () => {
    mockedPrisma.emailLog.create.mockResolvedValue({ id: 'email-log-1' });
    sendMailMock.mockResolvedValue(undefined);

    const service = new EmailService();
    const result = await service.sendEnrollmentEmail({
      userId: 'student-1',
      recipient: 'student@example.com',
      studentName: 'Student One',
      courseTitle: 'React Basics',
      action: 'enrolled',
    });

    expect(createTransportMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'noreply@lms.local',
      to: 'student@example.com',
      subject: 'You were enrolled in "React Basics"',
      text: 'Hi Student One, you have been enrolled in React Basics.',
      html: '<p>Hi Student One, you have been enrolled in React Basics.</p>',
    });
    expect(mockedPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'student-1',
        recipient: 'student@example.com',
        subject: 'You were enrolled in "React Basics"',
        template: 'enrollment-enrolled',
        status: 'sent',
      }),
    });
    expect(result.id).toBe('email-log-1');
  });

  it('logs course completion emails', async () => {
    mockedPrisma.emailLog.create.mockResolvedValue({ id: 'email-log-2' });
    sendMailMock.mockResolvedValue(undefined);

    const service = new EmailService();
    await service.sendCourseCompletedEmail({
      userId: 'student-1',
      recipient: 'student@example.com',
      studentName: 'Student One',
      courseTitle: 'React Basics',
      completedLessons: 8,
      totalLessons: 8,
    });

    expect(mockedPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        template: 'course-completed',
        status: 'sent',
      }),
    });
  });
});
