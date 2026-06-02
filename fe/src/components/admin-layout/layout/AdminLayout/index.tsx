import { Grid, Layout } from 'antd';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AdminBreadcrumb } from '../AdminBreadcrumb';
import { AdminHeader } from '../AdminHeader';
import { AdminSidebar } from '../AdminSidebar';
import './AdminLayout.css';

type AdminLayoutProps = {
  children?: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = Boolean(screens.xs) && !screens.md;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Layout className="admin-layout">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        isMobile={isMobile}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Layout className="admin-main">
        <AdminHeader
          collapsed={collapsed}
          isMobile={isMobile}
          onToggleSidebar={() => setCollapsed((current) => !current)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <AdminBreadcrumb />
        <div className="admin-main__content">{children ?? <Outlet />}</div>
      </Layout>
    </Layout>
  );
}
