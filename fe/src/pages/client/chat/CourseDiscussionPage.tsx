import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Typography } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, SectionHeader } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/useAuth';
import { getChatRoomMessagesRequest, listMyChatRoomsRequest, sendChatMessageRequest } from '../../../services/api/chatApi';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import { connectChatSocket, joinChatRoom, subscribeToRoomMessages } from '../../../services/sockets/chatSocket';
import './community-chat.css';

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'No recent activity';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function initialsFromName(name?: string | null) {
  if (!name?.trim()) {
    return 'U';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function CourseDiscussionPage() {
  const { courseId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const composerRef = useRef<TextAreaRef | null>(null);
  const [draftMessage, setDraftMessage] = useState('');

  const courseQuery = useQuery({
    queryKey: ['courses', 'detail', courseId],
    queryFn: () => getCourseByIdRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const roomsQuery = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: listMyChatRoomsRequest,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const discussionRoom = useMemo(
    () =>
      (roomsQuery.data ?? []).find((room) => room.type === 'COURSE' && room.courseId === courseId) ?? null,
    [courseId, roomsQuery.data],
  );

  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', discussionRoom?.id],
    queryFn: () => getChatRoomMessagesRequest(discussionRoom!.id),
    enabled: Boolean(discussionRoom?.id),
    staleTime: 10 * 1000,
    retry: 1,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => sendChatMessageRequest(discussionRoom!.id, content),
    onSuccess: async () => {
      setDraftMessage('');
      await queryClient.invalidateQueries({ queryKey: ['chat', 'messages', discussionRoom?.id] });
      await queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    },
  });

  useEffect(() => {
    if (!token || !discussionRoom?.id) {
      return;
    }

    connectChatSocket(token);
    joinChatRoom(discussionRoom.id);

    const unsubscribe = subscribeToRoomMessages(() => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'messages', discussionRoom.id] });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'rooms'] });
    });

    return () => {
      unsubscribe?.();
    };
  }, [discussionRoom?.id, queryClient, token]);

  useEffect(() => {
    const mode = searchParams.get('composer');
    if ((mode === 'question' || mode === 'discussion' || mode === 'reply') && composerRef.current) {
      composerRef.current.focus();
    }
  }, [searchParams]);

  const messages = useMemo(
    () =>
      [...(messagesQuery.data ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [messagesQuery.data],
  );

  const leadMessage = messages[0] ?? null;
  const replies = messages.slice(1);
  const relatedRooms = (roomsQuery.data ?? [])
    .filter((room) => room.type === 'COURSE' && room.courseId && room.courseId !== courseId)
    .slice(0, 4);
  const participants = discussionRoom?.members ?? [];
  const discussionCount = messages.length;
  const latestActivity = messages[messages.length - 1]?.createdAt ?? discussionRoom?.updatedAt ?? null;
  const instructorId = courseQuery.data?.instructorId;

  const composerMode = searchParams.get('composer');
  const composerPlaceholder =
    composerMode === 'question'
      ? 'Ask your course question here.'
      : composerMode === 'discussion'
        ? 'Start a new course discussion here.'
        : 'Write your reply to the thread.';

  const error = courseQuery.error || roomsQuery.error || messagesQuery.error || sendMessageMutation.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title={courseQuery.data?.title ? `${courseQuery.data.title} Discussion` : 'Course Discussion'}
        subtitle="Ask questions, follow replies, and keep the course conversation structured."
      >
        <div className="community-thread">
          {error ? (
            <section className="client-card community-thread__state-card">
              <EmptyState
                title="Failed to load course discussion"
                description="We couldn't open this course discussion room right now."
                action={
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => {
                      void courseQuery.refetch();
                      void roomsQuery.refetch();
                      if (discussionRoom?.id) {
                        void messagesQuery.refetch();
                      }
                    }}
                  >
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          {!error && !discussionRoom && !roomsQuery.isLoading ? (
            <section className="client-card community-thread__state-card">
              <EmptyState
                title="No course discussion room"
                description="This course does not have a shared discussion room yet."
                action={
                  <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                    Back to Course
                  </Button>
                }
              />
            </section>
          ) : null}

          {!error && discussionRoom ? (
            <>
              <section className="client-card community-thread__hero">
                <div className="community-thread__hero-copy">
                  <span className="client-badge client-badge-info">Course discussion room</span>
                  <Typography.Title level={2} className="community-thread__hero-title">
                    {courseQuery.data?.title ?? discussionRoom.course?.title ?? 'Course Discussion'}
                  </Typography.Title>
                  <Typography.Paragraph className="client-body">
                    Follow course-specific discussion, reply to classmates, and keep instructor guidance close to the lesson flow.
                  </Typography.Paragraph>
                  <div className="community-thread__hero-actions">
                    <Button
                      className="client-button client-button-primary"
                      onClick={() => composerRef.current?.focus()}
                    >
                      Reply
                    </Button>
                    <Button
                      className="client-button client-button-secondary"
                      onClick={() => navigate(`/courses/${courseId}/announcements`)}
                    >
                      View Announcements
                    </Button>
                    <Button
                      className="client-button client-button-ghost"
                      onClick={() => navigate(`/courses/${courseId}`)}
                    >
                      <ArrowLeft size={16} />
                      Back to Course
                    </Button>
                  </div>
                </div>
                <div className="community-thread__hero-stats">
                  <div className="community-thread__hero-stat">
                    <Typography.Text className="client-meta">Messages</Typography.Text>
                    <strong>{discussionCount}</strong>
                  </div>
                  <div className="community-thread__hero-stat">
                    <Typography.Text className="client-meta">Participants</Typography.Text>
                    <strong>{participants.length}</strong>
                  </div>
                  <div className="community-thread__hero-stat">
                    <Typography.Text className="client-meta">Latest Activity</Typography.Text>
                    <strong>{formatDateTime(latestActivity)}</strong>
                  </div>
                </div>
              </section>

              <div className="community-thread__layout">
                <div className="community-thread__main">
                  <section className="client-card community-thread__section">
                    <SectionHeader
                      title="Discussion Detail"
                      subtitle="The latest course conversation and the response thread below it."
                    />
                    {messagesQuery.isLoading ? (
                      <div className="community-thread__skeleton-stack" aria-hidden="true">
                        <div className="community-thread__skeleton-card" />
                        <div className="community-thread__skeleton-card" />
                      </div>
                    ) : leadMessage ? (
                      <article className="community-thread__lead-card">
                        <div className="community-thread__reply-head">
                          <div className="community-thread__reply-avatar" aria-label={leadMessage.sender?.name ?? 'Participant'}>
                            {initialsFromName(leadMessage.sender?.name)}
                          </div>
                          <div className="community-thread__reply-meta">
                            <Typography.Text className="client-card-title">
                              {leadMessage.sender?.name ?? (leadMessage.senderId === user?.id ? 'You' : 'Participant')}
                            </Typography.Text>
                            <div className="community-thread__reply-labels">
                              {leadMessage.senderId === instructorId ? (
                                <span className="client-badge client-badge-info">Instructor</span>
                              ) : null}
                              {leadMessage.senderId === user?.id ? <span className="client-badge">You</span> : null}
                              <Typography.Text className="client-meta">
                                {formatDateTime(leadMessage.createdAt)}
                              </Typography.Text>
                            </div>
                          </div>
                        </div>
                        <Typography.Paragraph className="community-thread__lead-body">
                          {leadMessage.content}
                        </Typography.Paragraph>
                      </article>
                    ) : (
                      <EmptyState
                        title="Be the first to start a discussion"
                        description="No messages have been posted in this course room yet."
                        action={
                          <Button
                            className="client-button client-button-primary"
                            onClick={() => composerRef.current?.focus()}
                          >
                            Start Discussion
                          </Button>
                        }
                        compact
                      />
                    )}
                  </section>

                  <section className="client-card community-thread__section">
                    <SectionHeader
                      title="Reply Thread"
                      subtitle="Structured responses from classmates and instructors."
                    />
                    {replies.length ? (
                      <div className="community-thread__reply-list">
                        {replies.map((message) => {
                          const isInstructor =
                            message.senderId === instructorId ||
                            discussionRoom.members?.some(
                              (member) =>
                                member.userId === message.senderId && member.user?.role === 'INSTRUCTOR',
                            );

                          return (
                            <article
                              key={message.id}
                              className={`community-thread__reply-card${isInstructor ? ' community-thread__reply-card--instructor' : ''}`}
                            >
                              <div className="community-thread__reply-head">
                                <div className="community-thread__reply-avatar" aria-label={message.sender?.name ?? 'Participant'}>
                                  {initialsFromName(message.sender?.name)}
                                </div>
                                <div className="community-thread__reply-meta">
                                  <Typography.Text className="client-card-title">
                                    {message.sender?.name ?? (message.senderId === user?.id ? 'You' : 'Participant')}
                                  </Typography.Text>
                                  <div className="community-thread__reply-labels">
                                    {isInstructor ? (
                                      <span className="client-badge client-badge-info">Instructor</span>
                                    ) : null}
                                    {message.senderId === user?.id ? <span className="client-badge">You</span> : null}
                                    <Typography.Text className="client-meta">
                                      {formatDateTime(message.createdAt)}
                                    </Typography.Text>
                                  </div>
                                </div>
                              </div>
                              <Typography.Paragraph className="community-thread__reply-body">
                                {message.content}
                              </Typography.Paragraph>
                              <div className="community-thread__reply-actions">
                                <Button
                                  className="client-button client-button-ghost"
                                  onClick={() => composerRef.current?.focus()}
                                >
                                  Reply
                                </Button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        title="No replies yet"
                        description="Replies will appear here after the first response is posted."
                        compact
                      />
                    )}
                  </section>

                  <section className="client-card community-thread__section">
                    <SectionHeader title="Post a Reply" subtitle="Keep the thread useful, specific, and course-focused." />
                    <div className="community-thread__composer">
                      <Input.TextArea
                        ref={composerRef}
                        rows={5}
                        placeholder={composerPlaceholder}
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                      />
                      {sendMessageMutation.error ? (
                        <Typography.Text className="community-thread__composer-error">
                          We could not post your reply. Please try again.
                        </Typography.Text>
                      ) : null}
                      <div className="community-thread__composer-actions">
                        <Button
                          className="client-button client-button-primary"
                          disabled={!draftMessage.trim() || sendMessageMutation.isPending}
                          onClick={() => {
                            if (!draftMessage.trim()) {
                              return;
                            }

                            sendMessageMutation.mutate(draftMessage.trim());
                          }}
                        >
                          <Send size={16} />
                          Post Reply
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="community-thread__aside">
                  <section className="client-card community-thread__sidebar-card">
                    <SectionHeader title="Quick Actions" subtitle="Stay in the course communication loop." />
                    <div className="community-thread__quick-actions">
                      <Button
                        className="client-button client-button-primary"
                        onClick={() => composerRef.current?.focus()}
                      >
                        Reply to Thread
                      </Button>
                      <Button
                        className="client-button client-button-secondary"
                        onClick={() => navigate(`/courses/${courseId}/announcements`)}
                      >
                        Open Announcements
                      </Button>
                      <Button
                        className="client-button client-button-ghost"
                        onClick={() => navigate(`/courses/${courseId}`)}
                      >
                        View Course
                      </Button>
                    </div>
                  </section>

                  <section className="client-card community-thread__sidebar-card">
                    <SectionHeader title="Active Participants" subtitle="People visible in this room right now." />
                    {participants.length ? (
                      <div className="community-thread__participant-list">
                        {participants.map((member) => (
                          <div key={member.id} className="community-thread__participant">
                            <div className="community-thread__reply-avatar" aria-hidden="true">
                              {initialsFromName(member.user?.name)}
                            </div>
                            <div className="community-thread__participant-copy">
                              <Typography.Text className="client-card-title">
                                {member.user?.name ?? 'Participant'}
                              </Typography.Text>
                              <Typography.Text className="client-meta">
                                {member.user?.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'}
                              </Typography.Text>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="No visible participants" description="Participants will appear here when the room data is available." compact />
                    )}
                  </section>

                  <section className="client-card community-thread__sidebar-card">
                    <SectionHeader title="Related Discussions" subtitle="Jump back into your other active rooms." />
                    {relatedRooms.length ? (
                      <div className="community-thread__related-list">
                        {relatedRooms.map((room) => (
                          <button
                            key={room.id}
                            type="button"
                            className="community-thread__related-item"
                            onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                          >
                            <div className="community-thread__related-copy">
                              <Typography.Text className="client-card-title">
                                {room.course?.title ?? 'Course discussion'}
                              </Typography.Text>
                              <Typography.Text className="client-meta">
                                {formatDateTime(room.updatedAt)}
                              </Typography.Text>
                            </div>
                            <MessageSquare size={16} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="No related discussions" description="Other course rooms will appear here as they become active." compact />
                    )}
                  </section>
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
