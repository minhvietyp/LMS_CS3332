import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { ApiResponse } from '@shared/utils/ApiResponse';

const chatService = new ChatService();

export class ChatController {
  async getRooms(req: Request, res: Response) {
    const result = await chatService.getRooms(req.user!.sub);
    return ApiResponse.success(res, result, 'Rooms retrieved successfully');
  }

  async getMessages(req: Request, res: Response) {
    const result = await chatService.getMessages(req.params.roomId, req.query);
    return ApiResponse.success(res, result, 'Messages retrieved successfully');
  }

  async createDirectRoom(req: Request, res: Response) {
    const { userId } = req.body;
    const result = await chatService.createDirectRoom(req.user!.sub, userId);
    return ApiResponse.created(res, result, 'Room created successfully');
  }

  async sendMessage(req: Request, res: Response) {
    const { content } = req.body;
    const result = await chatService.sendMessage(req.params.roomId, req.user!.sub, content);
    return ApiResponse.created(res, result, 'Message sent successfully');
  }
}
