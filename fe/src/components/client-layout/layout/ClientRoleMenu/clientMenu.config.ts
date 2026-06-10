import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumnIncreasing,
  ClipboardList,
  FileText,
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
    key: 'student-learning',
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
    key: 'instructor-overview',
    title: 'Overview',
    items: [
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
    key: 'student-academic',
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
    ],
  },
  {
    key: 'teaching',
    title: 'Teaching',
    items: [
      {
        key: 'instructor-courses',
        label: 'My Courses',
        path: '/instructor/courses',
        icon: FolderKanban,
        roles: ['INSTRUCTOR'],
      },
      {
        key: 'instructor-lessons',
        label: 'Lessons & Modules',
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
    key: 'students',
    title: 'Students',
    items: [
      {
        key: 'instructor-progress',
        label: 'Student Progress',
        path: '/instructor/progress',
        icon: ChartColumnIncreasing,
        roles: ['INSTRUCTOR'],
      },
    ],
  },
  {
    key: 'reports',
    title: 'Reports',
    items: [
      {
        key: 'assignment-reports',
        label: 'Assignment Reports',
        path: '/reports/assignments',
        icon: FileText,
        roles: ['INSTRUCTOR'],
      },
      {
        key: 'quiz-reports',
        label: 'Quiz Reports',
        path: '/reports/quizzes',
        icon: ClipboardList,
        roles: ['INSTRUCTOR'],
      },
      {
        key: 'activity-reports',
        label: 'Activity Reports',
        path: '/reports/instructor-activity',
        icon: ChartColumnIncreasing,
        roles: ['INSTRUCTOR'],
      },
    ],
  },
  {
    key: 'communication',
    title: 'Communication',
    items: [
      {
        key: 'student-community',
        label: 'Community',
        path: '/student/community',
        icon: MessagesSquare,
        roles: ['STUDENT'],
      },
      {
        key: 'student-direct-chat',
        label: 'Direct Chat',
        path: '/chat',
        icon: MessagesSquare,
        roles: ['STUDENT'],
      },
      {
        key: 'instructor-messages',
        label: 'Messages',
        path: '/chat',
        icon: MessagesSquare,
        roles: ['INSTRUCTOR'],
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

  if (role === 'INSTRUCTOR' && /^\/courses\/[^/]+\/analytics$/.test(pathname)) {
    return items.find((item) => item.key === 'instructor-courses');
  }

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
