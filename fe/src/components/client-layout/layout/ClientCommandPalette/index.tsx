import { useQueryClient } from '@tanstack/react-query';
import { Drawer, Grid, Modal } from 'antd';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumnIncreasing,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEventHandler } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/useAuth';
import {
  collectWorkspaceSearchItems,
  filterWorkspaceSearchItems,
  recordFrequentWorkspace,
  recordRecentWorkspace,
  type WorkspaceSearchItemType,
} from '../../../../utils/clientShellWorkspace';
import './ClientCommandPalette.css';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type CommandPaletteItem = {
  id: string;
  route: string;
  title: string;
  subtitle?: string;
  type: WorkspaceSearchItemType;
  keywords: string[];
  label?: string;
};

const QUICK_ACTIONS: CommandPaletteItem[] = [
  {
    id: 'qa-courses',
    type: 'Quick Action',
    title: 'Courses',
    subtitle: 'Browse available and enrolled courses',
    route: '/courses',
    keywords: ['courses', 'catalog', 'class'],
    label: 'Page',
  },
  {
    id: 'qa-calendar',
    type: 'Quick Action',
    title: 'Calendar',
    subtitle: 'View upcoming deadlines',
    route: '/calendar',
    keywords: ['calendar', 'schedule', 'deadline'],
    label: 'Page',
  },
  {
    id: 'qa-progress',
    type: 'Quick Action',
    title: 'Progress',
    subtitle: 'Track your learning progress',
    route: '/progress',
    keywords: ['progress', 'learning'],
    label: 'Page',
  },
  {
    id: 'qa-grades',
    type: 'Quick Action',
    title: 'Grades',
    subtitle: 'Review scores and feedback',
    route: '/grades',
    keywords: ['grades', 'scores', 'feedback'],
    label: 'Page',
  },
  {
    id: 'qa-community',
    type: 'Quick Action',
    title: 'Community',
    subtitle: 'Open discussions and messages',
    route: '/student/community',
    keywords: ['community', 'discussion', 'messages'],
    label: 'Page',
  },
  {
    id: 'qa-notifications',
    type: 'Quick Action',
    title: 'Notifications',
    subtitle: 'View recent updates',
    route: '/notifications',
    keywords: ['notifications', 'alerts', 'updates'],
    label: 'Page',
  },
];

const INSTRUCTOR_QUICK_ACTIONS: CommandPaletteItem[] = [
  {
    id: 'qa-instructor-dashboard',
    type: 'Quick Action',
    title: 'Go to Instructor Dashboard',
    subtitle: 'Open your teaching overview',
    route: '/instructor/dashboard',
    keywords: ['dashboard', 'overview', 'instructor'],
    label: 'Page',
  },
  {
    id: 'qa-instructor-courses',
    type: 'Quick Action',
    title: 'Manage Courses',
    subtitle: 'Create, publish, and maintain your courses',
    route: '/instructor/courses',
    keywords: ['courses', 'manage', 'teaching'],
    label: 'Page',
  },
  {
    id: 'qa-instructor-lessons',
    type: 'Quick Action',
    title: 'Manage Lessons',
    subtitle: 'Organize modules, lessons, and materials',
    route: '/instructor/lessons',
    keywords: ['lessons', 'modules', 'materials'],
    label: 'Page',
  },
  {
    id: 'qa-instructor-assessments',
    type: 'Quick Action',
    title: 'Manage Assessments',
    subtitle: 'Review assignments, quizzes, and grading',
    route: '/instructor/assessments',
    keywords: ['assessments', 'assignments', 'quizzes', 'grading'],
    label: 'Page',
  },
  {
    id: 'qa-instructor-progress',
    type: 'Quick Action',
    title: 'View Student Progress',
    subtitle: 'Track student completion and activity',
    route: '/instructor/progress',
    keywords: ['students', 'progress', 'activity'],
    label: 'Page',
  },
  {
    id: 'qa-assignment-reports',
    type: 'Quick Action',
    title: 'Open Assignment Reports',
    subtitle: 'Review submission and grading reports',
    route: '/reports/assignments',
    keywords: ['reports', 'assignments', 'submissions'],
    label: 'Report',
  },
  {
    id: 'qa-quiz-reports',
    type: 'Quick Action',
    title: 'Open Quiz Reports',
    subtitle: 'Review quiz publishing and attempt reports',
    route: '/reports/quizzes',
    keywords: ['reports', 'quizzes', 'attempts'],
    label: 'Report',
  },
  {
    id: 'qa-activity-reports',
    type: 'Quick Action',
    title: 'Open Activity Reports',
    subtitle: 'Review course activity and learner momentum',
    route: '/reports/instructor-activity',
    keywords: ['reports', 'activity', 'students'],
    label: 'Report',
  },
  {
    id: 'qa-instructor-messages',
    type: 'Quick Action',
    title: 'Open Messages',
    subtitle: 'Continue direct conversations',
    route: '/chat',
    keywords: ['messages', 'chat', 'communication'],
    label: 'Page',
  },
  {
    id: 'qa-instructor-notifications',
    type: 'Quick Action',
    title: 'Open Notifications',
    subtitle: 'View recent teaching updates',
    route: '/notifications',
    keywords: ['notifications', 'alerts', 'updates'],
    label: 'Page',
  },
];

