import { useMemo, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Input, Typography } from 'antd';
import { ArrowLeft, ExternalLink, Paperclip, Upload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import {
  getStudentAssignmentDetailRequest,
  listMyAssignmentSubmissionsRequest,
  submitStudentAssignmentRequest,
  uploadAssignmentSubmissionFileRequest,
  type AssignmentSubmissionPayload,
  type AssignmentSubmissionRecord,
} from '../../../services/api/assignmentApi';
import { getCourseByIdRequest, listCourseResourcesRequest } from '../../../services/api/courseApi';
import './ClientAssignmentPages.css';

const { TextArea } = Input;

function getSubmissionStatusPresentation(submission: AssignmentSubmissionRecord | null, isClosed: boolean) {
  if (!submission && isClosed) {
    return { label: 'Overdue', badgeClassName: 'client-badge client-badge-danger' };
  }

  if (!submission) {
    return { label: 'Not Submitted', badgeClassName: 'client-badge' };
  }

  if (submission.status === 'RETURNED') {
    return { label: 'Needs Revision', badgeClassName: 'client-badge client-badge-warning' };
  }

  if (submission.status === 'GRADED') {
    return {
      label: submission.grade != null ? `Graded ${submission.grade}%` : 'Graded',
      badgeClassName: 'client-badge client-badge-success',
    };
  }

  if (submission.isLate || submission.status === 'LATE') {
    return { label: 'Late', badgeClassName: 'client-badge client-badge-warning' };
  }

  return { label: 'Submitted', badgeClassName: 'client-badge client-badge-info' };
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No date published';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildWorkspaceSkeleton() {
  return (
    <div className="assignment-workspace__stack">
      <section className="client-card assignment-workspace__skeleton-card">
        <div className="assignment-workspace__skeleton-shell">
          <div className="assignment-workspace__skeleton-line assignment-workspace__skeleton-line--meta" />
          <div className="assignment-workspace__skeleton-line assignment-workspace__skeleton-line--title" />
          <div className="assignment-workspace__skeleton-block" />
        </div>
      </section>
      <section className="client-card assignment-workspace__skeleton-card">
        <div className="assignment-workspace__skeleton-shell">
          <div className="assignment-workspace__skeleton-block" />
          <div className="assignment-workspace__skeleton-block" />
        </div>
      </section>
    </div>
  );
}

export function ClientAssignmentSubmissionPage() {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const [textContent, setTextContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ['assignments', 'course-detail', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const assignmentQuery = useQuery({
    queryKey: ['assignments', 'student-detail', assignmentId],
    queryFn: () => getStudentAssignmentDetailRequest(assignmentId!),
    enabled: Boolean(assignmentId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ['assignments', 'history', courseId],
    queryFn: async () => (await listMyAssignmentSubmissionsRequest(courseId!)) ?? [],
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const resourcesQuery = useQuery({
    queryKey: ['assignments', 'resources', courseId],
    queryFn: () => listCourseResourcesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const latestSubmission = assignmentQuery.data?.submissions[0] ?? null;
  const historyItems = assignmentQuery.data?.submissions ?? historyQuery.data?.filter((submission) => submission.assignmentId === assignmentId) ?? [];

  const isClosed = useMemo(() => {
    if (!assignmentQuery.data?.dueDate) return false;
    return new Date(assignmentQuery.data.dueDate).getTime() < Date.now() && !assignmentQuery.data.allowLateSubmission;
  }, [assignmentQuery.data]);

  const statusPresentation = getSubmissionStatusPresentation(latestSubmission, isClosed);

  const submitMutation = useMutation({
    mutationFn: (payload: AssignmentSubmissionPayload) => submitStudentAssignmentRequest(assignmentId!, payload),
    onSuccess: async () => {
      await assignmentQuery.refetch();
      await historyQuery.refetch();
      setTextContent('');
      setSelectedFileName(null);
      setSelectedFileUrl(null);
      setSubmissionError(null);
    },
    onError: (error) => {
      setSubmissionError(error instanceof Error ? error.message : 'Failed to submit assignment.');
    },
  });

  const canSubmit = Boolean(textContent.trim() || selectedFileUrl) && !isClosed && !submitMutation.isPending && !isUploadingFile;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setSubmissionError(null);

    try {
      const uploaded = await uploadAssignmentSubmissionFileRequest(assignmentId!, file);
      setSelectedFileName(uploaded.fileName);
      setSelectedFileUrl(uploaded.fileUrl);
    } catch (error) {
      setSelectedFileName(null);
      setSelectedFileUrl(null);
      setSubmissionError(error instanceof Error ? error.message : 'Failed to upload assignment file.');
    } finally {
      setIsUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleSubmit = () => {
    const payload: AssignmentSubmissionPayload = {
      textContent: textContent.trim() || undefined,
      fileUrl: selectedFileUrl ?? undefined,
      fileName: selectedFileName ?? undefined,
    };

    void submitMutation.mutate(payload);
  };

  const assignmentResources = (resourcesQuery.data?.materials ?? []).slice(0, 4);

  return (
    <ClientLayout>
      <ClientPageContainer
        title={assignmentQuery.data?.title ?? 'Assignment Workspace'}
        subtitle="Prepare, submit, and review your assignment work without leaving the course workspace."
        actions={
          <div className="assignment-workspace__section-header-actions">
            <Button className="client-button client-button-secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(`/courses/${courseId}/assignments`)}>
              Back to Assignments
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
              View Course
            </Button>
          </div>
        }
      >
        {assignmentQuery.isLoading || courseQuery.isLoading ? buildWorkspaceSkeleton() : null}

        {assignmentQuery.error ? (
          <section className="client-card assignment-workspace__state-card">
            <EmptyState
              title="Unable to load assignment"
              description={assignmentQuery.error instanceof Error ? assignmentQuery.error.message : 'The assignment workspace could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => assignmentQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!assignmentQuery.isLoading && !assignmentQuery.data ? (
          <section className="client-card assignment-workspace__state-card">
            <EmptyState title="Assignment not found." description="The assignment may have been removed or is no longer available." />
          </section>
        ) : null}

        {assignmentQuery.data ? (
          <div className="assignment-workspace__stack">
            <section className="client-card assignment-workspace__hero">
              <div className="assignment-workspace__hero-copy">
                <Typography.Text className="client-caption">
                  {courseQuery.data?.title ?? 'Assignment workspace'}
                </Typography.Text>
                <Typography.Title level={1} className="client-page-title">
                  {assignmentQuery.data.title}
                </Typography.Title>
                <Typography.Paragraph className="client-body">
                  {assignmentQuery.data.description || 'Assignment instructions are not available yet.'}
                </Typography.Paragraph>
                <div className="assignment-workspace__hero-meta">
                  <span className={statusPresentation.badgeClassName}>{statusPresentation.label}</span>
                  <Typography.Text className="client-meta">Due {formatDateTime(assignmentQuery.data.dueDate)}</Typography.Text>
                  <Typography.Text className="client-meta">
                    {assignmentQuery.data.allowLateSubmission ? 'Late submissions allowed' : 'Late submissions blocked'}
                  </Typography.Text>
                </div>
              </div>
              <div className="assignment-workspace__hero-summary">
                <Typography.Text className="client-card-title">Submission summary</Typography.Text>
                <div className="assignment-workspace__status-grid">
                  <div className="assignment-workspace__status-tile">
                    <Typography.Text className="client-meta">Status</Typography.Text>
                    <strong>{statusPresentation.label}</strong>
                  </div>
                  <div className="assignment-workspace__status-tile">
                    <Typography.Text className="client-meta">Due date</Typography.Text>
                    <strong>{assignmentQuery.data.dueDate ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(assignmentQuery.data.dueDate)) : 'Open'}</strong>
                  </div>
                  <div className="assignment-workspace__status-tile">
                    <Typography.Text className="client-meta">Submission</Typography.Text>
                    <strong>{latestSubmission ? 'On file' : 'Not started'}</strong>
                  </div>
                  <div className="assignment-workspace__status-tile">
                    <Typography.Text className="client-meta">Grade</Typography.Text>
                    <strong>{latestSubmission?.grade != null ? `${latestSubmission.grade}%` : 'Pending'}</strong>
                  </div>
                </div>
                <Button
                  className="client-button client-button-primary"
                  disabled={isClosed && !latestSubmission}
                  onClick={() => document.getElementById('assignment-submission-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Open submission panel
                </Button>
              </div>
            </section>

            <div className="assignment-workspace__layout">
              <main className="assignment-workspace__main">
                <section className="client-card assignment-workspace__panel">
                  <div className="assignment-workspace__section-header">
                    <div className="assignment-workspace__section-header-copy">
                      <Typography.Text className="client-caption">Assignment brief</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        What you need to submit
                      </Typography.Title>
                    </div>
                  </div>
                  <div className="assignment-workspace__brief-grid">
                    <div className="assignment-workspace__brief-copy">
                      <Typography.Paragraph className="client-body">
                        {assignmentQuery.data.description || 'Assignment instructions are not available yet.'}
                      </Typography.Paragraph>
                      <div className="assignment-workspace__brief-meta">
                        <span className="client-badge">{assignmentQuery.data.dueDate ? `Due ${formatDateTime(assignmentQuery.data.dueDate)}` : 'No due date'}</span>
                        <span className="client-badge">{assignmentQuery.data.allowLateSubmission ? 'Late submission accepted' : 'Late submission blocked'}</span>
                      </div>
                    </div>
                    <div className="assignment-workspace__brief-side">
                      <div className="assignment-workspace__brief-note">
                        <Typography.Text className="client-card-title">Submission format</Typography.Text>
                        <Typography.Text className="client-meta">
                          Text response and one file attachment are supported in this workspace.
                        </Typography.Text>
                      </div>
                      <div className="assignment-workspace__brief-note">
                        <Typography.Text className="client-card-title">Requirements</Typography.Text>
                        <Typography.Text className="client-meta">
                          Review the assignment brief carefully and include the files or written explanation requested by your instructor.
                        </Typography.Text>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="client-card assignment-workspace__panel" id="assignment-submission-panel">
                  <div className="assignment-workspace__section-header">
                    <div className="assignment-workspace__section-header-copy">
                      <Typography.Text className="client-caption">Submission panel</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        Submit your work
                      </Typography.Title>
                    </div>
                  </div>

                  {latestSubmission ? (
                    <div className="assignment-workspace__submission-preview">
                      <Typography.Text className="client-card-title">Current submission</Typography.Text>
                      <Typography.Text className="client-meta">
                        Your latest submission is on file. You can review it below or submit a replacement if the assignment is still open.
                      </Typography.Text>
                      {latestSubmission.textContent ? (
                        <Typography.Paragraph className="client-body">
                          Your latest written response is saved in the submission history panel for review.
                        </Typography.Paragraph>
                      ) : null}
                      {latestSubmission.fileName ? (
                        <Typography.Text className="client-meta">
                          Attached file is available in the submission history panel below.
                        </Typography.Text>
                      ) : null}
                    </div>
                  ) : null}

                  {submitMutation.isSuccess ? (
                    <div className="assignment-workspace__success-state">
                      <Typography.Text className="client-card-title">Assignment submitted successfully</Typography.Text>
                      <Typography.Text className="client-meta">
                        Your latest submission has been saved to this assignment workspace.
                      </Typography.Text>
                    </div>
                  ) : null}

                  {submissionError ? (
                    <div className="assignment-workspace__error-state">
                      <Typography.Text className="client-card-title">Submission failed</Typography.Text>
                      <Typography.Text className="client-meta">{submissionError}</Typography.Text>
                    </div>
                  ) : null}

                  {isClosed ? (
                    <div className="assignment-workspace__error-state">
                      <Typography.Text className="client-card-title">Submission window closed</Typography.Text>
                      <Typography.Text className="client-meta">
                        The due date has passed and late submissions are not allowed for this assignment.
                      </Typography.Text>
                    </div>
                  ) : null}

                  <div className="assignment-workspace__submission-form">
                    <div>
                      <Typography.Text className="client-card-title">Response</Typography.Text>
                      <TextArea
                        value={textContent}
                        onChange={(event) => setTextContent(event.target.value)}
                        rows={8}
                        placeholder="Write your answer, reflection, or project notes here."
                        className="assignment-workspace__text-area"
                      />
                    </div>

                    <div>
                      <Typography.Text className="client-card-title">Attachment</Typography.Text>
                      <label
                        className="assignment-workspace__upload-box"
                        aria-disabled={isUploadingFile}
                        htmlFor="assignment-file"
                      >
                        <Upload size={18} />
                        <Typography.Text className="client-card-title">
                          {isUploadingFile
                            ? 'Uploading file...'
                            : selectedFileName
                              ? `Uploaded: ${selectedFileName}`
                              : 'Choose one file to attach'}
                        </Typography.Text>
                        <Typography.Text className="client-meta">
                          Add one supporting file for this assignment submission.
                        </Typography.Text>
                      </label>
                      <input
                        id="assignment-file"
                        type="file"
                        onChange={handleFileChange}
                        className="assignment-workspace__upload-input"
                        disabled={isUploadingFile}
                      />
                    </div>

                    {selectedFileName ? (
                      <div className="assignment-workspace__selected-file">
                        <Typography.Text className="client-card-title">{selectedFileName}</Typography.Text>
                        <div className="assignment-workspace__submission-actions">
                          <Button
                            className="client-button client-button-ghost"
                            onClick={() => {
                              setSelectedFileName(null);
                              setSelectedFileUrl(null);
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="assignment-workspace__submission-actions">
                      <Button
                        className="client-button client-button-primary"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        loading={submitMutation.isPending}
                      >
                        Submit assignment
                      </Button>
                      <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
                        Back to Assignments
                      </Button>
                      <Button
                        className="client-button client-button-ghost"
                        onClick={() => {
                          setTextContent('');
                          setSelectedFileName(null);
                          setSelectedFileUrl(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </section>

                {(assignmentResources.length > 0 || (!resourcesQuery.isLoading && !resourcesQuery.error)) ? (
                  <section className="client-card assignment-workspace__panel">
                    <div className="assignment-workspace__section-header">
                      <div className="assignment-workspace__section-header-copy">
                        <Typography.Text className="client-caption">Resources</Typography.Text>
                        <Typography.Title level={3} className="client-section-title">
                          Related materials
                        </Typography.Title>
                      </div>
                    </div>
                    {assignmentResources.length ? (
                      <div className="assignment-workspace__resource-list">
                        {assignmentResources.map((resource) => (
                          <article key={resource.id} className="assignment-workspace__resource-item">
                            <Typography.Text className="client-card-title">{resource.title}</Typography.Text>
                            <Typography.Text className="client-meta">
                              {resource.moduleTitle} · {resource.lessonTitle}
                            </Typography.Text>
                            <div className="assignment-workspace__resource-actions">
                              <a className="client-button client-button-ghost assignment-workspace__history-link" href={resource.url} target="_blank" rel="noreferrer">
                                <ExternalLink size={16} />
                                <span>Open resource</span>
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No additional resources attached."
                        description="This assignment currently does not include extra downloadable course materials."
                        compact
                      />
                    )}
                  </section>
                ) : null}
              </main>

              <aside className="assignment-workspace__sidebar">
                <section className="client-card assignment-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Status</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Submission status
                  </Typography.Title>
                  <div className="assignment-workspace__status-grid">
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Current</Typography.Text>
                      <strong className="assignment-workspace__status-value">{statusPresentation.label}</strong>
                    </div>
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Due date</Typography.Text>
                      <strong>{assignmentQuery.data.dueDate ? formatDateTime(assignmentQuery.data.dueDate) : 'Open-ended'}</strong>
                    </div>
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Submitted at</Typography.Text>
                      <strong>{latestSubmission ? formatDateTime(latestSubmission.submittedAt) : 'Not submitted'}</strong>
                    </div>
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Grade</Typography.Text>
                      <strong>{latestSubmission?.grade != null ? `${latestSubmission.grade}% scored` : 'Pending review'}</strong>
                    </div>
                  </div>
                </section>

                <section className="client-card assignment-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Feedback</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Review notes
                  </Typography.Title>
                  {latestSubmission?.feedback ? (
                    <div className="assignment-workspace__brief-note">
                      {latestSubmission.status === 'RETURNED' ? (
                        <Typography.Text className="client-card-title">Feedback returned</Typography.Text>
                      ) : latestSubmission.status === 'GRADED' ? (
                        <Typography.Text className="client-card-title">Submission graded</Typography.Text>
                      ) : (
                        <Typography.Text className="client-card-title">Submission result</Typography.Text>
                      )}
                      <Typography.Text className="client-meta">
                        Feedback: {latestSubmission.feedback}
                      </Typography.Text>
                      {latestSubmission.grade != null ? (
                        <Typography.Text className="client-card-title">Grade: {latestSubmission.grade}%</Typography.Text>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState
                      title="Feedback will appear here after review."
                      description="Once your instructor reviews the submission, grading notes and score details will appear in this panel."
                      compact
                    />
                  )}
                </section>

                <section className="client-card assignment-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Submission history</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Previous submissions
                  </Typography.Title>
                  {historyItems.length ? (
                    <div className="assignment-workspace__history-list">
                      {historyItems.map((submission, index) => {
                        const historyPresentation = getSubmissionStatusPresentation(submission, false);

                        return (
                          <article key={submission.id} className="assignment-workspace__history-item">
                            <div className="assignment-workspace__history-item-title">
                              <Typography.Text className="client-card-title">
                                {index === 0 ? 'Submission result' : `Previous submission ${historyItems.length - index}`}
                              </Typography.Text>
                              <span className={historyPresentation.badgeClassName}>{historyPresentation.label}</span>
                            </div>
                            <div className="assignment-workspace__history-meta">
                              <Typography.Text className="client-meta">
                                {submission.isLate ? 'Submitted late' : 'Submitted on time'}
                              </Typography.Text>
                              <Typography.Text className="client-meta">{formatDateTime(submission.submittedAt)}</Typography.Text>
                            </div>
                            {submission.grade != null ? (
                              <Typography.Text className="client-card-title">Score: {submission.grade}%</Typography.Text>
                            ) : null}
                            {submission.feedback ? (
                              <Typography.Text className="client-meta">
                                {index === 0 ? `Instructor note: ${submission.feedback}` : `Feedback: ${submission.feedback}`}
                              </Typography.Text>
                            ) : null}
                            {submission.textContent ? (
                              <Typography.Text className="client-body">{submission.textContent}</Typography.Text>
                            ) : null}
                            {submission.fileName ? (
                              <a className="assignment-workspace__history-link" href={submission.fileUrl ?? '#'} target="_blank" rel="noreferrer">
                                <Paperclip size={16} />
                                <span>{submission.fileName}</span>
                              </a>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="No submissions yet."
                      description="Your submission history will appear here after your first upload or text response."
                      compact
                    />
                  )}
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}
