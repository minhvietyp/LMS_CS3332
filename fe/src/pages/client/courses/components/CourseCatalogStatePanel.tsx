import { Button, Typography } from 'antd';
import { AlertCircle, BookOpen } from 'lucide-react';

type CourseCatalogStatePanelProps = {
  variant: 'empty' | 'error';
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export function CourseCatalogStatePanel({
  variant,
  title,
  description,
  actionLabel,
  onAction,
}: CourseCatalogStatePanelProps) {
  const className = variant === 'error'
    ? 'client-error-state client-catalog-state-panel'
    : 'client-empty-state client-catalog-state-panel';

  return (
    <section className={className} role={variant === 'error' ? 'alert' : 'status'}>
      <div className="client-catalog-state-panel__icon" aria-hidden="true">
        {variant === 'error' ? <AlertCircle size={28} /> : <BookOpen size={28} />}
      </div>
      <div className="client-catalog-state-panel__copy">
        <Typography.Title level={3} className="client-section-title">
          {title}
        </Typography.Title>
        <Typography.Paragraph className="client-body">
          {description}
        </Typography.Paragraph>
      </div>
      <Button className="client-button client-button-secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    </section>
  );
}