function getItemIcon(type: WorkspaceSearchItemType) {
  switch (type) {
    case 'Course':
      return FolderKanban;
    case 'Lesson':
      return BookOpen;
    case 'Assignment':
      return ClipboardList;
    case 'Quiz':
      return BookOpen;
    case 'Discussion':
      return MessageSquare;
    case 'Announcement':
    case 'Notification':
      return Bell;
    case 'Quick Action':
    default:
      return Search;
  }
}

function getQuickActionIcon(title: string) {
  switch (title) {
    case 'Go to Instructor Dashboard':
      return LayoutDashboard;
    case 'Manage Courses':
    case 'Courses':
      return FolderKanban;
    case 'Manage Lessons':
      return NotebookPen;
    case 'Manage Assessments':
    case 'Calendar':
      return title === 'Calendar' ? CalendarDays : ClipboardList;
    case 'View Student Progress':
    case 'Open Activity Reports':
      return ChartColumnIncreasing;
    case 'Open Assignment Reports':
    case 'Open Quiz Reports':
      return FileText;
    case 'Open Messages':
      return MessageSquare;
    case 'Open Notifications':
      return Bell;
    case 'Progress':
      return BookOpen;
    case 'Grades':
      return ClipboardList;
    case 'Community':
      return MessageSquare;
    case 'Notifications':
      return Bell;
    default:
      return Search;
  }
}

function getSectionTitle(type: WorkspaceSearchItemType) {
  switch (type) {
    case 'Course':
      return 'Courses';
    case 'Assignment':
      return 'Assignments';
    case 'Quiz':
      return 'Quizzes';
    case 'Discussion':
      return 'Discussions';
    case 'Announcement':
    case 'Notification':
      return 'Notifications';
    case 'Lesson':
      return 'Lessons';
    case 'Quick Action':
    default:
      return 'Pages';
  }
}

function getItemTypeLabel(item: CommandPaletteItem) {
  return item.label ?? (item.type === 'Quick Action' ? 'Page' : item.type);
}

