import { Avatar, Badge, Button, Dropdown, Input, Layout, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Bell, Globe, Menu, PanelLeft, Search, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { logoutRequest } from '../../../../services/authApi';
import { useAuth } from '../../../context/AuthContext';
import './ClientHeader.css';

type ClientHeaderProps = {
  isMobile: boolean;
  onOpenMobileSidebar: () => void;
};

export function ClientHeader({ isMobile, onOpenMobileSidebar }: ClientHeaderProps) {
  const { user, refreshToken, logout } = useAuth();

  const accountItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'profile',
        label: <Link to="/profile">Profile</Link>,
      },
      {
        key: 'logout',
        label: 'Logout',
      },
    ],
    [],
  );

  const notificationItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'header',
        disabled: true,
        label: (
          <div className="client-notification-dropdown client-notification-dropdown__header">
            <strong>Latest updates</strong>
            <span>Stay close to deadlines, course activity, and teaching alerts.</span>
          </div>
        ),
      },
      {
        key: 'one',
        label: (
          <div className="client-notification-dropdown__item">
            <strong>Progress synced</strong>
            <span>Your latest learning activity is up to date.</span>
          </div>
        ),
      },
      {
        key: 'two',
        label: (
          <div className="client-notification-dropdown__item">
            <strong>Course updates</strong>
            <span>New notifications will appear here.</span>
          </div>
        ),
      },
      {
        key: 'view-all',
        label: <Link className="client-notification-dropdown__view-all" to="/notifications">View all notifications</Link>,
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
        {isMobile ? (
          <Button
            type="text"
            icon={<Menu size={18} />}
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation"
          />
        ) : (
          <div className="client-header__brand-chip">
            <PanelLeft size={16} />
            <span>{user?.role === 'INSTRUCTOR' ? 'Teaching Hub' : 'Learning Hub'}</span>
          </div>
        )}
      </div>

      <div className="client-header__search">
        <Input
          size="large"
          prefix={<Search size={16} />}
          placeholder={user?.role === 'INSTRUCTOR' ? 'Search courses or students' : 'Search courses or lessons'}
        />
      </div>

      <div className="client-header__right">
        <Button type="text" className="client-header__language" icon={<Globe size={18} />} aria-label="Language">
          EN
        </Button>
        <Dropdown menu={{ items: notificationItems }} trigger={['click']}>
          <Badge count={2} size="small" className="client-header__notification">
            <Button
              type="text"
              className="client-header__notification-button"
              icon={<Bell size={18} />}
              aria-label="Notifications"
            />
          </Badge>
        </Dropdown>
        <Dropdown menu={{ items: accountItems, onClick: handleAccountClick }} trigger={['click']}>
          <Space className="client-header__avatar">
            <Avatar icon={<UserRound size={16} />} src={user?.avatarUrl ?? undefined} />
            <span className="client-header__avatar-copy">
              <strong>{user?.name}</strong>
              <Typography.Text>{user?.email}</Typography.Text>
            </span>
          </Space>
        </Dropdown>
      </div>
    </Layout.Header>
  );
}
