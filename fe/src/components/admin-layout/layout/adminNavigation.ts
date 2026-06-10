import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  BookOpenCheck,
  ChartColumn,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { UserRole } from '../../../context/authTypes';
import { canAccess, PERMISSIONS } from '../../../utils/rbac';

export type AdminNavigationItem = {
  key: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  allowedRoles?: UserRole[];
  breadcrumbLabel?: string;
};

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'INSTRUCTOR'],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/admin/progress',
    icon: ChartColumn,
    allowedRoles: ['ADMIN'],
    requiredPermissions: [PERMISSIONS.USER_READ],
    breadcrumbLabel: 'Analytics',
  },
  {
    key: 'users',
    label: 'User Management',
    path: '/admin/users',
    icon: Users,
    allowedRoles: ['ADMIN'],
    requiredPermissions: [PERMISSIONS.USER_READ],
  },
  {
    key: 'access',
    label: 'Role & Permissions',
    path: '/admin/access-control',
    icon: ShieldCheck,
    allowedRoles: ['ADMIN'],
    requiredPermissions: [PERMISSIONS.USER_READ],
    breadcrumbLabel: 'Role & Permissions',
  },
  {
    key: 'courses',
    label: 'Courses',
    path: '/admin/courses',
    icon: BookOpen,
    allowedRoles: ['ADMIN', 'INSTRUCTOR'],
    requiredPermissions: [PERMISSIONS.COURSE_CREATE],
  },
  {
    key: 'lessons',
    label: 'Lessons',
    path: '/admin/lessons',
    icon: BookOpenCheck,
    allowedRoles: ['ADMIN', 'INSTRUCTOR'],
    requiredPermissions: [PERMISSIONS.LESSON_CREATE],
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    icon: Settings,
    allowedRoles: ['ADMIN'],
  },
];

export function canViewAdminNavigationItem(item: AdminNavigationItem, role: UserRole | undefined) {
  if (!role) {
    return false;
  }

  if (item.allowedRoles?.length && !item.allowedRoles.includes(role)) {
    return false;
  }

  if (item.requiredPermissions?.length) {
    return item.requiredPermissions.every((permission) => canAccess(role, permission));
  }

  return true;
}

export function getVisibleAdminNavigation(role: UserRole | undefined) {
  return adminNavigationItems.filter((item) => canViewAdminNavigationItem(item, role));
}

export function getAdminNavigationMatch(pathname: string) {
  return adminNavigationItems.find((item) => item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`)));
}