function uniqueById(items: CommandPaletteItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function ClientCommandPalette({ open, onClose }: CommandPaletteProps) {
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = Boolean(screens.xs) && !screens.md;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setCacheVersion((value) => value + 1);
    });

    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!open) return undefined;

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const searchItems = useMemo(() => {
    const items = uniqueById(collectWorkspaceSearchItems(queryClient) as CommandPaletteItem[]);

    if (user?.role !== 'INSTRUCTOR') {
      return items;
    }

    return items.filter((item) => !/^\/courses\/[^/]+\/(learn|assignments|quizzes)(?:\/|$)/.test(item.route));
  }, [queryClient, cacheVersion, user?.role]);
  const roleQuickActions = user?.role === 'INSTRUCTOR' ? INSTRUCTOR_QUICK_ACTIONS : QUICK_ACTIONS;
  const quickActions = useMemo(() => roleQuickActions.filter((item) => item.route !== location.pathname), [location.pathname, roleQuickActions]);

  const filteredResults = useMemo(() => {
    return filterWorkspaceSearchItems(searchItems, query) as CommandPaletteItem[];
  }, [query, searchItems]);

  const filteredQuickActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return quickActions;
    }

    return quickActions.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.keywords.some((keyword) => keyword.toLowerCase().includes(normalized)),
    );
  }, [query, quickActions]);

  const sections = useMemo(() => {
    if (query.trim()) {
      const groupedResults = filteredResults.reduce<Record<string, CommandPaletteItem[]>>((groups, item) => {
        const title = getSectionTitle(item.type);
        groups[title] = [...(groups[title] ?? []), item];
        return groups;
      }, {});

      return [
        { key: 'pages', title: 'Pages', items: filteredQuickActions },
        ...Object.entries(groupedResults).map(([title, items]) => ({
          key: title.toLowerCase(),
          title,
          items,
        })),
      ].filter((section) => section.items.length > 0);
    }

    return [
      {
        key: 'quick-actions',
        title: 'Quick actions',
        items: quickActions,
      },
    ].filter((section) => section.items.length > 0);
  }, [filteredQuickActions, filteredResults, quickActions, query]);

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const safeActiveIndex = flatItems.length ? Math.min(activeIndex, flatItems.length - 1) : 0;

  const resetPalette = () => {
    setQuery('');
    setActiveIndex(0);
  };

  const handleClose = () => {
    resetPalette();
    onClose();
  };

  const handleSelect = (item: CommandPaletteItem) => {
    recordFrequentWorkspace({
      id: item.id,
      route: item.route,
      title: item.title,
      subtitle: item.subtitle,
      type: item.type,
    });

    if (item.type !== 'Quick Action' && item.type !== 'Announcement' && item.type !== 'Notification') {
      recordRecentWorkspace({
        id: item.id,
        route: item.route,
        title: item.title,
        subtitle: item.subtitle,
        type:
          item.type === 'Course'
            ? 'course'
            : item.type === 'Lesson'
              ? 'lesson'
              : item.type === 'Assignment'
                ? 'assignment'
                : item.type === 'Quiz'
                  ? 'quiz'
                  : 'discussion',
      });
    }
    handleClose();
    navigate(item.route);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (!flatItems.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((value) => (value + 1) % flatItems.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((value) => (value - 1 + flatItems.length) % flatItems.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const activeItem = flatItems[safeActiveIndex];
      if (activeItem) {
        handleSelect(activeItem);
      }
    }
  };

  const body = (
    <div className="client-command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="client-command-palette__header">
        <Search size={18} className="client-command-palette__search-icon" />
        <input
          ref={inputRef}
          className="client-command-palette__input"
          placeholder="Search courses, assignments, quizzes..."
          value={query}
          onChange={(event) => {
            setActiveIndex(0);
            setQuery(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search command palette"
        />
        <span className="client-command-palette__hint">ESC</span>
      </div>

      <div className="client-command-palette__body">
        {sections.length ? (
          sections.map((section) => (
            <section key={section.key} className="client-command-palette__section" aria-label={section.title}>
              <div className="client-command-palette__section-header">
                <strong>{section.title}</strong>
              </div>
              <div className="client-command-palette__list" role="listbox" aria-label={section.title}>
                {section.items.map((item, itemIndex) => {
                  const currentIndex = flatItems.findIndex((flatItem) => flatItem.id === item.id);
                  const isActive = currentIndex === safeActiveIndex;
                  const Icon = item.type === 'Quick Action' ? getQuickActionIcon(item.title) : getItemIcon(item.type);

                  return (
                    <button
                      key={`${section.key}-${item.id}-${itemIndex}`}
                      type="button"
                      className={`client-command-palette__item${isActive ? ' client-command-palette__item--active' : ''}`}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      onClick={() => handleSelect(item)}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span className="client-command-palette__item-icon">
                        <Icon size={18} />
                      </span>
                      <span className="client-command-palette__item-copy">
                        <span className="client-command-palette__item-title">{item.title}</span>
                        {item.subtitle ? <span className="client-command-palette__item-subtitle">{item.subtitle}</span> : null}
                      </span>
                      {item.type === 'Quick Action' && !query.trim() ? null : (
                        <span className="client-command-palette__item-meta">
                          <span className="client-command-palette__item-type">{getItemTypeLabel(item)}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="client-command-palette__empty">
            <strong>No matching results found.</strong>
            <span>
              {user?.role === 'INSTRUCTOR'
                ? 'Try Courses, Lessons, Assessments, Reports, Messages, or Notifications.'
                : 'Try Courses, Calendar, Progress, Grades, Community, or Notifications.'}
            </span>
          </div>
        )}
      </div>

      <div className="client-command-palette__footer">
        <span>
          Navigate with <kbd>Up</kbd> <kbd>Down</kbd> and open with <kbd>Enter</kbd>
        </span>
        <span>Loaded workspace data only</span>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={handleClose}
        placement="top"
        height="100dvh"
        className="client-command-palette__drawer"
        rootClassName="client-command-palette__drawer"
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width="min(720px, calc(100vw - 24px))"
      className="client-command-palette__modal"
      rootClassName="client-command-palette__modal"
      destroyOnHidden
      closable={false}
      maskClosable
    >
      {body}
    </Modal>
  );
}
