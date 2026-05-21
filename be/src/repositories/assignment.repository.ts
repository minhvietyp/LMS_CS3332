// @ts-nocheck
import prisma from '@config/prisma';
import { Assignment, Prisma } from '@prisma/client';

export class AssignmentRepository {
  async findById(id: string): Promise<Assignment | null> {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        course: true,
        instructor: true,
        submissions: true,
      },
    });
  }

  async findByCourseId(courseId: string, filters?: Prisma.AssignmentWhereInput): Promise<Assignment[]> {
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

  async create(data: Prisma.AssignmentCreateInput): Promise<Assignment> {
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
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
    });

    const totalSubmissions = submissions.length;
    const onTimeSubmissions = submissions.filter(s => !s.isLate).length;
    const lateSubmissions = submissions.filter(s => s.isLate).length;
    const gradedSubmissions = submissions.filter(s => s.grade !== null).length;
    const grades = submissions.filter(s => s.grade !== null).map(s => s.grade!);
    const averageGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

    return {
      totalSubmissions,
      onTimeSubmissions,
      lateSubmissions,
      gradedSubmissions,
      averageGrade: Math.round(averageGrade * 100) / 100,
      submissionRate: totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0,
    };
  }
}
