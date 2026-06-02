import type { ReactNode } from 'react';
import { classNames } from './classNames';

export type StatusTone =
  | 'overdue'
  | 'due-soon'
  | 'submitted'
  | 'graded'
  | 'passed'
  | 'failed'
  | 'completed'
  | 'in-progress';

type StatusBadgeProps = {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span className={classNames('client-status-badge', `client-status-badge--${tone}`, className)}>
      {children}
    </span>
  );
}
