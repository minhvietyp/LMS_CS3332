import { LockKeyhole, LogIn, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';

export function UnauthorizedPage() {
  return (
    <MarketingLayout>
      <section className="public-page public-error-page" aria-labelledby="unauthorized-title">
        <div className="public-error-card">
          <span className="public-error-code">403</span>
          <ShieldAlert size={44} />
          <h1 className="public-page-title" id="unauthorized-title">You do not have permission to view this page</h1>
          <p className="public-page-copy">
            This area belongs to an authenticated workspace. Sign in with the correct account or return to public course discovery.
          </p>
          <div className="public-page-actions public-page-actions--center">
            <Link className="public-btn public-btn--primary" to="/login">
              <LogIn size={16} /> Sign in
            </Link>
            <Link className="public-btn public-btn--secondary" to="/catalog">
              <LockKeyhole size={16} /> Browse public catalog
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
