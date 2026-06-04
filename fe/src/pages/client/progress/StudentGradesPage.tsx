import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { AlertTriangle, ClipboardCheck, FileCheck2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { EmptyState, StatusBadge, type StatusTone } from '../../../components/client-ui';
import {
  listStudentCourseAssignmentsRequest,
  type AssignmentSubmissionRecord,
  type StudentAssignmentListItem,
} from '../../../services/api/assignmentApi';
import { progressService } from '../../../services/api/progressService';
import {
  listMyQuizAttemptsRequest,
  listStudentCourseQuizzesRequest,
  type StudentQuizAttempt,
  type StudentQuizCourseItem,
} from '../../../services/api/quizApi';
import type { CourseProgressItem } from '../../../types/progress';
import './StudentGradesPage.css';

type GradeCategory = 'Assignment' | 'Quiz';
type GradeItemStatus = 'graded' | 'submitted' | 'pending' | 'missing' | 'overdue' | 'not-available';

type GradeItem = {
  id: string;
  courseId: string;
  type: GradeCategory;
  title: string;
  score: number | null;
  maxScore: number;
  dueDate?: string | null;
  status: GradeItemStatus;
  feedback?: string | null;
  actionPath?: string;
};

type CategoryBreakdown = {
  category: GradeCategory;
  weight: number;
  score: number | null;
  weightedScore: number | null;
  gradedCount: number;
  totalCount: number;
  status: 'graded' | 'pending' | 'not-available';
};

type CourseGradeModel = {
  course: CourseProgressItem;
  items: GradeItem[];
  breakdown: CategoryBreakdown[];
  totalScore: number | null;
  letterGrade: string | null;
  status: 'completed' | 'in-progress' | 'needs-attention' | 'no-grades-yet';
};

function formatDate(value?: string | null) {
  if (!value) return 'No due date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No due date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function formatScore(value: number | null) {
  if (value === null) return '-';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function getLetterGrade(score: number | null) {
  if (score === null) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getLatestSubmission(assignment: StudentAssignmentListItem): AssignmentSubmissionRecord | null {
  return assignment.submissions
    .slice()
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0] ?? null;
}

function getAssignmentStatus(assignment: StudentAssignmentListItem, submission: AssignmentSubmissionRecord | null): GradeItemStatus {
  if (submission?.grade != null) return 'graded';
  if (submission) return 'submitted';

  if (assignment.dueDate) {
    const dueTime = new Date(assignment.dueDate).getTime();
    if (!Number.isNaN(dueTime) && dueTime < Date.now()) {
      return assignment.allowLateSubmission ? 'missing' : 'overdue';
    }
  }

  return 'pending';
}

function getLatestScoredAttempt(attempts: StudentQuizAttempt[]): StudentQuizAttempt | null {
  return attempts
    .filter((attempt) => attempt.score != null)
    .sort((left, right) => {
      const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
      const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
      return rightTime - leftTime;
    })[0] ?? null;
}

function getQuizStatus(quiz: StudentQuizCourseItem, attempt: StudentQuizAttempt | null): GradeItemStatus {
  if (attempt?.score != null) return 'graded';
  if (quiz.attemptsUsed > 0) return 'submitted';
  if (!quiz.isPublished) return 'not-available';
  return 'pending';
}

function getStatusTone(status: GradeItemStatus): StatusTone {
  switch (status) {
    case 'graded':
      return 'graded';
    case 'submitted':
      return 'submitted';
    case 'missing':
    case 'overdue':
      return 'overdue';
    case 'not-available':
      return 'locked';
    default:
      return 'pending';
  }
}

function getStatusLabel(status: GradeItemStatus) {
  switch (status) {
    case 'not-available':
      return 'Not available';
    default:
      return status.replaceAll('-', ' ');
  }
}

function formatStatusLabel(status: string) {
  return status
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCourseStatusTone(status: CourseGradeModel['status']): StatusTone {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'in-progress':
      return 'in-progress';
    case 'needs-attention':
      return 'overdue';
    default:
      return 'pending';
  }
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildBreakdown(items: GradeItem[]): CategoryBreakdown[] {
  const categories: GradeCategory[] = ['Assignment', 'Quiz'];
  const gradedCategories = categories.filter((category) =>
    items.some((item) => item.type === category && item.score != null),
  );
  const categoryWeight = gradedCategories.length ? 100 / gradedCategories.length : 0;

  return categories.map((category) => {
    const categoryItems = items.filter((item) => item.type === category);
    const gradedScores = categoryItems
      .filter((item) => item.score != null)
      .map((item) => item.score!);
    const categoryScore = average(gradedScores);
    const hasWeight = categoryScore !== null && gradedCategories.includes(category);
    const weightedScore = hasWeight ? categoryScore * (categoryWeight / 100) : null;

    return {
      category,
      weight: hasWeight ? categoryWeight : 0,
      score: categoryScore,
      weightedScore,
      gradedCount: gradedScores.length,
      totalCount: categoryItems.length,
      status: categoryScore !== null ? 'graded' : categoryItems.length ? 'pending' : 'not-available',
    };
  });
}

function buildCourseStatus(items: GradeItem[], totalScore: number | null, enrollmentStatus: CourseProgressItem['enrollmentStatus']): CourseGradeModel['status'] {
  if (items.some((item) => item.status === 'missing' || item.status === 'overdue')) return 'needs-attention';
  if (totalScore === null) return 'no-grades-yet';
  if (enrollmentStatus === 'COMPLETED') return 'completed';
  return 'in-progress';
}

function buildCourseGradeModel(
  course: CourseProgressItem,
  assignments: StudentAssignmentListItem[],
  quizzes: StudentQuizCourseItem[],
  quizAttemptsByQuizId: Map<string, StudentQuizAttempt[]>,
): CourseGradeModel {
  const assignmentItems: GradeItem[] = assignments.map((assignment) => {
    const latestSubmission = getLatestSubmission(assignment);
    const status = getAssignmentStatus(assignment, latestSubmission);

    return {
      id: `assignment-${assignment.id}`,
      courseId: course.courseId,
      type: 'Assignment',
      title: assignment.title,
      score: latestSubmission?.grade ?? null,
      maxScore: 100,
      dueDate: assignment.dueDate,
      status,
      feedback: latestSubmission?.feedback ?? null,
      actionPath: `/courses/${course.courseId}/assignments/${assignment.id}`,
    };
  });

  const quizItems: GradeItem[] = quizzes.map((quiz) => {
    const latestAttempt = getLatestScoredAttempt(quizAttemptsByQuizId.get(quiz.id) ?? []);
    const status = getQuizStatus(quiz, latestAttempt);

    return {
      id: `quiz-${quiz.id}`,
      courseId: course.courseId,
      type: 'Quiz',
      title: quiz.title,
      score: latestAttempt?.score ?? null,
      maxScore: 100,
      status,
      actionPath: latestAttempt?.id
        ? `/courses/${course.courseId}/quizzes/${quiz.id}/results/${latestAttempt.id}`
        : `/courses/${course.courseId}/quizzes/${quiz.id}`,
    };
  });

  const items = [...assignmentItems, ...quizItems];
  const breakdown = buildBreakdown(items);
  const weightedScores = breakdown
    .filter((category) => category.weightedScore !== null)
    .map((category) => category.weightedScore!);
  const totalScore = weightedScores.length
    ? Math.round(weightedScores.reduce((sum, value) => sum + value, 0) * 10) / 10
    : null;

  return {
    course,
    items,
    breakdown,
    totalScore,
    letterGrade: getLetterGrade(totalScore),
    status: buildCourseStatus(items, totalScore, course.enrollmentStatus),
  };
}

export function StudentGradesPage() {
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: ['progress', 'grades', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 60_000,
    retry: 1,
  });

  const courses = overviewQuery.data?.courses.filter((course) => course.enrollmentStatus !== 'DROPPED') ?? [];

  const assignmentQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['grades', 'course-assignments', course.courseId],
      queryFn: () => listStudentCourseAssignmentsRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizListQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['grades', 'course-quizzes', course.courseId],
      queryFn: () => listStudentCourseQuizzesRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizzesWithCourse = useMemo(
    () =>
      courses.flatMap((course, courseIndex) =>
        (quizListQueries[courseIndex]?.data ?? []).map((quiz) => ({
          courseId: course.courseId,
          quiz,
        })),
      ),
    [courses, quizListQueries],
  );

  const quizAttemptQueries = useQueries({
    queries: quizzesWithCourse.map(({ quiz }) => ({
      queryKey: ['grades', 'quiz-attempts', quiz.id],
      queryFn: () => listMyQuizAttemptsRequest(quiz.id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const courseGradeModels = useMemo<CourseGradeModel[]>(() => {
    const quizAttemptsByQuizId = new Map<string, StudentQuizAttempt[]>();
    quizzesWithCourse.forEach(({ quiz }, index) => {
      quizAttemptsByQuizId.set(quiz.id, quizAttemptQueries[index]?.data ?? []);
    });

    return courses.map((course, index) =>
      buildCourseGradeModel(
        course,
        assignmentQueries[index]?.data ?? [],
        quizListQueries[index]?.data ?? [],
        quizAttemptsByQuizId,
      ),
    );
  }, [assignmentQueries, courses, quizAttemptQueries, quizListQueries, quizzesWithCourse]);

  const gradedCourseModels = courseGradeModels.filter((model) => model.totalScore !== null);
  const currentAverage = gradedCourseModels.length
    ? Math.round((gradedCourseModels.reduce((sum, model) => sum + (model.totalScore ?? 0), 0) / gradedCourseModels.length) * 10) / 10
    : null;
  const pendingItems = courseGradeModels.reduce(
    (sum, model) => sum + model.items.filter((item) => item.status === 'pending' || item.status === 'submitted').length,
    0,
  );
  const attentionItems = courseGradeModels.reduce(
    (sum, model) => sum + model.items.filter((item) => item.status === 'missing' || item.status === 'overdue').length,
    0,
  );
  const hasAnyGradeData = courseGradeModels.some((model) => model.items.length > 0);
  const error =
    overviewQuery.error ||
    assignmentQueries.find((query) => query.error)?.error ||
    quizListQueries.find((query) => query.error)?.error ||
    quizAttemptQueries.find((query) => query.error)?.error;
  const isLoading =
    overviewQuery.isLoading ||
    assignmentQueries.some((query) => query.isLoading) ||
    quizListQueries.some((query) => query.isLoading) ||
    quizAttemptQueries.some((query) => query.isLoading);

  if (isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Grades" subtitle="Review your course scores, weighted progress, and feedback.">
          <div className="grades-page grades-page--loading">
            <section className="grades-page__summary-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="client-card grades-page__summary-card">
                  <span className="client-skeleton-block grades-page__skeleton-label" />
                  <span className="client-skeleton-block grades-page__skeleton-value" />
                </article>
              ))}
            </section>
            <section className="client-card grades-page__course-card">
              <span className="client-skeleton-block grades-page__skeleton-title" />
              <span className="client-skeleton-block grades-page__skeleton-row" />
              <span className="client-skeleton-block grades-page__skeleton-row" />
              <span className="client-skeleton-block grades-page__skeleton-row" />
            </section>
          </div>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Grades" subtitle="Review your course scores, weighted progress, and feedback.">
          <section className="client-card grades-page__state-card">
            <EmptyState
              title="Unable to load grades"
              description="We could not load your course scores right now."
              action={
                <Button className="client-button client-button-primary" onClick={() => overviewQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          </section>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer title="Grades" subtitle="Review your course scores, weighted progress, and feedback.">
        <div className="grades-page">
          <section className="grades-page__summary-grid" aria-label="Grades summary">
            <article className="client-card grades-page__summary-card">
              <Typography.Text className="client-meta">Current average</Typography.Text>
              <strong>{currentAverage !== null ? formatScore(currentAverage) : '-'}</strong>
              <Typography.Text className="client-meta">Estimated from graded course work</Typography.Text>
            </article>
            <article className="client-card grades-page__summary-card">
              <Typography.Text className="client-meta">Graded courses</Typography.Text>
              <strong>{gradedCourseModels.length}</strong>
              <Typography.Text className="client-meta">Courses with returned scores</Typography.Text>
            </article>
            <article className="client-card grades-page__summary-card">
              <Typography.Text className="client-meta">Pending items</Typography.Text>
              <strong>{pendingItems}</strong>
              <Typography.Text className="client-meta">Submitted or awaiting work</Typography.Text>
            </article>
            <article className="client-card grades-page__summary-card">
              <Typography.Text className="client-meta">Needs attention</Typography.Text>
              <strong>{attentionItems}</strong>
              <Typography.Text className="client-meta">Missing or overdue items</Typography.Text>
            </article>
          </section>

          {!courses.length ? (
            <section className="client-card grades-page__state-card">
              <EmptyState title="No grades available yet." description="Grades will appear here after you are enrolled in courses with graded work." />
            </section>
          ) : null}

          {courses.length && !hasAnyGradeData ? (
            <section className="client-card grades-page__state-card">
              <EmptyState title="No grades available yet." description="This page will update when assignments or quizzes are published and graded." />
            </section>
          ) : null}

          <section className="grades-page__course-list" aria-label="Course grade cards">
            {courseGradeModels.map((model) => (
              <article key={model.course.courseId} className="client-card grades-page__course-card">
                <header className="grades-page__course-header">
                  <div className="grades-page__course-heading">
                    <StatusBadge tone={getCourseStatusTone(model.status)}>
                      {formatStatusLabel(model.status)}
                    </StatusBadge>
                    <Typography.Title level={3} className="client-section-title">
                      {model.course.courseTitle}
                    </Typography.Title>
                    <Typography.Text className="client-meta">
                      {model.course.instructorName || 'Instructor unavailable'}
                    </Typography.Text>
                  </div>
                  <div className="grades-page__course-score">
                    <span className="client-meta">Current calculated grade</span>
                    <strong>{model.totalScore !== null ? formatScore(model.totalScore) : '-'}</strong>
                    <span className="grades-page__letter-grade">{model.letterGrade ?? '-'}</span>
                  </div>
                </header>

                <div className="grades-page__calculation-note">
                  <AlertTriangle size={16} />
                  <Typography.Text>
                    Estimated from graded categories. Official course weights are not configured, so available graded categories share equal weight.
                  </Typography.Text>
                </div>

                <div className="grades-page__table-wrap">
                  <table className="grades-page__grade-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Weight</th>
                        <th>Score</th>
                        <th>Weighted Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.breakdown.map((category) => (
                        <tr key={category.category}>
                          <td>{category.category}</td>
                          <td>{category.weight ? `${category.weight.toFixed(category.weight % 1 === 0 ? 0 : 1)}%` : '-'}</td>
                          <td>{formatScore(category.score)}</td>
                          <td>{formatScore(category.weightedScore)}</td>
                          <td>
                            <StatusBadge tone={category.status === 'graded' ? 'graded' : category.status === 'pending' ? 'pending' : 'locked'}>
                              {category.status === 'not-available' ? 'Not available' : category.status}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grades-page__course-total">
                  <span>Total: <strong>{model.totalScore !== null ? formatScore(model.totalScore) : '-'}</strong></span>
                  <span>Letter grade: <strong>{model.letterGrade ?? '-'}</strong></span>
                </div>

                <section className="grades-page__items-section">
                  <div className="grades-page__section-header">
                    <Typography.Title level={4} className="client-card-title">Graded and pending work</Typography.Title>
                    <Typography.Text className="client-meta">
                      Missing or ungraded work is shown for visibility but is not counted as zero.
                    </Typography.Text>
                  </div>

                  {model.items.length ? (
                    <div className="grades-page__item-list">
                      {model.items.slice(0, 8).map((item) => (
                        <article key={item.id} className="grades-page__item-row">
                          <span className="grades-page__item-icon" aria-hidden="true">
                            {item.type === 'Assignment' ? <FileCheck2 size={16} /> : <ClipboardCheck size={16} />}
                          </span>
                          <div className="grades-page__item-copy">
                            <Typography.Text strong>{item.title}</Typography.Text>
                            <Typography.Text className="client-meta">
                              {item.type} - {item.dueDate ? `Due ${formatDate(item.dueDate)}` : 'No due date'}
                            </Typography.Text>
                            {item.feedback ? <Typography.Text className="client-meta">Feedback: {item.feedback}</Typography.Text> : null}
                          </div>
                          <StatusBadge tone={getStatusTone(item.status)}>{getStatusLabel(item.status)}</StatusBadge>
                          <span className="grades-page__item-score">{item.score !== null ? `${item.score}/${item.maxScore}` : '-'}</span>
                          {item.actionPath ? (
                            <Button className="client-button client-button-secondary" onClick={() => navigate(item.actionPath!)}>
                              View
                            </Button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="This course does not have graded work yet." compact />
                  )}
                </section>
              </article>
            ))}
          </section>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
