// @ts-nocheck
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import './styles.scss';

const submitAssignmentSchema = z.object({
  textContent: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
}).refine(data => data.textContent || data.fileUrl, {
  message: "Either text content or file URL must be provided",
  path: ['textContent'],
});

type SubmitAssignmentForm = z.infer<typeof submitAssignmentSchema>;

interface SubmissionFormProps {
  assignmentId: string;
  assignmentTitle: string;
  dueDate: string;
  isLate: boolean;
  onSubmit: (data: SubmitAssignmentForm) => Promise<void>;
  isLoading?: boolean;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  assignmentId,
  assignmentTitle,
  dueDate,
  isLate,
  onSubmit,
  isLoading = false,
}) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<SubmitAssignmentForm>({
    resolver: zodResolver(submitAssignmentSchema),
  });

  const textContent = watch('textContent');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      // In a real app, upload to Cloudinary here
      // For now, we'll just set a mock URL
      setUploadedFileUrl(`/files/${file.name}`);
      setValue('fileUrl', `/files/${file.name}`);
      setValue('fileName', file.name);
      setFilePreview(file.name);
    }
  };

  const handleSubmitForm = async (data: SubmitAssignmentForm) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const isDisabled = !textContent && !uploadedFileUrl;

  return (
    <form className="submission-form" onSubmit={handleSubmit(handleSubmitForm)}>
      <div className="submission-form__header">
        <h3 className="submission-form__title">Submit: {assignmentTitle}</h3>
        <p className="submission-form__due-date">
          Due: {new Date(dueDate).toLocaleString()}
        </p>
      </div>

      {isLate && (
        <div className="submission-form__warning">
          ⚠️ This submission will be marked as LATE. Late submissions may not be accepted.
        </div>
      )}

      {/* Text Content */}
      <div className="submission-form__group">
        <label htmlFor="textContent" className="submission-form__label">
          Your Answer
        </label>
        <textarea
          id="textContent"
          className="submission-form__textarea"
          placeholder="Enter your answer, solution, or response here..."
          rows={8}
          {...register('textContent')}
        />
        {errors.textContent && (
          <span className="submission-form__error">
            {errors.textContent.message}
          </span>
        )}
      </div>

      {/* File Upload */}
      <div className="submission-form__group">
        <label htmlFor="file" className="submission-form__label">
          Attach File (Optional)
        </label>
        <div className="submission-form__file-input-wrapper">
          <input
            id="file"
            type="file"
            className="submission-form__file-input"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
            disabled={isSubmitting || isLoading}
          />
          <div className="submission-form__file-input-label">
            <span className="submission-form__file-icon">📎</span>
            <span>Click to select file or drag & drop</span>
          </div>
        </div>
        {filePreview && (
          <div className="submission-form__file-preview">
            <span className="submission-form__file-preview-name">
              📄 {filePreview}
            </span>
            <button
              type="button"
              className="submission-form__file-remove"
              onClick={() => {
                setFilePreview(null);
                setUploadedFileUrl(null);
                setUploadedFileName(null);
                setValue('fileUrl', undefined);
                setValue('fileName', undefined);
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Submission Requirements */}
      <div className="submission-form__requirements">
        <h4 className="submission-form__requirements-title">Requirements:</h4>
        <ul className="submission-form__requirements-list">
          <li>✓ Provide text answer OR attach a file</li>
          <li>✓ File size max: 10MB</li>
          <li>✓ Accepted formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, ZIP</li>
        </ul>
      </div>

      {/* Submit Actions */}
      <div className="submission-form__actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={isDisabled || isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Submitting...' : 'Submit Assignment'}
        </button>
      </div>
    </form>
  );
};
