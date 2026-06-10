import prisma from '@config/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '@shared/errors/AppError';
import { Assignment, Prisma, Submission, SubmissionStatus } from '@prisma/client';
import { pickDefined } from '@shared/utils/helpers';
import { USER_ROLES } from '@shared/constants';
import { uploadRawBuffer } from '@shared/utils/cloudinary';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { SubmissionRepository } from '../repositories/submission.repository';

interface CreateAssignmentData {
  courseId: string;
  title: string;
  description?: string | null;
  dueDate: Date | string;
  allowLateSubmission?: boolean;
}

type UpdateAssignmentData = Partial<Omit<CreateAssignmentData, 'courseId'>>;

interface SubmitAssignmentData {
  textContent?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}

interface GradeSubmissionData {
  grade: number | string;
  feedback?: string | null;
}

export class AssignmentService {
  private assignmentRepo = new AssignmentRepository();
  private submissionRepo = new SubmissionRepository();

  private resolveSubmissionTiming(
    assignment: Pick<Assignment, 'dueDate' | 'allowLateSubmission'>,
    now: Date,
  ) {
    if (!assignment.dueDate || now <= assignment.dueDate) {
      return {
        isLate: false,
        status: SubmissionStatus.ON_TIME,
      };
    }

    if (!assignment.allowLateSubmission) {
      throw BadRequestError('Submission deadline has passed');
    }

    return {
      isLate: true,
      status: SubmissionStatus.LATE,
    };
  }

  // ─── Assignment CRUD ───────────────────────────────────────────────────────

  async listByCourse(courseId: string, userId: string, userRole: string) {
    await this.checkCourseOwnership(courseId, userId, userRole);
    return this.assignmentRepo.findByCourseId(courseId);
  }

