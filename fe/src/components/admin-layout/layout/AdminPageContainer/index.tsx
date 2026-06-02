import type { ReactNode } from 'react';
import { Space, Typography } from 'antd';
import './AdminPageContainer.css';

type AdminPageContainerProps = {
  breadcrumbs?: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminPageContainer({ breadcrumbs, title, subtitle, actions, children }: AdminPageContainerProps) {
  return (
    <main className="admin-page">
      <div className="admin-page__inner">
        {breadcrumbs || title || subtitle || actions ? (
          <header className="admin-page__header">
            <div className="admin-page__title-group">
              {breadcrumbs ? <div className="admin-page__breadcrumbs">{breadcrumbs}</div> : null}
              {title ? <Typography.Title level={2} className="admin-page__title">{title}</Typography.Title> : null}
              {subtitle ? <Typography.Paragraph className="admin-page__subtitle">{subtitle}</Typography.Paragraph> : null}
            </div>
            {actions ? <Space className="admin-page__actions">{actions}</Space> : null}
          </header>
        ) : null}

        <section className="admin-page__content">{children}</section>
      </div>
    </main>
  );
}
