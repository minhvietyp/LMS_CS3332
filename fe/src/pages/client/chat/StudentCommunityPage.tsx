import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import {
  BookOpen,
  ChevronRight,
  Megaphone,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, NotificationCard, SectionHeader } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import { listMyChatRoomsRequest, type ChatMessageItem, type ChatRoomItem } from '../../../services/api/chatApi';
import { listCoursesRequest, type CourseListItem } from '../../../services/api/courseApi';
import { listNotificationsRequest } from '../../../services/api/notificationApi';
import './community-chat.css';

type RoomCard = {
  id: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  latestMessage: ChatMessageItem | null;
  latestMessageText: string;
  latestMessageTime: string;
  latestActivityLabel: string;
  replyCount: number;
  participantCount: number;
  questionLike: boolean;
  hasInstructorReply: boolean;
  hasMyMessage: boolean;
  statusLabel: 'Open' | 'Answered' | 'Instructor Replied';
  statusClassName: string;
};

type AnnouncementPriority = 'Important' | 'Reminder' | 'Update' | 'Event';

type AnnouncementCard = {
  id: string;
  courseId: string | null;
  title: string;
  body: string;
  courseTitle: string;
  priority: AnnouncementPriority;
  priorityClassName: string;
  isRead: boolean;
  createdAtLabel: string;
  href: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'No recent activity';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return 'No activity yet';
  }

  const timestamp = new Date(value).getTime();
  const diffHours = Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));

  if (diffHours < 1) {
    return 'Updated just now';
  }

  if (diffHours < 24) {
    return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return 'Updated 1 day ago';
  }

  return `Updated ${diffDays} days ago`;
}

function deriveAnnouncementPriority(message: string): Pick<AnnouncementCard, 'priority' | 'priorityClassName'> {
  const lower = message.toLowerCase();

  if (/(maintenance|urgent|important|deadline|required|action required)/.test(lower)) {
    return { priority: 'Important', priorityClassName: 'client-badge client-badge-danger' };
  }

  if (/(reminder|due|review|submit)/.test(lower)) {
    return { priority: 'Reminder', priorityClassName: 'client-badge client-badge-warning' };
  }

  if (/(seminar|event|lecture|workshop|session)/.test(lower)) {
    return { priority: 'Event', priorityClassName: 'client-badge client-badge-info' };
  }

  return { priority: 'Update', priorityClassName: 'client-badge client-badge-info' };
}

function deriveAnnouncementTitle(message: string) {
  const firstSentence = message.split(/(?<=[.!?])\s/)[0]?.trim() ?? message.trim();
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
}