  async getById(id: string, userId: string, userRole: string) {
    const assignment = await this.assignmentRepo.findById(id);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);
    return assignment;
  }

  async create(
    data: CreateAssignmentData,
    instructorId: string,
    userRole: string,
  ): Promise<Assignment> {
    await this.checkCourseOwnership(data.courseId, instructorId, userRole);

    return this.assignmentRepo.create({
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      allowLateSubmission: data.allowLateSubmission ?? true,
      createdBy: instructorId,
    } satisfies Prisma.AssignmentUncheckedCreateInput);
  }

  async update(
    id: string,
    data: UpdateAssignmentData,
    userId: string,
    userRole: string,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findById(id);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);

    return this.assignmentRepo.update(
      id,
      pickDefined({
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        allowLateSubmission: data.allowLateSubmission,
      }),
    );
  }

  async softDelete(id: string, userId: string, userRole: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findById(id);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);
    return this.assignmentRepo.softDelete(id, userId);
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const assignment = await this.assignmentRepo.findById(id);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);
    await this.assignmentRepo.delete(id);
  }

  async getStatistics(assignmentId: string, userId: string, userRole: string) {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);
    return this.assignmentRepo.getStatistics(assignmentId);
  }

  // ─── Submission Management ────────────────────────────────────────────────

  async submitAssignment(
    assignmentId: string,
    studentId: string,
    data: SubmitAssignmentData,
  ): Promise<Submission> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: true,
        instructor: true,
      },
    });
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.ensureStudentEnrollment(assignment.courseId, studentId);

    // Check deadline
    const now = new Date();
    const timing = this.resolveSubmissionTiming(assignment, now);

    // Check for existing submission
    const existingSubmission = await this.submissionRepo.findByAssignmentAndStudent(
      assignmentId,
      studentId,
    );

    const submissionData: Prisma.SubmissionUncheckedCreateInput = {
      assignmentId,
      studentId,
      textContent: data.textContent ?? null,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      isLate: timing.isLate,
      submittedAt: now,
      status: timing.status,
    };

    if (existingSubmission) {
      return this.submissionRepo.update(existingSubmission.id, submissionData);
    }

    return this.submissionRepo.create(submissionData);
  }

  async uploadSubmissionFile(assignmentId: string, studentId: string, file: Express.Multer.File) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.ensureStudentEnrollment(assignment.courseId, studentId);

    const uploaded = await uploadRawBuffer(file.buffer, 'lms/assignment-submissions');

    return {
      fileUrl: uploaded.secureUrl,
      fileName: file.originalname,
      publicId: uploaded.publicId,
    };
  }

  async listStudentAssignments(courseId: string, studentId: string) {
    await this.ensureStudentEnrollment(courseId, studentId);

    return prisma.assignment.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      include: {
        submissions: {
          where: {
            studentId,
            deletedAt: null,
          },
          orderBy: {
            submittedAt: 'desc',
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async getStudentAssignmentById(assignmentId: string, studentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        submissions: {
          where: {
            studentId,
            deletedAt: null,
          },
          orderBy: {
            submittedAt: 'desc',
          },
        },
      },
    });
    if (!assignment || assignment.deletedAt) throw NotFoundError('Assignment not found');

    await this.ensureStudentEnrollment(assignment.courseId, studentId);
    return assignment;
  }

  async getSubmission(submissionId: string, userId: string, userRole: string): Promise<Submission> {
    const submission = await this.submissionRepo.findById(submissionId);
    if (!submission) throw NotFoundError('Submission not found');

    // Check authorization: student can view own, instructor/admin can view course submissions
    const isOwnSubmission = submission.studentId === userId;
    const isInstructor =
      userRole === USER_ROLES.INSTRUCTOR && submission.assignment.instructor.id === userId;
    const isAdmin = userRole === USER_ROLES.ADMIN;

    if (!isOwnSubmission && !isInstructor && !isAdmin) {
      throw ForbiddenError('Access denied');
    }

    return submission;
  }

  async listSubmissionsByAssignment(
    assignmentId: string,
    userId: string,
    userRole: string,
    filters?: Prisma.SubmissionWhereInput,
  ): Promise<Submission[]> {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);

    return this.submissionRepo.findByAssignmentId(assignmentId, filters);
  }

  async listStudentSubmissions(studentId: string, courseId: string): Promise<Submission[]> {
    return this.submissionRepo.findByStudentAndCourse(studentId, courseId);
  }

  async gradeSubmission(
    submissionId: string,
    instructorId: string,
    userRole: string,
    data: GradeSubmissionData,
  ): Promise<Submission> {
    const submission = await this.submissionRepo.findById(submissionId);
    if (!submission) throw NotFoundError('Submission not found');

    await this.checkCourseOwnership(submission.assignment.courseId, instructorId, userRole);

    // Validate grade
    const grade = parseInt(String(data.grade), 10);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      throw BadRequestError('Grade must be a number between 0 and 100');
    }

    return this.submissionRepo.update(submissionId, {
      grade,
      feedback: data.feedback,
      gradedAt: new Date(),
      gradedBy: instructorId,
      status: SubmissionStatus.GRADED,
    });
  }

  async returnSubmission(
    submissionId: string,
    instructorId: string,
    userRole: string,
  ): Promise<Submission> {
    const submission = await this.submissionRepo.findById(submissionId);
    if (!submission) throw NotFoundError('Submission not found');

    await this.checkCourseOwnership(submission.assignment.courseId, instructorId, userRole);

    if (submission.status !== SubmissionStatus.GRADED) {
      throw BadRequestError('Submission must be graded before it can be returned');
    }

    return this.submissionRepo.update(submissionId, {
      status: SubmissionStatus.RETURNED,
    });
  }

  async getSubmissionStatistics(assignmentId: string, userId: string, userRole: string) {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw NotFoundError('Assignment not found');

    await this.checkCourseOwnership(assignment.courseId, userId, userRole);
    return this.submissionRepo.getStatisticsByAssignment(assignmentId);
  }

  async getStudentAssignmentStatistics(studentId: string, courseId: string) {
    return this.submissionRepo.getStatisticsByStudent(studentId, courseId);
  }

  // ─── Authorization ────────────────────────────────────────────────────────

  private async checkCourseOwnership(
    courseId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw NotFoundError('Course not found');

    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('Access denied');
    }
  }

  private async ensureStudentEnrollment(courseId: string, studentId: string): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });
    if (!enrollment) throw ForbiddenError('Student not enrolled in course');
  }
}
