import { useQueryClient } from '@tanstack/react-query';
import { Grid, Layout } from 'antd';
import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ClientCommandPalette } from '../ClientCommandPalette';
import { ClientHeader } from '../ClientHeader';
import { ClientSidebar } from '../ClientSidebar';
import { deriveRecentWorkspaceFromPath, recordRecentWorkspace } from '../../../../utils/clientShellWorkspace';
import './ClientLayout.css';

const CLIENT_SIDEBAR_STORAGE_KEY = 'client-shell.sidebar-collapsed';

type ClientLayoutProps = {
  children?: ReactNode;
};

export function ClientLayout({ children }: ClientLayoutProps) {
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = Boolean(screens.xs) && !screens.md;
  const isTablet = Boolean(screens.md) && !screens.xl;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (isMobile || isTablet) {
      return;
    }

    const savedState = window.localStorage.getItem(CLIENT_SIDEBAR_STORAGE_KEY);
    if (savedState === 'true') {
      setSidebarCollapsed(true);
    }
  }, [isMobile, isTablet]);

  const handleToggleSidebar = () => {
    if (isMobile || isTablet) {
      setMobileOpen(true);
      return;
    }

    setSidebarCollapsed((currentState) => {
      const nextState = !currentState;
      window.localStorage.setItem(CLIENT_SIDEBAR_STORAGE_KEY, String(nextState));
      return nextState;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }

      if (event.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const trackedItem = deriveRecentWorkspaceFromPath(location.pathname, queryClient);
    if (trackedItem) {
      recordRecentWorkspace(trackedItem);
    }
  }, [location.pathname, queryClient]);

  return (
    <Layout
      className={`client-layout client-theme${sidebarCollapsed ? ' client-layout--sidebar-collapsed' : ''}`}
    >
      <ClientSidebar
        isMobile={isMobile}
        isTablet={isTablet}
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Layout className={`client-main${sidebarCollapsed ? ' client-main--sidebar-collapsed' : ''}`}>
        <ClientHeader
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onToggleSidebar={handleToggleSidebar}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          isMobileOrTablet={isMobile || isTablet}
          isSidebarCollapsed={sidebarCollapsed}
        />
        <div className="client-main__content">{children ?? <Outlet />}</div>
      </Layout>
      <ClientCommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </Layout>
  );
}
