import { Drawer, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { getAdminNavigationMatch, getVisibleAdminNavigation } from '../adminNavigation';
import './AdminSidebar.css';

type AdminSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
};

export function AdminSidebar({ collapsed, mobileOpen, isMobile, onCloseMobile }: AdminSidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = useMemo<MenuProps['items']>(
    () =>
      getVisibleAdminNavigation(user?.role).map((item) => {
        const Icon = item.icon;

        return {
          key: item.key,
          icon: <Icon size={18} />,
          label: item.label,
        };
      }),
    [user?.role],
  );

  const selectedKey = getAdminNavigationMatch(location.pathname)?.key ?? 'dashboard';

  const handleSelect: MenuProps['onSelect'] = ({ key }) => {
    const target = getVisibleAdminNavigation(user?.role).find((item) => item.key === key);
    if (!target?.path) {
      return;
    }

    navigate(target.path);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="admin-sidebar">
      <div className="admin-sidebar__logo">
        <span className="admin-sidebar__mark">L</span>
        {!collapsed || isMobile ? (
          <div className="admin-sidebar__logo-copy">
            <Typography.Text className="admin-sidebar__brand">LMS Admin</Typography.Text>
            <Typography.Text className="admin-sidebar__caption">Learning Management System</Typography.Text>
          </div>
        ) : null}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        inlineCollapsed={!isMobile && collapsed}
        onSelect={handleSelect}
        className="admin-sidebar__nav"
      />

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__user">
          <span className="admin-sidebar__user-avatar">{user?.name?.slice(0, 2).toUpperCase()}</span>
          {!collapsed || isMobile ? (
            <div className="admin-sidebar__user-copy">
              <Typography.Text strong>{user?.name}</Typography.Text>
              <Typography.Text type="secondary">{user?.email}</Typography.Text>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
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
    <Layout.Sider collapsed={collapsed} width={280} collapsedWidth={88} className="admin-sidebar-shell">
      {sidebarContent}
    </Layout.Sider>
  );
}
