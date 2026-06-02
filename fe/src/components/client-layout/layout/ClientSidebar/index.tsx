import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Collapse, Drawer, Dropdown, Layout, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { ArrowRight, Bell, BookCopy, ClipboardList, Clock3, LogOut, MessagesSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../../../services/api/authApi';
import { listCoursesRequest } from '../../../../services/api/courseApi';
import { useAuth } from '../../../../context/AuthContext';
import { useClientContinueLearning } from '../../../../hooks/useClientContinueLearning';
import { readRecentWorkspace, type RecentWorkspaceItem } from '../../../../utils/clientShellWorkspace';
import { clientRoleLabels, getClientMenuMatch, getVisibleClientMenu } from '../ClientRoleMenu/clientMenu.config';
import './ClientSidebar.css';

type ClientSidebarProps = {
  isMobile: boolean;
  isTablet: boolean;
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
};

function getInitials(name?: string | null) {
  if (!name) return 'U';

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ClientSidebar({
  isMobile,
  isTablet,
  mobileOpen,
  collapsed,
  onCloseMobile,
}: ClientSidebarProps) {
  const { user, refreshToken, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sections = useMemo(() => getVisibleClientMenu(user?.role), [user?.role]);
  const activeItem = getClientMenuMatch(location.pathname, user?.role);
  const continueLearning = useClientContinueLearning();
  const isCollapsed = !isMobile && !isTablet && collapsed;
  const [expandedCourseToolKeys, setExpandedCourseToolKeys] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<RecentWorkspaceItem[]>([]);
  const coursesQuery = useQuery({
    queryKey: ['courses', 'sidebar-shortcuts'],
    queryFn: () => listCoursesRequest({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: user?.role === 'STUDENT',
  });
  const currentCourseId = useMemo(() => {
    const courseMatch = location.pathname.match(/^\/courses\/([^/]+)(?:\/|$)/);
    return courseMatch?.[1] ?? null;
  }, [location.pathname]);
  const fallbackCourseId = coursesQuery.data?.data?.[0]?.id ?? null;
  const courseToolCourseId = currentCourseId ?? fallbackCourseId;
  const courseToolsActive = /^\/courses\/[^/]+\/(assignments|quizzes|announcements|discussion)/.test(location.pathname);
  const shouldShowCourseTools = Boolean(user?.role === 'STUDENT' && courseToolCourseId);

  useEffect(() => {
    setRecentItems(readRecentWorkspace().slice(0, 5));
  }, [location.pathname]);

  const studentCourseTools = useMemo(
    () =>
      shouldShowCourseTools
        ? [
            {
              key: 'assignments',
              label: 'Assignments',
              path: `/courses/${courseToolCourseId}/assignments`,
              icon: ClipboardList,
            },
            {
              key: 'quizzes',
              label: 'Quizzes',
              path: `/courses/${courseToolCourseId}/quizzes`,
              icon: BookCopy,
            },
            {
              key: 'announcements',
              label: 'Announcements',
              path: `/courses/${courseToolCourseId}/announcements`,
              icon: Bell,
            },
            {
              key: 'discussion',
              label: 'Discussion',
              path: `/courses/${courseToolCourseId}/discussion`,
              icon: MessagesSquare,
            },
          ]
        : [],
    [courseToolCourseId, shouldShowCourseTools],
  );

  const { primarySections, settingsItem } = useMemo(() => {
    if (user?.role === 'STUDENT') {
      return {
        primarySections: sections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) =>
              [
                'student-dashboard',
                'student-courses',
                'student-calendar',
                'student-progress',
                'student-grades',
                'student-certificates',
                'student-community',
                'notifications',
              ].includes(item.key),
            ),
          }))
          .filter((section) => section.items.length > 0),
        settingsItem: sections.flatMap((section) => section.items).find((item) => item.key === 'settings'),
      };
    }

    return {
      primarySections: sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            [
              'instructor-dashboard',
              'instructor-courses',
              'instructor-lessons',
              'instructor-assessments',
              'instructor-progress',
              'direct-chat',
              'notifications',
            ].includes(item.key),
          ),
        }))
        .filter((section) => section.items.length > 0),
      settingsItem: sections.flatMap((section) => section.items).find((item) => item.key === 'settings'),
    };
  }, [sections, user?.role]);

  const courseToolsMenuItems = useMemo<MenuProps['items']>(
    () =>
      studentCourseTools.map((item) => ({
        key: item.key,
        icon: <item.icon size={16} />,
        label: item.label,
      })),
    [studentCourseTools],
  );

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Local auth is cleared below.
      }
    }

    logout();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const renderNavButton = (item: (typeof primarySections)[number]['items'][number]) => {
    const Icon = item.icon;
    const isActive = activeItem?.key === item.key;
    const button = (
      <button
        key={item.key}
        type="button"
        className={`client-sidebar__item${isActive ? ' client-sidebar__item--active' : ''}${isCollapsed ? ' client-sidebar__item--collapsed' : ''}`}
        onClick={() => handleNavigate(item.path)}
        aria-label={item.label}
      >
        <Icon size={18} />
        {!isCollapsed ? <span>{item.label}</span> : null}
      </button>
    );

    if (!isCollapsed) {
      return button;
    }

    return (
      <Tooltip key={item.key} placement="right" title={item.label}>
        {button}
      </Tooltip>
    );
  };

  const isCourseToolPathActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const courseToolsAccordionItems = [
    {
      key: 'course-tools',
      label: (
        <div className="client-sidebar__tools-label">
          <BookCopy size={16} />
          <span>Course Tools</span>
        </div>
      ),
      children: (
        <div className="client-sidebar__shortcut-list client-sidebar__shortcut-list--stacked">
          {studentCourseTools.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`client-sidebar__shortcut${isCourseToolPathActive(item.path) ? ' client-sidebar__shortcut--active' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              <span className="client-sidebar__shortcut-icon">
                <item.icon size={15} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ),
    },
  ];

  const continueRoute =
    continueLearning.courseId && continueLearning.currentLesson
      ? `/courses/${continueLearning.courseId}/learn/${continueLearning.currentLesson.id}`
      : null;

  const sidebarContent = (
    <div className={`client-sidebar${isCollapsed ? ' client-sidebar--collapsed' : ''}`}>
      <div className="client-sidebar__brand">
        <span className="client-sidebar__mark">L</span>
        <div className="client-sidebar__brand-copy" hidden={isCollapsed}>
          <Typography.Text strong>LMS Client</Typography.Text>
        </div>
      </div>

      <nav className="client-sidebar__nav" role="menu" aria-label="Client navigation">
        {primarySections.map((section) => (
          <section key={section.key} className="client-sidebar__group" aria-label={section.title}>
            {!isCollapsed ? (
              <Typography.Text className="client-sidebar__group-label">{section.title}</Typography.Text>
            ) : null}
            <div className="client-sidebar__menu">{section.items.map(renderNavButton)}</div>
          </section>
        ))}

        {shouldShowCourseTools && !isCollapsed ? (
          <section className="client-sidebar__shortcuts" aria-label="Course tools">
            <Collapse
              ghost
              className={`client-sidebar__tools-accordion${courseToolsActive ? ' client-sidebar__tools-accordion--active' : ''}`}
              activeKey={expandedCourseToolKeys}
              onChange={(keys) => setExpandedCourseToolKeys(Array.isArray(keys) ? keys.map(String) : keys ? [String(keys)] : [])}
              items={courseToolsAccordionItems}
            />
          </section>
        ) : null}

        {shouldShowCourseTools && isCollapsed ? (
          <div className="client-sidebar__collapsed-tools">
            <Dropdown
              trigger={['hover', 'click']}
              classNames={{ root: 'client-sidebar__tools-dropdown' }}
              menu={{
                items: courseToolsMenuItems,
                selectedKeys: studentCourseTools.filter((item) => isCourseToolPathActive(item.path)).map((item) => item.key),
                onClick: ({ key }) => {
                  const target = studentCourseTools.find((item) => item.key === key);
                  if (target) {
                    handleNavigate(target.path);
                  }
                },
              }}
              placement="topRight"
            >
              <Tooltip placement="right" title="Course Tools">
                <button
                  type="button"
                  className={`client-sidebar__item${courseToolsActive ? ' client-sidebar__item--active' : ''} client-sidebar__item--collapsed`}
                  aria-label="Course Tools"
                >
                  <BookCopy size={18} />
                </button>
              </Tooltip>
            </Dropdown>
          </div>
        ) : null}

        {recentItems.length > 0 && !isCollapsed ? (
          <section className="client-sidebar__shortcuts client-sidebar__recent-workspace" aria-label="Recent workspace">
            <Typography.Text className="client-sidebar__group-label">Recent Workspace</Typography.Text>
            <div className="client-sidebar__recent-list">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="client-sidebar__recent-item"
                  onClick={() => handleNavigate(item.route)}
                >
                  <span className="client-sidebar__recent-meta">
                    <Clock3 size={14} />
                    {item.type}
                  </span>
                  <strong>{item.title}</strong>
                  {item.subtitle ? <span className="client-meta">{item.subtitle}</span> : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </nav>

      <div className="client-sidebar__footer">
        {continueRoute && !isCollapsed ? (
          <button type="button" className="client-sidebar__resume-card" onClick={() => handleNavigate(continueRoute)}>
            <span className="client-sidebar__resume-label">Continue Learning</span>
            <strong>{continueLearning.courseTitle}</strong>
            <span className="client-meta">{continueLearning.currentLesson?.title}</span>
            <span className="client-sidebar__resume-progress">
              {continueLearning.percentage}% complete
              <ArrowRight size={14} />
            </span>
          </button>
        ) : null}

        {settingsItem
          ? (() => {
              const SettingsIcon = settingsItem.icon;
              const settingsButton = (
                <button
                  type="button"
                  className={`client-sidebar__item client-sidebar__item--footer${
                    activeItem?.key === settingsItem.key ? ' client-sidebar__item--active' : ''
                  }${isCollapsed ? ' client-sidebar__item--collapsed' : ''}`}
                  onClick={() => handleNavigate(settingsItem.path)}
                  aria-label={settingsItem.label}
                >
                  <SettingsIcon size={18} />
                  {!isCollapsed ? <span>{settingsItem.label}</span> : null}
                </button>
              );

              return isCollapsed ? (
                <Tooltip placement="right" title={settingsItem.label}>
                  {settingsButton}
                </Tooltip>
              ) : (
                settingsButton
              );
            })()
          : null}

        {user?.role && user.role !== 'ADMIN' ? (
          <div className="client-sidebar__footer-user">
            <Avatar
              size={isCollapsed ? 36 : 40}
              src={user?.avatarUrl ?? undefined}
              icon={!user?.avatarUrl ? <span>{getInitials(user?.name)}</span> : undefined}
            />
            {!isCollapsed ? (
              <div className="client-sidebar__footer-user-copy">
                <span className="client-sidebar__footer-name">{user?.name}</span>
                <span className="client-sidebar__footer-role">{clientRoleLabels[user.role]}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {isCollapsed ? (
          <>
            {continueRoute ? (
              <Tooltip placement="right" title={continueLearning.courseTitle ?? 'Continue learning'}>
                <button
                  type="button"
                  className="client-sidebar__collapsed-resume"
                  onClick={() => handleNavigate(continueRoute)}
                  aria-label="Continue learning"
                >
                  <ArrowRight size={16} />
                </button>
              </Tooltip>
            ) : null}
            <Tooltip placement="right" title="Logout">
              <Button
                className="client-sidebar__logout client-sidebar__logout--collapsed"
                icon={<LogOut size={16} />}
                onClick={() => void handleLogout()}
                aria-label="Logout"
              />
            </Tooltip>
          </>
        ) : (
          <Button className="client-sidebar__logout" icon={<LogOut size={16} />} onClick={() => void handleLogout()}>
            Logout
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile || isTablet) {
    return (
      <Drawer
        placement="left"
        closable={false}
        open={mobileOpen}
        onClose={onCloseMobile}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Layout.Sider
      width={collapsed ? 72 : 260}
      collapsedWidth={72}
      collapsed={collapsed}
      trigger={null}
      className={`client-sidebar-shell${collapsed ? ' client-sidebar-shell--collapsed' : ''}`}
    >
      {sidebarContent}
    </Layout.Sider>
  );
}
