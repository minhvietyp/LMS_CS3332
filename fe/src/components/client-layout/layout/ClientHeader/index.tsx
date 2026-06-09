import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Dropdown, Layout, Tooltip, Typography } from 'antd';
import {
  Bell,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  GraduationCap,
  LogOut,
  Menu,
  MessagesSquare,
  ReceiptText,
  Search,
  Settings,
  ShieldAlert,
  User,
  UserRound,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../../../services/api/authApi';
import { listNotificationsRequest, markAllNotificationsAsReadRequest } from '../../../../services/api/notificationApi';
import { useAuth } from '../../../../context/AuthContext';
import { clientRoleLabels } from '../ClientRoleMenu/clientMenu.config';
import type { ActiveHeaderPanel } from '../ClientLayout';
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
  activeHeaderPanel: ActiveHeaderPanel;
  setActiveHeaderPanel: (panel: ActiveHeaderPanel) => void;
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

type ProfileAction = {
  key: string;
  label: string;
  icon: typeof User;
  to?: string;
  tone?: 'default' | 'danger';
};

export function ClientHeader({
  onOpenMobileSidebar,
  onToggleSidebar,
  onOpenCommandPalette,
  activeHeaderPanel,
  setActiveHeaderPanel,
  isMobileOrTablet,
  isSidebarCollapsed,
}: ClientHeaderProps) {
  const { user, refreshToken, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'header-count'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
    enabled: Boolean(user) && typeof listNotificationsRequest === 'function',
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsReadRequest,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousHeader = queryClient.getQueryData<unknown>(['notifications', 'header-count']);
      const previousList = queryClient.getQueryData<unknown>(['notifications', 'list']);
      const readAt = new Date().toISOString();

      queryClient.setQueryData(['notifications', 'header-count'], (current: unknown) =>
        Array.isArray(current) ? current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? readAt })) : current,
      );
      queryClient.setQueryData(['notifications', 'list'], (current: unknown) =>
        Array.isArray(current) ? current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? readAt })) : current,
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
  const recentNotifications = useMemo(() => (notificationsQuery.data ?? []).slice(0, 8), [notificationsQuery.data]);

  const profileActions = useMemo<ProfileAction[]>(
    () => [
      { key: 'profile', label: 'Profile', icon: User, to: '/profile' },
      { key: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
      { key: 'progress', label: 'My Progress', icon: GraduationCap, to: '/progress' },
      { key: 'courses', label: 'My Courses', icon: BookOpen, to: '/courses' },
      { key: 'certificates', label: 'Certificates', icon: ReceiptText, to: '/certificates' },
    ],
    [],
  );

  const logoutAction = useMemo<ProfileAction>(
    () => ({ key: 'logout', label: 'Logout', icon: LogOut, tone: 'danger' }),
    [],
  );

  const handleAccountAction = async (action: ProfileAction) => {
    if (action.key !== 'logout') {
      setActiveHeaderPanel(null);
      if (action.to) {
        navigate(action.to);
      }
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
    setActiveHeaderPanel(null);
  };

  const openSearch = () => {
    setActiveHeaderPanel('search');
    onOpenCommandPalette();
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

      <div className="client-header__search client-header__search--command">
        <Tooltip title="Search workspace">
          {isMobileOrTablet ? (
            <Button
              type="text"
              className="client-header__search-trigger client-header__search-trigger--icon"
              icon={<Search size={16} />}
              aria-label="Open command palette"
              onClick={openSearch}
            />
          ) : (
            <button type="button" className="client-header__search-trigger" aria-label="Open command palette" onClick={openSearch}>
              <span className="client-header__search-copy">
                <Search size={16} />
                <span>Search LMS...</span>
              </span>
              <span className="client-header__search-kbd">Ctrl K</span>
            </button>
          )}
        </Tooltip>
      </div>

      <div className="client-header__right">
        <Dropdown
          open={activeHeaderPanel === 'notifications'}
          onOpenChange={(open) => setActiveHeaderPanel(open ? 'notifications' : null)}
          trigger={['click']}
          placement="bottomRight"
          classNames={{ root: 'client-header__dropdown-overlay client-header__dropdown-overlay--notifications' }}
          overlayStyle={{ zIndex: 9999 }}
          getPopupContainer={() => document.body}
          destroyOnHidden
          popupRender={() => (
            <section className="client-header__notification-dropdown" aria-label="Notifications preview">
              <div className="client-header__notification-card">
                <div className="client-header__notification-header">
                  <div className="client-header__dropdown-copy">
                    <div className="client-header__notification-header-title">
                      <strong>Notifications</strong>
                      <span className="client-badge">{unreadCount} unread</span>
                    </div>
                    <Typography.Text>Recent updates from your courses and workspace.</Typography.Text>
                  </div>
                  <Button
                    className="client-button client-button-ghost client-header__mark-read-button"
                    aria-label="Mark preview notifications as read"
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
                {notificationsQuery.isError ? (
                  <div className="client-header__dropdown-empty client-header__dropdown-empty--padded">
                    <Typography.Text strong>Unable to load notifications</Typography.Text>
                    <Typography.Text>Open the full notifications center to retry.</Typography.Text>
                  </div>
                ) : recentNotifications.length ? (
                  <div className="client-header__notification-list" role="list">
                    {recentNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);

                      return (
                        <article
                          key={notification.id}
                          role="listitem"
                          className={`client-header__notification-item${notification.isRead ? '' : ' client-header__notification-item--unread'}`}
                        >
                          <span className="client-header__notification-icon">
                            <Icon size={16} />
                          </span>

                          <div className="client-header__notification-item-main">
                            <div className="client-header__notification-item-top">
                              <div className="client-header__notification-meta">
                                <span className="client-badge">{getNotificationTypeLabel(notification)}</span>
                                {!notification.isRead ? (
                                  <span className="client-header__notification-unread-dot" aria-hidden="true" />
                                ) : null}
                              </div>
                              <span className="client-header__notification-time">{formatNotificationTime(notification.createdAt)}</span>
                            </div>

                            <div className="client-header__notification-item-copy">
                              <strong>{notification.message}</strong>
                              <Typography.Text>{getNotificationSourceLabel(notification)}</Typography.Text>
                            </div>

                            <Button
                              className="client-button client-button-secondary client-header__notification-action-button"
                              onClick={() => {
                                setActiveHeaderPanel(null);
                                navigate(getNotificationDestination(notification));
                              }}
                            >
                              {getNotificationActionLabel(notification)}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="client-header__dropdown-empty client-header__dropdown-empty--padded">
                    <Typography.Text strong>You're all caught up</Typography.Text>
                    <Typography.Text>No new notifications are waiting for you right now.</Typography.Text>
                  </div>
                )}

                <div className="client-header__notification-footer">
                  <Button
                    className="client-button client-button-secondary client-header__view-all"
                    onClick={() => {
                      setActiveHeaderPanel(null);
                      navigate('/notifications');
                    }}
                  >
                    View all notifications
                  </Button>
                </div>
              </div>
            </section>
          )}
        >
          <Badge count={unreadCount} size="small" className="client-header__notification">
            <Button
              type="text"
              className="client-header__notification-button"
              icon={<Bell size={18} />}
              aria-label="Open notifications preview"
              aria-expanded={activeHeaderPanel === 'notifications'}
            />
          </Badge>
        </Dropdown>

        <Dropdown
          open={activeHeaderPanel === 'user'}
          onOpenChange={(open) => setActiveHeaderPanel(open ? 'user' : null)}
          trigger={['click']}
          placement="bottomRight"
          classNames={{ root: 'client-header__dropdown-overlay client-header__dropdown-overlay--profile' }}
          overlayStyle={{ zIndex: 9999 }}
          getPopupContainer={() => document.body}
          destroyOnHidden
          popupRender={() => (
            <section className="client-header__profile-dropdown" aria-label="Profile menu">
              <div className="client-header__profile-card">
                <div className="client-header__profile-identity">
                  <Avatar size={48} icon={<UserRound size={18} />} src={user?.avatarUrl ?? undefined} />
                  <div className="client-header__profile-panel-copy">
                    <strong>{user?.name}</strong>
                    <Typography.Text>{user?.role && user.role !== 'ADMIN' ? clientRoleLabels[user.role] : 'Client'}</Typography.Text>
                    <Typography.Text>{user?.email}</Typography.Text>
                  </div>
                </div>

                <div className="client-header__profile-menu" role="menu" aria-label="Profile actions">
                  {profileActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.key}
                        type="button"
                        role="menuitem"
                        className={`client-header__profile-menu-item${
                          action.tone === 'danger' ? ' client-header__profile-menu-item--danger' : ''
                        }`}
                        onClick={() => {
                          void handleAccountAction(action);
                        }}
                      >
                        <span className="client-header__profile-menu-icon">
                          <Icon size={16} />
                        </span>
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="client-header__profile-logout">
                  <button
                    type="button"
                    role="menuitem"
                    className="client-header__profile-menu-item client-header__profile-menu-item--danger"
                    onClick={() => {
                      void handleAccountAction(logoutAction);
                    }}
                  >
                    <span className="client-header__profile-menu-icon">
                      <LogOut size={16} />
                    </span>
                    <span>{logoutAction.label}</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        >
          <button
            type="button"
            className="client-header__profile"
            aria-label="Open user menu"
            aria-expanded={activeHeaderPanel === 'user'}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveHeaderPanel(activeHeaderPanel === 'user' ? null : 'user');
              }
            }}
          >
            <Avatar icon={<UserRound size={16} />} src={user?.avatarUrl ?? undefined} />
            <span className="client-header__profile-copy">
              <strong>{user?.name}</strong>
              <Typography.Text>{user?.role && user.role !== 'ADMIN' ? clientRoleLabels[user.role] : 'Client'}</Typography.Text>
            </span>
          </button>
        </Dropdown>
      </div>
    </Layout.Header>
  );
}
