import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EmptyState, SectionHeader } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import { listCoursesRequest } from '../../../services/api/courseApi';
import {
  listNotificationsRequest,
  markNotificationAsReadRequest,
  markAllNotificationsAsReadRequest,
  type NotificationItem,
} from '../../../services/api/notificationApi';
import {
  getNotificationActionLabel,
  getNotificationCategory,
  getNotificationDestination,
  getNotificationSourceLabel,
  getNotificationTypeLabel,
  getNotificationUrgency,
  type NotificationCategoryKey,
} from '../../../utils/notifications';
import './ClientNotificationsPage.css';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getUrgencyBadgeClassName(notification: NotificationItem) {
  switch (getNotificationUrgency(notification)) {
    case 'danger':
      return 'client-badge client-badge-danger';
    case 'warning':
      return 'client-badge client-badge-warning';
    case 'info':
      return 'client-badge client-badge-info';
    default:
      return 'client-badge';
  }
}

function getPriorityScore(notification: NotificationItem) {
  const urgency = getNotificationUrgency(notification);
  const urgencyWeight = urgency === 'danger' ? 4 : urgency === 'warning' ? 3 : urgency === 'info' ? 2 : 1;
  const unreadWeight = notification.isRead ? 0 : 3;
  const typeWeight =
    notification.type === 'ASSIGNMENT'
      ? 4
      : notification.type === 'QUIZ'
        ? 3
        : notification.type === 'CHAT'
          ? 2
          : notification.type === 'COURSE'
            ? 2
            : 1;

  return urgencyWeight * 10 + unreadWeight + typeWeight;
}

function matchesCategory(item: NotificationItem, category: NotificationCategoryKey) {
  if (category === 'ALL') return true;
  if (category === 'UNREAD') return !item.isRead;
  return getNotificationCategory(item) === category;
}

function getCategoryLabel(category: NotificationCategoryKey) {
  switch (category) {
    case 'UNREAD':
      return 'Unread';
    case 'ASSIGNMENTS':
      return 'Assignments';
    case 'QUIZZES':
      return 'Quizzes';
    case 'COURSES':
      return 'Courses';
    case 'COMMUNITY':
      return 'Community';
    case 'ANNOUNCEMENTS':
      return 'Announcements';
    case 'SYSTEM':
      return 'System';
    default:
      return 'All';
  }
}

function getPrioritySectionTitle(notification: NotificationItem) {
  if (notification.type === 'ASSIGNMENT') return 'Assignment Alert';
  if (notification.type === 'QUIZ') return 'Quiz Alert';
  if (notification.type === 'CHAT') return 'Discussion Reply';
  if (notification.type === 'COURSE') return 'Announcement';
  return 'System Update';
}

function getNotificationGroup(value: string) {
  const createdAt = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const createdTime = createdAt.getTime();
  const diffDays = Math.floor((startOfToday - new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).getTime()) / (1000 * 60 * 60 * 24));

  if (createdTime >= startOfToday) return 'Today';
  if (diffDays <= 7) return 'This Week';
  return 'Older';
}

