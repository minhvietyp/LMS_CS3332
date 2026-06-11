import { ArrowLeft, Compass, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';

export function PublicNotFoundPage() {
  return (
    <MarketingLayout>
      <section className="public-page public-error-page" aria-labelledby="not-found-title">
        <div className="public-error-card">
          <span className="public-error-code">404</span>
          <Compass size={44} />
          <h1 className="public-page-title" id="not-found-title">Page not found</h1>
          <p className="public-page-copy">
            The page may have moved, or the link may point to a private workspace route that requires sign-in.
          </p>
          <div className="public-page-actions public-page-actions--center">
            <Link className="public-btn public-btn--primary" to="/">
              <Home size={16} /> Back home
            </Link>
            <Link className="public-btn public-btn--secondary" to="/catalog">
              <ArrowLeft size={16} /> Browse catalog
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
