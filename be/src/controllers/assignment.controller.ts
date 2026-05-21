import { Request, Response } from 'express';
import { AssignmentService } from '../services/assignment.service';
import { ApiResponse } from '@shared/utils/ApiResponse';
import { BadRequestError } from '@shared/errors/AppError';

const assignmentService = new AssignmentService();

export class AssignmentController {
  // ─── Assignment Management ─────────────────────────────────────────────

  async listByCourse(req: Request, res: Response) {
    const result = await assignmentService.listByCourse(
      req.params.courseId,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.success(res, result, 'Assignments fetched successfully');
  }

  async getById(req: Request, res: Response) {
    const result = await assignmentService.getById(
      req.params.id,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.success(res, result, 'Assignment fetched successfully');
  }

  async create(req: Request, res: Response) {
    const result = await assignmentService.create(
      req.body,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.created(res, result, 'Assignment created successfully');
  }

  async update(req: Request, res: Response) {
    const result = await assignmentService.update(
      req.params.id,
      req.body,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.success(res, result, 'Assignment updated successfully');
  }

  async delete(req: Request, res: Response) {
    await assignmentService.softDelete(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.noContent(res);
  }

  async getStatistics(req: Request, res: Response) {
    const result = await assignmentService.getStatistics(
      req.params.id,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.success(res, result, 'Assignment statistics fetched');
  }

  // ─── Submission Management ────────────────────────────────────────────

  async submitAssignment(req: Request, res: Response) {
    const result = await assignmentService.submitAssignment(
      req.params.id,
      req.user!.sub,
      req.body
    );
    return ApiResponse.success(res, result, 'Assignment submitted successfully');
  }

  async uploadSubmissionFile(req: Request, res: Response) {
    if (!req.file) {
      throw BadRequestError('Submission file is required');
    }

    const result = await assignmentService.uploadSubmissionFile(
      req.params.id,
      req.user!.sub,
      req.file,
    );
    return ApiResponse.created(res, result, 'Submission file uploaded successfully');
  }

  async listStudentAssignments(req: Request, res: Response) {
    const result = await assignmentService.listStudentAssignments(
      req.params.courseId,
      req.user!.sub,
    );
    return ApiResponse.success(res, result, 'Assignments fetched successfully');
  }

  async getStudentAssignmentById(req: Request, res: Response) {
    const result = await assignmentService.getStudentAssignmentById(
      req.params.id,
      req.user!.sub,
    );
    return ApiResponse.success(res, result, 'Assignment fetched successfully');
  }

  async getSubmission(req: Request, res: Response) {
    const result = await assignmentService.getSubmission(
      req.params.submissionId,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.success(res, result, 'Submission fetched successfully');
  }

  async listSubmissionsByAssignment(req: Request, res: Response) {
    const result = await assignmentService.listSubmissionsByAssignment(
      req.params.id,
      req.user!.sub,
      req.user!.role,
      req.query
    );
    return ApiResponse.success(res, result, 'Submissions fetched successfully');
  }

  async listStudentSubmissions(req: Request, res: Response) {
    const result = await assignmentService.listStudentSubmissions(
      req.user!.sub,
      req.params.courseId
    );
    return ApiResponse.success(res, result, 'Submissions fetched successfully');
  }

  async gradeSubmission(req: Request, res: Response) {
    const result = await assignmentService.gradeSubmission(
      req.params.submissionId,
      req.user!.sub,
      req.user!.role,
      req.body
    );
    return ApiResponse.success(res, result, 'Submission graded successfully');
  }

  async returnSubmission(req: Request, res: Response) {
    const result = await assignmentService.returnSubmission(
      req.params.submissionId,
      req.user!.sub,
      req.user!.role,
    );
    return ApiResponse.success(res, result, 'Submission returned successfully');
  }

  async getSubmissionStatistics(req: Request, res: Response) {
    const result = await assignmentService.getSubmissionStatistics(
      req.params.id,
      req.user!.sub,
      req.user!.role
    );
    return ApiResponse.success(res, result, 'Submission statistics fetched');
  }
}
