import React from 'react';
import './styles.scss';

interface AssignmentCardProps {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  allowLateSubmission: boolean;
  isSubmitted: boolean;
  isGraded: boolean;
  grade?: number;
  onViewClick: (id: string) => void;
  onSubmitClick: (id: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  id,
  title,
  description,
  dueDate,
  allowLateSubmission,
  isSubmitted,
  isGraded,
  grade,
  onViewClick,
  onSubmitClick,
}) => {
  const dueDateTime = new Date(dueDate);
  const now = new Date();
  const isOverdue = now > dueDateTime;
  const daysUntilDue = Math.ceil(
    (dueDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let statusClass = '';
  let statusText = '';

  if (isGraded) {
    statusClass = 'assignment-card__status--graded';
    statusText = `Graded: ${grade}%`;
  } else if (isSubmitted) {
    statusClass = 'assignment-card__status--submitted';
    statusText = 'Submitted';
  } else if (isOverdue) {
    statusClass = 'assignment-card__status--overdue';
    statusText = 'Overdue';
  } else {
    statusClass = 'assignment-card__status--pending';
    statusText = `Due in ${daysUntilDue} days`;
  }

  return (
    <div className="assignment-card">
      <div className="assignment-card__header">
        <h3 className="assignment-card__title">{title}</h3>
        <span className={`assignment-card__status ${statusClass}`}>
          {statusText}
        </span>
      </div>

      {description && (
        <p className="assignment-card__description">{description}</p>
      )}

      <div className="assignment-card__meta">
        <span className="assignment-card__due-date">
          📅 Due: {dueDateTime.toLocaleDateString()}
        </span>
        {allowLateSubmission && !isSubmitted && (
          <span className="assignment-card__badge--late">
            ⏰ Late submission allowed
          </span>
        )}
      </div>

      <div className="assignment-card__actions">
        <button
          className="btn btn--sm btn--secondary"
          onClick={() => onViewClick(id)}
        >
          View Details
        </button>
        {!isSubmitted && !isGraded && (
          <button
            className="btn btn--sm btn--primary"
            onClick={() => onSubmitClick(id)}
          >
            Submit Now
          </button>
        )}
      </div>
    </div>
  );
};
