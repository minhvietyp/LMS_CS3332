import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumnIncreasing,
  ClipboardList,
  MessagesSquare,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Settings,
  UserRound,
} from 'lucide-react';
import type { UserRole } from '../../../../context/AuthContext';

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
    key: 'learning',
    title: 'Learning',
    items: [
      {
        key: 'student-dashboard',
        label: 'Dashboard',
        path: '/dashboard',
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
      {
        key: 'student-courses',
        label: 'Courses',
        path: '/courses',
        icon: FolderKanban,
        roles: ['STUDENT'],
      },
      {
        key: 'student-calendar',
        label: 'Calendar',
        path: '/calendar',
        icon: CalendarDays,
        roles: ['STUDENT'],
      },
    ],
  },
  {
    key: 'academic',
    title: 'Academic',
    items: [
      {
        key: 'student-progress',
        label: 'Progress',
        path: '/progress',
        icon: BookOpen,
        roles: ['STUDENT'],
      },
      {
        key: 'student-grades',
        label: 'Grades',
        path: '/grades',
        icon: ClipboardList,
        roles: ['STUDENT'],
      },
      {
        key: 'student-certificates',
        label: 'Certificates',
        path: '/certificates',
        icon: GraduationCap,
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
    title: 'Community',
    items: [
      {
        key: 'student-community',
        label: 'Community',
        path: '/student/community',
        icon: MessagesSquare,
        roles: ['STUDENT'],
      },
      {
        key: 'direct-chat',
        label: 'Direct Chat',
        path: '/chat',
        icon: MessagesSquare,
        roles: ['STUDENT', 'INSTRUCTOR'],
      },
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
    key: 'account',
    title: 'Account',
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
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
};

export const clientRoleIcons: Record<Exclude<UserRole, 'ADMIN'>, LucideIcon> = {
  STUDENT: GraduationCap,
  INSTRUCTOR: ChartColumnIncreasing,
};
