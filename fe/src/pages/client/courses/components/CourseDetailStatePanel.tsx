import type { ReactNode } from 'react';
import { Button } from 'antd';
import { EmptyState } from '../../../../components/client-ui';

type CourseDetailStatePanelProps = {
  title: ReactNode;
  description: ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export function CourseDetailStatePanel({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: CourseDetailStatePanelProps) {
  return (
    <section className={`client-card client-section course-detail-shell__state-card${className ? ` ${className}` : ''}`}>
      <EmptyState
        title={title}
        description={description}
        action={
          primaryActionLabel || secondaryActionLabel ? (
            <div className="course-detail-shell__state-actions">
              {primaryActionLabel && onPrimaryAction ? (
                <Button className="client-button client-button-primary" onClick={onPrimaryAction}>
                  {primaryActionLabel}
                </Button>
              ) : null}
              {secondaryActionLabel && onSecondaryAction ? (
                <Button className="client-button client-button-secondary" onClick={onSecondaryAction}>
                  {secondaryActionLabel}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />
    </section>
  );
}
