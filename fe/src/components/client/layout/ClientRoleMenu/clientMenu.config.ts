import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  ChartColumnIncreasing,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Settings,
  UserRound,
} from 'lucide-react';
import type { UserRole } from '../../../context/AuthContext';

export type ClientMenuItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export type ClientMenuSection = {
  key: string;
  title: string;
  items: ClientMenuItem[];
};

const clientMenuSections: ClientMenuSection[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    items: [
      {
        key: 'student-dashboard',
        label: 'Dashboard',
        path: '/student/dashboard',
        icon: LayoutDashboard,
        roles: ['STUDENT'],
      },
      {
        key: 'instructor-dashboard',
        label: 'Dashboard',
        path: '/instructor/dashboard',
        icon: LayoutDashboard,
        roles: ['INSTRUCTOR'],
      },
    ],
  },
  {
    key: 'learning',
    title: 'Learning',
    items: [
      {
        key: 'student-progress',
        label: 'My Progress',
        path: '/student/progress',
        icon: BookOpen,
        roles: ['STUDENT'],
      },
      {
        key: 'student-courses',
        label: 'Enrolled Courses',
        path: '/courses',
        icon: FolderKanban,
        roles: ['STUDENT'],
      },
    ],
  },
  {
    key: 'teaching',
    title: 'Teaching',
    items: [
      {
        key: 'instructor-progress',
        label: 'Student Progress',
        path: '/instructor/progress',
        icon: ChartColumnIncreasing,
        roles: ['INSTRUCTOR'],
      },
      {
        key: 'instructor-courses',
        label: 'My Courses',
        path: '/instructor/courses',
        icon: FolderKanban,
        roles: ['INSTRUCTOR'],
      },
      {
        key: 'instructor-lessons',
        label: 'Lessons',
        path: '/instructor/lessons',
        icon: NotebookPen,
        roles: ['INSTRUCTOR'],
      },
      {
        key: 'instructor-assessments',
        label: 'Assessments',
        path: '/instructor/assessments',
        icon: ClipboardList,
        roles: ['INSTRUCTOR'],
      },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    items: [
      {
        key: 'notifications',
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        roles: ['STUDENT', 'INSTRUCTOR'],
      },
    ],
  },
  {
    key: 'user',
    title: 'User',
    items: [
      {
        key: 'profile',
        label: 'My Profile',
        path: '/profile',
        icon: UserRound,
        roles: ['STUDENT', 'INSTRUCTOR'],
      },
      {
        key: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['STUDENT', 'INSTRUCTOR'],
      },
    ],
  },
];

export function getVisibleClientMenu(role: UserRole | undefined): ClientMenuSection[] {
  if (!role || role === 'ADMIN') {
    return [];
  }

  return clientMenuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getClientMenuMatch(pathname: string, role: UserRole | undefined) {
  const items = getVisibleClientMenu(role).flatMap((section) => section.items);

  return items.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

export const clientRoleLabels: Record<Exclude<UserRole, 'ADMIN'>, string> = {
  STUDENT: 'Student Workspace',
  INSTRUCTOR: 'Instructor Workspace',
};

export const clientRoleIcons: Record<Exclude<UserRole, 'ADMIN'>, LucideIcon> = {
  STUDENT: GraduationCap,
  INSTRUCTOR: ChartColumnIncreasing,
};