function getRoomMessages(room: ChatRoomItem) {
  return [...(room.messages ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function StudentCommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roomsQuery = useQuery({
    queryKey: ['chat', 'rooms'],
    queryFn: listMyChatRoomsRequest,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const coursesQuery = useQuery({
    queryKey: ['community', 'courses'],
    queryFn: () => listCoursesRequest({ page: 1, limit: 100 }),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const coursesById = useMemo(() => {
    return new Map((coursesQuery.data?.data ?? []).map((course) => [course.id, course] satisfies [string, CourseListItem]));
  }, [coursesQuery.data?.data]);

  const courseRooms = useMemo(
    () =>
      (roomsQuery.data ?? [])
        .filter((room) => room.type === 'COURSE' && room.courseId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [roomsQuery.data],
  );

  const roomCards = useMemo<RoomCard[]>(() => {
    return courseRooms.map((room) => {
      const course = room.courseId ? coursesById.get(room.courseId) : null;
      const messages = getRoomMessages(room);
      const latestMessage = messages[0] ?? null;
      const visibleMessages = room.messages ?? [];
      const hasInstructorReply =
        visibleMessages.some(
          (message) =>
            message.senderId === course?.instructorId ||
            room.members?.some(
              (member) => member.userId === message.senderId && member.user?.role === 'INSTRUCTOR',
            ),
        ) ?? false;
      const hasMyMessage = visibleMessages.some((message) => message.senderId === user?.id);
      const replyCount = Math.max(0, visibleMessages.length - 1);
      const questionLike =
        latestMessage?.content.includes('?') ||
        visibleMessages.some((message) => message.content.includes('?')) ||
        false;

      let statusLabel: RoomCard['statusLabel'] = 'Open';
      let statusClassName = 'client-badge client-badge-info';

      if (hasInstructorReply) {
        statusLabel = 'Instructor Replied';
        statusClassName = 'client-badge client-badge-info';
      } else if (visibleMessages.length > 1) {
        statusLabel = 'Answered';
        statusClassName = 'client-badge client-badge-success';
      }

      return {
        id: room.id,
        courseId: room.courseId!,
        courseTitle: room.course?.title ?? course?.title ?? 'Course discussion',
        instructorName: course?.instructor?.name ?? 'Instructor unavailable',
        latestMessage,
        latestMessageText: latestMessage?.content ?? 'No discussion posts yet.',
        latestMessageTime: formatDate(latestMessage?.createdAt ?? room.updatedAt),
        latestActivityLabel: formatRelativeTime(latestMessage?.createdAt ?? room.updatedAt),
        replyCount,
        participantCount: room.members?.length ?? 0,
        questionLike,
        hasInstructorReply,
        hasMyMessage,
        statusLabel,
        statusClassName,
      };
    });
  }, [courseRooms, coursesById, user?.id]);

  const notifications = notificationsQuery.data ?? [];
  const courseAnnouncements = useMemo<AnnouncementCard[]>(() => {
    return notifications
      .filter((item) => item.type === 'COURSE')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => {
        const course = item.courseId ? coursesById.get(item.courseId) : null;
        const priority = deriveAnnouncementPriority(item.message);
        return {
          id: item.id,
          courseId: item.courseId ?? null,
          title: deriveAnnouncementTitle(item.message),
          body: item.message,
          courseTitle: course?.title ?? 'Course announcement',
          priority: priority.priority,
          priorityClassName: priority.priorityClassName,
          isRead: item.isRead,
          createdAtLabel: formatDate(item.createdAt),
          href: item.courseId ? `/courses/${item.courseId}/announcements` : '/notifications',
        };
      });
  }, [coursesById, notifications]);

  const questionRoomRoute = roomCards[0]?.courseId
    ? `/courses/${roomCards[0].courseId}/discussion?composer=question`
    : '/courses';
  const discussionRoomRoute = roomCards[0]?.courseId
    ? `/courses/${roomCards[0].courseId}/discussion?composer=discussion`
    : '/courses';

  const heroMetrics = {
    activeDiscussions: roomCards.length,
    openQuestions: roomCards.filter((room) => room.questionLike && !room.hasInstructorReply).length,
    instructorAnnouncements: courseAnnouncements.length,
    myDiscussions: roomCards.filter((room) => room.hasMyMessage).length,
  };

  const questionCards = roomCards.filter((room) => room.questionLike).slice(0, 3);
  const myDiscussionCards = roomCards.filter((room) => room.hasMyMessage).slice(0, 3);
  const trendingCards = [...roomCards]
    .sort((a, b) => {
      if (b.replyCount !== a.replyCount) {
        return b.replyCount - a.replyCount;
      }

      return new Date(b.latestMessage?.createdAt ?? '').getTime() - new Date(a.latestMessage?.createdAt ?? '').getTime();
    })
    .slice(0, 4);

  const partialDataUnavailable = Boolean(coursesQuery.error);
  const criticalError = roomsQuery.error && notificationsQuery.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Learning Community"
        subtitle="Ask questions, share ideas, and learn together in your course spaces."
      >
        <div className="community-workspace">
          {criticalError ? (
            <section className="client-card community-workspace__state-card">
              <EmptyState
                title="Unable to load community"
                description="We could not load your discussion rooms and announcements right now."
                action={
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => {
                      void roomsQuery.refetch();
                      void notificationsQuery.refetch();
                    }}
                  >
                    Refresh Community
                  </Button>
                }
              />
            </section>
          ) : null}

          {!criticalError ? (
            <>
              <section className="client-card community-workspace__hero">
                <div className="community-workspace__hero-copy">
                  <span className="client-badge client-badge-info">Academic collaboration</span>
                  <Typography.Title level={2} className="community-workspace__hero-title">
                    Learning Community
                  </Typography.Title>
                  <Typography.Paragraph className="client-body">
                    Ask questions, join discussions, and follow instructor updates without leaving your learning workspace.
                  </Typography.Paragraph>
                  <div className="community-workspace__hero-actions">
                    <Button
                      className="client-button client-button-primary"
                      onClick={() => navigate(questionRoomRoute)}
                    >
                      Ask Question
                    </Button>
                    <Button
                      className="client-button client-button-secondary"
                      onClick={() => navigate(discussionRoomRoute)}
                    >
                      Start Discussion
                    </Button>
                  </div>
                </div>
                <div className="community-workspace__hero-metrics">
                  <article className="community-workspace__metric">
                    <MessageSquare size={18} />
                    <strong>{heroMetrics.activeDiscussions}</strong>
                    <span>Active Discussions</span>
                  </article>
                  <article className="community-workspace__metric">
                    <BookOpen size={18} />
                    <strong>{heroMetrics.openQuestions}</strong>
                    <span>Open Questions</span>
                  </article>
                  <article className="community-workspace__metric">
                    <Megaphone size={18} />
                    <strong>{heroMetrics.instructorAnnouncements}</strong>
                    <span>Instructor Announcements</span>
                  </article>
                  <article className="community-workspace__metric">
                    <Users size={18} />
                    <strong>{heroMetrics.myDiscussions}</strong>
                    <span>My Discussions</span>
                  </article>
                </div>
              </section>

              <div className="community-workspace__layout">
                <div className="community-workspace__main">
                  <section className="client-card community-workspace__section">
                    <SectionHeader
                      title="Discussion Feed"
                      subtitle="The most active course discussions in your learning workspace."
                    />
                    {roomsQuery.isLoading ? (
                      <div className="community-workspace__skeleton-list" aria-hidden="true">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="community-workspace__skeleton-card" />
                        ))}
                      </div>
                    ) : roomsQuery.error ? (
                      <EmptyState
                        title="Discussion feed unavailable"
                        description="We couldn't load discussion activity right now."
                        compact
                      />
                    ) : roomCards.length ? (
                      <div className="community-workspace__feed-list">
                        {roomCards.slice(0, 4).map((room) => (
                          <article key={room.id} className="community-workspace__feed-card">
                            <div className="community-workspace__feed-header">
                              <div className="community-workspace__feed-title">
                                <span className={room.statusClassName}>{room.statusLabel}</span>
                                <Typography.Text className="client-card-title">
                                  {room.latestMessageText}
                                </Typography.Text>
                              </div>
                              <Typography.Text className="client-meta">
                                {room.latestActivityLabel}
                              </Typography.Text>
                            </div>
                            <div className="community-workspace__feed-meta">
                              <span>{room.courseTitle}</span>
                              <span>{room.instructorName}</span>
                              <span>{room.replyCount} replies</span>
                              <span>{room.participantCount} participants</span>
                            </div>
                            <div className="community-workspace__feed-actions">
                              <Button
                                className="client-button client-button-secondary"
                                onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                              >
                                Open Discussion
                              </Button>
                              <Button
                                className="client-button client-button-ghost"
                                onClick={() => navigate(`/courses/${room.courseId}/discussion?composer=reply`)}
                              >
                                Reply
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No discussions yet"
                        description="You haven't joined any course discussion rooms yet."
                        action={
                          <Button className="client-button client-button-secondary" onClick={() => navigate('/courses')}>
                            Browse Courses
                          </Button>
                        }
                        compact
                      />
                    )}
                  </section>

                  <div className="community-workspace__split-grid">
                    <section className="client-card community-workspace__section">
                      <SectionHeader
                        title="Academic Q&A"
                        subtitle="Question-led discussions that still need attention or review."
                      />
                      {questionCards.length ? (
                        <div className="community-workspace__qa-list">
                          {questionCards.map((room) => (
                            <article key={room.id} className="community-workspace__qa-card">
                              <div className="community-workspace__qa-score">
                                <strong>{room.replyCount}</strong>
                                <span>answers</span>
                              </div>
                              <div className="community-workspace__qa-copy">
                                <Typography.Text className="client-card-title">
                                  {room.latestMessageText}
                                </Typography.Text>
                                <div className="community-workspace__feed-meta">
                                  <span>{room.courseTitle}</span>
                                  <span>{room.latestMessageTime}</span>
                                </div>
                              </div>
                              <div className="community-workspace__qa-actions">
                                <Button
                                  className="client-button client-button-secondary"
                                  onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                                >
                                  View Answers
                                </Button>
                                <Button
                                  className="client-button client-button-ghost"
                                  onClick={() => navigate(`/courses/${room.courseId}/discussion?composer=question`)}
                                >
                                  Answer Question
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No open questions"
                          description="New question-led discussions will appear here when learners ask for help."
                          action={
                            <Button
                              className="client-button client-button-primary"
                              onClick={() => navigate(questionRoomRoute)}
                            >
                              Ask Question
                            </Button>
                          }
                          compact
                        />
                      )}
                    </section>

                    <section className="client-card community-workspace__section">
                      <SectionHeader
                        title="Course Discussion Rooms"
                        subtitle="Enter the rooms attached to your active course spaces."
                      />
                      {roomCards.length ? (
                        <div className="community-workspace__room-grid">
                          {roomCards.slice(0, 4).map((room) => (
                            <article key={room.id} className="community-workspace__room-card">
                              <div className="community-workspace__room-header">
                                <Typography.Text className="client-card-title">
                                  {room.courseTitle}
                                </Typography.Text>
                                <span className="client-badge">{room.participantCount} active</span>
                              </div>
                              <Typography.Text className="client-meta">
                                {room.instructorName}
                              </Typography.Text>
                              <div className="community-workspace__room-stats">
                                <div>
                                  <strong>{room.replyCount}</strong>
                                  <span>Replies</span>
                                </div>
                                <div>
                                  <strong>{room.participantCount}</strong>
                                  <span>Participants</span>
                                </div>
                              </div>
                              <Typography.Paragraph className="client-meta">
                                {room.latestMessageText}
                              </Typography.Paragraph>
                              <div className="community-workspace__room-actions">
                                <Button
                                  className="client-button client-button-primary"
                                  onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                                >
                                  Enter Room
                                </Button>
                                <Button
                                  className="client-button client-button-secondary"
                                  onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                                >
                                  View Discussions
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No course rooms yet"
                          description="Course discussion rooms will appear once your courses enable collaboration."
                          compact
                        />
                      )}
                    </section>
                  </div>

                  <div className="community-workspace__split-grid">
                    <section className="client-card community-workspace__section">
                      <SectionHeader
                        title="Instructor Announcements"
                        subtitle="Structured course updates, reminders, and official notices."
                        action={
                          courseAnnouncements[0]?.courseId ? (
                            <Button
                              className="client-button client-button-ghost"
                              onClick={() => navigate(`/courses/${courseAnnouncements[0].courseId}/announcements`)}
                            >
                              View All
                            </Button>
                          ) : undefined
                        }
                      />
                      {notificationsQuery.isLoading ? (
                        <div className="community-workspace__skeleton-list" aria-hidden="true">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="community-workspace__skeleton-card" />
                          ))}
                        </div>
                      ) : courseAnnouncements.length ? (
                        <div className="community-workspace__announcement-list">
                          {courseAnnouncements.slice(0, 4).map((announcement) => (
                            <article key={announcement.id} className="community-workspace__announcement-card">
                              <div className="community-workspace__announcement-media" aria-hidden="true" />
                              <div className="community-workspace__announcement-copy">
                                <div className="community-workspace__announcement-meta">
                                  <span className={announcement.priorityClassName}>{announcement.priority}</span>
                                  <Typography.Text className="client-meta">
                                    {announcement.createdAtLabel}
                                  </Typography.Text>
                                </div>
                                <Typography.Text className="client-card-title">
                                  {announcement.title}
                                </Typography.Text>
                                <Typography.Text className="client-meta">
                                  {announcement.courseTitle}
                                </Typography.Text>
                                <Typography.Paragraph className="client-meta">
                                  {announcement.body}
                                </Typography.Paragraph>
                                <div className="community-workspace__announcement-actions">
                                  <Button
                                    className="client-button client-button-secondary"
                                    onClick={() => navigate(announcement.href ?? '/notifications')}
                                  >
                                    Read Announcement
                                  </Button>
                                  {!announcement.isRead ? (
                                    <span className="client-badge client-badge-info">Unread</span>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No announcements"
                          description="Official instructor announcements will appear here."
                          compact
                        />
                      )}
                    </section>

                    <section className="client-card community-workspace__section">
                      <SectionHeader
                        title="My Discussions"
                        subtitle="Resume conversations where you've already contributed."
                      />
                      {myDiscussionCards.length ? (
                        <div className="community-workspace__resume-list">
                          {myDiscussionCards.map((room) => (
                            <NotificationCard
                              key={room.id}
                              title={room.latestMessageText}
                              message={`${room.courseTitle} · ${room.replyCount} replies`}
                              time={room.latestMessageTime}
                              unread={!room.hasInstructorReply}
                              action={
                                <div className="community-workspace__inline-actions">
                                  <Button
                                    className="client-button client-button-secondary"
                                    onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                                  >
                                    Continue Discussion
                                  </Button>
                                  <Button
                                    className="client-button client-button-ghost"
                                    onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                                  >
                                    View Answers
                                  </Button>
                                </div>
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No personal discussions yet"
                          description="When you post or reply inside a course room, it will show up here."
                          compact
                        />
                      )}
                    </section>
                  </div>
                </div>

                <aside className="community-workspace__aside">
                  <section className="client-card community-workspace__sidebar-card">
                    <SectionHeader title="Trending Discussions" subtitle="Most active course conversations right now." />
                    {trendingCards.length ? (
                      <div className="community-workspace__trending-list">
                        {trendingCards.map((room) => (
                          <button
                            key={room.id}
                            type="button"
                            className="community-workspace__trending-item"
                            onClick={() => navigate(`/courses/${room.courseId}/discussion`)}
                          >
                            <div>
                              <Typography.Text className="client-card-title">{room.latestMessageText}</Typography.Text>
                              <Typography.Text className="client-meta">
                                {room.courseTitle} · {room.replyCount} replies
                              </Typography.Text>
                            </div>
                            <ChevronRight size={16} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Quiet on campus"
                        description="No trending course discussions are visible right now."
                        compact
                      />
                    )}
                  </section>

                  <section className="client-card community-workspace__sidebar-card">
                    <SectionHeader title="Community Sidebar" subtitle="Compact utility and workspace summary." />
                    <div className="community-workspace__sidebar-actions">
                      <Button
                        className="client-button client-button-primary"
                        onClick={() => navigate(questionRoomRoute)}
                      >
                        Ask Question
                      </Button>
                      <Button
                        className="client-button client-button-secondary"
                        onClick={() => navigate(discussionRoomRoute)}
                      >
                        Start Discussion
                      </Button>
                      <Button
                        className="client-button client-button-ghost"
                        onClick={() => navigate('/courses')}
                      >
                        Browse Courses
                      </Button>
                    </div>
                    <div className="community-workspace__sidebar-stats">
                      <div>
                        <strong>{heroMetrics.activeDiscussions}</strong>
                        <span>Rooms</span>
                      </div>
                      <div>
                        <strong>{heroMetrics.myDiscussions}</strong>
                        <span>My threads</span>
                      </div>
                      <div>
                        <strong>{notifications.filter((item) => item.type === 'CHAT' && !item.isRead).length}</strong>
                        <span>Unread replies</span>
                      </div>
                    </div>
                  </section>

                  {partialDataUnavailable ? (
                    <section className="client-card community-workspace__sidebar-card community-workspace__sidebar-card--notice">
                      <Sparkles size={18} />
                      <Typography.Text className="client-card-title">
                        Course metadata partially unavailable
                      </Typography.Text>
                      <Typography.Text className="client-meta">
                        Discussion rooms and announcements still load, but some instructor or course metadata could not be resolved.
                      </Typography.Text>
                    </section>
                  ) : null}
                </aside>
              </div>
            </>
          ) : null}
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
