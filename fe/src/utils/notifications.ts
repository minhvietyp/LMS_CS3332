import type { NotificationItem } from '../services/api/notificationApi';

export type NotificationCategoryKey =
  | 'ALL'
  | 'UNREAD'
  | 'ASSIGNMENTS'
  | 'QUIZZES'
  | 'COURSES'
  | 'COMMUNITY'
  | 'ANNOUNCEMENTS'
  | 'SYSTEM';

export type NotificationUrgency = 'danger' | 'warning' | 'info' | 'neutral';

export function getNotificationDestination(notification: NotificationItem): string {
  if (notification.type === 'ASSIGNMENT') {
    if (notification.courseId && notification.referenceId) {
      return `/courses/${notification.courseId}/assignments/${notification.referenceId}`;
    }

    if (notification.courseId) {
      return `/courses/${notification.courseId}/assignments`;
    }

    return '/notifications';
  }

  if (notification.type === 'QUIZ') {
    if (notification.courseId && notification.referenceId) {
      return `/courses/${notification.courseId}/quizzes/${notification.referenceId}`;
    }

    if (notification.courseId) {
      return `/courses/${notification.courseId}/quizzes`;
    }

    return '/notifications';
  }

  if (notification.type === 'COURSE') {
    if (notification.courseId) {
      return `/courses/${notification.courseId}/announcements`;
    }

    return '/courses';
  }

  if (notification.type === 'CHAT') {
    if (notification.courseId) {
      return `/courses/${notification.courseId}/discussion`;
    }

    return '/community';
  }

  return '/notifications';
}

export function getNotificationTypeLabel(notification: NotificationItem): string {
  switch (notification.type) {
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
      return 'Announcement';
  }
}

export function getNotificationActionLabel(notification: NotificationItem): string {
  const message = notification.message.toLowerCase();

  switch (notification.type) {
    case 'ASSIGNMENT':
      if (/(feedback|graded|grade|review)/.test(message)) {
        return 'Review Submission';
      }
      if (/(due|deadline|submit|overdue|late)/.test(message)) {
        return 'Submit Assignment';
      }
      return 'Open Assignment';
    case 'QUIZ':
      if (/(result|score|passed|failed|review)/.test(message)) {
        return 'Review Result';
      }
      if (/(available|start|attempt)/.test(message)) {
        return 'Start Quiz';
      }
      return 'Open Quiz';
    case 'COURSE':
      return 'Read Announcement';
    case 'CHAT':
      return notification.courseId ? 'Open Discussion' : 'Open Community';
    case 'SYSTEM':
    default:
      return 'Open';
  }
}

export function getNotificationUrgency(notification: NotificationItem): NotificationUrgency {
  const message = notification.message.toLowerCase();

  if (notification.type === 'ASSIGNMENT' && /(overdue|late|deadline today|due today)/.test(message)) {
    return 'danger';
  }

  if (notification.type === 'QUIZ' && /(expired|no attempts left)/.test(message)) {
    return 'danger';
  }

  if (/(urgent|important|action required|maintenance|attention)/.test(message)) {
    return 'danger';
  }

  if (
    /(due soon|due tomorrow|available|reply|replied|feedback|graded|result|reminder|scheduled|updated)/.test(
      message,
    )
  ) {
    return 'warning';
  }

  if (notification.type === 'CHAT' || notification.type === 'QUIZ' || notification.type === 'COURSE') {
    return 'info';
  }

  return 'neutral';
}

export function getNotificationCategory(notification: NotificationItem): NotificationCategoryKey {
  switch (notification.type) {
    case 'ASSIGNMENT':
      return 'ASSIGNMENTS';
    case 'QUIZ':
      return 'QUIZZES';
    case 'CHAT':
      return 'COMMUNITY';
    case 'SYSTEM':
      return 'SYSTEM';
    case 'COURSE':
    default:
      return 'ANNOUNCEMENTS';
  }
}

export function getNotificationSourceLabel(notification: NotificationItem): string {
  if (notification.type === 'ASSIGNMENT') {
    return notification.courseId ? 'Assignment workspace' : 'Assignment update';
  }

  if (notification.type === 'QUIZ') {
    return notification.courseId ? 'Quiz workspace' : 'Quiz update';
  }

  if (notification.type === 'CHAT') {
    return notification.courseId ? 'Course discussion' : 'Community';
  }

  if (notification.type === 'COURSE') {
    return notification.courseId ? 'Course announcement' : 'Course update';
  }

  return 'System notification';
}
