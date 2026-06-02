import type { ReactNode } from 'react';
import { classNames } from './classNames';
import './client-ui.css';

type AnalyticsCardProps = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  className?: string;
};

export function AnalyticsCard({ label, value, caption, className }: AnalyticsCardProps) {
  return (
    <article className={classNames('client-analytics-card', className)}>
      <span className="client-analytics-card__label client-caption">{label}</span>
      <strong className="client-analytics-card__value">{value}</strong>
      {caption ? <small className="client-analytics-card__caption client-meta">{caption}</small> : null}
    </article>
  );
}
