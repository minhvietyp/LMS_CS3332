import type { QueryClient } from '@tanstack/react-query';
import type {
  AssignmentListItem,
  StudentAssignmentDetail,
  StudentAssignmentListItem,
} from '../services/api/assignmentApi';
import type { ChatRoomItem } from '../services/api/chatApi';
import type {
  CourseDetail,
  CourseListItem,
  CourseModuleItem,
} from '../services/api/courseApi';
import type { NotificationItem } from '../services/api/notificationApi';
import type {
  QuizListItem,
  StudentQuizCourseItem,
  StudentQuizDetail,
} from '../services/api/quizApi';
import {
  getNotificationDestination,
  getNotificationSourceLabel,
} from './notifications';

export type WorkspaceSearchItemType =
  | 'Quick Action'
  | 'Course'
  | 'Lesson'
  | 'Assignment'
  | 'Quiz'
  | 'Discussion'
  | 'Announcement'
  | 'Notification';

export type WorkspaceRecentItemType =
  | 'course'
  | 'lesson'
  | 'assignment'
  | 'quiz'
  | 'discussion';

export type WorkspaceSearchItem = {
  id: string;
  route: string;
  title: string;
  subtitle?: string;
  type: WorkspaceSearchItemType;
  keywords: string[];
};

export type RecentWorkspaceItem = {
  id: string;
  route: string;
  title: string;
  subtitle?: string;
  type: WorkspaceRecentItemType;
  updatedAt: string;
};

export type FrequentWorkspaceItem = {
  id: string;
  route: string;
  title: string;
  subtitle?: string;
  type: WorkspaceSearchItemType;
  count: number;
  updatedAt: string;
};

export const RECENT_WORKSPACE_STORAGE_KEY = 'client-shell.recent-workspace';
export const FREQUENT_WORKSPACE_STORAGE_KEY = 'client-shell.frequent-workspace';