export function ClientNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<NotificationCategoryKey>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const coursesQuery = useQuery({
    queryKey: ['notifications', 'action-courses'],
    queryFn: () => listCoursesRequest({ limit: 12 }),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsReadRequest,
    onMutate: async (notificationId) => {
      setActionError(null);
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueriesData<NotificationItem[]>({ queryKey: ['notifications'] });
      queryClient.setQueriesData<NotificationItem[]>({ queryKey: ['notifications'] }, (current) =>
        Array.isArray(current)
          ? current.map((item) =>
              item.id === notificationId
                ? {
                    ...item,
                    isRead: true,
                    readAt: item.readAt ?? new Date().toISOString(),
                  }
                : item,
            )
          : current,
      );

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      context?.previousNotifications.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      setActionError('We could not update that notification right now.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const courses = coursesQuery.data?.data ?? [];
  const firstCourse = courses[0] ?? null;
  const unreadNotifications = notifications.filter((item) => !item.isRead);
  const priorityActions = [...notifications]
    .filter((item) => !item.isRead)
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
    .slice(0, 5);

  const filteredNotifications = useMemo(
    () => notifications.filter((item) => matchesCategory(item, activeCategory)),
    [activeCategory, notifications],
  );
  const groupedNotifications = useMemo(
    () =>
      filteredNotifications.reduce<Record<string, NotificationItem[]>>((groups, item) => {
        const group = getNotificationGroup(item.createdAt);
        groups[group] = [...(groups[group] ?? []), item];
        return groups;
      }, {}),
    [filteredNotifications],
  );

  const categoryTabs = useMemo(() => {
    const counts: Record<NotificationCategoryKey, number> = {
      ALL: notifications.length,
      UNREAD: unreadNotifications.length,
      ASSIGNMENTS: notifications.filter((item) => getNotificationCategory(item) === 'ASSIGNMENTS').length,
      QUIZZES: notifications.filter((item) => getNotificationCategory(item) === 'QUIZZES').length,
      COURSES: 0,
      COMMUNITY: notifications.filter((item) => getNotificationCategory(item) === 'COMMUNITY').length,
      ANNOUNCEMENTS: notifications.filter((item) => getNotificationCategory(item) === 'ANNOUNCEMENTS').length,
      SYSTEM: notifications.filter((item) => getNotificationCategory(item) === 'SYSTEM').length,
    };

    return (['ALL', 'UNREAD', 'ASSIGNMENTS', 'QUIZZES', 'COMMUNITY', 'ANNOUNCEMENTS', 'SYSTEM'] as const)
      .filter((key) => key === 'ALL' || counts[key] > 0)
      .map((key) => ({ key, count: counts[key] }));
  }, [notifications, unreadNotifications.length]);

  const counts = useMemo(
    () => ({
      unread: unreadNotifications.length,
      priority: priorityActions.length,
      assignmentAlerts: notifications.filter((item) => item.type === 'ASSIGNMENT' && !item.isRead).length,
      quizAlerts: notifications.filter((item) => item.type === 'QUIZ' && !item.isRead).length,
      communityAlerts: notifications.filter((item) => item.type === 'CHAT' && !item.isRead).length,
    }),
    [notifications, priorityActions.length, unreadNotifications.length],
  );

  const quickActions = [
    {
      label: 'Continue Learning',
      variant: 'primary',
      action: () => navigate(firstCourse ? `/courses/${firstCourse.id}` : '/courses'),
    },
    { label: 'Open Calendar', variant: 'secondary', action: () => navigate('/calendar') },
    {
      label: 'View Assignments',
      variant: 'secondary',
      action: () => navigate(firstCourse ? `/courses/${firstCourse.id}/assignments` : '/courses'),
    },
    {
      label: 'View Quizzes',
      variant: 'secondary',
      action: () => navigate(firstCourse ? `/courses/${firstCourse.id}/quizzes` : '/courses'),
    },
    { label: 'Open Community', variant: 'secondary', action: () => navigate('/student/community') },
    { label: 'Browse Courses', variant: 'secondary', action: () => navigate('/courses') },
  ] as const;

  async function handleMarkRead(notificationId: string) {
    try {
      await markReadMutation.mutateAsync(notificationId);
    } catch {
      // handled in mutation lifecycle
    }
  }

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsReadRequest,
    onMutate: async () => {
      setActionError(null);
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previous = queryClient.getQueryData<NotificationItem[]>(['notifications', 'list']);

      queryClient.setQueryData<NotificationItem[]>(['notifications', 'list'], (current) =>
        Array.isArray(current)
          ? current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }))
          : current,
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', 'list'], context.previous);
      }
      setActionError('We could not mark every notification as read.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  async function handleMarkAllRead() {
    if (!unreadNotifications.length) return;

    try {
      await markAllMutation.mutateAsync();
    } catch {
      // handled in mutation lifecycle
    }
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Notifications Center"
        subtitle={
          user?.role === 'INSTRUCTOR'
            ? 'Track course alerts, teaching notices, and community updates.'
            : 'Manage your academic alerts, unread items, and next learning actions.'
        }
      >
        <div className="notifications-workspace">
          {notificationsQuery.error ? (
            <section className="client-card notifications-workspace__state-card">
              <EmptyState
                title="Failed to load notifications"
                description="We couldn't load your learning action center right now."
                action={
                  <Button className="client-button client-button-primary" onClick={() => void notificationsQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            </section>
          ) : null}

          {!notificationsQuery.error ? (
            <>
              <section className="client-card notifications-workspace__hero">
                <div className="notifications-workspace__hero-copy">
                  <Typography.Title level={2} className="notifications-workspace__hero-title">
                    Learning Action Center
                  </Typography.Title>
                  <Typography.Paragraph className="client-body">
                    Review urgent alerts first, then manage the rest of your academic activity stream.
                  </Typography.Paragraph>
                  <div className="notifications-workspace__hero-metrics">
                    <div className="notifications-workspace__hero-metric">
                      <Typography.Text className="client-meta">Unread</Typography.Text>
                      <strong>{counts.unread}</strong>
                    </div>
                    <div className="notifications-workspace__hero-metric notifications-workspace__hero-metric--priority">
                      <Typography.Text className="client-meta">High Priority</Typography.Text>
                      <strong>{counts.priority}</strong>
                    </div>
                    <div className="notifications-workspace__hero-metric">
                      <Typography.Text className="client-meta">Assignments</Typography.Text>
                      <strong>{counts.assignmentAlerts}</strong>
                    </div>
                    <div className="notifications-workspace__hero-metric">
                      <Typography.Text className="client-meta">Quizzes</Typography.Text>
                      <strong>{counts.quizAlerts}</strong>
                    </div>
                    <div className="notifications-workspace__hero-metric">
                      <Typography.Text className="client-meta">Community</Typography.Text>
                      <strong>{counts.communityAlerts}</strong>
                    </div>
                  </div>
                </div>
                <div className="notifications-workspace__hero-actions">
                  <Button
                    className="client-button client-button-primary"
                    disabled={!unreadNotifications.length || markReadMutation.isPending}
                    onClick={() => void handleMarkAllRead()}
                  >
                    Mark All Read
                  </Button>
                  <Button className="client-button client-button-secondary" onClick={() => navigate('/calendar')}>
                    Open Calendar
                  </Button>
                </div>
              </section>

              {actionError ? (
                <section className="client-card notifications-workspace__banner">
                  <div className="notifications-workspace__banner-copy">
                    <Typography.Text className="client-card-title">Notification action failed</Typography.Text>
                    <Typography.Text className="client-meta">{actionError}</Typography.Text>
                  </div>
                  <Button className="client-button client-button-ghost" onClick={() => setActionError(null)}>
                    Dismiss
                  </Button>
                </section>
              ) : null}

              <div className="notifications-workspace__layout">
                <div className="notifications-workspace__main">
                  <section className="client-card notifications-workspace__section">
                    <SectionHeader
                      title="Priority Notifications"
                      subtitle="Unread items that need action or review first."
                      action={
                        <Button className="client-button client-button-ghost" onClick={() => setActiveCategory('UNREAD')}>
                          View Unread
                        </Button>
                      }
                    />
                    {notificationsQuery.isLoading ? (
                      <div className="notifications-workspace__skeleton-list" aria-hidden="true">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="notifications-workspace__skeleton-card" />
                        ))}
                      </div>
                    ) : priorityActions.length ? (
                      <div className="notifications-workspace__priority-actions">
                        {priorityActions.map((notification) => (
                          <article key={notification.id} className="notifications-workspace__priority-card">
                            <div className="notifications-workspace__priority-copy">
                              <div className="notifications-workspace__priority-head">
                                <span className={getUrgencyBadgeClassName(notification)}>{getNotificationTypeLabel(notification)}</span>
                                <Typography.Text className="client-meta">{formatDate(notification.createdAt)}</Typography.Text>
                              </div>
                              <Typography.Text className="client-caption">{getPrioritySectionTitle(notification)}</Typography.Text>
                              <Typography.Text className="client-card-title">{notification.message}</Typography.Text>
                              <Typography.Text className="client-meta">{getNotificationSourceLabel(notification)}</Typography.Text>
                            </div>
                            <div className="notifications-workspace__priority-card-actions">
                              <Button
                                className="client-button client-button-primary"
                                onClick={() => navigate(getNotificationDestination(notification))}
                              >
                                {getNotificationActionLabel(notification)}
                              </Button>
                              <Button
                                className="client-button client-button-ghost"
                                onClick={() => void handleMarkRead(notification.id)}
                              >
                                Mark Read
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No priority notifications"
                        description="You're caught up on urgent alerts for now."
                        action={
                          <Button className="client-button client-button-secondary" onClick={() => navigate('/calendar')}>
                            Open Calendar
                          </Button>
                        }
                        compact
                      />
                    )}
                  </section>

                  <section className="client-card notifications-workspace__section">
                    <SectionHeader title="Categories" subtitle="Filter the feed by the kind of update you need right now." />
                    <div className="notifications-workspace__filters" role="tablist" aria-label="Notification categories">
                      {categoryTabs.map(({ key, count }) => (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={activeCategory === key}
                          className={`notifications-workspace__filter${key === activeCategory ? ' notifications-workspace__filter--active' : ''}`}
                          onClick={() => setActiveCategory(key)}
                        >
                          {getCategoryLabel(key)}
                          <span className="notifications-workspace__filter-count">{count}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="client-card notifications-workspace__section">
                    <SectionHeader title="Notification Feed" subtitle="Recent updates across assignments, quizzes, courses, and community activity." />
                    {notificationsQuery.isLoading ? (
                      <div className="notifications-workspace__skeleton-list" aria-hidden="true">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="notifications-workspace__skeleton-card" />
                        ))}
                      </div>
                    ) : filteredNotifications.length ? (
                      <div className="notifications-workspace__stream">
                        {(['Today', 'This Week', 'Older'] as const).map((groupLabel) =>
                          groupedNotifications[groupLabel]?.length ? (
                            <section key={groupLabel} className="notifications-workspace__group">
                              <div className="notifications-workspace__group-header">
                                <Typography.Text className="client-card-title">{groupLabel}</Typography.Text>
                                <Typography.Text className="client-meta">{groupedNotifications[groupLabel].length} items</Typography.Text>
                              </div>
                              <div className="notifications-workspace__group-list">
                                {groupedNotifications[groupLabel].map((item) => (
                                  <article
                                    key={item.id}
                                    className={`notifications-workspace__feed-card${!item.isRead ? ' notifications-workspace__feed-card--unread' : ''}`}
                                  >
                                    <div className="notifications-workspace__feed-main">
                                      <div className="notifications-workspace__feed-head">
                                        <div className="notifications-workspace__feed-labels">
                                          <span className={getUrgencyBadgeClassName(item)}>{getNotificationTypeLabel(item)}</span>
                                          {!item.isRead ? <span className="client-badge client-badge-info">Unread</span> : <span className="client-badge">Read</span>}
                                        </div>
                                        <Typography.Text className="client-meta">{formatDate(item.createdAt)}</Typography.Text>
                                      </div>
                                      <Typography.Text className="client-card-title">{item.message}</Typography.Text>
                                      <Typography.Text className="client-meta">{getNotificationSourceLabel(item)}</Typography.Text>
                                    </div>
                                    <div className="notifications-workspace__feed-actions">
                                      <Button
                                        className={`client-button ${item.type === 'ASSIGNMENT' || item.type === 'QUIZ' ? 'client-button-primary' : 'client-button-secondary'}`}
                                        onClick={() => navigate(getNotificationDestination(item))}
                                      >
                                        {getNotificationActionLabel(item)}
                                      </Button>
                                      {!item.isRead ? (
                                        <Button className="client-button client-button-ghost" onClick={() => void handleMarkRead(item.id)}>
                                          Mark Read
                                        </Button>
                                      ) : null}
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </section>
                          ) : null,
                        )}
                      </div>
                    ) : activeCategory === 'UNREAD' ? (
                      <EmptyState title="No unread notifications" description="You have reviewed every alert in your current feed." compact />
                    ) : (
                      <EmptyState
                        title="No notifications in this category"
                        description="Try a different category or come back when new activity appears."
                        compact
                      />
                    )}
                  </section>
                </div>

                <aside className="notifications-workspace__aside">
                  <section className="client-card notifications-workspace__sidebar-card">
                    <SectionHeader title="Quick Actions" subtitle="Jump straight into the next learning task." />
                    <div className="notifications-workspace__sidebar-actions">
                      {quickActions.map((item) => (
                        <Button
                          key={item.label}
                          className={`client-button ${item.variant === 'primary' ? 'client-button-primary' : 'client-button-secondary'}`}
                          onClick={item.action}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </section>

                  <section className="client-card notifications-workspace__sidebar-card">
                    <SectionHeader title="Management" subtitle="Real controls for your current notification queue." />
                    <div className="notifications-workspace__channel-list">
                      <div className="notifications-workspace__channel-item">
                        <span>Unread alerts</span>
                        <strong>{counts.unread}</strong>
                      </div>
                      <div className="notifications-workspace__channel-item">
                        <span>Action required</span>
                        <strong>{counts.priority}</strong>
                      </div>
                    </div>
                    <div className="notifications-workspace__sidebar-actions">
                      <Button
                        className="client-button client-button-secondary"
                        disabled={!counts.unread || markReadMutation.isPending}
                        onClick={() => void handleMarkAllRead()}
                      >
                        Mark All Read
                      </Button>
                      <Button className="client-button client-button-ghost" onClick={() => setActiveCategory('UNREAD')}>
                        Filter Unread
                      </Button>
                    </div>
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
