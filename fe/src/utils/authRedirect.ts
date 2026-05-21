import type { UserRole } from '../components/context/AuthContext';

export function getDefaultRouteForRole(role: UserRole | undefined) {
  if (role === 'ADMIN') {
    return '/admin/dashboard';
  }

  if (role === 'INSTRUCTOR') {
    return '/instructor/dashboard';
  }

  return '/student/dashboard';
}

export function isAdminRole(role: UserRole | undefined) {
  return role === 'ADMIN';
}

export function isClientRole(role: UserRole | undefined) {
  return role === 'STUDENT' || role === 'INSTRUCTOR';
}