function normalizeText(value?: string | null) {
  return value?.toLowerCase().trim() ?? '';
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function mapSearchTypeToRecentType(type: WorkspaceSearchItemType): WorkspaceRecentItemType | null {
  switch (type) {
    case 'Course':
      return 'course';
    case 'Lesson':
      return 'lesson';
    case 'Assignment':
      return 'assignment';
    case 'Quiz':
      return 'quiz';
    case 'Discussion':
      return 'discussion';
    default:
      return null;
  }
}

export function readRecentWorkspace(): RecentWorkspaceItem[] {
  const items = safeReadJson<RecentWorkspaceItem[]>(RECENT_WORKSPACE_STORAGE_KEY, []);
  return items
    .filter((item) => Boolean(item.route && item.title))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function recordRecentWorkspace(item: {
  id: string;
  route: string;
  title: string;
  subtitle?: string;
  type: WorkspaceRecentItemType;
}) {
  const current = readRecentWorkspace();
  const nextEntry: RecentWorkspaceItem = {
    ...item,
    updatedAt: new Date().toISOString(),
  };
  const deduped = [nextEntry, ...current.filter((entry) => entry.id !== item.id)].slice(0, 8);
  safeWriteJson(RECENT_WORKSPACE_STORAGE_KEY, deduped);
}

export function readFrequentWorkspace(): FrequentWorkspaceItem[] {
  const items = safeReadJson<FrequentWorkspaceItem[]>(FREQUENT_WORKSPACE_STORAGE_KEY, []);
  return items
    .filter((item) => Boolean(item.route && item.title))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}

export function recordFrequentWorkspace(item: {
  id: string;
  route: string;
  title: string;
  subtitle?: string;
  type: WorkspaceSearchItemType;
}) {
  const current = readFrequentWorkspace();
  const existing = current.find((entry) => entry.id === item.id);
  const nextEntry: FrequentWorkspaceItem = {
    ...item,
    count: (existing?.count ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  const deduped = [nextEntry, ...current.filter((entry) => entry.id !== item.id)].slice(0, 12);
  safeWriteJson(FREQUENT_WORKSPACE_STORAGE_KEY, deduped);
}

function buildCourseItems(course: CourseListItem | CourseDetail) {
  return {
    id: `course-${course.id}`,
    route: `/courses/${course.id}`,
    title: course.title,
    subtitle: course.description ?? 'Course workspace',
    type: 'Course' as const,
    keywords: [course.title, course.description ?? '', course.instructor?.name ?? ''],
  };
}

export function collectWorkspaceSearchItems(queryClient: QueryClient): WorkspaceSearchItem[] {
  const collected: WorkspaceSearchItem[] = [];
  const queryEntries = queryClient.getQueriesData({});

  for (const [queryKey, data] of queryEntries) {
    const queryKeyParts = Array.isArray(queryKey) ? queryKey.map((part) => String(part)) : [String(queryKey)];
    const queryName = JSON.stringify(queryKey).toLowerCase();

    if (!data) {
      continue;
    }

    if (queryName.includes('notifications')) {
      const notifications = Array.isArray(data) ? (data as NotificationItem[]) : [];
      for (const notification of notifications) {
        collected.push({
          id: `notification-${notification.id}`,
          route: getNotificationDestination(notification),
          title: notification.message,
          subtitle: getNotificationSourceLabel(notification),
          type: notification.type === 'COURSE' ? 'Announcement' : 'Notification',
          keywords: [notification.message, notification.type, notification.courseId ?? ''],
        });
      }
    }

    if (queryName.includes('chat') && queryName.includes('rooms')) {
      const rooms = Array.isArray(data) ? (data as ChatRoomItem[]) : [];
      for (const room of rooms) {
        if (room.type !== 'COURSE' || !room.courseId) {
          continue;
        }

        collected.push({
          id: `discussion-${room.id}`,
          route: `/courses/${room.courseId}/discussion`,
          title: room.name || room.course?.title || 'Course Discussion',
          subtitle: room.course?.title ? `${room.course.title} discussion` : 'Course discussion',
          type: 'Discussion',
          keywords: [room.name ?? '', room.course?.title ?? '', 'discussion'],
        });
      }
    }

    if (queryName.includes('assignments')) {
      const assignmentArrays = Array.isArray(data) ? data : [];
      for (const assignment of assignmentArrays as Array<StudentAssignmentListItem | AssignmentListItem>) {
        if (!assignment?.id || !assignment?.title) {
          continue;
        }
        const courseId = assignment.courseId ?? null;
        if (!courseId) {
          continue;
        }
        collected.push({
          id: `assignment-${assignment.id}`,
          route: `/courses/${courseId}/assignments/${assignment.id}`,
          title: assignment.title,
          subtitle: assignment.description ?? 'Assignment workspace',
          type: 'Assignment',
          keywords: [assignment.title, assignment.description ?? '', courseId],
        });
      }

      if (!Array.isArray(data) && typeof data === 'object' && 'id' in (data as object)) {
        const assignment = data as StudentAssignmentDetail;
        if (assignment.id && assignment.title && assignment.courseId) {
          collected.push({
            id: `assignment-${assignment.id}`,
            route: `/courses/${assignment.courseId}/assignments/${assignment.id}`,
            title: assignment.title,
            subtitle: assignment.description ?? 'Assignment workspace',
            type: 'Assignment',
            keywords: [assignment.title, assignment.description ?? '', assignment.courseId],
          });
        }
      }
    }

    if (queryName.includes('quiz')) {
      const quizArrays = Array.isArray(data) ? data : [];
      for (const quiz of quizArrays as Array<StudentQuizCourseItem | QuizListItem>) {
        if (!quiz?.id || !quiz?.title) {
          continue;
        }
        const courseId = 'courseId' in quiz ? quiz.courseId : null;
        if (!courseId) {
          continue;
        }
        collected.push({
          id: `quiz-${quiz.id}`,
          route: `/courses/${courseId}/quizzes/${quiz.id}`,
          title: quiz.title,
          subtitle: 'Quiz workspace',
          type: 'Quiz',
          keywords: [quiz.title, 'quiz', courseId],
        });
      }

      if (!Array.isArray(data) && typeof data === 'object' && 'id' in (data as object)) {
        const quiz = data as StudentQuizDetail;
        if (quiz.id && quiz.title && quiz.courseId) {
          collected.push({
            id: `quiz-${quiz.id}`,
            route: `/courses/${quiz.courseId}/quizzes/${quiz.id}`,
            title: quiz.title,
            subtitle: 'Quiz workspace',
            type: 'Quiz',
            keywords: [quiz.title, 'quiz', quiz.courseId],
          });
        }
      }
    }

    if (queryName.includes('course-modules') || queryName.includes('client-modules') || queryName.includes('lesson-modules') || queryName.includes('continue-modules')) {
      const modules = Array.isArray(data) ? (data as CourseModuleItem[]) : [];
      const routeCourseId = queryKeyParts.at(-1) ?? null;
      if (!routeCourseId) {
        continue;
      }

      for (const module of modules) {
        for (const lesson of module.lessons ?? []) {
          collected.push({
            id: `lesson-${lesson.id}`,
            route: `/courses/${routeCourseId}/learn/${lesson.id}`,
            title: lesson.title,
            subtitle: `${module.title} lesson`,
            type: 'Lesson',
            keywords: [lesson.title, module.title, 'lesson'],
          });
        }
      }
    }

    if (queryName.includes('courses')) {
      const rawCourses =
        Array.isArray(data)
          ? data
          : typeof data === 'object' && data && 'data' in (data as object)
            ? (data as { data: CourseListItem[] }).data
            : null;

      if (Array.isArray(rawCourses)) {
        for (const course of rawCourses) {
          if (course?.id && course?.title) {
            collected.push(buildCourseItems(course));
          }
        }
      } else if (!Array.isArray(data) && typeof data === 'object' && data && 'id' in (data as object)) {
        const course = data as CourseListItem;
        if (course.id && course.title) {
          collected.push(buildCourseItems(course));
        }
      }
    }
  }

  return uniqueById(collected);
}

export function deriveRecentWorkspaceFromPath(pathname: string, queryClient: QueryClient): RecentWorkspaceItem | null {
  const searchItems = collectWorkspaceSearchItems(queryClient);
  const directMatch = searchItems.find((item) => item.route === pathname);
  if (directMatch) {
    const type = mapSearchTypeToRecentType(directMatch.type);
    if (!type) {
      return null;
    }

    return {
      id: directMatch.id,
      route: directMatch.route,
      title: directMatch.title,
      subtitle: directMatch.subtitle,
      type,
      updatedAt: new Date().toISOString(),
    };
  }

  const courseMatch = pathname.match(/^\/courses\/([^/]+)$/);
  if (courseMatch) {
    const courseId = courseMatch[1];
    const courseItem = searchItems.find((item) => item.type === 'Course' && item.route === pathname);
    return {
      id: `course-${courseId}`,
      route: pathname,
      title: courseItem?.title ?? 'Course workspace',
      subtitle: courseItem?.subtitle,
      type: 'course',
      updatedAt: new Date().toISOString(),
    };
  }

  const discussionMatch = pathname.match(/^\/courses\/([^/]+)\/discussion$/);
  if (discussionMatch) {
    const discussionItem = searchItems.find((item) => item.type === 'Discussion' && item.route === pathname);
    return {
      id: `discussion-${discussionMatch[1]}`,
      route: pathname,
      title: discussionItem?.title ?? 'Course discussion',
      subtitle: discussionItem?.subtitle,
      type: 'discussion',
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export function filterWorkspaceSearchItems(items: WorkspaceSearchItem[], query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  return items.filter(
    (item) =>
      item.keywords.some((keyword) => normalizeText(keyword).includes(normalizedQuery)) ||
      normalizeText(item.title).includes(normalizedQuery) ||
      normalizeText(item.subtitle).includes(normalizedQuery),
  );
}
