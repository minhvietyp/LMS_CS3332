import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Typography } from 'antd';
import { MessageCircle, Pin, Search, Send, Sparkles, Users } from 'lucide-react';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import {
  createDirectRoomRequest,
  getChatRoomMessagesRequest,
  listMyChatRoomsRequest,
  sendChatMessageRequest,
  type ChatMessageItem,
  type ChatRoomItem,
} from '../../../services/api/chatApi';
import { listPublicInstructorsRequest } from '../../../services/api/authApi';
import { connectChatSocket, joinChatRoom, subscribeToRoomMessages } from '../../../services/sockets/chatSocket';
import './community-chat.css';

type DirectRoomFilter = 'ALL' | 'PINNED' | 'UNREAD' | 'RECENT';

const directRoomFilters: Array<{ value: DirectRoomFilter; label: string }> = [
  { value: 'ALL', label: 'All conversations' },
  { value: 'PINNED', label: 'Pinned' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'RECENT', label: 'Recent' },
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
  const otherMember = room.members?.find((member) => member.userId !== currentUserId)?.user;
  return otherMember?.name ?? room.name ?? 'Direct conversation';
}

function getUnreadCount(room: ChatRoomItem, currentUserId?: string) {
  return (room.messages ?? []).filter((message) => !message.isRead && message.senderId !== currentUserId).length;
}

function getParticipantCount(room: ChatRoomItem) {
  return room.members?.length ?? 0;
}

function getRoomActivityDate(room: ChatRoomItem) {
  return getLatestMessage(room)?.createdAt ?? room.updatedAt;
}

function isRoomRecent(room: ChatRoomItem) {
  const age = Date.now() - new Date(getRoomActivityDate(room)).getTime();
  return age <= 1000 * 60 * 60 * 24 * 3;
}

function messageSenderName(message: ChatMessageItem, currentUserId?: string) {
  if (message.sender?.name) return message.sender.name;
  return message.senderId === currentUserId ? 'You' : 'Participant';
}

