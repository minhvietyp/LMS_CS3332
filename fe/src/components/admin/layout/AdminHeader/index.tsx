import { Avatar, Button, Dropdown, Layout, Space } from 'antd';
import type { MenuProps } from 'antd';
import { Menu, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { logoutRequest } from '../../../../services/authApi';
import { getAdminNavigationMatch } from '../adminNavigation';
import './AdminHeader.css';

type AdminHeaderProps = {
  collapsed: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
};

export function AdminHeader({
  collapsed,
  isMobile,
  onToggleSidebar,
  onOpenMobileSidebar,
}: AdminHeaderProps) {
  const { user, refreshToken, logout } = useAuth();
  const location = useLocation();
  const currentSection = getAdminNavigationMatch(location.pathname)?.label ?? 'Dashboard';

  const dropdownItems = useMemo<MenuProps['items']>(
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

  const handleMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key !== 'logout') {
      return;
    }

    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Clear local auth state even when the API is unavailable.
      }
    }

    logout();
  };

  return (
    <Layout.Header className="admin-header">
      <div className="admin-header__left">
        <Button
          type="text"
          icon={isMobile ? <Menu size={18} /> : collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          onClick={isMobile ? onOpenMobileSidebar : onToggleSidebar}
          aria-label="Toggle sidebar"
        />
        <div>
          <span className="admin-header__section">{currentSection}</span>
        </div>
      </div>

      <div className="admin-header__right">
        <Dropdown menu={{ items: dropdownItems, onClick: handleMenuClick }} trigger={['click']}>
          <Space className="admin-header__avatar">
            <Avatar icon={<UserRound size={16} />} src={user?.avatarUrl ?? undefined} />
            <span className="admin-header__avatar-copy">
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
            </span>
          </Space>
        </Dropdown>
      </div>
    </Layout.Header>
  );
}
