import { Grid, Layout } from 'antd';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { ClientHeader } from '../ClientHeader';
import { ClientSidebar } from '../ClientSidebar';
import './ClientLayout.css';

type ClientLayoutProps = {
  children?: ReactNode;
};

export function ClientLayout({ children }: ClientLayoutProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = Boolean(screens.xs) && !screens.lg;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Layout className="client-layout">
      <ClientSidebar
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Layout className="client-main">
        <ClientHeader isMobile={isMobile} onOpenMobileSidebar={() => setMobileOpen(true)} />
        <div className="client-main__content">{children ?? <Outlet />}</div>
      </Layout>
    </Layout>
  );
}
