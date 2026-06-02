import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCourseByIdRequest,
  listPublishedCourseModulesRequest,
  type CourseModuleItem,
} from '../services/api/courseApi';
import { progressService } from '../services/api/progressService';
import { useMyProgressHistory, useProgressOverview } from './useProgressOverview';

type FlattenedLesson = {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  orderIndex: number;
};

function flattenLessons(modules: CourseModuleItem[]) {
  return modules
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map(
          (lesson): FlattenedLesson => ({
            id: lesson.id,
            title: lesson.title,
            moduleId: module.id,
            moduleTitle: module.title,
            orderIndex: lesson.orderIndex,
          }),
        ),
    );
}

function getLearningStreak(timestamps: string[]) {
  const uniqueDays = [...new Set(timestamps.map((value) => new Date(value).toISOString().slice(0, 10)))];
  if (!uniqueDays.length) {
    return 0;
  }

  const daySet = new Set(uniqueDays);
  const cursor = new Date();
  let streak = 0;

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!daySet.has(key)) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        const previousKey = cursor.toISOString().slice(0, 10);
        if (!daySet.has(previousKey)) {
          return 0;
        }
      } else {
        break;
      }
    } else {
      streak += 1;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function useClientContinueLearning() {
  const overviewQuery = useProgressOverview();
  const historyQuery = useMyProgressHistory({ page: 1, pageSize: 12 });
  const activeCourses = useMemo(
    () => (overviewQuery.data?.courses ?? []).filter((course) => course.enrollmentStatus === 'ACTIVE'),
    [overviewQuery.data?.courses],
  );

  const selectedCourse = useMemo(() => {
    const recentHistoryCourseId = historyQuery.data?.items.find((item) =>
      activeCourses.some((course) => course.courseId === item.courseId),
    )?.courseId;

    return (
      activeCourses.find((course) => course.courseId === recentHistoryCourseId) ??
      activeCourses[0] ??
      overviewQuery.data?.courses[0] ??
      null
    );
  }, [activeCourses, historyQuery.data?.items, overviewQuery.data?.courses]);

  const courseId = selectedCourse?.courseId ?? null;

  const courseQuery = useQuery({
    queryKey: ['shell', 'continue-course', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const modulesQuery = useQuery({
    queryKey: ['shell', 'continue-modules', courseId],
    queryFn: () => listPublishedCourseModulesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courseProgressQuery = useQuery({
    queryKey: ['shell', 'continue-progress', courseId],
    queryFn: () => progressService.getMyCourseProgress(courseId!),
    enabled: Boolean(courseId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const lessons = useMemo(() => flattenLessons(modulesQuery.data ?? []), [modulesQuery.data]);
  const progressMap = useMemo(
    () => new Map((courseProgressQuery.data?.lessons ?? []).map((lesson) => [lesson.lessonId, lesson])),
    [courseProgressQuery.data?.lessons],
  );
  const currentLesson = lessons.find((lesson) => !progressMap.get(lesson.id)?.isCompleted) ?? lessons[0] ?? null;
  const currentLessonIndex = currentLesson ? lessons.findIndex((lesson) => lesson.id === currentLesson.id) : -1;
  const nextLesson = currentLessonIndex >= 0 ? lessons[currentLessonIndex + 1] ?? null : null;
  const streak = useMemo(
    () => getLearningStreak((historyQuery.data?.items ?? []).map((item) => item.createdAt)),
    [historyQuery.data?.items],
  );

  const lastActivityAt =
    courseProgressQuery.data?.lastProgressAt ??
    historyQuery.data?.items.find((item) => item.courseId === courseId)?.createdAt ??
    overviewQuery.data?.summary.lastActivityAt ??
    null;

  return {
    overviewQuery,
    historyQuery,
    courseQuery,
    modulesQuery,
    courseProgressQuery,
    courseId,
    courseTitle: selectedCourse?.courseTitle ?? courseQuery.data?.title ?? null,
    percentage: courseProgressQuery.data?.percentage ?? selectedCourse?.percentage ?? 0,
    totalLessons: courseProgressQuery.data?.totalLessons ?? selectedCourse?.totalLessons ?? 0,
    completedLessons: courseProgressQuery.data?.completedLessons ?? selectedCourse?.lessonsCompleted ?? 0,
    currentLesson,
    nextLesson,
    lastActivityAt,
    streak,
    isLoading:
      overviewQuery.isLoading ||
      historyQuery.isLoading ||
      (Boolean(courseId) && (modulesQuery.isLoading || courseProgressQuery.isLoading)),
  };
}
