import { Navigate, Route } from 'react-router-dom';
import { AdminLayout } from '../components/admin-layout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { AccessControlPage } from '../pages/admin/access-control/AccessControlPage';
import { AdminAnalyticsPage } from '../pages/admin/analytics/AdminAnalyticsPage';
import { AdminCourseCreatePage } from '../pages/admin/courses/AdminCourseCreatePage';
import { AdminCourseDetailPage } from '../pages/admin/courses/AdminCourseDetailPage';
import { AdminCourseEditPage } from '../pages/admin/courses/AdminCourseEditPage';
import { CourseManagementPage } from '../pages/admin/courses/CourseManagementPage';
import { LessonManagementPage } from '../pages/admin/lessons/LessonManagementPage';
import { AdminProgressPage } from '../pages/admin/progress/AdminProgressPage';
import { AdminUserCreatePage } from '../pages/admin/users/AdminUserCreatePage';
import { AdminUserDetailPage } from '../pages/admin/users/AdminUserDetailPage';
import { AdminUserEditPage } from '../pages/admin/users/AdminUserEditPage';
import { AdminUserListPage } from '../pages/admin/users/AdminUserListPage';
import { DashboardPage } from '../pages/shared/dashboard/DashboardPage';
import { ProfilePage } from '../pages/shared/account/ProfilePage';
import { SettingsPage } from '../pages/shared/settings/SettingsPage';
import { PERMISSIONS } from '../utils/rbac';

export function AdminRoutes() {
  return (
    <>
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']} loginPath="/admin/login">
            <DashboardPage />
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
          path="analytics"
          element={
            <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_READ]} allowedRoles={['ADMIN']}>
              <AdminAnalyticsPage />
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
            <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_READ]} allowedRoles={['ADMIN']}>
              <AdminProgressPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </>
  );
}
