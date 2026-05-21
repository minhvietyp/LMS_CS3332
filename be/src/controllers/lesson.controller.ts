import { Request, Response } from 'express';
import { LessonService } from '../services/lesson.service';
import { ApiResponse } from '@shared/utils/ApiResponse';
import { BadRequestError } from '@shared/errors/AppError';

const lessonService = new LessonService();

export class LessonController {
  // Modules
  async listCourseModules(req: Request, res: Response) {
    const result = await lessonService.listCourseModules(req.params.courseId, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Modules loaded successfully');
  }

  async createModule(req: Request, res: Response) {
    const result = await lessonService.createModule(req.params.courseId, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Module created successfully');
  }

  async updateModule(req: Request, res: Response) {
    const result = await lessonService.updateModule(req.params.id, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Module updated successfully');
  }

  async reorderModules(req: Request, res: Response) {
    const result = await lessonService.reorderModules(req.params.courseId, req.body.modules, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Modules reordered successfully');
  }

  async deleteModule(req: Request, res: Response) {
    await lessonService.deleteModule(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, null, 'Module deleted successfully');
  }

  // Lessons
  async createLesson(req: Request, res: Response) {
    const result = await lessonService.createLesson(req.params.moduleId, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Lesson created successfully');
  }

  async getLessonById(req: Request, res: Response) {
    const result = await lessonService.getLessonById(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Lesson loaded successfully');
  }

  async updateLesson(req: Request, res: Response) {
    const result = await lessonService.updateLesson(req.params.id, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Lesson updated successfully');
  }

  async reorderLessons(req: Request, res: Response) {
    const result = await lessonService.reorderLessons(req.params.moduleId, req.body.lessons, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Lessons reordered successfully');
  }

  async deleteLesson(req: Request, res: Response) {
    await lessonService.softDeleteLesson(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, null, 'Lesson deleted successfully');
  }

  // Materials
  async listMaterials(req: Request, res: Response) {
    const result = await lessonService.listMaterials(req.params.lessonId, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, result, 'Materials loaded successfully');
  }

  async addMaterial(req: Request, res: Response) {
    const result = await lessonService.addMaterial(req.params.lessonId, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Material added successfully');
  }

  async uploadMaterial(req: Request, res: Response) {
    if (!req.file) {
      throw BadRequestError('Material file is required');
    }

    const result = await lessonService.uploadMaterial(req.params.lessonId, req.file, req.body, req.user!.sub, req.user!.role);
    return ApiResponse.created(res, result, 'Material uploaded successfully');
  }

  async deleteMaterial(req: Request, res: Response) {
    await lessonService.deleteMaterial(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, null, 'Material deleted successfully');
  }
}
