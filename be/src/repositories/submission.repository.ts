// @ts-nocheck
import prisma from '@config/prisma';
import { Submission, Prisma, SubmissionStatus } from '@prisma/client';

export class SubmissionRepository {
  async findById(id: string): Promise<Submission | null> {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: { course: true, instructor: true },
        },
        student: true,
        gradedByUser: true,
      },
    });
  }

  async findByAssignmentAndStudent(
    assignmentId: string,
    studentId: string
  ): Promise<Submission | null> {
    return prisma.submission.findUnique({
      where: {
        assignmentId_studentId: { assignmentId, studentId },
      },
      include: {
        assignment: {
          include: { course: true },
        },
        student: true,
        gradedByUser: true,
      },
    });
  }

  async findByAssignmentId(
    assignmentId: string,
    filters?: Prisma.SubmissionWhereInput
  ): Promise<Submission[]> {
    return prisma.submission.findMany({
      where: {
        assignmentId,
        deletedAt: null,
        ...filters,
      },
      include: {
        student: true,
        gradedByUser: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findByStudentId(studentId: string): Promise<Submission[]> {
    return prisma.submission.findMany({
      where: {
        studentId,
        deletedAt: null,
      },
      include: {
        assignment: {
          include: { course: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findByStudentAndCourse(
    studentId: string,
    courseId: string
  ): Promise<Submission[]> {
    return prisma.submission.findMany({
      where: {
        studentId,
        deletedAt: null,
        assignment: {
          courseId,
        },
      },
      include: {
        assignment: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async create(data: Prisma.SubmissionCreateInput): Promise<Submission> {
    return prisma.submission.create({
      data,
      include: {
        assignment: {
          include: { course: true, instructor: true },
        },
        student: true,
        gradedByUser: true,
      },
    });
  }

  async update(id: string, data: Prisma.SubmissionUpdateInput): Promise<Submission> {
    return prisma.submission.update({
      where: { id },
      data,
      include: {
        assignment: {
          include: { course: true },
        },
        student: true,
        gradedByUser: true,
      },
    });
  }

  async upsert(
    assignmentId: string,
    studentId: string,
    data: Prisma.SubmissionCreateInput
  ): Promise<Submission> {
    return prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: data as Prisma.SubmissionUpdateInput,
      create: data,
      include: {
        assignment: {
          include: { course: true, instructor: true },
        },
        student: true,
        gradedByUser: true,
      },
    });
  }

  async softDelete(id: string): Promise<Submission> {
    return prisma.submission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async delete(id: string): Promise<Submission> {
    return prisma.submission.delete({
      where: { id },
    });
  }

  async getStatisticsByAssignment(assignmentId: string) {
    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId,
        deletedAt: null,
      },
    });

    const totalSubmissions = submissions.length;
    const onTimeCount = submissions.filter(s => s.status === SubmissionStatus.ON_TIME).length;
    const lateCount = submissions.filter(s => s.status === SubmissionStatus.LATE).length;
    const gradedCount = submissions.filter(s => s.grade !== null).length;
    const grades = submissions.filter(s => s.grade !== null).map(s => s.grade!);
    const averageGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

    return {
      totalSubmissions,
      onTimeSubmissions: onTimeCount,
      lateSubmissions: lateCount,
      gradedSubmissions: gradedCount,
      averageGrade: Math.round(averageGrade * 100) / 100,
      submissionRate:
        totalSubmissions > 0 ? Math.round((totalSubmissions / totalSubmissions) * 100) : 0,
    };
  }

  async getStatisticsByStudent(studentId: string, courseId: string) {
    const submissions = await prisma.submission.findMany({
      where: {
        studentId,
        deletedAt: null,
        assignment: {
          courseId,
        },
      },
      include: {
        assignment: true,
      },
    });

    const totalAssignments = await prisma.assignment.count({
      where: {
        courseId,
        deletedAt: null,
      },
    });

    const grades = submissions.filter(s => s.grade !== null).map(s => s.grade!);
    const averageGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

    return {
      submittedCount: submissions.length,
      totalAssignments,
      submissionRate: Math.round((submissions.length / totalAssignments) * 100),
      averageGrade: Math.round(averageGrade * 100) / 100,
      onTimeCount: submissions.filter(s => !s.isLate).length,
      lateCount: submissions.filter(s => s.isLate).length,
    };
  }
}
