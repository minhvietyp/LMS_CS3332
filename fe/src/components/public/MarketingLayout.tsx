import { Button, Layout, Space } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './marketing.css';

interface MarketingLayoutProps extends PropsWithChildren {
  hero?: ReactNode;
}

export function MarketingLayout({ children, hero }: MarketingLayoutProps) {
  return (
    <Layout className="marketing-layout">
      <header className="marketing-header">
        <div className="marketing-shell marketing-header__row">
          <Link to="/" className="marketing-brand">
            <span className="marketing-brand__mark">L</span>
            <span>Learning Management System</span>
          </Link>
          <nav className="marketing-nav" aria-label="Public navigation">
            <Link to="/catalog">Catalog</Link>
            <Link to="/instructors">Instructors</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/community">Community</Link>
          </nav>
          <Space className="marketing-nav__actions">
            <Link to="/login">
              <Button>Login</Button>
            </Link>
            <Link to="/register">
              <Button type="primary">Register</Button>
            </Link>
          </Space>
        </div>
      </header>
      <main className="marketing-main">
        <div className="marketing-shell">
          {hero}
          {children}
        </div>
      </main>
      <footer className="marketing-footer">
        <div className="marketing-shell marketing-footer__row">
          <span>Academic discovery, enrollment, and learning support in one workspace.</span>
          <Space wrap>
            <Link to="/help-center">Help Center</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </Space>
        </div>
      </footer>
    </Layout>
  );
}
