// @ts-nocheck
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import './styles.scss';

const gradeSubmissionSchema = z.object({
  grade: z.number().int().min(0).max(100),
  feedback: z.string().optional(),
});

type GradeSubmissionForm = z.infer<typeof gradeSubmissionSchema>;

interface GradingPanelProps {
  submission: {
    id: string;
    student: { id: string; name: string; email: string };
    textContent?: string;
    fileUrl?: string;
    fileName?: string;
    submittedAt: string;
    isLate: boolean;
    grade?: number;
    feedback?: string;
  };
  onSubmit: (data: GradeSubmissionForm) => Promise<void>;
  isLoading?: boolean;
}

export const GradingPanel: React.FC<GradingPanelProps> = ({
  submission,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<GradeSubmissionForm>({
    resolver: zodResolver(gradeSubmissionSchema),
    defaultValues: {
      grade: submission.grade ?? undefined,
      feedback: submission.feedback ?? '',
    },
  });

  const grade = watch('grade');
  const gradeStatus = grade ? `${grade}%` : 'Not graded';
  const gradeStatusClass = grade
    ? grade >= 70
      ? 'grading-panel__grade-status--pass'
      : 'grading-panel__grade-status--fail'
    : '';

  const handleSubmitForm = async (data: GradeSubmissionForm) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Grading error:', error);
    }
  };

  const submittedDate = new Date(submission.submittedAt);

  return (
    <div className="grading-panel">
      {/* Header */}
      <div className="grading-panel__header">
        <div className="grading-panel__student-info">
          <h3 className="grading-panel__student-name">{submission.student.name}</h3>
          <p className="grading-panel__student-email">{submission.student.email}</p>
        </div>
        <div className={`grading-panel__grade-status ${gradeStatusClass}`}>
          {gradeStatus}
        </div>
      </div>

      {/* Submission Meta */}
      <div className="grading-panel__meta">
        <div className="grading-panel__meta-item">
          <span className="grading-panel__meta-label">Submitted:</span>
          <span className="grading-panel__meta-value">
            {submittedDate.toLocaleString()}
          </span>
        </div>
        {submission.isLate && (
          <div className="grading-panel__meta-item grading-panel__meta-item--alert">
            <span className="grading-panel__meta-label">Status:</span>
            <span className="grading-panel__meta-value">🔴 LATE SUBMISSION</span>
          </div>
        )}
      </div>

      {/* Submission Content */}
      <div className="grading-panel__content">
        <h4 className="grading-panel__section-title">Student Submission</h4>

        {submission.textContent && (
          <div className="grading-panel__text-content">
            <p className="grading-panel__content-label">Text Answer:</p>
            <div className="grading-panel__text-box">
              {submission.textContent}
            </div>
          </div>
        )}

        {submission.fileUrl && (
          <div className="grading-panel__file-content">
            <p className="grading-panel__content-label">Attached File:</p>
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="grading-panel__file-link"
            >
              📎 {submission.fileName || 'Download Attachment'}
            </a>
          </div>
        )}
      </div>

      {/* Grading Form */}
      <form
        className="grading-panel__form"
        onSubmit={handleSubmit(handleSubmitForm)}
      >
        <h4 className="grading-panel__section-title">Grading</h4>

        {/* Grade Input */}
        <div className="grading-panel__group">
          <label htmlFor="grade" className="grading-panel__label">
            Grade (0-100) *
          </label>
          <div className="grading-panel__grade-input-wrapper">
            <input
              id="grade"
              type="number"
              min="0"
              max="100"
              className="grading-panel__grade-input"
              placeholder="Enter grade"
              {...register('grade', { valueAsNumber: true })}
              disabled={isSubmitting || isLoading}
            />
            <span className="grading-panel__grade-unit">%</span>
          </div>
          {errors.grade && (
            <span className="grading-panel__error">{errors.grade.message}</span>
          )}

          {/* Grade Indicator */}
          {grade !== undefined && (
            <div className="grading-panel__grade-indicator">
              <div
                className="grading-panel__grade-bar"
                style={{ width: `${grade}%` }}
              />
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="grading-panel__group">
          <label htmlFor="feedback" className="grading-panel__label">
            Feedback (Optional)
          </label>
          <textarea
            id="feedback"
            className="grading-panel__textarea"
            placeholder="Provide constructive feedback to the student..."
            rows={6}
            {...register('feedback')}
            disabled={isSubmitting || isLoading}
          />
        </div>

        {/* Actions */}
        <div className="grading-panel__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? 'Submitting Grade...' : 'Submit Grade'}
          </button>
        </div>
      </form>
    </div>
  );
};
