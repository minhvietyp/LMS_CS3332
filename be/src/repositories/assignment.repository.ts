import prisma from '@config/prisma';
import { Assignment, Prisma } from '@prisma/client';

type AssignmentWithDetails = Prisma.AssignmentGetPayload<{
  include: {
    course: true;
    instructor: true;
    submissions: true;
  };
}>;

export class AssignmentRepository {
  async findById(id: string): Promise<AssignmentWithDetails | null> {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        course: true,
        instructor: true,
        submissions: true,
      },
    });
  }

  async findByCourseId(
    courseId: string,
    filters?: Prisma.AssignmentWhereInput,
  ): Promise<Assignment[]> {
    return prisma.assignment.findMany({
      where: {
        courseId,
        deletedAt: null,
        ...filters,
      },
      include: {
        course: true,
        instructor: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findMany(where: Prisma.AssignmentWhereInput): Promise<Assignment[]> {
    return prisma.assignment.findMany({
      where: {
        deletedAt: null,
        ...where,
      },
      include: {
        course: true,
        instructor: true,
      },
    });
  }

  async create(data: Prisma.AssignmentUncheckedCreateInput): Promise<Assignment> {
    return prisma.assignment.create({
      data,
      include: {
        course: true,
        instructor: true,
      },
    });
  }

  async update(id: string, data: Prisma.AssignmentUpdateInput): Promise<Assignment> {
    return prisma.assignment.update({
      where: { id },
      data,
      include: {
        course: true,
        instructor: true,
      },
    });
  }

  async softDelete(id: string, deletedBy: string): Promise<Assignment> {
    return prisma.assignment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
      include: {
        course: true,
        instructor: true,
      },
    });
  }

  async delete(id: string): Promise<Assignment> {
    return prisma.assignment.delete({
      where: { id },
    });
  }

  async getStatistics(assignmentId: string) {
    const [totalSubmissions, onTimeSubmissions, lateSubmissions, gradedSubmissions, gradeStats] =
      await Promise.all([
        prisma.submission.count({ where: { assignmentId } }),
        prisma.submission.count({ where: { assignmentId, isLate: false } }),
        prisma.submission.count({ where: { assignmentId, isLate: true } }),
        prisma.submission.count({ where: { assignmentId, grade: { not: null } } }),
        prisma.submission.aggregate({
          where: { assignmentId, grade: { not: null } },
          _avg: { grade: true },
        }),
      ]);
    const averageGrade = gradeStats._avg.grade ?? 0;

    return {
      totalSubmissions,
      onTimeSubmissions,
      lateSubmissions,
      gradedSubmissions,
      averageGrade: Math.round(averageGrade * 100) / 100,
      submissionRate:
        totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0,
    };
  }
}
