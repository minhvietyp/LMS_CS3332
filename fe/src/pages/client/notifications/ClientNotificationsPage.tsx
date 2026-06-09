import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Info,
  MailOpen,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, SectionHeader } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import {
  listNotificationsRequest,
  markAllNotificationsAsReadRequest,
  markNotificationAsReadRequest,
  type NotificationItem,
  type NotificationType,
} from '../../../services/api/notificationApi';
import './ClientNotificationsPage.css';

type NotificationFilter = 'ALL' | 'UNREAD' | NotificationType;
type NotificationGroup = 'Today' | 'This Week' | 'Older';

const NOTIFICATION_FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'COURSE', label: 'Course' },
  { key: 'ASSIGNMENT', label: 'Assignments' },
  { key: 'QUIZ', label: 'Quizzes' },
  { key: 'CHAT', label: 'Community' },
  { key: 'SYSTEM', label: 'System' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getTimeGroup(value: string): NotificationGroup {
  const createdAt = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const itemDay = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).getTime();
  const ageInDays = Math.floor((today - itemDay) / (1000 * 60 * 60 * 24));

  if (itemDay >= today) return 'Today';
  if (ageInDays <= 7) return 'This Week';
  return 'Older';
}

function getTypeLabel(type: NotificationType) {
  switch (type) {
    case 'ASSIGNMENT':
      return 'Assignment';
    case 'QUIZ':
      return 'Quiz';
    case 'CHAT':
      return 'Community';
    case 'SYSTEM':
      return 'System';
    case 'COURSE':
    default:
      return 'Course';
  }
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ASSIGNMENT':
      return <ClipboardList aria-hidden="true" size={18} />;
    case 'QUIZ':
      return <FileQuestion aria-hidden="true" size={18} />;
    case 'CHAT':
      return <MessageCircle aria-hidden="true" size={18} />;
    case 'SYSTEM':
      return <ShieldAlert aria-hidden="true" size={18} />;
    case 'COURSE':
    default:
      return <BookOpen aria-hidden="true" size={18} />;
  }
}

function getNotificationTitle(notification: NotificationItem) {
  const message = notification.message.trim();
  const firstSentence = message.split(/[.!?]/).find(Boolean)?.trim();

  if (firstSentence && firstSentence.length <= 80) {
    return firstSentence;
  }

  switch (notification.type) {
    case 'ASSIGNMENT':
      return 'Assignment update';
    case 'QUIZ':
      return 'Quiz update';
    case 'CHAT':
      return 'Community update';
    case 'SYSTEM':
      return 'System message';
    case 'COURSE':
    default:
      return 'Course update';
  }
}

function getPreviewMessage(notification: NotificationItem) {
  const title = getNotificationTitle(notification);
  const message = notification.message.trim();

  if (message === title || message.startsWith(`${title}.`) || message.startsWith(`${title}!`) || message.startsWith(`${title}?`)) {
    const remainder = message.length > title.length ? message.slice(title.length + 1).trim() : '';
    return remainder || message;
  }

  return message;
}

function getRelatedLabel(notification: NotificationItem) {
  if (notification.courseId && notification.referenceId) {
    return `Course linked · Item ${notification.referenceId}`;
  }

  if (notification.courseId) {
    return 'Course linked';
  }

  if (notification.referenceId) {
    return `Reference ${notification.referenceId}`;
  }

  return 'No related item attached';
}

function getNotificationAction(notification: NotificationItem): { label: string; to: string } | null {
  if (notification.type === 'ASSIGNMENT' && notification.courseId) {
    return {
      label: notification.referenceId ? 'View assignment' : 'View assignments',
      to: notification.referenceId
        ? `/courses/${notification.courseId}/assignments/${notification.referenceId}`
        : `/courses/${notification.courseId}/assignments`,
    };
  }

  if (notification.type === 'QUIZ' && notification.courseId) {
    return {
      label: notification.referenceId ? 'View quiz' : 'View quizzes',
      to: notification.referenceId
        ? `/courses/${notification.courseId}/quizzes/${notification.referenceId}`
        : `/courses/${notification.courseId}/quizzes`,
    };
  }

  if (notification.type === 'COURSE' && notification.courseId) {
    return { label: 'View course updates', to: `/courses/${notification.courseId}/announcements` };
  }

  if (notification.type === 'CHAT') {
    return notification.courseId
      ? { label: 'Open discussion', to: `/courses/${notification.courseId}/discussion` }
      : { label: 'Open messages', to: '/chat' };
  }

  return null;
}