export function DirectChatPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<DirectRoomFilter>('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const roomsQuery = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: listMyChatRoomsRequest,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const instructorsQuery = useQuery({
    queryKey: ['chat', 'contact-instructors'],
    queryFn: listPublicInstructorsRequest,
    enabled: user?.role === 'STUDENT',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const rooms = useMemo(() => {
    return [...(roomsQuery.data ?? [])]
      .filter((room) => room.type === 'DIRECT')
      .sort((left, right) => new Date(getRoomActivityDate(right)).getTime() - new Date(getRoomActivityDate(left)).getTime());
  }, [roomsQuery.data]);

  useEffect(() => {
    if (!selectedRoomId && rooms.length) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', selectedRoomId],
    queryFn: () => getChatRoomMessagesRequest(selectedRoomId!),
    enabled: Boolean(selectedRoomId),
    staleTime: 10 * 1000,
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
    mutationFn: (payload: { roomId: string; content: string }) => sendChatMessageRequest(payload.roomId, payload.content),
    onSuccess: async (_, variables) => {
      setDraftMessage('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.roomId] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    },
  });

  useEffect(() => {
    if (!token || !selectedRoomId) return;

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

  const filteredRooms = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return rooms.filter((room, index) => {
      const unread = getUnreadCount(room, user?.id);
      const roomName = getRoomName(room, user?.id).toLowerCase();
      const latestMessage = getLatestMessage(room)?.content.toLowerCase() ?? '';
      const matchesSearch = !search || roomName.includes(search) || latestMessage.includes(search);
      const matchesFilter =
        roomFilter === 'ALL' ||
        (roomFilter === 'PINNED' && index < 2) ||
        (roomFilter === 'UNREAD' && unread > 0) ||
        (roomFilter === 'RECENT' && isRoomRecent(room));

      return matchesSearch && matchesFilter;
    });
  }, [roomFilter, rooms, searchValue, user?.id]);

  const pinnedRooms = filteredRooms.filter((room) => rooms.findIndex((candidate) => candidate.id === room.id) < 2);
  const regularRooms = filteredRooms.filter((room) => !pinnedRooms.some((candidate) => candidate.id === room.id));
  const messages = useMemo(() => getSortedMessages(messagesQuery.data ?? []), [messagesQuery.data]);
  const selectedRoomName = selectedRoom ? getRoomName(selectedRoom, user?.id) : 'Conversation';
  const unreadTotal = rooms.reduce((sum, room) => sum + getUnreadCount(room, user?.id), 0);
  const instructorsAvailable = instructorsQuery.data?.length ?? 0;
  const canSend = Boolean(selectedRoomId && draftMessage.trim() && !sendMessageMutation.isPending);
  const error = roomsQuery.error || messagesQuery.error || createDirectRoomMutation.error || sendMessageMutation.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Direct chat"
        subtitle="Keep one-to-one teaching conversations focused, searchable, and easy to continue."
      >
        <div className="community-chat-shell">
          {error ? (
            <section className="client-card community-chat-shell__state">
              <EmptyState
                title="Unable to load direct chat"
                description={error instanceof Error ? error.message : 'Direct conversations could not be loaded right now.'}
                action={
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => {
                      void roomsQuery.refetch();
                      if (selectedRoomId) void messagesQuery.refetch();
                    }}
                  >
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          <section className="client-card community-chat-shell__summary" aria-label="Direct chat summary">
            <div className="community-chat-shell__summary-item">
              <MessageCircle size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Conversations</Typography.Text>
              <strong>{rooms.length}</strong>
            </div>
            <div className="community-chat-shell__summary-item">
              <Pin size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Pinned</Typography.Text>
              <strong>{Math.min(rooms.length, 2)}</strong>
            </div>
            <div className="community-chat-shell__summary-item">
              <Sparkles size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Unread</Typography.Text>
              <strong>{unreadTotal}</strong>
            </div>
            <div className="community-chat-shell__summary-item">
              <Users size={18} aria-hidden="true" />
              <Typography.Text className="client-meta">Available contacts</Typography.Text>
              <strong>{user?.role === 'STUDENT' ? instructorsAvailable : rooms.length}</strong>
            </div>
          </section>

          <div className="community-chat-shell__layout">
            <aside className="client-card community-chat-shell__rooms" aria-label="Conversation list">
              <div className="community-chat-shell__rooms-header">
                <div>
                  <Typography.Text className="client-caption">Messaging workspace</Typography.Text>
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

              <div className="community-chat-shell__filters" aria-label="Conversation filters">
                {directRoomFilters.map((filter) => (
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

              {user?.role === 'STUDENT' && instructorsQuery.data?.length ? (
                <section className="community-chat-shell__inline-panel">
                  <div className="community-chat-shell__inline-panel-head">
                    <Typography.Text className="client-card-title">Frequently used</Typography.Text>
                    <Typography.Text className="client-meta">Start new instructor conversations from loaded contacts.</Typography.Text>
                  </div>
                  <div className="community-chat-shell__quick-contacts">
                    {instructorsQuery.data.slice(0, 3).map((instructor) => (
                      <button
                        key={instructor.id}
                        type="button"
                        className="community-chat-shell__quick-contact"
                        onClick={() => createDirectRoomMutation.mutate(instructor.id)}
                      >
                        <span className="community-chat-shell__room-avatar" aria-hidden="true">
                          {initialsFromName(instructor.name)}
                        </span>
                        <span className="community-chat-shell__room-copy">
                          <strong>{instructor.name}</strong>
                          <span>{instructor.occupation ?? instructor.email}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {roomsQuery.isLoading ? (
                <div className="community-chat-shell__skeleton-list" aria-hidden="true">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="community-chat-shell__skeleton-row" />
                  ))}
                </div>
              ) : !rooms.length ? (
                <EmptyState title="No direct conversations yet." description="New direct messages will appear here after you open a chat." compact />
              ) : !filteredRooms.length ? (
                <EmptyState title="No conversations match your filters." description="Try another search term or room view." compact />
              ) : (
                <div className="community-chat-shell__room-sections">
                  {pinnedRooms.length ? (
                    <section className="community-chat-shell__room-section">
                      <div className="community-chat-shell__room-section-head">
                        <Typography.Text className="client-card-title">Pinned conversations</Typography.Text>
                        <Typography.Text className="client-meta">Keep your most active teaching threads at the top.</Typography.Text>
                      </div>
                      <div className="community-chat-shell__room-list">
                        {pinnedRooms.map((room) => {
                          const latestMessage = getLatestMessage(room);
                          const unread = getUnreadCount(room, user?.id);
                          const isSelected = room.id === selectedRoomId;

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
                                  <span className="client-badge client-badge-info">Pinned</span>
                                  <span>{getParticipantCount(room)} participants</span>
                                </div>
                                <Typography.Text className="client-meta community-chat-shell__room-preview">
                                  {latestMessage?.content ?? 'No messages in this room yet.'}
                                </Typography.Text>
                                <Typography.Text className="client-meta">{formatDateTime(getRoomActivityDate(room))}</Typography.Text>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {regularRooms.length ? (
                    <section className="community-chat-shell__room-section">
                      <div className="community-chat-shell__room-section-head">
                        <Typography.Text className="client-card-title">Recent conversations</Typography.Text>
                        <Typography.Text className="client-meta">Respond quickly to the latest one-to-one messages.</Typography.Text>
                      </div>
                      <div className="community-chat-shell__room-list">
                        {regularRooms.map((room) => {
                          const latestMessage = getLatestMessage(room);
                          const unread = getUnreadCount(room, user?.id);
                          const isSelected = room.id === selectedRoomId;

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
                                  {isRoomRecent(room) ? <span className="client-badge">Recently active</span> : null}
                                  <span>{getParticipantCount(room)} participants</span>
                                </div>
                                <Typography.Text className="client-meta community-chat-shell__room-preview">
                                  {latestMessage?.content ?? 'No messages in this room yet.'}
                                </Typography.Text>
                                <Typography.Text className="client-meta">{formatDateTime(getRoomActivityDate(room))}</Typography.Text>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </aside>

            <main className="client-card community-chat-shell__messages" aria-label="Selected conversation">
              {!selectedRoom ? (
                <EmptyState
                  title="Select a conversation to start."
                  description="Choose a direct thread from the list to review the message history and reply."
                />
              ) : (
                <>
                  <div className="community-chat-shell__message-header">
                    <div>
                      <Typography.Text className="client-caption">Direct conversation</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        {selectedRoomName}
                      </Typography.Title>
                      <Typography.Text className="client-meta">
                        {getParticipantCount(selectedRoom)} participants - last activity {formatDateTime(getRoomActivityDate(selectedRoom))}
                      </Typography.Text>
                    </div>
                    <div className="community-chat-shell__message-header-tags">
                      {getUnreadCount(selectedRoom, user?.id) > 0 ? <span className="client-badge client-badge-warning">Unread</span> : null}
                      {isRoomRecent(selectedRoom) ? <span className="client-badge client-badge-info">Recent</span> : null}
                    </div>
                  </div>

                  <div className="community-chat-shell__message-list">
                    {messagesQuery.isLoading ? (
                      <div className="community-chat-shell__skeleton-list" aria-hidden="true">
                        <div className="community-chat-shell__skeleton-message" />
                        <div className="community-chat-shell__skeleton-message" />
                        <div className="community-chat-shell__skeleton-message" />
                      </div>
                    ) : !messages.length ? (
                      <EmptyState title="No messages in this conversation yet." description="Write the first message when you are ready." compact />
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
                    <div className="community-chat-shell__composer-meta">
                      <Typography.Text className="client-meta">
                        Text messages are sent immediately to the selected direct room. Attachments and emoji tools are not available in the current API.
                      </Typography.Text>
                    </div>
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
                          if (!selectedRoomId || !draftMessage.trim()) return;
                          sendMessageMutation.mutate({ roomId: selectedRoomId, content: draftMessage.trim() });
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
