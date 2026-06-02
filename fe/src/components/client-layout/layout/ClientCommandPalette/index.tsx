import { useQueryClient } from '@tanstack/react-query';
import { Drawer, Grid, Modal } from 'antd';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEventHandler } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  collectWorkspaceSearchItems,
  filterWorkspaceSearchItems,
  readFrequentWorkspace,
  readRecentWorkspace,
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
};

const QUICK_ACTIONS: CommandPaletteItem[] = [
  { id: 'qa-dashboard', type: 'Quick Action', title: 'Dashboard', subtitle: 'Quick action', route: '/dashboard', keywords: ['dashboard'] },
  { id: 'qa-courses', type: 'Quick Action', title: 'Courses', subtitle: 'Quick action', route: '/courses', keywords: ['courses', 'catalog'] },
  { id: 'qa-calendar', type: 'Quick Action', title: 'Calendar', subtitle: 'Quick action', route: '/calendar', keywords: ['calendar', 'schedule'] },
  { id: 'qa-progress', type: 'Quick Action', title: 'Progress', subtitle: 'Quick action', route: '/progress', keywords: ['progress'] },
  { id: 'qa-grades', type: 'Quick Action', title: 'Grades', subtitle: 'Quick action', route: '/grades', keywords: ['grades'] },
  { id: 'qa-certificates', type: 'Quick Action', title: 'Certificates', subtitle: 'Quick action', route: '/certificates', keywords: ['certificates'] },
  { id: 'qa-community', type: 'Quick Action', title: 'Community', subtitle: 'Quick action', route: '/student/community', keywords: ['community', 'discussion'] },
  { id: 'qa-notifications', type: 'Quick Action', title: 'Notifications', subtitle: 'Quick action', route: '/notifications', keywords: ['notifications', 'alerts'] },
  { id: 'qa-settings', type: 'Quick Action', title: 'Settings', subtitle: 'Quick action', route: '/settings', keywords: ['settings', 'account'] },
];

function mapRecentTypeToSearchType(type: 'course' | 'lesson' | 'assignment' | 'quiz' | 'discussion'): WorkspaceSearchItemType {
  switch (type) {
    case 'course':
      return 'Course';
    case 'lesson':
      return 'Lesson';
    case 'assignment':
      return 'Assignment';
    case 'quiz':
      return 'Quiz';
    case 'discussion':
    default:
      return 'Discussion';
  }
}

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
      return LayoutDashboard;
  }
}

function getQuickActionIcon(title: string) {
  switch (title) {
    case 'Dashboard':
      return LayoutDashboard;
    case 'Courses':
      return FolderKanban;
    case 'Calendar':
      return CalendarDays;
    case 'Progress':
      return BookOpen;
    case 'Grades':
      return ClipboardList;
    case 'Certificates':
      return Trophy;
    case 'Community':
      return MessageSquare;
    case 'Notifications':
      return Bell;
    case 'Settings':
    default:
      return Settings;
  }
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
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

    return () => window.clearTimeout(timeout);
  }, [open]);

  const searchItems = useMemo(() => uniqueById(collectWorkspaceSearchItems(queryClient) as CommandPaletteItem[]), [queryClient, cacheVersion]);
  const quickActions = useMemo(() => QUICK_ACTIONS.filter((item) => item.route !== location.pathname), [location.pathname]);

  const recentItems = useMemo(() => {
    return readRecentWorkspace().map((item) => ({
      id: item.id,
      route: item.route,
      title: item.title,
      subtitle: item.subtitle,
      type: mapRecentTypeToSearchType(item.type),
      keywords: [item.title, item.subtitle ?? '', item.type],
    }));
  }, [open]);

  const frequentItems = useMemo(() => {
    return readFrequentWorkspace().map((item) => ({
      id: item.id,
      route: item.route,
      title: item.title,
      subtitle: item.subtitle,
      type: item.type,
      keywords: [item.title, item.subtitle ?? '', item.type],
    })) as CommandPaletteItem[];
  }, [open]);

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
      return [
        {
          key: 'quick-actions',
          title: 'Quick Actions',
          items: filteredQuickActions,
          meta: filteredQuickActions.length ? `${filteredQuickActions.length} action${filteredQuickActions.length === 1 ? '' : 's'}` : undefined,
        },
        {
          key: 'results',
          title: 'Search Results',
          items: filteredResults,
          meta: `${filteredResults.length} result${filteredResults.length === 1 ? '' : 's'}`,
        },
      ].filter((section) => section.items.length > 0);
    }

    return [
      { key: 'recent', title: 'Recent', items: recentItems, meta: recentItems.length ? `${recentItems.length} items` : undefined },
      {
        key: 'frequent',
        title: 'Frequently Used',
        items: frequentItems.filter((item) => !recentItems.some((recentItem) => recentItem.id === item.id)).slice(0, 5),
        meta: frequentItems.length ? `${Math.min(frequentItems.length, 5)} items` : undefined,
      },
      { key: 'quick-actions', title: 'Quick Actions', items: quickActions, meta: `${quickActions.length} actions` },
    ].filter((section) => section.items.length > 0);
  }, [filteredQuickActions, filteredResults, frequentItems, quickActions, query, recentItems]);

  const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

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
    onClose();
    navigate(item.route);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
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
      const activeItem = flatItems[activeIndex];
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
          placeholder="Search courses, assignments, quizzes, discussions, and notifications"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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
                {section.meta ? <span className="client-command-palette__section-meta">{section.meta}</span> : null}
              </div>
              <div className="client-command-palette__list" role="listbox" aria-label={section.title}>
                {section.items.map((item, itemIndex) => {
                  const currentIndex = flatItems.findIndex((flatItem) => flatItem.id === item.id);
                  const isActive = currentIndex === activeIndex;
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
                      <span className="client-command-palette__item-meta">
                        <span className="client-command-palette__item-type">{item.type}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="client-command-palette__empty">
            <strong>No results found</strong>
            <span>Try a different keyword or open a workspace that has loaded the data you want to search.</span>
          </div>
        )}
      </div>

      <div className="client-command-palette__footer">
        <span>
          Navigate with <kbd>↑</kbd> <kbd>↓</kbd> and open with <kbd>Enter</kbd>
        </span>
        <span>Loaded data only</span>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
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
      onCancel={onClose}
      footer={null}
      centered
      width="min(760px, calc(100vw - 32px))"
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
