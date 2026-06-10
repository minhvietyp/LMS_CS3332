import prisma from '@config/prisma';
import { NotFoundError } from '@shared/errors/AppError';
import { ChatMessage, ChatRoom } from '@prisma/client';
import { SocketService } from '@services/socket.service';
import { CHATROOM_TYPE } from '@shared/constants';

export class ChatService {
  async sendMessage(roomId: string, senderId: string, content: string): Promise<ChatMessage> {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room) throw NotFoundError('Chat room not found');

    const message = await prisma.chatMessage.create({
      data: { roomId, senderId, content },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Realtime broadcast
    SocketService.sendToRoom(roomId, 'new-message', message);

    return message;
  }

  async getMessages(
    roomId: string,
    query: { limit?: string; before?: string } = {},
  ): Promise<ChatMessage[]> {
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '50'), 10)));
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return messages.reverse();
  }

  async getRooms(userId: string): Promise<ChatRoom[]> {
    return prisma.chatRoom.findMany({
      where: { members: { some: { userId } } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createDirectRoom(user1: string, user2: string): Promise<ChatRoom> {
    // Check if room exists
    const existing = await prisma.chatRoom.findFirst({
      where: {
        type: CHATROOM_TYPE.DIRECT,
        members: { every: { userId: { in: [user1, user2] } } },
      },
    });

    if (existing) return existing;

    return prisma.chatRoom.create({
      data: {
        type: CHATROOM_TYPE.DIRECT,
        members: {
          create: [{ userId: user1 }, { userId: user2 }],
        },
      },
    });
  }
}
