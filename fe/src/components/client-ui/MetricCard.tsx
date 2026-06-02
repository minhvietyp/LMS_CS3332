import type { ReactNode } from 'react';
import { classNames } from './classNames';
import './client-ui.css';

type MetricCardProps = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, caption, className }: MetricCardProps) {
  return (
    <article className={classNames('client-metric-card', className)}>
      <span className="client-metric-card__label client-caption">{label}</span>
      <strong className="client-metric-card__value">{value}</strong>
      {caption ? <small className="client-metric-card__caption client-meta">{caption}</small> : null}
    </article>
  );
}
