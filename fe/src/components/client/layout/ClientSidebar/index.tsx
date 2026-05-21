import { Avatar, Button, Drawer, Layout, Typography } from 'antd';
import { LogOut } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutRequest } from '../../../../services/authApi';
import { useAuth } from '../../../context/AuthContext';
import {
  clientRoleIcons,
  clientRoleLabels,
  getClientMenuMatch,
  getVisibleClientMenu,
} from '../ClientRoleMenu/clientMenu.config';
import './ClientSidebar.css';

type ClientSidebarProps = {
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function ClientSidebar({ isMobile, mobileOpen, onCloseMobile }: ClientSidebarProps) {
  const { user, refreshToken, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sections = useMemo(() => getVisibleClientMenu(user?.role), [user?.role]);
  const activeItem = getClientMenuMatch(location.pathname, user?.role);
  const RoleIcon = user?.role && user.role !== 'ADMIN' ? clientRoleIcons[user.role] : null;

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

  const sidebarContent = (
    <div className="client-sidebar">
      <div className="client-sidebar__user">
        <div className="client-sidebar__welcome">
          <span className="client-sidebar__mark">L</span>
          <div>
            <Typography.Text strong>LMS Client</Typography.Text>
            <Typography.Text type="secondary">
              {user?.role && user.role !== 'ADMIN' ? clientRoleLabels[user.role] : 'Learning Platform'}
            </Typography.Text>
          </div>
        </div>
        <div className="client-sidebar__user-card">
          <Avatar size={48} src={user?.avatarUrl ?? undefined}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <Typography.Text strong>{user?.name}</Typography.Text>
            <Typography.Text type="secondary">{user?.email}</Typography.Text>
          </div>
          {RoleIcon ? <RoleIcon size={18} className="client-sidebar__role-icon" /> : null}
        </div>
      </div>

      <nav className="client-sidebar__nav" role="menu" aria-label="Client navigation">
        {sections.map((section) => (
          <div key={section.key} className="client-sidebar__section">
            <span className="client-sidebar__section-title">{section.title}</span>
            <div className="client-sidebar__submenu">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem?.key === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`client-sidebar__item${isActive ? ' client-sidebar__item--active' : ''}`}
                    onClick={() => {
                      navigate(item.path);
                      onCloseMobile();
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Button className="client-sidebar__logout" icon={<LogOut size={16} />} onClick={() => void handleLogout()}>
        Logout
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        closable={false}
        open={mobileOpen}
        onClose={onCloseMobile}
        width={300}
        styles={{ body: { padding: 0 } }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Layout.Sider width={300} className="client-sidebar-shell">
      {sidebarContent}
    </Layout.Sider>
  );
}
