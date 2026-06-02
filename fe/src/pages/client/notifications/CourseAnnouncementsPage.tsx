import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { BellRing, Megaphone } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, SectionHeader } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import {
  listNotificationsRequest,
  markNotificationAsReadRequest,
} from '../../../services/api/notificationApi';
import './ClientNotificationsPage.css';

type AnnouncementPriority = 'Important' | 'Reminder' | 'Update' | 'Event';

function formatDate(value?: string | null) {
  if (!value) {
    return 'No date available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function derivePriority(message: string): {
  label: AnnouncementPriority;
  className: string;
} {
  const lower = message.toLowerCase();

  if (/(maintenance|required|important|deadline|action required)/.test(lower)) {
    return { label: 'Important', className: 'client-badge client-badge-danger' };
  }

  if (/(reminder|due|submit|review)/.test(lower)) {
    return { label: 'Reminder', className: 'client-badge client-badge-warning' };
  }

  if (/(seminar|event|lecture|workshop|session)/.test(lower)) {
    return { label: 'Event', className: 'client-badge client-badge-info' };
  }

  return { label: 'Update', className: 'client-badge client-badge-info' };
}

function deriveAnnouncementTitle(message: string) {
  const firstSentence = message.split(/(?<=[.!?])\s/)[0]?.trim() ?? message.trim();
  return firstSentence.length > 88 ? `${firstSentence.slice(0, 85)}...` : firstSentence;
}

export function CourseAnnouncementsPage() {
  const { courseId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activePriority, setActivePriority] = useState<'ALL' | AnnouncementPriority>('ALL');

  const courseQuery = useQuery({
    queryKey: ['courses', 'detail', courseId],
    queryFn: () => getCourseByIdRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'course-announcements', courseId],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsReadRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'course-announcements', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  const announcements = useMemo(() => {
    return (notificationsQuery.data ?? [])
      .filter((item) => item.type === 'COURSE' && item.courseId === courseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => {
        const priority = derivePriority(item.message);
        return {
          item,
          title: deriveAnnouncementTitle(item.message),
          priority,
          createdAtLabel: formatDate(item.createdAt),
        };
      });
  }, [courseId, notificationsQuery.data]);

  const filteredAnnouncements = announcements.filter(
    (entry) => activePriority === 'ALL' || entry.priority.label === activePriority,
  );
  const importantAlert = announcements.find((entry) => entry.priority.label === 'Important' && !entry.item.isRead);
  const error = courseQuery.error || notificationsQuery.error;
  const unreadAnnouncements = announcements.filter((entry) => !entry.item.isRead);

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Instructor Announcements"
        subtitle={
          courseQuery.data
            ? `Official updates and reminders for ${courseQuery.data.title}.`
            : 'Official instructor updates and reminders.'
        }
      >
        <div className="notifications-workspace">
          {error ? (
            <section className="client-card notifications-workspace__state-card">
              <EmptyState
                title="Failed to load announcements"
                description="We couldn't load course announcements right now."
                action={
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => {
                      void courseQuery.refetch();
                      void notificationsQuery.refetch();
                    }}
                  >
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          {!error ? (
            <>
              {importantAlert ? (
                <section className="client-card notifications-workspace__banner">
                  <div className="notifications-workspace__banner-copy">
                    <span className="client-badge client-badge-danger">Important</span>
                    <Typography.Text className="client-card-title">{importantAlert.title}</Typography.Text>
                    <Typography.Text className="client-meta">{importantAlert.item.message}</Typography.Text>
                  </div>
                  <Button
                    className="client-button client-button-secondary"
                    onClick={() => markReadMutation.mutate(importantAlert.item.id)}
                  >
                    Dismiss
                  </Button>
                </section>
              ) : null}

              <div className="notifications-workspace__layout">
                <div className="notifications-workspace__main">
                  <section className="client-card notifications-workspace__hero">
                    <div className="notifications-workspace__hero-copy">
                      <Typography.Title level={2} className="notifications-workspace__hero-title">
                        Course Announcements
                      </Typography.Title>
                      <Typography.Paragraph className="client-body">
                        Official reminders, updates, and event notices for this course.
                      </Typography.Paragraph>
                      <div className="notifications-workspace__hero-metrics">
                        <div className="notifications-workspace__hero-metric">
                          <Typography.Text className="client-meta">Unread</Typography.Text>
                          <strong>{unreadAnnouncements.length}</strong>
                        </div>
                        <div className="notifications-workspace__hero-metric notifications-workspace__hero-metric--priority">
                          <Typography.Text className="client-meta">Important</Typography.Text>
                          <strong>{announcements.filter((item) => item.priority.label === 'Important').length}</strong>
                        </div>
                        <div className="notifications-workspace__hero-metric">
                          <Typography.Text className="client-meta">Reminders</Typography.Text>
                          <strong>{announcements.filter((item) => item.priority.label === 'Reminder').length}</strong>
                        </div>
                        <div className="notifications-workspace__hero-metric">
                          <Typography.Text className="client-meta">Events</Typography.Text>
                          <strong>{announcements.filter((item) => item.priority.label === 'Event').length}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="notifications-workspace__hero-actions">
                      <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                        Back to Course
                      </Button>
                      <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/discussion`)}>
                        Open Discussion
                      </Button>
                    </div>
                  </section>

                  <section className="client-card notifications-workspace__section">
                    <SectionHeader
                      title="Instructor Announcements"
                      subtitle="Official reminders, updates, and event notices for this course."
                      action={
                        <Button
                          className="client-button client-button-ghost"
                          onClick={() => navigate(`/courses/${courseId}`)}
                        >
                          View Course
                        </Button>
                      }
                    />
                    <div className="notifications-workspace__filters">
                      {(['ALL', 'Important', 'Reminder', 'Update', 'Event'] as const).map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          className={`notifications-workspace__filter${priority === activePriority ? ' notifications-workspace__filter--active' : ''}`}
                          onClick={() => setActivePriority(priority)}
                        >
                          {priority === 'ALL' ? 'All Levels' : priority}
                        </button>
                      ))}
                    </div>
                    {notificationsQuery.isLoading ? (
                      <div className="notifications-workspace__skeleton-list" aria-hidden="true">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="notifications-workspace__skeleton-card" />
                        ))}
                      </div>
                    ) : filteredAnnouncements.length ? (
                      <div className="notifications-workspace__announcement-list">
                        {filteredAnnouncements.map(({ item, title, priority, createdAtLabel }) => (
                          <article key={item.id} className="notifications-workspace__announcement-card">
                            <div className="notifications-workspace__announcement-image" aria-hidden="true">
                              <Megaphone size={18} />
                            </div>
                            <div className="notifications-workspace__announcement-copy">
                              <div className="notifications-workspace__announcement-header">
                                <span className={priority.className}>{priority.label}</span>
                                <Typography.Text className="client-meta">{createdAtLabel}</Typography.Text>
                              </div>
                              <Typography.Text className="client-card-title">{title}</Typography.Text>
                              <Typography.Text className="client-meta">
                                {item.message}
                              </Typography.Text>
                              <div className="notifications-workspace__announcement-actions">
                                {!item.isRead ? (
                                  <Button
                                    className="client-button client-button-secondary"
                                    onClick={() => markReadMutation.mutate(item.id)}
                                  >
                                    Read Announcement
                                  </Button>
                                ) : (
                                  <span className="client-badge">Read</span>
                                )}
                                <Button
                                  className="client-button client-button-ghost"
                                  onClick={() => navigate(`/courses/${courseId}/discussion`)}
                                >
                                  Open Discussion
                                </Button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No announcements"
                        description="No course announcements match this filter."
                        compact
                      />
                    )}
                  </section>
                </div>

                <aside className="notifications-workspace__aside">
                  <section className="client-card notifications-workspace__sidebar-card">
                    <SectionHeader title="Priority Levels" subtitle="What kinds of notices are active right now." />
                    <div className="notifications-workspace__priority-list">
                      {(['Important', 'Reminder', 'Update', 'Event'] as const).map((priority) => (
                        <div key={priority} className="notifications-workspace__priority-item">
                          <span className={getPriorityBadgeClass(priority)}>{priority}</span>
                          <strong>{announcements.filter((item) => item.priority.label === priority).length}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="client-card notifications-workspace__sidebar-card notifications-workspace__sidebar-card--support">
                    <BellRing size={18} />
                    <Typography.Text className="client-card-title">Stay Updated</Typography.Text>
                    <Typography.Text className="client-meta">
                      Course reminders, instructor notes, and deadline prompts all flow through this channel.
                    </Typography.Text>
                    <Button
                      className="client-button client-button-primary"
                      onClick={() => navigate('/notifications')}
                    >
                      Open Notifications Center
                    </Button>
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
function getPriorityBadgeClass(priority: AnnouncementPriority) {
  switch (priority) {
    case 'Important':
      return 'client-badge client-badge-danger';
    case 'Reminder':
      return 'client-badge client-badge-warning';
    case 'Event':
    case 'Update':
    default:
      return 'client-badge client-badge-info';
  }
}
