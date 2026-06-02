import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { classNames } from './classNames';
import './client-ui.css';

type SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={classNames('client-ui-section-header', className)}>
      <div className="client-ui-section-header__copy">
        <Typography.Title level={3} className="client-ui-section-header__title client-section-title">
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Text type="secondary" className="client-ui-section-header__subtitle client-body">
            {subtitle}
          </Typography.Text>
        ) : null}
      </div>
      {action ? <div className="client-ui-section-header__action">{action}</div> : null}
    </div>
  );
}
