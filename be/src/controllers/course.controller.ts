import { Request, Response } from 'express';
import { CourseService } from '../services/course.service';
import { ApiResponse } from '@shared/utils/ApiResponse';
import { BadRequestError } from '@shared/errors/AppError';

const courseService = new CourseService();

export class CourseController {
  async listPublic(req: Request, res: Response) {
    const result = await courseService.listPublic(req.query);
    return ApiResponse.success(
      res,
      result.data,
      'Public courses retrieved successfully',
      200,
      result.meta,
    );
  }

  async getPublicById(req: Request, res: Response) {
    const course = await courseService.getPublicById(req.params.id);
    return ApiResponse.success(res, course, 'Public course retrieved successfully');
  }

  async list(req: Request, res: Response) {
    const result = await courseService.list(req.query, req.user!);
    return ApiResponse.success(
      res,
      result.data,
      'Courses retrieved successfully',
      200,
      result.meta,
    );
  }

  async getById(req: Request, res: Response) {
    const course = await courseService.getById(req.params.id, req.user!);
    return ApiResponse.success(res, course, 'Course retrieved successfully');
  }

  async listPublishedModules(req: Request, res: Response) {
    const modules = await courseService.listPublishedModules(req.params.id, req.user!);
    return ApiResponse.success(res, modules, 'Published course modules retrieved successfully');
  }

  async listResources(req: Request, res: Response) {
    const resources = await courseService.listResources(req.params.id, req.user!);
    return ApiResponse.success(res, resources, 'Course resources retrieved successfully');
  }

  async create(req: Request, res: Response) {
    const course = await courseService.create(req.body, req.user!.sub, req.file);
    return ApiResponse.created(res, course, 'Course created successfully');
  }

  async update(req: Request, res: Response) {
    const course = await courseService.update(
      req.params.id,
      req.body,
      req.user!.sub,
      req.user!.role,
    );
    return ApiResponse.success(res, course, 'Course updated successfully');
  }

  async publish(req: Request, res: Response) {
    const course = await courseService.publish(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, course, 'Course published successfully');
  }

  async archive(req: Request, res: Response) {
    const course = await courseService.archive(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, course, 'Course archived successfully');
  }

  async updateThumbnail(req: Request, res: Response) {
    if (!req.file) {
      throw BadRequestError('Thumbnail file is required');
    }

    const course = await courseService.updateThumbnail(
      req.params.id,
      req.user!.sub,
      req.user!.role,
      req.file,
    );
    return ApiResponse.success(res, course, 'Course thumbnail updated successfully');
  }

  async delete(req: Request, res: Response) {
    await courseService.softDelete(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, null, 'Course deleted successfully');
  }

  async restore(req: Request, res: Response) {
    const course = await courseService.restore(req.params.id, req.user!.sub, req.user!.role);
    return ApiResponse.success(res, course, 'Course restored successfully');
  }
}
