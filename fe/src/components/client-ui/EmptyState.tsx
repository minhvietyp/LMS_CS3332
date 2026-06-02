import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { classNames } from './classNames';
import './client-ui.css';

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        'client-empty-state-block',
        compact && 'client-empty-state-block--compact',
        className,
      )}
    >
      {icon ? <span className="client-empty-state-block__icon">{icon}</span> : null}
      <Typography.Title level={4} className="client-empty-state-block__title">
        {title}
      </Typography.Title>
      {description ? (
        <Typography.Paragraph className="client-empty-state-block__description">
          {description}
        </Typography.Paragraph>
      ) : null}
      {action ? <div className="client-empty-state-block__action">{action}</div> : null}
    </div>
  );
}
