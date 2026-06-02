import { io, type Socket } from 'socket.io-client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const socketBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, '');

let chatSocket: Socket | null = null;

export function connectChatSocket(token: string) {
  if (!token) {
    return null;
  }

  if (!chatSocket) {
    chatSocket = io(socketBaseUrl, {
      autoConnect: true,
      auth: { token },
      transports: ['websocket'],
    });
  }

  return chatSocket;
}

export function joinChatRoom(roomId: string) {
  chatSocket?.emit('join-room', roomId);
}

export function subscribeToRoomMessages(handler: (message: unknown) => void) {
  chatSocket?.on('new-message', handler);

  return () => {
    chatSocket?.off('new-message', handler);
  };
}

export function disconnectChatSocket() {
  chatSocket?.disconnect();
  chatSocket = null;
}