function matchesFilter(notification: NotificationItem, filter: NotificationFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'UNREAD') return !notification.isRead;
  return notification.type === filter;
}

function getEmptyCopy(filter: NotificationFilter, hasNotifications: boolean) {
  if (!hasNotifications) {
    return {
      title: 'No notifications yet.',
      description: 'Course, assignment, quiz, community, and system updates will appear here.',
    };
  }

  if (filter === 'UNREAD') {
    return {
      title: 'You are all caught up.',
      description: 'Every notification in this feed has already been reviewed.',
    };
  }

  return {
    title: 'No notifications match your filters.',
    description: 'Try another notification type or return to the full feed.',
  };
}

export function ClientNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const notifications = notificationsQuery.data ?? [];

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
                ? { ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }
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

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsReadRequest,
    onMutate: async () => {
      setActionError(null);
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueriesData<NotificationItem[]>({ queryKey: ['notifications'] });
      queryClient.setQueriesData<NotificationItem[]>({ queryKey: ['notifications'] }, (current) =>
        Array.isArray(current)
          ? current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() }))
          : current,
      );

      return { previousNotifications };
    },
    onError: (_error, _vars, context) => {
      context?.previousNotifications.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      setActionError('We could not mark every notification as read.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const summaryCards = useMemo(
    () => [
      {
        label: 'Unread',
        value: notifications.filter((item) => !item.isRead).length,
        helper: 'Needs review',
        icon: <Bell aria-hidden="true" size={18} />,
      },
      {
        label: 'Course updates',
        value: notifications.filter((item) => item.type === 'COURSE').length,
        helper: 'Announcements',
        icon: <BookOpen aria-hidden="true" size={18} />,
      },
      {
        label: 'Assignment/quiz updates',
        value: notifications.filter((item) => item.type === 'ASSIGNMENT' || item.type === 'QUIZ').length,
        helper: 'Learning tasks',
        icon: <ClipboardList aria-hidden="true" size={18} />,
      },
      {
        label: 'System updates',
        value: notifications.filter((item) => item.type === 'SYSTEM').length,
        helper: 'Platform notices',
        icon: <Info aria-hidden="true" size={18} />,
      },
    ],
    [notifications],
  );

  const filterCounts = useMemo(
    () =>
      NOTIFICATION_FILTERS.reduce<Record<NotificationFilter, number>>(
        (counts, filter) => ({
          ...counts,
          [filter.key]:
            filter.key === 'ALL'
              ? notifications.length
              : filter.key === 'UNREAD'
                ? notifications.filter((item) => !item.isRead).length
                : notifications.filter((item) => item.type === filter.key).length,
        }),
        {} as Record<NotificationFilter, number>,
      ),
    [notifications],
  );

  const visibleFilters = useMemo(
    () => NOTIFICATION_FILTERS.filter((filter) => filter.key === 'ALL' || filter.key === 'UNREAD' || filterCounts[filter.key] > 0),
    [filterCounts],
  );

  const filteredNotifications = useMemo(
    () => notifications.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter, notifications],
  );

  const groupedNotifications = useMemo(
    () =>
      filteredNotifications.reduce<Record<NotificationGroup, NotificationItem[]>>(
        (groups, item) => {
          const group = getTimeGroup(item.createdAt);
          groups[group] = [...groups[group], item];
          return groups;
        },
        { Today: [], 'This Week': [], Older: [] },
      ),
    [filteredNotifications],
  );

  const unreadCount = filterCounts.UNREAD;
  const emptyCopy = getEmptyCopy(activeFilter, notifications.length > 0);

  async function handleMarkRead(notificationId: string) {
    try {
      await markReadMutation.mutateAsync(notificationId);
    } catch {
      // Error message is surfaced through mutation state.
    }
  }

  async function handleMarkAllRead() {
    if (!unreadCount) return;

    try {
      await markAllMutation.mutateAsync();
    } catch {
      // Error message is surfaced through mutation state.
    }
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Notifications"
        subtitle="Review unread updates, course activity, assignments, grades, and system messages."
      >
        <div className="notifications-page">
          {notificationsQuery.error ? (
            <section className="client-card notifications-page__state-card">
              <EmptyState
                title="Failed to load notifications"
                description="We could not load your notification feed right now."
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
              <section className="notifications-page__summary" aria-label="Notification summary">
                {summaryCards.map((card) => (
                  <article key={card.label} className="client-card notifications-page__summary-card">
                    <span className="notifications-page__summary-icon">{card.icon}</span>
                    <div>
                      <Typography.Text className="client-meta">{card.label}</Typography.Text>
                      <strong>{card.value}</strong>
                      <span>{card.helper}</span>
                    </div>
                  </article>
                ))}
              </section>

              <section className="client-card notifications-page__toolbar">
                <SectionHeader
                  title="Notification Feed"
                  subtitle="Filter by real notification types returned by the LMS."
                  action={
                    <Button
                      className="client-button client-button-primary"
                      disabled={!unreadCount || markAllMutation.isPending}
                      onClick={() => void handleMarkAllRead()}
                    >
                      <CheckCircle2 aria-hidden="true" size={16} />
                      Mark all read
                    </Button>
                  }
                />

                {actionError ? (
                  <div className="notifications-page__error" role="alert">
                    <span>{actionError}</span>
                    <Button className="client-button client-button-ghost" onClick={() => setActionError(null)}>
                      Dismiss
                    </Button>
                  </div>
                ) : null}

                <div className="notifications-page__filters" role="tablist" aria-label="Notification filters">
                  {visibleFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      role="tab"
                      aria-selected={activeFilter === filter.key}
                      className={`notifications-page__filter${activeFilter === filter.key ? ' notifications-page__filter--active' : ''}`}
                      onClick={() => setActiveFilter(filter.key)}
                    >
                      <span>{filter.label}</span>
                      <strong>{filterCounts[filter.key]}</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="notifications-page__content" aria-label="Notifications">
                {notificationsQuery.isLoading ? (
                  <div className="notifications-page__skeleton-list" aria-hidden="true">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="client-card notifications-page__skeleton-card" />
                    ))}
                  </div>
                ) : filteredNotifications.length ? (
                  (['Today', 'This Week', 'Older'] as const).map((group) =>
                    groupedNotifications[group].length ? (
                      <section key={group} className="client-card notifications-page__group">
                        <div className="notifications-page__group-header">
                          <Typography.Title level={3}>{group}</Typography.Title>
                          <Typography.Text className="client-meta">{groupedNotifications[group].length} updates</Typography.Text>
                        </div>

                        <div className="notifications-page__list">
                          {groupedNotifications[group].map((notification) => {
                            const action = getNotificationAction(notification);
                            const previewMessage = getPreviewMessage(notification);

                            return (
                              <article
                                key={notification.id}
                                className={`notifications-page__item${notification.isRead ? '' : ' notifications-page__item--unread'}`}
                              >
                                <div className={`notifications-page__item-icon notifications-page__item-icon--${notification.type.toLowerCase()}`}>
                                  {getNotificationIcon(notification.type)}
                                </div>

                                <div className="notifications-page__item-body">
                                  <div className="notifications-page__item-head">
                                    <div className="notifications-page__item-title-row">
                                      {!notification.isRead ? <span className="notifications-page__unread-dot" aria-label="Unread" /> : null}
                                      <Typography.Title level={4}>{getNotificationTitle(notification)}</Typography.Title>
                                    </div>
                                    <Typography.Text className="client-meta">{formatDate(notification.createdAt)}</Typography.Text>
                                  </div>

                                  <Typography.Paragraph className="notifications-page__message">
                                    {previewMessage}
                                  </Typography.Paragraph>

                                  <div className="notifications-page__meta-row">
                                    <span className="client-badge">{getTypeLabel(notification.type)}</span>
                                    <span className={notification.isRead ? 'client-badge' : 'client-badge client-badge-info'}>
                                      {notification.isRead ? 'Read' : 'Unread'}
                                    </span>
                                    <span className="notifications-page__related">{getRelatedLabel(notification)}</span>
                                  </div>
                                </div>

                                <div className="notifications-page__item-actions">
                                  {action ? (
                                    <Button className="client-button client-button-secondary" onClick={() => navigate(action.to)}>
                                      {action.label}
                                    </Button>
                                  ) : null}
                                  {!notification.isRead ? (
                                    <Button
                                      className="client-button client-button-primary"
                                      disabled={markReadMutation.isPending}
                                      onClick={() => void handleMarkRead(notification.id)}
                                    >
                                      <MailOpen aria-hidden="true" size={16} />
                                      Mark as read
                                    </Button>
                                  ) : null}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ) : null,
                  )
                ) : (
                  <section className="client-card notifications-page__state-card">
                    <EmptyState title={emptyCopy.title} description={emptyCopy.description} compact />
                  </section>
                )}
              </section>
            </>
          ) : null}
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
