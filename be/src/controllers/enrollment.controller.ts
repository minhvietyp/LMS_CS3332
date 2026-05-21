import { Request, Response } from 'express';
import { EnrollmentService } from '../services/enrollment.service';
import { ApiResponse } from '@shared/utils/ApiResponse';
import { EnrollmentStatus } from '@prisma/client';

const enrollmentService = new EnrollmentService();

export class EnrollmentController {
  async enroll(req: Request, res: Response) {
    const result = await enrollmentService.enroll(req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Student enrolled successfully');
  }

  async unenroll(req: Request, res: Response) {
    await enrollmentService.unenroll(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, null, 'Student unenrolled successfully');
  }

  async updateStatus(req: Request, res: Response) {
    const result = await enrollmentService.updateStatus(
      req.params.id,
      req.user!.sub,
      req.user!.role,
      req.body.status as EnrollmentStatus,
    );
    return ApiResponse.success(res, result, 'Enrollment status updated successfully');
  }

  async listByCourse(req: Request, res: Response) {
    const result = await enrollmentService.listByCourse(req.params.courseId, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Course enrollments retrieved successfully');
  }

  async listMyCourses(req: Request, res: Response) {
    const result = await enrollmentService.listByStudent(req.user!.sub);
    return ApiResponse.success(res, result, 'My enrolled courses retrieved successfully');
  }

  async getMyCourseStatus(req: Request, res: Response) {
    const result = await enrollmentService.getMyEnrollmentStatus(req.params.courseId, req.user!.sub);
    return ApiResponse.success(res, result, 'Course enrollment status retrieved successfully');
  }
}
