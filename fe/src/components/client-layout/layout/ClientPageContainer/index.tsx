import { useQuery } from '@tanstack/react-query';
import { Breadcrumb } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getStudentAssignmentDetailRequest } from '../../../../services/api/assignmentApi';
import { getCourseByIdRequest, listPublishedCourseModulesRequest } from '../../../../services/api/courseApi';
import { getStudentQuizDetailRequest } from '../../../../services/api/quizApi';
import { PageHeader } from '../../../client-ui';

type ClientPageContainerProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

function getStaticLabel(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/courses') return 'Courses';
  if (pathname === '/progress') return 'Progress';
  if (pathname === '/grades') return 'Grades';
  if (pathname === '/certificates') return 'Certificates';
  if (pathname === '/calendar') return 'Calendar';
  if (pathname === '/community') return 'Community';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/profile') return 'Profile';

  return null;
}

export function ClientPageContainer({
  title,
  subtitle,
  actions,
  children,
}: ClientPageContainerProps) {
  const location = useLocation();
  const courseDetailMatch = location.pathname.match(/^\/courses\/([^/]+)$/);
  const courseChildMatch = location.pathname.match(/^\/courses\/([^/]+)\/(learn|assignments|quizzes|discussion|announcements)(?:\/([^/]+))?(?:\/results\/([^/]+))?$/);
  const courseId = courseDetailMatch?.[1] ?? courseChildMatch?.[1] ?? null;
  const assignmentId = courseChildMatch?.[2] === 'assignments' ? courseChildMatch?.[3] ?? null : null;
  const quizId = courseChildMatch?.[2] === 'quizzes' ? courseChildMatch?.[3] ?? null : null;
  const lessonId = courseChildMatch?.[2] === 'learn' ? courseChildMatch?.[3] ?? null : null;

  const courseQuery = useQuery({
    queryKey: ['client-breadcrumbs', 'course', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const assignmentQuery = useQuery({
    queryKey: ['client-breadcrumbs', 'assignment', assignmentId],
    queryFn: () => getStudentAssignmentDetailRequest(assignmentId!),
    enabled: Boolean(assignmentId),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const quizQuery = useQuery({
    queryKey: ['client-breadcrumbs', 'quiz', quizId],
    queryFn: () => getStudentQuizDetailRequest(quizId!),
    enabled: Boolean(quizId),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const lessonModulesQuery = useQuery({
    queryKey: ['client-breadcrumbs', 'course-modules', courseId],
    queryFn: () => listPublishedCourseModulesRequest(courseId!),
    enabled: Boolean(courseId && lessonId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const breadcrumbItems = useMemo(() => {
    const staticLabel = getStaticLabel(location.pathname);

    if (staticLabel) {
      return [{ title: staticLabel }];
    }

    if (courseDetailMatch && courseQuery.data) {
      return [
        { title: <Link to="/courses">Courses</Link> },
        { title: courseQuery.data.title },
      ];
    }

    if (!courseChildMatch || !courseId) {
      return [];
    }

    const items: Array<{ title: ReactNode }> = [
      { title: <Link to="/courses">Courses</Link> },
      {
        title: courseQuery.data ? (
          <Link to={`/courses/${courseId}`}>{courseQuery.data.title}</Link>
        ) : (
          'Course'
        ),
      },
    ];

    const childType = courseChildMatch[2];

    if (childType === 'learn') {
      const currentLesson = lessonModulesQuery.data
        ?.flatMap((module) => module.lessons)
        .find((lesson) => lesson.id === lessonId);
      items.push({ title: 'Lesson Viewer' });
      if (currentLesson) {
        items.push({ title: currentLesson.title });
      }
      return items;
    }

    if (childType === 'assignments') {
      items.push({
        title: assignmentId ? <Link to={`/courses/${courseId}/assignments`}>Assignments</Link> : 'Assignments',
      });
      if (assignmentQuery.data) {
        items.push({ title: assignmentQuery.data.title });
      }
      return items;
    }

    if (childType === 'quizzes') {
      items.push({
        title: quizId ? <Link to={`/courses/${courseId}/quizzes`}>Quizzes</Link> : 'Quizzes',
      });
      if (quizQuery.data) {
        items.push({ title: quizQuery.data.title });
      }
      return items;
    }

    if (childType === 'discussion') {
      items.push({ title: 'Discussion' });
      return items;
    }

    if (childType === 'announcements') {
      items.push({ title: 'Announcements' });
      return items;
    }

    return items;
  }, [
    assignmentId,
    assignmentQuery.data,
    courseChildMatch,
    courseDetailMatch,
    courseId,
    courseQuery.data,
    lessonId,
    lessonModulesQuery.data,
    location.pathname,
    quizId,
    quizQuery.data,
  ]);

  return (
    <section className="client-page">
      <div className="client-page-container">
        {breadcrumbItems.length ? (
          <Breadcrumb className="client-page-breadcrumbs" items={breadcrumbItems} />
        ) : null}
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        <div className="client-page-content">
          {children}
        </div>
      </div>
    </section>
  );
}
