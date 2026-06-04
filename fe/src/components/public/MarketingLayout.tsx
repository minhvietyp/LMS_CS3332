import { Button, Layout } from 'antd';
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
            <span className="marketing-brand__mark">E</span>
            <span className="marketing-brand__text">
              <strong>EduFlow LMS</strong>
              <small>Academic Portal</small>
            </span>
          </Link>
          <nav className="marketing-nav" aria-label="Public navigation">
            <Link to="/">Home</Link>
            <Link to="/catalog">Catalog</Link>
            <Link to="/about">About</Link>
            <Link to="/help-center">Help</Link>
          </nav>
          <div className="marketing-nav__actions">
            <Link to="/login">
              <Button>Sign in</Button>
            </Link>
            <Link to="/register">
              <Button type="primary">Register</Button>
            </Link>
          </div>
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
          <div className="marketing-footer__brand">
            <Link to="/" className="marketing-brand">
              <span className="marketing-brand__mark">E</span>
              <span className="marketing-brand__text">
                <strong>EduFlow LMS</strong>
                <small>Academic Portal</small>
              </span>
            </Link>
            <p>Course discovery, learning work, progress tracking, and academic support in one workspace.</p>
          </div>
          <nav className="marketing-footer__links" aria-label="Footer navigation">
            <Link to="/catalog">Catalog</Link>
            <Link to="/help-center">Help Center</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <span className="marketing-footer__copyright">(c) 2026 EduFlow LMS</span>
        </div>
      </footer>
    </Layout>
  );
}
