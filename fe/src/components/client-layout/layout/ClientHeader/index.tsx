import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Dropdown, Input, Layout, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Bell, ChevronsLeft, ChevronsRight, Menu, Search, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../../../services/api/authApi';
import { listNotificationsRequest } from '../../../../services/api/notificationApi';
import { useAuth } from '../../../../context/AuthContext';
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

export function ClientHeader({
  onOpenMobileSidebar,
  onToggleSidebar,
  isMobileOrTablet,
  isSidebarCollapsed,
}: ClientHeaderProps) {
  const { user, refreshToken, logout } = useAuth();
  const navigate = useNavigate();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'header-count'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
    enabled: Boolean(user) && typeof listNotificationsRequest === 'function',
  });

  const unreadCount = useMemo(
    () => (notificationsQuery.data ?? []).filter((notification) => !notification.isRead).length,
    [notificationsQuery.data],
  );
  const recentNotifications = useMemo(() => (notificationsQuery.data ?? []).slice(0, 4), [notificationsQuery.data]);

  const accountItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'profile',
        label: <Link to="/profile">Profile</Link>,
      },
      {
        key: 'settings',
        label: <Link to="/settings">Settings</Link>,
      },
      {
        key: 'logout',
        label: 'Logout',
      },
    ],
    [],
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
        <Input
          size="large"
          prefix={<Search size={16} />}
          placeholder="Search is available inside individual workspaces"
          disabled
          aria-label="Global search unavailable"
          title="Global search is not available yet. Use search inside course, assignment, quiz, or calendar workspaces."
        />
      </div>

      <div className="client-header__right">
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          classNames={{ root: 'client-header__dropdown-overlay' }}
          popupRender={() => (
            <div className="client-header__dropdown-card client-header__dropdown-card--notifications">
              <div className="client-header__dropdown-header">
                <div className="client-header__dropdown-copy">
                  <strong>Notifications</strong>
                  <Typography.Text>{unreadCount} unread</Typography.Text>
                </div>
              </div>
              {recentNotifications.length ? (
                <div className="client-header__notification-preview-list">
                  {recentNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`client-header__notification-preview${notification.isRead ? '' : ' client-header__notification-preview--unread'}`}
                      onClick={() => navigate(getNotificationDestination(notification))}
                    >
                      <div className="client-header__notification-preview-top">
                        <span className="client-badge">{getNotificationTypeLabel(notification)}</span>
                        <span className="client-header__notification-time">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <strong>{notification.message}</strong>
                      <Typography.Text>{getNotificationSourceLabel(notification)}</Typography.Text>
                      <span className="client-header__notification-action">
                        {getNotificationActionLabel(notification)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="client-header__dropdown-empty">
                  <Typography.Text strong>You're all caught up</Typography.Text>
                  <Typography.Text>No new notifications are waiting for you right now.</Typography.Text>
                </div>
              )}
              <Button className="client-button client-button-secondary client-header__view-all" onClick={() => navigate('/notifications')}>
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
        <Dropdown menu={{ items: accountItems, onClick: handleAccountClick }} trigger={['click']}>
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
