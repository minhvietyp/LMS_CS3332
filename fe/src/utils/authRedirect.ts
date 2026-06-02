import type { UserRole } from '../context/AuthContext';

export function getDefaultRouteForRole(role: UserRole | undefined) {
  if (role === 'ADMIN') {
    return '/admin/dashboard';
  }

  if (role === 'INSTRUCTOR') {
    return '/instructor/dashboard';
  }

  return '/dashboard';
}

export function isAdminRole(role: UserRole | undefined) {
  return role === 'ADMIN';
}

export function isClientRole(role: UserRole | undefined) {
  return role === 'STUDENT' || role === 'INSTRUCTOR';
}
