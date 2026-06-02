import type { ReactNode } from 'react';
import { classNames } from './classNames';
import './client-ui.css';

export type ActivityTimelineItem = {
  id: string;
  label?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  time?: ReactNode;
  action?: ReactNode;
};

type ActivityTimelineProps = {
  items: ActivityTimelineItem[];
  className?: string;
};

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  return (
    <div className={classNames('client-activity-timeline', className)}>
      {items.map((item) => (
        <div key={item.id} className="client-activity-timeline__item">
          <span className="client-activity-timeline__dot" aria-hidden="true">
            {item.icon}
          </span>
          <div className="client-activity-timeline__content">
            {item.label ? <span className="client-activity-timeline__label client-caption">{item.label}</span> : null}
            <strong className="client-activity-timeline__title client-card-title">{item.title}</strong>
            {item.description ? (
              <span className="client-activity-timeline__description client-meta">{item.description}</span>
            ) : null}
            {item.action ? <div className="client-activity-timeline__action">{item.action}</div> : null}
          </div>
          {item.time ? <span className="client-activity-timeline__time client-meta">{item.time}</span> : null}
        </div>
      ))}
    </div>
  );
}
