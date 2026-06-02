import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { classNames } from './classNames';
import './client-ui.css';

type PageHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  if (!title && !subtitle && !actions) {
    return null;
  }

  return (
    <div className={classNames('client-page-header', className)}>
      <div className="client-page-header-block">
        {title ? (
          <Typography.Title level={2} className="client-page-header-block__title client-page-title">
            {title}
          </Typography.Title>
        ) : null}
        {subtitle ? (
          <Typography.Paragraph className="client-page-header-block__subtitle client-body">
            {subtitle}
          </Typography.Paragraph>
        ) : null}
      </div>
      {actions ? <div className="client-page-actions">{actions}</div> : null}
    </div>
  );
}
