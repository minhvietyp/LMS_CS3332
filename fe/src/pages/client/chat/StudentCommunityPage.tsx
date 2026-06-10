import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Typography } from 'antd';
import { BookOpen, MessageCircle, Search, Send, Users } from 'lucide-react';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import {
  getChatRoomMessagesRequest,
  listMyChatRoomsRequest,
  sendChatMessageRequest,
  type ChatMessageItem,
  type ChatRoomItem,
} from '../../../services/api/chatApi';
import { connectChatSocket, joinChatRoom, subscribeToRoomMessages } from '../../../services/sockets/chatSocket';
import './community-chat.css';

type RoomFilter = 'ALL' | 'COURSE' | 'DIRECT' | 'UNREAD';

const roomFilters: Array<{ value: RoomFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'COURSE', label: 'Course discussions' },
  { value: 'DIRECT', label: 'Direct messages' },
  { value: 'UNREAD', label: 'Unread' },
];

function formatDateTime(value?: string | null) {
  if (!value) return 'No activity yet';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function initialsFromName(name?: string | null) {
  if (!name?.trim()) return 'U';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getSortedMessages(messages: ChatMessageItem[] = []) {
  return [...messages].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

function getLatestMessage(room: ChatRoomItem) {
  return getSortedMessages(room.messages).at(-1) ?? null;
}

function getRoomName(room: ChatRoomItem, currentUserId?: string) {
  if (room.type === 'COURSE') return room.course?.title ?? room.name ?? 'Course discussion';

  const otherMember = room.members?.find((member) => member.userId !== currentUserId)?.user;
  return otherMember?.name ?? room.name ?? 'Direct conversation';
}

function getRoomTypeLabel(room: ChatRoomItem) {
  if (room.type === 'COURSE') return 'Course';
  if (room.type === 'DIRECT') return 'Direct';
  return 'Not available';
}

function getUnreadCount(room: ChatRoomItem, currentUserId?: string) {
  return (room.messages ?? []).filter((message) => !message.isRead && message.senderId !== currentUserId).length;
}

function getParticipantCount(room: ChatRoomItem) {
  return room.members?.length ?? 0;
}

function messageSenderName(message: ChatMessageItem, currentUserId?: string) {
  if (message.sender?.name) return message.sender.name;
  return message.senderId === currentUserId ? 'You' : 'Participant';
}

export function StudentCommunityPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const roomsQuery = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: listMyChatRoomsRequest,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const rooms = useMemo(() => {
    return [...(roomsQuery.data ?? [])].sort((left, right) => {
      const leftActivity = getLatestMessage(left)?.createdAt ?? left.updatedAt;
      const rightActivity = getLatestMessage(right)?.createdAt ?? right.updatedAt;
      return new Date(rightActivity).getTime() - new Date(leftActivity).getTime();
    });
  }, [roomsQuery.data]);

  const effectiveSelectedRoomId = selectedRoomId ?? rooms[0]?.id ?? null;

  const selectedRoom = rooms.find((room) => room.id === effectiveSelectedRoomId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', effectiveSelectedRoomId],
    queryFn: () => getChatRoomMessagesRequest(effectiveSelectedRoomId!),
    enabled: Boolean(effectiveSelectedRoomId),
    staleTime: 10 * 1000,
    retry: 1,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { roomId: string; content: string }) => sendChatMessageRequest(payload.roomId, payload.content),
    onSuccess: async (_, variables) => {
      setDraftMessage('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.roomId] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    },
  });

  useEffect(() => {
    if (!token || !effectiveSelectedRoomId) return;

    connectChatSocket(token);
    joinChatRoom(effectiveSelectedRoomId);

    const unsubscribe = subscribeToRoomMessages(() => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', effectiveSelectedRoomId] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    });

    return () => {
      unsubscribe?.();
    };
  }, [effectiveSelectedRoomId, queryClient, token]);

  const filteredRooms = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return rooms.filter((room) => {
      const unread = getUnreadCount(room, user?.id);
      const roomName = getRoomName(room, user?.id).toLowerCase();
      const latestMessage = getLatestMessage(room)?.content.toLowerCase() ?? '';
      const matchesSearch = !search || roomName.includes(search) || latestMessage.includes(search);
      const matchesFilter =
        roomFilter === 'ALL' ||
        (roomFilter === 'COURSE' && room.type === 'COURSE') ||
        (roomFilter === 'DIRECT' && room.type === 'DIRECT') ||
        (roomFilter === 'UNREAD' && unread > 0);

      return matchesSearch && matchesFilter;
    });
  }, [roomFilter, rooms, searchValue, user?.id]);

  const messages = useMemo(() => getSortedMessages(messagesQuery.data ?? []), [messagesQuery.data]);
  const selectedRoomName = selectedRoom ? getRoomName(selectedRoom, user?.id) : 'Conversation';
  const selectedRoomType = selectedRoom ? getRoomTypeLabel(selectedRoom) : 'Not available';
  const participantCount = selectedRoom ? getParticipantCount(selectedRoom) : 0;
  const unreadTotal = rooms.reduce((sum, room) => sum + getUnreadCount(room, user?.id), 0);

  const canSend = Boolean(effectiveSelectedRoomId && draftMessage.trim() && !sendMessageMutation.isPending);
  const error = roomsQuery.error || messagesQuery.error || sendMessageMutation.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Community"
        subtitle="Join course discussions and continue conversations with your classmates."
      >
        <div className="community-chat-shell">
          {error ? (
            <section className="client-card community-chat-shell__state">
              <EmptyState
                title="Unable to load community"
                description={error instanceof Error ? error.message : 'Community conversations could not be loaded right now.'}
                action={
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => {
                      void roomsQuery.refetch();
                      if (effectiveSelectedRoomId) void messagesQuery.refetch();
                    }}
                  >
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          <section className="client-card community-chat-shell__summary" aria-label="Community summary">
            <div className="community-chat-shell__summary-item">
              <MessageCircle size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Conversations</Typography.Text>
              <strong>{rooms.length}</strong>
            </div>
            <div className="community-chat-shell__summary-item">
              <BookOpen size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Course rooms</Typography.Text>
              <strong>{rooms.filter((room) => room.type === 'COURSE').length}</strong>
            </div>
            <div className="community-chat-shell__summary-item">
              <Users size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Direct rooms</Typography.Text>
              <strong>{rooms.filter((room) => room.type === 'DIRECT').length}</strong>
            </div>
            <div className="community-chat-shell__summary-item">
              <MessageCircle size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Unread</Typography.Text>
              <strong>{unreadTotal}</strong>
            </div>
          </section>

          <div className="community-chat-shell__layout">
            <aside className="client-card community-chat-shell__rooms" aria-label="Conversation list">
              <div className="community-chat-shell__rooms-header">
                <div>
                  <Typography.Text className="client-caption">Rooms</Typography.Text>
                  <Typography.Title level={3} className="client-section-title">
                    Conversations
                  </Typography.Title>
                </div>
              </div>

              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search conversations..."
                prefix={<Search size={16} />}
                className="community-chat-shell__search"
              />

              <div className="community-chat-shell__filters" aria-label="Room filters">
                {roomFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`community-chat-shell__filter${roomFilter === filter.value ? ' community-chat-shell__filter--active' : ''}`}
                    onClick={() => setRoomFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {roomsQuery.isLoading ? (
                <div className="community-chat-shell__skeleton-list" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="community-chat-shell__skeleton-row" />
                  ))}
                </div>
              ) : !rooms.length ? (
                <EmptyState title="No conversations yet." description="Course discussions and direct messages will appear here when available." compact />
              ) : !filteredRooms.length ? (
                <EmptyState title="No conversations match your filters." description="Try another room type or search term." compact />
              ) : (
                <div className="community-chat-shell__room-list">
                  {filteredRooms.map((room) => {
                    const latestMessage = getLatestMessage(room);
                    const unread = getUnreadCount(room, user?.id);
                    const isSelected = room.id === effectiveSelectedRoomId;

                    return (
                      <button
                        key={room.id}
                        type="button"
                        className={`community-chat-shell__room-row${isSelected ? ' community-chat-shell__room-row--active' : ''}`}
                        onClick={() => setSelectedRoomId(room.id)}
                      >
                        <div className="community-chat-shell__room-avatar" aria-hidden="true">
                          {initialsFromName(getRoomName(room, user?.id))}
                        </div>
                        <div className="community-chat-shell__room-copy">
                          <div className="community-chat-shell__room-title-row">
                            <Typography.Text className="client-card-title">{getRoomName(room, user?.id)}</Typography.Text>
                            {unread > 0 ? <span className="community-chat-shell__unread-count">{unread}</span> : null}
                          </div>
                          <div className="community-chat-shell__room-meta">
                            <span className={room.type === 'COURSE' ? 'client-badge client-badge-info' : 'client-badge'}>{getRoomTypeLabel(room)}</span>
                            {room.type === 'COURSE' && room.course?.title ? <span>{room.course.title}</span> : null}
                          </div>
                          <Typography.Text className="client-meta community-chat-shell__room-preview">
                            {latestMessage?.content ?? 'No messages in this room yet.'}
                          </Typography.Text>
                          <Typography.Text className="client-meta">{formatDateTime(latestMessage?.createdAt ?? room.updatedAt)}</Typography.Text>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <main className="client-card community-chat-shell__messages" aria-label="Selected conversation">
              {!selectedRoom ? (
                <EmptyState
                  title="Select a conversation to start."
                  description="Choose a course discussion or direct message from the room list."
                />
              ) : (
                <>
                  <div className="community-chat-shell__message-header">
                    <div>
                      <Typography.Text className="client-caption">{selectedRoomType}</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        {selectedRoomName}
                      </Typography.Title>
                      <Typography.Text className="client-meta">
                        {selectedRoom.type === 'COURSE' ? selectedRoom.course?.title ?? 'Course discussion' : 'Direct conversation'}
                        {participantCount ? ` - ${participantCount} participants` : ''}
                      </Typography.Text>
                    </div>
                    <span className={selectedRoom.type === 'COURSE' ? 'client-badge client-badge-info' : 'client-badge'}>
                      {selectedRoomType}
                    </span>
                  </div>

                  <div className="community-chat-shell__message-list">
                    {messagesQuery.isLoading ? (
                      <div className="community-chat-shell__skeleton-list" aria-hidden="true">
                        <div className="community-chat-shell__skeleton-message" />
                        <div className="community-chat-shell__skeleton-message" />
                        <div className="community-chat-shell__skeleton-message" />
                      </div>
                    ) : !messages.length ? (
                      <EmptyState title="No messages in this room yet." description="Start the conversation when you are ready." compact />
                    ) : (
                      messages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        return (
                          <article
                            key={message.id}
                            className={`community-chat-shell__message${isOwn ? ' community-chat-shell__message--own' : ''}`}
                          >
                            <div className="community-chat-shell__message-avatar" aria-hidden="true">
                              {initialsFromName(messageSenderName(message, user?.id))}
                            </div>
                            <div className="community-chat-shell__bubble">
                              <div className="community-chat-shell__bubble-meta">
                                <Typography.Text className="client-card-title">
                                  {messageSenderName(message, user?.id)}
                                </Typography.Text>
                                <Typography.Text className="client-meta">{formatDateTime(message.createdAt)}</Typography.Text>
                              </div>
                              <Typography.Paragraph className="community-chat-shell__bubble-text">
                                {message.content}
                              </Typography.Paragraph>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>

                  <div className="community-chat-shell__composer">
                    <Input.TextArea
                      rows={3}
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      placeholder="Write a message..."
                    />
                    {sendMessageMutation.error ? (
                      <Typography.Text className="community-chat-shell__composer-error">
                        Message could not be sent. Please try again.
                      </Typography.Text>
                    ) : null}
                    <div className="community-chat-shell__composer-actions">
                      <Button
                        className="client-button client-button-primary"
                        icon={<Send size={16} />}
                        disabled={!canSend}
                        loading={sendMessageMutation.isPending}
                        onClick={() => {
                          if (!effectiveSelectedRoomId || !draftMessage.trim()) return;
                          sendMessageMutation.mutate({ roomId: effectiveSelectedRoomId, content: draftMessage.trim() });
                        }}
                      >
                        Send message
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
