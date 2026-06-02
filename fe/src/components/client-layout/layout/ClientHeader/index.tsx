import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Dropdown, Layout, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowRight,
  Bell,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FolderKanban,
  Menu,
  MessagesSquare,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../../../services/api/authApi';
import { getCourseByIdRequest } from '../../../../services/api/courseApi';
import { listNotificationsRequest, markAllNotificationsAsReadRequest } from '../../../../services/api/notificationApi';
import { useAuth } from '../../../../context/AuthContext';
import { useClientContinueLearning } from '../../../../hooks/useClientContinueLearning';
import { useProgressOverview } from '../../../../hooks/useProgressOverview';
import { clientRoleLabels } from '../ClientRoleMenu/clientMenu.config';
import {
  getNotificationActionLabel,
  getNotificationDestination,
  getNotificationSourceLabel,
  getNotificationTypeLabel,
} from '../../../../utils/notifications';
import './ClientHeader.css';

type ClientHeaderProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  isMobileOrTablet: boolean;
  isSidebarCollapsed: boolean;
};

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'ASSIGNMENT':
      return ClipboardList;
    case 'QUIZ':
      return BookOpen;
    case 'CHAT':
      return MessagesSquare;
    case 'SYSTEM':
      return ShieldAlert;
    case 'COURSE':
    default:
      return Bell;
  }
}

