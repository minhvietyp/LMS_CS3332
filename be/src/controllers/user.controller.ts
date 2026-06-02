import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '@shared/utils/ApiResponse';
import { BadRequestError } from '@shared/errors/AppError';

const userService = new UserService();

export class UserController {
  async listPublicInstructors(_req: Request, res: Response) {
    const instructors = await userService.listPublicInstructors();
    return ApiResponse.success(res, instructors, 'Public instructors retrieved successfully');
  }

  async getPublicInstructorById(req: Request, res: Response) {
    const instructor = await userService.getPublicInstructorById(req.params.id);
    return ApiResponse.success(res, instructor, 'Public instructor retrieved successfully');
  }

  async list(req: Request, res: Response) {
    const result = await userService.list(req.query);
    return ApiResponse.success(res, result.data, 'Users retrieved successfully', 200, result.meta);
  }

  async getMe(req: Request, res: Response) {
    const user = await userService.getById(req.user!.sub);
    return ApiResponse.success(res, user, 'Profile retrieved successfully');
  }

  async getMyProfile(req: Request, res: Response) {
    const user = await userService.getById(req.user!.sub);
    return ApiResponse.success(res, user, 'Profile retrieved successfully');
  }

  async getById(req: Request, res: Response) {
    const user = await userService.getById(req.params.id, { includeDeleted: true });
    return ApiResponse.success(res, user, 'User retrieved successfully');
  }

  async create(req: Request, res: Response) {
    const user = await userService.create(req.body);
    return ApiResponse.created(res, user, 'User created successfully');
  }

  async update(req: Request, res: Response) {
    const user = await userService.update(req.params.id, req.body);
    return ApiResponse.success(res, user, 'User updated successfully');
  }

  async updateMe(req: Request, res: Response) {
    const user = await userService.updateMyProfile(req.user!.sub, req.body);
    return ApiResponse.success(res, user, 'Profile updated successfully');
  }

  async updateMyContact(req: Request, res: Response) {
    const user = await userService.updateMyContact(req.user!.sub, req.body);
    return ApiResponse.success(res, user, 'Contact information updated successfully');
  }

  async changeMyPassword(req: Request, res: Response) {
    await userService.changePassword(req.user!.sub, req.body);
    return ApiResponse.success(res, null, 'Password updated successfully');
  }

  async updateAvatar(req: Request, res: Response) {
    if (!req.file) {
      throw BadRequestError('Avatar file is required');
    }

    const user = await userService.updateAvatar(req.user!.sub, req.file);
    return ApiResponse.success(res, user, 'Avatar updated successfully');
  }

  async updateCoverImage(req: Request, res: Response) {
    if (!req.file) {
      throw BadRequestError('Cover image file is required');
    }

    const user = await userService.updateCoverImage(req.user!.sub, req.file);
    return ApiResponse.success(res, user, 'Cover image updated successfully');
  }

  async updateUserAvatar(req: Request, res: Response) {
    if (!req.file) {
      throw BadRequestError('Avatar file is required');
    }

    const user = await userService.updateAvatar(req.params.id, req.file);
    return ApiResponse.success(res, user, 'User avatar updated successfully');
  }

  async softDelete(req: Request, res: Response) {
    await userService.softDelete(req.params.id, req.user!.sub);
    return ApiResponse.success(res, null, 'User deleted successfully');
  }

  async restore(req: Request, res: Response) {
    await userService.restore(req.params.id);
    return ApiResponse.success(res, null, 'User restored successfully');
  }
}
