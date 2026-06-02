import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Typography,
} from 'antd';
import { MessageSquare, Send } from 'lucide-react';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import {
  createDirectRoomRequest,
  getChatRoomMessagesRequest,
  listMyChatRoomsRequest,
  sendChatMessageRequest,
  type ChatRoomItem,
} from '../../../services/api/chatApi';
import { listPublicInstructorsRequest } from '../../../services/api/authApi';
import { connectChatSocket, joinChatRoom, subscribeToRoomMessages } from '../../../services/sockets/chatSocket';
import './community-chat.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getDirectRoomLabel(room: ChatRoomItem, currentUserId?: string) {
  const otherMember = room.members?.find((member) => member.userId !== currentUserId)?.user;
  return otherMember?.name ?? room.name ?? 'Direct conversation';
}

export function DirectChatPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');

  const roomsQuery = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: listMyChatRoomsRequest,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const directRooms = useMemo(
    () => (roomsQuery.data ?? []).filter((room) => room.type === 'DIRECT'),
    [roomsQuery.data],
  );

  useEffect(() => {
    if (!selectedRoomId && directRooms.length) {
      setSelectedRoomId(directRooms[0].id);
    }
  }, [directRooms, selectedRoomId]);

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', selectedRoomId],
    queryFn: () => getChatRoomMessagesRequest(selectedRoomId!),
    enabled: Boolean(selectedRoomId),
    staleTime: 10 * 1000,
    retry: 1,
  });

  const instructorsQuery = useQuery({
    queryKey: ['chat', 'contact-instructors'],
    queryFn: listPublicInstructorsRequest,
    enabled: user?.role === 'STUDENT',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const createDirectRoomMutation = useMutation({
    mutationFn: createDirectRoomRequest,
    onSuccess: async (room) => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
      setSelectedRoomId(room.id);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { roomId: string; content: string }) =>
      sendChatMessageRequest(payload.roomId, payload.content),
    onSuccess: async (_, variables) => {
      setDraftMessage('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.roomId] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    },
  });

  useEffect(() => {
    if (!token || !selectedRoomId) {
      return;
    }

    connectChatSocket(token);
    joinChatRoom(selectedRoomId);

    const unsubscribe = subscribeToRoomMessages(() => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selectedRoomId] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    });

    return () => {
      unsubscribe?.();
    };
  }, [queryClient, selectedRoomId, token]);

  const selectedRoom = directRooms.find((room) => room.id === selectedRoomId) ?? null;
  const error = roomsQuery.error || messagesQuery.error || createDirectRoomMutation.error || sendMessageMutation.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Direct Chat"
        subtitle="Review one-to-one conversations and keep instructor or learner communication in one workspace."
      >
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load direct chat"
            description={error instanceof Error ? error.message : 'Unexpected error'}
          />
        ) : null}

        <div className="community-chat-grid">
          <div className="community-chat-stack">
            <Card title="Conversations">
              {!directRooms.length ? (
                <Empty description="No direct conversations yet." />
              ) : (
                <List
                  className="community-chat-room-list"
                  dataSource={directRooms}
                  renderItem={(room) => (
                    <List.Item
                      className={
                        room.id === selectedRoomId
                          ? 'community-chat-room-list__item community-chat-room-list__item--active'
                          : 'community-chat-room-list__item'
                      }
                      onClick={() => setSelectedRoomId(room.id)}
                    >
                      <List.Item.Meta
                        avatar={<MessageSquare size={18} />}
                        title={getDirectRoomLabel(room, user?.id)}
                        description={room.messages?.[0]?.content ?? 'No messages yet.'}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>

            {user?.role === 'STUDENT' ? (
              <Card title="Start a conversation">
                {instructorsQuery.data?.length ? (
                  <List
                    dataSource={instructorsQuery.data}
                    renderItem={(instructor) => (
                      <List.Item
                        actions={[
                          <Button
                            key={instructor.id}
                            size="small"
                            onClick={() => createDirectRoomMutation.mutate(instructor.id)}
                          >
                            Open chat
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={instructor.name}
                          description={instructor.occupation ?? instructor.email}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No instructor contacts are available." />
                )}
              </Card>
            ) : null}
          </div>

          <Card
            title={selectedRoom ? getDirectRoomLabel(selectedRoom, user?.id) : 'Conversation'}
            extra={selectedRoom?.messages?.[0]?.createdAt ? formatDate(selectedRoom.messages[0].createdAt) : null}
          >
            {!selectedRoom ? (
              <Empty description="Select a conversation to read or send messages." />
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div className="community-chat-message-list">
                  {(messagesQuery.data ?? []).map((message) => (
                    <article className="community-chat-message" key={message.id}>
                      <div className="community-chat-message__meta">
                        <Typography.Text strong>
                          {message.sender?.name ?? (message.senderId === user?.id ? 'You' : 'Participant')}
                        </Typography.Text>
                        <span>{formatDate(message.createdAt)}</span>
                      </div>
                      <Typography.Paragraph style={{ marginBottom: 0 }}>
                        {message.content}
                      </Typography.Paragraph>
                    </article>
                  ))}
                </div>

                <div className="community-chat-composer">
                  <Input.TextArea
                    rows={3}
                    placeholder="Write your message"
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                  />
                  <Button
                    type="primary"
                    icon={<Send size={16} />}
                    disabled={!draftMessage.trim() || sendMessageMutation.isPending}
                    onClick={() => {
                      if (!selectedRoomId || !draftMessage.trim()) {
                        return;
                      }

                      sendMessageMutation.mutate({
                        roomId: selectedRoomId,
                        content: draftMessage.trim(),
                      });
                    }}
                  >
                    Send message
                  </Button>
                </div>
              </Space>
            )}
          </Card>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
