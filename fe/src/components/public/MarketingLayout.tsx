import { Button, Layout } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/catalog">Catalog</NavLink>
            <a href="/#learning-paths">Learning Paths</a>
            <NavLink to="/community">Community</NavLink>
            <NavLink to="/help">Help</NavLink>
            <NavLink to="/faq">FAQ</NavLink>
            <NavLink to="/contact">Contact</NavLink>
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
        <div className="marketing-shell marketing-footer__grid">
          <div className="marketing-footer__brand">
            <Link to="/" className="marketing-brand">
              <span className="marketing-brand__mark">E</span>
              <span className="marketing-brand__text">
                <strong>EduFlow LMS</strong>
                <small>Academic Portal</small>
              </span>
            </Link>
            <p>Course discovery, learning work, progress tracking, and academic support in one workspace.</p>
            <p className="marketing-footer__contact">Support: support@eduflow.local</p>
          </div>
          <nav className="marketing-footer__links" aria-label="Product links">
            <strong>Product</strong>
            <Link to="/">Home</Link>
            <Link to="/catalog">Catalog</Link>
            <Link to="/catalog">Courses</Link>
            <Link to="/community">Community</Link>
          </nav>
          <nav className="marketing-footer__links" aria-label="Support links">
            <strong>Support</strong>
            <Link to="/help">Help Center</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <nav className="marketing-footer__links" aria-label="Account links">
            <strong>Account</strong>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
            <Link to="/dashboard">Dashboard</Link>
          </nav>
          <nav className="marketing-footer__links" aria-label="Legal links">
            <strong>Legal</strong>
            <span>Privacy Policy</span>
            <span>Terms</span>
            <span>Cookies</span>
          </nav>
          <span className="marketing-footer__copyright">Copyright © 2026 EduFlow LMS</span>
        </div>
      </footer>
    </Layout>
  );
}
