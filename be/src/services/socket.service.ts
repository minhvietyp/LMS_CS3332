import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '@shared/utils/jwt';
import logger from '@config/logger';

export class SocketService {
  private static io: Server;
  private static userSocketMap: Map<string, string> = new Map(); // userId -> socketId

  static init(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      try {
        const payload = verifyAccessToken(token);
        socket.data.user = payload;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user.sub;
      this.userSocketMap.set(userId, socket.id);
      logger.info(`User connected: ${userId} (${socket.id})`);

      socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        logger.debug(`User ${userId} joined room ${roomId}`);
      });

      socket.on('disconnect', () => {
        this.userSocketMap.delete(userId);
        logger.info(`User disconnected: ${userId}`);
      });
    });
  }

  static sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  static sendToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }
}
