import { Avatar, Button, Drawer, Layout, Tooltip, Typography } from 'antd';
import { ArrowRight, LogOut } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../../../services/api/authApi';
import { useAuth } from '../../../../context/AuthContext';
import { useClientContinueLearning } from '../../../../hooks/useClientContinueLearning';
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
        <span className="client-sidebar__item-label" aria-hidden={isCollapsed}>
          {item.label}
        </span>
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

  const continueRoute =
    continueLearning.courseId && continueLearning.currentLesson
      ? `/courses/${continueLearning.courseId}/learn/${continueLearning.currentLesson.id}`
      : null;

  const sidebarContent = (
    <div className={`client-sidebar${isCollapsed ? ' client-sidebar--collapsed' : ''}`}>
      <div className="client-sidebar__brand">
        <span className="client-sidebar__mark">L</span>
        <div className="client-sidebar__brand-copy" aria-hidden={isCollapsed}>
          <Typography.Text strong>LMS Client</Typography.Text>
        </div>
      </div>

      <nav className="client-sidebar__nav" role="menu" aria-label="Client navigation">
        {primarySections.map((section) => (
          <section key={section.key} className="client-sidebar__group" aria-label={section.title}>
            <Typography.Text className="client-sidebar__group-label" aria-hidden={isCollapsed}>
              {section.title}
            </Typography.Text>
            <div className="client-sidebar__menu">{section.items.map(renderNavButton)}</div>
          </section>
        ))}

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
                  <span className="client-sidebar__item-label" aria-hidden={isCollapsed}>
                    {settingsItem.label}
                  </span>
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
              size={40}
              src={user?.avatarUrl ?? undefined}
              icon={!user?.avatarUrl ? <span>{getInitials(user?.name)}</span> : undefined}
            />
            <div className="client-sidebar__footer-user-copy" aria-hidden={isCollapsed}>
              <span className="client-sidebar__footer-name">{user?.name}</span>
              <span className="client-sidebar__footer-role">{clientRoleLabels[user.role]}</span>
            </div>
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
