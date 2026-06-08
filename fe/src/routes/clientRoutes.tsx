import { Navigate, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { InstructorAssessmentsPage } from '../pages/client/instructor/assessments/InstructorAssessmentsPage';
import { CourseAnalyticsPage } from '../pages/client/instructor/courses/CourseAnalyticsPage';
import { DirectChatPage } from '../pages/client/chat/DirectChatPage';
import { CourseDiscussionPage } from '../pages/client/chat/CourseDiscussionPage';
import { StudentCommunityPage } from '../pages/client/chat/StudentCommunityPage';
import { InstructorCourseDetailPage } from '../pages/client/instructor/courses/InstructorCourseDetailPage';
import { InstructorCoursesPage } from '../pages/client/instructor/courses/InstructorCoursesPage';
import { InstructorLessonsPage } from '../pages/client/instructor/lessons/InstructorLessonsPage';
import { ClientNotificationsPage } from '../pages/client/notifications/ClientNotificationsPage';
import { CourseAnnouncementsPage } from '../pages/client/notifications/CourseAnnouncementsPage';
import { InstructorProgressPage } from '../pages/client/progress/InstructorProgressPage';
import { StudentCalendarPage } from '../pages/client/progress/StudentCalendarPage';
import { StudentGradesPage } from '../pages/client/progress/StudentGradesPage';
import { StudentProgressReportPage } from '../pages/client/progress/StudentProgressReportPage';
import { StudentProgressPage } from '../pages/client/progress/StudentProgressPage';
import { ClientCourseAssignmentsPage } from '../pages/client/assignments/ClientCourseAssignmentsPage';
import { ClientAssignmentSubmissionPage } from '../pages/client/assignments/ClientAssignmentSubmissionPage';
import { ClientCoursesPage } from '../pages/client/courses/ClientCoursesPage';
import { ClientCourseDetailPage } from '../pages/client/courses/ClientCourseDetailPage';
import { ClientLessonViewerPage } from '../pages/client/learning/ClientLessonViewerPage';
import { ClientCourseQuizzesPage } from '../pages/client/quizzes/ClientCourseQuizzesPage';
import { ClientQuizAttemptPage } from '../pages/client/quizzes/ClientQuizAttemptPage';
import { ClientQuizResultPage } from '../pages/client/quizzes/ClientQuizResultPage';
import { DashboardPage } from '../pages/shared/dashboard/DashboardPage';
import { AssignmentReportPage } from '../pages/shared/reports/AssignmentReportPage';
import { InstructorActivityReportPage } from '../pages/shared/reports/InstructorActivityReportPage';
import { QuizReportPage } from '../pages/shared/reports/QuizReportPage';
import { ProfilePage } from '../pages/shared/account/ProfilePage';
import { SettingsPage } from '../pages/shared/settings/SettingsPage';
import { PERMISSIONS } from '../utils/rbac';

export function ClientRoutes() {
  return (
    <>
      <Route
        path="/instructor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentProgressPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/progress"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Navigate to="/progress" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grades"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentGradesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/grades"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Navigate to="/grades" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificates"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Navigate to="/progress" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/certificates"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Navigate to="/progress" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/student-progress"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentProgressReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/assignments"
        element={
          <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
            <AssignmentReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/quizzes"
        element={
          <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
            <QuizReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/instructor-activity"
        element={
          <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
            <InstructorActivityReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <ClientCoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <ClientCourseDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/learn/:lessonId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ClientLessonViewerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/assignments"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ClientCourseAssignmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/assignments/:assignmentId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ClientAssignmentSubmissionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/quizzes"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ClientCourseQuizzesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/quizzes/:quizId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ClientQuizAttemptPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/quizzes/:quizId/results/:attemptId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <ClientQuizResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <DirectChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/discussion"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <CourseDiscussionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/community"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentCommunityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/progress-report"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <Navigate to="/reports/student-progress" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <ClientNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/announcements"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR']}>
            <CourseAnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_CREATE]} allowedRoles={['INSTRUCTOR']}>
            <InstructorCoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:id"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_CREATE]} allowedRoles={['INSTRUCTOR']}>
            <InstructorCourseDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/analytics"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_READ]} allowedRoles={['INSTRUCTOR']}>
            <CourseAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/lessons"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.LESSON_CREATE]} allowedRoles={['INSTRUCTOR']}>
            <InstructorLessonsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/assessments"
        element={
          <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
            <InstructorAssessmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/progress"
        element={
          <ProtectedRoute
            requiredPermissions={[PERMISSIONS.COURSE_READ]}
            allowedRoles={['INSTRUCTOR']}
          >
            <InstructorProgressPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
