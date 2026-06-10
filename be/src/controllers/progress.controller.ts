import { Request, Response } from 'express';
import { ProgressService } from '../services/progress.service';
import { ApiResponse } from '@shared/utils/ApiResponse';

const progressService = new ProgressService();

export class ProgressController {
  async markComplete(req: Request, res: Response) {
    const { isCompleted } = req.body;
    const result = await progressService.markComplete(
      req.params.lessonId,
      req.user!.sub,
      isCompleted,
    );
    return ApiResponse.success(res, result, 'Lesson progress updated successfully');
  }

  async setState(req: Request, res: Response) {
    const { state } = req.body;
    const result = await progressService.setLessonState(req.params.lessonId, req.user!.sub, state);
    return ApiResponse.success(res, result, 'Lesson state updated successfully');
  }

  async getMyProgress(req: Request, res: Response) {
    const result = await progressService.getCourseProgress(req.params.courseId, req.user!.sub);
    return ApiResponse.success(res, result, 'Course progress retrieved successfully');
  }

  async getStudentProgress(req: Request, res: Response) {
    const result = await progressService.getInstructorCourseProgress(
      req.params.courseId,
      req.user!,
      req.query,
    );
    return ApiResponse.success(res, result, 'Instructor course progress retrieved successfully');
  }

  async getStudentCourseProgressDetail(req: Request, res: Response) {
    const result = await progressService.getInstructorStudentCourseProgress(
      req.params.courseId,
      req.params.studentId,
      req.user!,
    );
    return ApiResponse.success(
      res,
      result,
      'Student course progress detail retrieved successfully',
    );
  }

  async getAdminOverview(req: Request, res: Response) {
    const result = await progressService.getAdminProgressOverview();
    return ApiResponse.success(res, result, 'Admin progress overview retrieved successfully');
  }

  async getAdminCourseProgressList(req: Request, res: Response) {
    const result = await progressService.getAdminCourseProgressList(req.query);
    return ApiResponse.success(res, result, 'Admin course progress list retrieved successfully');
  }

  async getMyHistory(req: Request, res: Response) {
    const result = await progressService.getMyProgressHistory(req.user!.sub, req.query);
    return ApiResponse.success(res, result, 'Progress history retrieved successfully');
  }

  async getCourseHistory(req: Request, res: Response) {
    const result = await progressService.getCourseProgressHistory(
      req.params.courseId,
      req.user!,
      req.query,
    );
    return ApiResponse.success(res, result, 'Course progress history retrieved successfully');
  }

  async getStudentCourseHistory(req: Request, res: Response) {
    const result = await progressService.getStudentCourseProgressHistory(
      req.params.courseId,
      req.params.studentId,
      req.user!,
      req.query,
    );
    return ApiResponse.success(
      res,
      result,
      'Student course progress history retrieved successfully',
    );
  }

  async getOverview(req: Request, res: Response) {
    const result = await progressService.getProgressOverview(req.user!.sub);
    return ApiResponse.success(res, result, 'Progress overview retrieved successfully');
  }

  async getOverviewSummary(req: Request, res: Response) {
    const result = await progressService.getProgressOverviewSummary(req.user!.sub);
    return ApiResponse.success(res, result, 'Progress summary retrieved successfully');
  }

  async getActivityTimeline(req: Request, res: Response) {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await progressService.getActivityTimeline(req.user!.sub, limit, offset);
    return ApiResponse.success(res, result, 'Activity timeline retrieved successfully');
  }
}
