import type { ReactNode } from 'react';
import { Space, Typography } from 'antd';
import './ClientPageContainer.css';

type ClientPageContainerProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function ClientPageContainer({
  title,
  subtitle,
  actions,
  children,
}: ClientPageContainerProps) {
  return (
    <section className="client-page">
      <div className="client-page__inner">
        {title || subtitle || actions ? (
          <div className="client-page__header">
            <Space direction="vertical" size={4}>
              {title ? <Typography.Title level={2}>{title}</Typography.Title> : null}
              {subtitle ? <Typography.Paragraph>{subtitle}</Typography.Paragraph> : null}
            </Space>
            {actions ? <div className="client-page__actions">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
