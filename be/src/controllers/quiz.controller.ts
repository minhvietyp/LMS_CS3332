import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';
import { ApiResponse } from '@shared/utils/ApiResponse';

const quizService = new QuizService();

export class QuizController {
  async listStudentCourseQuizzes(req: Request, res: Response) {
    const result = await quizService.listStudentCourseQuizzes(req.params.courseId, req.user!.sub);
    return ApiResponse.success(res, result, 'Student quizzes fetched successfully');
  }

  async getStudentQuizDetail(req: Request, res: Response) {
    const result = await quizService.getStudentQuizDetail(req.params.id, req.user!.sub);
    return ApiResponse.success(res, result, 'Student quiz detail fetched successfully');
  }

  async listByCourse(req: Request, res: Response) {
    const result = await quizService.listByCourse(req.params.courseId, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Quizzes fetched successfully');
  }

  async getById(req: Request, res: Response) {
    const result = await quizService.getById(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Quiz fetched successfully');
  }

  async create(req: Request, res: Response) {
    const result = await quizService.create(req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Quiz created successfully');
  }

  async update(req: Request, res: Response) {
    const result = await quizService.update(req.params.id, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Quiz updated successfully');
  }

  async publish(req: Request, res: Response) {
    const result = await quizService.setPublishedState(req.params.id, true, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Quiz published successfully');
  }

  async unpublish(req: Request, res: Response) {
    const result = await quizService.setPublishedState(req.params.id, false, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Quiz moved back to draft successfully');
  }

  async delete(req: Request, res: Response) {
    await quizService.delete(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.noContent(res);
  }

  async addQuestion(req: Request, res: Response) {
    const result = await quizService.addQuestion(req.params.id, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Question added successfully');
  }

  async updateQuestion(req: Request, res: Response) {
    const result = await quizService.updateQuestion(req.params.questionId, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Question updated successfully');
  }

  async deleteQuestion(req: Request, res: Response) {
    await quizService.deleteQuestion(req.params.questionId, req.user!.sub, req.user!.role);
    return ApiResponse.noContent(res);
  }

  async startAttempt(req: Request, res: Response) {
    const result = await quizService.startAttempt(req.params.id, req.user!.sub);
    return ApiResponse.created(res, result, 'Quiz attempt started successfully');
  }

  async listStudentAttempts(req: Request, res: Response) {
    const result = await quizService.listStudentAttempts(req.params.id, req.user!.sub);
    return ApiResponse.success(res, result, 'Quiz attempts fetched successfully');
  }

  async getAttemptResult(req: Request, res: Response) {
    const result = await quizService.getAttemptResult(req.params.id, req.params.attemptId, req.user!.sub);
    return ApiResponse.success(res, result, 'Quiz attempt result fetched successfully');
  }

  async submit(req: Request, res: Response) {
    const result = await quizService.submit(req.params.id, req.body.attemptId, req.user!.sub, req.body.answers);
    return ApiResponse.success(res, result, 'Quiz submitted successfully');
  }
}
