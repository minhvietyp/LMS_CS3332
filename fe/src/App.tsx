import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from 'antd';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentProgressPage } from './pages/StudentProgressPage';
import { AccessControlPage } from './pages/AccessControlPage';
import { CourseManagementPage } from './pages/CourseManagementPage';
import { LessonManagementPage } from './pages/LessonManagementPage';
import { InstructorProgressPage } from './pages/InstructorProgressPage';
import { AdminProgressPage } from './pages/AdminProgressPage';
import { InstructorCoursesPage } from './pages/InstructorCoursesPage';
import { InstructorCourseDetailPage } from './pages/InstructorCourseDetailPage';
import { InstructorLessonsPage } from './pages/InstructorLessonsPage';
import { InstructorAssessmentsPage } from './pages/InstructorAssessmentsPage';
import { ClientNotificationsPage } from './pages/ClientNotificationsPage';
import { ClientCoursesPage } from './pages/ClientCoursesPage';
import { ClientCourseDetailPage } from './pages/ClientCourseDetailPage';
import { ClientCourseAssignmentsPage } from './pages/ClientCourseAssignmentsPage';
import { ClientAssignmentSubmissionPage } from './pages/ClientAssignmentSubmissionPage';
import { ClientCourseQuizzesPage } from './pages/ClientCourseQuizzesPage';
import { ClientQuizAttemptPage } from './pages/ClientQuizAttemptPage';
import { ClientQuizResultPage } from './pages/ClientQuizResultPage';
import { AdminLayout } from './components/admin/layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './components/context/AuthContext';
import { PERMISSIONS } from './utils/rbac';
import { getDefaultRouteForRole } from './utils/authRedirect';
import { AdminLoginPage } from './pages/admin/auth/AdminLoginPage';
import { AdminForgotPasswordPage } from './pages/admin/auth/AdminForgotPasswordPage';
import { AdminResetPasswordPage } from './pages/admin/auth/AdminResetPasswordPage';
import { ClientLoginPage } from './pages/client/auth/ClientLoginPage';
import { ClientForgotPasswordPage } from './pages/client/auth/ClientForgotPasswordPage';
import { ClientRegisterPage } from './pages/client/auth/ClientRegisterPage';
import { ClientResetPasswordPage } from './pages/client/auth/ClientResetPasswordPage';
import { AdminUserListPage } from './pages/admin/users/AdminUserListPage';
import { AdminUserCreatePage } from './pages/admin/users/AdminUserCreatePage';
import { AdminUserDetailPage } from './pages/admin/users/AdminUserDetailPage';
import { AdminUserEditPage } from './pages/admin/users/AdminUserEditPage';
import { AdminCourseCreatePage } from './pages/admin/courses/AdminCourseCreatePage';
import { AdminCourseDetailPage } from './pages/admin/courses/AdminCourseDetailPage';
import { AdminCourseEditPage } from './pages/admin/courses/AdminCourseEditPage';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
}

function App() {
  return (
    <Layout className="app-shell">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
        <Route path="/login" element={<ClientLoginPage />} />
        <Route path="/forgot-password" element={<ClientForgotPasswordPage />} />
        <Route path="/register" element={<ClientRegisterPage />} />
        <Route path="/reset-password" element={<ClientResetPasswordPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} loginPath="/admin/login">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'INSTRUCTOR']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/progress"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentProgressPage />
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
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} loginPath="/admin/login">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} loginPath="/admin/login">
              <SettingsPage />
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
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} loginPath="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="users"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_READ]} allowedRoles={['ADMIN']}>
                <AdminUserListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/create"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_CREATE]} allowedRoles={['ADMIN']}>
                <AdminUserCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:id"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_READ]} allowedRoles={['ADMIN']}>
                <AdminUserDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:id/edit"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_UPDATE]} allowedRoles={['ADMIN']}>
                <AdminUserEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="access-control"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_READ]} allowedRoles={['ADMIN']}>
                <AccessControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_READ]} allowedRoles={['ADMIN']}>
                <CourseManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses/create"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_CREATE]} allowedRoles={['ADMIN']}>
                <AdminCourseCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses/:id"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_READ]} allowedRoles={['ADMIN']}>
                <AdminCourseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses/:id/edit"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.COURSE_UPDATE]} allowedRoles={['ADMIN']}>
                <AdminCourseEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="lessons"
            element={
              <ProtectedRoute requiredPermissions={[PERMISSIONS.LESSON_CREATE]} allowedRoles={['ADMIN']}>
                <LessonManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="progress"
            element={
              <ProtectedRoute
                requiredPermissions={[PERMISSIONS.USER_READ]}
                allowedRoles={['ADMIN']}
              >
                <AdminProgressPage />
              </ProtectedRoute>
            }
          />
        </Route>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
