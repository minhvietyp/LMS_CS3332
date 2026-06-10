import nodemailer from 'nodemailer';
import { EmailLog } from '@prisma/client';
import prisma from '@config/prisma';
import { config } from '@config/index';
import logger from '@config/logger';

type EnrollmentEmailAction = 'enrolled' | 'reactivated' | 'unenrolled';

interface EmailPayload {
  userId?: string;
  recipient: string;
  subject: string;
  template: string;
  html: string;
  text: string;
}

interface EnrollmentEmailParams {
  userId?: string;
  recipient: string;
  courseTitle: string;
  studentName?: string;
  action: EnrollmentEmailAction;
}

interface ProgressEmailParams {
  userId?: string;
  recipient: string;
  courseTitle: string;
  studentName?: string;
  completedLessons: number;
  totalLessons: number;
}

interface PasswordResetEmailParams {
  userId?: string;
  recipient: string;
  userName?: string;
  resetLink: string;
  expiresInMinutes: number;
}

export class EmailService {
  private transporter = this.createTransporter();

  private createTransporter() {
    if (!config.email.host || !config.email.user || !config.email.pass) {
      return null;
    }

    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  private async createLog(data: {
    userId?: string;
    recipient: string;
    subject: string;
    template: string;
    status: 'sent' | 'failed';
    error?: string;
  }): Promise<EmailLog> {
    return prisma.emailLog.create({
      data: {
        userId: data.userId,
        recipient: data.recipient,
        subject: data.subject,
        template: data.template,
        status: data.status,
        sentAt: data.status === 'sent' ? new Date() : null,
        error: data.error,
      },
    });
  }

  private async sendEmail(payload: EmailPayload): Promise<EmailLog> {
    if (!this.transporter) {
      return this.createLog({
        userId: payload.userId,
        recipient: payload.recipient,
        subject: payload.subject,
        template: payload.template,
        status: 'failed',
        error: 'SMTP email transport is not configured',
      });
    }

    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to: payload.recipient,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      return this.createLog({
        userId: payload.userId,
        recipient: payload.recipient,
        subject: payload.subject,
        template: payload.template,
        status: 'sent',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email delivery error';
      logger.error('Email delivery failed', {
        error: message,
        recipient: payload.recipient,
        template: payload.template,
      });

      return this.createLog({
        userId: payload.userId,
        recipient: payload.recipient,
        subject: payload.subject,
        template: payload.template,
        status: 'failed',
        error: message,
      });
    }
  }

  async sendEnrollmentEmail(params: EnrollmentEmailParams): Promise<EmailLog> {
    const subjectMap: Record<EnrollmentEmailAction, string> = {
      enrolled: `You were enrolled in "${params.courseTitle}"`,
      reactivated: `Your enrollment in "${params.courseTitle}" was reactivated`,
      unenrolled: `You were unenrolled from "${params.courseTitle}"`,
    };

    const textMap: Record<EnrollmentEmailAction, string> = {
      enrolled: `Hi${params.studentName ? ` ${params.studentName}` : ''}, you have been enrolled in ${params.courseTitle}.`,
      reactivated: `Hi${params.studentName ? ` ${params.studentName}` : ''}, your enrollment in ${params.courseTitle} has been reactivated.`,
      unenrolled: `Hi${params.studentName ? ` ${params.studentName}` : ''}, you have been unenrolled from ${params.courseTitle}.`,
    };

    const template = `enrollment-${params.action}`;

    return this.sendEmail({
      userId: params.userId,
      recipient: params.recipient,
      subject: subjectMap[params.action],
      template,
      text: textMap[params.action],
      html: `<p>${textMap[params.action]}</p>`,
    });
  }

  async sendCourseCompletedEmail(params: ProgressEmailParams): Promise<EmailLog> {
    const subject = `You completed "${params.courseTitle}"`;
    const text = `Hi${params.studentName ? ` ${params.studentName}` : ''}, you completed ${params.courseTitle}. You finished ${params.completedLessons}/${params.totalLessons} lessons.`;

    return this.sendEmail({
      userId: params.userId,
      recipient: params.recipient,
      subject,
      template: 'course-completed',
      text,
      html: `<p>${text}</p>`,
    });
  }

  async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailLog> {
    const subject = 'Reset your LMS password';
    const greeting = `Hi${params.userName ? ` ${params.userName}` : ''},`;
    const text = `${greeting} use the following link to reset your password: ${params.resetLink}. This link expires in ${params.expiresInMinutes} minutes.`;

    return this.sendEmail({
      userId: params.userId,
      recipient: params.recipient,
      subject,
      template: 'password-reset',
      text,
      html: `<p>${greeting}</p><p>Use the link below to reset your password:</p><p><a href="${params.resetLink}">${params.resetLink}</a></p><p>This link expires in ${params.expiresInMinutes} minutes.</p>`,
    });
  }
}
