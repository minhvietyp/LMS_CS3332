import type { ReactNode } from 'react';
import { classNames } from './classNames';
import './client-ui.css';

type NotificationCardProps = {
  title: ReactNode;
  message: ReactNode;
  time?: ReactNode;
  unread?: boolean;
  action?: ReactNode;
  className?: string;
};

export function NotificationCard({
  title,
  message,
  time,
  unread = false,
  action,
  className,
}: NotificationCardProps) {
  return (
    <div className={classNames('client-notification-card', unread && 'client-notification-card--unread', className)}>
      <span
        className={classNames(
          'client-notification-card__dot',
          !unread && 'client-notification-card__dot--read',
        )}
        aria-hidden="true"
      />
      <div className="client-notification-card__body">
        <strong className="client-notification-card__title client-card-title">{title}</strong>
        <span className="client-notification-card__message client-meta">{message}</span>
        {action ? <div className="client-notification-card__action">{action}</div> : null}
      </div>
      {time ? <span className="client-notification-card__time client-meta">{time}</span> : null}
    </div>
  );
}
