import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '@shared/utils/ApiResponse';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    return ApiResponse.created(res, result, 'Registration successful');
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    return ApiResponse.success(res, result, 'Login successful');
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    return ApiResponse.success(res, result, 'Token refreshed successfully');
  }

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return ApiResponse.success(res, null, 'Logout successful');
  }

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    return ApiResponse.success(
      res,
      null,
      'If the account exists, a password reset email has been sent',
    );
  }

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    return ApiResponse.success(res, null, 'Password reset successful');
  }
}