export function ClientHeader({
  onOpenMobileSidebar,
  onToggleSidebar,
  onOpenCommandPalette,
  isMobileOrTablet,
  isSidebarCollapsed,
}: ClientHeaderProps) {
  const { user, refreshToken, logout } = useAuth();
  const progressOverview = useProgressOverview();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const continueLearning = useClientContinueLearning();
  const currentCourseId = useMemo(() => {
    const courseMatch = location.pathname.match(/^\/courses\/([^/]+)(?:\/|$)/);
    return courseMatch?.[1] ?? null;
  }, [location.pathname]);
  const currentCourseQuery = useQuery({
    queryKey: ['header', 'workspace-course', currentCourseId],
    queryFn: () => getCourseByIdRequest(currentCourseId!),
    enabled: Boolean(currentCourseId),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const sectionLabel = useMemo(() => {
    if (!currentCourseId) {
      return null;
    }
    if (location.pathname.includes('/assignments')) return 'Assignments';
    if (location.pathname.includes('/quizzes')) return 'Quizzes';
    if (location.pathname.includes('/discussion')) return 'Discussion';
    if (location.pathname.includes('/announcements')) return 'Announcements';
    if (location.pathname.includes('/learn/')) return 'Lesson Viewer';
    return 'Course Workspace';
  }, [currentCourseId, location.pathname]);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'header-count'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
    enabled: Boolean(user) && typeof listNotificationsRequest === 'function',
  });

  const queryClient = useQueryClient();

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsReadRequest,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousHeader = queryClient.getQueryData<unknown>(['notifications', 'header-count']);
      const previousList = queryClient.getQueryData<unknown>(['notifications', 'list']);

      queryClient.setQueryData(['notifications', 'header-count'], (current: any) =>
        Array.isArray(current) ? current.map((i: any) => ({ ...i, isRead: true, readAt: i.readAt ?? new Date().toISOString() })) : current,
      );

      queryClient.setQueryData(['notifications', 'list'], (current: any) =>
        Array.isArray(current) ? current.map((i: any) => ({ ...i, isRead: true, readAt: i.readAt ?? new Date().toISOString() })) : current,
      );

      return { previousHeader, previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousHeader) queryClient.setQueryData(['notifications', 'header-count'], context.previousHeader);
      if (context?.previousList) queryClient.setQueryData(['notifications', 'list'], context.previousList);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = useMemo(
    () => (notificationsQuery.data ?? []).filter((notification) => !notification.isRead).length,
    [notificationsQuery.data],
  );
  const recentNotifications = useMemo(() => (notificationsQuery.data ?? []).slice(0, 4), [notificationsQuery.data]);

  const activeCourseCount = progressOverview.data ? (progressOverview.data.courses ?? []).filter((c) => c.enrollmentStatus === 'ACTIVE').length : 0;

  const accountItems = useMemo<MenuProps['items']>(
    () => [
      { key: 'profile', label: <Link to="/profile">Profile</Link> },
      { key: 'settings', label: <Link to="/settings">Settings</Link> },
      { key: 'progress', label: <Link to="/progress">My Progress</Link> },
      { key: 'certificates', label: <Link to="/certificates">Certificates</Link> },
      { key: 'logout', label: 'Logout' },
    ],
    [],
  );
  const workspaceSwitcherItems = useMemo<MenuProps['items']>(
    () =>
      currentCourseId
        ? [
            { key: 'course', icon: <FolderKanban size={16} />, label: 'Course Overview' },
            { key: 'assignments', icon: <ClipboardList size={16} />, label: 'Assignments' },
            { key: 'quizzes', icon: <BookOpen size={16} />, label: 'Quizzes' },
            { key: 'discussion', icon: <MessagesSquare size={16} />, label: 'Discussion' },
            { key: 'announcements', icon: <Bell size={16} />, label: 'Announcements' },
            { key: 'catalog', icon: <ArrowRight size={16} />, label: 'Course Catalog' },
          ]
        : [],
    [currentCourseId],
  );

  const handleAccountClick: MenuProps['onClick'] = async ({ key }) => {
    if (key !== 'logout') {
      return;
    }

    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Local auth is still cleared below.
      }
    }

    logout();
  };

  const handleWorkspaceSwitch: MenuProps['onClick'] = ({ key }) => {
    if (!currentCourseId) {
      return;
    }

    switch (key) {
      case 'course':
        navigate(`/courses/${currentCourseId}`);
        return;
      case 'assignments':
        navigate(`/courses/${currentCourseId}/assignments`);
        return;
      case 'quizzes':
        navigate(`/courses/${currentCourseId}/quizzes`);
        return;
      case 'discussion':
        navigate(`/courses/${currentCourseId}/discussion`);
        return;
      case 'announcements':
        navigate(`/courses/${currentCourseId}/announcements`);
        return;
      case 'catalog':
        navigate('/courses');
        return;
      default:
        return;
    }
  };

  return (
    <Layout.Header className="client-header">
      <div className="client-header__left">
        <Button
          type="text"
          className="client-header__menu-toggle"
          icon={
            isMobileOrTablet ? (
              <Menu size={18} />
            ) : isSidebarCollapsed ? (
              <ChevronsRight size={18} />
            ) : (
              <ChevronsLeft size={18} />
            )
          }
          onClick={isMobileOrTablet ? onOpenMobileSidebar : onToggleSidebar}
          aria-label={isMobileOrTablet ? 'Open navigation' : isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        />
      </div>

      <div className="client-header__search">
        {currentCourseId && currentCourseQuery.data ? (
          <Dropdown
            trigger={['click']}
            placement="bottomLeft"
            menu={{ items: workspaceSwitcherItems, onClick: handleWorkspaceSwitch }}
            classNames={{ root: 'client-header__dropdown-overlay' }}
          >
            <button type="button" className="client-header__workspace-switcher" aria-label="Switch course workspace">
              <span className="client-header__workspace-copy">
                <span className="client-header__workspace-label">{sectionLabel}</span>
                <strong>{currentCourseQuery.data.title}</strong>
              </span>
              <ArrowRight size={16} />
            </button>
          </Dropdown>
        ) : null}
      </div>

      <div className="client-header__search client-header__search--command">
        <Tooltip title="Global search is coming soon. Use page search and filters for now.">
          {isMobileOrTablet ? (
            <Button
              type="text"
              className="client-header__search-trigger client-header__search-trigger--icon"
              icon={<Search size={16} />}
              aria-label="Global search is coming soon"
              onClick={onOpenCommandPalette}
            />
          ) : (
            <button
              type="button"
              className="client-header__search-trigger"
              aria-label="Open command palette"
              onClick={onOpenCommandPalette}
            >
              <span className="client-header__search-copy">
                <Search size={16} />
                <span>Search inside current workspace</span>
              </span>
              <span className="client-header__search-kbd">Ctrl K</span>
            </button>
          )}
        </Tooltip>
      </div>

      <div className="client-header__right">
        <Dropdown
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          trigger={['click']}
          placement="bottomRight"
          classNames={{ root: 'client-header__dropdown-overlay' }}
          destroyOnHidden
          popupRender={() => (
            <div className="client-header__dropdown-card client-header__dropdown-card--notifications">
              <div className="client-header__dropdown-header">
                <div className="client-header__dropdown-copy">
                  <strong>Notifications</strong>
                  <Typography.Text>{unreadCount} unread</Typography.Text>
                </div>
                <div className="client-header__dropdown-actions">
                  <Button
                    className="client-button client-button-ghost"
                    disabled={!unreadCount || markAllMutation.isPending}
                    onClick={async () => {
                      try {
                        await markAllMutation.mutateAsync();
                      } catch {
                        // errors handled by mutation
                      }
                    }}
                  >
                    Mark all read
                  </Button>
                </div>
              </div>
              {notificationsQuery.isError ? (
                <div className="client-header__dropdown-empty">
                  <Typography.Text strong>Unable to load notifications</Typography.Text>
                  <Typography.Text>Open the full notifications center to retry.</Typography.Text>
                </div>
              ) : recentNotifications.length ? (
                <div className="client-header__notification-preview-list" role="list">
                  {recentNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      role="listitem"
                      className={`client-header__notification-preview${notification.isRead ? '' : ' client-header__notification-preview--unread'}`}
                    >
                      <div className="client-header__notification-preview-top">
                        <span className="client-header__notification-meta">
                          <span className="client-header__notification-icon">
                            {(() => {
                              const Icon = getNotificationIcon(notification.type);
                              return <Icon size={15} />;
                            })()}
                          </span>
                          <span className="client-badge">{getNotificationTypeLabel(notification)}</span>
                          {!notification.isRead ? <span className="client-header__notification-unread-dot" aria-hidden="true" /> : null}
                        </span>
                        <span className="client-header__notification-time">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <div className="client-header__notification-preview-copy">
                        <strong>{notification.message}</strong>
                        <Typography.Text>{getNotificationSourceLabel(notification)}</Typography.Text>
                      </div>
                      <Button
                        className="client-button client-button-secondary client-header__notification-action-button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate(getNotificationDestination(notification));
                        }}
                      >
                        {getNotificationActionLabel(notification)}
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="client-header__dropdown-empty">
                  <Typography.Text strong>You're all caught up</Typography.Text>
                  <Typography.Text>No new notifications are waiting for you right now.</Typography.Text>
                </div>
              )}
              <Button
                className="client-button client-button-secondary client-header__view-all"
                onClick={() => {
                  setNotificationsOpen(false);
                  navigate('/notifications');
                }}
              >
                View All Notifications
              </Button>
            </div>
          )}
        >
          <Badge count={unreadCount} size="small" className="client-header__notification">
            <Button
              type="text"
              className="client-header__notification-button"
              icon={<Bell size={18} />}
              aria-label="Open notifications preview"
            />
          </Badge>
        </Dropdown>
        <Dropdown
          menu={{ items: accountItems, onClick: handleAccountClick }}
          trigger={['click']}
          classNames={{ root: 'client-header__dropdown-overlay' }}
          popupRender={(menu) => (
            <div className="client-header__dropdown-card client-header__dropdown-card--profile">
              <div className="client-header__profile-panel">
                <Avatar size={48} icon={<UserRound size={18} />} src={user?.avatarUrl ?? undefined} />
                <div className="client-header__profile-panel-copy">
                  <strong>{user?.name}</strong>
                      <Typography.Text>{user?.role && user.role !== 'ADMIN' ? clientRoleLabels[user.role] : 'Client'}</Typography.Text>
                      <Typography.Text>{activeCourseCount} active course{activeCourseCount === 1 ? '' : 's'}</Typography.Text>
                  {continueLearning.streak ? (
                    <span className="client-header__profile-streak">
                      <Sparkles size={14} />
                      {continueLearning.streak} day streak
                    </span>
                  ) : null}
                </div>
              </div>
              {continueLearning.courseId && continueLearning.currentLesson ? (
                <button
                  type="button"
                  className="client-header__resume-panel"
                  onClick={() => navigate(`/courses/${continueLearning.courseId}/learn/${continueLearning.currentLesson.id}`)}
                >
                  <span className="client-header__resume-label">Continue Learning</span>
                  <strong>{continueLearning.courseTitle}</strong>
                  <Typography.Text>
                    {continueLearning.currentLesson.title} · {continueLearning.percentage}% complete
                  </Typography.Text>
                </button>
              ) : null}
              {menu}
            </div>
          )}
        >
          <div className="client-header__profile" role="button" tabIndex={0}>
            <Avatar icon={<UserRound size={16} />} src={user?.avatarUrl ?? undefined} />
            <span className="client-header__profile-copy">
              <strong>{user?.name}</strong>
              <Typography.Text>{user?.role && user.role !== 'ADMIN' ? clientRoleLabels[user.role] : 'Client'}</Typography.Text>
            </span>
          </div>
        </Dropdown>
      </div>
    </Layout.Header>
  );
}
